'use strict';
/* 가디언 4차(2026-11-25, 인증 크로스체크 #2 · #3 · #4) 운영자 세션 정책 — Java 동일: auth/service/impl/SessionServiceImpl
   - 유휴 차단: SESSION_IDLE_MIN(기본 60분, 1~60) · 기관 선택 org.sec.idleMin(10~60). 쓰는 동안 남은 시간이 절반 아래로 내려가면 연장.
   - 최대 수명: SESSION_MAX_H(기본 12시간, 1~24). 운영자 쿠키는 세션 쿠키(Max-Age 없음).
   - 작업 모드: 사유 · 분(최대 240) → 그 시각까지 유휴 차단 유예(최대 수명은 그대로), audit session.work. 끝나면 자동 원복.
   - 동시 접속: 허용하되 로그인 응답에 others(다른 활성 세션 수, 0이면 생략). 기관 선택 org.sec.maxSessions(0=제한 없음, n이면 오래된 세션부터 종료).
   - 같은 브라우저 재로그인은 이전 세션을 지운다(세션 교체). */
const crypto = require('node:crypto');
const { agent, band } = require('./devices');

const MIGRATION = ['core/sessions_v2', `
  alter table sessions add column if not exists last_at timestamptz not null default now();
  alter table sessions add column if not exists agent text not null default '';
  alter table sessions add column if not exists band text not null default '';
  alter table sessions add column if not exists work_until timestamptz;
  alter table sessions add column if not exists work_reason text;
  create index if not exists sessions_user on sessions (user_id, expires_at);
  alter table learner_sessions add column if not exists created_at timestamptz not null default now();
  alter table learner_sessions add column if not exists keep boolean not null default false;`];
const sqlMigrations = () => [MIGRATION];

const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) && v !== '' && v != null ? Math.max(lo, Math.min(hi, n)) : d; };
const iso = d => d ? new Date(d).toISOString() : null;

