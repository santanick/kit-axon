/* v30 학사 LMS 묶음 E · F · H — 학습자 앱(learner.html): 「#lms」 내 과제 · 시험 · 성적
   - 과제: 온라인 문서 작성(초안 자동 저장 · 팀 과제 동시 편집 충돌 확인) · 파일 첨부(여러 개) · 제출 · 제출 취소 · 버전 기록 · 피드백 · 첨삭 · 점수
   - 시험: 응시 전 기능 테스트 · 응시(서버가 정한 무작위 문항 · 보기 순서) · 남은 시간(서버 기준) · 답 자동 저장 · 제출 · 결과 · 오답 피드백 · 내 위치 · 오답 재시도
   - 성적: 항목별 점수 · 피드백 · 총점 · 등급(비공개 · 청강 안내)
   운영: /api/lms/e|f|h/* (학습자 세션) + 수강 분반은 /api/lms/a/my. 데모: 이 브라우저의 기관 데이터룸에 lms/e.js · f.js · h.js 데모 처리기를 붙여 같은 규칙으로 동작한다. */
(function () {
  'use strict';
  if (typeof LR !== 'object' || typeof viewPage !== 'function') return;
  const on = () => { try { const o = SITE() && SITE().org; return !!(o && o.type === 'univ' && o.ed === 'lms'); } catch (e) { return false; } };
  const L = { sec: null, tab: 'asg', cache: {}, paper: null, result: null, retry: null, busy: {}, err: {} };
  const fmt = t => t ? new Date(t).toLocaleString('ko-KR', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const rer = () => { if (typeof lrender === 'function') lrender(); };

  /* ── 데모: 스튜디오 데모 처리기(lms/e · f · h.js)를 학습자 앱에 붙인다 ── */
  let demoReady = null;
  function demoBoot() {
    if (demoReady) return demoReady;
    const W = window; W.UI = W.UI || {}; W.ACT = W.ACT || {}; W.VIEWS = W.VIEWS || {};
    W.logAudit = W.logAudit || (() => {}); W.M = W.M || (id => ((W.S && W.S.members) || []).find(m => m.id === id));
    W.save = W.save || (() => { try { localStorage.setItem('didisam.room.' + LR.tid, JSON.stringify(W.S)); } catch (e) { } });
    W.render = W.render || rer;
    const load = f => new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'lms/' + f + '?v=30.0'; s.onload = ok; s.onerror = () => no(new Error(f + ' 불러오기 실패')); document.head.appendChild(s); });
    demoReady = load('e.js').then(() => load('f.js')).then(() => load('h.js'));
    return demoReady;
  }
  function demoMe() { const S = window.S; const sid = String(LR.me && LR.me.sid || ''); const m = (S.members || []).find(x => EFH.mno(x.id) === sid); return m ? m.id : null; }
  async function call(method, path, body) {
    if (LR.mode === 'live') { let u = path; if (method === 'GET' && body) u += '?' + new URLSearchParams(Object.entries(body).filter(([, v]) => v != null && v !== '')).toString(); return api(method, u, method === 'GET' ? undefined : (body || {})); }
    await demoBoot(); window.S = typeof demoRoom === 'function' ? demoRoom() : null; if (!window.S) throw new Error('데모 기관 데이터가 없습니다.');
    const pid = demoMe(); window.UI.lmseAs = window.UI.lmsfAs = window.UI.lmshAs = pid;
    if (path === '/api/lms/a/my') { if (!pid) return { me: null, sections: [] }; return { me: { member_no: LR.me.sid }, sections: EFH.demoSections().map(s => ({ ...s, kind: (EFH.demoStudents(s.section_id).find(p => p.person_id === pid) || {}).kind })).filter(s => s.kind) }; }
    if (!pid) { const e = new Error('학사 구성원으로 등록되지 않은 학습자입니다.'); e.status = 403; throw e; }
    const f = EFH.D[method + ' ' + path]; if (!f) throw new Error('데모에서 지원하지 않는 기능입니다.');
    const out = f(JSON.parse(JSON.stringify(body || {}))); window.save(); return JSON.parse(JSON.stringify(out));
  }
  function get(key, fn) {
    if (key in L.cache) return L.cache[key];
    if (!L.busy[key]) { L.busy[key] = true; Promise.resolve().then(fn).then(v => { L.cache[key] = v; delete L.err[key]; }).catch(e => { L.err[key] = e.message; L.cache[key] = null; }).finally(() => { delete L.busy[key]; rer(); }); }
    return undefined;
  }
  const drop = p => Object.keys(L.cache).forEach(k => { if (!p || k.startsWith(p)) delete L.cache[k]; });
  const box = (k, html) => L.err[k] ? `<p class="mini">${esc(L.err[k])}</p>` : html;
  const wait = '<p class="mini">불러오는 중입니다.</p>';
  async function act(fn, ok, dropKey) { try { const r = await fn(); if (ok) toast(ok, 'ok'); if (dropKey !== undefined) { drop(dropKey); rer(); } return r; } catch (e) { toast(e.message, 'bad'); return null; } }

  /* ── 화면: #lms ── */
  function page() {
    if (!LR.me) return typeof needLogin === 'function' ? needLogin('lms') : '<p>로그인이 필요합니다.</p>';
    const my = get('my', () => call('GET', '/api/lms/a/my'));
    const head = `<section class="efl"><div class="efl-in"><p class="eb">MY LMS</p><h1>과제 · 시험 · 성적</h1>`;
    if (my === undefined) return head + wait + '</div></section>';
    if (!my || !my.me) return head + `<p class="mini">${esc(L.err.my || '학사 정보에 등록된 학번이 아닙니다. 학교 학사 담당 부서에 문의하세요.')}</p></div></section>`;
    const secs = (my.sections || []).filter(s => s.kind !== 'ta'); if (!secs.length) return head + '<p class="mini">이번 학기 수강 분반이 없습니다.</p></div></section>';
    const sec = secs.find(s => s.section_id === L.sec) || secs[0]; L.sec = sec.section_id;
    const chips = `<div class="efl-chips" role="tablist">${secs.map(s => `<button class="${s === sec ? 'on' : ''}" data-lact="efl-sec" data-v="${esc(s.section_id)}">${esc(s.course_name || s.title)} ${esc(s.section_no)}분반${s.kind === 'audit' ? ' · 청강' : ''}</button>`).join('')}</div>`;
    const tabs = `<div class="efl-tabs" role="tablist">${[['asg', '과제'], ['exam', '시험'], ['grade', '성적']].map(([k, l]) => `<button class="${L.tab === k ? 'on' : ''}" data-lact="efl-tab" data-v="${k}" role="tab" aria-selected="${L.tab === k}">${l}</button>`).join('')}</div>`;
    const body = L.tab === 'exam' ? examTab(sec) : L.tab === 'grade' ? gradeTab(sec) : asgTab(sec);
    return head + chips + tabs + body + (LR.mode !== 'live' ? '<p class="mini efl-note">데모 동작 — 이 브라우저의 데모 데이터에 저장합니다. 연동 후 동작: 학교 SSO 로그인 · 운영 서버 저장.</p>' : '') + '</div></section>';
  }
  const STL = { draft: '작성 중', submitted: '제출 완료', graded: '채점 완료', returned: '재작성 요청' };
  function asgTab(sec) {
    const k = 'asg:' + sec.section_id; const r = get(k, () => call('GET', '/api/lms/e/my', { section: sec.section_id }));
    if (r === undefined) return wait; if (!r) return box(k, '');
    if (!r.assignments.length) return '<p class="mini">공개된 과제가 없습니다.</p>';
    return r.assignments.map(g => { const s = g.submission; const done = s && s.status !== 'draft'; const end = g.late_until || g.due_at; const closed = g.status === 'closed' || (end && Date.now() > Date.parse(end));
      return `<article class="efl-card" data-asg="${esc(g.asg_id)}"><header><b>${esc(g.title)}</b><span class="efl-tag ${s ? esc(s.status) : 'none'}">${s ? STL[s.status] : '미제출'}</span></header>
        <p class="mini">마감 ${fmt(g.due_at)}${g.late_until ? ` · 지각 제출 ${fmt(g.late_until)}까지` : ''}${g.kind === 'team' ? ` · 팀 과제${g.team ? ` (${esc(g.team.name)}: ${esc(g.team.members.join(', '))})` : ' — 팀 배정 전'}` : ''}${s && s.late ? ' · 지각 제출' : ''}</p>
        ${g.body ? `<p class="efl-desc">${esc(g.body)}</p>` : ''}
        ${g.rubric ? `<details class="efl-rub"><summary>채점 기준(루브릭)</summary>${g.rubric.criteria.map(c => `<p><b>${esc(c.name)}</b> ${c.levels.map(l => `${esc(l.label)} ${l.score}`).join(' · ')}</p>`).join('')}</details>` : ''}
        ${g.submit_types.includes('text') ? `<textarea class="efl-ta" rows="6" data-asg="${esc(g.asg_id)}" data-ver="${s ? s.version : ''}" ${done || closed ? 'readonly' : ''} aria-label="${esc(g.title)} 본문" placeholder="여기에 작성하면 자동으로 저장됩니다.">${esc(s ? s.body : '')}</textarea>` : ''}
        <p class="mini efl-sv" id="efls_${esc(g.asg_id)}">${s ? `버전 ${s.version} · ${fmt(s.saved_at)} 저장` : ''}</p>
        <div class="efl-files">${s ? s.files.map(f => `<span class="efl-file">${esc(f.name)} <small>${Math.ceil(f.size / 1024)}KB</small></span>`).join('') : ''}${g.submit_types.includes('file') && !done && !closed ? `<label class="lbtn sm ghost">파일 첨부(최대 ${g.max_files}개 · 2MB)<input type="file" multiple hidden class="efl-up" data-asg="${esc(g.asg_id)}"></label>` : ''}</div>
        <div class="efl-acts">${closed && !done ? '<span class="mini">제출 기간이 끝났습니다.</span>' : done ? (s.status === 'submitted' && !closed ? `<button class="lbtn sm ghost" data-lact="efl-unsub" data-v="${esc(g.asg_id)}">제출 취소</button>` : '') : `<button class="lbtn sm" data-lact="efl-submit" data-v="${esc(g.asg_id)}">제출하기</button>`}${s ? `<button class="lbtn sm ghost" data-lact="efl-vers" data-v="${esc(s.sub_id)}">버전 기록</button>` : ''}</div>
        ${L.vers && s && L.vers.sub_id === s.sub_id ? `<ol class="efl-vers">${L.vers.versions.map(v => `<li>버전 ${v.ver} · ${esc(v.by || '')} · ${fmt(v.at)} · ${v.chars}자 · 첨부 ${v.files}</li>`).join('')}</ol>` : ''}
        ${s && (s.feedback || s.score != null || (s.annotations || []).length || (s.feedback_files || []).length) ? `<div class="efl-fb"><b>피드백</b>${s.score != null ? ` <span class="efl-tag graded">${s.score}점</span>` : s.score_hidden ? ' <span class="mini">(점수 비공개)</span>' : ''}${s.feedback ? `<p>${esc(s.feedback)}</p>` : ''}${(s.annotations || []).map(a => `<p class="mini">「${esc(a.quote)}」 → ${esc(a.comment)}</p>`).join('')}${(s.feedback_files || []).map(f => `<button class="lbtn sm ghost" data-lact="efl-dl" data-v="${esc(f.file_id)}">첨삭 파일: ${esc(f.name)}</button>`).join('')}</div>` : ''}
      </article>`; }).join('');
  }
  function examTab(sec) {
    if (L.paper) return paperView(L.paper);
    if (L.result) return resultView(L.result);
    const k = 'exam:' + sec.section_id; const r = get(k, () => call('GET', '/api/lms/f/my', { section: sec.section_id }));
    if (r === undefined) return wait; if (!r) return box(k, ''); if (!r.exams.length) return '<p class="mini">공개된 시험이 없습니다.</p>';
    return r.exams.map(x => { const used = x.attempts.length; const open = (!x.open_at || Date.now() >= Date.parse(x.open_at)) && (!x.close_at || Date.now() < Date.parse(x.close_at)) && x.status === 'published'; const prog = x.attempts.find(t => t.status === 'in_progress');
      return `<article class="efl-card"><header><b>${esc(x.title)}</b><span class="efl-tag">${x.time_limit_min}분 · ${used}/${x.max_attempts}회</span></header><p class="mini">${fmt(x.open_at)} ~ ${fmt(x.close_at)}${x.need_precheck ? ` · 응시 전 기능 테스트 ${x.precheck_ok ? '통과' : '필요'}` : ''}</p>${x.guide ? `<p class="efl-desc">${esc(x.guide)}</p>` : ''}
        <div class="efl-acts">${x.need_precheck && !x.precheck_ok ? `<button class="lbtn sm ghost" data-lact="efl-pre" data-v="${esc(x.exam_id)}">기능 테스트</button>` : ''}${open && (prog || used < x.max_attempts) ? `<button class="lbtn sm" data-lact="efl-start" data-v="${esc(x.exam_id)}">${prog ? '이어서 응시' : '응시하기'}</button>` : `<span class="mini">${open ? '응시 횟수를 모두 썼습니다.' : '응시 기간이 아닙니다.'}</span>`}${x.attempts.filter(t => t.status !== 'in_progress').map(t => `<button class="lbtn sm ghost" data-lact="efl-res" data-v="${esc(t.attempt_id)}">${t.no}회차 결과</button>`).join('')}</div></article>`; }).join('');
  }
  let tick = 0;
  function paperView(p) {
    clearInterval(tick); tick = setInterval(() => { const e = document.getElementById('eflTimer'); if (!e) return clearInterval(tick); const s = Math.max(0, Math.floor((Date.parse(p.attempt.deadline_at) - Date.now() - (p.skew || 0)) / 1000)); e.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s <= 60) e.classList.add('warn'); if (!s) { clearInterval(tick); submitPaper(true); } }, 1000);
    const a = p.answers || {}; const has = (q, id) => [].concat(a[q.q_id] ?? []).includes(id); const rs = p.remaining_sec;
    return `<div class="efl-paper"><div class="efl-bar"><b>${p.attempt.no}회차 응시</b><span>남은 시간 <b class="efl-timer" id="eflTimer">${Math.floor(rs / 60)}:${String(rs % 60).padStart(2, '0')}</b></span></div><p class="mini">답은 고를 때마다 서버에 저장됩니다. 시간은 서버 기준이며, 끝나면 자동 제출됩니다.</p>
      ${p.questions.map((q, i) => `<fieldset class="efl-q"><legend>${i + 1}. ${esc(q.stem)} <small>(${q.points}점)</small></legend>${(q.media || []).map(m => m.type === 'video' ? `<p class="mini">영상 자료: ${esc(m.url)}</p>` : m.url ? `<img alt="문항 이미지" src="${esc(m.url)}">` : `<p class="mini" data-img="${esc(m.file_id)}">이미지 첨부</p>`).join('')}
        ${/single|tf/.test(q.kind) ? q.choices.map(c => `<label><input type="radio" name="eq_${esc(q.q_id)}" value="${esc(c.id)}" data-eq="${esc(q.q_id)}" ${has(q, c.id) ? 'checked' : ''}> ${esc(c.text)}</label>`).join('')
        : q.kind === 'multi' ? q.choices.map(c => `<label><input type="checkbox" value="${esc(c.id)}" data-eq="${esc(q.q_id)}" data-multi="1" ${has(q, c.id) ? 'checked' : ''}> ${esc(c.text)}</label>`).join('')
        : q.kind === 'essay' ? `<textarea rows="5" data-eq="${esc(q.q_id)}" aria-label="${i + 1}번 답">${esc(a[q.q_id] || '')}</textarea>` : `<input data-eq="${esc(q.q_id)}" ${q.kind === 'numeric' ? 'inputmode="decimal"' : ''} aria-label="${i + 1}번 답" value="${esc(a[q.q_id] ?? '')}">`}</fieldset>`).join('')}
      <div class="efl-acts"><button class="lbtn" data-lact="efl-fin">제출하기</button></div></div>`;
  }
  function resultView(r) {
    const back = '<button class="lbtn sm ghost" data-lact="efl-back">시험 목록</button>'; if (!r.visible) return `<div class="efl-card"><p>${esc(r.message)}</p>${back}</div>`;
    const t = r.attempt; const pos = r.position || {}; const txt = (q, v) => v == null ? '무응답' : /single|multi|tf/.test(q.kind) ? [].concat(v).map(id => (q.choices.find(c => c.id === id) || {}).text || id).join(', ') : typeof v === 'object' ? String(v.value) : String(v);
    return `<div class="efl-card efl-res"><header><b>${t.no}회차 결과</b>${back}</header><div class="efl-kpi"><div><small>점수</small><b>${t.score == null ? `자동 ${t.auto_score} · 서술형 채점 대기` : `${t.score} / ${t.max_score}`}</b></div><div><small>백분율</small><b>${r.pct ?? '-'}</b></div><div><small>내 위치</small><b>${pos.rank ? `${pos.rank}등 / ${pos.n}명` : '-'}</b></div><div><small>평균</small><b>${pos.mean ?? '-'}</b></div></div>
      ${r.items.map((q, i) => `<div class="efl-q"><b>${i + 1}. ${esc(q.stem)}</b> <span class="efl-tag ${q.ok === true ? 'graded' : q.ok === false ? 'returned' : ''}">${q.ok === true ? '정답' : q.ok === false ? '오답' : '채점 대기'}</span><p class="mini">내 답: ${esc(txt(q, q.your_answer))}${q.ok === false && q.answer ? ` · 정답: ${esc(txt(q, q.answer))}` : ''}</p>${q.explanation ? `<p class="mini">해설: ${esc(q.explanation)}</p>` : ''}${q.feedback ? `<p class="mini">교수 피드백: ${esc(q.feedback)}</p>` : ''}</div>`).join('')}
      ${r.retry_wrong ? `<div class="efl-acts"><button class="lbtn sm ghost" data-lact="efl-retry" data-v="${esc(t.attempt_id)}">오답 다시 풀기(성적 미반영)</button></div>` : ''}${L.retry ? retryView(L.retry) : ''}</div>`;
  }
  function retryView(R) {
    if (!R.questions.length) return '<p class="mini">다시 풀 오답이 없습니다.</p>';
    return `<div class="efl-retry">${R.questions.map((q, i) => `<fieldset class="efl-q"><legend>${i + 1}. ${esc(q.stem)}</legend>${q.choices.length ? q.choices.map(c => `<label><input type="${q.kind === 'multi' ? 'checkbox' : 'radio'}" name="er_${esc(q.q_id)}" value="${esc(c.id)}"> ${esc(c.text)}</label>`).join('') : `<input name="er_${esc(q.q_id)}" aria-label="답">`}${R.checked ? (c => c ? `<p class="mini">${c.ok ? '정답입니다.' : '다시 확인하세요.'} ${c.explanation ? esc(c.explanation) : ''}</p>` : '')(R.checked.find(c => c.q_id === q.q_id)) : ''}</fieldset>`).join('')}<div class="efl-acts"><button class="lbtn sm" data-lact="efl-rcheck" data-v="${esc(R.attempt_id)}">확인</button></div></div>`;
  }
  function gradeTab(sec) {
    const k = 'grade:' + sec.section_id; const r = get(k, () => call('GET', '/api/lms/h/my', { section: sec.section_id }));
    if (r === undefined) return wait; if (!r) return box(k, '');
    if (r.audit) return `<div class="efl-card"><p>${esc(r.message)}</p></div>`;
    if (r.hidden) return `<div class="efl-card"><p>${esc(r.message)}</p><ul class="efl-items">${r.items.map(i => `<li>${esc(i.name)} <small>${i.weight_pct}%</small></li>`).join('')}</ul></div>`;
    return `<div class="efl-card"><div class="efl-kpi"><div><small>총점</small><b>${r.total ?? '-'}</b></div><div><small>등급</small><b>${esc(r.letter || '-')}</b></div><div><small>상태</small><b>${r.confirmed ? '확정' : '산출 중'}</b></div></div>
      <ul class="efl-items">${r.items.map(i => `<li><span>${esc(i.name)} <small>${i.weight_pct}%</small></span><b>${i.score == null ? '-' : `${i.score} / ${i.max_score}`}</b>${i.feedback ? `<p class="mini">${esc(i.feedback)}</p>` : ''}</li>`).join('')}</ul></div>`;
  }

  /* ── 동작 ── */
  async function saveDraft(ta) { try { const r = await call('POST', '/api/lms/e/draft', { asg_id: ta.dataset.asg, body: ta.value, base_version: ta.dataset.ver ? +ta.dataset.ver : undefined }); ta.dataset.ver = r.submission.version; const s = document.getElementById('efls_' + ta.dataset.asg); if (s) s.textContent = `버전 ${r.submission.version} · ${fmt(r.submission.saved_at)} 자동 저장`; drop('asg:'); return r; } catch (e) { toast(e.message, 'bad'); return null; } }
  const timers = {};
  document.addEventListener('input', e => { const ta = e.target.closest && e.target.closest('.efl-ta'); if (!ta || ta.readOnly) return; const id = ta.dataset.asg; clearTimeout(timers[id]); const s = document.getElementById('efls_' + id); if (s) s.textContent = '저장 대기 중…'; timers[id] = setTimeout(() => saveDraft(ta), 1200); });
  const toB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(f); });
  async function saveAnswer(el) { const p = L.paper; if (!p) return; const q = el.dataset.eq; const v = el.dataset.multi ? [...document.querySelectorAll(`[data-eq="${q}"][data-multi]:checked`)].map(x => x.value) : el.value;
    p.answers = { ...(p.answers || {}), [q]: v };
    try { const r = await call('POST', '/api/lms/f/answer', { attempt_id: p.attempt.attempt_id, answers: { [q]: v } }); if (r.expired) { toast('시험 시간이 끝나 자동 제출했습니다.', 'bad'); L.paper = null; await openResult(r.attempt.attempt_id); } } catch (x) { toast(x.message, 'bad'); } }
  document.addEventListener('change', async e => {
    const up = e.target.closest && e.target.closest('.efl-up');
    if (up) { const id = up.dataset.asg; const cur = (L.cache['asg:' + L.sec] || { assignments: [] }).assignments.find(g => g.asg_id === id); const s = cur && cur.submission; const ids = s ? s.files.map(f => f.file_id) : [];
      await act(async () => { for (const f of [...up.files]) { if (f.size > 2 * 1024 * 1024) throw new Error(`${f.name}: 파일은 2MB까지 올릴 수 있습니다.`); const r = await call('POST', '/api/lms/e/file', { name: f.name, mime: f.type || 'application/octet-stream', b64: await toB64(f) }); ids.push(r.file_id); }
        const ta = document.querySelector(`.efl-ta[data-asg="${id}"]`); return call('POST', '/api/lms/e/draft', { asg_id: id, body: ta ? ta.value : (s ? s.body : ''), files: ids }); }, '파일을 첨부했습니다.', 'asg:'); return; }
    const q = e.target.closest && e.target.closest('[data-eq]'); if (q) saveAnswer(q);
  });
  async function openResult(id) { L.retry = null; L.result = await call('GET', '/api/lms/f/result', { attempt: id }); drop('exam:'); rer(); }
  async function submitPaper(auto) { const p = L.paper; if (!p) return; clearInterval(tick);
    await act(async () => { const r = await call('POST', '/api/lms/f/submit', { attempt_id: p.attempt.attempt_id, answers: p.answers || {} }); L.paper = null; await openResult(r.attempt.attempt_id); return r; }, auto ? '시간이 끝나 자동 제출했습니다.' : '제출했습니다. 객관식은 바로 채점됩니다.'); }
  async function precheck(id) { const t0 = performance.now(); try { await fetch(location.pathname, { method: 'HEAD', cache: 'no-store' }); } catch (e) { } const ms = Math.round(performance.now() - t0); let storage = false; try { sessionStorage.setItem('efl_t', '1'); sessionStorage.removeItem('efl_t'); storage = true; } catch (e) { }
    const r = await call('POST', '/api/lms/f/precheck', { exam_id: id, result: { browser: !!(window.fetch && window.Promise && window.FileReader), storage, screen: innerWidth >= 320, clock: Math.abs(Date.now() - (LR.serverNow || Date.now())) < 300000, network_ms: ms } });
    toast(r.ok ? '기능 테스트를 통과했습니다.' : '기능 테스트 실패: ' + r.fails.join(', '), r.ok ? 'ok' : 'bad'); return r; }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-lact^="efl-"]'); if (!el) return; e.preventDefault(); const k = el.dataset.lact; const v = el.dataset.v;
    if (k === 'efl-sec') { L.sec = v; L.paper = L.result = L.retry = L.vers = null; rer(); }
    if (k === 'efl-tab') { L.tab = v; L.result = L.retry = null; rer(); }
    if (k === 'efl-submit') { const ta = document.querySelector(`.efl-ta[data-asg="${v}"]`); clearTimeout(timers[v]); await act(async () => { if (ta && !ta.readOnly) await call('POST', '/api/lms/e/draft', { asg_id: v, body: ta.value }); return call('POST', '/api/lms/e/submit', { asg_id: v }); }, '제출했습니다.', 'asg:'); }
    if (k === 'efl-unsub') await act(() => call('POST', '/api/lms/e/submit', { asg_id: v, cancel: true }), '제출을 취소했습니다. 고친 뒤 다시 제출하세요.', 'asg:');
    if (k === 'efl-vers') { if (L.vers && L.vers.sub_id === v) { L.vers = null; return rer(); } L.vers = await act(() => call('GET', '/api/lms/e/versions', { sub: v })); rer(); }
    if (k === 'efl-dl') { const f = await act(() => call('GET', '/api/lms/e/file', { id: v })); if (f) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([Uint8Array.from(atob(f.b64), c => c.charCodeAt(0))], { type: f.mime })); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); } }
    if (k === 'efl-pre') { await act(() => precheck(v), '', 'exam:'); }
    if (k === 'efl-start') { const r = await act(() => call('POST', '/api/lms/f/start', { exam_id: v })); if (r) { r.skew = Date.parse(r.now) ? Date.now() - Date.parse(r.now) : 0; L.paper = r; L.result = null; rer(); window.scrollTo(0, 0); } }
    if (k === 'efl-fin') { if (confirm('제출하면 고칠 수 없습니다. 제출할까요?') !== false) submitPaper(false); }
    if (k === 'efl-res') await act(() => openResult(v));
    if (k === 'efl-back') { L.result = L.retry = null; drop('exam:'); rer(); }
    if (k === 'efl-retry') { const r = await act(() => call('POST', '/api/lms/f/retry', { attempt_id: v })); if (r) { L.retry = { ...r, attempt_id: v }; rer(); } }
    if (k === 'efl-rcheck') { const R = L.retry; const answers = {}; R.questions.forEach(q => { const els = [...document.querySelectorAll(`[name="er_${q.q_id}"]`)]; const val = q.kind === 'multi' ? els.filter(x => x.checked).map(x => x.value) : q.choices.length ? (els.find(x => x.checked) || {}).value : (els[0] || {}).value; if (val != null && val !== '') answers[q.q_id] = val; });
      const c = await act(() => call('POST', '/api/lms/f/retry', { attempt_id: v, answers })); if (c) { R.checked = c.checked; toast(`${c.checked.filter(x => x.ok).length} / ${c.checked.length}문항 정답입니다.`, 'ok'); rer(); } }
  });

  /* ── 학습자 앱에 붙이기: 라우트 #lms + 내 강의 카드의 바로가기 ── */
  { const base = viewPage; viewPage = function (id, ...r) { if (id === 'lms' && on()) { try { return page(); } catch (e) { console.error('efh learner', e); return '<p>화면을 그리지 못했습니다.</p>'; } } return base.call(this, id, ...r); }; } // eslint-disable-line no-global-assign
  if (typeof viewMy === 'function') { const base = viewMy; viewMy = function (...a) { const h = base.apply(this, a); if (!on() || !LR.me) return h; const c = `<div class="mycard" id="eflMy"><div class="myhead"><h2>과제 · 시험 · 성적</h2></div><p class="mini">수강 분반의 과제 제출, 시험 응시, 성적과 피드백을 확인합니다.</p><a class="lbtn sm" href="#lms">바로 가기</a></div>`; return h.includes('<div class="mygrid">') ? h.replace('<div class="mygrid">', '<div class="mygrid">' + c) : c + h; }; } // eslint-disable-line no-global-assign
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#lms')) { clearInterval(tick); } });
  try { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/efh-learner.css?v=30.0'; document.head.appendChild(l); } catch (e) { }
  window.EFHL = { L, call, drop };
})();
