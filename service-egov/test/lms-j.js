'use strict';
/* v30 묶음 J 대조 테스트 — 학습 분석(복합 위험지수 · 추이/예측 · 조기 경고 규칙 · 대상 추출 · 그룹 인사이트 · 맞춤 피드백 · 성찰일지 · 학습활동 보고서 · 학생 화면 모드).
   Node ↔ Java 같은 시나리오 · 정규화 비교, SQL 동일성 확인. 사용: node test/lms-j.js http://127.0.0.1:<node> [http://127.0.0.1:<java>] */
const L = require('./lms-w3lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8221', process.argv[3] || ''];

async function scenario(base, tag) {
  const R = {}; const call = L.caller(base); const ck = await L.signup(base, 'j' + tag);
  const sec = (await call('POST', '/api/lms/g/seed', { cookie: ck, body: {} })).j.section_id;
  const ses = (await call('GET', '/api/lms/g/sessions?section_id=' + sec, { cookie: ck })).j;
  /* 1~3주차를 과거로, 출결 · 진도 · 퀴즈 성적 데이터 만들기 */
  for (let w = 1; w <= 3; w++) await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: ses.find(x => x.week_no === w && x.seq === 1).session_id, starts_at: new Date(Date.now() - (4 - w) * 864e5).toISOString() } });
  for (let w = 4; w <= 15; w++) for (const x of ses.filter(y => y.week_no === w)) await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: x.session_id, starts_at: new Date(Date.now() + w * 864e5).toISOString() } });
  for (let w = 1; w <= 3; w++) { const sid = ses.find(x => x.week_no === w && x.seq === 1).session_id; for (let i = 1; i <= 8; i++) await call('POST', '/api/lms/g/mark', { cookie: ck, body: { session_id: sid, member_no: '2026900' + i, status: i >= 7 ? 'absent' : i === 6 && w === 2 ? 'late' : 'present' } }); }
  await call('POST', '/api/lms/i/seed', { cookie: ck, body: { section_id: sec } });
  const ct = (await call('GET', '/api/lms/i/contents?section_id=' + sec, { cookie: ck })).j[0];
  const q = (await call('POST', '/api/lms/i/quiz', { cookie: ck, body: { content_id: ct.content_id, at_sec: 10, question: '정형 데이터?', options: ['표', '그림'], answer: 0 } })).j;
  for (let i = 1; i <= 8; i++) await call('POST', '/api/lms/i/quiz/answer', { cookie: ck, body: { quiz_id: q.quiz_id, member_no: '2026900' + i, choice: i >= 6 ? 1 : 0 } });
  const st = await call('POST', '/api/lms/i/play/start', { cookie: ck, body: { content_id: ct.content_id, member_no: '20269001' } });
  await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: st.j.play_id, from: 0, pos: 3, rate: 1 } });
  await call('POST', '/api/lms/i/activity', { cookie: ck, body: { section_id: sec, member_no: '20269001', kind: 'post', ref: '질문 게시판' } });
  /* 비교과(묶음 Q) 참여: 20269001 이수 · 20269002 출석 1회 → 비교과 25 · 10점 */
  const tid = await L.tidOf(base, ck);
  await L.db(async c => { await c.query('begin'); await c.query("select set_config('app.tenant', $1, true)", [tid]);
    const pid = (await c.query("insert into lms_q_program (tenant_id, title, status) values ($1, 'AI 해커톤', 'running') returning program_id", [tid])).rows[0].program_id;
    const qs = (await c.query("insert into lms_q_session (tenant_id, program_id, seq, title) values ($1, $2, 1, '1회차') returning session_id", [tid, pid])).rows[0].session_id;
    await c.query("insert into lms_q_application (tenant_id, program_id, member_no, status, completion) values ($1, $2, '20269001', 'approved', 'completed'), ($1, $2, '20269002', 'approved', 'pending'), ($1, $2, '20269003', 'applied', 'pending')", [tid, pid]);
    await c.query("insert into lms_q_attend (tenant_id, program_id, session_id, member_no, status) values ($1, $2, $3, '20269002', 'present'), ($1, $2, $3, '20269003', 'present')", [tid, pid, qs]); await c.query('commit'); });
  R.noAuth = await call('GET', '/api/lms/j/risk?section_id=' + sec);
  R.risk = await call('GET', '/api/lms/j/risk?section_id=' + sec, { cookie: ck });
  R.riskNf = await call('GET', '/api/lms/j/risk?section_id=00000000-0000-0000-0000-000000000000', { cookie: ck });
  R.snap = await call('POST', '/api/lms/j/snapshot', { cookie: ck, body: { section_id: sec } });
  R.rules0 = await call('GET', '/api/lms/j/rules', { cookie: ck });
  R.targets0 = await call('GET', '/api/lms/j/targets?section_id=' + sec, { cookie: ck });
  R.ruleBad = await call('POST', '/api/lms/j/rule', { cookie: ck, body: { name: 'x', metric: 'iq', op: 'gte', threshold: 50, level: 'warn' } });
  R.rule = await call('POST', '/api/lms/j/rule', { cookie: ck, body: { name: '중도이탈 60% 이상', metric: 'dropout', op: 'gte', threshold: 60, level: 'danger' } });
  R.rule2 = await call('POST', '/api/lms/j/rule', { cookie: ck, body: { name: '출석률 80% 이하', metric: 'attendance', op: 'lte', threshold: 80, level: 'warn' } });
  R.rules = await call('GET', '/api/lms/j/rules', { cookie: ck });
  R.targets = await call('GET', '/api/lms/j/targets?section_id=' + sec, { cookie: ck });
  R.ruleDel = await call('POST', '/api/lms/j/rule/delete', { cookie: ck, body: { rule_id: R.rule2.j.rule_id } });
  R.ruleDel2 = await call('POST', '/api/lms/j/rule/delete', { cookie: ck, body: { rule_id: R.rule2.j.rule_id } });
  R.insights = await call('GET', '/api/lms/j/insights?section_id=' + sec, { cookie: ck });
  R.fbSec = await call('POST', '/api/lms/j/feedback', { cookie: ck, body: { section_id: sec, audience: 'professor' } });
  R.fbStu = await call('POST', '/api/lms/j/feedback', { cookie: ck, body: { section_id: sec, member_no: '20269008', audience: 'student' } });
  R.fbProf = await call('POST', '/api/lms/j/feedback', { cookie: ck, body: { section_id: sec, member_no: '20269008', audience: 'professor' } });
  R.fbNoStu = await call('POST', '/api/lms/j/feedback', { cookie: ck, body: { section_id: sec, audience: 'student' } });
  R.fbNe = await call('POST', '/api/lms/j/feedback', { cookie: ck, body: { section_id: sec, member_no: '99999999', audience: 'student' } });
  R.fbSave = await call('POST', '/api/lms/j/feedback/save', { cookie: ck, body: { section_id: sec, member_no: '20269008', audience: 'student', body: '다듬은 피드백입니다.', source: 'ai' } });
  R.fbs = await call('GET', '/api/lms/j/feedbacks?section_id=' + sec + '&member_no=20269008', { cookie: ck });
  R.refl = await call('POST', '/api/lms/j/reflection', { cookie: ck, body: { section_id: sec, member_no: '20269001', week_no: 3, body: '회귀 개념이 어려웠지만 예제로 이해했습니다.', mood: 4 } });
  R.reflBad = await call('POST', '/api/lms/j/reflection', { cookie: ck, body: { section_id: sec, member_no: '20269001', week_no: 30, body: 'x' } });
  R.reflNe = await call('POST', '/api/lms/j/reflection', { cookie: ck, body: { section_id: sec, member_no: '99999999', week_no: 3, body: 'x' } });
  R.reflCm = await call('POST', '/api/lms/j/reflection/comment', { cookie: ck, body: { id: R.refl.j.id, comment: '좋은 성찰입니다. 다음 주 실습도 기대합니다.' } });
  R.refls = await call('GET', '/api/lms/j/reflections?section_id=' + sec, { cookie: ck });
  R.report = await call('GET', '/api/lms/j/report?section_id=' + sec + '&member_no=20269001', { cookie: ck });
  R.reportStu = await call('GET', '/api/lms/j/report?section_id=' + sec + '&member_no=20269008&view=student', { cookie: ck });
  const lk = await L.learnerCookie(tid, '20269004');
  R.lRefl = await call('POST', '/api/lms/j/reflection', { cookie: lk, body: { section_id: sec, member_no: '20269001', week_no: 3, body: '학습자 본인이 쓴 성찰입니다.', mood: 3 } });
  R.lRefls = await call('GET', '/api/lms/j/reflections?section_id=' + sec, { cookie: lk });
  R.lReport = await call('GET', '/api/lms/j/report?section_id=' + sec + '&member_no=20269001&view=professor', { cookie: lk });
  R.lRisk = await call('GET', '/api/lms/j/risk?section_id=' + sec, { cookie: lk });
  R.lComment = await call('POST', '/api/lms/j/reflection/comment', { cookie: lk, body: { id: R.refl.j.id, comment: 'x' } });
  R.reportNe = await call('GET', '/api/lms/j/report?section_id=' + sec + '&member_no=99999999', { cookie: ck });
  return R;
}
const EXPECT = { noAuth: 401, risk: 200, riskNf: 404, snap: 200, rules0: 200, targets0: 200, ruleBad: 400, rule: 200, rule2: 200, rules: 200, targets: 200, ruleDel: 200, ruleDel2: 404, insights: 200,
  fbSec: 200, fbStu: 200, fbProf: 200, fbNoStu: 400, fbNe: 403, fbSave: 200, fbs: 200, refl: 200, reflBad: 400, reflNe: 403, reflCm: 200, refls: 200, report: 200, reportStu: 200, reportNe: 403, lRefl: 200, lRefls: 200, lReport: 200, lRisk: 401, lComment: 401 };
