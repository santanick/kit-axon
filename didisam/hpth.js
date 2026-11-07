/* v34.2 hpth — 홈페이지 테마 · 렌더러(디자이너가 만든 것 같은 첫인상)
   대표님(2026-11-08): "홈페이지 빌드 부분도 AI로 높은 퀄리티의 홈페이지를 정말 쉽게 만들 수 있게 해줘. 지금보다 더."
   - 테마 8종: 색 · 글자 크기 단계 · 여백 · 모서리 · 카드 · 버튼 · 첫 화면 배치(좌우 분할 / 어두운 배경 / 띠 배너 / 가운데)를 정한다.
   - 첫 화면 시각 요소: 실제 공개 강좌로 그린 '강좌 카드 목업' 또는 테마별 SVG 일러스트(외부 이미지 · 폰트 없음, CSP 유지).
   - 섹션: 숫자(실제 데이터에서만 · 그릴 때마다 다시 셈) · FAQ(설정값으로) · 강사(등록된 강사만) · 문의 띠(채워진 연락처만) ·
     공지 · 후기 · 오시는 길은 내용이 없으면 숨긴다(화면에서 바로 고치기 중에는 자리 안내를 보여 준다).
   - 칸 수는 내용 수에 맞춘다(3개면 3칸) · 섹션 여백 72px(휴대폰 44px) · 대비 4.5:1 이상(포인트색은 자동 보정).
   - 게시된 학습자 홈은 이 HTML · CSS를 그대로 Shadow DOM에 넣는다(sitemerge smHp) → 스튜디오 미리보기와 같은 결과.
   데이터: S.site.theme = 테마 id(없으면 기존 look 렌더러 그대로), 섹션 data.hpt = 'facts' | 'faq' | 'people'(이 모듈이 넣은 섹션 표시)
   인터페이스: window.HPT = { list, apply(site, id, opt), thumb(site, id), pick(type, ed, brief), enrich(site), facts(), css(site) } */
