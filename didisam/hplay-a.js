/* v34.5 hplay-a — 홈페이지 레이아웃 계열(HPL) 래퍼 + 계열 A 6종(개발 요원 D1)
   대표님(2026-11-08): "디자인 유사한 거는 최대한 제외하고, 다양성을 가지고 가줘 … 디자인 수준을 더 올려줘."
   축 두 개: 테마(HPT) = 색 · 글꼴 · 모서리, 계열(HPL) = 구조 · 배치. 어떤 테마와 어떤 계열을 섞어도 대비 4.5:1 · 휴대폰 넘침 0.
   데이터: site.layout = '<계열 id>'(없으면 지금 모습 그대로), 사진은 site.img[slot] = { src, alt, fit: 'cover'|'contain', pos: '50% 50%' }
           (첫 화면은 site.img.hero → 없으면 banner.data.img, 강좌는 site.img['cls-<강좌 id>'] → 없으면 강좌 썸네일 c.thumb)
   인터페이스(window.HPL)
     reg(id, def)            계열 등록. def = { name, desc, by, fits[], css(site, th, T), hero(site, d, th, T, ctx), sec: { <kind>: fn(site, d, th, T, ctx) }, order[], slots[] }
                             섹션 kind: banner(=hero) · features · steps · stats(실제 숫자 띠 포함) · faq · info · timeline · profiles · tiles · cta · plain · classes · notices · reviews · map · image · video
                             fn 반환: HTML 문자열(그 계열로 그림) · ''(숨김) · null(기존 hpth 렌더러로 그림 — 이때도 섹션에 .hpl-<id> 클래스가 붙어 계열 CSS로 다듬을 수 있음)
                             ctx = { x(섹션), i(순서), alt(회색 띠 차례), edit(바로 고치기 중), id(계열 id), u(공통 도구 HPL.u) }
     render(x, i, s)         섹션 하나를 계열로 그린다(계열이 없거나 null이면 null)
     css(s)                  계열 CSS(공통 + 계열). siteHTML이 <style>에 넣으므로 미리보기 · 게시본(Shadow DOM)이 같다
     apply(s, id)            s.layout 지정(테마가 없으면 기관 유형 추천 테마도 함께) · id가 없으면 계열 해제
     list()                  [{ id, name, desc, by, fits }]
     of(s)                   s의 계열 정의(없으면 null)
     img(s, slot, d)         사진 데이터(없으면 null) · fig(slot, s, th, T, o) 이미지 자리 HTML(<figure class="hpl-img" data-slot>)
     u                       공통 도구(E · br · pub · facts · reviews · contact · badges · linkHref · clsHref · askHref · ic …) — D2도 같이 쓴다
     art(slot, s, th, T, o)  (D2) 아트 플레이스홀더 SVG — 없으면 이 파일의 간단한 도형으로 대체
     icon(name)              (D2) 선 아이콘 SVG — 없으면 이 파일의 아이콘
   th = { id(테마 id), name, big(큰 글씨), lux(프리미엄), kids, tech, dark(테마 첫 화면이 어두운지) }, T = HPT.tokens(site)(a · on · ink · mu · bg · alt · at · as · as2 · hd · hdHi · D · L · B …)
   CSS 범위: 계열 CSS는 반드시 .hpl-<id> 아래. 섹션 · 바닥글(.gf)에 .hpt .hpl-<id>가 붙는다(게시본은 body 클래스가 없어지므로 섹션 단위로 범위를 정함).
   사실 원칙: 숫자는 HPT.facts, 후기는 HPT.reviews, 연락처는 설정값만. 지어낸 실적 · 인물 · 로고 없음. 외부 이미지 · 폰트 없음(기기 글꼴 · Pretendard). */
