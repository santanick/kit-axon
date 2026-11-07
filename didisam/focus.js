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
