/* 디디쌤 스튜디오 v25 — 화면을 아는 AI SAM(화면 맥락 카드)
   대표님(2026-11-03): '기능 화면으로 각각 넘어갈 때 AI SAM이 이를 인식하고, 해당 화면에서 AI SAM이 지원해 줄 수 있는 부분을 챗봇에서 표시해서 지원'.
   - 대화창 맨 위(시작 가이드 카드 아래 · 대화 위)에 '지금 화면: {이름} — 여기서 도와드릴 수 있는 일' + 실제로 동작하는 칩 3~5개. 접기 가능, 화면을 옮기면 바뀜.
   - 열지 않는다: 화면 이동은 카드만 바꾸고, 오른쪽 아래 버튼에는 '이 화면 도움 n' 작은 줄만 보인다(사람이 눌러야 열림).
   - 칩은 규칙 엔진(키 없이도) 처리기를 직접 실행 → 답 · 계획 카드(승인 후 실행). Claude가 연결되어 있으면 자유 질문에 화면 맥락(지금 화면 · 선택 항목 · 칩 목록)을 붙여 보내고,
     도구 run_screen_action(칩 실행) · update_course(선택 과정 기간 · 가격 · 상태 변경 계획 카드)를 쓸 수 있게 한다. '이거 마감일 바꿔줘' → 지금 보고 있는 과정.
   - 교수자(scn()==='teacher')는 강의 비서용 칩. */
'use strict';
const SCX_K = 'didisam.scx';
const scxPref = () => { try { return JSON.parse(localStorage.getItem(SCX_K) || '{}') || {}; } catch (e) { return {}; } };
const scxSetPref = p => { try { localStorage.setItem(SCX_K, JSON.stringify({ ...scxPref(), ...p })); } catch (e) { } };
const scxTeacher = () => typeof scn === 'function' && scn() === 'teacher';
const scxKey = () => !CUR ? 'home' : CUR.ws === 'home' ? 'home' : CUR.ws === 'dash' ? 'dash' : CUR.ws === 'settings' ? 'settings' : (CUR.tab || CUR.ws);
/* 선택 항목: 과정 상세 · 회원 상세 · 상담 상세 · 교재 */
function scxSel() { const k = scxKey();
  try {
    if (k === 'class' && UI.cls && C(UI.cls)) { const c = C(UI.cls); return { kind: 'cls', id: c.id, name: c.name, tab: UI.clsT || '' }; }
    if (k === 'members' && UI.mem && M(UI.mem)) { const m = M(UI.mem); return { kind: 'mem', id: m.id, name: S.org.type === 'univ' ? String(m.sid || (m.extra && m.extra.학번) || m.id) : (m.nick || m.name || m.id) }; }
    if (k === 'consult' && UI.csId) { const x = (S.consults || []).find(y => y.id === UI.csId); if (x) return { kind: 'cs', id: x.id, name: x.title || x.topic || '상담' }; }
    if (k === 'book' && UI.bkId) { const b = (S.books || []).find(y => y.id === UI.bkId); if (b) return { kind: 'book', id: b.id, name: b.name }; }
  } catch (e) { }
  return null; }
const scxLabel = k => k === 'home' ? '홈' : k === 'dash' ? '현황' : k === 'settings' ? '설정' : (MENU[k] ? mlabel(k) : k);
function scxName() { const k = scxKey(), s = scxSel(); return scxLabel(k) + (s ? ` › 「${s.name}」` : ''); }

/* ── 응답 도우미 ── */
const scxPlan = (title, text, run, o = {}) => { const pid = uid('p'); PLANS[pid] = { run, go: o.go || '' }; return { title, text, html: o.html || '', steps: o.steps, plan: pid, state: 'pending', cta: o.cta || '승인하고 실행' }; };
const scxInfo = (text, html, o = {}) => ({ text, html: html || '', ...o });
const scxTbl = (cols, rows, empty) => table(cols, rows.map(r => r.map(v => typeof v === 'number' ? String(v) : esc(String(v ?? '')))), empty || '해당하는 항목이 없습니다.');
const scxCls = () => { const s = scxSel(); return s && s.kind === 'cls' ? C(s.id) : null; };
const scxRunning = () => (S.classes || []).filter(c => c.status === '운영중');
const scxAvg = c => { const P = (c.learners || []).map(id => +((c.prog || {})[id] || {}).p || 0); return P.length ? Math.round(P.reduce((a, b) => a + b, 0) / P.length) : 0; };
const scxOff = m => { if (!m || !m.last) return 999; const d = daysAgo(m.last); return isFinite(d) ? d : 999; };
let SCX_BASE = null; /* 감싸기 전 규칙 엔진(칩이 기존 규칙에 맡길 때) */
/* 기관 용어(수업 · 소속 · 원생 · 훈련생 …)를 규칙 엔진이 못 알아듣던 문제: 이해하지 못하면 표준 용어로 한 번 더 */
const SCX_TERMS = [[/(교과목|수업|교육과정|훈련과정)/g, '강좌'], [/(소속|훈련반)/g, '그룹'], [/(원생|훈련생|임직원|학습자)/g, '수강생']];
function scxTry(fn, q) { const r = fn(q) || {}; if (!/이해하지 못했습니다/.test(r.text || '')) return r; let q2 = String(q); SCX_TERMS.forEach(([re, to]) => { q2 = q2.replace(re, to); }); if (q2 === q) return r; const r2 = fn(q2) || {}; return /이해하지 못했습니다/.test(r2.text || '') ? r : r2; }
const scxAsk = q => () => scxTry(SCX_BASE || answer, q);
function scxMsgPlan(title, body, ids, to, ch = '알림함 + 앱 푸시') {
  const n = ids.length; if (!n) return scxInfo(`${title} 대상이 지금은 없습니다.`);
  return scxPlan(`메시지 — ${to}`, `${to} ${n}명에게 아래 메시지를 보낼까요?`, () => { S.msgs = S.msgs || []; S.msgs.unshift({ id: uid('ms'), at: nowStr(), to, toIds: ids, title, body, ch, n, by: S.me.name }); S.inbox = S.inbox || {}; ids.forEach(id => { (S.inbox[id] = S.inbox[id] || []).unshift({ id: uid('ib'), at: nowStr(), title, body, read: false }); }); logAudit(`AI SAM 메시지 — ${title} · ${n}명`); return `${n}명에게 「${title}」을(를) 보냈습니다(데모 — 실제 발송은 운영 연동 후).`; }, { html: `<div class="pvmsg"><b>${esc(title)}</b><p>${esc(body)}</p></div>`, cta: `${n}명에게 보내기`, go: 'message' }); }

