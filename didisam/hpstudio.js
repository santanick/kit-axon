/* v36 hpstudio — 한 화면 홈페이지 편집기(대표님 2026-11-09 지시 4)
   '홈페이지를 편집하는 모든 화면이 한 화면에서 — 상위 메뉴를 누르면 그 페이지에서 바로 프롬프트로 빌드, 더블 클릭으로 문구 · 이미지 교체,
    화면을 더 크게 · 스크롤 밀림 없이, 네모 칸 채우기 대신 웹빌더처럼 심플하게, 템플릿 → AI(코드 블록) → 기본 설정 → 완성, 디테일은 아이콘으로'
   ① 사이트 화면 = 편집기: 스튜디오 본문 자리(머리 · 왼쪽 메뉴 제외)에 「화면에서 바로 고치기」(hpai #hpe)를 붙여 연다(docked). 따로 있던
      'AI로 홈페이지 만들기 · 홈페이지 · 메뉴 · 디자인 · 학습 페이지 · 콘텐츠 · 템플릿 바꾸기'는 오른쪽 아이콘 줄(패널)로 모은다.
   ② 위: 사이트 상위 메뉴 탭(홈 · 소개 · 강좌 …, 하위 메뉴는 둘째 줄). 누르면 그 페이지가 캔버스에 — 학습 페이지(강좌 목록 · 커뮤니티 등)로
      연결되는 메뉴는 게시된 학습 페이지를 같은 출처로 보여 준다. 캔버스 안 메뉴를 눌러도 같은 페이지로 바뀐다.
   ③ 페이지 프롬프트: 「말로 고치기」 줄이 지금 페이지를 대상으로 한다. 알아듣지 못한 말은 '이 페이지 만들기'(Claude 연결 시 Claude, 없으면 규칙)로,
      코드 블록(```html · JSON 섹션 설계)은 붙여 넣으면 코드 칸이 열리고 그대로 섹션으로 들어간다(HTML은 정화 · 스크립트는 정운영자만 격리 실행).
   ④ 캔버스: PC는 실제 1280 폭으로 그려 화면에 맞춰 줄이고(맞춤 · 100 · 75 · 50%), 휴대폰 390. 화면 전체가 고정이라 스크롤해도 밀리지 않는다.
   ⑤ 고치기: 한 번 누르면 고르기(테두리 + '두 번 눌러 고치기'), 두 번 누르면 글 · 사진 고치기(hpai · hpimg 그대로). 섹션 도구는 작은 막대
      (위 · 아래 · 복제 · 삭제 · 디자인 ▾ · AI), 섹션 사이 [+ 섹션]은 미리보기 그림이 있는 갤러리.
   ⑥ 처음 흐름: ① 템플릿 → ② AI로 바꾸기 → ③ 기본 정보(기관명 · 연락처 · 로고 · 색) → ④ 게시. 다 하면 줄이 사라진다.
   ⑦ 버그: 미리보기 iframe(srcdoc)은 기준 주소가 스튜디오(index.html)라서 '#p-소개' 같은 메뉴 링크가 스튜디오 주소로 이동했고,
      운영 서버가 index.html에 X-Frame-Options: DENY · frame-ancestors 'none'을 주므로 '연결을 거부했습니다'가 떴다 → 모든 미리보기 iframe의
      링크를 가로채 같은 문서 안 이동(#p-…)만 하게 한다(서버 보안 헤더는 그대로 — 스튜디오를 액자에 넣지 못하게 하는 것이 맞다).
   데이터: site.hpsTplAt · hpsAiAt · hpsBasicAt(처음 흐름 완료 표시) · hpsFlowOff, S.settings.footer(tel · mail · addr · hours · company), site.gnb.logo, site.color */
