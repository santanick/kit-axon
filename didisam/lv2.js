/* v46 Ver2 학습자 — ① 과제별 AI 레벨 표시 ② 힌트 사다리 5단계 + 먼저 시도 잠금 ⑨ 나의 비전 · 목표(규칙 대화 v1)
   기관 정책 SITE().aipol.on 이 true일 때만 동작한다. 꺼져 있으면(기존 기관 · aipol 없음) 모든 감싸기는 원래 결과를 그대로 돌려준다.
   공통 계약: window.LV2 = { on(), levelOf(item), hintState(itemKey), label(lvl), ctx() }
   - 항목 레벨: item.ai.lvl → 기관 프리셋(aipol.preset.exam|assign, 없으면 시험 L0) → aipol.lvl → 'L1'
   - 힌트 상태: lp.hint['<cls>/<item>'] = { step, tries:[{ n, len, at, s }], last(600자 · 가림), selfExp, sx(600자 · 가림) }
   - 비전: lp.vision = { card:{ who, why, how }, txt, goals:[{ t, by, done }], at, step, skip, share }
   - 운영 서버 튜터 요청에는 item:{ key, lvl } · hint:{ step, attempt } 를 덧붙이고(서버가 최종 판정), 데모는 aiguard.js가 같은 규칙으로 막는다.
   - 학습 이벤트는 window.LEV(D1)가 있을 때만, 글 원문 없이 길이 · 단계만 보낸다. */
