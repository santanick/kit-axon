/* v46 D6 숙달 판정 · 오늘의 숙달 목표 · 작은 성취 계산(UMD, 브라우저 window.MAST · Node require 공용, 화면 없음)
   기준: SPEC 공통 규칙 1-3(숙달 판정) · 기능 4(오늘 익힐 것 선정 순서) · 기능 10(작은 성취 6종 · 하루 1회 · 마일리지 srcId)
   - 같은 입력이면 같은 결과(순수 계산). 시각은 ISO 문자열, 날짜 경계는 KST.
   - 숙달: 서로 다른 날 숙달 확인 2회 이상이 연속으로 모두 80% 이상(AI 없이 L0 · 힌트 4 · 5단계를 쓴 항목 제외). 숙달 뒤 60% 미만이면 「익히는 중」으로 되돌림(이력은 남김).
   - 미도달: 시도 0건, 또는 가장 최근 숙달 확인이 60% 미만(되돌림 직후 제외).
   - 마일리지: 기존 기관 기본 0점 · 꺼짐. 켜진 기관만 PTS_NEW(기관 조정). 작은 성취 id = 마일리지 srcId(같은 이벤트 1건). */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.MAST = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CFG = Object.freeze({ low: 60, pass: 80, need: 2, pick: 3, win: 7, reach: 0.8 });
  const PTS_NEW = Object.freeze({ mastery: 10, submit: 5, reflect: 3, improve: 5, streak: 3, goal: 5 });
  const KINDS = ['mastery', 'submit', 'reflect', 'improve', 'streak', 'goal'];
  const STREAK_AT = [3, 7, 14, 30, 60, 100];
  const H9 = 9 * 3600e3, DAY = 864e5;
  const ms = t => t == null ? NaN : typeof t === 'number' ? t : Date.parse(t);
  const day = t => { const n = ms(t); return isFinite(n) ? new Date(n + H9).toISOString().slice(0, 10) : ''; };
  const dnum = d => Math.round(Date.parse(d + 'T00:00:00Z') / DAY);
  const cfgOf = o => Object.assign({}, CFG, o || {});
  const byAt = (a, b) => (ms(a.at) || 0) - (ms(b.at) || 0) || String(a.kind).localeCompare(String(b.kind));

  /* ── 개념 하나 판정. ev: [{ at, kind:'check'|'attempt'|'ov', score?, lvl?, ex?, st? }] ── */
  function judge(ev, opt) {
    const o = cfgOf(opt); const E = (Array.isArray(ev) ? ev : []).filter(e => e && isFinite(ms(e.at))).slice().sort(byAt);
    let mastered = false, reg = false, tries = 0, last = null, at = '', run = new Set(); const hist = []; let lastAct = '';
    for (const e of E) {
      if (!lastAct || ms(e.at) > ms(lastAct)) lastAct = e.at;
      if (e.kind === 'ov') { const st = ['new', 'prog', 'done'].includes(e.st) ? e.st : 'prog'; const was = mastered; mastered = st === 'done'; reg = was && !mastered; run = new Set(); if (mastered) at = e.at; hist.push({ st, at: e.at, by: 'staff' }); if (st !== 'new') tries = Math.max(tries, 1); continue; }
      tries++;
      if (e.kind !== 'check' || e.ex || (e.lvl && e.lvl !== 'L0') || !isFinite(+e.score)) continue; /* 증거가 아닌 시도: 익히는 중 근거로만 */
      const s = +e.score; last = s;
      if (s >= o.pass) { run.add(day(e.at)); if (!mastered && run.size >= o.need) { mastered = true; reg = false; at = e.at; hist.push({ st: 'done', at: e.at }); } }
      else { run = new Set(); if (s < o.low) { if (mastered) { mastered = false; reg = true; hist.push({ st: 'prog', at: e.at, back: true }); } else reg = false; } }
    }
    const st = mastered ? 'done' : !tries ? 'new' : last != null && last < o.low && !reg ? 'new' : 'prog';
    return { st, tries, last, at: mastered ? at : '', reg: !mastered && reg, run: run.size, need: o.need, lastAct, hist };
  }

  /* ── 과정 하나의 개념 목록 + 개념별 증거 ──
     c: 게시본 강좌 { id, items:[{ id, type, title, week, due, qs, loop, cpt, concepts, ai }], concepts?, loop? }
     rec: lp.cls[c.id] = { items:{ [iid]:{ tries:[{at,score}], subs:[{at}], done } }, refl:{ [wk]:{ s, r, at } } }
     hint: lp.hint({ '<cid>/<iid>': { step, tries:[{at}] } }), ov: { [kid]: { st, at } } 교수자 판정 */
  function conceptsOf(c) {
    if (!c) return []; if (Array.isArray(c.concepts) && c.concepts.length) return c.concepts.map(k => ({ id: String(k.id), name: String(k.name || ''), wk: +k.wk || 0 }));
    const W = new Map(); (c.items || []).forEach(it => { const w = +it.week || 0; if (!w) return; if (!W.has(w)) W.set(w, ''); const t = String(it.title || ''); if (it.type === 'chapter' && t) W.set(w, t); else if (!W.get(w) && it.type === 'video' && t) W.set(w, '\u0001' + (t.includes(': ') ? t.split(': ').slice(1).join(': ') : t)); });
    return [...W.keys()].sort((a, b) => a - b).map(w => ({ id: 'w' + w, name: String(W.get(w) || '').replace(/^\u0001/, '') || `${w}주차`, wk: w }));
  }
  function course(c, rec, hint, opt) {
    const o = cfgOf(opt); const K = conceptsOf(c); if (!K.length) return [];
    const R = rec || {}; const RI = R.items || {}; const H = hint || {}; const now = ms(o.now != null ? o.now : Date.now()); const items = (c.items || []).filter(it => it && it.type !== 'chapter');
    const hasLoop = items.some(it => it.loop === 'check') || (Array.isArray(c.loop) && c.loop.length);
    const kOf = it => { const L = Array.isArray(it.concepts) && it.concepts.length ? it.concepts.map(String) : it.cpt ? [String(it.cpt)] : []; return L.length ? L.filter(id => K.some(k => k.id === id)) : K.filter(k => k.wk === +it.week).map(k => k.id); };
    const isCheck = it => it.loop === 'check' || (!hasLoop && it.type === 'quiz');
    const M = new Map(K.map(k => [k.id, { k, ev: [], items: [], due: Infinity, check: null }]));
    items.forEach(it => { const ids = kOf(it); if (!ids.length) return; const r = RI[it.id] || {}; const hs = H[`${c.id}/${it.id}`] || {}; const ex = (+hs.step || 0) >= 4; const chk = isCheck(it); const lvl = chk ? ((it.ai && it.ai.lvl) || 'L0') : ((it.ai && it.ai.lvl) || 'L1');
      const ev = []; (r.tries || []).forEach(t => ev.push({ at: t.at, kind: chk ? 'check' : 'attempt', score: t.score, lvl, ex }));
      if (!(r.tries || []).length && r.score != null && chk && r.at) ev.push({ at: r.at, kind: 'check', score: r.score, lvl, ex });
      (r.subs || []).forEach(s => ev.push({ at: s.at, kind: 'attempt' })); (hs.tries || []).forEach(t => t && t.at && ev.push({ at: t.at, kind: 'attempt' }));
      const dueN = ms(it.due); const open = !r.done && !(r.subs || []).length && !(r.tries || []).length;
      ids.forEach(id => { const m = M.get(id); m.ev.push(...ev); m.items.push(it); if (chk && !m.check) m.check = it; if (open && isFinite(dueN) && dueN >= now - DAY && dueN <= now + o.win * DAY) m.due = Math.min(m.due, dueN); }); });
    Object.keys(R.refl || {}).forEach(w => { const x = R.refl[w] || {}; if (!x.at) return; K.filter(k => k.wk === +w).forEach(k => { if (x.s) M.get(k.id).ev.push({ at: x.at, kind: 'attempt' }); }); });
    const OV = o.ov || {}; Object.keys(OV).forEach(id => { const m = M.get(id); if (m && OV[id] && OV[id].at) m.ev.push({ at: OV[id].at, kind: 'ov', st: OV[id].st }); });
    return K.map(k => { const m = M.get(k.id); const j = judge(m.ev, o); const nx = m.items.find(it => { const r = RI[it.id] || {}; return !r.done && !(r.subs || []).length && !(r.tries || []).length; }) || m.check || m.items[0] || null;
      return { cid: c.id, cname: c.name || c.title || '', id: k.id, name: k.name, wk: k.wk, st: j.st, reg: j.reg, run: j.run, need: j.need, last: j.last, tries: j.tries, at: j.at, lastAct: j.lastAct, hist: j.hist,
        due: isFinite(m.due) ? new Date(m.due).toISOString() : '', check: m.check ? { id: m.check.id, title: m.check.title || '', n: (m.check.qs || []).length } : null, next: nx ? { id: nx.id, title: nx.title || '', type: nx.type } : null }; });
  }

  /* ── 오늘 익힐 것(기능 4 선정 순서): ① 마감 7일 이내 ② 익히는 중 + 최근 7일 활동 ③ 재확인에서 되돌아간 개념 ④ 다음 차시의 첫 개념(이어서) ── */
  function rank(list, opt) {
    const o = cfgOf(opt); const now = ms(o.now != null ? o.now : Date.now()); const L = (list || []).filter(x => x && x.st !== 'done'); const out = []; const seen = new Set();
    const add = (x, why) => { const key = x.cid + '/' + x.id; if (seen.has(key)) return; seen.add(key); out.push(Object.assign({}, x, { why })); };
    L.filter(x => x.due).sort((a, b) => ms(a.due) - ms(b.due)).forEach(x => add(x, 'due'));
    L.filter(x => x.st === 'prog' && !x.reg && x.lastAct && now - ms(x.lastAct) <= o.win * DAY).sort((a, b) => ms(b.lastAct) - ms(a.lastAct)).forEach(x => add(x, 'prog'));
    L.filter(x => x.reg).forEach(x => add(x, 'reg'));
    const ord = []; const C = [...new Set(L.map(x => x.cid))]; C.forEach(cid => L.filter(x => x.cid === cid).sort((a, b) => a.wk - b.wk).forEach(x => ord.push(x)));
    /* 과정마다 다음 차시 첫 개념을 먼저, 그다음 차례대로 */
    C.forEach(cid => { const f = ord.find(x => x.cid === cid && !seen.has(x.cid + '/' + x.id)); if (f) add(f, 'next'); }); ord.forEach(x => add(x, 'next'));
    return out;
  }
  /* 하루 단위 목록: state = { d, ids:[cid/kid], skip:[...] } → 같은 날이면 유지(숙달된 것도 그대로 둬서 완료 표시), 날이 바뀌면 새로 고름 */
  function today(list, state, opt) {
    const o = cfgOf(opt); const d = day(o.now != null ? o.now : Date.now()); const S = state && state.d === d ? state : { d, ids: [], skip: [] }; const key = x => x.cid + '/' + x.id;
    const all = new Map((list || []).map(x => [key(x), x])); const R = rank(list, o).filter(x => !(S.skip || []).includes(key(x)));
    let ids = (S.ids || []).filter(k => all.has(k)); if (!ids.length) ids = R.slice(0, o.pick).map(key);
    const rows = ids.map(k => all.get(k)); const done = rows.length > 0 && rows.every(x => x.st === 'done');
    return { d, ids, skip: (S.skip || []).slice(), rows, done, more: R.filter(x => !ids.includes(key(x))).length, empty: !rows.length ? ((list || []).length ? 'all' : 'none') : '' };
  }
  /* 「다른 개념으로」 한 줄 바꾸기 */
  function swap(list, state, i, opt) { const o = cfgOf(opt); const T = today(list, state, o); const key = x => x.cid + '/' + x.id; const old = T.ids[i]; if (!old) return T;
    const R = rank(list, o).map(key).filter(k => !T.ids.includes(k) && !T.skip.includes(k)); if (!R.length) return T; const ids = T.ids.slice(); ids[i] = R[0]; return today(list, { d: T.d, ids, skip: [...T.skip, old] }, o); }

  /* ── 작은 성취 6종(별도 저장 없이 기록에서 계산) · 하루 1회(같은 항목 · 같은 종류) ──
     inp = { courses:[{ c, rec, cpts:[course() 결과] }], goals:['YYYY-MM-DD'], pts?:{...} } → [{ id(srcId), k, obj, at, day, t, pts }] 최신순 */
  function ach(inp, opt) {
    const P = pts(opt && opt.pol); const A = new Map(); const put = (k, obj, at, t) => { const d = day(at); if (!d) return; const id = `${k}:${obj}:${d}`; if (A.has(id)) return; A.set(id, { id, k, obj, at, day: d, t, pts: P[k] || 0 }); };
    const days = new Set();
    ((inp && inp.courses) || []).forEach(({ c, rec, cpts }) => { if (!c) return; const RI = (rec && rec.items) || {}; const items = c.items || [];
      (cpts || []).forEach(k => (k.hist || []).forEach(h => { if (h.st === 'done') put('mastery', `${c.id}/${k.id}`, h.at, `개념 숙달: ${k.name}`); }));
      items.forEach(it => { const r = RI[it.id]; if (!r) return; const nm = it.title || '';
        (r.subs || []).forEach((s, i) => { if (!s || !s.at) return; days.add(day(s.at)); put(i ? 'submit' : 'submit', `${c.id}/${it.id}`, s.at, `과제 제출: ${nm}`); });
        let best = null; (r.tries || []).slice().sort(byAt).forEach(t => { if (!t || !t.at) return; days.add(day(t.at)); const s = +t.score; if (best != null && isFinite(s) && s > best) put('improve', `${c.id}/${it.id}`, t.at, `점수 향상: ${nm}`); if (isFinite(s)) best = best == null ? s : Math.max(best, s); }); });
      Object.keys((rec && rec.refl) || {}).forEach(w => { const x = rec.refl[w] || {}; if (x.at) { days.add(day(x.at)); if (x.r) put('reflect', `${c.id}/w${w}`, x.at, `성찰 작성: ${w}주차`); } }); });
    ((inp && inp.days) || []).forEach(d => d && days.add(String(d).slice(0, 10)));
    ((inp && inp.goals) || []).forEach(d => { if (d) { days.add(String(d).slice(0, 10)); put('goal', 'today', String(d).slice(0, 10) + 'T03:00:00.000Z', '오늘 목표 완료'); } });
    const D = [...days].filter(Boolean).sort(); let run = 0, prev = null; D.forEach(d => { const n = dnum(d); run = prev != null && n === prev + 1 ? run + 1 : 1; prev = n; if (STREAK_AT.includes(run)) put('streak', `run${run}`, d + 'T03:00:00.000Z', `연속 학습 ${run}일`); });
    return [...A.values()].sort((a, b) => ms(b.at) - ms(a.at) || a.id.localeCompare(b.id));
  }
  /* 지금 이어지는 연속 학습 일수(오늘 또는 어제까지) */
  function streak(dayList, now) { const S = new Set((dayList || []).map(d => String(d).slice(0, 10))); let d = dnum(day(now != null ? now : Date.now())); if (!S.has(iso(d))) d--; let n = 0; while (S.has(iso(d))) { n++; d--; } return n; }
  const iso = n => new Date(n * DAY).toISOString().slice(0, 10);
  const weekStart = now => { const d = dnum(day(now != null ? now : Date.now())); const w = new Date(d * DAY).getUTCDay(); return iso(d - ((w + 6) % 7)); };
  /* 마일리지 점수: 정책이 켜진 기관만(기본 0점 · 꺼짐) */
  function pts(pol) { const o = {}; KINDS.forEach(k => { o[k] = 0; }); if (!pol || pol.on !== true) return o; const p = pol.pts || {}; KINDS.forEach(k => { const v = p[k] != null ? +p[k] : PTS_NEW[k]; o[k] = isFinite(v) && v > 0 ? Math.round(v) : 0; }); return o; }
  /* 마일리지 엔진(milecalc · 서버 hook)에 넘길 이벤트 — srcId = 작은 성취 id(이중 집계 방지), 0점 · 꺼짐이면 빈 배열 */
  function mileEvents(list, pol) { const P = pts(pol); return (list || []).filter(a => P[a.k] > 0).map(a => ({ trigger: 'v2_' + a.k, srcType: 'ach', srcId: a.id, value: P[a.k], at: a.at })); }
  /* 여정 정거장: goals[i].cpts(개념 id) 우선, 없으면 개념을 목표 수로 나눠 차례대로 연결 */
  function stations(goals, cpts) { const G = (goals || []).slice(0, 3); const K = cpts || []; if (!G.length) return [];
    const per = Math.ceil(K.length / G.length) || 0; return G.map((g, i) => { const ids = Array.isArray(g.cpts) && g.cpts.length ? g.cpts.map(String) : K.slice(i * per, (i + 1) * per).map(k => k.cid + '/' + k.id);
      const L = K.filter(k => ids.includes(k.cid + '/' + k.id) || ids.includes(k.id)); const n = L.filter(k => k.st === 'done').length; const full = !!g.done || (L.length > 0 && n === L.length);
      return { t: g.t || '', n, of: L.length, left: full ? 0 : L.length - n, full, pct: full ? 100 : L.length ? Math.round(n / L.length * 100) : 0 }; }); }
  /* 숙달 도달(과정 개념의 80% 이상) */
  function reached(cpts, opt) { const o = cfgOf(opt); const L = cpts || []; return L.length > 0 && L.filter(k => k.st === 'done').length / L.length >= o.reach; }

  return { CFG, PTS_NEW, KINDS, judge, conceptsOf, course, rank, today, swap, ach, streak, weekStart, pts, mileEvents, stations, reached, day };
});