'use strict';
(() => {
  const H = window.HPL = window.HPL || { fam: {} };
  H.fam = H.fam || {};
  if (typeof H.reg !== 'function') H.reg = function (id, def) { this.fam[id] = def; };
  if (typeof siteHTML !== 'function' || typeof proSec !== 'function') return;

  /* ═════════ 공통 도구 ═════════ */
  const E = v => esc(v == null ? '' : v);
  const br = v => E(v).replace(/\n/g, '<br>');
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const pubAll = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료');
  const pub = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };
  const dot = d => String(d || '').replace(/-/g, '.');
  const perOf = c => c.period && c.period.mode === 'days' && +c.period.days ? `신청일부터 ${+c.period.days}일` : (c.start || c.end) ? [dot(c.start), dot(c.end)].filter(Boolean).join(' ~ ') : '';
  const lesOf = c => (c.curriculum || []).length;
  const priceOf = c => +c.price ? won(c.price) : '무료';
  const kindOf = c => ({ live: '라이브', offline: '오프라인', blend: '블렌디드', sub: '구독', pack: '패키지' })[c.kind] || '온라인';
  const term = k => (typeof t === 'function' ? t(k) : k === 'cls' ? '강좌' : k);
  const safeU = v => (typeof safeURL === 'function' ? safeURL(v) : /^https?:\/\//.test(v) ? v : '');
  const linkHref = v => !v ? '' : v.startsWith('learn:') ? '#p-' + ({ home: 'home', shop: 'm-class', textbooks: 'm-book', comm: 'm-community', notice: 'm-notice' }[v.slice(6)] || 'home') : v.startsWith('page:') ? '#p-' + v.slice(5) : v.startsWith('cls:') ? '#p-c-' + v.slice(4) : v.startsWith('url:') ? safeU(v.slice(4)) : '';
  const aAttr = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const menuOf = (s, kind) => ((s && s.menus) || []).find(m => m.kind === kind && m.on !== false);
  const clsHref = s => { const m = menuOf(s, 'class'); return m ? '#p-m-' + m.id : (pub()[0] ? '#p-c-' + pub()[0].id : ''); };
  const ft = () => (S.settings && S.settings.footer) || {};
  function contact() { const f = ft(); const L = [];
    if (f.tel && !isPh(f.tel)) L.push({ ic: 'phone', k: '전화', v: f.tel, h: 'tel:' + String(f.tel).replace(/[^\d+]/g, '') });
    if (f.email && !isPh(f.email) && /@/.test(f.email)) L.push({ ic: 'mail', k: '이메일', v: f.email, h: 'mailto:' + f.email });
    if (f.addr && !isPh(f.addr)) L.push({ ic: 'pin', k: '주소', v: f.addr, h: '' });
    return L; }
  const askHref = s => { const c = contact().find(x => x.h); if (c) return c.h; const m = menuOf(s, 'community') || menuOf(s, 'board'); return m ? '#p-m-' + m.id : ''; };
  const facts = () => { try { return (window.HPT && HPT.facts && HPT.facts()) || []; } catch (e) { return []; } };
  const reviews = () => { try { return (window.HPT && HPT.reviews && HPT.reviews()) || []; } catch (e) { return []; } };
  function badges() { const C = pub(); const B = [];
    if (C.some(c => c.cert === 'auto' || c.cert === 'manual')) B.push('수료증 발급');
    if (S.settings && S.settings.pg === 'toss' && S.settings.toss && S.settings.toss.status === '승인' && C.some(c => +c.price)) B.push('온라인 결제');
    if (C.some(c => !+c.price)) B.push(`무료 ${term('cls')} 있음`);
    if (C.some(c => c.period && c.period.mode === 'days')) B.push('신청 즉시 수강');
    if (C.length) B.push('PC · 휴대폰 수강');
    return B.slice(0, 3); }
  const noticeList = n => [...(S.notices || []), ...(S.classes || []).flatMap(c => c.notices || [])].filter(x => x && x.title).slice(0, n || 4);
  const clsList = d => { d = d || {}; const ids = d.auto ? pub().map(c => c.id).slice(0, 6) : (d.ids || []); return ids.map(id => (S.classes || []).find(c => c.id === id)).filter(Boolean); };
  const cols = d => ((d && d.cols) || []).filter(r => r && String(r[0] || '').trim());
  const menus = s => ((s && s.menus) || []).filter(m => m.on !== false && m.kind !== 'home' && m.access !== '비공개');
  const menuHref = m => (m.link ? linkHref(m.link) : '') || '#p-m-' + m.id;
  const lines = (d, s) => String((d && d.title) || (S.org && S.org.name) || '').split('\n');
  const h1 = (d, s) => lines(d, s).map(E).join('<br>');

  /* 아이콘(선 굵기 1.7 일정) — D2의 HPL.icon이 있으면 그것을 쓴다 */
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7', users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a7 7 0 0114 0v1M16 3.5a4 4 0 010 7.5M22 21v-1a6 6 0 00-4-5.6', pin: 'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', mail: 'M3 5h18v14H3zM3 6l9 7 9-7', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', play: 'M7 4.5l12 7.5-12 7.5z', check: 'M5 12.5l4.5 4.5L19 7.5', award: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.5 14L7 21l5-3 5 3-1.5-7', chat: 'M4 5h16v11H9l-5 4z', chart: 'M4 20V10M10 20V4M16 20v-7M2 20h20', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', home: 'M3 11l9-8 9 8M5 10v10h14V10', brief: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18', tool: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z', plus: 'M12 5v14M5 12h14', doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5', card: 'M3 6h18v12H3zM3 10h18M7 15h4', heart: 'M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z' };
  const svgI = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.check}"/></svg>`;
  const ic = (k, n) => { if (typeof H.icon === 'function') { try { const v = H.icon(k, { size: n || 20 }); if (v) return String(v); } catch (e) { } } return svgI(k, n); };
  const KW = [[/영상|강의|동영상|재생|라이브/, 'play'], [/실습|도구|기술|훈련|정비|공구/, 'tool'], [/질문|답변|상담|소통|문의/, 'chat'], [/수료|이수|배지|인증|자격|증명/, 'award'], [/일정|기간|개강|모집|신청|학사/, 'cal'], [/리더|함께|팀|보호자|가족|강사|멘토/, 'users'], [/법정|의무|보안|안전|신뢰/, 'shield'], [/AI|디지털|인공지능|자동|코딩|데이터/i, 'spark'], [/기록|성적|분석|리포트|엑셀/, 'chart'], [/교재|책|독서|국어|도서/, 'book'], [/취업|직무|업무|직장|커리어/, 'brief'], [/국비|카드|결제|수강료/, 'card'], [/시간|짧은|바쁜/, 'clock'], [/공지|알림|소식/, 'bell'], [/오시는|위치|주소|캠퍼스/, 'pin'], [/생활|건강|마음/, 'heart'], [/서류|증명서|자료|문서/, 'doc']];
  const icOf = (txt, k) => { const s = String(txt || ''); const hit = KW.find(([re]) => re.test(s)); return hit ? hit[1] : ['spark', 'book', 'award', 'chat', 'chart', 'users'][(k || 0) % 6]; };

  /* 색 */
  const rgb = h => { h = String(h || '#000000'); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  const Lm = h => { const c = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - w) + B[i] * w).toString(16).padStart(2, '0')).join(''); };
  const fit = (c, bg, min, to) => { min = min || 4.5; to = to || (Lm(bg) > .35 ? '#000000' : '#ffffff'); let x = c; for (let k = 1; k <= 20 && CR(x, bg) < min; k++) x = mix(c, to, k * .05); return x; };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

  /* ═════════ 이미지 자리 ═════════ */
  const okSrc = v => /^(data:image\/|https:\/\/|blob:)/.test(String(v || ''));
  H.img = (s, slot, d) => { const m = s && s.img && s.img[slot];
    if (m && okSrc(m.src)) return { src: m.src, alt: m.alt || '', fit: m.fit === 'contain' ? 'contain' : 'cover', pos: /^[\d.]+% [\d.]+%$/.test(m.pos || '') ? m.pos : '50% 50%' };
    if (slot === 'hero') { const b = d || (((s && s.sections) || []).find(x => x && x.type === 'banner') || {}).data || {}; if (okSrc(b.img)) return { src: b.img, alt: b.alt || '', fit: 'cover', pos: '50% 50%' }; }
    if (/^cls-/.test(slot)) { const c = (S.classes || []).find(x => 'cls-' + x.id === slot); if (c && okSrc(c.thumb)) return { src: c.thumb, alt: c.name || '', fit: 'cover', pos: '50% 50%' }; }
    return null; };
  /* 간단한 도형(HPL.art가 없을 때) — 테마 색 듀오톤, 슬롯마다 구성이 다르다 */
  function artLite(slot, s, th, T, o) { const a = T.a, d = T.hd || mix(a, '#000000', .6), l = T.as || mix(a, '#ffffff', .88), m = mix(a, '#ffffff', .45);
    let h = 0; for (const ch of String(slot)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const k = h % 4;
    const g = [
      `<rect width="400" height="300" fill="${l}"/><circle cx="300" cy="90" r="120" fill="${m}" opacity=".55"/><rect x="40" y="150" width="220" height="110" fill="${a}"/><rect x="40" y="150" width="220" height="12" fill="${d}"/><path d="M60 196h140M60 222h96" stroke="${l}" stroke-width="8" stroke-linecap="round"/>`,
      `<rect width="400" height="300" fill="${d}"/><path d="M0 300L180 60l220 240z" fill="${a}" opacity=".9"/><path d="M120 300l150-170 130 170z" fill="${m}" opacity=".55"/><circle cx="320" cy="70" r="28" fill="${l}"/>`,
      `<rect width="400" height="300" fill="${m}"/><rect x="0" y="0" width="200" height="300" fill="${a}"/><circle cx="200" cy="150" r="96" fill="${l}"/><circle cx="200" cy="150" r="54" fill="${d}"/>`,
      `<rect width="400" height="300" fill="${l}"/>${[0, 1, 2, 3].map(i => `<rect x="${40 + i * 84}" y="${210 - i * 40}" width="64" height="${50 + i * 40}" fill="${i % 2 ? m : a}"/>`).join('')}<path d="M30 70h340" stroke="${d}" stroke-width="3"/><circle cx="360" cy="70" r="10" fill="${d}"/>`][k];
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true">${g}</svg>`; }
  H.fig = (slot, s, th, T, o) => { o = o || {}; const m = H.img(s, slot, o.d); const r = o.ratio ? `aspect-ratio:${o.ratio};` : ''; const cls = `hpl-img${o.cls ? ' ' + o.cls : ''}`;
    if (m) return `<figure class="${cls}" data-slot="${E(slot)}" style="${r}"><img src="${E(m.src)}" alt="${E(m.alt || o.alt || '')}" loading="lazy" style="object-fit:${m.fit};object-position:${m.pos}"></figure>`;
    let art = ''; if (typeof H.art === 'function') { try { art = String(H.art(slot, s, th, T, { ratio: o.ratio || '4/3', scene: o.scene }) || ''); } catch (e) { console.error('HPL.art', e); art = ''; } }
    if (!art) art = artLite(slot, s, th, T, o);
    return `<figure class="${cls} hpl-art" data-slot="${E(slot)}" data-empty="1" style="${r}" aria-hidden="true">${art}</figure>`; };

  H.u = { E, br, isPh, editing, pub, pubAll, dot, perOf, lesOf, priceOf, kindOf, term, linkHref, aAttr, menuOf, clsHref, askHref, contact, facts, reviews, badges, noticeList, clsList, cols, menus, menuHref, lines, h1, ic, icOf, rgb, Lm, CR, mix, fit, al };

  /* ═════════ 레지스트리 · 렌더 ═════════ */
  H.of = s => (s && s.layout && H.fam[s.layout]) ? H.fam[s.layout] : null;
  H.list = () => Object.keys(H.fam).map(id => { const f = H.fam[id]; return { id, name: f.name || id, desc: f.desc || '', by: f.by || '', fits: f.fits || [] }; });
  const typeKey = () => (S && S.org ? (S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type) : 'adult');
  H.apply = (s, id) => { if (!s) return s; if (!id || !H.fam[id]) { delete s.layout; return s; } s.layout = id;
    if (!s.theme && window.HPT && typeof HPT.apply === 'function') HPT.apply(s, HPT.rec(typeKey()), { keepColor: true });
    return s; };
  const thOf = s => { const id = s && s.theme; const L = (window.HPT && HPT.list) || []; const e = L.find(x => x.id === id) || {}; const T = H.tok(s);
    return { id: id || '', name: e.name || '', big: id === 'senior', lux: id === 'premium', kids: id === 'kids', tech: id === 'tech', dark: !!(T && T.def === 'dark') }; };
  H.tok = s => { try { return window.HPT && HPT.tokens ? HPT.tokens(s) : null; } catch (e) { return null; } };
  H.th = thOf;
  function kindKey(x) { const d = x.data || {}; if (x.type === 'banner') return 'banner';
    if (x.type === 'text') { const v = d.variant || (d.cols ? 'features' : 'plain'); if (d.hpt === 'facts' || v === 'stats') return 'stats';
      if (v === 'info') return (d.hpt === 'faq' || cols(d).every(([a]) => /\?$/.test(String(a).trim()))) && cols(d).length ? 'faq' : 'info'; return v; }
    return x.type; }
  H.kind = kindKey;
  let band = 0;
  H.render = (x, i, s) => { const F = H.of(s); if (!F || !x) return null; const d = x.data || {}; const k = kindKey(x);
    const fn = k === 'banner' ? F.hero : F.sec && F.sec[k]; if (typeof fn !== 'function') return null;
    const T = H.tok(s); if (!T) return null; const th = thOf(s);
    if (i === 0) band = 0; const alt = !(k === 'banner' || k === 'cta' || k === 'stats') && (band++ % 2 === 1);
    const ctx = { x, i, alt, edit: editing(), id: s.layout, u: H.u, kind: k };
    const h = fn.call(k === 'banner' ? F : F.sec, s, d, th, T, ctx); if (h == null && alt) band--;
    return h; };
  /* 섹션 표시 클래스 + 바로 고치기 표시(data-hpe) */
  const tagSec = (h, id, k) => String(h).replace(/<section\b([^>]*?)\bclass="/g, `<section$1class="hpl-${id} hpl-k-${k} `);
  const markEdit = (h, x) => { const m = editing() ? HPE.map.get(x) : null; if (!m || /data-hpe="/.test(h)) return h; h = h.replace(/<section\b/g, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`); if (!/<section\b/.test(h)) h = `<section data-hpe="${E(m.key)}|${m.i}">${h}</section>`; return h; };
  { const base = proSec; proSec = (x, i, s, lk) => {
    const F = H.of(s); if (!F || !x || !s.theme) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    const d = x.data || {}; if (+d.dstyle && !(x.type === 'banner' && +d.dstyle === 2)) return base(x, i, s, lk); /* 직접 고른 디자인 스타일은 존중 */
    const k = kindKey(x); let h = null;
    try { h = H.render(x, i, s); } catch (e) { console.error('HPL', s.layout, k, e); h = null; }
    if (h == null) { const b = base(x, i, s, lk) || ''; return b ? tagSec(b, s.layout, k) : b; }
    if (!h) return '';
    return markEdit(tagSec(h, s.layout, k), x); }; }

  /* ═════════ CSS · siteHTML 연결 ═════════ */
  function baseCSS(s, th, T, id) { const P = `.hpl-${id}`; const big = th.big ? 1.14 : 1; const px = n => Math.round(n * big) + 'px';
    return `${P}{--hpl-serif:'Noto Serif KR','Noto Serif CJK KR','Nanum Myeongjo','AppleMyungjo','Batang',serif;--hpl-sans:Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR','Noto Sans CJK KR',sans-serif;--hpl-gut:clamp(20px,4vw,48px)}
${P} .hpl-w{max-width:1200px;margin:0 auto;padding:0 var(--hpl-gut);position:relative}
${P} .hpl-img{margin:0;position:relative;overflow:hidden;background:${T.as};display:block}${P} .hpl-img>img,${P} .hpl-img>svg{position:absolute;inset:0;width:100%;height:100%;display:block}${P} .hpl-img>img{object-fit:cover}
${P} .hpl-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:${px(50)};padding:0 ${px(24)};font-weight:700;font-size:${px(16)};letter-spacing:-.01em;border-radius:var(--br);white-space:nowrap;transition:background .15s,color .15s,box-shadow .15s}
${P} .hpl-btn.pri{background:var(--a);color:var(--on)}${P} .hpl-btn.pri:hover{background:${mix(T.a, '#000000', .14)}}
${P} a:focus-visible,${P} summary:focus-visible{outline:3px solid ${fit(T.a, T.bg, 3)};outline-offset:3px;border-radius:4px}
${P} .hpl-hint{border:1.5px dashed ${al(T.a, .45)};padding:18px;text-align:center;color:${T.at};font-weight:650;background:${T.as};border-radius:var(--r)}
${P} li.tx b{font-size:clamp(${px(26)},3vw,${px(42)})!important;white-space:nowrap;letter-spacing:-.03em!important}${P} .hp-av{background:var(--a)!important;color:var(--on)!important}${P} .hp-stars,${P} .hpl-stars{color:#8A5A0B}${P} .hp-stars i{color:#767C88}
@media(prefers-reduced-motion:reduce){${P} *{transition:none!important;animation:none!important}}`; }
  H.css = s => { const F = H.of(s); if (!F) return ''; const T = H.tok(s); if (!T) return ''; const th = thOf(s); let c = baseCSS(s, th, T, s.layout);
    try { if (typeof F.css === 'function') c += '\n' + F.css(s, th, T); } catch (e) { console.error('HPL css', s.layout, e); }
    return c; };
  { const base = siteHTML; siteHTML = (s, full, lang) => { const F = s && H.of(s); if (!F) return base(s, full, lang);
    let tmp = false; if (!s.theme && window.HPT && typeof HPT.rec === 'function') { s.theme = HPT.rec(typeKey()); tmp = true; }
    try { let h = base(s, full, lang); const c = H.css(s); if (!c) return h;
      h = h.replace('</style>', `/* hpl ${s.layout} */${c.replace(/<\/?style/gi, '')}</style>`).replace(/<body class="([^"]*)"/, `<body class="$1 hpl-on hpl-${s.layout}"`);
      h = h.replace(/<footer class="gf\b/g, `<footer class="gf hpt hpl-f hpl-${s.layout}`);
      return h; } catch (e) { console.error('HPL siteHTML', e); return base(s, full, lang); } finally { if (tmp) delete s.theme; } }; window.siteHTML = siteHTML; }
})();

/* ═════════════════════════ 계열 A 6종 ═════════════════════════
   설계 메모(frontend-design): 계열마다 '기억에 남는 한 가지'를 정하고 나머지는 조용히 둔다.
   editorial  큰 명조 제목 + 21:9 사진 + 목차형 강좌(대표 1 + 줄 목록) · 칼럼형 소개 · 위아래 선으로 닫는 문의
   bento      첫 화면이 크기가 다른 칸 묶음(제목 · 사진 · 실제 숫자 · 강좌 · 신청) · 강좌 · 소개도 벤토 격자
   fullbleed  화면 전체 사진 위 아래 정렬 큰 제목 · 세로 사진 카드 줄 · 어두운 소개 띠 · 사진 문의 띠
   splitscreen 좌우 50:50 전체 높이(한쪽 사진) · 왼쪽 고정 제목 + 오른쪽 목록 · 지그재그 강좌 · 반반 문의
   typo       사진 없이 초대형 글자와 여백 · 큰 글자 목록 강좌 · 초대형 숫자 · 화면 너비 글자 버튼
   portal     기관 포털: 바로 찾기 상자 · 많이 찾는 강좌 · 공지 패널 · 빠른 메뉴 · 표 형식 강좌 · 공지+일정 2단 */
(() => {
  const H = window.HPL; if (!H || !H.u || typeof H.reg !== 'function') return;
  const u = H.u; const { E, br } = u;
  const pxf = th => n => Math.round(n * (th.big ? 1.14 : 1)) + 'px';
  const hintS = (ctx, msg) => ctx.edit ? `<section class="hpt hpl-s hpl-empty"><div class="hpl-w"><p class="hpl-hint">${E(msg)}</p></div></section>` : '';
  const hrefs = (s, d) => [u.linkHref(d.link) || u.clsHref(s), u.linkHref(d.link2) || u.askHref(s)];
  const btn1 = (s, d, cls) => { const [p1] = hrefs(s, d); if (!d.cta) return ''; return p1 ? `<a class="${cls || 'hpl-btn pri'}" ${u.aAttr(p1)}><span>${E(d.cta)}</span>${u.ic('arrow', 18)}</a>` : `<span class="${cls || 'hpl-btn pri'}"><span>${E(d.cta)}</span></span>`; };
  const btn2 = (s, d, cls) => { const [, p2] = hrefs(s, d); return d.cta2 && p2 ? `<a class="${cls}" ${u.aAttr(p2)}><span>${E(d.cta2)}</span></a>` : ''; };
  const ctaItems = d => { const it = u.cols(d).filter(([a, b]) => b && !u.isPh(b)).map(([a, b]) => ({ ic: /시간/.test(a) ? 'clock' : u.icOf(a, 5), k: a, v: b, h: '' })); return [...it, ...u.contact().filter(c => !it.some(x => x.v === c.v))].slice(0, 4); };
  const factsOf = d => { const C = u.cols(d); if (d.hpt === 'facts' || !C.length) return u.facts(); return C.slice(0, 4).map(([a, b]) => ({ v: a, u: '', l: b })); };
  const fli = f => /^\d/.test(String(f.v)) ? '<li>' : '<li class="tx">';
  const fnum = f => `${E(f.v)}${f.u ? `<small>${E(f.u)}</small>` : ''}`;
  const meta = c => [u.kindOf(c), u.perOf(c), u.lesOf(c) ? `${u.lesOf(c)}차시` : ''].filter(Boolean);
  const descOf = c => String(c.sub || c.desc || '').replace(/\s+/g, ' ').trim().slice(0, 90);
  const secHead = (d, cls, def) => `<header class="${cls}">${d.eyebrow || def ? `<p class="hpl-ey">${E(d.eyebrow || def)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${d.sub ? `<p class="hpl-sd">${E(d.sub)}</p>` : typeof d.body === 'string' && d.body ? `<p class="hpl-sd">${E(d.body)}</p>` : ''}</header>`;
  const allLink = (s, n, cls) => { const h = u.clsHref(s); return h && n >= 2 ? `<a class="${cls}" ${u.aAttr(h)}><span>전체 보기</span>${u.ic('arrow', 16)}</a>` : ''; };
  const SEC = (cls, ctx, inner) => `<section class="hpt hpl-s ${cls}${ctx.alt ? ' is-alt' : ''}"><div class="hpl-w">${inner}</div></section>`;
  const noCls = ctx => hintS(ctx, `전체 공개한 ${u.term('cls')}이 이곳에 표시됩니다.`);
  const revList = n => u.reviews().slice(0, n || 3);
  const stars = r => r.st ? `<span class="hpl-stars" aria-label="별점 ${r.st}점">${'★'.repeat(Math.min(5, r.st))}</span>` : '';
  const lineMax = d => Math.max(4, ...u.lines(d).map(l => [...l].reduce((a, ch) => a + (/[\x00-\x7F]/.test(ch) ? .55 : 1), 0)));
  /* 섹션 머리 · 카드 등 기존 hpth 섹션(FAQ · 오시는 길 · 강사 등)을 계열 글꼴로 맞추는 공통 덮개 */
  const baseFix = (P, o) => `${P}.hp-s .hp-sh h2,${P}.hp-s .hp-prose h2{font-family:${o.hf || 'inherit'};font-weight:${o.hw || 800};letter-spacing:${o.hl || '-.03em'}}${o.card ? `${P}.hp-s .hp-card,${P}.hp-s .hp-qa details,${P}.hp-s .hp-dl div{${o.card}}` : ''}${o.ey ? `${P}.hp-s .hp-ey{${o.ey}}` : ''}`;

  /* ─────────── 1. editorial · 매거진형 ─────────── */
  H.reg('editorial', { name: '매거진형', by: 'D1', desc: '큰 명조 제목과 넓은 사진 · 목차처럼 정리한 강좌 · 칼럼 배치', fits: ['adult', 'univ', 'lifelong', 'corp'],
    order: ['banner', 'stats', 'features', 'classes', 'reviews', 'steps', 'faq', 'cta'], slots: ['hero', 'cls-*'],
    hero(s, d, th, T) { const B = u.badges();
      return `<section class="hpt hpl-hero ed-hero"><div class="hpl-w"><div class="ed-mast">${d.eyebrow ? `<p class="ed-kick">${E(d.eyebrow)}</p>` : `<p class="ed-kick">${E(S.org.name)}</p>`}${B.length ? `<ul class="ed-bd">${B.map(b => `<li>${E(b)}</li>`).join('')}</ul>` : ''}</div>
<div class="ed-top"><h1 class="ed-h1">${u.h1(d)}</h1><div class="ed-side">${d.sub ? `<p class="ed-sub">${E(d.sub)}</p>` : ''}<div class="ed-act">${btn1(s, d)}${btn2(s, d, 'ed-link')}</div></div></div>
${H.fig('hero', s, th, T, { d, ratio: '21/9', cls: 'ed-fig', scene: 'hero' })}</div></section>`; },
    sec: {
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx); const [c0, ...R] = L;
        const lead = `<a class="ed-lead" href="#p-c-${E(c0.id)}">${H.fig('cls-' + c0.id, s, th, T, { ratio: '4/3', scene: 'class' })}<div class="ed-lt"><p class="ed-meta">${meta(c0).map(m => `<span>${E(m)}</span>`).join('')}</p><h3>${E(c0.name)}</h3>${descOf(c0) ? `<p class="ed-desc">${E(descOf(c0))}</p>` : ''}<p class="ed-pr"><b>${E(u.priceOf(c0))}</b><span class="ed-more">자세히 보기 ${u.ic('arrow', 16)}</span></p></div></a>`;
        const list = R.length ? `<ul class="ed-list">${R.map(c => `<li><a href="#p-c-${E(c.id)}"><span class="ed-k">${E(u.kindOf(c))}</span><b>${E(c.name)}</b><span class="ed-p">${E(u.perOf(c) || (u.lesOf(c) ? u.lesOf(c) + '차시' : ''))}</span><span class="ed-pp">${E(u.priceOf(c))}</span></a></li>`).join('')}</ul>` : '';
        return SEC('ed-cls', ctx, `<div class="ed-sh">${secHead(d, 'ed-shh')}${allLink(s, L.length, 'ed-link')}</div>${lead}${list}`); },
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('ed-feat', ctx, `<div class="ed-two">${secHead(d, 'ed-shh')}<div class="ed-cols n${Math.min(C.length, 4)}">${C.map(([a, b]) => `<article><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div></div>`); },
      plain(s, d, th, T, ctx) { if (u.cols(d).length) return this.features(s, d, th, T, ctx); if (!d.title && !d.body) return null;
        return SEC('ed-prose', ctx, `<div class="ed-two">${d.title ? `<header class="ed-shh">${d.eyebrow ? `<p class="hpl-ey">${E(d.eyebrow)}</p>` : ''}<h2>${br(d.title)}</h2></header>` : '<div></div>'}${typeof d.body === 'string' && d.body ? `<p class="ed-body">${br(d.body)}</p>` : ''}</div>`); },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('ed-steps', ctx, `${secHead(d, 'ed-shh ed-one')}<ol class="ed-ol n${Math.min(C.length, 5)}">${C.map(([a, b], k) => `<li><span class="ed-no" aria-hidden="true">${k + 1}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol>`); },
      stats(s, d, th, T, ctx) { const F = factsOf(d); if (F.length < 2) return hintS(ctx, '공개 강좌가 2개 이상이면 실제 숫자(강좌 수 · 차시 · 수료증)가 자동으로 표시됩니다.');
        return `<section class="hpt hpl-s ed-facts"><div class="hpl-w"><ul class="ed-fl n${F.length}">${F.map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul></div></section>`; },
      reviews(s, d, th, T, ctx) { const R = revList(3); if (!R.length) return hintS(ctx, '실제 수강후기가 등록되면 이곳에 표시됩니다.'); const [r0, ...rr] = R;
        return SEC('ed-rv', ctx, `${secHead(d, 'ed-shh ed-one')}<figure class="ed-q"><blockquote>${E(String(r0.b).slice(0, 180))}</blockquote><figcaption>${stars(r0)}<b>${E(r0.w)}</b>${r0.c ? `<small>${E(r0.c)}</small>` : ''}</figcaption></figure>${rr.length ? `<div class="ed-qs">${rr.map(r => `<figure><blockquote>${E(String(r.b).slice(0, 140))}</blockquote><figcaption><b>${E(r.w)}</b>${r.c ? `<small>${E(r.c)}</small>` : ''}</figcaption></figure>`).join('')}</div>` : ''}`); },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); const h = u.askHref(s); const b = d.cta && h ? `<a class="hpl-btn pri" ${u.aAttr(h)}><span>${E(d.cta)}</span>${u.ic('arrow', 18)}</a>` : '';
        if (!d.title && !I.length) return null;
        return `<section class="hpt hpl-s ed-cta"><div class="hpl-w"><div class="ed-ctab">${d.eyebrow ? `<p class="ed-kick">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p class="ed-cb">${E(d.body)}</p>` : ''}${b ? `<div class="ed-act c">${b}</div>` : ''}${I.length ? `<dl class="ed-ci">${I.map(c => `<div><dt>${E(c.k)}</dt><dd>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : E(c.v)}</dd></div>`).join('')}</dl>` : ''}</div></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-editorial'; const px = pxf(th); const ln = u.al(T.ink, .16);
      return `${P}{font-family:var(--hpl-sans)}${P}.hpl-s{padding:clamp(56px,8vw,${px(112)}) 0;background:var(--bg)}${P}.hpl-s.is-alt{background:var(--alt)}
${P} .ed-h1,${P} .ed-shh h2,${P} .ed-lead h3,${P} .ed-cols h3,${P} .ed-ol h3,${P} .ed-ctab h2{font-family:var(--hpl-serif);font-weight:600;color:var(--ink)}
${P} .hpl-ey,${P} .ed-kick{font-family:var(--hpl-serif);font-size:${px(15)};font-weight:600;color:var(--at);letter-spacing:0;margin:0 0 10px}
${P}.ed-hero{background:var(--bg);padding:clamp(20px,3vw,36px) 0 clamp(48px,6vw,88px)}
${P} .ed-mast{display:flex;align-items:center;justify-content:space-between;gap:16px 28px;flex-wrap:wrap;padding-bottom:14px;border-bottom:1px solid var(--ink)}${P} .ed-mast .ed-kick{margin:0}
${P} .ed-bd{display:flex;flex-wrap:wrap;gap:6px 0;margin:0;padding:0;list-style:none;font-size:${px(13.5)};color:var(--mu)}${P} .ed-bd li+li{border-left:1px solid ${ln};margin-left:14px;padding-left:14px}
${P} .ed-top{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:24px 56px;align-items:end;padding:clamp(36px,5.5vw,80px) 0 clamp(28px,4vw,48px)}
${P} .ed-h1{margin:0;font-size:clamp(${px(40)},5.6vw,${px(80)});line-height:1.1;letter-spacing:-.035em;text-wrap:balance}
${P} .ed-sub{margin:0;font-size:${px(17)};line-height:1.75;color:var(--mu);border-top:3px solid var(--a);padding-top:18px}
${P} .ed-act{display:flex;flex-wrap:wrap;align-items:center;gap:14px 22px;margin-top:24px}${P} .ed-act.c{justify-content:center}
${P} .ed-link{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:${px(15.5)};color:var(--ink);border-bottom:1.5px solid currentColor;padding-bottom:3px}${P} .ed-link:hover{color:var(--at)}
${P} .ed-fig{aspect-ratio:21/9}
${P} .ed-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;border-bottom:1px solid var(--ink);padding-bottom:18px;margin-bottom:36px}
${P} .ed-shh h2{margin:0;font-size:clamp(${px(28)},3.4vw,${px(46)});line-height:1.2;letter-spacing:-.025em}${P} .hpl-sd{margin:12px 0 0;color:var(--mu);font-size:${px(16)};line-height:1.75;max-width:52ch}${P} .ed-one{margin-bottom:40px;max-width:760px}
${P} .ed-lead{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:28px 48px;align-items:center;padding-bottom:40px}${P} .ed-lead .hpl-img{aspect-ratio:4/3}
${P} .ed-meta{display:flex;flex-wrap:wrap;gap:4px 0;margin:0 0 14px;font-size:${px(13.5)};color:var(--mu)}${P} .ed-meta span+span{border-left:1px solid ${ln};margin-left:12px;padding-left:12px}
${P} .ed-lead h3{margin:0;font-size:clamp(${px(26)},2.6vw,${px(36)});line-height:1.25;letter-spacing:-.02em}${P} .ed-lead:hover h3{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:6px}
${P} .ed-desc{margin:14px 0 0;color:var(--mu);line-height:1.75}${P} .ed-pr{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:24px 0 0;padding-top:16px;border-top:1px solid ${ln}}${P} .ed-pr b{font-size:${px(19)}}${P} .ed-more{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--at);font-size:${px(14.5)}}
${P} .ed-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--ink)}${P} .ed-list a{display:grid;grid-template-columns:110px minmax(0,1fr) auto 110px;gap:24px;align-items:baseline;padding:22px 0;border-bottom:1px solid ${ln}}
${P} .ed-k{font-size:${px(13)};color:var(--at);font-weight:700}${P} .ed-list b{font-family:var(--hpl-serif);font-weight:600;font-size:${px(21)};letter-spacing:-.02em;color:var(--ink)}${P} .ed-list a:hover b{color:var(--at)}${P} .ed-p{color:var(--mu);font-size:${px(14)};font-variant-numeric:tabular-nums}${P} .ed-pp{text-align:right;font-weight:700}
${P} .ed-two{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:32px 64px;align-items:start}
${P} .ed-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:36px 40px}${P} .ed-cols article{border-top:1px solid var(--ink);padding-top:18px}${P} .ed-cols h3{margin:0 0 8px;font-size:${px(22)};letter-spacing:-.02em;line-height:1.35}${P} .ed-cols p{margin:0;color:var(--mu);line-height:1.75;font-size:${px(15.5)}}
${P} .ed-body{margin:0;font-family:var(--hpl-serif);font-size:${px(20)};line-height:1.9;color:var(--ink)}${P} .ed-body::first-letter{font-size:3.2em;float:left;line-height:.9;margin:6px 10px 0 0;color:var(--at);font-weight:700}
${P} .ed-ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:32px}${P} .ed-ol.n2{--n:2}${P} .ed-ol.n4{--n:4}${P} .ed-ol.n5{--n:5}${P} .ed-ol li{border-top:2px solid var(--ink);padding-top:16px}${P} .ed-no{display:block;font-family:var(--hpl-serif);font-size:${px(48)};line-height:1;color:var(--at);margin-bottom:14px}${P} .ed-ol h3{margin:0 0 6px;font-size:${px(20)}}${P} .ed-ol p{margin:0;color:var(--mu);line-height:1.7}
${P}.ed-facts{padding:clamp(36px,4vw,56px) 0;border-bottom:1px solid ${ln}}${P} .ed-fl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}${P} .ed-fl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .ed-fl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .ed-fl li{padding:0 24px;display:flex;flex-direction:column;gap:6px}${P} .ed-fl li+li{border-left:1px solid ${ln}}${P} .ed-fl li:first-child{padding-left:0}
${P} .ed-fl b{font-family:var(--hpl-serif);font-weight:600;font-size:clamp(${px(36)},4.4vw,${px(60)});line-height:1;color:var(--ink);letter-spacing:-.03em}${P} .ed-fl b small{font-size:.42em;margin-left:4px;color:var(--mu)}${P} .ed-fl span{color:var(--mu);font-size:${px(14)}}
${P} .ed-q{margin:0 0 40px;max-width:900px}${P} .ed-q blockquote{margin:0;font-family:var(--hpl-serif);font-size:clamp(${px(22)},2.6vw,${px(34)});line-height:1.55;color:var(--ink);text-indent:-.5em}${P} .ed-q blockquote::before{content:'“';color:var(--at)}${P} .ed-q figcaption,${P} .ed-qs figcaption{display:flex;align-items:center;gap:10px;margin-top:18px;font-size:${px(14)};color:var(--mu)}${P} .ed-q figcaption b,${P} .ed-qs b{color:var(--ink)}
${P} .ed-qs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;border-top:1px solid ${ln};padding-top:28px}${P} .ed-qs figure{margin:0}${P} .ed-qs blockquote{margin:0;line-height:1.75;color:var(--ink)}${P} .hpl-stars{letter-spacing:2px}
${P}.ed-cta{padding:clamp(40px,6vw,80px) 0 clamp(64px,8vw,112px)}${P} .ed-ctab{border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:clamp(40px,6vw,80px) 0;text-align:center}${P} .ed-ctab h2{margin:0 auto;max-width:20ch;font-size:clamp(${px(30)},4.4vw,${px(58)});line-height:1.18;letter-spacing:-.03em}${P} .ed-cb{margin:16px auto 0;color:var(--mu);max-width:52ch;line-height:1.75}
${P} .ed-ci{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 0;margin:36px 0 0}${P} .ed-ci div{padding:0 22px}${P} .ed-ci div+div{border-left:1px solid ${ln}}${P} .ed-ci dt{font-size:${px(12.5)};color:var(--mu)}${P} .ed-ci dd{margin:2px 0 0;font-weight:700}
${baseFix(P, { hf: 'var(--hpl-serif)', hw: 600, hl: '-.02em', card: 'box-shadow:none;border:0;border-top:1px solid var(--ink);border-radius:0;background:transparent', ey: 'font-family:var(--hpl-serif);letter-spacing:0;text-transform:none;font-size:15px' })}
${P}.gf{background:var(--bg);color:var(--mu);border-top:3px double var(--ink)}${P}.gf b{font-family:var(--hpl-serif);font-weight:600;color:var(--ink);font-size:${px(24)}}${P}.gf .fl2,${P}.gf .fl2 a{color:var(--ink)}
@media(max-width:900px){${P} .ed-top,${P} .ed-two,${P} .ed-lead{grid-template-columns:1fr}${P} .ed-fig{aspect-ratio:3/2}${P} .ed-ol{grid-template-columns:1fr 1fr}${P} .ed-fl,${P} .ed-fl.n3{grid-template-columns:1fr 1fr;row-gap:24px}${P} .ed-fl li:nth-child(odd){border-left:0;padding-left:0}${P} .ed-qs{grid-template-columns:1fr}}
@media(max-width:640px){${P} .ed-h1{font-size:${px(38)};line-height:1.15}${P} .ed-bd{display:none}${P} .ed-fig{aspect-ratio:4/3;margin:0 calc(var(--hpl-gut) * -1)}${P} .ed-sh{display:block}${P} .ed-sh .ed-link{margin-top:14px}
${P} .ed-list a{grid-template-columns:minmax(0,1fr) auto;gap:4px 12px}${P} .ed-list b{grid-column:1/-1;order:-1;font-size:${px(19)}}${P} .ed-cols{grid-template-columns:1fr;gap:24px}${P} .ed-ol{grid-template-columns:1fr;gap:20px}${P} .ed-ci{flex-direction:column}${P} .ed-ci div+div{border-left:0;border-top:1px solid ${ln};padding-top:12px}}`; }
  });

  /* ─────────── 2. bento · 벤토 격자 ─────────── */
  const bSpan = n => n <= 1 ? [12] : n === 2 ? [7, 5] : n === 3 ? [7, 5, 12] : n === 4 ? [7, 5, 5, 7] : n === 5 ? [7, 5, 4, 4, 4] : [7, 5, 4, 4, 4, 12].slice(0, n).concat(Array(Math.max(0, n - 6)).fill(6));
  H.reg('bento', { name: '벤토 격자', by: 'D1', desc: '크기가 다른 칸을 맞물린 첫 화면 · 강좌와 소개도 격자 칸', fits: ['adult', 'corp', 'k12', 'voc'],
    order: ['banner', 'classes', 'features', 'steps', 'reviews', 'faq', 'cta'], slots: ['hero', 'cls-*'],
    hero(s, d, th, T) { const F = u.facts(); const C = u.pub(); const B = u.badges(); const [, p2] = hrefs(s, d);
      const main = `<div class="bt-t bt-main s7 R">${d.eyebrow ? `<p class="bt-ey">${E(d.eyebrow)}</p>` : ''}<h1>${u.h1(d)}</h1>${d.sub ? `<p class="bt-sub">${E(d.sub)}</p>` : ''}<div class="bt-act">${btn1(s, d)}</div></div>`;
      const pic = H.fig('hero', s, th, T, { d, cls: 'bt-t bt-pic s5 r2', scene: 'hero' });
      const r3 = F.length >= 2 ? F.slice(0, 2).map((f, k) => `<div class="bt-t bt-fact${k ? ' s2b' : ' s3b'}"><b>${fnum(f)}</b><span>${E(f.l)}</span></div>`).join('') : B.length ? `<div class="bt-t bt-bd s5"><ul>${B.map(b => `<li>${u.ic('check', 16)}<span>${E(b)}</span></li>`).join('')}</ul></div>` : '';
      const T4 = [];
      if (C[0]) T4.push(c => `<a class="bt-t bt-cls ${c}" href="#p-c-${E(C[0].id)}"><span class="bt-k">${E(u.kindOf(C[0]))}</span><h2>${E(C[0].name)}</h2><p class="bt-m">${meta(C[0]).slice(1).map(m => `<span>${E(m)}</span>`).join('')}</p><p class="bt-pr"><b>${E(u.priceOf(C[0]))}</b>${u.ic('arrow', 20)}</p></a>`);
      if (C[1]) T4.push(c => `<a class="bt-t bt-cls2 ${c}" href="#p-c-${E(C[1].id)}"><span class="bt-k">${E(u.kindOf(C[1]))}</span><h2>${E(C[1].name)}</h2><p class="bt-pr"><b>${E(u.priceOf(C[1]))}</b>${u.ic('arrow', 18)}</p></a>`);
      else if (F.length >= 2 && B.length) T4.push(c => `<div class="bt-t bt-bd ${c}"><ul>${B.map(b => `<li>${u.ic('check', 16)}<span>${E(b)}</span></li>`).join('')}</ul></div>`);
      const ah = p2 || u.clsHref(s); if (ah) T4.push(c => `<a class="bt-t bt-go ${c}" ${u.aAttr(ah)}><span class="bt-gi">${u.ic(p2 ? 'chat' : 'grid', 22)}</span><b>${E(p2 ? (d.cta2 || '문의하기') : `${u.term('cls')} 전체 보기`)}</b>${u.ic('arrow', 22)}</a>`);
      const sp = T4.length === 3 ? ['s6', 's3', 's3'] : T4.length === 2 ? ['s8', 's4'] : ['s12'];
      return `<section class="hpt hpl-hero bt-hero"><div class="hpl-w"><div class="bt-g">${main.replace(' R"', r3 ? ' r3"' : ' r2"')}${pic}${r3}${T4.map((f, k) => f(sp[k])).join('')}</div></div></section>`; },
    sec: {
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx); const n = L.length;
        const card = (c, k) => { const big = k === 0 && n >= 2; const sp = n === 1 ? 's12' : big ? 's7 r2' : k <= 2 ? 's5' : ((n - 3) % 2 === 1 && k === n - 1) ? 's12' : 's6';
          return `<a class="bt-t bt-cc ${sp}${big ? ' big' : ''}" href="#p-c-${E(c.id)}">${big || n === 1 ? H.fig('cls-' + c.id, s, th, T, { ratio: '16/9', cls: 'bt-cf', scene: 'class' }) : `<span class="bt-ci">${u.ic(u.icOf(c.name, k), 22)}</span>`}<div class="bt-cb"><span class="bt-k">${E(u.kindOf(c))}</span><h3>${E(c.name)}</h3><p class="bt-m">${meta(c).slice(1).map(m => `<span>${E(m)}</span>`).join('')}</p><p class="bt-pr"><b>${E(u.priceOf(c))}</b>${u.ic('arrow', 18)}</p></div></a>`; };
        return SEC('bt-sec bt-cls', ctx, `<div class="bt-g">${`<div class="bt-t bt-head s12">${secHead(d, 'bt-hh')}${allLink(s, n, 'bt-all')}</div>`}${L.map(card).join('')}</div>`); },
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null; const sp = bSpan(C.length);
        return SEC('bt-sec bt-feat', ctx, `<div class="bt-g"><div class="bt-t bt-head s12">${secHead(d, 'bt-hh')}</div>${C.map(([a, b], k) => `<article class="bt-t bt-f s${sp[k]}${k === 0 ? ' dk' : k === 3 ? ' ac' : ''}"><span class="bt-fi">${u.ic(u.icOf(a + ' ' + b, k), 24)}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div>`); },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null; const n = Math.min(C.length, 4);
        return SEC('bt-sec bt-steps', ctx, `<div class="bt-g"><div class="bt-t bt-head s12">${secHead(d, 'bt-hh')}</div>${C.map(([a, b], k) => `<article class="bt-t bt-st s${12 / n | 0}"><span class="bt-no" aria-hidden="true">${k + 1}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div>`); },
      stats(s, d, th, T, ctx) { let F = factsOf(d); if (F.length < 2) return hintS(ctx, '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        /* 첫 화면 칸이 실제 숫자 앞 2개를 이미 보여 주면 나머지만 */ if (d.hpt === 'facts' || !u.cols(d).length) { const hasHero = ((s.sections || []).find(x => x && x.type === 'banner' && !x.hide)); if (hasHero) F = F.slice(2); if (F.length < 2) return ''; }
        return `<section class="hpt hpl-s bt-sec bt-facts"><div class="hpl-w"><div class="bt-g">${F.map(f => `<div class="bt-t bt-fact s${12 / F.length | 0}"><b>${fnum(f)}</b><span>${E(f.l)}</span></div>`).join('')}</div></div></section>`; },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); const h = u.askHref(s); if (!d.title && !I.length) return null;
        const b = d.cta && h ? `<a class="hpl-btn inv" ${u.aAttr(h)}><span>${E(d.cta)}</span>${u.ic('arrow', 18)}</a>` : '';
        return `<section class="hpt hpl-s bt-sec bt-cta"><div class="hpl-w"><div class="bt-g"><div class="bt-t bt-cm ${I.length ? 's8' : 's12'}">${d.eyebrow ? `<p class="bt-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : ''}${b}</div>${I.length ? `<div class="bt-cis s4">${I.map(c => `<div class="bt-t bt-c1"><span class="bt-fi">${u.ic(c.ic, 20)}</span><div><small>${E(c.k)}</small>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</div></div>`).join('')}</div>` : ''}</div></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-bento'; const px = pxf(th); const R = `max(12px,calc(var(--r) + 6px))`; const dk = T.hd; const dm = T.D.hm; const lnc = u.al(T.ink, .08);
      return `${P}{font-family:var(--hpl-sans)}${P}.hpl-s{padding:clamp(20px,3vw,32px) 0;background:var(--bg)}${P}.hpl-s.is-alt{background:var(--bg)}
${P} .bt-g{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:${px(14)};grid-auto-flow:row dense}
${P} .bt-t{border-radius:${R};background:var(--alt);padding:clamp(20px,2.4vw,32px);position:relative;overflow:hidden;min-width:0;display:flex;flex-direction:column;gap:10px;color:var(--ink)}
${P} .s2b{grid-column:span 2}${P} .s3b{grid-column:span 3}${P} .s3{grid-column:span 3}${P} .s4{grid-column:span 4}${P} .s5{grid-column:span 5}${P} .s6{grid-column:span 6}${P} .s7{grid-column:span 7}${P} .s8{grid-column:span 8}${P} .s12{grid-column:1/-1}${P} .r2{grid-row:span 2}${P} .r3{grid-row:span 3}
${P}.bt-hero{padding:clamp(16px,2.4vw,28px) 0 clamp(8px,1.6vw,16px);background:var(--bg)}
${P} .bt-main{background:var(--as);justify-content:flex-end;padding:clamp(28px,4vw,56px);min-height:${px(440)}}
${P} .bt-ey{margin:0 0 4px;font-size:${px(14)};font-weight:700;color:${T.L.hy}}
${P} .bt-main h1{margin:0;font-size:clamp(${px(34)},4.4vw,${px(62)});line-height:1.12;letter-spacing:-.04em;font-weight:850;color:${T.L.hi}}
${P} .bt-sub{margin:8px 0 0;font-size:${px(17)};line-height:1.7;color:${T.L.hm};max-width:44ch}${P} .bt-act{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
${P} .hpl-btn.gh{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1px ${u.al(T.ink, .18)}}${P} .hpl-btn.inv{background:#fff;color:${u.fit(T.a, '#ffffff', 4.6)};align-self:flex-start;margin-top:10px}
${P} .bt-pic{padding:0;min-height:${px(260)};background:var(--as)}
${P} .bt-fact{background:var(--alt);justify-content:space-between;min-height:${px(150)}}${P} .bt-fact b{font-size:clamp(${px(36)},4vw,${px(56)});font-weight:850;line-height:1;letter-spacing:-.04em;color:var(--at)}${P} .bt-fact b small{font-size:.4em;margin-left:4px;color:var(--mu);font-weight:700}${P} .bt-fact span{color:var(--mu);font-size:${px(14)}}
${P} .bt-bd ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}${P} .bt-bd li{display:flex;align-items:center;gap:10px;font-weight:650}${P} .bt-bd li svg{color:var(--at)}
${P} .bt-cls{background:${dk};color:#fff;justify-content:space-between;min-height:${px(200)}}${P} .bt-cls h2{margin:0;color:#fff;font-size:${px(24)};line-height:1.3;letter-spacing:-.02em;font-weight:800}${P} .bt-cls .bt-k{color:${T.D.hy}}${P} .bt-cls .bt-m{color:${dm}}${P} .bt-cls .bt-pr{color:#fff}
${P} .bt-cls2{background:#fff;box-shadow:inset 0 0 0 1px ${lnc};justify-content:space-between}${P} .bt-cls2 h2{margin:0;font-size:${px(19)};line-height:1.35;font-weight:800;color:var(--ink)}
${P} .bt-go{background:var(--a);color:var(--on);justify-content:space-between}${P} .bt-go b{font-size:${px(20)};font-weight:800;line-height:1.3}${P} .bt-go .bt-gl{font-size:${px(20)};font-weight:800;margin-top:-10px}${P} .bt-go>svg:last-child{align-self:flex-end}${P} .bt-gi{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:${u.al(T.on, .14)}}
${P} .bt-k{font-size:${px(12.5)};font-weight:800;color:var(--at)}${P} .bt-m{display:flex;flex-wrap:wrap;gap:4px 12px;margin:0;font-size:${px(13.5)};color:var(--mu)}${P} .bt-pr{display:flex;align-items:center;justify-content:space-between;margin:auto 0 0;padding-top:8px}${P} .bt-pr b{font-size:${px(18)};font-weight:800}
${P} .bt-head{background:transparent;padding:clamp(28px,4vw,48px) 4px 6px;flex-direction:row;align-items:flex-end;justify-content:space-between;gap:20px}${P} .bt-hh .hpl-ey{margin:0 0 8px;font-size:${px(14)};font-weight:700;color:var(--at)}${P} .bt-hh h2{margin:0;font-size:clamp(${px(28)},3.2vw,${px(42)});letter-spacing:-.035em;line-height:1.2;font-weight:850}${P} .hpl-sd{margin:10px 0 0;color:var(--mu);max-width:56ch;line-height:1.7}
${P} .bt-all{display:inline-flex;align-items:center;gap:6px;font-weight:750;color:var(--at);white-space:nowrap}
${P} .bt-cc{background:#fff;box-shadow:inset 0 0 0 1px ${lnc};padding:0;transition:box-shadow .15s}${P} .bt-cc:hover{box-shadow:inset 0 0 0 2px ${u.al(T.a, .5)}}${P} .bt-cc .bt-cb{padding:clamp(18px,2vw,26px);display:flex;flex-direction:column;gap:8px;flex:1}${P} .bt-cc h3{margin:0;font-size:${px(19)};line-height:1.35;letter-spacing:-.02em;font-weight:800}${P} .bt-cc.big h3{font-size:clamp(${px(22)},2.2vw,${px(30)})}
${P} .bt-cf{aspect-ratio:16/9;flex:none}${P} .bt-cc.big .bt-cf{aspect-ratio:auto;flex:1;min-height:${px(220)}}${P} .bt-ci{margin:clamp(18px,2vw,26px) clamp(18px,2vw,26px) 0;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--as);color:var(--at)}
${P} .bt-f{min-height:${px(200)};justify-content:flex-end}${P} .bt-f h3{margin:0;font-size:${px(21)};font-weight:800;letter-spacing:-.02em;line-height:1.35}${P} .bt-f p{margin:0;color:var(--mu);line-height:1.65}${P} .bt-fi{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#fff;color:var(--at);margin-bottom:auto}
${P} .bt-f.dk{background:${dk};color:#fff}${P} .bt-f.dk h3{color:#fff}${P} .bt-f.dk p{color:${dm}}${P} .bt-f.dk .bt-fi{background:${u.al('#ffffff', .1)};color:#fff}
${P} .bt-f.ac{background:var(--a);color:var(--on)}${P} .bt-f.ac h3,${P} .bt-f.ac p{color:var(--on)}${P} .bt-f.ac .bt-fi{background:${u.al(T.on, .14)};color:var(--on)}
${P} .bt-st{background:var(--alt)}${P} .bt-no{font-size:${px(56)};font-weight:850;line-height:1;color:${u.fit(u.mix(T.a, '#ffffff', .25), T.alt, 4.6)};letter-spacing:-.05em}${P} .bt-st h3{margin:12px 0 0;font-size:${px(19)};font-weight:800}${P} .bt-st p{margin:0;color:var(--mu);line-height:1.65}
${P}.bt-cta{padding-bottom:clamp(40px,6vw,72px)}${P} .bt-cm{background:${u.fit(T.a, '#ffffff', 4.8, '#000000')};color:#fff;padding:clamp(28px,4vw,56px);justify-content:center}${P} .bt-cm h2{margin:0;color:#fff;font-size:clamp(${px(28)},3.4vw,${px(44)});line-height:1.2;letter-spacing:-.035em;font-weight:850}${P} .bt-cm p{margin:0;color:#fff;font-size:${px(16.5)};line-height:1.7;max-width:50ch}${P} .bt-cm .bt-ey{color:#fff}
${P} .bt-cis{display:flex;flex-direction:column;gap:${px(14)}}${P} .bt-c1{flex-direction:row;align-items:center;gap:14px;flex:1}${P} .bt-c1 small{display:block;color:var(--mu);font-size:${px(13)}}${P} .bt-c1 b,${P} .bt-c1 a{font-weight:800;font-size:${px(16.5)};overflow-wrap:anywhere}
${baseFix(P, { hw: 850, hl: '-.035em', card: `border-radius:${R};box-shadow:none;border:0;background:var(--alt)` })}
${P}.gf{background:var(--bg);color:var(--mu);padding:0 0 28px}${P}.gf .wrap{background:var(--alt);border-radius:${R};padding:32px clamp(20px,3vw,40px);max-width:calc(1200px - 2 * var(--hpl-gut));margin:0 auto}${P}.gf b{color:var(--ink)}${P}.gf .fl2,${P}.gf .fl2 a{color:var(--ink)}
@media(max-width:900px){${P} .s5,${P} .s7,${P} .s8,${P} .s4{grid-column:1/-1}${P} .s3,${P} .s3b,${P} .s2b,${P} .s6{grid-column:span 6}${P} .r2,${P} .r3{grid-row:auto}${P} .bt-main{min-height:0}${P} .bt-pic{min-height:0;aspect-ratio:4/3}${P} .bt-cc.big .bt-cf{aspect-ratio:16/9;flex:none;min-height:0}${P} .bt-cis{flex-direction:column}}
@media(max-width:640px){${P} .bt-g{gap:10px}${P} .s3,${P} .s3b,${P} .s2b,${P} .s6{grid-column:1/-1}${P} .bt-fact{grid-column:span 6;min-height:0}${P} .bt-main h1{font-size:${px(32)}}${P} .bt-act .hpl-btn{flex:1 1 auto}${P} .bt-head{flex-direction:column;align-items:flex-start;padding:28px 2px 2px}${P} .bt-f{min-height:0}${P} .bt-cc{flex-direction:row}${P} .bt-cc .bt-cf{display:none}${P} .bt-ci{margin:18px 0 0 16px;flex:none}${P} .bt-cc .bt-cb{padding:16px}}`; }
  });

  /* ─────────── 3. fullbleed · 전체 화면 사진 ─────────── */
  H.reg('fullbleed', { name: '전체 화면 사진', by: 'D1', desc: '화면을 가득 채운 사진 위 아래 정렬 큰 제목 · 세로 사진 카드 · 어두운 소개 띠', fits: ['adult', 'univ', 'lifelong', 'voc', 'k12'],
    order: ['banner', 'features', 'classes', 'stats', 'reviews', 'steps', 'faq', 'cta'], slots: ['hero', 'cls-*', 'cta'],
    hero(s, d, th, T) { const B = u.badges();
      return `<section class="hpt hpl-hero fb-hero">${H.fig('hero', s, th, T, { d, cls: 'fb-bg', scene: 'hero', ratio: '16/9' })}<div class="fb-scrim" aria-hidden="true"></div><div class="hpl-w fb-in">${d.eyebrow ? `<p class="fb-ey">${E(d.eyebrow)}</p>` : ''}<h1 class="fb-h1">${u.h1(d)}</h1>
<div class="fb-row">${d.sub ? `<p class="fb-sub">${E(d.sub)}</p>` : '<span></span>'}<div class="fb-act">${btn1(s, d, 'hpl-btn wh')}${btn2(s, d, 'hpl-btn ol')}</div></div>${B.length ? `<ul class="fb-bd">${B.map(b => `<li>${E(b)}</li>`).join('')}</ul>` : ''}</div></section>`; },
    sec: {
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx);
        return SEC('fb-cls', ctx, `<div class="fb-sh">${secHead(d, 'fb-hh')}${allLink(s, L.length, 'fb-all')}</div><div class="fb-rail n${Math.min(L.length, 4)}" role="list">${L.map((c, k) => `<a class="fb-card" role="listitem" href="#p-c-${E(c.id)}">${H.fig('cls-' + c.id, s, th, T, { ratio: '3/4', scene: 'class' })}<span class="fb-cs" aria-hidden="true"></span><div class="fb-cb"><span class="fb-k">${E(u.kindOf(c))}</span><h3>${E(c.name)}</h3><p>${meta(c).slice(1).map(m => `<span>${E(m)}</span>`).join('')}<span>${E(u.priceOf(c))}</span></p></div></a>`).join('')}</div>`); },
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return `<section class="hpt hpl-s fb-feat"><div class="hpl-w"><div class="fb-fh">${d.eyebrow ? `<p class="hpl-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${d.sub ? `<p class="hpl-sd">${E(d.sub)}</p>` : typeof d.body === 'string' && d.body ? `<p class="hpl-sd">${E(d.body)}</p>` : ''}</div><div class="fb-fl n${Math.min(C.length, 4)}">${C.map(([a, b], k) => `<article><span class="fb-fi">${u.ic(u.icOf(a + ' ' + b, k), 22)}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div></div></section>`; },
      plain(s, d, th, T, ctx) { if (u.cols(d).length) return this.features(s, d, th, T, ctx); return null; },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); const h = u.askHref(s); if (!d.title && !I.length) return null;
        const b = d.cta && h ? `<a class="hpl-btn wh" ${u.aAttr(h)}><span>${E(d.cta)}</span>${u.ic('arrow', 18)}</a>` : '';
        return `<section class="hpt hpl-s fb-cta">${H.fig('cta', s, th, T, { cls: 'fb-bg', scene: 'cta', ratio: '16/9' })}<div class="fb-scrim c" aria-hidden="true"></div><div class="hpl-w fb-ci">${d.eyebrow ? `<p class="fb-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p class="fb-sub">${E(d.body)}</p>` : ''}${b ? `<div class="fb-act c">${b}</div>` : ''}${I.length ? `<ul class="fb-cl">${I.map(c => `<li><small>${E(c.k)}</small>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</li>`).join('')}</ul>` : ''}</div></section>`; },
      stats(s, d, th, T, ctx) { const F = factsOf(d); if (F.length < 2) return hintS(ctx, '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        return `<section class="hpt hpl-s fb-facts"><div class="hpl-w"><ul class="fb-nl n${F.length}">${F.map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-fullbleed'; const px = pxf(th); const dk = T.hd; const dm = T.D.hm; const sc = 'linear-gradient(0deg,rgba(0,0,0,.86) 0%,rgba(0,0,0,.72) 46%,rgba(0,0,0,.56) 72%,rgba(0,0,0,.3) 100%)';
      return `${P}{font-family:var(--hpl-sans)}${P}.hpl-s{padding:clamp(56px,8vw,${px(104)}) 0;background:var(--bg)}${P}.hpl-s.is-alt{background:var(--alt)}
${P}.fb-hero{position:relative;min-height:min(90vh,${px(880)});display:flex;align-items:flex-end;background:${dk};color:#fff;overflow:hidden;padding:0}
${P} .fb-bg{position:absolute!important;inset:0;aspect-ratio:auto!important;background:${dk}}${P} .fb-scrim{position:absolute;inset:0;background:${sc};pointer-events:none}${P} .fb-scrim.c{background:rgba(0,0,0,.66)}
${P} .fb-in{position:relative;z-index:1;width:100%;padding-top:${px(140)};padding-bottom:clamp(36px,5vw,64px);text-shadow:0 1px 18px rgba(0,0,0,.35)}
${P} .fb-ey{margin:0 0 18px;font-size:${px(15)};font-weight:700;color:#fff}
${P} .fb-h1{margin:0;max-width:18ch;font-size:clamp(${px(42)},7vw,${px(104)});line-height:1.04;letter-spacing:-.045em;font-weight:850;color:#fff}
${P} .fb-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px 40px;align-items:end;margin-top:clamp(28px,4vw,48px);padding-top:24px;border-top:1px solid rgba(255,255,255,.4)}
${P} .fb-sub{margin:0;max-width:46ch;font-size:${px(18)};line-height:1.7;color:#fff}${P} .fb-act{display:flex;flex-wrap:wrap;gap:10px}${P} .fb-act.c{justify-content:center;margin-top:28px}
${P} .hpl-btn.wh{background:#fff;color:#111;text-shadow:none}${P} .hpl-btn.wh:hover{background:${T.as}}${P} .hpl-btn.ol{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.8);color:#fff;text-shadow:none}${P} .hpl-btn.ol:hover{background:rgba(255,255,255,.12)}
${P} .fb-bd{display:flex;flex-wrap:wrap;gap:6px 22px;list-style:none;margin:20px 0 0;padding:0;font-size:${px(14)};color:#fff}${P} .fb-bd li::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#fff;margin-right:8px;vertical-align:middle}
${P} .fb-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:32px}${P} .fb-hh .hpl-ey,${P} .fb-fh .hpl-ey{margin:0 0 10px;font-size:${px(14)};font-weight:700;color:var(--at)}${P} .fb-hh h2{margin:0;font-size:clamp(${px(30)},4vw,${px(52)});line-height:1.15;letter-spacing:-.04em;font-weight:850}${P} .hpl-sd{margin:12px 0 0;color:var(--mu);line-height:1.7;max-width:54ch}
${P} .fb-all{display:inline-flex;align-items:center;gap:6px;font-weight:750;white-space:nowrap;border-bottom:1.5px solid currentColor;padding-bottom:2px}
${P} .fb-rail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}${P} .fb-rail.n1{grid-template-columns:minmax(0,1fr);max-width:520px}${P} .fb-rail.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-rail.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
${P} .fb-card{position:relative;display:block;border-radius:var(--r);overflow:hidden;aspect-ratio:3/4;background:${dk};isolation:isolate}${P} .fb-card .hpl-img{position:absolute;inset:0;aspect-ratio:auto!important;transition:transform .5s}${P} .fb-card:hover .hpl-img{transform:scale(1.03)}
${P} .fb-cs{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.7) 34%,rgba(0,0,0,0) 66%)}${P} .fb-cb{position:absolute;left:0;right:0;bottom:0;padding:22px;color:#fff;display:flex;flex-direction:column;gap:8px}
${P} .fb-k{align-self:flex-start;font-size:${px(12)};font-weight:800;background:rgba(0,0,0,.55);padding:4px 10px;border-radius:999px;color:#fff}${P} .fb-cb h3{margin:0;color:#fff;font-size:${px(21)};line-height:1.3;font-weight:800;letter-spacing:-.02em}${P} .fb-cb p{margin:0;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:${px(13.5)};color:#fff}
${P}.fb-feat{background:${dk};color:#fff}${P} .fb-fh{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:12px 56px;align-items:end;padding-bottom:clamp(32px,4vw,56px);border-bottom:1px solid rgba(255,255,255,.22)}${P} .fb-fh .hpl-ey{grid-column:1/-1;color:${T.D.hy}}
${P} .fb-fh h2{margin:0;color:#fff;font-size:clamp(${px(30)},4.4vw,${px(58)});line-height:1.15;letter-spacing:-.04em;font-weight:850}${P} .fb-fh .hpl-sd{color:${dm};margin:0}
${P} .fb-fl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}${P} .fb-fl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-fl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .fb-fl.n1{grid-template-columns:1fr}
${P} .fb-fl article{padding:clamp(24px,3vw,40px) clamp(16px,2vw,28px) 0 0}${P} .fb-fl article+article{border-left:1px solid rgba(255,255,255,.22);padding-left:clamp(16px,2vw,28px)}${P} .fb-fi{display:inline-grid;place-items:center;color:${T.D.ha};margin-bottom:18px}${P} .fb-fl h3{margin:0 0 8px;color:#fff;font-size:${px(20)};font-weight:800;letter-spacing:-.02em}${P} .fb-fl p{margin:0;color:${dm};line-height:1.7;font-size:${px(15)}}
${P}.fb-cta{position:relative;overflow:hidden;background:${dk};color:#fff;text-align:center;padding:clamp(80px,12vw,${px(160)}) 0}${P} .fb-ci{position:relative;z-index:1}${P} .fb-ci h2{margin:0 auto;max-width:18ch;color:#fff;font-size:clamp(${px(32)},5vw,${px(64)});line-height:1.12;letter-spacing:-.04em;font-weight:850}${P} .fb-ci .fb-sub{margin:16px auto 0}
${P} .fb-cl{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 40px;list-style:none;margin:36px 0 0;padding:0}${P} .fb-cl small{display:block;font-size:${px(12.5)};color:#fff;opacity:.9}${P} .fb-cl b,${P} .fb-cl a{font-weight:750;color:#fff}
${P}.fb-facts{padding:clamp(40px,5vw,64px) 0}${P} .fb-nl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}${P} .fb-nl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-nl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .fb-nl li{border-top:3px solid var(--ink);padding-top:14px;display:flex;flex-direction:column;gap:6px}${P} .fb-nl b{font-size:clamp(${px(40)},5vw,${px(68)});font-weight:850;line-height:1;letter-spacing:-.05em}${P} .fb-nl b small{font-size:.38em;margin-left:4px}${P} .fb-nl span{color:var(--mu)}
${baseFix(P, { hw: 850, hl: '-.04em' })}
${P}.gf{background:${dk};color:${dm}}${P}.gf b{color:#fff}${P}.gf .fl2,${P}.gf .fl2 a{color:#fff}
@media(max-width:900px){${P} .fb-rail,${P} .fb-rail.n3,${P} .fb-rail.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-fh{grid-template-columns:1fr}${P} .fb-fl,${P} .fb-fl.n3{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-fl article:nth-child(odd){border-left:0;padding-left:0}${P} .fb-nl{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){${P}.fb-hero{min-height:${px(640)}}${P} .fb-in{padding-top:${px(120)}}${P} .fb-h1{font-size:${px(40)};line-height:1.1}${P} .fb-row{grid-template-columns:1fr}${P} .fb-act .hpl-btn{flex:1 1 auto}${P} .fb-sub{font-size:${px(16)}}
${P} .fb-sh{display:block}${P} .fb-sh .fb-all{margin-top:14px}${P} .fb-rail,${P} .fb-rail.n2,${P} .fb-rail.n3{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;margin:0 calc(var(--hpl-gut) * -1);padding:0 var(--hpl-gut) 6px;scrollbar-width:none}${P} .fb-rail::-webkit-scrollbar{display:none}${P} .fb-card{flex:0 0 76%;scroll-snap-align:start}${P} .fb-rail.n1 .fb-card{flex-basis:100%}
${P} .fb-fl,${P} .fb-fl.n2,${P} .fb-fl.n3{grid-template-columns:1fr}${P} .fb-fl article,${P} .fb-fl article+article{border-left:0;padding:22px 0 0;border-top:1px solid rgba(255,255,255,.18);margin-top:22px}${P} .fb-fl article:first-child{border-top:0;margin-top:0}${P} .fb-cl{flex-direction:column;gap:14px}}`; }
  });

  /* ─────────── 4. splitscreen · 좌우 분할 ─────────── */
  H.reg('splitscreen', { name: '좌우 분할', by: 'D1', desc: '좌우 50:50 전체 높이 첫 화면 · 왼쪽 고정 제목과 목록 · 지그재그 강좌', fits: ['adult', 'univ', 'corp', 'lifelong', 'public'],
    order: ['banner', 'features', 'classes', 'steps', 'reviews', 'faq', 'cta'], slots: ['hero', 'cls-*'],
    hero(s, d, th, T) { const F = u.facts().slice(0, 3);
      return `<section class="hpt hpl-hero sp-hero"><div class="sp-txt"><div class="sp-in">${d.eyebrow ? `<p class="sp-ey">${E(d.eyebrow)}</p>` : ''}<h1>${u.h1(d)}</h1>${d.sub ? `<p class="sp-sub">${E(d.sub)}</p>` : ''}<div class="sp-act">${btn1(s, d)}${btn2(s, d, 'sp-link')}</div></div>${F.length >= 2 ? `<ul class="sp-facts n${F.length}">${F.map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul>` : ''}</div>${H.fig('hero', s, th, T, { d, cls: 'sp-fig', scene: 'hero', ratio: '4/5' })}</section>`; },
    sec: {
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('sp-feat', ctx, `<div class="sp-two"><div class="sp-stick">${secHead(d, 'sp-hh')}</div><ul class="sp-list">${C.map(([a, b], k) => `<li><span class="sp-fi">${u.ic(u.icOf(a + ' ' + b, k), 22)}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></li>`).join('')}</ul></div>`); },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('sp-steps', ctx, `<div class="sp-two"><div class="sp-stick">${secHead(d, 'sp-hh')}</div><ol class="sp-ol">${C.map(([a, b], k) => `<li><span class="sp-no" aria-hidden="true">${k + 1}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></li>`).join('')}</ol></div>`); },
      classes(s, d, th, T, ctx) { const L = u.clsList(d).slice(0, 4); if (!L.length) return noCls(ctx);
        return `<section class="hpt hpl-s sp-cls${ctx.alt ? ' is-alt' : ''}"><div class="hpl-w"><div class="sp-sh">${secHead(d, 'sp-hh')}${allLink(s, L.length, 'sp-link')}</div></div><div class="sp-rows">${L.map((c, k) => `<a class="sp-row${k % 2 ? ' rev' : ''}" href="#p-c-${E(c.id)}">${H.fig('cls-' + c.id, s, th, T, { ratio: '4/3', scene: 'class' })}<div class="sp-rb"><span class="sp-k">${E(u.kindOf(c))}</span><h3>${E(c.name)}</h3>${descOf(c) ? `<p class="sp-d">${E(descOf(c))}</p>` : ''}<dl class="sp-dl">${u.perOf(c) ? `<div><dt>기간</dt><dd>${E(u.perOf(c))}</dd></div>` : ''}${u.lesOf(c) ? `<div><dt>차시</dt><dd>${u.lesOf(c)}차시</dd></div>` : ''}<div><dt>수강료</dt><dd>${E(u.priceOf(c))}</dd></div></dl><span class="sp-more">자세히 보기 ${u.ic('arrow', 18)}</span></div></a>`).join('')}</div></section>`; },
      stats(s, d, th, T, ctx) { /* 첫 화면 아래 줄이 실제 숫자 3개를 이미 보여 주면 나머지만, 2개 미만이면 숨김 */
        if (!(d.hpt === 'facts' || !u.cols(d).length)) return null; const hasHero = (s.sections || []).some(x => x && x.type === 'banner' && !x.hide); if (!hasHero) return null;
        const F = u.facts().slice(3); if (F.length < 2) return ctx.edit ? hintS(ctx, '실제 숫자는 첫 화면 아래 줄에 표시됩니다.') : ''; return null; },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); const h = u.askHref(s); if (!d.title && !I.length) return null;
        const b = d.cta && h ? `<a class="hpl-btn inv" ${u.aAttr(h)}><span>${E(d.cta)}</span>${u.ic('arrow', 18)}</a>` : '';
        return `<section class="hpt hpl-s sp-cta"><div class="sp-cg${I.length ? '' : ' one'}"><div class="sp-cl">${d.eyebrow ? `<p class="sp-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : ''}${b}</div>${I.length ? `<ul class="sp-cr">${I.map(c => `<li><small>${E(c.k)}</small>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</li>`).join('')}</ul>` : ''}</div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-splitscreen'; const px = pxf(th); const ln = u.al(T.ink, .12); const ca = u.fit(T.a, '#ffffff', 4.8, '#000000');
      return `${P}{font-family:var(--hpl-sans)}${P}.hpl-s{padding:clamp(56px,8vw,${px(112)}) 0;background:var(--bg)}${P}.hpl-s.is-alt{background:var(--alt)}
${P}.sp-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:min(88vh,${px(860)});background:var(--as);padding:0}
${P} .sp-txt{display:flex;flex-direction:column;justify-content:space-between;gap:48px;padding:clamp(48px,6vw,96px) clamp(24px,5vw,80px) clamp(32px,4vw,56px)}${P} .sp-in{margin:auto 0;max-width:560px}
${P} .sp-ey{margin:0 0 20px;font-size:${px(14)};font-weight:700;color:${T.L.hy};display:flex;align-items:center;gap:12px}${P} .sp-ey::before{content:'';width:28px;height:2px;background:currentColor}
${P}.sp-hero h1{margin:0;font-size:clamp(${px(36)},4.4vw,${px(66)});line-height:1.12;letter-spacing:-.04em;font-weight:850;color:${T.L.hi}}
${P} .sp-sub{margin:22px 0 0;font-size:${px(17.5)};line-height:1.75;color:${T.L.hm}}${P} .sp-act{display:flex;flex-wrap:wrap;align-items:center;gap:14px 24px;margin-top:32px}
${P} .sp-link{display:inline-flex;align-items:center;gap:6px;font-weight:750;color:var(--ink);border-bottom:1.5px solid currentColor;padding-bottom:2px;white-space:nowrap}
${P} .sp-facts{list-style:none;margin:0;padding:22px 0 0;border-top:1px solid ${u.al(T.ink, .16)};display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}${P} .sp-facts.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .sp-facts b{display:block;font-size:${px(30)};font-weight:850;letter-spacing:-.04em;color:${T.L.ha};line-height:1.1}${P} .sp-facts b small{font-size:.5em;margin-left:3px}${P} .sp-facts span{font-size:${px(13.5)};color:${T.L.hm}}
${P} .sp-fig{aspect-ratio:auto!important;min-height:100%}
${P} .sp-two{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:32px 72px;align-items:start}${P} .sp-stick{position:sticky;top:32px}
${P} .sp-hh .hpl-ey{margin:0 0 12px;font-size:${px(14)};font-weight:700;color:var(--at)}${P} .sp-hh h2{margin:0;font-size:clamp(${px(30)},3.6vw,${px(48)});line-height:1.18;letter-spacing:-.04em;font-weight:850}${P} .hpl-sd{margin:16px 0 0;color:var(--mu);line-height:1.75;max-width:44ch}
${P} .sp-list,${P} .sp-ol{list-style:none;margin:0;padding:0;border-top:1px solid ${ln}}${P} .sp-list li,${P} .sp-ol li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:20px;padding:28px 0;border-bottom:1px solid ${ln}}
${P} .sp-fi{width:52px;height:52px;border-radius:calc(var(--r) * .8);display:grid;place-items:center;background:var(--as);color:var(--at)}${P}.is-alt .sp-fi{background:#fff}
${P} .sp-list h3,${P} .sp-ol h3{margin:0 0 6px;font-size:${px(20)};font-weight:800;letter-spacing:-.02em}${P} .sp-list p,${P} .sp-ol p{margin:0;color:var(--mu);line-height:1.7}
${P} .sp-no{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 1.5px var(--ink);font-weight:800;font-size:${px(18)}}
${P}.sp-cls{padding-bottom:0}${P} .sp-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:clamp(32px,4vw,56px)}
${P} .sp-rows{display:flex;flex-direction:column}${P} .sp-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:${px(420)}}${P} .sp-row .hpl-img{aspect-ratio:auto!important;min-height:100%}${P} .sp-row.rev .hpl-img{order:2}
${P} .sp-rb{display:flex;flex-direction:column;justify-content:center;gap:12px;padding:clamp(32px,5vw,80px);background:var(--alt)}${P}.is-alt .sp-rb{background:var(--bg)}
${P} .sp-k{font-size:${px(13)};font-weight:800;color:var(--at)}${P} .sp-rb h3{margin:0;font-size:clamp(${px(24)},2.6vw,${px(36)});line-height:1.25;letter-spacing:-.03em;font-weight:850}${P} .sp-d{margin:0;color:var(--mu);line-height:1.75;max-width:46ch}
${P} .sp-dl{display:flex;flex-wrap:wrap;gap:12px 32px;margin:10px 0 0}${P} .sp-dl dt{font-size:${px(12.5)};color:var(--mu)}${P} .sp-dl dd{margin:2px 0 0;font-weight:750}${P} .sp-more{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-weight:750;color:var(--at)}${P} .sp-row:hover h3{text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:2px}
${P}.sp-cta{padding:0}${P} .sp-cg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}${P} .sp-cg.one{grid-template-columns:1fr}
${P} .sp-cl{background:${ca};color:#fff;padding:clamp(48px,7vw,104px) clamp(24px,6vw,88px);display:flex;flex-direction:column;align-items:flex-start;gap:16px}${P} .sp-cl .sp-ey{color:#fff}${P} .sp-cl h2{margin:0;color:#fff;font-size:clamp(${px(30)},3.8vw,${px(50)});line-height:1.18;letter-spacing:-.04em;font-weight:850}${P} .sp-cl p{margin:0;color:#fff;line-height:1.7;max-width:46ch}
${P} .hpl-btn.inv{background:#fff;color:${ca};margin-top:12px}
${P} .sp-cr{list-style:none;margin:0;padding:clamp(48px,7vw,104px) clamp(24px,6vw,88px);background:var(--alt);display:flex;flex-direction:column;justify-content:center;gap:0}${P} .sp-cr li{padding:20px 0;border-bottom:1px solid ${ln}}${P} .sp-cr li:first-child{border-top:1px solid ${ln}}${P} .sp-cr small{display:block;color:var(--mu);font-size:${px(13)}}${P} .sp-cr b,${P} .sp-cr a{font-size:${px(20)};font-weight:800;letter-spacing:-.02em;overflow-wrap:anywhere}
${baseFix(P, { hw: 850, hl: '-.04em' })}
${P}.gf{background:var(--ink);color:rgba(255,255,255,.78)}${P}.gf b{color:#fff;font-size:${px(22)}}${P}.gf .fl2,${P}.gf .fl2 a{color:#fff}
@media(max-width:900px){${P}.sp-hero{grid-template-columns:1fr;min-height:0}${P} .sp-fig{order:-1;aspect-ratio:4/3!important;min-height:0}${P} .sp-two{grid-template-columns:1fr}${P} .sp-stick{position:static}${P} .sp-row{grid-template-columns:1fr;min-height:0}${P} .sp-row .hpl-img{aspect-ratio:16/10!important;min-height:0}${P} .sp-row.rev .hpl-img{order:0}${P} .sp-cg{grid-template-columns:1fr}}
@media(max-width:640px){${P} .sp-txt{padding:36px var(--hpl-gut) 28px;gap:32px}${P}.sp-hero h1{font-size:${px(32)};line-height:1.2}${P} .sp-sub{font-size:${px(16)}}${P} .sp-act .hpl-btn{flex:1 1 auto}${P} .sp-facts b{font-size:${px(24)}}${P} .sp-sh{display:block}${P} .sp-sh .sp-link{margin-top:14px}${P} .sp-rb{padding:28px var(--hpl-gut) 36px}${P} .sp-list li,${P} .sp-ol li{gap:14px;padding:20px 0}${P} .sp-fi,${P} .sp-no{width:44px;height:44px}${P} .sp-cl,${P} .sp-cr{padding:44px var(--hpl-gut)}}`; }
  });

  /* ─────────── 5. typo · 큰 글자 ─────────── */
  H.reg('typo', { name: '큰 글자', by: 'D1', desc: '사진 없이 초대형 글자와 넓은 여백 · 큰 글자 목록 강좌 · 초대형 숫자', fits: ['adult', 'corp', 'univ', 'k12', 'voc'],
    order: ['banner', 'stats', 'classes', 'features', 'reviews', 'steps', 'faq', 'cta'], slots: [],
    hero(s, d, th, T) { const B = u.badges(); const m = lineMax(d); const mx = Math.max(56, Math.min(152, Math.floor(1120 / m))); const vw = (mx / 12.4).toFixed(2); const mb = Math.max(36, Math.min(64, Math.floor(330 / m)));
      return `<section class="hpt hpl-hero ty-hero" style="--ty-fs:clamp(${mb}px,${vw}vw,${mx}px);--ty-fm:${mb}px"><div class="hpl-w"><div class="ty-top">${d.eyebrow ? `<p class="ty-ey">${E(d.eyebrow)}</p>` : `<p class="ty-ey">${E(S.org.name)}</p>`}${B.length ? `<ul class="ty-bd">${B.map(b => `<li>${E(b)}</li>`).join('')}</ul>` : ''}</div>
<h1 class="ty-h1">${u.h1(d)}</h1><div class="ty-bot"><span class="ty-bar" aria-hidden="true"></span><div>${d.sub ? `<p class="ty-sub">${E(d.sub)}</p>` : ''}<div class="ty-act">${btn1(s, d, 'ty-go')}${btn2(s, d, 'ty-link')}</div></div></div></div></section>`; },
    sec: {
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx);
        return SEC('ty-cls', ctx, `<div class="ty-sh">${secHead(d, 'ty-hh')}${allLink(s, L.length, 'ty-link')}</div><ul class="ty-list">${L.map(c => `<li><a href="#p-c-${E(c.id)}"><b>${E(c.name)}</b><span class="ty-m">${meta(c).map(m => `<span>${E(m)}</span>`).join('')}</span><span class="ty-p">${E(u.priceOf(c))}</span><span class="ty-ar" aria-hidden="true">${u.ic('arrow', 28)}</span></a></li>`).join('')}</ul>`); },
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('ty-feat', ctx, `<div class="ty-two">${secHead(d, 'ty-hh big')}<div class="ty-fl">${C.map(([a, b]) => `<article><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div></div>`); },
      plain(s, d, th, T, ctx) { if (u.cols(d).length) return this.features(s, d, th, T, ctx); if (!d.title && !d.body) return null;
        return SEC('ty-prose', ctx, `${d.eyebrow ? `<p class="hpl-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2 class="ty-big2">${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p class="ty-body">${br(d.body)}</p>` : ''}`); },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('ty-steps', ctx, `${secHead(d, 'ty-hh')}<ol class="ty-ol">${C.map(([a, b], k) => `<li><span class="ty-no" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol>`); },
      stats(s, d, th, T, ctx) { const F = factsOf(d); if (F.length < 2) return hintS(ctx, '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        return `<section class="hpt hpl-s ty-facts"><div class="hpl-w"><ul class="ty-nl n${F.length}">${F.map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul></div></section>`; },
      reviews(s, d, th, T, ctx) { const R = revList(3); if (!R.length) return hintS(ctx, '실제 수강후기가 등록되면 이곳에 표시됩니다.');
        return SEC('ty-rv', ctx, `${secHead(d, 'ty-hh')}<div class="ty-qs">${R.map(r => `<figure><blockquote>${E(String(r.b).slice(0, 150))}</blockquote><figcaption>${stars(r)}<b>${E(r.w)}</b>${r.c ? `<small>${E(r.c)}</small>` : ''}</figcaption></figure>`).join('')}</div>`); },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); const h = u.askHref(s); if (!d.title && !I.length) return null;
        return `<section class="hpt hpl-s ty-cta"><div class="hpl-w">${d.title ? `<h2 class="ty-ct">${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p class="ty-cb">${E(d.body)}</p>` : ''}${d.cta && h ? `<a class="ty-huge" ${u.aAttr(h)}><span>${E(d.cta)}</span>${u.ic('arrow', 64)}</a>` : ''}${I.length ? `<dl class="ty-ci">${I.map(c => `<div><dt>${E(c.k)}</dt><dd>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : E(c.v)}</dd></div>`).join('')}</dl>` : ''}</div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-typo'; const px = pxf(th); const ln = u.al(T.ink, .14);
      return `${P}{font-family:var(--hpl-sans)}${P}.hpl-s{padding:clamp(64px,9vw,${px(128)}) 0;background:var(--bg)}${P}.hpl-s.is-alt{background:var(--alt)}
${P}.ty-hero{background:var(--bg);padding:clamp(24px,3vw,40px) 0 clamp(56px,8vw,112px)}
${P} .ty-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px 32px;flex-wrap:wrap;padding-bottom:clamp(40px,7vw,104px)}${P} .ty-ey{margin:0;font-weight:800;font-size:${px(15)};color:var(--ink)}
${P} .ty-bd{display:flex;flex-wrap:wrap;gap:4px 22px;list-style:none;margin:0;padding:0;font-size:${px(14)};color:var(--mu)}
${P} .ty-h1{margin:0;font-size:var(--ty-fs);line-height:1.02;letter-spacing:-.055em;font-weight:850;color:var(--ink);overflow-wrap:break-word;word-break:keep-all}
${P} .ty-bot{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:24px 48px;margin-top:clamp(40px,6vw,88px);align-items:start}${P} .ty-bar{display:block;width:96px;height:8px;background:var(--a);margin-top:12px}
${P} .ty-sub{margin:0;font-size:clamp(${px(18)},1.8vw,${px(24)});line-height:1.6;color:var(--mu);max-width:36ch;letter-spacing:-.015em}${P} .ty-act{display:flex;flex-wrap:wrap;align-items:center;gap:16px 32px;margin-top:32px}
${P} .ty-go{display:inline-flex;align-items:center;gap:12px;font-size:clamp(${px(22)},2.2vw,${px(30)});font-weight:850;letter-spacing:-.03em;color:var(--ink);border-bottom:4px solid var(--a);padding-bottom:6px}${P} .ty-go:hover{color:var(--at)}
${P} .ty-link{display:inline-flex;align-items:center;gap:6px;font-weight:750;color:var(--ink);border-bottom:1.5px solid currentColor;padding-bottom:2px;white-space:nowrap}
${P} .ty-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px}${P} .ty-hh .hpl-ey,${P} .ty-prose .hpl-ey{margin:0 0 12px;font-weight:800;font-size:${px(14)};color:var(--at)}
${P} .ty-hh h2{margin:0;font-size:clamp(${px(32)},4.4vw,${px(60)});line-height:1.08;letter-spacing:-.05em;font-weight:850}${P} .ty-hh.big h2{font-size:clamp(${px(36)},5.4vw,${px(76)})}${P} .hpl-sd{margin:16px 0 0;color:var(--mu);line-height:1.7;max-width:46ch;font-size:${px(17)}}
${P} .ty-list{list-style:none;margin:0;padding:0;border-bottom:1px solid var(--ink)}${P} .ty-list a{display:grid;grid-template-columns:minmax(0,1fr) auto auto 40px;gap:8px 32px;align-items:center;padding:clamp(22px,3vw,36px) 0;border-top:1px solid var(--ink);transition:color .15s}
${P} .ty-list b{font-size:clamp(${px(24)},3.2vw,${px(44)});font-weight:850;letter-spacing:-.045em;line-height:1.15}${P} .ty-list a:hover{color:var(--at)}${P} .ty-m{display:flex;flex-wrap:wrap;gap:2px 14px;font-size:${px(14)};color:var(--mu)}${P} .ty-p{font-weight:800;font-size:${px(18)};text-align:right}${P} .ty-ar{display:grid;place-items:center;transition:transform .2s}${P} .ty-list a:hover .ty-ar{transform:translateX(6px)}
${P} .ty-two{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,6fr);gap:40px 72px;align-items:start}${P} .ty-fl{display:flex;flex-direction:column;gap:clamp(28px,3vw,44px)}${P} .ty-fl h3{margin:0 0 8px;font-size:clamp(${px(22)},2.2vw,${px(30)});font-weight:850;letter-spacing:-.04em;line-height:1.25}${P} .ty-fl p{margin:0;color:var(--mu);line-height:1.75;font-size:${px(16)}}
${P} .ty-big2{margin:0;max-width:20ch;font-size:clamp(${px(32)},5vw,${px(68)});line-height:1.1;letter-spacing:-.05em;font-weight:850}${P} .ty-body{margin:32px 0 0 auto;max-width:56ch;color:var(--mu);font-size:${px(18)};line-height:1.8}
${P} .ty-ol{list-style:none;margin:40px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px}${P} .ty-no{display:block;font-size:${px(64)};font-weight:850;line-height:1;letter-spacing:-.06em;color:var(--at);margin-bottom:16px;font-variant-numeric:tabular-nums}${P} .ty-ol h3{margin:0 0 6px;font-size:${px(21)};font-weight:850}${P} .ty-ol p{margin:0;color:var(--mu);line-height:1.7}
${P}.ty-facts{padding:clamp(48px,6vw,88px) 0;border-top:1px solid ${ln};border-bottom:1px solid ${ln}}${P} .ty-nl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}${P} .ty-nl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .ty-nl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
${P} .ty-nl b{display:block;font-size:clamp(${px(56)},8vw,${px(128)});font-weight:850;line-height:.95;letter-spacing:-.065em;color:var(--ink)}${P} .ty-nl b small{font-size:.28em;letter-spacing:-.02em;margin-left:6px;color:var(--at)}${P} .ty-nl span{display:block;margin-top:12px;color:var(--mu);font-size:${px(15)}}
${P} .ty-qs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:40px;margin-top:40px}${P} .ty-qs figure{margin:0}${P} .ty-qs blockquote{margin:0;font-size:${px(22)};font-weight:700;line-height:1.55;letter-spacing:-.025em}${P} .ty-qs figcaption{display:flex;gap:10px;align-items:center;margin-top:16px;color:var(--mu);font-size:${px(14)}}${P} .ty-qs b{color:var(--ink)}
${P}.ty-cta{padding:clamp(72px,10vw,${px(144)}) 0}${P} .ty-ct{margin:0;max-width:24ch;font-size:clamp(${px(24)},2.6vw,${px(34)});line-height:1.3;letter-spacing:-.03em;font-weight:800}${P} .ty-cb{margin:12px 0 0;color:var(--mu);max-width:52ch;line-height:1.7}
${P} .ty-huge{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:clamp(32px,4vw,56px);padding:clamp(16px,2vw,28px) 0;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink);font-size:clamp(${px(40)},8vw,${px(120)});font-weight:850;letter-spacing:-.06em;line-height:1;color:var(--ink);transition:color .15s}${P} .ty-huge:hover{color:var(--at)}${P} .ty-huge svg{width:.6em;height:.6em;flex:none}
${P} .ty-ci{display:flex;flex-wrap:wrap;gap:16px 48px;margin:32px 0 0}${P} .ty-ci dt{font-size:${px(13)};color:var(--mu)}${P} .ty-ci dd{margin:2px 0 0;font-weight:800;font-size:${px(17)}}
${baseFix(P, { hw: 850, hl: '-.05em', card: 'box-shadow:none;border:0;border-top:1px solid var(--ink);border-radius:0;background:transparent' })}
${P}.gf{background:var(--bg);color:var(--mu);border-top:1px solid var(--ink)}${P}.gf b{color:var(--ink);font-size:${px(30)};font-weight:850;letter-spacing:-.04em}${P}.gf .fl2,${P}.gf .fl2 a{color:var(--ink)}
@media(max-width:900px){${P} .ty-bot,${P} .ty-two{grid-template-columns:1fr}${P} .ty-bar{display:none}${P} .ty-nl,${P} .ty-nl.n3{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:36px}${P} .ty-list a{grid-template-columns:minmax(0,1fr) auto;}${P} .ty-m{grid-column:1/-1;order:2}${P} .ty-ar{display:none}}
@media(max-width:640px){${P} .ty-h1{font-size:var(--ty-fm);line-height:1.06}${P} .ty-top{padding-bottom:40px}${P} .ty-bd{display:none}${P} .ty-sh{display:block}${P} .ty-sh .ty-link{margin-top:16px}${P} .ty-list b{font-size:${px(24)}}${P} .ty-huge{font-size:${px(40)}}${P} .ty-nl b{font-size:${px(56)}}${P} .ty-qs blockquote{font-size:${px(19)}}${P} .ty-ci{flex-direction:column}}`; }
  });

  /* ─────────── 6. portal · 기관 포털 ─────────── */
  H.reg('portal', { name: '기관 포털', by: 'D1', desc: '바로 찾기 상자 · 빠른 메뉴 · 공지 패널 · 표 형식 강좌 · 공지와 일정 2단(대학 · 공공)', fits: ['univ', 'public', 'voc', 'lifelong', 'corp'],
    order: ['banner', 'notices', 'classes', 'features', 'steps', 'faq', 'cta'], slots: ['hero'],
    hero(s, d, th, T) { const C = u.pub(); const N = u.noticeList(4); const M = u.menus(s).slice(0, 6); const ch = u.clsHref(s); const cl = u.term('cls');
      const srch = ch ? `<a class="pt-srch" ${u.aAttr(ch)}><span class="pt-si">${u.ic('search', 22)}</span><span class="pt-sp">어떤 ${E(cl)}을 찾으세요?</span><span class="pt-sb">${E(cl)} 전체 보기</span></a>` : '';
      const pop = C.length ? `<div class="pt-pop"><span class="pt-pl">많이 찾는 ${E(cl)}</span>${C.slice(0, 4).map(c => `<a href="#p-c-${E(c.id)}">${E(c.name)}</a>`).join('')}</div>` : '';
      const nm = u.menuOf(s, 'notice');
      const side = N.length ? `<aside class="pt-side"><div class="pt-ph"><h2>공지사항</h2>${nm ? `<a href="#p-m-${E(nm.id)}" aria-label="공지 전체 보기">${u.ic('plus', 18)}</a>` : ''}</div><ul class="pt-nl">${N.map(n => `<li><b>${E(n.title)}</b><time>${E(u.dot(n.at || '').slice(0, 10))}</time></li>`).join('')}</ul></aside>`
        : `<aside class="pt-side pt-pic">${H.fig('hero', s, th, T, { d, ratio: '4/3', scene: 'hero' })}${(d.cta || d.cta2) ? `<div class="pt-sa">${btn1(s, d)}${btn2(s, d, 'hpl-btn gh')}</div>` : ''}</aside>`;
      const qk = M.length >= 3 ? `<nav class="pt-qk n${M.length}" aria-label="빠른 메뉴">${M.map((m, k) => `<a ${u.aAttr(u.menuHref(m))}><span class="pt-qi">${u.ic(u.icOf(m.l, k + 1), 24)}</span><b>${E(m.l)}</b></a>`).join('')}</nav>` : '';
      return `<section class="hpt hpl-hero pt-hero"><div class="pt-band"><div class="hpl-w pt-g"><div class="pt-main">${d.eyebrow ? `<p class="pt-ey">${E(d.eyebrow)}</p>` : ''}<h1>${u.h1(d)}</h1>${d.sub ? `<p class="pt-sub">${E(d.sub)}</p>` : ''}${srch}${pop}${N.length && (d.cta || d.cta2) ? `<div class="pt-act">${btn1(s, d, 'hpl-btn wh')}${btn2(s, d, 'hpl-btn ol')}</div>` : ''}</div>${side}</div></div>${qk ? `<div class="hpl-w">${qk}</div>` : ''}</section>`; },
    sec: {
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx);
        return SEC('pt-cls', ctx, `<div class="pt-sh">${secHead(d, 'pt-hh')}${allLink(s, L.length, 'pt-all')}</div><div class="pt-tb" role="table" aria-label="${E(d.title || u.term('cls') + ' 목록')}"><div class="pt-tr pt-th" role="row"><span role="columnheader">구분</span><span role="columnheader">${E(u.term('cls'))}명</span><span role="columnheader">기간</span><span role="columnheader">수강료</span><span role="columnheader"><i class="pt-sr">바로가기</i></span></div>${L.map(c => `<a class="pt-tr" role="row" href="#p-c-${E(c.id)}"><span role="cell" class="pt-k">${E(u.kindOf(c))}</span><b role="cell">${E(c.name)}</b><span role="cell" class="pt-p">${E(u.perOf(c) || (u.lesOf(c) ? u.lesOf(c) + '차시' : '-'))}</span><span role="cell" class="pt-pr">${E(u.priceOf(c))}</span><span role="cell" class="pt-go">자세히 ${u.ic('arrow', 16)}</span></a>`).join('')}</div>`); },
      notices(s, d, th, T, ctx) { const N = u.noticeList(+d.n || 5); const C = u.pub().filter(c => c.start || c.end).sort((a, b) => String(a.start || a.end).localeCompare(String(b.start || b.end))).slice(0, 5);
        if (!N.length && !C.length) return hintS(ctx, '공지사항을 올리거나 강좌에 시작일을 넣으면 공지 · 일정이 표시됩니다.'); const nm = u.menuOf(s, 'notice');
        const np = N.length ? `<div class="pt-pn"><div class="pt-ph"><h3>${E(d.title || '공지사항')}</h3>${nm ? `<a href="#p-m-${E(nm.id)}" class="pt-all">전체 보기 ${u.ic('arrow', 15)}</a>` : ''}</div><ul class="pt-nl">${N.map(n => `<li><b>${E(n.title)}</b><time>${E(u.dot(n.at || '').slice(0, 10))}</time></li>`).join('')}</ul></div>` : '';
        const cp = C.length ? `<div class="pt-pn"><div class="pt-ph"><h3>교육 일정</h3></div><ul class="pt-cal">${C.map(c => { const sd = String(c.start || c.end || ''); return `<li><span class="pt-dt"><b>${E(sd.slice(8, 10) || '-')}</b><small>${E(sd.slice(0, 7).replace('-', '.'))}</small></span><span class="pt-ct"><b>${E(c.name)}</b><small>${E(u.perOf(c))}</small></span></li>`; }).join('')}</ul></div>` : '';
        return SEC('pt-nt', ctx, `<div class="pt-2${np && cp ? '' : ' one'}">${np}${cp}</div>`); },
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('pt-feat', ctx, `<div class="pt-sh">${secHead(d, 'pt-hh')}</div><div class="pt-fg n${Math.min(C.length, 4)}">${C.map(([a, b], k) => `<article><span class="pt-fi">${u.ic(u.icOf(a + ' ' + b, k), 24)}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></article>`).join('')}</div>`); },
      tiles(s, d, th, T, ctx) { return this.features(s, d, th, T, ctx); },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); const h = u.askHref(s); if (!d.title && !I.length) return null;
        return `<section class="hpt hpl-s pt-cta"><div class="hpl-w"><div class="pt-cb"><div class="pt-cl">${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : ''}</div>${I.length ? `<ul class="pt-ci">${I.map(c => `<li><span class="pt-cic">${u.ic(c.ic, 20)}</span><div><small>${E(c.k)}</small>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</div></li>`).join('')}</ul>` : ''}${d.cta && h ? `<a class="hpl-btn pri" ${u.aAttr(h)}><span>${E(d.cta)}</span>${u.ic('arrow', 18)}</a>` : ''}</div></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-portal'; const px = pxf(th); const ln = u.al(T.ink, .12); const B = T.B; const bb = `linear-gradient(120deg,${T.hbB},${T.hbB2})`;
      return `${P}{font-family:var(--hpl-sans)}${P}.hpl-s{padding:clamp(48px,6vw,${px(80)}) 0;background:var(--bg)}${P}.hpl-s.is-alt{background:var(--alt)}
${P}.pt-hero{background:var(--bg);padding:0 0 clamp(24px,3vw,40px)}${P} .pt-band{background:${bb};color:#fff;padding:clamp(40px,5vw,72px) 0 clamp(72px,7vw,104px)}
${P} .pt-g{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:32px 56px;align-items:start}
${P} .pt-ey{margin:0 0 12px;font-size:${px(14)};font-weight:700;color:${B.hy}}${P}.pt-hero h1{margin:0;font-size:clamp(${px(30)},3.6vw,${px(48)});line-height:1.2;letter-spacing:-.035em;font-weight:800;color:#fff}${P} .pt-sub{margin:14px 0 0;font-size:${px(17)};line-height:1.7;color:${B.hm};max-width:52ch}
${P} .pt-srch{display:flex;align-items:center;gap:12px;margin-top:28px;background:#fff;color:var(--ink);border-radius:var(--br);padding:8px 8px 8px 18px;box-shadow:0 18px 40px -20px rgba(0,0,0,.5);max-width:620px}${P} .pt-si{color:var(--at);display:grid}${P} .pt-sp{flex:1;min-width:0;color:var(--mu);font-size:${px(16.5)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${P} .pt-sb{flex:none;background:var(--a);color:var(--on);font-weight:750;padding:12px 18px;border-radius:calc(var(--br) - 2px);font-size:${px(15)}}
${P} .pt-pop{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:16px}${P} .pt-pl{font-size:${px(13.5)};color:${B.hm};margin-right:4px}${P} .pt-pop a{font-size:${px(13.5)};color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.28);padding:6px 12px;border-radius:999px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${P} .pt-pop a:hover{background:rgba(255,255,255,.22)}
${P} .pt-act{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}${P} .hpl-btn.wh{background:#fff;color:${u.fit(T.a, '#ffffff', 4.6)}}${P} .hpl-btn.ol{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7);color:#fff}${P} .hpl-btn.gh{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1px ${ln}}
${P} .pt-side{background:#fff;color:var(--ink);border-radius:var(--r);padding:22px 24px;box-shadow:0 24px 48px -28px rgba(0,0,0,.55)}${P} .pt-side.pt-pic{padding:0;overflow:hidden}${P} .pt-pic .hpl-img{aspect-ratio:4/3}${P} .pt-sa{display:flex;flex-wrap:wrap;gap:8px;padding:16px}
${P} .pt-ph{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:2px solid var(--ink)}${P} .pt-ph h2,${P} .pt-ph h3{margin:0;font-size:${px(18)};font-weight:800;color:var(--ink)}${P} .pt-ph>a:not(.pt-all){display:grid;place-items:center;width:32px;height:32px;border-radius:50%;box-shadow:inset 0 0 0 1px ${ln};color:var(--ink)}
${P} .pt-nl{list-style:none;margin:0;padding:0}${P} .pt-nl li{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid ${ln}}${P} .pt-nl b{flex:1;min-width:0;font-weight:600;font-size:${px(15)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${P} .pt-nl time{flex:none;color:var(--mu);font-size:${px(13)};font-variant-numeric:tabular-nums}
${P} .pt-qk{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));margin-top:calc(clamp(40px,4vw,64px) * -1);background:#fff;border-radius:var(--r);box-shadow:0 20px 44px -26px rgba(15,23,42,.45),0 0 0 1px ${ln};position:relative;z-index:2;overflow:hidden}${P} .pt-qk.n3{--n:3}${P} .pt-qk.n5{--n:5}${P} .pt-qk.n6{--n:6}
${P} .pt-qk a{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 10px;text-align:center;font-size:${px(15)};color:var(--ink)}${P} .pt-qk a+a{border-left:1px solid ${ln}}${P} .pt-qk a:hover{background:var(--as)}${P} .pt-qi{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--as);color:var(--at)}${P} .pt-qk b{font-weight:700;line-height:1.35}
${P} .pt-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px}${P} .pt-hh .hpl-ey{margin:0 0 8px;font-size:${px(14)};font-weight:700;color:var(--at)}${P} .pt-hh h2{margin:0;font-size:clamp(${px(24)},2.6vw,${px(32)});font-weight:800;letter-spacing:-.03em;line-height:1.3}${P} .hpl-sd{margin:8px 0 0;color:var(--mu);line-height:1.7}
${P} .pt-all{display:inline-flex;align-items:center;gap:4px;font-weight:700;color:var(--at);font-size:${px(14.5)};white-space:nowrap}
${P} .pt-tb{border-top:2px solid var(--ink)}${P} .pt-tr{display:grid;grid-template-columns:110px minmax(0,1fr) 200px 120px 90px;gap:16px;align-items:center;padding:18px 12px;border-bottom:1px solid ${ln}}${P} a.pt-tr:hover{background:var(--as)}
${P} .pt-th{background:var(--alt);font-size:${px(13.5)};font-weight:700;color:var(--mu);padding-top:12px;padding-bottom:12px}${P}.is-alt .pt-th{background:#fff}${P} .pt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
${P} .pt-k{justify-self:start;font-size:${px(12.5)};font-weight:700;color:var(--at);background:var(--as);padding:3px 10px;border-radius:var(--br)}${P} .pt-tr>b{font-weight:700;font-size:${px(16)}}${P} .pt-p{color:var(--mu);font-size:${px(14)};font-variant-numeric:tabular-nums}${P} .pt-pr{font-weight:700}${P} .pt-go{display:inline-flex;align-items:center;gap:4px;color:var(--at);font-weight:700;font-size:${px(14)};justify-self:end}
${P} .pt-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}${P} .pt-2.one{grid-template-columns:1fr}${P} .pt-pn{background:#fff;border-radius:var(--r);padding:24px;box-shadow:0 0 0 1px ${ln}}
${P} .pt-cal{list-style:none;margin:0;padding:0}${P} .pt-cal li{display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid ${ln}}${P} .pt-dt{flex:none;width:58px;display:flex;flex-direction:column;align-items:center;padding:6px 0;border-radius:calc(var(--r) * .7);background:var(--as);color:var(--at)}${P} .pt-dt b{font-size:${px(20)};line-height:1.1}${P} .pt-dt small{font-size:11px}${P} .pt-ct{min-width:0;display:flex;flex-direction:column}${P} .pt-ct b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${P} .pt-ct small{color:var(--mu);font-size:${px(13)}}
${P} .pt-fg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-radius:var(--r);box-shadow:0 0 0 1px ${ln};background:#fff;overflow:hidden}${P} .pt-fg.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .pt-fg.n3{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .pt-fg.n1{grid-template-columns:1fr}
${P} .pt-fg article{display:flex;gap:14px;padding:24px;border-left:1px solid ${ln};margin-left:-1px;border-top:1px solid ${ln};margin-top:-1px}${P} .pt-fi{flex:none;width:44px;height:44px;border-radius:calc(var(--r) * .7);display:grid;place-items:center;background:var(--as);color:var(--at)}${P} .pt-fg h3{margin:2px 0 4px;font-size:${px(16.5)};font-weight:800}${P} .pt-fg p{margin:0;color:var(--mu);font-size:${px(14.5)};line-height:1.65}
${P}.pt-cta{padding-top:0}${P} .pt-cb{display:flex;align-items:center;gap:24px 40px;flex-wrap:wrap;padding:28px 32px;border-radius:var(--r);background:var(--alt);box-shadow:inset 4px 0 0 var(--a)}${P} .pt-cl{flex:1 1 280px}${P} .pt-cl h2{margin:0;font-size:${px(22)};font-weight:800;letter-spacing:-.03em;line-height:1.35}${P} .pt-cl p{margin:6px 0 0;color:var(--mu)}
${P} .pt-ci{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:16px 28px}${P} .pt-ci li{display:flex;align-items:center;gap:10px}${P} .pt-cic{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--at)}${P} .pt-ci small{display:block;color:var(--mu);font-size:${px(12.5)}}${P} .pt-ci b,${P} .pt-ci a{font-weight:800;overflow-wrap:anywhere}
${baseFix(P, { hw: 800, hl: '-.03em', card: `box-shadow:0 0 0 1px ${ln};border:0` })}
${P}.gf{background:var(--alt);color:var(--mu);border-top:3px solid var(--a)}${P}.gf b{color:var(--ink)}${P}.gf .fl2,${P}.gf .fl2 a{color:var(--ink)}
@media(max-width:1000px){${P} .pt-tr{grid-template-columns:96px minmax(0,1fr) auto}${P} .pt-tr .pt-p{grid-column:2;grid-row:2}${P} .pt-th .pt-sr,${P} .pt-th span:nth-child(3),${P} .pt-th span:nth-child(5),${P} .pt-go{display:none}${P} .pt-fg,${P} .pt-fg.n3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){${P} .pt-g{grid-template-columns:1fr}${P} .pt-qk{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .pt-qk a:nth-child(3n+1){border-left:0}${P} .pt-qk a:nth-child(n+4){border-top:1px solid ${ln}}${P} .pt-2{grid-template-columns:1fr}}
@media(max-width:640px){${P}.pt-hero h1{font-size:${px(28)}}${P} .pt-sp{font-size:${px(14.5)}}${P} .pt-sb{padding:10px 12px;font-size:${px(13.5)}}${P} .pt-band{padding:32px 0 64px}${P} .pt-side{padding:18px}
${P} .pt-th{display:none}${P} .pt-tr{grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;padding:16px 4px}${P} .pt-tr .pt-k{grid-column:1/-1}${P} .pt-tr>b{grid-column:1/-1}${P} .pt-tr .pt-p{grid-column:1;grid-row:auto}${P} .pt-fg,${P} .pt-fg.n2,${P} .pt-fg.n3{grid-template-columns:1fr}${P} .pt-cb{padding:22px 18px}${P} .pt-ci{flex-direction:column}${P} .pt-cb .hpl-btn{width:100%}${P} .pt-pn{padding:18px}}`; }
  });
})();
