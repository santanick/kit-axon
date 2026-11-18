/* v44 hp44-univ — 대학 홈페이지 템플릿 10종(세부 유형별, 디자이너 U). v43.9 hpv-univ 4종을 흡수 · 발전 + 6종 신규. 대표님 11-18: 「기관 유형별 10가지, 세부 유형별 시나리오에 맞게 높은 퀄리티만」
   이전 머리말(hpv-univ, 디자이너 D1): 시안: plan/tpl439/D1/mock-*.html
   대표님(2026-11-17 22:41 · 22:57): 「디자인이 너무 구려」 「5배 이상 고퀄리티」 → 시안 4개(에디토리얼 · 시네마틱 · 콜라주 · 전통) 「전부 마음에 들어」.
   - univy(에디토리얼 아이비): 크림 바탕 · 세리프 큰 제목 · 넓은 사진 한 장 · 목차형 프로그램 목록 · 큰 숫자 하나
   - uncine(시네마틱 캠퍼스): 전면 사진 첫 화면 · 짙은 기관 색 바로 가기 띠 · 세로 사진 카드 · 사진 띠 · 큰 숫자
   - uncollage(모던 콜라주): 가운데 큰 제목 · 높낮이가 다른 사진 콜라주 · 「저는 ○○예요」 문장형 바로 가기 · 배지 메달
   - unclassic(전통 대학): 교표 · 가운데 기관명 머리글 · 세리프 · 대칭 · 학사 공지 · 일정 · 행사 정돈 · 교육 이념
   원칙: 첫 화면은 큰 제목 + 부제 + 버튼 2개 + 사진 한 덩어리(판 · 칩 · D-day 없음). 수치 · 일정 · 공지 · 강좌는 실제 기관 데이터만, 없으면 그 덩어리를 숨긴다.
   대학 개인정보: 학번 · 학과만. 링크는 게시본 규칙(#p-m-<메뉴> · #p-c-<강좌>) + 학습자 경로(#login · #cal · #badges · #my · #shop · #notice) + tel: · mailto:.
   CSS는 JS 문자열로 사이트 CSS에 넣는다(게시본 Shadow DOM). 범위: .u4(부품) · 페이지 루트 BR = :is(body.hpt-on, .smr)(게시본 Shadow DOM 포함). */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const U = HPT.U || {}; const mix = U.mix, fit = U.fit, al = U.al;
  const ramp = HPT.ramp || (c => ({ 50: mix(c, '#ffffff', .94), 100: mix(c, '#ffffff', .86), 200: mix(c, '#ffffff', .7), 500: c, 700: mix(c, '#000000', .3), 800: mix(c, '#000000', .46), 900: mix(c, '#000000', .62) }));
  const E = v => esc(v == null ? '' : v);
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const term = k => (typeof t === 'function' ? t(k) : '강좌');
  const tday = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const okD = s => /^\d{4}-\d{2}-\d{2}/.test(String(s || ''));
  const dd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const days = (a, b) => Math.round((dd(b) - dd(a)) / 864e5);
  const WD = '일월화수목금토';
  const md = s => `${+String(s).slice(5, 7)}월 ${+String(s).slice(8, 10)}일`;
  const mdS = s => `${+String(s).slice(5, 7)}.${String(s).slice(8, 10)}`;
  const AR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const IDS = ['uncine', 'unsplit', 'uncollage', 'unclassic', 'univy', 'unposter', 'undark', 'unmag', 'unblock', 'unoverlap', 'unportal', 'unfind'];
  /* 페이지 루트: 스튜디오 미리보기 · 썸네일(iframe)은 body, 학습자 게시본(Shadow DOM)은 .smr — body 선택자만 쓰면 게시본에서 테마가 통째로 빠진다(v44 QA) */
  const BR = ':is(body.hpt-on,.smr.smr)';
  const mine = s => !!(s && IDS.includes(s.theme) && HPT.has && HPT.has(s.theme));
  const lnk = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  /* 제목: 줄바꿈 = 줄, [낱말] = 기관 색 강조(없으면 emLast일 때 마지막 줄) */
  const lines = (v, emLast) => { const raw = String(v || ''); const has = /\[[^\]\n]+\]/.test(raw); const L = raw.split('\n').filter(Boolean).map(x => E(x).replace(/\[([^\]]+)\]/g, has ? '<em>$1</em>' : '$1')); if (!has && emLast && L.length > 1) L[L.length - 1] = `<em>${L[L.length - 1]}</em>`; return L.join('<br>'); };

  /* ── 실제 데이터 ── */
  const pubAll = () => { try { return (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료' && c.status !== '삭제'); } catch (e) { return []; } };
  const s0 = () => { try { return (typeof site === 'function' ? site() : S.site) || {}; } catch (e) { return {}; } };
  const menuOf = (s, k) => ((s && s.menus) || []).find(m => m && m.kind === k && m.on !== false && m.access !== '비공개');
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const contact = () => { const f = ft(); const tel = f.tel && !isPh(f.tel) ? String(f.tel) : ''; const em = (f.email || f.mail) && /@/.test(f.email || f.mail) ? String(f.email || f.mail) : ''; const addr = f.addr && !isPh(f.addr) ? String(f.addr) : ''; return { tel, em, addr }; };
  const href = { cls: s => { const m = menuOf(s, 'class'); return m ? '#p-m-' + m.id : '#shop'; },
    notice: s => { const m = menuOf(s, 'notice'); return m ? '#p-m-' + m.id : '#notice'; },
    ask: s => { const K = contact(); if (K.tel) return 'tel:' + K.tel.replace(/[^\d+]/g, ''); if (K.em) return 'mailto:' + K.em; const b = menuOf(s || s0(), 'community') || menuOf(s || s0(), 'board'); return b ? '#p-m-' + b.id : '#comm'; } };
  const linkHref = v => { v = String(v || ''); if (!v) return ''; if (v.startsWith('learn:')) return '#p-' + ({ home: 'home', shop: 'm-class', textbooks: 'm-book', comm: 'm-community', notice: 'm-notice', fac: 'l-fac' }[v.slice(6)] || 'home'); if (v.startsWith('page:')) return '#p-' + v.slice(5); if (v.startsWith('cls:')) return '#p-c-' + v.slice(4); if (v.startsWith('url:')) return typeof safeURL === 'function' ? safeURL(v.slice(4)) : ''; return ''; };
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const semester = () => { const d = tday(); const y = +d.slice(0, 4), m = +d.slice(5, 7); return m >= 8 ? `${y}-2학기` : m >= 2 ? `${y}-1학기` : `${y - 1}-2학기`; };
  const yearSem = () => { const d = tday(); const y = +d.slice(0, 4), m = +d.slice(5, 7); return m >= 8 ? `${y}학년도 2학기` : m >= 2 ? `${y}학년도 1학기` : `${y - 1}학년도 2학기`; };
  const MODE = { first: '선착순', approve: '승인 후 확정', lottery: '추첨' };
  /* 강좌 상태 한 줄: 접수 마감일 · 접수 시작일 · 개강일 · 진행 중 */
  const stOf = c => { const T0 = tday(); const r = c.recruit && c.recruit.on ? c.recruit : null; const from = r && okD(r.from) ? r.from.slice(0, 10) : ''; const to = r && okD(r.to) ? r.to.slice(0, 10) : '';
    if (r && to && to >= T0 && (!from || from <= T0)) return { k: 0, t: `${md(to)}까지 접수`, at: to };
    if (r && from && from > T0) return { k: 1, t: `${md(from)} 접수 시작`, at: from };
    if (okD(c.start) && c.start.slice(0, 10) > T0) return { k: 2, t: `${md(c.start)} 개강`, at: c.start.slice(0, 10) };
    return { k: 3, t: c.status === '운영중' ? '수강 중' : '상시 신청', at: '9' }; };
  const sortCls = L => L.map(c => [c, stOf(c)]).sort((a, b) => a[1].k - b[1].k || a[1].at.localeCompare(b[1].at)).map(x => x[0]);
  const metaOf = c => { const r = c.recruit && c.recruit.on ? c.recruit : null; return [r && +r.cap ? `정원 ${+r.cap}명` : '', r ? MODE[r.mode] || '' : '', c.teacher && !isPh(c.teacher) ? String(c.teacher) : ''].filter(Boolean).join(' · '); };
  const kw = name => { const m = String(name).match(/^([^:：]{1,8})[:：]\s*(.+)$/); return m ? { tag: m[1].trim(), l: m[2].trim() } : { tag: '', l: String(name) }; };
  const descOf = c => { const v = String(c.desc || c.summary || c.intro || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); return v && !isPh(v) ? v.slice(0, 60) : ''; };
  function events(n) { const T0 = tday(); const lim = (() => { const d = dd(T0); d.setDate(d.getDate() + 60); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(); const L = []; const seen = new Set();
    const add = (date, title, kind) => { if (!okD(date)) return; date = String(date).slice(0, 10); if (date < T0 || date > lim) return; const k = date + title; if (seen.has(k)) return; seen.add(k); L.push({ date, title, kind }); };
    try { (typeof cxPub === 'function' ? cxPub() : []).forEach(e => add(e.date, e.title, e.kind || '학사')); } catch (e) { }
    pubAll().forEach(c => { const r = c.recruit && c.recruit.on ? c.recruit : null; if (r && okD(r.to)) add(r.to, `${c.name} 접수 마감`, '마감'); if (okD(c.start)) add(c.start, `${c.name} 개강`, '개강'); });
    /* 학습자에게 보이는 기관 일정(시험 · 행사)은 강좌 마감 · 개강에 밀려 빠지지 않게 하나는 꼭 넣는다 */
    L.sort((a, b) => a.date.localeCompare(b.date)); n = n || 4; const out = L.slice(0, n); const ac = L.find(x => x.kind !== '마감' && x.kind !== '개강'); if (ac && !out.includes(ac)) { out[n - 1] = ac; out.sort((a, b) => a.date.localeCompare(b.date)); } return out; }
  function notices(n) { let L = []; try { L = [...(S.notices || []).map(x => ({ ...x, top: !!x.pin })), ...(S.classes || []).filter(c => c.open === '전체' || c.open == null).flatMap(c => (c.notices || []).map(x => ({ ...x, top: false })))]; } catch (e) { }
    return L.filter(x => x && x.title && !isPh(x.title)).sort((a, b) => (b.top - a.top) || String(b.at || '').localeCompare(String(a.at || ''))).slice(0, n || 4); }
  const badgeList = () => { try { return (S.badges || []).filter(b => b && b.name); } catch (e) { return []; } };
  const badgeN = () => badgeList().reduce((a, b) => a + (b.issued || []).filter(i => i && i.st !== '취소').length, 0);
  const certN = () => { try { return (S.certs || []).length; } catch (e) { return 0; } };
  /* 큰 숫자 하나: 실제로 셀 수 있는 값만 — 발급 배지 → 수료증 → 공개 강좌 수. 모두 0이면 null */
  /* 자랑할 만한 값만(v44 QA): 배지 · 이수증 100 이상, 강좌 10개 이상 — 아니면 블록 전체를 숨긴다 */
  const MIN = { badge: 100, cert: 100, cls: 10 };
  const bigFact = () => { const b = badgeN(); if (b >= MIN.badge) return { v: b, u: '개', l: '지금까지 발급한 디지털 배지', k: 'badge' }; const c = certN(); if (c >= MIN.cert) return { v: c, u: '건', l: '지금까지 발급한 이수증 · 수료증', k: 'cert' }; const n = pubAll().length; return n >= MIN.cls ? { v: n, u: '개', l: `지금 열려 있는 ${term('cls')}`, k: 'cls' } : null; };
  const num = v => (+v).toLocaleString('ko-KR');

  /* ── 사진: 기관이 올린 사진(site.img[slot] · 첫 화면 banner.img) → 시안의 스톡(HPSTOCK) ── */
  const stockRe = /(^|\/)img\/stock\/[a-z]{3}-\d{2}(-800)?\.webp/;
  const DEFPH = { unportal: { hero: 'cam-03', ga: 'lib-02', gb: 'lec-03', gc: 'off-12' }, unfind: { g1: 'cam-05', hero: 'lib-01', g2: 'hum-13', about: 'hum-14' }, univy: { hero: 'hum-12', about: 'hum-13', cta: 'lib-03', quote: 'grp-02' }, unsplit: { hero: 'hum-50', about: 'lap-07' }, unposter: { hero: 'lec-01', about: 'sem-01' }, undark: { hero: 'hum-41', about: 'grp-03', space: 'rob-01' },
    unmag: { hero: 'hum-16', g1: 'cam-08', about: 'hum-10', quote: 'cam-07' }, unblock: { hero: 'hum-46', about: 'hum-51' }, unoverlap: { hero: 'hum-18', about: 'hum-20', cta: 'wrk-01' }, uncine: { hero: 'hum-11', space: 'lib-01', about: 'cor-09' },
    uncollage: { hero: 'stu-02', g1: 'cam-09', g2: 'grp-02', g3: 'hum-38', g4: 'grp-06', about: 'hum-10', quote: 'grp-01' }, unclassic: { hero: 'lib-08', space: 'lec-02', cta: 'lib-02' } };
  const USED = new Set();
  function photo(s, slot, d) { const H = window.HPSTOCK; const off = !!(s && s.stockOff); const m = s && s.img && s.img[slot];
    const own = (src, alt, pos) => src ? { src: String(src), alt: alt || '', pos: pos || '50% 50%', own: !stockRe.test(String(src)) } : null;
    if (m && m.src && !(off && stockRe.test(String(m.src)))) return own(m.src, m.alt, m.pos);
    if (slot === 'hero' && d && d.img && !(off && stockRe.test(String(d.img)))) return own(d.img, d.alt, '');
    if (off || !H) return null; const id = (DEFPH[s.theme] || {})[slot]; const x = id && H.get ? H.get(id) : null; if (!x) return null; USED.add(x.id);
    return { src: H.url(x, slot === 'hero' || slot === 'cta' || slot === 'space' ? '' : 'sm'), srcset: H.srcset ? H.srcset(x) : '', alt: x.alt || '', pos: x.focus || '50% 50%' }; }
  const fig = (p, slot, cls, eager) => p ? `<figure class="hps-img u4-ph ${cls || ''}${p.own === undefined ? ' st' : ''}" data-slot="${E(slot)}"><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="100vw"` : ''} alt="${E(p.alt || '')}" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" style="object-fit:cover;object-position:${E(p.pos || '50% 50%')}"></figure>` : '';
  /* 강좌 사진: 운영자가 지정한 사진 → 강좌 썸네일 → 강좌명에 맞는 스톡(겹치지 않게) */
  const PHM = new Map();
  /* v44.1 A1: 템플릿 × 분야 강좌 사진 세트 — 같은 유형 12종 사이에서 겹치지 않는 6장씩. 강좌명 규칙(HPSTOCK.courseRule)과 맞는 사진이 세트에 있으면 그것부터 */
  const CSET = { uncine: ['hum-04', 'hum-06', 'grp-05', 'hum-39', 'dsk-01', 'hum-01'], unsplit: ['lap-01', 'lap-03', 'lap-05', 'hum-08', 'hum-09', 'lap-09'],
    uncollage: ['hum-37', 'hum-26', 'mus-02', 'coo-01', 'yog-01', 'hum-24'], unclassic: ['lib-05', 'lib-06', 'lib-07', 'doc-01', 'dsk-03', 'cls-04'],
    univy: ['lib-04', 'dsk-09', 'hum-05', 'hum-02', 'sci-01', 'dsk-07'], unposter: ['cls-01', 'cls-03', 'cls-02', 'off-02', 'cor-03', 'cor-07'],
    undark: ['cod-01', 'cod-03', 'hum-07', 'dat-01', 'off-05', 'cor-01'], unmag: ['lan-01', 'lan-02', 'hum-43', 'cor-05', 'off-07', 'hum-45'],
    unblock: ['hum-03', 'off-04', 'cor-02', 'cor-04', 'off-11', 'dsk-04'], unoverlap: ['hum-19', 'wrk-03', 'wrk-05', 'wrk-07', 'hum-17', 'aut-01'],
    unportal: ['off-06', 'cor-06', 'dsk-05', 'lap-02', 'hum-49', 'lap-04'], unfind: ['dsk-06', 'dsk-08', 'lap-06', 'lap-08', 'cor-08', 'off-08'] };
  function clsPh(s, c, i) { const m = s && s.img && s.img['cls-' + c.id]; if (m && m.src) return { src: m.src, alt: m.alt || c.name, pos: m.pos || '50% 50%' };
    if (c.thumb && /^(img\/|https?:|data:image)/.test(c.thumb)) return { src: c.thumb, alt: c.name, pos: '50% 50%' };
    const H = window.HPSTOCK; if (!H || (s && s.stockOff)) return null; if (PHM.has(c.id)) return PHM.get(c.id); let x = null; const ty = (S.org && S.org.type) || 'univ';
    const set = CSET[s && s.theme]; if (set && H.get) { let rule = []; try { const r0 = H.courseRule ? H.courseRule(c.name) : null; rule = (r0 && r0.ids) || []; } catch (e) { }
      const id = set.find(k => rule.includes(k) && !USED.has(k)) || set.find(k => !USED.has(k)); x = id ? H.get(id) : null;
      if (x) { const r = { src: H.url(x, 'sm'), alt: '', pos: x.focus || '50% 50%' }; USED.add(x.id); PHM.set(c.id, r); return r; } }
    try { x = typeof H.forCourse === 'function' ? H.forCourse(ty, c.name, { seed: String(c.id), exclude: [...USED] }) : null; } catch (e) { x = null; }
    if (!x && typeof H.forScene === 'function') { try { x = H.forScene(ty, `${c.name} ${['세미나 토론', '강의실 수업', '도서관 공부', '워크숍 실습'][i % 4]}`, 'card', { seed: c.id + i, exclude: [...USED] }); } catch (e) { x = null; } }
    if (!x && typeof H.pick === 'function') { try { const L = H.pick(['univ', 'card', 'seminar', 'lecture', 'library'], 30, c.id) || []; x = L.find(y => y && !USED.has(y.id)) || null; } catch (e) { x = null; } }
    const r = x ? { src: H.url(x, 'sm'), alt: '', pos: x.focus || '50% 50%' } : null; if (x) USED.add(x.id); PHM.set(c.id, r); return r; }
  const clsFig = (s, c, i, cls) => { const p = clsPh(s, c, i); return p ? `<figure class="hps-img u4-ph ${cls}" data-slot="cls-${E(c.id)}"><img src="${E(p.src)}" alt="${E(p.alt)}" loading="lazy" decoding="async" style="object-fit:cover;object-position:${E(p.pos)}"></figure>` : `<figure class="u4-ph u4-ph0 ${cls}" aria-hidden="true"></figure>`; };

  /* ══ 첫 화면 4종 ══ */
  const btn = (cls, h, l, ar) => l ? `<a class="u4-btn ${cls}" ${lnk(h)}>${E(l)}${ar ? AR : ''}</a>` : '';
  const PRIV = '로그인은 학번 · 학과만 확인해요';
  function heroIvy(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero u4 u4-ivy-h"><div class="u4-w"><p class="u4-kick">${E(d.eyebrow || semester() + ' 비교과 프로그램')}</p><h1>${lines(d.title || org(), true)}</h1>
<div class="u4-ivy-row">${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : '<span></span>'}<div class="u4-btns">${btn('p', p1, d.cta, 1)}${btn('s', p2, d.cta2)}</div></div>
${fig(p, 'hero', 'u4-ivy-ph', 1)}<p class="u4-cap"><span>${E(d.cap || (p && !p.own ? '' : ''))}</span><span>${PRIV}</span></p>${paths(s, d, 'ivy')}</div></section>`; }
  function heroCine(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero u4 u4-cine-h${p ? '' : ' np'}" data-hps-dark="1">${fig(p, 'hero', 'u4-cine-ph', 1)}<i class="u4-scrim" aria-hidden="true"></i><div class="u4-w u4-cine-tx"><p class="u4-eyl">${E(d.eyebrow || semester() + ' 신청이 열렸어요')}</p><h1>${lines(d.title || org())}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}
<div class="u4-btns">${btn('w', p1, d.cta)}${btn('g', p2, d.cta2)}</div></div></section>${paths(s, d, 'bar')}`; }
  function heroCollage(s, d) { const C = pubAll(); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    const G = ['g1', 'g2', 'hero', 'g3', 'g4'].map(k => [k, photo(s, k, k === 'hero' ? d : null)]).filter(x => x[1]);
    return `<section class="hpt hp-hero u4 u4-col-h"><div class="u4-w"><p class="u4-pre">${E(d.eyebrow || (C.length ? `${semester()} · ${term('cls')} ${C.length}개가 열려 있어요` : semester()))}</p><h1>${lines(d.title || org(), true)}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}
<div class="u4-btns">${btn('p', p1, d.cta)}${btn('s', p2, d.cta2)}</div><p class="u4-safe">${PRIV}</p></div>${G.length ? `<div class="u4-colg n${G.length}">${G.map(([k, p], i) => `<div class="c${i + 1}">${fig(p, k === 'hero' ? 'hero' : k, '', 1)}</div>`).join('')}</div>` : ''}</section>`; }
  function heroClassic(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero u4 u4-cls-h${p ? '' : ' np'}">${fig(p, 'hero', 'u4-cls-ph', 1)}<i class="u4-scrim" aria-hidden="true"></i><div class="u4-cls-in"><p class="u4-rule">${E(d.eyebrow || yearSem())}</p><h1>${lines(d.title || org())}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}
<div class="u4-btns">${btn('gold', p1, d.cta)}${btn('g', p2, d.cta2)}</div></div></section>${paths(s, d, 'quick')}`; }

  /* ── v44 신규 첫 화면 6종 ── */
  /* 분할(학사 LMS): 왼쪽 글 · 오른쪽 밝은 사진이 화면 끝까지 */
  function heroSplit(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || '#login'; const p2 = linkHref(d.link2) || '#my';
    return `<section class="hpt hp-hero u4 u4-split-h${p ? '' : ' np'}"><div class="u4-sp-tx"><p class="u4-pre">${E(d.eyebrow || semester() + ' · 온라인 강의실')}</p><h1>${lines(d.title || org(), true)}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns">${btn('p', p1, d.cta, 1)}${btn('s', p2, d.cta2)}</div><p class="u4-safe">${PRIV}</p></div>${fig(p, 'hero', 'u4-sp-ph', 1)}</section>`; }
  /* 포스터(교수학습지원센터): 기관 색 전면 · 아주 큰 글자 · 오른쪽 아래 사진 한 장 */
  function heroPoster(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero u4 u4-poster-h"><div class="u4-w"><p class="u4-mark">${E(d.mark || 'TEACHING & LEARNING')}<span>${E(d.eyebrow || semester())}</span></p><h1>${lines(d.title || org())}</h1><div class="u4-po-row"><div>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns">${btn('ink', p1, d.cta, 1)}${btn('line', p2, d.cta2)}</div><p class="u4-safe">${PRIV}</p></div>${fig(p, 'hero', 'u4-po-ph', 1)}</div></div></section>`; }
  /* 다크 시네마틱(산학 · 창업): 검은 바탕 · 가운데 큰 제목(빛나는 기관 색) · 아래 넓은 사진 */
  function heroDark(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || href.ask(s);
    return `<section class="hpt hp-hero u4 u4-dark-h"><i class="u4-glow" aria-hidden="true"></i><div class="u4-w"><p class="u4-pill">${E(d.eyebrow || '산학 협력 · 창업 지원')}</p><h1>${lines(d.title || org(), true)}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns c">${btn('p', p1, d.cta, 1)}${btn('g', p2, d.cta2)}</div>${fig(p, 'hero', 'u4-dk-ph', 1)}</div></section>`; }
  /* 잡지 표지(국제 · 어학원): 왼쪽 표지 글 · 오른쪽 높이가 다른 사진 두 장 */
  function heroMag(s, d) { const p = photo(s, 'hero', d); const q = photo(s, 'g1'); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero u4 u4-mag-h"><div class="u4-w u4-mg-g"><div class="u4-mg-tx"><p class="u4-issue"><b>${E(d.mark || 'GLOBAL CAMPUS')}</b><span>${E(d.eyebrow || semester())}</span></p><h1>${lines(d.title || org(), true)}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns">${btn('p', p1, d.cta, 1)}${btn('s', p2, d.cta2)}</div></div>
<div class="u4-mg-ph${q ? '' : ' one'}">${fig(p, 'hero', 'a', 1)}${fig(q, 'g1', 'b', 1)}${d.cap ? `<p class="u4-mg-cap">${E(d.cap)}</p>` : ''}</div></div></section>`; }
  /* 색 블록(취업 · 진로): 위 기관 색 블록 · 큰 흰 제목 · 오른쪽에 걸쳐 내려오는 세로 사진 */
  function heroBlock(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero u4 u4-block-h${p ? '' : ' np'}"><div class="u4-bk-band"><div class="u4-w u4-bk-g"><div class="u4-bk-tx"><p class="u4-eyl">${E(d.eyebrow || '취업 · 진로 지원')}</p><h1>${lines(d.title || org())}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns">${btn('w', p1, d.cta, 1)}${btn('g', p2, d.cta2)}</div></div>${fig(p, 'hero', 'u4-bk-ph', 1)}</div></div></section>`; }
  /* 사진 + 겹친 카드(전문대 · 실무): 위 넓은 현장 사진 · 왼쪽 아래 흰 카드가 사진에 걸침 */
  function heroOverlap(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero u4 u4-over-h${p ? '' : ' np'}">${fig(p, 'hero', 'u4-ov-ph', 1)}<div class="u4-w"><div class="u4-ov-card"><p class="u4-pre">${E(d.eyebrow || '현장 실무 · ' + semester())}</p><h1>${lines(d.title || org(), true)}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns">${btn('p', p1, d.cta, 1)}${btn('s', p2, d.cta2)}</div></div></div></section>`; }

  /* ── v44.1 학사용 2종(대학 본부 홈페이지 벤치마크: REFERENCES-v441.md) ── */
  const QI = { book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0', screen: 'M3 4h18v12H3zM8 20h8M12 16v4', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a7 7 0 0114 0v1', award: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.5 14L7 21l5-3 5 3-1.5-7' };
  const qi = k => `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${QI[k] || QI.book}"/></svg>`;
  const QUICK = s => [['book', `${term('cls') === '강좌' ? '수강' : term('cls')} 신청`, href.cls(s)], ['cal', '학사 일정', '#cal'], ['bell', '공지사항', href.notice(s)], ['screen', '내 강의실', '#my'], ['user', '학번 로그인', '#login'], ['award', '이수 · 배지', '#badges']];
  /* 본부 포털: 왼쪽 넓은 캠퍼스 사진 · 오른쪽 기관 색 패널 + 사진 아래 아이콘 빠른 메뉴 한 줄 */
  function heroPortal(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero u4 u4-portal-h${p ? '' : ' np'}"><div class="u4-pt-g">${fig(p, 'hero', 'u4-pt-ph', 1)}<div class="u4-pt-pn"><p class="u4-pre">${E(d.eyebrow || yearSem())}</p><h1>${lines(d.title || org())}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns">${btn('w', p1, d.cta, 1)}${btn('g', p2, d.cta2)}</div><p class="u4-safe">${PRIV}</p></div></div>
<nav class="u4-quickm" aria-label="자주 찾는 학사 메뉴"><div class="u4-w">${QUICK(s).map(([k, l, h]) => `<a ${lnk(h)}><i>${qi(k)}</i><span>${E(l)}</span></a>`).join('')}</div></nav></section>`; }
  /* 학사 길잡이: 가운데 질문형 큰 제목 · 큰 링크 4개 · 넓은 사진 3분할 */
  function heroFind(s, d) { const p1 = linkHref(d.link) || '#login'; const p2 = linkHref(d.link2) || '#cal'; const Q = QUICK(s); const L = [Q[0], Q[1], Q[2], Q[3]];
    const G = [['g1', photo(s, 'g1')], ['hero', photo(s, 'hero', d)], ['g2', photo(s, 'g2')]].filter(x => x[1]);
    return `<section class="hpt hp-hero u4 u4-find-h"><div class="u4-w"><p class="u4-pre">${E(d.eyebrow || yearSem() + ' 학사 안내')}</p><h1>${lines(d.title || org(), true)}</h1>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns c">${btn('p', p1, d.cta)}${btn('s', p2, d.cta2)}</div>
<nav class="u4-findl" aria-label="학사 바로 가기">${L.map(([k, l, h]) => `<a ${lnk(h)}><i>${qi(k)}</i><b>${E(l)}</b><em aria-hidden="true">→</em></a>`).join('')}</nav><p class="u4-safe">${PRIV}</p></div>${G.length ? `<div class="u4-tri n${G.length}">${G.map(([k, p]) => fig(p, k, '', 1)).join('')}</div>` : ''}</section>`; }
  /* ── v44.1 대학 B: 빠른 링크(6~8) · 학사 일정 가로 띠 · 뉴스 3열 ── */
  const okExt = u => /^(https:\/\/[^\s"'<>]+|tel:\+?[\d-]+|mailto:[^\s"'<>]+)$/.test(String(u || ''));
  /* 빠른 링크: 기본 6개(실제 학습자 경로) + 운영자가 넣은 외부 링크(도서관 · 장학 · 증명서 등, https만, 비면 없음) 최대 8개 */
  function quick(s, d) { const X = (Array.isArray(d.extra) ? d.extra : []).filter(r => r && r[0] && okExt(r[1])).slice(0, 2).map(r => ['book', String(r[0]), String(r[1])]); const L = [...QUICK(s), ...X].slice(0, 8);
    return `<nav class="hpt hp-s u4 u4-quick" aria-label="자주 찾는 학사 메뉴"><div class="u4-quickm n${L.length}"><div class="u4-w">${L.map(([k, l, h]) => `<a ${lnk(h)}><i>${qi(k)}</i><span>${E(l)}</span></a>`).join('')}</div></div></nav>`; }
  /* 학사 일정 가로 띠: 학습자에게 보이는 기관 일정 + 모집 마감 · 개강(앞으로 60일), 2건 미만이면 숨김 */
  function calband(s, d) { const V = events(6); if (V.length < 2) return ''; const T0 = tday();
    return `<section class="hpt hp-s u4 u4-calband"><div class="u4-w"><div class="u4-hrow">${sh(d, { ey: '', t: '다가오는 학사 일정' })}<a class="u4-more" href="#cal">전체 일정${AR}</a></div><ol class="u4-cb">${V.map(v => { const n = days(T0, v.date); return `<li><a href="#cal"><time datetime="${E(v.date)}"><b>${+v.date.slice(5, 7)}.${v.date.slice(8, 10)}</b><small>${WD[dd(v.date).getDay()]}요일${n === 0 ? ' · 오늘' : ''}</small></time><span><em>${E(v.kind || '학사')}</em><b>${E(v.title)}</b></span></a></li>`; }).join('')}</ol></div></section>`; }
  /* 뉴스 3열: 공지 · 강좌 소식 3건을 기사 카드로(2건 미만이면 숨김) */
  function news(s, d) { const N = notices(3); if (N.length < 2) return ''; const h = href.notice(s);
    return `<section class="hpt hp-s u4 u4-news"><div class="u4-w"><div class="u4-hrow">${sh(d, { ey: '', t: '학교 소식' })}<a class="u4-more" ${lnk(h)}>소식 더 보기${AR}</a></div><ul class="u4-nw n${N.length}">${N.map((x, i) => `<li><a ${lnk(h)}><span class="tg">${x.top ? '중요' : i === 0 ? '새 소식' : '공지'}</span><b>${E(x.title)}</b>${x.at ? `<time>${E(String(x.at).slice(0, 10).replace(/-/g, '. '))}.</time>` : ''}<em>자세히 보기 →</em></a></li>`).join('')}</ul></div></section>`; }

  /* 캠퍼스 사진 3장(설명 한 줄) */
  function gallery(s, d) { const C = Array.isArray(d.cols) && d.cols.length ? d.cols : [['도서관', '시험 기간에도 자리가 넉넉해요'], ['강의실', '토론과 발표가 쉬운 모둠 강의실'], ['라운지', '수업 사이에 쉬어 가는 곳']]; const G = ['ga', 'gb', 'gc'].map((k, i) => [k, photo(s, k), C[i] || ['', '']]).filter(x => x[1]); if (!G.length) return '';
    return `<section class="hpt hp-s u4 u4-gallery"><div class="u4-w">${sh(d, { ey: '', t: '캠퍼스 생활' })}<ul class="u4-gal n${G.length}">${G.map(([k, p, c]) => `<li>${fig(p, k, '')}<b>${E(c[0])}</b><small>${E(c[1] || '')}</small></li>`).join('')}</ul></div></section>`; }

  /* ── 방문자별 바로 가기(첫 화면 아래 한 줄) ── */
  const WHO = [['재학생', '비교과 신청하기', '비교과 신청 · 이수 확인'], ['신입생', '처음 로그인하기', '처음 로그인 · 먼저 들을 과정'], ['교수자', '수업 공지 보기', '수업 운영 · 공지'], ['산학 · 지역', '열린 강좌 보기', '열린 강좌 · 협력 문의']];
  function paths(s, d, view) { const W = (Array.isArray(d.who) && d.who.length === 4 ? d.who : WHO).map((r, k) => [0, 1, 2].map(j => String((r && r[j]) || WHO[k][j])));
    const H = [href.cls(s), '#login', href.notice(s), href.cls(s)];
    if (view === 'ivy') return `<nav class="u4-paths" aria-label="방문 목적별 바로 가기">${W.map((r, k) => `<a ${lnk(H[k])}><small>${E(r[0])}이라면</small><b>${E(r[1])}<i aria-hidden="true">→</i></b></a>`).join('')}</nav>`;
    if (view === 'bar') return `<nav class="hpt u4 u4-bar" aria-label="방문 목적별 바로 가기"><div class="u4-w">${W.map((r, k) => `<a ${lnk(H[k])}><b>${E(r[0])}<i aria-hidden="true">→</i></b><small>${E(r[2])}</small></a>`).join('')}</div></nav>`;
    if (view === 'quick') return `<nav class="hpt u4 u4-quick" aria-label="방문 목적별 바로 가기"><div class="u4-w">${W.map((r, k) => `<a ${lnk(H[k])}><b>${E(r[0])}</b><small>${E(r[2])}</small></a>`).join('')}</div></nav>`;
    return `<div class="u4-who"><span class="q">${E(d.pre || '저는')}</span>${W.map((r, k) => `<a ${lnk(H[k])}>${E(r[0] === '산학 · 지역' ? '산학 · 지역 방문자' : r[0])}<i aria-hidden="true">→</i></a>`).join('')}<span class="q e">${E(d.post || '예요')}</span></div>`; }
  function who(s, d) { return `<section class="hpt hp-s u4 u4-whos"><div class="u4-w">${paths(s, d, 'line')}</div></section>`; }

  /* ══ 섹션 부품(text 섹션 data.hpt) ══ */
  const sh = (d, def, cls) => `<div class="u4-sh ${cls || ''}">${d.eyebrow !== '' ? `<p class="u4-lab">${E(d.eyebrow || def.ey || '')}</p>` : ''}<h2>${lines(d.title || def.t)}</h2>${(d.sub || def.sub) ? `<p class="u4-lead">${E(d.sub || def.sub)}</p>` : ''}</div>`;
  /* 이야기 2열(에디토리얼): 글 + 실제 수치 2개 + 사진 */
  function story(s, d) { const C = pubAll(); const F = [C.length >= MIN.cls ? [num(C.length) + '개', `지금 열려 있는 ${term('cls')}`] : null, badgeN() >= MIN.badge ? [num(badgeN()) + '개', '발급한 디지털 배지'] : certN() >= MIN.cert ? [num(certN()) + '건', '발급한 이수증'] : null].filter(Boolean);
    const p = photo(s, 'about');
    return `<section class="hpt hp-s u4 u4-story"><div class="u4-w u4-g2"><div>${sh(d, { ey: '왜 비교과인가요', t: '졸업장에 적히지 않는\n네 해의 기록을 남겨요.', sub: '' })}${d.body ? `<p class="u4-body">${E(d.body)}</p>` : ''}${F.length ? `<dl class="u4-facts">${F.map(([v, l]) => `<div><dt>${E(l)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>` : ''}</div>${fig(p, 'about', 'u4-story-ph')}</div></section>`; }
  /* 단계(취업 · 창업 · 교수학습 · 실무): 큰 번호 4단계 + 선 — 운영자가 바꾸는 문구 */
  function steps(s, d) { const St = (Array.isArray(d.cols) && d.cols.length ? d.cols : [['신청', ''], ['참여', ''], ['이수', ''], ['확인', '']]).slice(0, 4); const go = d.cta ? `<div class="u4-btns">${btn('p', (/^#(cal|notice|login|my)$/.test(d.go || '') ? d.go : '') || linkHref(d.link) || href.cls(s), d.cta)}</div>` : '';
    return `<section class="hpt hp-s u4 u4-steps v-${E(d.view || 'line')}"><div class="u4-w"><div class="u4-hrow">${sh(d, { ey: '', t: '이렇게 진행돼요' })}${go}</div><ol class="u4-st n${St.length}">${St.map((r, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</li>`).join('')}</ol></div></section>`; }

  /* 강좌: index(목차 목록) · tall(세로 사진 카드) · card(사진 위 · 글 아래) · frame(테두리 카드, 가운데 정렬) */
  function cls(s, d) { const L = sortCls(pubAll()).slice(0, Math.max(3, Math.min(6, +d.n || (d.view === 'index' || d.view === 'row' || d.view === 'wide' ? 4 : 3)))); if (!L.length) return ''; const v = d.view || 'card';
    const all = `<a class="u4-more" ${lnk(href.cls(s))}>${E(d.more || `전체 ${pubAll().length}개 보기`)}${AR}</a>`;
    const head = v === 'frame' ? sh(d, { ey: 'PROGRAMS', t: `이번 학기 ${term('cls')}`, sub: '마감이 가까운 순서로 안내해요.' }, 'c') : `<div class="u4-hrow">${sh(d, { ey: v === 'index' ? '이번 학기 프로그램' : '', t: v === 'tall' ? '이번 학기,\n이런 걸 배워요.' : '지금 신청할 수 있어요', sub: v === 'card' ? '마감이 가까운 순서로 보여 드려요.' : '' })}${all}</div>`;
    let body = '';
    if (v === 'index') body = `<ol class="u4-idx">${L.map((c, i) => { const st = stOf(c); const m = metaOf(c); const ds = descOf(c); return `<li><a ${lnk('#p-c-' + c.id)}><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="tt"><b>${E(c.name)}</b>${ds ? `<small>${E(ds)}</small>` : ''}</span><span class="mt"><b>${E(st.t)}</b>${m ? `<small>${E(m)}</small>` : ''}</span>${clsFig(s, c, i, 'th')}<i class="go" aria-hidden="true">→</i></a></li>`; }).join('')}</ol>`;
    else if (v === 'tall') body = `<ul class="u4-tall">${L.map((c, i) => { const st = stOf(c); const k = kw(c.name); const m = metaOf(c); return `<li><a ${lnk('#p-c-' + c.id)}>${clsFig(s, c, i, '')}<span class="tx"><small class="k">${E([k.tag, st.t].filter(Boolean).join(' · '))}</small><b>${E(k.l)}</b>${m ? `<small>${E(m)}</small>` : ''}</span></a></li>`; }).join('')}</ul>`;
    else if (v === 'frame') body = `<ul class="u4-frame">${L.map((c, i) => { const st = stOf(c); const k = kw(c.name); const m = metaOf(c); return `<li><a ${lnk('#p-c-' + c.id)}>${clsFig(s, c, i, '')}<span class="tx"><small class="k">${E([k.tag, st.t].filter(Boolean).join(' · '))}</small><b>${E(k.l)}</b>${m ? `<small>${E(m)}</small>` : ''}</span></a></li>`; }).join('')}</ul><div class="u4-ctr">${all}</div>`;
    else if (v === 'row') body = `<ul class="u4-row">${L.map(c => { const st = stOf(c); const k = kw(c.name); const per = [okD(c.start) ? mdS(c.start) : '', okD(c.end) ? mdS(c.end) : ''].filter(Boolean).join(' – '); const m = metaOf(c); return `<li><a ${lnk('#p-c-' + c.id)}><span class="nm">${k.tag ? `<small>${E(k.tag)}</small>` : ''}<b>${E(k.l)}</b></span><span class="pd"><small>수업 기간</small><b>${E(per || '상시')}</b></span><span class="mt"><small>${E(m || term('cls'))}</small><b class="${st.k === 0 ? 'hot' : ''}">${E(st.t)}</b></span><i aria-hidden="true">→</i></a></li>`; }).join('')}</ul>`;
    else if (v === 'wide') body = `<ul class="u4-wide">${L.slice(0, 4).map((c, i) => { const st = stOf(c); const k = kw(c.name); const m = metaOf(c); const ds = descOf(c); return `<li><a ${lnk('#p-c-' + c.id)}>${clsFig(s, c, i, '')}<span class="tx"><small class="k">${E([k.tag, st.t].filter(Boolean).join(' · '))}</small><b>${E(k.l)}</b>${ds ? `<small>${E(ds)}</small>` : m ? `<small>${E(m)}</small>` : ''}<em>자세히 보기 →</em></span></a></li>`; }).join('')}</ul>`;
    else body = `<ul class="u4-card">${L.map((c, i) => { const st = stOf(c); const k = kw(c.name); const m = metaOf(c); return `<li><a ${lnk('#p-c-' + c.id)}>${clsFig(s, c, i, '')}<span class="mt"><small>${E(k.tag || term('cls'))}</small><small class="${st.k === 0 ? 'hot' : ''}">${E(st.t)}</small></span><b>${E(k.l)}</b>${m ? `<small class="m">${E(m)}</small>` : ''}</a></li>`; }).join('')}</ul>`;
    return `<section class="hpt hp-s u4 u4-cls v-${E(v)}"><div class="u4-w">${head}${body}</div></section>`; }
  /* 큰 숫자 하나: brand(기관 색 전면 · 에디토리얼) · mist(가운데 · 시네마틱) */
  function big(s, d) { const f = bigFact(); if (!f) return ''; const v = d.view || 'brand'; const go = f.k === 'cls' ? [href.cls(s), `${term('cls')} 둘러보기`] : ['#badges', '내 배지 확인하기'];
    if (v === 'mist') return `<section class="hpt hp-s u4 u4-big mist"><div class="u4-w"><p class="u4-lab">${E(d.eyebrow || f.l)}</p><p class="u4-num">${num(f.v)}<span>${E(f.u)}</span></p>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}<div class="u4-btns c">${btn('p', go[0], go[1])}</div></div></section>`;
    return `<section class="hpt hp-s u4 u4-big brand"><div class="u4-w u4-g2b"><div><p class="u4-lab">${E(d.eyebrow || '이수 · 디지털 배지')}</p><p class="u4-num">${num(f.v)}<span>${E(f.u)}</span></p></div><div><p class="u4-lead">${E(f.l)}${f.k === 'badge' ? '예요. 배지마다 무엇을 배웠는지 적혀 있어서, 링크 하나로 이력서에 붙일 수 있어요.' : f.k === 'cert' ? '이에요. 내 학습 화면에서 바로 확인하고 내려받을 수 있어요.' : '예요. 마감이 가까운 순서로 골라 보세요.'}</p><a class="u4-ul" ${lnk(go[0])}>${E(go[1])}${AR}</a></div></div></section>`; }
  /* 인용 한 문장(운영자가 쓰는 기관의 한마디) */
  function quote(s, d) { const q = String(d.quote || '').trim(); if (!q) return ''; const v = d.view || 'photo'; const p = v === 'center' ? null : photo(s, 'quote');
    const cite = d.by || `${org()}`;
    return `<section class="hpt hp-s u4 u4-quote v-${E(v)}"><div class="u4-w${p ? ' u4-gq' : ''}">${p ? fig(p, 'quote', 'u4-q-ph') : ''}<figure class="u4-q"><blockquote>${E(q)}</blockquote><figcaption>${E(cite)}</figcaption></figure></div></section>`; }
  /* 학사 일정 + 공지: text(두 단 글 목록) · cols3(공지 · 일정 · 다가오는 프로그램) */
  function board(s, d) { const V = events(d.view === 'cols3' ? 3 : 3); const N = notices(4); const v = d.view || 'text'; const nxt = v === 'cols3' ? sortCls(pubAll()).find(c => stOf(c).k <= 2) : null; if (!V.length && !N.length && !nxt) return '';
    const T0 = tday(); const date = x => String(x.at || '').slice(0, 10).replace(/-/g, '. ') + (x.at ? '.' : '');
    const cal = V.length ? `<div class="bcol bcal"><h3>${E(d.title || '학사 일정')}<a href="#cal">전체 일정${AR}</a></h3><ul>${V.map(x => `<li><a href="#cal"><time datetime="${E(x.date)}">${v === 'cols3' ? `<small>${+x.date.slice(5, 7)}월</small><b>${+x.date.slice(8, 10)}</b>` : `<b>${E(mdS(x.date))}</b>`}</time><span><b>${E(x.title)}</b><small>${E(x.kind)} · ${days(T0, x.date) === 0 ? '오늘' : `${WD[dd(x.date).getDay()]}요일`}</small></span></a></li>`).join('')}</ul></div>` : '';
    const nt = N.length ? `<div class="bcol bnt"><h3>${E(d.title2 || '공지사항')}<a ${lnk(href.notice(s))}>전체 보기${AR}</a></h3><ul>${N.map(x => `<li><a ${lnk(href.notice(s))}><span><b>${x.top ? '<em>중요</em>' : ''}${E(x.title)}</b>${x.at ? `<small>${E(date(x))}</small>` : ''}</span></a></li>`).join('')}</ul></div>` : '';
    const ev = nxt ? `<div class="bcol bev"><h3>${E(d.title3 || '다가오는 프로그램')}<a ${lnk(href.cls(s))}>더 보기${AR}</a></h3><a class="evc" ${lnk('#p-c-' + nxt.id)}>${fig(photo(s, 'space'), 'space', 'evp')}<b>${E(nxt.name)}</b><small>${E([stOf(nxt).t, metaOf(nxt)].filter(Boolean).join(' · '))}</small></a></div>` : '';
    const cols = v === 'cols3' ? [nt, cal, ev] : v === 'portal' ? [nt, cal] : [cal, nt]; const n = cols.filter(Boolean).length;
    return `<section class="hpt hp-s u4 u4-board v-${E(v)}"><div class="u4-w">${v === 'cols3' ? sh(d.sh || {}, { ey: 'NEWS & CALENDAR', t: '학사 소식' }, 'c') : ''}<div class="u4-bg n${n}">${cols.join('')}</div></div></section>`; }
  /* 사진 띠(시네마틱): 온라인 강의실 소개 — 제품 기능 문구(숫자 아님) */
  function band(s, d) { const p = photo(s, 'space'); const F = Array.isArray(d.cols) && d.cols.length ? d.cols : [['24시간', '언제든 수강'], ['이어 보기', '멈춘 곳부터'], ['바로 발급', '이수증 · 배지']];
    return `<section class="hpt hp-s u4 u4-band${p ? '' : ' np'}">${fig(p, 'space', 'u4-band-ph')}<i class="u4-scrim" aria-hidden="true"></i><div class="u4-w"><h2>${lines(d.title || '강의실 문이 닫혀도,\n수업은 계속돼요.')}</h2><p class="u4-lead">${E(d.sub || '강의 영상, 과제, 퀴즈, 질문 게시판이 하나의 온라인 강의실에 있어요. 도서관에서도, 집 가는 길에서도 이어서 들어요.')}</p><ul>${F.slice(0, 3).map(r => `<li><b>${E(r[0])}</b>${E(r[1] || '')}</li>`).join('')}</ul><div class="u4-btns">${btn('w', '#login', d.cta || '내 강의실 들어가기')}</div></div></section>`; }
  /* 열린 강좌 · 문의 · 오시는 길(시네마틱) */
  function open(s, d) { const K = contact(); const C = pubAll(); const p = photo(s, 'about');
    const L = [C.length ? [href.cls(s), `${d.l1 || '열린 강좌 둘러보기'}`, `${term('cls')} ${C.length}개`] : null, K.tel ? ['tel:' + K.tel.replace(/[^\d+]/g, ''), '산학 협력 · 수강 문의', K.tel] : K.em ? ['mailto:' + K.em, '산학 협력 · 수강 문의', K.em] : null, K.addr ? [`https://map.naver.com/p/search/${encodeURIComponent(K.addr)}`, '오시는 길', K.addr] : null].filter(Boolean); if (!L.length) return '';
    return `<section class="hpt hp-s u4 u4-open"><div class="u4-w u4-g2${p ? '' : ' one'}">${fig(p, 'about', 'u4-open-ph')}<div>${sh(d, { ey: '', t: '학교 문은\n지역에도 열려 있어요.', sub: '지역 주민과 협력 기관을 위한 열린 강좌를 운영해요. 학생이 아니어도 신청할 수 있어요.' })}<ul class="u4-links">${L.map(([h, l, sub]) => `<li><a ${lnk(h)}><span><b>${E(l)}</b><small>${E(sub)}</small></span><i aria-hidden="true">→</i></a></li>`).join('')}</ul></div></div></section>`; }
  /* 강의실 3단계(콜라주) */
  function lms(s, d) { const p = photo(s, 'about'); const St = Array.isArray(d.cols) && d.cols.length ? d.cols : [['강의 듣기', '멈춘 곳부터 이어서, 휴대폰에서도 그대로'], ['과제 · 퀴즈 내기', '마감 전에 알림을 보내 드려요'], ['이수 확인', '기준을 채우면 이수증이 바로 나와요']];
    return `<section class="hpt hp-s u4 u4-lms"><div class="u4-w u4-g2${p ? '' : ' one'}"><div>${sh(d, { ey: '', t: '신청하고 나면,\n나머지는 한 화면에서.', sub: '온라인 강의실에서 듣고, 내고, 확인해요. 따로 찾아다닐 곳이 없어요.' })}<ol class="u4-steps">${St.slice(0, 4).map((r, i) => `<li><span class="n">0${i + 1}</span><span><b>${E(r[0])}</b><small>${E(r[1] || '')}</small></span></li>`).join('')}</ol></div>${fig(p, 'about', 'u4-lms-ph')}</div></section>`; }
  /* 배지 메달 + 큰 숫자(콜라주) — 배지가 정해져 있을 때만 */
  function medal(s, d) { const B = badgeList(); if (!B.length) return ''; const b = B[0]; const n0 = badgeN(); const n = n0 >= MIN.badge ? n0 : 0;
    return `<section class="hpt hp-s u4 u4-medal"><div class="u4-w u4-g2"><div class="md" aria-hidden="true"><i class="ring"></i><span class="core"><small>${E(org())} 디지털 배지</small><b>${E(b.name)}</b><small>${E(semester())}</small></span><em class="tag">링크로 공유</em></div><div>${sh(d, { ey: '', t: '배운 만큼,\n배지로 남아요.' })}${n ? `<p class="u4-num">${num(n)}<span>개</span></p><p class="u4-lead">지금까지 발급한 디지털 배지예요. 링크 하나로 이력서와 포트폴리오에 붙일 수 있어요.</p>` : `<p class="u4-lead">이수 기준을 채우면 디지털 배지가 발급돼요. 링크 하나로 이력서와 포트폴리오에 붙일 수 있어요.</p>`}<div class="u4-btns">${btn('p', '#badges', '내 배지 확인하기')}</div></div></div></section>`; }
  /* 교육 이념 + 실제 수치(전통) */
  function motto(s, d) { const q = String(d.quote || '').trim(); const C = pubAll().length; const F = [String(d.since || '').trim() ? [String(d.since).trim(), '개교'] : null, C >= MIN.cls ? [num(C), `이번 학기 ${term('cls')}`] : null, badgeN() >= MIN.badge ? [num(badgeN()), '발급한 배지'] : certN() >= MIN.cert ? [num(certN()), '발급한 이수증'] : null].filter(Boolean); if (!q && !F.length) return '';
    return `<section class="hpt hp-s u4 u4-motto">${CREST('bg')}<div class="u4-w"><p class="u4-rule">${E(d.eyebrow || '교육 이념')}</p>${q ? `<p class="big">“${E(q)}”</p>` : ''}${F.length ? `<dl class="since">${F.map(([v, l]) => `<div><dt>${E(l)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>` : ''}</div></section>`; }
  /* 마지막 행동: photo(사진 위 · 에디토리얼) · navy(가운데 · 시네마틱) · center(가운데 + 연락처 · 콜라주) · split(사진 + 연락처 · 전통) */
  function close(s, d) { const v = d.view || 'center'; const K = contact(); const p1 = href.cls(s); const ask = href.ask(s);
    const b1 = btn(v === 'navy' ? 'sun' : v === 'split' ? 'p' : 'p', p1, d.cta || `${term('cls')} 둘러보기`), b2 = btn(v === 'center' || v === 'split' ? 's' : 'g', v === 'navy' || v === 'center' ? '#login' : ask, d.cta2 || (v === 'navy' || v === 'center' ? '학번으로 로그인' : '협력 · 수강 문의'));
    const ttl = `<h2>${lines(d.title || '이번 학기,\n하나만 골라 보세요.')}</h2>${d.sub ? `<p class="u4-lead">${E(d.sub)}</p>` : ''}`;
    if (v === 'photo') { const p = photo(s, 'cta'); return `<section class="hpt hp-s u4 u4-close v-photo"><div class="u4-w"><div class="box${p ? '' : ' np'}">${fig(p, 'cta', 'u4-close-ph')}<i class="u4-scrim" aria-hidden="true"></i><div class="in">${ttl}<div class="u4-btns">${b1}${b2}</div></div></div></div></section>`; }
    if (v === 'navy') return `<section class="hpt hp-s u4 u4-close v-navy"><div class="u4-w">${ttl}<div class="u4-btns c">${b1}${b2}</div><p class="u4-note">${PRIV}. 휴대폰 번호는 받지 않아요.</p></div></section>`;
    const rows = [K.tel ? ['수강 · 이수 문의', K.tel, 'tel:' + K.tel.replace(/[^\d+]/g, '')] : null, K.em ? ['산학 협력 · 열린 강좌', K.em, 'mailto:' + K.em] : null, K.addr ? ['오시는 길', K.addr, ''] : null].filter(Boolean);
    if (v === 'split') { const p = photo(s, 'cta'); return `<section class="hpt hp-s u4 u4-close v-split"><div class="u4-w"><div class="box${p ? '' : ' one'}">${fig(p, 'cta', 'u4-close-ph')}<div class="in">${ttl}<div class="u4-btns">${b1}${b2}</div>${rows.length ? `<dl>${rows.map(([l, v2, h]) => `<div><dt>${E(l)}</dt><dd>${h ? `<a ${lnk(h)}>${E(v2)}</a>` : E(v2)}</dd></div>`).join('')}</dl>` : ''}</div></div></div></section>`; }
    return `<section class="hpt hp-s u4 u4-close v-center"><div class="u4-w">${ttl}<div class="u4-btns c">${b1}${b2}</div>${rows.length ? `<dl class="ct">${rows.map(([l, v2, h]) => `<div><dt>${E(l)}</dt><dd>${h ? `<a ${lnk(h)}>${E(v2)}</a>` : E(v2)}</dd></div>`).join('')}</dl>` : ''}</div></section>`; }
  const CREST = cls => `<svg class="u4-crest ${cls || ''}" viewBox="0 0 58 66" aria-hidden="true" focusable="false"><path d="M29 2 L55 10 V32 C55 48 43 59 29 64 C15 59 3 48 3 32 V10 Z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M29 8 L49 14 V32 C49 44 40 53 29 57 C18 53 9 44 9 32 V14 Z" fill="currentColor" opacity=".16"/><path d="M15 36 c5-4 9-4 14 0 s9 4 14 0 M15 43 c5-4 9-4 14 0 s9 4 14 0" fill="none" stroke="currentColor" stroke-width="2"/><path d="M22 28 V19 l7-3 7 3 v9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="29" cy="23" r="2" fill="currentColor"/></svg>`;

  const R = { 'u4-quick': quick, 'u4-calband': calband, 'u4-news': news, 'u4-gallery': gallery, 'u4-steps': steps, 'u4-who': who, 'u4-story': story, 'u4-cls': cls, 'u4-big': big, 'u4-quote': quote, 'u4-board': board, 'u4-band': band, 'u4-open': open, 'u4-lms': lms, 'u4-medal': medal, 'u4-motto': motto, 'u4-close': close };
  const HERO = { unportal: heroPortal, unfind: heroFind, univy: heroIvy, uncine: heroCine, uncollage: heroCollage, unclassic: heroClassic, unsplit: heroSplit, unposter: heroPoster, undark: heroDark, unmag: heroMag, unblock: heroBlock, unoverlap: heroOverlap };
  HPT.hp44Univ = { R, HERO, bigFact, events, notices, stOf }; /* 테스트용 */

  { const b0 = proSec; proSec = (x, i, s, lk) => {
    const d = (x && x.data) || {}; const isPart = x && x.type === 'text' && R[d.hpt]; const isHero = x && x.type === 'banner' && mine(s) && !(+d.dstyle);
    if (!isPart && !isHero) return b0(x, i, s, lk);
    if (x.hide && !editing()) return '';
    if (i === 0) { try { b0(x, i, s, lk); } catch (e) { } }
    let h = ''; try { h = isHero ? HERO[s.theme](s, d) : R[d.hpt](s, d); } catch (e) { console.error('hp44-univ', d.hpt || 'hero', e); return b0(x, i, s, lk); }
    if (!h) return editing() ? b0(x, i, s, lk) : '';
    const m = editing() ? HPE.map.get(x) : null;
    if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; window.proSec = proSec; }

  /* ── 머리글 · 바닥글 종류: 운영자가 직접 고르지 않았으면 시안의 구성 ── */
  const CH = { unportal: ['util', 'biz'], unfind: ['solid', 'min'], univy: ['solid', 'min'], uncine: ['overlay', 'min'], uncollage: ['solid', 'min'], unclassic: ['center', 'campus'], unsplit: ['solid', 'min'], unposter: ['solid', 'min'], undark: ['solid', 'min'], unmag: ['solid', 'min'], unblock: ['solid', 'min'], unoverlap: ['solid', 'min'] };

  /* ══ CSS ══ */
  const CORE = `
.u4{--sp:var(--uv-sec,140px);box-sizing:border-box}.u4 small{font-size:inherit}.u4 *{box-sizing:border-box}
.u4 .u4-w{max-width:1200px;margin:0 auto;padding:0 40px}
body .hpt.u4.hp-s{padding:var(--sp) 0;margin:0;background:transparent}body .hpt.u4.hp-s.u4-big.brand,body .hpt.u4.hp-s.u4-motto{background:var(--u-a)}body .hpt.u4.hp-s.u4-big.mist,body .hpt.u4.hp-s.u4-lms,body .hpt.u4.hp-s.u4-cls.v-index{background:var(--u-bg2)}body .hpt.u4.hp-s.u4-close.v-navy{background:var(--u-adk)}body .hpt.u4.hp-s.u4-quote.v-brand{background:var(--u-a)}body .hpt.u4.hp-s.u4-band{background:var(--u-adk);padding:0}body .hpt.u4.hp-s.u4-whos{padding:88px 0 0}body .hpt.u4.hp-s.u4-big.brand{padding:170px 0}body .hpt.u4.hp-s.u4-motto{padding:150px 0}body .hpt.u4.hp-s.u4-cls.v-frame{background:#fff;border-top:1px solid var(--u-line);border-bottom:1px solid var(--u-line)}
.u4 h1,.u4 h2,.u4 h3,.u4 p,.u4 ul,.u4 ol,.u4 dl,.u4 dd,.u4 figure,.u4 blockquote{margin:0;padding:0}.u4 ul,.u4 ol{list-style:none}
.u4 a{color:inherit;text-decoration:none}.u4 img{display:block;width:100%;height:100%}
.u4 .u4-ph{overflow:hidden;margin:0;background:var(--u-ph)}.u4 .u4-ph0{background:linear-gradient(135deg,var(--u-ph),var(--u-ph2))}
.u4{letter-spacing:-.015em}body .u4 h1,body .u4 h2{font-family:var(--u-hf)!important;font-weight:var(--u-hw)!important;letter-spacing:var(--u-hls)!important;word-break:keep-all}body .u4 .u4-lead,body .u4 p{letter-spacing:-.012em}
.u4 h1{color:var(--u-ink)}
.u4 h1 em{font-style:normal;color:var(--u-acct)}
.u4 h2{font-family:var(--u-hf);font-weight:var(--u-hw);letter-spacing:var(--u-hls);font-size:var(--u-h2,52px);line-height:1.22;color:var(--u-ink);word-break:keep-all}
.u4 .u4-lead{font-size:19px;line-height:1.7;color:var(--u-mu);word-break:keep-all}
.u4 .u4-lab{font-size:15px;font-weight:650;letter-spacing:.02em;color:var(--u-acct);margin-bottom:18px}
.u4 .u4-sh .u4-lead{margin-top:18px;max-width:560px}
.u4 .u4-sh.c{text-align:center;margin-bottom:64px}.u4 .u4-sh.c .u4-lead{margin:14px auto 0}
.u4 .u4-btns{display:flex;gap:12px;flex-wrap:wrap}.u4 .u4-btns.c{justify-content:center}
.u4 .u4-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;white-space:nowrap;min-height:58px;padding:0 30px;border-radius:var(--u-br);font-size:17px;font-weight:700;letter-spacing:-.01em;transition:transform .2s,background .2s}
.u4 .u4-btn:hover{transform:translateY(-1px)}
.u4 .u4-btn.p{background:var(--u-a);color:var(--u-on)}.u4 .u4-btn.s{background:var(--u-sbg);color:var(--u-ink);box-shadow:inset 0 0 0 1px var(--u-sbd)}
.u4 .u4-btn.w{background:#fff;color:var(--u-adk)}.u4 .u4-btn.g{color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.78)}
.u4 .u4-btn.sun,.u4 .u4-btn.gold{background:var(--u-pt);color:var(--u-pton)}
.u4 .u4-more,.u4 .u4-ul{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:16px;font-weight:650;color:var(--u-ink);border-bottom:1px solid currentColor;padding-top:6px}
.u4 .u4-scrim{position:absolute;inset:0;z-index:1;pointer-events:none}
.u4 .u4-g2{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}.u4 .u4-g2.one{grid-template-columns:minmax(0,1fr)}
.u4 .u4-hrow{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;margin-bottom:56px}
.u4 .u4-num{font-family:var(--u-nf);font-weight:800;letter-spacing:-.05em;line-height:.95;color:var(--u-ink)}
/* 강좌: index */
.u4-cls .u4-idx{border-bottom:1px solid var(--u-line)}
.u4-idx a{display:grid;grid-template-columns:56px minmax(0,1fr) 200px 200px 28px;gap:32px;align-items:center;padding:30px 0;border-top:1px solid var(--u-line)}
.u4-idx .no{font-family:var(--u-hf);font-size:20px;color:var(--u-mu)}
.u4-idx .tt b{display:block;font-family:var(--u-hf);font-weight:var(--u-hw);font-size:29px;line-height:1.3;letter-spacing:-.02em;color:var(--u-ink)}
.u4-idx .tt small{display:block;font-size:15px;color:var(--u-mu);margin-top:6px}
.u4-idx .mt b{display:block;font-size:16px;font-weight:650;color:var(--u-ink)}.u4-idx .mt small{font-size:14.5px;color:var(--u-mu)}
.u4-idx .th{height:128px;border-radius:3px}.u4-idx .go{font-style:normal;font-size:24px;color:var(--u-acct)}
.u4-idx a:hover .tt b{color:var(--u-acct)}
/* 강좌: tall */
.u4-tall{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.u4-tall a{position:relative;display:block;aspect-ratio:4/3;border-radius:20px;overflow:hidden;color:#fff;background:var(--u-adk)}
.u4-tall .u4-ph{position:absolute!important;inset:0}.u4-tall a::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 38%,rgba(5,14,26,.88) 100%)}
.u4-tall .tx{position:absolute;left:30px;right:30px;bottom:30px;z-index:1;display:flex;flex-direction:column;gap:8px}
.u4-tall .tx b{font-size:27px;line-height:1.3;letter-spacing:-.03em;font-weight:750}.u4-tall .tx small{font-size:15px;color:rgba(255,255,255,.86)}.u4-tall .tx .k{color:var(--u-ptl);font-weight:700;font-size:14px}
.u4-tall a img{transition:transform .6s}.u4-tall a:hover img{transform:scale(1.04)}
/* 강좌: card */
.u4-card{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.u4-card a{display:flex;flex-direction:column;gap:6px}.u4-card .u4-ph{aspect-ratio:4/3;border-radius:24px;margin-bottom:16px}
.u4-card .mt{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:var(--u-mu)}.u4-card .mt .hot{color:var(--u-ptt);font-weight:700}
.u4-card b{font-size:24px;line-height:1.35;letter-spacing:-.035em;font-weight:750;color:var(--u-ink)}.u4-card .m{font-size:15.5px;color:var(--u-mu)}
/* 강좌: frame */
.u4-frame{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.u4-frame a{display:block;border:1px solid var(--u-line);background:var(--u-bg)}.u4-frame .u4-ph{aspect-ratio:4/3}
.u4-frame .tx{display:flex;flex-direction:column;gap:8px;padding:28px 28px 32px;text-align:center}
.u4-frame .tx .k{font-size:13.5px;letter-spacing:.06em;color:var(--u-ptt);font-weight:700}.u4-frame .tx b{font-family:var(--u-hf);font-size:23px;line-height:1.4;color:var(--u-acct)}.u4-frame .tx small{font-size:15px;color:var(--u-mu)}
.u4 .u4-ctr{text-align:center;margin-top:52px}
/* 이야기 */
.u4-story .u4-g2{align-items:start}.u4-story-ph{height:560px;border-radius:4px}
.u4-story .u4-body{font-size:18px;line-height:1.75;color:var(--u-mu);margin-top:26px;max-width:470px}
.u4 .u4-facts{display:flex;gap:40px;margin-top:52px}.u4-facts div{flex:1;border-top:1px solid var(--u-ink);padding-top:16px;display:flex;flex-direction:column-reverse}
.u4-facts dd{font-family:var(--u-hf);font-weight:var(--u-hw);font-size:34px;letter-spacing:-.02em;color:var(--u-ink)}.u4-facts dt{font-size:14.5px;color:var(--u-mu)}
/* 큰 숫자 */
.hpt.u4-big.brand{background:var(--u-a);color:var(--u-on);padding:170px 0}
.u4-big.brand .u4-g2b{display:grid;grid-template-columns:1.4fr 1fr;gap:80px;align-items:end}
.u4-big.brand .u4-num{font-size:200px;color:var(--u-on)}.u4-big.brand .u4-num span{font-size:60px;margin-left:8px;letter-spacing:-.02em}
.u4-big.brand .u4-lab{color:var(--u-onm)}.u4-big.brand .u4-lead{color:var(--u-on);opacity:.9}.u4-big.brand .u4-ul{color:var(--u-on);margin-top:26px}
.hpt.u4-big.mist{background:var(--u-bg2);text-align:center}.u4-big.mist .u4-num{font-size:220px;color:var(--u-acct);margin:18px 0 12px}.u4-big.mist .u4-num span{color:var(--u-ptt);font-size:120px}
.u4-big.mist .u4-lead{max-width:640px;margin:0 auto 36px}
/* 인용 */
.u4-quote .u4-gq{display:grid;grid-template-columns:480px 1fr;gap:96px;align-items:center}.u4-q-ph{height:560px;border-radius:4px}
.u4-q blockquote{font-family:var(--u-qf);font-size:40px;line-height:1.5;letter-spacing:-.025em;font-weight:var(--u-qw);color:var(--u-ink);word-break:keep-all}
.u4-q blockquote::before{content:"“";display:block;font-family:Georgia,serif;font-size:110px;line-height:.6;color:var(--u-acct);margin-bottom:20px}
.u4-q figcaption{margin-top:30px;font-size:16px;color:var(--u-mu)}
.u4-quote.v-center{text-align:center}.u4-quote.v-center .u4-q blockquote{max-width:1000px;margin:0 auto;font-size:44px}.u4-quote.v-center .u4-q blockquote::before{display:none}
/* 일정 · 공지 */
.u4-bg{display:grid;grid-template-columns:1fr 1fr;gap:96px}.u4-bg.n1{grid-template-columns:minmax(0,1fr)}.u4-bg.n3{grid-template-columns:repeat(3,1fr);gap:48px}
.u4-board h3{display:flex;justify-content:space-between;align-items:center;gap:12px;font-family:var(--u-hf);font-weight:var(--u-hw);font-size:30px;letter-spacing:-.02em;color:var(--u-ink);padding-bottom:14px;border-bottom:2px solid var(--u-ink);margin-bottom:4px}
.u4-board h3 a{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-family:var(--u-bf);font-size:15px;font-weight:600;color:var(--u-mu);letter-spacing:0}
.u4-board .bcol li{background:none;border:0;padding:0;margin:0;border-radius:0}.u4-board .bcol li a{display:grid;grid-template-columns:96px minmax(0,1fr);gap:18px;align-items:center;padding:20px 0;border-bottom:1px solid var(--u-line);min-height:44px}
.u4-board .bnt li a{grid-template-columns:minmax(0,1fr)}
.u4-board time b{font-family:var(--u-hf);font-size:21px;color:var(--u-ink)}.u4-board .bcol li span b{display:block;font-weight:600;font-size:17px;line-height:1.5;color:var(--u-ink)}.u4-board .bcol li span small{font-size:14px;color:var(--u-mu)}
.u4-board .bcol li span b em{font-style:normal;color:var(--u-acct);font-weight:750;margin-right:8px}
.u4-board.v-cols3 h3{font-size:22px}.u4-board.v-cols3 .bcal li a{grid-template-columns:64px minmax(0,1fr)}
.u4-board.v-cols3 time{border:1px solid var(--u-acct);text-align:center;line-height:1.1;padding:8px 0;display:flex;flex-direction:column}
.u4-board.v-cols3 time small{font-size:13px;color:var(--u-mu)}.u4-board.v-cols3 time b{font-size:24px;color:var(--u-acct)}
.u4-board .evc{display:flex;flex-direction:column;gap:8px;padding-top:22px}.u4-board .evp{height:220px;margin-bottom:10px}
.u4-board .evc b{font-family:var(--u-hf);font-size:22px;line-height:1.4;color:var(--u-acct)}.u4-board .evc small{font-size:15px;color:var(--u-mu)}
/* 바로 가기 */
.u4 .u4-paths{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--u-ink);border-bottom:1px solid var(--u-line);margin-top:56px}
.u4-paths a{display:block;padding:26px 26px 28px 0;border-right:1px solid var(--u-line)}.u4-paths a+a{padding-left:26px}.u4-paths a:last-child{border-right:0}
.u4-paths small{display:block;font-size:14px;color:var(--u-mu);margin-bottom:4px}.u4-paths b{display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:650;letter-spacing:-.02em;color:var(--u-ink)}.u4-paths i{font-style:normal;color:var(--u-acct)}
.hpt.u4-bar{background:var(--u-a);color:var(--u-on)}.u4-bar .u4-w{display:grid;grid-template-columns:repeat(4,1fr)}
.u4-bar a{display:flex;flex-direction:column;gap:6px;padding:32px 26px 34px;border-left:1px solid var(--u-onl)}.u4-bar a:first-child{border-left:0;padding-left:0}
.u4-bar b{display:flex;justify-content:space-between;font-size:21px;font-weight:700}.u4-bar i{font-style:normal;color:var(--u-ptl)}.u4-bar small{font-size:14px;color:var(--u-onm)}
.hpt.u4-quick{background:var(--u-bg2);border-bottom:1px solid var(--u-line)}.u4-quick .u4-w{display:grid;grid-template-columns:repeat(4,1fr)}
.u4-quick a{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;padding:30px 12px 32px;border-left:1px solid var(--u-line)}.u4-quick a:first-child{border-left:0}
.u4-quick b{font-family:var(--u-hf);font-size:20px;color:var(--u-acct)}.u4-quick small{font-size:14px;color:var(--u-mu)}
.u4 .u4-who{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:14px;font-size:30px;font-weight:700;letter-spacing:-.035em}
.u4-who .q{color:var(--u-mu);font-weight:600}
.u4-who a{display:inline-flex;align-items:center;gap:10px;min-height:64px;padding:0 26px;border-radius:999px;box-shadow:inset 0 0 0 1.5px var(--u-ink);font-size:23px;color:var(--u-ink);transition:background .2s,color .2s}
.u4-who a:hover{background:var(--u-ink);color:var(--u-bg)}.u4-who i{font-style:normal;color:var(--u-ptt)}
.hpt.u4-whos{padding:88px 0 0}
/* 사진 띠 */
.hpt.u4-band{position:relative;min-height:720px;padding:0;display:flex;align-items:center;color:#fff;overflow:hidden;background:var(--u-adk)}
.u4 .u4-band-ph{position:absolute!important;inset:0;height:auto}.u4-band .u4-scrim{background:linear-gradient(90deg,var(--u-scr) 0%,var(--u-scr2) 42%,transparent 75%)}
.u4-band .u4-w{position:relative;z-index:2;width:100%;padding-top:120px;padding-bottom:120px}.u4-band h2{color:#fff;font-size:62px;max-width:660px}.u4-band .u4-lead{color:rgba(255,255,255,.9);max-width:480px;margin-top:22px}
.u4-band ul{display:flex;gap:48px;margin:48px 0 40px}.u4-band li{font-size:15px;color:rgba(255,255,255,.88)}.u4-band li b{display:block;font-size:30px;font-weight:800;letter-spacing:-.03em;color:#fff}
/* 열린 강좌 */
.u4-open-ph{height:640px;border-radius:24px}
.u4 .u4-links{margin-top:40px;border-top:1px solid var(--u-line)}.u4-links a{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 0;border-bottom:1px solid var(--u-line);min-height:44px}
.u4-links b{display:block;font-size:20px;font-weight:650;color:var(--u-ink)}.u4-links small{font-size:15px;color:var(--u-mu)}.u4-links i{font-style:normal;font-size:22px;color:var(--u-acct)}
/* 강의실 */
.hpt.u4-lms{background:var(--u-bg2)}.u4-lms-ph{height:680px;border-radius:32px}
.u4-steps{margin-top:44px}.u4-steps li{display:grid;grid-template-columns:56px minmax(0,1fr);gap:18px;padding:24px 0;border-top:1px solid var(--u-line)}
.u4-steps .n{font-size:15px;font-weight:700;color:var(--u-acct);padding-top:4px}.u4-steps b{display:block;font-size:22px;font-weight:750;letter-spacing:-.03em;color:var(--u-ink)}.u4-steps small{font-size:16px;color:var(--u-mu)}
/* 메달 */
.u4-medal .md{position:relative;width:440px;height:440px;margin:0 auto}
.u4-medal .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 200deg,var(--u-a),var(--u-a2),var(--u-a))}.u4-medal .ring::after{content:"";position:absolute;inset:14px;border-radius:50%;background:var(--u-bg)}
.u4-medal .core{position:absolute;inset:44px;border-radius:50%;background:var(--u-a);color:var(--u-on);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 40px;gap:8px}
.u4-medal .core small{font-size:14px;opacity:.85}.u4-medal .core b{font-size:34px;font-weight:800;line-height:1.25;letter-spacing:-.04em;word-break:keep-all}
.u4-medal .tag{position:absolute;right:-6px;top:56px;background:var(--u-pt);color:var(--u-pton);font-style:normal;font-weight:750;font-size:15px;padding:10px 16px;border-radius:999px;transform:rotate(8deg)}
.u4-medal .u4-num{font-size:132px;margin:28px 0 12px}.u4-medal .u4-num span{font-size:40px;margin-left:6px;letter-spacing:-.03em}.u4-medal .u4-btns{margin-top:32px}
/* 교육 이념 */
.hpt.u4-motto{position:relative;overflow:hidden;background:var(--u-a);color:var(--u-on);text-align:center;padding:150px 0}
.u4-motto .u4-crest.bg{position:absolute;right:-60px;bottom:-80px;width:420px;height:auto;opacity:.07;color:var(--u-on)}
.u4-motto .big{font-family:var(--u-hf);font-weight:700;font-size:50px;line-height:1.5;max-width:900px;margin:30px auto 0;word-break:keep-all}
.u4-motto .since{display:flex;justify-content:center;gap:80px;margin:64px auto 0;padding-top:44px;border-top:1px solid var(--u-onl);max-width:820px}
.u4-motto .since div{display:flex;flex-direction:column-reverse}.u4-motto dd{font-family:var(--u-hf);font-size:44px;font-weight:700;color:var(--u-ptl)}.u4-motto dt{font-size:14.5px;color:var(--u-onm)}
.u4 .u4-rule{display:flex;align-items:center;justify-content:center;gap:16px;font-size:14px;letter-spacing:.16em;color:var(--u-ptl)}.u4 .u4-rule::before,.u4 .u4-rule::after{content:"";width:48px;height:1px;background:currentColor}
/* 마지막 행동 */
.u4-close.v-photo .box{position:relative;min-height:560px;border-radius:4px;overflow:hidden;color:#fff;background:var(--u-adk);display:flex;align-items:center}
.u4 .u4-close-ph{position:absolute!important;inset:0;height:auto}.u4-close.v-photo .u4-scrim{background:linear-gradient(90deg,rgba(20,14,12,.8) 0%,rgba(20,14,12,.4) 55%,rgba(20,14,12,0) 100%)}
.u4-close.v-photo .in{position:relative;z-index:2;padding:88px 80px;max-width:740px}.u4-close.v-photo h2{color:#fff;font-size:58px}.u4-close.v-photo .u4-lead{color:rgba(255,255,255,.9);margin:20px 0 0}.u4-close.v-photo .u4-btns{margin-top:36px}
.hpt.u4-close.v-navy{background:var(--u-adk);color:#fff;text-align:center}.u4-close.v-navy h2{color:#fff;font-size:62px}.u4-close.v-navy .u4-lead{color:rgba(255,255,255,.8);margin:20px auto 0;max-width:560px}.u4-close.v-navy .u4-btns{margin-top:40px}.u4-close .u4-note{margin-top:26px;font-size:14px;color:rgba(255,255,255,.7)}
.u4-close.v-center{text-align:center}.u4-close.v-center h2{font-size:62px}.u4-close.v-center .u4-lead{margin:20px auto 0;max-width:560px}.u4-close.v-center .u4-btns{margin-top:40px}
.u4-close .ct{display:flex;justify-content:center;gap:48px;margin-top:64px;padding-top:40px;border-top:1px solid var(--u-line);text-align:left}.u4-close dt{font-size:16px;font-weight:700;color:var(--u-ink)}.u4-close dd{font-size:15.5px;color:var(--u-mu)}.u4-close dd a{min-height:44px;display:inline-flex;align-items:center}
.u4-close.v-split .box{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--u-line);background:var(--u-bg2)}.u4-close.v-split .box.one{grid-template-columns:minmax(0,1fr)}.u4-close.v-split .u4-close-ph{position:relative!important;min-height:460px}
.u4-close.v-split .in{padding:72px 64px;display:flex;flex-direction:column;justify-content:center}.u4-close.v-split h2{font-size:38px;color:var(--u-acct)}.u4-close.v-split .u4-lead{margin:16px 0 0}.u4-close.v-split .u4-btns{margin-top:30px}
.u4-close.v-split dl{margin-top:30px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 18px;align-items:center}.u4-close.v-split dl div{display:contents}.u4-close.v-split dt{font-size:15px;color:var(--u-acct)}

/* v44: 단계 · 목록형(row) · 가로 카드(wide) · 추가 버튼 */
.u4 .u4-btn.ink{background:var(--u-ink);color:var(--u-bg)}.u4 .u4-btn.line{color:var(--u-ink);box-shadow:inset 0 0 0 1.5px var(--u-ink)}
.u4-st{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;counter-reset:s}.u4-st.n3{grid-template-columns:repeat(3,1fr)}.u4-st.n2{grid-template-columns:repeat(2,1fr)}
.u4-st li{position:relative;display:flex;flex-direction:column;gap:10px;padding-top:30px;border-top:2px solid var(--u-ink)}
.u4-st .n{font-family:var(--u-nf);font-size:64px;font-weight:800;line-height:1;letter-spacing:-.05em;color:var(--u-acct);margin-bottom:8px}
.u4-st b{font-size:23px;font-weight:750;letter-spacing:-.03em;color:var(--u-ink)}.u4-st small{font-size:16px;line-height:1.6;color:var(--u-mu)}
.u4-steps.v-card .u4-st li{border-top:0;padding:34px 30px 36px;background:var(--u-bg2);border-radius:var(--u-r,20px)}
.u4-row{border-top:2px solid var(--u-ink)}
.u4-row a{display:grid;grid-template-columns:minmax(0,1.6fr) 180px minmax(0,1fr) 28px;gap:28px;align-items:center;padding:26px 8px;border-bottom:1px solid var(--u-line);transition:background .2s}
.u4-row a:hover{background:var(--u-bg2)}.u4-row small{display:block;font-size:14px;color:var(--u-mu)}.u4-row .nm b{font-size:23px;font-weight:750;letter-spacing:-.03em;color:var(--u-ink)}
.u4-row .pd b{font-size:17px;font-weight:650;font-variant-numeric:tabular-nums;color:var(--u-ink)}.u4-row .mt b{font-size:16px;font-weight:650;color:var(--u-ink)}.u4-row .mt b.hot{color:var(--u-ptt)}.u4-row i{font-style:normal;font-size:22px;color:var(--u-acct)}
.u4-wide{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.u4-wide a{display:grid;grid-template-columns:44% minmax(0,1fr);align-items:start;border-radius:var(--u-r,20px);overflow:hidden;background:var(--u-bg2);transition:transform .2s}.u4-wide a:hover{transform:translateY(-2px)}
.u4-wide .uv-x,.u4-wide .u4-ph{aspect-ratio:4/3;height:auto}.u4-wide .tx{display:flex;flex-direction:column;gap:8px;padding:30px 30px 28px}.u4-wide .k{font-size:14px;font-weight:700;color:var(--u-ptt)}.u4-wide b{font-size:23px;line-height:1.35;font-weight:750;letter-spacing:-.03em;color:var(--u-ink)}.u4-wide .tx>small{font-size:15px;color:var(--u-mu)}.u4-wide em{margin-top:auto;font-style:normal;font-size:15px;font-weight:650;color:var(--u-acct)}

/* v44.1 빠른 링크 · 학사 일정 띠 · 뉴스 3열 */
.u4-quickm{background:var(--u-bg);border-bottom:1px solid var(--u-line);box-shadow:0 1px 0 var(--u-line)}.u4-quickm .u4-w{display:grid;grid-template-columns:repeat(6,1fr)}
.u4-quickm a{display:flex;flex-direction:column;align-items:center;gap:12px;padding:34px 8px 30px;border-left:1px solid var(--u-line);font-size:16.5px;font-weight:650;color:var(--u-ink);transition:background .2s}.u4-quickm a:first-child{border-left:0}.u4-quickm a:hover{background:var(--u-bg2)}
.u4-quickm i{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--u-bg2);color:var(--u-acct)}
.u4-quickm.n7 .u4-w{grid-template-columns:repeat(7,1fr)}.u4-quickm.n8 .u4-w{grid-template-columns:repeat(8,1fr)}
body .hpt.u4.hp-s.u4-quick{padding:0}.u4-quick .u4-quickm{border-top:1px solid var(--u-line)}
.u4-cb{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);border-top:2px solid var(--u-ink)}
.u4-cb a{display:flex;flex-direction:column;gap:18px;height:100%;padding:28px 24px 30px 0;border-right:1px solid var(--u-line);min-height:44px}.u4-cb li+li a{padding-left:24px}.u4-cb li:last-child a{border-right:0}
.u4-cb time b{display:block;font-size:40px;font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--u-acct);font-variant-numeric:tabular-nums}.u4-cb time small{font-size:14px;color:var(--u-mu)}
.u4-cb span em{display:block;font-style:normal;font-size:13.5px;font-weight:700;color:var(--u-ptt);margin-bottom:4px}.u4-cb span b{font-size:17px;font-weight:650;line-height:1.45;color:var(--u-ink)}
body .hpt.u4.hp-s.u4-calband{background:var(--u-bg2)}
.u4-nw{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.u4-nw.n2{grid-template-columns:repeat(2,1fr)}
.u4-nw a{display:flex;flex-direction:column;gap:14px;height:100%;min-height:240px;padding:30px 28px;border-radius:var(--u-r,16px);background:var(--u-bg);box-shadow:inset 0 0 0 1px var(--u-line);transition:transform .2s,box-shadow .2s}.u4-nw a:hover{transform:translateY(-2px);box-shadow:inset 0 0 0 1px var(--u-acct),0 14px 30px -18px rgba(0,0,0,.3)}
.u4-nw .tg{align-self:flex-start;font-size:13.5px;font-weight:700;color:var(--u-acct)}.u4-nw b{font-size:21px;line-height:1.45;font-weight:750;letter-spacing:-.03em;color:var(--u-ink);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.u4-nw time{font-size:14px;color:var(--u-mu)}.u4-nw em{margin-top:auto;font-style:normal;font-size:15px;font-weight:650;color:var(--u-acct)}
/* ── 휴대폰 ── */
@media(max-width:760px){
.u4-quickm .u4-w,.u4-quickm.n7 .u4-w,.u4-quickm.n8 .u4-w{grid-template-columns:repeat(3,1fr);padding:0}.u4-quickm.n8 .u4-w,.u4-quickm.n4 .u4-w{grid-template-columns:repeat(4,1fr)}.u4-quickm a{padding:20px 4px 18px;font-size:14px;gap:8px;border-top:1px solid var(--u-line)}.u4-quickm a:nth-child(3n+1){border-left:0}.u4-quickm i{width:48px;height:48px}.u4-quickm svg{width:24px;height:24px}
.u4-cb{grid-auto-flow:row;grid-auto-columns:auto;border-top-width:2px}.u4-cb a,.u4-cb li+li a{flex-direction:row;align-items:center;gap:18px;padding:16px 0;border-right:0;border-bottom:1px solid var(--u-line)}.u4-cb time{flex:0 0 64px}.u4-cb time b{font-size:24px}.u4-cb time small{font-size:13px}.u4-cb span b{font-size:15.5px}
.u4-nw,.u4-nw.n2{grid-template-columns:minmax(0,1fr);gap:12px}.u4-nw a{min-height:0;padding:20px 18px;gap:8px}.u4-nw b{font-size:17px}
.u4-st,.u4-st.n3{grid-template-columns:1fr 1fr;gap:28px 16px}.u4-st .n{font-size:40px}.u4-st b{font-size:18px}.u4-st small{font-size:14.5px}.u4-steps.v-card .u4-st li{padding:24px 18px}
.u4-row a{grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;padding:20px 4px}.u4-row .nm{grid-column:1/-1}.u4-row .nm b{font-size:19px}.u4-row i{display:none}.u4-row .pd b,.u4-row .mt b{font-size:14.5px}.u4-row small{font-size:13px}
.u4-wide{grid-template-columns:minmax(0,1fr);gap:16px}.u4-wide a{grid-template-columns:120px minmax(0,1fr);min-height:150px}.u4-wide .tx{padding:18px 16px}.u4-wide b{font-size:18px}.u4-wide .tx>small{display:none}
body .hpt.u4.hp-s.u4-big.brand,body .hpt.u4.hp-s.u4-motto{padding:88px 0}body .hpt.u4.hp-s.u4-whos{padding:56px 0 0}.u4-board .bnt li a{grid-template-columns:minmax(0,1fr)!important}.u4-idx a>*{min-width:0}.u4-idx .th{width:92px}
.u4{--sp:84px}.u4 .u4-w{padding:0 20px}
.u4 h2{font-size:32px;line-height:1.28}.u4 .u4-lead{font-size:16.5px}.u4 .u4-lab{font-size:14px;margin-bottom:12px}.u4 .u4-sh.c{margin-bottom:36px}
.u4 .u4-btn{min-height:54px;padding:0 16px;font-size:16px;flex:1 1 0}.u4 .u4-btn svg{display:none}
.u4 .u4-g2,.u4-quote .u4-gq,.u4-big.brand .u4-g2b,.u4-bg,.u4-bg.n3,.u4-close.v-split .box{grid-template-columns:minmax(0,1fr);gap:40px}
.u4 .u4-hrow{flex-direction:column;align-items:flex-start;gap:14px;margin-bottom:28px}
.u4-idx a{grid-template-columns:minmax(0,1fr) 92px;gap:8px 16px;padding:22px 0}.u4-idx .no,.u4-idx .go{display:none}.u4-idx .tt{grid-column:1;grid-row:1}.u4-idx .tt b{font-size:20px}.u4-idx .tt small{display:none}.u4-idx .mt{grid-column:1;grid-row:2}.u4-idx .mt b{font-size:14.5px}.u4-idx .mt small{font-size:13.5px}.u4-idx .th{grid-column:2;grid-row:1/3;height:92px}
.u4-tall,.u4-card,.u4-frame{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin:0 -20px;padding:0 20px 4px;scrollbar-width:none}.u4-tall::-webkit-scrollbar,.u4-card::-webkit-scrollbar,.u4-frame::-webkit-scrollbar{display:none}
.u4-tall li,.u4-card li,.u4-frame li{flex:0 0 80%;scroll-snap-align:start}.u4-tall .tx{left:22px;right:22px;bottom:22px}.u4-tall .tx b{font-size:22px}.u4-card .u4-ph{border-radius:18px}.u4-card b{font-size:20px}.u4-frame .tx b{font-size:20px}
.u4-story-ph,.u4-q-ph{height:300px}.u4-facts dd{font-size:26px}.u4 .u4-facts{gap:20px;margin-top:32px}
.hpt.u4-big.brand{padding:92px 0}.u4-big.brand .u4-num{font-size:96px}.u4-big.brand .u4-num span{font-size:30px}.u4-big.mist .u4-num{font-size:110px}.u4-big.mist .u4-num span{font-size:56px}
.u4-q blockquote{font-size:24px}.u4-q blockquote::before{font-size:72px;margin-bottom:8px}.u4-quote.v-center .u4-q blockquote{font-size:25px}
.u4-board h3{font-size:24px}.u4-board .bcol li a{grid-template-columns:72px minmax(0,1fr);padding:16px 0}.u4-board time b{font-size:17px}.u4-board .bcol li span b{font-size:16px}
.u4 .u4-paths{grid-template-columns:1fr 1fr;margin-top:28px}.u4-paths a,.u4-paths a+a{padding:18px 12px 20px 0;border-right:0;border-bottom:1px solid var(--u-line)}.u4-paths a:nth-child(even){padding-left:12px;border-left:1px solid var(--u-line)}.u4-paths a:nth-last-child(-n+2){border-bottom:0}.u4-paths b{font-size:16.5px}.u4-paths small{font-size:13px}
.u4-bar .u4-w,.u4-quick .u4-w{grid-template-columns:1fr 1fr;padding:0}.u4-bar a,.u4-bar a:first-child{padding:20px 20px 22px;border-left:0;border-top:1px solid var(--u-onl)}.u4-bar a:nth-child(even){border-left:1px solid var(--u-onl)}.u4-bar a:nth-child(-n+2){border-top:0}.u4-bar b{font-size:17px}.u4-bar small{font-size:13px}
.u4-quick a,.u4-quick a:first-child{padding:20px 8px;border-left:0;border-top:1px solid var(--u-line)}.u4-quick a:nth-child(even){border-left:1px solid var(--u-line)}.u4-quick a:nth-child(-n+2){border-top:0}.u4-quick b{font-size:17px}.u4-quick small{font-size:13px}
.u4 .u4-who{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:20px}.u4-who .q{grid-column:1/-1}.u4-who .q.e{display:none}.u4-who a{min-height:52px;padding:0 14px;font-size:15.5px;justify-content:space-between;white-space:nowrap;letter-spacing:-.04em}.hpt.u4-whos{padding:56px 0 0}
.hpt.u4-band{min-height:640px;align-items:flex-end}.u4-band .u4-scrim{background:linear-gradient(180deg,transparent 15%,var(--u-scr2) 55%,var(--u-scr) 100%)}.u4-band .u4-w{padding-top:220px;padding-bottom:48px}.u4-band h2{font-size:34px}.u4-band ul{gap:20px;margin:28px 0}.u4-band li{font-size:13px}.u4-band li b{font-size:20px}
.u4-open-ph{height:280px;border-radius:16px}.u4-links b{font-size:17px}.u4-links small{font-size:14px}
.u4-lms-ph{height:300px;border-radius:20px}.u4-steps b{font-size:18px}.u4-steps small{font-size:15px}
.u4-medal .md{width:280px;height:280px}.u4-medal .core{inset:30px;padding:0 24px}.u4-medal .core b{font-size:22px}.u4-medal .core small{font-size:13px}.u4-medal .tag{font-size:13px;top:18px;right:-8px}.u4-medal .u4-num{font-size:84px}.u4-medal .u4-num span{font-size:28px}.u4-medal .u4-g2>div:last-child{order:-1}
.hpt.u4-motto{padding:88px 0}.u4-motto .big{font-size:26px}.u4-motto .since{gap:20px;margin-top:40px;padding-top:28px}.u4-motto dd{font-size:26px}.u4-motto dt{font-size:13px}
.u4 .u4-rule{font-size:13px;letter-spacing:.1em}.u4 .u4-rule::before,.u4 .u4-rule::after{width:26px}
.u4-close.v-photo .u4-w{padding:0}.u4-close.v-photo .box{border-radius:0;min-height:0;align-items:flex-end}.u4-close.v-photo .u4-scrim{background:linear-gradient(180deg,rgba(20,14,12,.25),rgba(20,14,12,.85))}.u4-close.v-photo .in{padding:220px 20px 44px}.u4-close.v-photo h2,.u4-close.v-navy h2,.u4-close.v-center h2{font-size:34px}
.u4-close .ct{flex-direction:column;gap:18px;margin-top:40px}.u4-close.v-split .u4-w{padding:0}.u4-close.v-split .box{gap:0;border-left:0;border-right:0}.u4-close.v-split .u4-close-ph{min-height:240px}.u4-close.v-split .in{padding:40px 20px}.u4-close.v-split h2{font-size:28px}.u4-close.v-split dl{grid-template-columns:minmax(0,1fr)}
}`;

  /* 테마별 첫 화면 · 머리글 · 바닥글 */
  const HEROCSS = {
    univy: (c) => `
${BR}{background:var(--u-bg)}
.hp-hero.u4-ivy-h{padding:104px 0 0;background:var(--u-bg)}
.u4-ivy-h .u4-kick{font-size:15px;font-weight:650;letter-spacing:.04em;color:var(--u-acct);margin-bottom:26px}
.u4-ivy-h h1{font-size:86px;line-height:1.14;max-width:1000px}
.u4-ivy-row{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-top:42px}.u4-ivy-row .u4-lead{max-width:540px;font-size:20px}
.u4 .u4-ivy-ph{margin-top:68px;height:620px;border-radius:4px}
.u4 .u4-cap{display:flex;justify-content:space-between;gap:16px;font-size:13.5px;color:var(--u-mu);padding-top:14px}
.hpt.u4-cls.v-index{background:var(--u-bg2)}
@media(max-width:760px){.hp-hero.u4-ivy-h{padding:52px 0 0}.u4-ivy-h h1{font-size:40px;line-height:1.22}.u4-ivy-row{flex-direction:column;align-items:stretch;gap:26px;margin-top:20px}.u4-ivy-row .u4-lead{font-size:16.5px}.u4-ivy-row .u4-btns{flex-wrap:nowrap}.u4 .u4-ivy-ph{margin:36px -20px 0;height:300px;border-radius:0}.u4 .u4-cap{justify-content:flex-start}.u4 .u4-cap span:first-child:empty{display:none}}`,
    unsplit: (c) => `
.hp-hero.u4-split-h{display:grid;grid-template-columns:1fr 1fr;min-height:720px;background:var(--u-bg)}
.u4-sp-tx{display:flex;flex-direction:column;justify-content:center;padding:96px 72px 96px max(40px,calc((100vw - 1200px) / 2 + 40px))}
.u4-split-h .u4-pre{font-size:15px;font-weight:700;color:var(--u-acct);margin-bottom:24px}.u4-split-h h1{font-size:64px;line-height:1.12}
.u4-split-h .u4-lead{font-size:19px;margin:28px 0 40px;max-width:500px}.u4-split-h .u4-safe{font-size:14px;color:var(--u-mu);margin-top:20px}
.u4 .u4-sp-ph{height:100%;min-height:720px}.u4-split-h.np{grid-template-columns:minmax(0,1fr)}
@media(max-width:760px){.hp-hero.u4-split-h{grid-template-columns:minmax(0,1fr);min-height:0}.u4-sp-tx{padding:48px 20px 40px}.u4-split-h h1{font-size:40px;line-height:1.18}.u4-split-h .u4-lead{font-size:16.5px;margin:18px 0 28px}.u4-split-h .u4-btns{flex-wrap:nowrap}.u4 .u4-sp-ph{min-height:0;height:280px}}`,
    unposter: (c) => `
.hp-hero.u4-poster-h{background:var(--u-a);color:var(--u-on);padding:72px 0 88px}
.u4-poster-h .u4-mark{display:flex;justify-content:space-between;gap:16px;font-size:14px;font-weight:800;letter-spacing:.14em;color:var(--u-on);padding-bottom:22px;border-bottom:2px solid var(--u-on);margin-bottom:48px}.u4-poster-h .u4-mark span{letter-spacing:.02em;font-weight:650}
.u4-poster-h h1{font-size:112px;line-height:1.02;letter-spacing:-.06em!important;color:var(--u-on)}
.u4-po-row{display:grid;grid-template-columns:1fr 480px;gap:64px;align-items:end;margin-top:56px}.u4-poster-h .u4-lead{color:var(--u-on);opacity:.86;font-size:20px;max-width:520px;margin-bottom:34px}
.u4-poster-h .u4-btn.ink{background:var(--u-on);color:var(--u-a)}.u4-poster-h .u4-btn.line{color:var(--u-on);box-shadow:inset 0 0 0 2px var(--u-on)}
.u4 .u4-po-ph{height:320px;border-radius:0}.u4-poster-h .u4-safe{font-size:14px;color:var(--u-on);opacity:.75;margin-top:16px}
@media(max-width:760px){.hp-hero.u4-poster-h{padding:40px 0 48px}.u4-poster-h .u4-mark{font-size:13px;margin-bottom:30px;letter-spacing:.08em}.u4-poster-h .u4-mark span{font-size:13px}.u4-poster-h h1{font-size:46px;line-height:1.08}.u4-po-row{grid-template-columns:minmax(0,1fr);gap:32px;margin-top:28px}.u4-poster-h .u4-lead{font-size:16.5px}.u4-poster-h .u4-btns{flex-wrap:nowrap}.u4 .u4-po-ph{height:220px}}`,
    undark: (c) => `
${BR}{color:var(--u-ink)}
.hp-hero.u4-dark-h{position:relative;overflow:hidden;background:var(--u-bg);text-align:center;padding:110px 0 0}
.u4-glow{position:absolute;left:50%;top:-220px;width:1100px;height:620px;transform:translateX(-50%);background:radial-gradient(closest-side,var(--u-glow1),transparent 70%),radial-gradient(closest-side at 70% 60%,var(--u-glow2),transparent 70%);pointer-events:none;filter:blur(10px)}
.u4-dark-h .u4-w{position:relative;z-index:1}.u4-dark-h .u4-pill{display:inline-flex;align-items:center;min-height:36px;padding:0 16px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--u-line);font-size:14px;font-weight:650;color:var(--u-mu);margin-bottom:28px}
.u4-dark-h h1{font-size:92px;line-height:1.06;color:var(--u-ink)}.u4-dark-h h1 em{background:linear-gradient(90deg,var(--u-acct),var(--u-ptl));-webkit-background-clip:text;background-clip:text;color:transparent}
.u4-dark-h .u4-lead{max-width:620px;margin:28px auto 40px;font-size:20px}.u4 .u4-dk-ph{height:500px;margin-top:80px;border-radius:28px 28px 0 0;box-shadow:0 -1px 0 var(--u-line),0 -40px 120px -40px var(--u-glow1)}
@media(max-width:760px){.hp-hero.u4-dark-h{padding:56px 0 0}.u4-glow{width:600px;height:420px;top:-160px}.u4-dark-h h1{font-size:42px;line-height:1.14}.u4-dark-h .u4-lead{font-size:16.5px;margin:18px auto 28px}.u4-dark-h .u4-btns{flex-wrap:nowrap}.u4 .u4-dk-ph{height:260px;margin-top:44px;border-radius:20px 20px 0 0}}`,
    unmag: (c) => `
.hp-hero.u4-mag-h{background:var(--u-bg);padding:72px 0 120px}
.u4-mg-g{display:grid;grid-template-columns:5fr 7fr;gap:64px;align-items:center}
.u4-issue{display:flex;align-items:center;gap:14px;font-size:14px;color:var(--u-mu);margin-bottom:36px}.u4-issue b{font-size:14px;font-weight:900;letter-spacing:.18em;color:var(--u-acct)}.u4-issue span{padding-left:14px;border-left:1px solid var(--u-line)}
.u4-mag-h h1{font-size:80px;line-height:1.08}.u4-mag-h .u4-lead{margin:30px 0 40px;font-size:19px;max-width:440px}
.u4-mg-ph{position:relative;display:grid;grid-template-columns:1.1fr 1fr;gap:20px;align-items:start}.u4-mg-ph.one{grid-template-columns:minmax(0,1fr)}
.u4 .u4-mg-ph .a{height:640px;border-radius:4px}.u4 .u4-mg-ph .b{height:420px;margin-top:160px;border-radius:4px}.u4-mg-ph.one .a{height:560px}
.u4-mg-cap{position:absolute;left:0;bottom:-34px;font-size:13.5px;color:var(--u-mu)}
@media(max-width:760px){.hp-hero.u4-mag-h{padding:44px 0 72px}.u4-mg-g{grid-template-columns:minmax(0,1fr);gap:36px}.u4-issue{margin-bottom:22px;font-size:13px}.u4-mag-h h1{font-size:42px;line-height:1.14}.u4-mag-h .u4-lead{font-size:16.5px;margin:18px 0 28px}.u4-mag-h .u4-btns{flex-wrap:nowrap}.u4-mg-ph{gap:12px}.u4 .u4-mg-ph .a{height:300px}.u4 .u4-mg-ph .b{height:220px;margin-top:80px}}`,
    unblock: (c) => `
.hp-hero.u4-block-h{background:var(--u-bg);padding:0 0 96px}
.u4-bk-band{background:var(--u-a);color:var(--u-on)}.u4-bk-g{display:grid;grid-template-columns:1fr 420px;gap:64px;align-items:start}
.u4-bk-tx{padding:110px 0 100px}.u4-block-h .u4-eyl{font-size:15px;font-weight:700;color:var(--u-onm);margin-bottom:24px}
.u4-block-h h1{font-size:88px;line-height:1.06;color:var(--u-on)}.u4-block-h .u4-lead{color:var(--u-on);opacity:.88;font-size:20px;max-width:560px;margin:30px 0 40px}
.u4-block-h .u4-btn.w{background:var(--u-on);color:var(--u-a)}.u4-block-h .u4-btn.g{color:var(--u-on);box-shadow:inset 0 0 0 1.5px var(--u-onm)}
.u4 .u4-bk-ph{height:600px;margin-top:96px;margin-bottom:-96px;border-radius:220px 220px 24px 24px;box-shadow:0 30px 60px -30px rgba(0,0,0,.35)}
.u4-block-h.np .u4-bk-g{grid-template-columns:minmax(0,1fr)}
@media(max-width:760px){.hp-hero.u4-block-h{padding:0 0 56px}.u4-bk-g{grid-template-columns:minmax(0,1fr);gap:0}.u4-bk-tx{padding:52px 0 40px}.u4-block-h h1{font-size:42px;line-height:1.14}.u4-block-h .u4-lead{font-size:16.5px;margin:18px 0 28px}.u4-block-h .u4-btns{flex-wrap:nowrap}.u4 .u4-bk-ph{height:320px;margin:0 0 -56px;border-radius:160px 160px 20px 20px}}`,
    unportal: (c) => `
.hp-hero.u4-portal-h{background:var(--u-bg);padding:0}
.u4-pt-g{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);min-height:560px}
.u4 .u4-pt-ph{height:100%;min-height:560px}.u4-portal-h.np .u4-pt-g{grid-template-columns:minmax(0,1fr)}
.u4-pt-pn{background:var(--u-a);color:var(--u-on);display:flex;flex-direction:column;justify-content:center;padding:64px max(40px,calc((100vw - 1200px) / 2 + 40px)) 64px 64px}
.u4-portal-h .u4-pre{font-size:15px;font-weight:700;color:var(--u-onm);margin-bottom:22px}.u4-portal-h h1{font-size:64px;line-height:1.14;color:var(--u-on)}
.u4-portal-h .u4-lead{color:var(--u-on);opacity:.88;margin:24px 0 36px;font-size:18px}.u4-portal-h .u4-btn.w{background:var(--u-on);color:var(--u-a)}.u4-portal-h .u4-btn.g{color:var(--u-on);box-shadow:inset 0 0 0 1.5px var(--u-onm)}
.u4-portal-h .u4-safe{font-size:14px;color:var(--u-onm);margin-top:18px}
.hpt.u4.hp-s.u4-board.v-portal .bnt{background:#fff;border-top:4px solid var(--u-a);padding:8px 32px 20px;box-shadow:0 1px 0 var(--u-line)}.u4-board.v-portal .bcal{background:var(--u-bg2);padding:8px 32px 20px}.u4-board.v-portal .u4-bg{grid-template-columns:1.35fr 1fr;gap:32px}.u4-board.v-portal h3{border-bottom-width:1px;font-size:24px}
body .hpt.u4.hp-s.u4-board.v-portal{background:var(--u-bg2)}
.u4-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.u4-gal li{display:flex;flex-direction:column;gap:4px}.u4-gal .u4-ph{height:300px;border-radius:12px;margin-bottom:14px}.u4-gal b{font-size:20px;font-weight:750;color:var(--u-ink)}.u4-gal small{font-size:15px;color:var(--u-mu)}
@media(max-width:760px){.u4-pt-g{grid-template-columns:minmax(0,1fr);min-height:0}.u4 .u4-pt-ph{min-height:0;height:240px}.u4-pt-pn{padding:36px 20px 40px}.u4-portal-h h1{font-size:38px;line-height:1.18}.u4-portal-h .u4-lead{font-size:16px;margin:16px 0 26px}.u4-portal-h .u4-btns{flex-wrap:nowrap}

.u4-board.v-portal .u4-bg{grid-template-columns:minmax(0,1fr)}.hpt.u4.hp-s.u4-board.v-portal .bnt,.u4-board.v-portal .bcal{padding:4px 18px 14px}.u4-gal{grid-template-columns:minmax(0,1fr);gap:28px}.u4-gal .u4-ph{height:220px}}`,
    unfind: (c) => `
.hp-hero.u4-find-h{background:var(--u-bg);text-align:center;padding:64px 0 0;display:flex;flex-direction:column}
.u4-find-h .u4-pre{font-size:15px;font-weight:700;color:var(--u-acct);margin-bottom:24px}.u4-find-h h1{font-size:76px;line-height:1.1}
.u4-find-h .u4-lead{max-width:620px;margin:22px auto 30px;font-size:19px}
.u4-findl{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:1000px;margin:40px auto 0;text-align:left}
.u4-findl a{display:flex;align-items:center;gap:14px;min-height:76px;padding:0 20px;border-radius:16px;background:#fff;box-shadow:inset 0 0 0 1px var(--u-line);transition:box-shadow .2s,transform .2s}.u4-findl a:hover{box-shadow:inset 0 0 0 2px var(--u-acct);transform:translateY(-2px)}
.u4-findl i{color:var(--u-acct);display:grid}.u4-findl svg{width:26px;height:26px}.u4-findl b{flex:1;font-size:17px;font-weight:700;color:var(--u-ink)}.u4-findl em{font-style:normal;color:var(--u-acct)}
.u4-find-h .u4-safe{font-size:14px;color:var(--u-mu);margin-top:18px}
.u4-tri{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:16px;width:100%;max-width:1360px;margin:40px auto 0;padding:0 40px;box-sizing:border-box}.u4-tri .u4-ph{height:380px;border-radius:20px 20px 0 0}.u4-tri.n1{grid-template-columns:minmax(0,1fr)}
@media(max-width:760px){.hp-hero.u4-find-h{padding:0 0 40px}.u4-tri{order:-1;margin:0 0 36px!important}.u4-tri .u4-ph{border-radius:0!important}.u4-find-h h1{font-size:40px;line-height:1.18}.u4-find-h .u4-lead{font-size:16px;margin:16px auto 26px}.u4-find-h .u4-btns{flex-wrap:nowrap}
.u4-findl{grid-template-columns:1fr 1fr;gap:10px;margin-top:30px}.u4-findl a{min-height:60px;padding:0 14px;gap:10px}.u4-findl b{font-size:15px}.u4-findl em{display:none}.u4-tri{grid-template-columns:1fr 1.4fr 1fr;gap:8px;margin-top:40px;padding:0}.u4-tri .u4-ph{height:200px;border-radius:14px 14px 0 0}}`,

    unoverlap: (c) => `
.hp-hero.u4-over-h{background:var(--u-bg);padding:0 0 40px}
.u4 .u4-ov-ph{height:620px}.u4-over-h .u4-w{position:relative;z-index:2}
.u4-ov-card{max-width:760px;margin-top:-260px;background:var(--u-bg2);padding:60px 64px 56px;border-radius:var(--u-r,6px);box-shadow:0 40px 80px -40px rgba(20,16,12,.35);border-top:6px solid var(--u-pt)}
.u4-over-h .u4-pre{font-size:15px;font-weight:700;color:var(--u-ptt);margin-bottom:20px}.u4-over-h h1{font-size:72px;line-height:1.1}.u4-over-h .u4-lead{margin:24px 0 36px;font-size:19px}
.u4-over-h.np .u4-ov-card{margin-top:64px}
@media(max-width:760px){.u4 .u4-ov-ph{height:300px}.u4-ov-card{margin:-80px 0 0;padding:32px 22px 30px}.u4-over-h h1{font-size:38px;line-height:1.16}.u4-over-h .u4-lead{font-size:16px;margin:16px 0 24px}.u4-over-h .u4-btns{flex-wrap:nowrap}}`,

    uncine: (c) => `
.hp-hero.u4-cine-h{position:relative;height:100vh;min-height:760px;max-height:960px;color:#fff;overflow:hidden;background:var(--u-adk);display:flex;align-items:flex-end;padding:0 0 96px;margin-top:calc(-1 * var(--hps-hh,0px))}
.u4 .u4-cine-ph{position:absolute!important;inset:0;height:auto}.u4-cine-h .u4-cine-ph.st img{transform:scale(1.04);transform-origin:50% 0}
.u4-cine-h .u4-scrim{background:linear-gradient(180deg,rgba(7,20,36,.5) 0%,rgba(7,20,36,0) 20%),linear-gradient(90deg,var(--u-scr) 0%,var(--u-scr2) 38%,transparent 64%),linear-gradient(0deg,rgba(7,20,36,.5) 0%,transparent 40%)}
.u4-cine-tx{position:relative;z-index:2;width:100%}
.u4-cine-h .u4-eyl{display:inline-flex;align-items:center;gap:10px;font-size:16px;font-weight:600;margin-bottom:22px;color:#fff}.u4-cine-h .u4-eyl::before{content:"";width:28px;height:2px;background:var(--u-ptl)}
.u4-cine-h h1{font-size:90px;line-height:1.08;color:#fff;max-width:900px}.u4-cine-h .u4-lead{color:rgba(255,255,255,.92);font-size:20px;max-width:540px;margin:28px 0 38px}
@media(max-width:760px){.hp-hero.u4-cine-h{height:760px;min-height:0;padding-bottom:40px}.u4-cine-h .u4-scrim{background:linear-gradient(180deg,rgba(7,20,36,.45) 0%,transparent 16%,transparent 34%,var(--u-scr2) 66%,var(--u-scr) 100%)}.u4-cine-h h1{font-size:42px;line-height:1.16}.u4-cine-h .u4-eyl{font-size:14px;margin-bottom:14px}.u4-cine-h .u4-lead{font-size:16px;margin:18px 0 26px}.u4-cine-h .u4-btns{flex-wrap:nowrap}.u4-cine-h .u4-cine-ph.st img{transform:none;object-position:70% 50%!important}}`,
    uncollage: (c) => `
.hp-hero.u4-col-h{padding:72px 0 0;text-align:center;background:var(--u-bg)}
.u4-col-h .u4-pre{font-size:16px;font-weight:650;color:var(--u-acct);margin-bottom:22px}
.u4-col-h h1{font-size:84px;line-height:1.1}
.u4-col-h .u4-lead{font-size:20px;max-width:620px;margin:28px auto 0}.u4-col-h .u4-btns{justify-content:center;margin-top:40px}
.u4-col-h .u4-btn{border-radius:16px}.u4-col-h .u4-btn.p{box-shadow:0 10px 26px -10px var(--u-ash)}
.u4-col-h .u4-safe{font-size:14px;color:var(--u-mu);margin-top:18px}
.u4-colg{display:grid;grid-template-columns:1fr 1.1fr 1.35fr 1.1fr 1fr;gap:18px;align-items:end;max-width:1360px;margin:60px auto 0;padding:0 40px}
.u4-colg>div{border-radius:28px;overflow:hidden}.u4-colg .u4-ph{height:100%}
.u4-colg .c1,.u4-colg .c5{height:300px}.u4-colg .c2,.u4-colg .c4{height:400px}.u4-colg .c3{height:480px}
.u4-colg.n1{grid-template-columns:minmax(0,820px);justify-content:center}.u4-colg.n1 .c1{height:480px}
.hpt.u4-quote.v-center,.hpt.u4-quote.v-brand{background:var(--u-a)}.u4-quote.v-brand .u4-gq{grid-template-columns:1.6fr 1fr}.u4-quote.v-brand .u4-gq .u4-q-ph{order:2;height:420px;border-radius:28px;transform:rotate(2deg)}.u4-quote.v-brand blockquote{color:var(--u-on);font-weight:750;font-size:44px}.u4-quote.v-brand blockquote::before{display:none}.u4-quote.v-brand figcaption{color:var(--u-onm)}
@media(max-width:760px){.hp-hero.u4-col-h{padding:52px 0 0}.u4-col-h h1{font-size:40px;line-height:1.18}.u4-col-h .u4-lead{font-size:16px;margin-top:18px}.u4-col-h .u4-btns{flex-direction:column;margin-top:30px}.u4-col-h .u4-btn{width:100%;flex:0 0 auto}
.u4-colg{grid-template-columns:1fr 1.3fr 1fr;gap:10px;margin-top:44px;padding:0;overflow:hidden}.u4-colg>div{border-radius:18px}.u4-colg .c1,.u4-colg .c5{display:none}.u4-colg .c2,.u4-colg .c4{height:200px}.u4-colg .c3{height:260px}.u4-colg .c2{margin-left:-30px}.u4-colg .c4{margin-right:-30px}
.u4-quote.v-brand .u4-gq{grid-template-columns:minmax(0,1fr)}.u4-colg.n1{grid-template-columns:minmax(0,1fr);padding:0 20px}.u4-colg.n1 .c1{display:block;height:260px}.u4-quote.v-brand blockquote{font-size:26px}.u4-quote.v-brand .u4-gq .u4-q-ph{order:0;transform:none;height:240px;border-radius:20px}}`,
    unclassic: (c) => `
.hp-hero.u4-cls-h{position:relative;height:640px;color:#fff;text-align:center;overflow:hidden;background:var(--u-adk);display:flex;align-items:center;justify-content:center}
.u4 .u4-cls-ph{position:absolute!important;inset:0;height:auto}.u4-cls-h .u4-scrim{background:linear-gradient(180deg,var(--u-scr2),rgba(10,20,40,.38) 40%,var(--u-scr))}
.u4-cls-in{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;padding:0 24px;max-width:1000px}
.u4-cls-h h1{font-size:70px;line-height:1.26;letter-spacing:-.02em;color:#fff;margin:24px 0 20px}.u4-cls-h .u4-lead{color:rgba(255,255,255,.9);max-width:620px}.u4-cls-h .u4-btns{justify-content:center;margin-top:36px}
.u4-cls-h .u4-btn,.u4-close.v-split .u4-btn,.u4-cls .u4-more{border-radius:2px}
@media(max-width:760px){.hp-hero.u4-cls-h{height:600px}.u4-cls-h h1{font-size:36px}.u4-cls-h .u4-lead{font-size:16px}.u4-cls-h .u4-btns{flex-direction:column;width:100%;max-width:340px}.u4-cls-h .u4-btn{flex:0 0 auto}}`
  };

  function tok(s) { const T = HPT.tokens(s); if (!T) return null; const th = s.theme; const a = T.a; const Rm = ramp(a);
    const P = {
      unportal: { bg: '#FFFFFF', bg2: '#F3F6FA', ink: '#0F1B2D', mu: '#4F5B6E', line: '#E1E6EE', pt: '#F2B400', hf: 'inherit', hw: 800, hls: '-.04em', qf: 'inherit', qw: 700, br: '8px', nf: 'inherit', r: '12px' },
      unfind: { bg: '#F9F6F2', bg2: '#FFFFFF', ink: '#2E2D29', mu: '#5F5B54', line: '#E5DED4', pt: '#175E54', hf: 'inherit', hw: 800, hls: '-.05em', qf: 'inherit', qw: 700, br: '999px', nf: 'inherit', r: '16px' },
      unsplit: { bg: '#FFFFFF', bg2: '#F1F6F3', ink: '#0F1A14', mu: '#4F5D55', line: '#E1E8E3', pt: '#E89B23', hf: 'inherit', hw: 800, hls: '-.045em', qf: 'inherit', qw: 700, br: '12px', nf: 'inherit', r: '16px' },
      unposter: { bg: '#FFFDF7', bg2: '#F7F1E3', ink: '#17150F', mu: '#5C5648', line: '#E6DFCD', pt: '#1F3A8A', hf: 'inherit', hw: 900, hls: '-.055em', qf: 'inherit', qw: 800, br: '0px', nf: 'inherit', r: '0px' },
      undark: { bg: '#0A0B10', bg2: '#14161F', ink: '#F3F4F8', mu: '#A6ABBB', line: '#272B38', pt: '#22D3EE', hf: 'inherit', hw: 800, hls: '-.045em', qf: 'inherit', qw: 700, br: '999px', nf: 'inherit', r: '20px', dark: 1 },
      unmag: { bg: '#FFFFFF', bg2: '#F6F1EC', ink: '#1A1412', mu: '#5E5450', line: '#E9E1DA', pt: '#0F766E', hf: 'inherit', hw: 850, hls: '-.05em', qf: "'Noto Serif KR','Noto Serif CJK KR',serif", qw: 500, br: '4px', nf: 'inherit', r: '4px' },
      unblock: { bg: '#FFFFFF', bg2: '#EEF6F7', ink: '#0B1B20', mu: '#4B5E63', line: '#DCE7E9', pt: '#F5B70A', hf: 'inherit', hw: 800, hls: '-.045em', qf: 'inherit', qw: 750, br: '999px', nf: 'inherit', r: '24px' },
      unoverlap: { bg: '#F4F3F1', bg2: '#FFFFFF', ink: '#1C1917', mu: '#57534E', line: '#E2DFDA', pt: '#EA580C', hf: 'inherit', hw: 800, hls: '-.04em', qf: 'inherit', qw: 700, br: '6px', nf: 'inherit', r: '6px' },
      univy: { bg: '#F6F2EA', bg2: '#EFE9DD', ink: '#1B1915', mu: '#55504A', line: '#D9D1C3', pt: '#B8893A', hf: "'Noto Serif KR','Noto Serif CJK KR',serif", hw: 700, hls: '-.03em', qf: "'Noto Serif KR','Noto Serif CJK KR',serif", qw: 500, br: '999px', nf: "'Noto Serif KR','Noto Serif CJK KR',serif" },
      uncine: { bg: '#FFFFFF', bg2: '#F3F4F6', ink: '#0E1621', mu: '#5A6472', line: '#E3E6EA', pt: '#FFB547', hf: 'inherit', hw: 800, hls: '-.04em', qf: 'inherit', qw: 700, br: '999px', nf: 'inherit' },
      uncollage: { bg: '#FBFAF7', bg2: '#F2F0EB', ink: '#111214', mu: '#62656C', line: '#E7E5E0', pt: '#FF6B3D', hf: 'inherit', hw: 800, hls: '-.045em', qf: 'inherit', qw: 750, br: '16px', nf: 'inherit' },
      unclassic: { bg: '#FAF8F3', bg2: '#FFFFFF', ink: '#18202C', mu: '#5B6270', line: '#E2DDD2', pt: '#B08D57', hf: "'Noto Serif KR','Noto Serif CJK KR',serif", hw: 700, hls: '-.02em', qf: "'Noto Serif KR','Noto Serif CJK KR',serif", qw: 500, br: '2px', nf: "'Noto Serif KR','Noto Serif CJK KR',serif" } }[th];
    const on = HPT.onColor ? HPT.onColor(a) : '#ffffff';
    let adk = mix(Rm[900] || mix(a, '#000000', .62), '#0B1220', .35); for (let k = 0; k < 8 && U.CR && U.CR('#ffffff', adk) < 9; k++) adk = mix(adk, '#000000', .2);
    const FB = P.dark ? '#ffffff' : '#000000'; const acct = fit(a, P.bg, 4.6, FB); const ptt = fit(P.pt, P.bg, 4.6, FB); const pton = U.CR && U.CR('#ffffff', P.pt) >= 4.5 ? '#ffffff' : fit(mix(P.pt, '#000000', .7), P.pt, 4.6, '#000000');
    const ptl = fit(mix(P.pt, '#ffffff', .25), adk, 4.6, '#ffffff');
    return Object.assign({}, P, { glow1: al(a, .55), glow2: al(P.pt, .35), a, on, adk, acct, ptt, pton, ptl, a2: mix(a, '#ffffff', .4), onm: al(on, .78), onl: al(on, .16), ph: mix(a, P.bg, .85), ph2: mix(a, P.bg, .7), line2: P.line, scr: al(adk, .88), scr2: al(adk, .58), ash: al(a, .6) }); }
  function themeCSS(s, partOnly) { const k = tok(s); if (!k) return ''; const th = s.theme;
    const v = `--u-a:${k.a};--u-on:${k.on};--u-adk:${k.adk};--u-acct:${k.acct};--u-pt:${k.pt};--u-ptt:${k.ptt};--u-pton:${k.pton};--u-ptl:${k.ptl};--u-a2:${k.a2};--u-onm:${k.onm};--u-onl:${k.onl};--u-bg:${k.bg};--u-bg2:${k.bg2};--u-ink:${k.ink};--u-mu:${k.mu};--u-line:${k.line};--u-line2:${k.line2};--u-ph:${k.ph};--u-ph2:${k.ph2};--u-hf:${k.hf};--u-hw:${k.hw};--u-hls:${k.hls};--u-qf:${k.qf};--u-qw:${k.qw};--u-br:${k.br};--u-nf:${k.nf};--u-scr:${k.scr};--u-scr2:${k.scr2};--u-ash:${k.ash};--u-bf:inherit;--u-r:${k.r || '20px'};--u-glow1:${k.glow1};--u-glow2:${k.glow2};--u-sbg:${th === 'uncollage' || th === 'unmag' ? '#ffffff' : th === 'unoverlap' ? k.bg : 'transparent'};--u-sbd:${['uncollage', 'uncine', 'unmag', 'undark', 'unsplit', 'unoverlap'].includes(th) ? k.line : th === 'unclassic' ? k.acct : k.ink}`;
    if (partOnly) return `\n/* v43.9 hp44-univ parts */.u4{${v}}`;
    return `\n/* v43.9 hp44-univ ${th} */${BR}{${v};background:${k.bg}}.u4{${v}}` + (HEROCSS[th] ? HEROCSS[th](k) : '') + chromeCSS(th, k); }
  /* 머리글 · 바닥글 다듬기(공통 부품의 겉모습만, 구조는 그대로) */
  function chromeCSS(th, k) { const B = BR;
    const solid = `${B} .hps-h{background:${k.bg}!important;border-bottom:1px solid ${k.line};box-shadow:none!important}${B} .hps-h .hps-hw{max-width:1200px;min-height:84px}${B} .hps-h .s2-mi>a{color:${k.mu}!important;font-weight:550}${B} .hps-h .s2-mi>a:hover{color:${k.ink}!important}${B} .hps-h .hps-wmk b,${B} .hps-h .logo{color:${k.ink}!important}`;
    const foot = `${B} .hps-f{background:${k.bg}!important;color:${k.mu}!important;border-top:1px solid ${k.ink}}${B} .hps-f :is(p,dt,dd,li,a,span,small){color:${k.mu}!important}${B} .hps-f .hps-fn{color:${k.ink}!important}`;
    if (th === 'univy') return solid + `${B} .hps-h .hps-wmk b{font-family:${k.hf};font-weight:700;letter-spacing:-.02em}${B} .hps-h .hps-cta{background:transparent!important;color:${k.ink}!important;box-shadow:inset 0 0 0 1px ${k.ink}!important;border-radius:999px!important}` + foot + `${B} .hps-f .hps-fn{font-family:${k.hf}}`;
    if (th === 'uncollage') return solid.replace(`border-bottom:1px solid ${k.line}`, 'border-bottom:0') + `${B} .hps-h .hps-wmk b{font-weight:800;letter-spacing:-.03em}${B} .hps-h .hps-cta{background:${k.ink}!important;color:#fff!important;border-radius:999px!important}` + foot.replace(`border-top:1px solid ${k.ink}`, `border-top:1px solid ${k.line}`);
    if (th === 'uncine') return `${B} .hps-h.hps-h-overlay .hps-cta{background:rgba(255,255,255,.16)!important;color:#fff!important;border-radius:999px!important;backdrop-filter:blur(8px)}${B} .hps-f{background:${k.adk}!important;border-top:1px solid ${k.onl}}${B} .hps-f :is(p,dt,dd,li,a,span,small){color:rgba(255,255,255,.72)!important}${B} .hps-f .hps-fn{color:#fff!important}`;
    if (th === 'unclassic') return `${B} .hps-h{background:${k.adk}!important;box-shadow:none!important;border:0}${B} .hps-h :is(a,b,span,.s2-mi>a){color:#fff!important}${B} .hps-h .s2-mi>a{font-weight:550;opacity:.92}${B} .hps-h .hps-wmk b{font-family:${k.hf};font-weight:700;letter-spacing:.08em;font-size:28px}${B} .hps-h .hps-c1{min-height:150px!important}${B} .hps-h .hps-c2{border-top:1px solid rgba(255,255,255,.14)}@media(max-width:760px){${B} .hps-h .hps-c1{min-height:64px!important}${B} .hps-h .hps-wmk{flex-direction:row!important;gap:10px!important;padding:0!important}${B} .hps-h .hps-wmk::before{width:28px!important;height:32px!important}${B} .hps-h .hps-wmk b{font-size:20px!important;letter-spacing:.04em!important;white-space:nowrap}}${B} .hps-h .hps-cta{background:${k.pt}!important;color:${k.pton}!important;border-radius:2px!important}${B} .hps-h .hps-ut{background:${mix(k.adk, '#000000', .3)}!important}${B} .hps-h .hps-wmk{display:inline-flex;flex-direction:column;align-items:center;gap:8px;padding:14px 0 6px}${B} .hps-h .hps-wmk::before{content:"";width:44px;height:50px;flex:0 0 auto;background:url("data:image/svg+xml,${encodeURIComponent(CREST('').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/currentColor/g, k.ptl))}") center/contain no-repeat}${BR} .hpt.u4.hp-s.u4-motto{background:${k.adk}}${B} .hps-f{background:${mix(k.adk, '#000000', .25)}!important;text-align:center}${B} .hps-f :is(p,dt,dd,li,a,span,small){color:rgba(255,255,255,.7)!important}${B} .hps-f .hps-fn{color:#fff!important;font-family:${k.hf};letter-spacing:.08em}`;
    if (th === 'undark') return `${B} .hps-h{background:${k.bg}!important;border-bottom:1px solid ${k.line};box-shadow:none!important}${B} .hps-h :is(a,b,span,.s2-mi>a){color:${k.ink}!important}${B} .hps-h .s2-mi>a{color:${k.mu}!important}${B} .hps-h .hps-cta{background:${k.a}!important;color:${k.on}!important;border-radius:999px!important}${B} .hps-h .hps-bg{color:${k.ink}}${B} .hps-f{background:${k.bg}!important;border-top:1px solid ${k.line}}${B} .hps-f :is(p,dt,dd,li,a,span,small){color:${k.mu}!important}${B} .hps-f .hps-fn{color:${k.ink}!important}${B} :is(.hp-s,.hps-s,section){color:${k.ink}}${B} .hps-faq,${B} .hp-faq{background:${k.bg}!important}${B} :is(.hp-faq,.hps-faq) :is(h2,h3,summary,p,b,strong,span){color:${k.ink}!important}${B} :is(.hp-faq,.hps-faq) details{background:${k.bg2}!important;border-color:${k.line}!important}`;
    if (th === 'unposter') return solid.replace(`border-bottom:1px solid ${k.line}`, `border-bottom:2px solid ${k.ink}`) + `${B} .hps-h .hps-wmk b{font-weight:900;letter-spacing:-.04em}${B} .hps-h .hps-cta{background:${k.ink}!important;color:${k.bg}!important;border-radius:0!important}` + foot.replace(`border-top:1px solid ${k.ink}`, `border-top:2px solid ${k.ink}`);
    if (th === 'unblock') return `${B} .hps-h{background:${k.a}!important;border:0;box-shadow:none!important}${B} .hps-h .hps-hw{max-width:1200px;min-height:84px}${B} .hps-h :is(a,b,span,.s2-mi>a,.hps-bg){color:${k.on}!important}${B} .hps-h .s2-mi>a{opacity:.82;font-weight:600}${B} .hps-h .hps-wmk b{font-weight:800;letter-spacing:-.03em}${B} .hps-h a.hps-cta.hps-cta{background:${k.on}!important;color:${k.a}!important;border-radius:999px!important}${B} .hps-h a.hps-cta.hps-cta *{color:${k.a}!important}` + foot.replace(`border-top:1px solid ${k.ink}`, `border-top:1px solid ${k.line}`);
    if (th === 'unblockOLD') return solid.replace(`border-bottom:1px solid ${k.line}`, 'border-bottom:0').replace(`background:${k.bg}!important`, `background:${k.a}!important`).replace(`color:${k.mu}!important;font-weight:550`, `color:${k.onm}!important;font-weight:600`).replace(`color:${k.ink}!important}`, `color:${k.on}!important}`) + `${B} .hps-h :is(.hps-login,.hps-bg){color:${k.on}!important}${B} .hps-h .hps-cta{background:${k.on}!important;color:${k.a}!important;border-radius:999px!important}` + foot;
    if (th === 'unportal') return solid + `${B} .hps-h .hps-ut{background:${k.a}!important}${B} .hps-h .hps-ut :is(a,span,em,b){color:${k.on}!important}${B} .hps-h .hps-wmk b{font-weight:800;letter-spacing:-.03em}${B} .hps-h .hps-cta{background:${k.a}!important;color:${k.on}!important;border-radius:8px!important}` + foot.replace(`border-top:1px solid ${k.ink}`, `border-top:4px solid ${k.a}`);
    if (th === 'unsplit' || th === 'unmag' || th === 'unoverlap' || th === 'unfind') return solid + `${B} .hps-h .hps-wmk b{font-weight:800;letter-spacing:-.03em}${B} .hps-h .hps-cta{background:${k.a}!important;color:${k.on}!important;border-radius:${k.br}!important}` + foot.replace(`border-top:1px solid ${k.ink}`, `border-top:1px solid ${k.line}`);
    return ''; }

  const FIX = `
.hps-login,.hps-tel,.hps-utt,.hps-utr a{min-height:44px;display:inline-flex!important;align-items:center}.hps-cta,.hps-hr .hps-cta{min-height:48px!important}.s2-mi>a{min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center}.hps-lw,.hp-all{min-height:44px;display:inline-flex!important;align-items:center}.hps-fl a,.hps-fc li a,.hps-fb a,.hps-lg a{display:inline-flex;align-items:center;min-height:44px;min-width:44px}a[href^="tel:"],a[href^="mailto:"]{display:inline-flex;align-items:center;min-height:44px}.hps-f li>a{min-height:44px;display:flex;align-items:center}.hps-tag,.hps-new{font-size:13px!important}.hpt dd small,.hpt .hps-fv small{font-size:13px!important}
/* v44.1: 공통 바닥글(CM) 사업자 정보 · 저작권 줄도 13px 이상, 머리글 메뉴 누르는 칸 44px(대학 관문) */footer.gf.hx-f :is(.hx-biz,.hps-cp),footer.gf.hx-f :is(.hx-biz,.hps-cp) *{font-size:13px!important}header .s2-mi>a,header .gn .s2-mi>a{min-height:44px!important}footer.gf.hx-f .hx-fc li a{min-height:44px!important;min-width:44px!important}`;

  { const base = siteHTML; siteHTML = (s, full, lang) => { try { USED.clear(); PHM.clear(); if (mine(s) && !s.stockOff) Object.values(DEFPH[s.theme] || {}).forEach(id => USED.add(id)); } catch (e) { }
    let s2 = s; try { if (mine(s)) { const c = (s.hps && typeof s.hps === 'object') ? s.hps : {}; const [h, f] = CH[s.theme]; const o = Object.assign({}, c); if (!c.ownH) { o.head = h; o.ownH = 1; } if (!c.ownF && !c.foot) o.foot = f; /* v44.1: ownF를 붙이지 않는다 — 공통 바닥글(PC 4열 · 휴대폰 아코디언 + 전화, hpsec-trust CM)이 적용되도록 */ s2 = Object.assign({}, s, { hps: o }); } } catch (e) { s2 = s; }
    const out = base(s2, full, lang); if (!s || !Array.isArray(s.sections)) return out;
    try { const part = s.sections.some(x => x && x.type === 'text' && x.data && R[x.data.hpt]); const me = mine(s); if (!part && !me) return out;
      const tv = me ? themeCSS(s) : themeCSS(Object.assign({}, s, { theme: 'univy' }), true);
      return out.replace('</style>', (FIX + CORE + tv).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hp44-univ css', e); return out; } }; window.siteHTML = siteHTML; }

  /* ── 공통 등록 도우미(갤러리 추천: 대학 기관에서 이 묶음을 앞에) ── */
  if (!HPT.xtag) { HPT.xtag = {};
    if (typeof HPT.premFits === 'function') { const f0 = HPT.premFits; HPT.premFits = (id, ty) => { const g = HPT.xtag[id]; if (!g) return f0(id, ty); ty = ty || (() => { try { return S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type; } catch (e) { return ''; } })(); return g.includes(ty) || g.includes(ty === 'univ_lms' ? 'univ' : ty); }; }
    if (typeof HPT.premFor === 'function') { const f0 = HPT.premFor; HPT.premFor = ty => { const L = f0(ty); const X = Object.keys(HPT.xtag); const fit1 = X.filter(id => HPT.premFits(id, ty)); return [...fit1, ...L.filter(id => !X.includes(id)), ...X.filter(id => !fit1.includes(id))]; }; }
    if (typeof HPT.thumb === 'function') { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!HPT.xtag[id] || typeof siteHTML !== 'function') return tb(s, id);
      try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.theme === id && t.prem); if (tp && typeof tp.build === 'function') b.sections = tp.build(); return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpv thumb', e); return tb(s, id); } }; } }

  /* ── 테마 · 글자 토큰 · 템플릿 ── */
  /* 세부 유형(sub) · 첫 화면 구성(form) — 10종이 서로 다른 첫 화면을 갖는다 */
  const D0 = (o) => Object.assign({ tags: ['univ', 'univ_lms'], tone: 'light', dens: '여유', illu: 'campus', card: 'flat', vis: 'photo', look: 'clean', base: 'clean', ck: 'photo', sh: 'none', r: 16, br: 999 }, o);
  const DEF = {
    unportal: D0({ name: '본부 학사 포털', sub: '대학 본부 · 학사 포털', form: '사진 + 기관 색 패널 · 아이콘 빠른 메뉴', desc: '넓은 캠퍼스 사진과 기관 색 패널 · 아이콘 빠른 메뉴 6개(수강 · 학사 일정 · 공지 · 강의실 · 로그인 · 이수) · 공지와 학사 일정 2단 — 국내 대학 본부 홈페이지 구성을 참고한 학사 포털', dens: '보통',
      acc: '#1D4E89', bg: '#FFFFFF', alt: '#F3F6FA', ink: '#0F1B2D', mu: '#4F5B6E', hero: 'split', look: 'campus', base: 'campus', sw2: '#F2B400', hk: 'unportal', r: 12, br: 8 }),
    unfind: D0({ name: '학사 길잡이', sub: '학사 안내 · 학기 흐름', form: '질문형 가운데 제목 + 사진 3분할', desc: '「무엇을 찾나요」식 가운데 큰 제목 · 큰 바로 가기 4개 · 넓은 사진 3분할 · 학기 흐름 4단계 · 학사 일정 — 해외 대학 학사 안내(Registrar) 구성을 참고한 학사용',
      acc: '#8C1515', bg: '#F9F6F2', alt: '#FFFFFF', ink: '#2E2D29', mu: '#5F5B54', hero: 'split', sw2: '#175E54', hk: 'unfind', r: 16 }),
    uncine: D0({ name: '시네마틱 캠퍼스', sub: '비교과 센터', form: '전면 사진', desc: '화면을 가득 채운 캠퍼스 사진 · 큰 한 문장 · 기관 색 바로 가기 띠 · 세로 사진 카드 · 사진 띠 — 재학생이 비교과를 고르고 신청하는 첫 화면',
      acc: '#0B3A66', bg: '#FFFFFF', alt: '#F3F4F6', ink: '#0E1621', mu: '#5A6472', hero: 'full', look: 'campus', base: 'campus', sw2: '#072845', hk: 'uncine', r: 20 }),
    unsplit: D0({ name: '오늘의 강의실', sub: '학사 LMS 강의실', form: '좌우 분할', desc: '왼쪽 큰 글 · 오른쪽 밝은 사진 분할 · 학사 일정과 공지 먼저 · 한 줄 목록형 교과목 — 재학생이 매일 들어와 수업을 이어 듣는 학사 LMS',
      acc: '#166534', bg: '#FFFFFF', alt: '#F1F6F3', ink: '#0F1A14', mu: '#4F5D55', hero: 'split', sw2: '#0B3D21', hk: 'unsplit', br: 12 }),
    uncollage: D0({ name: '열린 캠퍼스 콜라주', sub: '열린 강좌 · 평생', form: '가운데 제목 + 콜라주', desc: '가운데 큰 제목 · 높낮이가 다른 사진 콜라주 · 「저는 ○○예요」 바로 가기 — 지역 주민 · 재학생 누구나 강좌를 찾는 열린 캠퍼스',
      acc: '#2C46E0', bg: '#FBFAF7', alt: '#F2F0EB', ink: '#111214', mu: '#62656C', hero: 'split', sw2: '#1A2C9E', hk: 'uncollage', r: 24, br: 16 }),
    unclassic: D0({ name: '전통 대학', sub: '전통 대학 본부', form: '전통 · 격식', desc: '교표 · 가운데 기관명 · 세리프 · 대칭 구성 · 학사 공지 · 일정 · 행사 정돈 · 교육 이념 — 격식 있는 대학 본부', tone: 'light', dens: '보통',
      acc: '#132A4F', bg: '#FAF8F3', alt: '#FFFFFF', ink: '#18202C', mu: '#5B6270', hero: 'full', look: 'campus', base: 'campus', sw2: '#0C1D38', hk: 'unclassic', r: 0, br: 2 }),
    univy: D0({ name: '에디토리얼 대학원', sub: '대학원', form: '잡지형 세리프', desc: '크림 바탕 · 세리프 큰 제목 · 넓은 사진 한 장 · 목차형 과정 목록 · 큰 숫자 하나 — 연구의 깊이를 보여 주는 대학원',
      acc: '#7A1F2B', bg: '#F6F2EA', alt: '#EFE9DD', ink: '#1B1915', mu: '#55504A', hero: 'split', look: 'campus', base: 'campus', sw2: '#5E1520', hk: 'univy', r: 4 }),
    unposter: D0({ name: '포스터 교수학습', sub: '교수학습지원센터', form: '포스터 타이포', desc: '기관 색 전면 · 아주 큰 글자 · 사진 한 장 · 워크숍 4단계 — 교수자가 수업 설계 · 워크숍 · 컨설팅을 신청하는 교수학습지원센터',
      acc: '#BE123C', bg: '#FFFDF7', alt: '#F7F1E3', ink: '#17150F', mu: '#5C5648', hero: 'split', sw2: '#7F1D1D', hk: 'unposter', r: 0, br: 0 }),
    undark: D0({ name: '다크 이노베이션', sub: '산학 · 창업', form: '다크 시네마틱', desc: '검은 바탕 · 빛나는 큰 제목 · 넓은 사진 · 창업 4단계 · 협력 문의 — 창업 · 산학 협력 프로그램을 여는 센터', tone: 'dark',
      acc: '#7C5CFF', bg: '#0A0B10', alt: '#14161F', ink: '#F3F4F8', mu: '#A6ABBB', hero: 'dark', sw2: '#22D3EE', hk: 'undark', r: 20 }),
    unmag: D0({ name: '글로벌 매거진', sub: '국제 · 어학원', form: '잡지 표지', desc: '잡지 표지 같은 왼쪽 큰 글 · 높이가 다른 사진 두 장 · 가로 카드 · 인용 — 유학생 · 재학생이 어학 · 교류 프로그램을 찾는 국제 · 어학원',
      acc: '#B4472B', bg: '#FFFFFF', alt: '#F6F1EC', ink: '#1A1412', mu: '#5E5450', hero: 'split', sw2: '#0F766E', hk: 'unmag', r: 4, br: 4 }),
    unblock: D0({ name: '커리어 블록', sub: '취업 · 진로센터', form: '색 블록 + 아치 사진', desc: '기관 색 블록 · 큰 흰 제목 · 걸쳐 내려오는 아치 사진 · 진로 4단계 · 가로 프로그램 카드 · 상담 문의 — 취업 · 진로 상담과 프로그램을 신청하는 센터',
      acc: '#0E7490', bg: '#FFFFFF', alt: '#EEF6F7', ink: '#0B1B20', mu: '#4B5E63', hero: 'split', sw2: '#164E63', hk: 'unblock', r: 24 }),
    unoverlap: D0({ name: '현장 실무 캠퍼스', sub: '전문대 · 실무', form: '사진 + 겹친 카드', desc: '넓은 현장 사진 위로 걸친 흰 카드 · 실습 4단계 · 가로 과정 카드 · 학사 일정 — 실습 · 현장 실무 중심 전문대학', dens: '보통',
      acc: '#292524', bg: '#F4F3F1', alt: '#FFFFFF', ink: '#1C1917', mu: '#57534E', hero: 'split', sw2: '#EA580C', hk: 'unoverlap', r: 6, br: 6 }) };
  const HD0 = (o) => Object.assign({ hf: 'sans', hw: 800, hls: -0.045, h1: 84, h1m: 40, lh1: 1.1, h2: 52, h2m: 32, h3: 20, body: 17, blh: 1.65, lead: 19, ey: { fs: 15, ls: 0, fw: 650, tt: 'none' }, sec: 140, secm: 84, w: 1200, gut: 40, r: 16, rs: 10, br: 999, bh: 58, bpx: 30, bfw: 700, bls: -0.01, bd: '1px solid rgba(0,0,0,.08)', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' }, o);
  const HD = { unportal: HD0({ h1: 64, h1m: 38, lh1: 1.14, r: 12, br: 8, em: 'plain' }), unfind: HD0({ hls: -0.05, h1: 76, h1m: 40, r: 16 }), uncine: HD0({ h1: 90, h1m: 42, lh1: 1.08, h2: 58, h2m: 34, r: 20, em: 'plain' }), unsplit: HD0({ h1: 64, br: 12 }), uncollage: HD0({ hls: -0.05, r: 24, br: 16 }),
    unclassic: HD0({ hf: 'serif', hw: 700, hls: -0.02, h1: 70, h1m: 36, lh1: 1.26, h2: 46, h2m: 30, ey: { fs: 14, ls: 0.16, fw: 600, tt: 'uppercase' }, r: 0, rs: 0, br: 2, bh: 56, hov: 'border', em: 'plain', link: 'underline' }),
    univy: HD0({ hf: 'serif', hw: 700, hls: -0.03, h1: 86, lh1: 1.14, ey: { fs: 15, ls: 0.04, fw: 650, tt: 'none' }, r: 4, rs: 3, hov: 'line', link: 'underline' }),
    unposter: HD0({ hw: 900, hls: -0.055, h1: 112, h1m: 46, lh1: 1.02, r: 0, rs: 0, br: 0, hov: 'border', em: 'plain' }), undark: HD0({ h1: 92, h1m: 42, lh1: 1.06, r: 20 }),
    unmag: HD0({ hw: 850, hls: -0.05, h1: 80, h1m: 42, lh1: 1.08, r: 4, br: 4 }), unblock: HD0({ h1: 88, h1m: 42, lh1: 1.06, r: 24, em: 'plain' }), unoverlap: HD0({ h1: 72, h1m: 38, r: 6, br: 6 }) };
  const cssX = () => '';
  const S2x = (type, data) => (typeof S2 === 'function' ? S2(type, data) : { id: 'x' + Math.random().toString(36).slice(2, 9), type, data });
  /* cols가 비면 hpwiz가 「빈 섹션」으로 자동 숨김 → 자동 데이터 부품은 자리표시 한 줄(값 없음)을 둔다 */
  const AUTO = () => [['자동 표시', '']];
  const P = (hpt, o) => S2x('text', Object.assign({ variant: 'features', hpt, eyebrow: '', title: '', sub: '', cols: AUTO() }, o || {}));
  /* 공통 신뢰 부품(hpsec-trust CM: hx-rev · fac · num · faq · loc) — 데이터가 없으면 게시본에서 자동으로 숨는다 */
  const HX = (k, d, hide) => { try { return window.HPX && typeof HPX.sec === 'function' ? HPX.sec(k, Object.assign({ cols: [['자동 표시', '']] }, d || {}), hide) : null; } catch (e) { return null; } };
  const L0 = a => a.filter(Boolean);
  const WHO_OPEN = [['지역 주민', '열린 강좌 보기', '열린 강좌 · 수강 신청'], ['재학생', '학번으로 로그인', '비교과 · 교과목'], ['교수자', '공지 보기', '수업 운영 · 공지'], ['협력 기관', '함께 강좌 열기', '산학 · 지역 협력']];
  const T = {
    unportal: { scene: '대학 본부 학사 포털 — 학생 · 교직원이 첫 화면 아래 빠른 메뉴로 수강 · 학사 일정 · 공지 · 강의실에 바로 가는 구성', purpose: ['info', 'learn'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '배움과 연구가\n만나는 캠퍼스', sub: '수강 신청부터 학사 일정, 공지, 온라인 강의실까지. 학생과 교직원이 자주 찾는 학사 메뉴를 한곳에 모았어요.', cta: '수강 신청하기', cta2: '학번으로 로그인' }),
        P('u4-calband', { title: '다가오는 학사 일정' }),
        P('u4-news', { title: '학교 소식' }),
        P('u4-cls', { view: 'card', eyebrow: '이번 학기', title: '비교과 · 특강 신청', n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('u4-gallery', { title: '캠퍼스 생활', cols: [['도서관', '시험 기간에도 자리가 넉넉해요'], ['강의실', '토론과 발표가 쉬운 모둠 강의실'], ['라운지', '수업 사이에 쉬어 가는 곳']] }),
        HX('loc', { title: '캠퍼스 오시는 길 · 연락처' }),
        P('u4-close', { view: 'center', title: '필요한 학사 업무,\n여기서 시작해요.', sub: '학번으로 로그인하면 내 수강 · 이수 현황을 바로 볼 수 있어요.', cta: '수강 신청하기', cta2: '학번으로 로그인', cols: [['신청', ''], ['연락처', '']] })]) },
    unfind: { scene: '학사 안내 · 학기 흐름 — 학생이 가운데 질문형 첫 화면에서 수강 · 일정 · 공지 · 강의실로 바로 가고, 학기 흐름을 확인하는 구성', purpose: ['info', 'learn'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '학사, 어디서부터\n[찾으세요?]', sub: '수강 신청 · 학사 일정 · 공지 · 강의실. 이번 학기에 필요한 것을 한 번에 찾아 드려요.', cta: '학번으로 로그인', cta2: '학사 일정 보기' }),
        P('u4-steps', { title: '한 학기는\n이렇게 흘러가요', cta: '학사 일정 전체 보기', go: '#cal', cols: [['수강 신청', '개강 전 과목을 고르고 신청해요'], ['수업 · 과제', '온라인 강의실에서 듣고 과제를 내요'], ['시험', '중간 · 기말고사 일정을 확인해요'], ['이수 · 성적', '이수증과 배지를 바로 확인해요']] }),
        P('u4-calband', { title: '이번 달 학사 일정' }),
        P('u4-news', { title: '학사 소식' }),
        P('u4-cls', { view: 'row', eyebrow: '이번 학기 개설 과목', title: '지금 신청할 수 있어요', n: 5, cols: [['강좌', '공개 강좌 자동 표시']] }),
        HX('faq', { title: '학사 자주 묻는 질문' }),
        P('u4-close', { view: 'navy', title: '이번 학기도,\n차근차근 함께해요.', sub: '학번으로 로그인하면 내 학사 정보가 한 화면에 모여요.', cta: '개설 과목 보기', cta2: '학번으로 로그인', cols: [['신청', ''], ['로그인', '']] })]) },
    uncine: { scene: '비교과 센터 — 재학생이 전면 사진 첫 화면에서 비교과를 고르고 신청 · 이수까지 이어 가는 구성', purpose: ['learn', 'apply', 'info'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '다음 학기의 나를,\n지금 만들어요.', sub: '비교과부터 온라인 강의실, 디지털 배지까지. 모든 배움이 학번 하나로 이어져요.', cta: '비교과 신청하기', cta2: '학번으로 로그인' }),
        P('u4-cls', { view: 'tall', title: '이번 학기,\n이런 걸 배워요.', n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('u4-band', { title: '강의실 문이 닫혀도,\n수업은 계속돼요.', cols: [['24시간', '언제든 수강'], ['이어 보기', '멈춘 곳부터'], ['바로 발급', '이수증 · 배지']] }),
        P('u4-big', { view: 'mist', sub: '마치면 디지털 배지와 이수증이 바로 발급돼요.', cols: [['큰 숫자', '발급 배지 · 이수증 · 강좌 수']] }),
        P('u4-open', { title: '학교 문은\n지역에도 열려 있어요.', cols: [['열린 강좌', ''], ['문의', ''], ['오시는 길', '']] }),
        P('u4-quote', { view: 'center', quote: '신청은 가볍게, 배움은 깊게. 한 학기의 경험이 다음 학기의 나를 만들어요.', by: '', cols: [['인용', '기관의 한마디']] }),
        HX('faq'),
        P('u4-close', { view: 'navy', title: '신청은 1분이면 충분해요.', sub: '학번으로 로그인하고, 듣고 싶은 프로그램을 고르면 끝이에요.', cta: '비교과 신청하기', cta2: '학번으로 로그인', cols: [['신청', ''], ['로그인', '']] })]) },
    unsplit: { scene: '학사 LMS 강의실 — 재학생이 매일 들어와 일정 · 공지를 먼저 보고, 교과목을 이어 듣는 구성', purpose: ['learn', 'info'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '오늘 들을 수업,\n[여기서 바로] 이어서.', sub: '수강 중인 교과목 · 과제 · 학사 일정을 한 화면에서 확인해요. 멈춘 곳부터 이어서 들어요.', cta: '학번으로 로그인', cta2: '내 학습 현황' }),
        P('u4-quick', { extra: [] }),
        P('u4-board', { view: 'text', title: '이번 주 학사 일정', title2: '공지사항', cols: [['학사 일정', ''], ['공지', '']] }),
        P('u4-cls', { view: 'row', eyebrow: '이번 학기 교과목', title: '수강 중인 과목을\n한 줄로 확인해요', n: 5, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('u4-lms', { title: '듣고, 내고,\n확인하는 곳.', sub: '강의 영상 · 과제 · 퀴즈 · 질문을 한 강의실에서 해결해요.', cols: [['강의 듣기', '멈춘 곳부터 이어서, 휴대폰에서도 그대로'], ['과제 · 퀴즈 내기', '마감 전에 알림을 보내 드려요'], ['출석 · 성적 확인', '내 학습 화면에서 바로 확인해요']] }),
        P('u4-medal', { title: '이수하면\n배지가 쌓여요.', cols: [['배지', '발급 배지']] }),
        HX('faq'),
        P('u4-close', { view: 'center', title: '오늘 수업,\n지금 이어서 들어요.', sub: '학번으로 로그인하면 내 강의실이 바로 열려요.', cta: '교과목 보기', cta2: '학번으로 로그인', cols: [['신청', ''], ['연락처', '']] })]) },
    uncollage: { scene: '열린 강좌 · 평생 — 지역 주민 · 재학생 누구나 콜라주 첫 화면에서 강좌를 찾고 신청하는 열린 캠퍼스', purpose: ['learn', 'apply'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '듣고 싶던 강좌,\n[학교 안에] 다 있어요.', sub: '지역 주민도, 재학생도. 열린 강좌를 한곳에서 찾고, 신청하고, 이수까지 확인해요.', cta: '강좌 찾아보기', cta2: '학번으로 로그인' }),
        P('u4-who', { who: WHO_OPEN.map(r => r.slice()), cols: WHO_OPEN.map(r => r.slice(0, 2)) }),
        P('u4-cls', { view: 'card', title: '지금 신청할 수 있어요', n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        HX('rev', { title: '수강생 이야기' }),
        HX('loc', { title: '수강 문의와 오시는 길' }),
        P('u4-close', { view: 'center', title: '이번 학기,\n무엇을 배워 볼까요?', sub: '마감이 가까운 강좌부터 보여 드려요.', cta: '강좌 찾아보기', cta2: '학번으로 로그인', cols: [['신청', ''], ['연락처', '']] })]) },
    unclassic: { scene: '전통 대학 본부 — 교표 · 가운데 기관명 머리글, 세리프 제목, 학사 공지 · 일정 · 행사를 정돈한 격식 있는 구성', purpose: ['info', 'learn', 'apply'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '깊이 배우고,\n넓게 나누는 사람', sub: '비교과 · 교과 · 열린 강좌를 한곳에서 신청하고, 이수까지 확인해요.', cta: '프로그램 신청하기', cta2: '학번으로 로그인' }),
        P('u4-board', { view: 'cols3', title: '학사 일정', title2: '공지사항', title3: '다가오는 프로그램', cols: [['공지', ''], ['학사 일정', ''], ['프로그램', '']] }),
        P('u4-cls', { view: 'frame', eyebrow: 'PROGRAMS', title: '이번 학기 프로그램', n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('u4-motto', { eyebrow: '교육 이념', quote: '진리를 탐구하고, 배운 것을 넓게 나누는 사람을 기른다.', since: '', cols: [['교육 이념', ''], ['수치', '']] }),
        HX('faq'),
        P('u4-close', { view: 'split', title: '산학 협력과\n열린 강좌 문의', sub: '지역 기관 · 기업과 함께하는 강좌, 시민을 위한 열린 강좌를 운영해요.', cta: '열린 강좌 보기', cta2: '전화로 문의하기', cols: [['문의', '']] })]) },
    univy: { scene: '대학원 — 크림 바탕 세리프 제목과 넓은 사진 한 장, 목차형 과정 목록으로 연구의 깊이를 보여 주는 구성', purpose: ['learn', 'apply', 'info'],
      build: () => L0([S2x('banner', { eyebrow: '대학원 · 연구 과정', title: '질문 하나를,\n[끝까지 파고드는 곳.]', sub: '연구 방법론부터 학술 글쓰기, 논문 지도까지. 대학원생에게 열린 과정과 세미나를 만나 보세요.', cta: '과정 둘러보기', cta2: '학번으로 로그인' }),
        P('u4-story', { eyebrow: '연구의 시간', title: '한 학기마다\n연구의 깊이를 더해요.', body: '세미나 · 콜로키움 · 논문 지도를 한곳에서 신청하고, 이수 기록은 학위 과정과 함께 남아요.', cols: [['이야기', '글 + 사진']] }),
        P('u4-cls', { view: 'index', eyebrow: '이번 학기 과정', title: '지금 신청할 수 있어요', n: 4, cols: [['강좌', '공개 강좌 자동 표시']] }),
        HX('fac', { title: '지도 교수진' }),
        P('u4-big', { view: 'brand', eyebrow: '이수 · 디지털 배지', cols: [['큰 숫자', '발급 배지 · 이수증 · 강좌 수']] }),
        P('u4-quote', { view: 'photo', quote: '좋은 연구는 좋은 질문에서 시작해요. 그 질문을 함께 다듬는 곳이 되고 싶어요.', by: '', cols: [['인용', '기관의 한마디']] }),
        P('u4-board', { view: 'text', title: '놓치면 안 되는 날', title2: '새 소식', cols: [['학사 일정', ''], ['공지', '']] }),
        P('u4-close', { view: 'photo', title: '이번 학기,\n하나의 질문을 시작해요.', sub: '신청부터 이수 확인까지 학번 하나로 이어져요.', cta: '과정 둘러보기', cta2: '문의하기', cols: [['신청', ''], ['문의', '']] })]) },
    unposter: { scene: '교수학습지원센터 — 교수자가 포스터 같은 첫 화면에서 워크숍 · 수업 설계 컨설팅을 찾고 신청하는 구성', purpose: ['learn', 'apply'],
      build: () => L0([S2x('banner', { eyebrow: '', mark: 'TEACHING & LEARNING', title: '더 좋은 수업은,\n함께 설계해요.', sub: '수업 설계 워크숍 · 1:1 컨설팅 · AI 활용 연수까지. 교수자와 조교를 위한 프로그램을 신청하세요.', cta: '워크숍 신청하기', cta2: '교수자 로그인' }),
        P('u4-steps', { title: '수업이 바뀌는\n네 걸음', view: 'card', cta: '프로그램 전체 보기', cols: [['워크숍', '수업 설계 · 평가 · AI 활용 연수에 참여해요'], ['컨설팅', '내 강의를 함께 보며 1:1로 다듬어요'], ['수업 적용', '이번 학기 강의에 바로 적용해요'], ['나눔', '좋은 수업 사례를 동료와 나눠요']] }),
        P('u4-cls', { view: 'card', title: '이번 학기 워크숍', n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        HX('fac', { title: '함께하는 교수 · 컨설턴트' }),
        P('u4-quote', { view: 'center', quote: '학생이 달라지는 수업은, 교수자가 함께 고민할 때 만들어져요.', by: '', cols: [['인용', '기관의 한마디']] }),
        P('u4-board', { view: 'text', title: '연수 일정', title2: '센터 소식', cols: [['학사 일정', ''], ['공지', '']] }),
        P('u4-close', { view: 'center', title: '다음 학기 수업,\n지금 함께 준비해요.', sub: '로그인하면 신청한 워크숍과 이수 기록을 한곳에서 볼 수 있어요.', cta: '워크숍 신청하기', cta2: '교수자 로그인', cols: [['신청', ''], ['연락처', '']] })]) },
    undark: { scene: '산학 · 창업 — 다크 시네마틱 첫 화면에서 창업 프로그램과 산학 협력 문의로 이어지는 구성', purpose: ['apply', 'info'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '아이디어가\n[회사가 되는 곳.]', sub: '창업 강좌부터 시제품 제작, 투자 연계까지. 학생 · 교원 · 기업이 함께 만드는 산학 협력 프로그램이에요.', cta: '프로그램 보기', cta2: '협력 문의하기' }),
        P('u4-steps', { title: '창업은\n네 단계로 함께해요', cols: [['아이디어', '창업 강좌와 팀 빌딩으로 시작해요'], ['검증', '고객 인터뷰와 시제품으로 확인해요'], ['성장', '멘토링과 기업 협업으로 키워요'], ['연결', '투자 · 지원 사업과 이어 드려요']] }),
        P('u4-cls', { view: 'tall', title: '지금 열린\n창업 · 산학 프로그램', n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('u4-band', { title: '강의실 밖에서,\n진짜 문제를 풀어요.', sub: '기업이 낸 과제를 학생 팀이 풀고, 결과물은 포트폴리오로 남아요.', cta: '학번으로 로그인', cols: [['기업 과제', '실제 문제'], ['멘토링', '현업 전문가'], ['결과 공유', '데모데이']] }),
        P('u4-open', { title: '기업 · 기관과\n함께 만들어요.', sub: '공동 강좌 · 기업 과제 · 인턴십을 함께 열 기관을 찾고 있어요.', l1: '산학 프로그램 보기', cols: [['열린 강좌', ''], ['문의', ''], ['오시는 길', '']] }),
        HX('faq'),
        P('u4-close', { view: 'navy', title: '다음 팀은,\n여러분이에요.', sub: '프로그램을 고르고 학번으로 신청하면 끝이에요.', cta: '프로그램 보기', cta2: '학번으로 로그인', cols: [['신청', ''], ['로그인', '']] })]) },
    unmag: { scene: '국제 · 어학원 — 잡지 표지 같은 첫 화면에서 어학 · 교류 프로그램을 고르는 구성', purpose: ['learn', 'apply'],
      build: () => L0([S2x('banner', { eyebrow: '', mark: 'GLOBAL CAMPUS', title: '언어 하나가,\n[세계를 넓혀요.]', sub: '영어 · 중국어 · 일본어 · 한국어 과정과 교환학생 준비까지. 재학생과 유학생 모두를 위한 국제 · 어학 프로그램이에요.', cta: '어학 과정 보기', cta2: '학번으로 로그인' }),
        P('u4-cls', { view: 'wide', eyebrow: '이번 학기 어학 과정', title: '수준별로\n골라 들어요', n: 4, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('u4-story', { eyebrow: '교류 · 연수', title: '교실에서 배운 말로,\n다른 도시를 걸어요.', body: '어학 과정을 마치면 교환학생 · 해외 연수 프로그램으로 이어갈 수 있어요. 이수 기록은 지원 서류에 그대로 쓸 수 있어요.', cols: [['이야기', '글 + 사진']] }),
        HX('rev', { title: '수강생 이야기' }),
        P('u4-board', { view: 'text', title: '시험 · 모집 일정', title2: '국제 소식', cols: [['학사 일정', ''], ['공지', '']] }),
        P('u4-close', { view: 'center', title: '이번 학기,\n어떤 언어로 시작할까요?', sub: '수준을 몰라도 괜찮아요. 과정마다 수준 안내가 있어요.', cta: '어학 과정 보기', cta2: '학번으로 로그인', cols: [['신청', ''], ['연락처', '']] })]) },
    unblock: { scene: '취업 · 진로센터 — 색 블록 첫 화면에서 진로 상담 · 취업 프로그램 4단계와 신청으로 이어지는 구성', purpose: ['apply', 'learn'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '졸업 다음 날,\n준비된 나로.', sub: '진로 상담부터 자기소개서 · 면접 · 현장실습까지. 학년에 맞는 취업 프로그램을 골라 신청하세요.', cta: '취업 프로그램 보기', cta2: '학번으로 로그인' }),
        P('u4-steps', { title: '학년별로\n이렇게 준비해요', cols: [['진로 탐색', '1 · 2학년 — 적성 검사와 진로 상담'], ['역량 쌓기', '직무 특강과 자격 · 어학 준비'], ['실전 준비', '자기소개서 · 모의 면접 · 포트폴리오'], ['취업 연결', '현장실습 · 채용 연계 · 졸업 후 상담']] }),
        P('u4-cls', { view: 'wide', eyebrow: '지금 신청할 수 있어요', title: '이번 학기\n취업 프로그램', n: 4, cols: [['강좌', '공개 강좌 자동 표시']] }),
        HX('rev', { title: '먼저 취업한 선배 이야기' }),
        P('u4-open', { title: '혼자 고민하지\n말고 물어보세요.', sub: '진로 상담은 학년과 상관없이 신청할 수 있어요.', l1: '취업 프로그램 보기', cols: [['열린 강좌', ''], ['문의', ''], ['오시는 길', '']] }),
        HX('faq'),
        P('u4-close', { view: 'center', title: '오늘 하나만\n신청해 보세요.', sub: '학번으로 로그인하면 내 학년에 맞는 프로그램을 골라 드려요.', cta: '취업 프로그램 보기', cta2: '학번으로 로그인', cols: [['신청', ''], ['연락처', '']] })]) },
    unoverlap: { scene: '전문대 · 실무 — 현장 사진과 겹친 카드 첫 화면에서 실습 4단계 · 과정 · 학사 일정으로 이어지는 구성', purpose: ['learn', 'apply', 'info'],
      build: () => L0([S2x('banner', { eyebrow: '', title: '손으로 배우고,\n[현장에서 증명해요.]', sub: '실습실에서 익히고, 현장실습으로 확인하고, 자격증으로 남겨요. 실무 중심 과정을 만나 보세요.', cta: '실무 과정 보기', cta2: '학번으로 로그인' }),
        P('u4-steps', { title: '실습에서 취업까지\n네 걸음', view: 'card', cols: [['기초 실습', '실습실에서 장비와 기본기를 익혀요'], ['프로젝트', '실제 과제로 결과물을 만들어요'], ['현장실습', '산업체에서 직접 일해 봐요'], ['자격 · 취업', '자격증과 채용으로 이어져요']] }),
        P('u4-cls', { view: 'wide', eyebrow: '이번 학기 실무 과정', title: '지금 신청할 수 있어요', n: 4, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('u4-story', { eyebrow: '실습 환경', title: '현장과 같은 장비로\n먼저 연습해요.', body: '실습실 · 공방 · 스튜디오에서 수업이 이뤄져요. 이수 기록과 결과물은 포트폴리오로 남아요.', cols: [['이야기', '글 + 사진']] }),
        HX('fac', { title: '현장 출신 교수진' }),
        P('u4-board', { view: 'text', title: '학사 · 실습 일정', title2: '공지사항', cols: [['학사 일정', ''], ['공지', '']] }),
        HX('loc'),
        P('u4-close', { view: 'photo', title: '이번 학기,\n직접 만들어 봐요.', sub: '과정을 고르고 학번으로 신청하면 끝이에요.', cta: '실무 과정 보기', cta2: '문의하기', cols: [['신청', ''], ['문의', '']] })]) } };
  /* 배치 보강(HPT.enrich): 이 묶음 템플릿은 숫자 띠 · 공지 · 일정 자동 섹션을 넣지 않는다(첫 화면 바로 아래 덩어리와 겹침) */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hp44u) { const e0 = HPT.enrich; const f = s => { const r = e0(s); try { const L = s && s.sections; if (mine(s) && Array.isArray(L) && L.some(x => x && x.data && /^u4-/.test(x.data.hpt || ''))) { for (let k = L.length - 1; k >= 0; k--) { const x = L[k]; if (x && !x.hpxKeep && (x.type === 'notices' || (x.type === 'text' && x.data && (x.data.hpt === 'sched' || x.data.hpt === 'facts' || x.data.variant === 'stats')))) L.splice(k, 1); }
          const ci = L.findIndex(x => x && x.data && x.data.hpt === 'u4-close'); if (ci >= 0 && ci < L.length - 1) L.push(L.splice(ci, 1)[0]); /* 마지막 행동은 맨 끝(자동 FAQ 뒤) */ } } catch (e) { console.error('hp44-univ enrich', e); } return r; }; Object.keys(e0).forEach(k => { f[k] = e0[k]; }); f.hp44u = 1; HPT.enrich = f; }

  IDS.forEach(id => { if (!HPT.reg(id, Object.assign({ prem: 1, cssX }, DEF[id]))) return; if (HPT.xtag) HPT.xtag[id] = DEF[id].tags.slice();
    try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hp44-univ HPD', e); }
    if (typeof TPL !== 'undefined' && !TPL.some(t => t.id === 't44-' + id)) TPL.push({ id: 't44-' + id, name: DEF[id].name, types: ['univ', 'univ_lms'], g44: 1, sub: DEF[id].sub, form: DEF[id].form, scene: T[id].scene, color: DEF[id].acc, tone: id === 'unclassic' ? '클래식' : DEF[id].tone === 'dark' ? '다크' : '모던', look: DEF[id].look, theme: id, hero: '', purpose: T[id].purpose, prem: 1, noPalette: true, build: T[id].build }); });
})();
