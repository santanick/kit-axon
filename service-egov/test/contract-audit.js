'use strict';
/* 가디언 2차(SEC-0006) GET /api/audit/verify 대조: Node와 Java에 같은 시나리오를 돌려 상태코드 · 오류 코드 · 응답 형태를 비교하고,
   한쪽 서버가 쌓은 기관 체인을 다른 쪽 서버로 교차 검증한다(체인 계산은 DB 트리거라 두 서버가 같은 값을 만들어야 함).
   사용: DATABASE_URL=… node test/contract-audit.js http://127.0.0.1:9721 http://127.0.0.1:9722  (두 서버 SIGNUP_CODE=C0DE, 같은 DB) */
const [A, B] = [process.argv[2], process.argv[3]]; let fail = 0, pass = 0; const RUN = Date.now().toString(36);
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const keys = o => o && typeof o === 'object' ? Object.keys(o).sort().join() : typeof o;
async function run(U, tag) {
  const jar = {}; const call = async (who, m, p, b) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: b ? JSON.stringify(b) : undefined }); const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; let j = null; try { j = await r.json(); } catch { } return { st: r.status, j }; };
  const R = {}; const email = `av_${tag}_${RUN}@a.kr`;
  R.signup = await call('O', 'POST', '/api/signup', { email, password: 'Passw0rd-aaa', orgName: 'Aud' + tag, type: 'adult', code: 'C0DE' });
  await call('O', 'POST', '/api/login', { email, password: 'wrong-Passw0rd' }); await call('O', 'POST', '/api/login', { email, password: 'Passw0rd-aaa' });
  R.anon = await call('X', 'GET', '/api/audit/verify'); R.v = await call('O', 'GET', '/api/audit/verify'); R.audit = await call('O', 'GET', '/api/audit');
  return { R, call };
}
(async () => {
  const a = await run(A, 'node'), b = await run(B, 'java');
  for (const k of Object.keys(a.R)) { const x = a.R[k], y = b.R[k]; ok(x.st === y.st, `${k} status ${x.st} != ${y.st} ${JSON.stringify(y.j).slice(0, 200)}`);
    if (k !== 'signup' && k !== 'audit') ok(keys(x.j) === keys(y.j), `${k} keys ${keys(x.j)} != ${keys(y.j)}`); if (x.j && x.j.error) ok(x.j.error === (y.j && y.j.error), `${k} error ${x.j.error} != ${y.j && y.j.error}`); }
  for (const [t, s] of [['node', a], ['java', b]]) { const v = s.R.v.j; ok(v && v.ok === true && v.n >= 3 && /^[0-9a-f]{64}$/.test(v.head), `${t} verify ${JSON.stringify(v)}`); ok(s.R.anon.st === 401, `${t} anon 401`); }
  /* 교차: Node 세션 쿠키로 Java에서, Java 세션 쿠키로 Node에서 — 같은 head가 나와야 한다 */
  const cross = async (U, jar) => (await fetch(U + '/api/audit/verify', { headers: { 'x-didisam': '1', cookie: jar } })).json();
  const recook = async (s, U, tag) => { const r = await fetch(U + '/api/login', { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: `av_${tag}_${RUN}@a.kr`, password: 'Passw0rd-aaa' }) }); return (r.headers.get('set-cookie') || '').split(';')[0]; };
  const ca = await recook(a, A, 'node'), cb = await recook(b, B, 'java');
  const n1 = await cross(A, ca), j1 = await cross(B, ca); ok(n1.ok && j1.ok && n1.head === j1.head && n1.n === j1.n, `교차(node 기관) ${JSON.stringify(n1)} / ${JSON.stringify(j1)}`);
  const n2 = await cross(A, cb), j2 = await cross(B, cb); ok(n2.ok && j2.ok && n2.head === j2.head, `교차(java 기관) ${JSON.stringify(n2)} / ${JSON.stringify(j2)}`);
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
