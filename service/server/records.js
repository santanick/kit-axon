'use strict';
/* 가디언 4차(d3) 기록 · 데이터 — 인증 크로스체크 #5 · #7 · #10 · #11 · #14 · #15. Java: egovframework/didisam/records/*
   #5  접속기록(pii.access_log)에 접속지 ip 열. 기록 지점(pii.js plog)은 요청 범위(AsyncLocalStorage)의 ip를 쓴다.
   #10 audit_log · pii.access_log의 tenants FK(on delete cascade) 제거 → 기관을 파기해도 기록은 보관 기간까지 남는다(파기 기관은 tenant_gone에 기록).
       보관 만료 파기 records_purge(): 접속기록 · 감사기록 2년, 권한 관련 기록(role · member · staff · access.review · org.sec)은 audit_archive로 옮겨 3년(#11).
       감사기록은 해시 체인의 앞부분(연속 구간)만 지우고 'audit.purge' 행(lastHash)을 남겨 audit_verify가 이어서 검증한다.
   #7  분기 접근권한 검토: GET/POST /api/access-review(정운영자) → audit 'access.review'
   #14 개인정보 포함 내려받기: reason 필수 · 기본 마스킹 · 원본(raw=1)은 정운영자 · audit 'export'
   #15 기관 선택 org.sec.krOnly: 운영자 로그인 시 GEO 국가 ≠ KR이면 403 geo_blocked — geoCheck(req, tid)를 로그인 성공 직후 호출 */
const { AsyncLocalStorage } = require('node:async_hooks');
const als = new AsyncLocalStorage();
const reqIp = () => { const s = als.getStore(); return s && s.ip ? String(s.ip).slice(0, 64) : ''; };

