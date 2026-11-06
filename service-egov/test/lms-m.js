'use strict';
/* v30 묶음 M 대조 테스트 — 사용자 관리 · 사용자 전환(감사 · 시간 제한) · 접속 로그 · 통계 · 로그 검색 · 팝업/배너 · 시스템 모니터링
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddw5 node test/lms-m.js http://127.0.0.1:8241 http://127.0.0.1:8242 */
const { call, signup, extraUser, seedAcademic, main } = require('./lms-lmp');
const UA = { pc: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0 Safari/537.36', mob: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', edge: 'Mozilla/5.0 (Windows NT 10.0) Chrome/141.0 Safari/537.36 Edg/141.0', tab: 'Mozilla/5.0 (iPad; CPU OS 18_0) Safari/604.1' };
async function scenario(base, tag) {
  const R = {}; const o = await signup(base, tag); const ck = o.ck; const X = await seedAcademic(o.tid);
  const tea = await extraUser(o.tid, 'teacher'); const sub = await extraUser(o.tid, 'sub');
  const G = (k, p, c = ck) => call(base, 'GET', p, { cookie: c }).then(r => (R[k] = r));
  const P = (k, p, body, c = ck, headers) => call(base, 'POST', p, { cookie: c, body, headers }).then(r => (R[k] = r));
  R.noAuth = await call(base, 'GET', '/api/lms/m/users/list');
  R.csrf = await call(base, 'POST', '/api/lms/m/users/save', { cookie: ck, body: {}, csrf: false });
  await G('listTea', '/api/lms/m/users/list', tea.ck);
  await P('hit1', '/api/lms/m/access/hit', { kind: 'login', path: '/' }, ck, { 'user-agent': UA.pc });
  await P('hit2', '/api/lms/m/access/hit', { kind: 'view', path: '/class', section_id: X.sec[0] }, ck, { 'user-agent': UA.mob });
  await P('hit3', '/api/lms/m/access/hit', { kind: 'upload', path: '/upload', section_id: X.sec[0], bytes: 1048576 }, tea.ck, { 'user-agent': UA.edge });
  await P('hit4', '/api/lms/m/access/hit', { kind: 'view', path: '/x', section_id: X.sec[1] }, sub.ck, { 'user-agent': UA.tab });
  await P('hitBad', '/api/lms/m/access/hit', { kind: 'hack' });
  await G('list', '/api/lms/m/users/list');
  await G('listQ', '/api/lms/m/users/list?q=CSE&kind=student');
  await G('listPage', '/api/lms/m/users/list?page=x');
  await G('get', '/api/lms/m/users/get?member_no=20261001');
  await G('getNo', '/api/lms/m/users/get?member_no=00000000');
  await P('saveBad', '/api/lms/m/users/save', { member_no: 'a!' });
  await P('savePii', '/api/lms/m/users/save', { member_no: '20269999', name: '홍길동' });
  await P('saveKind', '/api/lms/m/users/save', { member_no: '20269999', kind: 'alien' });
  await P('save', '/api/lms/m/users/save', { member_no: '20269999', kind: 'external', unit_code: 'CSE', grade_year: 1 });
  await P('saveUpd', '/api/lms/m/users/save', { member_no: '20269999', kind: 'external', unit_code: 'BUS', status: 'leave' });
  await P('control', '/api/lms/m/users/control', { member_no: '20261002', blocked: true, reason: '부정 접속 의심', until: '2099-01-01' });
  await G('listAfter', '/api/lms/m/users/list?q=2026100');
  /* 사용자 전환 */
  await P('impSub', '/api/lms/m/imp/start', { member_no: '20261001', reason: '수강 화면 문의 확인' }, sub.ck);
  await P('impShort', '/api/lms/m/imp/start', { member_no: '20261001', reason: '확인' });
  await P('impNo', '/api/lms/m/imp/start', { member_no: '00000000', reason: '수강 화면 문의 확인' });
  await P('imp', '/api/lms/m/imp/start', { member_no: '20261001', reason: '수강 화면 문의 확인', minutes: 99 });
  await G('impCur', '/api/lms/m/imp/current');
  await P('hitImp', '/api/lms/m/access/hit', { kind: 'view', path: '/my' }, ck, { 'user-agent': UA.pc });
  await P('impEnd', '/api/lms/m/imp/end', {});
  await P('impEnd2', '/api/lms/m/imp/end', {});
  await G('get2', '/api/lms/m/users/get?member_no=20261001');
  /* 통계 · 로그 */
  await G('stats', '/api/lms/m/stats');
  await G('statsPast', '/api/lms/m/stats?from=2020-01-01&to=2020-02-01');
  await G('statsBad', '/api/lms/m/stats?from=2020-01-01&to=2026-01-01');
  await G('logs', '/api/lms/m/logs');
  await G('logsImp', '/api/lms/m/logs?kind=admin');
  await G('logsUp', '/api/lms/m/logs?kind=upload');
  await G('logsBad', '/api/lms/m/logs?kind=xx');
  /* 팝업 · 배너 */
  await P('popBad', '/api/lms/m/popup/save', { kind: 'toast', title: 'x' });
  await P('popLink', '/api/lms/m/popup/save', { kind: 'banner', title: 'x', link: 'javascript:alert(1)' });
  await P('popAud', '/api/lms/m/popup/save', { kind: 'banner', title: 'x', audience: ['alien'] });
  await P('pop1', '/api/lms/m/popup/save', { kind: 'popup', group_key: 'g26', title: '수강 정정 안내', body: '11월 10일까지', audience: ['student'], sort: 1 });
  await P('pop2', '/api/lms/m/popup/save', { kind: 'popup', group_key: 'g26', title: '중간 강의평가', audience: ['student', 'professor'], sort: 2 });
  await P('ban1', '/api/lms/m/popup/save', { kind: 'banner', title: '도서관 연장 운영', link: '/library', audience: ['student', 'staff'] });
  await P('ban2', '/api/lms/m/popup/save', { kind: 'banner', title: '교수 연수', audience: ['professor'], ends_at: '2099-12-31' });
  await P('popUpd', '/api/lms/m/popup/save', { id: R.ban2.j.item.id, kind: 'banner', title: '교수 연수(변경)', audience: ['professor'], enabled: false });
  await G('popList', '/api/lms/m/popup/list');
  await G('prevStu', '/api/lms/m/popup/preview?audience=student');
  await G('prevProf', '/api/lms/m/popup/preview?audience=professor');
  await G('prevBad', '/api/lms/m/popup/preview?audience=x');
  await P('popDel', '/api/lms/m/popup/del', { id: R.ban1.j.item.id });
  await P('popDel2', '/api/lms/m/popup/del', { id: R.ban1.j.item.id });
  /* 모니터링 */
  await G('th', '/api/lms/m/mon/th');
  await P('thBad', '/api/lms/m/mon/th_save', { metric: 'cpu_load', warn: 90, crit: 50 });
  await P('thSave', '/api/lms/m/mon/th_save', { metric: 'disk_pct', warn: 85, crit: 95 });
  await P('sample', '/api/lms/m/mon/sample', {});
  await G('hist', '/api/lms/m/mon/history');
  await G('monTea', '/api/lms/m/mon/th', tea.ck);
  return R;
}
main('묶음 M', scenario, { noAuth: 401, csrf: 403, listTea: 403, hit1: 200, hit3: 200, hitBad: 400, list: 200, listPage: 400, get: 200, getNo: 404, saveBad: 400, savePii: 400, saveKind: 400, save: 200, control: 200, impSub: 403, impShort: 400, impNo: 404, imp: 200, impCur: 200, hitImp: 200, impEnd: 200, impEnd2: 404, stats: 200, statsBad: 400, logs: 200, logsBad: 400, popBad: 400, popLink: 400, popAud: 400, pop1: 200, prevStu: 200, prevBad: 400, popDel: 200, popDel2: 404, th: 200, thBad: 400, thSave: 200, sample: 200, hist: 200, monTea: 403 }, ['sample', 'hist']);
