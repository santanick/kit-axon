'use strict';
/* v30 묶음 I 대조 테스트 — 동영상 · 진도(콘텐츠 · 재생 시작/박동/종료 · 구간 병합 · 배속 제한 · 동시 재생 차단 · 이어보기 · 자막 VTT/SRT/편집 · 영상 퀴즈 → 성적 · 학습분량 · 이력 · 행동 기록)
   + 묶음 G 온라인 출석 인정(진도율 · 주차 기간)과 비정상 학습행동 연동. Node ↔ Java 같은 시나리오 · 정규화 비교, SQL 동일성 확인.
   사용: node test/lms-i.js http://127.0.0.1:<node> [http://127.0.0.1:<java>] */
const L = require('./lms-w3lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8221', process.argv[3] || ''];
const VTT = 'WEBVTT\n\n00:00:01.000 --> 00:00:04.500 align:start\n안녕하세요, <b>데이터</b> 강의입니다.\n\n00:00:05.000 --> 00:00:09.000\n오늘은 회귀를 배웁니다.\n두 번째 줄\n\nNOTE 주석\n\n01:02.250 --> 01:05.000\n짧은 표기';
const SRT = '1\r\n00:00:01,000 --> 00:00:03,000\r\nHello class.\r\n\r\n2\r\n00:00:03,500 --> 00:00:06,000\r\n<i>Regression</i> today.\r\n';