function createSessions({ pool, env, inTenant, HttpErr, readBody, cookies, cookieName, secure, audit, ip, limit }) {
  const idleDef = clampInt(env.SESSION_IDLE_MIN, 1, 60, 60);
  const maxH = clampInt(env.SESSION_MAX_H, 1, 24, 12);
  const MAXI = `${maxH} hours`;
  /* 기관 보안 정책(tenant_state doc.org.sec) — 30초 캐시, 설정을 바꾸면 즉시 비움 */
  const cache = new Map();
  async function secOf(tid) {
    const c = cache.get(tid); if (c && c.at > Date.now() - 30e3) return c.v;
    const raw = await inTenant(pool, tid, async q => ((await q.query("select doc->'org'->'sec' s from tenant_state where tenant_id = $1", [tid])).rows[0] || {}).s).catch(() => null);
    const S = raw && typeof raw === 'object' ? raw : {};
    const v = { idleMin: Number.isInteger(S.idleMin) && S.idleMin >= 10 && S.idleMin <= 60 ? S.idleMin : null, maxSessions: Number.isInteger(S.maxSessions) && S.maxSessions >= 0 && S.maxSessions <= 10 ? S.maxSessions : 0, mfa: S.mfa === 'totp' ? 'totp' : 'email' };
    cache.set(tid, { at: Date.now(), v }); return v;
  }
  const idleOf = async tid => (await secOf(tid)).idleMin || idleDef;
  const setSid = (res, token) => res.setHeader('set-cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`); /* 세션 쿠키: 브라우저를 닫으면 끝 */
  const clearSid = res => res.setHeader('set-cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`);
  const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
  /* 연장 식: 최대 수명 안에서 (지금 + 유휴) 또는 작업 모드 끝 중 늦은 쪽 */
  const SLIDE = 'least(created_at + $2::interval, greatest(now() + $3::interval, coalesce(work_until, now())))';

  async function create(res, req, userId, tid) {
    const old = req && cookies(req)[cookieName]; if (old && old.length <= 100) await pool.query('delete from sessions where id = $1', [sha(old)]); /* 같은 브라우저 재로그인 → 세션 교체 */
    const token = crypto.randomBytes(32).toString('base64url'); const id = sha(token); const pol = await secOf(tid); const idle = pol.idleMin || idleDef;
    await pool.query('insert into sessions (id, user_id, tenant_id, expires_at, agent, band) values ($1, $2, $3, now() + $4::interval, $5, $6)', [id, userId, tid, `${Math.min(idle, maxH * 60)} minutes`, req ? agent(req.headers['user-agent']) : '', req ? band(ip(req)) : '']);
    if (pol.maxSessions > 0) {
      const ev = await pool.query('delete from sessions where user_id = $1 and id in (select id from sessions where user_id = $1 and expires_at > now() order by created_at desc, id offset $2) returning id', [userId, pol.maxSessions]);
      if (ev.rowCount) { const em = (await pool.query('select email from users where id = $1', [userId])).rows[0]; await inTenant(pool, tid, c => audit(c, tid, em ? em.email : '', 'session.evict', { n: ev.rowCount, max: pol.maxSessions })).catch(() => {}); }
    }
    const others = (await pool.query('select count(*)::int n from sessions where user_id = $1 and id <> $2 and expires_at > now() and created_at > now() - $3::interval', [userId, id, MAXI])).rows[0].n;
    setSid(res, token); res.ddOthers = others;
    return { others };
  }
  /* opt.peek: 남은 시간 조회(GET /api/session)는 연장하지 않는다 */
  async function check(req, opt = {}) {
    const t = cookies(req)[cookieName]; if (!t || t.length > 100) return null;
    const { rows } = await pool.query(`select s.id sid, u.id uid, u.email, u.role, u.pw_temp, t.id tid, t.name, t.type, t.mode, extract(epoch from s.expires_at - now())::float8 remain from sessions s join users u on u.id = s.user_id join tenants t on t.id = s.tenant_id where s.id = $1 and s.expires_at > now() and s.created_at > now() - $2::interval`, [sha(t), MAXI]);
    const a = rows[0]; if (!a || opt.peek) return a || null;
    const idle = await idleOf(a.tid);
    if (+a.remain < idle * 30) await pool.query(`update sessions set expires_at = ${SLIDE}, last_at = now() where id = $1`, [a.sid, MAXI, `${idle} minutes`]);
    return a;
  }
  async function info(a) {
    const r = (await pool.query("select to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') exp, to_char((created_at + $2::interval) at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') maxat, greatest(0, floor(extract(epoch from expires_at - now())))::int remain, case when work_until > now() then to_char(work_until at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') end wu, work_reason from sessions where id = $1", [a.sid, MAXI])).rows[0];
    if (!r) throw new HttpErr(401, '로그인이 필요합니다.', 'auth');
    return { idleMin: await idleOf(a.tid), remain: r.remain, expiresAt: r.exp, maxAt: r.maxat, work: r.wu ? { until: r.wu, reason: r.work_reason || '' } : null };
  }
  const touch = async a => { const idle = await idleOf(a.tid); await pool.query(`update sessions set expires_at = ${SLIDE}, last_at = now() where id = $1`, [a.sid, MAXI, `${idle} minutes`]); };

  function routes({ auth, need, needStaff, needOwner }) {
    return {
      'GET /api/session': async req => { const a = await auth(req, { peek: true }); if (!a) throw new HttpErr(401, '로그인이 필요합니다.', 'auth'); return info(a); },
      'POST /api/session/touch': async req => { const a = await need(req); await touch(a); return info(a); },
      'POST /api/session/work': async req => {
        const a = await need(req); limit('sw:' + a.uid, 20, 3600e3); const b = await readBody(req, 4096);
        const m = b.minutes; if (!Number.isInteger(m) || m < 0 || m > 240) throw new HttpErr(400, '작업 모드 시간은 0~240분으로 입력하십시오.', 'work_minutes');
        const reason = String(b.reason == null ? '' : b.reason).trim().slice(0, 200);
        if (m === 0) { await pool.query('update sessions set work_until = null, work_reason = null where id = $1', [a.sid]); await touch(a); await inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'session.work_end', null)); return info(a); }
        if (reason.length < 2) throw new HttpErr(400, '작업 모드 사유를 입력하십시오.', 'work_reason');
        await pool.query('update sessions set work_until = least(created_at + $2::interval, now() + $3::interval), work_reason = $4, last_at = now() where id = $1', [a.sid, MAXI, `${m} minutes`, reason]);
        await touch(a);
        await inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'session.work', { minutes: m, reason }));
        return info(a);
      },
      'GET /api/me/sessions': async req => {
        const a = await need(req);
        const { rows } = await pool.query(`select id, agent, band, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') c, to_char(last_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') l, to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') e from sessions where user_id = $1 and expires_at > now() and created_at > now() - $2::interval order by last_at desc, created_at desc limit 50`, [a.uid, MAXI]);
        return { rows: rows.map(r => ({ id: r.id.slice(0, 12), current: r.id === a.sid, agent: r.agent, band: r.band, createdAt: r.c, lastAt: r.l, expiresAt: r.e })) };
      },
      'POST /api/me/sessions/logout-others': async req => {
        const a = await need(req); const r = await pool.query('delete from sessions where user_id = $1 and id <> $2', [a.uid, a.sid]);
        await inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'session.logout_others', { n: r.rowCount })); return { ok: true, n: r.rowCount };
      },
      'GET /api/org/security': async req => { const a = await needStaff(req); const p = await secOf(a.tid); return { idleMin: p.idleMin, maxSessions: p.maxSessions, mfa: p.mfa, idleDefault: idleDef, maxHours: maxH }; },
      'POST /api/org/security': async req => {
        const a = await needOwner(req); limit('osec:' + a.tid, 30, 3600e3); const b = await readBody(req, 4096); const set = {};
        if ('idleMin' in b) { if (b.idleMin === null) set.idleMin = null; else if (!Number.isInteger(b.idleMin) || b.idleMin < 10 || b.idleMin > 60) throw new HttpErr(400, '자동 로그아웃 시간은 10~60분으로 입력하십시오.', 'idle_min'); else set.idleMin = b.idleMin; }
        if ('maxSessions' in b) { if (!Number.isInteger(b.maxSessions) || b.maxSessions < 0 || b.maxSessions > 10) throw new HttpErr(400, '동시 접속 수는 0(제한 없음)~10으로 입력하십시오.', 'max_sessions'); set.maxSessions = b.maxSessions; }
        if ('mfa' in b) { if (!['email', 'totp'].includes(b.mfa)) throw new HttpErr(400, '추가 인증 방식이 올바르지 않습니다.', 'sec_mfa'); set.mfa = b.mfa; }
        const before = await secOf(a.tid);
        await inTenant(pool, a.tid, async c => {
          const r = await c.query("update tenant_state set doc = jsonb_set(doc, '{org,sec}', coalesce(doc->'org'->'sec', '{}'::jsonb) || $2::jsonb) where tenant_id = $1 and jsonb_typeof(doc->'org') = 'object'", [a.tid, JSON.stringify(set)]);
          if (!r.rowCount) throw new HttpErr(409, '기관 설정을 먼저 저장하십시오.', 'state_first');
          await audit(c, a.tid, a.email, 'org.sec', { before: { idleMin: before.idleMin, maxSessions: before.maxSessions, mfa: before.mfa }, set });
        });
        cache.delete(a.tid); const p = await secOf(a.tid);
        return { idleMin: p.idleMin, maxSessions: p.maxSessions, mfa: p.mfa, idleDefault: idleDef, maxHours: maxH };
      }
    };
  }
  return { create, check, setSid, clearSid, secOf, routes, idleDef, maxH };
}

module.exports = { createSessions, sqlMigrations };
