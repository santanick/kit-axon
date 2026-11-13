/* v42 학습 마일리지 데모 엔진(UMD, 브라우저 · Node 공용). 서버 SQL 함수(service/server/mileage/sql/15_mileage_fn.sql mil_*)와 같은 규칙.
   - 데모 모드(S.mile)에서 같은 규칙을 돌리고, tests/mileage-vectors.json으로 SQL 엔진과 결과가 같은지 확인한다(service/test/mileage42.test.js).
   - 원장 줄은 지우지 않는다(반대 줄). 하루 · 주 · 월 경계는 KST, 주는 월요일 시작, 학기는 3~8월 · 9~2월.
   - 실패는 예외 대신 {error:'<code>'}를 돌려준다. 시각 at은 ISO 문자열 또는 ms. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.MileCalc = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const H9 = 9 * 3600e3, DAY = 864e5;
  const ms = t => t == null ? Date.now() : typeof t === 'number' ? t : Date.parse(t);
  const kst = t => new Date(ms(t) + H9).toISOString().slice(0, 10);
  const dParse = d => Date.parse(d + 'T00:00:00Z');
  const dStr = n => new Date(n).toISOString().slice(0, 10);
  const addDays = (d, n) => dStr(dParse(d) + n * DAY);
  function addMonths(d, n) { const [y, m, dd] = d.split('-').map(Number); const t = y * 12 + (m - 1) + n; const Y = Math.floor(t / 12), M = t % 12; const last = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
    return dStr(Date.UTC(Y, M, Math.min(dd, last))); }
  const kstMidnight = d => dParse(d) - H9; /* KST 0시(ms) */
  const trank = t => t === 'A' ? 1 : t === 'B' ? 2 : 3;
  const weekStart = d => { const w = new Date(dParse(d)).getUTCDay(); return addDays(d, -((w + 6) % 7)); };
  function termStart(d) { const y = +d.slice(0, 4), m = +d.slice(5, 7); return m >= 3 && m <= 8 ? `${y}-03-01` : m >= 9 ? `${y}-09-01` : `${y - 1}-09-01`; }
  function winStart(w, d) { return w === 'day' ? d : w === 'week' ? weekStart(d) : w === 'month' ? d.slice(0, 8) + '01' : w === 'term' ? termStart(d) : w === 'year' ? d.slice(0, 5) + '01-01' : '1900-01-01'; }
  function expAt(pol, rule, posted) { const e = rule || pol || { mode: 'none' }; const d = kst(posted);
    if ((e.mode === 'months' || e.mode === 'item') && +e.months > 0) return kstMidnight(addDays(addMonths(d, +e.months), 1));
    if (e.mode === 'term_end' && e.termEnd) return kstMidnight(addDays(e.termEnd, 1)); return null; }
  const LOT = ['earn', 'restore', 'adjust'];
  const DEFAULT_POLICY = { on: false, ver: 0, unitName: 'P', expiry: { mode: 'months', months: 12 }, notice: { monthsBefore: 6, daysBefore: [30, 3] }, budget: {}, dailyCapTotal: null,
    streak: { minMin: 10, freezePerWeek: 1, milestones: [7, 30, 100] }, cashLock: { needTrust: 'B', achievementOnly: true }, sunset: null, penalty: { on: false }, grantCfg: { approveOver: 1000 }, scope: { mode: 'unit', hqPool: false } };

  function create(init) {
    const S = Object.assign({ entries: [], lotuse: [], events: [], redeems: [], flags: [], notices: [], wallets: {}, rules: [], groups: [], rewards: [], funded: {}, charges: [], allocs: [] }, init || {});
    S.policy = S.policy ? Object.assign({}, DEFAULT_POLICY, S.policy) : null;
    let seq = 0; const rid = p => p + (++seq).toString(36).padStart(12, '0').slice(-12);
    const E = id => S.entries.find(e => e.id === id);
    const rem = lot => { const e = E(lot); return e.points - S.lotuse.filter(u => u.lot === lot).reduce((s, u) => s + u.points, 0); };
    const cashOk = cls => !S.funded[cls];
    const lotsOf = (sid, unit) => S.entries.filter(e => e.sid === sid && e.unit === unit && e.status === 'posted' && e.points > 0 && LOT.includes(e.kind))
      .sort((a, b) => (a.expiresAt == null) - (b.expiresAt == null) || (a.expiresAt || 0) - (b.expiresAt || 0) || a.at - b.at || (a.id < b.id ? -1 : 1));
    function take(sid, unit, entry, amount, cash, only) { let left = amount; if (left <= 0) return 0;
      for (const l of lotsOf(sid, unit)) { if ((cash && !l.convertible) || (only && l.id !== only)) continue; const r = rem(l.id); if (r <= 0) continue; const x = Math.min(r, left);
        S.lotuse.push({ entry, lot: l.id, points: x }); left -= x; if (!left) break; }
      return amount - left; }
    function settle(sid, unit) { S.entries.filter(e => e.sid === sid && e.unit === unit && e.status === 'posted' && e.points < 0 && ['cancel', 'penalty', 'adjust'].includes(e.kind)).sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1))
      .forEach(d => { const resid = -d.points - S.lotuse.filter(u => u.entry === d.id).reduce((s, u) => s + u.points, 0); if (resid > 0) take(sid, unit, d.id, resid, false); }); }
    function sync(sid, unit, at) { unit = unit || 'lu_root'; const mine = S.entries.filter(e => e.sid === sid && e.unit === unit); const t = ms(at);
      const bal = mine.filter(e => e.status === 'posted').reduce((s, e) => s + e.points, 0);
      const pen = mine.filter(e => e.status === 'pending' && ['earn', 'adjust'].includes(e.kind) && e.points > 0).reduce((s, e) => s + e.points, 0);
      const t12 = Date.parse(addMonths(new Date(t).toISOString().slice(0, 10), -12) + new Date(t).toISOString().slice(10));
      const win = mine.filter(e => e.status === 'posted' && e.kind === 'earn' && e.at > t12).reduce((s, e) => s + e.points, 0);
      const lots = lotsOf(sid, unit).map(l => ({ l, r: rem(l.id) })); let conv = lots.filter(x => x.l.convertible && x.r > 0).reduce((s, x) => s + x.r, 0);
      if (bal < 0) conv = 0; conv = Math.min(conv, Math.max(bal, 0));
      const g = new Map(); lots.filter(x => x.r > 0 && x.l.expiresAt != null).forEach(x => g.set(x.l.expiresAt, (g.get(x.l.expiresAt) || 0) + x.r));
      const next = [...g.entries()].sort((a, b) => a[0] - b[0]).slice(0, 3).map(([k, p]) => ({ at: new Date(k).toISOString(), points: p }));
      const w = S.wallets[sid + '|' + unit] = Object.assign(S.wallets[sid + '|' + unit] || { streak: {} }, { balance: bal, pending: pen, convertible: conv, earnedWindow: win, nextExpire: next });
      return { balance: w.balance, pending: w.pending, convertible: w.convertible, earnedWindow: w.earnedWindow, nextExpire: w.nextExpire }; }
    const ensureW = (sid, unit) => { const k = sid + '|' + unit; if (!S.wallets[k]) S.wallets[k] = { balance: 0, pending: 0, convertible: 0, earnedWindow: 0, nextExpire: [], streak: {} }; return S.wallets[k]; };
    const push = e => { S.entries.push(Object.assign({ status: 'posted', nature: 'achievement', trust: 'B', convertible: false, funded: false, unit: 'lu_root' }, e)); return e.id; };
    const latestRules = trig => { const by = new Map(); S.rules.filter(r => r.trigger === trig).forEach(r => { const c = by.get(r.id); if (!c || (r.ver || 1) > (c.ver || 1)) by.set(r.id, r); }); return [...by.values()].sort((a, b) => a.id < b.id ? -1 : 1); };
    const sumE = f => S.entries.filter(f).reduce((s, e) => s + e.points, 0);

    function streakCalc(sid, day, freeze) { const days = new Set(S.events.filter(e => e.sid === sid && e.trigger === 'attend_day' && kst(e.at) <= day).map(e => kst(e.at))); if (!days.size) return 0;
      const lo = [...days].sort()[0]; let d = day, n = 0; const used = {};
      for (let i = 0; i <= 800; i++) { if (d < lo) break; if (days.has(d)) n++; else { const wk = weekStart(d); if ((used[wk] || 0) < freeze) used[wk] = (used[wk] || 0) + 1; else break; } d = addDays(d, -1); }
      return n; }

    function emit(a) { const sid = a.sid, trig = a.trigger, at = ms(a.at), unit = a.unit || 'lu_root', trust = a.trust || 'B', value = a.value == null ? null : +a.value, day = kst(at);
      const srcType = String(a.srcType), srcId = String(a.srcId);
      if (S.events.some(e => e.trigger === trig && e.srcType === srcType && e.srcId === srcId && e.sid === sid)) return { status: 'already', reason: 'event' };
      const ev = { id: S.events.length + 1, sid, trigger: trig, srcType, srcId, value, trust, cls: a.cls || null, unit, at, status: 'new' }; S.events.push(ev);
      const pol = S.policy; let reason = null;
      if (!pol || !pol.on) reason = 'off'; else if (pol.sunset && pol.sunset.stopEarnAt && ms(pol.sunset.stopEarnAt) <= at) reason = 'sunset';
      if (reason) { ev.status = 'skipped'; return { status: 'skipped', reason, entries: [] }; }
      ensureW(sid, unit); const funded = !!a.cls && !cashOk(a.cls); const out = []; let any = false, first = null;
      for (const r of latestRules(trig)) {
        if (r.active === false || (r.startsOn && day < r.startsOn) || (r.endsOn && day > r.endsOn)) continue; any = true; reason = null; const cond = r.cond || {}, score = r.score || { mode: 'fixed', v: 0 }, caps = r.caps || {};
        if (trank(trust) > trank(r.trustMin || 'C')) reason = 'trust';
        else if (cond.cls != null && cond.cls !== '*' && (!a.cls || !(Array.isArray(cond.cls) ? cond.cls.includes(a.cls) : cond.cls === a.cls))) reason = 'cond';
        else if (cond.minScore != null && (value || 0) < +cond.minScore) reason = 'cond';
        else if (cond.minMin != null && (value || 0) < +cond.minMin) reason = 'cond';
        else if (cond.maxScore != null && (value || 0) > +cond.maxScore) reason = 'cond';
        else if (cond.target != null && (value || 0) < +cond.target) reason = 'cond';
        else if (cond.srcType != null && srcType !== String(cond.srcType)) reason = 'cond';
        else if (cond.dueBy != null && day > String(cond.dueBy)) reason = 'cond';
        else if (cond.improve != null) { const base = srcId.split('#')[0]; const prev = S.events.filter(e => e !== ev && e.sid === sid && e.trigger === trig && e.srcType === srcType && e.srcId.split('#')[0] === base && e.value != null);
          if (!prev.length || (value || 0) - Math.max(...prev.map(e => e.value)) < +cond.improve) reason = 'cond'; }
        let pts = 0, band = null;
        if (!reason) { const v = value || 0;
          if (score.mode === 'band') { const bs = (score.bands || []).map((b, i) => ({ min: +b[0], p: +b[1], i: i + 1 })).filter(b => v >= b.min).sort((x, y) => y.min - x.min); if (bs.length) { pts = bs[0].p; band = bs[0].i; } }
          else if (score.mode === 'per_unit') pts = Math.floor(v / Math.max(+score.unit || 1, 1)) * (+score.v || 0);
          else if (score.mode === 'source') pts = Math.round(v); else pts = +score.v || 0;
          if (!(pts > 0)) reason = 'cond'; }
        let idem = null;
        if (!reason) { const once = r.once || 'per_src';
          idem = `e:${r.id}:${sid}` + (once === 'ever' ? '' : once === 'per_day' ? `:d:${day}` : once === 'none' ? `:ev:${ev.id}` : `:${srcType}:${srcId}`);
          if (band != null) { idem = `e:${r.id}:${sid}:${srcType}:${srcId.split('#')[0]}`; pts -= sumE(e => e.kind === 'earn' && e.status !== 'void' && e.idemKey && e.idemKey.startsWith(idem + ':b')); idem += ':b' + band; if (pts <= 0) reason = 'already'; }
          if (!reason && S.entries.some(e => e.idemKey === idem)) reason = 'already'; }
        if (!reason) for (const w of ['day', 'week', 'month', 'term', 'year', 'total']) { if (caps[w] == null) continue; const ws = winStart(w, day);
          const used = sumE(e => e.sid === sid && e.ruleId === r.id && e.kind === 'earn' && e.status !== 'void' && kst(e.at) >= ws);
          if (+caps[w] - used < pts) { pts = Math.max(+caps[w] - used, 0); if (!pts) { reason = 'cap_' + w; break; } } }
        if (!reason && r.groupKey) { const g = S.groups.find(x => x.key === r.groupKey); const ids = new Set(S.rules.filter(x => x.groupKey === r.groupKey).map(x => x.id));
          if (g) for (const w of ['term', 'year']) { if (!g.caps || g.caps[w] == null) continue; const ws = winStart(w, day);
            const used = sumE(e => e.sid === sid && e.kind === 'earn' && e.status !== 'void' && kst(e.at) >= ws && ids.has(e.ruleId));
            if (+g.caps[w] - used < pts) { pts = Math.max(+g.caps[w] - used, 0); if (!pts) { reason = 'group_cap'; break; } } } }
        if (!reason && pol.dailyCapTotal != null) { const used = sumE(e => e.sid === sid && e.kind === 'earn' && e.status !== 'void' && kst(e.at) === day);
          if (pol.dailyCapTotal - used < pts) { pts = Math.max(pol.dailyCapTotal - used, 0); if (!pts) reason = 'day_cap'; } }
        if (reason) { first = first || reason; out.push({ ruleId: r.id, skipped: reason }); continue; }
        const cl = pol.cashLock || {}; let conv = (r.nature === 'achievement' || cl.achievementOnly === false) && trank(trust) <= trank(cl.needTrust || 'B') && !funded;
        if (conv && pol.budget && pol.budget.monthP != null) { const ms0 = day.slice(0, 8) + '01'; if (sumE(e => e.kind === 'earn' && e.convertible && e.status !== 'void' && kst(e.at) >= ms0) + pts > +pol.budget.monthP) conv = false; }
        let st = r.approval === 'auto' || !r.approval ? 'posted' : r.approval === 'over' ? (pts > (r.approveOver || 0) ? 'pending' : 'posted') : 'pending';
        if (st === 'posted' && S.entries.filter(e => e.sid === sid && e.kind === 'earn' && e.at > at - 3600e3).length >= 30) { st = 'pending'; S.flags.push({ id: rid('mfl_'), sid, kind: 'velocity', evidence: { event: ev.id }, status: 'open' }); }
        const id = rid('me_');
        push({ id, sid, unit, kind: 'earn', points: pts, status: st, nature: r.nature, trust, convertible: conv, funded, cls: a.cls || null, trigger: trig, ruleId: r.id, ruleVer: r.ver || 1, eventId: ev.id,
          expiresAt: st === 'posted' ? expAt(pol.expiry, r.expiry, at) : null, idemKey: idem, at, postedAt: st === 'posted' ? at : null });
        if (st === 'posted') settle(sid, unit);
        out.push({ id, ruleId: r.id, points: pts, status: st, convertible: conv, funded });
      }
      const got = out.filter(x => x.id); ev.status = got.length ? 'done' : 'skipped'; ev.result = out;
      const res = { status: got.length ? 'done' : 'skipped', entries: got }; if (!got.length) res.reason = any ? first : 'no_rule';
      if (trig === 'attend_day') { const n = streakCalc(sid, day, (pol.streak && pol.streak.freezePerWeek != null) ? +pol.streak.freezePerWeek : 1); S.wallets[sid + '|' + unit].streak = { n, last: day };
        for (const m of (pol.streak && pol.streak.milestones) || []) if (n >= +m) emit({ sid, trigger: 'streak', srcType: 'streak', srcId: String(m), value: n, trust, at, unit }); }
      res.wallet = sync(sid, unit, at); return res; }

    function post(id, at) { const e = E(id); if (!e) return { error: 'not_found' }; if (e.status !== 'pending') return { error: 'state' }; at = ms(at);
      const r = S.rules.find(x => x.id === e.ruleId && (x.ver || 1) === e.ruleVer); e.status = 'posted'; e.postedAt = at; e.expiresAt = ['earn', 'adjust'].includes(e.kind) ? expAt(S.policy.expiry, r && r.expiry, at) : null;
      settle(e.sid, e.unit); return { ok: true, entryId: id, wallet: sync(e.sid, e.unit, at) }; }
    function voidE(id, at) { const e = E(id); if (!e) return { error: 'not_found' }; if (e.status !== 'pending') return { error: 'state' }; e.status = 'void'; return { ok: true, wallet: sync(e.sid, e.unit, at) }; }
    function cancel(id, reason, staff, at) { const e = E(id); if (!e || e.points <= 0 || !LOT.includes(e.kind)) return { error: 'not_found' }; if (!String(reason || '').trim()) return { error: 'reason' }; at = ms(at);
      if (e.status === 'pending') return voidE(id, at); if (e.status === 'void' || S.entries.some(x => x.idemKey === 'c:' + id)) return { error: 'already' };
      const nid = rid('me_'); push({ id: nid, sid: e.sid, unit: e.unit, kind: 'cancel', points: -e.points, nature: e.nature, trust: e.trust, cls: e.cls, trigger: e.trigger, ruleId: e.ruleId, refEntry: id, reason, byStaff: staff, idemKey: 'c:' + id, at, postedAt: at });
      take(e.sid, e.unit, nid, rem(id), false, id); settle(e.sid, e.unit); return { ok: true, entryId: nid, wallet: sync(e.sid, e.unit, at) }; }
    function expire(at, sid) { at = ms(at); let n = 0; const touched = new Set();
      S.entries.filter(e => e.status === 'posted' && e.points > 0 && LOT.includes(e.kind) && e.expiresAt != null && e.expiresAt <= at && (!sid || e.sid === sid)).sort((a, b) => a.sid < b.sid ? -1 : a.sid > b.sid ? 1 : a.expiresAt - b.expiresAt || (a.id < b.id ? -1 : 1))
        .forEach(l => { const r = rem(l.id); if (r <= 0) return; const k = S.entries.filter(x => x.kind === 'expire' && x.refEntry === l.id).length; const id = rid('me_');
          push({ id, sid: l.sid, unit: l.unit, kind: 'expire', points: -r, nature: l.nature, trust: l.trust, refEntry: l.id, reason: '유효기간 만료', idemKey: 'x:' + l.id + (k ? ':' + (k + 1) : ''), at, postedAt: at });
          S.lotuse.push({ entry: id, lot: l.id, points: r }); n++; touched.add(l.sid + '|' + l.unit); });
      touched.forEach(k => { const [s, u] = k.split('|'); sync(s, u, at); }); return n; }
    function grant(a) { const at = ms(a.at), unit = a.unit || 'lu_root', idem = `m:${a.staff}:${a.idem}`; let p = Math.round(+a.points); const pol = S.policy;
      if (a.self) return { error: 'self_grant' }; if (!String(a.reason || '').trim()) return { error: 'reason' }; if (!p || Math.abs(p) > 1e6) return { error: 'points' };
      const ex = S.entries.find(e => e.idemKey === idem); if (ex) return { ok: true, again: true, entryId: ex.id, status: ex.status };
      if (!pol || !pol.on) return { error: 'mile_off' };
      if (a.penalty) { const pe = pol.penalty || {}; if (!pe.on) return { error: 'penalty_off' }; if (p > 0) p = -p; if (pe.maxOnce != null && -p > +pe.maxOnce) return { error: 'over_cap' };
        if (pe.dayCap != null && -sumE(e => e.sid === a.sid && e.kind === 'penalty' && kst(e.at) === kst(at)) - p > +pe.dayCap) return { error: 'over_cap' }; }
      const gc = pol.grantCfg || {};
      if (p > 0 && gc.staffMonthCap != null) { const m0 = kst(at).slice(0, 8) + '01'; if (sumE(e => e.byStaff === a.staff && e.kind === 'adjust' && e.points > 0 && e.status !== 'void' && kst(e.at) >= m0) + p > +gc.staffMonthCap) return { error: 'staff_cap' }; }
      const st = p > 0 && !a.owner && p > (gc.approveOver != null ? +gc.approveOver : 1000) ? 'pending' : 'posted'; ensureW(a.sid, unit); const id = rid('me_');
      push({ id, sid: a.sid, unit, kind: a.penalty ? 'penalty' : 'adjust', points: p, status: st, convertible: p > 0, trigger: a.penalty ? 'penalty' : 'manual', reason: a.reason, byStaff: a.staff, idemKey: idem,
        expiresAt: st === 'posted' && p > 0 ? expAt(pol.expiry, null, at) : null, at, postedAt: st === 'posted' ? at : null });
      if (st === 'posted') settle(a.sid, unit); return { ok: true, entryId: id, status: st, wallet: sync(a.sid, unit, at) }; }

    function redeemReq(a) { const at = ms(a.at), sid = a.sid, p = a.points == null ? null : Math.round(+a.points); const pol = S.policy; if (!pol || !pol.on) return { error: 'mile_off' };
      const ik = a.idem != null ? `r:${sid}:${a.idem}` : null; const ex = ik && S.redeems.find(d => d.idemKey === ik); if (ex) return { ok: true, again: true, id: ex.id, status: ex.status, points: ex.points, won: ex.won };
      const rw = S.rewards.find(x => x.id === a.reward); if (!rw || rw.active === false) return { error: 'not_found' };
      if (pol.sunset && pol.sunset.endAt && ms(pol.sunset.endAt) <= at) return { error: 'sunset' };
      const cash = rw.cash !== false, unit = (rw.link && rw.link.unitId) || 'lu_root', cost = rw.cost || {}, mx = rw.maxUse || {}, per = rw.perSid || {};
      if (cash && rw.audience && Array.isArray(rw.audience.cls) && rw.audience.cls.some(c => !cashOk(c))) return { error: 'funded_blocked' };
      ensureW(sid, unit); const w = sync(sid, unit, at); if (w.balance < 0) return { error: 'negative_balance' };
      if (!(p > 0) || p < (rw.minUse || 0) || ((rw.step || 1) > 1 && p % rw.step) || (cost.fixedP != null && p !== +cost.fixedP) || (mx.once != null && p > +mx.once)) return { error: 'bad_points' };
      const m0 = kst(at).slice(0, 8) + '01'; const live = d => !['rejected', 'cancelled'].includes(d.status);
      if (mx.month != null && S.redeems.filter(d => d.sid === sid && d.reward === rw.id && live(d) && kst(d.at) >= m0).reduce((s, d) => s + d.points, 0) + p > +mx.month) return { error: 'bad_points' };
      if (S.redeems.filter(d => d.sid === sid && kst(d.at) === kst(at)).length >= 5) return { error: 'rate' };
      if (per.month != null && S.redeems.filter(d => d.sid === sid && d.reward === rw.id && live(d) && kst(d.at) >= m0).length >= +per.month) return { error: 'limit' };
      if (cash && w.convertible < (rw.threshold || 0)) return { error: 'below_threshold' };
      if (rw.stock != null && S.redeems.filter(d => d.reward === rw.id && ['requested', 'approved', 'fulfilled'].includes(d.status)).length >= rw.stock) return { error: 'out_of_stock' };
      const avail = cash ? w.convertible : w.balance; if (avail < p) return { error: 'insufficient', available: avail };
      const id = rid('mrd_'), hold = rid('me_'); const won = ['tuition', 'coupon', 'scholar', 'shop'].includes(rw.kind) ? Math.floor(p * (cost.wonPerP != null ? +cost.wonPerP : 1)) : 0;
      push({ id: hold, sid, unit, kind: 'hold', points: -p, redeemId: id, reason: rw.title, idemKey: 'h:' + id, at, postedAt: at });
      if (take(sid, unit, hold, p, cash) !== p) throw new Error('take shortfall');
      S.redeems.push({ id, sid, unit, reward: rw.id, points: p, won, status: 'requested', holdEntry: hold, useEntry: null, fulfil: {}, idemKey: ik, at });
      if (rw.approval === 'auto') return redeemDecide(id, 'approve', 'auto', null, at);
      return { ok: true, id, status: 'requested', points: p, won, wallet: sync(sid, unit, at) }; }
    function redeemDecide(id, decision, staff, reason, at) { at = ms(at); const d = S.redeems.find(x => x.id === id); if (!d) return { error: 'not_found' }; if (d.status !== 'requested') return { error: 'state', status: d.status };
      if (decision === 'reject' && !String(reason || '').trim()) return { error: 'reason' }; const rw = S.rewards.find(x => x.id === d.reward);
      const rel = rid('me_');
      const net = netHold(d); push({ id: rel, sid: d.sid, unit: d.unit, kind: 'release', points: d.points, redeemId: d.id, refEntry: d.holdEntry, reason, byStaff: staff, idemKey: 'rl:' + d.id, at, postedAt: at });
      net.forEach(([lot, p]) => S.lotuse.push({ entry: rel, lot, points: -p }));
      if (decision === 'approve') { const use = rid('me_'); push({ id: use, sid: d.sid, unit: d.unit, kind: 'use', points: -d.points, redeemId: d.id, reason: rw.title, byStaff: staff, idemKey: 'u:' + d.id, at, postedAt: at });
        if (take(d.sid, d.unit, use, d.points, rw.cash !== false) !== d.points) throw new Error('take shortfall'); d.status = 'approved'; d.useEntry = use; }
      else { d.status = decision === 'cancel' ? 'cancelled' : 'rejected'; d.reason = reason; }
      d.decidedBy = staff; d.decidedAt = at;
      return { ok: true, id, status: d.status, points: d.points, won: d.won, kind: rw.kind, wallet: sync(d.sid, d.unit, at) }; }
    /* 신청의 남은 hold lot 소진(조정 release 반영) [[lot, P]] — 나중에 잡은 것이 뒤 */
    function netHold(d) { const ids = new Set(S.entries.filter(e => e.redeemId === d.id && ['hold', 'release'].includes(e.kind)).map(e => e.id)); const m = new Map(); const last = new Map();
      S.lotuse.forEach((u, i) => { if (!ids.has(u.entry)) return; m.set(u.lot, (m.get(u.lot) || 0) + u.points); last.set(u.lot, i); });
      return [...m.entries()].filter(([, p]) => p > 0).sort((a, b) => last.get(b[0]) - last.get(a[0])); }
    function redeemAdjust(id, points, staff, reason, at) { at = ms(at); const d = S.redeems.find(x => x.id === id); if (!d) return { error: 'not_found' }; if (d.status !== 'requested') return { error: 'state', status: d.status };
      const rw = S.rewards.find(x => x.id === d.reward); const p = Math.round(+points);
      if (!(p > 0) || p >= d.points || p < (rw.minUse || 0) || ((rw.step || 1) > 1 && p % rw.step)) return { error: 'bad_points' };
      const diff = d.points - p; let left = diff; const net = netHold(d); const rel = rid('me_');
      push({ id: rel, sid: d.sid, unit: d.unit, kind: 'release', points: diff, redeemId: d.id, refEntry: d.holdEntry, reason: reason || '신청 P 조정', byStaff: staff, idemKey: `ra:${d.id}:${p}`, at, postedAt: at });
      for (const [lot, q] of net) { const x = Math.min(q, left); S.lotuse.push({ entry: rel, lot, points: -x }); left -= x; if (!left) break; }
      d.points = p; d.won = ['tuition', 'coupon', 'scholar', 'shop'].includes(rw.kind) ? Math.floor(p * ((rw.cost || {}).wonPerP != null ? +rw.cost.wonPerP : 1)) : 0;
      return { ok: true, id, status: 'requested', points: d.points, won: d.won, wallet: sync(d.sid, d.unit, at) }; }
    function redeemFulfil(id, f) { const d = S.redeems.find(x => x.id === id); if (!d || d.status !== 'approved') return { error: 'state' }; d.status = 'fulfilled'; d.fulfil = Object.assign({}, d.fulfil, f || {}); return { ok: true, id, status: 'fulfilled', fulfil: d.fulfil }; }
    function restore(d, p, reason, staff, idem, at) { if (p <= 0 || S.entries.some(e => e.idemKey === idem)) return null; const used = S.lotuse.filter(u => u.entry === d.useEntry).map(u => E(u.lot));
      const exps = used.map(l => l.expiresAt).filter(x => x != null); const exp = exps.length ? Math.min(...exps) : null; const conv = used.length ? used.every(l => l.convertible) : false; const id = rid('me_');
      push({ id, sid: d.sid, unit: d.unit, kind: 'restore', points: p, convertible: conv, redeemId: d.id, refEntry: d.useEntry, expiresAt: exp, reason, byStaff: staff, idemKey: idem, at, postedAt: at });
      settle(d.sid, d.unit); if (exp != null && exp <= at) expire(at, d.sid); return id; }
    function redeemReclaim(id, reason, staff, at) { at = ms(at); const d = S.redeems.find(x => x.id === id); if (!d) return { error: 'not_found' }; if (!['approved', 'fulfilled'].includes(d.status)) return { error: 'state' };
      if (!String(reason || '').trim()) return { error: 'reason' }; restore(d, d.points, reason, staff, 'rc:' + d.id, at); d.status = 'reclaimed'; d.reason = reason; return { ok: true, id, status: 'reclaimed', wallet: sync(d.sid, d.unit, at) }; }
    function addLine(bill, id, at) { const d = S.redeems.find(x => x.id === id); if (!d) return { error: 'not_found' }; if (d.status !== 'approved') return { error: 'state' }; const rw = S.rewards.find(x => x.id === d.reward); if (rw.kind !== 'tuition') return { error: 'kind' };
      const ch = S.charges.filter(c => c.bill === bill); if (!ch.length) return { error: 'bill' }; const live = ch.filter(c => c.status !== 'void'); const sum = live.reduce((s, c) => s + c.amount, 0);
      if (ch.reduce((m, c) => c.sid < m ? c.sid : m, ch[0].sid) !== d.sid) return { error: 'bill' };
      if (live.some(c => ['class', 'cls'].includes(c.srcType) && !cashOk(c.srcId))) return { error: 'funded_blocked' };
      if (S.allocs.some(x => ch.some(c => c.id === x.charge))) return { error: 'bill_paid' };
      if (live.some(c => c.srcType === 'mileage')) return { error: 'already' };
      const pct = (rw.maxUse && rw.maxUse.billPct != null) ? +rw.maxUse.billPct : 30; const max = Math.floor(sum * pct / 100); if (d.won > max) return { error: 'over_cap', max };
      const cid = rid('lc_'); S.charges.push({ id: cid, bill, sid: d.sid, unit: ch[0].unit, itemType: 'etc', title: '마일리지 차감', amount: -d.won, srcType: 'mileage', srcId: d.id, status: 'open' });
      return redeemFulfil(id, { billId: bill, chargeId: cid }); }
    function onRefund(receipt, ratio, at, round) { at = ms(at); round = Math.max(round || 10, 1); const bills = [...new Set(S.allocs.filter(x => x.receipt === receipt).map(x => (S.charges.find(c => c.id === x.charge) || {}).bill).filter(Boolean))];
      let rest = 0, can = 0; if (!bills.length) return { ok: true, restored: 0, cancelled: 0 };
      S.redeems.filter(d => d.status === 'fulfilled' && bills.includes(d.fulfil.billId)).forEach(d => { const p = Math.floor(d.points * Math.min(Math.max(ratio, 0), 1) / round) * round;
        if (restore(d, p, '환불 복원', 'system', `rs:${d.id}:${receipt}`, at)) rest += p; sync(d.sid, d.unit, at); });
      if (ratio >= 1) S.charges.filter(c => bills.includes(c.bill) && ['class', 'cls'].includes(c.srcType)).forEach(c => S.entries.filter(e => e.sid === c.sid && e.cls === c.srcId && e.kind === 'earn' && ['posted', 'pending'].includes(e.status)).forEach(e => { if (cancel(e.id, '과정 환불', 'system', at).ok) can++; }));
      return { ok: true, restored: rest, cancelled: can }; }
    function noticeDue(at) { at = ms(at); const pol = S.policy; const out = []; if (!pol) return out; const day = kst(at); const nb = pol.notice || {};
      const lots = S.entries.filter(e => e.status === 'posted' && e.points > 0 && LOT.includes(e.kind) && e.expiresAt != null && e.expiresAt > at).map(l => ({ l, r: rem(l.id) })).filter(x => x.r > 0);
      const add = (sid, unit, kind, ym, points, due) => { if (S.notices.some(n => n.sid === sid && n.unit === unit && n.kind === kind && n.ym === ym)) return; const n = { sid, unit, kind, ym, points, dueAt: due }; S.notices.push(n); out.push(n); };
      const mb = nb.monthsBefore != null ? +nb.monthsBefore : 6;
      if (mb > 0) { const lim = Date.parse(addMonths(new Date(at).toISOString().slice(0, 10), mb) + new Date(at).toISOString().slice(10)); const g = new Map();
        lots.filter(x => x.l.expiresAt <= lim).forEach(x => { const k = x.l.sid + '|' + x.l.unit; const c = g.get(k) || { p: 0, due: Infinity }; c.p += x.r; c.due = Math.min(c.due, x.l.expiresAt); g.set(k, c); });
        [...g.entries()].sort().forEach(([k, c]) => { const [s, u] = k.split('|'); add(s, u, 'expire_month', day.slice(0, 7), c.p, c.due); }); }
      for (const n of nb.daysBefore || []) { const g = new Map(); lots.filter(x => x.l.expiresAt <= at + n * DAY).forEach(x => { const k = x.l.sid + '|' + x.l.unit + '|' + x.l.expiresAt; g.set(k, (g.get(k) || 0) + x.r); });
        [...g.entries()].sort().forEach(([k, p]) => { const [s, u, e] = k.split('|'); add(s, u, +n >= 7 ? 'expire_d30' : 'expire_d3', kst(+e - 1000) + ':' + n, p, +e); }); }
      const su = pol.sunset; if (su && su.noticeAt && ms(su.noticeAt) <= at && (!su.endAt || ms(su.endAt) > at)) Object.entries(S.wallets).filter(([, w]) => w.balance > 0).sort().forEach(([k, w]) => { const [s, u] = k.split('|'); add(s, u, 'sunset', day.slice(0, 7), w.balance, su.endAt ? ms(su.endAt) : null); });
      return out; }
    return { S, emit, post, void: voidE, cancel, expire, grant, redeemReq, redeemDecide, redeemAdjust, redeemFulfil, redeemReclaim, addLine, onRefund, noticeDue, sync, streakCalc, rem, cashOk };
  }

  /* 화면용 순수 함수: 권장값 이탈 경고(D2 — 거절하지 않고 이유 한 줄) */
  const RECOMMEND = { billPct: 30, expiryMonths: 12, dailyCapTotal: 500, noticeMonthsBefore: 6 };
  function warnings(pol, rewards) { const w = []; const p = pol || {};
    if (p.expiry && p.expiry.mode === 'months' && +p.expiry.months < RECOMMEND.expiryMonths / 2) w.push({ code: 'expiry_short', msg: '유효기간이 6개월보다 짧으면 학습자 불만이 생길 수 있습니다.' });
    if (p.dailyCapTotal != null && +p.dailyCapTotal > RECOMMEND.dailyCapTotal * 2) w.push({ code: 'day_cap_high', msg: `1인 하루 총 상한이 권장값(${RECOMMEND.dailyCapTotal}P)의 2배를 넘습니다.` });
    if (p.notice && +p.notice.monthsBefore === 0 && !(p.notice.daysBefore || []).length) w.push({ code: 'notice_off', msg: '소멸 고지를 모두 끄면 분쟁이 생길 수 있습니다.' });
    if (!p.budget || (p.budget.monthP == null && p.budget.termP == null)) w.push({ code: 'no_budget', msg: '예산을 입력하지 않으면 과지급을 미리 막을 수 없습니다.' });
    (rewards || []).forEach(r => { if (r.kind === 'tuition' && r.maxUse && +r.maxUse.billPct > RECOMMEND.billPct) w.push({ code: 'bill_pct', reward: r.id, msg: `청구서의 ${RECOMMEND.billPct}%를 넘는 차감은 매출 변동이 커질 수 있습니다(디디쌤 권장값 ${RECOMMEND.billPct}%).` });
      if (r.kind === 'tuition' && (!r.maxUse || r.maxUse.billPct == null)) w.push({ code: 'bill_pct_unset', reward: r.id, msg: `차감 상한을 정하지 않으면 권장값 ${RECOMMEND.billPct}%를 적용합니다.` }); });
    return w; }
  /* 기관 유형별 기본 템플릿 8종(03 5장) — 권장값일 뿐, 기관이 모든 값을 바꿀 수 있다(D2). 예산이 없으면 비현금형(보상 없이 배지 · 스트릭) */
  const TPL = {
    k12: { label: '학원(초중고)', rank: false, cap: 300, exp: 12, rules: [['attend_day', 'participation', 10, 'per_day'], ['lesson_done', 'achievement', 20, 'per_src', { day: 100 }], ['exam_score', 'achievement', { band: [[80, 50], [90, 100]] }], ['course_done', 'achievement', 300]], rewards: [['tuition', '학원비 차감', { billPct: 30 }], ['goods', '학용품']] },
    adult: { label: '성인 학원', rank: true, cap: 500, exp: 12, rules: [['attend_day', 'participation', 10, 'per_day'], ['lesson_done', 'achievement', 30, 'per_src', { day: 150 }], ['exam_score', 'achievement', { band: [[80, 50], [90, 100]] }], ['course_done', 'achievement', 500]], rewards: [['coupon', '수강 할인 쿠폰'], ['tuition', '수강료 차감', { billPct: 30 }]] },
    univ: { label: '대학', rank: false, cap: 500, exp: 'term_end', rules: [['noncredit_done', 'achievement', 'source'], ['evidence', 'achievement', 30, 'per_src', null, 'cert_lang'], ['survey_done', 'participation', 5]], rewards: [['badge', '역량 배지']] },
    corp: { label: '기업', rank: true, cap: 500, exp: 12, rules: [['lesson_done', 'achievement', 20, 'per_src', { day: 100 }], ['course_done', 'achievement', 300], ['exam_score', 'achievement', { band: [[80, 50], [90, 100]] }], ['tube_goal', 'participation', 10, 'per_day']], rewards: [['shop', '리워드 숍'], ['badge', '학습 배지']] },
    public: { label: '공공', rank: false, cap: 300, exp: 12, rules: [['lesson_done', 'achievement', 10, 'per_src', { day: 80 }], ['course_done', 'achievement', 200]], rewards: [['cert', '이수 인정서']] },
    lifelong: { label: '평생교육원', rank: false, cap: 300, exp: 12, rules: [['attend_day', 'participation', 10, 'per_day'], ['course_done', 'achievement', 300], ['review_ok', 'achievement', 50]], rewards: [['coupon', '다음 강좌 할인 쿠폰']] },
    vocational: { label: '직업훈련(국비)', rank: false, cap: 200, exp: 12, rules: [['attend_day', 'participation', 10, 'per_day'], ['lesson_done', 'achievement', 10, 'per_src', { day: 80 }], ['course_done', 'achievement', 200]], rewards: [['badge', '수료 배지']] },
    franchise: { label: '프랜차이즈(가맹점별)', rank: false, cap: 300, exp: 12, rules: [['attend_day', 'participation', 10, 'per_day'], ['lesson_done', 'achievement', 20, 'per_src', { day: 100 }], ['course_done', 'achievement', 300]], rewards: [['tuition', '학원비 차감', { billPct: 30 }]] } };
  const TYPE_MAP = { academy: 'k12', hakwon: 'k12', k12: 'k12', adult: 'adult', univ: 'univ', college: 'univ', corp: 'corp', company: 'corp', enterprise: 'corp', public: 'public', gov: 'public', lifelong: 'lifelong', vocational: 'vocational', training: 'vocational', moel: 'vocational', franchise: 'franchise' };
  function templateKey(type, ed) { if (ed && TPL[ed]) return ed; return TYPE_MAP[String(type || '').toLowerCase()] || 'adult'; }
  function template(type, ed, budget) { const k = templateKey(type, ed); const T = TPL[k]; const cash = !!(budget && (budget.monthWon || budget.termWon));
    const rules = T.rules.map(([trig, nature, sc, once, caps, group]) => ({ id: 'mru_' + trig, ver: 1, trigger: trig, nature, label: '', once: once || (['signup', 'first_login'].includes(trig) ? 'ever' : 'per_src'), caps: caps || {}, groupKey: group || null,
      trustMin: 'C', approval: trig === 'evidence' ? 'evidence' : 'auto', cond: trig === 'exam_score' ? { minScore: 80 } : trig === 'attend_day' ? { minMin: 10 } : {},
      score: sc === 'source' ? { mode: 'source' } : sc && sc.band ? { mode: 'band', bands: sc.band } : { mode: 'fixed', v: sc }, active: true }));
    const rewards = T.rewards.filter(([kind]) => cash || !['tuition', 'coupon', 'shop', 'scholar'].includes(kind)).map(([kind, title, mx], i) => ({ id: `mrw_${kind}${i}`, kind, title, cost: { wonPerP: 1 }, minUse: kind === 'tuition' || kind === 'coupon' ? 1000 : 0,
      maxUse: mx || {}, step: kind === 'tuition' || kind === 'coupon' ? 100 : 1, threshold: 0, perSid: kind === 'tuition' ? { month: 1 } : {}, approval: 'manual', cash: ['tuition', 'coupon', 'shop', 'goods', 'scholar'].includes(kind), audience: {}, link: {}, active: true }));
    const policy = Object.assign({}, DEFAULT_POLICY, { template: k, dailyCapTotal: T.cap, expiry: T.exp === 'term_end' ? { mode: 'term_end' } : { mode: 'months', months: T.exp }, budget: budget && budget.monthWon ? { monthP: Math.floor(+budget.monthWon) } : {},
      streak: Object.assign({}, DEFAULT_POLICY.streak), scope: k === 'franchise' ? { mode: 'unit', sameBizUnits: [], hqPool: false } : DEFAULT_POLICY.scope, league: { on: false, size: 10, reset: 'week' } });
    return { template: k, label: T.label, policy, rules, rewards, warnings: warnings(policy, rewards) }; }
  /* 모의 계산: 지난 사건에 규칙을 적용(저장 안 함). events [{sid, trigger, srcType, srcId, value, trust, at, cls}] */
  function simulate(policy, rules, rewards, events) { const eng = create({ policy: Object.assign({}, policy, { on: true, sunset: null }), rules, rewards: rewards || [] });
    (events || []).slice().sort((a, b) => ms(a.at) - ms(b.at)).forEach(e => eng.emit(e)); const E2 = eng.S.entries.filter(e => e.kind === 'earn');
    const by = {}; const per = {}; E2.forEach(e => { by[e.ruleId] = (by[e.ruleId] || 0) + e.points; per[e.sid] = (per[e.sid] || 0) + e.points; });
    const vals = Object.values(per).sort((a, b) => a - b); const total = vals.reduce((s, x) => s + x, 0); const cash = (rewards || []).find(r => r.cash !== false && (r.cost || {}).wonPerP != null);
    const conv = E2.filter(e => e.convertible).reduce((s, e) => s + e.points, 0);
    return { totalP: total, convertibleP: conv, wonEstimate: cash ? Math.floor(conv * +cash.cost.wonPerP) : 0, sids: vals.length, perSidAvg: vals.length ? Math.round(total / vals.length) : 0, p90: vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.9))] : 0, byRule: by }; }
  return { create, template, templateKey, simulate, TEMPLATES: Object.keys(TPL), kst, addMonths, expAt, winStart, termStart, weekStart, trank, warnings, RECOMMEND, DEFAULT_POLICY };
});
