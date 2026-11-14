'use strict';
/* v42 마일리지 기준값 실행기: tests/mileage-vectors.json을 ① didisam/milecalc.js(데모 엔진) ② SQL 함수(mil_*, Node · Java 공용)로 돌려 expect와 대조한다.
   runJs(v) · runSql(pool, inTenant, v) → 어긋난 항목 문자열 배열(빈 배열 = 통과). SQL 쪽은 끝에 「mil_wallet 캐시 = mil_entry 합계」(MV-28)도 확인한다. */
const path = require('node:path'); const crypto = require('node:crypto');
const MC = require(path.join(__dirname, '..', 'didisam', 'milecalc.js'));
const VEC = require('./mileage-vectors.json');
const TS = /^\d{4}-\d\d-\d\dT\d\d:\d\d/;

function match(exp, act, p, out) {
  if (exp === null || typeof exp !== 'object') {
    if (typeof exp === 'string' && TS.test(exp) && typeof act === 'string' && TS.test(act)) { if (Date.parse(exp) !== Date.parse(act)) out.push(`${p}: ${exp} ≠ ${act}`); return; }
    if (exp !== act) out.push(`${p}: ${JSON.stringify(exp)} ≠ ${JSON.stringify(act)}`); return; }
  if (Array.isArray(exp)) { if (!Array.isArray(act) || act.length !== exp.length) { out.push(`${p}: ${JSON.stringify(exp)} ≠ ${JSON.stringify(act)}`); return; } exp.forEach((x, i) => match(x, act[i], `${p}[${i}]`, out)); return; }
  if (!act || typeof act !== 'object') { out.push(`${p}: 없음(${JSON.stringify(act)})`); return; }
  for (const k of Object.keys(exp)) match(exp[k], act[k], `${p}.${k}`, out);
}
function given(v) { const g = v.given || {}; const pol = Object.assign({}, VEC.base.policy, g.policy || {});
  const rules = (g.rules || []).map(r => Object.assign({ ver: 1, once: 'per_src', trustMin: 'C', approval: 'auto', nature: 'achievement', active: true, cond: {}, caps: {} }, r));
  const rewards = (g.rewards || []).map(r => Object.assign({ cost: { wonPerP: 1 }, minUse: 0, maxUse: {}, step: 1, threshold: 0, perSid: {}, approval: 'manual', cash: true, audience: {}, link: {}, active: true }, r));
  const charges = (g.charges || []).map(c => Object.assign({ sid: 's1', unit: 'lu_root', status: 'open' }, c));
  return { pol, rules, rewards, groups: g.groups || [], funded: g.funded || {}, charges, allocs: g.allocs || [] }; }
const ref = (refs, x) => typeof x === 'string' && x[0] === '$' ? refs[x.slice(1)] : x;
const idOf = r => r && (r.entryId || r.id || (r.entries && r.entries[0] && r.entries[0].id));
const kindsOut = rows => rows.map(e => `${e.kind}:${e.points}`).sort();

function runJs(v) {
  const G = given(v); const eng = MC.create({ policy: G.pol, rules: G.rules, rewards: G.rewards, groups: G.groups, funded: G.funded, charges: G.charges, allocs: G.allocs.map(a => ({ ...a })) });
  const refs = {}; const bad = [];
  (v.steps || []).forEach((s, i) => { const a = {}; for (const k of Object.keys(s.args || {})) a[k] = ref(refs, s.args[k]); const sid = a.sid || 's1'; let r;
    switch (s.op) {
      case 'emit': r = eng.emit({ ...a, sid }); break;
      case 'post': r = eng.post(a.entry, a.at); break;
      case 'cancel': r = eng.cancel(a.entry, a.reason, 'staff', a.at); break;
      case 'expire': r = { n: eng.expire(a.at) }; break;
      case 'grant': r = eng.grant({ ...a, sid }); break;
      case 'redeem': r = eng.redeemReq({ ...a, sid }); break;
      case 'decide': r = eng.redeemDecide(a.id, a.decision, 'staff', a.reason, a.at); break;
      case 'reclaim': r = eng.redeemReclaim(a.id, a.reason, 'staff', a.at); break;
      case 'adjust': r = eng.redeemAdjust(a.id, a.points, 'staff', a.reason, a.at); break;
      case 'addLine': r = eng.addLine(a.bill, a.redeem, a.at); break;
      case 'alloc': eng.S.allocs.push({ receipt: a.receipt, charge: a.charge, amount: a.amount }); r = { ok: true }; break;
      case 'refund': r = eng.onRefund(a.receipt, a.ratio, a.at); break;
      case 'notices': { const n = eng.noticeDue(a.at).sort((x, y) => x.kind < y.kind ? -1 : 1); r = { kinds: n.map(x => x.kind), points: n.map(x => x.points) }; break; }
      case 'streak': r = { n: eng.streakCalc(sid, a.day, eng.S.policy.streak.freezePerWeek) }; break;
      case 'rule': eng.S.rules.push(Object.assign({ ver: 1, once: 'per_src', trustMin: 'C', approval: 'auto', nature: 'achievement', active: true, cond: {}, caps: {} }, a)); r = { ok: true }; break;
      case 'policy': Object.assign(eng.S.policy, a); r = { ok: true }; break;
      case 'billSum': { const L = eng.S.charges.filter(c => c.bill === a.bill && c.status !== 'void'); r = { sum: L.reduce((x, c) => x + c.amount, 0), lines: L.length }; break; }
      default: throw new Error('op ' + s.op);
    }
    if (s.as) refs[s.as] = idOf(r);
    if (s.expect) match(s.expect, JSON.parse(JSON.stringify(r)), `${v.id}#${i} ${s.op}`, bad);
  });
  const T = v.then || {};
  for (const [k, w] of Object.entries(T.wallets || {})) { const [sid, unit] = k.split('|'); match(w, eng.sync(sid, unit, Date.parse('2026-11-30T00:00:00Z')), `${v.id} wallet ${k}`, bad); }
  for (const [sid, ks] of Object.entries(T.kinds || {})) match([...ks].sort(), kindsOut(eng.S.entries.filter(e => e.sid === sid && e.status !== 'void')), `${v.id} kinds ${sid}`, bad);
  runJs.eng = eng; /* 마지막 엔진(학습자 시연판 계산 대조용, tests/ui/mil42-learner.js) */
  return bad;
}

