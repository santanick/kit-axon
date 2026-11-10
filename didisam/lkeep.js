/* 디디쌤 학습자 v37 L2 — 같은 화면을 다시 그릴 때 스크롤 위치 유지(운영자 화면 v37 '클릭 시 스크롤 유지'의 학습자 짝).
   지금까지는 탭 · 필터 · 좋아요 · 완료 · 답변 저장처럼 같은 주소에서 화면을 다시 그리면(lrender) 맨 위로 튀었다.
   - 주소(hash)가 바뀌면 지금처럼 맨 위에서 시작한다(다른 화면으로 이동)
   - 같은 주소에서 다시 그리면, 그리기 직전 위치로 되돌린다. 버튼이 먼저 맨 위로 올리라고 한 경우(scrollTo(0,0) 뒤 lrender)는 그 0을 그대로 지킨다
   - 앱 첫 화면 스크롤 상자(#apScroll)도 같은 규칙
   맨 마지막에 감싸야 다른 파일의 lrender 확장이 넣는 scrollTo(0, 0)까지 되돌릴 수 있으므로 learner.html에서 lhead.js 뒤 · lboot.js 앞에 둔다. */
(function () {
  'use strict';
  if (typeof lrender !== 'function') return;
  let last = null, seq = 0, user = 0, navAt = 0;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(ev => addEventListener(ev, () => { user = 1; }, { passive: true, capture: true }));
  const box = () => document.getElementById('apScroll');
  const base = lrender;
  lrender = function (...a) {
    const h = location.hash; const same = last === h; const y = window.scrollY; const b0 = box(); const by = b0 ? b0.scrollTop : 0;
    const r = base.apply(this, a); if (!same) navAt = Date.now(); last = location.hash;
    /* 화면 이동 직후(0.8초 안) 저절로 한 번 더 그리는 경우는 이동으로 본다 — 이동 중 잠깐 생긴 위치를 붙잡지 않게 */
    if (same && location.hash === h && (y > 0 || by > 0) && Date.now() - navAt > 800) {
      const put = () => { if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y); const b1 = box(); if (b1 && by && Math.abs(b1.scrollTop - by) > 1) b1.scrollTop = by; };
      /* Shadow DOM 홈 · 배지 · 달력처럼 다음 프레임에 위쪽 내용이 붙는 화면은 브라우저 스크롤 고정이 위치를 밀어 내므로, 사용자가 직접 움직이기 전까지 몇 번 더 맞춘다 */
      const t0 = ++seq; user = 0; const again = () => { if (t0 === seq && !user && location.hash === h) put(); };
      const t1 = Date.now(); const loop = () => { if (t0 !== seq || user || location.hash !== h) return; put(); if (Date.now() - t1 < 700) requestAnimationFrame(loop); }; put(); requestAnimationFrame(loop); setTimeout(again, 900);
    }
    return r;
  };
  window.lrender = lrender;
  window.LKEEP = { reset: () => { last = null; } };
})();
