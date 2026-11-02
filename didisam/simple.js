/* 디디쌤 스튜디오 v17 — 쉬운 화면: AI SAM의 일을 3가지 역할로 나눈다
   ① 시작 세팅 — 사이트 · 과정 · 학습자 등록 · 포털 게시까지 첫 준비(교수자: 강의 준비 = 설계 · 개발 · 개설)
   ② 교육 운영 — 과정 설계 · 수시 개설 · 평가 · 질문 · 학습 독려 · 공지
   ③ 리포트 · 학습관리 — 현황 · 위험 학습자 · 이수 · 보고서
   첫 화면 = 인사 + '지금 할 일' 1개 + 역할 3칸(할 일 3개씩) + 대화. 왼쪽 메뉴는 홈 · 세팅 · 운영 · 리포트 4개 + 전체 메뉴. */
'use strict';
const SM_MODES = {
  admin: [
    { k: 'setup', s: '세팅', ic: 'gear', n: '시작 세팅', d: '사이트 · 과정 · 학습자 등록까지 처음 준비를 AI SAM이 함께합니다' },
    { k: 'run', s: '운영', ic: 'book', n: '교육 운영', d: '과정 설계 · 수시 개설 · 평가 · 학습 독려를 맡깁니다' },
    { k: 'report', s: '리포트', ic: 'chart', n: '리포트 · 학습관리', d: '현황 · 위험 학습자 · 이수 · 보고서를 한 번에 봅니다' }],
  teacher: [
    { k: 'setup', s: '준비', ic: 'gear', n: '강의 준비', d: '설계 → 콘텐츠 개발 → 개설까지 AI 조교가 함께합니다' },
    { k: 'run', s: '운영', ic: 'book', n: '강의 운영', d: '질문 답변 · 채점 · 독려 · 공지를 맡깁니다' },
    { k: 'report', s: '성과', ic: 'chart', n: '성과 · 학습관리', d: '진도 · 이수 · 성적과 다음 개선점을 봅니다' }]
};
const smRole = () => (typeof scn === 'function' && scn() === 'teacher') ? 'teacher' : 'admin';
/* v20: 3역할 홈은 기본 끔(대표님 '지금 화면이 더 어려워 — 클래식 살려줘'). S.ui.simple === true일 때만 */
const smOn = () => !!(S && S.org && (S.ui || {}).simple === true);
/* 측정 */
function smCls() { return smRole() === 'teacher' ? tCls() : (S.classes || []); }
function smStat() { const C = smCls(); const run = C.filter(c => c.status === '운영중'); const P = run.flatMap(c => (c.learners || []).map(id => +((c.prog || {})[id] || {}).p || 0));
  const thr = c => (c.criteria && c.criteria.threshold) || 80; const done = run.reduce((s, c) => s + (c.learners || []).filter(id => (+((c.prog || {})[id] || {}).p || 0) >= thr(c)).length, 0);
  const ids = new Set(C.map(c => c.id)); const Q = (typeof tqEnsure === 'function' ? tqEnsure() : []).filter(x => x.st !== 'answered' && (smRole() !== 'teacher' || ids.has(x.cid) || C.some(c => c.name === x.cls)));
  const posts = smRole() === 'teacher' ? 0 : (S.posts || []).filter(p => p.kind === '질문' && !p.replies).length;
  const M = S.members || []; const away = M.filter(m => typeof daysAgo === 'function' && daysAgo(m.last) >= 14).length;
  return { courses: C.length, running: run.length, draft: C.filter(c => c.status === '준비중').length, learners: smRole() === 'teacher' ? new Set(run.flatMap(c => c.learners || [])).size : M.length,
    avg: P.length ? Math.round(P.reduce((a, b) => a + b, 0) / P.length) : 0, rate: P.length ? Math.round(done / P.length * 100) : 0,
    grade: C.reduce((s, c) => s + Object.values(c.prog || {}).filter(p => p.assign === 'submitted').length, 0), qs: Q.length + posts,
    slow: run.reduce((s, c) => s + (c.learners || []).filter(id => (+((c.prog || {})[id] || {}).p || 0) < 30).length, 0), away, active: M.length ? Math.round((M.length - away) / M.length * 100) : 0,
    legal: typeof legalUndone === 'function' && ['corp', 'public'].includes(S.org.type) ? new Set(legalUndone().map(x => x.id)).size : 0 }; }
