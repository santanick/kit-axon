/* v30 학사 LMS 묶음 B — 강의실 구성(주차 › 차시 위계 · 차시별 자원 · 선후 관계 · 출결 연계 · 등록 현황 · 계획서 타임라인,
   템플릿 · 이전 학기 복사 · 기간 일괄 변경, 백업 · 복구, 학습자원 유형(파일 · URL · 웹페이지 · 폴더 · 표지 · 영상 · SCORM · HTML5),
   SCORM 1.2 · 2004 런타임(window.API · API_1484_11), 조건부 · 수준별 · 순차 · 적응형 경로, 휴지통 · 버전 · 공유/재사용, 역할 · 권한 · 메뉴).
   규칙: didisam/lms/README.md. 운영(서버) 모드는 /api/lms/b/* (Node · 전자정부 Java 같은 JSON), 데모 모드는 S.lms.bcd 상태로 같은 동작을 흉내 낸다.
   묶음 C · D가 쓰는 공용 클라이언트(LMSX: 호출 · 강의실 선택 · 신분 전환 · 데모 저장소)도 여기 둔다. */
(function () {
  'use strict';
  const X = window.LMSX = window.LMSX || {};
  const LIVE_ON = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  X.live = LIVE_ON;
  X.demo = X.demo || {};
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const nid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const nowIso = () => new Date().toISOString();
  X.nid = nid; X.nowIso = nowIso; X.clone = clone;
  const fail = (st, code, msg) => { const e = new Error(msg); e.status = st; e.code = code; throw e; };
  X.fail = fail;
  const ROLE_N = { admin: '운영자', professor: '교수', ta: '조교', staff: '교직원', grader: '채점자', student: '학생' };
  X.ROLE_N = ROLE_N;
  const fmt = v => { if (!v) return '—'; const d = new Date(v); if (isNaN(d)) return esc(v); return d.toLocaleString('ko-KR', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  const fmtD = v => v ? String(v).slice(0, 10) : '—';
  X.fmt = fmt; X.fmtD = fmtD;

  /* ── 데모 저장소(학번 · 학과 · 학적만) ── */
  function seed() {
    const P = (no, kind, unit, year) => ({ id: nid(), no, kind, unit, year });
    const persons = [P('P2026001', 'professor', 'CSE', null), P('P2026002', 'professor', 'BUS', null), P('T2026001', 'student', 'CSE', 4), P('G2026001', 'staff', 'CSE', null), P('S2026001', 'staff', 'CSE', null),
      ...['20261001', '20261002', '20261003', '20261004', '20261005', '20261006'].map((n, i) => P(n, 'student', i < 3 ? 'CSE' : 'BUS', 1 + (i % 4)))];
    const pid = no => persons.find(p => p.no === no).id;
    const sec = (term, from, to, title, course, mode) => ({ id: nid(), term, from, to, title, course, no: '01', mode, capacity: 40, status: 'open', syllabus: { weeks: [{ week: 1, title: '오리엔테이션', plan: '강의 소개 · 평가 방법' }, { week: 2, title: '배열과 리스트', plan: '선형 자료구조' }, { week: 3, title: '스택과 큐', plan: 'LIFO · FIFO' }] },
      staff: { [pid('P2026001')]: 'professor', [pid('T2026001')]: 'ta', [pid('G2026001')]: 'grader' },
      enroll: ['20261001', '20261002', '20261003', '20261004', '20261005', '20261006'].map((n, i) => ({ pid: pid(n), kind: i === 5 ? 'audit' : 'regular', status: i === 4 ? 'dropped' : 'enrolled', at: `2026-08-${String(18 + i % 3).padStart(2, '0')}T01:00:00Z` })) });
    const s1 = sec('2026-1', '2026-03-02', '2026-06-20', '자료구조(01) 1학기', 'CSE2001', 'offline');
    const s2 = sec('2026-2', '2026-09-01', '2026-12-19', '자료구조(01)', 'CSE2001', 'blended');
    const s3 = sec('2026-2', '2026-09-01', '2026-12-19', '경영정보시스템(02)', 'BUS3101', 'online'); s3.staff = { [pid('P2026002')]: 'professor' };
    return { v: 1, persons, sections: [s1, s2, s3], weeks: [], sessions: [], res: [], vers: [], hist: [], prog: [], level: [], opt: {}, tpl: [], backups: [], perm: {}, menuPref: {}, pkgs: [], att: [], files: [], scorm: [], c: {}, d: {} };
  }
  X.db = () => { const L = S.lms = S.lms || {}; if (!L.bcd || L.bcd.v !== 1) { L.bcd = seed(); X.seedHooks.forEach(f => { try { f(L.bcd); } catch (e) { console.error(e); } }); } return L.bcd; };
  X.seedHooks = X.seedHooks || [];
  /* 2단계(UX) 데모 샘플: 이번 학기(2026-2) 강의실 두 곳에 15주 뼈대를 미리 넣어, 처음 연 화면이 비어 있지 않게 한다(운영 모드에는 영향 없음) */
  X.seedHooks.push(L => { const a = { pid: null, no: null, role: 'admin', label: '정운영자' };
    L.sections.filter(s => s.term === '2026-2').forEach(s => { const k = s.mode === 'online' ? 'online' : s.mode === 'offline' ? 'offline' : 'blended'; const d = builtin(k); if (!d) return;
      importSec(s.id, d, ['structure', 'resources'], false, 0, a); (L.opt[s.id] = L.opt[s.id] || {}).template = k;
      (s.course === 'CSE2001' && s.syllabus && s.syllabus.weeks || []).forEach(e => { const w = L.weeks.find(x => x.sec === s.id && x.week_no === +e.week); if (w) { if (e.title) w.title = e.title; w.plan = { plan: e.plan || '', method: '', from: 'syllabus' }; } }); }); });
  X.person = no => X.db().persons.find(p => p.no === no);
  X.pno = id => { const p = X.db().persons.find(x => x.id === id); return p ? p.no : null; };
  X.secOf = id => { const s = X.db().sections.find(x => x.id === id); if (!s) fail(404, 'section', '강의실(분반)을 찾을 수 없습니다.'); return s; };
  /* 서버 lmsb_actor와 같은 판정 */
  X.actor = (secId, args) => {
    const no = String(args.as || '').trim(); const r0 = S.me.role;
    if (!no) return { pid: null, no: null, role: r0 === 'teacher' ? 'professor' : 'admin', label: r0 === 'owner' ? '정운영자' : r0 === 'sub' ? '부운영자' : '교수자' };
    const p = X.person(no); if (!p) fail(404, 'person', '해당 학번(사번)의 구성원이 없습니다.');
    let role;
    if (!secId) role = p.kind === 'student' ? 'student' : p.kind === 'professor' ? 'professor' : 'staff';
    else { const s = X.secOf(secId); const st = s.staff[p.id]; if (st) role = ({ professor: 'professor', co_professor: 'professor', ta: 'ta', grader: 'grader' })[st] || 'staff';
      else if (s.enroll.some(e => e.pid === p.id && e.status === 'enrolled')) role = 'student'; else if (p.kind === 'staff') role = 'staff'; else fail(403, 'member', '이 강의실의 구성원이 아닙니다.'); }
    return { pid: p.id, no: p.no, role, label: p.no };
  };
  const PERMS = ['course.view', 'structure.edit', 'resource.edit', 'resource.share', 'backup', 'trash', 'menu.edit', 'perm.manage', 'activity.manage', 'activity.join', 'grade', 'board.manage', 'board.write'];
  const PDEF = { professor: PERMS.filter(p => p !== 'perm.manage'), staff: ['course.view', 'structure.edit', 'resource.edit', 'resource.share', 'backup', 'trash', 'menu.edit', 'perm.manage', 'activity.manage', 'board.manage', 'board.write'],
    ta: ['course.view', 'structure.edit', 'resource.edit', 'trash', 'activity.manage', 'activity.join', 'grade', 'board.manage', 'board.write'], grader: ['course.view', 'grade', 'board.write', 'activity.join'], student: ['course.view', 'activity.join', 'board.write'] };
  X.PERMS = PERMS;
  X.can = (a, p) => a.role === 'admin' || ((X.db().perm[a.role] || {})[p] ?? (PDEF[a.role] || []).includes(p));
  X.need = (a, p) => { if (!X.can(a, p)) fail(403, 'role', `이 작업을 할 권한이 없습니다(${ROLE_N[a.role] || a.role} · ${p}).`); };
  X.mgr = a => ['admin', 'professor', 'ta', 'staff'].includes(a.role);
  X.who = a => a.pid || 'uid:me';
  const str = (v, mx, req, lab) => { v = String(v ?? '').trim(); if (req && !v) fail(400, 'input', `${lab}을(를) 입력하세요.`); if (v.length > mx) fail(400, 'input', `${lab}은(는) ${mx}자 이내로 입력하세요.`); return v; };
  const int = (v, lo, hi, def, k) => { if (v === undefined || v === null || v === '') return def; const n = Number(v); if (!Number.isFinite(n)) fail(400, 'input', `${k}은(는) 숫자로 입력하세요.`); if (n < lo || n > hi) fail(400, 'input', `${k}은(는) ${lo}~${hi} 사이로 입력하세요.`); return n; };
  X.str = str; X.int = int;

  /* ── 호출(운영: API, 데모: X.demo) ── */
  const GETS = new Set();
  X.gets = (b, list) => list.forEach(op => GETS.add(b + '/' + op));
  X.call = async (b, op, args = {}) => {
    args = { ...args }; if (X.as && args.as === undefined) args.as = X.as; if (args.as === '') delete args.as;
    const get = GETS.has(b + '/' + op);
    if (LIVE_ON()) {
      if (get) { const q = new URLSearchParams(Object.entries(args).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])); return api('GET', `/api/lms/${b}/${op}${q.toString() ? '?' + q : ''}`); }
      return api('POST', `/api/lms/${b}/${op}`, args);
    }
    const fn = (X.demo[b] || {})[op]; if (!fn) fail(404, 'not_found', '없는 주소입니다.');
    const bak = JSON.stringify(X.db());
    try { const r = clone(fn(args)); if (!get) save(); return r; } catch (e) { S.lms.bcd = JSON.parse(bak); throw e; }
  };
  X.err = e => toast(e && e.message ? e.message : '처리하지 못했습니다.', 'warn');
  X.run = async (b, op, args, okMsg) => { try { const r = await X.call(b, op, args); if (okMsg) toast(okMsg, 'ok'); return r; } catch (e) { X.err(e); return null; } };

  /* ── 강의실 선택 · 신분 전환(공용 머리) ── */
  X.sections = null;
  X.loadSections = async () => { try { const r = await X.call('b', 'sections', {}); X.sections = r.sections; X.me0 = r.me; } catch (e) { X.sections = []; X.secErr = e.message; } return X.sections; };
  X.head = (title, desc, roster) => {
    const ss = X.sections || [];
    const asOpts = [['', `${S.me.role === 'teacher' ? '교수자' : '운영자'} 본인`], ...(roster || []).map(r => [r.no, `${r.no} · ${r.role ? ROLE_N[r.role] || r.role : '학생'}`])];
    if (X.as && !asOpts.some(o => o[0] === X.as)) asOpts.push([X.as, X.as]);
    /* 2단계(UX): 신분 전환(교수 · 조교 · 학생 화면 미리보기)은 「다른 신분으로 보기」 펼침 안으로, 안내는 한 줄 작은 글로 */
    const asNow = X.as ? (asOpts.find(o => o[0] === X.as) || [X.as, X.as])[1] : '';
    return `<div class="lmsx-head card"><div class="lmsx-hrow"><div><b>${esc(title)}</b><p class="mini">${desc}</p></div>
      <div class="lmsx-pick"><label>강의실<select data-chg="lmsx-sec">${ss.map(s => `<option value="${esc(s.id)}" ${s.id === X.sec ? 'selected' : ''}>${esc(s.term)} · ${esc(s.title)}</option>`).join('') || '<option value="">강의실 없음</option>'}</select></label>
      <details class="uxmore lmsx-asmore ${X.as ? 'on' : ''}"><summary>${X.as ? `${ic('users', 14)} ${esc(asNow)} 화면` : '다른 신분으로 보기'}</summary><div class="uxpop lmsx-aspop" role="menu">
        <label>보기 신분<select data-chg="lmsx-as">${asOpts.map(([v, l]) => `<option value="${esc(v)}" ${v === (X.as || '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <div class="lmsx-asrow"><input data-lmsx-asin placeholder="학번 입력" maxlength="20" aria-label="학번으로 전환"><button class="btn sm" data-act="lmsx-asgo">전환</button></div>
        <p class="mini">교수 · 조교 · 학생에게 보이는 화면을 확인합니다. 학교 SSO 연동 후에는 로그인한 신분으로 고정됩니다.</p></div></details></div></div>
      ${LIVE_ON() ? '' : '<p class="mini lmsx-note">데모: 브라우저에만 저장</p>'}</div>`;
  };
  ACT['lmsx-sec'] = el => { X.sec = el.value; X.refresh(); };
  ACT['lmsx-as'] = el => { X.as = el.value || ''; X.refresh(); };
  ACT['lmsx-asgo'] = () => { const v = ($('[data-lmsx-asin]') || {}).value || ''; X.as = v.trim(); X.refresh(); };
  /* 비동기 화면: VIEWS는 틀만 돌려주고 render 뒤에 채운다 */
  X.views = {};
  X.mount = (id, fn) => { X.views[id] = fn; VIEWS[id] = () => { setTimeout(() => X.fill(id), 0); return `<div id="lmsxRoot" data-v="${id}"><div class="empty">불러오는 중입니다…</div></div>`; }; };
  X.fill = async id => {
    const root = $('#lmsxRoot'); if (!root || root.dataset.v !== id) return;
    try { if (!X.sections) await X.loadSections(); if (!X.sec || !X.sections.some(s => s.id === X.sec)) X.sec = X.sections[0] ? X.sections[0].id : ''; await X.loadMenu(); const h = await X.views[id](); const r2 = $('#lmsxRoot'); if (r2 && r2.dataset.v === id) r2.innerHTML = h; X.applyMenu(); }
    catch (e) { const r2 = $('#lmsxRoot'); if (r2) r2.innerHTML = `<div class="warn">${esc(e.message || '불러오지 못했습니다.')}</div>`; console.warn(e); }
  };
  X.refresh = () => { const r = $('#lmsxRoot'); if (r) X.fill(r.dataset.v); };
  /* ── 강의실 메뉴 모듈 · 개인 맞춤 메뉴 적용(묶음 메뉴 MENU id + 학습활동 · 게시판 세부 모듈) ──
     강의실 메뉴에서 끈 모듈과 내가 숨긴 메뉴는 탭에서 빠지고, 직접 이동(go)도 막는다. 「강의실 구성」(lmsb)은 설정 화면이라 숨기지 않는다. */
  X.SUBMODS = [['forum', '토론'], ['wiki', '위키'], ['team', '팀 프로젝트'], ['review', '동료 평가'], ['chat', '대화방'], ['poll', '간편 설문'], ['pretask', '사전 과제 · 질문'], ['eval', '수업 평가'], ['notice', '공지'], ['qna', 'Q&A'], ['archive', '자료실'], ['counsel', '1:1 상담']];
  X.modules = () => [...Object.keys(MENU).filter(id => /^lms/.test(id) && id !== 'lmsb').map(id => [id, mlabel(id)]), ...X.SUBMODS];
  X.menuState = { sec: null, modules: [], pref: { hidden: [], order: [] } };
  X.loadMenu = async () => { if (!X.sec) { X.menuState = { sec: null, modules: [], pref: { hidden: [], order: [] } }; return; } try { const m = await X.call('b', 'menu', { section: X.sec }); X.menuState = { sec: X.sec, as: X.as || '', modules: m.modules || [], pref: m.pref || { hidden: [], order: [] } }; } catch (e) { X.menuState = { sec: X.sec, modules: [], pref: { hidden: [], order: [] } }; } };
  X.hidden = id => { const M = X.menuState; if (!M.sec || id === 'lmsb') return false; return M.modules.some(m => m.id === id && m.on === false) || (M.pref.hidden || []).includes(id); };
  X.applyMenu = () => { try { if (typeof ULMS !== 'function' || !ULMS()) return; const bar = $('#main .wtabs'); if (!bar) return;
    bar.querySelectorAll('[data-act="go"][data-v]').forEach(b => { b.hidden = X.hidden(b.dataset.v); });
    const ord = X.menuState.pref.order || []; if (ord.length) [...bar.querySelectorAll('[data-act="go"][data-v]')].sort((a, b) => { const i = ord.indexOf(a.dataset.v), j = ord.indexOf(b.dataset.v); return (i < 0 ? 999 : i) - (j < 0 ? 999 : j); }).forEach(b => bar.appendChild(b)); } catch (e) { console.warn(e); } };
  AFTER.push(() => X.applyMenu());
  { const g0 = go; go = function (id, keep) { try { if (typeof ULMS === 'function' && ULMS() && MENU[id] && X.hidden(id)) { toast(`이 강의실에서 숨긴 메뉴입니다(${mlabel(id)}). 강의실 구성 › 역할 · 메뉴에서 켤 수 있습니다.`, 'warn'); return; } } catch (e) { } return g0(id, keep); }; } // eslint-disable-line no-global-assign
  X.subTabs = list => list.filter(([k]) => !X.hidden(k));
  /* 2단계(UX): 화면 안 탭은 앞 4개만 바로 보이고 나머지는 「더보기」(화면 기준으로 뜨는 펼침 목록 — ux.js의 details.uxmore 위치 계산을 그대로 쓴다).
     지금 탭이 「더보기」 안에 있으면 4번째 자리에 보여 준다. 탭 키(UI[key])와 값은 그대로라 기존 이동 · 테스트가 같은 화면을 연다. */
  X.tabs4 = (key, list, cur, n = 4) => {
    let vis = list.slice(0, n); const curT = list.find(t => t[0] === cur);
    if (curT && !vis.includes(curT)) vis = [...vis.slice(0, n - 1), curT];
    const more = list.filter(t => !vis.includes(t));
    return `<div class="lmsx-tabrow">${tabs(key, vis, cur)}${more.length ? `<details class="uxmore lmsx-tabmore"><summary>더보기 <em>${more.length}</em></summary><div class="uxpop" role="menu">${more.map(([id, l]) => `<button role="menuitem" data-act="tab" data-key="${esc(key)}" data-v="${esc(id)}">${esc(l)}</button>`).join('')}</div></details>` : ''}</div>`;
  };
  /* 「지금 할 일」 한 줄(화면 맨 위) */
  X.todo = (text, btn) => `<div class="lmsx-todo"><span>${ic('spark', 16)} ${text}</span>${btn || ''}</div>`;
  /* CSS */
  if (!document.querySelector('link[data-lmsx]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/bcd.css?v=31.8'; l.dataset.lmsx = '1'; document.head.appendChild(l); }

  /* 메뉴: 학사 LMS 프리셋 + 기존 기관 상태에도 탭을 넣는다 */
  X.menu = (id, label, ws) => {
    MENU[id] = { label, ws, only: 'univ' };
    if (PRESET.univ_lms && !PRESET.univ_lms.on.includes(id)) PRESET.univ_lms.on.push(id);
    Object.keys(PRESET).filter(k => k !== 'univ_lms').forEach(k => { if (!PRESET[k].off.includes(id) && !PRESET[k].on.includes(id)) PRESET[k].off.push(id); });
    AFTER.push(() => { if (!S || !S.nav || !S.nav.tabs || !ULMS()) return; const T = S.nav.tabs[ws] = S.nav.tabs[ws] || []; if (!T.some(x => x.id === id)) { T.push({ id, on: true }); save(); render(); } });
  };

  /* ══════════ 데모 엔진(묶음 B) — 서버 lms_b_api와 같은 결과 형태 ══════════ */
  const D = X.demo.b = {};
  const db = X.db;
  const resJ = r => ({ id: r.id, session_id: r.session_id, kind: r.kind, title: r.title, body: r.body, visible: r.visible, sort: r.sort, ver: r.ver, completion: r.completion, access: r.access, share: r.share, origin_id: r.origin_id, owner: r.owner, updated_at: r.updated_at, deleted_at: r.deleted_at });
  const hist = (sec, obj, oid, action, snap, a) => db().hist.push({ id: db().hist.length + 1, sec, obj, obj_id: oid, action, snap, by: a.label, at: nowIso() });
  const progOf = (rid, pid) => db().prog.find(g => g.res === rid && g.pid === pid);
  const done = g => !!g && ['completed', 'passed'].includes(g.st);
  const sesOf = id => db().sessions.find(s => s.id === id);
  const ordered = sec => db().res.filter(r => r.sec === sec && !r.deleted_at).map(r => ({ r, s: sesOf(r.session_id) })).sort((a, b) => ((a.s ? a.s.week_no : 0) - (b.s ? b.s.week_no : 0)) || ((a.s ? a.s.seq : 0) - (b.s ? b.s.seq : 0)) || (a.r.sort - b.r.sort) || (a.r.created < b.r.created ? -1 : 1)).map(x => x.r);
  function access(sec, pid) {
    const o = db().opt[sec] || {}; const lvl = (db().level.find(l => l.sec === sec && l.pid === pid) || {}).level; const out = {}; let prevOk = true;
    const sesOk = {}; db().res.filter(r => r.sec === sec && !r.deleted_at && r.visible && r.session_id && r.completion && r.completion.type).forEach(r => { sesOk[r.session_id] = (sesOk[r.session_id] ?? true) && done(progOf(r.id, pid)); });
    for (const r of ordered(sec)) {
      const g = progOf(r.id, pid); let open = r.visible, why = r.visible ? null : '비공개 자원입니다.'; const d = done(g); const A = r.access || {};
      if (open && A.from && Date.now() < new Date(A.from)) { open = false; why = `공개 전입니다(${A.from}).`; }
      if (open && A.until && Date.now() > new Date(A.until)) { open = false; why = '이용 기간이 끝났습니다.'; }
      if (open && Array.isArray(A.after)) for (const x of A.after) { const z = db().res.find(q => q.id === x && !q.deleted_at); if (z && !done(progOf(x, pid))) { open = false; why = `이수 조건: 「${z.title}」을(를) 먼저 완료하세요.`; break; } }
      if (open && A.min_score && typeof A.min_score === 'object') { const gg = progOf(A.min_score.res, pid); if ((gg && gg.sc != null ? gg.sc : -1) < (+A.min_score.score || 0)) { const z = db().res.find(q => q.id === A.min_score.res); open = false; why = `점수 조건: 「${z ? z.title : '?'}」 ${A.min_score.score}점 이상이 필요합니다.`; } }
      if (open && Array.isArray(A.levels) && A.levels.length && !A.levels.includes(lvl || 'standard')) { open = false; why = `수준별 학습: 다른 수준(${A.levels.map(e => ({ basic: '기초', standard: '표준', advanced: '심화' })[e]).join('·')}) 대상 자원입니다.`; }
      const s = sesOf(r.session_id); if (open && s && (s.prereq || []).some(p => sesOk[p] === false)) { open = false; why = '선수 차시를 먼저 마치세요.'; }
      if (open && o.sequential && !prevOk) { open = false; why = '순차 학습: 앞 순서의 자원을 먼저 완료하세요.'; }
      if (r.visible && r.completion && r.completion.type && !d) prevOk = false;
      out[r.id] = { open, why, done: d, status: g ? g.st : null, score: g && g.sc != null ? g.sc : null };
    }
    return out;
  }
  X.access = access;
  const perms = a => Object.fromEntries(PERMS.map(p => [p, X.can(a, p)]));
  D.sections = args => { const a = X.actor(null, args); const L = db(); return { me: a, sections: L.sections.filter(s => !a.pid || a.role === 'staff' || s.staff[a.pid] || s.enroll.some(e => e.pid === a.pid && e.status === 'enrolled')).sort((x, y) => (y.term > x.term ? 1 : y.term < x.term ? -1 : x.course.localeCompare(y.course))).map(s => ({ id: s.id, term: s.term, course: s.course, no: s.no, title: s.title, mode: s.mode, status: s.status, enrolled: s.enroll.filter(e => e.status === 'enrolled').length, resources: L.res.filter(r => r.sec === s.id && !r.deleted_at).length })) }; };
  const BUILTIN = [['online', '온라인 강좌', '15주 · 주차별 영상 + 확인 학습, 진도 기반 출석'], ['blended', '블렌디드(플립러닝)', '15주 · 대면 수업 + 온라인 사전 학습'], ['offline', '오프라인 강좌', '15주 · 대면 수업 자료 중심'], ['personal', '개인 학습형', '6단계 · 순차 학습(앞 단계를 마쳐야 다음 단계 열림)']];
  D.templates = args => { X.actor(null, args); return { builtin: BUILTIN.map(([id, name, desc]) => ({ id, name, mode: id, desc })), mine: db().tpl.map(t => ({ id: t.id, name: t.name, mode: t.mode, by: t.by, created_at: t.at, weeks: (t.data.weeks || []).length, resources: (t.data.resources || []).length })).reverse() }; };
  function builtin(k) {
    if (!BUILTIN.some(b => b[0] === k)) return null; const n = k === 'personal' ? 6 : 15; const weeks = [], sessions = [], resources = [];
    for (let w = 1; w <= n; w++) {
      weeks.push({ week_no: w, title: k === 'personal' ? `${w}단계` : w === 8 ? '중간고사' : w === 15 ? '기말고사' : `${w}주차`, summary: '', plan: {} });
      const S1 = { key: `w${w}s1`, week_no: w, seq: 1 }, S2 = { key: `w${w}s2`, week_no: w, seq: 2 };
      if (k === 'online') { sessions.push({ ...S1, title: '강의 영상', kind: 'online', required_sec: 1500 }, { ...S2, title: '확인 학습', kind: 'online', required_sec: 600 }); resources.push({ key: `r${w}a`, session_key: S1.key, kind: 'video', title: `${w}주차 강의 영상`, body: { url: '' }, completion: { type: 'view' } }, { key: `r${w}b`, session_key: S2.key, kind: 'page', title: `${w}주차 정리 노트`, body: { html: '<p>이번 주 핵심 내용을 정리합니다.</p>' }, completion: { type: 'view' } }); }
      else if (k === 'blended') { sessions.push({ ...S1, title: '대면 수업', kind: 'class' }, { ...S2, title: '온라인 사전 학습', kind: 'online', required_sec: 900 }); resources.push({ key: `r${w}a`, session_key: S2.key, kind: 'video', title: `${w}주차 사전 학습 영상`, body: { url: '' }, completion: { type: 'view' } }, { key: `r${w}b`, session_key: S1.key, kind: 'label', title: `${w}주차 대면 수업 안내`, body: { text: '강의실 · 준비물을 확인하세요.' } }); }
      else if (k === 'offline') { sessions.push({ ...S1, title: '대면 수업', kind: 'class' }); resources.push({ key: `r${w}a`, session_key: S1.key, kind: 'label', title: `${w}주차 수업 자료`, body: { text: '수업 자료를 올려 주세요.' } }); }
      else { sessions.push({ ...S1, title: `${w}단계 학습`, kind: 'online', required_sec: 1200 }); resources.push({ key: `r${w}a`, session_key: S1.key, kind: 'page', title: `${w}단계 학습 자료`, body: { html: '<p>스스로 학습하고 다음 단계로 넘어갑니다.</p>' }, completion: { type: 'view' } }); }
    }
    return { format: 'didisam-lms-course', v: 1, parts: ['structure', 'resources'], weeks, sessions, resources, opt: { template: k, sequential: k === 'personal', adaptive: [], menu: [] } };
  }
  X.exportHooks = X.exportHooks || {}; X.importHooks = X.importHooks || {};
  function exportSec(sec, parts) {
    const L = db(); const s = X.secOf(sec); const o = { format: 'didisam-lms-course', v: 1, parts, term_start: s.from };
    if (parts.includes('structure')) { o.weeks = L.weeks.filter(w => w.sec === sec).sort((a, b) => a.week_no - b.week_no).map(w => ({ week_no: w.week_no, title: w.title, starts_on: w.starts_on, ends_on: w.ends_on, summary: w.summary, plan: w.plan }));
      o.sessions = L.sessions.filter(x => x.sec === sec).sort((a, b) => a.week_no - b.week_no || a.seq - b.seq).map(x => ({ key: x.id, week_no: x.week_no, seq: x.seq, title: x.title, kind: x.kind, starts_at: x.starts_at, ends_at: x.ends_at, open_at: x.open_at, close_at: x.close_at, required_sec: x.required_sec, prereq: x.prereq || [] }));
      const op = L.opt[sec]; o.opt = op ? { sequential: !!op.sequential, adaptive: op.adaptive || [], menu: op.menu || [], template: op.template || null } : {}; }
    if (parts.includes('resources')) o.resources = L.res.filter(r => r.sec === sec && !r.deleted_at).map(r => ({ key: r.id, session_key: r.session_id, kind: r.kind, title: r.title, body: r.body, visible: r.visible, sort: r.sort, completion: r.completion, access: r.access, share: r.share }));
    if (parts.includes('activities') && X.exportHooks.c) o.activities = X.exportHooks.c(sec);
    if (parts.includes('boards') && X.exportHooks.d) o.boards = X.exportHooks.d(sec);
    return o;
  }
  const addDay = (d, n) => d ? addDays(d, n) : null;
  const addTs = (t, n) => t ? new Date(new Date(t).getTime() + n * 864e5).toISOString() : null;
  function importSec(sec, d, parts, repl, shift, a) {
    if (!d || d.format !== 'didisam-lms-course') fail(400, 'format', '디디쌤 강좌 백업 형식이 아닙니다.');
    const L = db(); const sm = {}, rm = {}; let nw = 0, ns = 0, nr = 0; shift = shift || 0;
    if (parts.includes('structure') && Array.isArray(d.weeks)) {
      d.weeks.forEach(e => { let w = L.weeks.find(x => x.sec === sec && x.week_no === +e.week_no); if (!w) L.weeks.push(w = { sec, week_no: +e.week_no }); Object.assign(w, { title: e.title || '', starts_on: addDay(e.starts_on, shift), ends_on: addDay(e.ends_on, shift), summary: e.summary || '', plan: e.plan || {} }); nw++; });
      (d.sessions || []).forEach(e => { let s = L.sessions.find(x => x.sec === sec && x.week_no === +e.week_no && x.seq === (+e.seq || 1)); if (!s) L.sessions.push(s = { id: nid(), sec, week_no: +e.week_no, seq: +e.seq || 1, prereq: [] });
        Object.assign(s, { kind: e.kind || 'class', title: e.title || '', starts_at: addTs(e.starts_at, shift), ends_at: addTs(e.ends_at, shift), open_at: addTs(e.open_at, shift), close_at: addTs(e.close_at, shift), required_sec: +e.required_sec || 0 }); if (e.key) sm[e.key] = s.id; ns++; });
      (d.sessions || []).forEach(e => { if ((e.prereq || []).length) { const s = L.sessions.find(x => x.sec === sec && x.week_no === +e.week_no && x.seq === (+e.seq || 1)); s.prereq = e.prereq.filter(p => sm[p]).map(p => sm[p]); } });
      if (d.opt && Object.keys(d.opt).length) L.opt[sec] = { ...(L.opt[sec] || {}), template: d.opt.template || null, sequential: !!d.opt.sequential, adaptive: d.opt.adaptive || [], menu: d.opt.menu || [] };
    }
    if (parts.includes('resources') && Array.isArray(d.resources)) {
      if (repl) L.res.filter(r => r.sec === sec && !r.deleted_at).forEach(r => { r.deleted_at = nowIso(); r.deleted_by = a.label; });
      d.resources.forEach(e => { const sid = sm[e.session_key] || (L.sessions.some(s => s.sec === sec && s.id === e.session_key) ? e.session_key : null);
        const r = { id: nid(), sec, session_id: sid, kind: e.kind, title: String(e.title || '').slice(0, 200), body: e.body || {}, visible: e.visible !== false, sort: +e.sort || 0, ver: 1, completion: e.completion || {}, access: clone(e.access || {}), share: e.share || 'private', origin_id: null, owner: a.label, created: nowIso() + Math.random(), updated_at: nowIso(), deleted_at: null };
        L.res.push(r); L.vers.push({ res: r.id, ver: 1, snap: resJ(r), by: a.label, at: nowIso() }); if (e.key) rm[e.key] = r.id; nr++; });
      Object.values(rm).forEach(id => { const r = L.res.find(x => x.id === id); const A = r.access; if (Array.isArray(A.after)) A.after = A.after.map(x => rm[x] || x); if (A.min_score && rm[A.min_score.res]) A.min_score.res = rm[A.min_score.res]; ['from', 'until'].forEach(k => { if (A[k] && shift) A[k] = addTs(A[k], shift); }); });
      const op = L.opt[sec]; if (op && (op.adaptive || []).length) op.adaptive = op.adaptive.map(q => ({ if_res: rm[q.if_res] || q.if_res, below: q.below, then: (q.then || []).map(t => rm[t] || t), else: (q.else || []).map(t => rm[t] || t) }));
    }
    if (parts.includes('activities') && d.activities && X.importHooks.c) X.importHooks.c(sec, d.activities, repl, a);
    if (parts.includes('boards') && d.boards && X.importHooks.d) X.importHooks.d(sec, d.boards, repl, a);
    return { weeks: nw, sessions: ns, resources: nr };
  }
  const resOf = id => { const r = db().res.find(x => x.id === id); if (!r) fail(404, 'resource', '학습 자원을 찾을 수 없습니다.'); return r; };
  const sesJ = (s, a, acc) => { const L = db(); const at = L.att.filter(t => t.session === s.id);
    return { id: s.id, seq: s.seq, title: s.title, kind: s.kind, starts_at: s.starts_at, ends_at: s.ends_at, open_at: s.open_at, close_at: s.close_at, required_sec: s.required_sec, prereq: s.prereq || [],
      att: { present: at.filter(t => t.st === 'present').length, late: at.filter(t => t.st === 'late').length, absent: at.filter(t => t.st === 'absent').length, excused: at.filter(t => t.st === 'excused').length, total: at.length },
      resources: L.res.filter(r => r.sec === s.sec && r.session_id === s.id && !r.deleted_at && (r.visible || X.mgr(a))).sort((x, y) => x.sort - y.sort || (x.created < y.created ? -1 : 1)).map(r => ({ ...resJ(r), ...(acc[r.id] || {}) })) }; };
  D.overview = args => {
    const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'course.view'); const L = db(); const s = X.secOf(sec);
    const acc = a.pid && a.role === 'student' ? access(sec, a.pid) : {};
    const wks = [...new Set([...L.weeks.filter(w => w.sec === sec).map(w => w.week_no), ...L.sessions.filter(x => x.sec === sec).map(x => x.week_no)])].sort((x, y) => x - y);
    const en = s.enroll; const ok = en.filter(e => e.status === 'enrolled'); const grp = (arr, f) => Object.entries(arr.reduce((m, e) => { const k = f(e); m[k] = (m[k] || 0) + 1; return m; }, {}));
    return { section: { id: s.id, title: s.title, term: s.term, term_name: s.term, course: s.course, no: s.no, mode: s.mode, starts_on: s.from, ends_on: s.to, syllabus: s.syllabus },
      me: { ...a, role_name: ROLE_N[a.role], can: perms(a), level: a.pid ? ((L.level.find(l => l.sec === sec && l.pid === a.pid) || {}).level || null) : null },
      opt: L.opt[sec] ? { template: L.opt[sec].template || null, sequential: !!L.opt[sec].sequential, adaptive: L.opt[sec].adaptive || [], menu: L.opt[sec].menu || [] } : { template: null, sequential: false, adaptive: [], menu: [] },
      weeks: wks.map(wk => { const w = L.weeks.find(x => x.sec === sec && x.week_no === wk) || {}; return { week_no: wk, title: w.title || '', starts_on: w.starts_on || addDays(s.from, (wk - 1) * 7), ends_on: w.ends_on || addDays(s.from, (wk - 1) * 7 + 6), summary: w.summary || '', plan: w.plan || {}, sessions: L.sessions.filter(x => x.sec === sec && x.week_no === wk).sort((p, q) => p.seq - q.seq).map(x => sesJ(x, a, acc)) }; }),
      common: L.res.filter(r => r.sec === sec && !r.session_id && !r.deleted_at && (r.visible || X.mgr(a))).map(r => ({ ...resJ(r), ...(acc[r.id] || {}) })),
      enroll: { enrolled: ok.length, regular: ok.filter(e => e.kind === 'regular').length, audit: ok.filter(e => e.kind === 'audit').length, dropped: en.filter(e => e.status === 'dropped').length, pending: en.filter(e => e.status === 'pending').length, capacity: s.capacity,
        by_unit: grp(ok, e => (L.persons.find(p => p.id === e.pid) || {}).unit || '미지정').map(([unit, n]) => ({ unit, n })).sort((x, y) => y.n - x.n), by_year: grp(ok, e => (L.persons.find(p => p.id === e.pid) || {}).year || 0).map(([y, n]) => ({ year: +y, n })).sort((x, y) => x.year - y.year),
        by_day: grp(en, e => String(e.at).slice(0, 10)).map(([day, n]) => ({ day, n })).sort((x, y) => x.day < y.day ? -1 : 1) },
      staff: Object.entries(s.staff).map(([pid, role]) => ({ no: X.pno(pid), role })), roster: X.mgr(a) ? ok.map(e => { const p = L.persons.find(q => q.id === e.pid); return { no: p.no, unit: p.unit, kind: e.kind }; }).sort((x, y) => x.no < y.no ? -1 : 1) : [] };
  };
  D['week-save'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); const n = int(args.week_no, 1, 30, null, 'week_no'); if (n == null) fail(400, 'input', '주차를 입력하세요.');
    if (args.starts_on && args.ends_on && args.ends_on < args.starts_on) fail(400, 'input', '종료일이 시작일보다 빠릅니다.');
    let w = db().weeks.find(x => x.sec === sec && x.week_no === n); if (!w) db().weeks.push(w = { sec, week_no: n, plan: {} }); Object.assign(w, { title: str(args.title, 200), starts_on: args.starts_on || null, ends_on: args.ends_on || null, summary: str(args.summary, 4000) }); if (args.plan && typeof args.plan === 'object') w.plan = args.plan; return { ok: true, week_no: n }; };
  D['week-del'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); const n = +args.week_no; if (db().sessions.some(s => s.sec === sec && s.week_no === n)) fail(409, 'busy', '차시가 남아 있는 주차는 삭제할 수 없습니다. 차시를 먼저 정리하세요.'); db().weeks = db().weeks.filter(w => !(w.sec === sec && w.week_no === n)); return { ok: true }; };
  D['session-save'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); const L = db(); const kind = args.kind || 'class';
    if (!['class', 'online', 'live', 'exam', 'holiday'].includes(kind)) fail(400, 'input', '차시 유형이 올바르지 않습니다.');
    const pre = (args.prereq || []).filter(Boolean); if (pre.some(q => q === args.id || !L.sessions.some(s => s.sec === sec && s.id === q))) fail(400, 'input', '선수 차시는 같은 강의실의 다른 차시만 고를 수 있습니다.');
    const wk = int(args.week_no, 1, 30, 1, 'week_no'); let s = args.id ? L.sessions.find(x => x.id === args.id && x.sec === sec) : null; if (args.id && !s) fail(404, 'session', '차시를 찾을 수 없습니다.');
    const seq = int(args.seq, 1, 20, s ? s.seq : Math.max(0, ...L.sessions.filter(x => x.sec === sec && x.week_no === wk).map(x => x.seq)) + 1, 'seq');
    if (L.sessions.some(x => x.sec === sec && x.week_no === wk && x.seq === seq && x !== s)) fail(409, 'dup', '같은 주차에 같은 차시 번호가 이미 있습니다.');
    const ts = k => args[k] ? new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(args[k]) ? args[k] : args[k] + '+09:00').toISOString() : null;
    if (!s) L.sessions.push(s = { id: nid(), sec }); Object.assign(s, { week_no: wk, seq, kind, title: str(args.title, 200), starts_at: ts('starts_at'), ends_at: ts('ends_at'), open_at: ts('open_at'), close_at: ts('close_at'), required_sec: int(args.required_sec, 0, 86400, s.required_sec || 0, 'required_sec'), prereq: pre });
    if (s.open_at && s.close_at && s.close_at < s.open_at) fail(400, 'input', '인정 종료가 시작보다 빠릅니다.');
    if (!L.weeks.some(w => w.sec === sec && w.week_no === wk)) L.weeks.push({ sec, week_no: wk, title: '', summary: '', plan: {} }); hist(sec, 'session', s.id, 'save', null, a); return { ok: true, id: s.id }; };
  D['session-del'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); const L = db(); if (L.att.some(t => t.session === args.id)) fail(409, 'busy', '출석 기록이 있는 차시는 삭제할 수 없습니다.');
    if (!L.sessions.some(s => s.id === args.id && s.sec === sec)) fail(404, 'session', '차시를 찾을 수 없습니다.');
    L.res.filter(r => r.session_id === args.id && !r.deleted_at).forEach(r => { r.deleted_at = nowIso(); r.deleted_by = a.label; r.session_id = null; }); L.sessions.forEach(s => { s.prereq = (s.prereq || []).filter(p => p !== args.id); });
    L.sessions = L.sessions.filter(s => s.id !== args.id); hist(sec, 'session', args.id, 'delete', null, a); return { ok: true }; };
  const KINDS = ['file', 'url', 'page', 'folder', 'label', 'video', 'scorm', 'html5', 'assign', 'exam'];
  D['res-save'] = args => { const L = db(); let r = args.id ? resOf(args.id) : null; const sec = r ? r.sec : X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'resource.edit');
    const sid = args.session_id || null; if (sid && !L.sessions.some(s => s.sec === sec && s.id === sid)) fail(400, 'input', '차시가 이 강의실에 없습니다.');
    const body = args.body && typeof args.body === 'object' ? args.body : {}; const kind = r ? r.kind : args.kind;
    if (kind === 'url' && 'body' in args && !/^https?:\/\//i.test(body.url || '')) fail(400, 'input', 'URL은 http:// 또는 https://로 시작해야 합니다.');
    if (!r && ['assign', 'exam'].includes(kind)) fail(400, 'input', kind === 'assign' ? '이 강의실의 과제를 고르세요.' : '이 강의실의 시험을 고르세요.');
    if (args.share && !['private', 'shared'].includes(args.share)) fail(400, 'input', '공유 범위가 올바르지 않습니다.'); if (args.share === 'shared') X.need(a, 'resource.share');
    if (!r) { if (!KINDS.includes(kind)) fail(400, 'input', '자원 유형이 올바르지 않습니다.');
      r = { id: nid(), sec, session_id: sid, kind, title: str(args.title, 200, true, '제목'), body, visible: args.visible !== false, sort: int(args.sort, -1000, 100000, Math.max(-1, ...L.res.filter(x => x.sec === sec && x.session_id === sid).map(x => x.sort)) + 1, 'sort'), ver: 1, completion: args.completion || {}, access: args.access || {}, share: args.share || 'private', origin_id: null, owner: a.label, created: nowIso() + Math.random(), updated_at: nowIso(), deleted_at: null }; L.res.push(r); }
    else { if (r.deleted_at) fail(409, 'deleted', '휴지통에 있는 자원은 먼저 복구하세요.'); hist(sec, 'resource', r.id, 'update', resJ(r), a);
      Object.assign(r, { session_id: 'session_id' in args ? sid : r.session_id, title: str(args.title, 200) || r.title, body: 'body' in args ? body : r.body, visible: args.visible === undefined ? r.visible : !!args.visible, sort: int(args.sort, -1000, 100000, r.sort, 'sort'), completion: args.completion && typeof args.completion === 'object' ? args.completion : r.completion, access: args.access && typeof args.access === 'object' ? args.access : r.access, share: args.share || r.share, ver: r.ver + 1, updated_at: nowIso() }); }
    L.vers.push({ res: r.id, ver: r.ver, snap: resJ(r), by: a.label, at: nowIso() }); return resJ(r); };
  D['res-del'] = args => { const r = resOf(args.id); const a = X.actor(r.sec, args); X.need(a, 'resource.edit'); if (r.deleted_at) fail(409, 'deleted', '이미 휴지통에 있습니다.'); r.deleted_at = nowIso(); r.deleted_by = a.label; hist(r.sec, 'resource', r.id, 'trash', resJ(r), a); return { ok: true }; };
  D['res-restore'] = args => { const r = resOf(args.id); const a = X.actor(r.sec, args); X.need(a, 'trash'); if (!r.deleted_at) fail(409, 'state', '휴지통에 없는 자원입니다.'); r.deleted_at = null; r.deleted_by = null; if (r.session_id && !sesOf(r.session_id)) r.session_id = null; hist(r.sec, 'resource', r.id, 'restore', null, a); return resJ(r); };
  D['res-purge'] = args => { const r = resOf(args.id); const a = X.actor(r.sec, args); X.need(a, 'trash'); if (!X.mgr(a) || a.role === 'ta') fail(403, 'role', '영구 삭제는 교수 · 교직원 · 운영자만 할 수 있습니다.'); if (!r.deleted_at) fail(409, 'state', '휴지통에 있는 자원만 영구 삭제할 수 있습니다.'); hist(r.sec, 'resource', r.id, 'purge', resJ(r), a); const L = db(); L.res = L.res.filter(x => x !== r); L.vers = L.vers.filter(v => v.res !== r.id); L.prog = L.prog.filter(g => g.res !== r.id); return { ok: true }; };
  D['res-versions'] = args => { const r = resOf(args.id); const a = X.actor(r.sec, args); X.need(a, 'resource.edit'); return { versions: db().vers.filter(v => v.res === r.id).sort((x, y) => y.ver - x.ver).map(v => ({ ver: v.ver, by: v.by, at: v.at, snap: v.snap })) }; };
  D['res-revert'] = args => { const r = resOf(args.id); const a = X.actor(r.sec, args); X.need(a, 'resource.edit'); const v = db().vers.find(x => x.res === r.id && x.ver === +args.ver); if (!v) fail(404, 'ver', '그 버전이 없습니다.'); if (r.deleted_at) fail(409, 'deleted', '휴지통에 있는 자원은 먼저 복구하세요.');
    Object.assign(r, { title: v.snap.title, body: clone(v.snap.body), completion: clone(v.snap.completion), access: clone(v.snap.access), visible: v.snap.visible, ver: r.ver + 1, updated_at: nowIso() }); db().vers.push({ res: r.id, ver: r.ver, snap: resJ(r), by: a.label, at: nowIso() }); hist(r.sec, 'resource', r.id, 'revert', { to: v.ver }, a); return resJ(r); };
  D['ext-list'] = args => { const sec = X.secOf(args.section).id; X.need(X.actor(sec, args), 'resource.edit'); return { assignments: [], exams: [] }; }; // 데모: 과제(E) · 시험(F) 데모 데이터는 별도 강의실 체계라 연결은 운영 모드에서
  D.library = args => { const a = X.actor(null, args); X.need(a, 'resource.edit'); return { items: db().res.filter(r => r.share === 'shared' && !r.deleted_at && !['scorm', 'html5'].includes(r.kind)).map(r => { const s = X.secOf(r.sec); return { ...resJ(r), section: s.title, section_id: s.id, term: s.term }; }) }; };
  D['res-reuse'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'resource.edit'); const src = db().res.find(r => r.id === args.src && !r.deleted_at && (r.share === 'shared' || r.sec === sec)); if (!src) fail(404, 'resource', '공유된 자원이 아니거나 없습니다.');
    const sid = args.session_id || null; if (sid && !db().sessions.some(s => s.sec === sec && s.id === sid)) fail(400, 'input', '차시가 이 강의실에 없습니다.');
    const r = { ...clone(src), id: nid(), sec, session_id: sid, visible: true, share: 'private', origin_id: src.id, owner: a.label, ver: 1, sort: 0, access: {}, created: nowIso() + Math.random(), updated_at: nowIso() }; db().res.push(r); db().vers.push({ res: r.id, ver: 1, snap: resJ(r), by: a.label, at: nowIso() }); return resJ(r); };
  D['progress-mark'] = args => { const r = resOf(args.resource); const a = X.actor(r.sec, args); X.need(a, 'course.view'); if (!a.pid) return { ok: true, preview: true };
    if (a.role === 'student' && !(access(r.sec, a.pid)[r.id] || {}).open) fail(403, 'locked', '아직 열리지 않은 자원입니다.');
    if (['assign', 'exam', 'scorm'].includes(r.kind)) { const g0 = progOf(r.id, a.pid); return { ok: true, status: g0 ? g0.st : null, linked: true }; }
    let g = progOf(r.id, a.pid); if (!g) db().prog.push(g = { res: r.id, pid: a.pid, st: 'in_progress', sc: null, t: 0, views: 0 }); else g.views++; if (!g.views) g.views = 1;
    g.t += +args.time_sec || 0; const c = r.completion || {};
    if (!done(g)) g.st = c.type === 'time' ? (g.t >= (+c.sec || 0) ? 'completed' : g.st) : c.type === 'score' ? (g.sc != null ? (g.sc >= (+c.score || 0) ? 'passed' : 'failed') : g.st) : (!c.type || c.type === 'view') ? 'completed' : g.st;
    return { ok: true, status: g.st, score: g.sc, time_sec: g.t, views: g.views }; };
  D.progress = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'grade'); const s = X.secOf(sec); const L = db();
    const rs = ordered(sec).filter(r => r.kind !== 'label');
    return { resources: rs.map(r => ({ id: r.id, title: r.title, kind: r.kind, gated: !!(r.completion && r.completion.type) })),
      students: s.enroll.filter(e => e.status === 'enrolled').map(e => { const p = L.persons.find(q => q.id === e.pid); const cells = {}; L.prog.filter(g => g.pid === e.pid && rs.some(r => r.id === g.res)).forEach(g => { cells[g.res] = { st: g.st, sc: g.sc, t: g.t }; });
        return { no: p.no, unit: p.unit, level: (L.level.find(l => l.sec === sec && l.pid === e.pid) || {}).level || 'standard', done: Object.values(cells).filter(c => ['completed', 'passed'].includes(c.st)).length, cells }; }).sort((x, y) => x.no < y.no ? -1 : 1) }; };
  D['level-set'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'grade'); if (!['basic', 'standard', 'advanced'].includes(args.level)) fail(400, 'input', '수준은 기초 · 표준 · 심화 중에서 고르세요.');
    const p = X.person(String(args.no || '')); if (!p || !X.secOf(sec).enroll.some(e => e.pid === p.id)) fail(404, 'person', '이 강의실 수강생이 아닙니다.'); const L = db(); let l = L.level.find(x => x.sec === sec && x.pid === p.id); if (!l) L.level.push(l = { sec, pid: p.id }); Object.assign(l, { level: args.level, by: a.label }); return { ok: true, no: p.no, level: args.level }; };
  D['level-auto'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'grade'); const L = db(); let n = 0; const lo = +(args.low ?? 60), hi = +(args.high ?? 85);
    L.prog.filter(g => g.res === args.res && g.sc != null).forEach(g => { let l = L.level.find(x => x.sec === sec && x.pid === g.pid); if (!l) L.level.push(l = { sec, pid: g.pid }); l.level = g.sc < lo ? 'basic' : g.sc >= hi ? 'advanced' : 'standard'; l.by = '자동(진단)'; n++; }); return { ok: true, assigned: n }; };
  D['opt-set'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); if (Array.isArray(args.adaptive) && args.adaptive.some(q => !q.if_res || typeof q.below !== 'number')) fail(400, 'input', '적응형 규칙 형식(기준 자원 · 기준 점수)을 확인하세요.');
    const o = db().opt[sec] = db().opt[sec] || { sequential: false, adaptive: [], menu: [] }; if (args.sequential !== undefined) o.sequential = !!args.sequential; if (Array.isArray(args.adaptive)) o.adaptive = args.adaptive; return { ok: true, sequential: o.sequential, adaptive: o.adaptive }; };
  D.next = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'course.view'); if (!a.pid) return { preview: true, recommend: [], next: null };
    const acc = access(sec, a.pid); const rec = []; ((db().opt[sec] || {}).adaptive || []).forEach(q => { const c = acc[q.if_res]; if (c && c.score != null) { const lowS = c.score < q.below; (lowS ? q.then : q.else || []).forEach(t => { const z = db().res.find(r => r.id === t && !r.deleted_at); if (z) rec.push({ id: z.id, title: z.title, kind: z.kind, why: lowS ? `보충 학습(기준 ${q.below}점 미만)` : `심화 학습(기준 ${q.below}점 이상)`, done: !!(acc[z.id] || {}).done }); }); } });
    const rs = ordered(sec); const nx = rs.find(r => acc[r.id] && acc[r.id].open && !acc[r.id].done && r.kind !== 'label');
    return { recommend: rec, level: (db().level.find(l => l.sec === sec && l.pid === a.pid) || {}).level || null, next: nx ? { id: nx.id, title: nx.title, kind: nx.kind } : null, done: Object.values(acc).filter(c => c.done).length, total: rs.filter(r => r.kind !== 'label' && r.visible).length }; };
  D.timeline = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'course.view'); const s = X.secOf(sec); const L = db();
    const wks = [...new Set([...L.weeks.filter(w => w.sec === sec).map(w => w.week_no), ...L.sessions.filter(x => x.sec === sec).map(x => x.week_no)])].sort((x, y) => x - y);
    return { term_from: s.from, term_to: s.to, today: today(), syllabus_weeks: ((s.syllabus || {}).weeks || []).length, weeks: wks.map(wk => { const w = L.weeks.find(x => x.sec === sec && x.week_no === wk) || {}; return { week_no: wk, title: w.title || '', from: w.starts_on || addDays(s.from, (wk - 1) * 7), to: w.ends_on || addDays(s.from, (wk - 1) * 7 + 6), plan: w.plan || {}, summary: w.summary || '',
      items: L.sessions.filter(x => x.sec === sec && x.week_no === wk).sort((p, q) => p.seq - q.seq).map(x => ({ seq: x.seq, title: x.title, kind: x.kind, open_at: x.open_at, close_at: x.close_at, resources: L.res.filter(r => r.session_id === x.id && !r.deleted_at).length })) }; }) }; };
  D['syllabus-import'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); const d = Array.isArray(args.weeks) ? args.weeks : (X.secOf(sec).syllabus || {}).weeks;
    if (!d || !d.length) fail(409, 'no_syllabus', '수업계획서 주차 계획이 없습니다. 학사 연동 후 동작하며, 지금은 주차 계획을 붙여 넣어 반영할 수 있습니다.');
    if (d.length > 30 || d.some(e => !/^\d{1,2}$/.test(String(e.week)) || +e.week < 1 || +e.week > 30)) fail(400, 'input', '주차 번호(1~30)를 확인하세요.');
    d.forEach(e => { let w = db().weeks.find(x => x.sec === sec && x.week_no === +e.week); if (!w) db().weeks.push(w = { sec, week_no: +e.week, title: '', summary: '' }); if (e.title) w.title = String(e.title).slice(0, 200); w.plan = { plan: String(e.plan || '').slice(0, 2000), method: String(e.method || '').slice(0, 100), from: 'syllabus' }; }); return { ok: true, weeks: d.length }; };
  D['template-apply'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); const v = str(args.template, 40, true, '템플릿'); const b = builtin(v); const d = b || (db().tpl.find(t => t.id === v) || {}).data; if (!d) fail(404, 'template', '템플릿을 찾을 수 없습니다.');
    const s = X.secOf(sec); const shift = d.term_start ? Math.round((new Date(s.from) - new Date(d.term_start)) / 864e5) : 0; const o = importSec(sec, d, ['structure', 'resources'], false, shift, a);
    if (b && v !== 'personal') s.mode = v; hist(sec, 'course', sec, 'template', { template: v }, a); return { ...o, ok: true }; };
  D['template-save'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); const t = { id: nid(), name: str(args.name, 60, true, '템플릿 이름'), mode: args.mode || 'personal', data: exportSec(sec, ['structure', 'resources']), by: a.label, at: nowIso() }; db().tpl.push(t); return { ok: true, id: t.id }; };
  D['template-del'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); if (!db().tpl.some(t => t.id === args.id)) fail(404, 'template', '템플릿을 찾을 수 없습니다.'); db().tpl = db().tpl.filter(t => t.id !== args.id); return { ok: true }; };
  D.copy = args => { const L = db(); const to = L.sections.find(s => s.id === args.to); if (!to) fail(404, 'section', '복사해 넣을 강의실을 찾을 수 없습니다.'); const a = X.actor(to.id, args); X.need(a, 'structure.edit');
    const from = L.sections.find(s => s.id === args.from); if (!from || from === to) fail(404, 'section', '가져올 강의실을 찾을 수 없습니다.'); X.need(X.actor(from.id, args), 'course.view');
    const parts = (Array.isArray(args.parts) ? args.parts : ['structure', 'resources']).filter(p => ['structure', 'resources', 'activities', 'boards'].includes(p)); if (!parts.length) fail(400, 'input', '가져올 항목을 고르세요.');
    const shift = args.shift_days !== undefined && args.shift_days !== '' ? int(args.shift_days, -3650, 3650, 0, 'shift_days') : Math.round((new Date(to.from) - new Date(from.from)) / 864e5);
    const o = importSec(to.id, exportSec(from.id, parts), parts, false, shift, a); hist(to.id, 'course', to.id, 'copy', { from: from.id, parts, shift_days: shift }, a); return { ...o, ok: true, shift_days: shift }; };
  D.shift = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'structure.edit'); const n = int(args.days, -3650, 3650, 0, 'days'); if (!n) fail(400, 'input', '옮길 일수를 입력하세요.'); const L = db();
    L.weeks.filter(w => w.sec === sec).forEach(w => { w.starts_on = addDay(w.starts_on, n); w.ends_on = addDay(w.ends_on, n); });
    L.sessions.filter(s => s.sec === sec).forEach(s => ['starts_at', 'ends_at', 'open_at', 'close_at'].forEach(k => { s[k] = addTs(s[k], n); }));
    L.res.filter(r => r.sec === sec).forEach(r => ['from', 'until'].forEach(k => { if (r.access && r.access[k]) r.access[k] = addTs(r.access[k], n); }));
    hist(sec, 'course', sec, 'shift', { days: n }, a); return { ok: true, days: n, sessions: L.sessions.filter(s => s.sec === sec).length }; };
  D.backups = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'backup'); return { backups: db().backups.filter(b => b.sec === sec).slice().reverse().map(b => ({ id: b.id, parts: b.parts, bytes: b.bytes, note: b.note, by: b.by, created_at: b.at, counts: { weeks: (b.data.weeks || []).length, sessions: (b.data.sessions || []).length, resources: (b.data.resources || []).length } })) }; };
  D.backup = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'backup'); const parts = (Array.isArray(args.parts) ? args.parts : ['structure', 'resources', 'activities', 'boards']).filter(p => ['structure', 'resources', 'activities', 'boards'].includes(p)); if (!parts.length) fail(400, 'input', '백업할 항목을 고르세요.');
    const data = exportSec(sec, parts); const b = { id: nid(), sec, parts, data, bytes: JSON.stringify(data).length, note: str(args.note, 200), by: a.label, at: nowIso() }; db().backups.push(b); return { ok: true, id: b.id, parts, bytes: b.bytes }; };
  D['backup-import'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'backup'); const d = args.data; if (!d || typeof d !== 'object' || d.format !== 'didisam-lms-course') fail(400, 'format', '디디쌤 강좌 백업 파일이 아닙니다.');
    const parts = (d.parts || []).filter(p => ['structure', 'resources', 'activities', 'boards'].includes(p)); const b = { id: nid(), sec, parts, data: d, bytes: JSON.stringify(d).length, note: str(args.note, 200), by: a.label, at: nowIso() }; db().backups.push(b); return { ok: true, id: b.id, parts, bytes: b.bytes }; };
  const bkOf = id => { const b = db().backups.find(x => x.id === id); if (!b) fail(404, 'backup', '백업을 찾을 수 없습니다.'); return b; };
  D['backup-get'] = args => { const b = bkOf(args.backup); X.need(X.actor(b.sec, args), 'backup'); return b.data; };
  D['backup-del'] = args => { const b = bkOf(args.backup); X.need(X.actor(b.sec, args), 'backup'); db().backups = db().backups.filter(x => x !== b); return { ok: true }; };
  D.restore = args => { const b = bkOf(args.backup); const a = X.actor(b.sec, args); X.need(a, 'backup'); if (!['admin', 'professor', 'staff'].includes(a.role)) fail(403, 'role', '복구는 교수 · 교직원 · 운영자만 할 수 있습니다.');
    const parts = (Array.isArray(args.parts) ? args.parts : b.parts).filter(p => b.parts.includes(p)); if (!parts.length) fail(400, 'input', '복구할 항목을 고르세요(백업에 든 항목만).');
    const mode = args.mode || 'replace'; if (!['replace', 'merge'].includes(mode)) fail(400, 'input', '복구 방식은 replace 또는 merge입니다.'); const o = importSec(b.sec, b.data, parts, mode === 'replace', 0, a); hist(b.sec, 'course', b.sec, 'restore', { backup: b.id, parts, mode }, a); return { ...o, ok: true, parts, mode }; };
  D.trash = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'trash'); const L = db();
    return { items: L.res.filter(r => r.sec === sec && r.deleted_at).sort((x, y) => x.deleted_at < y.deleted_at ? 1 : -1).map(r => ({ ...resJ(r), deleted_by: r.deleted_by })),
      history: L.hist.filter(h => h.sec === sec).slice(-200).reverse().map(h => ({ id: h.id, obj: h.obj, obj_id: h.obj_id, action: h.action, by: h.by, at: h.at, title: (h.snap && h.snap.title) || (L.res.find(r => r.id === h.obj_id) || {}).title || null })) }; };
  D.perms = args => { const a = X.actor(null, args); return { roles: ['professor', 'ta', 'staff', 'grader', 'student'], perms: PERMS, grid: Object.fromEntries(['professor', 'ta', 'staff', 'grader', 'student'].map(r => [r, Object.fromEntries(PERMS.map(p => [p, X.can({ role: r }, p)]))])), can_edit: X.can(a, 'perm.manage') }; };
  D['perm-set'] = args => { if (!['owner', 'sub'].includes(S.me.role)) fail(403, 'role', '정 · 부운영자만 할 수 있습니다.'); const a = X.actor(null, args); X.need(a, 'perm.manage'); const r = str(args.role, 20, true, '역할'), p = str(args.perm, 40, true, '권한');
    if (!['professor', 'ta', 'staff', 'grader', 'student'].includes(r) || !PERMS.includes(p)) fail(400, 'input', '역할 또는 권한 이름이 올바르지 않습니다.'); const al = args.allowed === undefined ? true : !!args.allowed;
    if (r === 'professor' && p === 'course.view' && !al) fail(400, 'input', '교수의 강의실 보기 권한은 끌 수 없습니다.'); (db().perm[r] = db().perm[r] || {})[p] = al; return { ok: true, role: r, perm: p, allowed: al }; };
  D['file-put'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'board.write'); const b64 = String(args.b64 || ''); const size = Math.floor(b64.replace(/=+$/, '').length * 3 / 4);
    if (!size) fail(400, 'input', '빈 파일입니다.'); if (size > 3 * 1024 * 1024) fail(413, 'too_large', '파일은 3MB 이하만 올릴 수 있습니다(대용량은 CDN 연동 후 동작).'); const name = str(args.name, 200, true, '파일 이름');
    if (/\.(exe|bat|cmd|com|scr|js|vbs|ps1|sh|msi|jar)$/i.test(name)) fail(400, 'input', '실행 파일은 올릴 수 없습니다.'); if (size > 300 * 1024) fail(413, 'too_large', '데모 모드는 브라우저 저장 공간 때문에 300KB까지만 올릴 수 있습니다(운영 모드 3MB).');
    const f = { id: nid(), sec, name, mime: args.mime || 'application/octet-stream', size, b64 }; db().files.push(f); return { id: f.id, name, size, mime: f.mime }; };
  D.file = args => { const f = db().files.find(x => x.id === args.id); if (!f) fail(404, 'file', '파일을 찾을 수 없습니다.'); X.need(X.actor(f.sec, args), 'course.view'); return { id: f.id, name: f.name, mime: f.mime, size: f.size, b64: f.b64 }; };
  D['scorm-pkg'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'resource.edit'); const m = args.manifest || {};
    if (!['1.2', '2004', 'none'].includes(m.version)) fail(400, 'input', '패키지 정보(SCORM 1.2 · 2004 · 비표준 HTML5)를 확인하세요.'); if (!Array.isArray(m.scos) || !m.scos.length || m.scos.length > 300) fail(400, 'input', '실행할 SCO(시작 파일)가 없습니다.');
    if (m.scos.some(s => !s.id || !s.href || /(^\/|\.\.|\\|^[a-zA-Z][a-zA-Z0-9+.-]*:)/.test(s.href))) fail(400, 'input', 'SCO 시작 경로는 패키지 안의 상대 경로여야 합니다.');
    const sid = args.session_id || null; if (sid && !db().sessions.some(s => s.sec === sec && s.id === sid)) fail(400, 'input', '차시가 이 강의실에 없습니다.'); const pkg = { id: nid(), version: m.version, manifest: m };
    const r = { id: nid(), sec, session_id: sid, kind: m.version === 'none' ? 'html5' : 'scorm', title: str(args.title, 200) || String(m.title || '콘텐츠 패키지').slice(0, 200), body: { version: m.version, scos: m.scos.map(s => ({ id: s.id, title: s.title })), pkg: pkg.id }, visible: true, sort: 0, ver: 1, completion: { type: m.version === 'none' ? 'view' : 'scorm' }, access: {}, share: 'private', origin_id: null, owner: a.label, created: nowIso() + Math.random(), updated_at: nowIso(), deleted_at: null };
    pkg.res = r.id; db().res.push(r); db().pkgs.push(pkg); db().vers.push({ res: r.id, ver: 1, snap: resJ(r), by: a.label, at: nowIso() }); return { ok: true, id: r.id, pkg_id: pkg.id }; };
  D['scorm-file-put'] = args => ({ ok: true, path: args.path, size: 0 }); // 데모: 파일은 브라우저 캐시(Cache Storage)에 둔다
  const pkgByRes = id => { const r = resOf(id); const g = db().pkgs.find(p => p.res === r.id); if (!g || r.deleted_at) fail(404, 'resource', '콘텐츠 패키지를 찾을 수 없습니다.'); return { r, g }; };
  D.scorm = args => { const { r, g } = pkgByRes(args.resource); const a = X.actor(r.sec, args); X.need(a, 'course.view'); const att = {}; db().scorm.filter(t => t.res === r.id && t.who === X.who(a)).forEach(t => { att[t.sco] = { cmi: t.cmi, status: t.status, success: t.success, score: t.score, total_sec: t.total_sec, sessions: t.sessions }; });
    return { id: r.id, pkg_id: g.id, title: r.title, kind: r.kind, version: g.version, manifest: g.manifest, bytes: 0, files: (g.manifest.files || []).length, me: { no: a.no, role: a.role }, att }; };
  const dur = v => { if (!v) return 0; let m = /^(\d{1,4}):(\d{2}):(\d{2}(\.\d{1,2})?)$/.exec(v); if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3]; m = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/.exec(v); if (m) return (+m[1] || 0) * 31557600 + (+m[2] || 0) * 2592000 + (+m[3] || 0) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0); return 0; };
  const durFmt = (s, v) => v === '1.2' ? `${String(Math.floor(s / 3600)).padStart(4, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}` : `PT${Math.floor(s / 3600)}H${Math.floor(s % 3600 / 60)}M${(Math.round(s % 60 * 100) / 100).toFixed(2)}S`;
  X.dur = dur; X.durFmt = durFmt;
  D['scorm-commit'] = args => { const { r, g } = pkgByRes(args.resource); const a = X.actor(r.sec, args); X.need(a, 'course.view'); let cmi = args.cmi; const sco = str(args.sco, 200, true, 'SCO'); const fin = !!args.finish;
    if (!cmi || typeof cmi !== 'object' || Array.isArray(cmi)) fail(400, 'input', 'cmi 데이터 형식이 올바르지 않습니다.'); if (Object.keys(cmi).length > 2000) fail(413, 'too_large', 'cmi 항목이 너무 많습니다.');
    if (Object.entries(cmi).some(([k, v]) => !/^(cmi|adl)\.[A-Za-z0-9_.]{1,200}$/.test(k) || !['string', 'number'].includes(typeof v) || String(v).length > (/suspend_data$/.test(k) ? 64000 : 4096))) fail(400, 'input', 'cmi 요소 이름 또는 값이 SCORM 데이터 모델에 맞지 않습니다.');
    if (!(g.manifest.scos || []).some(s => s.id === sco)) fail(404, 'sco', '패키지에 없는 SCO입니다.'); const L = db(); let t = L.scorm.find(x => x.res === r.id && x.who === X.who(a) && x.sco === sco); const v = g.version; let st, su, sc, ses;
    if (v === '1.2') { st = cmi['cmi.core.lesson_status']; su = ['passed', 'failed'].includes(st) ? st : null; sc = cmi['cmi.core.score.raw'] !== undefined && cmi['cmi.core.score.raw'] !== '' ? +cmi['cmi.core.score.raw'] : null; ses = dur(cmi['cmi.core.session_time']); }
    else { st = cmi['cmi.completion_status']; su = cmi['cmi.success_status']; sc = cmi['cmi.score.scaled'] !== undefined && cmi['cmi.score.scaled'] !== '' ? Math.round(+cmi['cmi.score.scaled'] * 10000) / 100 : cmi['cmi.score.raw'] !== undefined && cmi['cmi.score.raw'] !== '' ? +cmi['cmi.score.raw'] : null; ses = dur(cmi['cmi.session_time']); }
    const tot = (t ? t.total_sec : 0) + (fin ? ses : 0); cmi = { ...cmi }; delete cmi['cmi.core.session_time']; delete cmi['cmi.session_time']; cmi[v === '1.2' ? 'cmi.core.total_time' : 'cmi.total_time'] = durFmt(tot, v === '1.2' ? '1.2' : '2004');
    if (v === '1.2') cmi['cmi.core.entry'] = fin && cmi['cmi.core.exit'] !== 'suspend' ? '' : 'resume';
    if (!t) L.scorm.push(t = { res: r.id, who: X.who(a), pid: a.pid, sco, sessions: 0 }); Object.assign(t, { cmi, status: st ?? null, success: su ?? null, score: sc, total_sec: tot, at: nowIso() }); if (fin) t.sessions++;
    let pst = null; if (a.pid) { const T = L.scorm.filter(x => x.res === r.id && x.who === X.who(a)); const ok = T.filter(x => ['completed', 'passed'].includes(x.status) || x.success === 'passed').length;
      pst = T.some(x => x.success === 'failed') ? 'failed' : ok >= Math.max(1, (g.manifest.scos || []).length) ? (T.some(x => x.success === 'passed' || x.status === 'passed') ? 'passed' : 'completed') : 'in_progress';
      const scs = T.filter(x => x.score != null); let gg = progOf(r.id, a.pid); if (!gg) L.prog.push(gg = { res: r.id, pid: a.pid, views: 1 }); else if (fin) gg.views++; Object.assign(gg, { st: pst, sc: scs.length ? scs.reduce((s, x) => s + x.score, 0) / scs.length : null, t: Math.round(T.reduce((s, x) => s + x.total_sec, 0)) }); }
    return { ok: true, status: st ?? null, success: su ?? null, score: sc, total_sec: tot, total_time: cmi[v === '1.2' ? 'cmi.core.total_time' : 'cmi.total_time'], progress: pst }; };
  D['scorm-report'] = args => { const { r } = pkgByRes(args.resource); const a = X.actor(r.sec, args); X.need(a, 'grade'); return { rows: db().scorm.filter(t => t.res === r.id).map(t => ({ who: t.pid ? X.pno(t.pid) : '미리보기', sco: t.sco, status: t.status, success: t.success, score: t.score, total_sec: t.total_sec, sessions: t.sessions, updated_at: t.at })) }; };
  D.menu = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'course.view'); const p = db().menuPref[sec + '|' + X.who(a)]; return { modules: (db().opt[sec] || {}).menu || [], pref: p ? { hidden: p.hidden, order: p.order } : { hidden: [], order: [] }, can_edit: X.can(a, 'menu.edit') }; };
  D['menu-set'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'menu.edit'); if (!Array.isArray(args.modules) || args.modules.length > 40 || args.modules.some(q => !/^[a-z0-9_-]{1,30}$/.test(q.id || ''))) fail(400, 'input', '메뉴 모듈 형식을 확인하세요.');
    const o = db().opt[sec] = db().opt[sec] || { sequential: false, adaptive: [], menu: [] }; o.menu = args.modules.map(q => ({ id: q.id, on: q.on !== false })); return { ok: true }; };
  D['menu-pref'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'course.view'); const f = v => (Array.isArray(v) ? v : []).filter(q => /^[a-z0-9_-]{1,30}$/.test(q)); db().menuPref[sec + '|' + X.who(a)] = { hidden: f(args.hidden), order: f(args.order) }; return { ok: true }; };
  /* 데모: 강의자료 관리(SFR-038) */
  const kindOf = (n, m) => m === 'application/pdf' || /\.pdf$/i.test(n) ? 'pdf' : /^image\//.test(m || '') || /\.(png|jpe?g|gif|webp|svg)$/i.test(n) ? 'image' : /^text\//.test(m || '') || /\.(txt|csv|md|json|log)$/i.test(n) ? 'text' : /\.(hwp|hwpx|doc|docx|ppt|pptx|xls|xlsx|odt|odp|ods)$/i.test(n) ? 'convert' : 'none';
  const matRes = args => { const r = resOf(args.resource); if (r.deleted_at) fail(404, 'resource', '학습 자원을 찾을 수 없습니다.'); const a = X.actor(r.sec, args); X.need(a, 'course.view'); if (a.role === 'student' && !(access(r.sec, a.pid)[r.id] || {}).open) fail(403, 'locked', '아직 열리지 않은 자원입니다.');
    const ids = r.kind === 'file' ? [r.body.file_id] : r.kind === 'folder' ? (r.body.files || []).map(f => f.file_id) : []; return { r, a, ids: ids.filter(Boolean), ok: r.body.download !== false || X.mgr(a) }; };
  const L2 = () => { const L = db(); L.mlib = L.mlib || []; L.mdl = L.mdl || []; L.mcv = L.mcv || []; return L; };
  D.material = args => { const { r, a, ids, ok } = matRes(args); const L = L2(); return { id: r.id, title: r.title, kind: r.kind, download: r.body.download !== false, can_download: ok,
    files: L.files.filter(f => ids.includes(f.id)).sort((x, y) => x.name < y.name ? -1 : 1).map(f => { const c = L.mcv.find(x => x.file === f.id); return { file_id: f.id, name: f.name, mime: f.mime, size: f.size, preview: kindOf(f.name, f.mime), convert: c ? { status: c.status, error: c.error || null, done_at: c.done_at || null } : null, mine: L.mdl.filter(d => d.res === r.id && d.file === f.id && d.who === X.who(a) && d.mode === 'download').length }; }) }; };
  D['material-file'] = args => { const { r, a, ids, ok } = matRes(args); if (!ids.includes(args.file_id)) fail(404, 'file', '이 자원의 파일이 아닙니다.'); const mode = args.mode || 'view'; if (!['view', 'download'].includes(mode)) fail(400, 'input', '방식은 view · download입니다.');
    if (mode === 'download' && !ok) fail(403, 'no_download', '이 자료는 내려받기가 허용되지 않았습니다. 화면에서 보기만 할 수 있습니다.'); const f = db().files.find(x => x.id === args.file_id);
    if (mode === 'view' && !['pdf', 'image', 'text'].includes(kindOf(f.name, f.mime))) fail(415, 'no_preview', '이 형식은 바로 보기를 지원하지 않습니다(문서 변환 연동 후 동작).');
    L2().mdl.push({ res: r.id, file: f.id, who: X.who(a), pid: a.pid, mode, at: nowIso() }); return { name: f.name, mime: f.mime, size: f.size, mode, b64: f.b64 }; };
  D['convert-request'] = args => { const { r, a, ids } = matRes(args); if (!ids.includes(args.file_id)) fail(404, 'file', '이 자원의 파일이 아닙니다.'); const f = db().files.find(x => x.id === args.file_id); if (kindOf(f.name, f.mime) !== 'convert') fail(400, 'input', '변환이 필요한 문서(HWP · DOC · PPT · XLS)만 요청합니다.');
    let c = L2().mcv.find(x => x.file === f.id); if (!c) L2().mcv.push(c = { file: f.id, status: 'queued', by: a.label, at: nowIso() }); else if (c.status === 'failed') c.status = 'queued'; void r; return { ok: true, status: c.status, note: 'HTML 변환 엔진 연동 후 동작합니다. 지금은 변환 대기열에 넣었습니다.' }; };
  D.converted = args => { const { r, a, ids } = matRes(args); if (!ids.includes(args.file_id)) fail(404, 'file', '이 자원의 파일이 아닙니다.'); const c = L2().mcv.find(x => x.file === args.file_id); if (!c || c.status !== 'done') fail(409, 'not_ready', '아직 변환되지 않았습니다(HTML 변환 엔진 연동 후 동작).'); L2().mdl.push({ res: r.id, file: args.file_id, who: X.who(a), pid: a.pid, mode: 'view', at: nowIso() }); return { html: c.html, done_at: c.done_at }; };
  D['convert-done'] = args => { if (!['owner', 'sub'].includes(S.me.role)) fail(403, 'role', '정 · 부운영자만 할 수 있습니다.'); const a = X.actor(null, args); if (a.role !== 'admin') fail(403, 'role', '변환 결과는 운영자(엔진 서비스 계정)만 넣을 수 있습니다.'); const c = L2().mcv.find(x => x.file === args.file_id); if (!c) fail(404, 'convert', '변환 요청이 없습니다.');
    if (!['done', 'failed'].includes(args.status)) fail(400, 'input', '상태는 done · failed입니다.'); Object.assign(c, { status: args.status, html: args.status === 'done' ? String(args.html || '') : null, error: args.status === 'failed' ? String(args.error || '') : null, done_at: nowIso() }); return { ok: true, status: c.status }; };
  D.downloads = args => { const { r, a } = matRes(args); X.need(a, 'grade'); const L = L2(); const g = {}; L.mdl.filter(d => d.res === r.id).forEach(d => { const k = d.who + '|' + d.file; const x = g[k] = g[k] || { no: d.pid ? X.pno(d.pid) : '운영자', file: (L.files.find(f => f.id === d.file) || {}).name, views: 0, downloads: 0, last_at: d.at, pid: d.pid }; x[d.mode === 'view' ? 'views' : 'downloads']++; if (d.at > x.last_at) x.last_at = d.at; });
    return { rows: Object.values(g).map(({ pid, ...x }) => x), not_yet: X.secOf(r.sec).enroll.filter(e => e.status === 'enrolled' && !L.mdl.some(d => d.res === r.id && d.pid === e.pid)).map(e => X.pno(e.pid)).sort(), download: r.body.download !== false }; };
  const libActor = args => { const a = X.actor(null, args); if (!['admin', 'professor', 'staff', 'ta'].includes(a.role)) fail(403, 'role', '개인 자료함은 교수자 · 조교 · 교직원이 씁니다.'); return a; };
  D.mylib = args => { const a = libActor(args); const L = L2(); return { items: L.mlib.filter(l => l.owner === X.who(a)).slice().reverse().map(l => ({ id: l.id, file_id: l.file, name: l.name, mime: l.mime, size: l.size, tags: l.tags, added_at: l.at, preview: kindOf(l.name, l.mime), alive: L.files.some(f => f.id === l.file), used: L.res.filter(z => !z.deleted_at && (z.body || {}).lib === l.id).length })) }; };
  D['mylib-add'] = args => { const a = libActor(args); const f = db().files.find(x => x.id === args.file_id); if (!f) fail(404, 'file', '파일을 찾을 수 없습니다.'); X.need(X.actor(f.sec, args), 'resource.edit'); const L = L2(); let l = L.mlib.find(x => x.owner === X.who(a) && x.file === f.id);
    if (!l) L.mlib.push(l = { id: nid(), owner: X.who(a), file: f.id, name: f.name, mime: f.mime, size: f.size, at: nowIso() }); l.tags = (Array.isArray(args.tags) ? args.tags : []).map(t => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10); return { ok: true, id: l.id }; };
  D['mylib-del'] = args => { const a = libActor(args); const L = L2(); const n = L.mlib.length; L.mlib = L.mlib.filter(l => !(l.id === args.id && l.owner === X.who(a))); if (L.mlib.length === n) fail(404, 'lib', '내 자료함에 없는 자료입니다.'); return { ok: true }; };
  D['mylib-use'] = args => { const sec = X.secOf(args.section).id; const a = X.actor(sec, args); X.need(a, 'resource.edit'); const L = L2(); const l = L.mlib.find(x => x.id === args.id && x.owner === X.who(X.actor(null, args))); if (!l) fail(404, 'lib', '내 자료함에 없는 자료입니다.');
    if (args.session_id && !L.sessions.some(s2 => s2.sec === sec && s2.id === args.session_id)) fail(400, 'input', '차시가 이 강의실에 없습니다.'); const src = L.files.find(f => f.id === l.file); if (!src) fail(410, 'gone', '원본 파일이 지워져 재사용할 수 없습니다.');
    const f = { ...clone(src), id: nid(), sec }; L.files.push(f); const r = { id: nid(), sec, session_id: args.session_id || null, kind: 'file', title: str(args.title, 200) || l.name, body: { file_id: f.id, name: l.name, size: l.size, mime: l.mime, lib: l.id, download: args.download !== false }, visible: true, sort: 0, ver: 1, completion: {}, access: {}, share: 'private', origin_id: null, owner: a.label, created: nowIso() + Math.random(), updated_at: nowIso(), deleted_at: null };
    L.res.push(r); L.vers.push({ res: r.id, ver: 1, snap: resJ(r), by: a.label, at: nowIso() }); return { ok: true, id: r.id, file_id: f.id }; };
  X.gets('b', ['material', 'downloads', 'converted', 'mylib']);
  X.gets('b', ['ext-list', 'sections', 'templates', 'library', 'perms', 'file', 'overview', 'timeline', 'progress', 'next', 'backups', 'backup-get', 'trash', 'res-versions', 'menu', 'scorm', 'scorm-file', 'scorm-report']);

  /* ══════════ ZIP 풀기(브라우저) · 매니페스트 읽기 ══════════ */
  async function unzip(buf) {
    const dv = new DataView(buf); const u8 = new Uint8Array(buf); let eo = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
    if (eo < 0) throw new Error('ZIP 파일이 아닙니다.');
    const n = dv.getUint16(eo + 10, true); let p = dv.getUint32(eo + 16, true); const out = []; const td = new TextDecoder();
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP 목차가 손상되었습니다.');
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nlen)); p += 46 + nlen + xlen + clen;
      if (name.endsWith('/')) continue;
      const ds = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true); const raw = u8.subarray(ds, ds + csize);
      let data; if (method === 0) data = raw.slice(); else if (method === 8) { if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저는 압축 해제를 지원하지 않습니다.'); data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); } else throw new Error('지원하지 않는 압축 방식입니다.');
      out.push({ name: name.replace(/^\.?\//, ''), data });
    }
    return out;
  }
  X.unzip = unzip;
  function readManifest(files) {
    const mf = files.find(f => /(^|\/)imsmanifest\.xml$/i.test(f.name));
    const MIME = { html: 'text/html', htm: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', mp3: 'audio/mpeg', xml: 'application/xml', txt: 'text/plain', woff: 'font/woff', woff2: 'font/woff2', webp: 'image/webp', pdf: 'application/pdf', vtt: 'text/vtt' };
    files.forEach(f => { f.mime = MIME[(f.name.split('.').pop() || '').toLowerCase()] || 'application/octet-stream'; });
    if (!mf) { const st = files.find(f => /^index\.html?$/i.test(f.name)) || files.find(f => /\.html?$/i.test(f.name)); if (!st) throw new Error('imsmanifest.xml도 시작 HTML도 없는 패키지입니다.');
      return { version: 'none', identifier: 'html5', title: st.name, scos: [{ id: 'main', title: '콘텐츠', href: st.name }], files: files.map(f => f.name) }; }
    const base = mf.name.replace(/imsmanifest\.xml$/i, ''); const x = new DOMParser().parseFromString(new TextDecoder().decode(mf.data), 'application/xml');
    if (x.getElementsByTagName('parsererror').length) throw new Error('imsmanifest.xml을 읽지 못했습니다.');
    const all = t => [...x.getElementsByTagName('*')].filter(e => e.localName === t); const txt = e => (e && e.textContent || '').trim();
    const sv = txt(all('schemaversion')[0]); const xml = new XMLSerializer().serializeToString(x);
    const version = /2004|CAM 1\.3|adlcp_v1p3/i.test(sv + ' ' + xml.slice(0, 3000)) ? '2004' : '1.2';
    const res = Object.fromEntries(all('resource').map(r => [r.getAttribute('identifier'), r]));
    const scos = [];
    all('item').forEach(it => { const ref = it.getAttribute('identifierref'); const r = ref && res[ref]; if (!r) return; const st = (r.getAttributeNS && [...r.attributes].find(a => /scormtype$/i.test(a.name)) || {}).value || 'sco'; if (st.toLowerCase() !== 'sco' && version === '1.2' && st) { /* asset도 실행 가능 */ }
      const xb = (r.getAttribute('xml:base') || ''); const href = base + xb + (r.getAttribute('href') || '') + (it.getAttribute('parameters') || '');
      const title = txt([...it.children].find(c => c.localName === 'title')) || ref; const mast = txt([...it.children].find(c => c.localName === 'masteryscore')); const ld = txt([...it.children].find(c => c.localName === 'dataFromLMS' || c.localName === 'datafromlms'));
      scos.push({ id: it.getAttribute('identifier') || ref, title: title.slice(0, 200), href, mastery: mast || null, launch_data: ld || null }); });
    if (!scos.length) Object.values(res).forEach(r => { if (r.getAttribute('href')) scos.push({ id: r.getAttribute('identifier'), title: r.getAttribute('identifier'), href: base + r.getAttribute('href') }); });
    const org = all('organization')[0]; const title = txt(org && [...org.children].find(c => c.localName === 'title')) || 'SCORM 패키지';
    return { version, identifier: x.documentElement.getAttribute('identifier') || '', title: title.slice(0, 200), scos: scos.slice(0, 300), files: files.map(f => f.name) };
  }
  X.readManifest = readManifest;

  /* ══════════ 콘텐츠 패키지 서비스 워커(/lms/bpkg/<pkg>/<경로>) ══════════ */
  const PKG_CACHE = 'lmsb-pkg-v1';
  async function pkgSW() {
    if (!('serviceWorker' in navigator)) throw new Error('이 브라우저는 서비스 워커를 지원하지 않아 패키지를 재생할 수 없습니다.');
    const reg = await navigator.serviceWorker.register('lms/bpkg-sw.js', { scope: 'lms/bpkg/' });
    const w = reg.active || reg.waiting || reg.installing; if (w && w.state !== 'activated') await new Promise(ok => { const f = () => { if (w.state === 'activated') { w.removeEventListener('statechange', f); ok(); } }; w.addEventListener('statechange', f); setTimeout(ok, 4000); });
    return reg;
  }
  const b64of = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  X.b64of = b64of;
  async function uploadPackage(file, sessionId, title) {
    const files = await unzip(await file.arrayBuffer()); const m = readManifest(files);
    const r = await X.call('b', 'scorm-pkg', { section: X.sec, session_id: sessionId || null, title: title || m.title, manifest: m });
    const c = await caches.open(PKG_CACHE);
    for (const f of files) {
      await c.put(new Request(new URL(`lms/bpkg/${r.pkg_id}/${f.name}`, location.href).href), new Response(new Blob([f.data], { type: f.mime }), { headers: { 'content-type': f.mime } }));
      if (LIVE_ON()) await X.call('b', 'scorm-file-put', { pkg: r.pkg_id, path: f.name, mime: f.mime, b64: b64of(f.data) });
    }
    return { ...r, manifest: m, n: files.length };
  }
  X.uploadPackage = uploadPackage;

  /* SCORM 런타임은 lms/bcd-rte.js(학습자 앱과 공용) — 처음 재생할 때 불러온다 */
  X.loadRTE = () => window.LMSRTE ? Promise.resolve() : (X._rteP = X._rteP || new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'lms/bcd-rte.js?v=30.1'; sc.onload = ok; sc.onerror = () => no(new Error('SCORM 런타임을 불러오지 못했습니다.')); document.head.appendChild(sc); }));
  /* 플레이어: 위쪽 창(window)에 API를 붙이고 iframe으로 SCO를 연다 */
  let curRTE = null;
  async function play(resId) {
    let info; try { info = await X.call('b', 'scorm', { resource: resId }); } catch (e) { return X.err(e); }
    try { await pkgSW(); await X.loadRTE(); } catch (e) { return toast(e.message, 'warn'); }
    const scos = info.manifest.scos || []; let idx = 0;
    const w = modal(`${info.title} — ${info.version === 'none' ? '비표준 HTML5' : 'SCORM ' + info.version}`, `<div class="lmsb-player"><div class="lmsb-ptop"><select data-lmsb-sco>${scos.map((s, i) => `<option value="${i}">${esc(s.title || s.id)}</option>`).join('')}</select><span class="mini" data-lmsb-pst></span></div><iframe data-lmsb-frame title="학습 콘텐츠" class="lmsb-frame"></iframe><p class="mini">학습 기록(cmi)은 ${LIVE_ON() ? '서버' : '이 브라우저(데모)'}에 저장되고 진도 · 이수 조건에 바로 반영됩니다. 신분: ${esc(info.me.no || '운영자 미리보기(기록은 미리보기로 남음)')}</p></div>`, [{ id: 'close', label: '닫기', run: () => { stop(); } }], true);
    const frame = w.querySelector('[data-lmsb-frame]'); const pst = w.querySelector('[data-lmsb-pst]');
    const stop = () => { if (curRTE) { curRTE.abandon(); curRTE = null; } delete window.API; delete window.API_1484_11; setTimeout(() => X.refresh(), 400); };
    w.querySelector('.mh .x').addEventListener('click', stop, { once: true });
    const open = i => { if (curRTE) curRTE.abandon(); const sco = scos[i];
      curRTE = LMSRTE.make(info.version === '2004' ? '2004' : '1.2', sco, (info.att || {})[sco.id], info.me, { res: resId, commit: b => X.call('b', 'scorm-commit', b), onCommit: (r, fin) => { pst.textContent = `저장됨 · 상태 ${r.status || '—'}${r.score != null ? ' · 점수 ' + r.score : ''} · 누적 ${r.total_time || ''}`; if (fin) (info.att = info.att || {})[sco.id] = { cmi: { ...curRTE.cmi } }; }, onError: e => { pst.textContent = '저장 실패: ' + e.message; } });
      delete window.API; delete window.API_1484_11; if (info.version === '2004') window.API_1484_11 = curRTE.api; else window.API = curRTE.api; window.__lmsbRTE = curRTE;
      if (info.version === 'none') X.call('b', 'progress-mark', { resource: resId }).catch(() => {});
      frame.src = `lms/bpkg/${info.pkg_id}/${sco.href}`; };
    w.querySelector('[data-lmsb-sco]').addEventListener('change', e => open(+e.target.value)); open(idx);
  }
  X.play = play;

  /* ══════════ 화면 ══════════ */
  X.menu('lmsb', '강의실 구성', 'learn');
  const KN = { file: '파일', url: 'URL', page: '웹페이지', folder: '폴더', label: '표지', video: '영상', scorm: 'SCORM(표준)', html5: 'HTML5(비표준)', assign: '과제 연결', exam: '시험 연결' };
  const SKN = { class: '대면', online: '온라인', live: '실시간', exam: '시험', holiday: '휴강' };
  const LVN = { basic: '기초', standard: '표준', advanced: '심화' };
  const PN = { 'course.view': '강의실 보기', 'structure.edit': '주차 · 차시 편집', 'resource.edit': '자원 편집', 'resource.share': '자원 공유', backup: '백업 · 복구', trash: '휴지통', 'menu.edit': '메뉴 구성', 'perm.manage': '권한 관리', 'activity.manage': '학습활동 운영', 'activity.join': '학습활동 참여', grade: '채점 · 진도 조회', 'board.manage': '게시판 관리', 'board.write': '게시판 쓰기' };
  const MODS = { get list() { return X.modules(); } };
  /* 2단계(UX): 11개 탭 → 바로 보이는 4개(구성 · 주차 일정 · 학습 경로 · 수강 · 출결) + 더보기 5개. 공유 자료 + 내 자료함 = 「자료함」, 백업 · 복구 + 휴지통 · 버전 = 「백업 · 휴지통」
     옛 탭 키(trash · mylib)도 그대로 열린다(합친 화면으로). */
  const TABS = [['build', '구성'], ['timeline', '주차 일정'], ['path', '학습 경로'], ['enroll', '수강 · 출결 현황'], ['tpl', '템플릿 · 이전 학기 복사'], ['lib', '자료함'], ['backup', '백업 · 휴지통'], ['role', '역할 · 메뉴'], ['scorm', '표준 학습 패키지']];
  const TALIAS = { trash: 'backup', mylib: 'lib' };
  let OV = null;
  const stIcon = r => r.open === false ? tag('잠김', 'r') : r.done ? tag(r.status === 'passed' ? '합격' : '완료', 'g') : r.status === 'failed' ? tag('미달', 'y') : r.status ? tag('진행 중', 'y') : '';
  function resRow(r, me) {
    const can = me.can['resource.edit']; const cond = []; const A = r.access || {};
    if ((A.after || []).length) cond.push('선수 자원 ' + A.after.length); if (A.min_score) cond.push(`점수 ${A.min_score.score}↑`); if ((A.levels || []).length) cond.push('수준 ' + A.levels.map(l => LVN[l]).join('·')); if (A.from) cond.push('공개 ' + fmtD(A.from)); if (A.until) cond.push('마감 ' + fmtD(A.until));
    const comp = (r.completion || {}).type; const cN = { view: '열람 시 완료', time: `${(r.completion || {}).sec || 0}초 학습`, score: `${(r.completion || {}).score || 0}점 이상`, scorm: 'SCORM 상태' }[comp];
    return `<div class="lmsb-res ${r.open === false ? 'locked' : ''} k-${esc(r.kind)}"><span class="lmsb-kind">${esc(KN[r.kind] || r.kind)}</span><div class="lmsb-rt"><b>${esc(r.title)}</b>${r.kind === 'label' ? `<p class="mini">${esc((r.body || {}).text || '')}</p>` : ''}
      <span class="mini">${cN ? '이수: ' + esc(cN) : ''}${cond.length ? ' · 조건: ' + esc(cond.join(' · ')) : ''}${r.visible ? '' : ' · 비공개'}${r.share === 'shared' ? ' · 공유' : ''}${r.origin_id ? ' · 재사용' : ''} · v${r.ver}</span>${r.why ? `<span class="mini lmsb-why">${esc(r.why)}</span>` : ''}</div>
      <div class="lmsb-ra">${stIcon(r)}${r.kind !== 'label' ? `<button class="btn sm" data-act="lmsb-open" data-id="${esc(r.id)}" ${r.open === false ? 'disabled' : ''}>학습하기</button>` : ''}${can ? `<button class="btn sm ghost" data-act="lmsb-res-edit" data-id="${esc(r.id)}">편집</button><details class="uxmore lmsb-rmore"><summary aria-label="다른 작업">${ic('dots', 16)}</summary><div class="uxpop" role="menu"><button data-act="lmsb-vers" data-id="${esc(r.id)}">버전 기록</button><button data-act="lmsb-res-del" data-id="${esc(r.id)}">삭제(휴지통으로)</button></div></details>` : ''}</div></div>`;
  }
  const allRes = () => OV ? [...OV.common, ...OV.weeks.flatMap(w => w.sessions.flatMap(s => s.resources))] : [];
  const allSes = () => OV ? OV.weeks.flatMap(w => w.sessions.map(s => ({ ...s, week_no: w.week_no }))) : [];
  async function viewB() {
    if (!X.sec) return X.head('강의실 구성', '학사 연동으로 개설된 분반이 없습니다.', []) + `<div class="empty">강의실(분반)이 없습니다. 학사 연동(묶음 A) 또는 분반 등록 후 이용하세요.</div>`;
    OV = await X.call('b', 'overview', { section: X.sec }); const me = OV.me; const tb = UI.lmsbT || 'build'; const sx = OV.section;
    const top = X.head('강의실 구성', `${esc(sx.term_name)} · ${esc(sx.course)}-${esc(sx.no)} · ${esc({ online: '온라인', blended: '블렌디드', offline: '오프라인', hyflex: '하이플렉스' }[sx.mode] || sx.mode)} · 내 역할 <b>${esc(me.role_name)}</b>${me.level ? ' · 수준 ' + esc(LVN[me.level]) : ''}`, [...OV.staff.map(s => ({ no: s.no, role: ({ co_professor: 'professor' })[s.role] || s.role })), ...OV.roster.map(r => ({ no: r.no, role: 'student' }))]);
    const vis = TABS.filter(([k]) => me.role !== 'student' || ['build', 'timeline', 'path'].includes(k));
    let b = ''; const tbv = TALIAS[tb] || tb;
    /* 지금 할 일: 이번 주 주차 · 자료 없는 차시 · 승인 대기 */
    const td = new Date().toISOString().slice(0, 10); const curW = OV.weeks.find(w => w.starts_on && w.ends_on && String(w.starts_on).slice(0, 10) <= td && td <= String(w.ends_on).slice(0, 10)); const curWeekNo = curW ? curW.week_no : null;
    const emptySes = allSes().filter(x => !x.resources.length); const pend = (OV.enroll || {}).pending || 0; let todo = '';
    if (me.role === 'student') todo = '';
    else if (!OV.weeks.length) todo = me.can['structure.edit'] ? X.todo('이 강의실은 아직 비어 있습니다. 템플릿으로 15주 뼈대를 먼저 만드세요.', `<button class="btn sm pri" data-act="lmsb-quick" data-v="${esc(sx.mode === 'online' ? 'online' : sx.mode === 'offline' ? 'offline' : 'blended')}">템플릿으로 15주 만들기</button>`) : '';
    else todo = X.todo(`${curW ? `이번 주 <b>${curW.week_no}주차</b>${curW.title && !/^\d+(주차|단계)$/.test(curW.title) ? ' ' + esc(curW.title) : ''} · 차시 ${curW.sessions.length}개` : `주차 ${OV.weeks.length}개`} · 자료 없는 차시 <b>${emptySes.length}</b>개${pend ? ` · 수강 승인 대기 <b>${pend}</b>명` : ''}`,
      emptySes.length && me.can['resource.edit'] ? `<button class="btn sm" data-act="lmsb-todo-res" data-s="${esc(emptySes[0].id)}">${emptySes[0].week_no}-${emptySes[0].seq}차시에 자료 넣기</button>` : '');
    if (tb === 'build' || !vis.some(v => v[0] === tb)) {
      const sAll = allSes();
      b = `${me.can['structure.edit'] && OV.weeks.length ? `<div class="bar2 lmsb-acts"><button class="btn sm pri" data-act="lmsb-res-new">+ 학습자원</button><details class="uxmore lmsb-addmore"><summary>다른 추가 <em>3</em></summary><div class="uxpop" role="menu"><button data-act="lmsb-week">+ 주차</button><button data-act="lmsb-ses">+ 차시</button><button data-act="lmsb-pkg">표준 학습 패키지(SCORM · HTML5) 올리기</button></div></details><button class="btn sm ghost" data-act="lmsb-wkall">${UI.lmsbOpenAll ? '이번 주만 펼치기' : `모든 주차 펼치기(${OV.weeks.length})`}</button></div>` : OV.weeks.length > 3 ? `<div class="bar2 lmsb-acts"><button class="btn sm ghost" data-act="lmsb-wkall">${UI.lmsbOpenAll ? '이번 주만 펼치기' : `모든 주차 펼치기(${OV.weeks.length})`}</button></div>` : ''}
        ${me.role === 'student' ? `<div class="card" data-lmsb-next><div class="empty">다음 학습을 찾는 중…</div></div>` : ''}
        ${OV.common.length ? `<div class="card"><div class="ch"><b>강의실 공통 자료</b></div>${OV.common.map(r => resRow(r, me)).join('')}</div>` : ''}
        ${OV.weeks.map(w => `<details class="card lmsb-week ${w.week_no === curWeekNo ? 'cur' : ''}" ${UI.lmsbOpenAll || OV.weeks.length <= 3 || w.week_no === (curWeekNo || 1) ? 'open' : ''}><summary class="ch"><b>${w.week_no}주차${w.title && w.title !== w.week_no + '주차' ? ' · ' + esc(w.title) : ''}</b>${w.week_no === curWeekNo ? ' ' + tag('이번 주', 'g') : ''}<small>${fmtD(w.starts_on)} ~ ${fmtD(w.ends_on)} · 차시 ${w.sessions.length} · 자료 ${w.sessions.reduce((n, x) => n + x.resources.length, 0)}${w.plan && w.plan.plan ? ' · 계획: ' + esc(w.plan.plan) : ''}</small></summary>${me.can['structure.edit'] ? `<div class="lmsb-wkact"><button class="btn sm ghost" data-act="lmsb-week" data-w="${w.week_no}">주차 편집</button></div>` : ''}
          ${w.summary ? `<p class="mini">${esc(w.summary)}</p>` : ''}
          ${w.sessions.map(s => `<div class="lmsb-ses"><div class="lmsb-sh"><b>${s.seq}차시 ${esc(s.title || '')}</b> ${tag(SKN[s.kind] || s.kind)} <span class="mini">${s.open_at ? '인정 ' + fmt(s.open_at) + ' ~ ' + fmt(s.close_at) : ''}${s.required_sec ? ' · 학습분량 ' + Math.round(s.required_sec / 60) + '분' : ''}${s.prereq.length ? ' · 선수: ' + esc(s.prereq.map(p => { const q = sAll.find(x => x.id === p); return q ? `${q.week_no}-${q.seq}` : '?'; }).join(', ')) : ''}</span>
            <span class="mini lmsb-att">출결 ${s.att.total ? `출석 ${s.att.present} · 지각 ${s.att.late} · 결석 ${s.att.absent} · 공결 ${s.att.excused}` : '기록 없음'}</span>${me.can['structure.edit'] ? `<button class="btn sm ghost" data-act="lmsb-ses" data-id="${esc(s.id)}">차시 편집</button><button class="btn sm ghost" data-act="lmsb-res-new" data-s="${esc(s.id)}">+ 자원</button>` : ''}</div>
            ${s.resources.map(r => resRow(r, me)).join('') || '<p class="mini">자원이 없습니다.</p>'}</div>`).join('') || '<p class="mini">차시가 없습니다.</p>'}</details>`).join('') || `<div class="empty">아직 주차가 없습니다. ${me.can['structure.edit'] ? `템플릿으로 15주를 한 번에 만들거나 주차를 직접 추가하세요.<div class="uxecta"><button class="btn pri" data-act="lmsb-quick" data-v="${esc(sx.mode === 'online' ? 'online' : sx.mode === 'offline' ? 'offline' : 'blended')}">템플릿으로 15주 만들기</button><button class="btn" data-act="lmsb-week">+ 주차</button></div>` : '교수자가 주차를 준비하고 있습니다.'}</div>`}`;
      if (me.role === 'student') setTimeout(loadNext, 0);
    }
    if (tb === 'timeline') {
      const T = await X.call('b', 'timeline', { section: X.sec });
      b = `<div class="card"><div class="ch"><b>수업계획서 기반 타임라인</b><small>${fmtD(T.term_from)} ~ ${fmtD(T.term_to)} · 오늘 ${fmtD(T.today)} · 계획서 주차 ${T.syllabus_weeks}개</small>${me.can['structure.edit'] ? '<button class="btn sm" data-act="lmsb-syl">수업계획서 반영</button>' : ''}</div>
        <p class="mini">학사 수업계획서는 <b>연동 후 동작</b>합니다(학사 동기화가 분반의 수업계획서 주차 계획을 채움). 지금은 데모 계획서 또는 붙여 넣은 주차 계획으로 반영합니다.</p>
        <div class="lmsb-tl">${T.weeks.map(w => { const cur = T.today >= w.from && T.today <= w.to; const past = T.today > w.to; return `<div class="lmsb-tli ${cur ? 'cur' : past ? 'past' : ''}"><div class="lmsb-tld">${w.week_no}주<small>${String(w.from).slice(5)}~${String(w.to).slice(5)}</small></div><div><b>${esc(w.title || '(제목 없음)')}</b>${cur ? ' ' + tag('이번 주', 'g') : ''}${w.plan && w.plan.plan ? `<p class="mini">계획: ${esc(w.plan.plan)}${w.plan.from === 'syllabus' ? ' (수업계획서)' : ''}</p>` : ''}<p class="mini">${w.items.map(i => `${i.seq}차시 ${esc(i.title)} ${SKN[i.kind] || i.kind} · 자원 ${i.resources}${i.close_at ? ' · 마감 ' + fmt(i.close_at) : ''}`).join(' / ') || '차시 없음'}</p></div></div>`; }).join('') || '<div class="empty">주차가 없습니다.</div>'}</div></div>`;
    }
    if (tb === 'enroll') {
      const E = OV.enroll; const mx = Math.max(1, ...E.by_unit.map(u => u.n)); const tot = Math.max(1, E.enrolled + E.dropped + E.pending);
      const att = allSes().filter(s => s.att.total);
      b = `<div class="kpis">${kpi('수강', E.enrolled + '명', E.capacity ? `정원 ${E.capacity}명 · ${Math.round(E.enrolled / E.capacity * 100)}%` : '')}${kpi('정규 · 청강', `${E.regular} · ${E.audit}`, '청강생은 성적 처리 제외')}${kpi('수강 취소', E.dropped + '명')}${kpi('승인 대기', E.pending + '명')}</div>
        <div class="card"><div class="ch"><b>등록 상태</b></div><div class="lmsb-stack"><i class="ok" style="width:${E.enrolled / tot * 100}%" title="수강"></i><i class="y" style="width:${E.pending / tot * 100}%" title="대기"></i><i class="r" style="width:${E.dropped / tot * 100}%" title="취소"></i></div><p class="mini">수강 ${E.enrolled} · 대기 ${E.pending} · 취소 ${E.dropped}</p></div>
        <div class="card"><div class="ch"><b>학과별 수강</b></div>${E.by_unit.map(u => `<div class="lmsb-hb"><span>${esc(u.unit)}</span>${bar(u.n / mx * 100)}<b>${u.n}</b></div>`).join('') || '<div class="empty">수강생이 없습니다.</div>'}</div>
        <div class="card"><div class="ch"><b>학년별</b></div>${E.by_year.map(u => `<div class="lmsb-hb"><span>${u.year ? u.year + '학년' : '미지정'}</span>${bar(u.n / Math.max(1, E.enrolled) * 100)}<b>${u.n}</b></div>`).join('')}</div>
        <div class="card"><div class="ch"><b>등록 추이(일별)</b></div><div class="lmsb-cols">${E.by_day.map(d => `<div title="${esc(d.day)} ${d.n}명"><i style="height:${d.n / Math.max(1, ...E.by_day.map(x => x.n)) * 100}%"></i><small>${esc(d.day.slice(5))}</small></div>`).join('')}</div></div>
        <div class="card"><div class="ch"><b>차시별 출결 연계</b><small>출석 기록(묶음 G)을 차시에 묶어 보여 줍니다</small></div>${table(['차시', '출석', '지각', '결석', '공결', '출석률'], att.map(s => [`${s.week_no}-${s.seq} ${esc(s.title)}`, s.att.present, s.att.late, s.att.absent, s.att.excused, pct((s.att.present + s.att.late) / s.att.total * 100)]), '아직 출석 기록이 있는 차시가 없습니다.')}</div>`;
    }
    if (tb === 'path') {
      const res = allRes().filter(r => r.kind !== 'label'); const opt = OV.opt;
      let mat = ''; if (me.can.grade) { const P = await X.call('b', 'progress', { section: X.sec });
        mat = `<div class="card"><div class="ch"><b>학습자별 진도 · 수준</b><small>완료 조건이 있는 자원 기준</small>${res.length ? `<button class="btn sm" data-act="lmsb-lvauto">진단 점수로 수준 자동 배정</button>` : ''}</div>${table(['학번', '학과', '수준', '완료', ...P.resources.slice(0, 8).map(r => r.title.slice(0, 10))], P.students.map(s => [esc(s.no), esc(s.unit || ''), `<select data-chg="lmsb-level" data-no="${esc(s.no)}">${Object.entries(LVN).map(([k, v]) => `<option value="${k}" ${s.level === k ? 'selected' : ''}>${v}</option>`).join('')}</select>`, s.done + '/' + P.resources.length, ...P.resources.slice(0, 8).map(r => { const c = s.cells[r.id]; return c ? (['completed', 'passed'].includes(c.st) ? tag(c.sc != null ? c.sc + '점' : '완료', 'g') : tag(c.st === 'failed' ? '미달' : '진행', 'y')) : '—'; })]), '수강생이 없습니다.')}</div>`; }
      b = `<div class="card"><div class="ch"><b>순차 · 조건부 학습</b></div><label class="ul-ck"><input type="checkbox" data-chg="lmsb-seq" ${opt.sequential ? 'checked' : ''} ${me.can['structure.edit'] ? '' : 'disabled'}> 순차 학습: 앞 순서의 이수 조건 자원을 마쳐야 다음 자원이 열립니다</label>
        <p class="mini">자원마다 이수 조건(열람 · 학습 시간 · 점수 · SCORM 상태)과 접근 제한(선수 자원 · 점수 조건 · 공개 기간 · 수준)을 둘 수 있습니다(구성 › 편집). 차시에는 선수 차시를 지정합니다.</p></div>
        <div class="card"><div class="ch"><b>적응형 경로 규칙</b><small>기준 자원 점수가 기준 미만이면 보충, 이상이면 심화 자원을 추천</small>${me.can['structure.edit'] ? '<button class="btn sm" data-act="lmsb-adapt">+ 규칙</button>' : ''}</div>
        ${table(['기준 자원', '기준 점수', '미만 → 보충', '이상 → 심화', ''], (opt.adaptive || []).map((q, i) => { const t = id => esc((res.find(r => r.id === id) || {}).title || '(삭제됨)'); return [t(q.if_res), q.below + '점', (q.then || []).map(t).join(', ') || '—', (q.else || []).map(t).join(', ') || '—', me.can['structure.edit'] ? `<button class="btn sm ghost redl" data-act="lmsb-adapt-del" data-i="${i}">삭제</button>` : '']; }), '규칙이 없습니다.')}</div>${mat}`;
      if (me.role === 'student') { b = `<div class="card" data-lmsb-next><div class="empty">불러오는 중…</div></div>`; setTimeout(loadNext, 0); }
    }
    if (tb === 'tpl') {
      const T = await X.call('b', 'templates', {}); const others = (X.sections || []).filter(s => s.id !== X.sec);
      b = `<div class="card"><div class="ch"><b>강의실 템플릿</b><small>온라인 · 블렌디드 · 오프라인 · 개인 학습형 — 주차 · 차시 · 자원 뼈대를 만듭니다(기존 차시는 같은 번호면 덮어씀)</small></div><div class="lmsb-tpls">${T.builtin.map(t => `<div class="lmsb-tpl"><b>${esc(t.name)}</b><p class="mini">${esc(t.desc)}</p><button class="btn sm pri" data-act="lmsb-tpl-apply" data-v="${esc(t.id)}">적용</button></div>`).join('')}</div></div>
        <div class="card"><div class="ch"><b>내 템플릿</b><button class="btn sm" data-act="lmsb-tpl-save">이 강의실을 템플릿으로 저장</button></div>${table(['이름', '주차', '자원', '만든 사람', '만든 때', ''], T.mine.map(t => [esc(t.name), t.weeks, t.resources, esc(t.by || ''), fmt(t.created_at), `<button class="btn sm" data-act="lmsb-tpl-apply" data-v="${esc(t.id)}">적용</button> <button class="btn sm ghost redl" data-act="lmsb-tpl-del" data-v="${esc(t.id)}">삭제</button>`]), '저장한 템플릿이 없습니다.')}</div>
        <div class="card"><div class="ch"><b>이전 학기 강의실 복사 · 가져오기</b><small>두 학기 시작일 차이만큼 날짜를 자동으로 옮깁니다</small></div><div class="form2"><label>가져올 강의실<select data-lmsb-copyfrom>${others.map(s => `<option value="${esc(s.id)}">${esc(s.term)} · ${esc(s.title)}</option>`).join('') || '<option value="">없음</option>'}</select></label><label>날짜 이동(일, 비우면 자동)<input type="number" data-lmsb-copyshift placeholder="자동"></label></div>
        <div class="lmsb-cks">${[['structure', '주차 · 차시', true], ['resources', '학습자원', true], ['activities', '학습활동(토론 · 위키 · 설문 · 사전 과제 · 동료 평가)', false], ['boards', '공지 · 자료실', false]].map(([k, l, on]) => `<label class="ul-ck"><input type="checkbox" data-lmsb-copypart="${k}" ${on ? 'checked' : ''}> ${l}</label>`).join('')}</div><button class="btn pri" data-act="lmsb-copy" ${others.length ? '' : 'disabled'}>가져오기</button></div>
        <div class="card"><div class="ch"><b>기간 일괄 변경</b><small>주차 · 차시 인정 기간 · 자원 공개 기간을 한 번에 옮깁니다</small></div><div class="bar2"><input type="number" data-lmsb-shift value="7" style="width:100px"> 일 <button class="btn" data-act="lmsb-shift">일괄 이동</button></div></div>`;
    }
    if (tbv === 'backup') {
      const B = await X.call('b', 'backups', { section: X.sec });
      b = `<div class="card"><div class="ch"><b>강좌 백업</b><small>전체 또는 부분(항목 선택)</small></div><div class="lmsb-cks">${[['structure', '주차 · 차시'], ['resources', '학습자원'], ['activities', '학습활동'], ['boards', '공지 · 자료실']].map(([k, l]) => `<label class="ul-ck"><input type="checkbox" data-lmsb-bkpart="${k}" checked> ${l}</label>`).join('')}</div>
        <div class="bar2"><input data-lmsb-bknote placeholder="메모(예: 중간고사 전)" maxlength="200"><button class="btn pri" data-act="lmsb-backup">지금 백업</button><label class="btn">백업 파일 가져오기<input type="file" accept=".json,application/json" data-chg="lmsb-bkimport" hidden></label></div></div>
        <div class="card"><div class="ch"><b>백업 목록 · 복구</b><small>바꾸기 = 기존 자원을 휴지통으로 보내고 백업으로 교체 · 덧붙이기 = 그대로 두고 추가</small></div>${table(['만든 때', '항목', '주차 · 차시 · 자원', '크기', '메모', ''], B.backups.map(k => [fmt(k.created_at), k.parts.map(p => ({ structure: '구조', resources: '자원', activities: '활동', boards: '게시판' })[p]).join(' · '), `${k.counts.weeks} · ${k.counts.sessions} · ${k.counts.resources}`, Math.ceil(k.bytes / 1024) + 'KB', esc(k.note), `<button class="btn sm" data-act="lmsb-restore" data-id="${esc(k.id)}" data-parts="${esc(k.parts.join(','))}">복구</button> <button class="btn sm ghost" data-act="lmsb-bkdl" data-id="${esc(k.id)}">내려받기</button> <button class="btn sm ghost redl" data-act="lmsb-bkdel" data-id="${esc(k.id)}">삭제</button>`]), '백업이 없습니다.')}</div>`;
    }
    if (tbv === 'backup') {
      const T = await X.call('b', 'trash', { section: X.sec }); const AN = { trash: '휴지통으로', restore: '복구', purge: '영구 삭제', update: '수정', revert: '버전 되돌림', save: '저장', delete: '삭제', template: '템플릿 적용', copy: '복사', shift: '기간 이동', restore_: '' };
      b += `<div class="card"><div class="ch"><b>휴지통</b><small>삭제한 자원은 여기서 복구합니다(버전 기록 유지)</small></div>${table(['자원', '유형', '삭제한 사람', '삭제한 때', ''], T.items.map(r => [esc(r.title), esc(KN[r.kind]), esc(r.deleted_by || ''), fmt(r.deleted_at), `<button class="btn sm" data-act="lmsb-restore-res" data-id="${esc(r.id)}">복구</button> <button class="btn sm ghost redl" data-act="lmsb-purge" data-id="${esc(r.id)}">영구 삭제</button>`]), '휴지통이 비어 있습니다.')}</div>
        <div class="card"><div class="ch"><b>변경 이력</b></div>${table(['때', '대상', '동작', '누가'], T.history.slice(0, 60).map(h => [fmt(h.at), `${esc({ resource: '자원', session: '차시', course: '강의실' }[h.obj] || h.obj)} ${esc(h.title || '')}`, esc(AN[h.action] || h.action), esc(h.by || '')]), '이력이 없습니다.')}</div>
        <p class="mini">강의 녹화 솔루션의 녹화본 자동 탑재는 <b>연동 후 동작</b>합니다(녹화본은 영상 자원으로 들어옵니다).</p>`;
    }
    if (tbv === 'lib') {
      const Lb = await X.call('b', 'library', {});
      b = `<div class="card"><div class="ch"><b>교수자 간 공유 자료</b><small>자원 편집에서 「공유」로 둔 자료 — 내 강의실로 복사해 재사용합니다(비공유 자료는 보이지 않음)</small></div>${table(['자원', '유형', '강의실', '올린 사람', ''], Lb.items.map(r => [esc(r.title), esc(KN[r.kind]), `${esc(r.term)} · ${esc(r.section)}`, esc(r.owner || ''), r.section_id === X.sec ? tag('이 강의실') : `<button class="btn sm" data-act="lmsb-reuse" data-id="${esc(r.id)}">내 강의실로 재사용</button>`]), '공유된 자료가 없습니다.')}</div>`;
    }
    if (tb === 'role') {
      const P = await X.call('b', 'perms', {}); const Mn = await X.call('b', 'menu', { section: X.sec }); const mods = MODS.list.map(([id]) => ({ id, on: !Mn.modules.some(m => m.id === id && m.on === false) }));
      b = `<div class="card"><div class="ch"><b>역할 · 권한</b><small>교수 · 조교 · 교직원 · 채점자 · 학생 — 기관 전체에 적용${P.can_edit && ['owner', 'sub'].includes(S.me.role) ? '' : ' (정 · 부운영자만 변경)'}</small></div><div class="tw"><table class="lmsb-perm"><thead><tr><th>권한</th>${P.roles.map(r => `<th>${esc(ROLE_N[r])}</th>`).join('')}</tr></thead><tbody>${P.perms.map(p => `<tr><td>${esc(PN[p] || p)}</td>${P.roles.map(r => `<td><input type="checkbox" aria-label="${esc(ROLE_N[r] + ' ' + (PN[p] || p))}" data-chg="lmsb-perm" data-r="${r}" data-p="${p}" ${P.grid[r][p] ? 'checked' : ''} ${P.can_edit && ['owner', 'sub'].includes(S.me.role) && !X.as ? '' : 'disabled'}></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
        <div class="card"><div class="ch"><b>강의실 메뉴 모듈</b><small>이 강의실에서 쓸 메뉴(과제 · 시험 · 출결 · 동영상 · 학습활동 · 게시판 등)를 켜고 끕니다 — 끈 메뉴는 탭에서 빠지고 이동도 막힙니다</small></div><div class="lmsb-cks">${mods.map(m => `<label class="ul-ck"><input type="checkbox" data-lmsb-mod="${esc(m.id)}" ${m.on ? 'checked' : ''} ${Mn.can_edit ? '' : 'disabled'}> ${esc((MODS.list.find(x => x[0] === m.id) || [0, m.id])[1])}</label>`).join('')}</div>${Mn.can_edit ? '<button class="btn sm pri" data-act="lmsb-menu-save">메뉴 저장</button>' : ''}</div>
        <div class="card"><div class="ch"><b>나의 맞춤 메뉴</b><small>숨길 메뉴 · 순서(쉼표로 나열)</small></div><div class="lmsb-cks">${mods.filter(m => m.on).map(m => `<label class="ul-ck"><input type="checkbox" data-lmsb-hide="${esc(m.id)}" ${Mn.pref.hidden.includes(m.id) ? 'checked' : ''}> ${esc((MODS.list.find(x => x[0] === m.id) || [0, m.id])[1])} 숨기기</label>`).join('')}</div><div class="bar2"><input data-lmsb-ord value="${esc(Mn.pref.order.join(','))}" placeholder="예: notice,forum,lmsb"><button class="btn sm" data-act="lmsb-pref-save">맞춤 메뉴 저장</button></div></div>`;
    }
    if (tbv === 'lib') {
      const L = await X.call('b', 'mylib', {});
      b += `<div class="card"><div class="ch"><b>교수자 개인 자료함</b><small>내가 올린 강의자료를 담아 두고 다른 강의실 · 다른 학기에 재사용합니다(자원 편집에서 「내 자료함에도 담기」)</small></div>
        ${table(['자료', '형식', '크기', '태그', '쓰는 곳', '담은 때', ''], L.items.map(x => [esc(x.name), esc(PVN[x.preview] || ''), Math.ceil(x.size / 1024) + 'KB', esc((x.tags || []).join(', ')), x.used + '곳', fmt(x.added_at), x.alive ? `<button class="btn sm" data-act="lmsb-libuse" data-id="${esc(x.id)}">이 강의실에 넣기</button> <button class="btn sm ghost redl" data-act="lmsb-libdel" data-id="${esc(x.id)}">빼기</button>` : tag('원본 삭제됨', 'r')]), '자료함이 비어 있습니다.')}</div>`;
    }
    if (tb === 'scorm') {
      const pk = allRes().filter(r => ['scorm', 'html5'].includes(r.kind));
      b = `<div class="card"><div class="ch"><b>SCORM 1.2 · 2004 / HTML5 패키지</b><small>zip을 브라우저에서 풀어 imsmanifest.xml을 읽고, 학습 기록(cmi)을 저장합니다</small>${me.can['resource.edit'] ? '<button class="btn sm pri" data-act="lmsb-pkg">패키지 올리기</button>' : ''}</div>
        <p class="mini">런타임: SCORM 1.2(window.API · LMSInitialize/LMSGetValue/LMSSetValue/LMSCommit/LMSFinish) · SCORM 2004(window.API_1484_11 · Initialize/GetValue/SetValue/Commit/Terminate), 데이터 모델 검사 · 오류 코드 · 이어 학습(suspend_data · location · entry) · 누적 학습 시간 · 점수 · 완료/합격 → 진도 · 이수 조건 반영. 시퀀싱(IMS SS)은 SCO 목록 선택으로 제공합니다.</p>
        ${table(['패키지', '형식', 'SCO', ''], pk.map(r => [esc(r.title), esc(r.kind === 'html5' ? 'HTML5' : 'SCORM ' + ((r.body || {}).version || '')), ((r.body || {}).scos || []).length, `<button class="btn sm" data-act="lmsb-open" data-id="${esc(r.id)}">재생</button> ${me.can.grade ? `<button class="btn sm ghost" data-act="lmsb-srep" data-id="${esc(r.id)}">학습 기록</button>` : ''}`]), '올린 패키지가 없습니다.')}<div data-lmsb-srepbox></div></div>`;
    }
    return top + todo + `<div class="lmsb-tabs">${X.tabs4('lmsbT', vis, vis.some(v => v[0] === tbv) ? tbv : 'build')}</div>` + b;
  }
  async function loadNext() { const el = $('[data-lmsb-next]'); if (!el) return; try { const n = await X.call('b', 'next', { section: X.sec }); el.innerHTML = `<div class="ch"><b>나의 학습 경로</b><small>완료 ${n.done}/${n.total}${n.level ? ' · 수준 ' + LVN[n.level] : ''}</small></div>${bar(n.total ? n.done / n.total * 100 : 0)}${n.next ? `<div class="row"><span>다음 학습: <b>${esc(n.next.title)}</b></span><button class="btn sm pri" data-act="lmsb-open" data-id="${esc(n.next.id)}">이어서 학습</button></div>` : '<p class="mini">열린 학습을 모두 마쳤습니다.</p>'}${n.recommend.map(r => `<div class="row"><span>${tag('적응형 추천', 'mg')} ${esc(r.title)} <small class="mini">${esc(r.why)}</small></span>${r.done ? tag('완료', 'g') : `<button class="btn sm" data-act="lmsb-open" data-id="${esc(r.id)}">학습</button>`}</div>`).join('')}`; } catch (e) { el.innerHTML = `<p class="mini">${esc(e.message)}</p>`; } }
  X.mount('lmsb', viewB);

  /* ── 동작 ── */
  const done2 = (m) => { if (m) toast(m, 'ok'); X.refresh(); };
  const sesOpts = (cur, none = '강의실 공통') => `<option value="">${none}</option>` + allSes().map(s => `<option value="${esc(s.id)}" ${s.id === cur ? 'selected' : ''}>${s.week_no}주 ${s.seq}차시 ${esc(s.title || '')}</option>`).join('');
  ACT['lmsb-week'] = el => { const w = OV.weeks.find(x => x.week_no === +el.dataset.w) || {}; const n = w.week_no || (Math.max(0, ...OV.weeks.map(x => x.week_no)) + 1);
    modal(w.week_no ? `${n}주차 편집` : '주차 추가', `<div class="form2"><label>주차<input name="wn" type="number" min="1" max="30" value="${n}"></label><label>주제<input name="t" maxlength="200" value="${esc(w.title || '')}"></label><label>시작일<input name="a" type="date" value="${esc(w.starts_on || '')}"></label><label>종료일<input name="z" type="date" value="${esc(w.ends_on || '')}"></label></div><label>개요<textarea name="s" rows="3" maxlength="4000">${esc(w.summary || '')}</textarea></label>`,
      [...(w.week_no ? [{ id: 'del', label: '주차 삭제', kind: 'redl', run: () => { X.run('b', 'week-del', { section: X.sec, week_no: n }, '주차를 삭제했습니다.').then(r => r && X.refresh()); } }] : []), { id: 'ok', label: '저장', kind: 'pri', run: m => { X.run('b', 'week-save', { section: X.sec, week_no: fv(m, 'wn'), title: fv(m, 't'), starts_on: fv(m, 'a'), ends_on: fv(m, 'z'), summary: fv(m, 's') }, '저장했습니다.').then(r => r && X.refresh()); } }]); };
  const dtl = v => v ? new Date(new Date(v).getTime() + 9 * 3600e3).toISOString().slice(0, 16) : '';
  ACT['lmsb-ses'] = el => { const s = allSes().find(x => x.id === el.dataset.id) || {}; const others = allSes().filter(x => x.id !== s.id);
    modal(s.id ? '차시 편집' : '차시 추가', `<div class="form2"><label>주차<input name="wn" type="number" min="1" max="30" value="${s.week_no || (OV.weeks[0] ? OV.weeks[OV.weeks.length - 1].week_no : 1)}"></label><label>차시<input name="sq" type="number" min="1" max="20" value="${s.seq || ''}" placeholder="자동"></label><label>제목<input name="t" maxlength="200" value="${esc(s.title || '')}"></label><label>유형<select name="k">${Object.entries(SKN).map(([k, v]) => `<option value="${k}" ${s.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>인정 시작<input name="oa" type="datetime-local" value="${dtl(s.open_at)}"></label><label>인정 종료<input name="ca" type="datetime-local" value="${dtl(s.close_at)}"></label><label>학습분량(분)<input name="rq" type="number" min="0" max="1440" value="${s.required_sec ? Math.round(s.required_sec / 60) : 0}"></label></div>
      <label>선수 차시(먼저 마쳐야 하는 차시)</label><div class="lmsb-cks">${others.map(o => `<label class="ul-ck"><input type="checkbox" name="pre" value="${esc(o.id)}" ${(s.prereq || []).includes(o.id) ? 'checked' : ''}> ${o.week_no}-${o.seq} ${esc(o.title || '')}</label>`).join('') || '<span class="mini">다른 차시가 없습니다.</span>'}</div>
      <p class="mini">출결 연계: 이 차시의 출석(인증번호 · 온라인 진도 등, 묶음 G)이 같은 차시로 기록됩니다.</p>`,
      [...(s.id ? [{ id: 'del', label: '차시 삭제', kind: 'redl', run: () => { X.run('b', 'session-del', { section: X.sec, id: s.id }, '차시를 삭제했습니다(자원은 휴지통).').then(r => r && X.refresh()); } }] : []), { id: 'ok', label: '저장', kind: 'pri', run: m => { X.run('b', 'session-save', { section: X.sec, id: s.id || undefined, week_no: fv(m, 'wn'), seq: fv(m, 'sq'), title: fv(m, 't'), kind: fv(m, 'k'), open_at: fv(m, 'oa'), close_at: fv(m, 'ca'), required_sec: (+fv(m, 'rq') || 0) * 60, prereq: $$('[name=pre]:checked', m).map(x => x.value) }, '저장했습니다.').then(r => r && X.refresh()); } }], true); };
  function resForm(r, sesId, ext) {
    ext = ext || { assignments: [], exams: [] };
    r = r || { kind: 'page', title: '', body: {}, visible: true, share: 'private', completion: {}, access: {}, session_id: sesId || '' }; const A = r.access || {}; const C = r.completion || {}; const others = allRes().filter(x => x.id !== r.id && x.kind !== 'label');
    return `<div class="form2"><label>유형<select name="kind" ${r.id ? 'disabled' : ''} data-chg="lmsb-kind">${Object.entries(KN).filter(([k]) => r.id || !['scorm', 'html5'].includes(k)).map(([k, v]) => `<option value="${k}" ${r.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>제목<input name="title" maxlength="200" value="${esc(r.title)}"></label><label>차시<select name="sid">${sesOpts(r.session_id)}</select></label><label>공유<select name="share"><option value="private" ${r.share !== 'shared' ? 'selected' : ''}>비공유(내 강의실)</option><option value="shared" ${r.share === 'shared' ? 'selected' : ''}>교수자 간 공유</option></select></label></div>
      <div class="lmsb-kf" data-k="url page video label file folder assign exam">
        <label data-k="assign">연결할 과제(묶음 E)<select name="ref_a">${ext.assignments.map(g => `<option value="${esc(g.id)}" ${(r.body || {}).ref === g.id ? 'selected' : ''}>${esc(g.title)} · ${g.kind === 'team' ? '팀' : '개인'} · 만점 ${g.max_score}</option>`).join('') || '<option value="">이 강의실 과제가 없습니다</option>'}</select></label>
        <label data-k="exam">연결할 시험(묶음 F)<select name="ref_e">${ext.exams.map(g => `<option value="${esc(g.id)}" ${(r.body || {}).ref === g.id ? 'selected' : ''}>${esc(g.title)} · ${g.score_policy === 'last' ? '마지막' : '최고'} 점수</option>`).join('') || '<option value="">이 강의실 시험이 없습니다</option>'}</select></label>
        <p class="mini" data-k="assign exam">제출 · 채점 · 응시 결과가 자동으로 진도 · 이수 조건(점수 이상) · 점수 조건 · 적응형 규칙에 들어갑니다.</p>
        <label data-k="url video">주소(URL)<input name="url" value="${esc((r.body || {}).url || '')}" placeholder="https:// (영상: mp4 주소 또는 YouTube · Vimeo 주소)"></label>
        <label data-k="page">웹페이지 내용(HTML)<textarea name="html" rows="5">${esc((r.body || {}).html || '')}</textarea></label>
        <label data-k="label">표지 문구<textarea name="text" rows="2">${esc((r.body || {}).text || '')}</textarea></label>
        <label data-k="file folder">파일${r.kind === 'folder' ? '(여러 개)' : ''}<input type="file" name="files" ${r.kind === 'folder' ? 'multiple' : ''}></label>
        <p class="mini" data-k="file folder">${((r.body || {}).files || ((r.body || {}).file_id ? [r.body] : [])).map(f => esc(f.name)).join(', ') || ''} ${LIVE_ON() ? '3MB 이하(대용량은 CDN 연동 후 동작)' : '데모: 300KB 이하'}</p></div>
      <label class="ul-ck"><input type="checkbox" name="vis" ${r.visible !== false ? 'checked' : ''}> 학생에게 공개</label>
      <label class="ul-ck lmsb-kf2" data-k2="file folder"><input type="checkbox" name="dlok" ${(r.body || {}).download !== false ? 'checked' : ''}> 학생 내려받기 허용(끄면 바로 보기만)</label>${r.id ? '' : '<label class="ul-ck lmsb-kf2" data-k2="file folder"><input type="checkbox" name="tolib" checked> 올린 파일을 내 자료함에도 담기(다른 강의실에서 재사용)</label>'}
      <div class="form2"><label>이수 조건<select name="ct"><option value="">없음</option><option value="view" ${C.type === 'view' ? 'selected' : ''}>열람하면 완료</option><option value="time" ${C.type === 'time' ? 'selected' : ''}>학습 시간(초)</option><option value="score" ${C.type === 'score' ? 'selected' : ''}>점수 이상</option>${['scorm'].includes(r.kind) ? `<option value="scorm" ${C.type === 'scorm' ? 'selected' : ''}>SCORM 완료 상태</option>` : ''}</select></label><label>기준(초 · 점수)<input name="cv" type="number" min="0" value="${esc(C.sec || C.score || '')}"></label>
      <label>공개 시작<input name="from" type="datetime-local" value="${dtl(A.from)}"></label><label>공개 종료<input name="until" type="datetime-local" value="${dtl(A.until)}"></label>
      <label>점수 조건 자원<select name="msr"><option value="">없음</option>${others.map(o => `<option value="${esc(o.id)}" ${A.min_score && A.min_score.res === o.id ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select></label><label>필요 점수<input name="msc" type="number" min="0" value="${esc(A.min_score ? A.min_score.score : '')}"></label></div>
      <label>선수 자원(모두 완료해야 열림)</label><div class="lmsb-cks">${others.map(o => `<label class="ul-ck"><input type="checkbox" name="after" value="${esc(o.id)}" ${(A.after || []).includes(o.id) ? 'checked' : ''}> ${esc(o.title)}</label>`).join('') || '<span class="mini">다른 자원이 없습니다.</span>'}</div>
      <label>수준별 대상(비우면 모두)</label><div class="lmsb-cks">${Object.entries(LVN).map(([k, v]) => `<label class="ul-ck"><input type="checkbox" name="lv" value="${k}" ${(A.levels || []).includes(k) ? 'checked' : ''}> ${v}</label>`).join('')}</div>`;
  }
  const kindVis = m => { const k = (m.querySelector('[name=kind]') || {}).value; m.querySelectorAll('.lmsb-kf [data-k]').forEach(e => { e.style.display = e.dataset.k.split(' ').includes(k) ? '' : 'none'; }); m.querySelectorAll('[data-k2]').forEach(e => { e.style.display = e.dataset.k2.split(' ').includes(k) ? '' : 'none'; }); const f = m.querySelector('[name=files]'); if (f) f.multiple = k === 'folder'; };
  ACT['lmsb-kind'] = el => kindVis(el.closest('.modal'));
  const toIso = v => v ? new Date(v + ':00+09:00').toISOString() : null;
  async function readFiles(inp) { const out = []; for (const f of [...(inp && inp.files || [])]) { const b64 = X.b64of(new Uint8Array(await f.arrayBuffer())); out.push(await X.call('b', 'file-put', { section: X.sec, name: f.name, mime: f.type || 'application/octet-stream', b64 })); } return out; }
  async function saveRes(m, r) {
    const kind = r ? r.kind : fv(m, 'kind'); const body = r ? { ...(r.body || {}) } : {};
    if (kind === 'assign') body.ref = fv(m, 'ref_a'); if (kind === 'exam') body.ref = fv(m, 'ref_e');
    if (['url', 'video'].includes(kind)) body.url = fv(m, 'url'); if (kind === 'page') body.html = m.querySelector('[name=html]').value; if (kind === 'label') body.text = fv(m, 'text');
    if (['file', 'folder'].includes(kind)) body.download = !!fv(m, 'dlok');
    if (['file', 'folder'].includes(kind)) { const up = await readFiles(m.querySelector('[name=files]')); if (fv(m, 'tolib')) for (const u of up) await X.call('b', 'mylib-add', { file_id: u.id }).catch(() => {}); if (kind === 'file' && up[0]) Object.assign(body, { file_id: up[0].id, name: up[0].name, size: up[0].size, mime: up[0].mime }); if (kind === 'folder' && up.length) body.files = [...(body.files || []), ...up.map(u => ({ file_id: u.id, name: u.name, size: u.size, mime: u.mime }))]; if (!r && !up.length) throw new Error('파일을 고르세요.'); }
    const ct = fv(m, 'ct'); const cv = +fv(m, 'cv') || 0; const completion = ct ? { type: ct, ...(ct === 'time' ? { sec: cv } : ct === 'score' ? { score: cv } : {}) } : {};
    const access = {}; const af = $$('[name=after]:checked', m).map(x => x.value); if (af.length) access.after = af; const lv = $$('[name=lv]:checked', m).map(x => x.value); if (lv.length) access.levels = lv;
    if (fv(m, 'from')) access.from = toIso(fv(m, 'from')); if (fv(m, 'until')) access.until = toIso(fv(m, 'until')); if (fv(m, 'msr')) access.min_score = { res: fv(m, 'msr'), score: +fv(m, 'msc') || 0 };
    return X.call('b', 'res-save', { ...(r ? { id: r.id } : { section: X.sec, kind }), title: fv(m, 'title'), session_id: fv(m, 'sid') || null, body, visible: fv(m, 'vis'), share: fv(m, 'share'), completion, access });
  }
  const resModal = async (r, sid) => { let ext = { assignments: [], exams: [] }; try { ext = await X.call('b', 'ext-list', { section: X.sec }); } catch (e) { }
    const m = modal(r ? '학습자원 편집' : '학습자원 추가', resForm(r, sid, ext), [{ id: 'ok', label: '저장', kind: 'pri', run: mm => { saveRes(mm, r).then(() => { closeModal(); done2('저장했습니다.'); }).catch(X.err); return false; } }], true); kindVis(m); };
  ACT['lmsb-res-new'] = el => resModal(null, el.dataset.s);
  ACT['lmsb-res-edit'] = el => resModal(allRes().find(x => x.id === el.dataset.id));
  ACT['lmsb-res-del'] = el => { if (!confirm('이 자원을 휴지통으로 보낼까요? 휴지통에서 복구할 수 있습니다.')) return; X.run('b', 'res-del', { id: el.dataset.id }, '휴지통으로 보냈습니다.').then(r => r && X.refresh()); };
  ACT['lmsb-vers'] = async el => { const r = await X.run('b', 'res-versions', { id: el.dataset.id }); if (!r) return;
    modal('콘텐츠 버전', table(['버전', '제목', '누가', '때', ''], r.versions.map(v => [`v${v.ver}`, esc(v.snap.title), esc(v.by || ''), fmt(v.at), `<button class="btn sm" data-act="lmsb-revert" data-id="${esc(el.dataset.id)}" data-v="${v.ver}">이 버전으로</button>`])), [{ id: 'x', label: '닫기' }], true); };
  ACT['lmsb-revert'] = el => { closeModal(); X.run('b', 'res-revert', { id: el.dataset.id, ver: +el.dataset.v }, `v${el.dataset.v} 내용으로 되돌렸습니다(새 버전으로 기록).`).then(r => r && X.refresh()); };
  ACT['lmsb-open'] = async el => {
    const r = allRes().find(x => x.id === el.dataset.id); if (!r) return; if (['scorm', 'html5'].includes(r.kind)) return play(r.id);
    const mark = async extra => { try { const g = await X.call('b', 'progress-mark', { resource: r.id, ...extra }); if (g && g.status && !g.preview) toast(`학습 기록: ${({ completed: '완료', passed: '합격', failed: '미달', in_progress: '진행 중' })[g.status]}`, 'ok'); return g; } catch (e) { X.err(e); } };
    const B = r.body || {}; let h = '';
    if (r.kind === 'page') h = `<iframe class="lmsb-page" sandbox="" title="${esc(r.title)}" srcdoc="${esc(`<meta charset=utf-8><style>body{font-family:sans-serif;line-height:1.6;padding:12px}</style>${B.html || ''}`)}"></iframe>`;
    if (r.kind === 'url') h = `<p><a href="${esc(B.url)}" target="_blank" rel="noopener noreferrer">${esc(B.url)}</a> (새 창에서 열립니다)</p>`;
    const xv = X.extVideo(B.url);
    if (r.kind === 'video') h = !B.url ? '<div class="empty">영상 주소가 없습니다.</div>' : xv ? `<p>${esc(xv.name)} 영상입니다. 스튜디오 화면 보안 정책(외부 프레임 차단) 때문에 새 창에서 재생합니다. 다 본 뒤 「학습 마침」을 누르면 시청 시간이 기록됩니다.</p><a class="btn pri" href="${esc(xv.watch)}" target="_blank" rel="noopener noreferrer" data-lmsb-xv>새 창에서 재생</a>` : `<video class="lmsb-video" controls src="${esc(B.url)}"></video><p class="mini">영상 플레이어(구간 학습시간 · 배속 · 이어보기)는 묶음 I가 담당합니다.</p>`;
    if (['file', 'folder'].includes(r.kind)) return X.material(r, mark);
    if (['assign', 'exam'].includes(r.kind)) { const go2 = r.kind === 'assign' ? 'lmse' : 'lmsf';
      modal(r.title, `<p>${r.kind === 'assign' ? '과제' : '시험'}는 ${r.kind === 'assign' ? '과제' : '시험 · 문제은행'} 메뉴에서 ${r.kind === 'assign' ? '제출' : '응시'}합니다. 결과(제출 · 채점 점수)는 자동으로 이 자원의 진도 · 이수 조건에 반영됩니다.</p><p class="mini">현재: ${r.status ? esc(({ completed: '완료', passed: '합격', failed: '미달', in_progress: '진행 중' })[r.status] || r.status) : '기록 없음'}${r.score != null ? ' · ' + r.score + '점' : ''}</p>`,
        [{ id: 'go', label: r.kind === 'assign' ? '과제로 가기' : '시험으로 가기', kind: 'pri', run: () => { if (MENU[go2] && menuOn(go2)) go(go2); else toast('해당 메뉴가 꺼져 있습니다.', 'warn'); } }]); return; }
    const C = r.completion || {}; const t0 = Date.now();
    modal(r.title, h, [{ id: 'ok', label: '학습 마침', kind: 'pri', run: () => { mark({ time_sec: Math.round((Date.now() - t0) / 1000) }).then(() => X.refresh()); } }], true);
    if (C.type !== 'time') mark({});
  };
  /* 외부 영상: YouTube · Vimeo 주소 판별(스튜디오는 iframe 차단 → 새 창, 학습자 앱은 YouTube 임베드) */
  X.extVideo = u => { u = String(u || ''); let m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(u); if (m) return { kind: 'youtube', name: 'YouTube', id: m[1], watch: `https://www.youtube.com/watch?v=${m[1]}`, embed: `https://www.youtube-nocookie.com/embed/${m[1]}` };
    m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u); if (m) return { kind: 'vimeo', name: 'Vimeo', id: m[1], watch: `https://vimeo.com/${m[1]}`, embed: `https://player.vimeo.com/video/${m[1]}` }; return null; };
  /* 강의자료 보기(SFR-038): PDF · 이미지 · 텍스트는 바로 보기, HWP · DOC · PPT · XLS는 HTML 변환(연동 지점), 내려받기 허용 · 기록 */
  const bin = b64 => { const s2 = atob(b64); const u = new Uint8Array(s2.length); for (let i = 0; i < s2.length; i++) u[i] = s2.charCodeAt(i); return u; };
  const PVN = { pdf: 'PDF', image: '이미지', text: '텍스트', convert: '문서(변환 필요)', none: '미리보기 없음' };
  X.material = async (r, mark) => {
    const M = await X.run('b', 'material', { resource: r.id }); if (!M) return; const t0 = Date.now();
    const w = modal(r.title, `<p class="mini">${M.download ? '내려받기 허용' : '<b>내려받기 금지</b> — 화면에서 보기만 할 수 있습니다'}${X.mgr(OV.me) ? ' · <a href="#" data-act="lmsb-dls" data-id="' + esc(r.id) + '">내려받은 사람 보기</a>' : ''}</p>
      ${M.files.map(f => `<div class="row"><span>${esc(f.name)} <small class="mini">${Math.ceil(f.size / 1024)}KB · ${esc(PVN[f.preview])}${f.convert ? ' · 변환 ' + esc(({ queued: '대기 중', done: '완료', failed: '실패' })[f.convert.status]) : ''}</small></span><span>
        ${['pdf', 'image', 'text'].includes(f.preview) ? `<button class="btn sm" data-act="lmsb-mview" data-r="${esc(r.id)}" data-f="${esc(f.file_id)}" data-k="${f.preview}">보기</button>` : ''}
        ${f.preview === 'convert' ? (f.convert && f.convert.status === 'done' ? `<button class="btn sm" data-act="lmsb-mconv" data-r="${esc(r.id)}" data-f="${esc(f.file_id)}">변환본 보기</button>` : `<button class="btn sm" data-act="lmsb-mcreq" data-r="${esc(r.id)}" data-f="${esc(f.file_id)}">HTML 변환 요청</button>`) : ''}
        ${M.can_download ? `<button class="btn sm ghost" data-act="lmsb-mdl" data-r="${esc(r.id)}" data-f="${esc(f.file_id)}">내려받기</button>` : ''}</span></div>`).join('') || '<div class="empty">파일이 없습니다.</div>'}
      <div data-lmsb-mbox></div><p class="mini">HWP · DOC · PPT · XLS 바로 보기는 HTML 변환 엔진 <b>연동 후 동작</b>합니다(변환 요청은 대기열에 쌓이고, 엔진이 결과를 넣으면 「변환본 보기」가 열립니다).</p>`,
      [{ id: 'ok', label: '학습 마침', kind: 'pri', run: () => { mark({ time_sec: Math.round((Date.now() - t0) / 1000) }).then(() => X.refresh()); } }], true);
    if ((r.completion || {}).type !== 'time') mark({}); return w;
  };
  ACT['lmsb-mview'] = async el => { const f = await X.run('b', 'material-file', { resource: el.dataset.r, file_id: el.dataset.f, mode: 'view' }); if (!f) return; const box = $('[data-lmsb-mbox]'); if (!box) return; const k = el.dataset.k;
    if (k === 'text') box.innerHTML = `<pre class="lmsx-wiki">${esc(new TextDecoder().decode(bin(f.b64)))}</pre>`;
    else { const url = URL.createObjectURL(new Blob([bin(f.b64)], { type: k === 'pdf' ? 'application/pdf' : f.mime })); box.innerHTML = k === 'pdf' ? `<iframe class="lmsb-page" title="${esc(f.name)}" src="${url}"></iframe>` : `<img src="${url}" alt="${esc(f.name)}" style="max-width:100%">`; } };
  ACT['lmsb-mdl'] = async el => { const f = await X.run('b', 'material-file', { resource: el.dataset.r, file_id: el.dataset.f, mode: 'download' }); if (!f) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bin(f.b64)], { type: f.mime })); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  ACT['lmsb-mcreq'] = async el => { const r = await X.run('b', 'convert-request', { resource: el.dataset.r, file_id: el.dataset.f }); if (r) { toast(r.note, 'ok'); el.textContent = '변환 대기 중'; el.disabled = true; } };
  ACT['lmsb-mconv'] = async el => { const r = await X.run('b', 'converted', { resource: el.dataset.r, file_id: el.dataset.f }); const box = $('[data-lmsb-mbox]'); if (r && box) box.innerHTML = `<div class="lmsx-wiki">${typeof safeHTML === 'function' ? safeHTML(r.html || '') : esc(r.html || '')}</div>`; };
  ACT['lmsb-dls'] = async el => { const r = await X.run('b', 'downloads', { resource: el.dataset.id }); const box = $('[data-lmsb-mbox]'); if (r && box) box.innerHTML = `<div class="ch"><b>열람 · 내려받기 기록</b></div>` + table(['학번', '파일', '보기', '내려받기', '최근'], r.rows.map(x => [esc(x.no), esc(x.file), x.views, x.downloads, fmt(x.last_at)]), '기록이 없습니다.') + `<p class="mini">아직 안 본 학생: ${r.not_yet.map(esc).join(', ') || '없음'}</p>`; };
  ACT['lmsb-dl'] = async el => { const f = await X.run('b', 'file', { id: el.dataset.f }); if (!f) return; const bin = atob(f.b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: f.mime })); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  X.download = id => ACT['lmsb-dl']({ dataset: { f: id } });
  ACT['lmsb-pkg'] = () => { modal('콘텐츠 패키지 올리기', `<p class="mini">SCORM 1.2 · 2004 zip(imsmanifest.xml 포함) 또는 비표준 HTML5 zip(index.html)을 고르세요. 브라우저에서 압축을 풀어 매니페스트를 읽습니다.</p><label>zip 파일<input type="file" name="zip" accept=".zip,application/zip"></label><div class="form2"><label>제목(비우면 매니페스트 제목)<input name="t" maxlength="200"></label><label>차시<select name="sid">${sesOpts('')}</select></label></div><p class="mini" data-lmsb-pkgst></p>`,
    [{ id: 'ok', label: '올리기', kind: 'pri', run: m => { const f = m.querySelector('[name=zip]').files[0]; if (!f) { toast('zip 파일을 고르세요.', 'warn'); return false; } const st = m.querySelector('[data-lmsb-pkgst]'); st.textContent = '압축을 풀고 올리는 중…';
      uploadPackage(f, fv(m, 'sid'), fv(m, 't')).then(r => { closeModal(); done2(`${r.manifest.version === 'none' ? 'HTML5' : 'SCORM ' + r.manifest.version} 패키지를 올렸습니다(SCO ${r.manifest.scos.length}개 · 파일 ${r.n}개).`); }).catch(e => { st.textContent = e.message; X.err(e); }); return false; } }]); };
  ACT['lmsb-srep'] = async el => { const r = await X.run('b', 'scorm-report', { resource: el.dataset.id }); if (!r) return; const box = $('[data-lmsb-srepbox]'); if (box) box.innerHTML = `<div class="ch"><b>학습 기록(cmi)</b></div>` + table(['학번', 'SCO', '상태', '합격', '점수', '누적 시간', '접속', '최근'], r.rows.map(x => [esc(x.who), esc(x.sco), esc(x.status || '—'), esc(x.success || '—'), x.score ?? '—', Math.round(x.total_sec) + '초', x.sessions, fmt(x.updated_at)]), '아직 기록이 없습니다.'); };
  ACT['lmsb-syl'] = () => modal('수업계획서 반영', `<p class="mini">비우면 학사에서 받은 이 분반 수업계획서(연동 후 동작)를 씁니다. 붙여 넣기 형식: 한 줄에 「주차, 주제, 계획」</p><textarea name="tx" rows="6" placeholder="1, 오리엔테이션, 강의 소개&#10;2, 배열과 리스트, 선형 자료구조"></textarea>`,
    [{ id: 'ok', label: '반영', kind: 'pri', run: m => { const t = m.querySelector('[name=tx]').value.trim(); const weeks = t ? t.split(/\r?\n/).filter(Boolean).map(l => { const [w, ti, ...p] = l.split(','); return { week: String(w).trim(), title: (ti || '').trim(), plan: p.join(',').trim() }; }) : undefined;
      X.run('b', 'syllabus-import', { section: X.sec, weeks }).then(r => r && done2(`${r.weeks}개 주차에 계획을 반영했습니다.`)); } }]);
  ACT['lmsb-seq'] = el => X.run('b', 'opt-set', { section: X.sec, sequential: el.checked }, el.checked ? '순차 학습을 켰습니다.' : '순차 학습을 껐습니다.').then(() => X.refresh());
  ACT['lmsb-level'] = el => X.run('b', 'level-set', { section: X.sec, no: el.dataset.no, level: el.value }, '수준을 바꿨습니다.');
  ACT['lmsb-lvauto'] = () => { const res = allRes().filter(r => r.kind !== 'label'); modal('진단 점수로 수준 배정', `<div class="form2"><label>진단 자원<select name="r">${res.map(r => `<option value="${esc(r.id)}">${esc(r.title)}</option>`).join('')}</select></label><label>기초(미만)<input name="lo" type="number" value="60"></label><label>심화(이상)<input name="hi" type="number" value="85"></label></div>`,
    [{ id: 'ok', label: '배정', kind: 'pri', run: m => { X.run('b', 'level-auto', { section: X.sec, res: fv(m, 'r'), low: fv(m, 'lo'), high: fv(m, 'hi') }).then(r => r && done2(`${r.assigned}명의 수준을 배정했습니다.`)); } }]); };
  ACT['lmsb-adapt'] = () => { const res = allRes().filter(r => r.kind !== 'label'); const op = o => res.map(r => `<option value="${esc(r.id)}">${esc(r.title)}</option>`).join('');
    modal('적응형 규칙 추가', `<div class="form2"><label>기준 자원(점수)<select name="if">${op()}</select></label><label>기준 점수<input name="b" type="number" value="70"></label></div><label>미만이면 보충 자원</label><div class="lmsb-cks">${res.map(r => `<label class="ul-ck"><input type="checkbox" name="th" value="${esc(r.id)}"> ${esc(r.title)}</label>`).join('')}</div><label>이상이면 심화 자원</label><div class="lmsb-cks">${res.map(r => `<label class="ul-ck"><input type="checkbox" name="el" value="${esc(r.id)}"> ${esc(r.title)}</label>`).join('')}</div>`,
      [{ id: 'ok', label: '추가', kind: 'pri', run: m => { const q = { if_res: fv(m, 'if'), below: +fv(m, 'b') || 0, then: $$('[name=th]:checked', m).map(x => x.value), else: $$('[name=el]:checked', m).map(x => x.value) }; X.run('b', 'opt-set', { section: X.sec, adaptive: [...(OV.opt.adaptive || []), q] }, '규칙을 추가했습니다.').then(r => r && X.refresh()); } }], true); };
  ACT['lmsb-adapt-del'] = el => { const a = (OV.opt.adaptive || []).filter((_, i) => i !== +el.dataset.i); X.run('b', 'opt-set', { section: X.sec, adaptive: a }, '규칙을 지웠습니다.').then(r => r && X.refresh()); };
  /* 빈 강의실 첫 행동(확인 없이 — 덮어쓸 주차가 없음) · 지금 할 일의 「자료 넣기」 */
  ACT['lmsb-quick'] = el => { X.run('b', 'template-apply', { section: X.sec, template: el.dataset.v || 'blended' }).then(r => r && done2(`주차 ${r.weeks} · 차시 ${r.sessions} · 자원 ${r.resources}개를 만들었습니다.`)); };
  ACT['lmsb-todo-res'] = el => resModal(null, el.dataset.s);
  ACT['lmsb-wkall'] = () => { UI.lmsbOpenAll = UI.lmsbOpenAll ? 0 : 1; X.refresh(); };
  ACT['lmsb-tpl-apply'] = el => { if (!confirm('템플릿을 적용할까요? 같은 주차 · 차시 번호는 덮어쓰고 자원은 추가됩니다.')) return; X.run('b', 'template-apply', { section: X.sec, template: el.dataset.v }).then(r => r && done2(`주차 ${r.weeks} · 차시 ${r.sessions} · 자원 ${r.resources}개를 만들었습니다.`)); };
  ACT['lmsb-tpl-save'] = () => modal('템플릿으로 저장', '<label>이름<input name="n" maxlength="60"></label>', [{ id: 'ok', label: '저장', kind: 'pri', run: m => { X.run('b', 'template-save', { section: X.sec, name: fv(m, 'n') }, '템플릿을 저장했습니다.').then(r => r && X.refresh()); } }]);
  ACT['lmsb-tpl-del'] = el => X.run('b', 'template-del', { section: X.sec, id: el.dataset.v }, '템플릿을 지웠습니다.').then(r => r && X.refresh());
  ACT['lmsb-copy'] = () => { const from = ($('[data-lmsb-copyfrom]') || {}).value; const sh = ($('[data-lmsb-copyshift]') || {}).value; const parts = $$('[data-lmsb-copypart]:checked').map(x => x.dataset.lmsbCopypart);
    X.run('b', 'copy', { from, to: X.sec, parts, shift_days: sh === '' ? undefined : sh }).then(r => r && done2(`가져왔습니다 — 주차 ${r.weeks} · 차시 ${r.sessions} · 자원 ${r.resources}개, 날짜 ${r.shift_days}일 이동`)); };
  ACT['lmsb-shift'] = () => { const d = ($('[data-lmsb-shift]') || {}).value; X.run('b', 'shift', { section: X.sec, days: d }).then(r => r && done2(`${r.days}일 옮겼습니다(차시 ${r.sessions}개).`)); };
  ACT['lmsb-backup'] = () => { const parts = $$('[data-lmsb-bkpart]:checked').map(x => x.dataset.lmsbBkpart); X.run('b', 'backup', { section: X.sec, parts, note: ($('[data-lmsb-bknote]') || {}).value || '' }).then(r => r && done2(`백업했습니다(${Math.ceil(r.bytes / 1024)}KB).`)); };
  ACT['lmsb-restore'] = el => { const parts = el.dataset.parts.split(',');
    modal('백업에서 복구', `<p class="mini">전체 또는 일부 항목만 복구합니다.</p><div class="lmsb-cks">${parts.map(p => `<label class="ul-ck"><input type="checkbox" name="p" value="${p}" checked> ${({ structure: '주차 · 차시', resources: '학습자원', activities: '학습활동', boards: '공지 · 자료실' })[p]}</label>`).join('')}</div><label>방식<select name="m"><option value="replace">바꾸기(기존 자원은 휴지통으로)</option><option value="merge">덧붙이기</option></select></label>`,
      [{ id: 'ok', label: '복구', kind: 'pri', run: m => { X.run('b', 'restore', { backup: el.dataset.id, parts: $$('[name=p]:checked', m).map(x => x.value), mode: fv(m, 'm') }).then(r => r && done2(`복구했습니다 — 주차 ${r.weeks} · 차시 ${r.sessions} · 자원 ${r.resources}`)); } }]); };
  ACT['lmsb-bkdl'] = async el => { const d = await X.run('b', 'backup-get', { backup: el.dataset.id }); if (!d) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })); a.download = `강좌백업_${today()}.json`; a.click(); };
  ACT['lmsb-bkdel'] = el => { if (confirm('백업을 지울까요?')) X.run('b', 'backup-del', { backup: el.dataset.id }, '지웠습니다.').then(r => r && X.refresh()); };
  ACT['lmsb-bkimport'] = async el => { const f = el.files[0]; if (!f) return; let d; try { d = JSON.parse(await f.text()); } catch (e) { return toast('JSON 파일이 아닙니다.', 'warn'); } X.run('b', 'backup-import', { section: X.sec, data: d, note: f.name.slice(0, 200) }).then(r => r && done2('백업 파일을 목록에 넣었습니다. 복구를 눌러 적용하세요.')); };
  ACT['lmsb-restore-res'] = el => X.run('b', 'res-restore', { id: el.dataset.id }, '복구했습니다.').then(r => r && X.refresh());
  ACT['lmsb-purge'] = el => { if (confirm('영구 삭제하면 되돌릴 수 없습니다. 계속할까요?')) X.run('b', 'res-purge', { id: el.dataset.id }, '영구 삭제했습니다.').then(r => r && X.refresh()); };
  ACT['lmsb-libuse'] = el => modal('내 자료를 이 강의실에', `<div class="form2"><label>차시<select name="sid">${sesOpts('')}</select></label><label>제목(비우면 파일 이름)<input name="t" maxlength="200"></label></div><label class="ul-ck"><input type="checkbox" name="dl" checked> 학생 내려받기 허용</label>`,
    [{ id: 'ok', label: '넣기', kind: 'pri', run: m => { X.run('b', 'mylib-use', { id: el.dataset.id, section: X.sec, session_id: fv(m, 'sid') || null, title: fv(m, 't'), download: fv(m, 'dl') }, '이 강의실 자원으로 넣었습니다.').then(r => r && X.refresh()); } }]);
  ACT['lmsb-libdel'] = el => X.run('b', 'mylib-del', { id: el.dataset.id }, '자료함에서 뺐습니다(강의실 자원은 그대로).').then(r => r && X.refresh());
  ACT['lmsb-reuse'] = el => X.run('b', 'res-reuse', { section: X.sec, src: el.dataset.id }, '내 강의실(공통 자료)로 복사했습니다.').then(r => r && X.refresh());
  ACT['lmsb-perm'] = el => X.run('b', 'perm-set', { role: el.dataset.r, perm: el.dataset.p, allowed: el.checked }, '권한을 바꿨습니다.').then(r => { if (!r) el.checked = !el.checked; });
  ACT['lmsb-menu-save'] = () => X.run('b', 'menu-set', { section: X.sec, modules: $$('[data-lmsb-mod]').map(x => ({ id: x.dataset.lmsbMod, on: x.checked })) }, '강의실 메뉴를 저장했습니다.').then(r => r && X.loadMenu().then(() => render()));
  ACT['lmsb-pref-save'] = () => X.run('b', 'menu-pref', { section: X.sec, hidden: $$('[data-lmsb-hide]:checked').map(x => x.dataset.lmsbHide), order: (($('[data-lmsb-ord]') || {}).value || '').split(',').map(s => s.trim()).filter(Boolean) }, '맞춤 메뉴를 저장했습니다.').then(r => r && X.loadMenu().then(() => render()));
})();
