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
    const h = fn(s, d, th, T, ctx); if (h == null && alt) band--;
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
@media(prefers-reduced-motion:reduce){${P} *{transition:none!important;animation:none!important}}`; }
  H.css = s => { const F = H.of(s); if (!F) return ''; const T = H.tok(s); if (!T) return ''; const th = thOf(s); let c = baseCSS(s, th, T, s.layout);
    try { if (typeof F.css === 'function') c += '\n' + F.css(s, th, T); } catch (e) { console.error('HPL css', s.layout, e); }
    return c; };
  { const base = siteHTML; siteHTML = (s, full, lang) => { const F = s && H.of(s); if (!F) return base(s, full, lang);
    let tmp = false; if (!s.theme && window.HPT && typeof HPT.rec === 'function') { s.theme = HPT.rec(typeKey()); tmp = true; }
    try { let h = base(s, full, lang); const c = H.css(s); if (!c) return h;
      h = h.replace('</style>', `/* hpl ${s.layout} */${c.replace(/<\/?style/gi, '')}</style>`).replace(/<body class="([^"]*)"/, `<body class="$1 hpl-on hpl-${s.layout}"`);
      h = h.replace(/<footer class="gf"/g, `<footer class="gf hpt hpl-f hpl-${s.layout}"`);
      return h; } catch (e) { console.error('HPL siteHTML', e); return base(s, full, lang); } finally { if (tmp) delete s.theme; } }; window.siteHTML = siteHTML; }
})();
