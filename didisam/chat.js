/* 디디쌤 스튜디오 v2 — AI SAM 대화형 홈 + 어디서나 여는 대화창
   지시 → (생각 중) → 답변 · 실행 계획 카드 → 승인하고 실행 → 결과 · 로그. 대화는 이 브라우저에만 최근 60개 저장. */
'use strict';
const PLANS = {}; // 실행 함수는 저장하지 않는다(새로고침 시 만료)
function BRIEF() {
  const ty = S.org.type; const P = pend();
  const L = [
    { k: 'grade', label: '검수 대기 과제', n: P.length, q: '검수 대기 오래된 순으로 보여주고 AI 채점 초안 만들어줘', unit: '건' },
    { k: 'qna', label: '미답변 질문', n: S.posts.filter(p => p.kind === '질문' && !p.replies).length, q: '미답변 질문에 답변 초안 만들어줘', unit: '건' },
    { k: 'away', label: '14일 이상 미접속', n: S.members.filter(m => daysAgo(m.last) >= 14).length, q: `14일 미접속 ${t('learner')}에게 독려 메시지 보내줘`, unit: '명' },
    { k: 'wait', label: '가입 승인 대기', n: S.members.filter(m => m.grade === '승인 대기').length, q: '승인 대기 회원 모두 승인해줘', unit: '명' }
  ];
  if (ty === 'k12') L.unshift({ k: 'unpaid', label: '미납 청구서', n: S.bills.filter(b => b.status === '미납').length, q: '미납 보호자에게 청구서 다시 알려줘', unit: '건' });
  if (ty === 'corp') L.unshift({ k: 'legal', label: '법정교육 미이수', n: new Set(legalUndone().map(x => x.id)).size, q: '법정교육 미이수자에게 마감 안내 보내줘', unit: '명' });
  if (ty === 'voc') L.unshift({ k: 'att', label: '출석률 80% 미만', n: new Set(lowAtt().map(x => x.id)).size, q: '출석률 80% 미만 훈련생에게 경고 보내줘', unit: '명' });
  if (ty === 'lifelong' || ty === 'adult') L.unshift({ k: 'refund', label: ty === 'lifelong' ? '학습비 반환 신청' : '환불 신청', n: S.pays.filter(p => p.status === '환불 신청').length, q: '환불 신청 기한 확인해줘', unit: '건' });
  if (ty === 'univ') L.unshift({ k: 'diag', label: 'AI 진단 미완료', n: S.members.filter(m => !m.diag).length, q: 'AI 진단 안 한 학생에게 안내 보내줘', unit: '명' });
  return L.slice(0, 4);
}
const EXQ = {
  corp: ['신규 입사자 온보딩 6차시 과정 설계해줘', '가입률 낮은 부서 3곳', '보고서 작성 과제 루브릭 만들어줘', '매주 금요일 부서장에게 이수 리포트 보내는 자동화 만들어줘'],
  univ: ['생성형 AI 실무 활용 15주 과정 설계해줘', '대기 과제 AI 평가해줘', '가입률 낮은 학과 5곳', 'AI 진단 새로 만들어줘'],
  k12: ['중2-A반 이번 주 출결 요약해줘', '결석한 원생에게 보강 영상 배정하는 자동화 만들어줘', '겨울방학 특강 공지 써줘', '이번 달 매출 요약해줘'],
  adult: ['이번 달 매출 요약해줘', '엑셀 실무 마스터 커리큘럼 다시 짜줘', '수료한 수강생에게 후기 요청 보내는 자동화 만들어줘', '가입률 낮은 기수'],
  lifelong: ['30시간 미만 강좌 찾아줘', '바리스타 과정 모집 공지 써줘', '사전 수강신청 10명 미만 강좌 알리는 자동화 만들어줘', '이번 주 운영 현황 요약'],
  voc: ['이번 주 HRD-Net 보고 자료 만들어줘', '웹개발 과정 퀴즈 5문항 만들어줘', '매일 부정훈련 의심 건을 담당자에게 알리는 자동화 만들어줘', '가입률 낮은 훈련반']
};
const CTXQ = { assess: '검수 대기 오래된 순으로', badge: '이번 주 배지 발급 현황 요약', members: `14일 미접속 ${''}독려 메시지 보내줘`, class: '진도 30% 미만 학생에게 독려 메시지 보내줘', billing: '미납 보호자에게 청구서 다시 알려줘', site: '홈페이지를 신뢰감 있는 분위기로 다시 만들어줘', auto: '매주 금요일 주간 보고서 보내는 자동화 만들어줘', dash: '주간 보고서 만들어 줘' };

