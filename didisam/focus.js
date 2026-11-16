/* 디디쌤 공용 포커스 관리(v33, QA #70) — 학습자 앱 · 학습자 웹 · 스튜디오 공통.
   열리는 대화 상자(aria-modal="true" · dialog[open] · 휴대폰 전체 폭 AI 튜터 창)를 MutationObserver로 찾아
   ① 첫 포커스 ② Tab · Shift+Tab을 그 안에서만 순환 ③ Esc로 닫기(닫기 · 취소 버튼이 있을 때만 — 확인만 받는 관문 창은 닫지 않음)
   ④ 닫힌 뒤 연 버튼으로 포커스 복귀를 처리한다. 기존 열기 · 닫기 코드는 고치지 않는다. */
(function () {
  if (window.FOCUSM) return;
  const SEL = '[aria-modal="true"], dialog[open], .lt-panel.on';
  const FOC = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), summary, iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const CLOSE = '[data-act="modal-close"], [data-ap="sheet-x"], [data-ap="dlg-x"], [data-lux="close"], [data-tact="close"], [data-shx], [data-c2x], [data-ac="dlgx"], .la-x, .shp-x, .mh .x, button.x, [aria-label="닫기"], [aria-label$="닫기"]';
  const vis = el => { if (!el || !el.isConnected) return false; if (!el.getClientRects().length) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  /* 학습자 AI 튜터 창은 휴대폰에서 아래 시트(전체 폭)일 때만 모달로 본다. PC 옆 패널은 페이지와 함께 쓴다 */
  const isModal = el => { if (!vis(el)) return false; if (el.matches('.lt-panel')) { if (el.hidden) return false; const r = el.getBoundingClientRect(); return r.width >= innerWidth - 2; } if (el.tagName === 'DIALOG' && !el.open) return false; return true; };
  const focusables = box => [...box.querySelectorAll(FOC)].filter(e => vis(e) && e.tabIndex >= 0 && !e.closest('[inert]') && !(e.tagName === 'INPUT' && e.type === 'radio' && !e.checked && box.querySelector(`input[type=radio][name="${CSS.escape(e.name)}"]:checked`)));
  /* 연 버튼을 다시 찾기 위한 표식(다시 그려져 원래 요소가 사라져도 같은 버튼을 찾는다) */
  const ATTR = ['id', 'data-ap', 'data-act', 'data-lux', 'data-tact', 'data-lact', 'data-ac', 'data-lc', 'data-shm', 'data-v', 'data-c', 'aria-label', 'href'];
  const sig = el => { if (!el || el === document.body) return null; const parts = []; ATTR.forEach(a => { const v = el.getAttribute(a); if (v != null && v !== '') parts.push(a === 'id' ? '#' + CSS.escape(v) : `[${a}="${CSS.escape(v)}"]`); }); return parts.length ? el.tagName.toLowerCase() + parts.join('') : null; };
  let lastOut = null; /* 대화 상자 밖에서 마지막으로 포커스 · 누른 요소 */
  const inAny = el => ST.some(s => s.box.contains(el));
  const note = el => { if (!el || el === document.body || el === document.documentElement || inAny(el) || el.closest(SEL)) return; lastOut = el; };
  document.addEventListener('focusin', e => note(e.target), true);
  document.addEventListener('pointerdown', e => { const t = e.target.closest && e.target.closest(FOC); if (t) note(t); }, true);
  const ST = []; /* 열린 대화 상자 스택 { box, opener, sig } */
  const first = box => { const ae = document.activeElement; if (ae && ae !== document.body && box.contains(ae)) return; const L = focusables(box); const pick = box.querySelector('[autofocus]') || L.find(e => !e.matches(CLOSE)) || L[0];
    if (pick) { try { pick.focus({ preventScroll: true }); } catch (e) { pick.focus(); } return; }
    if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); };
  const restore = s => { const ok = () => { const a = document.activeElement; return a && a !== document.body && a.isConnected && !ST.some(x => x.box.contains(a)); };
    const tryIt = () => { if (ok()) return true; let t = s.opener && s.opener.isConnected && vis(s.opener) ? s.opener : null; if (!t && s.sig) { try { t = [...document.querySelectorAll(s.sig)].find(vis) || null; } catch (e) { t = null; } } if (t && !inAny(t)) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } return document.activeElement === t; } return false; };
    if (ST.length) { const top = ST[ST.length - 1]; if (!top.box.contains(document.activeElement)) first(top.box); return; }
    if (!tryIt()) { requestAnimationFrame(() => { if (!tryIt()) setTimeout(tryIt, 120); }); } };
  let queued = false;
  const scan = () => { queued = false; const now = [...document.querySelectorAll(SEL)].filter(isModal).filter((el, i, a) => !a.some(o => o !== el && o.contains(el)));
    const gone = ST.filter(s => !now.includes(s.box)); const fresh = now.filter(el => !ST.some(s => s.box === el));
    gone.forEach(s => ST.splice(ST.indexOf(s), 1));
    /* 같은 순간 바뀐 창(시트 → 다른 시트, 다시 그리기)은 앞 창의 연 버튼을 물려받고 포커스를 되돌리지 않는다 */
    const inherit = gone.length ? gone[gone.length - 1] : null;
    fresh.forEach(box => { const op = inherit ? inherit.opener : (lastOut && lastOut.isConnected ? lastOut : (document.activeElement !== document.body && !box.contains(document.activeElement) ? document.activeElement : null));
      ST.push({ box, opener: op, sig: inherit ? inherit.sig : sig(op) }); first(box); });
    if (gone.length && !fresh.length) restore(gone[gone.length - 1]); };
  const kick = () => { if (!queued) { queued = true; Promise.resolve().then(scan); } };
  const start = () => { new MutationObserver(kick).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden', 'class', 'aria-modal', 'style'] }); kick(); };
  if (document.documentElement) start(); else addEventListener('DOMContentLoaded', start);
  addEventListener('resize', kick);
  /* Tab 가두기 */
  document.addEventListener('keydown', e => { if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return; const s = ST[ST.length - 1]; if (!s || !s.box.isConnected) return;
    const L = focusables(s.box); if (!L.length) { e.preventDefault(); s.box.focus(); return; } const a = document.activeElement; const i = L.indexOf(a);
    if (e.shiftKey) { if (i <= 0) { e.preventDefault(); L[L.length - 1].focus(); } } else if (i === -1 || i === L.length - 1) { e.preventDefault(); L[0].focus(); } }, true);
  /* Esc: 화면 고유 처리가 먼저 닫으면 그대로 두고, 남아 있으면 닫기 · 취소 버튼을 대신 누른다 */
  addEventListener('keydown', e => { if (e.key !== 'Escape' || e.isComposing) return; const s = ST[ST.length - 1]; if (!s) return; const box = s.box;
    setTimeout(() => { if (!box.isConnected || !isModal(box)) return; if (box.tagName === 'DIALOG') { try { box.close(); } catch (x) { } return; }
      const root = box.closest('.mwrap, .ap-sheet, .lux-sheet, .shp-mw, .la-ov, .cpl-mw, .l26dlg') || box;
      const b = [...root.querySelectorAll(CLOSE)].find(vis) || [...root.querySelectorAll('button')].filter(vis).find(x => /^(닫기|취소|나중에)$/.test((x.textContent || '').trim()));
      if (b) b.click(); }, 0); });
  window.FOCUSM = { stack: ST, scan };
})();
/* v43.4 P0 휴대폰(≤760px) 공통 — 관리자 · 학습자 웹/앱 · 빌더가 함께 쓴다(focus.js는 두 화면 모두 싣는다). PC(761px 이상)에서는 아무것도 하지 않는다.
   ① 가로로 넘기는 칩 · 탭 줄(overflow-x auto/scroll, 높이 130px 미만)이 넘치면 .hx-fade — 오른쪽 끝을 흐리게 하고 마지막 항목 뒤에 16px 여백을 둔다.
      끝까지 넘기면 .hx-end(오른쪽 흐림 없음), 처음에서 벗어나면 .hx-st(왼쪽도 흐림). 줄 안 「···」 메뉴가 열려 있으면 흐림을 끈다.
   ② 떠 있는 버튼(AI SAM #fabBtn · AX 튜터 #tbFab)이 멈춘 자리에서 글자 · 버튼 · 배지를 덮으면 .fab-edge — 화면 오른쪽 가장자리 손잡이(폭 30px)로
      비켜 카드 안쪽 내용을 가리지 않는다. 덮을 것이 없으면 원래 동그라미로 돌아간다. 기능 · id · data-act는 그대로 */
