/* v43 D2 — 스튜디오 공통 「목록 · 표 · 상세 · 설정」 패턴(window.L43)
 * 문서: scratchpad/v43/plan/patterns-d2.md (3단계 요원은 이 문서만 보고 나머지 관리자 화면에 적용합니다)
 *
 * 1) 렌더 함수(새 화면 · 새 코드에서 직접 호출)
 *    L43.brief({ eye, title, sub, stats:[[값, 라벨, tone]] })  → 화면 첫 줄 「한 문장 브리핑」 + 핵심 숫자
 *    L43.av(name)            → 이니셜 원형 아바타(이름으로 색이 고정)
 *    L43.prog(v, tone?)      → 진도 막대 + 숫자(30% 미만 코랄, 80% 이상 짙은 그린)
 *    L43.chip(text, tone)    → 상태 칩(ok · warn · bad · mute · ai)
 *    L43.empty({ art, title, body, act, v, label }) → 빈 상태(그린 SVG 일러스트 + 한 문장 + 주 버튼 1개)
 *    L43.bulk(n, unit, buttonsHtml, clearAct) → 선택 시 아래에 떠 있는 일괄 실행 바
 *    L43.fbar({ key, cur, chips:[[id,라벨,개수]], q:{ act, ph, val }, right }) → 필터 바(칩 + 검색 + 오른쪽 도구)
 *    L43.photo(words, seed)  → 저장소 CC0 스톡 사진 주소(hpstock.js) — 썸네일이 없을 때
 * 2) 기존 화면 개조(렌더 코드를 고치지 않고 #main 을 꾸밈)
 *    L43.reg(tab, { brief: () => opts|null, enhance: main => {} }) → 탭 등록. 등록한 탭은 #main 에 .l43 이 붙어 l43.css 가 적용됩니다.
 *    공통 개조(자동): 표 이름 열 아바타 · % 칸 진도 막대 · 머리 칸 정렬 · 선택 행 강조 · 빈 상태 일러스트 · 빈 목록이면 필터 바 숨김
 * 기존 data-act · id · 테스트 선택자는 건드리지 않습니다(새 버튼에 기존 data-act 를 중복으로 달지 않음 — 테스트 strict 모드). */
