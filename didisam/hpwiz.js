/* v34.2 hpwiz — 「AI로 홈페이지 만들기」를 3단계 마법사로(대표님 2026-11-08: 'AI로 높은 퀄리티의 홈페이지를 정말 쉽게 만들 수 있게 해줘. 지금보다 더.')
   ① 테마 고르기(window.HPT가 있으면 HPT.thumb 썸네일, 없으면 기존 룩 8종) → ② 한 줄 설명(기관 유형 · 공개 강좌로 미리 채움, 참고 주소 · 색 · 로고는 '더 자세히')
   → ③ 시안 3개(구성 · 첫 화면 배치가 서로 다름)를 나란히 놓고 고르기 → [적용](바로 고치기) 또는 [적용하고 게시]. 사이트 화면에서 게시까지 4번 누름.
   - 품질 점수(100점)와 자동 보정: 대비 · 빈 섹션 · 자리 문구 · 대체 텍스트 · 휴대폰 넘침 · SEO · 주 버튼 · 연락처 · 사실(숫자). 적용 전에 한 줄씩 보여 주고 자동으로 고친다.
   - 말로 고치기: AI SAM 대화 · 바로 고치기 화면에서 '더 고급스럽게' · '색을 초록으로' · '첫 화면 문구 바꿔줘' · '후기 섹션 빼줘' · '테마 바꿔줘'
     → 계획 카드 → 미리보기 → 적용 · 되돌리기. 키가 없어도 규칙으로 처리(slim-ai 의도 엔진보다 앞에서 홈페이지 문장만 잡는다).
   - Claude 프롬프트 보강: 섹션 구성 지침 · 짧고 구체적인 카피 · 사실만 · 테마 id 선택 · 시안 2개 추가(alts).
   사실만: 숫자는 실제 데이터(공개 강좌 수 · 수강생 수)만, 후기는 실제 수강후기가 있을 때만, 연락처는 입력된 값만 쓴다. hpai.js의 함수는 감싸서 쓰고 고치지 않는다. */
