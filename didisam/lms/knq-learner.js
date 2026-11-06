/* v30 학사 LMS 묶음 K · N · Q — 학습자 앱(learner.html) 화면
   #knq/q 비교과(목록 · 찜 · 공유 · 신청(개인/팀 · 신청서 · 파일) · 나의 신청 · 수정/취소 · 나의 역량 지수 그래프 · 활동게시판 · 후기 · 이수증)
   #knq/n MOOC(검색 · 자동완성 · 찜/북마크 · 기수 신청 · 마이페이지 · 수료증 · 진단평가 · 학습경로 추천)
   #knq/k 설문(참여할 설문 · 다국어 응답)
   - 운영: 학습자 세션(dd_lsid)으로 /api/lms/{k,n,q}/* 를 부른다. 서버가 학번을 세션 학번으로 고정한다.
   - 데모: 이 브라우저의 기관 데이터룸(S.lms.k · n · q)을 읽기만 한다(신청 · 응답은 운영 서버에서).
   - 마이 화면에 바로가기 카드를 붙인다. learner.html에는 통합 때 <script src="lms/knq-learner.js"> 한 줄만 더한다. */
(function () {
  'use strict';
  if (typeof viewMy !== 'function' || typeof viewPage !== 'function' || typeof LR !== 'object') return;
  try { if (!document.querySelector('link[data-knq]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/knq-learner.css?v=30.0'; l.dataset.knq = '1'; document.head.appendChild(l); } } catch (e) { }
  const on = () => { try { const o = SITE() && SITE().org; return !!(o && o.type === 'univ' && o.ed === 'lms'); } catch (e) { return false; } };
  const live = () => LR.mode === 'live';
  const me = () => String((LR.me && LR.me.sid) || '');
  const ST = { tab: 'q', q: null, qme: null, qsel: null, qform: null, board: null, n: null, nq: '', sug: [], ncur: null, nmy: null, diags: null, dtake: null, rec: null, k: null, kans: null, lang: 'ko', busy: false, err: '' };
  const STN = { ready: '접수대기', recruiting: '접수중', running: '운영중', completing: '이수처리중', closing: '마감처리중', closed: '마감' };
  const APS = { applied: '신청', approved: '승인', waiting: '대기', rejected: '반려', cancelled: '취소' };
  const LV = { basic: '기초', inter: '중급', adv: '심화' };
  const COMPS = [['C1', '의사소통'], ['C2', '협업'], ['C3', '창의융합'], ['C4', '자기관리'], ['C5', '글로벌'], ['C6', '문제해결']];
  const rr = () => { if (typeof lrender === 'function') lrender(); };
  const call = (m, url, body) => api(m, url, body);
  const qs = o => '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();

  /* ── 데모(읽기 전용): 스튜디오 데이터룸에서 같은 규칙으로 계산 ── */
  const room = () => { try { const r = typeof demoRoom === 'function' ? demoRoom() : null; return (r && r.lms) || {}; } catch (e) { return {}; } };
  function demoQ() {
    const Q = room().q; const no = me(); if (!Q) return { items: [], me: { applications: [], competency: [], mileage: 0, mileage_expected: 0 } };
    const items = Q.programs.filter(p => STN[p.status]).map(p => ({ ...p, status_name: STN[p.status], wished: Q.wish.some(w => w.program_id === p.program_id && w.member_no === no), my_status: (Q.apps.find(a => a.program_id === p.program_id && a.member_no === no) || {}).status || null }));
    const A = Q.apps.filter(a => a.member_no === no); const comp = {};
    A.filter(a => a.completion === 'completed').forEach(a => { const p = Q.programs.find(x => x.program_id === a.program_id); if (!p) return; p.competencies.forEach(c => { const k = comp[c.code] = comp[c.code] || { code: c.code, name: c.name, mileage: 0 }; k.mileage += a.mileage * c.pct / 100; }); });
    const pt = id => Q.programs.find(p => p.program_id === id) || {};
    return { items, me: { applications: A.map(a => ({ ...a, title: pt(a.program_id).title, program_status: pt(a.program_id).status, status_name: STN[pt(a.program_id).status] })), competency: Object.values(comp), mileage: A.filter(a => a.completion === 'completed' && pt(a.program_id).status === 'closed').reduce((s, a) => s + a.mileage, 0), mileage_expected: 0 } };
  }
  function demoN() { const N = room().n; const no = me(); if (!N) return { items: [], my: { wish: [], bookmark: [], enrolls: [], diag: [] }, diags: [] };
    const items = N.courses.filter(c => c.status === 'approved'); const C = id => N.courses.find(c => c.course_id === id) || {}; const H = id => N.cohorts.find(h => h.cohort_id === id) || {};
    return { items, my: { wish: N.wish.filter(w => w.member_no === no && w.kind === 'wish').map(w => C(w.course_id)), bookmark: N.wish.filter(w => w.member_no === no && w.kind === 'bookmark').map(w => C(w.course_id)), enrolls: N.enrolls.filter(e => e.member_no === no).map(e => ({ ...e, title: C(H(e.cohort_id).course_id).title, no: H(e.cohort_id).no })), diag: [] },
      diags: N.diags.map(d => ({ test_id: d.test_id, title: d.title, kind: d.kind, n: d.items.length, questions: d.items.map(({ q, options, area }) => ({ q, options, area })) })), cohorts: N.cohorts }; }
  function demoK() { const K = room().k; const no = me(); if (!K) return [];
    return K.surveys.filter(s => s.status === 'open' && !s.is_template && !s.responses.some(r => r.member_hash === no)).map(s => ({ survey_id: s.survey_id, title: s.title, kind: s.kind, gate_steps: s.gate_steps, _s: s })); }
  const demoMsg = () => toast('데모 화면에서는 보기만 됩니다. 신청 · 응답은 운영 서버에서 학습자 로그인으로 합니다.');

  /* ── 불러오기 ── */
  async function load(tab) {
    ST.err = '';
    try {
      if (tab === 'q') { if (live()) { const [l, m] = await Promise.all([call('GET', '/api/lms/q/student/programs' + qs({ q: ST.qq || '', wished: ST.qw ? 1 : '' })), call('GET', '/api/lms/q/student/me')]); ST.q = l.items; ST.qme = m; } else { const d = demoQ(); ST.q = d.items.filter(p => (!ST.qq || p.title.includes(ST.qq)) && (!ST.qw || p.wished)); ST.qme = d.me; } }
      if (tab === 'n') { if (live()) { const [s, m, d] = await Promise.all([call('GET', '/api/lms/n/search' + qs({ q: ST.nq, tag: ST.ntag || '', level: ST.nlv || '', free: ST.nfree ? 1 : '' })), call('GET', '/api/lms/n/mypage'), call('GET', '/api/lms/n/diags')]); ST.n = s.items; ST.ntags = s.tags; ST.nmy = m; ST.diags = d.items; }
        else { const d = demoN(); ST.n = d.items.filter(c => (!ST.nq || c.title.includes(ST.nq) || c.tags.some(t => t.includes(ST.nq))) && (!ST.ntag || c.tags.includes(ST.ntag)) && (!ST.nlv || c.level === ST.nlv) && (!ST.nfree || !c.price)); ST.ntags = [...new Set(d.items.flatMap(c => c.tags))].sort(); ST.nmy = d.my; ST.diags = d.diags; } }
      if (tab === 'k') { ST.k = live() ? (await call('GET', '/api/lms/k/pending')).items : demoK(); }
    } catch (e) { ST.err = e.message; }
    rr();
  }
  const ensure = tab => { const key = { q: 'q', n: 'n', k: 'k' }[tab]; if (ST[key] === null && !ST.busy) { ST.busy = true; ST[key] = []; load(tab).finally(() => { ST.busy = false; }); } };

  /* ── 공용 조각 ── */
  const pill = t => `<span class="kl-pill">${esc(t)}</span>`;
  function radar(C) {
    if (!C || !C.length) return '<p class="mini">이수한 비교과 프로그램이 생기면 역량 지수가 그려집니다.</p>';
    const L = COMPS.map(([code, name]) => { const c = C.find(x => x.code === code || x.name === name); return { name, v: c ? Math.round(c.mileage * 10) / 10 : 0 }; }); const mx = Math.max(10, ...L.map(x => x.v)); const cx = 150, cy = 125, r = 90;
    const pt = (i, k) => { const a = -Math.PI / 2 + i * 2 * Math.PI / L.length; return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]; }; const ring = k => L.map((_, i) => pt(i, k).join(',')).join(' ');
    return `<svg class="kl-radar" viewBox="0 0 300 250" role="img" aria-label="나의 역량 지수">${[0.25, 0.5, 0.75, 1].map(k => `<polygon points="${ring(k)}" fill="none" stroke="#ddd"/>`).join('')}<polygon points="${L.map((x, i) => pt(i, x.v / mx).join(',')).join(' ')}" fill="var(--pri)" fill-opacity=".28" stroke="var(--pri)" stroke-width="2"/>${L.map((x, i) => { const [px, py] = pt(i, 1.18); return `<text x="${px}" y="${py}" font-size="11" text-anchor="middle" fill="currentColor">${esc(x.name)} ${x.v}</text>`; }).join('')}</svg>`;
  }
  function formHtml(form, role) {
    return form.filter(f => f.audience === 'all' || f.audience === role).map(f => { const n = `kf_${esc(f.id)}`; const L = `${esc(f.label)}${f.required ? ' *' : ''}`;
      if (f.type === 'longtext') return `<label>${L}<textarea name="${n}" rows="3"></textarea></label>`;
      if (f.type === 'single') return `<label>${L}<select name="${n}"><option value="">선택</option>${f.options.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>`;
      if (f.type === 'multi') return `<div class="kl-f">${L}<br>${f.options.map(o => `<label class="kl-ck"><input type="checkbox" name="${n}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div>`;
      if (f.type === 'consent') return `<label class="kl-ck"><input type="checkbox" name="${n}"> ${L}</label>`;
      if (f.type === 'date') return `<label>${L}<input type="date" name="${n}"></label>`;
      if (f.type === 'file') return `<label>${L}<input type="file" name="${n}"><small class="mini">2MB 이하</small></label>`;
      return `<label>${L}<input name="${n}"></label>`; }).join('');
  }
  async function readForm(box, form) {
    const o = {};
    for (const f of form) { const els = [...box.querySelectorAll(`[name="kf_${f.id}"]`)]; if (!els.length) continue;
      if (f.type === 'multi') { const v = els.filter(e => e.checked).map(e => e.value); if (v.length) o[f.id] = v; }
      else if (f.type === 'consent') o[f.id] = els[0].checked;
      else if (f.type === 'file') { const file = els[0].files && els[0].files[0]; if (file) { if (file.size > 2 * 1024 * 1024) throw new Error('파일은 2MB까지 올릴 수 있습니다.');
        const b64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(new Error('파일을 읽지 못했습니다.')); r.readAsDataURL(file); });
        o[f.id] = (await call('POST', '/api/lms/e/file', { name: file.name, mime: file.type || 'application/octet-stream', b64 })).file_id; } }
      else if (els[0].value) o[f.id] = els[0].value; }
    return o;
  }
  const openHtml = (html) => { const w = window.open('', '_blank'); if (!w) return toast('팝업이 막혀 있습니다.', 'bad'); w.document.write(html); w.document.close(); };

  /* ── 비교과 ── */
  function viewQ() {
    if (ST.q === null) { ensure('q'); return '<p class="mini">불러오는 중입니다.</p>'; }
    const M = ST.qme || { applications: [], competency: [], mileage: 0, mileage_expected: 0 }; const sel = ST.qsel;
    const list = ST.q.map(p => `<article class="kl-card"><div class="kl-cov" ${p.cover_url && p.cover_url.startsWith('file:') && live() ? `data-kcov="${esc(p.program_id)}|${esc(p.cover_url.slice(5))}"` : ''}>${p.certified ? '★ 우수 프로그램' : esc(p.group_name || '비교과')}</div>
      <div>${pill(STN[p.status] || p.status)}${p.my_status ? pill('내 신청: ' + APS[p.my_status]) : ''}${p.eligible === false ? pill('신청 대상 아님') : ''}</div><h3>${esc(p.title)}</h3><p class="mini">${esc(String(p.summary || '').slice(0, 90))}</p>
      <p class="mini">마일리지 ${p.mileage_max} · ${(p.competencies || []).map(c => esc(c.name)).join(' · ')}</p>
      <div class="kl-acts">${p.status === 'recruiting' && !p.my_status ? `<button class="lbtn sm" data-lact="knq-qapply" data-id="${esc(p.program_id)}">신청</button>` : ''}<button class="lbtn sm ghost" data-lact="knq-qwish" data-id="${esc(p.program_id)}">${p.wished ? '찜 해제' : '찜'}</button><button class="lbtn sm ghost" data-lact="knq-share" data-id="${esc(p.program_id)}">공유</button></div></article>`).join('') || '<p class="mini">조건에 맞는 프로그램이 없습니다.</p>';
    const apps = M.applications.map(a => `<li><b>${esc(a.title)}</b> <small>${esc(a.status_name || '')} · ${esc(APS[a.status])}${a.wait_no ? ' ' + a.wait_no + '번' : ''}${a.completion === 'completed' ? ' · 이수' : a.completion === 'failed' ? ' · 미이수' : ''}</small>
      ${['applied', 'approved', 'waiting'].includes(a.status) && a.program_status === 'recruiting' ? `<button class="lbtn sm ghost" data-lact="knq-qcancel" data-id="${esc(a.program_id)}">취소</button>` : ''}
      ${a.status === 'approved' && ['running', 'completing', 'closing', 'closed'].includes(a.program_status) ? `<button class="lbtn sm ghost" data-lact="knq-qboard" data-id="${esc(a.program_id)}" data-t="${esc(a.title)}">활동 · 후기</button>` : ''}
      ${a.completion === 'completed' && ['closing', 'closed'].includes(a.program_status) ? `<button class="lbtn sm ghost" data-lact="knq-qcert" data-id="${esc(a.program_id)}">이수증</button>` : ''}</li>`).join('') || '<li class="mini">신청한 프로그램이 없습니다.</li>';
    const form = sel ? `<div class="mycard kl-form" id="knqApply"><h3>${esc(sel.title)} 신청</h3><p class="mini">학번 ${esc(me())} · ${sel.kind === 'team' ? `팀 신청(${sel.team_min}~${sel.team_max}명)` : '개인 신청'}</p>
      ${sel.kind === 'team' ? `<label>방식<select name="tm" data-lchg="knq-tm"><option value="create">팀 개설(팀장)</option><option value="join">기존 팀 참여</option></select></label><label>팀명<input name="tn" maxlength="40"></label><label>팀 비밀번호(4자 이상)<input type="password" name="tp" maxlength="64"></label>` : ''}
      ${(sel.sessions || []).length ? `<div class="kl-f"><b>참여할 주제</b><br>${sel.sessions.map(s => `<label class="kl-ck"><input type="checkbox" name="ses" value="${esc(s.session_id)}"> ${s.seq}. ${esc(s.title)}</label>`).join('')}</div>` : ''}
      <div id="knqAf">${formHtml(sel.form || [], sel.kind === 'team' ? (ST.tm === 'join' ? 'member' : 'leader') : 'member')}</div><div class="kl-acts"><button class="lbtn sm" data-lact="knq-qsubmit">신청하기</button><button class="lbtn sm ghost" data-lact="knq-qclose">닫기</button></div></div>` : '';
    const bd = ST.board ? `<div class="mycard kl-form"><h3>${esc(ST.board.title)} — 활동게시판 · 후기</h3><label>활동 글<textarea id="knqBd" rows="2"></textarea></label><button class="lbtn sm" data-lact="knq-bpost">올리기</button>
      <ul class="kl-ul">${(ST.board.items || []).map(b => `<li>${esc(b.body)} <small class="mini">${esc(b.member_no)}</small></li>`).join('') || '<li class="mini">글이 없습니다.</li>'}</ul>
      <label>후기 별점<select id="knqRt">${[5, 4, 3, 2, 1].map(n => `<option>${n}</option>`).join('')}</select></label><label>후기<textarea id="knqRb" rows="2"></textarea></label><button class="lbtn sm" data-lact="knq-review">후기 남기기</button></div>` : '';
    return `<div class="kl-bar"><input type="search" id="knqQq" placeholder="프로그램 검색" value="${esc(ST.qq || '')}" aria-label="프로그램 검색"><button class="lbtn sm ghost" data-lact="knq-qfind">검색</button><label class="kl-ck"><input type="checkbox" data-lchg="knq-qw" ${ST.qw ? 'checked' : ''}> 찜한 것만</label></div>
      ${form}${bd}<div class="kl-two"><div class="mycard"><h3>나의 역량 지수</h3><p class="mini">확정 마일리지 ${M.mileage}${M.mileage_expected ? ` · 마감 전 예정 ${M.mileage_expected}` : ''}</p>${radar(M.competency)}</div><div class="mycard"><h3>나의 신청</h3><ul class="kl-ul">${apps}</ul></div></div><div class="kl-grid">${list}</div>`;
  }
  /* ── MOOC ── */
  function viewN() {
    if (ST.n === null) { ensure('n'); return '<p class="mini">불러오는 중입니다.</p>'; }
    const M = ST.nmy || { wish: [], bookmark: [], enrolls: [] }; const c = ST.ncur; const EST = { pending: '승인 대기', approved: '수강 중', rejected: '반려', completed: '수료', failed: '미수료', cancelled: '취소' };
    const list = ST.n.map(x => `<article class="kl-card"><div class="kl-cov">${esc(x.category || 'MOOC')}</div><div>${pill(LV[x.level])}${pill(x.price ? x.price.toLocaleString() + '원' : '무료')}</div><h3>${esc(x.title)}</h3><p class="mini">${esc(String(x.summary || '').slice(0, 80))}</p>
      <div>${x.tags.map(t => `<button class="kl-pill" data-lact="knq-ntag" data-v="${esc(t)}">#${esc(t)}</button>`).join('')}</div><div class="kl-acts"><button class="lbtn sm" data-lact="knq-nopen" data-id="${esc(x.course_id)}">기수 · 신청</button><button class="lbtn sm ghost" data-lact="knq-nwish" data-id="${esc(x.course_id)}" data-k="wish">찜</button><button class="lbtn sm ghost" data-lact="knq-nwish" data-id="${esc(x.course_id)}" data-k="bookmark">북마크</button></div></article>`).join('') || '<p class="mini">조건에 맞는 과정이 없습니다.</p>';
    const det = c ? `<div class="mycard" id="knqNd"><h3>${esc(c.title)}</h3><p class="mini">${esc(c.summary)}</p><p class="mini">수료 기준: 진도율 ${c.rule.min_progress}% · 학습활동 ${c.rule.min_activity}회 · 점수 ${c.rule.pass_score}점 · 과락 ${c.rule.fail_line}점 미만</p>
      <ul class="kl-ul">${(c.cohorts || []).map(h => `<li>${h.no}기 <small>${esc(h.starts_on || '-')} ~ ${esc(h.ends_on || '-')} · 정원 ${h.capacity || '제한 없음'}</small> ${h.status === 'open' ? `<button class="lbtn sm" data-lact="knq-nenroll" data-id="${esc(h.cohort_id)}">신청</button>` : '<small class="mini">모집 마감</small>'}</li>`).join('') || '<li class="mini">열린 기수가 없습니다.</li>'}</ul>${c.price ? '<p class="mini">유료 과정은 결제(PG 연동) 후 수강이 확정됩니다.</p>' : ''}</div>` : '';
    const my = `<div class="mycard"><h3>마이페이지</h3><p class="mini">찜 ${M.wish.length} · 북마크 ${M.bookmark.length}</p><ul class="kl-ul">${M.enrolls.map(e => `<li><b>${esc(e.title)}</b> <small>${e.no}기 · ${esc(EST[e.status] || e.status)} · 진도 ${e.progress}%</small>${e.status === 'completed' ? ` <button class="lbtn sm ghost" data-lact="knq-ncert" data-id="${esc(e.cohort_id)}">수료증</button>` : ''}${['pending', 'approved'].includes(e.status) ? ` <button class="lbtn sm ghost" data-lact="knq-ncancel" data-id="${esc(e.cohort_id)}">취소</button>` : ''}</li>`).join('') || '<li class="mini">수강 신청 내역이 없습니다.</li>'}</ul></div>`;
    const dg = `<div class="mycard"><h3>진단평가 · 학습경로</h3>${(ST.diags || []).map(d => `<p>${esc(d.title)} <small class="mini">${d.n}문항</small> <button class="lbtn sm ghost" data-lact="knq-dtake" data-id="${esc(d.test_id)}">응시</button></p>`).join('') || '<p class="mini">진단평가가 없습니다.</p>'}<button class="lbtn sm ghost" data-lact="knq-rec">추천 학습경로 보기</button>
      ${ST.dtake ? `<div class="kl-form" id="knqDt">${ST.dtake.questions.map((q, i) => `<div class="kl-f"><b>${i + 1}. ${esc(q.q)}</b><br>${q.options.map((o, j) => `<label class="kl-ck"><input type="radio" name="d${i}" value="${j}"> ${esc(o)}</label>`).join('')}</div>`).join('')}<button class="lbtn sm" data-lact="knq-dsubmit">제출</button></div>` : ''}
      ${ST.rec ? `<ol class="kl-ol">${ST.rec.path.map(p => `<li><b>${esc(p.title)}</b> <small class="mini">${esc(LV[p.level])} · ${esc(p.why)}</small></li>`).join('') || `<li class="mini">${esc(ST.rec.message || '추천할 과정이 없습니다.')}</li>`}</ol>` : ''}</div>`;
    return `<div class="kl-bar"><input type="search" id="knqNq" list="knqSug" placeholder="과정명 · 태그(자동완성)" value="${esc(ST.nq)}" aria-label="과정 검색"><datalist id="knqSug">${ST.sug.map(s => `<option value="${esc(s.replace(/^#/, ''))}">`).join('')}</datalist><button class="lbtn sm ghost" data-lact="knq-nfind">검색</button>
      <select data-lchg="knq-nlv" aria-label="수준"><option value="">모든 수준</option>${Object.entries(LV).map(([k, v]) => `<option value="${k}" ${ST.nlv === k ? 'selected' : ''}>${v}</option>`).join('')}</select><label class="kl-ck"><input type="checkbox" data-lchg="knq-nfree" ${ST.nfree ? 'checked' : ''}> 무료만</label>${ST.ntag ? `<button class="kl-pill" data-lact="knq-ntag" data-v="">#${esc(ST.ntag)} ✕</button>` : ''}</div>
      ${det}<div class="kl-two">${my}${dg}</div><div class="kl-grid">${list}</div>`;
  }
  /* ── 설문 ── */
  function viewK() {
    if (ST.k === null) { ensure('k'); return '<p class="mini">불러오는 중입니다.</p>'; }
    const s = ST.kans;
    const L = ST.k.map(x => `<li><b>${esc(x.title)}</b>${(x.gate_steps || []).length ? ' <small class="mini">참여해야 다음 단계(수료 · 성적 확인 등)로 갈 수 있습니다</small>' : ''} <button class="lbtn sm" data-lact="knq-kopen" data-id="${esc(x.survey_id)}">참여</button></li>`).join('') || '<li class="mini">참여할 설문이 없습니다.</li>';
    const q = s ? `<div class="mycard kl-form" id="knqKf"><h3>${esc(s.title_l || s.title)}</h3><label>언어<select data-lchg="knq-klang"><option value="ko">한국어</option><option value="en" ${ST.lang === 'en' ? 'selected' : ''}>English</option></select></label>
      ${s.questions.map(x => { const n = `kq_${x.qid}`; const L2 = `<b>${x.seq}. ${esc(x.label)}</b>${x.required ? ' *' : ''}`;
        if (x.type === 'html' || x.type === 'video') return `<p class="mini">${esc(x.label || '')}</p>`;
        if (x.type === 'single' || x.type.startsWith('likert')) return `<div class="kl-f">${L2}<br>${x.labels.map((o, i) => `<label class="kl-ck"><input type="radio" name="${n}" value="${x.type === 'single' ? i : i + 1}"> ${esc(o)}</label>`).join('')}</div>`;
        if (x.type === 'nps') return `<div class="kl-f">${L2}<br>${Array.from({ length: 11 }, (_, i) => `<label class="kl-ck"><input type="radio" name="${n}" value="${i}"> ${i}</label>`).join('')}</div>`;
        if (x.type === 'multi') return `<div class="kl-f">${L2}<br>${x.labels.map((o, i) => `<label class="kl-ck"><input type="checkbox" name="${n}" value="${i}"> ${esc(o)}</label>`).join('')}</div>`;
        return `<label>${L2}<textarea name="${n}" rows="2"></textarea></label>`; }).join('')}<button class="lbtn sm" data-lact="knq-ksubmit">제출</button></div>` : '';
    return `${q}<div class="mycard"><h3>참여할 설문</h3><ul class="kl-ul">${L}</ul></div>`;
  }
  function page(tab) {
    if (!LR.me) return typeof needLogin === 'function' ? needLogin('knq/' + tab) : '<p>로그인이 필요합니다.</p>';
    const T = [['q', '비교과'], ['n', 'MOOC'], ['k', '설문']];
    return `<section class="sec"><div class="in" id="knqPage"><p class="eb">학번 ${esc(me())}</p><h2>비교과 · MOOC · 설문</h2>${live() ? '' : '<p class="mini kl-demo">데모 화면 — 기관 데이터를 보기만 합니다. 신청 · 응답은 운영 서버에서 학습자 로그인으로 합니다.</p>'}
      <nav class="kl-tabs" aria-label="구분">${T.map(([k, v]) => `<a href="#knq/${k}" class="${tab === k ? 'on' : ''}">${v}</a>`).join('')}</nav>${ST.err ? `<p class="mini kl-err">${esc(ST.err)}</p>` : ''}
      ${tab === 'n' ? viewN() : tab === 'k' ? viewK() : viewQ()}</div></section>`;
  }
  { const base = viewPage; viewPage = function (id, ...r) { if (id === 'knq' && on()) { const b = (typeof route === 'function' ? route().b : '') || 'q'; return page(['q', 'n', 'k'].includes(b) ? b : 'q'); } return base.call(this, id, ...r); }; }
  { const base = viewMy; viewMy = function (...a) { const h = base.apply(this, a); if (!on() || !LR.me) return h;
    const c = `<div class="mycard" id="knqMy"><div class="myhead"><h2>비교과 · MOOC · 설문</h2></div><p class="mini">비교과 신청 · 나의 역량 지수, 공개 강좌(MOOC) 수강 · 수료증, 참여할 설문을 한곳에서 봅니다.</p><div class="kl-acts"><a class="lbtn sm" href="#knq/q">비교과</a><a class="lbtn sm ghost" href="#knq/n">MOOC</a><a class="lbtn sm ghost" href="#knq/k">설문</a></div></div>`;
    try { return h.includes('<div class="mygrid">') ? h.replace('<div class="mygrid">', '<div class="mygrid">' + c) : c + h; } catch (e) { return h; } }; }
  const covCache = {};
  new MutationObserver(() => { document.querySelectorAll('[data-kcov]:not([data-done])').forEach(el => { el.dataset.done = '1'; const [pid, fid] = el.dataset.kcov.split('|');
    const set = u => { el.style.backgroundImage = `url("${u}")`; el.classList.add('img'); };
    if (covCache[fid]) return set(covCache[fid]); call('GET', '/api/lms/q/file' + qs({ program_id: pid, file_id: fid })).then(f => { covCache[fid] = URL.createObjectURL(new Blob([Uint8Array.from(atob(f.b64), c => c.charCodeAt(0))], { type: f.mime })); set(covCache[fid]); }).catch(() => { }); }); }).observe(document.body, { childList: true, subtree: true });

  /* ── 동작 ── */
  const W = async (fn, ok) => { try { const r = await fn(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); return r; } catch (e) { toast(e.message, 'bad'); return null; } };
  const A = {
    'knq-qfind': () => { ST.qq = ($('#knqQq') || {}).value || ''; ST.q = null; rr(); },
    'knq-qwish': async el => { if (!live()) return demoMsg(); if (await W(() => call('POST', '/api/lms/q/wish', { program_id: el.dataset.id }))) { ST.q = null; rr(); } },
    'knq-share': el => { const u = location.origin + location.pathname + location.search + '#knq/q'; try { navigator.clipboard && navigator.clipboard.writeText(u); } catch (e) { } toast('공유 링크를 복사했습니다.'); },
    'knq-qapply': async el => { if (!live()) return demoMsg(); const p = await W(() => call('GET', '/api/lms/q/program' + qs({ program_id: el.dataset.id }))); if (p) { ST.qsel = p; ST.tm = 'create'; rr(); setTimeout(() => { const f = $('#knqApply'); f && f.scrollIntoView({ block: 'nearest' }); }); } },
    'knq-qclose': () => { ST.qsel = null; rr(); },
    'knq-qsubmit': async el => { const p = ST.qsel; const box = $('#knqApply'); const role = p.kind === 'team' ? (ST.tm === 'join' ? 'member' : 'leader') : 'member'; el.disabled = true;
      const r = await W(async () => { const answers = await readForm(box, (p.form || []).filter(f => f.audience === 'all' || f.audience === role)); const v = n => (box.querySelector(`[name="${n}"]`) || {}).value || '';
        return call('POST', '/api/lms/q/apply', { program_id: p.program_id, answers, sessions: [...box.querySelectorAll('[name=ses]:checked')].map(x => x.value), ...(p.kind === 'team' ? { team: { mode: ST.tm, name: v('tn'), password: v('tp') } } : {}) }); }, x => x.message);
      el.disabled = false; if (r) { ST.qsel = null; ST.q = null; rr(); } },
    'knq-qcancel': async el => { if (!live()) return demoMsg(); if (await W(() => call('POST', '/api/lms/q/apply/cancel', { program_id: el.dataset.id }), '신청을 취소했습니다.')) { ST.q = null; rr(); } },
    'knq-qboard': async el => { if (!live()) return demoMsg(); const b = await W(() => call('GET', '/api/lms/q/board' + qs({ program_id: el.dataset.id }))); if (b) { ST.board = { program_id: el.dataset.id, title: el.dataset.t, items: b.items }; rr(); } },
    'knq-bpost': async () => { const b = await W(() => call('POST', '/api/lms/q/board/post', { program_id: ST.board.program_id, body: $('#knqBd').value }), '활동 글을 올렸습니다.'); if (b) { ST.board.items = b.items; rr(); } },
    'knq-review': async () => { await W(() => call('POST', '/api/lms/q/review', { program_id: ST.board.program_id, rating: +$('#knqRt').value, body: $('#knqRb').value }), '후기를 남겼습니다.'); },
    'knq-qcert': async el => { if (!live()) return demoMsg(); const r = await W(() => call('GET', '/api/lms/q/certificate' + qs({ program_id: el.dataset.id }))); if (r) openHtml(r.content); },
    'knq-nfind': () => { ST.nq = ($('#knqNq') || {}).value || ''; ST.n = null; rr(); },
    'knq-ntag': el => { ST.ntag = el.dataset.v; ST.n = null; rr(); },
    'knq-nopen': async el => { if (!live()) { const d = demoN(); const c = d.items.find(x => x.course_id === el.dataset.id); ST.ncur = c && { ...c, cohorts: d.cohorts.filter(h => h.course_id === c.course_id) }; return rr(); }
      const c = await W(() => call('GET', '/api/lms/n/course' + qs({ course_id: el.dataset.id }))); if (c) { ST.ncur = c; rr(); } },
    'knq-nwish': async el => { if (!live()) return demoMsg(); const r = await W(() => call('POST', '/api/lms/n/wish', { course_id: el.dataset.id, kind: el.dataset.k }), x => `${x.kind === 'wish' ? '찜' : '북마크'}${x.on ? '했습니다' : '을 해제했습니다'}.`); if (r) { ST.n = null; rr(); } },
    'knq-nenroll': async el => { if (!live()) return demoMsg(); const r = await W(() => call('POST', '/api/lms/n/enroll', { cohort_id: el.dataset.id }), x => x.note); if (r) { ST.n = null; ST.ncur = null; rr(); } },
    'knq-ncancel': async el => { if (!live()) return demoMsg(); if (await W(() => call('POST', '/api/lms/n/enroll/cancel', { cohort_id: el.dataset.id }), '신청을 취소했습니다.')) { ST.n = null; rr(); } },
    'knq-ncert': async el => { if (!live()) return demoMsg(); const r = await W(() => call('GET', '/api/lms/n/certificate' + qs({ cohort_id: el.dataset.id }))); if (r) openHtml(r.content); },
    'knq-dtake': el => { ST.dtake = (ST.diags || []).find(d => d.test_id === el.dataset.id); ST.rec = null; rr(); },
    'knq-dsubmit': async () => { if (!live()) return demoMsg(); const ans = ST.dtake.questions.map((q, i) => { const x = document.querySelector(`#knqDt [name="d${i}"]:checked`); return x ? +x.value : null; });
      const r = await W(() => call('POST', '/api/lms/n/diag/take', { test_id: ST.dtake.test_id, answers: ans }), x => `진단 결과 ${x.score}점 · ${LV[x.level]}`); if (r) { ST.dtake = null; ST.rec = { path: r.path, message: '' }; rr(); } },
    'knq-rec': async () => { if (!live()) return demoMsg(); const r = await W(() => call('GET', '/api/lms/n/recommend')); if (r) { ST.rec = r; rr(); } },
    'knq-kopen': async el => { if (!live()) { const x = (ST.k || []).find(s => s.survey_id === el.dataset.id); if (!x) return; const s = x._s; ST.kans = { ...s, title_l: (s.i18n || {})[ST.lang] || s.title, questions: s.questions.map(q => ({ ...q, label: q.text[ST.lang] || q.text.ko, labels: q.options.map(o => o[ST.lang] || o.ko) })) }; return rr(); }
      const s = await W(() => call('GET', '/api/lms/k/survey' + qs({ survey_id: el.dataset.id, lang: ST.lang }))); if (s) { ST.kans = s; rr(); } },
    'knq-ksubmit': async el => { if (!live()) return demoMsg(); const f = $('#knqKf'); const answers = {};
      ST.kans.questions.forEach(q => { const n = `kq_${q.qid}`; if (q.type === 'multi') { const v = [...f.querySelectorAll(`[name="${n}"]:checked`)].map(x => +x.value); if (v.length) answers[q.qid] = v; }
        else if (['single', 'nps'].includes(q.type) || q.type.startsWith('likert')) { const x = f.querySelector(`[name="${n}"]:checked`); if (x) answers[q.qid] = +x.value; } else { const x = f.querySelector(`[name="${n}"]`); if (x && x.value.trim()) answers[q.qid] = x.value.trim(); } });
      el.disabled = true; const r = await W(() => call('POST', '/api/lms/k/respond', { survey_id: ST.kans.survey_id, answers }), '응답을 제출했습니다.'); el.disabled = false; if (r) { ST.kans = null; ST.k = null; rr(); } }
  };
  const C = {
    'knq-qw': el => { ST.qw = el.checked; ST.q = null; rr(); },
    'knq-tm': el => { ST.tm = el.value; const box = $('#knqAf'); if (box && ST.qsel) box.innerHTML = formHtml(ST.qsel.form || [], el.value === 'join' ? 'member' : 'leader'); },
    'knq-nlv': el => { ST.nlv = el.value; ST.n = null; rr(); }, 'knq-nfree': el => { ST.nfree = el.checked; ST.n = null; rr(); },
    'knq-klang': el => { ST.lang = el.value; if (ST.kans) A['knq-kopen']({ dataset: { id: ST.kans.survey_id } }); }
  };
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-lact^="knq-"]'); if (!el || !A[el.dataset.lact]) return; e.preventDefault(); A[el.dataset.lact](el); });
  document.addEventListener('change', e => { const el = e.target.closest && e.target.closest('[data-lchg^="knq-"]'); if (el && C[el.dataset.lchg]) C[el.dataset.lchg](el); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && ['knqQq', 'knqNq'].includes(e.target.id)) { e.preventDefault(); A[e.target.id === 'knqQq' ? 'knq-qfind' : 'knq-nfind'](); } });
  let sugT = 0; document.addEventListener('input', e => { if (!e.target || e.target.id !== 'knqNq') return; clearTimeout(sugT); const v = e.target.value; sugT = setTimeout(async () => {
    let items = []; if (live()) { try { items = (await call('GET', '/api/lms/n/suggest' + qs({ q: v }))).items; } catch (x) { } } else { const d = demoN(); items = [...new Set([...d.items.filter(c => c.title.includes(v)).map(c => c.title), ...d.items.flatMap(c => c.tags).filter(t => v && t.includes(v)).map(t => '#' + t)])].slice(0, 8); }
    ST.sug = items; const dl = $('#knqSug'); if (dl) dl.innerHTML = items.map(s => `<option value="${esc(s.replace(/^#/, ''))}">`).join(''); }, 200); });
  window.addEventListener('hashchange', () => { if (/^#knq/.test(location.hash)) { ST.qsel = null; } });
})();