/* 과정 변경(선택 과정 · 이거) — 규칙 엔진과 Claude 도구가 같이 씀 */
function scxCourseChange(c, x) { if (!c) return { text: `어느 ${t('cls')}인지 찾지 못했습니다. ${t('cls')} 화면에서 하나를 연 뒤 '이거 종료일 바꿔줘'처럼 말씀해 주세요.`, nav: 'class' };
  const ch = []; const nx = {};
  const dOK = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
  if (dOK(x.end)) nx.end = x.end; else if (+x.extend_days) nx.end = addDays(c.end || today(), clamp(+x.extend_days, -365, 365));
  if (dOK(x.start)) nx.start = x.start;
  if (x.price != null && x.price !== '' && isFinite(+x.price)) nx.price = Math.max(0, Math.round(+x.price));
  if (['운영중', '준비중', '종료'].includes(x.status)) nx.status = x.status;
  if (['전체', '지정 회원', '비공개'].includes(x.open)) nx.open = x.open;
  if (nx.end && nx.end !== c.end) ch.push(`종료일 ${c.end || '—'} → ${nx.end}`);
  if (nx.start && nx.start !== c.start) ch.push(`시작일 ${c.start || '—'} → ${nx.start}`);
  if (nx.price != null && nx.price !== +c.price) ch.push(`수강료 ${(+c.price || 0).toLocaleString()}원 → ${nx.price.toLocaleString()}원`);
  if (nx.status && nx.status !== c.status) ch.push(`상태 ${c.status} → ${nx.status}`);
  if (nx.open && nx.open !== c.open) ch.push(`공개 ${c.open || '—'} → ${nx.open}`);
  if (nx.start && (nx.end || c.end) && nx.start > (nx.end || c.end)) return { text: '시작일이 종료일보다 늦습니다. 날짜를 다시 알려 주세요.' };
  if (!ch.length) return { text: `「${c.name}」에서 바꿀 값을 알려 주세요. 예: "이거 종료일 2026-12-31로 바꿔줘", "7일 연장해줘", "가격 99,000원으로 바꿔줘".` };
  return scxPlan(`「${c.name}」 변경`, `「${c.name}」을(를) 아래처럼 바꿀까요?`, () => { if (nx.end) { c.end = nx.end; if (c.period && c.period.mode === 'range') c.period.end = nx.end; }
    if (nx.start) { c.start = nx.start; if (c.period && c.period.mode === 'range') c.period.start = nx.start; }
    if (nx.price != null) c.price = nx.price; if (nx.status) c.status = nx.status; if (nx.open) c.open = nx.open;
    logAudit(`AI SAM ${t('cls')} 변경 — ${c.name}: ${ch.join(', ')}`); UI.cls = c.id; return `「${c.name}」을(를) 바꿨습니다: ${ch.join(' · ')}.`; }, { steps: ch, cta: '이대로 바꾸기', go: 'class' }); }
/* 자연어에서 날짜 · 일수 · 가격 */
function scxParse(q) { const x = {}; const d = q.match(/(\d{4})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/); const md = !d && q.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (d) x.date = `${d[1]}-${String(d[2]).padStart(2, '0')}-${String(d[3]).padStart(2, '0')}`; else if (md) x.date = `${today().slice(0, 4)}-${String(md[1]).padStart(2, '0')}-${String(md[2]).padStart(2, '0')}`;
  const e = q.match(/(\d+)\s*(일|주)\s*(연장|늘|미뤄|뒤로)/); if (e) x.days = +e[1] * (e[2] === '주' ? 7 : 1); const sh = q.match(/(\d+)\s*(일|주)\s*(단축|줄|앞당)/); if (sh) x.days = -(+sh[1] * (sh[2] === '주' ? 7 : 1));
  const p = q.match(/([\d,]+)\s*(만\s*)?원/); if (p) x.price = +p[1].replace(/,/g, '') * (p[2] ? 10000 : 1); if (/무료/.test(q)) x.price = 0;
  return x; }