/* ═════════ 홈 ═════════ */
VIEWS.home = () => {
  const B = BRIEF(); const total = B.reduce((a, b) => a + (b.n ? 1 : 0), 0);
  const d = new Date(); const ds = `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`;
  const on = S.autos.filter(a => a.on).length; const steps = ONB[S.org.type]; const dn = steps.filter(s => onbDone(s[0])).length;
  return `<div class="home">
    <section class="hero2"><p>${ds} · ${esc(S.org.name)}</p><h1>안녕하세요, ${esc(S.me.name)}님.<br>${total ? `오늘 확인할 일이 <em>${total}가지</em> 있습니다.` : '오늘은 급한 일이 없습니다.'}</h1>
      <div class="hmeta"><button class="pill" data-act="go" data-v="auto">${ic('check', 14)} 자동화 ${on}개 작동 중</button><button class="pill" data-act="setup">${ic('arrow', 14)} 세팅 ${dn}/${steps.length}</button><button class="pill" data-act="go" data-v="dash">${ic('chart', 14)} 현황 보기</button></div></section>
    <section class="brief">${B.map(b => `<div class="bc ${b.n ? 'hot' : ''}"><span>${esc(b.label)}</span><b>${b.n}<small>${b.unit}</small></b><button class="btn sm ${b.n ? 'ink' : ''}" data-act="chat-q" data-v="${esc(b.q)}" ${b.n ? '' : 'disabled'}>${ic('spark', 14)} 맡기기</button></div>`).join('')}</section>
    <section class="chatwrap"><div class="thread" id="thread" aria-live="polite">${threadHTML()}</div>${composer('home')}</section>
    <details class="toolsbox"><summary>${ic('grid', 16)} AI 도구 15종 <small>교육 목표 · 커리큘럼 · 퀴즈 · 채점 · 상담 요약 · 리포트 · SEO …</small></summary><div class="tools">${TOOLS.map(([id, n, dd]) => `<button class="tool" data-act="tool" data-v="${id}"><b>${esc(n)}</b><small>${esc(dd)}</small></button>`).join('')}</div></details>
  </div>`;
};
function composer(where) {
  const chips = where === 'drawer' && CTXQ[CUR.tab || CUR.ws] ? [CTXQ[CUR.tab || CUR.ws], ...EXQ[S.org.type].slice(0, 2)] : EXQ[S.org.type];
  return `<form class="composer" data-where="${where}"><div class="chips">${chips.map(x => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="cbox"><textarea rows="1" maxlength="300" placeholder="무엇을 도와드릴까요? 예: ${esc(EXQ[S.org.type][0])}" aria-label="AI SAM에게 지시"></textarea><button class="send" type="submit" aria-label="보내기">${ic('send', 18)}</button></div>
    <small class="cnote">AI가 실행하는 일은 항상 계획을 먼저 보여 드리고, 승인하신 뒤에 처리합니다.</small></form>`;
}
function threadHTML() {
  if (!S.chat.length) return `<div class="tempty">${ic('spark', 28)}<b>AI SAM에게 말로 지시해 보세요</b><p>현황 요약 · 대상 찾기 · 메시지 발송 · 커리큘럼 · 퀴즈 · 채점 초안 · 자동화 만들기 · 화면 이동까지 할 수 있습니다.</p></div>`;
  return S.chat.map(m => m.role === 'user' ? `<div class="msg u"><div class="bub">${esc(m.text)}</div></div>` : `<div class="msg a"><span class="av">${ic('spark', 16)}</span><div class="bub">${m.typing ? '<span class="dots"><i></i><i></i><i></i></span>' : aiBody(m)}</div></div>`).join('');
}
function aiBody(m) {
  let h = m.text ? `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>` : '';
  if (m.html) h += `<div class="mcard">${m.html}</div>`;
  if (m.steps) h += `<ol class="msteps">${m.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  if (m.plan) {
    const live = PLANS[m.plan] && m.state === 'pending';
    h += `<div class="mact">${live ? `<button class="btn sm ink" data-act="plan-ok" data-v="${m.plan}">${esc(m.cta || '승인하고 실행')}</button><button class="btn sm ghost" data-act="plan-no" data-v="${m.plan}">취소</button>` : m.state === 'done' ? tag('실행 완료', 'g') : m.state === 'cancel' ? tag('취소함') : tag('만료됨 — 다시 요청해 주세요')}</div>`;
  }
  if (m.go) h += `<div class="mact"><button class="btn sm" data-act="go" data-v="${esc(m.go)}">${esc(mlabel(m.go))} 열기 ${ic('arrow', 14)}</button></div>`;
  if (m.btn) h += `<div class="mact"><button class="btn sm ink" data-act="${esc(m.btn.act)}" data-v="${esc(m.btn.v || '')}">${ic('spark', 14)} ${esc(m.btn.label)}</button></div>`;
  if (m.copy) h += `<div class="mact"><button class="btn sm" data-act="chat-copy" data-v="${S.chat.indexOf(m)}">복사</button></div>`;
  return h;
}
function renderThreads() { $$('.thread').forEach(th => { th.innerHTML = threadHTML(); th.scrollTop = th.scrollHeight; }); const h = $('#thread'); if (h && CUR.ws === 'home') { const last = h.lastElementChild; last && last.scrollIntoView({ block: 'nearest' }); } }
function chatSend(q) {
  q = String(q || '').trim().slice(0, 300); if (!q) return;
  if (CUR.ws !== 'home' && !$('#drawer')) ACT['chat-open']();
  S.chat.push({ role: 'user', text: q }); const ph = { role: 'ai', typing: true }; S.chat.push(ph); renderThreads();
  setTimeout(() => {
    let r; try { r = answer(q); } catch (e) { console.error(e); r = { text: '처리하는 중 문제가 생겼습니다. 다르게 말씀해 주시겠어요?' }; }
    delete ph.typing; Object.assign(ph, r); S.ai.usage++; S.chat = S.chat.slice(-60); save(); renderThreads();
    if (r.nav) setTimeout(() => go(r.nav, true), 350);
  }, 420 + Math.min(600, q.length * 8));
}
document.addEventListener('submit', e => { const f = e.target.closest('.composer'); if (!f) return; e.preventDefault(); const ta = f.querySelector('textarea'); const q = ta.value; ta.value = ''; chatSend(q); });
document.addEventListener('keydown', e => { if (e.target.matches('.composer textarea') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); } });
document.addEventListener('input', e => { if (e.target.matches('.composer textarea')) { e.target.style.height = 'auto'; e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px'; } });
ACT['chat-q'] = el => chatSend(el.dataset.v);
ACT['plan-ok'] = el => {
  const pid = el.dataset.v, P = PLANS[pid]; const m = S.chat.find(x => x.plan === pid); if (!P || !m) return;
  let res; try { res = P.run(); } catch (e) { console.error(e); res = '실행 중 문제가 생겼습니다.'; }
  m.state = 'done'; delete PLANS[pid]; logAudit('AI SAM 실행 — ' + (m.title || '').slice(0, 40));
  S.chat.push({ role: 'ai', text: '완료했습니다. ' + res, go: P.go || '' }); save();
  if (CUR.ws === 'home') { render(); } else { render(); } renderThreads();
};
ACT['plan-no'] = el => { const m = S.chat.find(x => x.plan === el.dataset.v); if (m) m.state = 'cancel'; delete PLANS[el.dataset.v]; save(); renderThreads(); };
ACT['chat-copy'] = el => { const m = S.chat[+el.dataset.v]; try { navigator.clipboard.writeText(m.copy); toast('복사했습니다.', 'ok'); } catch (e) { toast('복사하지 못했습니다.', 'warn'); } };
ACT['chat-open'] = () => {
  if (CUR.ws === 'home') { $('.composer textarea')?.focus(); return; }
  let d = $('#drawer'); if (d) { d.querySelector('textarea')?.focus(); return; }
  d = document.createElement('aside'); d.id = 'drawer'; d.className = 'drawer'; d.setAttribute('aria-label', 'AI SAM 대화');
  d.innerHTML = `<div class="dh"><span class="av">${ic('spark', 16)}</span><div><b>AI SAM</b><small>지금 보는 화면: ${esc(CUR.ws === 'settings' ? '설정' : lab(WS[CUR.ws]))}${CUR.tab ? ' › ' + esc(mlabel(CUR.tab)) : ''}</small></div><button class="x" data-act="chat-close" aria-label="닫기">${ic('x', 18)}</button></div><div class="thread">${threadHTML()}</div>${composer('drawer')}`;
  document.body.appendChild(d); document.body.classList.add('drawer-open'); const th = d.querySelector('.thread'); th.scrollTop = th.scrollHeight; d.querySelector('textarea').focus();
};
ACT['chat-close'] = () => { $('#drawer')?.remove(); document.body.classList.remove('drawer-open'); };
AFTER.push(cur => { const d = $('#drawer'); if (d) { if (cur.ws === 'home') ACT['chat-close'](); else d.querySelector('.dh small').textContent = '지금 보는 화면: ' + (cur.ws === 'settings' ? '설정' : lab(WS[cur.ws])) + (cur.tab ? ' › ' + mlabel(cur.tab) : ''); } const h = $('#thread'); if (h) { const last = h.lastElementChild; last && S.chat.length && last.scrollIntoView({ block: 'nearest' }); } });
ACT.setup = () => { const steps = ONB[S.org.type]; modal(`${TYPES[S.org.type].name} 세팅 가이드`, `<ol class="onb">${steps.map(([id, l, d], i) => `<li class="${onbDone(id) ? 'ok' : ''}"><span>${onbDone(id) ? '✓' : i + 1}</span><div><b>${esc(l)}</b><small>${esc(d)}</small></div><button class="btn sm" data-act="setup-go" data-v="${id}">열기</button></li>`).join('')}</ol>`, [{ id: 'c', label: '닫기' }]); };
ACT['setup-go'] = el => { closeModal(); go(el.dataset.v); };

/* ═════════ 답변 엔진: 이동 · 조회 · 보고 · 실행 계획 ═════════ */
function answer(q) {
  const has = (...w) => w.some(x => q.includes(x)); const nq = q.replace(/\s/g, '');
  // 1) 화면 이동
  if (/(열어|보여줘|가자|이동|화면)/.test(q) && q.length < 24) {
    const ids = [...Object.keys(MENU), ...Object.keys(WS), 'settings']; const hit = ids.find(id => nq.includes(mlabel(id).replace(/\s|·/g, '')));
    if (hit) { if (MENU[hit] && !menuOn(hit)) return { text: `'${mlabel(hit)}' 탭은 지금 꺼져 있습니다. 설정 › 메뉴 구성에서 켤 수 있습니다.`, go: 'settings' }; return { text: `${mlabel(hit)} 화면을 열겠습니다.`, nav: hit }; }
  }
  // 2) 그룹별 가입률
  if (/가입률/.test(q) || (/(낮은|저조)/.test(q) && /(학과|부서|반|기수|훈련반|그룹)/.test(q))) {
    const n = +(q.match(/(\d+)\s*(곳|개)/) || [])[1] || 5;
    const R = S.groups.map(g => { const ms = S.members.filter(m => m.group === g.id); return { g, n: ms.length, j: ms.filter(m => m.grade === '정회원').length / Math.max(1, ms.length) * 100, p: avgOf(S.classes.flatMap(c => ms.filter(m => c.prog[m.id]).map(m => c.prog[m.id].p))) }; }).sort((a, b) => a.j - b.j).slice(0, n);
    return { text: `가입률이 낮은 ${t('group')} ${R.length}곳입니다. 가장 낮은 곳은 ${R[0].g.name}(${pct(R[0].j)})입니다.`, html: table([t('group'), '인원', '가입률', '평균 진도'], R.map(r => [esc(r.g.name), r.n, pct(r.j), pct(r.p)])), go: 'dash' };
  }
  // 3) 검수 대기 오래된 순
  if (/(검수|채점).*(대기|오래|순)|(대기|오래).*(검수|채점)/.test(q)) {
    const P = pend().sort((a, b) => a.c.prog[a.id].subAt.localeCompare(b.c.prog[b.id].subAt));
    const pid = uid('p'); PLANS[pid] = { run: () => { P.forEach(({ c, id }) => c.prog[id].draft = AI.gradeDraft(c, id)); return `${P.length}건 채점 초안을 만들었습니다. 평가 화면에서 한 건씩 확정하세요.`; }, go: 'assess' };
    return { title: '검수 대기', text: `검수 대기 ${P.length}건, 가장 오래된 제출은 ${P.length ? daysAgo(P[0].c.prog[P[0].id].subAt) : 0}일 전입니다. 루브릭 기준 AI 채점 초안을 만들어 둘까요?`, html: table(['제출일', '대기', '이름', t('cls')], P.slice(0, 8).map(({ c, id }) => [c.prog[id].subAt.slice(5), daysAgo(c.prog[id].subAt) + '일', mn(id), esc(c.name)])), plan: P.length ? pid : '', state: 'pending', cta: 'AI 채점 초안 만들기', go: 'assess' };
  }
  // 4) 주간 보고서
  if (/(주간|이번\s*주).*(보고|리포트)|보고서/.test(q) && !/루브릭|과제|설계/.test(q)) {
    const L = S.members; const rep = `[${S.org.name}] 주간 운영 보고 (${today()})\n· 등록 ${L.length}명 · 가입률 ${pct(L.filter(m => m.grade === '정회원').length / L.length * 100)} · 주간 활성 ${L.filter(m => daysAgo(m.last) <= 7).length}명\n· 평균 진도 ${pct(avgOf(S.classes.flatMap(c => Object.values(c.prog).map(p => p.p))))} · ${t('done')} ${L.filter(m => S.classes.some(c => c.prog[m.id]?.p >= c.criteria.threshold)).length}명 · 배지 보유 ${L.filter(m => hasBadge(m.id)).length}명\n· 검수 대기 ${pend().length}건 · 14일 미접속 ${L.filter(m => daysAgo(m.last) >= 14).length}명\n· 이번 주 자동화 실행 ${S.runs.length}회\n다음 주 제안: 미접속자 독려, 검수 대기 3일 이내 처리, 가입률 낮은 ${t('group')} 집중 안내`;
    return { text: '이번 주 보고서 초안입니다. 복사해서 바로 쓰실 수 있습니다.', html: `<pre class="rep">${esc(rep)}</pre>`, copy: rep, go: 'dash' };
  }
  // 5) 개인 상황
  const sid = (q.match(/\d{8,10}/) || [])[0]; const byName = S.members.find(m => q.includes(m.name));
  if ((sid || byName) && /(상황|현황|어때|리포트|정보)/.test(q)) {
    const m = sid ? S.members.find(x => x.extra?.학번 === sid) : byName; if (!m) return { text: `${sid} 학번을 찾지 못했습니다. 등록 · 초대 화면에서 확인해 주세요.`, go: 'enroll' };
    const cs = S.classes.filter(c => c.prog[m.id]);
    return { text: AI.report(m), html: table([t('cls'), '진도', '과제', t('done')], cs.map(c => [esc(c.name), pct(c.prog[m.id].p), { none: '미제출', submitted: '검수 대기', graded: '통과', returned: '재제출', failed: '미통과' }[c.prog[m.id].assign] || '—', c.prog[m.id].p >= c.criteria.threshold ? 'Y' : '—'])), go: 'members' };
  }
  // 6) 진단 미완료
  if (/진단/.test(q) && /(안 한|미완료|안내)/.test(q)) {
    const L = S.members.filter(m => !m.diag); const pid = uid('p'); const msg = AI.msg('AI 진단 참여 안내');
    PLANS[pid] = { run: () => { S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: 'AI 진단 미완료', title: msg.title, ch: '알림함', n: L.length }); return `${L.length}명에게 알림함으로 보냈습니다(데모).`; }, go: 'message' };
    return { title: '진단 안내', text: `AI 진단을 아직 하지 않은 학생은 ${L.length}명입니다. 아래 안내를 알림함으로 보낼까요?`, html: `<div class="pvmsg"><b>${esc(msg.title)}</b><p>${esc(msg.body).replace(/\n/g, '<br>')}</p></div>`, plan: pid, state: 'pending', cta: `${L.length}명에게 보내기` };
  }
  // 7) 배지 현황
  if (/배지/.test(q) && /(현황|요약|몇)/.test(q)) { const R = S.badges.map(b => [esc(b.name), b.issued.filter(i => i.st === '유효').length, b.issued.filter(i => i.at >= addDays(today(), -7)).length]); return { text: '배지 발급 현황입니다.', html: table(['배지', '유효', '최근 7일'], R), go: 'badge' }; }
  // 8) 14일 미접속(숫자 일수 지원)
  if (/미접속/.test(q)) { const d = +(q.match(/(\d+)\s*일/) || [])[1] || 14; const L = S.members.filter(m => daysAgo(m.last) >= d); const msg = AI.msg('학습 복귀 안내'); const pid = uid('p'); PLANS[pid] = { run: () => { S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: `${d}일 미접속`, title: msg.title, ch: '앱 푸시 + 이메일', n: L.length }); return `${L.length}명에게 발송했습니다(데모).`; }, go: 'message' }; return { title: '미접속 독려', text: `${d}일 이상 접속하지 않은 ${t('learner')}은 ${L.length}명입니다. 아래 메시지로 독려할까요?`, html: `<div class="pvmsg"><b>${esc(msg.title)}</b><p>${esc(msg.body).replace(/\n/g, '<br>')}</p><small>대상: ${L.slice(0, 8).map(m => esc(m.name)).join(', ')}${L.length > 8 ? ` 외 ${L.length - 8}명` : ''}</small></div>`, plan: L.length ? pid : '', state: 'pending', cta: `${L.length}명에게 보내기` }; }
  // 9) 과정 설계 · 루브릭 · AI 평가 · 진단 만들기
  if (/(설계|강의\s*계획|주차별|15주)/.test(q)) { const tp = q.replace(/(과정|교과목|강좌|과목)?\s*(AI로|으로|로)?\s*(설계|강의\s*계획서?|주차별|15주|편성|만들어|해\s*줘|줘|짜\s*줘|해주세요)/g, ' ').replace(/\s+/g, ' ').trim(); return { text: `「${tp || '새 과정'}」 과정을 설계하겠습니다. 주차 수 · 대상 · 옵션(YouTube 영상 자동 추천 · 퀴즈 · 과제 · 시험)을 확인해 주세요.`, btn: { act: 'ai-design', v: tp, label: 'AI 과정 설계 열기' } }; }
  if (/루브릭/.test(q)) { const nm = q.replace(/루브릭|만들어|줘|생성|해/g, '').trim() || '과제'; const rb = AI.rubric(nm); const pid = uid('p'); PLANS[pid] = { run: () => { S.rubrics.push(rb); UI.asF = 'rubric'; return `「${rb.name}」을(를) 루브릭 라이브러리에 저장했습니다.`; }, go: 'assess' }; return { title: '루브릭', text: `「${rb.name}」 초안입니다. 저장할까요?`, html: rubricTable(rb), plan: pid, state: 'pending', cta: '루브릭 저장' }; }
  if (/(AI\s*평가|AI로\s*채점|채점\s*해)/i.test(q)) { const P = pend(); const pid = uid('p'); PLANS[pid] = { run: () => { P.forEach(({ c, id }) => aiEval(c, id)); return `${P.length}건 AI 평가를 마쳤습니다. 평가 화면에서 확정하세요.`; }, go: 'assess' }; return { title: 'AI 평가', text: `채점 대기 ${P.length}건을 루브릭 기준으로 AI 평가합니다. 기준별 점수와 근거가 붙고, 확정은 운영자가 합니다.`, plan: P.length ? pid : '', state: 'pending', cta: 'AI 평가 실행' }; }
  if (/진단/.test(q) && /(만들|생성|새로|설계)/.test(q)) return { text: '진단을 만들겠습니다. AI로 문항을 생성하거나 자료(PDF · 텍스트)를 올려 만들 수 있습니다.', btn: { act: 'dg-new', label: '새 진단 만들기' } };
  // 10) 기존 해석기(독려 · 미납 · 승인 · 채점 · 답변 · 커리큘럼 · 퀴즈 · 공지 · 홈페이지 · HRD · 환불 · 자동화 · 요약)
  const P = interpret(q);
  if (/이렇게 이해했습니다/.test(P.title)) return { text: '죄송합니다, 정확히 이해하지 못했습니다. 이런 식으로 말씀해 주세요.', steps: EXQ[S.org.type] };
  if (P.run) { const pid = uid('p'); PLANS[pid] = { run: P.run, go: P.go }; return { title: P.title, text: P.title + '. 아래 계획으로 진행할까요?', steps: P.steps, html: P.preview || '', plan: pid, state: 'pending', cta: P.cta }; }
  return { text: P.title, steps: P.steps, go: P.go || '' };
}
