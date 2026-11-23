/* v46 Ver2 1차 D3 — 기관 AI 사용 정책(기능 6) · 과제별 AI 레벨 어드민(기능 1)
   상태: S.aipol = { on, v:1, lvl, preset:{exam, assign}, max, retain:'term'|'year'|'none', evalNotice, train, at, by }
   항목: it.ai = { lvl:'L0'~'L3', why, sol } (과제 · 퀴즈 · 시험만. 영상 it.ai(scenes)와는 type으로 구분)
   기존 기관은 upgradeState에서 { on:false, v:1 } — 꺼져 있으면 화면 · 저장 · 게시본이 지금과 같다. 새로 가입한 기관만 유형 프리셋으로 켠다.
   도우미: window.AIPOL = { on(), levelOf(item, kind), label(lvl), presetFor(type, ed) } */
(function () {
  'use strict';
  const LV = ['L0', 'L1', 'L2', 'L3'];
  const NM = { L0: '끄기', L1: '코치', L2: '파트너', L3: '에이전트' };
  const ED_D = { L0: 'AI 튜터를 쓰지 않습니다', L1: '힌트와 질문만 줍니다', L2: '초안에 의견 · 대안을 줍니다', L3: '실행을 맡기고 검증을 기록합니다' };
  const LBAN = { L0: '이 과제는 AI 없이 풀어요', L1: '이 과제의 AI: 코치 · 힌트와 질문으로 도와줘요', L2: '이 과제의 AI: 파트너 · 내 초안에 의견을 줘요', L3: '이 과제의 AI: 에이전트 · 맡기고, 꼭 검증해요' };
  const WHY0 = { L0: '스스로 실력을 확인하는 항목이라 AI를 쓰지 않습니다.', L1: '개념을 스스로 익히는 과제라 힌트와 질문만 열어 둡니다.', L2: '초안을 직접 쓰고 AI 의견으로 다듬는 과제입니다.', L3: 'AI에게 실행을 맡기되 결과를 검증하고 설명하는 과제입니다.' };
  const RET = { none: '저장 안 함', term: '1학기', year: '1년' };
  const RANK = { none: 0, term: 1, year: 2 };
  const TYN = { univ: '대학', voc: '직업훈련', corp: '기업', k12: '초중고 학원', adult: '성인 학원', lifelong: '평생교육원', public: '공공' };
  const KINDS = ['quiz', 'exam', 'assign'];
  const idx = l => Math.max(0, LV.indexOf(l));
  const okL = l => LV.includes(l);
  /* 기관 유형 프리셋(SPEC 1-2): 기본 시험 L0 · 과제 L1 · 최대 L2, 기업은 실무 과제 L2 · 최대 L3 */
  function presetFor(type) {
    if (type === 'corp') return { lvl: 'L2', preset: { exam: 'L0', assign: 'L2' }, max: 'L3' };
    return { lvl: 'L1', preset: { exam: 'L0', assign: 'L1' }, max: 'L2' };
  }
  const PRE_NOTE = { univ: '대학은 시험 L0 · 과제 L1로 시작합니다.', voc: '직업훈련도 시험 L0 · 과제 L1이며, 훈련 일지 · 진도 규정은 그대로 둡니다.', corp: '기업은 실무 과제 L2 · 시험 L0이고, 직무 실습은 L3까지 고를 수 있습니다.', k12: '초중고 학원은 전 과제 L1 · 시험 L0입니다.' };
  function full(type) { const P = presetFor(type); return { on: true, v: 1, lvl: P.lvl, preset: { ...P.preset }, max: P.max, retain: 'term', evalNotice: true, train: false }; }
  const POL = () => (S && S.aipol) || { on: false, v: 1 };
  /* 화면에서 읽는 값: 저장 전(꺼진 기존 기관)에는 프리셋 기본값을 채워서 보여 준다(쓰지 않음) */
  const val = () => { const A = POL(); const D = full(S && S.org ? S.org.type : ''); return { ...D, ...A, preset: { ...D.preset, ...(A.preset || {}) }, on: !!A.on }; };
  const on = () => !!(S && S.aipol && S.aipol.on);
  const kindOf = (it, kind) => kind || (it && it.type === 'exam' ? 'exam' : 'assign');
  const clampMax = l => { const m = val().max; return idx(l) > idx(m) ? m : l; };
  function levelOf(it, kind) { const V = val(); const own = it && KINDS.includes(it.type) && it.ai && okL(it.ai.lvl) ? it.ai.lvl : ''; const k = kindOf(it, kind);
    return clampMax(own || (okL(V.preset[k]) ? V.preset[k] : '') || (okL(V.lvl) ? V.lvl : '') || 'L1'); }
  const label = l => NM[l] || NM.L1;
  window.AIPOL = { on, levelOf, label, presetFor, banner: l => LBAN[l] || LBAN.L1, why0: l => WHY0[l] || '' };

  /* ── 기존 기관 꺼짐 · 새 기관 켜짐 ── */
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && !S.aipol) S.aipol = { on: false, v: 1 }; } catch (e) { console.error(e); } return r; }; } /* eslint-disable-line no-global-assign */
  { const base = createOrg; createOrg = (...a) => { const set = () => { try { if (S && S.org) { S.aipol = { ...full(S.org.type), at: nowStr(), by: '가입 기본값' }; save(); } } catch (e) { console.error(e); } };
    const r = base(...a); if (r && typeof r.then === 'function') return r.then(ok => { if (ok) set(); return ok; }); set(); return r; }; } /* 운영 모드 createOrg는 Promise(성공 true) */ /* eslint-disable-line no-global-assign */

  /* ── 권한 ── */
  const role = () => (S && S.me && S.me.role) || '';
  const canEdit = () => role() === 'owner';
  const T = v => typeof t === 'function' ? t(v) : v;

  /* ── 지금 과제 · 시험 레벨 분포 ── */
  function dist() { const n = { L0: 0, L1: 0, L2: 0, L3: 0 }; let all = 0; (S.classes || []).forEach(c => (c.curriculum || []).forEach(it => { if (!KINDS.includes(it.type)) return; n[levelOf(it)]++; all++; })); return { n, all }; }
  const overMax = maxL => { const L = []; (S.classes || []).forEach(c => (c.curriculum || []).forEach(it => { if (KINDS.includes(it.type) && it.ai && okL(it.ai.lvl) && idx(it.ai.lvl) > idx(maxL)) L.push([c, it]); })); return L; };

  /* ── 정책 센터 화면(설정 › AI 사용 정책) ── */
  const seg = (k, cur, dis) => `<div class="ap-seg" role="radiogroup" aria-label="${esc(k)}">${LV.map(l => `<button type="button" role="radio" aria-checked="${l === cur}" class="${l === cur ? 'on' : ''}" data-act="ap-set" data-k="${esc(k)}" data-v="${l}" ${dis ? 'disabled' : ''}><b>${l} ${esc(NM[l])}</b></button>`).join('')}</div>`;
  const sw = (act, onv, lab, dis) => `<button type="button" class="sl-sw ${onv ? 'on' : ''}" role="switch" aria-checked="${!!onv}" aria-label="${esc(lab)}" data-act="${act}" ${dis ? 'disabled' : ''}><i></i></button>`;
  const card = (n, title, body, extra) => `<section class="card ap-card"${extra || ''}><h3><span class="ap-n">${n}</span>${esc(title)}</h3>${body}</section>`;
  function view() {
    const V = val(), ed = canEdit(), dis = !ed; const D = dist(); const pt = UI.apPre || S.org.type; const P = presetFor(pt);
    const hist = (S.audit || []).filter(a => /^AI 사용 정책/.test(a.what || '')).slice(0, 6);
    return `<div class="ap-wrap"><div class="ap-head"><p>우리 기관에서 AI를 어떻게 쓸지 한 화면에서 정합니다. ${esc(T('teacher'))}는 이 범위 안에서 과제마다 레벨을 고릅니다.</p>${S.aipol && S.aipol.at ? '' : tag('프리셋 기본값', 'y')}${ed ? '' : `<small class="mini ap-ro">${role() === 'sub' ? '부운영자는 볼 수만 있습니다. 바꾸려면 정운영자에게 요청하세요.' : '보기 전용입니다.'}</small>`}</div>
    <div class="ap-grid">
    ${card(1, 'Ver2 학습 루프', `<div class="ap-row"><div class="ap-t"><b>${V.on ? '켜짐' : '꺼짐'}</b><span>켜면 과제별 AI 레벨 · 힌트 사다리 · 숙달 목표가 적용됩니다. 끄면 지금의 AI 튜터 동작을 그대로 씁니다.</span></div>${sw('ap-on', V.on, `Ver2 학습 루프 ${V.on ? '끄기' : '켜기'}`, dis)}</div>`)}
    ${card(2, '기관 유형 프리셋', `<div class="ap-chips" role="radiogroup" aria-label="기관 유형">${Object.keys(TYN).map(k => `<button type="button" role="radio" aria-checked="${k === pt}" class="${k === pt ? 'on' : ''}" data-act="ap-pre" data-v="${k}">${esc(TYN[k])}</button>`).join('')}</div>
      <div class="ap-tb"><div><span>시험</span><b>${P.preset.exam} ${esc(NM[P.preset.exam])}</b></div><div><span>과제</span><b>${P.preset.assign} ${esc(NM[P.preset.assign])}</b></div><div><span>기관 최대</span><b>${P.max} ${esc(NM[P.max])}</b></div></div>
      <p class="mini">${esc(PRE_NOTE[pt] || '프리셋이 따로 없는 유형은 과제 L1 · 시험 L0(공통 기본)을 씁니다.')} 적용하면 기본 · 최대 레벨만 바뀌고, 이미 레벨을 정한 항목은 그대로입니다.</p>
      <div class="ap-acts"><button type="button" class="btn sm pri" data-act="ap-apply" ${dis ? 'disabled' : ''}>프리셋 적용</button></div>`)}
    ${card(3, '기관 기본 · 최대 레벨', `<p class="ap-l">과제 기본 레벨 <small>새 과제가 이 레벨로 시작합니다</small></p>${seg('assign', V.preset.assign, dis)}
      <p class="ap-l">시험 기본 레벨</p>${seg('exam', V.preset.exam, dis)}
      <p class="ap-l">기관 최대 레벨 <small>이보다 높은 레벨은 ${esc(T('teacher'))}가 고를 수 없습니다</small></p>${seg('max', V.max, dis)}
      <p class="mini ap-desc">${esc(V.preset.assign)} ${esc(NM[V.preset.assign])}: ${esc(LBAN[V.preset.assign])}</p>
      <div class="ap-dist" aria-label="지금 과제 · 시험의 레벨 분포"><small>지금 과제 · 시험의 레벨 분포 · ${D.all}건</small><div>${LV.map(l => `<span class="l${l[1]}"><b>${l}</b>${D.n[l]}</span>`).join('')}</div></div>`)}
    ${card(4, 'AI 대화 기록 보존', `<div class="ap-chips" role="radiogroup" aria-label="보존 기간">${Object.entries(RET).map(([k, l]) => `<button type="button" role="radio" aria-checked="${V.retain === k}" class="${V.retain === k ? 'on' : ''}" data-act="ap-ret" data-v="${k}" ${dis ? 'disabled' : ''}>${esc(l)}${k === 'term' ? '(기본)' : ''}</button>`).join('')}</div>
      <p class="mini">AI 대화 기록 보존: ${esc(RET[V.retain] || '1학기')}${V.retain === 'term' ? '(기본)' : ''}. 1학기는 학기 일정이 있으면 학기 종료일까지, 없으면 6개월입니다. 기간이 지나면 자동으로 지우고, 개인정보는 가린 뒤 암호화해 보관합니다.</p>`)}
    ${card(5, '평가 반영 고지', `<div class="ap-row"><div class="ap-t"><b>AI 대화를 평가에 참고하면 미리 알립니다</b><span>켜면 ${esc(T('learner'))}가 처음 AI를 쓸 때 한 번, 그리고 과제 화면에 한 줄로 알립니다.</span></div>${sw('ap-notice', V.evalNotice, `평가 반영 고지 ${V.evalNotice ? '끄기' : '켜기'}`, dis)}</div>
      ${V.evalNotice ? `<div class="ap-bub">「이 과제의 AI 대화는 평가에 참고될 수 있어요. 대화는 ${esc(V.retain === 'none' ? '저장하지 않아요' : RET[V.retain] + ' 동안 보관돼요')}.」</div>` : ''}`)}
    ${card(6, 'AI 모델 학습', `<div class="ap-row"><div class="ap-t"><b>${V.train ? 'AI 모델 학습에 사용' : 'AI 모델 학습에 쓰지 않음(기본)'}</b><span>기관이 동의할 때만 바꿀 수 있습니다. 켜려면 정운영자가 기관 동의 문서를 확인해야 합니다.</span></div>${sw('ap-train', V.train, `모델 학습 사용 ${V.train ? '끄기' : '켜기'}`, dis)}</div>`)}
    ${card(7, '학습 기록에 남는 개인정보', `<p class="ap-t"><b>학습 기록에는 학번 · 학과만 남깁니다</b></p><div class="ap-pi"><span>학번</span><span>학과</span></div><p class="mini">이름 · 연락처 · 이메일은 학습 기록에 저장하거나 AI에 보내지 않습니다.</p>`)}
    ${card(8, '변경 이력', hist.length ? `<ul class="ap-log">${hist.map(a => `<li><b>${esc(String(a.what).replace(/^AI 사용 정책 — /, ''))}</b><small>${esc(String(a.at || '').slice(0, 16))} · ${esc(a.who || '')}</small></li>`).join('')}</ul>` : '<p class="mini">바꾼 기록이 아직 없습니다. 바꾸면 누가 · 언제 · 무엇을 바꿨는지 남습니다.</p>')}
    </div></div>`;
  }
  /* 저장: 값 하나를 바꿀 때마다 즉시 저장 + 감사 기록 */
  function put(patch, what) { if (!canEdit()) { toast('AI 사용 정책은 정운영자만 바꿀 수 있습니다.', 'warn'); return false; }
    const cur = val(); S.aipol = { ...cur, ...patch, on: patch.on !== undefined ? !!patch.on : !!(S.aipol && S.aipol.on), v: 1, at: nowStr(), by: (S.me && S.me.name) || '' };
    logAudit('AI 사용 정책 — ' + what); save(); render(); toast('저장했습니다.', 'ok'); return true; }
  ACT['ap-on'] = () => { const v = !val().on; put({ on: v }, `Ver2 학습 루프 ${v ? '켜기' : '끄기'}`); };
  ACT['ap-pre'] = el => { UI.apPre = el.dataset.v; render(); };
  ACT['ap-apply'] = () => { const pt = UI.apPre || S.org.type; const P = presetFor(pt); const L = overMax(P.max); if (!put({ lvl: P.lvl, preset: { ...P.preset }, max: P.max }, `프리셋 적용(${TYN[pt] || pt})`)) return; if (L.length) fixOver(P.max, L); };
  function fixOver(maxL, L) { L.forEach(([, it]) => { it.ai.lvl = maxL; }); const nm = L.map(([c, it]) => `${c.name} · ${it.title}`);
    logAudit(`AI 사용 정책 — 최대 레벨 초과 항목 ${L.length}건을 ${maxL}로 맞춤`);
    (S.admins || []).filter(a => a.role === 'teacher').forEach(a => { if (typeof c2Notify === 'function') c2Notify(a.id, '과제 AI 레벨이 조정되었습니다', `기관 최대 레벨이 ${maxL}로 바뀌어 ${nm.slice(0, 5).join(', ')}${nm.length > 5 ? ` 외 ${nm.length - 5}건` : ''}을 ${maxL}로 맞췄습니다.`); });
    save(); render(); modal('최대 레벨 초과 항목을 맞췄습니다', `<p>기관 최대 레벨(${maxL} ${esc(NM[maxL])})보다 높던 항목 ${L.length}건을 ${maxL}로 맞추고 ${esc(T('teacher'))}에게 알렸습니다.</p><ul class="ap-ul">${nm.slice(0, 20).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`, [{ id: 'c', label: '확인' }]); }
  ACT['ap-set'] = el => { const k = el.dataset.k, l = el.dataset.v; if (!okL(l)) return; const V = val();
    if (k === 'max') { const L = overMax(l); const P = { max: l, preset: { exam: idx(V.preset.exam) > idx(l) ? l : V.preset.exam, assign: idx(V.preset.assign) > idx(l) ? l : V.preset.assign } }; P.lvl = P.preset.assign; if (!put(P, `기관 최대 레벨 ${l}`)) return; if (L.length) fixOver(l, L); return; }
    if (idx(l) > idx(V.max)) { toast(`기관 정책상 ${V.max}까지 선택할 수 있습니다.`, 'warn'); return; }
    const pre = { ...V.preset, [k]: l }; put(k === 'assign' ? { preset: pre, lvl: l } : { preset: pre }, `${k === 'exam' ? '시험' : '과제'} 기본 레벨 ${l}`); };
  ACT['ap-ret'] = el => { const k = el.dataset.v; if (!RET[k]) return; const V = val(); if (k === V.retain) return;
    if (RANK[k] < RANK[V.retain]) { if (!canEdit()) return toast('AI 사용 정책은 정운영자만 바꿀 수 있습니다.', 'warn'); const n = Array.isArray(S.aiTurns) ? S.aiTurns.length : 0;
      modal('보존 기간 줄이기', `<p>보존 기간을 줄이면 기간이 지난 대화 ${n}건이 바로 삭제됩니다. 계속하시겠습니까?</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '계속', kind: 'red', run: () => { put({ retain: k }, `대화 기록 보존 ${RET[k]}`); } }]); return; }
    put({ retain: k }, `대화 기록 보존 ${RET[k]}`); };
  ACT['ap-notice'] = () => { const v = !val().evalNotice; put({ evalNotice: v }, `평가 반영 고지 ${v ? '켜기' : '끄기'}`); };
  ACT['ap-train'] = () => { if (!canEdit()) return toast('AI 사용 정책은 정운영자만 바꿀 수 있습니다.', 'warn'); if (val().train) { put({ train: false }, 'AI 모델 학습 사용 끄기'); return; }
    modal('AI 모델 학습에 사용', `<p>기관이 동의한 경우에만 켤 수 있습니다. 켜면 변경 이력에 남습니다.</p><label class="ckl"><input type="checkbox" name="agree"> 기관 동의 문서를 확인했습니다</label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '켜기', kind: 'pri', run: w => { if (!fv(w, 'agree')) { toast('기관 동의 문서를 확인했다는 표시가 있어야 켤 수 있습니다.', 'warn'); return false; } put({ train: true }, 'AI 모델 학습 사용 켜기(기관 동의 확인)'); } }]); };

  /* 설정 화면: 「AI 사용 정책」 카드(slim.js SXC_X 훅) · 본문(mods.js VIEWS.settings 하위 'aipol') */
  window.SXC_X = SXN => { if (!S || !S.me || role() === 'teacher') return []; SXN.aipol = 'AI 사용 정책';
    try { if (window.SX_TIPS && !window.SX_TIPS.aipol) window.SX_TIPS.aipol = ['신규 과제는 기관 기본 레벨로 시작하고, 이미 정한 항목은 바뀌지 않습니다', '시험은 L0(끄기)를 권장합니다', '평가 반영 고지를 켜면 학습자 신뢰가 올라갑니다']; } catch (e) { }
    const V = val(); return [{ k: 'aipol', n: 'AI 사용 정책', i: 'spark', subs: ['aipol'], kw: 'ai 레벨 정책 코치 파트너 에이전트 힌트 보존 대화 기록 고지 모델 학습 ver2 학습 루프',
      sum: V.on ? `과제 ${V.preset.assign} ${NM[V.preset.assign]} · 시험 ${V.preset.exam} ${NM[V.preset.exam]}` : 'Ver2 학습 루프 꺼짐',
      q: () => `<div class="sx-kv"><span>Ver2 학습 루프</span><b>${V.on ? '켜짐' : '꺼짐'}</b></div><div class="sx-kv"><span>과제 · 시험 기본</span><b>${V.preset.assign} · ${V.preset.exam}</b></div><div class="sx-kv"><span>대화 기록 보존</span><b>${esc(RET[V.retain] || '1학기')}</b></div>` }]; };
  { const base = VIEWS.settings; VIEWS.settings = (...a) => { if (UI.settings === 'aipol') { if (role() === 'teacher') return '<div class="empty">AI 사용 정책은 운영자만 볼 수 있습니다.</div>'; return view(); } return base(...a); }; }
  ACT['ap-open'] = () => { if (typeof slSetOpen === 'function') slSetOpen('aipol'); UI.settings = 'aipol'; go('settings'); };

  /* 학습 규칙 · AI 튜터 카드 문구: 정책이 켜진 기관만 보존 값에 맞게(꺼짐은 그대로) */
  if (VIEWS.progress) { const base = VIEWS.progress; VIEWS.progress = (...a) => { const h = base(...a); if (!on()) return h; const V = val();
    return h.replace('대화 내용은 저장하지 않고 횟수만 집계', V.retain === 'none' ? '대화 내용은 저장하지 않고 횟수만 집계 · <a href="#settings" data-act="ap-open">AI 사용 정책에서 관리</a>' : `대화 기록은 ${esc(RET[V.retain])} 보관 후 자동 삭제 · <a href="#settings" data-act="ap-open">AI 사용 정책에서 관리</a>`); }; }

  /* ── 과제 · 퀴즈 · 시험 편집기: AI 사용 수준 카드 + 학습자 미리보기(기능 1) ── */
  const lvOrig = () => { const o = ED && ED.c && (ED.c.curriculum || [])[ED.i]; return o && o.ai && okL(o.ai.lvl) ? o.ai.lvl : ''; };
  const subCount = (c, it) => { const s = new Set(); (((c.subs || {})[it.id]) || []).forEach(x => s.add(x.who)); (((c.tries || {})[it.id]) || []).forEach(x => s.add(x.who)); return s.size; };
  function edBox(it) {
    const V = val(); const own = it.ai && okL(it.ai.lvl) ? it.ai.lvl : ''; const cur = levelOf(it); const k = kindOf(it); const why = (it.ai && it.ai.why) || ''; const sol = !!(it.ai && it.ai.sol);
    const tyN = TYN[S.org.type] || ''; const cards = LV.map(l => { const off = idx(l) > idx(V.max); const def = l === V.preset[k];
      return `<button type="button" role="radio" aria-checked="${l === cur}" class="ap-lv ${l === cur ? 'on' : ''}" data-act="ap-lv" data-v="${l}" ${off ? 'disabled aria-disabled="true"' : ''}><b>${l} ${esc(NM[l])}${def ? ' <em>기본</em>' : ''}</b><small>${esc(ED_D[l])}</small></button>`; }).join('');
    const nWhy = why || WHY0[cur];
    return `<div class="a2sec ap-ed" id="apEd"><div class="ap-edl"><div class="a2h">이 과제의 AI 사용 수준 ${own ? '' : `<span class="tag">기관 기본: ${esc(NM[cur])}</span>`}</div>
      <p class="mini">${esc(tyN)} 프리셋 · ${k === 'exam' ? '시험' : '과제'} 기본 ${esc(V.preset[k])} · L1 코치 — 힌트와 질문만 줍니다(기본)</p>
      <div class="ap-lvs" role="radiogroup" aria-label="이 과제의 AI 사용 수준">${cards}</div>
      ${idx(V.max) < 3 ? `<p class="mini ap-max">기관 정책상 ${esc(V.max)}까지 선택할 수 있습니다.</p>` : ''}
      ${k === 'exam' && idx(cur) > 0 ? '<p class="warn ap-exw">시험에서 AI를 허용합니다. 시험 중에도 AI 튜터를 쓸 수 있게 됩니다.</p>' : ''}
      <label class="fl">레벨 이유(학습자에게 보입니다)<input data-aipol="why" maxlength="80" value="${esc(why)}" placeholder="예: 개념을 스스로 익히는 과제라 힌트만 열어 둡니다"></label>
      <div class="ap-row"><div class="ap-t"><b>최종 풀이 허용</b><span>켜면 힌트 5단계를 모두 거치고 자기 설명을 쓴 ${esc(T('learner'))}에게만 풀이를 보여 줍니다.</span></div>${sw('ap-sol', sol, `최종 풀이 허용 ${sol ? '끄기' : '켜기'}`, cur === 'L0')}</div>
      ${ED.apAsk ? `<p class="warn ap-ask">제출한 ${esc(T('learner'))} ${ED.apAsk}명에게 레벨 변경 알림이 갑니다. 바꾸시겠습니까? 다시 [저장]을 누르면 바꿉니다.</p>` : ''}</div>
      <div class="ap-pv" aria-label="학습자에게 이렇게 보여요"><small class="ap-pvh">학습자에게 이렇게 보여요</small><div class="ap-ban l${cur[1]}"><b>${esc(LBAN[cur])}</b><span id="apWhy">${esc(nWhy)}</span>${V.evalNotice && cur !== 'L0' ? '<small>이 과제의 AI 대화는 평가에 참고될 수 있어요.</small>' : ''}</div>
      ${cur === 'L0' ? `<p class="mini">AI 튜터 버튼이 숨고 「선생님께 질문 넘기기」만 보입니다${k === 'exam' ? '(시험 중에는 이것도 숨김)' : ''}.</p>` : `<ol class="ap-steps">${['개념 질문', '방향 힌트', '부분 예시', '반례', '풀이'].map((s, i) => `<li class="${i === 4 && !sol && cur !== 'L3' ? 'off' : ''}">${i + 1} ${s}${i === 4 && !sol && cur !== 'L3' ? ' · 허용 안 됨' : ''}</li>`).join('')}</ol>`}</div></div>`;
  }
  { const base = edRender; edRender = function (...a) { base(...a); try { if (!on() || !ED || !ED.it || !KINDS.includes(ED.it.type)) return; const b = $('#edBody'); if (!b) return; const f = b.querySelector('label.fl'); const h = edBox(ED.it); if (f) f.insertAdjacentHTML('afterend', h); else b.insertAdjacentHTML('afterbegin', h); } catch (e) { console.error(e); } }; } /* eslint-disable-line no-global-assign */
  const edAi = () => { const it = ED.it; if (!it.ai || typeof it.ai !== 'object') it.ai = {}; return it.ai; };
  ACT['ap-lv'] = el => { if (!ED || !ED.it) return; const l = el.dataset.v; const V = val(); if (!okL(l)) return; if (idx(l) > idx(V.max)) { toast(`기관 정책상 ${V.max}까지 선택할 수 있습니다.`, 'warn'); return; }
    const A = edAi(); A.lvl = l; if (A.sol === undefined) A.sol = false; if (l === 'L0') A.sol = false; ED.apAsk = 0; edRender(); };
  ACT['ap-sol'] = () => { if (!ED || !ED.it) return; const A = edAi(); if (!A.lvl) A.lvl = levelOf(ED.it); A.sol = !A.sol; edRender(); };
  document.addEventListener('input', e => { const el = e.target; if (!ED || !el.dataset || el.dataset.aipol !== 'why' || !el.closest('#edBody')) return; const A = edAi(); if (!A.lvl) A.lvl = levelOf(ED.it); A.why = el.value.slice(0, 80); const w = $('#apWhy'); if (w) w.textContent = A.why || WHY0[A.lvl] || ''; });
  /* 제출이 있는 항목의 레벨을 바꾸면 한 번 더 확인하고 제출한 학습자에게 알린다 */
  { const base = edSave; edSave = (...a) => { try { if (on() && ED && ED.it && KINDS.includes(ED.it.type) && ED.it.ai && okL(ED.it.ai.lvl)) { const o = lvOrig(); const nl = ED.it.ai.lvl;
        if (o !== nl) { const c = ED.c, it = ED.it; const n = subCount(c, it); if (n && !ED.apOk) { ED.apAsk = n; ED.apOk = true; edRender(); return false; }
          if (n) { const who = new Set([...(((c.subs || {})[it.id]) || []), ...(((c.tries || {})[it.id]) || [])].map(x => x.who)); who.forEach(id => { if (typeof c2Notify === 'function') c2Notify(id, `「${it.title}」 AI 사용 수준 변경`, `${LBAN[nl]}`); }); }
          logAudit(`${c.name} · ${it.title} AI 레벨 ${o || '기관 기본'} → ${nl}${n ? ` · 제출 ${n}명 알림` : ''}`); } } } catch (e) { console.error(e); } return base(...a); }; } /* eslint-disable-line no-global-assign */

  /* ── 학습자 게시본: 켜진 기관만 정책 요약 · 항목 레벨을 싣는다(꺼짐은 게시본 그대로) ── */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const pub = base(...a); try { if (!on() || !pub) return pub; const V = val();
      pub.aipol = { on: true, lvl: V.lvl, retain: V.retain, evalNotice: !!V.evalNotice };
      (pub.classes || []).forEach(c => { const src = (S.classes || []).find(x => x.id === c.id); if (!src) return; (c.items || []).forEach(x => { if (!KINDS.includes(x.type)) return; const it = (src.curriculum || []).find(y => y.id === x.id); if (!it) return; const l = levelOf(it); x.ai = { lvl: l, why: String((it.ai && it.ai.why) || '').slice(0, 80), sol: !!(it.ai && it.ai.sol) }; }); });
    } catch (e) { console.error(e); } return pub; }; } /* eslint-disable-line no-global-assign */
})();
