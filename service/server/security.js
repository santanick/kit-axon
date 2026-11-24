'use strict';
/* 디디쌤 가디언(보안봇) Phase 0 — /api/security/*  (Java SecServiceImpl과 같은 규격)
   - 권한: 정운영자(owner) + 산타 관리자(SANTA_ADMIN_EMAILS)만. 플랫폼 보안 원장이라 일반 기관 owner에게는 보이지 않는다.
   - 승인은 서버 기록(security.approval)만 유효. 재인증(비밀번호) 또는 1회용 링크(15분). Critical · High는 서로 다른 2인.
   - 긴급 차단 3종(key_disable · feature_off · egress_block): 기본 dry-run(SECURITY_KILL_LIVE=1일 때만 실제 적용), 하루 3회 상한(KST, 전체),
     feature_off는 TTL 최대 4시간 자동 복구, 해제는 사람(세션)만, LLM 미개입(정해진 enum · 규칙 id만 받는다).
   - ingest는 가디언 서비스 토큰(GUARD_TOKEN, 32자 이상) 전용. 없으면 403. 수집 텍스트는 데이터로만 저장한다(지시로 해석하지 않음).
   - 모든 쓰기는 security.audit 해시 체인(prev_hash · hash)에 남긴다. */
const crypto = require('node:crypto');

const ISO = c => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const SEV = ['critical', 'high', 'medium', 'low']; const PRI = ['P0', 'P1', 'P2', 'P3'];
const FST = ['open', 'triage', 'fixing', 'fixed', 'accepted', 'false_positive']; const DONE = ['fixed', 'accepted', 'false_positive'];
const ACTIONS = ['key_disable', 'feature_off', 'egress_block'];
const KILL_DAY_MAX = 3, FEATURE_TTL_MAX = 240, LINK_MIN = 15;
const TID_RE = /^tn_[a-z0-9]{8,16}$/; const ID_RE = /^[\w.:-]{1,80}$/;
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n);
const numOr = (v, d) => { const n = +v; return v === null || v === undefined || v === '' || !Number.isFinite(n) ? d : n; };
const arr = (v, n, m) => (Array.isArray(v) ? v : []).slice(0, n).map(x => str(x, m)).filter(Boolean);
const isoOr = v => { if (!v) return null; const d = new Date(String(v)); return isNaN(d) ? null : d.toISOString(); };
const maskIp = ip => { const s = String(ip || '').replace(/^::ffff:/, ''); if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return s.replace(/\.\d+$/, '.x'); if (s.includes(':')) return s.split(':').slice(0, 3).join(':') + ':x'; return ''; };
/* 해시 체인: Java SecServiceImpl.chainHash와 같은 식 */
const chainHash = (prev, ts, actor, action, target, detail) => sha([prev, ts, actor, action, target, detail].join('|'));
const GENESIS = '0'.repeat(64);
const MSG = {
  key: '보안 점검으로 이 기관의 AI · 외부 연결 키 사용이 일시 중단되었습니다. 운영자에게 문의해 주십시오.',
  egress: '보안 점검으로 이 기관의 외부 전송이 일시 차단되었습니다. 운영자에게 문의해 주십시오.',
  feature: '보안 점검으로 이 기관의 AI 사용 한도가 일시 축소되었습니다. 잠시 후 다시 시도해 주십시오.'
};

