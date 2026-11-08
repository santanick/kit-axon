/* v34.5 hpsec-hero — 첫 화면 · 신청 띠 · 문의 카드(디자이너 S3, fix6/BRIEF3.md)
   대표님(2026-11-08): "잘 만들어진 사이트 벤치마크를 강화해서 디자인을 대폭 올려."
   - 첫 화면 4가지(사진이 주인공 · RULES_P ①~③ + Aalto식 격자):
       scrim  전면 사진 + 아래쪽 스크림 + 왼쪽 아래 큰 제목(+ 실제 숫자 줄)
       box    전체 폭 사진 + 사진에 겹친 단색 글자 상자(+ 실제 메뉴 바로가기)
       split  왼쪽 글 · 오른쪽 끝까지 닿는 사진(좌우 분할)
       grid   큰 제목 줄 + 사진 3장 격자(+ 실제 숫자 줄)
   - 신청 띠 3가지: photo(사진 상자 + 스크림) · panel(진한 상자 + 상담 정보 상자) · contact(문의 카드: 전화 · 메일 · 게시판으로 바로 연결)
     게시본 정화기(safeHTML)가 <form>을 지우고 문의 접수 /api도 없어서, 입력칸 폼 대신 '실제로 연결되는' 문의 카드로 만든다(코어 변경 요청으로 보고).
   - 사진: site.img[slot] → (첫 화면) banner.data.img → HPSTOCK(기관 유형 · 템플릿 장면 · 슬롯). 사진이 하나도 없으면 기존 hpth 첫 화면을 그대로 쓴다.
     샘플 사진은 분위기 사진으로만 쓰고 캡션을 붙이지 않는다. 편집 화면의 '샘플' 표시는 D4(hpimg)가 figure[data-slot]에 붙인다.
   - 사실 원칙: 숫자는 HPT.facts(), 연락처 · 운영 시간은 설정값 · 섹션 값만. 없으면 그 줄을 숨긴다.
   - 고르기: banner.data.hk = 'scrim'|'box'|'split'|'grid' (없으면 banner.data.hero → 테마 순서로 정함), 문의 띠 data.ck = 'photo'|'panel'|'contact'(없으면 기관 유형)
   인터페이스(레이아웃 계열 HPL이 재사용): window.HPS.hero(kind, site, d, th, T) · HPS.cta(kind, site, d, th, T) · HPS.heroKind(site, d) · HPS.ctaKind(site, d)
     · HPS.photo(site, slot, d) · HPS.heroCSS(site) · HPS.audit(site). 반환이 null이면 호출한 쪽이 기존 렌더러로 그린다.
   CSS는 JS 문자열로 사이트 CSS에 넣는다(게시본 Shadow DOM과 미리보기가 같다). 범위는 .hps-* 클래스. */
