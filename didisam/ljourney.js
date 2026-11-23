/* v46 D6 학습자 — ④ 오늘의 숙달 목표(홈 첫 카드 「오늘 익힐 것」) ⑩ 작은 성취 · 나의 여정(#journey) · 마일리지 트리거(기본 0점 · 꺼짐)
   - 기관 정책 SITE().aipol.on === true 일 때만 동작. 꺼져 있으면(기존 기관 · aipol 없음) 모든 감싸기는 원래 결과를 그대로 돌려준다.
   - 계산은 mastcalc.js(window.MAST, 순수). 기록 원천: lp.cls[c].items(퀴즈 tries · 과제 subs) · lp.cls[c].refl(D5 루프) · lp.hint(D4) · lp.vision(D4).
   - 이 파일이 쓰는 학습자 기록: lp.mtoday = { d, ids, skip }(오늘 고른 개념) · lp.mgoal = ['YYYY-MM-DD'](오늘 목표 완료한 날) — 서버 cleanLP 화이트리스트 필요(D1 · D2 요청).
   - 작은 성취 마일리지: aipol.ach = { on, pts }(없으면 0점 · 꺼짐). 켜진 기관만 window.MILE_HOOK(이벤트 배열)로 넘김(srcId = 작은 성취 id).
   - 학습 이벤트: 오늘 목표 완료 → LEV.emit('goal', 'today', { n }), 숙달 상태 변화 → LEV.emit('mastery', '<cid>/<kid>', { st }) (글 원문 없음) */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.MAST) return;
  const M = window.MAST;
  try { if (typeof ICP === 'object' && ICP) { const add = { flag: 'M5 21V4M5 4h11l-2 4 2 4H5', file: 'M6 3h8l4 4v14H6zM14 3v4h4', pen: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', up: 'M4 17l6-6 4 4 6-6M14 9h6v6', flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-3 2-4 2-7 1 1 2 2 3 4 0-3-1-5 0-7z', bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z', coin: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9 9.5c0-1 1.3-1.5 3-1.5s3 .7 3 2-1.3 1.7-3 2-3 .8-3 2 1.3 2 3 2 3-.5 3-1.5M12 6v2M12 16v2', map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15' }; Object.keys(add).forEach(k => { if (!ICP[k]) ICP[k] = add[k]; }); } } catch (e) { } /* 아이콘 내용만 보탬 */
  const site = () => { try { return typeof SITE === 'function' ? SITE() : null; } catch (e) { return null; } };
  const pol = () => { const s = site(); return (s && s.aipol) || null; };
  const on = () => { const p = pol(); return !!(p && p.on === true); };
  const me = () => { try { return LR.me && LR.me.kind !== 'parent' && !(typeof isPar === 'function' && isPar()) ? LR.me : null; } catch (e) { return null; } };
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const I = (k, n) => (typeof ico === 'function' ? ico(k, n || 16) : '');
  const save = () => { try { LR.api.save(); } catch (e) { } };
  const emit = (v, o, x) => { try { window.LEV && LEV.emit(v, o, x); } catch (e) { } };
  const ST = { new: ['미도달', 'v2-ms--new'], prog: ['익히는 중', 'v2-ms--prog'], done: ['숙달', 'v2-ms--done'] };
  const nowISO = () => new Date().toISOString();

  /* ── 데이터 모으기 ── */
  function courses() { try { if (typeof myStats === 'function') return (myStats().courses || []).map(x => x.c).filter(Boolean); } catch (e) { console.error('ljourney courses', e); } return []; }
  function data() {
    const lp = LR.lp || {}; const now = Date.now(); const C = courses(); const ovAll = ((LR.mine || {}).mast) || {};
    const rows = C.map(c => ({ c, rec: (lp.cls || {})[c.id] || { items: {} }, cpts: M.course(c, (lp.cls || {})[c.id], lp.hint || {}, { now, ov: ovAll[c.id] }) }));
    const all = [].concat(...rows.map(r => r.cpts)); const goals = Array.isArray(lp.mgoal) ? lp.mgoal : [];
    const A = M.ach({ courses: rows, goals }, { pol: pol() && pol().ach }); return { C, rows, all, A, goals, now };
  }
  const stKey = () => { const lp = LR.lp; lp.mtoday = lp.mtoday && typeof lp.mtoday === 'object' ? lp.mtoday : {}; return lp.mtoday; };
  function todayOf(D) { const S = stKey(); const T = M.today(D.all, S.d ? S : null, { now: D.now }); if (S.d !== T.d || (S.ids || []).join() !== T.ids.join()) { LR.lp.mtoday = { d: T.d, ids: T.ids, skip: T.skip }; save(); } return T; }
  /* 숙달 상태가 바뀐 개념만 mastery 이벤트(lp.mlast = { key: st }) */
  function diffEmit(D) { const L = LR.lp.mlast = LR.lp.mlast && typeof LR.lp.mlast === 'object' ? LR.lp.mlast : {}; let ch = false;
    D.all.forEach(k => { const key = k.cid + '/' + k.id; if (L[key] !== k.st) { if (L[key] !== undefined || k.st !== 'new') emit('mastery', key.replace(/[^\w/-]/g, '').slice(0, 121), { st: k.st, reg: !!k.reg }); L[key] = k.st; ch = true; } }); if (ch) save(); }
  function goalDone(T) { const G = LR.lp.mgoal = Array.isArray(LR.lp.mgoal) ? LR.lp.mgoal : []; if (!T.done || G.includes(T.d)) return false; G.push(T.d); LR.lp.mgoal = G.slice(-120); save(); emit('goal', 'today', { n: T.rows.length }); return true; }
  /* 마일리지: 켜진 기관만, 아직 넘기지 않은 작은 성취만(lp.mach = [id]) */
  function mileHook(D) { const ach = pol() && pol().ach; const ev = M.mileEvents(D.A, ach); if (!ev.length || typeof window.MILE_HOOK !== 'function') return 0;
    const sent = LR.lp.mach = Array.isArray(LR.lp.mach) ? LR.lp.mach : []; const nw = ev.filter(e => !sent.includes(e.srcId)); if (!nw.length) return 0;
    try { window.MILE_HOOK(nw.map(e => Object.assign({ sid: LR.me.sid }, e))); nw.forEach(e => sent.push(e.srcId)); LR.lp.mach = sent.slice(-500); save(); } catch (e) { console.error('ljourney mile', e); } return nw.length; }
  const weekN = D => { const w = M.weekStart(D.now); return D.A.filter(a => a.day >= w).length; };
  const actDays = D => { const S = new Set(); D.rows.forEach(r => { const RI = (r.rec && r.rec.items) || {}; Object.values(RI).forEach(x => { (x.tries || []).forEach(t => t && t.at && S.add(M.day(t.at))); (x.subs || []).forEach(t => t && t.at && S.add(M.day(t.at))); }); Object.values((r.rec && r.rec.refl) || {}).forEach(x => x && x.at && S.add(M.day(x.at))); }); D.goals.forEach(d => S.add(d)); return [...S]; };
  function mileTxt() { try { if (typeof mileOn === 'function' && mileOn() && window.LMIL && LMIL.model) { const m = LMIL.model(LR.me.sid); if (m) return `${(+m.balance || 0).toLocaleString('ko-KR')}${E(m.unit || 'P')}`; } } catch (e) { } return ''; }

  /* ── ④ 홈 첫 카드 「오늘 익힐 것」 ── */
  function nextTxt(k) { if (k.st === 'done') return k.reg ? '다시 확인해 볼까요?' : '숙달했어요 · 가끔 복습해요';
    if (k.st === 'prog' && k.check) return `다음: 숙달 확인 ${k.check.n ? k.check.n + '문항' : ''}`.trim(); if (k.next) return `다음: ${k.next.title || '이어서 학습'}`; return '다음: 이어서 학습'; }
  const hrefOf = k => { const it = k.st === 'prog' && k.check ? k.check : k.next; return it ? `#c/${encodeURIComponent(k.cid)}/${encodeURIComponent(it.id)}` : `#c/${encodeURIComponent(k.cid)}`; };
  const pips = k => { const n = Math.max(2, k.need || 2); const f = k.st === 'done' ? n : Math.min(n, k.run || 0); return `<span class="v2-pips" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i class="${i < f ? 'f' : ''}"></i>`).join('')}</span>`; };
  function rowHTML(k, i, canSwap) { const s = ST[k.st] || ST.new;
    return `<li class="v2-cpt mj-row${k.st === 'done' ? ' is-done' : i === 0 ? ' is-cur' : ''}${i > 0 ? ' is-mini' : ''}" data-mjk="${E(k.cid + '/' + k.id)}"><div class="v2-cpt__tx"><b>${E(k.name)}</b><small><span class="mj-st">${s[0]}</span> · ${E(nextTxt(k))}${k.cname ? ` · ${E(k.cname)}` : ''}</small>${pips(k)}</div>
      <span class="v2-ms ${s[1]}">${k.st === 'done' ? I('check', 13) : ''}${s[0]}</span><span class="mj-act"><a class="lbtn ghost sm mj-go" href="${hrefOf(k)}" data-mj="go">${k.st === 'done' ? '복습' : '바로 학습'}</a>${canSwap && k.st !== 'done' ? `<button type="button" class="mj-sw" data-mj="swap" data-i="${i}">다른 개념으로</button>` : ''}</span></li>`; }
  function sumHTML(D) { const mt = mileTxt(); const st = M.streak(actDays(D), D.now); const nd = D.all.filter(k => k.st === 'done').length;
    return `<div class="v2-sum mj-sum"><a href="#journey"><b>${weekN(D)}개</b><small>이번 주 작은 성취</small></a>${mt ? `<a href="#mile" class="is-p"><b>${mt}</b><small>마일리지</small></a>` : `<a href="#journey"><b>${nd}개</b><small>숙달한 개념</small></a>`}<a href="#journey"><b>${st}일</b><small>연속 학습</small></a></div>`; }
  function cardHTML() { const D = data(); diffEmit(D); const T = todayOf(D); const just = goalDone(T); mileHook(D);
    let body;
    if (T.empty === 'none') body = `<p class="mj-empty">아직 듣는 과정이 없어요. 과정을 찾아볼까요?</p><a class="lbtn ghost sm" href="#courses">과정 찾기</a>`;
    else if (T.empty === 'all') body = `<p class="mj-empty">지금 익힐 개념을 모두 숙달했어요. 복습할 개념을 골라 볼까요?</p><a class="lbtn sm" href="#journey">복습할 개념 고르기</a>`;
    else body = `${T.done ? `<p class="mj-done" role="status">${I('award', 18)} 오늘 목표를 모두 해냈어요!</p>` : ''}<ol class="mj-list">${T.rows.map((k, i) => rowHTML(k, i, T.more > 0)).join('')}</ol>`;
    const n = T.rows.length, d = T.rows.filter(k => k.st === 'done').length;
    return { just, html: `<section class="mj-card${T.done ? ' is-done' : ''}" data-mj="today" aria-labelledby="mjT"><header class="mj-h"><span class="mj-ic" aria-hidden="true">${I('target', 20)}</span><div><h2 id="mjT">오늘 익힐 것</h2><small>${n ? `${n}개 중 ${d}개 숙달` : '숙달을 향해 한 걸음씩'}</small></div></header>${body}</section>` }; } /* v47 D4: 작은 성취 요약 3칸(.mj-sum)은 홈이 아니라 「내 학습 › 기록」(앱 #rec) · 웹 마이페이지로 */
  function mountHome() { const lm = document.getElementById('lm'); if (!lm || lm.querySelector('.mj-card')) return; const R = cardHTML(); const box = document.createElement('div'); box.className = 'mj-home'; box.innerHTML = R.html;
    const hero = lm.querySelector('#apScroll .ap-hero'); const hub = lm.querySelector('.lhb-home .lhb-in');
    const tut = lm.querySelector('.tb-main > .tb-now') || lm.querySelector('.tb-main > .tb-hero') || lm.querySelector('.tb-main > .tb-tut'); /* v47 D1: 튜브 홈은 「지금 할 일」 바로 아래 */ /* v46.2: 튜브 홈은 「오늘 목표」 바로 아래(첫 화면에 보이게) */ /* 통합 v46: 디디쌤 튜브 홈(ltube)은 AI 입력 줄 바로 아래 */
    if (hero) hero.insertAdjacentElement('afterend', box); else if (tut) tut.insertAdjacentElement('afterend', box); else if (hub) hub.insertAdjacentElement('afterbegin', box); else lm.insertAdjacentElement('afterbegin', box);
    { const vc = lm.querySelector('.v2-vcard'); if (vc && box.isConnected && !lm.querySelector('.tb-more-in')) box.insertAdjacentElement('afterend', vc); } /* v47 D5: 튜브 홈은 비전 카드를 「더 보기」 안에 둔다 */ /* v46.2: 「나의 비전 만들기」는 「오늘 익힐 것」 바로 아래 */
    if (R.just && typeof toast === 'function') toast('오늘 목표를 모두 해냈어요! 작은 성취 +1', 'ok'); }

  /* ── ⑩ 나의 여정(#journey) ── */
  const KI = { mastery: ['target', '개념 숙달'], submit: ['file', '제출'], reflect: ['pen', '성찰'], improve: ['up', '점수 향상'], streak: ['flame', '연속 학습'], goal: ['award', '오늘 목표'] };
  const md = d => { const [, m, dd] = String(d).split('-'); return m ? `${+m}/${+dd}` : ''; };
  function journeyHTML() { const D = data(); diffEmit(D); const V = (LR.lp && LR.lp.vision) || {}; const hasV = !!(V.at && (V.txt || (V.card && V.card.who))); const G = hasV ? (V.goals || []).slice(0, 3) : [];
    const S = M.stations(G, D.all); const P = M.pts(pol() && pol().ach); const total = D.A.reduce((s, a) => s + (a.pts || 0), 0); const mt = mileTxt();
    const cur = D.all.find(k => k.st === 'prog') || D.all.find(k => k.st === 'new'); const nx = S.find(s => !s.full);
    const dest = hasV ? `<section class="v2-vis mj-dest${S.length && S.every(s => s.full) ? ' is-lit' : ''}"><span class="v2-vis__fl" aria-hidden="true">${I('flag', 22)}</span><div><small>도착지 · 나의 비전</small><b>${E(V.txt || V.card.who)}</b></div></section>`
      : `<section class="v2-vis mj-dest is-ph"><span class="v2-vis__fl" aria-hidden="true">${I('flag', 22)}</span><div><small>도착지 · 나의 비전</small><b>비전 만들기</b></div><button type="button" class="lbtn sm pri" data-mj="vision">비전 만들기</button></section>`;
    const stn = S.map((s, i) => ({ cls: s.full ? '' : 'is-fut', ic: 'target', b: `목표 ${i + 1} · ${s.t}`, sm: s.full ? '정거장 도착' : `${s.n} / ${s.of}${s === nx ? ' · 다음 정거장' : ''}` })).reverse();
    const here = { cls: 'is-cur', ic: 'bulb', b: '지금 여기', sm: cur ? `${cur.name} · ${(ST[cur.st] || ST.new)[0]}` : '지금 여기까지 왔어요' };
    const dots = D.A.slice(0, 12).map(a => ({ cls: '', ic: (KI[a.k] || KI.goal)[0], b: a.t, sm: `${(KI[a.k] || KI.goal)[1]} · ${md(a.day)}`, pt: a.pts ? `+${a.pts}P` : '' }));
    const start = { cls: 'is-start', ic: 'flag', b: '출발', sm: D.A.length ? `작은 성취 ${D.A.length}개를 쌓았어요` : '' };
    const node = (x, k) => `<li class="mj-stop ${x.cls}" data-k="${k}"><span class="v2-node ${x.cls}" aria-hidden="true">${x.cls === 'is-fut' ? '' : I(x.cls === 'is-cur' ? 'user' : x.cls === 'is-start' ? 'flag' : 'check', 13)}</span><div class="v2-jl ${x.cls}"><span class="v2-jl__k" aria-hidden="true">${I(x.ic, 16)}</span><div><b>${E(x.b)}</b>${x.sm ? `<small>${E(x.sm)}</small>` : ''}</div>${x.pt ? `<span class="v2-jl__pt">${E(x.pt)}</span>` : ''}</div></li>`;
    const road = `<ol class="mj-road" aria-label="여정 지도 — 위가 도착지, 아래가 출발">${stn.map(x => node(x, 'stn')).join('')}${node(here, 'cur')}${dots.map(x => node(x, 'ach')).join('')}${D.A.length ? node(start, 'start') : `<li class="mj-stop is-start mj-first"><span class="v2-node is-start" aria-hidden="true">${I('flag', 13)}</span><div class="v2-jl"><div><b>첫 작은 성취를 만들어 볼까요?</b><small>오늘 익힐 것부터 시작해요</small></div><a class="lbtn sm pri" href="#home">오늘 목표 보기</a></div></li>`}</ol>`;
    const left = nx ? `<p class="mj-left">${nx.left ? `다음 정거장까지 개념 ${nx.left}개 남았어요` : '다음 정거장에 거의 다 왔어요'}</p>` : '';
    const wk = M.weekStart(D.now); const W = D.A.filter(a => a.day >= wk);
    const list = `<section class="mj-week"><h3>이번 주 작은 성취 <b>${W.length}</b></h3>${W.length ? `<ul>${W.map(a => `<li class="v2-ach"><span class="v2-ach__ico" aria-hidden="true">${I((KI[a.k] || KI.goal)[0], 15)}</span>작은 성취 +1 · ${E(a.t)}${a.pts ? `<span class="v2-jl__pt">+${a.pts}P</span>` : ''}</li>`).join('')}</ul>` : '<p class="mj-empty">이번 주는 아직 작은 성취가 없어요.</p>'}
      <p class="mj-mile">${I('coin', 15)} 마일리지 ${P && Object.values(P).some(v => v > 0) ? `작은 성취로 받은 ${total.toLocaleString('ko-KR')}P` : '작은 성취 적립은 이 기관에서 쓰지 않아요'}${mt ? ` · 지금 ${mt}` : ''}</p></section>`;
    return `<section class="sec mj-jr"><div class="in narrow"><header class="mj-jh"><h1>나의 여정</h1><p>지금 여기까지 왔어요</p></header>${dest}<div class="mj-mi"><span>${I('award', 17)} 작은 성취 <b>${D.A.length}</b></span><span>${I('target', 17)} 숙달 개념 <b>${D.all.filter(k => k.st === 'done').length} / ${D.all.length}</b></span></div>${left}${road}${list}</div></section>`; }

  /* ── 감싸기(꺼짐이면 원래 결과 그대로) ── */
  if (typeof viewPage === 'function') { const base = viewPage; viewPage = (id, ...a) => { /* eslint-disable-line no-global-assign */
    if (id !== 'journey' || !on()) return base(id, ...a); if (!LR.me) return typeof needLogin === 'function' ? needLogin('journey') : base(id, ...a);
    try { return journeyHTML(); } catch (e) { console.error('ljourney', e); return '<section class="sec"><div class="in"><p class="empty">여정 화면을 그리지 못했어요. 새로 고침해 주세요.</p></div></section>'; } }; }
  if (typeof lrender === 'function') { const base = lrender; lrender = function () { /* eslint-disable-line no-global-assign */
    const r = base.apply(this, arguments); try { if (!on() || !me() || !LR.lp) return r; const a = typeof route === 'function' ? route().a : '';
      if (a === 'home' && !document.body.classList.contains('ap-pickon')) { mountHome(); setTimeout(mountHome, 0); /* ltube가 홈을 다시 그린 뒤에도 */ }
      if (a === 'my' && !appMode()) { const lm = document.getElementById('lm'); if (lm && !lm.querySelector('.mj-sum')) { try { const t = lm.querySelector('.ap-my') || lm.querySelector('section'); if (t) t.insertAdjacentHTML('afterend', sumHTML(data())); } catch (x) { } } if (lm && !lm.querySelector('.mj-mylink')) { const t = lm.querySelector('.ap-my') || lm.querySelector('section'); const h = `<a class="mj-mylink" href="#journey">${I('map', 18)}<span><b>나의 여정</b><small>작은 성취 · 정거장 · 나의 비전</small></span>${I('arrow', 16)}</a>`; if (t) t.insertAdjacentHTML('afterend', h); else lm.insertAdjacentHTML('afterbegin', h); } }
    } catch (e) { console.error('ljourney render', e); } return r; }; }
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-mj]'); if (!el || !on() || !me()) return; const k = el.dataset.mj;
    if (k === 'swap') { e.preventDefault(); const D = data(); const T = M.swap(D.all, stKey(), +el.dataset.i, { now: D.now }); LR.lp.mtoday = { d: T.d, ids: T.ids, skip: T.skip }; save(); if (typeof lrender === 'function') lrender(); }
    if (k === 'vision') { e.preventDefault(); try { window.LV2 && LV2.openVision && LV2.openVision(); } catch (x) { } } });

  function appMode() { try { return document.body.classList.contains('lapp') && typeof window.lappOn === 'function' && !!window.lappOn(); } catch (e) { return false; } }
  window.MJ = Object.freeze({ on, data, today: () => todayOf(data()), journeyHTML, cardHTML: () => cardHTML().html, sumHTML: () => sumHTML(data()) });
})();
