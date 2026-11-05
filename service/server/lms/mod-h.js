'use strict';
/* v30 묶음 H — 성적(SFR-032 · 050): 평가 항목 · 카테고리(수업계획서 비율 자동 등록 · 환산) · 점수 입력(엑셀 업/다운로드) ·
   등급 산출(점수 · 백분율 · A+~F · 상대평가) · 분포도 · 평균 조정 · 채점 비공개 · 종합 평가 보드 · 조건별 학생 자동 선택 메시지 ·
   성적 확정 · 변경 이력 · 학사 전송 대기 목록(학사 전송은 연동 지점). 청강생(lms_enrollment.kind = 'audit')은 산출에서 제외.
   규칙 · JSON은 sql/55_h.sql 함수가 만든다(Java lms.h와 같은 함수). */
const ROUTES = [
  ['GET /api/lms/h/board', 'lms_h_board', 'staff'],
  ['POST /api/lms/h/item-save', 'lms_h_item_save', 'staff', 8192],
  ['POST /api/lms/h/item-delete', 'lms_h_item_delete', 'staff', 4096],
  ['POST /api/lms/h/from-syllabus', 'lms_h_from_syllabus', 'staff', 4096],
  ['POST /api/lms/h/scores', 'lms_h_scores', 'staff', 1024 * 1024],
  ['POST /api/lms/h/policy', 'lms_h_policy', 'staff', 16384],
  ['POST /api/lms/h/confirm', 'lms_h_confirm', 'staff', 4096],
  ['POST /api/lms/h/change', 'lms_h_change', 'staff', 4096],
  ['GET /api/lms/h/history', 'lms_h_history', 'staff'],
  ['GET /api/lms/h/queue', 'lms_h_queue', 'staff'],
  ['POST /api/lms/h/queue-ack', 'lms_h_queue_ack', 'staff', 65536],
  ['POST /api/lms/h/select', 'lms_h_select', 'staff', 8192],
  ['POST /api/lms/h/message', 'lms_h_message', 'staff', 262144],
  ['GET /api/lms/h/my', 'lms_h_my', 'learner']
];
module.exports = ctx => require('./efh_lib')(ctx, ROUTES);
module.exports.ROUTES = ROUTES;
