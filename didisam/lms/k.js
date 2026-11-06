/* v30 학사 LMS 묶음 K — 설문(SFR-014 · 022 · 043 · 067)
   대학 · 학과 · 프로그램 · 교과(분반) · 차시 단위 설문, 다국어 문항, 동영상 · HTML 안내, 템플릿, 독려, 통계(빈도 · 교차 · 리커트), CSV 내보내기 · 업로드,
   강의평가(교수 공개/미공개), 설문 미참여 시 다음 단계 제한(게이트 — 다른 묶음은 GET /api/lms/k/gate 호출).
   운영(서버) 모드: /api/lms/k/* 호출. 데모 모드: S.lms.k 상태 + 같은 규칙의 브라우저 엔진. 공용 도우미 LW4는 묶음 N · Q도 쓴다. */
(function () {
  'use strict';
  if (!document.querySelector('link[data-lw4]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/k.css?v=30.0'; l.dataset.lw4 = '1'; document.head.appendChild(l); }

  /* ── 공용 도우미(K · N · Q) ── */
  const LW4 = window.LW4 = window.LW4 || { demo: {} };
  LW4.live = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  LW4.err = (status, message) => { const e = new Error(message); e.status = status; throw e; };
  LW4.call = async (pfx, method, name, args = {}) => {
    if (LW4.live()) {
      const q = method === 'GET' ? '?' + new URLSearchParams(Object.entries(args).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString() : '';
      const r = await fetch(`/api/lms/${pfx}/${name}${q}`, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}) }, body: method !== 'GET' ? JSON.stringify(args) : undefined });
      const j = await r.json().catch(() => ({})); if (!r.ok) LW4.err(r.status, j.message || `오류 ${r.status}`); return j;
    }
    const E = LW4.demo[pfx]; const f = E && E[`${method} ${name}`]; if (!f) LW4.err(404, '없는 주소입니다.');
    const role = S.me.role === 'admin' ? 'owner' : S.me.role;
    const out = await f(JSON.parse(JSON.stringify(args)), { role, email: S.me.email || S.me.name || 'demo' });
    save(); return JSON.parse(JSON.stringify(out));
  };
  /* 화면 동작: 실패하면 토스트, 성공하면 다시 그린다 */
  LW4.run = async (pfx, method, name, args, okMsg) => {
    try { const r = await LW4.call(pfx, method, name, args); if (okMsg) toast(okMsg, 'ok'); return r; }
    catch (e) { toast(e.message || '오류가 발생했습니다.', 'warn'); return null; }
  };
  LW4.uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  LW4.now = () => new Date().toISOString();
  LW4.fmt = v => v ? String(v).replace('T', ' ').slice(0, 16) : '';
  LW4.download = (name, mime, content) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
  LW4.printHtml = (title, html) => { const w = window.open('', '_blank'); if (!w) return toast('팝업이 막혀 있습니다. 내려받기를 쓰세요.', 'warn'); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch (e) { } }, 300); };
  LW4.parseCSV = txt => { const rows = []; let row = [], cur = '', q = false; txt = txt.replace(/^﻿/, '');
    for (let i = 0; i < txt.length; i++) { const ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
    if (cur || row.length) { row.push(cur); rows.push(row); } return rows.filter(r => r.some(c => c.trim())); };
  LW4.pickFile = accept => new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => { const f = i.files[0]; if (!f) return ok(null); const r = new FileReader(); r.onload = () => ok(r.result); r.readAsText(f, 'utf-8'); }; i.click(); });
  LW4.st = (txt, tone = '') => `<span class="lw-st ${tone}">${esc(txt)}</span>`;
  LW4.hbar = (label, pct, right) => `<div class="lw-hbar"><span>${esc(label)}</span><span><i style="width:${Math.max(0, Math.min(100, +pct || 0))}%"></i></span><span>${esc(right)}</span></div>`;
  /* ── 화면 단순화 도우미(2단계: 탭 4개 + 더 보기 · 주 버튼 1개 + ⋯ · 「지금 할 일」 한 줄 · 데모 표시) — K · N · Q · L · D 공용 ──
     펼침 목록은 ux.js의 details.uxmore 처리(화면 기준 position:fixed 배치 · 바깥 클릭 닫기)를 그대로 쓴다. */
  LW4.more = (items, label, cls = '') => items ? `<details class="uxmore lw-more ${cls}"><summary title="다른 작업">${label || `${typeof ic === 'function' ? ic('dots', 18) : '⋯'}<span class="sr">다른 작업</span>`}</summary><div class="uxpop" role="menu">${items}</div></details>` : '';
  LW4.mi = (act, label, data = {}, cls = '') => `<button type="button" role="menuitem" class="${cls}" data-act="${act}"${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(String(v))}"`).join('')}>${esc(label)}</button>`;
  LW4.tabs = (key, list, cur, n = 4, act = 'tab') => {
    const vis = list.slice(0, n); if (cur && !vis.some(x => x[0] === cur)) { const c = list.find(x => x[0] === cur); if (c) vis[n - 1] = c; }
    const rest = list.filter(x => !vis.includes(x)); let h = tabs(key, vis, cur); if (act !== 'tab') h = h.split('data-act="tab"').join(`data-act="${act}"`);
    return `<div class="lw-tabrow">${h}${rest.length ? LW4.more(rest.map(([id, l]) => `<button type="button" role="menuitem" data-act="${act}" data-key="${esc(key)}" data-v="${esc(id)}">${esc(l)}</button>`).join(''), `더 보기 <em>${rest.length}</em>`, 'lw-tabmore') : ''}</div>`;
  };
  /* 지금 할 일: [{ n, t: '승인 대기', btn: '<button …>' }] — 숫자가 0인 항목은 뺀다 */
  LW4.todo = (items, none = '지금 처리할 일이 없습니다.') => { const L = items.filter(x => x && x.n); return `<div class="lw-todo" role="status"><b class="lw-todoh">지금 할 일</b>${L.length ? L.map(x => `<span class="lw-todoi"><em>${x.n}</em>${esc(x.t)}${x.btn ? ' ' + x.btn : ''}</span>`).join('') : `<span class="lw-todoi lw-muted">${esc(none)}</span>`}</div>`; };
  LW4.go = (act, label, data = {}) => `<button type="button" class="btn sm lw-go" data-act="${act}"${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(String(v))}"`).join('')}>${esc(label)} →</button>`;
  LW4.demoTag = live => (live === undefined ? LW4.live() : live) ? '' : '<small class="lw-demo" title="학교 서버와 연동하기 전 데모 모드입니다. 저장한 내용은 이 브라우저에만 남습니다.">데모: 브라우저에만 저장</small>';
  LW4.addMenu = (id, def, after) => {
    MENU[id] = def;
    if (PRESET.univ_lms && !PRESET.univ_lms.on.includes(id)) PRESET.univ_lms.on.push(id);
    if (PRESET.univ && !PRESET.univ.on.includes(id) && !PRESET.univ.off.includes(id)) PRESET.univ.off.push(id);
    (LW4.menus = LW4.menus || []).push(id);
  };
  /* 이미 만든 학사 LMS 기관(S.nav)에도 메뉴를 붙인다 */
  if (!LW4.navPatched) {
    LW4.navPatched = true; const baseRender = render;
    render = function () {
      try { if (S && S.nav && typeof ULMS === 'function' && ULMS()) (LW4.menus || []).forEach(id => { const ws = MENU[id].ws; const T = S.nav.tabs[ws] = S.nav.tabs[ws] || []; if (!T.find(x => x.id === id)) T.push({ id, on: true }); if (!S.nav.ws.includes(ws)) S.nav.ws.push(ws); }); } catch (e) { }
      return baseRender.apply(this, arguments);
    };
  }
  /* 데모 학사 구성원(학번 · 학과 · 학년 · 학적만 — 이름 없음) */
  LW4.UNITS = { CSE: '컴퓨터공학과', BUS: '경영학과', NUR: '간호학과', ENG: '공과대학' };
  LW4.roster = [['20261001', 'student', 'CSE', 1], ['20261002', 'student', 'CSE', 2], ['20261003', 'student', 'BUS', 1], ['20261004', 'student', 'BUS', 3], ['20261005', 'student', 'CSE', 4], ['20261006', 'student', 'NUR', 2],
    ['20261007', 'student', 'NUR', 3], ['20261008', 'student', 'BUS', 2], ['20251009', 'student', 'CSE', 2], ['G2026010', 'student', 'CSE', 1], ['P2026001', 'professor', 'CSE', 0], ['S2026001', 'staff', 'BUS', 0]]
    .map(([member_no, kind, unit_code, grade_year]) => ({ member_no, kind, unit_code, grade_year, status: 'active' }));
  LW4.person = no => LW4.roster.find(p => p.member_no === no) || { kind: 'external', unit_code: '', grade_year: 0, status: 'active' };
  LW4.targetOk = (t, p) => { t = t || {}; const has = (a, v) => !a || !a.length || a.map(String).includes(String(v));
    return has(t.kinds, p.kind) && has(t.grades, p.grade_year) && (has(t.units, p.unit_code) || (p.unit_code === 'CSE' && has(t.units, 'ENG'))) && has(t.statuses, p.status); };
  LW4.no = v => { v = String(v || '').trim(); if (!/^[A-Za-z0-9_-]{4,20}$/.test(v)) LW4.err(400, '학번(사번) 형식이 올바르지 않습니다.'); return v; };
  LW4.need = (actor, roles) => { if (!roles.includes(actor.role)) LW4.err(403, '이 작업을 할 권한이 없습니다.'); };

  /* ═════════ 데모 엔진(서버 lms_k_* 함수와 같은 규칙) ═════════ */
  const ens = () => { S.lms = S.lms || {}; const K = S.lms.k = S.lms.k || { surveys: [], remind: [] }; if (!K.seeded) { K.seeded = true; seedK(K); } return K; };
  const LIK5 = [['전혀 그렇지 않다', 'Strongly disagree'], ['그렇지 않다', 'Disagree'], ['보통이다', 'Neutral'], ['그렇다', 'Agree'], ['매우 그렇다', 'Strongly agree']].map(([ko, en]) => ({ ko, en }));
  const tx = (j, lang) => (j && (j[lang] || j.ko)) || '';
  const getS = id => { const s = ens().surveys.find(x => x.survey_id === id); if (!s) LW4.err(404, '설문을 찾을 수 없습니다.'); return s; };
  const out = s => { const { questions, responses, ...o } = s; return { ...o, n_q: questions.filter(q => !['video', 'html'].includes(q.type)).length, n_resp: responses.length }; };
  const qout = (q, lang) => ({ ...q, label: tx(q.text, lang), labels: q.options.map(o => tx(o, lang)) });
  function putQs(s, qs) {
    if (!Array.isArray(qs)) LW4.err(400, '문항 목록 형식이 올바르지 않습니다.'); if (qs.length > 200) LW4.err(400, '문항은 200개까지입니다.');
    s.questions = qs.map((q, i) => { const n = i + 1; const ty = q.type || 'single';
      if (!['single', 'multi', 'likert5', 'likert7', 'nps', 'text', 'longtext', 'video', 'html'].includes(ty)) LW4.err(400, n + '번 문항 유형이 올바르지 않습니다.');
      const text = typeof q.text === 'string' ? { ko: q.text } : (q.text || {}); if (!String(text.ko || '').trim() && !['video', 'html'].includes(ty)) LW4.err(400, n + '번 문항 내용을 입력하세요.');
      let options = (q.options || []).map(o => typeof o === 'string' ? { ko: o } : o);
      if (['single', 'multi'].includes(ty) && options.length < 2) LW4.err(400, n + '번 문항 보기를 2개 이상 입력하세요.');
      if (ty === 'likert5' && options.length !== 5) options = LIK5; if (ty === 'likert7' && options.length !== 7) options = [1, 2, 3, 4, 5, 6, 7].map(x => ({ ko: String(x) }));
      return { qid: LW4.uuid(), seq: n, type: ty, text, options, required: !['video', 'html'].includes(ty) && q.required !== false, meta: q.meta || {} }; });
  }
  const GATES = ['completion', 'certificate', 'next', 'grade', 'classroom'];
  function mk(a, actor) { return { survey_id: LW4.uuid(), title: a.title, i18n: a.i18n || {}, langs: a.langs || ['ko'], scope: a.scope || 'univ', scope_ref: a.scope_ref || '', kind: a.kind || 'general', is_template: !!a.is_template, template_id: null, status: 'draft', target: a.target || {}, opens_at: a.opens_at || null, closes_at: a.closes_at || null, anonymous: a.anonymous !== false, prof_public: !!a.prof_public, gate_steps: (a.gate_steps || []).filter(g => GATES.includes(g)), intro_html: a.intro_html || '', video_url: a.video_url || '', created_by: actor.email, created_at: LW4.now(), updated_at: LW4.now(), questions: [], responses: [] }; }
  function eligible(s, no) { const p = LW4.person(no); if (!LW4.targetOk(s.target, p)) return false;
    if (s.scope === 'program' && LW4.demo.q && LW4.demo.q.approved) return LW4.demo.q.approved(s.scope_ref, no);
    if (s.scope === 'section') { const c = (S.classes || []).find(x => String(x.id) === s.scope_ref); return !c || ['20261001', '20261002', '20261003', '20261005'].includes(no); }
    if (s.scope === 'dept' && s.scope_ref) return p.unit_code === s.scope_ref; return true; }
  function store(s, no, ans, src) {
    const clean = {};
    s.questions.filter(q => !['video', 'html'].includes(q.type)).forEach(q => { let v = ans[q.qid] ?? ans[q.seq];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) { if (q.required) LW4.err(400, q.seq + '번 문항에 답하세요.'); return; }
      const n = q.options.length;
      if (q.type === 'single' || q.type.startsWith('likert') || q.type === 'nps') { v = +v; const lo = q.type === 'single' || q.type === 'nps' ? 0 : 1, hi = q.type === 'single' ? n - 1 : q.type === 'nps' ? 10 : n; if (!Number.isInteger(v) || v < lo || v > hi) LW4.err(400, q.seq + '번 문항의 응답 값이 올바르지 않습니다.'); }
      else if (q.type === 'multi') { if (typeof v === 'string') v = v.split(/[;|]/).filter(x => /^\d+$/.test(x)).map(Number); if (!Array.isArray(v) || v.some(x => !Number.isInteger(+x) || +x < 0 || +x > n - 1)) LW4.err(400, q.seq + '번 문항의 응답 값이 올바르지 않습니다.'); v = v.map(Number); }
      else v = String(v).slice(0, q.type === 'text' ? 500 : 4000);
      clean[q.qid] = v; });
    if (s.responses.find(r => r.member_hash === no)) LW4.err(409, '이미 응답한 설문입니다.');
    const p = LW4.person(no); s.responses.push({ rid: LW4.uuid(), member_hash: no, member_no: s.anonymous ? null : no, dims: { kind: p.kind, unit_code: p.unit_code, grade_year: p.grade_year, status: p.status }, answers: clean, source: src, submitted_at: LW4.now() });
  }
  function stats(s, by, lang) {
    const R = s.responses; const dims = [...new Set(R.map(r => String(r.dims[by] ?? '')))].sort();
    const questions = s.questions.filter(q => !['video', 'html'].includes(q.type)).map(q => {
      const item = { qid: q.qid, seq: q.seq, type: q.type, label: tx(q.text, lang) }; const ans = R.filter(r => q.qid in r.answers); item.answered = ans.length;
      if (['single', 'multi', 'nps'].includes(q.type) || q.type.startsWith('likert')) {
        const opts = q.type === 'nps' ? Array.from({ length: 11 }, (_, i) => ({ ko: String(i) })) : q.options; const off = q.type.startsWith('likert') ? 1 : 0;
        const vals = []; ans.forEach(r => { const v = r.answers[q.qid]; (Array.isArray(v) ? v : [v]).forEach(x => vals.push({ i: +x - off, d: String(r.dims[by] ?? '') })); });
        const mean = arr => arr.length ? Math.round(arr.reduce((a, v) => a + v.i + off, 0) / arr.length * 100) / 100 : null;
        item.freq = opts.map((o, i) => { const n = vals.filter(v => v.i === i).length; return { i, label: tx(o, lang), n, pct: ans.length ? Math.round(1000 * n / ans.length) / 10 : 0 }; });
        item.mean = q.type.startsWith('likert') || q.type === 'nps' ? mean(vals) : null;
        item.cross = dims.map(d => { const dv = vals.filter(v => v.d === d); return { dim: d, counts: opts.map((o, i) => dv.filter(v => v.i === i).length), mean: q.type.startsWith('likert') || q.type === 'nps' ? mean(dv) : null }; });
      } else item.texts = ans.map(r => r.answers[q.qid]).filter(Boolean).slice(0, 100).sort();
      return item; });
    return { survey: out(s), n: R.length, by, dims, questions };
  }
  const csvq = v => v == null ? '' : '"' + String(/^[=+\-@]/.test(String(v)) ? "'" + v : v).replace(/"/g, '""') + '"';
  function exportCsv(s, lang) {
    const Q = s.questions.filter(q => !['video', 'html'].includes(q.type));
    const head = ['응답번호', '학번', '학과', '학년', '구분', '응답시각', ...Q.map(q => csvq(q.seq + '. ' + tx(q.text, lang)))].join(',');
    const body = s.responses.map((r, i) => [i + 1, csvq(r.member_no || '(익명)'), csvq(r.dims.unit_code), r.dims.grade_year, csvq(r.dims.kind), LW4.fmt(r.submitted_at), ...Q.map(q => { const v = r.answers[q.qid];
      return csvq(v === undefined ? null : q.type === 'multi' ? v.map(i => tx(q.options[i], lang)).join(';') : q.type === 'single' ? tx(q.options[v], lang) : v); })].join(','));
    return [head, ...body].join('\r\n');
  }
  function copyS(src, title, scope, ref, kind, actor) { const s = getS(src); const n = { ...JSON.parse(JSON.stringify(s)), survey_id: LW4.uuid(), title: title || s.title, scope: scope || s.scope, scope_ref: ref || '', kind: kind || s.kind, template_id: src, is_template: false, status: 'draft', created_by: actor.email, created_at: LW4.now(), responses: [] };
    n.questions = n.questions.map(q => ({ ...q, qid: LW4.uuid() })); ens().surveys.unshift(n); return n; }
  const gateCheck = (no, step, scope, ref) => { const p = ens().surveys.filter(s => ['open', 'closed'].includes(s.status) && !s.is_template && s.gate_steps.includes(step) && (!scope || s.scope === scope) && (!ref || s.scope_ref === ref) && !s.responses.find(r => r.member_hash === no) && eligible(s, no)).map(s => ({ survey_id: s.survey_id, title: s.title }));
    return { blocked: p.length > 0, step, pending: p, message: p.length ? '설문에 먼저 참여해야 다음 단계로 갈 수 있습니다.' : '' }; };
  LW4.gate = gateCheck; LW4.kens = ens;
  const D = LW4.demo.k = {
    'GET surveys': a => ({ items: ens().surveys.filter(s => (!a.scope || s.scope === a.scope) && (!a.ref || s.scope_ref === a.ref) && (!a.kind || s.kind === a.kind) && (!a.status || s.status === a.status) && s.is_template === ['1', 'true', true, 1].includes(a.template) && (!a.q || s.title.includes(a.q))).map(out) }),
    'GET survey': a => { const s = getS(a.survey_id); const lang = a.lang || 'ko'; return { ...out(s), lang, title_l: s.i18n[lang] || s.title, questions: s.questions.map(q => qout(q, lang)) }; },
    'POST survey/save': (a, actor) => { const t = String(a.title || '').trim(); if (!t) LW4.err(400, '설문 제목을 입력하세요.'); let s;
      if (a.survey_id) { s = getS(a.survey_id); if (actor.role === 'teacher' && s.created_by !== actor.email) LW4.err(403, '직접 만든 설문만 고칠 수 있습니다.'); Object.assign(s, mk(a, actor), { survey_id: s.survey_id, status: s.status, created_by: s.created_by, created_at: s.created_at, questions: s.questions, responses: s.responses, template_id: s.template_id }); }
      else { s = mk({ ...a, title: t }, actor); ens().surveys.unshift(s); }
      if (a.questions) { if (s.responses.length) LW4.err(409, '응답이 있는 설문은 문항을 바꿀 수 없습니다. 복사해서 새 설문으로 만드세요.'); putQs(s, a.questions); }
      return D['GET survey']({ survey_id: s.survey_id }); },
    'POST survey/open': (a, actor) => { const s = getS(a.survey_id); if (s.is_template) LW4.err(409, '템플릿은 배포할 수 없습니다. 템플릿으로 새 설문을 만드세요.'); if (!s.questions.some(q => !['video', 'html'].includes(q.type))) LW4.err(409, '문항이 없는 설문은 배포할 수 없습니다.'); s.status = 'open'; return out(s); },
    'POST survey/close': a => { const s = getS(a.survey_id); s.status = 'closed'; return out(s); },
    'POST survey/delete': (a, actor) => { LW4.need(actor, ['owner', 'sub']); const s = getS(a.survey_id); if (s.responses.length) LW4.err(409, '응답이 있는 설문은 지울 수 없습니다. 마감하세요.'); ens().surveys = ens().surveys.filter(x => x !== s); return { ok: true, survey_id: s.survey_id }; },
    'POST survey/copy': (a, actor) => D['GET survey']({ survey_id: copyS(a.survey_id, a.title, a.scope, a.scope_ref, a.kind, actor).survey_id }),
    'POST respond': a => { const s = getS(a.survey_id); const no = LW4.no(a.member_no); if (s.status !== 'open') LW4.err(409, '응답 기간이 아닌 설문입니다.'); if (!eligible(s, no)) LW4.err(403, '설문 대상이 아닙니다.'); store(s, no, a.answers || {}, 'web'); return { ok: true, survey_id: s.survey_id }; },
    'POST import': (a, actor) => { LW4.need(actor, ['owner', 'sub']); const s = getS(a.survey_id); let ok = 0; const errors = []; (a.rows || []).forEach((r, i) => { try { store(s, LW4.no(r.member_no), r.answers || {}, 'import'); ok++; } catch (e) { errors.push({ row: i + 1, message: e.message }); } }); return { ok, failed: errors.length, errors }; },
    'GET pending': a => { const no = LW4.no(a.member_no); return { items: ens().surveys.filter(s => s.status === 'open' && !s.is_template && !s.responses.find(r => r.member_hash === no) && eligible(s, no)).map(s => ({ survey_id: s.survey_id, title: s.title, kind: s.kind, scope: s.scope, scope_ref: s.scope_ref, closes_at: s.closes_at, gate_steps: s.gate_steps })) }; },
    'GET gate': a => { if (!GATES.includes(a.step)) LW4.err(400, '단계는 completion · certificate · next · grade · classroom 중 하나입니다.'); return gateCheck(LW4.no(a.member_no), a.step, a.scope || '', a.ref || ''); },
    'GET stats': (a, actor) => { const s = getS(a.survey_id); if (actor.role === 'teacher' && s.kind === 'course_eval' && !s.prof_public) LW4.err(403, '강의평가 결과가 교수자에게 공개되지 않았습니다.'); return stats(s, a.by || 'unit_code', a.lang || 'ko'); },
    'GET export': (a, actor) => { const s = getS(a.survey_id); if (actor.role === 'teacher' && s.kind === 'course_eval' && !s.prof_public) LW4.err(403, '강의평가 결과가 교수자에게 공개되지 않았습니다.'); return { filename: `설문결과_${s.title.replace(/[\\/:*?"<>|\s]+/g, '_')}.csv`, mime: 'text/csv; charset=utf-8', content: '﻿' + exportCsv(s, a.lang || 'ko') }; },
    'POST remind': (a, actor) => { LW4.need(actor, ['owner', 'sub']); const s = getS(a.survey_id); if (s.status !== 'open') LW4.err(409, '진행 중인 설문만 독려할 수 있습니다.'); const n = LW4.roster.filter(p => eligible(s, p.member_no) && !s.responses.find(r => r.member_hash === p.member_no)).length; ens().remind.push({ survey_id: s.survey_id, targets: n, at: LW4.now() }); return { ok: true, queued: ens().remind.filter(r => r.survey_id === s.survey_id).length, targets: n, status: 'queued', note: '메시지 연동 후 실제 발송됩니다.' }; },
    'POST course-eval': (a, actor) => { const sec = String(a.section_id || ''); if (!sec) LW4.err(400, '분반을 지정하세요.'); if (ens().surveys.find(s => s.scope === 'section' && s.scope_ref === sec && s.kind === 'course_eval')) LW4.err(409, '이 분반에는 이미 강의평가가 있습니다.');
      const c = (S.classes || []).find(x => String(x.id) === sec); const ttl = (c ? c.name : sec) + ' 강의평가'; let s;
      if (a.template_id) s = copyS(a.template_id, ttl, 'section', sec, 'course_eval', actor);
      else { s = mk({ title: ttl, i18n: { en: 'Course Evaluation' }, langs: ['ko', 'en'], scope: 'section', scope_ref: sec, kind: 'course_eval' }, actor); ens().surveys.unshift(s); putQs(s, EVALQ); }
      s.prof_public = !!a.prof_public; s.gate_steps = (a.gate_steps || ['grade']).filter(g => GATES.includes(g)); s.anonymous = true; return D['GET survey']({ survey_id: s.survey_id }); },
    'POST eval/public': (a, actor) => { LW4.need(actor, ['owner', 'sub']); const s = getS(a.survey_id); if (s.kind !== 'course_eval') LW4.err(409, '강의평가 설문만 공개 여부를 바꿉니다.'); s.prof_public = !!a.prof_public; return out(s); }
  };
  const EVALQ = [['수업 목표가 명확하게 제시되었다.', 'Course objectives were clearly presented.'], ['수업 내용이 체계적으로 구성되었다.', 'Content was well organized.'], ['교수자는 학습자의 질문에 성실히 답하였다.', 'The instructor answered questions sincerely.'], ['평가 방법이 공정하였다.', 'Assessment was fair.'], ['전반적으로 이 수업에 만족한다.', 'Overall I am satisfied with this course.']]
    .map(([ko, en]) => ({ type: 'likert5', text: { ko, en } })).concat([{ type: 'longtext', required: false, text: { ko: '수업의 좋았던 점과 개선할 점을 적어 주세요.', en: 'Strengths and suggestions.' } }]);
  function seedK(K) {
    const actor = { email: 'demo', role: 'owner' };
    const t = mk({ title: '비교과 만족도 기본 템플릿', is_template: true, langs: ['ko', 'en'], i18n: { en: 'Extracurricular satisfaction' } }, actor); putQs(t, [{ type: 'likert5', text: { ko: '프로그램 내용에 만족한다.', en: 'I am satisfied with the content.' } }, { type: 'likert5', text: { ko: '운영(일정 · 장소)이 적절했다.', en: 'Operation was appropriate.' } }, { type: 'nps', text: { ko: '이 프로그램을 친구에게 추천할 의향은?', en: 'How likely to recommend?' } }, { type: 'longtext', required: false, text: { ko: '건의 사항', en: 'Suggestions' } }]);
    const t2 = mk({ title: '강의평가 표준 템플릿', is_template: true, kind: 'course_eval', langs: ['ko', 'en'] }, actor); putQs(t2, EVALQ);
    const s = mk({ title: '2026 학생 생활 실태 조사', i18n: { en: '2026 Student Life Survey' }, langs: ['ko', 'en'], scope: 'univ', target: { kinds: ['student'] }, gate_steps: [], intro_html: '<p>응답은 익명으로 처리됩니다.</p>' }, actor);
    putQs(s, [{ type: 'single', text: { ko: '주로 이용하는 학습 공간은?', en: 'Main study space?' }, options: [{ ko: '도서관', en: 'Library' }, { ko: '학과 실습실', en: 'Lab' }, { ko: '집', en: 'Home' }] }, { type: 'multi', text: { ko: '필요한 지원(복수 선택)', en: 'Needed support' }, options: [{ ko: '학습 상담', en: 'Tutoring' }, { ko: '진로 상담', en: 'Career' }, { ko: '심리 상담', en: 'Counseling' }] }, { type: 'likert5', text: { ko: '학교 생활에 전반적으로 만족한다.', en: 'Overall satisfied.' } }, { type: 'longtext', required: false, text: { ko: '하고 싶은 말', en: 'Comments' } }]);
    s.status = 'open'; K.surveys.push(s, t, t2);
    [['20261001', 0, [0, 1], 4], ['20261002', 1, [1], 3], ['20261003', 0, [0, 2], 5], ['20261004', 2, [2], 2], ['20261006', 0, [0], 4], ['20261007', 1, [0, 1, 2], 4]]
      .forEach(([no, a, b, c]) => store(s, no, { 1: a, 2: b, 3: c, 4: no.endsWith('3') ? '도서관 좌석이 더 필요합니다.' : '' }, 'web'));
    /* 데모 학기 2026-2: 배포 전 만족도 설문 1 · 진행 중 중간 강의평가 1(응답 일부) */
    const d1 = mk({ title: '2026-2 비교과 프로그램 만족도', langs: ['ko'], scope: 'program', target: { kinds: ['student'] } }, actor); putQs(d1, t.questions.map(q => ({ type: q.type, text: { ...q.text }, required: q.required })));
    const e1 = mk({ title: '2026-2 중간 강의평가 · 프로그래밍 기초 01', kind: 'course_eval', scope: 'section', langs: ['ko', 'en'], gate_steps: ['grade'], target: { kinds: ['student'] } }, actor); putQs(e1, EVALQ); e1.status = 'open';
    K.surveys.push(d1, e1);
    [['20261001', 5, 4, 5, 4, 5], ['20261002', 4, 4, 3, 4, 4], ['20261005', 5, 5, 4, 5, 5]].forEach(([no, ...v]) => store(e1, no, { 1: v[0], 2: v[1], 3: v[2], 4: v[3], 5: v[4], 6: no === '20261002' ? '실습 시간이 조금 더 있으면 좋겠습니다.' : '' }, 'web'));
  }

  /* ═════════ 화면 ═════════ */
  LW4.addMenu('lmsk', { label: '설문 · 강의평가', ws: 'ops', only: 'univ' });
  const KIND = { general: '일반', course_eval: '강의평가', satisfaction: '만족도', pre: '사전', diagnostic: '진단' };
  const SCOPE = { univ: '대학', college: '단과대학', dept: '학과', program: '프로그램', course: '교과목', section: '분반', unit: '차시', mooc: 'MOOC' };
  const STS = { draft: ['작성 중', ''], open: ['진행 중', 'on'], closed: ['마감', 'bad'] };
  const GN = { completion: '수료', certificate: '수료증', next: '다음 단계', grade: '성적 확인', classroom: '강의실 이용' };
  const TYPES_Q = { single: '단일 선택', multi: '복수 선택', likert5: '리커트 5점', likert7: '리커트 7점', nps: '추천 지수(0~10)', text: '단답', longtext: '서술', video: '동영상 안내', html: 'HTML 안내' };
  const KS = () => (UI.lmsk = UI.lmsk || { list: null, tpl: null, stat: null, by: 'unit_code', lang: 'ko', me: '20261002', pend: null, gate: null, ans: null });
  const refresh = async () => { const U = KS(); const [l, t] = await Promise.all([LW4.run('k', 'GET', 'surveys', { q: U.q || '', kind: U.fk || '', status: U.fs || '' }), LW4.run('k', 'GET', 'surveys', { template: 1 })]); U.list = l ? l.items : []; U.tpl = t ? t.items : []; render(); };
  LW4.krefresh = refresh;

  VIEWS.lmsk = () => {
    const U = KS(); if (U.list === null) { U.list = []; setTimeout(refresh); }
    const tb = UI.lmskT || 'list'; const canOp = S.me.role !== 'teacher';
    const L0 = U.list || []; const nOpen = L0.filter(s => s.status === 'open').length, nDraft = L0.filter(s => s.status === 'draft').length, nEval0 = L0.filter(s => s.kind === 'course_eval' && s.status === 'open').length;
    const top = head('설문 · 강의평가', `템플릿을 골라 설문을 만들고, 배포한 뒤 결과를 봅니다. ${LW4.demoTag()}`,
      (canOp ? LW4.more(LW4.mi('lmsk-new', '빈 설문 직접 만들기') + LW4.mi('tab', '강의평가 일괄 만들기', { key: 'lmskT', v: 'eval' }) + LW4.mi('tab', '템플릿 관리', { key: 'lmskT', v: 'tpl' })) : LW4.more(LW4.mi('lmsk-new', '빈 설문 직접 만들기'))) +
      `<button class="btn pri" data-act="lmsk-start">템플릿으로 새 설문</button>`) +
      LW4.todo([{ n: nDraft, t: '건 배포 전(작성 중)', btn: LW4.go('lmsk-f', '배포하기', { k: 'fs', v: 'draft' }) }, { n: nOpen, t: '건 진행 중', btn: canOp ? LW4.go('lmsk-f', '응답 현황 · 독려', { k: 'fs', v: 'open' }) : '' }, { n: nEval0, t: '건 강의평가 진행 중' }], '배포를 기다리는 설문이 없습니다. 「템플릿으로 새 설문」으로 시작하세요.') +
      LW4.tabs('lmskT', [['list', '설문 목록'], ['stat', '결과 통계'], ['eval', '강의평가'], ['tpl', '템플릿'], ['gate', '미참여 제한 확인'], ['me', '학생 화면 미리보기']], tb);
    let b = '';
    if (tb === 'list' || tb === 'tpl') {
      const L = tb === 'list' ? U.list : U.tpl;
      b = (tb === 'list' ? `<div class="lw-bar"><input type="search" placeholder="설문 제목 검색" value="${esc(U.q || '')}" data-chg="lmsk-f" data-k="q" aria-label="설문 검색"><select data-chg="lmsk-f" data-k="fk" aria-label="종류"><option value="">모든 종류</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${U.fk === k ? 'selected' : ''}>${v}</option>`).join('')}</select><select data-chg="lmsk-f" data-k="fs" aria-label="상태"><option value="">모든 상태</option>${Object.entries(STS).map(([k, v]) => `<option value="${k}" ${U.fs === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>` : `<p class="lw-note">템플릿은 배포하지 않고, 「이 템플릿으로 만들기」로 새 설문을 만듭니다. 비교과 만족도 · 강의평가 템플릿을 기관 표준으로 관리하세요.</p>`) +
        `<div class="lw-grid">${L.map(s => `<div class="lw-card" data-survey="${esc(s.survey_id)}"><div>${LW4.st(STS[s.status][0], STS[s.status][1])} <span class="lw-pill">${esc(KIND[s.kind])}</span><span class="lw-pill">${esc(SCOPE[s.scope])}${s.scope_ref ? ' · ' + esc(s.scope_ref.slice(0, 12)) : ''}</span></div>
          <h4>${esc(s.title)}</h4><small>문항 ${s.n_q}개 · 응답 ${s.n_resp}건 · 언어 ${esc((s.langs || []).join('/'))}${s.gate_steps.length ? ' · 제한: ' + s.gate_steps.map(g => GN[g]).join(', ') : ''}${s.kind === 'course_eval' ? ' · 교수 ' + (s.prof_public ? '공개' : '미공개') : ''}</small>
          <div class="lw-acts">${s.is_template ? `<button class="btn sm lw-go" data-act="lmsk-fromtpl" data-id="${esc(s.survey_id)}">이 템플릿으로 만들기</button>${LW4.more(LW4.mi('lmsk-edit', '템플릿 편집', { id: s.survey_id }))}` :
            `${s.status !== 'open' ? `<button class="btn sm lw-go" data-act="lmsk-st" data-op="open" data-id="${esc(s.survey_id)}">배포</button>` : `<button class="btn sm" data-act="lmsk-stat" data-id="${esc(s.survey_id)}">결과 보기</button>`}${canOp && s.status === 'open' ? `<button class="btn sm" data-act="lmsk-remind" data-id="${esc(s.survey_id)}">미응답 독려</button>` : ''}
            ${LW4.more(LW4.mi('lmsk-edit', '편집', { id: s.survey_id }) + (s.status === 'open' ? LW4.mi('lmsk-st', '마감', { op: 'close', id: s.survey_id }) : LW4.mi('lmsk-stat', '결과 통계', { id: s.survey_id })) + LW4.mi('lmsk-csv', '응답 내려받기(CSV)', { id: s.survey_id }) + (canOp ? LW4.mi('lmsk-up', '오프라인 응답 올리기(엑셀)', { id: s.survey_id }) : '') + LW4.mi('lmsk-copy', '복사', { id: s.survey_id }) + (canOp && !s.n_resp ? LW4.mi('lmsk-del', '삭제', { id: s.survey_id }) : ''))}`}</div></div>`).join('') || '<div class="empty">조건에 맞는 설문이 아직 없습니다. 「템플릿으로 새 설문」으로 시작하세요.</div>'}</div>`;
    } else if (tb === 'eval') {
      const ev = U.list.filter(s => s.kind === 'course_eval'); const secs = LW4.live() ? [] : (S.classes || []);
      b = `<div class="card"><div class="ch"><b>강의평가 만들기</b><small>분반마다 하나 · 기본 문항 또는 템플릿</small></div><div class="lw-form lw-two">
        <label>분반${secs.length ? `<select id="lmskSec">${secs.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>` : `<input id="lmskSec" placeholder="분반 ID(학사 연동 분반)">`}</label>
        <label>템플릿<select id="lmskTpl"><option value="">기본 강의평가 문항</option>${U.tpl.filter(t => t.kind === 'course_eval').map(t => `<option value="${esc(t.survey_id)}">${esc(t.title)}</option>`).join('')}</select></label></div>
        <div class="lw-form"><label class="lw-ck"><input type="checkbox" id="lmskPub"> 결과를 교수자에게 공개</label><br>${Object.entries(GN).map(([k, v]) => `<label class="lw-ck"><input type="checkbox" class="lmskG" value="${k}" ${k === 'grade' ? 'checked' : ''}> 미참여 시 ${v} 제한</label>`).join('')}</div>
        <button class="btn lw-go" data-act="lmsk-eval">강의평가 만들기</button></div>` +
        table(['강의평가', '상태', '응답', '교수 공개', ''], ev.map(s => [esc(s.title), LW4.st(STS[s.status][0], STS[s.status][1]), s.n_resp + '건', s.prof_public ? '공개' : '미공개',
          `${canOp ? `<button class="btn sm" data-act="lmsk-pub" data-id="${esc(s.survey_id)}" data-v="${s.prof_public ? '' : '1'}">${s.prof_public ? '미공개로' : '공개로'}</button>` : ''} <button class="btn sm" data-act="lmsk-stat" data-id="${esc(s.survey_id)}">결과</button>`]), '강의평가가 아직 없습니다.');
    } else if (tb === 'stat') b = statView(U);
    else if (tb === 'gate') {
      b = `<div class="card"><div class="ch"><b>설문 미참여 시 다음 단계 제한</b><small>수료 · 수료증 · 다음 단계 · 성적 확인 · 강의실 이용</small></div>
        <p class="lw-note">설문 편집에서 「미참여 시 제한」을 고르면 수료 처리 · 수료증 · 성적 확인 · 강의실 입장 때 설문에 참여하지 않은 학생을 막습니다. 비교과 이수 처리도 이 확인을 씁니다. 학번으로 지금 상태를 확인해 보세요.</p>
        <div class="lw-bar"><input id="lmskGno" value="${esc(U.me)}" aria-label="학번" placeholder="학번"><select id="lmskGst" aria-label="단계">${Object.entries(GN).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><select id="lmskGsc" aria-label="단위"><option value="">모든 단위</option>${Object.entries(SCOPE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn" data-act="lmsk-gate">점검</button></div>
        ${U.gate ? `<div class="lw-card">${U.gate.blocked ? LW4.st('제한됨', 'bad') : LW4.st('통과', 'on')} <b>${esc(GN[U.gate.step])}</b><small>${esc(U.gate.message || '참여해야 할 설문이 없습니다.')}</small>${U.gate.pending.map(p => `<span class="lw-pill">${esc(p.title)}</span>`).join('')}</div>` : ''}</div>`;
    } else if (tb === 'me') b = meView(U);
    return top + b;
  };

  function statView(U) {
    const st = U.stat; const pick = `<div class="lw-bar"><select data-chg="lmsk-pick" aria-label="설문 선택"><option value="">설문을 고르세요</option>${U.list.map(s => `<option value="${esc(s.survey_id)}" ${st && st.survey.survey_id === s.survey_id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>
      <select data-chg="lmsk-by" aria-label="교차 기준">${[['unit_code', '학과별'], ['grade_year', '학년별'], ['kind', '구성원 구분별'], ['status', '학적별']].map(([k, v]) => `<option value="${k}" ${U.by === k ? 'selected' : ''}>교차: ${v}</option>`).join('')}</select>
      <select data-chg="lmsk-lang" aria-label="언어"><option value="ko">한국어</option><option value="en" ${U.lang === 'en' ? 'selected' : ''}>English</option></select>${st ? `<button class="btn sm" data-act="lmsk-csv" data-id="${esc(st.survey.survey_id)}">CSV 내려받기</button>` : ''}</div>`;
    if (!st) return pick + '<div class="empty">설문을 고르면 빈도 · 비율, 리커트 평균, 교차분석을 보여 드립니다.</div>';
    const dl = d => U.by === 'unit_code' ? (LW4.UNITS[d] || d || '미상') : U.by === 'grade_year' ? (d && d !== '0' ? d + '학년' : '해당 없음') : d;
    return pick + `<div class="kpis">${kpi('응답', st.n + '건')}${kpi('문항', st.questions.length + '개')}${kpi('상태', STS[st.survey.status][0])}</div>` + st.questions.map(q => `<div class="card"><div class="ch"><b>${q.seq}. ${esc(q.label)}</b><small>${esc(TYPES_Q[q.type])} · 응답 ${q.answered}${q.mean != null ? ' · 평균 ' + q.mean : ''}</small></div>
      ${q.freq ? q.freq.map(f => LW4.hbar(f.label, f.pct, `${f.n} (${f.pct}%)`)).join('') + (q.cross && q.cross.length ? `<details><summary>교차분석</summary>${table([U.by === 'unit_code' ? '학과' : '구분', ...q.freq.map(f => f.label), ...(q.mean != null ? ['평균'] : [])], q.cross.map(c => [esc(dl(c.dim)), ...c.counts.map(String), ...(q.mean != null ? [String(c.mean ?? '-')] : [])]))}</details>` : '')
        : (q.texts || []).slice(0, 20).map(t => `<p class="lw-note">${esc(t)}</p>`).join('') || '<small class="lw-muted">서술 응답이 없습니다.</small>'}</div>`).join('');
  }
  function meView(U) {
    const sv = U.ans;
    return `<p class="lw-note">학생 화면 미리보기 — 학번을 골라 그 학생이 보는 「참여할 설문」과 응답 화면을 확인합니다.</p>
      <div class="lw-bar"><select id="lmskMe" aria-label="학번">${LW4.roster.map(p => `<option ${U.me === p.member_no ? 'selected' : ''}>${p.member_no}</option>`).join('')}</select><button class="btn" data-act="lmsk-pend">참여할 설문 보기</button><select data-chg="lmsk-lang" aria-label="언어"><option value="ko">한국어</option><option value="en" ${U.lang === 'en' ? 'selected' : ''}>English</option></select></div>
      ${U.pend ? `<div class="lw-grid">${U.pend.map(p => `<div class="lw-card"><h4>${esc(p.title)}</h4><small>${esc(KIND[p.kind])} · ${esc(SCOPE[p.scope])}${p.gate_steps.length ? ' · 미참여 시 ' + p.gate_steps.map(g => GN[g]).join(', ') + ' 제한' : ''}</small><div class="lw-acts"><button class="btn sm pri" data-act="lmsk-ans" data-id="${esc(p.survey_id)}">참여하기</button></div></div>`).join('') || '<div class="empty">참여할 설문이 없습니다.</div>'}</div>` : ''}
      ${sv ? `<div class="card lw-form" id="lmskAnsForm"><div class="ch"><b>${esc(sv.title_l)}</b><small>${sv.anonymous ? '익명 응답' : '기명 응답(학번)'}</small></div>${sv.intro_html ? `<div class="lw-note">${sanitize(sv.intro_html)}</div>` : ''}${sv.video_url ? `<p><a href="${esc(sv.video_url)}" target="_blank" rel="noopener">안내 영상 보기</a></p>` : ''}
        ${sv.questions.map(q => qField(q)).join('')}<button class="btn pri" data-act="lmsk-submit" data-id="${esc(sv.survey_id)}">제출</button></div>` : ''}`;
  }
  const sanitize = h => esc(String(h).replace(/<[^>]+>/g, ' ')); /* 안내 HTML은 글자만 보여 준다(스크립트 차단) */
  function qField(q) {
    const n = `q_${q.qid}`; const L = `<b>${q.seq}. ${esc(q.label)}</b>${q.required ? ' <small class="lw-muted">(필수)</small>' : ''}`;
    if (q.type === 'html') return `<div class="lw-note">${sanitize(q.meta.html || '')}</div>`;
    if (q.type === 'video') return `<p><a href="${esc(q.meta.url || '#')}" target="_blank" rel="noopener">${esc(q.label || '동영상 보기')}</a></p>`;
    if (q.type === 'single' || q.type.startsWith('likert')) return `<div class="lw-q">${L}<br>${q.labels.map((o, i) => `<label class="lw-ck"><input type="radio" name="${n}" value="${q.type === 'single' ? i : i + 1}"> ${esc(o)}</label>`).join('')}</div>`;
    if (q.type === 'nps') return `<div class="lw-q">${L}<br>${Array.from({ length: 11 }, (_, i) => `<label class="lw-ck"><input type="radio" name="${n}" value="${i}"> ${i}</label>`).join('')}</div>`;
    if (q.type === 'multi') return `<div class="lw-q">${L}<br>${q.labels.map((o, i) => `<label class="lw-ck"><input type="checkbox" name="${n}" value="${i}"> ${esc(o)}</label>`).join('')}</div>`;
    return `<div class="lw-q"><label>${L}${q.type === 'text' ? `<input name="${n}" maxlength="500">` : `<textarea name="${n}" rows="3" maxlength="4000"></textarea>`}</label></div>`;
  }

  /* 설문 편집기(문항 빌더) */
  function editor(sv) {
    const s = sv || { title: '', i18n: {}, langs: ['ko'], scope: 'univ', scope_ref: '', kind: 'general', target: {}, anonymous: true, gate_steps: [], intro_html: '', video_url: '', questions: [] };
    UI.lmskQs = (s.questions || []).map(q => ({ type: q.type, text: { ...q.text }, options: q.options.map(o => ({ ...o })), required: q.required, meta: { ...q.meta } }));
    const body = `<div class="lw-form"><div class="lw-two"><label>제목<input name="title" maxlength="200" value="${esc(s.title)}"></label><label>영문 제목(다국어)<input name="title_en" maxlength="200" value="${esc((s.i18n || {}).en || '')}"></label></div>
      <div class="lw-two"><label>단위<select name="scope">${Object.entries(SCOPE).map(([k, v]) => `<option value="${k}" ${s.scope === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>단위 대상(학과 코드 · 프로그램/분반 ID)<input name="scope_ref" maxlength="60" value="${esc(s.scope_ref)}"></label></div>
      <div class="lw-two"><label>종류<select name="kind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${s.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>대상 구분<select name="tkind"><option value="">전체 구성원</option>${[['student', '학생'], ['professor', '교수'], ['staff', '직원'], ['external', '외부인']].map(([k, v]) => `<option value="${k}" ${(s.target.kinds || [])[0] === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <div class="lw-two"><label>대상 학년(쉼표)<input name="tgrades" value="${esc((s.target.grades || []).join(','))}" placeholder="예: 1,2"></label><label>대상 학과 코드(쉼표)<input name="tunits" value="${esc((s.target.units || []).join(','))}" placeholder="예: CSE,BUS"></label></div>
      <div class="lw-two"><label>시작<input type="datetime-local" name="opens_at" value="${esc(String(s.opens_at || '').slice(0, 16))}"></label><label>마감<input type="datetime-local" name="closes_at" value="${esc(String(s.closes_at || '').slice(0, 16))}"></label></div>
      <label class="lw-ck"><input type="checkbox" name="anonymous" ${s.anonymous ? 'checked' : ''}> 익명 응답</label><label class="lw-ck"><input type="checkbox" name="en" ${(s.langs || []).includes('en') ? 'checked' : ''}> 영어 문항 함께 제공</label><label class="lw-ck"><input type="checkbox" name="is_template" ${s.is_template ? 'checked' : ''}> 템플릿으로 저장</label>
      <div>${Object.entries(GN).map(([k, v]) => `<label class="lw-ck"><input type="checkbox" name="g_${k}" ${(s.gate_steps || []).includes(k) ? 'checked' : ''}> 미참여 시 ${v} 제한</label>`).join('')}</div>
      <label>안내 문구(HTML)<textarea name="intro_html" rows="2">${esc(s.intro_html)}</textarea></label><label>안내 동영상 주소<input name="video_url" value="${esc(s.video_url)}"></label>
      <div id="lmskQB"></div><div class="lw-bar"><select id="lmskQT" aria-label="문항 유형">${Object.entries(TYPES_Q).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn sm" type="button" data-act="lmsk-qadd">문항 추가</button></div>
      ${sv && sv.n_resp ? '<p class="lw-note">응답이 있어 문항은 바뀌지 않습니다(설정만 저장).</p>' : ''}</div>`;
    modal(sv ? '설문 편집' : '새 설문', body, [{ id: 'c', label: '취소' }, { id: 's', label: '저장', kind: 'pri', run: w => { saveEditor(w, sv); return false; } }], true);
    drawQs();
  }
  function drawQs() {
    const box = $('#lmskQB'); if (!box) return;
    box.innerHTML = UI.lmskQs.map((q, i) => `<div class="lw-q" data-qi="${i}"><b>${i + 1}. ${esc(TYPES_Q[q.type])}</b> <button class="btn sm" type="button" data-act="lmsk-qdel" data-i="${i}">삭제</button>
      ${q.type === 'html' ? `<label>HTML 안내<textarea data-qk="html" rows="2">${esc(q.meta.html || '')}</textarea></label>` : `<div class="lw-row"><label>문항(한국어)<input data-qk="ko" value="${esc(q.text.ko || '')}"></label><label>문항(영어)<input data-qk="en" value="${esc(q.text.en || '')}"></label></div>`}
      ${q.type === 'video' ? `<label>동영상 주소<input data-qk="url" value="${esc(q.meta.url || '')}"></label>` : ''}
      ${['single', 'multi'].includes(q.type) ? `<div class="lw-row"><label>보기(한 줄에 하나)<textarea data-qk="opts" rows="3">${esc(q.options.map(o => o.ko).join('\n'))}</textarea></label><label>보기(영어)<textarea data-qk="optsen" rows="3">${esc(q.options.map(o => o.en || '').join('\n'))}</textarea></label></div>` : ''}
      ${!['video', 'html'].includes(q.type) ? `<label class="lw-ck"><input type="checkbox" data-qk="req" ${q.required !== false ? 'checked' : ''}> 필수</label>` : ''}</div>`).join('') || '<p class="lw-muted">문항이 없습니다.</p>';
  }
  function readQs() {
    document.querySelectorAll('#lmskQB [data-qi]').forEach(el => { const q = UI.lmskQs[+el.dataset.qi]; const g = k => el.querySelector(`[data-qk="${k}"]`);
      if (g('ko')) q.text = { ko: g('ko').value.trim(), ...(g('en').value.trim() ? { en: g('en').value.trim() } : {}) };
      if (g('html')) q.meta.html = g('html').value; if (g('url')) q.meta.url = g('url').value.trim();
      if (g('opts')) { const ko = g('opts').value.split('\n').map(x => x.trim()).filter(Boolean); const en = g('optsen').value.split('\n').map(x => x.trim()); q.options = ko.map((k, i) => ({ ko: k, ...(en[i] ? { en: en[i] } : {}) })); }
      if (g('req')) q.required = g('req').checked; });
  }
  async function saveEditor(w, sv) {
    readQs(); const csv = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
    const a = { title: fv(w, 'title'), i18n: fv(w, 'title_en') ? { en: fv(w, 'title_en') } : {}, langs: fv(w, 'en') ? ['ko', 'en'] : ['ko'], scope: fv(w, 'scope'), scope_ref: fv(w, 'scope_ref'), kind: fv(w, 'kind'),
      target: { kinds: fv(w, 'tkind') ? [fv(w, 'tkind')] : [], grades: csv(fv(w, 'tgrades')).map(Number), units: csv(fv(w, 'tunits')) }, opens_at: fv(w, 'opens_at'), closes_at: fv(w, 'closes_at'), anonymous: fv(w, 'anonymous'), is_template: fv(w, 'is_template'),
      gate_steps: Object.keys(GN).filter(k => fv(w, 'g_' + k)), intro_html: fv(w, 'intro_html'), video_url: fv(w, 'video_url') };
    if (sv) a.survey_id = sv.survey_id; if (!sv || !sv.n_resp) a.questions = UI.lmskQs;
    const r = await LW4.run('k', 'POST', 'survey/save', a, '설문을 저장했습니다.'); if (r) { closeModal(); logAudit && logAudit('설문 저장 — ' + r.title); refresh(); }
  }

  ACT['lmsk-f'] = el => { KS()[el.dataset.k] = el.tagName === 'BUTTON' ? (el.dataset.v || '') : el.value; if (el.tagName === 'BUTTON') UI.lmskT = 'list'; refresh(); };
  /* 주 흐름: 템플릿 고르기 → 제목 · 대상 → (바로 배포) */
  ACT['lmsk-start'] = () => { const T = KS().tpl || []; if (!T.length) return editor(null);
    modal('템플릿으로 새 설문', `<div class="lw-form"><ol class="lw-steps"><li class="on">1 템플릿 고르기</li><li class="on">2 제목 · 대상</li><li class="on">3 배포</li></ol>
      <label>템플릿<select name="tp">${T.map(t => `<option value="${esc(t.survey_id)}">${esc(t.title)} · 문항 ${t.n_q}개</option>`).join('')}</select></label>
      <label>설문 제목<input name="t" maxlength="200" placeholder="예: 2026-2 AI 활용 취업 캠프 만족도"></label>
      <label>대상 단위<select name="sc">${Object.entries(SCOPE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label class="lw-ck"><input type="checkbox" name="go" checked> 만든 뒤 바로 배포(학생 화면에 「참여할 설문」으로 보입니다)</label>
      <p class="lw-note">문항은 템플릿 그대로 복사됩니다. 고칠 것이 있으면 배포 전에 목록의 ⋯ › 편집에서 고치세요.</p></div>`,
      [{ id: 'c', label: '취소' }, { id: 'o', label: '만들기', kind: 'pri', run: w => { const go2 = fv(w, 'go'); LW4.run('k', 'POST', 'survey/copy', { survey_id: fv(w, 'tp'), title: fv(w, 't'), scope: fv(w, 'sc'), scope_ref: '' }, go2 ? null : '설문을 만들었습니다. 목록에서 「배포」를 누르세요.').then(async r => { if (!r) return; closeModal();
        if (go2) await LW4.run('k', 'POST', 'survey/open', { survey_id: r.survey_id }, '설문을 만들고 배포했습니다.'); const U = KS(); U.fs = ''; U.q = ''; UI.lmskT = 'list'; refresh(); }); return false; } }]); };
  ACT['lmsk-new'] = () => editor(null);
  ACT['lmsk-edit'] = async el => { const s = await LW4.run('k', 'GET', 'survey', { survey_id: el.dataset.id }); if (s) editor(s); };
  ACT['lmsk-qadd'] = () => { readQs(); const t = $('#lmskQT').value; UI.lmskQs.push({ type: t, text: { ko: '' }, options: ['single', 'multi'].includes(t) ? [{ ko: '보기 1' }, { ko: '보기 2' }] : [], required: true, meta: {} }); drawQs(); };
  ACT['lmsk-qdel'] = el => { readQs(); UI.lmskQs.splice(+el.dataset.i, 1); drawQs(); };
  ACT['lmsk-st'] = async el => { if (await LW4.run('k', 'POST', 'survey/' + el.dataset.op, { survey_id: el.dataset.id }, el.dataset.op === 'open' ? '설문을 배포했습니다.' : '설문을 마감했습니다.')) refresh(); };
  ACT['lmsk-copy'] = async el => { if (await LW4.run('k', 'POST', 'survey/copy', { survey_id: el.dataset.id }, '복사본을 만들었습니다.')) refresh(); };
  ACT['lmsk-fromtpl'] = el => modal('템플릿으로 설문 만들기', `<div class="lw-form"><label>제목<input name="t" maxlength="200"></label><label>단위<select name="sc">${Object.entries(SCOPE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label>대상(학과 코드 · 분반, 비우면 전체)<input name="ref"></label></div>`,
    [{ id: 'c', label: '취소' }, { id: 'o', label: '만들기', kind: 'pri', run: w => { LW4.run('k', 'POST', 'survey/copy', { survey_id: el.dataset.id, title: fv(w, 't'), scope: fv(w, 'sc'), scope_ref: fv(w, 'ref') }, '템플릿으로 설문을 만들었습니다.').then(r => { if (r) { UI.lmskT = 'list'; refresh(); } }); } }]);
  ACT['lmsk-del'] = async el => { if (await LW4.run('k', 'POST', 'survey/delete', { survey_id: el.dataset.id }, '설문을 지웠습니다.')) refresh(); };
  ACT['lmsk-stat'] = async el => { const U = KS(); const r = await LW4.run('k', 'GET', 'stats', { survey_id: el.dataset.id, by: U.by, lang: U.lang }); if (r) { U.stat = r; UI.lmskT = 'stat'; render(); } };
  ACT['lmsk-pick'] = el => { if (el.value) ACT['lmsk-stat']({ dataset: { id: el.value } }); };
  ACT['lmsk-by'] = el => { const U = KS(); U.by = el.value; if (U.stat) ACT['lmsk-stat']({ dataset: { id: U.stat.survey.survey_id } }); else render(); };
  ACT['lmsk-lang'] = el => { const U = KS(); U.lang = el.value; if (UI.lmskT === 'stat' && U.stat) ACT['lmsk-stat']({ dataset: { id: U.stat.survey.survey_id } }); else if (U.ans) ACT['lmsk-ans']({ dataset: { id: U.ans.survey_id } }); else render(); };
  ACT['lmsk-csv'] = async el => { const r = await LW4.run('k', 'GET', 'export', { survey_id: el.dataset.id, lang: KS().lang }); if (r) LW4.download(r.filename, r.mime, r.content); };
  ACT['lmsk-up'] = async el => {
    const txt = await LW4.pickFile('.csv,text/csv'); if (!txt) return; const rows = LW4.parseCSV(txt); if (rows.length < 2) return toast('CSV에 응답 행이 없습니다. 첫 줄: 학번,1,2,3…(문항 번호)', 'warn');
    const H = rows[0].map(h => h.trim()); const iNo = H.findIndex(h => /학번/.test(h)); if (iNo < 0) return toast('첫 줄에 「학번」 열이 있어야 합니다.', 'warn');
    const data = rows.slice(1).map(r => ({ member_no: (r[iNo] || '').trim(), answers: Object.fromEntries(H.map((h, i) => [h.match(/^(\d+)/)?.[1], r[i]]).filter(([k, v]) => k && v !== undefined && v !== '')) }));
    const r = await LW4.run('k', 'POST', 'import', { survey_id: el.dataset.id, rows: data }); if (r) { toast(`업로드 ${r.ok}건 반영 · ${r.failed}건 실패`, r.failed ? 'warn' : 'ok'); if (r.failed) modal('업로드 오류', table(['행', '사유'], r.errors.slice(0, 50).map(e => [String(e.row), esc(e.message)]))); refresh(); }
  };
  ACT['lmsk-remind'] = async el => { const r = await LW4.run('k', 'POST', 'remind', { survey_id: el.dataset.id }); if (r) toast(`미응답 ${r.targets}명 독려를 발송 대기열에 넣었습니다(${r.note})`, 'ok'); };
  ACT['lmsk-eval'] = async () => { const r = await LW4.run('k', 'POST', 'course-eval', { section_id: $('#lmskSec').value, template_id: $('#lmskTpl').value || undefined, prof_public: $('#lmskPub').checked, gate_steps: [...document.querySelectorAll('.lmskG:checked')].map(x => x.value) }, '강의평가를 만들었습니다. 배포하면 학생이 참여합니다.'); if (r) refresh(); };
  ACT['lmsk-pub'] = async el => { if (await LW4.run('k', 'POST', 'eval/public', { survey_id: el.dataset.id, prof_public: !!el.dataset.v }, '공개 여부를 바꿨습니다.')) refresh(); };
  ACT['lmsk-gate'] = async () => { const r = await LW4.run('k', 'GET', 'gate', { member_no: $('#lmskGno').value, step: $('#lmskGst').value, scope: $('#lmskGsc').value }); if (r) { KS().gate = r; render(); } };
  ACT['lmsk-pend'] = async () => { const U = KS(); U.me = $('#lmskMe').value; U.ans = null; const r = await LW4.run('k', 'GET', 'pending', { member_no: U.me }); if (r) { U.pend = r.items; render(); } };
  ACT['lmsk-ans'] = async el => { const U = KS(); const r = await LW4.run('k', 'GET', 'survey', { survey_id: el.dataset.id, lang: U.lang }); if (r) { U.ans = r; render(); } };
  ACT['lmsk-submit'] = async el => {
    const U = KS(); const f = $('#lmskAnsForm'); const answers = {};
    U.ans.questions.forEach(q => { const n = `q_${q.qid}`;
      if (q.type === 'multi') { const v = [...f.querySelectorAll(`[name="${n}"]:checked`)].map(x => +x.value); if (v.length) answers[q.qid] = v; }
      else if (['single', 'nps'].includes(q.type) || q.type.startsWith('likert')) { const x = f.querySelector(`[name="${n}"]:checked`); if (x) answers[q.qid] = +x.value; }
      else { const x = f.querySelector(`[name="${n}"]`); if (x && x.value.trim()) answers[q.qid] = x.value.trim(); } });
    const r = await LW4.run('k', 'POST', 'respond', { survey_id: el.dataset.id, member_no: U.me, answers }, '응답을 제출했습니다.'); if (r) { U.ans = null; ACT['lmsk-pend'](); }
  };
})();