(function () {
  if (window.__hxOn) return; window.__hxOn = 1;
  const MQ = matchMedia('(max-width:760px)');
  const css = `@media (max-width:760px){
.hx-fade{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 52px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 52px),transparent)}
.hx-fade.hx-st{-webkit-mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 52px),transparent);mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 52px),transparent)}
.hx-fade.hx-end{-webkit-mask-image:none;mask-image:none}
.hx-fade.hx-end.hx-st{-webkit-mask-image:linear-gradient(90deg,transparent,#000 24px);mask-image:linear-gradient(90deg,transparent,#000 24px)}
.hx-fade:is(:has(details[open]),:has([aria-expanded="true"])){-webkit-mask-image:none!important;mask-image:none!important}
.hx-fade.hx-fx::after{content:'';flex:0 0 16px;align-self:stretch;width:16px;min-width:16px}
.hx-fade.hx-pr{padding-right:16px}
#fabBtn.fab-edge,#tbFab.tb-fab.fab-edge{right:0!important;width:30px!important;min-width:30px!important;height:52px!important;padding:0!important;gap:0!important;border-radius:14px 0 0 14px!important}
#fabBtn.fab-edge>:not(svg),#tbFab.tb-fab.fab-edge>:not(svg){position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important}
#fabBtn.fab-edge>svg,#tbFab.tb-fab.fab-edge>svg{width:18px;height:18px;margin-left:2px}
}`;
  const st = document.createElement('style'); st.id = 'hx43css'; st.textContent = css; (document.head || document.documentElement).appendChild(st);
  const end = e => { e.classList.toggle('hx-end', e.scrollLeft + e.clientWidth >= e.scrollWidth - 3); e.classList.toggle('hx-st', e.scrollLeft > 3); };
  /* 브리핑 머리 줄(.l43-eye)의 긴 날짜 「2026년 11월 17일 (화)」는 휴대폰에서 「11.17(화)」로 — 줄이 꺾이지 않게(048). PC로 돌아가면 원래 글로 */
  const RX = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\(.\))?/g;
  const eyes = m => document.querySelectorAll('.l43-eye').forEach(e => { const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) { if (m) { if (RX.test(t.textContent)) { RX.lastIndex = 0; t.__o = t.textContent; t.textContent = t.textContent.replace(RX, (a, y, mo, d, wd) => `${mo}.${d}${wd || ''}`); } RX.lastIndex = 0; } else if (t.__o) { t.textContent = t.__o; t.__o = null; } } });
  const scan = () => { eyes(MQ.matches); if (!MQ.matches) { document.querySelectorAll('.hx-fade').forEach(e => e.classList.remove('hx-fade', 'hx-end', 'hx-st', 'hx-fx', 'hx-pr')); return; }
    const all = document.body ? document.body.getElementsByTagName('*') : [];
    for (let i = 0; i < all.length; i++) { const e = all[i]; if (/^(TEXTAREA|INPUT|SELECT|svg|IFRAME|TABLE|PRE|CODE)$/.test(e.tagName)) continue;
      const on = e.classList.contains('hx-fade'); const w = e.clientWidth, sw = e.scrollWidth;
      if (!on && sw <= w + 2) continue; const cs = getComputedStyle(e);
      const ok = /auto|scroll/.test(cs.overflowX) && e.clientHeight > 0 && e.clientHeight < 130 && sw > w + 2 - (on ? 24 : 0) && !e.querySelector('table');
      if (ok && !on) { e.classList.add('hx-fade', /flex/.test(cs.display) ? 'hx-fx' : 'hx-pr'); }
      else if (!ok && on) { e.classList.remove('hx-fade', 'hx-end', 'hx-st', 'hx-fx', 'hx-pr'); continue; }
      if (ok) end(e); } };
  /* ② 떠 있는 버튼 비키기 */
  const HIT = 'button,a,input,select,textarea,img,video,canvas,label,summary,[data-act],[role=button],[class*=badge],[class*=tag],[class*=chip]';
  const fabs = () => [document.getElementById('fabBtn'), document.getElementById('tbFab')].filter(Boolean);
  const covers = f => { const r = f.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || getComputedStyle(f).visibility === 'hidden') return false;
    for (const fx of [.2, .5, .8]) for (const fy of [.2, .5, .8]) { const x = r.left + r.width * fx, y = r.top + r.height * fy; const L = document.elementsFromPoint(x, y); const e = L.find(z => z !== f && !f.contains(z)); if (!e || e === document.body || e === document.documentElement) continue;
      if (e.closest(HIT) && !e.closest('nav.tabbar,.ap-nav,.lux-bn,.hps-rail')) return true; if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return true; }
    return false; };
  const place = () => { fabs().forEach(f => { if (!MQ.matches || document.body.classList.contains('hps-dock')) { f.classList.remove('fab-edge'); return; } const was = f.classList.contains('fab-edge'); if (was) f.classList.remove('fab-edge'); const c = covers(f); f.classList.toggle('fab-edge', c); }); };
  let t1 = 0, t2 = 0; const later = () => { clearTimeout(t1); t1 = setTimeout(() => { scan(); place(); }, 220); };
  addEventListener('scroll', ev => { const e = ev.target; if (e && e.classList && e.classList.contains('hx-fade')) end(e); clearTimeout(t2); t2 = setTimeout(place, 400); }, true);
  addEventListener('resize', later); addEventListener('hashchange', later); addEventListener('load', later);
  const go = () => { later(); try { new MutationObserver(m => { if (m.some(x => x.target.id !== 'hx43css' && !(x.type === 'attributes'))) later(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { } };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
  window.HX43 = { scan, place };
})();
