/* v43 화면 테마: 라이트 / 다크 / 기기 설정 따름 — 스튜디오(index.html) · 학습자(learner.html) 공용
   - <head>에서 동기 로드한다(CSP가 인라인 스크립트를 막으므로 한 줄 <script src="theme.js">로 깜빡임을 막는다).
   - 저장: localStorage 'didisam.theme' = 'light' | 'dark' | 'system'(기본). 읽기 · 쓰기는 모두 try/catch.
   - 결과: <html data-theme="light|dark">. 수료증 · 인쇄 · 메일 미리보기는 CSS에서 항상 라이트로 둔다.
   - 토글 UI: 스튜디오 상단(header.top .topr) 아이콘 1개, 학습자 「나」(.ls-me) 3칸 세그먼트. 화면을 다시 그려도 자동으로 다시 붙는다.
   인터페이스: window.DDTheme = { get() → 저장 값, mode() → 실제 적용 'light'|'dark', set(v) } */
(function () {
  'use strict';
  var KEY = 'didisam.theme', root = document.documentElement, mq = null;
  try { mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null; } catch (e) { mq = null; }
  function get() { var v = null; try { v = localStorage.getItem(KEY); } catch (e) { v = null; } return v === 'light' || v === 'dark' ? v : 'system'; }
  function mode(v) { v = v || get(); return v === 'system' ? (mq && mq.matches ? 'dark' : 'light') : v; }
  function apply() { var m = mode(); if (root.getAttribute('data-theme') !== m) root.setAttribute('data-theme', m); sync(); }
  function set(v) { if (v !== 'light' && v !== 'dark') v = 'system'; try { if (v === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) { /* 저장이 막혀도 이번 화면에는 적용한다 */ } root.setAttribute('data-theme', mode(v)); cur = v; sync(); }
  var cur = get();
  apply();
  if (mq) { var on = function () { if ((cur || get()) === 'system') apply(); }; if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on); }

  var NAME = { light: '라이트', dark: '다크', system: '기기 설정' };
  var SV = function (d) { return '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var ICO = {
    light: SV('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    dark: SV('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
    system: SV('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>')
  };
  var ORDER = ['system', 'light', 'dark'];
  function cur0() { return cur || get(); }
  /* 스튜디오 상단 아이콘: 누를 때마다 기기 설정 → 라이트 → 다크 순서로 바뀐다 */
  function topBtn() { var v = cur0(); return '<button type="button" class="thm-tg" data-thm="cycle" aria-label="화면 테마 바꾸기(현재: ' + NAME[v] + ')" title="화면 테마: ' + NAME[v] + '">' + ICO[v === 'system' ? 'system' : v] + '</button>'; }
  /* 학습자 「나」 3칸 세그먼트 */
  function seg() { var v = cur0(); return '<div class="thm-box"><b class="thm-lb" id="thmLb">화면 테마</b><div class="thm-seg" role="radiogroup" aria-labelledby="thmLb">' +
    ['light', 'dark', 'system'].map(function (k) { return '<button type="button" role="radio" aria-checked="' + (v === k) + '" class="' + (v === k ? 'on' : '') + '" data-thm="' + k + '">' + ICO[k] + '<span>' + NAME[k] + '</span></button>'; }).join('') + '</div></div>'; }
  function sync() {
    if (!document.body) return;
    var t = document.querySelectorAll('.thm-tg'); for (var i = 0; i < t.length; i++) t[i].outerHTML = topBtn();
    var s = document.querySelectorAll('.thm-box'); for (var j = 0; j < s.length; j++) s[j].outerHTML = seg();
  }
  function mount() {
    var tr = document.querySelector('header.top .topr'); if (tr && !tr.querySelector('.thm-tg')) tr.insertAdjacentHTML('afterbegin', topBtn());
    var me = document.querySelector('.ls-me'); if (me && !me.querySelector('.thm-box')) me.insertAdjacentHTML('beforeend', seg());
  }
  function boot() {
    mount(); var q = false;
    try { new MutationObserver(function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; mount(); }); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* 관찰이 안 되면 첫 화면에만 붙인다 */ }
    document.addEventListener('click', function (e) { var b = e.target && e.target.closest ? e.target.closest('[data-thm]') : null; if (!b) return; e.preventDefault(); e.stopPropagation(); var v = b.getAttribute('data-thm'); if (v === 'cycle') v = ORDER[(ORDER.indexOf(cur0()) + 1) % 3]; set(v); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.DDTheme = { get: get, mode: mode, set: set };
})();
