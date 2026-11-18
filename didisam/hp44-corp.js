/* v44 hp44-corp — 기업 교육 홈페이지 템플릿 10종(세부 유형별)
   대표님(2026-11-18 00:45): 「교육기관 유형별로 10가지 종류만」 「세부 유형별로 시나리오에 맞게 높은 퀄리티의 템플릿만」 「다른 유형의 템플릿도 아주 잘 디자인되어 있는 고퀄리티」
   - 기준선: v43.9 hpv-corp(키노트 · 전통 기업, 대표님 「전부 마음에 들어」). 두 종을 흡수해 cphrd · c4heritage로 발전시키고 8종을 새로 만든다.
   - 테마 id는 cp+이름(HPT.reg가 영문 소문자만 받아 c4 접두어 대신 cp). 클래스 접두어는 c4-.
   - 10종 첫 화면 구성이 모두 다르다: 키노트(가운데 제목 + 큰 사진) · 타이포 목록 · 사진 콜라주 · 시네마틱 다크 · 테크 분할 다크 · 포스터 · 격식 분할 · 스티커 콜라주 · 왼쪽 사진 분할 · 아치(사내 대학)
   - 원칙: 한 화면 한 메시지(첫 화면 = 큰 제목 + 부제 + 버튼 2개 + 사진 또는 타이포 덩어리), 섹션 5~6개 · 성격이 서로 다르게, 실제 데이터만(없으면 숨김, 60% 미만 이수율은 큰 숫자로 내세우지 않음).
   - 링크: 학습자 실제 경로(#my · #courses · #cert · #notice · #comm · #login · #join · tel:)와 과정 상세(#p-c-<id> → 게시 때 #class/<id>)만.
   - CSS는 siteHTML 문자열 안에(게시본 Shadow DOM). 클래스 접두어 c4-. hpth · hpprem · hpsec* · hpv-*는 고치지 않는다. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const U = HPT.U; const { mix, fit, al } = U;
  const onC = c => (HPT.onColor ? HPT.onColor(c) : (U.CR(c, '#0B0F0D') >= U.CR(c, '#FFFFFF') ? '#0B0F0D' : '#FFFFFF'));
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const NL = v => E(v).replace(/\n/g, '<br>');
  /* 제목 두 줄: 두 번째 줄을 강조 태그로 */
  const T2 = (v, tag) => { const t = String(v || '').split('\n'); return t.length > 1 ? `${E(t[0])}<br><${tag}>${E(t.slice(1).join(' '))}</${tag}>` : E(t[0]); };
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const tday = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const okD = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''));
  const days = (a, b) => Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 864e5);
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const telOf = () => String(ft().tel || '').replace(/[^\d-]/g, '');
  const DOW = '일월화수목금토';
  const md = d => okD(d) ? `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일` : '';
  const dot = d => okD(d) ? `${d.slice(5, 7)}.${d.slice(8, 10)}` : '';
  const PATH = { arrow: 'M5 12h14M13 6l6 6-6 6', chev: 'M9 6l6 6-6 6' };
  const ic = (k, n, w) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="${w || 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATH[k] || PATH.arrow}"/></svg>`;
  const ROUTES = ['home', 'my', 'courses', 'cert', 'notice', 'comm', 'login', 'join', 'shop'];
  const href = (v, dflt) => { v = String(v || ''); if (!v) return dflt || ''; if (v.startsWith('learn:')) { const r = v.slice(6); return '#' + (ROUTES.includes(r) ? r : 'home'); }
    if (v.startsWith('cls:')) return '#p-c-' + v.slice(4); if (v.startsWith('page:')) return '#p-' + v.slice(5); if (v.startsWith('tel:')) return 'tel:' + v.slice(4).replace(/[^\d-]/g, ''); if (/^#[a-z]/.test(v)) return v; return dflt || ''; };
  const mark = (h, x) => { const m = editing() ? HPE.map.get(x) : null; return m ? h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`) : h; };
  const empty = (x, msg) => editing() ? mark(`<section class="hpt c4 c4-emp"><div class="c4w"><p>${E(msg || '표시할 실제 데이터가 아직 없어 게시본에서는 이 섹션이 숨겨져요.')}</p></div></section>`, x) : '';

  /* ── 실제 데이터(기업: 방문자가 임직원이라 사내 과정 이름 · 일정을 보여 준다) ── */
  const live = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => c && c.status !== '종료' && c.name && !(okD(c.end) && days(tday(), c.end) < 0));
  const pick = (re, n) => { const L = live(); const A = re ? L.filter(c => re.test(c.name)) : []; const B = L.filter(c => !A.includes(c)); return [...A, ...B].slice(0, n || 12); };
  const legal = () => live().filter(c => c.legal).sort((a, b) => String(a.end || '9').localeCompare(String(b.end || '9')));
  const done = (c, id) => { if (typeof clsDone === 'function') { try { return !!clsDone(c, id); } catch (e) { } } const p = +(((c.prog || {})[id] || {}).p) || 0; return p >= (((c.criteria || {}).threshold) || 100); };
  const rateOf = L => { let n = 0, d = 0; L.forEach(c => { (c.learners || []).forEach(id => { n++; if (done(c, id)) d++; }); }); return n ? Math.round(d * 100 / n) : null; };
  const learners = () => { const set = new Set(); live().forEach(c => (c.learners || []).forEach(id => set.add(id))); return set.size; };
  const kindL = c => c.legal ? '필수 교육' : c.kind === 'episode' ? (c.sub || '집합 · 회차') : c.kind === 'sub' ? '구독' : '온라인';
  const whenL = c => { if (okD(c.start) && days(tday(), c.start) > 0) return `${md(c.start)} 시작`; if (okD(c.end)) return `${md(c.end)}까지`; return '상시 수강'; };
  const hrs = c => +c.hours ? `${+c.hours}시간` : '';
  const short = n => String(n || '').replace(/\s*\(.*\)$/, '');
  const cH = c => '#p-c-' + c.id;
  const review = () => { try { const BAD = /끊겨|끊김|안 ?돼|안 ?되|부탁|해 ?주세요|해주세요|오류|에러|환불|불편|느려|버그|문제|\?\s*$/; const R = (S.reviews || []).filter(r => { const b = String((r && r.body) || '').trim(); return r && !r.hidden && b.length >= 15 && (+r.stars || 0) >= 4 && !BAD.test(b); }); /* QA 11-18: 불만 · 요청 · 질문 글은 큰 인용으로 쓰지 않는다 */ const r = R[0]; if (!r) return null; const c = (S.classes || []).find(x => x.id === r.cls); return { body: String(r.body).trim(), cls: c ? c.name : '' }; } catch (e) { return null; } };
  const notes = n => { try { return [...(S.notices || []), ...(S.classes || []).flatMap(c => c.notices || [])].filter(x => x && x.title && !x.hidden && !x.draft).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, n || 4); } catch (e) { return []; } };
  const LV = () => { const J = ((typeof S !== 'undefined' && S && S.journey) || []).map(j => j && j.name).filter(Boolean); return J.length >= 3 ? J.slice(0, 4) : ['입문', '실무', '리더']; };

  /* ── 사진 ── */
  const H = () => window.HPSTOCK;
  const abs = u => { try { return new URL(u, (H() && H().base) || location.href).href; } catch (e) { return u; } };
  const stk = (id, sz) => { const h = H(); if (!h || typeof h.get !== 'function') return null; const x = h.get(id); if (!x) return null; return { src: abs(h.url(x, sz === 'lg' ? '' : 'sm')), alt: x.alt || '', pos: x.focus || '50% 50%' }; };
  const slotP = (s, slot, d, fb) => { try { if (window.HPS && typeof HPS.photo === 'function') { const p = HPS.photo(s, slot, d); if (p) return { src: p.src, alt: p.alt, pos: p.pos }; } } catch (e) { } return fb ? stk(fb, 'lg') : null; };
  /* 강좌 카드 사진(통합 11-18 공통 규칙): ① 기관이 올린 강좌 사진 ② 강좌 이름 · 분야 규칙(HPSTOCK.courseRule)에 맞는 스톡 — 페이지 안 중복 제외, 템플릿마다 시작 후보를 달리 ③ 템플릿 사진 세트 */
  let USED = new Set();
  const keyOf = v => String(v || '').replace(/^.*\/img\/stock\//, '').replace(/-800(?=\.webp)/, '').replace(/\.webp.*$/, '');
  const pageStart = s => { USED = new Set(); try { const th = DEF[s && s.theme]; Object.values((th && th.ph) || {}).forEach(v => USED.add(v)); Object.values((s && s.photos) || {}).forEach(v => USED.add(keyOf(v))); Object.values((s && s.img) || {}).forEach(v => { if (v) USED.add(keyOf(v.stock || v.src)); }); } catch (e) { } };
  const clsP = (c, s, i) => { const G = window.G44PH; if (!G) return null; /* 공통 고르기(global.js G44PH): ① 운영자 ② 강좌 이름 규칙 ③ 템플릿 세트 */
    const p = G.pick(c, s, { used: USED, set: (DEF[s && s.theme] || {}).pool || [], salt: Math.max(0, MINE.indexOf(s && s.theme)) }); return p ? { src: p.op ? p.src : abs(p.src), alt: p.alt || c.name, pos: p.pos || '50% 50%' } : null; };
  const img = (p, cls, eager) => p ? `<figure class="${cls || 'c4-ph'}"><img src="${E(p.src)}" alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>` : '';

  /* ── 테마 10종: 세부 유형 · 색 · 서체 · 첫 화면 ── */
  const SERIF = "'Noto Serif KR','Noto Serif KR Fallback','Noto Serif CJK KR','Nanum Myeongjo','AppleMyungjo',serif";
  const SANS = "Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
  const MONO = "'JetBrains Mono','SFMono-Regular',Menlo,Consolas,monospace";
  /* k: 첫 화면 종류 · bg/alt/ink/mu: 바탕 · 면 · 글자 · dk: 짙은 면 · pt: 포인트 · r: 카드 모서리 · br: 버튼 모서리 · hf/hw: 제목 서체 · 굵기 · nw: 큰 숫자 굵기 · ph: 사진 슬롯 */
  const DEF = {
    cphrd: { name: '러닝센터 키노트', sub: '대기업 HRD 러닝센터', k: 'keynote', desc: '가운데 큰 제목과 큰 사진 한 장 — 과정이 많은 대기업 HRD 러닝센터를 제품 발표처럼', acc: '#2D5BFF', bg: '#FFFFFF', alt: '#F5F5F7', ink: '#0A0F1C', mu: '#4B5263', dk: '#0A0F1C', pt: '#2D5BFF', r: 28, br: 999, hf: SANS, hw: 800, nw: 800, ph: { hero: 'grp-01', about: 'hum-10' }, pool: ['cor-15', 'grp-03', 'cor-14'] },
    cplegal: { name: '필수 교육 체크', sub: '법정 · 필수 교육', k: 'list', desc: '사진 대신 큰 글씨 과목 목록 — 올해 들어야 할 법정 교육을 첫 화면에서 한 번에', acc: '#0B6E4F', bg: '#F6F5F1', alt: '#FFFFFF', ink: '#13201B', mu: '#4A5550', dk: '#0F2A22', pt: '#F2A93B', r: 6, br: 6, hf: SANS, hw: 800, nw: 800, ph: {}, pool: [] },
    cponboard: { name: '웰컴 온보딩', sub: '신입 온보딩', k: 'collage', desc: '「환영해요」 큰 인사와 밝은 사진 콜라주 · 첫날부터 90일까지의 흐름 — 신입 · 경력 입사자 온보딩', acc: '#E8590C', bg: '#FBF6EE', alt: '#FFFFFF', ink: '#1F1A14', mu: '#5A5148', dk: '#2A1F15', pt: '#E8590C', r: 24, br: 999, hf: SANS, hw: 800, nw: 800, ph: { hero: 'hum-36', about: 'cor-07', space: 'grp-02', cta: 'cor-04' }, pool: ['cor-01', 'lap-08', 'dsk-06'] },
    cplead: { name: '리더스 시네마', sub: '리더십 · 승진', k: 'cinema', desc: '어두운 전면 사진과 세리프 제목 · 금색 선 — 신임 리더 · 승진자 과정을 영화 포스터처럼', acc: '#C9A45C', bg: '#0E0F12', alt: '#17191E', ink: '#F3F1EC', mu: '#B4B0A6', dk: '#000000', pt: '#C9A45C', r: 4, br: 2, hf: SERIF, hw: 600, nw: 300, ph: { hero: 'arc-06' }, pool: ['hum-04', 'off-01'], dark: 1 },
    cpdx: { name: 'DX 아카데미', sub: '직무 · DX 아카데미', k: 'tech', desc: '어두운 바탕 · 민트 포인트 · 고정폭 라벨 — 생성형 AI · 데이터 · 자동화 직무 아카데미', acc: '#3DDC97', bg: '#0B0F14', alt: '#121821', ink: '#EEF3F7', mu: '#9AA8B6', dk: '#05080B', pt: '#3DDC97', r: 14, br: 10, hf: SANS, hw: 800, nw: 800, ph: { hero: 'hum-41', about: 'lap-05' }, pool: ['hum-07', 'dsk-04', 'lap-03'], dark: 1 },
    cpsales: { name: '세일즈 포스터', sub: '영업 · 서비스 교육', k: 'poster', desc: '전면 사진 위 아주 큰 고딕 제목과 신호 코랄 — 현장 영업 · 고객 응대 교육', acc: '#FF5A36', bg: '#F3F2EE', alt: '#FFFFFF', ink: '#111111', mu: '#4A4A46', dk: '#111111', pt: '#FF5A36', r: 0, br: 0, hf: SANS, hw: 900, nw: 900, ph: { hero: 'hum-11', about: 'cor-16', space: 'cor-09' }, pool: ['cor-03', 'off-02', 'cor-12'] },
    cpheritage: { name: '전통 기업', sub: '전통 기업(격식)', k: 'heritage', desc: '아이보리 바탕 · 가는 제목 · 로마 숫자 계층 체계 · 금색 선 — 대기업 · 금융권 인재원의 격식', acc: '#122A4A', bg: '#F7F5F0', alt: '#FFFFFF', ink: '#14181F', mu: '#4A505B', dk: '#122A4A', pt: '#A8844F', r: 0, br: 0, hf: SANS, hw: 300, nw: 200, ph: { hero: 'hum-46' }, pool: ['off-05', 'cor-08'] },
    cpstartup: { name: '컬처 클럽', sub: '스타트업 문화', k: 'sticker', desc: '라일락 바탕 · 형광 강조 · 기울인 사진 스티커 — 일하는 방식과 문화를 함께 배우는 스타트업', acc: '#6D4AFF', bg: '#F3F0FF', alt: '#FFFFFF', ink: '#1B1530', mu: '#4F4866', dk: '#1B1530', pt: '#C6F432', r: 28, br: 999, hf: SANS, hw: 800, nw: 800, ph: { hero: 'hum-50', about: 'lap-07', space: 'hum-40' }, pool: ['grp-06', 'hum-39', 'cor-11'] },
    cppartner: { name: '파트너 아카데미', sub: '협력사 · 파트너 교육', k: 'side', desc: '왼쪽 전체 높이 사진 · 오른쪽 정돈된 안내 — 협력사 · 대리점 · 파트너 인증 교육', acc: '#0E5E8C', bg: '#FFFFFF', alt: '#F1F6F9', ink: '#0F1E2A', mu: '#46586A', dk: '#0B3550', pt: '#0E5E8C', r: 12, br: 8, hf: SANS, hw: 800, nw: 800, ph: { hero: 'shk-01', about: 'off-12' }, pool: [] },
    cpcs: { name: '상담 스튜디오', sub: 'CS · 콜센터 교육', k: 'chat', desc: '상담 대화 말풍선과 밝은 사진 — 응대 스크립트 · 품질 평가 · 신입 상담사 온보딩을 대화로 보여 주는 CS 교육', acc: '#0E7C7B', bg: '#F1F7F6', alt: '#FFFFFF', ink: '#10201F', mu: '#46595A', dk: '#0B2B2A', pt: '#FF7A59', r: 22, br: 14, hf: SANS, hw: 800, nw: 800, ph: { hero: 'hum-08', about: 'hum-09' }, pool: ['hum-01', 'cor-06', 'hum-06'] },
    cpstore: { name: '매장 아카데미', sub: '대리점 · 가맹점 교육', k: 'store', desc: '브랜드 색 블록 위 큰 제목과 매장 사진 세 장 — 본사가 점주 · 직원에게 매장 매뉴얼 · 신메뉴 · 신상품을 교육하는 가맹 · 대리점', acc: '#B3261E', bg: '#FFF8F1', alt: '#FFFFFF', ink: '#24140F', mu: '#5E4A42', dk: '#3A1410', pt: '#F4B740', r: 16, br: 10, hf: SANS, hw: 900, nw: 900, ph: { hero: 'bar-03', about: 'coo-02', cta: 'bar-01', space: 'coo-03' }, pool: ['bak-02', 'coo-01', 'log-01'] },
    cpuniv: { name: '사내 대학', sub: '사내 대학', k: 'arch', desc: '가운데 세리프 제목과 아치형 사진 · 학부 체계 — 기업 사내 대학 · 아카데미의 학교다운 품격', acc: '#7A1F2B', bg: '#FAF7F2', alt: '#FFFFFF', ink: '#1E1A17', mu: '#5B534C', dk: '#3B0F15', pt: '#B8893C', r: 4, br: 4, hf: SERIF, hw: 700, nw: 400, ph: { hero: 'lib-08', about: 'lib-01' }, pool: ['lib-02', 'hum-13'] }
  };
  const tok = (hf, hw, h1, h1m) => ({ hf, hw, hls: -0.04, h1, h1m, lh1: 1.1, h2: 52, h2m: 32, h3: 22, body: 17, blh: 1.65, lead: 20, ey: { fs: 15, ls: 0, fw: 700, tt: 'none' }, sec: 150, secm: 88, w: 1200, gut: 40,
    r: 20, rs: 12, br: 999, bh: 52, bpx: 26, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' });
  const MINE = Object.keys(DEF);
  const mine = s => !!(s && s.theme && DEF[s.theme]);
  const thOf = s => (s && DEF[s.theme]) ? s.theme : 'cphrd';

  /* ── 공통 조각 ── */
  const btn = (cls, label, h, arrow) => label ? `<a class="c4-b ${cls}" href="${E(h)}">${E(label)}${arrow ? ic(arrow === 1 ? 'arrow' : arrow, 20, 2) : ''}</a>` : '';
  const cta = (d, c1, c2, a1, a2) => `<div class="c4-cta">${btn(c1, d.cta, href(d.link, '#courses'), a1)}${btn(c2, d.cta2, href(d.link2, '#my'), a2)}</div>`;
  const ey = d => d.eyebrow ? `<p class="c4-ey">${E(d.eyebrow)}</p>` : '';
  const head = (d, tag) => `${ey(d)}<h2 class="c4-h2">${T2(d.title, tag || 'span')}</h2>${d.sub ? `<p class="c4-sd">${E(d.sub)}</p>` : ''}`;
  const sec = (x, s, kind, inner, cls) => mark(`<section class="hpt c4 ${thOf(s)} c4-${kind}${cls ? ' ' + cls : ''}">${inner}</section>`, x);

  /* ── 첫 화면 10종 ── */
  const HERO = {
    keynote: (s, d) => { const p = slotP(s, 'hero', d, 'grp-01');
      return `<div class="c4w c4-c">${ey(d)}<h1>${T2(d.title, 'span')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'gh', 0, 'chev')}${d.note ? `<p class="c4-note">${E(d.note)}</p>` : ''}</div>${p ? `<div class="c4-big">${img(p, 'c4-ph', 1)}</div>` : ''}`; },
    list: (s, d) => { const L = legal().slice(0, 5); const L2 = L.length ? L : pick(null, 4);
      return `<div class="c4w c4-g${L2.length ? '' : ' one'}"><div>${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}</div>
${L2.length ? `<div class="c4-list"><p class="c4-lh">${E(L.length ? '올해 들어야 할 과목' : '지금 들을 수 있는 과정')}</p><ol>${L2.map((c, i) => `<li><a href="${cH(c)}"><span class="c4-n">${String(i + 1).padStart(2, '0')}</span><b>${E(short(c.name))}</b>${ic('arrow', 22, 1.8)}</a></li>`).join('')}</ol></div>` : ''}</div>`; },
    collage: (s, d) => { const p1 = slotP(s, 'hero', d, 'hum-36'); const p2 = slotP(s, 'cta', null, 'cor-04'); const p3 = slotP(s, 'space', null, 'grp-02');
      return `<div class="c4w c4-g"><div>${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}${d.note ? `<p class="c4-note">${E(d.note)}</p>` : ''}</div><div class="c4-col">${img(p1, 'c4-p1', 1)}${img(p2, 'c4-p2')}${img(p3, 'c4-p3')}<span class="c4-dot" aria-hidden="true"></span></div></div>`; },
    cinema: (s, d) => { const p = slotP(s, 'hero', d, 'arc-06');
      return `${img(p, 'c4-bg', 1)}<div class="c4-in"><div class="c4w c4-c">${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 0, 0)}</div></div>`; },
    tech: (s, d) => { const p = slotP(s, 'hero', d, 'hum-41');
      return `<div class="c4w c4-g"><div>${d.eyebrow ? `<p class="c4-mono">${E(d.eyebrow)}</p>` : ''}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}</div><div class="c4-fr">${img(p, 'c4-ph', 1)}${d.note ? `<p class="c4-mono c4-cap">&gt; ${E(d.note)}</p>` : ''}</div></div>`; },
    poster: (s, d) => { const p = slotP(s, 'hero', d, 'hum-11');
      return `${img(p, 'c4-bg', 1)}<div class="c4-in"><div class="c4w">${d.eyebrow ? `<span class="c4-tag">${E(d.eyebrow)}</span>` : ''}<h1>${NL(d.title)}</h1><div class="c4-row">${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : '<span></span>'}${cta(d, 'pri', 'wh', 1, 1)}</div></div></div>`; },
    heritage: (s, d) => { const p = slotP(s, 'hero', d, 'hum-46');
      return `<div class="c4-tx">${d.eyebrow ? `<p class="c4-est">${E(d.eyebrow)}</p>` : ''}<h1>${T2(d.title, 'b')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}</div>${p ? `<figure class="c4-hf"><img src="${E(p.src)}" alt="${E(p.alt)}" loading="eager" fetchpriority="high" decoding="async" style="object-position:${E(p.pos)}">${d.note ? `<figcaption>${E(d.note)}</figcaption>` : ''}</figure>` : ''}`; },
    sticker: (s, d) => { const p1 = slotP(s, 'hero', d, 'hum-50'); const p2 = slotP(s, 'about', null, 'grp-02'); const p3 = slotP(s, 'space', null, 'hum-40');
      return `<div class="c4w c4-c">${img(p1, 'c4-s1', 1)}${img(p2, 'c4-s2')}${img(p3, 'c4-s3')}<div class="c4-mid">${ey(d)}<h1>${T2(d.title, 'mark')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 0, 0)}</div></div>`; },
    side: (s, d) => { const p = slotP(s, 'hero', d, 'shk-01');
      return `${p ? `<figure class="c4-sp"><img src="${E(p.src)}" alt="${E(p.alt)}" loading="eager" fetchpriority="high" decoding="async" style="object-position:${E(p.pos)}"></figure>` : ''}<div class="c4-tx">${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}${d.note ? `<p class="c4-note">${E(d.note)} <a href="#login">파트너 로그인</a></p>` : ''}</div>`; },
    chat: (s, d) => { const p = slotP(s, 'hero', d, 'hum-08'); const C = (d.chat || []).slice(0, 3);
      return `<div class="c4w c4-g"><div>${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 1, 0)}</div><div class="c4-cv">${img(p, 'c4-ph', 1)}${C.map((m, i) => `<p class="c4-bb b${i}${i === 1 ? ' me' : ''}"><small>${E(i === 1 ? '상담사' : '고객')}</small>${E(m)}</p>`).join('')}</div></div>`; },
    store: (s, d) => { const p1 = slotP(s, 'hero', d, 'bar-03'); const p2 = slotP(s, 'about', null, 'coo-02'); const p3 = slotP(s, 'cta', null, 'bar-01');
      return `<div class="c4-blk"><div class="c4w"><div class="c4-st">${ey(d)}<h1>${NL(d.title)}</h1></div><div class="c4-sr">${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'wh', 1, 0)}</div></div></div><div class="c4w c4-mos">${img(p1, 'm1', 1)}${img(p2, 'm2', 1)}${img(p3, 'm3', 1)}</div>`; },
    arch: (s, d) => { const p = slotP(s, 'hero', d, 'lib-08'); const o = org();
      return `<div class="c4w c4-c"><span class="c4-crest" aria-hidden="true">${E((o || 'A').slice(0, 1))}</span>${ey(d)}<h1>${T2(d.title, 'em')}</h1>${d.sub ? `<p class="c4-lead">${E(d.sub)}</p>` : ''}${cta(d, 'pri', 'line', 0, 0)}</div>${p ? `<div class="c4w">${img(p, 'c4-arch', 1)}</div>` : ''}`; }
  };
  const heroSec = (s, d) => { const th = thOf(s); return `<section class="hpt c4 ${th} c4-hero c4-k-${DEF[th].k}">${HERO[DEF[th].k](s, d)}</section>`; };

  /* ── 섹션 ── */
  const SEC = {};
  /* 큰 숫자 하나: 필수 교육 이수율(실제 계산, 60% 이상일 때만) */
  SEC['c4-stat'] = (x, s) => { const d = x.data || {}; const L = legal(); const r = rateOf(L.length ? L : live()); if (r == null || r < 60) return empty(x, '이수율이 60% 이상이 되면 큰 숫자로 보여요.'); const nx = L.filter(c => okD(c.end))[0];
    return sec(x, s, 'stat', `<div class="c4w"><div class="c4-sg"><div class="c4-num">${r}<small>%</small></div><div><p class="c4-t">${E(d.title || (L.length ? '필수 교육 이수율이에요. 마감 전에 함께 끝내요.' : '수강 중인 과정의 이수율이에요.'))}</p>${d.sub ? `<p class="c4-d">${E(d.sub)}</p>` : ''}</div></div>
<div class="c4-line"><span>${nx ? `가장 가까운 마감 · ${E(short(nx.name))} ${E(md(nx.end))}` : (learners() >= 100 ? `수강 인원 ${learners().toLocaleString('ko-KR')}명 기준` : '마감 전에 함께 끝내요')}</span><a href="#my">내 교육 확인하기 ${ic('arrow', 18, 2)}</a></div></div>`); };
  /* 과정 카드 3장(사진) */
  SEC['c4-cards'] = (x, s) => { const d = x.data || {}; const th = thOf(s); const re = d.re ? new RegExp(d.re) : null; const L = pick(re, 3); if (!L.length) return empty(x); const pool = DEF[th].pool;
    return sec(x, s, 'cards', `<div class="c4w"><div class="c4-head"><div>${head(d)}</div><a class="c4-more" href="#courses">전체 과정${live().length >= 10 ? ` ${live().length}개` : ''} 보기 ${ic('chev', 18, 2)}</a></div><div class="c4-cg">${L.map((c, i) => `<a class="c4-card" href="${cH(c)}">${img(clsP(c, s, i))}<div class="c4-bd"><p class="c4-tg">${E(kindL(c))}</p><h3>${E(c.name)}</h3><p>${E([c.teacher, hrs(c)].filter(Boolean).join(' · ') || '자세한 안내는 과정 페이지에서 확인해요.')}</p><div class="c4-m"><span>${E(c.kind === 'episode' ? '집합' : '온라인')}</span><b>${E(whenL(c))}</b></div></div></a>`).join('')}</div></div>`); };
  /* 2열 이야기 + 단계 */
  SEC['c4-story'] = (x, s) => { const d = x.data || {}; const cols = (d.cols || []).filter(c => c && c[0]).slice(0, 3); const p = slotP(s, 'about', null, DEF[thOf(s)].ph.about || DEF[thOf(s)].pool[0]);
    return sec(x, s, 'story', `<div class="c4w c4-sg2">${img(p)}<div>${head(d)}<ol class="c4-steps">${cols.map((c, i) => `<li><span class="c4-n">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div></li>`).join('')}</ol></div></div>`); };
  /* 가로 단계(사진 없이 큰 숫자 · 라벨) */
  SEC['c4-flow'] = (x, s) => { const d = x.data || {}; const cols = (d.cols || []).filter(c => c && c[0]).slice(0, 4);
    return sec(x, s, 'flow', `<div class="c4w">${head(d)}<ol class="c4-fl n${cols.length}">${cols.map((c, i) => `<li><span class="c4-fk">${E(c[2] || String(i + 1).padStart(2, '0'))}</span><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</li>`).join('')}</ol></div>`, d.inv ? 'inv' : ''); };
  /* 계층 · 단계별 체계(실제 과정 단계 · 개수) */
  SEC['c4-levels'] = (x, s) => { const d = x.data || {}; const L = live(); if (!L.length) return empty(x); const N = LV(); const RN = d.num === 'roman' ? ['I', 'II', 'III', 'IV'] : ['01', '02', '03', '04'];
    const of = i => L.filter(c => (+c.level || 0) === i);
    return sec(x, s, 'levels', `<div class="c4w"><div class="c4-lt"><div>${ey(d)}<h2 class="c4-h2">${T2(d.title, 'b')}</h2></div>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div>
<div class="c4-lv n${N.length}">${N.map((n, i) => `<a href="#courses"><span class="c4-r">${RN[i] || i + 1}</span><h3>${E(n)}</h3><p>${E(of(i).slice(0, 3).map(c => short(c.name)).join(' · ') || '과정을 준비하고 있어요.')}</p><span class="c4-lc">과정 보기 ${ic('arrow', 20, 1.6)}</span></a>`).join('')}</div></div>`); };
  /* 가치 3개 */
  SEC['c4-vals'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 3);
    return sec(x, s, 'vals', `<div class="c4w">${ey(d)}<h2 class="c4-h2">${T2(d.title, 'b')}</h2><div class="c4-vg">${C.map((c, i) => `<div class="v${i}"><p class="c4-no">${String(i + 1).padStart(2, '0')}</p><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div>`).join('')}</div></div>`); };
  /* 대표 프로그램 2개(큰 사진) */
  SEC['c4-prog'] = (x, s) => { const d = x.data || {}; const th = thOf(s); const re = d.re ? new RegExp(d.re) : null; const L = pick(re, 2); if (!L.length) return empty(x); const pool = DEF[th].pool;
    return sec(x, s, 'prog', `<div class="c4w"><div class="c4-head"><div>${head(d, 'b')}</div><a class="c4-more" href="#courses">전체 과정 보기 ${ic('arrow', 20, 1.6)}</a></div><div class="c4-pg n${L.length}">${L.map((c, i) => `<a class="c4-pc${i ? ' s' : ''}" href="${cH(c)}">${img(clsP(c, s, i))}<p class="c4-m"><span>${E(c.legal ? '필수' : (LV()[+c.level || 0] || '과정'))}</span><span>${E([hrs(c), c.kind === 'episode' ? '집합' : '온라인'].filter(Boolean).join(' · '))}</span></p><h3>${E(c.name)}</h3><p>${E(whenL(c))}${c.teacher ? ` · ${E(c.teacher)}` : ''}</p></a>`).join('')}</div></div>`); };
  /* 날짜 열 목록 */
  SEC['c4-rows'] = (x, s) => { const d = x.data || {}; const L = pick(null, 5); if (!L.length) return empty(x); const t = tday();
    return sec(x, s, 'rows', `<div class="c4w">${head(d)}<div class="c4-ls">${L.map(c => { const sd = okD(c.start) && days(t, c.start) > 0 ? c.start : c.end; const n = okD(c.end) ? days(t, c.end) : null; const tg = n != null && n <= 14 ? ['n', '마감 임박'] : okD(c.start) && days(t, c.start) > 0 ? ['', '신청 가능'] : ['', '수강 중'];
      return `<a class="c4-rw" href="${cH(c)}"><div class="c4-dt"><b>${okD(sd) ? E(dot(sd)) : '상시'}</b><small>${okD(sd) ? (sd === c.start ? '시작' : '마감') + ' · ' + DOW[new Date(sd + 'T00:00:00').getDay()] : '온라인'}</small></div><div><h3>${E(c.name)}</h3><p>${E([kindL(c), c.teacher].filter(Boolean).join(' · '))}</p></div><div class="c4-mt">${E([c.kind === 'episode' ? '집합' : '온라인', hrs(c)].filter(Boolean).join(' · '))}</div><span class="c4-tag ${tg[0]}">${tg[1]}</span></a>`; }).join('')}</div><a class="c4-more" href="#courses">전체 일정 보기 ${ic('chev', 18, 2)}</a></div>`); };
  /* 숫자 띠(실제 값, 60% 미만 비율은 뺀다) */
  SEC['c4-figs'] = (x, s) => { const d = x.data || {}; const L = live(); if (!L.length) return empty(x); const lg = rateOf(legal()); const n = learners();
    const K = [L.length >= 10 ? [L.length, '개', '운영 중인 과정'] : null, n >= 100 ? [n, '명', '함께 배우는 인원'] : null, lg != null && lg >= 60 ? [lg, '%', '필수 교육 이수율'] : null].filter(Boolean); /* QA 11-18: 자랑할 만한 값만(과정 10개 · 인원 100명 · 이수율 60% 이상), 두 개 미만이면 섹션을 숨긴다 */
    if (K.length < 2) return empty(x, '과정 10개 · 수강 인원 100명 · 이수율 60% 중 두 가지 이상을 넘으면 숫자 띠가 보여요.');
    return sec(x, s, 'figs', `<div class="c4w"><div class="c4-fg n${K.length}"><h2 class="c4-h2">${T2(d.title || '숫자로 보는\n우리 교육', 'b')}</h2>${K.map(k => `<div class="c4-k"><div class="c4-fn">${k[0].toLocaleString('ko-KR')}<small>${k[1]}</small></div><p>${E(k[2])}</p></div>`).join('')}</div></div>`); };
  /* 인용 후기(실제만) */
  SEC['c4-quote'] = (x, s) => { const r = review(); if (!r) return empty(x, '실제 수강 후기(15자 이상 · 별 4개 이상)가 생기면 여기에 크게 보여요.');
    return sec(x, s, 'quote', `<div class="c4w"><blockquote>“${E(r.body.slice(0, 120))}”</blockquote><p class="c4-who"><i aria-hidden="true">${E((r.cls || org()).slice(0, 1))}</i><span><b>수강생</b>${r.cls ? ` · ${E(r.cls)}` : ''}</span></p></div>`); };
  /* 사진 띠 + 한 문장 */
  SEC['c4-band'] = (x, s) => { const d = x.data || {}; const p = slotP(s, 'space', null, DEF[thOf(s)].ph.space || DEF[thOf(s)].ph.about);
    return sec(x, s, 'band', `${img(p, 'c4-bg')}<div class="c4-in"><div class="c4w"><h2>${NL(d.title)}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div></div>`); };
  /* 한 줄 바로 가기 4칸 */
  SEC['c4-quick'] = (x, s) => { const d = x.data || {}; const Q = (d.cols || []).slice(0, 4); const LK = ['#my', '#courses', '#cert', '#notice'];
    return sec(x, s, 'quick', `<div class="c4w c4-qg">${Q.map((q, i) => `<a href="${q[2] && /^#[a-z]/.test(q[2]) ? q[2] : LK[i]}"><div>${E(q[0])}<span>${E(q[1] || '')}</span></div>${ic('chev', 22, 2)}</a>`).join('')}</div>`); };
  /* 공지 + 문의 */
  SEC['c4-help'] = (x, s) => { const d = x.data || {}; const N = notes(4); const tel = telOf();
    return sec(x, s, 'help', `<div class="c4w c4-hg"><div><h2 class="c4-h2">${E(d.title || '공지')}</h2>${N.length ? `<ul class="c4-nt">${N.map(n => `<li><a href="#notice">${E(n.title)}</a><time>${E(String(n.at || '').slice(0, 10).replace(/-/g, '.'))}</time></li>`).join('')}</ul>` : `<p class="c4-none">새 공지가 올라오면 여기에 차례로 보여요. <a href="#notice">공지 보기</a></p>`}</div>
<div class="c4-call"><h3>${E(d.sub || '교육 담당자에게 물어보세요')}</h3>${tel ? `<a class="c4-tel" href="tel:${E(tel)}">${E(tel)}</a><p>평일 09:00 – 18:00</p>` : '<p>배정 · 마감 연장 · 이수 기록은 담당자가 확인해 드려요.</p>'}<a class="c4-b line" href="#comm">온라인 문의 남기기</a></div></div>`); };
  /* 마지막 두 갈래 */
  SEC['c4-duo'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).slice(0, 2); const LK = [href(d.link, '#my'), href(d.link2, '#courses')]; const EY = [d.k1 || '임직원이라면', d.k2 || '처음이라면']; const BT = [d.b1 || '내 교육으로', d.b2 || '과정 둘러보기'];
    return sec(x, s, 'duo', `<div class="c4w c4-dg">${C.map((c, i) => `<a class="c4-pn p${i}" href="${E(LK[i])}"><div><p class="c4-k2">${E(EY[i])}</p><h3>${T2(c[0], 'b')}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div><span class="c4-pb">${E(BT[i])}${ic('arrow', 20, 1.8)}</span></a>`).join('')}</div>`); };

  /* B(기업) · 계열사 · 고객 로고 띠: 운영자가 이름(cols [[이름]])을 넣을 때만 */
  SEC['c4-logos'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).map(c => String((c && c[0]) || '').trim()).filter(Boolean).slice(0, 8); if (!C.length) return empty(x, '계열사 · 고객사 이름을 넣으면 로고 띠가 보여요.');
    return sec(x, s, 'logos', `<div class="c4w"><p class="c4-lgt">${E(d.title || '함께 배우는 계열사')}</p><ul class="c4-lg n${C.length}">${C.map(n => `<li>${E(n)}</li>`).join('')}</ul></div>`); };
  /* B(기업) · 법정교육 마감 D-day + 이수 현황 미리보기(로그인 뒤 화면을 실제 과정 · 마감일로, 개인 진도는 로그인 뒤) */
  SEC['c4-dday'] = (x, s) => { const d = x.data || {}; const t = tday(); const L = legal().filter(c => okD(c.end) && days(t, c.end) >= 0).slice(0, 4); if (!L.length) return empty(x, '마감일이 있는 법정 · 필수 교육이 생기면 D-day가 보여요.');
    const r = rateOf(legal()); const dd = c => days(t, c.end);
    return sec(x, s, 'dday', `<div class="c4w c4-dg2"><div>${ey(d)}<h2 class="c4-h2">${T2(d.title || '필수 교육 마감,\n놓치지 않게 알려드려요.', 'span')}</h2><p class="c4-sd">${E(d.sub || '마감 2주 전 · 3일 전에 알림을 보내요. 로그인하면 내 진도와 남은 과목이 이렇게 보여요.')}</p><div class="c4-cta"><a class="c4-b pri" href="#my">내 필수 교육 확인${ic('arrow', 20, 2)}</a></div></div>
<div class="c4-mock" aria-label="로그인 뒤 화면 미리보기"><p class="c4-mh"><b>내 필수 교육</b><span>${r != null && r >= 60 ? `전사 이수율 ${r}%` : '로그인하면 내 진도가 보여요'}</span></p><ul>${L.map(c => `<li><a href="${cH(c)}"><span class="c4-dn${dd(c) <= 14 ? ' w' : ''}">${dd(c) === 0 ? 'D-DAY' : 'D-' + dd(c)}</span><span class="c4-mn"><b>${E(short(c.name))}</b><small>${E(md(c.end))} 마감${hrs(c) ? ' · ' + E(hrs(c)) : ''}</small><i class="c4-bar" aria-hidden="true"><i></i></i></span></a></li>`).join('')}</ul></div></div>`); };

  /* ── CSS: 공통(변수) + 첫 화면 10종 + 테마별 보정 ── */
  function css(s) { const th = thOf(s); const D = DEF[th]; const T = HPT.tokens(s) || {}; const a = (T.a && /^#[0-9a-f]{6}$/i.test(T.a)) ? T.a : D.acc;
    const dark = !!D.dark; const on = onC(a); const at = fit(a, D.bg, 4.6, dark ? '#ffffff' : '#000000'); const mu = fit(D.mu, D.alt, 4.6, dark ? '#ffffff' : '#000000'); const ptT = fit(D.pt, D.bg, 4.6, dark ? '#ffffff' : '#000000');
    const ln = dark ? 'rgba(255,255,255,.14)' : al(D.ink, .14); const dkOn = onC(D.dk); const ptOnDk = fit(D.pt, D.dk, 4.6, '#ffffff');
    let x = `/* hp44-corp ${th} */
.c4{--a:${a};--on:${on};--at:${at};--bg:${D.bg};--alt:${D.alt};--ink:${D.ink};--mu:${mu};--pt:${D.pt};--ptt:${ptT};--ln:${ln};--dk:${D.dk};--dkon:${dkOn};--ptdk:${ptOnDk};--r:${D.r}px;--br:${D.br}px;--hf:${D.hf};--hw:${D.hw};--nw:${D.nw};
font-family:${SANS};color:var(--ink);background:var(--bg);font-size:17px;line-height:1.65;letter-spacing:-.01em;word-break:keep-all;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;padding:150px 0;position:relative}
.c4 *{box-sizing:border-box}.c4 :is(h1,h2,h3,p,ol,ul,figure,blockquote){margin:0;padding:0}.c4 :is(ol,ul){list-style:none}.c4 a{color:inherit;text-decoration:none}.c4 svg{flex:none}
.c4 .c4w{max-width:1200px;margin:0 auto;padding:0 40px;position:relative}
.c4 figure{overflow:hidden;background:${mix(D.bg, dark ? '#ffffff' : '#000000', .06)}}.c4 figure img{width:100%;height:100%;object-fit:cover;display:block}
.c4 :is(h1,.c4-h2,h3,blockquote){font-family:var(--hf)}
.c4 .c4-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 28px;font-weight:700;font-size:17px;white-space:nowrap;border-radius:var(--br);transition:transform .2s}.c4 .c4-b:hover{transform:translateY(-1px)}
.c4 .c4-b.pri{background:var(--a);color:var(--on)}.c4 .c4-b.line{box-shadow:inset 0 0 0 1.5px currentColor;color:var(--ink)}.c4 .c4-b.gh{color:var(--at);padding:0 8px}.c4 .c4-b.wh{color:#fff;box-shadow:inset 0 0 0 2px #fff}
.c4 .c4-cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:44px}
.c4 .c4-ey{font-size:15px;font-weight:700;color:var(--at);margin-bottom:18px}
.c4 .c4-h2{font-size:52px;line-height:1.18;font-weight:var(--hw);letter-spacing:-.04em}.c4 .c4-h2 :is(span,b){font-weight:inherit}.c4 .c4-h2 span{color:${dark ? D.mu : mix(D.ink, D.bg, .45)}}
.c4 .c4-sd{font-size:18px;color:var(--mu);margin-top:20px;max-width:580px}
.c4 .c4-lead{font-size:20px;color:var(--mu);margin-top:28px;max-width:560px;line-height:1.7}
.c4 .c4-note{margin-top:22px;font-size:15px;color:var(--mu)}.c4 .c4-note a{color:var(--at);font-weight:700;text-decoration:underline;text-underline-offset:3px}
.c4 .c4-more{display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--at);white-space:nowrap}
.c4 .c4-head{display:flex;justify-content:space-between;align-items:end;gap:40px;margin-bottom:64px}
.c4-emp{padding:32px 0!important}.c4-emp p{font-size:14px;color:#6B7280}
/* 로고 띠 */
.c4.c4-logos{padding:56px 0;border-block:1px solid var(--ln)}.c4 .c4-lgt{text-align:center;font-size:14px;font-weight:700;color:var(--mu);letter-spacing:.04em}.c4 .c4-lg{margin-top:22px;display:flex;flex-wrap:wrap;justify-content:center;gap:16px 56px}.c4 .c4-lg li{font-size:22px;font-weight:800;letter-spacing:-.03em;color:var(--ink);opacity:.55;white-space:nowrap}
/* 마감 D-day · 이수 현황 미리보기 */
.c4.c4-dday{background:var(--alt)}.c4 .c4-dg2{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.c4 .c4-mock{background:var(--bg);border-radius:${Math.min(D.r, 20)}px;padding:28px;box-shadow:0 30px 60px -36px ${al(D.ink, .35)},0 0 0 1px var(--ln)}.c4 .c4-mh{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding-bottom:14px;border-bottom:1px solid var(--ln)}.c4 .c4-mh b{font-size:19px;font-weight:800}.c4 .c4-mh span{font-size:14px;color:var(--mu)}
.c4 .c4-mock li a{display:grid;grid-template-columns:72px 1fr;gap:16px;align-items:center;padding:16px 0;border-bottom:1px solid var(--ln)}.c4 .c4-mock li:last-child a{border-bottom:0}
.c4 .c4-dn{display:inline-grid;place-items:center;height:36px;border-radius:999px;font-size:14px;font-weight:800;background:${mix(a, D.bg, .88)};color:var(--at);font-variant-numeric:tabular-nums}.c4 .c4-dn.w{background:${al("#E8553D", .14)};color:${fit("#E8553D", D.bg, 4.6)}}
.c4 .c4-mn b{display:block;font-size:17px;font-weight:700;letter-spacing:-.02em}.c4 .c4-mn small{display:block;font-size:14px;color:var(--mu);margin-top:2px}.c4 .c4-bar{display:block;height:6px;border-radius:999px;background:var(--ln);margin-top:10px;overflow:hidden}.c4 .c4-bar i{display:block;width:0;height:100%;background:var(--a)}
/* 큰 숫자 */
.c4.c4-stat{background:var(--dk);color:var(--dkon)}.c4 .c4-sg{display:grid;grid-template-columns:1.2fr 1fr;gap:80px;align-items:end}
.c4 .c4-num{font-size:220px;line-height:.85;font-weight:var(--nw);letter-spacing:-.06em;font-variant-numeric:tabular-nums}.c4 .c4-num small{font-size:88px;color:var(--ptdk)}
.c4 .c4-t{font-size:28px;line-height:1.45;font-weight:700;letter-spacing:-.03em}.c4 .c4-d{margin-top:16px;opacity:.75}
.c4 .c4-line{margin-top:72px;padding-top:28px;border-top:1px solid rgba(255,255,255,.16);display:flex;justify-content:space-between;gap:20px;font-size:15px;opacity:.9}.c4 .c4-line a{font-weight:700;display:inline-flex;gap:6px;align-items:center}
/* 카드 */
.c4 .c4-cg{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.c4 .c4-card{border-radius:var(--r);overflow:hidden;background:var(--alt);display:flex;flex-direction:column;box-shadow:0 0 0 1px var(--ln);transition:transform .3s}.c4 .c4-card:hover{transform:translateY(-4px)}
.c4 .c4-card figure{aspect-ratio:4/3}.c4 .c4-card figure img{transition:transform .5s}.c4 .c4-card:hover figure img{transform:scale(1.04)}.c4 .c4-bd{padding:30px 30px 32px;display:flex;flex-direction:column;flex:1}
.c4 .c4-tg{font-size:14px;font-weight:700;color:var(--at)}.c4 .c4-card h3{font-size:25px;line-height:1.32;font-weight:800;letter-spacing:-.035em;margin-top:8px;font-family:${SANS}}.c4 .c4-card p:not(.c4-tg){font-size:16px;color:var(--mu);margin-top:10px}
.c4 .c4-m{margin-top:auto;padding-top:24px;font-size:14px;color:var(--mu);display:flex;justify-content:space-between;gap:12px}.c4 .c4-m b{color:var(--ink)}
/* 2열 이야기 */
.c4.c4-story{background:var(--alt)}.c4 .c4-sg2{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}.c4 .c4-sg2>figure{border-radius:var(--r);aspect-ratio:4/4.5}
.c4 .c4-steps{margin-top:44px}.c4 .c4-steps li{display:grid;grid-template-columns:56px 1fr;padding:24px 0;border-top:1px solid var(--ln)}.c4 .c4-steps li:last-child{border-bottom:1px solid var(--ln)}
.c4 .c4-steps .c4-n{font-size:15px;font-weight:700;color:var(--at);font-variant-numeric:tabular-nums;padding-top:3px}.c4 .c4-steps h3{font-size:20px;font-weight:700;letter-spacing:-.025em;font-family:${SANS}}.c4 .c4-steps p{font-size:16px;color:var(--mu);margin-top:4px}
/* 가로 단계 */
.c4 .c4-fl{margin-top:64px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:2px solid var(--ink)}.c4 .c4-fl.n3{grid-template-columns:repeat(3,1fr)}.c4 .c4-fl.n2{grid-template-columns:1fr 1fr}
.c4 .c4-fl li{padding:32px 32px 0 0}.c4 .c4-fl li+li{padding-left:32px;border-left:1px solid var(--ln)}
.c4 .c4-fk{display:block;font-size:44px;line-height:1;font-weight:var(--nw);color:var(--ptt);letter-spacing:-.04em;font-variant-numeric:tabular-nums}.c4 .c4-fl h3{font-size:22px;font-weight:800;letter-spacing:-.03em;margin-top:22px;font-family:${SANS}}.c4 .c4-fl p{font-size:16px;color:var(--mu);margin-top:8px}
.c4.c4-flow.inv{background:var(--dk);color:var(--dkon)}.c4.c4-flow.inv :is(.c4-sd,.c4-fl p){color:inherit;opacity:.75}.c4.c4-flow.inv .c4-ey{color:var(--ptdk)}.c4.c4-flow.inv .c4-fk{color:var(--ptdk)}.c4.c4-flow.inv .c4-fl{border-color:currentColor}.c4.c4-flow.inv .c4-fl li+li{border-color:rgba(255,255,255,.18)}.c4.c4-flow.inv .c4-h2 span{color:inherit;opacity:.6}
/* 계층 */
.c4.c4-levels{background:var(--alt)}.c4 .c4-lt{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:end;margin-bottom:64px}.c4 .c4-lt>p{font-size:18px;color:var(--mu)}
.c4 .c4-lv{display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid var(--a)}.c4 .c4-lv.n3{grid-template-columns:repeat(3,1fr)}
.c4 .c4-lv a{display:flex;flex-direction:column;padding:40px 32px 40px;border-right:1px solid var(--ln);min-height:320px;transition:background .3s;position:relative}.c4 .c4-lv a:before{content:"";position:absolute;top:-9px;left:32px;width:16px;height:16px;border-radius:50%;background:var(--a);box-shadow:0 0 0 5px var(--alt)}.c4 .c4-lv a:not(:last-child):after{content:"";position:absolute;top:-8px;right:-8px;width:12px;height:12px;border-top:2px solid var(--a);border-right:2px solid var(--a);transform:rotate(45deg);background:var(--alt);z-index:1}.c4 .c4-lv a:last-child{border-right:0}.c4 .c4-lv a:hover{background:var(--bg)}
.c4 .c4-r{font-size:56px;font-weight:var(--nw);color:var(--ptt);line-height:1;letter-spacing:-.04em;font-family:var(--hf)}.c4 .c4-lv h3{font-size:24px;font-weight:700;letter-spacing:-.03em;margin-top:28px}.c4 .c4-lv p{font-size:15px;color:var(--mu);margin-top:10px;flex:1}
.c4 .c4-lc{font-size:15px;font-weight:600;color:var(--at);display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--ln);padding-top:18px;margin-top:24px}
/* 가치 */
.c4 .c4-vg{margin-top:72px;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink)}.c4 .c4-vg>div{padding:36px 40px 0 0}.c4 .c4-vg>div+div{padding-left:40px;border-left:1px solid var(--ln)}
.c4 .c4-no{font-size:14px;color:var(--ptt);font-weight:700;letter-spacing:.1em}.c4 .c4-vg h3{font-size:28px;font-weight:700;letter-spacing:-.03em;margin-top:12px}.c4 .c4-vg p:not(.c4-no){font-size:16px;color:var(--mu);margin-top:10px}
/* 대표 프로그램 */
.c4 .c4-pg{display:grid;grid-template-columns:1.25fr 1fr;gap:32px}.c4 .c4-pg.n1{grid-template-columns:1fr}.c4 .c4-pc figure{aspect-ratio:16/10;border-radius:var(--r)}.c4 .c4-pc.s figure{aspect-ratio:4/3.06}
.c4 .c4-pc .c4-m{display:flex;gap:14px;justify-content:flex-start;font-size:14px;color:var(--ptt);font-weight:700;letter-spacing:.04em;padding-top:24px}.c4 .c4-pc h3{font-size:30px;font-weight:var(--hw);letter-spacing:-.035em;margin-top:10px;line-height:1.35}.c4 .c4-pc p:not(.c4-m){font-size:16px;color:var(--mu);margin-top:10px}
/* 날짜 목록 */
.c4 .c4-ls{margin-top:48px;border-top:2px solid var(--ink)}.c4 .c4-rw{display:grid;grid-template-columns:140px 1fr 180px 110px;gap:32px;align-items:center;padding:30px 0;border-bottom:1px solid var(--ln)}
.c4 .c4-dt b{display:block;font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums}.c4 .c4-dt small{font-size:14px;color:var(--mu)}
.c4 .c4-rw h3{font-size:22px;font-weight:700;letter-spacing:-.03em;line-height:1.35;font-family:${SANS}}.c4 .c4-rw p{font-size:15px;color:var(--mu);margin-top:6px}.c4 .c4-mt{font-size:15px;color:var(--mu)}
.c4 .c4-tag{justify-self:end;font-size:14px;font-weight:800;padding:6px 12px;border-radius:4px;background:${mix(a, D.bg, .88)};color:var(--at);white-space:nowrap}.c4 .c4-tag.n{background:${al(D.pt, .18)};color:var(--ptt)}
.c4.c4-rows .c4-more{margin-top:32px}
/* 숫자 띠 */
.c4.c4-figs{background:var(--dk);color:var(--dkon);padding:130px 0}.c4 .c4-fg{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;gap:48px;align-items:end}.c4 .c4-fg.n2{grid-template-columns:1.2fr 1fr 1fr}.c4 .c4-fg.n1{grid-template-columns:1.2fr 1fr}.c4.c4-figs .c4-h2{font-size:40px}.c4.c4-figs .c4-h2 :is(span,b){color:inherit}
.c4 .c4-k{border-top:1px solid rgba(255,255,255,.25);padding-top:24px}.c4 .c4-fn{font-size:72px;font-weight:var(--nw);letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}.c4 .c4-fn small{font-size:22px;color:var(--ptdk);font-weight:600;margin-left:6px}.c4 .c4-k p{margin-top:12px;opacity:.78;font-size:15px}
/* 인용 */
.c4.c4-quote{text-align:center}.c4 blockquote{font-size:42px;line-height:1.42;font-weight:var(--hw);letter-spacing:-.035em;max-width:980px;margin:0 auto}
.c4 .c4-who{margin-top:40px;display:inline-flex;align-items:center;gap:14px;font-size:16px;color:var(--mu)}.c4 .c4-who i{width:44px;height:44px;border-radius:50%;background:var(--a);color:var(--on);font-style:normal;display:grid;place-items:center;font-weight:700}.c4 .c4-who b{color:var(--ink)}
/* 사진 띠 */
.c4.c4-band{height:600px;padding:0;overflow:hidden;background:#111}.c4.c4-band .c4-bg{position:absolute;inset:0;height:100%}.c4.c4-band:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.45) 45%,rgba(0,0,0,.05) 80%)}
.c4.c4-band .c4-in{position:absolute;inset:0;z-index:2;display:flex;align-items:center;color:#fff}.c4.c4-band .c4w{width:100%}.c4.c4-band h2{font-family:var(--hf);font-size:60px;line-height:1.16;font-weight:var(--hw);letter-spacing:-.05em;max-width:720px}.c4.c4-band p{margin-top:20px;font-size:18px;max-width:520px;opacity:.88}
/* 바로 가기 */
.c4.c4-quick{background:var(--dk);color:var(--dkon);padding:0}.c4 .c4-qg{display:grid;grid-template-columns:repeat(4,1fr)}.c4 .c4-qg a{display:flex;justify-content:space-between;align-items:center;padding:30px 28px;border-left:1px solid rgba(255,255,255,.14);font-size:20px;font-weight:700}.c4 .c4-qg a:first-child{border-left:0;padding-left:0}.c4 .c4-qg span{display:block;font-size:14px;opacity:.68;font-weight:500;margin-top:2px}
/* 공지 + 문의 */
.c4.c4-help{background:var(--alt);padding:120px 0}.c4 .c4-hg{display:grid;grid-template-columns:1.2fr 1fr;gap:72px}.c4 .c4-nt{margin-top:28px}.c4 .c4-nt li{display:flex;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid var(--ln);font-size:17px}.c4 .c4-nt li:first-child{border-top:2px solid var(--ink)}.c4 .c4-nt a{font-weight:600}.c4 .c4-nt time{color:var(--mu);font-size:15px;white-space:nowrap}
.c4 .c4-none{margin-top:28px;padding:28px 0;border-top:2px solid var(--ink);color:var(--mu)}.c4 .c4-none a{color:var(--at);font-weight:700;text-decoration:underline}
.c4 .c4-call{background:var(--bg);padding:44px;border-top:6px solid var(--a);border-radius:${Math.min(D.r, 12)}px}.c4 .c4-call h3{font-size:26px;font-weight:800;letter-spacing:-.03em;font-family:${SANS}}.c4 .c4-tel{display:block;font-size:40px;font-weight:800;letter-spacing:-.03em;color:var(--at);margin-top:18px}.c4 .c4-call p{color:var(--mu);font-size:16px;margin-top:8px}.c4 .c4-call .c4-b{margin-top:28px}
/* 두 갈래 */
.c4.c4-duo{padding-top:0}[data-hx]+.c4.c4-duo{padding-top:120px}.c4:is(.c4-figs,.c4-stat,.c4-band,.c4-quick,.c4-story,.c4-levels,.c4-help,.c4-flow.inv)+.c4.c4-duo{padding-top:150px}.c4 .c4-dg{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.c4 .c4-pn{border-radius:var(--r);padding:52px;min-height:360px;display:flex;flex-direction:column;justify-content:space-between;background:var(--alt);box-shadow:0 0 0 1px var(--ln)}.c4 .c4-pn.p0{background:var(--a);color:var(--on);box-shadow:none}
.c4 .c4-k2{font-size:15px;font-weight:700;color:var(--at)}.c4 .c4-pn.p0 .c4-k2{color:inherit;opacity:.85}.c4 .c4-pn h3{font-size:40px;line-height:1.22;font-weight:var(--hw);letter-spacing:-.04em;margin-top:14px}.c4 .c4-pn h3 b{font-weight:inherit}.c4 .c4-pn p{font-size:17px;margin-top:16px;opacity:.86;max-width:420px}
.c4 .c4-pb{margin-top:36px;align-self:flex-start;display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 24px;border-radius:var(--br);font-weight:700;background:var(--ink);color:var(--bg)}.c4 .c4-pn.p0 .c4-pb{background:var(--on);color:var(--a)}
@media (max-width:720px){.c4{padding:88px 0;font-size:16px}.c4 .c4w{padding:0 20px}.c4 .c4-h2{font-size:32px;line-height:1.24}.c4 .c4-sd{font-size:16px}.c4 .c4-lead{font-size:17px;margin-top:20px}
.c4 .c4-cta{flex-direction:column;margin-top:32px;gap:10px}.c4 .c4-cta .c4-b{width:100%}.c4 a{min-height:44px}.c4 p a{display:inline-flex;align-items:center}.c4 .c4-head{flex-direction:column;align-items:flex-start;margin-bottom:32px;gap:12px}
.c4 .c4-sg{grid-template-columns:1fr;gap:28px}.c4 .c4-num{font-size:120px}.c4 .c4-num small{font-size:52px}.c4 .c4-t{font-size:22px}.c4 .c4-line{flex-direction:column;margin-top:44px}
.c4 .c4-cg{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin:0 -20px;padding:0 20px 4px}.c4 .c4-card{flex:0 0 78%;scroll-snap-align:start}.c4 .c4-bd{padding:24px}.c4 .c4-card h3{font-size:22px}
.c4 .c4-sg2{grid-template-columns:1fr;gap:40px}.c4 .c4-sg2>figure{aspect-ratio:4/3}
.c4 .c4-fl,.c4 .c4-fl.n3,.c4 .c4-fl.n2{grid-template-columns:1fr;margin-top:36px}.c4 .c4-fl li,.c4 .c4-fl li+li{padding:24px 0;border-left:0;border-bottom:1px solid var(--ln)}.c4 .c4-fk{font-size:34px}.c4 .c4-fl h3{font-size:20px;margin-top:12px}
.c4 .c4-lt{grid-template-columns:1fr;gap:16px;margin-bottom:36px}.c4 .c4-lt>p{font-size:16px}.c4 .c4-lv,.c4 .c4-lv.n3{grid-template-columns:1fr 1fr}.c4 .c4-lv a{min-height:0;padding:24px 14px 24px 0;border-right:0;border-bottom:1px solid var(--ln)}.c4 .c4-lv a:nth-child(even){padding-left:14px;border-left:1px solid var(--ln)}.c4 .c4-lv a:before{left:0;top:-8px;width:12px;height:12px}.c4 .c4-lv a:nth-child(even):before{left:14px}.c4 .c4-lv a:after{display:none}.c4 .c4-dg2{grid-template-columns:1fr;gap:36px}.c4 .c4-mock{padding:20px 18px}.c4 .c4-mock li a{grid-template-columns:60px 1fr;gap:12px}.c4.c4-logos{padding:40px 0}.c4 .c4-lg{gap:10px 28px}.c4 .c4-lg li{font-size:18px}.c4 .c4-r{font-size:38px}.c4 .c4-lv h3{font-size:19px;margin-top:14px}.c4 .c4-lv p{font-size:14px}.c4 .c4-lc{font-size:14px}
.c4 .c4-vg{grid-template-columns:1fr;margin-top:40px}.c4 .c4-vg>div,.c4 .c4-vg>div+div{padding:24px 0;border-left:0;border-bottom:1px solid var(--ln)}.c4 .c4-vg h3{font-size:22px}
.c4 .c4-pg{grid-template-columns:1fr;gap:44px}.c4 .c4-pc h3{font-size:23px}
.c4 .c4-ls{margin-top:28px}.c4 .c4-rw{grid-template-columns:72px 1fr;gap:6px 16px;padding:22px 0;align-items:start}.c4 .c4-dt b{font-size:22px}.c4 .c4-dt small{font-size:13px}.c4 .c4-rw h3{font-size:18px}.c4 .c4-rw p,.c4 .c4-mt{font-size:14px}.c4 .c4-mt{grid-column:2}.c4 .c4-tag{grid-column:2;justify-self:start;font-size:13px;margin-top:6px}
.c4.c4-figs{padding:80px 0}.c4 .c4-fg,.c4 .c4-fg.n2,.c4 .c4-fg.n1{grid-template-columns:1fr;gap:28px}.c4.c4-figs .c4-h2{font-size:28px}.c4 .c4-fn{font-size:56px}
.c4 blockquote{font-size:26px;text-align:left}.c4.c4-quote{text-align:left}
.c4.c4-band{height:520px}.c4.c4-band:after{background:linear-gradient(0deg,rgba(0,0,0,.8),rgba(0,0,0,.1) 80%)}.c4.c4-band .c4-in{align-items:flex-end;padding-bottom:48px}.c4.c4-band h2{font-size:34px}.c4.c4-band p{font-size:16px}
.c4.c4-quick .c4-qg{grid-template-columns:1fr 1fr;padding:0}.c4 .c4-qg a{padding:20px;border-left:0;border-top:1px solid rgba(255,255,255,.14);font-size:17px}.c4 .c4-qg a:first-child{padding-left:20px}.c4 .c4-qg a:nth-child(odd){border-right:1px solid rgba(255,255,255,.14)}.c4 .c4-qg a:nth-child(-n+2){border-top:0}.c4 .c4-qg svg{display:none}
.c4.c4-help{padding:72px 0}.c4 .c4-hg{grid-template-columns:1fr;gap:40px}.c4 .c4-nt li{font-size:15px;flex-direction:column;gap:4px}.c4 .c4-call{padding:28px 24px}.c4 .c4-tel{font-size:32px}.c4 .c4-call .c4-b{width:100%}
.c4 .c4-dg{grid-template-columns:1fr;gap:14px}.c4:is(.c4-figs,.c4-stat,.c4-band,.c4-quick,.c4-story,.c4-levels,.c4-help,.c4-flow.inv)+.c4.c4-duo{padding-top:88px}.c4 .c4-pn{padding:32px 26px;min-height:0}.c4 .c4-pn h3{font-size:28px}.c4 .c4-pb{width:100%;justify-content:center;margin-top:28px}}
`;
    /* 머리 · 바닥 줄 */
    x += `.gh.hps-h{background:${dark ? D.bg : D.bg}!important;border-bottom:1px solid ${ln}!important;box-shadow:none!important}.gh.hps-h .hps-hw{border-radius:0!important;border:0!important;box-shadow:none!important;background:transparent!important}${dark ? `.gh.hps-h :is(a,b,span,label,svg){color:${D.ink}!important}` : ''}.gh .hps-cta{background:${a}!important;color:${on}!important;border-radius:${D.br}px!important}.gh .hps-cta *{color:${on}!important}
.gf.hps-f{background:${D.dk === D.bg ? mix(D.dk, '#000000', .3) : D.dk}!important}.gf.hps-f :is(p,a,span,li,em,small,dt,dd){color:${al(dkOn, .72)}!important}.gf.hps-f :is(strong,b,.hps-fn,.hps-fl){color:${dkOn}!important}
`;
    x += HCSS[D.k](D, a, on, at);
    return x; }

  /* 첫 화면 CSS(종류별) */
  const HCSS = {
    keynote: (D) => `.c4-k-keynote{padding:120px 0 0;text-align:center;background:var(--bg)}.c4-k-keynote .c4-ey{font-size:17px;margin-bottom:22px}
.c4-k-keynote h1{font-size:88px;line-height:1.06;font-weight:800;letter-spacing:-.045em}.c4-k-keynote h1 span{color:#9AA0AC}.c4-k-keynote .c4-lead{margin:30px auto 0;max-width:640px}.c4-k-keynote .c4-cta{justify-content:center;margin-top:40px}
.c4-k-keynote .c4-big{max-width:1360px;margin:88px auto 0;padding:0 40px;position:relative;z-index:2}.c4-k-keynote .c4-big figure{border-radius:32px;aspect-ratio:2.25/1}
.c4-k-keynote+.c4.c4-stat{margin-top:-260px;padding-top:410px;z-index:1}.c4-k-keynote+.c4:not(.c4-stat){padding-top:150px}
@media (max-width:720px){.c4-k-keynote{padding:64px 0 0;text-align:left}.c4-k-keynote .c4-ey{font-size:15px}.c4-k-keynote h1{font-size:42px;line-height:1.14}.c4-k-keynote .c4-lead{margin:20px 0 0}.c4-k-keynote .c4-big{margin:48px auto 0;padding:0 20px}.c4-k-keynote .c4-big figure{aspect-ratio:4/5;border-radius:24px}.c4-k-keynote+.c4.c4-stat{margin-top:-180px;padding-top:268px}.c4-k-keynote+.c4:not(.c4-stat){padding-top:88px}}`,
    list: (D) => `.c4-k-list{padding:120px 0 140px}.c4-k-list .c4-g{display:grid;grid-template-columns:1.05fr 1fr;gap:88px;align-items:center}.c4-k-list .c4-g.one{grid-template-columns:1fr}
.c4-k-list h1{font-size:80px;line-height:1.12;font-weight:800;letter-spacing:-.05em}.c4-k-list h1 em{font-style:normal;color:var(--at)}
.c4-k-list .c4-list{border-left:6px solid var(--pt);padding:4px 0 4px 44px}.c4-k-list .c4-lh{font-size:15px;font-weight:800;color:var(--ptt);letter-spacing:.02em;margin-bottom:10px}
.c4-k-list li a{display:grid;grid-template-columns:64px 1fr auto;gap:8px;align-items:center;padding:18px 0;transition:color .2s}.c4-k-list li a:hover{color:var(--at)}.c4-k-list .c4-n{font-size:20px;font-weight:300;color:var(--mu);font-variant-numeric:tabular-nums}.c4-k-list li b{font-size:34px;font-weight:800;letter-spacing:-.045em;line-height:1.2}.c4-k-list li svg{color:var(--at);opacity:.6}
@media (max-width:720px){.c4-k-list{padding:56px 0 72px}.c4-k-list .c4-g{grid-template-columns:1fr;gap:44px}.c4-k-list h1{font-size:42px;line-height:1.2}.c4-k-list .c4-list{padding:0 0 0 20px;border-left-width:4px}.c4-k-list li a{grid-template-columns:36px 1fr auto;padding:10px 0}.c4-k-list .c4-n{font-size:15px}.c4-k-list li b{font-size:21px}}`,
    collage: (D) => `.c4-k-collage{padding:110px 0 130px;overflow:hidden}.c4-k-collage .c4-g{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.c4-k-collage h1{font-size:96px;line-height:1.04;font-weight:800;letter-spacing:-.055em}.c4-k-collage h1 em{font-style:normal;color:var(--a)}
.c4-k-collage .c4-col{position:relative;height:620px}.c4-k-collage figure{position:absolute;border-radius:var(--r);box-shadow:0 30px 60px -30px ${al(D.ink, .4)}}
.c4-k-collage .c4-p1{left:12%;top:0;width:70%;height:72%}.c4-k-collage .c4-p2{left:0;bottom:0;width:46%;height:40%}.c4-k-collage .c4-p3{right:0;bottom:6%;width:40%;height:38%;border-radius:50%}
.c4-k-collage .c4-dot{position:absolute;right:6%;top:4%;width:88px;height:88px;border-radius:50%;background:var(--pt);opacity:.9}
@media (max-width:720px){.c4-k-collage{padding:52px 0 72px}.c4-k-collage .c4-g{grid-template-columns:1fr;gap:44px}.c4-k-collage h1{font-size:44px;line-height:1.12}.c4-k-collage .c4-col{height:420px}.c4-k-collage .c4-dot{width:56px;height:56px}}`,
    cinema: (D) => `.c4-k-cinema{min-height:860px;padding:0;overflow:hidden;color:#fff;background:#000;display:flex;align-items:flex-end}.c4-k-cinema .c4-bg{position:absolute;inset:0;height:100%}.c4-k-cinema .c4-bg img{opacity:.92}
.c4-k-cinema:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.5) 0%,rgba(0,0,0,.15) 35%,rgba(0,0,0,.65) 70%,rgba(0,0,0,.9) 100%)}
.c4-k-cinema .c4-in{position:relative;z-index:2;width:100%;padding:0 0 110px;text-align:center}.c4-k-cinema .c4-ey{color:var(--pt);letter-spacing:.24em;font-size:14px;display:inline-flex;gap:16px;align-items:center}.c4-k-cinema .c4-ey:before,.c4-k-cinema .c4-ey:after{content:"";width:48px;height:1px;background:var(--pt)}
.c4-k-cinema h1{font-size:92px;line-height:1.12;font-weight:600;letter-spacing:-.04em}.c4-k-cinema h1 em{font-style:normal;color:var(--pt)}.c4-k-cinema .c4-lead{color:rgba(255,255,255,.82);margin:28px auto 0}.c4-k-cinema .c4-cta{justify-content:center}.c4-k-cinema .c4-b.pri{background:var(--pt);color:#111}.c4-k-cinema .c4-b.line{color:#fff}
@media (max-width:720px){.c4-k-cinema{min-height:720px}.c4-k-cinema .c4-in{padding-bottom:48px;text-align:left}.c4-k-cinema .c4-ey:before{display:none}.c4-k-cinema h1{font-size:42px;line-height:1.22}.c4-k-cinema .c4-lead{margin:20px 0 0}}`,
    tech: (D) => `.c4-k-tech{padding:110px 0 130px;background-color:var(--bg);background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:80px 80px}
.c4-k-tech .c4-g{display:grid;grid-template-columns:1.1fr .9fr;gap:72px;align-items:center}.c4 .c4-mono{font-family:${MONO};font-size:14px;letter-spacing:.06em;color:var(--pt)}
.c4-k-tech h1{font-size:84px;line-height:1.08;font-weight:800;letter-spacing:-.05em;margin-top:24px}.c4-k-tech h1 em{font-style:normal;color:var(--pt)}.c4-k-tech .c4-b.pri{background:var(--pt);color:#06110C}
.c4-k-tech .c4-fr{border:1px solid ${al(D.pt, .5)};border-radius:18px;padding:12px;background:rgba(255,255,255,.02)}.c4-k-tech .c4-fr figure{border-radius:10px;aspect-ratio:4/4.4}.c4-k-tech .c4-cap{margin-top:14px;padding:4px 6px;font-size:14px}
@media (max-width:720px){.c4-k-tech{padding:52px 0 72px;background-size:48px 48px}.c4-k-tech .c4-g{grid-template-columns:1fr;gap:44px}.c4-k-tech h1{font-size:42px;line-height:1.16}.c4-k-tech .c4-fr figure{aspect-ratio:4/3.4}}`,
    poster: (D) => `.c4-k-poster{height:880px;padding:0;color:#fff;overflow:hidden;background:#111}.c4-k-poster .c4-bg{position:absolute;inset:0;height:100%}
.c4-k-poster:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.3) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,.25) 45%,rgba(10,10,10,.82) 80%,rgba(10,10,10,.9) 100%)}
.c4-k-poster .c4-in{position:absolute;left:0;right:0;bottom:84px;z-index:2}.c4-k-poster .c4-tag{display:inline-block;background:var(--pt);color:#111;font-weight:800;font-size:15px;padding:7px 12px;margin-bottom:28px}
.c4-k-poster h1{font-size:104px;line-height:1.0;font-weight:900;letter-spacing:-.06em}.c4-k-poster .c4-row{display:flex;justify-content:space-between;align-items:end;gap:40px;margin-top:40px}.c4-k-poster .c4-lead{color:#EDEDED;margin:0;max-width:460px}.c4-k-poster .c4-cta{margin:0}
.c4-k-poster .c4-b{height:64px;font-size:18px;font-weight:800}.c4-k-poster .c4-b.pri{background:var(--pt);color:#111}
@media (max-width:720px){.c4-k-poster{height:760px}.c4-k-poster .c4-in{bottom:28px}.c4-k-poster .c4-tag{font-size:13px;margin-bottom:18px}.c4-k-poster h1{font-size:44px;line-height:1.1}.c4-k-poster .c4-row{flex-direction:column;align-items:stretch;margin-top:18px;gap:22px}.c4-k-poster .c4-b{height:56px;font-size:17px;justify-content:space-between}}`,
    heritage: (D) => `.c4-k-heritage{display:grid;grid-template-columns:1fr 1fr;min-height:780px;padding:0;border-bottom:1px solid var(--ln)}.c4-k-heritage .c4-tx{display:flex;flex-direction:column;justify-content:center;padding:96px 72px 96px max(48px,calc((100vw - 1280px)/2 + 48px))}
.c4-k-heritage .c4-est{font-size:14px;letter-spacing:.2em;color:var(--ptt);font-weight:700;display:flex;gap:16px;align-items:center}.c4-k-heritage .c4-est:after{content:"";width:64px;height:1px;background:var(--pt)}
.c4-k-heritage h1{font-size:68px;line-height:1.24;font-weight:300;letter-spacing:-.05em;margin-top:36px}.c4-k-heritage h1 b{font-weight:700}.c4-k-heritage .c4-b{border-radius:0;height:60px;padding:0 32px;font-weight:600;gap:14px}.c4-k-heritage .c4-b.line{color:var(--at)}
.c4-k-heritage .c4-hf{position:relative;margin:0;min-height:100%}.c4-k-heritage .c4-hf img{position:absolute;inset:0}.c4-k-heritage figcaption{position:absolute;left:0;bottom:0;background:var(--a);color:var(--on);padding:28px 36px;font-size:15px;max-width:380px}
.${'cpheritage'} .c4-ey{font-size:13px;letter-spacing:.2em;color:var(--ptt)}.cpheritage .c4-h2{font-size:50px;line-height:1.3}.cpheritage .c4-h2 span{color:inherit}.cpheritage.c4-vals{text-align:center}.cpheritage.c4-vals .c4-vg{text-align:left}
@media (max-width:720px){.c4-k-heritage{grid-template-columns:1fr;min-height:0}.c4-k-heritage .c4-tx{padding:56px 20px 64px}.c4-k-heritage .c4-est{font-size:13px}.c4-k-heritage h1{font-size:40px;margin-top:24px;line-height:1.3}.c4-k-heritage .c4-b{height:56px;justify-content:space-between}
.c4-k-heritage .c4-hf{min-height:0;display:flex;flex-direction:column}.c4-k-heritage .c4-hf img{position:relative;aspect-ratio:4/4.2;height:auto}.c4-k-heritage figcaption{position:relative;max-width:none;padding:22px 20px}.cpheritage .c4-h2{font-size:30px}}`,
    sticker: (D) => `.c4-k-sticker{padding:110px 0 120px;overflow:hidden}.c4-k-sticker .c4-c{text-align:center;min-height:660px;display:flex;align-items:center;justify-content:center}.c4-k-sticker .c4-mid{position:relative;z-index:2;max-width:700px}
.c4-k-sticker h1{font-size:82px;line-height:1.08;font-weight:800;letter-spacing:-.055em}.c4-k-sticker h1 mark{background:linear-gradient(transparent 58%,var(--pt) 58%,var(--pt) 92%,transparent 92%);color:inherit;padding:0 .08em}.c4-k-sticker .c4-lead{margin:28px auto 0}.c4-k-sticker .c4-cta{justify-content:center}
.c4-k-sticker figure{position:absolute;border-radius:28px;border:8px solid #fff;box-shadow:0 24px 50px -24px ${al(D.ink, .45)}}.c4-k-sticker .c4-s1{left:0;top:20px;width:250px;height:300px;transform:rotate(-7deg)}.c4-k-sticker .c4-s2{right:10px;top:0;width:270px;height:220px;transform:rotate(6deg)}.c4-k-sticker .c4-s3{right:60px;bottom:0;width:220px;height:260px;transform:rotate(-4deg)}
.cpstartup .c4-vg>div{border:0!important;border-radius:var(--r);padding:36px!important;background:var(--alt)}.cpstartup .c4-vg{border:0;gap:20px}.cpstartup .c4-vg>.v1{background:var(--pt)}.cpstartup .c4-vg>.v1 :is(p,h3){color:#1B1530!important}.cpstartup .c4-vg>.v2{background:var(--a);color:var(--on)}.cpstartup .c4-vg>.v2 :is(p,h3){color:inherit!important}
@media (max-width:720px){.c4-k-sticker{padding:44px 0 72px}.c4-k-sticker .c4-c{min-height:0;flex-direction:column}.c4-k-sticker h1{font-size:42px}.c4-k-sticker .c4-mid{order:-1;text-align:left}.c4-k-sticker .c4-lead{margin:20px 0 0}
.c4-k-sticker figure{position:relative;border-width:6px;display:inline-block}.c4-k-sticker .c4-s1{left:auto;top:auto;width:46%;height:180px;margin-top:40px}.c4-k-sticker .c4-s2{right:auto;top:auto;width:46%;height:150px;margin:-60px 0 0 52%}.c4-k-sticker .c4-s3{display:none}.cpstartup .c4-vg{gap:12px}}`,
    side: (D) => `.c4-k-side{display:grid;grid-template-columns:1fr 1fr;min-height:760px;padding:0}.c4-k-side .c4-sp{position:relative;margin:0}.c4-k-side .c4-sp img{position:absolute;inset:0}
.c4-k-side .c4-tx{display:flex;flex-direction:column;justify-content:center;padding:96px max(48px,calc((100vw - 1280px)/2 + 48px)) 96px 88px}.c4-k-side h1{font-size:64px;line-height:1.14;font-weight:800;letter-spacing:-.05em}.c4-k-side h1 em{font-style:normal;color:var(--at)}
.c4-k-side .c4-ey{display:inline-flex;align-items:center;gap:10px}.c4-k-side .c4-ey:before{content:"";width:10px;height:10px;border-radius:50%;background:var(--a)}
@media (max-width:720px){.c4-k-side{grid-template-columns:1fr;min-height:0}.c4-k-side .c4-sp{aspect-ratio:16/10}.c4-k-side .c4-tx{padding:44px 20px 72px}.c4-k-side h1{font-size:40px;line-height:1.2}}`,
    chat: (D) => `.c4-k-chat{padding:110px 0 130px}.c4-k-chat .c4-g{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}.c4-k-chat h1{font-size:84px;line-height:1.08;font-weight:800;letter-spacing:-.05em}.c4-k-chat h1 em{font-style:normal;color:var(--at)}
.c4-k-chat .c4-cv{position:relative;padding:36px 0 36px 48px}.c4-k-chat .c4-cv figure{border-radius:28px;aspect-ratio:4/4.6}
.c4-k-chat .c4-bb{position:absolute;max-width:300px;padding:16px 20px;border-radius:20px 20px 20px 6px;background:#fff;color:var(--ink);font-size:17px;font-weight:600;line-height:1.5;box-shadow:0 20px 40px -20px ${al(D.ink, .35)}}.c4-k-chat .c4-bb small{display:block;font-size:13px;font-weight:700;color:var(--mu);margin-bottom:2px}
.c4-k-chat .c4-bb.b0{left:0;top:6%}.c4-k-chat .c4-bb.me{right:-24px;top:40%;background:var(--a);color:var(--on);border-radius:20px 20px 6px 20px}.c4-k-chat .c4-bb.me small{color:inherit;opacity:.8}.c4-k-chat .c4-bb.b2{left:8%;bottom:4%}
@media (max-width:720px){.c4-k-chat{padding:48px 0 72px}.c4-k-chat .c4-g{grid-template-columns:1fr;gap:36px}.c4-k-chat h1{font-size:42px;line-height:1.18}.c4-k-chat .c4-cv{padding:24px 0 24px 16px}.c4-k-chat .c4-cv figure{aspect-ratio:4/3.6}.c4-k-chat .c4-bb{font-size:15px;max-width:230px;padding:12px 14px}.c4-k-chat .c4-bb.me{right:0}}`,
    store: (D) => `.c4-k-store{padding:0 0 120px;background:var(--bg)}.c4-k-store .c4-blk{background:var(--a);color:var(--on);padding:110px 0 220px}.c4-k-store .c4-blk>.c4w{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:end}
.c4-k-store .c4-ey{color:${'var(--pt)'};letter-spacing:.04em}.c4-k-store h1{font-size:96px;line-height:1.02;font-weight:900;letter-spacing:-.06em}.c4-k-store .c4-lead{color:inherit;opacity:.88;margin:0}.c4-k-store .c4-b.pri{background:var(--pt);color:#24140F}.c4-k-store .c4-b.wh{box-shadow:inset 0 0 0 2px currentColor;color:inherit}
.c4-k-store .c4-mos{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:20px;margin-top:-150px}.c4-k-store .c4-mos figure{border-radius:var(--r);aspect-ratio:4/3.4;box-shadow:0 30px 60px -30px rgba(0,0,0,.35)}.c4-k-store .c4-mos .m2{margin-top:56px}.c4-k-store .c4-mos .m3{margin-top:112px}
@media (max-width:720px){.c4-k-store{padding-bottom:64px}.c4-k-store .c4-blk{padding:52px 0 150px}.c4-k-store .c4-blk>.c4w{grid-template-columns:1fr;gap:20px}.c4-k-store h1{font-size:46px;line-height:1.1}.c4-k-store .c4-mos{grid-template-columns:1.4fr 1fr;margin-top:-110px;gap:10px}.c4-k-store .c4-mos .m2{margin-top:36px}.c4-k-store .c4-mos .m3{display:none}}`,
    arch: (D) => `.c4-k-arch{padding:64px 0 0;text-align:center;background:var(--bg)}.c4-k-arch .c4-crest{width:56px;height:56px;border-radius:50%;display:inline-grid;place-items:center;border:1.5px solid var(--pt);color:var(--a);font-family:${SERIF};font-size:28px;font-weight:700;margin-bottom:26px;box-shadow:inset 0 0 0 5px var(--bg),inset 0 0 0 6px ${al(D.pt, .6)}}
.c4-k-arch .c4-ey{letter-spacing:.2em;font-size:14px}.c4-k-arch h1{font-size:72px;line-height:1.2;font-weight:700;letter-spacing:-.045em}.c4-k-arch h1 em{font-style:normal;color:var(--a)}.c4-k-arch .c4-lead{margin:26px auto 0}.c4-k-arch .c4-cta{justify-content:center;margin-top:40px}
.c4-k-arch .c4-arch{margin:56px auto 0;max-width:1040px;aspect-ratio:2.1/1;border-radius:520px 520px 0 0}
.cpuniv .c4-h2{line-height:1.3}.cpuniv .c4-ey{letter-spacing:.14em;font-size:14px}.cpuniv.c4-levels .c4-r{font-style:italic}
@media (max-width:720px){.c4-k-arch{padding:52px 0 0}.c4-k-arch h1{font-size:38px;line-height:1.3}.c4-k-arch .c4-lead{margin:20px auto 0}.c4-k-arch .c4-arch{margin-top:44px;aspect-ratio:1/1;border-radius:200px 200px 0 0}}`
  };

  /* ── 렌더러 연결 ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    try { if (x && s) { const d = x.data || {};
      if (x.type === 'text' && SEC[d.hpt]) { if (x.hide && !editing()) return ''; return SEC[d.hpt](x, s) || ''; }
      if (x.type === 'banner' && mine(s) && HPT.has(s.theme) && !+d.dstyle && !s.layout) { if (x.hide && !editing()) return ''; return mark(heroSec(s, d), x); } }
    } catch (e) { console.error('hp44-corp', e); }
    return base(x, i, s, lk); }; window.proSec = proSec; }
  try { if (window.HPW && typeof HPW.emptyOf === 'function') { const e0 = HPW.emptyOf; HPW.emptyOf = x => { const d = (x && x.data) || {}; if (x && x.type === 'text' && /^hx-/.test(String(d.hpt || '')) && d.on44 === 1) return false; /* 이 템플릿이 기본으로 켠 공통 부품: 데이터가 없으면 부품이 스스로 숨는다(자동 숨김 표시를 붙이지 않음) */
      if (x && x.type === 'text' && SEC[d.hpt]) { try { return /^c4-(cards|rows|prog|levels|figs|stat)$/.test(d.hpt) ? !live().length : d.hpt === 'c4-quote' ? !review() : false; } catch (e) { return false; } } return e0(x); }; } } catch (e) { }
  const needCSS = s => !!(s && (mine(s) || (s.sections || []).some(x => x && x.data && SEC[x.data.hpt])));
  const SERIF_CSS = 'fonts/noto-serif-kr/font.css?v=ea0bde31';
  { const base = siteHTML; siteHTML = (s, ...a) => { if (mine(s)) pageStart(s); let h = base(s, ...a); try { if (needCSS(s) && HPT.tokens(s)) { h = h.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>');
      h = h.replace(/<section class="([^"]*\bc4\b[^"]*)"/g, (m, c) => `<section class="${c.replace(/\bhps-(flowb?|short)\b\s*/g, '').trim()}"`); /* 같은 바탕 섹션 간격 압축은 시안 리듬을 깨므로 뺀다 */
      if (DEF[thOf(s)].hf === SERIF && h.indexOf(SERIF_CSS) < 0) h = h.replace('</head>', `<link rel="stylesheet" href="${SERIF_CSS}"></head>`); } } catch (e) { console.error('hp44-corp css', e); } return h; }; window.siteHTML = siteHTML; }

  /* ── 등록 ── */
  MINE.forEach(id => { const D = DEF[id]; HPT.reg(id, { prem: 1, g44: 1, cssX: () => '', name: D.name, desc: D.desc, tags: ['corp'], tone: D.dark ? 'dark' : 'light', dens: '여유', acc: D.acc, bg: D.bg, alt: D.alt, ink: D.ink, mu: D.mu, r: D.r, br: D.br, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: D.alt, base: D.dark ? 'premium' : D.hf === SERIF ? 'campus' : 'clean', hk: 'cover', hp: 'brief', ck: 'photo', sh: 'none' });
    try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, tok(D.hf === SERIF ? 'serif' : 'sans', D.hw, 88, 42)); } catch (e) { console.error('hp44-corp HPD', e); } });
  { const pf = HPT.premFits; if (typeof pf === 'function') HPT.premFits = (id, t) => MINE.includes(id) ? (t || (() => { try { return S.org.type; } catch (e) { return ''; } })()) === 'corp' : pf(id, t); }
  { const tb = HPT.thumb; if (typeof tb === 'function') HPT.thumb = (s, id) => { if (!MINE.includes(id)) return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); ['hpPal', 'hpPalX', 'hpColorLock', 'font', 'look', 'hpTheme'].forEach(k => { delete b[k]; }); b.color = DEF[id].acc; HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.id === 't44-' + id); /* 미리보기는 템플릿 자체 색 · 서체로(현재 사이트의 색 · 글꼴 · 팔레트를 물려받지 않음) */ if (tp) b.sections = tp.build(); b.photos = Object.assign({}, DEF[id].ph); b.img = {}; return siteHTML(b, false, 'ko'); } catch (e) { console.error('hp44-corp thumb', e); return tb(s, id); } }; }
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') { window.HP44C = { DEF, css, SEC }; return; }
  const TX = (variant, data) => S2('text', { variant, ...data });
  const quiet = () => [TX('stats', { hpt: 'facts', title: '', cols: [] }), TX('timeline', { hpt: 'sched', eyebrow: '', title: '모집 일정', cols: [] })].map(x => Object.assign(x, { hide: true }));
  const ban = d => S2('banner', d);
  const B = {
    cphrd: { scene: '대기업 HRD 러닝센터 — 임직원이 필수 교육 · 직무 · 리더십 과정을 한곳에서 듣고 이수 기록을 확인', purpose: ['learn', 'brand'],
      build: () => [ban({ eyebrow: `${org()} 러닝센터`, title: '다음 분기의 나를,\n오늘 준비해요.', sub: `${org()} 임직원을 위한 러닝센터예요. 필수 교육부터 직무 · 리더십 과정까지 한곳에서 듣고, 이수 기록은 자동으로 남아요.`, cta: '내 교육 시작하기', link: 'learn:my', cta2: '과정 둘러보기', link2: 'learn:courses', note: '로그인하면 남은 필수 교육과 마감일을 먼저 보여드려요.' }),
        TX('features', { hpt: 'c4-stat', title: '', cols: [] }), TX('features', { hpt: 'c4-cards', eyebrow: '이번 학기 과정', title: '일에 바로 쓰는 배움,\n지금 들을 수 있어요.', cols: [] }),
        TX('steps', { hpt: 'c4-story', eyebrow: '배우는 방식', title: '강의는 짧게,\n실습은 내 일로.', sub: '듣고 끝나는 수업이 아니라, 다음 주 업무에 쓸 결과물 하나를 들고 나가요.', cols: [['짧게 나눈 강의', '출퇴근길 휴대폰으로 끊어 들어도 진도가 이어져요.'], ['내 업무 자료로 실습', 'AI 조교가 과제를 같이 보고 바로 피드백해요.'], ['이수는 자동으로 기록', '기준을 채우면 이수증이 바로 나와요.']] }),
        TX('features', { hpt: 'c4-quote', cols: [] }), TX('features', { hpt: 'c4-duo', k1: '임직원이라면', k2: '교육 담당자라면', b1: '내 교육 시작하기', b2: '담당자 로그인', link: 'learn:my', link2: 'learn:login', cols: [['내 교육,\n지금 이어서 들어요.', '로그인하면 필수 교육 · 신청한 과정 · 이수증이 한 화면에 모여요.'], ['팀 단위 신청과\n이수 현황을 한 번에.', '부서별 단체 등록과 미이수자 알림은 담당자 화면에서 처리해요.']] }), ...quiet()] },
    cplegal: { scene: '법정 · 필수 교육 — 올해 들어야 할 법정 교육 과목과 마감일을 첫 화면에서 확인하고 바로 수강 · 이수증 발급', purpose: ['learn', 'info'],
      build: () => [ban({ eyebrow: `${org()} 법정 · 필수 교육`, title: '올해 필수 교육,\n마감 전에 끝내요.', sub: '모든 임직원이 매년 들어야 하는 법정 교육이에요. 과목마다 1시간 안팎, 휴대폰으로도 들을 수 있어요.', cta: '내 필수 교육 듣기', link: 'learn:my', cta2: '이수증 받기', link2: 'learn:cert' }),
        TX('steps', { hpt: 'c4-flow', eyebrow: '이렇게 끝내요', title: '로그인부터 이수증까지,\n세 단계예요.', cols: [['로그인', '회사에서 받은 초대 계정으로 들어가요.', 'STEP 1'], ['과목별 수강', '영상과 간단한 평가를 이수 기준까지 마쳐요.', 'STEP 2'], ['이수증 발급', '인사 · 감사 제출용 이수증을 PDF로 받아요.', 'STEP 3']] }),
        TX('features', { hpt: 'c4-rows', eyebrow: '교육 일정', title: '과목별 마감일을\n확인해요.', cols: [] }),
        TX('features', { hpt: 'c4-figs', title: '올해 필수 교육\n진행 현황', cols: [] }),
        TX('features', { hpt: 'c4-help', title: '공지', sub: '마감 연장 · 이수 기록은 담당자에게', cols: [] }), ...quiet()] },
    cponboard: { scene: '신입 온보딩 — 입사자가 첫날부터 90일까지 해야 할 교육 · 적응 과정을 따라가며 버디와 함께 시작', purpose: ['learn', 'brand'],
      build: () => [ban({ eyebrow: `${org()} 온보딩`, title: '첫 출근,\n환영해요.', sub: '처음 90일 동안 무엇을 언제 배우면 되는지 순서대로 알려드려요. 모르는 건 버디에게 편하게 물어보세요.', cta: '온보딩 시작하기', link: 'learn:my', cta2: '과정 미리 보기', link2: 'learn:courses', note: '입사일에 받은 초대 메일로 로그인해요.' }),
        TX('steps', { hpt: 'c4-flow', eyebrow: '처음 90일', title: '하루씩, 한 주씩\n익숙해져요.', cols: [['회사와 첫 만남', '조직 · 제품 · 일하는 방식을 소개해요.', '첫날'], ['도구와 규칙', '업무 도구 · 보안 · 필수 교육을 마쳐요.', '첫 주'], ['첫 과제', '버디와 함께 작은 과제 하나를 끝내요.', '첫 달'], ['돌아보기', '리더와 90일 회고 면담을 해요.', '90일']] }),
        TX('features', { hpt: 'c4-cards', re: '온보딩|신입|입문|신규', eyebrow: '온보딩 과정', title: '입사자가 먼저 듣는\n과정이에요.', cols: [] }),
        TX('steps', { hpt: 'c4-story', eyebrow: '혼자가 아니에요', title: '버디 한 명이\n90일을 함께해요.', cols: [['버디 배정', '같은 팀 선배가 첫날부터 함께해요.'], ['질문 게시판', '사소한 질문도 커뮤니티에 남겨요.'], ['주간 체크인', '매주 10분, 막힌 점을 이야기해요.']] }),
        TX('features', { hpt: 'c4-duo', k1: '입사자라면', k2: '버디 · 리더라면', b1: '온보딩 시작하기', b2: '커뮤니티 가기', link: 'learn:my', link2: 'learn:comm', cols: [['오늘 할 일부터\n하나씩 시작해요.', '로그인하면 이번 주에 들을 과정이 먼저 보여요.'], ['새 동료를\n함께 맞이해요.', '입사자 질문에 답하고 진행 상황을 확인해요.']] }), ...quiet()] },
    cplead: { scene: '리더십 · 승진 — 신임 팀장 · 승진 대상자가 단계별 리더 과정과 코칭을 신청', purpose: ['learn', 'brand'],
      build: () => [ban({ eyebrow: 'LEADERSHIP PROGRAM', title: '좋은 리더는\n길러져요.', sub: `${org()}의 신임 리더와 승진 대상자를 위한 과정이에요. 첫 팀을 맡기 전, 꼭 필요한 것부터 배워요.`, cta: '리더 과정 보기', link: 'learn:courses', cta2: '내 과정', link2: 'learn:my' }),
        TX('features', { hpt: 'c4-levels', num: 'roman', eyebrow: '리더 단계', title: '역할이 바뀔 때마다,\n다음 과정이 있어요.', sub: '단계마다 들어야 할 과정이 정해져 있어요.', cols: [] }),
        TX('features', { hpt: 'c4-prog', re: '리더|팀장|승진|관리자|코칭', eyebrow: '대표 과정', title: '리더가 먼저 찾는\n과정', cols: [] }),
        TX('features', { hpt: 'c4-quote', cols: [] }),
        TX('steps', { hpt: 'c4-flow', inv: 1, eyebrow: '과정은 이렇게', title: '배우고, 해 보고,\n돌아봐요.', cols: [['집합 교육', '동료 리더와 사례로 토론해요.', 'I'], ['현업 적용', '내 팀에서 직접 해 봐요.', 'II'], ['1:1 코칭', '코치와 함께 돌아봐요.', 'III']] }),
        TX('features', { hpt: 'c4-duo', k1: '신임 리더라면', k2: '승진 대상자라면', b1: '내 과정 보기', b2: '과정 둘러보기', link: 'learn:my', link2: 'learn:courses', cols: [['첫 분기를\n준비해요.', '1:1 면담 · 목표 합의 · 평가 피드백을 연습해요.'], ['다음 역할을\n미리 배워요.', '승진 요건 과정과 일정을 확인해요.']] }), ...quiet()] },
    cpdx: { scene: '직무 · DX 아카데미 — 임직원이 생성형 AI · 데이터 · 자동화 직무 과정을 수준별로 신청', purpose: ['learn'],
      build: () => [ban({ eyebrow: 'DX ACADEMY · 직무 아카데미', title: '일하는 방식을,\n다시 설계해요.', sub: '생성형 AI · 데이터 분석 · 업무 자동화를 내 업무 자료로 실습해요. 수준별 과정이라 처음이어도 괜찮아요.', cta: '과정 시작하기', link: 'learn:courses', cta2: '내 학습', link2: 'learn:my', note: '생성형 AI · 데이터 · 자동화 · 실습 중심' }),
        TX('features', { hpt: 'c4-cards', re: 'AI|DX|데이터|디지털|생성형|자동화|분석', eyebrow: 'TRACKS', title: '지금 열린\n직무 과정', cols: [] }),
        TX('features', { hpt: 'c4-levels', eyebrow: 'LEVEL', title: '수준별로\n이어서 배워요.', sub: '입문에서 시작해 실무 프로젝트까지 단계가 이어져요.', cols: [] }),
        TX('steps', { hpt: 'c4-story', eyebrow: 'HOW', title: '내 업무 자료로\n실습해요.', cols: [['과제 정하기', '반복 업무 하나를 골라요.'], ['AI와 함께 만들기', 'AI 조교가 단계마다 피드백해요.'], ['팀에 공유하기', '결과물을 팀 커뮤니티에 올려요.']] }),
        TX('features', { hpt: 'c4-figs', title: '숫자로 보는\n아카데미', cols: [] }),
        TX('features', { hpt: 'c4-duo', k1: '학습자라면', k2: '팀 리더라면', b1: '과정 시작하기', b2: '커뮤니티', link: 'learn:courses', link2: 'learn:comm', cols: [['첫 과정을\n오늘 시작해요.', '입문 과정은 하루 30분, 2주면 끝나요.'], ['팀 과제로\n함께 바꿔요.', '팀 단위 실습 결과를 모아 봐요.']] }), ...quiet()] },
    cpsales: { scene: '영업 · 서비스 교육 — 현장 영업 · 고객 응대 직원이 상품 · 응대 과정을 듣고 역할극 실습', purpose: ['learn', 'brand'],
      build: () => [ban({ eyebrow: '영업 · 서비스 아카데미', title: '고객 앞에서,\n자신 있게.', sub: '상품 지식부터 상담 · 응대 대본까지, 현장에서 바로 쓰는 교육이에요.', cta: '교육 시작하기', link: 'learn:my', cta2: '과정 보기', link2: 'learn:courses' }),
        TX('features', { hpt: 'c4-quick', cols: [['내 교육', '이어 듣기', '#my'], ['과정', '상품 · 응대', '#courses'], ['수료증', '발급 · 확인', '#cert'], ['공지', '신상품 · 일정', '#notice']] }),
        TX('features', { hpt: 'c4-cards', re: '영업|서비스|고객|상담|CS|판매', eyebrow: '현장 과정', title: '오늘 배워서\n내일 써요.', cols: [] }),
        TX('features', { hpt: 'c4-band', title: '대본은 외우는 게 아니라,\n연습하는 거예요.', sub: '역할극 실습과 AI 피드백으로 실제 상담처럼 연습해요.', cols: [] }),
        TX('steps', { hpt: 'c4-story', eyebrow: '실습 방식', title: '듣고, 해 보고,\n피드백 받아요.', cols: [['짧은 영상', '상품과 응대 원칙을 10분 안에 익혀요.'], ['역할극', '동료 · AI와 상담을 연습해요.'], ['현장 체크', '매장에서 써 본 결과를 남겨요.']] }),
        TX('features', { hpt: 'c4-duo', k1: '현장 직원이라면', k2: '매니저라면', b1: '교육 시작하기', b2: '담당자 로그인', link: 'learn:my', link2: 'learn:login', cols: [['이번 주 교육을\n먼저 들어요.', '신상품 · 프로모션 교육이 먼저 보여요.'], ['우리 팀 진도를\n확인해요.', '매장별 이수 현황은 담당자 화면에서 봐요.']] }), ...quiet()] },
    cpheritage: { scene: '전통 기업(격식) — 대기업 · 금융권 인재원, 계층별 교육 체계와 교육 철학을 격식 있게', purpose: ['brand', 'learn'],
      build: () => [ban({ eyebrow: `${org()} 인재원`, title: '신뢰받는 회사는,\n사람을 먼저 키워요.', sub: `신입부터 임원까지, ${org()} 임직원이 경력의 단계마다 거치는 교육을 이곳에서 안내해요.`, cta: '나의 학습 이어가기', link: 'learn:my', cta2: '교육 체계 보기', link2: 'learn:courses', note: '' }),
        TX('features', { hpt: 'c4-vals', eyebrow: '교육 철학', title: '고객의 내일을 맡는 일이기에,\n배움에는 타협하지 않아요.', cols: [['전문성', '직무 역량을 단계별 과정으로 쌓아요.'], ['신뢰', '법정 · 윤리 교육을 매년 빠짐없이 이수해요.'], ['리더십', '조직을 이끌 리더를 내부에서 길러요.']] }),
        TX('features', { hpt: 'c4-levels', num: 'roman', eyebrow: '교육 체계', title: '경력의 단계마다,\n꼭 맞는 과정이 있어요.', sub: '직급과 직무에 따라 들어야 할 과정이 정해져 있어요. 로그인하면 내 단계의 과정이 먼저 보여요.', cols: [] }),
        TX('features', { hpt: 'c4-prog', eyebrow: '대표 프로그램', title: '지금 운영 중인\n과정', cols: [] }),
        TX('features', { hpt: 'c4-figs', title: '숫자로 보는\n인재원', cols: [] }),
        TX('features', { hpt: 'c4-duo', k1: '임직원', k2: '교육 체계', b1: '나의 학습으로', b2: '전체 과정 보기', link: 'learn:my', link2: 'learn:courses', cols: [['내 단계의 과정을\n확인해 보세요.', '로그인하면 필수 과정과 이수 현황이 먼저 보여요.'], ['전체 교육 과정\n한눈에 보기', '직급 · 직무별 과정과 일정을 안내해요.']] }), ...quiet()] },
    cpstartup: { scene: '스타트업 문화 — 구성원이 일하는 방식 · 문화 · 성장 과정을 함께 배우고 커뮤니티에서 나눔', purpose: ['brand', 'learn'],
      build: () => [ban({ eyebrow: `${org()} 컬처 클럽`, title: '우리답게 일하는 법,\n함께 배워요.', sub: '일하는 방식 · 피드백 · 회고까지, 우리 팀이 같은 말로 일하도록 돕는 짧은 과정이에요.', cta: '과정 보기', link: 'learn:courses', cta2: '커뮤니티', link2: 'learn:comm' }),
        TX('features', { hpt: 'c4-vals', eyebrow: '우리가 일하는 방식', title: '세 가지만\n기억해요.', cols: [['빠르게 공유해요', '완벽하지 않아도 먼저 보여 줘요.'], ['솔직하게 말해요', '피드백은 사람이 아니라 일에 해요.'], ['함께 돌아봐요', '프로젝트가 끝나면 꼭 회고해요.']] }),
        TX('features', { hpt: 'c4-cards', eyebrow: '이번 달 과정', title: '짧고, 바로\n써먹을 수 있어요.', cols: [] }),
        TX('features', { hpt: 'c4-quote', cols: [] }),
        TX('features', { hpt: 'c4-duo', k1: '구성원이라면', k2: '리더라면', b1: '내 과정', b2: '커뮤니티', link: 'learn:my', link2: 'learn:comm', cols: [['이번 주 과정,\n10분이면 돼요.', '로그인하면 이어 들을 과정이 먼저 보여요.'], ['팀 회고를\n함께 열어요.', '회고 템플릿과 사례를 커뮤니티에서 나눠요.']] }), ...quiet()] },
    cppartner: { scene: '협력사 · 파트너 교육 — 대리점 · 협력사 직원이 파트너 인증 과정을 듣고 인증서를 받음', purpose: ['learn', 'info'],
      build: () => [ban({ eyebrow: `${org()} 파트너 아카데미`, title: '파트너와 함께,\n같은 기준으로 일해요.', sub: '협력사 · 대리점 직원을 위한 제품 · 안전 · 품질 교육이에요. 과정을 마치면 파트너 인증서를 받아요.', cta: '파트너 교육 시작', link: 'learn:my', cta2: '인증 과정 보기', link2: 'learn:courses', note: '협력사 계정이 있나요?' }),
        TX('steps', { hpt: 'c4-flow', eyebrow: '파트너 인증', title: '인증까지\n세 단계예요.', cols: [['협력사 계정', '회사에서 받은 초대로 가입해요.', '01'], ['필수 과정 수강', '제품 · 안전 · 품질 과정을 마쳐요.', '02'], ['인증서 발급', '인증서를 받아 현장에 제출해요.', '03']] }),
        TX('features', { hpt: 'c4-rows', eyebrow: '교육 일정', title: '지금 운영 중인\n파트너 과정', cols: [] }),
        TX('steps', { hpt: 'c4-story', eyebrow: '왜 함께 배우나요', title: '같은 기준이\n같은 품질을 만들어요.', cols: [['같은 매뉴얼', '본사와 같은 최신 기준으로 배워요.'], ['같은 인증', '인증 이력이 계정에 남아요.'], ['빠른 공지', '변경 사항을 공지로 바로 받아요.']] }),
        TX('features', { hpt: 'c4-help', title: '파트너 공지', sub: '파트너 교육 담당자에게 물어보세요', cols: [] }), ...quiet()] },
    cpcs: { scene: 'CS · 콜센터 교육 — 상담사가 응대 스크립트를 연습하고 품질 평가 기준을 확인, 신입 상담사는 4주 온보딩을 따라감', purpose: ['learn'],
      build: () => [ban({ eyebrow: `${org()} 상담 아카데미`, title: '좋은 상담은,\n연습에서 나와요.', sub: '응대 스크립트 · 공감 표현 · 문제 해결을 실제 상담처럼 연습해요. 신입 상담사는 4주 온보딩으로 시작해요.', cta: '상담 교육 시작', link: 'learn:my', cta2: '과정 보기', link2: 'learn:courses', chat: ['주문한 상품이 아직 안 왔어요.', '불편을 드려 죄송해요. 바로 확인해 드릴게요.', '오늘 안에 받을 수 있을까요?'] }),
        TX('steps', { hpt: 'c4-flow', eyebrow: '신입 상담사 온보딩', title: '4주면 혼자서도\n응대할 수 있어요.', cols: [['시스템 · 상품', '상담 시스템과 상품 정보를 익혀요.', '1주'], ['응대 스크립트', '상황별 스크립트를 역할극으로 연습해요.', '2주'], ['모니터링 콜', '선배 상담을 듣고 함께 응대해요.', '3주'], ['단독 응대', 'QA 피드백을 받으며 혼자 응대해요.', '4주']] }),
        TX('features', { hpt: 'c4-cards', re: '상담|응대|고객|CS|서비스|스크립트|클레임', eyebrow: '응대 과정', title: '상황별로\n연습해요.', cols: [] }),
        TX('features', { hpt: 'c4-vals', eyebrow: '품질 평가 기준', title: '좋은 상담을\n세 가지로 봐요.', cols: [['공감', '고객의 말을 먼저 받아 주고 시작해요.'], ['정확', '안내는 한 번에, 정확한 정보로 해요.'], ['해결', '통화가 끝나기 전에 다음 단계를 약속해요.']] }),
        TX('steps', { hpt: 'c4-story', eyebrow: '연습 방식', title: '스크립트는 외우지 않고,\n말해 보며 익혀요.', cols: [['AI 고객과 역할극', '다양한 고객 상황을 바로 연습해요.'], ['녹음 다시 듣기', '내 응대를 다시 들으며 고쳐요.'], ['QA 피드백', '평가 기준대로 코멘트를 받아요.']] }),
        TX('features', { hpt: 'c4-duo', k1: '상담사라면', k2: 'QA · 센터장이라면', b1: '오늘 교육 듣기', b2: '담당자 로그인', link: 'learn:my', link2: 'learn:login', cols: [['오늘 들을 교육을\n먼저 확인해요.', '로그인하면 이번 주 과정과 피드백이 먼저 보여요.'], ['팀 품질과 진도를\n한 번에 봐요.', '상담사별 이수와 평가는 담당자 화면에서 관리해요.']] }), ...quiet()] },
    cpstore: { scene: '대리점 · 가맹점 교육 — 본사가 점주 · 직원에게 매장 매뉴얼 · 신메뉴 · 신상품 교육을 배포하고 지점별 이수를 확인', purpose: ['learn', 'info'],
      build: () => [ban({ eyebrow: `${org()} 매장 아카데미`, title: '어느 매장에서나,\n같은 기준으로.', sub: '본사가 만든 매장 매뉴얼 · 신메뉴 · 신상품 교육을 점주와 직원이 휴대폰으로 바로 들어요.', cta: '매장 교육 시작', link: 'learn:my', cta2: '전체 과정', link2: 'learn:courses' }),
        TX('steps', { hpt: 'c4-flow', eyebrow: '교육은 이렇게 흘러요', title: '본사에서 매장까지,\n하루면 닿아요.', cols: [['본사', '신메뉴 · 신상품 교육을 올려요.', 'HQ'], ['점주', '매장별로 직원에게 배정해요.', 'OWNER'], ['직원', '근무 전 10분, 휴대폰으로 들어요.', 'CREW']] }),
        TX('features', { hpt: 'c4-cards', re: '신메뉴|신상품|매장|가맹|점주|위생|조리|레시피|판매|서비스', eyebrow: '이번 달 교육', title: '새로 나온 것부터\n먼저 배워요.', cols: [] }),
        TX('features', { hpt: 'c4-band', title: '매뉴얼은 책장이 아니라,\n매장에서 펼쳐 봐요.', sub: '조리 순서 · 진열 기준 · 응대 문구를 영상과 사진으로 바로 확인해요.', cols: [] }),
        TX('features', { hpt: 'c4-rows', eyebrow: '교육 일정', title: '출시 교육 일정', cols: [] }),
        TX('features', { hpt: 'c4-duo', k1: '점주 · 직원이라면', k2: '본사 담당자라면', b1: '매장 교육 시작', b2: '담당자 로그인', link: 'learn:my', link2: 'learn:login', cols: [['오늘 들을 교육을\n바로 확인해요.', '로그인하면 우리 매장에 배정된 교육이 먼저 보여요.'], ['지점별 이수 현황을\n한 번에 봐요.', '매장별 미이수 알림과 이수 기록은 담당자 화면에서 관리해요.']] }), ...quiet()] },
    cpuniv: { scene: '사내 대학 — 학부(스쿨) 체계로 운영하는 기업 사내 대학, 학기 일정과 대표 과정 안내', purpose: ['brand', 'learn'],
      build: () => [ban({ eyebrow: 'CORPORATE UNIVERSITY', title: '배움이 이어지는\n우리 회사의 대학.', sub: `${org()} 사내 대학은 직무 · 리더십 · 교양 학부로 나뉘어 있어요. 학기마다 새 과정이 열려요.`, cta: '이번 학기 과정', link: 'learn:courses', cta2: '나의 강의실', link2: 'learn:my' }),
        TX('features', { hpt: 'c4-levels', eyebrow: 'SCHOOLS', title: '학부별로\n과정을 찾아요.', sub: '로그인하면 내 직무에 맞는 학부가 먼저 보여요.', cols: [] }),
        TX('features', { hpt: 'c4-prog', eyebrow: 'FEATURED', title: '이번 학기\n대표 과정', cols: [] }),
        TX('features', { hpt: 'c4-rows', eyebrow: 'CALENDAR', title: '학기 일정', cols: [] }),
        TX('features', { hpt: 'c4-figs', title: '숫자로 보는\n사내 대학', cols: [] }),
        TX('features', { hpt: 'c4-duo', k1: '재학 중이라면', k2: '처음이라면', b1: '나의 강의실', b2: '과정 둘러보기', link: 'learn:my', link2: 'learn:courses', cols: [['이번 학기 강의를\n이어서 들어요.', '신청한 과정과 이수 학점이 한곳에 모여요.'], ['학부와 과정을\n먼저 둘러봐요.', '직무 · 리더십 · 교양 학부의 과정을 안내해요.']] }), ...quiet()] }
  };
  /* v44.1(cat44 TYPE · GAP B 기업): 템플릿 성격에 맞춰 공통 신뢰 부품(hx-*)과 기업 항목(로고 띠 · 마감 D-day)을 기본으로 켠다. 데이터가 없으면 게시본에서 자동으로 숨는다.
     top = 첫 화면 바로 아래, end = 마지막 두 갈래 앞. 템플릿 자체 후기 인용(c4-quote)은 hx-rev 하나로, 자체 공지 · 문의(c4-help)는 hx-ntc · hx-loc로 바꾼다 */
  const PARTS = { cphrd: { top: ['logos'], end: ['dday', 'rev', 'fac', 'faq'] }, cplegal: { top: ['dday'], end: ['ntc', 'faq', 'loc'] }, cponboard: { end: ['fac', 'faq'] }, cplead: { end: ['fac', 'rev'] }, cpdx: { end: ['fac', 'faq'] },
    cpsales: { end: ['rev', 'faq'] }, cpheritage: { top: ['logos'], end: ['dday', 'ntc', 'loc'] }, cpstartup: { end: ['rev', 'fac'] }, cppartner: { top: ['logos'], end: ['dday', 'ntc', 'faq', 'loc'] }, cpcs: { end: ['rev', 'faq'] },
    cpstore: { top: ['logos'], end: ['ntc', 'faq'] }, cpuniv: { top: ['logos'], end: ['fac', 'ntc'] } };
  const LOGO_T = { cphrd: '함께 배우는 계열사', cpheritage: '그룹 계열사', cppartner: '함께하는 협력사', cpstore: '함께하는 브랜드 · 매장', cpuniv: '함께하는 계열사' };
  const part = (id, k) => { if (k === 'logos') return TX('features', { hpt: 'c4-logos', title: LOGO_T[id] || '함께하는 회사', cols: [] }); if (k === 'dday') return TX('features', { hpt: 'c4-dday', eyebrow: '마감 일정', title: '', cols: [] });
    try { const o = window.HPX && typeof HPX.sec === 'function' ? HPX.sec(k, id === 'cplead' && k === 'fac' ? { title: '함께하는 코치진' } : id === 'cpuniv' && k === 'fac' ? { title: '교수진' } : null) : null; if (o && o.data) o.data.on44 = 1; return o; } catch (e) { return null; } };
  const arrange = (id, L) => { const P = PARTS[id] || {}; const out = L.filter(x => !(x && x.data && /^c4-(quote|help)$/.test(x.data.hpt)));
    const top = (P.top || []).map(k => part(id, k)).filter(Boolean); const end = (P.end || []).map(k => part(id, k)).filter(Boolean);
    out.splice(1, 0, ...top); let at = out.findIndex(x => x && x.data && x.data.hpt === 'c4-duo'); if (at < 0) at = out.findIndex(x => x && x.hide); if (at < 0) at = out.length; out.splice(at, 0, ...end); return out; };
  MINE.forEach(id => { const b0 = B[id].build; B[id].build = () => arrange(id, b0()); });
  MINE.forEach(id => { if (TPL.some(t => t.id === 't44-' + id)) return; const c = B[id]; const D = DEF[id];
    TPL.push({ id: 't44-' + id, name: D.name, sub: D.sub, types: ['corp'], g44: 1, prem: 1, noPalette: true, scene: c.scene, color: D.acc, tone: D.dark ? '시네마틱' : '신뢰', look: 'corpPortal', theme: id, hero: '', purpose: c.purpose, desc: D.desc, build: c.build }); });
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hp44c) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && String(tp.id || '').replace(/^t44-/, ''); if (DEF[id] && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, DEF[id].ph); s.img = {}; Object.keys(s.photos).forEach(sl => { const v = HPSTOCK.slotImg(s.photos[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hp44-corp photo', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hp44c = 1; siteFromTpl = f; window.siteFromTpl = f; }
  /* 자동 보강이 첫 화면 아래 넣는 공지 · FAQ는 마지막 행동 앞으로. 공지 섹션(c4-help)이 있는 템플릿은 자동 공지를 숨긴 자리로 */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hp44c) { const e0 = HPT.enrich; const f = s => { const r = e0(s); try { if (mine(s) && Array.isArray(s.sections)) { const L = s.sections;
      const isMv = x => x && (x.type === 'notices' || (x.type === 'text' && x.data && x.data.hpt === 'faq'));
      const mv = L.filter(isMv); if (mv.length) { for (let k = L.length - 1; k >= 0; k--) if (isMv(L[k])) L.splice(k, 1);
        if (L.some(x => x && x.data && x.data.hpt === 'c4-help')) mv.forEach(x => { if (x.type === 'notices') x.hide = true; });
        let at = -1; L.forEach((x, k) => { if (x && x.data && /^c4-(duo|help)$/.test(x.data.hpt)) at = k; }); if (at < 0) at = L.length; L.splice(at, 0, ...mv); } } } catch (e) { console.error('hp44-corp enrich', e); } return r; };
    Object.keys(e0).forEach(k => { try { f[k] = e0[k]; } catch (e) { } }); f.hp44c = 1; HPT.enrich = f; }
  window.HP44C = { DEF, css, SEC, B };
})();
