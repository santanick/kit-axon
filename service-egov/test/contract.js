'use strict';
/* 디디쌤 /api 규격 대조 테스트 — Node 서버와 전자정부 표준프레임워크(Java) 서버를 같은 DB에 띄우고
   ① 같은 시나리오를 양쪽에 돌려 상태코드 · 응답 형태 · 오류 코드 · 보안 헤더가 같은지
   ② 한쪽에서 만든 계정 · 세션 · 상태를 다른 쪽이 그대로 쓰는지(scrypt · 세션 해시 · RLS 호환) 확인한다.
   사용: node test/contract.js http://127.0.0.1:8091 http://127.0.0.1:8090 */
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8091', process.argv[3] || 'http://127.0.0.1:8090'];
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };

async function call(base, method, path, { body, cookie, csrf = true, origin, raw } = {}) {
  const h = {}; if (csrf && method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (origin) h.origin = origin;
  if (body !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(base + path, { method, headers: h, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  const sc = r.headers.get('set-cookie'); const ck = sc ? sc.split(';')[0] : null;
  return { st: r.status, j, h: r.headers, ck, sc };
}
const shape = v => v === null ? 'null' : Array.isArray(v) ? '[' + (v.length ? shape(v[0]) : '') + ']' : typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => k + ':' + shape(v[k])).join(',') + '}' : typeof v;
const HDR = ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'x-permitted-cross-domain-policies', 'origin-agent-cluster', 'cache-control'];

async function scenario(base, tag) {
  const R = {}; const em = `ct_${tag}_${Date.now()}@example.com`; const pw = 'Contract2026x';
  R.health = await call(base, 'GET', '/api/health');
  R.config = await call(base, 'GET', '/api/config');
  R.nf = await call(base, 'GET', '/api/nope');
  R.nfPost = await call(base, 'POST', '/api/nope', { body: {}, csrf: false });
  R.wrongMethod = await call(base, 'GET', '/api/login');
  R.csrf = await call(base, 'POST', '/api/login', { body: { email: em, password: pw }, csrf: false });
  R.origin = await call(base, 'POST', '/api/login', { body: { email: em, password: pw }, origin: 'https://evil.example' });
  R.badJson = await call(base, 'POST', '/api/signup', { raw: '{bad', body: undefined });
  R.badEmail = await call(base, 'POST', '/api/signup', { body: { email: 'x', password: pw, orgName: '대조', type: 'univ' } });
  R.badPw = await call(base, 'POST', '/api/signup', { body: { email: em, password: 'short1', orgName: '대조', type: 'univ' } });
  R.badName = await call(base, 'POST', '/api/signup', { body: { email: em, password: pw, orgName: '', type: 'univ' } });
  R.badType = await call(base, 'POST', '/api/signup', { body: { email: em, password: pw, orgName: '대조', type: 'academy' } });
  R.signup = await call(base, 'POST', '/api/signup', { body: { email: em.toUpperCase(), password: pw, orgName: '대조 대학교', type: 'univ' } });
  const ck = R.signup.ck;
  R.dup = await call(base, 'POST', '/api/signup', { body: { email: em, password: pw, orgName: '대조2', type: 'corp' } });
  R.me = await call(base, 'GET', '/api/me', { cookie: ck });
  R.meNo = await call(base, 'GET', '/api/me');
  R.st0 = await call(base, 'GET', '/api/state', { cookie: ck });
  R.putBad = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc: { x: 1 }, rev: 0 } });
  R.putX = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc: { org: { name: '대조 대학교', room: { tid: 'tn_other00000' } } }, rev: 0 } });
  const doc = { org: { name: '대조 대학교', type: 'univ', ed: 'lms', room: { mode: 'saas' } }, codes: [{ sid: '20261234', code: 'ab12cd', dept: '컴퓨터공학과' }, { sid: 'x', code: 'zz' }], note: '한글 ✓ "quote"' };
  R.put1 = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc, rev: 0 } });
  R.put1again = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc, rev: 0 } });
  R.put2 = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc, rev: 1 } });
  R.putStale = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc, rev: 1 } });
  R.st2 = await call(base, 'GET', '/api/state', { cookie: ck });
  R.loginBad = await call(base, 'POST', '/api/login', { body: { email: em, password: 'Wrong20260x' } });
  R.login = await call(base, 'POST', '/api/login', { body: { email: em, password: pw } });
  R.logout = await call(base, 'POST', '/api/logout', { cookie: R.login.ck });
  R.meAfter = await call(base, 'GET', '/api/me', { cookie: R.login.ck });
  R.static = await call(base, 'GET', '/');
  return { R, em, pw, ck };
}

