/* v43.8 hpx-univ — 대학 묶음 홈페이지 템플릿(수석 L1 · 보조 A1). 방향 문서: plan/tpl438/univ/DIRECTION.md
   대표님(2026-11-17 19:46 · 19:47): 「현재 템플릿보다 훨씬 높은 디자인 퀄리티 · 85점을 넘긴 템플릿만 배치」 「고객 시나리오별 UI · UX가 반영된 템플릿」
   - 첫 화면에서 「누가 무엇을 하러 왔는지」를 푼다: 재학생(비교과 신청 · 이수 · 일정) · 신입생(학번 로그인 · 먼저 들을 과정) · 교수자 · 산학 · 지역.
   - 사실 원칙: 마감 · 일정 · 배지 · 공지는 실제 데이터(공개 강좌의 모집 기간 · 개강일, 학습자에게 보이는 기관 일정, 배지 발급 기록, 공지)만 쓴다. 없으면 그 줄 · 판을 숨긴다.
   - 개인정보: 대학은 학번 · 학과만 받는다. 템플릿 문구 · 양식에 휴대폰 번호 입력을 두지 않는다.
   - 색: 기관 색 하나 → hpprem의 ramp(50~900) · onColor. 경고 코랄은 D-day 배지 전용. 대비 4.5:1 이상(fit).
   - 링크: 게시본 링크 규칙(#p-m-<메뉴> · #p-c-<강좌>는 sitemerge가 학습자 경로로 바꾼다) + 학습자 경로 그대로(#login · #cal · #badges · #my).
   배치 규칙: PASS 표(교차 심사 85점 이상)에 있는 id만 등록한다. 심사 전 테스트는 window.HPX_ALL = 1로 강제 등록.
   섹션 부품(text 섹션 data.hpt): uvx-who(방문자별 바로 가기) · uvx-badge(이수 · 배지 사다리) · uvx-board(학사 일정 + 공지). 보조 템플릿도 같은 부품을 쓴다.
   CSS는 JS 문자열로 사이트 CSS에 넣는다(게시본 Shadow DOM = 미리보기). 범위는 .hxu-u. */
