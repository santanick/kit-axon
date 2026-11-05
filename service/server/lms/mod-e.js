'use strict';
/* v30 묶음 E — 과제(SFR-035 · 046 · 079 · 081): 제출(온라인 문서 · 파일 · 다중 첨부 · 초안 자동 저장 · 제출 현황) · 루브릭(다면) 채점 · 운영자 템플릿 ·
   첨삭(웹 · 파일) · 일괄 다운로드 · 일괄 피드백 · 협업 과제(팀 · 버전) · 표절 검사 결과 인터페이스(엔진은 연동 지점, 모의 어댑터 stub-local).
   규칙 · JSON은 sql/30_e.sql 함수가 만든다(Java lms.e와 같은 함수). [경로, SQL 함수, 권한, 본문 최대] */
const ROUTES = [
  ['GET /api/lms/e/sections', 'lms_e_sections', 'staff'],
  ['GET /api/lms/e/list', 'lms_e_list', 'staff'],
  ['POST /api/lms/e/save', 'lms_e_save', 'staff', 65536],
  ['POST /api/lms/e/delete', 'lms_e_delete', 'staff', 4096],
  ['GET /api/lms/e/status', 'lms_e_status', 'staff'],
  ['GET /api/lms/e/sub', 'lms_e_sub', 'staff'],
  ['POST /api/lms/e/grade', 'lms_e_grade', 'staff', 65536],
  ['POST /api/lms/e/bulk-feedback', 'lms_e_bulk_feedback', 'staff', 65536],
  ['GET /api/lms/e/bundle', 'lms_e_bundle', 'staff'],
  ['GET /api/lms/e/rubrics', 'lms_e_rubrics', 'staff'],
  ['POST /api/lms/e/rubric-save', 'lms_e_rubric_save', 'staff', 65536],
  ['POST /api/lms/e/teams', 'lms_e_teams', 'staff', 65536],
  ['POST /api/lms/e/plag-run', 'lms_e_plag_run', 'staff', 4096],
  ['GET /api/lms/e/plag', 'lms_e_plag', 'staff'],
  ['POST /api/lms/e/file', 'lms_e_file_put', 'any', 3 * 1024 * 1024],
  ['GET /api/lms/e/file', 'lms_e_file_get', 'any'],
  ['GET /api/lms/e/my', 'lms_e_my', 'learner'],
  ['POST /api/lms/e/draft', 'lms_e_draft', 'learner', 1024 * 1024],
  ['POST /api/lms/e/submit', 'lms_e_submit', 'learner', 4096],
  ['GET /api/lms/e/versions', 'lms_e_versions', 'any'],
  ['POST /api/lms/e/restore', 'lms_e_restore', 'learner', 4096]
];
module.exports = ctx => require('./efh_lib')(ctx, ROUTES);
module.exports.ROUTES = ROUTES;
