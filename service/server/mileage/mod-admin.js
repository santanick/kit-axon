'use strict';
/* v42 운영자 /api/mileage/*(04 5.1). 조회는 owner · sub · teacher, 쓰기는 owner · sub(needStaff), 정책 · 켜고 끄기 · 국비 표시 · 순위/감점 · 종료 · 이관 · 숍 지급 내보내기는 owner.
   지급 · 차감 · 반려 · 발송은 화면의 확인 카드 뒤 이 요청으로만 실행된다. 숫자는 모두 SQL 함수(mil_*) 값. */
const { createMailer } = require('../mail');
module.exports = (ctx, S) => {
  const { pool, inTenant, readBody, limit, audit, need, needStaff, needOwner, env = process.env } = ctx;
  const { E, ok, one, str, int, MC } = S;
  const q = req => new URL(req.url, 'http://x').searchParams;
  const T = (a, fn) => inTenant(pool, a.tid, async c => { await S.needMod(c, a.tid); return fn(c); });
  const J = x => x == null ? null : JSON.stringify(x);
  const obj = v => v && typeof v === 'object' && !Array.isArray(v);
  const ymOf = s => /^\d{4}-\d\d$/.test(s || '') ? s : MC.kst(Date.now()).slice(0, 7);
  const log = (c, tid, area, before, after, reason, by, ver) => c.query('insert into mil_policy_log (tenant_id, ver, area, before, after, reason, by_staff) values ($1,$2,$3,$4,$5,$6,$7)', [tid, ver || null, area, J(before), J(after), reason || null, by]);
  const latestRules = c => c.query('select distinct on (id) * from mil_rule where tenant_id = current_setting(\'app.tenant\') order by id, ver desc');
  const rewardsOf = async c => (await c.query("select * from mil_reward where tenant_id = current_setting('app.tenant') order by at, id")).rows.map(S.rwOut);

  /* 정책 칸(카멜) → 열. on · rank · penalty · sunset은 전용 경로로만 */
  const PCOL = { unitName: ['unit_name', v => str(v, 10) || 'P'], expiry: ['expiry', obj], notice: ['notice', obj], budget: ['budget', obj], dailyCapTotal: ['daily_cap_total', v => v == null ? null : Math.max(0, int(v))],
    league: ['league', obj], streak: ['streak', obj], scope: ['scope', obj], tiers: ['tiers', Array.isArray], tierWindow: ['tier_window', v => ['m12', 'term', 'year'].includes(v) ? v : 'm12'], cashLock: ['cash_lock', obj], grantCfg: ['grant_cfg', obj], shop: ['shop', obj] };
  async function savePolicy(c, a, P, reason) {
    const cur = await S.ensurePol(c, a.tid); const sets = []; const vals = [a.tid]; const before = {}, after = {};
    for (const [k, [col, chk]] of Object.entries(PCOL)) { if (!(k in P)) continue; const v = P[k];
      if (typeof chk === 'function' && chk !== obj && chk !== Array.isArray) { vals.push(chk(v)); } else { if (!chk(v)) throw E('bad_rule', { field: k }, 400); vals.push(J(v)); }
      sets.push(`${col} = $${vals.length}`); before[k] = cur[col]; after[k] = P[k]; }
    if (P.scope && P.scope.hqPool === true && env.MIL_HQ_POOL_REVIEWED !== '1') throw E('hq_pool_locked');
    if (P.shop && P.shop.on === true && !(cur.shop && cur.shop.on) && !(P.shop.ack && P.shop.ack.read === true)) throw E('ack_required', { notice: 'G' }, 400);
    if (!sets.length) return { p: cur, changed: false };
    vals.push(a.email); const p = (await c.query(`update mil_policy set ${sets.join(', ')}, ver = ver + 1, updated_by = $${vals.length}, updated_at = now() where tenant_id = $1 returning *`, vals)).rows[0];
    const shopChanged = 'shop' in P; if (shopChanged) { await log(c, a.tid, 'reward', { shop: before.shop }, { shop: { ...P.shop, ack: P.shop.ack ? { ...P.shop.ack, by: a.email, at: new Date().toISOString() } : undefined } }, reason, a.email, p.ver); delete before.shop; delete after.shop; }
    if (Object.keys(after).length) await log(c, a.tid, 'policy', before, after, reason, a.email, p.ver);
    return { p, changed: true };
  }
  /* 규칙 검증 · 정규화 */
  function cleanRule(b) {
    const trigger = str(b.trigger, 20); if (!S.TRIG.includes(trigger) || trigger === 'manual') throw E('bad_rule', { field: 'trigger' }, 400);
    const nature = S.PARTICIPATION.includes(trigger) ? 'participation' : (b.nature === 'participation' ? 'participation' : 'achievement');
    const score = obj(b.score) ? b.score : { mode: 'fixed', v: 0 }; if (!['fixed', 'band', 'per_unit', 'source'].includes(score.mode)) throw E('bad_rule', { field: 'score' }, 400);
    if (score.mode === 'band' && !(Array.isArray(score.bands) && score.bands.every(x => Array.isArray(x) && x.length === 2 && x.every(n => Number.isFinite(+n))))) throw E('bad_rule', { field: 'bands' }, 400);
    if ((score.mode === 'fixed' || score.mode === 'per_unit') && !(int(score.v) > 0 && int(score.v) <= 1e6)) throw E('bad_rule', { field: 'score.v' }, 400);
    const once = ['none', 'ever', 'per_src', 'per_day'].includes(b.once) ? b.once : 'per_src';
    const id = b.id ? str(b.id, 34) : S.rid('mru_'); if (!/^mru_[a-z0-9_]{1,30}$/.test(id)) throw E('bad_rule', { field: 'id' }, 400);
    return { id, trigger, nature, label: str(b.label, 80), cond: obj(b.cond) ? b.cond : {}, score, caps: obj(b.caps) ? b.caps : {}, once, groupKey: b.groupKey ? str(b.groupKey, 30) : null,
      trustMin: ['A', 'B', 'C'].includes(b.trustMin) ? b.trustMin : 'C', approval: ['auto', 'manual', 'over', 'evidence', 'two_step'].includes(b.approval) ? b.approval : 'auto', approveOver: b.approveOver == null ? null : int(b.approveOver),
      expiry: obj(b.expiry) ? b.expiry : null, record: obj(b.record) ? b.record : null, startsOn: /^\d{4}-\d\d-\d\d$/.test(b.startsOn || '') ? b.startsOn : null, endsOn: /^\d{4}-\d\d-\d\d$/.test(b.endsOn || '') ? b.endsOn : null, active: b.active !== false };
  }
  async function insRule(c, a, r) { const ver = +(await c.query('select coalesce(max(ver), 0) + 1 v from mil_rule where tenant_id = $1 and id = $2', [a.tid, r.id])).rows[0].v;
    if (r.groupKey) await c.query("insert into mil_group (tenant_id, key, label, caps) values ($1,$2,$2,'{\"term\":100}') on conflict do nothing", [a.tid, r.groupKey]);
    const row = (await c.query('insert into mil_rule (tenant_id, id, ver, trigger, nature, label, cond, score, caps, once, group_key, trust_min, approval, approve_over, expiry, record, starts_on, ends_on, active, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) returning *',
      [a.tid, r.id, ver, r.trigger, r.nature, r.label, J(r.cond), J(r.score), J(r.caps), r.once, r.groupKey, r.trustMin, r.approval, r.approveOver, J(r.expiry), J(r.record), r.startsOn, r.endsOn, r.active, a.email])).rows[0];
    await log(c, a.tid, 'rule', null, S.ruleOut(row), null, a.email); return row; }
  async function fundedBlock(c, tid, cls, cash) { if (!cash || !Array.isArray(cls)) return; for (const x of cls) if (!(await one(c, 'select mil_cash_ok($1,$2) r', [tid, str(x, 60)]))) throw E('funded_blocked'); }
  async function saveReward(c, a, b) {
    const kind = str(b.kind, 10); if (!['tuition', 'coupon', 'goods', 'badge', 'cert', 'shop'].includes(kind)) throw E('bad_rule', { field: 'kind' }, 400); /* scholar 정산은 v42.2 */
    const title = str(b.title, 60).trim(); if (!title) throw E('bad_rule', { field: 'title' }, 400);
    const cash = ['tuition', 'coupon', 'shop', 'goods'].includes(kind) ? true : b.cash === true;
    const link = obj(b.link) ? { ...b.link } : {}; if (link.priceWon != null) { link.priceWon = int(link.priceWon); if (!(link.priceWon >= 0)) throw E('bad_rule', { field: 'link.priceWon' }, 400); }
    if (link.unitId != null && !/^lu_[a-z0-9]{1,24}$/.test(String(link.unitId))) throw E('bad_rule', { field: 'link.unitId' }, 400);
    const audience = obj(b.audience) ? b.audience : {}; await fundedBlock(c, a.tid, audience.cls, cash);
    const cost = obj(b.cost) ? b.cost : { wonPerP: 1 }; if (cost.wonPerP != null && !(+cost.wonPerP >= 0 && +cost.wonPerP <= 1000)) throw E('bad_rule', { field: 'cost.wonPerP' }, 400);
    const id = b.id ? str(b.id, 34) : S.rid('mrw_'); if (!/^mrw_[a-z0-9_]{1,30}$/.test(id)) throw E('bad_rule', { field: 'id' }, 400);
    const before = (await c.query('select * from mil_reward where tenant_id = $1 and id = $2', [a.tid, id])).rows[0];
    const row = (await c.query(`insert into mil_reward (tenant_id, id, kind, title, cost, min_use, max_use, step, threshold, stock, per_sid, approval, cash, audience, active, link) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      on conflict (tenant_id, id) do update set kind = excluded.kind, title = excluded.title, cost = excluded.cost, min_use = excluded.min_use, max_use = excluded.max_use, step = excluded.step, threshold = excluded.threshold, stock = excluded.stock,
      per_sid = excluded.per_sid, approval = excluded.approval, cash = excluded.cash, audience = excluded.audience, active = excluded.active, link = excluded.link returning *`,
      [a.tid, id, kind, title, J(cost), Math.max(0, int(b.minUse) || 0), J(obj(b.maxUse) ? b.maxUse : {}), Math.max(1, int(b.step) || 1), Math.max(0, int(b.threshold) || 0), b.stock == null ? null : Math.max(0, int(b.stock)),
        J(obj(b.perSid) ? b.perSid : {}), ['auto', 'manual', 'two_step'].includes(b.approval) ? b.approval : 'manual', cash, J(audience), b.active !== false, J(link)])).rows[0];
    await log(c, a.tid, 'reward', before ? S.rwOut(before) : null, S.rwOut(row), null, a.email); return row;
  }
  /* 학원비 차감 후보 청구서: 열린 청구서 중 수납 배분 0 · 차감 줄 없음, 가장 최근 */
  async function billFor(c, tid, sid, billId) {
    const id = billId || ((await c.query(`select ch.bill_id from led_charge ch where ch.tenant_id = $1 and ch.sid = $2 and ch.status <> 'void' and not exists (select 1 from led_alloc a join led_charge x on x.tenant_id = a.tenant_id and x.id = a.charge_id where a.tenant_id = $1 and x.bill_id = ch.bill_id)
      and not exists (select 1 from led_charge m where m.tenant_id = $1 and m.bill_id = ch.bill_id and m.src_type = 'mileage' and m.status <> 'void') group by ch.bill_id order by max(ch.created_at) desc limit 1`, [tid, sid])).rows[0] || {}).bill_id;
    if (!id) return null; const lines = (await c.query("select id, title, amount, item_type, src_type, src_id, status from led_charge where tenant_id = $1 and bill_id = $2 order by created_at, id", [tid, id])).rows;
    if (!lines.length) return null;
    const paid = +(await c.query('select coalesce(sum(a.amount), 0)::int n from led_alloc a join led_charge x on x.tenant_id = a.tenant_id and x.id = a.charge_id where a.tenant_id = $1 and x.bill_id = $2', [tid, id])).rows[0].n;
    let funded = false; for (const l of lines) if (['class', 'cls'].includes(l.src_type) && l.status !== 'void' && !(await one(c, 'select mil_cash_ok($1,$2) r', [tid, l.src_id]))) funded = true;
    return { id, lines: lines.map(l => ({ id: l.id, title: l.title, amount: l.amount, itemType: l.item_type, srcType: l.src_type, status: l.status })), paid, funded, sum: lines.filter(l => l.status !== 'void').reduce((s, l) => s + l.amount, 0) };
  }
  /* 신청 확인할 점(R 요청): code · block(막는 문제) · text · fixPoints(이만큼 줄이면 됨) */
  function checksOf(d, rw, bill) { const out = [];
    if (rw.kind === 'tuition') { const wpp = +((rw.cost || {}).wonPerP != null ? rw.cost.wonPerP : 1) || 1;
      if (!bill) out.push({ code: 'no_bill', block: false, text: '붙일 청구서가 없습니다. 승인하면 다음 청구서를 만들 때 차감합니다.', fixPoints: null });
      else { if (bill.funded) out.push({ code: 'funded_blocked', block: true, text: '국비 지원 과정 청구서에는 차감할 수 없습니다.', fixPoints: null });
        if (bill.paid > 0) out.push({ code: 'bill_paid', block: true, text: '수납이 시작된 청구서입니다. 다른 청구서를 고르십시오.', fixPoints: null });
        const pct = +((rw.max_use || {}).billPct != null ? rw.max_use.billPct : 30); const max = Math.floor(bill.sum * pct / 100);
        if (d.won > max) out.push({ code: 'over_cap', block: true, text: `청구서의 ${pct}%(${max.toLocaleString('ko-KR')}원)를 넘습니다.`, fixPoints: Math.floor(max / wpp / (rw.step || 1)) * (rw.step || 1) }); } }
    if ((d.fulfil || {}).guardian === 'pending') out.push({ code: 'guardian_pending', block: true, text: '보호자 확인을 기다리는 신청입니다.', fixPoints: null });
    if (rw.stock != null && rw.stock <= 0) out.push({ code: 'out_of_stock', block: true, text: '재고가 없습니다.', fixPoints: null });
    return out; }
  /* 승인 뒤 이행: 쿠폰 코드 · 학원비 차감 줄 · 배지/인증 기록. 굿즈는 전달 확인(handed) 때, 숍은 지급 내보내기 대상 */
  async function fulfil(c, a, id, billId) {
    const d = (await c.query('select d.*, w.kind, w.link from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.id = $2', [a.tid, id])).rows[0];
    if (d.kind === 'coupon') { for (let i = 0; i < 5; i++) { const code = S.couponCode(); if ((await c.query("select 1 from mil_redeem where tenant_id = $1 and fulfil->>'couponCode' = $2", [a.tid, code])).rowCount) continue;
      return ok(await one(c, 'select mil_redeem_fulfil($1,$2,$3) r', [a.tid, id, J({ couponCode: code, until: MC.kst(Date.now() + 90 * 864e5) })])); } }
    if (d.kind === 'tuition') { const b = await billFor(c, a.tid, d.sid, billId); if (!b) return { ok: true, status: 'approved', note: 'no_bill' }; return ok(await one(c, 'select mil_add_line($1,$2,$3) r', [a.tid, b.id, id])); }
    if (d.kind === 'badge' || d.kind === 'cert') return ok(await one(c, 'select mil_redeem_fulfil($1,$2,$3) r', [a.tid, id, J({ at: new Date().toISOString(), badgeId: (d.link || {}).badgeId || null })]));
    return { ok: true, status: 'approved' };
  }
  async function decideOne(a, id, b) { return T(a, async c => {
    if (/^me_/.test(id)) { if (b.decision === 'approve') return ok(await one(c, 'select mil_post($1,$2) r', [a.tid, id])); if (!str(b.reason, 200).trim()) throw E('reason');
      const r = ok(await one(c, 'select mil_void($1,$2) r', [a.tid, id])); await audit(c, a.tid, a.email, 'mileage.earn.reject', { id, reason: str(b.reason, 200) }); return r; }
    if (/^mpf_/.test(id)) return proofDecide(c, a, id, b);
    if (!/^mrd_[a-z0-9]{12}$/.test(id)) throw E('not_found');
    let r;
    if (b.decision === 'adjust') { ok(await one(c, 'select mil_redeem_adjust($1,$2,$3,$4,$5) r', [a.tid, id, int(b.points), a.email, str(b.reason, 200) || null])); r = ok(await one(c, "select mil_redeem_decide($1,$2,'approve',$3,$4) r", [a.tid, id, a.email, str(b.reason, 200) || null])); }
    else if (b.decision === 'approve') r = ok(await one(c, "select mil_redeem_decide($1,$2,'approve',$3,null) r", [a.tid, id, a.email]));
    else if (b.decision === 'reject') r = ok(await one(c, "select mil_redeem_decide($1,$2,'reject',$3,$4) r", [a.tid, id, a.email, str(b.reason, 200)]));
    else throw E('bad_rule', { field: 'decision' }, 400);
    if (r.status === 'approved') r = { ...r, ...(await fulfil(c, a, id, b.billId ? str(b.billId, 40) : null)) };
    await audit(c, a.tid, a.email, 'mileage.redeem.' + b.decision, { id, points: r.points, status: r.status }); return r; }); }
  async function proofDecide(c, a, id, b) {
    const p = (await c.query('select * from mil_proof where tenant_id = $1 and id = $2 for update', [a.tid, id])).rows[0]; if (!p) throw E('not_found'); if (p.status !== 'submitted') throw E('state');
    if (b.decision !== 'approve') { const why = str(b.reason, 200).trim(); if (!why) throw E('reason'); await c.query("update mil_proof set status = 'rejected', reason = $3, decided_by = $4, purge_at = now() + interval '30 days' where tenant_id = $1 and id = $2", [a.tid, id, why, a.email]); return { ok: true, id, status: 'rejected' }; }
    const r = await one(c, "select mil_emit($1,$2,'evidence','pf',$3,$4,'B',coalesce($5::timestamptz, now()),$6,'lu_root') r", [a.tid, p.sid, id, b.points == null ? null : int(b.points), null, p.item || null]);
    await c.query("update mil_proof set status = 'approved', points = $3, decided_by = $4, purge_at = now() + interval '90 days' where tenant_id = $1 and id = $2", [a.tid, id, ((r.entries || [])[0] || {}).points || 0, a.email]);
    return { ok: true, id, status: 'approved', result: r }; }

  const R = {
    'GET /api/mileage/config': async req => { const a = await need(req); return T(a, async c => { const p = await S.pol(c, a.tid); const rewards = await rewardsOf(c);
      const policy = p ? S.polOut(p) : { ...MC.DEFAULT_POLICY, on: false }; const d = await S.docOf(c, a.tid);
      return { ok: true, policy, rules: (await latestRules(c)).rows.map(S.ruleOut), groups: (await c.query('select key, label, caps from mil_group where tenant_id = $1', [a.tid])).rows, rewards, template: p ? p.template : null,
        suggested: MC.templateKey(d.org && d.org.type, d.org && d.org.ed), recommended: (p && p.recommended) || MC.RECOMMEND, fixed: S.FIXED, warnings: MC.warnings(policy, rewards), hqPoolReviewed: env.MIL_HQ_POOL_REVIEWED === '1' }; }); },
    'POST /api/mileage/config': async req => { const a = await needOwner(req); const b = await readBody(req, 32 * 1024); if (!obj(b.policy)) throw E('bad_rule', { field: 'policy' }, 400);
      return T(a, async c => { const { p } = await savePolicy(c, a, b.policy, str(b.reason, 200)); return { ok: true, policy: S.polOut(p), warnings: MC.warnings(S.polOut(p), await rewardsOf(c)) }; }); },
    'POST /api/mileage/onoff': async req => { const a = await needOwner(req); const b = await readBody(req, 2048); return T(a, async c => { const p = await S.ensurePol(c, a.tid);
      if (b.on === true) { if (!p.draft_hash) throw E('need_draft'); await c.query('update mil_policy set is_on = true, updated_by = $2, updated_at = now() where tenant_id = $1', [a.tid, a.email]); }
      else { if ((await c.query('select 1 from mil_entry where tenant_id = $1 limit 1', [a.tid])).rowCount) throw E('need_sunset'); await c.query('update mil_policy set is_on = false, updated_by = $2, updated_at = now() where tenant_id = $1', [a.tid, a.email]); }
      await log(c, a.tid, 'onoff', { on: p.is_on }, { on: b.on === true }, str(b.reason, 200), a.email, p.ver); return { ok: true, on: b.on === true }; }); },
    'POST /api/mileage/rank-penalty': async req => { const a = await needOwner(req); const b = await readBody(req, 8192); const ack = b.ack || {};
      if (ack.read !== true || !str(ack.reason, 200).trim()) throw E('ack_required');
      return T(a, async c => { const p = await S.ensurePol(c, a.tid); const stamp = { by: a.email, at: new Date().toISOString(), reason: str(ack.reason, 200), noticeVer: 'R2-6-1' }; const sets = []; const vals = [a.tid];
        if (obj(b.rank)) { vals.push(J({ on: b.rank.on === true, scope: ['near10', 'group', 'all'].includes(b.rank.scope) ? b.rank.scope : 'near10', name: ['nick', 'initial', 'real'].includes(b.rank.name) ? b.rank.name : 'nick', ack: stamp })); sets.push(`rank = $${vals.length}`); }
        if (obj(b.penalty)) { vals.push(J({ on: b.penalty.on === true, reasons: Array.isArray(b.penalty.reasons) ? b.penalty.reasons.slice(0, 20).map(x => str(x, 40)) : [], maxOnce: b.penalty.maxOnce == null ? null : int(b.penalty.maxOnce), dayCap: b.penalty.dayCap == null ? null : int(b.penalty.dayCap), ack: stamp })); sets.push(`penalty = $${vals.length}`); }
        if (!sets.length) throw E('bad_rule', { field: 'rank|penalty' }, 400);
        vals.push(a.email); const n = (await c.query(`update mil_policy set ${sets.join(', ')}, ver = ver + 1, updated_by = $${vals.length}, updated_at = now() where tenant_id = $1 returning *`, vals)).rows[0];
        await log(c, a.tid, 'rank_penalty', { rank: p.rank, penalty: p.penalty }, { rank: n.rank, penalty: n.penalty }, stamp.reason, a.email, n.ver); return { ok: true, rank: n.rank, penalty: n.penalty, noticeVer: stamp.noticeVer }; }); },
    'POST /api/mileage/funded': async req => { const a = await needOwner(req); const b = await readBody(req, 2048); const cls = str(b.clsId, 60); if (!cls) throw E('bad_rule', { field: 'clsId' }, 400);
      return T(a, async c => { const before = (await c.query('select * from mil_funded where tenant_id = $1 and cls_id = $2', [a.tid, cls])).rows[0];
        await c.query('insert into mil_funded (tenant_id, cls_id, funded, source, set_by) values ($1,$2,$3,$4,$5) on conflict (tenant_id, cls_id) do update set funded = excluded.funded, source = excluded.source, set_by = excluded.set_by, at = now()',
          [a.tid, cls, b.funded === true, ['naeil', 'moel', 'etc', 'profile'].includes(b.source) ? b.source : 'etc', a.email]);
        await log(c, a.tid, 'funded', before ? { clsId: cls, funded: before.funded } : null, { clsId: cls, funded: b.funded === true }, str(b.reason, 200), a.email); return { ok: true, clsId: cls, funded: b.funded === true }; }); },
    'POST /api/mileage/rules': async req => { const a = await needStaff(req); const b = await readBody(req, 16 * 1024); const r = cleanRule(b);
      return T(a, async c => { const row = await insRule(c, a, r); const w = []; if (row.nature === 'achievement' && row.trust_min === 'C') w.push({ code: 'trust_c', msg: '기기 보고(C) 사건 적립은 현금성 보상에 쓰이지 않습니다.' });
        return { ok: true, rule: S.ruleOut(row), warnings: w }; }); },
    'POST /api/mileage/draft': async req => { const a = await needStaff(req); const b = await readBody(req, 4096);
      return T(a, async c => { const d = await S.docOf(c, a.tid); const t = MC.template(d.org && d.org.type, b.template || (d.org && d.org.ed), obj(b.budget) ? b.budget : null);
        const ev = await eventsOf(c, a.tid, 30); const draft = { policy: t.policy, rules: t.rules, rewards: t.rewards };
        const draftHash = S.sha(JSON.stringify(draft)); await S.ensurePol(c, a.tid); await c.query('update mil_policy set draft_hash = $2 where tenant_id = $1 and not is_on', [a.tid, draftHash]);
        return { ok: true, template: t.template, label: t.label, ...draft, simulate: MC.simulate(t.policy, t.rules, t.rewards, ev), warnings: t.warnings, draftHash }; }); },
    'POST /api/mileage/simulate': async req => { const a = await needStaff(req); const b = await readBody(req, 64 * 1024); const days = Math.min(Math.max(int(b.days) || 30, 1), 90);
      return T(a, async c => { const p = await S.pol(c, a.tid); const pol = obj(b.policy) ? b.policy : p ? { ...MC.DEFAULT_POLICY, expiry: p.expiry, dailyCapTotal: p.daily_cap_total, budget: p.budget, cashLock: p.cash_lock } : MC.DEFAULT_POLICY;
        const rules = Array.isArray(b.rules) ? b.rules.slice(0, 50).map(cleanRule) : (await latestRules(c)).rows.map(S.ruleOut);
        return { ok: true, days, ...MC.simulate(pol, rules, Array.isArray(b.rewards) ? b.rewards : await rewardsOf(c), await eventsOf(c, a.tid, days)) }; }); },
    'POST /api/mileage/enable': async req => { const a = await needOwner(req); const b = await readBody(req, 64 * 1024); const d = b.draft || {};
      /* 화면 순서: draft → config · rules · rewards 저장 → enable{draftHash}(draft가 기록한 해시와 같아야 함). draft 본문을 함께 보내면 한 번에 저장 · 켜기 */
      if (!b.draft) return T(a, async c => { const p = await S.ensurePol(c, a.tid); if (!p.draft_hash || p.draft_hash !== str(b.draftHash, 64)) throw E('need_draft');
        await c.query('update mil_policy set is_on = true, updated_by = $2, updated_at = now() where tenant_id = $1', [a.tid, a.email]); await log(c, a.tid, 'onoff', { on: p.is_on }, { on: true, draftHash: p.draft_hash }, '켜기 마법사', a.email, p.ver);
        await audit(c, a.tid, a.email, 'mileage.enable', {}); return { ok: true, on: true, policy: S.polOut(await S.pol(c, a.tid)) }; });
      if (!obj(d.policy) || !Array.isArray(d.rules) || S.sha(JSON.stringify({ policy: d.policy, rules: d.rules, rewards: d.rewards || [] })) !== b.draftHash && S.sha(JSON.stringify(d)) !== b.draftHash) throw E('amount_mismatch', { field: 'draftHash' }, 400);
      return T(a, async c => { await S.ensurePol(c, a.tid); const P = {}; for (const k of Object.keys(PCOL)) if (k in d.policy && k !== 'shop') P[k] = d.policy[k];
        await savePolicy(c, a, P, '켜기 마법사');
        for (const r of d.rules.slice(0, 50)) await insRule(c, a, cleanRule(r));
        for (const r of (d.rewards || []).slice(0, 30)) await saveReward(c, a, r);
        await c.query('update mil_policy set is_on = true, draft_hash = $2, template = $3, recommended = $4, updated_by = $5, updated_at = now() where tenant_id = $1', [a.tid, b.draftHash, str(d.policy.template, 20) || null, J(d), a.email]);
        await log(c, a.tid, 'onoff', { on: false }, { on: true, draftHash: b.draftHash }, '켜기 마법사', a.email); await audit(c, a.tid, a.email, 'mileage.enable', { rules: d.rules.length });
        return { ok: true, on: true, policy: S.polOut(await S.pol(c, a.tid)) }; }); },
    'GET /api/mileage/summary': async req => { const a = await need(req); const Q = q(req); const t = MC.kst(Date.now()); const from = /^\d{4}-\d\d-\d\d$/.test(Q.get('from') || '') ? Q.get('from') : t.slice(0, 8) + '01'; const to = /^\d{4}-\d\d-\d\d$/.test(Q.get('to') || '') ? Q.get('to') : t;
      return T(a, async c => { const k = (await c.query("select kind, coalesce(sum(points), 0)::int p, count(*)::int n from mil_entry where tenant_id = $1 and status = 'posted' and mil_kst(at) between $2 and $3 group by kind", [a.tid, from, to])).rows;
        const by = Object.fromEntries(k.map(x => [x.kind, x.p])); const w = (await c.query('select coalesce(sum(balance), 0)::int bal, coalesce(sum(convertible), 0)::int conv, count(*)::int n, count(*) filter (where balance > 0)::int act from mil_wallet where tenant_id = $1', [a.tid])).rows[0];
        const byRule = (await c.query("select rule_id, trigger, sum(points)::int p, count(*)::int n from mil_entry where tenant_id = $1 and kind = 'earn' and status = 'posted' and mil_kst(at) between $2 and $3 group by rule_id, trigger order by p desc", [a.tid, from, to])).rows;
        const p = await S.pol(c, a.tid); const mp = p && p.budget && p.budget.monthP; const used = +(await c.query("select coalesce(sum(points), 0)::int n from mil_entry where tenant_id = $1 and kind = 'earn' and convertible and status <> 'void' and mil_kst(at) >= date_trunc('month', mil_kst(now()))::date", [a.tid])).rows[0].n;
        const cnt = async s => +(await c.query(s, [a.tid])).rows[0].n;
        return { ok: true, from, to, earned: by.earn || 0, used: -(by.use || 0), expired: -(by.expire || 0), cancelled: -(by.cancel || 0), restored: by.restore || 0, adjusted: by.adjust || 0, outstanding: w.bal, outstandingConvertible: w.conv,
          wonEstimate: w.conv, wallets: w.n, participation: w.n ? Math.round(w.act * 100 / w.n) : 0, byRule: byRule.map(x => ({ ruleId: x.rule_id, trigger: x.trigger, points: x.p, n: x.n })),
          budget: mp ? { monthP: +mp, used, pct: Math.round(used * 100 / +mp) } : null,
          pending: { earn: await cnt("select count(*)::int n from mil_entry where tenant_id = $1 and status = 'pending'"), redeem: await cnt("select count(*)::int n from mil_redeem where tenant_id = $1 and status = 'requested'"), proof: await cnt("select count(*)::int n from mil_proof where tenant_id = $1 and status = 'submitted'") },
          flags: await cnt("select count(*)::int n from mil_flag where tenant_id = $1 and status = 'open'") }; }); },
    'GET /api/mileage/entries': async req => { const a = await need(req); const Q = q(req); const lim = Math.min(Math.max(int(Q.get('limit')) || 50, 1), 200); const cond = ['tenant_id = $1']; const v = [a.tid];
      if (Q.get('sid')) { v.push(str(Q.get('sid'), 80)); cond.push(`sid = $${v.length}`); } if (Q.get('kind')) { v.push(str(Q.get('kind'), 10)); cond.push(`kind = $${v.length}`); }
      if (/^\d{4}-\d\d-\d\d$/.test(Q.get('from') || '')) { v.push(Q.get('from')); cond.push(`mil_kst(at) >= $${v.length}`); } if (/^\d{4}-\d\d-\d\d$/.test(Q.get('to') || '')) { v.push(Q.get('to')); cond.push(`mil_kst(at) <= $${v.length}`); }
      if (Q.get('after')) { const [t, id] = String(Q.get('after')).split('|'); if (!Number.isNaN(Date.parse(t))) { v.push(t, str(id, 20)); cond.push(`(at, id) < ($${v.length - 1}::timestamptz, $${v.length})`); } }
      return T(a, async c => { const rows = (await c.query(`select * from mil_entry where ${cond.join(' and ')} order by at desc, id desc limit ${lim + 1}`, v)).rows; const more = rows.length > lim; const list = rows.slice(0, lim);
        return { ok: true, entries: list.map(S.enOut), after: more ? `${list[list.length - 1].at.toISOString()}|${list[list.length - 1].id}` : null }; }); },
    'GET /api/mileage/wallet': async req => { const a = await need(req); const sid = str(q(req).get('sid'), 80); if (!sid) throw E('not_found'); return T(a, c => walletOf(c, a.tid, sid)); },
    'POST /api/mileage/events': async req => { const a = await needStaff(req); const b = await readBody(req, 128 * 1024); const L = Array.isArray(b.events) ? b.events : []; if (!L.length || L.length > 200) throw E('bad_rule', { field: 'events' }, 400);
      return T(a, async c => { const out = []; for (const x of L) { const trig = str(x.trigger, 20); if (!S.TRIG.includes(trig) || trig === 'manual' || !S.SID_OK.test(String(x.sid || '')) || !x.srcType || x.srcId == null) { out.push({ status: 'skipped', reason: 'bad_event' }); continue; }
          const at = x.at && Date.parse(x.at) <= Date.now() ? new Date(x.at).toISOString() : null;
          const r = await one(c, "select mil_emit($1,$2,$3,$4,$5,$6,'B',coalesce($7::timestamptz, now()),$8,coalesce($9,'lu_root')) r", [a.tid, String(x.sid), trig, str(x.srcType, 20), str(x.srcId, 120), x.value == null ? null : +x.value, at, x.cls ? str(x.cls, 60) : null, x.unit ? str(x.unit, 30) : null]);
          out.push({ status: r.status, entryId: ((r.entries || [])[0] || {}).id || null, points: (r.entries || []).reduce((s, e) => s + e.points, 0), reason: r.reason || null }); }
        await audit(c, a.tid, a.email, 'mileage.events', { n: L.length, done: out.filter(x => x.status === 'done').length }); return { ok: true, results: out }; }); },
    'POST /api/mileage/grant': async req => { const a = await needStaff(req); const b = await readBody(req, 16 * 1024); const sids = [...new Set((Array.isArray(b.sids) ? b.sids : [b.sid]).map(x => String(x || '')).filter(x => S.SID_OK.test(x)))].slice(0, 200);
      const idem = str(b.idem, 60); if (!sids.length || !idem) throw E('bad_rule', { field: 'sids|idem' }, 400); limit(`milg:${a.tid}:${a.email}`, 30, 60e3);
      const self = await S.selfSids(a.tid, a.email); if (sids.some(s => self.has(s))) { await inTenant(pool, a.tid, c => c.query("insert into mil_flag (tenant_id, id, sid, kind, evidence) values ($1,$2,$3,'self_grant',$4)", [a.tid, S.rid('mfl_'), sids.find(s => self.has(s)), J({ staff: S.sha(a.email).slice(0, 16) })])); throw E('self_grant'); }
      return T(a, async c => { const out = []; for (const sid of sids) out.push({ sid, ...ok(await one(c, 'select mil_grant($1,$2,$3,false,$4,$5,$6,$7,$8,now(),$9) r', [a.tid, a.email, a.role === 'owner', sid, b.unit ? str(b.unit, 30) : 'lu_root', int(b.points), str(b.reason, 200), `${idem}:${sid}`, b.penalty === true])) });
        await audit(c, a.tid, a.email, b.penalty ? 'mileage.penalty' : 'mileage.grant', { n: sids.length, points: int(b.points), reason: str(b.reason, 200) }); return { ok: true, results: out }; }); },
    'POST /api/mileage/cancel': async req => { const a = await needStaff(req); const b = await readBody(req, 2048); return T(a, async c => { const r = ok(await one(c, 'select mil_cancel($1,$2,$3,$4) r', [a.tid, str(b.entryId, 20), str(b.reason, 200), a.email]));
      await audit(c, a.tid, a.email, 'mileage.cancel', { entry: str(b.entryId, 20), reason: str(b.reason, 200) }); return r; }); },
    'GET /api/mileage/approvals': async req => { const a = await need(req); const type = q(req).get('type') || 'redeem';
      return T(a, async c => {
        if (type === 'earn') { const rows = (await c.query("select * from mil_entry where tenant_id = $1 and status = 'pending' order by at limit 200", [a.tid])).rows;
          const fl = new Set((await c.query("select sid from mil_flag where tenant_id = $1 and status = 'open'", [a.tid])).rows.map(r => r.sid));
          return { ok: true, type, items: rows.map(e => ({ ...S.enOut(e), checks: fl.has(e.sid) ? [{ code: 'flag_open', block: false, text: '부정 의심 기록이 열려 있는 학습자입니다.', fixPoints: null }] : [] })) }; }
        if (type === 'proof') return { ok: true, type, items: (await c.query("select * from mil_proof where tenant_id = $1 and status = 'submitted' order by at limit 200", [a.tid])).rows.map(p => ({ id: p.id, sid: p.sid, ruleId: p.rule_id, item: p.item, activityOn: p.activity_on, fileRef: p.file_ref, ai: p.ai, at: p.at })) };
        const rows = (await c.query("select d.*, row_to_json(w) rw from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.status = 'requested' order by d.at limit 200", [a.tid])).rows; const items = [];
        for (const d of rows) { const bill = d.rw.kind === 'tuition' ? await billFor(c, a.tid, d.sid, null) : null; const { sum, ...billOut } = bill || {};
          items.push({ ...S.rdOut(d), reward: S.rwOut(d.rw), bill: bill ? billOut : null, checks: checksOf(d, d.rw, bill) }); }
        return { ok: true, type: 'redeem', items }; }); },
    'POST /api/mileage/approvals/decide': async req => { const a = await needStaff(req); const b = await readBody(req, 16 * 1024); const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(x => str(x, 20)))].slice(0, 100);
      if (!ids.length || !['approve', 'reject', 'adjust'].includes(b.decision)) throw E('bad_rule', { field: 'ids|decision' }, 400); if (b.decision === 'adjust' && !(int(b.points) > 0)) throw E('bad_points');
      const out = []; for (const id of ids) { try { out.push({ id, ...(await decideOne(a, id, b)) }); } catch (e) { if (!e.status) throw e; out.push({ id, ok: false, error: e.code, message: e.message, ...(e.extra || {}) }); } }
      return { ok: out.every(x => x.ok !== false), results: out }; },
    'POST /api/mileage/rewards': async req => { const a = await needStaff(req); const b = await readBody(req, 16 * 1024);
      return T(a, async c => { const row = await saveReward(c, a, b); const p = await S.pol(c, a.tid); return { ok: true, reward: S.rwOut(row), warnings: MC.warnings(p ? S.polOut(p) : {}, [S.rwOut(row)]).filter(w => w.code !== 'no_budget' || ['tuition', 'coupon', 'shop'].includes(row.kind)) }; }); },
    'GET /api/mileage/redeems': async req => { const a = await need(req); const Q = q(req); const v = [a.tid]; let w = '';
      if (Q.get('status')) { v.push(str(Q.get('status'), 12)); w += ` and status = $${v.length}`; } if (Q.get('sid')) { v.push(str(Q.get('sid'), 80)); w += ` and sid = $${v.length}`; }
      return T(a, async c => ({ ok: true, redeems: (await c.query(`select * from mil_redeem where tenant_id = $1${w} order by at desc limit 300`, v)).rows.map(S.rdOut) })); },
    'POST /api/mileage/redeems/cancel': async req => { const a = await needStaff(req); const b = await readBody(req, 2048); const id = str(b.id, 20); const why = str(b.reason, 200).trim(); if (!why) throw E('reason');
      return T(a, async c => { const d = (await c.query('select d.*, w.kind from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.id = $2 for update of d', [a.tid, id])).rows[0]; if (!d) throw E('not_found');
        let r; if (d.status === 'requested') r = ok(await one(c, "select mil_redeem_decide($1,$2,'cancel',$3,$4) r", [a.tid, id, a.email, why]));
        else { if (d.fulfil && d.fulfil.chargeId) { if ((await c.query('select 1 from led_alloc a join led_charge x on x.tenant_id = a.tenant_id and x.id = a.charge_id where a.tenant_id = $1 and x.bill_id = $2', [a.tid, d.fulfil.billId])).rowCount) throw E('bill_paid');
            await c.query("update led_charge set status = 'void' where tenant_id = $1 and id = $2 and src_type = 'mileage'", [a.tid, d.fulfil.chargeId]); }
          if (d.fulfil && d.fulfil.couponCode && +(await c.query("select count(*)::int n from learner_events where tenant_id = $1 and type = 'pay' and upper(data->>'cpn') = $2", [a.tid, d.fulfil.couponCode])).rows[0].n) throw E('state', { used: true });
          r = ok(await one(c, 'select mil_redeem_reclaim($1,$2,$3,$4) r', [a.tid, id, why, a.email])); }
        await audit(c, a.tid, a.email, 'mileage.redeem.cancel', { id, from: d.status, reason: why }); return r; }); },
    'POST /api/mileage/redeems/handed': async req => { const a = await needStaff(req); const b = await readBody(req, 1024); const id = str(b.id, 20);
      return T(a, async c => { const d = (await c.query('select d.status, w.kind from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.id = $2', [a.tid, id])).rows[0]; if (!d) throw E('not_found');
        if (!['goods', 'shop'].includes(d.kind)) throw E('kind'); const r = ok(await one(c, 'select mil_redeem_fulfil($1,$2,$3) r', [a.tid, id, J({ handedAt: new Date().toISOString(), handedBy: a.email })]));
        await audit(c, a.tid, a.email, 'mileage.redeem.handed', { id }); return r; }); },
    'GET /api/mileage/flags': async req => { const a = await need(req); return T(a, async c => ({ ok: true, flags: (await c.query("select * from mil_flag where tenant_id = $1 order by (status = 'open') desc, at desc limit 300", [a.tid])).rows.map(f => ({ id: f.id, sid: f.sid, kind: f.kind, evidence: f.evidence, status: f.status, resolvedBy: f.resolved_by, at: f.at })) })); },
    'POST /api/mileage/flags/resolve': async req => { const a = await needStaff(req); const b = await readBody(req, 2048); const why = str(b.reason, 200).trim(); if (!why) throw E('reason'); if (!['clear', 'confirm'].includes(b.decision)) throw E('bad_rule', { field: 'decision' }, 400);
      return T(a, async c => { const f = (await c.query("select * from mil_flag where tenant_id = $1 and id = $2 and status = 'open' for update", [a.tid, str(b.id, 20)])).rows[0]; if (!f) throw E('state');
        const held = (await c.query("select id from mil_entry where tenant_id = $1 and sid = $2 and status = 'pending' and (event_id = ($3::jsonb->>'event')::bigint or id = any($4))", [a.tid, f.sid, J(f.evidence), f.held_entries])).rows.map(r => r.id);
        for (const id of held) ok(await one(c, `select ${b.decision === 'clear' ? 'mil_post' : 'mil_void'}($1,$2) r`, [a.tid, id]));
        await c.query('update mil_flag set status = $3, resolved_by = $4, evidence = evidence || $5 where tenant_id = $1 and id = $2', [a.tid, f.id, b.decision === 'clear' ? 'cleared' : 'confirmed', a.email, J({ reason: why })]);
        await audit(c, a.tid, a.email, 'mileage.flag.' + b.decision, { id: f.id, entries: held.length, reason: why }); return { ok: true, id: f.id, status: b.decision === 'clear' ? 'cleared' : 'confirmed', entries: held.length }; }); },
    'GET /api/mileage/proofs': async req => { const a = await need(req); return T(a, async c => ({ ok: true, proofs: (await c.query('select * from mil_proof where tenant_id = $1 order by at desc limit 300', [a.tid])).rows.map(p => ({ id: p.id, sid: p.sid, ruleId: p.rule_id, item: p.item, activityOn: p.activity_on, fileRef: p.file_ref, ai: p.ai, status: p.status, points: p.points, reason: p.reason, at: p.at })) })); },
    'POST /api/mileage/proofs/decide': async req => { const a = await needStaff(req); const b = await readBody(req, 2048); return T(a, async c => proofDecide(c, a, str(b.id, 20), b)); },
    'POST /api/mileage/sunset': async req => { const a = await needOwner(req); const b = await readBody(req, 2048); const t = k => b[k] && !Number.isNaN(Date.parse(b[k])) ? new Date(b[k]).toISOString() : null;
      const s = { noticeAt: t('noticeAt'), stopEarnAt: t('stopEarnAt'), endAt: t('endAt'), mode: ['expire', 'convert', 'migrate'].includes(b.mode) ? b.mode : 'expire' };
      if (!s.noticeAt || !s.stopEarnAt || !s.endAt || !(s.noticeAt <= s.stopEarnAt && s.stopEarnAt <= s.endAt)) throw E('bad_rule', { field: 'dates' }, 400);
      const warn = Date.parse(s.endAt) - Date.parse(s.noticeAt) < 180 * 864e5 ? [{ code: 'sunset_short', msg: '종료 예고 기간이 6개월보다 짧습니다(권장 6개월).' }] : [];
      return T(a, async c => { const p = await S.ensurePol(c, a.tid); await c.query('update mil_policy set sunset = $2, ver = ver + 1, updated_by = $3, updated_at = now() where tenant_id = $1', [a.tid, J(s), a.email]);
        await log(c, a.tid, 'sunset', p.sunset, s, str(b.reason, 200), a.email, p.ver + 1); return { ok: true, sunset: s, warnings: warn }; }); },
    'POST /api/mileage/import-q': async req => { const a = await needOwner(req); const b = await readBody(req, 1024);
      return T(a, async c => { const r = ok(await one(c, 'select mil_import_q($1,$2,$3) r', [a.tid, b.dryRun !== false, b.expiredMode === 'keep' ? 'keep' : 'expire'])); if (b.dryRun === false) await audit(c, a.tid, a.email, 'mileage.import_q', r); return r; }); },
    'GET /api/mileage/log': async req => { const a = await need(req); const area = q(req).get('area'); return T(a, async c => ({ ok: true, log: (await c.query('select id, ver, area, before, after, reason, by_staff "by", at from mil_policy_log where tenant_id = $1 and ($2::text is null or area = $2) order by id desc limit 200', [a.tid, area || null])).rows })); },
    'GET /api/mileage/shop/payouts': async req => { const a = await needStaff(req); const ym = ymOf(q(req).get('ym')); return T(a, c => payouts(c, a.tid, ym)); },
    'POST /api/mileage/shop/payouts/send': async req => { const a = await needOwner(req); const b = await readBody(req, 2048); const ym = ymOf(b.ym); const to = str(b.to, 120).trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw E('bad_rule', { field: 'to' }, 400);
      limit(`milpay:${a.tid}`, 5, 3600e3);
      const P = await T(a, c => payouts(c, a.tid, ym)); const csv = ['내부ID,소속,품목,수량,지급일,시가(원)', ...P.rows.map(r => [r.sid, r.dept, r.item, r.qty, r.at, r.priceWon].map(x => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`).join(','))].join('\r\n');
      const M = createMailer(env); let sent = false; if (M.on) { try { await M.send({ to, subject: `[디디쌤] ${ym} 리워드 숍 지급 내역(급여 담당용)`, text: `${ym} 리워드 숍 지급 내역입니다. 복지포인트성 지급은 근로소득 과세 대상일 수 있습니다(안내 G).\n\n${csv}` }); sent = true; } catch { sent = false; } }
      await T(a, c => log(c, a.tid, 'reward', null, { payoutYm: ym, to: to.replace(/^(.).*(@.*)$/, '$1***$2'), rows: P.rows.length, sent }, null, a.email));
      return { ok: true, ym, rows: P.rows.length, sent, csv: sent ? null : csv }; }
  };
  async function payouts(c, tid, ym) {
    const rows = (await c.query(`select d.id, d.sid, d.points, d.won, d.at, d.fulfil, w.title, w.link, coalesce(l.dept, '') dept from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id
      left join learners l on l.tenant_id = d.tenant_id and l.sid = d.sid where d.tenant_id = $1 and w.kind = 'shop' and d.status in ('approved','fulfilled') and to_char(mil_kst(d.at), 'YYYY-MM') = $2 order by d.at`, [tid, ym])).rows;
    const sent = (await c.query("select after, by_staff, at from mil_policy_log where tenant_id = $1 and area = 'reward' and after->>'payoutYm' = $2 order by id", [tid, ym])).rows.map(r => ({ to: r.after.to, rows: r.after.rows, sent: r.after.sent, by: r.by_staff, at: r.at }));
    return { ok: true, ym, rows: rows.map(r => ({ id: r.id, sid: r.sid, dept: r.dept, item: r.title, qty: 1, at: MC.kst(r.at), priceWon: (r.link && r.link.priceWon != null) ? r.link.priceWon : r.won })), sent }; }
  async function eventsOf(c, tid, days) { return (await c.query("select sid, trigger, src_type \"srcType\", src_id \"srcId\", value, trust, cls_id cls, scope_unit unit, occurred_at at from mil_event where tenant_id = $1 and occurred_at > now() - make_interval(days => $2) order by occurred_at limit 20000", [tid, days])).rows
    .map(e => ({ ...e, value: e.value == null ? null : +e.value, at: e.at.toISOString() })); }
  async function walletOf(c, tid, sid) { const units = (await c.query('select scope_unit, streak from mil_wallet where tenant_id = $1 and sid = $2', [tid, sid])).rows; const wallets = [];
    for (const u of units) wallets.push({ unit: u.scope_unit, ...(await one(c, 'select mil_sync($1,$2,$3) r', [tid, sid, u.scope_unit])), streak: u.streak });
    const tl = (await c.query('select * from mil_entry where tenant_id = $1 and sid = $2 order by at desc, id desc limit 50', [tid, sid])).rows.map(S.enOut);
    return { ok: true, sid, wallets, timeline: tl }; }
  return { match: (method, p) => R[`${method} ${p}`], walletOf };
};
