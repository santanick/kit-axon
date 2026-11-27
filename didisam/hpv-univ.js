/* v43.9 hpv-univ — 대학 묶음 홈페이지 템플릿 4종(디자이너 D1). 시안: plan/tpl439/D1/mock-*.html
   대표님(2026-11-17 22:41 · 22:57): 「디자인이 너무 구려」 「5배 이상 고퀄리티」 → 시안 4개(에디토리얼 · 시네마틱 · 콜라주 · 전통) 「전부 마음에 들어」.
   - uvivy(에디토리얼 아이비): 크림 바탕 · 세리프 큰 제목 · 넓은 사진 한 장 · 목차형 프로그램 목록 · 큰 숫자 하나
   - uvcine(시네마틱 캠퍼스): 전면 사진 첫 화면 · 짙은 기관 색 바로 가기 띠 · 세로 사진 카드 · 사진 띠 · 큰 숫자
   - uvcollage(모던 콜라주): 가운데 큰 제목 · 높낮이가 다른 사진 콜라주 · 「저는 ○○예요」 문장형 바로 가기 · 배지 메달
   - uvclassic(전통 대학): 교표 · 가운데 기관명 머리글 · 세리프 · 대칭 · 학사 공지 · 일정 · 행사 정돈 · 교육 이념
   원칙: 첫 화면은 큰 제목 + 부제 + 버튼 2개 + 사진 한 덩어리(판 · 칩 · D-day 없음). 수치 · 일정 · 공지 · 강좌는 실제 기관 데이터만, 없으면 그 덩어리를 숨긴다.
   대학 개인정보: 학번 · 학과만. 링크는 게시본 규칙(#p-m-<메뉴> · #p-c-<강좌>) + 학습자 경로(#login · #cal · #badges · #my · #shop · #notice) + tel: · mailto:.
   CSS는 JS 문자열로 사이트 CSS에 넣는다(게시본 Shadow DOM). 범위: .uv9(부품) · 페이지 루트 BR = :is(body.hpt-on, .smr)(게시본 Shadow DOM 포함). */
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
  const IDS = ['uvivy', 'uvcine', 'uvcollage', 'uvclassic'];
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
  const DEFPH = { uvivy: { hero: 'cam-07', about: 'hum-13', cta: 'lib-08', quote: 'grp-02' }, uvcine: { hero: 'hum-15', space: 'lib-01', about: 'hum-36' },
    uvcollage: { hero: 'stu-02', g1: 'cam-09', g2: 'grp-02', g3: 'hum-38', g4: 'grp-06', about: 'hum-10', quote: 'grp-01' }, uvclassic: { hero: 'lib-08', space: 'lec-02', cta: 'lib-02' } };
  const USED = new Set();
  function photo(s, slot, d) { const H = window.HPSTOCK; const off = !!(s && s.stockOff); const m = s && s.img && s.img[slot];
    const own = (src, alt, pos) => src ? { src: String(src), alt: alt || '', pos: pos || '50% 50%', own: !stockRe.test(String(src)) } : null;
    if (m && m.src && !(off && stockRe.test(String(m.src)))) return own(m.src, m.alt, m.pos);
    if (slot === 'hero' && d && d.img && !(off && stockRe.test(String(d.img)))) return own(d.img, d.alt, '');
    if (off || !H) return null; const id = (DEFPH[s.theme] || {})[slot]; const x = id && H.get ? H.get(id) : null; if (!x) return null; USED.add(x.id);
    return { src: H.url(x, slot === 'hero' || slot === 'cta' || slot === 'space' ? '' : 'sm'), srcset: H.srcset ? H.srcset(x) : '', alt: x.alt || '', pos: x.focus || '50% 50%' }; }
  const fig = (p, slot, cls, eager) => p ? `<figure class="hps-img uv9-ph ${cls || ''}${p.own === undefined ? ' st' : ''}" data-slot="${E(slot)}"><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="100vw"` : ''} alt="${E(p.alt || '')}" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" style="object-fit:cover;object-position:${E(p.pos || '50% 50%')}"></figure>` : '';
  /* 강좌 사진: 운영자가 지정한 사진 → 강좌 썸네일 → 강좌명에 맞는 스톡(겹치지 않게) */
  const PHM = new Map();
  function clsPh(s, c, i) { const m = s && s.img && s.img['cls-' + c.id]; if (m && m.src) return { src: m.src, alt: m.alt || c.name, pos: m.pos || '50% 50%' };
    if (c.thumb && /^(img\/|https?:|data:image)/.test(c.thumb)) return { src: c.thumb, alt: c.name, pos: '50% 50%' };
    const H = window.HPSTOCK; if (!H || (s && s.stockOff)) return null; if (PHM.has(c.id)) return PHM.get(c.id); let x = null; const ty = (S.org && S.org.type) || 'univ';
    try { x = typeof H.forCourse === 'function' ? H.forCourse(ty, c.name, { seed: String(c.id), exclude: [...USED] }) : null; } catch (e) { x = null; }
    if (!x && typeof H.forScene === 'function') { try { x = H.forScene(ty, `${c.name} ${['세미나 토론', '강의실 수업', '도서관 공부', '워크숍 실습'][i % 4]}`, 'card', { seed: c.id + i, exclude: [...USED] }); } catch (e) { x = null; } }
    if (!x && typeof H.pick === 'function') { try { const L = H.pick(['univ', 'card', 'seminar', 'lecture', 'library'], 30, c.id) || []; x = L.find(y => y && !USED.has(y.id)) || null; } catch (e) { x = null; } }
    const r = x ? { src: H.url(x, 'sm'), alt: '', pos: x.focus || '50% 50%' } : null; if (x) USED.add(x.id); PHM.set(c.id, r); return r; }
  const clsFig = (s, c, i, cls) => { const p = clsPh(s, c, i); return p ? `<figure class="hps-img uv9-ph ${cls}" data-slot="cls-${E(c.id)}"><img src="${E(p.src)}" alt="${E(p.alt)}" loading="lazy" decoding="async" style="object-fit:cover;object-position:${E(p.pos)}"></figure>` : `<figure class="uv9-ph uv9-ph0 ${cls}" aria-hidden="true"></figure>`; };

  /* ══ 첫 화면 4종 ══ */
  const btn = (cls, h, l, ar) => l ? `<a class="uv9-btn ${cls}" ${lnk(h)}>${E(l)}${ar ? AR : ''}</a>` : '';
  const PRIV = '로그인은 학번 · 학과만 확인해요';
  function heroIvy(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero uv9 uv9-ivy-h"><div class="uv9-w"><p class="uv9-kick">${E(d.eyebrow || semester() + ' 비교과 프로그램')}</p><h1>${lines(d.title || org(), true)}</h1>
<div class="uv9-ivy-row">${d.sub ? `<p class="uv9-lead">${E(d.sub)}</p>` : '<span></span>'}<div class="uv9-btns">${btn('p', p1, d.cta, 1)}${btn('s', p2, d.cta2)}</div></div>
${fig(p, 'hero', 'uv9-ivy-ph', 1)}<p class="uv9-cap"><span>${E(d.cap || (p && !p.own ? '' : ''))}</span><span>${PRIV}</span></p>${paths(s, d, 'ivy')}</div></section>`; }
  function heroCine(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero uv9 uv9-cine-h${p ? '' : ' np'}" data-hps-dark="1">${fig(p, 'hero', 'uv9-cine-ph', 1)}<i class="uv9-scrim" aria-hidden="true"></i><div class="uv9-w uv9-cine-tx"><p class="uv9-eyl">${E(d.eyebrow || semester() + ' 신청이 열렸어요')}</p><h1>${lines(d.title || org())}</h1>${d.sub ? `<p class="uv9-lead">${E(d.sub)}</p>` : ''}
<div class="uv9-btns">${btn('w', p1, d.cta)}${btn('g', p2, d.cta2)}</div></div></section>${paths(s, d, 'bar')}`; }
  function heroCollage(s, d) { const C = pubAll(); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    const G = ['g1', 'g2', 'hero', 'g3', 'g4'].map(k => [k, photo(s, k, k === 'hero' ? d : null)]).filter(x => x[1]);
    return `<section class="hpt hp-hero uv9 uv9-col-h"><div class="uv9-w"><p class="uv9-pre">${E(d.eyebrow || (C.length ? `${semester()} · ${term('cls')} ${C.length}개가 열려 있어요` : semester()))}</p><h1>${lines(d.title || org(), true)}</h1>${d.sub ? `<p class="uv9-lead">${E(d.sub)}</p>` : ''}
<div class="uv9-btns">${btn('p', p1, d.cta)}${btn('s', p2, d.cta2)}</div><p class="uv9-safe">${PRIV}</p></div>${G.length ? `<div class="uv9-colg n${G.length}">${G.map(([k, p], i) => `<div class="c${i + 1}">${fig(p, k === 'hero' ? 'hero' : k, '', 1)}</div>`).join('')}</div>` : ''}</section>`; }
  function heroClassic(s, d) { const p = photo(s, 'hero', d); const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || '#login';
    return `<section class="hpt hp-hero uv9 uv9-cls-h${p ? '' : ' np'}">${fig(p, 'hero', 'uv9-cls-ph', 1)}<i class="uv9-scrim" aria-hidden="true"></i><div class="uv9-cls-in"><p class="uv9-rule">${E(d.eyebrow || yearSem())}</p><h1>${lines(d.title || org())}</h1>${d.sub ? `<p class="uv9-lead">${E(d.sub)}</p>` : ''}
<div class="uv9-btns">${btn('gold', p1, d.cta)}${btn('g', p2, d.cta2)}</div></div></section>${paths(s, d, 'quick')}`; }

  /* ── 방문자별 바로 가기(첫 화면 아래 한 줄) ── */
  const WHO = [['재학생', '비교과 신청하기', '비교과 신청 · 이수 확인'], ['신입생', '처음 로그인하기', '처음 로그인 · 먼저 들을 과정'], ['교수자', '수업 공지 보기', '수업 운영 · 공지'], ['산학 · 지역', '열린 강좌 보기', '열린 강좌 · 협력 문의']];
  function paths(s, d, view) { const W = (Array.isArray(d.who) && d.who.length === 4 ? d.who : WHO).map((r, k) => [0, 1, 2].map(j => String((r && r[j]) || WHO[k][j])));
    const H = [href.cls(s), '#login', href.notice(s), href.cls(s)];
    if (view === 'ivy') return `<nav class="uv9-paths" aria-label="방문 목적별 바로 가기">${W.map((r, k) => `<a ${lnk(H[k])}><small>${E(r[0])}이라면</small><b>${E(r[1])}<i aria-hidden="true">→</i></b></a>`).join('')}</nav>`;
    if (view === 'bar') return `<nav class="hpt uv9 uv9-bar" aria-label="방문 목적별 바로 가기"><div class="uv9-w">${W.map((r, k) => `<a ${lnk(H[k])}><b>${E(r[0])}<i aria-hidden="true">→</i></b><small>${E(r[2])}</small></a>`).join('')}</div></nav>`;
    if (view === 'quick') return `<nav class="hpt uv9 uv9-quick" aria-label="방문 목적별 바로 가기"><div class="uv9-w">${W.map((r, k) => `<a ${lnk(H[k])}><b>${E(r[0])}</b><small>${E(r[2])}</small></a>`).join('')}</div></nav>`;
    return `<div class="uv9-who"><span class="q">${E(d.pre || '저는')}</span>${W.map((r, k) => `<a ${lnk(H[k])}>${E(r[0] === '산학 · 지역' ? '산학 · 지역 방문자' : r[0])}<i aria-hidden="true">→</i></a>`).join('')}<span class="q e">${E(d.post || '예요')}</span></div>`; }
  function who(s, d) { return `<section class="hpt hp-s uv9 uv9-whos"><div class="uv9-w">${paths(s, d, 'line')}</div></section>`; }

  /* ══ 섹션 부품(text 섹션 data.hpt) ══ */
  const sh = (d, def, cls) => `<div class="uv9-sh ${cls || ''}">${d.eyebrow !== '' ? `<p class="uv9-lab">${E(d.eyebrow || def.ey || '')}</p>` : ''}<h2>${lines(d.title || def.t)}</h2>${(d.sub || def.sub) ? `<p class="uv9-lead">${E(d.sub || def.sub)}</p>` : ''}</div>`;
  /* 이야기 2열(에디토리얼): 글 + 실제 수치 2개 + 사진 */
  function story(s, d) { const C = pubAll(); const F = [C.length >= MIN.cls ? [num(C.length) + '개', `지금 열려 있는 ${term('cls')}`] : null, badgeN() >= MIN.badge ? [num(badgeN()) + '개', '발급한 디지털 배지'] : certN() >= MIN.cert ? [num(certN()) + '건', '발급한 이수증'] : null].filter(Boolean);
    const p = photo(s, 'about');
    return `<section class="hpt hp-s uv9 uv9-story"><div class="uv9-w uv9-g2"><div>${sh(d, { ey: '왜 비교과인가요', t: '졸업장에 적히지 않는\n네 해의 기록을 남겨요.', sub: '' })}${d.body ? `<p class="uv9-body">${E(d.body)}</p>` : ''}${F.length ? `<dl class="uv9-facts">${F.map(([v, l]) => `<div><dt>${E(l)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>` : ''}</div>${fig(p, 'about', 'uv9-story-ph')}</div></section>`; }
  /* 강좌: index(목차 목록) · tall(세로 사진 카드) · card(사진 위 · 글 아래) · frame(테두리 카드, 가운데 정렬) */
  function cls(s, d) { const L = sortCls(pubAll()).slice(0, Math.max(3, Math.min(6, +d.n || (d.view === 'index' ? 4 : 3)))); if (!L.length) return ''; const v = d.view || 'card';
    const all = `<a class="uv9-more" ${lnk(href.cls(s))}>${E(d.more || `전체 ${pubAll().length}개 보기`)}${AR}</a>`;
    const head = v === 'frame' ? sh(d, { ey: 'PROGRAMS', t: `이번 학기 ${term('cls')}`, sub: '마감이 가까운 순서로 안내해요.' }, 'c') : `<div class="uv9-hrow">${sh(d, { ey: v === 'index' ? '이번 학기 프로그램' : '', t: v === 'tall' ? '이번 학기,\n이런 걸 배워요.' : '지금 신청할 수 있어요', sub: v === 'card' ? '마감이 가까운 순서로 보여 드려요.' : '' })}${all}</div>`;
    let body = '';
    if (v === 'index') body = `<ol class="uv9-idx">${L.map((c, i) => { const st = stOf(c); const m = metaOf(c); const ds = descOf(c); return `<li><a ${lnk('#p-c-' + c.id)}><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="tt"><b>${E(c.name)}</b>${ds ? `<small>${E(ds)}</small>` : ''}</span><span class="mt"><b>${E(st.t)}</b>${m ? `<small>${E(m)}</small>` : ''}</span>${clsFig(s, c, i, 'th')}<i class="go" aria-hidden="true">→</i></a></li>`; }).join('')}</ol>`;
    else if (v === 'tall') body = `<ul class="uv9-tall">${L.map((c, i) => { const st = stOf(c); const k = kw(c.name); const m = metaOf(c); return `<li><a ${lnk('#p-c-' + c.id)}>${clsFig(s, c, i, '')}<span class="tx"><small class="k">${E([k.tag, st.t].filter(Boolean).join(' · '))}</small><b>${E(k.l)}</b>${m ? `<small>${E(m)}</small>` : ''}</span></a></li>`; }).join('')}</ul>`;
    else if (v === 'frame') body = `<ul class="uv9-frame">${L.map((c, i) => { const st = stOf(c); const k = kw(c.name); const m = metaOf(c); return `<li><a ${lnk('#p-c-' + c.id)}>${clsFig(s, c, i, '')}<span class="tx"><small class="k">${E([k.tag, st.t].filter(Boolean).join(' · '))}</small><b>${E(k.l)}</b>${m ? `<small>${E(m)}</small>` : ''}</span></a></li>`; }).join('')}</ul><div class="uv9-ctr">${all}</div>`;
    else body = `<ul class="uv9-card">${L.map((c, i) => { const st = stOf(c); const k = kw(c.name); const m = metaOf(c); return `<li><a ${lnk('#p-c-' + c.id)}>${clsFig(s, c, i, '')}<span class="mt"><small>${E(k.tag || term('cls'))}</small><small class="${st.k === 0 ? 'hot' : ''}">${E(st.t)}</small></span><b>${E(k.l)}</b>${m ? `<small class="m">${E(m)}</small>` : ''}</a></li>`; }).join('')}</ul>`;
    return `<section class="hpt hp-s uv9 uv9-cls v-${E(v)}"><div class="uv9-w">${head}${body}</div></section>`; }
  /* 큰 숫자 하나: brand(기관 색 전면 · 에디토리얼) · mist(가운데 · 시네마틱) */
  function big(s, d) { const f = bigFact(); if (!f) return ''; const v = d.view || 'brand'; const go = f.k === 'cls' ? [href.cls(s), `${term('cls')} 둘러보기`] : ['#badges', '내 배지 확인하기'];
    if (v === 'mist') return `<section class="hpt hp-s uv9 uv9-big mist"><div class="uv9-w"><p class="uv9-lab">${E(d.eyebrow || f.l)}</p><p class="uv9-num">${num(f.v)}<span>${E(f.u)}</span></p>${d.sub ? `<p class="uv9-lead">${E(d.sub)}</p>` : ''}<div class="uv9-btns c">${btn('p', go[0], go[1])}</div></div></section>`;
    return `<section class="hpt hp-s uv9 uv9-big brand"><div class="uv9-w uv9-g2b"><div><p class="uv9-lab">${E(d.eyebrow || '이수 · 디지털 배지')}</p><p class="uv9-num">${num(f.v)}<span>${E(f.u)}</span></p></div><div><p class="uv9-lead">${E(f.l)}${f.k === 'badge' ? '예요. 배지마다 무엇을 배웠는지 적혀 있어서, 링크 하나로 이력서에 붙일 수 있어요.' : f.k === 'cert' ? '이에요. 내 학습 화면에서 바로 확인하고 내려받을 수 있어요.' : '예요. 마감이 가까운 순서로 골라 보세요.'}</p><a class="uv9-ul" ${lnk(go[0])}>${E(go[1])}${AR}</a></div></div></section>`; }
  /* 인용 한 문장(운영자가 쓰는 기관의 한마디) */
  function quote(s, d) { const q = String(d.quote || '').trim(); if (!q) return ''; const v = d.view || 'photo'; const p = v === 'center' ? null : photo(s, 'quote');
    const cite = d.by || `${org()}`;
    return `<section class="hpt hp-s uv9 uv9-quote v-${E(v)}"><div class="uv9-w${p ? ' uv9-gq' : ''}">${p ? fig(p, 'quote', 'uv9-q-ph') : ''}<figure class="uv9-q"><blockquote>${E(q)}</blockquote><figcaption>${E(cite)}</figcaption></figure></div></section>`; }
  /* 학사 일정 + 공지: text(두 단 글 목록) · cols3(공지 · 일정 · 다가오는 프로그램) */
  function board(s, d) { const V = events(d.view === 'cols3' ? 3 : 3); const N = notices(4); const v = d.view || 'text'; const nxt = v === 'cols3' ? sortCls(pubAll()).find(c => stOf(c).k <= 2) : null; if (!V.length && !N.length && !nxt) return '';
    const T0 = tday(); const date = x => String(x.at || '').slice(0, 10).replace(/-/g, '. ') + (x.at ? '.' : '');
    const cal = V.length ? `<div class="bcol bcal"><h3>${E(d.title || '학사 일정')}<a href="#cal">전체 일정${AR}</a></h3><ul>${V.map(x => `<li><a href="#cal"><time datetime="${E(x.date)}">${v === 'cols3' ? `<small>${+x.date.slice(5, 7)}월</small><b>${+x.date.slice(8, 10)}</b>` : `<b>${E(mdS(x.date))}</b>`}</time><span><b>${E(x.title)}</b><small>${E(x.kind)} · ${days(T0, x.date) === 0 ? '오늘' : `${WD[dd(x.date).getDay()]}요일`}</small></span></a></li>`).join('')}</ul></div>` : '';
    const nt = N.length ? `<div class="bcol bnt"><h3>${E(d.title2 || '공지사항')}<a ${lnk(href.notice(s))}>전체 보기${AR}</a></h3><ul>${N.map(x => `<li><a ${lnk(href.notice(s))}><span><b>${x.top ? '<em>중요</em>' : ''}${E(x.title)}</b>${x.at ? `<small>${E(date(x))}</small>` : ''}</span></a></li>`).join('')}</ul></div>` : '';
    const ev = nxt ? `<div class="bcol bev"><h3>${E(d.title3 || '다가오는 프로그램')}<a ${lnk(href.cls(s))}>더 보기${AR}</a></h3><a class="evc" ${lnk('#p-c-' + nxt.id)}>${clsFig(s, nxt, 7, 'evp')}<b>${E(nxt.name)}</b><small>${E([stOf(nxt).t, metaOf(nxt)].filter(Boolean).join(' · '))}</small></a></div>` : '';
    const cols = v === 'cols3' ? [nt, cal, ev] : [cal, nt]; const n = cols.filter(Boolean).length;
    return `<section class="hpt hp-s uv9 uv9-board v-${E(v)}"><div class="uv9-w">${v === 'cols3' ? sh(d.sh || {}, { ey: 'NEWS & CALENDAR', t: '학사 소식' }, 'c') : ''}<div class="uv9-bg n${n}">${cols.join('')}</div></div></section>`; }
  /* 사진 띠(시네마틱): 온라인 강의실 소개 — 제품 기능 문구(숫자 아님) */
  function band(s, d) { const p = photo(s, 'space'); const F = Array.isArray(d.cols) && d.cols.length ? d.cols : [['24시간', '언제든 수강'], ['이어 보기', '멈춘 곳부터'], ['바로 발급', '이수증 · 배지']];
    return `<section class="hpt hp-s uv9 uv9-band${p ? '' : ' np'}">${fig(p, 'space', 'uv9-band-ph')}<i class="uv9-scrim" aria-hidden="true"></i><div class="uv9-w"><h2>${lines(d.title || '강의실 문이 닫혀도,\n수업은 계속돼요.')}</h2><p class="uv9-lead">${E(d.sub || '강의 영상, 과제, 퀴즈, 질문 게시판이 하나의 온라인 강의실에 있어요. 도서관에서도, 집 가는 길에서도 이어서 들어요.')}</p><ul>${F.slice(0, 3).map(r => `<li><b>${E(r[0])}</b>${E(r[1] || '')}</li>`).join('')}</ul><div class="uv9-btns">${btn('w', '#login', d.cta || '내 강의실 들어가기')}</div></div></section>`; }
  /* 열린 강좌 · 문의 · 오시는 길(시네마틱) */
  function open(s, d) { const K = contact(); const C = pubAll(); const p = photo(s, 'about');
    const L = [C.length ? [href.cls(s), `${d.l1 || '열린 강좌 둘러보기'}`, `${term('cls')} ${C.length}개`] : null, K.tel ? ['tel:' + K.tel.replace(/[^\d+]/g, ''), '산학 협력 · 수강 문의', K.tel] : K.em ? ['mailto:' + K.em, '산학 협력 · 수강 문의', K.em] : null, K.addr ? [`https://map.naver.com/p/search/${encodeURIComponent(K.addr)}`, '오시는 길', K.addr] : null].filter(Boolean); if (!L.length) return '';
    return `<section class="hpt hp-s uv9 uv9-open"><div class="uv9-w uv9-g2${p ? '' : ' one'}">${fig(p, 'about', 'uv9-open-ph')}<div>${sh(d, { ey: '', t: '학교 문은\n지역에도 열려 있어요.', sub: '지역 주민과 협력 기관을 위한 열린 강좌를 운영해요. 학생이 아니어도 신청할 수 있어요.' })}<ul class="uv9-links">${L.map(([h, l, sub]) => `<li><a ${lnk(h)}><span><b>${E(l)}</b><small>${E(sub)}</small></span><i aria-hidden="true">→</i></a></li>`).join('')}</ul></div></div></section>`; }
  /* 강의실 3단계(콜라주) */
  function lms(s, d) { const p = photo(s, 'about'); const St = Array.isArray(d.cols) && d.cols.length ? d.cols : [['강의 듣기', '멈춘 곳부터 이어서, 휴대폰에서도 그대로'], ['과제 · 퀴즈 내기', '마감 전에 알림을 보내 드려요'], ['이수 확인', '기준을 채우면 이수증이 바로 나와요']];
    return `<section class="hpt hp-s uv9 uv9-lms"><div class="uv9-w uv9-g2${p ? '' : ' one'}"><div>${sh(d, { ey: '', t: '신청하고 나면,\n나머지는 한 화면에서.', sub: '온라인 강의실에서 듣고, 내고, 확인해요. 따로 찾아다닐 곳이 없어요.' })}<ol class="uv9-steps">${St.slice(0, 4).map((r, i) => `<li><span class="n">0${i + 1}</span><span><b>${E(r[0])}</b><small>${E(r[1] || '')}</small></span></li>`).join('')}</ol></div>${fig(p, 'about', 'uv9-lms-ph')}</div></section>`; }
  /* 배지 메달 + 큰 숫자(콜라주) — 배지가 정해져 있을 때만 */
  function medal(s, d) { const B = badgeList(); if (!B.length) return ''; const b = B[0]; const n0 = badgeN(); const n = n0 >= MIN.badge ? n0 : 0;
    return `<section class="hpt hp-s uv9 uv9-medal"><div class="uv9-w uv9-g2"><div class="md" aria-hidden="true"><i class="ring"></i><span class="core"><small>${E(org())} 디지털 배지</small><b>${E(b.name)}</b><small>${E(semester())}</small></span><em class="tag">링크로 공유</em></div><div>${sh(d, { ey: '', t: '배운 만큼,\n배지로 남아요.' })}${n ? `<p class="uv9-num">${num(n)}<span>개</span></p><p class="uv9-lead">지금까지 발급한 디지털 배지예요. 링크 하나로 이력서와 포트폴리오에 붙일 수 있어요.</p>` : `<p class="uv9-lead">이수 기준을 채우면 디지털 배지가 발급돼요. 링크 하나로 이력서와 포트폴리오에 붙일 수 있어요.</p>`}<div class="uv9-btns">${btn('p', '#badges', '내 배지 확인하기')}</div></div></div></section>`; }
  /* 교육 이념 + 실제 수치(전통) */
  function motto(s, d) { const q = String(d.quote || '').trim(); const C = pubAll().length; const F = [String(d.since || '').trim() ? [String(d.since).trim(), '개교'] : null, C >= MIN.cls ? [num(C), `이번 학기 ${term('cls')}`] : null, badgeN() >= MIN.badge ? [num(badgeN()), '발급한 배지'] : certN() >= MIN.cert ? [num(certN()), '발급한 이수증'] : null].filter(Boolean); if (!q && !F.length) return '';
    return `<section class="hpt hp-s uv9 uv9-motto">${CREST('bg')}<div class="uv9-w"><p class="uv9-rule">${E(d.eyebrow || '교육 이념')}</p>${q ? `<p class="big">“${E(q)}”</p>` : ''}${F.length ? `<dl class="since">${F.map(([v, l]) => `<div><dt>${E(l)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>` : ''}</div></section>`; }
  /* 마지막 행동: photo(사진 위 · 에디토리얼) · navy(가운데 · 시네마틱) · center(가운데 + 연락처 · 콜라주) · split(사진 + 연락처 · 전통) */
  function close(s, d) { const v = d.view || 'center'; const K = contact(); const p1 = href.cls(s); const ask = href.ask(s);
    const b1 = btn(v === 'navy' ? 'sun' : v === 'split' ? 'p' : 'p', p1, d.cta || `${term('cls')} 둘러보기`), b2 = btn(v === 'center' || v === 'split' ? 's' : 'g', v === 'navy' || v === 'center' ? '#login' : ask, d.cta2 || (v === 'navy' || v === 'center' ? '학번으로 로그인' : '협력 · 수강 문의'));
    const ttl = `<h2>${lines(d.title || '이번 학기,\n하나만 골라 보세요.')}</h2>${d.sub ? `<p class="uv9-lead">${E(d.sub)}</p>` : ''}`;
    if (v === 'photo') { const p = photo(s, 'cta'); return `<section class="hpt hp-s uv9 uv9-close v-photo"><div class="uv9-w"><div class="box${p ? '' : ' np'}">${fig(p, 'cta', 'uv9-close-ph')}<i class="uv9-scrim" aria-hidden="true"></i><div class="in">${ttl}<div class="uv9-btns">${b1}${b2}</div></div></div></div></section>`; }
    if (v === 'navy') return `<section class="hpt hp-s uv9 uv9-close v-navy"><div class="uv9-w">${ttl}<div class="uv9-btns c">${b1}${b2}</div><p class="uv9-note">${PRIV}. 휴대폰 번호는 받지 않아요.</p></div></section>`;
    const rows = [K.tel ? ['수강 · 이수 문의', K.tel, 'tel:' + K.tel.replace(/[^\d+]/g, '')] : null, K.em ? ['산학 협력 · 열린 강좌', K.em, 'mailto:' + K.em] : null, K.addr ? ['오시는 길', K.addr, ''] : null].filter(Boolean);
    if (v === 'split') { const p = photo(s, 'cta'); return `<section class="hpt hp-s uv9 uv9-close v-split"><div class="uv9-w"><div class="box${p ? '' : ' one'}">${fig(p, 'cta', 'uv9-close-ph')}<div class="in">${ttl}<div class="uv9-btns">${b1}${b2}</div>${rows.length ? `<dl>${rows.map(([l, v2, h]) => `<div><dt>${E(l)}</dt><dd>${h ? `<a ${lnk(h)}>${E(v2)}</a>` : E(v2)}</dd></div>`).join('')}</dl>` : ''}</div></div></div></section>`; }
    return `<section class="hpt hp-s uv9 uv9-close v-center"><div class="uv9-w">${ttl}<div class="uv9-btns c">${b1}${b2}</div>${rows.length ? `<dl class="ct">${rows.map(([l, v2, h]) => `<div><dt>${E(l)}</dt><dd>${h ? `<a ${lnk(h)}>${E(v2)}</a>` : E(v2)}</dd></div>`).join('')}</dl>` : ''}</div></section>`; }
  const CREST = cls => `<svg class="uv9-crest ${cls || ''}" viewBox="0 0 58 66" aria-hidden="true" focusable="false"><path d="M29 2 L55 10 V32 C55 48 43 59 29 64 C15 59 3 48 3 32 V10 Z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M29 8 L49 14 V32 C49 44 40 53 29 57 C18 53 9 44 9 32 V14 Z" fill="currentColor" opacity=".16"/><path d="M15 36 c5-4 9-4 14 0 s9 4 14 0 M15 43 c5-4 9-4 14 0 s9 4 14 0" fill="none" stroke="currentColor" stroke-width="2"/><path d="M22 28 V19 l7-3 7 3 v9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="29" cy="23" r="2" fill="currentColor"/></svg>`;

  const R = { 'uv9-who': who, 'uv9-story': story, 'uv9-cls': cls, 'uv9-big': big, 'uv9-quote': quote, 'uv9-board': board, 'uv9-band': band, 'uv9-open': open, 'uv9-lms': lms, 'uv9-medal': medal, 'uv9-motto': motto, 'uv9-close': close };
  const HERO = { uvivy: heroIvy, uvcine: heroCine, uvcollage: heroCollage, uvclassic: heroClassic };
  HPT.hpvUniv = { R, HERO, bigFact, events, notices, stOf }; /* 테스트용 */

  { const b0 = proSec; proSec = (x, i, s, lk) => {
    const d = (x && x.data) || {}; const isPart = x && x.type === 'text' && R[d.hpt]; const isHero = x && x.type === 'banner' && mine(s) && !(+d.dstyle);
    if (!isPart && !isHero) return b0(x, i, s, lk);
    if (x.hide && !editing()) return '';
    if (i === 0) { try { b0(x, i, s, lk); } catch (e) { } }
    let h = ''; try { h = isHero ? HERO[s.theme](s, d) : R[d.hpt](s, d); } catch (e) { console.error('hpv-univ', d.hpt || 'hero', e); return b0(x, i, s, lk); }
    if (!h) return editing() ? b0(x, i, s, lk) : '';
    const m = editing() ? HPE.map.get(x) : null;
    if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; window.proSec = proSec; }

  /* ── 머리글 · 바닥글 종류: 운영자가 직접 고르지 않았으면 시안의 구성 ── */
  const CH = { uvivy: ['solid', 'min'], uvcine: ['overlay', 'min'], uvcollage: ['solid', 'min'], uvclassic: ['center', 'campus'] };

  /* ══ CSS ══ */
  const CORE = `
.uv9{--sp:var(--uv-sec,140px);box-sizing:border-box}.uv9 small{font-size:inherit}.uv9 *{box-sizing:border-box}
.uv9 .uv9-w{max-width:1200px;margin:0 auto;padding:0 40px}
body .hpt.uv9.hp-s{padding:var(--sp) 0;margin:0;background:transparent}body .hpt.uv9.hp-s.uv9-big.brand,body .hpt.uv9.hp-s.uv9-motto{background:var(--u-a)}body .hpt.uv9.hp-s.uv9-big.mist,body .hpt.uv9.hp-s.uv9-lms,body .hpt.uv9.hp-s.uv9-cls.v-index{background:var(--u-bg2)}body .hpt.uv9.hp-s.uv9-close.v-navy{background:var(--u-adk)}body .hpt.uv9.hp-s.uv9-quote.v-brand{background:var(--u-a)}body .hpt.uv9.hp-s.uv9-band{background:var(--u-adk);padding:0}body .hpt.uv9.hp-s.uv9-whos{padding:88px 0 0}body .hpt.uv9.hp-s.uv9-big.brand{padding:170px 0}body .hpt.uv9.hp-s.uv9-motto{padding:150px 0}body .hpt.uv9.hp-s.uv9-cls.v-frame{background:#fff;border-top:1px solid var(--u-line);border-bottom:1px solid var(--u-line)}
.uv9 h1,.uv9 h2,.uv9 h3,.uv9 p,.uv9 ul,.uv9 ol,.uv9 dl,.uv9 dd,.uv9 figure,.uv9 blockquote{margin:0;padding:0}.uv9 ul,.uv9 ol{list-style:none}
.uv9 a{color:inherit;text-decoration:none}.uv9 img{display:block;width:100%;height:100%}
.uv9 .uv9-ph{overflow:hidden;margin:0;background:var(--u-ph)}.uv9 .uv9-ph0{background:linear-gradient(135deg,var(--u-ph),var(--u-ph2))}
.uv9{letter-spacing:-.015em}body .uv9 h1,body .uv9 h2{font-family:var(--u-hf)!important;font-weight:var(--u-hw)!important;letter-spacing:var(--u-hls)!important;word-break:keep-all}body .uv9 .uv9-lead,body .uv9 p{letter-spacing:-.012em}
.uv9 h1{color:var(--u-ink)}
.uv9 h1 em{font-style:normal;color:var(--u-acct)}
.uv9 h2{font-family:var(--u-hf);font-weight:var(--u-hw);letter-spacing:var(--u-hls);font-size:var(--u-h2,52px);line-height:1.22;color:var(--u-ink);word-break:keep-all}
.uv9 .uv9-lead{font-size:19px;line-height:1.7;color:var(--u-mu);word-break:keep-all}
.uv9 .uv9-lab{font-size:15px;font-weight:650;letter-spacing:.02em;color:var(--u-acct);margin-bottom:18px}
.uv9 .uv9-sh .uv9-lead{margin-top:18px;max-width:560px}
.uv9 .uv9-sh.c{text-align:center;margin-bottom:64px}.uv9 .uv9-sh.c .uv9-lead{margin:14px auto 0}
.uv9 .uv9-btns{display:flex;gap:12px;flex-wrap:wrap}.uv9 .uv9-btns.c{justify-content:center}
.uv9 .uv9-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;white-space:nowrap;min-height:58px;padding:0 30px;border-radius:var(--u-br);font-size:17px;font-weight:700;letter-spacing:-.01em;transition:transform .2s,background .2s}
.uv9 .uv9-btn:hover{transform:translateY(-1px)}
.uv9 .uv9-btn.p{background:var(--u-a);color:var(--u-on)}.uv9 .uv9-btn.s{background:var(--u-sbg);color:var(--u-ink);box-shadow:inset 0 0 0 1px var(--u-sbd)}
.uv9 .uv9-btn.w{background:#fff;color:var(--u-adk)}.uv9 .uv9-btn.g{color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.78)}
.uv9 .uv9-btn.sun,.uv9 .uv9-btn.gold{background:var(--u-pt);color:var(--u-pton)}
.uv9 .uv9-more,.uv9 .uv9-ul{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:16px;font-weight:650;color:var(--u-ink);border-bottom:1px solid currentColor;padding-top:6px}
.uv9 .uv9-scrim{position:absolute;inset:0;z-index:1;pointer-events:none}
.uv9 .uv9-g2{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}.uv9 .uv9-g2.one{grid-template-columns:minmax(0,1fr)}
.uv9 .uv9-hrow{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;margin-bottom:56px}
.uv9 .uv9-num{font-family:var(--u-nf);font-weight:800;letter-spacing:-.05em;line-height:.95;color:var(--u-ink)}
/* 강좌: index */
.uv9-cls .uv9-idx{border-bottom:1px solid var(--u-line)}
.uv9-idx a{display:grid;grid-template-columns:56px minmax(0,1fr) 200px 200px 28px;gap:32px;align-items:center;padding:30px 0;border-top:1px solid var(--u-line)}
.uv9-idx .no{font-family:var(--u-hf);font-size:20px;color:var(--u-mu)}
.uv9-idx .tt b{display:block;font-family:var(--u-hf);font-weight:var(--u-hw);font-size:29px;line-height:1.3;letter-spacing:-.02em;color:var(--u-ink)}
.uv9-idx .tt small{display:block;font-size:15px;color:var(--u-mu);margin-top:6px}
.uv9-idx .mt b{display:block;font-size:16px;font-weight:650;color:var(--u-ink)}.uv9-idx .mt small{font-size:14.5px;color:var(--u-mu)}
.uv9-idx .th{height:128px;border-radius:3px}.uv9-idx .go{font-style:normal;font-size:24px;color:var(--u-acct)}
.uv9-idx a:hover .tt b{color:var(--u-acct)}
/* 강좌: tall */
.uv9-tall{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.uv9-tall a{position:relative;display:block;aspect-ratio:3/4;border-radius:20px;overflow:hidden;color:#fff;background:var(--u-adk)}
.uv9-tall .uv9-ph{position:absolute!important;inset:0}.uv9-tall a::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 38%,rgba(5,14,26,.88) 100%)}
.uv9-tall .tx{position:absolute;left:30px;right:30px;bottom:30px;z-index:1;display:flex;flex-direction:column;gap:8px}
.uv9-tall .tx b{font-size:27px;line-height:1.3;letter-spacing:-.03em;font-weight:750}.uv9-tall .tx small{font-size:15px;color:rgba(255,255,255,.86)}.uv9-tall .tx .k{color:var(--u-ptl);font-weight:700;font-size:14px}
.uv9-tall a img{transition:transform .6s}.uv9-tall a:hover img{transform:scale(1.04)}
/* 강좌: card */
.uv9-card{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.uv9-card a{display:flex;flex-direction:column;gap:6px}.uv9-card .uv9-ph{aspect-ratio:4/3;border-radius:24px;margin-bottom:16px}
.uv9-card .mt{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:var(--u-mu)}.uv9-card .mt .hot{color:var(--u-ptt);font-weight:700}
.uv9-card b{font-size:24px;line-height:1.35;letter-spacing:-.035em;font-weight:750;color:var(--u-ink)}.uv9-card .m{font-size:15.5px;color:var(--u-mu)}
/* 강좌: frame */
.uv9-frame{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.uv9-frame a{display:block;border:1px solid var(--u-line);background:var(--u-bg)}.uv9-frame .uv9-ph{aspect-ratio:3/2}
.uv9-frame .tx{display:flex;flex-direction:column;gap:8px;padding:28px 28px 32px;text-align:center}
.uv9-frame .tx .k{font-size:13.5px;letter-spacing:.06em;color:var(--u-ptt);font-weight:700}.uv9-frame .tx b{font-family:var(--u-hf);font-size:23px;line-height:1.4;color:var(--u-acct)}.uv9-frame .tx small{font-size:15px;color:var(--u-mu)}
.uv9 .uv9-ctr{text-align:center;margin-top:52px}
/* 이야기 */
.uv9-story .uv9-g2{align-items:start}.uv9-story-ph{height:560px;border-radius:4px}
.uv9-story .uv9-body{font-size:18px;line-height:1.75;color:var(--u-mu);margin-top:26px;max-width:470px}
.uv9 .uv9-facts{display:flex;gap:40px;margin-top:52px}.uv9-facts div{flex:1;border-top:1px solid var(--u-ink);padding-top:16px;display:flex;flex-direction:column-reverse}
.uv9-facts dd{font-family:var(--u-hf);font-weight:var(--u-hw);font-size:34px;letter-spacing:-.02em;color:var(--u-ink)}.uv9-facts dt{font-size:14.5px;color:var(--u-mu)}
/* 큰 숫자 */
.hpt.uv9-big.brand{background:var(--u-a);color:var(--u-on);padding:170px 0}
.uv9-big.brand .uv9-g2b{display:grid;grid-template-columns:1.4fr 1fr;gap:80px;align-items:end}
.uv9-big.brand .uv9-num{font-size:200px;color:var(--u-on)}.uv9-big.brand .uv9-num span{font-size:60px;margin-left:8px;letter-spacing:-.02em}
.uv9-big.brand .uv9-lab{color:var(--u-onm)}.uv9-big.brand .uv9-lead{color:var(--u-on);opacity:.9}.uv9-big.brand .uv9-ul{color:var(--u-on);margin-top:26px}
.hpt.uv9-big.mist{background:var(--u-bg2);text-align:center}.uv9-big.mist .uv9-num{font-size:220px;color:var(--u-acct);margin:18px 0 12px}.uv9-big.mist .uv9-num span{color:var(--u-ptt);font-size:120px}
.uv9-big.mist .uv9-lead{max-width:640px;margin:0 auto 36px}
/* 인용 */
.uv9-quote .uv9-gq{display:grid;grid-template-columns:480px 1fr;gap:96px;align-items:center}.uv9-q-ph{height:560px;border-radius:4px}
.uv9-q blockquote{font-family:var(--u-qf);font-size:40px;line-height:1.5;letter-spacing:-.025em;font-weight:var(--u-qw);color:var(--u-ink);word-break:keep-all}
.uv9-q blockquote::before{content:"“";display:block;font-family:Georgia,serif;font-size:110px;line-height:.6;color:var(--u-acct);margin-bottom:20px}
.uv9-q figcaption{margin-top:30px;font-size:16px;color:var(--u-mu)}
.uv9-quote.v-center{text-align:center}.uv9-quote.v-center .uv9-q blockquote{max-width:1000px;margin:0 auto;font-size:44px}.uv9-quote.v-center .uv9-q blockquote::before{display:none}
/* 일정 · 공지 */
.uv9-bg{display:grid;grid-template-columns:1fr 1fr;gap:96px}.uv9-bg.n1{grid-template-columns:minmax(0,1fr)}.uv9-bg.n3{grid-template-columns:repeat(3,1fr);gap:48px}
.uv9-board h3{display:flex;justify-content:space-between;align-items:center;gap:12px;font-family:var(--u-hf);font-weight:var(--u-hw);font-size:30px;letter-spacing:-.02em;color:var(--u-ink);padding-bottom:14px;border-bottom:2px solid var(--u-ink);margin-bottom:4px}
.uv9-board h3 a{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-family:var(--u-bf);font-size:15px;font-weight:600;color:var(--u-mu);letter-spacing:0}
.uv9-board .bcol li{background:none;border:0;padding:0;margin:0;border-radius:0}.uv9-board .bcol li a{display:grid;grid-template-columns:96px minmax(0,1fr);gap:18px;align-items:center;padding:20px 0;border-bottom:1px solid var(--u-line);min-height:44px}
.uv9-board .bnt li a{grid-template-columns:minmax(0,1fr)}
.uv9-board time b{font-family:var(--u-hf);font-size:21px;color:var(--u-ink)}.uv9-board .bcol li span b{display:block;font-weight:600;font-size:17px;line-height:1.5;color:var(--u-ink)}.uv9-board .bcol li span small{font-size:14px;color:var(--u-mu)}
.uv9-board .bcol li span b em{font-style:normal;color:var(--u-acct);font-weight:750;margin-right:8px}
.uv9-board.v-cols3 h3{font-size:22px}.uv9-board.v-cols3 .bcal li a{grid-template-columns:64px minmax(0,1fr)}
.uv9-board.v-cols3 time{border:1px solid var(--u-acct);text-align:center;line-height:1.1;padding:8px 0;display:flex;flex-direction:column}
.uv9-board.v-cols3 time small{font-size:13px;color:var(--u-mu)}.uv9-board.v-cols3 time b{font-size:24px;color:var(--u-acct)}
.uv9-board .evc{display:flex;flex-direction:column;gap:8px;padding-top:22px}.uv9-board .evp{height:220px;margin-bottom:10px}
.uv9-board .evc b{font-family:var(--u-hf);font-size:22px;line-height:1.4;color:var(--u-acct)}.uv9-board .evc small{font-size:15px;color:var(--u-mu)}
/* 바로 가기 */
.uv9 .uv9-paths{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--u-ink);border-bottom:1px solid var(--u-line);margin-top:56px}
.uv9-paths a{display:block;padding:26px 26px 28px 0;border-right:1px solid var(--u-line)}.uv9-paths a+a{padding-left:26px}.uv9-paths a:last-child{border-right:0}
.uv9-paths small{display:block;font-size:14px;color:var(--u-mu);margin-bottom:4px}.uv9-paths b{display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:650;letter-spacing:-.02em;color:var(--u-ink)}.uv9-paths i{font-style:normal;color:var(--u-acct)}
.hpt.uv9-bar{background:var(--u-a);color:var(--u-on)}.uv9-bar .uv9-w{display:grid;grid-template-columns:repeat(4,1fr)}
.uv9-bar a{display:flex;flex-direction:column;gap:6px;padding:32px 26px 34px;border-left:1px solid var(--u-onl)}.uv9-bar a:first-child{border-left:0;padding-left:0}
.uv9-bar b{display:flex;justify-content:space-between;font-size:21px;font-weight:700}.uv9-bar i{font-style:normal;color:var(--u-ptl)}.uv9-bar small{font-size:14px;color:var(--u-onm)}
.hpt.uv9-quick{background:var(--u-bg2);border-bottom:1px solid var(--u-line)}.uv9-quick .uv9-w{display:grid;grid-template-columns:repeat(4,1fr)}
.uv9-quick a{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;padding:30px 12px 32px;border-left:1px solid var(--u-line)}.uv9-quick a:first-child{border-left:0}
.uv9-quick b{font-family:var(--u-hf);font-size:20px;color:var(--u-acct)}.uv9-quick small{font-size:14px;color:var(--u-mu)}
.uv9 .uv9-who{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:14px;font-size:30px;font-weight:700;letter-spacing:-.035em}
.uv9-who .q{color:var(--u-mu);font-weight:600}
.uv9-who a{display:inline-flex;align-items:center;gap:10px;min-height:64px;padding:0 26px;border-radius:999px;box-shadow:inset 0 0 0 1.5px var(--u-ink);font-size:23px;color:var(--u-ink);transition:background .2s,color .2s}
.uv9-who a:hover{background:var(--u-ink);color:var(--u-bg)}.uv9-who i{font-style:normal;color:var(--u-ptt)}
.hpt.uv9-whos{padding:88px 0 0}
/* 사진 띠 */
.hpt.uv9-band{position:relative;min-height:720px;padding:0;display:flex;align-items:center;color:#fff;overflow:hidden;background:var(--u-adk)}
.uv9 .uv9-band-ph{position:absolute!important;inset:0;height:auto}.uv9-band .uv9-scrim{background:linear-gradient(90deg,var(--u-scr) 0%,var(--u-scr2) 42%,transparent 75%)}
.uv9-band .uv9-w{position:relative;z-index:2;width:100%;padding-top:120px;padding-bottom:120px}.uv9-band h2{color:#fff;font-size:62px;max-width:660px}.uv9-band .uv9-lead{color:rgba(255,255,255,.9);max-width:480px;margin-top:22px}
.uv9-band ul{display:flex;gap:48px;margin:48px 0 40px}.uv9-band li{font-size:15px;color:rgba(255,255,255,.88)}.uv9-band li b{display:block;font-size:30px;font-weight:800;letter-spacing:-.03em;color:#fff}
/* 열린 강좌 */
.uv9-open-ph{height:640px;border-radius:24px}
.uv9 .uv9-links{margin-top:40px;border-top:1px solid var(--u-line)}.uv9-links a{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 0;border-bottom:1px solid var(--u-line);min-height:44px}
.uv9-links b{display:block;font-size:20px;font-weight:650;color:var(--u-ink)}.uv9-links small{font-size:15px;color:var(--u-mu)}.uv9-links i{font-style:normal;font-size:22px;color:var(--u-acct)}
/* 강의실 */
.hpt.uv9-lms{background:var(--u-bg2)}.uv9-lms-ph{height:680px;border-radius:32px}
.uv9-steps{margin-top:44px}.uv9-steps li{display:grid;grid-template-columns:56px minmax(0,1fr);gap:18px;padding:24px 0;border-top:1px solid var(--u-line)}
.uv9-steps .n{font-size:15px;font-weight:700;color:var(--u-acct);padding-top:4px}.uv9-steps b{display:block;font-size:22px;font-weight:750;letter-spacing:-.03em;color:var(--u-ink)}.uv9-steps small{font-size:16px;color:var(--u-mu)}
/* 메달 */
.uv9-medal .md{position:relative;width:440px;height:440px;margin:0 auto}
.uv9-medal .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 200deg,var(--u-a),var(--u-a2),var(--u-a))}.uv9-medal .ring::after{content:"";position:absolute;inset:14px;border-radius:50%;background:var(--u-bg)}
.uv9-medal .core{position:absolute;inset:44px;border-radius:50%;background:var(--u-a);color:var(--u-on);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 40px;gap:8px}
.uv9-medal .core small{font-size:14px;opacity:.85}.uv9-medal .core b{font-size:34px;font-weight:800;line-height:1.25;letter-spacing:-.04em;word-break:keep-all}
.uv9-medal .tag{position:absolute;right:-6px;top:56px;background:var(--u-pt);color:var(--u-pton);font-style:normal;font-weight:750;font-size:15px;padding:10px 16px;border-radius:999px;transform:rotate(8deg)}
.uv9-medal .uv9-num{font-size:132px;margin:28px 0 12px}.uv9-medal .uv9-num span{font-size:40px;margin-left:6px;letter-spacing:-.03em}.uv9-medal .uv9-btns{margin-top:32px}
/* 교육 이념 */
.hpt.uv9-motto{position:relative;overflow:hidden;background:var(--u-a);color:var(--u-on);text-align:center;padding:150px 0}
.uv9-motto .uv9-crest.bg{position:absolute;right:-60px;bottom:-80px;width:420px;height:auto;opacity:.07;color:var(--u-on)}
.uv9-motto .big{font-family:var(--u-hf);font-weight:700;font-size:50px;line-height:1.5;max-width:900px;margin:30px auto 0;word-break:keep-all}
.uv9-motto .since{display:flex;justify-content:center;gap:80px;margin:64px auto 0;padding-top:44px;border-top:1px solid var(--u-onl);max-width:820px}
.uv9-motto .since div{display:flex;flex-direction:column-reverse}.uv9-motto dd{font-family:var(--u-hf);font-size:44px;font-weight:700;color:var(--u-ptl)}.uv9-motto dt{font-size:14.5px;color:var(--u-onm)}
.uv9 .uv9-rule{display:flex;align-items:center;justify-content:center;gap:16px;font-size:14px;letter-spacing:.16em;color:var(--u-ptl)}.uv9 .uv9-rule::before,.uv9 .uv9-rule::after{content:"";width:48px;height:1px;background:currentColor}
/* 마지막 행동 */
.uv9-close.v-photo .box{position:relative;min-height:560px;border-radius:4px;overflow:hidden;color:#fff;background:var(--u-adk);display:flex;align-items:center}
.uv9 .uv9-close-ph{position:absolute!important;inset:0;height:auto}.uv9-close.v-photo .uv9-scrim{background:linear-gradient(90deg,rgba(20,14,12,.8) 0%,rgba(20,14,12,.4) 55%,rgba(20,14,12,0) 100%)}
.uv9-close.v-photo .in{position:relative;z-index:2;padding:88px 80px;max-width:740px}.uv9-close.v-photo h2{color:#fff;font-size:58px}.uv9-close.v-photo .uv9-lead{color:rgba(255,255,255,.9);margin:20px 0 0}.uv9-close.v-photo .uv9-btns{margin-top:36px}
.hpt.uv9-close.v-navy{background:var(--u-adk);color:#fff;text-align:center}.uv9-close.v-navy h2{color:#fff;font-size:62px}.uv9-close.v-navy .uv9-lead{color:rgba(255,255,255,.8);margin:20px auto 0;max-width:560px}.uv9-close.v-navy .uv9-btns{margin-top:40px}.uv9-close .uv9-note{margin-top:26px;font-size:14px;color:rgba(255,255,255,.7)}
.uv9-close.v-center{text-align:center}.uv9-close.v-center h2{font-size:62px}.uv9-close.v-center .uv9-lead{margin:20px auto 0;max-width:560px}.uv9-close.v-center .uv9-btns{margin-top:40px}
.uv9-close .ct{display:flex;justify-content:center;gap:48px;margin-top:64px;padding-top:40px;border-top:1px solid var(--u-line);text-align:left}.uv9-close dt{font-size:16px;font-weight:700;color:var(--u-ink)}.uv9-close dd{font-size:15.5px;color:var(--u-mu)}.uv9-close dd a{min-height:44px;display:inline-flex;align-items:center}
.uv9-close.v-split .box{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--u-line);background:var(--u-bg2)}.uv9-close.v-split .box.one{grid-template-columns:minmax(0,1fr)}.uv9-close.v-split .uv9-close-ph{position:relative!important;min-height:460px}
.uv9-close.v-split .in{padding:72px 64px;display:flex;flex-direction:column;justify-content:center}.uv9-close.v-split h2{font-size:38px;color:var(--u-acct)}.uv9-close.v-split .uv9-lead{margin:16px 0 0}.uv9-close.v-split .uv9-btns{margin-top:30px}
.uv9-close.v-split dl{margin-top:30px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 18px;align-items:center}.uv9-close.v-split dl div{display:contents}.uv9-close.v-split dt{font-size:15px;color:var(--u-acct)}
/* ── 휴대폰 ── */
@media(max-width:760px){
body .hpt.uv9.hp-s.uv9-big.brand,body .hpt.uv9.hp-s.uv9-motto{padding:88px 0}body .hpt.uv9.hp-s.uv9-whos{padding:56px 0 0}.uv9-board .bnt li a{grid-template-columns:minmax(0,1fr)!important}.uv9-idx a>*{min-width:0}.uv9-idx .th{width:92px}
.uv9{--sp:84px}.uv9 .uv9-w{padding:0 20px}
.uv9 h2{font-size:32px;line-height:1.28}.uv9 .uv9-lead{font-size:16.5px}.uv9 .uv9-lab{font-size:14px;margin-bottom:12px}.uv9 .uv9-sh.c{margin-bottom:36px}
.uv9 .uv9-btn{min-height:54px;padding:0 16px;font-size:16px;flex:1 1 0}.uv9 .uv9-btn svg{display:none}
.uv9 .uv9-g2,.uv9-quote .uv9-gq,.uv9-big.brand .uv9-g2b,.uv9-bg,.uv9-bg.n3,.uv9-close.v-split .box{grid-template-columns:minmax(0,1fr);gap:40px}
.uv9 .uv9-hrow{flex-direction:column;align-items:flex-start;gap:14px;margin-bottom:28px}
.uv9-idx a{grid-template-columns:minmax(0,1fr) 92px;gap:8px 16px;padding:22px 0}.uv9-idx .no,.uv9-idx .go{display:none}.uv9-idx .tt{grid-column:1;grid-row:1}.uv9-idx .tt b{font-size:20px}.uv9-idx .tt small{display:none}.uv9-idx .mt{grid-column:1;grid-row:2}.uv9-idx .mt b{font-size:14.5px}.uv9-idx .mt small{font-size:13.5px}.uv9-idx .th{grid-column:2;grid-row:1/3;height:92px}
.uv9-tall,.uv9-card,.uv9-frame{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin:0 -20px;padding:0 20px 4px;scrollbar-width:none}.uv9-tall::-webkit-scrollbar,.uv9-card::-webkit-scrollbar,.uv9-frame::-webkit-scrollbar{display:none}
.uv9-tall li,.uv9-card li,.uv9-frame li{flex:0 0 80%;scroll-snap-align:start}.uv9-tall .tx{left:22px;right:22px;bottom:22px}.uv9-tall .tx b{font-size:22px}.uv9-card .uv9-ph{border-radius:18px}.uv9-card b{font-size:20px}.uv9-frame .tx b{font-size:20px}
.uv9-story-ph,.uv9-q-ph{height:300px}.uv9-facts dd{font-size:26px}.uv9 .uv9-facts{gap:20px;margin-top:32px}
.hpt.uv9-big.brand{padding:92px 0}.uv9-big.brand .uv9-num{font-size:96px}.uv9-big.brand .uv9-num span{font-size:30px}.uv9-big.mist .uv9-num{font-size:110px}.uv9-big.mist .uv9-num span{font-size:56px}
.uv9-q blockquote{font-size:24px}.uv9-q blockquote::before{font-size:72px;margin-bottom:8px}.uv9-quote.v-center .uv9-q blockquote{font-size:25px}
.uv9-board h3{font-size:24px}.uv9-board .bcol li a{grid-template-columns:72px minmax(0,1fr);padding:16px 0}.uv9-board time b{font-size:17px}.uv9-board .bcol li span b{font-size:16px}
.uv9 .uv9-paths{grid-template-columns:1fr 1fr;margin-top:28px}.uv9-paths a,.uv9-paths a+a{padding:18px 12px 20px 0;border-right:0;border-bottom:1px solid var(--u-line)}.uv9-paths a:nth-child(even){padding-left:12px;border-left:1px solid var(--u-line)}.uv9-paths a:nth-last-child(-n+2){border-bottom:0}.uv9-paths b{font-size:16.5px}.uv9-paths small{font-size:13px}
.uv9-bar .uv9-w,.uv9-quick .uv9-w{grid-template-columns:1fr 1fr;padding:0}.uv9-bar a,.uv9-bar a:first-child{padding:20px 20px 22px;border-left:0;border-top:1px solid var(--u-onl)}.uv9-bar a:nth-child(even){border-left:1px solid var(--u-onl)}.uv9-bar a:nth-child(-n+2){border-top:0}.uv9-bar b{font-size:17px}.uv9-bar small{font-size:13px}
.uv9-quick a,.uv9-quick a:first-child{padding:20px 8px;border-left:0;border-top:1px solid var(--u-line)}.uv9-quick a:nth-child(even){border-left:1px solid var(--u-line)}.uv9-quick a:nth-child(-n+2){border-top:0}.uv9-quick b{font-size:17px}.uv9-quick small{font-size:13px}
.uv9 .uv9-who{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:20px}.uv9-who .q{grid-column:1/-1}.uv9-who .q.e{display:none}.uv9-who a{min-height:52px;padding:0 14px;font-size:15.5px;justify-content:space-between;white-space:nowrap;letter-spacing:-.04em}.hpt.uv9-whos{padding:56px 0 0}
.hpt.uv9-band{min-height:640px;align-items:flex-end}.uv9-band .uv9-scrim{background:linear-gradient(180deg,transparent 15%,var(--u-scr2) 55%,var(--u-scr) 100%)}.uv9-band .uv9-w{padding-top:220px;padding-bottom:48px}.uv9-band h2{font-size:34px}.uv9-band ul{gap:20px;margin:28px 0}.uv9-band li{font-size:13px}.uv9-band li b{font-size:20px}
.uv9-open-ph{height:280px;border-radius:16px}.uv9-links b{font-size:17px}.uv9-links small{font-size:14px}
.uv9-lms-ph{height:300px;border-radius:20px}.uv9-steps b{font-size:18px}.uv9-steps small{font-size:15px}
.uv9-medal .md{width:280px;height:280px}.uv9-medal .core{inset:30px;padding:0 24px}.uv9-medal .core b{font-size:22px}.uv9-medal .core small{font-size:13px}.uv9-medal .tag{font-size:13px;top:18px;right:-8px}.uv9-medal .uv9-num{font-size:84px}.uv9-medal .uv9-num span{font-size:28px}.uv9-medal .uv9-g2>div:last-child{order:-1}
.hpt.uv9-motto{padding:88px 0}.uv9-motto .big{font-size:26px}.uv9-motto .since{gap:20px;margin-top:40px;padding-top:28px}.uv9-motto dd{font-size:26px}.uv9-motto dt{font-size:13px}
.uv9 .uv9-rule{font-size:13px;letter-spacing:.1em}.uv9 .uv9-rule::before,.uv9 .uv9-rule::after{width:26px}
.uv9-close.v-photo .uv9-w{padding:0}.uv9-close.v-photo .box{border-radius:0;min-height:0;align-items:flex-end}.uv9-close.v-photo .uv9-scrim{background:linear-gradient(180deg,rgba(20,14,12,.25),rgba(20,14,12,.85))}.uv9-close.v-photo .in{padding:220px 20px 44px}.uv9-close.v-photo h2,.uv9-close.v-navy h2,.uv9-close.v-center h2{font-size:34px}
.uv9-close .ct{flex-direction:column;gap:18px;margin-top:40px}.uv9-close.v-split .uv9-w{padding:0}.uv9-close.v-split .box{gap:0;border-left:0;border-right:0}.uv9-close.v-split .uv9-close-ph{min-height:240px}.uv9-close.v-split .in{padding:40px 20px}.uv9-close.v-split h2{font-size:28px}.uv9-close.v-split dl{grid-template-columns:minmax(0,1fr)}
}`;

  /* 테마별 첫 화면 · 머리글 · 바닥글 */
  const HEROCSS = {
    uvivy: (c) => `
${BR}{background:var(--u-bg)}
.hp-hero.uv9-ivy-h{padding:104px 0 0;background:var(--u-bg)}
.uv9-ivy-h .uv9-kick{font-size:15px;font-weight:650;letter-spacing:.04em;color:var(--u-acct);margin-bottom:26px}
.uv9-ivy-h h1{font-size:86px;line-height:1.14;max-width:1000px}
.uv9-ivy-row{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-top:42px}.uv9-ivy-row .uv9-lead{max-width:540px;font-size:20px}
.uv9 .uv9-ivy-ph{margin-top:68px;height:620px;border-radius:4px}
.uv9 .uv9-cap{display:flex;justify-content:space-between;gap:16px;font-size:13.5px;color:var(--u-mu);padding-top:14px}
.hpt.uv9-cls.v-index{background:var(--u-bg2)}
@media(max-width:760px){.hp-hero.uv9-ivy-h{padding:52px 0 0}.uv9-ivy-h h1{font-size:40px;line-height:1.22}.uv9-ivy-row{flex-direction:column;align-items:stretch;gap:26px;margin-top:20px}.uv9-ivy-row .uv9-lead{font-size:16.5px}.uv9-ivy-row .uv9-btns{flex-wrap:nowrap}.uv9 .uv9-ivy-ph{margin:36px -20px 0;height:300px;border-radius:0}.uv9 .uv9-cap{justify-content:flex-start}.uv9 .uv9-cap span:first-child:empty{display:none}}`,
    uvcine: (c) => `
.hp-hero.uv9-cine-h{position:relative;height:100vh;min-height:760px;max-height:960px;color:#fff;overflow:hidden;background:var(--u-adk);display:flex;align-items:flex-end;padding:0 0 96px;margin-top:calc(-1 * var(--hps-hh,0px))}
.uv9 .uv9-cine-ph{position:absolute!important;inset:0;height:auto}.uv9-cine-h .uv9-cine-ph[data-stock] img,.uv9-cine-h .uv9-cine-ph.st img{transform:scaleX(-1) scale(1.18);transform-origin:50% 0}
.uv9-cine-h .uv9-scrim{background:linear-gradient(180deg,rgba(7,20,36,.5) 0%,rgba(7,20,36,0) 20%),linear-gradient(90deg,var(--u-scr) 0%,var(--u-scr2) 38%,transparent 64%),linear-gradient(0deg,rgba(7,20,36,.5) 0%,transparent 40%)}
.uv9-cine-tx{position:relative;z-index:2;width:100%}
.uv9-cine-h .uv9-eyl{display:inline-flex;align-items:center;gap:10px;font-size:16px;font-weight:600;margin-bottom:22px;color:#fff}.uv9-cine-h .uv9-eyl::before{content:"";width:28px;height:2px;background:var(--u-ptl)}
.uv9-cine-h h1{font-size:90px;line-height:1.08;color:#fff;max-width:900px}.uv9-cine-h .uv9-lead{color:rgba(255,255,255,.92);font-size:20px;max-width:540px;margin:28px 0 38px}
@media(max-width:760px){.hp-hero.uv9-cine-h{height:760px;min-height:0;padding-bottom:40px}.uv9-cine-h .uv9-scrim{background:linear-gradient(180deg,rgba(7,20,36,.45) 0%,transparent 16%,transparent 34%,var(--u-scr2) 66%,var(--u-scr) 100%)}.uv9-cine-h h1{font-size:42px;line-height:1.16}.uv9-cine-h .uv9-eyl{font-size:14px;margin-bottom:14px}.uv9-cine-h .uv9-lead{font-size:16px;margin:18px 0 26px}.uv9-cine-h .uv9-btns{flex-wrap:nowrap}.uv9-cine-h .uv9-cine-ph.st img{transform:scaleX(-1) scale(1.05)}}`,
    uvcollage: (c) => `
.hp-hero.uv9-col-h{padding:72px 0 0;text-align:center;background:var(--u-bg)}
.uv9-col-h .uv9-pre{font-size:16px;font-weight:650;color:var(--u-acct);margin-bottom:22px}
.uv9-col-h h1{font-size:84px;line-height:1.1}
.uv9-col-h .uv9-lead{font-size:20px;max-width:620px;margin:28px auto 0}.uv9-col-h .uv9-btns{justify-content:center;margin-top:40px}
.uv9-col-h .uv9-btn{border-radius:16px}.uv9-col-h .uv9-btn.p{box-shadow:0 10px 26px -10px var(--u-ash)}
.uv9-col-h .uv9-safe{font-size:14px;color:var(--u-mu);margin-top:18px}
.uv9-colg{display:grid;grid-template-columns:1fr 1.1fr 1.35fr 1.1fr 1fr;gap:18px;align-items:end;max-width:1360px;margin:60px auto 0;padding:0 40px}
.uv9-colg>div{border-radius:28px;overflow:hidden}.uv9-colg .uv9-ph{height:100%}
.uv9-colg .c1,.uv9-colg .c5{height:300px}.uv9-colg .c2,.uv9-colg .c4{height:400px}.uv9-colg .c3{height:480px}
.uv9-colg.n1{grid-template-columns:minmax(0,820px);justify-content:center}.uv9-colg.n1 .c1{height:480px}
.hpt.uv9-quote.v-center,.hpt.uv9-quote.v-brand{background:var(--u-a)}.uv9-quote.v-brand .uv9-gq{grid-template-columns:1.6fr 1fr}.uv9-quote.v-brand .uv9-gq .uv9-q-ph{order:2;height:420px;border-radius:28px;transform:rotate(2deg)}.uv9-quote.v-brand blockquote{color:var(--u-on);font-weight:750;font-size:44px}.uv9-quote.v-brand blockquote::before{display:none}.uv9-quote.v-brand figcaption{color:var(--u-onm)}
@media(max-width:760px){.hp-hero.uv9-col-h{padding:52px 0 0}.uv9-col-h h1{font-size:40px;line-height:1.18}.uv9-col-h .uv9-lead{font-size:16px;margin-top:18px}.uv9-col-h .uv9-btns{flex-direction:column;margin-top:30px}.uv9-col-h .uv9-btn{width:100%;flex:0 0 auto}
.uv9-colg{grid-template-columns:1fr 1.3fr 1fr;gap:10px;margin-top:44px;padding:0;overflow:hidden}.uv9-colg>div{border-radius:18px}.uv9-colg .c1,.uv9-colg .c5{display:none}.uv9-colg .c2,.uv9-colg .c4{height:200px}.uv9-colg .c3{height:260px}.uv9-colg .c2{margin-left:-30px}.uv9-colg .c4{margin-right:-30px}
.uv9-quote.v-brand .uv9-gq{grid-template-columns:minmax(0,1fr)}.uv9-colg.n1{grid-template-columns:minmax(0,1fr);padding:0 20px}.uv9-colg.n1 .c1{display:block;height:260px}.uv9-quote.v-brand blockquote{font-size:26px}.uv9-quote.v-brand .uv9-gq .uv9-q-ph{order:0;transform:none;height:240px;border-radius:20px}}`,
    uvclassic: (c) => `
.hp-hero.uv9-cls-h{position:relative;height:640px;color:#fff;text-align:center;overflow:hidden;background:var(--u-adk);display:flex;align-items:center;justify-content:center}
.uv9 .uv9-cls-ph{position:absolute!important;inset:0;height:auto}.uv9-cls-h .uv9-scrim{background:linear-gradient(180deg,var(--u-scr2),rgba(10,20,40,.38) 40%,var(--u-scr))}
.uv9-cls-in{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;padding:0 24px;max-width:1000px}
.uv9-cls-h h1{font-size:70px;line-height:1.26;letter-spacing:-.02em;color:#fff;margin:24px 0 20px}.uv9-cls-h .uv9-lead{color:rgba(255,255,255,.9);max-width:620px}.uv9-cls-h .uv9-btns{justify-content:center;margin-top:36px}
.uv9-cls-h .uv9-btn,.uv9-close.v-split .uv9-btn,.uv9-cls .uv9-more{border-radius:2px}
@media(max-width:760px){.hp-hero.uv9-cls-h{height:600px}.uv9-cls-h h1{font-size:36px}.uv9-cls-h .uv9-lead{font-size:16px}.uv9-cls-h .uv9-btns{flex-direction:column;width:100%;max-width:340px}.uv9-cls-h .uv9-btn{flex:0 0 auto}}`
  };

  function tok(s) { const T = HPT.tokens(s); if (!T) return null; const th = s.theme; const a = T.a; const Rm = ramp(a);
    const P = { uvivy: { bg: '#F6F2EA', bg2: '#EFE9DD', ink: '#1B1915', mu: '#55504A', line: '#D9D1C3', pt: '#B8893A', hf: "'Noto Serif KR','Noto Serif CJK KR',serif", hw: 700, hls: '-.03em', qf: "'Noto Serif KR','Noto Serif CJK KR',serif", qw: 500, br: '999px', nf: "'Noto Serif KR','Noto Serif CJK KR',serif" },
      uvcine: { bg: '#FFFFFF', bg2: '#F3F4F6', ink: '#0E1621', mu: '#5A6472', line: '#E3E6EA', pt: '#FFB547', hf: 'inherit', hw: 800, hls: '-.04em', qf: 'inherit', qw: 700, br: '999px', nf: 'inherit' },
      uvcollage: { bg: '#FBFAF7', bg2: '#F2F0EB', ink: '#111214', mu: '#62656C', line: '#E7E5E0', pt: '#FF6B3D', hf: 'inherit', hw: 800, hls: '-.045em', qf: 'inherit', qw: 750, br: '16px', nf: 'inherit' },
      uvclassic: { bg: '#FAF8F3', bg2: '#FFFFFF', ink: '#18202C', mu: '#5B6270', line: '#E2DDD2', pt: '#B08D57', hf: "'Noto Serif KR','Noto Serif CJK KR',serif", hw: 700, hls: '-.02em', qf: "'Noto Serif KR','Noto Serif CJK KR',serif", qw: 500, br: '2px', nf: "'Noto Serif KR','Noto Serif CJK KR',serif" } }[th];
    const on = HPT.onColor ? HPT.onColor(a) : '#ffffff';
    let adk = mix(Rm[900] || mix(a, '#000000', .62), '#0B1220', .35); for (let k = 0; k < 8 && U.CR && U.CR('#ffffff', adk) < 9; k++) adk = mix(adk, '#000000', .2);
    const acct = fit(a, P.bg, 4.6, '#000000'); const ptt = fit(P.pt, P.bg, 4.6, '#000000'); const pton = U.CR && U.CR('#ffffff', P.pt) >= 4.5 ? '#ffffff' : fit(mix(P.pt, '#000000', .7), P.pt, 4.6, '#000000');
    const ptl = fit(mix(P.pt, '#ffffff', .25), adk, 4.6, '#ffffff');
    return Object.assign({}, P, { a, on, adk, acct, ptt, pton, ptl, a2: mix(a, '#ffffff', .4), onm: al(on, .78), onl: al(on, .16), ph: mix(a, P.bg, .85), ph2: mix(a, P.bg, .7), line2: P.line, scr: al(adk, .88), scr2: al(adk, .58), ash: al(a, .6) }); }
  function themeCSS(s, partOnly) { const k = tok(s); if (!k) return ''; const th = s.theme;
    const v = `--u-a:${k.a};--u-on:${k.on};--u-adk:${k.adk};--u-acct:${k.acct};--u-pt:${k.pt};--u-ptt:${k.ptt};--u-pton:${k.pton};--u-ptl:${k.ptl};--u-a2:${k.a2};--u-onm:${k.onm};--u-onl:${k.onl};--u-bg:${k.bg};--u-bg2:${k.bg2};--u-ink:${k.ink};--u-mu:${k.mu};--u-line:${k.line};--u-line2:${k.line2};--u-ph:${k.ph};--u-ph2:${k.ph2};--u-hf:${k.hf};--u-hw:${k.hw};--u-hls:${k.hls};--u-qf:${k.qf};--u-qw:${k.qw};--u-br:${k.br};--u-nf:${k.nf};--u-scr:${k.scr};--u-scr2:${k.scr2};--u-ash:${k.ash};--u-bf:inherit;--u-sbg:${th === 'uvcollage' ? '#ffffff' : 'transparent'};--u-sbd:${th === 'uvcollage' || th === 'uvcine' ? k.line : th === 'uvclassic' ? k.acct : k.ink}`;
    if (partOnly) return `\n/* v43.9 hpv-univ parts */.uv9{${v}}`;
    return `\n/* v43.9 hpv-univ ${th} */${BR}{${v};background:${k.bg}}.uv9{${v}}` + (HEROCSS[th] ? HEROCSS[th](k) : '') + chromeCSS(th, k); }
  /* 머리글 · 바닥글 다듬기(공통 부품의 겉모습만, 구조는 그대로) */
  function chromeCSS(th, k) { const B = BR;
    const solid = `${B} .hps-h{background:${k.bg}!important;border-bottom:1px solid ${k.line};box-shadow:none!important}${B} .hps-h .hps-hw{max-width:1200px;min-height:84px}${B} .hps-h .s2-mi>a{color:${k.mu}!important;font-weight:550}${B} .hps-h .s2-mi>a:hover{color:${k.ink}!important}${B} .hps-h .hps-wmk b,${B} .hps-h .logo{color:${k.ink}!important}`;
    const foot = `${B} .hps-f{background:${k.bg}!important;color:${k.mu}!important;border-top:1px solid ${k.ink}}${B} .hps-f :is(p,dt,dd,li,a,span,small){color:${k.mu}!important}${B} .hps-f .hps-fn{color:${k.ink}!important}`;
    if (th === 'uvivy') return solid + `${B} .hps-h .hps-wmk b{font-family:${k.hf};font-weight:700;letter-spacing:-.02em}${B} .hps-h .hps-cta{background:transparent!important;color:${k.ink}!important;box-shadow:inset 0 0 0 1px ${k.ink}!important;border-radius:999px!important}` + foot + `${B} .hps-f .hps-fn{font-family:${k.hf}}`;
    if (th === 'uvcollage') return solid.replace(`border-bottom:1px solid ${k.line}`, 'border-bottom:0') + `${B} .hps-h .hps-wmk b{font-weight:800;letter-spacing:-.03em}${B} .hps-h .hps-cta{background:${k.ink}!important;color:#fff!important;border-radius:999px!important}` + foot.replace(`border-top:1px solid ${k.ink}`, `border-top:1px solid ${k.line}`);
    if (th === 'uvcine') return `${B} .hps-h.hps-h-overlay .hps-cta{background:rgba(255,255,255,.16)!important;color:#fff!important;border-radius:999px!important;backdrop-filter:blur(8px)}${B} .hps-f{background:${k.adk}!important;border-top:1px solid ${k.onl}}${B} .hps-f :is(p,dt,dd,li,a,span,small){color:rgba(255,255,255,.72)!important}${B} .hps-f .hps-fn{color:#fff!important}`;
    if (th === 'uvclassic') return `${B} .hps-h{background:${k.adk}!important;box-shadow:none!important;border:0}${B} .hps-h :is(a,b,span,.s2-mi>a){color:#fff!important}${B} .hps-h .s2-mi>a{font-weight:550;opacity:.92}${B} .hps-h .hps-wmk b{font-family:${k.hf};font-weight:700;letter-spacing:.08em;font-size:28px}${B} .hps-h .hps-c1{min-height:150px!important}${B} .hps-h .hps-c2{border-top:1px solid rgba(255,255,255,.14)}@media(max-width:760px){${B} .hps-h .hps-c1{min-height:64px!important}${B} .hps-h .hps-wmk{flex-direction:row!important;gap:10px!important;padding:0!important}${B} .hps-h .hps-wmk::before{width:28px!important;height:32px!important}${B} .hps-h .hps-wmk b{font-size:20px!important;letter-spacing:.04em!important;white-space:nowrap}}${B} .hps-h .hps-cta{background:${k.pt}!important;color:${k.pton}!important;border-radius:2px!important}${B} .hps-h .hps-ut{background:${mix(k.adk, '#000000', .3)}!important}${B} .hps-h .hps-wmk{display:inline-flex;flex-direction:column;align-items:center;gap:8px;padding:14px 0 6px}${B} .hps-h .hps-wmk::before{content:"";width:44px;height:50px;flex:0 0 auto;background:url("data:image/svg+xml,${encodeURIComponent(CREST('').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/currentColor/g, k.ptl))}") center/contain no-repeat}${BR} .hpt.uv9.hp-s.uv9-motto{background:${k.adk}}${B} .hps-f{background:${mix(k.adk, '#000000', .25)}!important;text-align:center}${B} .hps-f :is(p,dt,dd,li,a,span,small){color:rgba(255,255,255,.7)!important}${B} .hps-f .hps-fn{color:#fff!important;font-family:${k.hf};letter-spacing:.08em}`;
    return ''; }

  const FIX = `
.hps-login,.hps-tel,.hps-utt,.hps-utr a{min-height:44px;display:inline-flex!important;align-items:center}.hps-login{min-width:44px;justify-content:center}.hps-cta,.hps-hr .hps-cta{min-height:48px!important}.s2-mi>a{min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center}.hps-lw,.hp-all{min-height:44px;display:inline-flex!important;align-items:center}.hps-fl a,.hps-fc li a,.hps-fb a,.hps-lg a{display:inline-flex;align-items:center;min-height:44px;min-width:44px}a[href^="tel:"],a[href^="mailto:"]{display:inline-flex;align-items:center;min-height:44px}.hps-f li>a{min-height:44px;display:flex;align-items:center}.hps-tag,.hps-new{font-size:13px!important}.hpt dd small,.hpt .hps-fv small{font-size:13px!important}`;

  { const base = siteHTML; siteHTML = (s, full, lang) => { try { USED.clear(); PHM.clear(); } catch (e) { }
    let s2 = s; try { if (mine(s)) { const c = (s.hps && typeof s.hps === 'object') ? s.hps : {}; const [h, f] = CH[s.theme]; const o = Object.assign({}, c); if (!c.ownH) { o.head = h; o.ownH = 1; } if (!c.ownF) { o.foot = f; o.ownF = 1; } s2 = Object.assign({}, s, { hps: o }); } } catch (e) { s2 = s; }
    const out = base(s2, full, lang); if (!s || !Array.isArray(s.sections)) return out;
    try { const part = s.sections.some(x => x && x.type === 'text' && x.data && R[x.data.hpt]); const me = mine(s); if (!part && !me) return out;
      const tv = me ? themeCSS(s) : themeCSS(Object.assign({}, s, { theme: 'uvivy' }), true);
      return out.replace('</style>', (FIX + CORE + tv).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hpv-univ css', e); return out; } }; window.siteHTML = siteHTML; }

  /* ── 공통 등록 도우미(갤러리 추천: 대학 기관에서 이 묶음을 앞에) ── */
  if (!HPT.xtag) { HPT.xtag = {};
    if (typeof HPT.premFits === 'function') { const f0 = HPT.premFits; HPT.premFits = (id, ty) => { const g = HPT.xtag[id]; if (!g) return f0(id, ty); ty = ty || (() => { try { return S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type; } catch (e) { return ''; } })(); return g.includes(ty) || g.includes(ty === 'univ_lms' ? 'univ' : ty); }; }
    if (typeof HPT.premFor === 'function') { const f0 = HPT.premFor; HPT.premFor = ty => { const L = f0(ty); const X = Object.keys(HPT.xtag); const fit1 = X.filter(id => HPT.premFits(id, ty)); return [...fit1, ...L.filter(id => !X.includes(id)), ...X.filter(id => !fit1.includes(id))]; }; }
    if (typeof HPT.thumb === 'function') { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!HPT.xtag[id] || typeof siteHTML !== 'function') return tb(s, id);
      try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.theme === id && t.prem); if (tp && typeof tp.build === 'function') b.sections = tp.build(); return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpv thumb', e); return tb(s, id); } }; } }

  /* ── 테마 · 글자 토큰 · 템플릿 ── */
  const DEF = {
    uvivy: { name: '에디토리얼 아이비', desc: '크림 바탕 · 세리프 큰 제목 · 넓은 사진 한 장 · 목차형 프로그램 목록 · 큰 숫자 하나 — 잡지처럼 읽히는 대학 비교과', tags: ['univ', 'univ_lms'], tone: 'light', dens: '여유',
      acc: '#7A1F2B', bg: '#F6F2EA', alt: '#EFE9DD', ink: '#1B1915', mu: '#55504A', r: 4, br: 999, hero: 'split', vis: 'photo', illu: 'campus', card: 'flat', look: 'campus', sw2: '#5E1520', base: 'campus', hk: 'uvivy', ck: 'photo', sh: 'none' },
    uvcine: { name: '시네마틱 캠퍼스', desc: '화면을 가득 채운 캠퍼스 사진 · 큰 한 문장 · 기관 색 바로 가기 띠 · 세로 사진 카드 · 사진 띠', tags: ['univ', 'univ_lms'], tone: 'light', dens: '여유',
      acc: '#0B3A66', bg: '#FFFFFF', alt: '#F3F4F6', ink: '#0E1621', mu: '#5A6472', r: 20, br: 999, hero: 'full', vis: 'photo', illu: 'campus', card: 'flat', look: 'campus', sw2: '#072845', base: 'campus', hk: 'uvcine', ck: 'photo', sh: 'none' },
    uvcollage: { name: '모던 콜라주', desc: '가운데 큰 제목 · 높낮이가 다른 사진 콜라주 · 「저는 ○○예요」 바로 가기 · 강좌 카드 · 배지 메달', tags: ['univ', 'univ_lms'], tone: 'light', dens: '여유',
      acc: '#2C46E0', bg: '#FBFAF7', alt: '#F2F0EB', ink: '#111214', mu: '#62656C', r: 24, br: 16, hero: 'split', vis: 'photo', illu: 'campus', card: 'flat', look: 'clean', sw2: '#1A2C9E', base: 'clean', hk: 'uvcollage', ck: 'photo', sh: 'none' },
    uvclassic: { name: '전통 대학', desc: '교표 · 가운데 기관명 · 세리프 · 대칭 구성 · 학사 공지 · 일정 · 행사 정돈 · 교육 이념 — 격식 있는 대학', tags: ['univ', 'univ_lms'], tone: 'light', dens: '보통',
      acc: '#132A4F', bg: '#FAF8F3', alt: '#FFFFFF', ink: '#18202C', mu: '#5B6270', r: 0, br: 2, hero: 'full', vis: 'photo', illu: 'campus', card: 'flat', look: 'campus', sw2: '#0C1D38', base: 'campus', hk: 'uvclassic', ck: 'photo', sh: 'none' } };
  const HD = { uvivy: { hf: 'serif', hw: 700, hls: -0.03, h1: 86, h1m: 40, lh1: 1.14, h2: 52, h2m: 32, h3: 20, body: 17, blh: 1.7, lead: 19, ey: { fs: 15, ls: 0.04, fw: 650, tt: 'none' }, sec: 140, secm: 84, w: 1200, gut: 40, r: 4, rs: 3, br: 999, bh: 58, bpx: 30, bfw: 700, bls: -0.01, bd: '1px solid #D9D1C3', sh: 'none', shh: 'none', hov: 'line', em: 'accent', link: 'underline' },
    uvcine: { hf: 'sans', hw: 800, hls: -0.045, h1: 90, h1m: 42, lh1: 1.08, h2: 58, h2m: 34, h3: 20, body: 17, blh: 1.65, lead: 19, ey: { fs: 16, ls: 0, fw: 600, tt: 'none' }, sec: 150, secm: 84, w: 1240, gut: 40, r: 20, rs: 12, br: 999, bh: 60, bpx: 32, bfw: 700, bls: -0.01, bd: '1px solid #E3E6EA', sh: 'none', shh: 'none', hov: 'lift', em: 'plain', link: 'hover' },
    uvcollage: { hf: 'sans', hw: 800, hls: -0.05, h1: 84, h1m: 40, lh1: 1.1, h2: 56, h2m: 34, h3: 22, body: 17, blh: 1.65, lead: 20, ey: { fs: 16, ls: 0, fw: 650, tt: 'none' }, sec: 150, secm: 84, w: 1200, gut: 40, r: 24, rs: 16, br: 16, bh: 58, bpx: 30, bfw: 700, bls: -0.01, bd: '1px solid #E7E5E0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' },
    uvclassic: { hf: 'serif', hw: 700, hls: -0.02, h1: 70, h1m: 36, lh1: 1.26, h2: 46, h2m: 30, h3: 22, body: 17, blh: 1.7, lead: 19, ey: { fs: 14, ls: 0.16, fw: 600, tt: 'uppercase' }, sec: 140, secm: 84, w: 1200, gut: 40, r: 0, rs: 0, br: 2, bh: 56, bpx: 32, bfw: 650, bls: 0.01, bd: '1px solid #E2DDD2', sh: 'none', shh: 'none', hov: 'border', em: 'plain', link: 'underline' } };
  const cssX = () => '';
  const S2x = (type, data) => (typeof S2 === 'function' ? S2(type, data) : { id: 'x' + Math.random().toString(36).slice(2, 9), type, data });
  const P = (hpt, o) => S2x('text', Object.assign({ variant: 'features', hpt, eyebrow: '', title: '', sub: '', cols: [] }, o || {}));
  const T = {
    uvivy: { scene: '대학 비교과 · 열린 강좌 — 크림 바탕 세리프 제목과 넓은 사진 한 장으로 여는 에디토리얼 구성', purpose: ['learn', 'apply', 'info'],
      build: () => [S2x('banner', { eyebrow: '', title: '강의실 밖에서,\n배움은 [더 넓어져요.]', sub: '전공 수업만으로는 채워지지 않는 것들. 취업 · 글쓰기 · AI까지, 이번 학기 학생에게 열린 비교과 프로그램을 만나 보세요.', cta: '프로그램 둘러보기', cta2: '학번으로 로그인' }),
        P('uv9-story', { eyebrow: '왜 비교과인가요', title: '졸업장에 적히지 않는\n네 해의 기록을 남겨요.', body: '프로그램을 마치면 디지털 배지와 이수증이 바로 발급돼요. 모아 둔 기록은 취업 포트폴리오와 장학 심사에 그대로 쓸 수 있어요.', cols: [['이야기', '글 + 사진']] }),
        P('uv9-cls', { view: 'index', eyebrow: '이번 학기 프로그램', title: '지금 신청할 수 있어요', n: 4, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('uv9-big', { view: 'brand', eyebrow: '이수 · 디지털 배지', cols: [['큰 숫자', '발급 배지 · 이수증 · 강좌 수']] }),
        P('uv9-quote', { view: 'photo', quote: '전공 너머에서 만난 문제와 사람이, 졸업 뒤의 길을 넓혀 줘요.', by: '', cols: [['인용', '기관의 한마디']] }),
        P('uv9-board', { view: 'text', title: '놓치면 안 되는 날', title2: '새 소식', cols: [['학사 일정', ''], ['공지', '']] }),
        P('uv9-close', { view: 'photo', title: '이번 학기,\n하나만 골라 보세요.', sub: '신청부터 이수 확인까지 학번 하나로 이어져요.', cta: '프로그램 둘러보기', cta2: '협력 · 수강 문의', cols: [['신청', ''], ['문의', '']] })] },
    uvcine: { scene: '대학 캠퍼스 포털 — 전면 사진과 큰 한 문장, 기관 색 바로 가기 띠로 여는 시네마틱 구성', purpose: ['learn', 'apply', 'info'],
      build: () => [S2x('banner', { eyebrow: '', title: '다음 학기의 나를,\n지금 만들어요.', sub: '비교과부터 온라인 강의실, 디지털 배지까지. 모든 배움이 학번 하나로 이어져요.', cta: '비교과 신청하기', cta2: '학번으로 로그인' }),
        P('uv9-cls', { view: 'tall', title: '이번 학기,\n이런 걸 배워요.', n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('uv9-band', { title: '강의실 문이 닫혀도,\n수업은 계속돼요.', cols: [['24시간', '언제든 수강'], ['이어 보기', '멈춘 곳부터'], ['바로 발급', '이수증 · 배지']] }),
        P('uv9-big', { view: 'mist', sub: '마치면 디지털 배지와 이수증이 바로 발급돼요.', cols: [['큰 숫자', '발급 배지 · 이수증 · 강좌 수']] }),
        P('uv9-open', { title: '학교 문은\n지역에도 열려 있어요.', cols: [['열린 강좌', ''], ['문의', ''], ['오시는 길', '']] }),
        P('uv9-quote', { view: 'center', quote: '신청은 가볍게, 배움은 깊게. 한 학기의 경험이 다음 학기의 나를 만들어요.', by: '', cols: [['인용', '기관의 한마디']] }),
        P('uv9-close', { view: 'navy', title: '신청은 1분이면 충분해요.', sub: '학번으로 로그인하고, 듣고 싶은 프로그램을 고르면 끝이에요.', cta: '비교과 신청하기', cta2: '학번으로 로그인', cols: [['신청', ''], ['로그인', '']] })] },
    uvcollage: { scene: '대학 학습 포털 — 가운데 큰 제목과 사진 콜라주, 문장형 바로 가기로 여는 모던 구성', purpose: ['learn', 'apply'],
      build: () => [S2x('banner', { eyebrow: '', title: '듣고 싶던 수업,\n[학교 안에] 다 있어요.', sub: '비교과 · 교과목 · 열린 강좌를 한곳에서 찾고, 신청하고, 이수까지 확인해요.', cta: '프로그램 찾아보기', cta2: '학번으로 로그인' }),
        P('uv9-who', { cols: WHO.map(r => r.slice(0, 2)) }),
        P('uv9-cls', { view: 'card', title: '지금 신청할 수 있어요', n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('uv9-lms', { title: '신청하고 나면,\n나머지는 한 화면에서.', cols: [['강의 듣기', '멈춘 곳부터 이어서, 휴대폰에서도 그대로'], ['과제 · 퀴즈 내기', '마감 전에 알림을 보내 드려요'], ['이수 확인', '기준을 채우면 이수증이 바로 나와요']] }),
        P('uv9-medal', { title: '배운 만큼,\n배지로 남아요.', cols: [['배지', '발급 배지']] }),
        P('uv9-quote', { view: 'brand', quote: '다른 학과 친구들과 한 문제를 함께 푸는 경험, 학교 안에서 시작돼요.', by: '', cols: [['인용', '기관의 한마디']] }),
        P('uv9-close', { view: 'center', title: '이번 학기,\n무엇을 배워 볼까요?', sub: '학번으로 로그인하면 내가 신청할 수 있는 프로그램을 골라서 보여 드려요.', cta: '프로그램 찾아보기', cta2: '학번으로 로그인', cols: [['신청', ''], ['연락처', '']] })] },
    uvclassic: { scene: '전통 대학 — 교표 · 가운데 기관명 머리글, 세리프 제목, 학사 공지 · 일정 · 행사를 정돈한 격식 있는 구성', purpose: ['info', 'learn', 'apply'],
      build: () => [S2x('banner', { eyebrow: '', title: '깊이 배우고,\n넓게 나누는 사람', sub: '비교과 · 교과 · 열린 강좌를 한곳에서 신청하고, 이수까지 확인해요.', cta: '프로그램 신청하기', cta2: '학번으로 로그인' }),
        P('uv9-board', { view: 'cols3', title: '학사 일정', title2: '공지사항', title3: '다가오는 프로그램', cols: [['공지', ''], ['학사 일정', ''], ['프로그램', '']] }),
        P('uv9-cls', { view: 'frame', eyebrow: 'PROGRAMS', title: `이번 학기 프로그램`, n: 3, cols: [['강좌', '공개 강좌 자동 표시']] }),
        P('uv9-motto', { eyebrow: '교육 이념', quote: '진리를 탐구하고, 배운 것을 넓게 나누는 사람을 기른다.', since: '', cols: [['교육 이념', ''], ['수치', '']] }),
        P('uv9-close', { view: 'split', title: '산학 협력과\n열린 강좌 문의', sub: '지역 기관 · 기업과 함께하는 강좌, 시민을 위한 열린 강좌를 운영해요.', cta: '열린 강좌 보기', cta2: '전화로 문의하기', cols: [['문의', '']] })] } };
  /* 전통 대학 마지막 행동: 두 번째 버튼은 문의(tel) — close()의 split 기본값 */

  /* 배치 보강(HPT.enrich): 이 묶음 템플릿은 숫자 띠 · 공지 · 일정 자동 섹션을 넣지 않는다(첫 화면 바로 아래 덩어리와 겹침) */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hpvu) { const e0 = HPT.enrich; const f = s => { const r = e0(s); try { const L = s && s.sections; if (mine(s) && Array.isArray(L) && L.some(x => x && x.data && /^uv9-/.test(x.data.hpt || ''))) { for (let k = L.length - 1; k >= 0; k--) { const x = L[k]; if (x && !x.hpxKeep && (x.type === 'notices' || (x.type === 'text' && x.data && (x.data.hpt === 'sched' || x.data.hpt === 'facts' || x.data.variant === 'stats')))) L.splice(k, 1); }
          const ci = L.findIndex(x => x && x.data && x.data.hpt === 'uv9-close'); if (ci >= 0 && ci < L.length - 1) L.push(L.splice(ci, 1)[0]); /* 마지막 행동은 맨 끝(자동 FAQ 뒤) */ } } catch (e) { console.error('hpv-univ enrich', e); } return r; }; Object.keys(e0).forEach(k => { f[k] = e0[k]; }); f.hpvu = 1; HPT.enrich = f; }

  IDS.forEach(id => { if (!HPT.reg(id, Object.assign({ prem: 1, cssX }, DEF[id]))) return; HPT.xtag[id] = DEF[id].tags.slice();
    try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpv-univ HPD', e); }
    if (typeof TPL !== 'undefined' && !TPL.some(t => t.id === 'prem-' + id)) TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', 'univ'], scene: T[id].scene, color: DEF[id].acc, tone: id === 'uvclassic' ? '클래식' : '모던', look: DEF[id].look, theme: id, hero: '', purpose: T[id].purpose, prem: 1, build: T[id].build }); });
})();
