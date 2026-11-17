/* v43.9 hpv-corp — 기업 · 공공 홈페이지 템플릿 5종(D3 시안 → 실제 템플릿)
   대표님(2026-11-17 22:41): 「디자인이 너무 구려서 그래」 「저거보다 5배 이상은 고 퀄리티로」 → 시안 12개 「전부 마음에 들어」(22:57) · 관공서 · 전통 기업 방향 추가.
   원천 시안: plan/tpl439/D3/mock-a-keynote · b-journal · c-poster · d-civic · e-heritage.html
   - cvkeynote(키노트, 기업 HRD) · cvjournal(시민 저널, 공공 시민 강좌) · cvposter(시티 포스터, 공공 시설 · 대관) · cvcivic(관공서, 공공 직원 교육) · cvheritage(전통 기업, 대기업 · 금융 연수원)
   - 원칙: 한 화면 한 메시지(첫 화면 = 큰 제목 + 부제 + 버튼 2개 + 강한 사진). 첫 화면에 판 · 칩 · 숫자 띠를 넣지 않는다.
   - 사실: 숫자(이수율 · 과정 수 · 무료 강좌 수 · 운영 시간)는 실제 데이터(S.classes · S.fac · S.reviews)로 그릴 때마다 계산하고, 없으면 그 덩어리를 숨긴다. 후기는 실제 후기만.
   - 링크: 학습자 실제 경로(#my · #courses · #badges · #cal · #notice · #login · #fac · #shop · tel:)와 과정 상세(#p-c-<id> → 게시 때 #class/<id>)만.
   - CSS는 게시본 Shadow DOM에 닿도록 siteHTML 문자열 안에 넣는다(범위 .cv · 이 테마일 때만 머리 · 바닥 줄 보정). hpth · hpprem · hpsec* · hpx-* · hpup-*는 고치지 않는다. */
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
  const PATH = { arrow: 'M5 12h14M13 6l6 6-6 6', chev: 'M9 6l6 6-6 6', search: 'M11 4.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM20 20l-4.2-4.2', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2' };
  const ic = (k, n, w) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="${w || 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATH[k] || PATH.arrow}"/></svg>`;
  const ROUTES = ['home', 'shop', 'comm', 'notice', 'textbooks', 'my', 'courses', 'fac', 'badges', 'cal', 'login', 'join'];
  const safeU = v => (typeof safeURL === 'function' ? safeURL(v) : /^https?:\/\//.test(v) ? v : '');
  const href = (v, dflt) => { v = String(v || ''); if (!v) return dflt || ''; if (v.startsWith('learn:')) { const r = v.slice(6); return '#' + (ROUTES.includes(r) ? r : 'home'); }
    if (v.startsWith('cls:')) return '#p-c-' + v.slice(4); if (v.startsWith('page:')) return '#p-' + v.slice(5); if (v.startsWith('url:')) return safeU(v.slice(4)); if (v.startsWith('tel:')) return 'tel:' + v.slice(4).replace(/[^\d-]/g, ''); if (/^#[a-z]/.test(v)) return v; return dflt || ''; };
  const aA = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const mark = (h, x) => { const m = editing() ? HPE.map.get(x) : null; return m ? h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`) : h; };
  const empty = (x, msg) => editing() ? mark(`<section class="hpt cv cv-emp"><div class="cvw"><p>${E(msg || '표시할 실제 데이터가 아직 없어 게시본에서는 이 섹션이 숨겨져요.')}</p></div></section>`, x) : '';

  /* ── 실제 데이터 ── */
  const live = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => c && c.status !== '종료' && c.name && !(okD(c.end) && days(tday(), c.end) < 0));
  /* 기업 · 공공 직원 교육은 방문자가 임직원이라 사내 과정도 보여 준다(이름 · 일정만). 시민 · 시설은 공개 강좌만(pubCls) */
  const staffOrg = () => ty() === 'corp' || (ty() === 'public' && ed() !== 'citizen' && ed() !== 'facility');
  const list = n => { let L = []; try { if (!staffOrg() && typeof pubCls === 'function') { const ids = pubCls(n || 12); L = ids.map(id => (S.classes || []).find(c => c.id === id)).filter(Boolean); } else L = live(); } catch (e) { L = live(); }
    return L.filter(c => c && c.name).sort((a, b) => (!!b.legal - !!a.legal) * 0 || String(a.start || '9').localeCompare(String(b.start || '9'))).slice(0, n || 12); };
  const done = (c, id) => { if (typeof clsDone === 'function') { try { return !!clsDone(c, id); } catch (e) { } } const p = +(((c.prog || {})[id] || {}).p) || 0; return p >= (((c.criteria || {}).threshold) || 100); };
  const rateOf = L => { let n = 0, d = 0; L.forEach(c => { (c.learners || []).forEach(id => { n++; if (done(c, id)) d++; }); }); return n ? { r: Math.round(d * 100 / n), n, d } : null; };
  const learners = () => { const set = new Set(); live().forEach(c => (c.learners || []).forEach(id => set.add(id))); return set.size; };
  const kindL = c => c.kind === 'episode' ? (c.sub || '정해진 회차') : c.kind === 'sub' ? '구독' : '온라인 · 자유 수강';
  const whenL = c => { const t = tday(); if (okD(c.start) && days(t, c.start) > 0) return `${md(c.start)} 시작`; if (okD(c.end)) return `${md(c.end)}까지`; return '상시 수강'; };
  const priceL = c => +c.price ? won(c.price) : '무료';
  const hrs = c => +c.hours ? `${+c.hours}시간` : '';
  const cH = c => '#p-c-' + c.id;
  const review = () => { try { const R = (S.reviews || []).filter(r => r && !r.hidden && String(r.body || '').trim().length >= 15 && (+r.stars || 5) >= 4); const r = R[0]; if (!r) return null; const c = (S.classes || []).find(x => x.id === r.cls); return { body: String(r.body).trim(), cls: c ? c.name : '' }; } catch (e) { return null; } };
  const notes = n => { try { return [...(S.notices || []), ...(S.classes || []).flatMap(c => c.notices || [])].filter(x => x && x.title && !x.hidden && !x.draft).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, n || 4); } catch (e) { return []; } };
  const facs = () => { try { return ((S.fac && S.fac.facilities) || []).filter(f => f && f.on !== false && f.name); } catch (e) { return []; } };
  const LV = () => { const J = ((typeof S !== 'undefined' && S && S.journey) || []).map(j => j && j.name).filter(Boolean); return J.length >= 3 ? J.slice(0, 4) : ['입문', '실무', '리더']; };

  /* ── 사진: 기관 사진(site.img) → 템플릿 지정 → 스톡 ── */
  const H = () => window.HPSTOCK;
  const abs = u => { try { return new URL(u, (H() && H().base) || location.href).href; } catch (e) { return u; } };
  const stk = (id, sz) => { const h = H(); if (!h || typeof h.get !== 'function') return null; const x = h.get(id); if (!x) return null; return { src: abs(h.url(x, sz === 'lg' ? '' : 'sm')), alt: x.alt || '', pos: x.focus || '50% 50%' }; };
  const slotP = (s, slot, d, fb) => { try { if (window.HPS && typeof HPS.photo === 'function') { const p = HPS.photo(s, slot, d); if (p) return { src: p.src, alt: p.alt, pos: p.pos }; } } catch (e) { } return fb ? stk(fb, 'lg') : null; };
  const clsP = (c, i, pool) => { const id = pool && pool[i % pool.length]; return (id && stk(id)) || (() => { try { const x = H() && H().photo(c.name, c.id, { id: true, scope: 'cv' }); return x ? { src: abs(H().url(x, 'sm')), alt: x.alt || '', pos: x.focus || '50% 50%' } : null; } catch (e) { return null; } })(); };
  const img = (p, cls, eager) => p ? `<figure class="${cls || 'cv-ph'}"><img src="${E(p.src)}" alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>` : '';

  /* ── 테마 5종 ── */
  const DEF = {
    cvkeynote: { name: '키노트', desc: '가운데 큰 제목과 큰 사진 한 장, 짙은 블록의 이수율 숫자 — 제품 발표처럼 단정한 기업 HRD 러닝센터', tags: ['corp', 'public'], tone: 'light', dens: '여유',
      acc: '#2D5BFF', bg: '#FFFFFF', alt: '#F5F5F7', ink: '#0A0F1C', mu: '#4B5263', r: 28, br: 999, hero: 'split', vis: 'mock', illu: 'doc', card: 'flat', look: 'mintSoft', sw2: '#0A0F1C', base: 'clean', hk: 'cover', hp: 'brief', ck: 'photo', sh: 'none' },
    cvjournal: { name: '시민 저널', desc: '세리프 제목 · 종이색 바탕 · 사진 콜라주로 이번 학기 강좌를 잡지처럼 — 공공 시민 강좌 · 평생학습관', tags: ['public', 'lifelong'], tone: 'light', dens: '여유',
      acc: '#0F4C5C', bg: '#F5F0E6', alt: '#EDE5D6', ink: '#16231F', mu: '#46524D', r: 4, br: 4, hero: 'split', vis: 'mock', illu: 'book', card: 'line', look: 'corpPortal', sw2: '#EDE5D6', base: 'warm', hk: 'desk', hp: 'ledger', ck: 'photo', sh: 'none' },
    cvposter: { name: '시티 포스터', desc: '전면 사진 위 큰 고딕 제목 · 신호 노랑 · 굵은 선 그리드 — 공공 체육 · 문화 시설과 대관', tags: ['public'], tone: 'light', dens: '여유',
      acc: '#0A6B45', bg: '#F2F1EC', alt: '#FFFFFF', ink: '#0D0D0D', mu: '#474744', r: 0, br: 0, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: '#0D0D0D', base: 'clean', hk: 'cover', hp: 'stage', ck: 'photo', sh: 'none' },
    cvcivic: { name: '관공서', desc: '공식 누리집 띠 · 밑줄 링크 「자주 찾는 서비스」 · 날짜 열 교육 목록 — 정부 · 지자체처럼 정돈된 공공 직원 교육', tags: ['public', 'corp'], tone: 'light', dens: '보통',
      acc: '#0B3A75', bg: '#FFFFFF', alt: '#F3F5F8', ink: '#111827', mu: '#3F4756', r: 6, br: 6, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: '#E7EEF8', base: 'official', hk: 'desk', hp: 'ledger', ck: 'list', sh: 'none' },
    cvheritage: { name: '전통 기업', desc: '아이보리 바탕 · 가는 제목 · 로마 숫자 계층 교육 체계 · 금색 선 — 대기업 · 금융권 연수원의 격식', tags: ['corp'], tone: 'light', dens: '여유',
      acc: '#122A4A', bg: '#F7F5F0', alt: '#FFFFFF', ink: '#14181F', mu: '#4A505B', r: 0, br: 0, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: '#F7F5F0', base: 'official', hk: 'desk', hp: 'ledger', ck: 'photo', sh: 'none' }
  };
  const tok = (hf, hw, h1, h1m, sec, secm, w) => ({ hf, hw, hls: -0.04, h1, h1m, lh1: 1.12, h2: 52, h2m: 32, h3: 22, body: 17, blh: 1.65, lead: 20, ey: { fs: 15, ls: 0, fw: 700, tt: 'none' }, sec, secm, w, gut: 40,
    r: 24, rs: 12, br: 999, bh: 52, bpx: 26, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' });
  const HD = { cvkeynote: tok('sans', 800, 88, 42, 150, 88, 1200), cvjournal: tok('serif', 700, 80, 42, 150, 88, 1240), cvposter: tok('sans', 900, 88, 44, 150, 88, 1280), cvcivic: tok('sans', 800, 72, 40, 140, 80, 1200), cvheritage: tok('sans', 300, 68, 40, 150, 88, 1280) };
  const MINE = Object.keys(DEF);
  const mine = s => !!(s && s.theme && DEF[s.theme]);
  const thOf = s => (s && DEF[s.theme]) ? s.theme : 'cvkeynote';
  const staffW = () => ty() === 'public' ? '직원' : '임직원';
  const fits = id => { const t = ty(), e = ed(); if (id === 'cvkeynote') return t === 'corp'; if (id === 'cvheritage') return t === 'corp'; if (id === 'cvcivic') return t === 'public' && (e === 'staff' || !e); if (id === 'cvjournal') return (t === 'public' && e === 'citizen') || t === 'lifelong'; if (id === 'cvposter') return t === 'public' && e === 'facility'; return false; };

  /* ── 공통 조각 ── */
  const btn = (cls, label, h, arrow) => label ? `<a class="cv-b ${cls}" ${aA(h)}>${E(label)}${arrow ? ic(arrow === 1 ? 'arrow' : arrow, 20, 2) : ''}</a>` : '';
  const heroBtns = (d, c1, c2, a1, a2) => `<div class="cv-cta">${btn(c1, d.cta, href(d.link, '#courses'), a1)}${btn(c2, d.cta2, href(d.link2, '#my'), a2)}</div>`;
  const ttl = (d, def) => NL(d.title || def || '');
  const head = (d, extra) => `${d.eyebrow ? `<p class="cv-ey">${E(d.eyebrow)}</p>` : ''}<h2 class="cv-h2">${ttl(d)}</h2>${d.sub ? `<p class="cv-sd">${E(d.sub)}</p>` : ''}${extra || ''}`;
  const sec = (x, s, kind, inner, cls) => mark(`<section class="hpt cv ${thOf(s)} cv-${kind}${cls ? ' ' + cls : ''}">${inner}</section>`, x);

  /* ── 첫 화면 ── */
  function heroKeynote(s, d) { const p = slotP(s, 'hero', d, 'grp-01');
    return `<section class="hpt cv cvkeynote cv-hero"><div class="cvw cv-c">${d.eyebrow ? `<p class="cv-ey">${E(d.eyebrow)}</p>` : ''}<h1>${(() => { const t = String(d.title || '').split('\n'); return t.length > 1 ? `${E(t[0])}<br><span>${E(t.slice(1).join(' '))}</span>` : E(t[0]); })()}</h1>${d.sub ? `<p class="cv-lead">${E(d.sub)}</p>` : ''}
${heroBtns(d, 'pri', 'gh', 0, 'chev')}${d.note ? `<p class="cv-note">${E(d.note)}</p>` : ''}</div>${p ? `<div class="cv-big">${img(p, 'cv-ph', 1)}</div>` : ''}</section>`; }
  function heroJournal(s, d) { const p1 = slotP(s, 'hero', d, 'sen-01'); const p2 = slotP(s, 'about', null, 'hum-26');
    return `<section class="hpt cv cvjournal cv-hero"><div class="cvw cv-g"><div>${d.eyebrow ? `<p class="cv-issue">${E(d.eyebrow)}</p>` : ''}<h1>${(() => { const t = String(d.title || '').split('\n'); return t.length > 1 ? `${E(t[0])}<br><em>${E(t.slice(1).join(' '))}</em>` : E(t[0]); })()}</h1>${d.sub ? `<p class="cv-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 1, 0)}</div>
<div class="cv-col">${img(p1, 'cv-c1', 1)}${img(p2, 'cv-c2')}${d.note ? `<p class="cv-cap">${E(d.note)}</p>` : ''}</div></div></section>`; }
  function heroPoster(s, d) { const p = slotP(s, 'hero', d, 'spo-08');
    return `<section class="hpt cv cvposter cv-hero">${img(p, 'cv-bg', 1)}<div class="cv-in"><div class="cvw">${d.eyebrow ? `<span class="cv-tag">${E(d.eyebrow)}</span>` : ''}<h1>${NL(d.title)}</h1><div class="cv-row">${d.sub ? `<p class="cv-lead">${E(d.sub)}</p>` : '<span></span>'}${heroBtns(d, 'sig', 'wh', 1, 1)}</div></div></div></section>`; }
  function heroCivic(s, d) { const p = slotP(s, 'hero', d, 'hum-51');
    return `<section class="hpt cv cvcivic cv-hero"><div class="cvw cv-g"><div>${d.eyebrow ? `<p class="cv-crumb">${E(d.eyebrow)}</p>` : ''}<h1>${NL(d.title)}</h1>${d.sub ? `<p class="cv-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'sec', 1, 0)}${d.note ? `<p class="cv-note">${E(d.note)} <a href="#courses">교육과정 전체 보기</a></p>` : ''}</div>${p ? `<div class="cv-phw">${img(p, 'cv-ph', 1)}</div>` : ''}</div></section>`; }
  function heroHeritage(s, d) { const p = slotP(s, 'hero', d, 'hum-46');
    return `<section class="hpt cv cvheritage cv-hero"><div class="cv-tx">${d.eyebrow ? `<p class="cv-est">${E(d.eyebrow)}</p>` : ''}<h1>${(() => { const t = String(d.title || '').split('\n'); return t.length > 1 ? `${E(t[0])}<br><b>${E(t.slice(1).join(' '))}</b>` : `<b>${E(t[0])}</b>`; })()}</h1>${d.sub ? `<p class="cv-lead">${E(d.sub)}</p>` : ''}${heroBtns(d, 'pri', 'line', 1, 0)}</div>
${p ? `<figure class="cv-hf"><img src="${E(p.src)}" alt="${E(p.alt)}" loading="eager" fetchpriority="high" decoding="async" style="object-position:${E(p.pos)}">${d.note ? `<figcaption>${E(d.note)}</figcaption>` : ''}</figure>` : ''}</section>`; }
  const HERO = { cvkeynote: heroKeynote, cvjournal: heroJournal, cvposter: heroPoster, cvcivic: heroCivic, cvheritage: heroHeritage };

  /* ── 섹션 ── */
  const SEC = {};
  /* 큰 숫자 하나(키노트): 필수 교육 이수율(실제 계산) · 가장 이른 마감 */
  SEC['cv-stat'] = (x, s) => { const d = x.data || {}; const L = live().filter(c => c.legal); const R = rateOf(L.length ? L : live()); if (!R) return empty(x);
    const next = L.filter(c => okD(c.end)).sort((a, b) => a.end.localeCompare(b.end))[0];
    const names = L.slice(0, 5).map(c => c.name.replace(/\s*\(.*\)$/, '')).join(' · ');
    return sec(x, s, 'stat', `<div class="cvw"><div class="cv-sg"><div class="cv-num">${R.r}<small>%</small></div><div><p class="cv-t">${E(d.title || (L.length ? `지금 ${staffW()} 필수 교육 이수율이에요. 마감 전에 함께 끝내요.` : '지금 수강 중인 과정의 이수율이에요.'))}</p><p class="cv-d">${E(d.sub || (names ? `${names}. ${L.length ? '법정 교육을 휴대폰으로 짧게 나눠 들을 수 있어요.' : ''}` : ''))}</p></div></div>
<div class="cv-line"><span>${next ? `가장 가까운 마감 · ${E(next.name)} ${E(mdd(next.end))}` : `수강 인원 ${R.n.toLocaleString('ko-KR')}명 기준`}</span><a href="#my">내 필수 교육 확인하기 ${ic('arrow', 18, 2)}</a></div></div>`); };
  /* 과정 카드 3장(키노트) */
  SEC['cv-cards'] = (x, s) => { const d = x.data || {}; const L = list(3); if (!L.length) return empty(x);
    return sec(x, s, 'cards', `<div class="cvw"><div class="cv-head"><div>${head(d)}</div><a class="cv-more" href="#courses">전체 과정 ${live().length}개 보기 ${ic('chev', 18, 2)}</a></div><div class="cv-cg">${L.map((c, i) => `<a class="cv-card" ${aA(cH(c))}>${img(clsP(c, i, ['hum-41', 'grp-03', 'cor-14', 'cor-01']))}<div class="cv-bd"><p class="cv-tg">${E(c.legal ? '필수 교육' : kindL(c))}</p><h3>${E(c.name)}</h3><p>${E([c.teacher, hrs(c)].filter(Boolean).join(' · ') || '자세한 안내는 과정 페이지에서 확인해요.')}</p><div class="cv-m"><span>${E(c.kind === 'episode' ? '집합 · 회차' : '온라인')}</span><b>${E(whenL(c))}</b></div></div></a>`).join('')}</div></div>`); };
  /* 2열 이야기 + 3단계(키노트 · 시민 저널 · 관공서 안내) */
  SEC['cv-story'] = (x, s) => { const d = x.data || {}; const th = thOf(s); const cols = (d.cols || []).filter(c => c && c[0]).slice(0, 3); const p = slotP(s, th === 'cvjournal' ? 'cta' : 'about', null, th === 'cvjournal' ? 'hum-05' : th === 'cvcivic' ? 'lec-01' : 'hum-10');
    return sec(x, s, 'story', `<div class="cvw cv-sg2">${img(p)}<div>${head(d)}<ol class="cv-steps">${cols.map((c, i) => `<li><span class="cv-n">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div></li>`).join('')}</ol></div></div>`); };
  /* 인용 후기 하나(실제 후기만) */
  SEC['cv-quote'] = (x, s) => { const r = review(); if (!r) return empty(x, '실제 수강 후기(15자 이상 · 별 4개 이상)가 생기면 여기에 크게 보여요.'); const th = thOf(s);
    return sec(x, s, 'quote', `<div class="cvw">${th === 'cvjournal' ? '<div class="cv-mk" aria-hidden="true">“</div>' : ''}<blockquote>${th === 'cvjournal' ? '' : '“'}${E(r.body.slice(0, 120))}${th === 'cvjournal' ? '' : '”'}</blockquote><p class="cv-who">${th !== 'cvjournal' ? '<i aria-hidden="true">' + E((r.cls || org()).slice(0, 1)) + '</i>' : ''}<span><b>수강생</b>${r.cls ? ` · ${E(r.cls)}` : ''}</span></p></div>`); };
  /* 마지막 두 갈래(키노트 판 · 포스터 블록 · 전통 기업 블록) */
  SEC['cv-duo'] = (x, s) => { const d = x.data || {}; const th = thOf(s); const C = (d.cols || []).slice(0, 2); const LK = th === 'cvposter' ? ['#shop', '#fac'] : th === 'cvheritage' ? ['#my', '#courses'] : ['#my', '#login'];
    const EY = th === 'cvposter' ? ['개인 회원이라면', '단체 · 기관이라면'] : th === 'cvheritage' ? [staffW(), '교육 체계'] : [`${staffW()}이라면`, '교육 담당자라면'];
    const BT = th === 'cvposter' ? ['', ''] : th === 'cvheritage' ? ['나의 학습으로', '전체 과정 보기'] : ['내 교육 시작하기', '담당자 로그인'];
    return sec(x, s, 'duo', `<div class="cvw cv-dg">${C.map((c, i) => `<a class="cv-pn p${i}" href="${LK[i]}"><div><p class="cv-k">${E(EY[i])}</p><h3>${NL(c[0])}${th === 'cvposter' ? ic('arrow', 48, 1.75) : ''}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div>${BT[i] ? `<span class="cv-pb">${E(BT[i])}${th === 'cvheritage' ? ic('arrow', 20, 1.6) : ''}</span>` : ''}</a>`).join('')}</div>`); };
  /* 시민 저널: 접수 띠(실제 개강일 · 전화) */
  SEC['cv-rail'] = (x, s) => { const d = x.data || {}; const L = list(12); const nx = L.filter(c => okD(c.start) && days(tday(), c.start) >= 0).sort((a, b) => a.start.localeCompare(b.start))[0]; const tel = telOf();
    const big = d.title || (nx ? `${mdd(nx.start)} 개강` : L.length ? `지금 신청할 수 있는 강좌 ${L.length}개` : ''); if (!big) return empty(x);
    return sec(x, s, 'rail', `<div class="cvw"><b class="cv-d">${E(big)}</b><p>${E(d.sub || `${org()} 주민이라면 누구나 신청할 수 있어요.`)}${tel ? ` · 전화 신청 <a href="tel:${E(tel)}">${E(tel)}</a>` : ''}</p><a class="cv-go" href="#courses">강좌 신청하기 ${ic('chev', 18, 2)}</a></div>`); };
  /* 시민 저널: 잡지형 강좌 3개 */
  SEC['cv-mag'] = (x, s) => { const d = x.data || {}; const L = list(3); if (!L.length) return empty(x);
    return sec(x, s, 'mag', `<div class="cvw"><div class="cv-sh"><div>${head(d)}</div><a class="cv-more" href="#courses">강좌 ${list(40).length}개 전체 보기 →</a></div><div class="cv-ml">${L.map((c, i) => `<a class="cv-art${i ? '' : ' cv-lg'}" ${aA(cH(c))}>${img(clsP(c, i, ['cam-07', 'hum-24', 'pho-01']))}<div class="cv-ab"><p class="cv-cat">${E(kindL(c))} <span>${E(hrs(c) || whenL(c))}</span></p><h3>${E(c.name)}</h3>${!i && c.teacher ? `<p class="cv-ad">${E(c.teacher)}와 함께해요. 자세한 일정은 강좌 안내에서 확인해요.</p>` : ''}<p class="cv-meta"><span>${E(whenL(c))}</span><b>${E(priceL(c))}</b></p></div></a>`).join('')}</div></div>`); };
  /* 시민 저널: 사진 띠(무료 강좌 수 — 실제 계산) */
  SEC['cv-band'] = (x, s) => { const d = x.data || {}; const L = list(40); if (!L.length) return empty(x); const fr = L.filter(c => !+c.price).length; const p = slotP(s, 'space', null, 'hum-13');
    const t = d.title || (fr && fr < L.length ? `강좌 ${L.length}개 중 ${fr}개는\n무료로 열려요.` : fr ? `지금 열린 강좌 ${L.length}개,\n모두 무료예요.` : `지금 열린 강좌\n${L.length}개를 만나 보세요.`);
    return sec(x, s, 'band', `${img(p, 'cv-bg')}<div class="cv-in"><div class="cvw"><div class="cv-bt"><h2>${NL(t)}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div></div></div>`); };
  /* 시민 저널: 마지막 행동 띠 */
  SEC['cv-fin'] = (x, s) => { const d = x.data || {}; const tel = telOf();
    return sec(x, s, 'fin', `<div class="cvw cv-fg"><div><h2>${ttl(d, '배우고 싶은 강좌를\n지금 찾아보세요.')}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div><div class="cv-acts"><a class="cv-b wh" href="#courses">${E(d.cta || '강좌 찾아보기')}<span>→</span></a>${tel ? `<a class="cv-b ol" href="tel:${E(tel)}">전화 문의 ${E(tel)}<span>→</span></a>` : `<a class="cv-b ol" href="#notice">공지 보기<span>→</span></a>`}</div></div>`); };
  /* 시티 포스터: 첫 화면 아래 한 줄 바로 가기 */
  SEC['cv-quick'] = (x, s) => { const F = facs().filter(f => f.kind === 'time'); const f0 = F[0]; const hr = f0 && f0.hours && f0.hours[1];
    const Q = [['오늘 운영', hr ? `${hr[0]} – ${hr[1]}` : '운영 시간 안내', '#fac'], ['시설 예약', F.slice(0, 2).map(f => f.name).join(' · ') || '빈 시간 보기', '#fac'], ['강습 · 이용권', '등록 · 결제', '#shop'], ['공지 · 휴관', '휴관일 안내', '#notice']];
    return sec(x, s, 'quick', `<div class="cvw cv-qg">${Q.map(q => `<a href="${q[2]}"><div>${E(q[0])}<span>${E(q[1])}</span></div>${ic('chev', 22, 2)}</a>`).join('')}</div>`); };
  /* 시티 포스터: 큰 운영 시간 + 표(실제 시설 시간) */
  SEC['cv-hours'] = (x, s) => { const d = x.data || {}; const F = facs().filter(f => f.kind === 'time' && f.hours); const f0 = F[0]; if (!f0) return empty(x);
    const h = k => (f0.hours || {})[k]; const wk = h(1) || h(2); if (!wk) return empty(x); const hh = t => String(t || '').slice(0, 2);
    const cl = (f0.closed || [])[0]; const tel = telOf(); const row = (b, v, sm) => `<div><b>${E(b)}</b><span>${E(v)}</span>${sm ? `<small>${E(sm)}</small>` : ''}</div>`;
    return sec(x, s, 'hours', `<div class="cvw cv-hg"><div class="cv-num">${E(hh(wk[0]))}<em>—</em>${E(hh(wk[1]))}</div><div class="cv-tx"><p class="cv-idx">운영 시간</p><h3>${E(d.title || '출근 전에도, 퇴근 후에도 열려 있어요.')}</h3><p>${E(d.sub || `${f0.name} 기준이에요. 시설마다 운영 시간이 조금씩 달라요.`)}</p></div>
<div class="cv-tb">${row('평일', `${wk[0]} – ${wk[1]}`)}${row('토요일', h(6) ? `${h(6)[0]} – ${h(6)[1]}` : '휴관')}${row('일요일 · 공휴일', h(0) ? `${h(0)[0]} – ${h(0)[1]}` : '휴관')}${row(cl ? '휴관 안내' : '문의', cl ? `${dot(cl.from)} ${cl.reason || '휴관'}` : tel || '프런트 문의', cl ? '공지에서 자세히 안내해요' : '')}</div></div>`); };
  /* 시티 포스터: 시설 그리드(실제 시설 · 없으면 강좌) */
  SEC['cv-places'] = (x, s) => { const d = x.data || {}; const F = facs().slice(0, 5); const POOL = ['spo-07', 'spo-04', 'yog-03', 'mus-06', 'sem-01'];
    const items = F.length ? F.map((f, i) => ({ n: f.name, sub: [f.place, f.kind === 'time' ? (f.approval ? '승인 후 확정' : '바로 예약') : f.kind === 'pass' ? '이용권' : '대여', +f.capacity > 0 ? `최대 ${+f.capacity}명` : ''].filter(Boolean).join(' · '), h: '#fac', p: (f.photo && { src: abs(f.photo), alt: f.name, pos: '50% 50%' }) || stk(POOL[i % POOL.length]) }))
      : list(5).map((c, i) => ({ n: c.name, sub: [kindL(c), whenL(c)].join(' · '), h: cH(c), p: stk(POOL[i % POOL.length]) }));
    if (!items.length) return empty(x);
    return sec(x, s, 'places', `<div class="cvw"><div class="cv-ph2"><div><p class="cv-idx">${E(d.eyebrow || '시설과 프로그램')}</p><h2 class="cv-h2">${ttl(d)}</h2></div><a class="cv-more" href="${F.length ? '#fac' : '#courses'}">${F.length ? '시설 예약하기' : '프로그램 전체 보기'} ${ic('arrow', 22, 2)}</a></div>
<div class="cv-pg n${items.length}">${items.map((it, i) => `<a class="cv-pl${i ? '' : ' cv-lg'}" ${aA(it.h)}>${img(it.p)}<div class="cv-cap"><span class="cv-no">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(it.n)}</h3><p>${E(it.sub)}</p></div></div></a>`).join('')}</div></div>`); };
  /* 시티 포스터: 대관(그린 블록) */
  SEC['cv-rent'] = (x, s) => { const d = x.data || {}; const F = facs().filter(f => f.approval || /대관|강당|체육관|세미나/.test(f.name)); const cols = (d.cols || []).filter(c => c && c[0]).slice(0, 3); const p = slotP(s, 'about', null, 'lec-02');
    if (!facs().length) return empty(x);
    return sec(x, s, 'rent', `<div class="cvw cv-sg2">${img(p)}<div><p class="cv-idx">${E(d.eyebrow || '단체 대관')}</p><h2 class="cv-h2">${ttl(d)}</h2>${d.sub || F.length ? `<p class="cv-sd">${E(d.sub || '')}${F.length ? ` 대관할 수 있는 시설: ${E(F.slice(0, 3).map(f => f.name).join(' · '))}.` : ''}</p>` : ''}<ol class="cv-rs">${cols.map((c, i) => `<li><span class="cv-n">${String(i + 1).padStart(2, '0')}</span><div><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div></li>`).join('')}</ol><a class="cv-b sig" href="#fac">대관 가능한 시간 보기${ic('arrow', 20, 2)}</a></div></div>`); };
  /* 관공서: 자주 찾는 서비스(실제 경로) */
  SEC['cv-svc'] = (x, s) => { const d = x.data || {}; const L = live(); const lg = L.filter(c => c.legal).length;
    const S6 = [['법정 의무교육 이수', lg ? `${lg}과목 · 내 이수 현황` : '내 이수 현황 확인', '#my'], ['교육 신청 · 취소', '신청 내역과 승인 상태', '#courses'], ['이수증 발급', 'PDF로 바로 내려받기', '#badges'], ['교육 일정표', '월별 집합 · 사이버 교육', '#cal'], ['강의실 · 세미나실 대관', '부서 교육 · 워크숍', '#fac'], ['알림마당', '공지 · 교육 안내', '#notice']];
    const F = facs().length ? S6 : S6.filter(q => q[2] !== '#fac');
    return sec(x, s, 'svc', `<div class="cvw"><h2 class="cv-h2">${ttl(d, '자주 찾는 서비스')}</h2><div class="cv-sv">${F.map(q => `<a href="${q[2]}"><div><b>${E(q[0])}</b><span>${E(q[1])}</span></div>${ic('chev', 20, 2)}</a>`).join('')}</div></div>`); };
  /* 관공서: 날짜 열 교육 목록 */
  SEC['cv-rows'] = (x, s) => { const d = x.data || {}; const L = list(5); if (!L.length) return empty(x); const t = tday();
    const st = c => { const n = okD(c.end) ? days(t, c.end) : null; return n != null && n <= 14 ? ['n', '마감 임박'] : okD(c.start) && days(t, c.start) > 0 ? ['', '접수 중'] : ['', '수강 중']; };
    return sec(x, s, 'rows', `<div class="cvw">${head(d)}<div class="cv-ls">${L.map(c => { const k = st(c); const sd = okD(c.start) && days(t, c.start) > 0 ? c.start : c.end; return `<a class="cv-rw" ${aA(cH(c))}><div class="cv-dt"><b>${okD(sd) ? E(dot(sd)) : '상시'}</b><small>${E(okD(sd) ? (sd === c.start ? '시작' : '마감') : '온라인')}${okD(sd) ? ' · ' + DOW[new Date(sd + 'T00:00:00').getDay()] : ''}</small></div><div><h3>${E(c.name)}</h3><p>${E([c.legal ? '법정 의무교육' : kindL(c), c.teacher].filter(Boolean).join(' · '))}</p></div><div class="cv-mt">${E([c.kind === 'episode' ? '집합 교육' : '사이버 교육', hrs(c)].filter(Boolean).join(' · '))}<br>${E(okD(c.end) ? `${md(c.end)}까지` : '상시')}</div><span class="cv-tag ${k[0]}">${k[1]}</span></a>`; }).join('')}</div><a class="cv-more" href="#courses">전체 교육과정 보기 ${ic('chev', 18, 2)}</a></div>`); };
  /* 숫자 띠(관공서 · 전통 기업): 실제 값만 */
  SEC['cv-figs'] = (x, s) => { const d = x.data || {}; const L = live(); if (!L.length) return empty(x); const lg = rateOf(L.filter(c => c.legal)); const n = learners(); const th = thOf(s);
    const K = [[L.length, '개', '운영 중인 과정'], n ? [n, '명', '수강 중인 인원'] : null, lg ? [lg.r, '%', '법정 교육 이수율'] : (() => { const r = rateOf(L); return r ? [r.r, '%', '전체 과정 이수율'] : null; })()].filter(Boolean);
    return sec(x, s, 'figs', `<div class="cvw">${th === 'cvheritage' ? '' : `<p class="cv-ft">${E(d.eyebrow || '교육 운영 현황')}</p>`}<div class="cv-fg n${K.length}">${th === 'cvheritage' ? `<h2 class="cv-h2">${ttl(d, '숫자로 보는\n인재원')}</h2>` : ''}${K.map(k => `<div class="cv-k"><div class="cv-n">${k[0].toLocaleString('ko-KR')}<small>${k[1]}</small></div><p>${E(k[2])}</p></div>`).join('')}</div></div>`); };
  /* 관공서: 알림마당 + 문의 상자 */
  SEC['cv-help'] = (x, s) => { const d = x.data || {}; const N = notes(4); const tel = telOf();
    return sec(x, s, 'help', `<div class="cvw cv-hg2"><div><h2 class="cv-h2">${ttl(d, '알림마당')}</h2>${N.length ? `<ul class="cv-nt">${N.map(n => `<li><a href="#notice">${E(n.title)}</a><time>${E(String(n.at || '').slice(0, 10).replace(/-/g, '.'))}</time></li>`).join('')}</ul>` : `<p class="cv-none">새 공지가 올라오면 여기에 차례로 보여요. <a href="#notice">알림마당 가기</a></p>`}</div>
<div class="cv-call"><h3>${E(d.sub || '교육 신청이 어려우신가요?')}</h3>${tel ? `<a class="cv-tel" href="tel:${E(tel)}">${E(tel)}</a><p>평일 09:00 – 18:00</p>` : '<p>담당자에게 온라인으로 문의를 남겨 주세요.</p>'}<a class="cv-b sec" href="#comm">온라인 문의 남기기</a></div></div>`); };
  /* 전통 기업: 교육 철학 3가치 */
  SEC['cv-vals'] = (x, s) => { const d = x.data || {}; const C = (d.cols || []).filter(c => c && c[0]).slice(0, 3);
    return sec(x, s, 'vals', `<div class="cvw cv-c">${d.eyebrow ? `<p class="cv-ey">${E(d.eyebrow)}</p>` : ''}<h2 class="cv-h2">${(() => { const t = String(d.title || '').split('\n'); return t.length > 1 ? `${E(t[0])}<br><b>${E(t.slice(1).join(' '))}</b>` : E(t[0]); })()}</h2><div class="cv-vg">${C.map((c, i) => `<div><p class="cv-no">${String(i + 1).padStart(2, '0')}</p><h3>${E(c[0])}</h3>${c[1] ? `<p>${E(c[1])}</p>` : ''}</div>`).join('')}</div></div>`); };
  /* 전통 기업: 계층별 교육 체계(실제 과정 단계 · 개수) */
  SEC['cv-levels'] = (x, s) => { const d = x.data || {}; const L = live(); if (!L.length) return empty(x); const N = LV(); const RN = ['I', 'II', 'III', 'IV'];
    const cnt = i => L.filter(c => (+c.level || 0) === i).length; const nm = i => L.filter(c => (+c.level || 0) === i).slice(0, 3).map(c => c.name.replace(/\s*\(.*\)$/, '')).join(' · ');
    return sec(x, s, 'levels', `<div class="cvw"><div class="cv-lt"><div>${d.eyebrow ? `<p class="cv-ey">${E(d.eyebrow)}</p>` : ''}<h2 class="cv-h2">${(() => { const t = String(d.title || '').split('\n'); return t.length > 1 ? `${E(t[0])}<br><b>${E(t.slice(1).join(' '))}</b>` : E(t[0]); })()}</h2></div>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div>
<div class="cv-lv n${N.length}">${N.map((n, i) => `<a href="#courses"><div class="cv-r">${RN[i] || i + 1}</div><h3>${E(n)}</h3><p>${E(nm(i) || '과정을 준비하고 있어요.')}</p><span>과정 ${cnt(i)}개 ${ic('arrow', 20, 1.6)}</span></a>`).join('')}</div></div>`); };
  /* 전통 기업: 대표 프로그램 2개 */
  SEC['cv-prog'] = (x, s) => { const d = x.data || {}; const L = list(2); if (!L.length) return empty(x);
    return sec(x, s, 'prog', `<div class="cvw"><div class="cv-head"><div>${d.eyebrow ? `<p class="cv-ey">${E(d.eyebrow)}</p>` : ''}<h2 class="cv-h2">${NL(d.title || '')}</h2></div><a class="cv-more" href="#courses">전체 프로그램 보기 ${ic('arrow', 20, 1.6)}</a></div><div class="cv-pg2 n${L.length}">${L.map((c, i) => `<a class="cv-pc${i ? ' s' : ''}" ${aA(cH(c))}>${img(clsP(c, i, ['hum-11', 'hum-04']))}<p class="cv-m"><span>${E(c.legal ? '필수' : (LV()[+c.level || 0] || '과정'))}</span><span>${E([hrs(c), c.kind === 'episode' ? '집합' : '온라인'].filter(Boolean).join(' · '))}</span></p><h3>${E(c.name)}</h3><p>${E(whenL(c))}${c.teacher ? ` · ${E(c.teacher)}` : ''}</p></a>`).join('')}</div></div>`); };

  /* ── CSS ── */
  function css(s) { const th = thOf(s); const T = HPT.tokens(s) || {}; const a = T.a || DEF[th].acc; const D = DEF[th];
    const onA = HPT.onColor ? HPT.onColor(a) : '#fff'; const at = fit(a, D.bg, 4.6); const R = HPT.ramp ? HPT.ramp(a) : {};
    const nm = String(org()).replace(/["\\\n]/g, '');
    const SERIF = "'Noto Serif KR','Noto Serif KR Fallback','Noto Serif CJK KR','Nanum Myeongjo','AppleMyungjo',serif";
    let x = `/* hpv-corp */
.cv{--a:${a};--on:${onA};--at:${at};--bg:${D.bg};--alt:${D.alt};--ink:${D.ink};--mu:${fit(D.mu, D.alt, 4.6)};font-family:Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;color:var(--ink);background:var(--bg);font-size:17px;line-height:1.65;letter-spacing:-.01em;word-break:keep-all;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;padding:150px 0;position:relative}
.cv *{box-sizing:border-box}.cv :is(h1,h2,h3,p,ol,ul,figure,blockquote){margin:0;padding:0}.cv ol,.cv ul{list-style:none}.cv a{color:inherit;text-decoration:none}.cv svg{flex:none}
.cv .cvw{max-width:1200px;margin:0 auto;padding:0 40px;position:relative}
.cv figure{overflow:hidden;background:${mix(D.bg, '#000000', .06)}}.cv figure img{width:100%;height:100%;object-fit:cover;display:block}
.cv .cv-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 28px;font-weight:700;font-size:17px;white-space:nowrap;letter-spacing:-.01em}
.cv .cv-b.pri{background:var(--a);color:var(--on)}
.cv .cv-cta{display:flex;gap:12px;flex-wrap:wrap}
.cv .cv-ey{font-size:15px;font-weight:700;color:var(--at);margin-bottom:18px}
.cv .cv-h2{font-size:52px;line-height:1.16;font-weight:800;letter-spacing:-.04em}
.cv .cv-sd{font-size:18px;color:var(--mu);margin-top:20px;max-width:560px}
.cv .cv-more{display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--at);white-space:nowrap}
.cv .cv-sg2{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}
.cv .cv-steps{margin-top:48px}.cv .cv-steps li{display:grid;grid-template-columns:56px 1fr;padding:24px 0;border-top:1px solid ${al(D.ink, .14)}}.cv .cv-steps li:last-child{border-bottom:1px solid ${al(D.ink, .14)}}
.cv .cv-steps .cv-n{font-size:15px;font-weight:700;color:var(--at);font-variant-numeric:tabular-nums;padding-top:3px}.cv .cv-steps h3{font-size:20px;font-weight:700;letter-spacing:-.025em}.cv .cv-steps p{font-size:16px;color:var(--mu);margin-top:4px}
.cv .cv-who{margin-top:40px;display:inline-flex;align-items:center;gap:14px;font-size:16px;color:var(--mu)}.cv .cv-who i{width:44px;height:44px;border-radius:50%;background:${D.ink};color:#fff;font-style:normal;display:grid;place-items:center;font-weight:700}.cv .cv-who b{color:var(--ink)}
.cv-emp{padding:32px 0!important}.cv-emp p{font-size:14px;color:#6B7280}
@media (max-width:720px){.cv{padding:88px 0;font-size:16px}.cv .cvw{padding:0 20px}.cv .cv-h2{font-size:32px;line-height:1.22}.cv .cv-sd{font-size:16px}.cv .cv-cta{flex-direction:column}.cv .cv-cta .cv-b{width:100%}.cv a{min-height:44px}.cv .cv-more{min-height:44px}.cv p a{display:inline-flex;align-items:center}.cv .cv-sg2{grid-template-columns:1fr;gap:40px}}
`;
    if (th === 'cvkeynote') x += `
.gh.hps-h{background:rgba(255,255,255,.86)!important;backdrop-filter:saturate(180%) blur(16px);border-bottom:1px solid rgba(0,0,0,.06)!important;box-shadow:none!important}.gh .hps-cta{background:${D.ink}!important;color:#fff!important;border-radius:999px!important}.gf.hps-f{background:#fff!important;color:#6B7280!important;border-top:1px solid #E6E7EB}.gf.hps-f :is(p,a,span,em,li,strong,b){color:#4B5263!important}.gf.hps-f .hps-fn{color:${D.ink}!important;font-weight:800}
.cvkeynote .cv-b{border-radius:999px}.cvkeynote .cv-b.gh{color:var(--at);padding:0 8px}
.cvkeynote.cv-hero{padding:120px 0 0;text-align:center;background:#fff}
.cvkeynote.cv-hero .cv-ey{font-size:17px;margin-bottom:22px}
.cvkeynote.cv-hero h1{font-size:88px;line-height:1.06;font-weight:800;letter-spacing:-.045em}.cvkeynote.cv-hero h1 span{color:#9AA0AC}
.cvkeynote .cv-lead{max-width:640px;margin:30px auto 0;font-size:21px;color:#3B4252;font-weight:500}
.cvkeynote.cv-hero .cv-cta{justify-content:center;margin-top:40px}
.cvkeynote .cv-note{margin-top:22px;font-size:15px;color:#6B7280}
.cvkeynote .cv-big{max-width:1360px;margin:88px auto 0;padding:0 40px;position:relative;z-index:2}
.cvkeynote .cv-big figure{border-radius:32px;aspect-ratio:2.25/1}
.cvkeynote.cv-stat{background:${D.ink};color:#fff;padding:150px 0}
.cvkeynote.cv-hero+.cvkeynote.cv-stat{margin-top:-260px;padding-top:410px;z-index:1}.cvkeynote.cv-hero{padding-bottom:0}.cvkeynote.cv-hero+.cv:not(.cv-stat){padding-top:150px}
.cvkeynote .cv-sg{display:grid;grid-template-columns:1.25fr 1fr;gap:80px;align-items:end}
.cvkeynote .cv-num{font-size:240px;line-height:.85;font-weight:800;letter-spacing:-.06em;font-variant-numeric:tabular-nums}.cvkeynote .cv-num small{font-size:96px;letter-spacing:-.04em;color:${fit(a, D.ink, 4.6, '#ffffff')}}
.cvkeynote .cv-t{font-size:28px;line-height:1.45;font-weight:700;letter-spacing:-.03em}.cvkeynote .cv-d{margin-top:20px;font-size:17px;color:#A4ABBA}
.cvkeynote .cv-line{margin-top:80px;padding-top:28px;border-top:1px solid rgba(255,255,255,.14);display:flex;justify-content:space-between;gap:20px;font-size:15px;color:#A4ABBA}.cvkeynote .cv-line a{color:#fff;font-weight:600;display:inline-flex;gap:6px;align-items:center}
.cvkeynote .cv-head{display:flex;justify-content:space-between;align-items:end;gap:40px;margin-bottom:64px}
.cvkeynote.cv-cards .cv-h2{white-space:pre-line}
.cvkeynote .cv-cg{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.cvkeynote .cv-card{border-radius:28px;overflow:hidden;background:#F5F5F7;display:flex;flex-direction:column;transition:transform .3s}.cvkeynote .cv-card:hover{transform:translateY(-4px)}
.cvkeynote .cv-card figure{aspect-ratio:4/3.3;border-radius:0}.cvkeynote .cv-bd{padding:30px 32px 34px;display:flex;flex-direction:column;flex:1}
.cvkeynote .cv-tg{font-size:14px;font-weight:700;color:var(--at)}.cvkeynote .cv-card h3{font-size:26px;line-height:1.3;font-weight:800;letter-spacing:-.035em;margin-top:8px}.cvkeynote .cv-card p{font-size:16px;color:#4B5263;margin-top:12px}
.cvkeynote .cv-m{margin-top:auto;padding-top:24px;font-size:14px;color:#6B7280;display:flex;justify-content:space-between;gap:12px}.cvkeynote .cv-m b{color:${D.ink}}
.cvkeynote.cv-story{background:#F5F5F7}
.cvkeynote .cv-sg2>figure{border-radius:28px;aspect-ratio:4/4.6}
.cvkeynote.cv-quote{text-align:center;background:#fff}.cvkeynote blockquote{font-size:44px;line-height:1.38;font-weight:700;letter-spacing:-.035em;max-width:980px;margin:0 auto}
.cvkeynote.cv-duo{padding-top:0;background:#fff}.cvkeynote.cv-quote+.cvkeynote.cv-duo{padding-top:0}.cvkeynote.cv-cards+.cvkeynote.cv-duo,.cvkeynote.cv-story+.cvkeynote.cv-duo{padding-top:150px}
.cvkeynote .cv-dg{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.cvkeynote .cv-pn{border-radius:32px;padding:56px;min-height:380px;display:flex;flex-direction:column;justify-content:space-between;background:#F5F5F7}.cvkeynote .cv-pn.p0{background:var(--a);color:var(--on)}
.cvkeynote .cv-k{font-size:15px;font-weight:700;opacity:.85}.cvkeynote .cv-pn.p1 .cv-k{color:var(--at);opacity:1}.cvkeynote .cv-pn h3{font-size:40px;line-height:1.2;font-weight:800;letter-spacing:-.04em;margin-top:14px}.cvkeynote .cv-pn p{font-size:17px;margin-top:16px;opacity:.88;max-width:420px}
.cvkeynote .cv-pb{margin-top:40px;align-self:flex-start;display:inline-flex;align-items:center;height:52px;padding:0 24px;border-radius:999px;font-weight:700;background:${D.ink};color:#fff}.cvkeynote .cv-pn.p0 .cv-pb{background:#fff;color:${fit(a, '#ffffff', 4.6)}}
@media (max-width:720px){.cvkeynote.cv-hero{padding:64px 0 0;text-align:left}.cvkeynote.cv-hero .cv-ey{font-size:15px}.cvkeynote.cv-hero h1{font-size:42px;line-height:1.14}.cvkeynote .cv-lead{font-size:17px;margin:20px 0 0}.cvkeynote.cv-hero .cv-cta{margin-top:32px;gap:10px}.cvkeynote .cv-note{font-size:14px}
.cvkeynote .cv-big{margin:48px auto 0;padding:0 20px}.cvkeynote .cv-big figure{aspect-ratio:4/5;border-radius:24px}.cvkeynote.cv-stat{padding:88px 0}.cvkeynote.cv-hero+.cvkeynote.cv-stat{margin-top:-180px;padding-top:268px}.cvkeynote.cv-hero+.cv:not(.cv-stat){padding-top:88px}.cvkeynote .cv-sg{grid-template-columns:1fr;gap:28px}.cvkeynote .cv-num{font-size:128px}.cvkeynote .cv-num small{font-size:56px}.cvkeynote .cv-t{font-size:22px}.cvkeynote .cv-line{flex-direction:column;margin-top:44px}
.cvkeynote .cv-head{flex-direction:column;align-items:flex-start;margin-bottom:32px;gap:12px}.cvkeynote .cv-cg{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin:0 -20px;padding:0 20px 4px}.cvkeynote .cv-card{flex:0 0 84%;scroll-snap-align:start}.cvkeynote .cv-bd{padding:24px}.cvkeynote .cv-card h3{font-size:22px}
.cvkeynote .cv-sg2>figure{aspect-ratio:4/3}.cvkeynote blockquote{font-size:27px;text-align:left}.cvkeynote.cv-quote{text-align:left}
.cvkeynote.cv-cards+.cvkeynote.cv-duo,.cvkeynote.cv-story+.cvkeynote.cv-duo{padding-top:88px}.cvkeynote .cv-dg{grid-template-columns:1fr;gap:14px}.cvkeynote .cv-pn{padding:32px 26px;min-height:0}.cvkeynote .cv-pn h3{font-size:28px}.cvkeynote .cv-pb{width:100%;justify-content:center;margin-top:28px}}
`;
    if (th === 'cvjournal') { const coral = '#E2603B'; const cT = fit(coral, D.bg, 4.6);
      x += `
.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid #D9CFBD!important;box-shadow:none!important}.gh .hps-wmk b,.gh .logo b{font-family:${SERIF};color:${at}!important;font-size:22px;letter-spacing:-.03em}.gh .hps-cta{background:var(--a,${a})!important;color:${onA}!important;border-radius:4px!important}.gh{--cvx:1}
.gf.hps-f{background:${D.ink}!important}
.cvjournal .cv-h2,.cvjournal h1,.cvjournal h3,.cvjournal blockquote,.cvjournal .cv-d,.cvjournal .cv-n,.cvjournal .cv-mk{font-family:${SERIF}}
.cvjournal .cv-b{border-radius:4px}.cvjournal .cv-b.line{box-shadow:inset 0 0 0 1.5px ${D.ink};color:${D.ink}}
.cvjournal.cv-hero{padding:96px 0 120px}.cvjournal .cv-g{display:grid;grid-template-columns:1.3fr .9fr;gap:56px;align-items:center}
.cvjournal .cv-issue{display:flex;gap:14px;align-items:center;font-size:14px;font-weight:700;color:${cT};margin-bottom:34px}.cvjournal .cv-issue:before{content:"";width:36px;height:1.5px;background:${cT}}
.cvjournal.cv-hero h1{font-size:70px;line-height:1.14;font-weight:700;letter-spacing:-.055em}.cvjournal.cv-hero h1 em{font-style:normal;color:var(--at)}
.cvjournal .cv-lead{margin-top:34px;font-size:20px;line-height:1.7;color:var(--mu);max-width:500px}.cvjournal.cv-hero .cv-cta{margin-top:44px}
.cvjournal .cv-col{position:relative;height:640px}.cvjournal .cv-c1{position:absolute;right:0;top:0;width:78%;height:78%}.cvjournal .cv-c2{position:absolute;left:0;bottom:0;width:46%;height:46%;border:10px solid ${D.bg}}
.cvjournal .cv-cap{position:absolute;right:0;bottom:24px;width:46%;font-size:14px;color:var(--mu)}
.cvjournal.cv-rail{background:var(--a);color:var(--on);padding:0}.cvjournal.cv-rail .cvw{display:grid;grid-template-columns:auto 1fr auto;gap:40px;align-items:center;min-height:96px}
.cvjournal .cv-d{font-size:30px;font-weight:700;letter-spacing:-.03em}.cvjournal.cv-rail p{font-size:16px;opacity:.86}.cvjournal.cv-rail p a{font-weight:700;text-decoration:underline;text-underline-offset:3px}.cvjournal .cv-go{font-weight:700;display:inline-flex;gap:6px;align-items:center}
.cvjournal .cv-ey{color:${cT};font-size:14px}
.cvjournal .cv-h2{font-size:54px;line-height:1.22;font-weight:700;letter-spacing:-.05em}
.cvjournal .cv-sh{display:flex;justify-content:space-between;align-items:end;border-bottom:1.5px solid ${D.ink};padding-bottom:36px;margin-bottom:56px;gap:24px}.cvjournal .cv-more{color:${D.ink}}
.cvjournal .cv-ml{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px;align-items:start}.cvjournal .cv-art figure{aspect-ratio:4/3}
.cvjournal .cv-cat{margin-top:24px;font-size:14px;font-weight:700;color:var(--at);display:flex;gap:10px}.cvjournal .cv-cat span{color:var(--mu);font-weight:600}
.cvjournal .cv-art h3{font-size:27px;line-height:1.35;font-weight:700;letter-spacing:-.04em;margin-top:10px}.cvjournal .cv-art.cv-lg h3{font-size:36px}.cvjournal .cv-ad{font-size:16px;color:var(--mu);margin-top:12px}
.cvjournal .cv-meta{margin-top:20px;padding-top:16px;border-top:1px solid #D9CFBD;font-size:15px;color:var(--mu);display:flex;justify-content:space-between;gap:12px}.cvjournal .cv-meta b{color:${cT}}
.cvjournal.cv-band{height:640px;padding:0;overflow:hidden;background:#123}.cvjournal .cv-bg{position:absolute;inset:0;height:100%}.cvjournal.cv-band:after{content:"";position:absolute;inset:0;background:linear-gradient(270deg,rgba(11,40,46,.9) 0%,rgba(11,40,46,.72) 38%,rgba(11,40,46,0) 70%)}
.cvjournal.cv-band .cv-in{position:absolute;inset:0;z-index:2;display:flex;align-items:center}.cvjournal.cv-band .cvw{width:100%;display:flex;justify-content:flex-end}.cvjournal .cv-bt{width:480px;color:#fff}.cvjournal .cv-bt h2{font-family:${SERIF};font-size:56px;line-height:1.2;font-weight:700;letter-spacing:-.05em}.cvjournal .cv-bt p{margin-top:22px;font-size:18px;color:#E8EEEA}
.cvjournal.cv-story{background:${D.alt}}.cvjournal .cv-sg2{align-items:start}.cvjournal .cv-sg2>figure{aspect-ratio:4/5}.cvjournal .cv-steps li{grid-template-columns:96px 1fr;padding:30px 0;border-color:#D9CFBD!important}.cvjournal .cv-steps .cv-n{font-size:48px;line-height:1;color:var(--at);font-weight:600;padding:0}.cvjournal .cv-steps h3{font-family:inherit;font-size:21px}
.cvjournal.cv-quote{text-align:center}.cvjournal .cv-mk{font-size:120px;line-height:.6;color:${coral};height:56px}.cvjournal blockquote{font-size:44px;line-height:1.5;font-weight:600;letter-spacing:-.045em;max-width:960px;margin:0 auto}
.cvjournal.cv-fin{background:${coral};color:#fff;padding:130px 0}.cvjournal .cv-fg{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:end}.cvjournal.cv-fin h2{font-family:${SERIF};font-size:60px;line-height:1.2;font-weight:700;letter-spacing:-.05em}.cvjournal.cv-fin p{font-size:19px;color:#FFE9E1;margin-top:20px}
.cvjournal .cv-acts{display:flex;flex-direction:column;gap:12px}.cvjournal .cv-acts .cv-b{height:64px;justify-content:space-between;font-size:18px}.cvjournal .cv-b.wh{background:#fff;color:${D.ink}}.cvjournal .cv-b.ol{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.75);color:#fff}
@media (max-width:720px){.cvjournal.cv-hero{padding:48px 0 72px}.cvjournal .cv-g{grid-template-columns:1fr;gap:48px}.cvjournal .cv-issue{margin-bottom:22px;font-size:13px}.cvjournal.cv-hero h1{font-size:42px;line-height:1.24}.cvjournal .cv-lead{font-size:17px;margin-top:22px}.cvjournal.cv-hero .cv-cta{margin-top:32px}
.cvjournal .cv-col{height:420px}.cvjournal .cv-c1{width:84%;height:74%}.cvjournal .cv-c2{width:52%;height:44%;border-width:6px}.cvjournal .cv-cap{width:44%;bottom:6px;font-size:13px}
.cvjournal.cv-rail .cvw{grid-template-columns:1fr;gap:8px;padding:28px 20px}.cvjournal .cv-d{font-size:24px}.cvjournal .cv-h2{font-size:34px}.cvjournal .cv-sh{flex-direction:column;align-items:flex-start;gap:12px;padding-bottom:24px;margin-bottom:36px}
.cvjournal .cv-ml{grid-template-columns:1fr;gap:32px}.cvjournal .cv-art.cv-lg h3{font-size:26px}.cvjournal .cv-art:not(.cv-lg){display:grid;grid-template-columns:120px 1fr;column-gap:18px}.cvjournal .cv-art:not(.cv-lg) figure{aspect-ratio:1}.cvjournal .cv-art:not(.cv-lg) .cv-cat{margin-top:0}.cvjournal .cv-art:not(.cv-lg) h3{font-size:20px;margin-top:6px}.cvjournal .cv-art:not(.cv-lg) .cv-meta{flex-direction:column;gap:2px;font-size:14px;margin-top:12px;padding-top:10px}
.cvjournal.cv-band{height:520px}.cvjournal.cv-band:after{background:linear-gradient(0deg,rgba(11,40,46,.85),rgba(11,40,46,.1) 75%)}.cvjournal.cv-band .cv-in{align-items:flex-end;padding-bottom:48px}.cvjournal .cv-bt{width:auto}.cvjournal .cv-bt h2{font-size:36px}.cvjournal .cv-bt p{font-size:16px}
.cvjournal .cv-sg2>figure{aspect-ratio:4/3}.cvjournal .cv-steps li{grid-template-columns:64px 1fr}.cvjournal .cv-steps .cv-n{font-size:36px}.cvjournal blockquote{font-size:28px}.cvjournal .cv-mk{font-size:88px;height:40px}
.cvjournal.cv-fin{padding:88px 0}.cvjournal .cv-fg{grid-template-columns:1fr;gap:36px}.cvjournal.cv-fin h2{font-size:36px}.cvjournal.cv-fin p{font-size:16px}}
`; }
    if (th === 'cvposter') { const sig = '#FFD43B';
      x += `
.gh.hps-h{background:${D.ink}!important;border:0!important;box-shadow:none!important}.gh.hps-h :is(a,b,span,label,svg){color:#fff!important}.gh .hps-cta{background:${sig}!important;color:${D.ink}!important;border-radius:0!important}.gh .hps-cta *{color:${D.ink}!important}
.gf.hps-f{background:${D.ink}!important}
.cvposter{letter-spacing:-.015em}.cvposter .cv-b{border-radius:0;height:64px;font-weight:800;font-size:18px;gap:12px}.cvposter .cv-b.sig{background:${sig};color:${D.ink}}.cvposter .cv-b.wh{color:#fff;box-shadow:inset 0 0 0 2px #fff}
.cvposter.cv-hero{height:860px;padding:0;color:#fff;overflow:hidden;background:#123}.cvposter .cv-bg{position:absolute;inset:0;height:100%}.cvposter .cv-bg img{object-position:50% 60%}
.cvposter.cv-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,0) 20%,rgba(0,0,0,.1) 40%,rgba(4,12,20,.78) 78%,rgba(4,12,20,.86) 100%)}
.cvposter .cv-in{position:absolute;left:0;right:0;bottom:88px;z-index:2}.cvposter .cv-tag{display:inline-block;background:${sig};color:${D.ink};font-weight:800;font-size:15px;padding:7px 12px;margin-bottom:28px}
.cvposter.cv-hero h1{font-size:88px;line-height:1.05;font-weight:900;letter-spacing:-.055em}.cvposter .cv-row{display:flex;justify-content:space-between;align-items:end;gap:40px;margin-top:40px}.cvposter .cv-lead{font-size:20px;max-width:460px;color:#F1F1F1;font-weight:500}
.cvposter.cv-quick{background:${D.ink};color:#fff;padding:0}.cvposter .cv-qg{display:grid;grid-template-columns:repeat(4,1fr)}.cvposter .cv-qg a{display:flex;justify-content:space-between;align-items:center;padding:30px 28px;border-left:1px solid #2E2E2E;font-size:20px;font-weight:700}.cvposter .cv-qg a:first-child{border-left:0;padding-left:0}.cvposter .cv-qg span{display:block;font-size:14px;color:#A8A79F;font-weight:500;margin-top:2px}
.cvposter .cv-idx{font-size:14px;font-weight:800;letter-spacing:.04em;display:flex;gap:14px;align-items:center;margin-bottom:28px}.cvposter .cv-idx:before{content:"";width:14px;height:14px;background:var(--a)}
.cvposter .cv-h2{font-size:64px;line-height:1.1;font-weight:900;letter-spacing:-.05em}
.cvposter .cv-hg{display:grid;grid-template-columns:repeat(12,1fr);gap:24px;align-items:end}.cvposter .cv-num{grid-column:1/9;white-space:nowrap;font-size:196px;line-height:.82;font-weight:900;letter-spacing:-.07em;font-variant-numeric:tabular-nums}.cvposter .cv-num em{font-style:normal;color:var(--at);margin:0 .06em}
.cvposter .cv-tx{grid-column:9/13}.cvposter .cv-tx h3{font-size:28px;line-height:1.35;font-weight:800;letter-spacing:-.035em}.cvposter .cv-tx p:not(.cv-idx){margin-top:16px;color:var(--mu);font-size:16px}
.cvposter .cv-tb{grid-column:1/13;margin-top:72px;display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid ${D.ink}}.cvposter .cv-tb div{padding:24px 24px 0 0}.cvposter .cv-tb b{display:block;font-size:15px;font-weight:800}.cvposter .cv-tb span{display:block;font-size:24px;font-weight:700;letter-spacing:-.03em;margin-top:6px;font-variant-numeric:tabular-nums}.cvposter .cv-tb small{display:block;font-size:14px;color:var(--mu);margin-top:2px}
.cvposter.cv-places{background:#fff}.cvposter .cv-ph2{display:flex;justify-content:space-between;align-items:end;margin-bottom:56px;gap:40px}.cvposter .cv-more{color:${D.ink};font-weight:800;border-bottom:2px solid ${D.ink};padding-bottom:4px;gap:10px}
.cvposter .cv-pg{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:24px}.cvposter .cv-pg.n1,.cvposter .cv-pg.n2{grid-template-columns:1fr 1fr}.cvposter .cv-pl figure{aspect-ratio:4/3}.cvposter .cv-pg.n5 .cv-pl.cv-lg,.cvposter .cv-pg.n4 .cv-pl.cv-lg{grid-row:span 2;display:flex;flex-direction:column}.cvposter .cv-pg.n5 .cv-pl.cv-lg figure,.cvposter .cv-pg.n4 .cv-pl.cv-lg figure{aspect-ratio:auto;flex:1}
.cvposter .cv-cap{display:flex;flex-direction:row-reverse;justify-content:space-between;gap:12px;padding-top:18px;border-top:2px solid ${D.ink};margin-top:16px;min-height:102px}.cvposter .cv-cap h3{font-size:24px;font-weight:800;letter-spacing:-.035em;line-height:1.3}.cvposter .cv-cap p{font-size:15px;color:var(--mu);margin-top:4px}.cvposter .cv-no{font-size:14px;font-weight:800;color:var(--at);font-variant-numeric:tabular-nums}
.cvposter.cv-rent{background:var(--a);color:var(--on)}.cvposter.cv-rent .cv-idx:before{background:${sig}}.cvposter.cv-rent figure{aspect-ratio:1/1.05}.cvposter.cv-rent .cv-sd{color:inherit;opacity:.84}
.cvposter .cv-rs{margin-top:44px;border-top:2px solid currentColor}.cvposter .cv-rs li{display:grid;grid-template-columns:64px 1fr;gap:12px;padding:22px 0;border-bottom:1px solid ${al(onA, .3)}}.cvposter .cv-rs .cv-n{font-weight:900;font-size:18px;color:${onA === '#FFFFFF' ? sig : D.ink}}.cvposter .cv-rs h3{font-size:20px;font-weight:800}.cvposter .cv-rs p{font-size:15px;opacity:.84;margin-top:2px}.cvposter.cv-rent .cv-b{margin-top:40px}
.cvposter.cv-quote{background:${sig};color:${D.ink}}.cvposter blockquote{font-size:56px;line-height:1.25;font-weight:900;letter-spacing:-.05em;max-width:1080px}.cvposter .cv-who{color:#4A4316}.cvposter .cv-who i{color:${sig}}
.cvposter .cv-dg{display:grid;grid-template-columns:1fr 1fr}.cvposter .cv-pn{display:block;padding:56px 48px 0 0;border-top:2px solid ${D.ink}}.cvposter .cv-pn.p1{padding:56px 0 0 48px;border-left:2px solid ${D.ink}}.cvposter .cv-k{font-size:15px;font-weight:800;color:var(--at)}
.cvposter .cv-pn h3{font-size:48px;line-height:1.15;font-weight:900;letter-spacing:-.05em;margin-top:14px;display:flex;justify-content:space-between;align-items:end;gap:20px}.cvposter .cv-pn p{margin-top:16px;color:var(--mu);font-size:17px;max-width:460px}
@media (max-width:720px){.cvposter.cv-hero{height:740px}.cvposter .cv-bg img{object-position:58% 50%}.cvposter .cv-in{bottom:28px}.cvposter .cv-tag{font-size:13px;margin-bottom:18px}.cvposter.cv-hero h1{font-size:44px;line-height:1.12}.cvposter .cv-row{flex-direction:column;align-items:stretch;margin-top:18px;gap:24px}.cvposter .cv-lead{font-size:16px}.cvposter .cv-cta{gap:8px}.cvposter .cv-b{height:56px;font-size:17px;justify-content:space-between}
.cvposter.cv-quick .cv-qg{grid-template-columns:1fr 1fr;padding:0}.cvposter .cv-qg a{padding:20px;border-left:0;border-top:1px solid #2E2E2E;font-size:17px}.cvposter .cv-qg a:first-child{padding-left:20px}.cvposter .cv-qg a:nth-child(odd){border-right:1px solid #2E2E2E}.cvposter .cv-qg a:nth-child(-n+2){border-top:0}.cvposter .cv-qg svg{display:none}
.cvposter .cv-h2{font-size:36px}.cvposter .cv-hg{display:block}.cvposter .cv-num{font-size:104px}.cvposter .cv-tx{margin-top:28px}.cvposter .cv-tx h3{font-size:22px}.cvposter .cv-tb{margin-top:40px;grid-template-columns:1fr 1fr;row-gap:8px}.cvposter .cv-tb span{font-size:19px}
.cvposter .cv-ph2{flex-direction:column;align-items:flex-start;gap:20px;margin-bottom:36px}.cvposter .cv-pg,.cvposter .cv-pg.n1,.cvposter .cv-pg.n2{grid-template-columns:1fr 1fr;gap:28px 14px}.cvposter .cv-pl.cv-lg{grid-column:1/3}.cvposter .cv-pg .cv-pl.cv-lg{grid-row:auto!important}.cvposter .cv-pg .cv-pl.cv-lg figure{aspect-ratio:4/3!important}.cvposter .cv-cap{flex-direction:column-reverse;min-height:0;margin-top:12px;padding-top:12px;gap:4px}.cvposter .cv-cap h3{font-size:18px}.cvposter .cv-cap p{font-size:14px}
.cvposter.cv-rent figure{aspect-ratio:4/3}.cvposter .cv-rs li{grid-template-columns:40px 1fr}.cvposter.cv-rent .cv-b{width:100%}.cvposter blockquote{font-size:30px}
.cvposter .cv-dg{grid-template-columns:1fr}.cvposter .cv-pn,.cvposter .cv-pn.p1{padding:36px 0;border-left:0}.cvposter .cv-pn.p1{border-top:2px solid ${D.ink}}.cvposter .cv-pn h3{font-size:32px}.cvposter .cv-pn h3 svg{width:36px;height:36px}}
`; }
    if (th === 'cvcivic') { const gold = '#F2B33D';
      x += `
.gh.hps-h{background:#fff!important;border-bottom:1px solid #D5DAE1!important;box-shadow:none!important;flex-wrap:wrap}.gh.hps-h:before{content:"이 누리집은 ${nm} 공식 누리집입니다.";display:block;width:100%;background:#F3F5F8;color:#3F4756;font-size:14px;line-height:40px;padding:0 max(20px,calc((100% - 1200px)/2 + 40px));box-sizing:border-box;text-align:left}
.gh .hps-cta{background:${a}!important;color:${onA}!important;border-radius:6px!important}.gh .gn a{font-weight:700}.gf.hps-f{background:#1B2230!important}
.cvcivic .cv-b{border-radius:6px;height:58px;font-size:18px}.cvcivic .cv-b.pri{box-shadow:0 2px 0 ${mix(a, '#000000', .35)}}.cvcivic .cv-b.sec{background:#fff;color:var(--at);box-shadow:inset 0 0 0 2px ${at}}
.cvcivic.cv-hero{padding:96px 0 120px}.cvcivic .cv-g{display:grid;grid-template-columns:1.1fr .9fr;gap:80px;align-items:center}
.cvcivic .cv-crumb{font-size:15px;font-weight:700;color:var(--at);margin-bottom:24px;display:flex;gap:10px;align-items:center}.cvcivic .cv-crumb:before{content:"";width:6px;height:28px;background:${gold};flex:none}
.cvcivic.cv-hero h1{font-size:72px;line-height:1.14;font-weight:800;letter-spacing:-.045em}.cvcivic .cv-lead{margin-top:28px;font-size:21px;color:var(--mu);max-width:540px}.cvcivic.cv-hero .cv-cta{margin-top:44px}
.cvcivic .cv-note{margin-top:22px;font-size:15px;color:#646C7A}.cvcivic .cv-note a{color:var(--at);font-weight:700;text-decoration:underline;text-underline-offset:3px}
.cvcivic .cv-phw{position:relative;padding:0 0 32px 32px}.cvcivic .cv-phw:before{content:"";position:absolute;left:0;bottom:0;width:62%;height:72%;background:var(--a)}.cvcivic .cv-phw figure{position:relative;aspect-ratio:4/4.7}
.cvcivic.cv-svc{background:#F3F5F8;padding:110px 0}.cvcivic .cv-h2{font-size:44px;line-height:1.2}.cvcivic .cv-sv{margin-top:44px;display:grid;grid-template-columns:repeat(3,1fr);column-gap:48px}
.cvcivic .cv-sv a{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:26px 0;border-top:1px solid #C6CDD7}.cvcivic .cv-sv b{font-size:21px;font-weight:700;letter-spacing:-.03em;color:var(--at);text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:5px;display:block}.cvcivic .cv-sv span{display:block;font-size:15px;color:var(--mu);margin-top:6px}.cvcivic .cv-sv svg{color:var(--at)}
.cvcivic .cv-ls{margin-top:48px;border-top:2px solid ${D.ink}}.cvcivic .cv-rw{display:grid;grid-template-columns:150px 1fr 200px 120px;gap:32px;align-items:center;padding:32px 0;border-bottom:1px solid #D5DAE1}
.cvcivic .cv-dt b{display:block;font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums}.cvcivic .cv-dt small{font-size:14px;color:#646C7A}
.cvcivic .cv-rw h3{font-size:23px;font-weight:700;letter-spacing:-.03em;line-height:1.35}.cvcivic .cv-rw p{font-size:15px;color:var(--mu);margin-top:6px}.cvcivic .cv-mt{font-size:15px;color:var(--mu)}
.cvcivic .cv-tag{justify-self:end;font-size:14px;font-weight:800;padding:6px 12px;border-radius:4px;background:#FFF1C9;color:#6E4C00;white-space:nowrap}.cvcivic .cv-tag.n{background:${mix(a, '#ffffff', .9)};color:var(--at)}
.cvcivic.cv-rows .cv-more{margin-top:36px;text-decoration:underline;text-underline-offset:4px}
.cvcivic.cv-figs{background:var(--a);color:var(--on);padding:120px 0}.cvcivic .cv-ft{font-size:15px;font-weight:700;color:${onA === '#FFFFFF' ? gold : D.ink};margin-bottom:56px}.cvcivic .cv-fg{display:grid;grid-template-columns:repeat(3,1fr)}.cvcivic .cv-fg.n2{grid-template-columns:repeat(2,1fr)}.cvcivic .cv-fg.n1{grid-template-columns:1fr}
.cvcivic .cv-k{padding:0 40px;border-left:1px solid ${al(onA, .22)}}.cvcivic .cv-k:first-child{padding-left:0;border-left:0}.cvcivic .cv-k .cv-n{font-size:84px;font-weight:800;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}.cvcivic .cv-k small{font-size:30px;margin-left:4px;color:${onA === '#FFFFFF' ? gold : D.ink}}.cvcivic .cv-k p{margin-top:16px;font-size:17px;opacity:.82}
.cvcivic.cv-story .cv-sg2>figure{aspect-ratio:4/3}
.cvcivic.cv-help{background:#F3F5F8;padding:110px 0}.cvcivic .cv-hg2{display:grid;grid-template-columns:1.2fr 1fr;gap:72px}.cvcivic .cv-nt{margin-top:28px}.cvcivic .cv-nt li{display:flex;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid #C6CDD7;font-size:17px}.cvcivic .cv-nt li:first-child{border-top:2px solid ${D.ink}}.cvcivic .cv-nt a{font-weight:600}.cvcivic .cv-nt time{color:#646C7A;font-size:15px;white-space:nowrap}
.cvcivic .cv-none{margin-top:28px;padding:28px 0;border-top:2px solid ${D.ink};color:var(--mu)}.cvcivic .cv-none a{color:var(--at);font-weight:700;text-decoration:underline}
.cvcivic .cv-call{background:#fff;padding:44px;border-top:6px solid var(--a)}.cvcivic .cv-call h3{font-size:26px;font-weight:800;letter-spacing:-.03em}.cvcivic .cv-tel{display:block;font-size:40px;font-weight:800;letter-spacing:-.03em;color:var(--at);margin-top:18px}.cvcivic .cv-call p{color:var(--mu);font-size:16px;margin-top:8px}.cvcivic .cv-call .cv-b{margin-top:28px}
@media (max-width:720px){.gh.hps-h:before{font-size:13px;line-height:36px;padding:0 20px}.cvcivic.cv-hero{padding:48px 0 72px}.cvcivic .cv-g{grid-template-columns:1fr;gap:48px}.cvcivic.cv-hero h1{font-size:40px;line-height:1.22}.cvcivic .cv-lead{font-size:17px;margin-top:20px}.cvcivic.cv-hero .cv-cta{margin-top:32px}.cvcivic .cv-b{height:56px}
.cvcivic .cv-phw{padding:0 0 20px 20px}.cvcivic .cv-phw figure{aspect-ratio:4/3.4}.cvcivic.cv-svc,.cvcivic.cv-help{padding:72px 0}.cvcivic .cv-h2{font-size:30px}.cvcivic .cv-sv{grid-template-columns:1fr;margin-top:24px}.cvcivic .cv-sv a{padding:20px 0}.cvcivic .cv-sv b{font-size:18px}.cvcivic .cv-sv span{font-size:14px}
.cvcivic .cv-ls{margin-top:28px}.cvcivic .cv-rw{grid-template-columns:72px 1fr;gap:6px 16px;padding:24px 0;align-items:start}.cvcivic .cv-dt b{font-size:22px}.cvcivic .cv-dt small{font-size:13px}.cvcivic .cv-rw h3{font-size:19px}.cvcivic .cv-rw p,.cvcivic .cv-mt{font-size:14px}.cvcivic .cv-mt{grid-column:2}.cvcivic .cv-tag{grid-column:2;justify-self:start;font-size:13px;margin-top:6px}
.cvcivic.cv-figs{padding:80px 0}.cvcivic .cv-fg,.cvcivic .cv-fg.n2{grid-template-columns:1fr;gap:28px}.cvcivic .cv-k{padding:28px 0 0;border-left:0;border-top:1px solid ${al(onA, .22)}}.cvcivic .cv-k:first-child{border-top:0;padding-top:0}.cvcivic .cv-k .cv-n{font-size:60px}.cvcivic .cv-ft{margin-bottom:32px}
.cvcivic .cv-hg2{grid-template-columns:1fr;gap:40px}.cvcivic .cv-nt li{font-size:15px;flex-direction:column;gap:4px}.cvcivic .cv-call{padding:28px 24px}.cvcivic .cv-tel{font-size:32px}.cvcivic .cv-call .cv-b{width:100%}}
`; }
    if (th === 'cvheritage') { const gold = '#A8844F'; const goldT = fit(gold, D.bg, 4.6); const gl = '#D9C29A';
      x += `
.gh.hps-h{background:${D.bg}!important;border-bottom:1px solid #DCD8CF!important;box-shadow:none!important}.gh .hps-cta{background:transparent!important;color:${at}!important;box-shadow:inset 0 0 0 1px ${at}!important;border-radius:0!important}.gh .hps-wmk i{border-radius:0!important;transform:rotate(45deg) scale(.8)}.gh.hps-h :is(.hps-hw){border-radius:0!important;border:0!important;box-shadow:none!important;background:transparent!important}.gf.hps-f{background:${mix(a, '#000000', .3)}!important}
.cvheritage{line-height:1.7}.cvheritage .cv-b{border-radius:0;height:60px;padding:0 32px;font-weight:600;gap:14px}.cvheritage .cv-b.line{color:var(--at);box-shadow:inset 0 0 0 1px ${at}}
.cvheritage .cv-ey{font-size:13px;letter-spacing:.2em;color:${goldT};margin-bottom:22px}
.cvheritage .cv-h2{font-size:50px;line-height:1.28;font-weight:300;letter-spacing:-.045em}.cvheritage .cv-h2 b{font-weight:700}
.cvheritage.cv-hero{display:grid;grid-template-columns:1fr 1fr;min-height:780px;padding:0;border-bottom:1px solid #DCD8CF}
.cvheritage .cv-tx{display:flex;flex-direction:column;justify-content:center;padding:96px 72px 96px max(48px,calc((100vw - 1280px)/2 + 48px))}
.cvheritage .cv-est{font-size:14px;letter-spacing:.2em;color:${goldT};font-weight:700;display:flex;gap:16px;align-items:center}.cvheritage .cv-est:after{content:"";width:64px;height:1px;background:${gold}}
.cvheritage.cv-hero h1{font-size:68px;line-height:1.22;font-weight:300;letter-spacing:-.05em;margin-top:36px}.cvheritage.cv-hero h1 b{font-weight:700}
.cvheritage .cv-lead{margin-top:32px;font-size:19px;color:var(--mu);max-width:480px;line-height:1.75}.cvheritage.cv-hero .cv-cta{margin-top:48px}
.cvheritage .cv-hf{position:relative;margin:0;min-height:100%}.cvheritage .cv-hf img{position:absolute;inset:0}.cvheritage .cv-hf figcaption{position:absolute;left:0;bottom:0;background:var(--a);color:var(--on);padding:28px 36px;font-size:15px;max-width:380px}
.cvheritage.cv-vals .cv-c{text-align:center}.cvheritage.cv-vals .cv-h2{max-width:900px;margin:0 auto}
.cvheritage .cv-vg{margin-top:88px;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid ${D.ink};text-align:left}.cvheritage .cv-vg div{padding:36px 40px 0 0}.cvheritage .cv-vg div+div{padding-left:40px;border-left:1px solid #DCD8CF}
.cvheritage .cv-no{font-size:14px;color:${goldT};font-weight:700;letter-spacing:.1em}.cvheritage .cv-vg h3{font-size:28px;font-weight:600;letter-spacing:-.03em;margin-top:12px}.cvheritage .cv-vg p:not(.cv-no){font-size:16px;color:var(--mu);margin-top:10px}
.cvheritage.cv-levels{background:#fff}.cvheritage .cv-lt{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:end;margin-bottom:72px}.cvheritage .cv-lt>p{font-size:18px;color:var(--mu)}
.cvheritage .cv-lv{display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid var(--a)}.cvheritage .cv-lv.n3{grid-template-columns:repeat(3,1fr)}.cvheritage .cv-lv a{display:flex;flex-direction:column;padding:36px 32px 40px;border-right:1px solid #DCD8CF;min-height:340px;transition:background .3s}.cvheritage .cv-lv a:last-child{border-right:0}.cvheritage .cv-lv a:hover{background:${D.bg}}
.cvheritage .cv-r{font-size:56px;font-weight:200;color:${gold};line-height:1;letter-spacing:-.04em}.cvheritage .cv-lv h3{font-size:24px;font-weight:700;letter-spacing:-.03em;margin-top:28px}.cvheritage .cv-lv p{font-size:15px;color:var(--mu);margin-top:10px;flex:1}
.cvheritage .cv-lv span{font-size:15px;font-weight:600;color:var(--at);display:flex;justify-content:space-between;align-items:center;border-top:1px solid #DCD8CF;padding-top:18px;margin-top:24px}
.cvheritage .cv-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:56px;gap:24px}.cvheritage .cv-more{font-weight:600;border-bottom:1px solid ${at};padding-bottom:6px;gap:12px}
.cvheritage .cv-pg2{display:grid;grid-template-columns:1.25fr 1fr;gap:32px}.cvheritage .cv-pg2.n1{grid-template-columns:1fr}.cvheritage .cv-pc figure{aspect-ratio:16/10}.cvheritage .cv-pc.s figure{aspect-ratio:4/3.06}
.cvheritage .cv-m{display:flex;gap:14px;font-size:14px;color:${goldT};font-weight:700;letter-spacing:.06em;margin-top:26px}.cvheritage .cv-pc h3{font-size:30px;font-weight:600;letter-spacing:-.035em;margin-top:10px;line-height:1.35}.cvheritage .cv-pc p:not(.cv-m){font-size:16px;color:var(--mu);margin-top:10px}
.cvheritage.cv-figs{background:var(--a);color:var(--on);padding:130px 0}.cvheritage .cv-fg{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;gap:48px;align-items:end}.cvheritage .cv-fg.n2{grid-template-columns:1.2fr 1fr 1fr}.cvheritage .cv-fg.n1{grid-template-columns:1.2fr 1fr}.cvheritage.cv-figs .cv-h2{font-size:40px}
.cvheritage .cv-k{border-top:1px solid ${al(onA, .25)};padding-top:24px}.cvheritage .cv-k .cv-n{font-size:72px;font-weight:200;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}.cvheritage .cv-k small{font-size:22px;color:${onA === '#FFFFFF' ? gl : D.ink};font-weight:500;margin-left:6px}.cvheritage .cv-k p{margin-top:12px;opacity:.78;font-size:15px}
.cvheritage .cv-dg{display:grid;grid-template-columns:1fr 1fr}.cvheritage .cv-pn{padding:64px 56px 64px 0;display:block;border-top:1px solid ${D.ink};border-bottom:1px solid ${D.ink}}.cvheritage .cv-pn.p1{padding:64px 0 64px 56px;border-left:1px solid #DCD8CF}
.cvheritage .cv-k{}.cvheritage.cv-duo .cv-k{font-size:13px;letter-spacing:.2em;color:${goldT};font-weight:700;border:0;padding:0}.cvheritage .cv-pn h3{font-size:38px;font-weight:300;letter-spacing:-.04em;margin-top:16px;line-height:1.3}.cvheritage .cv-pn p{color:var(--mu);margin-top:14px;font-size:16px}.cvheritage .cv-pb{display:inline-flex;align-items:center;gap:12px;margin-top:32px;font-weight:600;color:var(--at)}
@media (max-width:720px){.cvheritage.cv-hero{grid-template-columns:1fr;min-height:0}.cvheritage .cv-tx{padding:56px 20px 64px}.cvheritage .cv-est{font-size:13px}.cvheritage.cv-hero h1{font-size:40px;margin-top:24px;line-height:1.3}.cvheritage .cv-lead{font-size:16px;margin-top:22px}.cvheritage.cv-hero .cv-cta{margin-top:32px}.cvheritage .cv-b{height:56px;justify-content:space-between}
.cvheritage .cv-hf{min-height:0;display:flex;flex-direction:column}.cvheritage .cv-hf img{position:relative;aspect-ratio:4/4.2;height:auto}.cvheritage .cv-hf figcaption{position:relative;max-width:none;padding:22px 20px}
.cvheritage .cv-h2{font-size:30px}.cvheritage .cv-vg{grid-template-columns:1fr;margin-top:48px}.cvheritage .cv-vg div,.cvheritage .cv-vg div+div{padding:24px 0;border-left:0;border-bottom:1px solid #DCD8CF}.cvheritage .cv-vg h3{font-size:22px}
.cvheritage .cv-lt{grid-template-columns:1fr;gap:20px;margin-bottom:40px}.cvheritage .cv-lt>p{font-size:16px}.cvheritage .cv-lv,.cvheritage .cv-lv.n3{grid-template-columns:1fr 1fr}.cvheritage .cv-lv a{min-height:0;padding:24px 16px 24px 0;border-right:0;border-bottom:1px solid #DCD8CF}.cvheritage .cv-lv a:nth-child(even){padding-left:16px;border-left:1px solid #DCD8CF}.cvheritage .cv-r{font-size:40px}.cvheritage .cv-lv h3{font-size:19px;margin-top:16px}.cvheritage .cv-lv p{font-size:14px}.cvheritage .cv-lv span{font-size:14px}
.cvheritage .cv-head{flex-direction:column;align-items:flex-start;gap:20px;margin-bottom:36px}.cvheritage .cv-pg2{grid-template-columns:1fr;gap:48px}.cvheritage .cv-pc h3{font-size:23px}
.cvheritage.cv-figs{padding:80px 0}.cvheritage .cv-fg,.cvheritage .cv-fg.n2,.cvheritage .cv-fg.n1{grid-template-columns:1fr;gap:28px}.cvheritage.cv-figs .cv-h2{font-size:28px}.cvheritage .cv-k .cv-n{font-size:56px}
.cvheritage .cv-dg{grid-template-columns:1fr}.cvheritage .cv-pn,.cvheritage .cv-pn.p1{padding:40px 0;border-left:0}.cvheritage .cv-pn.p1{border-top:0}.cvheritage .cv-pn h3{font-size:28px}}
`; }
    if (th !== 'cvkeynote') x += `.gf.hps-f :is(p,a,span,li,em,small,dt,dd){color:#B9C0C8!important}.gf.hps-f :is(strong,b,.hps-fn,.hps-fl){color:#FFFFFF!important}.gf.hps-f :is(hr,.hps-bar,.hps-bl){border-color:rgba(255,255,255,.14)!important}`;
    return x; }

  /* ── 렌더러 연결 ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    try { if (x && s) { const d = x.data || {};
      if (x.type === 'text' && SEC[d.hpt]) { if (x.hide && !editing()) return ''; const h = SEC[d.hpt](x, s); return h || ''; }
      if (x.type === 'banner' && mine(s) && HPT.has(s.theme) && !+d.dstyle && !s.layout) { if (x.hide && !editing()) return ''; return mark(HERO[s.theme](s, d), x); } }
    } catch (e) { console.error('hpv-corp', e); }
    return base(x, i, s, lk); }; window.proSec = proSec; }
  try { if (window.HPW && typeof HPW.emptyOf === 'function') { const e0 = HPW.emptyOf; HPW.emptyOf = x => { const d = (x && x.data) || {}; if (x && x.type === 'text' && SEC[d.hpt]) { try { return /^cv-(cards|mag|rows|prog|levels|figs|stat|band)$/.test(d.hpt) ? !live().length : d.hpt === 'cv-hours' ? !facs().length : d.hpt === 'cv-quote' ? !review() : false; } catch (e) { return false; } } return e0(x); }; } } catch (e) { }
  const needCSS = s => !!(s && (mine(s) || (s.sections || []).some(x => x && x.data && SEC[x.data.hpt])));
  const SERIF_CSS = 'fonts/noto-serif-kr/font.css?v=ea0bde31';
  { const base = siteHTML; siteHTML = (s, ...a) => { let h = base(s, ...a); try { if (needCSS(s) && HPT.tokens(s)) { h = h.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>'); h = h.replace(/<section class="([^"]*\bcv\b[^"]*)"/g, (m, c) => `<section class="${c.replace(/\bhps-(flowb?|short)\b\s*/g, '').trim()}"`); /* 같은 바탕 섹션 간격 압축(hpsec-trust hps-flow · !important)은 시안의 섹션 리듬을 깨므로 이 섹션에서 뺀다 */ if (thOf(s) === 'cvjournal' && h.indexOf(SERIF_CSS) < 0) h = h.replace('</head>', `<link rel="stylesheet" href="${SERIF_CSS}"></head>`); } } catch (e) { console.error('hpv-corp css', e); } return h; }; window.siteHTML = siteHTML; }

  /* ── 등록 ── */
  MINE.forEach(id => { HPT.reg(id, Object.assign({ prem: 1, cssX: () => '' }, DEF[id])); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpv-corp HPD', e); } });
  { const pf = HPT.premFor; if (typeof pf === 'function') HPT.premFor = t => { const L = pf(t).filter(id => !MINE.includes(id)); const f1 = MINE.filter(fits); return [...f1, ...L, ...MINE.filter(id => !fits(id))]; }; }
  { const pf = HPT.premFits; if (typeof pf === 'function') HPT.premFits = (id, t) => MINE.includes(id) ? fits(id) : pf(id, t); }
  { const tb = HPT.thumb; if (typeof tb === 'function') HPT.thumb = (s, id) => { if (!MINE.includes(id)) return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.id === 'prem-' + id); if (tp) b.sections = tp.build(); b.photos = Object.assign({}, PH[id]); return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpv-corp thumb', e); return tb(s, id); } }; }
  const PH = { cvkeynote: { hero: 'grp-01', about: 'hum-10' }, cvjournal: { hero: 'sen-01', about: 'hum-26', space: 'hum-13', cta: 'hum-05' }, cvposter: { hero: 'spo-08', about: 'lec-02' }, cvcivic: { hero: 'hum-51', about: 'lec-01' }, cvheritage: { hero: 'hum-46', about: 'hum-11' } };
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') { window.HPVC = { DEF, fits, css, SEC }; return; }
  const TX = (variant, data) => S2('text', { variant, ...data });
  const quiet = () => [TX('stats', { hpt: 'facts', title: '', cols: [] }), TX('timeline', { hpt: 'sched', eyebrow: '', title: '모집 일정', cols: [] })].map(x => Object.assign(x, { hide: true }));
  const B = {
    cvkeynote: { scene: '기업 HRD · 공공 직원 교육 — 큰 제목과 사진 한 장, 필수 교육 이수율, 직무 과정 카드', purpose: ['learn', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()} 러닝센터`, title: '다음 분기의 나를,\n오늘 준비해요.', sub: `${org()} ${staffW()}을 위한 러닝센터예요. 필수 교육부터 직무 · 리더십 과정까지 한곳에서 듣고, 이수 기록은 자동으로 남아요.`, cta: '내 교육 시작하기', link: 'learn:my', cta2: '과정 둘러보기', link2: 'learn:courses', note: '로그인하면 남은 필수 교육과 마감일을 먼저 보여드려요.' }),
        TX('features', { hpt: 'cv-stat', title: '', sub: '', cols: [] }),
        TX('features', { hpt: 'cv-cards', eyebrow: '이번 학기 과정', title: '일에 바로 쓰는 배움,\n지금 들을 수 있어요.', sub: '', cols: [] }),
        TX('steps', { hpt: 'cv-story', eyebrow: `${org()}의 배우는 방식`, title: '강의는 짧게,\n실습은 내 일로.', sub: '듣고 끝나는 수업이 아니라, 다음 주 업무에 쓸 결과물 하나를 들고 나가요.', cols: [['짧게 나눈 강의', '출퇴근길 휴대폰으로 끊어 들어도 진도가 이어져요.'], ['내 업무 자료로 실습', 'AI 조교가 과제를 같이 보고 바로 피드백해요.'], ['이수는 자동으로 기록', '기준을 채우면 이수증이 바로 나와요.']] }),
        TX('features', { hpt: 'cv-quote', title: '', cols: [] }),
        TX('features', { hpt: 'cv-duo', title: '', cols: [['내 교육,\n지금 이어서 들어요.', '로그인하면 필수 교육 · 신청한 과정 · 이수증이 한 화면에 모여요.'], ['팀 단위 신청과\n이수 현황을 한 번에.', '부서별 단체 등록과 미이수자 알림은 담당자 화면에서 처리해요.']] }), ...quiet()] },
    cvjournal: { scene: '공공 시민 강좌 · 평생학습관 — 세리프 잡지형, 이번 학기 강좌와 접수 띠, 전화 신청', purpose: ['apply', 'brand'],
      build: () => [S2('banner', { eyebrow: `${org()} 이번 학기 강좌`, title: `다시 배우는 ${season()},\n우리 동네에서.`, sub: '주민이라면 누구나 들을 수 있는 강좌예요. 집에서 걸어갈 수 있는 배움터에서 이웃과 함께 배워요.', cta: '강좌 보기', link: 'learn:courses', cta2: '내 신청 확인', link2: 'learn:my', note: '' }),
        TX('features', { hpt: 'cv-rail', title: '', sub: '', cols: [] }),
        TX('features', { hpt: 'cv-mag', eyebrow: '이번 학기 추천', title: '이번 학기, 이웃들이\n먼저 고른 강좌', sub: '', cols: [] }),
        TX('features', { hpt: 'cv-band', title: '', sub: '수강료가 있는 강좌도 재료비 위주로 받아요. 감면 대상은 신청할 때 함께 확인해요.', cols: [] }),
        TX('steps', { hpt: 'cv-story', eyebrow: '처음이라면', title: '신청은 세 번이면\n끝나요.', sub: '', cols: [['간편 가입', '간편 가입 뒤 주소지만 확인하면 돼요.'], ['듣고 싶은 강좌 담기', '정원이 넘는 강좌는 접수 마감 뒤 추첨해요.'], ['문자로 결과 받기', '인터넷이 어려우면 전화로 신청을 도와드려요.']] }),
        TX('features', { hpt: 'cv-quote', title: '', cols: [] }),
        TX('cta', { hpt: 'cv-fin', title: '배우고 싶은 강좌를\n지금 찾아보세요.', sub: '궁금한 점은 담당 부서로 편하게 물어보세요.', cta: '강좌 찾아보기', cols: [] }), ...quiet()] },
    cvposter: { scene: '공공 체육 · 문화 시설 — 전면 사진 포스터, 운영 시간 · 시설 그리드 · 단체 대관', purpose: ['apply', 'info'],
      build: () => [S2('banner', { eyebrow: '강습 등록 · 시설 예약', title: '운동도 배움도,\n집 앞 센터에서.', sub: `${facs().slice(0, 3).map(f => f.name).join(' · ') || '체육 · 문화 시설'}을 예약하고 강습을 신청해요. 단체는 공간을 빌려 쓸 수 있어요.`, cta: '강습 · 이용권', link: 'learn:shop', cta2: '시설 예약', link2: 'learn:fac' }),
        TX('features', { hpt: 'cv-quick', title: '', cols: [] }),
        TX('features', { hpt: 'cv-hours', title: '', sub: '', cols: [] }),
        TX('features', { hpt: 'cv-places', eyebrow: '시설과 프로그램', title: '한 건물에서\n여러 가지 하루를.', cols: [] }),
        TX('steps', { hpt: 'cv-rent', eyebrow: '단체 대관', title: '단체라면,\n공간을 빌려 쓰세요.', sub: '동호회 · 학교 · 기업 누구나 시간 단위로 빌릴 수 있어요.', cols: [['빈 시간 고르기', '달력에서 시설과 시간을 골라요.'], ['단체 정보 · 인원 입력', '단체 증빙은 사진으로 올려요.'], ['승인 후 결제', '담당자가 확인하면 문자로 알려드려요.']] }),
        TX('features', { hpt: 'cv-quote', title: '', cols: [] }),
        TX('features', { hpt: 'cv-duo', title: '', cols: [['강습 등록,\n미리 담아 두세요.', '강습과 이용권은 온라인으로 등록하고 결제해요. 감면 대상은 첫 방문 때 확인해요.'], ['대관 일정을\n바로 확인하세요.', '빈 시간을 보고 신청하면 담당자가 확인해 확정해 드려요.']] }), ...quiet()] },
    cvcivic: { scene: '공공 직원 교육 · 지자체 교육원 — 공식 누리집 띠, 자주 찾는 서비스, 날짜 열 교육 목록, 알림마당', purpose: ['learn', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()} 교육 안내`, title: '공직자의 배움,\n한곳에서 이어가요.', sub: `${org()} 소속 직원은 누구나 이곳에서 교육을 신청하고, 이수 현황과 이수증을 바로 확인할 수 있어요.`, cta: '내 교육 이수 현황', link: 'learn:my', cta2: '교육과정 찾기', link2: 'learn:courses', note: '처음 오셨나요?' }),
        TX('features', { hpt: 'cv-svc', title: '자주 찾는 서비스', cols: [] }),
        TX('features', { hpt: 'cv-rows', eyebrow: '교육과정', title: '지금 운영 중인 교육', sub: '', cols: [] }),
        TX('features', { hpt: 'cv-figs', eyebrow: '교육 운영 현황', title: '', cols: [] }),
        TX('steps', { hpt: 'cv-story', eyebrow: '교육 이수 안내', title: '신청부터 이수증까지,\n세 단계면 돼요.', sub: '', cols: [['로그인', '기관에서 받은 초대 계정으로 들어가요.'], ['교육 신청 · 수강', '집합 교육은 승인 후 확정, 사이버 교육은 바로 들어요.'], ['이수증 발급', '기준을 채우면 이수증을 PDF로 내려받아요.']] }),
        TX('features', { hpt: 'cv-help', title: '알림마당', sub: '교육 신청이 어려우신가요?', cols: [] }), ...quiet()] },
    cvheritage: { scene: '대기업 · 금융권 연수원 — 격식 있는 분할 첫 화면, 교육 철학, 계층별 교육 체계, 숫자', purpose: ['brand', 'learn'],
      build: () => [S2('banner', { eyebrow: `${org()} 인재원`, title: '신뢰받는 회사는,\n사람을 먼저 키워요.', sub: `신입부터 임원까지, ${org()} 임직원이 경력의 단계마다 거치는 교육을 이곳에서 안내해요.`, cta: '나의 학습 이어가기', link: 'learn:my', cta2: '교육 체계 보기', link2: 'learn:courses', note: '' }),
        TX('features', { hpt: 'cv-vals', eyebrow: '교육 철학', title: '고객의 내일을 맡는 일이기에,\n배움에는 타협하지 않아요.', cols: [['전문성', '직무 역량을 단계별 과정으로 쌓아요.'], ['신뢰', '법정 · 윤리 교육을 매년 빠짐없이 이수해요.'], ['리더십', '조직을 이끌 리더를 내부에서 길러요.']] }),
        TX('features', { hpt: 'cv-levels', eyebrow: '교육 체계', title: '경력의 단계마다,\n꼭 맞는 과정이 있어요.', sub: '직급과 직무에 따라 들어야 할 과정이 정해져 있어요. 로그인하면 내 단계의 과정이 먼저 보여요.', cols: [] }),
        TX('features', { hpt: 'cv-prog', eyebrow: '대표 프로그램', title: '지금 운영 중인 과정', cols: [] }),
        TX('features', { hpt: 'cv-figs', title: '숫자로 보는\n인재원', cols: [] }),
        TX('features', { hpt: 'cv-duo', title: '', cols: [['내 단계의 과정을\n확인해 보세요.', '로그인하면 필수 과정과 이수 현황이 먼저 보여요.'], ['전체 교육 과정\n한눈에 보기', '직급 · 직무별 과정과 일정을 안내해요.']] }), ...quiet()] }
  };
  MINE.forEach(id => { if (TPL.some(t => t.id === 'prem-' + id)) return; const c = B[id];
    TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags], scene: c.scene, color: DEF[id].acc, tone: '신뢰', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, noPalette: true, build: c.build }); }); /* 시안 색 그대로(가까운 팔레트로 바꾸지 않음) — 기관이 색을 고르면 그 색 */
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpvc) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && String(tp.id || '').replace(/^prem-/, ''); if (PH[id] && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, PH[id]); s.img = s.img || {}; Object.keys(s.photos).forEach(sl => { const v = HPSTOCK.slotImg(s.photos[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hpv-corp photo', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hpvc = 1; siteFromTpl = f; window.siteFromTpl = f; }
  /* 자동 보강(HPT.enrich)이 첫 화면 바로 아래에 넣는 공지 · FAQ는 시안의 첫 화면 리듬을 깨므로 마지막 행동 섹션 앞으로 옮긴다. 관공서는 알림마당(cv-help)이 공지를 보여 주므로 자동 공지를 숨긴 자리로 둔다 */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hpvc) { const e0 = HPT.enrich; const f = s => { const r = e0(s); try { if (mine(s) && Array.isArray(s.sections)) { const L = s.sections;
      const isMv = x => x && (x.type === 'notices' || (x.type === 'text' && x.data && x.data.hpt === 'faq'));
      const mv = L.filter(isMv); if (mv.length) { for (let k = L.length - 1; k >= 0; k--) if (isMv(L[k])) L.splice(k, 1);
        if (s.theme === 'cvcivic') mv.forEach(x => { if (x.type === 'notices') x.hide = true; });
        let at = -1; L.forEach((x, k) => { if (x && x.data && /^cv-(duo|fin|help)$/.test(x.data.hpt)) at = k; }); if (at < 0) at = L.length; L.splice(at, 0, ...mv); } } } catch (e) { console.error('hpv-corp enrich', e); } return r; };
    Object.keys(e0).forEach(k => { try { f[k] = e0[k]; } catch (e) { } }); f.hpvc = 1; HPT.enrich = f; }
  window.HPVC = { DEF, fits, css, SEC, B, PH };
})();