async function scenario(base, tag) {
  const R = {}; const call = L.caller(base); const ck = await L.signup(base, 'i' + tag);
  const seed = await call('POST', '/api/lms/g/seed', { cookie: ck, body: {} }); const sec = seed.j.section_id;
  const ses = (await call('GET', '/api/lms/g/sessions?section_id=' + sec, { cookie: ck })).j; const S = (w, q = 1) => ses.find(x => x.week_no === w && x.seq === q).session_id;
  R.noAuth = await call('GET', '/api/lms/i/contents?section_id=' + sec);
  R.seed = await call('POST', '/api/lms/i/seed', { cookie: ck, body: { section_id: sec } });
  R.seed2 = await call('POST', '/api/lms/i/seed', { cookie: ck, body: { section_id: sec } });
  R.contents = await call('GET', '/api/lms/i/contents?section_id=' + sec, { cookie: ck });
  R.addBad = await call('POST', '/api/lms/i/content', { cookie: ck, body: { session_id: S(2), title: '', duration_sec: 10 } });
  R.add = await call('POST', '/api/lms/i/content', { cookie: ck, body: { session_id: S(10, 2), title: '보충 영상', duration_sec: 60, src: 'demo:extra', check_at_sec: 50 } });
  const cid = R.add.j.content_id; const c1 = R.contents.j.find(x => x.week_no === 1).content_id;
  R.startNe = await call('POST', '/api/lms/i/play/start', { cookie: ck, body: { content_id: cid, member_no: '99999999' } });
  R.start = await call('POST', '/api/lms/i/play/start', { cookie: ck, body: { content_id: cid, member_no: '20269001' } });
  const pid = R.start.j.play_id;
  R.block = await call('POST', '/api/lms/i/play/start', { cookie: ck, body: { content_id: c1, member_no: '20269001' } });
  R.beat1 = await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: pid, from: 0, pos: 2, rate: 1 } });
  R.beatCap = await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: pid, from: 2, pos: 40, rate: 1 } });
  R.beatRate = await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: pid, from: 5, pos: 6, rate: 2.5 } });
  R.beatSpeed = await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: pid, from: 5, pos: 7, rate: 1.5 } });
  R.beatSkip = await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: pid, from: 30, pos: 31, rate: 1.5 } });
  R.beatBad = await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: pid, from: 'x', pos: 1, rate: 1 } });
  R.end = await call('POST', '/api/lms/i/play/end', { cookie: ck, body: { play_id: pid, pos: 31 } });
  R.beatOver = await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: pid, from: 31, pos: 32, rate: 1 } });
  R.endOver = await call('POST', '/api/lms/i/play/end', { cookie: ck, body: { play_id: pid } });
  R.resume = await call('POST', '/api/lms/i/play/start', { cookie: ck, body: { content_id: cid, member_no: '20269001' } });
  await call('POST', '/api/lms/i/play/end', { cookie: ck, body: { play_id: R.resume.j.play_id } });
  /* 학생 2: 60초 영상을 3초씩 끝까지(벽시계 상한 안) → 완료 · 온라인 출석 인정 */
  const s2 = await call('POST', '/api/lms/i/play/start', { cookie: ck, body: { content_id: cid, member_no: '20269002' } });
  for (let f = 0; f < 60; f += 3) await call('POST', '/api/lms/i/play/beat', { cookie: ck, body: { play_id: s2.j.play_id, from: f, pos: f + 3, rate: 1 } });
  R.s2end = await call('POST', '/api/lms/i/play/end', { cookie: ck, body: { play_id: s2.j.play_id, pos: 60 } });
  R.progress = await call('GET', '/api/lms/i/progress?section_id=' + sec, { cookie: ck });
  /* 주차 기간을 지금으로 → 온라인 출석 반영(학생 2 출석) */
  await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: S(10, 2), open_at: new Date(Date.now() - 864e5).toISOString(), close_at: new Date(Date.now() + 864e5).toISOString() } });
  R.online = await call('POST', '/api/lms/g/online', { cookie: ck, body: { section_id: sec } });
  R.roster = await call('GET', '/api/lms/g/roster?section_id=' + sec, { cookie: ck });
  R.anom = await call('GET', '/api/lms/g/anomalies?section_id=' + sec, { cookie: ck });
  R.vtt = await call('POST', '/api/lms/i/subtitle', { cookie: ck, body: { content_id: cid, lang: 'ko', format: 'vtt', text: VTT } });
  R.srt = await call('POST', '/api/lms/i/subtitle', { cookie: ck, body: { content_id: cid, lang: 'en', format: 'srt', text: SRT } });
  R.subBad = await call('POST', '/api/lms/i/subtitle', { cookie: ck, body: { content_id: cid, lang: 'ja', format: 'vtt', text: '자막 아님' } });
  R.subLang = await call('POST', '/api/lms/i/subtitle', { cookie: ck, body: { content_id: cid, lang: 'xx', format: 'vtt', text: VTT } });
  R.cues = await call('POST', '/api/lms/i/subtitle/cues', { cookie: ck, body: { content_id: cid, lang: 'ko', cues: [{ s: 5, e: 9, t: '수정된 두 번째' }, { s: 1, e: 4.5, t: '수정된 첫 줄' }] } });
  R.cuesBad = await call('POST', '/api/lms/i/subtitle/cues', { cookie: ck, body: { content_id: cid, lang: 'ko', cues: [{ s: 5, e: 2, t: 'x' }] } });
  R.cuesObj = await call('POST', '/api/lms/i/subtitle/cues', { cookie: ck, body: { content_id: cid, lang: 'ko', cues: { s: 1 } } });
  R.subs = await call('GET', '/api/lms/i/subtitles?content_id=' + cid, { cookie: ck });
  R.quiz = await call('POST', '/api/lms/i/quiz', { cookie: ck, body: { content_id: cid, at_sec: 30, question: '회귀의 목적은?', options: ['분류', '연속값 예측', '군집'], answer: 1, points: 2 } });
  R.quiz2 = await call('POST', '/api/lms/i/quiz', { cookie: ck, body: { content_id: cid, at_sec: 50, question: '손실 함수 예?', options: ['MSE', 'URL'], answer: 0 } });
  R.quizBad = await call('POST', '/api/lms/i/quiz', { cookie: ck, body: { content_id: cid, at_sec: 30, question: 'x', options: ['하나'], answer: 0 } });
  R.quizChoice = await call('POST', '/api/lms/i/quiz', { cookie: ck, body: { content_id: cid, at_sec: 30, question: 'x', options: ['a', 'b'], answer: 3 } });
  R.ans1 = await call('POST', '/api/lms/i/quiz/answer', { cookie: ck, body: { quiz_id: R.quiz.j.quiz_id, member_no: '20269002', choice: 1 } });
  R.ans2 = await call('POST', '/api/lms/i/quiz/answer', { cookie: ck, body: { quiz_id: R.quiz2.j.quiz_id, member_no: '20269002', choice: 1 } });
  R.ansDup = await call('POST', '/api/lms/i/quiz/answer', { cookie: ck, body: { quiz_id: R.quiz.j.quiz_id, member_no: '20269002', choice: 0 } });
  R.quizzes = await call('GET', '/api/lms/i/quizzes?content_id=' + cid + '&member_no=20269002', { cookie: ck });
  R.workload0 = await call('GET', '/api/lms/i/workload?section_id=' + sec, { cookie: ck });
  await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: S(3), extra_study_sec: 600, required_sec: 2000 } });
  R.workload = await call('GET', '/api/lms/i/workload?section_id=' + sec, { cookie: ck });
  R.act = await call('POST', '/api/lms/i/activity', { cookie: ck, body: { section_id: sec, member_no: '20269001', kind: 'download', ref: '1주차 강의자료.pdf' } });
  R.actBad = await call('POST', '/api/lms/i/activity', { cookie: ck, body: { section_id: sec, member_no: '20269001', kind: 'hack' } });
  /* 학습자 포털 세션 */
  const tid = await L.tidOf(base, ck); const lk = await L.learnerCookie(tid, '20269003');
  R.lMy = await call('GET', '/api/lms/i/my', { cookie: lk });
  R.lMyStaff = await call('GET', '/api/lms/i/my?member_no=20269003', { cookie: ck });
  R.lStart = await call('POST', '/api/lms/i/play/start', { cookie: lk, body: { content_id: cid, member_no: '20269001' } });
  R.lBeat = await call('POST', '/api/lms/i/play/beat', { cookie: lk, body: { play_id: R.lStart.j.play_id, from: 0, pos: 2, rate: 1 } });
  const other = await call('POST', '/api/lms/i/play/start', { cookie: ck, body: { content_id: c1, member_no: '20269004' } });
  R.lBeatOther = await call('POST', '/api/lms/i/play/beat', { cookie: lk, body: { play_id: other.j.play_id, from: 0, pos: 2, rate: 1 } });
  R.lEndOther = await call('POST', '/api/lms/i/play/end', { cookie: lk, body: { play_id: other.j.play_id } });
  R.lQuiz = await call('GET', '/api/lms/i/quizzes?content_id=' + cid, { cookie: lk });
  R.lAns = await call('POST', '/api/lms/i/quiz/answer', { cookie: lk, body: { quiz_id: R.quiz.j.quiz_id, choice: 1 } });
  R.lQuiz2 = await call('GET', '/api/lms/i/quizzes?content_id=' + cid, { cookie: lk });
  R.lEnd = await call('POST', '/api/lms/i/play/end', { cookie: lk, body: { play_id: R.lStart.j.play_id, pos: 2 } });
  R.lSubs = await call('GET', '/api/lms/i/subtitles?content_id=' + cid, { cookie: lk });
  R.lProg = await call('GET', '/api/lms/i/progress?section_id=' + sec, { cookie: lk });
  R.history = await call('GET', '/api/lms/i/history?section_id=' + sec + '&member_no=20269001', { cookie: ck });
  R.historyAll = await call('GET', '/api/lms/i/history?section_id=' + sec, { cookie: ck });
  return R;
}
const EXPECT = { noAuth: 401, seed: 200, contents: 200, addBad: 400, add: 200, startNe: 403, start: 200, block: 200, beat1: 200, beatCap: 200, beatRate: 400, beatSpeed: 200, beatSkip: 200, beatBad: 400, end: 200, beatOver: 409, endOver: 409,
  resume: 200, s2end: 200, progress: 200, online: 200, roster: 200, anom: 200, vtt: 200, srt: 200, subBad: 400, subLang: 400, cues: 200, cuesBad: 400, cuesObj: 400, subs: 200, quiz: 200, quiz2: 200, quizBad: 400, quizChoice: 400,
  ans1: 200, ans2: 200, ansDup: 409, quizzes: 200, workload: 200, act: 200, actBad: 400, history: 200, historyAll: 200, lMy: 200, lMyStaff: 200, lStart: 200, lBeat: 200, lBeatOther: 404, lEndOther: 409, lQuiz: 200, lAns: 200, lQuiz2: 200, lEnd: 200, lSubs: 200, lProg: 401 };