/* ── 화면별 칩: [id, 라벨, 실행기] — 라벨은 그대로 대화에 남는 말 ── */
function scxDefs(k) { const L = t('learner'), K = t('cls'), G = t('group'), c = scxCls(), U = S.org.type === 'univ';
  const risk = () => { const r = agRun('list_learners_at_risk', { max_progress: 30 }, { cards: [], after: [] }); return scxInfo(`진도 30% 미만 ${L}은 ${r.인원}명(수강 ${r.건수}건)입니다.${r.인원 ? ' 독려 메시지가 필요하면 아래 [독려 메시지]를 누르세요.' : ''}`, scxTbl(['번호', G, K, '진도', '미접속'], r.목록.slice(0, 10).map(o => [o.번호, o.소속 || '—', o.과정, o.진도 + '%', isFinite(o.미접속일) ? o.미접속일 + '일' : '—'])), r.인원 ? { btn: { act: 'scx-run', v: 'm-nudge', label: '독려 메시지' } } : {}); };
  const nudge = () => { const r = agRun('list_learners_at_risk', { max_progress: 30 }, { cards: [], after: [] }); const ids = [...new Set((S.classes || []).filter(c2 => c2.status === '운영중').flatMap(c2 => (c2.learners || []).filter(id => (+((c2.prog || {})[id] || {}).p || 0) < 30)))]; return scxMsgPlan('이번 주 학습 진도 안내', `이번 주 진도가 조금 늦어지고 있습니다. 남은 영상 1개만 먼저 들어도 진도가 올라갑니다. 막히는 부분은 학습 화면의 AI 튜터에게 물어보세요.`, ids, `진도 30% 미만 ${L} ${r.인원}명`); };
  const courses = () => { const R = agRun('list_courses', {}, {}); return scxInfo(R.length ? `${K} ${R.length}개 현황입니다.` : `아직 ${K}이(가) 없습니다. [새 ${K} 만들기]로 시작하세요.`, scxTbl([K, '상태', '수강', '평균 진도', '이수', '채점 대기'], R.slice(0, 12).map(o => [o.과정, o.상태, o.수강, o.평균진도 + '%', o.이수, o.채점대기]))); };
  const ov = () => { const s = agRun('get_overview', {}, {}).지표 || {}; return scxInfo(`운영 현황입니다. ${L} ${s.learners || 0}명 · 평균 진도 ${s.avg || 0}% · ${t('done')}율 ${s.rate || 0}%.`, scxTbl(['항목', '값'], [[`${K}(운영중 / 준비중)`, `${s.running || 0} / ${s.draft || 0}`], ['채점 대기', `${s.grade || 0}건`], ['답변 안 한 질문', `${s.qs || 0}건`], ['진도 부진', `${s.slow || 0}명`], ['14일 이상 미접속', `${s.away || 0}명`], ['최근 7일 활동률', `${s.active || 0}%`]])); };
  const D = {
    dash: [['d-sum', '이번 주 운영 현황 요약', ov], ['d-week', '주간 보고서 만들어줘', scxAsk('주간 보고서 만들어줘')], ['d-risk', `진도 부진 ${L} 찾기`, risk], ['d-rep', '실적 보고서 내려받아줘', scxAsk('실적 보고서 내려받아줘')]],
    class: c ? [
      ['c-ext', `「${c.name}」 종료일 7일 연장`, () => scxCourseChange(c, { extend_days: 7 }), '종료일 7일 연장'],
      ['c-fill', `「${c.name}」 빈 항목 AI로 채우기`, () => { if (!ACT['ai-fill']) return scxInfo('이 기능을 찾지 못했습니다.'); return scxPlan(`「${c.name}」 빈 항목 채우기`, `「${c.name}」 커리큘럼의 빈 영상 · 퀴즈 · 과제 · 강의자료를 AI 초안으로 채울까요?`, () => { ACT['ai-fill']({ dataset: { v: c.id } }); UI.cls = c.id; UI.clsT = c.kind === 'episode' ? 'episodes' : 'curriculum'; logAudit(`AI SAM 빈 항목 채우기 — ${c.name}`); return `「${c.name}」 빈 항목을 채웠습니다. 커리큘럼에서 확인하세요.`; }, { cta: '빈 항목 채우기', go: 'class' }); }, '빈 항목 AI로 채우기'],
      ['c-prog', `「${c.name}」 ${L} 진도 요약`, () => { const ids = c.learners || []; const P = ids.map(id => +((c.prog || {})[id] || {}).p || 0); const thr = (c.criteria && c.criteria.threshold) || 80; return scxInfo(ids.length ? `「${c.name}」 ${L} ${ids.length}명 · 평균 진도 ${scxAvg(c)}% · ${t('done')} 기준(${thr}%) 충족 ${P.filter(p => p >= thr).length}명 · 30% 미만 ${P.filter(p => p < 30).length}명입니다.` : `「${c.name}」에 아직 ${L}이(가) 없습니다. 등록 · 초대 화면에서 수강 등록하세요.`, ids.length ? scxTbl(['구간', '인원'], [['0~29%', P.filter(p => p < 30).length], ['30~59%', P.filter(p => p >= 30 && p < 60).length], ['60~79%', P.filter(p => p >= 60 && p < 80).length], ['80% 이상', P.filter(p => p >= 80).length]]) : '', ids.length ? {} : { go: 'enroll' }); }, `${L} 진도 요약`],
      ['c-notice', `「${c.name}」 안내 공지 쓰기`, () => { const ttl = `${c.name} 학습 안내`; const body = `${c.name}은(는) ${c.start || today()}부터 ${c.end || ''}까지 진행됩니다. 이번 주 학습 항목을 마치고, 궁금한 점은 AI 튜터나 질문 게시판에 남겨 주세요.`; return scxPlan('공지', `「${ttl}」 공지를 이 ${K}에 올릴까요?`, () => { (c.notices = c.notices || []).unshift({ id: uid('n'), title: ttl, body, at: today(), pin: true }); logAudit(`공지 — ${ttl}`); UI.cls = c.id; UI.clsT = 'notice'; return `「${ttl}」 공지를 올렸습니다.`; }, { html: `<div class="pvmsg"><b>${esc(ttl)}</b><p>${esc(body)}</p></div>`, cta: '공지 올리기', go: 'class' }); }, '안내 공지 쓰기']]
      : [['c-new', `새 ${K} 만들어줘`, scxAsk(`새 ${K} 만들어줘`)], ['c-list', `${K}별 현황 요약`, courses],
        ['c-open', `준비 중인 ${K} 개설`, () => { const L2 = (S.classes || []).filter(x => x.status === '준비중'); if (!L2.length) return scxInfo(`준비 중인 ${K}이(가) 없습니다.`); return scxPlan(`${K} 개설`, `준비 중인 ${K} ${L2.length}개를 운영중 · 전체 공개로 바꿀까요?`, () => { L2.forEach(x => { x.status = '운영중'; if (x.open === '비공개') x.open = '전체'; }); logAudit(`AI SAM ${K} 개설 ${L2.length}개`); return `${L2.length}개 ${K}을(를) 개설했습니다.`; }, { steps: L2.map(x => x.name), cta: `${L2.length}개 개설하기`, go: 'class' }); }],
        ['c-risk', `진도 부진 ${L} 독려`, nudge]],
    assess: [['a-grade', '채점 대기 과제 AI로 1차 채점해줘', scxAsk('채점 대기 과제 AI로 1차 채점해줘')], ['a-rub', '보고서 과제 루브릭 만들어줘', scxAsk('보고서 과제 루브릭 만들어줘')],
      ['a-sum', '평가 현황 요약', () => { const R = (S.classes || []).map(x => { const it = x.curriculum || []; const ids = x.learners || []; return [x.name, it.filter(i => i.type === 'exam' || i.type === 'quiz').length, it.filter(i => i.type === 'assign').length, ids.filter(id => ((x.prog || {})[id] || {}).assign === 'submitted').length]; }).filter(r => r[1] || r[2]); return scxInfo(R.length ? `평가가 있는 ${K} ${R.length}개입니다. 채점 대기 합계 ${R.reduce((a, r) => a + r[3], 0)}건.` : `아직 시험 · 과제가 있는 ${K}이(가) 없습니다.`, scxTbl([K, '시험 · 퀴즈', '과제', '채점 대기'], R)); }]],
    attend: [['t-sum', '출결 현황 요약', () => { const R = (S.classes || []).filter(x => x.att && Object.keys(x.att).length).map(x => { let n = 0, ok = 0, ab = 0; Object.values(x.att).forEach(o => Object.values(o || {}).forEach(v => { n++; if (v === '출석' || v === '지각') ok++; if (v === '결석') ab++; })); return [x.name, n, n ? Math.round(ok / n * 100) + '%' : '—', ab]; }); return scxInfo(R.length ? `출결 기록이 있는 ${K} ${R.length}개입니다.` : '아직 출결 기록이 없습니다. 회차를 열고 출석을 체크하거나 출결패드를 쓰세요.', scxTbl([K, '기록', '출석률', '결석'], R)); }],
      ['t-abs', `결석 ${L} 출결 알림 보내기`, () => { const ids = new Set(); (S.classes || []).forEach(x => { const keys = Object.keys(x.att || {}); const last = keys[keys.length - 1]; if (last) Object.entries(x.att[last] || {}).forEach(([m, v]) => { if (v === '결석') ids.add(m); }); }); return scxMsgPlan('결석 안내', '최근 회차에 결석으로 기록되었습니다. 보강 영상과 자료를 확인하시고, 사유가 있으면 답장으로 알려 주세요.', [...ids], `최근 회차 결석 ${L}`, '알림톡(자동) + 알림함'); }],
      ['t-pad', '출결패드 여는 방법', () => scxInfo('강의실 태블릿에서 출결패드를 열면 학습자가 직접 출석을 체크합니다. 아래 주소를 태블릿 브라우저로 여세요.', `<p><code>${esc(location.href.split('#')[0].split('?')[0])}?kiosk=pad</code></p>`)]],
    library: [['l-vid', 'AI 활용 기초 AI 강의 영상 만들어줘', scxAsk('AI 활용 기초 AI 강의 영상 만들어줘')],
      ['l-conv', '영상 변환 상태 확인', () => { const V = (S.lib || []).filter(l => l.kind === '동영상'); const by = {}; V.forEach(l => { const s = (typeof a2ConvOf === 'function' && a2ConvOf(l)) || l.conv || '완료'; by[s] = (by[s] || 0) + 1; }); return scxInfo(V.length ? `영상 ${V.length}개의 변환 상태입니다.` : '아직 올린 영상이 없습니다.', scxTbl(['상태', '개수'], Object.entries(by))); }],
      ['l-unused', '안 쓰는 자료 찾기', () => { const X = (S.lib || []).filter(l => !(l.cls || []).length && l.kind !== '평가'); return scxInfo(X.length ? `어느 ${K}에도 연결되지 않은 자료 ${X.length}개입니다.` : `모든 자료가 ${K}에 연결되어 있습니다.`, scxTbl(['이름', '종류'], X.slice(0, 10).map(l => [l.name || l.title, l.kind]))); }]],
    cert: [['ce-issue', `수료 기준 충족자 수료증 일괄 발급`, () => { const W = []; (S.classes || []).forEach(x => (x.learners || []).forEach(id => { const done = typeof a2IsDone === 'function' ? a2IsDone(x, id) : (+((x.prog || {})[id] || {}).p || 0) >= ((x.criteria && x.criteria.threshold) || 80); if (done && !(S.certs || []).some(q => q.cls === x.id && q.who === id)) W.push([x, id]); }));
        if (!W.length) return scxInfo(`수료 기준을 채우고 아직 수료증이 없는 ${L}이(가) 없습니다.`); return scxPlan('수료증 일괄 발급', `수료 기준을 채운 ${W.length}건에 수료증을 발급할까요?`, () => { let n = 0; W.forEach(([x, id]) => { if (typeof a2AutoCert === 'function' && a2AutoCert(x, id)) n++; else if (!(S.certs || []).some(q => q.cls === x.id && q.who === id)) { S.certs.unshift({ id: uid('ct'), cls: x.id, who: id, at: today(), no: typeof a2NextNo === 'function' ? a2NextNo() : uid('no'), dl: false, manual: true }); n++; } }); logAudit(`AI SAM 수료증 일괄 발급 ${n}건`); return `수료증 ${n}건을 발급했습니다.`; }, { steps: [...new Set(W.map(w => w[0].name))].map(n => `${n} — ${W.filter(w => w[0].name === n).length}건`), cta: `${W.length}건 발급하기`, go: 'cert' }); }],
      ['ce-sum', `${t('done')} 현황 요약`, () => { const R = (S.classes || []).map(x => { const thr = (x.criteria && x.criteria.threshold) || 80; const ids = x.learners || []; return [x.name, ids.length, ids.filter(id => (+((x.prog || {})[id] || {}).p || 0) >= thr).length, (S.certs || []).filter(q => q.cls === x.id).length]; }); return scxInfo(`${K}별 ${t('done')} 현황입니다.`, scxTbl([K, '수강', `기준 충족`, '발급'], R)); }]],
    book: [['b-make', 'AI 활용 기초 교재 만들어줘', scxAsk('AI 활용 기초 교재 만들어줘')],
      ['b-ship', '배송 대기 교재 정리', () => { const R = []; (S.books || []).forEach(b => (b.ship || []).filter(s => !s.done).forEach(s => R.push([b.name, (M(s.who) || {}).nick || (M(s.who) || {}).name || s.who, s.memo || '']))); return scxInfo(R.length ? `배송 대기 ${R.length}건입니다.` : '배송 대기 교재가 없습니다.', scxTbl(['교재', '받는 분', '요청'], R.slice(0, 12))); }],
      ['b-sale', '교재 판매 현황', () => { const R = (S.books || []).map(b => [b.name, b.kind || '', (+b.price || 0).toLocaleString() + '원', (b.grants || []).length || b.sold || 0]); return scxInfo(R.length ? `교재 ${R.length}종입니다.` : '등록된 교재가 없습니다.', scxTbl(['교재', '종류', '가격', '판매'], R)); }]],
    badge: [['bd-make', '수료 배지 만들어줘', scxAsk('수료 배지 만들어줘')], ['bd-sum', '배지 발급 현황 알려줘', scxAsk('배지 발급 현황 알려줘')]],
    journey: [['j-make', '진단 결과별 러닝 저니 설계해줘', scxAsk('진단 결과별 러닝 저니 설계해줘')], ['j-sum', '러닝 저니 현황', () => { const J = S.journey || []; return scxInfo(J.length ? `러닝 저니 ${J.length}개 단계입니다.` : '아직 러닝 저니가 없습니다. [러닝 저니 설계]를 눌러 시작하세요.', scxTbl(['단계', `${K}`], J.slice(0, 10).map(j => [j.name || j.title || j.id, (j.cls || []).length]))); }]],
    diag: [['g-make', 'AI 활용 수준 진단 만들어줘', scxAsk('AI 활용 수준 진단 만들어줘')], ['g-nudge', 'AI 진단 안 한 학생에게 안내 보내줘', scxAsk('AI 진단 안 한 학생에게 안내 보내줘')],
      ['g-sum', '진단 참여 현황', () => { const n = (S.members || []).length, d = (S.members || []).filter(m => m.diag).length; return scxInfo(`${L} ${n}명 중 ${d}명이 진단을 마쳤습니다(${n ? Math.round(d / n * 100) : 0}%).`); }]],
    calendar: [['cal-week', '이번 주 일정 알려줘', () => { const to = addDays(today(), 7), R = []; (S.classes || []).forEach(x => { (x.sessions || []).filter(s => s.date >= today() && s.date <= to).forEach(s => R.push([s.date, x.name, s.title || `${s.n || ''}회차`])); (x.curriculum || []).forEach(it => { const d = String((it.rules && it.rules.due) || it.to || '').slice(0, 10); if (d && d >= today() && d <= to) R.push([d, x.name, `${it.title} 마감`]); }); }); R.sort((a, b) => a[0].localeCompare(b[0])); return scxInfo(R.length ? `앞으로 7일 일정 ${R.length}건입니다.` : '앞으로 7일 동안 수업 · 마감 일정이 없습니다.', scxTbl(['날짜', K, '일정'], R.slice(0, 12))); }],
      ['cal-coach', '학습 코칭 알림 켜줘', () => { const cal = typeof CAL === 'function' ? CAL() : null; if (!cal) return scxInfo('캘린더 설정을 찾지 못했습니다.'); if (cal.coach.on) return scxInfo(`학습 코칭 알림이 이미 켜져 있습니다(마감 ${cal.coach.before.join(' · ')}일 전, 방해 금지 ${cal.coach.quiet}).`); return scxPlan('학습 코칭 알림', '마감 3 · 1 · 0일 전에 AI 튜터가 학습자에게 코칭 알림을 보내도록 켤까요?', () => { cal.coach.on = true; logAudit('학습 코칭 알림 켜기'); return '학습 코칭 알림을 켰습니다.'; }, { cta: '켜기', go: 'calendar' }); }],
      ['cal-g', 'Google 캘린더 연결 도와줘', scxAsk('Google 연결 도와줘')]],
    dbook: [['db-new', '디지털북 만들어줘', scxAsk('AI 활용 기초 교재 만들어줘')], ['db-list', '디지털북 현황', () => { const B = typeof bkL === 'function' ? bkL() : []; return scxInfo(B.length ? `디지털북 ${B.length}권입니다.` : '아직 디지털북이 없습니다.', scxTbl(['제목', '상태'], B.slice(0, 10).map(b => [b.title || b.name, b.status || b.st || '']))); }]],
    tutorial: [['tu-how', '따라 하기 영상 만드는 법', () => scxInfo('따라 하기 영상은 짧은 영상 + 3단계 실습으로 만듭니다.', '', { steps: ['[+ 새로 만들기]를 누릅니다', '영상 주소(YouTube) 또는 파일을 넣습니다', '따라 할 단계 3개를 적고 저장합니다', `${K} 커리큘럼에 넣어 ${L}에게 보여 줍니다`] })], ['tu-vid', 'AI 강의 영상 만들어줘', scxAsk('AI 활용 기초 AI 강의 영상 만들어줘')]],
    members: [['m-risk', `진도 30% 미만 ${L} 찾기`, risk], ['m-away', `14일 미접속 ${L}에게 안내 보내줘`, scxAsk(`14일 미접속 ${L}에게 안내 보내줘`)],
      ['m-appr', `승인 대기 ${L} 승인`, () => { const W = (S.members || []).filter(m => m.grade === '승인 대기'); if (!W.length) return scxInfo(`승인 대기 ${L}이(가) 없습니다.`); return scxPlan(`가입 승인`, `승인 대기 ${W.length}명을 정회원으로 승인할까요?`, () => { const n = typeof mbApprove === 'function' ? mbApprove(W.map(m => m.id)) : (W.forEach(m => { m.grade = '정회원'; }), W.length); logAudit(`AI SAM 가입 승인 ${W.length}명`); return `${W.length}명을 승인했습니다.`; }, { cta: `${W.length}명 승인`, go: 'members' }); }],
      ...(S.groups && S.groups.length ? [['m-join', `${G}별 가입률 알려줘`, scxAsk(`${G}별 가입률 알려줘`)]] : [])],
    enroll: [['e-link', '초대 링크 만들기', () => { if (typeof mbInvite !== 'function') return scxInfo('초대 기능을 찾지 못했습니다.'); const iv = mbInvite('student', '', ''); const url = mbInvURL(iv); save(); return { text: `${L} 초대 링크입니다. 복사해 문자 · 카카오톡 · 메일로 보내면 승인 없이 바로 가입합니다.`, html: `<p><code>${esc(url)}</code></p>`, copy: url }; }],
      ['e-demo', `연습용 ${L} 10명 등록`, () => { const ctx = { cards: [], after: [] }; const r = agRun('add_learners', { count: 10 }, ctx); return ctx.cards[0] || scxInfo(r.이유 || '등록 계획을 만들지 못했습니다.'); }],
      ['e-enr', `${K}에 ${L} 수강 등록`, () => { const k = (scxRunning()[0] || (S.classes || [])[0]); if (!k) return scxInfo(`먼저 ${K}을(를) 만들어 주세요.`, '', { go: 'class' }); if (!(S.members || []).length) return scxInfo(`먼저 ${L}을(를) 등록해 주세요(초대 링크 · CSV · 연습용 명단).`); const ctx = { cards: [], after: [] }; const r = agRun('enroll_learners', { course: k.name }, ctx); return ctx.cards[0] || scxInfo(r.이유 || r.안내 || `「${k.name}」 수강 등록 계획을 만들지 못했습니다.`); }],
      ['e-csv', 'CSV로 일괄 등록하는 법', () => scxInfo(`명단 파일(CSV)로 ${L}을(를) 한 번에 등록합니다.`, '', { steps: ['이 화면의 [일괄 등록(CSV)]을 누릅니다', '양식을 내려받아 ' + (U ? '학번 · 학과' : '이름 · 이메일 · 휴대폰') + '을 채웁니다', '파일을 올리고 미리보기에서 오류를 확인합니다', '[등록]을 누르면 초대 안내까지 보낼 수 있습니다'] })]],
    groups: [['gr-new', `새 ${G} 만들어줘`, scxAsk(`새 ${G} 만들어줘`)], ['gr-join', `${G}별 가입률 알려줘`, scxAsk(`${G}별 가입률 알려줘`)]],
    parents: [['p-appr', '연결 요청 보호자 승인', () => { const W = (S.parents || []).filter(p => p.status === '연결 요청'); if (!W.length) return scxInfo('연결 요청 중인 보호자가 없습니다.'); return scxPlan('보호자 연결 승인', `연결 요청 ${W.length}건을 승인할까요?`, () => { W.forEach(p => { p.status = '연결 완료'; }); logAudit(`보호자 연결 승인 ${W.length}건`); return `${W.length}건을 연결했습니다.`; }, { cta: `${W.length}건 승인`, go: 'parents' }); }],
      ['p-sum', '보호자 연결 현황', () => { const P = S.parents || []; const by = {}; P.forEach(p => { by[p.status] = (by[p.status] || 0) + 1; }); return scxInfo(P.length ? `보호자 ${P.length}명입니다.` : '연결된 보호자가 없습니다. 초대 링크(보호자용)로 연결하세요.', scxTbl(['상태', '인원'], Object.entries(by))); }]],
    admins: [['ad-inv', `${t('teacher')} 초대 링크 만들기`, () => { if (typeof mbInvite !== 'function') return scxInfo('초대 기능을 찾지 못했습니다.'); const iv = mbInvite('admin', '', 'teacher'); const url = mbInvURL(iv); save(); return { text: `${t('teacher')} 초대 링크입니다. 받는 분이 열어 가입하면 ${t('teacher')} 권한으로 들어옵니다.`, html: `<p><code>${esc(url)}</code></p>`, copy: url }; }],
      ['ad-log', '최근 운영 기록 요약', () => { const A = (S.audit || []).slice(0, 8); return scxInfo(A.length ? `최근 운영 기록 ${A.length}건입니다.` : '운영 기록이 없습니다.', scxTbl(['시각', '누가', '무엇을'], A.map(a => [a.at, a.who, a.what]))); }]],
    board: [['n-write', '이번 달 운영 공지 써줘', scxAsk('이번 달 운영 공지 써줘')], ['n-list', '최근 공지 확인', () => { const N = [...(S.notices || []).map(n => [n.at || '', '전체', n.title]), ...(S.classes || []).flatMap(x => (x.notices || []).map(n => [n.at || '', x.name, n.title]))].sort((a, b) => String(b[0]).localeCompare(String(a[0]))); return scxInfo(N.length ? `최근 공지 ${Math.min(8, N.length)}건입니다.` : '아직 공지가 없습니다.', scxTbl(['날짜', '대상', '제목'], N.slice(0, 8))); }]],
    message: [['ms-all', `전체 ${L}에게 학습 안내 메시지 보내줘`, () => scxMsgPlan('이번 주 학습 안내', `안녕하세요, ${S.org.name}입니다. 이번 주 학습 일정을 확인하시고 남은 항목을 마쳐 주세요. 궁금한 점은 AI 튜터에게 물어보세요.`, (S.members || []).filter(m => m.grade !== '거절').map(m => m.id), `전체 ${L}`)],
      ['ms-nudge', `진도 부진 ${L} 독려`, nudge], ['ms-away', `14일 미접속 ${L}에게 안내 보내줘`, scxAsk(`14일 미접속 ${L}에게 안내 보내줘`)],
      ['ms-log', '발송 내역 요약', () => { const X = (S.msgs || []).slice(0, 8); return scxInfo(X.length ? `최근 발송 ${X.length}건입니다.` : '발송 내역이 없습니다.', scxTbl(['시각', '대상', '제목', '인원'], X.map(m => [m.at, m.to || '', m.title || '', m.n || (m.toIds || []).length]))); }]],
    community: [['cm-ans', '미답변 질문 답변 초안 만들어줘', scxAsk('미답변 질문 답변 초안 만들어줘')], ['cm-q', '답변 안 한 질문 보기', () => { const r = agRun('list_open_questions', {}, {}); return scxInfo(r.건수 ? `답변 안 한 질문 ${r.건수}건입니다.` : '답변을 기다리는 질문이 없습니다.', scxTbl(['출처', '질문'], r.목록.slice(0, 10).map(o => [o.출처, o.질문]))); }],
      ['cm-hot', '인기 글 요약', () => { const P = [...(S.posts || [])].sort((a, b) => ((b.likes || []).length + (b.replies || []).length) - ((a.likes || []).length + (a.replies || []).length)).slice(0, 5); return scxInfo(P.length ? '반응이 많은 글입니다.' : '아직 게시글이 없습니다.', scxTbl(['제목', '좋아요', '댓글'], P.map(p => [p.title, (p.likes || []).length, (p.replies || []).length]))); }]],
    consult: [['cs-sum', '상담 기록 요약', () => { const X = S.consults || []; const by = {}; X.forEach(x => { const k2 = x.status || '기록'; by[k2] = (by[k2] || 0) + 1; }); const todo = X.filter(x => x.todo && String(x.todo).trim()).length; return scxInfo(X.length ? `상담 ${X.length}건입니다. 후속 할 일이 있는 상담 ${todo}건.` : '아직 상담 기록이 없습니다. [+ 상담 기록]이나 녹음 올리기로 시작하세요.', scxTbl(['상태', '건수'], Object.entries(by))); }],
      ['cs-ct', '채널톡 연결 도와줘', scxAsk('채널톡 연결 도와줘')]],
    site: [['s-ai', 'AI로 홈페이지 만들어줘', scxAsk('AI로 홈페이지 만들어줘')], ['s-pub', '사이트 게시해줘', scxAsk('사이트 게시해줘')], ['s-menu', '홈페이지 메뉴 AI로 짜줘', scxAsk('홈페이지 메뉴 AI로 짜줘')]],
    sales: [['sl-sum', '이번 달 매출 요약', () => { const mo = today().slice(0, 7); const P = (S.pays || []).filter(p => String(p.at || '').slice(0, 7) === mo); const ok = P.filter(p => /결제 완료|부분 환불/.test(p.status)); const sum = ok.reduce((a, p) => a + (+p.amount || 0), 0); const rf = P.filter(p => /환불/.test(p.status)).length; return scxInfo(`${mo} 결제 ${ok.length}건 · 매출 ${sum.toLocaleString()}원 · 환불 관련 ${rf}건입니다.`, scxTbl(['항목', '값'], [['결제 완료', ok.length + '건'], ['매출', sum.toLocaleString() + '원'], ['환불 신청 · 완료', rf + '건'], ['결제 대기(가상계좌)', P.filter(p => p.status === '결제 대기').length + '건']])); }],
      ['sl-ref', '환불 신청 확인해줘', () => { const X = (S.pays || []).filter(p => p.status === '환불 신청'); return scxInfo(X.length ? `처리할 환불 신청 ${X.length}건입니다. 매출 화면에서 승인 · 거절하세요.` : '처리할 환불 신청이 없습니다.', scxTbl(['신청일', '항목', '금액', '사유'], X.slice(0, 10).map(p => [(p.refund && p.refund.at) || p.at, p.item, (+p.amount || 0).toLocaleString() + '원', (p.refund && p.refund.reason) || '']))); }],
      ['sl-toss', '토스페이먼츠 연결 도와줘', scxAsk('토스페이먼츠 연결 도와줘')]],
    billing: [['bi-due', '미납 청구서 안내 보내줘', scxAsk('미납 청구서 안내 보내줘')], ['bi-sum', '청구서 현황 요약', () => { const B = S.bills || []; const by = {}; B.forEach(b => { by[b.status || '미납'] = (by[b.status || '미납'] || 0) + 1; }); return scxInfo(B.length ? `청구서 ${B.length}건입니다.` : '보낸 청구서가 없습니다.', scxTbl(['상태', '건수'], Object.entries(by))); }]],
    compliance: [['co-due', '법정교육 미이수자에게 마감 안내 보내줘', scxAsk('법정교육 미이수자에게 마감 안내 보내줘')], ['co-sum', '법정교육 이수 현황', () => { const R = (S.classes || []).filter(x => x.legal).map(x => { const thr = (x.criteria && x.criteria.threshold) || 80; const ids = x.learners || []; const d = ids.filter(id => (+((x.prog || {})[id] || {}).p || 0) >= thr).length; return [x.name, ids.length, d, ids.length ? Math.round(d / ids.length * 100) + '%' : '—', x.end || '']; }); return scxInfo(R.length ? `법정의무교육 ${R.length}개 과정입니다.` : '법정의무교육으로 표시된 과정이 없습니다.', scxTbl(['과정', '대상', '이수', '이수율', '마감'], R)); }], ['co-rep', '실적 보고서 내려받아줘', scxAsk('실적 보고서 내려받아줘')]],
    academic: [['ac-rep', '실적 보고서 내려받아줘', scxAsk('실적 보고서 내려받아줘')], ['ac-sum', `${K}별 현황 요약`, courses]],
    lifelong: [['ll-rep', '실적 보고서 내려받아줘', scxAsk('실적 보고서 내려받아줘')], ['ll-ref', '환불 신청 확인해줘', () => { const X = (S.pays || []).filter(p => p.status === '환불 신청'); return scxInfo(X.length ? `학습비 반환 신청 ${X.length}건입니다.` : '처리할 학습비 반환 신청이 없습니다.'); }], ['ll-sum', `${K}별 현황 요약`, courses]],
    hrd: [['h-rep', '실적 보고서 내려받아줘', scxAsk('실적 보고서 내려받아줘')], ['h-sum', `${K}별 현황 요약`, courses], ['h-risk', `출석 · 진도 부진 ${L} 찾기`, risk]],
    org: [['o-sum', '협력 기관 현황 요약', () => { const O = S.orgs || []; return scxInfo(O.length ? `협력 기관 ${O.length}곳입니다.` : '등록된 협력 기관이 없습니다. [+ 기관 추가]로 시작하세요.', scxTbl(['기관', '교육 신청', '담당자'], O.slice(0, 10).map(o => [o.name, (o.entries || []).length, o.mgrId ? '지정' : '—']))); }], ['o-rep', '실적 보고서 내려받아줘', scxAsk('실적 보고서 내려받아줘')]],
    auto: [['au-week', '매주 금요일 주간 보고서 보내는 자동화 만들어줘', scxAsk('매주 금요일 주간 보고서 보내는 자동화 만들어줘')], ['au-slack', '신규 가입하면 Slack 알림 자동화 만들어줘', () => { if (typeof cnAutoPlan !== 'function') return scxAsk('신규 가입하면 Slack 알림 보내는 자동화 만들어줘')(); let out = null; const r = cnAutoPlan({ template: 'join-notify' }, (card, run) => { const pid = uid('p'); PLANS[pid] = { run, go: 'auto' }; out = { ...card, plan: pid, state: 'pending' }; }); return out || scxInfo((r && (r.이유 || r.안내)) || '자동화 계획을 만들지 못했습니다.'); }],
      ['au-list', '켜진 자동화 확인', () => { const A = S.autos || []; return scxInfo(A.length ? `자동화 ${A.length}개 중 ${A.filter(a => a.on).length}개가 켜져 있습니다.` : '아직 자동화가 없습니다.', scxTbl(['이름', '상태', '실행'], A.slice(0, 10).map(a => [a.name || a.title || a.id, a.on ? '켜짐' : '꺼짐', a.runs || 0]))); }]],
    docs: [['dc-guide', '수강 안내문 만들어줘', scxAsk('수강 안내문 만들어줘')], ['dc-rep', '교육 결과 보고서 만들어줘', scxAsk('교육 결과 보고서 만들어줘')]],
    conn: [['cn-claude', 'Claude 연결 도와줘', scxAsk('Claude 연결 도와줘')], ['cn-slack', 'Slack 연결 도와줘', scxAsk('Slack 연결 도와줘')], ['cn-google', 'Google 연결 도와줘', scxAsk('Google 연결 도와줘')]],
    settings: [['st-claude', 'Claude 연결 도와줘', scxAsk('Claude 연결 도와줘')], ['st-menu', '메뉴 켜고 끄는 법', () => scxInfo('설정 › 메뉴 구성에서 탭마다 스위치로 켜고 끕니다. 끈 메뉴의 데이터는 그대로 남습니다.', '', { steps: ['설정 화면 위의 [메뉴 구성]을 엽니다', '쓰지 않을 탭의 스위치를 끕니다', '바로 왼쪽 메뉴에 반영됩니다'] })], ['st-sum', '이번 주 운영 현황 요약', ov]]
  };
  /* 교수자 화면: 내 강의 중심 */
  if (scxTeacher()) { const tq = q => scxAsk(q);
    const T = { class: c ? [['tc-fill', `「${c.name}」 빈 항목 AI로 채워줘`, tq(`「${c.name}」 빈 항목 AI로 채워줘`), '빈 항목 AI로 채우기'], ['tc-notice', `「${c.name}」 공지 써줘`, tq(`「${c.name}」 공지 써줘`), '공지 쓰기'], ['tc-rep', `「${c.name}」 성과 리포트 정리해줘`, tq(`「${c.name}」 성과 리포트 정리해줘`), '성과 리포트'], D.class[2]]
        : [['tc-new', `새 ${K} 설계해줘`, tq(`새 ${K} 설계해줘`)], ['tc-grade', '채점 대기 과제 채점 초안 만들어줘', tq('채점 대기 과제 채점 초안 만들어줘')], ['tc-qa', `${L} 질문 답변 초안 만들어줘`, tq(`${L} 질문 답변 초안 만들어줘`)], ['tc-nudge', `진도 미달 ${L} 독려해줘`, tq(`진도 미달 ${L} 독려해줘`)]],
      assess: [['tc-grade', '채점 대기 과제 채점 초안 만들어줘', tq('채점 대기 과제 채점 초안 만들어줘')], ['a-rub', '보고서 과제 루브릭 만들어줘', scxAsk('보고서 과제 루브릭 만들어줘')], D.assess[2]],
      members: [['tc-nudge', `진도 미달 ${L} 독려해줘`, tq(`진도 미달 ${L} 독려해줘`)], D.members[0]],
      community: [['tc-qa', `${L} 질문 답변 초안 만들어줘`, tq(`${L} 질문 답변 초안 만들어줘`)], D.community[1]],
      message: [['tc-nudge', `진도 미달 ${L} 독려해줘`, tq(`진도 미달 ${L} 독려해줘`)], D.message[3]],
      board: [['tc-notice2', `${K} 공지 써줘`, tq(`${K} 공지 써줘`)], D.board[1]],
      dash: [['tc-today', '오늘 할 일 알려줘', tq('오늘 할 일 알려줘')], ['tc-grade', '채점 대기 과제 채점 초안 만들어줘', tq('채점 대기 과제 채점 초안 만들어줘')], ['tc-qa', `${L} 질문 답변 초안 만들어줘`, tq(`${L} 질문 답변 초안 만들어줘`)]] };
    if (T[k]) return T[k]; }
  return D[k] || []; }
