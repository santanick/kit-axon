/* 시나리오 univ-lite — 어드민. 작성 규칙은 저장소 루트의 CLAUDE.md를 따른다. */
(function () {
  'use strict';
  /* v34 화면 가이드(slim-g.js의 GUIDE 표를 사업단 · 센터 문구로 덮어쓴다) */
  (window.SLG_PICK = window.SLG_PICK || []).push((type, ed) => type === 'univ' && ed !== 'lms' ? {
    class: { d: '비교과 · 특강 교과목을 만들고 운영해요', a: ['비교과 프로그램 만들어줘', '참여가 적은 교과목 찾아줘', '이번 학기 운영 현황 알려줘'] },
    academic: { a: ['비교과 현황 보여줘', '위험군 학생 찾아줘', '사업 성과 보고서 써줘'] },
    dash: { a: ['사업 성과 지표 요약해줘', '참여율 낮은 프로그램 찾아줘', '결과 보고서 초안 써줘'] } } : null);
})();
