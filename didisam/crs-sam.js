/* v35 crs-sam — 과정 만들기 흐름 · 콘텐츠 라이브러리 안의 AI SAM 도우미(BRIEF_CRS.md C5)
   대표님 2026-11-09: '막히거나 어려운 부분이 생기면 AI SAM이 개입해 도움' — 디지털 활용이 낮은 선생님 · 교수 · 강사가 전제.
   ① 막힘 감지: 한 단계 60초 이상 입력 없음 · 같은 칸 오류 2회 · [이전] 반복 · 빈 칸으로 다음 시도
      → 화면을 가리지 않는 자리(그 칸 바로 아래 또는 단계 머리)에 말풍선 '제가 이 칸을 채워 드릴까요?' [채워 주세요] [괜찮아요].
      한 단계에 한 번만 묻고, 닫으면 그 단계에서는 다시 묻지 않는다(초안 d.samAsked에 남겨 새로고침 뒤에도 유지). 알림은 aria-live로 읽어 준다.
   ② 단계별 [AI SAM에게 맡기기]: CF.steps[i].aiFill(d) → 없으면 이 파일의 규칙 채움 → '확인만 해 주세요' + [되돌리기].
   ③ 대화로 만들기: '중학생 수학 6차시 과정 만들어줘' → CF.open({from:'sam', prefill}) — 채워진 상태로 열고, 차시 목록 · 수강 설정은 들어갈 때 미리 채운다.
      과정 하나만 만드는 말만 새 흐름으로 보낸다. '만들고 홈페이지에 올리고 초대 링크' 같은 여러 단계 의도는 기존 계획 카드(slim-ai)를 그대로 쓴다.
      경로: 규칙 엔진(chatSend · answer) · 흐름 카드의 [마법사에서 직접 조정] · Claude 도구 create_courses(과정 1개일 때).
   ④ guide.js 'course' 가이드를 새 흐름 5단계(무엇을 · 누구에게 → 차시 목록 → 차시 채우기 → 수강 설정 → 미리보기 · 개설)와 맞춘다.
   CF(C1) · CT(C3)가 없으면 아무것도 바꾸지 않는다. 개인정보: 대화 입력은 samMask로 가린 뒤 저장한다. */