(async () => {
  const [a, b] = [await scenario(A, 'n'), await scenario(B, 'j')];
  /* ① 같은 규격 */
  for (const k of Object.keys(a.R)) {
    const x = a.R[k], y = b.R[k];
    ok(x.st === y.st, `${k}: 상태코드 Node ${x.st} ≠ Java ${y.st}`);
    if (k === 'static') continue;
    ok(shape(x.j) === shape(y.j), `${k}: 응답 형태 다름\n   N ${shape(x.j)}\n   J ${shape(y.j)}`);
    if (x.j && x.j.error) ok(x.j.error === (y.j && y.j.error) && x.j.message === y.j.message, `${k}: 오류 코드/문구 다름 N ${x.j.error}/${x.j.message} J ${y.j && y.j.error}/${y.j && y.j.message}`);
    for (const hk of HDR) ok(x.h.get(hk) === y.h.get(hk), `${k}: 헤더 ${hk} N ${x.h.get(hk)} J ${y.h.get(hk)}`);
  }
  for (const k of ['signup', 'login', 'logout']) ok(a.R[k].sc.replace(/=[^;]*;/, '=;') === b.R[k].sc.replace(/=[^;]*;/, '=;'), `${k}: set-cookie 속성 다름 N ${a.R[k].sc} J ${b.R[k].sc}`);
  ok(a.R.static.h.get('content-security-policy') === b.R.static.h.get('content-security-policy'), 'static: CSP 다름');
  /* 기대값 자체 */
  const E = { health: 200, nf: 404, nfPost: 404, wrongMethod: 404, csrf: 403, origin: 403, badJson: 400, badEmail: 400, badPw: 400, badName: 400, badType: 400, signup: 200, dup: 409, me: 200, meNo: 401, st0: 200, putBad: 400, putX: 403, put1: 200, put1again: 409, put2: 200, putStale: 409, st2: 200, loginBad: 401, login: 200, logout: 200, meAfter: 401 };
  for (const [k, s] of Object.entries(E)) ok(b.R[k].st === s, `Java ${k}: 기대 ${s} 실제 ${b.R[k].st}`);
  ok(b.R.st2.j && b.R.st2.j.rev === 2 && b.R.st2.j.doc.note === '한글 ✓ "quote"' && b.R.st2.j.doc.org.room.tid === b.R.signup.j.tenant.tid, 'Java 상태 저장 · 기관 tid 고정');
  ok(b.R.signup.j.user.email === b.em, 'Java 이메일 소문자 정규화');
  ok(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(b.R.st2.j.at || ''), 'Java at 형식(ISO, ms, Z)');

  /* ② 서버 간 호환 */
  const nLoginOnJ = await call(B, 'POST', '/api/login', { body: { email: a.em, password: a.pw } });
  ok(nLoginOnJ.st === 200 && nLoginOnJ.j.tenant.tid === a.R.signup.j.tenant.tid, 'Node에서 가입 → Java 로그인(scrypt 호환)');
  const jLoginOnN = await call(A, 'POST', '/api/login', { body: { email: b.em, password: b.pw } });
  ok(jLoginOnN.st === 200 && jLoginOnN.j.tenant.tid === b.R.signup.j.tenant.tid, 'Java에서 가입 → Node 로그인(scrypt 호환)');
  const jSessOnN = await call(A, 'GET', '/api/me', { cookie: nLoginOnJ.ck });
  ok(jSessOnN.st === 200 && jSessOnN.j.user.email === a.em, 'Java 세션 쿠키 → Node /api/me');
  const nSessOnJ = await call(B, 'GET', '/api/state', { cookie: jLoginOnN.ck });
  ok(nSessOnJ.st === 200 && nSessOnJ.j.rev === 2, 'Node 세션 쿠키 → Java /api/state(같은 데이터)');
  const cross = await call(B, 'PUT', '/api/state', { cookie: nLoginOnJ.ck, body: { doc: { org: { name: 'x', room: { tid: b.R.signup.j.tenant.tid } } }, rev: 2 } });
  ok(cross.st === 403 && cross.j.error === 'tenant', 'Java: 다른 기관 tid로 저장 거부(403 tenant)');
  const jWrite = await call(B, 'PUT', '/api/state', { cookie: nLoginOnJ.ck, body: { doc: { org: { name: '대조 대학교', room: { mode: 'saas' } }, v: 'java' }, rev: 2 } });
  const nRead = await call(A, 'GET', '/api/state', { cookie: jLoginOnN.ck.replace(/.*/, jLoginOnN.ck) });
  const nReadA = await call(A, 'GET', '/api/state', { cookie: (await call(A, 'POST', '/api/login', { body: { email: a.em, password: a.pw } })).ck });
  ok(jWrite.st === 200 && jWrite.j.rev === 3 && nReadA.j.rev === 3 && nReadA.j.doc.v === 'java', 'Java 저장 → Node 조회(rev 3)');
  const stale = await call(A, 'PUT', '/api/state', { cookie: nLoginOnJ.ck, body: { doc: { org: { name: 'x' } }, rev: 2 } });
  ok(stale.st === 409 && stale.j.error === 'conflict', '서버 간 낙관적 잠금(rev 2로 Node 저장 → 409)');
  ok(nRead.st === 200, 'Node 조회(Java 가입 기관)');

  /* ③ Java 전용: JSP 진입 화면(서버 렌더링) · 표준프레임워크 업무 예외 문구 */
  const jx = await call(B, 'POST', '/api/signup', { body: { email: `jsp_${Date.now()}@example.com`, password: 'Contract2026x', orgName: '<b>대학</b>', type: 'univ' } });
  const jm = await fetch(B + '/egov/main.do', { headers: { cookie: jx.ck } }); const jt = await jm.text();
  ok(jm.status === 200 && jt.includes('&lt;b&gt;대학&lt;/b&gt;') && !jt.includes('<b>대학</b>'), 'JSP 진입 화면: 로그인 기관 표시 + HTML 이스케이프');
  ok((jm.headers.get('content-security-policy') || '').startsWith("default-src 'self'"), 'JSP 진입 화면: CSP');
  const jn = await (await fetch(B + '/egov/main.do')).text();
  ok(jn.includes('로그인이 필요합니다'), 'JSP 진입 화면: 비로그인 안내');
  console.log(`대조 테스트: 통과 ${pass} / 실패 ${fail}`);
  if (fail) { console.log(errs.map(e => ' ✗ ' + e).join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