const J = x => x == null ? null : JSON.stringify(x);
async function setup(pool, inTenant, v) {
  const G = given(v); const tid = 'tn_' + crypto.randomBytes(6).toString('hex').slice(0, 10);
  await pool.query('insert into tenants (id, name, type) values ($1, $2, $3)', [tid, 'mv ' + v.id, 'academy']);
  await inTenant(pool, tid, async c => { const p = G.pol;
    await c.query(`insert into mil_policy (tenant_id, is_on, expiry, notice, budget, daily_cap_total, streak, cash_lock, sunset, penalty, grant_cfg) values ($1,$2,coalesce($3::jsonb,'{"mode":"months","months":12}'),coalesce($4::jsonb,'{"monthsBefore":6,"daysBefore":[30,3]}'),coalesce($5::jsonb,'{}'),$6,coalesce($7::jsonb,'{}'),coalesce($8::jsonb,'{"needTrust":"B","achievementOnly":true}'),$9,coalesce($10::jsonb,'{"on":false}'),coalesce($11::jsonb,'{"approveOver":1000}'))`,
      [tid, !!p.on, J(p.expiry), J(p.notice), J(p.budget), p.dailyCapTotal == null ? null : p.dailyCapTotal, J(p.streak), J(p.cashLock), J(p.sunset), J(p.penalty), J(p.grantCfg)]);
    for (const r of G.rules) await insRule(c, tid, r);
    for (const g of G.groups) await c.query('insert into mil_group (tenant_id, key, caps) values ($1,$2,$3)', [tid, g.key, J(g.caps || {})]);
    for (const r of G.rewards) await c.query('insert into mil_reward (tenant_id, id, kind, title, cost, min_use, max_use, step, threshold, stock, per_sid, approval, cash, audience, active, link) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',
      [tid, r.id, r.kind, r.title, J(r.cost), r.minUse, J(r.maxUse), r.step, r.threshold, r.stock == null ? null : r.stock, J(r.perSid), r.approval, r.cash, J(r.audience), r.active, J(r.link)]);
    for (const [cls, f] of Object.entries(G.funded)) await c.query('insert into mil_funded (tenant_id, cls_id, funded) values ($1,$2,$3)', [tid, cls, !!f]);
    for (const x of G.charges) await c.query("insert into led_charge (tenant_id, id, bill_id, unit_id, sid, item_type, title, amount, src_type, src_id, status) values ($1,$2,$3,$4,$5,'tuition','수강료',$6,$7,$8,$9)", [tid, x.id, x.bill, x.unit, x.sid, x.amount, x.srcType || null, x.srcId || null, x.status]);
    for (const a of G.allocs) await c.query('insert into led_alloc (tenant_id, receipt_id, charge_id, amount) values ($1,$2,$3,$4)', [tid, a.receipt, a.charge, a.amount]);
  });
  return tid;
}
function insRule(c, tid, r) { r = Object.assign({ ver: 1, once: 'per_src', trustMin: 'C', approval: 'auto', nature: 'achievement', active: true, cond: {}, caps: {} }, r);
  return c.query('insert into mil_rule (tenant_id, id, ver, trigger, nature, cond, score, caps, once, group_key, trust_min, approval, approve_over, expiry, starts_on, ends_on, active) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)',
    [tid, r.id, r.ver, r.trigger, r.nature, J(r.cond), J(r.score), J(r.caps), r.once, r.groupKey || null, r.trustMin, r.approval, r.approveOver == null ? null : r.approveOver, J(r.expiry), r.startsOn || null, r.endsOn || null, r.active]); }
const POLCOL = { on: 'is_on', expiry: 'expiry', notice: 'notice', budget: 'budget', dailyCapTotal: 'daily_cap_total', streak: 'streak', cashLock: 'cash_lock', sunset: 'sunset', penalty: 'penalty', grantCfg: 'grant_cfg' };

