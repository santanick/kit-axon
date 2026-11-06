'use strict';
/* v30 묶음 D 대조 테스트 — 강의 게시판(공지 열람자 확인 · 고정 · 카테고리 · 복제, Q&A 공개/비공개 · 멀티 답변 · 익명, 자료실, 1:1 상담, 댓글, 발송 대기열).
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/<db> node test/lms-d.js http://127.0.0.1:<node> [http://127.0.0.1:<java>] */
const { call, setup, run } = require('./lms-b.js');

async function scenario(base, tag) {
  const R = {}; const { ck, s1, s2 } = await setup(base, tag); const S = s2;
  const G = (p, as) => call(base, 'GET', `/api/lms/d/${p}${as ? (p.includes('?') ? '&' : '?') + 'as=' + as : ''}`, { cookie: ck });
  const P = (p, body) => call(base, 'POST', `/api/lms/d/${p}`, { cookie: ck, body });
  R.noAuth = await call(base, 'GET', `/api/lms/d/boards?section=${S}`);
  R.csrf = await call(base, 'POST', '/api/lms/d/post-save', { cookie: ck, body: {}, csrf: false });
  R.boards = await G(`boards?section=${S}`);
  const B = Object.fromEntries(R.boards.j.boards.map(b => [b.kind, b.id]));
  R.boardsStu = await G(`boards?section=${S}`, '20261001');
  R.cat = await P('board-save', { board: B.notice, categories: ['일반', '학사', '시험', '휴보강'] });
  R.catBad = await P('board-save', { board: B.notice, categories: [''] });
  /* 공지: 고정 · 카테고리 · 첨부 · 알림 대기열 */
  const f = await call(base, 'POST', '/api/lms/b/file-put', { cookie: ck, body: { section: S, name: '안내.txt', mime: 'text/plain', b64: Buffer.from('안내문').toString('base64') } });
  R.n1 = await P('post-save', { board: B.notice, category: '시험', title: '중간고사 안내', body: '10월 21일 시행', pinned: true, files: [{ file_id: f.j.id }], notify: ['sms', 'mail'] });
  R.n2 = await P('post-save', { board: B.notice, category: '일반', title: '첫 수업 안내', body: '환영합니다' });
  R.nBadCat = await P('post-save', { board: B.notice, category: '없는것', title: 'x' });
  R.nBadFile = await P('post-save', { board: B.notice, title: 'x', files: [{ file_id: '00000000-0000-4000-8000-000000000000' }] });
  R.nStu = await P('post-save', { as: '20261001', board: B.notice, title: '학생 공지' });
  R.nTa = await P('post-save', { as: 'T2026001', board: B.notice, title: '조교 공지', body: '실습실 안내' });
  R.read1 = await G(`post?id=${R.n1.j.id}`, '20261001');
  R.read2 = await G(`post?id=${R.n1.j.id}`, '20261002');
  R.readers = await G(`readers?id=${R.n1.j.id}`);
  R.readersStu = await G(`readers?id=${R.n1.j.id}`, '20261001');
  R.list = await G(`posts?board=${B.notice}`, '20261001');
  R.listCat = await G(`posts?board=${B.notice}&cat=${encodeURIComponent('일반')}`);
  R.listQ = await G(`posts?board=${B.notice}&q=${encodeURIComponent('중간')}`);
  R.pin = await P('post-pin', { id: R.n2.j.id, pinned: true });
  R.copy = await P('post-copy', { id: R.n1.j.id, sections: [s1] });
  R.copySelf = await P('post-copy', { id: R.n1.j.id, sections: [S] });
  R.outbox = await G(`outbox?section=${S}`);
  /* 댓글 */
  R.cm1 = await P('comment', { as: '20261001', post: R.n1.j.id, body: '범위가 어디까지인가요?' });
  R.cm2 = await P('comment', { as: '20261002', post: R.n1.j.id, body: '저도 궁금합니다', anonymous: true });
  R.cmDelOther = await P('comment-del', { as: '20261002', id: R.cm1.j.id });
  R.cmDel = await P('comment-del', { as: '20261001', id: R.cm1.j.id });
  R.withComments = await G(`post?id=${R.n1.j.id}`, '20261003');
  /* Q&A: 공개 · 비공개 · 익명 · 멀티 답변 · 채택 */
  R.q1 = await P('post-save', { as: '20261001', board: B.qna, category: '과제', title: '과제 제출 형식', body: 'PDF만 되나요?' });
  R.q2 = await P('post-save', { as: '20261002', board: B.qna, title: '성적 문의', body: '개인적인 질문', private: true });
  R.q3 = await P('post-save', { as: '20261003', board: B.qna, title: '익명 질문', body: '기초가 부족합니다', anonymous: true });
  R.qPrivOther = await G(`post?id=${R.q2.j.id}`, '20261001');
  R.qPrivProf = await G(`post?id=${R.q2.j.id}`);
  R.qListStu = await G(`posts?board=${B.qna}`, '20261001');
  R.qAnonStu = await G(`post?id=${R.q3.j.id}`, '20261004');
  R.qAnonProf = await G(`post?id=${R.q3.j.id}`);
  R.a1 = await P('answer', { post: R.q1.j.id, body: 'PDF · HWP 모두 됩니다.' });
  R.a2 = await P('answer', { as: '20261003', post: R.q1.j.id, body: '저는 PDF로 냈어요', anonymous: true });
  R.a3 = await P('answer', { as: 'T2026001', post: R.q1.j.id, body: '조교 답변: 파일명 규칙도 확인' });
  R.aPrivStu = await P('answer', { as: '20261001', post: R.q2.j.id, body: '끼어들기' });
  R.accept = await P('answer-accept', { as: '20261001', id: R.a3.j.id });
  R.acceptOther = await P('answer-accept', { as: '20261002', id: R.a1.j.id });
  R.aDel = await P('answer-del', { as: '20261003', id: R.a2.j.id });
  R.qDetail = await G(`post?id=${R.q1.j.id}`, '20261001');
  R.qEdit = await P('post-save', { as: '20261001', id: R.q1.j.id, title: '과제 제출 형식(수정)', body: 'PDF만?', category: '과제' });
  R.qEditOther = await P('post-save', { as: '20261002', id: R.q1.j.id, title: '남의 글' });
  /* 자료실 */
  R.ar = await P('post-save', { board: B.archive, category: '강의자료', title: '1주차 슬라이드', files: [{ file_id: f.j.id }] });
  R.arStu = await P('post-save', { as: '20261001', board: B.archive, title: '학생 자료' });
  R.arList = await G(`posts?board=${B.archive}`, '20261004');
  R.fileStu = await call(base, 'GET', `/api/lms/b/file?id=${f.j.id}&as=20261004`, { cookie: ck });
  /* 1:1 상담 */
  R.cs = await P('post-save', { as: '20261004', board: B.counsel, category: '진로', title: '대학원 진학 상담', body: '면담 가능한 시간이 있을까요?' });
  R.csOther = await G(`post?id=${R.cs.j.id}`, '20261001');
  R.csTa = await P('post-save', { as: 'T2026001', board: B.counsel, title: '조교 상담' });
  R.csAns = await P('answer', { post: R.cs.j.id, body: '목요일 3시에 연구실로 오세요.' });
  R.csAnsStu = await P('answer', { as: '20261004', post: R.cs.j.id, body: '감사합니다. 가겠습니다.' });
  R.csAnsOther = await P('answer', { as: '20261001', post: R.cs.j.id, body: '끼어들기' });
  R.csComment = await P('comment', { as: '20261004', post: R.cs.j.id, body: 'x' });
  R.csClose = await P('counsel-status', { as: '20261004', id: R.cs.j.id, status: 'closed' });
  R.csAfterClose = await P('answer', { post: R.cs.j.id, body: '추가' });
  R.csList = await G(`posts?board=${B.counsel}`);
  R.csListStu = await G(`posts?board=${B.counsel}`, '20261001');
  R.boardsAfter = await G(`boards?section=${S}`, '20261001');
  R.del = await P('post-del', { id: R.n2.j.id });
  R.delStu = await P('post-del', { as: '20261002', id: R.q1.j.id });
  R.gone = await G(`post?id=${R.n2.j.id}`);
  return R;
}
const EXP = { noAuth: 401, csrf: 403, boards: 200, boardsStu: 200, cat: 200, catBad: 400, n1: 200, n2: 200, nBadCat: 400, nBadFile: 400, nStu: 403, nTa: 200, read1: 200, read2: 200, readers: 200, readersStu: 403, list: 200, listCat: 200, listQ: 200, pin: 200, copy: 200, copySelf: 404, outbox: 200,
  cm1: 200, cm2: 200, cmDelOther: 403, cmDel: 200, withComments: 200, q1: 200, q2: 200, q3: 200, qPrivOther: 403, qPrivProf: 200, qListStu: 200, qAnonStu: 200, qAnonProf: 200, a1: 200, a2: 200, a3: 200, aPrivStu: 403, accept: 200, acceptOther: 403, aDel: 200, qDetail: 200, qEdit: 200, qEditOther: 403,
  ar: 200, arStu: 403, arList: 200, fileStu: 200, cs: 200, csOther: 403, csTa: 403, csAns: 200, csAnsStu: 200, csAnsOther: 403, csComment: 400, csClose: 200, csAfterClose: 409, csList: 200, csListStu: 200, boardsAfter: 200, del: 200, delStu: 403, gone: 404 };
module.exports = { scenario, EXP };
if (require.main === module) run(scenario, EXP, 'lms-d').then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1); });
