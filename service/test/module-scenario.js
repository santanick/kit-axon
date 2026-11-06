'use strict';
/* v31 모듈 분리 시나리오: Node 테스트와 Java 대조에서 함께 쓴다. U = { all, admin, tutor, learner, blocked } */
async function scenario(U) {
  const jar = {}; const call = async (base, who, method, path, body) => {
    const k = base + who; const r = await fetch(U[base] + path, { method, redirect: 'manual', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[k] ? { cookie: jar[k] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[k] = c.split(';')[0]; const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) { }
    return { status: r.status, j, t, loc: r.headers.get('location') };
  };
  const sfx = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const owner = `own${sfx}@a.kr`, teach = `t${sfx}@a.kr`, sub = `s${sfx}@a.kr`; const R = {};
  const su = await call('admin', 'O', 'POST', '/api/signup', { email: owner, password: 'Passw0rd-aaa', orgName: 'M', type: 'voc', code: 'C0DE' }); const tid = su.j.tenant && su.j.tenant.tid; if (!tid) throw new Error('signup ' + JSON.stringify(su.j));
  await call('all', 'O', 'POST', '/api/login', { email: owner, password: 'Passw0rd-aaa' });
  const doc = { org: { name: 'M', type: 'voc', room: { mode: 'dedicated' }, cpl: { on: true, profile: 'moel-entrust', reviewers: ['S0001'] } }, classes: [{ id: 'c1', name: '담당', learners: ['m1'], prog: {} }, { id: 'c2', name: '다른', learners: ['m2'], prog: {} }], members: [{ id: 'm1', sid: 'S0001', name: '가' }, { id: 'm2', sid: 'S0002', name: '나' }], admins: [{ id: 'a1', email: teach, role: 'teacher', classes: ['c1'] }, { id: 'a0', email: owner, role: 'owner', classes: [] }], codes: [{ sid: 'S0001', dept: '1', code: 'ABC234' }, { sid: 'S0002', dept: '1', code: 'ABC235' }], settings: { apiKey: 'x', nested: { token: 'y', ok: 1 }, keep: 1 }, sales: [{ a: 1 }], billing: { a: 1 } };
  const p0 = await call('admin', 'O', 'PUT', '/api/state', { doc, rev: 0 }); R.put0 = p0.status;

  /* 계정 발급 */
  const st = await call('admin', 'O', 'POST', '/api/staff', { email: teach, role: 'teacher' }); R.staff = st.status; const tpw = st.j.password; R.tempPwOk = /^(?=.*[a-zA-Z])(?=.*\d).{10,}$/.test(tpw || '');
  R.staffDup = (await call('admin', 'O', 'POST', '/api/staff', { email: teach, role: 'teacher' })).j; R.staffRole = (await call('admin', 'O', 'POST', '/api/staff', { email: 'x' + sub, role: 'owner' })).j; R.staffMail = (await call('admin', 'O', 'POST', '/api/staff', { email: 'bad', role: 'sub' })).j;
  const ss = await call('admin', 'O', 'POST', '/api/staff', { email: sub, role: 'sub' }); await call('admin', 'S', 'POST', '/api/login', { email: sub, password: ss.j.password }); R.subDenied = (await call('admin', 'S', 'GET', '/api/staff')).j;
  R.staffList = (await call('admin', 'O', 'GET', '/api/staff')).j.rows.map(x => x.role).sort();

  /* 모듈별 로그인 */
  R.ownerOnTutor = (await call('tutor', 'X', 'POST', '/api/login', { email: owner, password: 'Passw0rd-aaa' })); R.ownerOnTutor = { s: R.ownerOnTutor.status, e: R.ownerOnTutor.j.error, m: R.ownerOnTutor.j.message };
  const t0 = await call('admin', 'X', 'POST', '/api/login', { email: teach, password: tpw }); R.teacherOnAdmin = { s: t0.status, e: t0.j.error };
  const t1 = await call('tutor', 'T', 'POST', '/api/login', { email: teach, password: tpw }); R.teacherOnTutor = { s: t1.status, role: t1.j.user && t1.j.user.role };

  /* 교강사 범위 */
  const v = await call('tutor', 'T', 'GET', '/api/state'); R.view = { classes: v.j.doc.classes.map(x => x.id), members: v.j.doc.members.map(x => x.id), admins: v.j.doc.admins.length, codes: v.j.doc.codes, settings: v.j.doc.settings, sales: v.j.doc.sales, billing: v.j.doc.billing };
  const inc = JSON.parse(JSON.stringify(v.j.doc)); inc.classes[0].prog = { m1: { p: 50 } }; inc.classes[0].name = '변조'; inc.classes[0].learners = ['m1', 'm2']; inc.classes.push({ id: 'c2', name: '변조', learners: [] }, { id: 'c9', name: '신규' }); inc.org.name = '변조'; inc.org.cpl = { on: false }; inc.members = []; inc.codes = [];
  const pt = await call('tutor', 'T', 'PUT', '/api/state', { doc: inc, rev: v.j.rev }); R.tutorPut = pt.status;
  const af = (await call('admin', 'O', 'GET', '/api/state')).j; R.after = { org: af.doc.org.name, cplOn: af.doc.org.cpl.on, classes: af.doc.classes.map(x => [x.id, x.name, x.learners.length, x.prog]), members: af.doc.members.length, codes: af.doc.codes.length };
  R.tutorStale = (await call('tutor', 'T', 'PUT', '/api/state', { doc: inc, rev: v.j.rev })).status;

  /* 교강사가 쓸 수 없는 주소 */
  R.tutorBlocked = {}; for (const [m, p] of [['GET', '/api/keys'], ['GET', '/api/staff'], ['GET', '/api/audit'], ['POST', '/api/signup'], ['GET', `/api/pub/${tid}/site`], ['POST', '/mcp']]) R.tutorBlocked[p.replace(tid, 'T')] = (await call('tutor', 'T', m, p, m === 'POST' ? {} : null)).status;
  await call('all', 'T', 'POST', '/api/login', { email: teach, password: tpw });
  R.teacherRole = {}; for (const [m, p] of [['GET', '/api/keys'], ['POST', '/api/keys'], ['GET', '/api/audit'], ['GET', '/api/learners/accounts'], ['GET', '/api/learners/pii-log'], ['POST', '/api/site/benchmark'], ['GET', '/api/staff']]) { const r = await call('all', 'T', m, p, m === 'POST' ? {} : null); R.teacherRole[p] = [r.status, r.j.error]; }

  /* 학습자 모듈과 심사자 */
  R.learnerBlocked = {}; for (const [m, p] of [['POST', '/api/login'], ['GET', '/api/state'], ['GET', '/api/me'], ['POST', '/mcp']]) R.learnerBlocked[p] = (await call('learner', 'L', m, p, m === 'POST' ? {} : null)).status;
  R.cfg = { learner: (await call('learner', 'L', 'GET', '/api/config')).j.module, learnerSignup: (await call('learner', 'L', 'GET', '/api/config')).j.signup, tutor: (await call('tutor', 'T', 'GET', '/api/config')).j.module, adminSignup: (await call('admin', 'O', 'GET', '/api/config')).j.signup, all: (await call('all', 'O', 'GET', '/api/config')).j.module === undefined };
  const l1 = await call('learner', 'L1', 'POST', `/api/pub/${tid}/login`, { sid: 'S0001', code: 'ABC234' }); const l2 = await call('learner', 'L2', 'POST', `/api/pub/${tid}/login`, { sid: 'S0002', code: 'ABC235' }); R.learnerLogin = [l1.status, l2.status];
  const rv = await call('learner', 'L1', 'POST', `/api/pub/${tid}/cpl`, { kind: 'review-skip', evalCd: '00', chasi: 0, cls: 'c1' }); const rn = await call('learner', 'L2', 'POST', `/api/pub/${tid}/cpl`, { kind: 'review-skip', evalCd: '00', cls: 'c2' }); R.review = [rv.status, rn.status, rn.j.error, rn.j.message];
  const lg = (await call('admin', 'O', 'GET', '/api/cpl/logs?sid=S0001&limit=50')).j.rows.filter(x => x.kind === 'review'); R.reviewLog = lg.map(x => [x.kind, x.eval_cd, x.chasi, x.cls]);
  const sum = await call('tutor', 'T', 'GET', '/api/cpl/summary'); await call('learner', 'L2', 'POST', `/api/pub/${tid}/cpl`, { kind: 'noop' }); R.tutorSummary = sum.j.rows.map(x => x.sid).filter(x => x === 'S0002').length; R.tutorLogsOther = (await call('tutor', 'T', 'GET', '/api/cpl/logs?sid=S0002')).j.rows.length;

  /* 화면 */
  const page = async (b, p) => { const r = await call(b, 'P', 'GET', p); return r.status === 302 ? [302, r.loc] : [r.status, /dd-module/.test(r.t)]; };
  R.pages = { tutorRoot: await page('tutor', '/'), tutorIndex: await page('tutor', '/index.html'), tutorLearner: await page('tutor', '/learner.html'), tutorPage: await page('tutor', '/tutor.html'), tutorAsset: (await page('tutor', '/compliance.js'))[0], adminRoot: await page('admin', '/'), adminTutor: await page('admin', '/tutor.html'), adminLearner: await page('admin', '/learner.html'), adminDeploy: await page('admin', '/deploy/index.html'), learnerRoot: await page('learner', '/'), learnerIndex: await page('learner', '/index.html'), learnerPage: (await page('learner', '/learner.html'))[0], allIndex: (await page('all', '/index.html'))[0] };

  /* 접속 IP 제한 */
  R.ip = { root: (await call('blocked', 'B', 'GET', '/')).status, me: (await call('blocked', 'B', 'GET', '/api/me')).j.error, login: (await call('blocked', 'B', 'POST', '/api/login', { email: owner, password: 'Passw0rd-aaa' })).status, health: (await call('blocked', 'B', 'GET', '/api/health')).status };

  /* 비밀번호 변경, 계정 삭제 */
  R.pwBad = (await call('tutor', 'T', 'POST', '/api/password', { current: 'wrong', next: 'Newpass1234' })).j.error; R.pwWeak = (await call('tutor', 'T', 'POST', '/api/password', { current: tpw, next: 'short' })).j.error; R.pwOk = (await call('tutor', 'T', 'POST', '/api/password', { current: tpw, next: 'Newpass1234' })).status;
  R.afterPw = [(await call('tutor', 'Y', 'POST', '/api/login', { email: teach, password: tpw })).status, (await call('tutor', 'Y', 'POST', '/api/login', { email: teach, password: 'Newpass1234' })).status, (await call('tutor', 'T', 'GET', '/api/me')).status];
  R.removeOwner = (await call('admin', 'O', 'POST', '/api/staff/remove', { email: owner })).j.error; R.remove = (await call('admin', 'O', 'POST', '/api/staff/remove', { email: teach })).status; R.afterRemove = [(await call('tutor', 'Y', 'GET', '/api/me')).status, (await call('tutor', 'Z', 'POST', '/api/login', { email: teach, password: 'Newpass1234' })).status];
  return R;
}
module.exports = { scenario };
