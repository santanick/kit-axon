/* 디디쌤 스튜디오 v13 — 역할별 AI SAM 3개 시나리오
   ① 운영자: AI SAM(빌드 · 운영 비서) — v12 빌드 모드 그대로
   ② 교수자: AI 조교 — 담당 과목의 채점 초안 · 학생 질문 답변 초안 · 진도 미달 독려 · 수업 준비 · 주간 리포트를 대신 준비하고, 교수자가 확인 · 승인
   ③ 학습자: AI 튜터 — 학습자 포털 · 마이페이지에 붙는 튜터(learner.html · ltutor.js)를 체험 학습자로 미리 본다
   학습자 튜터가 '선생님께 넘긴 질문'은 교수자 AI 조교의 질문함(S.tq)으로 오고, 교수자가 보낸 답변은 학습자 튜터 · 마이페이지에 표시된다(mine.qa). */
'use strict';
/* 학습자 화면 미리보기(iframe)가 어드민 상태를 읽을 수 있게 — 같은 출처에서만 접근 가능 */
try { Object.defineProperty(window, 'S', { get: () => S, configurable: true }); } catch (e) { }
const SCN = [['admin', '운영자', 'AI SAM'], ['teacher', () => t('teacher'), 'AI 조교'], ['learner', () => t('learner'), 'AI 튜터']];
const scnL = k => { const x = SCN.find(s => s[0] === k) || SCN[0]; return typeof x[1] === 'function' ? x[1]() : x[1]; };
const scn = () => !S || !S.me ? 'admin' : S.me.scn === 'learner' ? 'learner' : S.me.role === 'teacher' ? 'teacher' : 'admin';
const scnSeg = () => `<div class="scn" role="tablist" aria-label="AI SAM 시나리오">${SCN.map(([k, , a]) => `<button type="button" role="tab" aria-selected="${scn() === k}" class="${scn() === k ? 'on' : ''}" data-act="scn" data-v="${k}"><b>${esc(scnL(k))}</b><small>${a}</small></button>`).join('')}</div>`;

