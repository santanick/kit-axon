/* v30 학사 LMS 묶음 E — 과제(SFR-035 · 046 · 079 · 081): 제출(온라인 문서 · 파일 · 다중 첨부 · 초안 자동 저장 · 제출 현황) · 루브릭(다면) 채점 ·
   운영자 템플릿 · 첨삭(웹 · 파일) · 일괄 다운로드(zip) · 일괄 피드백 · 협업 과제(팀 · 버전) · 표절 검사 결과(엔진 연동 지점, 모의 어댑터).
   + 묶음 E · F · H 공용 도우미(window.EFH): 데모(정적) = S.lms.efh 상태로 서버와 같은 응답 형태를 흉내 낸다 / 운영 = /api/lms/{e,f,h}/... 호출.
   규칙: didisam/lms/README.md. 개인정보: 학번 · 학과만 표시. */
(function () {
  'use strict';
  const ON = () => typeof ULMS === 'function' && ULMS();
  const LIVE_ON = () => typeof LIVE !== 'undefined' && LIVE && LIVE.cfg && LIVE.cfg.live && LIVE.tenant;
  const nowIso = () => new Date().toISOString();
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const r2 = v => Math.round((+v || 0) * 100) / 100;
  const fmt = t => t ? new Date(t).toLocaleString('ko-KR', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const ERR = (st, code, message) => { const e = new Error(message); e.status = st; e.code = code; throw e; };

  /* ── 데모 상태 ── */
  function st() {
    const L = S.lms = S.lms || {};
    const X = L.efh = L.efh || { asg: [], rub: [], subs: [], vers: [], files: {}, teams: [], plag: {}, banks: [], qs: [], exams: [], atts: [], pre: {}, items: [], scores: {}, pol: {}, final: {}, hist: [], queue: [], msgs: [], seq: 1 };
    if (!X.rub.length) X.rub.push({ rubric_id: 'rub_tpl1', section_id: null, is_template: true, name: '보고서 공통 채점 기준(운영자 템플릿)', criteria: [{ key: 'logic', name: '내용 · 논리', levels: [{ label: '우수', score: 10 }, { label: '보통', score: 6 }, { label: '미흡', score: 2 }] }, { key: 'form', name: '형식 · 인용', levels: [{ label: '우수', score: 5 }, { label: '보통', score: 3 }, { label: '미흡', score: 1 }] }] });
    return X;
  }
  /* 데모: 스튜디오 강의실(S.classes) = 분반, 수강생 = 학번. 첫 분반의 마지막 수강생은 청강(데모) */
  const mno = id => { const m = typeof M === 'function' ? M(id) : null; return String((m && (m.extra && (m.extra.학번 || m.extra.사번)) || m && m.sid) || id); };
  const dept = id => { const m = typeof M === 'function' ? M(id) : null; const g = m && S.groups && S.groups.find(x => x.id === m.group); return g ? g.name : ''; };
  function clsSections() { return (S.classes || []).filter(c => (c.learners || []).length).map((c, i) => ({ section_id: c.id, term_id: '2026-2', course_code: 'DEMO' + (100 + i), course_name: c.name, section_no: '01', title: c.name, regular: c.learners.length - (i === 0 ? 1 : 0), audit: i === 0 ? 1 : 0 })); }
  /* u2: 스튜디오 강의실에 수강생이 없으면(빈 스튜디오 · 새 대학 기관) 묶음 A의 데모 학기 · 분반 · 수강생(S.lms.a)을 그대로 쓴다 — 같은 분반 · 학번이 모든 화면에 나온다 */
  const aOn = () => !LIVE_ON() && !clsSections().length && typeof window.lmsaEns === 'function';
  function aRoster(A, sid) { const ids = new Set([sid, ...A.sections.filter(s => s.rep_section_id === sid).map(s => s.section_id)]); const seen = new Set(); const un = c => { const u = A.units.find(x => x.unit_code === c); return u ? u.name : (c || ''); };
    return A.enr.filter(e => ids.has(e.section_id) && e.status === 'enrolled' && !seen.has(e.member_no) && seen.add(e.member_no)).map(e => { const p = A.persons.find(x => x.member_no === e.member_no) || {}; return { person_id: e.member_no, member_no: e.member_no, unit_code: un(p.unit_code), kind: e.kind === 'audit' ? 'audit' : 'regular' }; }).sort((a, b) => a.member_no < b.member_no ? -1 : 1); }
  function aSecs() { const A = window.lmsaEns(); const cn = c => (A.courses.find(x => x.course_code === c) || {}).name || c;
    return A.sections.filter(s => !s.hidden && s.status !== 'archived').map(s => { const R = aRoster(A, s.section_id); return { section_id: s.section_id, term_id: s.term_id, course_code: s.course_code, course_name: cn(s.course_code), section_no: s.section_no, title: s.title, regular: R.filter(r => r.kind === 'regular').length, audit: R.filter(r => r.kind === 'audit').length }; })
      .filter(s => s.regular + s.audit > 0).sort((a, b) => a.course_code < b.course_code ? -1 : a.course_code > b.course_code ? 1 : a.section_no < b.section_no ? -1 : 1); }
  const aSec = sec => aOn() ? aSecs().find(s => s.section_id === sec) || null : null;
  function demoSections() { return aOn() ? aSecs() : clsSections(); }
  function demoStudents(sec) {
    if (aOn()) { if (!aSec(sec)) ERR(404, 'section', '없는 분반입니다.'); return aRoster(window.lmsaEns(), sec); }
    const c = (S.classes || []).find(x => x.id === sec); if (!c) ERR(404, 'section', '없는 분반입니다.');
    const first = demoSections()[0]; const L = c.learners || [];
    return L.map((id, i) => ({ person_id: id, member_no: mno(id), unit_code: dept(id), kind: first && first.section_id === sec && i === L.length - 1 ? 'audit' : 'regular' }));
  }
  const D = {}; /* 데모 처리기: 'GET /api/lms/e/list' → fn(args) */
  async function call(method, path, body) {
    if (LIVE_ON()) {
      let url = path; if (method === 'GET' && body) url += '?' + new URLSearchParams(Object.entries(body).filter(([, v]) => v != null && v !== '')).toString();
      return api(method, url, method === 'GET' ? undefined : (body || {}));
    }
    const f = D[method + ' ' + path]; if (!f) ERR(404, 'not_found', '데모에서 지원하지 않는 기능입니다.');
    if (aOn() && body && (body.section || body.section_id)) seedSec(body.section || body.section_id);
    const out = f(JSON.parse(JSON.stringify(body || {}))); save(); return JSON.parse(JSON.stringify(out));
  }
  /* 비동기 로딩 캐시: 화면은 캐시를 그리고, 없으면 불러온 뒤 다시 그린다 */
  const C = {}; const pend = {};
  function load(key, fn) {
    if (C[key] !== undefined) return C[key];
    if (!pend[key]) pend[key] = Promise.resolve().then(fn).then(v => { C[key] = { ok: v }; }).catch(e => { C[key] = { err: e.message || String(e) }; }).finally(() => { delete pend[key]; if (typeof render === 'function') render(); });
    return null;
  }
  const drop = (...pre) => { for (const k of Object.keys(C)) if (!pre.length || pre.some(p => k.startsWith(p))) delete C[k]; };
  const wait = () => '<div class="card"><p class="muted">불러오는 중입니다…</p></div>';
  const errBox = m => `<div class="card"><p class="warn">${esc(m)}</p></div>`;
  async function run(fn, okMsg, ...dropKeys) { try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); if (dropKeys.length) { drop(...dropKeys); render(); } return r; } catch (e) { toast(e.message || '오류가 발생했습니다.', 'warn'); return null; } }
  function sections() { const r = load('sec', () => call('GET', '/api/lms/e/sections')); return r && r.ok ? r.ok.sections : null; }
  function secPick(uiKey, act) {
    const L = sections(); if (!L) return { html: wait(), sec: null };
    if (!L.length) return { html: '<div class="empty">이번 학기에 수강생이 있는 분반이 아직 없습니다.<small class="efh-note">학사(분반 · 수강) 자료가 들어오면 이곳에 분반이 나타납니다.</small></div>', sec: null };
    const sec = L.find(s => s.section_id === UI[uiKey]) || L[0]; UI[uiKey] = sec.section_id;
    return { sec, html: `<div class="bar2 efh-bar"><label class="efh-lab">분반 <select data-chg="${act}" aria-label="분반 선택">${L.map(s => `<option value="${esc(s.section_id)}" ${s === sec ? 'selected' : ''}>${esc((s.course_name || s.title) + ' ' + s.section_no + '분반')}</option>`).join('')}</select></label><small class="muted">수강생 ${s0(sec.regular)}명${sec.audit ? ` · 청강 ${sec.audit}명(성적 제외)` : ''}</small>${demoTag()}</div>` };
  }
  /* u2 화면 도우미: 데모 표시 · 지금 할 일 카드 · ⋯ 메뉴 · 탭 4개 + 더보기(펼침은 ux.js가 화면 기준으로 띄움) */
  const demoTag = () => LIVE_ON() ? '' : '<small class="efh-demo" title="서버 없이 이 브라우저에만 저장됩니다">데모: 브라우저에만 저장</small>';
  const todo = (html, btn) => `<div class="card u2-todo" role="status"><b class="u2-todo-k">지금 할 일</b><span class="u2-todo-t">${html}</span>${btn || ''}</div>`;
  const dots = (items, label = '다른 작업') => { const L = (items || []).filter(Boolean); return L.length ? `<details class="uxmore uxdots efh-dots"><summary title="${esc(label)}">${typeof ic === 'function' ? ic('dots', 18) : '⋯'}<span class="sr">${esc(label)}</span></summary><div class="uxpop" role="menu">${L.join('')}</div></details>` : ''; };
  function tabs4(key, list, cur, more) {
    more = (more || []).filter(Boolean); const m = more.find(([id]) => id === cur);
    return `<div class="efh-tabs">${tabs(key, list, cur)}${more.length ? `<details class="uxmore efh-tmore${m ? ' on' : ''}"><summary>${m ? esc(m[1]) : '더보기'} <em>${more.length}</em></summary><div class="uxpop" role="menu">${more.map(([id, l]) => `<button type="button" role="menuitem" class="${id === cur ? 'on' : ''}" data-act="tab" data-key="${esc(key)}" data-v="${esc(id)}">${esc(l)}</button>`).join('')}</div></details>` : ''}</div>`;
  }
  const mi = (act, label, v, extra = '') => `<button type="button" role="menuitem" data-act="${act}"${v != null ? ` data-v="${esc(v)}"` : ''} ${extra}>${esc(label)}</button>`;
  const s0 = v => v == null ? 0 : v;
  /* 파일 → base64, 내려받기, zip(무압축) 묶기 */
  const toB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(f); });
  function dl(name, bytes, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: mime || 'application/octet-stream' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); }
  const b64bytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) { /* files: [{path, bytes}] → Uint8Array (stored, UTF-8 이름) */
    const enc = new TextEncoder(); const parts = []; const cen = []; let off = 0;
    const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    for (const f of files) { const nm = enc.encode(f.path); const c = crc32(f.bytes); const sz = f.bytes.length;
      const h = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(sz), ...u32(sz), ...u16(nm.length), ...u16(0)]);
      parts.push(h, nm, f.bytes); cen.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(sz), ...u32(sz), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nm);
      off += h.length + nm.length + sz; }
    const cs = cen.reduce((a, b) => a + b.length, 0); const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), ...u16(0)]);
    const all = [...parts, ...cen, end]; const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0; for (const x of all) { out.set(x, p); p += x.length; } return out;
  }
  function css() { if (document.getElementById('efhCss')) return; const l = document.createElement('link'); l.id = 'efhCss'; l.rel = 'stylesheet'; l.href = 'lms/e.css?v=31.8'; document.head.appendChild(l); }
  const peek = k => C[k] && C[k].ok;
  window.EFH = { peek, ON, LIVE_ON, st, D, call, load, drop, wait, errBox, run, sections, secPick, demoStudents, demoSections, rid, r2, fmt, ERR, nowIso, toB64, dl, b64bytes, zip, css, s0, demoTag, todo, dots, tabs4, mi };

  /* ═════════ 데모 처리기(E) — 서버 lms_e_* 와 같은 응답 형태 ═════════ */
  const asgOf = id => { const a = st().asg.find(x => x.asg_id === id); if (!a) ERR(404, 'assignment', '없는 과제입니다.'); return a; };
  const owner = (a, pid) => { if (a.kind === 'individual') return 'p:' + pid; const t = st().teams.find(x => x.asg_id === a.asg_id && x.members.includes(pid)); if (!t) ERR(409, 'no_team', '아직 팀이 배정되지 않았습니다. 교수자에게 문의하세요.'); return 't:' + t.team_id; };
  const filesJ = ids => (ids || []).map(id => st().files[id]).filter(Boolean).map(f => ({ file_id: f.file_id, name: f.name, mime: f.mime, size: f.size }));
  const subJ = s => ({ sub_id: s.sub_id, asg_id: s.asg_id, owner: s.owner_key, status: s.status, body: s.body, files: filesJ(s.files), version: s.version, saved_at: s.saved_at, submitted_at: s.submitted_at, late: s.late, score: s.score, rubric_scores: s.rubric_scores || {}, feedback: s.feedback || null, annotations: s.annotations || [], feedback_files: filesJ(s.feedback_files), graded_at: s.graded_at || null });
  const words = t => new Set(String(t || '').toLowerCase().split(/[^0-9a-z가-힣]+/).filter(w => w.length >= 2));
  D['GET /api/lms/e/sections'] = () => ({ sections: demoSections() });
  D['GET /api/lms/e/list'] = a => ({ assignments: st().asg.filter(x => x.section_id === a.section).map(g => { const ss = st().subs.filter(s => s.asg_id === g.asg_id); return { ...g, submitted: ss.filter(s => s.status !== 'draft').length, graded: ss.filter(s => /graded|returned/.test(s.status)).length, drafts: ss.filter(s => s.status === 'draft').length, targets: g.kind === 'team' ? st().teams.filter(t => t.asg_id === g.asg_id).length : demoStudents(g.section_id).length }; }) });
  D['POST /api/lms/e/save'] = a => {
    if (!String(a.title || '').trim()) ERR(400, 'required', '과제 제목을(를) 입력하세요.');
    if (a.due_at && a.open_at && a.due_at < a.open_at) ERR(400, 'due', '마감은 공개 이후여야 합니다.');
    let g = a.asg_id ? asgOf(a.asg_id) : null;
    const v = { title: a.title.trim(), body: a.body || '', kind: a.kind || (g ? g.kind : 'individual'), submit_types: a.submit_types || ['file', 'text'], max_files: +a.max_files || 5, open_at: a.open_at || null, due_at: a.due_at || null, late_until: a.late_until || null, late_penalty_pct: +a.late_penalty_pct || 0, max_score: +a.max_score || 100, rubric_id: a.rubric_id || null, plag_on: !!a.plag_on, status: a.status || (g ? g.status : 'draft') };
    if (g) Object.assign(g, v); else { g = { asg_id: rid(), section_id: a.section_id, ...v }; st().asg.push(g); }
    gradeLink(g.section_id, 'asg:' + g.asg_id, 'assignment', g.title, g.max_score); logAudit('과제 저장 — ' + g.title); return { assignment: g };
  };
  D['POST /api/lms/e/delete'] = a => { const g = asgOf(a.asg_id); if (st().subs.some(s => s.asg_id === g.asg_id && s.status !== 'draft') && !a.force) ERR(409, 'has_submissions', '제출물이 있는 과제입니다. 정말 지우려면 force를 켜세요.'); const X = st(); X.asg = X.asg.filter(x => x !== g); X.subs = X.subs.filter(s => s.asg_id !== g.asg_id); X.items = X.items.filter(i => i.source_ref !== 'asg:' + g.asg_id); return { ok: true }; };
  D['GET /api/lms/e/status'] = a => {
    const g = asgOf(a.asg); const X = st(); const sub = k => X.subs.find(s => s.asg_id === g.asg_id && s.owner_key === k);
    const row = (k, extra) => { const s = sub(k); return { owner: k, ...extra, sub_id: s ? s.sub_id : null, status: s ? s.status : 'none', version: s ? s.version : 0, saved_at: s ? s.saved_at : null, submitted_at: s ? s.submitted_at : null, late: !!(s && s.late), score: s ? s.score : null, files: s ? s.files.length : 0, similarity: s && X.plag[s.sub_id] ? X.plag[s.sub_id].similarity : null }; };
    const rows = g.kind === 'team' ? X.teams.filter(t => t.asg_id === g.asg_id).map(t => row('t:' + t.team_id, { team: t.name, members: t.members.map(mno) })) : demoStudents(g.section_id).map(p => row('p:' + p.person_id, { member_no: p.member_no, unit_code: p.unit_code, enroll: p.kind }));
    const cnt = f => rows.filter(f).length;
    return { assignment: g, rubric: X.rub.find(r => r.rubric_id === g.rubric_id) || null, rows, counts: { none: cnt(r => r.status === 'none'), draft: cnt(r => r.status === 'draft'), submitted: cnt(r => r.status === 'submitted'), graded: cnt(r => /graded|returned/.test(r.status)), late: cnt(r => r.late) } };
  };
  D['GET /api/lms/e/sub'] = a => { const s = st().subs.find(x => x.sub_id === a.id); if (!s) ERR(404, 'submission', '없는 제출물입니다.'); return { submission: { ...subJ(s), member_no: s.person_id ? mno(s.person_id) : null }, plagiarism: st().plag[s.sub_id] || null }; };
  function applyGrade(g, s) { if (s.score == null) return; const it = gradeLink(g.section_id, 'asg:' + g.asg_id, 'assignment', g.title, g.max_score); const who = s.team_id ? st().teams.find(t => t.team_id === s.team_id).members : [s.person_id]; who.forEach(p => gradePut(g.section_id, it, p, s.score)); }
  D['POST /api/lms/e/grade'] = a => {
    const s = st().subs.find(x => x.sub_id === a.sub_id); if (!s) ERR(404, 'submission', '없는 제출물입니다.'); const g = asgOf(s.asg_id);
    if (s.status === 'draft') ERR(409, 'not_submitted', '아직 제출하지 않은 과제입니다.');
    let sc; const rub = st().rub.find(r => r.rubric_id === g.rubric_id);
    if (a.rubric_scores && rub) { let tot = 0, full = 0; const rs = {}; for (const c of rub.criteria) { full += Math.max(...c.levels.map(l => +l.score)); if (a.rubric_scores[c.key] != null) { const v = +a.rubric_scores[c.key]; if (!c.levels.some(l => +l.score === v)) ERR(400, 'rubric_level', `「${c.name}」 기준에 없는 수준 점수입니다.`); tot += v; rs[c.key] = v; } } sc = full ? r2(tot / full * g.max_score) : 0; s.rubric_scores = rs; }
    else sc = a.score === '' || a.score == null ? s.score : +a.score;
    if (sc != null && (sc < 0 || sc > g.max_score)) ERR(400, 'range', `점수은(는) 0~${g.max_score} 사이로 입력하세요.`);
    if (sc != null && s.late && g.late_penalty_pct) sc = r2(sc * (100 - g.late_penalty_pct) / 100);
    Object.assign(s, { score: sc, feedback: a.feedback != null && a.feedback !== '' ? a.feedback : s.feedback, annotations: a.annotations || s.annotations || [], feedback_files: a.feedback_files || s.feedback_files || [], status: a.return ? 'returned' : 'graded', graded_at: nowIso() });
    applyGrade(g, s); logAudit('과제 채점'); return { submission: subJ(s) };
  };
  D['POST /api/lms/e/bulk-feedback'] = a => { const g = asgOf(a.asg_id); if (!String(a.feedback || '').trim()) ERR(400, 'required', '피드백을(를) 입력하세요.'); let n = 0;
    st().subs.filter(s => s.asg_id === g.asg_id && s.status !== 'draft' && (a.all || (a.sub_ids || []).includes(s.sub_id))).forEach(s => { s.feedback = s.feedback ? s.feedback + '\n\n' + a.feedback : a.feedback; if (a.score !== '' && a.score != null) s.score = +a.score; if (s.score != null) s.status = 'graded'; s.graded_at = nowIso(); applyGrade(g, s); n++; });
    if (!n) ERR(400, 'empty', '피드백을 보낼 제출물을 고르세요.'); return { updated: n }; };
  D['GET /api/lms/e/bundle'] = a => { const g = asgOf(a.asg); const enc = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))); const files = [];
    st().subs.filter(s => s.asg_id === g.asg_id && s.status !== 'draft').forEach(s => { const who = s.team_id ? st().teams.find(t => t.team_id === s.team_id).name : mno(s.person_id); if (s.body) files.push({ path: who + '/본문.txt', b64: enc(s.body) }); s.files.forEach(id => { const f = st().files[id]; if (f) files.push({ path: who + '/' + f.name, b64: f.b64 }); }); });
    return { name: g.title, files }; };
  D['GET /api/lms/e/rubrics'] = a => ({ rubrics: st().rub.filter(r => r.section_id == null || r.section_id === a.section) });
  D['POST /api/lms/e/rubric-save'] = a => { if (a.is_template && S.me && S.me.role === 'teacher') ERR(403, 'role', '운영자만 쓸 수 있습니다.'); if (!String(a.name || '').trim()) ERR(400, 'required', '루브릭 이름을(를) 입력하세요.');
    if (!Array.isArray(a.criteria) || !a.criteria.length) ERR(400, 'criteria', '평가 기준을 1~20개 입력하세요.');
    const crit = a.criteria.map((c, i) => { if (!String(c.name || '').trim()) ERR(400, 'criteria', `${i + 1}번째 평가 기준 이름을 입력하세요.`); if (!(c.levels || []).length) ERR(400, 'levels', `「${c.name}」 수준을 1~10개 입력하세요.`); return { key: c.key || 'c' + (i + 1), name: c.name, levels: c.levels.map(l => ({ label: l.label || '', score: +l.score, desc: l.desc || '' })) }; });
    let r = a.rubric_id && st().rub.find(x => x.rubric_id === a.rubric_id); if (r) Object.assign(r, { name: a.name, criteria: crit }); else { r = { rubric_id: rid(), section_id: a.is_template ? null : a.section_id, is_template: !!a.is_template, name: a.name, criteria: crit }; st().rub.push(r); } return { rubric: r }; };
  D['POST /api/lms/e/teams'] = a => { const g = asgOf(a.asg_id); if (g.kind !== 'team') ERR(400, 'kind', '팀 과제에서만 팀을 편성할 수 있습니다.'); if (st().subs.some(s => s.asg_id === g.asg_id)) ERR(409, 'has_submissions', '이미 작성 중인 팀이 있어 다시 편성할 수 없습니다.');
    const X = st(); X.teams = X.teams.filter(t => t.asg_id !== g.asg_id); const ps = demoStudents(g.section_id); const by = new Map(ps.map(p => [p.member_no, p.person_id]));
    if (a.auto) { const n = Math.max(2, +a.auto || 3); const sh = [...ps].sort(() => Math.random() - .5); for (let i = 0; i < sh.length; i += n) X.teams.push({ team_id: rid(), asg_id: g.asg_id, name: (i / n + 1) + '팀', members: sh.slice(i, i + n).map(p => p.person_id) }); }
    else { const seen = new Set(); (a.teams || []).forEach((t, i) => { const mem = (t.members || []).map(m => { const p = by.get(m); if (!p) ERR(400, 'member', '수강생이 아닌 학번입니다: ' + m); if (seen.has(p)) ERR(400, 'dup', '한 학생을 두 팀에 넣을 수 없습니다: ' + m); seen.add(p); return p; }); X.teams.push({ team_id: rid(), asg_id: g.asg_id, name: t.name || (i + 1) + '팀', members: mem }); }); }
    return { teams: X.teams.filter(t => t.asg_id === g.asg_id).map(t => ({ team_id: t.team_id, name: t.name, members: t.members.map(mno) })) }; };
  D['POST /api/lms/e/plag-run'] = a => { const g = asgOf(a.asg_id); const ss = st().subs.filter(s => s.asg_id === g.asg_id && s.status !== 'draft'); const who = s => s.team_id ? st().teams.find(t => t.team_id === s.team_id).name : mno(s.person_id);
    ss.forEach(s => { const w = words(s.body); const m = ss.filter(o => o !== s).map(o => { const v = words(o.body); const inter = [...w].filter(x => v.has(x)).length; const uni = new Set([...w, ...v]).size; return { source: '강좌 내 제출물 ' + who(o), pct: uni ? r2(100 * inter / uni) : 0 }; }).filter(x => x.pct > 0).sort((x, y) => y.pct - x.pct);
      st().plag[s.sub_id] = { engine: 'stub-local', status: 'done', similarity: m.length ? m[0].pct : 0, matches: m.slice(0, 3), finished_at: nowIso() }; });
    return { ...D['GET /api/lms/e/plag']({ asg: g.asg_id }), checked: ss.length }; };
  D['GET /api/lms/e/plag'] = a => { const g = asgOf(a.asg); return { engine: { name: 'stub-local', connected: false, note: '모사 검색 엔진 미연결 — 강좌 내 제출물 상호 비교(데모 어댑터) 결과입니다. 연동 후 동작: 외부 표절 검사 엔진에 제출물을 보내고 결과를 이 형식으로 받습니다.' },
    results: st().subs.filter(s => s.asg_id === g.asg_id && st().plag[s.sub_id]).map(s => ({ sub_id: s.sub_id, owner: s.team_id ? st().teams.find(t => t.team_id === s.team_id).name : mno(s.person_id), ...st().plag[s.sub_id] })).sort((x, y) => y.similarity - x.similarity) }; };
  D['POST /api/lms/e/file'] = a => { if (!a.name || /[/\\]/.test(a.name)) ERR(400, 'name', '파일 이름에 쓸 수 없는 문자가 있습니다.'); if (!a.b64) ERR(400, 'empty', '빈 파일은 올릴 수 없습니다.'); const size = Math.floor(a.b64.length * 3 / 4); if (size > 2 * 1024 * 1024) ERR(413, 'too_large', '파일은 2MB까지 올릴 수 있습니다.');
    const f = { file_id: rid(), name: a.name, mime: a.mime || 'application/octet-stream', size, b64: a.b64 }; st().files[f.file_id] = f; return { file_id: f.file_id, name: f.name, mime: f.mime, size }; };
  D['GET /api/lms/e/file'] = a => { const f = st().files[a.id]; if (!f) ERR(404, 'file', '없는 파일입니다.'); return f; };
  /* 학습자(데모 미리보기: 학생 한 명을 골라 그 학생으로 동작) */
  const asLearner = () => { const p = UI.lmseAs; if (!p) ERR(401, 'auth', '로그인이 필요합니다.'); return p; };
  D['GET /api/lms/e/my'] = a => { const pid = asLearner(); return { now: nowIso(), assignments: st().asg.filter(g => g.section_id === a.section && g.status !== 'draft').map(g => { let k = null; try { k = owner(g, pid); } catch (e) { } const s = k && st().subs.find(x => x.asg_id === g.asg_id && x.owner_key === k); const t = st().teams.find(x => x.asg_id === g.asg_id && x.members.includes(pid));
    return { ...g, rubric: st().rub.find(r => r.rubric_id === g.rubric_id) || null, team: t ? { team_id: t.team_id, name: t.name, members: t.members.map(mno) } : null, submission: s ? (/graded|returned/.test(s.status) ? subJ(s) : { ...subJ(s), score: null, feedback: null }) : null }; }) }; };
  D['POST /api/lms/e/draft'] = a => { const pid = asLearner(); const g = asgOf(a.asg_id); const k = owner(g, pid); const end = g.late_until || g.due_at; if (g.status === 'closed' || (end && Date.now() > Date.parse(end))) ERR(409, 'closed', '제출 기간이 끝났습니다.');
    let s = st().subs.find(x => x.asg_id === g.asg_id && x.owner_key === k); if (s && s.status !== 'draft') ERR(409, 'submitted', '이미 제출했습니다. 수정하려면 제출을 취소하세요.');
    if (s && a.base_version != null && +a.base_version !== s.version) ERR(409, 'conflict', `다른 팀원이 먼저 저장했습니다(현재 버전 ${s.version}). 새로 불러온 뒤 다시 저장하세요.`);
    const files = a.files || (s ? s.files : []); if (files.length > g.max_files) ERR(400, 'too_many', `첨부 파일은 ${g.max_files}개까지 올릴 수 있습니다.`);
    if (!s) { s = { sub_id: rid(), asg_id: g.asg_id, owner_key: k, person_id: pid, team_id: k.startsWith('t:') ? k.slice(2) : null, status: 'draft', body: '', files: [], version: 0 }; st().subs.push(s); }
    if (s.version === 0 || s.body !== (a.body || '') || JSON.stringify(s.files) !== JSON.stringify(files)) { s.body = a.body || ''; s.files = files; s.version++; s.saved_at = nowIso(); st().vers.push({ sub_id: s.sub_id, ver: s.version, by: mno(pid), at: s.saved_at, body: s.body, files: [...files] }); }
    return { submission: subJ(s), saved: true }; };
  D['POST /api/lms/e/submit'] = a => { const pid = asLearner(); const g = asgOf(a.asg_id); const s = st().subs.find(x => x.asg_id === g.asg_id && x.owner_key === owner(g, pid)); if (!s) ERR(400, 'empty', '먼저 내용을 작성하거나 파일을 올리세요.');
    if (a.cancel) { if (s.status !== 'submitted') ERR(409, 'state', '제출 상태에서만 취소할 수 있습니다.'); s.status = 'draft'; s.submitted_at = null; return { submission: subJ(s) }; }
    if (s.status !== 'draft') ERR(409, 'submitted', '이미 제출했습니다.'); if (!s.body.trim() && !s.files.length) ERR(400, 'empty', '본문이나 첨부 파일이 있어야 제출할 수 있습니다.');
    s.status = 'submitted'; s.submitted_at = nowIso(); s.late = !!(g.due_at && Date.now() > Date.parse(g.due_at)); return { submission: subJ(s) }; };
  D['GET /api/lms/e/versions'] = a => ({ sub_id: a.sub, versions: st().vers.filter(v => v.sub_id === a.sub).slice().reverse().map(v => ({ ...v, chars: v.body.length, files: v.files.length })) });
  /* 성적 연결(묶음 H 데모 상태와 공유) */
  function gradeLink(sec, ref, cat, name, mx) { const X = st(); let it = X.items.find(i => i.section_id === sec && i.source_ref === ref); if (!it) { it = { item_id: rid(), section_id: sec, category: cat, name, weight_pct: 0, max_score: mx, source_ref: ref, sort: 50 }; X.items.push(it); } else Object.assign(it, { name, max_score: mx }); return it.item_id; }
  function gradePut(sec, item, pid, sc) { const p = demoStudents(sec).find(x => x.person_id === pid); if (!p || p.kind !== 'regular') return; const X = st(); (X.scores[item] = X.scores[item] || {})[pid] = { score: sc }; }
  Object.assign(EFH, { gradeLink, gradePut, mno, aOn, aSec });

  /* ═════════ u2: 데모 샘플(묶음 A 분반에 과제 · 제출 · 시험 · 응시 · 성적을 한 번 채운다, 결정적) ═════════ */
  const hsh = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
  const QSET = {
    ai: [['single', 'AI 서비스가 학습한 데이터에 없는 사실을 그럴듯하게 지어내는 현상은?', ['환각(사실이 아닌 답)', '과적합', '편향', '암호화'], ['c1'], 'easy', 'AI 답변은 출처를 확인해야 합니다.'], ['multi', '생성형 AI를 수업 과제에 쓸 때 지켜야 할 것을 모두 고르세요.', ['사용 사실 밝히기', '출처 확인', '개인정보 입력 금지', '결과를 그대로 제출'], ['c1', 'c2', 'c3'], 'mid', '결과를 그대로 제출하면 표절이 될 수 있습니다.'], ['tf', '지도학습은 정답(레이블)이 있는 데이터로 학습한다.', null, ['t'], 'easy', '정답이 있는 데이터를 씁니다.'], ['short', '데이터를 학습용과 평가용으로 나눌 때 평가용 데이터를 무엇이라 부르나요?', null, ['테스트 데이터', '테스트셋', '검증 데이터'], 'mid', '학습에 쓰지 않은 데이터로 성능을 봅니다.'], ['numeric', '정확도 = 맞힌 수 ÷ 전체. 100개 중 85개를 맞히면 정확도(%)는?', null, { value: 85, tol: 0 }, 'easy', '85 ÷ 100 = 85%'], ['essay', 'AI를 학교생활에 활용한 경험 하나와 주의할 점을 3문장 이내로 쓰세요.', null, null, 'hard', '']],
    mec: [['single', '열역학 제1법칙이 말하는 것은?', ['에너지 보존', '엔트로피 증가', '절대영도', '열평형'], ['c1'], 'easy', '에너지는 형태만 바뀝니다.'], ['multi', '상태량(상태 함수)을 모두 고르세요.', ['내부에너지', '엔탈피', '열', '일'], ['c1', 'c2'], 'hard', '열과 일은 경로에 따라 달라집니다.'], ['tf', '고립계의 엔트로피는 줄어들 수 없다.', null, ['t'], 'mid', '열역학 제2법칙입니다.'], ['short', '압력이 일정한 과정을 무엇이라 하나요?', null, ['등압과정', '정압과정'], 'easy', ''], ['numeric', '카르노 기관: 고온 500K, 저온 300K. 최대 효율(%)은?', null, { value: 40, tol: 0.5 }, 'mid', '1 − 300/500 = 0.4'], ['essay', '냉장고가 열을 옮기는 원리를 2~3문장으로 설명하세요.', null, null, 'hard', '']],
    biz: [['single', '자산 = 부채 + ( ? )', ['자본', '수익', '비용', '매출'], ['c1'], 'easy', '회계 등식입니다.'], ['multi', '마케팅 4P에 들어가는 것을 모두 고르세요.', ['제품', '가격', '유통', '인사'], ['c1', 'c2', 'c3'], 'mid', '4P: 제품 · 가격 · 유통 · 촉진'], ['tf', '감가상각은 현금이 나가는 비용이다.', null, ['f'], 'hard', '현금 지출이 없는 비용입니다.'], ['short', '기업의 강점 · 약점 · 기회 · 위협을 보는 분석은?', null, ['SWOT', 'SWOT 분석'], 'easy', ''], ['numeric', '매출 200, 매출원가 120일 때 매출총이익률(%)은?', null, { value: 40, tol: 0 }, 'mid', '(200 − 120) ÷ 200'], ['essay', '우리 학교 앞 카페의 경쟁 전략을 한 가지 제안하세요(3문장 이내).', null, null, 'hard', '']]
  };
  const BODY = ['수업에서 배운 개념을 학과 사례에 적용해 정리했습니다. 자료 수집 · 정리 · 결론 순서로 썼고 참고문헌 2건을 붙였습니다.', '사례 기업의 문제를 정의하고 해결 방법 두 가지를 비교했습니다. 표와 그림으로 핵심을 요약했습니다.', '조원과 토의한 내용을 바탕으로 장단점을 나누어 쓰고, 한계와 다음 과제를 정리했습니다.', '실습 결과를 캡처해 붙이고 수치가 달라진 이유를 설명했습니다. 마지막에 느낀 점을 덧붙였습니다.'];
  const FB = ['핵심을 잘 정리했습니다. 근거 자료를 한 가지 더 보완하면 좋겠습니다.', '구성이 좋습니다. 결론을 조금 더 분명하게 써 보세요.', '사례 선택이 적절합니다. 인용 형식을 맞춰 주세요.'];
  function seedSec(sec) {
    const X = st(); X.seeded = X.seeded || {}; if (X.seeded[sec]) return; const S0 = aSec(sec); if (!S0) return; X.seeded[sec] = 1;
    const P = demoStudents(sec); const now = Date.now(), DAY = 864e5; const iso = t => new Date(t).toISOString(); const hp = (p, k) => hsh(p.member_no + '|' + sec + '|' + k);
    /* 과제 3개: 마감 지난 보고서(채점 대기 다수) · 이번 주 마감 계획서 · 비공개 기말 보고서 */
    const mkA = v => { const g = { asg_id: rid(), section_id: sec, body: '', kind: 'individual', submit_types: ['file', 'text'], max_files: 3, open_at: iso(now - 14 * DAY), late_until: null, late_penalty_pct: 0, max_score: 100, rubric_id: null, plag_on: false, status: 'published', ...v }; X.asg.push(g); gradeLink(sec, 'asg:' + g.asg_id, 'assignment', g.title, g.max_score); return g; };
    const a1 = mkA({ title: '1주차 보고서 — 수업 개념 사례 조사', body: '수업에서 다룬 개념을 실제 사례 하나에 적용해 2쪽 이내로 정리합니다.', due_at: iso(now - 3 * DAY), late_until: iso(now - DAY), late_penalty_pct: 10, rubric_id: 'rub_tpl1', plag_on: true });
    const a2 = mkA({ title: '중간 프로젝트 계획서', body: '팀 프로젝트 주제 · 역할 · 일정을 1쪽으로 제출합니다.', due_at: iso(now + 4 * DAY) });
    mkA({ title: '기말 보고서', body: '학기 프로젝트 결과 보고서(5쪽 이내).', due_at: iso(now + 40 * DAY), status: 'draft' });
    const sub = (g, p, v) => { const s = { sub_id: rid(), asg_id: g.asg_id, owner_key: 'p:' + p.person_id, person_id: p.person_id, team_id: null, files: [], ...v }; X.subs.push(s); X.vers.push({ sub_id: s.sub_id, ver: s.version, by: p.member_no, at: s.saved_at, body: s.body, files: [] }); return s; };
    P.forEach(p => { const h = hp(p, 'a1'); if (h % 100 < 86) { const late = h % 7 === 0; const t = late ? now - 2 * DAY : now - (4 + h % 4) * DAY; const graded = h % 100 < 66;
        const s = sub(a1, p, { status: graded ? 'graded' : 'submitted', body: BODY[h % BODY.length], version: 1 + h % 3, saved_at: iso(t), submitted_at: iso(t), late });
        if (graded) { const l1 = [10, 6, 10, 6, 10][h % 5], l2 = [5, 3, 5, 1][h % 4]; s.rubric_scores = { logic: l1, form: l2 }; s.score = r2((l1 + l2) / 15 * 100 * (late ? 0.9 : 1)); s.feedback = FB[h % FB.length]; s.graded_at = iso(now - DAY); applyGrade(a1, s); } }
      const h2 = hp(p, 'a2'); if (h2 % 100 < 30) sub(a2, p, { status: 'submitted', body: '주제: ' + S0.course_name + ' 관련 문제 해결 · 역할 분담과 4주 일정을 정리했습니다.', version: 1, saved_at: iso(now - DAY), submitted_at: iso(now - DAY), late: false });
      else if (h2 % 100 < 55) sub(a2, p, { status: 'draft', body: '주제 후보를 정리하는 중입니다.', version: 1, saved_at: iso(now - 2 * 36e5), submitted_at: null, late: false }); });
    /* 표절 검사 결과(유사도 높은 제출 1건) */
    const sa = X.subs.filter(s => s.asg_id === a1.asg_id); sa.forEach((s, i) => { X.plag[s.sub_id] = { engine: 'stub-local', status: 'done', similarity: i === 1 ? 62 : 8 + (hsh(s.sub_id) % 25), matches: [], finished_at: iso(now - DAY) }; });
    /* 문제은행 · 시험 */
    const fam = /^(MEC)/.test(S0.course_code) ? 'mec' : /^(BUS|ACC)/.test(S0.course_code) ? 'biz' : 'ai';
    const bank = { bank_id: rid(), name: S0.course_name + ' 문제은행', scope: 'section', section_id: sec, course_key: null }; X.banks.push(bank);
    const qs = QSET[fam].map(([kind, stem, ch, answer, difficulty, explanation]) => { const choices = kind === 'tf' ? [{ id: 't', text: '참' }, { id: 'f', text: '거짓' }] : (ch || []).map((t, i) => ({ id: 'c' + (i + 1), text: t }));
      const q = { q_id: rid(), bank_id: bank.bank_id, kind, stem, choices, answer, points: kind === 'essay' ? 4 : 2, difficulty, diff_auto: false, tags: [], media: [], explanation, origin_q: null, attempts_n: 0, correct_n: 0 }; X.qs.push(q); return q; });
    const exBase = { section_id: sec, guide: '', shuffle_q: true, shuffle_c: true, ip_allow: [], show_result: 'immediate', retry_wrong: true, score_policy: 'best', status: 'published' };
    const ex1 = { exam_id: rid(), ...exBase, title: '1차 퀴즈', open_at: iso(now - 10 * DAY), close_at: iso(now - 3 * DAY), time_limit_min: 20, max_attempts: 1, rules: [], fixed: qs.map(q => q.q_id), need_precheck: false };
    const ex2 = { exam_id: rid(), ...exBase, title: '2차 퀴즈', open_at: iso(now - 36e5), close_at: iso(now + 7 * DAY), time_limit_min: 60, max_attempts: 1, rules: [{ bank_id: bank.bank_id, difficulty: null, n: 5 }], fixed: [], need_precheck: true, show_result: 'after_close' };
    X.exams.push(ex1, ex2); const it1 = gradeLink(sec, 'exam:' + ex1.exam_id, 'quiz', ex1.title, 100); gradeLink(sec, 'exam:' + ex2.exam_id, 'quiz', ex2.title, 100);
    const pr = { easy: 85, mid: 65, hard: 45 };
    P.forEach((p, j) => { const h = hp(p, 'x1'); if (h % 100 >= 92) return; const t0 = now - (9 - h % 5) * DAY; let s = 0, mx = 0, pend = false; const answers = {}, marks = {};
      const items = qs.map(q => ({ q: q.q_id, p: q.points, c: q.choices.map(c => c.id) }));
      qs.forEach((q, k) => { mx += q.points; const ok = (hsh(p.member_no + q.q_id) % 100) < pr[q.difficulty];
        if (q.kind === 'essay') { answers[q.q_id] = '수업 내용을 바탕으로 경험과 주의할 점을 정리했습니다.'; if (j % 4 === 1) { pend = true; marks[q.q_id] = { score: null, ok: null, auto: false }; } else { const sc = [4, 3, 2, 4][h % 4]; marks[q.q_id] = { score: sc, ok: sc >= q.points, auto: false }; s += sc; } return; }
        answers[q.q_id] = q.kind === 'numeric' ? (ok ? q.answer.value : 50) : q.kind === 'short' ? (ok ? q.answer[0] : '모름') : q.kind === 'tf' ? (ok ? q.answer : [q.answer[0] === 't' ? 'f' : 't']) : (ok ? q.answer : [q.choices[q.choices.length - 1].id]);
        marks[q.q_id] = { score: ok ? q.points : 0, ok, auto: true }; if (ok) s += q.points; q.attempts_n++; if (ok) q.correct_n++; });
      const ip = `10.20.${30 + h % 8}.${h % 200 + 10}`; const t = { attempt_id: rid(), exam_id: ex1.exam_id, person_id: p.person_id, no: 1, status: pend ? 'submitted' : 'graded', started_at: iso(t0), deadline_at: iso(t0 + 20 * 6e4), submitted_at: iso(t0 + (12 + h % 7) * 6e4), auto_closed: false,
        auto_score: s, score: pend ? null : s, max_score: mx, ip_start: ip, ip_last: j === 2 ? '10.99.1.7' : ip, ip_changed: j === 2, ip_log: [{ ip, at: iso(t0), ev: 'start' }], items, answers, marks };
      X.atts.push(t); if (!pend) gradePut(sec, it1, p.person_id, r2(100 * s / mx)); });
    /* 성적: 수업계획서 비율(중간 30 · 기말 30 · 과제 20 · 퀴즈 10 · 출석 10) — 과제 · 퀴즈는 위 자동 항목에 비율을 준다 */
    X.items.filter(i => i.section_id === sec).forEach(i => { i.weight_pct = i.source_ref === 'asg:' + a1.asg_id ? 20 : i.source_ref === 'exam:' + ex1.exam_id ? 10 : 0; i.sort = i.weight_pct ? 20 : 60; });
    [['midterm', '중간고사', 30, 1], ['final', '기말고사', 30, 2], ['attendance', '출석', 10, 30]].forEach(([category, name, w, sort]) => { const it = { item_id: rid(), section_id: sec, category, name, weight_pct: w, max_score: 100, source_ref: null, sort }; X.items.push(it);
      P.forEach(p => { const h = hp(p, category); const v = category === 'attendance' ? 70 + h % 31 : 48 + h % 50; gradePut(sec, it.item_id, p.person_id, v); }); });
  }

  /* ═════════ 화면 ═════════ */
  if (typeof MENU === 'object') {
    Object.assign(MENU, { lmse: { label: '과제', ws: 'learn', only: 'univ' } });
    Object.keys(PRESET).forEach(k => { const P = PRESET[k]; if (k === 'univ_lms') { if (!P.on.includes('lmse')) P.on.splice(Math.max(0, P.on.indexOf('assess')) + 1, 0, 'lmse'); } else if (!P.on.includes('lmse') && !P.off.includes('lmse')) P.off.push('lmse'); });
  }
  const STL = { none: ['미제출', 'r'], draft: ['작성 중', 'y'], submitted: ['제출', ''], graded: ['채점 완료', 'g'], returned: ['반환', 'g'] };
  const stTag = s => tag(...(STL[s] || [s]));
  VIEWS.lmse = () => {
    if (!ON()) return '<div class="empty">대학(학사 LMS) 기관에서 쓰는 화면입니다.</div>'; css();
    const P = secPick('lmseSec', 'lmse-sec'); const tab = UI.lmseT || 'list';
    const right = `<button class="btn" data-act="lmse-rub">채점 기준 · 템플릿</button><button class="btn" data-act="lmse-new">새 과제</button>`;
    let h = head('과제', '과제를 내고 제출물을 채점 기준으로 채점 · 첨삭합니다. 표절 검사 · 팀 과제 · 일괄 피드백은 과제의 「⋯」에 있습니다.', P.sec ? right : '') + P.html;
    if (!P.sec) return h;
    const r = load('lmse:list:' + P.sec.section_id, () => call('GET', '/api/lms/e/list', { section: P.sec.section_id }));
    if (r && r.ok) h += todoE(r.ok.assignments);
    h += tabs4('lmseT', [['list', '과제 목록'], ['status', '제출 현황 · 채점'], ...(LIVE_ON() ? [] : [['learner', '학생 화면 미리보기']])], tab);
    if (tab === 'status') return h + statusView(P.sec);
    if (tab === 'learner') return h + learnerView(P.sec);
    if (!r) return h + wait(); if (r.err) return h + errBox(r.err);
    const L = r.ok.assignments;
    return h + `<div class="card">${table(['과제', '마감', '제출', '채점 대기', ''], L.map(g => [`<b>${esc(g.title)}</b> ${g.status === 'published' ? '' : tag({ draft: '비공개', closed: '마감' }[g.status] || g.status)}${g.kind === 'team' ? ' ' + tag('팀') : ''}`, fmt(g.due_at), `${g.submitted} / ${g.targets}`, g.submitted - g.graded > 0 ? tag(String(g.submitted - g.graded) + '건', 'y') : '0',
      `<button class="btn sm" data-act="lmse-open" data-v="${esc(g.asg_id)}">열기</button>`]), '아직 과제가 없습니다. 「새 과제」로 만드세요.')}</div>`;
  };
  /* 지금 할 일: 채점 대기 · 다가오는 마감 */
  function todoE(L) {
    const pend = L.map(g => ({ g, n: g.submitted - g.graded })).filter(x => x.n > 0).sort((a, b) => b.n - a.n); const tot = pend.reduce((s, x) => s + x.n, 0);
    const soon = L.filter(g => g.status === 'published' && g.due_at && Date.parse(g.due_at) > Date.now()).sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at))[0];
    const due = soon ? ` · 다음 마감 <b>${esc(soon.title)}</b> ${fmt(soon.due_at)} (제출 ${soon.submitted}/${soon.targets})` : '';
    if (tot) return todo(`채점 대기 <b>${tot}건</b>${pend.length > 1 ? ` (과제 ${pend.length}개)` : ''}${due}`, `<button class="btn sm pri" data-act="lmse-start" data-v="${esc(pend[0].g.asg_id)}">채점 시작</button>`);
    if (!L.length) return todo('이 분반에 아직 과제가 없습니다.', `<button class="btn sm pri" data-act="lmse-new">새 과제 만들기</button>`);
    return todo(`채점할 제출물이 없습니다${due}`);
  }
  ACT['lmse-start'] = el => { UI.lmseA = el.dataset.v; UI.lmseT = 'status'; render(); };
  ACT['lmse-sec'] = el => { UI.lmseSec = el.value; UI.lmseA = null; render(); };
  ACT['lmse-open'] = el => { UI.lmseA = el.dataset.v; UI.lmseT = 'status'; render(); };
  function rubricsFor(sec) { const r = load('lmse:rub:' + sec, () => call('GET', '/api/lms/e/rubrics', { section: sec })); return r && r.ok ? r.ok.rubrics : []; }
  function asgForm(sec, g, rubs) {
    g = g || { kind: 'individual', submit_types: ['file', 'text'], max_files: 5, max_score: 100, late_penalty_pct: 0, status: 'published' };
    const loc = t => t ? new Date(Date.parse(t) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';
    return `<div class="form2 efh-form"><label class="full">제목<input name="title" maxlength="200" value="${esc(g.title || '')}"></label><label class="full">설명<textarea name="body" rows="3">${esc(g.body || '')}</textarea></label>
      <label>유형<select name="kind"><option value="individual" ${g.kind === 'individual' ? 'selected' : ''}>개인</option><option value="team" ${g.kind === 'team' ? 'selected' : ''}>팀(협업 · 버전 관리)</option></select></label>
      <label>상태<select name="status">${[['draft', '비공개'], ['published', '공개'], ['closed', '마감']].map(([k, l]) => `<option value="${k}" ${g.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>공개<input type="datetime-local" name="open_at" value="${loc(g.open_at)}"></label><label>마감<input type="datetime-local" name="due_at" value="${loc(g.due_at)}"></label>
      <label>지각 제출 마감<input type="datetime-local" name="late_until" value="${loc(g.late_until)}"></label><label>지각 감점(%)<input type="number" name="late_penalty_pct" min="0" max="100" value="${g.late_penalty_pct}"></label>
      <label>만점<input type="number" name="max_score" min="1" max="1000" value="${g.max_score}"></label><label>첨부 파일 수<input type="number" name="max_files" min="0" max="10" value="${g.max_files}"></label>
      <label>루브릭<select name="rubric_id"><option value="">점수 직접 입력</option>${(rubs || rubricsFor(sec)).map(r => `<option value="${esc(r.rubric_id)}" ${g.rubric_id === r.rubric_id ? 'selected' : ''}>${esc(r.name)}${r.is_template ? ' (템플릿)' : ''}</option>`).join('')}</select></label>
      <label class="ul-ck"><input type="checkbox" name="t_text" ${g.submit_types.includes('text') ? 'checked' : ''}> 온라인 문서 제출</label><label class="ul-ck"><input type="checkbox" name="t_file" ${g.submit_types.includes('file') ? 'checked' : ''}> 파일 제출</label>
      <label class="ul-ck"><input type="checkbox" name="plag_on" ${g.plag_on ? 'checked' : ''}> 제출 시 표절 검사 대기열에 넣기</label></div>`;
  }
  async function asgModal(sec, g) {
    let rubs = []; try { rubs = (await call('GET', '/api/lms/e/rubrics', { section: sec })).rubrics; } catch (e) { }
    modal(g ? '과제 편집' : '새 과제', asgForm(sec, g, rubs), [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const iso = n => { const v = fv(w, n); return v ? new Date(v).toISOString() : null; };
      const b = { asg_id: g ? g.asg_id : undefined, section_id: sec, title: fv(w, 'title'), body: fv(w, 'body'), kind: fv(w, 'kind'), status: fv(w, 'status'), open_at: iso('open_at'), due_at: iso('due_at'), late_until: iso('late_until'), late_penalty_pct: fv(w, 'late_penalty_pct'), max_score: fv(w, 'max_score'), max_files: fv(w, 'max_files'), rubric_id: fv(w, 'rubric_id') || null, plag_on: fv(w, 'plag_on'), submit_types: [fv(w, 't_text') && 'text', fv(w, 't_file') && 'file'].filter(Boolean) };
      if (!b.submit_types.length) { toast('제출 방식을 하나 이상 고르세요.', 'warn'); return false; }
      run(() => call('POST', '/api/lms/e/save', b), '과제를 저장했습니다.', 'lmse:'); } }], true);
  }
  ACT['lmse-new'] = () => asgModal(UI.lmseSec, null);
  ACT['lmse-edit'] = el => { const r = C['lmse:list:' + UI.lmseSec]; const g = r && r.ok && r.ok.assignments.find(x => x.asg_id === el.dataset.v); if (g) asgModal(UI.lmseSec, g); };

  function statusView(sec) {
    const lr = load('lmse:list:' + sec.section_id, () => call('GET', '/api/lms/e/list', { section: sec.section_id })); if (!lr) return wait(); if (lr.err) return errBox(lr.err);
    const L = lr.ok.assignments; if (!L.length) return '<div class="empty">과제가 없습니다. 「새 과제」로 만드세요.</div>';
    const id = L.some(g => g.asg_id === UI.lmseA) ? UI.lmseA : L[0].asg_id; UI.lmseA = id;
    const r = load('lmse:st:' + id, () => call('GET', '/api/lms/e/status', { asg: id })); const pick = `<div class="bar2"><select data-chg="lmse-pick" aria-label="과제 선택">${L.map(g => `<option value="${esc(g.asg_id)}" ${g.asg_id === id ? 'selected' : ''}>${esc(g.title)}${g.submitted - g.graded > 0 ? ` (채점 대기 ${g.submitted - g.graded})` : ''}</option>`).join('')}</select></div>`;
    if (!r) return pick + wait(); if (r.err) return pick + errBox(r.err);
    const { assignment: g, rows, counts: c } = r.ok; const team = g.kind === 'team';
    const pl = load('lmse:plag:' + id, () => call('GET', '/api/lms/e/plag', { asg: id })); const plR = pl && pl.ok ? pl.ok.results : [];
    const menu = dots([mi('lmse-edit', '과제 설정 편집', id), team ? mi('lmse-teams', '팀 편성', id) : '', mi('lmse-bulk', '일괄 피드백(선택 · 전체)', id), mi('lmse-zip', '제출물 일괄 내려받기(zip)', id), mi('lmse-plag', plR.length ? '표절 검사 다시 실행' : '표절 검사 실행', id)], '이 과제의 다른 작업');
    return pick + `<div class="kpis">${kpi('제출', c.submitted + c.graded, `채점 대기 ${c.submitted}`)}${kpi('채점 완료', c.graded)}${kpi('미제출', c.none, c.draft ? `작성 중 ${c.draft}` : '')}${kpi('지각', c.late)}</div>
      <div class="card"><div class="ch"><b>${esc(g.title)}</b><small>${team ? '팀 과제 · 저장할 때마다 버전이 남습니다' : '개인 과제'} · 마감 ${fmt(g.due_at)} · 청강생은 성적 제외</small><span class="efh-acts">${menu}</span></div>
      ${table(['', team ? '팀' : '학번', '상태', '점수', ''], rows.map(x => [x.sub_id && x.status !== 'draft' ? `<input type="checkbox" class="lmse-ck" value="${esc(x.sub_id)}" aria-label="선택">` : '', `<b>${esc(team ? x.team : x.member_no)}</b>${x.enroll === 'audit' ? ' ' + tag('청강', 'y') : ''}<small class="efh-sub2">${esc(team ? (x.members || []).join(', ') : x.unit_code || '')}</small>`, stTag(x.status) + (x.late ? ' ' + tag('지각', 'r') : '') + (x.similarity != null && x.similarity >= 50 ? ' ' + tag('유사도 ' + x.similarity + '%', 'r') : ''), x.score == null ? '-' : String(x.score),
        x.sub_id && x.status !== 'draft' ? `<button class="btn sm" data-act="lmse-grade" data-v="${esc(x.sub_id)}">${/graded|returned/.test(x.status) ? '보기' : '채점'}</button>` : '']))}
      <p class="efh-note">학번 옆 학과 · 제출 시각 · 버전 · 유사도는 「채점」을 누르면 함께 보입니다.</p></div>
      ${plR.length ? `<div class="card"><div class="ch"><b>표절 검사 결과</b><small>${esc(pl.ok.engine.note)}</small></div>${table(['제출자', '유사도', '비슷한 출처'], plR.map(x => [esc(x.owner), tag((x.similarity ?? 0) + '%', x.similarity >= 50 ? 'r' : ''), esc((x.matches || []).map(m => `${m.source} ${m.pct}%`).join(' · ') || '-')]))}</div>` : ''}`;
  }
  ACT['lmse-pick'] = el => { UI.lmseA = el.value; render(); };
  const checked = () => [...document.querySelectorAll('.lmse-ck:checked')].map(x => x.value);
  ACT['lmse-bulk'] = el => { const ids = checked(); modal('일괄 피드백', `<p>${ids.length ? `선택한 ${ids.length}건` : '제출한 모든 학생'}에게 같은 피드백을 보냅니다. 점수를 넣으면 함께 반영합니다.</p><div class="form2"><label class="full">피드백<textarea name="fb" rows="4"></textarea></label><label>점수(선택)<input type="number" name="sc" min="0"></label></div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '보내기', kind: 'pri', run: w => { run(() => call('POST', '/api/lms/e/bulk-feedback', { asg_id: el.dataset.v, sub_ids: ids, all: !ids.length, feedback: fv(w, 'fb'), score: fv(w, 'sc') }), '피드백을 반영했습니다.', 'lmse:'); } }]); };
  ACT['lmse-zip'] = async el => { const r = await run(() => call('GET', '/api/lms/e/bundle', { asg: el.dataset.v })); if (!r) return; if (!r.files.length) return toast('내려받을 제출물이 없습니다.');
    dl(`${r.name}_제출물_${today()}.zip`, zip(r.files.map(f => ({ path: f.path, bytes: b64bytes(f.b64) }))), 'application/zip'); toast(`${r.files.length}개 파일을 묶었습니다.`, 'ok'); };
  ACT['lmse-plag'] = el => run(() => call('POST', '/api/lms/e/plag-run', { asg_id: el.dataset.v }), '표절 검사를 마쳤습니다(모의 어댑터).', 'lmse:');
  ACT['lmse-teams'] = el => { const r = C['lmse:st:' + el.dataset.v]; const cur = r && r.ok ? r.ok.rows.map(x => `${x.team}: ${(x.members || []).join(' ')}`).join('\n') : '';
    modal('팀 편성', `<p>한 줄에 한 팀: 「팀 이름: 학번 학번 …」. 작성이 시작되면 다시 편성할 수 없습니다.</p><div class="form2"><label class="full">팀 목록<textarea name="t" rows="6" placeholder="1팀: 20261001 20261002">${esc(cur)}</textarea></label><label>자동 편성(팀 인원)<input type="number" name="auto" min="2" max="20" placeholder="비우면 직접 입력"></label></div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '편성', kind: 'pri', run: w => { const auto = fv(w, 'auto'); const teams = fv(w, 't').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [n, m = ''] = l.includes(':') ? l.split(':') : ['', l]; return { name: n.trim(), members: m.split(/[\s,]+/).filter(Boolean) }; });
        run(() => call('POST', '/api/lms/e/teams', auto ? { asg_id: el.dataset.v, auto } : { asg_id: el.dataset.v, teams }), '팀을 편성했습니다.', 'lmse:'); } }]); };
  ACT['lmse-grade'] = async el => {
    const r = await run(() => call('GET', '/api/lms/e/sub', { id: el.dataset.v })); if (!r) return; const s = r.submission;
    const stc = C['lmse:st:' + s.asg_id]; const rub = stc && stc.ok && stc.ok.rubric; const g = stc && stc.ok && stc.ok.assignment;
    const files = s.files.map(f => `<button class="btn sm" data-act="lmse-dl" data-v="${esc(f.file_id)}">${esc(f.name)}</button>`).join(' ') || '<span class="muted">첨부 없음</span>';
    const rubH = rub ? rub.criteria.map(c => `<fieldset class="efh-rub"><legend>${esc(c.name)}</legend>${c.levels.map(l => `<label class="ul-ck"><input type="radio" name="rb_${esc(c.key)}" value="${l.score}" ${s.rubric_scores && +s.rubric_scores[c.key] === +l.score ? 'checked' : ''}> ${esc(l.label)} (${l.score})</label>`).join('')}</fieldset>`).join('') : `<label>점수(만점 ${g ? g.max_score : 100})<input type="number" name="score" min="0" value="${s.score ?? ''}"></label>`;
    modal('채점 · 첨삭', `<div class="efh-sub"><p>${tag(s.member_no || '팀 제출')} ${s.late ? tag('지각', 'r') : ''} 버전 ${s.version} · ${fmt(s.submitted_at)}</p><pre class="efh-body">${esc(s.body || '(본문 없음)')}</pre><p>첨부: ${files}</p>${r.plagiarism ? `<p>표절 유사도 ${tag((r.plagiarism.similarity ?? 0) + '%')}</p>` : ''}</div>
      <div class="form2">${rubH}<label class="full">피드백<textarea name="fb" rows="3">${esc(s.feedback || '')}</textarea></label><label>첨삭 — 인용<input name="aq" placeholder="본문에서 고칠 부분"></label><label>첨삭 — 의견<input name="ac"></label><label class="full">첨삭 파일<input type="file" name="ff" multiple></label><label class="ul-ck"><input type="checkbox" name="ret"> 학생에게 반환(재작성 요청)</label></div>
      ${(s.annotations || []).length ? `<div class="card"><b>남긴 첨삭</b>${s.annotations.map(a => `<p>「${esc(a.quote)}」 → ${esc(a.comment)}</p>`).join('')}</div>` : ''}`,
      [{ id: 'c', label: '닫기' }, { id: 'ok', label: '채점 저장', kind: 'pri', run: w => { (async () => {
        const ff = []; for (const f of [...(w.querySelector('[name=ff]').files || [])]) { const up = await call('POST', '/api/lms/e/file', { name: f.name, mime: f.type || 'application/octet-stream', b64: await toB64(f) }); ff.push(up.file_id); }
        const b = { sub_id: s.sub_id, feedback: fv(w, 'fb'), return: fv(w, 'ret'), annotations: [...(s.annotations || []), ...(fv(w, 'aq') || fv(w, 'ac') ? [{ quote: fv(w, 'aq'), comment: fv(w, 'ac') }] : [])], feedback_files: [...(s.feedback_files || []).map(x => x.file_id), ...ff] };
        if (rub) { b.rubric_scores = {}; rub.criteria.forEach(c => { const x = w.querySelector(`[name="rb_${c.key}"]:checked`); if (x) b.rubric_scores[c.key] = +x.value; }); } else b.score = fv(w, 'score');
        await run(() => call('POST', '/api/lms/e/grade', b), '채점을 저장했습니다.', 'lmse:'); })().catch(e => toast(e.message, 'warn')); } }], true);
  };
  ACT['lmse-dl'] = async el => { const f = await run(() => call('GET', '/api/lms/e/file', { id: el.dataset.v })); if (f) dl(f.name, b64bytes(f.b64), f.mime); };
  ACT['lmse-rub'] = () => {
    const L = rubricsFor(UI.lmseSec); const admin = !S.me || S.me.role !== 'teacher';
    modal('루브릭 · 운영자 템플릿', `${L.map(r => `<div class="card"><b>${esc(r.name)}</b> ${r.is_template ? tag('운영자 템플릿') : tag('분반')}<p class="muted">${esc(r.criteria.map(c => `${c.name}(${c.levels.map(l => l.label + ' ' + l.score).join('/')})`).join(' · '))}</p></div>`).join('') || '<p>루브릭이 없습니다.</p>'}
      <h4>새 루브릭</h4><p class="muted">한 줄에 기준 하나: 「기준 이름: 수준=점수, 수준=점수」</p><div class="form2"><label class="full">이름<input name="n"></label><label class="full">기준<textarea name="c" rows="4" placeholder="내용: 우수=10, 보통=6, 미흡=2&#10;형식: 우수=5, 미흡=1"></textarea></label>${admin ? '<label class="ul-ck"><input type="checkbox" name="tpl"> 운영자 템플릿(기관 공용)으로 저장</label>' : ''}</div>`,
      [{ id: 'c', label: '닫기' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const criteria = fv(w, 'c').split('\n').filter(l => l.includes(':')).map(l => { const [n, lv] = l.split(':'); return { name: n.trim(), levels: lv.split(',').map(x => x.split('=')).filter(x => x.length === 2).map(([a, b]) => ({ label: a.trim(), score: +b })) }; });
        run(() => call('POST', '/api/lms/e/rubric-save', { name: fv(w, 'n'), criteria, is_template: !!fv(w, 'tpl'), section_id: UI.lmseSec }), '루브릭을 저장했습니다.', 'lmse:'); } }], true);
  };

  /* 학생 화면 미리보기(데모): 학생으로 작성 · 자동 저장 · 제출 · 버전 · 피드백 확인. 운영에서는 학습자 포털이 /api/lms/e/my · draft · submit을 부른다 */
  function learnerView(sec) {
    const ps = demoStudents(sec.section_id); if (!ps.some(p => p.person_id === UI.lmseAs)) UI.lmseAs = ps[0] && ps[0].person_id;
    const pick = `<div class="bar2"><label class="efh-lab">학생 <select data-chg="lmse-as" aria-label="학생 선택">${ps.map(p => `<option value="${esc(p.person_id)}" ${p.person_id === UI.lmseAs ? 'selected' : ''}>${esc(p.member_no)}${p.kind === 'audit' ? ' (청강)' : ''}</option>`).join('')}</select></label><small class="muted">데모 동작 — 연동 후 동작: 학습자 포털(SSO 로그인)에서 같은 API로 제출합니다.</small></div>`;
    const r = load('lmse:my:' + sec.section_id + ':' + UI.lmseAs, () => call('GET', '/api/lms/e/my', { section: sec.section_id })); if (!r) return pick + wait(); if (r.err) return pick + errBox(r.err);
    return pick + (r.ok.assignments.map(g => { const s = g.submission; const done = s && s.status !== 'draft';
      return `<div class="card efh-my"><div class="ch"><b>${esc(g.title)}</b><small>마감 ${fmt(g.due_at)}${g.team ? ' · ' + esc(g.team.name) + ' (' + esc(g.team.members.join(', ')) + ')' : ''}</small>${s ? stTag(s.status) : stTag('none')}</div>
      <p class="muted">${esc(g.body || '')}</p>${g.submit_types.includes('text') ? `<textarea class="efh-ta" rows="5" data-asg="${esc(g.asg_id)}" data-ver="${s ? s.version : ''}" ${done ? 'readonly' : ''} aria-label="본문">${esc(s ? s.body : '')}</textarea>` : ''}
      <p class="muted efh-saved" id="sv_${esc(g.asg_id)}">${s ? `버전 ${s.version} · ${fmt(s.saved_at)} 저장` : '입력하면 자동으로 저장됩니다.'}</p>
      ${g.submit_types.includes('file') && !done ? `<label class="btn sm">파일 첨부<input type="file" multiple hidden data-chg="lmse-up" data-asg="${esc(g.asg_id)}"></label>` : ''} ${s ? s.files.map(f => tag(f.name)).join(' ') : ''}
      <div class="efh-acts">${done ? (s.status === 'submitted' ? `<button class="btn sm" data-act="lmse-unsub" data-v="${esc(g.asg_id)}">제출 취소</button>` : '') : `<button class="btn sm ink" data-act="lmse-submit" data-v="${esc(g.asg_id)}">제출</button>`}${s ? `<button class="btn sm" data-act="lmse-vers" data-v="${esc(s.sub_id)}">버전 기록</button>` : ''}</div>
      ${s && s.feedback ? `<div class="efh-fb"><b>피드백</b> ${s.score != null ? tag(s.score + '점', 'g') : ''}<p>${esc(s.feedback)}</p>${(s.annotations || []).map(a => `<p>「${esc(a.quote)}」 → ${esc(a.comment)}</p>`).join('')}</div>` : ''}</div>`; }).join('') || '<div class="empty">공개된 과제가 없습니다.</div>');
  }
  ACT['lmse-as'] = el => { UI.lmseAs = el.value; render(); };
  const myKey = () => 'lmse:my:' + UI.lmseSec + ':' + UI.lmseAs;
  const timers = {};
  document.addEventListener('input', e => { const ta = e.target.closest && e.target.closest('.efh-ta'); if (!ta) return; clearTimeout(timers[ta.dataset.asg]); const sv = document.getElementById('sv_' + ta.dataset.asg); if (sv) sv.textContent = '저장 대기 중…';
    timers[ta.dataset.asg] = setTimeout(async () => { try { const r = await call('POST', '/api/lms/e/draft', { asg_id: ta.dataset.asg, body: ta.value, base_version: ta.dataset.ver ? +ta.dataset.ver : undefined }); ta.dataset.ver = r.submission.version; const s2 = document.getElementById('sv_' + ta.dataset.asg); if (s2) s2.textContent = `버전 ${r.submission.version} · ${fmt(r.submission.saved_at)} 자동 저장`; drop(myKey()); } catch (x) { toast(x.message, 'warn'); } }, 1200); });
  ACT['lmse-up'] = async el => { const g = el.dataset.asg; const my = C[myKey()]; const s = my && my.ok && (my.ok.assignments.find(x => x.asg_id === g) || {}).submission; const ids = s ? s.files.map(f => f.file_id) : [];
    try { for (const f of [...el.files]) { const up = await call('POST', '/api/lms/e/file', { name: f.name, mime: f.type || 'application/octet-stream', b64: await toB64(f) }); ids.push(up.file_id); } await call('POST', '/api/lms/e/draft', { asg_id: g, body: s ? s.body : '', files: ids }); toast('파일을 첨부했습니다.', 'ok'); drop(myKey()); render(); } catch (x) { toast(x.message, 'warn'); } };
  ACT['lmse-submit'] = el => run(async () => { const ta = document.querySelector(`.efh-ta[data-asg="${el.dataset.v}"]`); if (ta) { clearTimeout(timers[el.dataset.v]); await call('POST', '/api/lms/e/draft', { asg_id: el.dataset.v, body: ta.value }); } return call('POST', '/api/lms/e/submit', { asg_id: el.dataset.v }); }, '제출했습니다.', 'lmse:');
  ACT['lmse-unsub'] = el => run(() => call('POST', '/api/lms/e/submit', { asg_id: el.dataset.v, cancel: true }), '제출을 취소했습니다.', 'lmse:');
  ACT['lmse-vers'] = async el => { const r = await run(() => call('GET', '/api/lms/e/versions', { sub: el.dataset.v })); if (r) modal('버전 기록', table(['버전', '저장한 사람', '시각', '글자 수', '첨부'], r.versions.map(v => [String(v.ver), esc(v.by || ''), fmt(v.at), String(v.chars), String(v.files)]))); };
})();
