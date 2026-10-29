/* 디디쌤 스튜디오 v10 — 학습자 화면: 셸 · 라우터 · 튜토리얼 · 과정 · 진단 · 로그인 · 마이페이지 · 플레이어 */
'use strict';
let PLAYER = null;
const route = () => { const h = decodeURIComponent(location.hash.slice(1) || 'home').replace(/[)\]}>.,;:!?'"’”\s]+.*$/, '').replace(/[^\x00-\x7F].*$/, '') || 'home'; const [a, b] = h.split('/'); return { a, b }; };
const pageOf = id => SITE().pages.find(p => p.id === id);

function shell(inner, cur) {
  const S2 = SITE(); const short = S2.org.short || S2.org.name.slice(0, 4);
  const nav = S2.pages.filter(p => p.id !== 'my').map(p => `<a href="#${esc(p.id)}" class="${cur === p.id ? 'on' : ''}">${esc(p.name)}</a>`).join('');
  return `<header class="lh"><div class="in"><a class="brand" href="#home"><span class="lg">${esc(short)}</span><span><b>${esc(S2.org.name)}</b><small>온라인 학습</small></span></a><button class="mnu" data-lact="menu" aria-label="메뉴">≡</button>
    <nav class="ln">${nav}</nav><div class="acct">${LR.me ? `<a class="lbtn sm ghost" href="#my">${esc(LR.me.sid)}</a>` : `<a class="lbtn sm pri" href="#login">로그인</a>`}</div></div></header>
    ${LR.mode === 'preview' ? '<div class="pvbar">미리보기 · 초안</div>' : ''}${LR.sample ? `<div class="pvbar">체험용 샘플 사이트 · 체험 계정 ${esc(LR.sample.sid)} / ${esc(LR.sample.code)} · 기록은 이 기기에만 저장됩니다</div>` : ''}<main id="lm">${inner}</main>
    <footer class="lf"><div class="in"><b>${esc(S2.org.name)}</b><small>학습자 정보는 ${S2.org.type === 'univ' ? '학번 · 학과만' : '번호 · 소속만'} 저장합니다 · Powered by 디디쌤</small></div></footer>`;
}
function needLogin(back) { return `<section class="sec"><div class="in narrow"><h2>로그인이 필요합니다</h2><p class="lead">이 화면은 로그인한 ${esc(SITE().terms.learner || '학습자')}만 볼 수 있습니다.</p>${btn('로그인', '#login/' + encodeURIComponent(back || ''))}</div></section>`; }

