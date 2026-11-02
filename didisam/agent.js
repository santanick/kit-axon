/* 디디쌤 스튜디오 v18 — AI SAM 에이전트: Claude가 먼저 이해하고 스튜디오 기능을 도구로 골라 쓴다
   · 조회 도구로 실제 데이터를 확인한 뒤 답한다(숫자를 지어내지 않음)
   · 여러 단계가 섞인 지시는 실행 명령을 여러 개로 나눠 계획 카드로 만든다 → 운영자가 승인해야 실행(발송 · 생성 · 변경)
   · Claude가 연결되지 않았거나 실패하면 규칙 엔진(비상용)으로 처리한다. 학습자 이름 · 연락처는 보내지 않는다(번호 · 소속 · 집계만). */
'use strict';
const AG_TOOLS = [
  { name: 'get_overview', description: '기관 운영 현황: 역할별(세팅 · 운영 · 리포트) 할 일과 건수, 학습자 수 · 평균 진도 · 이수율 · 채점 대기 · 미답변 질문 · 미접속 · 법정교육 미이수, 소속별 · 과정별 집계. 답하기 전에 먼저 부르세요.', input_schema: { type: 'object', properties: {} } },
  { name: 'list_courses', description: '과정 목록(상태 · 수강 인원 · 평균 진도 · 이수 인원 · 채점 대기 · 기간 · 법정의무 여부).', input_schema: { type: 'object', properties: { status: { type: 'string', description: '운영중 · 준비중 · 종료(생략 시 전체)' } } } },
  { name: 'list_learners_at_risk', description: '진도가 낮거나 오래 접속하지 않은 학습자(번호 · 소속 · 과정 · 진도 · 마지막 접속). 이름은 없습니다.', input_schema: { type: 'object', properties: { max_progress: { type: 'integer', description: '이 진도(%) 미만(기본 30)' }, inactive_days: { type: 'integer', description: '이 일수 이상 미접속(선택)' }, course: { type: 'string', description: '과정 이름 일부(선택)' }, group: { type: 'string', description: '소속 이름(선택)' } } } },
  { name: 'list_open_questions', description: '답변하지 않은 학습자 질문(질문함 · 게시판).', input_schema: { type: 'object', properties: {} } },
  { name: 'run_studio_command', description: '스튜디오에서 실행 · 생성 · 변경 · 발송할 일을 계획 카드로 만듭니다(운영자가 승인해야 실행). command에는 한 가지 일만 담은 짧은 한국어 지시문을 넣습니다. 예: "진도 30% 미만 학습자에게 독려 메시지 보내줘", "생성형 AI 활용 8주 과정 설계해줘", "채점 대기 과제 AI로 1차 채점해줘", "미답변 질문에 답변 초안 만들어줘", "법정교육 미이수자에게 마감 안내 보내줘", "매주 금요일 부서장에게 이수 리포트 보내는 자동화 만들어줘", "교육 결과 보고서 문서 만들어줘", "이번 주 운영 안내 공지 써줘". 여러 일이면 여러 번 부르세요.', input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
  { name: 'open_screen', description: '미리보기 화면을 특정 기능 화면으로 엽니다. screen: home · dash(현황) · class(과정) · assess(평가) · members(학습자) · enroll(수강) · community(질문 · 게시판) · message(메시지) · auto(자동화) · compliance(법정의무교육) · docs(문서) · lsite(학습자 사이트) · settings', input_schema: { type: 'object', properties: { screen: { type: 'string' } }, required: ['screen'] } },
  { name: 'download_report', description: '기관 유형에 맞는 실적 보고서(한글 · Word)를 바로 내려받게 합니다.', input_schema: { type: 'object', properties: {} } },
  { name: 'start_guide', description: '단계별 따라하기 가이드를 시작합니다. guide_id: start(첫날 세팅) · course(과정 완성) · learners(학습자 등록) · grade(채점) · nudge(독려 자동화) · report(보고서) · mcp(외부 AI 연결) · site(포털) · docs(문서) · legal(법정교육) · t-new · t-run · t-report', input_schema: { type: 'object', properties: { guide_id: { type: 'string' } }, required: ['guide_id'] } }
];
const agSid = m => String(m.sid || (m.extra && (m.extra.학번 || m.extra.사번)) || m.id);
const agGrp = m => ((S.groups || []).find(g => g.id === m.group) || {}).name || '';
function agRun(name, x, ctx) { x = x || {};
  if (name === 'get_overview') { const st = typeof smStat === 'function' ? smStat() : {}; const T = typeof smTasks === 'function' ? smTasks() : [];
    return { 역할: typeof scn === 'function' && scn() === 'teacher' ? '교수자(강사)' : '운영자', 지표: st, 할일: T.filter(t2 => t2.n || t2.always).map(t2 => ({ 역할: t2.m === 'setup' ? '세팅' : t2.m === 'run' ? '운영' : '리포트', 할일: t2.l, 건수: t2.n || 0, 완료: !!t2.done })), 상세: typeof clCtx === 'function' ? clCtx() : {} }; }
  if (name === 'list_courses') { const C = (typeof smCls === 'function' ? smCls() : S.classes).filter(c => !x.status || c.status === x.status);
    return C.slice(0, 40).map(c => { const ids = c.learners || []; const P = ids.map(id => +((c.prog || {})[id] || {}).p || 0); const thr = (c.criteria && c.criteria.threshold) || 80; return { 과정: c.name, 상태: c.status, 수강: ids.length, 평균진도: P.length ? Math.round(P.reduce((a, b) => a + b, 0) / P.length) : 0, 이수: P.filter(p => p >= thr).length, 채점대기: ids.filter(id => ((c.prog || {})[id] || {}).assign === 'submitted').length, 기간: `${c.start}~${c.end}`, 법정의무: !!c.legal }; }); }
  if (name === 'list_learners_at_risk') { const mx = +x.max_progress || 30; const days = +x.inactive_days || 0; const out = [];
    (S.classes || []).filter(c => c.status === '운영중' && (!x.course || c.name.includes(x.course))).forEach(c => (c.learners || []).forEach(id => { const m = (S.members || []).find(y => y.id === id); if (!m) return; const p = +((c.prog || {})[id] || {}).p || 0; const g = agGrp(m); if (x.group && g !== x.group) return; const off = daysAgo(m.last);
      if (p < mx || (days && off >= days)) out.push({ 번호: agSid(m), 소속: g, 과정: c.name, 진도: p, 미접속일: off }); }));
    return { 건수: out.length, 목록: out.sort((a, b) => a.진도 - b.진도).slice(0, 40) }; }
  if (name === 'list_open_questions') { const Q = (typeof tqEnsure === 'function' ? tqEnsure() : []).filter(q => q.st !== 'answered').map(q => ({ 출처: q.src || '질문함', 과정: q.cls, 질문: q.q }));
    const P = (S.posts || []).filter(p => p.kind === '질문' && !p.replies).map(p => ({ 출처: p.board || '게시판', 질문: p.title }));
    return { 건수: Q.length + P.length, 목록: [...Q, ...P].slice(0, 30) }; }
  if (name === 'run_studio_command') { const cmd = String(x.command || '').trim().slice(0, 300); if (!cmd) return { ok: false, 이유: '지시문이 비었습니다' }; let r = {};
    try { r = AG.base(cmd) || {}; } catch (e) { return { ok: false, 이유: '처리 중 오류' }; }
    if (/정확히 이해하지 못했습니다|처리할 수 없는/.test(r.text || '')) return { ok: false, 이유: '스튜디오가 이 지시를 처리하지 못했습니다. 더 구체적으로 나눠 다시 시도하거나 화면에서 직접 하도록 안내하세요.' };
    ctx.cards.push({ ...r, act: cmd }); return { ok: true, 승인필요: !!r.plan, 결과: [r.title, String(r.text || '').slice(0, 500)].filter(Boolean).join(' — ') }; }
  if (name === 'open_screen') { const sc = String(x.screen || ''); if (sc !== 'home' && sc !== 'settings' && !MENU[sc]) return { ok: false, 이유: '없는 화면' }; ctx.nav = sc; return { ok: true }; }
  if (name === 'download_report') { ctx.after.push(() => ACT['seg-report'] && ACT['seg-report']()); return { ok: true, 안내: '보고서 내려받기를 시작합니다' }; }
  if (name === 'start_guide') { const g = typeof gdG === 'function' && gdG(String(x.guide_id || '')); if (!g) return { ok: false, 이유: '없는 가이드' }; ctx.after.push(() => gdStart(g.id)); return { ok: true, 가이드: gdVal(g.title), 단계: g.steps.length }; }
  return { ok: false, 이유: '알 수 없는 도구' }; }
const AG_SYS = () => { const T = typeof scn === 'function' && scn() === 'teacher'; return `당신은 교육기관 운영 플랫폼 「디디쌤 스튜디오」의 AI 비서 AI SAM입니다. 지금 사용자는 ${TYPES[S.org.type].name}의 ${T ? `${t('teacher')}(강의 담당)` : '운영자'}입니다. 기관: ${S.org.name}. 오늘: ${today()}.
AI SAM은 세 가지 역할로 돕습니다: ① ${T ? '강의 준비(설계 · 개발 · 개설)' : '시작 세팅(홈페이지 · 과정 · 학습자 등록 · 포털 게시)'} ② ${T ? '강의 운영(질문 · 채점 · 독려 · 공지)' : '교육 운영(과정 설계 · 수시 개설 · 평가 · 질문 · 학습 독려)'} ③ ${T ? '성과 · 학습관리' : '리포트 · 학습관리(현황 · 위험 학습자 · 보고서)'}.
용어: 학습자=${t('learner')}, 과정=${t('cls')}, 묶음=${t('group')}, 강사=${t('teacher')}.
일하는 방식:
1. 데이터가 필요한 질문은 먼저 조회 도구(get_overview · list_courses · list_learners_at_risk · list_open_questions)로 확인합니다. 도구 결과에 없는 숫자는 쓰지 않습니다.
2. 실행 · 생성 · 발송 · 변경이 필요한 일은 run_studio_command로 계획 카드를 만듭니다. 한 번에 한 가지 일만 담고, 여러 일이면 순서대로 여러 번 부릅니다. 카드는 사용자가 '승인하고 실행'을 눌러야 실행되므로 "보냈습니다 · 만들었습니다"라고 단정하지 말고 "승인하시면 실행됩니다"라고 말합니다.
3. 결과를 보여 줄 화면이 있으면 open_screen을 한 번 부릅니다. 처음 해 보는 일을 물으면 start_guide를 제안하거나 시작합니다.
4. 공지 · 안내문 · 요약 같은 글쓰기는 직접 씁니다(필요하면 run_studio_command로 등록 카드를 함께 만듭니다).
5. 지난 대화는 참고용입니다. 마지막 사용자 지시에만 답하고, 지난 요청 · 미완료 작업은 사용자가 다시 꺼내지 않으면 언급하지 않습니다.
최종 답변: 한국어 합니다체로 짧게. ① 확인한 사실(숫자 포함) ② 만든 계획 카드와 승인 안내 ③ 다음에 하면 좋은 일 한 가지. 목록은 '- '로, 강조는 **…**만. 학습자 이름 · 연락처는 다루지 않습니다(번호 · 소속만).`; };
const AG = { base: null };
{ const prev = chatSend; AG.base = typeof answer === 'function' ? q => answer(q) : null;
  chatSend = async q => { q = String(q || '').trim().slice(0, 800); if (!q) return; if (typeof gdSig === 'function') gdSig('chat');
    if (!(typeof CL !== 'undefined' && CL.on('chat'))) return prev(q);
    if (CUR.ws !== 'home' && !$('#drawer') && !document.body.classList.contains('mode-bld')) ACT['chat-open'] && ACT['chat-open']();
    /* v18.1 지난 대화는 직전 2왕복만 짧게(600자) 참고용으로 — 지난 요청을 새 답에 끌어오지 않게 하고 입력 토큰도 줄임 */
    const hist = S.chat.filter(m => !m.typing && (m.md || m.text) && !m.plan).slice(-4).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.md || m.text || '').slice(0, 600) }));
    S.chat.push({ role: 'user', text: q }); const ph = { role: 'ai', typing: true, via: CL.label() }; S.chat.push(ph); renderThreads();
    const msgs = []; [...hist, { role: 'user', content: q }].forEach(m => { const l = msgs[msgs.length - 1]; if (l && l.role === m.role && typeof l.content === 'string') l.content += '\n' + m.content; else msgs.push({ ...m }); }); while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const ctx = { cards: [], nav: '', after: [], used: [] }; let tok = 0, model = '', text = '';
    try {
      for (let round = 0; round < 6; round++) {
        const res = await CL.call({ system: AG_SYS(), messages: msgs, tools: AG_TOOLS, max: 1600 }); tok += (res.usage.input_tokens || 0) + (res.usage.output_tokens || 0) + (res.usage.cache_creation_input_tokens || 0); ctx.cr = (ctx.cr || 0) + (res.usage.cache_read_input_tokens || 0); model = res.model; text = res.text || text;
        if (!res.tools.length) break;
        msgs.push({ role: 'assistant', content: res.content }); const results = [];
        for (const tu of res.tools) { ctx.used.push(tu.name); ph.text = `확인 중 · ${({ get_overview: '운영 현황', list_courses: '과정 목록', list_learners_at_risk: '위험 학습자', list_open_questions: '미답변 질문', run_studio_command: '실행 계획 만들기', open_screen: '화면 열기', download_report: '보고서', start_guide: '가이드' })[tu.name] || tu.name}…`; renderThreads();
          let out; try { out = agRun(tu.name, tu.input, ctx); } catch (e) { out = { ok: false, 이유: String(e.message || e).slice(0, 120) }; }
          results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out).slice(0, 12000) }); }
        msgs.push({ role: 'user', content: results });
        if (round === 5) text = text || '요청을 여러 단계로 처리했습니다. 아래 계획 카드를 확인해 주세요.';
      }
      delete ph.typing; ph.text = ''; Object.assign(ph, { md: text || (ctx.cards.length ? '아래 계획 카드를 확인하고 승인해 주세요.' : '답변을 만들지 못했습니다. 다시 말씀해 주시겠어요?'), via: CL.label(model), tok, cached: ctx.cr || 0, tools: [...new Set(ctx.used)] });
      ctx.cards.forEach(r => S.chat.push({ role: 'ai', ...r, via: '실행 계획 · 승인 후 실행' }));
      S.ai.usage++; S.chat = S.chat.slice(-60); save(); renderThreads(); if (ctx.nav) setTimeout(() => go(ctx.nav, true), 350); ctx.after.forEach(f => setTimeout(f, 400));
    } catch (err) { const i = S.chat.indexOf(ph); if (i >= 0) S.chat.splice(i, 1); S.chat.pop(); S.chat = S.chat.filter(m => m !== ph);
      let r; try { r = AG.base(q); } catch (e) { r = { text: '처리하는 중 문제가 생겼습니다.' }; }
      S.chat.push({ role: 'user', text: q }, { role: 'ai', ...r, via: '규칙 엔진', note: `Claude 연결 실패(${err.message}) — 규칙 엔진으로 처리했습니다.` }); S.chat = S.chat.slice(-60); save(); renderThreads(); if (r.nav) setTimeout(() => go(r.nav, true), 350); }
  }; }