(function () {
  'use strict';
  if (typeof ACT === 'undefined' || typeof HPE === 'undefined') return;
  const W = window.HPW = { st: null, plans: {}, snaps: {}, want3: null };
  const hasT = () => !!(window.HPT && Array.isArray(HPT.list) && HPT.list.length && typeof HPT.apply === 'function');
  const aiOn = () => typeof CL !== 'undefined' && CL.on && CL.on('site');
  const clone = o => JSON.parse(JSON.stringify(o));
  const A = v => Array.isArray(v) ? v : [];
  const N = () => (typeof spOrg === 'function' ? spOrg() : '') || S.org.name;
  const tyKey = () => S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type;
  const tyName = () => (typeof TYPES !== 'undefined' && TYPES[S.org.type] ? TYPES[S.org.type].name : '') || '교육기관';
  const K = () => t('cls'), L = () => t('learner');
  const ft = () => (S.settings && S.settings.footer) || {};
  const pubList = () => { const P = (S.classes || []).filter(c => c.open === '전체' && c.status !== '종료'); const R = P.filter(c => c.status === '운영중'); return R.length ? R : P; };
  const reviewsReal = () => (S.posts || []).filter(p => p.board === '수강후기' && !p.hidden);
  const noticesReal = () => [...A(S.notices), ...(S.classes || []).flatMap(c => A(c.notices))];
  const learnersN = () => (S.members || []).filter(m => !m.withdrawn && m.grade !== '승인 대기' && m.grade !== '거절').length;
  const n0x = n => typeof n0 === 'function' ? n0(n) : String(n);
  const eul = w => { const c = String(w || '').trim().slice(-1).charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? (c % 28 ? '을' : '를') : '을(를)'; };
  const HERO_L = () => hasT() ? { center: '가운데 첫 화면', split: '좌우 분할 첫 화면', bg: '배경형 첫 화면' } : { center: '테마 기본 첫 화면', split: '진한 배경 · 왼쪽 정렬', bg: '진한 배경 · 가운데' };

  /* ═════════ 테마 목록: HPT 우선, 없으면 기존 룩 ═════════ */
  const LK_COL = { navyGlow: '#3B5BDB', mintSoft: '#5C74F6', senior: '#2F6FE4', brandBold: '#2563EB', corpPortal: '#1E3A8A', storyNumbered: '#0F766E', publicTiles: '#1E40AF', campus: '#2A2B2B' };
  const LK_DESC = { navyGlow: '어두운 첫 화면 · 빛나는 강조', mintSoft: '부드러운 그라데이션 · 친근함', senior: '큰 글씨 · 넓은 버튼', brandBold: '브랜드 색 배너 · 리포트 카드', corpPortal: '단정한 기업 포털', storyNumbered: '번호로 풀어 가는 이야기', publicTiles: '공공기관 바로가기 타일', campus: '캠퍼스 · 일정표형' };
  const REC_LOOK = { corp: 'corpPortal', univ: 'campus', univ_lms: 'campus', k12: 'brandBold', adult: 'mintSoft', lifelong: 'senior', voc: 'publicTiles', public: 'publicTiles' };
  const REC_HPT = { corp: /clean|modern|모던|깔끔|corp/i, univ: /official|공식|clean|campus/i, univ_lms: /official|공식|clean|campus/i, k12: /warm|따뜻|학원|kids|키즈/i, adult: /modern|clean|모던|깔끔/i, lifelong: /warm|따뜻|senior|큰/i, voc: /tech|테크|official|공식/i, public: /official|공식|public|기관/i };
  function themes() {
    if (hasT()) return HPT.list.map(x => ({ id: String(x.id), name: String(x.name || x.id), desc: String(x.desc || ''), sw: A(x.swatch).slice(0, 3), hpt: true }));
    return Object.keys(typeof LOOKS !== 'undefined' ? LOOKS : {}).map(k => { const c = LK_COL[k] || '#5C74F6'; return { id: k, name: LOOKS[k].n, desc: LK_DESC[k] || '', sw: [c, mixc(c, '#ffffff', .82), '#ffffff'] }; });
  }
  function recTheme() {
    const T = themes(); if (!T.length) return '';
    if (hasT()) { try { if (typeof HPT.rec === 'function') { const r = HPT.rec(tyKey()); if (T.some(x => x.id === r)) return r; } } catch (e) { }
      const re = REC_HPT[tyKey()]; const hit = re && T.find(x => re.test(x.id + ' ' + x.name + ' ' + x.desc)); return (hit || T[0]).id; }
    return REC_LOOK[tyKey()] || T[0].id;
  }
  const curTheme = s => (s && (s.hpTheme || s.look)) || '';
  /* 테마 적용: HPT.apply 또는 룩 · 대표 색 */
  function applyTheme(s, id, keepColor) {
    if (hasT() && HPT.list.some(x => String(x.id) === id)) { const col = s.color; let r = null; try { r = HPT.apply(s, id); } catch (e) { console.error('HPT.apply', e); } s = r && typeof r === 'object' ? r : s; s.hpTheme = id; if (keepColor && col) s.color = col; return s; }
    if (typeof LOOKS !== 'undefined' && LOOKS[id]) { s.look = id; s.hpTheme = id; if (!keepColor) s.color = LK_COL[id] || s.color; }
    return s;
  }
  function themeThumb(id) {
    const T = themes().find(x => x.id === id) || {};
    if (T.hpt && typeof HPT.thumb === 'function') { let h = ''; try { h = String(HPT.thumb(site(), id) || ''); } catch (e) { h = ''; }
      if (h) return /<html|<!doctype|<body/i.test(h) ? `<iframe class="hpw-tf" title="${esc(T.name)} 미리보기" sandbox="allow-same-origin" srcdoc="${esc(h)}" tabindex="-1"></iframe>` : `<div class="hpw-tt" aria-hidden="true">${h}</div>`; }
    const c = T.sw && T.sw[0] || '#5C74F6';
    return `<div class="hpw-mini lk-${esc(id)}" style="--c:${esc(c)};--c2:${esc(mixc(c, '#ffffff', .85))}" aria-hidden="true"><i class="hm-b"></i><div class="hm-h"><i class="t1"></i><i class="t2"></i><i class="bt"></i><i class="vis"></i></div><div class="hm-c"><i></i><i></i><i></i></div></div>`;
  }

  /* ═════════ 실제 데이터로만 만드는 섹션 ═════════ */
  function facts() {
    const P = pubList(); const ftx = ft();
    return { 공개강좌수: P.length, 운영중강좌수: (S.classes || []).filter(c => c.status === '운영중').length, [`${L()}수`]: learnersN(), 실제후기수: reviewsReal().length, 공지수: noticesReal().length,
      연락처: { 전화: ftx.tel || '', 이메일: ftx.mail || '', 주소: ftx.addr || '' } };
  }
  function statsCols() {
    const R = []; const p = pubList().length; const m = learnersN();
    if (p) R.push([n0x(p), `개 ${K()} 운영 중`]); if (m) R.push([n0x(m), `명 ${L()}`]);
    return R.slice(0, 4);
  }
  const allowedNums = () => new Set(statsCols().map(r => String(r[0]).replace(/,/g, '')));
  function contactRows() { const f = ft(); const R = []; if (f.tel) R.push(['전화', f.tel]); if (f.mail) R.push(['이메일', f.mail]); if (f.addr) R.push(['주소', f.addr]); return R; }
  function contactSec() {
    const R = contactRows();
    return { type: 'text', variant: 'cta', eyebrow: 'CONTACT', title: '궁금한 점이 있으신가요?', body: `${N()}에 편하게 문의해 주세요.`, cta: '문의하기', cols: R.length ? R : [['문의 게시판', '커뮤니티 게시판에 질문을 남겨 주세요']] };
  }
  function guideSec() {
    const P = pubList(); const R = [];
    const pr = P.map(c => +c.price || 0); if (P.length) { const mn = Math.min(...pr), mx = Math.max(...pr); R.push([t('fee') || '수강료', mx === 0 ? '무료' : mn === mx ? won(mn) : `${mn ? won(mn) : '무료'} ~ ${won(mx)}`]); }
    const c0 = P.find(c => c.period && (c.period.mode === 'days' ? c.period.days : c.start)); if (c0) R.push(['수강 기간', c0.period.mode === 'days' ? `신청일부터 ${c0.period.days}일` : [c0.start, c0.end].filter(Boolean).join(' ~ ')]);
    R.push(['신청 방법', S.org.type === 'corp' ? '포털에 로그인한 뒤 과정을 신청합니다' : S.org.type === 'k12' ? '상담을 신청하면 수준에 맞는 반을 안내합니다' : '회원 가입 후 온라인으로 신청합니다']);
    const f = ft(); R.push(['문의', f.tel || f.mail || '커뮤니티 게시판']);
    return R.length >= 2 ? { type: 'text', variant: 'info', eyebrow: 'GUIDE', title: `${K()} 수강 안내`, cols: R } : null;
  }
  /* 유형별 첫 화면 문구 — 시안 B(강좌 중심) · C(안내 중심) */
  const COPY = {
    adult: [['{n}\n실무 강좌를 한곳에서', '지금 신청할 수 있는 강좌를 비교하고 바로 수강하세요.'], ['처음이어도\n{n}에서 쉽게 시작', '강좌 고르기부터 수료까지, 수강 방법을 한눈에 안내합니다.']],
    k12: [['{n}\n학년 · 과목별 수업 안내', '수업을 확인하고 상담을 신청하세요.'], ['{n}\n보호자와 함께 보는 학습 관리', '상담부터 반 배정, 수업 기록까지 과정을 안내합니다.']],
    univ: [['{n}\n이번 학기 프로그램', '교과 · 비교과 프로그램을 확인하고 바로 신청하세요.'], ['{n}\n학습 지원 안내', '로그인부터 신청 · 이수까지 이용 방법을 안내합니다.']],
    univ_lms: [['{n}\n온라인 강의실', '수강 중인 교과목의 강의 · 과제 · 시험을 한 곳에서 확인하세요.'], ['{n}\n강의실 이용 안내', '로그인부터 출석 · 과제 제출까지 이용 방법을 안내합니다.']],
    corp: [['{n}\n이번 분기 교육과정', '배정된 과정과 신청할 수 있는 과정을 한눈에 확인하세요.'], ['{n}\n교육 이수 안내', '과정 확인부터 이수증 발급까지 절차를 안내합니다.']],
    public: [['{n}\n모집 중인 교육', '공개 교육을 확인하고 온라인으로 신청하세요.'], ['{n}\n교육 신청 안내', '교육 찾기부터 신청 · 수료까지 차례대로 안내합니다.']],
    lifelong: [['{n}\n이번 학기 강좌 모집', '생활 · 직업 · 인문 강좌를 확인하고 신청하세요.'], ['{n}\n수강 신청 안내', '강좌 찾기부터 신청 · 참여까지 차례대로 안내합니다.']],
    voc: [['{n}\n모집 중인 훈련과정', '훈련 과정과 일정, 수강료를 확인하고 상담을 신청하세요.'], ['{n}\n훈련 신청 절차', '상담부터 카드 확인, 훈련 · 수료까지 절차를 안내합니다.']]
  };
  const PUB = { ey: 'PUBLIC EDUCATION', hero: n => [`${n}\n누구나 배우는 공공 교육`, '기관이 운영하는 교육을 온라인으로 신청하고 수강하세요.'], feat: [['온라인 수강', '언제 어디서나 듣는 공개 교육'], ['쉬운 신청', '회원 가입 후 바로 신청'], ['수료 기록', '이수 내역을 한곳에서 확인'], ['공지 · 안내', '교육 일정과 공지를 한눈에']], steps: [['교육 찾기', '관심 있는 교육을 찾습니다'], ['신청', '회원 가입 후 신청합니다'], ['수강 · 수료', '기준을 채우면 수료가 기록됩니다']] };
  const fill = (s, n) => String(s).replace(/\{n\}/g, n);

  /* 규칙 설계 보정: 공공기관 유형 문구(hpLocal은 성인 학원 문구로 대체됨) */
  function patchLocal(j) {
    if (S.org.type !== 'public') return j; const n = N();
    A(j.sections).forEach(x => { if (x.type === 'banner') { x.eyebrow = PUB.ey; const [a, b] = PUB.hero(n); if (!/,\n/.test(x.title || '')) x.title = a; x.sub = b; }
      if (x.type === 'text' && x.variant === 'features') x.cols = PUB.feat; if (x.type === 'text' && x.variant === 'steps') x.cols = PUB.steps; });
    return j;
  }
  /* 시안 3개: A 균형형(가운데 첫 화면) · B 강좌 중심(좌우 분할 + 강좌 카드) · C 안내 중심(배경형 + 수강 안내) */
  function variants(j, local) {
    const base = A(j.sections); const find = (ty, v) => base.find(x => x && x.type === ty && (!v || x.variant === v));
    const banner = find('banner') || { type: 'banner', title: N(), sub: '', cta: `${K()} 둘러보기`, cta2: '문의하기' };
    const feat = find('text', 'features'), steps = find('text', 'steps'), cls = find('classes') || { type: 'classes', eyebrow: 'CLASSES', title: `지금 신청할 수 있는 ${K()}` };
    const rv = reviewsReal().length ? (find('reviews') || { type: 'reviews', eyebrow: 'REVIEWS', title: '수강후기' }) : null; const nt = noticesReal().length ? (find('notices') || { type: 'notices', title: '공지사항' }) : null;
    const st = statsCols(); const stats = st.length >= 2 ? { type: 'text', variant: 'stats', cols: st } : null;
    const keep = base.filter(x => x && !['banner', 'classes', 'notices', 'reviews', 'map'].includes(x.type) && !(x.type === 'text' && ['features', 'steps', 'cta', 'stats'].includes(x.variant)));
    const clean = L0 => L0.filter(Boolean).filter(x => x.type !== 'reviews' || rv);
    const n = N(); const cp = COPY[tyKey()] || COPY.adult;
    const bB = { ...banner, eyebrow: banner.eyebrow || 'CLASSES', title: fill(cp[0][0], n), sub: cp[0][1], cta: `${K()} 신청하기`, cta2: '문의하기' };
    const bC = { ...banner, eyebrow: banner.eyebrow || 'GUIDE', title: fill(cp[1][0], n), sub: cp[1][1], cta: '수강 안내 보기', cta2: `${K()} 둘러보기` };
    const out = [{ id: 'a', name: '균형형', hero: 'center', desc: '소개 → 강좌 → 시작 방법 → 문의', j: { ...j, sections: clean([banner, feat, cls, steps, ...keep, nt, rv, contactSec()]) } }];
    const alts = local ? [] : A(j.alts).filter(a => a && A(a.sections).length >= 3 && A(a.sections)[0].type === 'banner').slice(0, 2);
    if (alts[0]) out.push({ id: 'b', name: String(alts[0].name || '강좌 중심').slice(0, 12), hero: /^(split|bg|center)$/.test(alts[0].hero) ? alts[0].hero : 'split', desc: String(alts[0].desc || '강좌 카드를 먼저').slice(0, 30), j: { ...j, sections: clean(alts[0].sections) } });
    else out.push({ id: 'b', name: '강좌 중심', hero: 'split', desc: '강좌 카드 → 숫자 → 시작 방법 → 특징', j: { ...j, sections: clean([bB, cls, stats, steps, feat, rv, contactSec()]) } });
    if (alts[1]) out.push({ id: 'c', name: String(alts[1].name || '안내 중심').slice(0, 12), hero: /^(split|bg|center)$/.test(alts[1].hero) ? alts[1].hero : 'bg', desc: String(alts[1].desc || '수강 안내를 먼저').slice(0, 30), j: { ...j, sections: clean(alts[1].sections) } });
    else out.push({ id: 'c', name: '안내 중심', hero: 'bg', desc: '수강 안내 → 강좌 → 공지 → 문의', j: { ...j, sections: clean([bC, guideSec(), cls, steps, nt, rv, contactSec()]) } });
    return out;
  }
  /* hpMake 결과에 시안 표시 · 테마 · 강좌 칩(실제 공개 강좌) · 버튼 연결 */
  function finish(d, v, st) {
    d.hpHero = v.hero; d.hpVar = v.id;
    const bn = A(d.sections).find(x => x.type === 'banner'); if (bn && bn.data) { bn.data.hero = v.hero; if (!bn.data.link) bn.data.link = 'learn:shop';
      if (!hasT()) { if (v.hero === 'split') { bn.data.dstyle = 2; bn.data.align = 'left'; } else if (v.hero === 'bg') { bn.data.dstyle = 2; bn.data.align = 'center'; } }
      if (v.hero === 'split') { const P = pubList().slice(0, 3); if (P.length) bn.data.chips = P.map((c, k) => [String(k + 1).padStart(2, '0'), String(c.name).slice(0, 18), +c.price ? won(c.price) : '무료']); } }
    A(d.sections).forEach(x => { if (x.type === 'text' && x.data && x.data.variant === 'cta' && !x.data.link) x.data.link = 'learn:comm'; });
    if (st.theme) d = applyTheme(d, st.theme, !!(st.colorOn && st.color));
    if (st.colorOn && /^#[0-9a-f]{6}$/i.test(st.color || '')) d.color = st.color;
    if (st.logo) d.gnb = Object.assign({}, typeof d.gnb === 'object' ? d.gnb : {}, { logo: st.logo });
    if (d.ai) d.ai.summary = `${v.name} — ${v.desc}`;
    return d;
  }

  /* ═════════ 품질 점수(100점)와 자동 보정 ═════════ */
  const lumOf = h => { const [r, g, b] = hx(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const cRatio = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const PH = /(입력하세요|입력해\s*주세요|채워\s*주세요|Lorem|ipsum|OOO|○○○|대표번호|센터 주소|예시 문구|설명을 입력|내용을 입력)/i;
  const strs = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach(v => strs(v, out)); else if (o && typeof o === 'object') Object.keys(o).forEach(k => { if (!/^(id|type|variant|link|link2|img|src|url|ids|layout|hero|dstyle|align|bg)$/.test(k)) strs(o[k], out); }); return out; };
  const live = s => A(s.sections).filter(x => x && !x.hide);
  function emptyOf(x) {
    const d = x.data || {}; const cols = A(d.cols);
    switch (x.type) {
      case 'banner': return !String(d.title || '').trim();
      case 'text': return d.variant && d.variant !== 'cta' && d.variant !== 'plain' ? !cols.length : (!String(d.title || '').trim() && !String(typeof d.body === 'string' ? d.body : '').trim() && !cols.length);
      case 'classes': return !pubList().length && !(A(d.ids).length && !d.auto);
      case 'notices': return !noticesReal().length;
      case 'reviews': return !reviewsReal().length;
      case 'image': return !d.img && !A(d.imgs).some(i => i && i.src);
      case 'video': return !d.url;
      case 'map': { const a = String(d.addr || ''), t2 = String(d.tel || ''); return (!a || PH.test(a)) && (!t2 || PH.test(t2)); }
      default: return false;
    }
  }
  const longTok = s => String(s || '').split(/[\s\n]+/).some(w => w.replace(/​/g, '').length > (/[가-힣]/.test(w) ? 12 : 20) && !w.includes('​'));
  function seoOf(s) { const se = Object.assign({}, (S.settings && S.settings.seo) || {}); const a = s.aiSeo || {}; return { title: se.title || a.title || '', desc: se.desc || a.desc || '' }; }
  function hpwQuality(s) {
    s = s || site(); const secs = live(s); const bn = secs.find(x => x.type === 'banner'); const it = [];
    const add = (k, label, pts, ok, note, auto) => it.push({ k, label, pts, ok: !!ok, note: note || '', auto: auto !== false });
    const col = /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#5C74F6'; const cr = cRatio(col, '#ffffff');
    add('contrast', '글자 대비', 15, cr >= 4.5, cr >= 4.5 ? `대표 색 대비 ${cr.toFixed(1)}:1` : `대표 색 위 흰 글자 대비 ${cr.toFixed(1)}:1 — 4.5:1 미만`);
    const em = secs.filter(emptyOf); add('empty', '빈 섹션', 15, !em.length, em.length ? `내용이 없는 섹션 ${em.length}개(${[...new Set(em.map(x => (SEC[x.type] || {}).n || x.type))].join(' · ')})` : '모든 섹션에 내용이 있습니다');
    const ph = secs.filter(x => strs(x.data).some(v => PH.test(v))); add('ph', '자리 문구', 15, !ph.length, ph.length ? `'입력하세요' 같은 자리 문구 ${ph.length}곳` : '자리 문구 없음');
    const na = secs.filter(x => (x.type === 'image' && A(x.data && x.data.imgs).some(i => i && i.src) && !(x.data.alt || x.data.title)) || (x.type === 'banner' && x.data && x.data.img && !x.data.alt));
    add('alt', '이미지 설명', 10, !na.length, na.length ? `설명(대체 텍스트)이 없는 이미지 ${na.length}개` : '이미지 설명 있음');
    const ov = secs.filter(x => { const d = x.data || {}; return longTok(d.title) || longTok(d.eyebrow) || A(d.cols).length > 6 || String(d.title || '').split('\n').length > 3; });
    add('mobile', '휴대폰 넘침', 10, !ov.length, ov.length ? `휴대폰에서 넘칠 수 있는 제목 ${ov.length}곳` : '휴대폰 390px에서 넘치는 제목 없음');
    const se = seoOf(s); const seoOk = se.title && se.title.length <= 60 && se.desc && se.desc.length >= 20 && se.desc.length <= 160;
    add('seo', '검색 제목 · 설명', 10, seoOk, seoOk ? `제목 ${se.title.length}자 · 설명 ${se.desc.length}자` : '검색 결과에 보일 제목 · 설명이 비었거나 길이가 맞지 않습니다');
    const ctas = secs.filter(x => x.type === 'text' && x.data && x.data.variant === 'cta').length; const bOk = bn && bn.data && bn.data.cta && bn.data.cta !== bn.data.cta2 && ctas <= 1;
    add('btn', '주 버튼', 10, bOk, bOk ? '첫 화면 주 버튼 1개 · 문의 블록 1개' : !bn || !bn.data || !bn.data.cta ? '첫 화면에 주 버튼이 없습니다' : ctas > 1 ? `문의 · 신청 블록이 ${ctas}개입니다` : '주 버튼과 보조 버튼 이름이 같습니다');
    const f = ft(); const cOk = !!(f.tel || f.mail); add('contact', '연락처', 10, cOk, cOk ? '전화 또는 이메일 있음' : '연락처(전화 · 이메일)가 비어 있습니다 — 아래에 입력하면 문의 블록에 들어갑니다', false);
    const ok = allowedNums(); const bad = secs.filter(x => { const d = x.data || {}; const nums = [...A(d.stats).map(r => r && r[0]), ...(x.type === 'text' && d.variant === 'stats' ? A(d.cols).map(r => r && r[0]) : [])].filter(v => /\d/.test(String(v || '')));
      return nums.some(v => !ok.has(String(v).replace(/,/g, ''))); });
    add('fact', '사실(숫자)', 5, !bad.length, bad.length ? `실제 데이터와 다른 숫자 ${bad.length}곳` : '숫자는 실제 데이터만');
    const score = it.reduce((a, x) => a + (x.ok ? x.pts : 0), 0);
    return { score, items: it };
  }
  const brk = s => String(s || '').split(/(\s+)/).map(w => { const lim = /[가-힣]/.test(w) ? 10 : 18; if (w.length <= lim + 2 || w.includes('​')) return w; return w.match(new RegExp(`.{1,${lim}}`, 'g')).join('​'); }).join('');
  function hpwFix(s0) {
    const s = clone(s0); const log = []; const secs = live(s);
    const col = /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#5C74F6'; if (cRatio(col, '#ffffff') < 4.5) { let c = col; for (let k = 1; k <= 20 && cRatio(c, '#ffffff') < 4.5; k++) c = mixc(col, '#000000', k * .05); s.color = c; log.push(`대표 색을 조금 진하게(${col} → ${c}) 바꿔 글자 대비를 4.5:1 이상으로 맞췄습니다`); }
    /* 자리 문구: 지도 섹션은 실제 연락처로, 나머지 글은 비움 */
    let phn = 0; secs.forEach(x => { const d = x.data || {};
      if (x.type === 'map') { const f = ft(); if (PH.test(d.addr || '') || !d.addr) { d.addr = f.addr || ''; phn++; } if (PH.test(d.tel || '') || !d.tel) { d.tel = f.tel || f.mail || ''; phn++; } return; }
      ['eyebrow', 'title', 'sub', 'body', 'cta', 'cta2', 'alt'].forEach(k => { if (typeof d[k] === 'string' && PH.test(d[k])) { d[k] = ''; phn++; } });
      if (Array.isArray(d.cols)) { const n0c = d.cols.length; d.cols = d.cols.filter(r => !strs(r).some(v => PH.test(v))); phn += n0c - d.cols.length; } });
    if (phn) log.push(`자리 문구 ${phn}곳을 지웠습니다`);
    /* 문의 블록: 실제 연락처로 다시 채움 · 둘 이상이면 하나만 */
    let ctaN = 0; secs.forEach(x => { const d = x.data || {}; if (x.type === 'text' && d.variant === 'cta') { ctaN++; if (ctaN > 1) { x.hide = true; return; } const R = contactRows(); const rest = A(d.cols).filter(r => !/^(전화|이메일|주소|운영 시간|문의 게시판)$/.test(r[0])); d.cols = [...R, ...rest].slice(0, 4); if (!d.cols.length) d.cols = [['문의 게시판', '커뮤니티 게시판에 질문을 남겨 주세요']]; } });
    if (ctaN > 1) log.push(`문의 · 신청 블록 ${ctaN - 1}개를 숨겨 하나만 남겼습니다`);
    const em = live(s).filter(emptyOf); em.forEach(x => { x.hide = true; }); if (em.length) log.push(`내용이 없는 섹션 ${em.length}개(${[...new Set(em.map(x => (SEC[x.type] || {}).n || x.type))].join(' · ')})를 숨겼습니다 — 내용이 생기면 [보이기]로 켜세요`);
    let an = 0; live(s).forEach(x => { const d = x.data || {}; if (x.type === 'image' && A(d.imgs).some(i => i && i.src) && !(d.alt || d.title)) { d.alt = `${N()} 사진`; an++; } if (x.type === 'banner' && d.img && !d.alt) { d.alt = `${N()} 대표 이미지`; an++; } });
    if (an) log.push(`이미지 ${an}개에 설명(대체 텍스트)을 넣었습니다`);
    let mo = 0; live(s).forEach(x => { const d = x.data || {}; ['title', 'eyebrow'].forEach(k => { if (longTok(d[k])) { d[k] = brk(d[k]); mo++; } }); if (String(d.title || '').split('\n').length > 3) { d.title = d.title.split('\n').slice(0, 3).join('\n'); mo++; } if (A(d.cols).length > 6) { d.cols = d.cols.slice(0, 6); mo++; } });
    if (mo) log.push(`휴대폰에서 넘칠 수 있는 제목 ${mo}곳을 줄바꿈되게 고쳤습니다`);
    const se = seoOf(s); if (!(se.title && se.title.length <= 60 && se.desc && se.desc.length >= 20 && se.desc.length <= 160)) { const bn = live(s).find(x => x.type === 'banner'); const sub = bn && bn.data ? String(bn.data.sub || '') : '';
      const desc = (sub.length >= 20 ? sub : `${S.org.name} ${tyName()} 홈페이지입니다. ${sub || `공개 ${K()}${eul(K())} 확인하고 온라인으로 신청하세요.`}`).replace(/\s+/g, ' ').slice(0, 155);
      s.aiSeo = Object.assign({}, s.aiSeo, { title: (se.title && se.title.length <= 60 ? se.title : `${S.org.name} | ${t('site') || '홈페이지'}`).slice(0, 60), desc: se.desc && se.desc.length >= 20 && se.desc.length <= 160 ? se.desc : desc, kw: (s.aiSeo && s.aiSeo.kw) || [S.org.name, tyName(), ...pubList().slice(0, 3).map(c => c.name)].join(', ').slice(0, 200) });
      s.hpSeoFix = 1; log.push('검색 결과에 보일 제목 · 설명을 채웠습니다'); }
    const bn = live(s).find(x => x.type === 'banner'); if (bn && bn.data) { const d = bn.data; if (!d.cta) { d.cta = `${K()} 둘러보기`; d.link = d.link || 'learn:shop'; log.push('첫 화면에 주 버튼을 넣었습니다'); } if (d.cta2 && d.cta2 === d.cta) { d.cta2 = ''; log.push('같은 이름의 보조 버튼을 뺐습니다'); } }
    const okN = allowedNums(); let fx = 0; live(s).forEach(x => { const d = x.data || {};
      if (A(d.stats).some(r => r && /\d/.test(String(r[0])) && !okN.has(String(r[0]).replace(/,/g, '')))) { const R = statsCols(); if (R.length >= 2) d.stats = R; else delete d.stats; fx++; }
      if (x.type === 'text' && d.variant === 'stats' && A(d.cols).some(r => r && /\d/.test(String(r[0])) && !okN.has(String(r[0]).replace(/,/g, '')))) { const R = statsCols(); if (R.length >= 2) d.cols = R; else x.hide = true; fx++; } });
    if (fx) log.push(`실제 데이터와 다른 숫자 ${fx}곳을 실제 값으로 바꾸거나 숨겼습니다`);
    return { site: s, log };
  }
  window.hpwQuality = hpwQuality; window.hpwFix = hpwFix;
  const qHTML = (q, q0, log, withContact) => {
    const f = ft(); const need = q.items.find(x => x.k === 'contact' && !x.ok);
    return `<div class="hpw-q" aria-live="polite"><div class="hpw-qs"><b class="hpw-score ${q.score >= 90 ? 'hi' : q.score >= 75 ? 'mid' : 'lo'}">${q.score}<small>점</small></b><div><b>품질 점수</b><small>${q0 && q0.score !== q.score ? `자동 보정 전 ${q0.score}점 → 보정 후 ${q.score}점` : '100점 만점'}</small></div></div>
      <ul class="hpw-ql">${q.items.map(x => { const was = q0 && q0.items.find(y => y.k === x.k); const fixed = x.ok && was && !was.ok; return `<li class="${x.ok ? (fixed ? 'fx' : 'ok') : 'no'}"><span class="hpw-qi" aria-hidden="true">${x.ok ? (fixed ? '↻' : '✓') : '!'}</span><b>${esc(x.label)}</b><small>${fixed ? '자동 보정 · ' : ''}${esc(x.note)}</small><em>${x.ok ? x.pts : 0}/${x.pts}</em></li>`; }).join('')}</ul>
      ${A(log).length ? `<details class="hpw-log"><summary>자동으로 고친 것 ${log.length}가지</summary><ul>${log.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}
      ${need && withContact ? `<div class="hpw-ct"><b>연락처 넣기(선택)</b><div class="hpw-ctr"><label>전화<input name="hwTel" inputmode="tel" maxlength="30" placeholder="051-000-0000" value="${esc(f.tel || '')}"></label><label>이메일<input name="hwMail" inputmode="email" maxlength="80" placeholder="info@example.com" value="${esc(f.mail || '')}"></label></div><small>입력하면 문의 블록 · 푸터에 들어갑니다. 비워 두면 문의 게시판으로 안내합니다.</small></div>` : ''}</div>`;
  };

  /* ═════════ 마법사 ═════════ */
  function defaultBrief() {
    const P = pubList(); const n = S.org.name; const names = P.slice(0, 2).map(c => c.name).join(' · ');
    const who = { adult: '직장인 · 성인 수강생', k12: '학생과 보호자', univ: '재학생', univ_lms: '수강 학생', corp: '임직원', public: '시민', lifelong: '지역 주민', voc: '훈련 희망자' }[tyKey()] || '학습자';
    return `${n}의 ${tyName()} 홈페이지입니다. ${who}에게 ${names ? `${names} 등 공개 ${K()}${eul(K())}` : `${K()}${eul(K())}`} 소개하고, 신청 방법과 문의를 깔끔하고 믿음직하게 보여 주세요.`;
  }
  function hpwOpen(pre) {
    pre = pre || {}; const last = (S.site && S.site.ai) || {};
    W.st = { step: 1, theme: curTheme(S.site) && themes().some(x => x.id === curTheme(S.site)) && S.site.ai ? curTheme(S.site) : recTheme(), rec: recTheme(), brief: pre.brief || last.brief || defaultBrief(), url: pre.url || '', tone: pre.tone || '', pasted: pre.pasted || '',
      color: (S.site && S.site.color) || '#5C74F6', colorOn: false, logo: '', drafts: [], pick: 0, busy: false, notes: [], via: '' };
    if (pre.brief || pre.url) W.st.step = 1;
    const w = modal('AI로 홈페이지 만들기', `<div id="hpwBox" class="hpw"></div>`, [], true); w.classList.add('hpai-m', 'hpai-wide', 'hpw-m');
    w.addEventListener('click', onClick); w.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('[data-hw="pick"],[data-hw="theme"]'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); } });
    paint();
  }
  window.hpwOpen = hpwOpen;
  const box = () => $('#hpwBox');
  function grab() { const w = $('#modal'); const st = W.st; if (!w || !st) return; const v = n => { const e = w.querySelector(`[name="${n}"]`); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : undefined; };
    if (st.step === 2) { ['brief', 'url', 'tone', 'pasted', 'color'].forEach(k => { const x = v('hw_' + k); if (x !== undefined) st[k] = x; }); const c = v('hw_colorOn'); if (c !== undefined) st.colorOn = c; }
    if (st.step === 3) { const tel = v('hwTel'), mail = v('hwMail'); if (tel !== undefined) st.tel = tel; if (mail !== undefined) st.mail = mail; } }
  function stepper(n) { const S3 = [['1', '테마'], ['2', '설명'], ['3', '시안 고르기']]; return `<ol class="hpw-sp" aria-label="3단계 중 ${n}단계">${S3.map(([k, l], i) => `<li class="${i + 1 === n ? 'on' : i + 1 < n ? 'done' : ''}" ${i + 1 === n ? 'aria-current="step"' : ''}><span>${i + 1 < n ? '✓' : k}</span>${l}</li>`).join('')}</ol>`; }
  function foot(btns) { const f = $('#modal .mf'); if (f) f.innerHTML = btns.map(b => `<button type="button" class="btn ${b.k || ''}" data-hw="${b.id}" ${b.dis ? 'disabled' : ''}>${b.html || esc(b.l)}</button>`).join(''); }
  function paint() {
    const st = W.st; const b = box(); if (!st || !b) return;
    if (st.step === 1) {
      const T = themes();
      b.innerHTML = `${stepper(1)}<p class="hpw-lead">마음에 드는 분위기를 고르세요. 고르면 바로 다음 단계로 넘어갑니다. 테마는 나중에 '테마 바꿔줘'로 언제든 바꿀 수 있습니다.</p>
        <div class="hpw-tg" role="radiogroup" aria-label="테마">${T.map(x => `<div class="hpw-th ${x.id === st.theme ? 'on' : ''}" role="radio" tabindex="0" aria-checked="${x.id === st.theme}" data-hw="theme" data-v="${esc(x.id)}">
          <div class="hpw-tv">${themeThumb(x.id)}</div><div class="hpw-tn"><b>${esc(x.name)}${x.id === st.rec ? '<span class="hpw-rec">추천</span>' : ''}</b><small>${esc(x.desc)}</small>${x.sw.length ? `<span class="hpw-sw" aria-hidden="true">${x.sw.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</span>` : ''}</div></div>`).join('')}</div>`;
      foot([{ id: 'close', l: '취소' }, { id: 'next', l: '다음', k: 'pri' }]);
      const on = b.querySelector('.hpw-th.on'); if (on) on.focus(); return;
    }
    if (st.step === 2) {
      const T = themes().find(x => x.id === st.theme) || {};
      b.innerHTML = `${stepper(2)}<p class="hpw-lead">어떤 홈페이지인지 한 줄로 알려 주세요. ${esc(S.org.name)}의 유형 · 공개 ${esc(K())}으로 미리 채워 두었으니 그대로 두셔도 됩니다.</p>
        <label class="fl">한 줄 설명<textarea name="hw_brief" rows="3" maxlength="1500">${esc(st.brief)}</textarea></label>
        <p class="hpw-chosen">테마: <b>${esc(T.name || st.theme)}</b> <button type="button" class="btn sm ghost" data-hw="back">바꾸기</button></p>
        <details class="hpai-more"${st.url || st.pasted || st.colorOn ? ' open' : ''}><summary>더 자세히(선택) — 참고 사이트 · 색 · 로고 · 분위기</summary>
          <label class="fl">참고할 사이트 주소<input name="hw_url" inputmode="url" maxlength="250" placeholder="https://참고할-사이트.com" value="${esc(st.url)}"></label>
          <p class="hpai-note">${ic('check', 13)} 구성과 분위기만 참고하고 글 · 이미지는 새로 만듭니다. 다른 사이트의 글 · 로고 · 사진은 쓰지 않습니다.</p>
          <div class="form2"><label>분위기<select name="hw_tone"><option value="">AI가 정하기</option>${Object.keys(TONES).map(k => `<option ${st.tone === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
            <label>대표 색<span class="hpai-color"><input type="checkbox" name="hw_colorOn" aria-label="대표 색 지정" ${st.colorOn ? 'checked' : ''}><input type="color" name="hw_color" value="${esc(st.color)}" aria-label="대표 색"></span></label></div>
          <div class="fl">로고<span class="hpai-logo"><label class="btn sm">로고 올리기<input type="file" accept="image/*" name="hw_logoF" hidden></label><small class="mini" data-logo-msg>${st.logo ? '로고를 올렸습니다' : (S.site && S.site.gnb && S.site.gnb.logo ? '지금 로고를 그대로 씁니다' : '없으면 기관명이 표시됩니다')}</small></span></div>
          <label class="fl">참고 사이트 글 붙여 넣기(주소를 읽지 못할 때)<textarea name="hw_pasted" rows="3" maxlength="12000">${esc(st.pasted)}</textarea></label></details>
        ${aiOn() ? '' : `<p class="hpai-warn">Claude가 연결되지 않아 기관 유형 규칙으로 시안 3개를 만듭니다. <a href="#" data-act="ag-setup">Claude 연결하기</a></p>`}`;
      foot([{ id: 'back', l: '← 테마' }, { id: 'gen', html: `${ic('spark', 14)} 시안 3개 만들기`, k: 'pri' }]);
      const f = b.querySelector('[name=hw_logoF]'); if (f && window.hpImgFile) f.addEventListener('change', () => hpImgFile(f.files[0], url => { st.logo = url; const m = b.querySelector('[data-logo-msg]'); if (m) m.textContent = `로고를 올렸습니다(${Math.round(url.length / 1024)}KB)`; }));
      return;
    }
    if (st.busy) { b.innerHTML = `${stepper(3)}<div class="hpai-wait" role="status" aria-live="polite"><span class="hpai-spin" aria-hidden="true"></span><b>${st.url ? '참고 사이트의 구성을 살펴보고 ' : ''}${esc(S.org.name)} 홈페이지 시안 3개를 만들고 있습니다…</b><small>${aiOn() ? '보통 10~40초 걸립니다.' : '잠시만 기다려 주세요.'} 글 · 이미지는 새로 만듭니다.</small></div>`; foot([{ id: 'back', l: '← 설명', dis: true }]); return; }
    const D = st.drafts; const cur = D[st.pick] || D[0];
    b.innerHTML = `${stepper(3)}${st.notes.length ? `<div class="hpai-notes">${st.notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
      <p class="hpw-lead">시안 하나를 고르세요. 구성과 첫 화면 배치가 서로 다릅니다. <span class="hpai-via">${esc(st.via || '')}</span></p>
      <div class="hpw-dg" role="radiogroup" aria-label="시안">${D.map((d, i) => `<div class="hpw-d ${i === st.pick ? 'on' : ''}" role="radio" tabindex="0" aria-checked="${i === st.pick}" data-hw="pick" data-v="${i}">
        <figure><iframe title="시안 ${i + 1} 미리보기" sandbox="allow-same-origin" data-hw-pv="${i}" tabindex="-1"></iframe></figure>
        <div class="hpw-dn"><b><span class="hpw-dk">${String.fromCharCode(65 + i)}</span>${esc(d.name)}</b><small>${esc(d.desc)}</small><span class="hpw-db"><em>${HERO_L()[d.hero] || ''}</em><em class="hpw-sc ${d.q.score >= 90 ? 'hi' : ''}">품질 ${d.q.score}점</em></span></div></div>`).join('')}</div>
      ${cur ? qHTML(cur.q, cur.q0, cur.log, true) : ''}
      <p class="hpai-note">${ic('check', 13)} 적용해도 [게시하기] 전까지 ${esc(L())}에게는 보이지 않습니다. 적용한 뒤 글자를 눌러 바로 고치고, '색을 초록으로'처럼 말로도 고칠 수 있습니다.</p>`;
    foot([{ id: 'back', l: '← 설명' }, { id: 'regen', l: '다시 만들기' }, { id: 'pub', l: '적용하고 게시' }, { id: 'apply', l: '적용', k: 'pri' }]);
    b.querySelectorAll('[data-hw-pv]').forEach(f => { const d = D[+f.dataset.hwPv]; if (!d) return; try { f.srcdoc = siteHTML(d.site); } catch (e) { console.error('hpw pv', e); }
      f.addEventListener('load', () => { try { const sc = f.parentElement.clientWidth / 1280; f.style.transform = `scale(${sc})`; f.style.height = Math.round((f.parentElement.clientHeight || 260) / sc) + 'px'; } catch (e) { } }, { once: true }); });
  }
  async function gen() {
    const st = W.st; if (st.busy) return; if (!st.brief && !st.url && !st.pasted) { toast('한 줄이라도 적어 주세요.', 'warn'); return; }
    if (st.url && window.hpBenchURL) { try { hpBenchURL(st.url); } catch (e) { toast(e.message, 'warn'); return; } }
    st.step = 3; st.busy = true; paint();
    const o = { brief: st.brief, url: st.url, tone: st.tone, pasted: st.pasted }; let res;
    W.want3 = { theme: st.theme };
    try { res = await hpGenerate(o); } catch (e) { res = { j: hpLocal(o.brief, o), notes: [`AI 연결에 실패해(${e.message}) 규칙으로 만들었습니다.`], via: '기본 설계' }; } finally { W.want3 = null; }
    const local = res.via === '기본 설계'; const j = local ? patchLocal(res.j || {}) : (res.j || {});
    const prev = site(); let url = ''; try { url = st.url && window.hpBenchURL ? hpBenchURL(st.url) : ''; } catch (e) { url = ''; }
    const meta = { brief: String(st.brief || '').slice(0, 1500), url, by: res.via };
    st.drafts = variants(j, local).map(v => { let d; try { d = hpMake(clone(v.j), prev, meta); } catch (e) { console.error('hpw make', e); d = hpMake(hpLocal(st.brief), prev, meta); } d = finish(d, v, st);
      const q0 = hpwQuality(d); const fx = hpwFix(d); return { id: v.id, name: v.name, desc: v.desc, hero: v.hero, site: fx.site, q0, q: hpwQuality(fx.site), log: fx.log }; });
    st.notes = (res.notes || []).filter(n => !/기본 설계로 만들었습니다\. 설정/.test(n)); if (local) st.notes.unshift('Claude 없이 기관 유형 · 공개 강좌로 시안 3개를 만들었습니다. 설정 › 연동에서 Claude를 연결하면 설명 · 참고 사이트를 분석해 만듭니다.');
    st.via = res.via; st.bench = res.bench; st.pick = 0; st.busy = false; if (W.st === st && box()) paint();
  }
  function wzApply(pub) {
    const st = W.st; grab(); const D = st && st.drafts[st.pick]; if (!D) return;
    const f = S.settings.footer || (S.settings.footer = {}); let ch = false;
    if (st.tel && st.tel !== f.tel && /^[0-9+()\- ]{7,30}$/.test(st.tel)) { f.tel = st.tel; ch = true; } if (st.mail && st.mail !== f.mail && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(st.mail)) { f.mail = st.mail; ch = true; }
    let s2 = D.site; if (ch) s2 = hpwFix(s2).site;
    HPE.draft = { site: s2, notes: st.notes, via: st.via, bench: st.bench, o: { brief: st.brief, url: st.url, tone: st.tone, pasted: st.pasted } };
    W.st = null; W.applied = { var: D.id, score: hpwQuality(s2).score, at: Date.now() };
    hpApply(); if (pub && typeof smPublish === 'function') { smPublish(); }
  }
  function onClick(e) {
    const el = e.target.closest && e.target.closest('[data-hw]'); if (!el) return; const st = W.st; if (!st) return; const a = el.dataset.hw; e.preventDefault(); e.stopPropagation();
    if (a === 'close') { W.st = null; closeModal(); return; }
    if (a === 'theme') { st.theme = el.dataset.v; st.step = 2; paint(); const ta = $('#modal [name=hw_brief]'); if (ta) ta.focus(); return; }
    if (a === 'next') { st.step = 2; paint(); return; }
    if (a === 'back') { grab(); if (st.busy) return; st.step = Math.max(1, st.step - 1); paint(); return; }
    if (a === 'gen' || a === 'regen') { grab(); gen(); return; }
    if (a === 'pick') { grab(); st.pick = +el.dataset.v || 0; paint(); const c = $(`#modal [data-hw="pick"][data-v="${st.pick}"]`); if (c) c.focus(); return; }
    if (a === 'apply') { wzApply(false); return; }
    if (a === 'pub') { wzApply(true); return; }
  }
  /* 진입점 교체: 사이트 화면 · 바로 고치기의 「AI로 홈페이지 만들기」 버튼, window.hpOpen */
  { const base = ACT['hpai-open']; ACT['hpai-open'] = el => { try { if (HPE.on && window.hpClose) hpClose(true); const pre = HPE.pre; HPE.pre = null; hpwOpen(pre || undefined); } catch (e) { console.error('hpwiz', e); if (base) base(el); } }; }
  { const base = window.hpOpen; window.hpOpen = pre => { try { hpwOpen(pre); } catch (e) { console.error('hpwiz', e); base && base(pre); } }; window.hpOpenClassic = base; }

  /* ═════════ 말로 고치기(규칙 · 키 없이) ═════════ */
  const COLORS = [[/(빨강|빨간|레드|red)/i, '#C62828', '빨강'], [/(주황|오렌지|orange)/i, '#C2410C', '주황'], [/(노랑|노란|옐로|yellow)/i, '#A16207', '노랑'], [/(민트|청록|틸|teal)/i, '#0F766E', '청록'], [/(초록|녹색|그린|green)/i, '#15803D', '초록'],
    [/(남색|네이비|navy)/i, '#1E3A8A', '남색'], [/(파랑|파란|블루|blue|하늘)/i, '#2563EB', '파랑'], [/(보라|퍼플|purple|바이올렛)/i, '#6D28D9', '보라'], [/(분홍|핑크|pink)/i, '#BE185D', '분홍'], [/(검정|검은|블랙|black)/i, '#1F2937', '검정'], [/(회색|그레이|gray|grey)/i, '#4B5563', '회색'], [/(갈색|브라운|brown)/i, '#7C4A1E', '갈색']];
  const SECW = [[/(후기|리뷰)/, x => x.type === 'reviews', 'reviews', '수강후기'], [/공지/, x => x.type === 'notices', 'notices', '공지사항'], [/(오시는\s*길|지도|위치)/, x => x.type === 'map', 'map', '오시는 길'],
    [/(숫자|통계|실적)/, x => x.type === 'text' && x.data && x.data.variant === 'stats', 'stats', '숫자 강조'], [/(시작\s*방법|단계|절차|이용\s*방법)/, x => x.type === 'text' && x.data && x.data.variant === 'steps', 'steps', '시작 방법'],
    [/(문의|연락|상담)/, x => (x.type === 'text' && x.data && x.data.variant === 'cta') || x.type === 'map', 'cta', '문의'], [/(일정)/, x => x.type === 'text' && x.data && x.data.variant === 'timeline', 'timeline', '일정'],
    [/(수강\s*안내|안내표|안내)/, x => x.type === 'text' && x.data && x.data.variant === 'info', 'info', '수강 안내'], [/(소개|특징|장점)/, x => x.type === 'text' && x.data && x.data.variant === 'features', 'features', '소개'],
    [/(강좌|과정|수업|교과목|클래스|프로그램)/, x => x.type === 'classes', 'classes', `강좌 목록`], [/(이미지|사진)/, x => x.type === 'image', 'image', '이미지'], [/(동영상|영상|비디오)/, x => x.type === 'video', 'video', '동영상']];
  const themeByRe = re => themes().find(x => re.test(`${x.id} ${x.name} ${x.desc}`));
  const quoteOf = s => { const m = s.match(/["“”'‘’「『]([^"“”'‘’」』]{2,60})["“”'‘’」』]/); return m ? m[1].trim() : ''; };
  function heroAlts() { const n = N(); const cp = COPY[tyKey()] || COPY.adult; const L0 = []; try { const j = hpLocal(''); const b = A(j.sections).find(x => x.type === 'banner'); if (b) L0.push([b.title, b.sub]); } catch (e) { } return [...L0, ...cp.map(([a, b]) => [fill(a, n), b])]; }
  /* 문장 → 계획 { title, steps[], next(s) } (없으면 null) */
  function hpwTalk(q, loose) {
    const s = String(q || '').trim(); if (!s || !S || !S.site) return null; const T = themes(); const P = { steps: [], fns: [] }; const cur = site();
    const step = (l, fn) => { P.steps.push(l); P.fns.push(fn); };
    /* 테마 */
    if (/(고급|프리미엄|세련|럭셔리|품격)/.test(s)) { const th = hasT() ? themeByRe(/premium|dark|프리미엄|다크|고급|luxury/i) : T.find(x => x.id === 'navyGlow'); if (th) step(`테마를 「${th.name}」(으)로 바꾸기`, x => applyTheme(x, th.id)); step('분위기를 「모던」으로(모서리 · 굵기)', x => { x.tone = '모던'; return x; }); }
    else if (/(깔끔|심플|단정|미니멀)/.test(s) && !/(색|컬러)/.test(s)) { const th = hasT() ? themeByRe(/clean|modern|모던|깔끔|미니멀/i) : T.find(x => x.id === 'corpPortal'); if (th) step(`테마를 「${th.name}」(으)로 바꾸기`, x => applyTheme(x, th.id)); }
    else if (/(따뜻|포근|친근|아기자기|귀엽)/.test(s) && !/(색|컬러)/.test(s)) { const th = hasT() ? themeByRe(/warm|따뜻|kids|키즈|친근/i) : T.find(x => x.id === 'mintSoft'); if (th) step(`테마를 「${th.name}」(으)로 바꾸기`, x => applyTheme(x, th.id)); step('분위기를 「따뜻」으로', x => { x.tone = '따뜻'; return x; }); }
    else if (/(글씨|글자)\S*\s*(크게|키워|큼직)|큰\s*글씨|어르신|시니어/.test(s)) { const th = hasT() ? themeByRe(/senior|large|큰|시니어|warm/i) : T.find(x => x.id === 'senior'); if (th) step(`큰 글씨 테마 「${th.name}」(으)로 바꾸기`, x => applyTheme(x, th.id)); }
    else if (/(테마|디자인|스타일|분위기)\S*\s*(바꿔|변경|바꾸|다른)/.test(s)) { const named = T.find(x => s.includes(x.name) || s.toLowerCase().includes(String(x.id).toLowerCase())); const i = T.findIndex(x => x.id === curTheme(cur)); const th = named || T[(i + 1) % T.length]; if (th) step(`테마를 「${th.name}」(으)로 바꾸기`, x => applyTheme(x, th.id)); }
    /* 색 */
    const cm = /(색|컬러|톤)/.test(s.replace(/검색/g, '')) ? COLORS.find(([re]) => re.test(s)) : null;
    if (cm) step(`대표 색을 ${cm[2]}(${cm[1]})으로`, x => { x.color = cm[1]; return x; });
    /* 첫 화면 문구 */
    if ((/(첫\s*화면|배너|메인|대문|히어로)/.test(s) && /(문구|제목|글|카피|문장)/.test(s) && /(바꿔|고쳐|변경|다시|새로|으로|로\s*해)/.test(s)) || /(문구|카피)\S*\s*(바꿔|고쳐|다시)/.test(s)) {
      const qt = quoteOf(s); const bn = A(cur.sections).find(x => x.type === 'banner'); const now = bn && bn.data ? bn.data.title : '';
      if (qt) step(`첫 화면 제목을 「${qt}」(으)로`, x => { const b = A(x.sections).find(y => y.type === 'banner'); if (b) b.data.title = qt; return x; });
      else { const C = heroAlts(); const k = C.findIndex(c => c[0] === now); const nx = C[(k + 1) % C.length] || C[0]; if (nx) step(`첫 화면 문구를 「${String(nx[0]).replace(/\n/g, ' ')}」(으)로`, x => { const b = A(x.sections).find(y => y.type === 'banner'); if (b) { b.data.title = nx[0]; b.data.sub = nx[1]; } return x; }); P.aiHero = true; }
    }
    /* 버튼 */
    const bm = s.match(/(수강\s*신청|신청|문의|상담|레벨\s*테스트|체험)\s*버튼\S*\s*(넣|추가|만들|달아)/);
    if (bm) { const lab = /문의/.test(bm[1]) ? '문의하기' : /상담/.test(bm[1]) ? '상담 신청' : /레벨/.test(bm[1]) ? '레벨 테스트 신청' : /체험/.test(bm[1]) ? '무료 체험 신청' : `${K()} 신청하기`; const isMain = !/문의|상담/.test(bm[1]);
      step(`첫 화면에 「${lab}」 버튼 ${isMain ? '(주 버튼)' : '(보조 버튼)'}`, x => { const b = A(x.sections).find(y => y.type === 'banner'); if (!b) return x; if (isMain) { if (b.data.cta && b.data.cta !== lab) b.data.cta2 = b.data.cta; b.data.cta = lab; b.data.link = 'learn:shop'; } else { b.data.cta2 = lab; b.data.link2 = 'learn:comm'; } return x; }); }
    /* 섹션 빼기 · 넣기 */
    const del = /(빼|없애|지워|삭제|숨겨|감춰|제거)/.test(s), addw = /(넣어|추가|보여\s*줘|달아|만들어)/.test(s) && !bm;
    if ((del || addw) && (/(섹션|부분|영역|블록|코너)/.test(s) || (loose && /(후기|리뷰|공지|지도|오시는|숫자|통계|단계|시작\s*방법|일정|수강\s*안내|소개|이미지|동영상|영상)/.test(s))) && !cm) {
      const hit = SECW.find(([re]) => re.test(s));
      if (hit) { const [, pr, key, nm] = hit; const has = A(cur.sections).filter(x => pr(x));
        if (del) { if (has.some(x => !x.hide)) step(`「${nm}」 섹션 ${has.filter(x => !x.hide).length}개 숨기기(지우지 않음 · [보이기]로 되살림)`, x => { A(x.sections).filter(pr).forEach(y => { y.hide = true; }); return x; }); else P.msg = `지금 첫 화면에 보이는 「${nm}」 섹션이 없습니다.`; }
        else if (has.some(x => x.hide)) step(`숨긴 「${nm}」 섹션 다시 보이기`, x => { A(x.sections).filter(pr).forEach(y => { delete y.hide; }); return x; });
        else if (key === 'reviews' && !reviewsReal().length) P.msg = '실제 수강후기가 아직 없어 후기 섹션을 넣지 않았습니다. 수강후기 게시판에 후기가 올라오면 넣을 수 있습니다(지어낸 후기는 쓰지 않습니다).';
        else if (key === 'notices' && !noticesReal().length) P.msg = '등록된 공지가 없어 공지 섹션을 넣지 않았습니다. 공지를 먼저 올려 주세요.';
        else if (key === 'stats' && statsCols().length < 2) P.msg = '보여 줄 실제 숫자(공개 강좌 수 · 수강생 수)가 2개 미만이라 숫자 섹션을 넣지 않았습니다.';
        else { const mk = { reviews: { type: 'reviews', eyebrow: 'REVIEWS', title: '수강후기' }, notices: { type: 'notices', title: '공지사항' }, stats: { type: 'text', variant: 'stats', cols: statsCols() }, cta: contactSec(), info: guideSec(), classes: { type: 'classes', eyebrow: 'CLASSES', title: `지금 신청할 수 있는 ${K()}` },
            steps: (() => { const j = hpLocal(''); return A(j.sections).find(y => y.type === 'text' && y.variant === 'steps'); })(), features: (() => { const j = patchLocal(hpLocal('')); return A(j.sections).find(y => y.type === 'text' && y.variant === 'features'); })(),
            map: ft().addr ? { type: 'map', title: '오시는 길 · 문의', hours: '' } : null }[key];
          if (!mk) P.msg = key === 'map' ? '주소가 비어 있어 오시는 길 섹션을 넣지 않았습니다. 설정 › 홈페이지 푸터에서 주소를 입력해 주세요.' : `「${nm}」 섹션은 「화면에서 바로 고치기」의 [+ 섹션 추가]로 넣어 주세요.`;
          else step(`「${nm}」 섹션 넣기(문의 블록 앞)`, x => { const n = makeSec(mk); if (!n) return x; if (key === 'map') { n.data.addr = ft().addr; n.data.tel = ft().tel || ft().mail || ''; n.data.hours = ''; } const at = A(x.sections).findIndex(y => y.type === 'text' && y.data && y.data.variant === 'cta'); x.sections.splice(at < 0 ? x.sections.length : at, 0, n); return x; }); }
      } }
    if (!P.steps.length) return P.msg ? { title: '홈페이지 고치기', steps: [], msg: P.msg } : null;
    return { title: P.steps.length > 1 ? `홈페이지 ${P.steps.length}가지 고치기` : P.steps[0], steps: P.steps, msg: P.msg || '', aiHero: !!P.aiHero, next: s0 => { let x = clone(s0); P.fns.forEach(f => { x = f(x) || x; }); return hpwFix(x).site; } };
  }
  window.hpwTalk = hpwTalk;
  /* 섹션 JSON → S.site 섹션(hpMake를 거쳐 hpai의 secFrom 규칙을 그대로 쓴다) */
  function makeSec(o) { try { const d = hpMake({ sections: [{ type: 'banner', title: N() }, o] }, clone(site()), { by: 'AI SAM' }); return d.sections[1] || null; } catch (e) { return null; } }
  /* Claude가 연결돼 있으면 첫 화면 문구를 새로 쓴다(실패하면 규칙 문구) */
  async function aiHero(next) {
    if (!aiOn()) return next; const b = A(next.sections).find(x => x.type === 'banner'); if (!b) return next;
    try { const r = await CL.call({ system: '당신은 교육기관 홈페이지 카피라이터입니다. 첫 화면 제목(22자 이내, 줄바꿈은 \\n 한 번)과 설명(60자 이내)을 새로 씁니다. 과장 표현(최고 · 1위 · 혁신적)과 실제로 없는 숫자 · 실적 · 후기는 쓰지 않습니다. JSON {"title":"","sub":""} 하나만 출력합니다.', messages: [{ role: 'user', content: `기관: ${S.org.name}(${tyName()})\n공개 ${K()}: ${pubList().slice(0, 5).map(c => c.name).join(', ') || '없음'}\n지금 제목: ${b.data.title}\n지금 설명: ${b.data.sub || ''}\n다른 표현으로 써 주세요.` }], max: 400 });
      const t2 = String(r.text || ''); const j = JSON.parse(t2.slice(t2.indexOf('{'), t2.lastIndexOf('}') + 1)); if (j.title) { b.data.title = String(j.title).replace(/[<>]/g, '').slice(0, 60); if (j.sub) b.data.sub = String(j.sub).replace(/[<>]/g, '').slice(0, 160); } } catch (e) { }
    return next;
  }
  /* 계획 미리보기(지금 vs 고친 뒤) */
  function pvModal(prev, next, title, onOk) {
    const w = modal(title || '미리보기', `<div class="hpai-ba"><figure><figcaption>지금</figcaption><iframe title="지금 홈페이지" sandbox="allow-same-origin" data-hpw-ba="0"></iframe></figure><figure class="new"><figcaption>고친 뒤</figcaption><iframe title="고친 뒤 홈페이지" sandbox="allow-same-origin" data-hpw-ba="1"></iframe></figure></div>`,
      onOk ? [{ id: 'c', label: '취소' }, { id: 'ok', label: '적용', kind: 'pri', run: () => { onOk(); } }] : [{ id: 'c', label: '닫기' }], true);
    w.classList.add('hpai-m', 'hpai-wide', 'hpw-pvm');
    [prev, next].forEach((s, i) => { const f = w.querySelector(`[data-hpw-ba="${i}"]`); if (!f) return; try { f.srcdoc = siteHTML(s); } catch (e) { } f.addEventListener('load', () => { try { const sc = f.parentElement.clientWidth / 1280; f.style.transform = `scale(${sc})`; f.style.height = Math.round((f.parentElement.clientHeight || 300) / sc) + 'px'; } catch (e) { } }, { once: true }); });
    return w;
  }
  const repaint = () => { if (HPE.on && ACT['hpe-dev']) ACT['hpe-dev']({ dataset: { v: HPE.dev } }); else render(); };
  /* 대화 카드: 계획 → 미리보기 → 적용(승인) · 되돌리기 */
  function talkCard(P) {
    if (!P.steps.length) return { title: P.title, text: P.msg, via: 'AI SAM 홈페이지', go: 'site' };
    const pid = uid('p'); let next; try { next = P.next(site()); } catch (e) { console.error('hpw talk', e); return null; }
    W.plans[pid] = { next, prev: clone(site()) };
    PLANS[pid] = { run: () => { W.snaps[pid] = JSON.stringify(S.site); try { if (typeof hpPush === 'function') hpPush(); } catch (e) { } const n2 = W.plans[pid].next; n2.published = !!S.site.published; n2.at = S.site.at; S.site = n2; save(); setTimeout(repaint, 0);
      logAudit(`AI SAM 홈페이지 고치기 — ${P.title}`.slice(0, 60)); return `${P.title}. [게시하기]를 눌러야 ${L()}에게 보입니다. 마음에 들지 않으면 카드의 [되돌리기]를 누르세요.`; }, go: 'site' };
    const q = hpwQuality(next);
    return { title: P.title, text: `${P.msg ? P.msg + '\n' : ''}아래처럼 고치겠습니다. [미리보기]로 확인하고 [적용]을 누르세요. 적용 후 품질 점수 ${q.score}점.`, steps: P.steps, html: `<div class="hpw-cb"><button type="button" class="btn sm" data-act="hpw-pv" data-v="${pid}">미리보기</button><button type="button" class="btn sm ghost" data-act="hpw-undo" data-v="${pid}">되돌리기</button></div>`, plan: pid, state: 'pending', cta: '적용', via: 'AI SAM 홈페이지' };
  }
  ACT['hpw-pv'] = el => { const p = W.plans[el.dataset.v]; if (!p) { toast('미리보기가 만료되었습니다. 다시 말씀해 주세요.', 'warn'); return; } pvModal(p.prev, p.next, '미리보기 — 지금 vs 고친 뒤'); };
  ACT['hpw-undo'] = el => { const k = el.dataset.v; const sn = W.snaps[k]; if (!sn) { toast('아직 적용하지 않았습니다. [적용]을 누른 뒤에 되돌릴 수 있습니다.', 'warn'); return; } S.site = JSON.parse(sn); delete W.snaps[k]; save(); repaint(); toast('되돌렸습니다.', 'ok'); };
  const HPQ = /(홈페이지|사이트|첫\s*화면|배너|메인|문구|섹션|테마|디자인|후기|리뷰|고급|프리미엄|깔끔|따뜻|색|컬러|글씨|글자|버튼|공지|지도|오시는)/;
  function talkAnswer(q, force) {
    const s = String(q || '').trim().slice(0, 300); if (!s || !S || !S.org || !S.site || !HPQ.test(s)) return null;
    const ctx = force || /(홈페이지|사이트)/.test(s) || HPE.on || (typeof CUR !== 'undefined' && CUR.tab === 'site');
    if (!ctx) return null; if (/(게시|공개|올려|올리)/.test(s) && !/(테마|색|문구|섹션|후기|고급|버튼)/.test(s)) return null;
    if (/메뉴/.test(s) && /(짜|편성|구성)/.test(s)) return null;
    const P = hpwTalk(s, HPE.on || !!force); if (!P) return null; return talkCard(P);
  }
  window.hpwTalkAnswer = talkAnswer;
  if (typeof answer === 'function') { const base = answer; answer = (q, ...r) => { let a = null; try { a = talkAnswer(q); } catch (e) { console.error('hpw', e); } return a || base(q, ...r); }; }
  if (typeof chatSend === 'function') { const base = chatSend; chatSend = (q, ...r) => { let a = null; try { a = talkAnswer(q); } catch (e) { console.error('hpw', e); a = null; } if (!a) return base(q, ...r);
      const s = String(q || '').trim().slice(0, 300); if (CUR.ws !== 'home' && !$('#drawer') && ACT['chat-open']) ACT['chat-open']();
      S.chat.push({ role: 'user', text: s }); S.chat.push({ role: 'ai', ...a }); S.ai.usage = (S.ai.usage || 0) + 1; S.chat = S.chat.slice(-60); save(); renderThreads(); }; }
  /* Claude 에이전트 도구: edit_homepage */
  if (typeof AG_TOOLS !== 'undefined' && typeof agRun === 'function') {
    AG_TOOLS.push({ name: 'edit_homepage', description: '이미 만든 홈페이지를 말로 고칩니다(계획 카드 → 미리보기 → 승인하면 적용, 되돌리기 가능). 예: "더 고급스럽게", "색을 초록으로", "첫 화면 문구 바꿔줘", "첫 화면 제목을 \'함께 배우는 즐거움\'으로", "후기 섹션 빼줘", "공지 섹션 넣어줘", "테마 바꿔줘", "수강 신청 버튼 넣어줘", "글씨 크게". 새로 만들기는 build_homepage를 씁니다.', input_schema: { type: 'object', properties: { command: { type: 'string', description: '사용자 문장 그대로' } }, required: ['command'] } });
    const base = agRun; agRun = (name, x, ctx) => { if (name !== 'edit_homepage') return base(name, x, ctx); const cmd = String((x || {}).command || '').trim().slice(0, 300);
      let a = null; try { a = talkAnswer(cmd, true); } catch (e) { return { ok: false, 이유: '처리 중 오류' }; } if (!a) return { ok: false, 이유: '이해하지 못한 홈페이지 수정입니다. 「화면에서 바로 고치기」를 안내하세요.' };
      ctx.cards.push(a); return { ok: true, 승인필요: !!a.plan, 결과: [a.title, (a.steps || []).join(' / '), a.text].filter(Boolean).join(' — ').slice(0, 400) }; };
  }

  /* ═════════ Claude 프롬프트 보강(hpai SYS에 덧붙임) ═════════ */
  const SYS_PLUS = (full) => `\n추가 지침(v34.2):
- 섹션 구성: banner → 이 기관만의 특징(features, 3개 또는 4개) → 공개 강좌(classes) → 시작 방법(steps, 3개 또는 4개) → 공지(notices, 실제 공지가 있을 때) → 문의(text variant cta). reviews는 실제 후기 수가 1 이상일 때만, stats는 실제 숫자가 2개 이상일 때만 넣습니다. 같은 종류 섹션을 두 번 넣지 않습니다.
- 카피: 제목 22자 이내(줄바꿈 \\n 최대 1번), 설명 60자 이내, 버튼 8자 이내, 카드 제목 12자 · 카드 설명 30자 이내. 누구에게 무엇을 어떻게 주는지 구체적으로 씁니다. '최고의' · '1위' · '혁신적인' · '압도적' 같은 과장 표현과 느낌표는 쓰지 않습니다.
- 사실만: 숫자는 '실제 데이터'의 값만 씁니다(없으면 숫자를 쓰지 않음). 합격률 · 만족도 · 수상 · 협력사 · 강사 경력 · 후기 문장을 지어내지 않습니다. 연락처 · 운영 시간은 주어진 값만 씁니다.
- 자리 문구('입력하세요' 등)를 남기지 않습니다. 모든 섹션은 내용이 있어야 합니다.${full ? `
- 테마: "theme"에 다음 중 하나의 id를 넣습니다: ${themes().map(x => `${x.id}(${x.name})`).join(', ')}${W.want3 && W.want3.theme ? `. 사용자가 고른 테마는 ${W.want3.theme}입니다(그대로 넣으세요)` : ''}.
- 첫 시안의 첫 화면 배치는 "hero":"center"입니다.` : ''}${full && W.want3 ? `
- 시안: 구성과 첫 화면 배치가 다른 시안 2개를 "alts"에 더 넣습니다. 형식: "alts":[{"name":"강좌 중심","desc":"한 줄","hero":"split","sections":[...]},{"name":"안내 중심","desc":"한 줄","hero":"bg","sections":[...]}] (sections 형식은 위와 같고 첫 항목은 banner, 첫 화면 제목 · 설명도 시안마다 다르게).` : ''}`;
  if (typeof CL !== 'undefined' && typeof CL.call === 'function') { const cb = CL.call; CL.call = function (o) {
    try { if (o && typeof o.system === 'string' && o.system.startsWith('당신은 교육기관 홈페이지 기획자') && !o.system.includes('추가 지침(v34.2)')) {
      const full = !/지금은 (섹션 하나만|메뉴만)/.test(o.system); o = { ...o, system: o.system + SYS_PLUS(full) };
      if (full && W.want3) o.max = Math.max(+o.max || 0, 12000);
      if (Array.isArray(o.messages) && o.messages.length) { const m = o.messages[o.messages.length - 1]; if (m && m.role === 'user' && typeof m.content === 'string') o.messages = [...o.messages.slice(0, -1), { ...m, content: `${m.content}\n실제 데이터(숫자는 이것만): ${JSON.stringify(facts())}` }]; } } } catch (e) { }
    return cb.call(CL, o); }; }

  /* ═════════ 바로 고치기 화면: '말로 고치기' 줄 + 품질 점수 ═════════ */
  function talkBar() {
    const w = $('#hpe'); if (!w || w.querySelector('.hpw-talk')) return; const bar = w.querySelector('.hpe-bar'); if (!bar) return; const q = hpwQuality(site());
    bar.insertAdjacentHTML('afterend', `<form class="hpw-talk" role="search" aria-label="말로 고치기"><span class="hpw-tl">${ic('spark', 14)} 말로 고치기</span><input name="q" maxlength="200" autocomplete="off" placeholder="예: 더 고급스럽게 · 색을 초록으로 · 첫 화면 문구 바꿔줘 · 후기 섹션 빼줘 · 테마 바꿔줘" aria-label="고칠 내용을 말로 입력"><button type="submit" class="btn sm ai">고치기</button>
      <button type="button" class="hpw-qchip ${q.score >= 90 ? 'hi' : q.score >= 75 ? 'mid' : 'lo'}" data-act="hpw-q" title="품질 점수 · 자동 보정">품질 ${q.score}점</button></form>`);
    const f = w.querySelector('.hpw-talk'); f.addEventListener('submit', e => { e.preventDefault(); const inp = f.querySelector('input'); const v = inp.value.trim(); if (!v) return; talkRun(v).then(ok => { if (ok) inp.value = ''; }); });
  }
  async function talkRun(v) {
    const P = hpwTalk(v, true); if (!P) { toast('이해하지 못했습니다. 예: 더 고급스럽게 · 색을 초록으로 · 후기 섹션 빼줘 · 테마 바꿔줘', 'warn'); return false; }
    if (!P.steps.length) { toast(P.msg, 'warn'); return false; }
    const prev = clone(site()); let next = P.next(prev); if (P.aiHero && aiOn()) { toast('Claude가 첫 화면 문구를 새로 쓰고 있습니다…'); next = await aiHero(next); }
    const w = pvModal(prev, next, `말로 고치기 — ${P.title}`, () => { try { hpPush(); } catch (e) { } next.published = !!S.site.published; next.at = S.site.at; S.site = next; save(); repaint(); toast(`${P.title} — 적용했습니다. 마음에 들지 않으면 [되돌리기]를 누르세요.`, 'ok'); });
    const mb = w.querySelector('.mb'); if (mb) mb.insertAdjacentHTML('afterbegin', `<ol class="msteps hpw-ps">${P.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${P.msg ? `<p class="mini">${esc(P.msg)}</p>` : ''}<p class="mini">품질 점수 ${hpwQuality(prev).score}점 → ${hpwQuality(next).score}점</p>`);
    return true;
  }
  window.hpwTalkRun = talkRun;
  { let mo = null; const watch = () => { const w = $('#hpe'); if (!w) { if (mo) { mo.disconnect(); mo = null; } return; } talkBar(); if (!mo) { mo = new MutationObserver(() => talkBar()); mo.observe(w, { childList: true }); } };
    new MutationObserver(watch).observe(document.body, { childList: true }); }
  /* 품질 점수 창(사이트 화면 · 바로 고치기) */
  ACT['hpw-q'] = () => { if (!S.site) return; const q0 = hpwQuality(site()); const fx = hpwFix(site()); const q1 = hpwQuality(fx.site);
    modal('홈페이지 품질 점수', `<div class="hpw">${qHTML(q0, null, [], false)}${fx.log.length ? `<p class="hpw-lead">[자동 보정]을 누르면 ${q1.score}점이 됩니다(되돌리기 가능).</p><ul class="hpw-fl">${fx.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : '<p class="hpw-lead">자동으로 고칠 것이 없습니다.</p>'}${q1.items.some(x => !x.ok && !x.auto) ? '<p class="mini">연락처는 설정 › 홈페이지 푸터에서 입력합니다(지어낸 연락처는 넣지 않습니다).</p>' : ''}</div>`,
      fx.log.length ? [{ id: 'c', label: '닫기' }, { id: 'ok', label: '자동 보정', kind: 'pri', run: () => { try { hpPush(); } catch (e) { } const n = fx.site; if (n.hpSeoFix && n.aiSeo) { S.settings.seo = S.settings.seo || {}; ['title', 'desc', 'kw'].forEach(k => { if (n.aiSeo[k] && !S.settings.seo[k]) S.settings.seo[k] = n.aiSeo[k]; }); } S.site = n; save(); repaint(); toast(`자동 보정했습니다 — 품질 ${q1.score}점.`, 'ok'); } }] : [{ id: 'c', label: '닫기' }]);
    $('#modal').classList.add('hpai-m'); };

  /* ═════════ 사이트 첫 화면(v34 slim): 「AI로 홈페이지 만들기」 카드 · 품질 점수 ═════════ */
  if (typeof AFTER !== 'undefined') AFTER.push(() => {
    try { if (!S || !S.org || CUR.tab !== 'site' || $('.sgm-bar') || $('.hpw-cta')) return; const pgEl = $('#main .sl-page'); if (!pgEl) return;
      const s = S.site || {}; const fresh = !s.ai || s.blank; const q = s.sections ? hpwQuality(site()) : null; const at = pgEl.querySelector('.sb-st') || pgEl.querySelector('.sl-h');
      const h = `<div class="hpw-cta${fresh ? ' fresh' : ''}"><span class="hpw-ci" aria-hidden="true">${ic('spark', 22)}</span><div class="hpw-ct2"><b>${fresh ? 'AI로 홈페이지 만들기' : 'AI로 홈페이지 다시 만들기'}</b><small>테마 고르기 → 한 줄 설명 → 시안 3개 중 고르기. 게시까지 네 번만 누르면 됩니다.</small></div>
        <div class="hpw-cb2">${q && !fresh ? `<button type="button" class="hpw-qchip ${q.score >= 90 ? 'hi' : q.score >= 75 ? 'mid' : 'lo'}" data-act="hpw-q">품질 ${q.score}점</button>` : ''}${!fresh ? '<button type="button" class="btn" data-act="hpe-open">바로 고치기</button>' : ''}<button type="button" class="btn pri" data-act="hpai-open">${fresh ? '시작하기' : '새로 만들기'}</button></div></div>`;
      if (at) at.insertAdjacentHTML('afterend', h); else pgEl.insertAdjacentHTML('afterbegin', h);
    } catch (e) { console.error('hpw cta', e); } });
  if (typeof COVER !== 'undefined') COVER.push(['[v34.2] AI 홈페이지 3단계 마법사(테마 → 설명 → 시안 3개) · 품질 점수 자동 보정 · 말로 고치기', 'site', '']);
})();