/* 할 일: { m 역할, l 이름, n 건수(0이면 할 일 없음), u 단위, ask AI에게 맡길 지시, go 직접 볼 화면, act 바로 실행 } */
function smTasks() { const r = smRole(); const st = smStat(); const L = t('learner'), K = t('cls'); const T = [];
  if (r === 'admin') {
    (typeof bList === 'function' ? bList() : []).forEach(s => { const q = (typeof bQ === 'function' ? bQ(s.id) : [])[0]; T.push({ m: 'setup', id: 'b-' + s.id, l: bName(s), d: (bStep(s.id) || {}).d || '', n: bDone(s.id) ? 0 : 1, done: bDone(s.id), req: !!s.req, ask: q, step: s.id, go: s.view && s.view !== 'home' ? s.view : '' }); });
    T.push({ m: 'run', l: `새 ${K} 설계`, d: '주제 · 대상 · 기간만 말하면 커리큘럼 초안을 만듭니다', n: 0, ask: `${S.org.type === 'univ' ? '생성형 AI 활용 8주 교과목' : '생성형 AI 업무 활용 4주 과정'} 설계해줘`, go: 'class', always: 1 });
    T.push({ m: 'run', l: `준비 중인 ${K} 개설`, n: st.draft, u: '개', d: '공개 범위 · 기간 · 수강생을 정해 엽니다', go: 'class' });
    T.push({ m: 'run', l: '채점 대기 과제', n: st.grade, u: '건', d: 'AI가 루브릭으로 1차 채점 초안을 만듭니다', ask: '채점 대기 과제 AI로 1차 채점해줘', go: 'assess' });
    T.push({ m: 'run', l: '답변 안 한 질문', n: st.qs, u: '건', d: '답변 초안을 만들어 확인 후 보냅니다', ask: '미답변 질문에 답변 초안 만들어줘', go: 'community' });
    if (st.legal) T.push({ m: 'run', l: '법정의무교육 미이수', n: st.legal, u: '명', d: '마감 안내를 보내고 부서장 리포트를 만듭니다', ask: '법정교육 미이수자에게 마감 안내 보내줘', go: 'compliance' });
    T.push({ m: 'run', l: `진도 부진 ${L}`, n: st.slow, u: '명', d: '진도 30% 미만에게 독려 메시지를 보냅니다', ask: `진도 30% 미만 ${L}에게 독려 메시지 보내줘` });
    T.push({ m: 'report', l: '이번 주 운영 요약', n: 0, d: '지표 · 변화 · 할 일을 한 장으로 정리합니다', ask: '이번 주 운영 현황 요약해줘', always: 1 });
    T.push({ m: 'report', l: '실적 보고서 내려받기', n: 0, d: '한글 · Word에서 열리는 보고서', act: 'seg-report', always: 1 });
    T.push({ m: 'report', l: `14일 이상 미접속 ${L}`, n: st.away, u: '명', d: '복귀 안내를 보냅니다', ask: `14일 미접속 ${L}에게 독려 메시지 보내줘`, go: 'members' });
    T.push({ m: 'report', l: `${L} 관리`, n: 0, d: `${t('group')}별 명단 · 진도 · 접속 기록`, go: 'members', always: 1 });
  } else {
    const C = tCls(); C.filter(c => !['operate', 'report'].includes(tStageOf(c).id)).forEach(c => { const s = tStageOf(c); T.push({ m: 'setup', l: `${c.name} — ${s.n}`, d: s.st ? s.st(c) : '', n: 1, cid: c.id, sid: s.id }); });
    T.push({ m: 'setup', l: `새 ${K} 설계`, d: '주제 · 기간을 말하면 설계부터 시작합니다', n: 0, ask: `생성형 AI 활용 8주 ${K} 설계해줘`, always: 1 });
    T.push({ m: 'run', l: `${L} 질문 답변`, n: st.qs, u: '건', d: 'AI 조교가 답변 초안을 만듭니다', ask: `${L} 질문 답변 초안 만들어줘` });
    T.push({ m: 'run', l: '채점 대기 과제', n: st.grade, u: '건', d: 'AI 1차 채점 → 확인 후 확정', ask: '채점 대기 과제 AI로 1차 채점해줘' });
    T.push({ m: 'run', l: `진도 늦은 ${L} 독려`, n: st.slow, u: '명', d: '격려 메시지 초안을 만들어 보냅니다', ask: '진도 늦은 학생에게 격려 메시지 보내줘' });
    T.push({ m: 'run', l: '이번 주 공지', n: 0, d: '다음 주 학습 안내를 씁니다', ask: '이번 주 학습 안내 공지 써줘', always: 1 });
    T.push({ m: 'report', l: '성과 리포트 · 개선점', n: 0, d: '이수율 · 점수 분포 · 질문 유형 → 개선점 3가지', ask: '성과 리포트와 개선점 정리해줘', always: 1 });
    C.filter(c => c.status === '운영중').forEach(c => T.push({ m: 'report', l: `${c.name} 학습 현황`, n: 0, d: '진도 위험 · 채점 · 질문을 한 화면에', cid: c.id, sid: 'operate', always: 1 }));
  }
  return T; }