(function () {
  'use strict';
  const LV = { L0: ['끄기', '이 과제는 AI 없이 풀어요'], L1: ['코치', '힌트와 질문으로 도와줘요'], L2: ['파트너', '내 초안에 의견을 줘요'], L3: ['에이전트', '맡기고, 꼭 검증해요'] };
  const STEPN = ['', '개념 질문', '방향 힌트', '부분 예시', '반례', '풀이'];
  const ASSESS = ['assign', 'quiz', 'exam', 'practice', 'prac', 'lab', 'reflect', 'project'];
  const site = () => { try { return typeof SITE === 'function' ? SITE() : null; } catch (e) { return null; } };
  const pol = () => { try { const s = typeof LR === 'object' && LR ? LR.site : null; return (s && s.aipol) || null; } catch (e) { return null; } }; /* 꺼짐 판정은 게시본 원본만 본다(정규화 호출 없음) */
  const on = () => { const p = pol(); return !!(p && p.on === true); };
  const okL = v => Object.prototype.hasOwnProperty.call(LV, v);
  function levelOf(it) {
    if (!it) return 'L1'; const P = pol() || {}; if (it.ai && okL(it.ai.lvl)) return it.ai.lvl;
    const kind = it.type === 'exam' ? 'exam' : 'assign'; const pre = P.preset && P.preset[kind];
    if (okL(pre)) return pre; if (kind === 'exam') return 'L0'; return okL(P.lvl) ? P.lvl : 'L1';
  }
  const label = l => (LV[l] || LV.L1)[0];
  const solOk = it => !!(it && it.ai && (it.ai.sol || it.ai.reveal));
  const emit = (v, o, x) => { try { window.LEV && LEV.emit(v, o, x); } catch (e) { } };
  const save = () => { try { LR.api.save(); } catch (e) { } };
  const red = s => { const t = String(s || ''); try { return window.AIG ? AIG.redact(t).text : t; } catch (e) { return t; } };
  const bare = s => String(s || '').replace(/\s+/g, '');

  /* ── 지금 보는 항목 ── */
  function here() {
    if (!on() || typeof ltWhere !== 'function') return null; let w; try { w = ltWhere(); } catch (e) { return null; }
    if (!w || w.k !== 'cls' || !w.c || !w.it) return null; const it = w.it; if (!(ASSESS.includes(it.type) || it.ai)) return null;
    return { c: w.c, it, key: `${w.c.id}/${it.id}`, lvl: levelOf(it), exam: it.type === 'exam' };
  }
  function hintState(key) {
    if (!LR.lp) return { step: 0, tries: [] }; const H = LR.lp.hint = LR.lp.hint && typeof LR.lp.hint === 'object' ? LR.lp.hint : {};
    const s = H[key] = H[key] && typeof H[key] === 'object' ? H[key] : {}; s.step = Math.max(0, Math.min(5, +s.step || 0)); s.tries = Array.isArray(s.tries) ? s.tries.slice(-20) : []; return s;
  }

  /* ── 잠금 규칙(공통 규칙 1-4) ── */
  const minLen = lvl => (lvl === 'L2' || lvl === 'L3' ? 10 : 20);
  function sim(a, b) { a = bare(a).slice(0, 600); b = bare(b).slice(0, 600); if (!a || !b) return 0; if (a === b) return 1;
    let p = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { const q = [i]; for (let j = 1; j <= b.length; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; }
    return 1 - p[b.length] / Math.max(a.length, b.length); }
  const CACHE = {}; /* 이 화면에서 받은 힌트 문장(대화 원문은 저장하지 않음) */
  function aiText(key) { const A = Object.values(CACHE[key] || {}).map(x => x.t); try { (LT.msgs || []).forEach(m => { if (!m.me && m.t) A.push(m.t); }); } catch (e) { } return bare(A.join('')); }
  function copied(t, key) { const s = bare(t); const A = aiText(key); if (s.length < 30 || !A) return false; for (let i = 0; i + 30 <= s.length; i++) if (A.includes(s.slice(i, i + 30))) return true; return false; }
  function checkTry(t, st, lvl, key) {
    const n = bare(t).length; const m = minLen(lvl);
    if (n < m) return `시도를 조금 더 적어 주세요(${m}자 이상).`;
    if (st.last && sim(t, st.last) >= 0.9) return '앞의 시도와 거의 같아요. 바꾼 부분을 적어 주세요.';
    if (copied(t, key)) return 'AI가 보낸 문장을 그대로 옮긴 글은 시도로 세지 않아요. 내 말로 적어 주세요.';
    return '';
  }
  function canOpen(st, k, lvl, it) {
    if (lvl === 'L0') return '이 과제는 AI 없이 풀어요';
    if (k <= st.step) return ''; if (k !== st.step + 1) return '앞 단계를 먼저 열어 주세요.';
    if (it && it.ai && it.ai.reveal) return '';
    if (k === 5) { if (!solOk(it)) return '풀이는 선생님이 허용한 과제에서만 볼 수 있어요.'; if (lvl !== 'L3' && !st.selfExp) return '풀이를 보기 전에, 지금까지 어떻게 풀었는지 적어 주세요.'; return ''; }
    if (lvl === 'L3' || k === 1) return '';
    const need = k === 2 ? 0 : k - 1; return st.tries.some(x => (+x.s || 0) >= need) ? '' : '먼저 내 생각을 적어 주세요. 그래야 다음 힌트가 열려요.';
  }

  /* ── 힌트 문장: 운영은 서버 게이트웨이, 데모는 브라우저 키(aiguard가 단계 지시 · 잠금), 없거나 실패하면 규칙 문장 ── */
  function ruleHint(k, it, v) {
    const t = `「${it.title}」`; const R = {
      1: [`${t}에서 꼭 써야 하는 핵심 개념은 무엇일까요? 그 개념을 한 문장으로 설명해 보세요.`, `${t}이 묻는 것을 내 말로 한 줄로 바꿔 보세요. 어떤 개념이 필요해 보이나요?`],
      2: ['요구사항을 작은 조각으로 나눠 보세요. 내 시도에서 아직 다루지 않은 조각부터 보면 좋아요.', '내 시도의 첫 문장과 과제가 묻는 것을 나란히 놓고, 어긋나는 곳이 어디인지 찾아보세요.'],
      3: ['비슷한 문제라면 이렇게 시작할 수 있어요. ① 무엇을 구하는지 한 줄로 쓰기 ② 쓸 수 있는 근거 · 자료 고르기 ③ … 그다음은 직접 이어 가 보세요.', '예시의 앞부분만 보여 드려요. 「먼저 조건을 정리하면, 첫째 … 둘째 …」 — 나머지는 내 과제에 맞게 채워 보세요.'],
      4: ['내 시도가 맞지 않는 경우를 떠올려 보세요. 조건이 반대일 때, 값이 아주 크거나 작을 때도 그대로 성립하나요?', '내 결론을 거꾸로 적용해 보세요. 예외가 하나라도 있으면 어느 부분을 고쳐야 할까요?'],
      5: [it.ai && it.ai.solTxt ? String(it.ai.solTxt) : '선생님이 등록한 풀이가 아직 없어요. 선생님께 질문을 넘겨 확인해 보세요.'] };
    const L = R[k] || R[1]; return L[(v || 0) % L.length];
  }
  let CTX = null; /* 지금 보내는 튜터 요청의 항목 · 힌트 맥락(데모 aiguard · 운영 요청 본문에 사용) */
  async function gen(h, k, st, v, prev) {
    CTX = { lvl: h.lvl, sol: solOk(h.it), reveal: !!(h.it.ai && h.it.ai.reveal), selfExp: !!st.selfExp, item: { key: h.key, lvl: h.lvl }, hint: { step: k, cur: prev, tries: st.tries.map(x => +x.s || 0), attempt: st.last ? bare(st.last).length : 0 } };
    const q = `[힌트 ${k}단계 · ${STEPN[k]}] 「${h.it.title}」${st.last ? `\n내 최근 시도: ${st.last}` : ''}${k === 5 && st.sx ? `\n내 자기 설명: ${st.sx}` : ''}`;
    try {
      const C = TCFG(); const lim = +C.daily || 20; if (typeof ltUsed === 'function' && ltUsed() >= lim) throw Object.assign(new Error('quota'), { status: 429 });
      const a = await ltAI(q); if (a && a.t) { if (typeof ltUse === 'function') ltUse(); return { t: a.t, ai: 1 }; }
      return { t: ruleHint(k, h.it, v) };
    } catch (e) { if (e && (e.status === 409 || e.code === 'hint_locked')) return { t: '먼저 내 생각을 적어 주세요. 그래야 다음 힌트가 열려요.', lock: 1 }; return { t: ruleHint(k, h.it, v), fb: 1 }; }
    finally { CTX = null; }
  }

  /* ── 운영: 서버 튜터 요청에 항목 · 힌트를 덧붙인다(정책 켜진 기관만) ── */
  { const _f = window.fetch.bind(window); window.fetch = function (input, init) {
    try { const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (on() && /\/api\/pub\/[^/]+\/tutor$/.test(url) && init && typeof init.body === 'string') { const b = JSON.parse(init.body); const h = here();
        if (h) { b.cls = h.c.id; b.item = CTX ? CTX.item : { key: h.key, lvl: h.lvl }; if (CTX && CTX.hint) b.hint = { step: CTX.hint.step, attempt: CTX.hint.attempt }; init = { ...init, body: JSON.stringify(b) }; } } } catch (e) { }
    return _f(input, init); }; }

  /* ── ① 과제 화면 맨 위 레벨 띠 ── */
  function bannerHTML(it) {
    const lvl = levelOf(it); const P = pol() || {}; const dflt = !(it.ai && okL(it.ai.lvl)); const why = it.ai && it.ai.why ? String(it.ai.why).slice(0, 120) : '';
    const head = lvl === 'L0' ? LV.L0[1] : `이 과제의 AI: ${label(lvl)}`; const sub = lvl === 'L0' ? (why || (it.type === 'exam' ? '시험 중에는 AI 튜터와 질문 넘기기를 쓸 수 없어요.' : '막히면 선생님께 질문을 넘길 수 있어요.')) : (why || LV[lvl][1]);
    const btn = lvl === 'L0' ? (it.type === 'exam' ? '' : `<button type="button" class="v2-aib-b" data-v2="esc0">선생님께 질문 넘기기</button>`) : `<button type="button" class="v2-aib-b pri" data-v2="ladder">${lvl === 'L3' ? 'AI에게 맡기기' : '힌트 받기'}</button>`;
    return `<div class="v2-aib" data-lvl="${lvl}" role="note"><span class="v2-i2" aria-hidden="true">${ico(lvl === 'L0' ? 'lock' : 'spark', 17)}</span><div class="v2-aib-t"><b>${esc(head)}${dflt ? `<em class="v2-dflt">기관 기본: ${esc(label(lvl))}</em>` : ''}</b><span>${esc(sub)}</span>${P.evalNotice && lvl !== 'L0' ? '<small>이 과제에서 AI와 나눈 대화는 평가에 참고될 수 있어요.</small>' : ''}</div>${btn}</div>${lvl === 'L0' && it.type !== 'exam' ? '<form class="v2-esc0" hidden><label for="v2e0" class="sr">선생님께 넘길 질문</label><textarea id="v2e0" rows="2" maxlength="400" placeholder="예: 2번 요구사항을 어떻게 이해하면 될까요?"></textarea><button type="submit" class="v2-aib-b pri">보내기</button></form>' : ''}`;
  }
  if (typeof viewCourse === 'function') { const base = viewCourse; viewCourse = function (id, itemId) { /* eslint-disable-line no-global-assign */
    const h = base.apply(this, arguments); try { if (!on() || !LR.me) return h; const c = (site().classes || []).find(x => x.id === id); if (!c) return h;
      const m = /<div class="imain">[\s\S]*?<\/h2>/.exec(h); if (!m) return h; const r = ((LR.lp.cls || {})[c.id] || { items: {} }).items || {};
      const isL = x => x && x.type !== 'chapter'; let it = c.items.find(x => x.id === itemId) || c.items.find(x => isL(x) && !(r[x.id] || {}).done) || c.items.find(isL); if (it && !isL(it)) it = c.items.slice(c.items.indexOf(it) + 1).find(isL) || it;
      if (!it || !(ASSESS.includes(it.type) || it.ai)) return h; const at = m.index + m[0].length; return h.slice(0, at) + bannerHTML(it) + h.slice(at);
    } catch (e) { console.error('lv2 banner', e); return h; } }; }

  /* ── ② 튜터 패널: 힌트 사다리 ── */
  const UI = { mode: '', key: '', msg: '', note: '', busy: 0, v: {} };
  function ladderHTML(h) {
    const st = hintState(h.key); const C = CACHE[h.key] || {}; const lvl = h.lvl; const sol = solOk(h.it);
    const rows = [1, 2, 3, 4, 5].map(k => { const open = k <= st.step; const cur = k === st.step; const why = open ? '' : canOpen(st, k, lvl, h.it); const nx = k === st.step + 1;
      const cls = open ? (cur ? 'cur' : 'done') : 'lk' + (nx ? ' nx' : '');
      const body = open ? (C[k] ? `<div class="v2-box">${nl(C[k].t)}</div>${C[k].fb ? '<p class="v2-fb">지금은 기본 힌트를 보여 드려요</p>' : ''}<button type="button" class="v2-lk" data-v2="again" data-k="${k}">다른 표현으로 다시 보기</button>` : `<button type="button" class="v2-lk" data-v2="open" data-k="${k}">이 단계 다시 보기</button>`)
        : nx ? (why ? `<p>${esc(why)}</p>` : `<button type="button" class="v2-open" data-v2="open" data-k="${k}">${k === 1 ? '힌트 받기' : '다음 힌트 열기'}</button>`) : k === 5 ? '<p>선생님이 허용한 과제만</p>' : '';
      return `<li class="v2-st ${cls}"><span class="v2-s" aria-hidden="true">${open && !cur ? ico('check', 15) : open ? k : ico('lock', 14)}</span><div class="v2-t"><b>${k} · ${STEPN[k]}${cur ? ' <em>지금</em>' : ''}${!open ? '<span class="sr">(잠김)</span>' : ''}</b>${body}</div></li>`; }).join('');
    const sx = st.step >= 4 && sol && !st.selfExp && lvl !== 'L3';
    return `<section class="v2-lad" aria-label="힌트 사다리"><div class="v2-lh"><b>힌트 사다리</b><small>${st.step ? `${st.step}단계까지 열렸어요` : '어디서 막혔나요? 먼저 내 생각을 적어 주세요.'}</small><span class="v2-cnt">${st.step} / 5</span></div>
      <ol class="v2-steps">${rows}</ol>
      <p class="v2-log">${ico('clock', 15)} 지금까지 시도 ${st.tries.length}번 · 힌트 ${st.step}단계. 이 기록은 내 학습 과정으로 선생님께 보여요.</p>
      ${UI.msg ? `<p class="v2-msg" role="status">${esc(UI.msg)}</p>` : ''}
      <form class="v2-try" data-v2f="${sx ? 'sx' : 'try'}"><label for="v2t">${sx ? '자기 설명 적기 · 지금까지 어떻게 풀었는지' : '내 시도 적기'}</label><div class="v2-tb"><textarea id="v2t" rows="2" maxlength="${sx ? 1000 : 2000}" placeholder="${sx ? '풀이를 보기 전에, 지금까지 어떻게 풀었는지 적어 주세요.' : '먼저 내 생각을 적어 주세요. 그래야 다음 힌트가 열려요.'}">${esc(UI.v[h.key] || '')}</textarea><button type="submit" aria-label="${sx ? '자기 설명 보내기' : '내 시도 보내기'}" ${UI.busy ? 'disabled' : ''}>${ico('send', 18)}</button></div>
      <div class="v2-ft"><span>${sx ? '50자 이상 적으면 풀이가 열려요' : `${minLen(lvl)}자 이상 · ${st.step < 4 ? `보내면 ${Math.min(4, st.step + 1)}단계를 열 수 있어요` : '내 시도는 선생님께 보여요'}`}</span><button type="button" class="v2-esc" data-v2="esc">선생님께 질문 넘기기</button></div></form>
      ${UI.busy ? '<p class="v2-busy" role="status"><span class="lt-dots"><i></i><i></i><i></i></span> 힌트를 준비하고 있어요</p>' : ''}</section>`;
  }
  const RETAIN = { term: '대화는 개인정보를 가리고 이번 학기 동안 보관해요', year: '대화는 개인정보를 가리고 1년 동안 보관해요' };
  if (typeof ltRender === 'function') { const base = ltRender; ltRender = function () { /* eslint-disable-line no-global-assign */
    const r = base.apply(this, arguments); try { if (!on()) return r; const R = document.getElementById('ltut'); if (!R) return r; const P = pol();
      const note = R.querySelector('.lt-note'); if (note && RETAIN[P.retain]) note.innerHTML = note.innerHTML.replace('대화는 저장하지 않아요', RETAIN[P.retain]);
      const h = LR.me ? here() : null; R.hidden = !!(h && h.lvl === 'L0'); if (R.hidden && LT.open) { LT.open = false; document.body.classList.remove('lt-on', 'lt-dock'); }
      const pan = R.querySelector('.lt-panel'); if (!pan || !h || h.lvl === 'L0') { UI.mode = ''; return r; }
      if (UI.key !== h.key) { UI.key = h.key; UI.mode = 'lad'; UI.msg = ''; }
      const hd = pan.querySelector('.lt-hd small'); if (hd) hd.insertAdjacentHTML('beforeend', ` <span class="v2-pill" data-lvl="${h.lvl}">이 과제의 AI: ${esc(label(h.lvl))}</span>`);
      pan.querySelector('.lt-hd').insertAdjacentHTML('afterend', `<div class="v2-tabs" role="tablist"><button type="button" role="tab" data-v2="mode" data-v="lad" aria-selected="${UI.mode === 'lad'}">힌트 사다리</button><button type="button" role="tab" data-v2="mode" data-v="chat" aria-selected="${UI.mode !== 'lad'}">대화</button></div>`);
      if (UI.mode === 'lad') { pan.classList.add('v2-lmode'); pan.querySelector('.v2-tabs').insertAdjacentHTML('afterend', ladderHTML(h)); const ta = pan.querySelector('#v2t'); if (ta && UI.focus) { ta.focus(); UI.focus = 0; } }
    } catch (e) { console.error('lv2 ladder', e); } return r; }; }
  /* L0 항목에서는 질문 넘기기 외 튜터 질문을 받지 않는다(시험 L0는 넘기기도 막음) */
  if (typeof ltAsk === 'function') { const base = ltAsk; ltAsk = function (q, opts) { /* eslint-disable-line no-global-assign */
    try { const h = on() && LR.me ? here() : null; if (h && h.lvl === 'L0' && (!(opts && opts.esc) || h.exam)) { toast(h.exam ? '시험 중에는 AI 튜터를 쓸 수 없어요.' : '이 과제는 AI 없이 풀어요. 막히면 선생님께 질문을 넘겨 주세요.'); return; } } catch (e) { }
    return base.apply(this, arguments); }; }

  async function openStep(h, k, again) {
    const st = hintState(h.key); const why = canOpen(st, k, h.lvl, h.it); if (why) { UI.msg = why; ltRender(); return; } const prev = st.step;
    if (k > st.step) { st.step = k; save(); emit('hint', { cls: h.c.id, item: h.it.id, lvl: h.lvl }, { step: k }); }
    const C = CACHE[h.key] = CACHE[h.key] || {}; if (C[k] && !again) { UI.msg = ''; ltRender(); return; }
    UI.busy = 1; UI.msg = ''; ltRender(); UI.v[h.key + '#v' + k] = (UI.v[h.key + '#v' + k] || 0) + (again ? 1 : 0);
    const g = await gen(h, k, st, UI.v[h.key + '#v' + k], prev); UI.busy = 0; if (g.lock) UI.msg = g.t; else C[k] = g; ltRender();
  }
  function submitTry(h, t, kind) {
    const st = hintState(h.key); t = String(t || '').trim();
    if (kind === 'sx') { if (bare(t).length < 50) { UI.msg = '풀이를 보기 전에, 지금까지 어떻게 풀었는지 적어 주세요(50자 이상).'; ltRender(); return; }
      st.selfExp = true; st.sx = red(t).slice(0, 600); save(); emit('reflect', { cls: h.c.id, item: h.it.id, lvl: h.lvl }, { len: bare(t).length }); UI.v[h.key] = ''; UI.msg = '자기 설명을 받았어요. 이제 풀이를 열 수 있어요.'; ltRender(); return; }
    const bad = checkTry(t, st, h.lvl, h.key); if (bad) { UI.v[h.key] = t; UI.msg = bad; UI.focus = 1; ltRender(); return; }
    st.tries.push({ n: st.tries.length + 1, len: bare(t).length, at: nowISO(), s: st.step }); st.tries = st.tries.slice(-20); st.last = red(t).slice(0, 600); save();
    emit('attempt', { cls: h.c.id, item: h.it.id, lvl: h.lvl }, { len: bare(t).length, n: st.tries.length });
    UI.v[h.key] = ''; const nx = st.step + 1; UI.msg = nx <= 4 && !canOpen(st, nx, h.lvl, h.it) ? `시도를 받았어요. 이제 ${nx}단계를 열 수 있어요.` : '시도를 받았어요.'; ltRender();
  }
  document.addEventListener('input', e => { if (e.target && e.target.id === 'v2t' && UI.key) UI.v[UI.key] = e.target.value; });
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-v2]'); if (!el || !on()) return; const k = el.dataset.v2; e.preventDefault(); e.stopPropagation();
    if (k === 'esc0') { const f = document.querySelector('.v2-esc0'); if (f) { f.hidden = !f.hidden; if (!f.hidden) f.querySelector('textarea').focus(); } return; }
    if (k === 'vis') return visOpen(true);
    const h = here(); if (!h) return;
    if (k === 'ladder') { UI.key = h.key; UI.mode = 'lad'; UI.focus = 1; if (!LT.open) ltOpen(); else ltRender(); return; }
    if (k === 'mode') { UI.mode = el.dataset.v === 'lad' ? 'lad' : 'chat'; ltRender(); return; }
    if (k === 'esc') { UI.mode = 'chat'; LT.escNext = true; ltRender(); setTimeout(() => { const q = document.getElementById('ltq'); if (q) q.focus(); }, 30); return; }
    if (k === 'open' || k === 'again') { if (!UI.busy) openStep(h, +el.dataset.k, k === 'again'); }
  }, true);
  document.addEventListener('submit', e => { const f = e.target; if (!on()) return;
    if (f.classList && f.classList.contains('v2-esc0')) { e.preventDefault(); const t = f.querySelector('textarea').value.trim(); if (!t) return toast('넘길 질문을 먼저 적어 주세요.'); const r = ltEscalate(t); f.querySelector('textarea').value = ''; f.hidden = true; toast(r.t.split('\n')[0], 'ok'); return; }
    if (f.classList && f.classList.contains('v2-try')) { e.preventDefault(); const h = here(); if (h) submitTry(h, f.querySelector('textarea').value, f.dataset.v2f); }
  }, true);
  document.addEventListener('keydown', e => { if (e.target && e.target.id === 'v2t' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); } });

  /* ── ⑨ 나의 비전 · 목표(6단계 규칙 대화, 학습자만 수정 · 기본 비공개) ── */
  const VQ = [
    { q: '반가워요! 이번 학기를 시작하기 전에, 함께 나만의 비전을 만들어 볼까요?', a: '' },
    { q: '먼저 나를 알려 주세요. 좋아하는 것이나 잘하는 것은 무엇인가요?', k: 'how', ph: '예: 사람들 이야기를 듣고 정리하는 걸 좋아해요', ack: '좋아요. 그 강점을 비전 카드에 담았어요.' },
    { q: '1년 뒤, 어떤 모습이 되어 있으면 좋겠어요?', k: 'who', ph: '예: 데이터로 우리 동아리 문제를 푸는 사람', ack: '멋져요! 되고 싶은 모습을 카드에 적었어요.' },
    { q: '이번 학기 이 과정에서 꼭 얻고 싶은 것은 무엇인가요?', k: 'why', ph: '예: 설문을 직접 분석해 보고 싶어요', ack: '좋아요. 이번 학기에 얻고 싶은 것을 담았어요.' },
    { q: '지금까지 이야기를 비전 한 문장으로 다듬어 볼게요. 고치고 싶은 곳이 있으면 고쳐 주세요.', k: 'txt', ack: '비전 한 문장이 완성됐어요.' },
    { q: '마지막으로 이번 학기 목표를 정해요. 목표는 3개까지 정할 수 있어요.', k: 'goals', ack: '' }];
  const vis = () => { const V = LR.lp.vision = LR.lp.vision && typeof LR.lp.vision === 'object' ? LR.lp.vision : {}; V.card = V.card && typeof V.card === 'object' ? V.card : {}; V.goals = Array.isArray(V.goals) ? V.goals.slice(0, 3) : []; V.step = Math.max(0, Math.min(6, +V.step || 0)); return V; };
  const visDone = V => !!(V && V.at && V.step >= 6);
  const VS = { open: false, seen: false, err: '' };
  const PIIRE = /(?:제\s*이름은|내\s*이름은|저는)\s*[가-힣]{2,4}(?:입니다|이에요|예요|이고|라고)/;
  function clean(t) { let s = String(t || '').trim(); const r = red(s); let hit = r !== s; s = r; if (PIIRE.test(s)) { s = s.replace(PIIRE, '[이름 가림]'); hit = true; } if (hit) VS.err = '개인정보(이름 · 연락처)는 적지 않아도 돼요. 지우고 저장할게요.'; return s; }
  function visHTML() {
    const V = vis(); const n = Math.min(V.step, 5); const Q = VQ[n]; const c = V.card; const txt = V.txt || (c.who ? `${String(c.who).replace(/[.!]$/, '')}` : '');
    const chat = VQ.slice(0, n + 1).map((x, i) => `<div class="v2-vai"><span class="v2-av" aria-hidden="true">AI</span><p>${esc(x.q)}</p></div>${i < n && x.k && x.k !== 'goals' ? `<div class="v2-vme">${esc(x.k === 'txt' ? V.txt || '' : c[x.k] || '')}</div>${x.ack ? `<div class="v2-vai"><span class="v2-av" aria-hidden="true">AI</span><p>${esc(x.ack)}</p></div>` : ''}` : ''}`).join('');
    const G = [0, 1, 2].map(i => V.goals[i] ? `<li class="v2-g${V.goals[i].done ? ' done' : ''}"><em>${i + 1}</em><span>${esc(V.goals[i].t)}</span>${V.at ? `<button type="button" data-vis="gdone" data-i="${i}" aria-pressed="${!!V.goals[i].done}">${V.goals[i].done ? '달성' : '달성 표시'}</button>` : ''}</li>` : `<li class="v2-g ph"><em>${i + 1}</em><span>${n >= 5 ? '아래에서 정해요' : '다음 단계에서 함께 정해요'}</span></li>`).join('');
    let inp = '';
    if (n === 0) inp = `<div class="v2-vrow"><button type="button" class="v2-vb pri" data-vis="next">시작할게요</button></div>`;
    else if (n < 5 && Q.k !== 'txt') inp = `<form class="v2-vin" data-vk="${Q.k}"><label for="v2v" class="sr">내 생각</label><textarea id="v2v" rows="2" maxlength="120" placeholder="${esc(Q.ph)}">${esc(c[Q.k] || '')}</textarea><button type="submit" aria-label="보내기">${ico('send', 18)}</button></form>`;
    else if (Q.k === 'txt') inp = `<form class="v2-vin" data-vk="txt"><label for="v2v" class="sr">비전 한 문장</label><textarea id="v2v" rows="2" maxlength="120">${esc(txt)}</textarea><button type="submit" aria-label="보내기">${ico('send', 18)}</button></form>`;
    else inp = `<form class="v2-vin" data-vk="goal"${V.goals.length >= 3 ? ' hidden' : ''}><label for="v2v" class="sr">이번 학기 목표</label><textarea id="v2v" rows="1" maxlength="60" placeholder="예: 데이터분석 기초 개념 10개 숙달"></textarea><button type="submit" aria-label="목표 더하기">${ico('send', 18)}</button></form><p class="v2-vh">목표는 3개까지 정할 수 있어요</p><label class="v2-share"><input type="checkbox" data-vis="share"${V.share ? ' checked' : ''}> 목표를 선생님께 공유</label><div class="v2-vrow"><button type="button" class="v2-vb pri" data-vis="save"${V.goals.length ? '' : ' disabled'}>비전 카드 저장</button></div>`;
    return `<div class="v2-vis" role="dialog" aria-modal="true" aria-labelledby="v2vT"><div class="v2-vw">
      <header class="v2-vh1"><h2 id="v2vT">나의 비전 만들기</h2>${visDone(V) ? '<button type="button" class="v2-vx" data-vis="close" aria-label="닫기">' + ico('x', 18) + '</button>' : '<button type="button" class="v2-skip" data-vis="skip">건너뛰기</button>'}</header>
      <div class="v2-prog"><div><span>AI 선생님과 이야기 · 약 5분</span><b>${n + 1} / 6단계</b></div><p aria-hidden="true">${[0, 1, 2, 3, 4, 5].map(i => `<i class="${i < n ? 'f' : i === n ? 'c' : ''}"></i>`).join('')}</p></div>
      <div class="v2-vchat" aria-live="polite">${chat}</div>
      <section class="v2-vc"><div class="v2-vlb">${ico('spark', 14)} 나의 비전 카드${visDone(V) ? '' : ' · 만들어지는 중'}</div><h3>${txt ? esc(txt) : '<span class="ph">대화에 따라 채워져요</span>'}</h3><ol class="v2-gl">${G}</ol><p class="v2-own">${ico('lock', 13)} 비전과 목표는 나만 고칠 수 있어요</p></section>
      ${VS.err ? `<p class="v2-verr" role="alert">${esc(VS.err)}</p>` : ''}
      ${visDone(V) && !VS.edit ? '<div class="v2-vrow"><button type="button" class="v2-vb" data-vis="edit">고치기</button></div>' : inp}
      ${visDone(V) ? '' : '<div class="v2-vrow end"><button type="button" class="v2-vlink" data-vis="later">나중에 이어서 할게요</button></div>'}</div></div>`;
  }
  function visRender() { let R = document.getElementById('v2vis'); if (!VS.open) { if (R) R.remove(); document.body.classList.remove('v2-vison'); return; }
    if (!R) { R = document.createElement('div'); R.id = 'v2vis'; document.body.appendChild(R); } R.innerHTML = visHTML(); document.body.classList.add('v2-vison');
    const ch = R.querySelector('.v2-vchat'); if (ch) ch.scrollTop = ch.scrollHeight; const t = R.querySelector('#v2v'); if (t && !matchMedia('(max-width:600px)').matches) t.focus(); }
  function visOpen(force) { if (!on() || !LR.me || (LR.me && LR.me.kind === 'parent')) return; VS.open = true; VS.seen = true; VS.err = ''; if (force) VS.edit = false; visRender(); }
  const visEmit = V => emit('vision', { k: 'card' }, { len: bare(V.txt).length + bare(V.card.who).length + bare(V.card.why).length + bare(V.card.how).length, goals: V.goals.length, step: V.step });
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-vis]'); if (!el || !on()) return; const k = el.dataset.vis; if (k === 'share') return; e.preventDefault(); const V = vis();
    if (k === 'next') { V.step = Math.max(V.step, 1); save(); }
    if (k === 'skip') { V.skip = true; save(); VS.open = false; emit('vision', { k: 'skip' }, { step: V.step }); }
    if (k === 'later') { save(); VS.open = false; }
    if (k === 'close') { VS.open = false; VS.edit = false; }
    if (k === 'edit') { VS.edit = true; V.step = 1; }
    if (k === 'save') { if (!V.goals.length) return; V.step = 6; V.at = nowISO(); V.skip = false; VS.edit = false; VS.open = false; save(); visEmit(V); toast('비전 카드를 저장했어요.', 'ok'); }
    if (k === 'gdone') { const g = V.goals[+el.dataset.i]; if (g) { g.done = !g.done; save(); if (g.done) emit('goal', { k: 'goal', i: +el.dataset.i }, { done: 1 }); } }
    VS.err = ''; visRender(); if (!VS.open && typeof lrender === 'function') lrender(); });
  document.addEventListener('change', e => { const el = e.target; if (!el || el.dataset.vis !== 'share' || !on()) return; vis().share = !!el.checked; save(); });
  document.addEventListener('submit', e => { const f = e.target; if (!f.classList || !f.classList.contains('v2-vin') || !on()) return; e.preventDefault(); const V = vis(); VS.err = ''; const raw = f.querySelector('textarea').value; const t = clean(raw).slice(0, f.dataset.vk === 'goal' ? 60 : 120); const k = f.dataset.vk;
    if (!t.trim()) { VS.err = '한 줄이라도 적어 주세요.'; return visRender(); }
    if (k === 'goal') { if (V.goals.length >= 3) { VS.err = '목표는 3개까지 정할 수 있어요'; return visRender(); } V.goals.push({ t, by: '', done: false }); }
    else if (k === 'txt') { V.txt = t; V.step = Math.max(V.step, 5); }
    else { V.card[k] = t; V.step = Math.max(V.step, VQ.findIndex(x => x.k === k) + 1); }
    save(); visRender(); });
  document.addEventListener('keydown', e => { if (e.target && e.target.id === 'v2v' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); } if (e.key === 'Escape' && VS.open) { save(); VS.open = false; visRender(); } });
  /* 첫 로그인(선생님 고르기 다음) 홈에서 자동 시작, 건너뛰면 홈 아래 작은 카드 */
  if (typeof lrender === 'function') { const base = lrender; lrender = function () { /* eslint-disable-line no-global-assign */
    const r = base.apply(this, arguments); try { if (!on() || !LR.me || LR.me.kind === 'parent' || !LR.lp) return r; const V = vis(); const a = route().a;
      if (a === 'home' && !visDone(V)) { const lm = document.getElementById('lm'); if (lm && !lm.querySelector('.v2-vcard') && !document.body.classList.contains('ap-pickon')) lm.insertAdjacentHTML('beforeend', `<section class="v2-vcard"><div><b>${V.skip || !V.step ? '1분이면 나만의 비전을 만들 수 있어요' : '비전 만들기 이어서'}</b><small>${V.step ? `${Math.min(6, V.step + 1)} / 6단계부터 이어서 해요` : 'AI 선생님과 6단계로 이야기해요'}</small></div><button type="button" class="v2-vb pri" data-v2="vis">${V.step && !V.skip ? '이어서 하기' : '시작하기'}</button></section>`);
        if (!V.skip && !VS.seen && !document.body.classList.contains('ap-pickon')) visOpen(); }
    } catch (e) { console.error('lv2 vision', e); } return r; }; }

  window.LV2 = Object.freeze({ on, levelOf, hintState, label, ctx: () => CTX, canOpen, checkTry, sim, openVision: () => visOpen(true) });
})();