const scxChips = (k = scxKey()) => { try { return scxDefs(k).slice(0, 5).map(([id, l, run, sh]) => ({ id, l, run, sh: sh || l })); } catch (e) { console.warn('scx', e); return []; } };
window.scxChips = scxChips; window.scxKey = scxKey; window.scxSel = scxSel; window.scxName = scxName;

/* ── 칩 실행: 사람이 누른 말 그대로 대화에 남기고, 처리기를 바로 실행(키 없이도 동작 · 계획은 승인 후) ── */
function scxRun(id) { const ch = scxChips().find(x => x.id === id); if (!ch) return false;
  if (typeof gdSig === 'function') try { gdSig('chat'); } catch (e) { }
  UI.obc = true; /* 말을 보낸 것과 같이 시작 가이드 카드는 접어 대화를 보이게 */
  S.chat.push({ role: 'user', text: ch.l }); const ph = { role: 'ai', typing: true }; S.chat.push(ph); renderThreads();
  setTimeout(() => { let r; try { r = ch.run() || {}; } catch (e) { console.error(e); r = { text: '처리하는 중 문제가 생겼습니다. 다르게 말씀해 주시겠어요?' }; }
    if (!r.text && !r.html && !r.plan && !r.steps) r.text = '처리했습니다.';
    delete ph.typing; Object.assign(ph, r, { via: r.via || `화면 도움 · ${scxLabel(scxKey())}` }); S.ai.usage++; S.chat = S.chat.slice(-60); save(); renderThreads();
    if (r.nav) setTimeout(() => go(r.nav, true), 350); }, 260);
  return true; }