/* 지금 할 일 1개: 세팅 필수 미완료 → 운영 건수 큰 것 → 세팅 선택 → 리포트 */
function smNext(T = smTasks()) { return T.find(x => x.m === 'setup' && x.n && (x.req || smRole() === 'teacher')) || T.filter(x => x.m === 'run' && x.n).sort((a, b) => b.n - a.n)[0] || T.find(x => x.m === 'setup' && x.n) || T.find(x => x.m === 'report' && x.n) || T.find(x => x.always); }
function smDo(x, how) { if (!x) return;
  if (how !== 'go' && x.act && ACT[x.act]) return ACT[x.act]();
  if (x.step && (how === 'go' || !x.ask) && ACT['bld-step']) { UI.smMode = ''; return ACT['bld-step']({ dataset: { v: x.step } }); }
  if (x.cid && typeof tOpen === 'function') { UI.smMode = ''; return tOpen(x.cid, x.sid); }
  if (how === 'go' && x.go) { UI.smMode = ''; return go(x.go); }
  if (x.ask) { if (innerWidth <= 860) document.body.classList.remove('b-pv'); return chatSend(x.ask); }
  if (x.go) { UI.smMode = ''; go(x.go); } }
/* ── 화면 ── */
const SM_GD = { admin: { setup: ['start', 'learners', 'site', 'mcp'], run: ['course', 'grade', 'nudge', 'legal', 'billing', 'refund', 'hrd', 'badge', 'diag', 'docs'], report: ['report'] }, teacher: { setup: ['t-new'], run: ['t-run'], report: ['t-report'] } };
const SM_SCR = { admin: { setup: ['site', 'lsite', 'class', 'members', 'enroll'], run: ['class', 'assess', 'community', 'message', 'compliance', 'auto'], report: ['dash', 'members', 'cert', 'docs'] }, teacher: { setup: ['class'], run: ['assess', 'community'], report: ['class'] } };
const smMode = k => SM_MODES[smRole()].find(m => m.k === k);
function smStatus(k, T, st) { const L = T.filter(x => x.m === k);
  if (k === 'setup') { if (smRole() === 'teacher') { const n = L.filter(x => x.cid).length; return { t: n ? `준비 중인 강의 ${n}개` : '모든 강의 개설 완료', p: null }; } const S2 = L.filter(x => x.id); const d = S2.filter(x => x.done).length; return { t: d === S2.length ? '세팅 완료' : `${d}/${S2.length} 완료`, p: Math.round(d / Math.max(1, S2.length) * 100) }; }
  if (k === 'run') { const n = L.filter(x => x.n).length; return { t: n ? `오늘 할 일 ${n}가지` : '급한 일 없음', p: null, hot: n > 0 }; }
  return { t: `평균 진도 ${st.avg}% · 이수율 ${st.rate}%`, p: null }; }