function checks(R, ok) {
  ok(R.seed.j && R.seed.j.created === 15 && R.seed2.j.created === 0, '주차 영상 15개 · 재실행 0');
  ok(R.block.j && R.block.j.blocked === true, '동시 재생 차단');
  ok(R.beat1.j && R.beat1.j.credited === 2 && R.beat1.j.watched_sec === 2, '구간 2초');
  ok(R.beatCap.j && R.beatCap.j.credited < 38, '벽시계 상한(건너뛴 시간 불인정) ' + JSON.stringify(R.beatCap.j));
  ok(R.resume.j && R.resume.j.resume_pos === 31, '이어보기 31초');
  ok(R.s2end.j && R.progress.j.students.find(s => s.member_no === '20269002').pcts.includes(100), '학생2 100%');
  ok(R.online.j && R.online.j.present >= 1, '온라인 출석 인정 ' + JSON.stringify(R.online.j));
  ok(R.anom.j && ['speed_before_check', 'skip', 'concurrent'].every(k => R.anom.j.some(a => a.kind === k)), '비정상 행동 3종 ' + JSON.stringify(R.anom.j && R.anom.j.map(a => a.kind)));
  ok(R.vtt.j && R.vtt.j.cues === 3 && R.vtt.j.first.t === '안녕하세요, 데이터 강의입니다.' && R.vtt.j.first.e === 4.5, 'VTT 파싱');
  ok(R.srt.j && R.srt.j.cues === 2, 'SRT 파싱');
  ok(R.subs.j && R.subs.j.find(s => s.lang === 'ko').cues[0].t === '수정된 첫 줄', '자막 편집 정렬');
  ok(R.ans1.j && R.ans1.j.correct === true && R.ans2.j.correct === false && R.ans2.j.score === 66.67, '퀴즈 성적 반영 ' + JSON.stringify(R.ans2.j));
  ok(R.workload.j && R.workload.j.sessions.find(s => s.week_no === 3).short === false && R.workload0.j.short_count > 0, '학습분량 점검');
  ok(R.lMy.j && R.lMy.j.found && JSON.stringify(R.lMy.j) === JSON.stringify(R.lMyStaff.j) && R.lMy.j.sections[0].contents.length === 16, '내 강의 영상 = 이 사용자로 보기');
  ok(R.lBeat.j && R.lBeat.j.credited === 2 && R.lAns.j && R.lAns.j.correct === true, '학습자 재생 · 퀴즈(학번 고정)');
  ok(R.lQuiz.j && R.lQuiz.j.every(q => q.answer === null) && R.lQuiz2.j.find(q => q.mine).answer === 1, '학습자에게 정답 숨김(응답 후 공개)');
  ok(R.history.j && R.history.j.plays.length >= 2 && R.history.j.plays[0].ip_masked.endsWith('*') && R.history.j.activities.length === 1, '학습 이력');
}
L.run({ name: 'I', A, B, scenario, EXPECT, checks, bundle: 'i' });