ACT['scx-run'] = el => { scxRun(el.dataset.v); };
/* 낮은 화면(세로 760 이하)에서는 시작 가이드 카드와 이 화면 카드 중 하나만 펼친다(입력창 · 대화가 보이게) */
const scxLow = () => innerHeight <= 760;
const scxObOpen = () => { try { return !!(typeof obHTML === 'function' && obHTML() && !UI.obc); } catch (e) { return false; } };
const scxOffNow = () => !!scxPref().off || (scxLow() && scxObOpen() && !UI.scxOpen);
ACT['scx-tog'] = () => { if (!scxPref().off && scxOffNow()) { UI.scxOpen = true; UI.obc = true; try { obMount(); } catch (e) { } scxMount(); return; } scxSetPref({ off: !scxOffNow() }); if (!scxOffNow() && scxLow()) { UI.scxOpen = true; UI.obc = true; try { obMount(); } catch (e) { } } scxMount(); };
{ const b = ACT['ob-tog']; if (b) ACT['ob-tog'] = el => { b(el); if (!UI.obc) UI.scxOpen = false; scxMount(); }; }
addEventListener('resize', () => { try { scxMount(); } catch (e) { } });

/* ── 대화창 카드 ── */
function scxHTML() { if (!S || !S.org) return ''; const k = scxKey(); if (k === 'home') return ''; const L = scxChips(k); if (!L.length) return '';
  const off = scxOffNow();
  return `<div class="scx ${off ? 'off' : ''}" data-k="${esc(k)}" role="region" aria-label="이 화면에서 AI SAM이 도와드릴 수 있는 일"><button type="button" class="scxh" data-act="scx-tog" aria-expanded="${!off}"><span class="scxi">${ic('spark', 13)}</span><span class="scxt"><b>지금 화면: ${esc(scxName())}</b><small>여기서 도와드릴 수 있는 일 ${L.length}</small></span><span class="scxv" aria-hidden="true">${ic('down', 14)}</span></button>${off ? '' : `<div class="scxc">${L.map(x => `<button type="button" class="chip scxchip" data-act="scx-run" data-v="${esc(x.id)}" title="${esc(x.l)}">${esc(x.sh)}</button>`).join('')}</div>`}</div>`; }