function smRow(x, i, full) { const ai = x.ask || x.act; const nav = x.go || x.cid || x.step;
  const btn = x.done ? '' : full ? `${ai ? `<button class="btn sm ink" data-act="sm-task" data-v="${i}">${ic('spark', 13)} ${x.act ? '바로 받기' : 'AI SAM에게 맡기기'}</button>` : ''}${nav ? `<button class="btn sm ghost" data-act="sm-task" data-how="go" data-v="${i}">${x.cid ? '이어서' : '열기'}</button>` : ''}`
    : ai ? `<button class="btn sm ink" data-act="sm-task" data-v="${i}" title="AI SAM에게 맡기기">${ic('spark', 13)} ${x.act ? '받기' : '맡기기'}</button>` : nav ? `<button class="btn sm" data-act="sm-task" data-how="go" data-v="${i}">${x.cid ? '이어서' : '열기'}</button>` : '';
  return `<li class="${x.done ? 'ok' : ''} ${x.n ? 'hot' : ''}"><span class="smck">${x.done ? '✓' : x.n && x.u ? `<b>${x.n}</b><small>${esc(x.u)}</small>` : '·'}</span><div><b>${esc(x.l)}</b>${full ? `<small>${esc(x.d || '')}</small>` : ''}</div><span class="smb">${btn}</span></li>`; }
function smHome() { const r = smRole(); const T = smTasks(); const st = smStat(); const nx = smNext(T); const ni = T.indexOf(nx); const d = new Date();
  const who = r === 'teacher' ? `${t('teacher')}님` : (S.me.name && S.me.name !== '관리자' ? S.me.name + '님' : ((typeof SEG_TITLE !== 'undefined' && SEG_TITLE[S.org.type]) || '담당자') + '님');
  const card = m => { const L = T.map((x, i) => [x, i]).filter(([x]) => x.m === m.k); const top = [...L.filter(([x]) => x.n && !x.done), ...L.filter(([x]) => !x.n && !x.done)].slice(0, 3); const s = smStatus(m.k, T, st);
    return `<section class="smc m-${m.k}"><header><span class="smi">${ic(m.ic, 18)}</span><div><b>${esc(m.n)}</b><small class="${s.hot ? 'hot' : ''}">${esc(s.t)}</small></div></header>${s.p != null ? `<i class="smbar"><i style="width:${s.p}%"></i></i>` : ''}<p>${esc(m.d)}</p><ul class="smlist">${top.map(([x, i]) => smRow(x, i)).join('') || '<li class="ok"><span class="smck">✓</span><div><b>모두 끝났습니다</b></div></li>'}</ul><button class="smmore" data-act="sm-mode" data-v="${m.k}">${esc(m.n)} 전체 보기 ${ic('arrow', 14)}</button></section>`; };
  return `<div class="smh"><div class="smgreet"><p>${d.getMonth() + 1}월 ${d.getDate()}일 · ${esc(S.org.name)}</p><h1>안녕하세요, ${esc(who)}<br><em>${r === 'teacher' ? '준비 · 운영 · 성과' : '세팅 · 운영 · 리포트'}</em>를 AI SAM이 함께합니다.</h1></div>
    ${nx ? `<div class="smnext"><span class="orb">${ic('spark', 18)}</span><div><small>지금 할 일 · ${esc(smMode(nx.m).n)}</small><b>${esc(nx.l)}${nx.n && nx.u ? ` <em>${nx.n}${esc(nx.u)}</em>` : ''}</b><p>${esc(nx.d || '')}</p></div><span class="smb">${nx.ask || nx.act ? `<button class="btn ink" data-act="sm-task" data-v="${ni}">${ic('spark', 15)} AI SAM에게 맡기기</button>` : ''}${nx.go || nx.cid || nx.step ? `<button class="btn" data-act="sm-task" data-how="go" data-v="${ni}">직접 하기</button>` : ''}</span></div>` : ''}
    <div class="smgrid">${SM_MODES[r].map(card).join('')}</div>
    <p class="smfoot">처음이라면 <button class="link" data-act="guides">가이드 따라 하기</button> · 모든 기능은 <button class="link" data-act="sm-all">전체 메뉴</button>에 있습니다 · 무엇이든 ${typeof fabOn === 'function' && fabOn() ? '오른쪽 아래 AI SAM에게' : '대화창에'} 말로 지시하세요</p></div>`; }
