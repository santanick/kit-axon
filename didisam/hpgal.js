/* v34.5 hpgal — 디자이너 G2: 템플릿 갤러리 · 큰 미리보기 시트 · 디자인 설정(휴대폰 설정형 목록) (fix6/BRIEF3.md · 13:20 결정)
   ① 갤러리(tpl-d.js가 그린 화면을 감싸 개선 — tpl-d.js는 고치지 않는다)
      - 썸네일은 게시본과 같은 siteHTML을 그대로 축소한다. iframe은 sandbox="allow-same-origin"(스크립트 없음)이라 같은 출처의 샘플 사진 · 웹폰트가 그대로 보인다
        (기존 sandbox=""는 불투명 출처라 글꼴(woff2 · CORS 필요)이 빠지고 기본 글꼴로 보였다).
      - 정확한 비율: PC는 1280×800 첫 화면을 16:10 칸에, 휴대폰 화면(≤560)에서는 390×620 휴대폰 화면을 그대로 축소한다(Wix 템플릿 목록과 같은 방식).
      - 지연 렌더링: 화면에 들어온 카드만 줄을 세워 2장씩 그린다(HTML 생성도 한 장씩 쉬어 가며). 그리는 동안은 템플릿 색 뼈대를 보여 준다.
      - 칩은 한 줄(v34.4 원칙): tpl-d의 칩을 그대로 쓰고 모양만 다듬는다.
   ② 큰 미리보기 시트: PC · 휴대폰 전환 · 이전 · 다음(← → 키) · 몇 번째인지 · 전체 길이 스크롤 미리보기 · [이 템플릿으로 시작]
   ③ 디자인 설정(바로 고치기 화면의 [디자인] 버튼): 레이아웃 계열(HPL) · 테마(HPT) · 팔레트(HPC, 있을 때만) · 머리글 · 바닥글 · 휴대폰 메뉴(HPS.kinds) ·
      제목 · 본문 글꼴(HPI.fonts) · 샘플 사진 끄기(site.stockOff) · 바닥글 한 줄 소개(site.hps.tagline)
      - 선택지마다 지금 사이트를 그 값으로 그린 썸네일을 보여 주고, 고르면 미리보기에 바로 반영한다. 바꾸기 전에 hpPush()로 되돌리기(HPE.undo)에 쌓는다.
   인터페이스: window.TPG = { stat, mini(el, html, W, H), dz: { open, close, paint } } */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;
  const A = v => Array.isArray(v) ? v : [];
  const E = v => (typeof esc === 'function' ? esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const $1 = s => document.querySelector(s);
  const SV = (d, s = 18, w = 2) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const P = { l: 'M15 5l-7 7 7 7', r: 'M9 5l7 7-7 7', x: 'M6 6l12 12M18 6L6 18', ok: 'M5 12.5l4.5 4.5L19 7.5', pc: 'M3 5h18v11H3zM8 20h8M12 16v4', m: 'M7 3h10v18H7zM11 18h2', dz: 'M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0021 9.7C21 6 17 3 12 3zM7.5 12a1 1 0 100-2 1 1 0 000 2zM10 8a1 1 0 100-2 1 1 0 000 2zM15 8a1 1 0 100-2 1 1 0 000 2z' };
  const TPG = window.TPG = { stat: {} };
  const narrow = () => matchMedia('(max-width:560px)').matches;

  /* ═════════ 공통: 축소 미리보기 줄 세우기(동시에 2장) ═════════ */
  const QU = []; let RUN = 0; const MAXR = 3;
  function pump() {
    while (RUN < MAXR && QU.length) { const j = QU.shift(); if (!j.el.isConnected || j.el.dataset.done) continue; RUN++;
      /* 문서가 그려지면(interactive) 바로 보여 주고 자리를 비운다 — 사진은 이어서 들어온다. load에서 한 번 더 맞춤(스크롤 위치) */
      const show = () => { if (j.shown) return; j.shown = 1; j.ms = performance.now() - j.t0; RUN = Math.max(0, RUN - 1); j.el.dataset.done = 1; j.el.classList.add('tpg-on'); if (j.after) try { j.after(j.f); } catch (e) { } TPG.stat.last = performance.now(); setTimeout(() => { pump(); idle(); }, 0); };
      const fin = () => { if (j.fin) return; j.fin = 1; clearInterval(j.iv); show(); if (j.after && j.f) try { j.after(j.f); } catch (e) { } };
      j.t0 = performance.now(); setTimeout(() => { let h = ''; try { h = j.html(); if (window.HPP && typeof HPP.thumb === 'function') h = HPP.thumb(h); } catch (e) { console.error('hpgal mini', e); } /* X2: 썸네일은 800px 사진 한 벌 · lazy */
        if (!j.el.isConnected) { fin(); return; }
        const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-same-origin'); f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true'); f.title = '';
        f.className = 'tpg-if'; f.style.width = j.W + 'px'; f.style.height = j.H + 'px'; j.f = f;
        f.srcdoc = h; f.addEventListener('load', () => { if (f.contentDocument && f.contentDocument.URL === 'about:blank') return; fin(); }); setTimeout(fin, 5000);
        j.iv = setInterval(() => { try { const d = f.contentDocument; if (d && d.URL !== 'about:blank' && d.readyState !== 'loading' && d.body) { clearInterval(j.iv); show(); } } catch (e) { clearInterval(j.iv); } }, 30);
        j.el.querySelectorAll('iframe.tpg-if').forEach(x => x.remove()); j.el.appendChild(f); fitMini(j.el); }, 0); }
  }
  /* 보이는 것을 다 그린 뒤에는 쉬는 시간에 아래 카드도 한 장씩 미리 그린다(스크롤하면 이미 준비됨) */
  let IDLE = 0; const ric = window.requestIdleCallback || (f => setTimeout(f, 120));
  function idle() { if (IDLE || RUN || QU.length) return; const el = [...document.querySelectorAll('.tpg-th:not([data-q])')].find(e => !e.closest('[hidden]') && IOQ.has(e)); if (!el) return;
    IDLE = 1; ric(() => { IDLE = 0; if (RUN || QU.length || el.dataset.q || !el.isConnected) { idle(); return; } const j = IOQ.get(el); IOQ.delete(el); if (IO) IO.unobserve(el); j && j(); }, { timeout: 1500 }); }
  function fitMini(el) { const f = el.querySelector('iframe.tpg-if'); if (!f) return; const W = parseFloat(f.style.width) || 1280; const w = el.clientWidth; if (w) f.style.transform = `scale(${w / W})`; }
  /* el: 칸, html: () => 문자열, W · H: 원래 크기(칸 비율은 CSS가 W:H로 맞춘다), after(iframe): 그린 뒤(스크롤 등) */
  TPG.mini = (el, html, W, H, after) => { if (!el || el.dataset.done || el.dataset.q) return; el.dataset.q = 1; QU.push({ el, html, W, H, after }); pump(); };
  let IO = null; const IOQ = new Map();
  function watch(el, job) { IOQ.set(el, job); if (!('IntersectionObserver' in window)) { job(); return; }
    if (!IO) IO = new IntersectionObserver(es => es.forEach(x => { if (!x.isIntersecting) return; IO.unobserve(x.target); const j = IOQ.get(x.target); IOQ.delete(x.target); j && j(); }), { rootMargin: '240px 0px' });
    IO.observe(el); }
  addEventListener('resize', () => { document.querySelectorAll('[data-done] > iframe.tpg-if, [data-q] > iframe.tpg-if').forEach(f => fitMini(f.parentElement)); fitPv(); galMode(); });

  /* ═════════ ① 갤러리 ═════════ */
  const thName = id => { const L = window.HPT && A(HPT.list); const x = L && L.find(t => t.id === id); return x ? x.name : ''; };
  const famName = id => { try { const f = window.HPL && HPL.fam && HPL.fam[id]; return f ? (f.name || id) : ''; } catch (e) { return ''; } };
  const HERO_L = { center: '가운데 배치', split: '좌우 분할', bg: '어두운 배경', band: '띠 배너' };
  const HTML = new Map();
  const siteOfTp = tp => { const s = window.TPD && TPD.fromTpl ? TPD.fromTpl(tp) : siteFromTpl(tp); return s; };
  const htmlOfTp = tp => { let h = HTML.get(tp.id); if (h == null) { try { h = siteHTML(siteOfTp(tp), false, 'ko'); } catch (e) { console.error('hpgal thumb', e); h = ''; } HTML.set(tp.id, h); } return h; };
  { const base = ACT['tpl-gallery']; if (base) ACT['tpl-gallery'] = (...a) => { HTML.clear(); TPG.stat = { open: performance.now() }; return base(...a); }; }
  { const base = ACT['tpd-use']; if (base) ACT['tpd-use'] = (...a) => { HTML.clear(); return base(...a); }; }

  /* tpl-d 화면 문자열: 썸네일 iframe(sandbox="")을 빼고 이 파일이 지연으로 그린다(data-ok가 있으면 tpl-d의 지연 로더는 건너뛴다) */
  const IFR0 = '<iframe tabindex="-1" aria-hidden="true" title="" sandbox=""></iframe>';
  function galFix(h) {
    return h.split('<div class="tpd-th"').join('<div class="tpd-th tpg-th" data-ok="g"').split(IFR0).join('<span class="tpg-sk" aria-hidden="true"><i></i><b></b><em></em><u></u></span><span class="tpg-hv" aria-hidden="true">미리 보기</span>')
      .replace('<div class="tpd-g">', `<div class="tpd-g tpg-g${narrow() ? ' tpg-gm' : ''}">`); }
  { const base = VIEWS.site; VIEWS.site = (...a) => { let h = base(...a); try { if (typeof h === 'string' && h.indexOf('class="tpd-g"') >= 0) { h = galFix(h); TPG.stat.view = performance.now(); } } catch (e) { console.error('hpgal view', e); } return h; }; }
  let MODE = null;
  function galMode() { const g = $1('.tpg-g'); if (!g) return; const m = narrow(); if (MODE === m) return; MODE = m; g.classList.toggle('tpg-gm', m);
    g.querySelectorAll('.tpg-th').forEach(el => { delete el.dataset.done; delete el.dataset.q; el.classList.remove('tpg-on'); el.querySelectorAll('iframe.tpg-if').forEach(f => f.remove()); }); galLazy(); }
  function galLazy() {
    const g = $1('.tpg-g'); if (!g) return; MODE = narrow(); g.classList.toggle('tpg-gm', MODE);
    g.querySelectorAll('.tpd-c').forEach(c => { const th = c.querySelector('.tpg-th'); if (!th || th.dataset.w8) return; th.dataset.w8 = 1; const tp = TPL.find(t => t.id === th.dataset.tp); if (!tp) return;
      /* 카드 아래 한 줄: 분위기(테마) · 레이아웃 계열(없으면 첫 화면 배치) */
      const tg = c.querySelector('.tpd-tg'); if (tg) { const mood = thName(tp.theme) || '기본 디자인'; const lay = famName(tp.layout) || HERO_L[tp.hero] || ''; tg.innerHTML = `<i style="background:${E(tp.color || '#5C74F6')}"></i>${E(mood)}${lay ? ` · ${E(lay)}` : ''}`; }
      watch(th, () => { const m = narrow(); TPG.mini(th, () => htmlOfTp(tp), m ? 390 : 1280, m ? 620 : 800); }); });
  }
  if (typeof AFTER !== 'undefined') AFTER.push(() => { if ($1('.tpg-g')) { galLazy(); document.querySelector('.sl-page')?.classList.add('tpg-page'); } });
  /* 측정: 지금 보이는 썸네일이 다 그려졌는지(테스트 · 성능 보고용) */
  TPG.visibleDone = () => [...document.querySelectorAll('.tpg-th')].filter(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && !e.closest('[hidden]'); }).every(e => e.dataset.done);

  /* ═════════ ② 큰 미리보기 시트 ═════════ */
  UI.tpgDev = UI.tpgDev || '';
  const curList = () => [...document.querySelectorAll('.tpd-c:not([hidden])')].map(c => c.dataset.v);
  function fitPv() { const b = $1('#slSheet .tpg-pv'); if (!b) return; const f = b.querySelector('iframe'); if (!f) return; const m = b.classList.contains('m'); const W = m ? 390 : 1280;
    const cs = getComputedStyle(b); const w = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (!w) return; const k = Math.min(1, w / W); let H = m ? 844 : 800;
    try { const d = f.contentDocument; if (d && d.documentElement) H = Math.max(H, Math.min(14000, d.documentElement.scrollHeight)); } catch (e) { }
    f.style.width = W + 'px'; f.style.height = H + 'px'; f.style.transform = `scale(${k})`; const i = b.querySelector('.tpg-pvi'); if (i) { i.style.height = Math.round(H * k) + 'px'; i.style.width = Math.round(W * k) + 'px'; } }
  function sheetUp(id, inst) {
    const w = $1('#slSheet'); if (!w || !w.classList.contains('tpd-sw')) return; const tp = TPL.find(t => t.id === id); if (!tp) return;
    w.classList.add('tpg-sw'); if (inst) { w.classList.add('on', 'tpg-inst'); }
    const old = w.querySelector('.tpd-pv'); const dev = UI.tpgDev || (innerWidth < 700 ? 'm' : 'pc');
    if (old) { old.className = `tpg-pv${dev === 'm' ? ' m' : ''}`; old.setAttribute('tabindex', '0'); old.setAttribute('aria-label', `${tp.name} 전체 화면 미리 보기 — 스크롤해서 아래까지 볼 수 있습니다`);
      old.innerHTML = `<div class="tpg-pvi"><iframe title="${E(tp.name)} 미리 보기" sandbox="allow-same-origin" tabindex="-1"></iframe></div>`;
      const f = old.querySelector('iframe'); f.addEventListener('load', () => { old.classList.add('tpg-on'); fitPv(); setTimeout(fitPv, 400); }); f.srcdoc = htmlOfTp(tp); }
    const L = curList(); const i = L.indexOf(id); const dv = w.querySelector('.tpd-dev');
    if (dv) { dv.querySelectorAll('button').forEach(x => { const on = x.dataset.v === dev; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); x.innerHTML = `${SV(x.dataset.v === 'm' ? P.m : P.pc, 15, 1.8)}<span>${x.dataset.v === 'm' ? '휴대폰' : 'PC'}</span>`; });
      if (L.length > 1 && i >= 0) dv.insertAdjacentHTML('afterend', `<div class="tpg-nav" role="group" aria-label="템플릿 넘기기"><button type="button" class="tpg-nb" data-act="tpg-nav" data-v="-1" aria-label="이전 템플릿">${SV(P.l)}</button><span class="tpg-ix" aria-live="polite"><b>${i + 1}</b> / ${L.length}</span><button type="button" class="tpg-nb" data-act="tpg-nav" data-v="1" aria-label="다음 템플릿">${SV(P.r)}</button></div>`);
      const row = document.createElement('div'); row.className = 'tpg-tool'; dv.parentElement.insertBefore(row, dv); row.appendChild(dv); const nv = w.querySelector('.tpg-nav'); if (nv) row.appendChild(nv); }
    /* 정보 칸은 오른쪽(넓은 화면) — 미리보기가 주인공 */
    const sh = w.querySelector('.tpd-sh'); if (sh) { const pv = sh.querySelector('.tpg-pv'); const info = document.createElement('div'); info.className = 'tpg-info';
      [...sh.children].filter(x => x !== pv && !x.classList.contains('tpg-tool')).forEach(x => info.appendChild(x)); sh.appendChild(info); }
    const go = w.querySelector('[data-act=tpd-use]'); if (go && S.site && S.site.tpl === id) go.textContent = '이 템플릿으로 다시 시작';
    requestAnimationFrame(fitPv); }
  { const base = ACT['tpd-open']; if (base) ACT['tpd-open'] = (el, ...r) => { const inst = !!(el && el.dataset && el.dataset.tpgInst); const res = base(el, ...r); try { sheetUp(el.dataset.v, inst); } catch (e) { console.error('hpgal sheet', e); } return res; }; }
  { const base = ACT['tpd-dev']; ACT['tpd-dev'] = (el, ...r) => { const b = $1('#slSheet .tpg-pv'); if (!b) return base && base(el, ...r); UI.tpgDev = el.dataset.v; b.classList.toggle('m', el.dataset.v === 'm');
    el.parentElement.querySelectorAll('button').forEach(x => { const on = x === el; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); }); b.scrollTop = 0; fitPv(); }; }
  ACT['tpg-nav'] = el => { const w = $1('#slSheet'); const L = curList(); if (!w || !L.length) return; const cur = (w.querySelector('[data-act=tpd-use]') || {}).dataset; const i = L.indexOf(cur && cur.v); const n = L[(i + (+el.dataset.v || 1) + L.length) % L.length];
    ACT['tpd-open']({ dataset: { v: n, tpgInst: '1' } }); const nb = $1(`#slSheet [data-act=tpg-nav][data-v="${el.dataset.v}"]`); nb && nb.focus({ preventScroll: true });
    const c = document.querySelector(`.tpd-c[data-v="${CSS.escape(n)}"]`); c && c.scrollIntoView({ block: 'nearest' }); };
  document.addEventListener('keydown', e => { const w = $1('#slSheet.tpg-sw'); if (!w) return; if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); ACT['tpg-nav']({ dataset: { v: e.key === 'ArrowRight' ? '1' : '-1' } }); }
    else if (e.key === 'Escape' && typeof slClose === 'function') slClose(); });

  /* ═════════ ③ 디자인 설정 — 휴대폰 설정형 목록 ═════════ */
  const DZ = TPG.dz = { on: false, pg: '' };
  const site0 = () => (typeof S !== 'undefined' && S && S.site) || null;
  const clone = s => JSON.parse(JSON.stringify(s));
  const famList = () => { try { return window.HPL && typeof HPL.list === 'function' ? HPL.list() : Object.keys((window.HPL && HPL.fam) || {}).map(id => ({ id, name: HPL.fam[id].name || id, desc: HPL.fam[id].desc || '' })); } catch (e) { return []; } };
  const thList = () => A(window.HPT && HPT.list);
  const palList = () => { const C = window.HPC; if (!C) return []; let L = []; try { L = typeof C.forType === 'function' ? A(C.forType(S.org && S.org.type)) : []; if (L.length < 8) L = A(C.list); } catch (e) { L = A(C.list); }
    return L.filter(p => p && p.id && /^#[0-9a-f]{6}$/i.test(p.acc || '')).map(p => ({ id: p.id, name: p.name || p.id, acc: p.acc, cs: [p.acc, p.acc2, p.dark, p.alt, p.bg].filter(x => /^#[0-9a-f]{6}$/i.test(x || '')) })); };
  /* 섹션 모양(S2 · S3): 홈의 첫 화면(banner.data.hk) · 강좌 카드(classes.data.card) · 신청 띠(text cta.data.ck) */
  const HERO_N = { scrim: '사진 위 글자', box: '상자 + 바로가기', split: '좌우 분할', grid: '사진 격자' };
  const CTA_N = { photo: '사진 배경 띠', panel: '색 패널', contact: '연락 채널' };
  const pagesOf = x => (typeof s2pages === 'function' ? s2pages(x) : [{ key: 'home', label: '홈', sections: x.sections }]).filter(p => Array.isArray(p.sections));
  const homeSecs = x => A(x && x.sections);
  const SECK = {
    hero: { n: '첫 화면', test: x => x.type === 'banner', key: 'hk', list: () => A(window.HPS && HPS.kinds && HPS.kinds.hero).map(id => ({ id, name: HERO_N[id] || id })), auto: (x, d) => { try { const c = Object.assign({}, d); delete c.hk; return HPS.heroKind(x, c); } catch (e) { return ''; } }, one: true, sel: '.hps-hero, .hp-hero' },
    card: { n: '강좌 카드', test: x => x.type === 'classes', key: 'card', list: () => A(window.HPS && HPS.cardKinds).map(k => ({ id: k.id, name: k.name })), auto: () => '', sel: '.hp-cls' },
    cta: { n: '신청 띠', test: x => x.type === 'text' && x.data && x.data.variant === 'cta', key: 'ck', list: () => A(window.HPS && HPS.kinds && HPS.kinds.cta).map(id => ({ id, name: CTA_N[id] || id })), auto: (x, d) => { try { const c = Object.assign({}, d); delete c.ck; return HPS.ctaKind(x, c); } catch (e) { return ''; } }, sel: '.hps-cta, .hp-cta' } };
  /* 대상: 섹션 하나(바로 고치기 섹션 툴바에서 고른 것 — DZ.tgt = { page, i }) 또는 홈의 해당 섹션 전부(첫 화면은 첫 번째만) */
  function secTargets(x, k) { const D = SECK[k]; if (DZ.tgt && DZ.tgt.k === k) { const pg = pagesOf(x).find(p => p.key === DZ.tgt.page); const sec = pg && pg.sections[DZ.tgt.i]; if (sec && D.test(sec)) return [sec]; }
    const L = homeSecs(x).filter(D.test); return D.one ? L.slice(0, 1) : L; }
  const fontList = () => A(window.HPI && HPI.fonts).length ? HPI.fonts : [['sans', '고딕', 'Pretendard,sans-serif'], ['serif', '명조', "'Noto Serif KR',serif"]];
  const kinds = k => A(window.HPS && HPS.kinds && HPS.kinds[k]);
  const chromeOf = s => { try { return window.HPS && typeof HPS.chrome === 'function' ? HPS.chrome(s) || {} : {}; } catch (e) { return {}; } };
  const hps = s => (s.hps && typeof s.hps === 'object') ? s.hps : (s.hps = {});
  /* 그룹: [id, 이름, 지금 값, 선택지(id · name · desc), 적용(s, id), 썸네일 방식] */
  function groups() {
    const s = site0(); if (!s) return []; const ch = chromeOf(s); const G = [];
    const fl = famList(); if (fl.length) G.push({ k: 'layout', n: '레이아웃', grp: '구조', cur: s.layout || '', opts: [{ id: '', name: '기본', desc: '테마의 기본 배치' }, ...fl], set: (x, v) => { if (window.HPL && typeof HPL.apply === 'function') HPL.apply(x, v); else if (v) x.layout = v; else delete x.layout; }, th: 'pc' });
    const kn = kinds('nav'); if (kn.length) G.push({ k: 'head', n: '머리글', grp: '구조', cur: (s.hps && s.hps.head) || '', auto: ch.head, opts: [{ id: '', name: '자동', desc: '계열 · 테마에 맞춤' }, ...kn.map(([id, name]) => ({ id, name }))], set: (x, v) => { if (v) hps(x).head = v; else if (x.hps) delete x.hps.head; }, th: 'head' });
    const kf = kinds('footer'); if (kf.length) G.push({ k: 'foot', n: '바닥글', grp: '구조', cur: (s.hps && s.hps.foot) || '', auto: ch.foot, opts: [{ id: '', name: '자동', desc: '계열 · 테마에 맞춤' }, ...kf.map(([id, name]) => ({ id, name }))], set: (x, v) => { if (v) hps(x).foot = v; else if (x.hps) delete x.hps.foot; }, th: 'foot' });
    const km = kinds('mm'); if (km.length) G.push({ k: 'mm', n: '휴대폰 메뉴', grp: '구조', cur: (s.hps && s.hps.mm) || '', auto: ch.mm, opts: [{ id: '', name: '자동', desc: '계열 · 테마에 맞춤' }, ...km.map(([id, name]) => ({ id, name }))], set: (x, v) => { if (v) hps(x).mm = v; else if (x.hps) delete x.hps.mm; }, th: 'mm' });
    const tl = thList(); if (tl.length) G.push({ k: 'theme', n: '테마', grp: '색 · 글꼴', cur: s.theme || '', opts: tl.map(t => ({ id: t.id, name: t.name, desc: t.desc || '', sw: t.swatch })), set: (x, v) => { if (window.HPT && v) HPT.apply(x, v, {}); }, th: 'pc' });
    const pl = palList(); if (pl.length) G.push({ k: 'pal', n: '팔레트', grp: '색 · 글꼴', cur: (window.HPC && HPC.of && HPC.of(s) ? s.hpPal : '') || '', opts: [{ id: '', name: '테마 기본 색', sw: [] }, ...pl.map(p => ({ id: p.id, name: p.name, sw: p.cs }))],
      set: (x, v) => { if (v) HPC.apply(x, v); else { HPC.apply(x, null); delete x.hpColorLock; if (window.HPT && x.theme) HPT.apply(x, x.theme, { force: true }); } }, th: 'sw' });
    Object.keys(SECK).forEach(k => { const D = SECK[k]; const T = secTargets(s, k); const L = D.list(); if (!T.length || !L.length) return; const d = T[0].data || {};
      G.push({ k: 'sec-' + k, n: D.n + (DZ.tgt && DZ.tgt.k === k ? ' (이 섹션)' : ''), grp: '섹션 모양', cur: d[D.key] || '', auto: D.auto(s, d), opts: [{ id: '', name: '자동', desc: '테마 · 기관 유형에 맞춤' }, ...L], th: 'sec', sel: D.sel,
        set: (x, v) => secTargets(x, k).forEach(sec => { sec.data = sec.data || {}; if (v) sec.data[D.key] = v; else delete sec.data[D.key]; }) }); });
    const ff = fontList(); const f = (s.font && typeof s.font === 'object') ? s.font : {};
    G.push({ k: 'fh', n: '제목 글꼴', grp: '색 · 글꼴', cur: f.h || '', opts: [{ id: '', name: '테마 기본' }, ...ff.map(([id, name, fam]) => ({ id, name, fam }))], set: (x, v) => { x.font = Object.assign({}, x.font); if (v) x.font.h = v; else delete x.font.h; if (!Object.keys(x.font).length) delete x.font; }, th: 'font' });
    G.push({ k: 'fb', n: '본문 글꼴', grp: '색 · 글꼴', cur: f.b || '', opts: [{ id: '', name: '테마 기본' }, ...ff.filter(x => !['hand', 'display'].includes(x[0])).map(([id, name, fam]) => ({ id, name, fam }))], set: (x, v) => { x.font = Object.assign({}, x.font); if (v) x.font.b = v; else delete x.font.b; if (!Object.keys(x.font).length) delete x.font; }, th: 'font' });
    return G; }
  const nameOf = (g) => { const o = g.opts.find(x => x.id === g.cur); if (!o) return g.cur || ''; if (!g.cur && g.auto) { const a = g.opts.find(x => x.id === g.auto); return `자동 · ${a ? a.name : g.auto}`; } return o.name; };
  const stockN = s => { try { return window.HPSTOCK && typeof HPSTOCK.count === 'function' ? HPSTOCK.count(s) : null; } catch (e) { return null; } };

  function dzHTML() {
    const s = site0(); if (!s) return '<p class="tpg-dzm">홈페이지가 아직 없습니다.</p>'; const G = groups();
    if (DZ.pg) { const g = G.find(x => x.k === DZ.pg); if (g) return pageHTML(g); DZ.pg = ''; }
    const row = g => `<button type="button" class="tpg-row" data-act="tpg-dzp" data-v="${g.k}"><span class="tpg-rl">${E(g.n)}</span><span class="tpg-rv">${E(nameOf(g))}</span>${SV(P.r, 16)}</button>`;
    const grp = (t, rows) => rows ? `<section class="tpg-grp"><h3>${E(t)}</h3><div class="tpg-card">${rows}</div></section>` : '';
    const off = !!s.stockOff; const tag = (s.hps && s.hps.tagline) || '';
    return grp('구조', G.filter(g => g.grp === '구조').map(row).join('')) + grp('섹션 모양', G.filter(g => g.grp === '섹션 모양').map(row).join('')) + grp('색 · 글꼴', G.filter(g => g.grp === '색 · 글꼴').map(row).join('')) +
      grp('사진', `<label class="tpg-row tpg-sw1"><span class="tpg-rl">샘플 사진 쓰기<small>우리 사진이 없는 자리를 분위기 사진으로 채웁니다</small></span><input type="checkbox" role="switch" class="tpg-tg" data-tpg="stock" ${off ? '' : 'checked'} aria-label="샘플 사진 쓰기"></label>`) +
      grp('바닥글', `<label class="tpg-row tpg-in"><span class="tpg-rl">한 줄 소개<small>바닥글 기관명 아래에 보입니다. 비우면 표시하지 않습니다.</small></span><input type="text" maxlength="80" data-tpg="tagline" value="${E(tag)}" placeholder="예: 우리 기관을 한 줄로 소개해 주세요"></label>`) +
      `<p class="tpg-dzm">고르면 미리보기에 바로 반영됩니다. 되돌리기(Ctrl+Z)로 하나씩 되돌릴 수 있습니다.</p>`; }
  function pageHTML(g) {
    const cls = { sec: 'tpg-o2', pc: 'tpg-o2', head: 'tpg-o1 tpg-wide', foot: 'tpg-o1 tpg-wide', sw: 'tpg-o2 tpg-sw', font: 'tpg-o1 tpg-fnt', mm: 'tpg-o2 tpg-mmg' }[g.th] || 'tpg-o2';
    const one = o => { const on = o.id === g.cur; let vis = '';
      if (g.th === 'pc' || g.th === 'sec' || g.th === 'head' || g.th === 'foot') vis = `<span class="tpg-mt tpg-mt-${g.th}" data-g="${g.k}" data-o="${E(o.id)}"><span class="tpg-sk" aria-hidden="true"><i></i><b></b><em></em><u></u></span></span>`;
      else if (g.th === 'sw') vis = A(o.sw).length ? `<span class="tpg-sws">${A(o.sw).slice(0, 5).map(c => `<i style="background:${E(c)}"></i>`).join('')}</span>` : `<span class="tpg-sws tpg-sw0">테마 색</span>`;
      else if (g.th === 'font') { const fam = o.fam || ''; vis = `<span class="tpg-fs" style="${fam ? `font-family:${E(fam)}` : ''}">${g.k === 'fh' ? '배움이 시작되는 곳' : '수업 일정과 신청 방법을 확인하세요.'}</span>`; }
      else if (g.th === 'mm') vis = `<span class="tpg-mmv tpg-mmv-${E(o.id || 'auto')}" aria-hidden="true"><i></i><i></i><i></i></span>`;
      const autoTxt = !o.id && g.auto ? (g.opts.find(x => x.id === g.auto) || {}).name : '';
      return `<button type="button" class="tpg-opt${on ? ' on' : ''}" data-act="tpg-dzs" data-g="${g.k}" data-v="${E(o.id)}" aria-pressed="${on}">${vis}<span class="tpg-on2"><b>${E(o.name)}</b>${on ? SV(P.ok, 16, 2.4) : ''}</span>${o.desc || autoTxt ? `<small>${E(autoTxt ? `지금: ${autoTxt}` : o.desc)}</small>` : ''}</button>`; };
    return `<div class="tpg-opts ${cls}">${g.opts.map(one).join('')}</div>`; }
  function dzPaint() {
    const w = $1('#tpgDz'); if (!w) return; const G = groups(); const g = DZ.pg && G.find(x => x.k === DZ.pg);
    w.querySelector('.tpg-dzh b').textContent = g ? g.n : '디자인'; w.querySelector('.tpg-back').hidden = !g;
    const b = w.querySelector('.tpg-dzb'); const y = b.scrollTop; b.innerHTML = dzHTML(); b.scrollTop = g ? y : 0;
    /* 선택지 썸네일: 지금 사이트에 그 값을 넣어 그린다(보이는 것만 · 2장씩) */
    b.querySelectorAll('.tpg-mt').forEach(el => { const gg = G.find(x => x.k === el.dataset.g); if (!gg) return; const v = el.dataset.o; const kind = gg.th;
      const html = () => { const x = clone(site0()); gg.set(x, v); return siteHTML(x, false, 'ko'); };
      const after = kind === 'foot' ? f => { try { f.contentWindow.scrollTo(0, 1e6); } catch (e) { } } : kind === 'sec' && gg.sel ? f => { try { const d = f.contentDocument; const L = [...d.querySelectorAll(gg.sel)]; const t = L[0]; if (t) f.contentWindow.scrollTo(0, Math.max(0, t.getBoundingClientRect().top + f.contentWindow.scrollY - 8)); } catch (e) { } } : null;
      watch(el, () => TPG.mini(el, html, 1280, kind === 'pc' || kind === 'sec' ? 800 : kind === 'head' ? 260 : 460, after)); });
  }
  function dzOpen() {
    if (!site0()) return; let w = $1('#tpgDz');
    if (!w) { w = document.createElement('aside'); w.id = 'tpgDz'; w.className = 'tpg-dz'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', '디자인 설정');
      w.innerHTML = `<div class="tpg-dzh"><button type="button" class="tpg-back" data-act="tpg-dzp" data-v="" aria-label="디자인 목록으로" hidden>${SV(P.l)}</button><b>디자인</b><button type="button" class="tpg-x" data-act="tpg-dz" aria-label="디자인 설정 닫기">${SV(P.x)}</button></div><div class="tpg-dzb"></div>`;
      document.body.appendChild(w);
      w.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset) return; const s = site0(); if (!s) return;
        if (t.dataset.tpg === 'stock') { push(); if (t.checked) delete s.stockOff; else s.stockOff = 1; done('샘플 사진을 ' + (t.checked ? '켰습니다.' : '껐습니다.')); }
        else if (t.dataset.tpg === 'tagline') { push(); const v = String(t.value || '').replace(/\s+/g, ' ').trim().slice(0, 80); if (v) hps(s).tagline = v; else if (s.hps) delete s.hps.tagline; done(v ? '바닥글 한 줄 소개를 바꿨습니다.' : '바닥글 한 줄 소개를 비웠습니다.'); } }); }
    DZ.on = true; document.body.classList.add('tpg-dz-on'); topOf(); dzPaint(); requestAnimationFrame(() => w.classList.add('on')); syncBtn(); }
  function topOf() { const w = $1('#tpgDz'); const b = $1('#hpe .hpe-stage') || $1('#hpe .hpe-bar'); if (w && b) w.style.setProperty('--tpg-top', Math.round(b.classList.contains('hpe-stage') ? b.getBoundingClientRect().top : b.getBoundingClientRect().bottom) + 'px'); }
  addEventListener('resize', topOf);
  function dzClose() { DZ.on = false; DZ.pg = ''; DZ.tgt = null; const w = $1('#tpgDz'); if (w) w.remove(); document.body.classList.remove('tpg-dz-on'); syncBtn(); }
  DZ.open = dzOpen; DZ.close = dzClose; DZ.paint = dzPaint;
  const push = () => { try { if (typeof window.hpPush === 'function') window.hpPush(); } catch (e) { } };
  const done = msg => { try { save(); } catch (e) { } try { if (HPE.on && typeof window.hpPaint === 'function') window.hpPaint(); else if (typeof render === 'function') render(); } catch (e) { console.error('hpgal paint', e); } if (msg && typeof toast === 'function') toast(msg); };
  ACT['tpg-dz'] = () => (DZ.on ? dzClose() : dzOpen());
  ACT['tpg-dzp'] = el => { DZ.pg = el.dataset.v || ''; if (!DZ.pg) DZ.tgt = null; dzPaint(); const f = $1(DZ.pg ? '#tpgDz .tpg-opt.on, #tpgDz .tpg-opt' : `#tpgDz [data-v="${el.dataset.from || ''}"]`); f && f.focus({ preventScroll: true }); };
  ACT['tpg-dzs'] = el => { const s = site0(); const g = groups().find(x => x.k === el.dataset.g); if (!s || !g) return; const v = el.dataset.v || ''; if (v === g.cur) return;
    push(); g.set(s, v); const o = g.opts.find(x => x.id === v); done(`${g.n}: ${o ? o.name : v}`);
    $1('#tpgDz') && $1('#tpgDz').querySelectorAll(`.tpg-opt[data-g="${g.k}"]`).forEach(b => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); const t = b.querySelector('.tpg-on2'); if (t) t.innerHTML = `<b>${E((g.opts.find(x => x.id === b.dataset.v) || {}).name || '')}</b>${on ? SV(P.ok, 16, 2.4) : ''}`; });
    /* 다른 선택지 썸네일은 바뀐 사이트로 다시 그린다(레이아웃 · 테마는 서로 영향) */
    if (g.th !== 'pc' && g.th !== 'sw') return; setTimeout(() => { if (DZ.on && DZ.pg === g.k) { const b = $1('#tpgDz .tpg-dzb'); const y = b && b.scrollTop; dzPaint(); if (b) b.scrollTop = y; } }, 50); };
  /* 바로 고치기 막대에 [디자인] 버튼 · 닫히면 패널도 닫기 · 되돌리기 뒤 값 맞추기 */
  function syncBtn() { const b = $1('#hpe .tpg-dzbtn'); if (b) { b.setAttribute('aria-pressed', DZ.on); b.classList.toggle('on', DZ.on); } }
  function hookBar() { const bar = $1('#hpe .hpe-bar'); if (!bar || bar.querySelector('.tpg-dzbtn')) return; const at = bar.querySelector('[data-act=hpm-open]') || bar.querySelector('.sp');
    const btn = `<button type="button" class="btn sm tpg-dzbtn" data-act="tpg-dz" aria-pressed="${DZ.on}" title="레이아웃 · 테마 · 글꼴 · 머리글 · 바닥글">${SV(P.dz, 15, 1.7)} 디자인</button>`;
    if (at) at.insertAdjacentHTML(at.classList.contains('sp') ? 'afterend' : 'beforebegin', btn); syncBtn(); }
  new MutationObserver(() => { hookBar(); if (DZ.on && !document.body.classList.contains('hpe-open')) dzClose(); }).observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['class'] });
  /* 섹션 툴바 [모양]: 첫 화면 · 강좌 · 신청 띠 섹션에서 그 섹션의 모양 고르기를 연다 */
  function hookTb(f) { const doc = f.contentDocument; if (!doc) return; const x = site0(); if (!x) return; const pg = pagesOf(x).find(p => p.key === (HPE.key || 'home')); if (!pg) return;
    doc.querySelectorAll('[data-hpe] > .hpe-tb').forEach(tb => { if (tb.querySelector('[data-tpg-k]')) return; const [, si] = tb.parentElement.dataset.hpe.split('|'); const sec = pg.sections[+si]; if (!sec) return;
      const k = Object.keys(SECK).find(q => SECK[q].test(sec)); if (!k || !SECK[k].list().length) return;
      const b = doc.createElement('button'); b.type = 'button'; b.dataset.tpgK = k; b.dataset.i = si; b.textContent = '모양'; b.title = `${SECK[k].n} 모양 고르기`; const ai = tb.querySelector('.ai'); tb.insertBefore(b, ai || null); });
    if (!doc.__tpg) { doc.__tpg = 1; doc.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-tpg-k]'); if (!b) return; e.preventDefault(); e.stopPropagation();
      DZ.tgt = { k: b.dataset.tpgK, page: HPE.key || 'home', i: +b.dataset.i }; DZ.pg = 'sec-' + b.dataset.tpgK; if (!DZ.on) dzOpen(); else dzPaint(); }, true); } }
  document.addEventListener('load', e => { const t = e.target; if (t && t.id === 'hpeF') { setTimeout(() => { try { hookTb(t); } catch (x) { console.error('hpgal tb', x); } }, 0); hookBar(); topOf(); if (DZ.on) { const G = groups(); const g = DZ.pg && G.find(x => x.k === DZ.pg); const cur = $1('#tpgDz .tpg-opt.on'); if (!g || !cur || cur.dataset.v !== g.cur) dzPaint(); else if (!g) dzPaint(); } } }, true);
  { const base = ACT['hpe-open']; if (base) ACT['hpe-open'] = (...a) => { const r = base(...a); setTimeout(hookBar, 0); return r; }; }
  { const base = window.hpEdit; if (typeof base === 'function') window.hpEdit = (...a) => { const r = base(...a); setTimeout(hookBar, 0); return r; }; }
})();