function viewPage(id) {
  const p = pageOf(id) || pageOf('home') || SITE().pages[0]; if (!p) return '<p class="empty">페이지가 없습니다.</p>';
  if (p.access === '로그인' && !LR.me) return needLogin(p.id);
  const inner = p.sections.map(s => { try { return (SECR[s.type] || (() => ''))(s.data || {}); } catch (e) { console.error(e); return ''; } }).join('');
  return (p.id !== 'home' && !p.sections.some(s => s.type === 'hero') ? `<section class="sub"><div class="in"><h1>${esc(p.name)}</h1></div></section>` : '') + inner + (p.id === 'my' ? viewMy() : '');
}
function viewTut(id) {
  const t = SITE().tuts.find(x => x.id === id); if (!t) return '<section class="sec"><div class="in"><p class="empty">튜토리얼을 찾지 못했습니다.</p></div></section>';
  const r = LR.lp.tut[t.id] || { w: 0, steps: [], mission: '' };
  return `<section class="sec tut"><div class="in"><p class="crumb"><a href="#tutorials">튜토리얼</a> › ${esc(tyOf(t.type).name)} · ${esc(lvOf(t.level).name)}</p><h1>${esc(t.title)}</h1>${t.ch ? `<p class="mini">${esc(t.ch)}${t.tool ? ' · ' + esc(t.tool) : ''}</p>` : ''}
    <div class="tw2"><div class="vid">${ytOK(t.yt) ? `<div id="yt" data-yt="${esc(t.yt)}" data-kind="tut" data-id="${esc(t.id)}"></div>` : '<div class="novid">영상 준비 중</div>'}<div class="wbar"><i style="width:${Math.round((r.w || 0) * 100)}%"></i></div><small class="mini" id="wtxt">시청 ${Math.round((r.w || 0) * 100)}%</small></div>
    <div class="follow"><b>따라 할 3단계</b>${t.steps.map((s, i) => `<label class="fs"><input type="checkbox" data-lchg="step" data-v="${i}" ${r.steps && r.steps[i] ? 'checked' : ''} ${LR.me ? '' : 'disabled'}><span><em>${i + 1}</em>${esc(s)}</span></label>`).join('')}
      <div class="mission"><b>미션</b><p>${esc(t.mission)}</p>${LR.me ? `<textarea id="msn" rows="4" maxlength="2000" placeholder="결과물 링크 · 설명을 적어 제출하세요">${esc(r.mission || '')}</textarea><button class="lbtn pri" data-lact="msn" data-v="${esc(t.id)}">${r.mission ? '다시 제출' : '제출'}</button>` : btn('로그인하고 기록하기', '#login/' + encodeURIComponent('t/' + t.id))}</div></div></div></div></section>`;
}
function viewCourse(id, itemId) {
  const c = SITE().classes.find(x => x.id === id); if (!c) return '<section class="sec"><div class="in"><p class="empty">과정을 찾지 못했습니다.</p></div></section>';
  if (!LR.me) return needLogin('c/' + id);
  const r = LR.lp.cls[c.id] || { items: {} }; const done = Object.values(r.items || {}).filter(x => x && x.done).length; const it = c.items.find(x => x.id === itemId) || c.items.find(x => !(r.items[x.id] || {}).done) || c.items[0];
  const ITN = { video: '영상', doc: '강의자료', quiz: '퀴즈', exam: '시험', assign: '과제', survey: '설문', live: '라이브', offline: '오프라인' };
  let main = '<p class="empty">항목이 없습니다.</p>';
  if (it) {
    const st = r.items[it.id] || {};
    if (it.type === 'video') main = ytOK(it.yt) ? `<div id="yt" data-yt="${esc(it.yt)}" data-kind="cls" data-id="${esc(c.id)}" data-item="${esc(it.id)}"></div><div class="wbar"><i style="width:${Math.round((st.w || 0) * 100)}%"></i></div><small class="mini" id="wtxt">시청 ${Math.round((st.w || 0) * 100)}% · 80% 이상 보면 완료</small>` : `<div class="novid">영상 준비 중</div>`;
    else if (it.type === 'quiz' || it.type === 'exam') main = `<form id="qz" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${it.qs.map((q, k) => `<fieldset class="q"><legend>${k + 1}. ${esc(q.q)}</legend>${q.t === 'mc' || q.t === 'ox' ? (q.t === 'ox' ? ['O', 'X'] : q.opts).map((o, j) => `<label><input type="radio" name="q${k}" value="${q.t === 'ox' ? esc(o) : j}"> ${esc(o)}</label>`).join('') : `<textarea name="q${k}" rows="2" maxlength="1000"></textarea>`}</fieldset>`).join('') || '<p>문항이 없습니다.</p>'}<button class="lbtn pri" type="submit">제출</button>${st.score != null ? `<p class="mini">최근 점수 ${st.score}점</p>` : ''}</form>`;
    else if (it.type === 'assign') main = `<div class="body">${nl(it.desc || '과제 안내를 확인하고 제출하세요.')}</div><textarea id="asg" rows="6" maxlength="4000" placeholder="제출 내용 · 결과물 링크">${esc((r.sub && r.sub.text) || '')}</textarea><button class="lbtn pri" data-lact="asg" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${r.sub ? '다시 제출' : '제출'}</button>`;
    else main = `<div class="body">${nl(it.desc || `${ITN[it.type] || '항목'} 안내를 확인하세요.`)}</div><button class="lbtn ${st.done ? 'ghost' : 'pri'}" data-lact="done" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${st.done ? '완료됨' : '완료로 표시'}</button>`;
  }
  return `<section class="sec crs"><div class="in"><p class="crumb"><a href="#courses">코스웨어</a> › ${esc(lvOf(c.level).name)}</p><h1>${esc(c.name)}</h1><p class="mini">${esc(c.start || '')} ~ ${esc(c.end || '')} · ${done}/${c.items.length} 완료</p><div class="wbar"><i style="width:${Math.round(done / Math.max(1, c.items.length) * 100)}%"></i></div>
    <div class="cw2"><ol class="items">${c.items.map(x => `<li class="${x.id === (it && it.id) ? 'on' : ''} ${(r.items[x.id] || {}).done ? 'done' : ''}"><a href="#c/${esc(c.id)}/${esc(x.id)}"><em>${esc(ITN[x.type] || x.type)}</em>${x.week ? `<small>${x.week}주</small>` : ''}<span>${esc(x.title)}</span></a></li>`).join('')}</ol>
    <div class="imain">${it ? `<h3>${esc(it.title)}</h3>` : ''}${main}</div></div></div></section>`;
}
function viewDiag(id) {
  const d = diagFirst(id); if (!d) return '<section class="sec"><div class="in"><p class="empty">진행 중인 진단이 없습니다.</p></div></section>';
  const res = LR.lp.diag[d.id];
  if (res && !LR.redo) { const o = d.outs.find(x => x.k === res.out) || {}; const rec = SITE().classes.find(c => c.id === o.rec); const ty = SITE().types.find(x => x.k === res.out);
    return `<section class="sec"><div class="in narrow"><p class="eb">RESULT</p><h1>${esc(o.l || res.out)}${ty ? ` <small>${esc(ty.k)}</small>` : ''}</h1>${res.score != null ? `<p class="lead">점수 ${res.score}점</p>` : ''}${ty ? `<p class="lead">${esc(ty.d || '')}</p>` : ''}
      <div class="cta">${rec ? btn(`추천 과정 · ${rec.name}`, '#c/' + rec.id) : btn('코스웨어 보기', '#courses')}${btn('추천 튜토리얼', '#tutorials', 'ghost')}<button class="lbtn ghost" data-lact="redo">다시 진단</button></div>${LR.me ? '' : '<p class="mini">로그인하면 결과가 저장되어 추천 과정이 열립니다.</p>'}</div></section>`; }
  const scale = ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'];
  return `<section class="sec"><div class="in narrow"><p class="eb">DIAGNOSIS</p><h1>${esc(d.name)}</h1><p class="lead">${d.items.length}문항 · 약 ${Math.max(3, Math.round(d.items.length / 2))}분</p>
    <form id="dg" data-v="${esc(d.id)}">${d.items.map((q, k) => `<fieldset class="q"><legend>${k + 1}. ${esc(q.q)}</legend>${d.mode === 'type' ? `<div class="lik">${scale.map((s, j) => `<label><input type="radio" name="q${k}" value="${j + 1}" required><span>${s}</span></label>`).join('')}</div>` : (q.opts || []).map((o, j) => `<label><input type="radio" name="q${k}" value="${j}" required> ${esc(o)}</label>`).join('')}</fieldset>`).join('')}
    <button class="lbtn pri" type="submit">결과 보기</button></form></div></section>`;
}
function viewLogin(back) {
  return `<section class="sec"><div class="in narrow"><h1>로그인</h1><p class="lead">${SITE().org.type === 'univ' ? '학번' : '학습자 번호'}와 기관에서 받은 접근코드를 입력하세요.</p>
    <form id="li" data-back="${esc(back || 'my')}"><label class="fl">${SITE().org.type === 'univ' ? '학번' : '번호'}<input name="sid" inputmode="numeric" autocomplete="username" required maxlength="20"></label><label class="fl">접근코드<input name="code" autocomplete="current-password" required maxlength="12"></label><p class="err" id="liErr" role="alert"></p><button class="lbtn pri" type="submit">로그인</button></form>
    ${LR.mode === 'preview' ? '<p class="mini">미리보기에서는 어드민의 접근코드로 로그인해 볼 수 있으며 기록은 저장되지 않습니다.</p>' : ''}${LR.sample ? `<p class="mini">체험 계정: ${esc(LR.sample.sid)} / ${esc(LR.sample.code)} <button type="button" class="lbtn sm ghost" data-lact="demofill">자동 입력</button></p>` : ''}</div></section>`;
}
function viewMy() {
  if (!LR.me) return needLogin('my');
  const tdone = SITE().tuts.filter(tutDone); const dres = Object.entries(LR.lp.diag || {}); const cls = Object.entries(LR.lp.cls || {});
  return `<section class="sec"><div class="in"><div class="my"><div class="card2"><b>${esc(LR.me.sid)}</b><small>${esc(LR.me.dept || '')}</small><button class="lbtn sm ghost" data-lact="logout">로그아웃</button></div>
    <div class="card2"><b>배지 ${LR.mine.badges.length}개</b>${LR.mine.badges.map(b => `<small>${esc(b.name)} · ${esc(b.at || '')}</small>`).join('') || '<small>아직 없습니다</small>'}</div>
    <div class="card2"><b>진단</b>${dres.map(([k, r]) => `<small>${esc((SITE().diags.find(d => d.id === k) || {}).name || k)} · ${esc(r.out)}${r.score != null ? ` ${r.score}점` : ''}</small>`).join('') || '<small>아직 없습니다</small>'}</div>
    <div class="card2"><b>튜토리얼 ${tdone.length}/${SITE().tuts.length}</b>${tdone.slice(0, 5).map(t => `<small>${esc(t.title)}</small>`).join('')}</div>
    <div class="card2 wide"><b>내 과정</b>${cls.map(([cid, r]) => { const c = SITE().classes.find(x => x.id === cid); if (!c) return ''; const d = Object.values(r.items || {}).filter(x => x && x.done).length; return `<a href="#c/${esc(cid)}">${esc(c.name)} · ${d}/${c.items.length}</a>`; }).join('') || '<small>코스웨어에서 과정을 시작하세요</small>'}</div></div></div></section>`;
}

