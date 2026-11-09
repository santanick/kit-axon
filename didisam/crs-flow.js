/* v35 crs-flow — 과정 만들기 단일 흐름 엔진(C1). BRIEF_CRS.md '인터페이스' window.CF.
   - 모든 진입점(cls-new · ai-design · sla-clsnew · 빈 상태 카드 · 가이드)을 CF.open으로 모은다. 예전 마법사는 ACT['cls-new-adv'] · ACT['ai-design-adv']로 남긴다.
   - 생성 함수 통일: CF.create(d). makeCourse는 CF.create를 감싸 호출자 호환, dsCreate · wzSave는 수료 기준 기본값(CF.DEF)을 맞춘다.
   - 단계: CF.steps [{id, title(d), now(d), render(el,d), valid(d)→[문제], aiFill(d)→Promise}] · 유형 설정 CF.cfg[key](C2) · 'fill'은 CT.renderFill(C3)이 있으면 그것.
   - 초안: S.crsDraft {v, key, step, d, from, at} — 입력할 때마다 자동 저장, 다시 열면 [이어서 하기]를 먼저 묻는다.
   - 이벤트: CF.on('open'|'close'|'step'|'change'|'next'|'idle'|'error'|'back'|'create'|'undo', fn) → 끄기 함수. */
(function () {
  'use strict';
  const H = {}; const on = (ev, fn) => { (H[ev] = H[ev] || []).push(fn); return () => { H[ev] = (H[ev] || []).filter(f => f !== fn); }; };
  const emit = (ev, x) => (H[ev] || []).slice().forEach(f => { try { f(x, CF); } catch (e) { console.error('CF.on', ev, e); } });
  const T = k => { const c = cfgOf(); return (c && c.terms && c.terms[k]) || (typeof t === 'function' ? t(k) : k); };
  const josa = (w, a) => { const s = String(w || ''); const ch = s.charCodeAt(s.length - 1); const jong = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : 0; const P = { '을': ['을', '를'], '이': ['이', '가'], '은': ['은', '는'], '과': ['과', '와'], '으로': ['으로', '로'] }[a]; return s + (P ? (jong && !(a === '으로' && jong === 8) ? P[0] : P[1]) : a); };
  const cfgKey = () => { const o = (typeof S !== 'undefined' && S && S.org) || {}; return o.type === 'univ' && o.ed === 'lms' ? 'univ_lms' : (o.type || 'adult'); };
  const cfgOf = () => { const k = cfgKey(); return CF.cfg[k] || (k === 'univ_lms' ? CF.cfg.univ : null) || null; };
  const U = () => (typeof S !== 'undefined' && S && S.org && S.org.type) === 'univ';
  const unit = d => { const c = cfgOf(); try { if (c && typeof c.unit === 'function') return c.unit(d || {}) || '차시'; } catch (e) { } return U() ? '주차' : '차시'; };
  /* 기본값 하나(수료 기준 등) — 모든 생성 경로가 이 값을 쓴다. 유형별 차이는 cfg.defaults(C2). */
  const DEF = { criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, cert: 'auto', open: '비공개', days: 90, mins: 60, price: 0, auto: { video: 'youtube', docs: true, quiz: true, assign: true, exam: true } };
  const defs = () => { const c = cfgOf(); const x = (c && c.defaults) || {}; return { ...DEF, ...x, criteria: { ...DEF.criteria, ...(x.criteria || {}) }, auto: { ...DEF.auto, ...(x.auto || {}) } }; };

  /* ───────── 초안 · 자동 저장 · 되돌리기 ───────── */
  let F = null; /* 열린 흐름 { d, step(index), ids, from, undo[], backs, errs{}, idleT, el } */
  let saveT = 0;
  const saveDraft = () => { if (!F || typeof S === 'undefined' || !S) return; clearTimeout(saveT); S.crsDraft = { v: 1, key: cfgKey(), step: F.ids[F.step] || 'basic', d: F.d, from: F.from, at: Date.now() }; try { save(); } catch (e) { } paintSaved(); };
  const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(saveDraft, 400); };
  const dropDraft = () => { if (typeof S !== 'undefined' && S) { delete S.crsDraft; try { save(); } catch (e) { } } };
  const hasDraft = () => { const x = typeof S !== 'undefined' && S && S.crsDraft; return !!(x && x.d && x.key === cfgKey() && (x.d.name || (x.d.weekPlan || []).length)); };
  const snap = (label) => { if (!F) return; F.undo.push({ label: label || '바꾼 내용', d: JSON.stringify(F.d), step: F.step }); if (F.undo.length > 20) F.undo.shift(); };
  const undo = () => { if (!F || !F.undo.length) return; const u = F.undo.pop(); F.d = JSON.parse(u.d); F.step = u.step; saveDraft(); paint(); emit('undo', { step: F.ids[F.step], label: u.label }); toast(`'${u.label}'을(를) 되돌렸습니다.`, 'ok'); };

  /* ───────── 공용 화면 조각(C2 · C3도 씀): CF.ui ───────── */
  const aiBtn = (k, label) => `<button type="button" class="cf-ai" data-cfai="${esc(k)}">${typeof ic === 'function' ? ic('spark', 16) : '✦'} ${esc(label || 'AI SAM이 채워 주기')}</button>`;
  const exLine = ex => ex ? `<p class="cf-ex"><b>예:</b> ${esc(String(ex).replace(/^예:\s*/, ''))}</p>` : '';
  const later = () => '<span class="cf-later">나중에 해도 돼요</span>';
  const errLine = k => { const m = F && F.bad && F.bad[k]; return m ? `<p class="cf-err" role="alert">${esc(m)}</p>` : ''; };
  const ui = {
    /* f = { k, label, kind:'text'|'area'|'num'|'choice'|'days'|'time'|'date'|'toggle'|'code', ex, later, ai(bool|label), opts:[[v,l]], unit, min, max, len, hint, max_len } */
    field(f, d) {
      d = d || (F && F.d) || {}; const v = d[f.k]; const id = 'cf_' + f.k; const kind = f.kind || 'text';
      let inp = '';
      if (kind === 'area') inp = `<textarea id="${id}" data-cf="${esc(f.k)}" data-k="${esc(f.k)}" name="${esc(f.k)}" rows="${f.rows || 4}" maxlength="${f.maxLen || 2000}">${esc(v || '')}</textarea>`;
      else if (kind === 'num') inp = `<div class="cf-num"><button type="button" class="cf-nb" data-cfnum="${esc(f.k)}" data-d="-1" aria-label="줄이기">−</button><input id="${id}" type="number" inputmode="numeric" data-cf="${esc(f.k)}" data-k="${esc(f.k)}" name="${esc(f.k)}" data-num="1" value="${esc(v ?? f.def ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}><button type="button" class="cf-nb" data-cfnum="${esc(f.k)}" data-d="1" aria-label="늘리기">+</button>${f.unit ? `<span class="cf-unit">${esc(f.unit)}</span>` : ''}</div>`;
      else if (kind === 'choice') inp = `<div class="cf-choice" role="radiogroup" aria-label="${esc(f.label)}">${(f.opts || []).map(([ov, ol, os]) => `<button type="button" role="radio" aria-checked="${String(v) === String(ov)}" class="${String(v) === String(ov) ? 'on' : ''}" data-cfset="${esc(f.k)}" data-v="${esc(ov)}"><b>${esc(ol)}</b>${os ? `<small>${esc(os)}</small>` : ''}</button>`).join('')}</div>`;
      else if (kind === 'toggle') inp = `<label class="cf-tog"><input type="checkbox" id="${id}" data-cf="${esc(f.k)}" data-k="${esc(f.k)}" name="${esc(f.k)}" data-bool="1" ${v ? 'checked' : ''}><span>${esc(f.on || '예')}</span></label>`;
      else if (kind === 'days') { const D = ['일', '월', '화', '수', '목', '금', '토']; const L = Array.isArray(v) ? v : []; inp = `<div class="cf-days" role="group" aria-label="${esc(f.label)}">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button type="button" aria-pressed="${L.includes(i)}" class="${L.includes(i) ? 'on' : ''}" data-cfday="${esc(f.k)}" data-v="${i}">${D[i]}</button>`).join('')}</div>`; }
      else inp = `<input id="${id}" type="${kind === 'time' || kind === 'date' ? kind : 'text'}" data-cf="${esc(f.k)}" data-k="${esc(f.k)}" name="${esc(f.k)}" value="${esc(v || '')}" ${kind === 'code' && f.len ? `maxlength="${f.len}" inputmode="numeric"` : `maxlength="${f.maxLen || 60}"`}>`;
      const lab = kind === 'choice' || kind === 'days' ? `<span class="cf-lab" id="${id}_l">${esc(f.label)}${f.req ? ' <em class="cf-req">꼭 적어요</em>' : ''}${f.later ? ' ' + later() : ''}</span>` : `<label class="cf-lab" for="${id}">${esc(f.label)}${f.req ? ' <em class="cf-req">꼭 적어요</em>' : ''}${f.later ? ' ' + later() : ''}</label>`;
      return `<div class="cf-f ${F && F.bad && F.bad[f.k] ? 'bad' : ''}" data-cff="${esc(f.k)}">${lab}${inp}${exLine(f.ex)}${f.hint ? `<p class="cf-hint">${esc(f.hint)}</p>` : ''}${f.ai ? aiBtn(f.k, typeof f.ai === 'string' ? f.ai : '') : ''}${errLine(f.k)}</div>`;
    },
    note: (txt, tone) => `<div class="cf-note ${tone || ''}">${txt}</div>`,
    aiBtn, exLine, later, esc: v => esc(v)
  };
  const shown = (f, d) => { try { return !f.show || f.show(d); } catch (e) { return true; } };
  const askOf = id => { const c = cfgOf(); return (c && c.ask && Array.isArray(c.ask[id])) ? c.ask[id] : null; };
  const ex = (k, dflt) => { const c = cfgOf(); return (c && c.examples && c.examples[k]) || dflt; };
  const required = () => { const c = cfgOf(); return (c && c.required) || ['name']; };

  /* ───────── 규칙 생성(데모 AI) — 서버 모드여도 같은 결과를 즉시 준다 ───────── */
  const N = d => clamp(+d.sessions || (U() ? 15 : 6), 1, 60);
  const designW = d => { if (typeof AI === 'undefined' || !AI.design) return []; return AI.design({ topic: d.name || d.topic || '새 과정', weeks: Math.min(30, N(d)), univ: U(), quiz: true, assign: true, exam: true, vids: 1, level: '보통', vsrc: 'youtube' }); };
  const planOf = d => { const c = cfgOf(); try { return (c && typeof c.plan === 'function' && c.plan(d)) || {}; } catch (e) { return {}; } };
  const planFrom = d => { const pw = +planOf(d).weeks; const n = pw ? clamp(pw, 1, 60) : N(d); const W = designW({ ...d, sessions: n }); const out = []; for (let i = 1; i <= n; i++) { const w = W[i - 1]; out.push({ w: i, title: w ? w.title : `${i}${unit(d) === '회차' ? '회차' : unit(d) === '주차' ? '주차' : '차시'} 수업`, goal: w ? (w.goal || '') : '' }); } return out; };
  const fieldAI = (k, d) => {
    const nm = (d.name || d.topic || '').trim();
    if (k === 'name') return nm || ex('nameAI', U() ? '생성형 AI와 글쓰기' : '업무에 바로 쓰는 생성형 AI');
    if (k === 'target') return ex('targetAI', { k12: '중학교 2학년', univ: '비전공 1학년', corp: '입사 1년 차 임직원', voc: '취업 준비 중인 훈련생', lifelong: '배움을 다시 시작하는 지역 주민', public: '구민 누구나' }[S.org.type] || '처음 배우는 직장인');
    if (k === 'goal') return typeof AI !== 'undefined' && AI.goal ? AI.goal(nm || '새 과정', d.target || '') : `${nm}의 기본을 익히고 바로 써 봅니다.`;
    if (k === 'sessions') return U() ? 15 : 6;
    return d[k];
  };

  /* ───────── 기본 단계 ───────── */
  const tplCards = d => { const c = cfgOf(); const L = (c && c.templates) || []; if (!L.length) return ''; return `<div class="cf-tpl"><p class="cf-lab">이런 ${esc(T('cls'))}가 많아요 <span class="cf-later">눌러서 시작하면 칸이 채워져요</span></p><div class="cf-tplg">${L.slice(0, 6).map(x => `<button type="button" class="${d.tpl === x.id ? 'on' : ''}" data-cftpl="${esc(x.id)}">${x.icon && typeof ic === 'function' ? ic(x.icon, 18) : ''}<b>${esc(x.name)}</b>${x.desc ? `<small>${esc(x.desc)}</small>` : ''}</button>`).join('')}</div></div>`; };
  const askBlock = (id, d, fallback) => { const A = askOf(id); const L = A || fallback; const req = required(); return L.filter(f => shown(f, d)).map(f => ui.field({ ...f, req: f.req != null ? f.req : req.includes(f.k) && !f.later }, d)).join(''); };
  const BASIC = () => [
    { k: 'name', label: `${T('cls')} 이름`, ex: ex('name', U() ? '생성형 AI와 글쓰기' : S.org.type === 'k12' ? '중2 수학 내신반' : '엑셀 실무 기초'), ai: true, maxLen: 50 },
    { k: 'target', label: '누가 배우나요', ex: ex('target', S.org.type === 'k12' ? '중학교 2학년' : U() ? '비전공 1학년' : '입사 1년 차 직원'), ai: true, later: true, maxLen: 40 },
    { k: 'goal', label: '무엇을 배우나요', kind: 'area', rows: 3, ex: ex('goal', '엑셀 함수와 표 정리를 익혀 매일 하는 보고서를 30분 안에 끝냅니다.'), ai: true, later: true }];
  const steps = [
    { id: 'basic', title: () => '무엇을 · 누구에게', now: () => `${josa(T('cls'), '의')} 이름과 배울 사람을 적어 주세요.`.replace('의의', '의'),
      render(el, d) { el.innerHTML = tplCards(d) + askBlock('basic', d, BASIC()); },
      valid(d) { const P = []; if (!String(d.name || '').trim()) P.push({ k: 'name', msg: `${T('cls')} 이름을 적어 주세요. 모르겠으면 [AI SAM이 채워 주기]를 누르세요.` }); return P; },
      aiFill(d) { ['name', 'target', 'goal'].forEach(k => { if (!String(d[k] || '').trim()) d[k] = fieldAI(k, d); }); return Promise.resolve(d); } },
    { id: 'outline', title: d => `${unit(d)} 목록`, now: d => `몇 번 수업하는지 정하고, ${unit(d)}마다 제목을 확인해 주세요.`,
      render(el, d) {
        const u = unit(d); if (!Array.isArray(d.weekPlan)) d.weekPlan = [];
        const head = askBlock('outline', d, [{ k: 'sessions', label: `몇 ${u}인가요`, kind: 'num', min: 1, max: 60, unit: u, ex: U() ? '한 학기 15주' : '주 1회 6주면 6' }]);
        const L = d.weekPlan;
        el.innerHTML = head + `<div class="cf-ol"><div class="cf-olh"><span class="cf-lab">${esc(u)}별 제목</span>${aiBtn('weekPlan', L.length ? '제목 다시 만들기' : `AI SAM이 ${u} 목록 만들기`)}</div>` +
          (L.length ? `<ol class="cf-wl">${L.map((w, i) => `<li><span class="cf-wn">${i + 1}</span><input value="${esc(w.title)}" maxlength="60" data-cfw="${i}" aria-label="${i + 1}${esc(u)} 제목"><button type="button" class="cf-ib" data-cfwmv="${i}" data-d="-1" aria-label="위로" ${i ? '' : 'disabled'}>↑</button><button type="button" class="cf-ib" data-cfwdel="${i}" aria-label="${i + 1}${esc(u)} 지우기">✕</button></li>`).join('')}</ol><button type="button" class="cf-add" data-cfwadd="1">+ ${esc(u)} 하나 더</button>`
            : `<div class="cf-emp"><p>아직 ${esc(u)} 목록이 없습니다.</p><p>[AI SAM이 ${esc(u)} 목록 만들기]를 누르면 제목이 채워집니다. 직접 쓰려면 아래를 누르세요.</p><button type="button" class="cf-add" data-cfwadd="1">+ 직접 쓰기</button></div>`) + errLine('weekPlan') + '</div>';
      },
      valid(d) { const P = []; if (!(d.weekPlan || []).length) P.push({ k: 'weekPlan', msg: `${unit(d)} 목록이 비어 있습니다. [AI SAM이 ${unit(d)} 목록 만들기]를 누르거나 하나 이상 적어 주세요.` }); else if (d.weekPlan.some(w => !String(w.title || '').trim())) P.push({ k: 'weekPlan', msg: '제목이 빈 줄이 있습니다. 제목을 적거나 ✕로 지워 주세요.' }); return P; },
      aiFill(d) { d.weekPlan = planFrom(d); d.sessions = d.weekPlan.length; return Promise.resolve(d); } },
    { id: 'fill', title: d => `${unit(d)} 채우기`, now: d => `${unit(d)}마다 넣을 강의 영상 · 교안 · 퀴즈를 고르세요. 나중에 채워도 됩니다.`,
      render(el, d) { if (window.CT && typeof CT.renderFill === 'function') { try { return CT.renderFill(el, d); } catch (e) { console.error('CT.renderFill', e); } } fillDefault(el, d); },
      valid() { return []; },
      aiFill(d) { if (window.CT && typeof CT.aiFill === 'function') return Promise.resolve(CT.aiFill(d)).then(() => d); d.auto = { ...defs().auto, ...(d.auto || {}) }; return Promise.resolve(d); } },
    { id: 'setup', title: () => '수강 설정', now: () => `${T('fee')}와 수강 기간, 공개 범위를 정해 주세요.`,
      render(el, d) {
        const D = defs(); if (d.paid == null && !askOf('setup')) d.paid = (+d.price || 0) > 0; if (d.days == null) d.days = D.days; if (d.open == null) d.open = '전체';
        el.innerHTML = askBlock('setup', d, [
          { k: 'paid', label: T('fee'), kind: 'choice', opts: [[false, '무료', '누구나 바로 신청'], [true, '유료', '금액을 정해요']] },
          { k: 'price', label: `${T('fee')}(원)`, kind: 'num', min: 0, max: 100000000, unit: '원', ex: '150000 (15만 원)', show: x => x.paid === true || x.paid === 'true' },
          { k: 'days', label: '수강 기간', kind: 'choice', opts: [[30, '30일'], [60, '60일'], [90, '90일'], [180, '180일']], hint: '신청한 날부터 이 기간 동안 들을 수 있습니다.' },
          { k: 'open', label: '누구에게 보이나요', kind: 'choice', opts: [['전체', '모두에게 공개', '홈페이지에 바로 보여요'], ['지정 회원', '정한 사람만', '초대한 사람만 들어요'], ['비공개', '아직 숨겨 두기', '준비가 끝나면 공개해요']] }]) +
          ui.note(`수료 기준은 기본값(진도 ${D.criteria.video} · 시험 ${D.criteria.exam} · 과제 ${D.criteria.assign}, ${D.criteria.threshold}점 이상)을 씁니다. 만든 뒤 설정 탭에서 바꿀 수 있습니다.`) +
          `<p class="cf-adv">회차 · 요일반 · 구독처럼 세부 운영이 필요하면 <button type="button" class="linkb" data-act="cls-new-adv">자세한 설정으로 만들기</button></p>`;
      },
      valid(d) { const P = []; if ((d.paid === true || d.paid === 'true') && !(+d.price > 0)) P.push({ k: 'price', msg: `유료라면 ${T('fee')}를 적어 주세요. 무료면 '무료'를 누르세요.` }); return P; },
      aiFill(d) { const D = defs(); if (d.paid == null) d.paid = false; if (d.days == null) d.days = D.days; if (d.open == null) d.open = '전체'; return Promise.resolve(d); } },
    { id: 'open', title: () => '미리보기 · 개설', now: () => `${T('learner')}에게 보일 모습을 확인하고 [개설하기]를 누르세요.`,
      render(el, d) { el.innerHTML = previewHTML(d); },
      valid() { return []; },
      aiFill(d) { return Promise.resolve(d); } }
  ];
  const AUTO = [['video', '강의 영상', '차시마다 영상 1개(YouTube 추천 또는 AI 영상)', 'play'], ['docs', '교안', '차시마다 강의자료 초안', 'doc'], ['quiz', '확인 퀴즈', '차시마다 5문항', 'check'], ['assign', '과제', '실습 과제 + 채점 기준', 'pen'], ['exam', '최종 평가', '마지막에 시험 1번', 'flag']];
  function fillDefault(el, d) {
    const A = d.auto = { ...defs().auto, ...(d.auto || {}) }; const u = unit(d); const items = d.curriculum || [];
    el.innerHTML = `<p class="cf-lab">${esc(u)}마다 자동으로 넣을 것 <span class="cf-later">나중에 해도 돼요</span></p><div class="cf-auto">${AUTO.map(([k, l, s, i]) => { const onV = k === 'video' ? A.video !== 'none' : !!A[k]; return `<button type="button" class="${onV ? 'on' : ''}" aria-pressed="${onV}" data-cfauto="${k}">${typeof ic === 'function' ? ic(i, 20) : ''}<b>${esc(l)}</b><small>${esc(s)}</small><span class="cf-ck">${onV ? '넣어요' : '빼요'}</span></button>`; }).join('')}</div>` +
      (A.video !== 'none' ? ui.field({ k: '_vsrc', label: '강의 영상은 어떻게 준비할까요', kind: 'choice', opts: [['youtube', 'YouTube에서 추천', '알맞은 영상을 찾아 연결'], ['ai', 'AI로 강의 영상 만들기', '슬라이드 + 음성(미리보기 품질)']] }, { _vsrc: A.video }) : '') +
      ui.note(`${(d.weekPlan || []).length}개 ${esc(u)}에 위 내용을 초안으로 넣습니다. 만든 뒤 ${esc(u)}을 눌러 영상 · 교안을 바꾸거나 파일을 올릴 수 있습니다.${items.length ? ` 직접 넣은 콘텐츠 ${items.length}개는 그대로 씁니다.` : ''}`);
  }
  function previewHTML(d) {
    const c = cfgOf(); const u = unit(d); const L = d.weekPlan || []; const paid = d.paid == null ? +d.price > 0 : (d.paid === true || d.paid === 'true');
    let sum = [['배울 사람', d.target || '누구나'], [`${u} 수`, `${L.length}${u === '회차' ? '회' : '개'}`], [T('fee'), paid && +d.price ? won(d.price) : '무료'], ['수강 기간', `신청 후 ${d.days || defs().days}일`], ['공개', { 전체: '모두에게 공개', '지정 회원': '정한 사람만', 비공개: '아직 숨겨 두기' }[d.open] || d.open || '모두에게 공개']];
    try { if (c && typeof c.summary === 'function') { const x = c.summary(d); if (Array.isArray(x) && x.length) sum = [sum[0], [`${u} 수`, sum[1][1]], ...x].filter((r, i, A) => A.findIndex(y => y[0] === r[0]) === i); } } catch (e) { }
    const W = checks(d);
    return `<p class="cf-lab">${esc(T('learner'))}에게 이렇게 보여요</p><div class="cf-pv"><div class="cf-pvh"><span class="cf-pvt">${esc(T('cls'))}</span><b>${esc(d.name || '이름 없음')}</b>${d.goal ? `<p>${esc(String(d.goal).slice(0, 160))}</p>` : ''}</div>
      <dl class="cf-pvs">${sum.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      <ol class="cf-pvl">${L.slice(0, 8).map((w, i) => `<li><span>${i + 1}</span>${esc(w.title)}</li>`).join('')}${L.length > 8 ? `<li class="more">… 외 ${L.length - 8}개</li>` : ''}</ol><div class="cf-pvb"><span class="btn pri">신청하기</span></div></div>` +
      (W.length ? `<div class="cf-chk">${W.map(w => `<p class="cf-c ${esc(w.lv || 'warn')}"><b>${w.lv === 'stop' ? '꼭 고쳐요' : w.lv === 'info' ? '참고' : '확인해요'}</b> ${esc(w.msg)}${w.law ? ` <small>(${esc(w.law)})</small>` : ''}${w.fix ? ` <button type="button" class="linkb" data-cffix="${esc(JSON.stringify(w.fix))}">이렇게 고치기</button>` : ''}</p>`).join('')}</div>` : '');
  }
  const checks = d => { const c = cfgOf(); try { return (c && typeof c.check === 'function' && c.check(d)) || []; } catch (e) { console.error('cfg.check', e); return []; } };

  /* ───────── 단계 목록(cfg.steps 순서) ───────── */
  const stepIds = () => { const c = cfgOf(); const ids = (c && Array.isArray(c.steps) && c.steps.length ? c.steps : steps.map(s => s.id)).filter(id => steps.some(s => s.id === id)); return ids.length ? ids.slice(0, 5) : ['basic', 'open']; };
  const stepOf = id => steps.find(s => s.id === id);
  const titleOf = (id, d) => { const c = cfgOf(); const x = c && c.stepTitle && c.stepTitle[id]; if (x) return typeof x === 'function' ? x(d || {}) : x; return stepOf(id).title(d || {}); };

  /* ───────── 열기 · 그리기 ───────── */
  function open(opts) {
    opts = opts || {}; if (typeof S === 'undefined' || !S || !S.org) return;
    const c = cfgOf(); if (c && typeof c.redirect === 'function') { try { if (c.redirect(opts) !== false) return; } catch (e) { console.error('cfg.redirect', e); } }
    if (S.me && S.me.role === 'teacher' && window.LIVE && LIVE.user && LIVE.user.role === 'teacher') { toast(`${T('teacher')} 권한으로는 ${josa(T('cls'), '을')} 만들 수 없습니다.`, 'warn'); return; }
    try { closeModal(); } catch (e) { }
    if (!opts.fresh && hasDraft() && !opts._asked) return askResume(opts);
    const D = defs(); const base = opts.resume && S.crsDraft ? JSON.parse(JSON.stringify(S.crsDraft.d)) : { sessions: U() ? 15 : 6, auto: { ...D.auto } };
    const p = { ...(opts.prefill || {}) }; if (p.topic && !p.name) p.name = p.topic; if (Array.isArray(p.outline) && !p.weekPlan) p.weekPlan = p.outline.map((w, i) => ({ w: i + 1, title: w.title || String(w), goal: w.goal || '' })); if (Array.isArray(p.items) && !p.curriculum) p.curriculum = p.items; if (p.weeks && !p.sessions) p.sessions = p.weeks; Object.assign(base, p);
    if (p.sessions && !(p.weekPlan) && !opts.resume) base.weekPlan = base.weekPlan || [];
    F = { d: base, ids: stepIds(), step: 0, from: opts.from || 'menu', undo: [], backs: 0, errs: {}, bad: {}, idle: {}, opts };
    const want = opts.step || (opts.resume && S.crsDraft.step); const i = F.ids.indexOf(want); if (i >= 0) F.step = i;
    mount(); paint(); emit('open', { from: F.from, step: F.ids[F.step], resume: !!opts.resume, prefill: p });
    if (opts.autofill) aiStep();
  }
  function askResume(opts) {
    const x = S.crsDraft; const nm = x.d.name || '이름 없는 ' + T('cls'); const sid = x.step; const si = stepIds().indexOf(sid);
    mount(); F = null;
    $('#crsFlow').innerHTML = `<div class="cf-box cf-resume" role="dialog" aria-modal="true" aria-label="이어서 만들기"><div class="cf-rb"><p class="cf-now">만들던 ${esc(T('cls'))}가 있습니다</p><h2>${esc(nm)}</h2><p class="cf-sub">${si >= 0 ? `${si + 1}단계 '${esc(titleOf(sid, x.d))}'까지 했습니다.` : ''} 이어서 할까요?</p>
      <div class="cf-rbb"><button type="button" class="btn pri cf-big" data-cfgo="resume">이어서 하기</button><button type="button" class="btn cf-big" data-cfgo="fresh">새로 만들기</button></div><p class="cf-hint">새로 만들어도 지금 초안은 [되돌리기]로 되찾을 수 있습니다.</p><button type="button" class="linkb" data-cfgo="close">닫기</button></div></div>`;
    CF._pending = opts;
  }
  function mount() {
    let w = $('#crsFlow'); if (!w) { w = document.createElement('div'); w.id = 'crsFlow'; w.className = 'crsf'; w.dataset.crsFlow = '1'; document.body.appendChild(w); bind(w); }
    document.body.classList.add('cf-on'); return w;
  }
  function close(keep) {
    if (F) { if (keep !== false) saveDraft(); emit('close', { step: F.ids[F.step], kept: keep !== false }); }
    clearTimeout(F && F.idleT); F = null; const w = $('#crsFlow'); if (w) w.remove(); document.body.classList.remove('cf-on');
  }
  function paint() {
    if (!F) return; const w = mount(); const id = F.ids[F.step]; const st = stepOf(id); w.dataset.step = id; const d = F.d; const n = F.ids.length; const last = F.step === n - 1;
    const prog = F.ids.map((sid, i) => `<li class="${i < F.step ? 'done' : i === F.step ? 'on' : ''}" ${i === F.step ? 'aria-current="step"' : ''}><button type="button" data-cfjump="${i}" ${i > F.step ? 'disabled' : ''}><span class="cf-dot">${i < F.step ? '✓' : i + 1}</span><span class="cf-sl">${esc(titleOf(sid, d))}</span></button></li>`).join('');
    w.innerHTML = `<div class="cf-box" role="dialog" aria-modal="true" aria-label="${esc(T('cls'))} 만들기">
      <header class="cf-hd"><div class="cf-ht"><b>${esc(T('cls'))} 만들기</b><span class="cf-saved" aria-live="polite"></span></div><button type="button" class="cf-x" data-cfgo="later" aria-label="닫기(나중에 이어서 하기)">${typeof ic === 'function' ? ic('x', 20) : '✕'}</button></header>
      <ol class="cf-prog" aria-label="진행 ${F.step + 1}/${n}">${prog}</ol>
      <div class="cf-nowb"><p class="cf-now"><span class="cf-k">지금 할 일</span> ${esc(st.now(d))}</p><div class="crs-sam-slot">${id !== 'open' && !CF.samOwnsButton ? `<button type="button" class="cf-ai cf-aistep" data-cfgo="ai">${typeof ic === 'function' ? ic('spark', 16) : '✦'} AI SAM에게 이 단계 맡기기</button>` : ''}</div></div>
      <main class="cf-body" data-cfstep="${esc(id)}"></main>
      <div class="cf-sam" aria-live="polite"></div>
      <footer class="cf-ft">${F.step ? '<button type="button" class="btn cf-big" data-cfgo="prev">이전</button>' : ''}${F.undo.length ? `<button type="button" class="btn ghost cf-undo" data-cfgo="undo">되돌리기</button>` : ''}<span class="cf-sp"></span><button type="button" class="btn ghost cf-later2" data-cfgo="later">나중에 이어서 하기</button>${last ? `<button type="button" class="btn pri cf-big" data-cfgo="create">개설하기</button>` : `<button type="button" class="btn pri cf-big" data-cfgo="next">다음</button>`}</footer></div>`;
    const body = w.querySelector('.cf-body'); try { st.render(body, d); } catch (e) { console.error('CF step render', id, e); body.innerHTML = ui.note('이 단계를 그리지 못했습니다. [다음]으로 넘어가도 됩니다.', 'bad'); }
    paintSaved(true); armIdle(); emit('step', { id, step: id, i: F.step, index: F.step, n, d, dir: F.dir || 'open', prev: F.prevId || null }); F.dir = null; F.prevId = id;
    const f = body.querySelector('.cf-f.bad input, .cf-f.bad textarea') || (F.focus && body.querySelector(`[data-cf="${F.focus}"]`)); if (f) f.focus(); F.focus = null; F.bad = {};
  }
  function paintSaved(silent) { const s = $('#crsFlow .cf-saved'); if (s && !silent) { s.textContent = '자동 저장했습니다'; s.classList.add('on'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 1600); } }
  function armIdle() { if (!F) return; clearTimeout(F.idleT); const id = F.ids[F.step]; F.idleT = setTimeout(() => { if (F && F.ids[F.step] === id) { F.idle[id] = (F.idle[id] || 0) + 1; emit('idle', { step: id, id, secs: Math.round(CF.idleMs / 1000), n: F.idle[id], d: F.d }); } }, CF.idleMs); }

  /* ───────── 이동 · 검사 · 만들기 ───────── */
  const problems = id => { const st = stepOf(id); let P = []; try { P = st.valid(F.d) || []; } catch (e) { console.error(e); }
    if (id === 'basic' || id === stepIds()[0]) { const A = askOf(id) || []; required().forEach(k => { const f = A.find(x => x.k === k); if (f && shown(f, F.d) && !String(F.d[k] ?? '').trim() && !P.some(p => p.k === k)) P.push({ k, msg: `'${f.label}'을(를) 적어 주세요.` }); }); }
    (askOf(id) || []).forEach(f => { if (f.req && shown(f, F.d) && !String(F.d[f.k] ?? '').trim() && !P.some(p => p.k === f.k)) P.push({ k: f.k, msg: `'${f.label}'을(를) 적어 주세요.` }); });
    const stopC = checks(F.d).filter(w => w.lv === 'stop' && (!w.step || w.step === id) && (w.step || id === 'open')); stopC.forEach(w => P.push({ k: w.k || '_check', msg: w.msg, check: true }));
    return P.map(p => typeof p === 'string' ? { k: '_', msg: p } : p); };
  function next() {
    if (!F) return; readBody(); const id = F.ids[F.step]; const P = problems(id);
    const empty = (askOf(id) || []).filter(f => shown(f, F.d) && f.later && !String(F.d[f.k] ?? '').trim()).map(f => f.k);
    if (P.length) { F.bad = {}; P.forEach(p => { F.bad[p.k] = p.msg; const ek = id + '.' + p.k; F.errs[ek] = (F.errs[ek] || 0) + 1; emit('error', { step: id, field: p.k, msg: p.msg, empty: !String(F.d[p.k] ?? '').trim() || (p.k === 'weekPlan' && !(F.d.weekPlan || []).length), n: F.errs[ek], d: F.d }); }); const keep = F.bad; paint(); F.bad = keep; markBad(); toast(P[0].msg, 'warn'); return false; }
    emit('next', { step: id, empty, d: F.d });
    if (F.step < F.ids.length - 1) { F.step++; F.dir = 'next'; saveDraft(); paint(); }
    return true;
  }
  function markBad() { const b = $('#crsFlow .cf-body'); if (!b || !F) return; Object.entries(F.bad).forEach(([k, m]) => { const f = b.querySelector(`[data-cff="${k}"]`); if (f && !f.querySelector('.cf-err')) { f.classList.add('bad'); f.insertAdjacentHTML('beforeend', `<p class="cf-err" role="alert">${esc(m)}</p>`); const i = f.querySelector('input,textarea,button'); i && i.focus(); } else if (!f) { const ol = b.querySelector('.cf-ol') || b; if (!b.querySelector('.cf-err')) ol.insertAdjacentHTML('beforeend', `<p class="cf-err" role="alert">${esc(m)}</p>`); } }); F.bad = {}; }
  function prev() { if (!F || !F.step) return; readBody(); F.backs++; emit('back', { step: F.ids[F.step], from: F.ids[F.step], to: F.ids[F.step - 1], n: F.backs, d: F.d }); F.step--; F.dir = 'back'; saveDraft(); paint(); }
  function jump(i) { if (!F || i >= F.step) return; readBody(); F.backs++; emit('back', { step: F.ids[F.step], from: F.ids[F.step], to: F.ids[i], n: F.backs, d: F.d }); F.step = i; F.dir = 'jump'; saveDraft(); paint(); }
  function aiStep(id) { if (!F) return Promise.resolve(); readBody(); id = id || F.ids[F.step]; const st = stepOf(id); snap('AI SAM이 채운 내용'); const sp = $('#crsFlow .cf-aistep'); if (sp) { sp.disabled = true; sp.textContent = 'AI SAM이 채우는 중…'; }
    return Promise.resolve(st.aiFill(F.d)).then(() => { if (typeof S !== 'undefined' && S.ai) S.ai.usage = (S.ai.usage || 0) + 1; saveDraft(); paint(); toast('AI SAM이 채웠습니다. 확인하고 고쳐 주세요.', 'ok'); }).catch(e => { console.error(e); toast('AI SAM이 채우지 못했습니다. 직접 적어 주세요.', 'warn'); paint(); }); }
  function finish() {
    if (!F) return; readBody(); for (let i = 0; i < F.ids.length; i++) { const P = problems(F.ids[i]); if (P.length) { F.step = i; F.bad = {}; P.forEach(p => F.bad[p.k] = p.msg); const keep = F.bad; paint(); F.bad = keep; markBad(); toast(P[0].msg, 'warn'); emit('error', { step: F.ids[i], field: P[0].k, msg: P[0].msg, n: 1, d: F.d }); return; } }
    const d = F.d; const from = F.from; let c;
    try { c = create({ ...d, status: d.open === '비공개' ? '준비중' : '운영중', from }); } catch (e) { console.error('CF.create', e); toast(`${josa(T('cls'), '을')} 만들지 못했습니다. 다시 눌러 주세요.`, 'warn'); return; }
    try { save(); } catch (e) { } const prevDraft = S.crsDraft; delete S.crsDraft; try { save(); } catch (e) { }
    clearTimeout(F.idleT); done(c, prevDraft);
  }
  function done(c, prevDraft) {
    const w = mount(); const u = unit(F ? F.d : {}); F = null; const L = T('learner');
    const enr = typeof menuOn === 'function' && menuOn('enroll') ? 'enroll' : 'members'; const site = typeof menuOn === 'function' && menuOn('lsite') ? 'lsite' : 'site';
    const nx = [['fill', `${u} 내용 확인 · 채우기`, '영상 · 교안 · 퀴즈를 확인하고 바꿔요', 'grid'], ['enroll', `${josa(L, '을')} 초대하기`, '번호로 등록하거나 초대 링크를 보내요', 'users'], ['site', '홈페이지에 올리기', `${josa(L, '이')} 보고 신청할 수 있게 게시해요`, 'send']];
    w.innerHTML = `<div class="cf-box cf-done" role="dialog" aria-modal="true" aria-label="개설 완료"><div class="cf-rb"><p class="cf-ok">${typeof ic === 'function' ? ic('check', 28) : '✓'}</p><h2>${esc(c.name)}</h2><p class="cf-sub">${josa(T('cls'), '을')} 만들었습니다. 이제 이렇게 하면 됩니다.</p>
      <div class="cf-next">${nx.map(([k, a, b, i], n) => `<button type="button" class="${n ? '' : 'pri'}" data-cfdone="${k}" data-c="${esc(c.id)}" data-go="${k === 'enroll' ? enr : k === 'site' ? site : ''}">${typeof ic === 'function' ? ic(i, 20) : ''}<span><b>${n + 1}. ${esc(a)}</b><small>${esc(b)}</small></span></button>`).join('')}</div><button type="button" class="linkb" data-cfdone="close" data-c="${esc(c.id)}">닫기</button></div></div>`;
    CF.last = c; CF._prevDraft = prevDraft;
  }

  /* 생성 함수(단일): d → course. makeCourse와 같은 스키마 + cls2 필드. 저장(save)과 화면 이동은 부른 쪽이 한다. */
  function create(d) {
    d = { ...(d || {}) }; if (!(Array.isArray(d.weekPlan) && d.weekPlan.length) && Array.isArray(d.outline) && d.outline.length) d.weekPlan = d.outline.map(w => typeof w === 'string' ? { title: w } : w); if (!Array.isArray(d.curriculum) && Array.isArray(d.items)) d.curriculum = d.items; const Uv = U(); const D = defs(); const c0 = cfgOf();
    const name = (clean ? clean(d.name || d.topic) : String(d.name || d.topic || '').trim()) || '새 과정';
    let plan = {}; try { if (c0 && typeof c0.plan === 'function') plan = c0.plan(d) || {}; } catch (e) { }
    let WP = Array.isArray(d.weekPlan) && d.weekPlan.length ? d.weekPlan.map((w, i) => ({ w: i + 1, title: String(w.title || `${i + 1}차시`).trim(), goal: w.goal || '' })) : null;
    const n = clamp(+(WP ? WP.length : (plan.weeks || d.sessions || d.weeks || (Uv ? 15 : 6))), 1, 60);
    const A = { ...D.auto, ...(d.auto || {}) }; const vsrc = d.vsrc || (A.video === 'ai' ? 'ai' : 'youtube');
    const o = { topic: name, weeks: Math.min(n, 30), univ: plan.univ != null ? plan.univ : Uv, quiz: d.quiz != null ? d.quiz !== false : !!A.quiz, assign: d.assign != null ? d.assign !== false : !!A.assign, exam: d.exam != null ? d.exam !== false : !!A.exam, vids: A.video === 'none' ? 0 : 1, level: d.levelTxt || '보통', vsrc, docs: d.docs != null ? !!d.docs : !!A.docs };
    const kind = d.kind || 'period'; const days = +d.days || D.days; const start = d.start || today(); const per = +(plan.per || d.per || (Uv ? 3 : (+d.mins || D.mins) / 60)) || 1;
    let W = (typeof AI !== 'undefined' && AI.design) ? AI.design({ ...o, weeks: Math.min(n, 30) }) : [];
    while (W.length < n) W.push({ w: W.length + 1, title: `${W.length + 1}차시`, goal: '', items: [{ type: 'video', title: `${name}: ${W.length + 1}차시`, q: name }] });
    if (WP) W = W.slice(0, n).map((w, i) => { const t2 = WP[i].title; const items = (w.items || []).map(x => x.type === 'video' && !/실습 영상/.test(x.title) ? { ...x, title: t2, q: `${name} ${t2}` } : x.type === 'quiz' ? { ...x } : x); return { ...w, w: i + 1, title: t2, goal: WP[i].goal || w.goal || '', items }; });
    if (o.vids === 0) W = W.map(w => ({ ...w, items: (w.items || []).filter(x => x.type !== 'video') }));
    const price = d.fee && d.fee.price != null && !d.fee.amb ? +d.fee.price : ((d.paid === false || d.paid === 'false') ? 0 : Math.max(0, +d.price || 0));
    const c = { id: uid('c'), name: name.slice(0, 50), kind, sub: d.sub || '', legal: !!d.legal, status: d.status || '준비중', price, open: d.open || D.open, start, end: d.end || addDays(start, kind === 'period' ? days : n * 7), teacher: d.teacher || S.me.name, group: '', learners: [], prog: {}, criteria: { ...D.criteria, ...(d.criteria || {}) }, cert: kind === 'sub' ? 'manual' : (d.cert || D.cert), skip: 'watched', speed: { on: true, min: (S.settings && +S.settings.speedMin) || 0.5, max: (S.settings && +S.settings.speedMax) || 2 }, early: false, community: 'class',
      hours: +d.hours || Math.round(n * per * 10) / 10, goal: d.goal || (typeof AI !== 'undefined' && AI.goal ? AI.goal(name, d.target || d.aud || '') : ''), notices: [], level: +d.level || 0, target: d.target || d.aud || '',
      period: { mode: d.end ? 'range' : 'days', days, start: d.end ? start : '', end: d.end || '' }, enr: {}, cat: d.cat || '', thumb: d.thumb || '', intro: [], teachers: [], discount: { on: false, type: 'rate', v: 10, until: '' }, recruit: { on: false, cap: +d.cap || 0, from: today(), to: '', early: { on: false, until: '', rate: 10 } }, openTo: [], sale: '판매중', crs: { v: 35, from: d.from || 'api', at: Date.now() } };
    c.desc = String(c.goal || '').slice(0, 400);
    if (kind === 'episode') { c.curriculum = (WP || W).map((w, i) => ({ id: uid('it'), type: 'offline', title: `${i + 1}회차 ${w.title}`.trim() })); }
    else { const user = Array.isArray(d.curriculum) ? d.curriculum.filter(Boolean) : []; const has = new Set(user.map(x => +x.week || 0)); const auto = typeof itemsFromDesign === 'function' ? itemsFromDesign(W, o) : []; c.curriculum = [...auto.filter(x => !has.has(+x.week || 0)), ...user.map(x => ({ ...x, id: x.id || uid('it'), week: +x.week || 1 }))].sort((a, b) => (a.week || 0) - (b.week || 0)); }
    c.weekly = kind !== 'episode'; c.weekPlan = W.map(w => ({ w: w.w, title: w.title, goal: w.goal || '' }));
    S.classes.unshift(c);
    try { if (c0 && typeof c0.apply === 'function') c0.apply(c, d); } catch (e) { console.error('cfg.apply', e); }
    try { logAudit(`${d.audit || (T('cls') + ' 생성')} — ${c.name}`); } catch (e) { }
    if (kind !== 'episode' && vsrc !== 'ai' && S.settings && S.settings.yt && S.settings.yt.key && typeof ytAutofill === 'function') ytAutofill(c);
    emit('create', { course: c, d, id: c.id, name: c.name }); return c;
  }

  /* ───────── 입력 묶기 ───────── */
  function readBody() { const b = $('#crsFlow .cf-body'); if (!b || !F) return; b.querySelectorAll('[data-cf]').forEach(el => setVal(el)); b.querySelectorAll('[data-cfw]').forEach(el => { const w = F.d.weekPlan && F.d.weekPlan[+el.dataset.cfw]; if (w) w.title = el.value; }); }
  function setVal(el) { const k = el.dataset.cf; let v = el.dataset.bool ? el.checked : el.value; if (el.dataset.num) v = v === '' ? '' : +v; if (k === 'sessions' && v !== '') v = clamp(+v, 1, 60); F.d[k] = v; }
  function bind(w) {
    w.addEventListener('input', e => { if (!F) return; armIdle(); const el = e.target; if (el.dataset.cf) { setVal(el); F.bad = {}; const f = el.closest('.cf-f'); if (f) { f.classList.remove('bad'); const er = f.querySelector('.cf-err'); er && er.remove(); } } if (el.dataset.cfw != null) { const x = F.d.weekPlan[+el.dataset.cfw]; if (x) x.title = el.value; } emit('change', { step: F.ids[F.step], field: el.dataset.cf || 'weekPlan', d: F.d }); saveSoon(); });
    w.addEventListener('change', e => { if (!F) return; const el = e.target; if (el.dataset.cf === 'sessions') syncPlan(); });
    w.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal') && !$('.mwrap.top2')) { e.stopPropagation(); close(true); } if (e.key === 'Enter' && e.target.tagName === 'INPUT' && F) { e.preventDefault(); next(); } armIdle(); });
    w.addEventListener('click', e => {
      const g = x => e.target.closest(x); let el; armIdle();
      if ((el = g('[data-cfgo]'))) { const a = el.dataset.cfgo; e.preventDefault();
        if (a === 'next') next(); else if (a === 'prev') prev(); else if (a === 'create') finish(); else if (a === 'ai') aiStep(); else if (a === 'undo') undo();
        else if (a === 'later') { close(true); toast('저장해 두었습니다. 다시 [만들기]를 누르면 이어서 할 수 있습니다.', 'ok'); }
        else if (a === 'close') close(false);
        else if (a === 'resume') { const o = CF._pending || {}; open({ ...o, resume: true, _asked: true }); }
        else if (a === 'fresh') { const o = CF._pending || {}; const old = S.crsDraft; dropDraft(); open({ ...o, fresh: true, _asked: true }); if (F && old) F.undo.push({ label: '이전 초안', d: JSON.stringify(old.d), step: Math.max(0, stepIds().indexOf(old.step)) }); paint(); }
        return; }
      if (!F) { if ((el = g('[data-cfdone]'))) { const k = el.dataset.cfdone; const id = el.dataset.c; close(false); if (k === 'fill' || k === 'close') { UI.cls = id; UI.clsT = 'curriculum'; if (typeof UI.slaClsHome !== 'undefined') UI.slaClsHome = k === 'close' ? { id, t: 'learners' } : null; go('class'); } else if (el.dataset.go) go(el.dataset.go); emit('done', { action: k, id }); } return; }
      if ((el = g('[data-cfjump]'))) { jump(+el.dataset.cfjump); return; }
      if ((el = g('[data-cfset]'))) { readBody(); const k = el.dataset.cfset; let v = el.dataset.v; v = v === 'true' ? true : v === 'false' ? false : /^-?\d+$/.test(v) && !/^0\d/.test(v) && k !== 'name' ? +v : v; if (k === '_vsrc') { F.d.auto = { ...(F.d.auto || {}), video: v }; } else F.d[k] = v; emit('change', { step: F.ids[F.step], field: k, d: F.d }); saveDraft(); paint(); return; }
      if ((el = g('[data-cfday]'))) { readBody(); const k = el.dataset.cfday, v = +el.dataset.v; const L = Array.isArray(F.d[k]) ? F.d[k] : []; F.d[k] = L.includes(v) ? L.filter(x => x !== v) : [...L, v].sort(); saveDraft(); paint(); return; }
      if ((el = g('[data-cfnum]'))) { readBody(); const k = el.dataset.cfnum; const inp = w.querySelector(`[data-cf="${k}"]`); const mn = inp && inp.min !== '' ? +inp.min : 0, mx = inp && inp.max !== '' ? +inp.max : 1e9; F.d[k] = clamp((+F.d[k] || 0) + +el.dataset.d, mn, mx); if (k === 'sessions') syncPlan(true); else { saveDraft(); paint(); } return; }
      if ((el = g('[data-cfai]'))) { readBody(); const k = el.dataset.cfai; snap('AI SAM이 채운 내용'); if (k === 'weekPlan') { F.d.weekPlan = planFrom(F.d); F.d.sessions = F.d.weekPlan.length; } else { F.d[k] = fieldAI(k, { ...F.d, [k]: '' }); F.focus = k; } if (S.ai) S.ai.usage = (S.ai.usage || 0) + 1; saveDraft(); paint(); toast('AI SAM이 채웠습니다. 확인하고 고쳐 주세요.', 'ok'); return; }
      if ((el = g('[data-cftpl]'))) { readBody(); const c = cfgOf(); const x = ((c && c.templates) || []).find(y => y.id === el.dataset.cftpl); if (x) { snap('템플릿 선택'); Object.assign(F.d, JSON.parse(JSON.stringify(x.prefill || {})), { tpl: x.id }); if (x.prefill && x.prefill.sessions && !(x.prefill.weekPlan)) F.d.weekPlan = []; saveDraft(); paint(); } return; }
      if ((el = g('[data-cfwadd]'))) { readBody(); F.d.weekPlan = F.d.weekPlan || []; F.d.weekPlan.push({ w: F.d.weekPlan.length + 1, title: '', goal: '' }); F.d.sessions = F.d.weekPlan.length; saveDraft(); paint(); const L = w.querySelectorAll('[data-cfw]'); L.length && L[L.length - 1].focus(); return; }
      if ((el = g('[data-cfwdel]'))) { readBody(); const i = +el.dataset.cfwdel; snap(`${i + 1}${unit(F.d)} 지우기`); F.d.weekPlan.splice(i, 1); F.d.sessions = F.d.weekPlan.length || 1; saveDraft(); paint(); return; }
      if ((el = g('[data-cfwmv]'))) { readBody(); const i = +el.dataset.cfwmv, j = i + +el.dataset.d; const L = F.d.weekPlan; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; saveDraft(); paint(); return; }
      if ((el = g('[data-cfauto]'))) { readBody(); const k = el.dataset.cfauto; const A = F.d.auto = { ...defs().auto, ...(F.d.auto || {}) }; if (k === 'video') A.video = A.video === 'none' ? 'youtube' : 'none'; else A[k] = !A[k]; saveDraft(); paint(); return; }
      if ((el = g('[data-cffix]'))) { try { snap('안내대로 고치기'); Object.assign(F.d, JSON.parse(el.dataset.cffix)); saveDraft(); paint(); } catch (er) { } return; }
    });
  }
  /* 차시 수를 바꾸면 목록 길이를 맞춘다(줄일 땐 되돌리기 가능) */
  function syncPlan(repaint) { const d = F.d; const n = clamp(+d.sessions || 1, 1, 60); d.sessions = n; const L = d.weekPlan || (d.weekPlan = []); if (L.length && L.length !== n) { if (n < L.length) snap(`${unit(d)} 수 줄이기`); while (L.length > n) L.pop(); while (L.length < n) L.push({ w: L.length + 1, title: '', goal: '' }); const P = planFrom({ ...d, sessions: n }); L.forEach((w, i) => { if (!w.title && P[i]) w.title = P[i].title; }); } saveDraft(); paint(); }

  /* ───────── 공개 인터페이스 ───────── */
  const CF = window.CF = Object.assign(window.CF || {}, {
    open, close, next, prev, undo, create, on, emit, steps, step: stepOf, stepIds, titleOf, planOf, cfgKey, cfgOf, unit, ui, DEF, defaults: defs, fieldAI, planFrom,
    aiFill: aiStep, saveDraft, dropDraft, hasDraft, snap, idleMs: 60000, cur: () => F ? { i: F.step, id: F.ids[F.step], n: F.ids.length } : null, isOpen: () => !!F, repaint: () => paint(), refresh: () => paint()
  });
  CF.cfg = CF.cfg || {};
  Object.defineProperty(CF, 'draft', { get: () => F ? F.d : (typeof S !== 'undefined' && S && S.crsDraft ? S.crsDraft.d : null), configurable: true });

  /* ───────── 진입점 통일 ───────── */
  const fromOf = el => { if (!el || !el.closest) return 'menu'; if (el.closest('#drawer, .samw, .fabw, [class*="sam"]')) return 'sam'; if (el.closest('.guide, .gd, [class*="guide"]')) return 'guide'; if (el.closest('.sl-empty, .empty, .emp')) return 'empty'; return 'menu'; };
  const keep = (k, nk) => { if (ACT[k] && !ACT[nk]) ACT[nk] = ACT[k]; };
  keep('cls-new', 'cls-new-adv'); keep('ai-design', 'ai-design-adv');
  ACT['cls-new'] = el => open({ from: fromOf(el) });
  ACT['ai-design'] = el => { const v = el && el.dataset && el.dataset.v; open({ from: fromOf(el), prefill: v ? { name: v } : {}, step: v ? 'outline' : undefined }); };
  ACT['sla-clsnew'] = el => open({ from: fromOf(el) });
  ACT['crs-open'] = el => open({ from: (el && el.dataset && el.dataset.from) || fromOf(el), step: el && el.dataset && el.dataset.step });
  { const b = ACT['cls-new-adv']; if (b) ACT['cls-new-adv'] = (...a) => { const d = F && F.d; close(true); b(...a); if (d && typeof WZ !== 'undefined' && WZ) { WZ.name = d.name || ''; WZ.target = d.target || ''; WZ.goal = d.goal || ''; if (typeof wizard === 'function') wizard(); } }; }

  /* ───────── 생성 함수 통일 ───────── */
  if (typeof makeCourse === 'function') { const old = makeCourse; makeCourse = function (x) { x = x || {}; if (x.legacy) return old(x); /* 기존 호출자(SAM · 저니 · 에이전트) 호환: topic · weeks · aud · fee · docs · vsrc · quiz · assign · exam · level */
      return create({ name: x.topic, sessions: x.weeks, target: x.aud || '', fee: x.fee, docs: !!x.docs, vsrc: x.vsrc || 'youtube', quiz: x.quiz !== false, assign: x.assign !== false, exam: x.exam !== false, level: x.level, open: '비공개', status: '준비중', days: (clamp(+x.weeks || (U() ? 15 : 6), 1, 30)) * 7, audit: 'AI 과정 생성', from: 'sam' }); }; CF._makeCourseOld = old; }
  if (typeof dsCreate === 'function') { const old = dsCreate; dsCreate = function (...a) { const n0 = S.classes[0]; const r = old.apply(this, a); const c = S.classes[0]; if (c && c !== n0) { c.criteria = { ...defs().criteria }; emit('create', { course: c, d: null, id: c.id, name: c.name }); try { save(); } catch (e) { } } return r; }; }
  if (typeof wzSave === 'function') { const old = wzSave; wzSave = function (...a) { const n0 = S.classes[0]; const r = old.apply(this, a); const c = S.classes[0]; if (r !== false && c && c !== n0) { c.criteria = { ...defs().criteria, ...(cfgOf() && cfgOf().defaults && cfgOf().defaults.criteria || {}) }; emit('create', { course: c, d: null, id: c.id, name: c.name }); try { save(); } catch (e) { } } return r; }; }
})();
