'use strict';
/* 가디언 4차(d3) 대조: 접속기록 ip(#5) · 분기 접근권한 검토(#7) · 내려받기 통제(#14) · 국외 로그인 차단 설정(#15)
   Node와 Java에 같은 시나리오를 돌려 상태코드 · 오류 코드 · 응답 키 · audit 내용을 비교한다(보관 파기 #10 · #11은 같은 DB 함수 records_purge — service/test/records.test.js).
   사용: DATABASE_URL=… node service-egov/test/contract-records.js http://127.0.0.1:9831 http://127.0.0.1:9832
   두 서버 환경: test/env.sh + SIGNUP_CODE=C0DE · TRUST_PROXY_HOPS=1 · MFA_OFF=1 */
const { Pool } = require('pg');
const [A, B] = [process.argv[2], process.argv[3]]; const pool = new Pool({ connectionString: process.env.DATABASE_URL }); let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const q1 = async (sql, a, t) => { const c = await pool.connect(); try { await c.query('begin'); await c.query("select set_config('app.tenant', $1, true)", [t]); const r = await c.query(sql, a); await c.query('commit'); return r.rows; } finally { c.release(); } };

async function run(U, tag) {
  const jars = {}; const call = async (who, method, path, body) => {
    const J = jars[who] || (jars[who] = {});
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', 'x-forwarded-for': '211.36.7.' + (tag === 'n' ? 1 : 2), ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (kv.slice(i + 1)) J[kv.slice(0, i)] = kv.slice(i + 1); }
    const tx = await r.text(); let j = {}; try { j = JSON.parse(tx); } catch (e) { j = { _csv: tx }; } return { st: r.status, j, err: j.error || '', ct: r.headers.get('content-type') || '' };
  };
  const sfx = tag + Date.now().toString(36); const OW = `rc${sfx}@d.kr`, PW = 'Passw0rd-dev'; const R = {};
  R.signup = await call('A', 'POST', '/api/signup', { email: OW, password: PW, orgName: 'R' + tag, type: 'corp', code: 'C0DE' }); const tid = R.signup.j.tenant.tid;
  R.geoNoState = await call('A', 'POST', '/api/org/sec/geo', { krOnly: true });
  R.state = await call('A', 'PUT', '/api/state', { doc: { org: { name: 'R' + tag, type: 'corp' } }, rev: 0 });
  const s = await call('A', 'POST', '/api/staff', { email: `sub${sfx}@d.kr`, role: 'sub' });
  await call('S', 'POST', '/api/login', { email: `sub${sfx}@d.kr`, password: s.j.password }); await call('S', 'POST', '/api/password', { current: s.j.password, next: 'Passw0rd-sub1' });
  R.acc = await call('A', 'GET', '/api/learners/accounts'); R.ip = (await q1("select ip from pii.access_log where tid = $1 order by id desc limit 1", [tid], tid))[0];
  R.revAnon = await call('X', 'GET', '/api/access-review'); R.revSub = await call('S', 'GET', '/api/access-review'); R.rev0 = await call('A', 'GET', '/api/access-review');
  R.revLong = await call('A', 'POST', '/api/access-review', { note: 'x'.repeat(501) }); R.revSubPost = await call('S', 'POST', '/api/access-review', { note: 'a' });
  R.revPost = await call('A', 'POST', '/api/access-review', { note: '분기 검토' }); R.rev1 = await call('A', 'GET', '/api/access-review');
  R.revAudit = (await q1("select detail from audit_log where tenant_id = $1 and action = 'access.review'", [tid], tid)).map(r => r.detail);
  R.geoSub = await call('S', 'POST', '/api/org/sec/geo', { krOnly: true }); R.geoBad = await call('A', 'POST', '/api/org/sec/geo', { krOnly: 1 });
  R.geoOn = await call('A', 'POST', '/api/org/sec/geo', { krOnly: true }); R.geoGet = await call('S', 'GET', '/api/org/sec/geo');
  R.facNo = await call('A', 'GET', '/api/fac/export'); R.facOk = await call('A', 'GET', '/api/fac/export?reason=%EC%A0%95%EC%82%B0');
  R.ledNo = await call('S', 'GET', '/api/ledger/export'); R.ledRaw = await call('S', 'GET', '/api/ledger/export?reason=%EC%A0%95%EC%82%B0&raw=1');
  R.expAudit = (await q1("select detail from audit_log where tenant_id = $1 and action = 'export'", [tid], tid)).map(r => r.detail);
  return R;
}