(function () {
  'use strict';
  const W = window;
  const SAM = W.CSAM = { idleMs: 60000, st: null, bound: false };
  const cf = () => (W.CF && typeof W.CF === 'object' && typeof W.CF.open === 'function') ? W.CF : null;
  const ty = () => (S && S.org && S.org.type) || 'adult';
  const U = () => ty() === 'univ';
  const T = k => { try { return t(k); } catch (e) { return k === 'cls' ? '과정' : k; } };
  const sig = k => { try { if (typeof gdSig === 'function') gdSig(k); } catch (e) { } };
  const audit = s => { try { logAudit(s); } catch (e) { } };

  /* ═════════ 흐름 상태 읽기(C1 인터페이스를 넓게 읽는다) ═════════ */
  const root = () => document.querySelector('#crsFlow, [data-crs-flow], .crs-flow');
  const shown = el => !!(el && el.isConnected && el.getClientRects().length);
  function isOpen() { const F = cf(); if (!F) return false; try { if (typeof F.isOpen === 'function') return !!F.isOpen() && shown(root() || document.body); } catch (e) { } return shown(root()); }
  const draft = () => { const F = cf(); if (!F) return null; try { const d = typeof F.draft === 'function' ? F.draft() : F.draft; return d && typeof d === 'object' ? d : null; } catch (e) { return null; } };
  const steps = () => { const F = cf(); let L = []; try { L = typeof F.list === 'function' ? F.list() : F.steps; } catch (e) { } return Array.isArray(L) ? L.filter(x => x && x.id) : []; };
  const stepOf = id => steps().find(s => s.id === id) || null;
  const title = id => { const s = stepOf(id); let v = ''; try { v = s ? (typeof s.title === 'function' ? s.title(draft() || {}) : s.title) : ''; } catch (e) { } return String(v || NAME[id] || '이 단계'); };
  const NAME = { basic: '무엇을 · 누구에게', outline: '차시 목록', fill: '차시 채우기', setup: '수강 설정', open: '미리보기 · 개설' };
  function cur() { const F = cf(); if (!F) return ''; let id = '';
    try { const c = typeof F.cur === 'function' ? F.cur() : F.cur; if (typeof c === 'string') id = c; else if (c && typeof c === 'object') id = c.id || (c.step && c.step.id) || (Number.isInteger(c.i) && steps()[c.i] ? steps()[c.i].id : ''); else if (Number.isInteger(c) && steps()[c]) id = steps()[c].id; } catch (e) { }
    if (!id) { const R = root(); const el = R && (R.dataset.step ? R : R.querySelector('[data-step]')); id = el ? el.dataset.step : ''; }
    if (!id) { const d = draft(); if (d && d.step != null) id = typeof d.step === 'number' ? ((steps()[d.step] || {}).id || '') : String(d.step); }
    return id; }
  const idx = id => steps().findIndex(s => s.id === id);
  const save2 = () => { const F = cf(); try { if (F && typeof F.saveDraft === 'function') F.saveDraft(); else if (typeof save === 'function') save(); } catch (e) { console.error(e); } };
  const refresh = id => { const F = cf(); if (!F) return; try { if (typeof F.refresh === 'function') return F.refresh(); if (typeof F.render === 'function') return F.render(); if (typeof F.go === 'function') return F.go(id); } catch (e) { console.error(e); } };
  const problems = id => { const s = stepOf(id); const d = draft(); if (!s || !d || typeof s.valid !== 'function') return []; try { return s.valid(d) || []; } catch (e) { return []; } };

  /* 단계별 상태: 물어본 단계 · 칸별 오류 수 · [이전] 횟수 · 마지막 입력 시각 */
  function st() { const d = draft(); const key = d || 'x';
    if (!SAM.st || SAM.st.key !== key) SAM.st = { key, step: cur(), errs: {}, backs: 0, last: Date.now(), auto: {}, sam: SAM.pendSam ? true : !!(d && d.from === 'sam'), asked: new Set(d && Array.isArray(d.samAsked) ? d.samAsked : []) };
    return SAM.st; }
  const asked = id => st().asked.has(id);
  const markAsked = id => { const s = st(); s.asked.add(id); const d = draft(); if (d) { d.samAsked = [...s.asked]; save2(); } };
  const touch = () => { if (SAM.st) SAM.st.last = Date.now(); };

  /* ═════════ 말풍선(화면을 가리지 않게 칸 아래 · 단계 머리에 끼워 넣음) ═════════ */
  function live(msg) { let L = document.getElementById('csamLive'); if (!L) { L = document.createElement('div'); L.id = 'csamLive'; L.className = 'csam-sr'; L.setAttribute('aria-live', 'polite'); L.setAttribute('role', 'status'); document.body.appendChild(L); } const b = document.querySelector('.csam-b'); if (b && b.closest('[aria-live]')) return; /* 흐름의 .cf-sam이 이미 읽어 줌 */ L.textContent = ''; setTimeout(() => { L.textContent = msg; }, 30); }
  const fieldEl = (R, f) => { if (!R || !f) return null; const q = String(f).replace(/["\\]/g, ''); try { return R.querySelector(`[data-cf="${q}"], [data-k="${q}"], [name="${q}"], [data-cff="${q}"]`); } catch (e) { return null; } };
  function spot(field) { const R = root(); if (!R) return null; const fe = fieldEl(R, field); if (fe) { const box = fe.closest('.cf-f, .crs-field, .crs-q, .fl, label, .field') || fe; return { el: box, pos: 'afterend' }; }
    /* 흐름 본문(스크롤 영역) 맨 위: 하단 고정 자리(.cf-sam)는 휴대폰에서 입력칸 · 버튼을 가렸다(평가 1회차 10번) */
    const bd = R.querySelector('.cf-body'); if (bd) return { el: bd, pos: 'afterbegin' };
    const cs = R.querySelector('.cf-sam'); if (cs) return { el: cs, pos: 'beforeend' };
    const slot = R.querySelector('.crs-sam-slot'); if (slot) return { el: slot, pos: 'beforeend' };
    const foot = R.querySelector('.crs-foot, .crs-actions, .crs-nav, footer'); if (foot) return { el: foot, pos: 'beforebegin' };
    const body = R.querySelector('.crs-body, .crs-step, [data-step]') || R; return { el: body, pos: 'afterbegin' }; }
  const drop = () => { SAM.bb = null; document.querySelectorAll('.csam-b').forEach(b => b.remove()); };
  /* 흐름이 같은 단계를 다시 그리면(칸 고침 · 오류 표시) 말풍선을 같은 자리에 되살린다 */
  const restore = id => { const B = SAM.bb; if (!B || B.id !== id || document.querySelector('.csam-b')) return; bubble(B.id, B.html, B.field, B.cls); };
  function bubble(id, html, field, cls) { drop(); try { decorate(); } catch (e) { } const p = spot(field); if (!p) return null; if (!/busy/.test(cls || '')) SAM.bb = { id, html, field, cls };
    const b = document.createElement('div'); b.className = 'csam-b' + (cls ? ' ' + cls : ''); b.dataset.step = id; b.setAttribute('role', 'group'); b.setAttribute('aria-label', 'AI SAM 도움');
    b.innerHTML = `<span class="orb sm" aria-hidden="true"></span><div class="csam-c"><b class="csam-n">AI SAM</b>${html}</div>`;
    p.el.insertAdjacentElement(p.pos, b); try { b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { } return b; }
  const jo = (w, a) => { const s0 = String(w || ''); try { if (W.CF && typeof W.CF.josa === 'function') return W.CF.josa(s0, a); } catch (e) { } return s0 + a; };
  const uName = () => { try { if (W.CF && typeof W.CF.unit === 'function') return W.CF.unit(draft() || {}); } catch (e) { } return U() ? '주차' : '차시'; };
  const MSG = {
    idle: (f, ti) => f ? `이 칸에서 잠시 멈추셨네요. 제가 이 칸을 채워 드릴까요?` : `「${ti}」에서 잠시 멈추셨네요. 제가 이 단계를 채워 드릴까요?`,
    empty: (f, ti) => f ? `이 칸이 비어 있습니다. 제가 이 칸을 채워 드릴까요?` : `「${ti}」에 빈 칸이 있습니다. 제가 채워 드릴까요?`,
    repeat: () => '같은 안내가 두 번 나왔습니다. 제가 이 칸을 알맞게 채워 드릴까요?',
    back: (f, ti) => `앞뒤로 오가고 계시네요. ${jo(`「${ti}」`, '을')} 제가 대신 채워 드릴까요?`,
    fill: () => `${uName()}마다 영상 · 교안 · 퀴즈를 넣는 단계입니다. 제가 ${uName()}마다 초안을 채워 드릴까요? 나중에 해도 됩니다.`,
    lib: () => '어떤 자료를 만들지 고민되시나요? 교안은 주제만 넣으면 3번 안에 만들어집니다. 제가 교안 만들기를 열어 드릴까요?'
  };
  /* 막힘 → 한 단계에 한 번만 */
  function nudge(id, why, field) { id = id || cur(); if (!id || !isOpen() || id === 'open' || asked(id) || document.querySelector('.csam-b.busy')) return false;
    const ti = title(id); const msg = (MSG[why] || MSG.idle)(field, ti); markAsked(id);
    bubble(id, `<p>${esc(msg)}</p><div class="csam-a"><button type="button" class="btn pri" data-act="csam-yes" data-v="${esc(id)}" data-f="${esc(field || '')}">${ic('spark', 16)} 채워 주세요</button><button type="button" class="btn ghost" data-act="csam-no" data-v="${esc(id)}">괜찮습니다</button></div>`, field);
    live(`AI SAM: ${msg} 아래 [채워 주세요] 또는 [괜찮습니다] 버튼을 누르세요.`); audit(`AI SAM 과정 만들기 도움 제안 — ${ti}(${why})`); return true; }
  SAM.nudge = nudge;
  ACT['csam-no'] = () => { drop(); touch(); live('알겠습니다. 필요하면 [AI SAM에게 맡기기]를 누르세요.'); };
  ACT['csam-yes'] = el => fill(el.dataset.v || cur(), { field: el.dataset.f || '' });

  /* ═════════ 단계 채우기: aiFill → 없으면 규칙 채움 → '확인만 해 주세요' ═════════ */
  const SUG = { adult: ['엑셀 실무', '직장인'], k12: ['중2 수학 심화', '중학교 2학년'], univ: ['AI 리터러시', '1학년 재학생'], corp: ['신입 온보딩', '신규 입사자'], public: ['디지털 역량 기초', '소속 직원'], lifelong: ['스마트폰 활용', '지역 주민'], voc: ['웹개발 실무', '구직자 훈련생'] };
  const sugg = () => SUG[ty()] || SUG.adult;
  function design(d) { const n = Math.max(1, Math.min(30, +d.sessions || +d.weeks || (U() ? 15 : 6))); const o = { topic: d.name || d.topic || sugg()[0], weeks: n, univ: U(), quiz: d.quiz !== false, assign: d.assign !== false, exam: d.exam !== false, vids: 1, level: d.level || '보통', vsrc: d.vsrc || 'youtube', docs: !!d.docs };
    let Wk = []; try { Wk = AI.design(o) || []; } catch (e) { } return { o, Wk }; }
  function ruleFill(id, d) { let n = 0; const set = (k, v) => { if (d[k] == null || d[k] === '' || (Array.isArray(d[k]) && !d[k].length)) { d[k] = v; n++; } };
    if (id === 'basic') { const FA = (k) => { try { const F = cf(); if (F && typeof F.fieldAI === 'function') return F.fieldAI(k, { ...d, [k]: '' }); } catch (e) { } return null; }; set('name', d.topic || FA('name') || sugg()[0]); if (FA('target')) set('target', FA('target')); if (FA('goal')) { set('goal', FA('goal')); if (d.goal && d._goalAI == null) d._goalAI = d.goal; } set('topic', d.name); set('target', sugg()[1]); set('sessions', U() ? 15 : 6); try { set('goal', AI.goal(d.name, d.target)); } catch (e) { } }
    else if (id === 'outline') { const { Wk } = design(d); if (Wk.length) set('weekPlan', Wk.map(w => ({ w: w.w, title: w.title, goal: w.goal }))); }
    else if (id === 'fill') { if (W.CT && typeof W.CT.autoFill === 'function') { W.CT.autoFill(d); n++; } else { const { o, Wk } = design(d); (d.weekPlan || d.outline || []).forEach((x, i) => { if (Wk[i] && x && x.title) { Wk[i].title = x.title; Wk[i].goal = x.goal || Wk[i].goal; } }); try { set('items', itemsFromDesign(Wk, o)); } catch (e) { } } }
    else if (id === 'setup') { set('price', 0); set('open', '전체'); }
    return n > 0; }
  async function fill(id, opt = {}) { id = id || cur(); const d = draft(); if (!cf() || !d || !id) return false;
    const snap = JSON.stringify(d); const ti = title(id); const s = stepOf(id);
    const jl = jo(String(ti), '을').slice(String(ti).length) || '을'; const b = opt.auto ? null : bubble(id, `<p>AI SAM이 「${esc(ti)}」${jl} 채우는 중입니다…</p>`, opt.field, 'busy'); if (!opt.auto) live(`AI SAM이 ${ti}${jl} 채우는 중입니다.`);
    let ok = false; const F = cf(); try { if (typeof F.snap === 'function') F.snap('AI SAM이 채운 내용'); } catch (e) { }
    /* 칸 하나(말풍선이 그 칸 아래에 뜬 경우): C1의 칸 채우기(fieldAI · planFrom)로 그 칸만 */
    try { const k = opt.field; if (k && k !== '_' && k !== '_check') { if (k === 'weekPlan' && typeof F.planFrom === 'function') { d.weekPlan = F.planFrom(d); d.sessions = d.weekPlan.length; ok = true; } else if (typeof F.fieldAI === 'function') { const v = F.fieldAI(k, { ...d, [k]: '' }); if (v != null && v !== '') { d[k] = v; ok = true; } } } } catch (e) { console.error(e); }
    try { if (!ok && s && typeof s.aiFill === 'function') { await s.aiFill(d, { field: opt.field || '', from: 'sam' }); ok = JSON.stringify(d) !== snap; } } catch (e) { console.error(e); }
    if (!ok) { try { ok = ruleFill(id, d); } catch (e) { console.error(e); ok = false; } }
    if (b) b.remove();
    if (!ok) { if (!opt.auto) { bubble(id, `<p>이 단계는 이미 채워져 있습니다. 내용을 확인하고 [다음]을 눌러 주세요.</p><div class="csam-a"><button type="button" class="btn ghost" data-act="csam-no">닫기</button></div>`, opt.field); live('이 단계는 이미 채워져 있습니다.'); } return false; }
    UNDO[id] = snap; st().auto[id] = 1; markAsked(id); save2(); refresh(id); try { S.ai.usage++; } catch (e) { }
    audit(`AI SAM 과정 만들기 — 「${ti}」 ${opt.auto ? '미리 채움' : '채움'}`);
    setTimeout(() => done(id, opt.auto ? 'auto' : 'fill'), 60); return true; }
  SAM.fill = fill;
  const UNDO = {};
  /* 미리 채운 내용을 사실대로 알린다 — 사용자가 직접 말하지 않았을 수도 있으므로(칩 · 가이드) '말씀하신'이라고 하지 않는다(평가 1회차 3번) */
  function preMsg() { const p = SAM.pre || {}; const d = draft() || {}; const got = [p.name ? `이름 「${d.name || p.name}」` : '', p.target ? `대상 「${d.target || p.target}」` : '', p.sessions ? `${p.sessions}${uName() === '회차' ? '회' : uName() === '주차' ? '주' : '차시'}` : '', p.price ? '수강료' : ''].filter(Boolean);
    if (!got.length) return ''; const last = got[got.length - 1].replace(/」$/, ''); const pt = jo(last, '을').slice(last.length) || '을';
    return `요청 문장에서 ${got.join(' · ')}${pt} 읽어 미리 채워 두었습니다. 다르면 바로 고치면 됩니다.`; }
  function done(id, how) { const ti = title(id); const m = how === 'pre' ? preMsg() : how === 'auto' ? `「${ti}」도 AI SAM이 미리 채워 두었습니다. 확인만 해 주세요.` : `${jo(`「${ti}」`, '을')} 채웠습니다. 확인만 해 주세요. 고칠 곳은 바로 고치면 됩니다.`; if (!m) return;
    bubble(id, `<p>${esc(m)}</p><div class="csam-a">${UNDO[id] ? `<button type="button" class="btn ghost" data-act="csam-undo" data-v="${esc(id)}">되돌리기</button>` : ''}<button type="button" class="btn ghost" data-act="csam-no">확인했습니다</button></div>`, '', 'ok'); live(`AI SAM: ${m}`); }
  ACT['csam-undo'] = el => { const id = el.dataset.v; const d = draft(); const snap = UNDO[id]; if (!d || !snap) { toast('되돌릴 내용이 없습니다.', 'warn'); return; }
    const o = JSON.parse(snap); Object.keys(d).forEach(k => { if (!(k in o)) delete d[k]; }); Object.assign(d, o); delete UNDO[id]; save2(); refresh(id); drop(); live('채우기 전으로 되돌렸습니다.'); toast('채우기 전으로 되돌렸습니다.', 'ok'); };

  /* [AI SAM에게 맡기기] — 단계마다 하나(마지막 미리보기 단계 제외) */
  function decorate() { const R = root(); if (!R || !shown(R)) return; const id = cur(); if (!id || id === 'open') { R.querySelectorAll('.csam-do').forEach(x => x.remove()); return; }
    const ex = R.querySelector('.csam-do'); if (ex && ex.dataset.step === id) return; if (ex) ex.remove();
    const slot = R.querySelector('.crs-sam-slot'); const head = R.querySelector('.crs-now, .crs-head, .crs-step-head'); const tgt = slot || head || (R.querySelector('.crs-body, .crs-step, [data-step]') || R);
    const h = `<div class="csam-do" data-step="${esc(id)}"><button type="button" class="btn csam-dobtn" data-act="csam-do" data-v="${esc(id)}">${ic('spark', 16)} AI SAM에게 맡기기</button><span class="csam-dohint">이 단계를 대신 채우고, 확인만 받습니다</span></div>`;
    tgt.insertAdjacentHTML(slot ? 'afterbegin' : head ? 'afterend' : 'afterbegin', h); }
  ACT['csam-do'] = el => fill(el.dataset.v || cur());

  /* ═════════ CF 이벤트 구독 ═════════ */
  const arg = a => (a && typeof a === 'object' && !Array.isArray(a) ? a : {});
  const sid = a => { a = arg(a); const s = a.step; return String(a.id || (s && typeof s === 'object' ? s.id : s) || a.to || cur() || ''); };
  function onStep(a) { const x = arg(a); const s = st(); const id = sid(a); const prev = s.step && s.step !== id ? s.step : (x.prev && x.prev !== id ? x.prev : ''); if (s.step !== id) drop(); else setTimeout(() => restore(id), 0);
    if (prev && idx(id) > idx(prev)) sig('crs_' + prev);
    if (s.step !== id) { s.step = id; s.errs = {}; } s.last = Date.now();
    /* 과정 가이드가 켜져 있으면 가이드 단계를 흐름 단계에 맞춘다(흐름이 열린 동안 가이드 바는 숨김) */
    try { if (typeof GD === 'function') { const G = GD(); const gg = G.open && G.act === 'course' && gdG('course'); const gi = gg ? gg.steps.findIndex(z => z.crs === id) : -1; if (gi >= 0 && G.i !== gi) { const pi = prev ? gg.steps.findIndex(z => z.crs === prev) : -1; if (pi >= 0 && pi < gi && typeof gdMark === 'function') gdMark(gg, pi); G.i = gi; G.base = gdM(); } } } catch (e) { }
    setTimeout(() => { decorate(); if (!s.sam || !isOpen()) return;
      if (id === 'basic' && !s.auto.pre) { s.auto.pre = 1; done(id, 'pre'); return; }
      if ((id === 'outline' || id === 'setup') && !s.auto[id]) { s.auto[id] = 1; if (problems(id).length || id === 'outline') fill(id, { auto: true }); return; }
      if (id === 'fill' && !asked(id)) nudge(id, 'fill'); }, 80); }
  function onError(a) { const x = arg(a); const id = sid(a); const f = String(x.field || x.k || x.key || ''); const msg = String(x.msg || x.text || (Array.isArray(x.problems) ? x.problems.join(' ') : '') || '');
    const empty = x.empty === true || (x.empty !== false && /(비어|비었|입력해|넣어|적어|골라|선택해|정해)/.test(msg));
    touch(); if (empty) { setTimeout(() => nudge(id, 'empty', f), 60); return; }
    const s = st(); const k = id + ':' + (f || '*'); s.errs[k] = Math.max((s.errs[k] || 0) + 1, +x.n || 0); if (s.errs[k] >= 2) setTimeout(() => nudge(id, 'repeat', f), 60); }
  function onBack(a) { const s = st(); s.backs = Math.max(s.backs + 1, +arg(a).n || 0); touch(); if (s.backs >= 2) setTimeout(() => nudge(cur(), 'back'), 120); }
  function onCreate(a) { const x = arg(a); sig('crs_create'); drop(); Object.keys(UNDO).forEach(k => delete UNDO[k]); SAM.st = null; const c = x.course || x.c;
    if (c && c.name) audit(`과정 만들기 완료 — ${c.name}${x.d && x.d.from === 'sam' ? ' (AI SAM 대화)' : ''}`); }
  function bind() { const F = cf(); if (!F || SAM.bound || typeof F.on !== 'function') return; SAM.bound = true; F.samOwnsButton = true; /* 단계 맡기기 버튼은 이 파일이 그린다(되돌리기 · 확인 안내 포함) */
    const on = (ev, fn) => { try { F.on(ev, (...a) => { try { fn(...a); } catch (e) { console.error('crs-sam', ev, e); } }); } catch (e) { console.error(e); } };
    on('open', a => { const x = arg(a); const s = st(); if (x.resume) { s.sam = false; SAM.pre = null; } else if (x.from === 'sam') { s.sam = true; SAM.pre = x.prefill || {}; } else SAM.pre = null; });
    on('step', onStep); on('idle', a => nudge(sid(a), 'idle')); on('error', onError); on('back', onBack); on('create', onCreate);
    /* CF.open을 감싸 대화 · 가이드에서 연 흐름을 표시한다 */
    const base = F.open; F.open = (o = {}, ...r) => { if (o && o.from === 'sam') { SAM.st = null; SAM.pendSam = true; } const out = base.call(F, o, ...r); setTimeout(() => { const s = st(); if (o && o.from === 'sam') { s.sam = true; SAM.pendSam = false; } }, 0); return out; }; }
  SAM.bind = bind;
  /* 입력 활동 · 60초 무입력 감지(C1이 'idle'을 보내지 않아도 동작) */
  ['input', 'keydown', 'pointerdown', 'change'].forEach(ev => document.addEventListener(ev, e => { const R = root(); if (R && e.target && R.contains(e.target) && !e.target.closest('.csam-b')) touch(); }, true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && e.target && e.target.closest && e.target.closest('.csam-b')) { e.stopPropagation(); ACT['csam-no'](); } }, true);
  setInterval(() => { try { if (!S || !S.org) return; bind(); if (isOpen()) { decorate(); const s = st(); if (!document.hidden && Date.now() - s.last >= Math.max(SAM.idleMs, +(cf() || {}).idleMs || 0)) { s.last = Date.now(); nudge(cur(), 'idle'); } } else libTick(); } catch (e) { } }, 1000);

  /* 콘텐츠 라이브러리: 60초 동안 아무것도 안 하면 한 번만 교안 만들기를 권한다 */
  const LIB = { since: 0, asked: false };
  function libTick() { const on = typeof CUR === 'object' && CUR.tab === 'clib'; if (!on) { LIB.since = 0; return; } if (!LIB.since) LIB.since = Date.now(); if (LIB.asked || Date.now() - LIB.since < SAM.idleMs || document.hidden) return;
    const R = document.querySelector('.clb, #clib, [data-clib]'); if (!R || !shown(R)) return; LIB.asked = true; drop();
    const b = document.createElement('div'); b.className = 'csam-b'; b.setAttribute('role', 'group'); b.setAttribute('aria-label', 'AI SAM 도움');
    b.innerHTML = `<span class="orb sm" aria-hidden="true"></span><div class="csam-c"><b class="csam-n">AI SAM</b><p>${esc(MSG.lib())}</p><div class="csam-a"><button type="button" class="btn pri" data-act="csam-libdoc">${ic('spark', 16)} 교안 만들기 열기</button><button type="button" class="btn ghost" data-act="csam-no">괜찮습니다</button></div></div>`;
    const top = R.querySelector('.clb-top'); if (top) top.insertAdjacentElement('afterend', b); else R.insertAdjacentElement('afterbegin', b); live(`AI SAM: ${MSG.lib()}`); }
  document.addEventListener('pointerdown', e => { if (LIB.since && !(e.target.closest && e.target.closest('.csam-b'))) LIB.since = Date.now(); }, true);
  ACT['csam-libdoc'] = () => { drop(); if (W.CT && typeof W.CT.open === 'function') W.CT.open('doc', { from: 'lib' }); else toast('교안 만들기를 열 수 없습니다. 화면의 [교안] 카드를 눌러 주세요.', 'warn'); };

  /* ═════════ 대화로 만들기: 의도 → 미리 채움 → CF.open ═════════ */
  const CW = '(과정|교과목|강좌|강의|수업|코스|클래스|교육과정|훈련과정|프로그램)';
  const MK = new RegExp(`${CW}\\s*(을|를|도|하나|한\\s*개|1\\s*개)?\\s*(새로\\s*)?(만들|설계|개설|생성|짜\\s*줘|짜줘|짜\\s*주|구성)`);
  const MK15 = /(\d+\s*(주|차시|회차))\s*(과정|교과목|강좌)?\s*(설계|편성)/;
  const GRADE = /(초등학생|초등\s*[1-6]\s*학년|초[1-6]|중학생|중학교\s*[1-3]\s*학년|중[1-3]|고등학생|고등학교\s*[1-3]\s*학년|고[1-3]|대학생|신입생|재학생)/;
  const AUDW = /(신입\s*사원|신규\s*입사자|임직원|직장인|재직자|구직자|시니어|어르신|성인|훈련생|지역\s*주민|주민|공무원|학부모|교원|교사|강사|관리자|팀장)/;
  function parse(q) { const s = String(q || '').replace(/\s+/g, ' ').trim(); const p = { q: s };
    const ses = +(s.match(typeof SESS_RE !== 'undefined' ? SESS_RE : /(\d+)\s*(?:차시|회차|주)/) || [])[1]; if (ses) p.sessions = Math.max(1, Math.min(30, ses));
    let fee = null; try { fee = typeof aiFee === 'function' ? aiFee(s) : null; } catch (e) { } if (fee && fee.price != null && !fee.amb) p.price = fee.price;
    const am = s.match(/((?:(?:신규|신입|예비|일반|전체|초보|현직|소속)\s)?[가-힣A-Za-z0-9]+)\s*대상(?:으로|의|인)?/); const gm = s.match(GRADE); const wm = s.match(AUDW);
    p.target = (am && am[1]) || (gm && gm[1]) || (wm && wm[1]) || '';
    const qm = s.match(/[「"“'](.+?)[」"”']/); const ci = s.search(MK); let pre = qm ? qm[1] : ci > 0 ? s.slice(0, ci) : s.replace(MK15, ' ');
    pre = (typeof feeStrip === 'function' ? feeStrip(pre) : pre).replace(/((?:(?:신규|신입|예비|일반|전체|초보|현직|소속)\s)?[가-힣A-Za-z0-9]+)\s*대상(?:으로|의|인)?/, ' ').replace(typeof SESS_RE !== 'undefined' ? new RegExp(SESS_RE.source, 'g') : /x^/, ' ')
      .replace(/\d+\s*(시간|분|개|명|문항)\S*/g, ' ').replace(/(^|\s)(새로운|새로|새|신규|우리|이번|다음|기존|AI\s*로|AI로)(?=\s|$)/g, ' ').replace(/(퀴즈|과제|시험|강의\s*자료|교안|영상)\S*\s*(포함|까지|도)?/g, ' ').replace(/[,·+]/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/(?<=[가-힣A-Za-z0-9)])\s*(에다가?|에서|에|을|를|으로|로)$/, '').replace(/\s*(과정|교과목|강좌)$/, '').trim();
    if (pre.length > 40) pre = pre.slice(0, 40);
    const topic = gm && pre.startsWith(gm[1]) ? pre.slice(gm[1].length).trim() : pre;
    if (pre.length >= 2) { p.name = pre; p.topic = topic.length >= 2 ? topic : pre; }
    if (/AI\s*(로\s*)?(강의\s*)?영상|영상\S*\s*(AI|생성)/i.test(s)) p.vsrc = 'ai'; if (/강의\s*자료|교안/.test(s)) p.docs = true;
    if (/(퀴즈|시험|과제)\s*(없이|빼고)/.test(s)) { p.quiz = false; p.exam = false; p.assign = false; }
    const lv = s.match(/(입문|기초|초급|중급|고급|심화)/); if (lv) p.level = { 입문: '쉬움', 기초: '쉬움', 초급: '쉬움', 중급: '보통', 고급: '어려움', 심화: '어려움' }[lv[1]];
    if (p.name) { try { p.goal = AI.goal(p.name, p.target); } catch (e) { } }
    return p; }
  SAM.parse = parse;
  /* 과정 하나만 만드는 말인가(여러 단계 의도 · 기존 과정 편집은 아님) */
  function isOne(q) { const s = String(q || '').replace(/\s+/g, ' ').trim(); if (!s || s.length > 200) return false;
    if (!(MK.test(s) || MK15.test(s))) return false;
    const nm = s.match(/(\d+)\s*개/); if (nm && +nm[1] > 1) return false;
    if (/(홈페이지|사이트|포털|공지|초대|명단|엑셀\s*(로|파일)|csv|진단|배지|저니|로드맵|메시지|문자|보내|발송|청구|수료증|공개|게시|올려|루브릭|채점|교재|전자책|디지털북|문항\s*은행|설문|라이브|레시피|복사|삭제|지워|수정|바꿔|화면\s*열)/i.test(s) || /(학과|부서|그룹|반)\s*(을|를)?\s*(\d+\s*개\s*)?(만들|추가)/.test(s)) return false;
    try { if (typeof siPlan === 'function') { const P = siPlan(s); if (P.steps.some(x => x.did !== 'course')) return false; } } catch (e) { }
    try { if (typeof flowParse === 'function') { const F = flowParse(s); if (F && F.steps.some(f => f.id !== 'course')) return false; } } catch (e) { }
    return true; }
  SAM.isOne = isOne;
  function openFlow(q, from) { const F = cf(); if (!F) return false; const p = typeof q === 'string' ? parse(q) : (q || {}); const pre = {}; Object.keys(p).forEach(k => { if (k !== 'q' && p[k] !== '' && p[k] != null) pre[k] = p[k]; });
    /* 흐름(C1)의 자동 넣기 설정 d.auto로 옮긴다 */
    if (pre.vsrc || pre.docs || pre.quiz === false) { let A = {}; try { A = { ...((F.defaults && F.defaults().auto) || {}) }; } catch (e) { } if (pre.vsrc) A.video = pre.vsrc; if (pre.docs) A.docs = true; if (pre.quiz === false) { A.quiz = false; A.exam = false; A.assign = false; } pre.auto = A; }
    if (innerWidth <= 860 && document.getElementById('drawer') && ACT['chat-close']) { try { ACT['chat-close'](); } catch (e) { } }
    try { F.open({ from: from || 'sam', prefill: pre }); } /* 만들던 초안이 있으면 흐름이 먼저 [이어서 하기 · 새로 만들기]를 묻는다(평가 1회차 5번) */ catch (e) { console.error(e); toast('과정 만들기 화면을 열지 못했습니다. [+ 만들기]를 눌러 주세요.', 'warn'); return false; }
    audit(`AI SAM 과정 만들기 열기 — ${pre.name || '이름 미정'}`); return true; }
  SAM.open = openFlow;
  ACT['csam-open'] = el => openFlow(el.dataset.v || '', 'sam');
  const card = q => { const p = parse(q); const n = p.sessions || (U() ? 15 : 6); const unit = U() ? '주' : '차시';
    const got = [p.name ? `이름 「${p.name}」` : '', p.target ? `대상 ${p.target}` : '', `${n}${unit}`, p.price ? `수강료 ${won(p.price)}` : ''].filter(Boolean).join(' · ');
    return { title: `${T('cls')} 만들기`, text: `${T('cls')} 만들기 화면을 열고 말씀하신 내용(${got})을 미리 채워 두었습니다. 화면에서 확인만 하고 [다음]을 누르세요. 막히면 [AI SAM에게 맡기기]를 누르면 됩니다.${p.name ? '' : `\n이름은 비어 있습니다. 예: 「${sugg()[0]}」`}`, btn: { act: 'csam-open', v: q, label: `${T('cls')} 만들기 화면 열기` }, via: 'AI SAM' }; };
  /* 흐름이 열려 있을 때 대화창에서 '이 단계 채워줘' · '어려워요' */
  function inFlow(q) { if (!isOpen()) return null; const s = String(q || ''); const id = cur(); if (!id) return null; const ti = title(id);
    if (/(채워|맡길|맡겨|대신|알아서|써\s*줘|만들어\s*줘)/.test(s) && /(이|지금|여기|이번)\s*(단계|칸|화면)|여기|알아서|대신/.test(s)) return { a: { text: `${jo(`「${ti}」`, '을')} 채웠습니다. ${T('cls')} 만들기 화면에서 확인만 해 주세요.`, via: 'AI SAM' }, run: () => fill(id) };
    if (/(어려|모르겠|막혔|막혀|헷갈|뭘\s*해야|어떻게\s*해|도와)/.test(s)) { const P = problems(id);
      return { a: { text: `지금은 「${ti}」 단계입니다.${P.length ? `\n남은 일: ${P.slice(0, 3).map(x => typeof x === 'string' ? x : (x && (x.msg || x.text)) || '').filter(Boolean).join(' · ')}` : '\n지금 단계는 채워져 있습니다. [다음]을 누르면 됩니다.'}\n버튼 하나로 제가 대신 채울 수 있습니다.`, btn: { act: 'csam-do', v: id, label: '이 단계 AI SAM에게 맡기기' }, via: 'AI SAM' } }; }
    return null; }
  /* 규칙 엔진 대화(Claude 미연결): 기관별 처리기 · 계획 엔진보다 먼저 잡는다 */
  { const base = chatSend; chatSend = (q, ...r) => { const s0 = String(q || '').trim().slice(0, 300); let hit = null;
      try { if (s0 && S && S.org && cf() && !(typeof CL !== 'undefined' && CL.on && CL.on('chat'))) { const f = inFlow(s0); if (f) hit = f; else if (isOne(s0)) hit = { a: card(s0), run: () => openFlow(s0, 'sam') }; } } catch (e) { console.error(e); hit = null; }
      if (!hit) return base(q, ...r);
      const s = typeof samMask === 'function' ? samMask(s0).text : s0; sig('chat');
      if (CUR.ws !== 'home' && !$('#drawer') && ACT['chat-open'] && innerWidth > 860) ACT['chat-open']();
      S.chat.push({ role: 'user', text: s }); S.chat.push({ role: 'ai', ...hit.a }); try { S.ai.usage++; } catch (e) { } S.chat = S.chat.slice(-60); save(); renderThreads();
      setTimeout(() => { try { hit.run(); } catch (e) { console.error(e); } }, 250); }; }
  /* answer를 직접 부르는 곳(Claude run_studio_command · 칩): 화면을 열지 않고 열기 버튼 카드만. 흐름 카드의 [마법사에서 직접 조정]도 새 흐름으로 */
  { const base = answer; answer = (q, ...r) => { const s = String(q || '').trim(); try { if (s && S && S.org && cf() && isOne(s)) return card(s); } catch (e) { console.error(e); }
      const a = base(q, ...r); try { if (a && a.btn && a.btn.act === 'ai-design' && cf()) a.btn = { act: 'csam-open', v: s, label: `${T('cls')} 만들기 화면에서 조정` }; } catch (e) { } return a; }; }
  /* Claude 도구 create_courses: 과정 1개면 계획 카드 대신 미리 채운 흐름을 연다(여러 개는 기존 계획 카드) */
  if (typeof agRun === 'function') { const base = agRun; agRun = (name, x, ctx) => { if (name !== 'create_courses' || !cf()) return base(name, x, ctx);
      const L = (Array.isArray((x || {}).courses) ? x.courses : []).filter(c => c && String(c.name || '').trim()); if (L.length !== 1) return base(name, x, ctx);
      const c = L[0]; const pr = { name: String(c.name).trim().slice(0, 60), topic: String(c.name).trim().slice(0, 60), sessions: Math.max(1, Math.min(30, +c.weeks || (U() ? 15 : 6))), target: String(c.target || '').slice(0, 60), goal: String(c.goal || '').slice(0, 160) };
      const pz = Math.max(0, Math.round(+String(c.price ?? 0).replace(/[^\d.]/g, '') || 0)); if (pz) pr.price = pz; if (Array.isArray(c.week_topics) && c.week_topics.length) pr.outline = c.week_topics.slice(0, 30).map(v => ({ title: String(v).slice(0, 60) }));
      ctx.cards.push({ title: `${T('cls')} 만들기`, text: `「${pr.name}」 ${pr.sessions}${U() ? '주' : '차시'}로 ${T('cls')} 만들기 화면을 미리 채워 열었습니다. 화면에서 확인하고 [개설하기]를 누르면 만들어집니다.`, btn: { act: 'csam-open', v: `${pr.name} ${pr.sessions}${U() ? '주' : '차시'} ${T('cls')} 만들어줘`, label: `${T('cls')} 만들기 화면 열기` }, via: 'AI SAM' });
      ctx.after.push(() => openFlow(pr, 'sam'));
      return { ok: true, 승인필요: false, 결과: `과정 만들기 화면을 미리 채워 열었습니다(사용자가 단계마다 확인 후 [개설하기]로 생성). 계획 카드는 만들지 않았습니다.` }; }; }

  /* ═════════ guide.js 'course' 가이드 — 새 흐름 5단계와 맞춤 ═════════ */
  if (typeof GUIDES !== 'undefined' && Array.isArray(GUIDES)) {
    const ex = () => ({ k12: '중2 수학 6차시', univ: 'AI 리터러시 15주', corp: '신규 입사자 온보딩 4차시', public: '디지털 역량 기초 6차시', lifelong: '스마트폰 활용 8차시', voc: '웹개발 실무 10차시' })[ty()] || '엑셀 실무 6차시';
    const g = GUIDES.find(x => x.id === 'course');
    if (g) { g.title = () => `${T('cls')} 만들기 — 5단계 따라 하기`; g.mins = 10; g.desc = () => '무엇을 · 누구에게 → 차시 목록 → 차시 채우기 → 수강 설정 → 미리보기 · 개설. 막히면 AI SAM이 먼저 도와줍니다.';
      g.steps = [
        { crs: 'basic', t: '① 무엇을 · 누구에게', d: () => `${T('cls')} 이름과 대상만 정합니다. 예: "${ex()}". 모르면 [AI SAM에게 맡기기]를 누르세요.`, go: 'class', ask: () => `${ex()} ${T('cls')} 만들어줘`, done: { inc: 'crs_basic' } },
        { crs: 'outline', t: '② 차시 목록', d: 'AI SAM이 만든 차시 제목을 읽어 보고, 고칠 곳만 고칩니다. 차시를 더하거나 빼도 됩니다.', go: 'class', done: { inc: 'crs_outline' } },
        { crs: 'fill', t: '③ 차시 채우기', d: '차시마다 영상 · 교안 · 퀴즈를 넣습니다. 파일 올리기 · AI로 만들기 · 라이브러리에서 가져오기 중 고릅니다. 나중에 해도 됩니다.', go: 'class', done: { inc: 'crs_fill' } },
        { crs: 'setup', t: '④ 수강 설정', d: '수강 기간 · 수강료 · 수료 기준을 정합니다. 기본값 그대로 두어도 됩니다.', go: 'class', done: { inc: 'crs_setup' } },
        { crs: 'open', t: '⑤ 미리보기 · 개설', d: `${T('learner')}에게 보이는 모습을 확인하고 [개설하기]를 누릅니다.`, go: 'class', done: { inc: 'crs_create' } }]; }
    const s0 = GUIDES.find(x => x.id === 'start'); const s3 = s0 && s0.steps.find(x => x.done && x.done.inc === 'classes');
    if (s3) s3.d = () => `${T('cls')} 만들기 화면이 5단계로 안내합니다. "${ex()} ${T('cls')} 만들어줘"처럼 말하면 AI SAM이 미리 채워 두고, 확인만 하면 됩니다.`;
    const tn = GUIDES.find(x => x.id === 't-new'); if (tn && tn.steps[0]) tn.steps[0].d = () => `"${ex()} ${T('cls')} 만들어줘"처럼 말하면 ${T('cls')} 만들기 화면이 미리 채워진 채로 열립니다. 단계마다 확인하고 [다음]을 누릅니다.`;
    /* 가이드의 [이 화면 열기] · [AI에게 맡기기]: 과정 가이드는 흐름의 해당 단계를 연다 · 그 단계를 채운다 */
    if (typeof gdOpenStep === 'function' && typeof GD === 'function') { const base = gdOpenStep; gdOpenStep = (...a) => { try { const G0 = GD(); const gg = gdG(G0.act); const stp = gg && gg.steps[G0.i];
          if (gg && gg.id === 'course' && stp && stp.crs && cf()) { if (!isOpen()) { cf().open({ from: 'guide', step: stp.crs }); } else if (cur() !== stp.crs && typeof cf().go === 'function') cf().go(stp.crs); setTimeout(() => { try { gdBar(); } catch (e) { } }, 160); return; } } catch (e) { console.error(e); }
        return base(...a); }; }
    if (ACT['gd-ask']) { const base = ACT['gd-ask']; ACT['gd-ask'] = (...a) => { try { const G0 = GD(); const gg = gdG(G0.act); const stp = gg && gg.steps[G0.i]; if (gg && gg.id === 'course' && stp && stp.crs && isOpen()) { fill(cur() || stp.crs); return; } } catch (e) { } return base(...a); }; }
  }

  /* 스타일(DDS 토큰) — 큰 글자 16px · 버튼 48px · 휴대폰에서 줄바꿈 */
  const css = `.csam-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.csam-b{display:flex;gap:12px;align-items:flex-start;margin:12px 0;padding:14px 16px;border:1px solid var(--s200,#C9D1FC);border-radius:12px;background:var(--s50,#F3F5FF);color:var(--g900,#111);font-size:16px;line-height:1.55;animation:csamIn .22s ease-out}
.csam-b.ok{border-color:var(--g200,#e5e5e5);background:var(--paper,#fff)}.csam-b.busy{opacity:.85}
.csam-b .csam-c{flex:1;min-width:0}.csam-b .csam-n{display:block;font-size:13px;color:var(--s600,#4257D7);margin-bottom:2px}.csam-b p{margin:0;font-size:16px;overflow-wrap:anywhere}
.csam-a{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.csam-a .btn{min-height:48px;padding:0 18px;font-size:16px}.csam-a .btn.ghost{border:1px solid var(--g300,#d4d4d4);background:var(--paper,#fff)}
.csam-do{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:8px 0 12px}.csam-dobtn{min-height:48px;padding:0 18px;font-size:16px;border-color:var(--s300,#A5B0FA);color:var(--s700,#3B48B5);background:var(--paper,#fff)}
.csam-dobtn:hover{background:var(--s50,#F3F5FF)}.csam-dohint{font-size:14px;color:var(--g600,#666)}
body.cf-on #gdBar{display:none} /* 과정 만들기 흐름이 열려 있으면 가이드 바가 [다음] 버튼을 가리지 않게 숨긴다(흐름 진행 표시가 같은 5단계) */
@keyframes csamIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.csam-b{animation:none}}
@media (max-width:600px){.csam-b{padding:12px}.csam-a .btn{flex:1 1 110px;padding:0 12px}.csam-dobtn{width:100%;justify-content:center}}`;
  const el = document.createElement('style'); el.id = 'csam-css'; el.textContent = css; (document.head || document.documentElement).appendChild(el);
  if (typeof COVER !== 'undefined') COVER.push(['[v35] 과정 만들기 AI SAM 도우미: 막힘 감지 말풍선 · 단계 맡기기 · 대화로 만들기', 'class', '']);
})();