/* ── 교수자 데이터 ── */
const tMe = () => (S.admins || []).find(a => a.role === 'teacher') || null;
const tCls = () => { const ids = (tMe() && tMe().classes) || []; const L = ids.map(C).filter(Boolean); return L.length ? L : S.classes.slice(0, 2); };
const tWho = (x) => x.sid ? esc(x.sid) : x.mid ? (S.org.type === 'univ' ? esc((M(x.mid)?.extra || {}).학번 || M(x.mid)?.sid || '학습자') : mn(x.mid)) : '학습자';
const tSid = id => { const m = M(id); return m ? (m.sid || (m.extra || {}).학번 || '') : ''; };
function tqEnsure() {
  if (!Array.isArray(S.tq)) { const L = tCls(); S.tq = (S.posts || []).filter(p => p.kind === '질문' && /(질문|해설|부탁|어떻게|끊|형식|\?)/.test(p.title)).filter((p, i, A) => A.findIndex(x => x.title === p.title) === i).slice(0, 4).map((p, i) => ({ id: 'tq_' + p.id, mid: p.who, sid: tSid(p.who), q: p.title, cls: (L[i % L.length] || {}).name || '', cid: (L[i % L.length] || {}).id || '', src: '게시판', st: 'open', at: p.at })); }
  try { Object.entries(typeof lpRead === 'function' ? lpRead() : {}).forEach(([sid, p]) => ((p && p.tutor && p.tutor.ask) || []).forEach(a => { if (a && a.id && !S.tq.some(x => x.id === a.id)) S.tq.unshift({ id: String(a.id).slice(0, 24), sid, q: String(a.q || '').slice(0, 400), cls: String(a.cls || '').slice(0, 60), cid: a.cid || '', where: a.where || '', src: 'AI 튜터', st: 'open', at: String(a.at || '').slice(0, 16).replace('T', ' ') }); })); } catch (e) { }
  return S.tq;
}
window.tqAdd = x => { if (!S || !x || !x.q) return; tqEnsure(); if (S.tq.some(y => y.id === x.id)) return; S.tq.unshift({ id: String(x.id).slice(0, 24), sid: String(x.sid || '').slice(0, 20), q: String(x.q).slice(0, 400), cls: String(x.cls || '').slice(0, 60), cid: x.cid || '', where: x.where || '', src: 'AI 튜터', st: 'open', at: nowStr() }); logAudit('AI 튜터 → 교수자 질문 전달'); save(); toast(`학습자 AI 튜터가 ${t('teacher')}에게 질문을 넘겼습니다.`, 'ok'); };
function tData() {
  const L = tCls(); const ids = new Set(L.map(c => c.id)); tqEnsure();
  const P = pend().filter(x => ids.has(x.c.id)); const Q = S.tq.filter(x => x.st !== 'answered' && (!x.cid || ids.has(x.cid) || L.some(c => c.name === x.cls)));
  const R = L.flatMap(c => Object.entries(c.prog).filter(([, p]) => p.p < 40).map(([id, p]) => ({ c, id, p }))); const prep = L.filter(c => (c.curriculum || []).some(it => it.type === 'video' && !(it.yt || it.url)));
  return { L, P, Q, R, prep };
}
function tDraft(x) {
  const c = (x.cid && C(x.cid)) || S.classes.find(k => k.name === x.cls); const it = c && (c.curriculum || []).find(i => i.type !== 'chapter' && /[가-힣A-Za-z]{2}/.test(i.title) && String(x.q).includes(i.title.slice(0, 2)));
  const nx = c && (c.curriculum || []).find(i => i.type === 'video'); const quiz = /퀴즈|문제|해설/.test(x.q); const fmt = /형식|제출|양식|분량/.test(x.q); const err = /끊|오류|안\s*(돼|되|나와)|재생/.test(x.q);
  const body = err ? '영상이 끊기면 화면 오른쪽 아래 설정에서 화질을 낮추고, 다른 브라우저(크롬 권장)로 다시 열어 보세요. 그래도 안 되면 사용 기기와 시간을 알려 주시면 운영팀에 전달하겠습니다.'
    : fmt ? `과제는 ① 요구사항 요약 ② 내 결과물(이미지 · 표 · 글) ③ 느낀 점 3줄 순서로, A4 1장 안팎이면 충분합니다. 평가 기준은 요구사항 충족 40 · 정확성 30 · 완성도 20 · 형식 10입니다.`
    : quiz ? `해당 문제는 개념을 실제 상황에 적용하는지 묻는 문항입니다. 정답만 외우기보다 '왜 그 선택지가 맞는지'를 ${nx ? `「${nx.title}」 영상의 예시와` : '수업 예시와'} 연결해 보세요. 핵심 근거는 수업 자료 요약 부분에 정리되어 있습니다.`
    : `좋은 질문입니다. ${it ? `「${it.title}」에서 다룬 내용과 연결됩니다. ` : ''}핵심은 개념을 내 과제에 직접 적용해 보는 것입니다. 수업 자료의 예시를 한 번 따라 해 보고, 막히는 단계가 있으면 그 화면을 캡처해 다시 질문해 주세요.`;
  return `${body}\n— ${c ? c.name : ''} ${t('teacher')}`.trim();
}

