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
.lmsnav-sub .lnd{flex:1 1 100%;margin:0 0 2px;color:var(--mut,#64748b);font-size:13px}
.lmsnav-sub button{border:1px solid var(--line,#e2e8f0);background:var(--card,#fff);color:inherit;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}
@media (max-width:600px){.lmsnav-sub button{min-height:44px;padding:10px 14px}} /* v38 390 하위 탭 44px */
.lmsnav-sub button.on{background:var(--pri,#5C74F6);border-color:var(--pri,#5C74F6);color:#fff}
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
