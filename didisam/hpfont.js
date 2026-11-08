/* v34.5 hpfont — 타이포 디렉션(폰트 디자이너 F1 · fix6/BRIEF6.md)
   대표님(2026-11-08 13:52): "폰트가 너무 별로다. … 홈페이지 폰트 디자인 보강을 해."
   하는 일
     1) 테마 8 × 레이아웃 계열 12 조합표(M)에 따라 제목 글꼴 · 굵기 · 자간 · 줄간을 정한다.
        hpdir(G1)의 토큰 CSS가 만들어질 때만 그 사이트 칸의 값으로 잠시 바꿔 끼우고(HPD.tok · HPD.FB), 끝나면 되돌린다.
        → hpdir가 쓰는 모든 제목 선택자 · 큰 숫자 · 인용이 같은 글꼴로 맞춰지고, 계열(HPL) CSS는 var(--hd-ff)로 이어받는다.
     2) 한글 조판 규칙(keep-all · 자간 · 줄간 · 숫자 tabular · 가짜 굵게 · 기울임 금지 · 밑줄 위치)을 모든 테마 사이트에 덧붙인다.
     3) 계열 고유 글꼴을 고정값으로 쓴 곳(콜라주 'Jua' · 누아르 명조 · 계열 명조 --hpl-serif)을 조합표 글꼴로 바꾼다.
   글꼴 파일 · @font-face는 F2(hpfontpick.js · HPF)가 최종 HTML의 font-family 이름을 보고 붙인다. 여기서는 이름만 쓴다.
   우선순위: hpdir(토큰) < hpfont(조합 · 조판) < hplay(계열) < hpimg(사용자가 고른 글꼴 · 요소 스타일, !important)
   문서: docs/typography.md · docs/design-tokens.md 5절
   인터페이스: window.HPFT = { fams, pairs, M, cell(theme, layout), pair(site), need(site), css(site), stack(id) } */
