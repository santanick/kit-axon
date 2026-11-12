'use strict';
/* v30 묶음 F — 시험 · 문제은행(SFR-004 · 023 · 045 · 060 · 085): 문제은행(강좌 간 이관 · 재사용 · 난이도 자동 분류 · 이미지 · 영상 첨부) ·
   응시 제어(문항 · 보기 · 난이도별 무작위 — 응시마다 서버 저장, 시간 · 횟수 제한 서버 검사, IP 기록 · 대역 제한, 응시 전 기능 테스트) ·
   채점(서버 자동 · 수동 · 서술형) · 오답 피드백 · 재시도 · 결과 통계 · 분포 · 본인 위치 · 엑셀용 행. 프록터링은 연동 지점(만들지 않음).
   시험 IP 보존(학기 종료 후 가림, 기관 설정)과 교수 담당 분반 범위는 sql/97_efh_scope.sql. 규칙 · JSON은 sql/40_f.sql 함수가 만든다(Java lms.f와 같은 함수). */
const ROUTES = [
  ['GET /api/lms/f/banks', 'lms_f_banks', 'staff'],
  ['POST /api/lms/f/bank-save', 'lms_f_bank_save', 'staff', 8192],
  ['GET /api/lms/f/questions', 'lms_f_questions', 'staff'],
  ['POST /api/lms/f/q-save', 'lms_f_q_save', 'staff', 65536],
  ['POST /api/lms/f/q-delete', 'lms_f_q_delete', 'staff', 4096],
  ['POST /api/lms/f/q-copy', 'lms_f_q_copy', 'staff', 65536],
  ['POST /api/lms/f/classify', 'lms_f_classify', 'staff', 4096],
  ['GET /api/lms/f/exams', 'lms_f_exams', 'staff'],
  ['POST /api/lms/f/exam-save', 'lms_f_exam_save', 'staff', 65536],
  ['GET /api/lms/f/attempts', 'lms_f_attempts', 'staff'],
  ['GET /api/lms/f/attempt', 'lms_f_attempt', 'staff'],
  ['POST /api/lms/f/mark', 'lms_f_mark', 'staff', 16384],
  ['GET /api/lms/f/stats', 'lms_f_stats', 'staff'],
  ['GET /api/lms/f/my', 'lms_f_my', 'learner'],
  ['POST /api/lms/f/precheck', 'lms_f_precheck', 'learner', 4096],
  ['POST /api/lms/f/start', 'lms_f_start', 'learner', 4096],
  ['POST /api/lms/f/answer', 'lms_f_answer', 'learner', 262144],
  ['POST /api/lms/f/submit', 'lms_f_submit', 'learner', 262144],
  ['GET /api/lms/f/result', 'lms_f_result', 'learner'],
  ['POST /api/lms/f/retry', 'lms_f_retry', 'learner', 65536],
  ['GET /api/lms/f/settings', 'lms_f_settings', 'staff'],
  ['POST /api/lms/f/settings', 'lms_f_settings_save', 'staff', 4096],
  ['POST /api/lms/f/ip-mask', 'lms_f_ip_mask', 'staff', 4096],
  /* x3 · SFR-089 웹 시험 감독(sql/a3_integrity.sql): 학습자 = 감독 안내 · 시작(동의 · 장치 확인 · 1기기 · 본인 확인 표) · 화면 사건 · 웹캠 사진,
     교수자 = 감독 설정 · 응시별 위험 점수 · 타임라인 · 사진(열람 기록) · 판정 · 열람 기록 · 사진 보존 기간 · 파기 */
  ['GET /api/lms/f/proctor', 'lms_f_proctor', 'learner'],
  ['POST /api/lms/f/proctor-begin', 'lms_f_proctor_begin', 'learner', 8192],
  ['POST /api/lms/f/proctor-event', 'lms_f_proctor_event', 'learner', 65536],
  ['POST /api/lms/f/proctor-snap', 'lms_f_proctor_snap', 'learner', 300000],
  ['GET /api/lms/f/proctor-cfg', 'lms_f_proctor_cfg', 'staff'],
  ['POST /api/lms/f/proctor-cfg', 'lms_f_proctor_cfg_save', 'staff', 4096],
  ['GET /api/lms/f/proctor-review', 'lms_f_proctor_review', 'staff'],
  ['GET /api/lms/f/proctor-timeline', 'lms_f_proctor_timeline', 'staff'],
  ['GET /api/lms/f/proctor-photo', 'lms_f_proctor_photo', 'staff'],
  ['POST /api/lms/f/proctor-decide', 'lms_f_proctor_decide', 'staff', 4096],
  ['GET /api/lms/f/proctor-views', 'lms_f_proctor_views', 'staff'],
  ['GET /api/lms/f/proctor-settings', 'lms_f_proctor_settings', 'staff'],
  ['POST /api/lms/f/proctor-settings', 'lms_f_proctor_settings_save', 'staff', 4096],
  ['POST /api/lms/f/proctor-purge', 'lms_f_proctor_purge', 'staff', 4096]
];
module.exports = ctx => require('./efh_lib')(ctx, ROUTES);
module.exports.ROUTES = ROUTES;
