/* v46 D5 loop2 — Ver2 학습 루프 템플릿 4종(기능 3) + 개념 모델 window.CONCEPT.
   - 꺼짐(S.aipol.on 아님 · 게시본 aipol.on 아님)이면 화면 · 데이터 모두 지금과 같다(1순위).
   - 데이터: c.concepts = [{ id:'k1', name, wk }] · c.weekPlan[i].loop = { tpl, st:'draft'|'ok', off?, steps:[{ k, lvl, txt, item?, add? }] }
     숙달 확인은 기존 퀴즈에 it.loop='check' · it.cpt · it.concepts 표시만(직훈 · 법정 과정은 항목을 더하지 않음 → 진도 · 차시 수 불변).
   - 학습자: 게시본 classes[].loop(수락된 차시만) · concepts · loopLock, 기록은 lp.cls[c].refl[week] = { s, x, r, at }(서버 cleanLP 화이트리스트 필요). */
(() => {
  const LVN = ['L0', 'L1', 'L2', 'L3'];
  const LVL = { L0: 'AI 꺼짐', L1: 'AI 코치', L2: 'AI 파트너', L3: 'AI 에이전트' };
  const SK = { struggle: '씨름', expand: 'AI 확장', reflect: '성찰', check: '숙달 확인' };
  const SIC = { struggle: 'edit', expand: 'spark', reflect: 'chat', check: 'target' };
  const MIN = { struggle: 20, reflect: 30 };
  /* 템플릿별 기본 구성(SPEC 기능 3) — [단계, 레벨, 이름, 설명 틀] */
  const TPL = {
    concept: { name: '개념 익히기', desc: '이론 · 원리 중심 차시', ic: 'bulb', steps: [['struggle', 'L0', '예측 질문', t => `「${t}」 — 답을 먼저 예측해 적어 보기`], ['expand', 'L1', 'AI 튜터', () => '내 예측을 AI 코치와 비교하기'], ['reflect', 'L1', '3문장 성찰', () => '무엇이 바뀌었는지 3문장으로'], ['check', 'L0', '퀴즈 5문항', () => '개념 퀴즈 5문항 · 80% 이상']] },
    practice: { name: '실습', desc: '먼저 시도 → 피드백 → 수정', ic: 'monitor', steps: [['struggle', 'L0', '먼저 시도', t => `「${t}」 — 혼자 먼저 해 보기`], ['expand', 'L2', 'AI 피드백', () => '내 결과물에 AI 피드백 받기'], ['reflect', 'L1', '수정 이유', () => '무엇을 왜 고쳤는지 적기'], ['check', 'L0', '실습 체크', () => '실습 체크리스트 확인']] },
    discuss: { name: '토론', desc: '내 입장 → 반론 → 입장 수정', ic: 'chat', steps: [['struggle', 'L0', '내 입장', t => `「${t}」 — 내 입장과 근거 적기`], ['expand', 'L2', 'AI 반론', () => 'AI가 낸 반론에 답하기'], ['reflect', 'L1', '입장 수정', () => '바뀐 입장과 이유 정리'], ['check', 'L0', '짧은 글 루브릭', () => '짧은 글 · 루브릭 확인']] },
    project: { name: '프로젝트', desc: '문제 정의 → 제작 → 검증', ic: 'flag', steps: [['struggle', 'L0', '문제 정의', t => `「${t}」 — 풀 문제를 한 문장으로`], ['expand', 'L3', 'AI 파트너 · 에이전트', () => 'AI와 함께 만들고 맡긴 일 기록'], ['reflect', 'L1', '검증 기록', () => 'AI 결과를 어떻게 검증했는지'], ['check', 'L0', '루브릭 평가', () => '루브릭 기준으로 확인']] }
  };
  const ORD = ['concept', 'practice', 'discuss', 'project'];
  const esc2 = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])));
  const lvIdx = l => Math.max(0, LVN.indexOf(l));

  /* ───────── 개념 모델(계약: c.concepts · item.concepts · window.CONCEPT) ───────── */
  const splitGoal = g => String(g || '').split(/(?<=[.。!?])\s+|\n|;|\s·\s/).map(x => x.replace(/^[-•\d.)\s]+/, '').replace(/[.。]\s*$/, '').trim()).filter(x => x.length >= 4);
  const derive = c => { const L = []; let n = 0; (c && Array.isArray(c.weekPlan) ? c.weekPlan : []).forEach((w, i) => { const wk = +w.w || i + 1; const P = splitGoal(w.goal).slice(0, 3); (P.length ? P : [String(w.title || `${wk}차시`).trim()]).forEach(nm => L.push({ id: 'k' + (++n), name: nm.slice(0, 80), wk })); }); return L; };
  const CONCEPT = window.CONCEPT = {
    ensure(c) { if (!c) return []; if (!Array.isArray(c.concepts) || !c.concepts.length) c.concepts = derive(c); return c.concepts; },
    list(c) { if (!c) return []; return Array.isArray(c.concepts) && c.concepts.length ? c.concepts : derive(c); },
    ofWeek(c, wk) { return CONCEPT.list(c).filter(k => +k.wk === +wk); },
    split: splitGoal
  };

  /* ───────── 루프 배치(어드민 · 시험 공용, 순수 계산) ───────── */
  const maxLvl = () => { try { const p = typeof S !== 'undefined' && S && S.aipol; return (p && LVN.includes(p.max) && p.max) || 'L3'; } catch (e) { return 'L3'; } };
  const cap = l => lvIdx(l) > lvIdx(maxLvl()) ? maxLvl() : l;
  const draftTxt = (tpl, w) => { const T0 = TPL[tpl]; const t = String(w.title || '').trim() || '이 차시'; return T0.steps.map(([k, lvl, nm, f]) => ({ k, lvl: cap(lvl), nm, txt: f(t) })); };
  /* plan(weekPlan, tpl, { fail }) → 차시별 루프 초안. fail(AI 실패)이면 빈 틀(txt '') */
  const plan = (WP, tpl, o = {}) => (WP || []).map((w, i) => ({ w: +w.w || i + 1, title: w.title || '', loop: { tpl, st: 'draft', steps: draftTxt(tpl, w).map(s => ({ k: s.k, lvl: s.lvl, txt: o.fail ? '' : s.txt })) } }));
  const isVoc = c => { try { return !!(c && c.legal) || (typeof S !== 'undefined' && S && S.org && S.org.type === 'voc'); } catch (e) { return false; } };
  /* 연결 제안: 같은 차시의 퀴즈(없으면 시험 외 퀴즈형) — 첫 번째 */
  const quizOf = (c, wk) => (c.curriculum || []).find(it => it && it.type === 'quiz' && +it.week === +wk);
  /* 과정에 적용(초안). 기존 항목은 건드리지 않는다 */
  function apply(c, tpl, o = {}) {
    if (!c || !TPL[tpl]) return 0; CONCEPT.ensure(c); const skip = o.skip || {}; const P = plan(c.weekPlan, tpl, o); let n = 0;
    (c.weekPlan || []).forEach((w, i) => { const p = P[i]; const wk = p.w; if (skip[wk]) { w.loop = { tpl: null, off: true }; return; }
      const q = quizOf(c, wk); const ck = p.loop.steps.find(s => s.k === 'check'); if (q) ck.item = q.id; else if (!isVoc(c)) ck.add = true;
      w.loop = { ...p.loop, cpt: CONCEPT.ofWeek(c, wk).map(k => k.id) }; n++; });
    c.loopTpl = tpl; return n;
  }
  /* 「모두 수락」: 초안 → 학습자 공개. 숙달 확인은 기존 퀴즈에 표시, 퀴즈가 없으면(직훈 · 법정 제외) 확인 퀴즈 항목만 추가 */
  function accept(c, onlyWk) {
    if (!c) return 0; let n = 0; const uidf = typeof uid === 'function' ? uid : (p => p + Math.random().toString(36).slice(2, 9));
    (c.weekPlan || []).forEach((w, i) => { const L = w.loop; const wk = +w.w || i + 1; if (!L || L.off || L.st === 'ok' || (onlyWk && +onlyWk !== wk)) return; const ck = (L.steps || []).find(s => s.k === 'check'); const cp = L.cpt || [];
      if (ck && ck.item) { const it = (c.curriculum || []).find(x => x.id === ck.item); if (it) { it.loop = 'check'; it.cpt = cp[0] || ''; it.concepts = cp.slice(); } }
      else if (ck && ck.add && !isVoc(c)) { const nm = (CONCEPT.ofWeek(c, wk)[0] || {}).name || w.title || ''; const qs = (typeof AI !== 'undefined' && AI.fromText ? ((AI.fromText(`${w.title || ''}. ${w.goal || nm}. ${nm}은 이 차시의 핵심 개념이다.`, 3) || {}).qs || []) : []).slice(0, 5);
        if (qs.length) { const it = { id: uidf('it'), type: 'quiz', title: `${wk}${isUnivU() ? '주차' : '차시'} 숙달 확인`, week: wk, qs, loop: 'check', cpt: cp[0] || '', concepts: cp.slice(), ai: { lvl: 'L0' }, loopAdd: 1 }; c.curriculum = c.curriculum || []; const at = c.curriculum.map(x => +x.week || 0).lastIndexOf(wk); c.curriculum.splice(at < 0 ? c.curriculum.length : at + 1, 0, it); ck.item = it.id; } delete ck.add; }
      L.st = 'ok'; L.at = Date.now(); n++; });
    return n;
  }
  const isUnivU = () => { try { return S.org.type === 'univ'; } catch (e) { return false; } };
  const LOOP2 = window.LOOP2 = { TPL, ORD, SK, LVL, plan, apply, accept, cap, maxLvl, quizOf, isVoc, MIN,
    on() { try { if (window.AIPOL && typeof AIPOL.on === 'function') return !!AIPOL.on(); } catch (e) { } try { return !!(typeof S !== 'undefined' && S && S.aipol && S.aipol.on); } catch (e) { return false; } },
    inFlow() { return LOOP2.on(); } };

  /* ───────── 어드민 ───────── */
  if (typeof VIEWS !== 'undefined' && typeof ACT !== 'undefined') {
    const icx = (k, n) => (typeof ic === 'function' ? ic(k, n || 16) : '');
    const chip = l => `<span class="lp2-lv lv-${esc2(l)}">${esc2(LVL[l] || l)}</span>`;
    const cards = cur => `<div class="lp2-tpl" role="radiogroup" aria-label="학습 루프 템플릿">${ORD.map(k => `<button type="button" role="radio" aria-checked="${cur === k}" class="lp2-tp ${cur === k ? 'on' : ''}" data-lp2tpl="${k}">${cur === k ? `<span class="ck">${icx('check', 14)}</span>` : ''}<b>${icx(TPL[k].ic, 18)}${esc2(TPL[k].name)}</b><p>${esc2(TPL[k].desc)}</p></button>`).join('')}</div>`;
    const stepCell = (s, i) => `<div class="lp2-sg s${i + 1}"><h5>${icx(SIC[s.k], 15)}${esc2(SK[s.k])}${chip(s.lvl)}</h5><p>${s.txt ? esc2(s.txt) : '<em class="lp2-empty">비어 있음 — 직접 채우기</em>'}</p>${s.k === 'check' && s.item ? '<small class="lp2-link">기존 퀴즈에 연결</small>' : s.k === 'check' && s.add ? '<small class="lp2-link">확인 퀴즈 추가 예정</small>' : ''}</div>`;
    const unitOf = c => (window.CF && CF.unit ? CF.unit(c || {}) : '차시');
    const rowHTML = (w, i, u, edit, cpts) => { const L = w.loop; const wk = +w.w || i + 1; const head = `<div class="lp2-no"><small>${wk}${esc2(u)}</small><b>${esc2(w.title || '')}</b>${cpts && cpts.length ? `<span class="lp2-cp">${cpts.map(k => esc2(k.name)).join(' · ').slice(0, 80)}</span>` : ''}</div>`;
      if (!L || L.off) return `<div class="lp2-lr off" data-lp2w="${wk}">${head}<div class="lp2-off"><p>이 ${esc2(u)}는 루프 없이 진행합니다.</p><button type="button" class="btn sm ghost" data-lp2on="${wk}">다시 넣기</button></div></div>`;
      if (edit) return `<div class="lp2-lr" data-lp2w="${wk}">${head}<div class="lp2-ed">${L.steps.map((s, j) => `<label><span>${esc2(SK[s.k])} ${chip(s.lvl)}</span><input data-lp2txt="${wk}:${j}" value="${esc2(s.txt)}" maxlength="200"></label>`).join('')}<label><span>개념(쉼표로 구분)</span><input data-lp2cpt="${wk}" value="${esc2((cpts || []).map(k => k.name).join(', '))}" maxlength="240"></label><div class="lp2-eb"><button type="button" class="btn sm pri" data-lp2done="${wk}">수정 마침</button></div></div></div>`;
      return `<div class="lp2-lr ${L.st === 'ok' ? 'ok' : ''}" data-lp2w="${wk}">${head}<div class="lp2-stg">${L.steps.map((s, j) => stepCell(s, j) + (j < 3 ? `<span class="lp2-ar" aria-hidden="true">${icx('right', 13) || '→'}</span>` : '')).join('')}</div><div class="lp2-ra">${L.st === 'ok' ? '<span class="lp2-okt">수락됨</span>' : ''}<button type="button" class="btn sm ghost" data-lp2edit="${wk}">이 ${esc2(u)} 수정</button><button type="button" class="btn sm ghost" data-lp2off="${wk}">이 ${esc2(u)}는 루프 없이</button></div></div>`; };
    /* 공용 편집 화면 — tgt: { weekPlan, concepts?, loopTpl, curriculum? } */
    const panel = (tgt, st, u) => { const WP = tgt.weekPlan || []; if (!WP.length) return `<div class="lp2-empty0"><p>먼저 ${esc2(u)}를 만들어 주세요</p><button type="button" class="btn pri" data-lp2mk="1">${esc2(u)} 만들기</button></div>`;
      const has = WP.some(w => w.loop && !w.loop.off); const nOk = WP.filter(w => w.loop && w.loop.st === 'ok').length;
      return `<p class="lp2-lead">템플릿을 고르면 모든 ${esc2(u)}에 4단계가 자동으로 놓입니다.</p>${cards(tgt.loopTpl)}${st.err ? `<p class="lp2-err" role="alert">AI 초안을 만들지 못했습니다. 직접 채우거나 다시 시도해 주세요.</p>` : ''}
        ${has ? `<div class="lp2-th"><h4>${esc2(u)}별 학습 흐름</h4><span class="lp2-cnt">${WP.length}${esc2(u)} 자동 배치${nOk ? ` · 수락 ${nOk}` : ''}</span><span class="lp2-sp"></span><button type="button" class="btn sm" data-lp2undo="1" ${st.undo && st.undo.length ? '' : 'disabled'}>되돌리기</button><button type="button" class="btn sm pri" data-lp2all="1">모두 수락</button></div>
        <p class="lp2-note">기존 항목은 그대로 두고 단계만 추가합니다.${isVoc(tgt) ? ` 직업훈련 과정은 씨름 · 성찰이 ${esc2(u)} 안 블록이라 진도율 · ${esc2(u)} 수에 들어가지 않고, 숙달 확인은 기존 퀴즈에 표시만 합니다.` : ''} 수락하기 전에는 학습자에게 보이지 않습니다.</p>
        <div class="lp2-tl">${WP.map((w, i) => rowHTML(w, i, u, st.edit === (+w.w || i + 1), CONCEPT.ofWeek(tgt, +w.w || i + 1))).join('')}</div>` : `<div class="lp2-later"><button type="button" class="btn ghost" data-lp2later="1">나중에 적용할게요</button></div>`}`; };
    /* 편집 동작(마법사 · 과정 공용). 반환 true면 다시 그림 */
    const act = (el, tgt, st, onSnap) => { const d = el.dataset; const W = wk => (tgt.weekPlan || []).find((w, i) => (+w.w || i + 1) === +wk);
      if (d.lp2tpl) { onSnap('학습 루프 템플릿'); const fail = !!LOOP2._fail; apply(tgt, d.lp2tpl, { fail }); st.err = fail; st.edit = 0; return true; }
      if (d.lp2all) { onSnap('모두 수락'); readEd(tgt, st); accept(tgt); st.edit = 0; if (typeof toast === 'function') toast('모든 차시의 학습 루프를 수락했습니다. 학습자 화면에 반영됩니다.', 'ok'); return true; }
      if (d.lp2off) { onSnap('루프 없이'); const w = W(d.lp2off); if (w) w.loop = { tpl: null, off: true }; return true; }
      if (d.lp2on) { onSnap('다시 넣기'); const w = W(d.lp2on); const i = (tgt.weekPlan || []).indexOf(w); if (w && tgt.loopTpl) { const P = plan([w], tgt.loopTpl)[0]; P.loop.steps.forEach(s => { if (s.k === 'check') { const q = quizOf(tgt, +w.w || i + 1); if (q) s.item = q.id; else if (!isVoc(tgt)) s.add = true; } }); w.loop = { ...P.loop, cpt: CONCEPT.ofWeek(tgt, +w.w || i + 1).map(k => k.id) }; } return true; }
      if (d.lp2edit) { st.edit = +d.lp2edit; return true; }
      if (d.lp2done) { onSnap('차시 수정'); readEd(tgt, st); st.edit = 0; return true; }
      if (d.lp2undo) { if (st.undo && st.undo.length) { const u = st.undo.pop(); Object.assign(tgt, JSON.parse(u)); } st.edit = 0; return true; }
      return false; };
    const readEd = (tgt, st) => { const root = document.querySelector('.lp2-tl'); if (!root || !st.edit) return; root.querySelectorAll('[data-lp2txt]').forEach(inp => { const [wk, j] = inp.dataset.lp2txt.split(':'); const w = (tgt.weekPlan || []).find((x, i) => (+x.w || i + 1) === +wk); if (w && w.loop && w.loop.steps[+j]) w.loop.steps[+j].txt = inp.value.trim().slice(0, 200); });
      root.querySelectorAll('[data-lp2cpt]').forEach(inp => { const wk = +inp.dataset.lp2cpt; CONCEPT.ensure(tgt); const names = inp.value.split(/[,，]/).map(x => x.trim()).filter(Boolean).slice(0, 3); if (!names.length) return; const old = tgt.concepts.filter(k => +k.wk === wk); const keep = tgt.concepts.filter(k => +k.wk !== wk); let mx = tgt.concepts.reduce((a, k) => Math.max(a, +String(k.id).slice(1) || 0), 0);
        const nw = names.map((nm, i) => old[i] ? { ...old[i], name: nm.slice(0, 80) } : { id: 'k' + (++mx), name: nm.slice(0, 80), wk }); tgt.concepts = [...keep, ...nw].sort((a, b) => a.wk - b.wk); const w = (tgt.weekPlan || []).find((x, i) => (+x.w || i + 1) === wk); if (w && w.loop) w.loop.cpt = nw.map(k => k.id); }); };

    /* ① 과정 만들기 마법사 단계(켜짐일 때만 끼움: crs-flow stepIds 훅) */
    const FST = { undo: [] };
    const flowStep = { id: 'loop', title: () => '학습 루프 템플릿', now: () => '템플릿을 고르면 모든 차시에 4단계가 자동으로 놓입니다.',
      render(el, d) { const u = unitOf(d); FST.undo = FST.undo || []; el.innerHTML = `<div class="lp2 lp2-flow">${panel(d, FST, u)}</div>`; },
      valid() { return []; }, aiFill(d) { if (!d.loopTpl) apply(d, 'concept'); return Promise.resolve(d); } };
    const reg = () => { if (window.CF && Array.isArray(CF.steps) && !CF.steps.some(s => s.id === 'loop')) CF.steps.push(flowStep); };
    reg(); document.addEventListener('DOMContentLoaded', reg);
    document.addEventListener('click', e => { const el = e.target && e.target.closest && e.target.closest('#crsFlow [data-lp2tpl],#crsFlow [data-lp2all],#crsFlow [data-lp2off],#crsFlow [data-lp2on],#crsFlow [data-lp2edit],#crsFlow [data-lp2done],#crsFlow [data-lp2undo],#crsFlow [data-lp2later],#crsFlow [data-lp2mk]'); if (!el || !window.CF) return; e.preventDefault();
      const d = CF.draft; if (!d) return; if (el.dataset.lp2later) { CF.next && CF.next(); return; } if (el.dataset.lp2mk) { CF.prev && CF.prev(); return; }
      if (act(el, d, FST, lb => { FST.undo.push(JSON.stringify({ weekPlan: d.weekPlan, concepts: d.concepts, loopTpl: d.loopTpl })); if (FST.undo.length > 20) FST.undo.shift(); })) { CF.emit && CF.emit('change', { step: 'loop', field: 'loop', d }); CF.saveDraft && CF.saveDraft(); CF.repaint && CF.repaint(); } });
    /* 만들기: 흐름 초안(d.weekPlan[].loop · d.concepts)을 새 과정에 옮김 — 꺼짐이면 아무것도 하지 않음 */
    const onCreate = () => { if (window.CF && CF.on && !CF.__lp2) { CF.__lp2 = 1; CF.on('create', ({ course: c, d }) => { try { if (!LOOP2.on() || !c || !d || !d.loopTpl) return; const src = d.weekPlan || []; if (Array.isArray(d.concepts) && d.concepts.length) c.concepts = JSON.parse(JSON.stringify(d.concepts)); else CONCEPT.ensure(c);
      (c.weekPlan || []).forEach((w, i) => { const s = src[i]; if (s && s.loop) w.loop = JSON.parse(JSON.stringify(s.loop)); }); c.loopTpl = d.loopTpl; const ok = (c.weekPlan || []).filter(w => w.loop && w.loop.st === 'ok');
      (c.weekPlan || []).forEach((w, i) => { if (!w.loop || w.loop.off) return; w.loop.st = 'draft'; const ck = (w.loop.steps || []).find(x => x.k === 'check'); if (ck) { delete ck.item; delete ck.add; const q = quizOf(c, +w.w || i + 1); if (q) ck.item = q.id; else if (!isVoc(c)) ck.add = true; } }); /* 새 과정 항목으로 연결을 다시 잡는다 */
      ok.forEach((w, i) => accept(c, +w.w || i + 1)); /* 흐름에서 수락했던 차시만 수락 */
      delete d.loopTpl; } catch (e) { console.error('loop2 create', e); } }); } };
    onCreate(); document.addEventListener('DOMContentLoaded', onCreate);

    /* ② 과정 상세 › 「학습 루프 적용」 */
    const CST = { undo: [] };
    ACT['loop2'] = el => { if (!LOOP2.on()) return; const c = typeof C === 'function' ? C(el && el.dataset && el.dataset.v) : null; if (!c) return; CST.undo = []; CST.edit = 0; CST.err = false; CST.c = c.id;
      const paint = w => { const b = w.querySelector('.lp2-c'); if (b) b.innerHTML = panel(c, CST, unitOf(c)); };
      const w = modal(`학습 루프 적용 — ${c.name}`, `<div class="lp2 lp2-c">${panel(c, CST, unitOf(c))}</div>`, [{ id: 'c', label: '닫기', run: () => { try { save(); } catch (e) { } try { render(); } catch (e) { } } }], true);
      w.addEventListener('click', e => { const t = e.target.closest('[data-lp2tpl],[data-lp2all],[data-lp2off],[data-lp2on],[data-lp2edit],[data-lp2done],[data-lp2undo],[data-lp2later],[data-lp2mk]'); if (!t) return; e.preventDefault(); e.stopPropagation();
        if (t.dataset.lp2later) { closeModal(); return; } if (t.dataset.lp2mk) { closeModal(); return; }
        if (act(t, c, CST, () => { CST.undo.push(JSON.stringify({ weekPlan: c.weekPlan, concepts: c.concepts, loopTpl: c.loopTpl, curriculum: c.curriculum })); if (CST.undo.length > 20) CST.undo.shift(); })) { try { save(); } catch (e2) { } paint(w); } });
      return w; };
    if (typeof AFTER !== 'undefined' && Array.isArray(AFTER)) AFTER.push(() => { try { if (!LOOP2.on() || typeof CUR === 'undefined' || !CUR || CUR.tab !== 'class' || !UI.cls) return; const c = C(UI.cls); if (!c) return; const phr = [...document.querySelectorAll('#main .ph .phr')].find(x => x.offsetParent); if (!phr || phr.querySelector('[data-act=loop2]')) return;
      phr.insertAdjacentHTML('beforeend', `<button type="button" class="btn sm ghost lp2-btn" data-act="loop2" data-v="${esc2(c.id)}">${icx('layers', 14)} 학습 루프 적용</button>`); } catch (e) { console.error(e); } });

    /* ③ 학습자 게시본: 수락된 루프 · 개념 · 숙달 확인 표시(켜짐일 때만) */
    if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { if (!LOOP2.on() || !r) return r; // eslint-disable-line no-global-assign
      if (!r.aipol && S.aipol) r.aipol = { on: !!S.aipol.on, lvl: S.aipol.lvl || 'L1', retain: S.aipol.retain || 'term', evalNotice: S.aipol.evalNotice !== false };
      (r.classes || []).forEach(x => { const c = typeof C === 'function' ? C(x.id) : null; if (!c) return; const L = (c.weekPlan || []).map((w, i) => w.loop && w.loop.st === 'ok' && !w.loop.off ? { w: +w.w || i + 1, tpl: w.loop.tpl, cpt: (w.loop.cpt || []).slice(0, 3), steps: (w.loop.steps || []).map(s => ({ k: s.k, lvl: s.lvl, txt: String(s.txt || '').slice(0, 300), item: s.item || '' })) } : null).filter(Boolean);
        if (!L.length) return; x.loop = L; x.loopLock = c.loopLock !== false; x.concepts = CONCEPT.list(c).map(k => ({ id: k.id, name: k.name, wk: k.wk }));
        (x.items || []).forEach(it => { const src = (c.curriculum || []).find(y => y.id === it.id); if (src && src.loop === 'check') { it.loop = 'check'; it.cpt = src.cpt || ''; it.concepts = (src.concepts || []).slice(0, 3); } }); }); } catch (e) { console.error('loop2 snap', e); } return r; }; window.lsSnapshot = lsSnapshot; }
  }

  /* ───────── 학습자(learner.html) ───────── */
  if (typeof VIEWS === 'undefined' && typeof LR !== 'undefined' && typeof viewCourse === 'function') {
    const icl = (k, n) => (typeof ico === 'function' ? ico(k, n || 15) : '');
    const siteOn = () => { try { const s = SITE(); return !!(s && s.aipol && s.aipol.on); } catch (e) { return false; } };
    const recOf = (cid, wk) => { const c = LR.lp.cls[cid] = LR.lp.cls[cid] || { items: {} }; c.refl = c.refl || {}; return c.refl[wk] = c.refl[wk] || {}; };
    const peek = (cid, wk) => (((LR.lp.cls || {})[cid] || {}).refl || {})[wk] || {};
    const stOf = r => ({ struggle: !!r.s, expand: !!r.x, reflect: !!r.r });
    const ready = r => !!(r.s && r.x && r.r);
    const LVT = { L0: '이 단계는 AI 없이 풀어요', L1: 'AI 코치 · 힌트와 질문으로 도와줘요', L2: 'AI 파트너 · 내 초안에 의견을 줘요', L3: 'AI 에이전트 · 맡기고, 꼭 검증해요' };
    const panelL = (c, L, it) => { const r = peek(c.id, L.w); const D = stOf(r); const cur = !D.struggle ? 'struggle' : !D.expand ? 'expand' : !D.reflect ? 'reflect' : 'check'; const S4 = L.steps;
      const nav = `<ol class="lp2-ls">${S4.map((s, i) => `<li class="${D[s.k] ? 'done' : s.k === cur ? 'on' : ''}"><span>${D[s.k] ? icl('check', 12) : i + 1}</span>${esc2(SK[s.k])}</li>`).join('')}</ol>`;
      const s = S4.find(x => x.k === cur) || S4[3]; const lvT = `<small class="lp2-lvt">${esc2(LVT[s.lvl] || '')}</small>`; let body = '';
      if (cur === 'struggle') body = `<p>${esc2(s.txt || '먼저 내 생각을 적어 보세요.')}</p>${lvT}<textarea id="lp2s" rows="3" maxlength="2000" placeholder="내 시도 · ${MIN.struggle}자 이상"></textarea><button class="lbtn pri" data-lp2l="s" data-c="${esc2(c.id)}" data-w="${L.w}">내 시도 저장</button>`;
      else if (cur === 'expand') body = `<p>${esc2(s.txt || 'AI와 함께 내 시도를 넓혀 보세요.')}</p>${lvT}<button class="lbtn pri" data-lp2l="x" data-c="${esc2(c.id)}" data-w="${L.w}">AI 확장을 마쳤어요</button>`;
      else if (cur === 'reflect') body = `<p>${esc2(s.txt || '무엇이 바뀌었는지 적어 보세요.')}</p>${lvT}<textarea id="lp2r" rows="3" maxlength="2000" placeholder="성찰 · ${MIN.reflect}자 이상"></textarea><button class="lbtn pri" data-lp2l="r" data-c="${esc2(c.id)}" data-w="${L.w}">성찰 저장</button>`;
      else { const q = s.item && c.items.find(x => x.id === s.item); body = `<p>${esc2(s.txt || '개념을 확인해요.')}</p>${lvT}${q && (!it || it.id !== q.id) ? `<a class="lbtn pri" href="#c/${esc2(c.id)}/${esc2(q.id)}">숙달 확인 시작</a>` : ''}`; }
      return `<div class="lp2l" data-lp2wk="${L.w}"><p class="lp2-lh">1 씨름 → 2 AI 확장 → 3 성찰 → 4 숙달 확인</p>${nav}<div class="lp2-lb">${body}</div></div>`; };
    { const base = viewCourse; viewCourse = function (id, itemId) { // eslint-disable-line no-global-assign
      let h = base.apply(this, arguments); try { if (!siteOn() || !LR.me) return h; const c = (SITE().classes || []).find(x => x.id === id); if (!c || !Array.isArray(c.loop) || !c.loop.length) return h;
        const r0 = (LR.lp.cls[c.id] || { items: {} }); const its = c.items || []; const it = its.find(x => x.id === itemId) || its.find(x => x.type !== 'chapter' && !((r0.items || {})[x.id] || {}).done) || its.find(x => x.type !== 'chapter');
        const L = it && c.loop.find(x => +x.w === +(it.week || 0)); if (!L) return h;
        const k = h.indexOf('class="imain"'); if (k < 0) return h; const e2 = h.indexOf('</h2>', k); const at = e2 > 0 ? e2 + 5 : h.indexOf('>', k) + 1;
        let tail = h.slice(at); if (it.loop === 'check' && c.loopLock !== false && !ready(peek(c.id, L.w))) { const E = ['<div class="pl43nx"', '<div class="inav"'].map(x => tail.indexOf(x)).filter(x => x >= 0); tail = `<p class="lp2-lock" role="note">${icl('lock', 16)} 숙달 확인은 앞 단계를 마치면 열려요.</p>` + (E.length ? tail.slice(Math.min(...E)) : ''); } /* 퀴즈 본문(기본 · lassess 화면 모두)을 잠금 안내로 */
        h = h.slice(0, at) + panelL(c, L, it) + tail;
      } catch (e) { console.error('loop2 learner', e); } return h; }; }
    document.addEventListener('click', e => { const el = e.target && e.target.closest && e.target.closest('[data-lp2l]'); if (!el) return; e.preventDefault(); const k = el.dataset.lp2l, cid = el.dataset.c, wk = +el.dataset.w; const r = recOf(cid, wk); const say = (m, t) => typeof toast === 'function' && toast(m, t);
      if (k === 's') { const v = (document.getElementById('lp2s') || {}).value || ''; if (v.replace(/\s/g, '').length < MIN.struggle) { say(`내 시도를 ${MIN.struggle}자 이상 적어 주세요.`, 'warn'); return; } r.s = v.slice(0, 2000); window.LEV && LEV.emit('attempt', { cls: cid, wk, loop: 'struggle' }, { len: v.length }); }
      else if (k === 'x') { r.x = 1; }
      else if (k === 'r') { const v = (document.getElementById('lp2r') || {}).value || ''; if (v.replace(/\s/g, '').length < MIN.reflect) { say(`성찰을 ${MIN.reflect}자 이상 적어 주세요.`, 'warn'); return; } r.r = v.slice(0, 2000); window.LEV && LEV.emit('reflect', { cls: cid, wk }, { len: v.length }); }
      r.at = new Date().toISOString(); try { LR.api.save(); } catch (e2) { } if (typeof lrender === 'function') lrender(); });
  }
})();
