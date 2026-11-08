/* v34.5 hplay-b — 레이아웃 계열 B 6종 + 이미지 자리(아트) + 선 아이콘 (개발 요원 D2)
   대표님(2026-11-08): "디자인 유사한 거는 최대한 제외하고, 다양성을 가지고 가줘 … 디자인 수준을 더 올려줘."
   ① 이미지 자리는 사진이 먼저다: site.img[slot] · 강좌 썸네일 → 샘플 사진(HPSTOCK.forScene, site.stockOff=1이면 끔, 같은 화면에서 겹치지 않음) → 그림.
      HPL.art(slot, site, th, T, opt) — 사진이 없을 때 쓰는 대체 SVG 그림 12종(사람 얼굴 없음). 테마 색 듀오톤, 비율 16:9 · 4:3 · 1:1 · 3:4 · 4:5 · 21:9.
      장면 고르기: site.img[slot].art(직접 고른 장면) → 템플릿 이름 · 장면 문구 · 첫 화면 글 · 강좌 이름의 낱말 → 기관 유형 기본 묶음.
      opt = { ratio:'16:9'|'4:3'|'1:1'|'3:4'|'21:9', scene:'<장면 id>', mode:'light'|'dark'|'warm', seed }.
   ② HPL.icon(name, size, sw) — 24×24 선 아이콘 47종(선 굵기 일정, currentColor). HPL.iconFor(글) = 낱말로 아이콘 고르기(이모지 대체).
   ③ 이미지 자리: hplay-a의 HPL.fig · HPL.img를 쓰고(없을 때만 이 파일 것), 자리 이름은 통일 규칙(hero · about · teacher · space · gallery · card · cta · logo)에 번호를 붙여 쓴다: hero · gallery1~4 · about1~6(특징 줄) · cls-<강좌 id>(강좌 카드, 썸네일 c.thumb 사용 — hplay-a와 같은 규약).
   ④ 레이아웃 계열 6종: story(단계 · 이야기) · mosaic(갤러리 모자이크) · sidebar(왼쪽 메뉴 패널 + 섹션 이름 열) · bulletin(공공 알림판) · collage(콜라주) · noir(어두운 고급).
      등록 형식은 hplay-a 래퍼 규약(sec[kind](site, d, th, T, ctx))을 따르고, 이 파일 안의 섹션 함수는 (d, site, th, T, x)로 써서 regB가 맞춘다.
      CSS는 .hpl-<id> 아래로만 쓴다(래퍼가 모든 섹션에 hpl-<id>를 붙임). 게시본은 <main> 안쪽만 Shadow DOM에 들어가고, 방문자에게는 첫 섹션 뒤에 AI 비서가 끼므로 섹션을 넘는 배치를 쓰지 않는다.
   사실 원칙: 숫자는 HPT.facts() · 실제 강좌 값만, 후기 · 강사 · 연락처는 실제 값만, 없으면 그 칸을 그리지 않는다. 외부 이미지 · 폰트 없음(CSP). */