'use strict';
(() => {
  if (typeof siteHTML !== 'function' || typeof proSec !== 'function') return;
  /* ── 테마 ── */
  const TH = {
    clean: { name: '모던 클린', desc: '흰 바탕 · 또렷한 포인트색 · 실제 강좌 카드로 꾸민 좌우 분할 첫 화면', acc: '#4F46E5', bg: '#FFFFFF', alt: '#F5F6FA', ink: '#111827', mu: '#4B5263', r: 16, br: 12, hero: 'split', vis: 'mock', illu: 'book', card: 'shadow', look: 'mintSoft', sw2: '#EEF0FF' },
    premium: { name: '프리미엄 다크', desc: '짙은 남색 첫 화면 · 금빛 포인트 · 여백이 넉넉한 고급스러운 분위기', acc: '#C8A15A', bg: '#FFFFFF', alt: '#F7F5F0', ink: '#14161F', mu: '#4F525C', r: 10, br: 6, hero: 'dark', hb: '#0B1022', vis: 'mock', illu: 'book', lux: 1, card: 'line', look: 'navyGlow', sw2: '#0B1022' },
    warm: { name: '따뜻한 학원', desc: '크림색 바탕 · 둥근 카드 · 책과 연필 일러스트로 친근하게', acc: '#E0582E', bg: '#FFFBF5', alt: '#FFF1E2', ink: '#2B1D14', mu: '#5E4D42', r: 24, br: 999, hero: 'split', vis: 'illu', illu: 'book', card: 'flat', look: 'brandBold', sw2: '#FFF1E2' },
    official: { name: '공식 기관', desc: '단정한 남색 띠 배너 · 각진 카드 · 바로가기 중심의 신뢰감 있는 배치', acc: '#1D4ED8', bg: '#FFFFFF', alt: '#F3F5F9', ink: '#0F172A', mu: '#475063', r: 6, br: 6, hero: 'band', vis: 'illu', illu: 'doc', card: 'line', look: 'publicTiles', sw2: '#0F2A6B' },
    tech: { name: '테크', desc: '어두운 격자 배경 · 코드 창 일러스트 · 선명한 청록 포인트', acc: '#0891B2', bg: '#FFFFFF', alt: '#F2F6F9', ink: '#0B1220', mu: '#47505F', r: 12, br: 10, hero: 'dark', hb: '#07111F', vis: 'illu', illu: 'tech', card: 'line', look: 'corpPortal', sw2: '#07111F' },
    kids: { name: '키즈 컬러풀', desc: '밝은 색 · 아주 둥근 모서리 · 블록과 별 도형으로 즐겁게', acc: '#7C3AED', bg: '#FFFFFF', alt: '#F6F2FF', ink: '#1E1533', mu: '#544A66', r: 28, br: 999, hero: 'center', vis: 'illu', illu: 'kids', card: 'flat', look: 'brandBold', sw2: '#FFD25E' },
    campus: { name: '캠퍼스', desc: '차분한 학교 색 · 건물 일러스트 · 소식과 바로가기를 정돈한 배치', acc: '#14532D', bg: '#FBFAF6', alt: '#F1EFE7', ink: '#18201B', mu: '#4D554F', r: 8, br: 8, hero: 'band', vis: 'illu', illu: 'campus', card: 'line', look: 'campus', sw2: '#E9E4D4' },
    senior: { name: '큰 글씨', desc: '큰 글씨 · 높은 대비 · 누르기 쉬운 큰 버튼(평생학습 · 어르신)', acc: '#1D4ED8', bg: '#FFFFFF', alt: '#F1F5FF', ink: '#0B1220', mu: '#3B4252', r: 14, br: 14, hero: 'split', vis: 'illu', illu: 'senior', card: 'line', look: 'senior', sw2: '#FFE7A8', big: 1 }
  };
  const IDS = Object.keys(TH);
  const TYPE_TH = { adult: 'clean', k12: 'warm', univ: 'campus', univ_lms: 'campus', corp: 'tech', public: 'official', lifelong: 'senior', voc: 'official' };
  const thOf = s => (s && s.theme && TH[s.theme]) ? TH[s.theme] : null;
  const pick = (type, ed, brief) => { const b = String(brief || '');
    if (/고급|프리미엄|럭셔리|품격|명품/.test(b)) return 'premium';
    if (/유아|어린이|초등|키즈|아이들|놀이/.test(b)) return 'kids';
    if (/큰\s*글씨|어르신|시니어|노인|어르신들/.test(b)) return 'senior';
    if (/테크|개발|코딩|프로그래밍|IT\b|데이터|AI\s*교육/i.test(b) && type !== 'k12') return 'tech';
    if (/따뜻|친근|아늑/.test(b)) return 'warm';
    if (/공공|관공서|공식/.test(b)) return 'official';
    return TYPE_TH[type === 'univ' && ed === 'lms' ? 'univ_lms' : type] || 'clean'; };

  /* ── 색 · 대비 ── */
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const rgb = h => { h = String(h); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  const Lm = h => { const c = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - w) + B[i] * w).toString(16).padStart(2, '0')).join(''); };
  const fit = (c, bg, min, to) => { min = min || 4.5; to = to || (Lm(bg) > .35 ? '#000000' : '#ffffff'); let x = c; for (let k = 1; k <= 20 && CR(x, bg) < min; k++) x = mix(c, to, k * .05); return x; };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  function tok(s, th) {
    let a = ok6(s && s.color) ? s.color : th.acc; const ink = th.ink;
    let on = '#ffffff'; if (CR(a, '#ffffff') < 4.5) { if (CR(a, ink) >= 4.5 && Lm(a) > .3) on = ink; else a = fit(a, '#ffffff', 4.6, '#000000'); }
    const hb = th.hero === 'dark' ? th.hb : th.hero === 'band' ? mix(th.acc === a ? a : a, '#000000', th.illu === 'campus' ? .35 : .45) : th.bg;
    const darkHero = th.hero === 'dark' || th.hero === 'band';
    return { a, on, ink, mu: th.mu, bg: th.bg, alt: th.alt, at: fit(a, th.bg, 4.6), at2: fit(a, th.alt, 4.6), as: mix(a, '#ffffff', .9), as2: mix(a, '#ffffff', .78), hb, hi: darkHero ? '#ffffff' : ink, hm: darkHero ? 'rgba(255,255,255,.8)' : th.mu, ha: darkHero ? fit(mix(a, '#ffffff', th.hero === 'band' ? .62 : .25), hb, 4.6, '#ffffff') : fit(a, th.bg, 4.6), dark: darkHero };
  }

  /* ── 공통 ── */
  const IC = { play: 'M7 4.5l12 7.5-12 7.5z', tool: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z', chat: 'M4 5h16v11H9l-5 4z', award: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.5 14L7 21l5-3 5 3-1.5-7', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a7 7 0 0114 0v1M16 3.5a4 4 0 010 7.5M22 21v-1a6 6 0 00-4-5.6', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z', chart: 'M4 20V10M10 20V4M16 20v-7M2 20h20', board: 'M3 4h18v12H3zM8 20l4-4 4 4', check: 'M20 12a8 8 0 11-16 0 8 8 0 0116 0zM8 12l3 3 5-6', brief: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18', card: 'M3 6h18v12H3zM3 10h18M7 15h4', type: 'M4 7V4h16v3M12 4v16M8 20h8', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7', pin: 'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', mail: 'M3 5h18v14H3zM3 6l9 7 9-7', arrow: 'M5 12h14M13 6l6 6-6 6', home: 'M3 11l9-8 9 8M5 10v10h14V10', heart: 'M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', user: 'M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM4 21a8 8 0 0116 0' };
  const svg = (k, n = 22, w = 1.8) => `<svg viewBox="0 0 24 24" width="${n}" height="${n}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k] || IC.check}"/></svg>`;
  const KW = [[/영상|강의|동영상|재생/, 'play'], [/실습|손으로|도구|기술|훈련/, 'tool'], [/질문|답변|상담|소통|문의/, 'chat'], [/수료|이수|배지|인증|자격|증명/, 'award'], [/일정|기간|개강|모집|신청/, 'cal'], [/리더|함께|팀|보호자|가족|사람|강사/, 'users'], [/법정|의무|보안|안전|신뢰/, 'shield'], [/AI|디지털|인공지능|자동/i, 'spark'], [/기록|성적|분석|리포트|데이터|엑셀/, 'chart'], [/반별|수업|교과|과목|노션/, 'board'], [/테스트|시험|평가|확인/, 'check'], [/취업|직무|업무|직장|커리어|이력서/, 'brief'], [/국비|카드|결제|수강료/, 'card'], [/큰\s*글씨|읽기 쉬운/, 'type'], [/시간|짧은|바쁜/, 'clock'], [/교재|책|인문|독서|국어|문화/, 'book'], [/생활|일상|건강|마음/, 'heart'], [/공지|알림/, 'bell']];
  const icOf = (txt, k) => { const s = String(txt || ''); const hit = KW.find(([re]) => re.test(s)); return hit ? hit[1] : ['spark', 'board', 'award', 'chat', 'chart', 'users'][k % 6]; };
  const E = v => esc(v == null ? '' : v);
  const br = v => E(v).replace(/\n/g, '<br>');
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE.map;
  const pubAll = () => (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료');
  const pub = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };
  const dot = d => String(d || '').replace(/-/g, '.');
  const perOf = c => c.period && c.period.mode === 'days' && +c.period.days ? `신청일부터 ${+c.period.days}일` : (c.start || c.end) ? [dot(c.start), dot(c.end)].filter(Boolean).join(' ~ ') : '';
  const lesOf = c => (c.curriculum || []).length;
  const priceOf = c => +c.price ? won(c.price) : '무료';
  const linkHref = v => !v ? '' : v.startsWith('learn:') ? '#p-' + ({ home: 'home', shop: 'm-class', textbooks: 'm-book', comm: 'm-community', notice: 'm-notice' }[v.slice(6)] || 'home') : v.startsWith('page:') ? '#p-' + v.slice(5) : v.startsWith('cls:') ? '#p-c-' + v.slice(4) : v.startsWith('url:') ? (typeof safeURL === 'function' ? safeURL(v.slice(4)) : '') : '';
  const aAttr = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const menuOf = (s, kind) => (s.menus || []).find(m => m.kind === kind && m.on !== false);
  const clsHref = s => { const m = menuOf(s, 'class'); return m ? '#p-m-' + m.id : (pub()[0] ? '#p-c-' + pub()[0].id : ''); };
  const ft = () => (S.settings && S.settings.footer) || {};
  function contact(s) { const f = ft(); const L = [];
    if (f.tel && !isPh(f.tel)) L.push({ ic: 'phone', k: '전화', v: f.tel, h: 'tel:' + String(f.tel).replace(/[^\d+]/g, '') });
    if (f.email && !isPh(f.email) && /@/.test(f.email)) L.push({ ic: 'mail', k: '이메일', v: f.email, h: 'mailto:' + f.email });
    if (f.addr && !isPh(f.addr)) L.push({ ic: 'pin', k: '주소', v: f.addr, h: '' });
    return L; }
  const askHref = s => { const c = contact(s).find(x => x.h); if (c) return c.h; const m = menuOf(s, 'community') || menuOf(s, 'board'); return m ? '#p-m-' + m.id : ''; };

  /* ── 실제 데이터로 셈한 숫자(지어내지 않음) ── */
  function facts() { const C = pub(); const out = []; if (!C.length) return out;
    if (C.length >= 2) out.push({ v: String(C.length), u: '개', l: `공개 ${t('cls')}` });
    const les = C.reduce((a, c) => a + lesOf(c), 0); if (les >= C.length) out.push({ v: String(les), u: '차시', l: '전체 학습 차시' });
    const hrs = C.reduce((a, c) => a + (+c.hours || 0), 0); if (hrs >= 1) out.push({ v: String(Math.round(hrs)), u: '시간', l: '전체 학습 시간' });
    const crt = C.filter(c => c.cert === 'auto' || c.cert === 'manual').length; if (crt) out.push({ v: crt === C.length ? '전 과정' : String(crt), u: crt === C.length ? '' : '개', l: '수료증 발급' });
    const tch = new Set(C.flatMap(c => (c.intro || []).map(x => String(x.name || '').trim()).filter(Boolean))); if (tch.size >= 2) out.push({ v: String(tch.size), u: '명', l: '강사진' });
    const free = C.filter(c => !+c.price).length; if (free && out.length < 4) out.push({ v: String(free), u: '개', l: `무료 ${t('cls')}` });
    return out.slice(0, 4); }
  /* 첫 화면 신뢰 표시: 설정 · 강좌에서 사실인 것만(숫자는 아래 숫자 띠에서) */
  function badges() { const C = pub(); const B = [];
    if (C.some(c => c.cert === 'auto' || c.cert === 'manual')) B.push('수료증 발급');
    if (S.settings && S.settings.pg === 'toss' && S.settings.toss && S.settings.toss.status === '승인' && C.some(c => +c.price)) B.push('온라인 결제');
    if (C.some(c => !+c.price)) B.push(`무료 ${t('cls')} 있음`);
    if (C.some(c => c.period && c.period.mode === 'days')) B.push('신청 즉시 수강');
    if (C.length) B.push('PC · 휴대폰 수강');
    return B.slice(0, 3); }
  function people() { const seen = new Set(); const L = [];
    pub().forEach(c => (c.intro || []).forEach(x => { const n = String(x.name || '').trim(); const b = String(x.bio || '').trim(); if (!n || !b || seen.has(n)) return; seen.add(n); L.push([n, b.slice(0, 120)]); }));
    return L.slice(0, 4); }
  function faq() { const C = pub(); const Q = []; const cl = t('cls');
    if (C.length) { const P = [...new Set(C.map(perOf).filter(Boolean))]; const days = [...new Set(C.filter(c => c.period && c.period.mode === 'days').map(c => +c.period.days))];
      Q.push(['수강 기간은 얼마나 되나요?', days.length === 1 && P.length === 1 ? `신청한 날부터 ${days[0]}일 동안 수강할 수 있습니다.` : P.length === 1 ? `${P[0]} 동안 수강합니다.` : `${cl}마다 다릅니다. 각 ${cl} 안내에서 수강 기간을 확인할 수 있습니다(예: ${C[0].name} — ${perOf(C[0])}).`]); }
    const cert = C.filter(c => c.cert === 'auto' && c.criteria && +c.criteria.threshold); if (cert.length) { const th = [...new Set(cert.map(c => +c.criteria.threshold))].sort((a, b) => a - b);
      Q.push(['수료증은 어떻게 받나요?', `진도 · 시험 · 과제를 합산해 ${th.length === 1 ? th[0] + '점' : th[0] + '~' + th[th.length - 1] + '점'} 이상이 되면 수료증이 자동으로 발급됩니다.`]); }
    else if (C.some(c => c.cert === 'manual')) Q.push(['수료증은 어떻게 받나요?', '수료 기준을 채우면 운영자가 확인한 뒤 수료증을 발급합니다.']);
    const pg = S.settings && S.settings.pg === 'toss' && S.settings.toss && S.settings.toss.status === '승인';
    if (pg && C.some(c => +c.price)) Q.push(['결제와 환불은 어떻게 하나요?', '수강 신청 화면에서 온라인으로 결제합니다. 환불은 로그인 후 내 결제 내역에서 신청하며, 이용약관의 환불 규정을 따릅니다.']);
    if (C.length && C.every(c => !+c.price)) Q.push([`수강료가 있나요?`, `지금 공개된 ${cl}은 모두 무료입니다.`]);
    return Q.slice(0, 4); }

  /* ── 시각 요소: 강좌 카드 목업 · SVG 일러스트 ── */
  function cover(c, k, th, T, big) { const pal = [T.a, mix(T.a, '#0EA5E9', .45), mix(T.a, '#F59E0B', .4), mix(T.a, '#10B981', .45)];
    const b1 = th.hero === 'dark' ? mix(th.hb, T.a, .25 + .08 * (k % 3)) : th.illu === 'kids' ? ['#7C3AED', '#F59E0B', '#10B981', '#EC4899'][k % 4] : pal[k % pal.length];
    const b2 = mix(b1, '#ffffff', th.illu === 'kids' ? .3 : .22); const fg = CR(b1, '#ffffff') >= 3 ? '#ffffff' : '#111827';
    const deco = th.illu === 'tech' ? `<path d="M0 30h400M0 70h400M0 110h400M0 150h400M60 0v200M140 0v200M220 0v200M300 0v200" stroke="${al('#ffffff', .1)}"/><circle cx="300" cy="70" r="5" fill="${al('#ffffff', .6)}"/><circle cx="220" cy="110" r="5" fill="${al('#ffffff', .6)}"/><path d="M220 110L300 70" stroke="${al('#ffffff', .5)}" stroke-width="2"/>`
      : th.illu === 'kids' ? `<circle cx="330" cy="30" r="56" fill="${al('#ffffff', .22)}"/><rect x="250" y="120" width="60" height="60" rx="14" fill="${al('#ffffff', .2)}" transform="rotate(14 280 150)"/><path d="M60 30l8 16 18 3-13 12 3 18-16-9-16 9 3-18-13-12 18-3z" fill="${al('#ffffff', .3)}"/>`
      : th.illu === 'doc' || th.illu === 'campus' ? `<path d="M240 0L400 160V0z" fill="${al('#ffffff', .12)}"/><path d="M300 0L400 100V0z" fill="${al('#ffffff', .12)}"/>`
      : `<circle cx="340" cy="20" r="90" fill="${al('#ffffff', .16)}"/><circle cx="280" cy="170" r="50" fill="${al('#ffffff', .12)}"/>`;
    return `<div class="hp-cov" style="background:linear-gradient(135deg,${b1},${b2});color:${fg}"><svg class="hp-cdeco" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${deco}</svg><span class="hp-cic">${svg(icOf(c.name, k), big ? 30 : 24)}</span><span class="hp-ckd">${E(KINDN(c))}</span></div>`; }
  const KINDN = c => ({ live: 'LIVE', offline: 'OFFLINE', blend: 'BLENDED', sub: 'SUBSCRIPTION', pack: 'PACKAGE' })[c.kind] || 'ONLINE';
  function mock(s, th, T) { const C = pub().slice(0, 2); if (!C.length) return '';
    const f = facts(); const c0 = C[0]; const meta = [perOf(c0), lesOf(c0) ? `${lesOf(c0)}차시` : ''].filter(Boolean);
    const back = C[1] ? `<div class="hp-mc hp-mb">${cover(C[1], 1, th, T)}<div class="hp-mcb"><b>${E(C[1].name)}</b><i class="hp-ln"></i><i class="hp-ln s"></i></div></div>` : '';
    const chips = [c0.cert === 'auto' || c0.cert === 'manual' ? `${svg('award', 15, 2)} 수료증 발급` : '', f[0] ? `${svg('grid', 15, 2)} ${f[0].l} ${f[0].v}${f[0].u}` : ''].filter(Boolean);
    return `<div class="hp-vis hp-mock" aria-hidden="true">${back}<div class="hp-mc hp-mf">${cover(c0, 0, th, T, 1)}<div class="hp-mcb"><b>${E(c0.name)}</b>${meta.length ? `<small>${E(meta.join(' · '))}</small>` : ''}<div class="hp-mbar"><i></i></div><div class="hp-mrow"><strong>${E(priceOf(c0))}</strong><span class="hp-mbtn">수강 신청</span></div></div></div>${chips.map((c, k) => `<span class="hp-chip c${k + 1}">${c}</span>`).join('')}</div>`; }
  function illu(s, th, T) { const a = T.a, a2 = mix(T.a, '#ffffff', .55), a3 = mix(T.a, '#ffffff', .85), Y = '#FFC94D', M = '#4FD1B0', P = '#FF8A7A'; let g = '';
    const C = pub();
    if (th.illu === 'book') g = `<ellipse cx="240" cy="300" rx="200" ry="16" fill="${al(a, .1)}"/><rect x="70" y="200" width="200" height="34" rx="8" fill="${a}"/><rect x="84" y="166" width="184" height="34" rx="8" fill="${Y}"/><rect x="62" y="234" width="220" height="40" rx="8" fill="${M}"/><path d="M96 183h120M80 254h150" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/><path d="M250 120c40-22 90-22 130 0v150c-40-22-90-22-130 0z" fill="#fff" stroke="${a}" stroke-width="5" stroke-linejoin="round"/><path d="M380 120c40-22 50-22 60-16v150c-10-6-20-6-60 16" fill="${a3}" stroke="${a}" stroke-width="5" stroke-linejoin="round"/><path d="M272 150h84M272 172h84M272 194h60" stroke="${a2}" stroke-width="6" stroke-linecap="round"/><rect x="388" y="40" width="20" height="120" rx="4" fill="${P}" transform="rotate(28 398 100)"/><path d="M420 150l-14 26-8-30z" fill="#2B1D14" transform="rotate(0)"/><path d="M110 60l8 18 20 3-15 13 4 20-17-10-17 10 4-20-15-13 20-3z" fill="${Y}"/><circle cx="430" cy="250" r="12" fill="${a2}"/><circle cx="40" cy="140" r="8" fill="${M}"/>`;
    else if (th.illu === 'kids') g = `<path d="M60 280a180 180 0 01360 0" fill="none" stroke="${P}" stroke-width="22"/><path d="M90 280a150 150 0 01300 0" fill="none" stroke="${Y}" stroke-width="22"/><path d="M120 280a120 120 0 01240 0" fill="none" stroke="${M}" stroke-width="22"/><rect x="150" y="196" width="76" height="76" rx="16" fill="${a}"/><text x="188" y="248" text-anchor="middle" font-size="40" font-weight="800" fill="#fff" font-family="Pretendard,sans-serif">A</text><rect x="232" y="206" width="66" height="66" rx="16" fill="${Y}"/><text x="265" y="252" text-anchor="middle" font-size="34" font-weight="800" fill="#1E1533" font-family="Pretendard,sans-serif">B</text><rect x="196" y="132" width="66" height="66" rx="16" fill="${M}" transform="rotate(-8 229 165)"/><text x="229" y="178" text-anchor="middle" font-size="34" font-weight="800" fill="#1E1533" font-family="Pretendard,sans-serif">C</text><path d="M392 70l10 22 24 4-18 16 4 24-20-12-20 12 4-24-18-16 24-4z" fill="${Y}"/><circle cx="74" cy="90" r="22" fill="${a2}"/><circle cx="420" cy="200" r="12" fill="${P}"/><path d="M40 200q20-20 40 0t40 0" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="round"/><ellipse cx="240" cy="290" rx="210" ry="10" fill="${al(a, .12)}"/>`;
    else if (th.illu === 'campus') g = `<ellipse cx="240" cy="296" rx="220" ry="14" fill="${al(a, .14)}"/><path d="M90 130L240 60l150 70z" fill="${a}"/><rect x="100" y="130" width="280" height="18" fill="${mix(a, '#000', .2)}"/><g fill="#fff" stroke="${a}" stroke-width="4">${[0, 1, 2, 3, 4].map(k => `<rect x="${118 + k * 54}" y="154" width="28" height="112" rx="3"/>`).join('')}</g><rect x="90" y="266" width="300" height="22" fill="${mix(a, '#000', .2)}"/><circle cx="240" cy="104" r="14" fill="#fff"/><path d="M240 96v8l6 4" stroke="${a}" stroke-width="3" stroke-linecap="round"/><path d="M380 70l40-16 40 16-40 16z" fill="#1F2937"/><path d="M396 76v18c0 6 48 6 48 0V76" fill="#1F2937"/><path d="M460 70v22" stroke="${Y}" stroke-width="3"/><circle cx="460" cy="96" r="4" fill="${Y}"/><circle cx="50" cy="230" r="34" fill="${M}"/><rect x="47" y="250" width="6" height="40" fill="#8B5E3C"/><circle cx="440" cy="240" r="26" fill="${mix(M, '#000', .1)}"/><rect x="437" y="256" width="6" height="34" fill="#8B5E3C"/>`;
    else if (th.illu === 'doc') g = `<ellipse cx="240" cy="300" rx="200" ry="14" fill="${al('#000', .18)}"/><rect x="110" y="40" width="210" height="250" rx="12" fill="#fff"/><rect x="110" y="40" width="210" height="46" rx="12" fill="${a3}"/><path d="M136 64h120" stroke="${a}" stroke-width="8" stroke-linecap="round"/><path d="M136 116h158M136 140h158M136 164h120M136 188h140" stroke="#CBD5E1" stroke-width="7" stroke-linecap="round"/><circle cx="270" cy="244" r="26" fill="${Y}"/><path d="M258 244l8 8 14-16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M340 120l60 22v46c0 40-28 62-60 72-32-10-60-32-60-72v-46z" fill="${M}" stroke="#fff" stroke-width="6"/><path d="M314 186l18 18 32-36" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g fill="#fff" opacity=".9"><rect x="384" y="236" width="18" height="50" rx="4"/><rect x="408" y="212" width="18" height="74" rx="4"/><rect x="432" y="188" width="18" height="98" rx="4"/></g><circle cx="70" cy="90" r="10" fill="${Y}"/><circle cx="60" cy="200" r="16" fill="${al('#fff', .25)}"/>`;
    else if (th.illu === 'senior') g = `<ellipse cx="240" cy="298" rx="210" ry="14" fill="${al(a, .12)}"/><rect x="70" y="50" width="280" height="190" rx="18" fill="#fff" stroke="${a}" stroke-width="7"/><rect x="92" y="72" width="236" height="120" rx="10" fill="${a3}"/><circle cx="210" cy="132" r="34" fill="${a}"/><path d="M200 116v32l26-16z" fill="#fff"/><path d="M96 214h120" stroke="${a}" stroke-width="10" stroke-linecap="round"/><rect x="190" y="240" width="40" height="34" fill="${a}"/><rect x="150" y="270" width="120" height="14" rx="7" fill="${a}"/><path d="M380 120c0-20 30-28 40-6 10-22 40-14 40 6 0 26-40 46-40 46s-40-20-40-46z" fill="${P}"/><rect x="360" y="190" width="104" height="64" rx="14" fill="${Y}"/><path d="M378 212h68M378 232h44" stroke="#5A4300" stroke-width="7" stroke-linecap="round"/><path d="M372 254l-10 18 26-18" fill="${Y}"/>`;
    else { const names = (C.length ? C.slice(0, 3).map(c => c.name) : [S.org.name]).map(n => String(n).slice(0, 16));
      g = `<rect x="40" y="36" width="400" height="248" rx="14" fill="#0F1B2D" stroke="${al('#fff', .14)}"/><rect x="40" y="36" width="400" height="34" rx="14" fill="${al('#fff', .06)}"/><circle cx="62" cy="53" r="6" fill="#FF5F57"/><circle cx="82" cy="53" r="6" fill="#FEBC2E"/><circle cx="102" cy="53" r="6" fill="#28C840"/><g font-family="ui-monospace,Menlo,Consolas,monospace" font-size="15"><text x="64" y="104" fill="${M}">const</text><text x="116" y="104" fill="#E2E8F0">${E(t('cls') === '강좌' ? 'courses' : 'programs')} = [</text>${names.map((n, k) => `<text x="88" y="${134 + k * 28}" fill="${Y}">"${E(n)}",</text>`).join('')}<text x="64" y="${134 + names.length * 28}" fill="#E2E8F0">];</text><text x="64" y="${168 + names.length * 28}" fill="${a2}">learn</text><text x="110" y="${168 + names.length * 28}" fill="#E2E8F0">(courses).then(grow);</text></g><rect x="330" y="200" width="150" height="100" rx="14" fill="${a}" opacity=".95"/><path d="M352 270l28-26 22 16 38-40" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="440" cy="220" r="5" fill="#fff"/>`; }
    return `<div class="hp-vis hp-illu hp-i-${th.illu}" aria-hidden="true"><svg viewBox="0 0 480 320" role="presentation">${g}</svg></div>`; }

  /* ── 섹션 ── */
  const SH = (d, def, cls) => { const ey = d.eyebrow || def; return `<div class="hp-sh${cls ? ' ' + cls : ''}">${ey ? `<p class="hp-ey">${E(ey)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${d.sub ? `<p class="hp-sd">${E(d.sub)}</p>` : typeof d.body === 'string' && d.body && !['cta'].includes(d.variant) ? `<p class="hp-sd">${E(d.body)}</p>` : ''}</div>`; };
  const SEC = (cls, inner, alt, st) => `<section class="hpt hp-s ${cls}${alt ? ' hp-alt' : ''}"${st ? ` style="${E(st)}"` : ''}><div class="hp-w">${inner}</div></section>`;
  const hint = (cls, msg) => editing() ? SEC(cls + ' hp-empty', `<p class="hp-hint">${E(msg)}</p>`) : '';
  function hero(d, s, th, T) {
    const L = String(d.title || S.org.name).split('\n'); const h1 = L.length > 1 ? `${L.slice(0, -1).map(E).join('<br>')}<br><em>${E(L[L.length - 1])}</em>` : `<em>${E(L[0])}</em>`;
    const p1 = linkHref(d.link) || clsHref(s); const p2 = linkHref(d.link2) || askHref(s);
    const btn = `<div class="hp-hb">${d.cta && p1 ? `<a class="hp-btn pri" ${aAttr(p1)}>${E(d.cta)} ${svg('arrow', 18, 2.2)}</a>` : d.cta ? `<span class="hp-btn pri">${E(d.cta)}</span>` : ''}${d.cta2 && p2 ? `<a class="hp-btn gh" ${aAttr(p2)}>${E(d.cta2)}</a>` : ''}</div>`;
    const f = badges(); const trust = f.length ? `<ul class="hp-tr">${f.map(x => `<li>${svg('check', 16, 2.2)}<span>${E(x)}</span></li>`).join('')}</ul>` : '';
    const vis = d.img ? `<div class="hp-vis hp-photo"><img src="${E(d.img)}" alt="${E(d.alt || d.title || '')}"></div>` : (th.vis === 'mock' && mock(s, th, T)) || illu(s, th, T);
    const ey = d.eyebrow ? `<p class="hp-hey">${E(d.eyebrow)}</p>` : '';
    const txt = `<div class="hp-ht">${ey}<h1>${h1}</h1>${d.sub ? `<p class="hp-hs">${E(d.sub)}</p>` : ''}${btn}${trust}</div>`;
    let qk = '';
    if (th.hero === 'band') { const M = (s.menus || []).filter(m => m.on !== false && m.kind !== 'home' && m.access !== '비공개').slice(0, 4);
      if (M.length >= 2) qk = `<nav class="hp-qk n${M.length}" aria-label="바로가기">${M.map((m, k) => `<a ${aAttr(m.link ? linkHref(m.link) || '#p-m-' + m.id : '#p-m-' + m.id)}><i>${svg(icOf(m.l, k + 2), 22)}</i><b>${E(m.l)}</b>${svg('arrow', 16, 2)}</a>`).join('')}</nav>`; }
    const deco = th.hero === 'dark' ? '<i class="hp-glow g1"></i><i class="hp-glow g2"></i><i class="hp-grid"></i>' : th.hero === 'band' ? '<i class="hp-band-d"></i>' : '<i class="hp-blob b1"></i><i class="hp-blob b2"></i><i class="hp-dots"></i>';
    return `<section class="hpt hp-hero hp-h-${th.hero}">${deco}<div class="hp-w hp-hg">${txt}${vis}</div>${qk ? `<div class="hp-w">${qk}</div>` : ''}</section>`;
  }
  const gridN = n => n <= 4 ? n : n === 5 || n === 6 ? 3 : 4;
  function textSec(d, s, th, T, alt, x) {
    const v = d.variant || (d.cols ? 'features' : 'plain'); const cols = (d.cols || []).filter(r => r && String(r[0] || '').trim());
    if (d.hpt === 'facts') { const F = facts(); if (F.length < 2) return hint('hp-facts', '공개 강좌가 2개 이상이면 실제 숫자(강좌 수 · 차시 · 수료증)가 자동으로 표시됩니다.');
      return `<section class="hpt hp-s hp-facts"><div class="hp-w"><ul class="hp-fl n${F.length}">${F.map(x => `<li><b>${E(x.v)}<small>${E(x.u)}</small></b><span>${E(x.l)}</span></li>`).join('')}</ul></div></section>`; }
    switch (v) {
      case 'features': if (!cols.length) return null;
        return SEC('hp-feat', SH(d, '') + `<div class="hp-g g${gridN(cols.length)}">${cols.map(([a, b], k) => `<article class="hp-card"><span class="hp-ic">${svg(icOf(a + ' ' + b, k), 24)}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div>`, alt);
      case 'steps': if (!cols.length) return null;
        return SEC('hp-steps', SH(d, '') + `<ol class="hp-st g${Math.min(cols.length, 5)}">${cols.map(([a, b], k) => `<li><span class="hp-no">${k + 1}</span><div><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</div></li>`).join('')}</ol>`, alt);
      case 'stats': if (!cols.length) return null;
        return `<section class="hpt hp-s hp-facts"><div class="hp-w">${d.title ? SH(d, '') : ''}<ul class="hp-fl n${Math.min(cols.length, 4)}">${cols.slice(0, 4).map(([a, b]) => `<li><b>${E(a)}</b><span>${E(b)}</span></li>`).join('')}</ul></div></section>`;
      case 'info': if (!cols.length) return hint('hp-faq', '자주 묻는 질문을 넣어 주세요.');
        if (d.hpt === 'faq' || cols.every(([a]) => /\?$/.test(String(a).trim()))) return SEC('hp-faq', `<div class="hp-split">${SH(d, 'FAQ')}<div class="hp-qa">${cols.map(([a, b], k) => `<details${k === 0 ? ' open' : ''}><summary><span>${E(a)}</span><i aria-hidden="true">+</i></summary><p>${E(b)}</p></details>`).join('')}</div></div>`, alt);
        return SEC('hp-info', SH(d, '') + `<dl class="hp-dl">${cols.map(([a, b]) => `<div><dt>${E(a)}</dt><dd>${E(b)}</dd></div>`).join('')}</dl>`, alt);
      case 'timeline': if (!cols.length) return null;
        return SEC('hp-tl', `<div class="hp-split">${SH(d, '')}<ol class="hp-tll">${cols.map(([a, b], k) => `<li${k === 0 ? ' class="on"' : ''}><time>${E(a)}</time><b>${E(b)}</b></li>`).join('')}</ol></div>`, alt);
      case 'profiles': if (!cols.length) return hint('hp-ppl', '등록된 강사가 있으면 이곳에 소개됩니다.');
        return SEC('hp-ppl', SH(d, '') + `<div class="hp-g g${gridN(cols.length)}">${cols.map(([a, b], k) => `<article class="hp-card hp-pc"><span class="hp-av" style="background:${[T.a, mix(T.a, '#F59E0B', .5), mix(T.a, '#10B981', .5), mix(T.a, '#000000', .3)][k % 4]}">${E((String(a).trim().replace(/\s*(강사|교수|선생님|님)$/, '').slice(0, 1)) || '?')}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div>`, alt);
      case 'tiles': if (!cols.length) return null;
        return SEC('hp-tiles', SH(d, '') + `<div class="hp-g g${gridN(cols.length)}">${cols.map(([a, b], k) => `<a class="hp-card hp-tile" href="#"><span class="hp-ic">${svg(icOf(a + ' ' + b, k + 2), 24)}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</a>`).join('')}</div>`, alt);
      case 'cta': { const C = contact(s); const items = [...cols.filter(([a, b]) => b && !isPh(b)).map(([a, b]) => ({ ic: icOf(a, 5) === 'cal' ? 'clock' : /시간/.test(a) ? 'clock' : icOf(a, 5), k: a, v: b, h: '' })), ...C.filter(c => !cols.some(([a, b]) => b === c.v))];
        const h = askHref(s); const btn = d.cta && h ? `<a class="hp-btn inv" ${aAttr(h)}>${E(d.cta)} ${svg('arrow', 18, 2.2)}</a>` : '';
        const body = typeof d.body === 'string' && d.body ? `<p>${E(d.body)}</p>` : '';
        const side = items.length >= 2 ? `<ul class="hp-ci">${items.slice(0, 4).map(c => `<li><i>${svg(c.ic, 20)}</i><div><small>${E(c.k)}</small>${c.h ? `<a ${aAttr(c.h)}>${E(c.v)}</a>` : `<b>${E(c.v)}</b>`}</div></li>`).join('')}</ul>` : '';
        const one = items.length === 1 ? `<p class="hp-c1">${svg(items[0].ic, 18, 2)}<span>${E(items[0].k)}</span> <b>${E(items[0].v)}</b></p>` : '';
        return `<section class="hpt hp-s hp-cta"><div class="hp-w"><div class="hp-ctab${side ? ' two' : ''}"><div class="hp-ctat">${d.eyebrow ? `<p class="hp-ey">${E(d.eyebrow)}</p>` : ''}<h2>${br(d.title || '')}</h2>${body}${btn || one ? `<div class="hp-ctaf">${btn}${one}</div>` : ''}</div>${side}</div></div></section>`; }
      case 'plain': case undefined: case '':
        if (cols.length) return SEC('hp-feat', SH({ ...d, body: '' }, '') + (typeof d.body === 'string' && d.body ? `<p class="hp-lead">${E(d.body)}</p>` : '') + `<div class="hp-g g${gridN(cols.length)}">${cols.map(([a, b], k) => `<article class="hp-card"><span class="hp-ic">${svg(icOf(a + ' ' + b, k), 24)}</span><h3>${E(a)}</h3>${b ? `<p>${E(b)}</p>` : ''}</article>`).join('')}</div>`, alt);
        if (!d.title && !d.body) return null;
        return SEC('hp-plain', `<div class="hp-prose">${d.eyebrow ? `<p class="hp-ey">${E(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${br(d.title)}</h2>` : ''}${typeof d.body === 'string' && d.body ? `<p>${br(d.body)}</p>` : ''}</div>`, alt);
    }
    return null;
  }
  function classes(d, s, th, T, alt) { const L = (d.ids || []).map(id => (S.classes || []).find(c => c.id === id)).filter(Boolean);
    if (!L.length) return hint('hp-cls', `전체 공개한 ${t('cls')}이 이곳에 카드로 표시됩니다.`);
    const n = L.length; const one = n === 1;
    const card = (c, k) => { const meta = [perOf(c), lesOf(c) ? `${lesOf(c)}차시` : ''].filter(Boolean);
      return `<a class="hp-cc${one ? ' one' : ''}" href="#p-c-${E(c.id)}">${cover(c, k, th, T, one)}<div class="hp-ccb"><h3>${E(c.name)}</h3>${meta.length ? `<p class="hp-cm">${meta.map(m => `<span>${E(m)}</span>`).join('')}</p>` : ''}<p class="hp-cp"><b>${E(priceOf(c))}</b><span class="hp-more">자세히 ${svg('arrow', 15, 2.2)}</span></p></div></a>`; };
    const all = clsHref(s); const head = `<div class="hp-shr">${SH(d, '')}${all && n >= 2 ? `<a class="hp-all" ${aAttr(all)}>전체 보기 ${svg('arrow', 16, 2.2)}</a>` : ''}</div>`;
    return SEC('hp-cls', head + `<div class="hp-g g${gridN(n)} hp-cg">${L.map(card).join('')}</div>`, alt); }
  function notices(d, s, th, T, alt) { const L = [...(S.notices || []), ...(S.classes || []).flatMap(c => c.notices || [])].slice(0, +d.n || 3);
    if (!L.length) return hint('hp-nt', '공지사항을 올리면 이곳에 최신 글이 표시됩니다(없으면 게시된 사이트에서 숨겨집니다).');
    const m = menuOf(s, 'notice');
    return SEC('hp-nt', `<div class="hp-split">${SH(d, '')}<div><ul class="hp-nl">${L.map(n => `<li><span class="hp-tag">공지</span><b>${E(n.title)}</b><time>${E(dot(n.at || ''))}</time></li>`).join('')}</ul>${m ? `<a class="hp-all" href="#p-m-${E(m.id)}">공지 전체 보기 ${svg('arrow', 16, 2.2)}</a>` : ''}</div></div>`, alt); }
  function reviews(d, s, th, T, alt) {
    const nm = id => { const n = (typeof M === 'function' && M(id) && M(id).name) || ''; return /^[가-힣]/.test(n) ? n[0] + '○○' : t('learner'); };
    const R = [...(S.reviews || []).filter(r => !r.hidden && String(r.body || '').trim()).map(r => ({ b: r.body, w: nm(r.who), st: +r.stars || 0, c: ((S.classes || []).find(c => c.id === r.cls) || {}).name || '' })),
      ...(S.posts || []).filter(p => p.board === '수강후기' && !p.hidden && !(S.reviews || []).some(r => r.id === p.id)).map(p => ({ b: p.title, w: nm(p.who), st: 0, c: '' }))].slice(0, 3);
    if (!R.length) return hint('hp-rv', '실제 수강후기가 등록되면 이곳에 표시됩니다(없으면 게시된 사이트에서 숨겨집니다).');
    return SEC('hp-rv', SH(d, '') + `<div class="hp-g g${R.length}">${R.map(r => `<figure class="hp-card hp-rc">${r.st ? `<span class="hp-stars" aria-label="별점 ${r.st}점">${'★'.repeat(Math.min(5, r.st))}<i>${'★'.repeat(5 - Math.min(5, r.st))}</i></span>` : ''}<blockquote>${E(String(r.b).slice(0, 160))}</blockquote><figcaption><b>${E(r.w)}</b>${r.c ? `<small>${E(r.c)}</small>` : ''}</figcaption></figure>`).join('')}</div>`, alt); }
  function map(d, s, th, T, alt) { const f = ft();
    const addr = !isPh(d.addr) ? d.addr : (!isPh(f.addr) ? f.addr : ''); const tel = !isPh(d.tel) ? d.tel : (!isPh(f.tel) ? f.tel : '');
    const rows = [addr && ['pin', '주소', addr, ''], tel && ['phone', '연락처', tel, 'tel:' + String(tel).replace(/[^\d+]/g, '')], d.hours && !isPh(d.hours) && (addr || tel) && ['clock', '운영 시간', d.hours, '']].filter(Boolean);
    if (!addr && !tel) return hint('hp-map', '설정 › 기관 정보에서 주소 · 연락처를 넣으면 오시는 길이 표시됩니다(없으면 게시된 사이트에서 숨겨집니다).');
    return SEC('hp-map', `<div class="hp-mapw"><div>${SH(d, '')}<ul class="hp-ci lt">${rows.map(([ic, k, v, h]) => `<li><i>${svg(ic, 20)}</i><div><small>${E(k)}</small>${h ? `<a href="${E(h)}">${E(v)}</a>` : `<b>${E(v)}</b>`}</div></li>`).join('')}</ul></div><div class="hp-mapv" role="img" aria-label="${E(addr ? addr + ' 위치' : '위치')}"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="260" fill="${T.as}"/><path d="M0 70L400 40M0 180L400 210M100 0L130 260M270 0L250 260" stroke="#fff" stroke-width="16"/><path d="M0 120C120 100 280 150 400 128" stroke="${al(T.a, .3)}" stroke-width="10" fill="none"/><rect x="150" y="80" width="80" height="60" rx="8" fill="${al(T.a, .14)}"/><rect x="280" y="140" width="70" height="50" rx="8" fill="${al(T.a, .1)}"/></svg><span class="hp-pin">${svg('pin', 26, 2)}</span></div></div>`, alt); }

  /* ── proSec 감싸기: 테마가 있으면 새 렌더러, 아니면 기존 그대로 ── */
  let band = 0;
  { const base = proSec; proSec = (x, i, s, lk) => {
    const th = thOf(s); if (!th || !x) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    const d = x.data || {}; if (+d.dstyle && !(x.type === 'banner' && +d.dstyle === 2)) return base(x, i, s, lk); /* 직접 고른 디자인 스타일은 존중 */
    if (i === 0) band = 0; const T = tok(s, th); let h = null;
    try {
      const alt = () => (band++ % 2 === 1);
      if (x.type === 'banner') h = hero(d, s, th, T);
      else if (x.type === 'text') { const a = ['cta'].includes(d.variant) || d.hpt === 'facts' || d.variant === 'stats' ? false : alt(); h = textSec(d, s, th, T, a, x); if (h == null) band--; }
      else if (x.type === 'classes') { let y = d; if (d.auto) y = { ...d, ids: pub().map(c => c.id).slice(0, 4) }; h = classes(y, s, th, T, alt()); }
      else if (x.type === 'notices') h = notices(d, s, th, T, alt());
      else if (x.type === 'reviews') h = reviews(d, s, th, T, alt());
      else if (x.type === 'map') h = map(d, s, th, T, alt());
      else if ((x.type === 'image' || x.type === 'slideImage') && !d.img && !(d.imgs || []).some(m => m && m.src)) h = hint('hp-img', '사진을 올리면 이곳에 표시됩니다(없으면 게시된 사이트에서 숨겨집니다).');
      else if (x.type === 'video' && !d.url) h = hint('hp-vid', '영상 주소를 넣으면 이곳에 표시됩니다(없으면 게시된 사이트에서 숨겨집니다).');
    } catch (e) { console.error('hpth', e); h = null; }
    if (h == null) return base(x, i, s, lk);
    if (!h) return '';
    const m = editing() ? HPE.map.get(x) : null;
    if (m) h = h.replace(/<section\b/g, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; }

  /* ── CSS ── */
  function css(s) { const th = thOf(s); if (!th) return ''; const T = tok(s, th); const big = th.big ? 1.14 : 1; const px = n => Math.round(n * big) + 'px';
    const cardS = th.card === 'shadow' ? `background:#fff;box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 28px -12px rgba(16,24,40,.14);border:1px solid rgba(16,24,40,.06)` : th.card === 'flat' ? `background:#fff;border:0;box-shadow:0 0 0 1px ${al(T.a, .1)}` : `background:#fff;border:1px solid #E3E6EC`;
    const heroBg = th.hero === 'dark' ? `background:${T.hb};color:#fff` : th.hero === 'band' ? `background:linear-gradient(120deg,${T.hb},${mix(T.hb, T.a, .55)});color:#fff` : th.hero === 'center' ? `background:linear-gradient(180deg,${T.as} 0%,${th.bg} 100%)` : `background:${th.bg}`;
    return `.hpt{--a:${T.a};--on:${T.on};--at:${T.at};--at2:${T.at2};--as:${T.as};--as2:${T.as2};--bg:${th.bg};--alt:${th.alt};--ink:${T.ink};--mu:${T.mu};--r:${th.r}px;--br:${th.br}px;--hb:${T.hb};--hi:${T.hi};--hm:${T.hm};--ha:${T.ha};box-sizing:border-box;position:relative;color:var(--ink);background:var(--bg);font-family:Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere;font-size:${px(16)}}
.hpt *,.hpt *::before,.hpt *::after{box-sizing:border-box}.hpt a{color:inherit;text-decoration:none}:where(.hpt) :where(h1,h2,h3,p,ul,ol,dl,dd,figure,blockquote){margin:0;padding:0}:where(.hpt) :where(ul,ol){list-style:none}.hpt svg{flex:none}
.hp-w{max-width:1160px;margin:0 auto;padding:0 32px;position:relative;z-index:1}
.hp-s{padding:${px(76)} 0}.hp-s.hp-alt{background:var(--alt)}.hp-s.hp-alt .hp-ey{color:var(--at2)}
.hp-sh{margin-bottom:${px(32)};max-width:720px}.hp-ey{font-size:${px(13)};font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--at);margin-bottom:10px}.hp-sh h2,.hp-prose h2,.hp-ctat h2{font-size:clamp(${px(26)},3vw,${px(38)});line-height:1.25;letter-spacing:-.03em;font-weight:800}.hp-sd,.hp-lead{color:var(--mu);font-size:${px(16.5)};margin-top:12px;line-height:1.75}.hp-lead{margin:-14px 0 28px;max-width:720px}
.hp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:${px(52)};padding:0 ${px(26)};border-radius:var(--br);font-weight:750;font-size:${px(16)};letter-spacing:-.01em;transition:transform .15s,box-shadow .15s,background .15s;white-space:nowrap}.hp-btn:hover{transform:translateY(-1px)}.hp-btn.pri{background:var(--a);color:var(--on);box-shadow:0 10px 24px -10px ${al(T.a, .7)}}.hp-btn.gh{box-shadow:inset 0 0 0 1.5px ${T.dark ? 'rgba(255,255,255,.45)' : al(T.ink, .2)};color:var(--hi);background:${T.dark ? 'rgba(255,255,255,.06)' : '#fff'}}.hp-btn.inv{background:#fff;color:${fit(T.a, '#ffffff', 4.6)};}
/* 첫 화면 */
.hp-hero{${heroBg};overflow:hidden;padding:${th.hero === 'center' ? px(84) + ' 0 ' + px(36) : px(88) + ' 0 ' + px(84)}}.hp-hg{display:grid;grid-template-columns:${th.hero === 'center' ? '1fr' : th.big ? 'minmax(0,1.25fr) minmax(0,.75fr)' : 'minmax(0,1.05fr) minmax(0,.95fr)'};gap:${th.hero === 'center' ? '36px' : '56px'};align-items:center}
.hp-ht{${th.hero === 'center' ? 'text-align:center;max-width:760px;margin:0 auto;display:flex;flex-direction:column;align-items:center' : ''}}.hp-hey{display:inline-flex;align-items:center;gap:8px;font-size:${px(13)};font-weight:800;letter-spacing:.14em;color:var(--ha);${T.dark ? 'background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)' : `background:${T.as};`};padding:7px 14px;border-radius:999px;margin-bottom:22px}
.hp-hero h1{font-size:clamp(${px(34)},4.6vw,${px(58)});line-height:1.16;letter-spacing:-.035em;font-weight:850;color:var(--hi)}.hp-hero h1 em{font-style:normal;color:var(--ha);${th.hero === 'split' || th.hero === 'center' ? `background:linear-gradient(transparent 68%,${al(T.a, .16)} 68%)` : ''}}
.hp-hs{margin-top:20px;font-size:${px(18)};line-height:1.7;color:var(--hm);max-width:560px}.hp-hb{display:flex;flex-wrap:wrap;gap:10px;margin-top:32px;${th.hero === 'center' ? 'justify-content:center' : ''}}
.hp-tr{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:28px;${th.hero === 'center' ? 'justify-content:center' : ''}}.hp-tr li{display:flex;align-items:center;gap:7px;font-size:${px(14)};color:var(--hm)}.hp-tr li svg{color:var(--ha)}.hp-tr b{color:var(--hi);font-weight:800}
.hp-blob{position:absolute;border-radius:50%;filter:blur(2px);pointer-events:none}.hp-blob.b1{width:520px;height:520px;right:-120px;top:-160px;background:radial-gradient(circle,${al(T.a, .16)},transparent 68%)}.hp-blob.b2{width:360px;height:360px;left:-140px;bottom:-180px;background:radial-gradient(circle,${al(mix(T.a, '#F59E0B', .5), .14)},transparent 70%)}.hp-dots{position:absolute;inset:0;background-image:radial-gradient(${al(T.a, .14)} 1px,transparent 1.4px);background-size:22px 22px;-webkit-mask-image:linear-gradient(90deg,transparent 40%,#000 85%);mask-image:linear-gradient(90deg,transparent 40%,#000 85%);pointer-events:none}
.hp-glow{position:absolute;border-radius:50%;pointer-events:none}.hp-glow.g1{width:640px;height:640px;right:-160px;top:-260px;background:radial-gradient(circle,${al(T.a, .34)},transparent 65%)}.hp-glow.g2{width:420px;height:420px;left:-160px;bottom:-240px;background:radial-gradient(circle,${al(mix(T.a, '#6366F1', .5), .22)},transparent 70%)}.hp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(ellipse at 70% 40%,#000 20%,transparent 75%);mask-image:radial-gradient(ellipse at 70% 40%,#000 20%,transparent 75%);pointer-events:none}
.hp-band-d{position:absolute;right:-8%;top:-30%;width:60%;height:160%;background:radial-gradient(ellipse at center,rgba(255,255,255,.12),transparent 62%);pointer-events:none}
.hp-vis{position:relative;min-height:${th.hero === 'center' ? '260px' : '360px'};display:flex;align-items:center;justify-content:center}.hp-illu svg{width:100%;max-width:${th.hero === 'center' ? '520px' : '500px'};height:auto;display:block;filter:drop-shadow(0 24px 40px ${al(T.dark ? '#000000' : T.a, T.dark ? .35 : .12)})}.hp-photo img{width:100%;max-height:440px;object-fit:cover;border-radius:calc(var(--r) + 8px);box-shadow:0 30px 60px -30px rgba(0,0,0,.45)}
.hp-mock{min-height:400px}.hp-mc{position:absolute;width:min(330px,74%);border-radius:calc(var(--r) + 4px);overflow:hidden;background:#fff;color:#111827;box-shadow:0 30px 60px -24px rgba(15,23,42,.38),0 0 0 1px rgba(15,23,42,.06)}.hp-mf{left:50%;top:50%;transform:translate(-44%,-46%);z-index:2}.hp-mb{left:50%;top:50%;transform:translate(-80%,-62%) rotate(-7deg);opacity:.9;z-index:1;filter:saturate(.85)}.hp-mc .hp-cov{aspect-ratio:16/8}.hp-mcb{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px}.hp-mcb b{font-size:16.5px;letter-spacing:-.02em;line-height:1.35}.hp-mcb small{color:#5B6170;font-size:13px}.hp-ln{display:block;height:9px;border-radius:9px;background:#EEF0F4;width:80%}.hp-ln.s{width:52%}
.hp-mbar{height:7px;border-radius:7px;background:#EEF0F4;overflow:hidden;margin:6px 0 4px}.hp-mbar i{display:block;height:100%;width:38%;background:${T.a};border-radius:7px}.hp-mrow{display:flex;align-items:center;justify-content:space-between;gap:10px}.hp-mrow strong{font-size:17px;letter-spacing:-.02em}.hp-mbtn{font-size:13px;font-weight:800;background:${T.a};color:${T.on};padding:8px 14px;border-radius:var(--br)}
.hp-chip{position:absolute;z-index:3;display:inline-flex;align-items:center;gap:7px;background:#fff;color:#111827;font-size:13.5px;font-weight:750;padding:10px 14px;border-radius:999px;box-shadow:0 14px 30px -12px rgba(15,23,42,.35),0 0 0 1px rgba(15,23,42,.05);white-space:nowrap}.hp-chip svg{color:${fit(T.a, '#ffffff', 4.6)}}.hp-chip.c1{right:4%;top:3%}.hp-chip.c2{left:2%;bottom:3%}
.hp-qk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:${px(48)}}.hp-qk.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-qk.n3{grid-template-columns:repeat(3,minmax(0,1fr))}.hp-qk a{display:flex;align-items:center;gap:12px;padding:18px 20px;border-radius:var(--r);background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);color:#fff;font-weight:750;font-size:${px(16)};transition:background .15s}.hp-qk a:hover{background:rgba(255,255,255,.18)}.hp-qk a i{width:40px;height:40px;border-radius:calc(var(--r) - 2px);display:grid;place-items:center;background:#fff;color:${fit(T.a, '#ffffff', 4.6)};flex:none}.hp-qk a b{flex:1;min-width:0}.hp-qk a>svg{opacity:.7}
/* 숫자 */
.hp-facts{padding:${px(40)} 0;background:var(--bg);border-bottom:1px solid ${al(T.ink, .07)}}.hp-fl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.hp-fl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-fl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}.hp-fl li{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 12px;text-align:center}.hp-fl li+li{border-left:1px solid ${al(T.ink, .09)}}.hp-fl b{font-size:clamp(${px(28)},3.2vw,${px(40)});font-weight:850;letter-spacing:-.03em;color:var(--at);line-height:1.1}.hp-fl b small{font-size:.5em;margin-left:3px;font-weight:750}.hp-fl span{color:var(--mu);font-size:${px(14.5)}}
/* 카드 */
.hp-g{display:grid;gap:18px}.hp-g.g1{grid-template-columns:1fr}.hp-g.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-g.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.hp-g.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.hp-card{${cardS};border-radius:var(--r);padding:${px(26)} ${px(24)};display:flex;flex-direction:column;gap:8px;transition:transform .2s,box-shadow .2s}.hp-card h3{font-size:${px(18)};letter-spacing:-.02em;line-height:1.4}.hp-card p{color:var(--mu);font-size:${px(15)};line-height:1.65}
.hp-ic{width:${px(48)};height:${px(48)};border-radius:calc(var(--r) * .7);display:grid;place-items:center;background:var(--as);color:var(--at);margin-bottom:8px}
.hp-alt .hp-card{background:#fff}
/* 단계 */
.hp-st{display:grid;gap:18px;position:relative}.hp-st.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-st.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.hp-st.g4{grid-template-columns:repeat(4,minmax(0,1fr))}.hp-st.g5{grid-template-columns:repeat(5,minmax(0,1fr))}.hp-st::before{content:'';position:absolute;left:28px;right:28px;top:${px(26)};height:2px;background:repeating-linear-gradient(90deg,${al(T.a, .35)} 0 8px,transparent 8px 14px)}
.hp-st li{position:relative;display:flex;flex-direction:column;gap:14px}.hp-no{width:${px(54)};height:${px(54)};border-radius:50%;background:var(--a);color:var(--on);display:grid;place-items:center;font-weight:850;font-size:${px(20)};box-shadow:0 0 0 6px var(--bg),0 10px 20px -8px ${al(T.a, .6)}}.hp-alt .hp-no{box-shadow:0 0 0 6px var(--alt),0 10px 20px -8px ${al(T.a, .6)}}.hp-st h3{font-size:${px(18.5)};letter-spacing:-.02em}.hp-st p{color:var(--mu);font-size:${px(15)};margin-top:4px}
/* 강좌 */
.hp-shr{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.hp-shr .hp-sh{flex:1}.hp-all{display:inline-flex;align-items:center;gap:6px;font-weight:750;color:var(--at);white-space:nowrap;margin-bottom:${px(34)};font-size:${px(15)}}.hp-alt .hp-all{color:var(--at2)}
.hp-cc{${cardS};border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}.hp-cc:hover{transform:translateY(-4px);box-shadow:0 22px 40px -22px rgba(16,24,40,.35)}
.hp-cov{position:relative;aspect-ratio:16/9;overflow:hidden;display:flex;align-items:flex-end;justify-content:space-between;padding:16px}.hp-cdeco{position:absolute;inset:0;width:100%;height:100%}.hp-cic{position:relative;width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.2);backdrop-filter:blur(4px)}.hp-ckd{position:relative;font-size:11px;font-weight:850;letter-spacing:.14em;background:rgba(0,0,0,.22);color:#fff;padding:5px 10px;border-radius:999px}
.hp-ccb{padding:18px 20px 20px;display:flex;flex-direction:column;gap:10px;flex:1}.hp-ccb h3{font-size:${px(17.5)};line-height:1.4;letter-spacing:-.02em}.hp-cm{display:flex;flex-wrap:wrap;gap:6px}.hp-cm span{font-size:${px(12.5)};font-weight:650;color:var(--mu);background:${th.alt};padding:4px 9px;border-radius:6px}.hp-alt .hp-cm span{background:var(--alt)}.hp-cp{margin-top:auto;display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #EEF0F4}.hp-cp b{font-size:${px(18)};letter-spacing:-.02em}.hp-more{display:inline-flex;align-items:center;gap:4px;font-size:${px(13.5)};font-weight:750;color:var(--at)}
.hp-cc.one{flex-direction:row}.hp-cc.one .hp-cov{width:46%;aspect-ratio:auto;min-height:240px}.hp-cc.one .hp-ccb{padding:30px 32px}.hp-cc.one h3{font-size:${px(24)}}
/* 공지 · FAQ · 일정 */
.hp-split{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px;align-items:start}.hp-split .hp-sh{margin-bottom:0}
.hp-nl{border-top:2px solid var(--ink)}.hp-nl li{display:flex;align-items:center;gap:14px;padding:18px 4px;border-bottom:1px solid ${al(T.ink, .1)};font-size:${px(16)}}.hp-nl b{flex:1;min-width:0;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hp-nl time{color:var(--mu);font-size:${px(13.5)};font-variant-numeric:tabular-nums}.hp-tag{font-size:12px;font-weight:800;color:var(--at);background:var(--as);padding:3px 10px;border-radius:999px;flex:none}.hp-split .hp-all{margin:18px 0 0}
.hp-qa{display:flex;flex-direction:column;gap:10px}.hp-qa details{${cardS};border-radius:var(--r);padding:0 22px}.hp-qa summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 0;font-weight:750;font-size:${px(16.5)}}.hp-qa summary::-webkit-details-marker{display:none}.hp-qa summary i{font-style:normal;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--as);color:var(--at);font-weight:700;flex:none;transition:transform .2s}.hp-qa details[open] summary i{transform:rotate(45deg)}.hp-qa details p{color:var(--mu);padding:0 0 20px;font-size:${px(15.5)};line-height:1.75}
.hp-dl{display:grid;gap:10px;max-width:820px}.hp-dl div{display:grid;grid-template-columns:160px 1fr;gap:16px;padding:16px 20px;${cardS};border-radius:var(--r)}.hp-dl dt{font-weight:800;color:var(--at)}.hp-dl dd{margin:0}
.hp-tll{display:flex;flex-direction:column;gap:10px}.hp-tll li{display:grid;grid-template-columns:130px 1fr;align-items:center;gap:12px;padding:16px 20px;${cardS};border-radius:var(--r)}.hp-tll time{font-weight:800;color:var(--at)}.hp-tll li.on{background:var(--a);color:var(--on);border-color:transparent}.hp-tll li.on time{color:inherit;opacity:.85}
/* 후기 · 강사 */
.hp-rc blockquote{font-size:${px(16)};line-height:1.7;font-weight:550;color:var(--ink)}.hp-rc figcaption{display:flex;flex-direction:column;margin-top:auto;padding-top:8px}.hp-rc figcaption small{color:var(--mu);font-size:13px}.hp-stars{color:#F5A524;letter-spacing:2px;font-size:15px}.hp-stars i{font-style:normal;color:#E3E6EC}
.hp-pc{display:grid;grid-template-columns:auto 1fr;column-gap:18px;row-gap:2px;align-items:center}.hp-pc .hp-av{grid-row:span 2}.hp-pc h3{align-self:end}.hp-pc p{align-self:start}.hp-av{width:${px(56)};height:${px(56)};border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:${px(22)}}
/* 문의 띠 */
.hp-cta{padding:${px(36)} 0 ${px(76)}}.hp-ctab{border-radius:calc(var(--r) + 10px);padding:${px(48)} ${px(52)};background:linear-gradient(120deg,${mix(fit(T.a, '#ffffff', 4.8, '#000000'), '#000000', .2)},${fit(T.a, '#ffffff', 4.8, '#000000')});color:#fff;position:relative;overflow:hidden;display:grid;gap:36px;align-items:center}.hp-ctab.two{grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr)}.hp-ctab::after{content:'';position:absolute;right:-80px;top:-120px;width:340px;height:340px;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none}
.hp-ctat{position:relative;z-index:1}.hp-ctat .hp-ey{color:rgba(255,255,255,.85)}.hp-ctat h2{color:#fff}.hp-ctat>p{color:rgba(255,255,255,.88);margin-top:12px;font-size:${px(17)}}.hp-ctaf{display:flex;flex-wrap:wrap;align-items:center;gap:18px;margin-top:26px}.hp-c1{display:inline-flex;align-items:center;gap:8px;color:rgba(255,255,255,.9);font-size:${px(15)}}.hp-c1 b{color:#fff}
.hp-ci{display:flex;flex-direction:column;gap:12px;position:relative;z-index:1}.hp-ci li{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);border-radius:var(--r);padding:14px 16px}.hp-ci i{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#fff;color:${fit(T.a, '#ffffff', 4.6)};flex:none}.hp-ci small{display:block;font-size:12.5px;opacity:.85}.hp-ci b,.hp-ci a{font-weight:750;font-size:${px(16)}}
.hp-ci.lt{margin-top:8px}.hp-ci.lt li{background:#fff;box-shadow:0 0 0 1px #E3E6EC;color:var(--ink)}.hp-ci.lt i{background:var(--as);color:var(--at)}.hp-ci.lt small{color:var(--mu);opacity:1}
.hp-mapw{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:36px;align-items:center}.hp-mapv{position:relative;border-radius:calc(var(--r) + 6px);overflow:hidden;min-height:280px;box-shadow:0 0 0 1px #E3E6EC}.hp-mapv svg{position:absolute;inset:0;width:100%;height:100%}.hp-pin{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;background:var(--a);color:var(--on);display:grid;place-items:center;box-shadow:0 0 0 10px ${al(T.a, .18)},0 14px 28px -8px ${al(T.a, .7)}}
.hp-prose{max-width:760px}.hp-prose p{margin-top:14px;color:var(--mu);font-size:${px(17)};line-height:1.8}
.hp-empty{padding:28px 0}.hp-hint{border:2px dashed ${al(T.a, .35)};border-radius:var(--r);padding:20px;text-align:center;color:var(--at);font-weight:650;background:var(--as)}
/* 태블릿 · 휴대폰 */
@media(max-width:1000px){.hp-hg{grid-template-columns:1fr;gap:36px}.hp-ht{max-width:680px}.hp-vis{min-height:300px}.hp-mock{min-height:340px}.hp-g.g4,.hp-st.g4,.hp-st.g5{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-g.g3{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-st.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.hp-st::before{display:none}.hp-split,.hp-mapw{grid-template-columns:1fr;gap:24px}.hp-qk{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-ctab.two{grid-template-columns:1fr}.hp-fl{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:16px}.hp-fl li:nth-child(odd){border-left:0}.hp-fl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}.hp-fl.n3 li:nth-child(odd){border-left:1px solid ${al(T.ink, .09)}}.hp-fl.n3 li:first-child{border-left:0}}
@media(max-width:640px){.hp-w{padding:0 20px}.hp-s{padding:${px(48)} 0}.hp-hero{padding:${px(44)} 0 ${px(40)}}.hp-hero h1{font-size:${px(31)};line-height:1.22}.hp-hs{font-size:${px(16)};margin-top:14px}.hp-hb{margin-top:24px}.hp-hb .hp-btn{flex:1 1 auto;min-width:140px}.hp-tr{margin-top:20px;gap:6px 14px}.hp-hey{margin-bottom:16px}
.hp-vis{min-height:0}.hp-illu svg{max-width:340px}.hp-mock{display:block;min-height:0;max-width:340px;margin:0 auto;width:100%;padding-top:14px}.hp-mb,.hp-chip.c2{display:none}.hp-mf{position:relative;left:auto;top:auto;transform:none;width:100%}.hp-mc .hp-cov{aspect-ratio:16/6}.hp-chip{font-size:12px;padding:7px 11px}.hp-chip.c1{right:-4px;top:0}
.hp-sh{margin-bottom:22px}.hp-sh h2,.hp-prose h2,.hp-ctat h2{font-size:${px(25)}}.hp-sd{font-size:${px(15.5)}}
.hp-g.g2,.hp-g.g3,.hp-g.g4{grid-template-columns:1fr;gap:12px}.hp-feat .hp-card,.hp-tiles .hp-card,.hp-ppl .hp-card{display:grid;grid-template-columns:auto 1fr;column-gap:16px;row-gap:2px;padding:18px;align-items:start}.hp-feat .hp-ic,.hp-tiles .hp-ic,.hp-ppl .hp-av{grid-row:span 2;margin:0;width:44px;height:44px}.hp-feat .hp-card h3,.hp-tiles .hp-card h3,.hp-ppl .hp-card h3{font-size:${px(16.5)};align-self:center}
.hp-st.g2,.hp-st.g3,.hp-st.g4,.hp-st.g5{grid-template-columns:1fr;gap:0}.hp-st li{flex-direction:row;gap:16px;padding-bottom:22px}.hp-st li:not(:last-child)::after{content:'';position:absolute;left:${px(21)};top:${px(48)};bottom:4px;width:2px;background:${al(T.a, .25)}}.hp-no{width:${px(44)};height:${px(44)};font-size:${px(17)};flex:none}.hp-st h3{font-size:${px(17)}}
.hp-cg .hp-cc{flex-direction:row}.hp-cg .hp-cov{width:112px;aspect-ratio:auto;min-height:0;padding:10px;flex:none}.hp-cg .hp-ckd{display:none}.hp-cg .hp-cic{width:44px;height:44px;margin:auto}.hp-cg .hp-ccb{padding:14px 16px;gap:6px}.hp-cg .hp-ccb h3{font-size:${px(16)}}.hp-cg .hp-cp{padding-top:6px}.hp-cc.one .hp-cov{width:112px;min-height:0}.hp-cc.one .hp-ccb{padding:16px}.hp-cc.one h3{font-size:${px(17)}}
.hp-shr{display:block}.hp-shr .hp-all{margin:-8px 0 18px}.hp-fl,.hp-fl.n3{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-fl.n3 li:nth-child(3){grid-column:1/-1}.hp-fl.n3 li:nth-child(odd){border-left:0}.hp-fl.n3 li:nth-child(2){border-left:1px solid ${al(T.ink, .09)}}.hp-facts{padding:${px(28)} 0}
.hp-nl li{flex-wrap:wrap;gap:6px 10px;padding:14px 2px}.hp-nl b{flex-basis:100%;order:2;white-space:normal}.hp-nl time{order:1;margin-left:auto}
.hp-qk{grid-template-columns:1fr 1fr;gap:8px;margin-top:28px}.hp-qk a{padding:12px;gap:10px;font-size:${px(14.5)}}.hp-qk a i{width:34px;height:34px}.hp-qk a>svg{display:none}
.hp-cta{padding:${px(12)} 0 ${px(48)}}.hp-ctab{padding:30px 22px;gap:22px}.hp-ctaf .hp-btn{width:100%}.hp-dl div,.hp-tll li{grid-template-columns:1fr;gap:4px}.hp-mapv{min-height:200px}.hp-qa details{padding:0 16px}.hp-qa summary{font-size:${px(15.5)};padding:15px 0}}
${th.illu === 'kids' ? `.hp-hero h1 em{background:linear-gradient(transparent 62%,#FFD25E 62%);color:var(--hi)}.hp-card{border-radius:var(--r)}.hp-feat .hp-g>.hp-card:nth-child(4n+1) .hp-ic{background:#F3E8FF;color:#6D28D9}.hp-feat .hp-g>.hp-card:nth-child(4n+2) .hp-ic{background:#FEF3C7;color:#92400E}.hp-feat .hp-g>.hp-card:nth-child(4n+3) .hp-ic{background:#D1FAE5;color:#065F46}.hp-feat .hp-g>.hp-card:nth-child(4n+4) .hp-ic{background:#FCE7F3;color:#9D174D}` : ''}
${th.illu === 'campus' ? `.hp-sh h2{font-weight:750;letter-spacing:-.02em}.hp-ey{letter-spacing:.2em}.hp-hero h1{font-weight:780}` : ''}
${th.lux ? `.hp-hero h1{font-weight:700;letter-spacing:-.025em}.hp-ey{letter-spacing:.24em}.hp-sh h2{font-weight:750}.hp-cta .hp-ctab{background:linear-gradient(120deg,${T.hb},${mix(T.hb, '#1E293B', .5)});box-shadow:inset 0 0 0 1px ${al(T.a, .35)}}.hp-cta .hp-ctat .hp-ey{color:${T.ha}}.hp-cta .hp-btn.inv{background:var(--a);color:var(--on)}.hp-cta .hp-ci i{color:#111827}` : ''}`;
  }
  /* 미리보기 · 게시본에 CSS 넣기 */
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); const th = thOf(s); if (!th) return h;
    try { return h.replace('</style>', css(s) + `header.gh .hr .l,header.gh .logo i{background:${tok(s, th).a};color:${tok(s, th).on}}</style>`).replace(/<body class="([^"]*)"/, `<body class="$1 hpt-on hpt-${s.theme}"`); } catch (e) { console.error('hpth css', e); return h; } }; window.siteHTML = siteHTML; }

  /* ── 섹션 보강(규칙 설계 · AI 설계 공통, 여러 번 불러도 같은 결과) ── */
  const S2x = (type, data) => (typeof S2 === 'function' ? S2(type, data) : { id: uid('s'), type, data });
  const TYPE_COPY = {
    public: { ey: 'PUBLIC LEARNING', t: n => `${n}\n일 잘하는 공직 역량`, sub: '법정의무교육부터 직무 · 데이터 · AI 역량까지, 필요한 교육을 기수별로 이수하고 기록합니다.', feat: [['법정의무교육', '기한 안에 이수 · 이수증 발급'], ['직무 역량', '민원 · 행정 · 기획 실무'], ['데이터 · AI', '업무에 바로 쓰는 디지털 역량'], ['이수 기록', '기수별 이수 현황 관리']], steps: [['과정 확인', '나에게 배정된 과정을 확인합니다'], ['학습', '영상 · 퀴즈로 배웁니다'], ['이수', '기준을 채우면 이수증을 받습니다']] },
    univ_lms: { ey: 'LEARNING MANAGEMENT', t: n => `${n}\n수업과 학습을 한 곳에서`, sub: '강의 자료 · 과제 · 출석 · 공지를 학기 단위로 확인합니다.', feat: [['강의실', '수업 자료와 공지를 한 곳에'], ['과제 · 시험', '제출과 피드백을 온라인으로'], ['출석 확인', '내 출결을 바로 확인'], ['학습 기록', '학기별 학습 이력']], steps: [['로그인', '학번으로 로그인합니다'], ['강의실 입장', '수강 중인 강의를 엽니다'], ['학습 · 제출', '자료를 보고 과제를 냅니다']] }
  };
  function enrich(s) { if (!s || !Array.isArray(s.sections)) return s; const L = s.sections; const ty = S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type;
    /* 기관 유형에 맞지 않는 기본 문구(성인 학원 문구)를 유형 문구로 */
    const cp = TYPE_COPY[ty]; const b0 = L[0] && L[0].type === 'banner' ? L[0].data : null;
    if (cp && b0 && b0.eyebrow === 'ONLINE CLASS') { const n = S.org.name; b0.eyebrow = cp.ey; b0.title = cp.t(n); b0.sub = cp.sub;
      const f = L.find(x => x.type === 'text' && x.data && x.data.variant === 'features' && x.data.eyebrow === 'ABOUT'); if (f) f.data.cols = cp.feat.map(r => r.slice());
      const st = L.find(x => x.type === 'text' && x.data && x.data.variant === 'steps'); if (st) st.data.cols = cp.steps.map(r => r.slice()); }
    const has = k => L.some(x => x.data && x.data.hpt === k);
    const at = i => Math.max(1, Math.min(i, L.length));
    if (!has('facts')) L.splice(L[0] && L[0].type === 'banner' ? 1 : 0, 0, S2x('text', { variant: 'stats', hpt: 'facts', title: '', cols: [] }));
    const P = people(); if (P.length && !has('people') && !L.some(x => x.data && x.data.variant === 'profiles')) { const ci = L.findIndex(x => x.type === 'classes'); L.splice(ci >= 0 ? ci + 1 : at(3), 0, S2x('text', { variant: 'profiles', hpt: 'people', eyebrow: 'TEACHERS', title: '함께하는 강사진', cols: P })); }
    const Q = faq(); if (Q.length >= 2 && !has('faq')) { let k = L.findIndex(x => x.type === 'notices'); if (k < 0) k = L.findIndex(x => (x.type === 'text' && x.data && x.data.variant === 'cta') || x.type === 'map'); L.splice(k >= 0 ? k : L.length, 0, S2x('text', { variant: 'info', hpt: 'faq', eyebrow: 'FAQ', title: '자주 묻는 질문', cols: Q })); }
    /* '시작 방법' 4칸 고정 → 내용 수만큼(렌더러가 칸을 맞춤), 문의 띠의 자리 문구 정리 */
    L.forEach(x => { const d = x.data || {}; if (x.type === 'text' && d.variant === 'cta' && Array.isArray(d.cols)) d.cols = d.cols.filter(r => r && r[1] && !isPh(r[1])); });
    return s; }

  /* ── 테마 적용 ── */
  function apply(s, id, opt) { opt = opt || {}; if (!s) return s; const th = TH[id] ? TH[id] : TH[pick(S.org.type, S.org.ed, '')]; const key = TH[id] ? id : Object.keys(TH).find(k => TH[k] === th);
    const prevTh = s.theme && TH[s.theme]; s.theme = key; s.look = th.look; /* HPT가 없는 화면(기존 렌더러)에서도 비슷한 룩 */
    const userColor = opt.color && ok6(opt.color) ? opt.color : null;
    if (userColor) s.color = userColor; else if (!opt.keepColor || !ok6(s.color) || (prevTh && s.color === prevTh.acc)) s.color = th.acc;
    s.tone = th.br >= 20 ? '친근' : th.r <= 8 ? '신뢰' : s.tone || '모던';
    return s; }
  function thumb(s, id) { const base = JSON.parse(JSON.stringify(s || site())); apply(base, id, { keepColor: false }); const th = TH[base.theme]; const T = tok(base, th);
    const secs = (base.sections || []).filter(x => !x.hide); const hero0 = secs.find(x => x.type === 'banner') || { type: 'banner', data: { eyebrow: 'WELCOME', title: S.org.name, sub: '', cta: `${t('cls')} 둘러보기` } };
    const rest = secs.filter(x => x !== hero0 && x.type === 'text' && x.data && ['features', 'steps'].includes(x.data.variant)).slice(0, 1);
    band = 0; const body = [hero(hero0.data || {}, base, th, T), ...rest.map(x => textSec(x.data, base, th, T, true, x) || '')].join('');
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=1280"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{margin:0;background:${th.bg}}${css(base)}</style></head><body>${body}</body></html>`; }
  const list = IDS.map(id => ({ id, name: TH[id].name, desc: TH[id].desc, swatch: [TH[id].acc, TH[id].hero === 'dark' ? TH[id].hb : TH[id].bg === '#FFFFFF' ? TH[id].alt : TH[id].bg, TH[id].sw2] }));
  window.HPT = { list, apply, thumb, pick, enrich, facts, css, tokens: s => thOf(s) ? tok(s, thOf(s)) : null, has: id => !!TH[id] };

  /* ── AI로 만든 초안에 테마 · 보강 자동 적용(hpRun → HPE.draft) ── */
  if (typeof HPE !== 'undefined' && HPE && !Object.getOwnPropertyDescriptor(HPE, 'draft')?.set) { let cur = HPE.draft;
    Object.defineProperty(HPE, 'draft', { configurable: true, enumerable: true, get: () => cur, set: v => {
      try { if (v && v.site && Array.isArray(v.site.sections)) { const o = v.o || {}; const brief = String(o.brief || '');
        const id = o.theme && TH[o.theme] ? o.theme : v.site.theme && TH[v.site.theme] ? v.site.theme : pick(S.org.type, S.org.ed, brief);
        const keep = !!(o.color && ok6(o.color)) || /파랑|파란|블루|blue|보라|퍼플|주황|오렌지|네이비|남색|초록|녹색|그린|green|빨강|레드|핑크|분홍|민트|청록|노랑|옐로|검정|블랙/i.test(brief) || (v.via && v.via !== '기본 설계');
        apply(v.site, id, { keepColor: keep, color: o.color }); enrich(v.site); } } catch (e) { console.error('hpth draft', e); }
      cur = v; } }); }

  /* ── 게시본에 테마 정보(학습자 화면 바깥 틀 색 맞춤 · lhpth.js) ── */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { const s = site(); const th = thOf(s); if (r && r.hp && th) { const T = tok(s, th); r.hp.theme = { id: s.theme, a: T.a, on: T.on, at: T.at, as: T.as, bg: th.bg, alt: th.alt, ink: T.ink, r: th.r, br: th.br }; } } catch (e) { console.error('hpth snap', e); } return r; }; }
})();