'use strict';
(() => {
  if (typeof VIEWS === 'undefined' || typeof ACT === 'undefined' || typeof AFTER === 'undefined') return;
  const $1 = s => document.querySelector(s);
  const E = v => (typeof esc === 'function' ? esc(v) : String(v == null ? '' : v));
  const A = v => Array.isArray(v) ? v : [];
  const clone = o => JSON.parse(JSON.stringify(o));
  const HS = window.HPS2 = { zoom: 'fit', pan: '', lv: null, dock: false, sig: '' };
  try { const z = localStorage.getItem('didisam.hps.zoom'); if (/^(fit|100|75|50)$/.test(z || '')) HS.zoom = z; } catch (e) { }
  const SV = (d, s = 20, w = 1.8) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const P = {
    sec: '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/>',
    menu: '<path d="M4 6h16M4 12h10M4 18h7"/>',
    design: '<path d="M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0021 9.8C21 6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    basic: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16.5c.8-1.7 2-2.5 3.5-2.5s2.7.8 3.5 2.5M14.5 10h4M14.5 13.5h3"/>',
    tpl: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    ai: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
    learn: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5"/>',
    seo: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    more: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
    del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>', ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', plus: '<path d="M12 5v14M5 12h14"/>'
  };
  const lbl = () => (typeof t === 'function' ? t('cls') : '강좌');
  /* 유형별 메뉴 이름(대학 '클래스' → '교육과정' 등 — hpsec-nav HPS.menuName, 캔버스 머리글 · 게시본과 같은 규칙) */
  /* 세부 설정의 섹션 종류 이름 '클래스'도 유형별 용어로(site.js SEC — 값만 바꿈) */
  try { if (typeof SEC !== 'undefined' && SEC.classes) Object.defineProperty(SEC.classes, 'n', { get: () => (typeof S !== 'undefined' && S && S.org && typeof t === 'function' ? `${t('cls')} 목록` : '클래스'), configurable: true }); } catch (e) { }
  const mName = l => { try { return window.HPS && typeof HPS.menuName === 'function' ? HPS.menuName(l) : l; } catch (e) { return l; } };
  const aiOn = () => typeof CL !== 'undefined' && CL.on && CL.on('site');
  const pagesOf = s => (typeof s2pages === 'function' ? s2pages(s) : [{ key: 'home', label: '홈', sections: s.sections }]).filter(p => Array.isArray(p.sections));
  const pageOf = key => pagesOf(site()).find(p => p.key === key);
  const say = (m, k) => { if (typeof toast === 'function') toast(m, k); };
  const persist = () => { try { save(); } catch (e) { console.error('hps save', e); } };
  const paint = () => { if (HPE.on && typeof window.hpPaint === 'function') window.hpPaint(); };
  const push = () => { try { if (typeof window.hpPush === 'function') window.hpPush(); } catch (e) { } };
  const isPub = () => (typeof smIsPub === 'function' ? smIsPub() : !!(S.site && S.site.published));
  const learnerURL = () => (typeof lsLearnerURL === 'function' ? lsLearnerURL() : 'learner.html');

  /* ═════════ 1. 미리보기 링크 가드('연결을 거부했습니다' 수정) ═════════
     srcdoc 문서의 기준 주소는 부모(index.html)라서 href="#p-x"가 'index.html#p-x'로 풀려 스튜디오 주소로 이동한다(운영 서버는 index.html을 액자에 넣지 못하게 막음).
     sandbox="allow-same-origin"(스크립트 없음) 미리보기도 부모가 단 이벤트는 동작하므로, 링크 · 폼을 가로채 같은 문서 안 이동만 한다. */
  const guarded = new WeakSet();
  function guardFrame(f) {
    if (!f || f.id === 'hpeF') return; let doc = null; try { doc = f.contentDocument; } catch (e) { return; } if (!doc || guarded.has(doc)) return;
    if (!/^about:(srcdoc|blank)/.test(String(doc.URL || ''))) return; guarded.add(doc); const win = doc.defaultView; if (!win) return;
    win.addEventListener('click', e => { const a = e.target && e.target.closest && e.target.closest('a[href]'); if (!a) return; const h = a.getAttribute('href') || ''; e.preventDefault();
      if (h.charAt(0) === '#') { const id = h.slice(1); try { if (id) win.location.hash = id; else win.scrollTo(0, 0); } catch (x) { const el = id && doc.getElementById(id); if (el) el.scrollIntoView(); } return; }
      if (/^https?:\/\//i.test(h)) { try { window.open(h, '_blank', 'noopener'); } catch (x) { } return; }
      say('미리보기에서는 다른 주소로 이동하지 않습니다. 게시된 사이트에서 확인하세요.'); }, true);
    win.addEventListener('submit', e => e.preventDefault(), true);
  }
  window.hpsGuard = guardFrame;
  const scanFrames = () => document.querySelectorAll('iframe').forEach(f => { if (f.id === 'hpeF' || f.dataset.hpsG) return; f.dataset.hpsG = 1; f.addEventListener('load', () => guardFrame(f)); guardFrame(f); });
  document.addEventListener('load', e => { const f = e.target; if (f && f.tagName === 'IFRAME') guardFrame(f); }, true);
  new MutationObserver(() => scanFrames()).observe(document.documentElement, { childList: true, subtree: true });

  /* ═════════ 2. 사이트 화면 = 편집기(본문 자리에 붙임) ═════════ */
  /* v37(대표님 2026-11-10 지시 2): 편집기에서 다른 화면으로 나가는 길(세부 설정 · 학습 페이지 화면 + '‹ 한 화면 편집기로' 줄)을 없앴다 — 모두 편집기 안 패널 */
  const want = () => { if (typeof UI !== 'undefined' && UI.hpsLegacy) { HS.big = UI.hpsLegacy === 'learn' ? 'learn' : 'site'; delete UI.hpsLegacy; } return !!(S && S.org && S.site && typeof CUR !== 'undefined' && CUR.tab === 'site' && !UI.siteGallery && typeof window.hpEdit === 'function'); };
  function place() { const w = $1('#hpe'); if (!w || !HS.dock) return; const hd = $1('header.top'); const m = $1('#main');
    let top = hd ? Math.max(0, Math.round(hd.getBoundingClientRect().bottom)) : 0; const rl = $1('nav.brail'); if (rl) { const r = rl.getBoundingClientRect(); if (r.width > r.height && r.height > 0 && r.top <= top + 2 && getComputedStyle(rl).display !== 'none') top = Math.max(top, Math.round(r.bottom)); } /* 휴대폰: 가로 메뉴 줄 아래에 붙인다 */ const left = m ? Math.max(0, Math.round(m.getBoundingClientRect().left)) : 0;
    const bn = [...document.querySelectorAll('.bnav, nav.mnav, .tabbar, nav.brail')].find(n => { const r = n.getBoundingClientRect(); return r.width > innerWidth * .6 && r.top > innerHeight * .6 && getComputedStyle(n).position === 'fixed'; });
    const bot = bn ? Math.max(0, Math.round(innerHeight - bn.getBoundingClientRect().top)) : 0;
    w.style.setProperty('--hps-t', top + 'px'); w.style.setProperty('--hps-l', left + 'px'); w.style.setProperty('--hps-b', bot + 'px'); layout(); }
  addEventListener('resize', () => { place(); fit(); });
  function dockOn() { if (!HS.dock && !HS.devSet && innerWidth < 760) { HS.devSet = 1; if (HPE.dev !== 'mo') { HPE.dev = 'mo'; if (ACT['hpe-dev']) setTimeout(() => ACT['hpe-dev']({ dataset: { v: 'mo' } }), 0); } } HS.dock = true; document.body.classList.add('hps-dock'); const w = $1('#hpe'); if (w) { w.classList.add('hps'); w.setAttribute('role', 'region'); w.removeAttribute('aria-modal'); w.setAttribute('aria-label', '홈페이지 편집기'); } place(); }
  function dockOff() { HS.dock = false; HS.pan = ''; HS.lv = null; HS.gal = 0; document.body.classList.remove('hps-dock', 'hps-talk-on', 'hps-gal-on'); const g = $1('#hpsGal'); if (g) g.remove(); }
  AFTER.push(() => {
    try {
      if (want()) {
        if (!HPE.on || !$1('#hpe')) { const k = UI.sitePage && pageOf(UI.sitePage) ? UI.sitePage : (HPE.key || 'home');
          if ($1('#modal')) { /* 열린 창(hpEdit가 닫음)을 지키고, 창이 닫힌 뒤 편집기를 연다 */ if (!HS.waitM) HS.waitM = setInterval(() => { if ($1('#modal')) return; clearInterval(HS.waitM); HS.waitM = 0; if (want() && !HPE.on) render(); }, 400); return; }
          /* 닫았다 바로 다시 연 경우(hpimg는 #hpe가 없어질 때만 정리) 떠 있던 사진 · 글자 도구를 닫는다 */ try { const ix = $1('#hpiImg [data-hpi-i="x"]'), tx = $1('#hpiTb [data-hpi="x"]'); if (ix) ix.click(); if (tx) tx.click(); } catch (e) { }
          window.hpEdit(k); }
        else if (UI.sitePage && UI.sitePage !== HPE.key && pageOf(UI.sitePage) && HS.lastUI !== UI.sitePage) { HPE.key = UI.sitePage; HS.lv = null; paint(); }
        HS.lastUI = UI.sitePage; dockOn(); deco();
        const sig = JSON.stringify([A(site().menus).map(m => [m.id, m.l, m.on, m.link, m.subOn, A(m.subs).map(b => [b.id, b.l, b.on])]), site().gnb && site().gnb.logo ? 1 : 0, site().color, (S.settings && S.settings.footer) || {}]);
        if (HS.sig && HS.sig !== sig && !HS.lv) paint(); HS.sig = sig; panPaint();
      } else if (HS.dock) { if (HPE.on && typeof window.hpClose === 'function') window.hpClose(true); dockOff(); }
    } catch (e) { console.error('hps dock', e); }
  });
  /* 사이트 메뉴: 편집기가 열려 있으면 본문은 비워 둔다(고급 설정 · 템플릿 고르기는 기존 화면 + 돌아가기 줄) */
  { const base = VIEWS.site; VIEWS.site = (...a) => {
      if (want()) { /* sl-page: 다른 파일의 안내(게시본 머리글 이전 등)가 붙는 자리 — 편집기 위로 옮긴다.
          v37 세부 설정 · 학습 페이지(예전 화면)는 본문에 그린 뒤(그 화면의 AFTER 연결이 그대로 동작) 편집기 안 큰 패널(#hpsBig)로 옮긴다 */
        let src = ''; if (HS.big) { const keep = UI.smT; UI.smT = HS.big === 'learn' ? 'learn' : 'home'; try { src = base(...a); } catch (e) { console.error(e); } finally { UI.smT = keep; } }
        return `<div class="hps-host sl-page" aria-hidden="true">${src ? `<div class="hps-bigsrc">${src}</div>` : ''}</div>`; }
      let h = ''; try { h = base(...a); } catch (e) { console.error(e); }
      return h; }; }
  ACT['hps-back'] = () => { HS.big = ''; UI.siteGallery = false; render(); };
  ACT['hps-legacy'] = el => bigOpen(el && el.dataset && el.dataset.v === 'learn' ? 'learn' : 'site');
  /* 닫기 · Esc는 편집기 화면에서는 쓰지 않는다(사이트 화면 자체이므로) */
  addEventListener('keydown', e => { if (!HS.dock || e.key !== 'Escape') return; const tg = e.target; if ($1('#modal') || (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)))) return; const HI = window.HPI; const ix = HI && HI.ip && $1('#hpiImg [data-hpi-i="x"]'), tx = HI && HI.tb && $1('#hpiTb [data-hpi="x"]'); /* 사진 · 글자 도구가 떠 있으면 그것만 닫는다 */
    if (ix || tx) { if (ix) ix.click(); if (tx) tx.click(); e.stopImmediatePropagation(); return; } if (HS.gal && !$1('#slSheet')) { galClose(); e.stopImmediatePropagation(); return; } if (HS.sheet) { sheetClose(); e.stopImmediatePropagation(); return; } if (HS.pan) { panClose(); e.stopImmediatePropagation(); return; } e.stopImmediatePropagation(); }, true);
  /* 편집기를 닫지 않고 창만 연다 */
  { const base = ACT['hpai-open']; ACT['hpai-open'] = (...a) => { if (!HS.dock) return base(...a); const pre = HPE.pre; HPE.pre = null; return window.hpOpen(pre || undefined); }; }
  { const base = ACT['hpm-open']; ACT['hpm-open'] = (...a) => { if (!HS.dock || typeof window.hpMenus !== 'function') return base(...a); return panOpen('menu'); }; } /* v37: 메뉴 편성은 편집기 안 오른쪽 패널 */
  { const base = ACT['tpl-use']; if (base) ACT['tpl-use'] = (...a) => { const r = base(...a); try { if (S.site) { S.site.hpsTplAt = today(); persist(); } } catch (e) { } return r; }; }
  { const base = ACT['tpd-use']; if (base) ACT['tpd-use'] = (...a) => { const r = base(...a); try { if (S.site) { S.site.hpsTplAt = today(); persist(); } } catch (e) { } return r; }; }

  /* ═════════ 3. 편집기 꾸미기(위 탭 · 처음 흐름 · 오른쪽 아이콘 줄) ═════════ */
  const SKIND = { class: '#shop', book: '#textbooks', community: '#comm' };
  const LEARN_OK = ['home', 'shop', 'comm', 'notice', 'textbooks', 'my', 'courses'];
  /* 게시본에서 메뉴가 어디로 가는지(sitemerge menuHref와 같은 규칙) — 학습 페이지면 { hash }, 외부 주소면 { url } */
  function target(it, parent) {
    const lk = String(it.link || '');
    if (lk.startsWith('learn:')) { const r = lk.slice(6); if (r === 'home') return { key: 'home' }; /* v37 학습 홈 = 홈페이지 홈 */ if (/^comm\/./.test(r)) return { hash: '#comm/' + encodeURIComponent(r.slice(5)) }; return { hash: '#' + (LEARN_OK.includes(r) ? r : 'home') }; }
    if (lk.startsWith('cls:')) return { hash: '#class/' + lk.slice(4) };
    if (lk.startsWith('url:')) return { url: lk.slice(4) };
    if (lk.startsWith('page:')) return { key: lk.slice(5) };
    if (parent) return { key: 's-' + parent.id + '-' + it.id };
    if (it.kind === 'home') return { key: 'home' };
    if (SKIND[it.kind]) return { hash: SKIND[it.kind] };
    if (it.kind === 'board') { const bid = ((S.boards || []).find(b => b.id !== '커뮤니티') || {}).id; return { hash: bid ? '#comm/' + encodeURIComponent(bid) : '#comm' }; } /* 게시본(sitemerge menuHref)과 같은 주소 */
    if (it.kind === 'notice') { const L = (S.lsite && S.lsite.pages) || []; if (L.some(p => p.id === 'notice' && p.on)) return { hash: '#notice' }; }
    return { key: 'm-' + it.id };
  }
  function tabsHTML() {
    const s = site(); const M = A(s.menus).filter(m => m.on !== false); const curKey = HS.lv ? HS.lv.tab : HPE.key;
    const topOf = k => { const m = M.find(m => (target(m).key === k) || ('m-' + m.id) === k || A(m.subs).some(b => 's-' + m.id + '-' + b.id === k || HS.lv && HS.lv.tab === 's-' + m.id + '-' + b.id)); return m; };
    const act = topOf(curKey) || (HS.lv && M.find(m => 't-' + m.id === HS.lv.tab));
    const tab = (m, parent) => { const k = parent ? 's-' + parent.id + '-' + m.id : (m.kind === 'home' ? 'home' : 'm-' + m.id); const tg = target(m, parent);
      const on = curKey === k || (!parent && act === m && !A(m.subs).some(b => 's-' + m.id + '-' + b.id === curKey));
      const note = tg.hash ? '학습 페이지' : tg.url ? '외부 주소' : '';
      const nm = (HS.lab && HS.lab[k]) || mName(m.l) || '메뉴'; const btn = `<button type="button" role="tab" class="hps-tab${on ? ' on' : ''}${note ? ' lp' : ''}" aria-selected="${on}" data-act="hps-pg" data-v="${E(k)}"${parent ? ` data-p="${E(parent.id)}"` : ''} data-m="${E(m.id)}"${note ? ` title="${note}로 연결 — 이 화면에서 바로 고칩니다"` : ''}>${E(nm)}${note ? `<i aria-hidden="true">${tg.hash ? '학습' : '외부'}</i>` : ''}</button>`;
      /* v37 지시 3: 탭에 마우스를 올리면 [＋ 하위 메뉴] — 홈 · 하위 메뉴 탭에는 없음 */
      return parent || m.kind === 'home' ? btn : `<span class="hps-tg">${btn}<button type="button" class="hps-tsub" data-act="hps-subadd" data-v="${E(m.id)}" title="「${E(nm)}」 아래에 하위 메뉴 만들기" aria-label="「${E(nm)}」 하위 메뉴 추가">${SV(P.plus, 13, 2.4)}<span>하위</span></button></span>`; };
    const subs = act && A(act.subs).filter(b => b.on !== false);
    const actNm = act ? mName(act.l) : '';
    const row2 = !act || act.kind === 'home' ? (site().hpsSubSeen ? '' : `<div class="hps-subs hps-sube"><span>하위 메뉴</span><em title="메뉴 탭에 마우스를 올리면 ＋ 하위가 보입니다. ＋ 페이지에서도 '하위 메뉴로 넣기'를 고를 수 있습니다.">탭에 마우스를 올리면 <b>＋ 하위</b> · <b>＋ 페이지</b>에서 '하위 메뉴로 넣기'</em><button type="button" class="hps-fx2" data-act="hps-subseen" aria-label="안내 닫기">${SV(P.x, 13, 2)}</button></div>`)
      : subs.length ? `<div class="hps-subs" role="tablist" aria-label="${E(actNm)} 하위 페이지"><span>${E(actNm)} ›</span>${tab(act, null).replace(/^<span class="hps-tg">/, '').replace(/<button type="button" class="hps-tsub"[\s\S]*$/, '').replace('hps-tab', 'hps-tab sub')}${subs.map(b => tab(b, act)).join('')}<button type="button" class="hps-tadd sm" data-act="hps-subadd" data-v="${E(act.id)}" title="「${E(actNm)}」 아래에 하위 메뉴 추가">${SV(P.plus, 14, 2)}<span>하위 메뉴</span></button></div>`
      : `<div class="hps-subs hps-sube"><span>${E(actNm)} ›</span><em>하위 메뉴가 없습니다.</em><button type="button" class="hps-tadd sm" data-act="hps-subadd" data-v="${E(act.id)}">${SV(P.plus, 14, 2)}<span>「${E(actNm)}」 하위 메뉴 만들기</span></button></div>`;
    return `<div class="hps-tabs" role="tablist" aria-label="사이트 페이지">${M.map(m => tab(m)).join('')}<button type="button" class="hps-tadd" data-act="hps-padd" aria-haspopup="dialog" title="페이지(메뉴) 추가 — 상위 메뉴 또는 하위 메뉴로">${SV(P.plus, 16, 2)}<span>페이지</span></button></div>` + row2;
  }
  ACT['hps-pg'] = el => { const k = el.dataset.v; const s = site(); const m = A(s.menus).find(x => x.id === el.dataset.p || x.id === el.dataset.m);
    const it = el.dataset.p ? A(m && m.subs).find(b => b.id === el.dataset.m) : m; const tg = it ? target(it, el.dataset.p ? m : null) : { key: k };
    /* v37 지시 2: 학습 페이지도 같은 캔버스 · 같은 도구(섹션 + 머리글 + 자동 목록) — 외부 주소만 캔버스 안 안내 카드 */
    if (tg.url || (tg.hash && !pageOf(k))) { HS.lv = { tab: k, hash: tg.hash || '', url: tg.url || '', name: (HS.lab && HS.lab[k]) || mName(it.l) }; if (HS.pan === 'sec') panClose(); deco(true); lvPaint(); return; }
    HS.lv = null; const key = tg.key && pageOf(tg.key) ? tg.key : pageOf(k) ? k : 'home'; HPE.key = key; UI.sitePage = key; HS.lastUI = key; lvPaint(); paint(); deco(true); };

  /* 처음 흐름: 템플릿 → AI로 바꾸기 → 기본 정보 → 게시 */
  const STEPS = [['tpl', '템플릿 고르기'], ['ai', 'AI로 원하는 대로 바꾸기'], ['basic', '기본 정보 넣기'], ['pub', '게시하기']];
  const stepDone = () => { const s = site(); return { tpl: !!(s.hpsTplAt || s.ai || !s.blank || s.hpsAiAt || s.hpsBasicAt), ai: !!(s.ai || s.hpsAiAt), basic: !!s.hpsBasicAt, pub: isPub() }; };
  function flowHTML() { const s = site(); const D = stepDone(); if (s.hpsFlowOff || STEPS.every(([k]) => D[k])) return '';
    const cur = (STEPS.find(([k]) => !D[k]) || STEPS[3])[0];
    const tip = { tpl: '마음에 드는 템플릿을 먼저 고르세요. 고른 뒤에도 글 · 사진 · 색은 모두 바꿀 수 있습니다.', ai: `아래 입력줄에 원하는 모습을 적거나 코드 블록을 붙여 넣으세요. 지금 보이는 페이지가 바로 바뀝니다.`, basic: '기관명 · 연락처 · 로고 · 대표 색만 넣으면 모든 페이지에 들어갑니다.', pub: '확인했으면 [게시하기]를 누르세요. 학습 사이트와 같은 주소에 함께 올라갑니다.' }[cur];
    return `<div class="hps-flow" role="group" aria-label="홈페이지 완성 순서"><ol>${STEPS.map(([k, n], i) => `<li class="${D[k] ? 'done' : ''}${k === cur ? ' cur' : ''}"><button type="button" data-act="hps-step" data-v="${k}" aria-current="${k === cur ? 'step' : 'false'}"><i>${D[k] ? SV(P.ok, 13, 2.6) : i + 1}</i>${n}</button></li>`).join('')}</ol>
      <p>${E(tip)}${cur === 'ai' ? ` <button type="button" class="hps-ln" data-act="hpai-open">시안 3개로 새로 만들기</button>` : ''}</p><button type="button" class="hps-fx" data-act="hps-flowoff" aria-label="완성 순서 닫기">${SV(P.x, 14, 2)}</button></div>`; }
  ACT['hps-step'] = el => { const k = el.dataset.v;
    if (k === 'tpl') return ACT['tpl-gallery']();
    if (k === 'ai') { const i = $1('#hpe .hpw-talk input[name=q]'); if (i) { i.focus(); const f = i.closest('form'); if (f) { f.classList.remove('hps-pulse'); void f.offsetWidth; f.classList.add('hps-pulse'); } } return; }
    if (k === 'basic') return panOpen('basic');
    if (k === 'pub') return ACT['hpe-pub'](); };
  ACT['hps-flowoff'] = () => { site().hpsFlowOff = 1; persist(); deco(true); };

  const RAIL = [['talk', 'AI에게 말하기', P.ai, 'hps-talk'], ['sec', '섹션', P.sec, 'hps-pan'], ['menu', '메뉴', P.menu, 'hps-pan'], ['design', '디자인', P.design, 'tpg-dz'], ['basic', '기본 정보', P.basic, 'hps-pan'], ['tpl', '템플릿', P.tpl, 'tpl-gallery'], ['ai', 'AI 새로', P.ai, 'hpai-open'], ['learn', '학습 페이지', P.learn, 'hps-big'], ['seo', '검색 노출', P.seo, 'hps-pan'], ['more', '세부 설정', P.more, 'hps-big']];
  const railHTML = () => `<nav class="hps-rail" aria-label="편집 도구">${RAIL.map(([k, n, ic, act]) => `<button type="button" class="hps-ri${k === 'talk' ? ' hps-mo' : ''}${(k === 'talk' && document.body.classList.contains('hps-talk-on')) || HS.pan === k || (HS.big && HS.big === ({ learn: 'learn', more: 'site' })[k]) || (k === 'design' && document.body.classList.contains('tpg-dz-on')) ? ' on' : ''}" data-act="${act}" data-v="${k}" title="${n}" aria-label="${n}"${act === 'hps-pan' ? ` aria-expanded="${HS.pan === k}"` : act === 'hps-big' ? ` aria-expanded="${HS.big === ({ learn: 'learn', more: 'site' })[k]}"` : ''}>${SV(ic, 20)}<span>${n}</span></button>`).join('')}</nav>`;
  const ZOOMS = [['fit', '맞춤'], ['100', '100%'], ['75', '75%'], ['50', '50%']];
  function deco(force) {
    const w = $1('#hpe'); if (!w || !HS.dock) return; const bar = w.querySelector('.hpe-bar'); if (!bar) return; w.classList.add('hps');
    if (!bar.dataset.hps || force) { bar.dataset.hps = 1;
      let tb = bar.querySelector('.hps-tw'); if (!tb) { tb = document.createElement('div'); tb.className = 'hps-tw'; bar.insertBefore(tb, bar.firstChild); } tb.innerHTML = tabsHTML();
      const dev = bar.querySelector('.hpe-dev'); if (dev && !bar.querySelector('.hps-zoom')) dev.insertAdjacentHTML('afterend', `<label class="hps-zoom"><span class="sr">화면 비율</span><select data-chg="hps-zoom" aria-label="화면 비율">${ZOOMS.map(([v, n]) => `<option value="${v}" ${HS.zoom === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`);
      const pub = bar.querySelector('[data-act="hpe-pub"]'); if (pub && !bar.querySelector('.hps-open')) pub.insertAdjacentHTML('beforebegin', `<a class="btn sm ghost hps-open" href="${E(learnerURL())}" target="_blank" rel="noopener">${SV(P.ext, 14)} 사이트 열기</a>`);
      const tk = tb.querySelector('.hps-tab.on'); if (tk && tk.scrollIntoView) try { tk.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } }
    const mg = $1('#main .hps-host .hpw2-mig'); if (mg) { const ex = w.querySelector('.hpw2-mig'); if (ex) ex.remove(); mg.classList.add('hps-note'); bar.insertAdjacentElement('afterend', mg); }
    let fl = w.querySelector('.hps-flow'); const fh = flowHTML(); if (fh) { if (!fl) { bar.insertAdjacentHTML('afterend', fh); } else if (force || fl.dataset.sig !== fh.length + '') { fl.outerHTML = fh; } fl = w.querySelector('.hps-flow'); if (fl) fl.dataset.sig = fh.length + ''; } else if (fl) fl.remove();
    /* hpwiz의 '말로 고치기' 줄은 body 변화 때 다시 붙는다 — 같은 순간에 닫고 다시 연 뒤 막대를 새로 그리면 빠지므로 한 번 깨운다 */
    if (!w.querySelector('.hpw-talk') && !HS.nudge) { HS.nudge = 1; const c = document.createComment('hps'); document.body.appendChild(c); setTimeout(() => { c.remove(); HS.nudge = 0; }, 0); }
    const talk = w.querySelector('.hpw-talk'); if (talk) talkDeco(talk); if (talk && fl && fl.nextElementSibling !== talk) fl.insertAdjacentElement('afterend', talk);
    let r = w.querySelector('.hps-rail'); if (!r) { w.insertAdjacentHTML('beforeend', railHTML()); } else if (force) r.outerHTML = railHTML();
    layout(); }
  new MutationObserver(() => { if (HS.dock) deco(); }).observe(document.body, { childList: true });
  { let mo = null; const hook = () => { const w = $1('#hpe'); if (!w) { if (mo) { mo.disconnect(); mo = null; } return; } if (!mo) { mo = new MutationObserver(() => { if (HS.dock) { deco(); } }); mo.observe(w, { childList: true }); } };
    new MutationObserver(hook).observe(document.body, { childList: true }); }
  ACT['hps-zoom'] = el => { HS.zoom = /^(fit|100|75|50)$/.test(el.value) ? el.value : 'fit'; try { localStorage.setItem('didisam.hps.zoom', HS.zoom); } catch (e) { } fit(); };

  /* 캔버스 · 아이콘 줄 · 패널 위치 */
  function layout() { const w = $1('#hpe'); if (!w || !HS.dock) return; const st = w.querySelector('.hpe-stage'); if (!st) return;
    const top = st.offsetTop; w.style.setProperty('--hps-st', top + 'px'); fit(); }
  function fit() { const w = $1('#hpe'); if (!w || !HS.dock) return; const st = w.querySelector('.hpe-stage'); const f = $1('#hpeF'); if (!st || !f) return;
    const cs = getComputedStyle(st); const pw = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); const ph = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (pw < 50 || ph < 50) return; const mo = HPE.dev === 'mo'; const W = mo ? 390 : 1280;
    let z = HS.zoom === 'fit' ? Math.min(1, pw / W) : (+HS.zoom || 100) / 100; z = Math.max(.2, Math.min(1, z)); if (HS.zoom === 'fit' && !mo && pw >= W) z = 1;
    const Wd = mo ? W : (HS.zoom === 'fit' && pw >= W ? Math.min(pw, 1440) : W); const H = Math.round(ph / z);
    Object.assign(f.style, { width: Wd + 'px', maxWidth: 'none', minWidth: '0', height: H + 'px', minHeight: '0', transform: z < 1 ? `scale(${z})` : '', transformOrigin: 'top left', marginRight: z < 1 ? `${-Math.round(Wd * (1 - z))}px` : '', marginBottom: z < 1 ? `${-Math.round(H * (1 - z))}px` : '', flex: '0 0 auto' });
    st.dataset.z = Math.round(z * 100); const zs = w.querySelector('.hps-zoom select'); if (zs) zs.title = `지금 ${Math.round(z * 100)}%`;
    const lv = w.querySelector('.hps-lv'); if (lv) { lv.style.height = ph + 'px'; const lw = lv.querySelector('.hps-lvw'), lf = lv.querySelector('.hps-lvf');
      if (lw && lf) { const hh = (lv.querySelector('.hps-lvh') || {}).offsetHeight || 0; const Hh = Math.max(120, ph - hh); lv.style.width = Math.round(Wd * z) + 'px'; lw.style.height = Hh + 'px';
        Object.assign(lf.style, { width: Wd + 'px', height: Math.round(Hh / z) + 'px', transform: z < 1 ? `scale(${z})` : '', transformOrigin: 'top left' }); } else lv.style.width = ''; } }

  /* 학습 페이지로 연결되는 메뉴(v36 R3 · 4-2): 학습자 화면 미리보기(learner.html?preview=1 — 지금 초안 lsSnapshot, 게시 전에도 보임)를 같은 비율로 띄우고,
     그 안 머리글(제목 · 소개 · 배경 사진 · 배치)을 두 번 눌러 고치거나 위 입력줄에 말로 고친다(site.lhead → 게시본 hp.lhead → lhead.js). 외부 주소는 새 창 버튼만. */
  const lvSrc = h => `learner.html?preview=1&r=${Date.now() % 1e6}${h || '#home'}`;
  function lvPaint() { const w = $1('#hpe'); if (!w) return; const st = w.querySelector('.hpe-stage'); if (!st) return; let lv = st.querySelector('.hps-lv');
    if (!HS.lv) { if (lv) lv.remove(); st.classList.remove('hps-lvon'); return; }
    const L = HS.lv; const url = learnerURL();
    const head = L.url ? `「${E(L.name)}」 메뉴는 외부 주소로 연결됩니다.` : `「${E(L.name)}」 학습 페이지<span class="hps-lvl"> — 목록은 ${E(lbl())} · 공지 · 게시판 데이터로 채워집니다. 머리글(제목 · 소개 · 배경 사진 · 배치)은 두 번 눌러 고치거나 위 입력줄에 말하세요.</span><span class="hps-lvs"> · 머리글은 두 번 눌러 고치기</span>`;
    const btns = L.url ? `<a class="btn sm" href="${E(/^https?:\/\//.test(L.url) ? L.url : '#')}" target="_blank" rel="noopener">${SV(P.ext, 14)} 새 창으로 열기</a>` : `<button type="button" class="btn sm" data-act="hps-big" data-v="learn">학습 페이지 설정</button>${isPub() ? `<a class="btn sm ghost" href="${E(url + L.hash)}" target="_blank" rel="noopener">${SV(P.ext, 14)} 게시본 보기</a>` : ''}<button type="button" class="btn sm ghost" data-act="hpm-open">메뉴 연결 바꾸기</button>`;
    const sig = (L.url ? 'u' : 'l') + '|' + L.tab + '|' + isPub();
    if (!lv) { lv = document.createElement('div'); lv.className = 'hps-lv'; st.appendChild(lv); }
    if (lv.dataset.k !== sig) { const keep = !L.url && lv.querySelector('#hpsLvF'); lv.dataset.k = sig;
      if (keep) { lv.querySelector('.hps-lvh').innerHTML = `<p>${head}</p><div>${btns}</div>`; }
      else lv.innerHTML = `<div class="hps-lvh"><p>${head}</p><div>${btns}</div></div>` + (L.url ? `<div class="hps-lvc"><b>외부 주소</b><p>${E(L.url)}</p></div>` : `<div class="hps-lvw"><iframe class="hps-lvf" id="hpsLvF" title="학습 페이지 미리보기 — ${E(L.name)}" src="${E(lvSrc(L.hash))}"></iframe></div>`); }
    const lf = lv.querySelector('#hpsLvF'); if (lf) { lf.title = `학습 페이지 미리보기 — ${L.name}`; try { const cw = lf.contentWindow; if (cw && cw.location && /learner\.html/.test(cw.location.pathname) && cw.location.hash !== L.hash && L.hash) cw.location.hash = L.hash; } catch (e) { } lhWatch(lf); }
    st.classList.add('hps-lvon'); fit(); }

  /* ═════════ 4. 캔버스 안: 한 번 = 고르기, 두 번 = 고치기 · 섹션 도구 막대 · [+ 섹션] 갤러리 ═════════ */
  const ICSS = `.hpe-tb{gap:0!important;padding:3px!important;border-radius:10px!important;top:8px!important;right:8px!important;align-items:center}
.hpe-tb>button,.hps-dd>button,.hps-ddw>button{display:inline-flex;align-items:center;gap:5px;min-height:34px;white-space:nowrap}
.hps-ddw>button{border:0;background:transparent;color:#fff;padding:7px 9px;border-radius:8px;cursor:pointer;font:inherit}.hps-ddw>button:hover,.hps-ddw>button:focus-visible{background:rgba(255,255,255,.18);outline:none}
.hpe-tb .hps-ib{width:34px;justify-content:center;padding:0!important}.hpe-tb svg{display:block}
.hpe-tb .hps-sep{width:1px;height:20px;background:rgba(255,255,255,.22);margin:0 3px}
.hps-ddw{position:relative;display:inline-flex}.hps-dd{display:none;position:absolute;right:0;top:calc(100% + 6px);background:#2A2B2B;border-radius:10px;padding:4px;min-width:150px;flex-direction:column;box-shadow:0 10px 28px rgba(0,0,0,.3);z-index:50}
.hps-ddw.open .hps-dd{display:flex}.hps-dd>button{width:100%;text-align:left;justify-content:flex-start;border:0;background:transparent;color:#fff;padding:8px 10px;border-radius:8px;cursor:pointer;font:inherit}.hps-dd>button:hover,.hps-dd>button:focus-visible{background:rgba(255,255,255,.16);outline:none}
.hpe-add{padding:0!important;height:0;overflow:visible}.hpe-add button{transform:translateY(-50%);opacity:0!important;transition:opacity .12s;background:#5C74F6!important;color:#fff!important;border:0!important;box-shadow:0 4px 14px rgba(92,116,246,.4);padding:0 16px!important;min-height:34px;line-height:34px}
.hpe-add:hover button,.hpe-add button:focus-visible,[data-hpe]:hover+.hpe-add button,.hpe-add:first-child button,.hpe-add:last-child button{opacity:1!important}
.hpe-add::before{content:'';position:absolute;left:0;right:0;top:0;border-top:2px dashed transparent}.hpe-add:hover::before{border-top-color:#5C74F6}
/* v36 R4 맨 위 '+ 섹션 추가'(늘 보임)가 첫 섹션 사진의 '샘플' 표시와 겹치던 것(휴대폰) — 첫 섹션의 샘플 표시를 버튼 아래로 */
.hpe-add:first-child+[data-hpi-stock]::before,.hpe-add:first-child+* [data-hpi-stock]::before,.hpe-add:first-child+*>[data-hpi-stock]::before{top:34px!important}
[data-hpe-f].hps-pick,[data-hpi-img].hps-pick{outline:2px solid #5C74F6!important;outline-offset:3px;background-color:rgba(92,116,246,.06)}`;
  const bound = new WeakSet();
  function bindCanvas(f) {
    let doc; try { doc = f.contentDocument; } catch (e) { return; } if (!doc || bound.has(doc)) return; bound.add(doc); const win = doc.defaultView; if (!win) return;
    const st = doc.createElement('style'); st.textContent = ICSS; (doc.head || doc.documentElement).appendChild(st);
    let pass = false;
    const pickable = t => { if (!t || !t.closest) return null; if (t.closest('.hpe-tb,.hpe-add,[data-hpe-act],.hps-dd')) return null; const ed = t.closest('[data-hpe-f]'); const im = t.closest('[data-hpi-img],[data-hpe-img]');
      if (ed && ed.isContentEditable) return null; return ed && (!im || im.contains(ed)) && !(im && im.tagName === 'A') ? ed : im || ed || null; };
    win.addEventListener('click', e => {
      const t = e.target; const dd = t.closest && t.closest('[data-hps-dd]'); if (dd) { e.preventDefault(); e.stopImmediatePropagation(); const w2 = dd.closest('.hps-ddw'); const o = !w2.classList.contains('open'); doc.querySelectorAll('.hps-ddw.open').forEach(x => x.classList.remove('open')); if (o) w2.classList.add('open'); dd.setAttribute('aria-expanded', o); return; }
      if (!(t.closest && t.closest('.hps-ddw'))) doc.querySelectorAll('.hps-ddw.open').forEach(x => x.classList.remove('open'));
      const more = t.closest && t.closest('[data-hpe-act="more"]'); if (more) { e.preventDefault(); e.stopImmediatePropagation(); detail(+more.dataset.i); return; }
      const lb = t.closest && t.closest('[data-hps-lh]'); if (lb) { e.preventDefault(); e.stopImmediatePropagation(); lhTool(lb.dataset.hpsLh, lb.dataset.v); return; }
      /* v37 머리글(lshead)은 맨 위 고정: 그 바로 아래 섹션의 [위로]는 막는다 · [+ 섹션]은 몇 번째 자리인지 기억(게시판 섹션 넣기) */
      const ub = t.closest && t.closest('[data-hpe-act="up"]'); if (ub && +ub.dataset.i === 1 && (curSecs()[0] || {}).type === 'lshead') { e.preventDefault(); e.stopImmediatePropagation(); say('머리글은 맨 위에 고정됩니다.'); return; }
      const ab = t.closest && t.closest('[data-hpe-act="add"]'); if (ab) { HS.addAt = +ab.dataset.i; }
      if (pass) return; const el = pickable(t); if (!el) return;
      e.preventDefault(); e.stopImmediatePropagation(); pick(el, f);
    }, true);
    win.addEventListener('dblclick', e => { const el = pickable(e.target); if (!el) return; e.preventDefault(); e.stopImmediatePropagation(); hint(null);
      pass = true; try { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win, detail: 1, clientX: e.clientX, clientY: e.clientY })); } finally { pass = false; } }, true);
    /* Esc로 편집기를 닫지 않게(글 고치기 · 툴바 Esc는 그대로) */
    win.addEventListener('keydown', e => { if (e.key === 'Escape' && HS.dock && !(e.target && e.target.isContentEditable)) { e.stopPropagation(); hint(null); } }, true);
    win.addEventListener('scroll', () => hint(null), { passive: true });
    setTimeout(() => { try { toolbars(doc); } catch (x) { console.error('hps tb', x); } }, 30);
  }
  function pick(el, f) { const doc = el.ownerDocument; doc.querySelectorAll('.hps-pick').forEach(x => x !== el && x.classList.remove('hps-pick')); el.classList.add('hps-pick');
    const sec = el.closest('[data-hpe]'); doc.querySelectorAll('.hpe-sel').forEach(x => x !== sec && x.classList.remove('hpe-sel')); if (sec) sec.classList.add('hpe-sel');
    hint(el, f, el.matches('[data-hpi-img],[data-hpe-img]') && !el.matches('[data-hpe-f]') ? '두 번 눌러 사진 바꾸기' : '두 번 눌러 글 고치기'); }
  function hint(el, f, text) { let h = $1('#hpsHint'); clearTimeout(HS.hintT); if (!el) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('div'); h.id = 'hpsHint'; h.className = 'hps-hint'; h.setAttribute('role', 'status'); document.body.appendChild(h); }
    h.textContent = text; const fr = f.getBoundingClientRect(); const sc = fr.width / (f.offsetWidth || fr.width || 1); const r = el.getBoundingClientRect();
    let top = fr.top + r.top * sc - 34; if (top < fr.top + 4) top = fr.top + (r.top + r.height) * sc + 8; const left = Math.max(8, Math.min(innerWidth - 180, fr.left + r.left * sc));
    h.style.top = Math.round(top) + 'px'; h.style.left = Math.round(left) + 'px'; HS.hintT = setTimeout(() => hint(null), 2600); }
  /* 섹션 도구: 위 · 아래 · 복제 · 삭제 | 디자인 ▾(모양 · 배경 · 숨기기 · 자세히) · AI */
  function toolbars(doc) {
    doc.querySelectorAll('[data-hpe] > .hpe-tb').forEach(tb => { if (tb.dataset.hps) return; tb.dataset.hps = 1; const by = a => tb.querySelector(`[data-hpe-act="${a}"]`);
      const ico = (b, d, n) => { if (!b) return; b.classList.add('hps-ib'); b.innerHTML = SV(d, 17, 2); b.title = n; b.setAttribute('aria-label', n); };
      ico(by('up'), P.up, '위로'); ico(by('down'), P.down, '아래로'); ico(by('dup'), P.dup, '복제'); ico(by('del'), P.del, '삭제');
      const dd = doc.createElement('span'); dd.className = 'hps-ddw'; dd.innerHTML = `<button type="button" data-hps-dd aria-haspopup="true" aria-expanded="false">${SV(P.design, 16, 1.9)}디자인 ▾</button><div class="hps-dd" role="menu"></div>`;
      const box = dd.querySelector('.hps-dd'); const mv = (b, n) => { if (!b) return; if (n) b.textContent = n; b.setAttribute('role', 'menuitem'); box.appendChild(b); };
      mv(tb.querySelector('[data-tpg-k]'), '모양 고르기'); mv(by('bimg'), '배경 사진'); mv(by('hide')); const mo = by('more'); mv(mo, '자세히 설정');
      const ai = by('ai'); const sep = doc.createElement('i'); sep.className = 'hps-sep';
      const order = [by('up'), by('down'), by('dup'), by('del'), sep, dd, ai].filter(Boolean); order.forEach(n => tb.appendChild(n));
      /* v37 학습 페이지의 머리글 · 자동 목록: 지우기 · 복제 · 숨기기 · AI 다시 쓰기 대신 전용 도구 */
      const sec = tb.parentElement; const x = curSecs()[+String(sec.dataset.hpe || '').split('|')[1]]; if (!x) return;
      if (x.type === 'lshead') { [by('up'), by('down'), by('dup'), by('del'), ai, dd, sep].forEach(n => n && n.remove()); const c = lhCur(x.data.route || ''); const tone = c.img ? 'img' : c.tone || 'soft';
        const b2 = (a, v, n, on) => `<button type="button" data-hps-lh="${a}" data-v="${v}" aria-pressed="${!!on}">${n}</button>`;
        tb.insertAdjacentHTML('beforeend', `<span class="hps-tbl">머리글</span>${b2('up', '', '사진 올리기')}${b2('stock', '', '샘플 사진')}${c.img ? b2('noimg', '', '사진 빼기') : ''}<i class="hps-sep"></i>${b2('al', 'l', '왼쪽', c.al !== 'c')}${b2('al', 'c', '가운데', c.al === 'c')}<i class="hps-sep"></i>${b2('h', 's', '작게', c.h === 's')}${b2('h', 'm', '보통', !c.h)}${b2('h', 'l', '크게', c.h === 'l')}<i class="hps-sep"></i>${b2('tone', 'plain', '흰 바탕', tone === 'plain')}${b2('tone', 'soft', '연한 색', tone === 'soft')}${b2('tone', 'brand', '대표 색', tone === 'brand')}`); }
      if (x.type === 'lslist') { [by('dup'), by('del'), ai, dd, sep].forEach(n => n && n.remove()); tb.insertAdjacentHTML('beforeend', `<span class="hps-tbl">자동 목록 — 위아래로 옮길 수 있습니다</span>`); }
      if (x.type === 'board') { const mo = box.querySelector('[data-hpe-act="more"]'); if (mo) mo.textContent = '게시판 설정'; if (ai) ai.remove(); } });
    /* 머리글이 맨 위에 고정된 페이지: 그 위 '+ 섹션 추가' 자리는 뺀다 */
    const L = curSecs(); if (L[0] && L[0].type === 'lshead') { const f = doc.querySelector('.hpe-add'); if (f && f.nextElementSibling && /\|0$/.test((f.nextElementSibling.dataset || {}).hpe || '')) f.remove(); }
  }
  new MutationObserver(() => { const f = $1('#hpeF'); if (f && !f.dataset.hpsB) { f.dataset.hpsB = 1; f.addEventListener('load', () => { try { labels(f); bindCanvas(f); } catch (e) { console.error('hps bind', e); } setTimeout(() => { deco(true); lvPaint(); fit(); }, 0); }); } }).observe(document.body, { childList: true, subtree: true });
  /* 탭 이름은 캔버스 머리글에 실제로 보이는 이름과 같게(유형별 용어 · 표시 이름 반영) */
  function labels(f) { let d; try { d = f.contentDocument; } catch (e) { return; } if (!d) return; const L = {}; d.querySelectorAll('header a[href^="#p-"], nav a[href^="#p-"]').forEach(a => { const k = a.getAttribute('href').slice(3); const tx = (a.textContent || '').replace(/[▾▼]/g, '').trim(); if (k === 'home' || (S.org && tx === S.org.name)) return; if (k && tx && tx.length <= 20 && !L[k]) L[k] = tx; }); if (Object.keys(L).length) HS.lab = L; }
  /* 섹션 '자세히'는 기존 섹션 설정 화면(세부 설정)으로 */
  /* v37: 섹션 '자세히'는 화면을 바꾸지 않고 그 자리에서 설정 창(site-edit)을 연다 — 닫히면 캔버스를 다시 그린다. 게시판 섹션은 게시판 설정 창 */
  function detail(i) { const x = curSecs()[i]; if (!x) return; if (x.type === 'board') return bdOpen(i); if (PIN[x.type]) { say(x.type === 'lshead' ? '머리글은 글자를 두 번 눌러 고치고, 모양은 머리글 도구(정렬 · 높이 · 바탕 · 사진)로 바꿉니다.' : '자동 목록은 데이터로 채워집니다. 목록 내용은 해당 메뉴(교육과정 · 소통 등)에서 고칩니다.'); return; }
    UI.sitePage = HPE.key || 'home'; try { ACT['site-edit'] && ACT['site-edit']({ dataset: { v: String(i) } }); } catch (e) { console.error(e); } afterModal(() => { paint(); if (HS.pan === 'sec') panPaint(true); }); }
  function afterModal(fn) { clearInterval(HS.amT); if (!$1('#modal')) { fn(); return; } HS.amT = setInterval(() => { if ($1('#modal')) return; clearInterval(HS.amT); HS.amT = 0; try { fn(); } catch (e) { console.error(e); } }, 250); }
  const PIN = { lshead: 1, lslist: 1 };

  /* [+ 섹션] 갤러리: hpai의 고르기 창을 미리보기 그림 카드로 */
  const GAL = { banner: ['첫 화면 큰 배너', '제목 · 한 줄 소개 · 버튼', '<rect x="2" y="3" width="44" height="26" rx="2" fill="#C9D2FF"/><rect x="7" y="10" width="20" height="3" rx="1" fill="#5C74F6"/><rect x="7" y="16" width="14" height="2" rx="1" fill="#8E9BF0"/><rect x="7" y="21" width="9" height="4" rx="2" fill="#5C74F6"/>'],
    features: ['소개 카드', '장점 3~4개를 카드로', '<rect x="2" y="8" width="13" height="16" rx="2" fill="#E3E7FF"/><rect x="17.5" y="8" width="13" height="16" rx="2" fill="#E3E7FF"/><rect x="33" y="8" width="13" height="16" rx="2" fill="#E3E7FF"/><rect x="5" y="12" width="7" height="2" rx="1" fill="#5C74F6"/><rect x="20.5" y="12" width="7" height="2" rx="1" fill="#5C74F6"/><rect x="36" y="12" width="7" height="2" rx="1" fill="#5C74F6"/>'],
    stats: ['숫자 강조', '실제 운영 숫자 3개', '<text x="5" y="20" font-size="10" font-weight="800" fill="#5C74F6">12</text><text x="19" y="20" font-size="10" font-weight="800" fill="#5C74F6">95</text><text x="33" y="20" font-size="10" font-weight="800" fill="#5C74F6">3</text><rect x="5" y="23" width="9" height="2" rx="1" fill="#B9C1E8"/><rect x="19" y="23" width="9" height="2" rx="1" fill="#B9C1E8"/><rect x="33" y="23" width="9" height="2" rx="1" fill="#B9C1E8"/>'],
    steps: ['단계 안내', '신청 → 수강 → 수료 순서', '<circle cx="8" cy="16" r="4" fill="#5C74F6"/><circle cx="24" cy="16" r="4" fill="#8E9BF0"/><circle cx="40" cy="16" r="4" fill="#C9D2FF"/><path d="M12 16h8M28 16h8" stroke="#B9C1E8" stroke-width="1.5"/>'],
    classes: [() => `${lbl()} 목록`, () => `공개 ${lbl()}이 자동으로`, '<rect x="2" y="6" width="13" height="20" rx="2" fill="#fff" stroke="#C9D2FF"/><rect x="2" y="6" width="13" height="8" rx="2" fill="#C9D2FF"/><rect x="17.5" y="6" width="13" height="20" rx="2" fill="#fff" stroke="#C9D2FF"/><rect x="17.5" y="6" width="13" height="8" rx="2" fill="#C9D2FF"/><rect x="33" y="6" width="13" height="20" rx="2" fill="#fff" stroke="#C9D2FF"/><rect x="33" y="6" width="13" height="8" rx="2" fill="#C9D2FF"/>'],
    image: ['사진', '사진 한 장 · 여러 장', '<rect x="4" y="5" width="40" height="22" rx="2" fill="#E3E7FF"/><path d="M8 24l9-9 7 7 5-5 11 7" stroke="#5C74F6" stroke-width="1.6" fill="none"/><circle cx="34" cy="11" r="2.5" fill="#8E9BF0"/>'],
    video: ['동영상', '유튜브 · 소개 영상', '<rect x="4" y="5" width="40" height="22" rx="2" fill="#2A2B2B"/><path d="M21 11l8 5-8 5z" fill="#fff"/>'],
    notices: ['공지사항', '최근 공지가 자동으로', '<rect x="5" y="7" width="38" height="3" rx="1" fill="#C9D2FF"/><rect x="5" y="14" width="38" height="3" rx="1" fill="#E3E7FF"/><rect x="5" y="21" width="38" height="3" rx="1" fill="#E3E7FF"/>'],
    reviews: ['수강후기', '실제 후기만 보여 줍니다', '<rect x="3" y="7" width="20" height="18" rx="3" fill="#E3E7FF"/><rect x="25" y="7" width="20" height="18" rx="3" fill="#E3E7FF"/><path d="M7 13h12M7 17h9M29 13h12M29 17h9" stroke="#8E9BF0" stroke-width="1.5"/>'],
    map: ['오시는 길', '지도 · 주소 · 운영 시간', '<rect x="4" y="5" width="40" height="22" rx="2" fill="#E6F4EA"/><path d="M4 18c10-6 18 4 40-6" stroke="#9CCFA9" stroke-width="2" fill="none"/><path d="M24 9a4 4 0 014 4c0 3-4 7-4 7s-4-4-4-7a4 4 0 014-4z" fill="#E5484D"/>'],
    cta: ['문의 · 신청 띠', '버튼 하나로 신청 받기', '<rect x="2" y="9" width="44" height="14" rx="3" fill="#5C74F6"/><rect x="7" y="14" width="18" height="3" rx="1" fill="#fff"/><rect x="33" y="13" width="9" height="6" rx="3" fill="#fff"/>'],
    plain: ['글 상자', '제목과 문단', '<rect x="5" y="6" width="22" height="4" rx="1" fill="#5C74F6"/><rect x="5" y="14" width="38" height="2.5" rx="1" fill="#C9D2FF"/><rect x="5" y="19" width="34" height="2.5" rx="1" fill="#C9D2FF"/><rect x="5" y="24" width="26" height="2.5" rx="1" fill="#C9D2FF"/>'] };
  new MutationObserver(() => { const g = $1('#modal .hpe-addg'); if (!g || g.dataset.hps) return; g.dataset.hps = 1; const m = $1('#modal'); if (m) m.classList.add('hps-galm');
    const ttl = m && m.querySelector('.mh h3, .mh b, h3'); if (ttl && /섹션 추가/.test(ttl.textContent)) ttl.textContent = '섹션 추가 — 넣을 모양을 고르세요';
    g.querySelectorAll('[data-mact]').forEach(b => { const k = b.dataset.mact; const G = GAL[k]; if (!G) return; const v = x => (typeof x === 'function' ? x() : x);
      b.classList.add('hps-gc'); b.innerHTML = `<svg viewBox="0 0 48 32" width="96" height="64" aria-hidden="true">${G[2]}</svg><b>${E(v(G[0]))}</b><small>${E(v(G[1]))}</small>`; });
    const p = m && m.querySelector('.hpe-addg'); const note = p && p.previousElementSibling; if (note && note.classList.contains('mini')) note.textContent = '넣은 뒤 글자 · 사진을 두 번 눌러 바로 고칠 수 있습니다.'; }).observe(document.body, { childList: true, subtree: true });

  /* ═════════ 5. 오른쪽 패널(섹션 · 기본 정보 · 검색 노출) ═════════ */
  ACT['hps-pan'] = el => { const k = el.dataset.v; if (HS.pan === k) return panClose(); panOpen(k); };
  function panOpen(k) { if (document.body.classList.contains('hps-talk-on')) talkSet(false); HS.pan = k; if (document.body.classList.contains('tpg-dz-on') && window.TPG && TPG.dz) try { TPG.dz.close(); } catch (e) { } panPaint(true); deco(true); }
  function panClose() { HS.pan = ''; const p = $1('#hpsPan'); if (p) p.remove(); document.body.classList.remove('hps-pan-on', 'hps-panw-on'); deco(true); setTimeout(fit, 0); }
  ACT['hps-panx'] = () => panClose();
  /* 휴대폰: 「AI에게 말하기」 줄은 아래 시트(캔버스를 가리지 않게 평소에는 접어 둔다) */
  function talkSet(on) { document.body.classList.toggle('hps-talk-on', !!on); const b = $1('#hpe .hps-ri[data-v="talk"]'); if (b) { b.classList.toggle('on', !!on); b.setAttribute('aria-expanded', !!on); }
    if (on) { if (HS.pan) panClose(); const f = $1('#hpe .hpw-talk'); if (f) { const i = f.querySelector('input[name=q]'); setTimeout(() => { document.body.style.setProperty('--hps-tk', (f.offsetHeight || 150) + 'px'); if (i) try { i.focus(); } catch (e) { } }, 30); } } }
  ACT['hps-talk'] = () => talkSet(!document.body.classList.contains('hps-talk-on'));
  const sheetClose = () => talkSet(false); Object.defineProperty(HS, 'sheet', { get: () => document.body.classList.contains('hps-talk-on') && innerWidth <= 760, configurable: true });
  { const base = ACT['tpg-dz']; if (base) ACT['tpg-dz'] = (...a) => { if (HS.pan) { HS.pan = ''; const p = $1('#hpsPan'); if (p) p.remove(); document.body.classList.remove('hps-pan-on'); } const r = base(...a); setTimeout(() => { deco(true); fit(); }, 0); return r; }; }
  const SECN = x => { const d = x.data || {}; const v = d.variant; const N = { banner: '첫 화면 배너', classes: `${lbl()} 목록`, image: '사진', slideImage: '사진 슬라이드', video: '동영상', notices: '공지사항', reviews: '수강후기', map: '오시는 길', code: 'HTML 코드', books: '교재', catBrowse: '분야 둘러보기', lshead: '머리글(페이지 제목)', lslist: '자동 목록', board: '게시판' }[x.type];
    const V = { features: '소개 카드', stats: '숫자 강조', steps: '단계 안내', timeline: '연혁', roadmap: '로드맵', info: '안내', tiles: '타일', profiles: '강사 소개', modules: '과정 구성', cta: '신청 띠', logos: '함께하는 곳', story: '이야기' }[v];
    return N || V || '글 상자'; };
  function panPaint(force) { const w = $1('#hpe'); if (!w || !HS.dock || !HS.pan) return; let p = $1('#hpsPan');
    if (!p) { p = document.createElement('aside'); p.id = 'hpsPan'; p.className = 'hps-pan'; p.setAttribute('aria-label', '편집 패널'); w.appendChild(p); force = true; }
    document.body.classList.add('hps-pan-on'); if (!force && p.dataset.k === HS.pan + HPE.key && HS.pan === 'basic') return; /* 입력 중인 칸은 다시 그리지 않음 */
    document.body.classList.toggle('hps-panw-on', HS.pan === 'menu');
    if (HS.pan === 'menu') { p.classList.add('hps-panw'); if (!force && p.querySelector('#hpmBox')) return; menuPanel(p); setTimeout(fit, 0); return; } p.classList.remove('hps-panw');
    p.dataset.k = HS.pan + HPE.key; const k = HS.pan; const s = site(); const ttl = { sec: '이 페이지 섹션', basic: '기본 정보', seo: '검색 노출(SEO)' }[k] || '';
    let body = '';
    if (k === 'sec') { const pg = pageOf(HPE.key) || { label: '홈', sections: s.sections };
      body = `<p class="hps-pd">「${E(pg.label)}」 페이지의 섹션입니다. 이름을 누르면 그 섹션으로 갑니다. 글 · 사진은 화면에서 두 번 눌러 고칩니다.</p><ol class="hps-sl">${pg.sections.map((x, i) => { const d = x.data || {}; const tt = String(d.title || d.eyebrow || '').split('\n')[0].slice(0, 28);
          if (PIN[x.type]) return `<li class="pin"><button type="button" class="hps-sn" data-act="hps-secgo" data-v="${i}"><b>${E(SECN(x))}</b><small>${x.type === 'lshead' ? '맨 위 고정 · 글은 두 번 눌러 고치기' : '데이터로 자동으로 채워집니다'}</small></button>${x.type === 'lslist' ? `<span class="hps-sa"><button type="button" data-act="hps-secdo" data-a="up" data-v="${i}" aria-label="위로" title="위로" ${i > 1 ? '' : 'disabled'}>${SV(P.up, 15, 2)}</button><button type="button" data-act="hps-secdo" data-a="down" data-v="${i}" aria-label="아래로" title="아래로" ${i < pg.sections.length - 1 ? '' : 'disabled'}>${SV(P.down, 15, 2)}</button></span>` : ''}</li>`;
          return `<li class="${x.hide ? 'hid' : ''}"><button type="button" class="hps-sn" data-act="hps-secgo" data-v="${i}"><b>${E(SECN(x))}</b><small>${E(tt || (x.hide ? '숨김' : ''))}${x.hide && tt ? ' · 숨김' : ''}</small></button><span class="hps-sa"><button type="button" data-act="hps-secdo" data-a="up" data-v="${i}" aria-label="위로" title="위로" ${i && !(i === 1 && pg.sections[0].type === 'lshead') ? '' : 'disabled'}>${SV(P.up, 15, 2)}</button><button type="button" data-act="hps-secdo" data-a="down" data-v="${i}" aria-label="아래로" title="아래로" ${i < pg.sections.length - 1 ? '' : 'disabled'}>${SV(P.down, 15, 2)}</button><button type="button" data-act="hps-secdo" data-a="hide" data-v="${i}">${x.hide ? '보이기' : '숨기기'}</button><button type="button" data-act="hps-secdo" data-a="more" data-v="${i}">자세히</button></span></li>`; }).join('')}</ol>
        <button type="button" class="btn pri hps-wide" data-act="hps-secadd">${SV(P.plus, 16, 2)} 섹션 추가</button>`; }
    else if (k === 'basic') { const ft = (S.settings && S.settings.footer) || {}; const g = s.gnb || {}; const col = /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#5C74F6';
      const SW = ['#5C74F6', '#1F4E9E', '#0F766E', '#15803D', '#C2410C', '#B91C1C', '#7C3AED', '#1F2937'];
      body = `<form class="hps-bf" data-hps-form="basic"><p class="hps-pd">여기 넣은 값이 머리글 · 바닥글 · 오시는 길 · 문의 버튼에 함께 들어갑니다.</p>
        <label class="fl">기관명<input name="name" maxlength="30" value="${E(S.org.name)}" required></label>
        <label class="fl">대표 전화<input name="tel" maxlength="30" inputmode="tel" value="${E(ft.tel || '')}" placeholder="예: 051-000-0000"></label>
        <label class="fl">이메일<input name="mail" maxlength="80" inputmode="email" value="${E(ft.mail || '')}" placeholder="예: help@example.com"></label>
        <label class="fl">주소<input name="addr" maxlength="120" value="${E(ft.addr || '')}" placeholder="비워 두면 오시는 길을 숨깁니다"></label>
        <label class="fl">운영 시간<input name="hours" maxlength="60" value="${E(ft.hours || '')}" placeholder="예: 평일 10:00~19:00"></label>
        <div class="fl"><span>로고</span><div class="hps-logo">${/^data:image\/|^https:\/\//.test(g.logo || '') ? `<img src="${E(g.logo)}" alt="지금 로고">` : '<em>로고 없음 — 기관명 글자로 표시</em>'}<label class="btn sm">올리기<input type="file" accept="image/*" data-hps-logo hidden></label>${g.logo ? '<button type="button" class="btn sm ghost" data-act="hps-logox">빼기</button>' : ''}</div></div>
        <div class="fl"><span>대표 색</span><div class="hps-sw" role="radiogroup" aria-label="대표 색">${SW.map(c => `<label title="${c}"><input type="radio" name="color" value="${c}" ${c.toLowerCase() === col.toLowerCase() ? 'checked' : ''}><i style="background:${c}"></i></label>`).join('')}<label class="hps-cc" title="직접 고르기"><input type="color" name="color2" value="${col}" aria-label="직접 고르기"></label></div></div>
        <button type="submit" class="btn pri hps-wide">${SV(P.ok, 16, 2.2)} 사이트에 넣기</button></form>`; }
    else if (k === 'seo') { const seo = (S.settings && S.settings.seo) || {};
      body = `<form class="hps-bf" data-hps-form="seo"><p class="hps-pd">네이버 · 구글 검색 결과와 링크 공유 미리보기에 보이는 글입니다.</p>
        <label class="fl">사이트 제목<input name="title" maxlength="60" value="${E(seo.title || '')}"></label><label class="fl">설명(80자 안팎)<textarea name="desc" rows="3" maxlength="160">${E(seo.desc || '')}</textarea></label>
        <label class="fl">검색어(쉼표로)<input name="kw" maxlength="200" value="${E(seo.kw || seo.keywords || '')}"></label>
        <label class="ckl"><input type="checkbox" name="noindex" ${seo.noindex ? 'checked' : ''}> 검색에 나오지 않게 하기</label>
        <div class="hps-serp" aria-label="검색 결과 미리보기"><small>${E(learnerURL().replace(/^https?:\/\//, '').split('?')[0])}</small><b>${E(seo.title || S.org.name)}</b><p>${E(seo.desc || '')}</p></div>
        <button type="submit" class="btn pri hps-wide">저장</button></form>`; }
    p.innerHTML = `<div class="hps-ph"><b>${ttl}</b><button type="button" class="btn sm ghost" data-act="hps-panx" aria-label="패널 닫기">${SV(P.x, 16, 2)}</button></div><div class="hps-pb">${body}</div>`;
    setTimeout(fit, 0); }
  const frameDoc = () => { const f = $1('#hpeF'); try { return f && f.contentDocument; } catch (e) { return null; } };
  ACT['hps-secgo'] = el => { const d = frameDoc(); if (!d) return; const sec = [...d.querySelectorAll('[data-hpe]')].find(x => x.dataset.hpe === `${HPE.key}|${el.dataset.v}`); if (!sec) return;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); d.querySelectorAll('.hpe-sel').forEach(x => x.classList.remove('hpe-sel')); sec.classList.add('hpe-sel'); };
  ACT['hps-secdo'] = el => { const a = el.dataset.a, i = +el.dataset.v; if (a === 'more') return detail(i); const d = frameDoc(); const b = d && d.querySelector(`[data-hpe-act="${a}"][data-i="${i}"]`); if (b) b.click(); setTimeout(() => panPaint(true), 120); };
  ACT['hps-secadd'] = () => { const d = frameDoc(); const L = d ? d.querySelectorAll('.hpe-add [data-hpe-act="add"]') : []; const b = L[L.length - 1]; if (b) b.click(); };
  ACT['hps-logox'] = () => { push(); const s = site(); s.gnb = s.gnb || {}; s.gnb.logo = ''; persist(); paint(); panPaint(true); say('로고를 뺐습니다. 기관명 글자로 보입니다.', 'ok'); };
  document.addEventListener('change', e => { const i = e.target; if (!i || !i.matches || !i.matches('#hpsPan [data-hps-logo]')) return; const fl = i.files && i.files[0]; if (!fl || typeof window.hpImgFile !== 'function') return;
    window.hpImgFile(fl, url => { push(); const s = site(); s.gnb = s.gnb || {}; s.gnb.logo = url; persist(); paint(); panPaint(true); say('로고를 넣었습니다. 대표 색도 로고에 맞추려면 아래 색을 고르세요.', 'ok'); }); });
  document.addEventListener('input', e => { const i = e.target; if (i && i.name === 'color2' && i.closest('#hpsPan')) { const r = i.closest('form').querySelectorAll('input[name=color]'); r.forEach(x => { x.checked = false; }); } });
  document.addEventListener('submit', e => { const f = e.target; if (!f || !f.matches || !f.matches('#hpsPan [data-hps-form]')) return; e.preventDefault(); const k = f.dataset.hpsForm; const v = n => { const x = f.elements[n]; return x ? String(x.value || '').trim() : ''; };
    if (k === 'basic') { const nm = v('name').slice(0, 30); if (!nm) { say('기관명을 입력하세요.', 'warn'); return; } const mail = v('mail'); if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { say('이메일 형식을 확인하세요.', 'warn'); return; }
      push(); const s = site(); S.settings = S.settings || {}; const ft = S.settings.footer = Object.assign({}, S.settings.footer || {});
      if (nm !== S.org.name) { S.org.name = nm; if (typeof logAudit === 'function') logAudit('기관명 변경 — ' + nm); }
      ft.tel = v('tel').slice(0, 30); ft.mail = mail.slice(0, 80); ft.addr = v('addr').slice(0, 120); ft.hours = v('hours').slice(0, 60); if (!ft.company) ft.company = nm;
      const picked = [...f.querySelectorAll('input[name=color]')].find(x => x.checked); const c = picked ? picked.value : v('color2');
      if (/^#[0-9a-f]{6}$/i.test(c) && c.toLowerCase() !== String(s.color || '').toLowerCase()) { if (window.HPT && s.theme && HPT.has && HPT.has(s.theme) && HPT.apply) { try { HPT.apply(s, s.theme, { color: c }); } catch (x) { s.color = c; } } else s.color = c; s.hpColorLock = 1; }
      s.hpsBasicAt = today(); persist(); paint(); deco(true); panPaint(true); say('기본 정보를 사이트에 넣었습니다(되돌리기 가능).', 'ok'); }
    if (k === 'seo') { S.settings = S.settings || {}; const seo = S.settings.seo = Object.assign({}, S.settings.seo || {}); seo.title = v('title').slice(0, 60); seo.desc = v('desc').slice(0, 160); seo.kw = v('kw').slice(0, 200); seo.noindex = !!(f.elements.noindex && f.elements.noindex.checked);
      persist(); panPaint(true); say('검색 노출 정보를 저장했습니다. 게시하면 반영됩니다.', 'ok'); } }, true);

  /* ═════════ 6. 페이지 프롬프트(말로 고치기 + 코드 블록) ═════════ */
  function talkDeco(f) {
    const inp = f.querySelector('input[name=q]'); const pg = pageOf(HPE.key); const nm = HS.lv ? HS.lv.name : pg ? pg.label : '홈';
    if (inp) { inp.placeholder = HS.lv ? (HS.lv.url ? `「${nm}」은 외부 주소로 연결된 메뉴입니다` : `「${nm}」 머리글을 어떻게 바꿀까요? 예: 제목을 "전체 ${lbl()}"으로 · 배경 사진 넣어줘 · 가운데 정렬 · 대표 색으로`) : `「${nm}」 페이지를 어떻게 바꿀까요? 예: 강사 소개와 오시는 길 넣어줘 · 색을 초록으로 · 코드 블록 붙여 넣기`; inp.setAttribute('aria-label', `${nm} 페이지 고치기 요청`); }
    const tl = f.querySelector('.hpw-tl'); if (tl && !tl.dataset.hps) { tl.dataset.hps = 1; tl.innerHTML = `${SV(P.ai, 14, 1.9)} AI에게 말하기`; }
    if (!f.querySelector('.hps-cb')) { const sub = f.querySelector('button[type=submit], .btn'); const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm hps-cb'; b.setAttribute('aria-expanded', 'false'); b.title = '코드 블록 붙여 넣기(HTML · JSON)'; b.innerHTML = `${SV(P.code, 15, 2)}<span>코드</span>`; b.dataset.act = 'hps-code';
      const clip = f.querySelector('.hpi-tclip'); (clip || sub) ? (clip || sub).insertAdjacentElement('beforebegin', b) : f.appendChild(b); }
    if (!f.dataset.hpsP && inp) { f.dataset.hpsP = 1; inp.addEventListener('paste', e => { const tx = (e.clipboardData && e.clipboardData.getData('text')) || ''; if (!/\n|```|^\s*[<{\[]/.test(tx)) return; e.preventDefault(); codeOpen(tx); }); }
  }
  function codeOpen(tx) { const f = $1('#hpe .hpw-talk'); if (!f) return; let c = $1('#hpsCode');
    if (!c) { f.insertAdjacentHTML('afterend', `<div id="hpsCode" class="hps-code"><label for="hpsCodeT">코드 블록 — HTML 조각(섹션으로 넣기) · JSON 섹션 설계(페이지 다시 구성)</label><textarea id="hpsCodeT" rows="7" spellcheck="false" maxlength="100000" placeholder="\`\`\`html&#10;<section>…</section>&#10;\`\`\`"></textarea><div class="hps-cbar"><small>HTML은 안전하게 정리해 넣고(스크립트 · 위험 속성 제거), 스크립트가 있는 코드는 정운영자만 격리 실행으로 넣습니다.</small><button type="button" class="btn sm ghost" data-act="hps-code">닫기</button><button type="button" class="btn sm pri" data-act="hps-coderun">이 페이지에 넣기</button></div></div>`); c = $1('#hpsCode'); }
    const ta = c.querySelector('textarea'); if (tx != null) ta.value = tx; ta.focus(); const b = $1('#hpe .hps-cb'); if (b) b.setAttribute('aria-expanded', 'true'); layout(); }
  function codeClose() { const c = $1('#hpsCode'); if (c) c.remove(); const b = $1('#hpe .hps-cb'); if (b) b.setAttribute('aria-expanded', 'false'); layout(); }
  ACT['hps-code'] = () => { if ($1('#hpsCode')) return codeClose(); codeOpen(); };
  ACT['hps-coderun'] = () => { const ta = $1('#hpsCodeT'); const v = ta ? ta.value.trim() : ''; if (!v) { say('코드를 붙여 넣으세요.', 'warn'); return; } if (codeRun(v)) codeClose(); };
  /* 지금 페이지의 섹션 배열(원본 참조) */
  const curSecs = () => { const pg = pageOf(HPE.key); return pg ? pg.sections : site().sections; };
  function mapSecs(L) { if (!L.length || typeof window.hpMake !== 'function') return []; const ns = window.hpMake({ sections: L }, site()); let out = A(ns.sections); if (L[0] && L[0].type !== 'banner' && out[0] && out[0].type === 'banner') out = out.slice(1);
    /* 강사 소개(profiles)는 글 칸이 없어도 등록된 강사로 채워지므로 모양을 지킨다(hpsec-trust) */ const src = L.filter(x => x && x.type); out.forEach((x, i) => { const o = src[i]; if (o && x.type === 'text' && o.variant === 'profiles' && x.data && !x.data.variant) x.data.variant = 'profiles'; }); return out; }
  function applySecs(secs, mode, msg) { if (!secs.length) return false; const L = curSecs(); push(); const sel = (() => { const d = frameDoc(); const x = d && d.querySelector('[data-hpe].hpe-sel'); return x ? +x.dataset.hpe.split('|')[1] : -1; })();
    const pinned = L.some(x => PIN[x.type]); /* v37 학습 페이지: 머리글 · 자동 목록은 지키고 그 사이에 넣는다 */
    if (pinned) { const head = L.filter(x => x.type === 'lshead'), list = L.filter(x => x.type === 'lslist'); if (mode === 'replace') L.splice(0, L.length, ...head, ...secs, ...list);
      else { const li = L.findIndex(x => x.type === 'lslist'); const at = sel >= 1 ? sel + 1 : li >= 0 ? li : L.length; L.splice(Math.max(head.length, at), 0, ...secs); } }
    else if (mode === 'replace') L.splice(0, L.length, ...secs); else L.splice(sel >= 0 ? sel + 1 : L.length, 0, ...secs);
    site().hpsAiAt = today(); persist(); paint(); deco(true); if (HS.pan === 'sec') panPaint(true); say(msg + ' 마음에 들지 않으면 [되돌리기]를 누르세요.', 'ok'); return true; }
  function codeRun(raw) {
    let code = String(raw); const fm = code.match(/```([a-z]*)\s*\n?([\s\S]*?)```/i); let lang = ''; if (fm) { lang = fm[1].toLowerCase(); code = fm[2]; } code = code.trim(); if (!code) { say('코드가 비어 있습니다.', 'warn'); return false; }
    if (HS.lv) { say('학습 페이지 목록은 데이터로 채워지므로 코드를 넣을 수 없습니다. 머리글은 말로 고치거나 두 번 눌러 고치세요.', 'warn'); return false; }
    if (lang === 'json' || /^[\[{]/.test(code)) { let j = null; try { j = JSON.parse(code); } catch (e) { if (lang === 'json') { say('JSON 형식이 올바르지 않습니다.', 'warn'); return false; } }
      if (j) { const L = Array.isArray(j) ? j : A(j.sections); const secs = mapSecs(L.filter(x => x && typeof x === 'object' && x.type)); if (!secs.length) { say('JSON에 sections(섹션 설계)가 없습니다. 예: {"sections":[{"type":"text","title":"…"}]}', 'warn'); return false; }
        const ok = applySecs(secs, 'replace', `코드 블록(JSON)으로 「${(pageOf(HPE.key) || {}).label || '홈'}」 페이지를 섹션 ${secs.length}개로 다시 구성했습니다.`);
        if (ok && !Array.isArray(j) && HPE.key === 'home' && /^#[0-9a-f]{6}$/i.test(j.color || '')) { site().color = j.color; persist(); paint(); } return ok; } }
    if (!/<[a-z][\s\S]*>/i.test(code)) { say(/[{;]\s*$|:\s*[^;]+;/.test(code) ? 'CSS만 있는 코드는 넣을 수 없습니다. HTML과 함께(<style> 포함) 붙여 넣으세요.' : 'HTML 또는 JSON 코드를 붙여 넣으세요.', 'warn'); return false; }
    const rich = /<(style|script)\b/i.test(code); const own = typeof S !== 'undefined' && S.me && S.me.role === 'owner'; const isolate = rich && own;
    const x = typeof S2 === 'function' ? S2('code', {}) : { id: uid('s'), type: 'code', data: {} }; Object.assign(x.data, { html: code.slice(0, 100000), allowScript: isolate, h: isolate ? 640 : 320, title: '', showTitle: false });
    return applySecs([x], 'add', isolate ? '코드 블록을 격리된 영역(스크립트 실행)으로 넣었습니다. 높이는 섹션 [디자인 ▾ → 자세히 설정]에서 맞춥니다.' : rich ? '코드 블록을 넣었습니다. 스크립트 · <style>은 보안상 빼고 넣었습니다(정운영자는 격리 실행으로 넣을 수 있습니다).' : '코드 블록(HTML)을 섹션으로 넣었습니다.'); }
  window.hpsCodeRun = codeRun;

  /* 페이지 만들기: 규칙(Claude 없음) — 요청 속 낱말로 섹션을 고른다. 지어낸 숫자 · 후기 · 이름은 넣지 않는다 */
  const RULES = [[/첫\s*화면|배너|메인\s*이미지|히어로/, () => ({ type: 'banner', title: S.org.name, sub: '', cta: `${lbl()} 둘러보기` })],
    [/강사|선생님|교수진|강사진/, () => ({ type: 'text', variant: 'profiles', eyebrow: 'TEACHERS', title: '함께하는 강사', body: '등록된 강사 소개가 이곳에 들어갑니다.' })],
    [/오시는\s*길|위치|찾아오|지도|주소/, () => ({ type: 'map', title: '오시는 길' })],
    [/강좌|수업|과정|클래스|교과목|프로그램/, () => ({ type: 'classes', eyebrow: 'COURSES', title: `지금 신청할 수 있는 ${lbl()}`, sub: '' })],
    [/공지/, () => ({ type: 'notices', title: '공지사항' })], [/후기|리뷰/, () => ({ type: 'reviews', title: '수강후기' })],
    [/절차|단계|순서|과정\s*안내|신청\s*방법/, () => ({ type: 'text', variant: 'steps', title: '이렇게 시작합니다', cols: [['신청', `원하는 ${lbl()}을 고르고 신청합니다`], ['수강', '정해진 일정에 맞춰 배웁니다'], ['수료', '기준을 채우면 수료증을 받습니다']] })],
    [/연혁|역사|걸어온/, () => ({ type: 'text', variant: 'timeline', title: '걸어온 길', cols: [['시작', '기관의 시작을 적어 주세요']] })],
    [/장점|특징|강점|왜\s/, () => ({ type: 'text', variant: 'features', eyebrow: 'WHY', title: `${S.org.name}의 약속`, cols: [['꼼꼼한 수업', '수업 방식을 적어 주세요'], ['함께하는 관리', '관리 방식을 적어 주세요'], ['편한 수강', '수강 방법을 적어 주세요']] })],
    [/사진|갤러리|시설|둘러보/, () => ({ type: 'image', title: '둘러보기', alt: `${S.org.name} 사진` })], [/영상|동영상|유튜브/, () => ({ type: 'video', title: '소개 영상' })],
    [/문의|상담|신청\s*버튼|연락/, () => ({ type: 'text', variant: 'cta', title: '궁금한 점이 있으신가요?', body: '편하게 문의해 주세요.', cta: '문의하기' })],
    [/인사말|대표\s*인사|소개\s*글|인사/, () => ({ type: 'text', eyebrow: 'GREETING', title: '인사말', body: `${S.org.name}을 찾아 주셔서 고맙습니다. 이곳에 인사말을 적어 주세요.` })]];
  function ruleSecs(v, label) { const out = []; RULES.forEach(([re, mk]) => { if (re.test(v)) out.push(mk()); });
    if (!out.length) { const plain = v.replace(/(넣어|만들어|추가해|바꿔|써)\s*(줘|주세요|주십시오)?[.!]?$/g, '').trim(); const asBody = plain.length >= 16 && !/(줘|주세요|해\s*$)/.test(plain); out.push({ type: 'text', title: label, body: asBody ? plain.slice(0, 600) : `${label} 내용을 적어 주세요. 글자를 두 번 누르면 바로 고칠 수 있습니다.` }); }
    return out.slice(0, 6); }
  const PB_SYS = label => `당신은 교육기관 홈페이지 기획자 겸 카피라이터입니다. 홈페이지의 「${label}」 페이지 하나에 들어갈 섹션을 JSON으로 설계합니다.
규칙: JSON 객체 하나만 출력({"sections":[...]}, 1~6개). 기관명 · 강좌명 · 연락처는 주어진 값만 쓰고, 없는 수치 · 수상 · 후기 · 연혁 · 인물 이름은 지어내지 않습니다. 쉬운 한국어, 짧은 문장.
섹션 형식: {"type":"banner","eyebrow":"","title":"","sub":"","cta":""} {"type":"text","variant":"features|stats|steps|timeline|info|tiles|profiles|modules|cta|plain","eyebrow":"","title":"","body":"","cols":[["제목","설명"]],"cta":""} {"type":"classes","title":""} {"type":"notices","title":""} {"type":"reviews","title":""} {"type":"map","title":"","hours":""} {"type":"image","title":"","alt":""} {"type":"video","title":""}`;
  async function pageBuild(v) {
    const pg = pageOf(HPE.key) || { label: '홈', sections: site().sections }; const label = pg.label.split('›').pop().trim(); const fresh = pg.sections.filter(x => !PIN[x.type]).length <= 1 || /(새로|처음부터|다시\s*만들|전부\s*바꿔|갈아)/.test(v);
    let L = null, via = '규칙';
    if (aiOn()) { try { say(`${CL.label ? CL.label() : 'Claude'}가 「${label}」 페이지를 만들고 있습니다…`); const ft = (S.settings && S.settings.footer) || {};
        const r = await CL.call({ system: PB_SYS(label), messages: [{ role: 'user', content: `요청: ${v}\n기관: ${JSON.stringify({ 기관명: S.org.name, 유형: TYPES[S.org.type].name, 강좌: (S.classes || []).filter(c => c.open === '전체').slice(0, 8).map(c => c.name), 주소: ft.addr || '', 연락처: ft.tel || '' })}\n지금 섹션: ${JSON.stringify(pg.sections.map(x => [x.type, (x.data || {}).variant || '', (x.data || {}).title || '']))}` }], max: 3000 });
        const s = String(r.text || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}'); const j = JSON.parse(s.slice(a, b + 1)); L = A(j.sections).filter(x => x && x.type); via = 'Claude'; } catch (e) { say(`Claude 연결이 원활하지 않아 기본 규칙으로 만듭니다(${e.message}).`, 'warn'); L = null; } }
    if (!L || !L.length) L = ruleSecs(v, label);
    const secs = mapSecs(L); if (!secs.length) { say('만들 섹션을 찾지 못했습니다. 예: 강사 소개와 오시는 길 넣어줘', 'warn'); return false; }
    return applySecs(secs, fresh ? 'replace' : 'add', `「${label}」 페이지에 ${secs.map(x => SECN(x)).join(' · ')}을(를) ${fresh ? '구성했습니다' : '넣었습니다'}(${via}).`); }
  window.hpsPageBuild = pageBuild;
  const GLOBAL_RE = /(색|컬러|테마|글꼴|폰트|분위기|고급|세련|프리미엄|깔끔|심플|따뜻|톤|글씨\s*크게|큰\s*글씨)/;
  addEventListener('submit', e => { const f = e.target; if (!HS.dock || !f || !f.matches || !f.matches('#hpe .hpw-talk')) return; const inp = f.querySelector('input[name=q]'); const v = inp ? inp.value.trim() : '';
    const code = $1('#hpsCodeT'); if (code && code.value.trim()) { e.preventDefault(); e.stopImmediatePropagation(); if (codeRun(code.value.trim())) { codeClose(); if (inp) inp.value = ''; } return; }
    if (!v) return; if (/```|<[a-z][\s\S]*>/i.test(v)) { e.preventDefault(); e.stopImmediatePropagation(); if (codeRun(v) && inp) inp.value = ''; return; }
    if (HS.lv) { e.preventDefault(); e.stopImmediatePropagation(); if (HS.lv.url) { say('외부 주소로 연결된 메뉴입니다. [메뉴 연결 바꾸기]로 연결을 바꾸세요.', 'warn'); return; } lhPrompt(v).then(ok => { if (ok && inp) inp.value = ''; }); return; }
    const HI = window.HPI; const LRN = curLearn();
    /* v37 학습 페이지: 머리글을 말하면(제목 · 소개 문구 · 배경 사진 · 정렬 · 바탕) 머리글을, 그 밖에는 이 페이지에 섹션을 만든다(홈 기준의 말로 고치기 계획으로 가지 않게) */
    if (LRN && !(HI && (A(HI.att).length || HI.ip)) && /(머리글|제목|타이틀|소개\s*문구|부제|배경|정렬|가운데|왼쪽|바탕|높이)/.test(v) && !/섹션/.test(v)) { const P0 = lhRules(v, LRN); if (Object.keys(P0).length) { e.preventDefault(); e.stopImmediatePropagation(); lhPrompt(v).then(ok => { if (ok && inp) inp.value = ''; }); return; } }
    if (HI && (A(HI.att).length || HI.ip || (!LRN && HI.sel && HI.sel.el))) return; /* 고른 글자 · 첨부 사진이 있으면 기존 처리(hpimg) */
    const known = typeof window.hpwTalk === 'function' ? window.hpwTalk(v, true) : null; const global = GLOBAL_RE.test(v.replace(/검색/g, ''));
    if (/게시판/.test(v) && !/(색|글꼴|폰트)/.test(v)) { e.preventDefault(); e.stopImmediatePropagation(); if (bdFromTalk(v) && inp) inp.value = ''; return; } /* v37 지시 4: '게시판 넣어줘' */
    if (HPE.key === 'home' ? (known && known.steps && known.steps.length) : (global && known && !LRN)) { site().hpsAiAt = site().hpsAiAt || today(); return; }
    e.preventDefault(); e.stopImmediatePropagation(); pageBuild(v).then(ok => { if (ok && inp) inp.value = ''; }); }, true);

  /* ═════════ 7. 학습 페이지 머리글(v36 R3 · 4-2): 두 번 눌러 고치기 · 머리글 도구 · 말로 고치기 · 게시본 hp.lhead ═════════ */
  const LH_CSS = `.sub.llh h1,.sub.llh .llh-d{cursor:text;border-radius:4px}
.sub.llh h1:hover,.sub.llh .llh-d:hover,.sub.llh .hps-pick{outline:2px dashed #5C74F6;outline-offset:4px}
.sub.llh [contenteditable]{outline:2px solid #5C74F6!important;outline-offset:4px;background:#fff!important;color:#14161F!important;-webkit-text-fill-color:#14161F}
.sub.llh .llh-ph{opacity:.6;border:1.5px dashed currentColor;padding:4px 12px;display:inline-block;border-radius:8px;font-size:15px}
.sub.llh:hover{box-shadow:inset 0 0 0 2px rgba(92,116,246,.55)}
.llh-tb{position:absolute;bottom:10px;right:12px;z-index:5;display:none;gap:2px;background:#2A2B2B;padding:4px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:600 12.5px/1 Pretendard,system-ui,sans-serif;flex-wrap:wrap;max-width:calc(100% - 24px);color:#fff}
.sub.llh:hover .llh-tb,.sub.llh.llh-sel .llh-tb,.llh-tb:focus-within{display:flex}
.llh-tb button{border:0;background:transparent;color:#fff;padding:8px 10px;border-radius:8px;cursor:pointer;font:inherit;white-space:nowrap;min-height:34px}.llh-tb button:hover,.llh-tb button:focus-visible{background:rgba(255,255,255,.18);outline:none}.llh-tb button[aria-pressed=true]{background:#5C74F6}
.llh-tb i{width:1px;background:rgba(255,255,255,.22);margin:4px 3px}
.llh-tag{position:absolute;left:12px;top:10px;z-index:5;background:#5C74F6;color:#fff;font:700 12px/1 Pretendard,system-ui,sans-serif;padding:6px 10px;border-radius:99px;display:none}.sub.llh:hover .llh-tag,.sub.llh.llh-sel .llh-tag{display:block}`;
  const lhFrame = () => $1('#hpsLvF');
  const lhKeyNow = () => { const lp = curLearn(); if (lp) return { k: lp, top: true }; /* v37: 학습 페이지는 같은 캔버스(#hpeF)에서 고친다 */
    const f = lhFrame(); try { const w = f && f.contentWindow; if (w && typeof w.lhKey === 'function') return w.lhKey(); } catch (e) { } return HS.lv && HS.lv.hash ? { k: decodeURIComponent(HS.lv.hash.slice(1)), top: true } : null; };
  /* 지금 캔버스 페이지가 학습 페이지면 그 주소(shop · notice · comm/<게시판> …), 아니면 '' */
  const curLearn = () => { if (HS.lv) return ''; const pg = pageOf(HPE.key); return pg && pg.learn ? pg.learn : ''; };
  const lhCur = k => ((site().lhead || {})[k]) || {};
  function lhReload() { const f = lhFrame(); try { if (f && f.contentWindow) f.contentWindow.postMessage('didisam:reload', location.origin); } catch (e) { } }
  function lhSet(k, patch, msg) { if (!k) return false; push(); const s = site(); const all = s.lhead = Object.assign({}, s.lhead || {}); const c = Object.assign({}, all[k] || {}, patch);
    Object.keys(c).forEach(x => { if (c[x] === '' || c[x] == null) delete c[x]; }); if (Object.keys(c).length) all[k] = c; else delete all[k];
    /* v37: 제목 · 소개 문구는 캔버스 머리글 섹션(lshead) 글과 같은 값 */ if ('t' in patch || 'd' in patch) A(curSecs()).forEach(x => { if (x.type === 'lshead' && x.data && x.data.route === k) { if (patch.t) x.data.title = patch.t; if ('d' in patch) x.data.sub = patch.d || ''; } });
    persist(); lhReload(); paint(); HS.lhSig = lhSigNow(); if (msg) say(msg + ' 마음에 들지 않으면 [되돌리기]를 누르세요.', 'ok'); return true; }
  window.hpsLhSet = lhSet;
  /* 샘플 사진(분위기 사진 · img/stock — 학습자 화면과 같은 폴더라 상대 주소 그대로) */
  function lhStock(q, k) { const H = window.HPSTOCK; if (!H || typeof H.forScene !== 'function') return ''; const cur = String(lhCur(k).img || ''); let L = [];
    try { const r = H.forScene(S.org.type, `${q || ''} ${(HS.lv && HS.lv.name) || ''}`, 'hero', { n: 6, seed: S.org.name + k }); L = Array.isArray(r) ? r : r ? [r] : []; } catch (e) { }
    const ok = L.filter(x => x && (x.src800 || x.src)); if (!ok.length) return ''; const i = ok.findIndex(x => cur.includes(x.id)); const it = ok[(i + 1) % ok.length]; return String(it.src800 || it.src); }
  /* 머리글 도구 · 두 번 눌러 고치기 — 학습자 화면이 다시 그려질 때마다(#lapp 변화) 붙인다 */
  const lhSeen = new WeakSet();
  function lhWatch(f) { if (f.dataset.hpsL) return; f.dataset.hpsL = 1; f.addEventListener('load', () => lhBindDoc(f)); lhBindDoc(f); }
  function lhBindDoc(f) { let doc; try { doc = f.contentDocument; } catch (e) { return; } if (!doc || !doc.body || lhSeen.has(doc) || !/learner\.html/.test(String(doc.URL || ''))) return; lhSeen.add(doc); const win = doc.defaultView;
    const st = doc.createElement('style'); st.textContent = LH_CSS; doc.head.appendChild(st);
    let q = 0; new MutationObserver(() => { if (q) return; q = win.requestAnimationFrame(() => { q = 0; lhDeco(doc, f); }); }).observe(doc.body, { childList: true, subtree: true }); lhDeco(doc, f);
    win.addEventListener('click', e => { const t = e.target; const b = t.closest && t.closest('[data-llh]'); if (b) { e.preventDefault(); e.stopPropagation(); lhTool(b.dataset.llh, b.dataset.v); return; }
      const el = t.closest && t.closest('.sub.llh h1, .sub.llh .llh-d'); if (el && !el.isContentEditable) { e.preventDefault(); doc.querySelectorAll('.hps-pick').forEach(x => x !== el && x.classList.remove('hps-pick')); el.classList.add('hps-pick'); const sub = el.closest('.sub'); if (sub) sub.classList.add('llh-sel'); hint(el, f, '두 번 눌러 글 고치기'); } }, true);
    win.addEventListener('dblclick', e => { const el = e.target.closest && e.target.closest('.sub.llh h1, .sub.llh .llh-d'); if (!el) return; e.preventDefault(); hint(null); lhEdit(el, el.tagName === 'H1' ? 't' : 'd'); }, true);
    win.addEventListener('hashchange', () => lhNav(win.location.hash || '#home'));
    win.addEventListener('scroll', () => hint(null), { passive: true }); }
  function lhDeco(doc, f) { const sub = doc.querySelector('#lm > section.sub.llh'); if (!sub || sub.querySelector('.llh-tb')) return; const K = lhKeyNow(); const k = K && K.k; const c = lhCur(k); const top = !!(K && K.top);
    if (top && !sub.querySelector('.llh-d')) { const p = doc.createElement('p'); p.className = 'llh-d llh-ph'; p.textContent = '소개 문구 — 두 번 눌러 넣기'; (sub.querySelector('.in') || sub).appendChild(p); }
    const pr = (a, v, on, n) => `<button type="button" data-llh="${a}" data-v="${v}" aria-pressed="${!!on}">${n}</button>`;
    const tone = c.tone || 'soft', al = c.al || 'l', h = c.h || 'm';
    sub.insertAdjacentHTML('beforeend', `<span class="llh-tag" aria-hidden="true">${top ? '머리글 — 글은 두 번 눌러 고치기' : '머리글 모양(제목은 목록 화면에서)'}</span><div class="llh-tb" role="toolbar" aria-label="머리글 도구"><button type="button" data-llh="up">사진 올리기</button><button type="button" data-llh="stock">샘플 사진</button>${c.img ? '<button type="button" data-llh="noimg">사진 빼기</button>' : ''}<i></i>${pr('al', 'l', al === 'l', '왼쪽')}${pr('al', 'c', al === 'c', '가운데')}<i></i>${pr('h', 's', h === 's', '작게')}${pr('h', 'm', h === 'm', '보통')}${pr('h', 'l', h === 'l', '크게')}<i></i>${pr('tone', 'plain', !c.img && tone === 'plain', '흰 바탕')}${pr('tone', 'soft', !c.img && tone === 'soft', '연한 색')}${pr('tone', 'brand', !c.img && tone === 'brand', '대표 색')}</div>`);
    if (HS.lv && !HS.lv.url) { const n = (sub.querySelector('h1') || {}).textContent; if (n && top && HS.lv.name !== n.trim()) { /* 탭 이름은 메뉴 이름 그대로 */ } } }
  function lhEdit(el, field) { const K = lhKeyNow(); if (!K || !K.k) return; if (!K.top) { say('이 화면은 목록 아래 화면입니다. 제목 · 소개 문구는 목록 화면에서 고칩니다.', 'warn'); return; }
    const ph = el.classList.contains('llh-ph'); const orig = el.textContent; if (ph) el.textContent = ''; el.contentEditable = 'true'; el.focus();
    try { const d = el.ownerDocument; const r = d.createRange(); r.selectNodeContents(el); const sel = d.defaultView.getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (e) { }
    let fin = false; const done = save => { if (fin) return; fin = true; el.removeEventListener('keydown', kd); el.removeEventListener('blur', bl); el.removeAttribute('contenteditable');
      const v = String(el.textContent || '').replace(/\s+/g, ' ').trim(); const was = ph ? '' : String(orig).replace(/\s+/g, ' ').trim();
      if (!save || v === was) { el.textContent = orig; return; } if (field === 't' && !v) { el.textContent = orig; say('제목은 비울 수 없습니다. 원래 이름으로 두려면 [되돌리기]를 누르세요.', 'warn'); return; }
      lhSet(K.k, { [field]: v.slice(0, field === 't' ? 60 : 200) }, field === 't' ? `제목을 「${v.slice(0, 30)}」(으)로 고쳤습니다.` : v ? '소개 문구를 고쳤습니다.' : '소개 문구를 뺐습니다.'); };
    const kd = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } };
    const bl = () => done(true); el.addEventListener('keydown', kd); el.addEventListener('blur', bl); }
  function lhTool(a, v) { const K = lhKeyNow(); const k = K && K.k; if (!k) return; const nm = (HS.lv && HS.lv.name) || '학습 페이지';
    if (a === 'al') return lhSet(k, { al: v === 'c' ? 'c' : '' }, v === 'c' ? '머리글을 가운데로 맞췄습니다.' : '머리글을 왼쪽으로 맞췄습니다.');
    if (a === 'h') return lhSet(k, { h: v === 'm' ? '' : v }, `머리글 높이를 ${{ s: '작게', m: '보통으로', l: '크게' }[v] || ''} 바꿨습니다.`);
    if (a === 'tone') return lhSet(k, { tone: v === 'soft' ? '' : v, img: '' }, `머리글 바탕을 ${{ plain: '흰 바탕', soft: '연한 대표 색', brand: '대표 색' }[v]}으로 바꿨습니다.`);
    if (a === 'noimg') return lhSet(k, { img: '' }, '배경 사진을 뺐습니다.');
    if (a === 'stock') { const u = lhStock('', k); if (!u) { say('샘플 사진을 찾지 못했습니다. [사진 올리기]로 넣어 주세요.', 'warn'); return; } return lhSet(k, { img: u }, `「${nm}」 머리글에 샘플 사진을 넣었습니다(누를 때마다 다른 사진). 우리 기관 사진으로 바꾸려면 [사진 올리기]를 누르세요.`); }
    if (a === 'up') { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.addEventListener('change', () => { const fl = i.files && i.files[0]; if (!fl) return;
        const put = url => { if (!/^data:image\//.test(url || '') && !/^https:\/\//.test(url || '')) { say('사진을 읽지 못했습니다.', 'warn'); return; } lhSet(k, { img: url }, `「${nm}」 머리글 배경 사진을 바꿨습니다.`); };
        if (typeof window.hpImgFile === 'function') window.hpImgFile(fl, put); else { const r = new FileReader(); r.onload = () => put(String(r.result || '')); r.readAsDataURL(fl); } }); i.click(); } }
  /* 미리보기 안에서 메뉴를 누르면 편집기 탭도 그 페이지로 */
  function lhNav(h) { if (!HS.lv || HS.lv.url) return; if (h === '#' || h === '#home') { goHp('home'); return; }
    const m = h.match(/^#hp\/(.+)$/); if (m) { const k = decodeURIComponent(m[1]); if (pageOf(k)) { goHp(k); return; } }
    const s = site(); let hit = null; A(s.menus).filter(x => x.on !== false).forEach(x => { const t1 = target(x); if (!hit && t1.hash === h) hit = [x.kind === 'home' ? 'home' : 'm-' + x.id, x]; A(x.subs).forEach(b => { const t2 = target(b, x); if (!hit && t2.hash === h) hit = ['s-' + x.id + '-' + b.id, b]; }); });
    HS.lv = Object.assign({}, HS.lv, hit ? { tab: hit[0], name: (HS.lab && HS.lab[hit[0]]) || mName(hit[1].l) } : {}, { hash: h }); deco(true); lvPaint(); }
  function goHp(key) { HS.lv = null; HPE.key = pageOf(key) ? key : 'home'; UI.sitePage = HPE.key; HS.lastUI = HPE.key; lvPaint(); paint(); deco(true); }
  /* 말로 고치기: 규칙(따옴표 안 글 · 사진 · 정렬 · 높이 · 바탕) → 못 알아들으면 Claude(연결 시) */
  /* v36 R4 '제목 바꿔줘 X' · '제목을 X로' · '제목 X'도 알아듣는다(따옴표 문구는 위에서 먼저 처리). 다른 지시가 섞이면 기존 규칙에 맡긴다 */
  function lhTitle(v) { const m = String(v || '').match(/(?:^|\s)(?:제목|타이틀)(?:을|를|은|는|도)?\s*[:：]?\s*(.*)$/); if (!m) return '';
    let x = m[1].split(/\s*(?:,|·|그리고|바꾸고|바꿔\s*주고|고치고|변경하고|해\s*주고|하고(?=\s))\s*/)[0].trim().replace(/^(?:좀\s*)?(?:바꿔|바꾸어|바꿔서|변경해|변경|고쳐|수정해|수정)\s*(?:줘|주세요|줄래|주라|봐)?\s*[:：\-—]?\s*/, '');
    x = x.replace(/\s*(?:좀\s*)?(?:바꿔|바꾸어|바꿔서|변경해|변경|고쳐|수정해|수정|해|하자|해요|할게)\s*(?:줘|주세요|줄래|주라|봐|요)?[.!~]*$/, '').trim();
    if (/으로$/.test(x)) x = x.slice(0, -2); else if (/로$/.test(x) && x.length > 1) { const c = x.charCodeAt(x.length - 2) - 0xAC00; if (!(c >= 0 && c < 11172) || c % 28 === 0 || c % 28 === 8) x = x.slice(0, -1); } /* '진로'처럼 받침 있는 글자 뒤 '로'는 이름의 일부 */
    x = x.trim();
    if (!x || x.length > 40 || /(사진|이미지|배경|정렬|가운데|크게|작게|색|소개|설명|문구|하고\s)/.test(x)) return ''; return x; }
  function lhRules(v, k) { const P = {}; const q = (v.match(/["“”'‘’「『]([^"“”'‘’」』]{1,80})["“”'‘’」』]/) || [])[1];
    const cut = re => { const m = v.match(re); return m ? m[1].trim() : ''; };
    if (q && /(소개|설명|문구|부제|한\s*줄)/.test(v) && !/(제목|이름|타이틀)/.test(v)) P.d = q; else if (q) P.t = q;
    else { const t2 = lhTitle(v) || cut(/(?:제목|이름|타이틀)[을를은는]?\s*(.{1,40}?)\s*(?:으로|로)\s*(?:바꿔|해|변경|고쳐)/); if (t2) P.t = t2; const d2 = cut(/(?:소개|설명)\s*(?:문구|글)?[을를은는]?\s*(.{2,120}?)\s*(?:으로|로|라고)\s*(?:바꿔|해|넣어|써)/); if (d2) P.d = d2; }
    if (/(사진|이미지|배경)/.test(v)) { if (/(빼|없애|지워|삭제|없이)/.test(v)) P.img = ''; else if (!/(색|컬러)/.test(v) || /(사진|이미지)/.test(v)) { const u = lhStock(v, k); if (u) P.img = u; } }
    if (/(가운데|중앙)/.test(v)) P.al = 'c'; else if (/왼쪽/.test(v)) P.al = '';
    if (/(크게|높게|넓게|시원하게)/.test(v)) P.h = 'l'; else if (/(작게|낮게|얇게|짧게|줄여)/.test(v)) P.h = 's'; else if (/보통/.test(v)) P.h = '';
    if (/(진하게|어둡게|대표\s*색|브랜드\s*색|강조\s*색|포인트\s*색)/.test(v)) { P.tone = 'brand'; if (!('img' in P)) P.img = ''; } else if (/(연하게|밝게|부드럽|은은)/.test(v)) { P.tone = ''; if (!('img' in P)) P.img = ''; } else if (/(흰\s*바탕|하얀|흰색)/.test(v)) { P.tone = 'plain'; if (!('img' in P)) P.img = ''; }
    if (!Object.keys(P).length && /(꾸며|멋지게|예쁘게|화려하게|눈에\s*띄게|고급)/.test(v)) { const u = lhStock(v, k); if (u) P.img = u; P.h = 'l'; }
    return P; }
  const LH_SYS = `당신은 교육기관 홈페이지 편집자입니다. 학습 페이지(목록 화면) 머리글 하나를 요청대로 바꿉니다. JSON 객체 하나만 출력합니다.
형식: {"t":"제목(바꿀 때만, 20자 이내)","d":"소개 문구(바꿀 때만, 60자 이내)","al":"l|c","h":"s|m|l","tone":"plain|soft|brand","img":"stock|none|keep"}
바꾸지 않는 항목은 넣지 않습니다. 없는 수치 · 수상 · 인물은 지어내지 않습니다. 쉬운 한국어.`;
  async function lhPrompt(v) { const K = lhKeyNow(); const k = K && K.k; if (!k) { say('학습 페이지 화면을 불러오는 중입니다. 잠시 뒤 다시 시도하세요.', 'warn'); return false; }
    if (!K.top) { say('이 화면은 목록 아래 화면입니다. 위 탭에서 목록 화면으로 돌아간 뒤 고치세요.', 'warn'); return false; }
    let P = lhRules(v, k); let via = '규칙';
    if (!Object.keys(P).length && aiOn()) { try { say(`${CL.label ? CL.label() : 'Claude'}가 머리글을 고치고 있습니다…`); const c = lhCur(k);
        const r = await CL.call({ system: LH_SYS, messages: [{ role: 'user', content: `요청: ${v}\n페이지: ${(HS.lv && HS.lv.name) || k}\n기관: ${S.org.name}(${(TYPES[S.org.type] || {}).name || ''})\n지금: ${JSON.stringify(c)}` }], max: 600 });
        const s = String(r.text || ''); const j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); const Q = {};
        if (j.t) Q.t = String(j.t).slice(0, 60); if (j.d) Q.d = String(j.d).slice(0, 200); if (/^[lc]$/.test(j.al)) Q.al = j.al === 'c' ? 'c' : ''; if (/^[sml]$/.test(j.h)) Q.h = j.h === 'm' ? '' : j.h;
        if (/^(plain|soft|brand)$/.test(j.tone)) Q.tone = j.tone === 'soft' ? '' : j.tone; if (j.img === 'none') Q.img = ''; if (j.img === 'stock') { const u = lhStock(v, k); if (u) Q.img = u; } P = Q; via = 'Claude'; } catch (e) { say(`Claude 연결이 원활하지 않아 기본 규칙으로 처리합니다(${e.message}).`, 'warn'); } }
    if (!Object.keys(P).length) { say(`알아듣지 못했습니다. 예: 제목을 "전체 ${lbl()}"으로 · 소개 문구 "…" · 배경 사진 넣어줘 · 가운데 정렬 · 크게 · 대표 색으로`, 'warn'); return false; }
    const W = { t: '제목', d: '소개 문구', img: '배경 사진', al: '정렬', h: '높이', tone: '바탕 색' }; return lhSet(k, P, `「${(HS.lv && HS.lv.name) || '학습 페이지'}」 머리글의 ${Object.keys(P).map(x => W[x]).filter(Boolean).join(' · ')}을(를) 바꿨습니다(${via}).`); }
  window.hpsLhPrompt = lhPrompt;
  /* 되돌리기 · 다른 곳에서 바뀐 경우에도 미리보기를 맞춘다 */
  /* 머리글 · 테마 색 · 글꼴 · 로고 · 메뉴가 바뀌면(되돌리기 · 디자인 패널 포함) 학습 페이지 미리보기도 다시 그린다 */
  const lhSigNow = () => { const s = S.site; return JSON.stringify([s.lhead || {}, s.theme || '', s.color || '', s.hpFont || s.font || '', s.fonts || '', (s.gnb || {}).logo ? 1 : 0, A(s.menus).map(m => [m.l, m.on, m.link])]); };
  const lhTick = () => { try { if (HS.dock && HS.lv && !HS.lv.url && S && S.site) { const sg = lhSigNow(); if (HS.lhSig != null && HS.lhSig !== sg) lhReload(); HS.lhSig = sg; } } catch (e) { } };
  AFTER.push(lhTick); setInterval(lhTick, 700);
  /* 게시본: hp.lhead(학습자 화면 lhead.js가 읽음) — 글자 수 · 사진 주소를 거른다 */
  function lhPub() { const o = {}; const L = (S.site && S.site.lhead) || {};
    Object.keys(L).slice(0, 40).forEach(k => { const c = L[k] || {}; if (!/^[\w가-힣ㄱ-ㅎ /.·()-]{1,48}$/.test(k)) return; const x = {};
      if (c.t) x.t = String(c.t).slice(0, 60); if (c.d) x.d = String(c.d).slice(0, 200); const im = String(c.img || '');
      if (/^data:image\/(png|jpe?g|webp|gif);base64,[\w+/=]+$/.test(im) || /^https?:\/\/[^\s"'()\\]+$/.test(im) || /^img\/stock\/[\w-]+\.(webp|jpg|png)$/.test(im)) x.img = im;
      if (c.al === 'c') x.al = 'c'; if (c.h === 's' || c.h === 'l') x.h = c.h; if (/^(plain|soft|brand)$/.test(c.tone || '')) x.tone = c.tone; if (Object.keys(x).length) o[k] = x; });
    return o; }
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { if (r && r.hp) { r.hp.lhead = lhPub(); lxPub(r.hp); } } catch (e) { console.error('hps lhead', e); } return r; }; window.lsSnapshot = lsSnapshot; }

  /* ═════════ 8. 템플릿 고르기 = 편집기 안 큰 패널(v36 R3 · 평가 4-5) — 고르면 적용 · [되돌리기]로 이전 사이트 · 닫으면 편집기 그대로 ═════════ */
  { const base = ACT['tpl-gallery']; ACT['tpl-gallery'] = (...a) => { if (!HS.dock || !window.TPD || typeof TPD.gallery !== 'function') return base(...a); galOpen(); }; }
  function galOpen() { HS.gal = 1; if (HS.pan) panClose(); hint(null); galPaint(); }
  function galClose() { HS.gal = 0; const g = $1('#hpsGal'); if (g) g.remove(); document.body.classList.remove('hps-gal-on'); deco(true); setTimeout(fit, 0); }
  ACT['hps-galx'] = () => galClose();
  const galIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { galIO.unobserve(x.target); galThumb(x.target); } }), { rootMargin: '360px 0px' }) : null;
  function galThumb(el) { if (el.dataset.ok) return; const tp = TPL.find(t => t.id === el.dataset.tp); const f = el.querySelector('iframe'); if (!tp || !f) return; el.dataset.ok = 1;
    const w = el.clientWidth; if (w) f.style.transform = `scale(${w / 1280})`; try { f.srcdoc = siteHTML(TPD.fromTpl(tp), false, 'ko'); } catch (e) { console.error('hps gal', e); } }
  function galPaint() { const w = $1('#hpe'); if (!w || !HS.gal) return; let g = $1('#hpsGal'); const fresh = !g;
    if (!g) { g = document.createElement('section'); g.id = 'hpsGal'; g.className = 'hps-gal'; g.setAttribute('role', 'region'); g.setAttribute('aria-label', '템플릿 고르기'); w.appendChild(g); }
    let h = ''; try { h = TPD.gallery(); } catch (e) { console.error('hps gal', e); }
    h = h.replace(/<button[^>]*data-act="tpl-back"[^>]*>[\s\S]*?<\/button>/, '');
    const sig = h.length + '|' + (UI.tpdK || ''); if (g.dataset.sig === sig) return; g.dataset.sig = sig;
    g.innerHTML = `<div class="hps-galh"><div><b>템플릿 고르기</b><p>카드를 누르면 크게 미리 봅니다. [이 템플릿으로 시작]을 누르면 지금 사이트가 바뀌고, 마음에 들지 않으면 [되돌리기]로 돌아옵니다.</p></div><button type="button" class="btn" data-act="hps-galx">${SV(P.x, 16, 2)} 닫고 편집기로</button></div><div class="hps-galb">${h}</div>`;
    document.body.classList.add('hps-gal-on'); talkSet(false); const bar = w.querySelector('.hpe-bar'); if (bar) w.style.setProperty('--hps-gt', (bar.offsetTop + bar.offsetHeight) + 'px'); const sc = g.querySelector('.hps-galb');
    g.querySelectorAll('.tpd-th:not([data-ok])').forEach(el => { if (galIO) galIO.observe(el); else galThumb(el); });
    if (fresh) { const q = g.querySelector('#tpdQ'); if (q && innerWidth > 760) try { q.focus({ preventScroll: true }); } catch (e) { } if (sc) sc.scrollTop = 0; } }
  addEventListener('resize', () => { document.querySelectorAll('#hpsGal .tpd-th[data-ok]').forEach(el => { const f = el.querySelector('iframe'); if (f && el.clientWidth) f.style.transform = `scale(${el.clientWidth / 1280})`; }); });
  AFTER.push(() => { try { if (HS.dock && HS.gal) galPaint(); else if (!HS.dock && $1('#hpsGal')) galClose(); } catch (e) { console.error('hps gal', e); } });
  { const base = ACT['tpd-use']; if (base) ACT['tpd-use'] = (...a) => { if (!HS.dock) return base(...a); const el = a[0]; const tp = TPL.find(t => t.id === (el && el.dataset && el.dataset.v)); if (!tp) return base(...a);
      if (typeof slClose === 'function') try { slClose(); } catch (e) { } UI.tpdQ = ''; push(); const was = !!(S.site && S.site.published);
      ACT['tpl-use']({ dataset: { v: tp.id } }); if (was && S.site && !S.site.published) S.site.published = true; HS.lv = null; HPE.key = 'home'; UI.sitePage = 'home'; galClose(); persist();
      setTimeout(() => { paint(); deco(true); say(`「${tp.name}」 템플릿으로 바꿨습니다. 마음에 들지 않으면 [되돌리기]를 누르세요.`, 'ok'); }, 30); }; }
  addEventListener('keydown', e => { if (e.key !== 'Escape' || !HS.gal || $1('#slSheet') || $1('#modal')) return; const tg = e.target; if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) && tg.value) return; galClose(); e.stopImmediatePropagation(); }, true);

  /* ═════════ 9. v37(대표님 2026-11-10 지시 2 · 3 · 4) — 학습 페이지도 같은 캔버스 · 패널은 편집기 안 · 하위 메뉴 · 게시판 섹션 ═════════
     ① 학습 페이지로 가는 메뉴(교육과정 목록 · 공지 · 커뮤니티 · 게시판 · 교재 · 내 학습 · 과정 하나)도 홈페이지 페이지처럼 섹션 배열(메뉴의 lsecs)을 갖는다:
        [머리글 lshead(맨 위 고정 · 제목 · 소개 문구 · 모양)] + 운영자가 넣은 섹션 + [자동 목록 lslist(데이터로 채움 · 위아래만)] + 섹션.
        같은 캔버스(#hpeF)에서 두 번 눌러 고치기 · 섹션 도구 · [+ 섹션] · AI 지시가 홈과 똑같이 동작한다.
        게시: 머리글 제목 · 소개 → hp.lhead(학습자 머리글), 목록 위 · 아래 섹션 → hp.lx[주소] = { pre, post }(lhead.js가 학습 페이지에 붙임).
     ② 메뉴 · 학습 페이지 · 세부 설정 아이콘: 다른 화면으로 가지 않고 편집기 안 패널(메뉴 = 오른쪽 넓은 패널, 학습 페이지 · 세부 설정 = 캔버스 위 큰 패널).
     ③ 하위 메뉴: 탭에 마우스를 올리면 [＋ 하위], [＋ 페이지]에서 '하위 메뉴로 넣기', 메뉴 패널에서 오른쪽으로 끌어 들이면 하위로, 둘째 줄 빈 상태 안내.
     ④ 게시판 섹션: 기존 게시판 고르기 또는 새로 만들기(comm2 cmMkBoard · CM_BT 그대로), 최근 글 n개 · 더 보기 · 글쓰기, 메뉴(페이지)로도 추가.
        학습자 사이트: 글 목록 #comm/<게시판> · 글 보기 #post/<id> · 글쓰기 #write/b:<게시판>(lcomm) — lhead.js가 최신 글로 다시 채운다. */
  const cls = () => (typeof t === 'function' ? t('cls') : '강좌');
  /* 세부 설정(예전 섹션 목록)이 학습 페이지의 새 섹션 종류 이름을 읽을 수 있게 — 추가 목록(열거)에는 넣지 않는다 */
  try { if (typeof SEC !== 'undefined') [['lshead', '머리글(페이지 제목)', 1], ['lslist', '자동 목록', 1], ['board', '게시판', 99]].forEach(([k, n, max]) => { if (!SEC[k]) Object.defineProperty(SEC, k, { value: { n, max }, enumerable: false, configurable: true }); }); } catch (e) { }
  const enc = v => encodeURIComponent(String(v == null ? '' : v));
  const boardsL = () => A(typeof S !== 'undefined' && S ? S.boards : []);
  /* 학습 주소 → 목록 종류 */
  const listKind = (r, kind) => { const a = String(r || '').split('/')[0]; return { shop: 'cls', courses: 'cls', notice: 'notice', comm: 'comm', textbooks: 'book', my: 'my', class: 'one' }[a] || { class: 'cls', book: 'book', community: 'comm', notice: 'notice', board: 'comm' }[kind] || 'cls'; };
  const subDef = (lk, r) => { if (lk === 'comm' && /^comm\/./.test(r)) { const b = boardsL().find(x => x.id === r.slice(5)); return (b && b.desc) || '궁금한 점을 묻고 이야기를 나눠요.'; }
    return { cls: `지금 신청할 수 있는 ${cls()}입니다.`, notice: '새로운 소식과 안내를 확인하세요.', comm: '궁금한 점을 묻고 이야기를 나눠요.', book: '수업에 쓰는 교재 · 교구입니다.', my: `내 ${cls()} · 진도 · 수료증을 한곳에서 봐요.`, one: '' }[lk] || ''; };
  /* s2pages 훅(site2.js): 학습 페이지 · 섹션 없는 기본 메뉴 페이지(공지 등)에 섹션 배열을 준다 */
  window.s2pagesHook = (P, s) => { if (!s || !Array.isArray(s.menus)) return; const LH = s.lhead || {};
    P.forEach(p => { if (p.key === 'home' || !p.m) return; const it = p.sb || p.m; const tg = target(it, p.sb ? p.m : null); if (tg.url || tg.key === 'home') return;
      const route = tg.hash ? decodeURIComponent(tg.hash.slice(1)) : ''; if (!route && Array.isArray(p.sections)) return; /* 직접 꾸미는 페이지는 그대로 */
      const lk = listKind(route, it.kind); const def = mName(it.l) || '페이지';
      if (!Array.isArray(it.lsecs)) { const c = LH[route] || {}; it.lsecs = [{ id: uid('s'), type: 'lshead', data: { title: c.t || def, sub: c.d != null ? c.d : subDef(lk, route), def } }, { id: uid('s'), type: 'lslist', data: {} }]; }
      it.lsecs.forEach(x => { if (!x || !x.data) return; if (x.type === 'lshead') { if (!x.data.title || x.data.title === x.data.def) x.data.title = def; x.data.def = def; } if (PIN[x.type]) { x.data.route = route; x.data.lk = lk; x.data.kind = it.kind || ''; } });
      p.sections = it.lsecs; p.learn = route; p.lp = true; }); };

  /* ── 렌더러: 머리글 · 자동 목록 · 게시판 ── */
  const lumL = c => { try { return lum(c); } catch (e) { return .5; } };
  const tokS = s => { try { return window.HPT && HPT.tokens ? HPT.tokens(s) : null; } catch (e) { return null; } };
  function lsHead(x, s) { const d = x.data || {}; const c = (site().lhead || {})[d.route] || {}; const T = tokS(s) || {}; const a = /^#[0-9a-f]{6}$/i.test(T.a || '') ? T.a : (s.color || '#5C74F6');
    const okImg = /^(data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/|img\/stock\/)/.test(String(c.img || '')); const tone = okImg ? 'img' : ['plain', 'soft', 'brand'].includes(c.tone) ? c.tone : 'soft';
    const on = T.on || (lumL(a) > .35 ? '#14161F' : '#fff'); const st = `--lsh-a:${a};--lsh-on:${on}${T.as ? `;--lsh-as:${T.as}` : ''}${okImg ? `;--lsh-img:url('${String(c.img).replace(/['"()\\\s]/g, '')}')` : ''}`;
    return `<section class="hpx-lsh lt-${tone}${c.al === 'c' ? ' al-c' : ''}${c.h === 's' || c.h === 'l' ? ' h-' + c.h : ''}" style="${E(st)}"><div class="hpx-lsw"><nav class="hpx-lshc" aria-label="이동 경로">홈 › ${E(d.def || d.title || '')}</nav><h1>${E(d.title || '')}</h1>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div></section>`; }
  const pubIds = () => (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료').map(c => c.id);
  function lsList(x, i, s, lk2) { const d = x.data || {}; const k = d.lk || 'cls'; const r = String(d.route || ''); const ed = !!HPE.map; let inner = ''; const P2 = (o) => { try { return proSec(Object.assign({ id: '_lsl', data: {} }, o), i, s, lk2) || ''; } catch (e) { console.error('hps lsl', e); return ''; } };
    if (k === 'cls') inner = P2({ type: 'classes', data: { title: '', ids: pubIds() } });
    else if (k === 'one') inner = P2({ type: 'classes', data: { title: '', ids: [r.split('/')[1]].filter(Boolean) } });
    else if (k === 'notice') inner = P2({ type: 'notices', data: { title: '', n: 10 } });
    else if (k === 'book') inner = P2({ type: 'books', data: { title: '', ids: (S.books || []).filter(b => (b.open || '전체') === '전체').map(b => b.id) } });
    else if (k === 'comm') { const bid = /^comm\/./.test(r) ? r.slice(5) : (d.kind === 'board' ? ((boardsL().find(b => b.id !== '커뮤니티') || {}).id || '') : ''); inner = bdHTML({ bid, n: 8, title: '', all: !bid }, s); }
    else inner = `<section class="hpx-lsmy"><div class="hpx-lsw"><div><b>로그인하면 이곳에 내 학습이 보입니다</b><p>수강 중인 ${E(cls())} · 진도 · 수료증 · 내 활동</p></div></div></section>`;
    const note = { cls: `공개 ${cls()} 목록 — ${cls()} 메뉴에서 만들고 공개합니다`, one: `${cls()} 하나 — ${cls()} 메뉴에서 고칩니다`, notice: '공지 목록 — 소통 › 공지에서 씁니다', comm: '게시글 목록 — 소통 › 게시판에서 관리합니다', book: '교재 · 교구 목록', my: '로그인한 학습자에게 보이는 내 학습 화면' }[k] || '자동 목록';
    return `<section class="hpx-lsl">${ed ? `<div class="hpx-lsb" aria-hidden="true">${SV(P.learn, 14)} 자동 목록 · ${E(note)}</div>` : ''}${inner}<i class="hpx-lse"></i></section>`; }
  /* 게시판 섹션: 게시본에는 공개 글만(비공개 · 쌤에게만 글은 제목을 숨김), 회원 전용 게시판은 목록 대신 안내 → 학습자 화면에서 권한대로 다시 채움(lhead.js) */
  const bdPosts = (bid, n) => A(S.posts).filter(p => p && !p.hidden && !p.rv && (bid ? p.board === bid : true) && (bid || !['수강후기', '학습노트'].includes(p.board)))
    .sort((a, b) => (!!b.pin - !!a.pin) || String(b.at || '').localeCompare(String(a.at || ''))).slice(0, Math.max(1, Math.min(20, +n || 5)));
  function bdHTML(d, s) { const b = boardsL().find(x => x.id === d.bid); const ed = !!HPE.map; const all = !!d.all;
    if (!b && !all) return ed ? `<section class="hpx-bd"><div class="hpx-lsw"><p class="hpx-bde">연결된 게시판이 없습니다. [게시판 설정]에서 게시판을 고르세요.</p></div></section>` : '';
    const perm = b ? ((b.perm || {}).type || 'all') : 'all'; const open = perm === 'all'; const L = open ? bdPosts(b ? b.id : '', d.n) : [];
    const nick = p => p.who === 'admin' ? (p.by || '운영자') : (typeof cmNick === 'function' && typeof M === 'function' ? cmNick(M(p.who)) : '회원');
    const nc = p => { const r = p.replies || p.comments; return Array.isArray(r) ? r.length : 0; };
    const li = L.map(p => { const lock = !!(p.tonly || p.priv); return `<li><a href="#post/${enc(p.id)}"><b>${p.pin ? '<em>공지</em>' : ''}${E(lock ? '비공개 글입니다' : (p.title || String(p.body || '').slice(0, 30) || '(내용 없음)'))}</b><small>${E(nick(p))} · ${E(String(p.at || '').slice(0, 10))}${nc(p) ? ` · 댓글 ${nc(p)}` : ''}</small></a></li>`; }).join('');
    const ttl = d.title != null && d.title !== '' ? d.title : ''; const more = b ? `#comm/${enc(b.id)}` : '#comm'; const wr = b && b.write !== 'admin';
    return `<section class="hpx-bd" data-n="${Math.max(1, Math.min(20, +d.n || 5))}"><div class="hpx-lsw">${ttl ? `<div class="hpx-bdh"><h2>${E(ttl)}</h2>${b && b.desc ? `<p>${E(b.desc)}</p>` : ''}</div>` : ''}
      <ul class="hpx-bdl">${li || `<li class="hpx-bde">${open ? '아직 글이 없어요. 첫 글을 남겨 주세요.' : '회원 전용 게시판이에요. 로그인하면 글이 보여요.'}</li>`}</ul>
      <div class="hpx-bdf"><a class="hpx-bdm" href="${E(more)}">${E(b ? b.name : '게시판')} 더 보기 →</a>${wr ? `<a class="hpx-bdw" href="#write/b:${enc(b.id)}">글쓰기</a>` : ''}</div></div></section>`; }
  window.hpsBoardHTML = bdHTML;
  const mark = (h, x) => { const m = HPE.map ? HPE.map.get(x) : null; return m ? h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`) : h; };
  if (typeof proSec === 'function') { const base = proSec; proSec = (x, i, s, lk2) => {
      if (x && (x.type === 'lshead' || x.type === 'lslist' || x.type === 'board')) { if (x.hide && !HPE.map) return ''; try { s = s || site(); const h = x.type === 'lshead' ? lsHead(x, s) : x.type === 'lslist' ? lsList(x, i, s, lk2) : bdHTML(x.data || {}, s); return mark(h, x); } catch (e) { console.error('hps sec', e); return ''; } }
      return base(x, i, s, lk2); }; window.proSec = proSec; }
  const XCSS = `/* v37 hps 학습 페이지 머리글 · 자동 목록 · 게시판 */
.hpx-lsw{max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,40px);box-sizing:border-box}
.hpx-lsh{position:relative;padding:44px 0 34px;background:var(--lsh-as,color-mix(in srgb,var(--lsh-a) 9%,#fff));color:#14161F;isolation:isolate;word-break:keep-all}
.hpx-lsh h1{margin:6px 0 0;font-size:clamp(28px,3.6vw,40px);line-height:1.2;letter-spacing:-.025em;font-weight:var(--hd-fw,800);font-family:var(--hd-ff,inherit);color:inherit}
.hpx-lsh p{margin:10px 0 0;font-size:17px;line-height:1.6;max-width:720px;opacity:.82;white-space:pre-line}.hpx-lshc{font-size:13px;opacity:.7}
.hpx-lsh.lt-plain{background:#fff;border-bottom:1px solid rgba(20,22,31,.08)}.hpx-lsh.lt-brand{background:var(--lsh-a);color:var(--lsh-on)}
.hpx-lsh.lt-img{color:#fff;background:#1B1C22 var(--lsh-img) center/cover no-repeat}.hpx-lsh.lt-img::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(10,12,20,.72),rgba(10,12,20,.3))}
.hpx-lsh.al-c .hpx-lsw{text-align:center}.hpx-lsh.al-c p{margin-left:auto;margin-right:auto}.hpx-lsh.h-s{padding:26px 0 20px}.hpx-lsh.h-l{padding:96px 0 80px}.hpx-lsh.h-l h1{font-size:clamp(34px,5vw,56px)}
.hpx-lsl{position:relative;display:block;padding:8px 0}.hpx-lsb{position:absolute;left:12px;top:10px;z-index:5;display:inline-flex;align-items:center;gap:6px;background:#EEF0FF;color:#2B3796;font:700 12px/1 Pretendard,system-ui,sans-serif;padding:7px 11px;border-radius:99px;box-shadow:0 1px 0 rgba(0,0,0,.04)}
.hpx-lse{display:none}
.hpx-lsmy{padding:48px 0}.hpx-lsmy .hpx-lsw>div{border:1.5px dashed rgba(20,22,31,.2);border-radius:14px;padding:36px;text-align:center}.hpx-lsmy b{font-size:18px}.hpx-lsmy p{margin:6px 0 0;opacity:.7}
.hpx-bd{padding:clamp(40px,6vw,72px) 0}.hpx-bdh h2{margin:0;font-size:clamp(22px,2.6vw,30px);letter-spacing:-.025em;font-family:var(--hd-ff,inherit)}.hpx-bdh p{margin:6px 0 0;opacity:.7}
.hpx-bdl{list-style:none;margin:18px 0 0;padding:0;border-top:2px solid currentColor}.hpx-bdl li{border-bottom:1px solid rgba(20,22,31,.1)}
.hpx-bdl a{display:flex;align-items:center;gap:16px;justify-content:space-between;padding:16px 4px;color:inherit;text-decoration:none;min-height:48px;box-sizing:border-box}.hpx-bdl a:hover b{text-decoration:underline}
.hpx-bdl b{font-weight:600;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.hpx-bdl b em{font-style:normal;font-size:12px;font-weight:700;border:1px solid currentColor;border-radius:99px;padding:1px 8px;margin-right:8px;opacity:.75}
.hpx-bdl small{flex:0 0 auto;opacity:.6;font-size:13px;font-variant-numeric:tabular-nums}.hpx-bde{padding:22px 4px;opacity:.7}
.hpx-bdf{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap}.hpx-bdm{color:inherit;font-weight:700;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.hpx-bdw{display:inline-flex;align-items:center;min-height:44px;padding:0 20px;border-radius:var(--br,10px);background:var(--hps-a,#14161F);color:#fff;font-weight:700;text-decoration:none}
@media(max-width:640px){.hpx-lsh{padding:32px 0 26px}.hpx-lsh p{font-size:15px}.hpx-bdl a{flex-direction:column;align-items:flex-start;gap:4px}.hpx-bdl b{white-space:normal}}`;
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); try { if (!h || !h.includes('</style>')) return h; const a = (s && /^#[0-9a-f]{6}$/i.test(s.color || '')) ? s.color : '#14161F'; return h.replace('</style>', `${XCSS}.hpx-bdw{background:${a};color:${lumL(a) > .35 ? '#14161F' : '#fff'}}</style>`); } catch (e) { console.error('hps css', e); return h; } }; window.siteHTML = siteHTML; }

  /* 게시본: 학습 페이지 목록 위 · 아래 섹션(hp.lx) · 머리글 제목/소개(hp.lhead) */
  function lxPub(hp) { const lx = {}; const LH = hp.lhead = hp.lhead || {};
    pagesOf(site()).forEach(p => { if (!p.lp || !p.learn) return; const head = A(p.sections).find(x => x.type === 'lshead');
      if (head && head.data && /^[\w가-힣ㄱ-ㅎ /.·()-]{1,48}$/.test(p.learn)) { const c = LH[p.learn] = Object.assign({}, LH[p.learn] || {}); const tt = String(head.data.title || '').slice(0, 60); if (tt && tt !== head.data.def) c.t = tt; else delete c.t; const dd = String(head.data.sub || '').slice(0, 200); if (dd) c.d = dd; else delete c.d; if (!Object.keys(c).length) delete LH[p.learn]; }
      const html = String(((hp.pages || {})[p.key] || {}).html || ''); if (!html) return; const hi = html.indexOf('hpx-lsh'); const li = html.indexOf('hpx-lsl'); if (li < 0) return;
      const hEnd = hi >= 0 ? html.indexOf('</section>', hi) + 10 : 0; const lStart = html.lastIndexOf('<section', li); const le = html.indexOf('hpx-lse', li); const lEnd = le >= 0 ? html.indexOf('</section>', le) + 10 : -1; if (lEnd < 10) return;
      const pre = lStart > hEnd ? html.slice(hEnd, lStart).trim() : ''; const post = html.slice(lEnd).trim(); if (pre || post) lx[p.learn] = { pre: pre.slice(0, 400000), post: post.slice(0, 400000) }; });
    hp.lx = lx; }

  /* ── 큰 패널(학습 페이지 · 세부 설정 — 예전 화면을 편집기 안에서) ── */
  const BIG = { learn: ['학습 페이지 · 콘텐츠', '학습자 화면(진단 · 튜토리얼 · 코스웨어 · 공지 …)의 페이지 켜기 · 섹션 · 콘텐츠 구성입니다. 메뉴로 연결된 학습 페이지는 위 탭에서 바로 고칩니다.'], site: ['세부 설정', '섹션 자세히 · 첫 화면 구성 · 팝업 · 내보내기 · 새 창 미리보기입니다. 닫으면 편집 화면 그대로입니다.'] };
  function bigOpen(v) { HS.big = BIG[v] ? v : 'site'; if (HS.pan) panClose(); if (HS.gal) galClose(); hint(null); UI.sitePage = HPE.key || 'home'; render(); }
  function bigClose() { HS.big = ''; const g = $1('#hpsBig'); if (g) g.remove(); document.body.classList.remove('hps-big-on'); render(); setTimeout(() => { deco(true); fit(); }, 0); }
  ACT['hps-big'] = el => { const v = el && el.dataset ? ({ learn: 'learn', more: 'site', site: 'site' })[el.dataset.v] || 'site' : 'site'; if (HS.big === v) return bigClose(); bigOpen(v); };
  ACT['hps-bigx'] = () => bigClose();
  AFTER.unshift(() => { try { const src = $1('#main .hps-bigsrc'); let g = $1('#hpsBig'); const w = $1('#hpe');
      if (!HS.big || !src || !w || !HS.dock) { if (g && !HS.big) { g.remove(); document.body.classList.remove('hps-big-on'); } return; }
      const [ttl, desc] = BIG[HS.big]; if (!g || g.dataset.v !== HS.big) { if (g) g.remove(); g = document.createElement('section'); g.id = 'hpsBig'; g.className = 'hps-gal hps-big'; g.dataset.v = HS.big; g.setAttribute('role', 'region'); g.setAttribute('aria-label', ttl);
        g.innerHTML = `<div class="hps-galh"><div><b>${E(ttl)}</b><p>${E(desc)}</p></div><button type="button" class="btn" data-act="hps-bigx">${SV(P.x, 16, 2)} 닫기</button></div><div class="hps-galb hps-bigb"></div>`; w.appendChild(g); }
      const b = g.querySelector('.hps-bigb'); const y = b.scrollTop; b.replaceChildren(...src.childNodes); src.remove();
      b.querySelectorAll('.sgm-bar, .hpai-bar, .hps-back').forEach(x => x.remove()); const tb = b.querySelector('.sgm-in'); const tabs = tb && tb.previousElementSibling; if (tabs && tabs !== tb && !tabs.querySelector('input,select,textarea,iframe')) tabs.remove();
      b.scrollTop = y; document.body.classList.add('hps-big-on'); const bar = w.querySelector('.hpe-bar'); if (bar) w.style.setProperty('--hps-gt', (bar.offsetTop + bar.offsetHeight) + 'px');
      setTimeout(() => { const r = $1('#hpe .hps-rail'); if (r) r.outerHTML = railHTML(); }, 0); } catch (e) { console.error('hps big', e); } });
  addEventListener('keydown', e => { if (e.key !== 'Escape' || !HS.big || $1('#modal')) return; const tg = e.target; if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return; bigClose(); e.stopImmediatePropagation(); }, true);

  /* ── 메뉴 패널(오른쪽 넓은 패널 · hpai 메뉴 편성 그대로) + 끌어서 들여 놓으면 하위로 ── */
  function menuPanel(p) { p.dataset.k = 'menu'; HS.mSig = msig();
    p.innerHTML = `<div class="hps-ph"><b>메뉴 · 하위 메뉴</b><button type="button" class="btn sm ghost" data-act="hps-panx" aria-label="패널 닫기">${SV(P.x, 16, 2)}</button></div><div class="hps-pb"><p class="hps-pd hps-mtip"><b>하위 메뉴 만들기</b> — 메뉴를 <b>오른쪽으로 끌어 들여 놓거나</b> 「→ 하위로」를 누르세요. 메뉴 아래 「＋ 하위 메뉴」로 새로 만들 수도 있습니다. 위 탭에 마우스를 올려도 「＋ 하위」가 보입니다.</p><div id="hpmSlot"></div></div>`;
    try { const keepF = document.activeElement; window.hpMenus(); const box = $1('#modal #hpmBox'); if (box) p.querySelector('#hpmSlot').replaceWith(box); closeModal(); if (keepF && keepF.focus && document.contains(keepF)) try { keepF.focus({ preventScroll: true }); } catch (e) { } } catch (e) { console.error('hps menu', e); }
    const box = p.querySelector('#hpmBox'); if (!box) return; menuDeco(box); new MutationObserver(() => { menuDeco(box); menuSync(); }).observe(box, { childList: true }); }
  const msig = () => { try { return JSON.stringify(A(site().menus).map(m => [m.id, m.l, m.on, m.link, A(m.subs).map(b => [b.id, b.l, b.on, b.link])])); } catch (e) { return ''; } };
  function menuSync() { clearTimeout(HS.msT); HS.msT = setTimeout(() => { const sg = msig(); if (sg === HS.mSig) return; HS.mSig = sg; if (!pageOf(HPE.key)) HPE.key = 'home'; paint(); deco(true); }, 120); }
  document.addEventListener('change', e => { if (e.target && e.target.closest && e.target.closest('#hpsPan #hpmBox')) menuSync(); });
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#hpsPan #hpmBox')) setTimeout(menuSync, 30); });
  function menuDeco(box) { if (box.dataset.hpsD === '1' && box.querySelector('[data-hps-rt]')) return; box.dataset.hpsD = '1';
    const B = boardsL(); const itemOf = id => { for (const m of A(site().menus)) { if (m.id === id) return m; for (const b of A(m.subs)) if (b.id === id) return b; } return null; };
    box.querySelectorAll('select[data-hpm="route"]').forEach(sel => { if (sel.dataset.hpsRt) return; sel.dataset.hpsRt = 1; sel.setAttribute('data-hps-rt', 1); const it = itemOf(sel.dataset.id); const cur = String((it && it.link) || '');
      if (B.length) sel.insertAdjacentHTML('beforeend', `<optgroup label="게시판 하나">${B.map(b => `<option value="comm/${E(b.id)}" ${cur === 'learn:comm/' + b.id ? 'selected' : ''}>게시판 · ${E(b.name || b.id)}</option>`).join('')}</optgroup>`); });
    if (box.dataset.hpsDnd) return; box.dataset.hpsDnd = 1; let over = null;
    const topRow = t => { const li = t && t.closest && t.closest('.hpm-i:not(.sub)'); return li && box.contains(li) ? li : null; };
    box.addEventListener('dragover', e => { const li = topRow(e.target); box.querySelectorAll('.hps-ind').forEach(x => x !== li && x.classList.remove('hps-ind')); over = null; if (!li || li.querySelector('.hpm-n[disabled]')) return;
      const r = li.getBoundingClientRect(); const it = itemOf(li.dataset.id); if (it && it.kind !== 'home' && e.clientX - r.left > 72) { li.classList.add('hps-ind'); over = li.dataset.id; } else li.classList.remove('hps-ind'); }, true);
    box.addEventListener('drop', e => { const li = topRow(e.target); box.querySelectorAll('.hps-ind').forEach(x => x.classList.remove('hps-ind')); if (!over || !li || li.dataset.id !== over) return; const id = e.dataTransfer && e.dataTransfer.getData('text/plain'); if (!id || id === over) return;
      e.preventDefault(); e.stopPropagation(); if (subMove(id, over)) { const p = $1('#hpsPan'); if (p) menuPanel(p); menuSync(); } over = null; }, true); }
  /* 메뉴 하나를 다른 상위 메뉴의 하위로(hpai toSub와 같은 모양 · 2단계까지) */
  function subMove(id, parId) { const s = site(); const par = A(s.menus).find(m => m.id === parId); if (!par || par.kind === 'home') return false; let src = null, list = null, fromSub = false;
    for (const m of s.menus) { if (m.id === id) { src = m; list = s.menus; break; } const k = A(m.subs).findIndex(b => b.id === id); if (k >= 0) { src = m.subs[k]; list = m.subs; fromSub = true; break; } }
    if (!src || src === par) return false; if (!fromSub && src.kind === 'home') { say('홈 메뉴는 하위로 넣을 수 없습니다.', 'warn'); return false; } if (!fromSub && A(src.subs).length) { say('하위 메뉴가 있는 메뉴는 다른 메뉴 아래로 넣을 수 없습니다(2단계까지). 하위 메뉴를 먼저 꺼내 주세요.', 'warn'); return false; }
    push(); list.splice(list.indexOf(src), 1); const KL = { home: 'home', class: 'shop', community: 'comm', notice: 'notice', book: 'textbooks', board: 'comm' };
    const sb = fromSub ? src : { id: src.kind === 'custom' ? src.id : uid('sb'), l: src.l, on: src.on !== false, access: src.access || '공개', targets: src.targets || [], hide: !!src.hide, link: src.kind !== 'custom' && !src.link ? 'learn:' + (KL[src.kind] || 'home') : (src.link || ''), himg: src.himg || '', sections: src.kind === 'custom' ? A(src.sections) : [], seo: src.seo || { title: '', desc: '', kw: '' } };
    if (!fromSub && Array.isArray(src.lsecs)) sb.lsecs = src.lsecs; par.subs = A(par.subs); par.subs.push(sb); par.subOn = true; s.menus.forEach(m => { if (m.kind !== 'custom' && !A(m.subs).length) m.subOn = false; });
    s.hpsSubSeen = 1; persist(); say(`「${mName(sb.l)}」을(를) 「${mName(par.l)}」의 하위 메뉴로 넣었습니다. [되돌리기]로 돌릴 수 있습니다.`, 'ok'); return true; }

  /* ── 하위 메뉴 · 페이지 추가(탭 줄에서 바로) ── */
  const ROUTES = () => [['shop', `${cls()} 목록`], ['notice', '공지사항'], ['comm', '커뮤니티(게시판 전체)'], ['textbooks', '교재 · 교구'], ['my', '내 학습']];
  function popClose() { const p = $1('#hpsPop'); if (p) p.remove(); document.removeEventListener('mousedown', popOut, true); }
  function popOut(e) { const p = $1('#hpsPop'); if (p && !p.contains(e.target) && !(e.target.closest && e.target.closest('[data-act="hps-subadd"],[data-act="hps-padd"]'))) popClose(); }
  function popOpen(anchor, html) { popClose(); const p = document.createElement('div'); p.id = 'hpsPop'; p.className = 'hps-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', '페이지 추가'); p.innerHTML = html; document.body.appendChild(p);
    const r = anchor.getBoundingClientRect(); const W = Math.min(360, innerWidth - 16); p.style.width = W + 'px'; p.style.left = Math.max(8, Math.min(innerWidth - W - 8, r.left)) + 'px'; p.style.top = Math.min(innerHeight - p.offsetHeight - 8, r.bottom + 6) + 'px';
    setTimeout(() => { const i = p.querySelector('input[name=pn]'); if (i) { i.focus(); i.select(); } document.addEventListener('mousedown', popOut, true); }, 0); return p; }
  const kindHTML = () => { const B = boardsL(); return `<div class="hps-popk" role="radiogroup" aria-label="페이지 종류"><label><input type="radio" name="pk" value="page" checked><span><b>새 페이지</b><small>섹션을 넣어 직접 꾸밉니다</small></span></label><label><input type="radio" name="pk" value="board"><span><b>게시판</b><small>글 목록 · 글쓰기</small></span></label><label><input type="radio" name="pk" value="learn"><span><b>학습 페이지</b><small>${E(cls())} 목록 · 공지 · 내 학습</small></span></label></div>
    <label class="fl hps-popx" data-for="board">게시판<select name="pb">${B.map(b => `<option value="${E(b.id)}">${E(b.name || b.id)}</option>`).join('')}<option value="__new">＋ 이 이름으로 새 게시판 만들기</option></select></label>
    <label class="fl hps-popx" data-for="learn">연결할 학습 페이지<select name="pl">${ROUTES().map(([k, l]) => `<option value="${k}">${E(l)}</option>`).join('')}</select></label>`; };
  ACT['hps-subadd'] = el => { const par = A(site().menus).find(m => m.id === el.dataset.v); if (!par) return;
    popOpen(el, `<form data-hps-pop="sub" data-p="${E(par.id)}"><b class="hps-poph">「${E(mName(par.l))}」 아래에 하위 메뉴 만들기</b><label class="fl">메뉴 이름<input name="pn" maxlength="20" value="새 하위 메뉴" required></label>${kindHTML()}<div class="hps-popb"><button type="button" class="btn sm ghost" data-hps-popx>취소</button><button type="submit" class="btn sm pri">만들기</button></div></form>`); };
  ACT['hps-padd'] = el => { const tops = A(site().menus).filter(m => m.kind !== 'home');
    popOpen(el, `<form data-hps-pop="page"><b class="hps-poph">페이지(메뉴) 추가</b><label class="fl">메뉴 이름<input name="pn" maxlength="20" value="새 페이지" required></label>
      <div class="hps-popk" role="radiogroup" aria-label="위치"><label><input type="radio" name="pw" value="top" checked><span><b>위 메뉴 줄에</b><small>상위 메뉴로 추가</small></span></label><label><input type="radio" name="pw" value="sub" ${tops.length ? '' : 'disabled'}><span><b>하위 메뉴로 넣기</b><small>어느 메뉴 아래인지 고릅니다</small></span></label></div>
      <label class="fl hps-popx" data-for="sub">어느 메뉴 아래에<select name="pp">${tops.map(m => `<option value="${E(m.id)}" ${HPE.key === 'm-' + m.id ? 'selected' : ''}>${E(mName(m.l))}</option>`).join('')}</select></label>${kindHTML()}
      <div class="hps-popb"><button type="button" class="btn sm ghost" data-hps-popx>취소</button><button type="submit" class="btn sm pri">만들기</button></div></form>`); };
  ACT['hps-subseen'] = () => { site().hpsSubSeen = 1; persist(); deco(true); };
  const popSync = f => { const pk = (f.querySelector('input[name=pk]:checked') || {}).value; const pw = (f.querySelector('input[name=pw]:checked') || {}).value; f.querySelectorAll('.hps-popx').forEach(x => { x.hidden = !(x.dataset.for === pk || x.dataset.for === pw); }); };
  document.addEventListener('change', e => { const f = e.target && e.target.closest && e.target.closest('#hpsPop form'); if (f) popSync(f); });
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('[data-hps-popx]')) popClose(); });
  new MutationObserver(() => { const f = $1('#hpsPop form:not([data-s])'); if (f) { f.dataset.s = 1; popSync(f); } }).observe(document.body, { childList: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $1('#hpsPop')) { popClose(); e.stopImmediatePropagation(); } }, true);
  /* 새 게시판(comm2 cmMkBoard · 같은 이름 금지 규칙) */
  function bdNew(o) { const n = String(o.name || '').trim().slice(0, 30); if (!n) { say('게시판 이름을 입력하세요.', 'warn'); return null; }
    if (boardsL().some(x => x.name === n) || ['공지사항', '학습노트', '수강후기'].includes(n)) { say('같은 이름의 게시판이 있습니다. 다른 이름을 쓰거나 목록에서 고르세요.', 'warn'); return null; }
    if (typeof cmEnsure === 'function') try { cmEnsure(); } catch (e) { } const mk = typeof cmMkBoard === 'function' ? cmMkBoard : x => ({ id: uid('bd'), name: x.name, desc: '', type: 'free', write: 'all', cmt: true, file: true, perm: { type: 'all', ids: [] } });
    const b = mk({ name: n, type: o.type || 'free', desc: o.desc != null ? o.desc : undefined, write: o.write, cmt: o.cmt, file: o.file }); S.boards = A(S.boards); S.boards.push(b); if (typeof logAudit === 'function') logAudit('게시판 생성(홈페이지 편집) — ' + n);
    if (typeof cmSave === 'function') cmSave(); else save(); return b; }
  document.addEventListener('submit', e => { const f = e.target; if (!f || !f.matches || !f.matches('#hpsPop form')) return; e.preventDefault(); const v = n => { const x = f.elements[n]; return x ? String(x.value || '').trim() : ''; };
    const nm = v('pn').slice(0, 20); if (!nm) { say('메뉴 이름을 입력하세요.', 'warn'); return; } const pk = (f.querySelector('input[name=pk]:checked') || {}).value || 'page';
    let link = ''; if (pk === 'learn') link = 'learn:' + (v('pl') || 'shop'); if (pk === 'board') { let bid = v('pb'); if (bid === '__new' || !bid) { const b = bdNew({ name: nm }); if (!b) return; bid = b.id; } link = 'learn:comm/' + bid; }
    const s = site(); const sub = f.dataset.hpsPop === 'sub' || (f.querySelector('input[name=pw]:checked') || {}).value === 'sub'; const pid = f.dataset.p || v('pp'); const par = sub ? A(s.menus).find(m => m.id === pid) : null; if (sub && !par) { say('어느 메뉴 아래에 넣을지 고르세요.', 'warn'); return; }
    push(); const base = { l: nm, on: true, access: '공개', targets: [], hide: false, link, sections: link ? [] : [S2('text', { title: nm, body: `${nm} 안내를 적어 주세요. 글자를 두 번 누르면 바로 고칩니다.` })], seo: { title: '', desc: '', kw: '' } };
    let key; if (par) { const it = Object.assign({ id: uid('sb') }, base); par.subs = A(par.subs); par.subs.push(it); par.subOn = true; key = `s-${par.id}-${it.id}`; s.hpsSubSeen = 1; }
    else { const it = Object.assign({ id: uid('m'), kind: 'custom', subs: [], subOn: false }, base); s.menus.push(it); key = 'm-' + it.id; }
    persist(); popClose(); HS.lv = null; HPE.key = pageOf(key) ? key : 'home'; UI.sitePage = HPE.key; HS.lastUI = HPE.key; HS.sig = ''; lvPaint(); paint(); deco(true); if (HS.pan === 'menu') panPaint(true);
    say(`${par ? `「${mName(par.l)}」 아래에 하위 메뉴` : '메뉴'} 「${nm}」을(를) 만들었습니다. 지금 그 페이지를 고치고 있습니다.`, 'ok'); }, true);

  /* ── 게시판 섹션: [+ 섹션] 갤러리 카드 · 고르기/만들기 창 · 설정 · 메뉴로도 추가 ── */
  const BD_SVG = '<rect x="4" y="5" width="40" height="4" rx="1" fill="#5C74F6"/><rect x="4" y="12" width="28" height="2.5" rx="1" fill="#C9D2FF"/><rect x="36" y="12" width="8" height="2.5" rx="1" fill="#E3E7FF"/><rect x="4" y="18" width="24" height="2.5" rx="1" fill="#C9D2FF"/><rect x="36" y="18" width="8" height="2.5" rx="1" fill="#E3E7FF"/><rect x="4" y="24" width="30" height="2.5" rx="1" fill="#C9D2FF"/><rect x="36" y="24" width="8" height="2.5" rx="1" fill="#E3E7FF"/>';
  new MutationObserver(() => { const g = $1('#modal .hpe-addg'); if (!g || g.querySelector('[data-hps-bdadd]')) return; g.insertAdjacentHTML('beforeend', `<button type="button" class="btn hps-gc" data-hps-bdadd="1"><svg viewBox="0 0 48 32" width="96" height="64" aria-hidden="true">${BD_SVG}</svg><b>게시판</b><small>최근 글 · 글쓰기 · 새 게시판도 만들기</small></button>`); }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-hps-bdadd]'); if (!b) return; e.preventDefault(); const at = HS.addAt; closeModal(); bdPick(at, -1); });
  const menuOfBoard = bid => { for (const m of A(site().menus)) { if (m.link === 'learn:comm/' + bid) return m; for (const b of A(m.subs)) if (b.link === 'learn:comm/' + bid) return b; } return null; };
  function bdPick(at, idx) { const B = boardsL(); const x = idx >= 0 ? curSecs()[idx] : null; const d = (x && x.data) || {}; const cur = d.bid || ((B.find(b => b.id !== '커뮤니티') || B[0] || {}).id || ''); const BT = typeof CM_BT !== 'undefined' ? CM_BT : {};
    const opt = b => { const T = BT[b.type] || {}; const n = A(S.posts).filter(p => p.board === b.id).length; return `<label class="hps-bdo"><input type="radio" name="bid" value="${E(b.id)}" ${b.id === cur ? 'checked' : ''}><span><b>${E(b.name || b.id)}</b><small>${E(T.l || '게시판')} · 글 ${n}개 · ${b.write === 'admin' ? '운영자만 쓰기' : `${E(typeof t === 'function' ? t('learner') : '학습자')}도 쓰기`}${(b.perm || {}).type && b.perm.type !== 'all' ? ' · 회원 전용' : ''}</small></span></label>`; };
    const types = Object.keys(BT).filter(k => k !== 'talk').map(k => `<option value="${k}" ${k === 'free' ? 'selected' : ''}>${E(BT[k].l)} — ${E(BT[k].d || '')}</option>`).join('');
    const body = `<div class="hps-bdp"><fieldset class="hps-bdg"><legend>어떤 게시판을 보여 줄까요?</legend>${B.map(opt).join('')}<label class="hps-bdo new"><input type="radio" name="bid" value="__new" ${B.length ? '' : 'checked'}><span><b>＋ 새 게시판 만들기</b><small>이름 · 쓰기 권한 · 댓글 · 첨부를 정합니다</small></span></label></fieldset>
      <div class="hps-bdnew" ${B.length ? 'hidden' : ''}><label class="fl">게시판 이름<input name="bn" maxlength="30" placeholder="예: 학과 소식 · Q&A · 자료실"></label><label class="fl">종류<select name="bt">${types}</select></label>
        <div class="fl"><span>글쓰기</span><div class="seg2" role="radiogroup"><label class="ckl"><input type="radio" name="bw" value="all" checked> ${E(typeof t === 'function' ? t('learner') : '학습자')}도</label><label class="ckl"><input type="radio" name="bw" value="admin"> 운영자만</label></div></div>
        <div class="cmb-sw"><label class="ckl"><input type="checkbox" name="bc" checked> 댓글 받기</label><label class="ckl"><input type="checkbox" name="bf" checked> 첨부 파일 받기</label></div><p class="mini">공개 범위(특정 ${E(cls())} · 지정 회원)는 만든 뒤 소통 › 게시판 관리 또는 아래 [게시판 자세히 설정]에서 바꿉니다.</p></div>
      <label class="fl">섹션 제목<input name="tt" maxlength="40" value="${E(d.title != null ? d.title : '')}" placeholder="비워 두면 게시판 이름"></label>
      <label class="fl">최근 글 몇 개<select name="n">${[3, 5, 8, 10].map(k => `<option value="${k}" ${(+d.n || 5) === k ? 'selected' : ''}>${k}개</option>`).join('')}</select></label>
      <label class="ckl hps-bdmn"><input type="checkbox" name="mn" ${x ? '' : 'checked'}> 이 게시판을 메뉴(페이지)로도 추가 — 위 탭과 사이트 메뉴에 생깁니다</label>
      <p class="mini">학습자 사이트에서 글 목록 · 글 보기 · 글쓰기가 바로 됩니다(글쓰기 권한은 게시판 설정 그대로).</p></div>`;
    const w = modal(x ? '게시판 섹션 설정' : '게시판 섹션 넣기', body, [...(x && d.bid && typeof cmBoardModal === 'function' ? [{ id: 'adv', label: '게시판 자세히 설정', run: () => { const b = boardsL().find(y => y.id === d.bid); if (b) setTimeout(() => cmBoardModal(b), 0); } }] : []), { id: 'c', label: '취소' }, { id: 'ok', label: x ? '저장' : '넣기', kind: 'pri', run: w2 => bdSave(w2, at, idx) }]);
    const sync = () => { const v = (w.querySelector('input[name=bid]:checked') || {}).value; const nb = w.querySelector('.hps-bdnew'); if (nb) nb.hidden = v !== '__new'; const mn = w.querySelector('.hps-bdmn'); if (mn) { const has = v && v !== '__new' && menuOfBoard(v); mn.hidden = !!has; } if (v === '__new') { const i = w.querySelector('[name=bn]'); if (i && document.activeElement && document.activeElement.name === 'bid') i.focus(); } };
    w.addEventListener('change', sync); sync(); }
  function bdSave(w, at, idx) { let bid = (w.querySelector('input[name=bid]:checked') || {}).value; if (!bid) { say('게시판을 고르세요.', 'warn'); return false; }
    if (bid === '__new') { const b = bdNew({ name: fv(w, 'bn'), type: fv(w, 'bt') || 'free', write: (w.querySelector('input[name=bw]:checked') || {}).value === 'admin' ? 'admin' : 'all', cmt: !!fv(w, 'bc'), file: !!fv(w, 'bf') }); if (!b) return false; bid = b.id; }
    const b = boardsL().find(x => x.id === bid); const n = Math.max(1, Math.min(20, +fv(w, 'n') || 5)); const tt = String(fv(w, 'tt') || '').slice(0, 40) || (b ? b.name : '게시판'); const L = curSecs(); push();
    if (idx >= 0 && L[idx]) Object.assign(L[idx].data = L[idx].data || {}, { bid, n, title: tt });
    else { const pin = L[0] && L[0].type === 'lshead' ? 1 : 0; const li = L.findIndex(x => x.type === 'lslist'); let p = at >= 0 && at != null && !isNaN(at) ? at : (li >= 0 ? li : L.length); p = Math.max(pin, Math.min(p, L.length)); L.splice(p, 0, { id: uid('s'), type: 'board', data: { bid, n, title: tt } }); }
    let menu = ''; if (!(idx >= 0) && fv(w, 'mn') && b && !menuOfBoard(bid)) { const s = site(); s.menus.push({ id: uid('m'), kind: 'custom', l: String(b.name).slice(0, 20), on: true, access: '공개', targets: [], hide: false, link: 'learn:comm/' + bid, sections: [], subs: [], subOn: false, seo: { title: '', desc: '', kw: '' } }); menu = ` 메뉴에도 「${b.name}」을(를) 넣었습니다.`; }
    site().hpsAiAt = site().hpsAiAt || today(); persist(); paint(); deco(true); if (HS.pan === 'sec') panPaint(true); if (HS.pan === 'menu') panPaint(true);
    say(`${idx >= 0 ? '게시판 섹션을 바꿨습니다.' : `「${b ? b.name : ''}」 게시판 섹션을 넣었습니다.`}${menu} 학습자 사이트에서 글을 보고 쓸 수 있습니다(게시 후).`, 'ok'); }
  const bdOpen = i => bdPick(null, i);
  function bdFromTalk(v) { const B = boardsL(); const hit = B.find(b => b.name && v.includes(b.name)); if (!hit || /새\s*게시판|만들/.test(v)) { bdPick(selIdx() + 1 || null, -1); return false; }
    const L = curSecs(); push(); const li = L.findIndex(x => x.type === 'lslist'); const sel = selIdx(); const pin = L[0] && L[0].type === 'lshead' ? 1 : 0; const p = Math.max(pin, sel >= 0 ? sel + 1 : li >= 0 ? li : L.length);
    L.splice(p, 0, { id: uid('s'), type: 'board', data: { bid: hit.id, n: 5, title: hit.name } }); persist(); paint(); deco(true); if (HS.pan === 'sec') panPaint(true); say(`「${hit.name}」 게시판 섹션을 넣었습니다. 마음에 들지 않으면 [되돌리기]를 누르세요.`, 'ok'); return true; }
  const selIdx = () => { const d = frameDoc(); const x = d && d.querySelector('[data-hpe].hpe-sel'); return x ? +x.dataset.hpe.split('|')[1] : -1; };

  if (typeof COVER !== 'undefined') COVER.push(['[v36] 한 화면 홈페이지 편집기 — 메뉴 탭 · 페이지 프롬프트(코드 블록) · 두 번 눌러 고치기 · 섹션 갤러리 · 처음 흐름(템플릿 → AI → 기본 정보 → 게시) · 미리보기 링크 차단 수정', 'site', '']);
})();