/* ── 렌더 ── */
function lrender() {
  if (PLAYER && PLAYER.stop) PLAYER.stop(); PLAYER = null;
  const app = $('#lapp'); if (!SITE()) { app.innerHTML = `<div class="lerr"><b>학습자 사이트</b><p>${esc(LR.err || '불러오는 중…')}</p></div>`; return; }
  const { a, b } = route(); let inner, cur = a;
  if (a === 't') { inner = viewTut(b); cur = 'tutorials'; } else if (a === 'c') { inner = viewCourse(b, route().b && decodeURIComponent(location.hash.slice(1)).split('/')[2]); cur = 'courses'; }
  else if (a === 'dg') { inner = viewDiag(b); cur = 'diag'; } else if (a === 'cert') { inner = viewCert(b); cur = 'my'; } else if (a === 'badge') { inner = viewBadgeCert(b); cur = 'my'; } else if (a === 'login') { inner = LR.me ? viewMy() : viewLogin(b); } else inner = viewPage(a);
  document.body.className = 'look-' + (SITE().look || 'clean') + (LR.mode === 'preview' ? ' pv' : '');
  app.innerHTML = shell(inner, cur); document.title = `${SITE().org.name} · 학습`;
  const y = $('#yt'); if (y) PLAYER = ytMount(y);
  if (!location.hash.includes('/')) window.scrollTo(0, 0);
}

