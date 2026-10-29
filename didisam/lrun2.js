/* 디디쌤 스튜디오 v10 — 학습자 화면: 셸 · 라우터 · 튜토리얼 · 과정 · 진단 · 로그인 · 마이페이지 · 플레이어 */
'use strict';
let PLAYER = null;
const route = () => { const h = decodeURIComponent(location.hash.slice(1) || 'home').replace(/[)\]}>.,;:!?'"’”\s]+.*$/, '').replace(/[^\x00-\x7F].*$/, '') || 'home'; const [a, ...r] = h.split('/'); return { a, b: r[0], rest: r.join('/') }; };
const pageOf = id => SITE().pages.find(p => p.id === id);
const PG_DESC = { diag: ['DIAGNOSIS', '5분 진단으로 나에게 맞는 코스와 첫 결과물을 찾습니다.'], tutorials: ['TUTORIALS', '영상을 보고 3단계를 따라 하면 결과물이 남습니다.'], courses: ['COURSEWARE', '수준과 유형별 코스를 골라 영상 · 퀴즈 · 과제로 이어갑니다.'], badges: ['DIGITAL BADGES', "배지 하나가 '해 봤다'는 증거가 됩니다."], books: ['DIGITAL BOOK', '읽고 · 보고 · 풀고 · 쓰며 평가까지 한 권으로.'], notice: ['NOTICE', '학습 일정과 소식을 확인하세요.'] };
const TAB_IC = { home: 'home', diag: 'target', tutorials: 'video', courses: 'grid', badges: 'award', books: 'book', notice: 'bell', my: 'user' };

function shell(inner, cur) {
  const S2 = SITE(); const short = S2.org.short || S2.org.name.slice(0, 4); const P = S2.pages.filter(p => p.id !== 'my');
  const nav = P.map(p => `<a href="#${esc(p.id)}" class="${cur === p.id ? 'on' : ''}">${esc(p.name)}</a>`).join('');
  const tabs = ['home', 'tutorials', 'courses', 'books', 'diag'].filter(id => P.some(p => p.id === id)).slice(0, 4);
  const tabbar = `<nav class="tabbar" aria-label="빠른 이동">${tabs.map(id => `<a href="#${id}" class="${cur === id ? 'on' : ''}">${ico(TAB_IC[id], 20)}<span>${esc((pageOf(id) || {}).name || id)}</span></a>`).join('')}<a href="${LR.me ? '#my' : '#login'}" class="${cur === 'my' ? 'on' : ''}">${ico('user', 20)}<span>${LR.me ? '마이' : '로그인'}</span></a></nav>`;
  return `<header class="lh"><div class="in"><a class="brand" href="#home"><span class="lg">${esc(short)}</span><span class="bn"><b>${esc(S2.org.name)}</b><small>온라인 학습 센터</small></span></a>
    <nav class="ln" aria-label="주 메뉴">${nav}</nav><div class="acct">${LR.me ? `<a class="me ${cur === 'my' ? 'on' : ''}" href="#my"><span class="av">${esc(String(LR.me.sid).slice(-2))}</span><span class="sid">${esc(LR.me.sid)}</span></a>` : `<a class="lbtn pri sm" href="#login">${ico('user', 15)}로그인</a>`}</div>
    <button class="mnu" data-lact="menu" aria-label="메뉴 열기">${ico('menu', 22)}</button></div></header>
    ${LR.mode === 'preview' ? '<div class="pvbar">미리보기 · 초안</div>' : ''}${LR.sample ? `<div class="pvbar">체험용 샘플 사이트 · 체험 계정 ${esc(LR.sample.sid)} / ${esc(LR.sample.code)} · 기록은 이 기기에만 저장됩니다</div>` : ''}<main id="lm">${inner}</main>
    <footer class="lf"><div class="in"><div><span class="lg">${esc(short)}</span><b>${esc(S2.org.name)}</b><small>학습자 정보는 ${S2.org.type === 'univ' ? '학번 · 학과만' : '번호 · 소속만'} 저장합니다. 이름 · 연락처 · 이메일은 받지 않습니다.</small></div><small>Powered by 디디쌤</small></div></footer>${tabbar}`;
}
function needLogin(back) { return `<section class="sec"><div class="in narrow"><div class="gate">${ico('lock', 28)}<h2>로그인이 필요합니다</h2><p class="lead">이 화면은 로그인한 ${esc(SITE().terms.learner || '학습자')}만 볼 수 있습니다. 기록 · 진도 · 배지가 저장됩니다.</p>${btn('로그인하기', '#login/' + encodeURIComponent(back || ''), 'pri', 'arrow')}</div></div></section>`; }

