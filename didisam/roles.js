/* 디디쌤 스튜디오 v14 — 역할별 AI SAM(로그인으로 나뉘는 3개 시나리오)
   ① 운영자 → 운영 스튜디오: AI SAM(빌드 · 운영 비서) — v12 빌드 모드
   ② 교수자 → 교수 스튜디오: AI 조교 — 내 강의마다 [과정 설계 → 콘텐츠 개발 → 강의 개설 → 강의 운영 → 성과 · 개선] 파이프라인을 대화로 진행
   ③ 학습자 → 학습자 포털(learner.html): 포털 → 학번 로그인 → 마이페이지 → 로그인 이후 모든 화면에서 AI 튜터(ltutor.js)
   한 화면의 탭으로 역할을 바꾸지 않는다. 역할은 '로그인'으로 나뉘고, 데모에서는 계정 메뉴 · 역할별 로그인 화면으로 전환한다.
   학습자 튜터가 넘긴 질문 → 교수 스튜디오 질문함(S.tq) → 교수자 답변 → 학습자 튜터 · 마이페이지(mine.qa). */
'use strict';
try { Object.defineProperty(window, 'S', { get: () => S, configurable: true }); } catch (e) { } // 학습자 화면 미리보기(iframe, 같은 출처)용
const scn = () => !S || !S.me ? 'admin' : S.me.role === 'teacher' ? 'teacher' : 'admin';

/* ── 교수자 데이터 ── */
const tMe = () => { const a = (S.admins || []).find(x => x.role === 'teacher'); if (a && !Array.isArray(a.classes)) a.classes = []; return a || null; };
const tCls = () => { const ids = (tMe() && tMe().classes) || []; const L = ids.map(C).filter(Boolean); return L.length ? L : S.classes.slice(0, 2); };
const tCur = () => { const L = tCls(); return L.find(c => c.id === UI.tc) || L[0] || null; };
const tSid = id => { const m = M(id); return m ? (m.sid || (m.extra || {}).학번 || '') : ''; };
const tWho = x => x.sid ? esc(x.sid) : x.mid ? (S.org.type === 'univ' ? esc(tSid(x.mid) || '학습자') : mn(x.mid)) : '학습자';
function tqEnsure() {
  if (!Array.isArray(S.tq)) { const L = tCls(); S.tq = (S.posts || []).filter(p => p.kind === '질문' && /(질문|해설|부탁|어떻게|끊|형식|\?)/.test(p.title)).filter((p, i, A) => A.findIndex(x => x.title === p.title) === i).slice(0, 4).map((p, i) => ({ id: 'tq_' + p.id, mid: p.who, sid: tSid(p.who), q: p.title, cls: (L[i % L.length] || {}).name || '', cid: (L[i % L.length] || {}).id || '', src: '게시판', st: 'open', at: p.at })); }
  try { Object.entries(typeof lpRead === 'function' ? lpRead() : {}).forEach(([sid, p]) => ((p && p.tutor && p.tutor.ask) || []).forEach(a => { if (a && a.id && !S.tq.some(x => x.id === a.id)) S.tq.unshift({ id: String(a.id).slice(0, 24), sid, q: String(a.q || '').slice(0, 400), cls: String(a.cls || '').slice(0, 60), cid: a.cid || '', where: a.where || '', src: 'AI 튜터', st: 'open', at: String(a.at || '').slice(0, 16).replace('T', ' ') }); })); } catch (e) { }
  return S.tq;
}
window.tqAdd = x => { if (!S || !x || !x.q) return; tqEnsure(); if (S.tq.some(y => y.id === x.id)) return; S.tq.unshift({ id: String(x.id).slice(0, 24), sid: String(x.sid || '').slice(0, 20), q: String(x.q).slice(0, 400), cls: String(x.cls || '').slice(0, 60), cid: x.cid || '', where: x.where || '', src: 'AI 튜터', st: 'open', at: nowStr() }); logAudit('AI 튜터 → 교수자 질문 전달'); save(); };
const tPend = c => Object.values(c.prog).filter(p => p.assign === 'submitted').length;
const tQs = c => tqEnsure().filter(x => x.st !== 'answered' && (x.cid === c.id || x.cls === c.name));
const tRisk = c => Object.entries(c.prog).filter(([, p]) => p.p < 40).map(([id, p]) => ({ c, id, p }));
const tVid = c => (c.curriculum || []).filter(it => it.type === 'video' && !it.url && it.q).length; // 영상 후보 검색어만 준비(연결 확인 필요)
const tMiss = c => (c.curriculum || []).filter(it => (it.type === 'video' && !(it.url || it.q || (it.src === 'ai' && (it.ai?.scenes || []).length))) || (it.type === 'doc' && !(it.doc?.secs || []).length) || (['quiz', 'exam'].includes(it.type) && !(it.qs || []).length) || (it.type === 'assign' && !it.rubric)).length;
function tDraft(x) {
  const c = (x.cid && C(x.cid)) || S.classes.find(k => k.name === x.cls); const nx = c && (c.curriculum || []).find(i => i.type === 'video');
  const err = /끊|오류|안\s*(돼|되|나와)|재생/.test(x.q), fmt = /형식|제출|양식|분량|몇\s*개|표/.test(x.q), quiz = /퀴즈|문제|해설/.test(x.q);
  const body = err ? '영상이 끊기면 화질을 낮추고 다른 브라우저(크롬 권장)로 다시 열어 보세요. 그래도 안 되면 사용 기기와 시간을 알려 주시면 운영팀에 전달하겠습니다.'
    : fmt ? '과제는 ① 요구사항 요약 ② 내 결과물(이미지 · 표 · 글) ③ 느낀 점 3줄 순서로, A4 1장 안팎이면 충분합니다. 비교표는 사례 2개 이상이면 됩니다. 평가 기준은 요구사항 충족 40 · 정확성 30 · 완성도 20 · 형식 10입니다.'
    : quiz ? `개념을 실제 상황에 적용하는지 묻는 문항입니다. 정답을 외우기보다 '왜 그 선택지가 맞는지'를 ${nx ? `「${nx.title}」 영상의 예시와` : '수업 예시와'} 연결해 보세요.`
    : '좋은 질문입니다. 핵심은 개념을 내 과제에 직접 적용해 보는 것입니다. 수업 자료의 예시를 한 번 따라 해 보고, 막히는 단계가 있으면 그 화면을 캡처해 다시 질문해 주세요.';
  return `${body}\n— ${c ? c.name : ''} ${t('teacher')}`.trim();
}

