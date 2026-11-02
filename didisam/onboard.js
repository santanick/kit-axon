/* 디디쌤 스튜디오 v20 — 클래식 화면 + AI SAM '시작 가이드'(온보딩)
   대표님(2026-11-02): '지금 화면이 더 어려워. 클래식 화면을 살리고, 온보딩 가이드와 단계별 안내만 AI SAM 챗봇에 넣어 따라 하고 완성하게.
   사이드바 모양 등은 지금 화면 느낌으로.'
   - 화면 틀: 왼쪽 아이콘 레일(클래식 작업 공간) + 넓은 화면 + 오른쪽 아래 떠 있는 AI SAM
   - 홈은 클래식 홈(오늘 확인할 일), 빌드 단계 줄 · '실시간 미리보기' · '완료 · 다음 단계' 버튼은 화면에서 뺀다
   - 시작 세팅(빌드 단계)은 AI SAM 대화창 맨 위 '시작 가이드' 카드: 진행률 · 단계 칩 · 지금 단계(설명 · 화면 열기 · AI에게 맡기기 · 완료 · 건너뛰기)
   - 단계는 실제로 해내면 자동 완료(bAuto), 다 끝나면 완료 카드 → 닫기 */
'use strict';
if (!IC.down) IC.down = '<path d="M6 9l6 6 6-6"/>';
/* 홈 = 클래식 홈(대화 칸은 떠 있는 AI SAM이 대신), 빌드 단계 줄은 대화창 카드로 옮김 */
/* 클래식 홈의 '세팅 n/m' 알약은 예전 체크리스트라 시작 가이드와 숫자가 달라 헷갈림 → 시작 가이드 진행률로 바꾸고 누르면 대화창 카드 */
bHome = () => { let h = VIEWS.home(); if (S.bld) { const L = bList(), dn = L.filter(s => bDone(s.id)).length; h = h.replace(/<button class="pill" data-act="setup">[\s\S]*?<\/button>/, `<button class="pill ${dn < L.length ? 'obpill' : ''}" data-act="ob-show">${ic(dn < L.length ? 'spark' : 'check', 14)} 시작 가이드 ${dn}/${L.length}</button>`); } return h; };
bStrip = () => '';
function obQ(id) { return bQ(id).filter(x => !/(다음\s*단계|빼줘|넣어줘|단계도)/.test(x))[0] || ''; }
function obCur(s) {
  const q = obQ(s.id); const G = bGuideText(s.id).split('\n').filter(Boolean); const tip = G[G.length - 1] || s.d;
  return `<div class="obc"><b>${esc(bName(s))}</b><p>${esc(tip)}</p><div class="obbtn">${s.id === 'org' ? `<button type="button" class="btn sm" data-act="bld-cfg">${ic('gear', 13)} 만들 단계 고르기</button>` : `<button type="button" class="btn sm" data-act="ob-go" data-v="${s.id}">화면 열기</button>`}${q ? `<button type="button" class="btn sm ink" data-act="chat-q" data-v="${esc(q)}">${ic('spark', 13)} AI에게 맡기기</button>` : ''}<button type="button" class="btn sm ghost" data-act="ob-done" data-v="${s.id}">${ic('check', 13)} 완료</button>${s.req ? '' : `<button type="button" class="btn sm ghost" data-act="bld-drop" data-v="${s.id}">건너뛰기</button>`}</div></div>`;
}
function obHTML() {
  if (typeof S === 'undefined' || !S || !S.org || !S.bld) return '';
  const L = bList(); const dn = L.filter(s => bDone(s.id)).length; const all = dn === L.length;
  if (all && S.bld.obHide) return '';
  const c = all ? null : bCur(); const open = !UI.obc; const pct = Math.round(dn / Math.max(1, L.length) * 100);
  let h = `<div class="obd ${open ? 'on' : ''} ${all ? 'fin' : ''}"><button type="button" class="obh" data-act="ob-tog" aria-expanded="${open}"><span class="obi">${ic(all ? 'check' : 'spark', 14)}</span><span class="obt"><b>${all ? '시작 가이드 완료' : '시작 가이드'}</b><small>${all ? '운영을 시작할 준비가 끝났습니다' : `STEP ${L.indexOf(c) + 1} · ${esc(bName(c))}`}</small></span><span class="obp">${dn}/${L.length}</span><span class="obbar"><i style="width:${pct}%"></i></span>${ic('down', 14)}</button>`;
  if (open) {
    if (all) h += `<div class="obc"><p>시작 세팅 ${L.length}단계를 모두 마쳤습니다. 이제 첫 화면의 '오늘 확인할 일'부터 운영하시면 됩니다. 무엇이든 아래 대화창에 말로 지시하세요.</p><div class="obbtn"><button type="button" class="btn sm ink" data-act="ob-home">오늘 확인할 일 보기</button><button type="button" class="btn sm ghost" data-act="ob-hide">가이드 닫기</button></div></div>`;
    else h += `<div class="obs" role="list">${L.map((s, i) => { const d = bDone(s.id), cur = c && c.id === s.id; return `<button type="button" role="listitem" class="ob1 ${d ? 'ok' : cur ? 'cur' : ''}" data-act="ob-step" data-v="${s.id}" ${cur ? 'aria-current="step"' : ''} title="${esc(s.d)}"><i>${d ? '✓' : i + 1}</i>${esc(bName(s))}${s.req ? '' : '<em>선택</em>'}</button>`; }).join('')}</div>${obCur(c)}`;
  }
  return h + '</div>';
}
function obMount() {
  const html = obHTML();
  document.querySelectorAll('.bchat, #drawer').forEach(p => { const o = p.querySelector('.obd'); if (!html) { o && o.remove(); return; } if (o) o.outerHTML = html; else p.querySelector('.thread')?.insertAdjacentHTML('beforebegin', html); });
  const pr = $('.bprog'); if (pr && !pr.dataset.act) { pr.dataset.act = 'ob-show'; pr.setAttribute('role', 'button'); pr.tabIndex = 0; pr.title = '시작 가이드 열기'; }
  /* 시작 가이드가 남아 있으면 처음 한 번 대화창을 연다 */
  if (S && S.bld && !bAllDone() && !S.bld.obAuto && typeof fabOn === 'function' && fabOn()) { S.bld.obAuto = 1; save(); setTimeout(() => fabOpen(false), 400); } /* 기관마다 처음 한 번만 */
}
ACT['ob-tog'] = () => { UI.obc = !UI.obc; obMount(); };
ACT['ob-show'] = () => { UI.obc = false; if (S.bld) S.bld.obHide = false; typeof fabOpen === 'function' ? fabOpen(false) : ACT['chat-open'](); obMount(); };
ACT['ob-hide'] = () => { S.bld.obHide = true; save(); obMount(); };
ACT['ob-home'] = () => go('home');
ACT['ob-step'] = el => { const s = bStep(el.dataset.v); if (!s) return; if (bDone(s.id)) { if (s.view !== 'home') go(s.view); else ACT['bld-cfg'](); return; } ACT['bld-step'](el); };
ACT['ob-go'] = el => { const s = bStep(el.dataset.v); if (!s) return; S.bld.cur = s.id; bMenuOn(s.view); save(); if (innerWidth <= 860) document.body.classList.add('b-pv'); go(s.view); };
ACT['ob-done'] = el => { const id = el.dataset.v; const c = bCur(); if (c && c.id === id) { bAdvance(); return; } S.bld.steps[id].done = true; S.bld.seen[id] = 1; save(); render(); };
{ const base = renderThreads; renderThreads = (...a) => { const r = base(...a); obMount(); return r; }; }
AFTER.push(() => { obMount(); const cb = $('.bhdl b'); if (cb && CUR.ws === 'home') cb.textContent = '오늘의 운영'; }); /* bCrumb는 const라 DOM으로 */
/* 대화창을 새로 열 때(클래식 서랍)도 카드를 붙인다 */
{ const base = ACT['chat-open']; ACT['chat-open'] = el => { base(el); obMount(); }; }
{ const base = ACT['bld-step']; ACT['bld-step'] = el => { base(el); obMount(); }; }
COVER.push(['[신규] 시작 가이드: AI SAM 대화창에서 시작 세팅을 단계별로 따라 하고 완성', 'home', '']);