function viewPage(id) {
  const p = pageOf(id) || pageOf('home') || SITE().pages[0]; if (!p) return '<p class="empty">페이지가 없습니다.</p>';
  if (p.access === '로그인' && !LR.me) return needLogin(p.id);
  const inner = p.sections.map(s => { try { return (SECR[s.type] || (() => ''))(s.data || {}); } catch (e) { console.error(e); return ''; } }).join('');
  const D = PG_DESC[p.id] || ['', ''];
  return (p.id !== 'home' && p.id !== 'my' && !p.sections.some(s => s.type === 'hero') ? `<section class="sub"><div class="in"><p class="crumb"><a href="#home">홈</a> › ${esc(p.name)}</p><h1>${esc(p.name)}</h1>${D[1] ? `<p>${esc(D[1])}</p>` : ''}</div></section>` : '') + inner + (p.id === 'my' ? viewMy() : '');
}
function viewTut(id) {
  const S2 = SITE(); const t = S2.tuts.find(x => x.id === id); if (!t) return '<section class="sec"><div class="in"><p class="empty">튜토리얼을 찾지 못했습니다.</p></div></section>';
  const r = LR.lp.tut[t.id] || { w: 0, steps: [], mission: '' }; const n3 = (r.steps || []).filter(Boolean).length; const ty = tyOf(t.type);
  const rel = S2.tuts.filter(x => x.id !== t.id && (x.type === t.type || x.level === t.level)).slice(0, 4);
  const stage = !LR.me ? 0 : r.mission ? 3 : n3 >= 3 ? 2 : 1;
  return `<section class="tutv"><div class="in"><p class="crumb"><a href="#tutorials">튜토리얼</a> › ${esc(ty.name)} · ${esc(lvOf(t.level).name)}</p>
    <div class="tvh"><div><span class="tg" style="--c:${esc(ty.color)}">${esc(ty.k)} · ${esc(ty.name)}</span><h1>${esc(t.title)}</h1><p class="mini">${esc([t.ch, t.tool].filter(Boolean).join(' · '))}</p></div>
      <ol class="flow">${['영상 보기', '3단계 따라 하기', '미션 제출'].map((s, i) => `<li class="${i < stage ? 'done' : i === stage || (!LR.me && i === 0) ? 'now' : ''}"><span>${i < stage ? ico('check', 13) : i + 1}</span>${s}</li>`).join('')}</ol></div>
    <div class="tw2"><div class="vid"><div class="vbox">${ytOK(t.yt) ? `<div id="yt" data-yt="${esc(t.yt)}" data-kind="tut" data-id="${esc(t.id)}"></div>` : '<div class="novid">영상 준비 중</div>'}</div><div class="wbar"><i style="width:${Math.round((r.w || 0) * 100)}%"></i></div><small class="mini" id="wtxt">시청 ${Math.round((r.w || 0) * 100)}%</small></div>
    <aside class="follow"><p class="fh">STEP 2 · 따라 할 3단계 <b>${n3}/3</b></p>${t.steps.map((s, i) => `<label class="fs"><input type="checkbox" data-lchg="step" data-v="${i}" ${r.steps && r.steps[i] ? 'checked' : ''} ${LR.me ? '' : 'disabled'}><span><em>${i + 1}</em>${esc(s)}</span></label>`).join('')}
      <div class="mission"><p class="fh">STEP 3 · 미션 제출</p><b>${esc(t.mission)}</b>${LR.me ? `<textarea id="msn" rows="4" maxlength="2000" placeholder="결과물 링크 · 만든 과정 한 줄 설명">${esc(r.mission || '')}</textarea><button class="lbtn pri blk" data-lact="msn" data-v="${esc(t.id)}">${r.mission ? '다시 제출' : '미션 제출하기'}</button>${r.mission ? '<small class="mini">제출 완료 · 운영자 검수 후 배지로 이어집니다.</small>' : ''}` : `<p class="mini">로그인하면 체크 · 미션 제출이 기록되어 배지로 이어집니다.</p>${btn('로그인하고 기록하기', '#login/' + encodeURIComponent('t/' + t.id), 'pri blk')}`}</div></aside></div>
    ${rel.length ? `<div class="rel"><h3>이어서 해 볼 튜토리얼</h3><div class="tgrid">${rel.map(x => `<a class="tcard" href="#t/${esc(x.id)}">${thumb(x.yt)}<div class="tci"><span class="tg" style="--c:${esc(tyOf(x.type).color)}">${esc(tyOf(x.type).name)}</span><b>${esc(x.title)}</b><small>${esc(x.tool || '')}</small><span class="go">${tutDone(x) ? ico('check', 14) + ' 완료' : '3단계 따라 하기 ' + ico('arrow', 13)}</span></div></a>`).join('')}</div></div>` : ''}</div></section>`;
}
const ITN = { video: '영상', doc: '강의자료', quiz: '퀴즈', exam: '시험', assign: '과제', survey: '설문', live: '라이브', offline: '오프라인' };
const ITI = { video: 'video', doc: 'book', quiz: 'edit', exam: 'edit', assign: 'brief', survey: 'star', live: 'video', offline: 'pin' };
function viewCourse(id, itemId) {
  const S2 = SITE(); const c = S2.classes.find(x => x.id === id); if (!c) return '<section class="sec"><div class="in"><p class="empty">과정을 찾지 못했습니다.</p></div></section>';
  if (!LR.me) return needLogin('c/' + id);
  const r = LR.lp.cls[c.id] || { items: {} }; r.items = r.items || {}; const m = (LR.mine.cls || {})[c.id] || {}; const done = c.items.filter(x => (r.items[x.id] || {}).done).length; const p = Math.max(Math.round(done / Math.max(1, c.items.length) * 100), m.p || 0);
  const it = c.items.find(x => x.id === itemId) || c.items.find(x => !(r.items[x.id] || {}).done) || c.items[0]; const k = it ? c.items.indexOf(it) : -1; const prev = c.items[k - 1], nx = c.items[k + 1];
  const ty = S2.types.find(x => x.k === c.ctype); const G = []; c.items.forEach(x => { const w = x.week || 0; let g = G.find(y => y.w === w); if (!g) G.push(g = { w, items: [] }); g.items.push(x); });
  let main = '<p class="empty">항목이 없습니다.</p>';
  if (it) { const st = r.items[it.id] || {};
    if (it.type === 'video') main = ytOK(it.yt) ? `<div class="vbox"><div id="yt" data-yt="${esc(it.yt)}" data-kind="cls" data-id="${esc(c.id)}" data-item="${esc(it.id)}"></div></div><div class="wbar"><i style="width:${Math.round((st.w || 0) * 100)}%"></i></div><small class="mini" id="wtxt">시청 ${Math.round((st.w || 0) * 100)}% · 80% 이상 보면 완료</small>` : `<div class="novid">${ico('video', 28)}<span>영상 준비 중</span></div><button class="lbtn ${st.done ? 'ghost' : 'pri'}" data-lact="done" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${st.done ? '완료됨' : '확인했어요'}</button>`;
    else if (it.type === 'quiz' || it.type === 'exam') main = `${st.score != null ? `<div class="qres"><b>${st.score}</b><small>점 · 최근 응시</small></div>` : `<p class="mini">${it.qs.length}문항${it.time ? ` · ${it.time}분` : ''} · 제출하면 바로 채점됩니다.</p>`}<form id="qz" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${it.qs.map((q, k2) => `<fieldset class="q"><legend><span>${k2 + 1}</span>${esc(String(q.q).replace(/^\d+\.\s*/, ''))}</legend>${q.t === 'mc' || q.t === 'ox' ? `<div class="opts">${(q.t === 'ox' ? ['O', 'X'] : q.opts).map((o, j) => `<label><input type="radio" name="q${k2}" value="${q.t === 'ox' ? esc(o) : j}"><span>${esc(o)}</span></label>`).join('')}</div>` : `<textarea name="q${k2}" rows="3" maxlength="1000" placeholder="답을 입력하세요"></textarea>`}</fieldset>`).join('') || '<p>문항이 없습니다.</p>'}<button class="lbtn pri" type="submit">${st.score != null ? '다시 제출' : '제출하고 채점'}</button></form>`;
    else if (it.type === 'assign') main = `<div class="body">${nl(it.desc || '과제 안내를 확인하고 제출하세요.')}</div>${m.st && m.st !== 'none' ? `<p class="fbk ${esc(m.st)}"><b>${esc({ submitted: '검수 대기', graded: '검수 완료', returned: '재제출 요청', failed: '미통과' }[m.st] || '')}</b>${m.fb ? ' ' + esc(m.fb) : ''}</p>` : ''}<textarea id="asg" rows="6" maxlength="4000" placeholder="제출 내용 · 결과물 링크">${esc((r.sub && r.sub.text) || '')}</textarea><button class="lbtn pri" data-lact="asg" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${r.sub ? '다시 제출' : '과제 제출'}</button>`;
    else main = `<div class="body">${nl(it.desc || `${ITN[it.type] || '항목'} 안내를 확인하세요.`)}</div><button class="lbtn ${st.done ? 'ghost' : 'pri'}" data-lact="done" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${st.done ? '완료됨' : '완료로 표시'}</button>`; }
  return `<section class="crsh" style="--c:${esc(ty ? ty.color : lvOf(c.level).color)}"><div class="in"><p class="crumb"><a href="#courses">코스웨어</a> › ${esc(lvOf(c.level).name)}</p><div class="crhg"><div><div class="chips2"><span class="tg">${esc(lvOf(c.level).name)}</span>${ty ? `<span class="tg">${esc(ty.k)} · ${esc(ty.name)}</span>` : ''}${m.st && m.st !== 'none' ? `<span class="tg">${esc({ submitted: '검수 대기', graded: '검수 완료', returned: '재제출 요청', failed: '미통과' }[m.st] || '')}</span>` : ''}</div><h1>${esc(c.name)}</h1><p class="mini">${esc(c.start || '')} ~ ${esc(c.end || '')}${c.hours ? ` · ${c.hours}시간` : ''} · 수료 기준 진도 ${c.thr || 80}%</p></div>
      <div class="ring" style="--p:${p}"><b>${p}<small>%</small></b><span>${done}/${c.items.length} 완료</span></div></div>${p >= (c.thr || 80) ? `<a class="lbtn sm wht" href="#cert/${esc(c.id)}">${ico('award', 15)} 수료증 보기</a>` : ''}</div></section>
    <section class="crsb"><div class="in cw2"><aside class="cur"><button class="curt" data-lact="curt">${ico('grid', 16)} 목차 <b>${done}/${c.items.length}</b>${ico('down', 16)}</button><ol class="items">${G.map(g => `<li class="wk"><p>${g.w ? `${g.w}${c.weekly === false ? '차시' : '주차'}` : '항목'}<small>${g.items.filter(x => (r.items[x.id] || {}).done).length}/${g.items.length}</small></p><ol>${g.items.map(x => `<li class="${x.id === (it && it.id) ? 'on' : ''} ${(r.items[x.id] || {}).done ? 'done' : ''}"><a href="#c/${esc(c.id)}/${esc(x.id)}"><i>${(r.items[x.id] || {}).done ? ico('check', 13) : ico(ITI[x.type] || 'spark', 13)}</i><span>${esc(x.title)}</span><em>${esc(ITN[x.type] || x.type)}</em></a></li>`).join('')}</ol></li>`).join('')}</ol></aside>
    <div class="imain">${it ? `<div class="ih"><span class="tg">${ico(ITI[it.type] || 'spark', 13)} ${esc(ITN[it.type] || it.type)}${it.week ? ` · ${it.week}주차` : ''}</span><small>${k + 1} / ${c.items.length}</small></div><h2>${esc(it.title)}</h2>` : ''}${main}
      <div class="inav">${prev ? `<a class="lbtn ghost" href="#c/${esc(c.id)}/${esc(prev.id)}">← 이전</a>` : '<span></span>'}${nx ? `<a class="lbtn dark" href="#c/${esc(c.id)}/${esc(nx.id)}">다음 · ${esc(nx.title.slice(0, 18))} →</a>` : `<a class="lbtn dark" href="#my">마이페이지로 →</a>`}</div></div></div></section>`;
}
function viewDiag(id) {
  const d = diagFirst(id); if (!d) return '<section class="sec"><div class="in"><p class="empty">진행 중인 진단이 없습니다.</p></div></section>';
  const res = LR.lp.diag[d.id];
  if (res && !LR.redo) { const o = d.outs.find(x => x.k === res.out) || {}; const rec = SITE().classes.find(c => c.id === o.rec); const ty = SITE().types.find(x => x.k === res.out); const T = SITE().tuts.filter(t => t.type === res.out).slice(0, 3);
    return `<section class="dres" style="--c:${esc(ty ? ty.color : '#4b3cff')}"><div class="in narrow"><p class="eb">MY RESULT</p><div class="drc"><b>${esc(ty ? ty.k : res.out)}</b><div><h1>${esc(o.l || (ty && ty.name) || res.out)}</h1>${ty && ty.d ? `<p>${esc(ty.d)}</p>` : ''}${res.score != null ? `<p>점수 ${res.score}점</p>` : ''}</div></div>
      <div class="drn"><h3>이제 이렇게 시작하세요</h3><a class="nx2" href="${rec ? '#c/' + esc(rec.id) : '#courses'}"><span>1</span><div><b>${rec ? `추천 코스 · ${esc(rec.name)}` : '코스웨어에서 내 코스 고르기'}</b><small>${rec ? `${rec.items.length}개 항목 · 영상 · 퀴즈 · 과제` : '수준 × 유형 표에서 고릅니다'}</small></div>${ico('arrow', 18)}</a>${T.map((t, i) => `<a class="nx2" href="#t/${esc(t.id)}"><span>${i + 2}</span><div><b>${esc(t.title)}</b><small>튜토리얼 · ${esc(t.mission || '3단계 따라 하기')}</small></div>${ico('arrow', 18)}</a>`).join('')}</div>
      <div class="cta">${btn('마이페이지에서 보기', LR.me ? '#my' : '#login/my', 'pri')}<button class="lbtn ghost" data-lact="redo">다시 진단</button></div>${LR.me ? '' : '<p class="mini">로그인하면 결과가 저장되어 추천 코스가 마이페이지에 열립니다.</p>'}</div></section>`; }
  const scale = ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다']; const n = d.items.length;
  return `<section class="dgv"><div class="in narrow"><p class="eb">DIAGNOSIS</p><h1>${esc(d.name)}</h1><p class="lead">${n}문항 · 약 ${Math.max(3, Math.round(n / 2))}분 · 정답은 없습니다. 지금 나와 가까운 쪽을 고르세요.</p>
    <div class="dgp"><div class="wbar"><i id="dgbar" style="width:0%"></i></div><small id="dgn">0 / ${n}</small></div>
    <form id="dg" data-v="${esc(d.id)}">${d.items.map((q, k) => `<fieldset class="q ${k ? 'later' : ''}" data-k="${k}"><legend><span>${k + 1}</span>${esc(q.q)}</legend>${d.mode === 'type' ? `<div class="lik">${scale.map((s, j) => `<label><input type="radio" name="q${k}" value="${j + 1}" required><span>${s}</span></label>`).join('')}</div>` : `<div class="opts">${(q.opts || []).map((o, j) => `<label><input type="radio" name="q${k}" value="${j}" required><span>${esc(o)}</span></label>`).join('')}</div>`}</fieldset>`).join('')}
    <button class="lbtn pri blk later" id="dgsub" type="submit">결과 보기 ${ico('arrow', 16)}</button></form></div></section>`;
}
function viewLogin(back) {
  const u = SITE().org.type === 'univ';
  return `<section class="login"><div class="in"><div class="lgw"><div class="lgl"><p class="eb">WELCOME</p><h1>${esc(SITE().org.name)}<br>온라인 학습 센터</h1><ul>${[['target', '진단 결과와 추천 코스가 저장됩니다'], ['video', '영상 · 튜토리얼 진도가 이어집니다'], ['award', '과제 검수 후 디지털 배지가 발급됩니다']].map(([i, t]) => `<li>${ico(i, 18)}${t}</li>`).join('')}</ul><small>${u ? '학번 · 학과' : '번호 · 소속'}과 학습 기록만 저장합니다. 이름 · 연락처 · 이메일은 받지 않습니다.</small></div>
    <div class="lgr"><h2>로그인</h2><p class="mini">${u ? '학번' : '학습자 번호'}와 기관에서 받은 접근코드를 입력하세요.</p>
    <form id="li" data-back="${esc(back || 'my')}"><label class="fl">${u ? '학번' : '번호'}<input name="sid" inputmode="numeric" autocomplete="username" required maxlength="20" placeholder="${u ? '예: 20260001' : ''}"></label><label class="fl">접근코드<input name="code" autocomplete="current-password" required maxlength="12" placeholder="기관에서 받은 코드"></label><p class="err" id="liErr" role="alert"></p><button class="lbtn pri blk" type="submit">로그인 ${ico('arrow', 16)}</button></form>
    ${LR.sample ? `<div class="demo"><span>체험 계정 <b>${esc(LR.sample.sid)}</b> / <b>${esc(LR.sample.code)}</b></span><button type="button" class="lbtn sm ghost" data-lact="demofill">자동 입력</button></div>` : ''}${LR.mode === 'preview' ? '<p class="mini">미리보기에서는 어드민의 접근코드로 로그인해 볼 수 있으며 기록은 저장되지 않습니다.</p>' : ''}<p class="mini">접근코드를 모르면 ${u ? '학과 사무실 · 담당 선생님' : '담당자'}에게 발급을 요청하세요.</p></div></div></div></section>`;
}
function viewMy() { return needLogin('my'); }

