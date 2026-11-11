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
  const josa0 = (w, a) => { const s = String(w || ''); const ch = s.charCodeAt(s.length - 1); const jong = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : 0; const P = { '을': ['을', '를'], '이': ['이', '가'], '은': ['은', '는'], '과': ['과', '와'], '으로': ['으로', '로'] }[a]; return s + (P ? (jong && !(a === '으로' && jong === 8) ? P[0] : P[1]) : a); };
  const josa = (w, a) => { const f = window.CF && typeof window.CF.josa === 'function' && window.CF.josa !== josa ? window.CF.josa : josa0; return f(w, a); }; /* crs-scn.js의 CF.josa(영문 · 숫자 받침 포함)를 우선 쓴다 */
  const jq = (w, a) => `'${w}'${josa(w, a).slice(String(w || '').length)}`; /* 따옴표로 감싼 말 + 받침에 맞는 조사 */
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
  const undo = () => { if (!F || !F.undo.length) return; const u = F.undo.pop(); F.d = JSON.parse(u.d); F.step = u.step; saveDraft(); paint(); emit('undo', { step: F.ids[F.step], label: u.label }); toast(`${jq(u.label, '을')} 되돌렸습니다.`, 'ok'); };

  /* ───────── 공용 화면 조각(C2 · C3도 씀): CF.ui ───────── */
  const aiBtn = (k, label) => `<button type="button" class="cf-ai" data-cfai="${esc(k)}">${typeof ic === 'function' ? ic('spark', 16) : '✦'} ${esc(label || 'AI SAM이 채워 주기')}</button>`;
  const exLine = ex => ex ? `<p class="cf-ex"><b>예:</b> ${esc(String(ex).replace(/^예:\s*/, ''))}</p>` : '';
  const later = () => '<span class="cf-later">나중에 해도 됩니다</span>';
  const errLine = k => { const m = F && F.bad && F.bad[k]; return m ? `<p class="cf-err" role="alert">${esc(m)}</p>` : ''; };
  const ui = {
    /* f = { k, label, kind:'text'|'area'|'num'|'choice'|'days'|'time'|'date'|'toggle'|'code', ex, later, ai(bool|label), opts:[[v,l]], unit, min, max, len, hint, max_len } */
    field(f, d) {
      d = d || (F && F.d) || {}; const v = d[f.k]; const id = 'cf_' + f.k; const kind = f.kind || 'text';
      let inp = '';
      if (kind === 'area') inp = `<textarea id="${id}" data-cf="${esc(f.k)}" data-k="${esc(f.k)}" name="${esc(f.k)}" rows="${f.rows || 4}" maxlength="${f.maxLen || 2000}">${esc(v || '')}</textarea>`;
      else if (kind === 'num') inp = `<div class="cf-num"><button type="button" class="cf-nb" data-cfnum="${esc(f.k)}" data-d="-1" aria-label="줄이기">−</button><input id="${id}" type="number" inputmode="numeric" data-cf="${esc(f.k)}" data-k="${esc(f.k)}" name="${esc(f.k)}" data-num="1" value="${esc(v ?? f.def ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}><button type="button" class="cf-nb" data-cfnum="${esc(f.k)}" data-d="1" aria-label="늘리기">+</button>${f.unit ? `<span class="cf-unit">${esc(f.unit)}</span>` : ''}</div>`;
      else if (kind === 'choice') inp = `<div class="cf-choice" role="radiogroup" aria-label="${esc(f.label)}">${(f.opts || []).map(([ov, ol, os]) => `<button type="button" role="radio" aria-checked="${String(v) === String(ov)}" class="${String(v) === String(ov) ? 'on' : ''}" data-cfset="${esc(f.k)}" data-v="${esc(ov)}"${typeof ov === 'number' ? ' data-n="1"' : ''}><b>${esc(ol)}</b>${os ? `<small>${esc(os)}</small>` : ''}</button>`).join('')}</div>`;
      else if (kind === 'toggle') inp = `<label class="cf-tog"><input type="checkbox" id="${id}" data-cf="${esc(f.k)}" data-k="${esc(f.k)}" name="${esc(f.k)}" data-bool="1" ${v ? 'checked' : ''}><span>${esc(f.on || '예')}</span></label>`;
      else if (kind === 'days') { const D = ['일', '월', '화', '수', '목', '금', '토']; const L = Array.isArray(v) ? v : []; inp = `<div class="cf-days" role="group" aria-label="${esc(f.label)}">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button type="button" aria-pressed="${L.includes(i)}" class="${L.includes(i) ? 'on' : ''}" data-cfday="${esc(f.k)}" data-v="${i}">${D[i]}</button>`).join('')}</div>`; }
      else inp = `<input id="${id}" type="${kind === 'time' || kind === 'date' ? kind : 'text'}" data-cf="${esc(f.k)}" data-k="${esc(f.k)}" name="${esc(f.k)}" value="${esc(v || '')}" ${kind === 'code' && f.len ? `maxlength="${f.len}" inputmode="numeric"` : `maxlength="${f.maxLen || 60}"`}>`;
      const lab = kind === 'choice' || kind === 'days' ? `<span class="cf-lab" id="${id}_l">${esc(f.label)}${f.req ? ' <em class="cf-req">꼭 골라 주세요</em>' : ''}${f.later ? ' ' + later() : ''}</span>` : `<label class="cf-lab" for="${id}">${esc(f.label)}${f.req ? ' <em class="cf-req">꼭 적어 주세요</em>' : ''}${f.later ? ' ' + later() : ''}</label>`;
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
  /* 과정 이름에서 주제어만: '중2 수학 내신반' → '수학', '중2 일차함수' → '일차함수'(학년 · 반 이름 꼬리 제외) — 회차 제목 · 학원 목표 문장용(평가 2회차 5번) */
  const topicCore = d => { let x = String((d && (d.name || d.topic)) || '').replace(/\(.*?\)|\[.*?\]/g, ' ');
    x = x.replace(/(초등\s*[1-6](\s*[~∼-]\s*[1-6])?(\s*학년)?|초[1-6]|중[1-3]|고[1-3]|중학교?\s*[1-3]\s*학년|고등학교?\s*[1-3]\s*학년|[1-6]\s*학년|여름방학|겨울방학|수능)(?=\s|$)/g, ' ');
    for (let k = 0; k < 2; k++) x = x.replace(/\s*(내신|선행|심화|실전|모의고사|독해|특강|대비)?\s*(반|특강|수업|과정|강좌|교과목|클래스)?\s*$/, '').replace(/\s*(실전|대비)$/, '').trim();
    x = x.replace(/\s+/g, ' ').trim(); if (!x && d && d.subject && d.subject !== '기타') x = d.subject; return x.slice(0, 20); };
  /* 규칙 생성기의 과목 무관 제목(build.js MOD)은 주제어를 붙인다: '시작하기' → '일차함수 1: 시작하기'(대학 주차는 그대로) */
  const GENERIC = /^(시작하기|핵심 개념|원리 이해|실습 따라 하기|사례로 배우기|응용하기|심화|정리 · 평가)$/;
  const withTopic = (d, i, t) => { const t0 = String(t || '').trim(); if (U() || !GENERIC.test(t0.replace(/\s+\d+$/, ''))) return t; const k = topicCore(d); return k ? `${t0} — ${k}`.slice(0, 60) : t; }; /* v38 A-12: 강좌명을 앞에 붙이면 카드에서 모든 차시가 '강좌명…'으로 같아 보였다 → 차시 내용을 앞에, 주제어는 뒤에 */
  const planFrom = d => { const pw = +planOf(d).weeks; const n = pw ? clamp(pw, 1, 60) : N(d); const W = designW({ ...d, sessions: n }); const out = []; for (let i = 1; i <= n; i++) { const w = W[i - 1]; out.push({ w: i, title: w ? withTopic(d, i, w.title) : `${i}${unit(d) === '회차' ? '회차' : unit(d) === '주차' ? '주차' : '차시'} 수업`, goal: w ? (w.goal || '') : '' }); } return out; };
  /* 유형별 예시(CF.cfg[type].examples · templates)에서 채울 말을 고른다 — 학원에 기업 문구가 들어가지 않게(평가 1회차 3번) */
  const exVal = k => { const c = cfgOf(); const v = c && c.examples && (c.examples[k + 'AI'] || c.examples[k]); if (v) return String(v).replace(/^예:\s*/, '').replace(/\s*\(.*\)$/, '').trim(); const t0 = c && (c.templates || []).find(x => x.prefill && x.prefill[k]); return t0 ? String(t0.prefill[k]) : ''; };
  const TYN = { k12: '중2 수학 내신반', univ: 'AI 리터러시와 글쓰기', corp: '신규 입사자 온보딩', voc: '웹 개발 기초', lifelong: '시니어를 위한 스마트폰 활용', public: '디지털 역량 기초', adult: '엑셀 실무 기초' };
  const TYT = { k12: '중학교 2학년', univ: '비전공 1학년', corp: '입사 1년 차 임직원', voc: '취업 준비 중인 훈련생', lifelong: '배움을 다시 시작하는 지역 주민', public: '구민 누구나', adult: '처음 배우는 성인' };
  const optLabel = (k, v) => { const f = (askOf('basic') || []).find(x => x.k === k); const o = f && (f.opts || []).find(x => String(x[0]) === String(v)); return o ? o[1] : ''; };
  /* 교육 목표(유형별 문장). ai.js AI.goal은 기업 · 실무 문장이라 흐름에서는 이것을 쓴다 */
  const goalFor = (name, target) => {
    const ty = (S && S.org && S.org.type) || 'adult'; const core = (ty === 'k12' ? topicCore({ name, subject: F && F.d && F.d.subject }) : '') || String(name || '').replace(/\(.*?\)|\[.*?\]/g, '').trim() || T('cls'); /* 학원: '내신반' 같은 반 이름 꼬리 없이 과목 · 주제로 */ const who = String(target || '').trim() || T('learner');
    const L = { k12: [`${josa(who, '이')} ${josa(core, '에서')} 배우는 개념을 정확히 이해하고 스스로 문제를 풀 수 있습니다.`, '회차마다 확인 문제로 부족한 부분을 찾아 보완합니다.'],
      univ: [`${josa(who, '이')} ${core}의 핵심 개념을 이해하고 자기 말로 설명할 수 있습니다.`, `학기 말에 ${josa(core, '을')} 활용한 결과물 1건을 완성합니다.`],
      voc: [`${josa(who, '이')} ${core} 직무에 필요한 지식과 기술을 익힙니다.`, '실습 과제를 통해 현장에서 바로 쓸 수 있는 수준에 이릅니다.'],
      corp: [`${josa(who, '이')} ${josa(core, '을')} 이해하고 업무에 적용합니다.`, '과정을 마치면 배운 내용을 자기 업무 사례로 정리합니다.'],
      public: [`${josa(who, '이')} ${josa(core, '을')} 이해하고 업무와 생활에 활용합니다.`, '과정을 마치면 핵심 내용을 스스로 점검할 수 있습니다.'],
      lifelong: [`${josa(who, '이')} ${josa(core, '을')} 즐겁게 배우고 생활에서 활용합니다.`, '수업마다 직접 해 보며 자신감을 기릅니다.'],
      adult: [`${josa(who, '이')} ${core}의 기본을 익히고 바로 써 봅니다.`, '과정을 마치면 결과물 1건을 스스로 완성합니다.'] }[ty] || [];
    return L.length ? `[교육 목표]\n- ${L[0]}\n- ${L[1]}` : `${core}의 기본을 익힙니다.`;
  };
  const fieldAI = (k, d) => {
    const nm = (d.name || d.topic || '').trim(); const ty = (S && S.org && S.org.type) || 'adult';
    if (k === 'name') { if (nm) return nm; if (ty === 'k12' && d.subject) { const g = optLabel('grade', d.grade); return `${g ? g.replace(/\s+/g, '') + ' ' : ''}${d.subject === '기타' ? '' : d.subject + ' '}내신반`.trim(); } return exVal('name') || TYN[ty] || TYN.adult; }
    if (k === 'target') { if (ty === 'k12' && d.grade) return optLabel('grade', d.grade) || TYT.k12; return exVal('target') || TYT[ty] || TYT.adult; }
    if (k === 'goal') return goalFor(nm || exVal('name') || T('cls'), d.target || (ty === 'k12' ? optLabel('grade', d.grade) : ''));
    if (k === 'sessions') return U() ? 15 : 6;
    return d[k];
  };
  /* 이름 · 대상이 바뀌면 자동으로 만든 목표를 다시 만든다(사용자가 고친 목표는 그대로) — 평가 1회차 1번 */
  const goalAuto = d => !String(d.goal || '').trim() || (d._goalAI != null && String(d.goal).trim() === String(d._goalAI).trim());
  const syncGoal = (d, fill) => { if (!d) return false; if (!goalAuto(d)) return false; if (!String(d.goal || '').trim() && !fill) return false; const g = fieldAI('goal', d); if (g === d.goal) return false; d.goal = g; d._goalAI = g; return true; };

  /* ───────── 기본 단계 ───────── */
  /* v36: 템플릿은 지금 기관 유형(cfgKey)의 cfg에 있는 것만, 8개까지. x.types가 있으면 그 유형에서만 — 다른 유형 예시가 섞이지 않게(대학에 법정의무교육이 뜨던 문제) */
  const tplList = () => { const c = cfgOf(); const k = cfgKey(); if (!c || (c.key && c.key !== k)) return []; return ((c.templates) || []).filter(x => x && (!x.types || x.types.includes(k))).slice(0, 8); };
  const tplCards = d => { const L = tplList(); if (!L.length) return ''; const allIc = L.every(x => x.icon); return `<div class="cf-tpl"><p class="cf-lab">이런 ${esc(josa(T('cls'), '이'))} 많습니다 <span class="cf-later">누르면 칸이 채워집니다</span></p><div class="cf-tplg">${L.map(x => `<button type="button" class="${d.tpl === x.id ? 'on' : ''}" data-cftpl="${esc(x.id)}">${allIc && typeof ic === 'function' ? ic(x.icon, 18) : ''}<b>${esc(x.name)}</b>${x.desc ? `<small>${esc(x.desc)}</small>` : ''}</button>`).join('')}</div></div>`; };
  const askBlock = (id, d, fallback) => { const A = askOf(id); const L = A || fallback; L.forEach(f => { if (f.def != null && d[f.k] === undefined) d[f.k] = Array.isArray(f.def) ? f.def.slice() : f.def; }); const req = required(); return L.filter(f => shown(f, d) && !(id === 'outline' && (f.k === 'mins' || f.k === 'totalH') && eachOnly(d))).map(f => ui.field({ ...f, req: f.req != null ? f.req : req.includes(f.k) && !f.later }, d)).join(''); };
  const OL_FOLD = 8, OL_SHOW = 5; /* 차시 제목이 8개를 넘으면 처음엔 5개만 보이고 [제목 N개 모두 보기](평가 1회차 10번) */
  /* ───── 차시 목록 붙여 넣기(F4): 엑셀 · 문서에서 복사한 여러 줄 → 줄마다 차시 하나, 차시 수 자동. 앞 번호(1차시 · 1. · ①)와 시간 칸은 뺀다 ───── */
  const NUMCELL = /^(제?\s*\d+\s*(차시|주차|주|회차|회|강|교시|장|단원)?\.?|\d{1,2}:\d{2}(:\d{2})?|\d+\s*분)$/;
  const parseLines = txt => String(txt || '').split(/\r?\n/).map(line => { let s = line; if (s.includes('\t')) { const cells = s.split('\t').map(x => x.trim()).filter(x => x && !NUMCELL.test(x)); s = cells.sort((a, b) => b.length - a.length)[0] || ''; }
    return s.replace(/^\s*(제?\s*\d+\s*(차시|주차|주|회차|회|강|교시|장|단원)\s*[.:)\]·-]?|\d+\s*[.)\]:·-]|[①-⑳]|[-•·*▶■□○●])\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 60); }).filter(Boolean);
  const bulkBox = d => { const u = unit(d); return `<div class="cf-bulk" data-cff="bulk"><label class="cf-lab" for="cf_bulk">${esc(u)} 제목을 한 줄에 하나씩 붙여 넣으십시오</label><textarea id="cf_bulk" data-cfbulkt="1" rows="7" maxlength="6000">${esc((F && F.bulkTxt) || '')}</textarea><p class="cf-ex"><b>예:</b> 엑셀 · 한글 · 워드에서 ${esc(u)} 목록을 복사해 붙여 넣습니다. 앞 번호(1${esc(u)}, 1.)는 저절로 뺍니다.</p><p class="cf-hint" data-cfbulkn="1">${bulkCount(d, (F && F.bulkTxt) || '')}</p><div class="cf-bulkf"><button type="button" class="btn pri cf-big" data-cfbulkok="1">이대로 ${esc(u)} 만들기</button><button type="button" class="btn cf-big" data-cfbulk="0">취소</button></div></div>`; };
  const bulkCount = (d, txt) => { const n = parseLines(txt).length; const u = unit(d); return n ? `${n}줄 → ${u} ${Math.min(n, 60)}개를 만듭니다.${n > 60 ? ` ${u}는 60개까지라 뒤의 ${n - 60}줄은 뺍니다.` : ''} 지금 목록은 이 제목으로 바뀝니다.` : `붙여 넣으면 몇 개의 ${josa(u, '이')} 만들어지는지 여기에 보입니다.`; };
  function applyBulk(txt, from) { if (!F) return 0; const L0 = parseLines(txt); if (!L0.length) return 0; const d = F.d; const u = unit(d); from = Math.max(0, +from || 0); snap(`${u} 목록 붙여 넣기`);
    const keep = (d.weekPlan || []).slice(0, from); const add = L0.slice(0, Math.max(0, 60 - keep.length)); const tail = from ? (d.weekPlan || []).slice(from + add.length) : [];
    d.weekPlan = [...keep, ...add.map(t2 => ({ title: t2, goal: '' })), ...tail].map((w, i) => ({ ...w, w: i + 1 })); d.sessions = d.weekPlan.length; d._olTouched = 1; delete d._over; delete d._overNote;
    F.bulk = false; F.bulkTxt = ''; F.olAll = true; emit('change', { step: F.ids[F.step], field: 'sessions', d }); saveDraft(); paint();
    toast(`${u} ${d.weekPlan.length}개를 만들었습니다${L0.length > add.length ? `(${u}는 60개까지라 ${L0.length - add.length}줄은 뺐습니다)` : ''}. 틀리면 [되돌리기]를 누르세요.`, 'ok'); return add.length; }
  const BASIC = () => [
    { k: 'name', label: `${T('cls')} 이름`, ex: ex('name', U() ? '생성형 AI와 글쓰기' : S.org.type === 'k12' ? '중2 수학 내신반' : '엑셀 실무 기초'), ai: true, maxLen: 50 },
    { k: 'target', label: '누가 배우나요', ex: ex('target', S.org.type === 'k12' ? '중학교 2학년' : U() ? '비전공 1학년' : '입사 1년 차 직원'), ai: true, later: true, maxLen: 40 },
    { k: 'goal', label: '무엇을 배우나요', kind: 'area', rows: 3, ex: ex('goal', '엑셀 함수와 표 정리를 익혀 매일 하는 보고서를 30분 안에 끝냅니다.'), ai: true, later: true }];
  /* ───── 수료 기준 · 수강 기간(F4): 영상 강좌 · 교육과정에서 '영상 진도만 80%' · '90일' · '무료'를 흐름 안에서 고른다.
     cfg.critAsk(true|false)로 유형이 켜고 끈다. 기본은 성인 · 공공 · 기업 · 평생(학원 회차 · 대학 성적 · 직업훈련 법정 기준은 기존 규칙). ───── */
  const CRIT_KEYS = ['adult', 'public', 'corp', 'lifelong'];
  const critOn = () => { const c = cfgOf(); if (c && c.critAsk != null) return !!c.critAsk; return CRIT_KEYS.includes(cfgKey()); };
  const critAsk = d => { if (!critOn()) return []; const A = askOf('setup') || []; const has = k => A.some(f => f.k === k); const R = []; const dn = T('done');
    if (!has('days') && !has('dur')) R.push({ k: 'days', label: '수강 기간', kind: 'choice', opts: [[30, '30일'], [60, '60일'], [90, '90일'], [180, '180일'], [365, '1년'], ['custom', '직접 정하기', '날짜 · 일수']], ex: '예: 신청한 날부터 90일 동안 들을 수 있습니다' });
    R.push({ k: 'critBy', label: `무엇으로 ${dn}하나요`, kind: 'choice', opts: [['all', '모든 콘텐츠 진도', '영상 · 퀴즈 · 교안을 모두 셉니다'], ['video', '강의 영상 진도만', '퀴즈 · 교안은 연습용으로 둡니다']], ex: '예: 영상 강의 위주라면 강의 영상 진도만' });
    if (!has('rate')) R.push({ k: 'rate', label: `${dn} 기준(진도)`, kind: 'choice', opts: [[60, '60% 이상'], [80, '80% 이상'], [100, '100%(모두)']], ex: '예: 진도 80% 이상' });
    if (d) { if (d.critBy == null) d.critBy = 'all'; if (d.rate == null || d.rate === '') d.rate = (defs().criteria || {}).threshold || 80; if (d.days == null && !has('dur')) d.days = defs().days; }
    return R; };
  const critTxt = d => `${d.critBy === 'video' ? '강의 영상' : '모든 콘텐츠'} 진도 ${+d.rate || (defs().criteria || {}).threshold || 80}% 이상`;
  const evenW = K => { /* 정수 가중치를 고르게(합 100): 영상 14개면 8 · 8 · 7 … — assess2 a2Even(5 단위)보다 진도 비율에 가깝다 */ const n = K.length; if (!n) return; const per = Math.floor(100 / n); K.forEach((x, i) => { x.w = per + (i < 100 - per * n ? 1 : 0); }); };
  /* 개설할 때: 영상 진도만이면 수료 항목(criteria.items, assess2 a2Crit)을 강의 영상으로 고르게 나눈다 — 학습자 화면은 게시본 crit으로 같은 규칙을 쓴다 */
  const critApply = (c, d) => { if (!critOn() || !c || !d) return; const cr = c.criteria = c.criteria || { ...defs().criteria }; if (+d.rate > 0) cr.threshold = +d.rate; cr.by = d.critBy === 'video' ? 'video' : 'all';
    if (cr.by === 'video') { const V = (c.curriculum || []).filter(i => i.type === 'video'); Object.assign(cr, { video: 100, exam: 0, assign: 0 }); if (V.length) { cr.items = V.map(i => ({ id: i.id, w: 0 })); evenW(cr.items); } } };
  /* ───── F5: '강의 영상 진도만'(criteria.by === 'video') 과정은 영상을 더 넣거나 빼도 수료 항목이 따라간다 ─────
     어디서 넣든(흐름 · 과정 상세 편집기 · 콘텐츠 라이브러리 · AI SAM) 공통 지점 세 곳에서 맞춘다: 저장(Store.set) · 수료 항목 읽기(a2Crit, 관리 화면 · 학습자 게시본 lsSnapshot) .
     고르게 나눈 비중이면 다시 고르게, 손으로 고친 비중이면 남은 영상의 비율을 지키고 새 영상은 평균 비중으로 넣어 합 100에 맞춘다.
     관리자가 수료 항목을 직접 고르면(assess2 a2-crit-on · all · clear) by='manual'로 바꿔 자동 맞춤을 멈춘다. */
  const vidSync = c => { const cr = c && c.criteria; if (!cr || cr.by !== 'video') return false; const V = (c.curriculum || []).filter(i => i && i.type === 'video').map(i => i.id);
    const K = (cr.items || []).filter(k => k && V.includes(k.id)); const sum = K.reduce((a, k) => a + (+k.w || 0), 0); const same = K.length === V.length && (cr.items || []).length === V.length;
    if (same && (sum === 100 || !V.length)) return false;
    const W0 = K.map(k => +k.w || 0); const even = !W0.length || Math.max(...W0) - Math.min(...W0) <= 1;
    const N = V.map(id => { const k = K.find(x => x.id === id); return { id, w: k ? +k.w || 0 : 0, nw: !k }; });
    if (even || !sum) { evenW(N); } else { const avg = sum / K.length; N.forEach(x => { if (x.nw) x.w = avg; }); const tot = N.reduce((a, x) => a + x.w, 0) || 1; const R = N.map(x => x.w / tot * 100); N.forEach((x, i) => { x.w = Math.floor(R[i]); }); let rest = 100 - N.reduce((a, x) => a + x.w, 0); R.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { N[i].w++; rest--; } }); }
    cr.items = N.map(x => ({ id: x.id, w: x.w })); return true; };
  const vidSyncAll = () => { try { (S && Array.isArray(S.classes) ? S.classes : []).forEach(vidSync); } catch (e) { } };
  window.CF_VIDSYNC = vidSync;
  if (typeof a2Crit === 'function') { const base = a2Crit; a2Crit = function (c) { try { vidSync(c); } catch (e) { } return base.apply(this, arguments); }; }
  if (typeof Store === 'object' && Store && typeof Store.set === 'function') { const base = Store.set; Store.set = function (v) { try { if (v && v === S) vidSyncAll(); } catch (e) { } return base.apply(this, arguments); }; }
  if (typeof ACT === 'object') ['a2-crit-on', 'a2-crit-all', 'a2-crit-clear'].forEach(k => { const base = ACT[k]; if (typeof base !== 'function') return; ACT[k] = (el, ...r) => { try { const c = C((el.dataset || {}).c || (el.dataset || {}).v); if (c && c.criteria && c.criteria.by === 'video') c.criteria.by = 'manual'; } catch (e) { } return base(el, ...r); }; });
  /* ───── F5: 수강 설정 질문이 4개를 넘으면 꼭 정할 것 3개만 위에, 나머지는 '더 설정하기(나중에 해도 됩니다)'에 접고 지금 값을 한 줄로 보여 준다 ─────
     위에 둘 순서: 수강료(유료 여부) → 수강 기간 → 무엇으로 수료하나요 → 수료 기준 → 그 밖. 꼭 적어야 하는 칸(req)과 오류가 난 칸은 접지 않는다. 접힘 상태는 F.more로 기억한다. */
  const SET_TOP = ['paid', 'price', 'days', 'dur', 'critBy', 'rate', 'simsa'];
  const valTxt = (f, d) => { const v = d[f.k]; if (f.kind === 'choice') { const o = (f.opts || []).find(([ov]) => String(ov) === String(v)); return o ? o[1] : '정하지 않음'; }
    if (f.kind === 'num') { const n = +v || 0; if (!n) return f.k === 'cap' ? '제한 없음' : f.k === 'price' ? '무료' : '0'; return `${n.toLocaleString()}${f.unit || ''}`; }
    if (f.kind === 'date') return v ? String(v) : (f.k === 'start' ? '오늘' : '정하지 않음'); if (f.kind === 'toggle') return v ? '예' : '아니요'; return v ? String(v).slice(0, 20) : '나중에'; };
  const setupBlock = (d, fallback, CA) => { const A = askOf('setup'); const L0 = subExpand((A || fallback).concat(CA || []).concat(recAsk(A || fallback)), d); L0.forEach(f => { if (f.def != null && d[f.k] === undefined) d[f.k] = Array.isArray(f.def) ? f.def.slice() : f.def; });
    const req = required(); const L = L0.filter(f => shown(f, d)).map(f => ({ ...f, req: f.req != null ? f.req : req.includes(f.k) && !f.later }));
    const dec = L.filter(f => !f.sub && !(f.k === 'price' && L.some(x => x.k === 'paid'))); /* 유료일 때 나오는 금액 칸은 '수강료' 결정 하나로 센다 · '직접 정하기' 하위 칸도 부모 결정 하나로 */
    if (dec.length <= 4) return L.map(f => ui.field(f, d)).join('');
    const REC1 = ['univ', 'lifelong', 'public'].includes(cfgKey()); /* v38 L-8 · U-4: 학기 모집형(평생 · 대학 비교과 · 공공)은 개강일 · 신청 기간 · 정원을 먼저(위 4개까지) */
    const ORD = REC1 ? ['paid', 'price', 'start', 'rdays', 'cap', ...SET_TOP.filter(k => !['paid', 'price'].includes(k))] : SET_TOP;
    const rank = f => { const i = ORD.indexOf(f.k); return i < 0 ? 99 : i; }; const top = new Set(); [...dec].sort((a, b) => rank(a) - rank(b)).slice(0, REC1 ? 4 : 3).forEach(f => top.add(f.k)); if (top.has('paid')) top.add('price');
    L.forEach(f => { if (f.req || (F && F.bad && F.bad[f.k])) top.add(f.k); });
    /* v38 U-4: 대화로 말한 신청 마감 · 정원처럼 값이 정해져 있으면 접지 않는다(위 칸 4개를 넘지 않게) */ L.forEach(f => { if (top.size < 4 && ((f.k === 'rdays' && d.rdays && String(d.rdays) !== '0') || (f.k === 'cap' && +d.cap > 0))) top.add(f.k); });
    L.forEach(f => { if (f.sub && top.has(f.sub)) top.add(f.k); });
    const T1 = L.filter(f => top.has(f.k)); const T2 = L.filter(f => !top.has(f.k)); if (!T2.length) return L.map(f => ui.field(f, d)).join('');
    const open = !!(F && F.more) || T2.some(f => F && F.bad && F.bad[f.k]);
    return T1.map(f => ui.field(f, d)).join('') + `<details class="cf-more" id="cfMore"${open ? ' open' : ''}><summary><span class="cf-more-h"><b>더 설정하기</b> <span class="cf-later">나중에 해도 됩니다</span></span><span class="cf-more-s">지금 값: ${T2.map(f => `${esc(String(f.label).replace(/\(.*?\)/g, '').trim())} ${esc(valTxt(f, d))}`).join(' · ')}</span></summary><div class="cf-more-b">${T2.map(f => ui.field({ ...f, later: false }, d)).join('')}</div></details>`; };
  document.addEventListener('toggle', e => { const t = e.target; if (t && t.id === 'cfMore' && F) F.more = !!t.open; }, true);
  /* ───── 이미 만든 과정을 복사해 시작(F4): 차시 목록 · 콘텐츠 · 수강 설정을 가져온다. 수강생 · 진도는 가져오지 않는다 ───── */
  const copySrc = () => (typeof S !== 'undefined' && S && Array.isArray(S.classes) ? S.classes : []).filter(c => c && c.kind !== 'pack' && c.kind !== 'episode' && (c.curriculum || []).length);
  const copyLink = () => { if (!copySrc().length) return ''; return `<p class="cf-adv cf-copyl">이미 만든 ${esc(josa(T('cls'), '과'))} 비슷하면 <button type="button" class="linkb" data-cfcopy="pick">${esc(T('cls'))} 복사해서 시작하기</button></p>`; };
  function copyPick() { const L = copySrc().slice(0, 30); if (typeof modal !== 'function') return;
    modal(`복사할 ${T('cls')} 고르기`, `<p class="cf-gt">차시 목록 · 넣은 콘텐츠 · 수강 설정을 가져옵니다. ${josa(T('learner'), '과')} 진도는 가져오지 않습니다.</p><div class="cf-copyg">${L.map(c => `<button type="button" class="cf-copyc" data-cfcopy="${esc(c.id)}"><b>${esc(c.name)}</b><small>${esc(unit({}))} ${(c.weekPlan || []).length || new Set((c.curriculum || []).map(i => +i.week || 0)).size}개 · 콘텐츠 ${(c.curriculum || []).filter(i => i.type !== 'chapter').length}개</small></button>`).join('')}</div>`, [{ id: 'c', label: '닫기' }]); }
  function copyFrom(id) { const c = (S.classes || []).find(x => x.id === id); if (!c || !F) return; try { closeModal(); } catch (e) { } readBody(); snap(`${T('cls')} 복사`); const d = F.d; const cp = x => JSON.parse(JSON.stringify(x));
    const WP = (c.weekPlan || []).length ? c.weekPlan : [...new Set((c.curriculum || []).filter(i => i.type !== 'chapter').map(i => +i.week || 1))].sort((a, b) => a - b).map(w => ({ w, title: `${w}${unit(d)}` }));
    const wmap = new Map(WP.map((w, i) => [+w.w || i + 1, i + 1]));
    d.weekPlan = WP.map((w, i) => ({ w: i + 1, title: String(w.title || '').replace(/^\s*\d+\s*(차시|주차|회차)\s*/, '') || `${i + 1}${unit(d)}`, goal: w.goal || '' })); d.sessions = d.weekPlan.length; d._olTouched = 1;
    d.curriculum = (c.curriculum || []).filter(i => i && !['chapter', 'offline', 'live'].includes(i.type)).map(i => { const n = cp(i); n.id = uid('it'); n.week = wmap.get(+i.week || 1) || 1; delete n.done; return n; });
    d.name = `${c.name} (복사)`.slice(0, 50); if (c.target) d.target = c.target; if (c.goal) { d.goal = c.goal; d._goalAI = null; } d.price = +c.price || 0; d.paid = d.price > 0; if (c.period && +c.period.days) d.days = +c.period.days;
    const cr = c.criteria || {}; if (+cr.threshold) d.rate = +cr.threshold; const V = (c.curriculum || []).filter(i => i.type === 'video').map(i => i.id); d.critBy = cr.by === 'video' || (V.length && (cr.items || []).length && (cr.items || []).every(k => V.includes(k.id))) ? 'video' : 'all'; d.copyOf = c.id;
    emit('change', { step: F.ids[F.step], field: 'copy', d }); saveDraft(); F.focus = 'name'; paint(); toast(`「${c.name}」의 ${unit(d)} ${d.weekPlan.length}개 · 콘텐츠 ${d.curriculum.length}개를 가져왔습니다. 이름을 고치고 [다음]을 누르십시오.`, 'ok'); }
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-cfcopy]'); if (!b || !F) return; e.preventDefault(); if (b.dataset.cfcopy === 'pick') copyPick(); else copyFrom(b.dataset.cfcopy); });
  const steps = [
    { id: 'basic', title: () => '무엇을 · 누구에게', now: () => `${josa(T('cls'), '의')} 이름과 배울 사람을 적어 주세요.`.replace('의의', '의'),
      render(el, d) { el.innerHTML = tplCards(d) + askBlock('basic', d, BASIC()) + copyLink(); },
      valid(d) { const P = []; if (!String(d.name || '').trim()) P.push({ k: 'name', msg: `${T('cls')} 이름을 적어 주세요. 모르겠으면 [AI SAM이 채워 주기]를 누르세요.` }); return P; },
      aiFill(d) { ['name', 'target', 'goal'].forEach(k => { if (!String(d[k] || '').trim()) d[k] = fieldAI(k, d); }); return Promise.resolve(d); } },
    { id: 'outline', title: d => `${unit(d)} 목록`, now: d => `몇 번 수업하는지 정하고, ${unit(d)}마다 제목을 확인해 주세요.`,
      render(el, d) {
        const u = unit(d); if (!Array.isArray(d.weekPlan)) d.weekPlan = []; let pre = ''; totSync(d); if (!d.weekPlan.length && !d._olTouched) { d.weekPlan = planFrom(d); d._olTouched = 1; pre = ui.note(`AI SAM이 ${josa(u, '을')} 미리 채워 두었습니다. 제목을 눌러 고쳐 쓰셔도 됩니다.`); setTimeout(saveDraft); }
        const head = askBlock('outline', d, [{ k: 'sessions', label: `몇 ${u}인가요`, kind: 'num', min: 1, max: 60, unit: u, ex: U() ? '한 학기 15주' : '주 1회 6주면 6' }]) + minsModeF(d);
        if (d.minsMode == null && VARM()) d.minsMode = 'same'; const EA = eachOn(d); const AU = EA && d.minsMode === 'auto'; if (AU) autoDist(d); else if (EA) d.weekPlan.forEach(w => { if (!(+w.mins > 0)) w.mins = curMins(d); });
        const L = d.weekPlan;
        el.innerHTML = legalBox(d) + overNote(d) + head + pre + `<div class="cf-ol"><div class="cf-olh"><span class="cf-lab">${esc(u)}별 제목</span><span class="cf-olb">${F && F.bulk ? '' : `<button type="button" class="cf-ai cf-bulkb" data-cfbulk="1">${typeof ic === 'function' ? ic('doc', 16) : ''} 목록 붙여 넣기</button>`}${aiBtn('weekPlan', L.length ? '제목 다시 만들기' : `AI SAM이 ${u} 목록 만들기`)}</span></div>` + (F && F.bulk ? bulkBox(d) : '') +
          (L.length ? `<ol class="cf-wl ${EA ? 'cf-wlm' : ''}">${L.slice(0, F && !F.olAll && !EA && L.length > OL_FOLD ? OL_SHOW : L.length).map((w, i) => `<li><span class="cf-wn">${i + 1}</span><input value="${esc(w.title)}" maxlength="60" data-cfw="${i}" aria-label="${i + 1}${esc(u)} 제목">${AU ? `<span class="cf-wm cf-wma" title="AI가 나눈 길이 — 직접 고치려면 [직접 고치기]"><b>${esc(w.mins)}</b><small>분</small></span>` : EA ? `<span class="cf-wm"><input type="number" inputmode="numeric" min="5" max="600" step="5" value="${esc(w.mins)}" data-cfwm="${i}" aria-label="${i + 1}${esc(u)} 길이(분)"><small>분</small></span>` : ''}<button type="button" class="cf-ib" data-cfwmv="${i}" data-d="-1" aria-label="위로" ${i ? '' : 'disabled'}>↑</button><button type="button" class="cf-ib" data-cfwdel="${i}" aria-label="${i + 1}${esc(u)} 지우기">✕</button></li>`).join('')}</ol>${F && !F.olAll && !EA && L.length > OL_FOLD ? `<button type="button" class="cf-add cf-olmore" data-cfolall="1" aria-expanded="false">제목 ${L.length}개 모두 보기</button>` : `<button type="button" class="cf-add" data-cfwadd="1">+ ${esc(u)} 하나 더</button>`}`
            : `<div class="cf-emp"><p>아직 ${esc(u)} 목록이 없습니다.</p><p>[AI SAM이 ${esc(u)} 목록 만들기]를 누르면 제목이 채워집니다. 직접 쓰려면 아래를 누르세요.</p><button type="button" class="cf-add" data-cfwadd="1">+ 직접 쓰기</button></div>`) + (VARM() && L.length ? `<p class="cf-tot" data-cftot="1" role="status">${totLine(d)}${AU ? ` <button type="button" class="linkb" data-cfset="minsMode" data-v="each">${esc(unit(d))}별 길이 직접 고치기</button>` : ''}</p>` : (cfgOf() && typeof cfgOf().totLine === 'function' ? `<p class="cf-tot" data-cftot="1" role="status">${cfgOf().totLine(d)}</p>` : '')) + errLine('weekPlan') + '</div>';
      },
      valid(d) { const P = []; if (+d._over > MAXS) { P.push({ k: 'sessions', msg: `${unit(d)}는 ${MAXS}개까지 만들 수 있어 ${MAXS}개로 맞췄습니다. 위 안내에서 [총 ${+d._over}시간으로 맞추기]를 누르면 1${unit(d)} 시간을 늘려 맞춥니다.` }); d._overNote = +d._over; delete d._over; return P; }
        if (!(d.weekPlan || []).length) { d.weekPlan = planFrom(d); return P; } if (false) P.push({ k: 'weekPlan', msg: `${unit(d)} 목록이 비어 있습니다. [AI SAM이 ${unit(d)} 목록 만들기]를 누르거나 하나 이상 적어 주세요.` }); d.weekPlan.forEach((w, i) => { if (!String(w.title || '').trim()) w.title = `${i + 1}${unit(d) === '회차' ? '회차' : unit(d) === '주차' ? '주차' : '차시'} 수업`; });
        if (eachOn(d)) { const rem = cfgKey() === 'voc' && (d.mode || 'remote') === 'remote'; const mx = rem ? 60 : 600; const bad = d.weekPlan.findIndex(w => !(+w.mins >= 5 && +w.mins <= mx)); if (bad >= 0) P.push({ k: 'weekPlan', msg: `${bad + 1}${unit(d)} 길이를 5~${mx}분 사이로 적어 주세요.${rem ? ' 원격 훈련은 1차시 60분까지 인정합니다.' : ''}` }); } return P; },
      aiFill(d) { d.weekPlan = planFrom(d); d.sessions = d.weekPlan.length; return Promise.resolve(d); } },
    { id: 'fill', title: d => `${unit(d)} 채우기`, now: d => `${unit(d)}마다 넣을 강의 영상 · 교안 · 퀴즈를 고르세요. 시험 · 설문은 아래에서 만듭니다. 나중에 채워도 됩니다.`,
      render(el, d) { if (window.CT && typeof CT.renderFill === 'function') { try { CT.renderFill(el, d); return; } /* 법정 시간 안내는 CT.renderFill이 CF.legalBox로 맨 위에 그린다(다시 그려도 남게) */ catch (e) { console.error('CT.renderFill', e); } } fillDefault(el, d); const lh = legalBox(d); if (lh) el.insertAdjacentHTML('afterbegin', lh); },
      valid() { return []; },
      aiFill(d) { if (window.CT && typeof CT.aiFill === 'function') return Promise.resolve(CT.aiFill(d)).then(() => d); d.auto = { ...defs().auto, ...(d.auto || {}) }; return Promise.resolve(d); } },
    { id: 'setup', title: () => '수강 설정', now: () => `${josa(T('fee'), '과')} 수강 기간, 공개 범위를 정해 주세요.`,
      render(el, d) {
        const D = defs(); if (d.paid == null && !askOf('setup')) d.paid = (+d.price || 0) > 0; if (d.days == null) d.days = D.days; if (d.open == null) d.open = '전체';
        const CA = critAsk(d);
        el.innerHTML = setupBlock(d, [
          { k: 'paid', label: T('fee'), kind: 'choice', opts: [[false, '무료', '누구나 바로 신청합니다'], [true, '유료', '금액을 정합니다']] },
          { k: 'price', label: `${T('fee')}(원)`, kind: 'num', min: 0, max: 100000000, unit: '원', ex: '150000 (15만 원)', show: x => x.paid === true || x.paid === 'true' },
          { k: 'days', label: '수강 기간', kind: 'choice', opts: [[30, '30일'], [60, '60일'], [90, '90일'], [180, '180일'], ['custom', '직접 정하기', '날짜 · 일수']], hint: '신청한 날부터 이 기간 동안 들을 수 있습니다.' },
          { k: 'open', label: '누구에게 보이나요', kind: 'choice', opts: [['전체', '모두에게 공개', '홈페이지에 바로 보입니다'], ['지정 회원', '정한 사람만', '초대한 사람만 듣습니다'], ['비공개', '아직 숨겨 두기', '준비가 끝나면 공개합니다']] }], CA) +
          evalBlock(d) +
          (['adult', 'k12', 'lifelong'].includes(S.org.type) ? `<p class="cf-adv">회차 · 요일반 · 구독처럼 세부 운영이 필요하면 <button type="button" class="linkb" data-act="cls-new-adv">자세한 설정으로 만들기</button></p>` : '');
      },
      valid(d) { const P = []; if ((d.paid === true || d.paid === 'true') && !(+d.price > 0)) P.push({ k: 'price', msg: `유료라면 ${josa(T('fee'), '을')} 적어 주세요. 무료면 '무료'를 누르세요.` }); return P.concat(setupProblems(d)); },
      aiFill(d) { const D = defs(); if (d.paid == null) d.paid = false; if (d.days == null) d.days = D.days; if (d.open == null) d.open = '전체'; return Promise.resolve(d); } },
    { id: 'open', title: () => '미리보기 · 개설', now: () => `${T('learner')}에게 보일 모습을 확인하고 [개설하기]를 누르세요.`,
      render(el, d) { syncGoal(d, true); if (d.fillEmpty == null) d.fillEmpty = false; el.innerHTML = previewHTML(d); },
      valid() { return []; },
      aiFill(d) { return Promise.resolve(d); } }
  ];
  const AUTO = [['video', '강의 영상', '#마다 영상 1개(YouTube 추천 또는 AI 영상)', 'play'], ['docs', '교안', '#마다 강의자료 초안', 'doc'], ['quiz', '확인 퀴즈', '#마다 5문항', 'check'], ['assign', '과제', '실습 과제 + 채점 기준', 'book'], ['exam', '최종 평가', '마지막에 시험 1번', 'chart']];
  function fillDefault(el, d) {
    const A = d.auto = { ...defs().auto, ...(d.auto || {}) }; const u = unit(d); const items = d.curriculum || [];
    el.innerHTML = `<p class="cf-lab">${esc(u)}마다 자동으로 넣을 것 <span class="cf-later">나중에 해도 됩니다</span></p><div class="cf-auto">${AUTO.map(([k, l, s, i]) => { const onV = k === 'video' ? A.video !== 'none' : !!A[k]; return `<button type="button" class="${onV ? 'on' : ''}" aria-pressed="${onV}" data-cfauto="${k}">${typeof ic === 'function' ? ic(i, 22) : ''}<span class="cf-at"><b>${esc(l)}</b><small>${esc(s.replace('#', u))}</small></span><span class="cf-ck">${onV ? '넣습니다' : '뺍니다'}</span></button>`; }).join('')}</div>` +
      (A.video !== 'none' ? ui.field({ k: '_vsrc', label: '강의 영상은 어떻게 준비할까요', kind: 'choice', opts: [['youtube', 'YouTube에서 추천', '알맞은 영상을 찾아 연결'], ['ai', 'AI로 강의 영상 만들기', '슬라이드 + 음성(미리보기 품질)']] }, { _vsrc: A.video }) : '') +
      ui.note(`빈 ${esc(u)}에 위 내용을 넣을지는 마지막 확인 화면에서 고릅니다(기본은 비워 둡니다). 만든 뒤 ${esc(josa(u, '을'))} 눌러 영상 · 교안을 바꾸거나 파일을 올릴 수 있습니다.${items.length ? ` 직접 넣은 콘텐츠 ${items.length}개는 그대로 씁니다.` : ''}`);
  }
  function previewHTML(d) {
    const c = cfgOf(); const u = unit(d); const L = d.weekPlan || []; const paid = d.paid == null ? +d.price > 0 : (d.paid === true || d.paid === 'true');
    let sum = [['배울 사람', d.target || '누구나'], [`${u} 수`, `${L.length}${u === '회차' ? '회' : '개'}`], [T('fee'), paid && +d.price ? won(d.price) : '무료'], ['수강 기간', `신청 후 ${d.days || defs().days}일`], ['공개', { 전체: '모두에게 공개', '지정 회원': '정한 사람만', 비공개: '아직 숨겨 두기' }[d.open] || d.open || '모두에게 공개']];
    try { if (c && typeof c.summary === 'function') { const x = c.summary(d); if (Array.isArray(x) && x.length) sum = [...(x.some(r => /대상|배울/.test(r[0])) ? [] : [sum[0]]), [`${u} 수`, sum[1][1]], ...x].filter((r, i, A) => A.findIndex(y => y[0] === r[0]) === i); } } catch (e) { }
    { const pt = periodTxt(d); if (pt) { const i = sum.findIndex(r => /수강 기간|교육 기간|^기간$/.test(r[0])); if (i >= 0) sum[i] = [sum[i][0], pt]; else sum.push(['수강 기간', pt]); } const rt = recTxt(d); if (rt) { const i = sum.findIndex(r => /^모집|신청/.test(r[0])); if (i >= 0) sum[i] = [sum[i][0], rt]; else sum.push(['수강신청', rt]); } }
    if (critOn()) { critAsk(d); const ct = critTxt(d); const i = sum.findIndex(r => /이수 기준|수료 기준/.test(r[0])); if (i >= 0) sum[i] = [sum[i][0], ct]; else sum.push([`${T('done')} 기준`, ct]); if (!sum.some(r => /기간/.test(r[0]))) sum.push(['수강 기간', `신청 후 ${+d.days || defs().days}일`]); }
    { const et = evalTxt(d); if (et) sum.push(['평가 기준', et]); }
    const W = checks(d); const nE = emptyN(d);
    const chk = W.length ? `<div class="cf-chk">${W.map(w => `<p class="cf-c ${esc(w.lv || 'warn')}"><b>${w.lv === 'stop' ? '꼭 고칠 것' : w.lv === 'info' ? '참고' : '확인할 것'}</b> ${esc(w.msg)}${w.law ? ` <small>(${esc(w.law)})</small>` : ''}${w.fix ? ` <button type="button" class="linkb" data-cffix="${esc(JSON.stringify(w.fix))}">이렇게 고치기</button>` : ''}</p>`).join('')}</div>` : '';
    /* 확인 화면에서 바로 고치기: 교육 목표(평가 1회차 1번) · 빈 차시 AI 채우기 선택(기본 끔, 2번) */
    const edit = ui.field({ k: 'goal', label: '교육 목표', kind: 'area', rows: 4, maxLen: 1200, hint: `${T('learner')} 소개 화면에 그대로 보입니다. 여기서 바로 고칠 수 있습니다.`, ai: 'AI SAM이 다시 쓰기' }, d) +
      (nE ? ui.field({ k: 'fillEmpty', label: `빈 ${u} ${nE}개를 AI로 채울까요?`, kind: 'toggle', on: `예, 빈 ${josa(u, '에')} 영상 · 교안 · 퀴즈 초안을 넣습니다`, hint: `끄면 빈 ${josa(u, '은')} 비워 둔 채 개설합니다. 나중에 ${u}마다 하나씩 채울 수 있습니다.` }, d) : '');
    /* 내용이 하나도 없는 채로 공개하면 학습자 화면에 '준비 중'(신청 불가)으로 보인다(lshop prepOf) — 평가 2회차 4번 */
    const prepN = (L.length && nE >= L.length && d.kind !== 'episode' && cfgKey() !== 'k12' && (d.open || defs().open) !== '비공개') ? ui.note(`<b>아직 넣은 콘텐츠가 없습니다.</b> 이대로 개설하면 '준비 중(비공개)'으로 만들어 ${josa(T('learner'), '에게')} 보이지 않고 알림도 보내지 않습니다. 아래 '빈 ${josa(u, '을')} AI로 채울까요?'를 켜거나, 개설한 뒤 ${josa(u, '에')} 영상 · 교안 · 퀴즈를 하나 이상 넣고 공개하십시오.`, 'warn cf-prep') : '';
    const noV = critOn() && d.critBy === 'video' && !(d.curriculum || []).some(x => x && x.type === 'video') && !(d.fillEmpty === true || d.fillEmpty === 'true') ? ui.note(`<b>아직 넣은 강의 영상이 없습니다.</b> 그래서 지금은 모든 콘텐츠 진도로 셉니다. 영상을 넣은 뒤 설정 탭의 ${esc(T('done'))} 기준에서 영상 항목을 고르면 영상 진도만 셉니다.`, 'warn') : '';
    return legalBox(d) + chk + prepN + noV + `<p class="cf-lab">${esc(T('learner'))}에게 이렇게 보입니다</p>${thumbSlot(d)}<div class="cf-pv"><div class="cf-pvh">${d.thumb ? `<img class="cf-pvimg" src="${esc(d.thumb)}" alt="">` : ''}<span class="cf-pvt">${esc(T('cls'))}</span><b>${esc(d.name || '이름 없음')}</b><p data-cfpvgoal="1"${d.goal ? '' : ' hidden'}>${esc(String(d.goal || '').slice(0, 160))}</p></div>
      <dl class="cf-pvs">${sum.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      <ol class="cf-pvl">${L.slice(0, 8).map((w, i) => `<li><span>${i + 1}</span>${esc(w.title)}</li>`).join('')}${L.length > 8 ? `<li class="more">… 외 ${L.length - 8}개</li>` : ''}</ol><div class="cf-pvb"><span class="btn pri">신청하기</span></div></div>` + `<div class="cf-pved">${edit}</div>`;
  }
  /* 법정 교육시간(compliance.js cplLegalHours, 템플릿 id는 d.tpl) — 3단계 · 확인 화면 맨 위에 보인다. 미달이면 경고 */
  const LEGAL_T = ['corp', 'public', 'voc']; /* v36: 법정 교육시간 안내는 법정교육을 운영하는 유형만(대학 · 학원 · 평생에는 띄우지 않음) */
  const legalBox = d => { let L = null; if (!LEGAL_T.includes(cfgKey())) return ''; try { if (typeof window.cplLegalHours === 'function') L = window.cplLegalHours({ ...d, tpl: d.tpl || '', sessions: +d.sessions || (d.weekPlan || []).length, ...(eachOn(d) ? { hours: totOf(d) } : {}) }); } catch (e) { console.error('cplLegalHours', e); } if (!L) return '';
    return `<p class="cf-c ${L.short ? 'warn' : 'info'} cf-legal" role="${L.short ? 'alert' : 'status'}"><b>${L.short ? '법정 교육시간 미달' : '법정 교육시간'}</b> ${esc(L.msg)} <small>(${esc(L.law)})</small>${L.short ? ` <button type="button" class="btn sm pri cf-legalfix" data-cflegal="${esc(L.need)}">법정 시간(${esc(L.need)}시간)에 맞추기</button>` : ''}</p>`; };
  const legalOf = d => { if (!LEGAL_T.includes(cfgKey())) return null; try { return typeof window.cplLegalHours === 'function' ? window.cplLegalHours({ ...d, tpl: d.tpl || '', hours: eachOn(d) ? totOf(d) : 0, sessions: +d.sessions || (d.weekPlan || []).length }) : null; } catch (e) { return null; } };
  /* ───── 총 시간으로 맞추기(평가 2회차 1번): 차시는 MAXS개까지 — 넘치면 말없이 줄이지 않고, 1차시 시간을 늘려 총 시간을 맞춘다 ───── */
  const MAXS = 60;
  const hmTxt = m => { m = Math.round(+m || 0); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}시간${r ? ' ' + r + '분' : ''}` : `${r}분`; };
  const curMins = d => +d.mins || (planOf(d).mins) || defs().mins || 60;
  /* v36 지시 1-③-3): 차시 길이 — 모든 차시 같게(기본) 또는 차시마다 다르게(차시별 분 직접 입력). 1차시 길이를 묻는 유형(cfg.ask.outline에 mins)만 */
  const VARM = () => (askOf('outline') || []).some(f => f.k === 'mins');
  const eachOn = d => !!d && (d.minsMode === 'each' || d.minsMode === 'auto') && VARM(); /* 차시별 분을 쓰는 방식(직접 · 자동) */
  const eachOnly = d => !!d && d.minsMode === 'each' && VARM();
  /* v36 1-③-3) '자동으로 다르게': 총 시간(차시 수 × 1차시 길이)은 그대로 두고, 차시 제목 · 넣은 콘텐츠 양에 맞춰 차시마다 길이를 나눈다(5분 단위).
     오리엔테이션 · 정리 · 시험은 짧게, 실습 · 프로젝트 · 사례는 길게. 직접 고치면 '차시마다 다르게(직접)'로 바뀐다 */
  const W_SHORT = /오리엔테이션|소개|안내|정리|요약|복습|퀴즈|시험|평가|고사|설문|마무리|수료/; const W_LONG = /실습|프로젝트|사례|심화|응용|워크숍|발표|토론|따라\s*하기|만들기|분석/;
  function autoDist(d) { const L = d.weekPlan || []; const n = L.length; if (!n) return; const base = curMins(d); const tot = n * base; const rem = cfgKey() === 'voc' && (d.mode || 'remote') === 'remote'; const mx = rem ? 60 : 600; const mn = Math.min(base, rem ? 25 : 10);
    const cnt = i => (d.curriculum || []).filter(x => x && +x.week === i + 1 && x.type !== 'offline').length;
    const wt = L.map((w, i) => { const t = String(w.title || ''); let v = 1; if (W_SHORT.test(t)) v -= 0.35; if (W_LONG.test(t)) v += 0.4; v += Math.min(0.3, t.replace(/\s/g, '').length / 80) + Math.min(0.45, cnt(i) * 0.15) + (String(w.goal || '').length > 40 ? 0.1 : 0); return Math.max(0.3, v); });
    const sw = wt.reduce((a, b) => a + b, 0); const M = wt.map(v => Math.max(mn, Math.min(mx, Math.round(tot * v / sw / 5) * 5)));
    let diff = tot - M.reduce((a, b) => a + b, 0); let guard = 0; /* 반올림으로 생긴 차이를 5분씩 큰 · 작은 차시에서 맞춘다 → 합계는 처음 총 시간과 같다 */
    while (Math.abs(diff) >= 5 && guard++ < 2000) { const up = diff > 0; let j = -1; M.forEach((m, i) => { if (up ? m + 5 <= mx : m - 5 >= mn) { if (j < 0 || (up ? wt[i] / M[i] > wt[j] / M[j] : wt[i] / M[i] < wt[j] / M[j])) j = i; } }); if (j < 0) break; M[j] += up ? 5 : -5; diff += up ? -5 : 5; }
    if (diff) M[M.length - 1] = Math.max(1, M[M.length - 1] + diff); L.forEach((w, i) => { w.mins = M[i]; }); }
  const wMins = (d, w) => +(w && w.mins) > 0 ? +w.mins : curMins(d);
  const totMin = d => eachOn(d) && (d.weekPlan || []).length ? d.weekPlan.reduce((a, w) => a + wMins(d, w), 0) : (+d.sessions || (d.weekPlan || []).length || 0) * curMins(d);
  const totOf = d => Math.round(totMin(d) / 60 * 10) / 10;
  const totLine = d => { const u = unit(d); const n = (d.weekPlan || []).length || +d.sessions || 0; if (d.minsMode === 'auto' && eachOn(d)) return `${u} ${n}개 · 내용 양에 맞춰 길이를 나눴습니다 · 합계 <b>${hmTxt(totMin(d))}</b>(${u} ${n}개 × ${hmTxt(curMins(d))}과 같음)`; return eachOn(d) ? `${u} ${n}개 · 차시마다 다름 · 합계 <b>${hmTxt(totMin(d))}</b>` : `${u} ${n}개 × ${hmTxt(curMins(d))} = 합계 <b>${hmTxt(totMin(d))}</b>`; };
  const minsModeF = d => VARM() ? ui.field({ k: 'minsMode', label: `${unit(d)} 길이를 어떻게 정할까요`, kind: 'choice', opts: [['same', `모든 ${unit(d)} 같게`, '위에서 고른 길이'], ['auto', '자동으로 다르게', '내용 양에 맞춰 AI가 나눔 · 총 시간 그대로'], ['each', `${unit(d)}마다 다르게`, `${unit(d)}별로 분을 직접 적습니다`]] }, d) : '';
  const minsOpts = d => { const f = (askOf('outline') || []).find(x => x.k === 'mins' && shown(x, d)); const o = f ? (f.opts || []).map(x => +x[0]).filter(x => x > 0) : []; return (o.length ? o : [25, 30, 50, 60, 90, 120, 180]).sort((a, b) => a - b); };
  function fitPlan(d, H) { const tot = Math.round(+H * 60); const O = minsOpts(d); const cur = +d.mins || 0; const ok = m => Math.ceil(tot / m) <= MAXS; const ex = m => tot % m === 0;
    const m = (O.includes(cur) && ok(cur) && ex(cur)) ? cur : (O.find(x => ok(x) && ex(x)) || (O.includes(cur) && ok(cur) ? cur : O.find(ok)) || O[O.length - 1]);
    const n = clamp(Math.ceil(tot / m), 1, MAXS); return { sessions: n, mins: m, hours: Math.round(n * m / 60 * 10) / 10, reach: n * m >= tot, max: Math.round(MAXS * O[O.length - 1] / 60) }; }
  function applyFit(H, why) { if (!F || !(+H > 0)) return null; const d = F.d; snap(why || '총 시간 맞추기'); if (d.minsMode === 'each') d.minsMode = 'same'; /* 총 시간으로 맞추면 모든 차시 같은 길이로 */ const r = fitPlan(d, H); d.sessions = r.sessions; d.mins = r.mins; d.totalH = r.hours; delete d._over; delete d._overNote;
    emit('change', { step: F.ids[F.step], field: 'sessions', d }); syncPlan(); const u = unit(d);
    if (r.reach) toast(`${u} ${r.sessions}개 × ${hmTxt(r.mins)} = 총 ${r.hours}시간으로 맞췄습니다. [되돌리기]로 되돌릴 수 있습니다.`, 'ok'); else toast(`${u}는 ${MAXS}개까지라 지금 방식으로는 최대 ${r.max}시간입니다. 훈련 방식(집체 · 혼합)을 바꾸면 1${u} 시간을 더 길게 고를 수 있습니다.`, 'warn'); return r; }
  /* 총 시간 칸(cfg.ask.outline의 totalH)은 지금 차시 수 × 1차시 시간을 보여 주고, 고쳐 쓰면 거꾸로 맞춘다 */
  const hasTot = () => (askOf('outline') || []).some(x => x.k === 'totalH');
  const totSync = d => { if (hasTot()) d.totalH = totOf(d); };
  const overNote = d => { const v = +d._overNote || +d._over; if (!(v > MAXS)) return ''; const u = unit(d); const r = fitPlan(d, v);
    return `<div class="cf-note warn cf-over" role="status"><b>${u}는 ${MAXS}개까지 만들 수 있습니다.</b> ${v}${josa(String(v), '을').slice(String(v).length)} 넣으셔서 ${MAXS}개로 맞춰 두었습니다. 총 ${v}시간이 필요하면 1${u} 시간을 늘려 맞출 수 있습니다${r.reach ? `(${u} ${r.sessions}개 × ${hmTxt(r.mins)})` : ''}. <button type="button" class="btn sm pri" data-cffit="${v}">총 ${v}시간으로 맞추기</button></div>`; };
  /* 아직 아무 콘텐츠도 넣지 않은 차시 수(회차 일정 항목 offline은 콘텐츠로 치지 않음) */
  const emptyN = d => { const L = d.weekPlan || []; const has = new Set((d.curriculum || []).filter(x => x && x.type !== 'offline').map(x => +x.week || 0)); return L.filter((w, i) => !has.has(i + 1)).length; };
  const checks = d => { const c = cfgOf(); let R = []; try { R = (c && typeof c.check === 'function' && c.check(d)) || []; } catch (e) { console.error('cfg.check', e); R = []; } try { R = R.concat(flowChecks(d)); } catch (e) { console.error('flowChecks', e); } return R; };
  /* v38: 유형과 상관없는 확인 — 지난 신청 기간(U-15) · 평가 없는 직업훈련 과정(V-13) */
  /* 결제를 받을 수 있는가(sales2 tossOK와 같은 기준). 결제 · 수납을 끈 기관은 가격을 쓰지 않으므로 묻지 않는다 */
  const payReady = () => { try { if (typeof mbPayOn === 'function' && !mbPayOn()) return true; const st = (S && S.settings) || {}; return st.pg === 'toss' && st.toss && st.toss.status === '승인'; } catch (e) { return true; } };
  const flowChecks = d => { const R = []; const td0 = typeof today === 'function' ? today() : '';
    if (d.rdays === 'custom' && d.rTo && td0 && d.rTo < td0) R.push({ lv: 'warn', k: 'rTo', step: '', msg: `신청 마감일(${fmtD(d.rTo)})이 이미 지났습니다. 이대로 개설하면 ${josa(T('learner'), '이')} 신청할 수 없습니다. 설정 단계에서 마감일을 오늘(${fmtD(td0)}) 이후로 바꿔 주십시오.` });
    else if (d.rdays === 'custom' && d.rFrom && d.rTo && td0 && d.rFrom < td0 && d.rTo >= td0) R.push({ lv: 'info', k: 'rFrom', msg: `신청 시작일이 오늘보다 앞이라 개설하면 바로 신청을 받습니다(${fmtD(d.rTo)}까지).` });
    { const paid = d.paid == null ? +d.price > 0 : (d.paid === true || d.paid === 'true'); if (paid && +d.price > 0 && !payReady()) R.push({ lv: 'warn', k: 'price', fix: { paid: false, price: 0 }, msg: `${T('fee')}를 받는 ${T('cls')}이지만 결제가 아직 연결되지 않았습니다. 이대로 공개하면 ${josa(T('learner'), '은')} '결제 준비 중'만 보고 신청할 수 없습니다. [이렇게 고치기]를 누르면 무료 신청으로 받고, 유료로 받으려면 개설 뒤 결제 연결(설정 › 결제 · 수납)을 마치십시오.` }); } /* v38 L-3 */
    if (cfgKey() === 'voc') { const fill = d.fillEmpty === true || d.fillEmpty === 'true'; const A = { ...defs().auto, ...(d.auto || {}) }; const ex = (d.curriculum || []).some(x => x && x.type === 'exam') || (fill && A.exam); if (!ex) R.push({ lv: 'warn', k: 'exam', msg: '평가(시험)가 없습니다. 직업훈련 과정은 수료 기준에 평가 점수(보통 60점 이상)가 들어가 평가 없이는 아무도 수료할 수 없습니다. 차시 채우기 단계에서 [시험 만들기]로 최종 평가를 넣어 주십시오.', law: '규정 준수 › 훈련 규정의 수료 기준' }); }
    return R; };

  /* ═════════ v36 지시 1-③ 4)~6): 시험 · 설문 · 수강/신청 기간 직접 설정 · 평가 기준 ═════════ */
  const SCALE5 = ['매우 그렇다', '그렇다', '보통이다', '그렇지 않다', '전혀 그렇지 않다'];
  const EXK = { mid: { n: '중간고사', d: '과정 가운데에서 배운 내용을 확인합니다' }, final: { n: '기말고사', d: '마지막에 전체 내용을 평가합니다' }, test: { n: '과정 테스트', d: '이수 평가 · 수료 시험' }, survey: { n: '설문', d: '만족도 · 강의 평가 · 사전 설문' } };
  const SVT = { sat: ['과정 만족도 설문', ['이 과정에 전반적으로 만족합니다.', '강의 내용이 이해하기 쉬웠습니다.', '배운 내용을 업무 · 학습에 활용할 수 있습니다.', '강사(교수)의 설명이 충분했습니다.', '다른 사람에게 이 과정을 추천하겠습니다.'], '더 좋아지려면 무엇을 바꾸면 좋을까요?'],
    lec: ['강의 평가', ['수업 목표가 분명하게 안내되었습니다.', '수업 자료가 학습에 도움이 되었습니다.', '수업 진행 속도가 알맞았습니다.', '질문에 대한 답이 충분했습니다.', '평가(시험 · 과제)가 배운 내용과 맞았습니다.', '수업 분량이 알맞았습니다.', '이 수업으로 실력이 늘었다고 느낍니다.'], '좋았던 점과 아쉬웠던 점을 적어 주세요.'],
    pre: ['사전 설문', ['이 주제를 배운 적이 있습니다.', '이 과정에 기대가 큽니다.'], '이 과정에서 꼭 배우고 싶은 것을 적어 주세요.'] };
  const exItems = d => (d.curriculum || []).filter(x => x && (x.type === 'exam' || x.type === 'survey'));
  const nW = d => Math.max(1, (d.weekPlan || []).length || +d.sessions || 1);
  const exInfo = it => { if (it.type === 'survey') return `${(it.qs || []).length}문항`; const R = it.rules || {}; const n = (it.qs || []).length; const dn = +R.draw > 0 && +R.draw < n ? +R.draw : n;
    return [dn < n ? `문제 ${n}개 중 ${dn}개 무작위 출제` : `${n}문항`, it.time ? `${it.time}분` : '', R.retry && R.retry.mode === 'count' ? `재응시 ${Math.max(0, +R.retry.v - 1)}번` : '재응시 없음', R.pass && R.pass.on ? `통과 ${R.pass.v}점` : '통과 점수 없음'].filter(Boolean).join(' · '); };
  const ctHas = k => { try { return !!(window.CT && typeof CT.open === 'function' && Array.isArray(CT.kinds) && CT.kinds.some(x => x && x.k === k)); } catch (e) { return false; } };
  function exPanel(d) { const L = exItems(d); const u = unit(d); const ic0 = n => typeof ic === 'function' ? ic(n, 18) : '';
    return `<section class="cf-exb" aria-labelledby="cfExH"><div class="cf-exh"><p class="cf-lab" id="cfExH">시험 · 설문 만들기 <span class="cf-later">나중에 해도 됩니다</span></p><p class="cf-hint">중간고사 · 기말고사 · 과정 테스트는 문제를 넉넉히 만들어 두고 응시할 때마다 무작위로 냅니다. 시험 시간 · 재응시 · 통과 점수도 여기서 정합니다.</p></div>
      ${L.length ? `<ul class="cf-exl">${L.map(it => `<li><span class="cf-exi">${ic0(it.type === 'survey' ? 'chat' : 'check')}</span><span class="cf-ext"><b>${esc(it.title)}</b><small>${esc(`${+it.week || 1}${u}`)} · ${esc(exInfo(it))}</small></span><span class="cf-exa">${ctHas(it.type) ? `<label class="cf-exwks"><span class="sr">${esc(it.title)} 넣을 ${esc(u)}</span><select data-cfexwk="${esc(it.id)}" aria-label="「${esc(it.title)}」 넣을 ${esc(u)}">${Array.from({ length: nW(d) }, (_, i) => `<option value="${i + 1}" ${+it.week === i + 1 ? 'selected' : ''}>${i + 1}${esc(u)}</option>`).join('')}</select></label><button type="button" class="btn sm" data-cfex="q" data-v="${esc(it.id)}">${it.type === 'survey' ? '문항 · 설정 고치기' : '문제 · 설정 고치기'}</button>` : `<button type="button" class="btn sm" data-cfex="set" data-v="${esc(it.id)}">설정 바꾸기</button><button type="button" class="btn sm" data-cfex="q" data-v="${esc(it.id)}">${it.type === 'survey' ? '문항 고치기' : '문제 고치기'}</button>`}<button type="button" class="btn sm ghost" data-cfex="del" data-v="${esc(it.id)}" aria-label="「${esc(it.title)}」 빼기">빼기</button></span></li>`).join('')}</ul>` : ''}
      <div class="cf-exg">${Object.entries(EXK).map(([k, x]) => `<button type="button" data-cfex="new" data-k="${k}">${ic0(k === 'survey' ? 'chat' : 'check')}<span><b>${esc(x.n)} 만들기</b><small>${esc(x.d)}</small></span></button>`).join('')}</div></section>`; }
  let EX = null; /* 시험 · 설문 설정 창 상태 */
  const exDef = (k, d) => { const n = nW(d); const voc = cfgKey() === 'voc'; return { kind: k, id: null, week: k === 'mid' ? Math.ceil(n / 2) : n, n: k === 'test' ? 10 : 20, mult: voc ? 3 : 2, time: k === 'test' ? 30 : 60, retake: 1, pass: 60, sv: 'sat' }; };
  function exOpen(k, id) { if (!F) return; readBody(); const d = F.d; if (id) { const it = (d.curriculum || []).find(x => x.id === id); if (!it) return; const R = it.rules || {}; const x = it.exam || {};
      EX = it.type === 'survey' ? { kind: 'survey', id, week: +it.week || nW(d), sv: it.svTpl || 'sat' } : { kind: x.kind || 'test', id, week: +it.week || nW(d), n: +x.n || +R.draw || (it.qs || []).length || 10, mult: +x.mult || 1, time: +it.time || 60, retake: R.retry && R.retry.mode === 'count' ? Math.max(0, +R.retry.v - 1) : 0, pass: R.pass && R.pass.on ? +R.pass.v : 0 }; }
    else EX = exDef(k, d); exDraw(); }
  const chipRow = (k, label, opts, ex) => `<div class="cf-f" data-cff="ex_${k}"><span class="cf-lab">${esc(label)}</span><div class="cf-choice cf-chips" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l, dis]) => `<button type="button" role="radio" aria-checked="${String(EX[k]) === String(v)}" class="${String(EX[k]) === String(v) ? 'on' : ''}" data-cfx="${k}" data-v="${esc(v)}" ${dis ? 'disabled' : ''}><b>${esc(l)}</b></button>`).join('')}</div>${ex ? exLine(ex) : ''}</div>`;
  function exDraw() { const w = $('#crsFlow'); if (!w || !EX || !F) return; let sh = w.querySelector('#cfExSh'); if (!sh) { sh = document.createElement('div'); sh.id = 'cfExSh'; sh.className = 'cf-shw'; w.appendChild(sh); }
    const d = F.d; const u = unit(d); const n = nW(d); const K = EXK[EX.kind]; const sv = EX.kind === 'survey'; const ttl = `${K.n} ${EX.id ? '설정 바꾸기' : '만들기'}`;
    const wk = `<div class="cf-f" data-cff="ex_week"><span class="cf-lab">몇 ${esc(u)}에 넣을까요</span><div class="cf-num"><button type="button" class="cf-nb" data-cfx="week" data-v="${Math.max(1, EX.week - 1)}" aria-label="앞 ${esc(u)}">−</button><output class="cf-exwk">${EX.week}${esc(u)}</output><button type="button" class="cf-nb" data-cfx="week" data-v="${Math.min(n, EX.week + 1)}" aria-label="뒤 ${esc(u)}">+</button></div>${exLine(`${((d.weekPlan || [])[EX.week - 1] || {}).title || ''}`.trim() ? `${EX.week}${u} 「${(d.weekPlan[EX.week - 1] || {}).title}」 뒤에 봅니다` : '')}</div>`;
    let body = '';
    if (sv) body = wk + chipRow('sv', '어떤 설문인가요', Object.entries(SVT).map(([k, x]) => [k, `${x[0]}(${x[1].length + 1}문항)`])) + `<p class="cf-hint">5단계(매우 그렇다 ~ 전혀 그렇지 않다)로 답하고, 마지막에 자유롭게 적는 문항이 하나 있습니다. 만든 뒤 문항을 고칠 수 있습니다.</p>`;
    else { const bank = Math.min(60, EX.n * EX.mult);
      body = wk + chipRow('n', '한 번에 몇 문제를 낼까요', [[5, '5문제'], [10, '10문제'], [20, '20문제'], [25, '25문제']]) +
        chipRow('mult', '문제 은행(몇 배로 만들어 둘까요)', [[1, '낼 만큼만'], [2, '2배'], [3, '3배'], [5, '5배']].map(([v, l]) => [v, l, EX.n * v > 60]), cfgKey() === 'voc' ? '직업훈련 평가는 낼 문제 수의 3배 이상을 준비합니다(별표 1)' : '예: 2배면 20문제를 내기 위해 40문제를 만들어 두고, 응시할 때마다 무작위로 20개를 냅니다') +
        `<p class="cf-note cf-exsum" role="status">${EX.mult > 1 ? `문제 <b>${bank}개</b>를 만들어 두고, 응시할 때마다 <b>${EX.n}개</b>를 무작위로 냅니다. 사람마다 다른 문제가 나옵니다.` : `문제 <b>${EX.n}개</b>를 모두 냅니다(순서만 섞습니다).`}</p>` +
        chipRow('time', '시험 시간', [[20, '20분'], [30, '30분'], [40, '40분'], [50, '50분'], [60, '60분'], [90, '90분']]) +
        chipRow('retake', '다시 볼 수 있는 횟수(재응시)', [[0, '없음'], [1, '1번'], [2, '2번'], [3, '3번']]) +
        chipRow('pass', '통과 점수', [[0, '없음'], [60, '60점'], [70, '70점'], [80, '80점']], '통과 점수를 정하면 다음 단계의 이수 기준에 넣을 수 있습니다'); }
    const go = EX.busy ? `<span class="cf-busy" role="status">AI SAM이 문제를 만들고 있습니다…</span>` : `<button type="button" class="btn cf-big" data-cfxgo="cancel">취소</button><button type="button" class="btn pri cf-big" data-cfxgo="make">${sv ? (EX.id ? '이대로 바꾸기' : '설문 만들기') : EX.id ? '이대로 바꾸기' : `AI SAM이 문제 ${Math.min(60, EX.n * EX.mult)}개 만들기`}</button>`;
    sh.innerHTML = `<div class="cf-sheet" role="dialog" aria-modal="true" aria-label="${esc(ttl)}"><header class="cf-shh"><b>${esc(ttl)}</b><button type="button" class="cf-x" data-cfxgo="cancel" aria-label="닫기">${typeof ic === 'function' ? ic('x', 20) : '✕'}</button></header><div class="cf-shb">${body}</div><footer class="cf-shf">${go}</footer></div>`; }
  const exClose = () => { EX = null; const sh = $('#cfExSh'); if (sh) sh.remove(); };
  const renum = Q => Q.forEach((q, k) => { q.q = `${k + 1}. ${String(q.q || '').replace(/^\s*\d+\.\s*/, '')}`; });
  async function exMake() { if (!F || !EX || EX.busy) return; const d = F.d; const L = d.curriculum = Array.isArray(d.curriculum) ? d.curriculum : []; const K = EXK[EX.kind]; const tp = (U() ? '' : topicCore(d)) || String(d.name || '').trim() || T('cls'); let it = EX.id ? L.find(x => x.id === EX.id) : null; const isNew = !it;
    snap(`${K.n} ${isNew ? '만들기' : '설정 바꾸기'}`);
    if (EX.kind === 'survey') { const S0 = SVT[EX.sv] || SVT.sat; if (!it) { it = { id: uid('it'), type: 'survey', title: `${S0[0]}`, week: EX.week, mins: 3 }; L.push(it); }
      if (isNew || it.svTpl !== EX.sv) { it.qs = [...S0[1].map(q => ({ id: uid('sq'), q, t: 'single', opts: SCALE5.slice(), req: true })), { id: uid('sq'), q: S0[2], t: 'text', opts: [], req: false }]; it.title = S0[0]; }
      it.svTpl = EX.sv; it.week = EX.week; }
    else { const bank = Math.min(60, EX.n * EX.mult); if (!it) { it = { id: uid('it'), type: 'exam', title: `${tp} ${K.n}`.slice(0, 60), week: EX.week, qs: [] }; L.push(it); }
      const need = bank - (it.qs || []).length;
      if (need > 0) { EX.busy = true; exDraw(); let Q = []; try { const G = window.CT && CT.gen && CT.gen.quiz; const r = G ? await G(tp, { n: need, lv: '보통' }) : null; Q = (r && r.v) || []; } catch (e) { Q = []; }
        if (Q.length < need && typeof AI !== 'undefined' && AI.questions) Q = Q.concat(AI.questions(tp, need - Q.length, '보통', ['mc', 'mc', 'ox', 'mc', 'short']));
        if (!EX) return; EX.busy = false; it.qs = [...(it.qs || []), ...Q.slice(0, need)]; if (S.ai) S.ai.usage = (S.ai.usage || 0) + 1; }
      if ((it.qs || []).length > 60) it.qs = it.qs.slice(0, 60); renum(it.qs); if (typeof evenPts === 'function') evenPts(it.qs);
      it.week = EX.week; it.time = EX.time; it.retake = EX.retake; it.exam = { kind: EX.kind, n: EX.n, mult: EX.mult }; it.ek = EX.kind; it.pool = { n: EX.n, mult: EX.mult }; /* D 편집기(CT 'exam')와 같은 필드 */
      it.rules = Object.assign({ from: '', to: '', show: 'after' }, it.rules || {}, { retry: EX.retake > 0 ? { mode: 'count', v: EX.retake + 1 } : { mode: 'none', v: 2 }, pass: { on: EX.pass > 0, v: EX.pass || 60 }, shuffle: true, draw: EX.mult > 1 ? Math.min(EX.n, it.qs.length) : 0 }); if (it.rules.draw) it.cplN = it.rules.draw; else delete it.cplN; /* 서버 출제 평가(직업훈련 규정 준수)의 출제 수 칸(cplN)과 같은 값 */ }
    L.sort((a, b) => (+a.week || 0) - (+b.week || 0)); const k0 = EX.kind; exClose(); saveDraft(); paint(); emit('change', { step: 'fill', field: 'exam', d }); try { emit('ct-add', it); } catch (e) { }
    toast(isNew ? `${josa(`「${it.title}」`, '을')} ${it.week}${unit(d)}에 넣었습니다. ${k0 === 'survey' ? '문항을' : '문제를'} 확인하고 고쳐 주세요.` : `${josa(`「${it.title}」`, '의')} 설정을 바꿨습니다.`, 'ok');
    if (isNew) setTimeout(() => exEdit(it.id), 60); }
  /* D 요원 CT 편집기로 새로 만들기: 기본 차시(중간=가운데 · 기말/테스트/설문=마지막)와 유형별 기본값(직업훈련 3배수)을 preset으로 넘긴다 */
  function ctNew(k) { if (!F) return; readBody(); const d = F.d; const kind = k === 'survey' ? 'survey' : 'exam'; const D0 = exDef(k, d); const L = d.curriculum = Array.isArray(d.curriculum) ? d.curriculum : []; const tp = (U() ? '' : topicCore(d)) || String(d.name || '').trim() || T('cls');
    const preset = kind === 'survey' ? { n: 6 } : { examKind: k, n: D0.n, mult: D0.mult, time: D0.time, retake: D0.retake, pass: D0.pass, random: true };
    try { CT.open(kind, { from: 'flow', course: { name: d.name || '', curriculum: L, weekPlan: d.weekPlan, _draft: true }, week: D0.week, title: kind === 'survey' ? '과정 만족도' : tp.slice(0, 50), /* CT 편집기가 제목 뒤에 '중간고사' · '설문'을 붙인다 */ target: d.target || '', preset,
      onDone: it => { if (!F || !it) return; snap(`${EXK[k].n} 만들기`); it.id = it.id || uid('it'); it.week = +it.week || D0.week; exNorm(it); L.push(it); L.sort((a, b) => (+a.week || 0) - (+b.week || 0)); saveDraft(); paint(); emit('change', { step: 'fill', field: 'exam', d }); toast(`${josa(`「${it.title}」`, '을')} ${it.week}${unit(d)}에 넣었습니다. 넣을 ${unit(d)}는 목록에서 바꿀 수 있습니다.`, 'ok'); } }); } catch (e) { console.error('CT.open', kind, e); exOpen(k); } }
  /* 서버 출제(직업훈련 규정 준수) 출제 수 칸 cplN = rules.draw */
  const exNorm = it => { if (it && it.type === 'exam') { const dr = +((it.rules || {}).draw) || 0; if (dr) it.cplN = dr; else delete it.cplN; } return it; };
  document.addEventListener('change', e => { const el = e.target; if (!el || !el.dataset || el.dataset.cfexwk == null || !F) return; const it = (F.d.curriculum || []).find(x => x.id === el.dataset.cfexwk); if (!it) return; snap('넣을 차시 바꾸기'); it.week = +el.value || 1; F.d.curriculum.sort((a, b) => (+a.week || 0) - (+b.week || 0)); saveDraft(); paint(); }, true);
  /* 문제 · 문항 고치기: D 요원의 CT 편집기(CT.open('exam'|'survey'))가 있으면 그것, 없으면 기존 항목 편집기(build.js openEditor)를 임시로 */
  function exEdit(id) { if (!F) return; const d = F.d; const L = d.curriculum || []; const it = L.find(x => x.id === id); if (!it) return; const kind = it.type === 'survey' ? 'survey' : 'exam';
    const done = n => { if (!F) return; const i = L.findIndex(x => x.id === id); if (i >= 0 && n) { n.id = id; n.week = +n.week || it.week; L[i] = exNorm(n); } saveDraft(); paint(); };
    if (ctHas(kind)) { try { CT.open(kind, { from: 'flow', course: { name: d.name || '', curriculum: L, weekPlan: d.weekPlan, _draft: true }, week: +it.week || 1, title: it.title, item: it, onDone: done }); return; } catch (e) { console.error('CT.open', kind, e); } }
    if (typeof openEditor !== 'function') return; const fake = { id: '_cfdraft', name: d.name || '', curriculum: L, weekly: true, weekPlan: (d.weekPlan || []).map((w, i) => ({ w: i + 1, title: w.title || `${i + 1}${unit(d)}` })), learners: [], prog: {}, tries: {}, subs: {} };
    try { openEditor(fake, L.indexOf(it)); } catch (e) { console.error('openEditor', e); return; }
    const m = $('#modal'); if (!m) return; const ob = new MutationObserver(() => { if (!m.isConnected) { ob.disconnect(); setTimeout(() => { if (F) { saveDraft(); paint(); } }, 30); } }); ob.observe(document.body, { childList: true }); }
  document.addEventListener('click', e => { const t0 = e.target; if (!t0 || !t0.closest || !F) return; let el;
    if ((el = t0.closest('#crsFlow [data-cfex]'))) { e.preventDefault(); e.stopPropagation(); const a = el.dataset.cfex; if (a === 'new') { const kk = el.dataset.k === 'survey' ? 'survey' : 'exam'; if (ctHas(kk)) ctNew(el.dataset.k); else exOpen(el.dataset.k); } else if (a === 'set') exOpen(null, el.dataset.v); else if (a === 'q') { readBody(); exEdit(el.dataset.v); } else if (a === 'del') { readBody(); const L = F.d.curriculum || []; const i = L.findIndex(x => x.id === el.dataset.v); if (i >= 0) { snap(`「${L[i].title}」 빼기`); L.splice(i, 1); saveDraft(); paint(); toast('뺐습니다. 잘못 뺐으면 [되돌리기]를 누르세요.', 'ok'); } } return; }
    if ((el = t0.closest('#cfExSh [data-cfx]')) && EX) { e.preventDefault(); e.stopPropagation(); const k = el.dataset.cfx; const v = el.dataset.v; EX[k] = k === 'sv' ? v : +v; if (k === 'n' && EX.n * EX.mult > 60) EX.mult = [5, 3, 2, 1].find(m => EX.n * m <= 60) || 1; exDraw(); return; }
    if ((el = t0.closest('#cfExSh [data-cfxgo]'))) { e.preventDefault(); e.stopPropagation(); if (el.dataset.cfxgo === 'make') exMake(); else exClose(); return; }
    if ((el = t0.closest('#crsFlow [data-cfgoto]'))) { e.preventDefault(); e.stopPropagation(); const i = F.ids.indexOf(el.dataset.cfgoto); if (i >= 0) jump(i); return; }
    if ((el = t0.closest('#crsFlow [data-cfew]'))) { e.preventDefault(); e.stopPropagation(); readBody(); const k = el.dataset.cfew; if (el.dataset.p) { const [a, b, c2, t2] = el.dataset.p.split(',').map(Number); Object.assign(F.d, { ewP: a, ewE: b, ewA: c2, ewT: t2 }); } else F.d[k] = clamp((+F.d[k] || 0) + +el.dataset.d, 0, 100); saveDraft(); paint(); return; }
    if ((el = t0.closest('#crsFlow [data-cfthumb]'))) { e.preventDefault(); e.stopPropagation(); readBody(); try { const box = el.closest('.cf-thumbr') || el; window.THUMB.pick(box, F.d, () => { if (F) { saveDraft(); paint(); } }); } catch (er) { console.error('THUMB.pick', er); } return; }
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && EX && $('#cfExSh') && !$('#modal')) { e.stopPropagation(); exClose(); } }, true);

  /* ── 수강 기간 · 수강신청 기간 직접 정하기 ── */
  const PERK = ['days', 'dur'];
  const REC_T = ['adult', 'lifelong', 'voc', 'univ']; /* 수강신청 기간을 따로 묻지 않던 유형(공공은 cfg에 있음, 기업은 배정 · 학원은 월 수강) */
  const recAsk = A => { if (!REC_T.includes(cfgKey())) return []; /* v38 U-4: 신청 기간 옆에 정원(0이면 제한 없음) — 정원은 개설 뒤 설정에서만 바꿀 수 있던 문제 */ const capF = (A || []).some(f => f.k === 'cap') ? [] : [{ k: 'cap', label: '정원', kind: 'num', ex: '예: 20명 — 차면 신청 버튼이 닫힙니다', def: 0, min: 0, max: 9999, unit: '명', later: true, hint: '0이면 제한 없음' }]; if ((A || []).some(f => f.k === 'rdays')) return capF; return [{ k: 'rdays', label: '수강신청 받는 기간', kind: 'choice', def: 0, opts: [[0, '언제나 받기'], [7, '1주'], [14, '2주'], [30, '한 달'], ['custom', '직접 정하기', '시작 · 마감 날짜']], ex: '예: 개강 전 2주 동안만 신청을 받습니다' }, ...capF]; };
  function subExpand(L0, d) { const out = []; L0.forEach(f => { out.push(f);
      if (PERK.includes(f.k) && d[f.k] === 'custom') { if (!d.perMode) d.perMode = 'days'; out.push({ k: 'perMode', sub: f.k, label: '기간을 어떻게 정할까요', kind: 'choice', opts: [['days', '며칠 동안', '신청한 날부터'], ['range', '날짜로', '시작일 ~ 끝나는 날']] });
        if (d.perMode === 'range') out.push({ k: 'pFrom', sub: f.k, label: '수강 시작일', kind: 'date' }, { k: 'pTo', sub: f.k, label: '수강 끝나는 날', kind: 'date', ex: '예: 이 날 밤 12시까지 들을 수 있습니다' });
        else out.push({ k: 'daysN', sub: f.k, label: '며칠 동안 들을 수 있나요', kind: 'num', min: 1, max: 1095, unit: '일', ex: '예: 45 — 신청한 날부터 45일' }); }
      if (f.k === 'rdays' && d.rdays === 'custom') out.push({ k: 'rFrom', sub: 'rdays', label: '신청 시작일', kind: 'date' }, { k: 'rTo', sub: 'rdays', label: '신청 마감일', kind: 'date', ex: '예: 개강 전날까지' }); });
    return out; }
  const perCustom = d => PERK.some(k => d[k] === 'custom');
  const fmtD = v => String(v || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, (m, y, mo, da) => `${+mo}월 ${+da}일`);
  const periodTxt = d => { if (!perCustom(d)) return ''; if (d.perMode === 'range') return d.pFrom && d.pTo ? `${fmtD(d.pFrom)} ~ ${fmtD(d.pTo)}` : '날짜를 정해 주세요'; return `신청 후 ${+d.daysN || '—'}일`; };
  const recTxt = d => d.rdays === 'custom' ? (d.rFrom && d.rTo ? `${fmtD(d.rFrom)} ~ ${fmtD(d.rTo)}` : '날짜를 정해 주세요') : (REC_T.includes(cfgKey()) && +d.rdays > 0 ? `오늘부터 ${+d.rdays}일` : '');
  function setupProblems(d) { const P = [];
    if (perCustom(d)) { if (d.perMode === 'range') { if (!d.pFrom) P.push({ k: 'pFrom', msg: '수강 시작일을 골라 주세요.' }); if (!d.pTo) P.push({ k: 'pTo', msg: '수강 끝나는 날을 골라 주세요.' }); else if (d.pFrom && d.pTo < d.pFrom) P.push({ k: 'pTo', msg: '끝나는 날이 시작일보다 늦어야 합니다.' }); } else if (!(+d.daysN >= 1)) P.push({ k: 'daysN', msg: '며칠 동안 들을 수 있는지 숫자로 적어 주세요. 예: 45' }); }
    if (d.rdays === 'custom') { if (!d.rFrom) P.push({ k: 'rFrom', msg: '신청 시작일을 골라 주세요.' }); if (!d.rTo) P.push({ k: 'rTo', msg: '신청 마감일을 골라 주세요.' }); else if (d.rFrom && d.rTo < d.rFrom) P.push({ k: 'rTo', msg: '마감일이 시작일보다 늦어야 합니다.' }); }
    if (d.uend === 'custom' && askOf('setup') && askOf('setup').some(f => f.k === 'uend')) { if (!d.endD) P.push({ k: 'endD', msg: '수강 끝나는 날(종강일)을 골라 주세요.' }); else if (d.start && d.endD < d.start) P.push({ k: 'endD', msg: '끝나는 날이 개강일보다 늦어야 합니다.' }); } /* v36 1-③-5) 대학 학기 종료일 직접 정하기 */
    if (evalOn(d)) { const s0 = ewSum(d); if (s0 !== 100) P.push({ k: 'ewSum', msg: `평가 비중의 합이 ${s0}%입니다. 100%로 맞춰 주세요.` }); }
    return P; }

  /* ── 평가 기준(비중) · 통과 점수: 시험 · 과제 · 출석 항목이 있으면 이 단계에서 정한다 ── */
  const has = (d, ty) => (d.curriculum || []).some(x => x && ty.includes(x.type));
  const evalOn = d => cfgKey() !== 'k12' && has(d, ['exam', 'assign']); /* 학원(초중고)은 회차 수업이라 수료 판정이 없다 */
  const evRows = d => [['ewP', '진도(영상 · 자료)', true], ['ewE', '시험', has(d, ['exam'])], ['ewA', '과제', has(d, ['assign'])], ['ewT', '출석', has(d, ['offline', 'live'])]].filter(r => r[2]);
  const evDef = d => { const E = has(d, ['exam']), A = has(d, ['assign']), Tt = has(d, ['offline', 'live']); let e = E ? (A ? 30 : 40) : 0, a = A ? (E ? 20 : 30) : 0, t2 = Tt ? 10 : 0; return { ewP: 100 - e - a - t2, ewE: e, ewA: a, ewT: t2 }; };
  const evEnsure = d => { const R = evRows(d).map(r => r[0]); const keys = ['ewP', 'ewE', 'ewA', 'ewT']; const stale = keys.some(k => (R.includes(k) ? d[k] == null : +d[k] > 0)) || d._evSig !== R.join(); if (stale) { Object.assign(d, evDef(d)); d._evSig = R.join(); }
    if (d.passOn == null) { const ex = (d.curriculum || []).find(x => x && x.type === 'exam' && x.rules && x.rules.pass && x.rules.pass.on); d.passOn = ex || cfgKey() === 'voc' ? 'yes' : 'no'; if (d.passV == null) d.passV = ex ? +ex.rules.pass.v : 60; } if (d.passV == null) d.passV = 60; };
  const ewSum = d => evRows(d).reduce((a, r) => a + (+d[r[0]] || 0), 0);
  const ewSumHTML = d => { const s0 = ewSum(d); return `<p class="cf-ewsum ${s0 === 100 ? 'ok' : 'bad'}" data-cfewsum="1" role="status">합계 <b>${s0}%</b>${s0 === 100 ? '' : ' — 100%로 맞춰 주세요'}</p>`; };
  const evalTxt = d => { if (!evalOn(d)) return ''; evEnsure(d); const R = evRows(d); return R.filter(r => +d[r[0]] > 0).map(r => `${r[1].replace(/\(.*\)/, '').trim()} ${+d[r[0]]}%`).join(' · ') + (d.passOn === 'yes' ? ` · 시험 · 과제 ${+d.passV || 60}점 이상 통과` : ''); };
  function evalBlock(d) { const dn = T('done'); if (cfgKey() === 'k12') return '';
    if (!evalOn(d)) return `<details class="cf-more cf-eval" id="cfEval"${F && F.evOpen ? ' open' : ''}><summary><span class="cf-more-h"><b>평가 기준</b> <span class="cf-later">나중에 해도 됩니다</span></span><span class="cf-more-s">지금 값: 진도로만 ${esc(dn)}합니다</span></summary><div class="cf-more-b"><p class="cf-hint">시험 · 과제를 넣으면 진도 · 시험 · 과제(· 출석) 비중과 통과 점수를 여기서 정합니다.</p><button type="button" class="btn cf-big" data-cfgoto="fill">시험 · 과제 넣으러 가기</button></div></details>`;
    evEnsure(d); const R = evRows(d);
    const rows = R.map(([k, l]) => `<div class="cf-ew" data-cff="${k}"><span class="cf-ewl">${esc(l)}</span><div class="cf-num"><button type="button" class="cf-nb" data-cfew="${k}" data-d="-10" aria-label="${esc(l)} 10 줄이기">−</button><input type="number" inputmode="numeric" min="0" max="100" step="5" data-cf="${k}" data-num="1" value="${+d[k] || 0}" aria-label="${esc(l)} 비중(%)"><button type="button" class="cf-nb" data-cfew="${k}" data-d="10" aria-label="${esc(l)} 10 늘리기">+</button><span class="cf-unit">%</span></div></div>`).join('');
    const df = evDef(d); const presets = [[`${df.ewP},${df.ewE},${df.ewA},${df.ewT}`, '권장 비중'], ['100,0,0,0', '진도만']];
    return `<details class="cf-more cf-eval" id="cfEval"${!F || F.evOpen !== false ? ' open' : ''}><summary><span class="cf-more-h"><b>평가 기준</b></span><span class="cf-more-s">지금 값: ${esc(evalTxt(d))}</span></summary><div class="cf-more-b">
      <p class="cf-hint">${esc(dn)} 판정에 무엇을 얼마나 반영할지 정합니다. 합이 100%가 되게 맞춥니다.</p><div class="cf-ewp">${presets.map(([v, l]) => `<button type="button" class="btn sm" data-cfew="_p" data-p="${v}">${esc(l)}</button>`).join('')}</div>${rows}${ewSumHTML(d)}${errLine('ewSum')}
      ${ui.field({ k: 'passOn', label: `시험 · 과제 통과 점수도 ${dn} 조건에 넣을까요`, kind: 'choice', opts: [['yes', '예', `통과해야 ${dn}합니다`], ['no', '아니요', '점수만 비중대로 반영']] }, d)}
      ${d.passOn === 'yes' ? ui.field({ k: 'passV', label: '통과 점수', kind: 'choice', opts: [[60, '60점 이상'], [70, '70점 이상'], [80, '80점 이상']], ex: cfgKey() === 'voc' ? '직업훈련 수료 기준: 평가 60점 이상' : '예: 60점 이상' }, d) : ''}</div></details>`; }
  document.addEventListener('toggle', e => { const t2 = e.target; if (t2 && t2.id === 'cfEval' && F && !F.painting) F.evOpen = !!t2.open; }, true);
  /* 표지 그림(썸네일) 자리: C 요원의 THUMB.pick(el, d)가 있으면 버튼, 없으면 기존처럼 아무것도 그리지 않는다 */
  const thumbSlot = d => (window.THUMB && typeof window.THUMB.pick === 'function') ? `<div class="cf-thumbr" data-cff="thumb"><span class="cf-thumbt"><span class="cf-lab">표지 그림 <span class="cf-later">나중에 해도 됩니다</span></span><small class="cf-hint">${d.thumb ? '아래 미리보기에 보이는 그림입니다.' : `고르지 않으면 ${esc(josa(T('cls'), '의'))} 이름에 맞춘 AI 그림이 저절로 들어갑니다.`}</small></span><button type="button" class="btn cf-big" data-cfthumb="1">${typeof ic === 'function' ? ic('spark', 16) : '✦'} ${d.thumb ? '표지 그림 바꾸기' : '표지 그림 고르기 · AI로 만들기'}</button></div>` : '';

  /* 개설 뒤 적용: 기간 · 신청 기간 · 평가 기준 · 통과 점수 */
  function extApply(c, d) { if (!c || !d) return; const td0 = today();
    if (perCustom(d)) { if (d.perMode === 'range' && d.pFrom && d.pTo) { const n = Math.max(1, Math.round((new Date(d.pTo) - new Date(d.pFrom)) / 864e5) + 1); c.start = d.pFrom; c.end = d.pTo; c.period = Object.assign({}, c.period || {}, { mode: 'range', start: d.pFrom, end: d.pTo, days: n }); }
      else if (+d.daysN > 0) { const n = Math.round(+d.daysN); c.period = Object.assign({}, c.period || {}, { mode: 'days', days: n, start: '', end: '' }); c.end = addDays(c.start || td0, n - 1); } }
    if (d.rdays === 'custom' && d.rFrom && d.rTo) c.recruit = Object.assign({ cap: 0, early: { on: false, until: '', rate: 0 } }, c.recruit || {}, { on: true, from: d.rFrom, to: d.rTo });
    else if (REC_T.includes(cfgKey()) && +d.rdays > 0) c.recruit = Object.assign({ cap: 0, early: { on: false, until: '', rate: 0 } }, c.recruit || {}, { on: true, from: td0, to: addDays(td0, +d.rdays - 1) });
    if (!evalOn(d)) return; evEnsure(d); const CU = c.curriculum || []; const cr = c.criteria = c.criteria || { ...defs().criteria };
    const pass = d.passOn === 'yes'; const pv = clamp(+d.passV || 60, 1, 100);
    CU.filter(i => i.type === 'exam' || i.type === 'assign').forEach(i => { i.rules = Object.assign({}, i.rules || {}); i.rules.pass = { on: pass, v: pass ? pv : ((i.rules.pass && i.rules.pass.v) || 60) }; });
    if (cfgKey() === 'voc' && pass) c.cplPass = pv;
    const wE = +d.ewE || 0, wA = +d.ewA || 0, wT = +d.ewT || 0; if (!(wE + wA + wT > 0)) return; /* 진도만이면 기존 수료 기준(F5 영상 진도 맞춤 포함)을 그대로 둔다 */
    const prog = CU.filter(i => cr.by === 'video' ? i.type === 'video' : ['video', 'doc', 'audio', 'quiz'].includes(i.type));
    const G = [[prog, +d.ewP || 0], [CU.filter(i => i.type === 'exam'), wE], [CU.filter(i => i.type === 'assign'), wA], [CU.filter(i => i.type === 'offline' || i.type === 'live'), wT]];
    let spill = 0; G.forEach(g => { if (!g[0].length) { spill += g[1]; g[1] = 0; } }); const gi = G.findIndex(g => g[0].length); if (gi >= 0) G[gi][1] += spill;
    const items = []; G.forEach(([L, wt]) => { if (!L.length || !wt) return; const per = Math.floor(wt / L.length); L.forEach((it, i) => items.push({ id: it.id, w: per + (i < wt - per * L.length ? 1 : 0) })); });
    cr.items = items.filter(x => x.w > 0); cr.by = 'eval'; cr.video = clamp(Math.round(+d.ewP || 0), 0, 100); cr.exam = clamp(wE, 0, 100 - cr.video); cr.assign = 100 - cr.video - cr.exam; cr.att = wT; }

  /* ───────── 단계 목록(cfg.steps 순서) ───────── */
  const stepIds = () => { const c = cfgOf(); const ids = (c && Array.isArray(c.steps) && c.steps.length ? c.steps : steps.map(s => s.id)).filter(id => steps.some(s => s.id === id)); return ids.length ? ids.slice(0, 5) : ['basic', 'open']; };
  const stepOf = id => steps.find(s => s.id === id);
  const nowOf = (id, d) => { const c = cfgOf(); const x = c && c.stepNow && c.stepNow[id]; if (x) return typeof x === 'function' ? x(d || {}) : x; return stepOf(id).now(d || {}); };
  const titleOf = (id, d) => { const c = cfgOf(); const x = c && c.stepTitle && c.stepTitle[id]; if (x) return typeof x === 'function' ? x(d || {}) : x; return stepOf(id).title(d || {}); };

  /* ───────── 열기 · 그리기 ───────── */
  function open(opts) {
    opts = opts || {}; if (typeof S === 'undefined' || !S || !S.org) return;
    const c = cfgOf(); if (c && typeof c.redirect === 'function') { try { if (c.redirect(opts) !== false) return; } catch (e) { console.error('cfg.redirect', e); } }
    if (S.me && S.me.role === 'teacher' && window.LIVE && LIVE.user && LIVE.user.role === 'teacher') { toast(`${T('teacher')} 권한으로는 ${josa(T('cls'), '을')} 만들 수 없습니다.`, 'warn'); return; }
    try { closeModal(); } catch (e) { }
    if (!opts.fresh && hasDraft() && !opts._asked) return askResume(opts);
    const D = defs(); const base = opts.resume && S.crsDraft ? JSON.parse(JSON.stringify(S.crsDraft.d)) : { sessions: U() ? 15 : 6, auto: { ...D.auto } };
    const p = opts.resume ? {} : { ...(opts.prefill || {}) }; /* 이어서 하기를 고르면 초안 그대로(새 요청 내용으로 덮어쓰지 않음) */ if (p.topic && !p.name) p.name = p.topic; if (Array.isArray(p.outline) && !p.weekPlan) p.weekPlan = p.outline.map((w, i) => ({ w: i + 1, title: w.title || String(w), goal: w.goal || '' })); if (Array.isArray(p.items) && !p.curriculum) p.curriculum = p.items; if (p.weeks && !p.sessions) p.sessions = p.weeks; if (p.sessions) base._sessSet = 1; Object.assign(base, p); if (p.goal && (opts.from === 'sam' || opts.from === 'guide')) { if (/이\(가\)/.test(p.goal)) base.goal = fieldAI('goal', base); base._goalAI = base.goal; } /* 대화에서 AI가 만든 목표는 자동 목표로 본다 → 이름을 바꾸면 다시 만든다 */
    if (p.sessions && !(p.weekPlan) && !opts.resume) base.weekPlan = base.weekPlan || [];
    F = { d: base, ids: stepIds(), step: 0, from: opts.from || 'menu', undo: [], backs: 0, errs: {}, bad: {}, idle: {}, opts };
    const want = (opts.resume && S.crsDraft.step) || opts.step; const i = F.ids.indexOf(want); if (i >= 0) F.step = i;
    mount(); paint(); emit('open', { from: F.from, step: F.ids[F.step], resume: !!opts.resume, prefill: p });
    if (opts.autofill) aiStep();
  }
  function askResume(opts) {
    const x = S.crsDraft; const nm = x.d.name || '이름 없는 ' + T('cls'); const sid = x.step; const si = stepIds().indexOf(sid);
    mount(); F = null;
    $('#crsFlow').innerHTML = `<div class="cf-box cf-resume" role="dialog" aria-modal="true" aria-label="이어서 만들기"><div class="cf-rb"><p class="cf-now">만들던 ${esc(josa(T('cls'), '이'))} 있습니다</p><h2>${esc(nm)}</h2><p class="cf-sub">${si >= 0 ? `${si + 1}단계 '${esc(titleOf(sid, x.d))}'까지 했습니다.` : ''} 이어서 할까요?</p>
      <div class="cf-rbb"><button type="button" class="btn pri cf-big" data-cfgo="resume">이어서 하기</button><button type="button" class="btn cf-big" data-cfgo="fresh">새로 만들기</button></div><p class="cf-hint">새로 만들어도 지금 초안은 [되돌리기]로 되찾을 수 있습니다.</p><button type="button" class="linkb" data-cfgo="close">닫기</button></div></div>`;
    CF._pending = opts;
  }
  function mount() {
    let w = $('#crsFlow'); if (!w) { const tw = $('#toasts'); if (tw) tw.innerHTML = ''; /* 흐름을 열기 전 알림은 지운다(겹침 방지) */ w = document.createElement('div'); w.id = 'crsFlow'; w.className = 'crsf'; w.dataset.crsFlow = '1'; document.body.appendChild(w); bind(w); }
    document.body.classList.add('cf-on'); return w;
  }
  function close(keep) {
    if (F) { if (keep !== false) saveDraft(); emit('close', { step: F.ids[F.step], kept: keep !== false }); }
    clearTimeout(F && F.idleT); F = null; const w = $('#crsFlow'); if (w) w.remove(); document.body.classList.remove('cf-on');
  }
  function paint() {
    if (!F) return; const w = mount(); const id = F.ids[F.step]; const st = stepOf(id); F.totEdit = false; const ob = w.querySelector('.cf-body'); const keepY = ob && w.dataset.step === id && ob.dataset.cfstep === id ? ob.scrollTop : 0; /* 같은 단계를 다시 그릴 때(선택지 누르기 등) 보던 자리 유지 — 아래쪽 칸을 고르면 맨 위로 튀던 문제(F4) */ w.dataset.step = id; const d = F.d; const n = F.ids.length; const last = F.step === n - 1;
    const prog = F.ids.map((sid, i) => `<li class="${i < F.step ? 'done' : i === F.step ? 'on' : ''}" ${i === F.step ? 'aria-current="step"' : ''}><button type="button" data-cfjump="${i}" ${i > F.step ? 'disabled' : ''}><span class="cf-dot">${i < F.step ? '✓' : i + 1}</span><span class="cf-sl">${esc(titleOf(sid, d))}</span></button></li>`).join('');
    F.painting = true; try { const ae = document.activeElement; if (ae && w.contains(ae) && ae.blur) ae.blur(); } catch (e) { } /* 다시 그릴 때 입력칸이 지워지며 나는 blur → change가 그리기 도중에 또 그리지 않게 */
    w.innerHTML = `<div class="cf-box" role="dialog" aria-modal="true" aria-label="${esc(T('cls'))} 만들기">
      <header class="cf-hd"><div class="cf-ht"><b>${esc(T('cls'))} 만들기</b><span class="cf-saved" aria-live="polite"></span></div><button type="button" class="cf-laterh" data-cfgo="later">나중에 하기</button><button type="button" class="cf-x" data-cfgo="later" aria-label="닫기(나중에 이어서 하기)">${typeof ic === 'function' ? ic('x', 20) : '✕'}</button></header>
      <ol class="cf-prog" aria-label="진행 ${F.step + 1}/${n}">${prog}</ol>
      <main class="cf-body" data-cfstep="${esc(id)}"><div class="cf-nowb"><p class="cf-now" data-cfnow="1"><span class="cf-k">지금 할 일</span> ${esc(nowOf(id, d))}</p><div class="crs-sam-slot">${id !== 'open' && !CF.samOwnsButton ? `<button type="button" class="cf-ai cf-aistep" data-cfgo="ai">${typeof ic === 'function' ? ic('spark', 16) : '✦'} AI SAM에게 이 단계 맡기기</button>` : ''}</div></div><div class="cf-stepb"></div></main>
      <div class="cf-sam" aria-live="polite"></div>
      <footer class="cf-ft">${F.step ? '<button type="button" class="btn cf-big" data-cfgo="prev">이전</button>' : ''}${F.undo.length ? `<button type="button" class="btn ghost cf-undo" data-cfgo="undo">되돌리기</button>` : ''}<span class="cf-sp"></span><button type="button" class="btn ghost cf-later2" data-cfgo="later">나중에 이어서 하기</button>${last ? `<button type="button" class="btn pri cf-big" data-cfgo="create">개설하기</button>` : `<button type="button" class="btn pri cf-big" data-cfgo="next">다음</button>`}</footer></div>`;
    const body = w.querySelector('.cf-body .cf-stepb'); /* v36 평가 11: '지금 할 일'을 본문 맨 위에 두어 내리면 함께 올라간다(고정 띠가 내용을 가리지 않게) */ const scr = w.querySelector('.cf-body'); try { if (id === 'fill') { /* v36: 시험 · 설문 만들기 자리는 CT.renderFill(차시 목록)이 다시 그려도 남게 따로 둔다 */ body.innerHTML = '<div class="cf-ctf"></div><div class="cf-exw" data-cfexw="1"></div>'; st.render(body.firstChild, d); try { body.lastChild.innerHTML = exPanel(d); } catch (e) { console.error('exPanel', e); } } else st.render(body, d); if (keepY) scr.scrollTop = keepY; } catch (e) { console.error('CF step render', id, e); body.innerHTML = ui.note('이 단계를 그리지 못했습니다. [다음]으로 넘어가도 됩니다.', 'bad'); } F.painting = false;
    paintSaved(true); armIdle(); emit('step', { id, step: id, i: F.step, index: F.step, n, d, dir: F.dir || 'open', prev: F.prevId || null }); F.dir = null; F.prevId = id;
    const f = body.querySelector('.cf-f.bad input, .cf-f.bad textarea') || (F.focus && body.querySelector(`[data-cf="${F.focus}"]`)); if (f) f.focus(); F.focus = null; F.bad = {};
  }
  function paintSaved(silent) { const s = $('#crsFlow .cf-saved'); if (s && !silent) { s.textContent = '자동 저장했습니다'; s.classList.add('on'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 1600); } }
  function armIdle() { if (!F) return; clearTimeout(F.idleT); const id = F.ids[F.step]; F.idleT = setTimeout(() => { if (F && F.ids[F.step] === id) { F.idle[id] = (F.idle[id] || 0) + 1; emit('idle', { step: id, id, secs: Math.round(CF.idleMs / 1000), n: F.idle[id], d: F.d }); } }, CF.idleMs); }

  /* ───────── 이동 · 검사 · 만들기 ───────── */
  const problems = id => { const st = stepOf(id); let P = []; try { P = st.valid(F.d) || []; } catch (e) { console.error(e); }
    if (id === 'basic' || id === stepIds()[0]) { const A = askOf(id) || []; required().forEach(k => { const f = A.find(x => x.k === k); if (f && shown(f, F.d) && !String(F.d[k] ?? '').trim() && !P.some(p => p.k === k)) P.push({ k, msg: `${jq(f.label, '을')} 적어 주세요.` }); }); }
    (askOf(id) || []).forEach(f => { if (f.req && shown(f, F.d) && !String(F.d[f.k] ?? '').trim() && !P.some(p => p.k === f.k)) P.push({ k: f.k, msg: `${jq(f.label, '을')} 적어 주세요.` }); });
    const stopC = checks(F.d).filter(w => w.lv === 'stop' && (!w.step || w.step === id) && (w.step || id === 'open')); stopC.forEach(w => P.push({ k: w.k || '_check', msg: w.msg, check: true }));
    return P.map(p => typeof p === 'string' ? { k: '_', msg: p } : p); };
  function next() {
    if (!F) return; readBody(); const id = F.ids[F.step];
    if (id === 'outline' && hasTot() && F.totEdit && +F.d.totalH > 0 && Math.abs(+F.d.totalH - totOf(F.d)) > 0.05) { applyFit(+F.d.totalH, '총 시간 맞추기'); return false; }
    const P = problems(id);
    const empty = (askOf(id) || []).filter(f => shown(f, F.d) && f.later && !String(F.d[f.k] ?? '').trim()).map(f => f.k);
    if (P.length) { F.bad = {}; P.forEach(p => { F.bad[p.k] = p.msg; const ek = id + '.' + p.k; F.errs[ek] = (F.errs[ek] || 0) + 1; emit('error', { step: id, field: p.k, msg: p.msg, empty: !String(F.d[p.k] ?? '').trim() || (p.k === 'weekPlan' && !(F.d.weekPlan || []).length), n: F.errs[ek], d: F.d }); }); const keep = F.bad; paint(); F.bad = keep; markBad(); return false; }
    { const c0 = cfgOf(); if (c0 && typeof c0.onNext === 'function') try { c0.onNext(id, F.d); } catch (e) { console.error('cfg.onNext', e); } } /* v38: 유형별 다음 단계 기본값(대학 비교과 · 특강 → 4주 · 학점 없음) */
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
    if (!F) return; readBody(); for (let i = 0; i < F.ids.length; i++) { const P = problems(F.ids[i]); if (P.length) { F.step = i; F.bad = {}; P.forEach(p => F.bad[p.k] = p.msg); const keep = F.bad; paint(); F.bad = keep; markBad(); emit('error', { step: F.ids[i], field: P[0].k, msg: P[0].msg, n: 1, d: F.d }); return; } }
    const d = F.d; const from = F.from; let c;
    /* 법정 교육시간 미달이면 한 번 더 묻는다(막지는 않음) — 평가 2회차 1번 */
    { const L = legalOf(d); if (L && L.short && !d._legalAck && typeof modal === 'function') { const u = unit(d);
      modal('법정 교육시간이 모자랍니다', `<p style="font-size:16px"><b>이대로 개설하면 ${esc(L.name)}${josa(L.name, '으로').slice(L.name.length)} 인정받지 못할 수 있습니다.</b></p><p style="font-size:16px">${esc(L.msg)}</p><p class="mini">근거: ${esc(L.law)} · 기준은 관계 법령 원문으로 다시 확인하십시오.</p>`,
        [{ id: 'fix', label: `법정 시간(${L.need}시간)에 맞추기`, kind: 'pri', run: () => { const r = applyFit(L.need, '법정 시간에 맞추기'); if (r) toast(`${u} ${r.sessions}개 × ${hmTxt(r.mins)} = ${r.hours}시간으로 맞췄습니다. 확인하고 [개설하기]를 누르세요.`, 'ok'); } }, { id: 'go', label: '그대로 개설하기', run: () => { if (F) { F.d._legalAck = 1; setTimeout(finish, 0); } } }, { id: 'c', label: '취소' }]); return; } }
    try { c = create({ ...d, fillEmpty: d.fillEmpty === true || d.fillEmpty === 'true', status: d.open === '비공개' ? '준비중' : '운영중', from }); } catch (e) { console.error('CF.create', e); toast(`${josa(T('cls'), '을')} 만들지 못했습니다. 다시 눌러 주세요.`, 'warn'); return; }
    /* v38 결정(U-3 · A-5 · C-5 · P-4): 콘텐츠가 하나도 없는 과정은 공개로 열지 않는다 → '준비 중(비공개)'. 채운 뒤 [학습자에게 공개하기]로 연다 */
    try { if (holdIfEmpty(c)) audit2(`${T('cls')} 준비 중(콘텐츠 없음) — ${c.name}`); } catch (e) { console.error('holdIfEmpty', e); }
    try { save(); } catch (e) { } const prevDraft = S.crsDraft; delete S.crsDraft; try { save(); } catch (e) { }
    clearTimeout(F.idleT); done(c, prevDraft);
  }
  function done(c, prevDraft) {
    const w = mount(); const d0 = F ? F.d : {}; const u = unit(d0); F = null; const L = T('learner'); const nE = emptyN({ weekPlan: c.weekPlan || [], curriculum: c.curriculum || [] });
    const enr = typeof menuOn === 'function' && menuOn('enroll') ? 'enroll' : 'members'; const site = typeof menuOn === 'function' && menuOn('lsite') ? 'lsite' : 'site';
    /* 개설 후 할 일(평가 1회차 4번): 채우기 · 수강 배정(또는 초대) · 공개(게시) + 운영자 미리보기 */
    const st = pubState(c); const hold = !!(c.crs && c.crs.hold);
    /* v38 A-6: 3번은 사이트 게시(또는 이미 공개면 사이트 열기)로 — 예전에는 게시하고 차시 탭으로 가 엉뚱한 화면이 열렸다. 콘텐츠가 없으면(준비 중) 먼저 채우기 */
    const nx = [['fill', nE ? `빈 ${u} ${nE}개 채우기` : `${u} 내용 확인하기`, nE ? `${u}마다 영상 · 교안 · 퀴즈를 넣습니다. [AI로 콘텐츠 채우기]를 누르면 초안이 한 번에 들어갑니다` : '넣은 영상 · 교안 · 퀴즈를 확인하고 바꿉니다', 'grid'],
      ['enroll', `${L} 수강 배정 · 초대`, hold ? `내용을 채워 공개한 뒤에 배정하면 ${josa(L, '이')} 바로 들을 수 있습니다` : `이 ${josa(T('cls'), '에')} ${josa(L, '을')} 배정하거나 초대 링크를 보냅니다`, 'users'],
      hold ? ['fill', `${josa(L, '에게')} 공개하기 — 내용을 넣은 뒤`, `${u}에 콘텐츠를 하나 이상 넣으면 [운영 시작하기 · 전체 공개]로 공개할 수 있습니다`, 'send']
        : ['site', st.ok ? `공개됨 · ${L} 화면 열기` : `${josa(L, '에게')} 공개하기`, st.ok ? `${josa(L, '이')} 보는 화면을 새 창으로 엽니다` : st.how, 'send']];
    if (!hold && +c.price > 0 && !payReady()) st.msg = `결제가 아직 연결되지 않아 ${josa(L, '은')} '결제 준비 중'만 보고 신청할 수 없습니다. 설정 › 결제 · 수납에서 결제를 연결하거나, ${T('cls')} 설정에서 ${T('fee')}를 0원(무료 신청)으로 바꾸십시오.`;
    if (hold) st.msg = `아직 넣은 콘텐츠가 없어 '준비 중(비공개)'으로 만들었습니다. ${josa(L, '에게')} 보이지 않고 알림도 가지 않습니다.`;
    w.innerHTML = `<div class="cf-box cf-done" role="dialog" aria-modal="true" aria-label="개설 완료"><div class="cf-rb"><p class="cf-ok">${typeof ic === 'function' ? ic('check', 28) : '✓'}</p><h2>${esc(c.name)}</h2><p class="cf-sub">${josa(T('cls'), '을')} 만들었습니다. 이제 이렇게 하면 됩니다.</p>
      <p class="cf-pubst ${st.ok ? 'ok' : ''}" role="status">${esc(st.msg)}</p>
      <div class="cf-next">${nx.map(([k, a, b, i], n) => `<button type="button" class="${n ? '' : 'pri'}" data-cfdone="${k}" data-c="${esc(c.id)}" data-go="${k === 'enroll' ? enr : k === 'site' ? site : ''}">${typeof ic === 'function' ? ic(i, 20) : ''}<span><b>${n + 1}. ${esc(a)}</b><small>${esc(b)}</small></span></button>`).join('')}</div>
      <div class="cf-rbb"><button type="button" class="btn cf-big" data-cfdone="pv" data-c="${esc(c.id)}">${typeof ic === 'function' ? ic('eye', 18) : ''} ${esc(L)} 화면에서 보기</button></div><button type="button" class="linkb" data-cfdone="close" data-c="${esc(c.id)}">닫기</button></div></div>`;
    CF.last = c; CF._prevDraft = prevDraft;
  }

  /* 학습자에게 지금 보이는지: 공개 범위(open) · 학습자 사이트 게시본(S.lsite.pub) 기준. 신청 목록(shop)은 게시본이 있으면 자동 갱신되지만, 차시 내용은 다시 게시해야 반영된다 */
  function pubState(c) { const L = T('learner'); const pub = !!(S.lsite && S.lsite.pub); const o = c.open || '전체';
    if (o === '비공개') return { ok: false, msg: `지금은 숨겨 둔 상태라 ${josa(L, '이')} 볼 수 없습니다.`, how: `공개로 바꾸고 학습자 사이트에 게시합니다` };
    if (!pub) return { ok: false, msg: `학습자 사이트를 아직 게시하지 않아 ${josa(L, '이')} 볼 수 없습니다.`, how: '학습자 사이트를 게시해 신청 목록에 보이게 합니다' };
    const inPub = ((S.lsite.pub.classes) || []).some(x => x.id === c.id);
    if (o === '지정 회원') return { ok: inPub, msg: `정한 사람만 볼 수 있습니다. [${L} 수강 배정 · 초대]로 ${josa(L, '을')} 배정해 주세요.`, how: '학습자 사이트에 게시합니다' };
    return inPub ? { ok: true, msg: `${josa(L, '이')} 신청 목록에서 볼 수 있습니다.`, how: '' } : { ok: false, msg: `신청 목록에는 보이지만, ${u2(c)} 내용은 학습자 사이트를 다시 게시해야 보입니다.`, how: '학습자 사이트에 게시해 내용까지 보이게 합니다' }; }
  const u2 = c => (c && c.kind === 'episode') ? '회차' : unit({});
  const audit2 = m => { try { logAudit(m); } catch (e) { } };
  /* 배울 콘텐츠(오프라인 회차 일정 제외)가 있는가 — 학습자 화면 '준비 중' 판정(lshop prepOf)과 같은 기준 */
  const hasContent = c => (c && c.kind === 'episode') || ((c && c.curriculum) || []).some(x => x && x.type !== 'offline' && x.type !== 'chapter');
  function holdIfEmpty(c) { if (!c || hasContent(c) || cfgKey() === 'k12') return false; c.status = '준비중'; c.open = '비공개'; c.crs = Object.assign({}, c.crs || {}, { hold: 1 }); return true; }
  window.CF_HAS_CONTENT = hasContent;
  /* [학습자에게 공개하기]: 숨김이면 공개로 바꾸고(운영중), 학습자 사이트를 게시한다(cls2.js c2-golive와 같은 규칙) */
  function publish(id) { const c = typeof C === 'function' ? C(id) : S.classes.find(x => x.id === id); if (!c) return false;
    if (!hasContent(c)) { toast(`${josa(c.name, '은')} 아직 넣은 콘텐츠가 없어 공개하지 않았습니다. ${u2(c)}에 영상 · 교안 · 퀴즈를 하나 이상 넣은 뒤 공개해 주십시오.`, 'warn'); return false; }
    if ((c.open || '전체') === '비공개') { c.open = '전체'; c.status = '운영중'; }
    if (c.crs && c.crs.hold) { delete c.crs.hold; try { const P = (c.crs.pendNotify || []).filter(id2 => (c.learners || []).includes(id2)); if (P.length && typeof c2Notify === 'function') P.forEach(id2 => c2Notify(id2, `${c.name} 수강을 시작할 수 있습니다`, '준비하던 학습 내용이 열렸습니다. 지금 바로 수강을 시작할 수 있습니다.')); delete c.crs.pendNotify; } catch (e) { } }
    try { logAudit(`${T('cls')} 공개 — ${c.name}`); } catch (e) { } try { save(); } catch (e) { }
    let ok = false; try { if (typeof smPublish === 'function') { smPublish(); ok = true; } else if (ACT['ls-pub']) { ACT['ls-pub'](); ok = true; } } catch (e) { console.error('publish', e); }
    try { save(); } catch (e) { } if (!ok) toast(`${josa(c.name, '을')} 공개로 바꿨습니다. 사이트 메뉴에서 [게시하기]를 누르면 ${josa(T('learner'), '에게')} 보입니다.`, 'warn'); }
  /* 운영자 전용 미리보기: 비공개 · 미게시여도 학습자 화면(learner.html?preview=1)으로 이 과정을 연다. 게시본은 바꾸지 않는다 */
  function preview(id) { const c = typeof C === 'function' ? C(id) : S.classes.find(x => x.id === id); if (!c) return; CF._pv = c.id;
    const url = `learner.html?preview=1&r=${Date.now() % 1e6}#class/${encodeURIComponent(c.id)}`;
    modal(`${T('learner')} 화면 미리보기`, `<p class="mini cf-pvnote">${esc(c.name)} — 운영자에게만 보이는 미리보기입니다. ${(c.open || '전체') === '비공개' ? `아직 숨겨 둔 상태라 ${josa(T('learner'), '은')} 볼 수 없습니다.` : ''} 신청 · 결제는 되지 않습니다.</p><div class="cf-pvfr"><iframe id="crsPvF" title="${esc(T('learner'))} 화면 미리보기" src="${esc(url)}"></iframe></div>`, [...(pubState(c).ok && ACT['d26-view0'] ? [{ id: 'w', label: '새 창에서 실제 화면 열기', run: () => { ACT['d26-view0']({ dataset: { v: c.id } }); } }] : []), { id: 'c', label: '닫기' }], true); }
  /* 강좌 상세 [학생 화면 보기]도 운영자 미리보기로(비공개 · 미게시면 '공개되지 않은 클래스'만 보이던 문제) */
  if (ACT['d26-view'] && !ACT['d26-view0']) { ACT['d26-view0'] = ACT['d26-view']; ACT['d26-view'] = el => preview(el && el.dataset && el.dataset.v); }
  { const base = typeof lsSnapshot === 'function' ? lsSnapshot : null; if (base) { lsSnapshot = function (...a) { const id = CF._pv; const c = id && document.getElementById('crsPvF') && S && (S.classes || []).find(x => x.id === id); if (!c) return base.apply(this, a); const o = c.open, st = c.status; c.open = '전체'; if (c.status === '종료') c.status = '운영중'; try { return base.apply(this, a); } finally { c.open = o; c.status = st; } }; window.lsSnapshot = lsSnapshot; } }
  /* '31회차 31회차 수업'처럼 번호가 겹치지 않게: 제목 앞 번호 · 단위 · '수업'만 남은 제목은 정리한다 */
  const sessTitle = (i, title, u) => { u = u || unit({}); const t0 = String(title || '').replace(/^\s*\d+\s*(회차|차시|주차|주|회)\s*/, '').trim(); return (t0 && t0 !== '수업' ? `${i}${u} ${t0}` : `${i}${u} 수업`).slice(0, 80); };
  /* 생성 함수(단일): d → course. makeCourse와 같은 스키마 + cls2 필드. 저장(save)과 화면 이동은 부른 쪽이 한다. */
  function create(d) {
    d = { ...(d || {}) }; if (!(Array.isArray(d.weekPlan) && d.weekPlan.length) && Array.isArray(d.outline) && d.outline.length) d.weekPlan = d.outline.map(w => typeof w === 'string' ? { title: w } : w); if (!Array.isArray(d.curriculum) && Array.isArray(d.items)) d.curriculum = d.items; const Uv = U(); const D = defs(); const c0 = cfgOf();
    const name = String(d.name || d.topic || '').replace(/\s+/g, ' ').trim() || '새 과정'; /* v38: '[비교과] …' · '…(스마트폰 · 키오스크)'처럼 적은 이름 그대로(괄호 · 대괄호를 지우던 문제 U-5 · P-24). 주제어는 AI.design이 clean으로 따로 뽑는다 */
    const U1 = unit(d); let plan = {}; try { if (c0 && typeof c0.plan === 'function') plan = c0.plan(d) || {}; } catch (e) { }
    const EAc = eachOn(d); let WP = Array.isArray(d.weekPlan) && d.weekPlan.length ? d.weekPlan.map((w, i) => ({ w: i + 1, title: String(w.title || `${i + 1}${U1}`).trim(), goal: w.goal || '', ...(EAc ? { mins: wMins(d, w) } : {}) })) : null;
    const n = clamp(+(WP ? WP.length : (d._n || plan.weeks || d.sessions || d.weeks || (Uv ? 15 : 6))), 1, 60);
    const A = { ...D.auto, ...(d.auto || {}) }; const vsrc = d.vsrc || (A.video === 'ai' ? 'ai' : 'youtube');
    const o = { topic: name, weeks: Math.min(n, 30), univ: plan.univ != null ? plan.univ : Uv, quiz: d.quiz != null ? d.quiz !== false : !!A.quiz, assign: d.assign != null ? d.assign !== false : !!A.assign, exam: d.exam != null ? d.exam !== false : !!A.exam, vids: A.video === 'none' ? 0 : 1, level: d.levelTxt || '보통', vsrc, docs: d.docs != null ? !!d.docs : !!A.docs };
    const kind = d.kind || 'period'; const days = +d.days || D.days; const start = d.start || today(); const per = +(plan.per || d.per || (Uv ? 3 : (+d.mins || D.mins) / 60)) || 1;
    let W = (typeof AI !== 'undefined' && AI.design) ? AI.design({ ...o, weeks: Math.min(n, 30) }) : [];
    while (W.length < n) W.push({ w: W.length + 1, title: `${W.length + 1}${U1}`, goal: '', items: [{ type: 'video', title: `${name}: ${W.length + 1}${U1}`, q: name }] }); /* 보충 차시 제목도 유형 단위(회차 · 주차 · 차시) */
    if (WP) W = W.slice(0, n).map((w, i) => { const t2 = WP[i].title; const items = (w.items || []).map(x => x.type === 'video' && !/실습 영상/.test(x.title) ? { ...x, title: t2, q: `${name} ${t2}` } : x.type === 'quiz' ? { ...x } : x); return { ...w, w: i + 1, title: t2, goal: WP[i].goal || w.goal || '', items }; });
    if (o.vids === 0) W = W.map(w => ({ ...w, items: (w.items || []).filter(x => x.type !== 'video') }));
    const price = d.fee && d.fee.price != null && !d.fee.amb ? +d.fee.price : ((d.paid === false || d.paid === 'false') ? 0 : Math.max(0, +d.price || 0));
    const c = { id: uid('c'), name: name.slice(0, 50), kind, sub: d.sub || '', legal: !!d.legal, status: d.status || '준비중', price, open: d.open || D.open, start, end: d.end || addDays(start, kind === 'period' ? days : n * 7), teacher: d.teacher || S.me.name, group: '', learners: [], prog: {}, criteria: { ...D.criteria, ...(d.criteria || {}) }, cert: kind === 'sub' ? 'manual' : (d.cert || D.cert), skip: 'watched', speed: { on: true, min: (S.settings && +S.settings.speedMin) || 0.5, max: (S.settings && +S.settings.speedMax) || 2 }, early: false, community: 'class',
      hours: +d.hours || Math.round(n * per * 10) / 10, goal: d.goal || goalFor(name, d.target || d.aud || ''), notices: [], level: +d.level || 0, target: d.target || d.aud || '',
      period: { mode: d.end ? 'range' : 'days', days, start: d.end ? start : '', end: d.end || '' }, enr: {}, cat: d.cat || '', thumb: d.thumb || '', ...(d.thumbSpec ? { thumbSpec: d.thumbSpec } : {}), intro: [], teachers: [], discount: { on: false, type: 'rate', v: 10, until: '' }, recruit: { on: false, cap: +d.cap || 0, from: today(), to: '', early: { on: false, until: '', rate: 10 } }, openTo: [], sale: '판매중', crs: { v: 35, from: d.from || 'api', at: Date.now(), fill: d.fillEmpty !== false } };
    c.desc = String(c.goal || '').slice(0, 400);
    /* 회차(episode)도 콘텐츠 항목은 그대로 두고, 회차 일정 항목(offline)에 week를 붙여 같은 회차에 묶는다(C7 1차 결함) */
    { const user = Array.isArray(d.curriculum) ? d.curriculum.filter(Boolean) : []; const has = new Set(user.map(x => +x.week || 0)); const auto = d.fillEmpty !== false && typeof itemsFromDesign === 'function' ? itemsFromDesign(W, o) : []; /* 흐름은 확인 화면에서 고른 경우만 빈 차시를 채운다(fillEmpty, 기본 끔). 대화 · 에이전트(makeCourse)는 그대로 채움 */ c.curriculum = [...auto.filter(x => !has.has(+x.week || 0)), ...user.filter(x => x.type !== 'offline').map(x => ({ ...x, id: x.id || uid('it'), week: +x.week || 1 }))].sort((a, b) => (a.week || 0) - (b.week || 0));
      if (kind === 'episode') c.curriculum = [...(WP || W).map((w, i) => ({ id: uid('it'), type: 'offline', title: sessTitle(i + 1, w.title, '회차'), week: i + 1 })), ...c.curriculum]; }
    c.weekly = kind !== 'episode'; c.weekPlan = W.map((w, i) => ({ w: w.w, title: w.title, goal: w.goal || '', ...(EAc && WP && WP[i] ? { mins: WP[i].mins } : {}) })); if (EAc) c.minsMode = 'each';
    S.classes.unshift(c);
    try { if (c0 && typeof c0.apply === 'function') c0.apply(c, d); } catch (e) { console.error('cfg.apply', e); }
    try { critApply(c, d); } catch (e) { console.error('critApply', e); }
    try { extApply(c, d); } catch (e) { console.error('extApply', e); } /* v36: 직접 정한 수강 · 신청 기간, 시험 규칙, 평가 기준(비중) · 통과 점수 */
    if (c.kind === 'episode') { const off = (c.curriculum || []).filter(x => x.type === 'offline'); off.forEach((x, i) => { if (!(+x.week > 0)) x.week = i + 1; }); const mx = off.length; (c.curriculum || []).forEach(x => { if (x.type !== 'offline' && mx && +x.week > mx) x.week = mx; }); c.curriculum = c.curriculum.map((x, i) => [x, i]).sort((A, B) => ((+A[0].week || 0) - (+B[0].week || 0)) || ((A[0].type === 'offline' ? 0 : 1) - (B[0].type === 'offline' ? 0 : 1)) || (A[1] - B[1])).map(z => z[0]); if (!(c.weekPlan || []).length || c.weekPlan.length < mx) c.weekPlan = off.map((x, i) => ({ w: i + 1, title: (c.weekPlan[i] && c.weekPlan[i].title) || String(x.title || '').replace(/^\d+회차\s*/, '') || `${i + 1}회차`, goal: (c.weekPlan[i] && c.weekPlan[i].goal) || '' })); }
    try { logAudit(`${d.audit || (T('cls') + ' 생성')} — ${c.name}`); } catch (e) { }
    if (kind !== 'episode' && vsrc !== 'ai' && S.settings && S.settings.yt && S.settings.yt.key && typeof ytAutofill === 'function') ytAutofill(c);
    emit('create', { course: c, d, id: c.id, name: c.name }); return c;
  }

  /* ───────── 입력 묶기 ───────── */
  function readBody() { const b = $('#crsFlow .cf-body'); if (!b || !F) return; b.querySelectorAll('[data-cf]').forEach(el => setVal(el)); b.querySelectorAll('[data-cfw]').forEach(el => { const w = F.d.weekPlan && F.d.weekPlan[+el.dataset.cfw]; if (w) w.title = el.value; }); b.querySelectorAll('[data-cfwm]').forEach(el => { const w = F.d.weekPlan && F.d.weekPlan[+el.dataset.cfwm]; if (w) w.mins = el.value === '' ? '' : clamp(+el.value || 0, 0, 600); }); }
  function setVal(el) { const k = el.dataset.cf; let v = el.dataset.bool ? el.checked : el.value; if (el.dataset.num) v = v === '' ? '' : +v; if (k === 'sessions' && v !== '') { if (+v > MAXS) F.d._over = +v; else delete F.d._over; v = clamp(+v, 1, MAXS); } F.d[k] = v; }
  /* 이름 · 대상을 고치는 동안 자동 목표를 따라 바꾸고, 화면에 목표 칸이 있으면 값만 바꾼다(입력 중 다시 그리지 않음) */
  function goalLive() { if (!F || !syncGoal(F.d)) return; const t2 = $('#crsFlow [data-cf="goal"]'); if (t2 && document.activeElement !== t2) t2.value = F.d.goal; }
  function bind(w) {
    /* 차시 제목 칸에 여러 줄을 붙여 넣으면 그 칸부터 줄마다 차시 하나(목록 붙여 넣기와 같은 규칙) */
    w.addEventListener('paste', e => { if (!F) return; const el = e.target; if (!el || el.dataset.cfw == null) return; const txt = (e.clipboardData || window.clipboardData || { getData: () => '' }).getData('text') || ''; if (parseLines(txt).length < 2) return; e.preventDefault(); readBody(); applyBulk(txt, +el.dataset.cfw); });
    w.addEventListener('input', e => { if (!F) return; armIdle(); const el = e.target; if (el.dataset.cfbulkt) { F.bulkTxt = el.value; const n = w.querySelector('[data-cfbulkn]'); if (n) n.textContent = bulkCount(F.d, el.value); const er = w.querySelector('[data-cff="bulk"] .cf-err'); er && er.remove(); return; } if (el.dataset.cf === 'totalH') F.totEdit = true; if (el.dataset.cf) { setVal(el); F.bad = {}; const f = el.closest('.cf-f'); if (f) { f.classList.remove('bad'); const er = f.querySelector('.cf-err'); er && er.remove(); } } if (el.dataset.cfw != null) { const x = F.d.weekPlan[+el.dataset.cfw]; if (x) x.title = el.value; } if (el.dataset.cfwm != null) { const x = F.d.weekPlan[+el.dataset.cfwm]; if (x) x.mins = el.value === '' ? '' : clamp(+el.value || 0, 0, 600); const tl = w.querySelector('[data-cftot]'); if (tl) tl.innerHTML = totLine(F.d); } if (/^ew[PEAT]$/.test(el.dataset.cf || '')) { const sm = w.querySelector('[data-cfewsum]'); if (sm) sm.outerHTML = ewSumHTML(F.d); } if (['name', 'target', 'topic'].includes(el.dataset.cf)) goalLive(); if (el.dataset.cf === 'goal') { const pg = w.querySelector('[data-cfpvgoal]'); if (pg) { pg.textContent = String(el.value || '').slice(0, 160); pg.hidden = !el.value; } } emit('change', { step: F.ids[F.step], field: el.dataset.cf || 'weekPlan', d: F.d }); saveSoon(); });
    w.addEventListener('change', e => { if (!F || F.painting) return; const el = e.target; if (el.dataset.cfwm != null) { readBody(); saveDraft(); const lg = w.querySelector('.cf-body .cf-legal'); const nh = legalBox(F.d); if (lg) { if (nh) lg.outerHTML = nh; else lg.remove(); } return; } /* 법정 시간 안내만 합계에 맞춰 바꾼다(다시 그리면 [다음] 클릭이 사라짐) */ if (el.dataset.cf === 'sessions') { if (+F.d._over > MAXS) { F.d._overNote = +F.d._over; delete F.d._over; } syncPlan(); } if (el.dataset.cf === 'totalH') { const v = +el.value; if (v > 0 && Math.abs(v - totOf(F.d)) > 0.05) applyFit(v, '총 시간 맞추기'); else paint(); } });
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
      if (!F) { if ((el = g('[data-cfdone]'))) { const k = el.dataset.cfdone; const id = el.dataset.c; if (k === 'pv') { preview(id); emit('done', { action: k, id }); return; } close(false); if (k === 'fill' || k === 'close' || k === 'enroll') { UI.cls = id; UI.clsT = k === 'enroll' ? 'learners' : 'curriculum'; if (typeof UI.slaClsHome !== 'undefined') UI.slaClsHome = k !== 'fill' ? { id, t: 'learners' } : null; go('class'); if (k === 'enroll') setTimeout(() => { const b = $('#main [data-act=cls-grant]'); if (b) { b.classList.add('cf-hl'); try { b.focus(); } catch (e) { } } toast(`[수강 권한 부여]를 누르면 ${josa(T('learner'), '을')} 이 ${josa(T('cls'), '에')} 배정합니다. 새 ${josa(T('learner'), '은')} 학생 메뉴에서 초대합니다.`, 'ok'); }, 120); } else if (k === 'site') { const c1 = typeof C === 'function' ? C(id) : null; if (c1 && pubState(c1).ok && ACT['d26-view0']) { try { ACT['d26-view0']({ dataset: { v: id } }); } catch (e2) { } UI.cls = id; UI.clsT = 'curriculum'; go('class'); } else if (publish(id) !== false) { const sg = el.dataset.go || 'site'; try { go(sg); } catch (e2) { UI.cls = id; go('class'); } toast(`${josa(T('learner'), '에게')} 공개했습니다. 학습자 사이트를 게시해 신청 목록에 보입니다.`, 'ok'); } else { UI.cls = id; UI.clsT = 'curriculum'; go('class'); } } else if (el.dataset.go) go(el.dataset.go); emit('done', { action: k, id }); } return; }
      if ((el = g('[data-cfjump]'))) { jump(+el.dataset.cfjump); return; }
      if ((el = g('[data-cfset]'))) { readBody(); const k = el.dataset.cfset; let v = el.dataset.v; v = v === 'true' ? true : v === 'false' ? false : el.dataset.n ? +v : v; if (k === '_vsrc') { F.d.auto = { ...(F.d.auto || {}), video: v }; } else F.d[k] = v; { const c0 = cfgOf(); if (c0 && typeof c0.onSet === 'function') try { c0.onSet(k, v, F.d); } catch (e2) { console.error('cfg.onSet', e2); } } if (['grade', 'subject', 'target'].includes(k)) syncGoal(F.d); emit('change', { step: F.ids[F.step], field: k, d: F.d }); saveDraft(); paint(); return; }
      if ((el = g('[data-cfday]'))) { readBody(); const k = el.dataset.cfday, v = +el.dataset.v; const L = Array.isArray(F.d[k]) ? F.d[k] : []; F.d[k] = L.includes(v) ? L.filter(x => x !== v) : [...L, v].sort(); saveDraft(); paint(); return; }
      if ((el = g('[data-cfnum]'))) { readBody(); const k = el.dataset.cfnum; const inp = w.querySelector(`[data-cf="${k}"]`); const mn = inp && inp.min !== '' ? +inp.min : 0, mx = inp && inp.max !== '' ? +inp.max : 1e9; F.d[k] = clamp((+F.d[k] || 0) + +el.dataset.d, mn, mx); if (k === 'sessions') syncPlan(true); else { saveDraft(); paint(); } return; }
      if ((el = g('[data-cfai]'))) { readBody(); const k = el.dataset.cfai; snap('AI SAM이 채운 내용'); if (k === 'weekPlan') { F.d.weekPlan = planFrom(F.d); F.d.sessions = F.d.weekPlan.length; } else { F.d[k] = fieldAI(k, { ...F.d, [k]: '' }); if (k === 'goal') F.d._goalAI = F.d.goal; else if (k === 'name' || k === 'target') syncGoal(F.d); F.focus = k; } if (S.ai) S.ai.usage = (S.ai.usage || 0) + 1; saveDraft(); paint(); toast('AI SAM이 채웠습니다. 확인하고 고쳐 주세요.', 'ok'); return; }
      if ((el = g('[data-cftpl]'))) { readBody(); const x = tplList().find(y => y.id === el.dataset.cftpl); if (x) { snap('템플릿 선택'); Object.assign(F.d, JSON.parse(JSON.stringify(x.prefill || {})), { tpl: x.id }); if (x.prefill && x.prefill.mins != null) F.d.minsMode = 'same'; if (!(x.prefill && x.prefill.weekPlan)) { F.d.weekPlan = []; delete F.d._olTouched; } if (x.prefill && x.prefill.goal) F.d._goalAI = F.d.goal; else syncGoal(F.d); saveDraft(); paint(); } return; }
      if ((el = g('[data-cfbulk]'))) { readBody(); F.bulk = el.dataset.cfbulk === '1'; if (!F.bulk) F.bulkTxt = ''; paint(); const t2 = w.querySelector('[data-cfbulkt]'); t2 && t2.focus(); return; }
      if ((el = g('[data-cfbulkok]'))) { const t2 = w.querySelector('[data-cfbulkt]'); const v = t2 ? t2.value : (F.bulkTxt || ''); if (!parseLines(v).length) { const f = w.querySelector('[data-cff="bulk"]'); if (f && !f.querySelector('.cf-err')) f.insertAdjacentHTML('beforeend', `<p class="cf-err" role="alert">붙여 넣은 줄이 없습니다. ${unit(F.d)} 제목을 한 줄에 하나씩 넣어 주십시오.</p>`); emit('error', { step: F.ids[F.step], field: 'bulk', msg: '붙여 넣은 줄 없음', empty: true, n: 1, d: F.d }); return; } readBody(); applyBulk(v, 0); return; }
      if ((el = g('[data-cfolall]'))) { readBody(); F.olAll = true; paint(); const L = w.querySelectorAll('[data-cfw]'); L[OL_SHOW] && L[OL_SHOW].focus(); return; }
      if ((el = g('[data-cfwadd]'))) { readBody(); F.d.weekPlan = F.d.weekPlan || []; F.d.weekPlan.push({ w: F.d.weekPlan.length + 1, title: '', goal: '', ...(eachOn(F.d) ? { mins: curMins(F.d) } : {}) }); F.d.sessions = F.d.weekPlan.length; saveDraft(); paint(); const L = w.querySelectorAll('[data-cfw]'); L.length && L[L.length - 1].focus(); return; }
      if ((el = g('[data-cfwdel]'))) { readBody(); const i = +el.dataset.cfwdel; snap(`${i + 1}${unit(F.d)} 지우기`); F.d.weekPlan.splice(i, 1); F.d.sessions = F.d.weekPlan.length || 1; saveDraft(); paint(); return; }
      if ((el = g('[data-cfwmv]'))) { readBody(); const i = +el.dataset.cfwmv, j = i + +el.dataset.d; const L = F.d.weekPlan; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; saveDraft(); paint(); return; }
      if ((el = g('[data-cfauto]'))) { readBody(); const k = el.dataset.cfauto; const A = F.d.auto = { ...defs().auto, ...(F.d.auto || {}) }; if (k === 'video') A.video = A.video === 'none' ? 'youtube' : 'none'; else A[k] = !A[k]; saveDraft(); paint(); return; }
      if ((el = g('[data-cffit]'))) { readBody(); applyFit(+el.dataset.cffit, '총 시간 맞추기'); return; }
      if ((el = g('[data-cflegal]'))) { readBody(); const r = applyFit(+el.dataset.cflegal, '법정 시간에 맞추기'); if (r) { const L = legalOf(F.d); if (L && !L.short) toast(`법정 ${L.need}시간을 채웠습니다: ${unit(F.d)} ${r.sessions}개 × ${hmTxt(r.mins)} = ${r.hours}시간.`, 'ok'); } return; }
      if ((el = g('[data-cffix]'))) { try { snap('안내대로 고치기'); Object.assign(F.d, JSON.parse(el.dataset.cffix)); saveDraft(); paint(); } catch (er) { } return; }
    });
  }
  /* 차시 수를 바꾸면 목록 길이를 맞춘다(줄일 땐 되돌리기 가능) */
  function syncPlan(repaint) { const d = F.d; const n = clamp(+d.sessions || 1, 1, 60); d.sessions = n; const L = d.weekPlan || (d.weekPlan = []); if (L.length && L.length !== n) { if (n < L.length) snap(`${unit(d)} 수 줄이기`); while (L.length > n) L.pop(); while (L.length < n) L.push({ w: L.length + 1, title: '', goal: '', ...(eachOn(d) ? { mins: curMins(d) } : {}) }); const P = planFrom({ ...d, sessions: n }); L.forEach((w, i) => { if (!w.title && P[i]) w.title = P[i].title; }); } saveDraft(); paint(); }

  /* ───────── 공개 인터페이스 ───────── */
  const CF = window.CF = Object.assign(window.CF || {}, {
    open, close, next, prev, undo, create, on, emit, sessTitle, legalBox, steps, step: stepOf, stepIds, titleOf, planOf, cfgKey, cfgOf, unit, ui, DEF, defaults: defs, fieldAI, planFrom,
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

  /* 이어서 하기 띠: 과정 목록 위에 초안이 있으면 한 줄로 알림 */
  /* 휴대폰: 두 줄로 줄인 '지금 할 일'을 누르면 전체 문장 펼치기 */
  document.addEventListener('click', e => { const n = e.target && e.target.closest && e.target.closest('#crsFlow [data-cfnow]'); if (n && n.parentNode) n.parentNode.classList.toggle('open'); });
  if (typeof render === 'function') { const b = render; render = function (...a) { const r = b.apply(this, a); try { const m = $('#main'); if (m && typeof CUR !== 'undefined' && CUR.tab === 'class' && !UI.cls && !F && hasDraft() && !m.querySelector('.cf-resbar')) { const x = S.crsDraft; m.insertAdjacentHTML('afterbegin', `<div class="cf-resbar" role="status"><span>만들던 <b>${esc(x.d.name || T('cls'))}</b>${josa(x.d.name || T('cls'), '이').slice(String(x.d.name || T('cls')).length)} 있습니다.</span><button type="button" class="btn pri" data-act="crs-resume">이어서 하기</button></div>`); } } catch (e) { } return r; }; }
  ACT['crs-resume'] = () => { if (!hasDraft()) { dropDraft(); return open({ from: 'menu', fresh: true }); } return open({ resume: true, _asked: true, from: 'menu' }); }; /* v36: 다른 기관 유형에서 만든 초안은 이어 쓰지 않는다(유형이 섞이지 않게) */

  /* 수강 배정(수강 권한 부여)에 고를 학생이 없으면 '검색 결과가 없습니다' 대신 등록 · 초대로 가는 길(평가 2회차 3번). 학습자는 학번 · 학과만 받는다 */
  { const base = ACT['cls-grant']; if (base) ACT['cls-grant'] = (el, ...r) => { try { const c = typeof C === 'function' ? C(el && el.dataset && el.dataset.v) : null;
      if (c) { const M0 = (S.members || []).filter(m => m.grade !== '거절'); const avail = M0.filter(m => !(c.learners || []).includes(m.id) && m.grade !== '승인 대기'); const grp = (S.groups || []).some(g => M0.some(m => m.group === g.id && !(c.learners || []).includes(m.id)));
        if (!avail.length && !grp) { const L = T('learner'); const wait = M0.filter(m => m.grade === '승인 대기').length; const can = k => typeof menuOn !== 'function' || menuOn(k);
          modal(`수강 배정 — ${c.name}`, `<div class="cf-gempty"><p class="cf-gt"><b>${M0.length ? `등록된 ${josa(L, '이')} 모두 이미 수강 중입니다.` : `아직 등록된 ${josa(L, '이')} 없습니다.`}</b></p><p>먼저 ${josa(L, '을')} 등록하거나 초대 링크를 보내 주십시오. 등록하면 이 화면에서 바로 배정할 수 있습니다.</p>
            <ul class="cf-gl"><li><b>학번으로 ${L} 등록하기</b> — 학번 · 학과만 적으면 접근코드가 나옵니다. 이름 · 연락처는 받지 않습니다.</li><li><b>초대 링크 만들기</b> — 링크로 가입하면 ${L} 명단에 들어옵니다.</li></ul>${wait ? `<p class="mini">가입 승인을 기다리는 ${L} ${wait}명이 있습니다. ${L} 메뉴에서 승인하면 배정할 수 있습니다.</p>` : ''}</div>`,
            [{ id: 'c', label: '닫기' }, { id: 'inv', label: '초대 링크 만들기', run: () => { if (ACT['mem-invite']) ACT['mem-invite']({ dataset: {} }); else go('members'); } }, { id: 'sid', label: `학번으로 ${L} 등록하기`, kind: 'pri', run: () => { if (typeof SL !== 'undefined' && SL && SL.sheet && ACT['sla-codes']) { setTimeout(() => ACT['sla-codes']({ dataset: {} }), 0); return; } go(can('enroll') ? 'enroll' : 'members'); } }]);
          return; } } } catch (e) { console.error('cls-grant empty', e); } return base(el, ...r); }; }

  /* v38: 콘텐츠 없는 과정은 [운영 시작하기 · 전체 공개]도 막고 무엇을 채우면 되는지 알린다(U-3 · A-5 · P-4) */
  { const base = ACT['c2-golive']; if (base) ACT['c2-golive'] = (el, ...r) => { const c = typeof C === 'function' ? C(el && el.dataset && el.dataset.v) : null; if (c && !hasContent(c)) { toast(`${josa(c.name, '은')} 아직 넣은 콘텐츠가 없어 공개하지 않았습니다. ${u2(c)}에 영상 · 교안 · 퀴즈를 하나 이상 넣거나 [AI로 콘텐츠 채우기]를 누른 뒤 공개하십시오.`, 'warn'); UI.clsT = 'curriculum'; try { render(); } catch (e) { } return; }
      const r0 = base(el, ...r); try { if (c && c.crs && c.crs.hold) { delete c.crs.hold; const P = (c.crs.pendNotify || []).filter(id2 => (c.learners || []).includes(id2)); if (P.length && typeof c2Notify === 'function') P.forEach(id2 => c2Notify(id2, `${c.name} 수강을 시작할 수 있습니다`, '준비하던 학습 내용이 열렸습니다. 지금 바로 수강을 시작할 수 있습니다.')); delete c.crs.pendNotify; save(); } } catch (e) { } return r0; }; }
  /* v38 A-5: 운영자 카드 · 상세의 판매 표시도 학습자 화면과 같게 — 콘텐츠가 없으면 '준비 중 · 신청 불가' */
  if (typeof c2SaleLabel === 'function') { const base = c2SaleLabel; window.c2SaleLabel = c2SaleLabel = function (c) { try { if (c && !hasContent(c) && cfgKey() !== 'k12') return '준비 중 · 신청 불가'; } catch (e) { } return base.apply(this, arguments); }; }
  if (typeof AFTER !== 'undefined' && Array.isArray(AFTER)) AFTER.push(() => { try { if (!CUR || CUR.tab !== 'class' || !UI.cls) return; const c = C(UI.cls); const n = document.querySelector('#main .c2ready'); if (!c || !n || hasContent(c) || n.dataset.cf38) return; n.dataset.cf38 = '1';
      n.innerHTML = `<p><b>준비 중(비공개) — 아직 넣은 콘텐츠가 없어 ${esc(josa(T('learner'), '에게'))} 보이지 않습니다.</b> ${esc(josa(u2(c), '에'))} 영상 · 교안 · 퀴즈를 하나 이상 넣으면 공개할 수 있습니다. </p><p style="margin-top:8px"><button class="btn pri" style="min-height:44px" data-act="ai-fill" data-v="${esc(c.id)}">AI로 콘텐츠 채우기</button>`; } catch (e) { console.error(e); } });
  if (typeof AFTER !== 'undefined' && Array.isArray(AFTER)) AFTER.push(() => { try { document.querySelectorAll('#main .tag.g').forEach(x => { if (x.textContent.trim() === '준비 중 · 신청 불가') x.className = 'tag y'; }); } catch (e) { } });

  /* v38 P-17 · U-11: 복사본은 '준비 중(비공개)'으로, 이름은 '○○ 2기'처럼 기수를 올린다('(복사)'가 학습자 목록에 바로 보이던 문제). 과정 상세 머리에 [복사해 다음 기수 만들기] */
  const nextName = nm => { const b = String(nm || '').replace(/\s*\(복사\)$/, '').trim(); const m = b.match(/^(.*?)(\d+)\s*기$/); let n = m ? `${m[1].trim()} ${+m[2] + 1}기` : `${b} 2기`; const has = x => (S.classes || []).some(c => c.name === x); let k = m ? +m[2] + 1 : 2; while (has(n) && k < 99) { k++; n = `${(m ? m[1] : b).trim()} ${k}기`; } return n.slice(0, 50); };
  { const base = ACT['cls-copy']; if (base) ACT['cls-copy'] = (el, ...r) => { const src = typeof C === 'function' ? C(el && el.dataset && el.dataset.v) : null; const before = (S.classes || []).slice(); const t0 = window.toast; let r0; try { window.toast = () => { }; r0 = base(el, ...r); } finally { window.toast = t0; }
      const n = (S.classes || []).find(c => !before.includes(c)); if (n && src) { n.name = nextName(src.name); n.open = '비공개'; n.status = '준비중'; n.crs = Object.assign({}, n.crs || {}, { copyOf: src.id }); delete n.crs.hold; delete n.crs.pendNotify; const i = S.classes.indexOf(n); if (i > 0) { S.classes.splice(i, 1); S.classes.unshift(n); } try { save(); } catch (e) { } try { render(); } catch (e) { }
        toast(`${josa(n.name, '을')} 만들었습니다. 지금은 '준비 중(비공개)'이라 ${josa(T('learner'), '에게')} 보이지 않습니다. 기간 · 신청 기간을 확인하고 [운영 시작하기]를 누르면 공개됩니다.`, 'ok'); } else if (t0) t0('복사본을 만들었습니다.', 'ok'); return r0; }; }
  if (typeof AFTER !== 'undefined' && Array.isArray(AFTER)) AFTER.push(() => { try { if (!CUR || CUR.tab !== 'class' || !UI.cls) return; const c = C(UI.cls); if (!c) return; const phr = [...document.querySelectorAll('#main .ph .phr')].find(x => x.offsetParent); if (!phr || phr.querySelector('[data-act=cls-copy]')) return;
      phr.insertAdjacentHTML('beforeend', `<button type="button" class="btn sm ghost cf-copyb" data-act="cls-copy" data-v="${esc(c.id)}">${typeof ic === 'function' ? ic('copy', 14) : ''} 복사해 ${U() ? '다음 학기용' : '다음 기수'} 만들기</button>`); } catch (e) { console.error(e); } });

  /* v38 L-2: 대기자 — 학습자 [대기 신청하기](lshop → LPX 'wait-req') → 과정 상세 '대기자' 명단 → [올리기](정원이 차 있으면 1명 늘릴지 묻고) + 알림 */
  if (typeof LPX === 'object' && LPX) LPX['wait-req'] = x => { const d = x.data || {}; const c = typeof C === 'function' ? C(d.cls) : null; const m = (S.members || []).find(y => y.sid === x.who || y.id === x.who) || (typeof cmWho === 'function' ? cmWho(x.who) : null); if (!c || !m) return;
    c.waits = c.waits || []; if ((c.learners || []).includes(m.id) || c.waits.some(w => w.id === m.id)) return; c.waits.push({ id: m.id, at: typeof nowStr === 'function' ? nowStr() : new Date().toISOString() }); audit2(`대기 신청 — ${c.name} · ${m.name || m.sid || m.id}`); try { save(); } catch (e) { } };
  const capOf = c => +((c && c.recruit) || {}).cap || 0;
  function waitUp(cid, mid) { const c = C(cid); if (!c) return; const m = (S.members || []).find(y => y.id === mid); const doUp = () => { c.learners = c.learners || []; if (!c.learners.includes(mid)) { c.learners.push(mid); c.prog = c.prog || {}; c.prog[mid] = c.prog[mid] || { p: 0, exam: null, assign: 'none', att: 100 }; c.enr = c.enr || {}; c.enr[mid] = { at: today(), end: null, src: 'wait', status: 'active', paid: null }; }
      c.waits = (c.waits || []).filter(w => w.id !== mid); if (typeof c2Notify === 'function') c2Notify(mid, `${c.name} 자리가 났습니다`, '대기 신청한 강의에 자리가 나서 지금 바로 수강할 수 있습니다.'); audit2(`대기자 올리기 — ${c.name} · ${(m && (m.name || m.sid)) || mid}`); try { save(); } catch (e) { } try { render(); } catch (e) { } toast(`${(m && (m.name || m.sid)) || '대기자'}님을 수강생으로 올리고 알림을 보냈습니다.`, 'ok'); };
    const cap = capOf(c); if (cap && (c.learners || []).length >= cap) { modal('정원이 찼습니다', `<p style="font-size:16px">${esc(c.name)}의 정원 ${cap}명이 모두 찼습니다. 정원을 ${cap + 1}명으로 1명 늘리고 올릴까요?</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '정원 늘리고 올리기', kind: 'pri', run: () => { c.recruit.cap = cap + 1; doUp(); } }]); return; } doUp(); }
  ACT['cf-wait-up'] = el => waitUp(el.dataset.c, el.dataset.v);
  ACT['cf-wait-del'] = el => { const c = C(el.dataset.c); if (!c) return; c.waits = (c.waits || []).filter(w => w.id !== el.dataset.v); try { save(); render(); } catch (e) { } };
  if (typeof AFTER !== 'undefined' && Array.isArray(AFTER)) AFTER.push(() => { try { if (!CUR || CUR.tab !== 'class' || !UI.cls || (UI.clsT || 'learners') !== 'learners') return; const c = C(UI.cls); const W0 = (c && c.waits) || []; const v = document.querySelector('#main .bview'); if (!c || !W0.length || !v || v.querySelector('.cf-waits')) return;
      const cap = capOf(c); const nm = id => { const m = (S.members || []).find(y => y.id === id); return m ? (m.name || m.sid || m.nick || id) : id; }; const tw = v.querySelector('.c2lt, .tw, table');
      const html = `<div class="card cf-waits"><div class="ch"><b>대기자 ${W0.length}명</b><small>${cap ? `정원 ${cap}명 중 ${(c.learners || []).length}명 수강 중` : '정원 제한 없음'} · 신청한 순서대로 올리면 바로 알림이 갑니다</small></div><ol class="cf-wl">${W0.map(w => `<li><span>${esc(nm(w.id))}</span><small>${esc(String(w.at || '').slice(0, 16))}</small><button type="button" class="btn sm pri" data-act="cf-wait-up" data-c="${esc(c.id)}" data-v="${esc(w.id)}">수강생으로 올리기</button><button type="button" class="btn sm ghost" data-act="cf-wait-del" data-c="${esc(c.id)}" data-v="${esc(w.id)}">빼기</button></li>`).join('')}</ol></div>`;
      if (tw) tw.insertAdjacentHTML('beforebegin', html); else v.insertAdjacentHTML('beforeend', html); } catch (e) { console.error(e); } });

  /* ───────── 생성 함수 통일 ───────── */
  if (typeof makeCourse === 'function') { const old = makeCourse; makeCourse = function (x) { x = x || {}; if (x.legacy) return old(x); /* 기존 호출자(SAM · 저니 · 에이전트) 호환: topic · weeks · aud · fee · docs · vsrc · quiz · assign · exam · level */
      return create({ name: x.topic, sessions: x.weeks, _n: clamp(+x.weeks || (U() ? 15 : 6), 1, 30), target: x.aud || '', fee: x.fee, docs: !!x.docs, vsrc: x.vsrc || 'youtube', quiz: x.quiz !== false, assign: x.assign !== false, exam: x.exam !== false, level: x.level, open: '비공개', status: '준비중', days: (clamp(+x.weeks || (U() ? 15 : 6), 1, 30)) * 7, audit: 'AI 과정 생성', from: 'sam' }); }; CF._makeCourseOld = old; }
  if (typeof dsCreate === 'function') { const old = dsCreate; dsCreate = function (...a) { const n0 = S.classes[0]; const r = old.apply(this, a); const c = S.classes[0]; if (c && c !== n0) { c.criteria = { ...defs().criteria }; emit('create', { course: c, d: null, id: c.id, name: c.name }); try { save(); } catch (e) { } } return r; }; }
  if (typeof wzSave === 'function') { const old = wzSave; wzSave = function (...a) { const n0 = S.classes[0]; const r = old.apply(this, a); const c = S.classes[0]; if (r !== false && c && c !== n0) { c.criteria = { ...defs().criteria, ...(cfgOf() && cfgOf().defaults && cfgOf().defaults.criteria || {}) }; emit('create', { course: c, d: null, id: c.id, name: c.name }); try { save(); } catch (e) { } } return r; }; }
})();