'use strict';
(() => {
  /* 교차 심사 통과표 — 통합 담당이 채운다(85점 이상만). 비어 있으면 HPX_ALL일 때만 등록 */
  const PASS = {};
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const U = HPT.U; const { mix, fit, al, CR } = U;
  const ramp = HPT.ramp || (c => ({ 50: mix(c, '#ffffff', .94), 100: mix(c, '#ffffff', .86), 200: mix(c, '#ffffff', .7), 500: c, 700: mix(c, '#000000', .3), 800: mix(c, '#000000', .46), 900: mix(c, '#000000', .62) }));
  const WARN = '#E8553D';
  const E = v => esc(v == null ? '' : v);
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const term = k => (typeof t === 'function' ? t(k) : '강좌');
  const tday = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const okD = s => /^\d{4}-\d{2}-\d{2}/.test(String(s || ''));
  const dd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const days = (a, b) => Math.round((dd(b) - dd(a)) / 864e5);
  const WD = '일월화수목금토';
  const md = s => `${+String(s).slice(5, 7)}.${String(s).slice(8, 10)}`;
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5', cap: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', board: 'M3 4h18v12H3zM8 20l4-4 4 4', users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a7 7 0 0114 0v1M16 3.5a4 4 0 010 7.5M22 21v-1a6 6 0 00-4-5.6', award: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.5 14L7 21l5-3 5 3-1.5-7', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12.5a3 3 0 100-6 3 3 0 000 6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', mail: 'M3 6h18v12H3zM3 7l9 6 9-6' };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;
  const ID = 'uvhub';
  const IDS = [ID, 'uvlms', 'uvopen']; /* uvhub(L1) · uvlms · uvopen(보조 A1) */
  const on = id => !!(PASS[id] >= 85 || window.HPX_ALL);
  const mine = s => !!(s && IDS.includes(s.theme) && HPT.has && HPT.has(s.theme));

  /* ── 실제 데이터 ── */
  const pubAll = () => { try { return (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료' && c.status !== '삭제'); } catch (e) { return []; } };
  const menuOf = (s, k) => ((s && s.menus) || []).find(m => m && m.kind === k && m.on !== false && m.access !== '비공개');
  const href = { cls: s => { const m = menuOf(s, 'class'); return m ? '#p-m-' + m.id : pubAll()[0] ? '#p-c-' + pubAll()[0].id : '#p-m-class'; },
    notice: s => { const m = menuOf(s, 'notice'); return m ? '#p-m-' + m.id : '#p-m-notice'; },
    ask: () => { try { const f = (S.settings && S.settings.footer) || {}; if (f.tel && !isPh(f.tel)) return 'tel:' + String(f.tel).replace(/[^\d+]/g, ''); const em = f.email || f.mail; if (em && /@/.test(em)) return 'mailto:' + em; } catch (e) { } return '#p-m-board'; } };
  /* 마감 · 예정: 공개 강좌의 모집(recruit) · 개강 — hpsec-trust 일정과 같은 규칙 */
  function dues(n) { const T0 = tday(); const L = [];
    pubAll().forEach(c => { const r = c.recruit && c.recruit.on ? c.recruit : null; const from = r && okD(r.from) ? r.from.slice(0, 10) : ''; const to = r && okD(r.to) ? r.to.slice(0, 10) : ''; const st = okD(c.start) ? c.start.slice(0, 10) : '';
      const mode = r ? ({ first: '선착순', approve: '승인 후 확정', lottery: '추첨' }[r.mode] || '') : ''; const cap = r && +r.cap ? `정원 ${+r.cap}명` : '';
      if (r && to && to >= T0 && (!from || from <= T0)) L.push({ id: c.id, l: c.name, d: days(T0, to), k: 'open', sub: [`접수 ~${md(to)}`, cap, mode].filter(Boolean).join(' · '), at: to });
      else if (r && from && from > T0) L.push({ id: c.id, l: c.name, d: days(T0, from), k: 'soon', sub: [`접수 ${md(from)} 시작`, cap, mode].filter(Boolean).join(' · '), at: from });
      else if (st && st > T0) L.push({ id: c.id, l: c.name, d: days(T0, st), k: 'start', sub: `${md(st)} 개강`, at: st }); });
    return L.sort((a, b) => (a.k === 'open' ? 0 : 1) - (b.k === 'open' ? 0 : 1) || a.at.localeCompare(b.at)).slice(0, n || 3); }
  const running = n => pubAll().filter(c => c.status === '운영중').slice(0, n).map(c => ({ id: c.id, l: c.name, k: 'run', sub: okD(c.end) ? `수강 ~${md(c.end)}` : '진행 중' }));
  /* 학사 일정: 학습자에게 보이는 기관 일정(cxPub) + 모집 마감 · 개강 · 종강, 오늘부터 60일 */
  function events(n) { const T0 = tday(); const lim = (() => { const d = dd(T0); d.setDate(d.getDate() + 60); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(); const L = []; const seen = new Set();
    const add = (date, title, kind) => { if (!okD(date)) return; date = String(date).slice(0, 10); if (date < T0 || date > lim) return; const k = date + title; if (seen.has(k)) return; seen.add(k); L.push({ date, title, kind }); };
    try { (typeof cxPub === 'function' ? cxPub() : []).forEach(e => add(e.date, e.title, e.kind || '학사')); } catch (e) { }
    pubAll().forEach(c => { const r = c.recruit && c.recruit.on ? c.recruit : null; if (r && okD(r.to)) add(r.to, `${c.name} 접수 마감`, '마감'); if (okD(c.start)) add(c.start, `${c.name} 개강`, '개강'); if (okD(c.end)) add(c.end, `${c.name} 종강`, '종강'); });
    return L.sort((a, b) => a.date.localeCompare(b.date)).slice(0, n || 5); }
  function notices(n) { let L = []; try { L = [...(S.notices || []).map(x => ({ ...x, top: !!x.pin })), ...(S.classes || []).filter(c => c.open === '전체' || c.open == null).flatMap(c => (c.notices || []).map(x => ({ ...x, top: false, cls: c.name })))]; } catch (e) { }
    return L.filter(x => x && x.title && !isPh(x.title)).sort((a, b) => (b.top - a.top) || String(b.at || '').localeCompare(String(a.at || ''))).slice(0, n || 4); }
  function badges() { let B = []; try { B = (S.badges || []).filter(b => b && b.name); } catch (e) { } const cn = id => ((S.classes || []).find(c => c.id === id) || {}).name || '';
    return B.slice(0, 4).map(b => ({ name: b.name, cls: cn(b.cls), n: (b.issued || []).filter(i => i && i.st !== '취소').length, fill: /^#[0-9a-f]{6}$/i.test(b.fill || '') ? b.fill : '', ring: /^#[0-9a-f]{6}$/i.test(b.ring || '') ? b.ring : '' })); }
  const certN = () => { try { return (S.certs || []).length; } catch (e) { return 0; } };
  const semester = () => { const d = tday(); const y = +d.slice(0, 4), m = +d.slice(5, 7); return m >= 8 ? `${y}-2학기` : m >= 2 ? `${y}-1학기` : `${y - 1}-2학기`; };
  const today2 = () => { const d = tday(); return `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일(${WD[dd(d).getDay()]})`; };

  /* ── 사진(첫 화면): hpsec-hero의 고르기 로직(HPS.photo) 그대로 ── */
  const photo = (s, d) => { try { return window.HPS && typeof HPS.photo === 'function' ? HPS.photo(s, 'hero', d) : null; } catch (e) { return null; } };
  const fig = (p, cls) => p ? `<figure class="hps-img ${cls || ''}" data-slot="hero"><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="100vw"` : ''} alt="${E(p.alt || '')}" style="object-position:${E(p.pos || '50% 50%')};object-fit:${p.fit === 'contain' ? 'contain' : 'cover'}" fetchpriority="high" decoding="async"></figure>` : '';
  const lnk = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const linkHref = v => { v = String(v || ''); if (!v) return ''; if (v.startsWith('learn:')) return '#p-' + ({ home: 'home', shop: 'm-class', textbooks: 'm-book', comm: 'm-community', notice: 'm-notice', fac: 'l-fac' }[v.slice(6)] || 'home'); if (v.startsWith('page:')) return '#p-' + v.slice(5); if (v.startsWith('cls:')) return '#p-c-' + v.slice(4); if (v.startsWith('url:')) return typeof safeURL === 'function' ? safeURL(v.slice(4)) : ''; return ''; };

  /* ══ 첫 화면: 사진 + 짙은 기관 색 + 「마감 임박」 판 ══ */
  function hero(s, d) { const p = photo(s, d);
    const lines = String(d.title || (S.org && S.org.name) || '').split('\n').filter(Boolean).map(E).join('<br>');
    const p1 = linkHref(d.link) || '#login'; const p2 = linkHref(d.link2) || href.cls(s);
    let R = dues(3); let k = '마감 임박'; if (!R.length) { R = running(3); k = `진행 중인 ${term('cls')}`; }
    const T0 = tday(); const ev = events(1)[0];
    const row = r => `<li><a ${lnk('#p-c-' + r.id)}>${r.k === 'run' ? `<span class="hxu-dd run" aria-label="진행 중">진행</span>` : `<span class="hxu-dd${r.k === 'open' && r.d <= 3 ? ' hot' : r.k !== 'open' ? ' soon' : ''}">${r.d === 0 ? 'D-DAY' : 'D-' + r.d}</span>`}<span class="hxu-rt"><b>${E(r.l)}</b><small>${E(r.sub)}</small></span>${ic('arrow', 18)}</a></li>`;
    const panel = R.length ? `<aside class="hxu-uh-pn" aria-label="${E(k)}"><div class="hxu-pn-h"><p class="hxu-pn-k">${ic(R[0].k === 'run' ? 'clock' : 'bell', 18)}<span>${E(k)}</span></p><span class="hxu-pn-c">${R.length}건</span></div><ul class="hxu-pn-l">${R.map(row).join('')}</ul>${ev ? `<a class="hxu-pn-f" href="#cal"><span class="hxu-pn-e"><small>다음 학사 일정</small><b>${E(md(ev.date))} ${E(ev.title)}</b></span><span class="hxu-pn-m">전체 일정${ic('arrow', 16)}</span></a>` : `<a class="hxu-pn-f" href="#cal"><span class="hxu-pn-m">학사 일정 보기${ic('arrow', 16)}</span></a>`}</aside>` : '';
    void T0;
    return `<section class="hpt hp-hero hxu-u hxu-uh${panel ? '' : ' one'}">${fig(p, 'hxu-uh-ph')}<i class="hxu-uh-sc" aria-hidden="true"></i><div class="hxu-w hxu-uh-g"><div class="hxu-uh-tx">
<p class="hxu-uh-ey"><span>${E(d.eyebrow || semester())}</span><em>${E(today2())}</em></p><h1>${lines}</h1>${d.sub ? `<p class="hxu-uh-sub">${E(d.sub)}</p>` : ''}
<div class="hxu-btns">${d.cta ? `<a class="hxu-btn p" ${lnk(p1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : ''}${d.cta2 ? `<a class="hxu-btn g" ${lnk(p2)}>${E(d.cta2)}</a>` : ''}</div>
<p class="hxu-uh-pv">${ic('shield', 16)}<span>로그인은 학번 · 학과로만 확인해요</span></p></div>${panel}</div></section>`; }

  /* ══ 방문자별 바로 가기(uvx-who): 2클릭 안에 끝나는 일 ══ */
  const WHO = [['재학생', '비교과 신청 · 이수 확인'], ['신입생', '처음 로그인 · 먼저 들을 과정'], ['교수자', '수업 운영 · 공지'], ['산학 · 지역', '공개 강좌 · 협력 문의']];
  function who(s, d) { const C = pubAll(); const cols = (Array.isArray(d.cols) && d.cols.length === 4 ? d.cols : WHO).map((r, k) => [String((r && r[0]) || WHO[k][0]), String((r && r[1]) || WHO[k][1])]);
    const op = dues(9).filter(x => x.k === 'open').length; const first = C[0];
    const L = [
      { ic: 'cap', a: [[`비교과 · ${term('cls')} 신청`, op ? `${op}개 접수 중` : C.length ? `${C.length}개 운영 중` : '', href.cls(s)], ['내 이수 · 배지 확인', '로그인 후 바로', '#badges'], ['학사 일정', '시험 · 마감 · 개강', '#cal']] },
      { ic: 'spark', a: [['학번으로 처음 로그인', '학번 · 학과만 확인', '#login'], first ? ['먼저 들으면 좋은 과정', first.name, '#p-c-' + first.id] : null, ['신입생 공지', '', href.notice(s)]].filter(Boolean) },
      { ic: 'board', a: [['교수자 로그인', '수업 · 비교과 운영', '#login'], ['수업 공지 보기', '', href.notice(s)], ['운영 문의', '', href.ask()]] },
      { ic: 'users', a: [['공개 강좌 둘러보기', '', href.cls(s)], ['협력 · 수강 문의', '', href.ask()], ['행사 · 학사 일정', '', '#cal']] }];
    /* d.ord: 보여 줄 순서(예: 열린 캠퍼스는 [3,0,1,2] — 시민 · 지역 먼저). 링크는 카드 번호에 묶여 있어 순서만 바뀐다 */
    const ord = Array.isArray(d.ord) && d.ord.length === 4 && [0, 1, 2, 3].every(k => d.ord.includes(k)) ? d.ord : [0, 1, 2, 3];
    return `<section class="hpt hp-s hxu-u hxu-who"><div class="hxu-w"><div class="hxu-sh"><h2>${E(d.title || '무엇을 하러 오셨나요?')}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div><div class="hxu-who-g">${ord.map(k => [L[k], k]).map(([x, k]) => `<article class="hxu-pc"><div class="hxu-pc-h"><i aria-hidden="true">${ic(x.ic, 22)}</i><div><h3>${E(cols[k][0])}</h3><p>${E(cols[k][1])}</p></div></div><ul>${x.a.map(([l, sub, h]) => `<li><a ${lnk(h)}><span><b>${E(l)}</b>${sub ? `<small>${E(sub)}</small>` : ''}</span>${ic(/^tel:/.test(h) ? 'arrow' : 'arrow', 18)}</a></li>`).join('')}</ul></article>`).join('')}</div></div></section>`; }

  /* ══ 이수 · 배지 사다리(uvx-badge) — 발급 기록이 있는 배지만 ══ */
  function badge(s, d) { const B = badges(); if (!B.length) return ''; const tot = B.reduce((a, b) => a + b.n, 0); const cn = certN();
    return `<section class="hpt hp-s hxu-u hxu-bd"><div class="hxu-w hxu-bd-g"><div class="hxu-bd-tx"><p class="hxu-ey">${E(d.eyebrow || '이수 · 디지털 배지')}</p><h2>${E(d.title || '이수하면 배지가 자동으로 쌓여요')}</h2><p class="hxu-lead">${E(d.sub || '과정마다 이수 기준을 채우면 디지털 배지와 수료증이 발급돼요. 내 학습 화면에서 바로 확인하고 내려받을 수 있어요.')}</p>
<dl class="hxu-bd-st"><div><dt>발급된 배지</dt><dd>${tot}<small>개</small></dd></div>${cn ? `<div><dt>발급된 수료증</dt><dd>${cn}<small>건</small></dd></div>` : ''}${(() => { let f = null; try { f = (HPT.facts() || [])[0]; } catch (e) { } return f ? `<div><dt>${E(f.l)}</dt><dd>${E(f.v)}<small>${E(f.u)}</small></dd></div>` : `<div><dt>배지 단계</dt><dd>${B.length}<small>단계</small></dd></div>`; })()}</dl>
<div class="hxu-btns"><a class="hxu-btn p" href="#badges">내 배지 확인하기${ic('arrow', 18)}</a><a class="hxu-btn g" href="#my">내 이수 현황</a></div></div>
<ol class="hxu-lad" style="--n:${B.length}">${B.map((b, k) => `<li style="--f:${E(b.fill || '')};--g:${E(b.ring || '')}"><span class="hxu-md" aria-hidden="true">${ic('award', 30)}<em>${k + 1}</em></span><span class="hxu-lt"><b>${E(b.name)}</b>${b.cls ? `<small>${E(b.cls)} 이수</small>` : ''}</span><span class="hxu-ln">${b.n ? b.n + '명 받음' : '첫 발급 전'}</span></li>`).join('')}</ol></div></section>`; }

  /* ══ 학사 일정 + 공지(uvx-board) ══ */
  function board(s, d) { const V = events(5); const N = notices(5); if (!V.length && !N.length) return ''; const T0 = tday();
    const cal = V.length ? `<div class="hxu-card hxu-cal"><div class="hxu-ch"><h2>${E(d.title || '학사 일정')}</h2><a href="#cal">전체 일정${ic('arrow', 16)}</a></div><ul>${V.map(v => { const n = days(T0, v.date); return `<li><a href="#cal"><time datetime="${E(v.date)}"><b>${+v.date.slice(8, 10)}</b><small>${+v.date.slice(5, 7)}월 · ${WD[dd(v.date).getDay()]}</small></time><span class="hxu-rt"><b>${E(v.title)}</b><small><em class="hxu-k">${E(v.kind || '일정')}</em>${n === 0 ? '오늘' : n + '일 남음'}</small></span></a></li>`; }).join('')}</ul></div>` : '';
    const nt = N.length ? `<div class="hxu-card hxu-nt"><div class="hxu-ch"><h2>${E(d.title2 || '공지사항')}</h2><a ${lnk(href.notice(s))}>더 보기${ic('arrow', 16)}</a></div><ul>${N.map(x => `<li><a ${lnk(href.notice(s))}>${x.top ? '<span class="hxu-pin">중요</span>' : x.cls && String(x.title).indexOf(x.cls) !== 0 ? `<span class="hxu-tg">${E(String(x.cls).slice(0, 10))}</span>` : ''}<b>${E(x.title)}</b><time>${E(String(x.at || '').slice(0, 10).replace(/-/g, '.'))}</time></a></li>`).join('')}</ul></div>` : '';
    return `<section class="hpt hp-s hxu-u hxu-bo"><div class="hxu-w"><div class="hxu-bo-g${cal && nt ? '' : ' one'}">${cal}${nt}</div></div></section>`; }

  /* ── 보조(A1) 공통 데이터 ── */
  const addD = (s0, n) => { const d = dd(s0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  /* 앞으로 7일(오늘 포함) 할 일: 모집 시작 · 마감 · 개강 · 종강 + 학습자에게 보이는 기관 일정. 강좌에서 온 줄은 강좌 상세로, 나머지는 #cal */
  function week() { const T0 = tday(); const end = addD(T0, 6); const L = []; const seen = new Set();
    const add = (date, title, kind, id) => { if (!okD(date)) return; date = String(date).slice(0, 10); if (date < T0 || date > end) return; const k = date + title; if (seen.has(k)) return; seen.add(k); L.push({ date, title, kind, h: id ? '#p-c-' + id : '#cal' }); };
    pubAll().forEach(c => { const r = c.recruit && c.recruit.on ? c.recruit : null; if (r && okD(r.from)) add(r.from, `${c.name} 접수 시작`, '접수', c.id); if (r && okD(r.to)) add(r.to, `${c.name} 접수 마감`, '마감', c.id); if (okD(c.start)) add(c.start, `${c.name} 개강`, '개강', c.id); if (okD(c.end)) add(c.end, `${c.name} 종강`, '종강', c.id); });
    try { (typeof cxPub === 'function' ? cxPub() : []).forEach(e => add(e.date, e.title, e.kind || '학사')); } catch (e) { }
    const days7 = [...Array(7)].map((_, k) => { const d = addD(T0, k); return { d, n: L.filter(x => x.date === d).length, w: WD[dd(d).getDay()], k }; });
    return { L: L.sort((a, b) => a.date.localeCompare(b.date)), days7 }; }
  /* 정원 · 남은 자리: 모집 정원이 정해진 공개 강좌만(신청 인원 = 수강생 수) */
  function seatsOf() { const T0 = tday(); return pubAll().filter(c => c.recruit && c.recruit.on && +c.recruit.cap > 0 && !(okD(c.recruit.to) && c.recruit.to.slice(0, 10) < T0)).map(c => { const r = c.recruit; const cap = +r.cap; const n = Math.min(cap, (c.learners || []).length); const from = okD(r.from) ? r.from.slice(0, 10) : ''; const to = okD(r.to) ? r.to.slice(0, 10) : '';
    const st = from && from > T0 ? 'soon' : 'open'; return { id: c.id, l: c.name, cap, n, left: cap - n, st, d: st === 'soon' ? days(T0, from) : to ? days(T0, to) : null, sub: st === 'soon' ? `접수 ${md(from)} 시작` : to ? `접수 ~${md(to)}` : '접수 중', mode: { first: '선착순', approve: '승인 후 확정', lottery: '추첨' }[r.mode] || '', free: !(+c.price) }; })
    .sort((a, b) => (a.st === 'open' ? 0 : 1) - (b.st === 'open' ? 0 : 1) || (a.d == null ? 99 : a.d) - (b.d == null ? 99 : b.d)).slice(0, 4); }
  const kw = name => { const m = String(name).match(/^([^:：]{1,8})[:：]\s*(.+)$/); return m ? { tag: m[1].trim(), l: m[2].trim() } : { tag: '', l: String(name) }; };
  const stOf = c => { const T0 = tday(); const r = c.recruit && c.recruit.on ? c.recruit : null; const from = r && okD(r.from) ? r.from.slice(0, 10) : ''; const to = r && okD(r.to) ? r.to.slice(0, 10) : '';
    if (r && to && to >= T0 && (!from || from <= T0)) { const n = days(T0, to); return { t: n === 0 ? '오늘 마감' : `D-${n} 접수 중`, hot: n <= 3 }; } if (r && from > T0) return { t: '접수 예정' }; if (okD(c.start) && c.start.slice(0, 10) > T0) return { t: '개강 예정' }; return { t: c.status === '운영중' ? '수강 중' : '' }; };
  const contact = () => { const f = ft(); const tel = f.tel && !isPh(f.tel) ? String(f.tel) : ''; const em = (f.email || f.mail) && /@/.test(f.email || f.mail) ? String(f.email || f.mail) : ''; const addr = f.addr && !isPh(f.addr) ? String(f.addr) : ''; return { tel, em, addr }; };

  /* ══ 강의실 홈(uvlms) 첫 화면: 밝은 분할 — 왼쪽 「이번 주 할 일」(7칸 띠 + 목록) · 오른쪽 사진 카드 + 학번 로그인 ══ */
  function heroLms(s, d) { const p = photo(s, d); const T0 = tday();
    const lines = String(d.title || (S.org && S.org.name) || '').split('\n').filter(Boolean).map(E).join('<br>');
    const p1 = linkHref(d.link) || '#login'; const p2 = linkHref(d.link2) || '#my';
    const W = week(); const nx = W.L.length ? null : events(1)[0]; const C = pubAll();
    const strip = `<ol class="hxu-wk" aria-label="앞으로 7일">${W.days7.map(x => `<li><a href="#cal"${x.k === 0 ? ' aria-current="date"' : ''} aria-label="${E(md(x.d))}(${x.w}) 일정 ${x.n}건"><small>${x.k === 0 ? '오늘' : x.w}</small><b>${+x.d.slice(8, 10)}</b><i aria-hidden="true">${x.n ? '<em></em>'.repeat(Math.min(3, x.n)) : ''}</i></a></li>`).join('')}</ol>`;
    const row = x => { const n = days(T0, x.date); return `<li><a ${lnk(x.h)}><span class="hxu-dd${x.kind === '마감' && n <= 3 ? ' hot' : x.kind === '마감' ? '' : ' soon'}">${n === 0 ? '오늘' : 'D-' + n}</span><span class="hxu-rt"><b>${E(x.title)}</b><small><em class="hxu-k">${E(x.kind)}</em>${E(md(x.date))}(${WD[dd(x.date).getDay()]})</small></span>${ic('arrow', 18)}</a></li>`; };
    const todo = W.L.length ? `<ul class="hxu-td">${W.L.slice(0, 4).map(row).join('')}</ul>` : `<p class="hxu-td0">이번 주에는 마감 · 개강 일정이 없어요.${nx ? ` 다음 일정은 <b>${E(md(nx.date))} ${E(nx.title)}</b>이에요.` : ''}</p>`;
    const card = `<div class="hxu-lm-wk"><div class="hxu-pn-h"><p class="hxu-pn-k">${ic('cal', 18)}<span>이번 주 할 일</span></p><a class="hxu-lm-al" href="#cal">학사 일정${ic('arrow', 16)}</a></div>${strip}${todo}</div>`;
    const side = `<aside class="hxu-lm-sd" aria-label="로그인">${p ? fig(p, 'hxu-lm-ph') : '<div class="hxu-lm-ph0" aria-hidden="true"></div>'}<div class="hxu-lm-lg"><p class="hxu-lm-lt">${ic('cap', 20)}<span>내 강의실</span></p><p class="hxu-lm-ld">수강 중인 교과목 · 과제 · 출석을 한 화면에서 확인해요.</p>
<div class="hxu-lm-bt">${d.cta ? `<a class="hxu-btn p" ${lnk(p1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : ''}${d.cta2 ? `<a class="hxu-btn g" ${lnk(p2)}>${E(d.cta2)}</a>` : ''}</div><p class="hxu-lm-pv">${ic('shield', 16)}<span>로그인은 학번 · 학과로만 확인해요</span></p>
${C.length ? `<dl class="hxu-lm-st"><div><dt>이번 학기 ${E(term('cls'))}</dt><dd>${C.length}<small>개</small></dd></div><div><dt>이번 주 일정</dt><dd>${W.L.length}<small>건</small></dd></div></dl>` : ''}</div></aside>`;
    return `<section class="hpt hp-hero hxu-u hxu-lm"><div class="hxu-w hxu-lm-g"><div class="hxu-lm-tx"><p class="hxu-lm-ey"><span>${E(d.eyebrow || semester())}</span><em>${E(today2())}</em></p><h1>${lines}</h1>${d.sub ? `<p class="hxu-lm-sub">${E(d.sub)}</p>` : ''}${C.length || W.L.length ? card : ''}</div>${side}</div></section>`; }

  const rk = t => /오늘 마감|D-\d+ 접수/.test(t) ? 0 : /접수 예정/.test(t) ? 1 : /개강 예정/.test(t) ? 2 : 3;
  /* ══ 열린 캠퍼스(uvopen) 첫 화면: 전면 사진 + 분야 · 강좌 칩 + 문의 · 오시는 길 ══ */
  function heroOpen(s, d) { const p = photo(s, d); const C = pubAll();
    const lines = String(d.title || (S.org && S.org.name) || '').split('\n').filter(Boolean).map(E).join('<br>');
    const p1 = linkHref(d.link) || href.cls(s); const p2 = linkHref(d.link2) || href.ask();
    const open = C.filter(c => /접수 중|오늘 마감/.test(stOf(c).t)); const left = seatsOf().filter(x => x.st === 'open').reduce((a, x) => a + x.left, 0); const free = C.filter(c => !(+c.price)).length;
    const chips = C.length ? `<div class="hxu-op-ch"><p class="hxu-op-q">${ic('spark', 18)}<span>${E(d.ask || '어떤 강좌를 찾으세요?')}</span></p><ul>${[`<li><a class="all" ${lnk(href.cls(s))}><b>전체 ${E(term('cls'))}</b><small>${C.length}개</small></a></li>`, ...C.map(c => [c, stOf(c).t]).sort((a, b) => rk(a[1]) - rk(b[1])).slice(0, 7).map(([c]) => { const k = kw(c.name); const st = stOf(c); return `<li><a ${lnk('#p-c-' + c.id)}>${k.tag ? `<em>${E(k.tag)}</em>` : ''}<b>${E(k.l)}</b>${st.t ? `<small class="${st.hot ? 'hot' : ''}">${E(st.t)}</small>` : ''}</a></li>`; })].join('')}</ul>
<dl class="hxu-op-st"><div><dt>공개 ${E(term('cls'))}</dt><dd>${C.length}<small>개</small></dd></div>${open.length ? `<div><dt>지금 접수 중</dt><dd>${open.length}<small>개</small></dd></div>` : ''}${left ? `<div><dt>남은 자리</dt><dd>${left}<small>석</small></dd></div>` : free ? `<div><dt>수강료 무료</dt><dd>${free}<small>개</small></dd></div>` : ''}</dl></div>` : '';
    const K = contact(); const info = K.addr || K.tel || K.em ? `<ul class="hxu-op-if">${K.addr ? `<li><span class="hxu-op-ik" aria-hidden="true">${ic('pin', 18)}</span><span><small>오시는 길</small><b>${E(K.addr)}</b></span></li>` : ''}${K.tel ? `<li><a href="tel:${E(K.tel.replace(/[^\d+]/g, ''))}"><span class="hxu-op-ik" aria-hidden="true">${ic('phone', 18)}</span><span><small>수강 · 협력 문의</small><b>${E(K.tel)}</b></span></a></li>` : ''}${K.em ? `<li><a href="mailto:${E(K.em)}"><span class="hxu-op-ik" aria-hidden="true">${ic('mail', 18)}</span><span><small>메일 문의</small><b>${E(K.em)}</b></span></a></li>` : ''}</ul>` : '';
    return `<section class="hpt hp-hero hxu-u hxu-op${chips ? '' : ' nc'}">${fig(p, 'hxu-op-ph')}<i class="hxu-op-sc" aria-hidden="true"></i><div class="hxu-w"><div class="hxu-op-tx"><p class="hxu-op-ey">${E(d.eyebrow || '열린 캠퍼스 · 시민 누구나')}</p><h1>${lines}</h1>${d.sub ? `<p class="hxu-op-sub">${E(d.sub)}</p>` : ''}
<div class="hxu-btns">${d.cta ? `<a class="hxu-btn p" ${lnk(p1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : ''}${d.cta2 ? `<a class="hxu-btn g" ${lnk(p2)}>${E(d.cta2)}</a>` : ''}</div><p class="hxu-op-pv">${ic('shield', 16)}<span>둘러보기는 로그인 없이 · 재학생 로그인은 학번 · 학과로만 확인해요</span></p></div>${chips || info ? `<div class="hxu-op-pn">${chips}${info}</div>` : ''}</div></section>`; }

  /* ══ 정원 · 남은 자리(uvx-seats) — 모집 정원이 있는 공개 강좌만 ══ */
  function seats(s, d) { const L = seatsOf(); if (!L.length) return '';
    return `<section class="hpt hp-s hxu-u hxu-se"><div class="hxu-w"><div class="hxu-sh"><div><p class="hxu-ey">${E(d.eyebrow || '접수 현황')}</p><h2>${E(d.title || '남은 자리를 확인하고 신청하세요')}</h2></div><a class="hxu-se-al" ${lnk(href.cls(s))}>전체 ${E(term('cls'))}${ic('arrow', 16)}</a></div>
<ul class="hxu-se-l${L.length === 3 ? ' c3' : ''}">${L.map(x => { const pct = Math.round(x.n / x.cap * 100); const full = x.left <= 0; return `<li><a ${lnk('#p-c-' + x.id)}><span class="hxu-se-h"><span class="hxu-dd${x.st === 'soon' ? ' soon' : x.d != null && x.d <= 3 ? ' hot' : ''}">${x.st === 'soon' ? '예정' : x.d === 0 ? 'D-DAY' : x.d == null ? '접수' : 'D-' + x.d}</span><span class="hxu-rt"><b>${E(x.l)}</b><small>${E([x.sub, x.mode, x.free ? '무료' : ''].filter(Boolean).join(' · '))}</small></span></span>
${x.st === 'soon' ? `<span class="hxu-se-b" role="img" aria-label="접수 전 · 정원 ${x.cap}명"><i style="width:0"></i></span><span class="hxu-se-n"><b>정원 ${x.cap}명</b><small>${x.d === 0 ? '오늘' : `${x.d}일 뒤`} 접수 시작</small></span>` : `<span class="hxu-se-b" role="img" aria-label="정원 ${x.cap}명 중 ${x.n}명 신청"><i style="width:${Math.max(4, pct)}%"></i></span><span class="hxu-se-n"><b class="${full ? 'full' : ''}">${full ? '정원이 찼어요 · 대기 신청' : `${x.left}자리 남음`}</b><small>${x.n} / ${x.cap}명</small></span>`}</a></li>`; }).join('')}</ul></div></section>`; }

  const R = { 'uvx-who': who, 'uvx-badge': badge, 'uvx-board': board, 'uvx-seats': seats };
  HPT.hpxUniv = { dues, events, notices, badges, who, badge, board, hero, heroLms, heroOpen, seats, week, seatsOf }; /* 테스트 · 보조 템플릿 재사용 */

  const HERO = { uvhub: hero, uvlms: heroLms, uvopen: heroOpen };
  /* ── proSec 감싸기: 이 묶음 테마의 첫 화면 + 부품 섹션(테마와 무관하게 부품은 그린다) ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    const d = (x && x.data) || {}; const isPart = x && x.type === 'text' && R[d.hpt]; const isHero = x && x.type === 'banner' && mine(s) && !(+d.dstyle);
    if (!isPart && !isHero) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    if (i === 0) { try { base(x, i, s, lk); } catch (e) { } }
    let h = ''; try { h = isHero ? (HERO[s.theme] || hero)(s, d) : R[d.hpt](s, d); } catch (e) { console.error('hpx-univ', d.hpt || 'hero', e); return base(x, i, s, lk); }
    if (!h) return editing() ? base(x, i, s, lk) : '';
    const m = editing() ? HPE.map.get(x) : null;
    if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; window.proSec = proSec; }

  /* ── CSS: 부품 CSS는 부품이 있을 때, 첫 화면 CSS는 이 묶음 테마일 때 ── */
  function partCSS(s) { const T = HPT.tokens(s); if (!T) return ''; const Rm = ramp(T.a); const bg = T.bg || '#ffffff';
    const at = fit(T.a, '#ffffff', 4.6, '#000000'); const at50 = fit(T.a, Rm[50], 4.6, '#000000'); const mu = fit(T.mu || '#4B5563', '#ffffff', 4.6, '#000000');
    const wbg = mix(WARN, '#ffffff', .88); const wt = fit(WARN, wbg, 4.6, '#000000'); void bg;
    return `
.hxu-u{--x-a:${T.a};--x-on:${T.on};--x-at:${at};--x-at50:${at50};--x-50:${Rm[50]};--x-100:${Rm[100]};--x-200:${Rm[200]};--x-700:${Rm[700]};--x-mu:${mu};--x-w:${WARN};--x-wbg:${wbg};--x-wt:${wt};--x-ln:rgba(15,23,42,.09)}
.hxu-u .hxu-w{max-width:var(--wmax,1240px);margin:0 auto;padding:0 var(--gut,40px);box-sizing:border-box}
.hxu-u h2{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);letter-spacing:var(--hd-ls,-.03em);margin:0;color:var(--ink);font-size:clamp(24px,2.6vw,var(--t-h2,34px));line-height:1.25;word-break:keep-all}
.hxu-u h3{margin:0;font-size:18px;line-height:1.35;letter-spacing:-.02em;color:var(--ink)}
.hxu-u small{font-size:13.5px}.hxu-u a{text-decoration:none;color:inherit}
.hxu-u .hxu-ey{margin:0 0 12px;font-size:14px;font-weight:750;letter-spacing:.02em;color:var(--x-at)}
.hxu-u .hxu-lead{margin:14px 0 0;color:var(--x-mu);font-size:16.5px;line-height:1.7}
.hxu-u .hxu-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:24px}.hxu-u .hxu-sh p{margin:0;color:var(--x-mu)}
.hxu-u .hxu-btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.hxu-u .hxu-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 24px;border-radius:12px;font-weight:750;font-size:16px;letter-spacing:-.01em;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
.hxu-u .hxu-btn.p{background:var(--x-a);color:var(--x-on);box-shadow:0 10px 24px -14px ${al(T.a, .8)}}.hxu-u .hxu-btn.p:hover{transform:translateY(-1px)}
.hxu-u .hxu-btn.g{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--x-ln)}.hxu-u .hxu-btn.g:hover{box-shadow:inset 0 0 0 1.5px var(--x-a)}
.hxu-u .hxu-btn:focus-visible,.hxu-u a:focus-visible{outline:3px solid ${al(T.a, .45)};outline-offset:2px}
.hxu-u .hxu-rt{display:flex;flex-direction:column;min-width:0;flex:1}.hxu-u .hxu-rt b{font-weight:700;color:var(--ink);line-height:1.4}.hxu-u .hxu-rt small{color:var(--x-mu);margin-top:2px;line-height:1.45}
.hxu-dd{flex:0 0 62px;height:44px;border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:15px;letter-spacing:-.01em;font-variant-numeric:tabular-nums;background:var(--x-50);color:var(--x-at50)}
.hxu-dd.hot{background:var(--x-wbg);color:var(--x-wt)}.hxu-dd.soon{background:#F1F3F6;color:#3B4352}.hxu-dd.run{background:var(--x-50);color:var(--x-at50);font-size:14px}
/* 방문자별 바로 가기 */
.hpt.hxu-who{padding:0 0 clamp(56px,7vw,96px);background:var(--bg)}
.hxu-who .hxu-sh{padding-top:clamp(40px,5vw,56px)}
.hxu-who-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.hxu-pc{background:#fff;border-radius:18px;padding:22px 20px 10px;box-shadow:0 0 0 1px var(--x-ln),0 1px 2px rgba(15,23,42,.04),0 18px 36px -26px rgba(15,23,42,.35);display:flex;flex-direction:column}
.hxu-pc-h{display:flex;gap:14px;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid var(--x-ln)}
.hxu-pc-h i{flex:0 0 44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--x-50);color:var(--x-at50)}
.hxu-pc-h p{margin:3px 0 0;font-size:14px;color:var(--x-mu);line-height:1.45}
.hxu-pc ul{list-style:none;margin:0;padding:4px 0 0}.hxu-pc li+li{border-top:1px dashed var(--x-ln)}
.hxu-pc li a{display:flex;align-items:center;gap:10px;min-height:52px;padding:8px 2px;border-radius:10px;transition:background .15s}
.hxu-pc li a:hover{background:var(--x-50)}.hxu-pc li a>svg{flex:0 0 auto;color:var(--x-at)}
.hxu-pc li a span{display:flex;flex-direction:column;flex:1;min-width:0}.hxu-pc li b{font-size:15.5px;font-weight:700;line-height:1.4}.hxu-pc li small{color:var(--x-mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 이수 · 배지 */
.hpt.hxu-bd{padding:clamp(64px,8vw,112px) 0;background:linear-gradient(180deg,var(--x-50),${mix(Rm[50], '#ffffff', .6)})}
.hxu-bd-g{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,5vw,72px);align-items:center}
.hxu-bd-st{display:flex;gap:28px;margin:28px 0 0;padding:20px 0 0;border-top:1px solid var(--x-ln)}.hxu-bd-st div{min-width:0}
.hxu-bd-st dt{font-size:13.5px;color:var(--x-mu)}.hxu-bd-st dd{margin:2px 0 0;font-size:30px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:var(--ink)}.hxu-bd-st dd small{font-size:15px;font-weight:700;margin-left:2px;color:var(--x-mu)}
.hxu-lad{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:16px;position:relative}
.hxu-lad li{position:relative;background:#fff;border-radius:20px;padding:28px 18px 22px;text-align:center;box-shadow:0 0 0 1px var(--x-ln),0 22px 40px -30px rgba(15,23,42,.45);display:flex;flex-direction:column;align-items:center;gap:12px}
.hxu-lad li:nth-child(2){transform:translateY(-14px)}.hxu-lad li:nth-child(3){transform:translateY(-28px)}.hxu-lad li:nth-child(4){transform:translateY(-42px)}
.hxu-md{position:relative;width:76px;height:76px;border-radius:50%;display:grid;place-items:center;color:#fff;background:var(--f,var(--x-a));box-shadow:0 0 0 5px #fff,0 0 0 7px var(--g,var(--x-200)),0 14px 24px -12px rgba(15,23,42,.5)}
.hxu-md em{position:absolute;right:-6px;bottom:-4px;min-width:26px;height:26px;border-radius:13px;background:var(--ink);color:#fff;font-style:normal;font-size:13px;font-weight:800;display:grid;place-items:center;box-shadow:0 0 0 3px #fff}
.hxu-lt{display:flex;flex-direction:column;gap:2px}.hxu-lt b{font-size:18px;letter-spacing:-.02em}.hxu-lt small{color:var(--x-mu)}
.hxu-ln{font-size:13.5px;font-weight:700;color:var(--x-at50);background:var(--x-50);padding:5px 12px;border-radius:999px;font-variant-numeric:tabular-nums}
/* 학사 일정 + 공지 */
.hpt.hxu-bo{padding:clamp(64px,8vw,104px) 0;background:var(--bg)}
.hxu-bo-g{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px}.hxu-bo-g.one{grid-template-columns:minmax(0,1fr)}
.hxu-card{background:#fff;border-radius:20px;padding:26px 26px 12px;box-shadow:0 0 0 1px var(--x-ln),0 22px 44px -34px rgba(15,23,42,.4)}
.hxu-ch{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:2px solid var(--ink)}
.hxu-ch h2{font-size:clamp(22px,2vw,26px)}.hxu-ch a{display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 4px;font-weight:700;font-size:14.5px;color:var(--x-at)}
.hxu-card ul{list-style:none;margin:0;padding:0}.hxu-card li+li{border-top:1px solid var(--x-ln)}
.hxu-cal li a{display:flex;align-items:center;gap:16px;min-height:64px;padding:10px 0}
.hxu-cal time{flex:0 0 58px;height:58px;border-radius:14px;background:var(--x-50);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--x-at50)}
.hxu-cal time b{font-size:22px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums}.hxu-cal time small{font-size:13px;margin-top:3px;font-weight:600}
.hxu-k{font-style:normal;font-weight:700;color:var(--x-at);margin-right:8px}
.hxu-nt li a{display:flex;align-items:center;gap:10px;min-height:60px;padding:8px 0}.hxu-nt li b{flex:1;min-width:0;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hxu-nt time{color:var(--x-mu);font-size:13.5px;font-variant-numeric:tabular-nums;flex:0 0 auto}
.hxu-pin{flex:0 0 auto;font-size:13px;font-weight:750;padding:3px 9px;border-radius:7px;background:var(--x-wbg);color:var(--x-wt)}.hxu-tg{flex:0 0 auto;font-size:13px;font-weight:650;padding:3px 9px;border-radius:7px;background:var(--x-50);color:var(--x-at50);max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hxu-nt li a:hover b,.hxu-cal li a:hover b{color:var(--x-at)}
.hpt.hxu-se{padding:clamp(56px,7vw,96px) 0;background:var(--bg)}
.hxu-se-al{display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 4px;font-weight:700;font-size:15px;color:var(--x-at);flex:0 0 auto}
.hxu-se-l{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.hxu-se-l.c3{grid-template-columns:repeat(3,minmax(0,1fr))}.hxu-se+.hxu-who .hxu-sh,.hxu-se+[data-hpe]+.hxu-who .hxu-sh{padding-top:0}.hxu-se-l a{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;padding:20px 22px;border-radius:20px;background:#fff;box-shadow:0 0 0 1px var(--x-ln),0 22px 44px -34px rgba(15,23,42,.4);transition:box-shadow .18s}
.hxu-se-l a:hover{box-shadow:0 0 0 1.5px var(--x-a),0 22px 44px -34px rgba(15,23,42,.4)}
.hxu-se-h{display:flex;align-items:center;gap:14px;min-width:0}
.hxu-se-b{display:block;height:10px;border-radius:999px;background:var(--x-100);overflow:hidden}.hxu-se-b i{display:block;height:100%;border-radius:inherit;background:var(--x-a)}
.hxu-se-n{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.hxu-se-n b{font-size:16px;font-weight:800;color:var(--x-at);font-variant-numeric:tabular-nums}.hxu-se-n b.full{color:var(--x-wt)}.hxu-se-n small{color:var(--x-mu);font-variant-numeric:tabular-nums}
@media(max-width:1080px){.hxu-se-l.c3{grid-template-columns:repeat(2,minmax(0,1fr))}.hxu-who-g{grid-template-columns:repeat(2,minmax(0,1fr))}.hxu-bd-g{grid-template-columns:minmax(0,1fr)}}
@media(max-width:640px){.hxu-u .hxu-w{padding:0 20px}.hxu-u .hxu-sh{display:block}.hxu-u .hxu-sh p{margin-top:6px}.hxu-who-g{grid-template-columns:minmax(0,1fr);gap:12px}.hxu-pc{padding:18px 16px 6px}
.hxu-bo-g{grid-template-columns:minmax(0,1fr)}.hxu-se-l,.hxu-se-l.c3{grid-template-columns:minmax(0,1fr);gap:12px}.hxu-se-l a{padding:16px}.hxu-card{padding:20px 18px 6px}.hxu-lad{grid-template-columns:minmax(0,1fr);gap:12px}.hxu-lad li{transform:none!important;flex-direction:row;text-align:left;padding:16px;gap:16px}.hxu-md{width:56px;height:56px;flex:0 0 56px}.hxu-md svg{width:24px;height:24px}.hxu-lad .hxu-lt{flex:1;min-width:0}
.hxu-nt li a{flex-wrap:wrap;row-gap:4px;padding:12px 0}.hxu-nt li b{flex:1 1 100%;order:3;white-space:normal}.hxu-nt time{order:2;margin-left:auto}.hxu-bd-st{gap:18px}.hxu-bd-st dd{font-size:24px}.hxu-u .hxu-btn{flex:1 1 100%}}
`; }
  function hubCSS(s) { const T = HPT.tokens(s); if (!T) return ''; const Rm = ramp(T.a);
    let hd = mix(Rm[900] || mix(T.a, '#000000', .62), '#071022', .45); for (let k = 0; k < 10 && CR('#ffffff', mix(hd, '#ffffff', .1)) < 7; k++) hd = mix(hd, '#000000', .2);
    const ey = fit(mix(T.a, '#ffffff', .62), hd, 4.8, '#ffffff'); const btnT = fit(Rm[800] || T.a, '#ffffff', 7, '#000000');
    const wt = fit(WARN, mix(WARN, '#ffffff', .88), 4.6, '#000000');
    return `
/* v43.8 캠퍼스 허브 첫 화면 */
.hpt.hxu-uh{position:relative;overflow:hidden;color:#fff;background:${hd};padding:clamp(56px,7vw,96px) 0 clamp(150px,14vw,200px);isolation:isolate}
.hxu-uh .hxu-uh-ph{position:absolute;inset:0;z-index:-2;margin:0}.hxu-uh .hxu-uh-ph img{width:100%;height:100%;display:block}
.hxu-uh-sc{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,${al(hd, .96)} 0%,${al(hd, .9)} 46%,${al(hd, .62)} 72%,${al(hd, .5)} 100%),linear-gradient(0deg,${al(hd, .7)} 0%,${al(hd, 0)} 40%)}
.hxu-uh-g{display:grid;grid-template-columns:minmax(0,7fr) minmax(340px,5fr);gap:clamp(32px,5vw,72px);align-items:center}.hxu-uh.one .hxu-uh-g{grid-template-columns:minmax(0,1fr)}
.hxu-uh-ey{display:inline-flex;align-items:center;gap:10px;margin:0 0 20px;padding:6px 14px 6px 6px;border-radius:999px;background:${al('#ffffff', .1)};box-shadow:inset 0 0 0 1px ${al('#ffffff', .18)};font-size:14px;font-weight:700}
.hxu-uh-ey span{padding:4px 10px;border-radius:999px;background:#fff;color:${btnT}}.hxu-uh-ey em{font-style:normal;color:${ey}}
.hxu-uh h1{margin:0;font-family:var(--hd-ff,inherit);font-weight:800;font-size:clamp(34px,4.2vw,56px)!important;line-height:1.14;letter-spacing:-.04em;color:#fff;word-break:keep-all}
.hxu-uh-sub{margin:18px 0 0;max-width:36em;font-size:clamp(16px,1.3vw,18.5px);line-height:1.7;color:${al('#ffffff', .86)}}
.hxu-uh .hxu-btn.p{background:#fff;color:${btnT};box-shadow:0 14px 30px -16px rgba(0,0,0,.6)}.hxu-uh .hxu-btn.g{background:${al('#ffffff', .08)};color:#fff;box-shadow:inset 0 0 0 1.5px ${al('#ffffff', .45)}}.hxu-uh .hxu-btn.g:hover{background:${al('#ffffff', .16)}}
.hxu-uh-pv{display:flex;align-items:center;gap:8px;margin:18px 0 0;font-size:14px;color:${ey}}
.hxu-uh-pn{background:#fff;color:var(--ink);border-radius:22px;padding:22px 22px 10px;box-shadow:0 30px 60px -28px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.4)}
.hxu-pn-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--x-ln)}
.hxu-pn-k{display:flex;align-items:center;gap:8px;margin:0;font-weight:800;font-size:17px;letter-spacing:-.02em}.hxu-pn-k svg{color:${wt}}
.hxu-pn-c{font-size:13.5px;font-weight:700;color:var(--x-mu);font-variant-numeric:tabular-nums}
.hxu-pn-l{list-style:none;margin:0;padding:0}.hxu-pn-l li+li{border-top:1px solid var(--x-ln)}
.hxu-pn-l a{display:flex;align-items:center;gap:14px;min-height:68px;padding:10px 4px;border-radius:12px;transition:background .15s}.hxu-pn-l a:hover{background:var(--x-50)}.hxu-pn-l a>svg{color:var(--x-at);flex:0 0 auto}
.hxu-pn-f{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px -12px 0;padding:14px 16px;min-height:56px;border-radius:14px;background:#F5F7FA}
.hxu-pn-e{display:flex;flex-direction:column;min-width:0}.hxu-pn-e small{color:var(--x-mu)}.hxu-pn-e b{font-size:14.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hxu-pn-m{display:inline-flex;align-items:center;gap:4px;flex:0 0 auto;font-weight:750;font-size:14.5px;color:var(--x-at)}
/* 첫 화면 다음 바로 가기 카드가 사진 위로 살짝 겹친다(PC) */
.hxu-uh+.hxu-who,.hxu-uh+[data-hpe]+.hxu-who{margin-top:0}
@media(min-width:1081px){.hpt.hxu-uh~.hxu-who .hxu-sh{padding-top:0;margin-top:-150px;position:relative;z-index:2}.hpt.hxu-uh~.hxu-who .hxu-sh h2{color:#fff;font-size:22px}.hpt.hxu-uh~.hxu-who .hxu-sh p{color:${al('#ffffff', .82)}}.hpt.hxu-uh~.hxu-who .hxu-who-g{position:relative;z-index:2}}
@media(max-width:1080px){.hxu-uh-g{grid-template-columns:minmax(0,1fr)}.hpt.hxu-uh{padding-bottom:48px}}
@media(max-width:640px){.hpt.hxu-uh{padding:36px 0 32px}.hxu-uh-sc{background:${al(hd, .86)}}.hxu-uh-ey{flex-wrap:wrap;font-size:13.5px}.hxu-uh-pn{padding:18px 16px 8px;border-radius:18px}.hxu-dd{flex-basis:56px}.hxu-pn-f{margin:6px -8px 0}}
`; }

  const FIX = `
/* 머리글 · 공지 태그(공통 부품) — 이 테마에서는 누르는 칸 44px · 글자 13px 이상 */
.hps-login,.hps-tel,.hps-utt,.hps-utr a{min-height:44px;display:inline-flex!important;align-items:center}.hps-cta,.hps-hr .hps-cta{min-height:48px!important}.s2-mi>a{min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center}.hps-lw,.hp-all{min-height:44px;display:inline-flex!important;align-items:center}.hps-fl a,.hps-fc li a,.hps-fb a,.hps-lg a{display:inline-flex;align-items:center;min-height:44px;min-width:44px}a[href^="tel:"],a[href^="mailto:"]{display:inline-flex;align-items:center;min-height:44px}.hps-f li>a{min-height:44px;display:flex;align-items:center}.hps-tag,.hps-new{font-size:13px!important}.hpt dd small,.hpt .hps-fv small{font-size:13px!important}
`;
  /* 강의실 홈(uvlms): 밝은 분할 */
  function lmsCSS(s) { const T = HPT.tokens(s); if (!T) return ''; const Rm = ramp(T.a); const bg = mix(Rm[50], '#ffffff', .45);
    const cur = fit(Rm[700] || T.a, '#ffffff', 4.6, '#000000'); const curOn = '#ffffff'; void curOn;
    return `
/* v43.8 강의실 홈 첫 화면 */
.hpt.hxu-lm{background:${bg};padding:clamp(40px,5vw,72px) 0 clamp(48px,6vw,88px);border-bottom:1px solid var(--x-ln)}
.hxu-lm-g{display:grid;grid-template-columns:minmax(0,7fr) minmax(320px,5fr);gap:clamp(28px,4vw,56px);align-items:stretch}
.hxu-lm-ey{display:inline-flex;align-items:center;gap:10px;margin:0 0 18px;font-size:14px;font-weight:700}
.hxu-lm-ey span{padding:6px 12px;border-radius:999px;background:${cur};color:#fff}.hxu-lm-ey em{font-style:normal;color:var(--x-mu)}
.hxu-lm h1{margin:0;font-family:var(--hd-ff,inherit);font-weight:800;font-size:clamp(32px,3.6vw,50px)!important;line-height:1.16;letter-spacing:-.04em;color:var(--ink);word-break:keep-all}
.hxu-lm-sub{margin:14px 0 0;max-width:34em;font-size:clamp(16px,1.25vw,18px);line-height:1.7;color:var(--x-mu)}
.hxu-lm-wk{margin-top:28px;background:#fff;border-radius:22px;padding:20px 22px 10px;box-shadow:0 0 0 1px var(--x-ln),0 24px 48px -32px rgba(15,23,42,.35)}
.hxu-lm .hxu-pn-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:14px}
.hxu-lm .hxu-pn-k{display:flex;align-items:center;gap:8px;margin:0;font-weight:800;font-size:18px;letter-spacing:-.02em;color:var(--ink)}.hxu-lm .hxu-pn-k svg{color:var(--x-at)}
.hxu-lm-al{display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 4px;font-weight:700;font-size:14.5px;color:var(--x-at)}
.hxu-wk{list-style:none;margin:0;padding:0 0 14px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;border-bottom:1px solid var(--x-ln)}
.hxu-wk a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:78px;border-radius:14px;background:#F4F6F9;color:var(--ink);transition:background .15s}
.hxu-wk a:hover{background:var(--x-50)}.hxu-wk small{font-size:13px;font-weight:650;color:var(--x-mu)}.hxu-wk b{font-size:20px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
.hxu-wk i{display:flex;gap:3px;height:6px}.hxu-wk em{width:6px;height:6px;border-radius:50%;background:var(--x-a)}
.hxu-wk a[aria-current]{background:${cur};color:#fff}.hxu-wk a[aria-current] small{color:#fff}.hxu-wk a[aria-current] em{background:#fff}
.hxu-td{list-style:none;margin:0;padding:0}.hxu-td li+li{border-top:1px solid var(--x-ln)}
.hxu-td a{display:flex;align-items:center;gap:14px;min-height:66px;padding:9px 4px;border-radius:12px;transition:background .15s}.hxu-td a:hover{background:var(--x-50)}.hxu-td a>svg{flex:0 0 auto;color:var(--x-at)}
.hxu-td0{margin:0;padding:16px 4px 14px;color:var(--x-mu);line-height:1.6}.hxu-td0 b{color:var(--ink)}
.hxu-lm-sd{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-height:560px;border-radius:26px;overflow:hidden;background:var(--x-100);box-shadow:0 30px 60px -36px rgba(15,23,42,.5)}
.hxu-lm-ph{position:absolute;inset:0;margin:0}.hxu-lm-ph img{width:100%;height:100%;display:block}.hxu-lm-ph0{position:absolute;inset:0;background:var(--x-100)}
.hxu-lm-lg{position:relative;margin:16px;background:#fff;border-radius:20px;padding:22px 22px 18px;box-shadow:0 18px 40px -20px rgba(15,23,42,.45)}
.hxu-lm-lt{display:flex;align-items:center;gap:8px;margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--ink)}.hxu-lm-lt svg{color:var(--x-at)}
.hxu-lm-ld{margin:6px 0 0;font-size:15px;line-height:1.6;color:var(--x-mu)}
.hxu-lm-bt{display:flex;gap:10px;margin-top:16px}.hxu-lm-bt .hxu-btn{flex:1 1 0;padding:0 16px}
.hxu-lm-pv{display:flex;align-items:center;gap:6px;margin:12px 0 0;font-size:13.5px;color:var(--x-mu)}.hxu-lm-pv svg{color:var(--x-at);flex:0 0 auto}
.hxu-lm-st{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0 0;padding-top:14px;border-top:1px solid var(--x-ln)}
.hxu-lm-st dt{font-size:13.5px;color:var(--x-mu)}.hxu-lm-st dd{margin:2px 0 0;font-size:26px;font-weight:800;letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums}.hxu-lm-st dd small{font-size:14px;font-weight:700;margin-left:2px;color:var(--x-mu)}
@media(max-width:1080px){.hxu-lm-g{grid-template-columns:minmax(0,1fr)}.hxu-lm-sd{min-height:0}.hxu-lm-ph{position:relative;height:280px}.hxu-lm-ph0{display:none}.hxu-lm-lg{margin:-56px 16px 16px}}
@media(max-width:640px){.hpt.hxu-lm{padding:28px 0 36px}.hxu-lm-ey{flex-wrap:wrap;font-size:13.5px}.hxu-lm-wk{padding:16px 10px 6px;border-radius:18px}.hxu-lm .hxu-pn-h{padding:0 4px 12px}.hxu-wk{gap:2px}.hxu-td{padding:0 4px}.hxu-wk a{min-height:68px;border-radius:12px}.hxu-wk b{font-size:18px}.hxu-td a{gap:10px}.hxu-dd{flex-basis:56px}
.hxu-lm-ph{height:200px}.hxu-lm-sd{border-radius:20px}.hxu-lm-lg{margin:-40px 10px 10px;padding:18px 16px 16px}.hxu-lm-bt{flex-direction:column}}
`; }
  /* 열린 캠퍼스(uvopen): 전면 사진 + 칩 판 */
  function openCSS(s) { const T = HPT.tokens(s); if (!T) return ''; const Rm = ramp(T.a);
    let hd = mix(Rm[900] || mix(T.a, '#000000', .62), '#0B1220', .5); for (let k = 0; k < 10 && CR('#ffffff', mix(hd, '#ffffff', .1)) < 7; k++) hd = mix(hd, '#000000', .2);
    const ey = fit(mix(T.a, '#ffffff', .6), hd, 4.8, '#ffffff'); const btnT = fit(Rm[800] || T.a, '#ffffff', 7, '#000000');
    return `
/* v43.8 열린 캠퍼스 첫 화면 */
.hpt.hxu-op{position:relative;overflow:hidden;color:#fff;background:${hd};padding:clamp(48px,6vw,84px) 0 clamp(40px,5vw,64px);isolation:isolate}
.hxu-op .hxu-op-ph{position:absolute;inset:0;z-index:-2;margin:0}.hxu-op .hxu-op-ph img{width:100%;height:100%;display:block}
.hxu-op-sc{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,${al(hd, .94)} 0%,${al(hd, .88)} 48%,${al(hd, .5)} 100%),linear-gradient(0deg,${al(hd, .92)} 0%,${al(hd, 0)} 55%)}
.hxu-op-tx{max-width:760px}
.hxu-op-ey{display:inline-flex;align-items:center;margin:0 0 20px;padding:8px 14px;border-radius:999px;background:${al('#ffffff', .1)};box-shadow:inset 0 0 0 1px ${al('#ffffff', .22)};font-size:14px;font-weight:750;color:${ey}}
.hxu-op h1{margin:0;font-family:var(--hd-ff,inherit);font-weight:800;font-size:clamp(34px,4.6vw,62px)!important;line-height:1.12;letter-spacing:-.045em;color:#fff;word-break:keep-all}
.hxu-op-sub{margin:18px 0 0;max-width:34em;font-size:clamp(16px,1.3vw,18.5px);line-height:1.7;color:${al('#ffffff', .88)}}
.hxu-op .hxu-btn.p{background:#fff;color:${btnT};box-shadow:0 14px 30px -16px rgba(0,0,0,.6)}.hxu-op .hxu-btn.g{background:${al('#ffffff', .08)};color:#fff;box-shadow:inset 0 0 0 1.5px ${al('#ffffff', .45)}}.hxu-op .hxu-btn.g:hover{background:${al('#ffffff', .16)}}
.hxu-op-pv{display:flex;align-items:center;gap:8px;margin:18px 0 0;font-size:14px;color:${ey}}.hxu-op-pv svg{flex:0 0 auto}
.hxu-op-pn{margin-top:clamp(40px,5vw,64px);background:#fff;color:var(--ink);border-radius:24px;box-shadow:0 30px 60px -30px rgba(0,0,0,.6);overflow:hidden}
.hxu-op-ch{padding:24px 26px 20px}
.hxu-op-q{display:flex;align-items:center;gap:8px;margin:0 0 14px;font-size:18px;font-weight:800;letter-spacing:-.02em}.hxu-op-q svg{color:var(--x-at)}
.hxu-op-ch ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px}
.hxu-op-ch li a{display:inline-flex;align-items:center;gap:8px;min-height:50px;padding:6px 16px;border-radius:14px;background:#fff;box-shadow:inset 0 0 0 1.5px var(--x-ln);transition:box-shadow .15s,background .15s}
.hxu-op-ch li a:hover{box-shadow:inset 0 0 0 1.5px var(--x-a);background:var(--x-50)}
.hxu-op-ch li a.all{background:var(--x-a);color:var(--x-on);box-shadow:none}.hxu-op-ch li a.all small{color:var(--x-on);opacity:.9}
.hxu-op-ch b{font-size:15.5px;font-weight:700;letter-spacing:-.01em}.hxu-op-ch em{font-style:normal;font-size:13px;font-weight:750;padding:3px 8px;border-radius:7px;background:var(--x-50);color:var(--x-at50)}
.hxu-op-ch small{font-size:13px;font-weight:650;color:var(--x-mu)}.hxu-op-ch small.hot{color:var(--x-wt)}
.hxu-op-st{display:flex;gap:36px;margin:20px 0 0;padding-top:16px;border-top:1px solid var(--x-ln)}
.hxu-op-st dt{font-size:13.5px;color:var(--x-mu)}.hxu-op-st dd{margin:2px 0 0;font-size:28px;font-weight:800;letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums}.hxu-op-st dd small{font-size:14px;font-weight:700;margin-left:2px;color:var(--x-mu)}
.hxu-op-if{list-style:none;margin:0;padding:6px 14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:4px;background:#F5F7FA;border-top:1px solid var(--x-ln)}
.hxu-op-if li{display:flex;align-items:center;gap:12px;min-height:64px;padding:8px 12px;min-width:0}.hxu-op-if a{display:flex!important;align-items:center;gap:12px;flex:1;min-width:0;min-height:56px;border-radius:12px}.hxu-op-if a:hover b{color:var(--x-at)}
.hxu-op-ik{flex:0 0 40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#fff;color:var(--x-at);box-shadow:0 0 0 1px var(--x-ln)}
.hxu-op-if li>span:last-child,.hxu-op-if a>span:last-child{display:flex;flex-direction:column;min-width:0}.hxu-op-if small{font-size:13px;color:var(--x-mu)}.hxu-op-if b{font-size:15px;font-weight:700;line-height:1.45;word-break:keep-all}
@media(max-width:640px){.hpt.hxu-op{padding:40px 0 28px}.hxu-op-sc{background:${al(hd, .88)}}.hxu-op-pn{border-radius:18px}.hxu-op-ch{padding:18px 16px 16px}.hxu-op-ch ul{gap:8px}.hxu-op-ch li:nth-child(n+6){display:none}.hxu-op-ch li a{padding:6px 12px;flex-wrap:wrap;row-gap:0}.hxu-op-st{gap:22px}.hxu-op-st dd{font-size:23px}.hxu-op-if{padding:4px 6px;grid-template-columns:minmax(0,1fr)}}
`; }
  const heroCSS = s => FIX + (s.theme === 'uvlms' ? lmsCSS(s) : s.theme === 'uvopen' ? openCSS(s) : hubCSS(s));
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); if (!s || !Array.isArray(s.sections)) return h;
    try { const part = s.sections.some(x => x && x.type === 'text' && x.data && R[x.data.hpt]); const me = mine(s); if (!part && !me) return h;
      return h.replace('</style>', ((part || me ? partCSS(s) : '') + (me ? heroCSS(s) : '')).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hpx-univ css', e); return h; } }; window.siteHTML = siteHTML; }

  /* ── 공통 등록 도우미(묶음 파일 4개가 같은 코드를 쓴다 — 먼저 실행된 것 하나만 감싼다) ── */
  if (!HPT.xtag) { HPT.xtag = {};
    if (typeof HPT.premFits === 'function') { const f0 = HPT.premFits; HPT.premFits = (id, ty) => { const g = HPT.xtag[id]; if (!g) return f0(id, ty); ty = ty || (() => { try { return S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type; } catch (e) { return ''; } })(); return g.includes(ty) || g.includes(ty === 'univ_lms' ? 'univ' : ty); }; }
    if (typeof HPT.premFor === 'function') { const f0 = HPT.premFor; HPT.premFor = ty => { const L = f0(ty); const X = Object.keys(HPT.xtag); const fit1 = X.filter(id => HPT.premFits(id, ty)); return [...fit1, ...L, ...X.filter(id => !fit1.includes(id))]; }; }
    if (typeof HPT.thumb === 'function') { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!HPT.xtag[id] || typeof siteHTML !== 'function') return tb(s, id);
      try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.theme === id && t.prem); if (tp && typeof tp.build === 'function') b.sections = tp.build(); return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpx thumb', e); return tb(s, id); } }; } }

  /* ── 테마 · 글자 토큰 · 템플릿 ── */
  const NAVY = '#1F4E9E';
  const DEF = {
    uvhub: { name: '캠퍼스 허브', desc: '방문자별 바로 가기 · 마감 임박 판 · 이수 배지 · 학사 일정 — 재학생 · 신입생 · 교수자 · 산학이 첫 화면에서 할 일을 찾는 대학형', tags: ['univ', 'univ_lms'], tone: 'light', dens: '보통',
      acc: NAVY, bg: '#FFFFFF', alt: '#F4F6FA', ink: '#0F172A', mu: '#4A5263', r: 16, br: 12, hero: 'split', vis: 'mock', illu: 'campus', card: 'shadow', look: 'campus', sw2: '#0B1B3A', base: 'campus', hk: 'uvhub', hp: 'due', ck: 'photo', sh: '0 1px 2px rgba(15,23,42,.05),0 16px 36px -22px rgba(15,23,42,.3)'  },
    uvlms: { name: '강의실 홈', desc: '이번 주 할 일(7일 띠 · 마감 · 개강) · 학번 로그인 카드 · 큰 목록형 교과목 — 재학생이 매일 들어오는 학사 LMS형', tags: ['univ_lms', 'univ'], tone: 'light', dens: '보통',
      acc: '#2357C6', bg: '#FFFFFF', alt: '#F5F7FB', ink: '#101828', mu: '#475467', r: 16, br: 12, hero: 'split', vis: 'mock', illu: 'campus', card: 'flat', look: 'clean', sw2: '#0E2A63', base: 'clean', hk: 'uvlms', hp: 'week', ck: 'list', sh: '0 1px 2px rgba(16,24,40,.05),0 12px 28px -20px rgba(16,24,40,.28)' },
    uvopen: { name: '열린 캠퍼스', desc: '전면 사진 · 강좌 칩 · 남은 자리 막대 · 문의와 오시는 길을 위로 — 평생 · RISE · 지역 개방 강좌를 여는 대학형', tags: ['univ', 'univ_lms'], tone: 'light', dens: '보통',
      acc: '#0F6E5C', bg: '#FFFFFF', alt: '#F3F7F5', ink: '#0F1A17', mu: '#46524E', r: 18, br: 14, hero: 'full', vis: 'photo', illu: 'campus', card: 'shadow', look: 'campus', sw2: '#0A2A24', base: 'campus', hk: 'uvopen', hp: 'seats', ck: 'photo', sh: '0 1px 2px rgba(15,26,23,.05),0 16px 36px -22px rgba(15,26,23,.3)' } };
  const HD = { uvhub: { hf: 'sans', hw: 800, hls: -0.035, h1: 56, h1m: 34, lh1: 1.14, h2: 36, h2m: 26, h3: 19, body: 16, blh: 1.7, lead: 18, ey: { fs: 14, ls: 0.02, fw: 750, tt: 'none' }, sec: 104, secm: 64, w: 1240, gut: 40,
    r: 16, rs: 10, br: 12, bh: 52, bpx: 24, bfw: 750, bls: -0.01, bd: '1px solid rgba(15,23,42,.09)', sh: '0 1px 2px rgba(15,23,42,.05)', shh: '0 18px 36px -20px rgba(15,23,42,.3)', hov: 'lift', em: 'accent', link: 'hover'  },
    uvlms: { hf: 'sans', hw: 800, hls: -0.035, h1: 50, h1m: 32, lh1: 1.16, h2: 34, h2m: 25, h3: 18, body: 16, blh: 1.7, lead: 17, ey: { fs: 14, ls: 0.01, fw: 750, tt: 'none' }, sec: 96, secm: 60, w: 1240, gut: 40,
      r: 16, rs: 10, br: 12, bh: 52, bpx: 22, bfw: 750, bls: -0.01, bd: '1px solid rgba(16,24,40,.09)', sh: '0 1px 2px rgba(16,24,40,.05)', shh: '0 14px 30px -20px rgba(16,24,40,.28)', hov: 'lift', em: 'accent', link: 'hover' },
    uvopen: { hf: 'sans', hw: 800, hls: -0.04, h1: 62, h1m: 34, lh1: 1.12, h2: 38, h2m: 26, h3: 19, body: 16.5, blh: 1.7, lead: 18, ey: { fs: 14, ls: 0.01, fw: 750, tt: 'none' }, sec: 104, secm: 64, w: 1240, gut: 40,
      r: 18, rs: 12, br: 14, bh: 54, bpx: 26, bfw: 750, bls: -0.01, bd: '1px solid rgba(15,26,23,.09)', sh: '0 1px 2px rgba(15,26,23,.05)', shh: '0 18px 36px -20px rgba(15,26,23,.3)', hov: 'lift', em: 'accent', link: 'hover' } };
  function cssX(s, th, T) { const Rm = ramp(T.a); const v = Object.keys(Rm).map(k => `--p${k}:${Rm[k]}`).join(';'); const tagBg = Rm[50]; const tagT = fit(T.a, tagBg, 4.6, '#000000');
    return `\n/* v43.8 대학(${s.theme}) */.hpt{${v};--warn:${WARN};--warn-t:${fit(WARN, th.bg, 4.6)};--on-a:${HPT.onColor ? HPT.onColor(T.a) : '#fff'};--tag:${tagBg};--tag-t:${tagT}}.hpt .hp-tag,.hpt .hps-tag{background:var(--tag);color:var(--tag-t)}.hpt .hp-s.hp-alt{background:var(--alt)}`; }

  const S2x = (type, data) => (typeof S2 === 'function' ? S2(type, data) : { id: 'x' + Math.random().toString(36).slice(2, 9), type, data });
  const TX = (variant, data) => S2x('text', { variant, ...data });
  const org = () => { try { return S.org.name; } catch (e) { return ''; } };
  const ids = n => { try { return pubCls(n); } catch (e) { return []; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  /* 부품 섹션(편집기에서는 features 변형으로 보여도 내용이 남게 cols를 둔다) */
  HPT.hpxPart = { who: (o = {}) => TX('features', { hpt: 'uvx-who', eyebrow: '', title: o.title || '무엇을 하러 오셨나요?', sub: o.sub || '', cols: (o.cols || WHO).map(r => r.slice()), ...(o.ord ? { ord: o.ord.slice() } : {}) }),
    badge: (o = {}) => TX('features', { hpt: 'uvx-badge', eyebrow: o.eyebrow || '', title: o.title || '', sub: o.sub || '', cols: [['이수', '이수 기준을 채우면'], ['배지', '디지털 배지 자동 발급'], ['확인', '내 학습에서 바로']] }),
    board: (o = {}) => TX('features', { hpt: 'uvx-board', eyebrow: '', title: o.title || '학사 일정', title2: o.title2 || '공지사항', cols: [['학사 일정', '시험 · 마감 · 개강'], ['공지사항', '학교 소식']] }),
    seats: (o = {}) => TX('features', { hpt: 'uvx-seats', eyebrow: o.eyebrow || '접수 현황', title: o.title || '남은 자리를 확인하고 신청하세요', sub: '', cols: [['정원', '모집 정원'], ['신청', '신청 인원'], ['남은 자리', '바로 신청']] }) };
  const T = {
    uvhub: { scene: '대학 학습 포털 · 비교과 센터 — 재학생 · 신입생 · 교수자 · 산학 방문자가 첫 화면에서 할 일을 바로 찾는 구성', purpose: ['learn', 'apply', 'info'],
      build: () => [S2x('banner', { eyebrow: semester(), title: `${org()}\n학번 하나로 여는 배움`, sub: '비교과 · 교과 프로그램 신청부터 이수 · 배지 확인, 학사 일정까지 학번 하나로 이어져요.', cta: '학번으로 로그인', cta2: '비교과 신청하기' }),
        HPT.hpxPart.who(), S2x('classes', { eyebrow: '', title: '이번 학기 비교과 · 교과 프로그램', sub: '마감이 가까운 순서로 확인하고 신청하세요.', ids: ids(6), layout: 'grid' }),
        HPT.hpxPart.badge(), HPT.hpxPart.board(),
        TX('cta', { eyebrow: '', title: '산학 협력 · 지역 연계 문의', body: '기업 · 기관 맞춤 교육과 공개 강좌 운영을 함께 논의해요.', cta: '협력 문의하기', cols: [] }),
        S2x('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' })]  },
    uvlms: { scene: '학사 LMS · 강의실 — 재학생이 매일 들어와 이번 주 마감 · 개강을 확인하고 학번으로 내 강의실에 들어가는 구성', purpose: ['learn', 'info'],
      build: () => [S2x('banner', { eyebrow: semester(), title: `${org()}\n오늘의 강의실`, sub: '이번 주 마감과 개강을 먼저 확인하고, 학번으로 내 강의실에 들어가세요.', cta: '학번으로 로그인', cta2: '내 학습 현황' }),
        S2x('classes', { eyebrow: '', title: '이번 학기 교과목 · 비교과', sub: '담당 교수 · 수업 기간 · 진행 상태를 한 줄로 확인하세요.', ids: ids(6), layout: 'grid', card: 'list' }),
        HPT.hpxPart.board(), HPT.hpxPart.badge({ title: '이수 기준을 채우면 배지가 쌓여요' }), HPT.hpxPart.who({ title: '처음이신가요? 내 자리에서 시작하세요' })] },
    uvopen: { scene: '열린 캠퍼스 · 평생 · 지역 개방 강좌 — 시민 · 지역 주민이 먼저 강좌를 찾고 남은 자리 · 문의 · 오시는 길을 확인하는 구성', purpose: ['apply', 'info'],
      build: () => [S2x('banner', { eyebrow: '열린 캠퍼스 · 시민 누구나', title: `${org()}\n지역과 함께 여는 강좌`, sub: '시민 · 지역 주민 누구나 들을 수 있는 공개 강좌예요. 남은 자리를 확인하고 바로 신청하세요.', cta: '공개 강좌 둘러보기', cta2: '수강 문의하기' }),
        HPT.hpxPart.seats(), HPT.hpxPart.who({ title: '누구신가요? 바로 가는 길', cols: [['재학생', '비교과 신청 · 이수 확인'], ['신입생', '처음 로그인 · 먼저 들을 과정'], ['교수자', '수업 운영 · 공지'], ['시민 · 지역 주민', '공개 강좌 · 수강 문의']], ord: [3, 0, 1, 2] }),
        S2x('classes', { eyebrow: '', title: '지금 열려 있는 공개 강좌', sub: '접수 중인 강좌부터 확인하세요.', ids: ids(6), layout: 'grid', card: 'photo' }),
        S2x('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' }), HPT.hpxPart.board({ title: '행사 · 학사 일정', title2: '공지사항' }),
        TX('cta', { eyebrow: '', title: '지역 기관 · 기업과 함께 강좌를 열어요', body: '지역 연계 · 산학 협력 강좌 운영을 함께 논의해요.', cta: '협력 문의하기', cols: [] })] } };

  /* 배치 보강(HPT.enrich): 이 부품이 있는 사이트는 공지 · 모집 일정 자동 섹션을 넣지 않는다(일정 · 공지 판과 겹침) */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hpxu) { const e0 = HPT.enrich; const f = s => { const r = e0(s); try { const L = s && s.sections; if (Array.isArray(L) && L.some(x => x && x.data && x.data.hpt === 'uvx-board')) { for (let k = L.length - 1; k >= 0; k--) { const x = L[k]; if (x && (x.type === 'notices' || (x.type === 'text' && x.data && x.data.hpt === 'sched'))) L.splice(k, 1); }
          /* 숫자 띠(hpth 자동 삽입)는 뺀다 — 첫 화면 다음은 방문자별 바로 가기, 숫자는 이수 · 배지 판에서 보여 준다 */
          const fi = L.findIndex(x => x && x.type === 'text' && x.data && (x.data.hpt === 'facts' || x.data.variant === 'stats')); const wi = L.findIndex(x => x && x.data && x.data.hpt === 'uvx-who');
          if (fi >= 0 && wi > fi && !L[fi].hpxKeep) L.splice(fi, 1); } } catch (e) { console.error('hpx-univ enrich', e); } return r; }; Object.keys(e0).forEach(k => { f[k] = e0[k]; }); f.hpxu = 1; HPT.enrich = f; }

  Object.keys(DEF).forEach(id => { if (!on(id)) return; if (!HPT.reg(id, Object.assign({ prem: 1, cssX }, DEF[id]))) return; HPT.xtag[id] = DEF[id].tags.slice();
    try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpx-univ HPD', e); }
    if (typeof TPL !== 'undefined' && !TPL.some(t => t.id === 'prem-' + id)) TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', 'univ'], scene: T[id].scene, color: DEF[id].acc, tone: '모던', look: DEF[id].look, theme: id, hero: '', purpose: T[id].purpose, prem: 1, build: T[id].build }); });
  if (typeof TPL !== 'undefined' && typeof HPT.premFor === 'function') { /* 대학 기관에서는 이 묶음이 프리미엄 목록 맨 앞 */ }
})();