(function () {
  'use strict';
  const W = window;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hash = s => { let h = 2166136261; for (const ch of String(s || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const REG = {};
  const num = v => Math.round(+v || 0);

  /* ───────── 렌더 함수 ───────── */
  const initial = n => { n = String(n || '').trim(); if (!n) return '?'; if (/^[A-Za-z]/.test(n)) { const p = n.split(/\s+/); return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase(); } return n[0]; };
  const av = (name, size) => `<span class="l43-av t${hash(name) % 6}${size ? ' ' + size : ''}" aria-hidden="true">${E(initial(name))}</span>`;
  const prog = (v, tone) => { v = Math.max(0, Math.min(100, num(v))); const t = tone || (v < 30 ? 'lo' : v >= 80 ? 'hi' : ''); return `<span class="l43-pg ${t}"><span class="l43-pgt"><i style="width:${v}%"></i></span><b>${v}%</b></span>`; };
  const chip = (t, tone) => `<span class="l43-chip ${tone || ''}">${E(t)}</span>`;
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const todayLabel = () => { const d = new Date(); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${DOW[d.getDay()]})`; };
  function brief(o) {
    if (!o) return '';
    const st = (o.stats || []).filter(Boolean);
    return `<section class="l43-brief" aria-label="화면 브리핑"><div class="l43-bl"><p class="l43-eye"><span class="l43-ai" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor"/></svg>AI</span>${E(o.eye || '오늘 브리핑')} · ${E(todayLabel())}</p>
      <h2 class="l43-hl">${o.title}</h2>${o.sub ? `<p class="l43-sub">${o.sub}</p>` : ''}</div>
      ${st.length ? `<dl class="l43-stats">${st.map(([v, l, t]) => `<div class="l43-st ${t || ''}"><dt>${E(l)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>` : ''}</section>`;
  }
  /* 빈 상태 일러스트(160×120, 그린 톤 · 토큰 색이라 다크 자동) */
  const ART = {
    list: '<rect x="30" y="22" width="100" height="78" rx="12" class="a3"/><rect x="42" y="36" width="22" height="16" rx="4" class="a1"/><rect x="70" y="38" width="46" height="5" rx="2.5" class="a4"/><rect x="70" y="47" width="30" height="4" rx="2" class="a5"/><rect x="42" y="62" width="22" height="16" rx="4" class="a1"/><rect x="70" y="64" width="46" height="5" rx="2.5" class="a4"/><rect x="70" y="73" width="24" height="4" rx="2" class="a5"/><circle cx="124" cy="94" r="16" class="a2"/><path d="M116 94h16M124 86v16" class="a6"/>',
    people: '<circle cx="62" cy="50" r="16" class="a1"/><path d="M34 98c0-16 12-26 28-26s28 10 28 26z" class="a1"/><circle cx="100" cy="46" r="13" class="a3"/><path d="M80 96c2-13 10-20 20-20s19 7 21 20z" class="a3"/><circle cx="124" cy="92" r="16" class="a2"/><path d="M116 92h16M124 84v16" class="a6"/>',
    check: '<rect x="44" y="18" width="72" height="90" rx="12" class="a3"/><rect x="64" y="12" width="32" height="14" rx="6" class="a1"/><path d="M58 50l8 8 14-14" class="a7"/><rect x="58" y="70" width="44" height="5" rx="2.5" class="a4"/><rect x="58" y="82" width="30" height="5" rx="2.5" class="a5"/><circle cx="118" cy="96" r="14" class="a2"/><path d="M112 96l4 4 8-8" class="a6"/>',
    doc: '<rect x="40" y="16" width="80" height="92" rx="12" class="a3"/><rect x="54" y="66" width="10" height="26" rx="3" class="a1"/><rect x="70" y="54" width="10" height="38" rx="3" class="a2"/><rect x="86" y="44" width="10" height="48" rx="3" class="a1"/><rect x="54" y="30" width="40" height="5" rx="2.5" class="a4"/>',
    gear: '<circle cx="80" cy="62" r="34" class="a3"/><circle cx="80" cy="62" r="14" class="a1"/><path d="M80 22v12M80 90v12M40 62h12M108 62h12M52 34l8 8M100 82l8 8M52 90l8-8M100 42l8-8" class="a7"/>'
  };
  const artSvg = k => `<svg class="l43-art" viewBox="0 0 160 120" width="160" height="120" aria-hidden="true"><ellipse cx="80" cy="110" rx="58" ry="6" class="a0"/>${ART[k] || ART.list}</svg>`;
  function empty(o) {
    o = o || {};
    return `<div class="l43-empty" role="status">${artSvg(o.art)}<b>${E(o.title || '아직 항목이 없습니다')}</b>${o.body ? `<p>${E(o.body)}</p>` : ''}${o.act ? `<button type="button" class="btn pri" data-act="${E(o.act)}"${o.v != null ? ` data-v="${E(o.v)}"` : ''}>${E(o.label || '시작하기')}</button>` : ''}</div>`;
  }
  const bulk = (n, unit, btns, clearAct) => n ? `<div class="l43-bulk" role="region" aria-label="선택 항목 일괄 실행"><b class="l43-bn">${n}</b><span>${E(unit || '개')} 선택</span><span class="sp"></span>${btns || ''}${clearAct ? `<button type="button" class="btn sm ghost" data-act="${E(clearAct)}">선택 해제</button>` : ''}</div>` : '';
  function fbar(o) {
    o = o || {};
    const ch = (o.chips || []).map(([id, l, c]) => `<button type="button" role="tab" aria-selected="${id === o.cur}" class="l43-fc ${id === o.cur ? 'on' : ''}" data-act="tab" data-key="${E(o.key)}" data-v="${E(id)}">${E(l)}${c != null ? `<em>${E(c)}</em>` : ''}</button>`).join('');
    const q = o.q ? `<label class="l43-q"><span class="sr">검색</span><input type="search" placeholder="${E(o.q.ph || '검색')}" value="${E(o.q.val || '')}" data-chg="${E(o.q.act)}"></label>` : '';
    return `<div class="l43-fbar">${ch ? `<div class="l43-fcs" role="tablist">${ch}</div>` : ''}${q}<span class="sp"></span>${o.right || ''}</div>`;
  }
  function photo(words, seed) {
    try { if (!W.HPSTOCK) return ''; const L4 = HPSTOCK.pick([].concat(words || []).filter(Boolean), 4, String(seed || words)); const it = L4[hash(seed || words) % Math.max(1, L4.length)]; return it ? HPSTOCK.url(it, 'sm') : ''; } catch (e) { return ''; }
  }
  /* 과정 이름 → 사진 고르기용 단어(hpstock 분류 키워드와 맞춤) */
  const KW = [[/스마트폰|디지털|컴퓨터|엑셀|데이터|AI|코딩|IT|파이썬|프로그래밍/i, 'IT'], [/바리스타|커피|제과|요리|조리/, '요리'], [/인문|독서|문학|역사|철학|국어/, '독서'], [/복지|요양|돌봄|간호|보건/, '돌봄'], [/창업|경영|마케팅|회계|재무/, '경영'], [/영어|일본어|중국어|어학|회화/, '외국어'], [/수학|과학/, '수학'], [/미술|디자인|드로잉/, '미술'], [/음악|피아노|노래/, '음악'], [/안전|성희롱|개인정보|장애인|법정/, '사무'], [/운동|요가|체육|수영/, '운동']];
  const wordsOf = name => { const w = KW.filter(([re]) => re.test(name || '')).map(x => x[1]); return w.length ? w : ['교실']; };

  /* ───────── 기존 화면 공통 개조 ───────── */
  const NAMEH = /^(이름|원생|훈련생|성명|학생|수강생|응시자|신청자|교육생|임직원)$/;
  function nameOfCell(td) { const a = td.querySelector('a, b, strong'); let t = (a ? a.textContent : td.textContent).trim(); t = t.split(/\s+/)[0]; return t.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 10); }
  function sortTable(tbl, col, dir) {
    const tb = tbl.tBodies[0]; if (!tb) return; const rows = [...tb.rows]; if (rows.some(r => r.cells.length !== tbl.tHead.rows[0].cells.length)) return;
    const key = r => { const c = r.cells[col]; const t = (c ? c.textContent : '').trim(); const n = parseFloat(t.replace(/[,원명건%개회일P\s]/g, '')); return /^[-\d.,]+\s*[%원명건개회일P]?$/.test(t) && !isNaN(n) ? n : t; };
    rows.sort((a, b) => { const x = key(a), y = key(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko'); return dir === 'desc' ? -r : r; });
    rows.forEach(r => tb.appendChild(r));
  }
  function enhanceTables(main) {
    const tab = (W.CUR && CUR.tab) || CUR.ws; UI.l43s = UI.l43s || {};
    main.querySelectorAll('.tw table').forEach((tbl, ti) => {
      if (tbl.dataset.l43) return; tbl.dataset.l43 = 1; const hr = tbl.tHead && tbl.tHead.rows[0]; if (!hr) return;
      const H = [...hr.cells].map(th => th.textContent.trim());
      const ni = H.findIndex(h => NAMEH.test(h));
      [...(tbl.tBodies[0] || { rows: [] }).rows].forEach(tr => {
        if (ni >= 0 && tr.cells[ni] && !tr.cells[ni].querySelector('.l43-av')) { const n = nameOfCell(tr.cells[ni]); if (n) { tr.cells[ni].classList.add('l43-nc'); tr.cells[ni].insertAdjacentHTML('afterbegin', av(n)); } }
        [...tr.cells].forEach((td, i) => { if (td.querySelector('button,a,input,select,.bar,.l43-pg,svg,img') || td.querySelectorAll('*').length > 2) return; const t = td.textContent.trim(); const m = t.match(/^(\d{1,3})%$/); if (m && !/출석률|대비|증감/.test(H[i] || '')) { td.innerHTML = prog(+m[1]); td.classList.add('l43-pc'); } });
        [...tr.cells].forEach(td => { const t = td.textContent.trim(); if (t && t.length <= 16 && !td.querySelector('button,.btn')) td.classList.add('l43-nw'); });
        const ck = tr.querySelector('td:first-child input[type=checkbox]'); if (ck) { tr.classList.toggle('l43-sel', ck.checked); ck.addEventListener('change', () => tr.classList.toggle('l43-sel', ck.checked)); }
      });
      /* 정렬: 글자가 있는 머리 칸만(체크 · 버튼 칸 제외) */
      const rowsN = tbl.tBodies[0] ? tbl.tBodies[0].rows.length : 0; if (rowsN < 2 || rowsN > 500) return;
      const sk = tab + ':' + ti; const cur = UI.l43s[sk];
      [...hr.cells].forEach((th, i) => {
        if (!H[i] || th.querySelector('input,button,select')) return;
        th.classList.add('l43-sort'); th.tabIndex = 0; th.setAttribute('aria-sort', cur && cur[0] === i ? (cur[1] === 'desc' ? 'descending' : 'ascending') : 'none');
        const go = () => { const p = UI.l43s[sk]; const dir = p && p[0] === i && p[1] === 'asc' ? 'desc' : 'asc'; UI.l43s[sk] = [i, dir]; [...hr.cells].forEach(c => c.classList.contains('l43-sort') && c.setAttribute('aria-sort', 'none')); th.setAttribute('aria-sort', dir === 'desc' ? 'descending' : 'ascending'); sortTable(tbl, i, dir); };
        th.addEventListener('click', go); th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
      if (cur) sortTable(tbl, cur[0], cur[1]);
    });
  }
  const ARTOF = { class: 'list', members: 'people', crmstu: 'people', assess: 'check', compliance: 'check', hrd: 'doc', lmsa: 'list', settings: 'gear' };
  function enhanceEmpty(main, tab) {
    main.querySelectorAll('.slg-empty:not([data-l43])').forEach(c => { c.dataset.l43 = 1; c.classList.add('l43-empty', 'l43-slg'); const i = c.querySelector('.slg-eic'); if (i) i.outerHTML = artSvg(ARTOF[tab]); });
    main.querySelectorAll('.empty:not([data-l43])').forEach(e => { if (e.dataset.slgHide || e.closest('.modal')) return; e.dataset.l43 = 1; const t = e.textContent.trim(); if (t.length > 160) return; const art = artSvg(ARTOF[tab]).replace('width="160" height="120"', 'width="112" height="84"'); e.classList.add('l43-emptyp');
      if (e.querySelector('button,a,input,select')) e.insertAdjacentHTML('afterbegin', art); else e.innerHTML = `${art}<p>${E(t)}</p>`; });
    main.classList.toggle('l43-none', !!main.querySelector('.slg-empty'));
  }
  function run() {
    const main = document.getElementById('main'); if (!main || !W.S || !S.org) return;
    const tab = CUR.ws === 'settings' ? 'settings' : CUR.tab; const R = REG[tab];
    main.classList.toggle('l43', !!R); if (!R) return; main.dataset.l43 = tab;
    if (!main.querySelector('.l43-brief') && R.brief) { let o = null; try { o = R.brief(main); } catch (e) { console.error(e); } if (o) { const h = brief(o); const bv = main.querySelector(':scope > .bview'); const wh = main.querySelector('.wh, .bhd'); if (bv) bv.insertAdjacentHTML('afterbegin', h); else if (wh) wh.insertAdjacentHTML('afterend', h); else main.insertAdjacentHTML('afterbegin', h); } }
    try { enhanceTables(main); } catch (e) { console.error(e); }
    try { if (R.enhance) R.enhance(main); } catch (e) { console.error(e); }
    try { enhanceEmpty(main, tab); } catch (e) { console.error(e); }
  }
  const reg = (tab, o) => { REG[tab] = o || {}; if (o && o.art) ARTOF[tab] = o.art; };
  if (typeof AFTER !== 'undefined') AFTER.push(() => { run(); setTimeout(run, 0); });
  W.L43 = { brief, av, prog, chip, empty, bulk, fbar, photo, wordsOf, reg, run, artSvg, REG };

  /* ═════════ 대표 화면 등록(D2) ═════════ */
  const L = k => { try { return t(k); } catch (e) { return k; } };
  const pct = v => num(v) + '%';
  const avgOf = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const cp = c => { try { return avgP(c); } catch (e) { return 0; } };
  const memAvg = id => avgOf(S.classes.filter(c => (c.learners || []).includes(id)).map(c => +((c.prog || {})[id] || {}).p || 0));
  const daysAgo = d => { const x = new Date(d); return isNaN(x) ? 0 : Math.floor((Date.now() - x) / 864e5); };

  /* 1. 과정 목록 · 상세 */
  reg('class', {
    brief: () => {
      if (UI.cls || UI.clsView === 'cats' || !S.classes.length) return null;
      const C = S.classes, run = C.filter(c => c.status === '운영중').length, N = C.reduce((a, c) => a + (c.learners || []).length, 0), A = avgOf(C.map(cp)), low = C.filter(c => (c.learners || []).length && cp(c) < 30).length;
      return { title: `운영 중인 ${E(L('cls'))} <em>${run}개</em>, ${E(L('learner'))} ${N}명이 평균 ${pct(A)}까지 왔습니다`, sub: low ? `평균 진도 30% 미만 ${E(L('cls'))} ${low}개는 독려 메시지를 먼저 보내는 것이 좋습니다.` : `모든 ${E(L('cls'))}의 평균 진도가 30% 이상입니다.`, stats: [[C.length + '개', '전체 ' + L('cls')], [N + '명', L('learner')], [pct(A), '평균 진도'], [low + '개', '30% 미만', low ? 'warn' : '']] };
    },
    enhance: main => {
      main.querySelectorAll('.d26-cc:not([data-l43])').forEach(card => {
        card.dataset.l43 = 1; const id = (card.querySelector('.c2ck') || {}).value; const c = id && C(id); if (!c) return;
        const th0 = card.querySelector('.d26-th0'); if (th0) { const u = photo(wordsOf(c.name), c.id + c.name); if (u) th0.outerHTML = `<img class="l43-ph" src="${E(u)}" alt="" loading="lazy">`; }
        const pri = card.querySelector('.d26-pri'); const n = (c.learners || []).length;
        if (pri) pri.insertAdjacentHTML('beforebegin', `<div class="l43-cprog"><span>평균 진도</span>${prog(cp(c))}<span class="l43-cn">${n}명</span></div>`);
      });
      /* 목록 보기: 과정명 칸 작은 썸네일이 비었으면 사진으로 */
      main.querySelectorAll('.c2nm .c2th0').forEach(s => { const a = s.closest('.c2nm'); const c = a && C(a.dataset.v); const u = c && photo(wordsOf(c.name), c.id + c.name); if (u) s.outerHTML = `<img class="c2th sm" src="${E(u)}" alt="">`; });
      /* 상세: 머리에 대표 사진 */
      if (UI.cls) { const c = C(UI.cls); const h2 = c && [...main.querySelectorAll('h1,h2')].find(h => h.firstChild && String(h.firstChild.textContent || '').trim() === c.name);
        if (h2 && !main.querySelector('.l43-dthumb')) { const u = c.thumb || photo(wordsOf(c.name), c.id + c.name); h2.classList.add('l43-dh2'); if (u) h2.insertAdjacentHTML('afterbegin', `<img class="l43-dthumb" src="${E(u)}" alt="">`); } }
    }
  });

  /* 2. 명단 · 진도 */
  reg('members', {
    brief: () => {
      if (UI.mem || !S.members.length) return null; const M0 = S.members, wait = M0.filter(m => m.grade === '승인 대기').length;
      const lim = (() => { try { return addDays(today(), -30); } catch (e) { return ''; } })(); const away = M0.filter(m => m.last && lim && m.last <= lim).length;
      const A = avgOf(M0.map(m => memAvg(m.id))); const low = M0.filter(m => S.classes.some(c => (c.learners || []).includes(m.id)) && memAvg(m.id) < 30).length;
      return { title: `${E(L('learner'))} <em>${M0.length}명</em> 가운데 ${low}명이 진도 30%에 못 미칩니다`, sub: `${wait ? `가입 승인 대기 ${wait}명을 먼저 처리하세요. ` : ''}${away ? `30일 넘게 접속하지 않은 ${away}명에게는 독려 메시지를 권합니다.` : '모두 최근 30일 안에 접속했습니다.'}`, stats: [[M0.length + '명', '전체'], [wait + '명', '승인 대기', wait ? 'warn' : ''], [pct(A), '평균 진도'], [low + '명', '30% 미만', low ? 'warn' : '']] };
    },
    enhance: main => {
      if (UI.mem) return; const tbl = main.querySelector('.tw table'); if (!tbl || tbl.dataset.l43m) return; tbl.dataset.l43m = 1;
      const hr = tbl.tHead && tbl.tHead.rows[0]; if (!hr) return; const ni = [...hr.cells].findIndex(th => NAMEH.test(th.textContent.trim())); if (ni < 0) return;
      hr.cells[ni].insertAdjacentHTML('afterend', '<th class="l43-sort" aria-sort="none">평균 진도</th>');
      [...tbl.tBodies[0].rows].forEach(tr => { const a = tr.querySelector('[data-act="mem-open"]'); const id = a && a.dataset.v; const has = id && S.classes.some(c => (c.learners || []).includes(id)); if (tr.cells[ni]) tr.cells[ni].insertAdjacentHTML('afterend', `<td class="l43-pc">${has ? prog(memAvg(id)) : '<span class="l43-mute">수강 없음</span>'}</td>`); });
      const b = main.querySelector('.mb-bulk'); if (b) b.classList.add('l43-bulk');
    }
  });

  /* 3. 평가 — 채점 대기 큐 */
  reg('assess', {
    brief: () => {
      if (UI.asDetail || UI.aItem) return null; let P = []; try { P = pend(); } catch (e) { }
      const cls = new Set(P.map(x => x.c.id)).size;
      return P.length ? { title: `채점을 기다리는 답안 <em>${P.length}건</em>이 있습니다`, sub: `${cls}개 ${E(L('cls'))}에서 제출했습니다. 오래 기다린 답안부터 채점하고, 나머지는 AI 평가로 초안을 받아 확정하세요.` } : { title: '채점할 답안이 <em>없습니다</em>', sub: '새 답안이 제출되면 이 화면 맨 위에 모입니다.' };
    },
    enhance: main => { main.querySelectorAll('.tw td .tag').forEach(t => { if (/^\d+일$/.test(t.textContent.trim())) { const d = parseInt(t.textContent, 10); t.classList.add('l43-age'); if (d >= 7) t.classList.add('old'); } }); }
  });

  /* 4. 설정 루트 · 메뉴 구성 */
  reg('settings', {
    brief: () => {
      if (UI.settings) return null; let onM = 0; try { onM = Object.values(S.nav.tabs).flat().filter(x => x.on && MENU[x.id]).length; } catch (e) { }
      const adm = (S.admins || []).length, au = (S.autos || []).filter(a => a.on).length;
      return { eye: '운영 설정', title: `켜진 메뉴 <em>${onM}개</em>로 스튜디오를 운영하고 있습니다`, sub: '메뉴 · 사용자 · 알림 · 외부 연결을 여기서 바꿉니다. 바꾼 내용은 바로 저장됩니다.', stats: [[onM + '개', '켜진 메뉴'], [adm + '명', '운영자'], [au + '개', '자동 운영']] };
    }
  });

  /* 5. 기관 유형 전용 */
  reg('compliance', {
    brief: () => {
      const Lg = S.classes.filter(c => c.legal); if (!Lg.length) return null;
      const tot = Lg.reduce((a, c) => a + (c.learners || []).length, 0), dn = Lg.reduce((a, c) => { try { return a + doneN(c); } catch (e) { return a; } }, 0); const r = tot ? dn / tot * 100 : 0;
      const ends = Lg.map(c => c.end).filter(Boolean).sort(); const first = ends[0];
      return { eye: '법정의무교육', title: `평균 이수율 <em>${pct(r)}</em>, 미이수 ${tot - dn}건에 독려가 필요합니다`, sub: first ? `가장 빠른 마감은 ${E(first)}입니다. 부서별 이수율이 낮은 팀부터 독려하세요.` : '', stats: [[Lg.length + '종', '법정 교육'], [pct(r), '평균 이수율', r < 50 ? 'warn' : ''], [(tot - dn) + '건', '미이수', tot - dn ? 'warn' : '']] };
    }
  });
  reg('hrd', {
    brief: () => {
      const R = (S.hrd && S.hrd.reports) || []; const w = R.filter(r => r.st === '전송 대기').length; let low = 0; try { low = lowAttN(); } catch (e) { }
      return { eye: 'HRD-Net 보고', title: w ? `HRD-Net 보고 대기 <em>${w}건</em>, 출석률 80% 미만 훈련생 ${low}명` : `출석률 80% 미만 훈련생 <em>${low}명</em>을 먼저 확인하세요`, sub: `${w ? '' : '전송을 기다리는 보고는 없습니다. '}수료 요건은 진도율 · 평가 성적 · 출석률을 함께 봅니다.`, stats: [[S.members.length + '명', '훈련생'], [low + '명', '출석 80% 미만', low ? 'warn' : ''], [w + '건', '보고 대기', w ? 'warn' : '']] };
    }
  });
  reg('crmstu', {
    brief: () => {
      if (UI.crmId) return null; const st = (S.members || []).filter(m => !m.withdrawn); if (!st.length) return null;
      const unpaid = (S.bills || []).filter(b => b.status === '미납').length; const tch = new Set(st.map(m => m.grade || '').filter(Boolean)).size;
      return { eye: '원생', title: unpaid ? `재원생 <em>${st.length}명</em> · 이번 달 미납 ${unpaid}건을 먼저 확인하세요` : `재원생 <em>${st.length}명</em>의 수업 · 출결 · 수납을 한곳에서 봅니다`, stats: [[st.length + '명', '재원생'], [S.classes.length + '개', '수업'], [unpaid + '건', '미납', unpaid ? 'warn' : '']].concat(tch > 1 ? [] : []) };
    }
  });
  reg('lmsa', {
    brief: main => {
      if (UI.lmsaId || UI.lmsSec) return null; const rows = main.querySelectorAll('.tw tbody tr').length; if (!rows) return null;
      const sel = main.querySelector('select'); const term = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent.replace(/\s*\(.*\)$/, '') : '이번 학기';
      return { eye: '학사 LMS', title: `${E(term)} 분반 <em>${rows}개</em>를 운영합니다`, sub: '같은 과목의 분반은 대표 분반 자료를 한 번에 복제할 수 있습니다.' };
    }
  });
})();
