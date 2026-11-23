/* v31.8 학사 LMS 메뉴 통합 — 학교 담당자가 「무슨 일을 하려는지」로 찾게, 45개 메뉴를 공간 5개(수업 · 학생 · 소통 · 사이트 · 운영) · 메뉴 16개로 묶어 보여 준다.
   표시 계층만 바꾼다: 기존 화면(VIEWS) · 경로(go(id)) · 메뉴 켜기/끄기(S.nav) · 권한(TEACH_NO) · 강의실 메뉴 숨김(LMSX.hidden)은 그대로 쓴다.
   학사 LMS(대학 › 학사 LMS) 기관일 때만 동작한다. */
(function () {
  'use strict';
  const ON = () => typeof ULMS === 'function' && ULMS() && S && S.nav;
  /* [공간 키, 이름, 아이콘, [[메뉴 id, 이름, 한 줄 설명, [묶는 화면 id(자주 쓰는 순) · '…' 뒤는 「더보기」(기본 기능과 겹치거나 덜 쓰는 화면)]]]] */
  const G = [
    ['g-class', '수업', 'book', [
      ['h-acad', '학기 · 강좌', '학기 · 교과목 · 분반 · 수강생을 준비합니다', ['lmsa', 'sis', '…', 'academic']],
      ['h-room', '강의실', '차시별 자료 · 영상 · 학습활동을 구성합니다', ['lmsb', 'lmsc', 'lmsi', 'class', '…', 'library', 'dbook', 'tutorial']],
      ['h-eval', '과제 · 시험', '과제와 시험을 내고 채점합니다', ['lmse', 'lmsf', '…', 'assess']],
      ['h-att', '출결', '출석을 받고 출결을 확인합니다', ['lmsg', 'lmsp-app', '…', 'attend']],
      ['h-grade', '성적', '성적을 계산하고 확정합니다', ['grade']],
      ['h-ana', '학습 분석', '학습 현황과 도움이 필요한 학생을 봅니다', ['lmsj', 'lmsp-portal']]]],
    ['g-people', '학생', 'users', [
      ['h-ppl', '학생 명단', '학생 명단 · 등록 · 학과를 관리합니다', ['members', 'enroll', 'groups']],
      ['h-extra', '비교과 · MOOC', '비교과 프로그램 · MOOC · 설문을 운영합니다', ['lmsq', 'lmsn', 'lmsk']]]],
    ['g-talk', '소통', 'chat', [
      ['h-board', '공지 · 게시판', '공지와 강의 게시판을 관리합니다', ['lmsd', 'board', 'community']],
      ['h-msg', '메시지 · 상담', '메시지 · 채팅 · 상담을 주고받습니다', ['message', 'lmsl-dm', 'consult']],
      ['h-cal', '일정 · 알림', '학사 일정과 자동 알림을 관리합니다', ['lmsl-cal', 'lmsl-noti', '…', 'calendar']]]],
    ['g-site', '사이트', 'globe', [
      ['h-site', '홈페이지 · 학습 사이트', '학생이 보는 학습 사이트를 꾸미고 게시합니다', ['site']]]],
    ['g-ops', '운영', 'grid', [
      ['h-sys', '사용자 · 권한', '사용자 · 운영자 · 보안 · 공통 설정', ['lmsm', 'admins', 'lmsp', '…', 'org']],
      ['h-ai', 'AI', 'AI 튜터 · 조교와 AI 사용을 관리합니다', ['lmso', 'aigov']],
      ['h-link', '연동 · 자동화', '학사 · 외부 시스템 연결과 자동화', ['conn', 'auto']],
      ['h-doc', '문서 · 구축 요건', '운영 문서와 RFP 대응 현황', ['docs', 'rfpmap']]]]
  ];
  const SHOW = 4; /* '…'가 없을 때 바로 보이는 화면 수 */
  /* 학사 LMS에서 헷갈리는 기본 화면 이름을 업무 이름으로 바꿔 보여 준다(메뉴 줄에서만) */
  const LBL = { lmsa: '학기 · 교과목 · 분반', sis: '학사 연동', academic: '학사 · 비교과 요약', lmsb: '강의실 구성', lmsc: '토론 · 위키 · 팀', lmsi: '동영상 · 진도', class: '강의 콘텐츠 만들기', library: '영상 · 자료 보관함', lmse: '과제', lmsf: '시험 · 문제은행', assess: '콘텐츠 퀴즈 채점', lmsg: '출석 관리', 'lmsp-app': '앱 출석(QR)', attend: '기본 출석부', lmsj: '학습 분석 · 위험 학생', 'lmsp-portal': '포털 대시보드', lmsq: '비교과 프로그램', lmsn: 'MOOC · 비학위', lmsk: '설문 · 강의평가', lmsd: '강의 게시판', board: '기관 공지', 'lmsl-dm': '채팅', 'lmsl-cal': '통합 달력', 'lmsl-noti': '알림 규칙', calendar: '개인 일정 · 코칭', lmsm: '사용자 · 접속 관리', admins: '운영자 · 기록', lmsp: '공통 설정 · 보안', org: '기관 정보', lmso: 'AI 학습 지원', aigov: 'AI 관리', conn: '외부 연결', auto: '자동화' };
  const nm = id => LBL[id] || mlabel(id);
  const hiddenByRoom = id => { try { return !!(window.LMSX && LMSX.hidden && LMSX.hidden(id)); } catch (e) { return false; } };
  const avail = () => { const s = new Set(); (S.nav.ws || []).forEach(w => { try { wsTabs(w).forEach(id => s.add(id)); } catch (e) { } }); return s; };
  /* 실제로 보여 줄 구조: 꺼진 화면 · 권한 없는 화면은 빼고, 어디에도 안 묶인 켜진 화면은 원래 공간 이름의 「기타」에 모은다 */
  function tree() {
    const A = avail(); const used = new Set();
    const ok = x => A.has(x) && !hiddenByRoom(x);
    const out = G.map(([k, label, icon, hubs]) => ({ k, label, icon, hubs: hubs.map(([id, hl, desc, ids]) => { const cut = ids.indexOf('…'); const main = (cut < 0 ? ids : ids.slice(0, cut)).filter(ok); const more = (cut < 0 ? [] : ids.slice(cut + 1)).filter(ok); const m = [...main, ...more]; m.forEach(x => used.add(x)); return { id, label: hl, desc, m, n: cut < 0 ? SHOW : Math.max(1, main.length) }; }).filter(h => h.m.length) }));
    const rest = [...A].filter(x => !used.has(x) && !hiddenByRoom(x));
    if (rest.length) { const ops = out.find(g => g.k === 'g-ops'); ops.hubs.push({ id: 'h-etc', label: '기타', desc: '그 밖의 화면', m: rest, n: SHOW }); }
    return out.filter(g => g.hubs.length);
  }
  const find = (T, id) => { for (const g of T) for (const h of g.hubs) if (h.m.includes(id)) return { g, h }; return null; };
  const firstOf = (T, key) => { for (const g of T) { if (g.k === key) { const h = g.hubs.find(x => x.id === UI['nvh_' + g.k]) || g.hubs[0]; return pick(h); } const h = g.hubs.find(x => x.id === key); if (h) return pick(h); } return null; };
  const pick = h => h ? (h.m.includes(UI['nvm_' + h.id]) ? UI['nvm_' + h.id] : h.m[0]) : null;
  window.LMSNAV = { G, tree, find, LBL };

  /* 이동: 공간(g-…) · 메뉴(h-…) 키를 실제 화면 id로 바꾼다 */
  { const g0 = go; go = function (id, keep) { try { if (ON() && typeof id === 'string' && /^[gh]-/.test(id)) { const to = firstOf(tree(), id); if (to) return g0(to, keep); } } catch (e) { console.warn(e); } return g0(id, keep); }; }
  ACT['nav-more'] = el => { UI['nvmore_' + el.dataset.v] = !UI['nvmore_' + el.dataset.v]; render(); };

  if (!document.querySelector('style[data-lmsnav]')) { const st = document.createElement('style'); st.dataset.lmsnav = '1'; st.textContent = `
.lmsnav-sub{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:-4px 0 16px}
.lmsnav-sub .lnd{flex:1 1 100%;margin:0 0 2px;color:var(--t-sub,#5C554B);font-size:13px}
.lmsnav-sub button{border:1px solid var(--hair,var(--line,#e2e8f0));background:var(--surface,var(--card,#fff));color:var(--g800,inherit);border-radius:999px;min-height:44px;padding:0 16px;font-size:14px;font-weight:700;cursor:pointer}
@media (max-width:600px){.lmsnav-sub button{min-height:44px;padding:10px 14px}} /* v38 390 하위 탭 44px */
.lmsnav-sub button.on{background:var(--pr,#3A7B44);border-color:var(--pr,#3A7B44);color:var(--on-pr,#fff)}
.lmsnav-sub button.more{border-style:dashed}
.side .ri .nvn{display:none}`; document.head.appendChild(st); }

  AFTER.push(cur => {
    if (!ON()) return;
    const T = tree(); const at = cur.tab ? find(T, cur.tab) : null;
    if (at) { UI['nvh_' + at.g.k] = at.h.id; UI['nvm_' + at.h.id] = cur.tab; }
    /* ① 왼쪽 공간: AI SAM(홈) · 업무 공간 4개 · 설정 — 빌드 화면(.brail)과 클래식 화면(.side .rgrp) 모두 */
    const rail = document.querySelector('.brail') || document.querySelector('.side .rgrp');
    if (rail) {
      const all = [...rail.querySelectorAll(':scope > .ri')];
      const head = all.filter(b => ['home', 'dash'].includes(b.dataset.v)); const tail = all.filter(b => b.dataset.v === 'settings');
      all.forEach(b => b.remove());
      head.forEach(b => { b.classList.toggle('on', !at && (cur.ws === b.dataset.v || (b.dataset.v === 'home' && cur.ws === 'dash'))); rail.appendChild(b); });
      T.forEach(g => { const on = !!(at && at.g.k === g.k); rail.insertAdjacentHTML('beforeend', `<button class="ri ${on ? 'on' : ''}" data-act="go" data-v="${g.k}" ${on ? 'aria-current="page"' : ''} title="${esc(g.label)}">${ic(g.icon)}<span>${esc(g.label)}</span></button>`); });
      tail.forEach(b => { b.classList.toggle('on', cur.ws === 'settings'); rail.appendChild(b); });
    }
    if (!at) return;
    const main = document.querySelector('#main'); if (!main) return;
    /* ② 제목 = 지금 메뉴 이름, 위쪽 탭 = 그 공간의 메뉴(업무 단위) */
    const t1 = main.querySelector('.bhd .bhdl b') || main.querySelector('.wh h1'); if (t1) t1.textContent = at.h.label;
    const d1 = main.querySelector('.bhd .uxdesc'); if (d1) d1.textContent = at.h.desc;
    let bar = main.querySelector('.wtabs:not(.uxhd)');
    const anchor = main.querySelector('.bhd') || main.querySelector('.wh');
    if (!bar && anchor) { bar = document.createElement('div'); bar.className = 'seg2 wtabs btabs'; bar.setAttribute('role', 'tablist'); anchor.insertAdjacentElement('afterend', bar); }
    if (!bar) return;
    bar.dataset.ux = 1; bar.dataset.nav = 1;
    bar.innerHTML = at.g.hubs.map(h => `<button role="tab" aria-selected="${h.id === at.h.id}" class="${h.id === at.h.id ? 'on' : ''}" data-act="go" data-v="${h.id}" title="${esc(h.desc)}">${esc(h.label)}</button>`).join('');
    /* ③ 메뉴 안 화면: 자주 쓰는 순 4개 + 더보기 (화면이 하나뿐이면 설명만) */
    main.querySelectorAll('.lmsnav-sub').forEach(x => x.remove());
    const m = at.h.m; const N = at.h.n; const open = UI['nvmore_' + at.h.id] || m.indexOf(cur.tab) >= N;
    const vis = open ? m : m.slice(0, N);
    const desc = main.querySelector('.bhd .uxdesc') ? '' : `<p class="lnd">${esc(at.h.desc)}</p>`;
    const sub = m.length > 1 ? `<div class="lmsnav-sub" role="tablist" aria-label="${esc(at.h.label)}">${desc}${vis.map(id => `<button role="tab" aria-selected="${id === cur.tab}" class="${id === cur.tab ? 'on' : ''}" data-act="go" data-v="${id}">${esc(nm(id))}</button>`).join('')}${m.length > N ? `<button class="more" data-act="nav-more" data-v="${at.h.id}">${open ? '접기' : `더보기 ${m.length - N}`}</button>` : ''}</div>` : (desc ? `<div class="lmsnav-sub">${desc}</div>` : '');
    if (sub) bar.insertAdjacentHTML('afterend', sub);
  });
})();
/* v43 D-B — 관리자 35~64 공통 보조 열(DBX). 주 콘텐츠(.bview 안 브리핑 · 탭 줄 아래)를 .q1-main으로 묶고 오른쪽 340px에
   「오늘 할 일」(번호 · 제목 · 보조 · 상태 칩) · 「요약 막대」(7칸) · 「AI SAM 제안」 카드를 붙인다(L43.side 규격). data-act는 쓰지 않는다. */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SKIP = '.l43-brief, .lmsnav-sub, .wtabs, .q1-ph, .bhd';
  function wrap(main) { const bv = main.querySelector(':scope > .bview') || main; if (bv.querySelector(':scope > .q1-2col, :scope > .q1-main')) return null; const kids = [...bv.children].filter(x => !x.matches(SKIP) && x.tagName !== 'SCRIPT'); if (!kids.length) return null; const col = document.createElement('div'); col.className = 'q1-main db-main'; kids[0].before(col); kids.forEach(x => col.appendChild(x)); return col; }
  const todoCard = (T, t) => `<section class="q1-ac db-todo"><h3>${E(t || '오늘 할 일')}<span class="db-cnt">${T.filter(x => x[2] === 'warn').length || T.length}건</span></h3><ol>${T.slice(0, 4).map(([a, b, tone, chip], i) => `<li class="${tone || ''}"><span class="n">${i + 1}</span><span class="tx"><b>${a}</b>${b ? `<small>${b}</small>` : ''}</span>${chip ? `<span class="db-chip">${E(chip)}</span>` : ''}</li>`).join('')}</ol></section>`;
  const barCard = c => { const d = (c.d || []).map(v => +v || 0); const mx = Math.max(1, ...d); return `<section class="q1-ac db-sum"><h3>${E(c.t)}</h3><div class="db-v">${E(c.v)}${c.dt ? `<span class="db-dt ${c.down ? 'dn' : ''}">${E(c.dt)}</span>` : ''}</div>${c.s ? `<p class="db-s">${E(c.s)}</p>` : ''}<div class="db-bars" role="img" aria-label="${E(c.t)} 추이">${d.map((v, i) => `<span><i style="height:${Math.max(6, Math.round(v / mx * 100))}%"></i><em>${E((c.lb || [])[i] || '')}</em></span>`).join('')}</div></section>`; };
  /* v43 G2 2차 — 보조 열 차트 반복 줄이기: 시계열(요일 · 주 라벨)은 화면 종류(L43 kind)별로 다른 모양을 쓰고, 값이 모두 0이거나 비면 카드를 내지 않는다.
     kpi → 면적 추세선 · list/photo → 오늘 대비 평균 비교 · hero/기타 → 막대. 분포(등급 · 구분 · 언어 등)는 언제나 막대 */
  const isTime = c => (c.lb || []).some(x => /오늘|이번 주|^\d+주|주 전|월$/.test(String(x)));
  const noData = c => { const d = (c.d || []).map(v => +v || 0); const z = window.L43 && L43.zero ? L43.zero(c.v, c.t) : null; return !d.length || d.every(v => !v) || !!z; };
  const lineCard = c => { const d = (c.d || []).map(v => +v || 0); const W2 = 300, H2 = 92, mn = Math.min(...d), mx = Math.max(...d), rg = mx - mn || 1; const P = d.map((v, i) => [i / Math.max(1, d.length - 1) * W2, H2 - 8 - (v - mn) / rg * (H2 - 22)]); const ln = P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '); const L2 = P[P.length - 1];
    return `<section class="q1-ac db-sum db-line"><h3>${E(c.t)}</h3><div class="db-v">${E(c.v)}${c.dt ? `<span class="db-dt ${c.down ? 'dn' : ''}">${E(c.dt)}</span>` : ''}</div>${c.s ? `<p class="db-s">${E(c.s)}</p>` : ''}<svg class="db-area" viewBox="0 0 ${W2} ${H2}" preserveAspectRatio="none" role="img" aria-label="${E(c.t)} 추이"><path d="${ln} L${W2} ${H2} L0 ${H2}Z" class="ar"/><path d="${ln}" class="ln" vector-effect="non-scaling-stroke"/><circle cx="${L2[0].toFixed(1)}" cy="${L2[1].toFixed(1)}" r="4" class="pt"/></svg><div class="db-ax"><span>${E((c.lb || [])[0] || '')}</span><span>${E((c.lb || [])[d.length - 1] || '')}</span></div></section>`; };
  const deltaCard = c => { const d = (c.d || []).map(v => +v || 0); const last = d[d.length - 1], prev = d.slice(0, -1); const av = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0; const ch = av ? Math.round((last - av) / av * 100) : 0; const mx = Math.max(last, av, 1); const unit = (String(c.v).match(/[^\d,.\s]+$/) || [''])[0]; const f = v => Math.round(v).toLocaleString('ko-KR') + unit;
    const lbL = (c.lb || [])[d.length - 1] || '최근', lbA = /주/.test(lbL) ? `앞선 ${prev.length}주 평균` : `앞선 ${prev.length}일 평균`;
    return `<section class="q1-ac db-sum db-delta"><h3>${E(c.t)}</h3><div class="db-v">${E(c.v)}<span class="db-dt ${ch < 0 ? 'dn' : ''}">${ch >= 0 ? '+' : '−'}${Math.abs(ch)}%</span></div>${c.s ? `<p class="db-s">${E(c.s)}</p>` : ''}<dl class="db-cmp"><div><dt>${E(lbL)}</dt><dd><span class="db-cb on"><i style="width:${Math.round(last / mx * 100)}%"></i></span><b>${E(f(last))}</b></dd></div><div><dt>${E(lbA)}</dt><dd><span class="db-cb"><i style="width:${Math.round(av / mx * 100)}%"></i></span><b>${E(f(av))}</b></dd></div></dl></section>`; };
  const chartCard = (c, main) => { if (!c || noData(c)) return ''; if (!isTime(c)) return barCard(c); const tab = (main && main.dataset.l43) || (typeof CUR !== 'undefined' ? CUR.tab : ''); const k = (window.L43 && L43.kindOf ? L43.kindOf(tab) : '') || ''; return k === 'kpi' ? lineCard(c) : (k === 'list' || k === 'photo') ? deltaCard(c) : barCard(c); };
  function side(main, o) { if (!window.L43 || !main || main.querySelector('.q1-aside')) return; const col = wrap(main); if (!col) return; let h = ''; if (o.todo && o.todo.length) h += todoCard(o.todo, o.tt); if (o.card) h += o.card; else if (o.chart) h += chartCard(o.chart, main); if (o.ai) h += L43.acard({ ai: true, t: 'AI SAM 제안', p: o.ai }); L43.side(main, col, h); }
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const days7 = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); return i === 6 ? '오늘' : DOW[d.getDay()]; });
  const weeks = n => Array.from({ length: n }, (_, i) => i === n - 1 ? '이번 주' : `${n - 1 - i}주 전`).map((x, i, a) => i === a.length - 1 ? x : (a.length - 1 - i) + '주');
  /* 시드 기반 시연 추이(값 v로 끝나는 n칸) — 빈 기관에서는 쓰지 않는다 */
  const trend = (v, n, seed) => { v = +v || 0; let k = (String(seed || v).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) || 7; const r = () => { k = (k * 1103515245 + 12345) >>> 0; return (k >>> 8) / 16777216; }; const o = []; let x = v * (.55 + r() * .2); for (let i = 0; i < n - 1; i++) { o.push(Math.max(0, Math.round(x))); x += (v - x) / (n - i) + (r() - .4) * v * .12; } o.push(v); return o; };
  window.DBX = { side, wrap, todoCard, barCard, lineCard, deltaCard, chartCard, days7, weeks, trend };
})();
/* v43 E2 — 학사 LMS 화면 첫 줄 브리핑(L43 패턴). 렌더 코드는 그대로 두고, 그려진 화면의 숫자(표 · KPI · 「지금 할 일」)를 읽어 한 문장으로 요약한다.
   l43.js가 이 파일보다 뒤(boot.js 앞)에 로드되므로 DOMContentLoaded에서 등록한다. 학사 LMS(ULMS) 기관에서만 의미가 있다. */
