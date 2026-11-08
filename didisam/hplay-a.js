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
  /* 허용: data:image · https · blob · 같은 출처 상대 경로(img/stock/… · /api/media/…) — 스킴 붙은 경로(javascript: 등) · //호스트 · .. 는 막음 */
  const okSrc = v => { v = String(v || '').trim(); if (/^(data:image\/|https:\/\/|blob:)/i.test(v)) return true; if (!v || /^\/\//.test(v) || /^[a-z][a-z0-9+.-]*:/i.test(v) || /\.\./.test(v)) return false; return /^\/?[\w\-./%]+(\?[\w=&.%-]*)?$/.test(v); };
  H.okSrc = okSrc;
  /* 샘플 사진(HPSTOCK)인지: site.img[slot].stock(slotImg가 넣는 id) 또는 img/stock/ 경로 — s.stockOff면 템플릿 지정 사진(s.photos)도 같이 끈다(FIXLIST 17) */
  const isStockImg = m => !!(m && (m.stock || /(^|\/)img\/stock\//.test(String(m.src || ''))));
  H.isStockImg = isStockImg;
  H.img = (s, slot, d) => { let m = s && s.img && s.img[slot]; if (m && s.stockOff && isStockImg(m)) m = null;
    if (m && okSrc(m.src)) return { src: m.src, alt: m.alt || '', fit: m.fit === 'contain' ? 'contain' : 'cover', pos: /^[\d.]+% [\d.]+%$/.test(m.pos || '') ? m.pos : '50% 50%' };
    if (slot === 'hero') { const b = d || (((s && s.sections) || []).find(x => x && x.type === 'banner') || {}).data || {}; if (okSrc(b.img) && !(s && s.stockOff && isStockImg({ src: b.img }))) return { src: b.img, alt: b.alt || '', fit: 'cover', pos: '50% 50%' }; }
    if (/^cls-/.test(slot)) { const c = (S.classes || []).find(x => 'cls-' + x.id === slot); if (c && okSrc(c.thumb)) return { src: c.thumb, alt: c.name || '', fit: 'cover', pos: '50% 50%' }; }
    return null; };
  /* 대체 도형(사진 · HPL.art가 모두 없을 때만) — 원 · 블롭 없이 면과 가는 선으로 공간감만 */
  function artLite(slot, s, th, T, o) { const a = T.a, d = T.hd || mix(a, '#000000', .6), l = T.as || mix(a, '#ffffff', .88), m = mix(a, '#ffffff', .7);
    let h = 0; for (const ch of String(slot)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const k = h % 3;
    const g = [`<rect width="400" height="300" fill="${l}"/><rect x="0" y="190" width="400" height="110" fill="${m}"/><path d="M0 190h400M120 0v300M280 0v300" stroke="${al(d, .14)}"/><rect x="150" y="80" width="100" height="110" fill="${al(a, .18)}"/>`,
      `<rect width="400" height="300" fill="${d}"/><rect x="230" y="0" width="170" height="300" fill="${al(a, .35)}"/><path d="M0 220h400M60 0v300" stroke="${al('#ffffff', .12)}"/>`,
      `<rect width="400" height="300" fill="${m}"/><rect x="0" y="0" width="160" height="300" fill="${l}"/><path d="M160 0v300M160 120h240" stroke="${al(d, .16)}"/><rect x="200" y="160" width="160" height="90" fill="${al(a, .16)}"/>`][k];
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true">${g}</svg>`; }
  /* ── 샘플 사진(HPSTOCK · 요원 P): 사진이 없으면 업종 · 자리에 맞는 분위기 사진. 한 화면 안에서 같은 사진은 되도록 다시 쓰지 않는다.
     s.stockOff = 1이면 쓰지 않는다. 고르는 기준: 기관 유형 · 자리(hero · about · space · card · cta) 키워드를 태그 · 분류 · id에서 찾고, 첫 화면은 가로 사진을 우선 */
  const KWT = { adult: ['laptop', 'desk', 'notebook', 'study', 'seminar', 'lecture', 'coding', '노트북', '책상', '세미나'], k12: ['classroom', 'class', 'book', 'desk', 'library', 'kids', 'child', '교실', '어린이', '책'], univ: ['campus', 'lecture', 'library', 'university', 'hall', '캠퍼스', '강의', '도서관'], univ_lms: ['campus', 'lecture', 'laptop', 'library', '캠퍼스', '강의'], corp: ['office', 'meeting', 'seminar', 'laptop', 'business', '회의', '사무'], public: ['civic', 'public', 'city', 'government', 'seminar', 'hall', '공공', '청사', '도시'], lifelong: ['library', 'seminar', 'art', 'senior', 'craft', 'hobby', '도서관', '시니어', '공방'], voc: ['workshop', 'tool', 'voc', 'vocational', 'lab', 'coding', 'welding', '실습', '공구', '장비'] };
  const KWS = { hero: ['campus', 'lecture', 'classroom', 'library', 'hall', 'space', 'building', '공간'], about: ['laptop', 'notebook', 'desk', 'book', 'art', 'study', 'hands', 'coding'], space: ['classroom', 'library', 'seminar', 'lecture', 'room', 'space'], card: ['laptop', 'desk', 'book', 'classroom', 'study', 'coding', 'art', 'seminar'], cta: ['library', 'campus', 'office', 'space', 'seminar'] };
  /* 템플릿 scene이 없을 때 유형 · 자리별 기본 장면(HPSTOCK 태그 말) — 첫 화면은 사람 · 공간이 느껴지는 장면, 소개는 손 · 사물 */
  const SCD = { adult: { hero: '노트북 공부 책장', about: '필기 노트 공부 손', space: '도서관 라운지', card: '노트북 공부', cta: '세미나실 워크숍' }, k12: { hero: '어린이도서관 책', about: '블록 만들기 놀이', space: '교실 창가', card: '노트 책 공부', cta: '어린이도서관' },
    univ: { hero: '캠퍼스 잔디 건물', about: '스터디 협업', space: '대형강의 강의실', card: '노트북 공부', cta: '도서관 라운지' }, corp: { hero: '회의 테이블 창', about: '노트북 업무 타이핑', space: '회의실', card: '업무 노트북', cta: '라운지 휴게' },
    public: { hero: '공공건물 홀', about: '세미나실 원탁', space: '대강당 객석', card: '회의실', cta: '도서관 서가' }, lifelong: { hero: '도서관 라운지 편안함', about: '원예 취미 손', space: '세미나실', card: '취미 클래스', cta: '정원 산책로' },
    voc: { hero: '공구 기술 현장', about: '공방 목공 도면', space: '작업대 실습', card: '공구 실습', cta: '작업대 기계' } };
  /* 자동 채움 1순위(통합 12:40 · 7점 원인 해결): 첫 화면은 사람 · 손이 보이는 학습 장면(1600px 가로 사진), 소개는 손 · 노트북 · 필기 장면. 없으면 forScene */
  const CUR = { hero: { adult: ['lap-03', 'lap-05', 'lap-06'], k12: ['art-01', 'lib-04', 'art-03'], univ: ['lap-05', 'lib-01', 'lec-03'], corp: ['lap-03', 'off-02', 'lap-08'], public: ['lib-01', 'lec-02', 'sem-01'], lifelong: ['art-01', 'mus-03', 'lib-01'], voc: ['voc-01', 'wrk-01', 'lap-03'] },
    about: { adult: ['dsk-01', 'cod-03', 'dsk-02'], k12: ['kid-02', 'stu-02', 'kid-01'], univ: ['stu-02', 'stu-01', 'dsk-01'], corp: ['dsk-04', 'off-04', 'lap-08'], public: ['stu-02', 'dsk-01', 'lib-03'], lifelong: ['sen-04', 'art-03', 'mus-02'], voc: ['wrk-03', 'wrk-04', 'cod-03'] } };
  const seedOf = v => { let h = 7; for (const ch of String(v)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  let used = new Set();
  H.resetStock = () => { used = new Set(); };
  H.stock = (s, slot, o) => { o = o || {}; const P = window.HPSTOCK; if (!P || !s || s.stockOff) return null; const L = (Array.isArray(P.list) ? P.list : []).filter(x => x && okSrc(x.src)); if (!L.length) return null;
    /* v34.5 H2(R2 N1): 강좌 자리는 강좌명과 장면이 맞는 사진만(HPSTOCK.forCourse). 없으면 null → H.fig가 글자 타일 */
    if (/^cls-/.test(slot)) { const c = ((typeof S !== 'undefined' && S && S.classes) || []).find(x => 'cls-' + x.id === slot); const ex = L.filter(x => used.has(x.src)).map(x => x.id);
      let x = null; try { x = c && typeof P.forCourse === 'function' ? P.forCourse(typeKey(), c.name, { seed: String(c.id), exclude: ex }) : null; } catch (e) { x = null; }
      if (!x || !okSrc(x.src)) return null; used.add(x.src);
      return { src: o.small && x.src800 && okSrc(x.src800) ? x.src800 : x.src, alt: '', fit: 'cover', pos: /^[\d.]+% [\d.]+%$/.test(x.focus || '') ? x.focus : '50% 50%', stock: 1, tone: x.tone || '' }; }
    const ty = typeKey(); const sk = /^cls-/.test(slot) ? 'card' : (KWS[o.scene] ? o.scene : KWS[slot] ? slot : 'card');
    let first = null;
    /* 템플릿이 정한 사진(tp.photos → s.photos, HPSTOCK id)을 가장 먼저 — hplay-b pickStock · S3 photo()와 같은 순서 */
    const pk = /^cls-/.test(slot) ? 'card' : slot; const pid = s.photos && s.photos[pk]; if (pid && typeof P.get === 'function') { const x = P.get(Array.isArray(pid) ? pid[(o.k || 0) % pid.length] : pid); if (x && okSrc(x.src) && !used.has(x.src)) first = x; }
    const cur = (CUR[sk] || {})[ty === 'univ_lms' ? 'univ' : ty]; if (!first && cur && typeof P.get === 'function') { for (const id of cur) { const x = P.get(id); if (x && okSrc(x.src) && !used.has(x.src)) { first = x; break; } } }
    if (!first && typeof P.forScene === 'function') { const sl = { hero: 'hero', about: 'about', card: 'card', space: 'space', gallery: 'gallery', cta: 'cta' }[sk] || 'card';
      const tp = s.tpl && typeof TPL !== 'undefined' ? (TPL.find(t => t.id === s.tpl) || {}) : {}; const scene = String(o.text || tp.scene || s.scene || (SCD[ty === 'univ_lms' ? 'univ' : ty] || SCD.adult)[sl === 'gallery' ? 'about' : sl] || '');
      try { const r = P.forScene(ty === 'univ_lms' ? 'univ' : ty, scene, sl, { seed: ((S && S.org && S.org.name) || '') + slot, exclude: L.filter(x => used.has(x.src)).map(x => x.id), tone: o.tone }); first = Array.isArray(r) ? r[0] : r; } catch (e) { first = null; } }
    const kt = KWT[ty] || KWT.adult, ks = KWS[sk];
    const sc = x => { const t = `${(x.tags || []).join(' ')} ${x.cat || ''} ${x.id || ''}`.toLowerCase(); let v = 0; kt.forEach(k => { if (t.includes(k)) v += 2; }); ks.forEach(k => { if (t.includes(k)) v += 1.5; }); if (sk === 'hero' && +x.w && +x.h) v += +x.w / +x.h >= 1.4 ? 1 : -2; if (o.tone && x.tone === o.tone) v += 1; return v; };
    const base = seedOf(((S && S.org && S.org.name) || '') + slot);
    const R = L.map((x, i) => [x, sc(x) + ((base + i * 7919) % 97) / 1000]).sort((p, q) => q[1] - p[1]).map(r => r[0]);
    const C = (first && okSrc(first.src) ? [first] : []).concat(R); const pickd = C.find(x => !used.has(x.src)) || C[(o.k || 0) % C.length]; used.add(pickd.src);
    return { src: o.small && pickd.src800 && okSrc(pickd.src800) ? pickd.src800 : pickd.src, alt: '', fit: 'cover', pos: /^[\d.]+% [\d.]+%$/.test(pickd.focus || '') ? pickd.focus : '50% 50%', stock: 1, tone: pickd.tone || '' }; };
  /* v34.5 H2(R2 N1): 강좌명과 맞는 사진이 없을 때의 '사진 없는 카드' 타일 — 번호 + 분류 글자(장식 사진 · 그림 대신). dark: 사진 위 글자가 얹히는 자리 */
  /* 글자 타일 표시: 강좌명의 첫 글자(번호를 쓰지 않는다 — 번호는 '단계 섹션'으로 읽힘, H3 요청) */
  const glyphOf = slot => { const c = ((typeof S !== 'undefined' && S && S.classes) || []).find(x => 'cls-' + x.id === String(slot)); const m = /[가-힣A-Za-z0-9]/.exec(String((c && c.name) || '').replace(/^(초등|중등|고등|중\d|고\d|초\d|직장인|성인|어린이|원데이|실무|기초|입문|심화)\s*/, '')); return m ? m[0].toUpperCase() : '·'; };
  H.tyTile = (slot, T, k, label, o) => { o = o || {}; const dk = T.hd || mix(T.a, '#0B1020', .62); const bg = o.dark ? dk : (T.as || mix(T.a, '#ffffff', .9)); const fg = o.dark ? '#ffffff' : fit(T.at || T.a, bg, 4.6);
    const r = o.ratio ? `aspect-ratio:${String(o.ratio).replace(':', '/')};` : '';
    return `<figure class="${o.cls || 'hpl-img'} hpl-ty" data-slot="${E(slot)}" data-empty="1" style="${r}background:${bg};color:${fg};box-shadow:inset 0 0 0 1px ${al(T.ink || '#111111', .08)}"><span aria-hidden="true" style="position:absolute;left:8%;top:8%;font-size:clamp(30px,3.6vw,56px);line-height:1;font-weight:800;letter-spacing:-.04em">${E(glyphOf(slot))}</span>${label ? `<span aria-hidden="true" style="position:absolute;left:8%;right:8%;bottom:8%;font-size:13px;font-weight:700;letter-spacing:.02em;padding-top:10px;border-top:1px solid currentColor">${E(label)}</span>` : ''}</figure>`; };
  H.fig = (slot, s, th, T, o) => { o = o || {}; const m = H.img(s, slot, o.d) || (o.stock === false ? null : H.stock(s, slot, o)); const r = o.ratio ? `aspect-ratio:${o.ratio};` : ''; const cls = `hpl-img${o.cls ? ' ' + o.cls : ''}`;
    if (m) return `<figure class="${cls}${m.stock ? ' is-stock' : ''}" data-slot="${E(slot)}"${m.tone ? ` data-tone="${E(m.tone)}"` : ''} style="${r}"><img src="${E(m.src)}" alt="${E(m.alt || o.alt || '')}"${o.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" style="object-fit:${m.fit};object-position:${m.pos}"></figure>`;
    if (o.need) return '';
    if (/^cls-/.test(slot)) return H.tyTile(slot, T, o.k || 0, o.label || '', { ratio: o.ratio, cls, dark: o.dark || /bt-cf/.test(cls) });
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
  /* ── 계열 변형(layoutVar · R1 H1): 같은 계열을 다른 유형 · 템플릿이 써도 첫 화면과 아래 섹션이 달라 보이게 한다.
     site.layoutVar = 'a'|'b'|'c'(없거나 목록에 없으면 첫 변형). 섹션 · 바닥글 · body에 hpl-v-<id> 클래스가 붙고, 계열 변형 CSS가 그 아래로 범위를 좁힌다.
     H.defVars(id, [{ id, name, desc, dark }], css(site, th, T, v)) — 계열 등록 순서와 무관. H.vars(id) · H.varOf(site) · H.setVar(site, v) */
  H.vdef = H.vdef || {};
  H.defVars = (id, list, css) => { H.vdef[id] = { list: list || [], css }; };
  H.vars = id => { const L = ((H.vdef[id] || {}).list || []); return (L.length ? L : [{ id: 'a', name: '기본', desc: '', dark: false }]).map(x => Object.assign({}, x)); };
  H.varOf = s => { const L = H.vars(s && s.layout); const v = s && s.layoutVar; return L.some(x => x.id === v) ? v : L[0].id; };
  H.setVar = (s, v) => { if (!s) return s; if (v && H.vars(s.layout).some(x => x.id === v)) s.layoutVar = v; else delete s.layoutVar; return s; };
  /* 사진 위 스크림(M1 · FIXLIST 1): 검정 대신 팔레트의 깊은 색(HPC.photo().scrim), 글자 쪽 40%에만 진하게 — dir = 글자가 있는 쪽에서 반대쪽으로(to top · to right …) */
  H.scrimC = (s, slot) => { const m = H.img(s, slot || 'hero'); let c = ''; try { if (window.HPC && typeof HPC.photo === 'function') c = (HPC.photo(m ? m.src : null, s) || {}).scrim || ''; } catch (e) { c = ''; }
    return /^rgba?\(/.test(c) ? c : 'rgba(12,16,24,.8)'; };
  H.scrim = (s, slot, dir, o) => { o = o || {}; const c = H.scrimC(s, slot); const m = c.match(/rgba?\(([^)]+)\)/); const p = m ? m[1].split(',').map(x => x.trim()) : ['12', '16', '24', '.8']; const a0 = Math.min(.92, Math.max(.7, +(p[3] || .8) + (o.add || 0)));
    const A = x => `rgba(${p[0]},${p[1]},${p[2]},${(a0 * x).toFixed(3)})`; const e = o.end || 40;
    return `linear-gradient(${dir || 'to top'},${A(1)} 0%,${A(.92)} ${Math.round(e * .55)}%,${A(.55)} ${e}%,${A(.12)} ${Math.round(e * 1.5)}%,${A(0)} ${Math.min(100, Math.round(e * 1.9))}%)`; };
  /* ── 머리말(eyebrow) 한글화(R1 M2 · RULES_B2 5): 영어만 있는 머리말은 공공 · 학원 · 평생 · 직업 · 기업 · 성인에서 한글 라벨로,
     대학 · 프리미엄 테마는 '한글 · ENGLISH' 병기로 바꿔 그린다(데이터는 그대로 — 운영자가 한글로 고치면 그 값이 쓰인다) */
  const EYW = [[/faculty|teacher|instructor/i, '교원'], [/public\s*service|government|civic|citizen/i, '시민 교육'], [/campus|university|college/i, '대학'], [/course|class|lecture|curriculum/i, '교육과정'], [/notice|news/i, '알림'], [/review|voice|testimonial/i, '수강 후기'], [/faq|question/i, '자주 묻는 질문'], [/contact|consult|apply|join|enrol/i, '상담 · 신청'], [/schedule|calendar/i, '일정'], [/about|intro|story/i, '소개'], [/step|process|how/i, '진행 순서'], [/youth|kid|junior|child/i, '어린이 · 청소년'], [/senior|lifelong/i, '평생학습'], [/career|job|work/i, '취업 · 직무'], [/\bai\b|digital|data|coding|tech/i, '디지털 · AI'], [/green|climate/i, '기후 · 환경'], [/cyber|security/i, '정보보호'], [/art|design|music|craft/i, '예술 · 공예'], [/online|e-?learning/i, '온라인'], [/academy/i, '아카데미'], [/program/i, '프로그램'], [/center|centre/i, '센터'], [/train|skill/i, '훈련']];
  const KEY = { banner: '', classes: '교육과정', notices: '알림', reviews: '수강 후기', faq: '자주 묻는 질문', cta: '상담 · 신청', stats: '숫자로 보기', steps: '진행 순서', timeline: '진행 순서', features: '특징', info: '안내', plain: '소개', profiles: '강사', map: '오시는 길', image: '공간', video: '영상' };
  H.koEy = (v, s, k) => { if (!v || /[가-힣]/.test(String(v)) || !/[A-Za-z]/.test(String(v))) return v; const ty = typeKey(); const both = ty === 'univ' || ty === 'univ_lms' || (s && s.theme === 'premium');
    const hit = EYW.find(([re]) => re.test(v)); const ko = hit ? hit[1] : (KEY[k] || ((S && S.org && S.org.name) || '')); if (!ko) return v; return both ? `${ko} · ${String(v).toUpperCase()}` : ko; };
  H.koEyOn = s => { const ty = typeKey(); return !(ty === 'univ' || ty === 'univ_lms' || (s && s.theme === 'premium')); };
  let band = 0;
  H.render = (x, i, s) => { const F = H.of(s); if (!F || !x) return null; const d = x.data || {}; const k = kindKey(x);
    const fn = k === 'banner' ? F.hero : F.sec && F.sec[k]; if (typeof fn !== 'function') return null;
    const T = H.tok(s); if (!T) return null; const th = thOf(s);
    if (i === 0) { band = 0; H.resetStock(); } const alt = !(k === 'banner' || k === 'cta' || k === 'stats') && (band++ % 2 === 1);
    const ctx = { x, i, alt, edit: editing(), id: s.layout, u: H.u, kind: k, v: H.varOf(s) };
    const ey = H.koEy(d.eyebrow, s, k); const d2 = ey === d.eyebrow ? d : Object.assign({}, d, { eyebrow: ey });
    const h = fn.call(k === 'banner' ? F : F.sec, s, d2, th, T, ctx); if (h == null && alt) band--;
    return h; };
  /* 섹션 표시 클래스 + 바로 고치기 표시(data-hpe) */
  const tagSec = (h, s, k) => String(h).replace(/<section\b([^>]*?)\bclass="/g, `<section$1class="hpl-${s.layout} hpl-v-${H.varOf(s)} hpl-k-${k} `);
  const markEdit = (h, x) => { const m = editing() ? HPE.map.get(x) : null; if (!m || /data-hpe="/.test(h)) return h; h = h.replace(/<section\b/g, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`); if (!/<section\b/.test(h)) h = `<section data-hpe="${E(m.key)}|${m.i}">${h}</section>`; return h; };
  { const base = proSec; proSec = (x, i, s, lk) => {
    const F = H.of(s); if (!F || !x || !s.theme) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    const d = x.data || {}; if (+d.dstyle && !(x.type === 'banner' && +d.dstyle === 2)) return base(x, i, s, lk); /* 직접 고른 디자인 스타일은 존중 */
    const k = kindKey(x); let h = null;
    try { h = H.render(x, i, s); } catch (e) { console.error('HPL', s.layout, k, e); h = null; }
    if (h == null) { const b = base(x, i, s, lk) || ''; return b ? tagSec(b, s, k) : b; }
    if (!h) return '';
    return markEdit(tagSec(h, s, k), x); }; }

  /* ═════════ CSS · siteHTML 연결 ═════════ */
  function baseCSS(s, th, T, id) { const P = `.hpl-${id}`; const big = th.big ? 1.14 : 1; const px = n => Math.round(n * big) + 'px';
    return `${P}{--hpl-sans:Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR','Noto Sans CJK KR',sans-serif;--hpl-gut:clamp(20px,4vw,48px)}
${P} .hpl-w{max-width:1200px;margin:0 auto;padding:0 var(--hpl-gut);position:relative}
${P} .hpl-img{margin:0;position:relative;overflow:hidden;background:${T.as};display:block}${P} .hpl-img>img,${P} .hpl-img>svg{position:absolute;inset:0;width:100%;height:100%;display:block}${P} .hpl-img>img{object-fit:cover}
${P} .hpl-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:${px(50)};padding:0 ${px(24)};font-weight:700;font-size:${px(16)};letter-spacing:-.01em;border-radius:var(--br);white-space:nowrap;transition:background .15s,color .15s,box-shadow .15s}
${P} .hpl-btn.pri{background:var(--a);color:var(--on)}${P} .hpl-btn.pri:hover{background:${mix(T.a, '#000000', .14)}}
${P} a:focus-visible,${P} summary:focus-visible{outline:3px solid ${fit(T.a, T.bg, 3)};outline-offset:3px;border-radius:4px}
${P} .hpl-hint{border:1.5px dashed ${al(T.a, .45)};padding:18px;text-align:center;color:${T.at};font-weight:650;background:${T.as};border-radius:var(--r)}
${P} li.tx b{font-size:clamp(${px(26)},3vw,${px(42)})!important;white-space:nowrap;letter-spacing:-.03em!important}${P} .hp-av{background:var(--a)!important;color:var(--on)!important}${P} .hp-stars,${P} .hpl-stars{color:#8A5A0B}${P} .hp-stars i{color:#5F6672}
@media(prefers-reduced-motion:reduce){${P} *{transition:none!important;animation:none!important}}`; }
  /* 모든 계열 공통 다듬기(R1 수정 회차 FD1)
     H7 워드마크 · 큰 숫자 · 인용은 테마 제목 글꼴(F1: --hd-ff · --hd-fw · --hd-ls)을 따른다 — 글꼴 이름은 직접 쓰지 않는다(HPF가 이름을 보고 파일을 붙임)
     M2 한글 머리말은 대문자 · 넓은 자간을 끈다 / L4 휴대폰은 첫 화면 사진이 글보다 먼저(계열별 규칙은 변형 CSS) */
  function fd1CSS(s, th, T) { const P = `.hpl-${s.layout}`; const serifQ = th.id === 'premium' || th.id === 'campus' || s.layout === 'editorial' || s.layout === 'noir';
    const num = `${P} :is([class*="-fl"],[class*="facts"],[class*="-fact"],[class*="-nl"],[class*="-num"],[class*="-stat"],[class*="-kpi"]) b`;
    return `${num},${P} .ty-huge{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);font-variant-numeric:tabular-nums}
${P} blockquote,${P} blockquote p,${P} [class$="-q"] p{font-family:${serifQ ? 'var(--hd-ff,inherit)' : 'var(--bd-ff,inherit)'};font-weight:${serifQ ? 400 : 500}}
.hpl-f.${'hpl-' + s.layout} .hps-wm,.hpl-f.${'hpl-' + s.layout} .gf-wm,${P}.gf b.gf-n{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);letter-spacing:var(--hd-ls,-.03em)}
${H.koEyOn(s) ? `${P} :is(.hpl-ey,[class$="-ey"]){text-transform:none;letter-spacing:.02em}` : ''}`; }
  H.css = s => { const F = H.of(s); if (!F) return ''; const T = H.tok(s); if (!T) return ''; const th = thOf(s); let c = baseCSS(s, th, T, s.layout);
    try { if (typeof F.css === 'function') c += '\n' + F.css(s, th, T); } catch (e) { console.error('HPL css', s.layout, e); }
    try { c += '\n' + fd1CSS(s, th, T); } catch (e) { console.error('HPL fd1 css', e); }
    try { const V = H.vdef[s.layout]; if (V && typeof V.css === 'function') c += `\n/* var ${H.varOf(s)} */` + V.css(s, th, T, H.varOf(s)); } catch (e) { console.error('HPL var css', s.layout, e); }
    return c; };
  { const base = siteHTML; siteHTML = (s, full, lang) => { const F = s && H.of(s); if (!F) return base(s, full, lang);
    H.resetStock(); let tmp = false; if (!s.theme && window.HPT && typeof HPT.rec === 'function') { s.theme = HPT.rec(typeKey()); tmp = true; }
    try { let h = base(s, full, lang); const c = H.css(s); if (!c) return h;
      h = h.replace('</style>', `/* hpl ${s.layout} */${c.replace(/<\/?style/gi, '')}</style>`).replace(/<body class="([^"]*)"/, `<body class="$1 hpl-on hpl-${s.layout} hpl-v-${H.varOf(s)}"`);
      h = h.replace(/<footer class="gf\b/g, `<footer class="gf hpt hpl-f hpl-${s.layout} hpl-v-${H.varOf(s)}`);
      return h; } catch (e) { console.error('HPL siteHTML', e); return base(s, full, lang); } finally { if (tmp) delete s.theme; } }; window.siteHTML = siteHTML; }
})();

/* ═════════════════════════ 계열 A 6종 (v2 · 사진 중심) ═════════════════════════
   대표님(2026-11-08 11:01): "이 정도 이미지로는 안 돼. 잘 만들어진 사이트 벤치마크를 강화해서 디자인을 대폭 올려."
   벤치마크 실측(scratchpad/fix6/bench2_D1.md): Stanford · Aalto · Minerva · RISD · NYU · ETH · Brilliant · Domestika · Skillshare · Coursera · 코드잇 · 클래스101 · 포스텍 등
   공통 기준: 제목 Pretendard 800 · 자간 -0.035em · 2줄 이내 / 본문 400 · 줄간 1.7 / 영문 머리말 작은 대문자 + 자간 .14em / 숫자 tabular
             섹션 여백 PC 120~144 · 휴대폰 64~80 / 12열 · 의도된 비대칭 1곳 이상 / 사진 3개 섹션 이상(첫 화면 · 소개 · 강좌 · 문의)
             사진 위 글자는 그라데이션 스크림 + 어두운 바탕색으로 4.5:1 / 원 · 블롭 · 그라데이션 덩어리 · 이모지 없음
   editorial  Stanford · Minerva: 명조 제목 + 21:9 사진 + 아래 실제 숫자 띠 · 세로 사진과 번호 목록 소개 · 대표 강좌 + 썸네일 목차 · 사진 곁 문의
   bento      Brilliant · Apple 교육: 제목 칸 + 큰 사진 칸 + 숫자 칸 + 강좌 칸 · 사진 칸이 섞인 소개 · 사진 카드 벤토 강좌 · 사진 배경 문의 칸
   fullbleed  Stanford · RCA: 화면 가득 사진 + 아래 정렬 제목 · 큰 문장 + 가장자리까지 닿는 21:9 사진 소개 · 세로 사진 카드 · 사진 문의 띠
   splitscreen Aalto: 어두운 글 판 + 사진 반반 · 사진/판 교차 소개 · 지그재그 강좌 · 사진 + 강조색 판 문의
   typo       RISD · NYU: 초대형 글자 첫 화면 아래 3:1 사진 띠 · 큰 글자 강좌 목록(작은 썸네일) · 초대형 숫자 · 화면 너비 글자 버튼
   portal     포스텍 · 대학 포털: 사진 배경 + 찾기 상자 · 공지 패널 · 빠른 메뉴 · 썸네일 표 강좌 · 공지+일정 2단 */
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
  const eyb = (v, cls) => v ? `<p class="hpl-ey${cls ? ' ' + cls : ''}">${E(v)}</p>` : '';
  const secHead = (d, cls) => `<header class="${cls}">${eyb(d.eyebrow)}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${d.sub ? `<p class="hpl-sd">${E(d.sub)}</p>` : typeof d.body === 'string' && d.body ? `<p class="hpl-sd">${E(d.body)}</p>` : ''}</header>`;
  const allLink = (s, n, cls) => { const h = u.clsHref(s); return h && n >= 2 ? `<a class="${cls}" ${u.aAttr(h)}><span>전체 보기</span>${u.ic('arrow', 16)}</a>` : ''; };
  const SEC = (cls, ctx, inner) => `<section class="hpt hpl-s ${cls}${ctx.alt ? ' is-alt' : ''}"><div class="hpl-w">${inner}</div></section>`;
  const noCls = ctx => hintS(ctx, `전체 공개한 ${u.term('cls')}이 이곳에 표시됩니다.`);
  const revList = n => u.reviews().slice(0, n || 3);
  const stars = r => r.st ? `<span class="hpl-stars" aria-label="별점 ${r.st}점">${'★'.repeat(Math.min(5, r.st))}</span>` : '';
  const lineMax = d => Math.max(4, ...u.lines(d).map(l => [...l].reduce((a, ch) => a + (/[\x00-\x7F]/.test(ch) ? .55 : 1), 0)));
  const cfig = (s, th, T, c, k, o) => H.fig('cls-' + c.id, s, th, T, Object.assign({ scene: 'card', small: 1, k, text: c.name, label: u.kindOf(c) }, o || {}));
  const ctaBtn = (s, d, cls) => { const h = u.askHref(s); return d.cta && h ? `<a class="${cls}" ${u.aAttr(h)}><span>${E(d.cta)}</span>${u.ic('arrow', 18)}</a>` : ''; };
  const ctaList = (I, cls) => I.length ? `<dl class="${cls}">${I.map(c => `<div><dt>${E(c.k)}</dt><dd>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : E(c.v)}</dd></div>`).join('')}</dl>` : '';
  /* 기존 hpth 섹션(FAQ · 오시는 길 · 강사 등)을 계열 글꼴 · 여백에 맞추는 덮개 */
  const baseFix = (P, o) => `${P}.hp-s{padding:var(--sec,${o.pad || 128}px) 0}${P}.hp-s .hp-sh h2,${P}.hp-s .hp-prose h2{font-family:${o.hf || 'inherit'};font-weight:${o.hw || 800};letter-spacing:${o.hl || '-.035em'}}${o.card ? `${P}.hp-s .hp-card,${P}.hp-s .hp-qa details,${P}.hp-s .hp-dl div{${o.card}}` : ''}${P}.hp-s .hp-ey{font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}${P} .hp-fl b{font-variant-numeric:tabular-nums}`;
  /* G1 토큰(docs/design-tokens.md) 연결: 제목 글꼴 · 굵기 · 자간 · 크기, 섹션 여백, 본문, 버튼 — 계열 CSS 맨 끝에 붙여 고정값을 덮는다.
     o.h1 · o.h2: 선택자, o.k1 · o.k2: 계열 고유 배율(전체 화면 사진형은 제목을 토큰보다 크게), o.ff: 제목 글꼴(기본 var(--hd-ff)), o.sec: false면 섹션 여백은 계열 값 유지 */
  const tokCSS = (P, o) => { const ff = o.ff || 'var(--hd-ff,inherit)', fw = o.fw || 'var(--hd-fw,800)'; const k1 = o.k1 || 1, k2 = o.k2 || 1;
    return `${P}{font-size:var(--t-body,16.5px);line-height:var(--lh-body,1.7)}
${o.h1 ? `${o.h1}{font-family:${ff};font-weight:${fw};letter-spacing:var(--hd-ls,-.035em);font-size:clamp(${o.m1 || 34}px,${(5.6 * k1).toFixed(1)}vw,calc(var(--t-h1,64px) * ${k1}))}` : ''}
${o.h2 ? `${o.h2}{font-family:${ff};font-weight:${fw};letter-spacing:var(--hd-ls,-.035em);font-size:clamp(28px,${(3.4 * k2).toFixed(1)}vw,calc(var(--t-h2,44px) * ${k2}))}` : ''}
${P} .hpl-btn{min-height:var(--btn-h,50px);padding:0 var(--btn-px,24px);border-radius:var(--br)}${P} .hpl-sd{font-size:var(--t-lead,17px)}
${P} a:focus-visible,${P} summary:focus-visible{outline:3px solid var(--ring,currentColor);outline-offset:3px}
@media(max-width:640px){${o.h1 ? `${o.h1}{font-size:max(${o.m1 || 34}px,calc(var(--t-h1,64px) * ${(0.56 * k1).toFixed(2)}))}` : ''}${o.h2 ? `${o.h2}{font-size:max(26px,calc(var(--t-h2,44px) * .66))}` : ''}${P} .hpl-btn{min-height:max(48px,var(--btn-h,50px))}}`; };
  /* 공통 글자 단계 · 머리말 · 숫자 */
  const typeCSS = (P, th, T, o) => { const px = pxf(th); o = o || {};
    return `${P}{font-family:var(--hpl-sans);font-weight:400}${P} .hpl-ey{margin:0 0 14px;font-size:${px(12.5)};font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--at);line-height:1.4}
${P}.hpl-s{padding:var(--sec,${px(o.pad || 128)}) 0;background:var(--bg)}@media(max-width:640px){${P}.hpl-s{padding:var(--sec-m,72px) 0}}${P}.hpl-s.is-alt{background:var(--alt)}${P} .hpl-sd{margin:16px 0 0;color:var(--mu);font-size:${px(17)};line-height:1.7;max-width:52ch}
${P} b,${P} time,${P} .tnum{font-variant-numeric:tabular-nums}${P} .hpl-img.is-hover img{transition:transform .6s cubic-bezier(.2,.7,.2,1)}
${P} a:hover .hpl-img img{transform:scale(1.035)}${P} .hpl-img img{transition:transform .6s cubic-bezier(.2,.7,.2,1)}`; };

  /* ─────────── 1. editorial · 매거진형 ─────────── */
  H.reg('editorial', { name: '매거진형', by: 'D1', desc: '명조 큰 제목과 넓은 사진 · 세로 사진 곁 소개 · 목차처럼 정리한 강좌', fits: ['adult', 'univ', 'lifelong', 'corp'],
    order: ['banner', 'features', 'classes', 'reviews', 'steps', 'faq', 'cta'], slots: ['hero', 'about', 'cls-*', 'cta'],
    hero(s, d, th, T) { const B = u.badges(); const F = u.facts();
      return `<section class="hpt hpl-hero ed-hero"><div class="hpl-w"><div class="ed-mast">${eyb(d.eyebrow || '', 'ed-kick') || `<p class="hpl-ey ed-kick">${E(S.org.name)}</p>`}${B.length ? `<ul class="ed-bd">${B.map(b => `<li>${E(b)}</li>`).join('')}</ul>` : ''}</div>
<div class="ed-top"><h1 class="ed-h1">${u.h1(d)}</h1><div class="ed-side">${d.sub ? `<p class="ed-sub">${E(d.sub)}</p>` : ''}<div class="ed-act">${btn1(s, d)}${btn2(s, d, 'ed-link')}</div></div></div></div>
<div class="ed-figw">${H.fig('hero', s, th, T, { d, cls: 'ed-fig', scene: 'hero', eager: 1 })}</div>${F.length >= 3 ? `<div class="hpl-w"><ul class="ed-fl n${Math.min(F.length, 4)}">${F.slice(0, 4).map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul></div>` : ''}</section>`; },
    sec: {
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('ed-feat', ctx, `<div class="ed-ab">${H.fig('about', s, th, T, { cls: 'ed-abf', scene: 'about' })}<div class="ed-abt">${secHead(d, 'ed-shh')}<ol class="ed-items">${C.map(([a, b], k) => `<li><span class="ed-ix">${String(k + 1).padStart(2, '0')}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></li>`).join('')}</ol></div></div>`); },
      plain(s, d, th, T, ctx) { if (u.cols(d).length) return this.features(s, d, th, T, ctx); if (!d.title && !d.body) return null;
        return SEC('ed-prose', ctx, `<div class="ed-two">${d.title ? `<header class="ed-shh">${eyb(d.eyebrow)}<h2>${br(d.title)}</h2></header>` : '<div></div>'}${typeof d.body === 'string' && d.body ? `<p class="ed-body">${br(d.body)}</p>` : ''}</div>`); },
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx); const [c0, ...R] = L;
        const lead = `<a class="ed-lead" href="#p-c-${E(c0.id)}">${cfig(s, th, T, c0, 0, { small: 0 })}<div class="ed-lt"><p class="ed-meta">${meta(c0).map(m => `<span>${E(m)}</span>`).join('')}</p><h3>${E(c0.name)}</h3>${descOf(c0) ? `<p class="ed-desc">${E(descOf(c0))}</p>` : ''}<p class="ed-pr"><b>${E(u.priceOf(c0))}</b><span class="ed-more">자세히 보기 ${u.ic('arrow', 16)}</span></p></div></a>`;
        const list = R.length ? `<ul class="ed-list">${R.map((c, k) => `<li><a href="#p-c-${E(c.id)}">${cfig(s, th, T, c, k + 1, { cls: 'ed-th' })}<span class="ed-k">${E(u.kindOf(c))}</span><b>${E(c.name)}</b><span class="ed-p">${E(u.perOf(c) || (u.lesOf(c) ? u.lesOf(c) + '차시' : ''))}</span><span class="ed-pp">${E(u.priceOf(c))}</span></a></li>`).join('')}</ul>` : '';
        return SEC('ed-cls', ctx, `<div class="ed-sh">${secHead(d, 'ed-shh')}${allLink(s, L.length, 'ed-link')}</div>${lead}${list}`); },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('ed-steps', ctx, `${secHead(d, 'ed-shh ed-one')}<ol class="ed-ol n${Math.min(C.length, 5)}">${C.map(([a, b], k) => `<li><span class="ed-no" aria-hidden="true">${k + 1}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol>`); },
      stats(s, d, th, T, ctx) { if ((d.hpt === 'facts' || !u.cols(d).length) && u.facts().length >= 3 && (s.sections || []).some(x => x && x.type === 'banner' && !x.hide)) return ctx.edit ? hintS(ctx, '실제 숫자는 첫 화면 사진 아래에 표시됩니다.') : '';
        const F = factsOf(d); if (F.length < 2) return hintS(ctx, '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        return `<section class="hpt hpl-s ed-facts"><div class="hpl-w"><ul class="ed-fl n${F.length}">${F.map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul></div></section>`; },
      reviews(s, d, th, T, ctx) { const R = revList(3); if (!R.length) return hintS(ctx, '실제 수강후기가 등록되면 이곳에 표시됩니다.'); const [r0, ...rr] = R;
        return SEC('ed-rv', ctx, `${secHead(d, 'ed-shh ed-one')}<figure class="ed-q"><blockquote>${E(String(r0.b).slice(0, 180))}</blockquote><figcaption>${stars(r0)}<b>${E(r0.w)}</b>${r0.c ? `<small>${E(r0.c)}</small>` : ''}</figcaption></figure>${rr.length ? `<div class="ed-qs">${rr.map(r => `<figure><blockquote>${E(String(r.b).slice(0, 140))}</blockquote><figcaption><b>${E(r.w)}</b>${r.c ? `<small>${E(r.c)}</small>` : ''}</figcaption></figure>`).join('')}</div>` : ''}`); },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); if (!d.title && !I.length) return null; const b = ctaBtn(s, d, 'hpl-btn pri');
        return `<section class="hpt hpl-s ed-cta"><div class="hpl-w"><div class="ed-ctab">${H.fig('cta', s, th, T, { cls: 'ed-cf', scene: 'cta' })}<div class="ed-ctt">${eyb(d.eyebrow)}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p class="ed-cb">${E(d.body)}</p>` : ''}${b ? `<div class="ed-act">${b}</div>` : ''}${ctaList(I, 'ed-ci')}</div></div></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-editorial'; const px = pxf(th); const ln = u.al(T.ink, .14); const sansT = /^(clean|tech|official|senior|)$/.test(th.id || ''); /* 고딕 테마에서도 매거진형은 명조 제목(계열 정체성), 명조 · 둥근 · 장식 테마는 테마 글꼴 */
      return `${typeCSS(P, th, T)}
${P} .ed-h1,${P} .ed-shh h2,${P} .ed-lead h3,${P} .ed-list b,${P} .ed-ctt h2,${P} .ed-q blockquote,${P} .ed-fl b,${P} .ed-no{font-family:var(--hpl-serif,var(--hd-ff,serif));color:var(--ink)}
${P}.ed-hero{background:var(--bg);padding:clamp(20px,3vw,32px) 0 clamp(56px,8vw,${px(112)})}
${P} .ed-mast{display:flex;align-items:center;justify-content:space-between;gap:12px 28px;flex-wrap:wrap;padding-bottom:14px;border-bottom:1px solid var(--ink)}${P} .ed-mast .hpl-ey{margin:0}
${P} .ed-bd{display:flex;flex-wrap:wrap;margin:0;padding:0;list-style:none;font-size:${px(13.5)};color:var(--mu)}${P} .ed-bd li+li{border-left:1px solid ${ln};margin-left:14px;padding-left:14px}
${P} .ed-top{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:24px 64px;align-items:end;padding:clamp(40px,6vw,${px(88)}) 0 clamp(32px,4vw,${px(56)})}
${P} .ed-h1{margin:0;font-weight:500;font-size:clamp(${px(40)},5.8vw,${px(84)});line-height:1.1;letter-spacing:-.035em;text-wrap:balance}
${P} .ed-sub{margin:0;font-size:${px(17)};line-height:1.75;color:var(--mu);border-top:2px solid var(--a);padding-top:18px}
${P} .ed-act{display:flex;flex-wrap:wrap;align-items:center;gap:14px 24px;margin-top:26px}
${P} .ed-link{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:${px(15.5)};color:var(--ink);border-bottom:1.5px solid currentColor;padding-bottom:3px}${P} .ed-link:hover{color:var(--at)}
${P} .ed-figw{max-width:1440px;margin:0 auto;padding:0 clamp(0px,2vw,24px)}${P} .ed-fig{aspect-ratio:2.35/1;background:${T.hd}}
${P} .ed-fl{list-style:none;margin:0;padding:clamp(28px,3vw,40px) 0 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}${P} .ed-fl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .ed-fl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
${P} .ed-fl li{display:flex;flex-direction:column;gap:6px;padding:0 24px}${P} .ed-fl li:first-child{padding-left:0}${P} .ed-fl li+li{border-left:1px solid ${ln}}
${P} .ed-fl b{font-weight:500;font-size:clamp(${px(34)},3.6vw,${px(52)});line-height:1;letter-spacing:-.03em}${P} .ed-fl b small{font-family:var(--hpl-sans);font-size:.36em;margin-left:5px;color:var(--mu);font-weight:600}${P} .ed-fl span{color:var(--mu);font-size:${px(14)}}
${P}.ed-facts{padding:clamp(40px,5vw,64px) 0;border-bottom:1px solid ${ln}}
${P} .ed-ab{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:32px;align-items:start}${P} .ed-abf{grid-column:1/span 5;aspect-ratio:4/5;position:sticky;top:24px}${P} .ed-abt{grid-column:7/span 6}
${P} .ed-shh h2{margin:0;font-weight:500;font-size:clamp(${px(30)},3.6vw,${px(48)});line-height:1.18;letter-spacing:-.03em}${P} .ed-one{margin-bottom:48px;max-width:760px}
${P} .ed-items{list-style:none;margin:40px 0 0;padding:0;border-top:1px solid var(--ink)}${P} .ed-items li{display:grid;grid-template-columns:56px minmax(0,1fr);gap:16px;padding:24px 0;border-bottom:1px solid ${ln}}
${P} .ed-ix{font-size:${px(13)};font-weight:700;color:var(--at);padding-top:4px;letter-spacing:.04em}${P} .ed-items h3{margin:0 0 6px;font-size:${px(19)};font-weight:700;letter-spacing:-.02em}${P} .ed-items p{margin:0;color:var(--mu);line-height:1.7}
${P} .ed-two{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:32px 64px}${P} .ed-body{margin:0;font-family:var(--hpl-serif,var(--hd-ff,serif));font-size:${px(20)};line-height:1.9;color:var(--ink)}
${P} .ed-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;border-bottom:1px solid var(--ink);padding-bottom:20px;margin-bottom:40px}
${P} .ed-lead{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px 32px;align-items:center;padding-bottom:48px}${P} .ed-lead .hpl-img{grid-column:1/span 7;aspect-ratio:3/2}${P} .ed-lt{grid-column:9/span 4}
${P} .ed-meta{display:flex;flex-wrap:wrap;margin:0 0 16px;font-size:${px(13.5)};color:var(--mu)}${P} .ed-meta span+span{border-left:1px solid ${ln};margin-left:12px;padding-left:12px}
${P} .ed-lead h3{margin:0;font-weight:500;font-size:clamp(${px(26)},2.6vw,${px(36)});line-height:1.25;letter-spacing:-.025em}${P} .ed-lead:hover h3{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:6px}
${P} .ed-desc{margin:14px 0 0;color:var(--mu);line-height:1.75}${P} .ed-pr{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:24px 0 0;padding-top:16px;border-top:1px solid ${ln}}${P} .ed-pr b{font-size:${px(19)}}${P} .ed-more{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--at);font-size:${px(14.5)}}
${P} .ed-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--ink)}${P} .ed-list a{display:grid;grid-template-columns:112px 96px minmax(0,1fr) auto 110px;gap:24px;align-items:center;padding:16px 0;border-bottom:1px solid ${ln};transition:background .15s}${P} .ed-list a:hover{background:${u.al(T.ink, .03)}}
${P} .ed-th{aspect-ratio:4/3}${P} .ed-k{font-size:${px(13)};color:var(--at);font-weight:700}${P} .ed-list b{font-weight:500;font-size:${px(21)};letter-spacing:-.02em}${P} .ed-list a:hover b{color:var(--at)}${P} .ed-p{color:var(--mu);font-size:${px(14)}}${P} .ed-pp{text-align:right;font-weight:700}
${P} .ed-ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:32px}${P} .ed-ol.n2{--n:2}${P} .ed-ol.n4{--n:4}${P} .ed-ol.n5{--n:5}${P} .ed-ol li{border-top:2px solid var(--ink);padding-top:18px}${P} .ed-no{display:block;font-size:${px(52)};line-height:1;color:var(--at);margin-bottom:16px;font-weight:500}${P} .ed-ol h3{margin:0 0 6px;font-size:${px(19)};font-weight:700}${P} .ed-ol p{margin:0;color:var(--mu);line-height:1.7}
${P} .ed-q{margin:0 0 48px;max-width:920px}${P} .ed-q blockquote{margin:0;font-size:clamp(${px(22)},2.6vw,${px(34)});line-height:1.55}${P} .ed-q blockquote::before{content:'“';color:var(--at);margin-right:2px}${P} .ed-q figcaption,${P} .ed-qs figcaption{display:flex;align-items:center;gap:10px;margin-top:18px;font-size:${px(14)};color:var(--mu)}${P} .ed-q figcaption b,${P} .ed-qs b{color:var(--ink)}
${P} .ed-qs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;border-top:1px solid ${ln};padding-top:28px}${P} .ed-qs figure{margin:0}${P} .ed-qs blockquote{margin:0;line-height:1.75}
${P}.ed-cta{border-top:1px solid ${ln}}${P} .ed-ctab{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:32px;align-items:center}${P} .ed-cf{grid-column:1/span 5;aspect-ratio:4/3}${P} .ed-ctt{grid-column:7/span 6}
${P} .ed-ctt h2{margin:0;font-weight:500;font-size:clamp(${px(30)},3.8vw,${px(52)});line-height:1.18;letter-spacing:-.03em}${P} .ed-cb{margin:16px 0 0;color:var(--mu);line-height:1.75;max-width:48ch}
${P} .ed-ci{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 32px;margin:36px 0 0;padding-top:24px;border-top:1px solid ${ln}}${P} .ed-ci dt{font-size:${px(12.5)};color:var(--mu)}${P} .ed-ci dd{margin:4px 0 0;font-weight:700;overflow-wrap:anywhere}
${baseFix(P, { hf: 'var(--hpl-serif,var(--hd-ff,serif))', hw: 500, hl: '-.025em', card: 'box-shadow:none;border:0;border-top:1px solid var(--ink);border-radius:0;background:transparent' })}
${P}.gf{background:var(--bg);color:var(--mu);border-top:1px solid var(--ink);padding:56px 0}${P}.gf b{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,700);letter-spacing:var(--hd-ls,-.02em);color:var(--ink);font-size:${px(26)}}${P}.gf .fl2,${P}.gf .fl2 a{color:var(--ink)}
@media(max-width:900px){${P} .ed-top,${P} .ed-two{grid-template-columns:1fr}${P} .ed-ab,${P} .ed-lead,${P} .ed-ctab{grid-template-columns:1fr}${P} .ed-abf,${P} .ed-abt,${P} .ed-lead .hpl-img,${P} .ed-lt,${P} .ed-cf,${P} .ed-ctt{grid-column:1/-1}${P} .ed-abf{position:static;aspect-ratio:3/2}${P} .ed-fig{aspect-ratio:16/9}${P} .ed-ol{grid-template-columns:1fr 1fr}${P} .ed-fl,${P} .ed-fl.n3{grid-template-columns:1fr 1fr;row-gap:24px}${P} .ed-fl li:nth-child(odd){border-left:0;padding-left:0}${P} .ed-qs{grid-template-columns:1fr}${P} .ed-list a{grid-template-columns:96px minmax(0,1fr) auto}${P} .ed-k,${P} .ed-p{display:none}}
@media(max-width:640px){${P} .ed-h1{font-size:${px(36)};line-height:1.16}${P} .ed-bd{display:none}${P} .ed-figw{padding:0}${P} .ed-fig{aspect-ratio:4/3}${P} .ed-sh{display:block}${P} .ed-sh .ed-link{margin-top:14px}${P} .ed-act .hpl-btn{flex:1 1 auto}
${P} .ed-list a{grid-template-columns:84px minmax(0,1fr);gap:4px 14px}${P} .ed-th{grid-row:span 2}${P} .ed-pp{grid-column:2;text-align:left;font-size:${px(14)};margin-top:-8px}${P} .ed-list b{font-size:${px(17)}}${P} .ed-ol{grid-template-columns:1fr;gap:20px}${P} .ed-ci{grid-template-columns:1fr}${P} .ed-items li{grid-template-columns:40px minmax(0,1fr)}}
${tokCSS(P, { h1: `${P} .ed-h1`, h2: `${P} .ed-shh h2,${P} .ed-ctt h2`, k1: 1.25, k2: 1.1, ff: sansT ? 'var(--hpl-serif,var(--hd-ff,serif))' : 'var(--hd-ff,var(--hpl-serif,var(--hd-ff,serif)))', fw: sansT ? '600' : 'var(--hd-fw,600)', m1: 36 })}`; }
  });

  /* ─────────── 2. bento · 벤토 격자 ─────────── */
  const restSpan = m => m <= 1 ? ['s6 r2'] : m === 2 ? ['s6', 's6'] : m === 3 ? ['s3', 's3', 's6'] : ['s3', 's3', 's3', 's3'];
  const tailSpan = n => n <= 0 ? [] : n === 1 ? ['s12'] : n === 2 ? ['s6', 's6'] : n === 3 ? ['s4', 's4', 's4'] : Array(n).fill('s3');
  H.reg('bento', { name: '벤토 격자', by: 'D1', desc: '제목 · 큰 사진 · 실제 숫자 · 강좌 칸을 맞물린 첫 화면 · 사진 카드 격자', fits: ['adult', 'corp', 'k12', 'voc'],
    order: ['banner', 'classes', 'features', 'steps', 'reviews', 'faq', 'cta'], slots: ['hero', 'about', 'cls-*', 'cta'],
    hero(s, d, th, T) { const F = u.facts(); const C = u.pub(); const B = u.badges();
      const main = `<div class="bt-t bt-main s7 r2">${eyb(d.eyebrow)}<h1>${u.h1(d)}</h1>${d.sub ? `<p class="bt-sub">${E(d.sub)}</p>` : ''}<div class="bt-act">${btn1(s, d)}${btn2(s, d, 'hpl-btn gh')}</div></div>`;
      const pic = H.fig('hero', s, th, T, { d, cls: 'bt-t bt-pic s5 r2', scene: 'hero', eager: 1 });
      const row = []; if (F.length >= 2) F.slice(0, 2).forEach(f => row.push(['s3', `<div class="bt-t bt-fact s3"><b>${fnum(f)}</b><span>${E(f.l)}</span></div>`]));
      else if (B.length) row.push(['s6', `<div class="bt-t bt-bd s6"><ul>${B.map(b => `<li>${u.ic('check', 16)}<span>${E(b)}</span></li>`).join('')}</ul></div>`]);
      if (C[0]) row.push(['s6', `<a class="bt-t bt-cls s6" href="#p-c-${E(C[0].id)}">${cfig(s, th, T, C[0], 0, { cls: 'bt-cth' })}<div class="bt-cb"><span class="bt-k">${E(u.kindOf(C[0]))}</span><h2>${E(C[0].name)}</h2><p class="bt-m">${meta(C[0]).slice(1).map(m => `<span>${E(m)}</span>`).join('')}</p><p class="bt-pr"><b>${E(u.priceOf(C[0]))}</b>${u.ic('arrow', 20)}</p></div></a>`]);
      return `<section class="hpt hpl-hero bt-hero"><div class="hpl-w"><div class="bt-g">${main}${pic}${row.map(r => r[1]).join('')}</div></div></section>`; },
    sec: {
      classes(s, d, th, T, ctx) { const L = u.clsList(d).slice(0, 5); if (!L.length) return noCls(ctx); const n = L.length;
        const big = c => `<a class="bt-t bt-cc big ${n === 1 ? 's12' : n === 2 ? 's6' : 's6 r2'}" href="#p-c-${E(c.id)}">${cfig(s, th, T, c, 0, { cls: 'bt-cf', small: 0 })}<span class="bt-shade" aria-hidden="true"></span><div class="bt-cb on-img"><span class="bt-k">${E(u.kindOf(c))}</span><h3>${E(c.name)}</h3><p class="bt-m">${meta(c).slice(1).map(m => `<span>${E(m)}</span>`).join('')}</p><p class="bt-pr"><b>${E(u.priceOf(c))}</b>${u.ic('arrow', 20)}</p></div></a>`;
        const sp = n === 2 ? ['s6'] : restSpan(n - 1);
        const sm = (c, k) => `<a class="bt-t bt-cc ${sp[k] || 's3'}" href="#p-c-${E(c.id)}">${cfig(s, th, T, c, k + 1, { cls: 'bt-cf', ratio: '16/10' })}<div class="bt-cb"><span class="bt-k">${E(u.kindOf(c))}</span><h3>${E(c.name)}</h3><p class="bt-m">${meta(c).slice(1, 2).map(m => `<span>${E(m)}</span>`).join('')}</p><p class="bt-pr"><b>${E(u.priceOf(c))}</b>${u.ic('arrow', 18)}</p></div></a>`;
        return SEC('bt-sec bt-cls', ctx, `<div class="bt-head">${secHead(d, 'bt-hh')}${allLink(s, n, 'bt-all')}</div><div class="bt-g">${big(L[0])}${L.slice(1).map(sm).join('')}</div>`); },
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null; const two = C.slice(0, 2), rest = C.slice(2); const ts = tailSpan(rest.length);
        const it = (a, b, k, sp) => `<article class="bt-t bt-f ${sp}"><span class="bt-fi">${u.ic(u.icOf(a + ' ' + b, k), 22)}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></article>`;
        return SEC('bt-sec bt-feat', ctx, `<div class="bt-head">${secHead(d, 'bt-hh')}</div><div class="bt-g">${H.fig('about', s, th, T, { cls: 'bt-t bt-pic2 s5 ' + (two.length > 1 ? 'r2' : ''), scene: 'about' })}${two.map(([a, b], k) => it(a, b, k, 's7 wide')).join('')}${rest.map(([a, b], k) => it(a, b, k + 2, ts[k])).join('')}</div>`); },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null; const n = Math.min(C.length, 4);
        return SEC('bt-sec bt-steps', ctx, `<div class="bt-head">${secHead(d, 'bt-hh')}</div><div class="bt-g">${C.map(([a, b], k) => `<article class="bt-t bt-st s${12 / n | 0}"><span class="bt-no" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div>`); },
      stats(s, d, th, T, ctx) { let F = factsOf(d); if (F.length < 2) return hintS(ctx, '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        if (d.hpt === 'facts' || !u.cols(d).length) { if ((s.sections || []).some(x => x && x.type === 'banner' && !x.hide)) F = F.slice(2); if (F.length < 2) return ''; }
        return `<section class="hpt hpl-s bt-sec bt-facts"><div class="hpl-w"><div class="bt-g">${F.map(f => `<div class="bt-t bt-fact s${12 / F.length | 0}"><b>${fnum(f)}</b><span>${E(f.l)}</span></div>`).join('')}</div></div></section>`; },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); if (!d.title && !I.length) return null; const b = ctaBtn(s, d, 'hpl-btn wh');
        return `<section class="hpt hpl-s bt-sec bt-cta"><div class="hpl-w"><div class="bt-g"><div class="bt-t bt-cm ${I.length ? 's8' : 's12'}">${H.fig('cta', s, th, T, { cls: 'bt-cbg', scene: 'cta', tone: 'dark' })}<span class="bt-shade" aria-hidden="true"></span><div class="bt-cmt">${eyb(d.eyebrow)}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : ''}${b}</div></div>${I.length ? `<div class="bt-cis s4">${I.map(c => `<div class="bt-t bt-c1"><span class="bt-fi">${u.ic(c.ic, 20)}</span><div><small>${E(c.k)}</small>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</div></div>`).join('')}</div>` : ''}</div></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-bento'; const px = pxf(th); const R = `calc(var(--r,16px) + 4px)`; const dk = T.hd; const dm = T.D.hm; const lnc = u.al(T.ink, .08);
      const shade = 'linear-gradient(0deg,rgba(0,0,0,.84) 0%,rgba(0,0,0,.62) 42%,rgba(0,0,0,.08) 78%)';
      return `${typeCSS(P, th, T, { pad: 112 })}${P}.hpl-s{padding:clamp(32px,4vw,56px) 0}${P}.hpl-s.is-alt{background:var(--bg)}
${P} .bt-g{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:${px(14)};grid-auto-flow:row dense}
${P} .bt-t{border-radius:${R};background:var(--alt);padding:clamp(22px,2.4vw,32px);position:relative;overflow:hidden;min-width:0;display:flex;flex-direction:column;gap:10px;color:var(--ink);margin:0}
${P} .s3{grid-column:span 3}${P} .s4{grid-column:span 4}${P} .s5{grid-column:span 5}${P} .s6{grid-column:span 6}${P} .s7{grid-column:span 7}${P} .s8{grid-column:span 8}${P} .s12{grid-column:1/-1}${P} .r2{grid-row:span 2}
${P}.bt-hero{padding:clamp(16px,2vw,24px) 0 clamp(24px,3vw,40px);background:var(--bg)}
${P} .bt-main{background:var(--as);justify-content:flex-end;padding:clamp(32px,4.4vw,64px);min-height:${px(520)}}${P} .bt-main .hpl-ey{color:${T.L.hy}}
${P} .bt-main h1{margin:0;font-size:clamp(${px(36)},4.4vw,${px(64)});line-height:1.1;letter-spacing:-.04em;font-weight:800;color:${T.L.hi};text-wrap:balance}
${P} .bt-sub{margin:10px 0 0;font-size:${px(17.5)};line-height:1.7;color:${T.L.hm};max-width:44ch}${P} .bt-act{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
${P} .hpl-btn.gh{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1px ${u.al(T.ink, .16)}}${P} .hpl-btn.gh:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}${P} .hpl-btn.wh{background:#fff;color:#111;align-self:flex-start;margin-top:14px}${P} .hpl-btn.wh:hover{background:${T.as}}
${P} .bt-pic,${P} .bt-pic2{padding:0;min-height:${px(260)};background:${dk}}${P} .bt-pic2{min-height:${px(320)}}
${P} .bt-fact{background:var(--alt);justify-content:space-between;min-height:${px(168)}}${P} .bt-fact b{font-size:clamp(${px(40)},4.2vw,${px(60)});font-weight:800;line-height:1;letter-spacing:-.045em;color:var(--ink)}${P} .bt-fact b small{font-size:.36em;margin-left:5px;color:var(--mu);font-weight:700;letter-spacing:-.01em}${P} .bt-fact span{color:var(--mu);font-size:${px(14)}}
${P} .bt-bd ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}${P} .bt-bd li{display:flex;align-items:center;gap:10px;font-weight:600}${P} .bt-bd li svg{color:var(--at)}
${P} .bt-cls{background:#fff;border:var(--bd,1px solid ${lnc});flex-direction:row;padding:0;gap:0}${P} .bt-cth{width:42%;flex:none;min-height:100%}${P} .bt-cls .bt-cb{padding:24px 26px;display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}${P} .bt-cls h2{margin:0;font-size:${px(21)};line-height:1.3;letter-spacing:-.025em;font-weight:800}${P} .bt-cls:hover h2{text-decoration:underline;text-underline-offset:4px}
${P} .bt-k{font-size:${px(12)};font-weight:700;letter-spacing:.08em;color:var(--at)}${P} .bt-m{display:flex;flex-wrap:wrap;gap:4px 12px;margin:0;font-size:${px(13.5)};color:var(--mu)}${P} .bt-pr{display:flex;align-items:center;justify-content:space-between;margin:auto 0 0;padding-top:10px}${P} .bt-pr b{font-size:${px(18)};font-weight:800}
${P} .bt-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:clamp(40px,6vw,${px(88)}) 4px 28px}${P} .bt-hh h2{margin:0;font-size:clamp(${px(30)},3.4vw,${px(46)});letter-spacing:-.04em;line-height:1.15;font-weight:800;max-width:20ch}
${P} .bt-all{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--ink);white-space:nowrap;border-bottom:1.5px solid currentColor;padding-bottom:2px}
${P} .bt-cc{background:#fff;border:var(--bd,1px solid ${lnc});padding:0;gap:0;transition:box-shadow var(--dur,.18s) var(--ease,ease),transform var(--dur,.18s) var(--ease,ease)}${P} .bt-cc:hover{box-shadow:var(--sh-h,0 18px 40px -24px rgba(15,23,42,.45));transform:translateY(-2px)}
${P} .bt-cc .bt-cb{padding:clamp(18px,1.8vw,24px);display:flex;flex-direction:column;gap:8px;flex:1}${P} .bt-cc h3{margin:0;font-size:${px(18)};line-height:1.35;letter-spacing:-.02em;font-weight:800}
${P} .bt-cc.big{background:${dk};min-height:${px(440)};justify-content:flex-end}${P} .bt-cc.big .bt-cf{position:absolute;inset:0}${P} .bt-shade{position:absolute;inset:0;background:${shade};pointer-events:none}
${P} .bt-cc .bt-cb.on-img{position:relative;color:#fff;padding:clamp(24px,2.6vw,36px);flex:0 0 auto;margin-top:auto}${P} .on-img h3{color:#fff;font-size:clamp(${px(24)},2.4vw,${px(32)})}${P} .on-img .bt-k,${P} .on-img .bt-m,${P} .on-img .bt-pr{color:#fff}
${P} .bt-f{flex-direction:row;align-items:flex-start;gap:18px}${P} .bt-f.wide{min-height:${px(150)};align-items:center}${P} .bt-f h3{margin:0 0 6px;font-size:${px(20)};font-weight:800;letter-spacing:-.025em;line-height:1.35}${P} .bt-f p{margin:0;color:var(--mu);line-height:1.65}
${P} .bt-fi{width:48px;height:48px;border-radius:var(--rs,12px);display:grid;place-items:center;background:#fff;color:var(--at);flex:none}
${P} .bt-st{background:var(--alt);min-height:${px(200)}}${P} .bt-no{font-size:${px(15)};font-weight:700;color:var(--at);letter-spacing:.06em;margin-bottom:auto}${P} .bt-st h3{margin:28px 0 0;font-size:${px(20)};font-weight:800;letter-spacing:-.02em}${P} .bt-st p{margin:0;color:var(--mu);line-height:1.65}
${P}.bt-cta{padding-bottom:clamp(48px,6vw,88px)}${P} .bt-cm{background:${dk};color:#fff;padding:0;min-height:${px(360)};justify-content:flex-end}${P} .bt-cbg{position:absolute;inset:0}${P} .bt-cmt{position:relative;padding:clamp(28px,4vw,56px);display:flex;flex-direction:column;gap:12px}
${P} .bt-cmt h2{margin:0;color:#fff;font-size:clamp(${px(28)},3.4vw,${px(44)});line-height:1.2;letter-spacing:-.04em;font-weight:800;max-width:18ch}${P} .bt-cmt p{margin:0;color:#fff;font-size:${px(16.5)};line-height:1.7;max-width:48ch}${P} .bt-cmt .hpl-ey{color:#fff;margin:0}
${P} .bt-cis{display:flex;flex-direction:column;gap:${px(14)}}${P} .bt-c1{flex-direction:row;align-items:center;gap:14px;flex:1}${P} .bt-c1 small{display:block;color:var(--mu);font-size:${px(13)}}${P} .bt-c1 b,${P} .bt-c1 a{font-weight:800;font-size:${px(16.5)};overflow-wrap:anywhere}
${baseFix(P, { pad: 112, hw: 800, hl: '-.04em', card: `border-radius:${R};box-shadow:none;border:0;background:var(--alt)` })}
${P}.gf{background:var(--bg);color:var(--mu);padding:0 0 28px}${P}.gf .wrap{background:var(--alt);border-radius:${R};padding:36px clamp(20px,3vw,40px);max-width:calc(1200px - 2 * var(--hpl-gut));margin:0 auto}${P}.gf b{color:var(--ink)}${P}.gf .fl2,${P}.gf .fl2 a{color:var(--ink)}
@media(max-width:900px){${P} .s5,${P} .s7,${P} .s8,${P} .s4{grid-column:1/-1}${P} .s3,${P} .s6{grid-column:span 6}${P} .r2{grid-row:auto}${P} .bt-main{min-height:0}${P} .bt-pic{min-height:0;aspect-ratio:4/3}${P} .bt-pic2{min-height:0;aspect-ratio:16/9}${P} .bt-cls{grid-column:1/-1}${P} .bt-cc.big{grid-column:1/-1;min-height:${px(380)}}}
@media(max-width:640px){${P}.hpl-s{padding:24px 0}${P} .bt-g{gap:10px}${P} .s3,${P} .s6{grid-column:1/-1}${P} .bt-fact{grid-column:span 6;min-height:0}${P} .bt-main{padding:28px 22px}${P} .bt-main h1{font-size:${px(32)}}${P} .bt-act .hpl-btn{flex:1 1 auto}
${P} .bt-head{flex-direction:column;align-items:flex-start;padding:48px 2px 18px}${P} .bt-f{min-height:0}${P} .bt-cls{flex-direction:column}${P} .bt-cth{width:100%;aspect-ratio:16/9;min-height:0}${P} .bt-cc.big{min-height:${px(340)}}${P} .bt-cm{min-height:${px(320)}}}
${tokCSS(P, { h1: `${P} .bt-main h1`, h2: `${P} .bt-hh h2,${P} .bt-cmt h2`, k1: 1, k2: 1, sec: false, m1: 32 })}`; }
  });

  /* ─────────── 3. fullbleed · 전체 화면 사진 ─────────── */
  H.reg('fullbleed', { name: '전체 화면 사진', by: 'D1', desc: '화면을 가득 채운 사진 위 아래 정렬 큰 제목 · 가장자리까지 닿는 사진 소개 · 세로 사진 카드', fits: ['adult', 'univ', 'lifelong', 'voc', 'k12'],
    order: ['banner', 'features', 'classes', 'stats', 'reviews', 'steps', 'faq', 'cta'], slots: ['hero', 'about', 'cls-*', 'cta'],
    hero(s, d, th, T) { const B = u.badges();
      return `<section class="hpt hpl-hero fb-hero">${H.fig('hero', s, th, T, { d, cls: 'fb-bg', scene: 'hero', eager: 1, tone: 'dark' })}<div class="fb-scrim" aria-hidden="true"></div><div class="hpl-w fb-in">${eyb(d.eyebrow, 'fb-ey')}<h1 class="fb-h1">${u.h1(d)}</h1>
<div class="fb-row">${d.sub ? `<p class="fb-sub">${E(d.sub)}</p>` : '<span></span>'}<div class="fb-act">${btn1(s, d, 'hpl-btn wh')}${btn2(s, d, 'hpl-btn ol')}</div></div>${B.length ? `<ul class="fb-bd">${B.map(b => `<li>${E(b)}</li>`).join('')}</ul>` : ''}</div></section>`; },
    sec: {
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return `<section class="hpt hpl-s fb-feat${ctx.alt ? ' is-alt' : ''}"><div class="hpl-w"><div class="fb-fh"><div>${eyb(d.eyebrow)}${d.title ? `<h2>${br(d.title)}</h2>` : ''}</div>${d.sub ? `<p class="hpl-sd">${E(d.sub)}</p>` : typeof d.body === 'string' && d.body ? `<p class="hpl-sd">${E(d.body)}</p>` : ''}</div></div>${H.fig('about', s, th, T, { cls: 'fb-wide', scene: 'about' })}<div class="hpl-w"><div class="fb-fl n${Math.min(C.length, 4)}">${C.map(([a, b], k) => `<article><span class="fb-ix">${String(k + 1).padStart(2, '0')}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div></div></section>`; },
      plain(s, d, th, T, ctx) { if (u.cols(d).length) return this.features(s, d, th, T, ctx); return null; },
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx);
        return SEC('fb-cls', ctx, `<div class="fb-sh">${secHead(d, 'fb-hh')}${allLink(s, L.length, 'fb-all')}</div><div class="fb-rail n${Math.min(L.length, 4)}" role="list">${L.map((c, k) => `<a class="fb-card" role="listitem" href="#p-c-${E(c.id)}">${cfig(s, th, T, c, k, { dark: 1 })}<span class="fb-cs" aria-hidden="true"></span><div class="fb-cb"><span class="fb-k">${E(u.kindOf(c))}</span><h3>${E(c.name)}</h3><p>${meta(c).slice(1).map(m => `<span>${E(m)}</span>`).join('')}<span>${E(u.priceOf(c))}</span></p></div></a>`).join('')}</div>`); },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return `<section class="hpt hpl-s fb-steps"><div class="hpl-w">${secHead(d, 'fb-hh')}<ol class="fb-ol n${Math.min(C.length, 5)}">${C.map(([a, b], k) => `<li><span class="fb-no" aria-hidden="true">${k + 1}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol></div></section>`; },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); if (!d.title && !I.length) return null; const b = ctaBtn(s, d, 'hpl-btn wh');
        return `<section class="hpt hpl-s fb-cta">${H.fig('cta', s, th, T, { cls: 'fb-bg', scene: 'cta', tone: 'dark' })}<div class="fb-scrim c" aria-hidden="true"></div><div class="hpl-w fb-ci">${eyb(d.eyebrow, 'fb-ey')}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p class="fb-sub">${E(d.body)}</p>` : ''}${b ? `<div class="fb-act c">${b}</div>` : ''}${I.length ? `<ul class="fb-cl">${I.map(c => `<li><small>${E(c.k)}</small>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</li>`).join('')}</ul>` : ''}</div></section>`; },
      stats(s, d, th, T, ctx) { const F = factsOf(d); if (F.length < 2) return hintS(ctx, '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        return `<section class="hpt hpl-s fb-facts"><div class="hpl-w"><ul class="fb-nl n${F.length}">${F.map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-fullbleed'; const px = pxf(th); const dk = T.hd; const dm = T.D.hm; const sc = 'linear-gradient(0deg,rgba(0,0,0,.86) 0%,rgba(0,0,0,.66) 38%,rgba(0,0,0,.32) 66%,rgba(0,0,0,.18) 100%),linear-gradient(90deg,rgba(0,0,0,.42) 0%,rgba(0,0,0,0) 62%)';
      return `${typeCSS(P, th, T)}
${P}.fb-hero{position:relative;min-height:min(92vh,${px(900)});display:flex;align-items:flex-end;background:${dk};color:#fff;overflow:hidden;padding:0}
${P} .fb-bg{position:absolute!important;inset:0;background:${dk}}${P} .fb-scrim{position:absolute;inset:0;background:${sc};pointer-events:none}${P} .fb-scrim.c{background:linear-gradient(0deg,rgba(0,0,0,.72),rgba(0,0,0,.6))}
${P} .fb-in{position:relative;z-index:1;width:100%;padding-top:${px(160)};padding-bottom:clamp(40px,5vw,72px);text-shadow:0 1px 24px rgba(0,0,0,.3)}
${P} .fb-ey{color:#fff;margin-bottom:20px}
${P} .fb-h1{margin:0;max-width:16ch;font-size:clamp(${px(44)},6.6vw,${px(100)});line-height:1.04;letter-spacing:-.045em;font-weight:800;color:#fff;text-wrap:balance}
${P} .fb-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px 48px;align-items:end;margin-top:clamp(28px,4vw,48px);padding-top:24px;border-top:1px solid rgba(255,255,255,.42)}
${P} .fb-sub{margin:0;max-width:46ch;font-size:${px(18)};line-height:1.7;color:#fff}${P} .fb-act{display:flex;flex-wrap:wrap;gap:10px}${P} .fb-act.c{justify-content:center;margin-top:32px}
${P} .hpl-btn.wh{background:#fff;color:#111;text-shadow:none}${P} .hpl-btn.wh:hover{background:${T.as}}${P} .hpl-btn.ol{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.85);color:#fff;text-shadow:none}${P} .hpl-btn.ol:hover{background:rgba(255,255,255,.14)}
${P} .fb-bd{display:flex;flex-wrap:wrap;gap:6px 24px;list-style:none;margin:20px 0 0;padding:0;font-size:${px(14)};color:#fff}${P} .fb-bd li::before{content:'';display:inline-block;width:14px;height:1px;background:#fff;margin-right:10px;vertical-align:middle}
${P} .fb-fh{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:16px 64px;align-items:end;padding-bottom:clamp(36px,4vw,56px)}${P} .fb-fh h2{margin:0;font-size:clamp(${px(32)},4.4vw,${px(60)});line-height:1.12;letter-spacing:-.045em;font-weight:800;text-wrap:balance}${P} .fb-fh .hpl-sd{margin:0}
${P} .fb-wide{aspect-ratio:21/9;max-width:1600px;margin:0 auto;background:${dk}}
${P} .fb-fl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin-top:clamp(36px,4vw,56px)}${P} .fb-fl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-fl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .fb-fl.n1{grid-template-columns:1fr}
${P} .fb-fl article{padding:0 clamp(16px,2vw,28px) 0 0;border-top:1px solid var(--ink);padding-top:20px}${P} .fb-fl article+article{padding-left:clamp(16px,2vw,28px)}${P} .fb-ix{display:block;font-size:${px(12.5)};font-weight:700;letter-spacing:.08em;color:var(--at);margin-bottom:22px}${P} .fb-fl h3{margin:0 0 8px;font-size:${px(20)};font-weight:800;letter-spacing:-.025em}${P} .fb-fl p{margin:0;color:var(--mu);line-height:1.7;font-size:${px(15.5)}}
${P} .fb-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:36px}${P} .fb-hh h2{margin:0;font-size:clamp(${px(30)},4vw,${px(52)});line-height:1.15;letter-spacing:-.045em;font-weight:800}
${P} .fb-all{display:inline-flex;align-items:center;gap:6px;font-weight:700;white-space:nowrap;border-bottom:1.5px solid currentColor;padding-bottom:2px}
${P} .fb-rail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}${P} .fb-rail.n1{grid-template-columns:minmax(0,1fr);max-width:520px}${P} .fb-rail.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-rail.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
${P} .fb-card{position:relative;display:block;border-radius:var(--r);overflow:hidden;aspect-ratio:3/4;background:${dk};isolation:isolate}${P} .fb-card .hpl-img{position:absolute;inset:0}
${P} .fb-cs{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.66) 34%,rgba(0,0,0,0) 64%)}${P} .fb-cb{position:absolute;left:0;right:0;bottom:0;padding:22px;color:#fff;display:flex;flex-direction:column;gap:8px}
${P} .fb-k{font-size:${px(12)};font-weight:700;letter-spacing:.08em;color:#fff}${P} .fb-cb h3{margin:0;color:#fff;font-size:${px(21)};line-height:1.3;font-weight:800;letter-spacing:-.025em}${P} .fb-cb p{margin:0;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:${px(13.5)};color:#fff}${P} .fb-card:hover h3{text-decoration:underline;text-underline-offset:4px}
${P}.fb-steps{background:${dk};color:#fff}${P}.fb-steps .fb-hh h2{color:#fff}${P}.fb-steps .hpl-ey{color:${T.D.hy}}${P}.fb-steps .hpl-sd{color:${dm}}
${P} .fb-ol{list-style:none;margin:48px 0 0;padding:0;display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:0}${P} .fb-ol.n2{--n:2}${P} .fb-ol.n4{--n:4}${P} .fb-ol.n5{--n:5}${P} .fb-ol li{border-top:1px solid rgba(255,255,255,.3);padding:22px 24px 0 0}${P} .fb-no{display:block;font-size:${px(56)};font-weight:800;line-height:1;letter-spacing:-.05em;color:#fff;margin-bottom:18px}${P} .fb-ol h3{margin:0 0 6px;color:#fff;font-size:${px(19)};font-weight:800}${P} .fb-ol p{margin:0;color:${dm};line-height:1.7}
${P}.fb-cta{position:relative;overflow:hidden;background:${dk};color:#fff;text-align:center;padding:clamp(96px,13vw,${px(176)}) 0}${P} .fb-ci{position:relative;z-index:1}${P} .fb-ci .hpl-ey{color:#fff}${P} .fb-ci h2{margin:0 auto;max-width:18ch;color:#fff;font-size:clamp(${px(32)},5vw,${px(64)});line-height:1.12;letter-spacing:-.045em;font-weight:800;text-wrap:balance}${P} .fb-ci .fb-sub{margin:18px auto 0}
${P} .fb-cl{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 48px;list-style:none;margin:40px 0 0;padding:0}${P} .fb-cl small{display:block;font-size:${px(12.5)};color:#fff}${P} .fb-cl b,${P} .fb-cl a{font-weight:700;color:#fff}
${P}.fb-facts{padding:clamp(48px,6vw,80px) 0}${P} .fb-nl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}${P} .fb-nl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-nl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .fb-nl li{border-top:2px solid var(--ink);padding-top:16px;display:flex;flex-direction:column;gap:8px}${P} .fb-nl b{font-size:clamp(${px(44)},5vw,${px(72)});font-weight:800;line-height:1;letter-spacing:-.05em}${P} .fb-nl b small{font-size:.34em;margin-left:5px;letter-spacing:-.01em}${P} .fb-nl span{color:var(--mu)}
${baseFix(P, { hw: 800, hl: '-.045em' })}
${P}.gf{background:${dk};color:${dm};padding:56px 0}${P}.gf b{color:#fff;font-size:${px(22)}}${P}.gf .fl2,${P}.gf .fl2 a{color:#fff}
@media(max-width:900px){${P} .fb-rail,${P} .fb-rail.n3,${P} .fb-rail.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-fh{grid-template-columns:1fr}${P} .fb-fl,${P} .fb-fl.n3{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:32px}${P} .fb-fl article:nth-child(odd){padding-left:0}${P} .fb-nl,${P} .fb-ol{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .fb-wide{aspect-ratio:16/9}}
@media(max-width:640px){${P}.fb-hero{min-height:${px(660)}}${P} .fb-in{padding-top:${px(120)}}${P} .fb-h1{font-size:${px(40)};line-height:1.1}${P} .fb-row{grid-template-columns:1fr}${P} .fb-act .hpl-btn{flex:1 1 auto}${P} .fb-sub{font-size:${px(16)}}${P} .fb-wide{aspect-ratio:4/3}
${P} .fb-sh{display:block}${P} .fb-sh .fb-all{margin-top:14px}${P} .fb-rail,${P} .fb-rail.n2,${P} .fb-rail.n3{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;margin:0 calc(var(--hpl-gut) * -1);padding:0 var(--hpl-gut) 6px;scrollbar-width:none}${P} .fb-rail::-webkit-scrollbar{display:none}${P} .fb-card{flex:0 0 78%;scroll-snap-align:start}${P} .fb-rail.n1 .fb-card{flex-basis:100%}
${P} .fb-fl,${P} .fb-fl.n2,${P} .fb-fl.n3,${P} .fb-ol{grid-template-columns:1fr}${P} .fb-fl article,${P} .fb-fl article+article{padding:18px 0 0}${P} .fb-ix{margin-bottom:10px}${P} .fb-cl{flex-direction:column;gap:14px}}
${tokCSS(P, { h1: `${P} .fb-h1`, h2: `${P} .fb-fh h2,${P} .fb-hh h2,${P} .fb-ci h2`, k1: 1.5, k2: 1.25, m1: 40 })}`; }
  });

  /* ─────────── 4. splitscreen · 좌우 분할 ─────────── */
  H.reg('splitscreen', { name: '좌우 분할', by: 'D1', desc: '어두운 글 판과 사진을 반반 · 사진과 판이 엇갈리는 소개 · 지그재그 강좌', fits: ['adult', 'univ', 'corp', 'lifelong', 'public'],
    order: ['banner', 'features', 'classes', 'steps', 'reviews', 'faq', 'cta'], slots: ['hero', 'about', 'cls-*', 'cta'],
    hero(s, d, th, T) { const F = u.facts().slice(0, 3);
      return `<section class="hpt hpl-hero sp-hero"><div class="sp-txt"><div class="sp-in">${eyb(d.eyebrow, 'sp-ey')}<h1>${u.h1(d)}</h1>${d.sub ? `<p class="sp-sub">${E(d.sub)}</p>` : ''}<div class="sp-act">${btn1(s, d, 'hpl-btn wh')}${btn2(s, d, 'sp-link')}</div></div>${F.length >= 2 ? `<ul class="sp-facts n${F.length}">${F.map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul>` : ''}</div>${H.fig('hero', s, th, T, { d, cls: 'sp-fig', scene: 'hero', eager: 1 })}</section>`; },
    sec: {
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return `<section class="hpt hpl-s sp-feat"><div class="sp-half">${H.fig('about', s, th, T, { cls: 'sp-hf', scene: 'about' })}<div class="sp-hp">${secHead(d, 'sp-hh')}<ul class="sp-list">${C.map(([a, b], k) => `<li><span class="sp-fi">${u.ic(u.icOf(a + ' ' + b, k), 22)}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></li>`).join('')}</ul></div></div></section>`; },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('sp-steps', ctx, `<div class="sp-two"><div class="sp-stick">${secHead(d, 'sp-hh')}</div><ol class="sp-ol">${C.map(([a, b], k) => `<li><span class="sp-no" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></li>`).join('')}</ol></div>`); },
      classes(s, d, th, T, ctx) { const L = u.clsList(d).slice(0, 4); if (!L.length) return noCls(ctx);
        return `<section class="hpt hpl-s sp-cls${ctx.alt ? ' is-alt' : ''}"><div class="hpl-w"><div class="sp-sh">${secHead(d, 'sp-hh')}${allLink(s, L.length, 'sp-link dk')}</div></div><div class="sp-rows">${L.map((c, k) => `<a class="sp-row${k % 2 ? ' rev' : ''}" href="#p-c-${E(c.id)}">${cfig(s, th, T, c, k, { small: 0 })}<div class="sp-rb"><span class="sp-k">${E(u.kindOf(c))}</span><h3>${E(c.name)}</h3>${descOf(c) ? `<p class="sp-d">${E(descOf(c))}</p>` : ''}<dl class="sp-dl">${u.perOf(c) ? `<div><dt>기간</dt><dd>${E(u.perOf(c))}</dd></div>` : ''}${u.lesOf(c) ? `<div><dt>차시</dt><dd>${u.lesOf(c)}차시</dd></div>` : ''}<div><dt>수강료</dt><dd>${E(u.priceOf(c))}</dd></div></dl><span class="sp-more">자세히 보기 ${u.ic('arrow', 18)}</span></div></a>`).join('')}</div></section>`; },
      stats(s, d, th, T, ctx) { if (!(d.hpt === 'facts' || !u.cols(d).length)) return null; if (!(s.sections || []).some(x => x && x.type === 'banner' && !x.hide)) return null;
        return ctx.edit ? hintS(ctx, '실제 숫자는 첫 화면 왼쪽 아래 줄에 표시됩니다.') : ''; },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); if (!d.title && !I.length) return null; const b = ctaBtn(s, d, 'hpl-btn wh');
        return `<section class="hpt hpl-s sp-cta"><div class="sp-half">${H.fig('cta', s, th, T, { cls: 'sp-hf', scene: 'cta' })}<div class="sp-cl">${eyb(d.eyebrow)}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : ''}${b}${I.length ? `<ul class="sp-cr">${I.map(c => `<li><small>${E(c.k)}</small>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</li>`).join('')}</ul>` : ''}</div></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-splitscreen'; const px = pxf(th); const ln = u.al(T.ink, .12); const dk = T.hd; const dm = T.D.hm; const ca = u.fit(T.a, '#ffffff', 4.8, '#000000');
      return `${typeCSS(P, th, T)}
${P}.sp-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:min(90vh,${px(880)});background:${dk};color:#fff;padding:0}
${P} .sp-txt{display:flex;flex-direction:column;justify-content:space-between;gap:48px;padding:clamp(48px,6vw,96px) clamp(24px,5vw,88px) clamp(32px,4vw,56px)}${P} .sp-in{margin:auto 0;max-width:560px}
${P} .sp-ey{color:${T.D.hy};display:flex;align-items:center;gap:12px;margin-bottom:24px}${P} .sp-ey::before{content:'';width:28px;height:1px;background:currentColor}
${P}.sp-hero h1{margin:0;font-size:clamp(${px(36)},4.4vw,${px(64)});line-height:1.12;letter-spacing:-.04em;font-weight:800;color:#fff;text-wrap:balance}
${P} .sp-sub{margin:22px 0 0;font-size:${px(17.5)};line-height:1.75;color:${dm}}${P} .sp-act{display:flex;flex-wrap:wrap;align-items:center;gap:14px 24px;margin-top:36px}
${P} .hpl-btn.wh{background:#fff;color:#111}${P} .hpl-btn.wh:hover{background:${T.as}}
${P} .sp-link{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#fff;border-bottom:1.5px solid currentColor;padding-bottom:2px;white-space:nowrap}${P} .sp-link.dk{color:var(--ink)}
${P} .sp-facts{list-style:none;margin:0;padding:24px 0 0;border-top:1px solid rgba(255,255,255,.24);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}${P} .sp-facts.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .sp-facts b{display:block;font-size:${px(32)};font-weight:800;letter-spacing:-.04em;color:#fff;line-height:1.1}${P} .sp-facts b small{font-size:.48em;margin-left:3px;color:${dm}}${P} .sp-facts span{font-size:${px(13.5)};color:${dm}}${P} .sp-facts li.tx b{font-size:${px(26)}!important}
${P} .sp-fig{min-height:100%;background:${dk}}
${P}.sp-feat,${P}.sp-cta{padding:0}${P} .sp-half{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:${px(640)}}${P} .sp-hf{min-height:100%;background:${dk}}
${P} .sp-hp{background:var(--alt);padding:clamp(56px,8vw,${px(120)}) clamp(24px,6vw,96px);display:flex;flex-direction:column;justify-content:center}
${P} .sp-hh h2{margin:0;font-size:clamp(${px(30)},3.6vw,${px(48)});line-height:1.16;letter-spacing:-.04em;font-weight:800;text-wrap:balance}
${P} .sp-list,${P} .sp-ol{list-style:none;margin:36px 0 0;padding:0;border-top:1px solid ${ln}}${P} .sp-list li,${P} .sp-ol li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:20px;padding:24px 0;border-bottom:1px solid ${ln}}
${P} .sp-fi{width:48px;height:48px;border-radius:var(--rs,10px);display:grid;place-items:center;background:#fff;color:var(--at)}
${P} .sp-list h3,${P} .sp-ol h3{margin:0 0 6px;font-size:${px(19)};font-weight:800;letter-spacing:-.02em}${P} .sp-list p,${P} .sp-ol p{margin:0;color:var(--mu);line-height:1.7}
${P} .sp-two{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:32px}${P} .sp-stick{grid-column:1/span 4;position:sticky;top:32px;align-self:start}${P} .sp-ol{grid-column:6/span 7;margin-top:0}${P} .sp-no{font-size:${px(14)};font-weight:700;color:var(--at);letter-spacing:.06em;padding-top:4px}
${P}.sp-cls{padding-bottom:0}${P} .sp-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:clamp(36px,4vw,56px)}
${P} .sp-rows{display:flex;flex-direction:column}${P} .sp-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:${px(460)}}${P} .sp-row .hpl-img{min-height:100%;background:${dk}}${P} .sp-row.rev .hpl-img{order:2}
${P} .sp-rb{display:flex;flex-direction:column;justify-content:center;gap:12px;padding:clamp(36px,5vw,88px);background:var(--bg)}${P} .sp-row:nth-child(even) .sp-rb{background:var(--alt)}
${P} .sp-k{font-size:${px(12.5)};font-weight:700;letter-spacing:.08em;color:var(--at)}${P} .sp-rb h3{margin:0;font-size:clamp(${px(24)},2.6vw,${px(36)});line-height:1.22;letter-spacing:-.035em;font-weight:800}${P} .sp-d{margin:0;color:var(--mu);line-height:1.75;max-width:46ch}
${P} .sp-dl{display:flex;flex-wrap:wrap;gap:12px 32px;margin:12px 0 0;padding-top:16px;border-top:1px solid ${ln}}${P} .sp-dl dt{font-size:${px(12.5)};color:var(--mu)}${P} .sp-dl dd{margin:2px 0 0;font-weight:700}${P} .sp-more{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-weight:700;color:var(--at)}${P} .sp-row:hover h3{text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:2px}
${P} .sp-cl{background:${ca};color:#fff;padding:clamp(56px,8vw,${px(120)}) clamp(24px,6vw,96px);display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:16px}${P} .sp-cl .hpl-ey{color:#fff;margin:0}${P} .sp-cl h2{margin:0;color:#fff;font-size:clamp(${px(30)},3.8vw,${px(50)});line-height:1.16;letter-spacing:-.04em;font-weight:800}${P} .sp-cl>p{margin:0;color:#fff;line-height:1.7;max-width:46ch}
${P} .sp-cr{list-style:none;margin:20px 0 0;padding:0;width:100%;border-top:1px solid rgba(255,255,255,.3)}${P} .sp-cr li{padding:16px 0;border-bottom:1px solid rgba(255,255,255,.3)}${P} .sp-cr small{display:block;color:#fff;font-size:${px(12.5)}}${P} .sp-cr b,${P} .sp-cr a{font-size:${px(19)};font-weight:800;color:#fff;overflow-wrap:anywhere}
${baseFix(P, { hw: 800, hl: '-.04em' })}
${P}.gf{background:${dk};color:${dm};padding:56px 0}${P}.gf b{color:#fff;font-size:${px(22)}}${P}.gf .fl2,${P}.gf .fl2 a{color:#fff}
@media(max-width:900px){${P}.sp-hero,${P} .sp-half{grid-template-columns:1fr;min-height:0}${P} .sp-fig,${P} .sp-hf{order:-1;aspect-ratio:4/3;min-height:0}${P} .sp-two{grid-template-columns:1fr}${P} .sp-stick,${P} .sp-ol{grid-column:1/-1;position:static}${P} .sp-row{grid-template-columns:1fr;min-height:0}${P} .sp-row .hpl-img{aspect-ratio:16/10;min-height:0}${P} .sp-row.rev .hpl-img{order:0}}
@media(max-width:640px){${P} .sp-txt{padding:40px var(--hpl-gut) 28px;gap:32px}${P}.sp-hero h1{font-size:${px(34)};line-height:1.18}${P} .sp-sub{font-size:${px(16)}}${P} .sp-act .hpl-btn{flex:1 1 auto}${P} .sp-facts b{font-size:${px(24)}}${P} .sp-sh{display:block}${P} .sp-sh .sp-link{margin-top:14px}${P} .sp-rb{padding:28px var(--hpl-gut) 40px}${P} .sp-hp,${P} .sp-cl{padding:56px var(--hpl-gut)}${P} .sp-list li,${P} .sp-ol li{gap:14px;padding:20px 0}${P} .sp-fi{width:42px;height:42px}}
${tokCSS(P, { h1: `${P}.sp-hero h1`, h2: `${P} .sp-hh h2,${P} .sp-cl h2`, k1: 1, k2: 1.1, m1: 34 })}`; }
  });

  /* ─────────── 5. typo · 큰 글자 ─────────── */
  H.reg('typo', { name: '큰 글자', by: 'D1', desc: '초대형 글자와 넓은 여백 · 제목 아래 가로로 긴 사진 띠 · 큰 글자 강좌 목록 · 초대형 숫자', fits: ['adult', 'corp', 'univ', 'k12', 'voc'],
    order: ['banner', 'stats', 'classes', 'features', 'reviews', 'steps', 'faq', 'cta'], slots: ['hero', 'about', 'cls-*'],
    hero(s, d, th, T) { const B = u.badges(); const m = lineMax(d); const mx = Math.max(56, Math.min(156, Math.floor(1120 / m))); const vw = (mx / 12.4).toFixed(2); const mb = Math.max(36, Math.min(64, Math.floor(330 / m)));
      const strip = H.fig('hero', s, th, T, { d, cls: 'ty-strip', scene: 'hero', eager: 1, need: 1 });
      return `<section class="hpt hpl-hero ty-hero" style="--ty-fs:clamp(${mb}px,${vw}vw,${mx}px);--ty-fm:${mb}px"><div class="hpl-w"><div class="ty-top">${eyb(d.eyebrow || S.org.name, 'ty-ey')}${B.length ? `<ul class="ty-bd">${B.map(b => `<li>${E(b)}</li>`).join('')}</ul>` : ''}</div>
<h1 class="ty-h1">${u.h1(d)}</h1><div class="ty-bot"><span class="ty-bar" aria-hidden="true"></span><div>${d.sub ? `<p class="ty-sub">${E(d.sub)}</p>` : ''}<div class="ty-act">${btn1(s, d, 'ty-go')}${btn2(s, d, 'ty-link')}</div></div></div></div>${strip ? `<div class="ty-sw">${strip}</div>` : ''}</section>`; },
    sec: {
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx);
        return SEC('ty-cls', ctx, `<div class="ty-sh">${secHead(d, 'ty-hh')}${allLink(s, L.length, 'ty-link')}</div><ul class="ty-list">${L.map((c, k) => `<li><a href="#p-c-${E(c.id)}">${cfig(s, th, T, c, k, { cls: 'ty-th' })}<b>${E(c.name)}</b><span class="ty-m">${meta(c).map(m => `<span>${E(m)}</span>`).join('')}</span><span class="ty-p">${E(u.priceOf(c))}</span><span class="ty-ar" aria-hidden="true">${u.ic('arrow', 28)}</span></a></li>`).join('')}</ul>`); },
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('ty-feat', ctx, `<div class="ty-two"><div class="ty-fhd">${secHead(d, 'ty-hh big')}${H.fig('about', s, th, T, { cls: 'ty-af', scene: 'about', need: 1 })}</div><div class="ty-fl">${C.map(([a, b]) => `<article><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div></div>`); },
      plain(s, d, th, T, ctx) { if (u.cols(d).length) return this.features(s, d, th, T, ctx); if (!d.title && !d.body) return null;
        return SEC('ty-prose', ctx, `${eyb(d.eyebrow)}${d.title ? `<h2 class="ty-big2">${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p class="ty-body">${br(d.body)}</p>` : ''}`); },
      steps(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('ty-steps', ctx, `${secHead(d, 'ty-hh')}<ol class="ty-ol">${C.map(([a, b], k) => `<li><span class="ty-no" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol>`); },
      stats(s, d, th, T, ctx) { const F = factsOf(d); if (F.length < 2) return hintS(ctx, '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        return `<section class="hpt hpl-s ty-facts"><div class="hpl-w"><ul class="ty-nl n${F.length}">${F.map(f => `${fli(f)}<b>${fnum(f)}</b><span>${E(f.l)}</span></li>`).join('')}</ul></div></section>`; },
      reviews(s, d, th, T, ctx) { const R = revList(3); if (!R.length) return hintS(ctx, '실제 수강후기가 등록되면 이곳에 표시됩니다.');
        return SEC('ty-rv', ctx, `${secHead(d, 'ty-hh')}<div class="ty-qs">${R.map(r => `<figure><blockquote>${E(String(r.b).slice(0, 150))}</blockquote><figcaption>${stars(r)}<b>${E(r.w)}</b>${r.c ? `<small>${E(r.c)}</small>` : ''}</figcaption></figure>`).join('')}</div>`); },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); const h = u.askHref(s); if (!d.title && !I.length) return null;
        return `<section class="hpt hpl-s ty-cta"><div class="hpl-w">${d.title ? `<h2 class="ty-ct">${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p class="ty-cb">${E(d.body)}</p>` : ''}${d.cta && h ? `<a class="ty-huge" ${u.aAttr(h)}><span>${E(d.cta)}</span>${u.ic('arrow', 64)}</a>` : ''}${ctaList(I, 'ty-ci')}</div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-typo'; const px = pxf(th); const ln = u.al(T.ink, .14);
      return `${typeCSS(P, th, T, { pad: 144 })}
${P}.ty-hero{background:var(--bg);padding:clamp(24px,3vw,40px) 0 clamp(56px,8vw,${px(104)})}
${P} .ty-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px 32px;flex-wrap:wrap;padding-bottom:clamp(40px,7vw,${px(104)})}${P} .ty-ey{margin:0;color:var(--ink)}
${P} .ty-bd{display:flex;flex-wrap:wrap;gap:4px 24px;list-style:none;margin:0;padding:0;font-size:${px(14)};color:var(--mu)}
${P} .ty-h1{margin:0;font-size:var(--ty-fs);line-height:1;letter-spacing:-.025em;font-weight:700;color:var(--ink);word-break:keep-all}
${P} .ty-bot{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;margin-top:clamp(40px,6vw,${px(88)});align-items:start}${P} .ty-bar{grid-column:1/span 2;display:block;width:96px;height:8px;background:var(--a);margin-top:12px}${P} .ty-bot>div{grid-column:6/span 7}
${P} .ty-sub{margin:0;font-size:clamp(${px(18)},1.8vw,${px(24)});line-height:1.6;color:var(--mu);max-width:36ch;letter-spacing:-.015em}${P} .ty-act{display:flex;flex-wrap:wrap;align-items:center;gap:16px 32px;margin-top:32px}
${P} .ty-go{display:inline-flex;align-items:center;gap:12px;font-size:clamp(${px(22)},2.2vw,${px(30)});font-weight:800;letter-spacing:-.03em;color:var(--ink);border-bottom:4px solid var(--a);padding-bottom:6px}${P} .ty-go:hover{color:var(--at)}
${P} .ty-link{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--ink);border-bottom:1.5px solid currentColor;padding-bottom:2px;white-space:nowrap}
${P} .ty-sw{max-width:1440px;margin:clamp(56px,7vw,${px(96)}) auto 0;padding:0 clamp(0px,2vw,24px)}${P} .ty-strip{aspect-ratio:3/1;background:${T.hd}}
${P} .ty-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:28px}
${P} .ty-hh h2{margin:0;font-size:clamp(${px(32)},4.4vw,${px(60)});line-height:1.06;letter-spacing:-.05em;font-weight:800}${P} .ty-hh.big h2{font-size:clamp(${px(36)},5.4vw,${px(76)})}
${P} .ty-list{list-style:none;margin:0;padding:0;border-bottom:1px solid var(--ink)}${P} .ty-list a{display:grid;grid-template-columns:120px minmax(0,1fr) auto auto 40px;gap:8px 32px;align-items:center;padding:clamp(18px,2.4vw,28px) 0;border-top:1px solid var(--ink);transition:color .15s}
${P} .ty-th{aspect-ratio:4/3}${P} .ty-list b{font-size:clamp(${px(24)},3.2vw,${px(44)});font-weight:800;letter-spacing:-.045em;line-height:1.15}${P} .ty-list a:hover{color:var(--at)}${P} .ty-m{display:flex;flex-wrap:wrap;gap:2px 14px;font-size:${px(14)};color:var(--mu)}${P} .ty-p{font-weight:800;font-size:${px(18)};text-align:right}${P} .ty-ar{display:grid;place-items:center;transition:transform .2s}${P} .ty-list a:hover .ty-ar{transform:translateX(6px)}
${P} .ty-two{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:40px 32px;align-items:start}${P} .ty-fhd{grid-column:1/span 6}${P} .ty-af{aspect-ratio:4/3;margin-top:40px;max-width:520px}${P} .ty-fl{grid-column:8/span 5;display:flex;flex-direction:column;gap:clamp(28px,3vw,44px);padding-top:8px}
${P} .ty-fl h3{margin:0 0 8px;font-size:clamp(${px(22)},2.2vw,${px(30)});font-weight:800;letter-spacing:-.04em;line-height:1.25}${P} .ty-fl p{margin:0;color:var(--mu);line-height:1.75;font-size:${px(16)}}
${P} .ty-big2{margin:0;max-width:20ch;font-size:clamp(${px(32)},5vw,${px(68)});line-height:1.1;letter-spacing:-.05em;font-weight:800}${P} .ty-body{margin:32px 0 0 auto;max-width:56ch;color:var(--mu);font-size:${px(18)};line-height:1.8}
${P} .ty-ol{list-style:none;margin:48px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px}${P} .ty-no{display:block;font-size:${px(64)};font-weight:800;line-height:1;letter-spacing:-.06em;color:var(--at);margin-bottom:16px}${P} .ty-ol h3{margin:0 0 6px;font-size:${px(21)};font-weight:800}${P} .ty-ol p{margin:0;color:var(--mu);line-height:1.7}
${P}.ty-facts{padding:clamp(56px,7vw,96px) 0;border-top:1px solid ${ln};border-bottom:1px solid ${ln}}${P} .ty-nl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}${P} .ty-nl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .ty-nl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
${P} .ty-nl b{display:block;font-size:clamp(${px(56)},8vw,${px(128)});font-weight:800;line-height:.95;letter-spacing:-.065em;color:var(--ink)}${P} .ty-nl b small{font-size:.28em;letter-spacing:-.02em;margin-left:6px;color:var(--at)}${P} .ty-nl span{display:block;margin-top:12px;color:var(--mu);font-size:${px(15)}}
${P} .ty-qs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:40px;margin-top:44px}${P} .ty-qs figure{margin:0}${P} .ty-qs blockquote{margin:0;font-size:${px(22)};font-weight:700;line-height:1.55;letter-spacing:-.025em}${P} .ty-qs figcaption{display:flex;gap:10px;align-items:center;margin-top:16px;color:var(--mu);font-size:${px(14)}}${P} .ty-qs b{color:var(--ink)}
${P}.ty-cta{padding:clamp(80px,11vw,${px(152)}) 0}${P} .ty-ct{margin:0;max-width:24ch;font-size:clamp(${px(24)},2.6vw,${px(34)});line-height:1.3;letter-spacing:-.03em;font-weight:800}${P} .ty-cb{margin:12px 0 0;color:var(--mu);max-width:52ch;line-height:1.7}
${P} .ty-huge{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:clamp(32px,4vw,56px);padding:clamp(16px,2vw,28px) 0;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink);font-size:clamp(${px(40)},8vw,${px(120)});font-weight:800;letter-spacing:-.06em;line-height:1;color:var(--ink);transition:color .15s}${P} .ty-huge:hover{color:var(--at)}${P} .ty-huge svg{width:.6em;height:.6em;flex:none}
${P} .ty-ci{display:flex;flex-wrap:wrap;gap:16px 48px;margin:32px 0 0}${P} .ty-ci dt{font-size:${px(13)};color:var(--mu)}${P} .ty-ci dd{margin:2px 0 0;font-weight:800;font-size:${px(17)}}
${baseFix(P, { pad: 144, hw: 800, hl: '-.05em', card: 'box-shadow:none;border:0;border-top:1px solid var(--ink);border-radius:0;background:transparent' })}
${P}.gf{background:var(--bg);color:var(--mu);border-top:1px solid var(--ink);padding:56px 0}${P}.gf b{color:var(--ink);font-size:${px(30)};font-weight:800;letter-spacing:-.04em}${P}.gf .fl2,${P}.gf .fl2 a{color:var(--ink)}
@media(max-width:900px){${P} .ty-bot,${P} .ty-two{grid-template-columns:1fr}${P} .ty-bar{display:none}${P} .ty-bot>div,${P} .ty-fhd,${P} .ty-fl{grid-column:1/-1}${P} .ty-nl,${P} .ty-nl.n3{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:36px}${P} .ty-list a{grid-template-columns:96px minmax(0,1fr) auto}${P} .ty-m{grid-column:2/-1;order:2}${P} .ty-ar{display:none}${P} .ty-strip{aspect-ratio:2/1}}
@media(max-width:640px){${P} .ty-h1{font-size:var(--ty-fm);line-height:1.06}${P} .ty-top{padding-bottom:40px}${P} .ty-bd{display:none}${P} .ty-sw{padding:0}${P} .ty-strip{aspect-ratio:4/3}${P} .ty-sh{display:block}${P} .ty-sh .ty-link{margin-top:16px}${P} .ty-list a{grid-template-columns:72px minmax(0,1fr);gap:4px 14px}${P} .ty-th{grid-row:span 3}${P} .ty-list b{font-size:${px(22)}}${P} .ty-p{text-align:left;font-size:${px(15)}}${P} .ty-huge{font-size:${px(40)}}${P} .ty-nl b{font-size:${px(56)}}${P} .ty-qs blockquote{font-size:${px(19)}}${P} .ty-ci{flex-direction:column}}
${tokCSS(P, { h2: `${P} .ty-hh h2`, k2: 1.35 })}${P} .ty-h1,${P} .ty-nl b,${P} .ty-list b,${P} .ty-huge,${P} .ty-fl h3,${P} .ty-big2{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800)}`; }
  });

  /* ─────────── 6. portal · 기관 포털 ─────────── */
  H.reg('portal', { name: '기관 포털', by: 'D1', desc: '사진 배경 위 찾기 상자 · 공지 패널 · 빠른 메뉴 · 썸네일 표 강좌 · 공지와 일정 2단(대학 · 공공)', fits: ['univ', 'public', 'voc', 'lifelong', 'corp'],
    order: ['banner', 'notices', 'classes', 'features', 'steps', 'faq', 'cta'], slots: ['hero', 'space', 'cls-*'],
    hero(s, d, th, T) { const C = u.pub(); const N = u.noticeList(4); const M = u.menus(s).slice(0, 6); const ch = u.clsHref(s); const cl = u.term('cls');
      const srch = ch ? `<a class="pt-srch" ${u.aAttr(ch)}><span class="pt-si">${u.ic('search', 22)}</span><span class="pt-sp">어떤 ${E(cl)}을 찾으세요?</span><span class="pt-sb">${E(cl)} 전체 보기</span></a>` : '';
      const pop = C.length ? `<div class="pt-pop"><span class="pt-pl">많이 찾는 ${E(cl)}</span>${C.slice(0, 4).map(c => `<a href="#p-c-${E(c.id)}">${E(c.name)}</a>`).join('')}</div>` : '';
      const nm = u.menuOf(s, 'notice');
      const side = N.length ? `<aside class="pt-side"><div class="pt-ph"><h2>공지사항</h2>${nm ? `<a href="#p-m-${E(nm.id)}" class="pt-more" aria-label="공지 전체 보기">${u.ic('plus', 18)}</a>` : ''}</div><ul class="pt-nl">${N.map(n => `<li><b>${E(n.title)}</b><time>${E(u.dot(n.at || '').slice(0, 10))}</time></li>`).join('')}</ul></aside>` : '';
      /* v34.5 FA(FIXLIST 18): 빠른 메뉴 = 머리글 메뉴 되풀이 대신 실제 행동(HPS.actions: 신청 · 일정 · 상담 · 공지) */
      const A = window.HPS && typeof HPS.actions === 'function' ? HPS.actions(s, 4) : M.map((m, k) => ({ l: m.l, h: u.menuHref(m), ic: u.icOf(m.l, k + 1) }));
      const qk = A.length >= 2 ? `<nav class="pt-qk n${A.length}" aria-label="바로가기">${A.map(q => `<a ${u.aAttr(q.h)}><span class="pt-qi">${u.ic(q.ic, 24)}</span><b>${E(q.l)}</b>${q.sub ? `<small class="pt-qs">${E(q.sub)}</small>` : ''}</a>`).join('')}</nav>` : '';
      return `<section class="hpt hpl-hero pt-hero"><div class="pt-band">${H.fig('hero', s, th, T, { d, cls: 'pt-bg', scene: 'hero', eager: 1 })}<span class="pt-scr" aria-hidden="true"></span><div class="hpl-w pt-g${side ? '' : ' one'}"><div class="pt-main">${eyb(d.eyebrow, 'pt-ey')}<h1>${u.h1(d)}</h1>${d.sub ? `<p class="pt-sub">${E(d.sub)}</p>` : ''}${srch}${pop}${(d.cta || d.cta2) ? `<div class="pt-act">${btn1(s, d, 'hpl-btn wh')}${btn2(s, d, 'hpl-btn ol')}</div>` : ''}</div>${side}</div></div>${qk ? `<div class="hpl-w">${qk}</div>` : ''}</section>`; },
    sec: {
      classes(s, d, th, T, ctx) { const L = u.clsList(d); if (!L.length) return noCls(ctx);
        return SEC('pt-cls', ctx, `<div class="pt-sh">${secHead(d, 'pt-hh')}${allLink(s, L.length, 'pt-all')}</div><div class="pt-tb" role="table" aria-label="${E(d.title || u.term('cls') + ' 목록')}"><div class="pt-tr pt-th" role="row"><span role="columnheader"><i class="pt-sr">사진</i></span><span role="columnheader">구분</span><span role="columnheader">${E(u.term('cls'))}명</span><span role="columnheader">기간</span><span role="columnheader">수강료</span></div>${L.map((c, k) => `<a class="pt-tr" role="row" href="#p-c-${E(c.id)}"><span role="cell" class="pt-tc">${cfig(s, th, T, c, k, { cls: 'pt-th2' })}</span><span role="cell" class="pt-k">${E(u.kindOf(c))}</span><b role="cell">${E(c.name)}</b><span role="cell" class="pt-p">${E(u.perOf(c) || (u.lesOf(c) ? u.lesOf(c) + '차시' : '-'))}</span><span role="cell" class="pt-pr">${E(u.priceOf(c))}</span></a>`).join('')}</div>`); },
      notices(s, d, th, T, ctx) { const N = u.noticeList(+d.n || 5); const C = u.pub().filter(c => c.start || c.end).sort((a, b) => String(a.start || a.end).localeCompare(String(b.start || b.end))).slice(0, 5);
        if (!N.length && !C.length) return hintS(ctx, '공지사항을 올리거나 강좌에 시작일을 넣으면 공지 · 일정이 표시됩니다.'); const nm = u.menuOf(s, 'notice');
        const np = N.length ? `<div class="pt-pn"><div class="pt-ph"><h3>${E(d.title || '공지사항')}</h3>${nm ? `<a href="#p-m-${E(nm.id)}" class="pt-all">전체 보기 ${u.ic('arrow', 15)}</a>` : ''}</div><ul class="pt-nl">${N.map(n => `<li><b>${E(n.title)}</b><time>${E(u.dot(n.at || '').slice(0, 10))}</time></li>`).join('')}</ul></div>` : '';
        const cp = C.length ? `<div class="pt-pn"><div class="pt-ph"><h3>교육 일정</h3></div><ul class="pt-cal">${C.map(c => { const sd = String(c.start || c.end || ''); return `<li><span class="pt-dt"><b>${E(sd.slice(8, 10) || '-')}</b><small>${E(sd.slice(0, 7).replace('-', '.'))}</small></span><span class="pt-ct"><b>${E(c.name)}</b><small>${E(u.perOf(c))}</small></span></li>`; }).join('')}</ul></div>` : '';
        return SEC('pt-nt', ctx, `<div class="pt-2${np && cp ? '' : ' one'}">${np}${cp}</div>`); },
      features(s, d, th, T, ctx) { const C = u.cols(d); if (!C.length) return null;
        return SEC('pt-feat', ctx, `<div class="pt-fw">${H.fig('space', s, th, T, { cls: 'pt-sf', scene: 'space' })}<div class="pt-fr"><div class="pt-sh">${secHead(d, 'pt-hh')}</div><div class="pt-fg n${Math.min(C.length, 4)}">${C.map(([a, b], k) => `<article><span class="pt-fi">${u.ic(u.icOf(a + ' ' + b, k), 22)}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></article>`).join('')}</div></div></div>`); },
      tiles(s, d, th, T, ctx) { return this.features(s, d, th, T, ctx); },
      cta(s, d, th, T, ctx) { const I = ctaItems(d); if (!d.title && !I.length) return null;
        return `<section class="hpt hpl-s pt-cta"><div class="hpl-w"><div class="pt-cb"><div class="pt-cl">${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : ''}</div>${I.length ? `<ul class="pt-ci">${I.map(c => `<li><span class="pt-cic">${u.ic(c.ic, 20)}</span><div><small>${E(c.k)}</small>${c.h ? `<a ${u.aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</div></li>`).join('')}</ul>` : ''}${ctaBtn(s, d, 'hpl-btn pri')}</div></div></section>`; }
    },
    css(s, th, T) { const P = '.hpl-portal'; const px = pxf(th); const ln = u.al(T.ink, .12); const B = T.B; const dk = T.hbB; const sc = `linear-gradient(90deg,${u.al(T.hbB, .94)} 0%,${u.al(T.hbB, .82)} 46%,${u.al(T.hbB, .45)} 100%)`;
      return `${typeCSS(P, th, T, { pad: 112 })}
${P}.pt-hero{background:var(--bg);padding:0 0 clamp(32px,4vw,48px)}${P} .pt-band{position:relative;background:${dk};color:#fff;padding:clamp(56px,7vw,${px(104)}) 0 clamp(88px,9vw,${px(128)});overflow:hidden}${P} .pt-bg{position:absolute!important;inset:0}${P} .pt-scr{position:absolute;inset:0;background:${sc}}
${P} .pt-g{position:relative;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:32px;align-items:center}${P} .pt-main{grid-column:1/span 7}${P} .pt-side{grid-column:9/span 4}${P} .pt-g.one .pt-main{grid-column:1/span 8}
${P} .pt-ey{color:#fff}${P}.pt-hero h1{margin:0;font-size:clamp(${px(32)},3.8vw,${px(52)});line-height:1.18;letter-spacing:-.04em;font-weight:800;color:#fff;text-wrap:balance}${P} .pt-sub{margin:16px 0 0;font-size:${px(17)};line-height:1.7;color:#fff;max-width:52ch}
${P} .pt-srch{display:flex;align-items:center;gap:12px;margin-top:32px;background:#fff;color:var(--ink);border-radius:var(--br);padding:8px 8px 8px 20px;box-shadow:0 20px 44px -22px rgba(0,0,0,.6);max-width:640px;transition:box-shadow .15s}${P} .pt-srch:hover{box-shadow:0 0 0 3px ${u.al('#ffffff', .4)},0 20px 44px -22px rgba(0,0,0,.6)}
${P} .pt-si{color:var(--at);display:grid}${P} .pt-sp{flex:1;min-width:0;color:var(--mu);font-size:${px(16.5)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${P} .pt-sb{flex:none;background:var(--a);color:var(--on);font-weight:700;padding:13px 20px;border-radius:calc(var(--br) - 2px);font-size:${px(15)}}
${P} .pt-pop{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:18px}${P} .pt-pl{font-size:${px(13.5)};color:#fff;margin-right:4px}${P} .pt-pop a{font-size:${px(13.5)};color:#fff;background:rgba(0,0,0,.58);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.4);padding:6px 12px;border-radius:999px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${P} .pt-pop a:hover{background:rgba(0,0,0,.62)}
${P} .pt-act{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}${P} .hpl-btn.wh{background:#fff;color:#111}${P} .hpl-btn.ol{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.8);color:#fff}${P} .hpl-btn.ol:hover{background:rgba(255,255,255,.14)}
${P} .pt-side{background:#fff;color:var(--ink);border-radius:var(--r);padding:24px 26px;box-shadow:0 28px 56px -30px rgba(0,0,0,.6)}
${P} .pt-ph{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:2px solid var(--ink)}${P} .pt-ph h2,${P} .pt-ph h3{margin:0;font-size:${px(18)};font-weight:800;color:var(--ink)}${P} .pt-more{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;box-shadow:inset 0 0 0 1px ${ln};color:var(--ink)}${P} .pt-more:hover{background:var(--as)}
${P} .pt-nl{list-style:none;margin:0;padding:0}${P} .pt-nl li{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid ${ln}}${P} .pt-nl b{flex:1;min-width:0;font-weight:500;font-size:${px(15)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${P} .pt-nl li:hover b{text-decoration:underline}${P} .pt-nl time{flex:none;color:var(--mu);font-size:${px(13)}}
${P} .pt-qk{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));margin-top:calc(clamp(48px,5vw,72px) * -1);background:#fff;border-radius:var(--r);box-shadow:0 24px 48px -30px rgba(15,23,42,.5),0 0 0 1px ${ln};position:relative;z-index:2;overflow:hidden}${P} .pt-qk.n3{--n:3}${P} .pt-qk.n5{--n:5}${P} .pt-qk.n6{--n:6}
${P} .pt-qk a{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 10px;text-align:center;font-size:${px(15)};color:var(--ink);transition:background .15s}${P} .pt-qk a+a{border-left:1px solid ${ln}}${P} .pt-qk a:hover{background:var(--as)}${P} .pt-qi{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--as);color:var(--at)}${P} .pt-qk b{font-weight:700;line-height:1.35}${P} .pt-qk.n2{--n:2}${P} .pt-qs{display:block;max-width:100%;font-size:${px(13)};color:${u.fit ? u.fit(T.mu || '#5B6170', '#ffffff', 4.6) : '#4B5263'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;margin-top:-4px}
${P} .pt-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:28px}${P} .pt-hh h2{margin:0;font-size:clamp(${px(26)},2.8vw,${px(36)});font-weight:800;letter-spacing:-.035em;line-height:1.25}
${P} .pt-all{display:inline-flex;align-items:center;gap:4px;font-weight:700;color:var(--at);font-size:${px(14.5)};white-space:nowrap}
${P} .pt-tb{border-top:2px solid var(--ink)}${P} .pt-tr{display:grid;grid-template-columns:96px 100px minmax(0,1fr) 210px 110px;gap:20px;align-items:center;padding:14px 12px;border-bottom:1px solid ${ln};transition:background .15s}${P} a.pt-tr:hover{background:var(--as)}${P} a.pt-tr:hover>b{text-decoration:underline}
${P} .pt-th{background:var(--alt);font-size:${px(13)};font-weight:700;color:var(--mu);padding-top:12px;padding-bottom:12px}${P}.is-alt .pt-th{background:#fff}${P} .pt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}${P} .pt-th2{aspect-ratio:4/3;border-radius:var(--rs,6px)}
${P} .pt-k{justify-self:start;font-size:${px(12.5)};font-weight:700;color:var(--at);background:var(--as);padding:3px 10px;border-radius:var(--br)}${P} .pt-tr>b{font-weight:700;font-size:${px(16.5)}}${P} .pt-p{color:var(--mu);font-size:${px(14)}}${P} .pt-pr{font-weight:700;text-align:right}
${P} .pt-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}${P} .pt-2.one{grid-template-columns:1fr}${P} .pt-pn{background:#fff;border-radius:var(--r);padding:26px;border:var(--bd,1px solid ${ln})}
${P} .pt-cal{list-style:none;margin:0;padding:0}${P} .pt-cal li{display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid ${ln}}${P} .pt-dt{flex:none;width:58px;display:flex;flex-direction:column;align-items:center;padding:6px 0;border-radius:var(--rs,8px);background:var(--as);color:var(--at)}${P} .pt-dt b{font-size:${px(20)};line-height:1.1}${P} .pt-dt small{font-size:11px}${P} .pt-ct{min-width:0;display:flex;flex-direction:column}${P} .pt-ct b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${P} .pt-ct small{color:var(--mu);font-size:${px(13)}}
${P} .pt-fw{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:32px;align-items:stretch}${P} .pt-sf{grid-column:1/span 4;border-radius:var(--r);min-height:${px(360)}}${P} .pt-fr{grid-column:5/span 8}
${P} .pt-fg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-radius:var(--r);border:var(--bd,1px solid ${ln});background:#fff;overflow:hidden}${P} .pt-fg.n1{grid-template-columns:1fr}${P} .pt-fg.n3 article:last-child{grid-column:1/-1}
${P} .pt-fg article{display:flex;gap:14px;padding:24px;border-left:1px solid ${ln};margin-left:-1px;border-top:1px solid ${ln};margin-top:-1px;transition:background .15s}${P} .pt-fg article:hover{background:var(--as)}${P} .pt-fi{flex:none;width:44px;height:44px;border-radius:var(--rs,8px);display:grid;place-items:center;background:var(--as);color:var(--at)}${P} .pt-fg h3{margin:2px 0 4px;font-size:${px(17)};font-weight:800}${P} .pt-fg p{margin:0;color:var(--mu);font-size:${px(14.5)};line-height:1.65}
${P}.pt-cta{padding-top:0}${P} .pt-cb{display:flex;align-items:center;gap:24px 40px;flex-wrap:wrap;padding:32px 36px;border-radius:var(--r);background:var(--alt);box-shadow:inset 4px 0 0 var(--a)}${P} .pt-cl{flex:1 1 280px}${P} .pt-cl h2{margin:0;font-size:${px(22)};font-weight:800;letter-spacing:-.03em;line-height:1.35}${P} .pt-cl p{margin:6px 0 0;color:var(--mu)}
${P} .pt-ci{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:16px 28px}${P} .pt-ci li{display:flex;align-items:center;gap:10px}${P} .pt-cic{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--at)}${P} .pt-ci small{display:block;color:var(--mu);font-size:${px(12.5)}}${P} .pt-ci b,${P} .pt-ci a{font-weight:800;overflow-wrap:anywhere}
${baseFix(P, { pad: 112, hw: 800, hl: '-.035em', card: `box-shadow:0 0 0 1px ${ln};border:0` })}
${P}.gf{background:var(--alt);color:var(--mu);border-top:3px solid var(--a);padding:48px 0}${P}.gf b{color:var(--ink)}${P}.gf .fl2,${P}.gf .fl2 a{color:var(--ink)}
@media(max-width:1000px){${P} .pt-tr{grid-template-columns:80px minmax(0,1fr) auto}${P} .pt-tc{grid-row:span 2}${P} .pt-k{grid-column:2;grid-row:1}${P} .pt-tr>b{grid-column:2}${P} .pt-tr .pt-p{display:none}${P} .pt-pr{grid-column:3;grid-row:1/span 2}${P} .pt-th{display:none}}
@media(max-width:900px){${P} .pt-g,${P} .pt-fw{grid-template-columns:1fr}${P} .pt-main,${P} .pt-side,${P} .pt-g.one .pt-main,${P} .pt-sf,${P} .pt-fr{grid-column:1/-1}${P} .pt-sf{min-height:0;aspect-ratio:16/9}${P} .pt-qk{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .pt-qk a:nth-child(3n+1){border-left:0}${P} .pt-qk a:nth-child(n+4){border-top:1px solid ${ln}}${P} .pt-2{grid-template-columns:1fr}}
@media(max-width:640px){${P}.pt-hero h1{font-size:${px(28)}}${P} .pt-sp{font-size:${px(14.5)}}${P} .pt-sb{padding:11px 12px;font-size:${px(13.5)}}${P} .pt-band{padding:40px 0 72px}${P} .pt-scr{background:${u.al(T.hbB, .86)}}${P} .pt-side{padding:18px}${P} .pt-tr{grid-template-columns:72px minmax(0,1fr);gap:4px 14px;padding:14px 2px}${P} .pt-tc{grid-row:span 3}${P} .pt-pr{grid-column:2;grid-row:auto;text-align:left}${P} .pt-fg,${P} .pt-fg.n3{grid-template-columns:1fr}${P} .pt-cb{padding:22px 18px}${P} .pt-ci{flex-direction:column}${P} .pt-cb .hpl-btn{width:100%}${P} .pt-pn{padding:18px}}
${tokCSS(P, { h1: `${P}.pt-hero h1`, h2: `${P} .pt-hh h2`, k1: .8, k2: .82, m1: 28 })}`; }
  });
})();

/* ═════════════════════════ 계열 변형(layoutVar) · 계열 A 6종 — R1 수정 회차(FD1) ═════════════════════════
   R1 H1: '12계열 1회씩' 레시피라 유형이 달라도 같은 계열은 같은 모양으로 읽혔다. 계열마다 변형 2~3개를 두어 첫 화면 배치 · 밝기와 아래 섹션 배치를 바꾼다.
   site.layoutVar = 'a'(기본 · 지금 모습) | 'b' | 'c' — 목록은 HPL.vars(id), 판정은 같은 계열 변형끼리 첫 화면 dHash > 12.
   공통 수단: MIR(두 칸 배치 좌우 반전 · PC만) · CEN(섹션 제목 가운데) · INV(회색 띠 차례 뒤집기) + 계열마다 첫 화면 재배치 CSS.
   M1 스크림: 사진 위 글자는 HPL.scrim(글자 쪽 40%, HPC.photo().scrim 색) · L4 휴대폰은 사진 먼저(typo) */
(() => {
  const H = window.HPL; if (!H || !H.u || typeof H.defVars !== 'function') return; const u = H.u;
  const px = th => n => Math.round(n * (th.big ? 1.14 : 1)) + 'px';
  const sel = (P, L) => L.split(',').map(x => `${P} ${x.trim()}`).join(',');
  const MIR = (P, L) => `@media(min-width:901px){${sel(P, L)}{direction:rtl}${sel(P, L.split(',').map(x => x.trim() + '>*').join(','))}{direction:ltr}}`;
  const CEN = P => `${P}.hpl-s:not(.hpl-hero) :is(header,[class$="-sh"],[class$="-hh"],[class$="-shh"],[class$="-fh"]){text-align:center;justify-items:center;justify-content:center;margin-left:auto;margin-right:auto}${P}.hpl-s:not(.hpl-hero) :is(header,[class$="-sh"],[class$="-hh"],[class$="-fh"]) .hpl-sd{margin-left:auto;margin-right:auto}`;
  const INV = P => `${P}.hpl-s:not(.hpl-hero):not(.is-alt):not([class*="cta"]){background:var(--alt)}${P}.hpl-s.is-alt{background:var(--bg)}`;
  /* 어두운 판 위 글자 묶음(밝은 변형 ↔ 어두운 변형 전환에 씀) */
  const onDark = (Q, bg) => `${Q}{background:${bg};color:#fff}${Q} :is(h1,h2,h3,b,.hpl-ey,[class$="-ey"]){color:#fff}${Q} :is(p,span,li,small){color:rgba(255,255,255,.88)}${Q} .hpl-btn span{color:inherit}`;
  const onLight = (Q, bg) => `${Q}{background:${bg};color:var(--ink)}${Q} :is(h1,h2,h3,b){color:var(--ink)}${Q} :is(.hpl-ey,[class$="-ey"]){color:var(--at)}${Q} :is(p,li,small){color:var(--mu)}${Q} .hpl-btn :is(span,svg){color:inherit}`;
  const pri = Q => `${Q} .hpl-btn:is(.wh,.pri){background:var(--a);color:var(--on)}${Q} .hpl-btn.ol,${Q} .hpl-btn.gh{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}`;
  const dkOf = T => T.hbB || T.hd || u.mix(T.a, '#000000', .72);

  /* 1. editorial — a 제목 위 · 넓은 사진 / b 왼쪽 글 · 오른쪽 세로 사진 / c 표지형(사진 먼저 · 가운데 제목) */
  H.defVars('editorial', [
    { id: 'a', name: '매거진 기본', desc: '제목 줄 아래 21:9 넓은 사진 · 실제 숫자 띠', dark: false },
    { id: 'b', name: '세로 사진 칼럼', desc: '왼쪽 5칸 글 · 오른쪽 7칸 세로 사진 · 소개 · 강좌 칸 좌우 반전', dark: false },
    { id: 'c', name: '표지형', desc: '맨 위 넓은 사진 · 아래 가운데 정렬 큰 제목 · 섹션 제목 가운데 · 띠 차례 반전', dark: false }],
  (s, th, T, v) => { const P = `.hpl-editorial.hpl-v-${v}`; const p = px(th);
    if (v === 'b') return `${P}.ed-hero{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);grid-template-rows:auto 1fr;max-width:1440px;margin:0 auto;padding-top:0}
${P}.ed-hero>.hpl-w:first-child{grid-column:1;grid-row:1;max-width:none;margin:0;padding:clamp(40px,5vw,88px) clamp(24px,3.6vw,56px) 24px var(--hpl-gut);display:flex;flex-direction:column;gap:clamp(28px,4vw,56px)}
${P} .ed-top{display:flex;flex-direction:column;gap:24px}${P} .ed-mast{border-bottom:0;border-top:1px solid var(--ink);padding:12px 0 0}${P} .ed-bd{display:none}
${P} .ed-figw{grid-column:2;grid-row:1/span 2;max-width:none;width:100%;margin:0;padding:0}${P} .ed-fig{aspect-ratio:auto!important;height:100%;min-height:min(84vh,${p(760)})}
${P}.ed-hero>.hpl-w:nth-child(3){grid-column:1;grid-row:2;align-self:end;max-width:none;margin:0;padding:0 clamp(24px,3.6vw,56px) clamp(32px,4vw,56px) var(--hpl-gut)}${P} .ed-fl,${P} .ed-fl.n3,${P} .ed-fl.n4{grid-template-columns:1fr 1fr;row-gap:20px}
${MIR(P, '.ed-ab,.ed-lead,.ed-ctab,.ed-two')}
@media(max-width:900px){${P}.ed-hero{display:flex;flex-direction:column}${P} .ed-figw{order:-1}${P} .ed-fig{min-height:0;aspect-ratio:4/3!important;height:auto}${P}.ed-hero>.hpl-w:first-child{padding:28px var(--hpl-gut) 8px}}`;
    if (v === 'c') return `${P}.ed-hero{display:flex;flex-direction:column;padding-top:0}${P} .ed-figw{order:-1;max-width:none;width:100%;margin:0;padding:0}${P} .ed-fig{aspect-ratio:2.6/1;max-height:46vh;width:100%}
${P}.ed-hero>.hpl-w:first-child{padding-top:clamp(36px,5vw,72px)}${P} .ed-mast{justify-content:center;border-bottom:0;padding-bottom:0}${P} .ed-bd{display:none}
${P} .ed-top{display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px}${P} .ed-h1{max-width:18ch}${P} .ed-side{display:flex;flex-direction:column;align-items:center;max-width:56ch}${P} .ed-act{justify-content:center}
${P} .ed-fl{border-top:0}${CEN(P)}${INV(P)}
@media(max-width:640px){${P} .ed-fig{aspect-ratio:4/3}${P} .ed-top{align-items:flex-start;text-align:left}${P} .ed-side{align-items:stretch}}`;
    return ''; });

  /* 2. bento — a 밝은 제목 칸 왼쪽 / b 사진 칸 왼쪽 · 어두운 제목 칸 */
  H.defVars('bento', [
    { id: 'a', name: '벤토 기본', desc: '밝은 제목 칸 + 오른쪽 사진 칸 + 숫자 · 강좌 칸', dark: false },
    { id: 'b', name: '어두운 벤토', desc: '사진 칸이 왼쪽 · 제목 칸은 진한 색 · 아래 칸 배치 좌우 반전 · 섹션 제목 가운데', dark: true }],
  (s, th, T, v) => { const P = `.hpl-bento.hpl-v-${v}`; const sub = `${P} .bt-main .bt-sub{font-size:clamp(16px,1.35vw,18px);line-height:1.65;max-width:44ch}`; /* L2 상자형 첫 화면 부제 17~18px · 대비 7:1 */
    if (v !== 'b') return `${sub}${P} .bt-main .bt-sub{color:${u.fit(T.mu, T.as, 7)}}`;
    return `${sub}${P} .bt-main .bt-sub{color:rgba(255,255,255,.92)}${MIR(P, '.bt-g')}${onDark(`${P} .bt-main`, dkOf(T))}${P} .bt-main .hpl-btn.gh{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.8)}
${P}.hpl-hero .bt-pic{aspect-ratio:auto}${P} .bt-fact{background:var(--bg);box-shadow:inset 0 0 0 1px ${u.al(T.ink, .12)}}${CEN(P)}`; });

  /* 3. fullbleed — a 아래 왼쪽 제목 / b 오른쪽 정렬 제목(오른쪽 40% 스크림) / c 밝은 바탕 위 큰 사진 상자 + 아래 제목 */
  H.defVars('fullbleed', [
    { id: 'a', name: '전체 사진 기본', desc: '화면 가득 사진 · 아래 왼쪽 큰 제목 · 아래쪽 40% 스크림', dark: true },
    { id: 'b', name: '오른쪽 제목', desc: '사진 위 오른쪽 정렬 제목 · 오른쪽 40% 스크림 · 아래 칸 좌우 반전', dark: true },
    { id: 'c', name: '사진 상자', desc: '밝은 바탕에 둥근 21:9 사진 상자 · 아래 2단 제목 · 섹션 제목 가운데', dark: false }],
  (s, th, T, v) => { const P = `.hpl-fullbleed.hpl-v-${v}`; const p = px(th); const sTop = H.scrim(s, 'hero', 'to top', { end: 56 }); const sc0 = H.scrimC(s, 'hero').replace(/,\s*[\d.]+\)$/, ',.95)');
    const cta = `${P}.fb-cta .fb-scrim{background:${H.scrim(s, 'cta', 'to top', { end: 60, add: .06 })},linear-gradient(rgba(0,0,0,.38),rgba(0,0,0,.38))}${P} .fb-ci :is(h2,.fb-sub){text-shadow:0 1px 14px rgba(0,0,0,.45)}`; /* H5(N7): 가운데 정렬 문의 띠 제목이 스크림 위쪽 끝에 걸려 대비 3.19(ta-photo) → 고른 덮개 추가 */
    if (v === 'a') return `${P}.fb-hero .fb-scrim{background:${sTop},${H.scrim(s, 'hero', 'to right', { end: 40, add: -.3 })}}${cta}`; /* 아래 40% + 왼쪽 옅은 덮개(글자 쪽) */
    if (v === 'b') return `${P}.fb-hero .fb-scrim{background:linear-gradient(to left,${sc0} 0,${sc0} 44%,transparent 44%)}${cta}
@media(min-width:901px){${P} .fb-in{display:flex;flex-direction:column;align-items:flex-end;text-align:right}${P} .fb-h1{margin-left:auto}${P} .fb-row{flex-direction:row-reverse;justify-content:flex-start;text-align:right}${P} .fb-sub{margin-left:auto}${P} .fb-act,${P} .fb-bd{justify-content:flex-end}${P} .fb-in{align-items:flex-start;text-align:left;margin-left:56%;width:44%;padding-left:clamp(28px,3vw,48px);padding-right:clamp(24px,3vw,48px)}${P} .fb-in>*{max-width:100%}${P} .fb-h1{max-width:100%;margin-left:0;font-size:clamp(34px,3.6vw,calc(var(--t-h1,64px) * .95))}${P} .fb-row{display:flex;flex-direction:column;align-items:flex-start;gap:24px;text-align:left}${P} .fb-sub{margin-left:0}${P} .fb-act,${P} .fb-bd{justify-content:flex-start}}
@media(max-width:900px){${P}.fb-hero .fb-scrim{background:${sTop}}}${MIR(P, '.fb-fh,.fb-row,.fb-cb')}`;
    if (v === 'c') return `${P}.fb-hero{min-height:0;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);padding:clamp(16px,2vw,24px) clamp(16px,2vw,24px) 0}
${P}.fb-hero .fb-bg{position:relative!important;inset:auto;width:100%;aspect-ratio:21/9;max-height:50vh;border-radius:calc(var(--r) * 1.5);overflow:hidden}${P}.fb-hero .fb-scrim{display:none}
${P}.fb-hero .fb-in{padding-top:clamp(36px,4vw,56px);padding-bottom:clamp(40px,5vw,72px)}${onLight(`${P}.fb-hero .fb-in`, 'transparent')}${pri(`${P}.fb-hero`)}${P}.fb-hero .fb-h1{color:var(--ink);text-shadow:none;max-width:20ch}${P}.fb-hero :is(.fb-sub,.fb-bd li){text-shadow:none}
@media(min-width:901px){${P}.fb-hero .fb-in{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);column-gap:48px;align-items:end}${P}.fb-hero .fb-in>*{grid-column:1}${P}.fb-hero .fb-row{grid-column:2;grid-row:1/span 3;align-self:end;display:flex;flex-direction:column;align-items:flex-start;gap:24px}}
@media(max-width:640px){${P}.fb-hero .fb-bg{aspect-ratio:4/3}}${cta}${CEN(P)}`;
    return ''; });

  /* 4. splitscreen — a 왼쪽 진한 글 판 / b 왼쪽 사진 · 오른쪽 밝은 판 / c 위 넓은 사진 + 아래 진한 띠(2단) */
  H.defVars('splitscreen', [
    { id: 'a', name: '좌우 분할 기본', desc: '왼쪽 진한 글 판 · 오른쪽 사진 반반', dark: true },
    { id: 'b', name: '밝은 판 반전', desc: '왼쪽 사진 · 오른쪽 옅은 강조색 판 · 아래 칸 좌우 반전', dark: false },
    { id: 'c', name: '위 사진 아래 띠', desc: '위 넓은 사진 · 아래 진한 띠에 제목과 설명 2단 · 섹션 제목 가운데', dark: true }],
  (s, th, T, v) => { const P = `.hpl-splitscreen.hpl-v-${v}`; const p = px(th); const sub = `${P} .sp-sub{font-size:clamp(16px,1.35vw,18px);line-height:1.65;color:${v === 'b' ? u.fit(T.mu, T.as, 7) : 'rgba(255,255,255,.92)'}}`;
    if (v === 'a') return sub;
    if (v === 'b') return `${sub}@media(min-width:901px){${P}.sp-hero{direction:rtl}${P}.sp-hero>*{direction:ltr}}${onLight(`${P} .sp-txt`, 'var(--as)')}${pri(`${P} .sp-txt`)}${P} .sp-txt .sp-link{color:var(--ink);border-color:currentColor}${P} .sp-txt .sp-facts :is(span,small){color:${u.fit(T.mu, T.as, 4.8)}}${P} .sp-facts{border-color:${u.al(T.ink, .16)}}${P} .sp-facts li{border-color:${u.al(T.ink, .14)}}${MIR(P, '.sp-two,.sp-half')}${P} .sp-row:not(.rev) .hpl-img{order:2}${P} .sp-row.rev .hpl-img{order:0}`;
    if (v === 'c') return `${sub}${P}.sp-hero{grid-template-columns:1fr;min-height:0}${P} .sp-fig{order:-1;min-height:0;aspect-ratio:2.5/1;max-height:50vh;width:100%}
@media(min-width:901px){${P} .sp-txt{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:24px 56px;align-items:end;padding:clamp(40px,4.4vw,64px) var(--hpl-gut)}${P} .sp-in{max-width:none;margin:0;display:contents}${P} .sp-in>*{grid-column:1}${P} .sp-in .sp-sub,${P} .sp-in .sp-act{grid-column:2}${P} .sp-in .sp-sub{grid-row:2;margin:0}${P} .sp-in .sp-act{grid-row:3}${P} .sp-facts{grid-column:1/-1}}
@media(max-width:640px){${P} .sp-fig{aspect-ratio:4/3}}${CEN(P)}${INV(P)}`;
    return ''; });

  /* 5. typo — a 큰 글자 + 아래 3:1 사진 띠 / b 왼쪽 세로 사진 + 오른쪽 큰 글자. 둘 다 휴대폰은 사진 먼저(L4 · 4:3) · 제목 700 · 자간 -0.025em(H7) */
  H.defVars('typo', [
    { id: 'a', name: '큰 글자 기본', desc: '초대형 제목 · 넓은 여백 · 아래 가로로 긴 사진 띠', dark: false },
    { id: 'b', name: '사진 곁 큰 글자', desc: '왼쪽 5칸 세로 사진 · 오른쪽 큰 제목 · 아래 칸 좌우 반전 · 섹션 제목 가운데', dark: false }],
  (s, th, T, v) => { const P = `.hpl-typo.hpl-v-${v}`;
    const com = `${P}.ty-hero .ty-h1{font-weight:700;letter-spacing:-.025em}
@media(max-width:640px){${P}.ty-hero{display:flex;flex-direction:column;padding-top:0}${P}.ty-hero .ty-sw{order:-1;margin:0 0 28px}${P}.ty-hero .ty-strip{aspect-ratio:4/3!important}${P}.ty-hero>.hpl-w{width:100%}}`;
    if (v !== 'b') return com;
    return `${com}@media(min-width:901px){${P}.ty-hero{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);align-items:stretch;padding:0}${P}.ty-hero .ty-sw{grid-column:1;grid-row:1;padding:0;margin:0;max-width:none}${P}.ty-hero .ty-strip{aspect-ratio:auto!important;height:100%;min-height:min(84vh,720px)}
${P}.ty-hero>.hpl-w{grid-column:2;grid-row:1;max-width:none;margin:0;padding:clamp(32px,4vw,64px) var(--hpl-gut) clamp(40px,5vw,72px) clamp(32px,4vw,64px);display:flex;flex-direction:column;justify-content:space-between}
${P}.ty-hero .ty-h1{font-size:calc(var(--ty-fs) * .6)}${P}.ty-hero .ty-top{padding-bottom:32px}}${MIR(P, '.ty-two,.ty-fhd')}${CEN(P)}`; });

  /* 6. portal — a 사진 띠 위 찾기 + 오른쪽 공지 / b 공지 왼쪽 · 찾기 오른쪽(스크림도 오른쪽) / c 밝은 판 + 오른쪽 사진(사진 위 글자 없음) */
  H.defVars('portal', [
    { id: 'a', name: '포털 기본', desc: '사진 띠 위 왼쪽 찾기 상자 · 오른쪽 공지 패널', dark: true },
    { id: 'b', name: '포털 반전', desc: '왼쪽 공지 패널 · 오른쪽 찾기 상자 · 오른쪽 40% 스크림 · 아래 칸 좌우 반전', dark: true },
    { id: 'c', name: '밝은 포털', desc: '옅은 바탕 왼쪽 찾기 · 오른쪽 사진 상자 · 공지는 아래 · 섹션 제목 가운데', dark: false }],
  (s, th, T, v) => { const P = `.hpl-portal.hpl-v-${v}`; const p = px(th);
    const mob = `@media(max-width:900px){${P} .pt-scr{background:linear-gradient(${H.scrimC(s, 'hero')},${H.scrimC(s, 'hero')})}}`;
    if (v === 'a') return `${P} .pt-scr{background:${H.scrim(s, 'hero', 'to right', { end: 64 })}}${mob}`;
    if (v === 'b') return `${mob}${P} .pt-scr{background:${H.scrim(s, 'hero', 'to left', { end: 64 })}}@media(min-width:901px){${P} .pt-main{grid-column:6/span 7;grid-row:1}${P} .pt-side{grid-column:1/span 4;grid-row:1}${P} .pt-g.one .pt-main{grid-column:5/span 8}}
${mob}${MIR(P, '.pt-two,.pt-fw,.pt-cb')}`;
    if (v === 'c') return `${P} .pt-band{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);background:var(--as);max-width:none}${P} .pt-bg{position:relative!important;inset:auto;grid-column:2;grid-row:1;min-height:clamp(360px,44vw,560px);margin:clamp(20px,2.4vw,32px) clamp(20px,2.4vw,32px) clamp(20px,2.4vw,32px) 0;border-radius:var(--r);overflow:hidden}${P} .pt-scr{display:none}
${P} .pt-g{grid-column:1;grid-row:1;display:flex;flex-direction:column;align-items:stretch;justify-content:center;max-width:none;margin:0;padding:clamp(32px,4vw,64px) var(--hpl-gut)}${P} .pt-side{display:none}${onLight(`${P} .pt-main`, 'transparent')}${pri(`${P} .pt-main`)}${P} .pt-main .pt-srch{box-shadow:0 0 0 1px ${u.al(T.ink, .18)}}${P} .pt-pop a{background:var(--bg);color:var(--ink);box-shadow:inset 0 0 0 1px ${u.al(T.ink, .16)};text-shadow:none}${P} .pt-pop a:hover{background:var(--alt)}${P} .pt-pl{color:var(--mu)}
@media(max-width:900px){${P} .pt-band{display:flex;flex-direction:column}${P} .pt-bg{order:-1;min-height:0;aspect-ratio:4/3;margin:0;border-radius:0}}${CEN(P)}${INV(P)}`;
    return ''; });
})();
