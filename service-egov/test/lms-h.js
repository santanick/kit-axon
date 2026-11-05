'use strict';
/* v30 묶음 H(성적) 대조 테스트 — 항목 · 수업계획서 비율 · 점수 일괄 · 등급(절대 · 상대 · P/NP) · 평균 조정 · 비공개 · 확정 · 정정 · 이력 · 학사 대기열 · 조건 선택 · 메시지.
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddw2 node test/lms-h.js http://127.0.0.1:8211 [http://127.0.0.1:8212] */
const { call, setup, run, STU, AUD } = require('./lms-efh-lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8211', process.argv[3] || ''];

async function scenario(base, tag) {
  const R = {}, P = []; const S = await setup(base, tag); const ck = S.ck; const L = S.L;
  const G = (k, p, o = {}) => call(base, 'GET', p, { cookie: ck, ...o }).then(r => (R[k] = r));
  const Po = (k, p, body, o = {}) => call(base, 'POST', p, { cookie: ck, body, ...o }).then(r => (R[k] = r));
  const LG = (k, m, p) => call(base, 'GET', p, { cookie: L[m] }).then(r => (R[k] = r));
  await G('board0', '/api/lms/h/board?section=' + S.sec);
  await Po('sylNone', '/api/lms/h/from-syllabus', { section_id: S.sec2 });
  await Po('syl', '/api/lms/h/from-syllabus', { section_id: S.sec });
  const it = Object.fromEntries(R.syl.j.items.map(i => [i.category, i.item_id]));
  await Po('itemBad', '/api/lms/h/item-save', { section_id: S.sec, name: 'x', category: 'nope' });
  await Po('itemNew', '/api/lms/h/item-save', { section_id: S.sec, name: '발표', category: 'participation', weight_pct: 0, max_score: 10 });
  await Po('itemDel', '/api/lms/h/item-delete', { item_id: R.itemNew.j.item.item_id });
  const sc = { midterm: [95, 88, 72, 60, 40], final: [92, 85, 80, 55, 30], assignment: [100, 90, 70, 50, 0], quiz: [90, 80, 70, 60, 50], attendance: [100, 100, 90, 80, 50] };
  for (const [k, v] of Object.entries(sc)) await Po('sc_' + k, '/api/lms/h/scores', { item_id: it[k], rows: [...STU.map((m, i) => ({ member_no: m, score: v[i] })), { member_no: AUD, score: 99 }, { member_no: '20267777', score: 1 }, { member_no: STU[0], score: 999 }] });
  await Po('scoresBadRows', '/api/lms/h/scores', { item_id: it.midterm, rows: 'x' });
  await G('board1', '/api/lms/h/board?section=' + S.sec);
  await Po('polBad', '/api/lms/h/policy', { section_id: S.sec, cutoffs: [['A', 50], ['B', 60], ['F', 0]] });
  await Po('polBadRel', '/api/lms/h/policy', { section_id: S.sec, scale: 'relative', rel: { A: 80, AB: 50 } });
  await Po('polRel', '/api/lms/h/policy', { section_id: S.sec, scale: 'relative', rel: { A: 20, AB: 50 } });
  await G('boardRel', '/api/lms/h/board?section=' + S.sec);
  await Po('polAdj', '/api/lms/h/policy', { section_id: S.sec, scale: 'abc', adjust: { mode: 'shift', target: 75 } });
  await G('boardAdj', '/api/lms/h/board?section=' + S.sec);
  await Po('polLin', '/api/lms/h/policy', { section_id: S.sec, adjust: { mode: 'linear', target: 80 } });
  await G('boardLin', '/api/lms/h/board?section=' + S.sec);
  await Po('polPass', '/api/lms/h/policy', { section_id: S.sec, scale: 'pass', adjust: { mode: 'none' }, pass_cut: 60 });
  await G('boardPass', '/api/lms/h/board?section=' + S.sec);
  await Po('polHide', '/api/lms/h/policy', { section_id: S.sec, scale: 'abc', hidden: true });
  await LG('myHidden', STU[0], '/api/lms/h/my?section=' + S.sec);
  await LG('myAudit', AUD, '/api/lms/h/my?section=' + S.sec);
  await LG('myNotEnr', '20267777', '/api/lms/h/my?section=' + S.sec);
  await Po('select', '/api/lms/h/select', { section_id: S.sec, cond: { total_below: 60 } });
  await Po('selectLetter', '/api/lms/h/select', { section_id: S.sec, cond: { letter_in: ['A+', 'A0'] } });
  await Po('selectNone', '/api/lms/h/select', { section_id: S.sec, cond: {} });
  await Po('msg', '/api/lms/h/message', { section_id: S.sec, member_nos: R.select.j.targets.map(t => t.member_no), channel: 'push', text: '성적 상담을 신청하세요.' });
  await Po('msgBad', '/api/lms/h/message', { section_id: S.sec, member_nos: ['20267777'], text: 'x' });
  await Po('changeBefore', '/api/lms/h/change', { section_id: S.sec, member_no: STU[0], total: 90, reason: '정정' });
  /* 비율 합 100이 아니면 확정 불가 */
  await Po('itemW', '/api/lms/h/item-save', { item_id: it.quiz, name: '퀴즈', category: 'quiz', weight_pct: 15, max_score: 100 });
  await Po('confirmBad', '/api/lms/h/confirm', { section_id: S.sec });
  await Po('itemW2', '/api/lms/h/item-save', { item_id: it.quiz, name: '퀴즈', category: 'quiz', weight_pct: 10, max_score: 100 });
  await Po('confirm', '/api/lms/h/confirm', { section_id: S.sec });
  await Po('confirmAgain', '/api/lms/h/confirm', { section_id: S.sec });
  await LG('myConfirmed', STU[0], '/api/lms/h/my?section=' + S.sec);
  await Po('changeNoReason', '/api/lms/h/change', { section_id: S.sec, member_no: STU[3], total: 61 });
  await Po('change', '/api/lms/h/change', { section_id: S.sec, member_no: STU[3], total: 61, letter: 'D0', reason: '기말 답안 재채점' });
  await G('history', '/api/lms/h/history?section=' + S.sec);
  await G('queue', '/api/lms/h/queue?section=' + S.sec);
  await G('queueBad', '/api/lms/h/queue?status=zzz');
  const q = (R.queue.j.queue || []).slice(0, 2).map(x => x.qid);
  await Po('ack', '/api/lms/h/queue-ack', { qids: q, ok: true, ack: 'SIS-0001' });
  await Po('ackErr', '/api/lms/h/queue-ack', { qids: [(R.queue.j.queue || [])[2].qid], ok: false, error: '학사 응답 시간 초과' });
  await G('queue2', '/api/lms/h/queue?section=' + S.sec);
  await G('board2', '/api/lms/h/board?section=' + S.sec);
  await call(base, 'GET', '/api/lms/h/board?section=' + S.sec, { cookie: L[STU[0]] }).then(r => (R.learnerBoard = r));

  const b1 = R.board1.j || {}; const tot = m => (b1.rows || []).find(r => r.member_no === m) || {};
  P.push([R.board0.st === 200, '빈 보드'], [R.syl.j && R.syl.j.applied === 5, '수업계획서 비율 5개 등록'], [R.sylNone.st === 400, '계획서 없음 400'],
    [R.sc_midterm.j && R.sc_midterm.j.saved === 5 && R.sc_midterm.j.skipped.length === 3, '점수 일괄(청강 · 미수강 · 범위 밖 건너뜀)'],
    [b1.rows && b1.rows.length === 5 && b1.auditors === 1 && b1.weight_sum === 100, '보드 정규 5명 · 청강 1 · 비율 100'],
    [tot(STU[0]).total === 95.1 && tot(STU[0]).letter === 'A+', '환산 총점 95.1 · A+'],
    [R.boardRel.j && R.boardRel.j.rows.filter(r => /^A/.test(r.letter)).length === 1, '상대평가 A 20% 제한'],
    [R.boardAdj.j && Math.abs(R.boardAdj.j.stats.mean - 75) < 0.5 && R.boardAdj.j.stats.mean_raw < 72, '평균 조정(가산) 평균 약 75(100점 상한)'],
    [R.boardPass.j && R.boardPass.j.rows.every(r => r.letter === 'P' || r.letter === 'NP'), 'P/NP'],
    [R.myHidden.j && R.myHidden.j.hidden === true && !('total' in R.myHidden.j), '채점 비공개'], [R.myAudit.j && R.myAudit.j.audit === true, '청강 학습자 안내'],
    [R.select.j && R.select.j.n === 2, '총점 60 미만 2명 자동 선택'], [R.selectNone.j && R.selectNone.j.n === 0, '조건 없으면 0명'], [R.msg.j && R.msg.j.n === 2, '메시지 대기열 2명'],
    [R.changeBefore.st === 409, '확정 전 정정 409'], [R.confirmBad.st === 400, '비율 합 100 아님 400'],
    [R.confirm.j && R.confirm.j.confirmed === 5 && R.confirm.j.queued === 5, '확정 5명 · 대기열 5건'], [R.confirmAgain.j && R.confirmAgain.j.changed === 0, '변동 없으면 재확정 0건'],
    [R.myConfirmed.j && R.myConfirmed.j.confirmed === true && R.myConfirmed.j.letter === 'A+', '확정 후 학생 열람'],
    [R.changeNoReason.st === 400, '정정 사유 필수'], [R.history.j && R.history.j.history.length === 6, '변경 이력 6건'],
    [R.queue2.j && R.queue2.j.counts.sent === 2 && R.queue2.j.counts.error === 1, '학사 대기열 전송 · 오류 반영'],
    [R.learnerBoard.st === 401 || R.learnerBoard.st === 403, '학습자 교수 보드 차단']);
  return { R, P };
}
run('묶음 H 대조', scenario, A, B).catch(e => { console.error(e); process.exit(1); });