/* ── 렌더 ── */
function lrender() {
  if (PLAYER && PLAYER.stop) PLAYER.stop(); PLAYER = null; if (typeof bkStop === 'function') bkStop();
  const app = $('#lapp'); if (!SITE()) { app.innerHTML = `<div class="lerr"><b>학습자 사이트</b><p>${esc(LR.err || '불러오는 중…')}</p></div>`; return; }
  const { a, b } = route(); let inner, cur = a;
  if (a === 't') { inner = viewTut(b); cur = 'tutorials'; } else if (a === 'c') { inner = viewCourse(b, route().b && decodeURIComponent(location.hash.slice(1)).split('/')[2]); cur = 'courses'; }
  else if (a === 'dg') { inner = viewDiag(b); cur = 'diag'; } else if (a === 'cert') { inner = viewCert(b); cur = 'my'; } else if (a === 'badge') { inner = viewBadgeCert(b); cur = 'my'; } else if (a === 'bk' && typeof viewBook === 'function') { const n = decodeURIComponent(location.hash.slice(1)).split('/')[2]; inner = viewBook(b, n ? Math.max(0, (parseInt(n, 10) || 1) - 1) : null); cur = 'books'; } else if (a === 'bkcert' && typeof viewBookCert === 'function') { inner = viewBookCert(b); cur = 'my'; }
  else if (a === 'login') { inner = LR.me ? viewMy() : viewLogin(route().rest); } else inner = viewPage(a);
  document.body.className = 'look-' + (SITE().look || 'clean') + (LR.mode === 'preview' ? ' pv' : '');
  app.innerHTML = shell(inner, cur); document.title = `${SITE().org.name} · 학습`;
  const y = $('#yt'); if (y) PLAYER = ytMount(y);
  if (!location.hash.includes('/')) window.scrollTo(0, 0); if (typeof bkMount === 'function') bkMount();
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
window.addEventListener('hashchange', () => { document.body.classList.remove('mopen', 'curopen'); lrender(); });
window.addEventListener('message', e => { if (e.origin === location.origin && e.data === 'didisam:reload' && LR.mode === 'preview') { try { LR.site = window.parent.lsSnapshot(); } catch (x) { } lrender(); } });
/* v11: 모바일 목차 · 진단 한 문항씩 열기 */
document.addEventListener('click', e => { const el = e.target.closest('[data-lact="curt"]'); if (el) { e.preventDefault(); document.body.classList.toggle('curopen'); } });
document.addEventListener('change', e => { const f = e.target.closest('#dg'); if (!f) return; const Fs = [...f.querySelectorAll('fieldset')]; const k = +e.target.closest('fieldset').dataset.k; const ans = Fs.filter(x => x.querySelector('input:checked')).length;
  const bar = document.getElementById('dgbar'); if (bar) bar.style.width = Math.round(ans / Fs.length * 100) + '%'; const n = document.getElementById('dgn'); if (n) n.textContent = `${ans} / ${Fs.length}`;
  const nx = Fs[k + 1]; e.target.closest('fieldset').classList.add('answered'); if (nx && nx.classList.contains('later')) { nx.classList.remove('later'); setTimeout(() => nx.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120); }
  if (ans >= Fs.length) { const b = document.getElementById('dgsub'); if (b) { b.classList.remove('later'); b.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } });
/* 시작은 lboot.js(모든 스크립트 로드 뒤) */
