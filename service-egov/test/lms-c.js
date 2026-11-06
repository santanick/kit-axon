'use strict';
/* v30 묶음 C 대조 테스트 — 학습활동(토론 · 위키 · 팀 · 동료 평가 · 대화방 · 설문 · 사전 과제/질문 · 수업 평가).
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/<db> node test/lms-c.js http://127.0.0.1:<node> [http://127.0.0.1:<java>] */
const { call, setup, run } = require('./lms-b.js');

async function scenario(base, tag) {
  const R = {}; const { ck, s2 } = await setup(base, tag);
  const G = (p, as) => call(base, 'GET', `/api/lms/c/${p}${as ? (p.includes('?') ? '&' : '?') + 'as=' + as : ''}`, { cookie: ck });
  const P = (p, body) => call(base, 'POST', `/api/lms/c/${p}`, { cookie: ck, body });
  const S = s2;
  R.noAuth = await call(base, 'GET', `/api/lms/c/forums?section=${S}`);
  R.nf = await G('nope');
  /* 팀 */
  R.teamAuto = await P('team-auto', { section: S, size: 2, set: '프로젝트' });
  R.teams = await G(`teams?section=${S}`);
  const t1 = R.teams.j.teams[0].id, t2 = R.teams.j.teams[1].id;
  const m1 = R.teams.j.teams[0].members.map(m => m.no), m2 = R.teams.j.teams[1].members.map(m => m.no);
  R.teamStu = await P('team-auto', { as: m1[0], section: S, size: 2 });
  R.teamSave = await P('team-save', { section: S, name: '별도팀', set: '기타' });
  R.teamMember = await P('team-member', { team: R.teamSave.j.id, no: m1[0], leader: true });
  R.teamMemberBad = await P('team-member', { team: R.teamSave.j.id, no: 'P2026001' });
  R.teamsStu = await G(`teams?section=${S}`, m1[0]);
  /* 팀 한정 과제 · 진행 */
  R.task = await P('task-save', { section: S, title: '중간 발표 자료', team_id: t1, due_at: '2026-10-20T23:59' });
  R.taskAll = await P('task-save', { section: S, title: '최종 보고서' });
  R.taskSt = await P('task-status', { as: m1[0], task: R.task.j.id, team: t1, status: 'done', note: '완료' });
  R.taskStOther = await P('task-status', { as: m2[0], task: R.taskAll.j.id, team: t1, status: 'doing' });
  R.taskStWrong = await P('task-status', { as: m1[0], task: R.task.j.id, team: t2, status: 'doing' });
  R.progress = await G(`progress?section=${S}`);
  /* 토론 */
  R.fSingle = await P('forum-save', { section: S, kind: 'single', layout: 'thread', title: '자료구조 선택 토론', prompt: '배열과 리스트 중 무엇이 좋은가?' });
  R.fFree = await P('forum-save', { section: S, kind: 'free', layout: 'board', title: '자유 토론', anonymous: true });
  R.fTeam = await P('forum-save', { section: S, title: '팀 토론방', team_mode: 'each', team_set: '프로젝트' });
  R.fBad = await P('forum-save', { section: S, kind: 'debate', title: 'x' });
  R.topic = await P('post', { forum: R.fSingle.j.id, title: '주제', body: '의견을 남겨 주세요.' });
  R.stuTop = await P('post', { as: m1[0], forum: R.fSingle.j.id, body: '새 주제' });
  R.stuReply = await P('post', { as: m1[0], forum: R.fSingle.j.id, parent: R.topic.j.id, body: '배열이 빠릅니다.' });
  R.anonPost = await P('post', { as: m1[1], forum: R.fFree.j.id, title: '질문', body: '익명 글' });
  R.forumsStu = await G(`forums?section=${S}`, m1[0]);
  const teamForums = R.forumsStu.j.forums.filter(f => f.team);
  const otherTeamForum = (await G(`forums?section=${S}`)).j.forums.find(f => f.team && f.team.id === t2);
  R.otherTeam = await P('post', { as: m1[0], forum: otherTeamForum.id, body: '다른 팀' });
  R.forumAnon = await G(`forum?id=${R.fFree.j.id}`, m1[0]);
  R.forumProf = await G(`forum?id=${R.fFree.j.id}`);
  R.postEditOther = await P('post-edit', { as: m1[0], id: R.anonPost.j.id, body: '고침' });
  R.postEdit = await P('post-edit', { as: m1[1], id: R.anonPost.j.id, body: '고친 익명 글' });
  R.postDelMgr = await P('post-del', { id: R.stuReply.j.id });
  R.forumAfter = await G(`forum?id=${R.fSingle.j.id}`);
  R.teamForumCnt = { st: 200, j: { n: teamForums.length } };
  /* 위키 */
  R.wiki = await P('wiki-save', { section: S, title: '용어집', body: '배열: 연속 메모리', note: '처음' });
  R.wiki2 = await P('wiki-save', { as: m1[0], id: R.wiki.j.id, base_ver: 1, body: '배열: 연속 메모리\n리스트: 노드 연결', note: '리스트 추가' });
  R.wikiConflict = await P('wiki-save', { as: m1[1], id: R.wiki.j.id, base_ver: 1, body: '충돌 편집' });
  R.wikiRevert = await P('wiki-revert', { id: R.wiki.j.id, ver: 1 });
  R.wikiPage = await G(`wiki-page?id=${R.wiki.j.id}`);
  R.wikiTeam = await P('wiki-save', { as: m1[0], section: S, title: '팀 회의록', team_id: t1, body: '1차 회의' });
  R.wikiTeamOther = await G(`wiki-page?id=${R.wikiTeam.j.id}`, m2[0]);
  R.wikis = await G(`wiki?section=${S}`, m2[0]);
  /* 동료 평가 */
  R.rv = await P('review-save', { section: S, title: '발표 동료 평가', anonymous: true, per_reviewer: 2, mode: 'auto', self: true, criteria: [{ name: '내용', max: 10 }, { name: '전달', max: 5 }] });
  R.rvBad = await P('review-save', { section: S, title: 'x', criteria: [{ name: '', max: 0 }] });
  R.allocFew = await P('review-alloc', { review: R.rv.j.id });
  for (const no of ['20261001', '20261002', '20261003', '20261004']) R['sub' + no] = await P('review-submit', { as: no, review: R.rv.j.id, content: `${no}의 발표 요약` });
  R.subProf = await P('review-submit', { review: R.rv.j.id, content: 'x' });
  R.alloc = await P('review-alloc', { review: R.rv.j.id });
  R.rvStu = await G(`review?id=${R.rv.j.id}`, '20261001');
  for (const no of ['20261001', '20261002', '20261003', '20261004']) { const v = await G(`review?id=${R.rv.j.id}`, no); for (const [i, t] of v.j.todo.entries()) R[`sc_${no}_${i}`] = { st: (await P('review-score', { as: no, alloc: t.alloc, scores: { 내용: 8, 전달: t.self ? 5 : 4 }, comment: '좋아요' })).st, j: null }; }
  const v1 = await G(`review?id=${R.rv.j.id}`, '20261001');
  R.scoreOther = await P('review-score', { as: '20261002', alloc: v1.j.todo[0].alloc, scores: { 내용: 1, 전달: 1 } });
  R.scoreBad = await P('review-score', { as: '20261001', alloc: v1.j.todo[0].alloc, scores: { 내용: 99, 전달: 1 } });
  R.rvSummary = await G(`review?id=${R.rv.j.id}`);
  R.rvRecv = await G(`review?id=${R.rv.j.id}`, '20261003');
  R.manual = await P('review-alloc', { review: R.rv.j.id, mode: 'manual', pairs: [{ reviewer: '20261001', reviewee: '20261004' }] });
  R.reviews = await G(`reviews?section=${S}`, '20261001');
  /* 대화방 */
  R.chat1 = await P('chat-send', { section: S, body: '수업 시작합니다' });
  R.chat2 = await P('chat-send', { as: '20261002', section: S, body: '네!' });
  R.chatEmpty = await P('chat-send', { as: '20261002', section: S, body: '  ' });
  R.chat = await G(`chat?section=${S}`, '20261002');
  /* 간편 설문 */
  R.poll = await P('poll-save', { section: S, question: '오늘 수업 난이도는?', options: ['쉬움', '적당', '어려움'], anonymous: true });
  R.pollMulti = await P('poll-save', { section: S, question: '관심 주제(복수)', options: ['트리', '그래프', '해시'], multi: true, anonymous: false });
  R.pollBad = await P('poll-save', { section: S, question: 'x', options: ['하나'] });
  R.vote1 = await P('poll-vote', { as: '20261001', poll: R.poll.j.id, choices: [1] });
  R.vote2 = await P('poll-vote', { as: '20261002', poll: R.poll.j.id, choices: [1, 2] });
  R.vote3 = await P('poll-vote', { as: '20261002', poll: R.pollMulti.j.id, choices: [0, 2] });
  R.voteOut = await P('poll-vote', { as: '20261003', poll: R.poll.j.id, choices: [7] });
  R.pollEditVoted = await P('poll-save', { id: R.poll.j.id, question: '바꿈', options: ['a', 'b'] });
  R.pollClose = await P('poll-close', { id: R.poll.j.id });
  R.voteClosed = await P('poll-vote', { as: '20261003', poll: R.poll.j.id, choices: [0] });
  R.polls = await G(`polls?section=${S}`);
  R.pollsStu = await G(`polls?section=${S}`, '20261001');
  /* 사전 과제 · 사전 질문 · 수업 평가 자료 */
  R.pre = await P('pretask-save', { section: S, kind: 'pretask', title: '1주차 사전 학습', body: '영상 보고 요약' });
  R.preQ = await P('pretask-save', { section: S, kind: 'question', title: '2주차 사전 질문' });
  R.preEval = await P('pretask-save', { section: S, kind: 'eval', title: '3주차 수업 평가 자료', body: '실습 결과 제출' });
  R.preBad = await P('pretask-save', { section: S, kind: 'quiz', title: 'x' });
  R.preSub = await P('pretask-submit', { as: '20261001', task: R.pre.j.id, body: '요약입니다' });
  R.qSub = await P('pretask-submit', { as: '20261002', task: R.preQ.j.id, body: '연결 리스트의 단점은?' });
  R.evSub1 = await P('pretask-submit', { as: '20261001', task: R.preEval.j.id, body: '실습 결과 A' });
  R.evSub2 = await P('pretask-submit', { as: '20261003', task: R.preEval.j.id, body: '실습 결과 B' });
  R.grade1 = await P('pretask-grade', { task: R.preEval.j.id, no: '20261001', score: 90, feedback: '훌륭합니다' });
  R.grade2 = await P('pretask-grade', { as: 'G2026001', task: R.preEval.j.id, no: '20261003', score: 70, feedback: '보완 필요' });
  R.gradeStu = await P('pretask-grade', { as: '20261002', task: R.preEval.j.id, no: '20261003', score: 100 });
  R.answerQ = await P('pretask-grade', { task: R.preQ.j.id, no: '20261002', feedback: '삽입은 빠르지만 임의 접근이 느립니다.' });
  R.resubGraded = await P('pretask-submit', { as: '20261001', task: R.preEval.j.id, body: '다시' });
  R.evStuBefore = await G(`pretasks?section=${S}&kind=eval`, '20261001');
  R.publish = await P('pretask-publish', { id: R.preEval.j.id });
  R.evStuAfter = await G(`pretasks?section=${S}&kind=eval`, '20261001');
  R.qStu = await G(`pretasks?section=${S}&kind=question`, '20261004');
  R.pretasks = await G(`pretasks?section=${S}`);
  R.noticeMade = await call(base, 'GET', `/api/lms/d/post?id=${R.publish.j.notice_id}`, { cookie: ck });
  /* 삭제 */
  R.pollDel = await P('poll-del', { id: R.pollMulti.j.id });
  R.forumDel = await P('forum-del', { id: R.fFree.j.id });
  R.teamDel = await P('team-del', { id: R.teamSave.j.id });
  R.taskDel = await P('task-del', { id: R.taskAll.j.id });
  R.preDel = await P('pretask-del', { id: R.pre.j.id });
  R.rvDel = await P('review-del', { id: R.rv.j.id });
  return R;
}
const EXP = { noAuth: 401, nf: 404, teamAuto: 200, teams: 200, teamStu: 403, teamSave: 200, teamMember: 200, teamMemberBad: 404, teamsStu: 200, task: 200, taskAll: 200, taskSt: 200, taskStOther: 403, taskStWrong: 403, progress: 200,
  fSingle: 200, fFree: 200, fTeam: 200, fBad: 400, topic: 200, stuTop: 403, stuReply: 200, anonPost: 200, forumsStu: 200, otherTeam: 403, forumAnon: 200, forumProf: 200, postEditOther: 403, postEdit: 200, postDelMgr: 200, forumAfter: 200,
  wiki: 200, wiki2: 200, wikiConflict: 409, wikiRevert: 200, wikiPage: 200, wikiTeam: 200, wikiTeamOther: 403, wikis: 200,
  rv: 200, rvBad: 400, allocFew: 409, sub20261001: 200, sub20261002: 200, sub20261003: 200, sub20261004: 200, subProf: 400, alloc: 200, rvStu: 200, scoreOther: 403, scoreBad: 400, rvSummary: 200, rvRecv: 200, manual: 200, reviews: 200,
  chat1: 200, chat2: 200, chatEmpty: 400, chat: 200, poll: 200, pollMulti: 200, pollBad: 400, vote1: 200, vote2: 400, vote3: 200, voteOut: 400, pollEditVoted: 409, pollClose: 200, voteClosed: 403, polls: 200, pollsStu: 200,
  pre: 200, preQ: 200, preEval: 200, preBad: 400, preSub: 200, qSub: 200, evSub1: 200, evSub2: 200, grade1: 200, grade2: 200, gradeStu: 403, answerQ: 200, resubGraded: 409, evStuBefore: 200, publish: 200, evStuAfter: 200, qStu: 200, pretasks: 200, noticeMade: 200,
  pollDel: 200, forumDel: 200, teamDel: 200, taskDel: 200, preDel: 200, rvDel: 200 };
module.exports = { scenario, EXP };
if (require.main === module) run(scenario, EXP, 'lms-c').then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1); });
