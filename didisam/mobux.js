/* 디디쌤 스튜디오 v25.2 — 휴대폰 화면 정리
   대표님(2026-11-03): '모바일 뷰에서 왜 체크박스가 두 개 있지? 모바일에서는 AI SAM 챗봇이 없자나? 모바일 UI/UX도 체크해줘'
   - 넓은 표(열 4개 이상)는 휴대폰에서 카드로 쌓는다: 첫 칸(선택) · 주 항목(굵게) · 나머지는 '이름: 값' 두 줄 칸 · 마지막 버튼은 오른쪽.
     가로 스크롤로 오른쪽 열(등급 · 상태 · 버튼)이 잘려 보이지 않던 문제를 없앤다.
   - AI SAM은 fab.js가 휴대폰에서도 떠 있는 버튼 + 전체 화면 시트로 연다('대화 | 화면' 전환 탭 없음). */
'use strict';
const mobNarrow = () => innerWidth <= 860;
function mobCards() {
  document.querySelectorAll('.bcanvas .tw table, .bcanvas table.tbl').forEach(tb => {
    const on = mobNarrow(); if (!on) { tb.classList.remove('mcard'); return; }
    const hs = [...tb.querySelectorAll(':scope > thead th')].map(th => th.textContent.replace(/\s+/g, ' ').trim());
    if (hs.length < 4 || tb.closest('.cal, .tt, .grid-cal, .nomcard')) return;
    tb.classList.add('mcard');
    tb.querySelectorAll(':scope > tbody > tr').forEach(tr => { let first = true;
      [...tr.cells].forEach((td, i) => { if (td.colSpan > 1) { td.classList.add('mcfull'); return; }
        const l = hs[i] || ''; const hasCk = !!td.querySelector('input[type=checkbox]') && !td.textContent.trim();
        if (hasCk) { td.classList.add('mcck'); return; }
        if (!l) { td.classList.add('mcact'); return; }
        if (first) { td.classList.add('mc1'); first = false; return; }
        td.dataset.l = l; }); });
  });
}
AFTER.push(() => { try { mobCards(); } catch (e) { console.error(e); } });
let mobRZ = 0; addEventListener('resize', () => { clearTimeout(mobRZ); mobRZ = setTimeout(() => { try { mobCards(); } catch (e) { } }, 150); });