(async () => {
  const out = []; for (const [U, tag] of [[A, 'n'], [B, 'j']]) {
    const R = await run(U, tag); out.push(R); const T = tag === 'n' ? 'Node' : 'Java';
    ok(R.signup.st === 200 && R.state.st === 200, `${T} 가입 · 저장`);
    ok(R.geoNoState.st === 409 && R.geoNoState.err === 'no_state', `${T} 상태 없음 409 ${R.geoNoState.st}`);
    ok(R.acc.st === 200 && R.ip && R.ip.ip === '211.36.7.' + (tag === 'n' ? 1 : 2), `${T} 접속기록 ip ${JSON.stringify(R.ip)}`);
    ok(R.revAnon.st === 401 && R.revSub.st === 403 && R.revSub.err === 'role', `${T} 검토 권한`);
    ok(R.rev0.st === 200 && R.rev0.j.due === true && R.rev0.j.lastReview === null && R.rev0.j.rows.length === 2 && Object.keys(R.rev0.j.rows[0]).join() === 'email,role,lastLogin' && R.rev0.j.rows[0].role === 'owner', `${T} 검토 목록 ${JSON.stringify(R.rev0.j)}`);
    ok(Object.keys(R.rev0.j).join() === 'rows,lastReview,due', `${T} 검토 응답 키`);
    ok(R.revLong.st === 400 && R.revLong.err === 'note' && R.revSubPost.st === 403, `${T} 검토 기록 검증`);
    ok(R.revPost.st === 200 && JSON.stringify(R.revPost.j) === '{"ok":true}' && R.rev1.j.due === false && R.rev1.j.lastReview.note === '분기 검토' && Object.keys(R.rev1.j.lastReview).join() === 'at,by,note', `${T} 검토 기록 ${JSON.stringify(R.rev1.j.lastReview)}`);
    ok(R.revAudit.length === 1 && R.revAudit[0].roles.owner === 1 && R.revAudit[0].roles.sub === 1 && R.revAudit[0].roles.teacher === 0 && R.revAudit[0].n === 2, `${T} audit access.review`);
    ok(R.geoSub.st === 403 && R.geoBad.st === 400 && R.geoBad.err === 'krOnly' && JSON.stringify(R.geoOn.j) === '{"ok":true,"krOnly":true}' && R.geoGet.j.krOnly === true, `${T} krOnly 설정`);
    ok(R.facNo.st === 400 && R.facNo.err === 'export_reason' && R.facOk.st === 200 && /csv/.test(R.facOk.ct), `${T} 시설 내려받기 ${R.facNo.st}/${R.facOk.st}`);
    ok(R.ledNo.err === 'export_reason' && R.ledRaw.st === 403 && R.ledRaw.err === 'export_raw', `${T} 원장 내려받기 ${R.ledNo.err}/${R.ledRaw.err}`);
    ok(R.expAudit.length === 1 && JSON.stringify(R.expAudit[0]) === '{"n":0,"raw":false,"kind":"fac","reason":"정산"}', `${T} audit export ${JSON.stringify(R.expAudit)}`);
  }
  const [n, j] = out; for (const k of Object.keys(n)) if (n[k] && typeof n[k].st === 'number') ok(n[k].st === j[k].st && n[k].err === j[k].err, `대조 ${k}: Node ${n[k].st}/${n[k].err} · Java ${j[k].st}/${j[k].err}`);
  console.log(`contract-records: ${pass} 통과 · ${fail} 실패`); await pool.end(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
