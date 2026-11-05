'use strict';
/* v30 묶음 F(시험 · 문제은행) 대조 테스트 — 비교 구간은 무작위를 끈 시험으로, 무작위 출제는 성질(응시마다 순서 다름 · 정답 미노출)로 확인한다.
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddw2 node test/lms-f.js http://127.0.0.1:8211 [http://127.0.0.1:8212] */
const { call, setup, setSql, run, STU, AUD } = require('./lms-efh-lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8211', process.argv[3] || ''];

async function scenario(base, tag) {
  const R = {}, P = []; const S = await setup(base, tag); const ck = S.ck; const L = S.L;
  const G = (k, p, o = {}) => call(base, 'GET', p, { cookie: ck, ...o }).then(r => (R[k] = r));
  const Po = (k, p, body, o = {}) => call(base, 'POST', p, { cookie: ck, body, ...o }).then(r => (R[k] = r));
  const LP = (k, m, p, body, o = {}) => call(base, 'POST', p, { cookie: L[m], body, ...o }).then(r => (R[k] = r));
  const LG = (k, m, p) => call(base, 'GET', p, { cookie: L[m] }).then(r => (R[k] = r));
  await Po('bankBad', '/api/lms/f/bank-save', { name: '', section_id: S.sec });
  await Po('bank', '/api/lms/f/bank-save', { name: '자료구조 문제은행', scope: 'course', section_id: S.sec });
  await Po('bankSec', '/api/lms/f/bank-save', { name: '01분반 전용', scope: 'section', section_id: S.sec });
  const bk = R.bank.j.bank.bank_id, bk2 = R.bankSec.j.bank.bank_id;
  await Po('qBadKind', '/api/lms/f/q-save', { bank_id: bk, kind: 'x', stem: 'a' });
  await Po('qBadAns', '/api/lms/f/q-save', { bank_id: bk, kind: 'single', stem: 'a', choices: ['1', '2'], answer: 'c9' });
  await Po('qBadMedia', '/api/lms/f/q-save', { bank_id: bk, kind: 'tf', stem: 'a', answer: 't', media: [{ type: 'video', url: 'javascript:alert(1)' }] });
  await Po('img', '/api/lms/e/file', { name: 'tree.png', mime: 'image/png', b64: 'iVBORw0KGgo=' });
  const Q = [
    { kind: 'single', stem: '스택의 특징은?', choices: [{ id: 'a', text: 'LIFO' }, { id: 'b', text: 'FIFO' }, { id: 'c', text: '무작위' }], answer: 'a', points: 2, difficulty: 'easy', explanation: '스택은 후입선출입니다.', media: [{ type: 'image', file_id: R.img.j.file_id }] },
    { kind: 'multi', stem: '선형 구조를 모두 고르세요.', choices: [{ id: 'a', text: '배열' }, { id: 'b', text: '트리' }, { id: 'c', text: '큐' }], answer: ['a', 'c'], points: 3, difficulty: 'mid', explanation: '트리는 비선형입니다.' },
    { kind: 'tf', stem: '해시 탐색은 평균 O(1)이다.', answer: 't', points: 1, difficulty: 'easy' },
    { kind: 'short', stem: '선입선출 자료구조 이름은?', answer: ['큐', 'queue'], points: 2, difficulty: 'mid', explanation: '큐(queue)입니다.' },
    { kind: 'numeric', stem: '이진 트리 높이 3의 최대 노드 수(루트 높이 0)는?', answer: { value: 15, tol: 0 }, points: 2, difficulty: 'hard', media: [{ type: 'video', url: 'https://example.com/tree.mp4' }] },
    { kind: 'essay', stem: '연결 리스트의 장단점을 서술하세요.', points: 5, difficulty: 'hard' }
  ];
  const qid = [];
  for (const [i, q] of Q.entries()) { const r = await Po('q' + i, '/api/lms/f/q-save', { bank_id: bk, ...q }); qid.push(r.j.question.q_id); }
  await G('questions', '/api/lms/f/questions?bank=' + bk);
  await G('banks', '/api/lms/f/banks?section=' + S.sec);
  await G('banks2', '/api/lms/f/banks?section=' + S.sec2);
  await Po('copy', '/api/lms/f/q-copy', { q_ids: [qid[0], qid[2]], to_bank: bk2 });
  await G('questions2', '/api/lms/f/questions?bank=' + bk2);
  /* 비교용 시험(무작위 끔) */
  const now = Date.now();
  await Po('examBad', '/api/lms/f/exam-save', { section_id: S.sec, title: '빈 시험', status: 'published' });
  await Po('examBadIp', '/api/lms/f/exam-save', { section_id: S.sec, title: 'x', ip_allow: ['10.0.0.300/8'] });
  await Po('exam', '/api/lms/f/exam-save', { section_id: S.sec, title: '1차 퀴즈', fixed: qid, shuffle_q: false, shuffle_c: false, time_limit_min: 30, max_attempts: 2, status: 'published', need_precheck: true, open_at: new Date(now - 60e3).toISOString(), close_at: new Date(now + 3600e3).toISOString() });
  const ex = R.exam.j.exam.exam_id;
  await G('exams', '/api/lms/f/exams?section=' + S.sec);
  await LG('my0', STU[0], '/api/lms/f/my?section=' + S.sec);
  await LP('startNoPre', STU[0], '/api/lms/f/start', { exam_id: ex });
  await LP('preFail', STU[0], '/api/lms/f/precheck', { exam_id: ex, result: { browser: true, storage: true, screen: true, clock: false, network_ms: 50 } });
  await LP('preOk', STU[0], '/api/lms/f/precheck', { exam_id: ex, result: { browser: true, storage: true, screen: true, clock: true, network_ms: 50 } });
  await LP('start', STU[0], '/api/lms/f/start', { exam_id: ex });
  const at = R.start.j.attempt.attempt_id;
  await LP('startResume', STU[0], '/api/lms/f/start', { exam_id: ex });
  await LP('ans1', STU[0], '/api/lms/f/answer', { attempt_id: at, answers: { [qid[0]]: 'a', [qid[1]]: ['c', 'a'] } });
  await LP('ansBad', STU[0], '/api/lms/f/answer', { attempt_id: at, answers: { '00000000-0000-0000-0000-000000000000': 'a' } });
  await LP('ansOther', STU[1], '/api/lms/f/answer', { attempt_id: at, answers: {} });
  await LP('submit', STU[0], '/api/lms/f/submit', { attempt_id: at, answers: { [qid[2]]: 'f', [qid[3]]: ' Queue ', [qid[4]]: '15', [qid[5]]: '장점: 삽입이 빠름' } });
  await LP('submitAgain', STU[0], '/api/lms/f/submit', { attempt_id: at });
  await G('attempts', '/api/lms/f/attempts?exam=' + ex);
  await G('attemptDetail', '/api/lms/f/attempt?id=' + at);
  await Po('markBad', '/api/lms/f/mark', { attempt_id: at, q_id: qid[5], score: 9 });
  await Po('mark', '/api/lms/f/mark', { attempt_id: at, q_id: qid[5], score: 4, feedback: '단점도 쓰세요.' });
  await LG('result', STU[0], '/api/lms/f/result?attempt=' + at);
  await LP('retry', STU[0], '/api/lms/f/retry', { attempt_id: at });
  await LP('retryCheck', STU[0], '/api/lms/f/retry', { attempt_id: at, answers: { [qid[2]]: 't' } });
  /* 다른 학생 · 청강 응시 */
  for (const [m, ans] of [[STU[1], { [qid[0]]: 'a', [qid[1]]: ['a', 'c'], [qid[2]]: 't', [qid[3]]: '큐', [qid[4]]: 15 }], [STU[2], { [qid[0]]: 'b' }], [AUD, { [qid[0]]: 'a' }]]) {
    await LP('pre_' + m, m, '/api/lms/f/precheck', { exam_id: ex, result: { browser: true, storage: true, screen: true, clock: true, network_ms: 10 } });
    const s = await LP('start_' + m, m, '/api/lms/f/start', { exam_id: ex });
    await LP('submit_' + m, m, '/api/lms/f/submit', { attempt_id: s.j.attempt.attempt_id, answers: ans });
    await call(base, 'POST', '/api/lms/f/mark', { cookie: ck, body: { attempt_id: s.j.attempt.attempt_id, q_id: qid[5], score: 3 } });
  }
  await LP('startNotEnr', '20267777', '/api/lms/f/start', { exam_id: ex });
  /* 횟수 제한 */
  const s2 = await LP('start2', STU[2], '/api/lms/f/start', { exam_id: ex });
  await LP('submit2', STU[2], '/api/lms/f/submit', { attempt_id: s2.j.attempt.attempt_id, answers: { [qid[0]]: 'a' } });
  await LP('start3', STU[2], '/api/lms/f/start', { exam_id: ex });
  await G('stats', '/api/lms/f/stats?exam=' + ex);
  await LG('result1', STU[1], '/api/lms/f/result?attempt=' + R['start_' + STU[1]].j.attempt.attempt_id);
  await Po('classify', '/api/lms/f/classify', { bank_id: bk, min_n: 3 });
  await call(base, 'GET', '/api/lms/h/board?section=' + S.sec, { cookie: ck }).then(r => (R.board = r));
  /* 시간 제한(서버 기준): 기한을 지난 응시는 답안 저장 대신 자동 제출 */
  await Po('examT', '/api/lms/f/exam-save', { section_id: S.sec, title: '시간 제한', fixed: [qid[2]], shuffle_q: false, time_limit_min: 1, status: 'published' });
  const sT = await LP('startT', STU[3], '/api/lms/f/start', { exam_id: R.examT.j.exam.exam_id });
  await setSql(S.tid, "update lms_exam_attempt set deadline_at = now() - interval '5 minutes' where attempt_id = $1", [sT.j.attempt.attempt_id]);
  await LP('ansLate', STU[3], '/api/lms/f/answer', { attempt_id: sT.j.attempt.attempt_id, answers: { [qid[2]]: 't' } });
  /* IP 제한 · 기록 */
  await Po('examIp', '/api/lms/f/exam-save', { section_id: S.sec, title: '강의실 시험', fixed: [qid[2]], ip_allow: ['10.20.0.0/16'], status: 'published' });
  await LP('ipDenied', STU[4], '/api/lms/f/start', { exam_id: R.examIp.j.exam.exam_id });
  /* 무작위 출제(성질만 확인) */
  await Po('examR', '/api/lms/f/exam-save', { section_id: S.sec, title: '무작위', rules: [{ bank_id: bk, n: 5 }], shuffle_q: true, shuffle_c: true, max_attempts: 20, status: 'published' });
  const orders = new Set(); let leak = false; let n5 = true;
  for (let i = 0; i < 6; i++) {
    const s = await call(base, 'POST', '/api/lms/f/start', { cookie: L[STU[4]], body: { exam_id: R.examR.j.exam.exam_id } });
    if (!s.j || !s.j.questions) { n5 = false; break; }
    orders.add(s.j.questions.map(q => q.q_id + ':' + (q.choices || []).map(c => c.id).join('')).join('|'));
    if (JSON.stringify(s.j).includes('"answer"') || JSON.stringify(s.j).includes('explanation')) leak = true;
    if (s.j.questions.length !== 5) n5 = false;
    await call(base, 'POST', '/api/lms/f/submit', { cookie: L[STU[4]], body: { attempt_id: s.j.attempt.attempt_id } });
  }
  await Po('qDel', '/api/lms/f/q-delete', { q_id: qid[1] });
  await G('questionsAfter', '/api/lms/f/questions?bank=' + bk);

  P.push([R.startNoPre.st === 409, '기능 테스트 전 응시 409'], [R.preFail.j && R.preFail.j.ok === false, '기능 테스트 실패 판정'],
    [R.start.st === 200 && !JSON.stringify(R.start.j).includes('"answer"'), '응시 시작 · 정답 미노출'], [R.startResume.j && R.startResume.j.resumed === true, '이어서 응시'],
    [R.ansOther.st === 404, '남의 응시 404'], [R.submit.j && R.submit.j.attempt.status === 'submitted' && R.submit.j.attempt.auto_score === 9, '자동 채점 9점(서술형 대기)'],
    [R.mark.j && R.mark.j.attempt.status === 'graded' && R.mark.j.attempt.score === 13, '수동 채점 후 13점'],
    [R.result.j && R.result.j.items.find(i => i.q_id === qid[2]).explanation !== undefined, '오답 피드백'],
    [R.retry.j && R.retry.j.questions.length === 1, '오답 재시도 문항 1개'], [R.retryCheck.j && R.retryCheck.j.checked[0].ok === true, '재시도 정답 확인'],
    [R.start3.st === 409 && R.start3.j.error === 'attempts', '응시 횟수 제한'], [R.startNotEnr.st === 403, '미수강 403'],
    [R.stats.j && R.stats.j.summary.n === 3, '통계 3명(청강 제외)'], [R.result1.j && R.result1.j.position.rank === 1, '본인 위치 1등'],
    [R.ansLate.j && R.ansLate.j.expired === true, '시간 초과 자동 제출'], [R.ipDenied.st === 403 && R.ipDenied.j.error === 'ip', 'IP 대역 제한'],
    [R.attempts.j && R.attempts.j.attempts[0].ip_start === '127.0.0.1', 'IP 기록(정규화)'],
    [n5 && orders.size >= 2, '응시마다 문항 · 보기 순서 다름'], [!leak, '무작위 시험 정답 · 해설 미노출'],
    [R.board.j && R.board.j.rows.length === 5, '성적 반영(정규만)'], [R.copy.j && R.copy.j.copied === 2, '문항 이관 2개'],
    [R.banks2.j && R.banks2.j.banks.length === 1, '교과목 공유 은행이 다른 분반에 보임']);
  return { R, P };
}
run('묶음 F 대조', scenario, A, B, ['retry', 'questionsAfter']).catch(e => { console.error(e); process.exit(1); });