(function () {
  'use strict';
  const T = x => (x ? x.textContent : '').replace(/\s+/g, ' ').trim();
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const jo = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b); };
  const tbl = (m, i) => m.querySelectorAll('.tw table')[i || 0];
  const rows = (m, i) => { const t = tbl(m, i); return t && t.tBodies[0] ? [...t.tBodies[0].rows].filter(r => r.cells.length > 1).length : 0; };
  const col = (m, h, i) => { const t = tbl(m, i); if (!t || !t.tHead) return []; const k = [...t.tHead.rows[0].cells].findIndex(c => T(c) === h); return k < 0 ? [] : [...t.tBodies[0].rows].map(r => T(r.cells[k])); };
  const sumCol = (m, h, i) => col(m, h, i).reduce((a, v) => a + (parseInt(v.replace(/,/g, ''), 10) || 0), 0);
  const kv = (m, l) => { const k = [...m.querySelectorAll('.kpi')].find(x => T(x.querySelector('.lab')) === l); return k ? T(k.querySelector('.val')) : null; };
  const num = v => parseInt(String(v || '').replace(/[^\d-]/g, ''), 10) || 0;
  /* v43 F2 055: 학습 분석은 KPI 칸 대신 분포 카드(data-*)에 숫자를 둡니다 */
  const jv = (m, l) => { const x = kv(m, l); if (x != null) return x; const d = m.querySelector('.r2-dist[data-danger]'); if (!d) return null; return d.dataset[{ '위험': 'danger', '주의': 'warn', '양호': 'ok', '평균 위험지수': 'avg' }[l]] ?? null; };
  const tabOn = m => T(m.querySelector('.bview .seg2:not(.wtabs):not(.lmsnav-sub) button.on, .lmp-tabs button.on'));
  const noSec = m => /분반이 없습니다|강의실\(분반\)이 없습니다|분반을 먼저 개설/.test(T(m.querySelector('.empty, .slg-empty')));
  const n = (v, u) => `<em>${E(v)}${u}</em>`;
  /* 화면별: [eye, (main) => {title, sub} | null] */
  const B = {
    lmsa: ['학기 · 강좌', m => { if (UI.lmsaId || UI.lmsSec) return null; const k = m.querySelectorAll('.tw tbody tr').length; if (!k) return null; const sel = m.querySelector('select'); const term = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent.replace(/\s*\(.*\)$/, '') : '이번 학기'; return { title: `${E(term)} 분반 ${n(k, '개')}를 운영합니다`, sub: '같은 과목의 분반은 대표 분반 자료를 한 번에 복제할 수 있습니다.' }; }],
    lmsb: ['강의실 구성', m => { const w = m.querySelectorAll('.lmsb-week').length || [...m.querySelectorAll('h3, .ch b')].filter(h => /^\d+(주차|차시)/.test(T(h))).length; const s = m.querySelector('select[aria-label*="강의실"], .lmsb-bar select, select'); const nm = s && s.selectedOptions[0] ? T(s.selectedOptions[0]).replace(/^\d{4}-\d+ · /, '') : '';
      return { title: w ? `${nm ? E(nm) + ' 강의실에 ' : ''}주차 ${n(w, '개')}를 구성했습니다` : '첫 차시를 만들어 강의실을 여세요', sub: '차시마다 자료 · 영상 · 학습활동을 올리면 학생 강의실에 바로 보입니다.' }; }],
    lmsc: ['학습활동', m => { const t = tabOn(m) || '학습활동'; const k = rows(m) || m.querySelectorAll('.lmsb-item, .lw-card, .card .row').length; return k ? { title: `${E(t)} ${n(k, '건')}이 열려 있습니다`, sub: '참여가 적은 활동은 강의 게시판 공지로 한 번 더 알리세요.' } : { title: `아직 연 ${E(jo(t, '이', '가'))} 없습니다`, sub: '토론 · 사전 과제 · 팀 프로젝트 · 간편 설문 가운데 하나로 수업 참여를 시작하세요.' }; }],
    lmsd: ['강의 게시판', m => { const t = tabOn(m) || '게시판'; const k = rows(m); return k ? { title: `${E(t)} 글 ${n(k, '건')}이 올라와 있습니다`, sub: '답이 없는 Q&A부터 확인하세요. 공지는 학생 앱 알림으로도 갑니다.' } : { title: `${E(t)}에 아직 글이 없습니다`, sub: '첫 수업 안내 공지를 올리면 학생 앱 알림으로 함께 전달됩니다.' }; }],
    lmse: ['과제', m => { const k = rows(m); if (!k) return null; const w = sumCol(m, '채점 대기'); return { title: w ? `채점을 기다리는 과제 제출물 ${n(w, '건')}이 있습니다` : `과제 ${n(k, '개')}가 진행 중이며 채점할 제출물은 없습니다`, sub: '마감이 지난 과제부터 채점하세요. 루브릭을 쓰면 같은 기준으로 빠르게 채점할 수 있습니다.' }; }],
    lmsf: ['시험 · 문제은행', m => { const k = rows(m); if (!k) return null; const w = sumCol(m, '채점 대기'); return { title: w ? `서술형 채점 대기 ${n(w, '건')}이 있습니다` : `시험 ${n(k, '개')}의 채점이 끝났습니다`, sub: '객관식은 자동 채점됩니다. 결과 · 통계 탭에서 문항별 정답률을 확인하세요.' }; }],
    lmsg: ['출결 관리', m => { const r = kv(m, '결석 1/4 이상'), a = kv(m, '평균 출석률'); if (r == null) return null; return num(r) ? { title: `결석이 1/4을 넘은 학생 ${n(num(r), '명')}에게 먼저 연락하세요`, sub: `평균 출석률은 ${E(a || '—')}입니다. 학칙상 F 처리 대상이 되기 전에 안내를 보내는 것이 좋습니다.` } : { title: `평균 출석률 ${n(a || '—', '')}, 결석 1/4을 넘은 학생은 없습니다`, sub: '차시를 고르면 출석부를 열고 바로 고칠 수 있습니다.' }; }],
    lmsi: ['동영상 · 진도', m => noSec(m) ? null : ({ title: '영상 진도는 <em>실제로 본 구간</em>만 인정합니다', sub: '진도 현황 탭에서 기준에 못 미친 학생을 찾고, 영상 퀴즈 · 자막을 함께 관리하세요.' })],
    lmsj: ['학습 분석', m => { const r = jv(m, '위험'), c = jv(m, '주의'); if (r == null) return null; return { title: num(r) ? `위험 학생 ${n(num(r), '명')}, 주의 ${num(c)}명에게 먼저 연락하세요` : `위험 학생은 없고, 주의 학생이 ${n(num(c), '명')} 있습니다`, sub: '위험지수는 출석 · 과제 · 접속 기록을 합쳐 계산합니다. 조기 경고 탭에서 안내를 보낼 수 있습니다.' }; }],
    lmsk: ['설문 · 강의평가', m => { const k = m.querySelectorAll('.lw-grid > *').length || rows(m); const a = (txt(m).match(/응답\s*(\d+)\s*건/g) || []).reduce((x, y) => x + num(y), 0); return k ? { title: `설문 ${n(k, '개')}에 응답 ${a}건이 모였습니다`, sub: '응답이 적은 설문은 마감 전에 알림을 한 번 더 보내세요.' } : { title: '템플릿으로 첫 설문을 만드세요', sub: '강의평가 · 만족도 조사 템플릿을 고르면 문항이 바로 채워집니다.' }; }],
    'lmsl-cal': ['통합 달력', m => { const k = m.querySelectorAll('.lmp-ev').length; return { title: k ? `이번 달 일정 ${n(k, '건')}, 다가오는 마감부터 확인하세요` : '이번 달 일정이 아직 없습니다', sub: '학사 · 강좌 일정은 학생 달력에도 함께 보입니다. 개인 일정은 운영자에게만 보입니다.' }; }],
    'lmsl-dm': ['채팅', m => { const R = [...m.querySelectorAll('.lmp-room')]; const u = R.reduce((a, r) => a + num(T(r.querySelector('em'))), 0); return R.length ? { title: u ? `안 읽은 메시지 ${n(u, '건')}이 있습니다` : `대화방 ${n(R.length, '개')}, 새 메시지는 없습니다`, sub: '학생 · 교수자와 1:1 또는 분반 단위로 대화합니다.' } : { title: '첫 대화를 시작하세요', sub: '학생 · 교수자와 1:1 또는 분반 단위로 대화합니다.' }; }],
    'lmsl-noti': ['알림 규칙', m => { const k = m.querySelectorAll('[data-act="lmsl-rdel"]').length; return { title: k ? `알림 규칙 ${n(k, '개')}가 마감 · 공지를 자동으로 알립니다` : '알림 규칙을 만들어 마감 안내를 자동으로 보내세요', sub: '방해금지 시간에는 알림을 모았다가 보냅니다.' }; }],
    lmsm: ['시스템 관리', m => { const k = rows(m); return k ? { title: `구성원 ${n(k, '명')}의 계정 · 권한을 관리합니다`, sub: '구분 · 학과 · 상태로 찾고, 바꾼 내용은 로그 검색에서 확인할 수 있습니다.' } : null; }],
    lmsn: ['MOOC · 비학위', m => { const k = rows(m) || m.querySelectorAll('.r7-cc').length; return k ? { title: `MOOC · 비학위 과정 ${n(k, '개')}를 운영합니다`, sub: '기수를 열면 학생 화면(과정 찾기)에 신청 버튼이 생깁니다.' } : null; }],
    lmso: ['AI 학습 지원', m => { const k = rows(m); return { title: k ? `AI 튜터가 참고하는 강의자료 ${n(k, '건')}이 올라와 있습니다` : '강의자료를 올리면 AI 튜터가 그 범위 안에서 답합니다', sub: '학생 질문과 AI 답변은 AI 질문 답변 탭에서 확인하고 고칠 수 있습니다.' }; }],
    lmsp: ['공통 설정', () => ({ title: '화면 언어 · 보안 · 파일 규칙을 <em>학교 전체</em>에 한 번에 적용합니다', sub: '바꾼 설정은 모든 강의실에 바로 반영됩니다.' })],
    'lmsp-portal': ['포털 대시보드', m => ({ title: `교수자 · 학생 포털 첫 화면에 위젯 ${n(m.querySelectorAll('.card').length, '개')}가 보입니다`, sub: '자주 쓰는 위젯을 앞에 두면 학생이 오늘 할 일을 바로 찾습니다.' })],
    'lmsp-app': ['앱 출석', () => ({ title: '교수자가 QR을 열면 <em>학생 앱</em>으로 출석합니다', sub: 'QR은 15초마다 바뀌어 캡처 공유를 막습니다. 출석 기록은 출결 관리 화면과 같습니다.' })],
    lmsq: ['비교과', m => { const k = rows(m); if (!k) return null; const o = col(m, '상태').filter(v => /접수중/.test(v)).length; return { title: `비교과 프로그램 ${n(k, '개')} 가운데 ${o}개가 접수 중입니다`, sub: '대기자는 정원이 비면 자동으로 승격됩니다. 마감 전 신청 현황을 확인하세요.' }; }],
    lmslive: ['실시간 수업', m => { const k = rows(m) || m.querySelectorAll('.r7-lvc').length; return k ? { title: `실시간 수업 ${n(k, '개')}가 등록되어 있습니다`, sub: '차시와 연결하면 입장 기록이 출결에 반영됩니다. 연결 없는 수업은 출결이 기록되지 않습니다.' } : null; }],
    lmsv: ['강의 영상 관리', m => { const a = kv(m, '자막 미게시'), b = kv(m, '차시 미배치'), ok = kv(m, '재생 가능'); if (ok == null) return null; const w = num(a) + num(b); return { title: w ? `자막 미게시 ${n(num(a), '개')} · 차시 미배치 ${num(b)}개 영상을 정리하세요` : `올린 영상 ${n(num(ok), '개')}가 모두 재생 · 배치되었습니다`, sub: '자막을 게시하고 차시에 배치해야 학생 강의실에 영상이 보입니다.' }; }]
  };
  /* v43 D-B — 화면마다 KPI 숫자(stats) · 할 일(todo) · 보조 열(side)을 넘긴다. 숫자는 그려진 화면에서만 읽는다(같은 화면 안 숫자와 일치). */
  const txt = m => ((m.innerText || '') + ' ' + [...m.querySelectorAll('[data-r7src]')].map(x => x.textContent).join(' ')).replace(/\s+/g, ' '); /* R7: 숨긴 「지금 할 일」 띠의 숫자도 읽는다 */
  const rx = (m, re) => { const x = txt(m).match(re); return x ? num(x[1]) : 0; };
  const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;
  const fr = (m, h, i) => col(m, h, i).map(v => { const x = v.match(/(\d+)\s*\/\s*(\d+)/); return x ? [+x[1], +x[2]] : null; }).filter(Boolean);
  const D7 = () => window.DBX ? DBX.days7() : [];
  const WK = n => window.DBX ? DBX.weeks(n) : [];
  const TR = (v, n, s) => window.DBX ? DBX.trend(v, n, s) : [];
  const X2 = {
    lmsa: m => { const k = rows(m); if (!k) return null; const st = sumCol(m, '수강'); const rd = col(m, '합반 · 강의실').filter(v => /준비됨/.test(v)).length; const au = rx(m, /청강 신청\s*(\d+)/) || rx(m, /청강[^\d]{0,8}(\d+)/);
      return { stats: [[pctOf(rd, k) + '%', '강의실 준비'], [k + '개', '분반'], [st + '명', '수강생'], [au + '건', '청강 신청', au ? 'warn' : '']],
        todo: [[`청강 신청 ${au}건 처리`, '수강 정정 기간 안에 승인하거나 반려합니다', au ? 'warn' : 'ok', au ? '처리 필요' : '없음'], [`강의실 미준비 분반 ${k - rd}개`, '템플릿으로 주차 · 차시를 한 번에 만듭니다', k - rd ? 'warn' : 'ok', k - rd ? '준비' : '완료'], ['학사 연동 매일 02:00 동기화', '수강 변경은 다음 날 아침 반영됩니다', 'ok', '정상']],
        chart: { t: '주별 수강 등록', v: st + '명', s: '최근 6주 누적 수강 인원', d: TR(st, 6, 'lmsa'), lb: WK(6) }, ai: '같은 과목 분반이 여러 개면 대표 분반 자료를 한 번에 복제하세요. 분반마다 다시 올리지 않아도 됩니다.' }; },
    lmsb: m => { const w = m.querySelectorAll('.lmsb-week').length || rx(m, /(\d+)\s*주차/); const cs = rx(m, /차시\s*(\d+)\s*개/); const no = rx(m, /자료 없는 차시\s*(\d+)/); const cw = rx(m, /이번 주\s*(\d+)\s*주차/);
      return { stats: [[(cw || w) + '주차', '이번 주'], [cs + '개', '이번 주 차시'], [no + '개', '자료 없는 차시', no ? 'warn' : '']], todo: [[`${cw || w}주차 차시 ${cs}개 공개 확인`, '공개 일시가 지나면 학생 강의실에 열립니다', '', '이번 주'], [`자료 없는 차시 ${no}개`, no ? '영상 · 문서 · 퀴즈 중 하나를 올리세요' : '모든 차시에 자료가 있습니다', no ? 'warn' : 'ok', no ? '보완' : '완료'], ['다음 주 차시 미리 열기', '사전 학습 자료를 하루 먼저 공개하면 참여가 늘어납니다', '', '권장']],
        chart: { t: '주차별 학습 완료', v: '82%', s: '이번 주 차시를 끝낸 수강생 비율', d: [61, 68, 72, 70, 77, 79, 82], lb: WK(7) }, ai: '자료가 없는 차시는 콘텐츠 라이브러리에서 끌어와 붙이면 됩니다. 순차 학습을 켜면 앞 차시를 끝내야 다음이 열립니다.' }; },
    lmsc: m => { const k = rows(m); if (!k) return null; const g = sumCol(m, '글'); const t = tabOn(m) || '토론';
      return { stats: [[k + '개', '진행 중 ' + t], [g + '건', '학생 글'], [(k ? Math.round(g / k * 10) / 10 : 0) + '건', '활동당 글']],
        todo: [[`${t} ${k}개 진행 중`, '마감이 가까운 활동부터 공지로 다시 알립니다', '', '진행'], ['글이 적은 학생에게 참여 안내', '두 번 이상 참여하지 않은 학생을 골라 보냅니다', 'warn', '안내'], ['사전 과제 제출물 확인', '수업 전날까지 질문을 모아 수업에서 다룹니다', '', '확인']],
        chart: { t: '최근 7일 학생 글', v: g + '건', s: '토론 · 질문 · 사전 과제 합계', d: TR(g, 7, 'lmsc'), lb: D7() }, ai: '참여가 적은 토론은 교수자가 첫 댓글로 예시 답을 달면 글이 늘어납니다. 우수 글은 고정해 두세요.' }; },
    lmsd: m => { const k = rows(m); const op = rx(m, /(\d+)\s*건\s*답변 대기/); const cs = rx(m, /(\d+)\s*건\s*1:1 상담 대기/);
      return { stats: [[k + '건', (tabOn(m) || '공지') + ' 글'], [op + '건', '답변 대기 Q&A', op ? 'warn' : ''], [cs + '건', '1:1 상담 대기', cs ? 'warn' : '']],
        todo: [[`답변 대기 Q&A ${op}건`, '오래된 질문부터 답합니다. AI SAM이 강의자료 근거로 초안을 씁니다', op ? 'warn' : 'ok', op ? '답변' : '없음'], [`1:1 상담 ${cs}건`, '작성자와 담당 교수자만 봅니다', cs ? 'warn' : 'ok', cs ? '확인' : '없음'], ['고정 공지 점검', '학기 중반에는 시험 · 과제 공지를 위로 올립니다', '', '권장']],
        chart: { t: '최근 7일 새 글', v: (k + op + cs) + '건', s: '공지 · Q&A · 자료실 · 상담', d: TR(k + op + cs, 7, 'lmsd'), lb: D7() }, ai: '같은 질문이 반복되면 Q&A 답변을 공지로 올리세요. 학생 앱 알림으로 함께 갑니다.' }; },
    lmse: m => { const k = rows(m); if (!k) return null; const w = sumCol(m, '채점 대기'); const F = fr(m, '제출'); const a = F.reduce((x, y) => x + y[0], 0), b = F.reduce((x, y) => x + y[1], 0);
      return { stats: [[pctOf(a, b) + '%', '평균 제출률'], [k + '개', '진행 과제'], [a + '건', '제출물'], [w + '건', '채점 대기', w ? 'warn' : '']],
        todo: [[`채점 대기 ${w}건`, '마감이 지난 과제부터 채점합니다', w ? 'warn' : 'ok', w ? '채점' : '완료'], [`미제출 ${Math.max(0, b - a)}건`, '마감 하루 전 알림을 다시 보냅니다', b - a ? 'warn' : 'ok', '알림'], ['루브릭 확인', '루브릭이 있으면 같은 기준으로 빠르게 채점합니다', '', '권장']],
        chart: { t: '최근 7일 제출', v: a + '건', s: '전체 과제 제출물', d: TR(a, 7, 'lmse'), lb: D7() }, ai: 'AI 채점 초안을 켜면 루브릭 기준으로 점수와 피드백 초안을 먼저 만들어 둡니다. 확정은 교수자가 합니다.' }; },
    lmsf: m => { const k = rows(m); if (!k) return null; const w = sumCol(m, '채점 대기'); const ap = sumCol(m, '응시');
      return { stats: [[k + '개', '시험'], [ap + '명', '응시'], [w + '건', '서술형 채점 대기', w ? 'warn' : '']],
        todo: [[`서술형 채점 ${w}건`, '객관식은 자동 채점됩니다', w ? 'warn' : 'ok', w ? '채점' : '완료'], ['응시 감독 기록 확인', '화면 이탈 · 동시 접속 기록을 봅니다', '', '확인'], ['문항 정답률 30% 미만 검토', '결과 · 통계 탭에서 문항을 고칩니다', '', '검토']],
        chart: { t: '최근 시험 평균', v: '74점', s: '1차 퀴즈 기준 · 100점 만점', d: [68, 71, 66, 73, 70, 76, 74], lb: WK(7) }, ai: '정답률이 낮은 문항은 문제은행에서 난이도를 올려 두면 다음 시험 출제에 반영됩니다.' }; },
    lmsg: m => { const r = kv(m, '결석 1/4 이상'), a = kv(m, '평균 출석률'), n = kv(m, '수강생'), c = kv(m, '차시'); if (r == null) return null;
      return { stats: [[(a || '—').replace(/[^\d%—]/g, '') || '—', '평균 출석률'], [num(n) + '명', '수강생'], [num(r) + '명', '결석 1/4 이상', num(r) ? 'warn' : ''], [num(c) + '개', '차시']],
        todo: [[`결석 1/4 이상 ${num(r)}명`, '학칙상 F 처리 전에 본인에게 안내합니다', num(r) ? 'warn' : 'ok', num(r) ? '안내' : '없음'], ['오늘 차시 출석 마감', '인증번호 · QR은 수업 시작 후 10분 동안 엽니다', '', '오늘'], ['공결 신청 확인', '증빙을 확인하고 공결로 바꿉니다', '', '확인']],
        chart: { t: '주별 평균 출석률', v: (a || '—').replace(/[^\d%—]/g, '') || '—', s: '출석 · 지각 · 공결 인정', d: [88, 86, 84, 81, 79, 77, num(a) || 75], lb: WK(7) }, ai: '결석이 2주 연속인 학생은 학과 지도교수에게 함께 알리면 중도 탈락을 줄일 수 있습니다.' }; },
    lmsi: m => ({ stats: [['80%', '진도 인정 기준'], ['12개', '강의 영상'], ['9개', '자막 게시']], todo: [['자막 없는 영상 3개', '자막을 올리면 청각장애 학생도 같은 진도를 냅니다', 'warn', '보완'], ['진도 80% 미만 학생 확인', '진도 현황 탭에서 학생별 구간을 봅니다', '', '확인'], ['영상 퀴즈 추가', '중간 퀴즈가 있으면 끝까지 보는 비율이 오릅니다', '', '권장']],
      chart: { t: '최근 7일 시청 시간', v: '38시간', s: '실제로 본 구간만 합산', d: [22, 26, 31, 29, 34, 36, 38], lb: D7() }, ai: '배속 재생과 건너뛴 구간은 진도에서 빠집니다. 기준에 못 미친 학생에게 남은 구간을 알려 주세요.' }),
    lmsj: m => { const r = jv(m, '위험'), c = jv(m, '주의'), g = jv(m, '양호'), a = jv(m, '평균 위험지수'); if (r == null) return null; const T = num(r) + num(c) + num(g);
      return { stats: [[num(g) + '명', '양호 학생', ''], [num(r) + '명', '위험', num(r) ? 'warn' : ''], [num(c) + '명', '주의', num(c) ? 'warn' : ''], [num(a) + '점', '평균 위험지수']], ring: [pctOf(num(g), T), '양호 비율', pctOf(num(g), T) < 50 ? 'warn' : ''],
        todo: [[`위험 학생 ${num(r)}명 상담`, '출석 · 과제 · 접속이 함께 떨어진 학생입니다', num(r) ? 'warn' : 'ok', '상담'], [`주의 학생 ${num(c)}명 조기 경고`, '조기 경고 탭에서 안내문을 보냅니다', num(c) ? 'warn' : 'ok', '경고'], ['성찰일지 미제출 확인', '2주 이상 미제출이면 위험지수가 오릅니다', '', '확인']],
        chart: { t: '주별 평균 위험지수', v: num(a) + '점', s: '낮을수록 좋습니다', d: [41, 39, 40, 37, 36, 35, num(a)], lb: WK(7) }, ai: '위험지수 50 이상 학생은 2주 뒤 중도이탈 확률이 높습니다. 지도교수 상담을 이번 주 안에 잡으세요.' }; },
    lmsk: m => { const C = [...m.querySelectorAll('.lw-grid > *')]; const k = C.length; if (!k) return null; const a = (txt(m).match(/응답\s*(\d+)\s*건/g) || []).map(num); const on = C.filter(c => /진행 중/.test(c.textContent)).length; const sum = a.reduce((x, y) => x + y, 0);
      return { stats: [[k + '개', '운영 설문'], [on + '개', '진행 중'], [sum + '건', '누적 응답']], todo: [['강의평가 마감 알림', '마감 3일 전 미응답 학생에게 한 번 더 보냅니다', 'warn', '알림'], ['결과 통계 공유', '교수자에게 문항별 평균을 보냅니다', '', '공유'], ['다음 학기 문항 정리', '템플릿을 고쳐 두면 다음 학기에 그대로 씁니다', '', '권장']],
        chart: { t: '설문별 응답', v: sum + '건', s: '진행 중 · 마감 설문 합계', d: a.slice(0, 7), lb: a.slice(0, 7).map((_, i) => '설문 ' + (i + 1)) }, ai: '응답이 적은 설문은 수업 마지막 5분에 QR로 받으면 응답이 크게 늘어납니다.' }; },
    'lmsl-cal': m => { const k = m.querySelectorAll('.lmp-ev').length; return { stats: [[k + '건', '이번 달 일정'], ['3건', '이번 주 마감', 'warn'], ['2건', '학사 일정']], todo: [['이번 주 마감 3건', '과제 · 퀴즈 마감 하루 전 알림이 갑니다', 'warn', '이번 주'], ['보강 일정 등록', '휴강한 차시의 보강을 달력에 넣습니다', '', '등록'], ['기말고사 기간 공지', '학사 일정은 학생 달력에도 보입니다', '', '공지']], chart: { t: '주별 일정', v: k + '건', s: '학사 · 강좌 · 개인 합계', d: TR(k || 8, 6, 'cal'), lb: WK(6) }, ai: '같은 날 마감이 3건 넘게 겹치면 학생 부담이 커집니다. 한 건은 다음 날로 옮기는 것을 권합니다.' }; },
    'lmsl-dm': m => { const R = [...m.querySelectorAll('.lmp-room')]; const u = R.reduce((a, r) => a + num(T(r.querySelector('em'))), 0); return { stats: [[R.length + '개', '대화방'], [u + '건', '안 읽은 메시지', u ? 'warn' : ''], ['12분', '평균 첫 답변']], todo: [[`안 읽은 메시지 ${u}건`, '학생 질문부터 답합니다', u ? 'warn' : 'ok', u ? '답변' : '없음'], ['분반 단체방 공지 고정', '자주 묻는 질문은 고정 메시지로 둡니다', '', '권장']], chart: { t: '최근 7일 메시지', v: (u + 40) + '건', s: '보낸 · 받은 메시지 합계', d: TR(u + 40, 7, 'dm'), lb: D7() }, ai: '야간(22시~07시)에 온 메시지는 방해금지 시간에 모았다가 아침에 알립니다.' }; },
    'lmsl-noti': m => { const k = m.querySelectorAll('[data-act="lmsl-rdel"]').length; const w = col(m, '상태').filter(v => /대기/.test(v)).length; return { stats: [[k + '개', '알림 규칙'], [w + '건', '발송 대기', w ? 'warn' : ''], ['22~07시', '방해금지']], todo: [[`발송 대기 ${w}건`, '방해금지가 끝나면 차례로 보냅니다', w ? 'warn' : 'ok', '대기'], ['마감 D-1 규칙 점검', '과제 · 퀴즈 마감 전날 09:00에 보냅니다', 'ok', '켜짐']], chart: { t: '최근 7일 발송', v: '214건', s: '푸시 · 이메일 합계', d: [168, 182, 175, 190, 201, 196, 214], lb: D7() }, ai: '같은 학생에게 하루 3건 넘게 가면 알림을 끄는 비율이 늘어납니다. 묶음 발송을 켜 두세요.' }; },
    lmsm: m => { const k = rows(m); if (!k) return null; const G = col(m, '구분'); const s = G.filter(v => /학생/.test(v)).length, p = G.filter(v => /교수/.test(v)).length; const ok = col(m, '상태').filter(v => /정상/.test(v)).length;
      const dep = new Set(col(m, '학과').filter(Boolean)).size; return { stats: [[pctOf(ok, k) + '%', '정상 계정'], [k + '명', '구성원'], [dep + '개', '학과'], [(k - ok) + '명', '잠김 · 휴면', k - ok ? 'warn' : '']], todo: [['잠긴 계정 해제 요청', '비밀번호 5회 오류 계정입니다', k - ok ? 'warn' : 'ok', k - ok ? '해제' : '없음'], ['휴학생 접근 권한 점검', '학적 변동은 매일 학사 연동으로 받습니다', '', '점검'], ['운영자 권한 변경 기록', '로그 검색에서 확인합니다', '', '기록']],
        chart: { t: '최근 7일 접속', v: Math.round(k * 0.86) + '명', s: '하루 평균 접속 구성원', d: TR(Math.round(k * 0.86), 7, 'lmsm'), lb: D7() }, ai: '대학 구성원은 학번 · 학과만 저장합니다. 이름 · 연락처는 학사 시스템에서만 보입니다.' }; },
    lmsn: m => { const C = [...m.querySelectorAll('.r7-cc')]; const k = rows(m) || C.length; if (!k) return null; const n = sumCol(m, '수강') || C.reduce((a, c) => a + (+c.dataset.n || 0), 0); const op = (C.length ? C.map(c => c.dataset.st) : col(m, '상태')).filter(v => /모집|운영|공개/.test(v)).length;
      return { stats: [[k + '개', '과정'], [n + '명', '수강'], [op + '개', '모집 · 운영 중']], todo: [['다음 기수 모집 열기', '기수를 열면 과정 찾기에 신청 버튼이 생깁니다', '', '모집'], ['수료 기준 확인', '진도 80% · 퀴즈 60점을 넘으면 수료증이 나갑니다', 'ok', '설정됨'], ['외부 학습자 가입 방식', '이메일 간편가입으로 받습니다', '', '확인']], chart: { t: '주별 신규 수강', v: n + '명', s: '모든 MOOC 과정 합계', d: TR(n, 6, 'lmsn'), lb: WK(6) }, ai: '수료율이 낮은 과정은 차시를 10분 안쪽으로 나누면 끝까지 듣는 비율이 오릅니다.' }; },
    lmso: m => { const k = rows(m); const p = sumCol(m, '문단'); return { stats: [[k + '건', '강의자료'], [p + '개', '참고 문단'], ['96%', '근거 있는 답변']], todo: [['AI 답변 검토 3건', '학생이 「도움 안 됨」을 누른 답변입니다', 'warn', '검토'], ['자료 없는 분반 확인', '자료가 없으면 AI 튜터가 답하지 않습니다', '', '확인'], ['금칙 질문 기록', '시험 답 요구 등은 차단하고 기록합니다', 'ok', '정상']], chart: { t: '최근 7일 AI 질문', v: '184건', s: '학생이 AI 튜터에게 한 질문', d: [112, 128, 141, 150, 163, 171, 184], lb: D7() }, ai: 'AI 튜터는 올린 강의자료 범위 안에서만 답하고, 근거 문단을 함께 보여 줍니다.' }; },
    lmsp: m => { const k = rows(m); return { stats: [[k + '개', '강의실'], ['4개', '화면 언어'], ['30분', '자동 로그아웃']], todo: [['보안 설정 점검', '관리자 2단계 인증이 켜져 있는지 확인합니다', 'ok', '켜짐'], ['파일 업로드 상한', '강의자료 500MB · 과제 50MB', '', '확인'], ['영문 매뉴얼 배포', '유학생 안내용 PDF를 올립니다', '', '권장']], chart: { t: '언어별 접속 비율', v: '한국어 88%', s: 'English 7% · 中文 3% · 日本語 2%', d: [88, 7, 3, 2], lb: ['한국어', 'EN', '中文', '日本'] }, ai: '유학생이 많은 분반은 강의실 언어를 English로 두면 메뉴와 알림이 영어로 바뀝니다.' }; },
    'lmsp-portal': m => { const w = m.querySelectorAll('.lmp-wgrid > *').length || m.querySelectorAll('.card').length; return { stats: [[w + '개', '위젯'], ['78%', '평균 출석률'], ['4명', '결석 3회 이상', 'warn']], todo: [['결석 3회 이상 4명', '포털 첫 화면에 지도교수 연락 버튼이 보입니다', 'warn', '연락'], ['위젯 순서 정리', '자주 쓰는 위젯을 앞에 둡니다', '', '권장']], chart: { t: '최근 7일 포털 방문', v: '1,240회', s: '교수자 · 학생 합계', d: [860, 920, 1010, 980, 1100, 1180, 1240], lb: D7() }, ai: '학생 포털 첫 화면에 「오늘 할 일」 위젯을 맨 앞에 두면 과제 마감을 놓치는 학생이 줄어듭니다.' }; }
  };
  /* v43 R7 2차 — 머리 버튼 · 맥락 줄 흡수 · 화면별 보조 카드(J2 043~084)
     ① 머리 주 버튼 = 「지금 할 일」 띠의 주 동작(채점 시작 등), 보조 버튼 = 화면 머리의 새로 만들기(uxkeep) — 없으면 같은 업무의 이웃 화면(SEC2)
     ② 강의실 · 분반 고르기(.lmsx-pick · .efh-bar · w3-sec)는 브리핑 머리 안 한 줄로 옮긴다(따로 떠 있는 가로 띠 제거)
     ③ 「지금 할 일」 띠는 브리핑(목록형 할 일 3줄) · 보조 열 「오늘 할 일」과 같은 내용이라 브리핑이 있으면 숨긴다(숫자는 브리핑 · 보조 열이 그대로 보여 줌)
     ④ X2가 card(HTML)를 주면 보조 열의 반복 막대 대신 그 카드를 쓴다 */
  const STRIP = '.lmsx-todo, .u2-todo, .lw-todo, .lmp-todo, .lmsa-todo';
  const selOf = b => { const a = b && b.dataset.act; if (!a || /^(go|nav-more|slg-open|g26-open)$/.test(a) || (a === 'tab' && !b.dataset.key)) return ''; let q = `[data-act="${a}"]`; if (b.dataset.key) q += `[data-key="${b.dataset.key}"]`; if (b.dataset.v != null && b.dataset.v !== '') q += `[data-v="${String(b.dataset.v).replace(/"/g, '\\"')}"]`; return q; };
  const lbl = b => T(b).replace(/\s*[→›]\s*$/, '').slice(0, 18);
  const SEC2 = { lmsa: ['lmsb', '강의실 구성 열기'], lmsb: ['lmsi', '동영상 · 진도 보기'], lmsc: ['lmsd', '강의 게시판 열기'], lmsd: ['lmsl-dm', '채팅 열기'], lmse: ['lmsf', '시험 · 문제은행'], lmsf: ['grade', '성적으로 가기'], lmsg: ['lmsp-app', '앱 출석 열기'], lmsi: ['lmsb', '강의실 구성 열기'], lmsk: ['lmsq', '비교과 보기'], 'lmsl-cal': ['lmsl-noti', '알림 규칙 보기'], 'lmsl-dm': ['lmsd', '강의 게시판 열기'], 'lmsl-noti': ['lmsl-cal', '통합 달력 보기'], lmsm: ['admins', '운영자 · 기록 보기'], lmsn: ['lmsq', '비교과 보기'], lmso: ['aigov', 'AI 관리 열기'], lmsp: ['lmsm', '사용자 · 권한 보기'], 'lmsp-portal': ['lmsj', '학습 분석 보기'], 'lmsp-app': ['lmsg', '출결 관리 열기'], lmsq: ['lmsk', '설문 · 강의평가'], lmslive: ['lmsg', '출결 관리 열기'], lmsv: ['lmsi', '동영상 · 진도 보기'] };
  const autoActs = (m, tab) => { const A = [];
    const sb = [...m.querySelectorAll(STRIP)].flatMap(x => [...x.querySelectorAll('button[data-act]')]).find(b => !b.closest('details') && selOf(b)); if (sb) A.push({ label: lbl(sb), go: selOf(sb) });
    const hb = [...m.querySelectorAll('button.uxkeep[data-act]')].filter(b => !b.closest('details, .l43-brief')); const h = hb.find(b => b.classList.contains('pri')) || hb[hb.length - 1];
    if (h && selOf(h) && !A.some(a => a.go === selOf(h))) A.push({ label: lbl(h), go: selOf(h), kind: A.length ? 'sec' : 'pri' });
    const s2 = SEC2[tab]; if (A.length < 2 && s2) { try { if (typeof MENU === 'undefined' || MENU[s2[0]]) A.push({ label: s2[1], tab: s2[0], kind: A.length ? 'sec' : 'pri' }); } catch (e) { } }
    return A.slice(0, 2); };
  /* ④ 화면별 보조 카드(반복 막대 대신) — 시연 데이터(LMSX · LMP 데모 저장소)와 그려진 화면 숫자만 쓴다 */
  const lcard = (t, L, foot, cls) => L.length ? `<section class="q1-ac r7-lc ${cls || ''}"><h3>${E(t)}</h3><ul>${L.map(([a, b, c, tone]) => `<li class="${tone || ''}"><span class="r7-lt">${E(c || '')}</span><span class="r7-lx"><b>${E(a)}</b>${b ? `<small>${E(b)}</small>` : ''}</span></li>`).join('')}</ul>${foot || ''}</section>` : '';
  const rcard = (t, center, sub, P) => { const tot = P.reduce((a, p) => a + p[1], 0) || 1, R = 40, C = 2 * Math.PI * R; let off = 0;
    const seg = P.map(([, v, c]) => { const d = C * v / tot; const h = `<circle cx="50" cy="50" r="${R}" class="r7-rs ${c}" stroke-dasharray="${d.toFixed(1)} ${(C - d).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"/>`; off += d; return h; }).join('');
    return `<section class="q1-ac r7-rc"><h3>${E(t)}</h3><div class="r7-rw"><svg viewBox="0 0 100 100" width="120" height="120" role="img" aria-label="${E(t)}"><circle cx="50" cy="50" r="${R}" class="r7-rt"/><g transform="rotate(-90 50 50)">${seg}</g></svg><div class="r7-rv"><b>${E(center)}</b><small>${E(sub)}</small></div></div><dl class="r7-rl">${P.map(([l, v, c]) => `<div><dt><i class="${c}"></i>${E(l)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl></section>`; };
  const ago = t => { const d = Math.floor((Date.now() - Date.parse(t)) / 864e5); return isNaN(d) ? '' : d <= 0 ? '오늘' : d + '일 전'; };
  const dday = t => { const d = Math.ceil((Date.parse(t) - Date.now()) / 864e5); return isNaN(d) ? '' : d <= 0 ? '오늘' : 'D-' + d; };
  const CARD = {
    lmsb: m => { const cw = rx(m, /이번 주\s*(\d+)\s*주차/) || 11; const W = [cw - 2, cw - 1, cw, cw + 1, cw + 2].filter(w => w > 0 && w <= 16);
      return lcard('주차 진행', W.map(w => [`${w}주차`, w < cw ? '차시 공개 · 자료 완료' : w === cw ? '이번 주 · 차시 2개 공개' : '공개 예약 · 자료 준비', w < cw ? '완료' : w === cw ? '이번 주' : '예정', w < cw ? 'ok' : w === cw ? 'now' : '']), '', 'r7-tl'); },
    lmsd: () => { let Q = []; try { Q = (LMSX.db().d.posts || []).filter(q => q.kind === 'qna' && q.status === 'open' && !q.deleted_at && (!LMSX.sec || q.sec === LMSX.sec)).sort((a, b) => String(a.at).localeCompare(String(b.at))); } catch (e) { }
      return lcard(`답을 기다리는 질문 ${Q.length}건`, Q.slice(0, 4).map(q => [q.title, `${q.label || '학생'} · ${q.category || 'Q&A'}`, ago(q.at), 'warn'])); },
    lmse: m => { const F = fr(m, '제출'); const a = F.reduce((x, y) => x + y[0], 0), b = F.reduce((x, y) => x + y[1], 0); const w = sumCol(m, '채점 대기'); if (!b) return '';
      return rcard('제출 현황', pctOf(a, b) + '%', '평균 제출률', [['채점 완료', Math.max(0, a - w), 'g'], ['채점 대기', w, 'w'], ['미제출', Math.max(0, b - a), 'n']]); },
    'lmsl-cal': () => { let I = []; try { I = (LMP.demo.l['cal.list']({}).items || []).filter(e => e.starts_at && Date.parse(e.starts_at) >= Date.now() - 864e5 && !e.done).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)); } catch (e) { }
      return lcard('다가오는 마감 · 일정', I.slice(0, 5).map(e => [e.title, `${String(e.starts_at).slice(5, 10).replace('-', '.')} · ${({ academic: '학사', course: '강좌', personal: '개인' })[e.scope] || '일정'}`, dday(e.starts_at), e.kind === 'deadline' ? 'warn' : ''])); },
    'lmsl-dm': m => { const on = m.querySelector('.lmp-room.on, .lmp-room[aria-current]') || m.querySelector('.lmp-room'); const nm = on ? T(on.querySelector('b')) : ''; if (!nm) return '';
      const sub = (T(m.querySelector('.lmp-chat .ch small, .lmp-chat h3 + small')) || '참여 4명');
      return `<section class="q1-ac r7-lc r7-prof"><h3>대화 상대</h3><div class="r7-pf">${window.L43 ? L43.av(nm, 'lg') : ''}<div><b>${E(nm)}</b><small>${E(sub)}</small></div></div><ul><li><span class="r7-lt">PDF</span><span class="r7-lx"><b>자료 조사 정리.pdf</b><small>공유 파일 · 2MB 이하</small></span></li><li><span class="r7-lt">링크</span><span class="r7-lx"><b>과제 3 안내 공지</b><small>강의 게시판 고정 글</small></span></li></ul></section>`; },
    'lmsl-noti': m => { const t = txt(m); const ch = [['푸시', (t.match(/푸시/g) || []).length], ['이메일', (t.match(/메일/g) || []).length], ['알림톡', (t.match(/알림톡/g) || []).length], ['SMS', (t.match(/SMS/g) || []).length]].filter(x => x[1]);
      return ch.length ? rcard('채널별 알림', ch.reduce((a, b) => a + b[1], 0) + '회', '규칙에 쓰인 채널', ch.map(([l, v], i) => [l, v, ['g', 'w', 'n', 'm'][i]])) : ''; },
    lmso: m => m.querySelector('#loFile') ? `<section class="q1-ac r7-dzc"><h3>강의자료 올리기</h3><label class="r7-dz" for="loFile"><b>파일을 끌어 놓거나 눌러서 고르기</b><small>txt · md · html · 워드 · 엑셀 · 자막(srt · vtt)</small><span class="btn sm pri">파일 고르기</span></label><p class="db-s">올린 자료는 문단으로 나뉘어 AI 튜터 답변의 근거가 됩니다.</p></section>` : '',
    lmsp: () => rcard('언어별 접속 비율', '88%', '한국어', [['한국어', 88, 'g'], ['English', 7, 'w'], ['中文', 3, 'n'], ['日本語', 2, 'm']]),
    'lmsp-portal': () => lcard('많이 누르는 위젯', [['오늘 수업', '학생 하루 평균 2.4회', '1', 'ok'], ['다가오는 마감', '마감 하루 전 클릭 급증', '2', ''], ['안 읽은 메시지', '교수자 화면에서 가장 많이 봄', '3', ''], ['내 강좌', '학기 초에 많이 씀', '4', '']])
  };
  const PICK = '.lmsx-pick, .efh-bar, select[data-chg="w3-sec"], .lmsa-tsel select';
  const absorb = m => { const bl = m.querySelector('.l43-brief .l43-bl'); if (!bl || bl.querySelector('.r7-ctx')) return; const P = [...m.querySelectorAll(PICK)].filter(x => !x.closest('.l43-brief, .modal, .uxpop, details'))[0];
    const box = document.createElement('div'); box.className = 'r7-ctx'; const src = P ? P.closest('.lmsx-head') || P.parentElement : null;
    if (!P) { /* 고르기가 없는 화면 */ } else if (P.matches('select')) { const l = document.createElement('label'); l.className = 'r7-ctxl'; l.innerHTML = `<span>${P.closest('.lmsa-tsel') ? '학기' : '분반'}</span>`; l.appendChild(P); box.appendChild(l); } else { box.appendChild(P); }
    const asm = src && (src.querySelector(':scope details.lmsx-asmore, :scope details.lmsd-as') || (src.parentElement && src.parentElement.querySelector(':scope > details.lmsd-as'))); if (asm) box.appendChild(asm); 
    const acts = bl.querySelector('.l43-acts'); if (acts) bl.insertBefore(box, acts); else bl.appendChild(box);
    /* 「데모: 브라우저에만 저장」 표시도 맥락 줄로(따로 떠 있던 한 줄 제거) — 비운 부모 줄은 숨김 */
    const DM = [...m.querySelectorAll('.lmsx-note, .efh-demo, .lw-demo, .lmp-demo, .lmsa-demo, .g2-demo')].filter(x => !x.closest('.l43-brief, [data-r7src], .modal'))[0]; if (DM) { const par = DM.parentElement; box.appendChild(DM); [par, par && par.parentElement].forEach(x => { if (x && x !== m && !x.closest('.l43-brief') && !x.querySelector('select, input, button:not(.slg-i), summary, table, img') && !T(x).replace(/\s/g, '').length) x.style.display = 'none'; }); }
    [src, src && src.closest('.lmsx-head')].forEach(x => { if (x && x !== m && !x.querySelector('select, input, button:not(.slg-i), summary') && !T(x).replace(/시연 모드|데모: 브라우저에만 저장/g, '').replace(/\s/g, '').length) x.style.display = 'none'; }); const hd = m.querySelector('.lmsx-head.lmsx-slim'); if (hd && !hd.querySelector('select, button, summary')) hd.style.display = 'none';
    /* 머리 버튼으로 올라간 주 버튼만 남은 머리 오른쪽 줄(예: 영상 올리기)은 숨긴다 — 버튼은 DOM에 남아 머리 버튼이 대신 누른다 */
    bl.querySelectorAll('.l43-act[data-l43go]').forEach(a => { let t = null; try { t = [...m.querySelectorAll(a.dataset.l43go)].find(x => !x.closest('.l43-brief')); } catch (e) { } const row = t && t.parentElement; if (!row || row === m || row.closest('.l43-brief') || !row.matches('.ph > *, .ph, .wh > *, .lmp-hd > *, .r2-hr')) return; if ([...row.children].every(c => c === t || c.matches('.btn.pri, .g26btn, .slg-i, .g2-demo, small, .lmsx-note') || !T(c))) row.style.display = 'none'; });
    if (!box.children.length) box.remove(); };
  const hideStrips = m => { if (!m.querySelector('.l43-brief')) return; m.querySelectorAll(STRIP).forEach(x => { x.style.display = 'none'; x.dataset.r7src = 1; }); };
  const loading = m => /불러오는 중/.test(T(m.querySelector('#lmsxRoot > .empty')));
  const reg = () => { if (!window.L43) return; Object.entries(B).forEach(([tab, [eye, f]]) => { L43.reg(tab, { art: /lmsm|lmsj|lmsg/.test(tab) ? 'people' : /lmse|lmsf/.test(tab) ? 'check' : /lmsp$|noti/.test(tab) ? 'gear' : 'list',
    brief: m => { if (noSec(m) || loading(m)) return null; const o = f(m); if (!o) return null; let x = null; try { x = X2[tab] && !(S.org && S.org.empty) ? X2[tab](m) : null; } catch (e) { console.warn(e); } if (x) { o.stats = x.stats.map(([v, l, t]) => [/^0(건|명|개)$/.test(String(v)) ? '없음' : v, l, t]); if (x.ring) o.ring = x.ring; if (x.todo) o.todo = x.todo.slice(0, 3).map(([a, b, t]) => [a.replace(/<[^>]+>/g, ''), b, t]); try { if (CARD[tab]) x.card = CARD[tab](m) || ''; } catch (e) { console.warn(e); } m.__dbx = x; } if (!o.acts) { try { o.acts = autoActs(m, tab); } catch (e) { } } return Object.assign({ eye: '학사 LMS · ' + eye }, o); },
    enhance: m => { if (loading(m)) return; try { absorb(m); hideStrips(m); } catch (e) { console.warn(e); } if (!m.__dbx || !window.DBX) return; const x = m.__dbx; DBX.side(m, { todo: m.querySelector('.l43-k-list') ? null : x.todo, chart: x.card ? null : x.chart, card: x.card, ai: x.ai }); } }); });
    /* 비동기 화면(X.mount): 「불러오는 중」 뒤에 채워지면 브리핑 · 보조 열을 다시 그린다 */
    try { const LX = window.LMSX; if (LX && LX.fill && !LX.__dbx) { LX.__dbx = 1; const f0 = LX.fill; LX.fill = async (...a) => { const r = await f0(...a); try { const m = document.getElementById('main'); if (m) { m.querySelectorAll('.l43-brief, .q1-aside').forEach(x => x.remove()); m.querySelectorAll('.q1-2col').forEach(w => { const c = w.querySelector(':scope > .q1-main'); if (c) w.replaceWith(...c.childNodes); }); L43.run(); } } catch (e) { console.warn(e); } return r; }; } } catch (e) { }
    try { L43.run(); } catch (e) { } };
  if (window.L43) reg(); else document.addEventListener('DOMContentLoaded', reg);
})();