async function runSql(pool, inTenant, v) {
  const tid = await setup(pool, inTenant, v); const refs = {}; const bad = []; const one = async (c, q, a) => (await c.query(q, a)).rows[0].r;
  for (const [i, s] of (v.steps || []).entries()) { const a = {}; for (const k of Object.keys(s.args || {})) a[k] = ref(refs, s.args[k]); const sid = a.sid || 's1';
    const r = await inTenant(pool, tid, async c => { switch (s.op) {
      case 'emit': return one(c, 'select mil_emit($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) r', [tid, sid, a.trigger, a.srcType, a.srcId, a.value == null ? null : a.value, a.trust || 'B', a.at, a.cls || null, a.unit || 'lu_root']);
      case 'post': return one(c, 'select mil_post($1,$2,$3) r', [tid, a.entry, a.at]);
      case 'cancel': return one(c, "select mil_cancel($1,$2,$3,'staff',$4) r", [tid, a.entry, a.reason, a.at]);
      case 'expire': return { n: await one(c, 'select mil_expire($1,$2) r', [tid, a.at]) };
      case 'grant': return one(c, 'select mil_grant($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) r', [tid, a.staff, !!a.owner, !!a.self, sid, a.unit || 'lu_root', a.points, a.reason, a.idem, a.at, !!a.penalty]);
      case 'redeem': return one(c, 'select mil_redeem_req($1,$2,$3,$4,$5,$6) r', [tid, sid, a.reward, a.points, a.idem, a.at]);
      case 'decide': return one(c, "select mil_redeem_decide($1,$2,$3,'staff',$4,$5) r", [tid, a.id, a.decision, a.reason || null, a.at]);
      case 'reclaim': return one(c, "select mil_redeem_reclaim($1,$2,$3,'staff',$4) r", [tid, a.id, a.reason, a.at]);
      case 'adjust': return one(c, "select mil_redeem_adjust($1,$2,$3,'staff',$4,$5) r", [tid, a.id, a.points, a.reason || null, a.at]);
      case 'addLine': return one(c, 'select mil_add_line($1,$2,$3,$4) r', [tid, a.bill, a.redeem, a.at]);
      case 'alloc': await c.query('insert into led_alloc (tenant_id, receipt_id, charge_id, amount) values ($1,$2,$3,$4)', [tid, a.receipt, a.charge, a.amount]); return { ok: true };
      case 'refund': return one(c, 'select mil_on_refund($1,$2,$3,$4) r', [tid, a.receipt, a.ratio, a.at]);
      case 'notices': { const n = (await c.query('select kind, points from mil_notice_due($1,$2) order by kind', [tid, a.at])).rows; return { kinds: n.map(x => x.kind), points: n.map(x => x.points) }; }
      case 'streak': return { n: await one(c, "select mil_streak_calc($1,$2,$3::date,coalesce((select (streak->>'freezePerWeek')::int from mil_policy where tenant_id = $1), 1)) r", [tid, sid, a.day]) };
      case 'rule': await insRule(c, tid, a); return { ok: true };
      case 'policy': for (const [k, x] of Object.entries(a)) await c.query(`update mil_policy set ${POLCOL[k]} = $2 where tenant_id = $1`, [tid, typeof x === 'object' ? J(x) : x]); return { ok: true };
      case 'billSum': { const x = (await c.query("select coalesce(sum(amount),0)::int sum, count(*)::int lines from led_charge where tenant_id = $1 and bill_id = $2 and status <> 'void'", [tid, a.bill])).rows[0]; return x; }
      default: throw new Error('op ' + s.op); } });
    if (s.as) refs[s.as] = idOf(r);
    if (s.expect) match(s.expect, r, `${v.id}#${i} ${s.op} [sql]`, bad);
  }
  const T = v.then || {};
  await inTenant(pool, tid, async c => {
    /* MV-28: 모든 벡터 끝에 지갑 캐시 = 원장 합계 */
    const diff = (await c.query("select w.sid, w.scope_unit, w.balance, coalesce((select sum(points) from mil_entry e where e.tenant_id = w.tenant_id and e.sid = w.sid and e.scope_unit = w.scope_unit and e.status = 'posted'), 0)::int s from mil_wallet w where w.tenant_id = $1", [tid])).rows.filter(x => x.balance !== x.s);
    if (diff.length) bad.push(`${v.id} MV-28 지갑 캐시 ≠ 원장 합계 ${JSON.stringify(diff)}`);
    for (const [k, w] of Object.entries(T.wallets || {})) { const [sid, unit] = k.split('|'); match(w, (await c.query("select mil_sync($1,$2,$3,'2026-11-30T00:00:00Z') r", [tid, sid, unit])).rows[0].r, `${v.id} wallet ${k} [sql]`, bad); }
    for (const [sid, ks] of Object.entries(T.kinds || {})) match([...ks].sort(), kindsOut((await c.query("select kind, points from mil_entry where tenant_id = $1 and sid = $2 and status <> 'void'", [tid, sid])).rows), `${v.id} kinds ${sid} [sql]`, bad);
  });
  return bad;
}
module.exports = { VEC, match, runJs, runSql, setup };
