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
.lmsnav-sub button.on{background:var(--gr700,#00862D);border-color:var(--gr700,#00862D);color:var(--on-pr,#fff)}
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
  const tabOn = m => T(m.querySelector('.bview .seg2:not(.wtabs):not(.lmsnav-sub) button.on, .lmp-tabs button.on'));
  const noSec = m => /분반이 없습니다|강의실\(분반\)이 없습니다|분반을 먼저 개설/.test(T(m.querySelector('.empty, .slg-empty')));
  const n = (v, u) => `<em>${E(v)}${u}</em>`;
  /* 화면별: [eye, (main) => {title, sub} | null] */
  const B = {
    lmsb: ['강의실 구성', m => { const w = m.querySelectorAll('.lmsb-week').length || [...m.querySelectorAll('h3, .ch b')].filter(h => /^\d+(주차|차시)/.test(T(h))).length; const s = m.querySelector('select[aria-label*="강의실"], .lmsb-bar select, select'); const nm = s && s.selectedOptions[0] ? T(s.selectedOptions[0]).replace(/^\d{4}-\d+ · /, '') : '';
      return { title: w ? `${nm ? E(nm) + ' 강의실에 ' : ''}주차 ${n(w, '개')}를 구성했습니다` : '첫 차시를 만들어 강의실을 여세요', sub: '차시마다 자료 · 영상 · 학습활동을 올리면 학생 강의실에 바로 보입니다.' }; }],
    lmsc: ['학습활동', m => { const t = tabOn(m) || '학습활동'; const k = rows(m) || m.querySelectorAll('.lmsb-item, .lw-card, .card .row').length; return k ? { title: `${E(t)} ${n(k, '건')}이 열려 있습니다`, sub: '참여가 적은 활동은 강의 게시판 공지로 한 번 더 알리세요.' } : { title: `아직 연 ${E(jo(t, '이', '가'))} 없습니다`, sub: '토론 · 사전 과제 · 팀 프로젝트 · 간편 설문 가운데 하나로 수업 참여를 시작하세요.' }; }],
    lmsd: ['강의 게시판', m => { const t = tabOn(m) || '게시판'; const k = rows(m); return k ? { title: `${E(t)} 글 ${n(k, '건')}이 올라와 있습니다`, sub: '답이 없는 Q&A부터 확인하세요. 공지는 학생 앱 알림으로도 갑니다.' } : { title: `${E(t)}에 아직 글이 없습니다`, sub: '첫 수업 안내 공지를 올리면 학생 앱 알림으로 함께 전달됩니다.' }; }],
    lmse: ['과제', m => { const k = rows(m); if (!k) return null; const w = sumCol(m, '채점 대기'); return { title: w ? `채점을 기다리는 과제 제출물 ${n(w, '건')}이 있습니다` : `과제 ${n(k, '개')}가 진행 중이며 채점할 제출물은 없습니다`, sub: '마감이 지난 과제부터 채점하세요. 루브릭을 쓰면 같은 기준으로 빠르게 채점할 수 있습니다.' }; }],
    lmsf: ['시험 · 문제은행', m => { const k = rows(m); if (!k) return null; const w = sumCol(m, '채점 대기'); return { title: w ? `서술형 채점 대기 ${n(w, '건')}이 있습니다` : `시험 ${n(k, '개')}의 채점이 끝났습니다`, sub: '객관식은 자동 채점됩니다. 결과 · 통계 탭에서 문항별 정답률을 확인하세요.' }; }],
    lmsg: ['출결 관리', m => { const r = kv(m, '결석 1/4 이상'), a = kv(m, '평균 출석률'); if (r == null) return null; return num(r) ? { title: `결석이 1/4을 넘은 학생 ${n(num(r), '명')}에게 먼저 연락하세요`, sub: `평균 출석률은 ${E(a || '—')}입니다. 학칙상 F 처리 대상이 되기 전에 안내를 보내는 것이 좋습니다.` } : { title: `평균 출석률 ${n(a || '—', '')}, 결석 1/4을 넘은 학생은 없습니다`, sub: '차시를 고르면 출석부를 열고 바로 고칠 수 있습니다.' }; }],
    lmsi: ['동영상 · 진도', m => noSec(m) ? null : ({ title: '영상 진도는 <em>실제로 본 구간</em>만 인정합니다', sub: '진도 현황 탭에서 기준에 못 미친 학생을 찾고, 영상 퀴즈 · 자막을 함께 관리하세요.' })],
    lmsj: ['학습 분석', m => { const r = kv(m, '위험'), c = kv(m, '주의'); if (r == null) return null; return { title: num(r) ? `위험 학생 ${n(num(r), '명')}, 주의 ${num(c)}명에게 먼저 연락하세요` : `위험 학생은 없고, 주의 학생이 ${n(num(c), '명')} 있습니다`, sub: '위험지수는 출석 · 과제 · 접속 기록을 합쳐 계산합니다. 조기 경고 탭에서 안내를 보낼 수 있습니다.' }; }],
    lmsk: ['설문 · 강의평가', m => { const k = rows(m); return k ? { title: `설문 ${n(k, '개')}를 운영하고 있습니다`, sub: '응답률이 낮은 설문은 마감 전에 알림을 한 번 더 보내세요.' } : { title: '템플릿으로 첫 설문을 만드세요', sub: '강의평가 · 만족도 조사 템플릿을 고르면 문항이 바로 채워집니다.' }; }],
    'lmsl-cal': ['통합 달력', m => { const k = m.querySelectorAll('.lmp-ev').length; return { title: k ? `이번 달 일정 ${n(k, '건')}, 다가오는 마감부터 확인하세요` : '이번 달 일정이 아직 없습니다', sub: '학사 · 강좌 일정은 학생 달력에도 함께 보입니다. 개인 일정은 운영자에게만 보입니다.' }; }],
    'lmsl-dm': ['채팅', m => { const R = [...m.querySelectorAll('.lmp-room')]; const u = R.reduce((a, r) => a + num(T(r.querySelector('em'))), 0); return R.length ? { title: u ? `안 읽은 메시지 ${n(u, '건')}이 있습니다` : `대화방 ${n(R.length, '개')}, 새 메시지는 없습니다`, sub: '학생 · 교수자와 1:1 또는 분반 단위로 대화합니다.' } : { title: '첫 대화를 시작하세요', sub: '학생 · 교수자와 1:1 또는 분반 단위로 대화합니다.' }; }],
    'lmsl-noti': ['알림 규칙', m => { const k = m.querySelectorAll('[data-act="lmsl-rdel"]').length; return { title: k ? `알림 규칙 ${n(k, '개')}가 마감 · 공지를 자동으로 알립니다` : '알림 규칙을 만들어 마감 안내를 자동으로 보내세요', sub: '방해금지 시간에는 알림을 모았다가 보냅니다.' }; }],
    lmsm: ['시스템 관리', m => { const k = rows(m); return k ? { title: `구성원 ${n(k, '명')}의 계정 · 권한을 관리합니다`, sub: '구분 · 학과 · 상태로 찾고, 바꾼 내용은 로그 검색에서 확인할 수 있습니다.' } : null; }],
    lmsn: ['MOOC · 비학위', m => { const k = rows(m); return k ? { title: `MOOC · 비학위 과정 ${n(k, '개')}를 운영합니다`, sub: '기수를 열면 학생 화면(과정 찾기)에 신청 버튼이 생깁니다.' } : null; }],
    lmso: ['AI 학습 지원', m => { const k = rows(m); return { title: k ? `AI 튜터가 참고하는 강의자료 ${n(k, '건')}이 올라와 있습니다` : '강의자료를 올리면 AI 튜터가 그 범위 안에서 답합니다', sub: '학생 질문과 AI 답변은 AI 질문 답변 탭에서 확인하고 고칠 수 있습니다.' }; }],
    lmsp: ['공통 설정', () => ({ title: '화면 언어 · 보안 · 파일 규칙을 <em>학교 전체</em>에 한 번에 적용합니다', sub: '바꾼 설정은 모든 강의실에 바로 반영됩니다.' })],
    'lmsp-portal': ['포털 대시보드', m => ({ title: `교수자 · 학생 포털 첫 화면에 위젯 ${n(m.querySelectorAll('.card').length, '개')}가 보입니다`, sub: '자주 쓰는 위젯을 앞에 두면 학생이 오늘 할 일을 바로 찾습니다.' })],
    'lmsp-app': ['앱 출석', () => ({ title: '교수자가 QR을 열면 <em>학생 앱</em>으로 출석합니다', sub: 'QR은 15초마다 바뀌어 캡처 공유를 막습니다. 출석 기록은 출결 관리 화면과 같습니다.' })],
    lmsq: ['비교과', m => { const k = rows(m); if (!k) return null; const o = col(m, '상태').filter(v => /접수중/.test(v)).length; return { title: `비교과 프로그램 ${n(k, '개')} 가운데 ${o}개가 접수 중입니다`, sub: '대기자는 정원이 비면 자동으로 승격됩니다. 마감 전 신청 현황을 확인하세요.' }; }],
    lmslive: ['실시간 수업', m => { const k = rows(m); return k ? { title: `실시간 수업 ${n(k, '개')}가 등록되어 있습니다`, sub: '차시와 연결하면 입장 기록이 출결에 반영됩니다. 연결 없는 수업은 출결이 기록되지 않습니다.' } : null; }],
    lmsv: ['강의 영상 관리', m => { const a = kv(m, '자막 미게시'), b = kv(m, '차시 미배치'), ok = kv(m, '재생 가능'); if (ok == null) return null; const w = num(a) + num(b); return { title: w ? `자막 미게시 ${n(num(a), '개')} · 차시 미배치 ${num(b)}개 영상을 정리하세요` : `올린 영상 ${n(num(ok), '개')}가 모두 재생 · 배치되었습니다`, sub: '자막을 게시하고 차시에 배치해야 학생 강의실에 영상이 보입니다.' }; }]
  };
  const reg = () => { if (!window.L43) return; Object.entries(B).forEach(([tab, [eye, f]]) => { L43.reg(tab, { art: /lmsm|lmsj|lmsg/.test(tab) ? 'people' : /lmse|lmsf/.test(tab) ? 'check' : /lmsp$|noti/.test(tab) ? 'gear' : 'list', brief: m => { if (noSec(m)) return null; const o = f(m); return o ? Object.assign({ eye: '학사 LMS · ' + eye }, o) : null; } }); }); try { L43.run(); } catch (e) { } };
  if (window.L43) reg(); else document.addEventListener('DOMContentLoaded', reg);
})();