/* ── 교수자 화면: 오늘 할 일 줄 · 브리핑 캔버스 · 대화 칩 ── */
const TQ = d => [
  { k: 'grade', h: '채점 대기', n: d.P.length, u: '건', q: '채점 대기 과제 AI로 1차 채점해줘', d: '루브릭 초안 → 확정은 직접' },
  { k: 'qa', h: '학생 질문', n: d.Q.length, u: '건', q: '학생 질문 답변 초안 만들어줘', d: 'AI 튜터가 넘긴 질문 포함' },
  { k: 'risk', h: '진도 위험', n: d.R.length, u: '명', q: '진도 미달 학생에게 독려 메시지 보내줘', d: '진도 40% 미만' },
  { k: 'prep', h: '수업 준비', n: d.prep.length, u: '과목', q: `다음 주 수업 강의자료 · 퀴즈 만들어줘`, d: '영상 · 자료 빈 차시' },
  { k: 'rep', h: '주간 리포트', n: d.L.length, u: '과목', q: '이번 주 수업 리포트 정리해줘', d: '과목별 진도 · 제출 · 위험' }
];
function tStrip() { const d = tData(); return `<div class="bsteps tsteps" role="list">${TQ(d).map((x, i) => `<button type="button" role="listitem" class="bst ${x.k !== 'rep' && !x.n ? 'ok' : i === TQ(d).findIndex(y => y.k !== 'rep' && y.n) ? 'on' : ''}" data-act="chat-q" data-v="${esc(x.q)}"><small>TODAY ${i + 1}</small><b>${esc(x.h)} ${x.k === 'rep' ? '' : x.n + x.u}</b><i>${x.k !== 'rep' && !x.n ? '완료' : esc(x.d)}</i></button>`).join('')}</div>`; }
function tHome() {
  const d = tData(); const U = S.org.type === 'univ';
  return `<section class="brief">${TQ(d).slice(0, 4).map(b => `<div class="bc ${b.n ? 'hot' : ''}"><span>${esc(b.h)}</span><b>${b.n}<small>${b.u}</small></b><button class="btn sm ${b.n ? 'ink' : ''}" data-act="chat-q" data-v="${esc(b.q)}" ${b.n ? '' : 'disabled'}>${ic('spark', 14)} AI 조교에게 맡기기</button></div>`).join('')}</section>
  <div class="tcl">${d.L.map(c => { const v = Object.values(c.prog); const sub = v.filter(p => p.assign === 'submitted').length; const rk = v.filter(p => p.p < 40).length; const av = Math.round(avgP(c));
    return `<div class="card tcc"><div class="bct"><b>${esc(c.name)}</b>${tag(c.status, c.status === '운영중' ? 'g' : '')}</div><div class="tcm"><span><b>${c.learners.length}</b>명</span><span><b>${av}</b>% 평균 진도</span><span><b>${sub}</b>건 채점 대기</span><span class="${rk ? 'r' : ''}"><b>${rk}</b>명 진도 위험</span></div><div class="tbar"><i style="width:${av}%"></i></div><div class="bar2"><button class="btn sm" data-act="go" data-v="class">${esc(t('cls'))} 열기</button><button class="btn sm ai" data-act="chat-q" data-v="${esc(`「${c.name}」 이번 주 리포트 정리해줘`)}">${ic('spark', 13)} 리포트</button></div></div>`; }).join('')}</div>
  <div class="card"><div class="ch"><b>학생 질문함</b><small>학습자 AI 튜터가 넘긴 질문 · 게시판 질문 — 답변은 학습자 튜터와 마이페이지에 표시됩니다</small><span class="sp"></span>${d.Q.length ? `<button class="btn sm ink" data-act="chat-q" data-v="학생 질문 답변 초안 만들어줘">${ic('spark', 14)} 답변 초안 ${d.Q.length}건</button>` : ''}</div>
    ${table([U ? '학번' : t('learner'), t('cls'), '질문', '출처', '상태', ''], tqEnsure().slice(0, 12).map(x => [tWho(x), esc(x.cls || '—'), `<span class="tq">${esc(x.q)}</span>`, x.src === 'AI 튜터' ? tag('AI 튜터', 'mg') : tag(x.src || '게시판'), x.st === 'answered' ? tag('답변함', 'g') : x.draft ? tag('초안', 'y') : tag('답변 대기', 'y'), x.st === 'answered' ? '' : `<button class="btn sm" data-act="tq-open" data-v="${esc(x.id)}">${ic('spark', 13)} 답변</button>`]))}</div>
  <div class="card"><div class="ch"><b>진도 위험 ${esc(t('learner'))}</b><small>진도 40% 미만 · ${U ? '학번만 표시' : '담당 과목 기준'}</small><span class="sp"></span>${d.R.length ? `<button class="btn sm ink" data-act="chat-q" data-v="진도 미달 학생에게 독려 메시지 보내줘">${ic('spark', 14)} 독려 메시지</button>` : ''}</div>
    ${table([U ? '학번' : '이름', t('cls'), '진도', '최근 접속'], d.R.slice(0, 10).map(x => [U ? esc(tSid(x.id) || '—') : mn(x.id), esc(x.c.name), `${x.p.p}%`, esc(M(x.id)?.last || '—')]))}</div>`;
}
function tComposer() {
  const d = tData(); const chips = TQ(d).filter(x => x.n).map(x => x.q).slice(0, 4);
  return `<form class="composer bcomp" data-where="bld"><div class="chips">${chips.map(x => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="cbox"><textarea rows="1" maxlength="300" placeholder="AI 조교에게 수업 업무를 맡기세요" aria-label="AI 조교에게 지시"></textarea><button class="send" type="submit" aria-label="보내기">${ic('send', 18)}</button></div>
    <small class="cnote"><span><kbd>Enter</kbd> 보내기</span><span>${typeof CL !== 'undefined' && CL.on('chat') ? esc(CL.label()) + ' 연결됨' : '규칙 엔진(데모)'}</span><span>발송 · 확정은 ${esc(t('teacher'))} 승인 후</span></small></form>`;
}
{ const b1 = bStrip; bStrip = () => scn() === 'teacher' ? tStrip() : b1(); }
{ const b2 = bHome; bHome = () => scn() === 'teacher' ? tHome() : b2(); }
{ const b3 = bComposer; bComposer = () => scn() === 'teacher' ? tComposer() : b3(); }
/* 운영자 전용 빌드 안내(단계 완료 축하)는 교수자 · 학습자 화면에서 끄기 */
AFTER.forEach((f, i) => { if (/bld\.seen/.test(String(f))) AFTER[i] = () => { if (scn() === 'admin') f(); }; });
function tGreet() { const d = tData(); const n = d.P.length + d.Q.length + d.R.length; return { role: 'ai', text: `안녕하세요, ${t('teacher')}님의 AI 조교입니다.\n담당 ${d.L.length}개 ${t('cls')}을 살펴보니 오늘 처리할 일이 ${n ? `${n}건 있습니다 — 채점 대기 ${d.P.length}건 · 학생 질문 ${d.Q.length}건 · 진도 위험 ${d.R.length}명.` : '없습니다.'}\n채점 초안 · 답변 초안 · 독려 메시지는 제가 준비하고, 확정과 발송은 ${t('teacher')}님이 승인하시면 처리합니다.`, html: `<div class="bqs">${TQ(d).filter(x => x.n).slice(0, 3).map(x => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(x.q)}">${esc(x.q)}</button>`).join('')}</div>` }; }

/* ── 교수자 대화: AI 조교 의도 ── */
{ const base = answer; answer = q => { if (scn() !== 'teacher') return base(q); const s = String(q || '').trim(); const d = tData(); const L = d.L;
  const one = L.find(c => s.includes(c.name)); const ids = new Set((one ? [one] : L).map(c => c.id));
  if (/(오늘|지금).{0,6}(할\s*일|뭐)|브리핑/.test(s)) { const g = tGreet(); delete g.role; return { ...g, nav: 'home' }; }
  if (/채점/.test(s)) { const P = d.P.filter(x => ids.has(x.c.id)); if (!P.length) return { text: '담당 과목에 채점 대기 과제가 없습니다.' };
    const pid = uid('p'); PLANS[pid] = { run: () => { P.forEach(x => { x.c.prog[x.id].draft = AI.gradeDraft(x.c, x.id); }); logAudit(`AI 조교 채점 초안 ${P.length}건`); return `채점 초안 ${P.length}건을 만들었습니다. 평가 화면에서 초안 점수 · 피드백을 확인하고 [채점]으로 확정하세요. 최종 판정은 ${t('teacher')}님이 합니다.`; }, go: 'assess' };
    return { title: '채점 초안', text: `채점 대기 ${P.length}건에 루브릭(요구사항 40 · 정확성 30 · 완성도 20 · 형식 10)을 적용해 점수 · 피드백 초안을 만들까요?`, steps: ['제출물 · 루브릭 대조', '점수 · 피드백 초안 작성', '평가 화면에 초안 표시', `${t('teacher')} 확인 후 확정 · 배지 자동 발급`], plan: pid, state: 'pending', cta: `초안 ${P.length}건 만들기` }; }
  if (/질문/.test(s) && /(답|초안|정리|요약|처리)/.test(s)) { const Q = d.Q.filter(x => !one || x.cid === one.id || x.cls === one.name).slice(0, 6); if (!Q.length) return { text: '답변을 기다리는 학생 질문이 없습니다.', nav: 'home' };
    Q.forEach(x => { if (!x.draft) x.draft = tDraft(x); }); save(); const pid = uid('p');
    PLANS[pid] = { run: () => { Q.forEach(x => { x.st = 'answered'; x.a = x.draft; x.aAt = nowStr(); }); logAudit(`AI 조교 답변 ${Q.length}건 발송(${t('teacher')} 승인)`); return `답변 ${Q.length}건을 보냈습니다. ${t('learner')}의 AI 튜터와 마이페이지에 표시됩니다.`; }, go: 'home' };
    return { title: '질문 답변 초안', text: `답변을 기다리는 질문 ${Q.length}건의 초안입니다. 고칠 답변은 질문함의 [답변]에서 수정하고, 그대로 보내도 되면 승인하세요.`, html: `<div class="tqd">${Q.map(x => `<div><small>${tWho(x)} · ${esc(x.cls || '')} · ${esc(x.src || '')}</small><b>Q. ${esc(x.q)}</b><p>${esc(x.draft).replace(/\n/g, '<br>')}</p></div>`).join('')}</div>`, plan: pid, state: 'pending', cta: `답변 ${Q.length}건 보내기` }; }
  if (/(독려|미달|부진|위험|안\s*들어|미접속)/.test(s)) { const R = d.R.filter(x => ids.has(x.c.id)); if (!R.length) return { text: '진도 40% 미만 학생이 없습니다.' };
    const ttl = `${one ? one.name : '수업'} 진도 안내`; const body = `이번 주 진도가 조금 늦어지고 있어요. 남은 영상 1개만 먼저 들어도 진도가 올라갑니다. 막히는 부분은 학습 화면의 AI 튜터에게 물어보거나 질문을 남겨 주세요.`; const pid = uid('p');
    PLANS[pid] = { run: () => { S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: `${one ? one.name : `담당 ${t('cls')}`} 진도 미달 ${R.length}명`, title: ttl, ch: '앱 푸시 + 이메일', n: R.length }); logAudit(`AI 조교 독려 메시지 ${R.length}명`); return `독려 메시지를 ${R.length}명에게 보냈습니다. 학습자 AI 튜터도 다음 접속 때 오늘 할 일로 안내합니다.`; }, go: 'message' };
    return { title: '독려 메시지', text: `진도 40% 미만 ${R.length}명에게 보낼 메시지 초안입니다.`, html: `<div class="pvmsg"><b>${esc(ttl)}</b><p>${esc(body)}</p></div>`, steps: [`대상: ${[...new Set(R.map(x => x.c.name))].join(' · ')} 진도 40% 미만 ${R.length}명`, '앱 푸시 + 이메일 발송', '발송 내역 기록'], plan: pid, state: 'pending', cta: `${R.length}명에게 보내기` }; }
  if (/(리포트|보고|현황|정리해)/.test(s) && !/질문/.test(s)) { const LL = one ? [one] : L;
    return { title: '주간 수업 리포트', text: `${one ? `「${one.name}」` : `담당 ${LL.length}개 ${t('cls')}`} 이번 주 리포트입니다.`, html: `<div class="trep">${LL.map(c => { const v = Object.values(c.prog); return `<div><b>${esc(c.name)}</b><span>수강 ${c.learners.length}명 · 평균 진도 ${Math.round(avgP(c))}% · 이수 ${v.filter(p => p.p >= c.criteria.threshold).length}명 · 채점 대기 ${v.filter(p => p.assign === 'submitted').length}건 · 진도 위험 ${v.filter(p => p.p < 40).length}명</span></div>`; }).join('')}<p class="mini">질문 ${d.Q.length}건 대기 · AI 튜터 질문 수(7일) ${(S.tutorUsage || []).reduce((a, u) => a + (u.n || 0), 0)}회</p></div>`, nav: 'home' }; }
  if (/(강의\s*자료|수업\s*자료|강의안|퀴즈|수업\s*준비|차시)/.test(s)) { const r = base(s); if (r && r.text && !/정확히 이해하지 못/.test(r.text)) return r; return { text: `「${(one || L[0] || {}).name || ''}」 ${t('cls')} 화면에서 차시를 고르면 강의자료 · 퀴즈 초안을 바로 만듭니다.`, nav: 'class' }; }
  return base(q);
}; }
/* Claude 연결 시: 교수자 화면이면 AI 조교 역할로 */
if (typeof CL !== 'undefined') { const base = CL.call.bind(CL); CL.call = o => { if (scn() === 'teacher' && o && typeof o.system === 'string' && /AI SAM/.test(o.system)) { const d = tData(); o = { ...o, system: `당신은 교육기관의 ${t('teacher')}을 돕는 AI 조교입니다. 담당 ${t('cls')}: ${d.L.map(c => c.name).join(', ')}. 오늘: 채점 대기 ${d.P.length}건, 답변 대기 질문 ${d.Q.length}건, 진도 40% 미만 ${d.R.length}명. 채점 · 답변 · 메시지는 초안만 만들고 확정과 발송은 ${t('teacher')}이 승인합니다. 학습자 개인 이름 · 연락처를 쓰지 않습니다. 실행이 필요하면 studio_action 도구로 짧은 한국어 지시를 넘깁니다(예: "채점 대기 과제 AI로 1차 채점해줘", "학생 질문 답변 초안 만들어줘", "진도 미달 학생에게 독려 메시지 보내줘"). 문어체로 간결하게 답합니다.` }; } return base(o); }; }

/* ── 질문 답변 편집 ── */
ACT['tq-open'] = el => { const x = tqEnsure().find(y => y.id === el.dataset.v); if (!x) return; if (!x.draft) x.draft = tDraft(x);
  modal('학생 질문 답변', `<p class="mini">${tWho(x)} · ${esc(x.cls || '')} · ${esc(x.src || '')}${x.where ? ' · ' + esc(x.where) : ''}</p><div class="aibox"><b>Q.</b> ${esc(x.q)}</div><label class="fl">답변(AI 조교 초안 — 고쳐서 보내세요)<textarea id="tqA" rows="6" maxlength="2000">${esc(x.draft)}</textarea></label><p class="mini">보낸 답변은 ${esc(t('learner'))}의 AI 튜터와 마이페이지에 표시됩니다.</p>`, [{ id: 'c', label: '닫기' }, { id: 'ok', label: '답변 보내기', kind: 'pri', run: () => { ACT['tq-send']({ dataset: { v: x.id } }); return false; } }]); };
ACT['tq-send'] = el => { const x = tqEnsure().find(y => y.id === (el.dataset.v || '')); const a = ($('#tqA') || {}).value; if (!x || !a || !a.trim()) { toast('답변을 입력하세요.', 'warn'); return; } x.a = a.trim().slice(0, 2000); x.draft = x.a; x.st = 'answered'; x.aAt = nowStr(); logAudit(`학생 질문 답변 — ${x.cls || ''}`); save(); closeModal(); render(); toast('답변을 보냈습니다. 학습자 AI 튜터에 표시됩니다.', 'ok'); };

/* ── 시나리오 전환 · 대화 분리 ── */
ACT.scn = el => { const v = el.dataset.v; const cur = scn(); if (v === cur) return;
  S.chats = S.chats || {}; S.chats[cur] = S.chat; S.me.scn = v === 'learner' ? 'learner' : '';
  if (v === 'teacher') S.me.role = 'teacher'; else if (S.me.role === 'teacher') S.me.role = 'owner';
  S.chat = S.chats[v] || []; if (v === 'teacher' && !S.chat.length) S.chat.push(tGreet()); if (v === 'admin' && !S.chat.length && S.bld && !bAllDone()) { const c = bCur(); if (c) S.chat.push(bGuideMsg(c.id)); }
  logAudit(`${scnL(v)} 시나리오 화면`); save(); CUR = { ws: 'home', tab: '' }; document.body.classList.remove('b-pv'); render();
  toast(v === 'teacher' ? `${t('teacher')} 화면 — AI 조교가 담당 ${t('cls')} 업무를 준비합니다.` : v === 'learner' ? `${t('learner')} 화면 — 학습자 포털 · 마이페이지의 AI 튜터를 미리 봅니다.` : '운영자 화면 — AI SAM 빌드 · 운영 비서입니다.'); };
/* 상단 역할 선택에서 교수자를 고르면 교수자 시나리오와 같게 */
document.addEventListener('change', e => { if (e.target.id !== 'roleSel' || !S) return; S.me.scn = ''; setTimeout(() => { if (scn() === 'teacher' && !(S.chats && S.chats.teacher) && !S.chat.some(m => /AI 조교/.test(m.text || ''))) { S.chats = S.chats || {}; S.chats.admin = S.chat; S.chat = [tGreet()]; save(); render(); } }, 0); }, true);

/* ── 학습자 시나리오: 체험 학습자로 학습자 포털 · 마이페이지 + AI 튜터 미리보기 ── */
function lxDemo() {
  const L = tCls(); const c = L[0] || S.classes[0]; if (!c) return null; S.codes = S.codes || [];
  let code = S.codes.find(x => x.demo); if (code) return code;
  const id = c.learners.find(i => c.prog[i] && c.prog[i].p >= 25 && c.prog[i].p <= 70) || c.learners[0]; const m = M(id); if (!m) return null;
  const sid = m.sid || (m.extra || {}).학번 || ('2026' + String(9000 + S.codes.length)); m.sid = sid; m.extra = { ...(m.extra || {}), 학번: (m.extra || {}).학번 || sid };
  const g = c.prog[id]; g.assign = 'returned'; g.score = 62; g.fb = '요구사항 2번(활용 사례 비교)이 빠졌습니다. 사례 2개를 표로 비교하고, 내 전공에 적용할 점을 한 줄 덧붙여 다시 제출하세요.';
  code = { sid, dept: (S.groups.find(x => x.id === m.group) || {}).name || '', code: 'DEMO' + String(Math.floor(1000 + Math.random() * 8999)), at: today(), demo: true }; S.codes.push(code); logAudit('체험 학습자 접근코드 발급(데모)'); save(); return code;
}
let LXV = { dev: 'pc', page: 'my' };
function lxRender() {
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim() + ' mode-app mode-bld mode-lx';
  const codes = (S.codes || []).slice(0, 30); const as = LXV.as || ((codes.find(x => x.demo) || codes[0] || {}).sid) || ''; const tu = S.settings.tutor; tqEnsure();
  const ask = S.tq.filter(x => x.src === 'AI 튜터'); const ans = S.tq.filter(x => x.st === 'answered' && x.sid === as);
  const src = `learner.html?preview=1${as ? '&as=' + encodeURIComponent(as) : ''}#${LXV.page}`;
  $('#app').innerHTML = `
  <header class="top"><div class="brand"><span class="logo">D</span><b>${esc(S.org.name)}</b><span class="sub">스튜디오</span></div>${scnSeg()}<div class="topr"><button class="btn sm ghost bclassic" data-act="bld-off">클래식 화면</button></div></header>
  <div class="lxv">
    <aside class="lxs" aria-label="학습자 AI 튜터 미리보기 설정">
      <div class="lxh"><span class="orb">${ic('spark', 18)}</span><div><b>${esc(t('learner'))} AI 튜터</b><small>학습자 포털 · 마이페이지에 붙는 1:1 튜터</small></div></div>
      <p class="mini">로그인한 ${esc(t('learner'))}의 진단 유형 · 과정 진도 · 과제 피드백 · 배지 · 학습 달력을 바탕으로 동작합니다. 미리보기 화면은 실제 학습자 화면입니다(기록 저장 안 함).</p>
      <label class="fl">체험 ${esc(t('learner'))}<select data-chg="lx-as">${codes.length ? codes.map(x => `<option value="${esc(x.sid)}" ${x.sid === as ? 'selected' : ''}>${esc(x.sid)}${x.demo ? ' · 체험 데이터' : ''}${x.dept ? ' · ' + esc(x.dept) : ''}</option>`).join('') : '<option value="">등록된 학습자 없음</option>'}<option value="">로그인 전 화면</option></select></label>
      ${codes.some(x => x.demo) ? '' : `<button class="btn sm ink blk" data-act="lx-demo">${ic('spark', 14)} 체험 ${esc(t('learner'))} 만들기</button><p class="mini">담당 ${esc(t('cls'))} 수강생 1명에게 데모 접근코드를 발급하고, 재제출 피드백 1건을 예시로 넣습니다.</p>`}
      <div class="seg2 lxseg" role="tablist">${[['my', '마이페이지'], ['home', '포털 홈'], ['courses', '코스']].map(([k, l]) => `<button role="tab" aria-selected="${LXV.page === k}" class="${LXV.page === k ? 'on' : ''}" data-act="lx-page" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="seg2 lxseg" role="tablist">${[['pc', 'PC'], ['mo', '모바일 390']].map(([k, l]) => `<button role="tab" aria-selected="${LXV.dev === k}" class="${LXV.dev === k ? 'on' : ''}" data-act="lx-dev" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="card lxc"><div class="bct"><b>AI 튜터가 하는 일</b></div><ol class="lxl"><li><b>오늘 할 일 브리핑</b><small>재제출 · 이어 학습 · 미션 · 마감 임박</small></li><li><b>맡기기</b><small>이번 주 학습 계획 · 복습 퀴즈 · 마감 맞춤</small></li><li><b>코칭</b><small>과제 피드백 해설 · 다음 단계 · 유형별 추천</small></li><li><b>질문 답</b><small>지금 보는 레슨 맥락 · 힌트로 스스로 풀기(대필 안 함)</small></li><li><b>${esc(t('teacher'))}께 넘기기</b><small>AI 조교 질문함으로 전달 → 답변이 튜터에 표시</small></li></ol></div>
      <div class="card lxc"><div class="bct"><b>튜터 설정</b>${tag(tu.enabled ? '사용 중' : '꺼짐', tu.enabled ? 'g' : '')}</div><dl class="bdl"><dt>이름</dt><dd>${esc(tu.name)}</dd><dt>도움 범위</dt><dd>${tu.help === 'hint' ? '힌트만' : '초안을 평가 기준으로 피드백'}</dd><dt>하루 한도</dt><dd>${+tu.daily || 20}회 / 1인</dd><dt>교수자 연결</dt><dd>넘긴 질문 ${ask.length}건 · 이 학습자 답변 ${ans.length}건</dd></dl><button class="btn sm" data-act="lx-set">운영자 화면에서 튜터 설정</button></div>
    </aside>
    <main id="main" class="lxf"><div class="lxdev ${LXV.dev}"><iframe id="lxFrame" src="${esc(src)}" title="학습자 화면 미리보기"></iframe></div></main>
  </div>`;
  afterRender();
}
{ const base = render; render = () => { if (S && S.org && bOn() && scn() === 'learner') return lxRender(); document.body.classList.remove('mode-lx'); return base(); }; }
ACT['lx-demo'] = () => { const c = lxDemo(); if (!c) { toast('먼저 과정을 만들어 주세요.', 'warn'); return; } LXV.as = c.sid; render(); toast(`체험 ${t('learner')} ${c.sid}로 학습자 화면을 엽니다.`, 'ok'); };
ACT['lx-as'] = el => { LXV.as = el.value; render(); };
ACT['lx-page'] = el => { LXV.page = el.dataset.v; render(); };
ACT['lx-dev'] = el => { LXV.dev = el.dataset.v; render(); };
ACT['lx-set'] = () => { ACT.scn({ dataset: { v: 'admin' } }); go('progress'); };

/* ── 교수자 · 학습자 화면 공통 손질(상단 시나리오 전환 · 대화 머리 · 진행 표시) ── */
AFTER.push(() => {
  if (!S || !S.org || !bOn() || scn() === 'learner') return;
  const top = $('.mode-bld .top'); if (top && !top.querySelector('.scn')) top.querySelector('.brand')?.insertAdjacentHTML('afterend', scnSeg());
  const rs = $('#roleSel'); if (rs) rs.hidden = scn() !== 'admin';
  if (scn() !== 'teacher') return; const d = tData(); const n = d.P.length + d.Q.length + d.R.length;
  const h = $('.bch'); if (h) { const b = h.querySelector('b'), sm = h.querySelector('small'); if (b) b.textContent = 'AI 조교'; if (sm) sm.textContent = `${t('teacher')} 수업 비서 · 담당 ${d.L.length}개 ${t('cls')}`; h.closest('.bchat')?.setAttribute('aria-label', 'AI 조교 대화'); }
  const p = $('.bprog'); if (p) p.innerHTML = `<span>오늘 할 일</span><b>${n}건</b>`;
  $$('.bhd [data-act="bld-next"]').forEach(x => x.remove()); const cr = $('.bhdl b'); if (cr && CUR.ws === 'home') cr.textContent = '오늘의 수업';
  const th = $('.bchat .thread'); if (th) th.scrollTop = th.scrollHeight;
});

/* ── 학습자 게시본: 튜터 설정(공개 가능한 값만) ── */
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); const tu = (S.settings && S.settings.tutor) || {}; r.tutor = { enabled: tu.enabled !== false, name: String(tu.name || 'AI 튜터').slice(0, 12), daily: clamp(+tu.daily || 20, 1, 200), help: tu.help === 'hint' ? 'hint' : 'feedback', loginOnly: !!tu.loginOnly }; return r; }; }
COVER.push(['[신규] 역할별 AI SAM: 운영자 AI SAM · 교수자 AI 조교 · 학습자 AI 튜터(포털 · 마이페이지)', 'home', '']);
