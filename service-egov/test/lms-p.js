'use strict';
/* v30 묶음 P 대조 테스트 — 언어 · 접근성 · 강의실 언어 · 업로드 · 임시저장 · 포털 위젯 · 앱 출석(학습자 세션 · 오프라인) · KOCW XML ·
   관리자 2차 로그인(5회 실패 10분 잠금 · 동시 접속 차단 · 최종 접속) · 개인정보 열람 사유 · 데이터 분류/암호화 어댑터 · 부하 결과 · 무들 이관
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddw5 node test/lms-p.js http://127.0.0.1:8241 http://127.0.0.1:8242 */
const path = require('node:path');
const { call, signup, extraUser, learnerCookie, seedAcademic, main } = require('./lms-lmp');
const mbz = require(path.join(__dirname, '../../service/server/lms/tools/moodle-mbz.js'));
const PW = 'LmpTest2026x';
async function scenario(base, tag) {
  const R = {}; const o = await signup(base, tag); const ck = o.ck; const X = await seedAcademic(o.tid);
  const tea = await extraUser(o.tid, 'teacher'); const sub = await extraUser(o.tid, 'sub');
  const lck = await learnerCookie(o.tid, '20261001'); const lck5 = await learnerCookie(o.tid, '20261005'); const lckNo = await learnerCookie(o.tid, '99990000');
  const G = (k, p, c = ck, headers) => call(base, 'GET', p, { cookie: c, headers }).then(r => (R[k] = r));
  const P = (k, p, body, c = ck, headers) => call(base, 'POST', p, { cookie: c, body, headers }).then(r => (R[k] = r));
  R.noAuth = await call(base, 'GET', '/api/lms/p/pref/get');
  R.csrf = await call(base, 'POST', '/api/lms/p/pref/save', { cookie: ck, body: {}, csrf: false });
  /* 언어 · 접근성 */
  await G('pref0', '/api/lms/p/pref/get');
  await P('prefBad', '/api/lms/p/pref/save', { lang: 'fr' });
  await P('pref', '/api/lms/p/pref/save', { lang: 'en', a11y: { hc: true, lg: 1, rm: false, x: 9 } });
  await G('pref1', '/api/lms/p/pref/get');
  await P('clsLang', '/api/lms/p/cls/lang', { section_id: X.sec[1], lang: 'zh' });
  await P('clsLangBad', '/api/lms/p/cls/lang', { section_id: X.sec[1], lang: 'xx' });
  await G('clsLangs', '/api/lms/p/cls/langs');
  /* 업로드 · 에디터 */
  await P('upBad', '/api/lms/p/upload/add', { name: 'a.zip', size: 'big' });
  await P('upBig', '/api/lms/p/upload/add', { name: 'a.mp4', size: 6e9 });
  await P('up', '/api/lms/p/upload/add', { name: '과제묶음.zip', size: 20480, mime: 'application/zip', sha256: 'a'.repeat(64), entries: [{ name: 'src/main.c', size: 1200 }, { name: 'README.md', size: 300 }] });
  await G('upRecent', '/api/lms/p/upload/recent');
  await P('draft', '/api/lms/p/draft/save', { doc_key: 'notice:new', body: '수식 $E=mc^2$ 와 $$\\frac{a}{b}$$' });
  await G('draftGet', '/api/lms/p/draft/get?doc_key=notice:new');
  await G('draftNone', '/api/lms/p/draft/get?doc_key=none');
  /* 포털 */
  await P('widgetBad', '/api/lms/p/widget/save', { layout: ['hack'] });
  await P('widget', '/api/lms/p/widget/save', { layout: ['due', 'courses', 'advisees'] });
  await G('portal', '/api/lms/p/portal');
  /* 앱 출석 */
  await P('openTea', '/api/lms/p/att/open', { session_id: X.ses[1], minutes: 5 }, tea.ck);
  await P('openNo', '/api/lms/p/att/open', { session_id: '00000000-0000-0000-0000-000000000000' });
  await P('open', '/api/lms/p/att/open', { session_id: X.ses[2], minutes: 10 });
  const code = R.open.j.code;
  R.ckOp = await call(base, 'POST', '/api/lms/p/att/checkin', { cookie: ck, body: { session_id: X.ses[2], code } });
  await P('ckBad', '/api/lms/p/att/checkin', { session_id: X.ses[2], code: '000000' === code ? '111111' : '000000' }, lck);
  await P('ckNotEnr', '/api/lms/p/att/checkin', { session_id: X.ses[2], code }, lck5);
  await P('ckNoPerson', '/api/lms/p/att/checkin', { session_id: X.ses[2], code }, lckNo);
  await P('ck', '/api/lms/p/att/checkin', { session_id: X.ses[2], code }, lck);
  await P('ckOffline', '/api/lms/p/att/checkin', { items: [{ session_id: X.ses[2], code, offline_at: new Date(Date.now() - 60e3).toISOString() }, { session_id: X.ses[1], code }, { session_id: X.ses[2], code, offline_at: '2020-01-01T00:00:00Z' }] }, lck);
  await G('board', `/api/lms/p/att/board?session_id=${X.ses[2]}`);
  await G('boardTea', `/api/lms/p/att/board?session_id=${X.ses[2]}`, tea.ck);
  /* KOCW */
  await G('kocwTea', '/api/lms/p/kocw', tea.ck);
  await G('kocw', '/api/lms/p/kocw?term_id=2026-2');
  /* 관리자 2차 로그인 */
  await P('admTea', '/api/lms/p/admin/login', { password: PW }, tea.ck);
  for (let i = 1; i <= 2; i++) await P('admFail' + i, '/api/lms/p/admin/login', { password: 'Wrong2026x', pw_ok: true });
  await P('adm', '/api/lms/p/admin/login', { password: PW });
  const tok = R.adm.j && R.adm.j.token;
  await G('admStatus', '/api/lms/p/admin/status', ck, { 'x-lms-admin': tok });
  await P('admConc', '/api/lms/p/admin/login', { password: PW });
  await P('admForce', '/api/lms/p/admin/login', { password: PW, force: true });
  await G('admOld', '/api/lms/p/admin/status', ck, { 'x-lms-admin': tok });
  await G('admNew', '/api/lms/p/admin/status', ck, { 'x-lms-admin': R.admForce.j && R.admForce.j.token });
  await P('admOut', '/api/lms/p/admin/logout', {}, ck, { 'x-lms-admin': R.admForce.j && R.admForce.j.token });
  for (let i = 1; i <= 6; i++) await P('lock' + i, '/api/lms/p/admin/login', { password: 'Wrong2026x' }, sub.ck);
  await G('lockStatus', '/api/lms/p/admin/status', sub.ck);
  /* 개인정보 열람 */
  await P('piiBad', '/api/lms/p/pii/view', { target: '20261001', fields: ['name'], reason_code: 'fun' });
  await P('piiOther', '/api/lms/p/pii/view', { target: '20261001', fields: ['name'], reason_code: 'other', reason_text: '짧' });
  await P('piiField', '/api/lms/p/pii/view', { target: '20261001', fields: ['ssn'], reason_code: 'grade' });
  await P('piiNo', '/api/lms/p/pii/view', { target: '00000000', fields: ['name'], reason_code: 'grade' });
  await P('pii1', '/api/lms/p/pii/view', { target: '20261001', fields: ['name', 'phone'], reason_code: 'counsel', reason_text: '학업 상담 연락' });
  await P('pii2', '/api/lms/p/pii/view', { target: '20261002', fields: ['email'], reason_code: 'grade' }, tea.ck);
  await G('piiStats', '/api/lms/p/pii/stats');
  await G('piiStatsTea', '/api/lms/p/pii/stats', tea.ck);
  /* 암호화 · 분류 */
  await G('crypto', '/api/lms/p/crypto/status');
  await P('classBad', '/api/lms/p/crypto/class_save', { item: '성적', location: 'x', grade: 'pii', method: 'rot13' });
  await P('classSave', '/api/lms/p/crypto/class_save', { item: '상담 기록', location: 'lms_consult.body', grade: 'sensitive', method: 'aria_two_way', module: '검증필 모듈 연결 지점' });
  /* 부하 결과 · 무들 이관 */
  await P('perfBad', '/api/lms/p/perf/save', { name: 'x', result: [1] });
  await P('perf', '/api/lms/p/perf/save', { name: '출석 피크', params: { users: 300 }, result: { p95_ms: 120, errors: 0 } });
  await G('perfList', '/api/lms/p/perf/list');
  const payload = mbz.toPayload(mbz.openMbz(mbz.sample()), 'sample.mbz');
  await P('migBad', '/api/lms/p/mig/import', { users: [] });
  await P('migTea', '/api/lms/p/mig/import', payload, tea.ck);
  await P('mig', '/api/lms/p/mig/import', payload);
  await P('migAgain', '/api/lms/p/mig/import', payload);
  await G('migRuns', '/api/lms/p/mig/runs');
  await G('migVideos', '/api/lms/p/mig/videos');
  await P('seed', '/api/lms/p/demo/seed', {});
  return R;
}
main('묶음 P', scenario, { noAuth: 401, csrf: 403, pref0: 200, prefBad: 400, pref: 200, clsLang: 200, clsLangBad: 400, upBad: 400, upBig: 413, up: 200, draft: 200, widgetBad: 400, widget: 200, portal: 200,
  openTea: 200, openNo: 404, open: 200, ckOp: 401, ckBad: 400, ckNotEnr: 403, ckNoPerson: 404, ck: 200, ckOffline: 200, board: 200, kocwTea: 403, kocw: 200,
  admTea: 403, admFail1: 401, admFail2: 401, adm: 200, admStatus: 200, admConc: 409, admForce: 200, admOut: 200, lock4: 401, lock5: 423, lock6: 423, lockStatus: 200,
  piiBad: 400, piiOther: 400, piiField: 400, piiNo: 404, pii1: 200, pii2: 200, piiStats: 200, piiStatsTea: 403, crypto: 200, classBad: 400, classSave: 200, perfBad: 400, perf: 200, migBad: 400, migTea: 403, mig: 200, migAgain: 200, migRuns: 200, seed: 200 }, ['open', 'openTea']);