function scxMount() { const html = scxHTML();
  document.querySelectorAll('.bchat, #drawer').forEach(p => { const o = p.querySelector('.scx'); if (!html) { o && o.remove(); return; } if (o) { if (o.outerHTML !== html) o.outerHTML = html; return; } const th = p.querySelector('.thread'); th && th.insertAdjacentHTML('beforebegin', html); }); }
{ const base = renderThreads; renderThreads = (...a) => { const r = base(...a); scxMount(); return r; }; }
AFTER.push(() => scxMount());
{ const base = ACT['chat-open']; if (base) ACT['chat-open'] = el => { base(el); scxMount(); }; }

/* ── 떠 있는 버튼: 열지 않고 '이 화면 도움 n'만 ── */
if (typeof fabSync === 'function') { const base = fabSync; fabSync = (...a) => { const r = base(...a); try { const b = $('#fabBtn'); if (b && !document.body.classList.contains('fab-open') && !b.querySelector('.fabn')) { const k = scxKey(); const n = k === 'home' ? 0 : scxChips(k).length; const sp = b.querySelector(':scope > span'); if (n && sp && !sp.querySelector('small')) { sp.classList.add('scxbt'); sp.insertAdjacentHTML('beforeend', `<small>이 화면 도움 ${n}</small>`); b.setAttribute('aria-label', `AI SAM 열기 — 이 화면에서 도와드릴 수 있는 일 ${n}개`); } } } catch (e) { } return r; }; }