'use strict';
(() => {
  if (typeof HPD === 'undefined' || !HPD || typeof HPD.tok !== 'function') return;

  /* ── 글꼴(HPF family id와 같은 id · 모두 OFL 1.1, 원문은 didisam/fonts/<id>/OFL.txt) ──
     k: sans | serif | round | display · cov: 한글 음절 수(11172 = 전부) · w: 쓰는 굵기 */
  const FAMS = {
    'pretendard': { n: 'Pretendard', ko: '프리텐다드', k: 'sans', cov: 11172, w: [400, 500, 600, 700, 800], st: "'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif" },
    'wanted-sans': { n: 'Wanted Sans', ko: '원티드 산스', k: 'sans', cov: 11172, w: [500, 700, 800], st: "'Wanted Sans','Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif" },
    'noto-serif-kr': { n: 'Noto Serif KR', ko: '본명조', k: 'serif', cov: 11172, w: [400, 700], st: "'Noto Serif KR','Noto Serif KR Fallback','Noto Serif CJK KR','AppleMyungjo','Batang',serif" },
    'hahmlet': { n: 'Hahmlet', ko: '함렛', k: 'serif', cov: 2788, w: [600, 800], st: "'Hahmlet','Hahmlet Fallback','Noto Serif KR','Noto Serif CJK KR','AppleMyungjo',serif" },
    'gowun-dodum': { n: 'Gowun Dodum', ko: '고운돋움', k: 'round', cov: 11172, w: [400], st: "'Gowun Dodum','Gowun Dodum Fallback','Pretendard Variable',Pretendard,'Apple SD Gothic Neo',sans-serif" },
    'do-hyeon': { n: 'Do Hyeon', ko: '도현', k: 'display', cov: 2437, w: [400], st: "'Do Hyeon','Do Hyeon Fallback','Pretendard Variable',Pretendard,'Apple SD Gothic Neo',sans-serif" }
  };
  /* 렌더 시점에 HPF가 있으면 그 문자열(크기 보정 폴백 포함)을 쓴다. HPF는 이 파일보다 뒤에 로드된다. */
  const stack = id => { try { if (window.HPF && typeof HPF.css === 'function') { const v = HPF.css(id); if (v) return v; } } catch (e) { } return (FAMS[id] || FAMS.pretendard).st; };
  const one = id => (FAMS[id] || {}).w && FAMS[id].w.length === 1;

  /* ── 제목 짝(코드) — hd 제목 글꼴 · hw 굵기 · ls 자간(em) · lh 첫 화면 제목 줄간 · lh2 섹션 제목 줄간 ──
     한글 기준: 자간 -0.01 ~ -0.03em, 제목 줄간 1.15 ~ 1.3. 단일 굵기 글꼴(고운돋움 · 도현)은 굵기를 400으로 두고 가짜 굵게를 막는다. */
  const PAIR = {
    pt8: { hd: 'pretendard', hw: 800, ls: -0.03, lh: 1.16, lh2: 1.24, nm: '고딕 굵게' },
    pt7: { hd: 'pretendard', hw: 700, ls: -0.022, lh: 1.26, lh2: 1.3, nm: '고딕' },
    ws8: { hd: 'wanted-sans', hw: 800, ls: -0.028, lh: 1.15, lh2: 1.22, nm: '선명한 고딕' },
    ws7: { hd: 'wanted-sans', hw: 700, ls: -0.022, lh: 1.18, lh2: 1.26, nm: '선명한 고딕(중간)' },
    ns6: { hd: 'noto-serif-kr', hw: 600, ls: -0.02, lh: 1.26, lh2: 1.3, nm: '본명조' },
    ns7: { hd: 'noto-serif-kr', hw: 700, ls: -0.025, lh: 1.22, lh2: 1.28, nm: '본명조 굵게' },
    hm6: { hd: 'hahmlet', hw: 600, ls: -0.02, lh: 1.2, lh2: 1.26, nm: '함렛' },
    hm8: { hd: 'hahmlet', hw: 800, ls: -0.03, lh: 1.15, lh2: 1.22, nm: '함렛 굵게' },
    gd4: { hd: 'gowun-dodum', hw: 400, ls: -0.01, lh: 1.28, lh2: 1.3, nm: '고운돋움' },
    dh4: { hd: 'do-hyeon', hw: 400, ls: -0.01, lh: 1.2, lh2: 1.26, nm: '도현' }
  };
  const TH = ['clean', 'premium', 'warm', 'official', 'tech', 'kids', 'campus', 'senior'];
  /* ── 조합표: 계열(행) × 테마(열 · TH 순서) → 제목 짝 ── '_'는 계열 없음(기본 렌더러)
     원칙: 테마가 성격(고딕 · 명조 · 둥근 · 굵은)을 정하고, 계열은 그 성격 안에서 무게만 옮긴다.
       명조 계열(editorial · noir)은 고딕 테마에도 명조, 기관 · 게시판 계열(portal · sidebar · bulletin)은 장식 글꼴을 빼고 읽기 쉬운 쪽,
       누아르는 계열 CSS가 300 · 500의 가는 명조를 쓰므로 굵기 400이 있는 본명조(함렛은 600부터),
       글자 중심(typo)은 한 단계 굵게, 놀이형(collage)은 둥근 · 굵은 글꼴. 큰 글씨(senior)는 끝까지 자간을 덜 줄인다. */
  const M = {
    _:           'ws7 hm6 gd4 pt7 ws8 dh4 ns6 pt7',
    editorial:   'ns6 hm6 ns6 ns6 ns7 gd4 hm6 ns7',
    bento:       'ws7 hm6 gd4 pt7 ws8 dh4 ns6 pt7',
    fullbleed:   'pt8 hm6 gd4 pt8 ws8 dh4 hm6 pt7',
    splitscreen: 'ws8 ns6 gd4 pt7 ws7 dh4 ns6 pt7',
    typo:        'ws8 hm8 gd4 pt8 ws8 dh4 hm8 pt8',
    portal:      'pt7 ns6 gd4 pt7 pt8 gd4 ns6 pt7',
    story:       'pt8 hm6 ns6 pt7 ws7 dh4 ns6 pt7',
    mosaic:      'ws7 hm6 gd4 pt7 ws8 dh4 ns6 pt7',
    sidebar:     'pt7 ns6 gd4 pt7 ws7 gd4 ns6 pt7',
    bulletin:    'pt7 ns6 gd4 pt7 pt7 gd4 ns6 pt7',
    collage:     'dh4 hm6 gd4 gd4 dh4 dh4 ns6 gd4',
    noir:        'ns6 ns6 ns6 ns6 ws7 dh4 ns6 ns7'
  };
  const cellCode = (th, lay) => { const i = TH.indexOf(th); if (i < 0) return null; const row = (M[lay] || M._).split(/\s+/); return row[i] || null; };
  /* 테마 보정: 큰 글씨는 자간 -0.01em까지만, 줄간 +0.04 */
  const cell = (th, lay) => { const c = cellCode(th, lay); if (!c || !PAIR[c]) return null; const p = Object.assign({ code: c }, PAIR[c]);
    if (th === 'senior') { p.ls = Math.max(p.ls, -0.01); p.lh = Math.min(1.3, p.lh + 0.04); p.lh2 = Math.min(1.34, p.lh2 + 0.04); }
    p.bd = 'pretendard'; p.bls = th === 'senior' ? 0 : -0.01; p.blh = th === 'senior' ? 1.75 : (FAMS[p.hd].k === 'serif' || th === 'premium' || th === 'campus' || th === 'warm') ? 1.75 : 1.7;
    return p; };
  const pair = s => s && s.theme ? cell(s.theme, s.layout && M[s.layout] ? s.layout : '_') : null;

  /* ── 테마 기본값을 조합표 기본 칸으로 고정(HPD.css를 직접 부르는 곳 · 축소 그림도 같은 값) ── */
  const KEY = { sans: 'pretendard', serif: 'noto-serif-kr', round: 'gowun-dodum', display: 'do-hyeon' };
  try { const FB = HPD.FB; if (FB) { FB.sans = FAMS.pretendard.st; FB.serif = FAMS['noto-serif-kr'].st; FB.round = FAMS['gowun-dodum'].st; FB.display = FAMS['do-hyeon'].st; }
    TH.forEach(t => { const k = HPD.tok(t); const p = cell(t, '_'); if (!k || !p) return; k.hw = p.hw; k.hls = p.ls; k.lh1 = p.lh; if (k.blh && t !== 'senior') k.blh = p.blh; if (t === 'senior') k.blh = 1.75; }); } catch (e) { console.error('hpfont init', e); }

  /* 토큰 CSS를 만드는 동안만 그 사이트 칸으로 바꿔 끼운다(동기 호출 안에서만 · finally로 되돌림) */
  function withCell(th, lay, fn) { const k = HPD.tok(th); const p = cell(th, lay); const FB = HPD.FB; if (!k || !p || !FB) return fn();
    const key = k.hf; const save = { f: FB[key], hw: k.hw, hls: k.hls, lh1: k.lh1 };
    try { FB[key] = stack(p.hd); k.hw = p.hw; k.hls = p.ls; k.lh1 = p.lh; return fn(); } finally { FB[key] = save.f; k.hw = save.hw; k.hls = save.hls; k.lh1 = save.lh1; } }

  /* ── 한글 조판 + 칸별 덮어쓰기 CSS ── */
  function css(s) { const p = pair(s); if (!p) return ''; const lay = s.layout && M[s.layout] ? s.layout : '';
    const H = stack(p.hd), B = stack(p.bd), SER = stack('noto-serif-kr');
    const kind = FAMS[p.hd].k; const small = p.hd === 'do-hyeon' || p.hd === 'gowun-dodum' ? B : H; /* 도현(2,437자)은 큰 제목에만, 고운돋움(굵기 1개)은 작은 제목을 Pretendard 굵게로 두어 위계를 만든다. 함렛(2,788자)은 작은 제목 · 인용에도 쓰고 빠진 음절만 본명조가 그린다 */
    const Q = kind === 'serif' ? H : SER; /* 인용 글꼴: 명조 짝이면 제목 글꼴 */
    const hsel = '.hp-hero h1,.hpt .hp-sh h2,.hpt .hp-prose h2,.hpt .hp-ctat h2';
    const L = [];
    /* 1. 조판 기본(모든 섹션 · 바닥글) */
    L.push(`.hpt,.gf,[class*=hpl-]{word-break:keep-all;overflow-wrap:break-word;line-break:strict;font-kerning:normal;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-text-size-adjust:100%;text-size-adjust:100%}
.hpt,.gf{--hd-ff:${H};--hd-fw:${p.hw};--hd-ls:${p.ls}em;--bd-ff:${B};--hpl-serif:${SER};letter-spacing:${p.bls}em}
.hpt p,.hpt li,.hpt dd,.hpt blockquote{text-wrap:pretty}.hpt h1,.hpt h2,.hpt h3,[class*=hpl-] h1,[class*=hpl-] h2,[class*=hpl-] h3{text-wrap:balance;word-break:keep-all}
${hsel}{font-family:var(--hd-ff);font-weight:var(--hd-fw);letter-spacing:var(--hd-ls)}.hp-hero h1{line-height:${p.lh}}.hpt .hp-sh h2,.hpt .hp-prose h2,.hpt .hp-ctat h2{line-height:${p.lh2}}
.hpt h3{letter-spacing:${Math.max(p.ls, -0.02)}em}
.hpt .hp-fl b,.hpt time,.hpt td,.hpt .hp-cp b,.hpt .hp-nl time,.hpt .hp-tll time,.hpt [class*=price],.hpt [class*=date],.gf time{font-variant-numeric:tabular-nums lining-nums}
.hpt em,.hpt cite,.hpt address{font-style:normal}.hpt em{font-weight:600}
.hpt a{text-underline-offset:.24em;text-decoration-thickness:1px}
.hpt .hp-ey:lang(ko),.hpt .hp-ey{word-break:keep-all}`);
    /* 1-1. 첫 화면 부품(S3 hpsec-hero)은 굵기 · 자간 · 줄간을 고정값으로 쓴다 → 조합표 값으로(한 단계 높은 선택자, 줄간은 큰 격자형 !important만 맞춤) */
    L.push(`body .hpt.hps-hero h1,body .hps-cta h2{font-family:var(--hd-ff);font-weight:var(--hd-fw);letter-spacing:var(--hd-ls)}body .hpt.hps-hero h1{line-height:${p.lh}}body .hps-cta h2{line-height:${p.lh2}}
body .hps-k-grid h1{line-height:${Math.max(1.12, p.lh - 0.04).toFixed(2)}!important}
body .hpt .hps-q1 blockquote::before{font-family:${kind === 'serif' ? Q : "Georgia,'Times New Roman',serif"}!important}`); /* v34.5 FZ(FIXLIST 24): hpsec-trust의 범위 선택자가 더 세서 고딕 사이트 큰따옴표가 Georgia → 'Noto Serif KR'(웹폰트 조각 13KB)로 그려졌다 */
    /* 2. 단일 굵기 · 글자 수가 적은 제목 글꼴 */
    if (one(p.hd)) L.push(`${hsel},.hpt .hp-fl b{font-synthesis:none}`);
    if (small !== H) L.push(`.hpt .hp-card h3,.hpt .hp-ccb h3,.hpt .hp-st h3,.hpt .hp-pc h3,.hpt .hp-st .hp-no{font-family:${small}}`);
    if (kind === 'serif') L.push(`.hpt .hp-rc blockquote{font-family:${Q};font-weight:400;line-height:1.8;letter-spacing:-.01em}`);
    /* 3. 계열 고유 글꼴 바꾸기(계열 CSS가 뒤에 붙으므로 클래스를 세 번 겹쳐 한 단계 높인다.
       body.hpl-on은 게시본 Shadow DOM(.smr)에 없으므로 쓰지 않는다 — sitemerge가 body를 .smr로 바꾼다) */
    if (lay) { const P = `body .hpl-${lay}.hpl-${lay}.hpl-${lay}`;
      L.push(`${P},${P} .hpt,body .hpl-f.hpl-f{--hd-ff:${H};--hd-fw:${p.hw};--hd-ls:${p.ls}em;--hpl-serif:${SER};--hpl-sans:${B}}`);
      if (lay === 'collage') L.push(`${P} h1,${P} h2,${P} h3,${P} .hp-sh h2,${P} .hpl-co-p figcaption,${P} .hpl-co-st li>b{font-family:var(--hd-ff)}${P} h1,${P} h2{letter-spacing:var(--hd-ls)}${P} h3,${P} .hpl-co-p figcaption{font-family:${small}}`);
      if (lay === 'noir') L.push(`${P} h1,${P} h2,${P} .hp-sh h2{font-family:var(--hd-ff);letter-spacing:var(--hd-ls)}${P} h3,${P} .hpl-no-mh b,${P} .hpl-no-st b,${P} .hpl-no-fl b{font-family:${small}}${P} .hp-rc blockquote{font-family:${Q}}`);
      L.push(`${P} h1{line-height:${Math.max(1.15, p.lh - 0.04).toFixed(2)}}`);
      if (small !== H && lay !== 'collage') L.push(`${P} h3{font-family:${small};font-weight:700;letter-spacing:-.015em}`);
      /* 섹션 제목은 계열과 관계없이 조합표 제목 글꼴 · 자간(한글 -0.01 ~ -0.03em). 굵기는 계열 고유값을 둔다(누아르 500 · 매거진 500 등) */
      if (lay !== 'collage' && lay !== 'noir') L.push(`${P} .hp-sh h2,${P} .hp-prose h2,${P} .hp-ctat h2,${P} h2{font-family:var(--hd-ff);letter-spacing:var(--hd-ls)}`);
      if (lay === 'typo') L.push(`${P} .ty-h1,${P} .ty-huge{letter-spacing:${Math.min(p.ls, -0.03)}em;line-height:1.12}`);
      if (lay === 'editorial') L.push(`${P} .ed-body{font-family:${B};font-size:clamp(17px,1.5vw,19px);letter-spacing:-.01em;line-height:1.85;word-break:keep-all}${P} .ed-q blockquote{font-family:${Q}}`); }
    /* 4. 휴대폰: 줄간을 조금 넓혀 두 줄 제목이 붙지 않게 */
    L.push(`@media(max-width:640px){.hp-hero h1{line-height:${Math.max(p.lh, 1.2)}}.hpt{letter-spacing:${p.bls === 0 ? 0 : -0.005}em}}`);
    return `/* hpfont ${p.code} */` + L.join('\n'); }

  /* 이 사이트가 실제로 쓰는 글꼴 id(HPF.need가 합쳐 본다) */
  function need(s) { const p = pair(s); if (!p) return []; const K = [p.hd, p.bd]; const lay = s.layout && M[s.layout] ? s.layout : '';
    if (p.hd === 'hahmlet' || FAMS[p.hd].k === 'serif' || lay === 'editorial' || lay === 'noir') K.push('noto-serif-kr');
    return [...new Set(K)]; }

  /* ── siteHTML 연결(hpdir 바로 바깥) ── */
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => {
    const th = s && s.theme; if (!th || !HPD.tok(th)) return base(s, full, lang);
    const lay = s.layout && M[s.layout] ? s.layout : '_';
    const h = withCell(th, lay, () => base(s, full, lang));
    try { const c = css(s); return c && h && h.includes('</style>') ? h.replace('</style>', c + '</style>') : h; } catch (e) { console.error('hpfont', e); return h; } }; window.siteHTML = siteHTML; }
  /* 테마 고르기 축소 그림도 같은 칸(계열 없음) */
  if (typeof HPT !== 'undefined' && HPT && typeof HPT.thumb === 'function') { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!id || !HPD.tok(id)) return tb(s, id);
    const lay = s && s.layout && M[s.layout] ? s.layout : '_'; const h = withCell(id, lay, () => tb(s, id));
    try { const c = css({ theme: id, layout: lay === '_' ? '' : lay }); return c && h.includes('</style>') ? h.replace('</style>', c + '</style>') : h; } catch (e) { return h; } }; }

  /* ── 편집기 조합(F2 hpfontpick이 HPF.pairs 대신 쓴다) — hd · bd는 HPF id ── */
  const pairs = [
    { id: 'modern', name: '모던 고딕', hd: 'pretendard', bd: 'pretendard', hw: 800, hls: -0.03, note: '어느 기관에나 · 기업 · 공공 · 직업훈련' },
    { id: 'sharp', name: '선명한 제목', hd: 'wanted-sans', bd: 'pretendard', hw: 800, hls: -0.028, note: '코딩 · 테크 · 스타트업 · 인강' },
    { id: 'campus', name: '대학 명조', hd: 'noto-serif-kr', bd: 'pretendard', hw: 600, hls: -0.02, note: '대학 · 평생교육원 · 연구소' },
    { id: 'premium', name: '고급 명조', hd: 'hahmlet', bd: 'pretendard', hw: 600, hls: -0.02, note: '프리미엄 학원 · 대학원 · 아카데미' },
    { id: 'grand', name: '굵은 명조 제목', hd: 'hahmlet', bd: 'pretendard', hw: 800, hls: -0.03, note: '큰 글자 첫 화면 · 예술 · 디자인 · 대학원' },
    { id: 'warm', name: '따뜻한 둥근', hd: 'gowun-dodum', bd: 'pretendard', hw: 400, hls: -0.01, note: '동네 학원 · 공부방 · 상담' },
    { id: 'play', name: '경쾌한 굵은 제목', hd: 'do-hyeon', bd: 'pretendard', hw: 400, hls: -0.01, note: '유아 · 초등 · 예체능' },
    { id: 'book', name: '전부 명조(긴 글 전용)', hd: 'noto-serif-kr', bd: 'noto-serif-kr', hw: 700, hls: -0.025, longOnly: true, layouts: ['editorial', 'story', 'sidebar'], note: '매거진 · 이야기 · 사이드 목차 계열의 긴 소개글 전용(약 460KB — 다른 계열에서는 제목만 명조)' }
  ];

  /* 명조 본문 조합은 긴 글 계열 사이트에서만 보인다(통합 담당 결정 — 약 460KB). HPF.pairs()는 배열 · 함수 둘 다 받는다 */
  const pairsFor = s => { try { s = s || (typeof site === 'function' ? site() : null); } catch (e) { s = null; } return pairs.filter(p => !p.layouts || (s && p.layouts.includes(s.layout))); };
  window.HPFT = { fams: FAMS, pairs: pairsFor, allPairs: pairs, M, TH, PAIR, KEY, cell, cellCode, pair, need, css, stack };
})();
