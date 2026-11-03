/* v24 lhpedit — 공개 사이트(learner.html) 하위 메뉴
   - PC: lmerge가 그린 .smmi(상위) > .smdd(하위) 드롭다운에 aria 속성 · 키보드(↓ · Esc) 보강
   - 휴대폰 메뉴 시트(lux.js #luxSheet): 하위 메뉴가 있는 상위 메뉴를 펼침(아코디언)으로 묶는다(평평하게 나열되던 문제) */
'use strict';
(() => {
  const strip = s => String(s || '').replace('▾', '').replace(/\s*회원\s*$/, '').trim();
  function groups() { return [...document.querySelectorAll('header.lh nav.ln .smmi')].map(mi => ({ top: mi.querySelector(':scope > a'), subs: [...mi.querySelectorAll('.smdd a')] })).filter(g => g.top && g.subs.length); }
  function accordion(sheet) {
    const nav = sheet.querySelector('.lux-shl'); if (!nav || nav.dataset.acc) return; nav.dataset.acc = '1';
    groups().forEach((g, k) => { const href = g.top.getAttribute('href'); const kids = [...nav.children]; const a = kids.find(x => x.tagName === 'A' && x.getAttribute('href') === href); if (!a) return;
      const det = document.createElement('details'); det.className = 'lhp-acc'; const id = 'lhpacc' + k;
      det.innerHTML = `<summary aria-controls="${id}">${esc(strip(g.top.textContent))}</summary><div class="lhp-accb" id="${id}"></div>`; const body = det.lastElementChild;
      const top = a.cloneNode(true); top.textContent = `${strip(g.top.textContent)} 전체 보기`; top.classList.add('lhp-all'); body.appendChild(top);
      g.subs.forEach(sb => { const h = sb.getAttribute('href'); const x = [...nav.children].find(y => y.tagName === 'A' && y !== a && y.getAttribute('href') === h); const n = x || sb.cloneNode(true); n.textContent = strip(sb.textContent); n.classList.remove('on'); body.appendChild(n); });
      if (g.top.classList.contains('on') || g.subs.some(s => s.classList.contains('on'))) det.open = true;
      a.replaceWith(det); });
  }
  new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.id === 'luxSheet') try { accordion(n); } catch (e) { console.error('lhpedit', e); } })); }).observe(document.body, { childList: true });
  /* PC 드롭다운: 접근성 속성 · ↓로 하위 메뉴, Esc로 닫기 */
  function aria() { document.querySelectorAll('header.lh nav.ln .smmi').forEach((mi, k) => { if (mi.dataset.lhp) return; mi.dataset.lhp = '1'; const a = mi.querySelector(':scope > a'); const dd = mi.querySelector('.smdd'); if (!a || !dd) return; dd.id = dd.id || 'lhpdd' + k; a.setAttribute('aria-haspopup', 'true'); a.setAttribute('aria-controls', dd.id); dd.setAttribute('aria-label', strip(a.textContent) + ' 하위 메뉴'); }); }
  document.addEventListener('keydown', e => { const a = e.target.closest && e.target.closest('header.lh .smmi > a'); if (a && e.key === 'ArrowDown') { const f = a.parentElement.querySelector('.smdd a'); if (f) { e.preventDefault(); f.focus(); } }
    const d = e.target.closest && e.target.closest('header.lh .smdd'); if (d && e.key === 'Escape') { const t = d.parentElement.querySelector(':scope > a'); if (t) t.focus(); } });
  { let q = 0; new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; try { aria(); } catch (e) { } }); }).observe(document.getElementById('lapp') || document.body, { childList: true, subtree: true }); }
})();
