/* v44 hp44-public — 공공 교육원 홈페이지 템플릿 10종(세부 유형별)
   대표님(2026-11-18): 「교육기관 유형별로 10가지」 「중복 · 저품질은 합치고 지우고」 「세부 유형별 시나리오에 맞게 높은 퀄리티만」 「전통 · 격식형 포함」
   - 기준선 v43.9 hpv-corp.js의 시민 저널(cvjournal) · 시티 포스터(cvposter) · 관공서(cvcivic)를 흡수 · 발전하고 7종을 새로 만든다.
   - 세부 유형 → 첫 화면 구성(서로 다르게)
     pbcivic 관공서 직원 교육 → 공식 분할 · pbjournal 시민 강좌 · 구민대학 → 잡지 콜라주 · pbposter 체육 · 문화 시설 대관 → 전면 포스터
     pbcampus 공단 · 공사 연수원 → 다크 시네마틱 · pblibrary 도서관 강좌 → 아치 사진 분할 · pbyouth 청소년 수련관 → 스티커 콜라주(색면)
     pbsenior 복지관 · 시니어 → 사진 위 큰 글씨 카드 · pbjobs 지자체 일자리센터 → 50:50 색면 분할 · pbmuseum 박물관 · 문화 교육 → 액자 전시 벽
     pbheritage 전통 관공서(격식) → 대칭 · 낙관 · 두 줄 테두리 파노라마
   - 테마 id는 HPT.reg 규칙(/^[a-z]{2,16}$/, 숫자 불가)에 맞춰 pb* — 갤러리 id는 TPL 't44-pb*', 클래스 접두어 p4-.
   - 원칙: 한 화면 한 메시지(큰 제목 + 부제 + 버튼 1~2개 + 큰 사진). 숫자 · 강좌 · 시설 · 후기는 실제 데이터로 그릴 때마다 계산하고 없으면 숨긴다.
   - 링크: 학습자 실제 경로(#my · #courses · #badges · #cal · #notice · #login · #join · #fac · #shop · #comm · #family · tel:)와 과정 상세(#p-c-<id> → 게시 때 #class/<id>)만.
   - CSS는 게시본 Shadow DOM에 닿도록 siteHTML 문자열 안에 넣는다. hpth · hpprem · hpsec* · hpv-*는 고치지 않는다. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const U = HPT.U; const { mix, fit, al } = U;
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const NL = v => E(v).replace(/\n/g, '<br>');
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const tday = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const okD = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''));
  const days = (a, b) => Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 864e5);
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ty = () => { try { return S.org.type || ''; } catch (e) { return ''; } };
  const ed = () => { try { return S.org.ed || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const telOf = () => String(ft().tel || '').replace(/[^\d-]/g, '');
  const DOW = '일월화수목금토';
  const md = d => okD(d) ? `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일` : '';
  const mdd = d => okD(d) ? `${md(d)}(${DOW[new Date(d.slice(0, 10) + 'T00:00:00').getDay()]})` : '';
  const dot = d => okD(d) ? `${d.slice(5, 7)}.${d.slice(8, 10)}` : '';
  const season = () => { const m = +tday().slice(5, 7); return m >= 3 && m <= 5 ? '봄' : m >= 6 && m <= 8 ? '여름' : m >= 9 && m <= 11 ? '가을' : '겨울'; };
  const won = n => (+n || 0).toLocaleString('ko-KR') + '원';
  const PATH = { arrow: 'M5 12h14M13 6l6 6-6 6', chev: 'M9 6l6 6-6 6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', down: 'M12 5v14M6 13l6 6 6-6' };
  const ic = (k, n, w) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="${w || 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATH[k] || PATH.arrow}"/></svg>`;
  const ROUTES = ['home', 'shop', 'comm', 'notice', 'textbooks', 'my', 'courses', 'fac', 'badges', 'cal', 'login', 'join', 'family'];
  const safeU = v => (typeof safeURL === 'function' ? safeURL(v) : /^https?:\/\//.test(v) ? v : '');
  const href = (v, dflt) => { v = String(v || ''); if (!v) return dflt || ''; if (v.startsWith('learn:')) { const r = v.slice(6); return '#' + (ROUTES.includes(r) ? r : 'home'); }
    if (v.startsWith('cls:')) return '#p-c-' + v.slice(4); if (v.startsWith('page:')) return '#p-' + v.slice(5); if (v.startsWith('url:')) return safeU(v.slice(4)); if (v.startsWith('tel:')) return 'tel:' + v.slice(4).replace(/[^\d-]/g, ''); if (/^#[a-z]/.test(v)) return v; return dflt || ''; };
  const aA = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const mark = (h, x) => { const m = editing() ? HPE.map.get(x) : null; return m ? h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`) : h; };
  const empty = (x, msg) => editing() ? mark(`<section class="hpt p4 p4-emp"><div class="p4w"><p>${E(msg || '표시할 실제 데이터가 아직 없어 게시본에서는 이 섹션이 숨겨져요.')}</p></div></section>`, x) : '';
  const two = (t, tag) => { const L = String(t || '').split('\n'); return L.length > 1 ? `${E(L[0])}<br><${tag}>${E(L.slice(1).join(' '))}</${tag}>` : E(L[0]); };

  /* ── 실제 데이터 ── */
  const live = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => c && c.status !== '종료' && c.name && !(okD(c.end) && days(tday(), c.end) < 0));
  /* 직원 교육(staff)은 방문자가 직원이라 사내 과정도 보여 준다. 시민 · 시설은 공개 강좌만(pubCls) */
  const staffOrg = () => ty() === 'corp' || (ty() === 'public' && ed() !== 'citizen' && ed() !== 'facility');
  const list = n => { let L = []; try { if (!staffOrg() && typeof pubCls === 'function') { const ids = pubCls(n || 12); L = ids.map(id => (S.classes || []).find(c => c.id === id)).filter(Boolean); } else L = live(); } catch (e) { L = live(); }
    return L.filter(c => c && c.name).sort((a, b) => String(a.start || '9').localeCompare(String(b.start || '9'))).slice(0, n || 12); };
  const done = (c, id) => { if (typeof clsDone === 'function') { try { return !!clsDone(c, id); } catch (e) { } } const p = +(((c.prog || {})[id] || {}).p) || 0; return p >= (((c.criteria || {}).threshold) || 100); };
  const rateOf = L => { let n = 0, d = 0; L.forEach(c => { (c.learners || []).forEach(id => { n++; if (done(c, id)) d++; }); }); return n ? { r: Math.round(d * 100 / n), n, d } : null; };
  const learners = () => { const set = new Set(); live().forEach(c => (c.learners || []).forEach(id => set.add(id))); return set.size; };
  const kindL = c => c.kind === 'episode' ? (c.sub || '정해진 회차') : c.kind === 'sub' ? '구독' : '온라인 · 자유 수강';
  const whenL = c => { const t = tday(); if (okD(c.start) && days(t, c.start) > 0) return `${md(c.start)} 시작`; if (okD(c.end)) return `${md(c.end)}까지`; return '상시 수강'; };
  const priceL = c => +c.price ? won(c.price) : '무료';
  const hrs = c => +c.hours ? `${+c.hours}시간` : '';
  const cH = c => '#p-c-' + c.id;
  const short = n => String(n || '').replace(/\s*\(.*\)$/, '');
  /* 큰 인용에는 칭찬 · 경험담만 — 불만 · 요청 · 질문(끊겨요 · 안 돼요 · 부탁 · 해 주세요 · 물음표 · 오류 · 환불 …)은 뺀다(v44 검수) */
  const ASK = /끊[겨기어]|안 ?[돼되됩]|[돼되]지 ?않|부탁|해 ?주[세시실]|주실 ?수|알려 ?주|[?？]\s*$|[?？]|오류|에러|버그|환불|불편|불만|아쉬|문의|왜 |언제|어떻게|느려|멈춰|튕[겨기]|로그인이 ?안/;
  const review = () => { try { const R = (S.reviews || []).filter(r => r && !r.hidden && String(r.body || '').trim().length >= 15 && (+r.stars || 5) >= 4 && !ASK.test(String(r.body).trim())); const r = R[0]; if (!r) return null; const c = (S.classes || []).find(x => x.id === r.cls); return { body: String(r.body).trim(), cls: c ? c.name : '' }; } catch (e) { return null; } };
  const notes = n => { try { return [...(S.notices || []), ...(S.classes || []).flatMap(c => c.notices || [])].filter(x => x && x.title && !x.hidden && !x.draft).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, n || 4); } catch (e) { return []; } };
  const facs = () => { try { return ((S.fac && S.fac.facilities) || []).filter(f => f && f.on !== false && f.name); } catch (e) { return []; } };

  /* ── 사진: 기관 사진(site.img) → 템플릿 지정 → 스톡 ── */
  const H = () => window.HPSTOCK;
  const abs = u => { try { return new URL(u, (H() && H().base) || location.href).href; } catch (e) { return u; } };
  const stk = (id, sz) => { const h = H(); if (!h || typeof h.get !== 'function') return null; const x = h.get(id); if (!x) return null; return { src: abs(h.url(x, sz === 'lg' ? '' : 'sm')), alt: x.alt || '', pos: x.focus || '50% 50%' }; };
  const slotP = (s, slot, d, fb) => { try { if (window.HPS && typeof HPS.photo === 'function') { const p = HPS.photo(s, slot, d); if (p) return { src: p.src, alt: p.alt, pos: p.pos }; } } catch (e) { } return fb ? stk(fb, 'lg') : null; };
  const clsP = (c, i, pool) => { const id = pool && pool[i % pool.length]; return (id && stk(id)) || (() => { try { const x = H() && H().photo(c.name, c.id, { id: true, scope: 'p4' }); return x ? { src: abs(H().url(x, 'sm')), alt: x.alt || '', pos: x.focus || '50% 50%' } : null; } catch (e) { return null; } })(); };
  const facP = (f, i, pool) => (f.photo && { src: abs(f.photo), alt: f.name, pos: '50% 50%' }) || stk(pool[i % pool.length]);
  const img = (p, cls, eager) => p ? `<figure class="${cls || 'p4-ph'}"><img src="${E(p.src)}" alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>` : '';

  /* ── 테마 10종 ── */
  const L0 = { vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', hk: 'desk', hp: 'ledger', ck: 'photo', sh: 'none', hero: 'split', dens: '여유' };
  const DEF = {
    pbcivic: Object.assign({}, L0, { name: '관공서', sub: '관공서 직원 교육', ed: 'staff', desc: '공식 누리집 띠 · 밑줄 링크 「자주 찾는 서비스」 · 날짜 열 교육 목록 — 지자체 · 정부 기관 직원 교육원', tone: 'light', acc: '#0B3A75', bg: '#FFFFFF', alt: '#F3F5F8', ink: '#111827', mu: '#3F4756', pt: '#F2B33D', r: 6, br: 6, sw2: '#E7EEF8', base: 'official', ck: 'list', dens: '보통' }),
    pbjournal: Object.assign({}, L0, { name: '시민 저널', sub: '시민 강좌 · 구민대학', ed: 'citizen', desc: '세리프 제목 · 종이색 바탕 · 사진 콜라주로 이번 학기 강좌를 잡지처럼 — 구민대학 · 시민 강좌', tone: 'light', acc: '#0F4C5C', bg: '#F5F0E6', alt: '#EDE5D6', ink: '#16231F', mu: '#46524D', pt: '#E2603B', r: 4, br: 4, illu: 'book', sw2: '#EDE5D6', base: 'warm' }),
    pbposter: Object.assign({}, L0, { name: '시티 포스터', sub: '체육 · 문화센터 시설 · 대관', ed: 'facility', desc: '전면 사진 위 큰 고딕 제목 · 신호 노랑 · 굵은 선 그리드 — 공공 체육 · 문화 시설과 대관', tone: 'light', acc: '#0A6B45', bg: '#F2F1EC', alt: '#FFFFFF', ink: '#0D0D0D', mu: '#474744', pt: '#FFD43B', r: 0, br: 0, sw2: '#0D0D0D', base: 'clean', hk: 'cover', hp: 'stage' }),
    pbcampus: Object.assign({}, L0, { name: '연수원 시네마', sub: '공단 · 공사 연수원', ed: 'staff', desc: '짙은 화면 위로 사진이 번지는 영화 같은 첫 화면, 번호 붙은 연수 과정 · 연수 시설 — 공단 · 공사 · 공공기관 연수원', tone: 'dark', acc: '#E3A33B', bg: '#0C0F14', alt: '#141922', ink: '#F3F1EC', mu: '#A9AFBA', pt: '#E3A33B', r: 2, br: 2, sw2: '#0C0F14', base: 'clean', hk: 'cover' }),
    pblibrary: Object.assign({}, L0, { name: '열람실', sub: '도서관 강좌', ed: 'citizen', desc: '아치형 열람실 사진 · 크림색 바탕 · 도서 대출 카드 같은 강좌 카드 — 공공도서관 독서 · 인문 · 디지털 강좌', tone: 'light', acc: '#1E5B44', bg: '#FBF7EE', alt: '#F1EADB', ink: '#1A2420', mu: '#4A544F', pt: '#D9A21B', r: 16, br: 999, illu: 'book', sw2: '#F1EADB', base: 'warm' }),
    pbyouth: Object.assign({}, L0, { name: '스티커 보드', sub: '청소년 수련관', ed: 'citizen', desc: '보라 색면 위 기울어진 사진 스티커 · 형광 연두 · 굵은 고딕 — 청소년 수련관 · 청소년 문화의집', tone: 'light', acc: '#5B3DF5', bg: '#FFFFFF', alt: '#F4F1FF', ink: '#120B33', mu: '#4A4566', pt: '#C8F03C', r: 24, br: 999, sw2: '#5B3DF5', base: 'clean', hk: 'cover' }),
    pbsenior: Object.assign({}, L0, { name: '큰 글씨 사랑방', sub: '복지관 · 시니어', ed: 'citizen', desc: '큰 사진 위로 겹친 큰 글씨 카드 · 큰 버튼 · 전화 신청 띠 — 종합사회복지관 · 노인복지관 · 시니어 강좌', tone: 'light', acc: '#B4531B', bg: '#FFF9F2', alt: '#F6EBDD', ink: '#2A1E14', mu: '#5A4A3C', pt: '#2F7D5B', r: 20, br: 16, sw2: '#F6EBDD', base: 'warm' }),
    pbjobs: Object.assign({}, L0, { name: '컬러 블록', sub: '지자체 일자리센터', ed: 'citizen', desc: '반은 파란 색면 · 반은 사진인 첫 화면, 상담부터 취업까지 4단계 · 취업 연계 교육 — 일자리센터 · 고용복지 교육', tone: 'light', acc: '#1E3FD8', bg: '#FFFFFF', alt: '#F2F4FA', ink: '#0B1233', mu: '#454B63', pt: '#FF7A1A', r: 12, br: 12, sw2: '#1E3FD8', base: 'clean', hk: 'cover' }),
    pbmuseum: Object.assign({}, L0, { name: '전시실', sub: '박물관 · 문화 교육', ed: 'citizen', desc: '흰 벽에 건 액자 사진과 작품 설명 명판 · 세리프 제목 — 박물관 · 미술관 · 문화재단 교육 프로그램', tone: 'light', acc: '#C8402A', bg: '#F3F1EC', alt: '#FFFFFF', ink: '#111111', mu: '#4D4B47', pt: '#111111', r: 0, br: 0, illu: 'book', sw2: '#F3F1EC', base: 'clean' }),
    pbheritage: Object.assign({}, L0, { name: '전통 관공서', sub: '전통 관공서(격식)', ed: 'staff', desc: '한지색 바탕 · 가운데 대칭 · 낙관 도장 · 두 줄 테두리 — 오래된 행정기관 · 공무원 교육원의 격식', tone: 'light', acc: '#1C2B4B', bg: '#F6F1E6', alt: '#EFE7D6', ink: '#1A1A1A', mu: '#4A4740', pt: '#9E2B25', r: 0, br: 0, sw2: '#F6F1E6', base: 'official' }),
    pbecon: Object.assign({}, L0, { name: '지역 상생', sub: '경제진흥원(기업 · 소상공인 지원)', ed: 'citizen', desc: '가게 · 공방 · 작은 회사 사진 세 장을 나란히 건 첫 화면, 사업 공고 목록 · 지원 대상별 갈래 — 경제진흥원 · 소상공인 지원센터 교육', tone: 'light', acc: '#0E6B4F', bg: '#FFFFFF', alt: '#F1F6F3', ink: '#0F1F19', mu: '#46564F', pt: '#F2B807', r: 14, br: 10, sw2: '#F1F6F3', base: 'clean', hk: 'cover' }),
    pbdigital: Object.assign({}, L0, { name: '디지털 그리드', sub: '정보 · 산업진흥원(디지털 · SW 인재)', ed: 'citizen', desc: '모눈 바탕 · 브라우저 창 속 사진 · 고정폭 글자 번호 — 정보 · 산업진흥원의 SW 인재 양성과 기업 재직자 교육', tone: 'light', acc: '#3A3FE8', bg: '#F6F7FB', alt: '#FFFFFF', ink: '#0B0D2A', mu: '#4A4E6A', pt: '#14C8B4', r: 12, br: 8, sw2: '#3A3FE8', base: 'clean', hk: 'cover' }),
    pbassoc: Object.assign({}, L0, { name: '회원 라운지', sub: '민간 협회(회원사 교육 · 세미나)', ed: 'citizen', desc: '세미나 사진 위로 기울어진 회원증 카드 · 버건디와 샴페인 금색 · 입장권 같은 세미나 일정 — 산업 협회 · 학회 · 단체의 회원사 교육', tone: 'light', acc: '#7A1F3D', bg: '#FBF8F4', alt: '#F3ECE4', ink: '#1E1215', mu: '#544449', pt: '#C9A86A', r: 18, br: 999, sw2: '#7A1F3D', base: 'warm' })
  };
  const tok = (hf, hw, h1, h1m, sec, secm, w) => ({ hf, hw, hls: -0.04, h1, h1m, lh1: 1.12, h2: 52, h2m: 32, h3: 22, body: 17, blh: 1.65, lead: 20, ey: { fs: 15, ls: 0, fw: 700, tt: 'none' }, sec, secm, w, gut: 40,
    r: 24, rs: 12, br: 999, bh: 52, bpx: 26, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' });
  const HD = { pbcivic: tok('sans', 800, 72, 40, 140, 80, 1200), pbjournal: tok('serif', 700, 70, 42, 150, 88, 1240), pbposter: tok('sans', 900, 88, 44, 150, 88, 1280), pbcampus: tok('sans', 800, 84, 42, 150, 88, 1240),
    pblibrary: tok('sans', 800, 76, 42, 150, 88, 1200), pbyouth: tok('sans', 900, 96, 44, 140, 88, 1240), pbsenior: tok('sans', 800, 72, 42, 140, 88, 1160), pbjobs: tok('sans', 800, 80, 42, 140, 88, 1240), pbmuseum: tok('serif', 600, 92, 44, 150, 96, 1280), pbheritage: tok('serif', 700, 66, 40, 140, 88, 1200),
    pbecon: tok('sans', 800, 80, 42, 140, 88, 1240), pbdigital: tok('sans', 800, 84, 42, 140, 88, 1240), pbassoc: tok('sans', 700, 76, 42, 150, 88, 1200) };
  const MINE = Object.keys(DEF);
  const mine = s => !!(s && s.theme && DEF[s.theme]);
  const thOf = s => (s && DEF[s.theme]) ? s.theme : 'pbcivic';
  const fits = id => ty() === 'public' && (DEF[id].ed === (ed() || 'staff') || (id === 'pbyouth' && ed() === 'facility'));
  const SERIFS = ['pbjournal', 'pbmuseum', 'pbheritage'];

  /* ── 공통 조각 ── */
  const btn = (cls, label, h, arrow) => label ? `<a class="p4-b ${cls}" ${aA(h)}>${E(label)}${arrow ? ic(arrow === 1 ? 'arrow' : arrow, 20, 2) : ''}</a>` : '';
  const heroBtns = (d, c1, c2, a1, a2) => `<div class="p4-cta">${btn(c1, d.cta, href(d.link, '#courses'), a1)}${btn(c2, d.cta2, href(d.link2, '#my'), a2)}</div>`;
  const ttl = (d, def) => NL(d.title || def || '');
  const head = (d, extra) => `${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h2 class="p4-h2">${ttl(d)}</h2>${d.sub ? `<p class="p4-sd">${E(d.sub)}</p>` : ''}${extra || ''}`;
  const sec = (x, s, kind, inner, cls) => mark(`<section class="hpt p4 ${thOf(s)} p4-${kind}${cls ? ' ' + cls : ''}">${inner}</section>`, x);
  const hsec = (th, inner, cls) => `<section class="hpt p4 ${th} p4-hero${cls ? ' ' + cls : ''}">${inner}</section>`;

  /* ── 첫 화면 10종 ── */
  const HERO = {
    /* 관공서: 공식 분할 — 왼쪽 글 · 오른쪽 사진과 기관색 블록 */
    pbcivic: (s, d) => { const p = slotP(s, 'hero', d, 'hum-51');
      return hsec('pbcivic', `<div class="p4w p4-g"><div>${d.eyebrow ? `<p class="p4-crumb">${E(d.eyebrow)}</p>` : ''}<h1>${NL(d.title)}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'sec', 1, 0)}${d.note ? `<p class="p4-note">${E(d.note)} <a href="#courses">교육과정 전체 보기</a></p>` : ''}</div>${p ? `<div class="p4-phw">${img(p, 'p4-ph', 1)}</div>` : ''}</div>`); },
    /* 시민 저널: 세리프 + 비대칭 사진 콜라주 */
    pbjournal: (s, d) => { const p1 = slotP(s, 'hero', d, 'sen-01'); const p2 = slotP(s, 'about', null, 'hum-26');
      return hsec('pbjournal', `<div class="p4w p4-g"><div>${d.eyebrow ? `<p class="p4-issue">${E(d.eyebrow)}</p>` : ''}<h1>${two(d.title, 'em')}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 1, 0)}</div>
<div class="p4-col">${img(p1, 'p4-c1', 1)}${img(p2, 'p4-c2')}${d.note ? `<p class="p4-cap">${E(d.note)}</p>` : ''}</div></div>`); },
    /* 시티 포스터: 전면 사진 + 아래쪽 초대형 고딕 */
    pbposter: (s, d) => { const p = slotP(s, 'hero', d, 'spo-08');
      return hsec('pbposter', `${img(p, 'p4-bg', 1)}<div class="p4-in"><div class="p4w">${d.eyebrow ? `<span class="p4-tag">${E(d.eyebrow)}</span>` : ''}<h1>${NL(d.title)}</h1><div class="p4-row">${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : '<span></span>'}${heroBtns(d, 'sig', 'wh', 1, 1)}</div></div></div>`); },
    /* 연수원: 다크 시네마틱 — 짙은 화면 오른쪽으로 사진이 번지고 왼쪽에 큰 제목 */
    pbcampus: (s, d) => { const p = slotP(s, 'hero', d, 'grp-01');
      return hsec('pbcampus', `${img(p, 'p4-bg', 1)}<div class="p4-in"><div class="p4w">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h1>${two(d.title, 'b')}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'gh', 1, 'chev')}</div></div>${d.note ? `<p class="p4-reel"><span>${E(d.note)}</span></p>` : ''}`); },
    /* 도서관: 왼쪽 아치형 열람실 사진 · 오른쪽 큰 제목 */
    pblibrary: (s, d) => { const p = slotP(s, 'hero', d, 'lib-08');
      return hsec('pblibrary', `<div class="p4w p4-g">${p ? `<div class="p4-arch">${img(p, 'p4-ph', 1)}</div>` : ''}<div class="p4-tx">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h1>${two(d.title, 'em')}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 1, 0)}${d.note ? `<p class="p4-note">${E(d.note)}</p>` : ''}</div></div>`); },
    /* 청소년 수련관: 보라 색면 + 기울어진 사진 스티커 3장 + 둥근 스티커 */
    pbyouth: (s, d) => { const p1 = slotP(s, 'hero', d, 'spo-03'); const p2 = slotP(s, 'about', null, 'hum-30'); const p3 = slotP(s, 'space', null, 'cam-07');
      return hsec('pbyouth', `<div class="p4w p4-g"><div class="p4-tx">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h1>${two(d.title, 'mark')}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'lime', 'wh', 1, 0)}</div>
<div class="p4-stk">${img(p1, 'p4-s1', 1)}${img(p2, 'p4-s2')}${img(p3, 'p4-s3')}${d.note ? `<p class="p4-dot">${NL(d.note)}</p>` : ''}</div></div>`); },
    /* 복지관 · 시니어: 위에 큰 사진, 아래로 겹친 큰 글씨 카드 · 큰 버튼 · 전화 */
    pbsenior: (s, d) => { const p = slotP(s, 'hero', d, 'sen-02'); const tel = telOf();
      return hsec('pbsenior', `${p ? img(p, 'p4-top', 1) : '<div class="p4-top p4-nop"></div>'}<div class="p4w"><div class="p4-card">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h1>${NL(d.title)}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}<div class="p4-cta">${btn('pri', d.cta, href(d.link, '#courses'), 1)}${tel ? `<a class="p4-b tel" href="tel:${E(tel)}">${ic('phone', 22, 2)}${E(d.cta2 || '전화로 신청')} ${E(tel)}</a>` : btn('line', '온라인으로 문의', '#comm', 0)}</div></div></div>`); },
    /* 일자리센터: 50:50 색면 분할 — 왼쪽 파란 면에 큰 제목, 오른쪽 사진 */
    pbjobs: (s, d) => { const p = slotP(s, 'hero', d, 'hum-50');
      return hsec('pbjobs', `<div class="p4-blk"><div class="p4-tx">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h1>${two(d.title, 'mark')}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'wh', 'ol', 1, 0)}</div></div>${p ? img(p, 'p4-side', 1) : ''}`); },
    /* 박물관: 위에 초대형 세리프 제목, 아래 흰 벽에 건 액자 사진과 명판 */
    pbmuseum: (s, d) => { const p = slotP(s, 'hero', d, 'hum-22');
      return hsec('pbmuseum', `<div class="p4w p4-top"><h1>${two(d.title, 'em')}</h1><div class="p4-side">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 1, 0)}</div></div>
<div class="p4-wall"><div class="p4w">${p ? `<div class="p4-frame">${img(p, 'p4-ph', 1)}</div>` : ''}${d.note ? `<div class="p4-plq"><b>${E(String(d.note).split('\n')[0])}</b>${String(d.note).split('\n')[1] ? `<span>${E(String(d.note).split('\n').slice(1).join(' '))}</span>` : ''}</div>` : ''}</div></div>`); },
    /* 전통 관공서: 가운데 대칭 · 낙관 도장 · 두 줄 테두리 파노라마 */
    pbheritage: (s, d) => { const p = slotP(s, 'hero', d, 'nat-01'); const ch = String(org() || '교').replace(/\s/g, '').slice(0, 1);
      return hsec('pbheritage', `<div class="p4w p4-c"><div class="p4-seal" aria-hidden="true"><span>${E(ch)}</span></div>${d.eyebrow ? `<p class="p4-ey"><span>${E(d.eyebrow)}</span></p>` : ''}<h1>${NL(d.title)}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 0, 0)}</div>${p ? `<div class="p4w"><div class="p4-pano">${img(p, 'p4-ph', 1)}</div></div>` : ''}`); },
    /* 경제진흥원: 위 큰 제목 · 아래 가게 · 공방 · 회사 사진 세 장(트립틱) */
    pbecon: (s, d) => { const P = [slotP(s, 'hero', d, 'bar-03'), slotP(s, 'about', null, 'bak-03'), slotP(s, 'space', null, 'hum-49')].filter(Boolean);
      return hsec('pbecon', `<div class="p4w p4-top"><div>${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h1>${two(d.title, 'em')}</h1></div><div class="p4-side">${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 1, 0)}</div></div>${P.length ? `<div class="p4w"><div class="p4-tri n${P.length}">${P.map((p, i) => img(p, 'p4-t' + i, !i)).join('')}${d.note ? `<p class="p4-badge">${NL(d.note)}</p>` : ''}</div></div>` : ''}`); },
    /* 정보 · 산업진흥원: 모눈 바탕 · 큰 제목 · 브라우저 창 속 사진 */
    pbdigital: (s, d) => { const p = slotP(s, 'hero', d, 'hum-41');
      return hsec('pbdigital', `<div class="p4w p4-g"><div class="p4-tx">${d.eyebrow ? `<p class="p4-ey"><span>&gt;_</span>${E(d.eyebrow)}</p>` : ''}<h1>${two(d.title, 'mark')}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 1, 0)}</div>${p ? `<div class="p4-win"><div class="p4-bar" aria-hidden="true"><i></i><i></i><i></i><span>${E(d.note || 'learn.' + (String(org()).replace(/\s/g, '').slice(0, 8) || 'org'))}</span></div>${img(p, 'p4-ph', 1)}</div>` : ''}</div>`); },
    /* 민간 협회: 세미나 사진 위로 기울어진 회원증 카드 */
    pbassoc: (s, d) => { const p = slotP(s, 'hero', d, 'hum-11'); const nm = org() || '협회';
      return hsec('pbassoc', `<div class="p4w p4-g"><div class="p4-tx">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h1>${two(d.title, 'em')}</h1>${d.sub ? `<p class="p4-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 1, 0)}</div><div class="p4-stage">${img(p, 'p4-ph', 1)}<div class="p4-card" aria-hidden="true"><p class="p4-k">MEMBERSHIP</p><b>${E(nm)}</b><p class="p4-cl">${E(d.note || '회원사 교육 · 세미나')}</p><span class="p4-chip"></span></div></div></div>`); }
  };

  /* ── 섹션 ── */
  const SEC = {};
  /* 2열 이야기 + 3단계 */
  SEC['p4-story'] = (x, s) => { const d = x.data || {}; const th = thOf(s); const cols = (d.cols || []).filter(c => c && c[0]).slice(0, 4); const FB = { pbjournal: 'hum-05', pbcivic: 'lec-01', pblibrary: 'hum-12', pbyouth: 'grp-06', pbsenior: 'kni-03', pbmuseum: 'hum-28', pbheritage: 'lib-06', pbassoc: 'grp-03' };
    const p = slotP(s, th === 'pbjournal' ? 'cta' : 'about', null, FB[th] || 'hum-10'); const noImg = th === 'pbyouth';
    return sec(x, s, 'story', `<div class="p4w${noImg ? '' : ' p4-sg2'}">${noImg ? '' : img(p)}<div>${head(d)}<ol class="p4-steps n${cols.length}">${cols.map((c, i) => `<li><span class="p4-n">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div></li>`).join('')}</ol></div></div>`); };
  /* 인용 후기 하나(실제 후기만) */
  SEC['p4-quote'] = (x, s) => { const r = review(); if (!r) return empty(x, '실제 수강 후기(15자 이상 · 별 4개 이상)가 생기면 여기에 크게 보여요.'); const th = thOf(s); const serif = SERIFS.includes(th);
    return sec(x, s, 'quote', `<div class="p4w">${serif ? '<div class="p4-mk" aria-hidden="true">“</div>' : ''}<blockquote>${serif ? '' : '“'}${E(r.body.slice(0, 120))}${serif ? '' : '”'}</blockquote><p class="p4-who">${!serif ? '<i aria-hidden="true">' + E((r.cls || org()).slice(0, 1)) + '</i>' : ''}<span><b>수강생</b>${r.cls ? ` · ${E(r.cls)}` : ''}</span></p></div>`); };
  /* 두 갈래: cols = [제목, 설명, 링크, 머리말, 버튼] */
  SEC['p4-duo'] = (x, s) => { const d = x.data || {}; const th = thOf(s); const C = (d.cols || []).filter(c => c && c[0]).slice(0, 2); if (!C.length) return empty(x);
    return sec(x, s, 'duo', `<div class="p4w p4-dg">${C.map((c, i) => `<a class="p4-pn p${i}" ${aA(href(c[2], i ? '#courses' : '#my'))}><div>${c[3] ? `<p class="p4-k">${E(c[3])}</p>` : ''}<h3>${NL(c[0])}${th === 'pbposter' ? ic('arrow', 48, 1.75) : ''}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div>${c[4] ? `<span class="p4-pb">${E(c[4])}${ic('arrow', 20, 1.8)}</span>` : ''}</a>`).join('')}</div>`); };
  /* 시민 저널: 접수 띠 */
  SEC['p4-rail'] = (x, s) => { const d = x.data || {}; const L = list(12); const nx = L.filter(c => okD(c.start) && days(tday(), c.start) >= 0).sort((a, b) => a.start.localeCompare(b.start))[0]; const tel = telOf();
    const big = d.title || (nx ? `${mdd(nx.start)} 개강` : L.length ? `지금 신청할 수 있는 강좌 ${L.length}개` : ''); if (!big) return empty(x);
    return sec(x, s, 'rail', `<div class="p4w"><b class="p4-d">${E(big)}</b><p>${E(d.sub || `${org()} 주민이라면 누구나 신청할 수 있어요.`)}${tel ? ` · 전화 신청 <a href="tel:${E(tel)}">${E(tel)}</a>` : ''}</p><a class="p4-go" href="#courses">강좌 신청하기 ${ic('chev', 18, 2)}</a></div>`); };
  /* 시민 저널: 잡지형 강좌 3개 */
  SEC['p4-mag'] = (x, s) => { const d = x.data || {}; const L = list(3); if (!L.length) return empty(x);
    return sec(x, s, 'mag', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#courses">강좌 ${list(40).length}개 전체 보기 →</a></div><div class="p4-ml">${L.map((c, i) => `<a class="p4-art${i ? '' : ' p4-lg'}" ${aA(cH(c))}>${img(clsP(c, i, ['cam-07', 'hum-24', 'pho-01']))}<div class="p4-ab"><p class="p4-cat">${E(kindL(c))} <span>${E(hrs(c) || whenL(c))}</span></p><h3>${E(c.name)}</h3>${!i && c.teacher ? `<p class="p4-ad">${E(c.teacher)}와 함께해요. 자세한 일정은 강좌 안내에서 확인해요.</p>` : ''}<p class="p4-meta"><span>${E(whenL(c))}</span><b>${E(priceL(c))}</b></p></div></a>`).join('')}</div></div>`); };
  /* 시민 저널: 사진 띠(무료 강좌 수 — 실제 계산) */
  SEC['p4-band'] = (x, s) => { const d = x.data || {}; const L = list(40); if (!L.length) return empty(x); const fr = L.filter(c => !+c.price).length; const p = slotP(s, 'space', null, 'hum-13');
    const t = d.title || (fr && fr < L.length ? `강좌 ${L.length}개 중 ${fr}개는\n무료로 열려요.` : fr ? `지금 열린 강좌 ${L.length}개,\n모두 무료예요.` : `지금 열린 강좌\n${L.length}개를 만나 보세요.`);
    return sec(x, s, 'band', `${img(p, 'p4-bg')}<div class="p4-in"><div class="p4w"><div class="p4-bt"><h2>${NL(t)}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div></div></div>`); };
  /* 마지막 행동 띠 */
  SEC['p4-fin'] = (x, s) => { const d = x.data || {}; const tel = telOf();
    return sec(x, s, 'fin', `<div class="p4w p4-fg"><div><h2>${ttl(d, '배우고 싶은 강좌를\n지금 찾아보세요.')}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div><div class="p4-acts"><a class="p4-b wh" href="#courses">${E(d.cta || '강좌 찾아보기')}<span>→</span></a>${tel ? `<a class="p4-b ol" href="tel:${E(tel)}">전화 문의 ${E(tel)}<span>→</span></a>` : `<a class="p4-b ol" href="#notice">공지 보기<span>→</span></a>`}</div></div>`); };
  /* 시티 포스터: 한 줄 바로 가기 */
  SEC['p4-quick'] = (x, s) => { const F = facs().filter(f => f.kind === 'time'); const f0 = F[0]; const hr = f0 && f0.hours && f0.hours[1];
    const Q = [['오늘 운영', hr ? `${hr[0]} – ${hr[1]}` : '운영 시간 안내', '#fac'], ['시설 예약', F.slice(0, 2).map(f => f.name).join(' · ') || '빈 시간 보기', '#fac'], ['강습 · 이용권', '등록 · 결제', '#shop'], ['공지 · 휴관', '휴관일 안내', '#notice']];
    return sec(x, s, 'quick', `<div class="p4w p4-qg">${Q.map(q => `<a href="${q[2]}"><div>${E(q[0])}<span>${E(q[1])}</span></div>${ic('chev', 22, 2)}</a>`).join('')}</div>`); };
  /* 시티 포스터: 큰 운영 시간 + 표(실제 시설 시간) */
  SEC['p4-hours'] = (x, s) => { const d = x.data || {}; const F = facs().filter(f => f.kind === 'time' && f.hours); const f0 = F[0]; if (!f0) return empty(x);
    const h = k => (f0.hours || {})[k]; const wk = h(1) || h(2); if (!wk) return empty(x); const hh = t => String(t || '').slice(0, 2);
    const cl = (f0.closed || [])[0]; const tel = telOf(); const row = (b, v, sm) => `<div><b>${E(b)}</b><span>${E(v)}</span>${sm ? `<small>${E(sm)}</small>` : ''}</div>`;
    return sec(x, s, 'hours', `<div class="p4w p4-hg"><div class="p4-num">${E(hh(wk[0]))}<em>—</em>${E(hh(wk[1]))}</div><div class="p4-tx"><p class="p4-idx">운영 시간</p><h3>${E(d.title || '출근 전에도, 퇴근 후에도 열려 있어요.')}</h3><p>${E(d.sub || `${f0.name} 기준이에요. 시설마다 운영 시간이 조금씩 달라요.`)}</p></div>
<div class="p4-tb">${row('평일', `${wk[0]} – ${wk[1]}`)}${row('토요일', h(6) ? `${h(6)[0]} – ${h(6)[1]}` : '휴관')}${row('일요일 · 공휴일', h(0) ? `${h(0)[0]} – ${h(0)[1]}` : '휴관')}${row(cl ? '휴관 안내' : '문의', cl ? `${dot(cl.from)} ${cl.reason || '휴관'}` : tel || '프런트 문의', cl ? '공지에서 자세히 안내해요' : '')}</div></div>`); };
  /* 시티 포스터: 시설 그리드(실제 시설 · 없으면 강좌) */
  SEC['p4-places'] = (x, s) => { const d = x.data || {}; const F = facs().slice(0, 5); const POOL = ['spo-07', 'spo-04', 'yog-03', 'mus-06', 'sem-01'];
    const items = F.length ? F.map((f, i) => ({ n: f.name, sub: [f.place, f.kind === 'time' ? (f.approval ? '승인 후 확정' : '바로 예약') : f.kind === 'pass' ? '이용권' : '대여', +f.capacity > 0 ? `최대 ${+f.capacity}명` : ''].filter(Boolean).join(' · '), h: '#fac', p: facP(f, i, POOL) }))
      : list(5).map((c, i) => ({ n: c.name, sub: [kindL(c), whenL(c)].join(' · '), h: cH(c), p: stk(POOL[i % POOL.length]) }));
    if (!items.length) return empty(x);
    return sec(x, s, 'places', `<div class="p4w"><div class="p4-ph2"><div><p class="p4-idx">${E(d.eyebrow || '시설과 프로그램')}</p><h2 class="p4-h2">${ttl(d)}</h2></div><a class="p4-more" href="${F.length ? '#fac' : '#courses'}">${F.length ? '시설 예약하기' : '프로그램 전체 보기'} ${ic('arrow', 22, 2)}</a></div>
<div class="p4-pg n${items.length}">${items.map((it, i) => `<a class="p4-pl${i ? '' : ' p4-lg'}" ${aA(it.h)}>${img(it.p)}<div class="p4-cap"><span class="p4-no">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(it.n)}</h3><p>${E(it.sub)}</p></div></div></a>`).join('')}</div></div>`); };
  /* 시티 포스터: 대관 */
  SEC['p4-rent'] = (x, s) => { const d = x.data || {}; const F = facs().filter(f => f.approval || /대관|강당|체육관|세미나/.test(f.name)); const cols = (d.cols || []).filter(c => c && c[0]).slice(0, 3); const p = slotP(s, 'about', null, 'lec-02');
    if (!facs().length) return empty(x);
    return sec(x, s, 'rent', `<div class="p4w p4-sg2">${img(p)}<div><p class="p4-idx">${E(d.eyebrow || '단체 대관')}</p><h2 class="p4-h2">${ttl(d)}</h2>${d.sub || F.length ? `<p class="p4-sd">${E(d.sub || '')}${F.length ? ` 대관할 수 있는 시설: ${E(F.slice(0, 3).map(f => f.name).join(' · '))}.` : ''}</p>` : ''}<ol class="p4-rs">${cols.map((c, i) => `<li><span class="p4-n">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div></li>`).join('')}</ol><a class="p4-b sig" href="#fac">대관 가능한 시간 보기${ic('arrow', 20, 2)}</a></div></div>`); };
  /* 관공서 · 전통 관공서: 자주 찾는 서비스(실제 경로) */
  SEC['p4-svc'] = (x, s) => { const d = x.data || {}; const L = live(); const lg = L.filter(c => c.legal).length;
    const S6 = [['법정 의무교육 이수', lg ? `${lg}과목 · 내 이수 현황` : '내 이수 현황 확인', '#my'], ['교육 신청 · 취소', '신청 내역과 승인 상태', '#courses'], ['이수증 발급', 'PDF로 바로 내려받기', '#badges'], ['교육 일정표', '월별 집합 · 사이버 교육', '#cal'], ['강의실 · 세미나실 대관', '부서 교육 · 워크숍', '#fac'], ['알림마당', '공지 · 교육 안내', '#notice']];
    const F = facs().length ? S6 : S6.filter(q => q[2] !== '#fac');
    return sec(x, s, 'svc', `<div class="p4w">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h2 class="p4-h2">${ttl(d, '자주 찾는 서비스')}</h2><div class="p4-sv">${F.map((q, i) => `<a href="${q[2]}"><div>${thOf(s) === 'pbheritage' ? `<i>${String(i + 1).padStart(2, '0')}</i>` : ''}<b>${E(q[0])}</b><span>${E(q[1])}</span></div>${ic('chev', 20, 2)}</a>`).join('')}</div></div>`); };
  /* 날짜 열 교육 목록(관공서 · 도서관 · 박물관 · 전통 관공서) */
  SEC['p4-rows'] = (x, s) => { const d = x.data || {}; const L = list(5); if (!L.length) return empty(x); const t = tday(); const stf = staffOrg();
    const st = c => { const n = okD(c.end) ? days(t, c.end) : null; return n != null && n <= 14 ? ['n', '마감 임박'] : okD(c.start) && days(t, c.start) > 0 ? ['', '접수 중'] : ['', '수강 중']; };
    return sec(x, s, 'rows', `<div class="p4w">${head(d)}<div class="p4-ls">${L.map(c => { const k = st(c); const sd = okD(c.start) && days(t, c.start) > 0 ? c.start : c.end; return `<a class="p4-rw" ${aA(cH(c))}><div class="p4-dt"><b>${okD(sd) ? E(dot(sd)) : '상시'}</b><small>${E(okD(sd) ? (sd === c.start ? '시작' : '마감') : '온라인')}${okD(sd) ? ' · ' + DOW[new Date(sd + 'T00:00:00').getDay()] : ''}</small></div><div><h3>${E(c.name)}</h3><p>${E([c.legal ? '법정 의무교육' : kindL(c), c.teacher].filter(Boolean).join(' · '))}</p></div><div class="p4-mt">${E([c.kind === 'episode' ? (stf ? '집합 교육' : '현장 강좌') : (stf ? '사이버 교육' : '온라인 강좌'), hrs(c)].filter(Boolean).join(' · '))}<br>${E(stf ? (okD(c.end) ? `${md(c.end)}까지` : '상시') : priceL(c))}</div><span class="p4-tag ${k[0]}">${k[1]}</span></a>`; }).join('')}</div><a class="p4-more" href="#courses">${E(stf ? '전체 교육과정 보기' : '전체 강좌 보기')} ${ic('chev', 18, 2)}</a></div>`); };
  /* 숫자 띠: 실제 값만 */
  /* 숫자 띠: 자랑할 만한 실제 값만(v44 검수) — 과정 10개 이상 · 수강 인원 100명 이상 · 이수율 60% 이상(인원 100명 이상일 때). 두 개 미만이면 섹션을 숨긴다 */
  const FIG = { course: 10, people: 100, rate: 60 };
  const figsK = () => { const L = live(); const n = learners(); const stf = staffOrg(); const lg = rateOf(L.filter(c => c.legal)); const ra = lg && lg.n >= FIG.people ? lg : rateOf(L);
    return [L.length >= FIG.course ? [L.length, '개', stf ? '운영 중인 과정' : '운영 중인 교육'] : null, n >= FIG.people ? [n, '명', '수강 중인 인원'] : null, n >= FIG.people && ra && ra.n >= FIG.people && ra.r >= FIG.rate ? [ra.r, '%', lg && ra === lg ? '법정 교육 이수율' : '전체 과정 이수율'] : null].filter(Boolean); };
  SEC['p4-figs'] = (x, s) => { const d = x.data || {}; const K = figsK(); if (K.length < 2) return empty(x, '과정 10개 · 수강 인원 100명 이상처럼 내세울 만한 실제 숫자가 2개 이상 생기면 게시본에 보여요.');
    return sec(x, s, 'figs', `<div class="p4w">${d.eyebrow ? `<p class="p4-ft">${E(d.eyebrow)}</p>` : ''}<div class="p4-fg n${K.length}">${d.title ? `<h2 class="p4-h2">${ttl(d)}</h2>` : ''}${K.map(k => `<div class="p4-fk"><div class="p4-n">${k[0].toLocaleString('ko-KR')}<small>${k[1]}</small></div><p>${E(k[2])}</p></div>`).join('')}</div></div>`); };
  /* 알림마당 + 문의 상자 */
  SEC['p4-help'] = (x, s) => { const d = x.data || {}; const N = notes(4); const tel = telOf();
    return sec(x, s, 'help', `<div class="p4w p4-hg2"><div><h2 class="p4-h2">${ttl(d, '알림마당')}</h2>${N.length ? `<ul class="p4-nt">${N.map(n => `<li><a href="#notice">${E(n.title)}</a><time>${E(String(n.at || '').slice(0, 10).replace(/-/g, '.'))}</time></li>`).join('')}</ul>` : `<p class="p4-none">새 공지가 올라오면 여기에 차례로 보여요. <a href="#notice">알림마당 가기</a></p>`}</div>
<div class="p4-call"><h3>${E(d.sub || '교육 신청이 어려우신가요?')}</h3>${tel ? `<a class="p4-tel" href="tel:${E(tel)}">${E(tel)}</a><p>${E(d.hours || '평일 09:00 – 18:00')}</p>` : '<p>담당자에게 온라인으로 문의를 남겨 주세요.</p>'}<a class="p4-b sec" href="#comm">온라인 문의 남기기</a></div></div>`); };

  /* ── 새 섹션 ── */
  /* 연수원: 짙은 바탕 선언문 + 원칙 3 */
  SEC['p4-intro'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 3);
    return sec(x, s, 'intro', `<div class="p4w">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<h2 class="p4-mani">${two(d.title, 'b')}</h2>${C.length ? `<div class="p4-cols n${C.length}">${C.map((c, i) => `<div><p class="p4-no">${String(i + 1).padStart(2, '0')}</p><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div>`).join('')}</div>` : ''}</div>`); };
  /* 연수원: 번호 붙은 과정 줄(실제 과정) */
  SEC['p4-tracks'] = (x, s) => { const d = x.data || {}; const L = list(5); if (!L.length) return empty(x);
    return sec(x, s, 'tracks', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#courses">전체 과정 ${live().length}개 ${ic('arrow', 20, 2)}</a></div><div class="p4-tl">${L.map((c, i) => `<a class="p4-tr" ${aA(cH(c))}><span class="p4-no">${String(i + 1).padStart(2, '0')}</span><div class="p4-tn"><h3>${E(c.name)}</h3><p>${E([c.legal ? '법정 의무교육' : kindL(c), c.teacher, hrs(c)].filter(Boolean).join(' · '))}</p></div><span class="p4-when">${E(whenL(c))}</span>${img(clsP(c, i, ['lec-03', 'cor-07', 'hum-11', 'cor-14', 'sem-01']), 'p4-th')}</a>`).join('')}</div></div>`); };
  /* 연수원: 연수 시설(실제 시설) */
  SEC['p4-stay'] = (x, s) => { const d = x.data || {}; const F = facs().slice(0, 4); if (!F.length) return empty(x); const POOL = ['lec-03', 'sem-01', 'off-03', 'cor-09'];
    return sec(x, s, 'stay', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#fac">시설 예약하기 ${ic('arrow', 20, 2)}</a></div><div class="p4-mo n${F.length}">${F.map((f, i) => `<a class="p4-st${i ? '' : ' p4-lg'}" href="#fac">${img(facP(f, i, POOL))}<div class="p4-cap"><h3>${E(f.name)}</h3><p>${E([f.place, +f.capacity > 0 ? `최대 ${+f.capacity}명` : '', f.approval ? '승인 후 확정' : '바로 예약'].filter(Boolean).join(' · '))}</p></div></a>`).join('')}</div></div>`); };
  /* 도서관: 대출 카드 같은 강좌 카드(실제 강좌) */
  SEC['p4-shelf'] = (x, s) => { const d = x.data || {}; const L = list(4); if (!L.length) return empty(x);
    return sec(x, s, 'shelf', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#courses">강좌 전체 보기 ${ic('arrow', 20, 2)}</a></div><div class="p4-cards n${L.length}">${L.map((c, i) => `<a class="p4-lc" ${aA(cH(c))}><p class="p4-no"><span>강좌 카드</span><b>No. ${String(i + 1).padStart(3, '0')}</b></p><h3>${E(c.name)}</h3><dl><div><dt>일정</dt><dd>${E(whenL(c))}</dd></div><div><dt>방식</dt><dd>${E(c.kind === 'episode' ? '도서관 현장' : '온라인')}${hrs(c) ? ' · ' + E(hrs(c)) : ''}</dd></div><div><dt>수강료</dt><dd>${E(priceL(c))}</dd></div></dl><span class="p4-go">자세히 보기 ${ic('arrow', 18, 2)}</span></a>`).join('')}</div></div>`); };
  /* 청소년: 기울어진 색 카드(실제 프로그램) */
  SEC['p4-tiles'] = (x, s) => { const d = x.data || {}; const L = list(4); if (!L.length) return empty(x);
    return sec(x, s, 'tiles', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#courses">프로그램 전체 ${ic('arrow', 20, 2)}</a></div><div class="p4-tg n${L.length}">${L.map((c, i) => `<a class="p4-tile t${i % 4}" ${aA(cH(c))}>${img(clsP(c, i, ['spo-04', 'cod-03', 'hum-40', 'mus-05']))}<p class="p4-k">${E(priceL(c))} · ${E(c.kind === 'episode' ? '수련관에서' : '온라인')}</p><h3>${E(c.name)}</h3><p class="p4-w2">${E(whenL(c))}</p></a>`).join('')}</div></div>`); };
  /* 청소년: 큰 글자 벽(실제 프로그램 이름) */
  SEC['p4-words'] = (x, s) => { const d = x.data || {}; const L = list(8); if (L.length < 2) return empty(x);
    return sec(x, s, 'words', `<div class="p4w">${d.eyebrow ? `<p class="p4-ey">${E(d.eyebrow)}</p>` : ''}<p class="p4-wall">${L.map((c, i) => `<a ${aA(cH(c))} class="${i % 2 ? 'o' : 'f'}">${E(short(c.name))}</a>`).join('<i aria-hidden="true">✦</i>')}</p></div>`); };
  /* 시니어: 전화 신청 띠 */
  SEC['p4-call'] = (x, s) => { const d = x.data || {}; const tel = telOf();
    return sec(x, s, 'call', `<div class="p4w p4-cg"><div><h2>${ttl(d, '인터넷이 어려우면\n전화로 신청하세요.')}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div>${tel ? `<a class="p4-tel" href="tel:${E(tel)}">${ic('phone', 40, 2)}<span><small>${E(d.hours || '평일 09:00 – 18:00')}</small>${E(tel)}</span></a>` : `<a class="p4-b wh" href="#comm">온라인으로 문의하기${ic('arrow', 22, 2)}</a>`}</div>`); };
  /* 시니어: 큰 글씨 강좌 목록(실제 강좌) */
  SEC['p4-big'] = (x, s) => { const d = x.data || {}; const L = list(4); if (!L.length) return empty(x);
    return sec(x, s, 'big', `<div class="p4w">${head(d)}<div class="p4-bl">${L.map((c, i) => `<a class="p4-br" ${aA(cH(c))}>${img(clsP(c, i, ['mus-03', 'sen-04', 'hum-28', 'sen-07']))}<div><h3>${E(c.name)}</h3><p>${E([whenL(c), c.kind === 'episode' ? '복지관에서' : '집에서 온라인'].join(' · '))}</p><p class="p4-pr">${E(priceL(c))}</p></div><span class="p4-go">자세히 보기${ic('arrow', 22, 2)}</span></a>`).join('')}</div><a class="p4-b line p4-all" href="#courses">강좌 전체 보기${ic('arrow', 22, 2)}</a></div>`); };
  /* 일자리센터: 상담부터 취업까지 단계 */
  SEC['p4-flow'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 4); if (!C.length) return empty(x);
    return sec(x, s, 'flow', `<div class="p4w">${head(d)}<ol class="p4-fl n${C.length}">${C.map((c, i) => `<li><span class="p4-n">${i + 1}</span><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</li>`).join('')}</ol></div>`); };
  /* 일자리센터: 넓은 과정 카드(실제 과정) */
  SEC['p4-wide'] = (x, s) => { const d = x.data || {}; const L = list(4); if (!L.length) return empty(x);
    return sec(x, s, 'wide', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#courses">교육 전체 보기 ${ic('arrow', 20, 2)}</a></div><div class="p4-wg n${L.length}">${L.map((c, i) => `<a class="p4-wc" ${aA(cH(c))}>${img(clsP(c, i, ['cor-06', 'lap-03', 'doc-01', 'log-01']))}<div class="p4-wb"><p class="p4-k">${E(c.kind === 'episode' ? '집합 교육' : '온라인 교육')}${hrs(c) ? ' · ' + E(hrs(c)) : ''}</p><h3>${E(c.name)}</h3><p>${E([whenL(c), priceL(c)].join(' · '))}</p><span class="p4-go">과정 보기${ic('arrow', 18, 2)}</span></div></a>`).join('')}</div></div>`); };
  /* 일자리센터: 큰 사진 위 한 문장 + 상담 버튼(숫자 없음) */
  SEC['p4-pull'] = (x, s) => { const d = x.data || {}; const p = slotP(s, 'about', null, 'shk-01'); const tel = telOf();
    return sec(x, s, 'pull', `${img(p, 'p4-bg')}<div class="p4-in"><div class="p4w"><h2>${ttl(d, '상담부터\n시작해요.')}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}<div class="p4-cta">${btn('wh', d.cta || '상담 문의하기', href(d.link, '#comm'), 1)}${tel ? `<a class="p4-b ol" href="tel:${E(tel)}">${ic('phone', 20, 2)}${E(tel)}</a>` : ''}</div></div></div>`); };
  /* 박물관: 전시 명판형 프로그램(실제 강좌) */
  SEC['p4-exhibit'] = (x, s) => { const d = x.data || {}; const L = list(3); if (!L.length) return empty(x);
    return sec(x, s, 'exhibit', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#courses">프로그램 전체 보기 ${ic('arrow', 20, 2)}</a></div><div class="p4-ex n${L.length}">${L.map((c, i) => `<a class="p4-xi${i ? '' : ' p4-lg'}" ${aA(cH(c))}>${img(clsP(c, i, ['art-06', 'pho-02', 'lib-06']))}<div class="p4-lb"><p class="p4-no">No. ${String(i + 1).padStart(2, '0')}</p><h3>${E(c.name)}</h3><dl><div><dt>방식</dt><dd>${E(c.kind === 'episode' ? '교육실 현장' : '온라인')}</dd></div><div><dt>일정</dt><dd>${E(whenL(c))}</dd></div><div><dt>참가비</dt><dd>${E(priceL(c))}</dd></div></dl></div></a>`).join('')}</div></div>`); };
  /* 경제진흥원: 사업 공고(실제 공지) */
  SEC['p4-ann'] = (x, s) => { const d = x.data || {}; const N = notes(5); if (!N.length) return empty(x, '공지에 사업 공고를 올리면 여기에 최신 순으로 보여요.');
    return sec(x, s, 'ann', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#notice">공고 전체 보기 ${ic('arrow', 20, 2)}</a></div><ul class="p4-al">${N.map((n, i) => `<li><a href="#notice"><span class="p4-tg">${i ? '안내' : '새 공고'}</span><b>${E(n.title)}</b><time>${E(String(n.at || '').slice(0, 10).replace(/-/g, '.'))}</time>${ic('chev', 20, 2)}</a></li>`).join('')}</ul></div>`); };
  /* 경제진흥원: 지원 대상별 갈래(편집 문구) — cols = [대상, 설명, 링크] */
  SEC['p4-tiers'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 3); if (!C.length) return empty(x);
    return sec(x, s, 'tiers', `<div class="p4w">${head(d)}<div class="p4-tz n${C.length}">${C.map((c, i) => `<a class="p4-ti t${i}" ${aA(href(c[2], '#courses'))}><span class="p4-no">${String(i + 1).padStart(2, '0')}</span><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}<span class="p4-go">교육 보기 ${ic('arrow', 18, 2)}</span></a>`).join('')}</div></div>`); };
  /* 정보 · 산업진흥원: 고정폭 번호 과정 카드(실제 과정) */
  SEC['p4-code'] = (x, s) => { const d = x.data || {}; const L = list(6); if (!L.length) return empty(x);
    return sec(x, s, 'code', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#courses">과정 전체 보기 ${ic('arrow', 20, 2)}</a></div><div class="p4-cg n${Math.min(L.length, 3)}">${L.map((c, i) => `<a class="p4-cc" ${aA(cH(c))}><p class="p4-id">#${String(i + 1).padStart(2, '0')}<span>${E(c.kind === 'episode' ? 'OFFLINE' : 'ONLINE')}</span></p><h3>${E(c.name)}</h3><p>${E([hrs(c), whenL(c)].filter(Boolean).join(' · '))}</p><p class="p4-pr">${E(priceL(c))}</p></a>`).join('')}</div></div>`); };
  /* 정보 · 산업진흥원: 두 대상(청년 인재 · 재직자) — cols = [대상, 설명, 링크, 버튼] */
  SEC['p4-dual'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 2); if (!C.length) return empty(x);
    return sec(x, s, 'dual', `<div class="p4w">${head(d)}<div class="p4-du">${C.map((c, i) => `<a class="p4-dc d${i}" ${aA(href(c[2], '#courses'))}><p class="p4-id">${i ? 'FOR_WORKERS' : 'FOR_TALENT'}</p><h3>${NL(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}<span class="p4-go">${E(c[3] || '과정 보기')}${ic('arrow', 18, 2)}</span></a>`).join('')}</div></div>`); };
  /* 민간 협회: 회원 혜택(편집 문구) — cols = [혜택, 설명] */
  SEC['p4-member'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 3); if (!C.length) return empty(x);
    return sec(x, s, 'member', `<div class="p4w p4-mg"><div>${head(d)}<div class="p4-cta">${btn('pri', d.cta || '회원 로그인', href(d.link, '#login'), 1)}${btn('line', d.cta2 || '회원 가입', href(d.link2, '#join'), 0)}</div></div><ul class="p4-bn">${C.map((c, i) => `<li><span class="p4-no">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div></li>`).join('')}</ul></div>`); };
  /* 민간 협회: 입장권 같은 세미나 · 교육 일정(실제 과정) */
  SEC['p4-ticket'] = (x, s) => { const d = x.data || {}; const L = list(4); if (!L.length) return empty(x); const t = tday();
    return sec(x, s, 'ticket', `<div class="p4w"><div class="p4-sh"><div>${head(d)}</div><a class="p4-more" href="#cal">교육 일정 보기 ${ic('arrow', 20, 2)}</a></div><div class="p4-tk">${L.map(c => { const sd = okD(c.start) && days(t, c.start) > 0 ? c.start : okD(c.end) ? c.end : ''; return `<a class="p4-tc" ${aA(cH(c))}><div class="p4-stub">${sd ? `<b>${E(String(+sd.slice(8, 10)))}</b><span>${E(+sd.slice(5, 7) + '월')} · ${E(sd === c.start ? '시작' : '마감')}</span>` : '<b>상시</b><span>온라인</span>'}</div><div class="p4-tb"><p class="p4-k">${E(c.kind === 'episode' ? '세미나 · 집합 교육' : '온라인 교육')}</p><h3>${E(c.name)}</h3><p>${E([hrs(c), priceL(c)].filter(Boolean).join(' · '))}</p></div><span class="p4-go">${ic('arrow', 22, 2)}</span></a>`; }).join('')}</div></div>`); };
  /* 전통 관공서: 교육 이념 3 */
  SEC['p4-vals'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 3); const HN = ['一', '二', '三'];
    return sec(x, s, 'vals', `<div class="p4w p4-c">${d.eyebrow ? `<p class="p4-ey"><span>${E(d.eyebrow)}</span></p>` : ''}<h2 class="p4-h2">${ttl(d)}</h2><div class="p4-vg n${C.length}">${C.map((c, i) => `<div><p class="p4-hn" aria-hidden="true">${HN[i]}</p><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div>`).join('')}</div></div>`); };

  /* ── CSS ── */
  const SERIF = "'Noto Serif KR','Noto Serif KR Fallback','Noto Serif CJK KR','Nanum Myeongjo','AppleMyungjo',serif";
  function css(s) { const th = thOf(s); const T = HPT.tokens(s) || {}; const D = DEF[th]; const a = T.a || D.acc;
    const onA = HPT.onColor ? HPT.onColor(a) : '#fff'; const dark = D.tone === 'dark'; const at = fit(a, D.bg, 4.6); const pt = D.pt;
    const nm = String(org()).replace(/["\\\n]/g, ''); const ln = al(D.ink, .14);
    let x = `/* hp44-public */
.p4{--a:${a};--on:${onA};--at:${at};--pt:${pt};--bg:${D.bg};--alt:${D.alt};--ink:${D.ink};--mu:${fit(D.mu, D.alt, 4.6)};--ln:${ln};font-family:Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;color:var(--ink);background:var(--bg);font-size:17px;line-height:1.65;letter-spacing:-.01em;word-break:keep-all;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;padding:150px 0;position:relative}
.p4 *{box-sizing:border-box}.p4 :is(h1,h2,h3,p,ol,ul,dl,dd,figure,blockquote){margin:0;padding:0}.p4 ol,.p4 ul{list-style:none}.p4 a{color:inherit;text-decoration:none}.p4 svg{flex:none}
.p4 .p4w{max-width:1200px;margin:0 auto;padding:0 40px;position:relative}
.p4 figure{overflow:hidden;background:${mix(D.bg, dark ? '#ffffff' : '#000000', .06)}}.p4 figure img{width:100%;height:100%;object-fit:cover;display:block}
.p4 .p4-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 28px;font-weight:700;font-size:17px;white-space:nowrap;letter-spacing:-.01em;border-radius:${D.br}px}
.p4 .p4-b.pri{background:var(--a);color:var(--on)}.p4 .p4-b.line{box-shadow:inset 0 0 0 1.5px currentColor;color:var(--ink)}
.p4 .p4-cta{display:flex;gap:12px;flex-wrap:wrap}
.p4 .p4-ey{font-size:15px;font-weight:700;color:var(--at);margin-bottom:18px}
.p4 .p4-h2{font-size:52px;line-height:1.16;font-weight:800;letter-spacing:-.04em}
.p4 .p4-sd{font-size:18px;color:var(--mu);margin-top:20px;max-width:560px}
.p4 .p4-more{display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--at);white-space:nowrap}
.p4 .p4-sh{display:flex;justify-content:space-between;align-items:end;gap:32px;margin-bottom:56px}
.p4 .p4-sg2{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}.p4 .p4-sg2>figure{aspect-ratio:4/3;border-radius:${D.r}px}
.p4 .p4-steps{margin-top:48px}.p4 .p4-steps li{display:grid;grid-template-columns:56px 1fr;padding:24px 0;border-top:1px solid var(--ln)}.p4 .p4-steps li:last-child{border-bottom:1px solid var(--ln)}
.p4 .p4-steps .p4-n{font-size:15px;font-weight:700;color:var(--at);font-variant-numeric:tabular-nums;padding-top:3px}.p4 .p4-steps h3{font-size:20px;font-weight:700;letter-spacing:-.025em}.p4 .p4-steps p{font-size:16px;color:var(--mu);margin-top:4px}
.p4 .p4-who{margin-top:40px;display:inline-flex;align-items:center;gap:14px;font-size:16px;color:var(--mu)}.p4 .p4-who i{width:44px;height:44px;border-radius:50%;background:var(--ink);color:var(--bg);font-style:normal;display:grid;place-items:center;font-weight:700}.p4 .p4-who b{color:var(--ink)}
.p4.p4-quote blockquote{font-size:48px;line-height:1.35;font-weight:800;letter-spacing:-.045em;max-width:1040px}
.p4-emp{padding:32px 0!important}.p4-emp p{font-size:14px;color:#6B7280}
@media (max-width:720px){.p4{padding:88px 0;font-size:16px}.p4 .p4w{padding:0 20px}.p4 .p4-h2{font-size:32px;line-height:1.22}.p4 .p4-sd{font-size:16px}.p4 .p4-cta{flex-direction:column}.p4 .p4-cta .p4-b{width:100%}.p4 a{min-height:44px}.p4 .p4-more{min-height:44px}.p4 p a{display:inline-flex;align-items:center}.p4 .p4-sg2{grid-template-columns:1fr;gap:40px}.p4 .p4-sh{flex-direction:column;align-items:flex-start;gap:16px;margin-bottom:36px}.p4.p4-quote blockquote{font-size:28px}}
`;
    /* 공통(새 7종): 숫자 · 날짜 목록 · 문의 · 두 갈래 · 마지막 띠 기본형 — 테마 블록이 덮어쓴다 */
    if (!['pbcivic', 'pbjournal', 'pbposter'].includes(th)) x += `
.p4 .p4-ls{margin-top:48px;border-top:2px solid var(--ink)}.p4 .p4-rw{display:grid;grid-template-columns:140px 1fr 200px 110px;gap:32px;align-items:center;padding:30px 0;border-bottom:1px solid var(--ln)}
.p4 .p4-dt b{display:block;font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums}.p4 .p4-dt small{font-size:14px;color:var(--mu)}
.p4 .p4-rw h3{font-size:23px;font-weight:700;letter-spacing:-.03em;line-height:1.35}.p4 .p4-rw p{font-size:15px;color:var(--mu);margin-top:6px}.p4 .p4-mt{font-size:15px;color:var(--mu)}
.p4 .p4-tag{justify-self:end;font-size:14px;font-weight:800;padding:6px 12px;border-radius:${Math.min(D.br, 999)}px;background:${al(a, .12)};color:var(--at);white-space:nowrap}.p4 .p4-tag.n{background:var(--a);color:var(--on)}
.p4.p4-rows .p4-more{margin-top:36px}
.p4 .p4-ft{font-size:15px;font-weight:700;margin-bottom:48px;opacity:.85}.p4 .p4-fg{display:grid;grid-template-columns:repeat(3,1fr);align-items:end}.p4 .p4-fg.n2{grid-template-columns:repeat(2,1fr)}.p4 .p4-fg.n1{grid-template-columns:1fr}
.p4 .p4-fk{padding:0 40px;border-left:1px solid var(--ln)}.p4 .p4-fk:first-child{padding-left:0;border-left:0}.p4 .p4-fk .p4-n{font-size:88px;font-weight:800;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}.p4 .p4-fk small{font-size:30px;margin-left:4px;color:var(--at)}.p4 .p4-fk p{margin-top:16px;font-size:17px;color:var(--mu)}
.p4 .p4-hg2{display:grid;grid-template-columns:1.2fr 1fr;gap:72px}.p4 .p4-nt{margin-top:28px}.p4 .p4-nt li{display:flex;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid var(--ln);font-size:17px}.p4 .p4-nt li:first-child{border-top:2px solid var(--ink)}.p4 .p4-nt a{font-weight:600}.p4 .p4-nt time{color:var(--mu);font-size:15px;white-space:nowrap}
.p4 .p4-none{margin-top:28px;padding:28px 0;border-top:2px solid var(--ink);color:var(--mu)}.p4 .p4-none a{color:var(--at);font-weight:700;text-decoration:underline}
.p4 .p4-call{background:var(--alt);padding:44px;border-top:6px solid var(--a)}.p4 .p4-call h3{font-size:26px;font-weight:800;letter-spacing:-.03em}.p4 .p4-tel{display:block;font-size:40px;font-weight:800;letter-spacing:-.03em;color:var(--at);margin-top:18px}.p4 .p4-call p{color:var(--mu);font-size:16px;margin-top:8px}.p4 .p4-call .p4-b{margin-top:28px}.p4 .p4-b.sec{box-shadow:inset 0 0 0 2px var(--at);color:var(--at)}
.p4 .p4-dg{display:grid;grid-template-columns:1fr 1fr;gap:24px}.p4 .p4-pn{display:flex;flex-direction:column;justify-content:space-between;gap:48px;min-height:340px;padding:52px;border-radius:${D.r}px;background:var(--alt)}.p4 .p4-pn.p1{background:var(--a);color:var(--on)}
.p4 .p4-pn .p4-k{font-size:15px;font-weight:700;opacity:.8}.p4 .p4-pn h3{font-size:40px;line-height:1.2;font-weight:800;letter-spacing:-.045em;margin-top:12px}.p4 .p4-pn p:not(.p4-k){margin-top:14px;font-size:17px;opacity:.82;max-width:440px}.p4 .p4-pb{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:17px}
.p4.p4-fin{background:var(--a);color:var(--on);padding:130px 0}.p4.p4-fin .p4-fg{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:end}.p4.p4-fin h2{font-size:60px;line-height:1.18;font-weight:800;letter-spacing:-.05em}.p4.p4-fin p{font-size:19px;opacity:.86;margin-top:20px}
.p4 .p4-acts{display:flex;flex-direction:column;gap:12px}.p4 .p4-acts .p4-b{height:64px;justify-content:space-between;font-size:18px}.p4 .p4-b.wh{background:#fff;color:#111}.p4 .p4-b.ol{box-shadow:inset 0 0 0 1.5px currentColor;color:inherit}
@media (max-width:720px){.p4 .p4-ls{margin-top:28px}.p4 .p4-rw{grid-template-columns:72px 1fr;gap:6px 16px;padding:24px 0;align-items:start}.p4 .p4-dt b{font-size:22px}.p4 .p4-dt small{font-size:13px}.p4 .p4-rw h3{font-size:19px}.p4 .p4-rw p,.p4 .p4-mt{font-size:14px}.p4 .p4-mt{grid-column:2}.p4 .p4-tag{grid-column:2;justify-self:start;font-size:13px;margin-top:6px}
.p4 .p4-fg,.p4 .p4-fg.n2{grid-template-columns:1fr;gap:28px}.p4 .p4-fk{padding:28px 0 0;border-left:0;border-top:1px solid var(--ln)}.p4 .p4-fk:first-child{border-top:0;padding-top:0}.p4 .p4-fk .p4-n{font-size:60px}.p4 .p4-ft{margin-bottom:28px}
.p4 .p4-hg2{grid-template-columns:1fr;gap:40px}.p4 .p4-nt li{font-size:15px;flex-direction:column;gap:4px}.p4 .p4-call{padding:28px 24px}.p4 .p4-tel{font-size:32px}.p4 .p4-call .p4-b{width:100%}
.p4 .p4-dg{grid-template-columns:1fr;gap:16px}.p4 .p4-pn{padding:32px 24px;min-height:0;gap:28px}.p4 .p4-pn h3{font-size:28px}.p4.p4-fin{padding:88px 0}.p4.p4-fin .p4-fg{grid-template-columns:1fr;gap:36px}.p4.p4-fin h2{font-size:34px}.p4.p4-fin p{font-size:16px}}
`;
    x += (THCSS[th] || (() => ''))({ D, a, at, onA, pt, nm, ln });
    x += `.gf.hps-f{background:${th === 'pbjournal' || th === 'pbsenior' ? mix(D.ink, '#000000', .1) : th === 'pbcampus' ? '#07090C' : '#15181E'}!important}.gf.hps-f :is(p,a,span,li,em,small,dt,dd){color:#B9C0C8!important}.gf.hps-f :is(strong,b,.hps-fn,.hps-fl){color:#FFFFFF!important}.gf.hps-f :is(hr,.hps-bar,.hps-bl){border-color:rgba(255,255,255,.14)!important}`;
    return x; }

  const THCSS = {
    pbcivic: ({ D, a, at, onA, pt, nm }) => `
.gh.hps-h{background:#fff!important;border-bottom:1px solid #D5DAE1!important;box-shadow:none!important;flex-wrap:wrap}.gh.hps-h:before{content:"이 누리집은 ${nm} 공식 누리집입니다.";display:block;width:100%;background:#F3F5F8;color:#3F4756;font-size:14px;line-height:40px;padding:0 max(20px,calc((100% - 1200px)/2 + 40px));box-sizing:border-box;text-align:left}
.gh .hps-cta{background:${a}!important;color:${onA}!important;border-radius:6px!important}.gh .gn a{font-weight:700}
.pbcivic .p4-b{border-radius:6px;height:58px;font-size:18px}.pbcivic .p4-b.pri{box-shadow:0 2px 0 ${mix(a, '#000000', .35)}}.pbcivic .p4-b.sec{background:#fff;color:var(--at);box-shadow:inset 0 0 0 2px ${at}}
.pbcivic.p4-hero{padding:96px 0 120px}.pbcivic .p4-g{display:grid;grid-template-columns:1.25fr .85fr;gap:64px;align-items:center}
.pbcivic .p4-crumb{font-size:15px;font-weight:700;color:var(--at);margin-bottom:24px;display:flex;gap:10px;align-items:center}.pbcivic .p4-crumb:before{content:"";width:6px;height:28px;background:${pt};flex:none}
.pbcivic.p4-hero h1{font-size:72px;line-height:1.14;font-weight:800;letter-spacing:-.045em}.pbcivic .p4-lead{margin-top:28px;font-size:21px;color:var(--mu);max-width:540px}.pbcivic.p4-hero .p4-cta{margin-top:44px}
.pbcivic .p4-note{margin-top:22px;font-size:15px;color:#646C7A}.pbcivic .p4-note a{color:var(--at);font-weight:700;text-decoration:underline;text-underline-offset:3px}
.pbcivic .p4-phw{position:relative;padding:0 0 32px 32px}.pbcivic .p4-phw:before{content:"";position:absolute;left:0;bottom:0;width:62%;height:72%;background:var(--a)}.pbcivic .p4-phw figure{position:relative;aspect-ratio:4/4.7}
.pbcivic.p4-svc{background:#F3F5F8;padding:110px 0}.pbcivic .p4-h2{font-size:44px;line-height:1.2}.pbcivic .p4-sv{margin-top:44px;display:grid;grid-template-columns:repeat(3,1fr);column-gap:48px}
.pbcivic .p4-sv a{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:26px 0;border-top:1px solid #C6CDD7}.pbcivic .p4-sv b{font-size:21px;font-weight:700;letter-spacing:-.03em;color:var(--at);text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:5px;display:block}.pbcivic .p4-sv span{display:block;font-size:15px;color:var(--mu);margin-top:6px}.pbcivic .p4-sv svg{color:var(--at)}
.pbcivic .p4-ls{margin-top:48px;border-top:2px solid ${D.ink}}.pbcivic .p4-rw{display:grid;grid-template-columns:150px 1fr 200px 120px;gap:32px;align-items:center;padding:32px 0;border-bottom:1px solid #D5DAE1}
.pbcivic .p4-dt b{display:block;font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums}.pbcivic .p4-dt small{font-size:14px;color:#646C7A}
.pbcivic .p4-rw h3{font-size:23px;font-weight:700;letter-spacing:-.03em;line-height:1.35}.pbcivic .p4-rw p{font-size:15px;color:var(--mu);margin-top:6px}.pbcivic .p4-mt{font-size:15px;color:var(--mu)}
.pbcivic .p4-tag{justify-self:end;font-size:14px;font-weight:800;padding:6px 12px;border-radius:4px;background:#FFF1C9;color:#6E4C00;white-space:nowrap}.pbcivic .p4-tag.n{background:${mix(a, '#ffffff', .9)};color:var(--at)}
.pbcivic.p4-rows .p4-more{margin-top:36px;text-decoration:underline;text-underline-offset:4px}
.pbcivic.p4-figs{background:var(--a);color:var(--on);padding:120px 0}.pbcivic .p4-ft{font-size:15px;font-weight:700;color:${onA === '#FFFFFF' ? pt : D.ink};margin-bottom:56px}.pbcivic .p4-fg{display:grid;grid-template-columns:repeat(3,1fr)}.pbcivic .p4-fg.n2{grid-template-columns:repeat(2,1fr)}.pbcivic .p4-fg.n1{grid-template-columns:1fr}
.pbcivic .p4-fk{padding:0 40px;border-left:1px solid ${al(onA, .22)}}.pbcivic .p4-fk:first-child{padding-left:0;border-left:0}.pbcivic .p4-fk .p4-n{font-size:84px;font-weight:800;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}.pbcivic .p4-fk small{font-size:30px;margin-left:4px;color:${onA === '#FFFFFF' ? pt : D.ink}}.pbcivic .p4-fk p{margin-top:16px;font-size:17px;opacity:.82}
.pbcivic.p4-help{background:#F3F5F8;padding:110px 0}.pbcivic .p4-hg2{display:grid;grid-template-columns:1.2fr 1fr;gap:72px}.pbcivic .p4-nt{margin-top:28px}.pbcivic .p4-nt li{display:flex;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid #C6CDD7;font-size:17px}.pbcivic .p4-nt li:first-child{border-top:2px solid ${D.ink}}.pbcivic .p4-nt a{font-weight:600}.pbcivic .p4-nt time{color:#646C7A;font-size:15px;white-space:nowrap}
.pbcivic .p4-none{margin-top:28px;padding:28px 0;border-top:2px solid ${D.ink};color:var(--mu)}.pbcivic .p4-none a{color:var(--at);font-weight:700;text-decoration:underline}
.pbcivic .p4-call{background:#fff;padding:44px;border-top:6px solid var(--a)}.pbcivic .p4-call h3{font-size:26px;font-weight:800;letter-spacing:-.03em}.pbcivic .p4-tel{display:block;font-size:40px;font-weight:800;letter-spacing:-.03em;color:var(--at);margin-top:18px}.pbcivic .p4-call p{color:var(--mu);font-size:16px;margin-top:8px}.pbcivic .p4-call .p4-b{margin-top:28px}
@media (max-width:720px){.gh.hps-h:before{font-size:13px;line-height:36px;padding:0 20px}.pbcivic.p4-hero{padding:48px 0 72px}.pbcivic .p4-g{grid-template-columns:1fr;gap:48px}.pbcivic.p4-hero h1{font-size:40px;line-height:1.22}.pbcivic .p4-lead{font-size:17px;margin-top:20px}.pbcivic.p4-hero .p4-cta{margin-top:32px}.pbcivic .p4-b{height:56px}
.pbcivic .p4-phw{padding:0 0 20px 20px}.pbcivic .p4-phw figure{aspect-ratio:4/3.4}.pbcivic.p4-svc,.pbcivic.p4-help{padding:72px 0}.pbcivic .p4-h2{font-size:30px}.pbcivic .p4-sv{grid-template-columns:1fr;margin-top:24px}.pbcivic .p4-sv a{padding:20px 0}.pbcivic .p4-sv b{font-size:18px}.pbcivic .p4-sv span{font-size:14px}
.pbcivic .p4-ls{margin-top:28px}.pbcivic .p4-rw{grid-template-columns:72px 1fr;gap:6px 16px;padding:24px 0;align-items:start}.pbcivic .p4-dt b{font-size:22px}.pbcivic .p4-dt small{font-size:13px}.pbcivic .p4-rw h3{font-size:19px}.pbcivic .p4-rw p,.pbcivic .p4-mt{font-size:14px}.pbcivic .p4-mt{grid-column:2}.pbcivic .p4-tag{grid-column:2;justify-self:start;font-size:13px;margin-top:6px}
.pbcivic.p4-figs{padding:80px 0}.pbcivic .p4-fg,.pbcivic .p4-fg.n2{grid-template-columns:1fr;gap:28px}.pbcivic .p4-fk{padding:28px 0 0;border-left:0;border-top:1px solid ${al(onA, .22)}}.pbcivic .p4-fk:first-child{border-top:0;padding-top:0}.pbcivic .p4-fk .p4-n{font-size:60px}.pbcivic .p4-ft{margin-bottom:32px}
.pbcivic .p4-hg2{grid-template-columns:1fr;gap:40px}.pbcivic .p4-nt li{font-size:15px;flex-direction:column;gap:4px}.pbcivic .p4-call{padding:28px 24px}.pbcivic .p4-tel{font-size:32px}.pbcivic .p4-call .p4-b{width:100%}}
`,
    pbjournal: ({ D, a, at, onA, pt }) => { const cT = fit(pt, D.bg, 4.6); return `
.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid #D9CFBD!important;box-shadow:none!important}.gh .hps-wmk b,.gh .logo b{font-family:${SERIF};color:${at}!important;font-size:22px;letter-spacing:-.03em}.gh .hps-cta{background:var(--a,${a})!important;color:${onA}!important;border-radius:4px!important}
.pbjournal .p4-h2,.pbjournal h1,.pbjournal h3,.pbjournal blockquote,.pbjournal .p4-d,.pbjournal .p4-n,.pbjournal .p4-mk{font-family:${SERIF}}
.pbjournal .p4-b{border-radius:4px}.pbjournal .p4-b.line{box-shadow:inset 0 0 0 1.5px ${D.ink};color:${D.ink}}
.pbjournal.p4-hero{padding:96px 0 120px}.pbjournal .p4-g{display:grid;grid-template-columns:1.3fr .9fr;gap:56px;align-items:center}
.pbjournal .p4-issue{display:flex;gap:14px;align-items:center;font-size:14px;font-weight:700;color:${cT};margin-bottom:34px}.pbjournal .p4-issue:before{content:"";width:36px;height:1.5px;background:${cT}}
.pbjournal.p4-hero h1{font-size:70px;line-height:1.14;font-weight:700;letter-spacing:-.055em}.pbjournal.p4-hero h1 em{font-style:normal;color:var(--at)}
.pbjournal .p4-lead{margin-top:34px;font-size:20px;line-height:1.7;color:var(--mu);max-width:500px}.pbjournal.p4-hero .p4-cta{margin-top:44px}
.pbjournal .p4-col{position:relative;height:640px}.pbjournal .p4-c1{position:absolute;right:0;top:0;width:78%;height:78%}.pbjournal .p4-c2{position:absolute;left:0;bottom:0;width:46%;height:46%;border:10px solid ${D.bg}}
.pbjournal .p4-cap{position:absolute;right:0;bottom:24px;width:46%;font-size:14px;color:var(--mu)}
.pbjournal.p4-rail{background:var(--a);color:var(--on);padding:0}.pbjournal.p4-rail .p4w{display:grid;grid-template-columns:auto 1fr auto;gap:40px;align-items:center;min-height:96px}
.pbjournal .p4-d{font-size:30px;font-weight:700;letter-spacing:-.03em}.pbjournal.p4-rail p{font-size:16px;opacity:.86}.pbjournal.p4-rail p a{font-weight:700;text-decoration:underline;text-underline-offset:3px}.pbjournal .p4-go{font-weight:700;display:inline-flex;gap:6px;align-items:center}
.pbjournal .p4-ey{color:${cT};font-size:14px}
.pbjournal .p4-h2{font-size:54px;line-height:1.22;font-weight:700;letter-spacing:-.05em}
.pbjournal .p4-sh{border-bottom:1.5px solid ${D.ink};padding-bottom:36px;margin-bottom:56px}.pbjournal .p4-more{color:${D.ink}}
.pbjournal .p4-ml{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px;align-items:start}.pbjournal .p4-art figure{aspect-ratio:4/3}
.pbjournal .p4-cat{margin-top:24px;font-size:14px;font-weight:700;color:var(--at);display:flex;gap:10px}.pbjournal .p4-cat span{color:var(--mu);font-weight:600}
.pbjournal .p4-art h3{font-size:27px;line-height:1.35;font-weight:700;letter-spacing:-.04em;margin-top:10px}.pbjournal .p4-art.p4-lg h3{font-size:36px}.pbjournal .p4-ad{font-size:16px;color:var(--mu);margin-top:12px}
.pbjournal .p4-meta{margin-top:20px;padding-top:16px;border-top:1px solid #D9CFBD;font-size:15px;color:var(--mu);display:flex;justify-content:space-between;gap:12px}.pbjournal .p4-meta b{color:${cT}}
.pbjournal.p4-band{height:640px;padding:0;overflow:hidden;background:#123}.pbjournal .p4-bg{position:absolute;inset:0;height:100%}.pbjournal.p4-band:after{content:"";position:absolute;inset:0;background:linear-gradient(270deg,rgba(11,40,46,.9) 0%,rgba(11,40,46,.72) 38%,rgba(11,40,46,0) 70%)}
.pbjournal.p4-band .p4-in{position:absolute;inset:0;z-index:2;display:flex;align-items:center}.pbjournal.p4-band .p4w{width:100%;display:flex;justify-content:flex-end}.pbjournal .p4-bt{width:480px;color:#fff}.pbjournal .p4-bt h2{font-family:${SERIF};font-size:56px;line-height:1.2;font-weight:700;letter-spacing:-.05em}.pbjournal .p4-bt p{margin-top:22px;font-size:18px;color:#E8EEEA}
.pbjournal.p4-story{background:${D.alt}}.pbjournal .p4-sg2{align-items:start}.pbjournal .p4-sg2>figure{aspect-ratio:4/5;border-radius:0}.pbjournal .p4-steps li{grid-template-columns:96px 1fr;padding:30px 0;border-color:#D9CFBD!important}.pbjournal .p4-steps .p4-n{font-size:48px;line-height:1;color:var(--at);font-weight:600;padding:0}.pbjournal .p4-steps h3{font-family:inherit;font-size:21px}
.pbjournal.p4-quote{text-align:center}.pbjournal .p4-mk{font-size:120px;line-height:.6;color:${pt};height:56px}.pbjournal.p4-quote blockquote{font-size:44px;line-height:1.5;font-weight:600;letter-spacing:-.045em;max-width:960px;margin:0 auto}
.pbjournal.p4-fin{background:${pt};color:#fff;padding:130px 0}.pbjournal .p4-fg{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:end}.pbjournal.p4-fin h2{font-family:${SERIF};font-size:60px;line-height:1.2;font-weight:700;letter-spacing:-.05em}.pbjournal.p4-fin p{font-size:19px;color:#FFE9E1;margin-top:20px}
.pbjournal .p4-acts{display:flex;flex-direction:column;gap:12px}.pbjournal .p4-acts .p4-b{height:64px;justify-content:space-between;font-size:18px}.pbjournal .p4-b.wh{background:#fff;color:${D.ink}}.pbjournal .p4-b.ol{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.75);color:#fff}
@media (max-width:720px){.pbjournal.p4-hero{padding:48px 0 72px}.pbjournal .p4-g{grid-template-columns:1fr;gap:48px}.pbjournal .p4-issue{margin-bottom:22px;font-size:13px}.pbjournal.p4-hero h1{font-size:42px;line-height:1.24}.pbjournal .p4-lead{font-size:17px;margin-top:22px}.pbjournal.p4-hero .p4-cta{margin-top:32px}
.pbjournal .p4-col{height:420px}.pbjournal .p4-c1{width:84%;height:74%}.pbjournal .p4-c2{width:52%;height:44%;border-width:6px}.pbjournal .p4-cap{width:44%;bottom:6px;font-size:13px}
.pbjournal.p4-rail .p4w{grid-template-columns:1fr;gap:8px;padding:28px 20px}.pbjournal .p4-d{font-size:24px}.pbjournal .p4-h2{font-size:34px}.pbjournal .p4-sh{padding-bottom:24px;margin-bottom:36px}
.pbjournal .p4-ml{grid-template-columns:1fr;gap:32px}.pbjournal .p4-art.p4-lg h3{font-size:26px}.pbjournal .p4-art:not(.p4-lg){display:grid;grid-template-columns:120px 1fr;column-gap:18px}.pbjournal .p4-art:not(.p4-lg) figure{aspect-ratio:1}.pbjournal .p4-art:not(.p4-lg) .p4-cat{margin-top:0}.pbjournal .p4-art:not(.p4-lg) h3{font-size:20px;margin-top:6px}.pbjournal .p4-art:not(.p4-lg) .p4-meta{flex-direction:column;gap:2px;font-size:14px;margin-top:12px;padding-top:10px}
.pbjournal.p4-band{height:520px}.pbjournal.p4-band:after{background:linear-gradient(0deg,rgba(11,40,46,.85),rgba(11,40,46,.1) 75%)}.pbjournal.p4-band .p4-in{align-items:flex-end;padding-bottom:48px}.pbjournal .p4-bt{width:auto}.pbjournal .p4-bt h2{font-size:36px}.pbjournal .p4-bt p{font-size:16px}
.pbjournal .p4-sg2>figure{aspect-ratio:4/3}.pbjournal .p4-steps li{grid-template-columns:64px 1fr}.pbjournal .p4-steps .p4-n{font-size:36px}.pbjournal.p4-quote blockquote{font-size:28px}.pbjournal .p4-mk{font-size:88px;height:40px}
.pbjournal.p4-fin{padding:88px 0}.pbjournal .p4-fg{grid-template-columns:1fr;gap:36px}.pbjournal.p4-fin h2{font-size:36px}.pbjournal.p4-fin p{font-size:16px}}
`; },
    pbposter: ({ D, a, at, onA, pt }) => { const sig = pt; return `
.gh.hps-h{background:${D.ink}!important;border:0!important;box-shadow:none!important}.gh.hps-h :is(a,b,span,label,svg){color:#fff!important}.gh .hps-cta{background:${sig}!important;color:${D.ink}!important;border-radius:0!important}.gh .hps-cta *{color:${D.ink}!important}
.pbposter{letter-spacing:-.015em}.pbposter .p4-b{border-radius:0;height:64px;font-weight:800;font-size:18px;gap:12px}.pbposter .p4-b.sig{background:${sig};color:${D.ink}}.pbposter .p4-b.wh{color:#fff;background:transparent;box-shadow:inset 0 0 0 2px #fff}
.pbposter.p4-hero{height:860px;padding:0;color:#fff;overflow:hidden;background:#123}.pbposter .p4-bg{position:absolute;inset:0;height:100%}.pbposter .p4-bg img{object-position:50% 60%}
.pbposter.p4-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,0) 20%,rgba(0,0,0,.1) 40%,rgba(4,12,20,.78) 78%,rgba(4,12,20,.86) 100%)}
.pbposter .p4-in{position:absolute;left:0;right:0;bottom:88px;z-index:2}.pbposter .p4-tag{display:inline-block;background:${sig};color:${D.ink};font-weight:800;font-size:15px;padding:7px 12px;margin-bottom:28px}
.pbposter.p4-hero h1{font-size:88px;line-height:1.05;font-weight:900;letter-spacing:-.055em}.pbposter .p4-row{display:flex;justify-content:space-between;align-items:end;gap:40px;margin-top:40px}.pbposter .p4-lead{font-size:20px;max-width:460px;color:#F1F1F1;font-weight:500}
.pbposter.p4-quick{background:${D.ink};color:#fff;padding:0}.pbposter .p4-qg{display:grid;grid-template-columns:repeat(4,1fr)}.pbposter .p4-qg a{display:flex;justify-content:space-between;align-items:center;padding:30px 28px;border-left:1px solid #2E2E2E;font-size:20px;font-weight:700}.pbposter .p4-qg a:first-child{border-left:0;padding-left:0}.pbposter .p4-qg span{display:block;font-size:14px;color:#A8A79F;font-weight:500;margin-top:2px}
.pbposter .p4-idx{font-size:14px;font-weight:800;letter-spacing:.04em;display:flex;gap:14px;align-items:center;margin-bottom:28px}.pbposter .p4-idx:before{content:"";width:14px;height:14px;background:var(--a)}
.pbposter .p4-h2{font-size:64px;line-height:1.1;font-weight:900;letter-spacing:-.05em}
.pbposter .p4-hg{display:grid;grid-template-columns:repeat(12,1fr);gap:24px;align-items:end}.pbposter .p4-num{grid-column:1/9;white-space:nowrap;font-size:196px;line-height:.82;font-weight:900;letter-spacing:-.07em;font-variant-numeric:tabular-nums}.pbposter .p4-num em{font-style:normal;color:var(--at);margin:0 .06em}
.pbposter .p4-tx{grid-column:9/13}.pbposter .p4-tx h3{font-size:28px;line-height:1.35;font-weight:800;letter-spacing:-.035em}.pbposter .p4-tx p:not(.p4-idx){margin-top:16px;color:var(--mu);font-size:16px}
.pbposter .p4-tb{grid-column:1/13;margin-top:72px;display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid ${D.ink}}.pbposter .p4-tb div{padding:24px 24px 0 0}.pbposter .p4-tb b{display:block;font-size:15px;font-weight:800}.pbposter .p4-tb span{display:block;font-size:24px;font-weight:700;letter-spacing:-.03em;margin-top:6px;font-variant-numeric:tabular-nums}.pbposter .p4-tb small{display:block;font-size:14px;color:var(--mu);margin-top:2px}
.pbposter.p4-places{background:#fff}.pbposter .p4-ph2{display:flex;justify-content:space-between;align-items:end;margin-bottom:56px;gap:40px}.pbposter .p4-more{color:${D.ink};font-weight:800;border-bottom:2px solid ${D.ink};padding-bottom:4px;gap:10px}
.pbposter .p4-pg{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:24px}.pbposter .p4-pg.n1,.pbposter .p4-pg.n2{grid-template-columns:1fr 1fr}.pbposter .p4-pl figure{aspect-ratio:4/3}.pbposter .p4-pg.n5 .p4-pl.p4-lg,.pbposter .p4-pg.n4 .p4-pl.p4-lg{grid-row:span 2;display:flex;flex-direction:column}.pbposter .p4-pg.n5 .p4-pl.p4-lg figure,.pbposter .p4-pg.n4 .p4-pl.p4-lg figure{aspect-ratio:auto;flex:1}
.pbposter .p4-cap{display:flex;flex-direction:row-reverse;justify-content:space-between;gap:12px;padding-top:18px;border-top:2px solid ${D.ink};margin-top:16px;min-height:102px}.pbposter .p4-cap h3{font-size:24px;font-weight:800;letter-spacing:-.035em;line-height:1.3}.pbposter .p4-cap p{font-size:15px;color:var(--mu);margin-top:4px}.pbposter .p4-no{font-size:14px;font-weight:800;color:var(--at);font-variant-numeric:tabular-nums}
.pbposter.p4-rent{background:var(--a);color:var(--on)}.pbposter.p4-rent .p4-idx:before{background:${sig}}.pbposter.p4-rent figure{aspect-ratio:1/1.05}.pbposter.p4-rent .p4-sd{color:inherit;opacity:.84}
.pbposter .p4-rs{margin-top:44px;border-top:2px solid currentColor}.pbposter .p4-rs li{display:grid;grid-template-columns:64px 1fr;gap:12px;padding:22px 0;border-bottom:1px solid ${al(onA, .3)}}.pbposter .p4-rs .p4-n{font-weight:900;font-size:18px;color:${onA === '#FFFFFF' ? sig : D.ink}}.pbposter .p4-rs h3{font-size:20px;font-weight:800}.pbposter .p4-rs p{font-size:15px;opacity:.84;margin-top:2px}.pbposter.p4-rent .p4-b{margin-top:40px}
.pbposter.p4-quote{background:${sig};color:${D.ink}}.pbposter.p4-quote blockquote{font-size:56px;line-height:1.25;font-weight:900;letter-spacing:-.05em;max-width:1080px}.pbposter .p4-who{color:#4A4316}.pbposter .p4-who i{color:${sig};background:${D.ink}}
.pbposter .p4-dg{display:grid;grid-template-columns:1fr 1fr}.pbposter .p4-pn{display:block;padding:56px 48px 0 0;border-top:2px solid ${D.ink}}.pbposter .p4-pn.p1{padding:56px 0 0 48px;border-left:2px solid ${D.ink}}.pbposter .p4-k{font-size:15px;font-weight:800;color:var(--at)}
.pbposter .p4-pn h3{font-size:48px;line-height:1.15;font-weight:900;letter-spacing:-.05em;margin-top:14px;display:flex;justify-content:space-between;align-items:end;gap:20px}.pbposter .p4-pn p:not(.p4-k){margin-top:16px;color:var(--mu);font-size:17px;max-width:460px}
@media (max-width:720px){.pbposter.p4-hero{height:740px}.pbposter .p4-bg img{object-position:58% 50%}.pbposter .p4-in{bottom:28px}.pbposter .p4-tag{font-size:13px;margin-bottom:18px}.pbposter.p4-hero h1{font-size:44px;line-height:1.12}.pbposter .p4-row{flex-direction:column;align-items:stretch;margin-top:18px;gap:24px}.pbposter .p4-lead{font-size:16px}.pbposter .p4-cta{gap:8px}.pbposter .p4-b{height:56px;font-size:17px;justify-content:space-between}
.pbposter.p4-quick .p4-qg{grid-template-columns:1fr 1fr;padding:0}.pbposter .p4-qg a{padding:20px;border-left:0;border-top:1px solid #2E2E2E;font-size:17px}.pbposter .p4-qg a:first-child{padding-left:20px}.pbposter .p4-qg a:nth-child(odd){border-right:1px solid #2E2E2E}.pbposter .p4-qg a:nth-child(-n+2){border-top:0}.pbposter .p4-qg svg{display:none}
.pbposter .p4-h2{font-size:36px}.pbposter .p4-hg{display:block}.pbposter .p4-num{font-size:104px}.pbposter .p4-tx{margin-top:28px}.pbposter .p4-tx h3{font-size:22px}.pbposter .p4-tb{margin-top:40px;grid-template-columns:1fr 1fr;row-gap:8px}.pbposter .p4-tb span{font-size:19px}
.pbposter .p4-ph2{flex-direction:column;align-items:flex-start;gap:20px;margin-bottom:36px}.pbposter .p4-pg,.pbposter .p4-pg.n1,.pbposter .p4-pg.n2{grid-template-columns:1fr 1fr;gap:28px 14px}.pbposter .p4-pl.p4-lg{grid-column:1/3}.pbposter .p4-pg .p4-pl.p4-lg{grid-row:auto!important}.pbposter .p4-pg .p4-pl.p4-lg figure{aspect-ratio:4/3!important}.pbposter .p4-cap{flex-direction:column-reverse;min-height:0;margin-top:12px;padding-top:12px;gap:4px}.pbposter .p4-cap h3{font-size:18px}.pbposter .p4-cap p{font-size:14px}
.pbposter.p4-rent figure{aspect-ratio:4/3}.pbposter .p4-rs li{grid-template-columns:40px 1fr}.pbposter.p4-rent .p4-b{width:100%}.pbposter.p4-quote blockquote{font-size:30px}
.pbposter .p4-dg{grid-template-columns:1fr}.pbposter .p4-pn,.pbposter .p4-pn.p1{padding:36px 0;border-left:0}.pbposter .p4-pn.p1{border-top:2px solid ${D.ink}}.pbposter .p4-pn h3{font-size:32px}.pbposter .p4-pn h3 svg{width:36px;height:36px}}
`; },
    /* 연수원: 짙은 시네마틱 */
    pbcampus: ({ D, a, onA, pt }) => `
.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid #222832!important;box-shadow:none!important}.gh.hps-h :is(a,b,span,label,svg){color:#EDEBE6!important}.gh .hps-cta{background:${a}!important;border-radius:2px!important}.gh .hps-cta,.gh .hps-cta *{color:${onA}!important}
.pbcampus .p4-b{border-radius:2px;height:58px}.pbcampus .p4-b.gh{color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}
.pbcampus .p4-ey{letter-spacing:.14em;font-size:14px;text-transform:uppercase;display:flex;gap:14px;align-items:center}.pbcampus .p4-ey:before{content:"";width:40px;height:1px;background:currentColor}
.pbcampus.p4-hero{height:880px;padding:0;overflow:hidden;background:${D.bg}}.pbcampus.p4-hero .p4-bg{position:absolute;top:0;right:0;bottom:0;width:66%;background:${D.bg}}.pbcampus.p4-hero .p4-bg img{filter:saturate(.8) contrast(1.05)}
.pbcampus.p4-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,${D.bg} 34%,${al(D.bg, .82)} 50%,${al(D.bg, .15)} 78%,${al(D.bg, .35)} 100%),linear-gradient(0deg,${D.bg} 0%,${al(D.bg, 0)} 30%)}
.pbcampus.p4-hero .p4-in{position:absolute;inset:0;z-index:2;display:flex;align-items:center}.pbcampus.p4-hero .p4w{width:100%}
.pbcampus.p4-hero h1{font-size:84px;line-height:1.1;font-weight:300;letter-spacing:-.05em;max-width:900px;color:#fff}.pbcampus.p4-hero h1 b{font-weight:800}
.pbcampus .p4-lead{margin-top:32px;font-size:20px;color:#B9BFC9;max-width:520px}.pbcampus.p4-hero .p4-cta{margin-top:48px}
.pbcampus .p4-reel{position:absolute;right:40px;bottom:40px;z-index:3;font-size:14px;color:#B9BFC9;letter-spacing:.04em;display:flex;gap:12px;align-items:center}.pbcampus .p4-reel:before{content:"";width:8px;height:8px;border-radius:50%;background:${pt}}
.pbcampus.p4-intro{border-top:1px solid #222832}.pbcampus .p4-mani{font-size:60px;line-height:1.22;font-weight:300;letter-spacing:-.045em;max-width:1000px;color:#fff}.pbcampus .p4-mani b{font-weight:800;color:${pt}}
.pbcampus .p4-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:48px;margin-top:96px}.pbcampus .p4-cols>div{border-top:1px solid #2C333E;padding-top:28px}.pbcampus .p4-cols .p4-no{font-size:14px;color:${pt};font-weight:700;letter-spacing:.08em}.pbcampus .p4-cols h3{font-size:24px;font-weight:700;margin-top:18px;color:#fff;letter-spacing:-.03em}.pbcampus .p4-cols p:not(.p4-no){margin-top:10px;color:var(--mu);font-size:16px}
.pbcampus.p4-tracks{background:${D.alt}}.pbcampus .p4-h2{color:#fff}.pbcampus .p4-tl{border-top:1px solid #2C333E}
.pbcampus .p4-tr{display:grid;grid-template-columns:80px 1fr 200px 160px;gap:32px;align-items:center;padding:28px 0;border-bottom:1px solid #2C333E;transition:background .2s}.pbcampus .p4-tr:hover{background:#1A202B}
.pbcampus .p4-tr .p4-no{font-size:40px;font-weight:200;color:${pt};font-variant-numeric:tabular-nums;letter-spacing:-.04em}.pbcampus .p4-tr h3{font-size:26px;font-weight:700;letter-spacing:-.035em;color:#fff;line-height:1.3}.pbcampus .p4-tr p{font-size:15px;color:var(--mu);margin-top:6px}.pbcampus .p4-when{font-size:16px;color:#D6D9DE;font-weight:600}
.pbcampus .p4-th{aspect-ratio:16/10;border-radius:2px}.pbcampus .p4-th img{filter:saturate(.7)}
.pbcampus .p4-mo{display:grid;grid-template-columns:1.5fr 1fr;grid-auto-rows:300px;gap:16px}.pbcampus .p4-mo.n1{grid-template-columns:1fr}.pbcampus .p4-st{position:relative;overflow:hidden;display:block;border-radius:2px}.pbcampus .p4-st.p4-lg{grid-row:span 2}.pbcampus .p4-mo.n2 .p4-st.p4-lg{grid-row:auto}.pbcampus .p4-mo.n4 .p4-st:nth-child(4){grid-column:1/-1}
.pbcampus .p4-st figure{position:absolute;inset:0}.pbcampus .p4-st:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,8,12,.86),rgba(6,8,12,0) 60%)}.pbcampus .p4-st .p4-cap{position:absolute;left:28px;right:28px;bottom:24px;z-index:2}.pbcampus .p4-st h3{font-size:26px;font-weight:700;color:#fff}.pbcampus .p4-st p{font-size:15px;color:#C7CCD4;margin-top:4px}
.pbcampus.p4-figs{border-top:1px solid #222832;border-bottom:1px solid #222832;padding:120px 0}.pbcampus .p4-fk{border-color:#2C333E}.pbcampus .p4-fk .p4-n{font-weight:200;color:#fff;font-size:104px}.pbcampus .p4-fk small{color:${pt};font-weight:600}.pbcampus .p4-ft{color:${pt};letter-spacing:.12em}
.pbcampus.p4-quote{background:${D.alt}}.pbcampus.p4-quote blockquote{font-weight:300;color:#fff;font-size:50px}.pbcampus .p4-who i{background:${pt};color:#111}
.pbcampus .p4-pn{background:${D.alt};border:1px solid #2C333E}.pbcampus .p4-pn h3{color:#fff;font-weight:700}.pbcampus .p4-pn.p1{background:${a};color:${onA};border:0}.pbcampus .p4-pn.p1 h3{color:${onA}}
@media (max-width:720px){.pbcampus.p4-hero{height:780px}.pbcampus.p4-hero .p4-bg{width:100%;height:56%;bottom:auto}.pbcampus.p4-hero:after{background:linear-gradient(0deg,${D.bg} 46%,${al(D.bg, .6)} 62%,${al(D.bg, .1)} 100%)}.pbcampus.p4-hero .p4-in{align-items:flex-end;padding-bottom:56px}
.pbcampus.p4-hero h1{font-size:42px;line-height:1.16}.pbcampus .p4-lead{font-size:17px;margin-top:20px}.pbcampus.p4-hero .p4-cta{margin-top:32px}.pbcampus .p4-reel{display:none}.pbcampus .p4-ey{font-size:13px}
.pbcampus .p4-mani{font-size:32px;line-height:1.3}.pbcampus .p4-cols{grid-template-columns:1fr;gap:28px;margin-top:48px}.pbcampus .p4-tr{grid-template-columns:52px 1fr;gap:4px 14px;padding:22px 0}.pbcampus .p4-tr .p4-no{font-size:28px;grid-row:span 2}.pbcampus .p4-tr h3{font-size:19px}.pbcampus .p4-when{grid-column:2;font-size:14px}.pbcampus .p4-th{display:none}
.pbcampus .p4-mo{grid-template-columns:1fr;grid-auto-rows:240px}.pbcampus .p4-st.p4-lg{grid-row:auto}.pbcampus .p4-st h3{font-size:21px}.pbcampus .p4-fk .p4-n{font-size:64px}.pbcampus.p4-quote blockquote{font-size:28px}.pbcampus.p4-figs{padding:80px 0}}
`,
    /* 도서관: 아치 · 크림 · 대출 카드 */
    pblibrary: ({ D, a, at, onA, pt }) => `
.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid ${al(D.ink, .1)}!important;box-shadow:none!important}.gh .hps-cta{background:${a}!important;color:${onA}!important;border-radius:999px!important}
.pblibrary .p4-b{border-radius:999px;height:58px;padding:0 30px}.pblibrary .p4-ey{color:var(--at);font-size:15px;display:inline-flex;gap:10px;align-items:center}.pblibrary .p4-ey:before{content:"";width:10px;height:10px;border-radius:50%;background:${pt}}
.pblibrary.p4-hero{padding:72px 0 120px}.pblibrary .p4-g{display:grid;grid-template-columns:.8fr 1fr;gap:80px;align-items:center}
.pblibrary .p4-arch{position:relative}.pblibrary .p4-arch:before{content:"";position:absolute;left:-24px;right:24px;top:24px;bottom:-24px;border:1.5px solid ${al(a, .45)};border-radius:999px 999px 0 0}.pblibrary .p4-arch figure{position:relative;aspect-ratio:4/5.3;border-radius:999px 999px 0 0}
.pblibrary.p4-hero h1{font-size:68px;line-height:1.12;font-weight:800;letter-spacing:-.05em}.pblibrary.p4-hero h1 em{font-style:normal;color:var(--at);font-weight:300}
.pblibrary .p4-lead{margin-top:30px;font-size:20px;color:var(--mu);max-width:500px}.pblibrary.p4-hero .p4-cta{margin-top:44px}.pblibrary .p4-note{margin-top:28px;font-size:15px;color:var(--mu);padding-top:22px;border-top:1px solid ${al(D.ink, .14)};max-width:460px}
.pblibrary.p4-shelf{background:${D.alt}}.pblibrary .p4-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.pblibrary .p4-cards.n3{grid-template-columns:repeat(3,1fr)}.pblibrary .p4-cards.n2,.pblibrary .p4-cards.n1{grid-template-columns:repeat(2,1fr)}
.pblibrary .p4-lc{position:relative;display:flex;flex-direction:column;background:#FFFDF8;padding:30px 26px 26px;min-height:380px;border-radius:6px;box-shadow:0 1px 0 ${al(D.ink, .08)},0 18px 40px -24px ${al(D.ink, .3)};transition:transform .2s}.pblibrary .p4-lc:hover{transform:translateY(-6px)}
.pblibrary .p4-lc:before{content:"";position:absolute;top:14px;left:50%;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:${D.alt};box-shadow:inset 0 1px 2px ${al(D.ink, .25)}}
.pblibrary .p4-lc .p4-no{display:flex;justify-content:space-between;font-size:14px;color:var(--mu);padding-bottom:14px;border-bottom:2px solid ${D.ink};margin-top:10px}.pblibrary .p4-lc .p4-no b{color:var(--at);font-variant-numeric:tabular-nums}
.pblibrary .p4-lc h3{font-size:24px;line-height:1.35;font-weight:800;letter-spacing:-.04em;margin:20px 0 22px;flex:1}
.pblibrary .p4-lc dl div{display:grid;grid-template-columns:64px 1fr;gap:8px;padding:10px 0;border-top:1px dashed ${al(D.ink, .22)};font-size:15px}.pblibrary .p4-lc dt{color:var(--mu)}.pblibrary .p4-lc dd{font-weight:600}
.pblibrary .p4-go{display:inline-flex;align-items:center;gap:6px;margin-top:18px;font-weight:700;color:var(--at);font-size:15px}
.pblibrary .p4-rw{grid-template-columns:120px 1fr 180px 110px}.pblibrary .p4-dt b{color:var(--at)}.pblibrary .p4-tag{background:${al(pt, .2)};color:${fit('#7A5800', D.bg, 4.6)}}.pblibrary .p4-tag.n{background:${a};color:${onA}}
.pblibrary.p4-story{background:${D.alt}}.pblibrary .p4-sg2>figure{aspect-ratio:4/4.6;border-radius:24px}.pblibrary .p4-steps .p4-n{font-size:15px}
.pblibrary.p4-quote{text-align:center}.pblibrary.p4-quote blockquote{margin:0 auto;font-weight:700;font-size:44px}.pblibrary .p4-who i{background:${a};color:${onA}}
.pblibrary.p4-fin{border-radius:40px 40px 0 0}
@media (max-width:720px){.pblibrary.p4-hero{padding:32px 0 72px}.pblibrary .p4-g{grid-template-columns:1fr;gap:44px}.pblibrary .p4-arch{margin:0 12px 0 24px}.pblibrary .p4-arch figure{aspect-ratio:4/4.2}.pblibrary.p4-hero h1{font-size:42px;line-height:1.18}.pblibrary .p4-lead{font-size:17px;margin-top:20px}.pblibrary.p4-hero .p4-cta{margin-top:32px}
.pblibrary .p4-cards,.pblibrary .p4-cards.n3,.pblibrary .p4-cards.n2{grid-template-columns:1fr;gap:16px}.pblibrary .p4-lc{min-height:0}.pblibrary .p4-lc h3{font-size:21px;margin:16px 0}.pblibrary .p4-rw{grid-template-columns:72px 1fr}.pblibrary.p4-quote blockquote{font-size:26px}.pblibrary.p4-fin{border-radius:28px 28px 0 0}}
`,
    /* 청소년: 보라 색면 · 스티커 */
    pbyouth: ({ D, a, at, onA, pt }) => { const pk = '#FF6FB5', sk = '#4CC9F0', og = '#FF9F1C'; return `
.gh.hps-h{background:${a}!important;border:0!important;box-shadow:none!important}.gh.hps-h :is(a,b,span,label,svg){color:#fff!important}.gh .hps-cta{background:${pt}!important;border-radius:999px!important}.gh .hps-cta,.gh .hps-cta *{color:${D.ink}!important}
.pbyouth{letter-spacing:-.02em}.pbyouth .p4-b{border-radius:999px;height:60px;font-weight:800;font-size:18px;padding:0 30px}.pbyouth .p4-b.lime{background:${pt};color:${D.ink}}.pbyouth .p4-b.wh{background:#fff;color:${D.ink}}
.pbyouth.p4-hero{background:${a};color:#fff;padding:72px 0 120px;overflow:hidden}.pbyouth.p4-hero:before{content:"";position:absolute;width:720px;height:720px;border-radius:50%;right:-160px;top:-220px;background:${mix(a, '#ffffff', .12)}}
.pbyouth .p4-g{display:grid;grid-template-columns:1.2fr .9fr;gap:32px;align-items:center}.pbyouth.p4-hero .p4-ey{color:${pt};font-weight:800;font-size:16px}
.pbyouth.p4-hero h1{font-size:90px;line-height:1.02;font-weight:900;letter-spacing:-.06em}.pbyouth.p4-hero h1 mark{background:none;color:${pt}}
.pbyouth .p4-lead{margin-top:30px;font-size:20px;color:#E7E2FF;max-width:480px;font-weight:500}.pbyouth.p4-hero .p4-cta{margin-top:44px}
.pbyouth .p4-stk{position:relative;height:620px}.pbyouth .p4-stk figure{position:absolute;border:10px solid #fff;border-radius:28px;box-shadow:0 30px 60px -20px rgba(10,0,60,.5)}
.pbyouth .p4-s1{width:62%;height:62%;right:4%;top:2%;transform:rotate(4deg)}.pbyouth .p4-s2{width:46%;height:44%;left:0;top:36%;transform:rotate(-7deg)}.pbyouth .p4-s3{width:44%;height:40%;right:12%;bottom:0;transform:rotate(-2deg)}
.pbyouth .p4-dot{position:absolute;left:10%;top:2%;width:150px;height:150px;border-radius:50%;background:${pt};color:${D.ink};display:grid;place-items:center;text-align:center;font-weight:900;font-size:19px;line-height:1.25;transform:rotate(-12deg);z-index:3}
.pbyouth .p4-h2{font-size:56px;font-weight:900;letter-spacing:-.05em}.pbyouth .p4-ey{color:var(--at);font-weight:800}
.pbyouth .p4-tg{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}.pbyouth .p4-tg.n3{grid-template-columns:repeat(3,1fr)}.pbyouth .p4-tg.n2,.pbyouth .p4-tg.n1{grid-template-columns:repeat(2,1fr)}
.pbyouth .p4-tile{display:block;padding:16px 16px 26px;border-radius:28px;transition:transform .2s}.pbyouth .p4-tile.t0{background:${pt};transform:rotate(-1.5deg)}.pbyouth .p4-tile.t1{background:${pk};transform:rotate(1.2deg)}.pbyouth .p4-tile.t2{background:${sk};transform:rotate(-1deg)}.pbyouth .p4-tile.t3{background:${og};transform:rotate(1.6deg)}.pbyouth .p4-tile:hover{transform:rotate(0) translateY(-6px)}
.pbyouth .p4-tile figure{aspect-ratio:1;border-radius:18px}.pbyouth .p4-tile .p4-k{margin-top:18px;font-size:14px;font-weight:800;color:${D.ink};opacity:.75;padding:0 6px}.pbyouth .p4-tile h3{font-size:24px;line-height:1.25;font-weight:900;letter-spacing:-.04em;color:${D.ink};margin-top:6px;padding:0 6px}.pbyouth .p4-w2{font-size:15px;font-weight:700;color:${D.ink};margin-top:10px;padding:0 6px}
.pbyouth.p4-words{background:${D.ink};color:#fff;padding:120px 0}.pbyouth.p4-words .p4-ey{color:${pt}}.pbyouth .p4-wall{font-size:68px;line-height:1.25;font-weight:900;letter-spacing:-.05em}.pbyouth .p4-wall a{display:inline-block;min-height:44px}.pbyouth .p4-wall a.f{color:#fff}.pbyouth .p4-wall a.o{color:transparent;-webkit-text-stroke:2px ${pt}}.pbyouth .p4-wall a:hover{color:${pt}}.pbyouth .p4-wall i{font-style:normal;color:${pk};margin:0 .3em;font-size:.6em;vertical-align:.2em}
.pbyouth.p4-story{background:${D.alt}}.pbyouth .p4-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;border:0}.pbyouth .p4-steps.n4{grid-template-columns:repeat(4,1fr)}.pbyouth .p4-steps li{display:block;background:#fff;border-radius:28px;padding:36px 32px;border:0!important}
.pbyouth .p4-steps .p4-n{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:${a};color:#fff;font-size:20px;font-weight:900;padding:0;margin-bottom:28px}.pbyouth .p4-steps li:nth-child(2) .p4-n{background:${pk};color:${D.ink}}.pbyouth .p4-steps li:nth-child(3) .p4-n{background:${pt};color:${D.ink}}.pbyouth .p4-steps h3{font-size:24px;font-weight:900}.pbyouth .p4-steps p{font-size:16px;margin-top:8px}
.pbyouth.p4-quote{background:${pt}}.pbyouth.p4-quote blockquote{font-weight:900;font-size:52px;color:${D.ink}}.pbyouth .p4-who i{background:${a};color:#fff}
.pbyouth .p4-pn{border-radius:36px;background:${pk};color:${D.ink}}.pbyouth .p4-pn.p1{background:${a};color:#fff}.pbyouth .p4-pn h3{font-weight:900;font-size:44px}.pbyouth .p4-pb{background:#fff;color:${D.ink};padding:0 24px;height:52px;border-radius:999px;align-self:flex-start}
@media (max-width:720px){.pbyouth.p4-hero{padding:40px 0 72px}.pbyouth.p4-hero:before{width:360px;height:360px;right:-140px;top:-120px}.pbyouth .p4-g{grid-template-columns:1fr;gap:28px}.pbyouth.p4-hero h1{font-size:44px;line-height:1.1}.pbyouth .p4-lead{font-size:17px;margin-top:20px}.pbyouth.p4-hero .p4-cta{margin-top:30px}
.pbyouth .p4-stk{height:380px;margin:0 6px}.pbyouth .p4-stk figure{border-width:6px;border-radius:20px}.pbyouth .p4-dot{width:104px;height:104px;font-size:14px;left:0;top:0}
.pbyouth .p4-h2{font-size:34px}.pbyouth .p4-tg,.pbyouth .p4-tg.n3,.pbyouth .p4-tg.n2{grid-template-columns:1fr 1fr;gap:16px 12px}.pbyouth .p4-tile{padding:10px 10px 18px;border-radius:20px}.pbyouth .p4-tile h3{font-size:18px}.pbyouth .p4-tile .p4-k{font-size:13px;margin-top:12px}.pbyouth .p4-w2{font-size:14px}
.pbyouth.p4-words{padding:80px 0}.pbyouth .p4-wall{font-size:34px}.pbyouth .p4-steps,.pbyouth .p4-steps.n4{grid-template-columns:1fr;gap:12px}.pbyouth .p4-steps li{padding:26px 24px}.pbyouth.p4-quote blockquote{font-size:28px}.pbyouth .p4-pn h3{font-size:30px}}
`; },
    /* 복지관 · 시니어: 큰 글씨 · 겹친 카드 */
    pbsenior: ({ D, a, at, onA, pt }) => `
.gh.hps-h{background:#fff!important;border-bottom:1px solid ${al(D.ink, .1)}!important;box-shadow:none!important}.gh .gn a{font-size:18px!important;font-weight:700}.gh .hps-cta{background:${a}!important;color:${onA}!important;border-radius:14px!important;font-size:17px!important}
.pbsenior{font-size:19px}.pbsenior .p4-b{height:66px;font-size:20px;border-radius:16px;padding:0 32px}.pbsenior .p4-b.line{box-shadow:inset 0 0 0 2px ${D.ink}}
.pbsenior.p4-hero{padding:0 0 120px}.pbsenior .p4-top{height:560px;width:100%}.pbsenior .p4-nop{background:${D.alt}}
.pbsenior .p4-card{position:relative;margin-top:-200px;background:#fff;border-radius:32px;padding:64px 72px 60px;max-width:1000px;box-shadow:0 30px 70px -30px ${al(D.ink, .35)}}
.pbsenior .p4-ey{font-size:18px;color:var(--at)}.pbsenior.p4-hero h1{font-size:72px;line-height:1.16;font-weight:800;letter-spacing:-.045em}
.pbsenior .p4-lead{margin-top:26px;font-size:22px;line-height:1.65;color:var(--mu);max-width:760px}.pbsenior.p4-hero .p4-cta{margin-top:40px;gap:14px}
.pbsenior .p4-b.tel{background:${pt};color:#fff;font-variant-numeric:tabular-nums}
.pbsenior .p4-h2{font-size:52px}.pbsenior .p4-sd{font-size:20px}
.pbsenior.p4-call{background:${pt};color:#fff;padding:96px 0}.pbsenior .p4-cg{display:grid;grid-template-columns:1fr auto;gap:56px;align-items:center}.pbsenior.p4-call h2{font-size:48px;line-height:1.25;font-weight:800;letter-spacing:-.04em}.pbsenior.p4-call p{font-size:20px;margin-top:16px;opacity:.9}
.pbsenior .p4-call .p4-tel,.pbsenior.p4-call .p4-tel{display:flex;align-items:center;gap:22px;background:#fff;color:${D.ink};border-radius:24px;padding:28px 40px;font-size:48px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;margin:0}.pbsenior.p4-call .p4-tel svg{color:${pt}}.pbsenior.p4-call .p4-tel small{display:block;font-size:17px;font-weight:600;color:var(--mu);letter-spacing:0}
.pbsenior .p4-bl{margin-top:56px;display:grid;gap:16px}.pbsenior .p4-br{display:grid;grid-template-columns:140px 1fr auto;gap:36px;align-items:center;background:#fff;border-radius:24px;padding:20px 32px 20px 20px;box-shadow:0 1px 0 ${al(D.ink, .06)}}
.pbsenior .p4-br figure{aspect-ratio:1;border-radius:18px}.pbsenior .p4-br h3{font-size:28px;font-weight:800;letter-spacing:-.035em;line-height:1.3}.pbsenior .p4-br p{font-size:19px;color:var(--mu);margin-top:6px}.pbsenior .p4-pr{font-weight:700;color:var(--at)!important}
.pbsenior .p4-go{display:inline-flex;align-items:center;gap:10px;height:60px;padding:0 26px;border-radius:14px;background:${D.alt};font-weight:700;font-size:19px;white-space:nowrap}.pbsenior .p4-all{margin-top:32px}
.pbsenior.p4-big{background:${D.alt}}.pbsenior.p4-big .p4-go{background:${D.bg}}
.pbsenior .p4-sg2>figure{border-radius:32px;aspect-ratio:4/4.4}.pbsenior .p4-steps li{grid-template-columns:84px 1fr;padding:30px 0}.pbsenior .p4-steps .p4-n{width:60px;height:60px;border-radius:50%;background:${a};color:${onA};display:grid;place-items:center;font-size:22px;padding:0}.pbsenior .p4-steps h3{font-size:26px;font-weight:800}.pbsenior .p4-steps p{font-size:19px}
.pbsenior.p4-quote{background:${D.alt}}.pbsenior.p4-quote blockquote{font-weight:700;font-size:44px;line-height:1.45}.pbsenior .p4-who{font-size:18px}.pbsenior .p4-who i{background:${a};color:${onA};width:52px;height:52px}
.pbsenior .p4-pn{background:#fff;box-shadow:inset 0 0 0 2px ${al(D.ink, .1)};border-radius:28px}.pbsenior .p4-pn h3{font-size:42px}.pbsenior .p4-pn p:not(.p4-k){font-size:19px}.pbsenior .p4-pb{height:60px;padding:0 26px;border-radius:14px;background:${a};color:${onA};align-self:flex-start;font-size:19px}.pbsenior .p4-pn.p1{background:${pt};color:#fff;box-shadow:none}.pbsenior .p4-pn.p1 .p4-pb{background:#fff;color:${D.ink}}
@media (max-width:720px){.pbsenior{font-size:18px}.pbsenior.p4-hero{padding-bottom:72px}.pbsenior .p4-top{height:300px}.pbsenior .p4-card{margin-top:-64px;padding:36px 24px 32px;border-radius:24px}.pbsenior .p4-ey{font-size:16px}.pbsenior.p4-hero h1{font-size:36px;line-height:1.24}.pbsenior .p4-lead{font-size:18px;margin-top:18px}.pbsenior.p4-hero .p4-cta{margin-top:28px}.pbsenior .p4-b{height:62px;font-size:19px;white-space:normal;text-align:center;line-height:1.3}
.pbsenior .p4-h2{font-size:32px}.pbsenior.p4-call{padding:72px 0}.pbsenior .p4-cg{grid-template-columns:1fr;gap:28px}.pbsenior.p4-call h2{font-size:32px}.pbsenior.p4-call p{font-size:17px}.pbsenior.p4-call .p4-tel{font-size:30px;padding:20px 22px;gap:14px}.pbsenior.p4-call .p4-tel svg{width:30px;height:30px}.pbsenior.p4-call .p4-tel small{font-size:14px}
.pbsenior .p4-bl{margin-top:32px}.pbsenior .p4-br{grid-template-columns:88px 1fr;gap:16px;padding:14px;border-radius:20px}.pbsenior .p4-br h3{font-size:21px}.pbsenior .p4-br p{font-size:16px}.pbsenior .p4-br .p4-go{grid-column:1/-1;justify-content:center;height:54px;font-size:18px}
.pbsenior .p4-steps li{grid-template-columns:64px 1fr}.pbsenior .p4-steps .p4-n{width:48px;height:48px;font-size:19px}.pbsenior .p4-steps h3{font-size:22px}.pbsenior .p4-steps p{font-size:17px}.pbsenior.p4-quote blockquote{font-size:28px}.pbsenior .p4-pn h3{font-size:30px}.pbsenior .p4-all{width:100%}}
`,
    /* 일자리센터: 색면 분할 · 4단계 */
    pbjobs: ({ D, a, at, onA, pt }) => `
.gh.hps-h{background:#fff!important;border-bottom:1px solid ${al(D.ink, .1)}!important;box-shadow:none!important}.gh .hps-cta{background:${pt}!important;color:#111!important;border-radius:12px!important}.gh .hps-cta *{color:#111!important}
.pbjobs .p4-b{border-radius:12px;height:60px;font-size:18px;font-weight:800}.pbjobs .p4-b.wh{background:#fff;color:${D.ink}}.pbjobs .p4-b.ol{color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.7)}
.pbjobs.p4-hero{padding:0;display:grid;grid-template-columns:1fr 1fr;min-height:780px}.pbjobs .p4-blk{background:${a};color:${onA};display:flex;align-items:center;justify-content:flex-end;position:relative;overflow:hidden}
.pbjobs .p4-blk:after{content:"";position:absolute;right:-90px;bottom:-90px;width:300px;height:300px;border-radius:50%;border:56px solid ${pt}}
.pbjobs .p4-blk .p4-tx{position:relative;z-index:2;width:100%;max-width:640px;padding:96px 48px 96px 40px}.pbjobs.p4-hero .p4-ey{color:${onA === '#FFFFFF' ? '#FFD9BF' : D.ink};font-size:16px;font-weight:800}
.pbjobs.p4-hero h1{font-size:72px;line-height:1.1;font-weight:800;letter-spacing:-.05em}.pbjobs.p4-hero h1 mark{background:none;color:${onA === '#FFFFFF' ? '#FFC79F' : D.ink}}
.pbjobs .p4-lead{margin-top:28px;font-size:20px;opacity:.9;max-width:470px}.pbjobs.p4-hero .p4-cta{margin-top:44px}.pbjobs .p4-side{height:100%;min-height:780px}
.pbjobs .p4-h2{font-size:54px}.pbjobs .p4-ey{color:var(--at);font-weight:800}
.pbjobs .p4-fl{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:72px;position:relative}.pbjobs .p4-fl.n3{grid-template-columns:repeat(3,1fr)}.pbjobs .p4-fl.n2{grid-template-columns:repeat(2,1fr)}.pbjobs .p4-fl:before{content:"";position:absolute;left:0;right:0;top:36px;height:2px;background:${al(a, .2)}}
.pbjobs .p4-fl li{position:relative;padding-right:32px}.pbjobs .p4-fl .p4-n{display:grid;place-items:center;width:72px;height:72px;border-radius:50%;background:${a};color:${onA};font-size:28px;font-weight:800;box-shadow:0 0 0 10px ${D.bg}}.pbjobs .p4-fl li:last-child .p4-n{background:${pt};color:#111}
.pbjobs .p4-fl h3{font-size:24px;font-weight:800;letter-spacing:-.035em;margin-top:32px}.pbjobs .p4-fl p{font-size:16px;color:var(--mu);margin-top:8px}
.pbjobs.p4-wide{background:${D.alt}}.pbjobs .p4-wg{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pbjobs .p4-wg.n1{grid-template-columns:1fr}
.pbjobs .p4-wc{display:grid;grid-template-columns:42% 1fr;background:#fff;border-radius:20px;overflow:hidden;min-height:260px;transition:box-shadow .2s}.pbjobs .p4-wc:hover{box-shadow:0 20px 40px -24px ${al(a, .5)}}.pbjobs .p4-wc figure{height:100%}
.pbjobs .p4-wb{padding:30px 30px 26px;display:flex;flex-direction:column}.pbjobs .p4-wb .p4-k{font-size:14px;font-weight:800;color:var(--at)}.pbjobs .p4-wb h3{font-size:24px;line-height:1.3;font-weight:800;letter-spacing:-.035em;margin-top:10px;flex:1}.pbjobs .p4-wb p:not(.p4-k){font-size:15px;color:var(--mu);margin-top:12px}.pbjobs .p4-go{display:inline-flex;align-items:center;gap:6px;margin-top:16px;font-weight:800;color:var(--at)}
.pbjobs.p4-figs{background:${D.ink};color:#fff;padding:120px 0}.pbjobs .p4-fk{border-color:rgba(255,255,255,.16)}.pbjobs .p4-fk .p4-n{color:#fff}.pbjobs .p4-fk small{color:${pt}}.pbjobs .p4-fk p{color:#B9BDD0}.pbjobs .p4-ft{color:${pt}}
.pbjobs.p4-pull{height:600px;padding:0;overflow:hidden;background:${D.ink};color:#fff}.pbjobs.p4-pull .p4-bg{position:absolute;inset:0;height:100%}.pbjobs.p4-pull:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,${al(D.ink, .9)} 0%,${al(D.ink, .6)} 45%,${al(D.ink, 0)} 80%)}
.pbjobs.p4-pull .p4-in{position:absolute;inset:0;z-index:2;display:flex;align-items:center}.pbjobs.p4-pull .p4w{width:100%}.pbjobs.p4-pull h2{font-size:56px;line-height:1.2;font-weight:800;letter-spacing:-.05em;max-width:640px}.pbjobs.p4-pull p{font-size:19px;color:#D9DCEA;margin-top:20px;max-width:520px}.pbjobs.p4-pull .p4-cta{margin-top:36px}
.pbjobs.p4-quote blockquote{font-size:48px}.pbjobs.p4-quote blockquote:before{content:"";display:block;width:64px;height:8px;background:${pt};margin-bottom:40px}.pbjobs .p4-who i{background:${a};color:${onA}}
.pbjobs.p4-help{background:${D.alt}}.pbjobs .p4-call{background:${a};color:${onA};border:0;border-radius:24px}.pbjobs .p4-call h3{color:${onA}}.pbjobs .p4-call .p4-tel{color:${onA}}.pbjobs .p4-call p{color:${onA};opacity:.85}.pbjobs .p4-call .p4-b.sec{background:#fff;color:${D.ink};box-shadow:none}
@media (max-width:720px){.pbjobs.p4-hero{grid-template-columns:1fr;min-height:0}.pbjobs .p4-blk{justify-content:flex-start;order:2}.pbjobs .p4-blk .p4-tx{padding:48px 20px 64px}.pbjobs .p4-blk:after{width:160px;height:160px;border-width:30px;right:-60px;bottom:-60px}.pbjobs .p4-side{order:1;min-height:0;height:300px}
.pbjobs.p4-hero h1{font-size:42px;line-height:1.16}.pbjobs .p4-lead{font-size:17px;margin-top:20px}.pbjobs.p4-hero .p4-cta{margin-top:30px}
.pbjobs .p4-h2{font-size:34px}.pbjobs .p4-fl,.pbjobs .p4-fl.n3{grid-template-columns:1fr;gap:28px;margin-top:40px}.pbjobs .p4-fl:before{left:27px;right:auto;top:0;bottom:0;width:2px;height:auto}.pbjobs .p4-fl li{display:grid;grid-template-columns:56px 1fr;column-gap:20px;padding:0}.pbjobs .p4-fl .p4-n{width:56px;height:56px;font-size:22px;grid-row:span 2}.pbjobs .p4-fl h3{margin-top:12px;font-size:21px}
.pbjobs .p4-wg{grid-template-columns:1fr}.pbjobs .p4-wc{grid-template-columns:1fr}.pbjobs .p4-wc figure{aspect-ratio:16/9}.pbjobs .p4-wb{padding:22px 22px 20px}.pbjobs .p4-wb h3{font-size:21px}.pbjobs.p4-quote blockquote{font-size:28px}.pbjobs.p4-pull{height:560px}.pbjobs.p4-pull:after{background:linear-gradient(0deg,${al(D.ink, .92)} 30%,${al(D.ink, .3)} 100%)}.pbjobs.p4-pull .p4-in{align-items:flex-end;padding-bottom:48px}.pbjobs.p4-pull h2{font-size:32px}.pbjobs.p4-pull p{font-size:16px}}
`,
    /* 박물관: 흰 벽 · 액자 · 명판 */
    pbmuseum: ({ D, a, at, onA }) => `
.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid ${D.ink}!important;box-shadow:none!important}.gh .hps-wmk b,.gh .logo b{font-family:${SERIF};font-size:22px}.gh .hps-cta{background:${D.ink}!important;color:#fff!important;border-radius:0!important}.gh .hps-cta *{color:#fff!important}
.pbmuseum .p4-h2,.pbmuseum h1,.pbmuseum h3,.pbmuseum blockquote,.pbmuseum .p4-mk,.pbmuseum.p4-fin h2,.pbmuseum .p4-no{font-family:${SERIF}}
.pbmuseum .p4-b{border-radius:0;height:56px}.pbmuseum .p4-b.pri{background:${D.ink};color:#fff}.pbmuseum .p4-b.line{box-shadow:inset 0 0 0 1px ${D.ink}}
.pbmuseum .p4-ey{color:${at};font-size:14px;letter-spacing:.12em;font-weight:700}
.pbmuseum.p4-hero{padding:88px 0 0}.pbmuseum .p4-top{display:grid;grid-template-columns:1.5fr 1fr;gap:64px;align-items:end;padding-bottom:72px}
.pbmuseum.p4-hero h1{font-size:92px;line-height:1.08;font-weight:600;letter-spacing:-.06em}.pbmuseum.p4-hero h1 em{font-style:normal;color:${at}}
.pbmuseum .p4-side{padding-bottom:10px}.pbmuseum .p4-lead{font-size:18px;color:var(--mu);margin-bottom:32px}
.pbmuseum .p4-wall{background:#E7E4DC;padding:96px 0 110px;position:relative}.pbmuseum .p4-wall .p4w{display:flex;justify-content:center;align-items:flex-end;gap:48px}
.pbmuseum .p4-frame{background:#fff;padding:28px;box-shadow:0 2px 2px rgba(0,0,0,.06),0 40px 60px -30px rgba(0,0,0,.45);width:min(720px,70%);border:1px solid #D9D5CB}.pbmuseum .p4-frame figure{aspect-ratio:4/3}
.pbmuseum .p4-plq{background:#fff;padding:22px 24px;width:240px;border-left:3px solid ${a};font-size:14px;line-height:1.6;color:var(--mu);box-shadow:0 10px 24px -16px rgba(0,0,0,.3)}.pbmuseum .p4-plq b{display:block;font-family:${SERIF};font-size:18px;color:${D.ink};margin-bottom:6px}.pbmuseum .p4-plq span{display:block}
.pbmuseum .p4-h2{font-size:56px;font-weight:600;letter-spacing:-.05em}.pbmuseum .p4-sh{border-bottom:1px solid ${D.ink};padding-bottom:32px}.pbmuseum .p4-more{color:${D.ink};border-bottom:1px solid ${D.ink}}
.pbmuseum .p4-ex{display:grid;grid-template-columns:1fr 1fr;gap:56px 40px}.pbmuseum .p4-xi{display:block}.pbmuseum .p4-xi.p4-lg{grid-column:1/-1;display:grid;grid-template-columns:1.5fr 1fr;gap:56px;align-items:end}.pbmuseum .p4-ex.n1 .p4-xi.p4-lg{grid-template-columns:1.5fr 1fr}
.pbmuseum .p4-xi figure{aspect-ratio:4/3;background:#fff;border:20px solid #fff;box-shadow:0 20px 40px -28px rgba(0,0,0,.4)}.pbmuseum .p4-xi.p4-lg figure{aspect-ratio:16/10}
.pbmuseum .p4-lb{margin-top:24px;padding:20px 0 0;border-top:1px solid ${D.ink}}.pbmuseum .p4-xi.p4-lg .p4-lb{margin:0}.pbmuseum .p4-lb .p4-no{font-size:15px;color:${at};font-style:italic}.pbmuseum .p4-lb h3{font-size:28px;line-height:1.3;font-weight:600;letter-spacing:-.04em;margin-top:8px}.pbmuseum .p4-xi.p4-lg h3{font-size:40px}
.pbmuseum .p4-lb dl{margin-top:18px}.pbmuseum .p4-lb dl div{display:grid;grid-template-columns:72px 1fr;font-size:15px;padding:6px 0}.pbmuseum .p4-lb dt{color:var(--mu)}
.pbmuseum.p4-story{background:#fff}.pbmuseum .p4-sg2>figure{border:20px solid ${D.bg};aspect-ratio:4/5}.pbmuseum .p4-steps .p4-n{font-family:${SERIF};font-style:italic;font-size:18px;color:${at}}
.pbmuseum.p4-rows{background:#fff}.pbmuseum .p4-ls{border-top:1px solid ${D.ink}}.pbmuseum .p4-dt b{font-family:${SERIF};font-weight:600}.pbmuseum .p4-tag{border-radius:0;background:transparent;box-shadow:inset 0 0 0 1px currentColor;color:${D.ink}}.pbmuseum .p4-tag.n{background:${a};color:${onA};box-shadow:none}.pbmuseum.p4-rows .p4-more{border-bottom:1px solid ${D.ink};color:${D.ink}}
.pbmuseum.p4-quote{text-align:center}.pbmuseum .p4-mk{font-size:120px;line-height:.6;height:56px;color:${a}}.pbmuseum.p4-quote blockquote{margin:0 auto;font-weight:500;font-size:44px;line-height:1.45}
.pbmuseum.p4-fin{background:${D.ink};color:#fff}.pbmuseum.p4-fin h2{font-weight:600}.pbmuseum.p4-fin .p4-b{border-radius:0}.pbmuseum.p4-fin .p4-b.wh{background:${a};color:${onA}}
@media (max-width:720px){.pbmuseum.p4-hero{padding:44px 0 0}.pbmuseum .p4-top{grid-template-columns:1fr;gap:24px;padding-bottom:44px}.pbmuseum.p4-hero h1{font-size:44px;line-height:1.14}.pbmuseum .p4-lead{font-size:17px;margin-bottom:24px}
.pbmuseum .p4-wall{padding:40px 0 48px}.pbmuseum .p4-wall .p4w{flex-direction:column;align-items:stretch;gap:20px}.pbmuseum .p4-frame{width:100%;padding:12px}.pbmuseum .p4-plq{width:auto}
.pbmuseum .p4-h2{font-size:34px}.pbmuseum .p4-ex{grid-template-columns:1fr;gap:40px}.pbmuseum .p4-xi.p4-lg{grid-template-columns:1fr!important;gap:0}.pbmuseum .p4-xi.p4-lg .p4-lb{margin-top:20px}.pbmuseum .p4-xi figure{border-width:10px}.pbmuseum .p4-lb h3,.pbmuseum .p4-xi.p4-lg h3{font-size:24px}.pbmuseum .p4-sg2>figure{border-width:10px;aspect-ratio:4/3}.pbmuseum.p4-quote blockquote{font-size:26px}.pbmuseum .p4-mk{font-size:88px;height:40px}}
`,
    /* 전통 관공서: 한지 · 대칭 · 낙관 · 두 줄 테두리 */
    pbheritage: ({ D, a, at, onA, pt }) => { const gd = '#B8925A'; const dbl = `border:4px double ${al(D.ink, .55)}`; return `
.gh.hps-h{background:${D.bg}!important;border-bottom:4px double ${al(D.ink, .4)}!important;box-shadow:none!important}.gh .hps-wmk b,.gh .logo b{font-family:${SERIF};font-size:22px;color:${D.ink}!important}.gh .gn a{font-family:${SERIF};font-weight:700}.gh .hps-cta{background:${a}!important;color:${onA}!important;border-radius:0!important}
.pbheritage{background:${D.bg};background-image:radial-gradient(${al(D.ink, .035)} 1px,transparent 1px);background-size:6px 6px}
.pbheritage .p4-h2,.pbheritage h1,.pbheritage h3,.pbheritage .p4-hn,.pbheritage blockquote,.pbheritage .p4-mk,.pbheritage .p4-seal,.pbheritage .p4-dt b{font-family:${SERIF}}
.pbheritage .p4-b{border-radius:0;height:58px;padding:0 34px;font-size:17px;letter-spacing:.02em}.pbheritage .p4-b.line{box-shadow:inset 0 0 0 1px ${D.ink}}
.pbheritage .p4-c{text-align:center}.pbheritage .p4-ey{display:flex;justify-content:center;align-items:center;gap:18px;color:${fit(pt, D.bg, 4.6)};font-size:15px;letter-spacing:.2em}.pbheritage .p4-ey:before,.pbheritage .p4-ey:after{content:"";width:56px;height:1px;background:${gd}}
.pbheritage.p4-hero{padding:88px 0 120px}.pbheritage .p4-seal{width:76px;height:76px;margin:0 auto 34px;border:3px solid ${pt};outline:1px solid ${pt};outline-offset:3px;display:grid;place-items:center;color:${pt};font-size:36px;font-weight:900;transform:rotate(-4deg)}
.pbheritage.p4-hero h1{font-size:66px;line-height:1.28;font-weight:700;letter-spacing:-.04em;margin-top:6px}.pbheritage .p4-lead{margin:30px auto 0;font-size:19px;color:var(--mu);max-width:640px}.pbheritage.p4-hero .p4-cta{margin-top:44px;justify-content:center}
.pbheritage .p4-pano{margin-top:88px;padding:10px;${dbl}}.pbheritage .p4-pano figure{aspect-ratio:21/8}.pbheritage .p4-pano img{filter:sepia(.18) saturate(.85)}
.pbheritage.p4-vals{background-color:${D.alt}}.pbheritage .p4-h2{font-size:48px;line-height:1.3;font-weight:700;letter-spacing:-.04em}.pbheritage .p4-vg{display:grid;grid-template-columns:repeat(3,1fr);margin-top:72px;border-top:1px solid ${gd};border-bottom:1px solid ${gd}}.pbheritage .p4-vg>div{padding:48px 36px;border-left:1px solid ${al(gd, .5)}}.pbheritage .p4-vg>div:first-child{border-left:0}
.pbheritage .p4-hn{font-size:44px;color:${pt};line-height:1}.pbheritage .p4-vg h3{font-size:26px;font-weight:700;margin-top:22px;letter-spacing:-.03em}.pbheritage .p4-vg p:not(.p4-hn){margin-top:12px;color:var(--mu);font-size:16px}
.pbheritage .p4-ls{border-top:3px double ${D.ink}}.pbheritage .p4-rw{border-bottom:1px solid ${al(D.ink, .2)};padding:28px 0}.pbheritage .p4-dt b{font-weight:700;color:${a}}.pbheritage .p4-tag{border-radius:0;background:transparent;box-shadow:inset 0 0 0 1px ${a};color:${a}}.pbheritage .p4-tag.n{background:${pt};color:#fff;box-shadow:none}
.pbheritage.p4-svc{background-color:${D.alt}}.pbheritage .p4-sv{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:48px}.pbheritage .p4-sv a{display:flex;justify-content:space-between;align-items:center;gap:16px;background:${D.bg};padding:28px 28px;${dbl.replace('4px', '3px')}}
.pbheritage .p4-sv i{display:block;font-style:normal;font-size:14px;color:${fit(pt, D.bg, 4.6)};font-weight:700;letter-spacing:.1em;margin-bottom:8px}.pbheritage .p4-sv b{display:block;font-family:${SERIF};font-size:22px;letter-spacing:-.03em}.pbheritage .p4-sv span{display:block;font-size:15px;color:var(--mu);margin-top:4px}.pbheritage .p4-sv svg{color:${pt}}
.pbheritage.p4-figs{background:${a};color:${onA}}.pbheritage .p4-fg h2{color:${onA};font-size:40px}.pbheritage .p4-fk{border-color:${al(onA, .25)}}.pbheritage .p4-fk .p4-n{font-family:${SERIF};font-weight:700;color:${onA}}.pbheritage .p4-fk small{color:${gd}}.pbheritage .p4-fk p{color:${al(onA, .8)}}.pbheritage .p4-ft{color:${gd};letter-spacing:.16em}
.pbheritage.p4-story .p4-sg2>figure{border:4px double ${al(D.ink, .55)};padding:8px;background:${D.bg};aspect-ratio:4/4.4;border-radius:0}.pbheritage.p4-story .p4-sg2>figure img{filter:sepia(.15)}.pbheritage .p4-steps .p4-n{font-family:${SERIF};color:${fit(pt, D.bg, 4.6)};font-size:18px}.pbheritage .p4-steps li{border-color:${al(D.ink, .25)}}.pbheritage .p4-steps h3{font-family:${SERIF};font-size:22px}
.pbheritage .p4-call{background:${D.bg};${dbl};border-top:4px double ${al(D.ink, .55)}}.pbheritage .p4-tel{font-family:${SERIF};color:${a}}.pbheritage .p4-nt li:first-child{border-top:3px double ${D.ink}}
@media (max-width:720px){.pbheritage.p4-hero{padding:48px 0 72px}.pbheritage .p4-seal{width:60px;height:60px;font-size:28px;margin-bottom:26px}.pbheritage .p4-ey{font-size:13px;gap:12px;letter-spacing:.12em}.pbheritage .p4-ey:before,.pbheritage .p4-ey:after{width:28px}.pbheritage.p4-hero h1{font-size:38px;line-height:1.32}.pbheritage .p4-lead{font-size:17px;margin-top:20px}.pbheritage.p4-hero .p4-cta{margin-top:30px}
.pbheritage .p4-pano{margin-top:48px;padding:6px}.pbheritage .p4-pano figure{aspect-ratio:4/3}.pbheritage .p4-h2{font-size:30px}.pbheritage .p4-vg{grid-template-columns:1fr;margin-top:40px}.pbheritage .p4-vg>div{padding:32px 8px;border-left:0;border-top:1px solid ${al(gd, .5)}}.pbheritage .p4-vg>div:first-child{border-top:0}.pbheritage .p4-hn{font-size:34px}
.pbheritage .p4-sv{grid-template-columns:1fr;gap:10px;margin-top:28px}.pbheritage .p4-sv a{padding:20px}.pbheritage .p4-sv b{font-size:19px}.pbheritage .p4-fg h2{font-size:30px}}
`; },
    /* 경제진흥원: 트립틱 · 공고 목록 · 지원 대상 */
    pbecon: ({ D, a, at, onA, pt }) => `
.gh.hps-h{background:#fff!important;border-bottom:1px solid ${al(D.ink, .1)}!important;box-shadow:none!important}.gh .hps-cta{background:${a}!important;color:${onA}!important;border-radius:10px!important}
.pbecon .p4-b{border-radius:10px;height:58px}.pbecon .p4-ey{color:var(--at);font-weight:800;display:inline-flex;align-items:center;gap:10px}.pbecon .p4-ey:before{content:"";width:18px;height:18px;border-radius:5px;background:${pt}}
.pbecon.p4-hero{padding:80px 0 110px}.pbecon .p4-top{display:grid;grid-template-columns:1.25fr .85fr;gap:64px;align-items:end;margin-bottom:56px}
.pbecon.p4-hero h1{font-size:80px;line-height:1.1;font-weight:800;letter-spacing:-.055em}.pbecon.p4-hero h1 em{font-style:normal;color:var(--at)}.pbecon .p4-lead{font-size:19px;color:var(--mu);margin-bottom:30px}
.pbecon .p4-tri{position:relative;display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:16px;height:440px}.pbecon .p4-tri.n2{grid-template-columns:1.4fr 1fr}.pbecon .p4-tri.n1{grid-template-columns:1fr}.pbecon .p4-tri figure{height:100%;border-radius:18px}.pbecon .p4-t1{margin-top:48px}.pbecon .p4-t2{margin-bottom:48px}
.pbecon .p4-badge{position:absolute;left:28px;bottom:-28px;background:${pt};color:${D.ink};font-weight:800;font-size:18px;line-height:1.35;padding:18px 24px;border-radius:14px;box-shadow:0 16px 30px -18px ${al(D.ink, .5)}}
.pbecon .p4-h2{font-size:50px}.pbecon .p4-al{border-top:2px solid ${D.ink}}.pbecon .p4-al a{display:grid;grid-template-columns:96px 1fr auto 24px;gap:24px;align-items:center;padding:26px 8px;border-bottom:1px solid var(--ln);transition:background .2s}.pbecon .p4-al a:hover{background:var(--alt)}
.pbecon .p4-al .p4-tg{font-size:14px;font-weight:800;text-align:center;padding:6px 0;border-radius:8px;background:${al(a, .1)};color:var(--at)}.pbecon .p4-al li:first-child .p4-tg{background:${pt};color:${D.ink}}.pbecon .p4-al b{font-size:21px;font-weight:700;letter-spacing:-.03em}.pbecon .p4-al time{font-size:15px;color:var(--mu);font-variant-numeric:tabular-nums}
.pbecon.p4-tiers{background:var(--alt)}.pbecon .p4-tz{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:56px}.pbecon .p4-tz.n2{grid-template-columns:1fr 1fr}
.pbecon .p4-ti{display:flex;flex-direction:column;background:#fff;border-radius:22px;padding:36px 32px 30px;min-height:300px;border-top:8px solid var(--a)}.pbecon .p4-ti.t1{border-top-color:${pt}}.pbecon .p4-ti.t2{border-top-color:${D.ink}}
.pbecon .p4-ti .p4-no{font-size:15px;font-weight:800;color:var(--at)}.pbecon .p4-ti h3{font-size:28px;font-weight:800;letter-spacing:-.04em;margin-top:18px}.pbecon .p4-ti p{font-size:16px;color:var(--mu);margin-top:10px;flex:1}.pbecon .p4-go{display:inline-flex;align-items:center;gap:6px;margin-top:22px;font-weight:800;color:var(--at)}
.pbecon .p4-rw{grid-template-columns:120px 1fr 190px 110px}.pbecon .p4-dt b{color:var(--at)}.pbecon .p4-tag.n{background:${pt};color:${D.ink}}
.pbecon.p4-quote blockquote{font-size:46px}.pbecon.p4-quote blockquote:after{content:"";display:block;width:56px;height:56px;border-radius:14px;background:${pt};margin-top:36px}.pbecon .p4-who i{background:${a};color:${onA}}
.pbecon.p4-help{background:var(--alt)}.pbecon .p4-call{background:${a};color:${onA};border:0;border-radius:22px}.pbecon .p4-call :is(h3,.p4-tel,p){color:${onA}}.pbecon .p4-call .p4-b.sec{background:${pt};color:${D.ink};box-shadow:none}
@media (max-width:720px){.pbecon.p4-hero{padding:40px 0 72px}.pbecon .p4-top{grid-template-columns:1fr;gap:20px;margin-bottom:36px}.pbecon.p4-hero h1{font-size:42px;line-height:1.16}.pbecon .p4-lead{font-size:17px;margin-bottom:24px}
.pbecon .p4-tri{height:260px;gap:8px;grid-template-columns:1.3fr 1fr}.pbecon .p4-tri figure{border-radius:12px}.pbecon .p4-t2{display:none}.pbecon .p4-t1{margin-top:28px}.pbecon .p4-badge{left:12px;bottom:-22px;font-size:15px;padding:12px 16px}
.pbecon .p4-h2{font-size:32px}.pbecon .p4-al a{grid-template-columns:72px 1fr;gap:6px 14px;padding:20px 0}.pbecon .p4-al b{font-size:17px}.pbecon .p4-al time{grid-column:2;font-size:14px}.pbecon .p4-al svg{display:none}
.pbecon .p4-tz,.pbecon .p4-tz.n2{grid-template-columns:1fr;gap:14px;margin-top:32px}.pbecon .p4-ti{min-height:0;padding:28px 24px}.pbecon .p4-ti h3{font-size:23px}.pbecon .p4-rw{grid-template-columns:72px 1fr}.pbecon.p4-quote blockquote{font-size:28px}}
`,
    /* 정보 · 산업진흥원: 모눈 · 창 · 고정폭 */
    pbdigital: ({ D, a, at, onA, pt }) => { const MONO = "'JetBrains Mono','SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace"; const grid = `background-image:linear-gradient(${al(a, .07)} 1px,transparent 1px),linear-gradient(90deg,${al(a, .07)} 1px,transparent 1px);background-size:40px 40px`; return `
.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid ${al(a, .15)}!important;box-shadow:none!important}.gh .hps-cta{background:${a}!important;color:${onA}!important;border-radius:8px!important}
.pbdigital .p4-b{border-radius:8px;height:58px}.pbdigital .p4-b.line{box-shadow:inset 0 0 0 1.5px ${D.ink}}
.pbdigital .p4-ey{font-family:${MONO};font-size:15px;color:var(--at);font-weight:700;display:flex;gap:10px;align-items:center}.pbdigital .p4-ey span{color:${fit(pt, D.bg, 3)}}
.pbdigital.p4-hero{padding:96px 0 120px;${grid}}.pbdigital .p4-g{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:center}
.pbdigital.p4-hero h1{font-size:78px;line-height:1.08;font-weight:800;letter-spacing:-.06em}.pbdigital.p4-hero h1 mark{background:linear-gradient(transparent 62%,${al(pt, .55)} 62%);color:inherit;padding:0 .04em}
.pbdigital .p4-lead{margin-top:30px;font-size:20px;color:var(--mu);max-width:520px}.pbdigital.p4-hero .p4-cta{margin-top:44px}
.pbdigital .p4-win{background:#fff;border-radius:16px;box-shadow:0 2px 0 ${al(D.ink, .06)},0 40px 80px -36px ${al(a, .55)};overflow:hidden;transform:rotate(1.5deg);border:1px solid ${al(D.ink, .08)}}
.pbdigital .p4-bar{display:flex;align-items:center;gap:8px;height:44px;padding:0 16px;background:${D.ink};color:#C9CCE8;font-family:${MONO};font-size:13px}.pbdigital .p4-bar i{width:11px;height:11px;border-radius:50%;background:#FF5F57}.pbdigital .p4-bar i:nth-child(2){background:#FEBC2E}.pbdigital .p4-bar i:nth-child(3){background:#28C840}.pbdigital .p4-bar span{margin-left:10px;opacity:.8}
.pbdigital .p4-win figure{aspect-ratio:4/3.4}
.pbdigital .p4-h2{font-size:52px;letter-spacing:-.05em}
.pbdigital.p4-dual{background:#fff}.pbdigital .p4-du{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:56px}.pbdigital .p4-dc{display:flex;flex-direction:column;min-height:340px;padding:40px;border-radius:20px;background:${D.bg};${grid}}.pbdigital .p4-dc.d1{background:${D.ink};color:#fff;background-image:none}
.pbdigital .p4-id{font-family:${MONO};font-size:14px;font-weight:700;color:var(--at);display:flex;justify-content:space-between;gap:12px}.pbdigital .p4-dc.d1 .p4-id{color:${pt}}.pbdigital .p4-dc h3{font-size:38px;line-height:1.2;font-weight:800;letter-spacing:-.045em;margin-top:22px}.pbdigital .p4-dc p:not(.p4-id){font-size:17px;opacity:.8;margin-top:14px;flex:1}
.pbdigital .p4-go{display:inline-flex;align-items:center;gap:8px;margin-top:24px;font-weight:800}
.pbdigital .p4-cg{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.pbdigital .p4-cg.n2{grid-template-columns:1fr 1fr}.pbdigital .p4-cg.n1{grid-template-columns:1fr}
.pbdigital .p4-cc{display:flex;flex-direction:column;background:#fff;border:1px solid ${al(D.ink, .1)};border-radius:16px;padding:28px 28px 24px;min-height:230px;transition:border-color .2s,transform .2s}.pbdigital .p4-cc:hover{border-color:${a};transform:translateY(-4px)}
.pbdigital .p4-cc .p4-id span{color:var(--mu);font-weight:600}.pbdigital .p4-cc h3{font-size:22px;line-height:1.35;font-weight:800;letter-spacing:-.035em;margin-top:18px;flex:1}.pbdigital .p4-cc p:not(.p4-id){font-size:15px;color:var(--mu);margin-top:10px}.pbdigital .p4-pr{font-family:${MONO};font-weight:700;color:var(--at)!important}
.pbdigital.p4-flow{background:${D.ink};color:#fff}.pbdigital.p4-flow .p4-ey{color:${pt}}.pbdigital.p4-flow .p4-sd{color:#B9BCD8}.pbdigital .p4-fl{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:56px}.pbdigital .p4-fl.n3{grid-template-columns:repeat(3,1fr)}.pbdigital .p4-fl.n2{grid-template-columns:1fr 1fr}
.pbdigital .p4-fl li{border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:28px}.pbdigital .p4-fl .p4-n{font-family:${MONO};font-size:15px;font-weight:700;color:${pt}}.pbdigital .p4-fl .p4-n:before{content:"STEP_0"}.pbdigital .p4-fl h3{font-size:23px;font-weight:800;margin-top:16px}.pbdigital .p4-fl p{font-size:15px;color:#B9BCD8;margin-top:8px}
.pbdigital.p4-quote blockquote{font-size:44px}.pbdigital.p4-quote blockquote:before{content:"// 수강생 한마디";display:block;font-family:${MONO};font-size:15px;color:var(--at);letter-spacing:0;font-weight:700;margin-bottom:24px}.pbdigital .p4-who i{background:${a};color:${onA}}
.pbdigital.p4-fin{background:${a};${grid.split(al(a, .07)).join('rgba(255,255,255,.08)')}}.pbdigital.p4-fin .p4-b.wh{color:${D.ink}}
@media (max-width:720px){.pbdigital.p4-hero{padding:44px 0 72px}.pbdigital .p4-g{grid-template-columns:1fr;gap:40px}.pbdigital.p4-hero h1{font-size:44px;line-height:1.14}.pbdigital .p4-lead{font-size:17px;margin-top:20px}.pbdigital.p4-hero .p4-cta{margin-top:30px}.pbdigital .p4-win{transform:none}
.pbdigital .p4-h2{font-size:32px}.pbdigital .p4-du{grid-template-columns:1fr;gap:14px;margin-top:32px}.pbdigital .p4-dc{min-height:0;padding:28px 24px}.pbdigital .p4-dc h3{font-size:28px}
.pbdigital .p4-cg,.pbdigital .p4-cg.n2{grid-template-columns:1fr;gap:12px}.pbdigital .p4-cc{min-height:0;padding:22px}.pbdigital .p4-cc h3{font-size:19px}.pbdigital .p4-fl,.pbdigital .p4-fl.n3{grid-template-columns:1fr;gap:12px;margin-top:32px}.pbdigital .p4-fl li{padding:22px}.pbdigital.p4-quote blockquote{font-size:28px}}
`; },
    /* 민간 협회: 회원증 · 버건디 · 입장권 */
    pbassoc: ({ D, a, at, onA, pt }) => `
.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid ${al(D.ink, .1)}!important;box-shadow:none!important}.gh .hps-cta{background:${a}!important;color:${onA}!important;border-radius:999px!important}
.pbassoc .p4-b{border-radius:999px;height:58px;padding:0 30px}.pbassoc .p4-ey{color:var(--at);letter-spacing:.06em;font-weight:800}
.pbassoc.p4-hero{padding:88px 0 120px;overflow:hidden}.pbassoc .p4-g{display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center}
.pbassoc.p4-hero h1{font-size:72px;line-height:1.12;font-weight:700;letter-spacing:-.05em}.pbassoc.p4-hero h1 em{font-style:normal;color:var(--at)}.pbassoc .p4-lead{margin-top:28px;font-size:20px;color:var(--mu);max-width:500px}.pbassoc.p4-hero .p4-cta{margin-top:44px}
.pbassoc .p4-stage{position:relative;padding:0 0 72px 0}.pbassoc .p4-stage>figure{aspect-ratio:4/4.3;border-radius:28px}.pbassoc .p4-stage>figure img{filter:saturate(.85)}
.pbassoc .p4-card{position:absolute;left:-56px;bottom:0;width:340px;height:210px;border-radius:20px;padding:26px 28px;background:linear-gradient(135deg,${a} 0%,${mix(a, '#000000', .35)} 100%);color:#fff;transform:rotate(-6deg);box-shadow:0 30px 50px -20px ${al(a, .6)};display:flex;flex-direction:column}
.pbassoc .p4-card .p4-k{font-size:13px;letter-spacing:.24em;color:${pt};font-weight:800}.pbassoc .p4-card b{font-size:26px;font-weight:800;letter-spacing:-.03em;margin-top:auto}.pbassoc .p4-cl{font-size:14px;color:#EBD9DF;margin-top:4px}.pbassoc .p4-chip{position:absolute;right:28px;top:26px;width:44px;height:34px;border-radius:7px;background:linear-gradient(135deg,${pt},${mix(pt, '#ffffff', .4)})}
.pbassoc .p4-h2{font-size:50px;font-weight:700}
.pbassoc.p4-member{background:var(--alt)}.pbassoc .p4-mg{display:grid;grid-template-columns:.9fr 1.1fr;gap:80px;align-items:start}.pbassoc.p4-member .p4-cta{margin-top:36px}
.pbassoc .p4-bn li{display:grid;grid-template-columns:64px 1fr;gap:12px;padding:30px 0;border-top:1px solid ${al(D.ink, .14)}}.pbassoc .p4-bn li:last-child{border-bottom:1px solid ${al(D.ink, .14)}}.pbassoc .p4-bn .p4-no{width:44px;height:44px;border-radius:50%;background:${a};color:#fff;display:grid;place-items:center;font-size:15px;font-weight:800}
.pbassoc .p4-bn h3{font-size:24px;font-weight:700;letter-spacing:-.035em}.pbassoc .p4-bn p{font-size:16px;color:var(--mu);margin-top:6px}
.pbassoc .p4-tk{display:grid;gap:16px}.pbassoc .p4-tc{display:grid;grid-template-columns:150px 1fr 64px;align-items:stretch;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 1px 0 ${al(D.ink, .06)};position:relative}
.pbassoc .p4-stub{background:${a};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px 10px;border-right:2px dashed ${al('#ffffff', .5)}}.pbassoc .p4-stub b{font-size:44px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums}.pbassoc .p4-stub span{font-size:14px;margin-top:8px;color:#F1DDE3}
.pbassoc .p4-tb{padding:26px 32px}.pbassoc .p4-tb .p4-k{font-size:14px;font-weight:800;color:${fit(pt, '#ffffff', 3.2)}}.pbassoc .p4-tb h3{font-size:23px;font-weight:700;letter-spacing:-.035em;margin-top:6px}.pbassoc .p4-tb p:not(.p4-k){font-size:15px;color:var(--mu);margin-top:6px}
.pbassoc .p4-tc .p4-go{display:grid;place-items:center;color:var(--at);border-left:1px solid ${al(D.ink, .08)}}
.pbassoc.p4-story{background:var(--alt)}.pbassoc .p4-sg2>figure{border-radius:28px}.pbassoc .p4-steps .p4-n{color:var(--at)}
.pbassoc.p4-quote{text-align:center}.pbassoc.p4-quote blockquote{margin:0 auto;font-weight:700;font-size:44px}.pbassoc .p4-who i{background:${pt};color:${D.ink}}
.pbassoc .p4-pn{border-radius:28px;background:#fff;box-shadow:inset 0 0 0 1px ${al(D.ink, .1)}}.pbassoc .p4-pn.p1{background:${a};box-shadow:none}.pbassoc .p4-pb{height:52px;padding:0 24px;border-radius:999px;background:${a};color:#fff;align-self:flex-start}.pbassoc .p4-pn.p1 .p4-pb{background:${pt};color:${D.ink}}
@media (max-width:720px){.pbassoc.p4-hero{padding:44px 0 72px}.pbassoc .p4-g{grid-template-columns:1fr;gap:40px}.pbassoc.p4-hero h1{font-size:42px;line-height:1.18}.pbassoc .p4-lead{font-size:17px;margin-top:20px}.pbassoc.p4-hero .p4-cta{margin-top:30px}
.pbassoc .p4-stage{padding:0 0 56px 0;margin-left:20px}.pbassoc .p4-stage>figure{aspect-ratio:4/3.4;border-radius:20px}.pbassoc .p4-card{left:-20px;width:240px;height:150px;padding:18px 20px}.pbassoc .p4-card b{font-size:19px}.pbassoc .p4-chip{width:34px;height:26px;right:20px;top:18px}.pbassoc .p4-card .p4-k{font-size:13px}.pbassoc .p4-cl{font-size:13px}
.pbassoc .p4-h2{font-size:32px}.pbassoc .p4-mg{grid-template-columns:1fr;gap:32px}.pbassoc .p4-bn h3{font-size:20px}.pbassoc .p4-tc{grid-template-columns:92px 1fr}.pbassoc .p4-stub b{font-size:32px}.pbassoc .p4-stub span{font-size:13px}.pbassoc .p4-tb{padding:18px 18px}.pbassoc .p4-tb h3{font-size:18px}.pbassoc .p4-tc .p4-go{display:none}.pbassoc.p4-quote blockquote{font-size:27px}}
`
  };

  /* ── 렌더러 연결 ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    try { if (x && s) { const d = x.data || {};
      if (x.type === 'text' && SEC[d.hpt]) { if (x.hide && !editing()) return ''; const h = SEC[d.hpt](x, s); return h || ''; }
      if (x.type === 'banner' && mine(s) && HPT.has(s.theme) && !+d.dstyle && !s.layout) { if (x.hide && !editing()) return ''; return mark(HERO[s.theme](s, d), x); } }
    } catch (e) { console.error('hp44-public', e); }
    return base(x, i, s, lk); }; window.proSec = proSec; }
  try { if (window.HPW && typeof HPW.emptyOf === 'function') { const e0 = HPW.emptyOf; HPW.emptyOf = x => { const d = (x && x.data) || {}; if (x && x.type === 'text' && SEC[d.hpt]) { try { return d.hpt === 'p4-figs' ? figsK().length < 2 : /^p4-(mag|rows|band|tracks|shelf|tiles|words|big|wide|exhibit|code|ticket)$/.test(d.hpt) ? !live().length : /^p4-(hours|stay)$/.test(d.hpt) ? !facs().length : d.hpt === 'p4-quote' ? !review() : d.hpt === 'p4-ann' ? !notes(1).length : false; } catch (e) { return false; } } return e0(x); }; } } catch (e) { }
  const needCSS = s => !!(s && (mine(s) || (s.sections || []).some(x => x && x.data && SEC[x.data.hpt])));
  const SERIF_CSS = 'fonts/noto-serif-kr/font.css?v=ea0bde31';
  { const base = siteHTML; siteHTML = (s, ...a) => { let h = base(s, ...a); try { if (needCSS(s) && HPT.tokens(s)) { h = h.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>'); h = h.replace(/<section class="([^"]*\bp4\b[^"]*)"/g, (m, c) => `<section class="${c.replace(/\bhps-(flowb?|short)\b\s*/g, '').trim()}"`); /* 같은 바탕 섹션 간격 압축(hps-flow)은 섹션 리듬을 깨므로 뺀다 */ if (SERIFS.includes(thOf(s)) && h.indexOf(SERIF_CSS) < 0) h = h.replace('</head>', `<link rel="stylesheet" href="${SERIF_CSS}"></head>`); } } catch (e) { console.error('hp44-public css', e); } return h; }; window.siteHTML = siteHTML; }

  /* ── 등록 ── */
  MINE.forEach(id => { HPT.reg(id, Object.assign({ prem: 1, cssX: () => '', tags: ['public'] }, DEF[id])); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hp44-public HPD', e); } });
  const PH = { pbcivic: { hero: 'hum-51', about: 'lec-01' }, pbjournal: { hero: 'sen-01', about: 'hum-26', space: 'hum-13', cta: 'hum-05' }, pbposter: { hero: 'spo-08', about: 'lec-02' }, pbcampus: { hero: 'grp-01' },
    pblibrary: { hero: 'lib-08', about: 'hum-12' }, pbyouth: { hero: 'spo-03', about: 'hum-30', space: 'cam-07' }, pbsenior: { hero: 'sen-02', about: 'kni-03' }, pbjobs: { hero: 'hum-50', about: 'shk-01' }, pbmuseum: { hero: 'hum-22', about: 'hum-28' }, pbheritage: { hero: 'nat-01', about: 'lib-06' },
    pbecon: { hero: 'bar-03', about: 'bak-03', space: 'hum-49' }, pbdigital: { hero: 'hum-41' }, pbassoc: { hero: 'hum-11', about: 'grp-03' } };
  { const tb = HPT.thumb; if (typeof tb === 'function') HPT.thumb = (s, id) => { if (!MINE.includes(id)) return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.id === 't44-' + id); if (tp) b.sections = tp.build(); b.photos = Object.assign({}, PH[id]); b.img = {}; try { Object.keys(b.photos).forEach(sl => { const v = HPSTOCK.slotImg(b.photos[sl], sl); if (v) b.img[sl] = v; }); } catch (e) { } return siteHTML(b, false, 'ko'); } catch (e) { console.error('hp44-public thumb', e); return tb(s, id); } }; }
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') { window.HP44P = { DEF, fits, css, SEC, PH }; return; }
  const TX = (variant, data) => S2('text', { variant, ...data });
  const quiet = () => [TX('stats', { hpt: 'facts', title: '', cols: [] }), TX('timeline', { hpt: 'sched', eyebrow: '', title: '모집 일정', cols: [] })].map(x => Object.assign(x, { hide: true }));
  const B = {
    pbcivic: { scene: '지자체 · 정부 기관 직원 교육원 — 직원이 법정 의무교육을 이수하고 교육을 신청 · 이수증을 받으러 와요. 공식 누리집 띠, 자주 찾는 서비스, 날짜 열 교육 목록, 알림마당', purpose: ['learn', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()} 교육 안내`, title: '공직자의 배움,\n한곳에서 이어가요.', sub: `${org()} 소속 직원은 누구나 이곳에서 교육을 신청하고, 이수 현황과 이수증을 바로 확인할 수 있어요.`, cta: '내 교육 이수 현황', link: 'learn:my', cta2: '교육과정 찾기', link2: 'learn:courses', note: '처음 오셨나요?' }),
        TX('features', { hpt: 'p4-svc', title: '자주 찾는 서비스', cols: [] }),
        TX('features', { hpt: 'p4-rows', eyebrow: '교육과정', title: '지금 운영 중인 교육', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-figs', eyebrow: '교육 운영 현황', title: '', cols: [] }),
        TX('features', { hpt: 'p4-story', eyebrow: '교육 이수 안내', title: '신청부터 이수증까지,\n세 단계면 돼요.', sub: '', cols: [['로그인', '기관에서 받은 초대 계정으로 들어가요.'], ['교육 신청 · 수강', '집합 교육은 승인 후 확정, 사이버 교육은 바로 들어요.'], ['이수증 발급', '기준을 채우면 이수증을 PDF로 내려받아요.']] }),
        TX('features', { hpt: 'p4-help', title: '알림마당', sub: '교육 신청이 어려우신가요?', cols: [] }), ...quiet()] },
    pbjournal: { scene: '구민대학 · 시민 강좌 — 주민이 이번 학기 강좌를 둘러보고 신청하러 와요. 세리프 잡지형, 접수 띠, 무료 강좌 사진 띠, 전화 신청', purpose: ['apply', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()} 이번 학기 강좌`, title: `다시 배우는 ${season()},\n우리 동네에서.`, sub: '주민이라면 누구나 들을 수 있는 강좌예요. 집에서 걸어갈 수 있는 배움터에서 이웃과 함께 배워요.', cta: '강좌 보기', link: 'learn:courses', cta2: '내 신청 확인', link2: 'learn:my', note: '' }),
        TX('features', { hpt: 'p4-rail', title: '', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-mag', eyebrow: '이번 학기 추천', title: '이번 학기, 이웃들이\n먼저 고른 강좌', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-band', title: '', sub: '수강료가 있는 강좌도 재료비 위주로 받아요. 감면 대상은 신청할 때 함께 확인해요.', cols: [] }),
        TX('features', { hpt: 'p4-story', eyebrow: '처음이라면', title: '신청은 세 번이면\n끝나요.', sub: '', cols: [['간편 가입', '간편 가입 뒤 주소지만 확인하면 돼요.'], ['듣고 싶은 강좌 담기', '정원이 넘는 강좌는 접수 마감 뒤 추첨해요.'], ['문자로 결과 받기', '인터넷이 어려우면 전화로 신청을 도와드려요.']] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('cta', { hpt: 'p4-fin', title: '배우고 싶은 강좌를\n지금 찾아보세요.', sub: '궁금한 점은 담당 부서로 편하게 물어보세요.', cta: '강좌 찾아보기', cols: [] }), ...quiet()] },
    pbposter: { scene: '공공 체육 · 문화센터 — 주민이 강습을 등록하고 시설을 예약 · 대관하러 와요. 전면 사진 포스터, 운영 시간 · 시설 그리드 · 단체 대관', purpose: ['apply', 'info'],
      build: () => [S2('banner', { eyebrow: '강습 등록 · 시설 예약', title: '운동도 배움도,\n집 앞 센터에서.', sub: `${facs().slice(0, 3).map(f => f.name).join(' · ') || '체육 · 문화 시설'}을 예약하고 강습을 신청해요. 단체는 공간을 빌려 쓸 수 있어요.`, cta: '강습 · 이용권', link: 'learn:shop', cta2: '시설 예약', link2: 'learn:fac' }),
        TX('features', { hpt: 'p4-quick', title: '', cols: [] }),
        TX('features', { hpt: 'p4-hours', title: '', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-places', eyebrow: '시설과 프로그램', title: '한 건물에서\n여러 가지 하루를.', cols: [] }),
        TX('features', { hpt: 'p4-rent', eyebrow: '단체 대관', title: '단체라면,\n공간을 빌려 쓰세요.', sub: '동호회 · 학교 · 기업 누구나 시간 단위로 빌릴 수 있어요.', cols: [['빈 시간 고르기', '달력에서 시설과 시간을 골라요.'], ['단체 정보 · 인원 입력', '단체 증빙은 사진으로 올려요.'], ['승인 후 결제', '담당자가 확인하면 문자로 알려드려요.']] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('features', { hpt: 'p4-duo', title: '', cols: [['강습 등록,\n미리 담아 두세요.', '강습과 이용권은 온라인으로 등록하고 결제해요. 감면 대상은 첫 방문 때 확인해요.', 'learn:shop', '개인 회원이라면'], ['대관 일정을\n바로 확인하세요.', '빈 시간을 보고 신청하면 담당자가 확인해 확정해 드려요.', 'learn:fac', '단체 · 기관이라면']] }), ...quiet()] },
    pbcampus: { scene: '공단 · 공사 · 공공기관 연수원 — 직원이 직급 · 직무 연수 과정을 확인하고 입교 전 준비하러 와요. 다크 시네마틱 첫 화면, 연수 원칙, 번호 붙은 과정, 연수 시설', purpose: ['learn', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()} 연수원`, title: '공공의 내일을,\n여기서 함께 길러요.', sub: `${org()} 직원이 입사부터 관리자까지 단계마다 거치는 연수를 한곳에서 신청하고 이어 들어요.`, cta: '내 연수 확인하기', link: 'learn:my', cta2: '연수 과정 보기', link2: 'learn:courses', note: '' }),
        TX('features', { hpt: 'p4-intro', eyebrow: '연수 원칙', title: '현장에서 쓰는 역량을,\n현장의 언어로 가르쳐요.', cols: [['직무 중심', '실제 업무 사례로 배우고 바로 적용해요.'], ['단계별 이수', '직급과 경력에 맞춰 들어야 할 연수가 정해져 있어요.'], ['기록이 남는 연수', '이수 현황과 이수증이 내 기록으로 쌓여요.']] }),
        TX('features', { hpt: 'p4-tracks', eyebrow: '연수 과정', title: '지금 열려 있는\n연수 과정', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-stay', eyebrow: '연수 시설', title: '배움에 집중하는\n공간', sub: '강의실과 세미나실은 부서 연수 · 워크숍 용도로도 예약할 수 있어요.', cols: [] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('features', { hpt: 'p4-duo', title: '', cols: [['내 연수 일정을\n먼저 확인해요.', '로그인하면 이번 분기 필수 연수와 신청한 과정이 먼저 보여요.', 'learn:my', '연수생이라면', '나의 연수로'], ['부서 연수를\n함께 계획해요.', '교육 담당자는 과정 신청 현황과 이수 결과를 한 화면에서 확인해요.', 'learn:login', '교육 담당자라면', '담당자 로그인']] }), ...quiet()] },
    pblibrary: { scene: '공공도서관 강좌 — 주민이 독서 · 인문 · 디지털 강좌를 찾아 신청하러 와요. 아치형 열람실 사진, 대출 카드 같은 강좌 카드, 이번 달 일정', purpose: ['apply', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()} 도서관 강좌`, title: '책 옆에서 배우는\n이번 달의 수업', sub: '읽고, 쓰고, 이야기하는 강좌가 도서관에서 열려요. 회원이라면 누구나 신청할 수 있어요.', cta: '이달의 강좌 보기', link: 'learn:courses', cta2: '내 신청 확인', link2: 'learn:my', note: '강좌 자료는 신청 뒤 내 강의실에서 미리 볼 수 있어요.' }),
        TX('features', { hpt: 'p4-shelf', eyebrow: '이달의 강좌', title: '서가에서 고르듯,\n강좌를 골라 보세요.', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-rows', eyebrow: '강좌 일정', title: '다가오는 강좌 일정', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-story', eyebrow: '처음이라면', title: '도서관 회원이면\n바로 신청돼요.', sub: '', cols: [['간편 가입', '휴대폰으로 간편하게 가입해요.'], ['강좌 신청', '정원이 차면 대기 순서대로 안내해요.'], ['강좌 참여', '현장 강좌는 도서관에서, 온라인 강좌는 내 강의실에서 들어요.']] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('cta', { hpt: 'p4-fin', title: '다음 강좌에서\n만나요.', sub: '강좌 문의는 도서관 안내 데스크로 편하게 해 주세요.', cta: '강좌 찾아보기', cols: [] }), ...quiet()] },
    pbyouth: { scene: '청소년 수련관 · 문화의집 — 청소년이 동아리 · 체험 프로그램을 찾고 보호자가 신청을 확인하러 와요. 보라 색면 스티커 콜라주, 색 카드, 큰 글자 벽', purpose: ['apply', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()}`, title: '하고 싶은 거,\n여기서 다 해 봐.', sub: '운동 · 음악 · 코딩 · 동아리까지, 방과 후와 주말에 친구들과 함께하는 프로그램이 열려요.', cta: '프로그램 보기', link: 'learn:courses', cta2: '간편 가입', link2: 'learn:join', note: '9~24세\n누구나' }),
        TX('features', { hpt: 'p4-tiles', eyebrow: '지금 모집 중', title: '이번 시즌\n뭐 할래?', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-words', eyebrow: '수련관에서 열리는 프로그램', title: '', cols: [] }),
        TX('features', { hpt: 'p4-story', eyebrow: '신청 방법', title: '세 단계면\n시작할 수 있어요.', sub: '', cols: [['간편 가입', '휴대폰으로 1분이면 가입해요.'], ['프로그램 신청', '만 14세 미만은 보호자 동의를 함께 받아요.'], ['수련관에서 만나기', '시작 전날 알림으로 시간과 장소를 알려 줘요.']] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('features', { hpt: 'p4-duo', title: '', cols: [['내 프로그램,\n바로 이어서.', '신청한 프로그램과 출석을 한 화면에서 봐요.', 'learn:my', '청소년이라면', '내 프로그램'], ['보호자 계정으로\n함께 확인해요.', '자녀의 신청 · 출석 · 안내 문자를 보호자도 함께 받아요.', '#family', '보호자라면', '보호자 연결']] }), ...quiet()] },
    pbsenior: { scene: '종합사회복지관 · 노인복지관 — 어르신이 강좌를 고르고 전화나 가족 도움으로 신청하러 와요. 큰 사진 위 큰 글씨 카드, 전화 신청 띠, 큰 글씨 강좌 목록', purpose: ['apply', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()}`, title: '오늘도 배우는 즐거움,\n복지관에서 함께해요.', sub: '노래 · 운동 · 스마트폰 · 공예 강좌가 열려요. 글씨는 크게, 신청은 쉽게 만들었어요.', cta: '강좌 보기', link: 'learn:courses', cta2: '전화로 신청', link2: '' }),
        TX('features', { hpt: 'p4-call', title: '인터넷이 어려우면\n전화로 신청하세요.', sub: '담당 선생님이 원하시는 강좌를 함께 찾아 신청해 드려요.', cols: [] }),
        TX('features', { hpt: 'p4-big', eyebrow: '지금 신청할 수 있는 강좌', title: '배우고 싶은 강좌를\n골라 보세요.', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-story', eyebrow: '처음 오셨나요?', title: '신청은\n이렇게 해요.', sub: '', cols: [['강좌 고르기', '보고 싶은 강좌의 「자세히 보기」를 눌러요.'], ['신청하기', '이름과 연락처만 확인하면 돼요.'], ['문자로 안내받기', '시작하는 날과 장소를 문자로 알려 드려요.']] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('features', { hpt: 'p4-duo', title: '', cols: [['신청한 강좌를\n확인해요.', '내 강좌에서 시간표와 출석을 볼 수 있어요.', 'learn:my', '수강생이라면', '내 강좌 보기'], ['부모님 신청을\n대신 도와드려요.', '가족 계정을 연결하면 신청과 안내를 함께 볼 수 있어요.', '#family', '가족이라면', '가족 연결하기']] }), ...quiet()] },
    pbjobs: { scene: '지자체 일자리센터 · 고용복지 교육 — 구직자가 취업 상담을 받고 취업 연계 교육을 신청하러 와요. 50:50 색면 분할, 상담부터 취업까지 4단계, 넓은 과정 카드', purpose: ['apply', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()}`, title: '다음 일,\n혼자 찾지 않게.', sub: '취업 상담부터 직무 교육, 일자리 연계까지 한곳에서 이어져요. 처음이라면 교육부터 둘러보세요.', cta: '취업 연계 교육 보기', link: 'learn:courses', cta2: '내 신청 확인', link2: 'learn:my' }),
        TX('features', { hpt: 'p4-flow', eyebrow: '이렇게 도와드려요', title: '상담에서 취업까지,\n네 단계로 이어져요.', sub: '', cols: [['상담 신청', '희망 직무와 경력을 듣고 방향을 함께 정해요.'], ['맞춤 교육', '필요한 직무 · 자격 교육을 골라 들어요.'], ['일자리 연계', '교육을 마치면 채용 정보와 면접을 안내해요.'], ['취업 후 관리', '일을 시작한 뒤에도 적응을 함께 살펴요.']] }),
        TX('features', { hpt: 'p4-wide', eyebrow: '취업 연계 교육', title: '지금 신청할 수 있는\n교육', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-pull', title: '혼자 고민하지 말고,\n상담부터 시작해요.', sub: '경력이 끊긴 지 오래되었어도, 처음 일을 찾는 중이어도 괜찮아요. 지금 상황에 맞는 길을 함께 찾아요.', cta: '상담 문의하기', link: '#comm', cols: [] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('features', { hpt: 'p4-help', title: '알림마당', sub: '상담이 필요하신가요?', cols: [] }), ...quiet()] },
    pbmuseum: { scene: '박물관 · 미술관 · 문화재단 교육 — 시민 · 가족이 전시 연계 교육과 체험 프로그램을 신청하러 와요. 초대형 세리프 제목, 흰 벽 액자와 명판, 전시 명판형 프로그램', purpose: ['apply', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()} 교육 프로그램`, title: '보는 것에서\n만드는 것으로.', sub: '전시를 보고 끝내지 않도록, 손으로 만들고 이야기 나누는 교육 프로그램이 열려요.', cta: '교육 프로그램 보기', link: 'learn:courses', cta2: '교육 일정', link2: 'learn:cal', note: '배움의 장면\n교육실에서 열리는 만들기 수업' }),
        TX('features', { hpt: 'p4-exhibit', eyebrow: '지금 열린 프로그램', title: '이번 시즌의\n교육 프로그램', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-rows', eyebrow: '교육 일정', title: '다가오는 일정', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-story', eyebrow: '참여 방법', title: '처음 오셔도\n어렵지 않아요.', sub: '', cols: [['프로그램 고르기', '대상과 일정을 보고 골라요.'], ['온라인 신청', '가족 프로그램은 함께할 인원을 적어 주세요.'], ['교육실에서 만나기', '시작 10분 전까지 안내 데스크로 와 주세요.']] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('cta', { hpt: 'p4-fin', title: '다음 프로그램을\n미리 살펴보세요.', sub: '단체 · 학교 교육은 담당자에게 따로 문의해 주세요.', cta: '프로그램 찾아보기', cols: [] }), ...quiet()] },
    pbheritage: { scene: '전통 관공서(격식) — 오래된 행정기관 · 공무원 교육원 직원이 교육 이념과 교육과정을 확인하고 이수하러 와요. 가운데 대칭, 낙관 도장, 두 줄 테두리, 격식 있는 목록', purpose: ['learn', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()}`, title: '바른 행정은\n바른 배움에서 시작해요.', sub: `${org()} 공직자가 갖춰야 할 소양과 직무 역량을 단계에 맞춰 배우고, 이수 기록을 바르게 남겨요.`, cta: '교육과정 안내', link: 'learn:courses', cta2: '나의 이수 현황', link2: 'learn:my' }),
        TX('features', { hpt: 'p4-vals', eyebrow: '교육 이념', title: '세 가지 마음으로\n가르치고 배워요.', cols: [['청렴', '공정하고 깨끗한 행정의 기본을 익혀요.'], ['전문', '맡은 직무를 깊이 있게 다루는 역량을 길러요.'], ['봉사', '주민의 자리에서 생각하는 태도를 배워요.']] }),
        TX('features', { hpt: 'p4-rows', eyebrow: '교육과정', title: '운영 중인 교육과정', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-svc', eyebrow: '민원 · 서비스', title: '자주 찾는 서비스', cols: [] }),
        TX('features', { hpt: 'p4-story', eyebrow: '이수 절차', title: '교육 이수는\n세 단계로 진행해요.', sub: '', cols: [['교육 신청', '소속 부서 승인을 거쳐 교육을 신청해요.'], ['수강 · 평가', '정해진 기간 안에 수강하고 평가를 마쳐요.'], ['이수 기록', '이수 결과가 개인 교육 이력에 바르게 남아요.']] }),
        TX('features', { hpt: 'p4-help', title: '알림마당', sub: '교육 문의', cols: [] }), ...quiet()] },
    pbecon: { scene: '경제진흥원 · 소상공인 지원센터 — 지역 기업 대표 · 소상공인이 지원 사업 공고를 확인하고 창업 · 경영 · 디지털 전환 교육을 신청하러 와요. 가게 · 공방 · 회사 사진 세 장, 사업 공고, 지원 대상별 갈래', purpose: ['apply', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()} 기업 지원 교육`, title: '작은 가게도,\n오래 가도록.', sub: '창업 준비부터 매장 운영 · 온라인 판매 · 디지털 전환까지, 지역 기업과 소상공인을 위한 교육을 열어요. 지원 사업과 함께 신청할 수 있어요.', cta: '교육 과정 보기', link: 'learn:courses', cta2: '사업 공고', link2: 'learn:notice', note: '' }),
        TX('features', { hpt: 'p4-ann', eyebrow: '사업 공고', title: '지금 확인할\n지원 사업 · 교육 공고', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-tiers', eyebrow: '지원 대상', title: '내 상황에 맞는\n교육부터 골라요.', sub: '', cols: [['예비 창업자', '사업 계획 · 상권 분석 · 자금 준비를 차근차근 배워요.', 'learn:courses'], ['소상공인', '매장 운영 · 온라인 판매 · 홍보 실무를 바로 써먹어요.', 'learn:courses'], ['지역 중소기업', '재직자 직무 · 디지털 전환 교육을 회사 단위로 신청해요.', 'learn:courses']] }),
        TX('features', { hpt: 'p4-rows', eyebrow: '교육 일정', title: '다가오는 교육 일정', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('features', { hpt: 'p4-help', title: '알림마당', sub: '어떤 지원을 받을 수 있는지 궁금하신가요?', cols: [] }), ...quiet()] },
    pbdigital: { scene: '정보 · 산업진흥원 — 청년 구직자는 SW · AI 인재 양성 과정을, 지역 기업 재직자는 직무 향상 교육을 찾으러 와요. 모눈 바탕 · 브라우저 창 사진 · 고정폭 번호 과정 카드 · 선발부터 수료까지 단계', purpose: ['apply', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()} 디지털 인재 아카데미`, title: '코드 한 줄로\n지역의 내일을.', sub: 'SW · AI 인재 양성 과정과 기업 재직자 교육이 한곳에 모여 있어요. 지금 모집 중인 과정을 확인해 보세요.', cta: '모집 중인 과정', link: 'learn:courses', cta2: '내 학습', link2: 'learn:my', note: '' }),
        TX('features', { hpt: 'p4-dual', eyebrow: '누구를 위한 교육인가요', title: '배우려는 사람과\n키우려는 회사 모두에게', sub: '', cols: [['SW · AI 인재\n양성 과정', '프로젝트 중심 과정으로 실무 포트폴리오를 만들어요.', 'learn:courses', '과정 보기'], ['기업 재직자\n향상 교육', '회사에서 필요한 기술을 짧고 깊게 배워요. 회사 단위 신청도 돼요.', 'learn:login', '기업 담당자 로그인']] }),
        TX('features', { hpt: 'p4-code', eyebrow: '모집 중', title: '지금 열린 과정', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-flow', eyebrow: '진행 방식', title: '선발부터 수료까지,\n이렇게 진행해요.', sub: '', cols: [['신청 · 선발', '지원서를 내면 과정 기준에 따라 선발해요.'], ['핵심 교육', '현업 강사와 기초부터 실무까지 배워요.'], ['팀 프로젝트', '실제 과제로 결과물을 만들어요.'], ['수료 · 연계', '수료 후 채용 · 후속 과정을 안내해요.']] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('cta', { hpt: 'p4-fin', title: '다음 기수 모집을\n놓치지 마세요.', sub: '모집 일정은 공지와 알림으로 먼저 알려 드려요.', cta: '과정 찾아보기', cols: [] }), ...quiet()] },
    pbassoc: { scene: '민간 협회 · 학회 · 산업 단체 — 회원사 담당자가 회원 전용 교육 · 세미나를 신청하고 자격 과정을 확인하러 와요. 기울어진 회원증 카드, 회원 혜택, 입장권 같은 세미나 일정', purpose: ['learn', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()} 교육 · 세미나`, title: '회원이라\n더 가까운 배움.', sub: '회원사 임직원을 위한 정기 교육과 세미나, 자격 과정을 한곳에서 신청하고 이력으로 남겨요.', cta: '교육 · 세미나 보기', link: 'learn:courses', cta2: '회원 로그인', link2: 'learn:login', note: '회원사 교육 · 세미나' }),
        TX('features', { hpt: 'p4-member', eyebrow: '회원 혜택', title: '회원사라면\n이렇게 달라요.', sub: '회원 로그인 뒤 신청하면 혜택이 자동으로 적용돼요.', cta: '회원 로그인', link: 'learn:login', cta2: '회원 가입 안내', link2: 'learn:join', cols: [['회원 전용 교육', '회원사 임직원만 들을 수 있는 과정이 따로 열려요.'], ['세미나 우선 신청', '정원이 있는 세미나는 회원에게 먼저 열어요.'], ['교육 이력 관리', '수료 이력과 수료증을 회사 단위로 모아 볼 수 있어요.']] }),
        TX('features', { hpt: 'p4-ticket', eyebrow: '교육 · 세미나 일정', title: '다가오는 일정', sub: '', cols: [] }),
        TX('features', { hpt: 'p4-story', eyebrow: '자격 과정', title: '자격 과정은\n세 단계로 이어져요.', sub: '', cols: [['과정 이수', '정해진 교육 시간을 채워요.'], ['평가 응시', '과정을 마치면 평가에 응시해요.'], ['수료 · 자격 기록', '결과는 내 이력에 남고 증서를 내려받아요.']] }),
        TX('features', { hpt: 'p4-quote', title: '', cols: [] }),
        TX('features', { hpt: 'p4-duo', title: '', cols: [['회원사 담당자라면', '임직원 신청 현황과 수료 이력을 한 화면에서 확인해요.', 'learn:login', '회원사', '담당자 로그인'], ['아직 회원이\n아니라면', '공개 교육은 누구나 신청할 수 있어요. 가입하면 회원 혜택이 열려요.', 'learn:join', '처음 오셨다면', '가입 안내']] }), ...quiet()] }
  };
  MINE.forEach(id => { if (TPL.some(t => t.id === 't44-' + id)) return; const c = B[id];
    TPL.push({ id: 't44-' + id, name: DEF[id].name, types: ['public'], g44: 1, sub: DEF[id].sub, ed: DEF[id].ed, scene: c.scene, color: DEF[id].acc, tone: '신뢰', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, noPalette: true, build: c.build }); });
  /* siteFromTpl은 뒤에 실리는 스크립트(tpl-d 등)도 감싸므로, 테마 · 색 · 사진을 마지막에 확정하도록 문서 읽기가 끝난 뒤 가장 바깥에서 감싼다 */
  const wrapSFT = () => { if (typeof siteFromTpl === 'function' && !siteFromTpl.hp44p) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && /^t44-pb/.test(tp.id || '') ? tp.id.slice(4) : ''; if (PH[id]) { if (s.theme !== id && HPT.has(id)) HPT.apply(s, id, { keepColor: false, color: DEF[id].acc }); s.color = DEF[id].acc; /* 시안 색 그대로(어두운 바탕 테마도 대비 보정으로 바뀌지 않게) */ if (window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, PH[id]); s.img = s.img || {}; Object.keys(s.photos).forEach(sl => { const v = HPSTOCK.slotImg(s.photos[sl], sl); if (v) s.img[sl] = v; }); } } } catch (e) { console.error('hp44-public photo', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hp44p = 1; siteFromTpl = f; window.siteFromTpl = f; } };
  wrapSFT(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { if (window.siteFromTpl && !window.siteFromTpl.hp44p) wrapSFT(); });
  /* 자동 보강(HPT.enrich)이 첫 화면 바로 아래에 넣는 공지 · FAQ는 첫 화면 리듬을 깨므로 마지막 행동 섹션 앞으로 옮긴다. 알림마당(p4-help)이 있으면 자동 공지는 숨긴다 */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hp44p) { const e0 = HPT.enrich; const f = s => { const r = e0(s); try { if (mine(s) && Array.isArray(s.sections)) { const L = s.sections;
      const isMv = x => x && (x.type === 'notices' || (x.type === 'text' && x.data && x.data.hpt === 'faq'));
      const mv = L.filter(isMv); if (mv.length) { for (let k = L.length - 1; k >= 0; k--) if (isMv(L[k])) L.splice(k, 1);
        if (L.some(x => x && x.data && x.data.hpt === 'p4-help')) mv.forEach(x => { if (x.type === 'notices') x.hide = true; });
        let at = -1; L.forEach((x, k) => { if (x && x.data && /^p4-(duo|fin|help)$/.test(x.data.hpt)) at = k; }); if (at < 0) at = L.length; L.splice(at, 0, ...mv); } } } catch (e) { console.error('hp44-public enrich', e); } return r; };
    Object.keys(e0).forEach(k => { try { f[k] = e0[k]; } catch (e) { } }); f.hp44p = 1; HPT.enrich = f; }
  window.HP44P = { DEF, fits, css, SEC, B, PH, review, figsK };
})();