function createSecurity({ pool, inTenant, need, readBody, HttpErr, limit, ip, checkPw, isSanta, env = {}, log = console }) {
  const live = () => env.SECURITY_KILL_LIVE === '1';
  /* 첫 2주 dry-run 남은 날(SECURITY_DRY_SINCE=YYYY-MM-DD, 없으면 null) */
  const dday = () => { const m = /^\d{4}-\d{2}-\d{2}$/.test(String(env.SECURITY_DRY_SINCE || '')) ? Date.parse(env.SECURITY_DRY_SINCE + 'T00:00:00+09:00') : NaN; if (!Number.isFinite(m)) return null; return Math.max(0, 14 - Math.floor((Date.now() - m) / 864e5)); };
  const featureMin = Math.max(0, Math.round(numOr(env.SECURITY_FEATURE_MIN, 0)));
  const guardTok = String(env.GUARD_TOKEN || '').trim();
  const kday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

  /* ── 권한 ── */
  async function owner(req) {
    const a = await need(req);
    if (a.role !== 'owner') throw new HttpErr(403, '정운영자만 볼 수 있습니다.', 'role');
    if (!isSanta(a)) throw new HttpErr(403, '산타 보안 담당(정운영자)만 쓸 수 있습니다.', 'santa');
    limit(`sec:${a.email}`, 240, 60e3); return a;
  }
  /* 가디언 토큰: Authorization: Bearer 또는 x-guard-token(d1은 둘 다 보낸다) */
  const bearer = req => { const m = String(req.headers.authorization || '').match(/^Bearer\s+(\S{1,200})$/i); return m ? m[1] : String(req.headers['x-guard-token'] || '').trim().slice(0, 200); };
  const tokEq = t => { if (!t) return false; const x = crypto.createHash('sha256').update(t).digest(); const y = crypto.createHash('sha256').update(guardTok).digest(); return crypto.timingSafeEqual(x, y); };
  function guard(req) {
    if (guardTok.length < 32) throw new HttpErr(403, '가디언 서비스 토큰이 설정되지 않았습니다.', 'guard_off');
    if (!tokEq(bearer(req))) throw new HttpErr(403, '가디언 서비스 토큰이 올바르지 않습니다.', 'guard');
    limit('sec:guard', 600, 60e3); return { email: 'agent:guardian', agent: true };
  }
  /* 세션(사람) 또는 가디언 토큰. 토큰이 붙어 오면 토큰으로만 판정한다 */
  const ownerOrGuard = req => bearer(req) ? guard(req) : owner(req);
  async function reauth(a, pw) {
    limit(`secre:${a.uid}`, 5, 600e3);
    const r = (await pool.query('select pw from users where id = $1', [a.uid])).rows[0];
    if (!r || !pw || !(await checkPw(String(pw), r.pw))) throw new HttpErr(401, '재인증에 실패했습니다. 비밀번호를 확인해 주십시오.', 'reauth');
  }

  /* ── 감사(해시 체인) ── */
  async function audit(c, actor, action, target, detail, req) {
    await c.query('select pg_advisory_xact_lock(820821)');
    const prev = ((await c.query('select hash from security.audit order by id desc limit 1')).rows[0] || {}).hash || GENESIS;
    const ts = new Date().toISOString(); const d = detail == null ? '' : JSON.stringify(detail); const kind = /^agent:/.test(actor) ? 'agent' : 'user';
    const h = chainHash(prev, ts, actor, action, String(target || ''), d);
    await c.query('insert into security.audit (ts, actor, actor_kind, action, target, detail, ip_masked, prev_hash, hash) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [ts, actor, kind, action, String(target || ''), d, req ? maskIp(ip(req)) : '', prev, h]);
  }
  async function tx(fn) { const c = await pool.connect(); try { await c.query('begin'); const r = await fn(c); await c.query('commit'); return r; } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); } }
  async function verifyChain() {
    const { rows } = await pool.query('select id::int id, ts, actor, action, target, detail, prev_hash, hash from security.audit order by id');
    let prev = GENESIS; for (const r of rows) { if (r.prev_hash !== prev || r.hash !== chainHash(prev, r.ts, r.actor, r.action, r.target, r.detail)) return { ok: false, n: rows.length, brokenAt: r.id }; prev = r.hash; }
    return { ok: true, n: rows.length, brokenAt: null };
  }

  /* ── 긴급 차단 상태(실행 지점에서 읽는다, 5초 캐시) ── */
  const cache = new Map();
  async function expire() {
    const r = await pool.query("update security.kill_switch set released_at = now(), released_by = 'ttl' where released_at is null and expires_at is not null and expires_at <= now() returning id, tenant_id, action");
    if (r.rowCount) { cache.clear(); await tx(async c => { for (const x of r.rows) await audit(c, 'agent:ttl', 'kill.expire', x.id, { action: x.action, tenant: x.tenant_id }); }); }
    return r.rowCount;
  }
  async function gate(tid) {
    const hit = cache.get(tid); if (hit && hit.at > Date.now() - 5000) return hit.K;
    const { rows } = await pool.query("select action from security.kill_switch where tenant_id = $1 and mode = 'live' and released_at is null and (expires_at is null or expires_at > now())", [tid]);
    const s = new Set(rows.map(r => r.action)); const K = { key: s.has('key_disable'), feature: s.has('feature_off'), egress: s.has('egress_block') };
    cache.set(tid, { at: Date.now(), K }); return K;
  }
  /* AI 호출 전: 키 비활성 · egress 차단이면 막는다 / 호출 수 증가 뒤: 기능 끄기면 한도를 SECURITY_FEATURE_MIN(기본 0)으로 줄인다 */
  const preAi = K => { if (K.key) throw new HttpErr(403, MSG.key, 'sec_key_off'); if (K.egress) throw new HttpErr(403, MSG.egress, 'sec_egress'); };
  const postAi = (K, calls) => { if (K.feature && calls > featureMin) throw new HttpErr(429, MSG.feature, 'sec_feature_off'); };
  const keyBlocked = async tid => { const K = await gate(tid); return K.key || K.egress; };
  const egressBlocked = async tid => (await gate(tid)).egress;

  /* ── 출력 ── */
  const F_COLS = `id, key, origin, title, severity, priority, score, status, tenant_scope, owner, ${ISO('sla_due_at')} sla_due_at, jira_key, note, threat_id, evidence, ${ISO('created_at')} created_at, ${ISO('updated_at')} updated_at, ${ISO('resolved_at')} resolved_at`;
  const fOut = r => ({ id: r.id, key: r.key, origin: r.origin, title: r.title, severity: r.severity, priority: r.priority, score: r.score, status: r.status, tenantScope: r.tenant_scope, owner: r.owner, slaDueAt: r.sla_due_at, jiraKey: r.jira_key, note: r.note, threatId: r.threat_id, evidence: r.evidence, createdAt: r.created_at, updatedAt: r.updated_at, resolvedAt: r.resolved_at });
  const T_COLS = `id, source, external_id, title, summary, cvss, epss, kev, affected, attack_type, url, ${ISO('published_at')} published_at, verdict, ${ISO('created_at')} created_at`;
  const tOut = r => ({ id: r.id, source: r.source, externalId: r.external_id, title: r.title, summary: r.summary, cvss: r.cvss, epss: r.epss, kev: r.kev, affected: r.affected, attackType: r.attack_type, url: r.url, publishedAt: r.published_at, verdict: r.verdict, createdAt: r.created_at, untrusted: ['title', 'summary'] });
  const C_COLS = `id, threat_id, title, threat_pattern, controls, regression_tests, skill_refs, playbook, body, reuse_count, version, status, ${ISO('created_at')} created_at, ${ISO('updated_at')} updated_at`;
  const cOut = (r, full) => ({ id: r.id, threatId: r.threat_id, title: r.title, threatPattern: r.threat_pattern, controls: r.controls, regressionTests: r.regression_tests, skillRefs: r.skill_refs, playbook: r.playbook, ...(full ? { body: r.body } : {}), reuseCount: r.reuse_count, version: r.version, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at });
  const needOf = sev => sev === 'critical' || sev === 'high' ? 2 : 1;
  async function prRows(where = '', args = []) {
    const { rows } = await pool.query(`select id, pr_number, title, finding_ids, severity, change_type, files, verify_result, risk, rollback_ref, url, status, reject_reason, ${ISO('created_at')} created_at, ${ISO('approved_at')} approved_at, ${ISO('merged_at')} merged_at from security.fix_pr ${where} order by created_at desc, id limit 100`, args);
    const ap = rows.length ? (await pool.query(`select pr_id, approver, method, ${ISO('at')} at from security.approval where pr_id = any($1) order by id`, [rows.map(r => r.id)])).rows : [];
    return rows.map(r => { const A = ap.filter(x => x.pr_id === r.id).map(x => ({ by: x.approver, method: x.method, at: x.at })); return { id: r.id, number: r.pr_number, title: r.title, findingIds: r.finding_ids, severity: r.severity, changeType: r.change_type, files: r.files, verifyResult: r.verify_result, risk: r.risk, rollbackRef: r.rollback_ref, url: r.url, status: r.status, rejectReason: r.reject_reason, need: needOf(r.severity), have: A.length, approvals: A, createdAt: r.created_at, approvedAt: r.approved_at, mergedAt: r.merged_at }; });
  }
  const K_COLS = `id, action, tenant_id, mode, trigger, rule_id, reason, signals, actor, ${ISO('activated_at')} activated_at, ${ISO('expires_at')} expires_at, ${ISO('released_at')} released_at, released_by, release_note`;
  const kOut = r => ({ id: r.id, action: r.action, tenant: r.tenant_id, mode: r.mode, trigger: r.trigger, ruleId: r.rule_id, reason: r.reason, signals: r.signals, actor: r.actor, activatedAt: r.activated_at, expiresAt: r.expires_at, releasedAt: r.released_at, releasedBy: r.released_by, releaseNote: r.release_note,
    status: r.mode === 'dry' ? 'dry' : r.released_at ? (r.released_by === 'ttl' ? 'expired' : 'released') : 'active' });
  const forbiddenFiles = files => (Array.isArray(files) ? files : []).some(f => /(^|\/)\.github\/workflows\/|(^|\/)CODEOWNERS$/i.test(String(f)));

  /* ── 대책 카드 템플릿(서버 고정 문구 — 피드 텍스트를 지시로 쓰지 않는다) ── */
  const CTRL = {
    injection: ['입력 · 출력 가드(aiguard) 규칙 추가', '도구 호출 허용 목록 점검', '회귀 프롬프트 추가'],
    rce: ['영향 패키지 버전 고정 · 갱신', '실행 권한 최소화', '런타임 탐지 규칙 확인'],
    xss: ['출력 이스케이프 점검', 'CSP 위반 보고 확인', '회귀 UI 시험 추가'],
    auth: ['세션 · 권한 검사 경로 점검', 'RLS 정책 확인', '교차 테넌트 시험 추가'],
    default: ['영향 판정 재확인', '패치 · 완화 적용', '회귀 시험 추가']
  };
  const cardBody = (id, t, controls) => [`# ${id} 대책 카드`, '', `- 위협: ${str(t.source, 20)} ${str(t.external_id, 60)}`, `- 유형: ${str(t.attack_type, 40) || '미분류'}`, `- 판정: ${str(t.verdict, 20)}`, '', '## 통제', ...controls.map(x => `- [ ] ${x}`), '', '## 회귀 시험', '- [ ] 재현 시험 작성 · 통과', '', '> 위협 원문은 외부 데이터이며 지시로 취급하지 않습니다.'].join('\n');

  /* ── 라우트 ── */
  const R = {};
  R['GET /api/security/summary'] = async req => {
    await owner(req); await expire();
    const p = { P0: 0, P1: 0, P2: 0, P3: 0 };
    (await pool.query('select priority, count(*)::int n from security.finding where status <> all($1) group by priority', [DONE])).rows.forEach(r => { p[r.priority] = r.n; });
    const score = Math.max(0, 100 - (p.P0 * 25 + p.P1 * 10 + p.P2 * 3 + p.P3));
    const mttd = (await pool.query('select round((avg(extract(epoch from f.created_at - t.published_at)) / 3600)::numeric, 1)::float8 h from security.finding f join security.threat_item t on t.id = f.threat_id where t.published_at is not null')).rows[0].h;
    const mttr = (await pool.query("select round((avg(extract(epoch from resolved_at - created_at)) / 3600)::numeric, 1)::float8 h from security.finding where status = 'fixed' and resolved_at is not null")).rows[0].h;
    const prs = (await prRows("where status in ('open','pending')")).slice(0, 5).map(x => ({ kind: 'pr', id: x.id, title: x.title, severity: x.severity, need: x.need, have: x.have }));
    const fs = (await pool.query(`select id, title, priority, ${ISO('sla_due_at')} sla_due_at from security.finding where status <> all($1) and priority in ('P0','P1') order by priority, sla_due_at nulls last, id limit 5`, [DONE])).rows.map(r => ({ kind: 'finding', id: r.id, title: r.title, priority: r.priority, slaDueAt: r.sla_due_at }));
    const threats = (await pool.query(`select ${T_COLS} from security.threat_item order by published_at desc nulls last, id limit 3`)).rows.map(tOut);
    const killActive = (await pool.query("select count(*)::int n from security.kill_switch where mode = 'live' and released_at is null")).rows[0].n;
    const X = (await pool.query(`select (select count(*)::int from security.finding where status <> all($1) and severity in ('critical','high')) high, (select count(*)::int from security.finding where status <> all($1) and sla_due_at < now()) sla_over,
      (select count(*)::int from security.fix_pr where status in ('open','pending')) pr_pending, (select ${ISO('max(at)')} from security.scan) last`, [DONE])).rows[0];
    const state = p.P0 > 0 ? 'crit' : p.P1 > 0 || X.sla_over > 0 ? 'warn' : 'ok';
    return { score, state, p, high: X.high, slaOver: X.sla_over, prPending: X.pr_pending, last: X.last, delta: null, mttd, mttr, todo: [...prs, ...fs].slice(0, 8), threats, killMode: live() ? 'live' : 'dry', killActive };
  };
  R['GET /api/security/findings'] = async req => {
    await owner(req); const u = new URL(req.url, 'http://x'); const st = u.searchParams.get('status') || '', sv = u.searchParams.get('sev') || '';
    if (st && !FST.includes(st)) throw new HttpErr(400, '상태 값이 올바르지 않습니다.', 'status'); if (sv && !SEV.includes(sv)) throw new HttpErr(400, '심각도 값이 올바르지 않습니다.', 'sev');
    const { rows } = await pool.query(`select ${F_COLS} from security.finding where ($1 = '' or status = $1) and ($2 = '' or severity = $2) order by priority, score desc, id limit 300`, [st, sv]);
    return { rows: rows.map(fOut) };
  };
  const patchFinding = async (req, id) => {
    const a = await owner(req); const b = await readBody(req, 8192); const status = String(b.status || ''); const note = str(b.note, 500);
    if (!FST.includes(status)) throw new HttpErr(400, '상태 값이 올바르지 않습니다.', 'status');
    return tx(async c => {
      const cur = (await c.query('select status from security.finding where id = $1 for update', [id])).rows[0]; if (!cur) throw new HttpErr(404, '취약점을 찾지 못했습니다.', 'not_found');
      await c.query(`update security.finding set status = $2, note = case when $3 = '' then note else $3 end, updated_at = now(), resolved_at = case when $2 = any($4) then coalesce(resolved_at, now()) else null end where id = $1`, [id, status, note, DONE]);
      await audit(c, a.email, 'finding.status', id, { from: cur.status, to: status }, req);
      return { ok: true, finding: fOut((await c.query(`select ${F_COLS} from security.finding where id = $1`, [id])).rows[0]) };
    });
  };
  R['GET /api/security/threats'] = async req => { await owner(req); return { rows: (await pool.query(`select ${T_COLS} from security.threat_item order by published_at desc nulls last, id limit 200`)).rows.map(tOut) }; };
  const threatCard = async (req, id) => {
    const a = await owner(req);
    return tx(async c => {
      const t = (await c.query('select id, source, external_id, title, attack_type, verdict from security.threat_item where id = $1', [id])).rows[0]; if (!t) throw new HttpErr(404, '위협을 찾지 못했습니다.', 'not_found');
      const ex = (await c.query(`select ${C_COLS} from security.countermeasure where threat_id = $1 order by id limit 1`, [id])).rows[0];
      if (ex) { await c.query('update security.countermeasure set reuse_count = reuse_count + 1, updated_at = now() where id = $1', [ex.id]); await audit(c, a.email, 'card.reuse', ex.id, { threat: id }, req); return { ok: true, created: false, card: cOut((await c.query(`select ${C_COLS} from security.countermeasure where id = $1`, [ex.id])).rows[0], true) }; }
      await c.query('select pg_advisory_xact_lock(820822)');
      const n = +(await c.query("select coalesce(max(substring(id from 6)::int), 0) n from security.countermeasure where id ~ '^CARD-[0-9]{4,}$'")).rows[0].n + 1;
      const cid = 'CARD-' + String(n).padStart(4, '0'); const pat = str(t.attack_type, 40).toLowerCase(); const controls = CTRL[pat] || CTRL.default;
      await c.query('insert into security.countermeasure (id, threat_id, title, threat_pattern, controls, regression_tests, skill_refs, playbook, body) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [cid, id, str(`${t.external_id} 대응`, 200), pat, JSON.stringify(controls), JSON.stringify(['재현 시험 작성 · 통과']), JSON.stringify(['didisam-security-agent']), 'patch-verify-rollback', cardBody(cid, t, controls)]);
      await audit(c, a.email, 'card.create', cid, { threat: id }, req);
      return { ok: true, created: true, card: cOut((await c.query(`select ${C_COLS} from security.countermeasure where id = $1`, [cid])).rows[0], true) };
    });
  };
  R['GET /api/security/prs'] = async req => { await owner(req); return { rows: await prRows() }; };
  const approvePr = async (req, id) => {
    const a = await owner(req); const b = await readBody(req, 4096); let method = 'reauth';
    const lt = String(b.token || '').slice(0, 40), ls = String(b.secret || '').slice(0, 100);
    if (b.token != null || b.secret != null) {
      method = 'link'; const L = /^al_[0-9a-f]{16}$/.test(lt) ? (await pool.query('select pr_id, uid, secret_hash, expires_at > now() live, used_at from security.approve_link where id = $1', [lt])).rows[0] : null;
      if (!L || !ls || L.secret_hash !== sha(ls) || L.used_at || !L.live || L.pr_id !== id || L.uid !== a.uid) throw new HttpErr(401, '승인 링크가 만료되었거나 올바르지 않습니다.', 'link');
    } else await reauth(a, b.reauth);
    return tx(async c => {
      const pr = (await c.query('select id, severity, status, files from security.fix_pr where id = $1 for update', [id])).rows[0]; if (!pr) throw new HttpErr(404, '수정 PR을 찾지 못했습니다.', 'not_found');
      if (forbiddenFiles(pr.files)) throw new HttpErr(403, '워크플로 · CODEOWNERS를 바꾸는 PR은 가디언 경로로 승인할 수 없습니다.', 'forbidden_files');
      if (!['open', 'pending'].includes(pr.status)) throw new HttpErr(409, '승인할 수 없는 상태입니다.', 'pr_state');
      if (method === 'link') { const u = await c.query('update security.approve_link set used_at = now() where id = $1 and used_at is null', [lt]); if (!u.rowCount) throw new HttpErr(401, '승인 링크가 만료되었거나 올바르지 않습니다.', 'link'); }
      const ins = await c.query('insert into security.approval (pr_id, approver, method) values ($1, $2, $3) on conflict do nothing', [id, a.email, method]);
      if (!ins.rowCount) throw new HttpErr(409, '이미 승인했습니다. 다른 승인자가 필요합니다.', 'dup_approver');
      const have = (await c.query('select count(*)::int n from security.approval where pr_id = $1', [id])).rows[0].n; const need = needOf(pr.severity); const status = have >= need ? 'approved' : 'pending';
      await c.query(`update security.fix_pr set status = $2, approved_at = case when $2 = 'approved' then now() else null end where id = $1`, [id, status]);
      await audit(c, a.email, 'pr.approve', id, { method, have, need, status }, req);
      const approvers = (await c.query('select approver from security.approval where pr_id = $1 order by id', [id])).rows.map(r => r.approver);
      return { ok: true, status, need, have, approvers };
    });
  };
  const rejectPr = async (req, id) => {
    const a = await owner(req); const b = await readBody(req, 4096); const reason = str(b.reason, 200).trim();
    if (!reason) throw new HttpErr(400, '반려 사유를 입력해 주십시오.', 'reason');
    return tx(async c => {
      const pr = (await c.query('select status from security.fix_pr where id = $1 for update', [id])).rows[0]; if (!pr) throw new HttpErr(404, '수정 PR을 찾지 못했습니다.', 'not_found');
      if (!['open', 'pending'].includes(pr.status)) throw new HttpErr(409, '반려할 수 없는 상태입니다.', 'pr_state');
      await c.query("update security.fix_pr set status = 'rejected', reject_reason = $2 where id = $1", [id, reason]);
      await audit(c, a.email, 'pr.reject', id, { from: pr.status }, req);
      return { ok: true, status: 'rejected' };
    });
  };
  R['POST /api/security/approve-link'] = async req => {
    const a = await owner(req); const b = await readBody(req, 4096); const prId = String(b.pr || b.prId || '');
    if (!ID_RE.test(prId)) throw new HttpErr(400, 'PR id가 올바르지 않습니다.', 'pr'); await reauth(a, b.reauth);
    if (!(await pool.query('select 1 from security.fix_pr where id = $1', [prId])).rows[0]) throw new HttpErr(404, '수정 PR을 찾지 못했습니다.', 'not_found');
    const token = 'al_' + crypto.randomBytes(8).toString('hex'), secret = crypto.randomBytes(32).toString('base64url');
    const exp = await tx(async c => { const r = (await c.query(`insert into security.approve_link (id, secret_hash, pr_id, uid, email, expires_at) values ($1,$2,$3,$4,$5, now() + interval '${LINK_MIN} minutes') returning ${ISO('expires_at')} e`, [token, sha(secret), prId, a.uid, a.email])).rows[0].e; await audit(c, a.email, 'link.issue', prId, { token, min: LINK_MIN }, req); return r; });
    return { ok: true, token, secret, exp, expiresAt: exp, minutes: LINK_MIN, url: `/#sec-approve:${prId}:${token}:${secret}` };
  };
  R['GET /api/security/cards'] = async req => { await owner(req); return { rows: (await pool.query(`select ${C_COLS} from security.countermeasure order by id limit 300`)).rows.map(r => cOut(r, false)) }; };
  const getCard = async (req, id) => { await owner(req); const r = (await pool.query(`select ${C_COLS} from security.countermeasure where id = $1`, [id])).rows[0]; if (!r) throw new HttpErr(404, '대책 카드를 찾지 못했습니다.', 'not_found'); return { card: cOut(r, true) }; };
  R['GET /api/security/kill'] = async req => {
    await owner(req); await expire();
    const log = (await pool.query(`select ${K_COLS}, case when expires_at is null then null else greatest(0, ceil(extract(epoch from expires_at - now()) / 60))::int end left_min from security.kill_switch order by activated_at desc, id limit 100`)).rows;
    const used = (await pool.query('select count(*)::int n from security.kill_switch where kday = $1::date', [kday()])).rows[0].n;
    const active = log.filter(r => !r.released_at && (r.left_min == null || r.left_min > 0)).map(r => ({ id: r.id, action: r.action, tenant: r.tenant_id, reason: r.reason, leftMin: r.left_min, dry: r.mode === 'dry' }));
    return { mode: live() ? 'live' : 'dry', dday: dday(), ttlMin: FEATURE_TTL_MAX, cap: { used, max: KILL_DAY_MAX }, kinds: ACTIONS, active, log: log.map(kOut) };
  };
  R['POST /api/security/kill'] = async req => {
    const a = await ownerOrGuard(req); const b = await readBody(req, 8192);
    const action = String(b.action || ''), tenant = String(b.tenant || ''), reason = str(b.reason, 200).trim(), ruleId = str(b.ruleId, 60);
    if (!ACTIONS.includes(action)) throw new HttpErr(400, '차단 종류가 올바르지 않습니다(key_disable · feature_off · egress_block).', 'action');
    if (!TID_RE.test(tenant)) throw new HttpErr(400, '기관 id가 올바르지 않습니다.', 'tenant');
    if (!reason) throw new HttpErr(400, '차단 사유를 입력해 주십시오.', 'reason');
    if (ruleId && !/^[\w.-]{1,60}$/.test(ruleId)) throw new HttpErr(400, '규칙 id가 올바르지 않습니다.', 'rule');
    const signals = [...new Set(arr(b.signals, 10, 60))];
    if (action === 'egress_block' && signals.length < 2) throw new HttpErr(400, 'egress 차단은 서로 다른 신호 2개 이상이 필요합니다.', 'signals');
    let ttl = null; if (action === 'feature_off') { ttl = Math.round(numOr(b.ttlMin, FEATURE_TTL_MAX)); if (!(ttl >= 1)) ttl = 1; ttl = Math.min(FEATURE_TTL_MAX, ttl); }
    if (!(await pool.query('select 1 from tenants where id = $1', [tenant])).rows[0]) throw new HttpErr(404, '기관을 찾지 못했습니다.', 'not_found');
    const mode = live() ? 'live' : 'dry'; const id = 'ks_' + crypto.randomBytes(8).toString('hex');
    const row = await tx(async c => {
      await c.query('select pg_advisory_xact_lock(820823)');
      const used = (await c.query('select count(*)::int n from security.kill_switch where kday = $1::date', [kday()])).rows[0].n;
      if (used >= KILL_DAY_MAX) throw new HttpErr(429, `긴급 차단은 하루 ${KILL_DAY_MAX}회까지입니다. 대표님 판단이 필요합니다.`, 'kill_cap');
      if (mode === 'live' && (await c.query("select 1 from security.kill_switch where tenant_id = $1 and action = $2 and mode = 'live' and released_at is null and (expires_at is null or expires_at > now())", [tenant, action])).rows[0]) throw new HttpErr(409, '같은 차단이 이미 걸려 있습니다.', 'kill_dup');
      await c.query(`insert into security.kill_switch (id, action, tenant_id, mode, trigger, rule_id, reason, signals, actor, expires_at, kday) values ($1,$2,$3,$4,$5,$6,$7,$8,$9, case when $10::int is null then null else now() + make_interval(mins => $10::int) end, $11::date)`,
        [id, action, tenant, mode, a.agent ? 'rule' : 'manual', ruleId, reason, JSON.stringify(signals), a.email, ttl, kday()]);
      await audit(c, a.email, 'kill.' + mode, id, { action, tenant, ttlMin: ttl, ruleId }, req);
      return (await c.query(`select ${K_COLS} from security.kill_switch where id = $1`, [id])).rows[0];
    });
    cache.delete(tenant);
    await inTenant(pool, tenant, c => c.query('insert into audit_log (tenant_id, actor, action, detail) values ($1, $2, $3, $4)', [tenant, a.email, 'security.kill', JSON.stringify({ action, mode })])).catch(e => log.error && log.error('sec kill tenant audit', e.message));
    return { ok: true, dryRun: mode === 'dry', kill: kOut(row) };
  };
  const releaseKill = async (req, id) => {
    if (bearer(req)) throw new HttpErr(403, '긴급 차단 해제는 사람만 할 수 있습니다.', 'human_only');
    const a = await owner(req); const b = await readBody(req, 4096); const note = str(b.note, 200);
    const row = await tx(async c => {
      const k = (await c.query('select id, tenant_id, action, released_at from security.kill_switch where id = $1 for update', [id])).rows[0]; if (!k) throw new HttpErr(404, '차단 기록을 찾지 못했습니다.', 'not_found');
      if (k.released_at) throw new HttpErr(409, '이미 해제되었습니다.', 'released');
      await c.query('update security.kill_switch set released_at = now(), released_by = $2, release_note = $3 where id = $1', [id, a.email, note]);
      await audit(c, a.email, 'kill.release', id, { action: k.action, tenant: k.tenant_id }, req);
      return (await c.query(`select ${K_COLS} from security.kill_switch where id = $1`, [id])).rows[0];
    });
    cache.delete(row.tenant_id); return { ok: true, kill: kOut(row) };
  };
  R['POST /api/security/ingest'] = async req => {
    const g = guard(req); const b = await readBody(req, 512 * 1024); const kind = String(b.kind || '');
    if (!Array.isArray(b.items) || b.items.length > 200) throw new HttpErr(400, 'items는 200건 이하 배열이어야 합니다.', 'items');
    const items = b.items.filter(x => x && typeof x === 'object' && !Array.isArray(x)); let created = 0, updated = 0;
    if (!['finding', 'threat', 'scan', 'pr', 'card'].includes(kind)) throw new HttpErr(400, 'kind가 올바르지 않습니다(finding · threat · scan · pr · card).', 'kind');
    await tx(async c => {
      for (const x of items) {
        if (kind === 'finding') {
          const key = str(x.key, 200); if (!key) continue; const sev = SEV.includes(x.severity) ? x.severity : 'medium'; const pri = PRI.includes(x.priority) ? x.priority : 'P3';
          const ev = x.evidence && typeof x.evidence === 'object' && JSON.stringify(x.evidence).length <= 8000 ? x.evidence : {};
          const r = await c.query(`insert into security.finding (id, key, origin, title, severity, priority, score, tenant_scope, owner, sla_due_at, threat_id, evidence) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            on conflict (key) do update set title = excluded.title, severity = excluded.severity, priority = excluded.priority, score = excluded.score, tenant_scope = excluded.tenant_scope, sla_due_at = excluded.sla_due_at, threat_id = coalesce(excluded.threat_id, security.finding.threat_id), evidence = excluded.evidence, updated_at = now() returning (xmax = 0) ins`,
            ['F-' + sha(key).slice(0, 12), key, str(x.origin, 20) || 'scan', str(x.title, 300), sev, pri, Math.max(0, Math.min(100, numOr(x.score, 0))), str(x.tenantScope, 60) || 'all', str(x.owner, 60), isoOr(x.slaDueAt), ID_RE.test(String(x.threatId || '')) ? String(x.threatId) : null, JSON.stringify(ev)]);
          r.rows[0].ins ? created++ : updated++;
        } else if (kind === 'threat') {
          const src = str(x.source, 20), ext = str(x.externalId, 80); if (!src || !ext) continue;
          const r = await c.query(`insert into security.threat_item (id, source, external_id, title, cvss, epss, kev, affected, attack_type, url, published_at, verdict, hash, summary) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            on conflict (source, external_id) do update set title = excluded.title, summary = excluded.summary, cvss = excluded.cvss, epss = excluded.epss, kev = excluded.kev, affected = excluded.affected, attack_type = excluded.attack_type, url = excluded.url, published_at = excluded.published_at, verdict = excluded.verdict, hash = excluded.hash, updated_at = now() returning (xmax = 0) ins`,
            ['T-' + sha(src + '|' + ext).slice(0, 12), src, ext, str(x.title, 300), x.cvss == null ? null : Math.max(0, Math.min(10, numOr(x.cvss, 0))), x.epss == null ? null : Math.max(0, Math.min(1, numOr(x.epss, 0))), x.kev === true, JSON.stringify(arr(x.affected, 50, 200)), str(x.attackType, 40), /^https:\/\//.test(String(x.url || '')) ? str(x.url, 500) : '', isoOr(x.publishedAt), ['pending', 'affected', 'partial', 'none', 'control'].includes(x.verdict) ? x.verdict : 'pending', str(x.hash, 128), str(x.summary, 2000)]);
          r.rows[0].ins ? created++ : updated++;
        } else if (kind === 'scan') {
          await c.query('insert into security.scan (type, target, tool, tool_version_sha, findings_count, raw_ref) values ($1,$2,$3,$4,$5,$6)', [str(x.type, 20) || 'dep', str(x.target, 200), str(x.tool, 60), str(x.toolVersionSha, 80), Math.max(0, Math.round(numOr(x.findingsCount, 0))), str(x.rawRef, 300)]); created++;
        } else if (kind === 'pr') {
          const id = str(x.id, 80); if (!ID_RE.test(id)) continue; const sev = SEV.includes(x.severity) ? x.severity : 'medium';
          const r = await c.query(`insert into security.fix_pr (id, pr_number, title, finding_ids, severity, change_type, files, verify_result, risk, rollback_ref, url) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            on conflict (id) do update set title = excluded.title, verify_result = excluded.verify_result, risk = excluded.risk, files = excluded.files, url = excluded.url where security.fix_pr.status in ('open','pending') returning (xmax = 0) ins`,
            [id, x.number == null ? null : Math.round(numOr(x.number, 0)), str(x.title, 300), JSON.stringify(arr(x.findingIds, 50, 80)), sev, str(x.changeType, 40), JSON.stringify(arr(x.files, 100, 300)), str(x.verifyResult, 200), str(x.risk, 200), str(x.rollbackRef, 200), /^https:\/\//.test(String(x.url || '')) ? str(x.url, 500) : '']);
          if (r.rows[0]) r.rows[0].ins ? created++ : updated++;
        } else {
          const id = str(x.id, 20); if (!/^CARD-\d{4,}$/.test(id)) continue;
          const r = await c.query(`insert into security.countermeasure (id, threat_id, title, threat_pattern, controls, regression_tests, skill_refs, playbook, body) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            on conflict (id) do update set title = excluded.title, controls = excluded.controls, regression_tests = excluded.regression_tests, body = excluded.body, version = security.countermeasure.version + 1, updated_at = now() returning (xmax = 0) ins`,
            [id, ID_RE.test(String(x.threatId || '')) ? String(x.threatId) : null, str(x.title, 300), str(x.threatPattern, 40), JSON.stringify(arr(x.controls, 30, 200)), JSON.stringify(arr(x.regressionTests, 30, 200)), JSON.stringify(arr(x.skillRefs, 10, 80)), str(x.playbook, 80), str(x.body, 32000)]);
          r.rows[0].ins ? created++ : updated++;
        }
      }
      await audit(c, g.email, 'ingest.' + kind, '', { n: items.length, created, updated }, req);
    });
    return { ok: true, kind, n: items.length, created, updated };
  };
  R['GET /api/security/audit'] = async req => {
    await owner(req); const v = await verifyChain();
    const rows = (await pool.query(`select id::int id, ${ISO('at')} at, actor, actor_kind, action, target, detail, ip_masked, prev_hash, hash from security.audit order by id desc limit 100`)).rows.map(r => ({ id: r.id, at: r.at, actor: r.actor, actorKind: r.actor_kind, action: r.action, target: r.target, detail: r.detail, ipMasked: r.ip_masked, prevHash: r.prev_hash, hash: r.hash }));
    return { ...v, rows };
  };

  const P = [
    ['PATCH', /^\/api\/security\/findings\/([\w.:-]{1,80})$/, patchFinding],
    ['POST', /^\/api\/security\/threats\/([\w.:-]{1,80})\/card$/, threatCard],
    ['POST', /^\/api\/security\/prs\/([\w.:-]{1,80})\/approve$/, approvePr],
    ['POST', /^\/api\/security\/prs\/([\w.:-]{1,80})\/reject$/, rejectPr],
    ['GET', /^\/api\/security\/cards\/(CARD-\d{4,})$/, getCard],
    ['POST', /^\/api\/security\/kill\/(ks_[0-9a-f]{16})\/release$/, releaseKill]
  ];
  function match(method, p) {
    if (!p.startsWith('/api/security/')) return null;
    const k = R[`${method} ${p}`]; if (k) return k;
    for (const [m, re, fn] of P) { if (m !== method) continue; const x = p.match(re); if (x) return req => fn(req, x[1]); }
    return null;
  }
  return { match, gate, preAi, postAi, keyBlocked, egressBlocked, tick: expire, verifyChain };
}

module.exports = { createSecurity, chainHash, maskIp, GENESIS, KILL_DAY_MAX, FEATURE_TTL_MAX };