function smModePage(k) { const r = smRole(); const m = smMode(k); if (!m) return smHome(); const T = smTasks(); const st = smStat(); const L = T.map((x, i) => [x, i]).filter(([x]) => x.m === k);
  const G = (SM_GD[r][k] || []).map(id => typeof gdList === 'function' && gdList().find(g => g.id === id)).filter(Boolean);
  const scr = (SM_SCR[r][k] || []).filter(id => MENU[id] && (typeof menuOn !== 'function' || menuOn(id) || ['dash'].includes(id)));
  const kp = k === 'report' ? `<div class="smkpi">${[[`${t('learner')}`, st.learners, '명'], ['평균 진도', st.avg, '%'], [`${t('done')}율`, st.rate, '%'], [r === 'teacher' ? '운영 강의' : '최근 14일 접속', r === 'teacher' ? st.running : st.active, r === 'teacher' ? '개' : '%']].map(([a, b, u]) => `<div><small>${esc(a)}</small><b>${b}<em>${u}</em></b></div>`).join('')}</div>` : '';
  return `<div class="smh smpage"><button class="link smback" data-act="sm-mode" data-v="">← AI SAM 홈</button><div class="smph"><span class="smi">${ic(m.ic, 20)}</span><div><h2>${esc(m.n)}</h2><p>${esc(m.d)}</p></div></div>${kp}
    <section class="smsec"><h3>할 일</h3><ul class="smlist full">${L.map(([x, i]) => smRow(x, i, true)).join('')}</ul></section>
    ${G.length ? `<section class="smsec"><h3>순서대로 따라 하기</h3><div class="smgd">${G.map(g => `<button class="smg" data-act="gd-start" data-v="${g.id}"><b>${esc(gdVal(g.title))}</b><small>${g.steps.length}단계 · 약 ${g.mins}분${GD().fin[g.id] ? ' · 완료' : gdPct(g) ? ` · ${gdPct(g)}%` : ''}</small></button>`).join('')}</div></section>` : ''}
    ${scr.length ? `<section class="smsec"><h3>직접 보기</h3><div class="smscr">${scr.map(id => `<button class="chip" data-act="go" data-v="${id}">${esc(mlabel(id))}</button>`).join('')}</div></section>` : ''}</div>`; }
{ const b = bHome; bHome = () => smOn() ? (UI.smMode ? smModePage(UI.smMode) : smHome()) : b(); }
{ const b = bStrip; bStrip = () => smOn() && CUR.ws === 'home' ? '' : b(); }
{ const b = go; go = (id, keep) => { if (id !== 'home') UI.smMode = ''; return b(id, keep); }; }
ACT['sm-mode'] = el => { UI.smMode = el.dataset.v || ''; if (CUR.ws !== 'home') go('home'); else { render(); window.scrollTo(0, 0); const m = $('#main'); if (m) m.scrollTop = 0; } };
ACT['sm-task'] = el => { const T = smTasks(); const i = +el.dataset.v; smDo(i >= 0 ? T[i] : smNext(T), el.dataset.how); };
ACT['sm-all'] = () => { const W = (S.nav.ws || []).filter(w => w !== 'home');
  modal('전체 메뉴', `<div class="small">${W.map(w => `<div><b>${esc(lab(WS[w]))}</b><div>${(S.nav.tabs[w] || []).filter(x => x.on).map(x => `<button class="chip" data-act="sm-go" data-v="${x.id}">${esc(mlabel(x.id))}</button>`).join('') || `<button class="chip" data-act="sm-go" data-v="${w}">열기</button>`}</div></div>`).join('')}${S.me.role === 'owner' || smRole() === 'admin' ? `<div><b>설정</b><div><button class="chip" data-act="sm-go" data-v="settings">설정 열기</button></div></div>` : ''}</div><p class="mini">자주 쓰는 일은 홈의 세 칸(세팅 · 운영 · 리포트)과 대화로 하면 됩니다.</p>`, [{ id: 'c', label: '닫기' }], true); };
