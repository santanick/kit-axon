'use strict';
/* v30 규정 준수 /api 대조: Node와 Java에 같은 시나리오를 돌려 상태코드 · 응답 형태 · 값 · 교차 동작을 비교한다.
   사용: node test/contract-cpl.js http://127.0.0.1:8091 http://127.0.0.1:8090  (IDV_DEV=1, SIGNUP_CODE=C0DE) */
const [A, B] = [process.argv[2], process.argv[3]]; let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const shape = v => v === null ? 'null' : Array.isArray(v) ? '[' + (v.length ? shape(v[0]) : '') + ']' : typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => k + ':' + (k === 'dev_code' ? 's' : shape(v[k]))).join(',') + '}' : typeof v;
async function run(U, tag) {
  const jar = {}; const R = {}; const call = async (who, m, p, b) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: b ? JSON.stringify(b) : undefined }); const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; let j = null; try { j = await r.json(); } catch { } return { st: r.status, j }; };
  const su = await call('A', 'POST', '/api/signup', { email: `cc_${tag}_${Date.now()}@example.com`, password: 'Contract2026x', orgName: 'C', type: 'voc', code: 'C0DE' }); const tid = su.j.tenant.tid;
  let rev = (await call('A', 'GET', '/api/state')).j.rev || 0;
  const pr = await call('A', 'PUT', '/api/state', { doc: { org: { name: 'C', type: 'voc', room: { mode: 'saas' }, cpl: { on: true, single: true, dayMax: 1, attend: { cls: 'c1', code: 'QR1234', exp: Date.now() + 600000 } } }, codes: [{ sid: 'T0001', dept: '1반', code: 'ABC234' }], members: [{ id: 'm1', sid: 'T0001', name: 'T0001' }], classes: [], lsite: { pub: { org: { name: 'C', type: 'voc' }, classes: [], tuts: [] } } }, rev }); ok(pr.st === 200, tag + ' state');
  const P = `/api/pub/${tid}`; R.login1 = (await call('L1', 'POST', P + '/login', { sid: 'T0001', code: 'ABC234' })).st; R.login2 = (await call('L2', 'POST', P + '/login', { sid: 'T0001', code: 'ABC234' })).st;
  R.kicked = (await call('L1', 'GET', P + '/me')).st; R.alive = (await call('L2', 'GET', P + '/me')).st;
  const beat = (s, x = {}) => call('L2', 'POST', P + '/cpl', { kind: 'beat', cls: 'c1', item: 'i1', secs: s, ...x });
  R.badSecs = await beat(61); R.badItem = await beat(5, { item: '!!' }); R.beat = await beat(30); R.beat2 = await beat(60); R.badKind = await call('L2', 'POST', P + '/cpl', { kind: 'x' }); R.anon = (await call('X', 'POST', P + '/cpl', { kind: 'beat', cls: 'c', item: 'i', secs: 5 })).st;
  R.vbad = await call('L2', 'POST', P + '/cpl', { kind: 'verify-start', method: 'x' }); R.vs = await call('L2', 'POST', P + '/cpl', { kind: 'verify-start', method: 'motp' }); R.vwrong = await call('L2', 'POST', P + '/cpl', { kind: 'verify-confirm', method: 'motp', code: '000000' }); R.vok = await call('L2', 'POST', P + '/cpl', { kind: 'verify-confirm', method: 'motp', code: R.vs.j.dev_code });
  R.attBad = await call('L2', 'POST', P + '/cpl', { kind: 'attend', cls: 'c1', code: 'NOPE' }); R.att = await call('L2', 'POST', P + '/cpl', { kind: 'attend', cls: 'c1', code: 'QR1234' }); R.att2 = await call('L2', 'POST', P + '/cpl', { kind: 'attend', cls: 'c1', code: 'QR1234' });
  R.sum = await call('A', 'GET', '/api/cpl/summary'); R.logs = await call('A', 'GET', '/api/cpl/logs?sid=T0001&limit=3'); R.sumAnon = (await call('X', 'GET', '/api/cpl/summary')).st; return { R, tid };
}
(async () => {
  const a = await run(A, 'node'), b = await run(B, 'java');
  for (const k of Object.keys(a.R)) { const x = a.R[k], y = b.R[k]; if (typeof x === 'number') { ok(x === y, `${k}: ${x} != ${y}`); continue; } ok(x.st === y.st, `${k} status ${x.st} != ${y.st}`); ok(shape(x.j) === shape(y.j), `${k} shape\n  ${shape(x.j)}\n  ${shape(y.j)}`); if (x.j && x.j.today != null) ok(x.j.today === y.j.today && x.j.max === y.j.max && x.j.over === y.j.over, `${k} values`); if (x.j && x.j.code) ok(x.j.code === y.j.code && x.j.error === y.j.error, `${k} error ${JSON.stringify(x.j)} ${JSON.stringify(y.j)}`); }
  ok(a.R.kicked === 401 && a.R.alive === 200, '동시접속 차단');
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
