/* v30 학사 LMS 묶음 B · C · D — 학습자 앱(learner.html) 화면
   - 「내 강의실」 카드(내 학습 화면) → #lmsx/<분반>/<탭>: 주차 · 차시별 학습자원(웹페이지 · URL · 파일 · 폴더 · 영상 · SCORM/HTML5 재생 · 과제/시험 연동 상태),
     나의 학습 경로(다음 학습 · 적응형 추천), 토론, 위키, 팀, 동료 평가, 게시판(공지 · Q&A · 자료실 · 1:1 상담 · 댓글)
   - 운영: 학습자 세션(dd_lsid → 학번)으로 /api/lms/b|c|d/* 를 부른다(서버가 학번으로 신원을 고정, 다른 학번으로 바꿀 수 없음)
   - 데모: 이 브라우저의 기관 데이터룸(S.lms.bcd) 게시본을 읽기만 한다(제출 · 글쓰기는 운영 서버에서) */
(function () {
  'use strict';
  if (typeof LR !== 'object' || typeof lrender !== 'function') return;
  const on = () => { try { const o = SITE() && SITE().org; return !!(o && o.type === 'univ' && o.ed === 'lms' && LR.me); } catch (e) { return false; } };
  const live = () => LR.mode === 'live';
  const ST = { secs: null, err: '', cache: {}, busy: {} };
  const KN = { file: '파일', url: '링크', page: '웹페이지', folder: '폴더', label: '안내', video: '영상', scorm: 'SCORM', html5: 'HTML5', assign: '과제', exam: '시험' };
  const SKN = { class: '대면', online: '온라인', live: '실시간', exam: '시험', holiday: '휴강' };
  const fmt = v => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? esc(v) : d.toLocaleString('ko-KR', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  const q = o => { const u = new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')); return u.toString() ? '?' + u : ''; };
  const G = (b, op, a = {}) => api('GET', `/api/lms/${b}/${op}${q(a)}`);
  const P = (b, op, a = {}) => api('POST', `/api/lms/${b}/${op}`, a);
  try { if (!document.querySelector('link[data-lmsxl]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/bcd-learner.css?v=30.1'; l.dataset.lmsxl = '1'; document.head.appendChild(l); } } catch (e) { }

  /* ── 데모(읽기 전용): 스튜디오 데모 저장소 S.lms.bcd ── */
  const droom = () => { try { const r = typeof demoRoom === 'function' ? demoRoom() : null; return r && r.lms && r.lms.bcd; } catch (e) { return null; } };
  function demoSecs() { const D = droom(); if (!D) return []; const p = D.persons.find(x => x.no === String(LR.me.sid || '')); if (!p) return [];
    return D.sections.filter(s => s.enroll.some(e => e.pid === p.id && e.status === 'enrolled')).map(s => ({ id: s.id, term: s.term, title: s.title, course: s.course, mode: s.mode })); }
  function demoOverview(sec) { const D = droom(); const s = D.sections.find(x => x.id === sec); if (!s) return null;
    const wk = [...new Set([...D.weeks.filter(w => w.sec === sec).map(w => w.week_no), ...D.sessions.filter(x => x.sec === sec).map(x => x.week_no)])].sort((a, b) => a - b);
    const R = sid => D.res.filter(r => r.sec === sec && r.session_id === sid && !r.deleted_at && r.visible);
    return { section: { id: s.id, title: s.title, term: s.term }, me: { role: 'student', no: LR.me.sid }, common: R(null), weeks: wk.map(n => { const w = D.weeks.find(x => x.sec === sec && x.week_no === n) || {}; return { week_no: n, title: w.title || '', starts_on: w.starts_on, ends_on: w.ends_on, sessions: D.sessions.filter(x => x.sec === sec && x.week_no === n).sort((a, b) => a.seq - b.seq).map(x => ({ ...x, resources: R(x.id) })) }; }) }; }

  /* ── 데이터 ── */
  async function secs() { if (ST.secs) return ST.secs; if (!live()) return (ST.secs = demoSecs()); const r = await G('b', 'sections'); return (ST.secs = r.sections); }
  const rt = () => { const p = decodeURIComponent(location.hash.slice(1)).split('/'); return { sec: p[1] || '', tab: p[2] || 'room', sub: p[3] || '' }; };
  const link = (sec, tab, sub) => `#lmsx/${sec}/${tab}${sub ? '/' + sub : ''}`;
  const TABS = [['room', '강의실'], ['forum', '토론'], ['wiki', '위키'], ['team', '팀'], ['review', '동료 평가'], ['board', '게시판']];

  /* 내 학습 화면 카드 */
  if (typeof viewMy === 'function') { const base = viewMy; viewMy = function (...a) { const h = base.apply(this, a); if (!on()) return h; // eslint-disable-line no-global-assign
    let c; if (!ST.secs) { c = `<div class="mycard" id="lmsxMy"><div class="myhead"><h2>내 강의실</h2></div><p class="mini">${ST.err ? esc(ST.err) : '불러오는 중입니다.'}</p></div>`; if (!ST.busy.secs) { ST.busy.secs = 1; secs().catch(e => { ST.err = e.message; ST.secs = []; }).finally(() => { ST.busy.secs = 0; lrender(); }); } }
    else c = `<div class="mycard" id="lmsxMy"><div class="myhead"><h2>내 강의실</h2></div><p class="mini">주차별 학습 · 토론 · 위키 · 팀 · 동료 평가 · 게시판</p><ul class="lmsx-ul">${ST.secs.map(s => `<li><a href="${link(s.id, 'room')}"><b>${esc(s.title)}</b></a> <small>${esc(s.term)} · ${esc(s.course || '')}</small></li>`).join('') || '<li class="mini">이번 학기 강의실이 없습니다.</li>'}</ul></div>`;
    return h.includes('<div class="mygrid">') ? h.replace('<div class="mygrid">', '<div class="mygrid">' + c) : c + h; }; }

  /* 강의실 화면: lrender 감싸기(#lmsx/…) */
  { const base = lrender; lrender = function (...a) { // eslint-disable-line no-global-assign
    if (route().a !== 'lmsx' || !SITE()) return base.apply(this, a);
    if (!LR.me) { location.hash = '#login'; return base.apply(this, a); }
    const app = $('#lapp'); app.innerHTML = shell(`<section class="lmsxl"><div id="lmsxL"><p class="mini">불러오는 중입니다…</p></div></section>`, 'my'); document.title = `${SITE().org.name} · 내 강의실`;
    fill().catch(e => { const el = $('#lmsxL'); if (el) el.innerHTML = `<p class="lerr2">${esc(e.message || '불러오지 못했습니다.')}</p>`; }); }; }
  async function fill() {
    const { sec, tab, sub } = rt(); const el = () => $('#lmsxL'); let body = '';
    const ss = await secs(); const s = ss.find(x => x.id === sec); if (!s) { el().innerHTML = '<p class="mini">이 강의실의 수강생이 아닙니다.</p><a class="lbtn sm ghost" href="#my">내 학습으로</a>'; return; }
    const head = `<div class="lmsxl-h"><a href="#my" class="mini">← 내 학습</a><h1>${esc(s.title)}</h1><nav class="lmsxl-tabs">${TABS.map(([k, l]) => `<a href="${link(sec, k)}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav></div>`;
    if (!live()) { const O = demoOverview(sec); body = `<p class="mini lmsxl-demo">데모: 이 브라우저에 게시된 강의실을 읽기만 합니다. 학습 기록 · 제출 · 글쓰기는 운영 서버에서 동작합니다.</p>` + (tab === 'room' && O ? roomHtml(O, true) : '<p class="mini">운영 모드에서 열립니다.</p>'); el().innerHTML = head + body; return; }
    if (tab === 'room') { const [O, N] = await Promise.all([G('b', 'overview', { section: sec }), G('b', 'next', { section: sec })]); ST.cache.ov = O; body = nextHtml(N) + roomHtml(O, false); }
    if (tab === 'forum') { const F = await G('c', 'forums', { section: sec }); body = `<div class="lmsxl-card"><h2>토론</h2><ul class="lmsx-ul">${F.forums.map(f => `<li><a href="${link(sec, 'forum', f.id)}"><b>${esc(f.title)}</b></a> <small>${f.kind === 'single' ? '단일주제' : '자유발언'}${f.team ? ' · ' + esc(f.team.name) : ''} · 글 ${f.posts}${f.open ? '' : ' · 기간 외'}</small></li>`).join('') || '<li class="mini">토론이 없습니다.</li>'}</ul></div>`;
      if (sub) { const T = await G('c', 'forum', { id: sub }); const kids = id => T.posts.filter(p => p.parent === id); const one = (p, d) => `<div class="lmsxl-post ${d ? 're' : ''}"><small>${esc(p.author)} · ${fmt(p.created_at)}</small>${p.title ? `<b>${esc(p.title)}</b>` : ''}<p>${nl(p.body)}</p>${T.can_post && !p.deleted ? `<button class="lbtn sm ghost" data-lx="reply" data-p="${esc(p.id)}" data-f="${esc(sub)}">답글</button>` : ''}${T.forum.layout === 'thread' ? kids(p.id).map(k => one(k, 1)).join('') : ''}</div>`;
        body += `<div class="lmsxl-card"><h2>${esc(T.forum.title)}</h2>${T.forum.prompt ? `<p>${nl(T.forum.prompt)}</p>` : ''}${(T.forum.layout === 'board' ? T.posts : T.posts.filter(p => !p.parent)).map(p => one(p, 0)).join('') || '<p class="mini">글이 없습니다.</p>'}
          ${T.can_post && T.can_thread ? `<textarea id="lxBody" rows="3" placeholder="의견을 남기세요"></textarea><button class="lbtn sm" data-lx="post" data-f="${esc(sub)}">글 쓰기</button>` : T.forum.kind === 'single' ? '<p class="mini">단일주제 토론은 주제 글에 답글로 참여합니다.</p>' : ''}</div>`; } }
    if (tab === 'wiki') { const W = await G('c', 'wiki', { section: sec }); body = `<div class="lmsxl-card"><h2>위키</h2><ul class="lmsx-ul">${W.pages.map(w => `<li><a href="${link(sec, 'wiki', w.id)}"><b>${esc(w.title)}</b></a> <small>v${w.ver}${w.team ? ' · ' + esc(w.team.name) : ''} · ${esc(w.updated_by || '')}</small></li>`).join('') || '<li class="mini">문서가 없습니다.</li>'}</ul></div>`;
      if (sub) { const Pg = await G('c', 'wiki-page', { id: sub }); body += `<div class="lmsxl-card"><h2>${esc(Pg.title)} <small>v${Pg.ver}</small></h2>${W.can_edit ? `<textarea id="lxWiki" rows="10">${esc(Pg.body)}</textarea><input id="lxNote" placeholder="변경 메모"><button class="lbtn sm" data-lx="wiki" data-id="${esc(Pg.id)}" data-v="${Pg.ver}">저장</button>` : `<p>${nl(Pg.body)}</p>`}<details><summary class="mini">버전 기록 ${Pg.versions.length}</summary><ul class="lmsx-ul">${Pg.versions.map(v => `<li>v${v.ver} · ${esc(v.by || '')} · ${fmt(v.at)} ${esc(v.note || '')}</li>`).join('')}</ul></details></div>`; } }
    if (tab === 'team') { const T = await G('c', 'teams', { section: sec }); const mine = T.teams.filter(t => T.mine.includes(t.id));
      body = `<div class="lmsxl-card"><h2>우리 팀</h2>${mine.map(t => `<p><b>${esc(t.name)}</b> <small>${esc(t.set)}</small><br>${t.members.map(m => esc(m.no) + (m.leader ? '(팀장)' : '')).join(' · ')}</p>`).join('') || '<p class="mini">아직 배정된 팀이 없습니다.</p>'}</div>
        <div class="lmsxl-card"><h2>팀 과제</h2>${T.tasks.map(k => `<div class="lmsxl-post"><b>${esc(k.title)}</b> <small>${k.due_at ? '마감 ' + fmt(k.due_at) : ''}${k.ref_asg ? ' · 과제 연동(제출하면 자동 반영)' : ''}</small>${k.body ? `<p>${nl(k.body)}</p>` : ''}${mine.filter(t => !k.team_id || k.team_id === t.id).map(t => { const st = (k.status[t.id] || {}).status || 'todo'; return k.ref_asg ? `<p class="mini">${esc(t.name)}: ${({ todo: '할 일', doing: '진행 중', done: '완료' })[st]} ${esc((k.status[t.id] || {}).note || '')}</p>` : `<label class="mini">${esc(t.name)} <select data-lxchg="task" data-k="${esc(k.id)}" data-t="${esc(t.id)}">${[['todo', '할 일'], ['doing', '진행 중'], ['done', '완료']].map(([v, l]) => `<option value="${v}" ${st === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`; }).join('')}</div>`).join('') || '<p class="mini">팀 과제가 없습니다.</p>'}</div>`; }
    if (tab === 'review') { const R = await G('c', 'reviews', { section: sec }); body = `<div class="lmsxl-card"><h2>자기 · 동료 평가</h2><ul class="lmsx-ul">${R.reviews.map(r => `<li><a href="${link(sec, 'review', r.id)}"><b>${esc(r.title)}</b></a> <small>${r.anonymous ? '익명' : '실명'}${r.my_todo ? ` · 내 할 일 ${r.my_todo}건` : ''}</small></li>`).join('') || '<li class="mini">동료 평가가 없습니다.</li>'}</ul></div>`;
      if (sub) { const V = await G('c', 'review', { id: sub }); const cr = V.review.criteria;
        body += `<div class="lmsxl-card"><h2>${esc(V.review.title)}</h2>${V.review.body ? `<p>${nl(V.review.body)}</p>` : ''}<h3>내 제출</h3><textarea id="lxRvs" rows="3">${esc(V.my_sub ? V.my_sub.content : '')}</textarea><button class="lbtn sm" data-lx="rvsub" data-id="${esc(sub)}">${V.my_sub ? '다시 제출' : '제출'}</button>
          <h3>내가 할 평가</h3>${V.todo.map(t => `<div class="lmsxl-post"><b>${t.self ? '자기 평가' : esc(t.reviewee)}</b> ${t.done ? '<small>완료</small>' : ''}<p>${nl(t.content || '(제출 없음)')}</p>${cr.map(c => `<label class="mini">${esc(c.name)}(${c.max}) <input type="number" min="0" max="${c.max}" data-lxsc="${esc(c.name)}" data-a="${esc(t.alloc)}" value="${t.scores ? t.scores[c.name] : ''}"></label>`).join(' ')}<input data-lxcm="${esc(t.alloc)}" placeholder="의견" value="${esc(t.comment || '')}"><button class="lbtn sm ghost" data-lx="rvscore" data-a="${esc(t.alloc)}">평가 저장</button></div>`).join('') || '<p class="mini">배정된 평가가 없습니다.</p>'}
          ${V.received.length ? `<h3>받은 평가</h3><ul class="lmsx-ul">${V.received.map(x => `<li>${esc(x.from)} · 합계 ${x.total} ${esc(x.comment || '')}</li>`).join('')}</ul>` : ''}</div>`; } }
    if (tab === 'board') { const B = await G('d', 'boards', { section: sec }); const bk = sub || 'notice'; const bd = B.boards.find(b => b.kind === bk) || B.boards[0]; const L = await G('d', 'posts', { board: bd.id });
      body = `<nav class="lmsxl-tabs sub">${B.boards.map(b => `<a href="${link(sec, 'board', b.kind)}" class="${b.kind === bd.kind ? 'on' : ''}">${esc(b.name)}${b.unread ? ` (${b.unread})` : ''}</a>`).join('')}</nav>
        <div class="lmsxl-card"><h2>${esc(bd.name)}</h2>${L.can_write ? `<details><summary><b>${bd.kind === 'counsel' ? '상담 신청' : bd.kind === 'qna' ? '질문하기' : '글쓰기'}</b></summary><input id="lxT" placeholder="제목" maxlength="200"><textarea id="lxB" rows="4" placeholder="내용"></textarea>${bd.kind === 'qna' ? '<label class="mini"><input type="checkbox" id="lxPv"> 비공개(교수자만)</label> <label class="mini"><input type="checkbox" id="lxAn"> 익명</label>' : ''}<button class="lbtn sm" data-lx="bpost" data-b="${esc(bd.id)}">올리기</button></details>` : ''}
        <ul class="lmsx-ul">${L.posts.map(p => `<li><a href="#" data-lx="bopen" data-id="${esc(p.id)}">${p.pinned ? '📌 ' : ''}${p.category ? `[${esc(p.category)}] ` : ''}<b>${esc(p.title)}</b></a> <small>${esc(p.author)} · ${fmt(p.created_at)}${p.read ? '' : ' · 새 글'}${['qna', 'counsel'].includes(bd.kind) ? ' · ' + ({ open: '접수', answered: '답변 완료', closed: '종료' })[p.status] : ''}</small></li>`).join('') || '<li class="mini">글이 없습니다.</li>'}</ul><div id="lxPost"></div></div>`; }
    el().innerHTML = head + body;
  }
  function nextHtml(N) {
    if (!N || N.preview) return '';
    return `<div class="lmsxl-card lmsxl-next"><h2>나의 학습 경로</h2><div class="lmsxl-bar"><i style="width:${N.total ? Math.round(N.done / N.total * 100) : 0}%"></i></div><p class="mini">완료 ${N.done}/${N.total}${N.level ? ' · 수준 ' + ({ basic: '기초', standard: '표준', advanced: '심화' })[N.level] : ''}</p>
      ${N.next ? `<p>다음 학습: <b>${esc(N.next.title)}</b> <button class="lbtn sm" data-lx="open" data-id="${esc(N.next.id)}">이어서 학습</button></p>` : '<p class="mini">열린 학습을 모두 마쳤습니다.</p>'}${N.recommend.map(r => `<p class="mini">추천: <b>${esc(r.title)}</b> · ${esc(r.why)} ${r.done ? '(완료)' : `<button class="lbtn sm ghost" data-lx="open" data-id="${esc(r.id)}">학습</button>`}</p>`).join('')}</div>`;
  }
  const stTxt = r => r.open === false ? `<span class="lx-lock">잠김 · ${esc(r.why || '')}</span>` : r.done ? `<span class="lx-ok">${r.status === 'passed' ? '합격' : '완료'}${r.score != null ? ' ' + r.score + '점' : ''}</span>` : r.status === 'failed' ? `<span class="lx-warn">미달${r.score != null ? ' ' + r.score + '점' : ''}</span>` : r.status ? '<span class="lx-warn">진행 중</span>' : '';
  function resLi(r, demo) { if (r.kind === 'label') return `<li class="lx-label">${esc(r.title)}${(r.body || {}).text ? ` <small>${esc(r.body.text)}</small>` : ''}</li>`;
    return `<li class="${r.open === false ? 'lx-locked' : ''}"><span class="lx-kind">${esc(KN[r.kind] || r.kind)}</span> <b>${esc(r.title)}</b> ${demo ? '' : stTxt(r)} ${demo ? '' : `<button class="lbtn sm ghost" data-lx="open" data-id="${esc(r.id)}" ${r.open === false ? 'disabled' : ''}>${['scorm', 'html5'].includes(r.kind) ? '재생' : '학습'}</button>`}</li>`; }
  function roomHtml(O, demo) {
    return `${(O.common || []).length ? `<div class="lmsxl-card"><h2>공통 자료</h2><ul class="lmsx-ul">${O.common.map(r => resLi(r, demo)).join('')}</ul></div>` : ''}${O.weeks.map(w => `<div class="lmsxl-card"><h2>${w.week_no}주차${w.title ? ' · ' + esc(w.title) : ''} <small>${esc(String(w.starts_on || '').slice(5))}~${esc(String(w.ends_on || '').slice(5))}</small></h2>
      ${w.sessions.map(x => `<h3>${x.seq}차시 ${esc(x.title || '')} <small>${esc(SKN[x.kind] || x.kind)}${x.close_at ? ' · 인정 ~' + fmt(x.close_at) : ''}</small></h3><ul class="lmsx-ul">${x.resources.map(r => resLi(r, demo)).join('') || '<li class="mini">자료가 없습니다.</li>'}</ul>`).join('')}</div>`).join('') || '<p class="mini">아직 등록된 주차가 없습니다.</p>'}`;
  }
  const allRes = () => { const O = ST.cache.ov; return O ? [...O.common, ...O.weeks.flatMap(w => w.sessions.flatMap(s => s.resources))] : []; };
  const mark = async (id, extra) => { try { await P('b', 'progress-mark', { resource: id, ...(extra || {}) }); } catch (e) { toast(e.message, 'bad'); } };
  const dl = async fid => { try { const f = await G('b', 'file', { id: fid }); const bin = atob(f.b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: f.mime })); a.download = f.name; a.click(); } catch (e) { toast(e.message, 'bad'); } };
  /* 패키지 재생: 학습자 화면은 iframe을 허용하지 않으므로(CSP) 새 창으로 열고, SCO는 window.opener에서 API를 찾는다 */
  const loadRTE = () => window.LMSRTE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'lms/bcd-rte.js?v=30.1'; s.onload = ok; s.onerror = () => no(new Error('SCORM 런타임을 불러오지 못했습니다.')); document.head.appendChild(s); });
  async function play(id) {
    const info = await G('b', 'scorm', { resource: id }); await loadRTE();
    const reg = await navigator.serviceWorker.register('lms/bpkg-sw.js', { scope: 'lms/bpkg/' }); const w0 = reg.active || reg.installing || reg.waiting; if (w0 && w0.state !== 'activated') await new Promise(ok => { w0.addEventListener('statechange', () => { if (w0.state === 'activated') ok(); }); setTimeout(ok, 4000); });
    const sco = (info.manifest.scos || [])[0]; if (!sco) throw new Error('실행할 SCO가 없습니다.');
    const rte = LMSRTE.make(info.version === '2004' ? '2004' : '1.2', sco, (info.att || {})[sco.id], info.me, { res: id, commit: b => P('b', 'scorm-commit', b), onCommit: (r, fin) => { if (fin) { toast(`학습 기록을 저장했습니다(${r.status || '—'}).`, 'ok'); lrender(); } }, onError: e => toast(e.message, 'bad') });
    delete window.API; delete window.API_1484_11; if (info.version === '2004') window.API_1484_11 = rte.api; else window.API = rte.api; window.__lmsxRTE = rte;
    if (info.version === 'none') mark(id);
    const w = window.open(`lms/bpkg/${info.pkg_id}/${sco.href}`, 'lmsxsco'); if (!w) toast('팝업이 막혀 있습니다. 이 사이트의 팝업을 허용하세요.', 'warn');
    const iv = setInterval(() => { if (!w || w.closed) { clearInterval(iv); if (rte.state() === 1) rte.abandon(); } }, 1000);
  }
  function openRes(id) {
    const r = allRes().find(x => x.id === id); if (!r) return; const B = r.body || {}; const { sec } = rt();
    if (['scorm', 'html5'].includes(r.kind)) return play(id).catch(e => toast(e.message, 'bad'));
    if (['assign', 'exam'].includes(r.kind)) return toast(`${r.kind === 'assign' ? '과제' : '시험'} 화면에서 ${r.kind === 'assign' ? '제출' : '응시'}하세요. 결과는 자동으로 반영됩니다.`, 'ok');
    let h = '';
    if (r.kind === 'page') h = typeof safeHTML === 'function' ? safeHTML(B.html || '') : nl(B.html || '');
    if (r.kind === 'url') h = `<p><a class="lbtn sm" href="${esc(typeof safeURL === 'function' ? safeURL(B.url) : B.url)}" target="_blank" rel="noopener noreferrer">링크 열기</a></p>`;
    const xv = xvid(B.url); let yt = null;
    if (r.kind === 'video') h = !B.url ? '<p class="mini">영상 주소가 없습니다.</p>' : xv && xv.kind === 'youtube' ? `<div class="lmsxl-yt"><div id="lxYt" data-v="${esc(xv.id)}"></div></div><p class="mini" id="lxYtT">재생한 구간만 학습 시간으로 기록합니다.</p>`
      : xv ? `<p>${esc(xv.name)} 영상은 새 창에서 재생합니다. 다 본 뒤 「학습 마침」을 누르면 시청 시간이 기록됩니다.</p><a class="lbtn sm" href="${esc(xv.watch)}" target="_blank" rel="noopener noreferrer">새 창에서 재생</a>`
      : `<video controls playsinline src="${esc(typeof safeURL === 'function' ? safeURL(B.url) : B.url)}" style="width:100%"></video>`;
    if (['file', 'folder'].includes(r.kind)) return material(r);
    if (xv && xv.kind === 'youtube') yt = true;
    const box = document.createElement('div'); box.className = 'lmsxl-dlg'; box.innerHTML = `<div class="lmsxl-dlgin" role="dialog" aria-label="${esc(r.title)}"><h2>${esc(r.title)}</h2><div class="lmsxl-dlgb">${h}</div><button class="lbtn" data-lx="close" data-id="${esc(id)}">학습 마침</button></div>`; document.body.appendChild(box); box.dataset.t0 = Date.now(); box.dataset.sec = sec;
    if (yt) ytWatch(box);
    if ((r.completion || {}).type !== 'time') mark(id);
  }
  /* 외부 영상: YouTube는 학습자 화면에서 임베드(IFrame API로 실제 재생 초만 센다), Vimeo는 새 창 + 열고 닫은 시간 */
  function xvid(u) { u = String(u || ''); let m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(u); if (m) return { kind: 'youtube', name: 'YouTube', id: m[1], watch: `https://www.youtube.com/watch?v=${m[1]}` };
    m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u); if (m) return { kind: 'vimeo', name: 'Vimeo', id: m[1], watch: `https://vimeo.com/${m[1]}` }; return null; }
  function ytWatch(box) {
    const el = box.querySelector('#lxYt'); if (!el) return; const seen = new Set(); let p = null, iv = 0;
    const done = () => { clearInterval(iv); box.dataset.watched = String(seen.size); try { p && p.destroy && p.destroy(); } catch (e) { } };
    box.lxStop = done;
    const go = () => { try { p = new YT.Player(el, { videoId: el.dataset.v, host: 'https://www.youtube-nocookie.com', playerVars: { rel: 0, playsinline: 1 } });
      iv = setInterval(() => { try { if (p.getPlayerState && p.getPlayerState() === 1 && p.getPlaybackRate() <= 2) { seen.add(Math.floor(p.getCurrentTime())); const t = $('#lxYtT'); if (t) t.textContent = `학습 시간 ${seen.size}초 기록 중`; } } catch (e) { } }, 1000); } catch (e) { fallback(); } };
    const fallback = () => { el.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(el.dataset.v)}?rel=0" title="영상" allow="encrypted-media; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0"></iframe>`; box.dataset.ytfb = '1'; };
    if (window.YT && YT.Player) return go();
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) { } go(); };
    const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.onerror = fallback; document.head.appendChild(sc); setTimeout(() => { if (!p && !box.dataset.ytfb) fallback(); }, 8000);
  }
  /* 강의자료(SFR-038): PDF는 새 창(학습자 화면 CSP가 프레임 차단), 이미지 · 텍스트는 바로 보기, 문서는 HTML 변환(연동 지점), 내려받기 허용 · 기록 */
  const b2u = b64 => { const s2 = atob(b64); const u = new Uint8Array(s2.length); for (let i = 0; i < s2.length; i++) u[i] = s2.charCodeAt(i); return u; };
  async function material(r) {
    const M = await G('b', 'material', { resource: r.id }).catch(e => { toast(e.message, 'bad'); return null; }); if (!M) return;
    const box = document.createElement('div'); box.className = 'lmsxl-dlg'; box.dataset.t0 = Date.now();
    box.innerHTML = `<div class="lmsxl-dlgin" role="dialog" aria-label="${esc(r.title)}"><h2>${esc(r.title)}</h2><p class="mini">${M.download ? '내려받기 허용' : '이 자료는 화면에서 보기만 할 수 있습니다(내려받기 금지).'}</p>
      ${M.files.map(f => `<div class="lmsxl-post"><b>${esc(f.name)}</b> <small>${Math.ceil(f.size / 1024)}KB</small><br>
        ${['pdf', 'image', 'text'].includes(f.preview) ? `<button class="lbtn sm" data-lx="mview" data-r="${esc(r.id)}" data-f="${esc(f.file_id)}" data-k="${f.preview}">보기</button>` : ''}
        ${f.preview === 'convert' ? (f.convert && f.convert.status === 'done' ? `<button class="lbtn sm" data-lx="mconv" data-r="${esc(r.id)}" data-f="${esc(f.file_id)}">변환본 보기</button>` : `<button class="lbtn sm ghost" data-lx="mcreq" data-r="${esc(r.id)}" data-f="${esc(f.file_id)}">브라우저 보기 요청</button> <small class="mini">문서 변환 연동 후 동작</small>`) : ''}
        ${M.can_download ? `<button class="lbtn sm ghost" data-lx="mdl" data-r="${esc(r.id)}" data-f="${esc(f.file_id)}">내려받기</button>` : ''}</div>`).join('') || '<p class="mini">파일이 없습니다.</p>'}
      <div id="lxMbox" class="lmsxl-dlgb"></div><button class="lbtn" data-lx="close" data-id="${esc(r.id)}">학습 마침</button></div>`;
    document.body.appendChild(box); if ((r.completion || {}).type !== 'time') mark(r.id);
  }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-lx]'); if (!el) return; e.preventDefault(); const k = el.dataset.lx; const { sec } = rt();
    try {
      if (k === 'open') return openRes(el.dataset.id);
      if (k === 'dl') return dl(el.dataset.f);
      if (k === 'close') { const box = el.closest('.lmsxl-dlg'); if (box.lxStop) box.lxStop(); const r = allRes().find(x => x.id === el.dataset.id); const sec2 = box.dataset.watched != null && !box.dataset.ytfb ? +box.dataset.watched : Math.round((Date.now() - (+box.dataset.t0)) / 1000);
        if (r && ((r.completion || {}).type === 'time' || r.kind === 'video')) await mark(r.id, { time_sec: sec2 }); box.remove(); return lrender(); }
      if (k === 'mview') { const f = await P('b', 'material-file', { resource: el.dataset.r, file_id: el.dataset.f, mode: 'view' }); const mb = $('#lxMbox'); const kk = el.dataset.k;
        if (kk === 'text') { mb.innerHTML = `<pre style="white-space:pre-wrap">${esc(new TextDecoder().decode(b2u(f.b64)))}</pre>`; return; }
        const url = URL.createObjectURL(new Blob([b2u(f.b64)], { type: kk === 'pdf' ? 'application/pdf' : f.mime })); if (kk === 'image') { mb.innerHTML = `<img src="data:${esc(f.mime)};base64,${f.b64}" alt="${esc(f.name)}" style="max-width:100%">`; return; }
        const w = window.open(url, '_blank'); if (!w) toast('팝업이 막혀 있습니다. 팝업을 허용하세요.', 'warn'); return; }
      if (k === 'mdl') { const f = await P('b', 'material-file', { resource: el.dataset.r, file_id: el.dataset.f, mode: 'download' }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([b2u(f.b64)], { type: f.mime })); a.download = f.name; a.click(); return; }
      if (k === 'mcreq') { const r2 = await P('b', 'convert-request', { resource: el.dataset.r, file_id: el.dataset.f }); toast(r2.note, 'ok'); el.disabled = true; return; }
      if (k === 'mconv') { const r2 = await G('b', 'converted', { resource: el.dataset.r, file_id: el.dataset.f }); $('#lxMbox').innerHTML = typeof safeHTML === 'function' ? safeHTML(r2.html || '') : esc(r2.html || ''); return; }
      if (k === 'post') { await P('c', 'post', { forum: el.dataset.f, body: ($('#lxBody') || {}).value || '' }); toast('글을 올렸습니다.', 'ok'); return lrender(); }
      if (k === 'reply') { const t = prompt('답글'); if (!t) return; await P('c', 'post', { forum: el.dataset.f, parent: el.dataset.p, body: t }); return lrender(); }
      if (k === 'wiki') { await P('c', 'wiki-save', { id: el.dataset.id, base_ver: +el.dataset.v, body: ($('#lxWiki') || {}).value || '', note: ($('#lxNote') || {}).value || '' }); toast('저장했습니다.', 'ok'); return lrender(); }
      if (k === 'rvsub') { await P('c', 'review-submit', { review: el.dataset.id, content: ($('#lxRvs') || {}).value || '' }); toast('제출했습니다.', 'ok'); return lrender(); }
      if (k === 'rvscore') { const a = el.dataset.a; const scores = Object.fromEntries($$(`[data-lxsc][data-a="${a}"]`).map(i => [i.dataset.lxsc, i.value === '' ? null : +i.value])); await P('c', 'review-score', { alloc: a, scores, comment: ($(`[data-lxcm="${a}"]`) || {}).value || '' }); toast('평가를 저장했습니다.', 'ok'); return lrender(); }
      if (k === 'bpost') { const pv = $('#lxPv'), an = $('#lxAn'); await P('d', 'post-save', { board: el.dataset.b, title: ($('#lxT') || {}).value || '', body: ($('#lxB') || {}).value || '', private: !!(pv && pv.checked), anonymous: !!(an && an.checked) }); toast('올렸습니다.', 'ok'); return lrender(); }
      if (k === 'bopen' || k === 'bref') { const P2 = await G('d', 'post', { id: el.dataset.id }); const p = P2.post; const box = $('#lxPost'); if (!box) return;
        box.innerHTML = `<div class="lmsxl-post"><b>${esc(p.title)}</b> <small>${esc(p.author)} · ${fmt(p.created_at)}</small><p>${nl(p.body)}</p>${p.files.map(f => `<button class="lbtn sm ghost" data-lx="dl" data-f="${esc(f.file_id)}">${esc(f.name)}</button>`).join(' ')}
          ${P2.answers.map(x => `<div class="lmsxl-post re"><small>${esc(x.author)} · ${fmt(x.created_at)}${x.accepted ? ' · 채택' : ''}</small><p>${nl(x.body)}</p>${p.mine && p.kind === 'qna' && !x.accepted ? `<button class="lbtn sm ghost" data-lx="accept" data-id="${esc(x.id)}" data-p="${esc(p.id)}">채택</button>` : ''}</div>`).join('')}
          ${P2.can_answer && p.status !== 'closed' ? `<textarea id="lxAns" rows="2" placeholder="${p.kind === 'counsel' ? '이어서 쓰기' : '답변'}"></textarea><button class="lbtn sm ghost" data-lx="answer" data-p="${esc(p.id)}">올리기</button>` : ''}
          ${P2.comments.map(c => `<p class="mini">${esc(c.author)}: ${esc(c.body)}</p>`).join('')}${P2.can_comment ? `<input id="lxCm" placeholder="댓글"><button class="lbtn sm ghost" data-lx="comment" data-p="${esc(p.id)}">댓글</button>` : ''}</div>`; return; }
      if (k === 'answer') { await P('d', 'answer', { post: el.dataset.p, body: ($('#lxAns') || {}).value || '' }); toast('올렸습니다.', 'ok'); el.dataset.id = el.dataset.p; return document.querySelector(`[data-lx="bopen"][data-id="${el.dataset.p}"]`).click(); }
      if (k === 'comment') { await P('d', 'comment', { post: el.dataset.p, body: ($('#lxCm') || {}).value || '' }); return document.querySelector(`[data-lx="bopen"][data-id="${el.dataset.p}"]`).click(); }
      if (k === 'accept') { await P('d', 'answer-accept', { id: el.dataset.id }); toast('채택했습니다.', 'ok'); return document.querySelector(`[data-lx="bopen"][data-id="${el.dataset.p}"]`).click(); }
    } catch (x) { toast(x.message, 'bad'); }
    void sec;
  });
  document.addEventListener('change', async e => { const el = e.target.closest('[data-lxchg="task"]'); if (!el) return; try { await P('c', 'task-status', { task: el.dataset.k, team: el.dataset.t, status: el.value }); toast('진행 상태를 바꿨습니다.', 'ok'); } catch (x) { toast(x.message, 'bad'); lrender(); } });
})();
