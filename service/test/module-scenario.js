'use strict';
/* v31 모듈 분리 시나리오: Node 테스트와 Java 대조에서 함께 쓴다. U = { all, admin, tutor, learner, blocked } */
async function scenario(U, opts = {}) {
  const jar = {}; const call = async (base, who, method, path, body) => {
    const k = base + who; const r = await fetch(U[base] + path, { method, redirect: 'manual', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[k] ? { cookie: jar[k] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[k] = c.split(';')[0]; const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) { }
    return { status: r.status, j, t, loc: r.headers.get('location') };
  };
  const sfx = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const owner = `own${sfx}@a.kr`, teach = `t${sfx}@a.kr`, sub = `s${sfx}@a.kr`; const R = {};
  const su = await call('admin', 'O', 'POST', '/api/signup', { email: owner, password: 'Passw0rd-aaa', orgName: 'M', type: 'voc', code: 'C0DE' }); const tid = su.j.tenant && su.j.tenant.tid; if (!tid) throw new Error('signup ' + JSON.stringify(su.j));
  await call('all', 'O', 'POST', '/api/login', { email: owner, password: 'Passw0rd-aaa' });
  const doc = { org: { name: 'M', type: 'voc', room: { mode: 'dedicated' }, cpl: { on: true, profile: 'moel-entrust', reviewers: ['S0001'] } }, classes: [{ id: 'c1', name: '담당', learners: ['m1'], prog: {} }, { id: 'c2', name: '다른', learners: ['m2'], prog: {} }], members: [{ id: 'm1', sid: 'S0001', name: '가' }, { id: 'm2', sid: 'S0002', name: '나' }], admins: [{ id: 'a1', email: teach, role: 'teacher', classes: ['c1'] }, { id: 'a0', email: owner, role: 'owner', classes: [] }], codes: [{ sid: 'S0001', dept: '1', code: 'ABC234' }, { sid: 'S0002', dept: '1', code: 'ABC235' }], settings: { apiKey: 'x', nested: { token: 'y', ok: 1 }, keep: 1 }, sales: [{ a: 1 }], billing: { a: 1 }, tq: [{ id: 'q1', sid: 'S0001', q: '담당 질문', cls: 'c1', st: 'open' }, { id: 'q2', sid: 'S0002', q: '다른 질문', cls: 'c2', st: 'open' }] };
  const p0 = await call('admin', 'O', 'PUT', '/api/state', { doc, rev: 0 }); R.put0 = p0.status;

  /* 계정 발급 */
  const st = await call('admin', 'O', 'POST', '/api/staff', { email: teach, role: 'teacher' }); R.staff = st.status; const tpw = st.j.password; R.tempPwOk = /^(?=.*[a-zA-Z])(?=.*\d).{10,}$/.test(tpw || '');
  R.staffDup = (await call('admin', 'O', 'POST', '/api/staff', { email: teach, role: 'teacher' })).j; R.staffRole = (await call('admin', 'O', 'POST', '/api/staff', { email: 'x' + sub, role: 'owner' })).j; R.staffMail = (await call('admin', 'O', 'POST', '/api/staff', { email: 'bad', role: 'sub' })).j;
  const ss = await call('admin', 'O', 'POST', '/api/staff', { email: sub, role: 'sub' }); await call('admin', 'S', 'POST', '/api/login', { email: sub, password: ss.j.password }); R.subTemp = (await call('admin', 'S', 'GET', '/api/staff')).j; await call('admin', 'S', 'POST', '/api/password', { current: ss.j.password, next: 'Subpass12345' }); R.subDenied = (await call('admin', 'S', 'GET', '/api/staff')).j;
  R.staffList = (await call('admin', 'O', 'GET', '/api/staff')).j.rows.map(x => x.role).sort();

  /* 모듈별 로그인 */
  R.ownerOnTutor = (await call('tutor', 'X', 'POST', '/api/login', { email: owner, password: 'Passw0rd-aaa' })); R.ownerOnTutor = { s: R.ownerOnTutor.status, e: R.ownerOnTutor.j.error, m: R.ownerOnTutor.j.message };
  const t0 = await call('admin', 'X', 'POST', '/api/login', { email: teach, password: tpw }); R.teacherOnAdmin = { s: t0.status, e: t0.j.error };
  const t1 = await call('tutor', 'T', 'POST', '/api/login', { email: teach, password: tpw }); R.teacherOnTutor = { s: t1.status, role: t1.j.user && t1.j.user.role };

  /* 임시 비밀번호 */
  R.tempMe = (await call('tutor', 'T', 'GET', '/api/me')).j.user.pwTemp; R.tempState = (await call('tutor', 'T', 'GET', '/api/state')).j; const tpw2 = 'Tutorpass1234'; R.tempChange = (await call('tutor', 'T', 'POST', '/api/password', { current: tpw, next: tpw2 })).status; R.tempAfter = (await call('tutor', 'T', 'GET', '/api/me')).j.user.pwTemp === undefined;
  /* 교강사 범위 */
  const v = await call('tutor', 'T', 'GET', '/api/state'); R.view = { classes: v.j.doc.classes.map(x => x.id), members: v.j.doc.members.map(x => x.id), admins: v.j.doc.admins.length, codes: v.j.doc.codes, settings: v.j.doc.settings, sales: v.j.doc.sales, billing: v.j.doc.billing };
  const inc = JSON.parse(JSON.stringify(v.j.doc)); inc.classes[0].prog = { m1: { p: 50 } }; inc.classes[0].name = '변조'; inc.classes[0].learners = ['m1', 'm2']; inc.classes.push({ id: 'c2', name: '변조', learners: [] }, { id: 'c9', name: '신규' }); R.tqView = v.j.doc.tq.map(x => x.id); inc.tq = [{ id: 'q1', sid: 'X', q: '변조', cls: 'c9', st: 'answered', a: '답변' }, { id: 'q2', a: '변조' }, { id: 'q3', sid: 'S0001', q: '새 질문', cls: 'c1', st: 'open' }, { id: 'q4', sid: 'S0002', q: '범위 밖', cls: 'c2' }]; inc.classes[0].drop = { m1: {} }; inc.org.name = '변조'; inc.org.cpl = { on: false }; inc.members = []; inc.codes = [];
  const pt = await call('tutor', 'T', 'PUT', '/api/state', { doc: inc, rev: v.j.rev }); R.tutorPut = pt.status;
  const af = (await call('admin', 'O', 'GET', '/api/state')).j; R.afterDrop = af.doc.classes[0].drop === undefined; R.afterTq = af.doc.tq.map(x => [x.id, x.sid, x.q, x.cls, x.st, x.a || null]); R.after = { org: af.doc.org.name, cplOn: af.doc.org.cpl.on, classes: af.doc.classes.map(x => [x.id, x.name, x.learners.length, x.prog]), members: af.doc.members.length, codes: af.doc.codes.length };
  R.tutorStale = (await call('tutor', 'T', 'PUT', '/api/state', { doc: inc, rev: v.j.rev })).status;

  /* 교강사가 쓸 수 없는 주소 */
  R.tutorBlocked = {}; for (const [m, p] of [['GET', '/api/keys'], ['GET', '/api/staff'], ['GET', '/api/audit'], ['POST', '/api/signup'], ['GET', `/api/pub/${tid}/site`], ['POST', '/mcp']]) R.tutorBlocked[p.replace(tid, 'T')] = (await call('tutor', 'T', m, p, m === 'POST' ? {} : null)).status;
  await call('all', 'T', 'POST', '/api/login', { email: teach, password: tpw2 });
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
  R.pwBad = (await call('tutor', 'T', 'POST', '/api/password', { current: 'wrong', next: 'Newpass1234' })).j.error; R.pwWeak = (await call('tutor', 'T', 'POST', '/api/password', { current: tpw2, next: 'short' })).j.error; R.pwOk = (await call('tutor', 'T', 'POST', '/api/password', { current: tpw2, next: 'Newpass1234' })).status;
  R.afterPw = [(await call('tutor', 'Y', 'POST', '/api/login', { email: teach, password: tpw2 })).status, (await call('tutor', 'Y', 'POST', '/api/login', { email: teach, password: 'Newpass1234' })).status, (await call('tutor', 'T', 'GET', '/api/me')).status];
  R.removeOwner = (await call('admin', 'O', 'POST', '/api/staff/remove', { email: owner })).j.error; R.remove = (await call('admin', 'O', 'POST', '/api/staff/remove', { email: teach })).status; R.afterRemove = [(await call('tutor', 'Y', 'GET', '/api/me')).status, (await call('tutor', 'Z', 'POST', '/api/login', { email: teach, password: 'Newpass1234' })).status];
  /* 개인정보 암호화 */
  const eo = `enc${sfx}@a.kr`; const e0 = await call('all', 'E', 'POST', '/api/signup', { email: eo, password: 'Passw0rd-aaa', orgName: 'E', type: 'voc', code: 'C0DE' }); const etid = e0.j.tenant.tid;
  const edoc = { org: { name: 'E', type: 'voc', room: { mode: 'saas' } }, classes: [{ id: 'c3', name: 'C', learners: ['m3'], prog: { m3: { p: 10 } } }], members: [{ id: 'm3', name: 'S0003', nick: '닉', email: 'a@b.kr', phone: '010-1111-2222', extra: { 생년월일: '900101', 학번: 'H100' } }], parents: [{ id: 'p1', name: '보호자', phone: '010-3333-4444' }], codes: [{ sid: 'S0003', dept: '1', code: 'ABC999' }] };
  R.encPut = (await call('all', 'E', 'PUT', '/api/state', { doc: edoc, rev: 0 })).status; const eg = (await call('all', 'E', 'GET', '/api/state')).j; R.encGet = { m: eg.doc.members[0], p: eg.doc.parents[0], c: eg.doc.codes[0] };
  if (opts.raw) { const raw = await opts.raw(etid); const m = raw.members[0]; const txt = JSON.stringify(raw); R.encRaw = { name: m.name.startsWith('enc1:'), nick: m.nick.startsWith('enc1:'), email: m.email.startsWith('enc1:'), phone: m.phone.startsWith('enc1:'), extra: String(m.extra).startsWith('enc1:'), parent: raw.parents[0].phone.startsWith('enc1:'), code: raw.codes[0].code.startsWith('enc1:'), id: m.id, leak: ['010-1111-2222', 'a@b.kr', '900101', 'ABC999', '보호자'].some(x => txt.includes(x)) }; }
  const el = await call('all', 'EL', 'POST', `/api/pub/${etid}/login`, { sid: 'S0003', code: 'ABC999' }); R.encLogin = el.status; const em = await call('all', 'EL', 'GET', `/api/pub/${etid}/me`); R.encMine = Object.keys((em.j.mine && em.j.mine.cls) || {});
  const ek = await call('all', 'E', 'POST', '/api/keys', { name: 'k', scope: 'read' }); const mc = await fetch(U.all + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', authorization: 'Bearer ' + (ek.j.key || '') }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_learners', arguments: {} } }) }); const mt = await mc.text(); R.encMcp = { ok: mt.includes('H100'), enc: mt.includes('enc1:') };
  /* 단체가입 최초 로그인 · 중도탈락 · 서술형 베낀 답안 */
  const go = `grp${sfx}@a.kr`; const g0 = await call('all', 'G', 'POST', '/api/signup', { email: go, password: 'Passw0rd-aaa', orgName: 'G', type: 'voc', code: 'C0DE' }); const gt = g0.j.tenant.tid; const pc = a2 => `/api/pub/${gt}/cpl`;
  const gdoc = { org: { name: 'G', type: 'voc', room: { mode: 'dedicated' }, cpl: { on: true, profile: 'moel-self', groupFirst: true, copyThr: 80, dayMax: 8, pass: 0 } }, classes: [{ id: 'c5', name: 'C', learners: ['m5', 'm6', 'm7'], prog: {}, drop: { m7: { at: '2026-11-06', reason: '퇴사' } }, curriculum: [{ id: 'v5', type: 'video' }, { id: 'e5', type: 'exam', time: 30, qs: [{ t: 'essay', q: 'Q', a: '', pts: 10 }] }] }], members: [{ id: 'm5', sid: 'S0005', name: '가' }, { id: 'm6', sid: 'S0006', name: '나' }, { id: 'm7', sid: 'S0007', name: '다' }], codes: [{ sid: 'S0005', dept: '1', code: 'ABC555' }, { sid: 'S0006', dept: '1', code: 'ABC666' }, { sid: 'S0007', dept: '1', code: 'ABC777' }] };
  await call('all', 'G', 'PUT', '/api/state', { doc: gdoc, rev: 0 });
  const lg5 = await call('all', 'G5', 'POST', `/api/pub/${gt}/login`, { sid: 'S0005', code: 'ABC555' }); R.gfMe = lg5.j.me; R.gfBeat = (await call('all', 'G5', 'POST', pc(), { kind: 'beat', secs: 5, cls: 'c5', item: 'v5' })).j.error;
  R.gfWeak = []; for (const pw of ['short1!', 'abcdefgh1', 'abcdefghijkl', '1234567890']) R.gfWeak.push((await call('all', 'G5', 'POST', pc(), { kind: 'group-pw', pw })).j.error);
  const setPw = async (who, pw) => { const st = await call('all', who, 'POST', pc(), { kind: 'verify-start', method: 'phone', evalCd: '00' }); if (st.status === 200) { const cf = await call('all', who, 'POST', pc(), { kind: 'verify-confirm', method: 'phone', evalCd: '00', code: st.j.dev_code }); if (cf.status !== 200) return cf.status; } return (await call('all', who, 'POST', pc(), { kind: 'group-pw', pw })).status; };
  if (opts.dev) R.gfNoVerify = (await call('all', 'G5', 'POST', pc(), { kind: 'group-pw', pw: 'Abcdefg1!' })).j.error;
  R.gfSet = await setPw('G5', 'Abcdefg1!'); R.gfBeatOk = (await call('all', 'G5', 'POST', pc(), { kind: 'beat', secs: 5, cls: 'c5', item: 'v5' })).status;
  R.gfOldCode = (await call('all', 'G5b', 'POST', `/api/pub/${gt}/login`, { sid: 'S0005', code: 'ABC555' })).status; R.gfCase = (await call('all', 'G5b', 'POST', `/api/pub/${gt}/login`, { sid: 'S0005', code: 'ABCDEFG1!' })).status; const g5n = await call('all', 'G5', 'POST', `/api/pub/${gt}/login`, { sid: 'S0005', code: 'Abcdefg1!' }); R.gfNew = [g5n.status, g5n.j.me.groupFirst === undefined];
  const g7 = await call('all', 'G7', 'POST', `/api/pub/${gt}/login`, { sid: 'S0007', code: 'ABC777' }); await setPw('G7', 'Abcdefg7!'); const g7m = await call('all', 'G7', 'GET', `/api/pub/${gt}/me`); R.dropMe = g7m.j.me.dropped; R.dropBeat = (await call('all', 'G7', 'POST', pc(), { kind: 'beat', secs: 5, cls: 'c5', item: 'v5' })).j.error; R.dropExam = (await call('all', 'G7', 'POST', pc(), { kind: 'exam-start', cls: 'c5', item: 'e5' })).j.error; R.g7first = g7.j.me.groupFirst;
  await call('all', 'G6', 'POST', `/api/pub/${gt}/login`, { sid: 'S0006', code: 'ABC666' }); await setPw('G6', 'Abcdefg6!'); const essay = '훈련 과정에서 배운 내용을 실제 업무에 적용하는 방법을 구체적으로 정리하였습니다. 첫째 절차를 확인합니다.';
  for (const [who, txt] of [['G5', essay], ['G6', essay + ' 둘째']]) { const st = await call('all', who, 'POST', pc(), { kind: 'exam-start', cls: 'c5', item: 'e5' }); await call('all', who, 'POST', pc(), { kind: 'exam-submit', attempt: st.j.attempt, ans: { 0: txt } }); }
  const ec = await call('all', 'G', 'GET', '/api/cpl/exam-copy'); R.examCopy = (ec.j.rows || []).map(x => [x.cls, x.item, x.q, x.a, x.b, x.s >= 80]); R.examThr = ec.j.thr;
  /* 비밀번호 변경 */
  R.pwcBad = (await call('all', 'G5', 'POST', pc(), { kind: 'pw-change', cur: 'wrong', pw: 'Abcdefg9!' })).j.error; R.pwcWeak = (await call('all', 'G5', 'POST', pc(), { kind: 'pw-change', cur: 'Abcdefg1!', pw: 'short' })).j.error; R.pwcOk = (await call('all', 'G5', 'POST', pc(), { kind: 'pw-change', cur: 'Abcdefg1!', pw: 'Abcdefg9!' })).status; R.pwcLogin = [(await call('all', 'G5d', 'POST', `/api/pub/${gt}/login`, { sid: 'S0005', code: 'Abcdefg1!' })).status, (await call('all', 'G5d', 'POST', `/api/pub/${gt}/login`, { sid: 'S0005', code: 'Abcdefg9!' })).status]; R.pwSet = (await call('all', 'G5d', 'GET', `/api/pub/${gt}/me`)).j.me.pwSet;
  /* 고용노동부 프로필 가입 시 제3자 제공 동의 */
  R.thirdNo = (await call('all', 'G8', 'POST', `/api/pub/${gt}/signup`, { via: 'email', email: `t${sfx}@b.kr`, nickname: 'n', consent: { tos: true, privacy: true } })).j.error;
  /* 접근코드 재발급 시 초기화 */
  const gs = (await call('all', 'G', 'GET', '/api/state')).j; const nd = JSON.parse(JSON.stringify(gs.doc)); nd.codes.find(x => x.sid === 'S0005').code = 'NEW555'; await call('all', 'G', 'PUT', '/api/state', { doc: nd, rev: gs.rev }); const re5 = await call('all', 'G5c', 'POST', `/api/pub/${gt}/login`, { sid: 'S0005', code: 'NEW555' }); R.reissue = [re5.status, re5.j.me && re5.j.me.groupFirst];
  return R;
}
module.exports = { scenario };