/* ── 규칙 엔진: 칩 문구 · '이거/이 강좌' 지시를 지금 화면 항목으로 ── */
{ SCX_BASE = answer; const base = answer; answer = (q, ...a) => { const s = String(q || '').trim();
  try {
    const ch = scxChips().find(x => x.l === s); if (ch) return ch.run();
    const c = scxCls() || (CUR.tab === 'class' && UI.cls ? C(UI.cls) : null);
    const deix = /(이거|이것|여기|이\s*(강좌|과정|교육과정|훈련과정|수업|교과목|강의)|현재\s*(강좌|과정)|선택한)/.test(s);
    if (c && (deix || !(S.classes || []).some(k => k.id !== c.id && s.includes(k.name))) && /(마감|종료|끝나는|기간|시작일|가격|수강료|금액|공개|비공개|상태)/.test(s) && /(바꿔|변경|연장|미뤄|늘려|줄여|단축|수정|올려|내려|으로|로\s*해)/.test(s)) {
      const p = scxParse(s); const x = {};
      if (/(시작일)/.test(s) && p.date) x.start = p.date; else if (p.date) x.end = p.date; else if (p.days) x.extend_days = p.days; else if (/(마감|종료|기간)/.test(s) && /(연장|늘려|미뤄)/.test(s)) x.extend_days = 7;
      if (/(가격|수강료|금액)/.test(s) && p.price != null) x.price = p.price;
      if (/비공개/.test(s)) x.open = '비공개'; else if (/공개/.test(s)) x.open = '전체';
      if (/종료\s*(상태|처리)|운영\s*종료/.test(s)) x.status = '종료';
      if (!Object.keys(x).length && /(마감|종료)/.test(s)) return { text: `「${c.name}」 종료일을 언제로 바꿀까요? 지금은 ${c.end || '—'}입니다. 예: "이거 종료일 ${addDays(c.end || today(), 7)}로 바꿔줘" 또는 "7일 연장해줘".`, html: `<div class="bqs"><button type="button" class="chip" data-act="scx-run" data-v="c-ext">7일 연장</button></div>` };
      return scxCourseChange(c, x); }
    /* 전체 메시지(이 화면 AI로 채우기 문구) — 예전에는 이해하지 못했다고 답했다 */
    if (/(전체|모든)\s*\S*\s*(에게)?.*(학습\s*안내|안내)\s*메시지.*(보내|발송)/.test(s)) { const d = scxDefs('message').find(x => x[0] === 'ms-all'); if (d) return d[2](); }
    if (/^초대\s*링크\s*(만들어|만들기|줘|보내)/.test(s)) return scxDefs('enroll').find(x => x[0] === 'e-link')[2]();
    if (/(수료증).*(일괄|한꺼번에|모두).*(발급)/.test(s)) return scxDefs('cert').find(x => x[0] === 'ce-issue')[2]();
  } catch (e) { console.warn('scx answer', e); }
  return scxTry(x => base(x, ...a), q); }; }