/* ── YouTube 플레이어(실제 재생 구간만 누적) ── */
let YTP = null; const loadYT = () => YTP || (YTP = new Promise((ok, no) => { if (window.YT && YT.Player) return ok(); window.onYouTubeIframeAPIReady = ok; const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = no; document.head.appendChild(s); setTimeout(() => no(new Error('timeout')), 8000); }));
function ytMount(el) {
  const id = el.dataset.yt; let seen = new Set(), dur = 0, iv = 0, p = null, stopped = false;
  const rec = () => { const w = dur ? Math.min(1, seen.size / Math.max(1, Math.floor(dur))) : 0; const tgt = el.dataset.kind === 'tut' ? (LR.lp.tut[el.dataset.id] = LR.lp.tut[el.dataset.id] || { w: 0, steps: [], mission: '' }) : (() => { const c = LR.lp.cls[el.dataset.id] = LR.lp.cls[el.dataset.id] || { items: {} }; return (c.items[el.dataset.item] = c.items[el.dataset.item] || {}); })();
    if (w > (tgt.w || 0)) { tgt.w = Math.round(w * 100) / 100; if (el.dataset.kind === 'cls' && w >= 0.8 && !tgt.done) { tgt.done = true; toast('시청 완료로 기록했습니다.', 'ok'); } const t = $('#wtxt'); if (t) t.textContent = `시청 ${Math.round(w * 100)}%`; const b = $('.wbar i'); if (b && el.dataset.kind === 'tut') b.style.width = Math.round(w * 100) + '%'; if (LR.me) LR.api.save(); } };
  loadYT().then(() => { if (stopped) return; p = new YT.Player(el, { videoId: id, host: 'https://www.youtube-nocookie.com', playerVars: { rel: 0, modestbranding: 1, playsinline: 1 }, events: { onReady: () => { dur = p.getDuration() || 0; } } });
    iv = setInterval(() => { try { if (p.getPlayerState && p.getPlayerState() === 1) { const r = p.getPlaybackRate ? p.getPlaybackRate() : 1; if (r <= 2) seen.add(Math.floor(p.getCurrentTime())); if (!dur) dur = p.getDuration(); if (seen.size % 5 === 0) rec(); } } catch (e) { } }, 1000);
  }).catch(() => { el.outerHTML = `<iframe class="ytf" src="https://www.youtube-nocookie.com/embed/${esc(id)}?rel=0" title="영상" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe><button class="lbtn sm ghost" data-lact="wdone">다 봤어요(시청 기록)</button>`; });
  return { stop() { stopped = true; clearInterval(iv); try { rec(); p && p.destroy && p.destroy(); } catch (e) { } }, mark() { const w = 1; seen = new Set(Array.from({ length: Math.max(1, Math.floor(dur || 60)) }, (_, i) => i)); dur = dur || 60; rec(); void w; } };
}

