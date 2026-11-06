'use strict';
/* v30 묶음 C — 학습활동(토론 · 위키 · 팀 프로젝트 · 자기/동료 평가 · 대화방 · 간편 설문 · 사전 과제/질문 · 수업 평가 자료).
   업무 규칙 · JSON은 SQL 함수 lms_c_api(sql/25_c.sql). 디스패처는 mod-b.js bundle()과 같다(Java lms.c도 같은 함수). */
const ROUTES = {
  forums: ['GET'], forum: ['GET'], wiki: ['GET'], 'wiki-page': ['GET'], teams: ['GET'], progress: ['GET'], reviews: ['GET'], review: ['GET'], chat: ['GET'], polls: ['GET'], pretasks: ['GET'],
  'forum-save': ['POST', 32768], 'forum-del': ['POST'], post: ['POST', 65536], 'post-edit': ['POST', 65536], 'post-del': ['POST'],
  'wiki-save': ['POST', 512 * 1024], 'wiki-revert': ['POST'],
  'team-save': ['POST'], 'team-del': ['POST'], 'team-member': ['POST'], 'team-auto': ['POST'], 'task-save': ['POST', 32768], 'task-del': ['POST'], 'task-status': ['POST'],
  'review-save': ['POST', 32768], 'review-del': ['POST'], 'review-submit': ['POST', 65536], 'review-alloc': ['POST', 65536], 'review-score': ['POST', 16384],
  'chat-send': ['POST', 8192], 'poll-save': ['POST', 16384], 'poll-vote': ['POST'], 'poll-close': ['POST'], 'poll-del': ['POST'],
  'pretask-save': ['POST', 32768], 'pretask-del': ['POST'], 'pretask-submit': ['POST', 65536], 'pretask-grade': ['POST', 16384], 'pretask-publish': ['POST']
};
module.exports = ctx => require('./mod-b').bundle(ctx, 'c', ROUTES);
module.exports.ROUTES = ROUTES;
