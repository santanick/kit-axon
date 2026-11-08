/* v34.5 hpcolor — 홈페이지 색 · 팔레트(디자이너 C1, fix6/BRIEF3.md)
   대표님(2026-11-08): "디자인 유사한 거는 최대한 제외하고, 다양성을 가지고 가줘 … 디자인 수준을 더 올려줘."
   - 검증된 팔레트 40종 이상: 기관 유형 7 × 분위기 9. 대비 검사를 통과한 것만 HPC.list에 들어간다(실패는 HPC.rejected).
   - 팔레트 = 강조색(acc) · 어두운 바탕 위 강조색(acc2) · 바탕(bg) · 회색 띠(alt) · 글자(ink) · 보조 글자(mu) · 깊은 색면(dark).
     검사: 글자/바탕 7:1 · 글자/회색 띠 7:1 · 보조 글자/바탕 · 회색 띠 4.5:1(큰 글씨용은 7:1) · 흰 글자/강조색 4.5:1 ·
           강조색(링크 · 라벨)/바탕 · 회색 띠 4.5:1 · 흰 글자/깊은 색면 7:1 · acc2/깊은 색면 4.5:1.
   - 사진 톤 규칙(HPC.photo): 사진의 평균 색(샘플 사진은 미리 잰 값)으로 따뜻함 · 차가움 · 초록 · 무채색을 가르고,
     강조색이 사진 색과 겹치면(색상 차 35° 미만) 사진 위 버튼은 흰 버튼 + acc2 표시로 바꾼다. 스크림은 팔레트의 깊은 색으로 물들인다.
   - 로고 색 → 팔레트(HPC.fromLogo): OKLCH로 색상(hue)은 지키고 명도 · 채도만 맞춰 같은 검사를 통과하는 팔레트를 만든다.
   데이터: site.hpPal = 팔레트 id, site.hpPalX = 로고로 만든 팔레트 객체(id가 'logo-'로 시작), site.color = 팔레트 강조색 · hpColorLock = 1.
           site.color가 팔레트 강조색과 다르면(사용자가 다른 색을 고름) 팔레트 바탕 · 글자색은 쓰지 않는다(테마 기본으로 돌아감).
   연결(기존 함수를 감쌈): HPT.apply(opt.palette) · HPT.tokens(팔레트 바탕 · 글자 · 깊은 색) · HPT.audit(팔레트 대비 행 추가) ·
           siteHTML(hpth CSS 뒤에 팔레트 변수 덮어쓰기) · siteFromTpl(템플릿 색 tp.color → 가장 가까운 팔레트, tp.palette가 있으면 그것).
   인터페이스: window.HPC = { list, get(id), forType(type, mood), fromLogo(colors), apply(site, id), of(site), forTpl(tp, type, theme),
           photo(src|stockId|hex, site|palette), forPhoto(stockId|hex, type), check(p), MOODS, TYPES, rejected, sheetHTML() } */