'use strict';
(() => {
  if (typeof siteHTML !== 'function' || typeof proSec !== 'function') return;
  const HS = window.HPS = window.HPS || {};

  /* ── 도구 ── */
  const E = v => esc(v == null ? '' : v);
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const term = k => (typeof t === 'function' ? t(k) : k === 'cls' ? '강좌' : k);
  const rgb = h => { h = String(h || '#000000'); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  const Lm = h => { const c = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - w) + B[i] * w).toString(16).padStart(2, '0')).join(''); };
  const fit = (c, bg, min, to) => { min = min || 4.5; to = to || (Lm(bg) > .35 ? '#000000' : '#ffffff'); let x = c; for (let k = 1; k <= 20 && CR(x, bg) < min; k++) x = mix(c, to, k * .05); return x; };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', mail: 'M3 5h18v14H3zM3 6l9 7 9-7', chat: 'M4 5h16v11H9l-5 4z', pin: 'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', check: 'M5 12.5l4.5 4.5L19 7.5', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5' };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;
  const pubAll = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료');
  const pub = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };
  const safeU = v => (typeof safeURL === 'function' ? safeURL(v) : /^https?:\/\//.test(v) ? v : '');
  const linkHref = v => !v ? '' : v.startsWith('learn:') ? '#p-' + ({ home: 'home', shop: 'm-class', textbooks: 'm-book', comm: 'm-community', notice: 'm-notice' }[v.slice(6)] || 'home') : v.startsWith('page:') ? '#p-' + v.slice(5) : v.startsWith('cls:') ? '#p-c-' + v.slice(4) : v.startsWith('url:') ? safeU(v.slice(4)) : '';
  const aAttr = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const menuOf = (s, kind) => ((s && s.menus) || []).find(m => m.kind === kind && m.on !== false);
  const clsHref = s => { const m = menuOf(s, 'class'); return m ? '#p-m-' + m.id : (pub()[0] ? '#p-c-' + pub()[0].id : ''); };
  const ft = () => (S.settings && S.settings.footer) || {};
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  function channels(s) { const f = ft(); const L = [];
    if (f.tel && !isPh(f.tel)) L.push({ ic: 'phone', k: '전화', act: '전화로 문의', v: f.tel, h: telH(f.tel) });
    if (f.email && !isPh(f.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) L.push({ ic: 'mail', k: '이메일', act: '메일로 문의', v: f.email, h: 'mailto:' + f.email + '?subject=' + encodeURIComponent(`[${(S.org && S.org.name) || ''}] 문의`) });
    const m = menuOf(s, 'community') || menuOf(s, 'board'); if (m && m.access !== '비공개') L.push({ ic: 'chat', k: '게시판', act: '게시판에 남기기', v: m.l || '문의 게시판', h: '#p-m-' + m.id });
    return L; }
  const askHref = s => { const c = channels(s)[0]; return c ? c.h : ''; };
  const facts = () => { try { return (window.HPT && HPT.facts && HPT.facts()) || []; } catch (e) { return []; } };
  function badges() { const C = pub(); const B = [];
    if (C.some(c => c.cert === 'auto' || c.cert === 'manual')) B.push('수료증 발급');
    if (C.some(c => !+c.price)) B.push(`무료 ${term('cls')} 있음`);
    if (C.some(c => c.period && c.period.mode === 'days')) B.push('신청 즉시 수강');
    if (C.length) B.push('PC · 휴대폰 수강');
    return B.slice(0, 3); }
  const quick = s => ((s && s.menus) || []).filter(m => m.on !== false && m.kind !== 'home' && m.access !== '비공개' && m.l).slice(0, 4).map(m => ({ l: m.l, h: (m.link ? linkHref(m.link) : '') || '#p-m-' + m.id }));
  const typeOf = () => (typeof S !== 'undefined' && S && S.org && S.org.type) || 'adult';

  /* ── 사진: site.img[slot] → banner.data.img → HPSTOCK ── */
  const stockRe = /(^|\/)img\/stock\/[a-z]{3}-\d{2}(-800)?\.webp/;
  function absSrc(src) { src = String(src || '').trim(); if (!src) return '';
    if (/^(data:image\/(png|jpe?g|gif|webp|avif);base64,|blob:|https?:\/\/)/i.test(src)) return src;
    if (/^img\/stock\//.test(src) || stockRe.test(src)) { try { return new URL(src, (window.HPSTOCK && HPSTOCK.base) || location.href).href; } catch (e) { return src; } }
    return ''; }
  const posOk = p => /^[\d.]+% [\d.]+%$/.test(String(p || '')) ? p : '';
  const sceneOf = s => { let tp = null; try { tp = s && s.tpl && typeof TPL !== 'undefined' ? TPL.find(x => x.id === s.tpl) : null; } catch (e) { } return [tp && tp.scene, tp && tp.name, S.org && S.org.name].filter(Boolean).join(' '); };
  const setCache = new Map();
  function stockSet(s) { const H = window.HPSTOCK; if (!H || typeof H.set !== 'function') return {};
    const ty = typeOf(); const sc = sceneOf(s); const key = [ty, sc, s && s.tpl].join('|');
    if (!setCache.has(key)) { let r = {}; try { r = H.set(ty, sc, ['hero', 'about', 'space', 'cta'], (s && s.tpl) || (S.org && S.org.name) || '', { people: true }); } catch (e) { console.error('HPS stock', e); } setCache.set(key, r); }
    return setCache.get(key) || {}; }
  /* 반환: { src, srcset, alt, pos, fit, stock, tone } 또는 null */
  function photo(s, slot, d) {
    const m = s && s.img && s.img[slot]; const H = window.HPSTOCK;
    const own = (src, alt, pos, fitv) => { const a = absSrc(src); if (!a) return null; const st = stockRe.test(a); const x = st && H && H.list ? H.list.find(y => a.indexOf(y.src.replace(/\.webp$/, '')) >= 0) : null;
      return { src: a, srcset: x && H.srcset ? H.srcset(x) : '', alt: alt || (x && x.alt) || '', pos: posOk(pos) || (x && x.focus) || '50% 50%', fit: fitv === 'contain' ? 'contain' : 'cover', stock: st, tone: x ? x.tone : 'light' }; };
    if (m && m.src) { const r = own(m.src, m.alt, m.pos, m.fit); if (r) return r; }
    if (slot === 'hero') { const b = d || (((s && s.sections) || []).find(x => x && x.type === 'banner') || {}).data || {}; if (b.img) { const r = own(b.img, b.alt, '', ''); if (r) return r; } }
    const x = stockSet(s)[slot]; const it = Array.isArray(x) ? x[0] : x;
    if (it && H) return { src: H.url(it), srcset: H.srcset ? H.srcset(it) : '', alt: it.alt || '', pos: it.focus || '50% 50%', fit: 'cover', stock: true, tone: it.tone };
    return null; }
  const fig = (slot, p, o) => { o = o || {}; if (!p) return '';
    return `<figure class="hps-img${slot === 'hero' ? ' hp-photo' : ''}${o.cls ? ' ' + o.cls : ''}" data-slot="${E(slot)}"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="${E(o.sizes || '100vw')}"` : ''} alt="${E(p.alt)}" ${o.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-fit:${p.fit};object-position:${E(p.pos)}"></figure>`; };

  /* ── 고르기 ── */
  const HK = ['scrim', 'box', 'split', 'grid'], CK = ['photo', 'panel', 'contact'];
  const TH_HK = { premium: 'scrim', tech: 'scrim', official: 'box', campus: 'box', kids: 'grid', clean: 'split', warm: 'split', senior: 'split' };
  const HERO_HK = { bg: 'scrim', split: 'split', center: 'grid', band: 'box' };
  HS.heroKind = (s, d) => { d = d || {}; if (HK.includes(d.hk)) return d.hk; if (HERO_HK[d.hero]) return HERO_HK[d.hero]; return TH_HK[s && s.theme] || 'split'; };
  const TY_CK = { corp: 'contact', univ: 'panel', public: 'panel', lifelong: 'panel' };
  HS.ctaKind = (s, d) => { d = d || {}; let k = CK.includes(d.ck) ? d.ck : (TY_CK[typeOf()] || 'photo'); if (k === 'contact' && !channels(s).length) k = 'panel'; return k; };
  HS.kinds = Object.assign(HS.kinds || {}, { hero: HK.slice(), cta: CK.slice() }); /* v34.5 G2: S1의 nav · mm · footer 목록을 덮어쓰지 않게 합친다 */
  HS.photo = photo;

  /* ── 토큰 ── */
  const tokOf = s => { try { return window.HPT && HPT.tokens ? HPT.tokens(s) : null; } catch (e) { return null; } };
  /* 진한 상자 바탕: 포인트색을 어둡게, 흰 글자와 7:1 이상 */
  const boxBg = T => fit(mix(T.a, '#0B1020', .28), '#ffffff', 7, '#000000');
  const INK = '#0A0C11';
  /* 스크림 세기: 글자가 놓이는 지점의 최소 불투명도(밝은 사진에서도 흰 글자 4.5:1 이상) */
  const SCRIM_MIN = .62, CTA_MIN = .7;

  /* ── 첫 화면 ── */
  const lines = d => String((d && d.title) || (S.org && S.org.name) || '').split('\n').filter((x, k, A) => x || A.length === 1);
  const h1 = d => lines(d).map(E).join('<br>');
  function btns(s, d, mode) { const p1 = linkHref(d.link) || clsHref(s); const p2 = linkHref(d.link2) || askHref(s);
    const a = d.cta ? (p1 ? `<a class="hps-btn p" ${aAttr(p1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : `<span class="hps-btn p">${E(d.cta)}</span>`) : '';
    const b = d.cta2 && p2 ? `<a class="hps-btn g" ${aAttr(p2)}>${E(d.cta2)}</a>` : '';
    return a || b ? `<div class="hps-btns${mode ? ' ' + mode : ''}">${a}${b}</div>` : ''; }
  const ey = d => d.eyebrow ? `<p class="hps-ey">${E(d.eyebrow)}</p>` : '';
  const sub = d => d.sub ? `<p class="hps-sub">${E(d.sub)}</p>` : '';
  const factRow = (cls, s) => { if (((s && s.sections) || []).some(x => x && !x.hide && x.data && (x.data.hpt === 'facts' || x.data.variant === 'stats'))) return ''; /* 아래 숫자 띠와 겹치지 않게 */
    const F = facts(); if (F.length < 2) return ''; return `<dl class="hps-facts ${cls || ''}">${F.slice(0, 3).map(f => `<div><dt>${E(f.l)}</dt><dd>${E(f.v)}<small>${E(f.u)}</small></dd></div>`).join('')}</dl>`; };
  const badgeRow = () => { const B = badges(); return B.length ? `<ul class="hps-badges">${B.map(b => `<li>${ic('check', 16)}<span>${E(b)}</span></li>`).join('')}</ul>` : ''; };

  HS.hero = (kind, s, d, th, T) => { d = d || {}; T = T || tokOf(s); if (!T || !s) return null; kind = HK.includes(kind) ? kind : HS.heroKind(s, d);
    const p = photo(s, 'hero', d); if (!p) return null;
    const head = `${ey(d)}<h1>${h1(d)}</h1>${sub(d)}`;
    const L = lines(d); const long = L.join('').length > 22 || L.some(x => x.length > 14); /* 긴 제목은 한 단계 작게(4줄 방지) */
    const sec = (inner, extra) => `<section class="hpt hp-hero hps-hero hps-k-${kind}${p.tone === 'light' ? ' hps-light' : ''}${long ? ' hps-long' : ''}${extra ? ' ' + extra : ''}">${inner}</section>`;
    if (kind === 'scrim') return sec(`${fig('hero', p, { eager: 1 })}<i class="hps-scrim" aria-hidden="true"></i><div class="hps-w hps-sc"><div class="hps-tx">${head}${btns(s, d, 'on-dark')}</div>${factRow('on-dark', s)}</div>`);
    if (kind === 'box') { const Q = quick(s); const side = Q.length >= 2 ? `<nav class="hps-quick" aria-label="바로가기">${Q.map(q => `<a ${aAttr(q.h)}><span>${E(q.l)}</span>${ic('arrow', 18)}</a>`).join('')}</nav>` : badgeRow() ? `<div class="hps-side">${badgeRow()}</div>` : '';
      return sec(`${fig('hero', p, { eager: 1, cls: 'hps-bph' })}<div class="hps-w"><div class="hps-row"><div class="hps-box">${head}${btns(s, d, 'on-dark')}</div>${side}</div></div>`); }
    if (kind === 'split') return sec(`<div class="hps-st"><div class="hps-tx">${head}${btns(s, d)}${badgeRow() ? `<div class="hps-rule"></div>${badgeRow()}` : ''}</div>${fig('hero', p, { eager: 1, sizes: '(max-width: 1000px) 100vw, 58vw' })}</div>`);
    /* grid: 사진 3장(hero · about · space). 2장 이하면 split으로 */
    const p2 = photo(s, 'about'), p3 = photo(s, 'space');
    if (!p2 || !p3) return HS.hero('split', s, d, th, T);
    return sec(`<div class="hps-w"><div class="hps-gh"><h1>${h1(d)}</h1><div class="hps-ga">${ey(d)}${sub(d)}${btns(s, d)}</div></div><div class="hps-gg">${fig('hero', p, { eager: 1, cls: 'a', sizes: '(max-width: 1000px) 100vw, 58vw' })}${fig('about', p2, { cls: 'b', sizes: '(max-width: 1000px) 50vw, 40vw' })}${fig('space', p3, { cls: 'c', sizes: '(max-width: 1000px) 50vw, 40vw' })}</div>${factRow('on-light', s)}</div>`); };

  /* ── 신청 띠 · 문의 카드 ── */
  function infoRows(s, d) { const cols = ((d && d.cols) || []).filter(r => r && String(r[0] || '').trim() && r[1] && !isPh(r[1]));
    const C = channels(s).filter(c => c.ic !== 'chat'); const f = ft();
    const R = cols.map(([a, b]) => ({ k: a, v: b, h: /전화|연락/.test(a) ? telH(b) : /메일/.test(a) && /@/.test(b) ? 'mailto:' + b : '' }));
    C.forEach(c => { if (!R.some(r => r.v === c.v)) R.push({ k: c.k, v: c.v, h: c.ic === 'mail' ? 'mailto:' + c.v : c.h }); });
    if (f.addr && !isPh(f.addr) && !R.some(r => r.v === f.addr)) R.push({ k: '주소', v: f.addr, h: '' });
    return R.slice(0, 4); }
  const ctaTitle = d => `${d.eyebrow ? `<p class="hps-ey">${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '').replace(/\n/g, '<br>')}</h2>${typeof d.body === 'string' && d.body ? `<p class="hps-cbody">${E(d.body)}</p>` : ''}`;
  function ctaBtns(s, d) { const h = askHref(s); const tel = channels(s).find(c => c.ic === 'phone');
    const a = d.cta && h ? `<a class="hps-btn p" ${aAttr(h)}>${E(d.cta)}${ic('arrow', 18)}</a>` : '';
    const b = tel && tel.h !== h ? `<a class="hps-btn g" href="${E(tel.h)}">${ic('phone', 18)}${E(tel.v)}</a>` : !a && tel ? `<a class="hps-btn p" href="${E(tel.h)}">${ic('phone', 18)}${E(tel.v)}</a>` : '';
    const c = !a && !b && clsHref(s) ? `<a class="hps-btn p" ${aAttr(clsHref(s))}>${E(term('cls'))} 보기${ic('arrow', 18)}</a>` : '';
    return a || b || c ? `<div class="hps-btns">${a}${b}${c}</div>` : ''; }
  const rowsHTML = R => R.length ? `<dl class="hps-info">${R.map(r => `<div><dt>${E(r.k)}</dt><dd>${r.h ? `<a href="${E(r.h)}">${E(r.v)}</a>` : E(r.v)}</dd></div>`).join('')}</dl>` : '';

  HS.cta = (kind, s, d, th, T) => { d = d || {}; T = T || tokOf(s); if (!T || !s) return null; kind = CK.includes(kind) ? kind : HS.ctaKind(s, d);
    if (!String(d.title || '').trim() && !d.body) return null;
    const R = infoRows(s, d); const sec = inner => `<section class="hpt hp-s hp-cta hps-cta hps-c-${kind}"><div class="hps-w">${inner}</div></section>`;
    if (kind === 'photo') { const p = photo(s, 'cta'); if (!p) return HS.cta('panel', s, d, th, T);
      return sec(`<div class="hps-cb">${fig('cta', p, { sizes: '(max-width: 1000px) 100vw, 1200px' })}<i class="hps-scrim" aria-hidden="true"></i><div class="hps-ci${R.length ? ' two' : ''}"><div>${ctaTitle(d)}${ctaBtns(s, d)}</div>${R.length ? `<div class="hps-cside">${rowsHTML(R)}</div>` : ''}</div></div>`); }
    if (kind === 'contact') { const C = channels(s); if (!C.length) return HS.cta('panel', s, d, th, T);
      const extra = R.filter(r => !C.some(c => c.v === r.v));
      return sec(`<div class="hps-ct"><div class="hps-ctl">${ctaTitle(d)}${extra.length ? rowsHTML(extra) : ''}</div><div class="hps-card" role="list">${C.map(c => `<a role="listitem" class="hps-ch" ${aAttr(c.h)}><i>${ic(c.ic, 22)}</i><span><b>${E(c.act)}</b><small>${E(c.v)}</small></span>${ic('arrow', 20)}</a>`).join('')}<p class="hps-note">이 홈페이지는 문의 내용을 따로 저장하지 않습니다. 고른 방법으로 담당자에게 바로 연결됩니다.</p></div></div>`); }
    return sec(`<div class="hps-pn${R.length ? ' two' : ''}"><div class="hps-pa">${ctaTitle(d)}${ctaBtns(s, d)}</div>${R.length ? `<div class="hps-pb"><p class="hps-pbh">상담 안내</p>${rowsHTML(R)}</div>` : ''}</div>`); };

  /* ── CSS ── */
  HS.heroCSS = s => { const T = tokOf(s); if (!T) return ''; const big = s && s.theme === 'senior' ? 1.12 : 1; const px = n => Math.round(n * big) + 'px';
    const bb = boxBg(T); const pri = T.a, on = T.on; const accOnW = fit(T.a, '#ffffff', 4.6);
    const rad = s.theme === 'official' || s.theme === 'campus' ? 2 : s.theme === 'premium' ? 4 : s.theme === 'kids' || s.theme === 'warm' ? 20 : 12;
    return `/* hps (S3) */
.hps-hero,.hps-cta{--hps-gut:clamp(20px,4vw,40px);--hps-rad:${rad}px}
.hps-hero .hps-w,.hps-cta .hps-w{max-width:1240px;margin:0 auto;padding:0 var(--hps-gut);position:relative;z-index:2}
.hps-img{margin:0;position:relative;overflow:hidden;background:${T.as}}.hps-img>img{position:absolute;inset:0;width:100%;height:100%;max-height:none;display:block;object-fit:cover;border-radius:0;box-shadow:none}
.hpt.hps-hero{padding:0;background:var(--bg);color:var(--ink);overflow:hidden}
.hpt.hps-hero h1{font-size:clamp(${px(40)},5.6vw,${px(80)});line-height:1.1;letter-spacing:-.035em;font-weight:800;color:inherit;margin:0;text-wrap:balance}
.hps-hero .hps-ey,.hps-cta .hps-ey{font-size:${px(14)};font-weight:650;letter-spacing:.06em;margin:0 0 20px;opacity:.92}
.hps-hero .hps-sub{font-size:${px(19)};line-height:1.6;max-width:34em;margin:24px 0 0}
.hps-btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:36px}
.hps-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:${px(52)};padding:0 ${px(26)};border-radius:var(--br);font-weight:700;font-size:${px(16)};letter-spacing:-.01em;white-space:nowrap;text-decoration:none;transition:background .15s,color .15s,box-shadow .15s}
.hps-btn svg{transition:transform .15s}.hps-btn:hover svg{transform:translateX(3px)}
.hps-btn.p{background:${pri};color:${on}}.hps-btn.p:hover{background:${mix(pri, '#000000', .14)}}
.hps-btn.g{box-shadow:inset 0 0 0 1.5px ${al(T.ink, .28)};color:var(--ink);background:transparent}.hps-btn.g:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}
.hps-btns.on-dark .hps-btn.g{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6);color:#fff}.hps-btns.on-dark .hps-btn.g:hover{box-shadow:inset 0 0 0 1.5px #fff;background:rgba(255,255,255,.08)}
.hps-hero a:focus-visible,.hps-cta a:focus-visible{outline:3px solid ${fit(T.a, T.bg, 3)};outline-offset:3px}
.hps-btns.on-dark a:focus-visible,.hps-cb a:focus-visible,.hps-pa a:focus-visible{outline-color:#fff}
.hps-badges{display:flex;flex-wrap:wrap;gap:8px 22px;list-style:none;margin:0;padding:0}.hps-badges li{display:flex;align-items:center;gap:8px;font-size:${px(14.5)};color:var(--mu)}.hps-badges svg{color:${accOnW}}
.hps-facts{display:flex;gap:0;margin:0;font-variant-numeric:tabular-nums}.hps-facts div{padding:0 28px;border-left:1px solid currentColor}.hps-facts div:first-child{border-left:0;padding-left:0}.hps-facts dt{font-size:${px(13)};opacity:.85;margin:0 0 6px}.hps-facts dd{margin:0;font-size:${px(34)};font-weight:700;letter-spacing:-.03em;line-height:1}.hps-facts small{font-size:.48em;font-weight:600;margin-left:3px;letter-spacing:0}
/* ① 전면 사진 + 스크림 */
.hpt.hps-k-scrim{position:relative;min-height:clamp(560px,86vh,860px);display:flex;align-items:flex-end;color:#fff;background:${INK}}
.hps-k-scrim>.hps-img{position:absolute;inset:0;z-index:0}
.hps-k-scrim .hps-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(0deg,rgba(10,12,17,.9) 0%,rgba(10,12,17,.74) 50%,rgba(10,12,17,.34) 80%,rgba(10,12,17,.14) 100%),linear-gradient(90deg,rgba(10,12,17,.42) 0%,rgba(10,12,17,0) 62%)}
.hps-k-scrim.hps-light .hps-scrim{background:linear-gradient(0deg,rgba(10,12,17,.92) 0%,rgba(10,12,17,.8) 52%,rgba(10,12,17,.4) 82%,rgba(10,12,17,.18) 100%),linear-gradient(90deg,rgba(10,12,17,.46) 0%,rgba(10,12,17,0) 64%)}
.hps-k-scrim .hps-sc{width:100%;display:flex;align-items:flex-end;justify-content:space-between;gap:48px;padding-top:120px;padding-bottom:clamp(56px,9vh,96px)}
.hps-k-scrim .hps-tx{max-width:820px}.hps-k-scrim .hps-sub{color:rgba(255,255,255,.9)}.hps-k-scrim .hps-ey{color:#fff}
.hps-k-scrim .hps-facts{color:rgba(255,255,255,.92);flex:none}.hps-k-scrim .hps-facts div{border-color:rgba(255,255,255,.34)}
@media(min-width:641px){.hpt.hps-long h1{font-size:clamp(${px(34)},4.4vw,${px(62)})!important}.hps-k-box.hps-long h1,.hps-k-split.hps-long h1{font-size:clamp(${px(32)},3.5vw,${px(48)})!important}.hps-k-grid.hps-long h1{font-size:clamp(${px(40)},5vw,${px(72)})!important}}
/* ② 사진 + 겹친 글자 상자 */
.hps-k-box{padding-bottom:clamp(64px,8vw,104px)!important}
.hps-k-box .hps-bph{height:clamp(420px,64vh,640px)}
.hps-k-box .hps-row{display:grid;grid-template-columns:minmax(0,620px) minmax(0,1fr);gap:clamp(32px,5vw,72px);margin-top:-220px;align-items:start}
.hps-k-box .hps-box{background:${bb};color:#fff;padding:clamp(36px,4vw,56px);border-radius:var(--hps-rad);position:relative}
.hps-k-box .hps-box::before{content:'';position:absolute;left:clamp(36px,4vw,56px);top:0;width:56px;height:4px;background:${fit(mix(T.a, '#ffffff', .35), bb, 3, '#ffffff')}}
.hps-k-box h1{font-size:clamp(${px(34)},4.2vw,${px(58)})!important}.hps-k-box .hps-sub{color:rgba(255,255,255,.88);font-size:${px(17.5)}}
.hps-k-box .hps-btns .hps-btn.p{background:#fff;color:${fit(T.a, '#ffffff', 4.8)}}.hps-k-box .hps-btns .hps-btn.p:hover{background:${mix('#ffffff', T.a, .1)}}
.hps-k-box .hps-quick,.hps-k-box .hps-side{margin-top:244px}
.hps-quick{display:flex;flex-direction:column;border-top:2px solid var(--ink)}.hps-quick a{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 4px;border-bottom:1px solid ${al(T.ink, .14)};font-size:${px(18)};font-weight:650;color:var(--ink);text-decoration:none;letter-spacing:-.02em}.hps-quick a svg{color:${accOnW};transition:transform .15s}.hps-quick a:hover svg{transform:translateX(4px)}.hps-quick a:hover span{text-decoration:underline;text-underline-offset:4px}
/* ③ 좌우 분할 */
.hps-k-split .hps-st{display:grid;grid-template-columns:minmax(0,11fr) minmax(0,13fr);min-height:clamp(560px,80vh,780px)}
.hps-k-split .hps-tx{align-self:center;padding:clamp(56px,7vw,104px) clamp(32px,5vw,72px) clamp(56px,7vw,104px) max(var(--hps-gut),calc((100vw - 1240px)/2 + 40px))}
.hps-k-split h1{font-size:clamp(${px(36)},4.2vw,${px(60)})!important}.hps-k-split .hps-sub{color:var(--mu)}.hps-k-split .hps-ey{color:${fit(T.a, T.bg, 4.6)}}
.hps-k-split .hps-img{min-height:100%}.hps-rule{height:1px;background:${al(T.ink, .12)};margin:40px 0 20px}
/* ④ 사진 격자 */
.hps-k-grid{padding:clamp(56px,7vw,104px) 0 clamp(56px,6vw,88px)!important}
.hps-k-grid .hps-gh{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:clamp(24px,4vw,56px);align-items:end}
.hps-k-grid h1{font-size:clamp(${px(44)},6.4vw,${px(92)})!important;line-height:1.04!important}
.hps-k-grid .hps-ga .hps-sub{margin-top:0;color:var(--mu);font-size:${px(17.5)}}.hps-k-grid .hps-ey{color:${fit(T.a, T.bg, 4.6)};margin-bottom:12px}.hps-k-grid .hps-btns{margin-top:28px}
.hps-gg{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);grid-template-rows:1fr 1fr;gap:12px;height:clamp(380px,44vw,580px);margin-top:clamp(40px,5vw,64px)}
.hps-gg .hps-img{border-radius:var(--hps-rad)}.hps-gg .a{grid-row:1/3}
.hps-k-grid .hps-facts{margin-top:32px;padding-top:24px;border-top:1px solid ${al(T.ink, .12)};color:var(--ink)}.hps-k-grid .hps-facts div{border-color:${al(T.ink, .16)}}.hps-k-grid .hps-facts dt{color:var(--mu);opacity:1}
/* 신청 띠 */
.hpt.hps-cta{padding:clamp(64px,9vw,128px) 0;background:var(--bg)}
.hps-cta h2{font-size:clamp(${px(30)},3.6vw,${px(48)});line-height:1.18;letter-spacing:-.03em;font-weight:800;margin:0;text-wrap:balance}
.hps-cta .hps-cbody{font-size:${px(17.5)};line-height:1.65;margin:18px 0 0;max-width:36em}
.hps-info{margin:0;display:flex;flex-direction:column}.hps-info div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;padding:16px 0;border-top:1px solid ${al(T.ink, .12)}}.hps-info dt{font-size:${px(14)};color:var(--mu)}.hps-info dd{margin:0;font-weight:650;font-size:${px(16.5)};font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.hps-info a{color:inherit;text-decoration:underline;text-decoration-color:${al(T.ink, .3)};text-underline-offset:4px}
.hps-cb{position:relative;border-radius:max(var(--hps-rad),8px);overflow:hidden;color:#fff;background:${INK};min-height:440px;display:flex;align-items:stretch}
.hps-cb>.hps-img{position:absolute;inset:0;z-index:0}.hps-cb .hps-scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(10,12,17,.88) 0%,rgba(10,12,17,.78) 46%,rgba(10,12,17,.42) 100%)}
.hps-cside{background:rgba(10,12,17,.62);border-radius:max(calc(var(--hps-rad) - 4px),4px);padding:8px 28px}.hps-cside .hps-info div:first-child{border-top:0}
.hps-ci{position:relative;z-index:2;display:grid;gap:48px;padding:clamp(40px,6vw,80px);width:100%;align-items:end}.hps-ci.two{grid-template-columns:minmax(0,7fr) minmax(0,4fr)}
.hps-cb .hps-cbody{color:rgba(255,255,255,.88)}.hps-cb .hps-btn.g{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6);color:#fff}
.hps-cside .hps-info div{border-color:rgba(255,255,255,.22)}.hps-cside .hps-info dt{color:rgba(255,255,255,.78)}.hps-cside .hps-info a{text-decoration-color:rgba(255,255,255,.45)}
.hps-pn{display:grid;gap:16px}.hps-pn.two{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}
.hps-pa{background:${bb};color:#fff;border-radius:var(--hps-rad);padding:clamp(40px,5vw,72px)}.hps-pa .hps-cbody{color:rgba(255,255,255,.86)}
.hps-pa .hps-btn.p{background:#fff;color:${fit(T.a, '#ffffff', 4.8)}}.hps-pa .hps-btn.g{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6);color:#fff}
.hps-pb{background:var(--alt);border-radius:var(--hps-rad);padding:clamp(32px,4vw,48px);display:flex;flex-direction:column;justify-content:flex-end}.hps-pbh{font-size:${px(14)};font-weight:700;margin:0 0 16px;color:var(--ink)}.hps-pb .hps-info dt{color:${fit(T.mu, T.alt, 4.6)}}
.hps-ct{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:clamp(32px,6vw,96px);align-items:start}.hps-ctl .hps-ey{color:${fit(T.a, T.bg, 4.6)}}.hps-ctl .hps-cbody{color:var(--mu)}.hps-ctl .hps-info{margin-top:36px}
.hps-card{border:1px solid ${al(T.ink, .14)};border-radius:max(var(--hps-rad),6px);background:#fff;padding:8px 28px 22px}
.hps-ch{display:flex;align-items:center;gap:18px;padding:22px 0;border-bottom:1px solid ${al(T.ink, .1)};color:var(--ink);text-decoration:none}.hps-ch>i{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:${T.as};color:${fit(T.a, T.as, 4.6)};flex:none}
.hps-ch span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.hps-ch b{font-size:${px(18)};letter-spacing:-.02em}.hps-ch small{font-size:${px(14.5)};color:${fit(T.mu, '#ffffff', 4.6)};overflow-wrap:anywhere}.hps-ch>svg{color:${accOnW};transition:transform .15s}.hps-ch:hover>svg{transform:translateX(4px)}.hps-ch:hover b{text-decoration:underline;text-underline-offset:4px}
.hps-note{font-size:${px(13)};color:${fit(T.mu, '#ffffff', 4.6)};margin:16px 0 0;line-height:1.6}
@media(max-width:1000px){
.hps-k-scrim .hps-sc{flex-direction:column;align-items:flex-start;gap:36px}
.hps-k-box .hps-row{grid-template-columns:1fr;gap:0;margin-top:-120px}.hps-k-box .hps-quick,.hps-k-box .hps-side{margin-top:36px}
.hps-k-split .hps-st{grid-template-columns:1fr;min-height:0}.hps-k-split .hps-img{order:-1;aspect-ratio:4/3;min-height:0}.hps-k-split .hps-tx{padding:40px var(--hps-gut) 56px}
.hps-k-grid .hps-gh{grid-template-columns:1fr;gap:20px}
.hps-ci.two,.hps-pn.two,.hps-ct{grid-template-columns:1fr}}
@media(max-width:640px){
.hpt.hps-hero h1{font-size:${px(36)}!important;line-height:1.16!important;letter-spacing:-.03em}.hpt.hps-hero.hps-long h1{font-size:${px(31)}!important}.hps-hero .hps-sub{font-size:${px(16.5)};margin-top:16px}.hps-hero .hps-ey{margin-bottom:14px;font-size:${px(13)}}
.hps-btns{margin-top:28px;flex-direction:column;align-items:stretch}.hps-btn{width:100%;min-height:${px(52)}}
.hpt.hps-k-scrim{min-height:clamp(540px,84svh,720px)}.hps-k-scrim .hps-sc{padding-bottom:40px;gap:28px}
.hps-k-scrim .hps-scrim,.hps-k-scrim.hps-light .hps-scrim{background:linear-gradient(0deg,rgba(10,12,17,.92) 0%,rgba(10,12,17,.8) 58%,rgba(10,12,17,.36) 84%,rgba(10,12,17,.16) 100%)}
.hps-facts dd{font-size:${px(26)}}.hps-facts div{padding:0 16px}.hps-facts dt{font-size:${px(12.5)}}
.hps-k-box .hps-bph{height:auto;aspect-ratio:4/3}.hps-k-box .hps-row{margin-top:-56px}.hps-k-box .hps-box{padding:32px 24px 28px}.hps-k-box .hps-box::before{left:24px}
.hps-k-split .hps-tx{padding:32px var(--hps-gut) 48px}
.hps-k-grid{padding:40px 0 48px!important}.hps-gg{grid-template-columns:1fr 1fr;grid-template-rows:auto auto;height:auto;gap:8px;margin-top:32px}.hps-gg .a{grid-row:auto;grid-column:1/-1;aspect-ratio:4/3}.hps-gg .b,.hps-gg .c{aspect-ratio:1/1}
.hps-k-grid .hps-facts{flex-wrap:wrap;row-gap:16px}
.hps-cta h2{font-size:${px(28)}}.hps-cta .hps-cbody{font-size:${px(16)}}
.hps-cb{min-height:0}.hps-cb .hps-scrim{background:rgba(10,12,17,.8)}.hps-cside{background:transparent;padding:0}.hps-ci{padding:40px 24px;gap:32px}
.hps-pa{padding:36px 24px}.hps-pb{padding:28px 24px}.hps-info div{grid-template-columns:80px minmax(0,1fr);gap:12px}
.hps-card{padding:4px 18px 18px}.hps-ch{gap:14px;padding:18px 0}.hps-ch>i{width:42px;height:42px}}
@media(prefers-reduced-motion:reduce){.hps-btn,.hps-btn svg,.hps-quick a svg,.hps-ch>svg{transition:none}}`; };

  /* ── 대비 점검(밝은 사진에서도): HPT.audit에 줄을 더한다 ── */
  HS.audit = s => { const T = tokOf(s); if (!T) return []; const R = []; const add = (n, f, b) => R.push([n, f, b, Math.round(CR(f, b) * 100) / 100]);
    const worst = a => mix('#ffffff', INK, a); const bb = boxBg(T);
    add('사진 첫 화면 제목(가장 밝은 사진)', '#ffffff', worst(SCRIM_MIN)); add('사진 첫 화면 설명', mix('#ffffff', worst(SCRIM_MIN), .1), worst(SCRIM_MIN));
    add('겹친 상자 제목', '#ffffff', bb); add('겹친 상자 설명', mix('#ffffff', bb, .12), bb); add('겹친 상자 주 버튼', fit(T.a, '#ffffff', 4.8), '#ffffff');
    add('분할 첫 화면 라벨', fit(T.a, T.bg, 4.6), T.bg); add('사진 신청 띠 글자', '#ffffff', worst(CTA_MIN)); add('사진 신청 띠 상담 정보', '#ffffff', worst(1 - (1 - .42) * (1 - .62))); add('진한 신청 상자 글자', mix('#ffffff', bb, .14), bb);
    add('상담 안내 라벨', fit(T.mu, T.alt, 4.6), T.alt); add('문의 카드 설명', fit(T.mu, '#ffffff', 4.6), '#ffffff'); add('문의 카드 아이콘', fit(T.a, T.as, 4.6), T.as);
    return R; };
  if (window.HPT && typeof HPT.audit === 'function' && !HPT.audit.hps) { const a0 = HPT.audit; HPT.audit = s => { const r = a0(s); try { return HPT.tokens(s) ? r.concat(HS.audit(s)) : r; } catch (e) { return r; } }; HPT.audit.hps = 1; }

  /* ── proSec 감싸기: 테마가 있는 사이트의 첫 화면 · 신청 띠 ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    if (!x || !s || !s.theme || !(window.HPT && HPT.has && HPT.has(s.theme))) return base(x, i, s, lk);
    const d = x.data || {}; const isHero = x.type === 'banner'; const isCta = x.type === 'text' && d.variant === 'cta';
    if (!isHero && !isCta) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    if (+d.dstyle && !(isHero && +d.dstyle === 2)) return base(x, i, s, lk); /* 직접 고른 디자인 스타일은 존중(사진 교체 = dstyle 2는 이 렌더러) */
    if (i === 0) { try { base(x, i, s, lk); } catch (e) { } } /* hpth 줄무늬 순서(band)를 첫 섹션에서 초기화 */
    let h = null; try { h = isHero ? HS.hero(null, s, d) : HS.cta(null, s, d); } catch (e) { console.error('HPS', e); h = null; }
    if (h == null) return base(x, i, s, lk);
    const m = editing() ? HPE.map.get(x) : null;
    if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; }

  /* ── CSS 넣기(미리보기 · 게시본 공통) ── */
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); if (!s || !s.theme || !(window.HPT && HPT.has && HPT.has(s.theme))) return h;
    try { return h.replace('</style>', HS.heroCSS(s).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('HPS css', e); return h; } }; window.siteHTML = siteHTML; }
})();