function checks(R, ok) {
  const s = R.risk.j && R.risk.j.students; const g = m => s.find(x => x.member_no === m);
  ok(s && s.length === 8 && g('20269001').attendance === 100 && g('20269008').attendance === 0, '출결 지표');
  ok(s && g('20269008').risk > g('20269001').risk && g('20269008').level === 'danger', '위험지수 순서 ' + JSON.stringify(s && [g('20269001'), g('20269008')]));
  ok(s && g('20269001').extra === 25 && g('20269002').extra === 10 && g('20269003').extra === 0 && R.risk.j.extra_source === 'lms_extra_participation', '비교과(Q) 반영 25/10/0 ' + JSON.stringify(s && s.map(x => x.extra)));
  ok(R.snap.j && R.snap.j.saved === 8, '스냅샷 8');
  ok(R.targets0.j && R.targets0.j.rules.length === 3 && R.targets0.j.targets.some(t => t.member_no === '20269008' && t.level === 'danger'), '기본 규칙 대상');
  ok(R.targets.j && R.targets.j.rules.length === 2 && R.targets.j.targets.every(t => t.matched.length >= 1), '사용자 규칙 대상');
  ok(R.insights.j && R.insights.j.by_unit.length === 3 && R.insights.j.patterns.length >= 1, '그룹 인사이트');
  ok(R.fbStu.j && /20269008/.test(R.fbStu.j.body) && /출석률이 0%/.test(R.fbStu.j.body), '학생 피드백');
  ok(R.fbSec.j && /분반 학습 현황/.test(R.fbSec.j.body), '분반 요약 피드백');
  ok(R.fbs.j && R.fbs.j.length === 3, '피드백 목록');
  ok(R.report.j && R.report.j.attendance.present === 3 && R.report.j.reflections === 1 && R.report.j.activities.post === 1 && R.report.j.status.dropout_pct !== null, '활동 보고서');
  ok(R.lRefl.j && R.lRefl.j.member_no === '20269004' && R.lRefls.j.length === 1 && R.lRefls.j[0].member_no === '20269004', '학습자 성찰일지(본인만)');
  ok(R.lReport.j && R.lReport.j.member_no === '20269004' && R.lReport.j.view === 'student' && R.lReport.j.status.dropout_pct === null, '학습자 보고서 = 학생 화면 고정');
  ok(R.reportStu.j && R.reportStu.j.status.dropout_pct === null && R.reportStu.j.feedback.source === 'ai', '학생 화면 모드');
}
L.run({ name: 'J', A, B, scenario, EXPECT, checks, bundle: 'j' });