/* ── Claude: 화면 맥락 + 도구 2개 ── */
if (typeof AG_TOOLS !== 'undefined' && typeof agRun === 'function') {
  AG_TOOLS.push(
    { name: 'run_screen_action', description: '지금 사용자가 보고 있는 화면에서 바로 할 수 있는 일(화면 맥락에 적힌 id)을 실행합니다. 조회는 결과를, 실행 · 발송 · 변경은 계획 카드(승인 후 실행)를 돌려줍니다. 사용자의 요청이 화면 맥락의 일과 같으면 이 도구를 먼저 쓰세요.', input_schema: { type: 'object', properties: { action: { type: 'string', description: '화면 맥락에 나온 id(예: c-ext, m-risk)' } }, required: ['action'] } },
    { name: 'update_course', description: `과정(${'교육과정'}) 하나의 기간 · 가격 · 상태 · 공개를 바꾸는 계획 카드를 만듭니다(승인 후 변경). '이거 · 이 강좌 · 여기'는 화면 맥락의 선택 과정입니다. course를 비우면 선택 과정.`, input_schema: { type: 'object', properties: { course: { type: 'string', description: '과정명(일부) — 비우면 지금 연 과정' }, end: { type: 'string', description: '새 종료일 YYYY-MM-DD' }, start: { type: 'string', description: '새 시작일 YYYY-MM-DD' }, extend_days: { type: 'integer', description: '종료일을 며칠 늘릴지(음수면 단축)' }, price: { type: 'integer', description: '새 수강료(원)' }, status: { type: 'string', description: '운영중 · 준비중 · 종료' }, open: { type: 'string', description: '전체 · 지정 회원 · 비공개' } } } });
  const base = agRun; agRun = (name, x, ctx) => { x = x || {};
    if (name === 'run_screen_action') { const ch = scxChips().find(y => y.id === String(x.action || '')); if (!ch) return { ok: false, 이유: `이 화면(${scxLabel(scxKey())})에 없는 일입니다. 가능한 id: ${scxChips().map(y => y.id).join(', ') || '없음'}` };
      let r; try { r = ch.run() || {}; } catch (e) { return { ok: false, 이유: '처리 중 오류' }; }
      if (r.plan || r.html || r.copy || r.btn) ctx.cards.push({ ...r, act: ch.l }); if (r.nav) ctx.nav = r.nav;
      return { ok: true, 일: ch.l, 승인필요: !!r.plan, 결과: [r.title, String(r.text || '').slice(0, 600)].filter(Boolean).join(' — '), 안내: r.plan ? '계획 카드를 만들었습니다. 승인하시면 실행된다고 말하세요.' : '결과 카드를 대화에 띄웠습니다. 핵심만 짧게 요약하세요.' }; }
    if (name === 'update_course') { const q = String(x.course || '').trim(); const sel = scxCls() || (UI.cls ? C(UI.cls) : null); const c = q ? ((S.classes || []).find(k => k.name === q) || (S.classes || []).find(k => k.name.includes(q))) : sel;
      if (!c) return { ok: false, 이유: q ? `「${q}」 과정을 찾지 못했습니다` : '선택된 과정이 없습니다. 어떤 과정인지 물어보세요.' };
      const r = scxCourseChange(c, x); if (!r.plan) return { ok: false, 이유: r.text };
      ctx.cards.push({ ...r, act: `update_course ${c.name}` }); return { ok: true, 과정: c.name, 바뀜: r.steps, 승인필요: true }; }
    return base(name, x, ctx); };
  const SCX_CTX = () => { const k = scxKey(), sel = scxSel(), L = scxChips(k); let det = '';
    try { if (sel && sel.kind === 'cls') { const c = C(sel.id); det = ` (상태 ${c.status} · 기간 ${c.start}~${c.end} · 수강료 ${(+c.price || 0).toLocaleString()}원 · ${t('learner')} ${(c.learners || []).length}명${sel.tab ? ` · 보고 있는 탭 ${sel.tab}` : ''})`; } } catch (e) { }
    return `\n\n[화면 맥락 — 사용자에게 보이지 않는 정보]\n지금 화면: ${scxName()}${det}.${sel ? ` '이거 · 이것 · 이 ${t('cls')} · 여기'는 「${sel.name}」을 뜻합니다.` : ''}\n이 화면에서 바로 할 수 있는 일(run_screen_action의 action id): ${L.map(x => `${x.id} = ${x.l}`).join(' / ') || '없음'}.\n선택 과정의 종료일 · 시작일 · 가격 · 상태 · 공개를 바꾸라는 말은 update_course로 계획 카드를 만듭니다.`; };
  window.scxCtxText = SCX_CTX;
  const cb = CL.call; CL.call = function (o) { try { if (o && Array.isArray(o.tools) && o.tools.some(t2 => t2.name === 'run_screen_action') && Array.isArray(o.messages)) { const M2 = o.messages.map(m => ({ ...m })); for (let i = M2.length - 1; i >= 0; i--) { if (M2[i].role === 'user' && typeof M2[i].content === 'string') { M2[i].content += SCX_CTX(); break; } } o = { ...o, messages: M2 }; } } catch (e) { } return cb.call(CL, o); };
  /* 답 아래 '확인 · 실행' 줄 이름 */
  { const b2 = aiBody; aiBody = m => b2(m).replace(/run_screen_action/g, '화면 도움').replace(/update_course/g, `${t('cls')} 변경`); }
}
if (typeof COVER !== 'undefined') COVER.push(['[신규] 화면을 아는 AI SAM: 화면마다 대화창 맨 위에 「지금 화면 — 도와드릴 수 있는 일」 칩', 'class', '']);

/* ── QA 보완(v25) ── */
/* 겹친 확인 창(modal2 · .mwrap.top2)은 Esc로 닫히지 않고 닫기 버튼도 없었다 → Esc = 취소 */
addEventListener('keydown', e => { if (e.key !== 'Escape') return; const w = [...document.querySelectorAll('.mwrap.top2')].pop(); if (!w) return; const x = w.querySelector('[data-x=c]'); if (x) { e.stopImmediatePropagation(); x.click(); } }, true);