ACT['sm-go'] = el => { closeModal(); go(el.dataset.v); };
/* 왼쪽 메뉴: 홈 · 세팅 · 운영 · 리포트 + 전체 메뉴 */
AFTER.push(() => { if (!smOn()) { document.body.classList.remove('sm-on'); return; } document.body.classList.add('sm-on'); if (CUR.ws === 'home') { const cb = $('.bhdl b'); if (cb) cb.textContent = UI.smMode ? `AI SAM › ${(smMode(UI.smMode) || {}).n || ''}` : 'AI SAM 홈'; } const r = $('.brail'); if (!r) return; const M = SM_MODES[smRole()]; const cur = CUR.ws === 'home' ? (UI.smMode || 'home') : '';
  r.innerHTML = `<button class="ri ${cur === 'home' ? 'on' : ''}" data-act="sm-mode" data-v="">${ic('spark')}<span>AI SAM</span></button>${M.map(m => { const s = smStatus(m.k, smTasks(), smStat()); return `<button class="ri ${cur === m.k ? 'on' : ''}" data-act="sm-mode" data-v="${m.k}">${ic(m.ic)}<span>${esc(m.s)}</span>${s.hot ? '<em class="mg">!</em>' : ''}</button>`; }).join('')}<span class="sp"></span><button class="ri" data-act="sm-all">${ic('grid')}<span>전체 메뉴</span></button>${smRole() === 'admin' ? `<button class="ri ${CUR.ws === 'settings' ? 'on' : ''}" data-act="go" data-v="settings">${ic('gear')}<span>설정</span></button>` : ''}`;
  const cc = $('.bcomp .chips'); if (cc && CUR.ws === 'home') { const nx = smNext(); const Q = [...new Set(['지금 뭐부터 하면 돼?', nx && nx.ask, ...smTasks().filter(x => x.ask && x.n).map(x => x.ask)].filter(Boolean))].slice(0, 4); cc.innerHTML = Q.map(q => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(q)}">${esc(q)}</button>`).join(''); }
  const bp = $('.bprog'); if (bp && !bp.dataset.sm) { bp.dataset.sm = 1; bp.setAttribute('role', 'button'); bp.tabIndex = 0; bp.addEventListener('click', () => ACT['sm-mode']({ dataset: { v: 'setup' } })); }
  if (smRole() === 'admin' && Array.isArray(S.chat) && S.chat.length === 1 && S.chat[0].role === 'ai' && /STEP 1 · /.test(S.chat[0].text || '')) { S.chat = [smGreet()]; save(); if (typeof renderThreads === 'function') renderThreads(); } });
function smGreet() { return { role: 'ai', text: `안녕하세요, AI SAM입니다. 세 가지를 도와드립니다.\n① 시작 세팅 — 홈페이지 · 과정 · 학습자 등록까지 처음 준비\n② 교육 운영 — 과정 설계 · 개설 · 채점 · 질문 · 학습 독려\n③ 리포트 · 학습관리 — 현황 · 위험 학습자 · 보고서\n버튼을 누르거나 하고 싶은 일을 그대로 말씀하세요.`, html: `<div class="bqs">${SM_MODES.admin.map(m => `<button type="button" class="chip" data-act="sm-mode" data-v="${m.k}">${esc(m.n)}</button>`).join('')}<button type="button" class="chip" data-act="chat-q" data-v="지금 뭐부터 하면 돼?">지금 뭐부터 하면 돼?</button></div>` }; }
/* 대화: '뭐부터' · '오늘 할 일'은 지금 할 일 1개로 답한다 */
{ const b = answer; answer = (q, ...a) => { const s = String(q || ''); if (smOn() && /(뭐부터|무엇부터|지금\s*할\s*일|오늘\s*할\s*일|다음에\s*뭐)/.test(s) && !/가이드/.test(s)) { const T = smTasks(); const nx = smNext(T); const i = T.indexOf(nx); const M = SM_MODES[smRole()];
  const lines = M.map(m => { const st = smStatus(m.k, T, smStat()); return `· ${m.n}: ${st.t}`; });
  return { text: nx ? `지금은 「${nx.l}」부터 하시면 됩니다${nx.n && nx.u ? `(${nx.n}${nx.u})` : ''}.\n${nx.d || ''}\n\n${lines.join('\n')}` : lines.join('\n'), html: nx ? `<div class="bqs">${nx.ask || nx.act ? `<button type="button" class="chip" data-act="sm-task" data-v="${i}">바로 맡기기</button>` : ''}${nx.go || nx.cid || nx.step ? `<button type="button" class="chip" data-act="sm-task" data-how="go" data-v="${i}">화면 열기</button>` : ''}<button type="button" class="chip" data-act="sm-mode" data-v="${nx.m}">${esc(smMode(nx.m).n)} 전체 보기</button></div>` : '' }; } return b(q, ...a); }; }