'use strict';
(() => {
  /* ═════════ 색 계산 ═════════ */
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const rgb = h => { h = String(h); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const Lm = h => { const c = rgb(h).map(lin); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return hex(...A.map((v, i) => v * (1 - w) + B[i] * w)); };
  const fit = (c, bg, min, to) => { min = min || 4.5; to = to || (Lm(bg) > .35 ? '#000000' : '#ffffff'); let x = c; for (let k = 1; k <= 20 && CR(x, bg) < min; k++) x = mix(c, to, k * .05); return x; };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  /* OKLab / OKLCH (Björn Ottosson) — 색상은 지키고 명도 · 채도만 바꿀 때 쓴다 */
  const toLab = h => { const [r, g, b] = rgb(h).map(lin);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; };
  const fromLab = ([L, A, B]) => { const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m = (L - .1055613458 * A - .0638541728 * B) ** 3, s = (L - .0894841775 * A - 1.291485548 * B) ** 3;
    const R = 4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, G = -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, Bb = -.0041960863 * l - .7034186147 * m + 1.707614701 * s;
    const g = v => v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055; return [R, G, Bb].map(v => g(v) * 255); };
  const lch = h => { const [L, A, B] = toLab(h); return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360]; };
  const inG = v => v.every(x => x >= -.5 && x <= 255.5);
  const fromLch = (L, C, H) => { const r = H * Math.PI / 180; let c = C; let v = fromLab([L, c * Math.cos(r), c * Math.sin(r)]);
    for (let k = 0; k < 24 && !inG(v); k++) { c *= .9; v = fromLab([L, c * Math.cos(r), c * Math.sin(r)]); } return hex(...v); };
  const hueD = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

  /* ═════════ 분류 ═════════ */
  const TYPES = { adult: '성인 · 1인 강사', k12: '학원 · 초중고', univ: '대학', lifelong: '평생교육 · 시니어', voc: '직업훈련', corp: '기업 교육', public: '공공 교육원' };
  const MOODS = { trust: '신뢰', calm: '차분', warm: '따뜻함', vivid: '활기', playful: '경쾌', premium: '고급', natural: '자연', tech: '테크', classic: '전통' };

  /* ═════════ 팔레트 원본 ═════════
     [id, 이름, 분위기, 기관 유형, 어울리는 테마, 사진 톤(warm|cool|green|mono|any), acc, acc2, bg, alt, ink, mu, dark, 큰 글씨용(1)] */
  const RAW = [
    /* 신뢰 · 공공 · 기업 */
    ['harbor', '항구 남색', 'trust', 'public corp univ voc', 'official clean tech', 'cool', '#1F4FA3', '#F2B33D', '#FFFFFF', '#F2F5FA', '#0E1A2B', '#4A5568', '#0B2147'],
    ['civic', '시민 청록', 'trust', 'public lifelong corp', 'official clean', 'warm', '#00677A', '#F6C25B', '#FFFFFF', '#EEF5F5', '#102428', '#47595C', '#08333B'],
    ['nuri', '누리 파랑', 'trust', 'public univ', 'official campus', 'any', '#0B50D0', '#7FD1D1', '#FFFFFF', '#F4F6FA', '#1D1D1F', '#50545C', '#052561'],
    ['dancheong', '단청 남적', 'classic', 'public univ lifelong', 'official campus', 'cool', '#A8261F', '#F2C14E', '#FFFFFF', '#F6F4F1', '#1A1716', '#55504E', '#1E2B4A'],
    ['denim', '데님', 'calm', 'corp adult voc', 'clean official', 'warm', '#3B5B92', '#F2C14E', '#FFFFFF', '#F2F4F8', '#151B26', '#4C5566', '#1C2A45'],
    ['slate', '석판 회청', 'calm', 'corp public univ', 'official clean tech', 'any', '#33507A', '#9CC0E6', '#FBFCFD', '#EDF0F4', '#161C26', '#4E5866', '#1B2638'],
    ['tealcorp', '기업 틸', 'trust', 'corp voc', 'tech clean', 'warm', '#00695C', '#FFB74D', '#FFFFFF', '#F1F7F6', '#0F1E1C', '#465855', '#00352E'],
    ['boardroom', '회의실 감청', 'premium', 'corp univ', 'premium clean', 'warm', '#1E3A5F', '#E2B866', '#FBFBF9', '#F0F1EE', '#141A22', '#4D5561', '#13253D'],
    /* 대학 · 전통 */
    ['ivy', '아이비 녹', 'classic', 'univ lifelong', 'campus official', 'warm', '#1E5B3A', '#D8B23A', '#FBFAF6', '#F0EEE6', '#17201A', '#4D564F', '#0F2E1F'],
    ['crimson', '대학 진홍', 'classic', 'univ public', 'campus premium', 'cool', '#9B1B30', '#E2BC7C', '#FFFFFF', '#F7F3F2', '#1E1416', '#5A4E50', '#3A0D16'],
    ['oxford', '옥스퍼드 감청', 'classic', 'univ corp', 'campus premium official', 'warm', '#002E5D', '#C9A66B', '#FAFAF8', '#EEF0F3', '#121722', '#4B5262', '#001C3A'],
    ['granite', '화강 먹색', 'premium', 'univ adult corp', 'premium campus clean', 'any', '#2B2B2B', '#C9B79C', '#F7F6F4', '#ECEAE6', '#141414', '#57534E', '#1C1B1A'],
    ['maple', '단풍 적갈', 'warm', 'univ lifelong adult', 'campus warm', 'green', '#8A3B12', '#F0B66C', '#FFFCF8', '#F5EEE6', '#24170F', '#5E4E44', '#3B1D0C'],
    ['glacier', '빙하 청', 'calm', 'univ public corp', 'campus official tech', 'warm', '#2B5D8A', '#9CC9E8', '#FBFDFF', '#EDF3F9', '#0F1C2A', '#475668', '#10283F'],
    /* 따뜻함 · 학원 · 성인 */
    ['tangerine', '귤빛', 'warm', 'k12 adult lifelong', 'warm kids clean', 'cool', '#C2410C', '#FDBA74', '#FFFBF6', '#FFF0E0', '#2A1A10', '#5F4B3E', '#431407'],
    ['honey', '꿀빛 갈색', 'warm', 'k12 adult lifelong', 'warm clean', 'cool', '#8A5A00', '#FFC21A', '#FFFDF7', '#FFF6D9', '#1F1A10', '#5C5240', '#2B2205'],
    ['coral', '산호', 'vivid', 'adult k12', 'warm clean kids', 'cool', '#C4361C', '#FFB4A2', '#FFFFFF', '#FFF3EF', '#2B1511', '#5E4844', '#3D130B'],
    ['brick', '벽돌', 'warm', 'adult voc lifelong', 'warm official', 'cool', '#A63A2A', '#E8C07A', '#FAF8F6', '#F1EBE7', '#261A16', '#5A4D48', '#2E1712'],
    ['cocoa', '코코아', 'warm', 'adult lifelong k12', 'warm premium', 'green', '#6B3E26', '#E3B47A', '#FFFDFB', '#F4ECE4', '#2A1D16', '#5F5048', '#2A1910'],
    ['ochre', '황토 노랑', 'warm', 'adult lifelong voc', 'warm clean', 'cool', '#8F5A06', '#FDE047', '#FFFEF8', '#FBF6E3', '#221C0B', '#5A5240', '#2E2408'],
    /* 활기 · 경쾌 */
    ['cobalt', '코발트', 'vivid', 'k12 adult voc', 'clean kids tech', 'warm', '#2546F0', '#FFC83D', '#FFFFFF', '#F3F5FF', '#0F1430', '#4A5070', '#0E1A5C'],
    ['violet', '제비꽃', 'vivid', 'k12 adult', 'kids clean', 'warm', '#6D28D9', '#FACC15', '#FFFFFF', '#F6F2FF', '#1C1233', '#524868', '#2E1065'],
    ['magenta', '자홍', 'vivid', 'adult k12', 'clean kids', 'green', '#BE185D', '#FDE68A', '#FFFFFF', '#FFF1F6', '#2A0F1C', '#5F4652', '#4A0A28'],
    ['tomato', '토마토', 'vivid', 'k12 adult voc', 'kids warm clean', 'cool', '#C81E1E', '#FCD34D', '#FFFFFF', '#FEF4F2', '#1F1111', '#574545', '#450A0A'],
    ['sky', '맑은 하늘', 'vivid', 'k12 lifelong adult', 'kids clean senior', 'warm', '#0369A1', '#7DD3FC', '#FFFFFF', '#F0F8FD', '#0C1E2B', '#475866', '#082F49'],
    ['crayon', '크레용', 'playful', 'k12', 'kids warm', 'any', '#C2361A', '#5EC8F2', '#FFFEFA', '#FFF4E6', '#24160E', '#5E4C3F', '#23305C'],
    ['lagoon', '바다 놀이터', 'playful', 'k12 lifelong', 'kids warm', 'warm', '#0E7C86', '#FFB347', '#FFFFFF', '#EFF9F8', '#102A2C', '#475E60', '#0B3B3F'],
    ['berry', '베리', 'playful', 'k12 adult', 'kids clean', 'green', '#A21CAF', '#67E8F9', '#FFFFFF', '#FDF4FF', '#2A0E31', '#5D4763', '#4A044E'],
    ['block', '블록 원색', 'playful', 'k12', 'kids warm', 'any', '#1D4ED8', '#FB7185', '#FFFDF5', '#FFF6D6', '#111827', '#4B5563', '#172554'],
    /* 고급 */
    ['noirgold', '흑금', 'premium', 'adult univ corp', 'premium clean', 'any', '#7A5A1E', '#D9B872', '#FFFFFF', '#F6F4EF', '#15130F', '#55504A', '#12110E'],
    ['midnight', '자정 남색', 'premium', 'adult univ corp', 'premium clean', 'warm', '#1E2A78', '#D4AF6A', '#FCFCFD', '#F1F2F7', '#10121C', '#4A4D5C', '#0A0F2C'],
    ['bordeaux', '보르도', 'premium', 'adult univ lifelong', 'premium campus warm', 'green', '#6E1A2D', '#D9B48A', '#FDFBFA', '#F3EDEB', '#1D1214', '#5A4C4F', '#2B0A12'],
    ['plum', '자두', 'premium', 'adult lifelong', 'premium warm clean', 'green', '#5B2A6E', '#E3BFAA', '#FDFCFD', '#F4EFF5', '#1E1422', '#584C5D', '#26102F'],
    ['inkpaper', '먹과 종이', 'premium', 'adult univ', 'premium clean campus', 'any', '#161616', '#F06A6E', '#FFFFFF', '#F3F3F2', '#161616', '#555555', '#161616'],
    ['rose', '장미 회분', 'calm', 'adult lifelong', 'clean warm premium', 'green', '#A23B5B', '#F3C9B8', '#FFFCFC', '#FAF0F1', '#2A1519', '#5E4A4F', '#3E1522'],
    /* 자연 · 평생 · 시니어 */
    ['sage', '세이지', 'natural', 'lifelong adult', 'warm clean senior', 'any', '#3F6B4E', '#E1CDA8', '#FBFCFA', '#EEF3EE', '#18221B', '#4C5A50', '#1D3326'],
    ['olive', '올리브', 'natural', 'lifelong voc adult', 'warm official', 'cool', '#5B6B1F', '#E3C46B', '#FDFDF8', '#F2F3E6', '#1E2110', '#535843', '#2A3009'],
    ['clay', '황토 공방', 'natural', 'voc adult lifelong', 'warm official', 'cool', '#8B5A2B', '#A9C8AA', '#FFFDFA', '#F5EEE5', '#261B12', '#5E5045', '#352312'],
    ['dusk', '노을 보라', 'calm', 'lifelong adult', 'clean warm senior', 'warm', '#5B4B8A', '#F2A07B', '#FCFBFE', '#F2EFF8', '#1C1828', '#545066', '#231C3D'],
    ['wellness', '숲 호흡', 'natural', 'lifelong adult', 'warm clean senior', 'warm', '#28705F', '#F6C28B', '#FCFEFD', '#EDF5F2', '#12221E', '#47584F', '#0F3029'],
    ['bigblue', '큰 글씨 파랑', 'trust', 'lifelong public', 'senior official', 'any', '#0040A8', '#FFC20E', '#FFFFFF', '#F2F6FF', '#000000', '#2F3744', '#00245E', 1],
    ['hearth', '아랫목', 'warm', 'lifelong k12', 'senior warm', 'cool', '#9A3412', '#FCD9A8', '#FFFFFF', '#FFF5EB', '#1C1009', '#433429', '#3A1406', 1],
    ['bigforest', '큰 글씨 숲', 'natural', 'lifelong public', 'senior official', 'any', '#1B5E20', '#FFD54F', '#FFFFFF', '#F1F7F1', '#000000', '#2E3A30', '#0D3311', 1],
    /* 테크 · 직업훈련 */
    ['circuit', '회로 청록', 'tech', 'voc corp adult', 'tech clean', 'warm', '#0E7490', '#5EEAD4', '#FFFFFF', '#F0F7F9', '#0A1A22', '#44565F', '#06222D'],
    ['graphite', '흑연 블루', 'tech', 'voc corp adult', 'tech clean official', 'any', '#2563EB', '#93C5FD', '#FFFFFF', '#F4F6F8', '#0B0F17', '#4B5563', '#0B1220'],
    ['volt', '볼트 그린', 'tech', 'voc adult corp', 'tech clean', 'warm', '#15803D', '#86EFAC', '#FFFFFF', '#F1F8F3', '#0B1A10', '#46574B', '#052E16'],
    ['steel', '강철 · 안전 노랑', 'tech', 'voc corp', 'tech official', 'warm', '#374151', '#FBBF24', '#FFFFFF', '#F3F4F6', '#111827', '#4B5563', '#1F2937'],
    ['safety', '공구 주황', 'vivid', 'voc', 'tech official warm', 'cool', '#B45309', '#FCD34D', '#FFFFFF', '#FFF7ED', '#1C1917', '#57534E', '#292524'],
    ['workbench', '작업대 남청', 'trust', 'voc public corp', 'official tech', 'warm', '#1D4E89', '#F4B400', '#FBFBF9', '#EFF1F4', '#141A22', '#4D5561', '#0F2744'],
    ['press', '신문 붉은 점', 'classic', 'adult univ public', 'clean premium official', 'any', '#B5122B', '#F5B7B1', '#FFFFFF', '#F4F2EE', '#121212', '#545250', '#1A1A1A']
  ];
  const mk = r => ({ id: r[0], name: r[1], mood: r[2], types: r[3].split(' '), themes: r[4].split(' '), ph: r[5], acc: r[6], acc2: r[7], bg: r[8], alt: r[9], ink: r[10], mu: r[11], dark: r[12], big: !!r[13] });

  /* ═════════ 대비 검사 ═════════ */
  function check(p) { const R = []; const add = (n, f, b, min) => R.push({ n, f, b, cr: Math.round(CR(f, b) * 100) / 100, min, ok: CR(f, b) >= min });
    add('글자/바탕', p.ink, p.bg, 7); add('글자/회색 띠', p.ink, p.alt, 7);
    add('보조 글자/바탕', p.mu, p.bg, p.big ? 7 : 4.5); add('보조 글자/회색 띠', p.mu, p.alt, p.big ? 7 : 4.5);
    add('흰 글자/강조색', '#ffffff', p.acc, 4.5); add('강조색/바탕', p.acc, p.bg, 4.5); add('강조색/회색 띠', p.acc, p.alt, 4.5);
    add('흰 글자/깊은 색면', '#ffffff', p.dark, 7); add('acc2/깊은 색면', p.acc2, p.dark, 4.5);
    const min = R.reduce((m, x) => Math.min(m, x.cr / x.min), 9);
    return { ok: R.every(x => x.ok), rows: R, min: Math.round(min * 100) / 100 }; }

  const ALL = RAW.map(mk); const list = []; const rejected = [];
  ALL.forEach(p => { const c = check(p); p.cr = c.min; (c.ok ? list : rejected).push(c.ok ? p : { id: p.id, fail: c.rows.filter(x => !x.ok).map(x => `${x.n} ${x.cr}`) }); });
  const BY = {}; list.forEach(p => { BY[p.id] = p; });
  const get = id => (id && typeof id === 'object' && id.acc) ? id : BY[String(id || '').replace(/^pal-/, '')] || null;

  /* ═════════ 고르기 ═════════ */
  const typeKey = t => t === 'univ_lms' ? 'univ' : t;
  function forType(type, mood) { const ty = typeKey(type); let L = list.filter(p => !ty || p.types.includes(ty));
    if (!L.length) L = list.slice();
    if (mood) { const m = String(mood); const key = MOODS[m] ? m : Object.keys(MOODS).find(k => MOODS[k] === m || m.indexOf(MOODS[k]) >= 0);
      const M = key ? L.filter(p => p.mood === key) : []; if (M.length) return M.concat(L.filter(p => p.mood !== key)); }
    return L; }
  /* 템플릿 색 → 같은 기관 유형 팔레트 중 색상(hue) · 명도가 가장 가까운 것. 테마가 맞으면 가산 */
  function forTpl(tp, type, theme) { if (!tp) return null; if (tp.palette && get(tp.palette)) return get(tp.palette);
    const ty = typeKey(type || (tp.types || [])[0]); const L = forType(ty); const c = ok6(tp.color) ? tp.color : null; if (!c) return L[0] || null;
    const [l0, c0, h0] = lch(c); const th = theme || tp.theme;
    const sc = p => { const [l, ch, h] = lch(p.acc); const hd = (c0 < .03 || ch < .03) ? (Math.abs(c0 - ch) * 400) : hueD(h, h0); return hd + Math.abs(l - l0) * 60 + (p.types.includes(ty) ? 0 : 40) + (th && p.themes.includes(th) ? -8 : 0) + (p.big && th !== 'senior' ? 30 : 0); };
    /* 가까운 후보(최고점 + 20 이내, 최대 3개) 중 템플릿 id로 하나를 고른다 → 같은 색 템플릿끼리도 팔레트가 갈린다 */
    const R = L.map(p => [p, sc(p)]).sort((a, b) => a[1] - b[1]); if (!R.length) return null; const near = R.filter(x => x[1] <= R[0][1] + 20).slice(0, 3);
    let hsh = 0; String(tp.id || '').split('').forEach(ch => { hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; }); return near[hsh % near.length][0]; }

  /* ═════════ 로고 색 → 팔레트 ═════════ */
  const moodOf = (C, H) => C < .04 ? 'premium' : H < 20 || H >= 330 ? 'vivid' : H < 110 ? 'warm' : H < 170 ? 'natural' : H < 265 ? 'trust' : 'vivid';
  function fromLogo(colors) { const L0 = (Array.isArray(colors) ? colors : [colors]).map(c => String(c || '').trim()).map(c => /^#[0-9a-f]{3}$/i.test(c) ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c).filter(ok6);
    if (!L0.length) return null;
    const P = L0.map((c, i) => { const [l, ch, h] = lch(c); return { c, l, ch, h, w: ch * (i === 0 ? 1.25 : 1) * (l > .96 || l < .12 ? .2 : 1) }; });
    const chroma = P.filter(x => x.ch >= .03 && x.l <= .96 && x.l >= .12).sort((a, b) => b.w - a.w);
    const mono = !chroma.length; const pr = mono ? P[0] : (chroma.includes(P[0]) ? P[0] : chroma[0]); /* 사용자가 고른 첫 색이 유채색이면 그 색이 주인공 */ const H = pr.h; const C = mono ? 0 : Math.min(pr.ch, .2);
    /* 강조색: 색상 그대로, 흰 글자 4.5:1(여유 4.7) 될 때까지 명도를 내린다 */
    let acc = mono ? '#1F1F1F' : CR('#ffffff', pr.c) >= 4.6 ? pr.c.toLowerCase() : fromLch(Math.min(pr.l, .62), C, H); /* 이미 대비가 되는 로고 색은 그대로 지킨다 */ for (let k = 0; k < 40 && CR('#ffffff', acc) < 4.7; k++) { const [l, ch] = lch(acc); acc = fromLch(l - .015, ch, H); }
    const tC = mono ? 0 : Math.min(C, .1);
    const bg = fromLch(.992, tC * .05, H), alt = fromLch(.966, tC * .16, H);
    let ink = fromLch(.2, tC * .25, H); ink = fit(ink, alt, 7.2, '#000000');
    let mu = fromLch(.47, tC * .2, H); mu = fit(fit(mu, alt, 4.7, '#000000'), bg, 4.7, '#000000');
    let dark = fromLch(.25, Math.min(C * .55, .07), H); for (let k = 0; k < 20 && CR('#ffffff', dark) < 7.2; k++) { const [l, ch] = lch(dark); dark = fromLch(l - .02, ch, H); }
    /* acc2: 둘째 로고 색(색상 차 30° 이상)이 있으면 그것을, 없으면 갈래 보색(+150°) — 깊은 색면 위에서 4.5:1 */
    /* 둘째 색이 없으면: 차가운 색(170~300°)에는 금색(80°), 그 밖에는 이웃 색(+35°). 밝은 로고 색(노랑 등)은 원래 색을 acc2로 지킨다 */
    const sec = chroma.find(x => x !== pr && hueD(x.h, H) >= 30); const keep = !sec && !mono && pr.l > .78;
    const h2 = sec ? sec.h : keep ? H : mono ? 25 : (H >= 170 && H < 300) ? 80 : (H + 35) % 360; const c2 = sec ? Math.min(Math.max(sec.ch, .08), .16) : keep ? pr.ch : (mono ? .14 : .12);
    let acc2 = keep ? pr.c : fromLch(.84, c2, h2); for (let k = 0; k < 14 && CR(acc2, dark) < 4.8; k++) { const [l, ch] = lch(acc2); acc2 = fromLch(Math.min(.97, l + .02), ch, h2); }
    let accF = fit(fit(acc, bg, 4.6, '#000000'), alt, 4.6, '#000000');
    const p = { id: 'logo-' + L0[0].slice(1).toLowerCase() + (L0[1] ? L0[1].slice(1, 4).toLowerCase() : ''), name: '로고 맞춤', mood: moodOf(C, H), types: Object.keys(TYPES), themes: [], ph: 'any', acc: accF, acc2, bg, alt, ink, mu, dark, big: false, src: L0.slice(0, 3) };
    const c = check(p); p.cr = c.min; p.ok = c.ok; return p; }

  /* ═════════ 사이트에 적용 · 읽기 ═════════ */
  function of(s) { if (!s || !s.hpPal) return null; const p = (s.hpPalX && s.hpPalX.id === s.hpPal && ok6(s.hpPalX.acc)) ? s.hpPalX : BY[s.hpPal];
    if (!p) return null; if (ok6(s.color) && s.color.toLowerCase() !== p.acc.toLowerCase()) return null; return p; }
  function apply(s, id) { if (!s) return s; const p = get(id); if (!p) { delete s.hpPal; delete s.hpPalX; return s; }
    s.hpPal = p.id; if (/^logo-/.test(p.id) || !BY[p.id]) s.hpPalX = { id: p.id, name: p.name, mood: p.mood, acc: p.acc, acc2: p.acc2, bg: p.bg, alt: p.alt, ink: p.ink, mu: p.mu, dark: p.dark, src: p.src || [] }; else delete s.hpPalX;
    s.color = p.acc; s.hpColorLock = 1; return s; }

  /* ═════════ 사진 톤 규칙 ═════════
     샘플 사진(HPSTOCK) 평균 색 · 주된 색상 · 채도(OKLCH 아님, HSV 가중 평균 — 미리 잰 값) */
  const STOCK = 'arc-01:95aabf:209:17 arc-02:577e8d:197:21 arc-03:4e868a:184:24 art-01:d4ced4:291:2 art-02:5f4e46:19:10 art-03:ead7cb:24:12 art-04:d7d2d8:285:2 art-06:aea798:39:9 brd-01:6f615e:13:7 brd-02:81857b:80:4 cam-01:7f7973:27:5 cam-02:525447:69:6 cam-03:6e8c8c:179:13 cam-04:848991:215:5 cam-05:65726b:150:5 civ-01:99a4b3:214:10 civ-02:564c37:40:12 cls-01:79756d:38:5 cls-02:a19e9e:0:2 cls-03:777071:359:3 cls-04:626e69:153:4 cod-01:646b6e:195:4 cod-02:6e7472:161:2 cod-03:9a9893:44:3 cod-04:404041:277:0 dsk-01:9c8877:28:14 dsk-02:b3afad:17:2 dsk-03:b5b2aa:45:4 dsk-04:d3b79b:30:22 dsk-05:656565:300:0 kid-01:967e5b:36:22 kid-02:ad7495:323:22 kid-03:ece5e1:22:4 kid-04:565f5b:149:3 kid-05:726957:39:10 lap-01:a3a2a4:278:1 lap-02:9c8c82:23:10 lap-03:61544e:20:8 lap-04:cccacc:309:1 lap-05:b29f95:20:12 lap-06:554833:36:13 lap-07:958d7d:39:9 lap-08:817f7f:10:1 lap-09:bbc1cb:218:6 lap-10:c1bec0:316:1 lec-01:a98d7b:23:18 lec-02:92765f:26:20 lec-03:817b7b:356:2 lib-01:7d7874:21:4 lib-02:585249:35:6 lib-03:817a6f:37:7 lib-04:6b6153:35:9 lib-05:594135:20:14 lib-06:523624:22:18 mus-01:646260:24:2 mus-02:5f6264:201:2 mus-03:666666:300:0 mus-04:7d7d7d:300:0 mus-05:999289:34:6 mus-06:8b827e:15:5 mus-07:584631:32:15 mus-08:5d5b59:28:2 nat-01:6d7259:71:10 nat-02:818370:66:7 nat-03:4a4c4b:164:1 off-01:b2b4ba:223:3 off-02:8f796a:25:14 off-03:a19d96:37:4 off-04:a7897a:20:17 off-05:90857b:29:8 off-06:8f908e:78:1 off-07:535353:300:0 sem-01:716c6c:357:2 sen-01:73727a:240:3 sen-02:7b7573:12:3 sen-03:a3a099:40:4 sen-04:776b51:41:15 stu-01:726a6b:357:3 stu-02:6b716f:160:2 voc-01:181717:11:0 wrk-01:1d252d:210:6 wrk-02:af9c84:33:17 wrk-03:b3a296:24:11 wrk-04:b98964:26:33 wrk-05:4b4a49:21:1 wrk-06:938a77:41:11 wrk-07:746865:11:6';
  /* 잰 값의 색상은 HSV 각도 → 같은 색상의 대표색(채도 · 명도 0.6)을 만들어 OKLCH 각도로 바꿔 강조색과 같은 척도로 비교한다 */
  const hsvHex = h => { const f = n => { const k = (n + h / 60) % 6; return .6 - .6 * .6 * Math.max(0, Math.min(k, 4 - k, 1)); }; return hex(f(5) * 255, f(3) * 255, f(1) * 255); };
  const PH = {}; STOCK.split(' ').forEach(x => { const [id, c, h, ch] = x.split(':'); PH[id] = { c: '#' + c, hv: +h, h: lch(hsvHex(+h))[2], ch: +ch / 100 }; });
  /* 톤 구분은 HSV 각도 기준(따뜻함 330~70 · 초록 70~170 · 차가움 170~265) */
  const toneOf = (h, ch) => ch < .06 ? 'mono' : (h >= 330 || h < 70) ? 'warm' : h < 170 ? 'green' : h < 265 ? 'cool' : 'warm';
  /* 사진 하나의 색 정보: 샘플 사진 id · 주소(img/stock/<id>.webp) · 평균 색(hex) 모두 받는다. 모르는 사진이면 null */
  function phInfo(x) { if (!x) return null; if (typeof x === 'object' && x.id) x = x.id; x = String(x);
    if (ok6(x)) { const [r, g, b] = rgb(x); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const d = mx - mn; let hv = 0;
      if (d) hv = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4); hv = (hv + 360) % 360; const c2 = mx ? d / mx * (mx / 255) : 0;
      return { c: x, h: lch(x)[2], ch: c2, tone: toneOf(hv, c2) }; }
    const m = x.match(/(?:^|\/)([a-z]{3}-\d{2})(?:-800)?(?:\.webp)?(?:[?#].*)?$/); const r = m && PH[m[1]]; return r ? { c: r.c, h: r.h, ch: r.ch, tone: toneOf(r.hv, r.ch), id: m[1] } : null; }
  /* 규칙
     R1 무채색 사진(채도 0.06 미만): 강조색을 그대로 사진 위 버튼에 쓴다.
     R2 강조색과 사진 주된 색상 차가 35° 미만이고 사진 채도 0.10 이상: 강조색이 사진에 묻힌다 → 사진 위 주 버튼은 흰 버튼(글자 ink), 작은 표시는 acc2.
     R3 따뜻한 사진(나무 · 책 · 햇빛)에는 깊은 남색 · 청록 · 녹색 계열이, 차가운 사진(유리 · 하늘 · 화면)에는 주황 · 적갈 · 금색 계열이 어울린다(forPhoto 순위).
     R4 초록 사진(자연 · 정원)에는 초록 강조색을 피하고 적갈 · 보라 · 남색을 쓴다.
     R5 스크림은 검정 대신 팔레트의 깊은 색(dark)으로 물들이고, 밝은 사진(tone light)은 아래쪽 0.82, 어두운 사진은 0.62까지 올린다. */
  function photo(x, sp) { const inf = phInfo(x); const p = sp && sp.acc ? sp : (sp ? of(sp) : null); const acc = p ? p.acc : (sp && ok6(sp.color) ? sp.color : '#1F4FA3');
    const dark = p ? p.dark : mix(acc, '#000000', .7); const acc2 = p ? p.acc2 : mix(acc, '#ffffff', .6);
    if (!inf) return { tone: 'unknown', rule: 'R1', btn: 'acc', acc, mark: acc2, scrim: al(dark, .78) };
    const [, ac, ah] = lch(acc); const near = inf.ch >= .1 && ac >= .04 && hueD(ah, inf.h) < 35;
    const light = Lm(inf.c) > .3; const scrim = al(dark, light ? .82 : .62);
    const rule = inf.tone === 'mono' ? 'R1' : near ? 'R2' : inf.tone === 'green' ? 'R4' : 'R3';
    return { tone: inf.tone, hue: inf.h, chroma: inf.ch, rule, btn: near ? 'light' : 'acc', acc, mark: near ? acc2 : acc, scrim, avg: inf.c }; }
  const GOOD = { warm: [190, 275], cool: [25, 85], green: [300, 40], mono: null }; /* 강조색 OKLCH 색상 범위 */
  function forPhoto(x, type) { const inf = phInfo(x); const L = forType(type); if (!inf) return L;
    const sc = p => { const [, ch, h] = lch(p.acc); let s = 0; if (p.ph === inf.tone) s += 3; else if (p.ph === 'any') s += 1;
      const g = GOOD[inf.tone]; if (g && ch >= .04) { const [a, b] = g; const inR = a < b ? (h >= a && h <= b) : (h >= a || h <= b); if (inR) s += 2; }
      if (inf.ch >= .1 && ch >= .04 && hueD(h, inf.h) < 35) s -= 3; return s; };
    return L.map((p, i) => [p, sc(p), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]); }

  /* ═════════ 토큰 덮어쓰기(HPT.tokens) ═════════ */
  function over(T, p) { if (!T || !p) return T; const a = p.acc; const R = Object.assign({}, T);
    R.pal = p.id; R.a = a; R.on = '#ffffff'; R.a2 = p.acc2; R.dk = p.dark; R.bg = p.bg; R.alt = p.alt; R.ink = p.ink; R.mu = p.mu;
    R.as = mix(a, p.bg, .9); R.as2 = mix(a, p.bg, .8); R.at = fit(fit(fit(a, R.as2, 4.6), p.alt, 4.6), p.bg, 4.6); R.at2 = R.at;
    let hd = p.dark, hdHi = mix(mix(hd, a, .34), '#ffffff', .12); for (let k = 0; k < 12 && CR('#ffffff', hdHi) < 4.6; k++) { hd = mix(hd, '#000000', .25); hdHi = mix(mix(hd, a, .34), '#ffffff', .12); }
    R.hd = hd; R.hdHi = hdHi;
    R.L = { hi: p.ink, hm: fit(p.mu, R.as, 4.6), ha: fit(a, R.as2, 4.6), hy: fit(a, R.as, 4.8) };
    R.D = { hi: '#ffffff', hm: fit(mix(p.dark, '#ffffff', .82), hdHi, 4.6, '#ffffff'), ha: fit(p.acc2, hdHi, 4.6, '#ffffff'), hy: fit(mix(p.acc2, '#ffffff', .3), hdHi, 4.8, '#ffffff') };
    let hbB = p.dark, hbB2 = mix(p.dark, a, .45), hbHi = mix(hbB2, '#ffffff', .14); for (let k = 0; k < 20 && CR('#ffffff', hbHi) < 4.6; k++) { hbB2 = mix(hbB2, '#000000', .1); hbHi = mix(hbB2, '#ffffff', .14); }
    R.hbB = hbB; R.hbB2 = hbB2; R.hbHi = hbHi;
    R.B = { hi: '#ffffff', hm: fit(mix(p.dark, '#ffffff', .84), hbHi, 4.6, '#ffffff'), ha: fit(p.acc2, hbHi, 4.6, '#ffffff'), hy: fit(mix(p.acc2, '#ffffff', .25), hbHi, 4.8, '#ffffff') };
    if (T.def === 'band') { R.hb = hbB; R.hm = R.B.hm; R.ha = R.B.ha; }
    if (T.def === 'dark') { R.hb = hd; R.hm = R.D.hm; R.ha = R.D.ha; } else if (T.def === 'light') { R.hb = p.bg; R.hi = R.L.hi; R.hm = R.L.hm; R.ha = R.L.ha; }
    let cH = mix(p.dark, a, .3); for (let k = 0; k < 10 && CR('#ffffff', cH) < 4.8; k++) cH = mix(cH, '#000000', .15); R.ctaA = p.dark; R.ctaB = cH;
    return R; }
  function palCSS(s, T) { const p = of(s); if (!p || !T) return ''; const Q = over(T, p);
    const mk0 = mix(Q.as, p.acc2, .4); const markA = CR(Q.L.ha, mk0) >= 4.5 ? .4 : CR(Q.L.ha, mix(Q.as, p.acc2, .25)) >= 4.5 ? .25 : 0;
    const eyC = fit(p.acc2, Q.ctaB, 4.6, '#ffffff');
    return `.hpt{--a:${Q.a};--on:#fff;--bg:${Q.bg};--alt:${Q.alt};--ink:${Q.ink};--mu:${Q.mu};--at:${Q.at};--at2:${Q.at2};--as:${Q.as};--as2:${Q.as2};--a2:${p.acc2};--dk:${p.dark};color:var(--ink);background:var(--bg)}
.hpt.hp-b-light,.hp-b-light{background:${Q.bg};--hi:${Q.L.hi};--hm:${Q.L.hm};--ha:${Q.L.ha};--hy:${Q.L.hy};--hyb:${Q.as}}.hp-b-light.hp-l-c{background:linear-gradient(180deg,${Q.as} 0%,${Q.bg} 100%)}
.hpt.hp-b-dark,.hp-b-dark{background:${Q.hd};--hm:${Q.D.hm};--ha:${Q.D.ha};--hy:${Q.D.hy}}.hpt.hp-b-band,.hp-b-band{background:linear-gradient(120deg,${Q.hbB},${Q.hbB2});--hm:${Q.B.hm};--ha:${Q.B.ha};--hy:${Q.B.hy}}.hpt .hp-cm span{background:${Q.alt}}
${markA ? `.hpt.hp-b-light h1 em{background:linear-gradient(transparent 70%,${al(p.acc2, markA)} 70%)}` : ''}
.hpt .hp-ctab{background:linear-gradient(120deg,${Q.ctaA},${Q.ctaB})}.hpt .hp-ctat .hp-ey{color:${eyC}}.hpt .hp-ctab::after{background:${al(p.acc2, .1)}}
.hpt .hp-fl b{color:${Q.at}}.hpt .hp-tag{color:${Q.at};background:${Q.as}}
body{background:${Q.bg}}`; }

  /* ═════════ 기존 함수 감싸기 ═════════ */
  const H = window.HPT;
  if (H && typeof H.apply === 'function') {
    { const base = H.apply; H.apply = (s, id, opt) => { opt = opt || {}; const pal = opt.palette ? get(opt.palette) : null;
        const prev = s ? of(s) : null; const prevId = s && s.hpPal; const prevX = s && s.hpPalX;
        const r = base(s, id, pal ? Object.assign({}, opt, { color: pal.acc }) : opt) || s; if (!r) return r;
        if (pal) apply(r, pal);
        else if (opt.color && ok6(opt.color)) { if (!(prev && opt.color.toLowerCase() === prev.acc.toLowerCase())) { delete r.hpPal; delete r.hpPalX; } }
        else if (opt.force) { delete r.hpPal; delete r.hpPalX; }
        else if (prev && prevId) { r.hpPal = prevId; if (prevX) r.hpPalX = prevX; r.color = prev.acc; r.hpColorLock = 1; }
        return r; }; }
    if (typeof H.tokens === 'function') { const base = H.tokens; H.tokens = s => { const T = base(s); try { const p = of(s); return p && T ? over(T, p) : T; } catch (e) { console.error('HPC tokens', e); return T; } }; }
    if (typeof H.audit === 'function') { const base = H.audit; H.audit = s => { const R = base(s) || []; try { const p = of(s); const T = p && H.tokens(s); if (!p || !T) return R;
        /* 팔레트가 바꾼 자리는 팔레트 값으로 다시 잰다(기본 행 중 바탕 · 글자가 바뀌는 행은 덮어씀) */
        const add = (n, f, b) => R.push([n, f, b, Math.round(CR(f, b) * 100) / 100]);
        add('팔레트 글자/바탕', T.ink, T.bg); add('팔레트 글자/회색 띠', T.ink, T.alt); add('팔레트 보조 글자/바탕', T.mu, T.bg); add('팔레트 보조 글자/회색 띠', T.mu, T.alt);
        add('팔레트 섹션 라벨', T.at, T.bg); add('팔레트 섹션 라벨(회색 띠)', T.at, T.alt); add('팔레트 주 버튼', '#ffffff', T.a);
        add('팔레트 밝은 첫 화면 설명', T.L.hm, T.as); add('팔레트 밝은 첫 화면 강조', T.L.ha, T.as2); add('팔레트 어두운 첫 화면 강조', T.D.ha, T.hdHi); add('팔레트 어두운 첫 화면 설명', T.D.hm, T.hdHi);
        add('팔레트 문의 띠 글자', '#ffffff', T.ctaB); add('팔레트 띠 첫 화면 강조', T.B.ha, T.hbHi); add('팔레트 띠 첫 화면 설명', T.B.hm, T.hbHi); } catch (e) { console.error('HPC audit', e); } return R; }; }
  }
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); try { if (!s || !of(s) || !window.HPT || !HPT.tokens) return h; const T = HPT.tokens(s); const c = palCSS(s, T); return c ? h.replace('</style>', c + '</style>') : h; } catch (e) { console.error('HPC siteHTML', e); return h; } }; window.siteHTML = siteHTML; }
  /* 템플릿 색 → 팔레트: tpl-d · tpl-<유형>의 siteFromTpl 감싸기가 모두 끝난 뒤 가장 바깥에서 한 번 감싼다(이미 hpPal이 있으면 그대로) */
  const wrapTpl = () => { if (typeof siteFromTpl !== 'function' || siteFromTpl.hpc) return; const base = siteFromTpl;
    const f = tp => { const s = base(tp); try { if (s && tp && !s.hpPal && tp.noPalette !== true) { const ty = (typeof S !== 'undefined' && S && S.org) ? S.org.type : (tp.types || [])[0]; const p = forTpl(tp, ty, s.theme); if (p) { if (window.HPT && s.theme && HPT.has && HPT.has(s.theme)) HPT.apply(s, s.theme, { palette: p.id }); else apply(s, p); } } } catch (e) { console.error('HPC siteFromTpl', e); } return s; };
    f.hpc = 1; siteFromTpl = f; window.siteFromTpl = f; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapTpl); else setTimeout(wrapTpl, 0);

  /* ═════════ 견본 시트(스튜디오 · 문서용) ═════════ */
  function sheetHTML(L) { L = L || list; const by = {}; L.forEach(p => { (by[p.mood] = by[p.mood] || []).push(p); });
    const card = p => { const c = check(p); const lo = c.rows.reduce((m, x) => x.cr < m.cr ? x : m, c.rows[0]);
      return `<article class="hpc-c"><div class="hpc-sw" style="background:${p.bg}"><div class="hpc-hd" style="background:${p.dark}"><b style="color:#fff">${esc2(p.name)}</b><span style="color:${p.acc2}">강조 acc2</span></div><div class="hpc-bd" style="background:${p.bg};color:${p.ink}"><p class="hpc-t">수강 신청 안내</p><p style="color:${p.mu}">보조 글자 · 접수 기간 11.10 ~ 11.24</p><p><span class="hpc-b" style="background:${p.acc};color:#fff">신청하기</span><span class="hpc-l" style="color:${p.acc}">자세히 보기</span></p></div><div class="hpc-alt" style="background:${p.alt};color:${p.mu}">회색 띠 · ${p.alt}</div></div>
<div class="hpc-chips">${['acc', 'acc2', 'bg', 'alt', 'ink', 'mu', 'dark'].map(k => `<i title="${k} ${p[k]}" style="background:${p[k]}"></i>`).join('')}</div><p class="hpc-m"><b>${esc2(p.id)}</b> · ${p.types.map(t => TYPES[t] ? t : '').join(' ')}${p.big ? ' · 큰 글씨' : ''}<br>최소 여유 ×${c.min} (${esc2(lo.n)} ${lo.cr}:1)</p></article>`; };
    return Object.keys(MOODS).filter(m => by[m]).map(m => `<section class="hpc-g"><h3>${MOODS[m]} <small>${by[m].length}종</small></h3><div class="hpc-grid">${by[m].map(card).join('')}</div></section>`).join(''); }
  const esc2 = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  window.HPC = { list, get, forType, forTpl, fromLogo, apply, of, photo, forPhoto, check, tokens: over, css: palCSS, MOODS, TYPES, rejected, sheetHTML, lch, fromLch, CR };
})();
