'use strict';
/* v30 학사 LMS 묶음 L — 통합 달력(iCal) · DM 채팅 · 알림 규칙 · 방해금지 · 발송 대기열(연동 지점). 업무 규칙: sql/70_l.sql lms_l() */
const { build } = require('./lmp-core');
const ROUTES = [
  ['GET', 'cal.list'], ['POST', 'cal.add'], ['POST', 'cal.done'], ['POST', 'cal.del'], ['POST', 'cal.d1'],
  ['GET', 'cal.ics', { post: (r, res) => { res.setHeader('content-type', 'text/calendar; charset=utf-8'); res.setHeader('content-disposition', 'attachment; filename="didisam-calendar.ics"'); return r.ics; } }],
  ['GET', 'dm.rooms'], ['POST', 'dm.open'], ['POST', 'dm.send'], ['GET', 'dm.msgs'], ['POST', 'dm.read'], ['POST', 'dm.broadcast'],
  ['GET', 'noti.rules'], ['POST', 'noti.rule_save'], ['POST', 'noti.rule_del'], ['POST', 'noti.quiet'], ['POST', 'noti.fire'], ['POST', 'noti.scan'],
  ['GET', 'noti.inbox'], ['GET', 'noti.outbox'], ['POST', 'noti.ack']
];
/* 모든 L 경로는 학습자 포털 세션도 받는다(학생 DM · 알림 · 개인 일정). 관리 동작은 SQL에서 역할로 막는다 */
ROUTES.forEach(r => { r[2] = { ...(r[2] || {}), learner: 'any' }; });
module.exports = ctx => build(ctx, 'l', 'lms_l', ROUTES);
module.exports.ROUTES = ROUTES;