/* 답 아래 '확인한 데이터' 줄 */
{ const base = aiBody; aiBody = m => { let h = base(m); if (m.tools && m.tools.length) h += `<p class="agused">${ic('check', 12)} 확인 · 실행: ${m.tools.map(n => esc(({ get_overview: '운영 현황', list_courses: '과정', list_learners_at_risk: '위험 학습자', list_open_questions: '질문', run_studio_command: '계획 카드', open_screen: '화면', download_report: '보고서', start_guide: '가이드' })[n] || n)).join(' · ')}</p>`; return h; }; }
/* 연결 상태를 대화 머리 · 입력 안내에 분명하게 */
AFTER.push(() => { const on = typeof CL !== 'undefined' && CL.on('chat'); document.body.classList.toggle('ag-on', on);
  document.querySelectorAll('small.cnote').forEach(ft => { if (!on && !ft.querySelector('[data-act="ag-setup"]')) ft.insertAdjacentHTML('beforeend', `<span><button type="button" class="agl" data-act="ag-setup">Claude 연결하기 — 답이 훨씬 정확해집니다</button></span>`); }); });
ACT['ag-setup'] = () => { UI.settings = 'integr'; go('settings'); setTimeout(() => { const k = $('#clKey'); if (k) { k.scrollIntoView({ block: 'center' }); k.focus(); } }, 200); };