/* ── 이벤트 ── */
document.addEventListener('click', async e => { const el = e.target.closest('[data-lact]'); if (!el) return; const k = el.dataset.lact; e.preventDefault();
  if (k === 'menu') document.body.classList.toggle('mopen');
  if (k === 'tf') { LR.tf = { ...(LR.tf || {}), [el.dataset.k]: el.dataset.v }; lrender(); }
  if (k === 'logout') { await LR.api.logout(); location.hash = '#home'; lrender(); }
  if (k === 'redo') { LR.redo = true; lrender(); LR.redo = false; }
  if (k === 'wdone' && PLAYER) PLAYER.mark();
  if (k === 'demofill' && LR.sample) { const f = $('#li'); f.sid.value = LR.sample.sid; f.code.value = LR.sample.code; }
  if (!LR.me) return;
  if (k === 'msn') { const t = LR.lp.tut[el.dataset.v] = LR.lp.tut[el.dataset.v] || { w: 0, steps: [], mission: '' }; t.mission = $('#msn').value.trim().slice(0, 2000); t.at = nowISO(); LR.api.save(); toast(t.mission ? '미션을 제출했습니다. 운영자 검수 후 배지로 이어집니다.' : '내용을 입력하세요.', t.mission ? 'ok' : 'warn'); }
  if (k === 'asg') { const c = LR.lp.cls[el.dataset.c] = LR.lp.cls[el.dataset.c] || { items: {} }; const txt = $('#asg').value.trim(); if (!txt) { toast('제출 내용을 입력하세요.', 'warn'); return; } c.sub = { text: txt.slice(0, 4000), at: nowISO() }; c.items[el.dataset.i] = { ...(c.items[el.dataset.i] || {}), done: true }; LR.api.save(); toast('과제를 제출했습니다.', 'ok'); lrender(); }
  if (k === 'done') { const c = LR.lp.cls[el.dataset.c] = LR.lp.cls[el.dataset.c] || { items: {} }; c.items[el.dataset.i] = { ...(c.items[el.dataset.i] || {}), done: true }; LR.api.save(); lrender(); }
});
document.addEventListener('change', e => { const el = e.target.closest('[data-lchg]'); if (!el || !LR.me) return; const id = route().b; const t = LR.lp.tut[id] = LR.lp.tut[id] || { w: 0, steps: [], mission: '' }; t.steps = t.steps || []; t.steps[+el.dataset.v] = el.checked; t.at = nowISO(); LR.api.save(); if (t.steps.filter(Boolean).length >= 3) toast('3단계를 모두 따라 했습니다. 미션을 제출하세요!', 'ok'); });
document.addEventListener('submit', async e => { const f = e.target; e.preventDefault();
  if (f.id === 'li') { const b = f.querySelector('button'); b.disabled = true; $('#liErr').textContent = ''; try { await LR.api.login(f.sid.value.trim(), f.code.value.trim()); location.hash = '#' + (decodeURIComponent(f.dataset.back || '') || 'my'); lrender(); } catch (x) { $('#liErr').textContent = x.message; b.disabled = false; } }
  if (f.id === 'dg') { const d = diagFirst(f.dataset.v); const get = k => (f.querySelector(`[name=q${k}]:checked`) || {}).value; let res;
    if (d.mode === 'type') { const s = {}; d.items.forEach((q, k) => { s[q.dim] = (s[q.dim] || 0) + (+get(k) || 0); }); res = { out: Object.entries(s).sort((a, b) => b[1] - a[1])[0]?.[0] || d.outs[0].k }; }
    else { let sc = 0, tot = 0; d.items.forEach((q, k) => { const p = +q.pts || Math.round(100 / d.items.length); tot += p; if (String(get(k)) === String(q.a)) sc += p; }); const score = Math.round(sc / Math.max(1, tot) * 100); res = { score, out: [...d.outs].sort((a, b) => (b.min || 0) - (a.min || 0)).find(o => score >= (o.min || 0))?.k || d.outs[0].k }; }
    LR.lp.diag[d.id] = { ...res, at: nowISO() }; LR.api.save(); window.scrollTo(0, 0); lrender(); }
  if (f.id === 'qz') { const c = SITE().classes.find(x => x.id === f.dataset.c); const it = c.items.find(x => x.id === f.dataset.i); let sc = 0, tot = 0; it.qs.forEach((q, k) => { const p = +q.pts || 1; tot += p; const v = (f.querySelector(`[name=q${k}]:checked`) || f.querySelector(`[name=q${k}]`) || {}).value; if (q.t === 'mc' ? String(v) === String(q.a) : q.t === 'ox' ? String(v).toUpperCase() === String(q.a).toUpperCase() : !!(v && String(v).trim())) sc += p; });
    const score = Math.round(sc / Math.max(1, tot) * 100); const r = LR.lp.cls[c.id] = LR.lp.cls[c.id] || { items: {} }; r.items[it.id] = { ...(r.items[it.id] || {}), done: true, score }; LR.api.save(); toast(`${score}점입니다.`, 'ok'); lrender(); }
});
window.addEventListener('hashchange', () => { document.body.classList.remove('mopen'); lrender(); });
window.addEventListener('message', e => { if (e.origin === location.origin && e.data === 'didisam:reload' && LR.mode === 'preview') { try { LR.site = window.parent.lsSnapshot(); } catch (x) { } lrender(); } });
/* 시작은 lboot.js(모든 스크립트 로드 뒤) */
