'use strict';
/* v31 모듈 분리 · 교강사 범위 · 심사자 · IP 제한 */
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const { scenario } = require('./module-scenario'); const M = require('../server/modules');

test('IP 허용 규칙', () => {
  assert.ok(M.ipAllowed([], '1.2.3.4')); assert.ok(M.ipAllowed(['1.2.3.4'], '1.2.3.4')); assert.ok(M.ipAllowed(['1.2.3.4'], '::ffff:1.2.3.4')); assert.ok(!M.ipAllowed(['1.2.3.4'], '1.2.3.5'));
  assert.ok(M.ipAllowed(['10.0.0.0/8'], '10.9.8.7')); assert.ok(!M.ipAllowed(['10.0.0.0/8'], '11.0.0.1')); assert.ok(M.ipAllowed(['192.168.1.128/25'], '192.168.1.200')); assert.ok(!M.ipAllowed(['192.168.1.128/25'], '192.168.1.5')); assert.ok(M.ipAllowed(['2001:db8::1'], '2001:DB8::1')); assert.ok(!M.ipAllowed(['bad/99'], '1.2.3.4'));
  assert.throws(() => M.moduleOf({ MODULE: 'x' }));
});

test('모듈 분리', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mod-')); fs.mkdirSync(path.join(dir, 'deploy'));
  for (const f of ['index.html', 'learner.html', 'deploy/index.html', 'compliance.js']) fs.writeFileSync(path.join(dir, f), 'x'); fs.writeFileSync(path.join(dir, 'tutor.html'), '<meta name="dd-module" content="tutor">');
  const pool = poolFrom(process.env); await migrate(pool); const base = { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', TRUST_PROXY_HOPS: '0', LEARNER_TID: 'tn_demo' }; const U = {}; const apps = [];
  for (const [k, env] of Object.entries({ all: {}, admin: { MODULE: 'admin' }, tutor: { MODULE: 'tutor' }, learner: { MODULE: 'learner' }, blocked: { MODULE: 'admin', ADMIN_IPS: '10.0.0.1,172.16.0.0/12' } })) { const app = createApp({ pool, env: { ...base, ...env }, log: {}, publicDir: dir }); await new Promise(ok => app.listen(0, ok)); apps.push(app); U[k] = `http://127.0.0.1:${app.address().port}`; }
  try {
    const R = await scenario(U);
    assert.equal(R.put0, 200); assert.equal(R.staff, 200); assert.ok(R.tempPwOk); assert.equal(R.staffDup.error, 'exists'); assert.equal(R.staffRole.error, 'staff_role'); assert.equal(R.staffMail.error, 'email'); assert.equal(R.subDenied.error, 'role'); assert.deepEqual(R.staffList, ['owner', 'sub', 'teacher']);
    assert.deepEqual(R.ownerOnTutor, { s: 403, e: 'module', m: '이 주소로 로그인할 수 없는 계정입니다.' }); assert.deepEqual(R.teacherOnAdmin, { s: 403, e: 'module' }); assert.deepEqual(R.teacherOnTutor, { s: 200, role: 'teacher' });
    assert.deepEqual(R.view, { classes: ['c1'], members: ['m1'], admins: 1, codes: [], settings: { nested: { ok: 1 }, keep: 1 }, sales: [], billing: { a: null } });
    assert.equal(R.tutorPut, 200); assert.deepEqual(R.after, { org: 'M', cplOn: true, classes: [['c1', '담당', 1, { m1: { p: 50 } }], ['c2', '다른', 1, {}]], members: 2, codes: 2 }); assert.equal(R.tutorStale, 409);
    assert.ok(Object.values(R.tutorBlocked).every(s => s === 404), JSON.stringify(R.tutorBlocked));
    assert.deepEqual(R.teacherRole['/api/keys'], [403, 'teacher']); assert.deepEqual(R.teacherRole['/api/audit'], [403, 'teacher']); assert.deepEqual(R.teacherRole['/api/learners/accounts'], [403, 'teacher']); assert.deepEqual(R.teacherRole['/api/staff'], [403, 'role']);
    assert.ok(Object.values(R.learnerBlocked).every(s => s === 404), JSON.stringify(R.learnerBlocked));
    assert.deepEqual(R.cfg, { learner: 'learner', learnerSignup: false, tutor: 'tutor', adminSignup: true, all: true }); assert.deepEqual(R.learnerLogin, [200, 200]);
    assert.deepEqual(R.review, [200, 403, 'reviewer', '심사자로 지정된 계정이 아닙니다.']); assert.deepEqual(R.reviewLog, [['review', '00', 0, 'c1']]); assert.equal(R.tutorSummary, 0); assert.equal(R.tutorLogsOther, 0);
    assert.deepEqual(R.pages.tutorRoot, [200, true]); assert.equal(R.pages.tutorIndex[0], 404); assert.equal(R.pages.tutorLearner[0], 404); assert.deepEqual(R.pages.tutorPage, [200, true]); assert.equal(R.pages.tutorAsset, 200); assert.deepEqual(R.pages.adminRoot, [200, false]); assert.equal(R.pages.adminTutor[0], 404); assert.equal(R.pages.adminLearner[0], 404); assert.equal(R.pages.adminDeploy[0], 404); assert.deepEqual(R.pages.learnerRoot, [302, '/learner.html?t=tn_demo']); assert.equal(R.pages.learnerIndex[0], 404); assert.equal(R.pages.learnerPage, 200); assert.equal(R.pages.allIndex, 200);
    assert.deepEqual(R.ip, { root: 403, me: 'ip', login: 403, health: 200 });
    assert.equal(R.pwBad, 'login'); assert.equal(R.pwWeak, 'password'); assert.equal(R.pwOk, 200); assert.deepEqual(R.afterPw, [401, 200, 200]); assert.equal(R.removeOwner, 'staff_missing'); assert.equal(R.remove, 200); assert.deepEqual(R.afterRemove, [401, 401]);
  } finally { apps.forEach(a => a.close()); await pool.end(); }
});