const PERM_RE = '^(role|member|staff|access\\.review|org\\.sec|tenant\\.create)';
const SQL = `
  alter table pii.access_log add column if not exists ip text not null default '';
  do $$ declare r record; begin
    for r in select c.conname, c.conrelid::regclass::text t from pg_constraint c
      where c.contype = 'f' and c.confrelid = 'public.tenants'::regclass and c.conrelid in ('public.audit_log'::regclass, 'pii.access_log'::regclass) loop
      execute format('alter table %s drop constraint %I', r.t, r.conname);
    end loop; end $$;
  create table if not exists tenant_gone (tid text primary key, name text not null default '', gone_at timestamptz not null default now());
  revoke all on tenant_gone from didisam_tenant;
  create or replace function tenant_gone_rec() returns trigger language plpgsql as $f$ begin
    insert into tenant_gone (tid, name) values (OLD.id, OLD.name) on conflict (tid) do update set gone_at = now(); return OLD; end $f$;
  drop trigger if exists tenant_gone_rec on tenants;
  create trigger tenant_gone_rec before delete on tenants for each row execute function tenant_gone_rec();
  create table if not exists audit_archive (
    id bigint primary key, tenant_id text not null, at timestamptz not null, actor text not null, action text not null, detail jsonb,
    prev_hash text, hash text, archived_at timestamptz not null default now());
  create index if not exists audit_archive_tid_at on audit_archive (tenant_id, at);
  revoke all on audit_archive from didisam_tenant;
  create or replace function records_purge(p_keep interval default interval '2 years', p_perm interval default interval '3 years') returns jsonb language plpgsql as $f$
    declare t text; x bigint; n int; lg int; lh text; al int; tot jsonb := '{}'::jsonb; ar int; ap int;
    begin
      for t in select id from tenants union select tid from tenant_gone loop
        perform set_config('app.tenant', t, true);
        insert into audit_archive (id, tenant_id, at, actor, action, detail, prev_hash, hash)
          select id, tenant_id, at, actor, action, detail, prev_hash, hash from audit_log
           where tenant_id = t and at < now() - p_keep and action ~ '${PERM_RE}' on conflict (id) do nothing;
        get diagnostics ar = row_count;
        select coalesce((select min(id) - 1 from audit_log where tenant_id = t and at >= now() - p_keep), (select max(id) from audit_log where tenant_id = t)) into x;
        n := 0;
        if x is not null then
          select count(*), count(*) filter (where hash is null) into n, lg from audit_log where tenant_id = t and id <= x;
          if n > 0 then
            select hash into lh from audit_log where tenant_id = t and id <= x and hash is not null order by id desc limit 1;
            delete from audit_log where tenant_id = t and id <= x;
            insert into audit_log (tenant_id, actor, action, detail) values (t, 'system', 'audit.purge',
              jsonb_build_object('upTo', x, 'n', n, 'legacy', lg, 'archived', ar, 'lastHash', coalesce(lh, repeat('0', 64)), 'keep', p_keep::text));
          end if;
        end if;
        delete from audit_archive where tenant_id = t and at < now() - p_perm; get diagnostics ap = row_count;
        delete from pii.access_log where tid = t and at < now() - p_keep; get diagnostics al = row_count;
        if n + al + ap > 0 then tot := tot || jsonb_build_object(t, jsonb_build_array(n, al, ap)); end if;
      end loop;
      perform set_config('app.tenant', '', true);
      return tot;
    end $f$;
  revoke all on function records_purge(interval, interval) from public;
  create or replace function audit_verify(p_tenant text) returns jsonb language plpgsql stable as $f$
    declare r record; prev text; started boolean := false; n integer := 0; legacy integer := 0; d jsonb; pg jsonb;
    begin
      select detail into pg from audit_log where tenant_id = p_tenant and action = 'audit.purge' and hash is not null order by id desc limit 1;
      prev := coalesce(pg->>'lastHash', repeat('0', 64));
      for r in select id, tenant_id, at, actor, action, detail, prev_hash, hash from audit_log where tenant_id = p_tenant order by id loop
        if r.hash is null then
          if started then return jsonb_build_object('ok', false, 'n', n, 'legacy', legacy, 'brokenAt', r.id, 'reason', 'unhashed'); end if;
          legacy := legacy + 1; continue;
        end if;
        started := true; n := n + 1;
        if r.prev_hash is distinct from prev or r.hash <> encode(sha256(convert_to(prev || audit_row_text(r.id, r.tenant_id, r.at, r.actor, r.action, r.detail), 'UTF8')), 'hex') then
          return jsonb_build_object('ok', false, 'n', n, 'legacy', legacy, 'brokenAt', r.id, 'reason', 'hash');
        end if;
        if r.action = 'audit.chain.start' and coalesce((pg->>'legacy')::int, 0) = 0 then
          d := audit_legacy_digest(p_tenant, r.id);
          if (d->>'legacy')::int <> legacy or d->>'legacy' is distinct from r.detail->>'legacy' or d->>'legacyDigest' is distinct from r.detail->>'legacyDigest' then
            return jsonb_build_object('ok', false, 'n', n, 'legacy', legacy, 'brokenAt', r.id, 'reason', 'legacy');
          end if;
        end if;
        prev := r.hash;
      end loop;
      return jsonb_build_object('ok', true, 'n', n, 'legacy', legacy, 'head', prev);
    end $f$;`;
const sqlMigrations = () => [['core/records_v1', SQL]];

/* 마스킹: 끝 4자리만 남긴다(4자리 이하면 전부 *) — Java Records.mask와 같다 */
const mask = v => { const s = v == null ? '' : String(v); if (!s) return s; return s.length <= 4 ? '*'.repeat(s.length) : '*'.repeat(s.length - 4) + s.slice(-4); };

