'use strict';
/* qa7 d3 대조: 운영자 · 기록 화면이 쓰는 /api/staff(목록 · 초대 · 역할 변경 /api/staff/role · 삭제)와 /api/audit · /api/audit/verify
   Node와 Java에 같은 시나리오를 돌려 상태코드 · 오류 코드 · 응답 키 · audit · 세션 종료를 비교한다.
   사용: DATABASE_URL=… node test/contract-staff.js http://127.0.0.1:9987 http://127.0.0.1:9988
   두 서버 환경: . test/env.sh 후 MFA_OFF=0 MFA_DEV=1 SIGNUP_CODE=C0DE */
const { Pool } = require('pg');
const [A, B] = [process.argv[2], process.argv[3]]; const pool = new Pool({ connectionString: process.env.DATABASE_URL }); let fail = 0, pass = 0;
const ok = (c, m, x) => { if (c) pass++; else { fail++; console.error('✗', m, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };

async function run(U, tag) {
  const jars = {}; const call = async (who, method, p, body) => {
    const J = jars[who] || (jars[who] = {});
    const r = await fetch(U + p, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); J[kv.slice(0, i)] = kv.slice(i + 1); }
    const j = await r.json().catch(() => ({})); return { st: r.status, j, err: j.error || j.code || '' };
  };
  const sfx = tag + Date.now().toString(36); const OW = `cs${sfx}@d.kr`, SUB = `ss${sfx}@d.kr`, PW = 'Passw0rd-dev1'; const R = {};
  R.signup = await call('O', 'POST', '/api/signup', { email: OW, password: PW, orgName: 'S' + tag, type: 'k12', code: 'C0DE' });
  R.create = await call('O', 'POST', '/api/staff', { email: SUB, role: 'sub' });
  /* 초대받은 계정 로그인(2단계 devCode) → 세션 보유 */
  const l1 = await call('S', 'POST', '/api/login', { email: SUB, password: R.create.j.password });
  if (l1.j.mfa && l1.j.devCode) await call('S', 'POST', '/api/login/mfa', { ticket: l1.j.ticket, code: l1.j.devCode });
  R.subMe = await call('S', 'GET', '/api/me'); R.subStaff = await call('S', 'GET', '/api/staff'); R.subRole = await call('S', 'POST', '/api/staff/role', { email: SUB, role: 'teacher' }); R.subAudit = await call('S', 'GET', '/api/audit');
  R.badRole = await call('O', 'POST', '/api/staff/role', { email: SUB, role: 'owner' });
  R.missing = await call('O', 'POST', '/api/staff/role', { email: 'nobody' + sfx + '@d.kr', role: 'sub' });
  R.ownerRole = await call('O', 'POST', '/api/staff/role', { email: OW, role: 'sub' });
  R.role = await call('O', 'POST', '/api/staff/role', { email: SUB, role: 'teacher' });
  R.subMeAfter = await call('S', 'GET', '/api/me');
  R.list = await call('O', 'GET', '/api/staff');
  R.audit = await call('O', 'GET', '/api/audit'); R.verify = await call('O', 'GET', '/api/audit/verify');
  R.remove = await call('O', 'POST', '/api/staff/remove', { email: SUB }); R.list2 = await call('O', 'GET', '/api/staff');
  R.db = (await pool.query("select action, detail from audit_log where actor = $1 and action like 'staff.%' order by id", [OW])).rows.map(r => [r.action, typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail]);
  return R;
}
const shape = R => ({
  signup: R.signup.st, create: [R.create.st, Object.keys(R.create.j).sort().join()], subMe: R.subMe.st, subStaff: R.subStaff.st, subRole: R.subRole.st, subAudit: R.subAudit.st,
  badRole: [R.badRole.st, R.badRole.err], missing: [R.missing.st, R.missing.err], ownerRole: [R.ownerRole.st, R.ownerRole.err], role: [R.role.st, Object.keys(R.role.j).sort().join(), R.role.j.role],
  subMeAfter: R.subMeAfter.st, listRole: (R.list.j.rows || []).filter(r => r.role !== 'owner').map(r => r.role).join(), auditActs: (R.audit.j.rows || []).map(r => r.action).filter(a => /^staff\./.test(a)).sort().join(),
  verify: [R.verify.st, !!R.verify.j.ok], remove: R.remove.st, list2: (R.list2.j.rows || []).length, db: R.db.map(([a, d]) => a + ':' + (d.role || '')).join()
});
(async () => {
  const [ra, rb] = [await run(A, 'n'), await run(B, 'j')]; const [a, b] = [shape(ra), shape(rb)];
  for (const [t, s] of [['Node', a], ['Java', b]]) {
    ok(s.signup === 200 && s.create[0] === 200, `${t}: 가입 · 초대`, s);
    ok(s.subMe === 200 && s.subStaff === 403 && s.subRole === 403 && s.subAudit === 403, `${t}: 부운영자는 staff · role · audit 403`, s);
    ok(s.badRole[0] === 400 && s.badRole[1] === 'staff_role', `${t}: 잘못된 역할 400`, s.badRole);
    ok(s.missing[0] === 404 && s.missing[1] === 'staff_missing', `${t}: 없는 계정 404`, s.missing);
    ok(s.ownerRole[0] === 404, `${t}: 정운영자 역할은 바꾸지 않음`, s.ownerRole);
    ok(s.role[0] === 200 && s.role[2] === 'teacher', `${t}: 역할 변경`, s.role);
    ok(s.subMeAfter === 401, `${t}: 역할 바뀐 계정 세션 종료`, s.subMeAfter);
    ok(s.listRole === 'teacher', `${t}: 목록에 바뀐 역할`, s.listRole);
    ok(/staff\.create/.test(s.auditActs) && /staff\.role/.test(s.auditActs) && s.verify[0] === 200 && s.verify[1], `${t}: 감사 기록 · 무결성`, [s.auditActs, s.verify]);
    ok(s.remove === 200 && s.list2 === 1, `${t}: 삭제`, [s.remove, s.list2]);
    ok(s.db === 'staff.create:sub,staff.role:teacher,staff.remove:', `${t}: audit detail`, s.db);
  }
  const ka = JSON.stringify(a), kb = JSON.stringify(b); ok(ka === kb, 'Node = Java 응답 형태', { a, b });
  console.log(`contract-staff: ${pass} 통과 · ${fail} 실패`); await pool.end(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