/* ── 교수자 파이프라인: 과정 설계 → 콘텐츠 개발 → 강의 개설 → 강의 운영 → 성과 · 개선 ── */
const TST = [
  { id: 'design', n: '과정 설계', d: '학습 목표 · 주차 구성 · 평가 계획', done: c => (c.curriculum || []).filter(i => i.type !== 'chapter').length >= 3, st: c => `${(c.curriculum || []).filter(i => i.type !== 'chapter').length}개 항목` },
  { id: 'develop', n: '콘텐츠 개발', d: '영상 · 강의자료 · 퀴즈 · 과제 루브릭', done: c => (c.curriculum || []).length > 0 && !tMiss(c), st: c => tMiss(c) ? `빈 항목 ${tMiss(c)}` : tVid(c) ? `영상 확인 ${tVid(c)}` : '준비 완료' },
  { id: 'open', n: '강의 개설', d: '공개 범위 · 기간 · 수강생 · 개강 공지', done: c => c.status === '운영중' && c.learners.length > 0 && c.open !== '비공개', st: c => c.status === '운영중' ? `수강 ${c.learners.length}명` : c.status },
  { id: 'operate', n: '강의 운영', d: '질문 답변 · 채점 · 진도 독려', done: c => c.status === '운영중' && Date.parse(c.end) < Date.now() && !tPend(c) && !tQs(c).length, st: c => c.status === '운영중' ? `채점 ${tPend(c)} · 질문 ${tQs(c).length}` : '개설 후' },
  { id: 'report', n: '성과 · 개선', d: '이수 · 성적 · 다음 학기 개선점', done: c => !!c.rep, st: c => c.rep ? '리포트 완료' : '학기 말' }
];
const tStageOf = c => (TST.find(s => !s.done(c)) || TST[TST.length - 1]);
const tQ = (sid, c) => { const n = c ? `「${c.name}」 ` : ''; return ({
  design: [(typeof FILLQ === 'function' && FILLQ().class) || 'AI 리터러시 15주 교과목 설계해줘', '데이터 분석 기초 8주 과정 설계해줘'],
  develop: [`${n}빈 항목 AI로 채워줘`, `${n}3주차 강의자료 만들어줘`],
  open: [`${n}강의 개설해줘`, `${n}개강 공지 올려줘`],
  operate: ['학생 질문 답변 초안 만들어줘', '채점 대기 과제 AI로 1차 채점해줘', '진도 미달 학생에게 독려 메시지 보내줘'],
  report: [`${n}성과 리포트와 개선점 정리해줘`]
})[sid] || []; };
function tGuide(sid, c, first) {
  const s = TST.find(x => x.id === sid); const i = TST.indexOf(s);
  const txt = { design: '주제 · 주차 · 대상만 말씀하시면 학습 목표 · 주차 구성 · 평가 계획(퀴즈 · 과제 · 시험)까지 초안을 만듭니다. 기존 강의는 미리보기 화면의 커리큘럼에서 바로 고치셔도 됩니다.',
    develop: `비어 있는 항목${c ? ` ${tMiss(c)}개` : ''}을 채웁니다. YouTube 영상 추천 · AI 강의 영상 · 강의자료 · 퀴즈 · 과제 루브릭을 만들고, 고칠 항목은 "3주차 영상 바꿔줘"처럼 말씀하세요.`,
    open: '공개 범위 · 수강 기간을 정하고 수강생을 연결한 뒤 개강 공지를 올립니다. 개설하면 학습자 포털에 강의가 열리고 학생 AI 튜터가 이 강의를 기준으로 안내합니다.',
    operate: '학생 AI 튜터가 넘긴 질문, 채점 대기 과제, 진도가 늦은 학생을 모아 두었습니다. 답변 · 채점 · 메시지 초안은 제가 만들고, 보내기와 확정은 교수님이 승인하시면 처리합니다.',
    report: '이수율 · 성적 분포 · 질문 주제 · 진도 이탈 구간을 정리하고 다음 학기 개선점을 제안합니다.' }[sid];
  return { role: 'ai', tst: sid, text: `${first ? `안녕하세요, ${t('teacher')}님의 AI 조교입니다.\n` : ''}${c ? `「${c.name}」 · ` : ''}STEP ${i + 1} ${s.n}\n${txt}`, html: `<div class="bqs">${tQ(sid, c).map(x => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(x)}">${esc(x)}</button>`).join('')}${c && sid !== 'report' ? '<button type="button" class="chip done" data-act="tst-next">다음 단계로</button>' : ''}</div>` };
}
function tGreet() {
  const L = tCls(); const lines = L.map(c => { const s = tStageOf(c); return `· 「${c.name}」 — ${s.n} 단계(${s.st(c)})`; });
  return { role: 'ai', text: `안녕하세요, ${t('teacher')}님의 AI 조교입니다.\n담당 강의 ${L.length}개를 확인했습니다.\n${lines.join('\n')}\n강의마다 과정 설계 → 콘텐츠 개발 → 강의 개설 → 강의 운영 → 성과 · 개선 순서로 함께 진행합니다. 새 강의는 "새 교과목 설계해줘"로 시작하세요.`, html: `<div class="bqs">${L.slice(0, 2).map(c => `<button type="button" class="chip" data-act="tst-open" data-c="${c.id}" data-v="${tStageOf(c).id}">「${esc(c.name)}」 ${esc(tStageOf(c).n)} 이어서</button>`).join('')}<button type="button" class="chip" data-act="tst-new">새 교과목 설계해줘</button></div>` };
}
function tStrip() {
  const c = tCur(); if (!c) return `<div class="bsteps tpipe"><button type="button" class="bst on" data-act="tst-new"><small>START</small><b>새 강의 설계</b><i>AI 조교와 시작</i></button></div>`;
  const cur = tStageOf(c); const on = UI.tst || cur.id;
  return `<div class="tpbar"><label class="tpsel"><span>내 강의</span><select data-chg="tc-sel" aria-label="강의 선택">${tCls().map(k => `<option value="${k.id}" ${k.id === c.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label><button type="button" class="btn sm ghost" data-act="tst-new">+ 새 강의</button></div>
  <div class="bsteps tpipe" role="list">${TST.map((s, i) => { const d = s.done(c); return `<button type="button" role="listitem" class="bst ${s.id === on ? 'on' : d ? 'ok' : ''}" data-act="tst-open" data-c="${c.id}" data-v="${s.id}" ${s.id === on ? 'aria-current="step"' : ''}><small>STEP ${i + 1}${s.id === cur.id && !d ? ' · 지금' : ''}</small><b>${esc(s.n)}</b><i>${d ? '완료 · ' : ''}${esc(s.st(c))}</i></button>`; }).join('')}</div>`;
}
const TQB = () => { const L = tCls(); const P = L.reduce((a, c) => a + tPend(c), 0), Q = L.reduce((a, c) => a + tQs(c).length, 0), R = L.reduce((a, c) => a + tRisk(c).length, 0), D = L.reduce((a, c) => a + tMiss(c), 0);
  return [{ h: '학생 질문', n: Q, u: '건', q: '학생 질문 답변 초안 만들어줘' }, { h: '채점 대기', n: P, u: '건', q: '채점 대기 과제 AI로 1차 채점해줘' }, { h: '진도 위험', n: R, u: '명', q: '진도 미달 학생에게 독려 메시지 보내줘' }, { h: '개발할 항목', n: D, u: '개', q: `${tCur() ? `「${tCur().name}」 ` : ''}빈 항목 AI로 채워줘` }]; };
function tHome() {
  const c = tCur(); if (UI.tst === 'operate' && c) return tOperate(c); if (UI.tst === 'report' && c) return tReport(c);
  return `<section class="brief">${TQB().map(b => `<div class="bc ${b.n ? 'hot' : ''}"><span>${esc(b.h)}</span><b>${b.n}<small>${b.u}</small></b><button class="btn sm ${b.n ? 'ink' : ''}" data-act="chat-q" data-v="${esc(b.q)}" ${b.n ? '' : 'disabled'}>${ic('spark', 14)} AI 조교에게 맡기기</button></div>`).join('')}</section>
  <div class="bct tct"><b>내 강의</b><small>강의마다 설계 → 개발 → 개설 → 운영 → 성과</small></div>
  <div class="tcl">${tCls().map(k => { const s = tStageOf(k); const av = Math.round(avgP(k)); return `<div class="card tcc ${k.id === (c && c.id) ? 'sel' : ''}"><div class="bct"><b>${esc(k.name)}</b>${tag(k.status, k.status === '운영중' ? 'g' : '')}</div>
    <ol class="tdots">${TST.map(x => `<li class="${x.done(k) ? 'ok' : x.id === s.id ? 'on' : ''}"><i></i><span>${esc(x.n)}</span></li>`).join('')}</ol>
    <div class="tcm"><span><b>${k.learners.length}</b>명 수강</span><span><b>${av}</b>% 평균 진도</span><span><b>${tMiss(k)}</b>개 빈 항목</span><span class="${tQs(k).length ? 'r' : ''}"><b>${tQs(k).length}</b>건 질문</span></div>
    <div class="bar2"><button class="btn sm ink" data-act="tst-open" data-c="${k.id}" data-v="${s.id}">${esc(s.n)} 이어서 ${ic('arrow', 13)}</button></div></div>`; }).join('')}
    <button type="button" class="card tnew" data-act="tst-new">${ic('spark', 22)}<b>새 강의 설계</b><small>주제 · 주차 · 대상만 말하면 AI 조교가 초안을 만듭니다</small></button></div>`;
}
function tQTable(Q) { const U = S.org.type === 'univ'; return table([U ? '학번' : t('learner'), '질문', '출처', '상태', ''], Q.slice(0, 12).map(x => [tWho(x), `<span class="tq">${esc(x.q)}</span>`, x.src === 'AI 튜터' ? tag('AI 튜터', 'mg') : tag(x.src || '게시판'), x.st === 'answered' ? tag('답변함', 'g') : x.draft ? tag('초안', 'y') : tag('답변 대기', 'y'), x.st === 'answered' ? '' : `<button class="btn sm" data-act="tq-open" data-v="${esc(x.id)}">${ic('spark', 13)} 답변</button>`])); }
function tOperate(c) {
  const U = S.org.type === 'univ'; const Q = tqEnsure().filter(x => x.cid === c.id || x.cls === c.name); const R = tRisk(c);
  return `<section class="kpis k3">${kpi('질문 대기', tQs(c).length, 'AI 튜터가 넘긴 질문 포함', tQs(c).length ? 'mg' : '', '건')}${kpi('채점 대기', tPend(c), '루브릭 초안 → 확정', '', '건')}${kpi('진도 위험', R.length, '진도 40% 미만', R.length ? 'mg' : '', '명')}</section>
  <div class="card"><div class="ch"><b>학생 질문함</b><small>답변은 학생 AI 튜터와 마이페이지에 표시됩니다</small><span class="sp"></span>${tQs(c).length ? `<button class="btn sm ink" data-act="chat-q" data-v="「${esc(c.name)}」 학생 질문 답변 초안 만들어줘">${ic('spark', 14)} 답변 초안</button>` : ''}</div>${tQTable(Q)}</div>
  <div class="card"><div class="ch"><b>진도 위험 ${esc(t('learner'))}</b><small>${U ? '학번만 표시' : '진도 40% 미만'}</small><span class="sp"></span>${R.length ? `<button class="btn sm ink" data-act="chat-q" data-v="「${esc(c.name)}」 진도 미달 학생에게 독려 메시지 보내줘">${ic('spark', 14)} 독려 메시지</button>` : ''}</div>${table([U ? '학번' : '이름', '진도', '과제', '최근 접속'], R.slice(0, 10).map(x => [U ? esc(tSid(x.id) || '—') : mn(x.id), `${x.p.p}%`, esc({ none: '미제출', submitted: '채점 대기', graded: '통과', returned: '재제출', failed: '미통과' }[x.p.assign] || '—'), esc(M(x.id)?.last || '—')]))}</div>
  <div class="bar2"><button class="btn" data-act="go" data-v="assess">평가 · 채점 화면 열기</button></div>`;
}
function tReport(c) {
  const v = Object.values(c.prog); const thr = c.criteria.threshold; const done = v.filter(p => p.p >= thr).length; const sc = v.map(p => p.score ?? p.exam).filter(x => x != null);
  const band = [[90, 101], [80, 90], [70, 80], [0, 70]].map(([a, b]) => sc.filter(x => x >= a && x < b).length); const mx = Math.max(1, ...band);
  return `<section class="kpis">${kpi('이수율', v.length ? Math.round(done / v.length * 100) : 0, `${done}/${v.length}명`, '', '%')}${kpi('평균 진도', Math.round(avgP(c)), '', '', '%')}${kpi('평균 점수', sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0, `${sc.length}명 응시`, '', '점')}${kpi('질문 수', tqEnsure().filter(x => x.cls === c.name || x.cid === c.id).length, '튜터 · 게시판', '', '건')}</section>
  <div class="grid g2"><div class="card"><div class="ch"><b>점수 분포</b></div>${['90점 이상', '80점대', '70점대', '70점 미만'].map((l, i) => `<div class="tband"><span>${l}</span><i style="width:${band[i] / mx * 100}%"></i><b>${band[i]}</b></div>`).join('')}</div>
  <div class="card"><div class="ch"><b>다음 학기 개선점</b>${c.rep ? tag('AI 조교 정리', 'mg') : ''}</div>${c.rep ? `<ol class="lxl">${c.rep.map(x => `<li><b>${esc(x[0])}</b><small>${esc(x[1])}</small></li>`).join('')}</ol>` : `<p class="mini">아직 정리하지 않았습니다.</p><button class="btn sm ink" data-act="chat-q" data-v="「${esc(c.name)}」 성과 리포트와 개선점 정리해줘">${ic('spark', 14)} AI 조교에게 맡기기</button>`}</div></div>`;
}
function tComposer() {
  const c = tCur(); const sid = UI.tst || (c ? tStageOf(c).id : 'design'); const chips = [...tQ(sid, c), ...(c && sid !== 'report' ? ['다음 단계로'] : [])];
  return `<form class="composer bcomp" data-where="bld"><div class="chips">${chips.map(x => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="cbox"><textarea rows="1" maxlength="300" placeholder="AI 조교에게 강의 업무를 맡기세요" aria-label="AI 조교에게 지시"></textarea><button class="send" type="submit" aria-label="보내기">${ic('send', 18)}</button></div>
    <small class="cnote"><span><kbd>Enter</kbd> 보내기</span><span>${typeof CL !== 'undefined' && CL.on('chat') ? esc(CL.label()) + ' 연결됨' : '규칙 엔진(데모)'}</span><span>발송 · 확정은 ${esc(t('teacher'))} 승인 후</span></small></form>`;
}
{ const b1 = bStrip; bStrip = () => scn() === 'teacher' ? tStrip() : b1(); }
{ const b2 = bHome; bHome = () => scn() === 'teacher' ? tHome() : b2(); }
{ const b3 = bComposer; bComposer = () => scn() === 'teacher' ? tComposer() : b3(); }
AFTER.forEach((f, i) => { if (/bld\.seen/.test(String(f))) AFTER[i] = () => { if (scn() === 'admin') f(); }; }); // 운영자 빌드 안내는 교수 스튜디오에서 끔

/* 단계 열기: 설계 · 개발 · 개설은 강의 화면, 운영 · 성과는 교수 스튜디오 캔버스 */
function tOpen(cid, sid, announce = true) {
  const c = C(cid) || tCur(); if (!c) return; UI.tc = c.id; UI.tst = sid;
  if (announce) { S.chat.push(tGuide(sid, c)); S.chat = S.chat.slice(-60); } save();
  if (sid === 'design' || sid === 'develop' || sid === 'open') { UI.cls = c.id; UI.clsT = sid === 'open' ? 'set' : (c.kind === 'episode' ? 'episodes' : 'curriculum'); go('class', true); }
  else { CUR = { ws: 'home', tab: '' }; render(); }
  renderThreads();
}
ACT['tst-new'] = () => { UI.tst = 'design'; S.chat.push(tGuide('design', null)); save(); CUR = { ws: 'home', tab: '' }; render(); setTimeout(() => $('.bchat textarea')?.focus(), 50); };
ACT['tst-open'] = el => { if (innerWidth <= 860) document.body.classList.add('b-pv'); tOpen(el.dataset.c, el.dataset.v); };
ACT['tst-next'] = () => { const c = tCur(); if (!c) return; const i = TST.findIndex(s => s.id === (UI.tst || tStageOf(c).id)); const n = TST[Math.min(TST.length - 1, i + 1)]; tOpen(c.id, n.id); };
ACT['tc-sel'] = el => { UI.tc = el.value; UI.tst = ''; const c = C(el.value); if (c) tOpen(c.id, tStageOf(c).id); };

/* ── 교수 스튜디오 대화: AI 조교 의도 ── */
{ const base = answer; answer = q => { if (scn() !== 'teacher') return base(q); const s = String(q || '').trim(); const L = tCls();
  const one = L.find(c => s.includes(c.name)) || null; const c = one || tCur(); const ids = new Set((one ? [one] : L).map(k => k.id));
  if (/^(다음(\s*단계)?(로|으로)?)(\s*(가자|가줘|진행(해\s*줘)?|해\s*줘))?[.!]?$/.test(s)) { if (!c) return { text: '먼저 강의를 만들어 주세요.' }; const i = TST.findIndex(x => x.id === (UI.tst || tStageOf(c).id)); const n = TST[Math.min(TST.length - 1, i + 1)]; setTimeout(() => tOpen(c.id, n.id, false), 0); const g = tGuide(n.id, c); delete g.role; return g; }
  if (/(오늘|지금).{0,6}(할\s*일|뭐)|브리핑/.test(s)) { UI.tst = ''; const g = tGreet(); delete g.role; return { ...g, nav: 'home' }; }
  if (/(빈\s*항목|콘텐츠|영상|자료).{0,12}(채워|만들|개발|생성)/.test(s) && !/\d+\s*주차/.test(s) && c) { const n = tMiss(c); if (!n) return { text: `「${c.name}」은 빈 항목이 없습니다. 다음은 강의 개설입니다.`, html: `<div class="bqs"><button type="button" class="chip done" data-act="tst-open" data-c="${c.id}" data-v="open">강의 개설로</button></div>` };
    const pid = uid('p'); PLANS[pid] = { run: () => { ACT['ai-fill']({ dataset: { v: c.id } }); logAudit(`AI 조교 콘텐츠 개발 — ${c.name}`); UI.cls = c.id; UI.clsT = c.kind === 'episode' ? 'episodes' : 'curriculum'; UI.tc = c.id; UI.tst = 'develop'; return `「${c.name}」 빈 항목을 채웠습니다.${tVid(c) ? ` 영상 ${tVid(c)}개는 YouTube 검색어까지 준비했으니 후보를 골라 연결해 주세요(설정 › 연동에 YouTube 키를 넣으면 자동 연결).` : ''} 커리큘럼에서 확인하고, 바꿀 항목은 눌러서 고치거나 말씀해 주세요.`; }, go: 'class' };
    return { title: '콘텐츠 개발', text: `「${c.name}」의 빈 항목 ${n}개를 채울까요?`, steps: ['영상: 주제에 맞는 YouTube 후보 연결(저작권 확인 필요)', '강의자료: 절 구성 · 요점 · 실습 활동', '퀴즈: 주차별 확인 문항', '과제: 평가 루브릭'], plan: pid, state: 'pending', cta: `빈 항목 ${n}개 채우기` }; }
  if (/(개설|개강|오픈|공개)/.test(s) && !/공지/.test(s) && c) { const pid = uid('p'); const g = S.groups.find(x => x.id === c.group) || S.groups[0];
    PLANS[pid] = { run: () => { c.status = '운영중'; if (c.open === '비공개') c.open = '전체'; if (!c.learners.length) { S.members.filter(m => m.grade === '정회원').slice(0, 20).forEach(m => { c.learners.push(m.id); c.prog[m.id] = { p: 0, exam: null, assign: 'none', att: 0 }; }); } (c.notices = c.notices || []).unshift({ id: uid('n'), title: `${c.name} 개강 안내`, at: today(), pin: true }); logAudit(`강의 개설 — ${c.name}`); UI.cls = c.id; UI.clsT = 'learners'; UI.tst = 'open'; return `「${c.name}」을 개설했습니다. 수강 ${c.learners.length}명 · 개강 공지 게시. 학습자 포털에서 바로 보이고, 학생 AI 튜터가 이 강의를 기준으로 안내합니다.`; }, go: 'class' };
    return { title: '강의 개설', text: `「${c.name}」을 개설할까요?`, steps: [`공개 범위: ${c.open === '비공개' ? '전체' : c.open} · 기간 ${c.start} ~ ${c.end}`, c.learners.length ? `수강생 ${c.learners.length}명 유지` : `수강생 연결(${g ? g.name : '정회원'} 기준)`, '개강 공지 게시(상단 고정)', '학습자 포털 · 학생 AI 튜터에 반영'], plan: pid, state: 'pending', cta: '강의 개설하기' }; }
  if (/공지/.test(s) && /(올려|게시|작성|써)/.test(s) && c) { const pid = uid('p'); const ttl = /개강/.test(s) ? `${c.name} 개강 안내` : `${c.name} 안내`; PLANS[pid] = { run: () => { (c.notices = c.notices || []).unshift({ id: uid('n'), title: ttl, at: today(), pin: true }); logAudit(`공지 — ${ttl}`); UI.cls = c.id; UI.clsT = 'notice'; return `「${ttl}」 공지를 올렸습니다.`; }, go: 'class' };
    return { title: '공지', text: `「${ttl}」 공지를 올릴까요?`, html: `<div class="pvmsg"><b>${esc(ttl)}</b><p>${esc(c.name)} 강의가 ${esc(c.start)}에 시작합니다. 첫 주에는 오리엔테이션 영상과 1주차 퀴즈를 마쳐 주세요. 궁금한 점은 학습 화면의 AI 튜터에게 물어보거나 질문을 남겨 주세요.</p></div>`, plan: pid, state: 'pending', cta: '공지 올리기' }; }
  if (/채점/.test(s)) { const P = pend().filter(x => ids.has(x.c.id)); if (!P.length) return { text: '담당 강의에 채점 대기 과제가 없습니다.' };
    const pid = uid('p'); PLANS[pid] = { run: () => { P.forEach(x => { x.c.prog[x.id].draft = AI.gradeDraft(x.c, x.id); }); logAudit(`AI 조교 채점 초안 ${P.length}건`); UI.tst = 'operate'; return `채점 초안 ${P.length}건을 만들었습니다. 평가 화면에서 초안을 확인하고 [채점]으로 확정하세요. 최종 판정은 ${t('teacher')}님이 합니다.`; }, go: 'assess' };
    return { title: '채점 초안', text: `채점 대기 ${P.length}건에 루브릭(요구사항 40 · 정확성 30 · 완성도 20 · 형식 10)을 적용해 초안을 만들까요?`, steps: ['제출물 · 루브릭 대조', '점수 · 피드백 초안', '평가 화면에 초안 표시', `${t('teacher')} 확인 후 확정 · 배지 자동 발급`], plan: pid, state: 'pending', cta: `초안 ${P.length}건 만들기` }; }
  if (/질문/.test(s) && /(답|초안|정리|처리)/.test(s)) { const Q = tqEnsure().filter(x => x.st !== 'answered' && (one ? (x.cid === one.id || x.cls === one.name) : true)).slice(0, 6); if (!Q.length) return { text: '답변을 기다리는 학생 질문이 없습니다.' };
    Q.forEach(x => { if (!x.draft) x.draft = tDraft(x); }); save(); const pid = uid('p'); UI.tst = 'operate'; if (c) UI.tc = (one || c).id;
    PLANS[pid] = { run: () => { Q.forEach(x => { x.st = 'answered'; x.a = x.draft; x.aAt = nowStr(); }); logAudit(`AI 조교 답변 ${Q.length}건 발송(${t('teacher')} 승인)`); return `답변 ${Q.length}건을 보냈습니다. 학생 AI 튜터와 마이페이지에 표시됩니다.`; }, go: 'home' };
    return { title: '질문 답변 초안', text: `답변을 기다리는 질문 ${Q.length}건의 초안입니다. 고칠 답변은 질문함의 [답변]에서 수정하고, 그대로 보내도 되면 승인하세요.`, html: `<div class="tqd">${Q.map(x => `<div><small>${tWho(x)} · ${esc(x.cls || '')} · ${esc(x.src || '')}</small><b>Q. ${esc(x.q)}</b><p>${esc(x.draft).replace(/\n/g, '<br>')}</p></div>`).join('')}</div>`, plan: pid, state: 'pending', cta: `답변 ${Q.length}건 보내기`, nav: 'home' }; }
  if (/(독려|미달|부진|위험|미접속)/.test(s)) { const R = L.filter(k => ids.has(k.id)).flatMap(tRisk); if (!R.length) return { text: '진도 40% 미만 학생이 없습니다.' };
    const ttl = `${one ? one.name : '수업'} 진도 안내`; const body = '이번 주 진도가 조금 늦어지고 있어요. 남은 영상 1개만 먼저 들어도 진도가 올라갑니다. 막히는 부분은 학습 화면의 AI 튜터에게 물어보거나 질문을 남겨 주세요.'; const pid = uid('p');
    PLANS[pid] = { run: () => { S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: `${one ? one.name : `담당 ${t('cls')}`} 진도 미달 ${R.length}명`, title: ttl, ch: '앱 푸시 + 이메일', n: R.length }); logAudit(`AI 조교 독려 메시지 ${R.length}명`); return `독려 메시지를 ${R.length}명에게 보냈습니다. 학생 AI 튜터도 다음 접속 때 오늘 할 일로 안내합니다.`; }, go: 'message' };
    return { title: '독려 메시지', text: `진도 40% 미만 ${R.length}명에게 보낼 메시지 초안입니다.`, html: `<div class="pvmsg"><b>${esc(ttl)}</b><p>${esc(body)}</p></div>`, steps: [`대상: ${[...new Set(R.map(x => x.c.name))].join(' · ')} 진도 40% 미만 ${R.length}명`, '앱 푸시 + 이메일', '발송 내역 기록'], plan: pid, state: 'pending', cta: `${R.length}명에게 보내기` }; }
  if (/(성과|개선|리포트|보고)/.test(s) && c) { const v = Object.values(c.prog); const low = v.filter(p => p.p < 40).length; const qn = tqEnsure().filter(x => x.cls === c.name || x.cid === c.id).length;
    c.rep = [['초반 이탈 줄이기', `진도 40% 미만 ${low}명 — 1~2주차 영상을 10분 이내로 나누고, 1주차 퀴즈를 쉬운 문항으로 시작합니다.`], ['자주 묻는 질문을 자료에 반영', `학생 질문 ${qn}건 중 과제 형식 · 영상 재생 문의가 많습니다 — 과제 안내문에 예시 답안 구조를 넣습니다.`], ['과제 루브릭 공개', '재제출 사유 대부분이 요구사항 누락입니다 — 루브릭을 과제 화면에 미리 보여 줍니다.'], ['AI 튜터 활용 안내', '튜터 질문이 많은 주차에 복습 퀴즈를 추가해 스스로 점검하게 합니다.']]; logAudit(`성과 · 개선 리포트 — ${c.name}`); save(); UI.tc = c.id; UI.tst = 'report';
    return { title: '성과 · 개선', text: `「${c.name}」 성과 리포트를 정리했습니다. 수강 ${c.learners.length}명 · 평균 진도 ${Math.round(avgP(c))}% · 이수 ${v.filter(p => p.p >= c.criteria.threshold).length}명.`, html: `<div class="trep">${c.rep.map(x => `<div><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>`, nav: 'home' }; }
  return base(q);
}; }
/* 교수 스튜디오에서 새로 만든 강의는 내 강의로(대화 · 마법사 · 직접 만들기 어느 경로든) */
AFTER.unshift(() => { if (!S || !S.org || scn() !== 'teacher') return; const me = tMe(); if (!me) return; S.tSeen = S.tSeen || S.classes.map(c => c.id);
  const nw = S.classes.filter(c => !S.tSeen.includes(c.id)); if (!nw.length) return; nw.forEach(k => { if (!me.classes.includes(k.id)) me.classes.unshift(k.id); k.teacher = me.name; S.tSeen.push(k.id); });
  UI.tc = nw[0].id; UI.tst = 'design'; save(); setTimeout(() => { const st = $('.tpipe'); if (st) render(); }, 0); });
/* Claude 연결 시: 교수 스튜디오에서는 AI 조교 역할로 */
if (typeof CL !== 'undefined') { const base = CL.call.bind(CL); CL.call = o => { if (scn() === 'teacher' && o && typeof o.system === 'string' && /AI SAM/.test(o.system)) { const L = tCls(); o = { ...o, system: `당신은 교육기관 ${t('teacher')}을 돕는 AI 조교입니다. ${t('teacher')}은 강의마다 과정 설계 → 콘텐츠 개발 → 강의 개설 → 강의 운영 → 성과 · 개선을 진행합니다. 담당 강의: ${L.map(c => `${c.name}(${tStageOf(c).n} 단계, 빈 항목 ${tMiss(c)}, 채점 대기 ${tPend(c)}, 질문 ${tQs(c).length})`).join('; ')}. 채점 · 답변 · 메시지 · 공지는 초안만 만들고 확정과 발송은 ${t('teacher')}이 승인합니다. 학습자 이름 · 연락처를 쓰지 않습니다. 실행이 필요하면 studio_action 도구로 짧은 한국어 지시를 넘깁니다(예: "새 교과목 설계해줘", "「강의명」 빈 항목 AI로 채워줘", "「강의명」 강의 개설해줘", "학생 질문 답변 초안 만들어줘", "「강의명」 성과 리포트와 개선점 정리해줘"). 문어체로 간결하게 답합니다.` }; } return base(o); }; }

/* ── 질문 답변 편집 ── */
ACT['tq-open'] = el => { const x = tqEnsure().find(y => y.id === el.dataset.v); if (!x) return; if (!x.draft) x.draft = tDraft(x);
  modal('학생 질문 답변', `<p class="mini">${tWho(x)} · ${esc(x.cls || '')} · ${esc(x.src || '')}${x.where ? ' · ' + esc(x.where) : ''}</p><div class="aibox"><b>Q.</b> ${esc(x.q)}</div><label class="fl">답변(AI 조교 초안 — 고쳐서 보내세요)<textarea id="tqA" rows="6" maxlength="2000">${esc(x.draft)}</textarea></label><p class="mini">보낸 답변은 ${esc(t('learner'))}의 AI 튜터와 마이페이지에 표시됩니다.</p>`, [{ id: 'c', label: '닫기' }, { id: 'ok', label: '답변 보내기', kind: 'pri', run: () => { ACT['tq-send']({ dataset: { v: x.id } }); return false; } }]); };
ACT['tq-send'] = el => { const x = tqEnsure().find(y => y.id === (el.dataset.v || '')); const a = ($('#tqA') || {}).value; if (!x || !a || !a.trim()) { toast('답변을 입력하세요.', 'warn'); return; } x.a = a.trim().slice(0, 2000); x.draft = x.a; x.st = 'answered'; x.aAt = nowStr(); logAudit(`학생 질문 답변 — ${x.cls || ''}`); save(); closeModal(); render(); toast('답변을 보냈습니다. 학생 AI 튜터에 표시됩니다.', 'ok'); };

/* ── 로그인으로 역할 전환(데모): 계정 메뉴 · 역할별 로그인 화면 ── */
function lxDemo() {
  const L = tCls(); const c = L[0] || S.classes[0]; if (!c) return null; S.codes = S.codes || [];
  let code = S.codes.find(x => x.demo); if (code) return code;
  const id = c.learners.find(i => c.prog[i] && c.prog[i].p >= 25 && c.prog[i].p <= 70) || c.learners[0]; const m = M(id); if (!m) return null;
  const sid = m.sid || (m.extra || {}).학번 || ('2026' + String(9000 + S.codes.length)); m.sid = sid; m.extra = { ...(m.extra || {}), 학번: (m.extra || {}).학번 || sid };
  const g = c.prog[id]; g.assign = 'returned'; g.score = 62; g.fb = `요구사항 2번(활용 사례 비교)이 빠졌습니다. 사례 2개를 표로 비교하고, 내 ${S.org.type === 'univ' ? '전공' : ['corp', 'public'].includes(S.org.type) ? '직무' : '실무'}에 적용할 점을 한 줄 덧붙여 다시 제출하세요.`;
  code = { sid, dept: (S.groups.find(x => x.id === m.group) || {}).name || '', code: 'DEMO' + String(Math.floor(1000 + Math.random() * 8999)), at: today(), demo: true }; S.codes.push(code); logAudit('체험 학습자 접근코드 발급(데모)'); save(); return code;
}
function asRole(r) {
  S.chats = S.chats || {}; S.chats[scn()] = S.chat; UI.door = false; UI.tst = ''; UI.cls = null;
  if (r === 'teacher') { S.tSeen = S.classes.map(c => c.id); const me = tMe(); S.me.adminName = S.me.adminName || (S.me.role !== 'teacher' ? S.me.name : '관리자'); S.me.role = 'teacher'; S.me.name = (me && me.name) || t('teacher'); if (S.bld) S.bld.on = true; }
  else { S.me.role = 'owner'; S.me.name = S.me.adminName || '관리자'; }
  S.chat = S.chats[r] || []; if (r === 'teacher' && !S.chat.length) S.chat.push(tGreet()); if (r === 'admin' && !S.chat.length && S.bld && !bAllDone()) { const c = bCur(); if (c) S.chat.push(bGuideMsg(c.id)); }
  logAudit(`${r === 'teacher' ? '교수자' : '운영자'} 계정으로 로그인(데모)`); save(); CUR = { ws: 'home', tab: '' }; document.body.classList.remove('b-pv'); render();
  toast(r === 'teacher' ? `${S.me.name} 계정 — 교수 스튜디오입니다. AI 조교가 강의 설계부터 운영까지 함께합니다.` : '운영자 계정 — 운영 스튜디오(AI SAM)입니다.', 'ok');
}
function openPortal() {
  try { lsEnsure(); if (!S.lsite.pub) ACT['ls-pub'](); } catch (e) { }
  const c = lxDemo(); save(); const w = window.open(lsLearnerURL() + '#home', '_blank', 'noopener');
  toast(c ? `학습자 포털을 새 창으로 열었습니다 — 체험 학번 ${c.sid} · 접근코드 ${c.code}` : '학습자 포털을 새 창으로 열었습니다.', 'ok'); return w;
}
ACT['as-admin'] = () => asRole('admin');
ACT['as-teacher'] = () => asRole('teacher');
ACT['lp-open'] = () => openPortal();
ACT['door'] = () => { UI.door = true; render(); };
ACT['door-x'] = () => { UI.door = false; render(); };
function doorHTML() {
  const me = tMe(); const code = (S.codes || []).find(x => x.demo); const L = t('learner');
  const card = (k, ic2, title, who, flow, btn, act, note = '') => `<div class="dcard d-${k}"><span class="dic">${ic(ic2, 22)}</span><small>${esc(who)}</small><b>${esc(title)}</b><ol>${flow.map(x => `<li>${esc(x)}</li>`).join('')}</ol><button class="btn ${k === 'learner' ? 'ink' : 'pri'} blk" data-act="${act}">${esc(btn)} ${ic('arrow', 14)}</button>${note ? `<p class="mini">${note}</p>` : ''}</div>`;
  return `<div class="door"><header class="dhead"><span class="logo">D</span><div><small>${esc(S.org.name)}</small><b>어떤 계정으로 들어가시나요?</b><p>디디쌤은 역할마다 화면과 AI가 다릅니다. 같은 기관 데이터로 이어져 있어, 학생이 넘긴 질문은 교수자에게, 교수자의 답변은 학생에게 전달됩니다.</p></div>${CUR && S.me ? '<button class="x" data-act="door-x" aria-label="닫기">' + ic('x', 18) + '</button>' : ''}</header>
  <div class="dgrid">${card('admin', 'gear', '운영 스튜디오', '운영자 · 정운영자 계정', ['AI SAM과 기관 구성', '홈페이지 · 과정 · 학습자 사이트 빌드', '학습자 등록 · 자동화 · 운영 현황'], '운영자로 로그인', 'as-admin')}
  ${card('teacher', 'book', '교수 스튜디오', `${t('teacher')} 계정 · ${me ? me.name : ''}`, ['과정 설계 — 학습 목표 · 주차 · 평가', '콘텐츠 개발 — 영상 · 자료 · 퀴즈 · 과제', '강의 개설 → 강의 운영(AI 조교) → 성과 · 개선'], `${t('teacher')}로 로그인`, 'as-teacher')}
  ${card('learner', 'users', '학습자 포털', `${L} 계정 · 학번 + 접근코드`, ['포털 홈에서 로그인', '마이페이지 — AI 튜터가 오늘 할 일 정리', '로그인 이후 모든 화면에서 AI 튜터 동행'], '학습자 포털 열기(새 창)', 'lp-open', code ? `체험 학번 <b>${esc(code.sid)}</b> · 접근코드 <b>${esc(code.code)}</b>` : `체험 ${esc(L)} 계정을 자동으로 만들어 드립니다.`)}</div></div>`;
}
{ const base = render; render = () => { if (S && S.org && UI.door) { document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim() + ' mode-door'; $('#app').innerHTML = doorHTML(); afterRender(); return; } document.body.classList.remove('mode-door'); return base(); }; }
/* 계정 메뉴(상단 오른쪽) — 운영 · 교수 스튜디오 공통 */
AFTER.push(() => {
  if (!S || !S.org || UI.door) return; const top = $('.top .topr'); if (!top || top.querySelector('.acm')) return;
  const T = scn() === 'teacher'; const rs = $('#roleSel'); if (rs) rs.hidden = T || (rs.closest('.mode-bld') && false);
  top.insertAdjacentHTML('beforeend', `<details class="acm"><summary aria-label="계정 메뉴"><span class="av ${T ? 't' : ''}">${esc(String(S.me.name || '').replace(/[^가-힣A-Za-z]/g, '').slice(0, 1) || 'U')}</span><span class="acn"><b>${esc(S.me.name)}</b><small>${T ? '교수 스튜디오' : '운영 스튜디오'}</small></span></summary>
    <div class="acp" role="menu"><small>데모 · 다른 계정으로 로그인</small><button type="button" role="menuitem" data-act="as-admin" ${T ? '' : 'disabled'}>${ic('gear', 15)} 운영자 — 운영 스튜디오</button><button type="button" role="menuitem" data-act="as-teacher" ${T ? 'disabled' : ''}>${ic('book', 15)} ${esc(t('teacher'))} — 교수 스튜디오</button><button type="button" role="menuitem" data-act="lp-open">${ic('users', 15)} ${esc(t('learner'))} — 학습자 포털(새 창)</button><hr><button type="button" role="menuitem" data-act="door">역할별 로그인 화면</button></div></details>`);
});
document.addEventListener('click', e => { const d = $('.acm[open]'); if (d && !e.target.closest('.acm')) d.removeAttribute('open'); });
/* 상단 역할 선택에서 교수자를 고르면 교수 스튜디오 로그인과 같게 */
document.addEventListener('change', e => { if (e.target.id !== 'roleSel' || !S || e.target.value !== 'teacher') return; e.stopImmediatePropagation(); e.target.value = S.me.role; asRole('teacher'); }, true);

/* ── 교수 스튜디오 화면 손질: 머리 · 진행 · 위치 ── */
AFTER.push(() => {
  if (!S || !S.org || UI.door || !bOn() || scn() !== 'teacher') return; const L = tCls();
  const sub = $('.mode-bld .top .brand .sub'); if (sub) sub.textContent = '교수 스튜디오';
  const h = $('.bch'); if (h) { const b = h.querySelector('b'), sm = h.querySelector('small'); if (b) b.textContent = 'AI 조교'; if (sm) sm.textContent = `${t('teacher')} 강의 비서 · 담당 ${L.length}개 ${t('cls')}`; h.closest('.bchat')?.setAttribute('aria-label', 'AI 조교 대화'); }
  const n = TQB().reduce((a, x) => a + (x.h === '개발할 항목' ? 0 : x.n), 0); const p = $('.bprog'); if (p) p.innerHTML = `<span>오늘 할 일</span><b>${n}건</b>`;
  $$('.bhd [data-act="bld-next"]').forEach(x => x.remove()); $('#lsGo')?.remove();
  const c = tCur(); const cr = $('.bhdl b'); if (cr && CUR.ws === 'home') cr.textContent = UI.tst === 'operate' && c ? `강의 운영 › ${c.name}` : UI.tst === 'report' && c ? `성과 · 개선 › ${c.name}` : '내 강의';
  const th = $('.bchat .thread'); if (th) th.scrollTop = th.scrollHeight;
});

/* ── 학습자 게시본: 튜터 설정(공개 가능한 값만) ── */
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); const tu = (S.settings && S.settings.tutor) || {}; r.tutor = { enabled: tu.enabled !== false, name: String(tu.name || 'AI 튜터').slice(0, 12), daily: clamp(+tu.daily || 20, 1, 200), help: tu.help === 'hint' ? 'hint' : 'feedback', loginOnly: true }; return r; }; }
COVER.push(['[신규] 역할별 AI SAM: 운영 스튜디오(AI SAM) · 교수 스튜디오(AI 조교 — 설계 · 개발 · 개설 · 운영 · 성과) · 학습자 포털(AI 튜터)', 'home', '']);