function createRecords({ pool, inTenant, need, needOwner, readBody, HttpErr, audit, ip, env }) {
  const geoHdr = String(env.GEO_COUNTRY_HEADER || '').trim().toLowerCase(); const hops = Number(env.TRUST_PROXY_HOPS || 0);
  const country = req => { if (!geoHdr || !hops) return ''; const v = String(req.headers[geoHdr] || '').trim().toUpperCase(); return /^[A-Z]{2}$/.test(v) ? v : ''; };
  const krOnly = tid => inTenant(pool, tid, async c => ((await c.query("select doc->'org'->'sec'->>'krOnly' v from tenant_state where tenant_id = $1", [tid])).rows[0] || {}).v === 'true');

  /* #15 로그인 성공 직후(세션 발급 전) 호출: 국가를 알 수 없으면(헤더 없음) 막지 않는다 */
  async function geoCheck(req, tid, actor) {
    if (!(await krOnly(tid).catch(() => false))) return;
    const cc = country(req); if (!cc || cc === 'KR') return;
    await inTenant(pool, tid, c => audit(c, tid, String(actor || ''), 'login.geo_blocked', { country: cc })).catch(() => {});
    throw new HttpErr(403, '이 기관은 국내에서만 운영자 로그인을 허용합니다.', 'geo_blocked');
  }

  /* #14 내려받기 통제 — 사유 필수, 원본은 정운영자. 반환 { raw, reason, done(kind, n) } */
  function exportGate(req, a) { const Q = new URL(req.url, 'http://x').searchParams; return exportGateOf({ reason: Q.get('reason'), raw: Q.get('raw') }, a); }
  /* 본문(POST)으로 받는 경로(마일리지 지급 내역 메일 등): { reason, raw: '1' | true } — 규칙 · 문구는 exportGate와 같다(d5) */
  function exportGateOf(src, a) {
    const reason = String((src && src.reason) || '').trim().slice(0, 200); const raw = !!src && (src.raw === '1' || src.raw === true);
    if (reason.length < 2) throw new HttpErr(400, '개인정보가 포함된 파일을 내려받으려면 사유를 입력하십시오.', 'export_reason');
    if (raw && a.role !== 'owner') throw new HttpErr(403, '원본(가리지 않은) 내려받기는 정운영자만 할 수 있습니다.', 'export_raw');
    return { raw, reason, done: (kind, n) => inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'export', { kind, n, raw, reason })) };
  }

  const iso = "'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'";
  const routes = {
    'GET /api/access-review': async req => { const a = await needOwner(req);
      const rows = (await pool.query(`select email, role, to_char(last_login at time zone 'UTC', ${iso}) last_login from users where tenant_id = $1 order by case role when 'owner' then 0 when 'sub' then 1 else 2 end, email`, [a.tid])).rows.map(r => ({ email: r.email, role: r.role, lastLogin: r.last_login }));
      const lr = await inTenant(pool, a.tid, async c => (await c.query(`select actor, detail->>'note' note, to_char(at at time zone 'UTC', ${iso}) at, at > now() - interval '92 days' fresh from audit_log where tenant_id = $1 and action = 'access.review' order by id desc limit 1`, [a.tid])).rows[0]);
      return { rows, lastReview: lr ? { at: lr.at, by: lr.actor, note: lr.note || '' } : null, due: !lr || !lr.fresh }; },
    'POST /api/access-review': async req => { const a = await needOwner(req); const b = await readBody(req, 4096);
      const note = String(b.note == null ? '' : b.note).trim(); if (note.length > 500) throw new HttpErr(400, '검토 메모는 500자까지 입력할 수 있습니다.', 'note');
      const rs = (await pool.query('select role, count(*)::int n from users where tenant_id = $1 group by role', [a.tid])).rows; const roles = { owner: 0, sub: 0, teacher: 0 }; for (const r of rs) roles[r.role] = r.n;
      await inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'access.review', { note, n: roles.owner + roles.sub + roles.teacher, roles }));
      return { ok: true }; },
    'POST /api/org/sec/geo': async req => { const a = await needOwner(req); const b = await readBody(req, 1024);
      if (typeof b.krOnly !== 'boolean') throw new HttpErr(400, '설정 값이 올바르지 않습니다.', 'krOnly');
      await inTenant(pool, a.tid, async c => { const u = await c.query("update tenant_state set doc = jsonb_set(jsonb_set(doc, '{org,sec}', coalesce(doc->'org'->'sec', '{}'::jsonb)), '{org,sec,krOnly}', to_jsonb($2::boolean)) where tenant_id = $1", [a.tid, b.krOnly]); if (!u.rowCount) throw new HttpErr(409, '기관 정보를 먼저 저장한 뒤 다시 시도하십시오.', 'no_state'); await audit(c, a.tid, a.email, 'org.sec.geo', { krOnly: b.krOnly }); });
      return { ok: true, krOnly: b.krOnly }; },
    'GET /api/org/sec/geo': async req => { const a = await need(req); return { krOnly: await krOnly(a.tid) }; }
  };

  /* 보관 만료 파기(index.js tick, 하루 1회) */
  let last = 0;
  async function tick(force) { if (!force && Date.now() - last < 23 * 3600e3) return null; last = Date.now(); return (await pool.query('select records_purge() r')).rows[0].r; }

  return { routes, geoCheck, exportGate, exportGateOf, tick };
}

module.exports = { createRecords, sqlMigrations, als, reqIp, mask };
