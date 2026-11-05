'use strict';
/* 묶음 N — MOOC · 비학위(SFR-059 · 060 · 061 · 064 · 004). 업무 규칙은 sql/80_n.sql의 lms_n_* 함수, 실행기는 mod-k.js bind(경로 · 권한 · 감사).
   권한 분리: 교수자(t)는 자기 과정의 내용 · 기수 · 진도만, 운영자(o · s)는 과정 승인 · 수강 승인 · 결제 확인 · 수료 판정 · 수료증 양식 · 진단평가.
   PG 결제 · 환불은 연동 지점(결제 대기 · 환불 요청 상태)까지만. */
const ROUTES = [
  ['GET', 'search', 'search', 'ost'],
  ['GET', 'suggest', 'suggest', 'ost'],
  ['GET', 'course', 'course_get', 'ost'],
  ['POST', 'course/save', 'course_save', 'ost', 'w'],
  ['POST', 'course/submit', 'course_submit', 'ost', 'w'],
  ['POST', 'course/decide', 'course_decide', 'os', 'w'],
  ['POST', 'course/close', 'course_close', 'os', 'w'],
  ['POST', 'convert', 'convert', 'ost', 'w'],
  ['POST', 'cohort/save', 'cohort_save', 'ost', 'w'],
  ['POST', 'enroll', 'enroll', 'ost', 'w'],
  ['POST', 'enroll/cancel', 'enroll_cancel', 'ost', 'w'],
  ['POST', 'pay/confirm', 'pay_confirm', 'os', 'w'],
  ['POST', 'enroll/decide', 'enroll_decide', 'os', 'w'],
  ['GET', 'enrolls', 'enrolls', 'ost'],
  ['POST', 'progress', 'progress', 'ost', 'w'],
  ['POST', 'complete', 'complete', 'os', 'w'],
  ['GET', 'certificate', 'certificate', 'ost'],
  ['POST', 'wish', 'wish', 'ost', 'w'],
  ['GET', 'mypage', 'mypage', 'ost'],
  ['POST', 'diag/save', 'diag_save', 'os', 'w'],
  ['GET', 'diags', 'diags', 'ost'],
  ['POST', 'diag/take', 'diag_take', 'ost', 'w'],
  ['GET', 'recommend', 'recommend', 'ost']
];
module.exports = ctx => require('./mod-k.js').bind(ctx, 'n', ROUTES);
