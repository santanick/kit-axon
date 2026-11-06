'use strict';
/* v30 묶음 D — 강의 게시판(공지 열람자 확인 · 상단 고정 · 카테고리 · 복제, Q&A 공개/비공개 · 멀티 답변 · 실명/익명, 자료실, 1:1 상담, 댓글, SMS · 메일 발송 대기열).
   업무 규칙 · JSON은 SQL 함수 lms_d_api(sql/28_d.sql). 디스패처는 mod-b.js bundle()과 같다(Java lms.d도 같은 함수). */
const ROUTES = {
  boards: ['GET'], posts: ['GET'], post: ['GET'], readers: ['GET'], outbox: ['GET'],
  'board-save': ['POST', 8192], 'post-save': ['POST', 128 * 1024], 'post-del': ['POST'], 'post-pin': ['POST'], 'post-copy': ['POST', 16384],
  answer: ['POST', 65536], 'answer-del': ['POST'], 'answer-accept': ['POST'], comment: ['POST', 16384], 'comment-del': ['POST'], 'counsel-status': ['POST']
};
module.exports = ctx => require('./mod-b').bundle(ctx, 'd', ROUTES);
module.exports.ROUTES = ROUTES;
