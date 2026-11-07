/* 시나리오 univ-lms — 어드민. 작성 규칙은 저장소 루트의 CLAUDE.md를 따른다. */
(function () {
  'use strict';
  /* v34 화면 가이드(slim-g.js의 GUIDE 표를 학사 LMS 문구로 덮어쓴다) */
  (window.SLG_PICK = window.SLG_PICK || []).push((type, ed) => type === 'univ' && ed === 'lms' ? {
    class: { d: '교과목 강의실을 만들고 학생을 배정해요', a: ['이번 학기 강의실 만들어줘', '학생이 없는 강의실 찾아줘', '강의실 공지 써줘'] },
    attend: { a: ['결석이 많은 학생 보여줘', '출결 이의신청 보여줘', '오늘 출석 현황 알려줘'] },
    dash: { a: ['이번 학기 운영 현황 요약해줘', '위험군 학생 찾아줘', '과제 제출률 낮은 강좌 보여줘'] } } : null);
})();
