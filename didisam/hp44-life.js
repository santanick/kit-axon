/* v44 hp44-life — 평생교육 · 시니어 홈페이지 템플릿 10종(세부 유형별)
   대표님(2026-11-18 00:45): 「교육기관 유형별로 10가지 종류만」 「세부 유형별로 시나리오에 맞게 높은 퀄리티의 템플릿만」 「다른 유형의 템플릿도 아주 잘 디자인되어 있는 고퀄리티」
   - 기준선: v43.9 hpv-life 「계절 매거진」(lvalmanac) · 「전환」(lvshift). 두 종을 흡수해 lfhall · lfuniv로 발전시키고 8종을 새로 만든다.
   - 테마 id는 lf+이름(HPT.reg가 영문 소문자만 받음). 클래스 접두어는 l4-.
   - 10종 첫 화면이 모두 다르다: 잡지 콜라주 · 가운데 제목 + 넓은 사진 · 큰 글씨 큰 버튼(시니어) · 어두운 강의 포스터 · 빨랫줄 폴라로이드 · 격식 증서 · 모자이크 · 책 표지 · 수평선 시네마틱 · 원형 사진
   - 원칙: 한 화면 한 메시지, 섹션 5~6개 · 성격이 서로 다르게, 실제 데이터만(공개 강좌 · 후기 · 공지 · 연락처 — 없으면 숨김), 평생교육에는 훈련 · 국비 문구를 쓰지 않는다.
   - 시니어(lfsenior)는 본문 19px 이상 · 버튼 높이 68px 이상 · 대비 7:1 이상.
   - 링크: 학습자 실제 경로(#my · #courses · #cert · #notice · #comm · #login · #join · tel:)와 강좌 상세(#p-c-<id> → 게시 때 #class/<id>)만.
   - CSS는 siteHTML 문자열 안에(게시본 Shadow DOM). hpth · hpprem · hpsec* · hpv-*는 고치지 않는다. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const U = HPT.U; const { mix, fit, al } = U;
  const onC = c => (HPT.onColor ? HPT.onColor(c) : (U.CR(c, '#0B0F0D') >= U.CR(c, '#FFFFFF') ? '#0B0F0D' : '#FFFFFF'));
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const NL = v => E(v).replace(/\n/g, '<br>');
  /* 제목 여러 줄: 강조할 줄(기본 마지막 줄)을 태그로 감싼다 */
  const T2 = (v, tag) => { const t = String(v || '').split('\n'); return t.length > 1 ? t.map((x, i) => i === t.length - 1 ? `<${tag}>${E(x)}</${tag}>` : E(x)).join('<br>') : E(t[0]); };
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const tday = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const okD = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''));
  const days = (a, b) => Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 864e5);
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const telOf = () => { const t = ft().tel; return t && !isPh(t) ? String(t).replace(/[^\d-]/g, '') : ''; };
  const hoursOf = () => { const h = ft().hours; return h && !isPh(h) ? String(h) : ''; };
  const DOW = '일월화수목금토';
  const md = d => okD(d) ? `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일` : '';
  const dot = d => okD(d) ? `${d.slice(5, 7)}.${d.slice(8, 10)}` : '';
  const PATH = { arrow: 'M5 12h14M13 6l6 6-6 6', chev: 'M9 6l6 6-6 6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' };
  const ic = (k, n, w) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="${w || 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATH[k] || PATH.arrow}"/></svg>`;
  const ROUTES = ['home', 'my', 'courses', 'cert', 'notice', 'comm', 'login', 'join'];
  const href = (v, dflt) => { v = String(v || ''); if (!v) return dflt || ''; if (v.startsWith('learn:')) { const r = v.slice(6); return '#' + (ROUTES.includes(r) ? r : 'home'); }
    if (v.startsWith('cls:')) return '#p-c-' + v.slice(4); if (v === 'tel') { const t = telOf(); return t ? 'tel:' + t : '#comm'; } if (v.startsWith('tel:')) return 'tel:' + v.slice(4).replace(/[^\d-]/g, ''); if (/^#[a-z]/.test(v)) return v; return dflt || ''; };
  const mark = (h, x) => { const m = editing() ? HPE.map.get(x) : null; return m ? h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`) : h; };
  const empty = (x, msg) => editing() ? mark(`<section class="hpt l4 l4-emp"><div class="l4w"><p>${E(msg || '표시할 실제 데이터가 아직 없어 게시본에서는 이 섹션이 숨겨져요.')}</p></div></section>`, x) : '';

  /* ── 실제 데이터: 공개 강좌 · 후기 · 공지 ── */
  const live = () => { try { const L = (S.classes || []).filter(c => c && c.name && c.status !== '종료' && (c.open === '전체' || c.open == null) && !(okD(c.end) && days(tday(), c.end) < 0)); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; } catch (e) { return []; } };
  const sorted = () => live().slice().sort((a, b) => { const k = c => okD(c.start) ? (days(tday(), c.start) >= 0 ? days(tday(), c.start) : 5e5 - days(tday(), c.start)) : 1e6; return k(a) - k(b); });
  const won = v => (+v || 0).toLocaleString('ko-KR') + '원';
  const price = c => !+c.price ? '수강료 없음' : won(c.price);
  const whenL = c => { if (okD(c.start) && days(tday(), c.start) > 0) return `${md(c.start)} 개강`; if (okD(c.end)) return `${md(c.end)}까지 진행`; return '수시 모집'; };
  const dayL = c => { const d = Array.isArray(c.days) && c.days.length ? c.days.map(x => DOW[+x] || '').filter(Boolean).join(' · ') : ''; const t = c.time && c.time.from ? `${c.time.from}–${c.time.to || ''}` : ''; return [d, t].filter(Boolean).join(' '); };
  const meta = c => [dayL(c), +c.hours ? `${+c.hours}시간` : '', c.teacher || ''].filter(Boolean).join(' · ');
  /* v44.1(GAP B 평생): 요일 · 시간대 칩 — 강좌에 요일 · 시작 시각이 있을 때만 */
  const metaN = c => [+c.hours ? `${+c.hours}시간` : '', c.teacher || ''].filter(Boolean).join(' · ');
  const chipsOf = c => { const D = Array.isArray(c.days) ? c.days.map(Number).filter(x => x >= 0 && x <= 6) : []; const h = c.time && c.time.from ? parseInt(String(c.time.from), 10) : NaN;
    const wk = D.length && D.every(x => x === 0 || x === 6); const bandT = isNaN(h) ? '' : h < 12 ? '오전' : h < 17 ? '오후' : '저녁';
    return [D.length ? D.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => DOW[x]).join(' · ') : '', wk ? '주말반' : '', bandT ? bandT + '반' : '', bandT ? `${c.time.from}${c.time.to ? '–' + c.time.to : ''}` : ''].filter(Boolean); };
  const chips = c => { const C = chipsOf(c); return C.length ? `<span class="l4-chips">${C.map((t, i) => `<i class="${/반$/.test(t) ? 'tb' : ''}">${E(t)}</i>`).join('')}</span>` : ''; };
  const cH = c => '#p-c-' + c.id;
  const review = () => { try { const R = (HPT.reviews && HPT.reviews()) || []; const G = R.filter(x => x && (!x.st || x.st >= 4) && String(x.b || '').length >= 12 && !BADR.test(String(x.b).trim())); const r = G.find(x => x.b.length <= 96) || G[0]; return r ? { b: r.b.length > 96 ? r.b.slice(0, 94) + '…' : r.b, w: [r.c, r.w].filter(Boolean).join(' · ') } : null; } catch (e) { return null; } };
  /* 큰 인용에서 뺄 글: 불만 · 요청 · 질문(별점이 높아도) */
  const BADR = /끊겨|끊김|안 ?돼|안 ?되|안 ?열려|부탁|해 ?주세요|주실 수|오류|에러|환불|불편|불만|아쉬|느려|문의|버그|[?？]\s*$/;
  const notes = n => { try { return [...(S.notices || []), ...(S.classes || []).flatMap(c => c.notices || [])].filter(x => x && x.title && !x.hidden && !x.draft).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, n || 4); } catch (e) { return []; } };

  /* ── 사진 ── */
  const H = () => window.HPSTOCK;
  const abs = u => { try { return new URL(u, (H() && H().base) || location.href).href; } catch (e) { return u; } };
  const stk = (id, sz) => { const h = H(); if (!h || typeof h.get !== 'function') return null; const x = h.get(id); if (!x) return null; return { src: abs(h.url(x, sz === 'lg' ? '' : 'sm')), alt: x.alt || '', pos: x.focus || '50% 50%' }; };
  const slotP = (s, slot, d, fb) => { try { if (window.HPS && typeof HPS.photo === 'function') { const p = HPS.photo(s, slot, d); if (p) return { src: p.src, alt: p.alt, pos: p.pos }; } } catch (e) { } return fb ? stk(fb, 'lg') : null; };
  const img = (p, cls, eager) => p ? `<figure class="${cls || 'l4-ph'}"><img src="${E(p.src)}" alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>` : '';
  /* 강좌 사진: 기관이 올린 썸네일 → 강좌 이름에 맞는 샘플 → 테마 예비 사진 */
  const cphoto = (c, i, th) => { if (c.thumb && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(c.thumb)) return { src: c.thumb, alt: c.name, pos: '50% 50%' };
    /* v44.1(GAP A1): 템플릿마다 다른 강좌 카드 사진 세트(10종 사이 겹침 0) — 같은 페이지의 첫 화면 · 이야기 · 띠 사진과도 겹치지 않게 */
    const ex = [...Object.values(DEF[th].ph), ...USED]; const pool = (DEF[th].pool || []).filter(id => !ex.includes(id)); const id = pool[0]; if (!id) return null; USED.push(id); return stk(id); };
  let USED = [];

  /* ── 테마 10종: 세부 유형 · 색 · 서체 · 첫 화면 ── */
  const SANS = "Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
  const SERIF = "'Noto Serif KR','Noto Serif KR Fallback','Noto Serif CJK KR','Nanum Myeongjo','AppleMyungjo',serif";
  const HAHM = "'Hahmlet','Hahmlet Fallback','Noto Serif KR','Noto Serif CJK KR',serif";
  const ROUND = "'Gowun Dodum','Gowun Dodum Fallback'," + SANS;
  const FONT = { [SERIF]: 'fonts/noto-serif-kr/font.css?v=ea0bde31', [HAHM]: 'fonts/hahmlet/font.css?v=f33eda8b', [ROUND]: 'fonts/gowun-dodum/font.css?v=58c173de' };
  /* k: 첫 화면 · bg/alt/ink/mu: 바탕 · 면 · 글자 · dk: 짙은 면 · pt: 포인트 · r/br: 모서리 · hf/hw: 제목 서체 · 굵기 · card: 강좌 카드 모양 · ph: 사진 슬롯 · pool: 예비 사진 */
  const DEF = {
    lfhall: { name: '계절 매거진', sub: '평생학습관', k: 'almanac', desc: '크림 바탕 · 명조 제목 · 사진 콜라주로 이번 학기 강좌를 잡지처럼 펼치는 시 · 구 평생학습관', acc: '#2E5641', bg: '#F5EFE4', alt: '#EDE4D3', ink: '#1E2621', mu: '#4F574F', dk: '#23402F', pt: '#C2552E', r: 4, br: 999, hf: SERIF, hw: 700, nw: 700, card: 'mag', ph: { hero: 'hum-23', about: 'kni-03', space: 'hum-26', cta: 'sen-04' }, pool: ['kni-01', 'hum-22', 'art-01', 'hum-21', 'gar-01'] },
    lfuniv: { name: '대학 평생교육원', sub: '대학 평생교육원', k: 'shift', desc: '흰 바탕 가운데 큰 제목과 넓은 둥근 사진 · 방문 목적별 세 갈래 — 대학 부설 평생교육원의 자격 · 교양 과정', acc: '#1D4ED8', bg: '#FFFFFF', alt: '#F5F6F8', ink: '#0C0E13', mu: '#4A4F5A', dk: '#0C0E13', pt: '#D7F25C', r: 20, br: 999, hf: SANS, hw: 800, nw: 800, card: 'box', ph: { hero: 'cam-07', about: 'hum-13', space: 'cam-08' }, pool: ['lec-01', 'stu-02', 'hum-14', 'cls-02', 'lec-03'] },
    lfsenior: { name: '시니어 디지털 배움터', sub: '시니어 디지털', k: 'senior', desc: '큰 글씨 · 큰 버튼 · 전화 한 번으로 — 어르신 스마트폰 · 키오스크 · 디지털 생활 교육', acc: '#0B4F8A', bg: '#FFFCF5', alt: '#F3EEE2', ink: '#14171C', mu: '#33373F', dk: '#0B2E52', pt: '#F2B705', r: 28, br: 18, hf: SANS, hw: 800, nw: 800, card: 'box', big: 1, ph: { hero: 'sen-02', about: 'sen-07' }, pool: ['sen-03', 'hum-09', 'hum-08', 'mus-03', 'hum-36'] },
    lfhuman: { name: '인문 아카데미', sub: '인문 · 교양 아카데미', k: 'lecture', desc: '짙은 먹색 · 함렛 세리프 · 강의 목록을 공연 안내처럼 — 인문학 · 고전 · 역사 교양 강좌', acc: '#C8A96A', bg: '#15120F', alt: '#1E1A16', ink: '#F2ECE1', mu: '#BDB4A5', dk: '#0B0907', pt: '#C8A96A', r: 2, br: 2, hf: HAHM, hw: 600, nw: 600, card: 'line', dark: 1, ph: { hero: 'lib-06', about: 'lib-07', space: 'hum-12' }, pool: ['hum-38', 'lib-05', 'hum-02', 'hum-05', 'lib-08'] },
    lfvillage: { name: '동네 배움터', sub: '동네 배움터 · 마을 학교', k: 'line', desc: '버터 노랑 바탕과 둥근 손글씨풍 제목, 빨랫줄에 걸린 사진 — 이웃이 이웃을 가르치는 마을 배움터', acc: '#D9480F', bg: '#FFF4CF', alt: '#FFFFFF', ink: '#2B2114', mu: '#5A4B36', dk: '#3A2A12', pt: '#2F9E6A', r: 6, br: 999, hf: ROUND, hw: 400, nw: 400, card: 'poly', ph: { hero: 'kni-02', about: 'bak-02', space: 'nat-03', cta: 'hum-24' }, pool: ['bak-05', 'bak-01', 'hum-25', 'hum-40', 'coo-02'] },
    lfcredit: { name: '학점은행 학습과정', sub: '학점은행제(전통 · 격식)', k: 'formal', desc: '아이보리 바탕 · 이중 테두리 증서 · 문장 휘장 · 로마 숫자 단계 — 학위 · 자격을 준비하는 학점은행제 기관의 격식', acc: '#1B2A4A', bg: '#F8F6F1', alt: '#FFFFFF', ink: '#161A22', mu: '#474D59', dk: '#1B2A4A', pt: '#A8844F', r: 0, br: 0, hf: SERIF, hw: 600, nw: 400, card: 'line', ph: { about: 'cam-02', space: 'lib-03' }, pool: ['hum-03', 'hum-01', 'dsk-01', 'lib-04', 'hum-45'] },
    lfculture: { name: '컬처 모자이크', sub: '문화센터', k: 'mosaic', desc: '큰 제목 아래 그림 · 음악 · 요가 · 베이킹 사진 모자이크 — 요일별 시간표로 고르는 문화센터 강좌', acc: '#C2255C', bg: '#FFFFFF', alt: '#FBF3F5', ink: '#1A1216', mu: '#544850', dk: '#2A0F1C', pt: '#FFC93C', r: 18, br: 999, hf: SANS, hw: 800, nw: 800, card: 'over', ph: { hero: 'hum-27', about: 'hum-30', space: 'yog-03', cta: 'bak-03' }, pool: ['art-02', 'mus-01', 'mus-08', 'art-04', 'yog-01'] },
    lflibrary: { name: '도서관 배움', sub: '도서관 평생교육', k: 'cover', desc: '밝은 열람실 사진 위에 책 표지처럼 겹친 제목 카드 — 도서관 강좌 · 독서 모임 · 작가 강연', acc: '#1F6F78', bg: '#F3F6F5', alt: '#FFFFFF', ink: '#13201F', mu: '#45524F', dk: '#123D42', pt: '#E09F3E', r: 14, br: 10, hf: SANS, hw: 800, nw: 800, card: 'box', ph: { hero: 'lib-01', about: 'hum-37', space: 'lib-02' }, pool: ['lan-01', 'hum-43', 'hum-28', 'hum-39', 'hum-35'] },
    lfretire: { name: '두 번째 출발', sub: '은퇴 설계 · 인생 2막', k: 'horizon', desc: '바다 수평선을 가득 채운 첫 화면과 명조 제목 — 은퇴를 앞둔 분의 일 · 돈 · 건강 · 관계 설계 과정', acc: '#E8915B', bg: '#FBF8F4', alt: '#FFFFFF', ink: '#1B1F26', mu: '#4D525B', dk: '#1C2633', pt: '#E8915B', r: 16, br: 999, hf: SERIF, hw: 600, nw: 400, card: 'over', ph: { hero: 'sen-06', about: 'nat-02', space: 'sen-01' }, pool: ['hum-10', 'hum-04', 'nat-01', 'hum-06', 'off-03'] },
    lffamily: { name: '함께 자라는 부모', sub: '가족 · 부모 교육', k: 'circle', desc: '복숭아빛 바탕에 큰 원형 사진 두 장 · 자녀 나이별 갈래 — 부모 · 가족 교육 강좌', acc: '#8A3B74', bg: '#FFF2EC', alt: '#FFFFFF', ink: '#25161F', mu: '#57474F', dk: '#3E1B33', pt: '#F08A5D', r: 28, br: 999, hf: SANS, hw: 800, nw: 800, card: 'box', ph: { hero: 'fam-01', about: 'fam-03', space: 'fam-02' }, pool: ['fam-04', 'kid-06', 'fam-05', 'kid-02', 'kid-05'] }
  };
  const tok = (hf, hw, h1, h1m) => ({ hf, hw, hls: -0.04, h1, h1m, lh1: 1.1, h2: 56, h2m: 34, h3: 24, body: 17, blh: 1.7, lead: 20, ey: { fs: 15, ls: 0, fw: 700, tt: 'none' }, sec: 150, secm: 88, w: 1200, gut: 40,
    r: 20, rs: 12, br: 999, bh: 56, bpx: 28, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' });
  const MINE = Object.keys(DEF);
  const mine = s => !!(s && s.theme && DEF[s.theme]);
  const thOf = s => (s && DEF[s.theme]) ? s.theme : 'lfhall';

  /* ── 공통 조각 ── */
  const btn = (cls, label, h, arrow) => label ? `<a class="l4-b ${cls}" href="${E(h)}">${/^tel:/.test(h) ? ic('phone', 20, 1.8) : ''}<span>${E(label)}</span>${arrow && !/^tel:/.test(h) ? ic(arrow === 1 ? 'arrow' : arrow, 20, 2) : ''}</a>` : '';
  const telLabel = (d, dflt) => { const t = telOf(); return t ? `${dflt || '전화 문의'} ${t}` : (d || '문의 남기기'); };
  const cta = (d, c1, c2, a1, a2) => { const h2 = href(d.link2, '#comm'); return `<div class="l4-cta">${btn(c1, d.cta, href(d.link, '#courses'), a1)}${btn(c2, /^tel:/.test(h2) ? telLabel(d.cta2, d.cta2) : d.cta2, h2, a2)}</div>`; };
  const ey = d => d.eyebrow ? `<p class="l4-ey">${E(d.eyebrow)}</p>` : '';
  const head = (d, tag) => `${ey(d)}<h2 class="l4-h2">${T2(d.title, tag || 'em')}</h2>${d.sub ? `<p class="l4-sd">${E(d.sub)}</p>` : ''}`;
  const sec = (x, s, kind, inner, cls) => mark(`<section class="hpt l4 ${thOf(s)} l4-${kind}${cls ? ' ' + cls : ''}">${inner}</section>`, x);
  const paths = d => { const t = telOf(); return [['처음이에요', '강좌 둘러보기', '#courses'], ['수강생', '내 강의실 · 수료증', '#my'], ['문의', t ? `전화 ${t}` : '상담 남기기', t ? 'tel:' + t : '#comm']]; };

  /* ── 첫 화면 10종 ── */
  const HERO = {
    /* 평생학습관: 명조 제목 + 사진 3장 콜라주 + 공지 한 줄(기준선 「계절 매거진」 발전) */
    almanac: (s, d) => { const P = [slotP(s, 'hero', d, 'hum-23'), slotP(s, 'about', null, 'kni-03'), slotP(s, 'space', null, 'hum-26')]; const n = notes(1)[0]; const nx = sorted().find(c => okD(c.start) && days(tday(), c.start) >= 0);
      const line = n ? `<span><b>알림</b>${E(n.title)}</span><a class="l4-ln" href="#notice">공지 보기 ${ic('arrow', 18, 2)}</a>` : nx ? `<span><b>${E(md(nx.start))}</b>${E(nx.name)} 개강을 앞두고 있어요.</span><a class="l4-ln" href="${cH(nx)}">자세히 보기 ${ic('arrow', 18, 2)}</a>` : '';
      return `<div class="l4w l4-g"><div>${d.eyebrow ? `<p class="l4-is">${E(d.eyebrow)}</p>` : ''}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}</div>
<div class="l4-col">${img(P[0], 'l4-c1', 1)}${img(P[1], 'l4-c2')}${img(P[2], 'l4-c3')}<span class="l4-vol" aria-hidden="true">${E(String(new Date().getFullYear()))}</span></div></div>${line ? `<div class="l4-nt"><div class="l4w"><i aria-hidden="true"></i>${line}</div></div>` : ''}`; },
    /* 대학 평생교육원: 가운데 큰 제목 + 넓은 둥근 사진 + 방문 목적별 세 갈래(기준선 「전환」 발전) */
    shift: (s, d) => { const p = slotP(s, 'hero', d, 'cam-07');
      return `<div class="l4w l4-c">${d.eyebrow ? `<p class="l4-pill"><b>수강 신청 중</b><span>${E(d.eyebrow)}</span></p>` : ''}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'soft', 1, 0)}</div>
<div class="l4w">${img(p, 'l4-stage', 1)}<nav class="l4-paths" aria-label="방문 목적별 바로 가기">${paths(d).map(([k, l, h]) => `<a href="${E(h)}"><b>${E(k)}</b><span>${E(l)}</span>${ic('chev', 18, 2)}</a>`).join('')}</nav></div>`; },
    /* 시니어: 아주 큰 제목 + 큰 버튼 두 개(강좌 · 전화) + 사진과 다음 개강 강좌 한 장 */
    senior: (s, d) => { const p = slotP(s, 'hero', d, 'sen-02'); const t = telOf(); const nx = sorted()[0];
      return `<div class="l4w l4-g"><div>${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}
<div class="l4-big2"><a class="l4-bb pri" href="${E(href(d.link, '#courses'))}"><span><b>${E(d.cta || '배울 강좌 보기')}</b><small>${E(d.note || '어떤 강좌가 있는지 먼저 살펴봐요')}</small></span>${ic('arrow', 30, 2.2)}</a>
<a class="l4-bb sec" href="${E(t ? 'tel:' + t : '#comm')}"><span><b>${E(t ? '전화로 물어보기' : (d.cta2 || '상담 남기기'))}</b><small>${E(t ? t + (hoursOf() ? ' · ' + hoursOf() : '') : '남겨 주시면 연락드려요')}</small></span>${ic(t ? 'phone' : 'arrow', 30, 2)}</a></div></div>
<div class="l4-sp">${img(p, 'l4-ph', 1)}${nx ? `<a class="l4-next" href="${cH(nx)}"><small>${E(whenL(nx))}</small><b>${E(nx.name)}</b><span>${E(price(nx))} ${ic('arrow', 22, 2)}</span></a>` : ''}</div></div>`; },
    /* 인문 아카데미: 먹색 · 세리프 제목 + 이번 시즌 강의 목록(공연 안내처럼) + 세로 사진 */
    lecture: (s, d) => { const p = slotP(s, 'hero', d, 'lib-06'); const L = sorted().slice(0, 3);
      return `<div class="l4w l4-g"><div><p class="l4-rule">${E(d.eyebrow || 'LECTURE SERIES')}</p><h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}
${L.length ? `<ol class="l4-bill">${L.map((c, i) => `<li><a href="${cH(c)}"><i>No.${String(i + 1).padStart(2, '0')}</i><b>${E(c.name)}</b><small>${E(whenL(c))}</small></a></li>`).join('')}</ol>` : ''}</div>${img(p, 'l4-tall', 1)}</div>`; },
    /* 동네 배움터: 둥근 제목 + 빨랫줄에 걸린 사진 네 장 */
    line: (s, d) => { const P = [slotP(s, 'hero', d, 'kni-02'), slotP(s, 'about', null, 'bak-02'), slotP(s, 'space', null, 'nat-03'), slotP(s, 'cta', null, 'hum-24')]; const C = (d.cols || []).map(c => c && c[0]).filter(Boolean);
      return `<div class="l4w l4-c">${d.eyebrow ? `<p class="l4-stamp">${E(d.eyebrow)}</p>` : ''}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}</div>
<div class="l4-rope"><svg class="l4-cord" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 18 Q720 128 1440 18" fill="none" stroke="currentColor" stroke-width="2.5"/></svg><div class="l4-pins">${P.map((p, i) => p ? `<figure class="l4-pol p${i}"><img src="${E(p.src)}" alt="${E(p.alt)}" ${i ? 'loading="lazy"' : 'loading="eager" fetchpriority="high"'} decoding="async" style="object-position:${E(p.pos)}">${C[i] ? `<figcaption>${E(C[i])}</figcaption>` : ''}</figure>` : '').join('')}</div></div>`; },
    /* 학점은행제(격식): 이중 테두리 증서 · 휘장 · 학위 경로 세 칸 */
    formal: (s, d) => { const o = org(); const C = (d.cols || []).filter(c => c && c[0]).slice(0, 3);
      return `<div class="l4w"><div class="l4-cert"><span class="l4-seal" aria-hidden="true"><i>${E((o || '學').slice(0, 1))}</i></span>${d.eyebrow ? `<p class="l4-est">${E(d.eyebrow)}</p>` : ''}<h1>${T2(d.title, 'b')}</h1><span class="l4-orn" aria-hidden="true"></span>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}
${C.length ? `<dl class="l4-deg n${C.length}">${C.map(c => `<div><dt>${E(c[0])}</dt><dd>${E(c[1] || '')}</dd></div>`).join('')}</dl>` : ''}</div></div>`; },
    /* 문화센터: 큰 제목 + 사진 네 장 모자이크(분야 이름표) */
    mosaic: (s, d) => { const P = [slotP(s, 'hero', d, 'hum-27'), slotP(s, 'about', null, 'hum-30'), slotP(s, 'space', null, 'yog-03'), slotP(s, 'cta', null, 'bak-03')]; const C = (d.cols || []).map(c => c && c[0]);
      return `<div class="l4w"><div class="l4-top">${d.eyebrow ? `<p class="l4-tag">${E(d.eyebrow)}</p>` : ''}<h1>${T2(d.title, 'em')}</h1><div class="l4-side">${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}</div></div>
<div class="l4-mos">${P.map((p, i) => p ? `<a class="l4-m${i}" href="#courses"><figure><img src="${E(p.src)}" alt="${E(p.alt)}" ${i ? 'loading="lazy"' : 'loading="eager" fetchpriority="high"'} decoding="async" style="object-position:${E(p.pos)}"></figure>${C[i] ? `<span>${E(C[i])}</span>` : ''}</a>` : '').join('')}</div></div>`; },
    /* 도서관: 열람실 사진 위로 책 표지 같은 제목 카드 */
    cover: (s, d) => { const p = slotP(s, 'hero', d, 'lib-01');
      return `<div class="l4-shot">${img(p, 'l4-ph', 1)}</div><div class="l4w"><div class="l4-book"><span class="l4-spine" aria-hidden="true"></span><div>${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}</div>${d.note ? `<p class="l4-note">${ic('book', 18, 1.8)}${E(d.note)}</p>` : ''}</div></div>`; },
    /* 은퇴 설계: 수평선 전면 사진 + 명조 제목 + 네 갈래 */
    horizon: (s, d) => { const p = slotP(s, 'hero', d, 'sen-06'); const C = (d.cols || []).map(c => c && c[0]).filter(Boolean).slice(0, 4);
      return `${img(p, 'l4-bg', 1)}<div class="l4-in"><div class="l4w">${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'wh', 1, 0)}</div>${C.length ? `<div class="l4-hz"><div class="l4w"><ul>${C.map(c => `<li>${E(c)}</li>`).join('')}</ul></div></div>` : ''}</div>`; },
    /* 가족 · 부모: 큰 원형 사진 두 장 + 따뜻한 제목 */
    circle: (s, d) => { const p1 = slotP(s, 'hero', d, 'fam-01'); const p2 = slotP(s, 'about', null, 'fam-03');
      return `<div class="l4w l4-g"><div>${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="l4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}${d.note ? `<p class="l4-note">${E(d.note)}</p>` : ''}</div><div class="l4-orb">${img(p1, 'l4-o1', 1)}${img(p2, 'l4-o2')}<span class="l4-dot" aria-hidden="true"></span></div></div>`; }
  };
  const heroSec = (s, d) => { const th = thOf(s); return `<section class="hpt l4 ${th} l4-hero l4-k-${DEF[th].k}">${HERO[DEF[th].k](s, d)}</section>`; };

  /* ── 섹션 ── */
  const SEC = {};
  /* 강좌 카드 3장(실제 공개 강좌) */
  SEC['l4-cards'] = (x, s) => { const d = x.data || {}; const th = thOf(s); const re = d.re ? new RegExp(d.re) : null; const A = sorted(); const L = (re ? [...A.filter(c => re.test(c.name)), ...A.filter(c => !re.test(c.name))] : A).slice(0, 3); if (!L.length) return empty(x); USED = [];
    const card = (c, i) => { const p = cphoto(c, i, th); return `<li><a class="l4-card" href="${cH(c)}">${img(p, 'l4-cph')}<div class="l4-cb"><p class="l4-tg">${E(whenL(c))}</p><h3>${E(c.name)}</h3>${chips(c)}${c.desc && !isPh(c.desc) ? `<p class="l4-cd">${E(String(c.desc).slice(0, 64))}</p>` : ''}<p class="l4-cm"><span>${E((chipsOf(c).length ? metaN(c) : meta(c)) || '자세한 안내는 강좌 페이지에서')}</span><b>${E(price(c))}</b></p></div></a></li>`; };
    return sec(x, s, 'cards', `<div class="l4w"><div class="l4-head"><div>${head(d)}</div><a class="l4-more" href="#courses">강좌 ${live().length}개 모두 보기 ${ic('arrow', 18, 2)}</a></div><ul class="l4-cg n${L.length} c-${DEF[th].card}">${L.map(card).join('')}</ul></div>`); };
  /* 시간표 · 일정 목록(날짜 열) */
  SEC['l4-rows'] = (x, s) => { const d = x.data || {}; const L = sorted().slice(0, d.n || 5); if (!L.length) return empty(x); const t = tday(); const th = thOf(s);
    return sec(x, s, 'rows', `<div class="l4w"><div class="l4-head"><div>${head(d)}</div><a class="l4-more" href="#courses">전체 강좌 보기 ${ic('arrow', 18, 2)}</a></div><ol class="l4-ls">${L.map((c, i) => { const sd = okD(c.start) && days(t, c.start) > 0 ? c.start : c.end; const lab = d.num === 'lecture' ? `제${i + 1}강` : okD(sd) ? dot(sd) : '수시';
      return `<li><a class="l4-rw" href="${cH(c)}"><span class="l4-dt"><b>${E(lab)}</b><small>${E(d.num === 'lecture' ? whenL(c) : okD(sd) ? (sd === c.start ? '개강' : '종강') + ' · ' + DOW[new Date(sd + 'T00:00:00').getDay()] + '요일' : '상시')}</small></span><span class="l4-rn"><b>${E(c.name)}</b>${chips(c)}<small>${E((chipsOf(c).length ? metaN(c) : meta(c)) || whenL(c))}</small></span><span class="l4-pr">${E(price(c))}</span>${ic(DEF[th].big ? 'arrow' : 'chev', DEF[th].big ? 28 : 22, 2)}</a></li>`; }).join('')}</ol></div>`); };
  /* 큰 숫자 하나(공개 강좌 수 또는 수업 시간 합) */
  /* 자랑할 만한 값일 때만(공개 강좌 10개 이상). 작으면 블록 전체를 숨긴다. 수강료 0원 강좌는 5개 이상일 때만 한 줄로 */
  const NUM_MIN = 10, FREE_MIN = 5;
  SEC['l4-num'] = (x, s) => { const d = x.data || {}; const L = live(); if (L.length < NUM_MIN) return empty(x, `공개 강좌가 ${NUM_MIN}개 이상이면 큰 숫자로 보여요.`); const free = L.filter(c => !+c.price).length;
    const t = d.title || `지금 ${org()}에서 신청할 수 있는 ${d.unit || '강좌'}예요.`;
    return sec(x, s, 'num', `<div class="l4w l4-ng"><p class="l4-n">${E(String(L.length))}<span>개</span></p><div><p class="l4-nt2">${E(t)}</p><p class="l4-ns">${E(free >= FREE_MIN ? `그중 ${free}개는 수강료 없이 들을 수 있어요.` : d.sub || `${org()} 공개 ${d.unit || '강좌'} 기준`)}</p><a class="l4-ln" href="#courses">${E(d.unit || '강좌')} 고르기 ${ic('arrow', 18, 2)}</a></div></div>`); };
  /* 사진 + 이야기(정의 목록 또는 번호 단계) */
  SEC['l4-story'] = (x, s) => { const d = x.data || {}; const cols = (d.cols || []).filter(c => c && c[0]).slice(0, 4); if (!cols.length) return empty(x); const p = slotP(s, d.slot || 'about', null, DEF[thOf(s)].ph[d.slot || 'about']);
    const body = d.dl ? `<dl class="l4-dl">${cols.map(c => `<div><dt>${E(c[0])}</dt><dd>${E(c[1] || '')}</dd></div>`).join('')}</dl>` : `<ol class="l4-steps">${cols.map((c, i) => `<li><span class="l4-sn">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div></li>`).join('')}</ol>`;
    return sec(x, s, 'story', `<div class="l4w l4-sg${d.flip ? ' flip' : ''}">${img(p, 'l4-sph')}<div>${head(d)}${body}</div></div>`); };
  /* 가로 단계(사진 없이 큰 번호) */
  SEC['l4-flow'] = (x, s) => { const d = x.data || {}; const cols = (d.cols || []).filter(c => c && c[0]).slice(0, 4); if (!cols.length) return empty(x); const RN = ['I', 'II', 'III', 'IV'];
    return sec(x, s, 'flow', `<div class="l4w">${head(d)}<ol class="l4-fl n${cols.length}">${cols.map((c, i) => `<li><span class="l4-fk">${E(c[2] || (d.num === 'roman' ? RN[i] : String(i + 1).padStart(2, '0')))}</span><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</li>`).join('')}</ol></div>`, d.inv ? 'inv' : ''); };
  /* 인용: 실제 후기, 없으면 기관이 쓴 한 문장 */
  SEC['l4-quote'] = (x, s) => { const d = x.data || {}; const r = d.say ? null : review(); /* hx-rev가 켜진 템플릿은 후기를 그쪽에 두고 여기선 기관 한마디만 */ const q = r ? r.b : (d.title || ''); if (!q) return empty(x);
    return sec(x, s, 'quote', `<div class="l4w"><blockquote>${E(q)}</blockquote><p class="l4-who">${r ? `<b>수강생 후기</b>${r.w ? ` · ${E(r.w)}` : ''}` : E(d.sub || org())}</p></div>`); };
  /* 사진 띠 + 한 문장 */
  SEC['l4-band'] = (x, s) => { const d = x.data || {}; const th = thOf(s); const p = slotP(s, d.slot || 'space', null, DEF[th].ph[d.slot || 'space'] || DEF[th].ph.about);
    return sec(x, s, 'band', `${img(p, 'l4-bg')}<div class="l4-in"><div class="l4w"><h2>${NL(d.title)}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div></div>`); };
  /* 큰 낱말 갈래(분야 · 자녀 나이 등) — 모두 강좌 목록으로 */
  SEC['l4-cats'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 4); if (!C.length) return empty(x);
    return sec(x, s, 'cats', `<div class="l4w">${head(d)}<div class="l4-kg n${C.length}">${C.map((c, i) => `<a class="k${i}" href="#courses"><span class="l4-kn">${E(c[2] || String(i + 1).padStart(2, '0'))}</span><b>${E(c[0])}</b>${c[1] ? `<small>${E(c[1])}</small>` : ''}${ic('arrow', 22, 2)}</a>`).join('')}</div></div>`); };
  /* 시니어 큰 바로 가기 세 칸 */
  SEC['l4-tiles'] = (x, s) => { const d = x.data || {}; const t = telOf(); const Q = [['배울 강좌 찾기', '지금 신청할 수 있는 강좌', '#courses', 'book'], ['내 강의실', '듣고 있는 강좌 · 수료증', '#my', 'user'], t ? ['전화 상담', t, 'tel:' + t, 'phone'] : ['상담 남기기', '궁금한 점을 적어 주세요', '#comm', 'arrow']];
    return sec(x, s, 'tiles', `<div class="l4w">${head(d)}<div class="l4-tg3">${Q.map((q, i) => `<a class="t${i}" href="${E(q[2])}"><span class="l4-ti">${ic(q[3], 34, 1.9)}</span><b>${E(q[0])}</b><small>${E(q[1])}</small></a>`).join('')}</div></div>`); };
  /* 공지 + 문의 */
  SEC['l4-help'] = (x, s) => { const d = x.data || {}; const N = notes(3); const tel = telOf(); const hr = hoursOf(); const nw = n => okD(n.at) && days(n.at, tday()) <= 7;
    /* 공지 모양은 공통 hx-ntc와 맞춘다: 날짜 열 · 고정 배지 · 7일 이내 N · 3건 + 더 보기 */
    return sec(x, s, 'help', `<div class="l4w l4-hg"><div><div class="l4-nh"><h2 class="l4-h2">${E(d.title || '알림')}</h2>${N.length ? `<a class="l4-more" href="#notice">더 보기 ${ic('arrow', 18, 2)}</a>` : ''}</div>${N.length ? `<ul class="l4-nl">${N.map(n => `<li><a href="#notice"><time><b>${E(okD(n.at) ? dot(n.at) : '')}</b><small>${E(okD(n.at) ? n.at.slice(0, 4) : '')}</small></time><span>${n.pin ? '<em class="pin">고정</em>' : ''}${nw(n) ? '<em class="nw">N</em>' : ''}${E(n.title)}</span></a></li>`).join('')}</ul>` : `<p class="l4-none">새 공지가 올라오면 여기에 차례로 보여요. <a href="#notice">공지 보기</a></p>`}</div>
<div class="l4-call"><h3>${E(d.sub || '궁금한 점은 편하게 물어보세요')}</h3>${tel ? `<a class="l4-tel" href="tel:${E(tel)}">${ic('phone', 30, 2)}<span>${E(tel)}</span></a>${hr ? `<p>${E(hr)}</p>` : ''}` : '<p>수강 신청 · 수료증 · 수강료는 담당자가 확인해 드려요.</p>'}<a class="l4-b line" href="#comm"><span>온라인으로 문의하기</span>${ic('arrow', 20, 2)}</a></div></div>`); };
  /* v44.1(GAP B 평생): 분야 아이콘 그리드 — 실제 공개 강좌 이름으로 분야를 나눠 개수와 함께(분야 2개 이상일 때만) */
  const FLD = [[/^(senior|ai|code|data)$/, '디지털 · AI', 'M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2'], [/^(barista|cook|bake)$/, '요리 · 커피', 'M5 9h11v5a5 5 0 01-5 5h-1a5 5 0 01-5-5zM16 10h2a2 2 0 010 4h-2M8 3v3M12 3v3'],
    [/^(read|write|callig)$/, '인문 · 글쓰기', PATH.book], [/^(pottery|wood|knit|weave|craft)$/, '공예 · 손작업', 'M12 3c3 4 5 6 5 10a5 5 0 01-10 0c0-4 2-6 5-10z'], [/^(paint|design|photo|video)$/, '미술 · 사진', 'M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1a6 6 0 00-6-12zM8 10h.01M12 7h.01M16 10h.01'],
    [/^(piano|guitar|studio|music)$/, '음악', 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z'], [/^(yoga|sports|soccer|basket|dance)$/, '건강 · 운동', 'M12 5a2 2 0 100-4 2 2 0 000 4zM6 22l3-8 3 3 3-3 3 8M8 10h8'],
    [/^lang$/, '어학', 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'], [/^(counsel|service)$/, '취업 · 창업', 'M4 8h16v11H4zM9 8V5h6v3'], [/^(garden|science)$/, '원예 · 생태', 'M5 19c0-8 6-13 14-14-1 8-6 14-14 14zM5 19l7-7'],
    [/^(family|kids)$/, '가족 · 육아', 'M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z'], [/^(exam|legal)$/, '자격 · 시험', 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3']];
  const fields = () => { const h = H(); const M = new Map(); live().forEach(c => { let k = ''; try { const r = h && typeof h.courseRule === 'function' ? h.courseRule(c.name) : null; k = r ? r.k : ''; } catch (e) { } const f = FLD.find(x => x[0].test(k)); if (!f) return; const o = M.get(f[1]) || { l: f[1], ic: f[2], n: 0, first: c.name }; o.n++; M.set(f[1], o); });
    return [...M.values()].sort((a, b) => b.n - a.n).slice(0, 8); };
  SEC['l4-fields'] = (x, s) => { const d = x.data || {}; const F = fields(); if (F.length < 2) return empty(x, '공개 강좌가 두 분야 이상이면 분야별 바로 가기가 보여요.');
    return sec(x, s, 'fields', `<div class="l4w">${head(d)}<div class="l4-fg n${F.length}">${F.map(f => `<a href="#courses"><span class="l4-fi"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${f.ic}"/></svg></span><b>${E(f.l)}</b><small>강좌 ${f.n}개 · ${E(f.first)}</small></a>`).join('')}</div></div>`); };
  /* v44.1(GAP B 평생): 시니어 전화 신청 띠 — 대표번호가 있을 때만 */
  SEC['l4-callbar'] = (x, s) => { const d = x.data || {}; const t = telOf(); if (!t) return empty(x, '설정 › 바닥글에 대표번호를 넣으면 전화 신청 띠가 보여요.'); const hr = hoursOf();
    return sec(x, s, 'callbar', `<div class="l4w l4-cbg"><span class="l4-cbi">${ic('phone', 40, 2)}</span><div><h2>${E(d.title || '전화로도 신청할 수 있어요')}</h2><p>${E(d.sub || '이름과 듣고 싶은 강좌만 말씀해 주세요.')}${hr ? ` · ${E(hr)}` : ''}</p></div><a class="l4-cbb" href="tel:${E(t)}"><small>전화 걸기</small><b>${E(t)}</b></a></div>`); };
  /* 마지막 행동 */
  SEC['l4-cta'] = (x, s) => { const d = x.data || {}; const t = telOf();
    return sec(x, s, 'end', `<div class="l4w l4-eg">${ey(d)}<h2 class="l4-h2">${T2(d.title, 'em')}</h2>${d.sub ? `<p class="l4-sd">${E(d.sub)}</p>` : ''}<div class="l4-cta">${btn('pri', d.cta || '강좌 둘러보기', href(d.link, '#courses'), 1)}${t ? btn('line', `전화 ${t}`, 'tel:' + t) : btn('line', d.cta2 || '내 강의실', href(d.link2, '#my'), 1)}</div></div>`); };

  /* ── CSS: 공통(변수) + 섹션 + 첫 화면 10종 ── */
  function css(s) { const th = thOf(s); const D = DEF[th]; const T = HPT.tokens(s) || {}; const a = (T.a && /^#[0-9a-f]{6}$/i.test(T.a)) ? T.a : D.acc;
    const dark = !!D.dark; const bw = dark ? '#ffffff' : '#000000'; const aB = dark ? a : fit(a, '#ffffff', 4.6, '#000000'); /* 버튼 바탕: 흰 글자 대비 */ const on = onC(aB);
    const at = fit(a, D.bg, D.big ? 7 : 4.6, bw); const atA = fit(a, D.alt, 4.6, bw); const mu = fit(D.mu, D.alt, D.big ? 7 : 4.6, bw); const ptT = fit(D.pt, D.bg, 4.6, bw);
    const ln = dark ? 'rgba(255,255,255,.16)' : al(D.ink, .13); const dkOn = onC(D.dk); const ptDk = fit(D.pt, D.dk, 4.6, '#ffffff'); const B = D.big ? 1 : 0;
    let x = `/* hp44-life ${th} */
.l4{--a:${aB};--on:${on};--at:${at};--ata:${atA};--bg:${D.bg};--alt:${D.alt};--ink:${D.ink};--mu:${mu};--pt:${D.pt};--ptt:${ptT};--ln:${ln};--dk:${D.dk};--dkon:${dkOn};--ptdk:${ptDk};--r:${D.r}px;--br:${D.br}px;--hf:${D.hf};--hw:${D.hw};--nw:${D.nw};
font-family:${SANS};color:var(--ink);background:var(--bg);font-size:${B ? 19 : 17}px;line-height:1.7;letter-spacing:-.01em;word-break:keep-all;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;padding:150px 0;position:relative}
.l4 *{box-sizing:border-box}.l4 :is(h1,h2,h3,p,ol,ul,dl,dd,figure,blockquote){margin:0;padding:0}.l4 :is(ol,ul){list-style:none}.l4 a{color:inherit;text-decoration:none}.l4 svg{flex:none}
.l4 .l4w{max-width:1200px;margin:0 auto;padding:0 40px;position:relative}
.l4 figure{overflow:hidden;background:${mix(D.bg, bw, .07)}}.l4 figure img{width:100%;height:100%;object-fit:cover;display:block}
.l4 :is(h1,.l4-h2,blockquote){font-family:var(--hf);font-weight:var(--hw)}.l4 h1 :is(em,b),.l4 .l4-h2 em{font-style:normal}.l4 .l4-h2 em{color:var(--at)}
.l4 a:focus-visible{outline:3px solid ${al(a, .55)};outline-offset:3px}
.l4 .l4-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:${B ? 68 : 58}px;padding:0 ${B ? 34 : 28}px;font-weight:700;font-size:${B ? 20 : 17}px;white-space:nowrap;border-radius:var(--br);transition:transform .2s,background .2s}.l4 .l4-b:hover{transform:translateY(-1px)}
.l4 .l4-b.pri{background:var(--a);color:var(--on)}.l4 .l4-b.line{box-shadow:inset 0 0 0 1.5px currentColor;color:var(--ink)}.l4 .l4-b.soft{background:${mix(D.bg, bw, .06)};color:var(--ink)}.l4 .l4-b.wh{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.8);color:#fff}
.l4 .l4-cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:44px}
.l4 .l4-ey{font-size:15px;font-weight:700;color:var(--at);margin-bottom:20px;letter-spacing:.01em}
.l4 .l4-h2{font-size:${B ? 58 : 56}px;line-height:1.2;letter-spacing:-.045em}
.l4 .l4-sd{font-size:${B ? 21 : 19}px;color:var(--mu);margin-top:22px;max-width:600px}
.l4 .l4-lead{font-size:${B ? 23 : 20}px;color:var(--mu);margin-top:30px;max-width:560px;line-height:1.7}
.l4 .l4-note{margin-top:22px;font-size:15px;color:var(--mu);display:flex;gap:8px;align-items:center}
.l4 .l4-ln{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-weight:700;border-bottom:2px solid currentColor}
.l4 .l4-more{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-weight:700;color:var(--at);white-space:nowrap;font-size:${B ? 20 : 17}px}
.l4 .l4-head{display:flex;justify-content:space-between;align-items:end;gap:40px;margin-bottom:64px}
.l4-emp{padding:32px 0!important}.l4-emp p{font-size:14px;color:#6B7280}
/* 강좌 카드 */
.l4 .l4-cg{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}.l4 .l4-cg.n1{grid-template-columns:minmax(0,440px)}.l4 .l4-cg.n2{grid-template-columns:repeat(2,minmax(0,500px))}
.l4 .l4-card{display:flex;flex-direction:column;height:100%;transition:transform .3s}.l4 .l4-card:hover{transform:translateY(-4px)}.l4 .l4-cph{aspect-ratio:4/3;border-radius:var(--r)}.l4 .l4-card:hover .l4-cph img{transform:scale(1.04)}.l4 .l4-cph img{transition:transform .5s}
.l4 .l4-cb{display:flex;flex-direction:column;flex:1;padding-top:24px}.l4 .l4-tg{font-size:${B ? 17 : 14}px;font-weight:700;color:var(--at)}.l4 .l4-card h3{font-size:${B ? 28 : 26}px;line-height:1.3;font-weight:800;letter-spacing:-.035em;margin-top:8px}
.l4 .l4-cd{font-size:16px;color:var(--mu);margin-top:10px}.l4 .l4-cm{margin-top:auto;padding-top:20px;display:flex;justify-content:space-between;gap:16px;font-size:${B ? 17 : 15}px;color:var(--mu)}.l4 .l4-cm b{color:var(--ink);white-space:nowrap}
.l4 .c-box .l4-card{background:var(--alt);border-radius:var(--r);overflow:hidden;box-shadow:0 0 0 1px var(--ln)}.l4 .c-box .l4-cph{border-radius:0}.l4 .c-box .l4-cb{padding:26px 28px 30px}.l4 .c-box .l4-cm{border-top:1px solid var(--ln);margin-top:auto;padding-top:18px}
.l4 .c-box li .l4-cb{min-height:200px}
.l4 .c-mag{grid-template-columns:1.25fr 1fr 1fr;align-items:start}.l4 .c-mag li:first-child .l4-cph{aspect-ratio:4/3}.l4 .c-mag .l4-cph{aspect-ratio:4/3}.l4 .c-mag h3{font-family:var(--hf);font-weight:700}
.l4 .c-line .l4-card{border-top:1px solid var(--ink);padding-top:22px}.l4 .c-line .l4-cph{aspect-ratio:4/3;filter:saturate(.85)}.l4 .c-line h3{font-family:var(--hf);font-weight:600}
.l4 .c-over .l4-card{position:relative;aspect-ratio:4/3.6;border-radius:var(--r);overflow:hidden;color:#fff;background:#222}.l4 .c-over .l4-cph{position:absolute;inset:0;aspect-ratio:auto;border-radius:0}.l4 .c-over .l4-card:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,10,12,.88),rgba(10,10,12,.35) 50%,rgba(10,10,12,0) 72%)}
.l4 .c-over .l4-cb{position:absolute;left:0;right:0;bottom:0;z-index:1;padding:30px}.l4 .c-over .l4-tg{color:${fit(D.pt, '#1a1a1a', 6, '#ffffff')}}.l4 .c-over :is(.l4-cd,.l4-cm){color:rgba(255,255,255,.82)}.l4 .c-over .l4-cm b{color:#fff}
.l4 .c-poly .l4-card{background:#fff;padding:14px 14px 22px;box-shadow:0 18px 40px -22px ${al(D.ink, .45)};border-radius:4px}.l4 .c-poly li:nth-child(1) .l4-card{transform:rotate(-1.4deg)}.l4 .c-poly li:nth-child(3) .l4-card{transform:rotate(1.2deg)}.l4 .c-poly .l4-cph{border-radius:2px;aspect-ratio:4/3}.l4 .c-poly .l4-cb{padding:20px 8px 0}.l4 .c-poly h3{font-family:var(--hf);font-weight:400;font-size:28px}
/* 시간표 */
.l4 .l4-ls{border-top:2px solid var(--ink)}.l4 .l4-rw{display:grid;grid-template-columns:150px 1fr auto 28px;gap:32px;align-items:center;padding:${B ? 34 : 28}px 0;border-bottom:1px solid var(--ln);transition:background .2s}.l4 .l4-rw:hover{background:${mix(D.bg, bw, .03)}}
.l4 .l4-dt b{display:block;font-size:${B ? 34 : 30}px;font-weight:800;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums;font-family:var(--hf)}.l4 .l4-dt small{font-size:${B ? 17 : 14}px;color:var(--mu)}
.l4 .l4-rn b{display:block;font-size:${B ? 27 : 23}px;font-weight:700;letter-spacing:-.03em;line-height:1.35}.l4 .l4-rn small{display:block;font-size:${B ? 17 : 15}px;color:var(--mu);margin-top:6px}.l4 .l4-pr{font-size:${B ? 19 : 16}px;font-weight:700;white-space:nowrap}.l4 .l4-rw svg{color:var(--at)}
/* 큰 숫자 */
.l4.l4-num{background:var(--dk);color:var(--dkon)}.l4 .l4-ng{display:grid;grid-template-columns:auto 1fr;gap:80px;align-items:end}
.l4 .l4-n{font-size:230px;line-height:.82;font-weight:var(--nw);letter-spacing:-.06em;font-family:var(--hf);font-variant-numeric:tabular-nums}.l4 .l4-n span{font-size:.36em;color:var(--ptdk);margin-left:10px;letter-spacing:-.02em}
.l4 .l4-nt2{font-size:30px;line-height:1.45;font-weight:600;letter-spacing:-.03em}.l4 .l4-ns{font-size:16px;opacity:.78;margin-top:16px}.l4.l4-num .l4-ln{margin-top:28px;color:var(--ptdk)}
/* 이야기 */
.l4.l4-story{background:var(--alt)}.l4 .l4-sg{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}.l4 .l4-sg.flip>figure{order:2}.l4 .l4-sph{border-radius:var(--r);aspect-ratio:4/4.6}
.l4 .l4-dl{margin-top:44px;border-top:1px solid var(--ln)}.l4 .l4-dl div{display:grid;grid-template-columns:150px 1fr;gap:20px;padding:24px 0;border-bottom:1px solid var(--ln)}.l4 .l4-dl dt{font-weight:700}.l4 .l4-dl dd{color:var(--mu)}
.l4 .l4-steps{margin-top:44px}.l4 .l4-steps li{display:grid;grid-template-columns:60px 1fr;padding:26px 0;border-top:1px solid var(--ln)}.l4 .l4-steps li:last-child{border-bottom:1px solid var(--ln)}
.l4 .l4-sn{font-size:16px;font-weight:800;color:var(--ata);padding-top:3px;font-variant-numeric:tabular-nums}.l4 .l4-steps h3{font-size:${B ? 25 : 22}px;font-weight:700;letter-spacing:-.03em}.l4 .l4-steps p{font-size:${B ? 18 : 16}px;color:var(--mu);margin-top:6px}
/* 가로 단계 */
.l4 .l4-fl{margin-top:64px;display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid var(--ink)}.l4 .l4-fl.n3{grid-template-columns:repeat(3,1fr)}.l4 .l4-fl.n2{grid-template-columns:1fr 1fr}
.l4 .l4-fl li{padding:34px 32px 0 0}.l4 .l4-fl li+li{padding-left:32px;border-left:1px solid var(--ln)}
.l4 .l4-fk{display:block;font-size:${B ? 64 : 48}px;line-height:1;font-weight:var(--nw);color:var(--ptt);letter-spacing:-.04em;font-family:var(--hf);font-variant-numeric:tabular-nums}.l4 .l4-fl h3{font-size:${B ? 27 : 23}px;font-weight:800;letter-spacing:-.03em;margin-top:24px}.l4 .l4-fl p{font-size:${B ? 18 : 16}px;color:var(--mu);margin-top:8px}
.l4.l4-flow.inv{background:var(--dk);color:var(--dkon)}.l4.l4-flow.inv :is(.l4-sd,.l4-fl p){color:inherit;opacity:.78}.l4.l4-flow.inv :is(.l4-ey,.l4-fk,.l4-h2 em){color:var(--ptdk)}.l4.l4-flow.inv .l4-fl{border-color:currentColor}.l4.l4-flow.inv .l4-fl li+li{border-color:rgba(255,255,255,.18)}
/* 인용 */
.l4.l4-quote{background:var(--alt)}.l4 blockquote{font-size:48px;line-height:1.42;letter-spacing:-.045em;max-width:1000px}.l4 blockquote:before{content:"“";display:block;font-size:110px;line-height:.7;color:var(--a);margin-bottom:22px;font-family:${SERIF}}
.l4 .l4-who{margin-top:40px;font-size:17px;color:var(--mu)}.l4 .l4-who b{color:var(--ink)}
/* 사진 띠 */
.l4.l4-band{height:620px;padding:0;overflow:hidden;background:#111}.l4.l4-band .l4-bg{position:absolute;inset:0;height:100%}.l4.l4-band:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.74) 0%,rgba(0,0,0,.46) 45%,rgba(0,0,0,.05) 82%)}
.l4.l4-band .l4-in{position:absolute;inset:0;z-index:2;display:flex;align-items:center;color:#fff}.l4.l4-band .l4w{width:100%}.l4.l4-band h2{font-family:var(--hf);font-size:58px;line-height:1.22;font-weight:var(--hw);letter-spacing:-.045em;max-width:760px}.l4.l4-band p{margin-top:22px;font-size:19px;max-width:540px;opacity:.9}
/* 큰 낱말 */
.l4 .l4-kg{margin-top:64px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.l4 .l4-kg.n3{grid-template-columns:repeat(3,1fr)}.l4 .l4-kg.n2{grid-template-columns:1fr 1fr}
.l4 .l4-kg a{display:flex;flex-direction:column;min-height:300px;padding:34px 30px;border-radius:var(--r);background:var(--alt);box-shadow:0 0 0 1px var(--ln);transition:transform .25s}.l4 .l4-kg a:hover{transform:translateY(-4px)}
.l4 .l4-kn{font-size:15px;font-weight:800;color:var(--ata);letter-spacing:.04em}.l4 .l4-kg b{font-family:var(--hf);font-size:40px;line-height:1.15;font-weight:var(--hw);letter-spacing:-.04em;margin-top:auto}.l4 .l4-kg small{font-size:16px;color:var(--mu);margin-top:12px}.l4 .l4-kg svg{margin-top:22px;color:var(--ata)}
.l4 .l4-kg a.k1{background:var(--a);color:var(--on);box-shadow:none}.l4 .l4-kg a.k1 :is(.l4-kn,small,svg){color:inherit;opacity:.88}
/* 큰 바로 가기(시니어) */
.l4 .l4-tg3{margin-top:56px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.l4 .l4-tg3 a{display:flex;flex-direction:column;gap:6px;padding:38px 36px;min-height:280px;border-radius:var(--r);background:var(--alt);border:2px solid ${al(D.ink, .14)};transition:transform .2s}.l4 .l4-tg3 a:hover{transform:translateY(-3px)}
.l4 .l4-ti{width:72px;height:72px;border-radius:20px;display:grid;place-items:center;background:var(--a);color:var(--on);margin-bottom:auto}.l4 .l4-tg3 b{font-size:32px;line-height:1.25;letter-spacing:-.035em;margin-top:32px}.l4 .l4-tg3 small{font-size:19px;color:var(--mu)}
.l4 .l4-tg3 a.t2{background:var(--dk);color:var(--dkon);border-color:var(--dk)}.l4 .l4-tg3 a.t2 small{color:inherit;opacity:.85}.l4 .l4-tg3 a.t2 .l4-ti{background:var(--pt);color:#141414}
/* 공지 + 문의 */
.l4.l4-help{background:var(--alt);padding:130px 0}.l4 .l4-hg{display:grid;grid-template-columns:1.2fr 1fr;gap:72px}.l4 .l4-nl{margin-top:30px;border-top:2px solid var(--ink)}.l4 .l4-nh{display:flex;justify-content:space-between;align-items:end;gap:20px}.l4 .l4-nl a{display:grid;grid-template-columns:${B ? 96 : 84}px 1fr;gap:20px;align-items:center;padding:${B ? 24 : 20}px 0;border-bottom:1px solid var(--ln);font-size:${B ? 20 : 17}px;font-weight:600}
.l4 .l4-nl time{display:flex;flex-direction:column;line-height:1.2;color:var(--mu)}.l4 .l4-nl time b{font-size:${B ? 24 : 21}px;color:var(--ink);font-variant-numeric:tabular-nums;letter-spacing:-.02em}.l4 .l4-nl time small{font-size:${B ? 18 : 13}px}
.l4 .l4-nl em{display:inline-block;font-style:normal;font-size:${B ? 16 : 13}px;font-weight:800;padding:2px 9px;border-radius:999px;margin-right:8px;vertical-align:2px}.l4 .l4-nl em.pin{background:var(--a);color:var(--on)}.l4 .l4-nl em.nw{background:${al(D.pt, .22)};color:var(--ink)}
.l4 .l4-none{margin-top:30px;padding:28px 0;border-top:2px solid var(--ink);color:var(--mu)}.l4 .l4-none a{color:var(--at);font-weight:700;text-decoration:underline}
.l4 .l4-call{background:var(--bg);padding:44px;border-top:6px solid var(--a);border-radius:${Math.min(D.r, 14)}px}.l4 .l4-call h3{font-size:${B ? 28 : 25}px;font-weight:800;letter-spacing:-.03em}.l4 .l4-tel{display:flex;align-items:center;gap:12px;font-size:${B ? 46 : 38}px;font-weight:800;letter-spacing:-.03em;color:var(--at);margin-top:18px}.l4 .l4-call p{color:var(--mu);margin-top:8px}.l4 .l4-call .l4-b{margin-top:28px}
/* 요일 · 시간대 칩 */
.l4 .l4-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.l4 .l4-chips i{font-style:normal;font-size:${B ? 18 : 13.5}px;font-weight:700;line-height:1.3;padding:5px 11px;border-radius:999px;background:${mix(a, dark ? '#000000' : '#ffffff', dark ? .7 : .88)};color:${dark ? D.ink : fit(a, mix(a, '#ffffff', .88), 4.6, '#000000')}}.l4 .l4-chips i.tb{background:transparent;box-shadow:inset 0 0 0 1.5px currentColor}
.l4 .c-over .l4-chips i{background:rgba(255,255,255,.18);color:#fff}.l4 .l4-rn .l4-chips{margin:8px 0 2px}
/* 분야 아이콘 그리드 */
.l4.l4-fields{background:var(--bg)}.l4 .l4-fg{margin-top:56px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.l4 .l4-fg.n2{grid-template-columns:repeat(2,1fr)}.l4 .l4-fg.n3{grid-template-columns:repeat(3,1fr)}
.l4 .l4-fg a{min-width:0;display:flex;flex-direction:column;gap:6px;padding:30px 28px;border-radius:var(--r);background:var(--alt);box-shadow:0 0 0 1px var(--ln);transition:transform .25s,box-shadow .25s}.l4 .l4-fg a:hover{transform:translateY(-3px);box-shadow:0 0 0 1.5px var(--a)}
.l4 .l4-fi{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:${mix(a, dark ? '#000000' : '#ffffff', dark ? .6 : .86)};color:${dark ? D.pt : at};margin-bottom:18px}.l4 .l4-fg b{font-size:22px;letter-spacing:-.03em}.l4 .l4-fg small{font-size:15px;color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 전화 신청 띠 */
.l4.l4-callbar{background:var(--dk);color:var(--dkon);padding:72px 0}.l4 .l4-cbg{display:grid;grid-template-columns:auto 1fr auto;gap:36px;align-items:center}.l4 .l4-cbi{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;background:var(--pt);color:#141414}
.l4.l4-callbar h2{font-size:40px;line-height:1.25;letter-spacing:-.035em}.l4.l4-callbar p{font-size:20px;opacity:.88;margin-top:8px}.l4 .l4-cbb{display:flex;flex-direction:column;justify-content:center;min-height:96px;padding:12px 40px;border-radius:var(--br);background:var(--pt);color:#141414}.l4 .l4-cbb small{font-size:18px;font-weight:700}.l4 .l4-cbb b{font-size:34px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
/* 마지막 행동 */
.l4.l4-end{text-align:center}.l4 .l4-eg .l4-h2{font-size:${B ? 64 : 68}px}.l4 .l4-eg .l4-sd{margin:24px auto 0}.l4 .l4-eg .l4-cta{justify-content:center}
@media (max-width:720px){.l4{padding:88px 0;font-size:${B ? 18 : 16}px}.l4 .l4w{padding:0 20px}.l4 .l4-h2,.l4 .l4-eg .l4-h2{font-size:${B ? 36 : 33}px;line-height:1.26}.l4 .l4-sd{font-size:${B ? 18 : 16}px}.l4 .l4-lead{font-size:${B ? 20 : 17}px;margin-top:20px}
.l4 .l4-cta{flex-direction:column;margin-top:32px;gap:10px}.l4 .l4-cta .l4-b{width:100%;height:${B ? 66 : 56}px}.l4 a{min-height:44px}.l4 p a{display:inline-flex;align-items:center}.l4 .l4-head{flex-direction:column;align-items:flex-start;margin-bottom:36px;gap:12px}
.l4 .l4-cg,.l4 .l4-cg.n1,.l4 .l4-cg.n2,.l4 .c-mag{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin:0 -20px;padding:4px 20px 14px;scrollbar-width:none;align-items:stretch}.l4 .l4-cg::-webkit-scrollbar{display:none}.l4 .l4-cg>li{flex:0 0 78%;scroll-snap-align:start}.l4 .l4-cg.n1>li{flex-basis:100%}.l4 .c-mag li:first-child .l4-cph,.l4 .c-mag .l4-cph{aspect-ratio:4/3}.l4 .l4-card h3{font-size:${B ? 25 : 22}px}.l4 .c-box .l4-cb{padding:22px 22px 24px;min-height:0}.l4 .c-box li .l4-cb{min-height:0}.l4 .c-over .l4-card{aspect-ratio:4/4.6}.l4 .c-poly .l4-card{box-shadow:0 10px 24px -16px rgba(0,0,0,.4)}.l4 .c-over .l4-cb{padding:22px}.l4 .c-poly .l4-card{transform:none!important}
.l4 .l4-rw{grid-template-columns:${B ? 96 : 76}px 1fr;gap:6px 16px;padding:22px 0;align-items:start}.l4 .l4-dt b{font-size:${B ? 26 : 22}px}.l4 .l4-dt small{font-size:${B ? 16 : 13}px}.l4 .l4-rn b{font-size:${B ? 21 : 18}px}.l4 .l4-rn small{font-size:${B ? 16 : 14}px}.l4 .l4-pr{grid-column:2;font-size:${B ? 17 : 15}px}.l4 .l4-rw>svg{display:none}
.l4 .l4-ng{grid-template-columns:1fr;gap:28px}.l4 .l4-n{font-size:120px}.l4 .l4-nt2{font-size:22px}
.l4 .l4-sg,.l4 .l4-sg.flip{grid-template-columns:1fr;gap:40px}.l4 .l4-sg.flip>figure{order:0}.l4 .l4-sph{aspect-ratio:4/3}.l4 .l4-dl div{grid-template-columns:1fr;gap:4px;padding:18px 0}.l4 .l4-steps{margin-top:30px}.l4 .l4-steps li{grid-template-columns:44px 1fr;padding:20px 0}.l4 .l4-steps h3{font-size:${B ? 22 : 19}px}.l4 .l4-steps p{font-size:${B ? 17 : 15}px}
.l4 .l4-fl,.l4 .l4-fl.n3,.l4 .l4-fl.n2{grid-template-columns:1fr;margin-top:36px}.l4 .l4-fl li,.l4 .l4-fl li+li{padding:24px 0;border-left:0;border-bottom:1px solid var(--ln)}.l4 .l4-fk{font-size:${B ? 44 : 36}px}.l4 .l4-fl h3{font-size:${B ? 23 : 20}px;margin-top:12px}
.l4 blockquote{font-size:28px}.l4 blockquote:before{font-size:76px}
.l4.l4-band{height:540px}.l4.l4-band:after{background:linear-gradient(0deg,rgba(0,0,0,.82),rgba(0,0,0,.1) 82%)}.l4.l4-band .l4-in{align-items:flex-end;padding-bottom:52px}.l4.l4-band h2{font-size:32px}.l4.l4-band p{font-size:16px}
.l4 .l4-kg,.l4 .l4-kg.n3,.l4 .l4-kg.n2{grid-template-columns:1fr 1fr;gap:12px;margin-top:36px}.l4 .l4-kg a{min-height:190px;padding:22px 18px}.l4 .l4-kg b{font-size:26px}.l4 .l4-kg small{font-size:14px}.l4 .l4-kg svg{display:none}
.l4 .l4-tg3{grid-template-columns:1fr;gap:14px;margin-top:36px}.l4 .l4-tg3 a{min-height:0;padding:26px 24px;display:grid;grid-template-columns:64px 1fr;gap:2px 18px;align-items:center}.l4 .l4-ti{width:64px;height:64px;grid-row:span 2;margin:0}.l4 .l4-tg3 b{font-size:25px;margin:0}.l4 .l4-tg3 small{font-size:17px}
.l4.l4-help{padding:80px 0}.l4 .l4-hg{grid-template-columns:1fr;gap:40px}.l4 .l4-nl a{grid-template-columns:${B ? 76 : 64}px 1fr;gap:14px;font-size:${B ? 18 : 16}px}.l4 .l4-nl time b{font-size:${B ? 20 : 18}px}
.l4 .l4-fg,.l4 .l4-fg.n2,.l4 .l4-fg.n3{grid-template-columns:1fr 1fr;gap:10px;margin-top:32px}.l4 .l4-fg a{padding:20px 16px}.l4 .l4-fi{width:48px;height:48px;margin-bottom:10px}.l4 .l4-fi svg{width:24px;height:24px}.l4 .l4-fg b{font-size:18px}.l4 .l4-fg small{font-size:13px}
.l4.l4-callbar{padding:56px 0}.l4 .l4-cbg{grid-template-columns:1fr;gap:18px}.l4 .l4-cbi{width:72px;height:72px}.l4.l4-callbar h2{font-size:30px}.l4.l4-callbar p{font-size:18px}.l4 .l4-cbb{min-height:84px;padding:12px 24px}.l4 .l4-cbb b{font-size:30px}.l4 .l4-call{padding:28px 22px}.l4 .l4-tel{font-size:${B ? 34 : 30}px}.l4 .l4-call .l4-b{width:100%}}
`;
    /* 머리 · 바닥 줄 */
    x += `.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid ${ln}!important;box-shadow:none!important}.gh.hps-h .hps-hw{border-radius:0!important;border:0!important;box-shadow:none!important;background:transparent!important}${dark ? `.gh.hps-h :is(a,b,span,label,svg){color:${D.ink}!important}` : ''}.gh .hps-cta{background:${dark ? D.pt : aB}!important;color:${onC(dark ? D.pt : aB)}!important;border-radius:${Math.min(D.br, 999)}px!important}.gh .hps-cta *{color:${onC(dark ? D.pt : aB)}!important}
.gf.hps-f{background:${D.dk === D.bg ? mix(D.dk, '#000000', .3) : D.dk}!important}.gf.hps-f :is(p,a,span,li,em,small,dt,dd){color:${al(dkOn, .74)}!important}.gf.hps-f :is(strong,b,.hps-fn,.hps-fl){color:${dkOn}!important}.gf.hps-f a.hps-apc{background:${dark ? D.pt : dkOn}!important;color:${dark ? '#15120F' : D.dk}!important}.gf.hps-f a.hps-apc *{color:inherit!important}
`;
    x += (THX[th] || (() => ''))(D, a, aB);
    x += HCSS[D.k](D, aB, on, at);
    return x; }

  /* 테마별 보정(섹션 표정) */
  const THX = {
    lfhall: D => `.lfhall .l4-ey{color:var(--ptt);letter-spacing:.14em;font-weight:600}.lfhall.l4-num{text-align:center}.lfhall .l4-ng{grid-template-columns:1fr;justify-items:center;gap:28px}.lfhall .l4-n span{display:none}.lfhall .l4-nt2{max-width:640px;margin:0 auto;font-weight:500}.lfhall.l4-quote{background:var(--alt)}.lfhall blockquote{margin:0 auto;text-align:center}.lfhall blockquote:before{color:var(--pt)}.lfhall .l4-who{text-align:center}.lfhall .l4-b.pri{background:var(--dk)}`,
    lfuniv: D => `.lfuniv .l4-n span{color:${D.pt}}.lfuniv.l4-quote{text-align:center;background:#F5F6F8}.lfuniv blockquote{margin:0 auto;font-weight:700}.lfuniv blockquote:before{display:none}.lfuniv blockquote:after{content:"";display:block;width:120px;height:8px;background:${D.pt};margin:36px auto 0;border-radius:4px}`,
    lfsenior: D => `section.l4 :is(p,small,span,dd,dt,li,time,em,i,figcaption),section[data-hx] :is(p,small,span,dd,dt,li,time,em,i,figcaption,summary,a,button,label){font-size:max(18px,1em)}.l4 .l4-chips i{font-size:18px}.lfsenior .l4-h2{letter-spacing:-.035em}.lfsenior.l4-rows .l4-rw{padding-left:20px;padding-right:20px;margin:0 -20px}.lfsenior .l4-pr{background:${mix(D.pt, '#ffffff', .72)};padding:6px 14px;border-radius:999px;color:#141414}.lfsenior.l4-flow{background:var(--alt)}`,
    lfhuman: D => `.lfhuman .l4-ey{letter-spacing:.24em;font-size:13px;color:var(--pt);font-weight:600}.lfhuman .l4-h2{font-size:58px;line-height:1.26}.lfhuman .l4-b.pri{background:var(--pt);color:#15120F}.lfhuman .l4-b.line{color:var(--ink)}.lfhuman.l4-rows{background:var(--alt)}.lfhuman .l4-ls{border-color:var(--pt)}.lfhuman .l4-dt b{color:var(--pt);font-weight:600}.lfhuman .l4-rn b{font-family:var(--hf);font-weight:600;font-size:26px}
.lfhuman.l4-quote{background:var(--bg);text-align:center}.lfhuman blockquote{margin:0 auto;font-size:52px;line-height:1.45}.lfhuman blockquote:before{color:var(--pt)}.lfhuman.l4-end{background:var(--alt)}.lfhuman .c-line .l4-card{border-color:var(--pt)}
@media (max-width:720px){.lfhuman .l4-h2{font-size:32px}.lfhuman .l4-rn b{font-size:20px}.lfhuman blockquote{font-size:28px}}`,
    lfvillage: D => `.lfvillage .l4-h2{font-size:58px;line-height:1.25;letter-spacing:-.03em}.lfvillage .l4-ey{color:var(--ptt)}.lfvillage .l4-kg a{background:#fff;border-radius:22px;box-shadow:0 0 0 2px var(--ink)}.lfvillage .l4-kg a.k1{background:var(--pt);color:#fff;box-shadow:0 0 0 2px var(--ink)}.lfvillage .l4-kg a.k3{background:var(--a);color:#fff;box-shadow:0 0 0 2px var(--ink)}.lfvillage .l4-kg a.k3 :is(.l4-kn,small,svg){color:inherit}
.lfvillage .l4-kg b{font-weight:400}.lfvillage.l4-story{background:#FFFDF6}.lfvillage.l4-quote{background:var(--bg)}.lfvillage blockquote{font-size:50px;line-height:1.5;letter-spacing:-.02em}.lfvillage blockquote:before{color:var(--a);font-family:var(--hf)}.lfvillage.l4-end{background:var(--a);color:#fff}.lfvillage.l4-end :is(.l4-sd,.l4-ey,.l4-h2 em){color:#fff}.lfvillage.l4-end .l4-b.pri{background:#fff;color:${fit(D.acc, '#ffffff', 4.6, '#000000')}}.lfvillage.l4-end .l4-b.line{color:#fff}
@media (max-width:720px){.lfvillage .l4-h2{font-size:34px}.lfvillage blockquote{font-size:28px}}`,
    lfcredit: D => `.lfcredit .l4-ey{letter-spacing:.22em;font-size:13px;color:var(--ptt);font-weight:700}.lfcredit .l4-h2{font-weight:600;line-height:1.32}.lfcredit .l4-b{font-weight:600}.lfcredit.l4-flow{background:var(--alt);text-align:center}.lfcredit.l4-flow .l4-sd{margin:22px auto 0}.lfcredit .l4-fl{text-align:left;border-top:1px solid var(--ink);box-shadow:0 -5px 0 -3px var(--ink)}.lfcredit .l4-fk{font-style:italic;color:var(--ptt)}
.lfcredit.l4-num{background:var(--dk)}.lfcredit .l4-n{font-weight:400}.lfcredit.l4-rows .l4-ls{border-top:1px solid var(--ink);box-shadow:0 -5px 0 -3px var(--ink)}.lfcredit .l4-dt b{font-weight:600}.lfcredit.l4-end{border-top:1px solid ${al(D.pt, .5)}}`,
    lfculture: D => `.lfculture.l4-rows{background:var(--alt)}.lfculture .l4-dt b{color:var(--at)}.lfculture.l4-quote{background:var(--pt);text-align:center}.lfculture.l4-quote :is(blockquote,.l4-who,.l4-who b){color:#1A1216}.lfculture blockquote{margin:0 auto;font-weight:800}.lfculture blockquote:before{color:#1A1216}.lfculture.l4-end{background:var(--dk);color:#fff}.lfculture.l4-end :is(.l4-sd,.l4-ey){color:rgba(255,255,255,.82)}.lfculture.l4-end .l4-h2 em{color:${D.pt}}.lfculture.l4-end .l4-b.line{color:#fff}.lfculture.l4-end .l4-b.pri{background:${D.pt};color:#1A1216}`,
    lflibrary: D => `.lflibrary .l4-ey{display:inline-flex;align-items:center;gap:10px}.lflibrary .l4-ey:before{content:"";width:22px;height:3px;background:var(--pt)}.lflibrary.l4-story{background:var(--alt)}.lflibrary .l4-dl dt{color:var(--at)}.lflibrary.l4-num .l4-n span{color:${D.pt}}`,
    lfretire: D => `.lfretire .l4-h2{font-weight:600;line-height:1.3}.lfretire.l4-flow.inv{background:var(--dk)}.lfretire.l4-quote{background:var(--bg);text-align:center}.lfretire blockquote{margin:0 auto;font-weight:600}.lfretire blockquote:before{color:var(--pt)}.lfretire.l4-end{background:var(--alt)}`,
    lffamily: D => `.lffamily .l4-kg a{border-radius:200px 200px var(--r) var(--r);text-align:center;align-items:center;padding-top:56px}.lffamily .l4-kg a.k1{background:var(--pt);color:#25161F}.lffamily .l4-kg a.k1 :is(.l4-kn,small,svg){color:#25161F}.lffamily .l4-kg a.k2{background:var(--dk);color:#fff;box-shadow:none}.lffamily .l4-kg a.k2 :is(.l4-kn,small,svg){color:#fff;opacity:.88}
.lffamily.l4-story{background:#fff}.lffamily .l4-sph{border-radius:50%;aspect-ratio:1/1}.lffamily.l4-quote{background:var(--bg)}.lffamily blockquote{font-weight:700}.lffamily blockquote:before{color:var(--pt)}.lffamily.l4-end{background:var(--dk);color:#fff}.lffamily.l4-end :is(.l4-sd,.l4-ey){color:rgba(255,255,255,.84)}.lffamily.l4-end .l4-h2 em{color:${D.pt}}.lffamily.l4-end .l4-b.pri{background:${D.pt};color:#25161F}.lffamily.l4-end .l4-b.line{color:#fff}
@media (max-width:720px){.lffamily .l4-kg a{padding-top:32px;border-radius:120px 120px var(--r) var(--r)}}`
  };

  /* 첫 화면 CSS(종류별) */
  const HCSS = {
    almanac: (D) => `.l4-k-almanac{padding:96px 0 0}.l4-k-almanac .l4-g{display:grid;grid-template-columns:1fr 1.05fr;gap:64px;align-items:center}
.l4-k-almanac .l4-is{font-size:14px;font-weight:600;letter-spacing:.16em;color:var(--ptt);margin-bottom:36px}.l4-k-almanac h1{font-size:84px;line-height:1.16;letter-spacing:-.05em}.l4-k-almanac h1 em{color:var(--at)}.l4-k-almanac .l4-b.pri{background:var(--dk)}
.l4-k-almanac .l4-col{position:relative;height:660px}.l4-k-almanac .l4-col figure{position:absolute;border-radius:4px}.l4-k-almanac .l4-c1{left:0;top:40px;width:56%;height:520px}.l4-k-almanac .l4-c2{right:0;top:0;width:40%;height:290px}.l4-k-almanac .l4-c3{right:0;bottom:0;width:40%;height:350px}
.l4-k-almanac .l4-vol{position:absolute;left:-28px;bottom:36px;font-family:var(--hf);font-size:15px;letter-spacing:.3em;color:var(--ptt);writing-mode:vertical-rl}
.l4-k-almanac .l4-nt{margin-top:96px;border-top:1px solid ${al(D.ink, .18)};border-bottom:1px solid ${al(D.ink, .18)}}.l4-k-almanac .l4-nt .l4w{display:flex;align-items:center;gap:20px;min-height:78px;font-size:17px}.l4-k-almanac .l4-nt i{width:9px;height:9px;border-radius:50%;background:var(--pt);flex:none}.l4-k-almanac .l4-nt b{margin-right:10px}.l4-k-almanac .l4-nt .l4-ln{margin-left:auto;flex:none;font-size:16px}
@media (max-width:720px){.l4-k-almanac{padding:48px 0 0}.l4-k-almanac .l4-g{grid-template-columns:1fr;gap:44px}.l4-k-almanac .l4-is{font-size:13px;margin-bottom:22px}.l4-k-almanac h1{font-size:42px;line-height:1.24}.l4-k-almanac .l4-col{height:420px}.l4-k-almanac .l4-c1{top:24px;height:330px;width:58%}.l4-k-almanac .l4-c2{height:190px;width:38%}.l4-k-almanac .l4-c3{height:212px;width:38%}.l4-k-almanac .l4-vol{display:none}
.l4-k-almanac .l4-nt{margin-top:56px}.l4-k-almanac .l4-nt .l4w{flex-wrap:wrap;gap:4px 12px;padding:16px 20px;font-size:15px}.l4-k-almanac .l4-nt span{flex:1 1 calc(100% - 30px)}.l4-k-almanac .l4-nt .l4-ln{margin-left:21px}}`,
    shift: (D) => `.l4-k-shift{padding:120px 0 0;text-align:center}.l4-k-shift .l4-pill{display:inline-flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:var(--mu);padding:6px 18px 6px 6px;border:1px solid var(--ln);border-radius:999px}.l4-k-shift .l4-pill b{background:var(--a);color:var(--on);font-size:13px;padding:4px 11px;border-radius:999px}
.l4-k-shift h1{font-size:92px;line-height:1.07;letter-spacing:-.055em;margin-top:36px}.l4-k-shift h1 em{color:var(--at)}.l4-k-shift .l4-lead{margin:32px auto 0;max-width:640px}.l4-k-shift .l4-cta{justify-content:center}
.l4-k-shift .l4-stage{margin-top:72px;height:600px;border-radius:28px}.l4-k-shift .l4-paths{display:grid;grid-template-columns:repeat(3,1fr);margin-top:24px;border-bottom:1px solid var(--ln)}.l4-k-shift .l4-paths a{display:flex;align-items:center;gap:10px;justify-content:center;min-height:76px;font-size:16px;color:var(--mu)}.l4-k-shift .l4-paths a+a{border-left:1px solid var(--ln)}.l4-k-shift .l4-paths b{color:var(--ink)}.l4-k-shift .l4-paths svg{color:var(--at)}
.l4-k-shift+.l4{padding-top:130px}
@media (max-width:720px){.l4-k-shift{padding:60px 0 0;text-align:left}.l4-k-shift h1{font-size:42px;line-height:1.16;margin-top:24px}.l4-k-shift .l4-pill{font-size:13px}.l4-k-shift .l4-lead{margin:20px 0 0}.l4-k-shift .l4-stage{margin-top:40px;height:300px;border-radius:20px}
.l4-k-shift .l4-paths{grid-template-columns:1fr;margin-top:12px}.l4-k-shift .l4-paths a{justify-content:flex-start;min-height:58px;font-size:15px}.l4-k-shift .l4-paths a+a{border-left:0;border-top:1px solid var(--ln)}.l4-k-shift .l4-paths svg{margin-left:auto}.l4-k-shift+.l4{padding-top:80px}}`,
    senior: (D) => `.l4-k-senior{padding:96px 0 120px}.l4-k-senior .l4-g{display:grid;grid-template-columns:1.08fr .92fr;gap:72px;align-items:center}.l4-k-senior .l4-ey{font-size:20px;color:var(--at);display:inline-flex;align-items:center;gap:10px}.l4-k-senior .l4-ey:before{content:"";width:14px;height:14px;border-radius:50%;background:var(--pt);box-shadow:0 0 0 4px ${al(D.pt, .25)}}
.l4-k-senior h1{font-size:88px;line-height:1.14;letter-spacing:-.05em}.l4-k-senior h1 em{color:var(--at)}.l4-k-senior .l4-lead{color:var(--ink);opacity:.86;max-width:560px}
.l4-k-senior .l4-big2{display:grid;gap:14px;margin-top:44px;max-width:560px}.l4-k-senior .l4-bb{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:104px;padding:18px 30px 18px 32px;border-radius:var(--br);transition:transform .2s}.l4-k-senior .l4-bb:hover{transform:translateY(-2px)}
.l4-k-senior .l4-bb b{display:block;font-size:27px;letter-spacing:-.03em;line-height:1.3}.l4-k-senior .l4-bb small{display:block;font-size:18px;opacity:.9;margin-top:2px}.l4-k-senior .l4-bb.pri{background:var(--a);color:var(--on)}.l4-k-senior .l4-bb.sec{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2.5px var(--ink)}
.l4-k-senior .l4-sp{position:relative}.l4-k-senior .l4-sp figure{border-radius:var(--r);aspect-ratio:4/4.9}.l4-k-senior .l4-next{position:absolute;left:-48px;bottom:40px;right:48px;background:#fff;border-radius:22px;padding:26px 28px;box-shadow:0 30px 60px -28px ${al(D.ink, .45)};display:flex;flex-direction:column;gap:4px;border-left:10px solid var(--pt)}
.l4-k-senior .l4-next small{font-size:17px;color:var(--at);font-weight:700}.l4-k-senior .l4-next b{font-size:25px;letter-spacing:-.03em;line-height:1.3}.l4-k-senior .l4-next span{font-size:18px;color:var(--mu);display:flex;align-items:center;gap:8px;justify-content:space-between}
@media (max-width:720px){.l4-k-senior{padding:48px 0 80px}.l4-k-senior .l4-g{grid-template-columns:1fr;gap:44px}.l4-k-senior .l4-ey{font-size:17px}.l4-k-senior h1{font-size:44px;line-height:1.22}.l4-k-senior .l4-big2{margin-top:32px}.l4-k-senior .l4-bb{min-height:92px;padding:16px 22px}.l4-k-senior .l4-bb b{font-size:23px}.l4-k-senior .l4-bb small{font-size:16px}
.l4-k-senior .l4-sp figure{aspect-ratio:4/3.6}.l4-k-senior .l4-next{position:relative;left:auto;right:auto;bottom:auto;margin:-48px 14px 0;padding:20px 22px}.l4-k-senior .l4-next b{font-size:21px}}`,
    lecture: (D) => `.l4-k-lecture{padding:110px 0 130px;overflow:hidden}.l4-k-lecture .l4-g{display:grid;grid-template-columns:1fr 400px;gap:96px;align-items:stretch}
.l4-k-lecture .l4-rule{display:flex;align-items:center;gap:18px;font-size:13px;letter-spacing:.3em;color:var(--pt);font-weight:600}.l4-k-lecture .l4-rule:after{content:"";flex:0 0 96px;height:1px;background:var(--pt)}
.l4-k-lecture h1{font-size:96px;line-height:1.14;letter-spacing:-.05em;margin-top:40px}.l4-k-lecture h1 em{color:var(--pt)}.l4-k-lecture .l4-b.pri{background:var(--pt);color:#15120F}.l4-k-lecture .l4-b.line{color:var(--ink)}
.l4-k-lecture .l4-bill{margin-top:72px;border-top:1px solid ${al(D.pt, .6)}}.l4-k-lecture .l4-bill a{display:grid;grid-template-columns:84px 1fr auto;gap:20px;align-items:baseline;padding:20px 0;border-bottom:1px solid var(--ln)}
.l4-k-lecture .l4-bill i{font-style:italic;font-family:var(--hf);color:var(--pt);font-size:16px}.l4-k-lecture .l4-bill b{font-family:var(--hf);font-weight:600;font-size:22px;letter-spacing:-.03em}.l4-k-lecture .l4-bill small{font-size:15px;color:var(--mu);white-space:nowrap}
.l4-k-lecture .l4-tall{border-radius:200px 200px 2px 2px;min-height:640px;filter:sepia(.18) saturate(.9);box-shadow:0 0 0 1px ${al(D.pt, .5)},0 0 0 12px var(--bg),0 0 0 13px ${al(D.pt, .35)}}
@media (max-width:720px){.l4-k-lecture{padding:52px 0 80px}.l4-k-lecture .l4-g{grid-template-columns:1fr;gap:48px}.l4-k-lecture h1{font-size:42px;line-height:1.24;margin-top:26px}.l4-k-lecture .l4-bill{margin-top:44px}.l4-k-lecture .l4-bill a{grid-template-columns:58px 1fr;gap:4px 12px}.l4-k-lecture .l4-bill b{font-size:18px}.l4-k-lecture .l4-bill small{grid-column:2;font-size:14px}
.l4-k-lecture .l4-tall{min-height:0;aspect-ratio:4/3.4;border-radius:160px 160px 2px 2px;margin:0 6px}}`,
    line: (D) => `.l4-k-line{padding:72px 0 96px;overflow:hidden}.l4-k-line .l4-c{text-align:center;max-width:900px}.l4-k-line .l4-stamp{display:inline-block;font-size:16px;font-weight:700;color:var(--at);border:2px solid currentColor;border-radius:999px;padding:6px 18px;transform:rotate(-2deg);margin-bottom:30px}
.l4-k-line h1{font-size:88px;line-height:1.18;letter-spacing:-.03em;font-weight:400}.l4-k-line h1 em{color:var(--at);background:linear-gradient(transparent 70%,${al(D.pt, .3)} 70%,${al(D.pt, .3)} 92%,transparent 92%)}.l4-k-line .l4-lead{margin:28px auto 0}.l4-k-line .l4-cta{justify-content:center}.l4-k-line .l4-b.line{background:#fff}
.l4-k-line .l4-rope{position:relative;margin-top:40px;height:420px}.l4-k-line .l4-cord{position:absolute;left:0;top:0;width:100%;height:120px;color:${al(D.ink, .55)}}
.l4-k-line .l4-pins{position:relative;max-width:1320px;margin:0 auto;height:100%}.l4-k-line .l4-pol{position:absolute;width:250px;background:#fff;padding:12px 12px 0;box-shadow:0 22px 40px -20px ${al(D.ink, .5)};border-radius:3px;transform-origin:50% 0}
.l4-k-line .l4-pol:before{content:"";position:absolute;top:-14px;left:50%;width:14px;height:30px;margin-left:-7px;background:${mix(D.pt, '#ffffff', .2)};border-radius:3px;box-shadow:0 2px 0 ${al(D.ink, .2)}}
.l4-k-line .l4-pol img{aspect-ratio:1/1.08;border-radius:2px;height:auto}.l4-k-line .l4-pol figcaption{font-family:var(--hf);font-size:22px;text-align:center;padding:12px 4px 16px;color:var(--ink)}
.l4-k-line .p0{left:3%;top:42px;transform:rotate(-5deg)}.l4-k-line .p1{left:27%;top:82px;transform:rotate(3deg)}.l4-k-line .p2{left:52%;top:84px;transform:rotate(-2deg)}.l4-k-line .p3{left:76%;top:44px;transform:rotate(5deg)}
@media (max-width:720px){.l4-k-line{padding:52px 0 64px}.l4-k-line h1{font-size:44px;line-height:1.26}.l4-k-line .l4-stamp{font-size:14px;margin-bottom:20px}.l4-k-line .l4-c{text-align:left}.l4-k-line .l4-stamp{transform:rotate(-2deg)}.l4-k-line .l4-lead{margin:20px 0 0}
.l4-k-line .l4-rope{height:330px;margin-top:44px}.l4-k-line .l4-pol{width:44%;padding:8px 8px 0}.l4-k-line .l4-pol figcaption{font-size:17px;padding:8px 2px 10px}.l4-k-line .p0{left:3%;top:34px}.l4-k-line .p1{left:53%;top:44px}.l4-k-line .p2,.l4-k-line .p3{display:none}}`,
    formal: (D) => `.l4-k-formal{padding:84px 0 110px}.l4-k-formal .l4-cert{position:relative;text-align:center;padding:84px 96px 72px;background:#fff;border:1px solid ${al(D.pt, .75)};outline:1px solid ${al(D.pt, .75)};outline-offset:-14px;box-shadow:0 40px 80px -60px ${al(D.ink, .5)}}
.l4-k-formal .l4-cert:before,.l4-k-formal .l4-cert:after{content:"";position:absolute;width:44px;height:44px;border:2px solid var(--pt);top:26px;left:26px;border-right:0;border-bottom:0}.l4-k-formal .l4-cert:after{left:auto;right:26px;border-right:2px solid var(--pt);border-left:0}
.l4-k-formal .l4-seal{display:inline-grid;place-items:center;width:84px;height:84px;border-radius:50%;border:1.5px solid var(--pt);box-shadow:inset 0 0 0 6px #fff,inset 0 0 0 7px ${al(D.pt, .6)};margin-bottom:28px}.l4-k-formal .l4-seal i{font-style:normal;font-family:${SERIF};font-size:34px;font-weight:700;color:var(--a)}
.l4-k-formal .l4-est{font-size:14px;letter-spacing:.3em;color:var(--ptt);font-weight:700}.l4-k-formal h1{font-size:68px;line-height:1.3;letter-spacing:-.045em;margin-top:24px;font-weight:400}.l4-k-formal h1 b{font-weight:700;color:var(--a)}
.l4-k-formal .l4-orn{display:block;width:160px;height:14px;margin:30px auto 0;background:radial-gradient(circle,var(--pt) 3px,transparent 3.5px) center/14px 14px no-repeat,linear-gradient(var(--pt),var(--pt)) left center/66px 1px no-repeat,linear-gradient(var(--pt),var(--pt)) right center/66px 1px no-repeat}
.l4-k-formal .l4-lead{margin:26px auto 0;max-width:620px}.l4-k-formal .l4-cta{justify-content:center}.l4-k-formal .l4-b{height:60px;padding:0 34px}.l4-k-formal .l4-b.line{color:var(--a)}
.l4-k-formal .l4-deg{display:grid;grid-template-columns:repeat(3,1fr);margin-top:64px;border-top:1px solid var(--ln);text-align:left}.l4-k-formal .l4-deg.n2{grid-template-columns:1fr 1fr}.l4-k-formal .l4-deg div{padding:28px 30px 0}.l4-k-formal .l4-deg div+div{border-left:1px solid var(--ln)}
.l4-k-formal .l4-deg dt{font-family:${SERIF};font-size:24px;font-weight:700;color:var(--a);letter-spacing:-.03em}.l4-k-formal .l4-deg dd{font-size:16px;color:var(--mu);margin-top:6px}
@media (max-width:720px){.l4-k-formal{padding:32px 0 72px}.l4-k-formal .l4w{padding:0 12px}.l4-k-formal .l4-cert{padding:60px 24px 40px;outline-offset:-8px}.l4-k-formal .l4-cert:before,.l4-k-formal .l4-cert:after{top:16px;left:16px;width:26px;height:26px}.l4-k-formal .l4-cert:after{left:auto;right:16px}
.l4-k-formal .l4-seal{width:68px;height:68px;margin-bottom:20px}.l4-k-formal .l4-seal i{font-size:28px}.l4-k-formal .l4-est{font-size:13px;letter-spacing:.18em}.l4-k-formal h1{font-size:38px;line-height:1.36}.l4-k-formal .l4-lead{text-align:left}.l4-k-formal .l4-b{height:56px}
.l4-k-formal .l4-deg,.l4-k-formal .l4-deg.n2{grid-template-columns:1fr;margin-top:40px}.l4-k-formal .l4-deg div{padding:18px 4px}.l4-k-formal .l4-deg div+div{border-left:0;border-top:1px solid var(--ln)}.l4-k-formal .l4-deg dt{font-size:21px}}`,
    mosaic: (D) => `.l4-k-mosaic{padding:72px 0 120px}.l4-k-mosaic .l4-top{display:grid;grid-template-columns:1.75fr 1fr;gap:20px 72px;align-items:end}.l4-k-mosaic .l4-tag{grid-column:1/-1;justify-self:start;font-size:15px;font-weight:800;background:var(--pt);color:#1A1216;padding:7px 14px;border-radius:999px}
.l4-k-mosaic h1{font-size:90px;line-height:1.05;letter-spacing:-.06em}.l4-k-mosaic h1 em{color:var(--at)}.l4-k-mosaic .l4-side .l4-lead{margin-top:0}.l4-k-mosaic .l4-cta{margin-top:30px}
.l4-k-mosaic .l4-mos{display:grid;grid-template-columns:1.5fr 1fr 1fr;grid-template-rows:280px 280px;gap:16px;margin-top:60px}.l4-k-mosaic .l4-mos a{position:relative;display:block;border-radius:var(--r);overflow:hidden}.l4-k-mosaic .l4-mos figure{position:absolute;inset:0;transition:transform .5s}.l4-k-mosaic .l4-mos a:hover figure{transform:scale(1.04)}
.l4-k-mosaic .l4-m0{grid-row:span 2}.l4-k-mosaic .l4-m3{grid-column:2/4}.l4-k-mosaic .l4-mos span{position:absolute;left:18px;bottom:18px;background:#fff;color:#1A1216;font-weight:800;font-size:17px;padding:9px 16px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.18)}.l4-k-mosaic .l4-m1 span{background:var(--a);color:var(--on)}
@media (max-width:720px){.l4-k-mosaic{padding:48px 0 72px}.l4-k-mosaic .l4-top{grid-template-columns:1fr;gap:18px}.l4-k-mosaic .l4-tag{font-size:13px}.l4-k-mosaic h1{font-size:44px;line-height:1.14}.l4-k-mosaic .l4-cta{margin-top:24px}
.l4-k-mosaic .l4-mos{grid-template-columns:1fr 1fr;grid-template-rows:220px 150px 150px;gap:10px;margin-top:40px}.l4-k-mosaic .l4-m0{grid-row:auto;grid-column:1/-1}.l4-k-mosaic .l4-m3{grid-column:1/-1}.l4-k-mosaic .l4-mos span{left:10px;bottom:10px;font-size:14px;padding:7px 12px}}`,
    cover: (D) => `.l4-k-cover{padding:0 0 120px}.l4-k-cover .l4-shot{height:600px}.l4-k-cover .l4-shot figure{height:100%}
.l4-k-cover .l4-book{position:relative;display:grid;grid-template-columns:auto 1fr;gap:0;margin-top:-300px;max-width:760px;background:var(--alt);border-radius:6px var(--r) var(--r) 6px;box-shadow:0 40px 80px -40px ${al(D.ink, .45)},0 0 0 1px var(--ln);z-index:2}
.l4-k-cover .l4-spine{width:28px;border-radius:6px 0 0 6px;background:linear-gradient(90deg,${mix(D.acc, '#000000', .25)},var(--a) 40%,${mix(D.acc, '#ffffff', .1)})}.l4-k-cover .l4-book>div{padding:60px 64px 56px}
.l4-k-cover h1{font-size:72px;line-height:1.14;letter-spacing:-.05em}.l4-k-cover h1 em{color:var(--at)}.l4-k-cover .l4-note{grid-column:2;margin:0;padding:18px 64px;border-top:1px solid var(--ln);font-size:15px}.l4-k-cover .l4-note svg{color:var(--ptt)}
.l4-k-cover+.l4{padding-top:120px}
@media (max-width:720px){.l4-k-cover{padding-bottom:72px}.l4-k-cover .l4-shot{height:300px}.l4-k-cover .l4w{padding:0 14px}.l4-k-cover .l4-book{margin-top:-70px;grid-template-columns:auto 1fr}.l4-k-cover .l4-spine{width:14px}.l4-k-cover .l4-book>div{padding:34px 22px 34px}.l4-k-cover h1{font-size:40px;line-height:1.2}.l4-k-cover .l4-note{padding:14px 22px}.l4-k-cover+.l4{padding-top:72px}}`,
    horizon: (D) => `.l4-k-horizon{height:840px;padding:0;color:#fff;overflow:hidden;background:#1C2633}.l4-k-horizon .l4-bg{position:absolute;inset:0;height:100%}
.l4-k-horizon:after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 45% at 50% 66%,rgba(16,22,32,.42),rgba(16,22,32,0) 70%),linear-gradient(180deg,rgba(20,28,40,.4) 0%,rgba(20,28,40,.12) 28%,rgba(20,28,40,.45) 55%,rgba(16,22,32,.92) 100%)}
.l4-k-horizon .l4-in{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;justify-content:flex-end}.l4-k-horizon .l4in{}.l4-k-horizon .l4w{width:100%}.l4-k-horizon .l4-in>.l4w{text-align:center;padding-bottom:56px}
.l4-k-horizon .l4-ey{color:#FFD9BD;letter-spacing:.2em;font-size:14px}.l4-k-horizon h1{font-size:88px;line-height:1.2;letter-spacing:-.04em;text-shadow:0 2px 30px rgba(0,0,0,.25)}.l4-k-horizon h1 em{color:#FFD2B0}.l4-k-horizon .l4-lead{color:rgba(255,255,255,.88);margin:26px auto 0;max-width:600px}.l4-k-horizon .l4-cta{justify-content:center}.l4-k-horizon .l4-b.pri{background:var(--pt);color:#1B1F26}
.l4-k-horizon .l4-hz{border-top:1px solid rgba(255,255,255,.3)}.l4-k-horizon .l4-hz ul{display:grid;grid-template-columns:repeat(4,1fr)}.l4-k-horizon .l4-hz li{padding:24px 0;text-align:center;font-family:var(--hf);font-size:20px;letter-spacing:.02em;color:rgba(255,255,255,.9)}.l4-k-horizon .l4-hz li+li{border-left:1px solid rgba(255,255,255,.22)}
@media (max-width:720px){.l4-k-horizon{height:calc(100svh - 64px);min-height:680px;max-height:820px}.l4-k-horizon .l4-in>.l4w{text-align:left;padding-bottom:36px}.l4-k-horizon .l4-bg img{object-position:18% 50%!important}.l4-k-horizon h1{font-size:42px;line-height:1.28}.l4-k-horizon .l4-lead{margin:18px 0 0}.l4-k-horizon .l4-ey{font-size:13px;letter-spacing:.12em}.l4-k-horizon .l4-hz ul{grid-template-columns:repeat(4,1fr)}.l4-k-horizon .l4-hz li{padding:14px 0;font-size:15px}}`,
    circle: (D) => `.l4-k-circle{padding:96px 0 120px;overflow:hidden}.l4-k-circle .l4-g{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}.l4-k-circle .l4-ey{color:var(--at)}
.l4-k-circle h1{font-size:84px;line-height:1.14;letter-spacing:-.055em}.l4-k-circle h1 em{color:var(--at)}
.l4-k-circle .l4-orb{position:relative;height:640px}.l4-k-circle .l4-o1{position:absolute;right:-120px;top:0;width:640px;height:640px;border-radius:50%}.l4-k-circle .l4-o2{position:absolute;left:-10px;bottom:-10px;width:240px;height:240px;border-radius:50%;border:10px solid var(--bg)}
.l4-k-circle .l4-dot{position:absolute;left:60px;top:70px;width:72px;height:72px;border-radius:50%;background:var(--pt)}
@media (max-width:720px){.l4-k-circle{padding:32px 0 72px}.l4-k-circle .l4-g{grid-template-columns:1fr;gap:28px}.l4-k-circle h1{font-size:44px;line-height:1.2}.l4-k-circle .l4-orb{height:236px;order:-1}.l4-k-circle .l4-o1{right:-60px;width:236px;height:236px}.l4-k-circle .l4-o2{width:120px;height:120px;left:0;bottom:0;border-width:6px}.l4-k-circle .l4-dot{left:30px;top:30px;width:44px;height:44px}}`
  };

  /* ── 렌더러 연결 ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    try { if (x && s) { const d = x.data || {};
      if (x.type === 'text' && SEC[d.hpt]) { if (x.hide && !editing()) return ''; return SEC[d.hpt](x, s) || ''; }
      if (x.type === 'banner' && mine(s) && HPT.has(s.theme) && !+d.dstyle && !s.layout) { if (x.hide && !editing()) return ''; return mark(heroSec(s, d), x); } }
    } catch (e) { console.error('hp44-life', e); }
    return base(x, i, s, lk); }; window.proSec = proSec; }
  try { if (window.HPW && typeof HPW.emptyOf === 'function') { const e0 = HPW.emptyOf; HPW.emptyOf = x => { const d = (x && x.data) || {}; if (x && x.type === 'text' && SEC[d.hpt]) { try { return /^l4-(cards|rows)$/.test(d.hpt) ? !live().length : d.hpt === 'l4-num' ? live().length < NUM_MIN : d.hpt === 'l4-fields' ? fields().length < 2 : d.hpt === 'l4-callbar' ? !telOf() : false; } catch (e) { return false; } } return e0(x); }; } } catch (e) { }
  try { if (window.HPW && typeof HPW.emptyOf === 'function') { const e1 = HPW.emptyOf; HPW.emptyOf = x => { const d = (x && x.data) || {}; if (x && x.type === 'text' && /^hx-/.test(String(d.hpt || '')) && d.on44 === 1) return false; return e1(x); }; } } catch (e) { }
  const needCSS = s => !!(s && (mine(s) || (s.sections || []).some(x => x && x.data && SEC[x.data.hpt])));
  { const base = siteHTML; siteHTML = (s, ...a) => { let h = base(s, ...a); try { if (needCSS(s) && HPT.tokens(s)) { h = h.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>');
      h = h.replace(/<section class="([^"]*\bl4\b[^"]*)"/g, (m, c) => `<section class="${c.replace(/\bhps-(flowb?|short)\b\s*/g, '').trim()}"`); /* 같은 바탕 섹션 간격 압축은 시안 리듬을 깨므로 뺀다 */
      const f = FONT[DEF[thOf(s)].hf]; if (f && h.indexOf(f) < 0) h = h.replace('</head>', `<link rel="stylesheet" href="${f}"></head>`); } } catch (e) { console.error('hp44-life css', e); } return h; }; window.siteHTML = siteHTML; }

  /* ── 등록 ── */
  MINE.forEach(id => { const D = DEF[id]; HPT.reg(id, { prem: 1, g44: 1, cssX: () => '', name: D.name, desc: D.desc, tags: ['lifelong'], tone: D.dark ? 'dark' : 'light', dens: '여유', acc: D.acc, bg: D.bg, alt: D.alt, ink: D.ink, mu: D.mu, r: D.r, br: Math.min(D.br, 999), hero: 'split', vis: 'photo', illu: 'book', card: 'flat', look: 'mintSoft', sw2: D.alt, base: D.dark ? 'premium' : D.big ? 'senior' : D.hf === SANS ? 'clean' : 'warm', hk: 'cover', ck: 'panel', sh: 'none' });
    try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, tok(D.hf === SANS ? 'sans' : 'serif', D.hw, 88, 42)); } catch (e) { console.error('hp44-life HPD', e); } });
  { const pf = HPT.premFits; if (typeof pf === 'function') HPT.premFits = (id, t) => MINE.includes(id) ? (t || (() => { try { return S.org.type; } catch (e) { return ''; } })()) === 'lifelong' : pf(id, t); }
  { const tb = HPT.thumb; if (typeof tb === 'function') HPT.thumb = (s, id) => { if (!MINE.includes(id)) return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.id === 't44-' + id); if (tp) b.sections = tp.build(); b.photos = Object.assign({}, DEF[id].ph); b.img = {}; return siteHTML(b, false, 'ko'); } catch (e) { console.error('hp44-life thumb', e); return tb(s, id); } }; }
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') { window.HP44L = { DEF, css, SEC }; return; }
  const TX = (variant, data) => S2('text', { variant, ...data });
  const quiet = () => [TX('stats', { hpt: 'facts', title: '', cols: [] }), TX('timeline', { hpt: 'sched', eyebrow: '', title: '모집 일정', cols: [] })].map(x => Object.assign(x, { hide: true }));
  const ban = d => S2('banner', d);
  /* 편집기 자동 숨김(내용 없는 섹션)에 걸리지 않게 칸 하나를 둔다 — 그릴 때는 실제 데이터로만 채운다 */
  const AUTO = [['자동', '공개 강좌 · 후기 데이터로 채워요']];
  const B = {
    lfhall: { scene: '평생학습관 — 시 · 구 주민이 이번 학기 강좌를 잡지처럼 훑어보고 신청, 공지 한 줄로 신청 일정 확인', purpose: ['apply', 'learn'],
      build: () => [ban({ eyebrow: '이번 학기 · 수강생 모집', title: '배움에는\n늦은 계절이\n없어요', sub: `${org()}에서 이웃과 함께 배우는 강좌가 기다려요. 처음 배우는 분도 편하게 시작할 수 있어요.`, cta: '강좌 둘러보기', link: 'learn:courses', cta2: '수강 문의', link2: 'learn:comm' }),
        TX('features', { hpt: 'l4-cards', eyebrow: '이번 학기 추천', title: '지금 시작하기\n좋은 강좌', sub: '처음 배우는 분도 부담 없도록 입문 강좌를 먼저 보여 드려요.', cols: AUTO }),
        TX('features', { hpt: 'l4-num', title: '', cols: AUTO }),
        TX('features', { hpt: 'l4-story', dl: 1, slot: 'cta', eyebrow: '가까운 배움', title: '집 가까이에서,\n부담 없이 배워요', sub: '궁금한 점이 있으면 언제든 편하게 물어보세요.', cols: [['수강료', '강좌마다 수강료와 재료비를 따로 안내해요.'], ['수업 장소', '강좌 상세에서 수업 장소와 시간을 확인해요.'], ['감면', '감면 대상과 방법은 상담으로 안내해요.']] }),
        TX('features', { hpt: 'l4-quote', title: '배우고 싶은 마음이 생긴 날이, 시작하기 가장 좋은 날이에요.', sub: '', cols: AUTO }),
        TX('features', { hpt: 'l4-cta', eyebrow: '수강 신청', title: '이번 학기엔\n무엇을 배워 볼까요?', sub: '배우고 싶은 것을 알려 주시면 맞는 강좌를 안내해 드려요.', cta: '강좌 찾아보기', cols: [] }), ...quiet()] },
    lfuniv: { scene: '대학 평생교육원 — 성인 학습자가 자격 · 교양 · 직무 과정을 고르고, 수강생은 내 강의실과 수료증으로 바로 이동', purpose: ['apply', 'learn'],
      build: () => [ban({ eyebrow: `${org()} · 이번 학기 과정`, title: '다시 배우는 시간,\n대학에서 시작해요', sub: '대학 강의실에서 자격 · 교양 · 직무 과정을 들어요. 일하면서도 들을 수 있는 저녁 · 주말 과정이 있어요.', cta: '과정 둘러보기', link: 'learn:courses', cta2: '내 강의실', link2: 'learn:my' }),
        TX('features', { hpt: 'l4-cards', eyebrow: '모집 중인 과정', title: '나에게 맞는\n다음 걸음', sub: '전공이나 경력이 없어도 괜찮아요. 과정마다 기간 · 시간 · 수강료를 먼저 보여 드려요.', cols: AUTO }),
        TX('features', { hpt: 'l4-band', slot: 'space', title: '퇴근 뒤 캠퍼스,\n두 번째 강의실이 열려요.', sub: '저녁 · 주말 과정은 일을 하면서도 들을 수 있게 짜여 있어요.', cols: AUTO }),
        TX('features', { hpt: 'l4-story', eyebrow: '수업 방식', title: '강의만 듣고\n끝나지 않아요', cols: [['직접 해 보며 배워요', '수업마다 실습과 과제가 있어 배운 것을 바로 써 봐요.'], ['기록이 남아요', '출석과 진도가 자동으로 기록되고, 수료하면 수료증을 받아요.'], ['끝난 뒤에도 물어보세요', '다음에 들을 과정을 상담으로 함께 골라요.']] }),
        TX('features', { hpt: 'l4-quote', title: '새로운 일은, 배우기로 마음먹은 날 시작돼요.', sub: '', cols: AUTO }),
        TX('features', { hpt: 'l4-cta', title: '어떤 과정이 맞을지\n함께 찾아요', sub: '배우고 싶은 것을 알려 주시면 맞는 과정을 안내해 드려요.', cta: '과정 둘러보기', cols: [] }), ...quiet()] },
    lfsenior: { scene: '시니어 디지털 — 어르신이 큰 글씨로 강좌를 고르고, 버튼 하나로 전화 상담 · 내 강의실로 이동', purpose: ['apply', 'learn'],
      build: () => [ban({ eyebrow: '어르신 디지털 배움터', title: '스마트폰,\n천천히 같이\n배워요', sub: '사진 보내기부터 병원 예약 · 키오스크 주문까지, 한 번에 하나씩 알려 드려요.', cta: '배울 강좌 보기', link: 'learn:courses', note: '어떤 강좌가 있는지 먼저 살펴봐요', cta2: '상담 남기기', link2: 'tel' }),
        TX('features', { hpt: 'l4-tiles', eyebrow: '무엇을 도와드릴까요?', title: '눌러서\n바로 가세요', cols: AUTO }),
        TX('features', { hpt: 'l4-rows', n: 4, eyebrow: '이번 달 강좌', title: '날짜를 보고\n골라 보세요', cols: AUTO }),
        TX('features', { hpt: 'l4-flow', eyebrow: '신청 방법', title: '세 번이면\n신청이 끝나요', cols: [['강좌 고르기', '위 목록에서 듣고 싶은 강좌를 눌러요.'], ['신청 누르기', '이름과 연락처만 확인하면 돼요.'], ['수업 날 오기', '휴대폰만 가지고 오시면 돼요.']] }),
        TX('features', { hpt: 'l4-help', title: '알림', sub: '모르는 건 언제든 전화 주세요', cols: [] }),
        TX('features', { hpt: 'l4-cta', title: '오늘 하나만\n배워 볼까요?', sub: '어려우면 전화 주세요. 천천히 안내해 드려요.', cta: '배울 강좌 보기', cols: [] }), ...quiet()] },
    lfhuman: { scene: '인문 · 교양 아카데미 — 이번 시즌 강의 목록을 공연 안내처럼 보고 신청, 강의 일정과 한 문장으로 품격 전달', purpose: ['apply', 'brand'],
      build: () => [ban({ eyebrow: 'HUMANITIES ACADEMY', title: '오래된 질문을\n함께 읽어요', sub: '고전 · 역사 · 철학을 매주 한 편씩 함께 읽고 이야기해요. 처음이어도 괜찮아요.', cta: '이번 시즌 강의', link: 'learn:courses', cta2: '내 강의실', link2: 'learn:my' }),
        TX('features', { hpt: 'l4-rows', num: 'lecture', eyebrow: 'PROGRAM', title: '이번 시즌\n강의 일정', cols: AUTO }),
        TX('features', { hpt: 'l4-band', slot: 'about', title: '한 권을 깊이 읽으면,\n세상이 조금 달리 보여요.', sub: '강의 뒤에는 함께 읽은 내용을 나누는 시간이 있어요.', cols: AUTO }),
        TX('features', { hpt: 'l4-cards', eyebrow: 'COURSES', title: '함께 읽을\n강좌', cols: AUTO }),
        TX('features', { hpt: 'l4-quote', title: '좋은 질문 하나가, 좋은 답 열 개보다 오래 남아요.', sub: '', cols: AUTO }),
        TX('features', { hpt: 'l4-cta', eyebrow: 'JOIN', title: '이번 시즌,\n함께 읽어요', sub: '강의마다 정원이 있어요. 원하는 강의를 먼저 확인해 보세요.', cta: '강의 신청하기', cols: [] }), ...quiet()] },
    lfvillage: { scene: '동네 배움터 · 마을 학교 — 이웃이 이웃을 가르치는 뜨개 · 빵 · 텃밭 강좌를 친근하게 소개하고 신청', purpose: ['apply', 'brand'],
      build: () => [ban({ eyebrow: '우리 동네 배움터', title: '이웃에게 배우고,\n이웃과 나눠요', sub: '뜨개 · 빵 · 텃밭 · 그림까지, 동네 이웃이 직접 가르치는 작은 강좌예요.', cta: '강좌 구경하기', link: 'learn:courses', cta2: '문의하기', link2: 'learn:comm', cols: [['뜨개'], ['빵 굽기'], ['텃밭'], ['도예']] }),
        TX('features', { hpt: 'l4-cats', eyebrow: '이런 걸 배워요', title: '손으로,\n함께 만들어요', cols: [['손으로', '뜨개 · 도예 · 공예', '01'], ['맛있게', '빵 · 반찬 · 발효', '02'], ['초록으로', '텃밭 · 화분 · 산책', '03'], ['함께', '책 모임 · 노래 · 이야기', '04']] }),
        TX('features', { hpt: 'l4-cards', eyebrow: '이번 달 강좌', title: '이번 달엔\n이런 강좌가 열려요', cols: AUTO }),
        TX('features', { hpt: 'l4-story', dl: 1, eyebrow: '처음 오셨나요?', title: '준비물은\n마음 하나면 돼요', cols: [['장소', '강좌마다 모이는 곳을 안내해요.'], ['재료', '재료비가 있으면 강좌 안내에 적어 둬요.'], ['선생님', '동네 이웃이 직접 가르쳐요. 가르치고 싶은 분도 환영해요.']] }),
        TX('features', { hpt: 'l4-quote', title: '같이 만들면, 같이 웃게 돼요.', sub: '', cols: AUTO }),
        TX('features', { hpt: 'l4-cta', title: '이번 주에\n한번 놀러 오세요', sub: '처음이어도 괜찮아요. 이웃들이 반갑게 맞이해요.', cta: '강좌 구경하기', cols: [] }), ...quiet()] },
    lfcredit: { scene: '학점은행제(격식) — 학위 · 자격을 준비하는 성인이 학습과정과 학위 취득 절차를 확인하고 수강 신청', purpose: ['apply', 'info'],
      build: () => [ban({ eyebrow: '학점은행제 학습과정', title: '일하면서도,\n학위를 완성해요', sub: `${org()}에서 학점을 쌓아 전문학사 · 학사 학위를 준비해요. 인정 학점과 과목은 상담으로 확인해 드려요.`, cta: '개설 과목 보기', link: 'learn:courses', cta2: '학습 상담', link2: 'learn:comm', cols: [['전문학사', '2년제 · 3년제 학위 과정'], ['학사', '4년제 학위 과정'], ['자격 취득', '학점 연계 자격 과정']] }),
        TX('features', { hpt: 'l4-flow', num: 'roman', eyebrow: '학위 취득 절차', title: '네 단계로\n학위를 준비해요', sub: '정확한 학점 기준과 제출 서류는 학습 상담에서 안내해 드려요.', cols: [['학습 설계', '전공과 목표 학위에 맞춰 이수 계획을 세워요.'], ['과목 이수', '학기마다 개설 과목을 듣고 학점을 쌓아요.'], ['학습자 등록', '정해진 기간에 학습자 등록을 해요.'], ['학위 신청', '기준 학점을 채우면 학위를 신청해요.']] }),
        TX('features', { hpt: 'l4-rows', eyebrow: '이번 학기', title: '개설 과목', cols: AUTO }),
        TX('features', { hpt: 'l4-num', unit: '과목', title: '', cols: AUTO }),
        TX('features', { hpt: 'l4-help', title: '학사 공지', sub: '학점 인정 · 학위 신청 상담', cols: [] }),
        TX('features', { hpt: 'l4-cta', eyebrow: '수강 신청', title: '이번 학기,\n학점을 쌓아 보세요', sub: '수강 신청 기간과 과목은 공지로 먼저 알려 드려요.', cta: '개설 과목 보기', cols: [] }), ...quiet()] },
    lfculture: { scene: '문화센터 — 그림 · 음악 · 요가 · 베이킹 강좌를 사진 모자이크로 보고 요일별 시간표로 골라 신청', purpose: ['apply', 'learn'],
      build: () => [ban({ eyebrow: '이번 시즌 회원 모집', title: '퇴근 후, 주말에\n나를 위한 한 시간', sub: '그림 · 음악 · 요가 · 베이킹까지 요일과 시간을 골라 들어요.', cta: '시간표 보기', link: 'learn:courses', cta2: '내 수강', link2: 'learn:my', cols: [['그림'], ['음악'], ['요가'], ['베이킹']] }),
        TX('features', { hpt: 'l4-rows', eyebrow: '시간표', title: '요일을 보고\n골라요', cols: AUTO }),
        TX('features', { hpt: 'l4-cards', eyebrow: '인기 강좌', title: '이번 시즌\n많이 찾는 강좌', cols: AUTO }),
        TX('features', { hpt: 'l4-band', slot: 'space', title: '일주일에 한 번,\n나에게 주는 시간.', sub: '강좌마다 정원이 있어요. 원하는 요일이 있다면 먼저 신청하세요.', cols: AUTO }),
        TX('features', { hpt: 'l4-quote', title: '잘하려고 오는 곳이 아니라, 즐기려고 오는 곳이에요.', sub: '', cols: AUTO }),
        TX('features', { hpt: 'l4-cta', title: '이번 시즌,\n무엇을 시작할까요?', sub: '수강 신청은 강좌 페이지에서 바로 할 수 있어요.', cta: '시간표 보기', cols: [] }), ...quiet()] },
    lflibrary: { scene: '도서관 평생교육 — 도서관 이용자가 독서 모임 · 글쓰기 · 작가 강연 등 도서관 강좌를 찾아 신청', purpose: ['apply', 'info'],
      build: () => [ban({ eyebrow: '도서관 평생학습', title: '책 한 권으로\n시작하는 배움', sub: '독서 모임 · 글쓰기 · 작가와의 만남까지, 도서관에서 열리는 강좌를 모았어요.', cta: '강좌 둘러보기', link: 'learn:courses', cta2: '내 강의실', link2: 'learn:my', note: '도서관 회원이면 누구나 신청할 수 있어요.' }),
        TX('features', { hpt: 'l4-cards', eyebrow: '이번 달 강좌', title: '도서관에서\n열리는 강좌', cols: AUTO }),
        TX('features', { hpt: 'l4-story', dl: 1, flip: 1, eyebrow: '이용 안내', title: '신청부터 수업까지\n도서관에서', cols: [['신청', '강좌 페이지에서 바로 신청해요.'], ['장소', '강좌 상세에 강의실을 적어 둬요.'], ['자료', '수업 자료와 함께 읽을 책을 안내해요.'], ['수료', '출석 기준을 채우면 수료증을 받아요.']] }),
        TX('features', { hpt: 'l4-band', slot: 'space', title: '조용한 서가 사이에서,\n한 권을 끝까지 읽는 시간.', sub: '강좌가 끝나도 함께 읽은 책은 도서관에서 계속 빌릴 수 있어요.', cols: AUTO }),
        TX('features', { hpt: 'l4-help', title: '도서관 알림', sub: '강좌 문의', cols: [] }),
        TX('features', { hpt: 'l4-cta', title: '이번 달엔\n어떤 책을 함께 읽을까요?', sub: '관심 있는 주제를 고르면 맞는 강좌를 보여 드려요.', cta: '강좌 둘러보기', cols: [] }), ...quiet()] },
    lfretire: { scene: '은퇴 설계 · 인생 2막 — 은퇴를 앞둔 분이 일 · 돈 · 건강 · 관계 설계 과정을 보고 상담 · 신청', purpose: ['apply', 'brand'],
      build: () => [ban({ eyebrow: '인생 2막 설계 과정', title: '두 번째 출발,\n천천히 준비해요', sub: '일 · 돈 · 건강 · 관계를 하나씩 다시 설계해요. 같은 시기를 지나는 동료와 함께 배워요.', cta: '과정 둘러보기', link: 'learn:courses', cta2: '상담 받기', link2: 'learn:comm', cols: [['일'], ['돈'], ['건강'], ['관계']] }),
        TX('features', { hpt: 'l4-flow', inv: 1, eyebrow: '네 가지 설계', title: '다음 20년을\n네 갈래로 그려요', cols: [['새로운 일', '경험을 살린 새 일 · 봉사 · 창업을 살펴봐요.', '일'], ['돈과 생활', '연금 · 지출 · 자산을 다시 정리해요.', '돈'], ['몸과 마음', '건강을 돌보는 습관을 만들어요.', '몸'], ['사람과 관계', '가족 · 친구 · 이웃과의 시간을 새로 짜요.', '정']] }),
        TX('features', { hpt: 'l4-cards', eyebrow: '모집 중인 과정', title: '지금 신청할 수 있는\n과정', cols: AUTO }),
        TX('features', { hpt: 'l4-band', slot: 'space', title: '은퇴는 끝이 아니라,\n방향을 바꾸는 일이에요.', sub: '같은 시기를 지나는 동료들과 경험을 나눠요.', cols: AUTO }),
        TX('features', { hpt: 'l4-quote', title: '서두르지 않아도 돼요. 다시 설계할 시간은 충분해요.', sub: '', cols: AUTO }),
        TX('features', { hpt: 'l4-cta', title: '나의 다음 20년,\n함께 그려 봐요', sub: '지금 상황을 알려 주시면 맞는 과정을 안내해 드려요.', cta: '과정 둘러보기', cols: [] }), ...quiet()] },
    lffamily: { scene: '가족 · 부모 교육 — 부모가 자녀 나이별로 맞는 부모 교육 · 가족 프로그램을 찾아 신청', purpose: ['apply', 'learn'],
      build: () => [ban({ eyebrow: '부모 · 가족 교육', title: '아이와 함께,\n부모도 자라요', sub: '아이 나이에 맞는 대화법과 놀이, 가족이 함께하는 프로그램을 모았어요.', cta: '강좌 둘러보기', link: 'learn:courses', cta2: '상담 문의', link2: 'learn:comm', note: '주말 · 저녁 강좌도 있어요.' }),
        TX('features', { hpt: 'l4-cats', eyebrow: '아이 나이별로', title: '우리 아이 나이에\n맞는 강좌', cols: [['영유아', '0~6세 · 애착과 놀이', '0+'], ['초등', '7~12세 · 습관과 대화', '7+'], ['십대', '13~18세 · 진로와 관계', '13+'], ['부부 · 가족', '함께 보내는 시간', '♥']] }),
        TX('features', { hpt: 'l4-cards', eyebrow: '모집 중', title: '이번 달\n부모 교육', cols: AUTO }),
        TX('features', { hpt: 'l4-story', eyebrow: '이렇게 배워요', title: '듣고, 해 보고,\n함께 나눠요', cols: [['짧은 강의', '전문가에게 핵심만 들어요.'], ['집에서 해 보기', '이번 주 해 볼 일 하나를 정해요.'], ['함께 나누기', '다른 부모님과 경험을 나눠요.']] }),
        TX('features', { hpt: 'l4-quote', title: '완벽한 부모보다, 함께 배우는 부모가 되고 싶어요.', sub: '', cols: AUTO }),
        TX('features', { hpt: 'l4-cta', title: '이번 주말,\n아이와 함께 와요', sub: '가족 프로그램은 아이와 함께 신청할 수 있어요.', cta: '강좌 둘러보기', cols: [] }), ...quiet()] }
  };
  /* v44.1(cat44 TYPE · GAP A3 · B 평생): 템플릿 성격에 맞춰 공통 신뢰 부품(hx-*)과 평생교육 항목(분야 아이콘 그리드 · 시니어 전화 신청 띠)을 기본으로 켠다.
     데이터가 없으면 게시본에서 자동으로 숨는다. after = 그 섹션 바로 뒤, end = 마지막 신청 띠(l4-cta) 앞. hx-rev를 켠 템플릿은 자체 인용(l4-quote)을 기관 한마디로만 쓴다(후기 두 번 금지) */
  const PARTS = {
    lfhall: { after: { 'l4-cards': ['fields'] }, end: ['rev', 'faq', 'loc'] }, lfuniv: { after: { 'l4-hero': ['fields'] }, end: ['fac', 'rev', 'faq'] },
    lfsenior: { after: { 'l4-tiles': ['callbar'] }, end: ['rev', 'faq'] }, lfhuman: { end: ['fac', 'rev'] }, lfvillage: { end: ['rev', 'loc'] },
    lfcredit: { after: { 'l4-flow': ['fields'] }, end: ['faq', 'loc'] }, lfculture: { after: { 'l4-rows': ['price'] }, end: ['fac', 'rev', 'loc'] },
    lflibrary: { after: { 'l4-cards': ['fields'] }, end: ['faq', 'loc'] }, lfretire: { end: ['fac', 'rev', 'faq'] }, lffamily: { end: ['rev', 'faq', 'loc'] } };
  const PT = { lfhall: { fields: ['분야별로 찾기', '어떤 걸\n배워 볼까요?'], faq: { tone: 'alt' } }, lfuniv: { fields: ['교육 분야', '분야별로\n과정을 찾아요'], fac: { title: '함께하는 교수진' } },
    lfcredit: { fields: ['전공 분야', '분야별\n개설 과목'], faq: { title: '학점 · 학위 자주 묻는 질문' } }, lflibrary: { fields: ['주제별로', '관심 주제로\n강좌를 찾아요'] },
    lfhuman: { fac: { title: '이번 시즌 강사' } }, lfretire: { fac: { title: '함께하는 전문 강사' } }, lfculture: { price: { title: '이번 시즌 수강료' }, fac: { title: '함께하는 선생님' } },
    lfsenior: { faq: { title: '자주 묻는 질문' } }, lffamily: { faq: { tone: 'alt' } } };
  const part = (id, k) => { const o = (PT[id] || {})[k];
    if (k === 'fields') return TX('features', { hpt: 'l4-fields', eyebrow: o ? o[0] : '분야별로', title: o ? o[1] : '분야별로\n찾아요', cols: AUTO });
    if (k === 'callbar') return TX('features', { hpt: 'l4-callbar', title: '전화로도 신청할 수 있어요', sub: '이름과 듣고 싶은 강좌만 말씀해 주세요.', cols: AUTO });
    try { const x = window.HPX && typeof HPX.sec === 'function' ? HPX.sec(k, o || null) : null; if (x && x.data) x.data.on44 = 1; return x; } catch (e) { return null; } };
  const arrange = (id, L) => { const P = PARTS[id] || {}; const out = L.slice(); const hasRev = (P.end || []).includes('rev');
    if (hasRev) out.forEach(x => { if (x && x.data && x.data.hpt === 'l4-quote') x.data.say = 1; });
    Object.keys(P.after || {}).forEach(h => { const at = h === 'l4-hero' ? out.findIndex(x => x && x.type === 'banner') : out.findIndex(x => x && x.data && x.data.hpt === h); const add = P.after[h].map(k => part(id, k)).filter(Boolean); out.splice(at < 0 ? 1 : at + 1, 0, ...add); });
    const end = (P.end || []).map(k => part(id, k)).filter(Boolean); let at = out.findIndex(x => x && x.data && x.data.hpt === 'l4-cta'); if (at < 0) at = out.length; out.splice(at, 0, ...end); return out; };
  MINE.forEach(id => { const b0 = B[id].build; B[id].build = () => arrange(id, b0()); });
  MINE.forEach(id => { if (TPL.some(t => t.id === 't44-' + id)) return; const c = B[id]; const D = DEF[id];
    TPL.push({ id: 't44-' + id, name: D.name, sub: D.sub, types: ['lifelong'], g44: 1, prem: 1, noPalette: true, scene: c.scene, color: D.acc, tone: D.dark ? '시네마틱' : '따뜻함', look: 'mintSoft', theme: id, hero: '', purpose: c.purpose, desc: D.desc, build: c.build }); });
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hp44l) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && String(tp.id || '').replace(/^t44-/, ''); if (DEF[id] && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, DEF[id].ph); s.img = {}; Object.keys(s.photos).forEach(sl => { const v = HPSTOCK.slotImg(s.photos[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hp44-life photo', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hp44l = 1; siteFromTpl = f; window.siteFromTpl = f; }
  /* 자동 보강이 첫 화면 아래 넣는 공지 · FAQ는 마지막 행동 앞으로. 공지 섹션(l4-help)이 있는 템플릿은 자동 공지를 숨긴다 */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hp44l) { const e0 = HPT.enrich; const f = s => { const r = e0(s); try { if (mine(s) && Array.isArray(s.sections)) { const L = s.sections;
      const isMv = x => x && (x.type === 'notices' || (x.type === 'text' && x.data && x.data.hpt === 'faq'));
      const mv = L.filter(isMv); if (mv.length) { for (let k = L.length - 1; k >= 0; k--) if (isMv(L[k])) L.splice(k, 1);
        if (L.some(x => x && x.data && x.data.hpt === 'l4-help')) mv.forEach(x => { if (x.type === 'notices') x.hide = true; });
        let at = -1; L.forEach((x, k) => { if (x && x.data && /^l4-(cta|help)$/.test(x.data.hpt)) at = at < 0 ? k : at; }); if (at < 0) at = L.length; L.splice(at, 0, ...mv); } } } catch (e) { console.error('hp44-life enrich', e); } return r; };
    Object.keys(e0).forEach(k => { try { f[k] = e0[k]; } catch (e) { } }); f.hp44l = 1; HPT.enrich = f; }
  window.HP44L = { DEF, css, SEC, B };
})();