'use strict';
(() => {
  const H = window.HPL = window.HPL || { fam: {} };
  if (!H.fam) H.fam = {};
  if (typeof H.reg !== 'function') H.reg = function (id, def) { this.fam[id] = def; };

  /* ── 색 ── */
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const rgb = h => { h = String(h); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  const Lm = h => { const c = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - w) + B[i] * w).toString(16).padStart(2, '0')).join(''); };
  const fit = (c, bg, min, to) => { min = min || 4.5; to = to || (Lm(bg) > .35 ? '#000000' : '#ffffff'); let x = c; for (let k = 1; k <= 20 && CR(x, bg) < min; k++) x = mix(c, to, k * .05); return x; };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const hsl = h => { let [r, g, b] = rgb(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; } return [hh * 360, s, l]; };
  const fromHsl = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    let r, g, b; if (!s) r = g = b = l; else { const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); }
    return '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); };
  const spin = (h, deg, s, l) => { const [a, b, c] = hsl(h); return fromHsl(a + deg, s == null ? b : s, l == null ? c : l); };
  H.color = { mix, fit, CR, al, spin };

  /* ── 선 아이콘(24×24, 선 굵기 일정) ── */
  const ci = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const IC = {
    book: 'M4 4.5h6a2 2 0 012 2V20a2 2 0 00-2-2H4zM20 4.5h-6a2 2 0 00-2 2V20a2 2 0 012-2h6z',
    cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6',
    laptop: 'M5 5h14v10H5zM2.5 19h19l-2-4h-15z',
    play: `${ci(12, 12, 9)}M10 8.5l5.5 3.5-5.5 3.5z`,
    pencil: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
    chat: 'M4 5h16v11h-9l-5 4v-4H4z',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4M8 14h2M14 14h2',
    clock: `${ci(12, 12, 9)}M12 7.5V12l3 2`,
    award: `${ci(12, 9, 6)}M8.5 14L7 21l5-3 5 3-1.5-7`,
    cert: 'M4 4h16v12H4zM8 8h8M8 11h5M15 16l-1 5 2.5-1.5L19 21l-1-5',
    users: `${ci(9, 8, 3.5)}M2.5 20a6.5 6.5 0 0113 0M16 4.8a3.5 3.5 0 010 6.4M18.5 14.5a6 6 0 013 5.5`,
    user: `${ci(12, 8, 4)}M4.5 21a7.5 7.5 0 0115 0`,
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
    spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
    chart: 'M4 20V11M10 20V5M16 20v-6M2 20h20',
    target: `${ci(12, 12, 9)}${ci(12, 12, 5)}M12 12l7-7M16 5h3v3`,
    compass: `${ci(12, 12, 9)}M15.5 8.5l-2 5-5 2 2-5z`,
    globe: `${ci(12, 12, 9)}M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18`,
    pin: `M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z${ci(12, 10, 2.5)}`,
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2',
    mail: 'M3 5.5h18v13H3zM3 6.5l9 6.5 9-6.5',
    bell: 'M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4',
    search: `${ci(11, 11, 6.5)}M16 16l5 5`,
    home: 'M3 11l9-7.5 9 7.5M5.5 9.5V20h13V9.5M10 20v-5h4v5',
    heart: 'M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z',
    star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z',
    check: `${ci(12, 12, 9)}M8 12.2l2.8 2.8L16 9.5`,
    arrow: 'M4.5 12h15M13.5 6l6 6-6 6',
    arrowUR: 'M7 17L17 7M9 7h8v8',
    brush: 'M20 4L10.5 13.5M9.5 12.5l2 2c0 3-2.5 5.5-7.5 5.5 0-5 2.5-7.5 5.5-7.5z',
    music: `M9 18V5l11-2v13${ci(6.5, 18, 2.5)}${ci(17.5, 16, 2.5)}`,
    wrench: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
    flask: 'M9.5 3h5M10 3v6L4.5 19a1.5 1.5 0 001.3 2h12.4a1.5 1.5 0 001.3-2L14 9V3M7 15h10',
    brief: 'M3 7.5h18V20H3zM8.5 7.5V4.5h7v3M3 12.5h18M10.5 12.5v2h3v-2',
    card: 'M3 6h18v12H3zM3 10h18M7 14.5h4',
    leaf: 'M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l7-7',
    building: 'M4 21V5l8-2v18M12 8h8v13M2 21h20M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2',
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0012 3z',
    puzzle: 'M4 8h4a2 2 0 114 0h4v4a2 2 0 110 4v4H4v-4a2 2 0 100-4z',
    megaphone: 'M3 10v4h3l8 4.5v-13L6 10zM18 9a4 4 0 010 6M6 14l1.5 5.5h2.5L9 14.5',
    clipboard: 'M8 4h8v3H8zM6 5.5H4.5V21h15V5.5H18M8 12h8M8 16h5',
    download: 'M12 4v11M7 10.5l5 5 5-5M4 20h16',
    video: 'M3 6.5h12v11H3zM15 10.5l6-3.5v10l-6-3.5',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    plus: 'M12 5v14M5 12h14',
    route: `${ci(6, 18, 2.5)}${ci(18, 6, 2.5)}M8.5 18H15a3.5 3.5 0 000-7H9a3.5 3.5 0 010-7h6.5`,
    lock: 'M5.5 10.5h13V21h-13zM8 10.5V7a4 4 0 018 0v3.5M12 14.5v3'
  };
  H.icons = Object.keys(IC);
  /* 다른 파일(hpth · hplay-a)이 쓰는 이름도 받는다 */
  const ALIAS = { cal: 'calendar', tool: 'wrench', doc: 'clipboard', board: 'clipboard', type: 'pencil', arrowUpRight: 'arrowUR', time: 'clock', mic: 'megaphone', graduate: 'cap', school: 'building' };
  /* HPL.icon(name, size, strokeWidth) 또는 HPL.icon(name, { size, sw }) */
  H.icon = (k, n, w) => { if (n && typeof n === 'object') { w = n.sw || n.w; n = n.size; } const d = IC[k] || IC[ALIAS[k]] || IC.check;
    return `<svg class="hpl-ic" viewBox="0 0 24 24" width="${n || 24}" height="${n || 24}" fill="none" stroke="currentColor" stroke-width="${w || 1.7}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`; };
  const ICW = [[/영상|강의|동영상|재생|온라인/, 'play'], [/실습|공구|도구|정비|기계|용접|전기|기술/, 'wrench'], [/질문|답변|상담|소통|코칭|멘토/, 'chat'], [/수료|이수|인증|자격|증명|증서/, 'cert'], [/배지|우수|상장|수상/, 'award'],
    [/일정|기간|개강|모집|학기|기수/, 'calendar'], [/시간|짧은|바쁜|언제든/, 'clock'], [/함께|팀|보호자|가족|동료|커뮤니티/, 'users'], [/강사|선생|교수|담임|1:1|개별/, 'user'], [/법정|의무|보안|안전|신뢰|개인정보/, 'shield'],
    [/AI|인공지능|자동|디지털|챗GPT|GPT/i, 'spark'], [/기록|성적|분석|리포트|데이터|엑셀|통계/, 'chart'], [/목표|진단|레벨|맞춤/, 'target'], [/진로|방향|로드맵|탐색/, 'compass'], [/외국어|영어|글로벌|해외|다국어|일본어|중국어/, 'globe'],
    [/오시는|위치|주소|캠퍼스 안내/, 'pin'], [/전화|연락/, 'phone'], [/메일|이메일/, 'mail'], [/공지|알림|소식/, 'bell'], [/찾기|검색/, 'search'], [/생활|건강|마음|돌봄|복지|정서/, 'heart'],
    [/미술|그림|디자인|드로잉|공예/, 'brush'], [/음악|피아노|악기|노래|합창/, 'music'], [/과학|실험|탐구|화학/, 'flask'], [/취업|직무|업무|직장|커리어|이력서|기업/, 'brief'], [/국비|카드|결제|수강료|비용|지원금/, 'card'],
    [/평생|성장|새로|자연|환경/, 'leaf'], [/기관|센터|학교|교육원|대학/, 'building'], [/아이디어|창의|사고|창업/, 'bulb'], [/놀이|퍼즐|게임|블록/, 'puzzle'], [/홍보|발표|스피치/, 'megaphone'], [/과제|시험|평가|테스트|확인|퀴즈/, 'clipboard'],
    [/자료|교재|책|독서|국어|인문|문학/, 'book'], [/입학|졸업|학위|대학원/, 'cap'], [/코딩|개발|프로그래밍|컴퓨터|노트북|IT/i, 'laptop'], [/작성|글쓰기|필기|논술/, 'pencil'], [/단계|과정|절차|순서/, 'route'], [/로그인|회원|권한|비공개/, 'lock']];
  H.iconFor = (txt, k) => { const s = String(txt || ''); const hit = ICW.find(([re]) => re.test(s)); return hit ? hit[1] : ['spark', 'book', 'target', 'chat', 'chart', 'users'][(k || 0) % 6]; };

  /* ── 아트(SVG 장면) ──
     장면은 1000 × 760 지역 좌표(원점 = 가운데, 바닥선 y = 300)에 그리고, 비율별 화면 크기에 맞춰 키운다. 배경(바탕 · 큰 도형 · 바닥)은 화면 전체를 채운다. */
  const RAT = { '16:9': [1600, 900], '4:3': [1200, 900], '1:1': [1000, 1000], '3:4': [900, 1200], '21:9': [2100, 900], '3:2': [1500, 1000], '4:5': [1000, 1250] };
  let UID = 0;
  function palette(T, mode) { const a = ok6(T && T.a) ? T.a : '#4F46E5';
    if (mode === 'dark') { const base = mix(a, '#07080C', .88); const gold = mix('#D8B46A', a, .12);
      return { bg1: mix(base, '#000000', .25), bg2: base, soft: mix(a, '#07080C', .68), mid: mix(a, '#07080C', .45), deep: mix(a, '#000000', .8), ink: '#050608', paper: mix('#EDE6D6', a, .06), mute: mix('#EDE6D6', base, .55), hi: gold, hi2: mix(gold, '#ffffff', .35), line: al(gold, .55), dot: al('#ffffff', .07), shade: al('#000000', .35) }; }
    if (mode === 'warm') { const [h] = hsl(a);
      const wr = h < 70 || h > 330; return { bg1: mix(a, '#FFF7EC', .9), bg2: mix(a, '#FFE7CF', .78), soft: mix(a, '#ffffff', .55), mid: a, deep: mix(a, '#1A1030', .5), ink: mix(a, '#1A1030', .78), paper: '#ffffff', mute: mix(a, '#ffffff', .72), hi: mix('#FFC23D', a, .12), hi2: mix(wr ? '#2BB8A8' : '#FF7F6E', a, .15), line: al(mix(a, '#1A1030', .5), .18), dot: al(a, .14), shade: al(mix(a, '#1A1030', .6), .14) }; }
    return { bg1: mix(a, '#ffffff', .92), bg2: mix(a, '#ffffff', .78), soft: mix(a, '#ffffff', .58), mid: a, deep: mix(a, '#0A0F1E', .52), ink: mix(a, '#0A0F1E', .8), paper: '#ffffff', mute: mix(a, '#ffffff', .8), hi: mix('#F4B740', a, .12), hi2: mix('#FF8A6B', a, .18), line: al(mix(a, '#0A0F1E', .5), .16), dot: al(a, .16), shade: al(mix(a, '#0A0F1E', .6), .14) }; }
  /* 작은 그리기 도구 */
  const R = (x, y, w, h, f, rx, ex) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} fill="${f}"${ex || ''}/>`;
  const C = (x, y, r, f, ex) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${ex || ''}/>`;
  const P = (d, f, ex) => `<path d="${d}" fill="${f || 'none'}"${ex || ''}/>`;
  const Ln = (d, st, w, ex) => `<path d="${d}" fill="none" stroke="${st}" stroke-width="${w || 6}" stroke-linecap="round" stroke-linejoin="round"${ex || ''}/>`;
  const Tx = (x, y, s, f, size, ex) => `<text x="${x}" y="${y}" fill="${f}" font-size="${size || 40}" font-family="Georgia,'Noto Serif KR',serif"${ex || ''}>${s}</text>`;
  const shadowE = (x, y, rx, p) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${Math.round(rx * .08)}" fill="${p.shade}"/>`;
  const plant = (x, y, p, s) => { s = s || 1; return `<g transform="translate(${x} ${y}) scale(${s})">${P('M-34 0h68l-10 70h-48z', p.deep)}${P('M0 0C-10-60-60-90-90-80C-80-40-40-10 0 0z', p.mid)}${P('M0 0C10-70 50-110 92-104C86-56 50-14 0 0z', p.soft)}${P('M0 0C-4-50 4-100 20-130C34-90 24-40 0 0z', p.deep, ' opacity=".9"')}</g>`; };
  const mug = (x, y, p) => `<g transform="translate(${x} ${y})">${R(-34, -70, 68, 70, p.paper, 10)}${Ln('M34-52c26 0 26 34 0 34', p.paper, 9)}${R(-34, -70, 68, 14, p.hi, 6)}${Ln('M-10-96c-8-12 8-18 0-30M12-96c-8-12 8-18 0-30', p.soft, 5)}</g>`;

  /* 장면: (p, r) => { b: 배경 무늬 종류, g: 물체 그림 } — r은 0~1 시드 */
  const SC = {
    classroom: { n: '교실', b: 'arch', g: p => `${R(-380, -300, 760, 290, p.deep, 14)}${R(-364, -284, 728, 258, mix(p.deep, '#1F3A2E', .35), 8)}${Ln('M-320-230h170M-320-190h120M-320-150h210', al('#ffffff', .55), 7)}${Ln('M40-230c30-40 70 40 100 0s70 40 100 0', al('#ffffff', .55), 7)}${Ln('M60-130h180', p.hi, 8)}${R(-380, -10, 760, 16, p.ink, 4)}
      ${[-1, 0, 1].map(k => `${P(`M${k * 260 - 110} 120h220l30 70h-280z`, p.paper)}${R(k * 260 - 124, 190, 248, 14, p.mid, 4)}${R(k * 260 - 100, 204, 12, 90, p.mid)}${R(k * 260 + 88, 204, 12, 90, p.mid)}${R(k * 260 - 60, 40, 120, 64, p.soft, 14)}${R(k * 260 - 50, 104, 12, 30, p.soft)}${R(k * 260 + 38, 104, 12, 30, p.soft)}`).join('')}${R(240, -60, 90, 54, p.hi2, 6)}` },
    laptop: { n: '노트북 · 코딩', b: 'circle', g: p => `${shadowE(0, 300, 420, p)}${R(-300, -240, 600, 380, p.ink, 26)}${R(-280, -220, 560, 340, mix(p.ink, p.deep, .5), 12)}${C(-250, -196, 7, p.hi2)}${C(-228, -196, 7, p.hi)}${C(-206, -196, 7, p.soft)}
      ${[['M-240-150h120', p.hi], ['M-100-150h160', p.soft], ['M-210-110h200', p.paper], ['M-210-70h90', p.hi2], ['M-100-70h180', p.soft], ['M-240-30h70', p.hi], ['M-210 10h240', p.paper], ['M-210 50h130', p.soft], ['M-240 90h100', p.hi]].map(([d, c]) => Ln(d, c, 12, ' opacity=".9"')).join('')}
      ${R(110, -150, 140, 150, al('#ffffff', .1), 12)}${Ln('M130-40l30-40 30 20 40-60', p.hi, 8)}${P('M-380 140h760l-50 70h-660z', p.mid)}${R(-90, 160, 180, 14, p.deep, 7)}${mug(330, 290, p)}${plant(-360, 220, p, .8)}` },
    books: { n: '책 · 독서', b: 'circle', g: p => `${shadowE(0, 300, 380, p)}${R(-300, 230, 520, 70, p.deep, 10)}${R(-270, 166, 470, 64, p.hi, 10)}${R(-320, 104, 500, 62, p.mid, 10)}${R(-250, 46, 420, 58, p.soft, 10)}${Ln('M-260 265h300M-240 198h240M-290 135h330M-220 75h220', al('#ffffff', .6), 7)}
      ${P('M-60 46c60-60 160-60 220 0V-160c-60-60-160-60-220 0z', p.paper)}${P('M160 46c60-60 160-60 220 0V-160c-60-60-160-60-220 0z', mix(p.paper, p.bg2, .5))}${Ln('M160-160V46', p.deep, 6)}${Ln('M-30-120h150M-30-90h150M-30-60h110M190-120h150M190-90h150M190-60h90', p.soft, 8)}
      ${R(300, -40, 22, 300, p.hi2, 6, ' transform="rotate(24 311 110)"')}${P('M268 248l14 50 26-40z', p.ink, ' transform="rotate(0)"')}${C(-340, -120, 18, p.hi)}${C(360, -220, 10, p.mid)}` },
    campus: { n: '캠퍼스', b: 'sun', g: p => `${shadowE(0, 300, 470, p)}${P('M-340-120L0-280l340 160z', p.deep)}${R(-320, -120, 640, 34, p.ink)}${[0, 1, 2, 3, 4, 5].map(k => R(-286 + k * 108, -76, 44, 300, p.paper, 4)).join('')}${R(-340, 224, 680, 30, p.ink)}${R(-370, 254, 740, 26, p.mid)}${C(0, -170, 30, p.paper)}${Ln('M0-186v16l12 8', p.deep, 6)}
      ${R(-14, -400, 6, 120, p.deep)}${P('M-8-400h90l-20 26 20 26h-90z', p.hi)}${C(-430, 170, 70, p.mid)}${R(-436, 200, 12, 100, p.deep)}${C(440, 180, 58, p.soft)}${R(434, 210, 12, 90, p.deep)}${C(-390, 210, 46, p.soft)}` },
    city: { n: '도시', b: 'sun', g: p => `${[[-480, 120, 150, p.soft], [-330, 40, 110, p.soft], [-230, 90, 130, p.soft], [-90, -20, 120, p.soft], [40, 60, 150, p.soft], [200, -60, 110, p.soft], [320, 50, 160, p.soft]].map(([x, y, w, c]) => R(x, y - 120, w, 420 - y, c, 4)).join('')}
      ${[[-440, -40, 120], [-300, -170, 140], [-140, -60, 110], [-10, -250, 150], [160, -120, 120], [300, -10, 150]].map(([x, y, w], k) => `${R(x, y, w, 300 - y, k % 2 ? p.deep : p.mid, 4)}${Array.from({ length: Math.floor((280 - y) / 46) }, (_, r) => [0, 1, 2].map(c => R(x + 16 + c * ((w - 32) / 3), y + 20 + r * 46, (w - 32) / 3 - 12, 24, k % 2 ? al('#ffffff', .22) : al('#ffffff', .35), 3)).join('')).join('')}`).join('')}
      ${R(-14, -330, 8, 80, p.deep)}${R(-560, 296, 1120, 10, p.ink)}` },
    workshop: { n: '공구 · 실습', b: 'grid', g: p => `${R(-360, -300, 720, 440, p.mute, 18)}${Array.from({ length: 7 }, (_, r) => Array.from({ length: 13 }, (_, c) => C(-330 + c * 55, -270 + r * 62, 6, p.soft)).join('')).join('')}
      <g transform="rotate(-38 -120 -60)">${R(-140, -250, 40, 360, p.deep, 14)}${P('M-170-300h100v60l-30 20h-40l-30-20z', p.ink)}</g><g transform="rotate(32 140 -60)">${R(120, -230, 36, 330, p.mid, 14)}${P('M98-300c0 0 20 60 40 60s40-60 40-60c40 30 40 100-6 120h-68c-46-20-46-90-6-120z', p.ink)}</g>
      <g transform="translate(250 120)">${C(0, 0, 90, p.hi)}${Array.from({ length: 8 }, (_, k) => R(-18, -118, 36, 46, p.hi, 6, ` transform="rotate(${k * 45})"`)).join('')}${C(0, 0, 34, p.paper)}</g>${R(-340, 170, 360, 130, p.deep, 14)}${R(-260, 140, 200, 40, p.ink, 10)}${R(-340, 210, 360, 12, p.ink)}${R(-196, 232, 72, 26, p.hi2, 6)}` },
    art: { n: '미술 · 붓', b: 'circle', g: p => `${shadowE(0, 300, 420, p)}${Ln('M-150 300L-40-260M150 300L40-260M0-260v560', p.deep, 18)}${R(-220, -230, 440, 330, p.paper, 6)}${R(-200, -210, 400, 290, mix(p.bg1, p.paper, .4), 4)}${C(-60, -80, 90, p.mid)}${P('M-200 80L-60-60 40 30 120-40 200 30V80z', p.deep)}${C(110, -140, 38, p.hi)}${R(-240, 100, 480, 22, p.ink, 6)}
      <g transform="translate(-330 210) rotate(-12)">${P('M0-70c70-30 160-10 170 40 6 30-30 30-40 50-14 30 10 50-50 50C10 70-70 30 0-70z', p.paper)}${C(30, -40, 16, p.hi2)}${C(80, -46, 16, p.hi)}${C(122, -26, 16, p.mid)}${C(20, 10, 16, p.deep)}${C(90, 50, 22, p.bg2)}</g>
      <g transform="translate(330 160)">${R(-60, 0, 120, 140, p.mid, 16)}${R(-30, -150, 14, 160, p.deep, 6, ' transform="rotate(-12)"')}${R(10, -170, 14, 180, p.ink, 6, ' transform="rotate(8)"')}${P('M-46-160l20-40 14 40z', p.hi2, ' transform="rotate(-12)"')}</g>` },
    music: { n: '음악 · 악기', b: 'rings', g: p => `${shadowE(0, 300, 460, p)}${P('M-420 120h840l-30 180h-780z', p.ink)}${Array.from({ length: 14 }, (_, k) => R(-396 + k * 57, 140, 52, 150, p.paper, 4)).join('')}${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map(k => R(-362 + k * 57, 140, 34, 90, p.ink, 3)).join('')}
      ${[-200, -170, -140, -110, -80].map(y => Ln(`M-360 ${y}H360`, p.line, 3)).join('')}${[[-280, -110, 1], [-170, -140, 0], [-60, -95, 1], [60, -155, 0], [180, -125, 1], [290, -170, 0]].map(([x, y, f]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="16" fill="${f ? p.deep : p.mid}" transform="rotate(-20 ${x} ${y})"/>${R(x + 16, y - 110, 7, 110, f ? p.deep : p.mid, 3)}`).join('')}
      ${P('M-276-220h270v26h-270z', 'none')}${Ln('M196-235c40 0 60 20 60 50', p.deep, 7)}${P('M330-60l50-200h20l50 200z', p.hi)}${Ln('M390-240l40 130', p.deep, 6)}` },
    chalkboard: { n: '칠판 수식', b: 'none', g: p => { const bd = mix(p.deep, '#163A2C', .25); return `${R(-470, -320, 940, 560, mix(p.ink, '#3A2A1A', .3), 22)}${R(-446, -296, 892, 512, bd, 10)}
      ${Tx(-400, -200, 'a² + b² = c²', al('#ffffff', .9), 54)}${Tx(-400, -110, 'y = ax + b', al('#ffffff', .78), 46)}${Tx(-400, -20, '∫ f(x) dx', p.hi, 50)}${Tx(-400, 70, 'Δ = b² − 4ac', al('#ffffff', .72), 42)}${Tx(-400, 150, 'π ≈ 3.14', al('#ffffff', .6), 40)}
      ${Ln('M110-40L330-40 110-240z', al('#ffffff', .85), 6)}${Ln('M110-70h30v30', al('#ffffff', .85), 4)}${Tx(200, 10, 'b', al('#ffffff', .8), 38)}${Tx(60, -130, 'a', al('#ffffff', .8), 38)}${Tx(230, -150, 'c', p.hi, 38)}${Ln('M120 120c40-60 90 60 130 0s90 60 130 0', p.hi2, 6)}
      ${R(-470, 240, 940, 26, mix(p.ink, '#3A2A1A', .3), 6)}${R(240, 222, 110, 22, p.paper, 6)}${R(250, 226, 90, 14, p.soft, 4)}${R(140, 230, 60, 10, p.paper, 5)}`; } },
    data: { n: '데이터 · 대시보드', b: 'grid', g: p => `${shadowE(0, 300, 440, p)}${R(-420, -280, 840, 540, p.paper, 26)}${R(-420, -280, 840, 64, p.mute, 26)}${R(-420, -240, 840, 24, p.mute)}${C(-380, -248, 9, p.hi2)}${C(-352, -248, 9, p.hi)}${C(-324, -248, 9, p.soft)}
      ${[90, 160, 120, 210, 180, 250].map((h, k) => R(-370 + k * 62, 200 - h, 40, h, k === 5 ? p.mid : p.soft, 8)).join('')}${Ln('M-380 210h380', p.line, 4)}
      ${Ln('M40 120C90 60 130 140 180 40s110-10 160-100', p.mid, 9)}${Ln('M40 200C110 170 170 210 220 150s80-30 120-40', p.hi, 7)}${[[180, 40], [340, -60]].map(([x, y]) => C(x, y, 14, p.paper, ` stroke="${p.mid}" stroke-width="7"`)).join('')}
      ${C(-260, -130, 56, 'none', ` stroke="${p.soft}" stroke-width="26"`)}${P('M-260-186a56 56 0 0153 74', 'none', ` stroke="${p.deep}" stroke-width="26"`)}${R(-170, -160, 140, 16, p.mute, 8)}${R(-170, -124, 100, 16, p.mute, 8)}${R(40, -160, 300, 16, p.mute, 8)}${R(40, -124, 220, 16, p.mute, 8)}` },
    blocks: { n: '블록 · 놀이', b: 'circle', g: p => `${shadowE(0, 300, 420, p)}${[[-230, 150, 150, p.mid, 'A'], [-70, 150, 150, p.hi, 'B'], [90, 150, 150, p.hi2, 'C'], [-150, 0, 150, p.soft, '1'], [10, 0, 150, p.deep, '2'], [-70, -150, 150, p.hi, '★']].map(([x, y, s, c, t]) => `${R(x, y, s, s, c, 22)}${R(x + 16, y + 16, s - 32, s - 32, al('#ffffff', .18), 14)}<text x="${x + s / 2}" y="${y + s / 2 + 30}" text-anchor="middle" fill="${CR(c, '#ffffff') > 2.2 ? '#ffffff' : p.ink}" font-size="84" font-weight="800" font-family="Pretendard,sans-serif">${t}</text>`).join('')}
      ${C(330, 230, 70, p.hi2)}${Ln('M262 220c40 20 100 20 136 0M300 166c10 40 10 90 0 130', al('#ffffff', .7), 8)}${[[-400, 120, p.mid, -20], [-360, 100, p.hi, -8], [-320, 110, p.hi2, 6]].map(([x, y, c, r]) => `<g transform="rotate(${r} ${x} ${y})">${R(x - 14, y, 28, 190, c, 6)}${P(`M${x - 14} ${y}l14-40 14 40z`, c)}</g>`).join('')}${P('M330-200l14 30 32 4-24 22 6 32-28-16-28 16 6-32-24-22 32-4z', p.hi)}` },
    care: { n: '돌봄 · 건강', b: 'circle', g: p => `${shadowE(0, 300, 360, p)}${P('M0 250C-160 150-300 40-300-90a150 150 0 01300-70 150 150 0 01300 70C300 40 160 150 0 250z', p.mid)}${Ln('M-260-20h120l40-90 60 170 50-120 30 40h220', p.paper, 16)}
      ${C(330, -220, 64, p.paper)}${R(310, -270, 40, 100, p.hi2, 6)}${R(280, -240, 100, 40, p.hi2, 6)}${R(-420, 150, 150, 150, p.paper, 30)}${R(-400, 200, 110, 14, p.soft, 7)}${R(-400, 232, 70, 14, p.soft, 7)}${plant(360, 230, p, .9)}` }
  };
  /* 주제(낱말로 고른 것) → 그림 12종. 사진(window.HPSTOCK)을 고를 때는 주제를 그대로 쓴다 */
  const SCA = { science: 'chalkboard', globe: 'books', lecture: 'classroom', library: 'books', kitchen: 'workshop', diploma: 'campus', path: 'city', desk: 'laptop', sprout: 'care', map: 'city', calendar: 'data', mentor: 'classroom', ai: 'laptop', media: 'art', office: 'data', sports: 'blocks' };
  const drawOf = id => SC[id] ? id : SCA[id] && SC[SCA[id]] ? SCA[id] : 'books';
  H.artList = Object.keys(SC).map(id => ({ id, name: SC[id].n }));
  /* 업종 · 낱말 → 장면 */
  const KW = [[/수학|연산|공식|칠판|과학고|수능|입시|모의고사/, 'chalkboard'], [/과학|실험|탐구|STEM|로봇|화학|생물/i, 'science'], [/영어|외국어|어학|글로벌|해외|일본어|중국어|다국어|유학/, 'globe'], [/코딩|개발|프로그래밍|IT|소프트웨어|웹|앱/i, 'laptop'], [/AI|인공지능|챗GPT|GPT|자동화|머신러닝/i, 'ai'],
    [/데이터|엑셀|통계|분석|대시보드|회계|재무/, 'data'], [/미술|그림|디자인|드로잉|공예|캘리|일러스트/, 'art'], [/음악|피아노|악기|노래|합창|성악|바이올린|기타 교실/, 'music'], [/요리|조리|제과|제빵|바리스타|커피|식음/, 'kitchen'], [/정비|용접|전기|기계|목공|공구|설비|자동차|건축 실무|기능사/, 'workshop'],
    [/유아|어린이|키즈|놀이|유치|초등 저학년|블록/, 'blocks'], [/돌봄|복지|건강|요양|간호|보건|어르신|실버|치유|심리/, 'care'], [/체육|운동|스포츠|요가|필라테스|태권도|수영/, 'sports'], [/영상|유튜브|미디어|촬영|방송|편집|사진/, 'media'], [/독서|논술|국어|인문|글쓰기|문학|책/, 'books'],
    [/도서관|연구|아카이브|학술/, 'library'], [/대학|캠퍼스|학과|학부|대학원|교수|전문대/, 'campus'], [/수료|자격|인증|졸업|학위|이수증|시험 대비/, 'diploma'], [/상담|멘토|코칭|진로|컨설팅/, 'mentor'], [/강연|특강|세미나|발표|컨퍼런스|포럼/, 'lecture'],
    [/공공|시청|구청|도청|지자체|공무원|정부|공단|재단|인재개발/, 'city'], [/기업|직무|사내|임직원|리더십|HRD|온보딩|직장/, 'office'], [/일정|학사|모집|기수|시간표|연간/, 'calendar'], [/평생|시민|주민|생활|새로운 시작|인생/, 'sprout'], [/오시는|지도|위치|찾아오/, 'map'], [/단계|로드맵|여정|성장|과정 안내/, 'path'], [/교실|수업|반별|담임|학원/, 'classroom']];
  const BYTYPE = { k12: ['classroom', 'chalkboard', 'books', 'blocks', 'desk', 'science'], adult: ['laptop', 'desk', 'data', 'mentor', 'books', 'ai'], univ: ['campus', 'library', 'lecture', 'diploma', 'books', 'path'], corp: ['office', 'data', 'laptop', 'mentor', 'ai', 'city'],
    public: ['city', 'campus', 'calendar', 'diploma', 'map', 'lecture'], lifelong: ['sprout', 'care', 'books', 'music', 'art', 'path'], voc: ['workshop', 'laptop', 'kitchen', 'diploma', 'office', 'ai'] };
  const SLOTR = { hero: '4:3', about: '4:3', teacher: '3:4', space: '16:9', gallery: '4:3', card: '4:3', cta: '16:9', side: '3:4', banner: '21:9' };
  const hashS = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function textOf(s) { s = s || {}; const tp = (typeof TPL !== 'undefined' && s.tpl) ? (TPL.find(t => t.id === s.tpl) || {}) : {}; const b = ((s.sections || []).find(x => x.type === 'banner') || {}).data || {};
    const org = (typeof S !== 'undefined' && S && S.org) ? S.org : {}; const cls = (typeof S !== 'undefined' && S && S.classes) ? S.classes.slice(0, 6).map(c => c.name).join(' ') : '';
    return { main: [tp.name, tp.scene, b.eyebrow, b.title, b.sub, org.name].filter(Boolean).join(' '), more: cls, type: org.type || 'adult' }; }
  /* 자리 이름 → 장면 id */
  /* 자리 → 주제 후보(앞쪽이 더 맞음). 주제 id는 KW · BYTYPE의 이름(그림은 drawOf로 12종에 대응) */
  const SUBJ = new Set([...KW.map(x => x[1]), ...Object.values(BYTYPE).flat()]);
  function subjects(slot, s, opt) { opt = opt || {}; const tx = textOf(s); const own = opt.text ? String(opt.text) : '';
    const hits = []; const add = id => { if (SUBJ.has(id) && !hits.includes(id)) hits.push(id); };
    if (opt.scene) add(opt.scene); const im = s && s.img && s.img[slot]; if (im && im.art) add(im.art);
    /* 자기 글(특징 · 강좌 이름)은 글 앞쪽에 나온 낱말을 먼저 */
    if (own) KW.map(([re, id]) => { const m = re.exec(own); return m ? [m.index, id] : null; }).filter(Boolean).sort((x, y) => x[0] - y[0]).forEach(([, id]) => add(id));
    const ownN = hits.length;
    KW.forEach(([re, id]) => { if (re.test(tx.main)) add(id); }); KW.forEach(([re, id]) => { if (re.test(tx.more)) add(id); }); (BYTYPE[tx.type] || BYTYPE.adult).forEach(add);
    /* 번호 자리(g1 · feat2 …)는 후보를 돌려 쓴다 */
    if (!ownN && slot !== 'hero') { const m = /(\d+)$/.exec(slot); const k = m ? +m[1] : (hashS(slot) % 5) + 1; const r = (k - 1) % Math.max(1, hits.length); return { list: [...hits.slice(r), ...hits.slice(0, r)], type: tx.type, own: false }; }
    return { list: hits, type: tx.type, own: !!ownN }; }
  /* 한 화면(한 번 그리기) 안에서는 같은 그림 · 같은 사진을 되풀이하지 않는다 */
  const USED = new Set(); let usedT = 0;
  const mark = id => { USED.add(id); if (!usedT) { usedT = 1; Promise.resolve().then(() => { USED.clear(); usedT = 0; }); } };
  const GENERIC = ['books', 'laptop', 'classroom', 'campus', 'city', 'data', 'care', 'art'];
  function pickScene(slot, s, opt) { opt = opt || {}; if (opt.scene && SC[drawOf(opt.scene)] && SUBJ.has(opt.scene) || SC[opt.scene]) return drawOf(opt.scene);
    const im = s && s.img && s.img[slot]; if (im && im.art) return drawOf(im.art);
    const L = subjects(slot, s, opt).list.map(drawOf); const free = [...L, ...GENERIC].filter(id => !USED.has('a:' + id)); return free[0] || L[0] || 'books'; }
  /* 샘플 사진(window.HPSTOCK, 요원 P): 주제 · 기관 유형 · 자리로 고른다. 없으면 null → 그림 */
  const stockOk = () => window.HPSTOCK && Array.isArray(window.HPSTOCK.list) && window.HPSTOCK.list.length;
  const slotKind = slot => { const b = String(slot).replace(/\d+$/, ''); return /^cls-|^card/.test(b) ? 'card' : ['hero', 'about', 'space', 'gallery', 'card', 'teacher', 'cta'].includes(b) ? b : 'gallery'; };
  function pickStock(slot, s, opt) { opt = opt || {}; if (!stockOk() || opt.noStock || (s && (s.noStock || s.stockOff))) return null;
    try { const ex = [...USED].filter(x => x.startsWith('p:')).map(x => x.slice(2)); const ok = x => x && x.src && !ex.includes(x.id);
      if (s && s.photos && s.photos[slot]) { const x = window.HPSTOCK.list.find(y => y.id === s.photos[slot]); if (x) return x; } /* 템플릿이 정한 사진(tp.photos) */
      const tx = textOf(s); const kind = slotKind(slot); const seed = ((typeof S !== 'undefined' && S && S.org && S.org.name) || '') + '|' + slot;
      const scenes = [opt.text, String(slot) === 'hero' || !opt.text ? tx.main : '', ...subjects(slot, s, opt).list.slice(0, 3)].filter(Boolean);
      if (typeof window.HPSTOCK.forScene === 'function') for (const sc of scenes) { let x = window.HPSTOCK.forScene(tx.type, sc, kind, { seed, exclude: ex }); if (Array.isArray(x)) x = x.find(ok); if (ok(x)) return x; }
      const L = window.HPSTOCK.list.filter(x => ok(x) && (!x.types || x.types.includes(tx.type))); return L.length ? L[hashS(seed) % L.length] : null; } catch (e) { console.error('HPL stock', e); return null; } }
  H.stockFor = pickStock;
  function bgMotif(kind, W, H, p, cx, cy, k, id) {
    const big = Math.max(W, H);
    if (kind === 'sun') return C(cx + 180 * k, cy - 120 * k, 300 * k, p.bg2) + C(cx + 180 * k, cy - 120 * k, 420 * k, 'none', ` stroke="${p.bg2}" stroke-width="${3 * k}" opacity=".7"`);
    if (kind === 'arch') return P(`M${cx - 420 * k} ${H}V${cy - 60 * k}a${420 * k} ${420 * k} 0 0 1 ${840 * k} 0V${H}z`, p.bg2);
    if (kind === 'rings') return [260, 380, 500, 620].map((r, i) => C(cx, cy, r * k, 'none', ` stroke="${p.bg2}" stroke-width="${(i ? 3 : 0) * k + 2}"`)).join('') + C(cx, cy, 260 * k, p.bg2);
    if (kind === 'grid') return `<defs><pattern id="${id}d" width="${44 * k}" height="${44 * k}" patternUnits="userSpaceOnUse">${C(2 * k, 2 * k, 2.4 * k, p.dot)}</pattern></defs>${R(0, 0, W, H, `url(#${id}d)`)}${R(cx - 470 * k, cy - 330 * k, 940 * k, 660 * k, p.bg2, 40 * k, ' opacity=".55"')}`;
    if (kind === 'window') return `${R(cx - 300 * k, cy - 380 * k, 600 * k, 420 * k, p.bg2, 12 * k)}${R(cx - 6 * k, cy - 380 * k, 12 * k, 420 * k, p.bg1)}${R(cx - 300 * k, cy - 176 * k, 600 * k, 12 * k, p.bg1)}${C(cx + 170 * k, cy - 280 * k, 50 * k, p.mute)}`;
    if (kind === 'circle') return C(cx + 60 * k, cy - 40 * k, 380 * k, p.bg2) + C(cx - 420 * k, cy - 280 * k, 40 * k, p.soft, ' opacity=".6"') + C(cx + 480 * k, cy + 140 * k, 24 * k, p.hi, ' opacity=".8"');
    return '';
  }
  /* HPL.art(slot, site, th, T, opt) → <svg> 문자열(가득 채움: preserveAspectRatio slice) */
  H.art = function (slot, s, th, T, opt) { opt = opt || {}; slot = String(slot || 'hero');
    try {
      T = T || (window.HPT && HPT.tokens && HPT.tokens(s)) || { a: (s && s.color) || '#4F46E5' };
      const rq = String(opt.ratio || '').replace(/\s/g, '').replace('/', ':'); const ratio = RAT[rq] ? rq : SLOTR[slot.replace(/\d+$/, '')] || '4:3'; const [W, Hh] = RAT[ratio];
      const id = pickScene(slot, s, opt); mark('a:' + id); const sc = SC[id]; const p = palette(T, opt.mode);
      const k = Hh > W ? W / 900 : Math.min(W / 1060, Hh / 800); const cx = W / 2, cy = Hh * (Hh > W ? .55 : .5);
      const u = 'hpa' + (++UID).toString(36);
      const ground = R(0, cy + 300 * k, W, Hh - cy - 300 * k + 2, p.bg2) + R(0, cy + 300 * k, W, 3 * k, p.line);
      const motif = bgMotif(sc.b, W, Hh, p, cx, cy, k, u);
      return `<svg class="hpl-art" data-art="${id}" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${mix(p.bg1, p.bg2, .55)}"/></linearGradient></defs>${R(0, 0, W, Hh, `url(#${u}g)`)}${motif}${sc.b === 'none' ? '' : ground}<g transform="translate(${cx} ${cy}) scale(${k})">${sc.g(p)}</g></svg>`;
    } catch (e) { console.error('HPL.art', e); return `<svg class="hpl-art" viewBox="0 0 4 3" preserveAspectRatio="none" aria-hidden="true"><rect width="4" height="3" fill="${(T && T.as) || '#EEF0FF'}"/></svg>`; } };
  H.artScene = (slot, s, opt) => pickScene(slot, s, opt);
  H.subjects = (slot, s, opt) => subjects(slot, s, opt).list;

  /* ── 이미지 자리 ── */
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const imgOf = (slot, s) => { if (typeof H.img === 'function' && H.img !== imgOf) { try { return H.img(s, slot); } catch (e) { return null; } } const im = s && s.img && s.img[slot]; if (im && im.src) return im;
    if (slot === 'hero') { const b = ((s && s.sections) || []).find(x => x.type === 'banner'); const d = b && b.data; if (d && d.img) return { src: d.img, alt: d.alt || '', fit: 'cover' }; } return null; };
  if (typeof H.img !== 'function') H.img = (s, slot) => imgOf(slot, s);
  /* opt: { ratio, cls, mode, scene, text(장면 고를 글), cap(작은 설명) } */
  const figB = function (slot, s, T, opt) { opt = opt || {}; const im = imgOf(slot, s); const r = RAT[opt.ratio] ? opt.ratio : SLOTR[String(slot).replace(/\d+$/, '')] || '4:3';
    const ar = r.replace(':', ' / ');
    const st = im ? null : pickStock(slot, s, opt); if (st) mark('p:' + st.id);
    const pos = v => E(/^[\d.]+% [\d.]+%$/.test(v || '') ? v : '50% 50%');
    const small = /^(cls-|card|about\d|gallery)/.test(String(slot)) && st && st.src800;
    const inner = im ? `<img src="${E(im.src)}" alt="${E(im.alt || '')}" style="object-fit:${im.fit === 'contain' ? 'contain' : 'cover'};object-position:${pos(im.pos)}" loading="lazy" decoding="async">`
      : st ? `<img src="${E(small ? st.src800 : st.src)}" alt="${E(st.alt || '')}" style="object-fit:cover;object-position:${pos(st.focus)}" loading="${String(slot) === 'hero' ? 'eager' : 'lazy'}" decoding="async">`
      : H.art(slot, s, null, T, { ratio: r, mode: opt.mode, scene: opt.scene, text: opt.text });
    /* 샘플 사진은 data-stock(바로 고치기 화면에서만 '샘플' 표시 · D4) — 게시본에는 표시 없음 */
    return `<figure class="hpl-img${opt.cls ? ' ' + opt.cls : ''}${im ? ' hpl-photo' : st ? ' hpl-photo hpl-stock' : ' hpl-isart'}" data-slot="${E(slot)}"${st ? ` data-stock="${E(st.id)}" data-tone="${E(st.tone || '')}"` : ''} style="aspect-ratio:${ar}">${inner}${opt.cap ? `<figcaption>${E(opt.cap)}</figcaption>` : ''}</figure>`; };
  if (typeof H.fig !== 'function') H.fig = (slot, s, th, T, o) => figB(slot, s, T, Object.assign({}, o, { ratio: String((o && o.ratio) || '').replace('/', ':') }));
  H.FIG_CSS = `.hpl-img{position:relative;margin:0;overflow:hidden;display:block;width:100%;background:var(--as,#EEF0FF)}.hpl-img>svg,.hpl-img>img{position:absolute;inset:0;width:100%;height:100%;display:block}.hpl-img>figcaption{position:absolute;z-index:1}`;

  /* ═════════ 레이아웃 계열 공통 도구 ═════════ */
  const t_ = k => (typeof t === 'function' ? t(k) : k === 'cls' ? '강좌' : k);
  const won_ = v => (typeof won === 'function' ? won(v) : Number(v).toLocaleString('ko-KR') + '원');
  const br = v => E(v).replace(/\n/g, '<br>');
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const pubAll = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료');
  const pub = () => { const L = pubAll(); const Rn = L.filter(c => c.status === '운영중'); return Rn.length ? Rn : L; };
  const dot = d => String(d || '').replace(/-/g, '.');
  const perOf = c => c.period && c.period.mode === 'days' && +c.period.days ? `신청일부터 ${+c.period.days}일` : (c.start || c.end) ? [dot(c.start), dot(c.end)].filter(Boolean).join(' ~ ') : '';
  const lesOf = c => (c.curriculum || []).length;
  const priceOf = c => +c.price ? won_(c.price) : '무료';
  const KIND = c => ({ live: '실시간', offline: '현장', blend: '혼합', sub: '구독', pack: '패키지' })[c.kind] || '온라인';
  const linkHref = v => !v ? '' : v.startsWith('learn:') ? '#p-' + ({ home: 'home', shop: 'm-class', textbooks: 'm-book', comm: 'm-community', notice: 'm-notice' }[v.slice(6)] || 'home') : v.startsWith('page:') ? '#p-' + v.slice(5) : v.startsWith('cls:') ? '#p-c-' + v.slice(4) : v.startsWith('url:') ? (typeof safeURL === 'function' ? safeURL(v.slice(4)) : '') : '';
  const aAttr = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const menuOf = (s, kind) => (s.menus || []).find(m => m.kind === kind && m.on !== false);
  const menusOn = s => (s.menus || []).filter(m => m.on !== false && m.kind !== 'home' && m.access !== '비공개' && m.access !== '지정 회원');
  const mHref = m => m.link ? linkHref(m.link) || '#p-m-' + m.id : '#p-m-' + m.id;
  const clsHref = s => { const m = menuOf(s, 'class'); return m ? '#p-m-' + m.id : (pub()[0] ? '#p-c-' + pub()[0].id : ''); };
  const ft = () => ((typeof S !== 'undefined' && S && S.settings && S.settings.footer) || {});
  function contact() { const f = ft(); const L = [];
    if (f.tel && !isPh(f.tel)) L.push({ ic: 'phone', k: '전화', v: f.tel, h: 'tel:' + String(f.tel).replace(/[^\d+]/g, '') });
    if (f.email && !isPh(f.email) && /@/.test(f.email)) L.push({ ic: 'mail', k: '이메일', v: f.email, h: 'mailto:' + f.email });
    if (f.addr && !isPh(f.addr)) L.push({ ic: 'pin', k: '주소', v: f.addr, h: '' });
    return L; }
  const askHref = s => { const c = contact().find(x => x.h); if (c) return c.h; const m = menuOf(s, 'community') || menuOf(s, 'board'); return m ? '#p-m-' + m.id : ''; };
  const facts = () => (window.HPT && typeof HPT.facts === 'function' ? HPT.facts() : []);
  function badges() { const Cc = pub(); const B = [];
    if (Cc.some(c => c.cert === 'auto' || c.cert === 'manual')) B.push(['cert', '수료증 발급']);
    if (S.settings && S.settings.pg === 'toss' && S.settings.toss && S.settings.toss.status === '승인' && Cc.some(c => +c.price)) B.push(['card', '온라인 결제']);
    if (Cc.some(c => !+c.price)) B.push(['star', `무료 ${t_('cls')} 있음`]);
    if (Cc.some(c => c.period && c.period.mode === 'days')) B.push(['clock', '신청 즉시 수강']);
    if (Cc.length) B.push(['laptop', 'PC · 휴대폰 수강']);
    return B.slice(0, 3); }
  const notices = n => [...((S && S.notices) || []), ...((S && S.classes) || []).flatMap(c => c.notices || [])].slice(0, n || 4);
  const hint = (cls, msg) => editing() ? `<section class="hpt hpl-s hpl-empty ${cls}"><div class="hpl-w"><p class="hpl-hint">${E(msg)}</p></div></section>` : '';
  const IC_ = (k, n, w) => H.icon(k, n, w);
  const btns = (d, s, cls) => { const p1 = linkHref(d.link) || clsHref(s); const p2 = linkHref(d.link2) || askHref(s);
    return `${d.cta && p1 ? `<a class="${cls}-b pri" ${aAttr(p1)}>${E(d.cta)}</a>` : d.cta ? `<span class="${cls}-b pri">${E(d.cta)}</span>` : ''}${d.cta2 && p2 ? `<a class="${cls}-b sec" ${aAttr(p2)}>${E(d.cta2)}</a>` : ''}`; };
  const h1Of = d => String(d.title || (S && S.org && S.org.name) || '').split('\n').map(E).join('<br>');
  const colsOf = d => (d.cols || []).filter(r => r && String(r[0] || '').trim());
  const stepsOf = s => { const x = (s.sections || []).find(y => y.type === 'text' && y.data && y.data.variant === 'steps' && !y.hide); return x ? colsOf(x.data) : []; };
  const secHead = (d, cls, tag) => `<div class="${cls}">${d.eyebrow ? `<p class="${cls}-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<${tag || 'h2'}>${br(d.title)}</${tag || 'h2'}>` : ''}${d.sub ? `<p class="${cls}-sd">${E(d.sub)}</p>` : typeof d.body === 'string' && d.body && d.variant !== 'cta' ? `<p class="${cls}-sd">${E(d.body)}</p>` : ''}</div>`;
  const clsIds = d => d.auto ? pub().map(c => c.id).slice(0, 4) : (d.ids || []);
  const clsList = d => clsIds(d).map(id => ((S && S.classes) || []).find(c => c.id === id)).filter(Boolean);
  const metaOf = c => [perOf(c), lesOf(c) ? `${lesOf(c)}차시` : '', +c.hours ? `${Math.round(+c.hours)}시간` : ''].filter(Boolean);
  const tk = (s, T) => T || (window.HPT && HPT.tokens && HPT.tokens(s)) || { a: s.color || '#4F46E5', on: '#fff', ink: '#111827', mu: '#4B5263', bg: '#fff', alt: '#F5F6FA', at: '#3730A3', as: '#EEF0FF', as2: '#DDE1FF' };
  /* 공통 섹션 껍데기 — 래퍼가 data-hpe를 <section에 붙인다 */
  const SEC = (fam, cls, inner, st) => `<section class="hpt hpl-s hpl-${fam} ${cls}"${st ? ` style="${E(st)}"` : ''}><div class="hpl-w">${inner}</div></section>`;
  H.util = { E, pub, perOf, lesOf, priceOf, metaOf, facts, badges, contact, clsHref, askHref, linkHref, menusOn, mHref, notices, editing };

  /* 공통 CSS(모든 계열): 폭 · 자리 · 안내 */
  const BASE = (fam, T) => `.hpl-${fam} .hpl-w{max-width:1200px;margin:0 auto;padding:0 40px;position:relative;z-index:1}.hpl-${fam}.hpl-s{position:relative}.hpl-${fam} ${H.FIG_CSS.replace(/}(?=.)/g, `}.hpl-${fam} `)}.hpl-${fam} .hpl-hint{border:2px dashed ${al(T.a, .35)};border-radius:12px;padding:20px;text-align:center;color:${T.at};font-weight:650;background:${T.as}}.hpl-${fam}.hpl-empty{padding:28px 0}
.hpl-${fam} .hpl-ic{flex:none}.hpl-${fam} a{color:inherit;text-decoration:none}.hpl-${fam} a:focus-visible{outline:3px solid ${fit(T.a, '#ffffff', 3)};outline-offset:3px}
@media(max-width:640px){.hpl-${fam} .hpl-w{padding:0 20px}}`;

  /* 래퍼(hplay-a HPL.render)는 sec[kind](site, d, th, T, ctx)로 부른다. 이 파일의 섹션 함수는 (d, site, th, T, x)로 쓰고 여기서 맞춘다.
     kind 'stats'(실제 숫자 띠)는 이 파일의 facts로 그리고, 직접 쓴 숫자 칸(d.cols)이 있는 stats는 기본 렌더러에 맡긴다. */
  const regB = (id, def) => { const raw = def.sec || {}; const sec = {};
    Object.keys(raw).forEach(k => { if (k === 'facts') return; sec[k] = function (s, d, th, T, ctx) { return raw[k].call(raw, d || {}, s, th, T, ctx && ctx.x); }; });
    if (raw.facts) sec.stats = function (s, d, th, T) { d = d || {}; if (d.hpt !== 'facts' && (d.cols || []).some(r => r && String(r[0] || '').trim())) return null; return raw.facts.call(raw, d, s, th, T); };
    H.reg(id, Object.assign({}, def, { sec, raw })); };

  /* G1 디자인 토큰(docs/design-tokens.md) 층: 계열 CSS 끝에 덧붙여 테마마다 제목 글꼴 · 크기 · 섹션 여백 · 버튼 · 모서리가 달라지게 한다.
     o = { h(제목 글꼴 쓰기), h1:[선택자, 휴대폰 최소], h2:[선택자], sec:[배수, 더할 px], btn:[선택자](모서리 var(--br)), btnKeep:[선택자](모서리는 계열 고유), card:[선택자], cardS:[선택자](안쪽 칸 --rs) } */
  const TOKL = (fam, o) => { const P = `.hpl-${fam}`; const L = [];
    if (o.h) L.push(`${P} h1,${P} h2,${P} h3{font-family:var(--hd-ff,inherit);letter-spacing:var(--hd-ls,-.03em)}${P} h1,${P} h2{font-weight:var(--hd-fw,800)}`);
    if (o.h1) L.push(`${P} h1{font-size:clamp(${o.h1[1] || 34}px,${o.h1[2] || 4.4}vw,var(--t-h1,60px))}`);
    if (o.h2) L.push(`${o.h2.map(x => `${P} ${x}`).join(',')}{font-size:clamp(26px,3.2vw,var(--t-h2,42px))}`);
    const sec = o.sec || [1, 0]; const v = (k, d) => sec[1] ? `calc(var(${k},${d}px) * ${sec[0]} + ${sec[1]}px)` : sec[0] !== 1 ? `calc(var(${k},${d}px) * ${sec[0]})` : `var(${k},${d}px)`;
    L.push(`${P}.hpl-s:not(.hpl-hero):not(.hpl-empty):not(.hp-facts):not(.hpl-st-end):not(.hpl-co-end),${P}.hp-s:not(.hp-facts):not(.hp-cta){padding-top:${v('--sec', 120)};padding-bottom:${v('--sec', 120)}}`);
    if (o.btn) L.push(`${o.btn.map(x => `${P} ${x}`).join(',')}{min-height:var(--btn-h,52px);padding-left:var(--btn-px,26px);padding-right:var(--btn-px,26px);border-radius:var(--br,12px)}`);
    if (o.btnKeep) L.push(`${o.btnKeep.map(x => `${P} ${x}`).join(',')}{min-height:var(--btn-h,52px);padding-left:var(--btn-px,26px);padding-right:var(--btn-px,26px)}`);
    if (o.card) L.push(`${o.card.map(x => `${P} ${x}`).join(',')}{border-radius:var(--r,16px)}`);
    if (o.cardS) L.push(`${o.cardS.map(x => `${P} ${x}`).join(',')}{border-radius:var(--rs,10px)}`);
    L.push(`${P} a:focus-visible,${P} summary:focus-visible{outline:3px solid var(--ring,currentColor);outline-offset:3px}${P} time,${P} b,${P} .hpl-tn{font-variant-numeric:tabular-nums}`);
    L.push(`@media(max-width:640px){${P}.hpl-s:not(.hpl-hero):not(.hpl-empty):not(.hp-facts):not(.hpl-st-end):not(.hpl-co-end),${P}.hp-s:not(.hp-facts):not(.hp-cta){padding-top:${v('--sec-m', 72)};padding-bottom:${v('--sec-m', 72)}}${o.btn || o.btnKeep ? `${[...(o.btn || []), ...(o.btnKeep || [])].map(x => `${P} ${x}`).join(',')}{min-height:max(48px,var(--btn-h,52px))}` : ''}}`);
    return '\n/* 토큰 층 */\n' + L.join('\n'); };

  /* ═════════ 1. story — 이야기 · 단계형 ═════════
     세로 줄기(왼쪽 선)가 첫 화면부터 끝까지 이어지고, 섹션은 그 줄기 위의 '장'으로 놓인다. 단계는 큰 번호의 세로 타임라인, 특징은 사진과 글이 번갈아 놓인 줄. */
  regB('story', {
    name: '이야기형', by: 'D2', desc: '세로 줄기를 따라 내려가는 단계 · 장 구성, 사진과 글이 번갈아 놓임', fits: ['adult', 'k12', 'lifelong', 'voc', 'corp'],
    slots: ['hero', 'about1', 'about2', 'about3', 'cls-*'], order: ['banner', 'text:stats', 'text:features', 'text:steps', 'classes', 'reviews', 'text:info', 'notices', 'text:cta'],
    css(s, th, T) { T = tk(s, T); const ink = T.ink, a = T.a; const at = fit(a, '#ffffff', 4.6); const paper = mix(a, '#ffffff', .95); const line = al(ink, .14); const mu = fit(T.mu, paper, 4.6);
      return `${BASE('story', T)}
.hpl-story{--sl:56px;font-family:Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic',sans-serif}
.hpl-story.hp-s,.hpl-story.hpl-s{padding:128px 0;background:#fff}.hpl-story.hp-s.hp-alt{background:${paper}}
.hpl-story.hpl-s>.hpl-w,.hpl-story.hp-s>.hp-w{max-width:1200px;padding-left:calc(40px + var(--sl));padding-right:40px}.hpl-story.hpl-s::before,.hpl-story.hp-s::before{content:'';position:absolute;left:calc(50% - min(50%, 600px) + 52px);top:0;bottom:0;width:2px;background:${line};z-index:0}.hpl-story.hpl-hero::before{top:104px;background:linear-gradient(${a},${line} 40%)}
.hpl-story.hp-s>.hp-w::after,.hpl-story .hpl-sh::before{content:'';position:absolute;left:46px;top:6px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px ${a}}
.hpl-story.hp-s.hp-cta>.hp-w::after,.hpl-story.hp-facts>.hp-w::after{display:none}
.hpl-story .hpl-sh{position:static;margin-bottom:40px;max-width:680px}.hpl-story .hpl-sh::before{left:46px;top:8px}.hpl-story .hpl-sh-ey{font-size:12.5px;font-weight:750;text-transform:uppercase;letter-spacing:.14em;color:${at};margin-bottom:12px;letter-spacing:.02em}.hpl-story .hpl-sh h2{font-size:clamp(28px,3.2vw,42px);line-height:1.22;letter-spacing:-.035em;font-weight:800;color:${ink}}.hpl-story .hpl-sh-sd{margin-top:14px;color:${mu};font-size:17px;line-height:1.75}
/* 첫 화면 */
.hpl-story.hpl-hero{padding:96px 0 0;background:linear-gradient(180deg,${paper},#fff 78%);overflow:hidden}
.hpl-st-hg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:end}
.hpl-st-dot{position:absolute;left:41px;top:0;width:24px;height:24px;border-radius:50%;background:${a};box-shadow:0 0 0 6px ${al(a, .16)}}
.hpl-st-ey{font-size:12.5px;font-weight:750;text-transform:uppercase;letter-spacing:.14em;color:${at}}.hpl-story h1{margin:18px 0 0;font-size:clamp(36px,4.3vw,58px);line-height:1.08;letter-spacing:-.045em;font-weight:850;color:${ink}}
.hpl-st-sub{margin-top:24px;font-size:19px;line-height:1.7;color:${mu};max-width:540px}.hpl-st-bt{display:flex;flex-wrap:wrap;gap:12px;margin-top:36px}
.hpl-st-b{display:inline-flex;align-items:center;gap:10px;min-height:54px;padding:0 28px;border-radius:var(--br,12px);font-weight:750;font-size:16px}.hpl-st-b.pri{background:${fit(a, '#ffffff', 4.6, '#000000')};color:#fff}.hpl-st-b.sec{box-shadow:inset 0 0 0 1.5px ${al(ink, .25)};color:${ink}}
.hpl-st-map{margin:56px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));border-top:1px solid ${line}}.hpl-st-map li{padding:18px 16px 28px 0;position:relative}.hpl-st-map li::before{content:'';position:absolute;top:-5px;left:0;width:9px;height:9px;border-radius:50%;background:${a}}
.hpl-st-map b{display:block;font-size:13px;color:${at};font-weight:800;font-variant-numeric:tabular-nums}.hpl-st-map span{display:block;margin-top:6px;font-size:15.5px;font-weight:700;color:${ink};line-height:1.4}
.hpl-st-fig{border-radius:calc(var(--r,16px) + 8px) calc(var(--r,16px) + 8px) 0 0;box-shadow:0 -1px 0 ${line}}
.hpl-st-tag{position:absolute;left:20px;bottom:20px;z-index:2;display:inline-flex;align-items:center;gap:8px;background:#fff;color:${ink};font-size:14px;font-weight:750;padding:10px 14px;border-radius:999px;box-shadow:0 10px 30px -12px ${al(ink, .45)}}.hpl-st-tag .hpl-ic{color:${at}}
/* 단계 */
.hpl-st-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}.hpl-st-steps li{display:grid;grid-template-columns:120px minmax(0,1fr);gap:28px;padding:30px 0;border-top:1px solid ${line};position:relative}.hpl-st-steps li:last-child{border-bottom:1px solid ${line}}
.hpl-st-steps li::before{content:'';position:absolute;left:calc(-1 * var(--sl) + 6px);top:38px;width:14px;height:14px;border-radius:50%;background:${a}}
.hpl-st-no{font-size:64px;line-height:.9;font-weight:300;letter-spacing:-.05em;color:${at};font-variant-numeric:tabular-nums}.hpl-st-steps h3{margin:4px 0 0;font-size:24px;letter-spacing:-.03em;color:${ink}}.hpl-st-steps p{margin:10px 0 0;color:${mu};font-size:16.5px;line-height:1.75;max-width:620px}
/* 특징: 지그재그 */
.hpl-st-zz{display:flex;flex-direction:column;gap:56px}.hpl-st-row{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:64px;align-items:center}.hpl-st-row:nth-child(even){grid-template-columns:minmax(0,5fr) minmax(0,7fr)}.hpl-st-row .hpl-img img{transition:transform .6s}.hpl-st-row:hover .hpl-img img{transform:scale(1.03)}.hpl-st-row:nth-child(even) .hpl-img{order:2}
.hpl-st-row .hpl-img{border-radius:var(--r,16px)}.hpl-st-row h3{margin:0;font-size:clamp(22px,2.4vw,30px);letter-spacing:-.03em;line-height:1.3;color:${ink}}.hpl-st-row p{margin:14px 0 0;color:${mu};font-size:17px;line-height:1.8}.hpl-st-k{display:inline-flex;width:44px;height:44px;border-radius:50%;align-items:center;justify-content:center;background:${T.as};color:${fit(T.at || a, T.as, 4.6)};margin-bottom:16px}
.hpl-st-more{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 40px;margin-top:8px}.hpl-st-more div{padding:18px 0;border-top:1px solid ${line}}.hpl-st-more b{font-size:17px;color:${ink}}.hpl-st-more p{margin:6px 0 0;color:${mu};font-size:15px}
/* 강좌: 장 목록 */
.hpl-st-cl{display:flex;flex-direction:column;border-top:2px solid ${ink}}.hpl-st-c{display:grid;grid-template-columns:132px minmax(0,1fr) auto;gap:28px;align-items:center;padding:22px 0;border-bottom:1px solid ${line};transition:background .15s}.hpl-st-c:hover{background:${paper}}
.hpl-st-c .hpl-img{border-radius:12px}.hpl-st-c h3{margin:0;font-size:21px;letter-spacing:-.025em;color:${ink}}.hpl-st-cm{margin:8px 0 0;display:flex;flex-wrap:wrap;gap:4px 14px;color:${mu};font-size:14.5px}.hpl-st-cp{text-align:right}.hpl-st-cp b{display:block;font-size:20px;color:${ink};letter-spacing:-.02em}.hpl-st-cp span{display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-size:14px;font-weight:750;color:${at}}
/* 숫자 */
.hpl-story.hp-facts{padding:56px 0;background:#fff;border:0}.hpl-st-f{display:flex;flex-wrap:wrap;gap:0;border-left:1px solid ${line}}.hpl-st-f li{flex:1 1 160px;padding:4px 28px 4px 24px;border-right:1px solid ${line};list-style:none}.hpl-st-f b{display:block;font-size:clamp(36px,4vw,54px);font-weight:300;letter-spacing:-.04em;color:${ink};line-height:1}.hpl-st-f b small{font-size:.42em;font-weight:700;margin-left:4px;color:${at}}.hpl-st-f span{display:block;margin-top:10px;color:${mu};font-size:14.5px}
/* 마지막 장(문의) */
.hpl-story.hpl-st-end{padding:96px 0 112px;background:${mix(a, '#0A0F1E', .82)};color:#fff}.hpl-story.hpl-st-end::before{background:${al('#ffffff', .2)};bottom:auto;height:88px}.hpl-st-end .hpl-st-dot{top:76px;background:#fff;box-shadow:0 0 0 6px ${al('#ffffff', .15)}}
.hpl-st-eg{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:56px;align-items:center}.hpl-st-end h2{margin:0;font-size:clamp(30px,3.6vw,48px);line-height:1.18;letter-spacing:-.04em;color:#fff}.hpl-st-end p{margin:16px 0 0;color:${fit('#D7DCE8', mix(a, '#0A0F1E', .82), 4.8, '#ffffff')};font-size:17.5px;line-height:1.75}
.hpl-st-end .hpl-st-b.pri{background:#fff;color:${fit(a, '#ffffff', 4.8)}}.hpl-st-ci{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}.hpl-st-ci li{display:flex;gap:14px;align-items:center;padding:16px 0;border-top:1px solid ${al('#ffffff', .18)}}.hpl-st-ci li:last-child{border-bottom:1px solid ${al('#ffffff', .18)}}.hpl-st-ci small{display:block;font-size:13px;color:${fit('#C9D0DE', mix(a, '#0A0F1E', .82), 4.6, '#ffffff')}}.hpl-st-ci b,.hpl-st-ci a{font-size:17px;font-weight:700;color:#fff}
/* 기본 섹션을 이 계열에 맞추기 */
.hpl-story .hp-sh{margin-bottom:36px}.hpl-story .hp-ey{letter-spacing:.02em;text-transform:none;font-weight:700}.hpl-story .hp-card{box-shadow:none;border:1px solid ${line}}
@media(max-width:900px){.hpl-st-hg{grid-template-columns:1fr;gap:40px}.hpl-st-row{grid-template-columns:1fr;gap:20px}.hpl-st-row:nth-child(even) .hpl-img{order:0}.hpl-st-eg{grid-template-columns:1fr;gap:32px}.hpl-st-map{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.hpl-story{--sl:28px}.hpl-story.hp-s,.hpl-story.hpl-s{padding:72px 0}.hpl-story.hpl-s>.hpl-w,.hpl-story.hp-s>.hp-w{padding-left:calc(20px + var(--sl));padding-right:20px}
.hpl-story.hpl-s::before,.hpl-story.hp-s::before{left:26px}.hpl-story.hpl-hero::before{top:60px}.hpl-story.hpl-st-end::before{height:56px}.hpl-st-end .hpl-st-dot{top:46px}.hpl-story.hp-s>.hp-w::after,.hpl-story .hpl-sh::before{left:20px}.hpl-st-dot{left:15px}.hpl-story.hpl-hero{padding-top:56px}.hpl-story h1{font-size:36px;line-height:1.14}.hpl-st-sub{font-size:16.5px}
.hpl-st-b{flex:1 1 auto;justify-content:center}.hpl-st-map{grid-template-columns:1fr 1fr;margin-top:40px}.hpl-st-steps li{grid-template-columns:1fr;gap:6px;padding:24px 0}.hpl-st-steps li::before{left:calc(-1 * var(--sl) + -1px);top:30px}.hpl-st-no{font-size:44px}.hpl-st-steps h3{font-size:20px}
.hpl-st-c{grid-template-columns:76px minmax(0,1fr);gap:16px}.hpl-st-cp{grid-column:2;text-align:left;display:flex;align-items:center;gap:14px}.hpl-st-cp span{margin:0}.hpl-st-c h3{font-size:17.5px}.hpl-st-more{grid-template-columns:1fr}.hpl-st-f li{flex-basis:45%;padding:10px 14px}.hpl-story.hpl-st-end{padding:64px 0 72px}}${TOKL('story', { h: 1, h1: ['h1', 36, 4.3], h2: ['.hpl-sh h2', '.hpl-st-end h2'], btn: ['.hpl-st-b'], card: ['.hpl-st-row .hpl-img', '.hpl-st-fig'], cardS: ['.hpl-st-c .hpl-img'] })}`; },
    hero(s, d, th, T) { T = tk(s, T); const st = stepsOf(s).slice(0, 4); const C0 = pub(); const chap = st.length >= 2 ? st.map(r => r[0]) : C0.length >= 2 ? C0.slice(0, 4).map(c => c.name) : [];
      const bd = badges()[0];
      const map = chap.length ? `<ol class="hpl-st-map" style="--n:${chap.length}">${chap.map((c, k) => `<li><b>${String(k + 1).padStart(2, '0')}</b><span>${E(c)}</span></li>`).join('')}</ol>` : '';
      return `<section class="hpt hpl-s hpl-story hpl-hero"><div class="hpl-w hpl-st-hg"><i class="hpl-st-dot" aria-hidden="true"></i><div class="hpl-st-t">${d.eyebrow ? `<p class="hpl-st-ey">${E(d.eyebrow)}</p>` : ''}<h1>${h1Of(d)}</h1>${d.sub ? `<p class="hpl-st-sub">${E(d.sub)}</p>` : ''}<div class="hpl-st-bt">${btns(d, s, 'hpl-st')}</div>${map}</div>
        <div style="position:relative">${figB('hero', s, T, { ratio: '1:1', cls: 'hpl-st-fig' })}${bd ? `<span class="hpl-st-tag">${IC_(bd[0], 18, 2)}${E(bd[1])}</span>` : ''}</div></div></section>`; },
    sec: {
      steps(d, s, th, T) { const L = colsOf(d); if (!L.length) return null;
        return SEC('story', 'hpl-st-stp', `${secHead(d, 'hpl-sh')}<ol class="hpl-st-steps">${L.map(([a, b], k) => `<li><span class="hpl-st-no">${String(k + 1).padStart(2, '0')}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></li>`).join('')}</ol>`); },
      features(d, s, th, T) { T = tk(s, T); const L = colsOf(d); if (!L.length) return null; const top = L.slice(0, L.length >= 4 ? 2 : L.length); const rest = L.slice(top.length);
        return SEC('story', 'hpl-st-ft', `${secHead(d, 'hpl-sh')}<div class="hpl-st-zz">${top.map(([a, b], k) => `<div class="hpl-st-row">${figB('about' + (k + 1), s, T, { ratio: '4:3', text: a + ' ' + (b || '') })}<div><span class="hpl-st-k">${IC_(H.iconFor(a + ' ' + b, k), 22)}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></div>`).join('')}</div>${rest.length ? `<div class="hpl-st-more">${rest.map(([a, b]) => `<div><b>${E(a)}</b>${b ? `<p>${E(b)}</p>` : ''}</div>`).join('')}</div>` : ''}`); },
      plain(d, s, th, T) { return colsOf(d).length ? this.features(d, s, th, T) : null; },
      classes(d, s, th, T) { T = tk(s, T); const L = clsList(d); if (!L.length) return hint('hpl-story', `전체 공개한 ${t_('cls')}이 이곳에 표시됩니다.`);
        return SEC('story', 'hpl-st-cls', `${secHead(d, 'hpl-sh')}<div class="hpl-st-cl">${L.map((c, k) => `<a class="hpl-st-c" href="#p-c-${E(c.id)}">${figB('cls-' + c.id, s, T, { ratio: '1:1', text: c.name })}<div><h3>${E(c.name)}</h3><p class="hpl-st-cm">${[KIND(c), ...metaOf(c)].map(m => `<span>${E(m)}</span>`).join('')}</p></div><div class="hpl-st-cp"><b>${E(priceOf(c))}</b><span>자세히 보기 ${IC_('arrow', 16, 2)}</span></div></a>`).join('')}</div>`); },
      facts(d, s) { const F = facts(); if (F.length < 2) return hint('hpl-story', '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        return `<section class="hpt hp-s hpl-s hpl-story hp-facts"><div class="hpl-w"><ul class="hpl-st-f">${F.map(x => `<li><b>${E(x.v)}<small>${E(x.u)}</small></b><span>${E(x.l)}</span></li>`).join('')}</ul></div></section>`; },
      cta(d, s, th, T) { const Cc = contact(); const h = askHref(s); const body = typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : '';
        return `<section class="hpt hpl-s hpl-story hpl-st-end"><div class="hpl-w"><i class="hpl-st-dot" aria-hidden="true"></i><div class="hpl-st-eg"><div>${d.eyebrow ? `<p class="hpl-st-ey" style="color:inherit;opacity:.85">${E(d.eyebrow)}</p>` : ''}<h2>${br(d.title || '')}</h2>${body}${d.cta && h ? `<div class="hpl-st-bt"><a class="hpl-st-b pri" ${aAttr(h)}>${E(d.cta)}</a></div>` : ''}</div>
          ${Cc.length ? `<ul class="hpl-st-ci">${Cc.map(c => `<li>${IC_(c.ic, 22)}<div><small>${E(c.k)}</small>${c.h ? `<a ${aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</div></li>`).join('')}</ul>` : ''}</div></div></section>`; }
    }
  });

  /* ═════════ 2. mosaic — 갤러리 우선 모자이크 ═════════
     첫 화면이 크기가 다른 사진 칸의 격자이고 제목도 그 격자의 한 칸이다. 특징 · 강좌도 그림이 먼저 보이는 칸으로. */
  regB('mosaic', {
    name: '모자이크형', by: 'D2', desc: '크기가 다른 사진 칸을 엮은 갤러리 첫 화면 · 그림이 먼저 보이는 강좌 칸', fits: ['k12', 'adult', 'lifelong', 'voc', 'univ'],
    slots: ['hero', 'gallery1', 'gallery2', 'gallery3', 'gallery4', 'about1', 'about2', 'about3', 'about4', 'about5', 'about6', 'cls-*'], order: ['banner', 'classes', 'text:features', 'text:steps', 'reviews', 'text:stats', 'notices', 'text:cta'],
    css(s, th, T) { T = tk(s, T); const a = T.a, ink = T.ink; const dk = mix(a, '#0A0F1E', .78); const at = fit(a, '#ffffff', 4.6); const mu = fit(T.mu, '#ffffff', 4.6); const tile = mix(a, '#ffffff', .9); const g = 10;
      return `${BASE('mosaic', T)}
.hpl-mosaic.hpl-s,.hpl-mosaic.hp-s{padding:120px 0;background:#fff}.hpl-mosaic.hp-s.hp-alt{background:${mix(a, '#ffffff', .955)}}
.hpl-mosaic .hpl-w{max-width:1320px}.hpl-mosaic .hpl-img{border-radius:calc(var(--r,16px) * .75)}
.hpl-mosaic.hpl-hero{padding:${g * 2}px 0 ${g * 2}px}.hpl-mo-g{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-template-rows:repeat(3,minmax(190px,auto));gap:${g}px}
.hpl-mo-t{grid-column:1/6;grid-row:1/3;background:${dk};color:#fff;border-radius:calc(var(--r,16px) * .75);padding:48px 44px;display:flex;flex-direction:column;justify-content:flex-end;min-height:500px}
.hpl-mo-ey{font-size:12.5px;font-weight:750;text-transform:uppercase;letter-spacing:.14em;color:${fit(mix(a, '#ffffff', .55), dk, 4.8, '#ffffff')};margin:0 0 auto}.hpl-mosaic h1{margin:40px 0 0;font-size:clamp(34px,4vw,58px);line-height:1.1;letter-spacing:-.04em;font-weight:800;color:#fff}.hpl-mo-sub{margin-top:18px;font-size:17px;line-height:1.7;color:${fit('#D8DDEA', dk, 4.8, '#ffffff')}}
.hpl-mo-bt{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}.hpl-mo-b{display:inline-flex;align-items:center;min-height:50px;padding:0 24px;border-radius:var(--br,12px);font-weight:750;font-size:15.5px}.hpl-mo-b.pri{background:#fff;color:${fit(a, '#ffffff', 4.8)}}.hpl-mo-b.sec{box-shadow:inset 0 0 0 1.5px ${al('#ffffff', .45)};color:#fff}
.hpl-mo-a{grid-column:6/13;grid-row:1/3}.hpl-mo-a .hpl-img,.hpl-mo-x .hpl-img{height:100%;aspect-ratio:auto !important}.hpl-mo-x{position:relative;min-height:170px}
.hpl-mo-x1{grid-column:1/4}.hpl-mo-x2{grid-column:4/7}.hpl-mo-x3{grid-column:7/10}.hpl-mo-s{grid-column:10/13;background:${tile};border-radius:calc(var(--r,16px) * .75);padding:24px 26px;display:flex;flex-direction:column;justify-content:space-between;gap:14px;color:${ink}}
.hpl-mo-s ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}.hpl-mo-s li{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px}.hpl-mo-s li .hpl-ic{color:${fit(a, tile, 4.6)}}.hpl-mo-s b{font-size:44px;font-weight:800;letter-spacing:-.04em;line-height:1}.hpl-mo-s small{font-size:14px;color:${fit(T.mu, tile, 4.6)};font-weight:650}
.hpl-mo-x figcaption{left:12px;bottom:12px;background:#fff;color:${ink};font-size:13px;font-weight:750;padding:6px 11px;border-radius:999px}
/* 머리 */
.hpl-mosaic .hpl-sh{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;align-items:end;margin-bottom:40px}.hpl-mosaic .hpl-sh-ey{font-size:12.5px;font-weight:750;text-transform:uppercase;letter-spacing:.14em;grid-column:1;color:${at};margin:0 0 -28px}.hpl-mosaic .hpl-sh h2{grid-column:1;font-size:clamp(28px,3.2vw,44px);line-height:1.18;letter-spacing:-.04em;font-weight:800;color:${ink};margin:0}.hpl-mosaic .hpl-sh-sd{grid-column:2;color:${mu};font-size:16.5px;line-height:1.75;margin:0}
/* 특징 모자이크 */
.hpl-mo-fg{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:${g}px;grid-auto-flow:dense}.hpl-mo-f{grid-column:span 2;background:${tile};border-radius:calc(var(--r,16px) * .75);overflow:hidden;display:flex;flex-direction:column}.hpl-mo-f.w{grid-column:span 4;flex-direction:row}.hpl-mo-f.w .hpl-img{width:55%;flex:none;aspect-ratio:auto !important;min-height:260px;border-radius:0}.hpl-mo-f .hpl-img{border-radius:0}
.hpl-mo-fb{padding:24px 24px 28px;color:${ink}}.hpl-mo-fb h3{margin:0;font-size:20px;letter-spacing:-.025em}.hpl-mo-fb p{margin:8px 0 0;color:${fit(T.mu, tile, 4.6)};font-size:15.5px;line-height:1.7}.hpl-mo-f.w .hpl-mo-fb{display:flex;flex-direction:column;justify-content:flex-end;padding:32px}.hpl-mo-f.w h3{font-size:26px}
/* 강좌: 그림 칸 */
.hpl-mo-cg{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:${g}px}.hpl-mo-c{grid-column:span 4;display:flex;flex-direction:column;border-radius:calc(var(--r,16px) * .75);overflow:hidden;background:${dk};color:#fff}.hpl-mo-cg.n1 .hpl-mo-c{grid-column:span 12;flex-direction:row}.hpl-mo-cg.n2 .hpl-mo-c{grid-column:span 6}.hpl-mo-cg.n4 .hpl-mo-c:nth-child(1),.hpl-mo-cg.n4 .hpl-mo-c:nth-child(4){grid-column:span 7}.hpl-mo-cg.n4 .hpl-mo-c:nth-child(2),.hpl-mo-cg.n4 .hpl-mo-c:nth-child(3){grid-column:span 5}
.hpl-mo-c .hpl-img{border-radius:0}.hpl-mo-cg.n1 .hpl-img{width:58%;aspect-ratio:auto !important;min-height:320px}.hpl-mo-cb{padding:20px 22px 22px;display:flex;flex-direction:column;gap:10px;flex:1}.hpl-mo-cb h3{margin:0;font-size:19px;letter-spacing:-.02em;line-height:1.35;color:#fff}.hpl-mo-cm{display:flex;flex-wrap:wrap;gap:6px}.hpl-mo-cm span{font-size:12.5px;font-weight:700;padding:4px 9px;border-radius:6px;background:${al('#ffffff', .12)};color:${fit('#E3E7F0', mix(dk, '#ffffff', .12), 4.8, '#ffffff')}}
.hpl-mo-cp{margin-top:auto;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid ${al('#ffffff', .16)};color:#fff}.hpl-mo-cp b{font-size:18px;color:#fff}.hpl-mo-cp span{color:#fff;display:inline-flex;gap:6px;align-items:center;font-size:14px;font-weight:750}
/* 단계 칸 */
.hpl-mo-st{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:${g}px;list-style:none;margin:0;padding:0}.hpl-mo-st li{background:${tile};border-radius:calc(var(--r,16px) * .75);padding:28px 24px 30px;color:${ink};display:flex;flex-direction:column;gap:10px;min-height:220px}.hpl-mo-st li:first-child{background:${dk};color:#fff}.hpl-mo-st li:first-child p{color:${fit('#D8DDEA', dk, 4.8, '#ffffff')}}
.hpl-mo-st i{font-style:normal;font-size:46px;font-weight:300;letter-spacing:-.04em;line-height:1;margin-bottom:auto}.hpl-mo-st h3{margin:0;font-size:19px}.hpl-mo-st p{margin:0;color:${fit(T.mu, tile, 4.6)};font-size:15px;line-height:1.65}
/* 기본 섹션 맞추기 */
.hpl-mosaic .hp-card{border-radius:calc(var(--r,16px) * .75);box-shadow:none;border:0;background:${tile}}.hpl-mosaic.hp-alt .hp-card{background:#fff}.hpl-mosaic .hp-ey{text-transform:none;letter-spacing:.02em;font-weight:700}
@media(max-width:1000px){.hpl-mo-g{grid-template-columns:repeat(6,minmax(0,1fr));grid-template-rows:none}.hpl-mo-t{grid-column:1/-1;grid-row:auto;min-height:0}.hpl-mo-a{grid-column:1/-1;grid-row:auto}.hpl-mo-a .hpl-img{aspect-ratio:16/9 !important}.hpl-mo-x1,.hpl-mo-x2,.hpl-mo-x3,.hpl-mo-s{grid-column:span 3}.hpl-mo-x .hpl-img{aspect-ratio:4/3 !important}
.hpl-mo-fg{grid-template-columns:repeat(2,minmax(0,1fr))}.hpl-mo-f,.hpl-mo-f.w{grid-column:span 1;flex-direction:column}.hpl-mo-f.w .hpl-img{width:100%;min-height:0;aspect-ratio:4/3 !important}.hpl-mo-cg .hpl-mo-c,.hpl-mo-cg.n4 .hpl-mo-c:nth-child(n){grid-column:span 6}.hpl-mo-st{grid-template-columns:repeat(2,minmax(0,1fr))}.hpl-mosaic .hpl-sh{grid-template-columns:1fr;gap:12px}.hpl-mosaic .hpl-sh-ey{margin:0}.hpl-mosaic .hpl-sh-sd{grid-column:1}}
@media(max-width:640px){.hpl-mosaic.hpl-s,.hpl-mosaic.hp-s{padding:72px 0}.hpl-mosaic.hpl-hero{padding:12px 0}.hpl-mosaic .hpl-w{padding:0 12px}.hpl-mosaic.hpl-s:not(.hpl-hero) .hpl-w{padding:0 20px}.hpl-mo-g{gap:8px}.hpl-mo-t{padding:32px 24px 28px}.hpl-mosaic h1{font-size:34px;margin-top:28px}.hpl-mo-sub{font-size:16px}.hpl-mo-b{flex:1 1 auto;justify-content:center}
.hpl-mo-x3{display:none}.hpl-mo-s{grid-column:span 3;padding:18px}.hpl-mo-s b{font-size:34px}.hpl-mo-s li{font-size:13.5px}.hpl-mo-fg{grid-template-columns:1fr}.hpl-mo-cg .hpl-mo-c,.hpl-mo-cg.n4 .hpl-mo-c:nth-child(n){grid-column:1/-1}.hpl-mo-cg.n1 .hpl-mo-c{flex-direction:column}.hpl-mo-cg.n1 .hpl-img{width:100%;min-height:0;aspect-ratio:4/3 !important}.hpl-mo-st{grid-template-columns:1fr}.hpl-mo-st li{min-height:0}.hpl-mo-st i{font-size:36px;margin-bottom:6px}}${TOKL('mosaic', { h: 1, h1: ['h1', 34, 4], h2: ['.hpl-sh h2'], btn: ['.hpl-mo-b'], card: ['.hpl-mo-t', '.hpl-mo-s', '.hpl-mo-f', '.hpl-mo-c', '.hpl-mo-st li', '.hpl-mo-a .hpl-img', '.hpl-mo-x .hpl-img'] })}`; },
    hero(s, d, th, T) { T = tk(s, T); const F = facts(); const B = badges(); const C0 = pub();
      const side = F[0] ? `<div class="hpl-mo-s"><small>${E(F[0].l)}</small><b>${E(F[0].v)}<small> ${E(F[0].u)}</small></b>${B.length ? `<ul>${B.slice(0, 2).map(([ic, l]) => `<li>${IC_(ic, 18, 2)}${E(l)}</li>`).join('')}</ul>` : ''}</div>`
        : B.length ? `<div class="hpl-mo-s"><ul>${B.map(([ic, l]) => `<li>${IC_(ic, 18, 2)}${E(l)}</li>`).join('')}</ul></div>` : `<div class="hpl-mo-x hpl-mo-s" style="padding:0;background:none">${figB('gallery4', s, T, { ratio: '4:3' })}</div>`;
      const cap = k => C0[k] ? C0[k].name : '';
      return `<section class="hpt hpl-s hpl-mosaic hpl-hero"><div class="hpl-w"><div class="hpl-mo-g"><div class="hpl-mo-t">${d.eyebrow ? `<p class="hpl-mo-ey">${E(d.eyebrow)}</p>` : ''}<h1>${h1Of(d)}</h1>${d.sub ? `<p class="hpl-mo-sub">${E(d.sub)}</p>` : ''}<div class="hpl-mo-bt">${btns(d, s, 'hpl-mo')}</div></div>
        <div class="hpl-mo-a">${figB('hero', s, T, { ratio: '16:9' })}</div>${[1, 2, 3].map(k => `<div class="hpl-mo-x hpl-mo-x${k}">${figB('gallery' + k, s, T, { ratio: '4:3', text: cap(k - 1), cap: cap(k - 1) ? String(cap(k - 1)).slice(0, 18) : '' })}</div>`).join('')}${side}</div></div></section>`; },
    sec: {
      features(d, s, th, T) { T = tk(s, T); const L = colsOf(d); if (!L.length) return null; const wide = k => L.length >= 3 && (k === 0 || (L.length >= 5 && k === 4));
        return SEC('mosaic', 'hpl-mo-ft', `${secHead(d, 'hpl-sh')}<div class="hpl-mo-fg">${L.map(([a, b], k) => `<article class="hpl-mo-f${wide(k) ? ' w' : ''}">${figB('about' + (k + 1), s, T, { ratio: wide(k) ? '1:1' : '16:9', text: a + ' ' + (b || '') })}<div class="hpl-mo-fb"><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></article>`).join('')}</div>`); },
      plain(d, s, th, T) { return colsOf(d).length ? this.features(d, s, th, T) : null; },
      tiles(d, s, th, T) { return this.features(d, s, th, T); },
      classes(d, s, th, T) { T = tk(s, T); const L = clsList(d); if (!L.length) return hint('hpl-mosaic', `전체 공개한 ${t_('cls')}이 이곳에 표시됩니다.`); const n = Math.min(L.length, 4);
        return SEC('mosaic', 'hpl-mo-cls', `${secHead(d, 'hpl-sh')}<div class="hpl-mo-cg n${n}">${L.map((c, k) => `<a class="hpl-mo-c" href="#p-c-${E(c.id)}">${figB('cls-' + c.id, s, T, { ratio: n === 1 ? '4:3' : '16:9', text: c.name })}<div class="hpl-mo-cb"><h3>${E(c.name)}</h3><p class="hpl-mo-cm">${[KIND(c), ...metaOf(c)].slice(0, 3).map(m => `<span>${E(m)}</span>`).join('')}</p><p class="hpl-mo-cp"><b>${E(priceOf(c))}</b><span>자세히 ${IC_('arrowUR', 16, 2)}</span></p></div></a>`).join('')}</div>`); },
      steps(d, s) { const L = colsOf(d); if (!L.length) return null;
        return SEC('mosaic', 'hpl-mo-stp', `${secHead(d, 'hpl-sh')}<ol class="hpl-mo-st" style="--n:${L.length === 5 ? 5 : Math.min(L.length, 4)}">${L.map(([a, b], k) => `<li><i>${k + 1}</i><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol>`); }
    }
  });

  /* ═════════ 3. sidebar — 왼쪽 고정 메뉴 포털 ═════════
     첫 화면 왼쪽에 기관 이름 · 메뉴 · 연락처 패널, 아래 섹션은 모두 '왼쪽 고정 섹션 이름 열 + 오른쪽 패널'의 같은 세로 기준선을 쓴다.
     (게시된 학습자 홈은 방문자에게 첫 섹션 뒤를 잘라 AI 비서를 끼우므로 페이지 전체를 감싸는 고정 메뉴 대신 섹션마다 같은 격자를 쓴다.) 휴대폰에서는 위쪽 가로 메뉴로 바뀐다. */
  regB('sidebar', {
    name: '사이드 메뉴형', by: 'D2', desc: '왼쪽 메뉴 패널 · 섹션 이름이 고정되는 왼쪽 열, 오른쪽 패널형 내용(학습 포털 · 기관 안내)', fits: ['univ', 'corp', 'public', 'voc', 'adult'],
    slots: ['hero', 'cls-*'], order: ['banner', 'notices', 'classes', 'text:features', 'text:steps', 'text:info', 'text:cta'],
    css(s, th, T) { T = tk(s, T); const a = T.a, ink = T.ink; const side = mix(a, '#0A0F1E', .86); const pane = mix(a, '#F3F5F9', .95); const at = fit(a, pane, 4.6); const mu = fit(T.mu, pane, 4.6); const line = al(ink, .1); const lineS = mix(ink, pane, .88);
      const sm = fit('#B8C0D2', side, 4.8, '#ffffff'); const LC = 240, GP = 48;
      return `${BASE('sidebar', T)}
.hpl-sidebar.hpl-s,.hpl-sidebar.hp-s,.hpl-sidebar.hp-s.hp-alt{padding:112px 0;background:${pane}}.hpl-sidebar .hpl-w{max-width:1240px}
/* 왼쪽 열(섹션 이름 · 고정) + 오른쪽 패널 — 모든 섹션이 같은 세로 기준선을 쓴다 */
.hpl-sidebar.hpl-s:not(.hpl-hero)>.hpl-w,.hpl-sidebar.hp-s:not(.hp-cta):not(.hp-facts)>.hp-w:not(:has(> .hp-split)){display:grid;grid-template-columns:${LC}px minmax(0,1fr);column-gap:${GP}px;align-items:start;background:linear-gradient(${lineS},${lineS}) ${LC + GP / 2 + 40}px 0/1px 100% no-repeat}
.hpl-sidebar.hp-s:not(.hp-cta):not(.hp-facts)>.hp-w:not(:has(> .hp-split)){max-width:1240px;padding:0 40px;background-position:${LC + GP / 2 + 40}px 0}
.hpl-sidebar.hpl-s:not(.hpl-hero)>.hpl-w>*,.hpl-sidebar.hp-s>.hp-w>*{grid-column:2;min-width:0}.hpl-sidebar.hpl-s>.hpl-w>.hpl-sh,.hpl-sidebar.hp-s>.hp-w>.hp-sh{grid-column:1;grid-row:1/span 4;position:sticky;top:24px;margin:0}
.hpl-sidebar.hp-s>.hp-w:has(> .hp-split){display:block;background:none}.hpl-sidebar .hp-split{grid-template-columns:${LC}px minmax(0,1fr);gap:${GP}px;background:linear-gradient(${lineS},${lineS}) ${LC + GP / 2}px 0/1px 100% no-repeat}.hpl-sidebar .hp-split>.hp-sh{position:sticky;top:24px}.hpl-sidebar .hp-shr{display:contents}.hpl-sidebar .hp-shr>.hp-all{grid-column:2;margin:0 0 16px}
.hpl-sidebar .hpl-sh,.hpl-sidebar .hp-sh{border-top:3px solid ${a};padding-top:16px}.hpl-sidebar .hpl-sh-ey,.hpl-sidebar .hp-ey{font-size:12.5px;font-weight:750;text-transform:uppercase;letter-spacing:.14em;margin:0 0 8px;color:${at};text-transform:none;letter-spacing:.02em}.hpl-sidebar .hpl-sh h2,.hpl-sidebar .hp-sh h2{margin:0;font-size:23px;line-height:1.3;letter-spacing:-.03em;font-weight:800;color:${ink}}.hpl-sidebar .hpl-sh-sd,.hpl-sidebar .hp-sd{margin:10px 0 0;color:${mu};font-size:14.5px;line-height:1.7}
.hpl-sd-pn{background:#fff;border-radius:calc(var(--r,16px) * .75);box-shadow:0 0 0 1px ${line};padding:28px 30px}
/* 첫 화면: 왼쪽 메뉴 패널 + 오른쪽 환영 패널 + 바로가기 */
.hpl-sidebar.hpl-hero{padding:32px 0 8px}.hpl-sd-hg{display:grid;grid-template-columns:${LC}px minmax(0,1fr);gap:16px ${GP}px;align-items:stretch}
.hpl-sb{grid-row:1/span 2;background:${side};color:#fff;border-radius:calc(var(--r,16px) * .75);padding:28px 18px;display:flex;flex-direction:column;gap:24px}
.hpl-sb-org{font-size:17px;font-weight:800;letter-spacing:-.02em;line-height:1.35;display:flex;align-items:center;gap:12px;padding:0 6px}.hpl-sb-org i{width:38px;height:38px;border-radius:10px;background:#fff;color:${fit(a, '#ffffff', 4.6)};display:grid;place-items:center;font-style:normal;font-weight:850;flex:none}
.hpl-sb-nav{display:flex;flex-direction:column;gap:2px}.hpl-sb-nav p{font-size:12.5px;font-weight:700;color:${sm};margin:0 0 6px 12px}.hpl-sb-nav a{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;font-weight:650;font-size:15px;color:#fff}.hpl-sb-nav a:hover{background:${al('#ffffff', .08)}}.hpl-sb-nav a .hpl-ic{color:${sm}}.hpl-sb-nav a.on{background:${al('#ffffff', .12)}}.hpl-sb-nav a.on .hpl-ic{color:#fff}
.hpl-sb-ct{margin-top:auto;border-top:1px solid ${al('#ffffff', .14)};padding:18px 6px 0;display:flex;flex-direction:column;gap:12px;font-size:14px}.hpl-sb-ct small{display:block;color:${sm};font-size:12.5px}.hpl-sb-ct b,.hpl-sb-ct a{font-weight:700;color:#fff;word-break:break-all}
.hpl-sd-main{background:#fff;border-radius:calc(var(--r,16px) * .75);box-shadow:0 0 0 1px ${line};overflow:hidden;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}.hpl-sd-t{padding:48px 44px;display:flex;flex-direction:column;justify-content:center}
.hpl-sd-ey{font-size:12.5px;font-weight:750;text-transform:uppercase;letter-spacing:.14em;color:${at};margin:0}.hpl-sidebar h1{margin:14px 0 0;font-size:clamp(30px,3.2vw,44px);line-height:1.18;letter-spacing:-.04em;font-weight:850;color:${ink}}.hpl-sd-sub{margin-top:16px;color:${fit(T.mu, '#ffffff', 4.6)};font-size:16.5px;line-height:1.75}
.hpl-sd-bt{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}.hpl-sd-b{display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:var(--br,10px);font-weight:750;font-size:15px}.hpl-sd-b.pri{background:${fit(a, '#ffffff', 4.6, '#000000')};color:#fff}.hpl-sd-b.sec{box-shadow:inset 0 0 0 1.5px ${al(ink, .2)};color:${ink}}
.hpl-sd-main .hpl-img{height:100%;aspect-ratio:auto !important;min-height:460px}
.hpl-sd-q{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:12px;margin:0;padding:0;list-style:none}.hpl-sd-q a{display:flex;align-items:center;gap:12px;padding:18px 20px;background:#fff;border-radius:calc(var(--r,16px) * .75);box-shadow:0 0 0 1px ${line};font-weight:750;color:${ink};font-size:15.5px}.hpl-sd-q a .hpl-ic{color:${at}}.hpl-sd-q a span{flex:1}.hpl-sd-q a:hover{box-shadow:0 0 0 2px ${a}}
/* 강좌 목록 */
.hpl-sd-cl{display:flex;flex-direction:column;background:#fff;border-radius:calc(var(--r,16px) * .75);box-shadow:0 0 0 1px ${line};overflow:hidden}.hpl-sd-c{display:grid;grid-template-columns:84px minmax(0,1fr) auto;gap:20px;align-items:center;padding:16px 20px;border-top:1px solid ${line}}.hpl-sd-c:first-child{border-top:0}.hpl-sd-c:hover{background:${pane}}.hpl-sd-c .hpl-img{border-radius:10px}.hpl-sd-c h3{margin:0;font-size:17px;letter-spacing:-.02em;color:${ink};line-height:1.35}.hpl-sd-c p{margin:5px 0 0;font-size:13.5px;color:${fit(T.mu, '#ffffff', 4.6)}}.hpl-sd-c b{font-size:16px;color:${ink};white-space:nowrap}.hpl-sd-c b small{display:block;font-size:13px;color:${at};font-weight:750;margin-top:4px;text-align:right}
/* 특징: 두 칸 목록 */
.hpl-sd-fl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px}.hpl-sd-f{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;padding:18px 0;border-top:1px solid ${line}}.hpl-sd-f:nth-child(-n+2){border-top:0;padding-top:0}.hpl-sd-f>span{width:44px;height:44px;border-radius:10px;background:${T.as};color:${fit(a, T.as, 4.6)};display:grid;place-items:center}.hpl-sd-f h3{margin:0;font-size:16.5px;color:${ink}}.hpl-sd-f p{margin:4px 0 0;color:${fit(T.mu, '#ffffff', 4.6)};font-size:14.5px;line-height:1.65}
/* 공지 */
.hpl-sd-nl{list-style:none;margin:0;padding:0}.hpl-sd-nl li{display:flex;gap:14px;align-items:center;padding:14px 0;border-top:1px solid ${line};font-size:15.5px}.hpl-sd-nl li:first-child{border-top:0;padding-top:0}.hpl-sd-nl b{flex:1;min-width:0;font-weight:650;color:${ink};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hpl-sd-nl time{color:${fit(T.mu, '#ffffff', 4.6)};font-size:13.5px;font-variant-numeric:tabular-nums}.hpl-sd-nl i{font-style:normal;font-size:12px;font-weight:800;color:${fit(a, T.as, 4.6)};background:${T.as};padding:3px 9px;border-radius:6px}
.hpl-sd-more{display:inline-flex;gap:6px;align-items:center;margin-top:16px;font-weight:750;color:${at};font-size:14.5px}
/* 단계: 가로 진행 */
.hpl-sd-st{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));counter-reset:s}.hpl-sd-st li{position:relative;padding:0 16px 0 0}.hpl-sd-st li::before{counter-increment:s;content:counter(s);display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:${fit(a, '#ffffff', 4.6, '#000000')};color:#fff;font-weight:800;font-size:14px;position:relative;z-index:1}.hpl-sd-st li::after{content:'';position:absolute;left:34px;right:0;top:16px;height:2px;background:${al(a, .25)}}.hpl-sd-st li:last-child::after{display:none}.hpl-sd-st h3{margin:14px 0 0;font-size:16.5px;color:${ink}}.hpl-sd-st p{margin:6px 0 0;color:${fit(T.mu, '#ffffff', 4.6)};font-size:14.5px;line-height:1.6}
.hpl-sidebar .hp-card{box-shadow:0 0 0 1px ${line};border:0;background:#fff}.hpl-sidebar .hp-ctab{border-radius:calc(var(--r,16px) * .75)}.hpl-sidebar.hp-cta>.hp-w,.hpl-sidebar.hp-facts>.hp-w{max-width:1240px;padding:0 40px}.hpl-sidebar.hp-facts>.hp-w>ul{background:#fff;border-radius:calc(var(--r,16px) * .75);box-shadow:0 0 0 1px ${line};padding:24px 8px}.hpl-sidebar.hp-facts{border:0}
@media(max-width:1100px){.hpl-sd-main{grid-template-columns:1fr}.hpl-sd-main .hpl-img{min-height:0;aspect-ratio:16/9 !important}.hpl-sd-q{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.hpl-sd-hg{grid-template-columns:minmax(0,1fr)}.hpl-sb{min-width:0}.hpl-sb{grid-row:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:12px;padding:14px}.hpl-sb-nav{flex-direction:row;overflow-x:auto;gap:6px;width:100%;scrollbar-width:none}.hpl-sb-nav p,.hpl-sb-ct{display:none}.hpl-sb-nav a{white-space:nowrap;padding:8px 12px;font-size:14px;background:${al('#ffffff', .07)}}.hpl-sb-org{font-size:16px}.hpl-sb-org i{width:32px;height:32px}
.hpl-sidebar.hpl-s:not(.hpl-hero)>.hpl-w,.hpl-sidebar.hp-s>.hp-w,.hpl-sidebar.hp-s:not(.hp-cta):not(.hp-facts)>.hp-w:not(:has(> .hp-split)),.hpl-sidebar .hp-split{display:block;background:none}.hpl-sidebar .hpl-sh,.hpl-sidebar .hp-sh{position:static;margin-bottom:22px}.hpl-sidebar .hp-split>.hp-sh{margin-bottom:18px}}
@media(max-width:640px){.hpl-sidebar.hpl-s,.hpl-sidebar.hp-s,.hpl-sidebar.hp-s.hp-alt{padding:64px 0}.hpl-sidebar.hpl-hero{padding:12px 0 4px}.hpl-sidebar .hpl-w,.hpl-sidebar.hp-s>.hp-w,.hpl-sidebar.hp-s:not(.hp-cta):not(.hp-facts)>.hp-w:not(:has(> .hp-split)),.hpl-sidebar.hp-cta>.hp-w,.hpl-sidebar.hp-facts>.hp-w{padding:0 12px}.hpl-sidebar .hpl-sh,.hpl-sidebar .hp-sh{padding:14px 8px 0}.hpl-sd-pn{padding:20px 18px}.hpl-sd-t{padding:28px 20px}.hpl-sidebar h1{font-size:30px}.hpl-sd-b{flex:1 1 auto;justify-content:center}
.hpl-sd-q{gap:8px}.hpl-sd-q a{padding:14px;font-size:14.5px;gap:10px}.hpl-sd-fl{grid-template-columns:1fr}.hpl-sd-f:nth-child(2){border-top:1px solid ${line};padding-top:18px}.hpl-sd-st{grid-template-columns:1fr;gap:18px}.hpl-sd-st li::after{display:none}.hpl-sd-c{grid-template-columns:64px minmax(0,1fr);gap:14px;padding:14px}.hpl-sd-c>b{grid-column:2}.hpl-sd-c b small{text-align:left;display:inline;margin-left:10px}.hpl-sd-nl li{flex-wrap:wrap;gap:6px 10px}.hpl-sd-nl b{flex-basis:100%;order:2;white-space:normal}}${TOKL('sidebar', { h: 1, h1: ['h1', 30, 3.2], sec: [.85, 0], btn: ['.hpl-sd-b'], card: ['.hpl-sb', '.hpl-sd-main', '.hpl-sd-pn', '.hpl-sd-cl', '.hpl-sd-q a'], cardS: ['.hpl-sd-c .hpl-img', '.hpl-sd-f>span'] })}`; },
    hero(s, d, th, T) { T = tk(s, T); const M = menusOn(s).slice(0, 7); const Cc = contact(); const org = (S && S.org && S.org.name) || '';
      const nav = `<nav class="hpl-sb" aria-label="사이트 메뉴"><a class="hpl-sb-org" href="#p-home"><i aria-hidden="true">${E(String(org).trim().slice(0, 1))}</i><span>${E(org)}</span></a><div class="hpl-sb-nav"><p>메뉴</p><a class="on" href="#p-home">${IC_('home', 20)}<span>홈</span></a>${M.map((m, k) => `<a ${aAttr(mHref(m))}>${IC_(H.iconFor(m.l, k + 1), 20)}<span>${E(m.l)}</span></a>`).join('')}</div>
        ${Cc.length ? `<div class="hpl-sb-ct">${Cc.slice(0, 2).map(c => `<div><small>${E(c.k)}</small>${c.h ? `<a ${aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</div>`).join('')}</div>` : ''}</nav>`;
      const Q = M.slice(0, 4); const quick = Q.length >= 2 ? `<ul class="hpl-sd-q" style="--n:${Q.length}">${Q.map((m, k) => `<li><a ${aAttr(mHref(m))}>${IC_(H.iconFor(m.l, k + 2), 24)}<span>${E(m.l)}</span>${IC_('arrow', 16, 2)}</a></li>`).join('')}</ul>` : '';
      return `<section class="hpt hpl-s hpl-sidebar hpl-hero"><div class="hpl-w hpl-sd-hg">${nav}<div class="hpl-sd-main"><div class="hpl-sd-t">${d.eyebrow ? `<p class="hpl-sd-ey">${E(d.eyebrow)}</p>` : ''}<h1>${h1Of(d)}</h1>${d.sub ? `<p class="hpl-sd-sub">${E(d.sub)}</p>` : ''}<div class="hpl-sd-bt">${btns(d, s, 'hpl-sd')}</div></div>${figB('hero', s, T, { ratio: '4:3' })}</div>${quick}</div></section>`; },
    sec: {
      classes(d, s, th, T) { T = tk(s, T); const L = clsList(d); if (!L.length) return hint('hpl-sidebar', `전체 공개한 ${t_('cls')}이 이곳에 표시됩니다.`); const all = clsHref(s);
        return SEC('sidebar', 'hpl-sd-cls', `${secHead(d, 'hpl-sh')}<div class="hpl-sd-cl">${L.map((c, k) => `<a class="hpl-sd-c" href="#p-c-${E(c.id)}">${figB('cls-' + c.id, s, T, { ratio: '1:1', text: c.name })}<div><h3>${E(c.name)}</h3><p>${E([KIND(c), ...metaOf(c)].slice(0, 3).join(' · '))}</p></div><b>${E(priceOf(c))}<small>자세히</small></b></a>`).join('')}</div>${all && L.length >= 2 ? `<a class="hpl-sd-more" ${aAttr(all)}>전체 ${E(t_('cls'))} 보기 ${IC_('arrow', 16, 2)}</a>` : ''}`); },
      features(d, s, th, T) { const L = colsOf(d); if (!L.length) return null;
        return SEC('sidebar', 'hpl-sd-ft', `${secHead(d, 'hpl-sh')}<div class="hpl-sd-pn"><div class="hpl-sd-fl">${L.map(([a, b], k) => `<div class="hpl-sd-f"><span>${IC_(H.iconFor(a + ' ' + b, k), 22)}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></div>`).join('')}</div></div>`); },
      plain(d, s, th, T) { return colsOf(d).length ? this.features(d, s, th, T) : null; },
      tiles(d, s, th, T) { return this.features(d, s, th, T); },
      notices(d, s) { const L = notices(+d.n || 5); if (!L.length) return hint('hpl-sidebar', '공지사항을 올리면 이곳에 최신 글이 표시됩니다.'); const m = menuOf(s, 'notice');
        return SEC('sidebar', 'hpl-sd-nt', `${secHead(d, 'hpl-sh')}<div class="hpl-sd-pn"><ul class="hpl-sd-nl">${L.map(n => `<li><i>공지</i><b>${E(n.title)}</b><time>${E(dot(n.at || ''))}</time></li>`).join('')}</ul>${m ? `<a class="hpl-sd-more" href="#p-m-${E(m.id)}">공지 전체 보기 ${IC_('arrow', 16, 2)}</a>` : ''}</div>`); },
      steps(d, s) { const L = colsOf(d); if (!L.length) return null;
        return SEC('sidebar', 'hpl-sd-stp', `${secHead(d, 'hpl-sh')}<div class="hpl-sd-pn"><ol class="hpl-sd-st" style="--n:${Math.min(L.length, 5)}">${L.map(([a, b]) => `<li><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol></div>`); }
    }
  });

  /* ═════════ 4. bulletin — 공공 알림판(KRDS 분위기) ═════════
     또렷한 위계 · 각진 칸 · 표 형식. 첫 화면은 '찾기 칸 + 바로가기 아이콘 줄 + 알림판(공지 · 모집 일정)'. */
  regB('bulletin', {
    name: '알림판형', by: 'D2', desc: '공지 · 일정 · 바로가기 중심의 공공 누리집 배치, 표로 정리한 과정 목록', fits: ['public', 'univ', 'lifelong', 'voc', 'corp'],
    slots: ['hero'], order: ['banner', 'notices', 'classes', 'text:steps', 'text:features', 'text:info', 'map', 'text:cta'],
    css(s, th, T) { T = tk(s, T); const a = fit(T.a, '#ffffff', 4.6, '#000000'); const ink = '#1B1D22'; const mu = '#4A505C'; const gray = '#F4F5F7'; const line = '#D8DCE3'; const at = fit(a, gray, 4.6); const pale = mix(a, '#ffffff', .93);
      return `${BASE('bulletin', T)}
.hpl-bulletin{font-family:Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:${ink}}
.hpl-bulletin.hpl-s,.hpl-bulletin.hp-s{padding:112px 0;background:#fff}.hpl-bulletin.hp-s.hp-alt{background:${gray}}.hpl-bulletin .hpl-w{max-width:1200px}
.hpl-bulletin.hpl-hero{padding:0;background:#fff;border-top:4px solid ${a}}
.hpl-bu-top{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:28px;padding:32px 0 40px}.hpl-bu-top.solo{grid-template-columns:1fr}
.hpl-bu-vis+.hpl-bu-find{max-width:none}.hpl-bu-vis{position:relative;border-radius:8px;overflow:hidden;min-height:440px;display:flex;align-items:flex-end}.hpl-bu-vis>.hpl-img{position:absolute !important;inset:0;aspect-ratio:auto !important;height:100%}
.hpl-bu-vis::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,rgba(9,13,22,.9) 0%,rgba(9,13,22,.74) 42%,rgba(9,13,22,.12) 78%,rgba(9,13,22,0) 100%);pointer-events:none}
.hpl-bu-ov{position:relative;z-index:1;padding:36px 36px 32px;color:#fff;max-width:720px}.hpl-bu-ov .hpl-bu-ey{color:#fff}.hpl-bu-ov .hpl-bu-ey::before{background:#fff}.hpl-bu-ov h1{color:#fff !important;text-shadow:0 1px 18px rgba(0,0,0,.35)}.hpl-bu-ov .hpl-bu-sub{color:#E9ECF2 !important}
.hpl-bu-ey{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:${at};margin:0}.hpl-bu-ey::before{content:'';width:4px;height:16px;background:${a}}
.hpl-bulletin h1{margin:14px 0 0;font-size:clamp(28px,3.2vw,40px);line-height:1.3;letter-spacing:-.03em;font-weight:800;color:${ink}}.hpl-bu-sub{margin-top:12px;color:${mu};font-size:16.5px;line-height:1.75;max-width:640px}
.hpl-bu-find{display:flex;align-items:center;gap:12px;margin-top:28px;min-height:60px;padding:0 10px 0 22px;border:2px solid ${a};border-radius:${Math.min(8, 999)}px;background:#fff;font-size:16.5px;color:${mu};max-width:640px}.hpl-bu-find .hpl-ic{color:${a}}.hpl-bu-find span{flex:1;min-width:0}.hpl-bu-find b{display:inline-flex;align-items:center;min-height:44px;padding:0 20px;background:${a};color:#fff;border-radius:6px;font-size:15px}
.hpl-bu-bt{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.hpl-bu-b{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:6px;font-weight:700;font-size:15px}.hpl-bu-b.pri{background:${pale};color:${fit(a, pale, 4.6)}}.hpl-bu-b.sec{box-shadow:inset 0 0 0 1px ${line};color:${ink}}
.hpl-bu-board{border:1px solid ${line};border-top:2px solid ${ink};background:#fff;display:flex;flex-direction:column}.hpl-bu-tabs{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${line};padding-right:18px}.hpl-bu-bl+.hpl-bu-tabs{border-top:1px solid ${line}}.hpl-bu-tabs b{padding:14px 18px;font-size:16px;font-weight:800;color:${ink};box-shadow:inset 0 -3px 0 ${a}}.hpl-bu-tm{font-size:13.5px;font-weight:700;color:${at}}
.hpl-bu-bl{list-style:none;margin:0;padding:6px 18px 10px}.hpl-bu-bl li{display:flex;gap:12px;align-items:baseline;padding:12px 0;border-bottom:1px dashed ${line};font-size:15px}.hpl-bu-bl li:last-child{border-bottom:0}.hpl-bu-bl b{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hpl-bu-bl time{flex:none;color:${mu};font-size:13.5px;font-variant-numeric:tabular-nums}
.hpl-bu-board .hpl-img{flex:1;min-height:220px;aspect-ratio:auto !important}.hpl-bu-board .hpl-img.hpl-bu-ph{flex:none;min-height:0;aspect-ratio:16/9 !important}.hpl-bu-bm{margin-top:auto;display:flex;justify-content:flex-end;padding:10px 18px;border-top:1px solid ${line};font-size:14px;font-weight:700;color:${at};background:${gray}}
.hpl-bu-q{background:${gray};border-top:1px solid ${line};border-bottom:1px solid ${line}}.hpl-bu-ql{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,6),minmax(0,1fr))}.hpl-bu-ql li+li{border-left:1px solid ${line}}.hpl-bu-ql a{display:flex;flex-direction:column;align-items:center;gap:12px;padding:26px 8px;font-size:15.5px;font-weight:700;color:${ink};text-align:center}.hpl-bu-ql a:hover{background:#fff}.hpl-bu-ql i{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:#fff;color:${a};box-shadow:0 0 0 1px ${line}}
/* 섹션 머리 */
.hpl-bulletin .hpl-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 24px;flex-wrap:wrap;padding-bottom:16px;border-bottom:2px solid ${ink};margin-bottom:0}.hpl-bulletin .hpl-sh h2{margin:0;font-size:26px;letter-spacing:-.03em;font-weight:800}.hpl-bulletin .hpl-sh-ey{width:100%;margin:0;font-size:14px;font-weight:700;color:${at}}.hpl-bulletin .hpl-sh-sd{margin:0;color:${mu};font-size:15px}
/* 과정 표 */
.hpl-bu-tb{width:100%;border-collapse:collapse;font-size:15.5px}.hpl-bu-tb th{text-align:left;font-size:14px;font-weight:700;color:${mu};background:${gray};padding:12px 14px;border-bottom:1px solid ${line}}.hpl-bu-tb td{padding:18px 14px;border-bottom:1px solid ${line};vertical-align:middle}.hpl-bu-tb td.n a{font-weight:700;color:${ink};font-size:16.5px}.hpl-bu-tb td.n small{display:block;margin-top:4px;color:${mu};font-size:13.5px}
.hpl-bu-tb .tg{display:inline-block;font-size:12.5px;font-weight:700;padding:3px 8px;border:1px solid ${al(a, .45)};color:${fit(a, gray, 4.8)};border-radius:4px}.hpl-bu-tb td.p{font-weight:700;white-space:nowrap}.hpl-bu-tb .go{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border-radius:6px;background:${a};color:#fff;font-weight:700;font-size:14px;white-space:nowrap}
/* 안내 칸 */
.hpl-bu-fg{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));border-left:1px solid ${line};border-top:0}.hpl-bu-f{display:flex;gap:16px;padding:26px 24px;border-right:1px solid ${line};border-bottom:1px solid ${line}}.hpl-bu-f>span{width:48px;height:48px;flex:none;display:grid;place-items:center;border:1px solid ${line};border-radius:8px;color:${a};background:#fff}.hpl-bu-f h3{margin:0;font-size:17px}.hpl-bu-f p{margin:6px 0 0;color:${mu};font-size:14.5px;line-height:1.7}
/* 절차 */
.hpl-bu-st{list-style:none;margin:28px 0 0;padding:0;display:flex;gap:0}.hpl-bu-st li{flex:1 1 0;min-width:0;position:relative;padding:22px 20px 22px 34px;background:${pale};clip-path:polygon(0 0,calc(100% - 18px) 0,100% 50%,calc(100% - 18px) 100%,0 100%,18px 50%)}.hpl-bu-st li:first-child{padding-left:22px;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 50%,calc(100% - 18px) 100%,0 100%)}.hpl-bu-st li+li{margin-left:-8px}.hpl-bu-st li:nth-child(even){background:${mix(a, '#ffffff', .86)}}
.hpl-bu-st small{display:block;font-size:13px;font-weight:800;color:${fit(a, mix(a, '#ffffff', .86), 4.6)}}.hpl-bu-st h3{margin:4px 0 0;font-size:16.5px}.hpl-bu-st p{margin:4px 0 0;font-size:14px;color:${fit(mu, mix(a, '#ffffff', .86), 4.6)};line-height:1.55}
/* 공지 표 */
.hpl-bu-nl{list-style:none;margin:0;padding:0}.hpl-bu-nl li{display:grid;grid-template-columns:72px minmax(0,1fr) 110px;gap:14px;align-items:center;padding:16px 8px;border-bottom:1px solid ${line};font-size:15.5px}.hpl-bu-nl em{font-style:normal;font-size:13px;font-weight:700;color:${fit(a, '#ffffff', 4.6)};text-align:center;border:1px solid ${al(a, .4)};border-radius:4px;padding:2px 0}.hpl-bu-nl b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hpl-bu-nl time{color:${mu};font-size:14px;text-align:right;font-variant-numeric:tabular-nums}
.hpl-bu-more{display:inline-flex;gap:6px;align-items:center;font-size:14.5px;font-weight:700;color:${at}}
/* 문의 */
.hpl-bu-cta{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);border:1px solid ${line};border-top:2px solid ${ink};background:#fff}.hpl-bu-cta>div:first-child{padding:32px;background:${gray}}.hpl-bu-cta h2{margin:0;font-size:24px;letter-spacing:-.03em}.hpl-bu-cta p{margin:10px 0 0;color:${mu};font-size:15.5px;line-height:1.7}
.hpl-bu-dl{margin:0;padding:12px 32px}.hpl-bu-dl div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;padding:14px 0;border-bottom:1px solid ${line}}.hpl-bu-dl div:last-child{border-bottom:0}.hpl-bu-dl dt{font-weight:700;color:${mu};font-size:14.5px;display:flex;gap:8px;align-items:center}.hpl-bu-dl dd{margin:0;font-weight:700;font-size:16px;word-break:break-all}
/* 기본 섹션 맞추기 */
.hpl-bulletin .hp-card{border-radius:6px;box-shadow:none;border:1px solid ${line}}.hpl-bulletin .hp-ey{text-transform:none;letter-spacing:0;font-weight:700;color:${at}}.hpl-bulletin .hp-sh h2{font-size:26px}.hpl-bulletin .hp-qa details{border-radius:0;border:0;border-bottom:1px solid ${line};box-shadow:none}.hpl-bulletin .hp-ctab{border-radius:0}
@media(max-width:900px){.hpl-bu-top{grid-template-columns:1fr;padding:32px 0}.hpl-bu-ql{grid-template-columns:repeat(3,minmax(0,1fr))}.hpl-bu-ql li:nth-child(3n+1){border-left:0}.hpl-bu-ql li:nth-child(n+4){border-top:1px solid ${line}}.hpl-bu-fg{grid-template-columns:1fr 1fr}.hpl-bu-cta{grid-template-columns:1fr}.hpl-bu-st{flex-direction:column;gap:6px}.hpl-bu-st li,.hpl-bu-st li:first-child{clip-path:none;padding:16px 18px;margin:0;border-left:4px solid ${a}}}
@media(max-width:640px){.hpl-bulletin.hpl-s,.hpl-bulletin.hp-s{padding:64px 0}.hpl-bulletin.hpl-hero{padding:0}.hpl-bu-top{padding:16px 0 28px}.hpl-bu-vis{min-height:440px;margin:0 -8px}.hpl-bu-ov{padding:24px 20px}.hpl-bulletin h1{font-size:26px}.hpl-bu-find{font-size:15px;padding-left:14px;min-height:54px}.hpl-bu-find b{padding:0 14px}.hpl-bu-ql{grid-template-columns:repeat(2,minmax(0,1fr))}.hpl-bu-ql li:nth-child(n){border-left:0;border-top:1px solid ${line}}.hpl-bu-ql li:nth-child(even){border-left:1px solid ${line}}.hpl-bu-ql li:nth-child(-n+2){border-top:0}.hpl-bu-ql a{padding:18px 6px;font-size:14.5px}.hpl-bu-ql i{width:46px;height:46px}
.hpl-bu-fg{grid-template-columns:1fr}.hpl-bu-f{padding:20px 16px}.hpl-bu-tb thead{display:none}.hpl-bu-tb,.hpl-bu-tb tbody,.hpl-bu-tb tr,.hpl-bu-tb td{display:block;width:100%}.hpl-bu-tb tr{padding:14px 0;border-bottom:1px solid ${line}}.hpl-bu-tb td{border:0;padding:3px 0}.hpl-bu-tb td.k{display:none}.hpl-bu-tb td.x{padding-top:10px}.hpl-bu-tb .go{width:100%;justify-content:center}
.hpl-bu-nl li{grid-template-columns:60px minmax(0,1fr);row-gap:4px}.hpl-bu-nl time{grid-column:2;text-align:left}.hpl-bu-nl b{white-space:normal}.hpl-bu-cta>div:first-child{padding:24px 20px}.hpl-bu-dl{padding:8px 20px}.hpl-bu-dl div{grid-template-columns:1fr;gap:2px}}${TOKL('bulletin', { h: 1, h1: ['h1', 26, 3], sec: [.85, 0], btn: ['.hpl-bu-b'], cardS: ['.hpl-bu-vis', '.hpl-bu-find', '.hpl-bu-tb .go'] })}`; },
    hero(s, d, th, T) { T = tk(s, T); const N = notices(4); const C0 = pub(); const M = menusOn(s).slice(0, 6); const p1 = linkHref(d.link) || clsHref(s);
      const sched = C0.filter(c => perOf(c)).slice(0, 4);
      let board;
      const sch = (L, n) => `<div class="hpl-bu-tabs"><b>모집 중인 ${E(t_('cls'))}</b></div><ul class="hpl-bu-bl">${L.slice(0, n).map(c => `<li><b>${E(c.name)}</b><time>${E(perOf(c))}</time></li>`).join('')}</ul>`;
      if (N.length) board = `<div class="hpl-bu-tabs"><b>공지사항</b>${menuOf(s, 'notice') ? `<a class="hpl-bu-tm" href="#p-m-${E(menuOf(s, 'notice').id)}">더보기 +</a>` : ''}</div><ul class="hpl-bu-bl">${N.slice(0, sched.length ? 3 : 4).map(n => `<li><b>${E(n.title)}</b><time>${E(dot(n.at || ''))}</time></li>`).join('')}</ul>${sched.length ? sch(sched, 2) : ''}`;
      else if (sched.length) board = `${sch(sched, 4)}${clsHref(s) ? `<a class="hpl-bu-bm" ${aAttr(clsHref(s))}>전체 보기 +</a>` : ''}`;
      else board = '';
      const quick = M.length >= 3 ? `<div class="hpl-bu-q"><div class="hpl-w"><ul class="hpl-bu-ql" style="--n:${M.length}">${M.map((m, k) => `<li><a ${aAttr(mHref(m))}><i>${IC_(H.iconFor(m.l, k + 1), 26)}</i><span>${E(m.l)}</span></a></li>`).join('')}</ul></div></div>` : '';
      return `<section class="hpt hpl-s hpl-bulletin hpl-hero"><div class="hpl-w"><div class="hpl-bu-top${board ? '' : ' solo'}"><div><div class="hpl-bu-vis">${figB('hero', s, T, { ratio: '16:9' })}<div class="hpl-bu-ov">${d.eyebrow ? `<p class="hpl-bu-ey">${E(d.eyebrow)}</p>` : ''}<h1>${h1Of(d)}</h1>${d.sub ? `<p class="hpl-bu-sub">${E(d.sub)}</p>` : ''}</div></div>
        ${p1 ? `<a class="hpl-bu-find" ${aAttr(p1)}>${IC_('search', 22, 2)}<span>신청할 수 있는 ${E(t_('cls'))}을 확인하세요</span><b>${E(d.cta || '과정 보기')}</b></a>` : ''}${d.cta2 && (linkHref(d.link2) || askHref(s)) ? `<div class="hpl-bu-bt"><a class="hpl-bu-b sec" ${aAttr(linkHref(d.link2) || askHref(s))}>${E(d.cta2)}</a></div>` : ''}</div>
        ${board ? `<div class="hpl-bu-board">${board}</div>` : ''}</div></div>${quick}</section>`; },
    sec: {
      classes(d, s) { const L = clsList(d); if (!L.length) return hint('hpl-bulletin', `전체 공개한 ${t_('cls')}이 이곳에 표로 표시됩니다.`); const all = clsHref(s);
        return SEC('bulletin', 'hpl-bu-cls', `<div class="hpl-sh">${d.eyebrow ? `<p class="hpl-sh-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${all ? `<a class="hpl-bu-more" ${aAttr(all)}>전체 보기 ${IC_('plus', 16, 2)}</a>` : ''}</div>${d.sub ? `<p style="margin:14px 0 0;color:#4A505C">${E(d.sub)}</p>` : ''}
          <table class="hpl-bu-tb"><thead><tr><th scope="col">구분</th><th scope="col">${E(t_('cls'))}명</th><th scope="col">기간</th><th scope="col">수강료</th><th scope="col"><span style="position:absolute;left:-9999px">신청</span></th></tr></thead><tbody>${L.map(c => `<tr><td class="k"><span class="tg">${E(KIND(c))}</span></td><td class="n"><a href="#p-c-${E(c.id)}">${E(c.name)}</a>${lesOf(c) ? `<small>${lesOf(c)}차시${+c.hours ? ` · ${Math.round(+c.hours)}시간` : ''}</small>` : ''}</td><td>${E(perOf(c) || '상시')}</td><td class="p">${E(priceOf(c))}</td><td class="x"><a class="go" href="#p-c-${E(c.id)}">자세히</a></td></tr>`).join('')}</tbody></table>`); },
      features(d, s) { const L = colsOf(d); if (!L.length) return null; const n = L.length % 3 === 0 || L.length >= 5 ? 3 : L.length === 4 ? 2 : Math.min(L.length, 3);
        return SEC('bulletin', 'hpl-bu-ft', `${secHead(d, 'hpl-sh')}<div class="hpl-bu-fg" style="--n:${n}">${L.map(([a, b], k) => `<div class="hpl-bu-f"><span>${IC_(H.iconFor(a + ' ' + b, k), 24)}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></div>`).join('')}</div>`); },
      plain(d, s, th, T) { return colsOf(d).length ? this.features(d, s) : null; },
      tiles(d, s) { return this.features(d, s); },
      steps(d, s) { const L = colsOf(d); if (!L.length) return null;
        return SEC('bulletin', 'hpl-bu-stp', `${secHead(d, 'hpl-sh')}<ol class="hpl-bu-st">${L.map(([a, b], k) => `<li><small>${k + 1}단계</small><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol>`); },
      notices(d, s) { const L = notices(+d.n || 5); if (!L.length) return hint('hpl-bulletin', '공지사항을 올리면 이곳에 게시판 형식으로 표시됩니다.'); const m = menuOf(s, 'notice');
        return SEC('bulletin', 'hpl-bu-nt', `<div class="hpl-sh">${d.eyebrow ? `<p class="hpl-sh-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${m ? `<a class="hpl-bu-more" href="#p-m-${E(m.id)}">더보기 ${IC_('plus', 16, 2)}</a>` : ''}</div><ul class="hpl-bu-nl">${L.map(n => `<li><em>공지</em><b>${E(n.title)}</b><time>${E(dot(n.at || ''))}</time></li>`).join('')}</ul>`); },
      cta(d, s) { const Cc = contact(); const h = askHref(s); const body = typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : '';
        const extra = colsOf(d).filter(([a, b]) => b && !isPh(b) && !Cc.some(c => c.v === b)).map(([a, b]) => ({ ic: /시간/.test(a) ? 'clock' : 'clipboard', k: a, v: b, h: '' }));
        const rows = [...extra, ...Cc];
        return SEC('bulletin', 'hpl-bu-ct', `<div class="hpl-bu-cta"><div>${d.eyebrow ? `<p class="hpl-bu-ey">${E(d.eyebrow)}</p>` : ''}<h2 style="margin-top:10px">${br(d.title || '')}</h2>${body}${d.cta && h ? `<div class="hpl-bu-bt" style="margin-top:20px"><a class="hpl-bu-b sec" style="background:#fff" ${aAttr(h)}>${E(d.cta)}</a></div>` : ''}</div>
          ${rows.length ? `<dl class="hpl-bu-dl">${rows.slice(0, 4).map(c => `<div><dt>${IC_(c.ic, 18)}${E(c.k)}</dt><dd>${c.h ? `<a ${aAttr(c.h)}>${E(c.v)}</a>` : E(c.v)}</dd></div>`).join('')}</dl>` : `<div style="padding:32px;align-self:center">${figB('cta', s, null, { ratio: '16:9' })}</div>`}</div>`); }
    }
  });

  /* ═════════ 5. collage — 콜라주(어린이 · 학원) ═════════
     기울어진 사진 카드 · 테이프 · 스티커 · 손으로 그은 밑줄. 색은 테마 포인트색에서 돌려 만든 4색. */
  regB('collage', {
    name: '콜라주형', by: 'D2', desc: '기울어진 사진 카드 · 스티커 · 메모지로 경쾌하게(어린이 · 학원)', fits: ['k12', 'lifelong', 'adult'],
    slots: ['hero', 'gallery1', 'gallery2', 'cls-*'], order: ['banner', 'text:features', 'classes', 'text:steps', 'reviews', 'text:stats', 'notices', 'text:cta'],
    css(s, th, T) { T = tk(s, T); const a = T.a; const [h] = hsl(a); const ink = mix(a, '#14101F', .86); const bg = mix(a, '#FFFBF4', .94);
      const C4 = [mix(a, '#ffffff', .78), fromHsl(h + 150, .75, .86), fromHsl(h + 60, .9, .86), fromHsl(h - 60, .7, .88)];
      const dk = fit(a, '#ffffff', 4.6, '#000000'); const mu = fit(T.mu, bg, 4.6); const hi = fromHsl(h + 60, .95, .62);
      const font = `'Jua','BM JUA','NanumSquareRound','Nanum Square Round',Pretendard,'Apple SD Gothic Neo',sans-serif`;
      return `${BASE('collage', T)}
.hpl-collage.hpl-s,.hpl-collage.hp-s{padding:120px 0;background:${bg}}.hpl-collage.hp-s.hp-alt{background:#fff}
.hpl-collage h1,.hpl-collage h2,.hpl-collage h3{font-family:${font}}
.hpl-collage.hpl-hero{padding:72px 0 96px;overflow:hidden;background:${bg}}.hpl-co-hg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:40px;align-items:center}
.hpl-co-ey{display:inline-block;font-size:15px;font-weight:800;color:${ink};background:${C4[2]};padding:8px 14px;border-radius:8px;transform:rotate(-2deg)}
.hpl-collage h1{margin:22px 0 0;font-size:clamp(36px,4.3vw,58px);line-height:1.14;letter-spacing:-.03em;font-weight:800;color:${ink}}.hpl-co-u{display:block;width:min(300px,70%);height:18px;margin-top:6px}
.hpl-co-sub{margin-top:20px;font-size:18px;line-height:1.7;color:${mu};max-width:520px}.hpl-co-bt{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.hpl-co-b{display:inline-flex;align-items:center;min-height:56px;padding:0 28px;border-radius:999px;font-weight:800;font-size:16.5px}.hpl-co-b.pri{background:${dk};color:#fff;box-shadow:0 5px 0 ${mix(dk, '#000000', .35)}}.hpl-co-b.sec{background:#fff;color:${ink};box-shadow:0 0 0 2px ${ink},0 5px 0 ${ink}}
.hpl-co-wall{position:relative;min-height:600px}.hpl-co-p{position:absolute;background:#fff;padding:12px 12px 16px;box-shadow:0 18px 40px -18px ${al(ink, .45)},0 0 0 1px ${al(ink, .06)};border-radius:6px}.hpl-co-p .hpl-img{border-radius:3px}.hpl-co-p::before{content:'';position:absolute;top:-14px;left:50%;width:96px;height:28px;margin-left:-48px;background:${al(C4[2], .85)};transform:rotate(-4deg);z-index:2}
.hpl-co-p1{left:6%;top:0;width:64%;transform:rotate(-4deg);z-index:2}.hpl-co-p2{right:0;top:22%;width:44%;transform:rotate(5deg);z-index:3}.hpl-co-p3{left:0;bottom:0;width:40%;transform:rotate(3deg);z-index:1}
.hpl-co-p figcaption{position:static !important;display:block;padding:10px 4px 0;font-family:${font};font-size:16px;color:${ink}}
.hpl-co-stk{position:absolute;z-index:4;display:grid;place-items:center;text-align:center;width:118px;height:118px;border-radius:50%;background:${C4[1]};color:${ink};font-weight:800;font-size:15px;line-height:1.3;padding:14px;transform:rotate(-10deg);box-shadow:0 0 0 4px #fff,0 12px 24px -10px ${al(ink, .4)}}.hpl-co-stk.s1{right:6%;top:-2%}.hpl-co-stk.s2{left:44%;bottom:2%;background:${C4[3]};transform:rotate(8deg);width:104px;height:104px}
.hpl-co-sq{position:absolute;pointer-events:none}
/* 머리 */
.hpl-collage .hpl-sh{text-align:center;max-width:720px;margin:0 auto 48px}.hpl-collage .hpl-sh-ey{display:inline-block;margin:0 0 14px;font-size:14.5px;font-weight:800;color:${ink};background:${C4[0]};padding:6px 12px;border-radius:8px;transform:rotate(-1.5deg)}.hpl-collage .hpl-sh h2{margin:0;font-size:clamp(28px,3.4vw,44px);line-height:1.25;color:${ink};font-weight:800}.hpl-collage .hpl-sh-sd{margin-top:14px;color:${mu};font-size:17px;line-height:1.7}
/* 메모지 */
.hpl-co-ng{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:28px 24px;list-style:none;margin:0;padding:0}.hpl-co-n{position:relative;padding:34px 26px 30px;border-radius:4px 4px 22px 4px;color:${ink};box-shadow:0 14px 28px -18px ${al(ink, .5)}}
${C4.map((c, k) => `.hpl-co-n:nth-child(4n+${k + 1}){background:${c};transform:rotate(${[-1.6, 1.2, -.8, 1.8][k]}deg)}`).join('')}.hpl-co-n::before{content:'';position:absolute;top:-12px;left:28px;width:70px;height:24px;background:${al('#ffffff', .7)};transform:rotate(-6deg);box-shadow:0 1px 2px ${al(ink, .12)}}
.hpl-co-n>span{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:#fff;color:${ink};margin-bottom:16px}.hpl-co-n h3{margin:0;font-size:21px;letter-spacing:-.01em}.hpl-co-n p{margin:8px 0 0;font-size:15.5px;line-height:1.7;color:${fit(T.mu, C4[0], 4.6)}}
/* 강좌 카드 */
.hpl-co-cg{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:32px 26px}.hpl-co-c{position:relative;display:flex;flex-direction:column;background:#fff;border-radius:18px;padding:12px 12px 18px;box-shadow:0 0 0 2px ${ink},6px 6px 0 ${ink};transition:transform .15s}.hpl-co-c:nth-child(odd){transform:rotate(-1deg)}.hpl-co-c:nth-child(even){transform:rotate(1deg)}.hpl-co-c:hover{transform:rotate(0) translateY(-3px)}
.hpl-co-c .hpl-img{border-radius:10px}.hpl-co-cb{padding:14px 8px 0;display:flex;flex-direction:column;gap:8px;flex:1}.hpl-co-cb h3{margin:0;font-size:20px;color:${ink};line-height:1.35}.hpl-co-cb p{margin:0;color:${mu};font-size:14.5px}.hpl-co-pr{position:absolute;right:-10px;top:-14px;z-index:2;background:${hi};color:${fit(ink, hi, 4.8)};font-weight:800;font-size:15px;padding:8px 14px;border-radius:999px;transform:rotate(6deg);box-shadow:0 0 0 3px #fff}
.hpl-co-go{margin-top:auto;display:inline-flex;align-items:center;gap:6px;font-weight:800;color:${fit(a, '#ffffff', 4.6)};font-size:15px;padding-top:8px}
/* 단계 길 */
.hpl-co-st{position:relative;list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:24px}.hpl-co-path{position:absolute;left:0;right:0;top:4px;width:100%;height:80px;pointer-events:none}
.hpl-co-st li{position:relative;text-align:center;padding-top:6px}.hpl-co-st li>b{display:grid;place-items:center;margin:0 auto;width:72px;height:72px;border-radius:46% 54% 50% 50%;font-family:${font};font-size:30px;color:${ink};box-shadow:0 0 0 4px #fff}${C4.map((c, k) => `.hpl-co-st li:nth-child(4n+${k + 1})>b{background:${c}}`).join('')}.hpl-co-st li:nth-child(even){padding-top:40px}.hpl-co-st h3{margin:16px 0 0;font-size:19px;color:${ink}}.hpl-co-st p{margin:6px 0 0;color:${mu};font-size:15px;line-height:1.65}
/* 문의 */
.hpl-collage.hpl-co-end{padding:0 0 96px;background:${bg}}.hpl-co-cta{position:relative;background:${dk};color:#fff;border-radius:36px;padding:64px 56px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:40px;align-items:center;overflow:hidden}.hpl-co-cta h2{margin:0;color:#fff;font-size:clamp(28px,3.4vw,42px);line-height:1.25}.hpl-co-cta p{margin:14px 0 0;color:${fit('#E8E4F5', dk, 4.8, '#ffffff')};font-size:17px;line-height:1.7}
.hpl-co-cta .hpl-co-ey{color:${ink}}.hpl-co-cta .hpl-co-b.pri{background:#fff;color:${dk};box-shadow:0 5px 0 ${mix(dk, '#000000', .35)}}.hpl-co-ci{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;position:relative;z-index:1}.hpl-co-ci li{background:#fff;color:${ink};border-radius:16px;padding:14px 16px;display:flex;gap:12px;align-items:center;transform:rotate(-1deg)}.hpl-co-ci li:nth-child(even){transform:rotate(1deg)}.hpl-co-ci small{display:block;font-size:12.5px;color:${fit(T.mu, '#ffffff', 4.6)}}.hpl-co-ci b,.hpl-co-ci a{font-weight:800;font-size:16px;word-break:break-all}
.hpl-co-dots{position:absolute;right:-40px;bottom:-60px;width:260px;height:260px;border-radius:50%;background:radial-gradient(${al('#ffffff', .22)} 2.5px,transparent 3px) 0 0/22px 22px;pointer-events:none}
/* 기본 섹션 맞추기 */
.hpl-collage .hp-sh{text-align:center;margin-left:auto;margin-right:auto}.hpl-collage .hp-sh h2{font-family:${font}}.hpl-collage .hp-ey{text-transform:none;letter-spacing:0;font-weight:800}.hpl-collage .hp-card{border-radius:18px;box-shadow:0 0 0 2px ${ink},5px 5px 0 ${ink};border:0}.hpl-collage .hp-qa details{border-radius:16px}
@media(max-width:1000px){.hpl-co-hg{grid-template-columns:1fr;gap:28px}.hpl-co-wall{min-height:440px;max-width:560px;width:100%;margin:0 auto}.hpl-co-ng,.hpl-co-cg{grid-template-columns:repeat(2,minmax(0,1fr))}.hpl-co-st{grid-template-columns:repeat(2,minmax(0,1fr))}.hpl-co-path{display:none}.hpl-co-st li:nth-child(even){padding-top:6px}.hpl-co-cta{grid-template-columns:1fr;padding:44px 32px}}
@media(max-width:640px){.hpl-collage.hpl-s,.hpl-collage.hp-s{padding:72px 0}.hpl-collage.hpl-hero{padding:40px 0 56px}.hpl-collage h1{font-size:36px}.hpl-co-sub{font-size:16.5px}.hpl-co-b{flex:1 1 auto;justify-content:center}.hpl-co-wall{min-height:330px}.hpl-co-p{padding:8px 8px 10px}.hpl-co-p figcaption{font-size:13.5px;padding-top:6px}.hpl-co-stk{width:88px;height:88px;font-size:12.5px;padding:10px}.hpl-co-stk.s2{display:none}.hpl-co-p::before{width:64px;height:20px;margin-left:-32px}
.hpl-co-ng,.hpl-co-cg,.hpl-co-st{grid-template-columns:1fr;gap:22px}.hpl-co-n{padding:28px 20px 24px}.hpl-co-c:nth-child(n){transform:none}.hpl-co-pr{right:-4px}.hpl-co-st{text-align:left}.hpl-co-st li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 16px;text-align:left;padding:0}.hpl-co-st li>b{grid-row:span 2;width:60px;height:60px;font-size:24px;margin:0}.hpl-co-st h3{margin:6px 0 0}
.hpl-collage.hpl-co-end{padding-bottom:56px}.hpl-co-cta{padding:36px 22px;border-radius:26px}}${TOKL('collage', { h: 1, h1: ['h1', 36, 4.3], h2: ['.hpl-sh h2', '.hpl-co-cta h2'], btnKeep: ['.hpl-co-b'] })}`; },
    hero(s, d, th, T) { T = tk(s, T); const B = badges(); const C0 = pub(); const a = T.a; const [h] = hsl(a); const ink = mix(a, '#14101F', .86); const hi = fromHsl(h + 60, .95, .62);
      const under = `<svg class="hpl-co-u" viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true"><path d="M4 12C60 2 120 16 180 8s80 2 116-2" fill="none" stroke="${hi}" stroke-width="7" stroke-linecap="round"/></svg>`;
      const cap = k => C0[k] ? String(C0[k].name).slice(0, 16) : '';
      const star = `<svg class="hpl-co-sq" style="left:-2%;top:46%;width:54px" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC.star}" fill="${hi}" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/></svg><svg class="hpl-co-sq" style="right:-3%;bottom:16%;width:80px" viewBox="0 0 80 40" aria-hidden="true"><path d="M4 20c8-14 16 14 24 0s16 14 24 0 16 14 24 0" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/></svg>`;
      return `<section class="hpt hpl-s hpl-collage hpl-hero"><div class="hpl-w hpl-co-hg"><div>${d.eyebrow ? `<p class="hpl-co-ey">${E(d.eyebrow)}</p>` : ''}<h1>${h1Of(d)}</h1>${under}${d.sub ? `<p class="hpl-co-sub">${E(d.sub)}</p>` : ''}<div class="hpl-co-bt">${btns(d, s, 'hpl-co')}</div></div>
        <div class="hpl-co-wall">${star}<div class="hpl-co-p hpl-co-p1">${figB('hero', s, T, { ratio: '4:3', mode: 'warm' })}</div><div class="hpl-co-p hpl-co-p2">${figB('gallery1', s, T, { ratio: '1:1', mode: 'warm', text: cap(0), cap: cap(0) })}</div><div class="hpl-co-p hpl-co-p3">${figB('gallery2', s, T, { ratio: '1:1', mode: 'warm', text: cap(1), cap: cap(1) })}</div>
        ${B[0] ? `<span class="hpl-co-stk s1">${E(B[0][1])}</span>` : ''}${B[1] ? `<span class="hpl-co-stk s2">${E(B[1][1])}</span>` : ''}</div></div></section>`; },
    sec: {
      features(d, s) { const L = colsOf(d); if (!L.length) return null; const n = L.length === 4 ? 2 : L.length >= 3 ? 3 : L.length;
        return SEC('collage', 'hpl-co-ft', `${secHead(d, 'hpl-sh')}<ul class="hpl-co-ng" style="--n:${n}">${L.map(([a, b], k) => `<li class="hpl-co-n"><span>${IC_(H.iconFor(a + ' ' + b, k), 26, 2)}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ul>`); },
      plain(d, s) { return colsOf(d).length ? this.features(d, s) : null; },
      tiles(d, s) { return this.features(d, s); },
      classes(d, s, th, T) { T = tk(s, T); const L = clsList(d); if (!L.length) return hint('hpl-collage', `전체 공개한 ${t_('cls')}이 이곳에 표시됩니다.`); const n = L.length === 4 ? 2 : Math.min(L.length, 3);
        return SEC('collage', 'hpl-co-cls', `${secHead(d, 'hpl-sh')}<div class="hpl-co-cg" style="--n:${n}">${L.map((c, k) => `<a class="hpl-co-c" href="#p-c-${E(c.id)}"><span class="hpl-co-pr">${E(priceOf(c))}</span>${figB('cls-' + c.id, s, T, { ratio: '4:3', mode: 'warm', text: c.name })}<div class="hpl-co-cb"><h3>${E(c.name)}</h3>${metaOf(c).length ? `<p>${E(metaOf(c).join(' · '))}</p>` : ''}<span class="hpl-co-go">자세히 보기 ${IC_('arrow', 16, 2.2)}</span></div></a>`).join('')}</div>`); },
      steps(d, s, th, T) { T = tk(s, T); const L = colsOf(d); if (!L.length) return null; const n = Math.min(L.length, 4); const ink = mix(T.a, '#14101F', .86);
        return SEC('collage', 'hpl-co-stp', `${secHead(d, 'hpl-sh')}<ol class="hpl-co-st" style="--n:${n}"><svg class="hpl-co-path" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><path d="M60 40C200-10 300 90 440 40S700-10 940 40" fill="none" stroke="${al(ink, .35)}" stroke-width="3" stroke-dasharray="10 10"/></svg>${L.map(([a, b], k) => `<li><b>${k + 1}</b><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol>`); },
      cta(d, s) { const Cc = contact(); const h = askHref(s); const body = typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : '';
        return `<section class="hpt hpl-s hpl-collage hpl-co-end"><div class="hpl-w"><div class="hpl-co-cta"><i class="hpl-co-dots" aria-hidden="true"></i><div style="position:relative;z-index:1">${d.eyebrow ? `<p class="hpl-co-ey" style="margin-bottom:18px">${E(d.eyebrow)}</p>` : ''}<h2>${br(d.title || '')}</h2>${body}${d.cta && h ? `<div class="hpl-co-bt"><a class="hpl-co-b pri" ${aAttr(h)}>${E(d.cta)}</a></div>` : ''}</div>
          ${Cc.length ? `<ul class="hpl-co-ci">${Cc.map(c => `<li>${IC_(c.ic, 22, 2)}<div><small>${E(c.k)}</small>${c.h ? `<a ${aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</div></li>`).join('')}</ul>` : ''}</div></div></section>`; }
    }
  });

  /* ═════════ 6. noir — 어두운 고급(금빛 · 모노) ═════════
     모든 섹션이 어두운 바탕. 명조 큰 제목 · 가는 금빛 선 · 아치형 사진 틀 · 메뉴판처럼 이름과 수강료를 점선으로 잇는 강좌 목록. */
  const noirTok = T => { const a = T.a; const bg = mix(a, '#08090C', .9); const bg2 = mix(a, '#0D0F14', .84); let gold = mix('#D9B871', a, .18); gold = fit(gold, bg2, 6.5, '#ffffff');
    const tx = '#F2EEE6'; const mu = fit('#ABA69C', bg2, 5, '#ffffff'); return { bg, bg2, gold, tx, mu, line: al(gold, .28), line2: al('#ffffff', .1) }; };
  regB('noir', {
    name: '노와르(고급 다크)', by: 'D2', desc: '어두운 바탕 · 명조 큰 제목 · 가는 금빛 선 · 아치형 사진 틀(프리미엄 · 전문 과정)', fits: ['adult', 'corp', 'univ', 'voc'],
    slots: ['hero', 'cls-*'], order: ['banner', 'text:stats', 'classes', 'text:features', 'text:steps', 'reviews', 'text:info', 'text:cta'],
    css(s, th, T) { T = tk(s, T); const N = noirTok(T); const serif = `'Noto Serif KR','Nanum Myeongjo','AppleMyungjo','Batang',Georgia,serif`;
      return `${BASE('noir', T)}
.hpl-noir.hpt{--bg:${N.bg};--alt:${N.bg2};--ink:${N.tx};--mu:${N.mu};--at:${N.gold};--at2:${N.gold};--as:${al(N.gold, .1)};--as2:${al(N.gold, .16)};color:${N.tx};background:${N.bg}}
.hpl-noir.hpl-s,.hpl-noir.hp-s{padding:144px 0;background:${N.bg};color:${N.tx}}.hpl-noir.hp-s.hp-alt,.hpl-noir.hpl-alt{background:${N.bg2}}
.hpl-noir h1,.hpl-noir h2,.hpl-noir h3,.hpl-noir .hp-sh h2{font-family:${serif};font-weight:500;color:${N.tx}}
.hpl-noir.hpl-hero{padding:0;min-height:min(860px,100vh);display:flex;align-items:flex-end;overflow:hidden;position:relative;background:${N.bg}}
.hpl-no-bg{position:absolute !important;inset:0;aspect-ratio:auto !important;height:100%;z-index:0}.hpl-noir .hpl-photo img{filter:saturate(.45) brightness(.86) contrast(1.06)}
.hpl-no-sc{position:absolute;inset:0;z-index:0;background:linear-gradient(90deg,${N.bg} 0%,${al(N.bg, .94)} 34%,${al(N.bg, .55)} 62%,${al(N.bg, .2)} 100%),linear-gradient(0deg,${N.bg} 0%,${al(N.bg, 0)} 38%)}
.hpl-no-hg{position:relative;z-index:1;padding-top:160px !important;padding-bottom:96px !important;width:100%}.hpl-no-hg>div{max-width:780px}
.hpl-no-ey{display:flex;align-items:center;gap:16px;font-size:14px;letter-spacing:.18em;color:${N.gold};margin:0}.hpl-no-ey::after{content:'';flex:1;max-width:120px;height:1px;background:${N.line}}
.hpl-noir h1{margin:36px 0 0;font-size:clamp(44px,5.6vw,84px);line-height:1.08;letter-spacing:-.03em;font-weight:300}.hpl-no-sub{margin-top:28px;font-size:18px;line-height:1.85;color:${N.mu};max-width:520px}
.hpl-no-bt{display:flex;flex-wrap:wrap;gap:14px;margin-top:44px}.hpl-no-b{display:inline-flex;align-items:center;gap:12px;min-height:56px;padding:0 30px;font-size:15.5px;font-weight:600;letter-spacing:.04em;border-radius:0}.hpl-no-b.pri{background:${N.gold};color:${fit('#111111', N.gold, 7)}}.hpl-no-b.sec{box-shadow:inset 0 0 0 1px ${N.line};color:${N.tx}}.hpl-no-b:hover{filter:brightness(1.08)}
.hpl-no-fr{position:relative;padding:14px}.hpl-no-fr::before{content:'';position:absolute;inset:0;border:1px solid ${N.line};border-radius:999px 999px 0 0}.hpl-no-fr .hpl-img{border-radius:999px 999px 0 0;background:${N.bg2}}
.hpl-no-tr{list-style:none;margin:56px 0 0;padding:28px 0 0;border-top:1px solid ${N.line2};display:flex;flex-wrap:wrap;gap:12px 0}.hpl-no-tr li{display:flex;align-items:center;gap:10px;padding:0 24px;font-size:14.5px;color:${N.mu}}.hpl-no-tr li:first-child{padding-left:0}.hpl-no-tr li+li{border-left:1px solid ${N.line2}}.hpl-no-tr .hpl-ic{color:${N.gold}}
/* 머리 */
.hpl-noir .hpl-sh{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:24px 64px;align-items:end;margin-bottom:56px;padding-bottom:28px;border-bottom:1px solid ${N.line2}}.hpl-noir .hpl-sh-ey{grid-column:1;margin:0;font-size:13.5px;letter-spacing:.18em;color:${N.gold}}.hpl-noir .hpl-sh h2{grid-column:1;margin:0;font-size:clamp(30px,3.6vw,50px);line-height:1.2;letter-spacing:-.02em}.hpl-noir .hpl-sh-sd{grid-column:2;grid-row:1/3;margin:0;color:${N.mu};font-size:16.5px;line-height:1.85;align-self:end}
/* 강좌: 메뉴판 */
.hpl-no-ml{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}.hpl-no-m{display:grid;grid-template-columns:120px minmax(0,1fr);gap:32px;align-items:center;padding:28px 0;border-bottom:1px solid ${N.line2}}.hpl-no-m .hpl-img{border-radius:999px 999px 0 0}
.hpl-no-mh{display:flex;align-items:baseline;gap:16px}.hpl-no-mh h3{margin:0;font-size:clamp(20px,2.2vw,28px);letter-spacing:-.015em;line-height:1.35}.hpl-no-mh i{flex:1;min-width:24px;border-bottom:1px dotted ${al(N.gold, .5)};transform:translateY(-6px)}.hpl-no-mh b{font-family:${serif};font-weight:500;font-size:22px;color:${N.gold};white-space:nowrap}
.hpl-no-mm{margin:10px 0 0;display:flex;flex-wrap:wrap;gap:4px 18px;color:${N.mu};font-size:14.5px;letter-spacing:.02em}.hpl-no-m:hover h3{color:${N.gold}}
/* 특징 */
.hpl-no-fx{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:72px;align-items:start}.hpl-no-fp{position:sticky;top:24px}.hpl-no-fx .hpl-no-f:first-child{border-top:0;padding-top:0}.hpl-no-fg{display:grid;grid-template-columns:repeat(var(--n,2),minmax(0,1fr));gap:0 64px}.hpl-no-f{padding:32px 0;border-top:1px solid ${N.line2};display:grid;grid-template-columns:44px minmax(0,1fr);gap:20px}.hpl-no-f .hpl-ic{color:${N.gold};margin-top:4px}.hpl-no-f h3{margin:0;font-size:23px;letter-spacing:-.01em}.hpl-no-f p{margin:10px 0 0;color:${N.mu};font-size:16px;line-height:1.85}
/* 단계 */
.hpl-no-st{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:0}.hpl-no-st li{padding:8px 32px 8px 0;border-left:1px solid ${N.line2};padding-left:28px}.hpl-no-st li:first-child{border-left:0;padding-left:0}.hpl-no-st b{display:block;font-family:${serif};font-weight:400;font-size:44px;color:${N.gold};line-height:1;margin-bottom:28px}.hpl-no-st h3{margin:0;font-size:21px}.hpl-no-st p{margin:10px 0 0;color:${N.mu};font-size:15.5px;line-height:1.8}
/* 숫자 */
.hpl-noir.hp-facts{padding:72px 0;border:0;border-bottom:1px solid ${N.line2};background:${N.bg}}.hpl-no-fl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr))}.hpl-no-fl li{text-align:center;padding:0 16px}.hpl-no-fl li+li{border-left:1px solid ${N.line2}}.hpl-no-fl b{display:block;font-family:${serif};font-weight:400;font-size:clamp(40px,4.6vw,64px);color:${N.tx};line-height:1}.hpl-no-fl b small{font-size:.36em;color:${N.gold};margin-left:6px;font-family:Pretendard,sans-serif;font-weight:600}.hpl-no-fl span{display:block;margin-top:14px;font-size:14px;letter-spacing:.1em;color:${N.mu}}
/* 마무리 */
.hpl-no-end{text-align:center;max-width:820px;margin:0 auto}.hpl-no-end h2{margin:0;font-size:clamp(32px,4vw,56px);line-height:1.2;letter-spacing:-.02em}.hpl-no-end p{margin:20px auto 0;color:${N.mu};font-size:17px;line-height:1.85;max-width:620px}.hpl-no-end .hpl-no-bt{justify-content:center}.hpl-no-ci{list-style:none;margin:48px 0 0;padding:28px 0 0;border-top:1px solid ${N.line2};display:flex;flex-wrap:wrap;justify-content:center;gap:12px 40px}.hpl-no-ci li{display:flex;gap:10px;align-items:center;color:${N.mu};font-size:15px}.hpl-no-ci .hpl-ic{color:${N.gold}}.hpl-no-ci a,.hpl-no-ci b{color:${N.tx};font-weight:600}
/* 기본 섹션을 어둡게 */
.hpl-noir .hp-card,.hpl-noir.hp-alt .hp-card,.hpl-noir .hp-qa details,.hpl-noir .hp-dl div,.hpl-noir .hp-tll li,.hpl-noir .hp-cc{background:${al('#ffffff', .03)};border:1px solid ${N.line2};box-shadow:none;color:${N.tx};border-radius:0}.hpl-noir .hp-card p,.hpl-noir .hp-qa details p,.hpl-noir .hp-cm span{color:${N.mu}}.hpl-noir .hp-cm span{background:${al('#ffffff', .06)}}.hpl-noir .hp-cp{border-top-color:${N.line2}}
.hpl-noir .hp-ey{color:${N.gold};letter-spacing:.18em;text-transform:none;font-weight:600}.hpl-noir .hp-sd{color:${N.mu}}.hpl-noir .hp-ic,.hpl-noir .hp-qa summary i{background:${al(N.gold, .12)};color:${N.gold}}.hpl-noir .hp-stars i{color:${al('#ffffff', .2)}}.hpl-noir .hp-rc blockquote{color:${N.tx};font-family:${serif};font-weight:400}
.hpl-noir .hp-nl{border-top-color:${N.gold}}.hpl-noir .hp-nl li{border-bottom-color:${N.line2}}.hpl-noir .hp-nl time{color:${N.mu}}.hpl-noir .hp-tag{background:${al(N.gold, .12)};color:${N.gold}}.hpl-noir .hp-all,.hpl-noir .hp-more{color:${N.gold}}
.hpl-noir .hp-ctab{background:${N.bg2};box-shadow:inset 0 0 0 1px ${N.line};border-radius:0}.hpl-noir .hp-ctab::after{display:none}.hpl-noir .hp-btn.inv{background:${N.gold};color:#111}.hpl-noir .hp-ci li{background:${al('#ffffff', .04)}}.hpl-noir .hp-ci i{background:${N.gold};color:#111}.hpl-noir .hp-ci.lt li{background:${al('#ffffff', .03)};box-shadow:0 0 0 1px ${N.line2};color:${N.tx}}.hpl-noir .hp-ci.lt i{background:${al(N.gold, .14)};color:${N.gold}}.hpl-noir .hp-ci.lt small{color:${N.mu}}
.hpl-noir .hp-mapv{box-shadow:0 0 0 1px ${N.line2};filter:grayscale(.6) brightness(.55)}.hpl-noir .hp-fl b{color:${N.tx}}.hpl-noir .hp-fl span{color:${N.mu}}.hpl-noir.hp-facts{background:${N.bg}}.hpl-noir .hp-hint{background:${al(N.gold, .08)};color:${N.gold};border-color:${N.line}}.hpl-noir .hp-no{box-shadow:none;background:${N.gold};color:#111}.hpl-noir .hp-st::before{background:${N.line2}}.hpl-noir .hp-st p{color:${N.mu}}.hpl-noir .hp-av{color:#111;background:${N.gold} !important}
@media(max-width:900px){.hpl-no-hg{padding-top:120px !important;padding-bottom:64px !important}.hpl-no-fx{grid-template-columns:1fr;gap:32px}.hpl-no-fp{position:relative;top:auto;aspect-ratio:16 / 9 !important}.hpl-noir .hpl-sh{grid-template-columns:1fr}.hpl-noir .hpl-sh-sd{grid-column:1;grid-row:auto}.hpl-no-fg{grid-template-columns:1fr}.hpl-no-st{grid-template-columns:repeat(2,minmax(0,1fr));gap:36px 0}.hpl-no-st li:nth-child(odd){border-left:0;padding-left:0}.hpl-no-fl{grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 0}.hpl-no-fl li:nth-child(odd){border-left:0}}
@media(max-width:640px){.hpl-noir.hpl-s,.hpl-noir.hp-s{padding:80px 0}.hpl-noir.hpl-hero{min-height:0;display:block}.hpl-no-bg{position:relative !important;inset:auto;height:auto;aspect-ratio:4 / 5 !important}.hpl-no-sc{background:linear-gradient(0deg,${N.bg} 0%,${N.bg} calc(100% - 520px),${al(N.bg, .3)} calc(100% - 300px),${al(N.bg, 0)} 100%)}.hpl-no-hg{margin-top:-180px;padding-top:0 !important;padding-bottom:56px !important}.hpl-noir h1{font-size:40px;margin-top:20px}.hpl-no-sub{font-size:16.5px}.hpl-no-b{flex:1 1 auto;justify-content:center}.hpl-no-tr{flex-direction:column;gap:10px}.hpl-no-tr li{padding:0;border:0 !important}
.hpl-no-m{grid-template-columns:72px minmax(0,1fr);gap:18px;padding:20px 0}.hpl-no-mh{flex-wrap:wrap;gap:6px}.hpl-no-mh h3{flex-basis:100%}.hpl-no-mh i{display:none}.hpl-no-mh b{font-size:18px}.hpl-no-st{grid-template-columns:1fr}.hpl-no-st li{border-left:0 !important;padding:0 0 0 0}.hpl-no-st b{font-size:36px;margin-bottom:12px}.hpl-no-f{grid-template-columns:32px minmax(0,1fr);gap:14px;padding:24px 0}.hpl-no-f h3{font-size:20px}}${TOKL('noir', { sec: [1, 16], btnKeep: ['.hpl-no-b'] })}`; },
    hero(s, d, th, T) { T = tk(s, T); const B = badges();
      return `<section class="hpt hpl-s hpl-noir hpl-hero">${figB('hero', s, T, { ratio: '16:9', mode: 'dark', cls: 'hpl-no-bg' })}<i class="hpl-no-sc" aria-hidden="true"></i><div class="hpl-w hpl-no-hg"><div>${d.eyebrow ? `<p class="hpl-no-ey">${E(d.eyebrow)}</p>` : ''}<h1>${h1Of(d)}</h1>${d.sub ? `<p class="hpl-no-sub">${E(d.sub)}</p>` : ''}<div class="hpl-no-bt">${btns(d, s, 'hpl-no')}</div>
        ${B.length ? `<ul class="hpl-no-tr">${B.map(([ic, l]) => `<li>${IC_(ic, 18, 1.5)}<span>${E(l)}</span></li>`).join('')}</ul>` : ''}</div></div></section>`; },
    sec: {
      classes(d, s, th, T) { T = tk(s, T); const L = clsList(d); if (!L.length) return hint('hpl-noir', `전체 공개한 ${t_('cls')}이 이곳에 표시됩니다.`);
        return SEC('noir', 'hpl-no-cls', `${secHead(d, 'hpl-sh')}<ul class="hpl-no-ml">${L.map((c, k) => `<li><a class="hpl-no-m" href="#p-c-${E(c.id)}">${figB('cls-' + c.id, s, T, { ratio: '3:4', mode: 'dark', text: c.name })}<div><div class="hpl-no-mh"><h3>${E(c.name)}</h3><i aria-hidden="true"></i><b>${E(priceOf(c))}</b></div><p class="hpl-no-mm">${[KIND(c), ...metaOf(c)].map(m => `<span>${E(m)}</span>`).join('')}</p></div></a></li>`).join('')}</ul>`); },
      features(d, s) { const L = colsOf(d); if (!L.length) return null;
        return SEC('noir', 'hpl-no-ft hpl-alt', `${secHead(d, 'hpl-sh')}<div class="hpl-no-fx">${figB('about1', s, null, { ratio: '4:5', mode: 'dark', cls: 'hpl-no-fp', text: L.map(r => r[0]).join(' ') })}<div class="hpl-no-fg" style="--n:1">${L.map(([a, b], k) => `<div class="hpl-no-f">${IC_(H.iconFor(a + ' ' + b, k), 28, 1.3)}<div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></div>`).join('')}</div></div>`); },
      plain(d, s) { return colsOf(d).length ? this.features(d, s) : null; },
      tiles(d, s) { return this.features(d, s); },
      steps(d, s) { const L = colsOf(d); if (!L.length) return null; const RN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        return SEC('noir', 'hpl-no-stp', `${secHead(d, 'hpl-sh')}<ol class="hpl-no-st" style="--n:${L.length === 5 ? 5 : Math.min(L.length, 4)}">${L.map(([a, b], k) => `<li><b>${RN[k] || k + 1}</b><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</li>`).join('')}</ol>`); },
      facts(d, s) { const F = facts(); if (F.length < 2) return hint('hpl-noir', '공개 강좌가 2개 이상이면 실제 숫자가 자동으로 표시됩니다.');
        return `<section class="hpt hp-s hpl-s hpl-noir hp-facts"><div class="hpl-w"><ul class="hpl-no-fl" style="--n:${F.length}">${F.map(x => `<li><b>${E(x.v)}<small>${E(x.u)}</small></b><span>${E(x.l)}</span></li>`).join('')}</ul></div></section>`; },
      cta(d, s) { const Cc = contact(); const h = askHref(s); const body = typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : '';
        return SEC('noir', 'hpl-no-ct hpl-alt', `<div class="hpl-no-end">${d.eyebrow ? `<p class="hpl-no-ey" style="justify-content:center">${E(d.eyebrow)}</p>` : ''}<h2 style="margin-top:24px">${br(d.title || '')}</h2>${body}${d.cta && h ? `<div class="hpl-no-bt"><a class="hpl-no-b pri" ${aAttr(h)}>${E(d.cta)}</a></div>` : ''}${Cc.length ? `<ul class="hpl-no-ci">${Cc.map(c => `<li>${IC_(c.ic, 18, 1.5)}${c.h ? `<a ${aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</li>`).join('')}</ul>` : ''}</div>`); }
    }
  });
})();
