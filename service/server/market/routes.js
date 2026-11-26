'use strict';
/* /api/market/*(spec v1.1 8장 + dev-addendum 3장) · /api/pub/<tid>/mk-*(8-5). 권한: need · needStaff(교수자 제외) · needOwner · needSanta · needCp(mk_party.kind='cp' + staff).
   쓰기 요청은 idem 필수(멱등), 금액 · 크레딧은 calc로 서버가 다시 계산. 교차 표는 로그인 계정으로 읽되 모든 질의에 기관 조건을 둔다. */
module.exports = (ctx, S) => {
  const { readBody, limit, lauth, pool, inTenant } = ctx;
  /* 권한 함수가 요청 범위(기관 · 산타)를 정한다 → tx()의 RLS 세션 변수. 산타 범위는 needSanta 경로에서만 */
  const bind = f => async req => { const a = await f(req); S.scopeSet(a.tid, false); return a; };
  const need = bind(ctx.need), needStaff = bind(ctx.needStaff), needOwner = bind(ctx.needOwner);
  const { E, calc, rid, str, int, kstDay, DAY_RE, tx, q1, log, idem, party, eligible, needPilot, needPaid, isCp, priceRows, priceNow, optinRow, lotsOf, lotOut, liveLots, liveContract, sidHash } = S;
  const isSanta = a => !!(ctx.isSanta && ctx.isSanta(a));
  const needSanta = async req => { const a = await need(req); if (!isSanta(a)) throw E(403, 'santa', '산타 관리자만 쓸 수 있습니다.'); limit(`mk-santa:${a.email}`, 240, 60e3); S.scopeSet(a.tid, true); return a; };
  const needCp = async req => { const a = await needStaff(req); const p = await tx(c => party(c, a.tid)); if (!isCp(p)) throw E(403, 'mk_cp'); return a; };
  const Q = req => new URL(req.url, 'http://x').searchParams;
  const body = req => readBody(req, 32 * 1024);
  const today = () => kstDay();
  const ym = () => today().slice(0, 7);
  const pageOf = (q, items) => { const page = Math.max(1, int(q.get('page')) || 1); const size = Math.min(100, Math.max(1, int(q.get('size')) || 20)); return { items: items.slice((page - 1) * size, page * size), page, total: items.length }; };
  const arr = (v, n, re) => Array.isArray(v) ? [...new Set(v.map(x => str(x, 40)).filter(x => !re || re.test(x)))].slice(0, n) : [];
  const COL_RE = /^mc_[a-z0-9]{3,24}$/, PID_RE = /^mp_[a-z0-9]{12}$/;
  const LIC = ['stream', 'lms_export', 'adapt'];

  /* ── 상품 읽기 ── */
  const PROD_SQL = `select p.*, to_char(p.launched_at, 'YYYY-MM-DD') la, pa.cp_name, pr.id price_id, pr.list_price, pr.credits, pr.vol_rules, pr.lic_allowed, pr.lic_add_bp, pr.floor_price,
      o.mode, o.single_months, to_char(o.credit_from, 'YYYY-MM-DD') cf, to_char(o.min_until, 'YYYY-MM-DD') mu, o.withdrawn_at
    from mk_product p left join mk_party pa on pa.tid = p.owner_tid
    left join lateral (select * from mk_price where product_id = p.id and effective_from <= $1::date order by effective_from desc, id desc limit 1) pr on true
    left join lateral (select * from mk_optin where product_id = p.id order by id desc limit 1) o on true`;
  const modeOf = (r, day) => r.owner_kind === 'santa' ? 'credit' : calc.optinMode({ mode: r.mode, singleMonths: r.single_months, launchedAt: r.la || r.cf, creditFrom: r.cf, withdrawnAt: r.withdrawn_at }, day);
  const optinFromOf = r => r.mode === 'single_until' ? calc.eligibleFrom(r.la || r.cf, r.single_months) : null;
  const prodOut = (r, day, staff) => { const m = modeOf(r, day); return { id: r.id, title: r.title, kind: r.kind, cp: r.owner_kind === 'santa' ? '산타 오리지널' : r.cp_name || '', hours: r.hours_x10 / 10, sector: r.sector, level: r.level,
    ...(staff ? { credits: r.credits || null } : {}), optin: m, ...(m === 'single_until' ? { optinFrom: optinFromOf(r) } : {}), lic: r.lic_allowed || ['stream'], ...(r.owner_kind === 'santa' ? { orig: true } : {}), status: r.status }; };
  async function listed(c, day) { return (await c.query(PROD_SQL + " where p.status = 'listed' order by p.created_at, p.id", [day])).rows; }
  async function prod(c, id, day) { return q1(c, PROD_SQL + ' where p.id = $2', [day, id]); }
  async function collections(c, day, only) {
    const cols = (await c.query('select * from mk_collection where active ' + (only ? 'and id = any($1) ' : '') + 'order by sort, id', only ? [only] : [])).rows;
    const items = (await c.query('select collection_id, product_id from mk_collection_item order by sort, product_id')).rows; const P = new Map((await listed(c, day)).map(r => [r.id, r]));
    return cols.map(col => { const L = items.filter(i => i.collection_id === col.id).map(i => P.get(i.product_id)).filter(r => r && modeOf(r, day) === 'credit' && r.credits);
      return { id: col.id, kind: col.kind, title: col.title, sector: col.sector, cover: col.cover, count: L.length, avgCredits: L.length ? Math.floor(L.reduce((s, r) => s + r.credits, 0) / L.length) : 0, rows: L }; });
  }
  /* 이번 달 승인 슬롯(dev-addendum: 추천 앞에 ad:true) */
  async function adsOf(c, slot) { return (await c.query("select product_id from mk_promo where ym = $1 and slot = $2 and status = 'ok' order by at, id limit $3", [ym(), slot, calc.SLOT[slot].cap])).rows.map(r => r.product_id); }
  const withAds = (rows, adIds, out) => { const by = new Map(rows.map(r => [r.id, r])); const ads = adIds.map(id => by.get(id)).filter(Boolean); return [...ads.map(r => ({ ...out(r), ad: true })), ...rows.filter(r => !adIds.includes(r.id)).map(out)]; };

  /* ── 계약 · 지갑 ── */
  async function contractOf(c, a, id, lock) {
    const k = await q1(c, `select *, to_char(start, 'YYYY-MM-DD') s, to_char("end", 'YYYY-MM-DD') e, to_char(carry_end, 'YYYY-MM-DD') ce from mk_contract where id = $1${lock ? ' for update' : ''}`, [str(id, 20)]);
    if (!k || (k.buyer_tid !== a.tid && !isSanta(a))) throw E(404, 'contract', '없는 계약입니다.'); return k;
  }
  const kOut = k => ({ id: k.id, buyerTid: k.buyer_tid, quoteId: k.quote_id, kind: k.kind, collections: k.collections, start: k.s, end: k.e, carryEnd: k.ce, supplyTotal: k.supply_total, bonusBp: k.bonus_bp, bundlePlatform: k.bundle_platform,
    status: k.status, taxStatus: k.tax_status, taxInvNo: k.tax_inv_no, renewOf: k.renew_of, refund: k.refund, activatedAt: k.activated_at });
  const ctlOut = t => t ? { monthCap: t.month_cap, allowCols: t.allow_cols, allowGroups: t.allow_groups, preFrom: t.pre_from, alertBp: t.alert_bp, alertTo: t.alert_to } : null;
  async function walletState(c, k) {
    const L = await lotsOf(c, k.id); const live = liveLots(L, today()); const total = L.reduce((s, l) => s + l.credits, 0); const balance = live.reduce((s, l) => s + l.remain, 0);
    const ctl = await q1(c, 'select * from mk_control where contract_id = $1', [k.id]);
    return { lots: L, wallet: L.map(lotOut), total, balance, ctl, alert: calc.alertOf(balance, total, ctl && ctl.alert_bp) };
  }
  async function monthUsed(c, cid, sh) {
    return (await q1(c, "select coalesce(sum(credits), 0)::int n from mk_credit_use where contract_id = $1 and sid_hash = $2 and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') = $3 and kind in ('use','restore')", [cid, sh, ym()])).n;
  }
  /* 복원 실행(창 검사는 호출부). 차감된 로트로 크레딧을 돌려준다(만료일 유지) */
  async function doRestore(c, k, u, by, reason, prog) {
    if ((await c.query("select 1 from mk_credit_use where contract_id = $1 and product_id = $2 and sid_hash = $3 and kind = 'restore'", [k.id, u.product_id, u.sid_hash])).rowCount) throw E(409, 'mk_restore_once', '같은 학습자 · 같은 과정의 복원은 계약 기간에 한 번만 할 수 있습니다. [이의 신청]으로 산타에 요청하십시오.');
    for (const l of u.lots || []) await c.query('update mk_credit_wallet set remain = least(credits, remain + $2) where id = $1', [l.id, int(l.take)]);
    await c.query('update mk_credit_use set restored = true where id = $1', [u.id]);
    const r = await q1(c, "insert into mk_credit_use (id, contract_id, buyer_tid, kind, product_id, cp_tid, sid_hash, grp, credits, lots, restore_of, prog_pct_at_restore, reason) values ($1,$2,$3,'restore',$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *",
      [rid('mu_'), k.id, k.buyer_tid, u.product_id, u.cp_tid, u.sid_hash, u.grp, -u.credits, JSON.stringify(u.lots || []), u.id, prog, str(reason, 200) || null]);
    await c.query("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_restore', $1, $2, $3, $4)", [k.id, k.buyer_tid, -u.credits, r.id]);
    return r;
  }
  const useOut = (u, now) => ({ id: u.id, at: u.at, product: u.product_id, title: u.title, credits: u.credits, kind: u.kind, restored: u.restored, learner: { key: u.sid_hash.slice(0, 10), group: u.grp || null },
    restorable: u.kind === 'use' && !u.restored && calc.restorable(calc.hoursBetween(new Date(u.at).toISOString(), now), 0) });

  /* ── 견적 ── */
  async function avgOf(c, cols) { if (!cols.length) return 45; const C = await collections(c, today(), cols); const L = C.flatMap(x => x.rows); return L.length ? Math.floor(L.reduce((s, r) => s + r.credits, 0) / L.length) : 45; }
  async function creditQuote(c, buyer, b, by, santa) {
    const inp = b.input && typeof b.input === 'object' ? b.input : b; const budget = Math.floor(int(inp.budget != null ? inp.budget : b.amount) / 1000) * 1000;
    if (!(budget >= 1000000)) throw E(400, 'budget', '구매액은 100만 원 이상으로 입력하십시오.');
    const cols = arr(inp.collections || b.collections, 20, COL_RE); const bundle = !!(inp.bundle || b.bundle);
    const want = b.bonusBp == null ? null : int(b.bonusBp); if (want != null && !(want >= 0)) throw E(400, 'bonus', '보너스율을 확인하십시오.');
    if (want != null && want > calc.BONUS_MAX_BP) throw E(422, 'mk_bonus_max');
    const sched = calc.bonusBp(budget, bundle); const bp = want == null ? sched : santa ? want : Math.min(want, sched); /* 기관은 기준표 이하만, 산타는 상한 안에서 지정 */
    const avg = await avgOf(c, cols); const P = calc.plan({ budget, bundle, bonusBp: bp, avgCredits: avg, coursesPerPerson: inp.coursesPerPerson });
    if (!P.ok) throw E(422, 'mk_margin', null, { alternatives: [{ bonusBp: Math.min(sched, calc.BONUS_MAX_BP) }] });
    const input = { budget, collections: cols, coursesPerPerson: inp.coursesPerPerson || 1.5, bundle, ...(inp.topupOf ? { topupOf: str(inp.topupOf, 20) } : {}) };
    return q1(c, "insert into mk_quote (id, buyer_tid, kind, input, credits, bonus_bp, bonus_credits, est, supply_total, cp_max, santa_bp, valid_to, by_email) values ($1,$2,'credit',$3,$4,$5,$6,$7,$8,$9,$10,$11::date + 30,$12) returning *",
      [rid('mq_'), buyer, JSON.stringify(input), P.credits, P.bonusBp, P.bonusCredits, JSON.stringify({ avgCredits: P.avgCredits, enrollments: P.enrollments, people: P.people, total: P.total }), budget, P.cpMax, P.santaBp, today(), by]);
  }
  async function singleQuote(c, buyer, b, by) {
    const price = int(b.price != null ? b.price : (b.input || {}).price); if (!(price > 0)) throw E(400, 'price', '견적가를 입력하십시오.');
    const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 50); if (!lines.length) throw E(400, 'lines', '과정과 인원을 고르십시오.');
    let floor = 0; const L = [];
    for (const l of lines) { const r = await prod(c, str(l.productId, 20), today()); if (!r || r.status !== 'listed' || !r.list_price) throw E(404, 'product', '판매 중인 상품이 아닙니다.'); const n = Math.max(1, int(l.people) || 1);
      floor += (r.floor_price || 0) * n; L.push({ productId: r.id, people: n, lic: LIC.includes(l.lic) ? l.lic : 'stream', floor: (r.floor_price || 0) * n }); }
    const cand = calc.singleCand(price); const auto = calc.singleAuto(price, floor);
    const row = await q1(c, "insert into mk_quote (id, buyer_tid, kind, input, supply_total, cp_max, santa_bp, status, est, valid_to, by_email) values ($1,$2,'single',$3,$4,$5,3000,$6,$7,$8::date + 30,$9) returning *",
      [rid('mq_'), buyer, JSON.stringify({ price, lines: L }), price, cand, auto ? 'ready' : 'cp_wait', JSON.stringify({ floorSum: floor, cand, minPrice: calc.singleMin(floor) }), today(), by]);
    return row;
  }
  /* 구매 기관 응답에는 산타 몫 · CP 지급액(santaBp · cpMax · floor · cand)을 넣지 않는다 — 산타 운영(full)만 */
  const quoteOut = (q, full) => { const est = { ...(q.est || {}) }; const input = { ...(q.input || {}) }; if (!full) { delete est.floorSum; delete est.cand; delete est.minPrice; if (Array.isArray(input.lines)) input.lines = input.lines.map(({ floor, ...l }) => l); delete input.cpOk; }
    return { id: q.id, buyerTid: q.buyer_tid, kind: q.kind, input, credits: q.credits, bonusBp: q.bonus_bp, bonusCredits: q.bonus_credits, est, supplyTotal: q.supply_total, ...(full ? { cpMax: q.cp_max, santaBp: q.santa_bp } : {}), status: q.status, validTo: q.valid_to, at: q.at }; };

  /* ── 계약 활성(산타) ── */
  async function activate(c, k, b, by) {
    if (k.status !== 'pending_pay') throw E(409, 'mk_contract_state', '결제 대기 계약만 활성화할 수 있습니다.');
    const qt = await q1(c, 'select * from mk_quote where id = $1', [k.quote_id]); const tax = str(b.taxInvNo, 40).trim();
    if (k.kind === 'single') {
      await q1(c, "update mk_contract set status = 'active', activated_at = now(), tax_status = $2, tax_inv_no = $3 where id = $1", [k.id, tax ? 'issued' : 'waiting', tax || null]);
      await c.query("insert into mk_entry (kind, contract_id, party_tid, amount, ref) values ('single_sale', $1, $2, $3, $4)", [k.id, k.buyer_tid, k.supply_total, qt.id]);
      return { contract: kOut(await contractOf(c, { tid: k.buyer_tid }, k.id)), wallet: [] };
    }
    let target = k;
    if (k.renew_of) { /* 추가 구매: 원 계약에 topup 로트(유효 1년은 오늘부터 따로) */
      target = await q1(c, `select *, to_char(start, 'YYYY-MM-DD') s, to_char("end", 'YYYY-MM-DD') e, to_char(carry_end, 'YYYY-MM-DD') ce from mk_contract where id = $1 for update`, [k.renew_of]);
      if (!target || !['active', 'carry'].includes(target.status)) throw E(409, 'mk_contract_state', '원 계약이 이용 중이 아닙니다.');
      const x = calc.expiry(today()); await c.query("insert into mk_credit_wallet (id, contract_id, lot, credits, remain, valid_to, carry_to, src_contract) values ($1,$2,'topup',$3,$3,$4,$5,$6)", [rid('mw_'), target.id, qt.credits, x.validTo, x.carryTo, k.id]);
      if (qt.bonus_credits) await c.query("insert into mk_credit_wallet (id, contract_id, lot, credits, remain, valid_to, carry_to, src_contract) values ($1,$2,'bonus',$3,$3,$4,$5,$6)", [rid('mw_'), target.id, qt.bonus_credits, x.validTo, x.carryTo, k.id]);
      if (x.carryTo > target.ce) await c.query("update mk_contract set carry_end = $2, status = 'active' where id = $1", [target.id, x.carryTo]);
      await c.query("update mk_contract set status = 'merged', activated_at = now(), tax_status = $2, tax_inv_no = $3 where id = $1", [k.id, tax ? 'issued' : 'waiting', tax || null]);
    } else {
      await c.query("insert into mk_credit_wallet (id, contract_id, lot, credits, remain, valid_to, carry_to) values ($1,$2,'paid',$3,$3,$4,$5)", [rid('mw_'), k.id, qt.credits, k.e, k.ce]);
      if (qt.bonus_credits) await c.query("insert into mk_credit_wallet (id, contract_id, lot, credits, remain, valid_to, carry_to) values ($1,$2,'bonus',$3,$3,$4,$5)", [rid('mw_'), k.id, qt.bonus_credits, k.e, k.ce]);
      await c.query("update mk_contract set status = 'active', activated_at = now(), tax_status = $2, tax_inv_no = $3 where id = $1", [k.id, tax ? 'issued' : 'waiting', tax || null]);
    }
    await c.query("insert into mk_entry (kind, contract_id, party_tid, amount, credits, ref) values ('credit_sale', $1, $2, $3, $4, $5)", [target.id, k.buyer_tid, k.supply_total, qt.credits, k.id]);
    if (qt.bonus_credits) await c.query("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_bonus', $1, $2, $3, $4)", [target.id, k.buyer_tid, qt.bonus_credits, k.id]);
    if (k.bundle_platform) await c.query("insert into mk_entry (kind, contract_id, party_tid, ref) values ('platform_bundle', $1, $2, $3)", [target.id, k.buyer_tid, k.id]);
    const t = await contractOf(c, { tid: k.buyer_tid }, target.id); const W = await walletState(c, t);
    return { contract: kOut(await contractOf(c, { tid: k.buyer_tid }, k.id)), target: target.id, wallet: W.wallet, balance: W.balance };
  }

  /* ── 학습자 시작(차감) ── */
  async function startOf(c, tid, sh, pid, mode) { /* mode 'check' | 'start' → {access, ...} */
    const day = today(); const k = await liveContract(c, tid, day); const r = await prod(c, pid, day);
    if (!r || r.status !== 'listed' || !r.credits) return { access: 'none' };
    if (!k) return { access: 'empty', r };
    const ctl = await q1(c, 'select * from mk_control where contract_id = $1', [k.id]);
    const had = await q1(c, "select * from mk_credit_use where contract_id = $1 and product_id = $2 and sid_hash = $3 and kind = 'use' and not restored", [k.id, pid, sh]);
    if (had) return { access: 'started', k, r, had };
    if (modeOf(r, day) !== 'credit') { /* 철회 보호: 이 계약에서 이미 열린 상품은 계약 끝까지 */
      if (!(await c.query("select 1 from mk_credit_use where contract_id = $1 and product_id = $2 and kind = 'use' limit 1", [k.id, pid])).rowCount) return { access: 'out', k, r }; }
    const cols = (await c.query('select collection_id from mk_collection_item where product_id = $1', [pid])).rows.map(x => x.collection_id);
    const scope = [k.collections && k.collections.length ? k.collections : null, ctl && ctl.allow_cols && ctl.allow_cols.length ? ctl.allow_cols : null].filter(Boolean);
    if (scope.some(S0 => !cols.some(x => S0.includes(x)))) return { access: 'out', k, r };
    const P = priceNow(await priceRows(c, pid), day); const nth = (await q1(c, "select count(*)::int n from mk_credit_use where buyer_tid = $1 and product_id = $2 and kind = 'use' and not restored", [tid, pid])).n + 1;
    const cr = calc.useCredits(P.list_price, nth, P.vol_rules);
    if (calc.needApproval(cr, ctl && ctl.pre_from)) { const pa = await q1(c, "select status from mk_preapproval where contract_id = $1 and product_id = $2 and sid_hash = $3 and status in ('asked','ok')", [k.id, pid, sh]);
      if (!pa) return { access: 'pre', k, r, cr }; if (pa.status === 'asked') return { access: 'pre_asked', k, r, cr }; }
    if (!calc.capOk(await monthUsed(c, k.id, sh), cr, ctl && ctl.month_cap)) return { access: 'cap', k, r, cr };
    const L = liveLots(await lotsOf(c, k.id), day); const U = calc.useLots(L.map(l => ({ id: l.id, kind: l.lot, exp: l.ct, remain: l.remain })), cr);
    if (U.short > 0) return { access: 'balance', k, r, cr };
    if (mode === 'check') return { access: 'credit', k, r, cr };
    for (const l of U.lots) if (l.take) await c.query('update mk_credit_wallet set remain = remain - $2 where id = $1 and remain >= $2', [l.id, l.take]);
    const u = await q1(c, "insert into mk_credit_use (id, contract_id, buyer_tid, kind, product_id, cp_tid, sid_hash, credits, lots, price_id, vol_n) values ($1,$2,$3,'use',$4,$5,$6,$7,$8,$9,$10) returning *",
      [rid('mu_'), k.id, tid, pid, r.owner_tid, sh, cr, JSON.stringify(U.lots.filter(l => l.take).map(l => ({ id: l.id, take: l.take }))), P.id, nth]);
    await c.query("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_use', $1, $2, $3, $4)", [k.id, tid, cr, u.id]);
    return { access: 'charged', k, r, cr, u };
  }
  const ACCESS_ERR = { cap: [409, 'mk_cap'], balance: [409, 'mk_balance'], pre: [409, 'mk_pre'], pre_asked: [409, 'mk_pre'], out: [403, 'mk_scope'], empty: [409, 'mk_balance'], none: [404, 'product'] };
  const who = async (req, tid) => { const s = await lauth(req, tid); if (!s) throw E(401, 'auth', '로그인이 필요해요.'); S.scopeSet(tid, false); return s; };
  async function pubGate(c, tid) { const p = await party(c, tid); return !!p.pilot; }

  const pub = {
    'GET mk-shelf': async (req, res, tid) => { const s = await who(req, tid); const sh = sidHash(tid, s.sid);
      return tx(async c => { if (!(await pubGate(c, tid))) return { on: false, shelf: [] }; const day = today(); const k = await liveContract(c, tid, day); if (!k) return { on: true, shelf: [], me: { allowed: false } };
        const ctl = await q1(c, 'select * from mk_control where contract_id = $1', [k.id]); let C = await collections(c, day, k.collections && k.collections.length ? k.collections : null);
        if (ctl && ctl.allow_cols && ctl.allow_cols.length) C = C.filter(x => ctl.allow_cols.includes(x.id));
        const ads = await adsOf(c, 'shelf_top'); const it = r => ({ id: r.id, title: r.title, hours: r.hours_x10 / 10, credits: r.credits, thumb: r.thumb || null, ...(r.owner_kind === 'santa' ? { orig: true, badge: 'orig' } : {}) });
        const shelf = C.map((x, i) => ({ colId: x.id, title: x.title, items: i === 0 ? withAds(x.rows, ads, it) : x.rows.map(it) }));
        const used = await monthUsed(c, k.id, sh); return { on: true, shelf, me: { allowed: true, ...(ctl && ctl.month_cap ? { monthLeft: Math.max(0, ctl.month_cap - used) } : {}) } }; }); },
    'GET mk-list': async (req, res, tid) => { await who(req, tid); return tx(async c => { if (!(await pubGate(c, tid))) return { on: false, items: [] }; const day = today();
      return { on: true, items: (await listed(c, day)).filter(r => modeOf(r, day) === 'credit' && r.credits).map(r => ({ id: r.id, title: r.title, hours: r.hours_x10 / 10, credits: r.credits, ...(r.owner_kind === 'santa' ? { orig: true } : {}) })) }; }); },
    'GET mk-item': async (req, res, tid) => { const s = await who(req, tid); const pid = str(Q(req).get('id'), 20); if (!PID_RE.test(pid)) throw E(404, 'product', '과정을 찾지 못했어요.');
      return tx(async c => { if (!(await pubGate(c, tid))) throw E(403, 'mk_learner_off'); const X = await startOf(c, tid, sidHash(tid, s.sid), pid, 'check'); if (!X.r) throw E(404, 'product', '과정을 찾지 못했어요.');
        return { item: { id: X.r.id, title: X.r.title, hours: X.r.hours_x10 / 10, credits: X.cr || X.r.credits, access: X.access === 'balance' ? 'empty' : X.access, ...(X.r.owner_kind === 'santa' ? { orig: true } : {}) } }; }); },
    'POST mk-start': async (req, res, tid) => { const s = await who(req, tid); limit(`mk-start:${tid}:${s.sid}`, 30, 60e3); const b = await body(req); const pid = str(b.productId, 20); if (!PID_RE.test(pid)) throw E(404, 'product', '과정을 찾지 못했어요.');
      const sh = sidHash(tid, s.sid);
      const X = await tx(async c => { if (!(await pubGate(c, tid))) throw E(403, 'mk_learner_off'); const k0 = await liveContract(c, tid, today()); if (k0) await c.query('select id from mk_contract where id = $1 for update', [k0.id]);
        const X = await startOf(c, tid, sh, pid, 'start'); const er = ACCESS_ERR[X.access]; if (er) { const e = E(er[0], er[1]); if (X.access === 'pre_asked') e.extra = { access: 'pre_asked' }; throw e; } return X; })
        .catch(e => { if (e && e.code === '23505') return { access: 'started', r: { id: pid } }; throw e; });
      if (X.access === 'charged') { await log(tid, 'learner', 'market.use', { product: pid, credits: X.cr }); await tx(async c => { const W = await walletState(c, X.k); if (W.alert) await log(tid, 'system', 'market.alert', { contract: X.k.id, alert: W.alert, balance: W.balance }); }); }
      return { ok: true, courseRef: '#mk/' + pid, charged: X.access === 'charged', ...(X.cr && X.access === 'charged' ? { credits: X.cr } : {}) }; },
    'POST mk-pre': async (req, res, tid) => { const s = await who(req, tid); const b = await body(req); const pid = str(b.productId, 20); const sh = sidHash(tid, s.sid);
      return tx(async c => { if (!(await pubGate(c, tid))) throw E(403, 'mk_learner_off'); const X = await startOf(c, tid, sh, pid, 'check'); if (X.access !== 'pre' && X.access !== 'pre_asked') throw E(409, 'mk_pre_none', '승인 없이 시작할 수 있는 과정이에요.');
        const ex = await q1(c, "select * from mk_preapproval where contract_id = $1 and product_id = $2 and sid_hash = $3 and status = 'asked'", [X.k.id, pid, sh]);
        const row = ex || await q1(c, 'insert into mk_preapproval (id, contract_id, product_id, sid_hash) values ($1,$2,$3,$4) returning *', [rid('ma_'), X.k.id, pid, sh]);
        return { preapproval: { id: row.id, status: row.status, productId: pid } }; }); }
  };

  /* ── 운영자 · CP · 산타 라우트 ── */
  const T = fn => tx(fn);
  const R = {
    /* 8-1 카탈로그 */
    'GET /api/market/home': async req => { const a = await need(req); const staff = a.role !== 'teacher';
      return T(async c => { await needPilot(c, a.tid); const day = today(); const C = await collections(c, day); const rows = (await listed(c, day)).filter(r => modeOf(r, day) === 'credit');
        const k = await liveContract(c, a.tid, day); let my = null; if (k && staff) { const W = await walletState(c, k); my = { contractId: k.id, balance: W.balance, total: W.total, validTo: k.e, carryTo: k.ce, alert: W.alert }; }
        const ads = await adsOf(c, 'home_top'); const out = r => ({ productId: r.id, title: r.title, cp: r.owner_kind === 'santa' ? '산타 오리지널' : r.cp_name, hours: r.hours_x10 / 10, ...(staff ? { credits: r.credits } : {}), optin: 'credit', ...(r.owner_kind === 'santa' ? { orig: true } : {}) });
        return { collections: C.map(({ rows: _r, ...x }) => x), recommended: withAds(rows, ads, out).slice(0, 12), ...(my ? { myCredit: my } : {}), eligible: await eligible(a.tid), pilot: true }; }); },
    'GET /api/market/products': async req => { const a = await need(req); const q = Q(req); const staff = a.role !== 'teacher';
      return T(async c => { await needPilot(c, a.tid); const day = today(); let rows = await listed(c, day);
        const col = q.get('collection'); if (col) { const ids = new Set((await c.query('select product_id from mk_collection_item where collection_id = $1', [str(col, 30)])).rows.map(r => r.product_id)); rows = rows.filter(r => ids.has(r.id)); }
        const t = str(q.get('q'), 60).trim().toLowerCase(); if (t) rows = rows.filter(r => r.title.toLowerCase().includes(t));
        for (const [k, f] of [['sector', 'sector'], ['kind', 'kind'], ['level', 'level']]) if (q.get(k)) rows = rows.filter(r => r[f] === q.get(k));
        if (q.get('optin')) rows = rows.filter(r => (modeOf(r, day) === 'credit' ? 'credit' : 'single') === q.get('optin'));
        if (q.get('lic')) rows = rows.filter(r => (r.lic_allowed || []).includes(q.get('lic')));
        if (q.get('orig') === '1') rows = rows.filter(r => r.owner_kind === 'santa');
        const mn = int(q.get('minCredits')), mx = int(q.get('maxCredits')); if (mn > 0) rows = rows.filter(r => r.credits >= mn); if (mx > 0) rows = rows.filter(r => r.credits <= mx);
        if (q.get('sort') === 'credits') rows.sort((x, y) => x.credits - y.credits); return pageOf(q, rows.map(r => prodOut(r, day, staff))); }); },
    'GET /api/market/credit/rules': async req => { await need(req); const r = calc.rules(); return { won: r.won, cpBp: r.cpBp, bonus: r.bonus, validMonths: r.validMonths, carryMonths: r.carryMonths, restore: r.restore, guardBp: r.guardBp, slots: calc.SLOT }; },
    /* 8-2 구매 기관 */
    'POST /api/market/credit/plan': async req => { const a = await needStaff(req); const b = await body(req);
      return T(async c => { await needPilot(c, a.tid); const cols = arr(b.collections, 20, COL_RE); const avg = await avgOf(c, cols);
        const P = calc.plan({ budget: b.budget, people: b.people, bundle: !!b.bundle, bonusBp: b.bonusBp, avgCredits: avg, coursesPerPerson: b.coursesPerPerson });
        const alternatives = P.ok ? [] : [{ bonusBp: calc.BONUS_MAX_BP }];
        const notes = ['예상 인원은 선택 컬렉션 평균 과정 크레딧 기준 추정입니다.', ...(P.bonusOver ? [S.MSG.mk_bonus_max] : [])];
        const { ok, bonusOver, santaBp, cpMax, ...rest } = P; return { ...rest, ok, alternatives, notes, ...(isSanta(a) ? { santaBp, cpMax } : {}) }; }); },
    'POST /api/market/quotes': async req => { const a = await needStaff(req); const b = await body(req); await needPaid(a.tid);
      return T(async c => { await needPilot(c, a.tid); return idem(c, a.tid, 'quotes', b.idem, async () => { const q = b.kind === 'single' ? await singleQuote(c, a.tid, b, a.email) : await creditQuote(c, a.tid, b, a.email, false); return { ok: true, quote: quoteOut(q, isSanta(a)) }; }); }); },
    'GET /api/market/quotes': async req => { const a = await needStaff(req); return T(async c => { await needPilot(c, a.tid); return pageOf(Q(req), (await c.query('select * from mk_quote where buyer_tid = $1 order by at desc', [a.tid])).rows.map(q => quoteOut(q, false))); }); },
    'POST /api/market/contracts': async req => { const a = await needOwner(req); const b = await body(req); await needPaid(a.tid);
      return T(async c => { await needPilot(c, a.tid); return idem(c, a.tid, 'contracts', b.idem, async () => {
        const qt = await q1(c, 'select * from mk_quote where id = $1 and buyer_tid = $2 for update', [str(b.quoteId, 20), a.tid]); if (!qt) throw E(404, 'quote', '없는 견적입니다.');
        if (!['ready', 'sent'].includes(qt.status) || kstDay(qt.valid_to) < today()) throw E(409, 'mk_quote_state');
        const start = DAY_RE.test(b.start || '') ? b.start : today(); const x = calc.expiry(start); const inp = qt.input || {};
        let cols = inp.collections || []; let renew = null;
        if (inp.topupOf) { const o = await q1(c, 'select * from mk_contract where id = $1 and buyer_tid = $2', [inp.topupOf, a.tid]); if (!o) throw E(404, 'contract', '없는 계약입니다.'); renew = o.id; cols = o.collections; }
        const k = await q1(c, `insert into mk_contract (id, buyer_tid, quote_id, kind, collections, start, "end", carry_end, supply_total, bonus_bp, bundle_platform, renew_of, by_email) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *, to_char(start, 'YYYY-MM-DD') s, to_char("end", 'YYYY-MM-DD') e, to_char(carry_end, 'YYYY-MM-DD') ce`,
          [rid('mk_'), a.tid, qt.id, qt.kind === 'single' ? 'single' : 'credit', cols, start, x.validTo, x.carryTo, qt.supply_total, qt.bonus_bp, !!inp.bundle, renew, a.email]).catch(e => { if (e.code === '23505') throw E(409, 'mk_quote_state'); throw e; });
        await c.query("update mk_quote set status = 'accepted' where id = $1", [qt.id]);
        if (b.controls && typeof b.controls === 'object' && !renew) await putControl(c, k.id, b.controls, a.email);
        await log(a.tid, a.email, 'market.contract', { contract: k.id, quote: qt.id, supply: qt.supply_total }); return { ok: true, contract: kOut(k) }; }); }); },
    /* 8-3 CP */
    'GET /api/market/cp/products': async req => { const a = await needCp(req); return T(async c => { const day = today(); return { items: (await c.query(PROD_SQL + ' where p.owner_tid = $2 order by p.created_at', [day, a.tid])).rows.map(r => ({ ...prodOut(r, day, true), listPrice: r.list_price, floorPrice: r.floor_price, minUntil: r.mu })) }; }); },
    'POST /api/market/cp/products': async req => { const a = await needCp(req); const b = await body(req);
      return T(async c => idem(c, a.tid, 'cp-products', b.idem, async () => { const title = str(b.title, 120).trim(); if (!title) throw E(400, 'title', '상품 이름을 입력하십시오.');
        const kind = ['course', 'item', 'path', 'book'].includes(b.kind) ? b.kind : 'course'; const launched = DAY_RE.test(b.launchedAt || '') ? b.launchedAt : today();
        const r = await q1(c, 'insert into mk_product (id, owner_tid, owner_kind, kind, title, sector, level, hours_x10, launched_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, status', [rid('mp_'), a.tid, 'cp', kind, title, str(b.sector, 40) || null, str(b.level, 20) || null, Math.max(0, Math.round(+b.hours * 10) || 0), launched]);
        return { ok: true, product: { id: r.id, status: r.status } }; })); },
    'GET /api/market/cp/optin': async req => { const a = await needCp(req); return T(async c => { const day = today(); const rows = (await c.query(PROD_SQL + ' where p.owner_tid = $2', [day, a.tid])).rows; const items = [];
      for (const r of rows) items.push({ product: r.id, title: r.title, mode: modeOf(r, day), creditFrom: r.cf, minUntil: r.mu, activeContracts: (await activeOf(c, r.id)).length }); return { items }; }); },
    'GET /api/market/cp/statements': async req => { const a = await needCp(req); const ymq = str(Q(req).get('ym'), 7);
      return T(async c => ({ items: (await c.query('select * from mk_stmt where cp_tid = $1' + (ymq ? ' and ym = $2' : '') + ' order by ym desc', ymq ? [a.tid, ymq] : [a.tid])).rows.map(S.settle.stmtOut) })); },
    'GET /api/market/cp/rate': async req => { const a = await needCp(req); return T(async c => rateInfo(c, a.tid)); },
    'GET /api/market/cp/promo-slots': async req => { await needCp(req); const m = str(Q(req).get('ym'), 7) || calc.addMonths(today(), 1).slice(0, 7);
      return T(async c => { const n = new Map((await c.query("select slot, count(*)::int n from mk_promo where ym = $1 and status = 'ok' group by slot", [m])).rows.map(r => [r.slot, r.n]));
        return { ym: m, slots: Object.keys(calc.SLOT).map(k => ({ slot: k, label: calc.SLOT[k].label, fee: calc.SLOT[k].fee, cap: calc.SLOT[k].cap, left: Math.max(0, calc.SLOT[k].cap - (n.get(k) || 0)) })) }; }); },
    'POST /api/market/cp/promos': async req => { const a = await needCp(req); if (a.role !== 'owner') throw E(403, 'role', '정운영자만 신청할 수 있습니다.'); const b = await body(req);
      return T(async c => idem(c, a.tid, 'cp-promos', b.idem, async () => { const day = today(); const r = await prod(c, str(b.productId, 20), day); if (!r || r.owner_tid !== a.tid) throw E(404, 'product', '없는 상품입니다.');
        const months = Array.isArray(b.months) ? b.months.map(x => str(x, 7)) : []; const slot = str(b.slot, 12);
        const full = months.length ? (await c.query("select ym, count(*)::int n from mk_promo where slot = $1 and ym = any($2) and status = 'ok' group by ym", [slot, months])).rows.reduce((m, x) => Math.max(m, x.n), 0) : 0;
        const launchDays = r.la ? Math.floor((Date.parse(day) - Date.parse(r.la)) / 864e5) : 0;
        const P = calc.promoCheck(slot, months, { approvedInMonth: full, optin: modeOf(r, day), reviewed: r.status === 'listed', orig: r.owner_kind === 'santa', launchDays, thisYm: day.slice(0, 7) });
        if (P.error) throw E(P.error === 'mk_promo_full' ? 409 : 422, P.error, MSG2[P.error]);
        const items = []; for (const m of months) { const x = await q1(c, 'insert into mk_promo (id, cp_tid, product_id, slot, ym, fee) values ($1,$2,$3,$4,$5,$6) returning *', [rid('mpr_'), a.tid, r.id, slot, m, calc.SLOT[slot].fee]).catch(e => { if (e.code === '23505') throw E(409, 'mk_promo_full', '같은 상품 · 슬롯 · 달의 신청이 이미 있습니다.'); throw e; }); items.push(promoOut(x)); }
        return { ok: true, items, fee: P.fee }; })); },
    'GET /api/market/cp/promos': async req => { const a = await needCp(req); return T(async c => ({ items: (await c.query('select * from mk_promo where cp_tid = $1 order by ym desc, at desc', [a.tid])).rows.map(promoOut) })); },
    /* 8-4 산타 운영 */
    'GET /api/market/ops/reviews': async req => { await needSanta(req); const st = str(Q(req).get('status'), 12) || 'in_review';
      return T(async c => ({ items: (await c.query(PROD_SQL + ' where p.status = $2 order by p.created_at', [today(), st])).rows.map(r => ({ ...prodOut(r, today(), true), ownerTid: r.owner_tid, listPrice: r.list_price, memo: r.review_memo })) })); },
    'POST /api/market/ops/credit-quotes': async req => { const a = await needSanta(req); const b = await body(req); const buyer = str(b.buyerTid, 20);
      return T(async c => { if (!(await pool.query('select 1 from tenants where id = $1', [buyer])).rowCount) throw E(404, 'tenant', '없는 기관입니다.');
        return idem(c, a.tid, 'ops-credit-quotes', b.idem, async () => ({ ok: true, quote: quoteOut(await creditQuote(c, buyer, b, a.email, true), true) })); }); },
    'GET /api/market/ops/contracts': async req => { await needSanta(req); const st = str(Q(req).get('status'), 12);
      return T(async c => { const K = (await c.query(`select *, to_char(start, 'YYYY-MM-DD') s, to_char("end", 'YYYY-MM-DD') e, to_char(carry_end, 'YYYY-MM-DD') ce from mk_contract` + (st ? ' where status = $1' : '') + ' order by at desc limit 500', st ? [st] : [])).rows; const items = [];
        for (const k of K) { const W = await walletState(c, k); const used = (await q1(c, "select coalesce(sum(credits), 0)::int n from mk_credit_use where contract_id = $1", [k.id])).n;
          items.push({ contract: kOut(k), buyer: (await S.orgOf(k.buyer_tid)).name, supply: k.supply_total, bonusBp: k.bonus_bp, used, balance: W.balance, santaBp: k.kind === 'credit' ? calc.guard(k.supply_total, k.bonus_bp).santaBp : 3000 }); }
        return { items, totals: { supply: items.reduce((s, x) => s + x.supply, 0), used: items.reduce((s, x) => s + x.used, 0), balance: items.reduce((s, x) => s + x.balance, 0) } }; }); },
    'GET /api/market/ops/disputes': async req => { await needSanta(req); return T(async c => ({ items: (await c.query("select * from mk_dispute order by (status = 'open') desc, at desc limit 200")).rows })); },
    'POST /api/market/settle/month': async req => { const a = await needSanta(req); const b = await body(req); return S.settle.month(str(b.ym, 7), a.email); },
    'POST /api/market/settle/close': async req => { const a = await needSanta(req); const b = await body(req); const out = await S.settle.close(str(b.quarter, 7), a.email); return out; },
    'GET /api/market/ops/export': async (req, res) => { await needSanta(req); const csv = await S.settle.exportCsv(str(Q(req).get('close'), 20));
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="market-payout.csv"', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(csv); },
    'GET /api/market/ops/cp-rates': async req => { await needSanta(req); return T(async c => { const P = (await c.query("select tid, cp_name from mk_party where kind = 'cp' order by tid")).rows; const items = [];
      for (const p of P) items.push({ cpTid: p.tid, cpName: p.cp_name, ...(await rateInfo(c, p.tid)) }); return { items }; }); },
    'POST /api/market/ops/originals': async req => { const a = await needSanta(req); const b = await body(req);
      return T(async c => idem(c, a.tid, 'ops-originals', b.idem, async () => { const title = str(b.title, 120).trim(); const lp = int(b.listPrice); const hx = int(b.hoursX10);
        const fail = [...(!title ? ['title'] : []), ...(!(lp > 0) ? ['listPrice'] : []), ...(!(hx > 0) ? ['hours'] : [])]; if (fail.length) throw E(422, 'mk_check', null, { failed: fail });
        const cols = arr(b.collections, 10, COL_RE);
        for (const cid of cols) { const n = (await q1(c, "select count(*)::int col, count(*) filter (where p.owner_kind = 'santa')::int orig from mk_collection_item i join mk_product p on p.id = i.product_id where i.collection_id = $1", [cid]));
          const ck = await q1(c, 'select kind from mk_collection where id = $1', [cid]); if (!ck) throw E(404, 'collection', '없는 컬렉션입니다.');
          if (ck.kind !== 'original' && !calc.origCapOk(n.col, n.orig)) throw E(409, 'mk_orig_cap', MSG2.mk_orig_cap, { collection: cid }); }
        const day = today(); const id = rid('mp_');
        await c.query("insert into mk_product (id, owner_tid, owner_kind, kind, title, hours_x10, status, launched_at, src_kind, clib_ref) values ($1,$2,'santa','course',$3,$4,'listed',$5,$6,$7)", [id, a.tid, title, hx, day, b.srcKind === 'ai' ? 'ai' : 'self', str(b.clibRef, 80) || null]);
        await c.query('insert into mk_price (product_id, list_price, credits, effective_from, by_email) values ($1,$2,$3,$4,$5)', [id, lp, calc.credits(lp), day, a.email]);
        await c.query("insert into mk_optin (product_id, mode, credit_from, by_email) values ($1,'credit',$2,$3)", [id, day, a.email]);
        for (const cid of cols) await c.query('insert into mk_collection_item (collection_id, product_id) values ($1,$2) on conflict do nothing', [cid, id]);
        return { ok: true, product: { id, title, ownerKind: 'santa', status: 'listed', optin: 'credit', minUntil: null }, price: { listPrice: lp, credits: calc.credits(lp) } }; })); },
    'GET /api/market/ops/originals': async req => { await needSanta(req); return T(async c => { const day = today(); const rows = (await c.query(PROD_SQL + " where p.owner_kind = 'santa' order by p.created_at", [day])).rows; const items = [];
      for (const r of rows) items.push({ product: prodOut(r, day, true), credits: r.credits, used30d: (await q1(c, "select coalesce(sum(credits), 0)::int n from mk_credit_use where product_id = $1 and at > now() - interval '30 days'", [r.id])).n,
        collections: (await c.query('select collection_id from mk_collection_item where product_id = $1', [r.id])).rows.map(x => x.collection_id) }); return { items }; }); },
    'GET /api/market/ops/promos': async req => { await needSanta(req); const st = str(Q(req).get('status'), 10); return T(async c => ({ items: (await c.query('select * from mk_promo' + (st ? ' where status = $1' : '') + ' order by ym, at', st ? [st] : [])).rows.map(promoOut) })); },
    'GET /api/market/ops/revenue': async req => { await needSanta(req); return T(async c => revenue(c, Q(req))); },
    'GET /api/market/ops/orgs': async req => { await needSanta(req); const q = Q(req); const t = str(q.get('q'), 60).trim();
      const rows = (await pool.query(`select t.id, t.name, t.type, coalesce(p.kind, 'buyer') kind, coalesce(p.pilot, false) pilot, p.cp_name, p.pilot_by, p.pilot_at from tenants t left join mk_party p on p.tid = t.id
        where ($1 = '' or t.name ilike '%' || $1 || '%' or t.id = $1) ${q.get('pilot') === '1' ? 'and p.pilot' : ''} ${q.get('kind') ? 'and coalesce(p.kind, \'buyer\') = $2' : ''} order by p.pilot desc nulls last, t.created_at desc limit 500`, q.get('kind') ? [t, str(q.get('kind'), 10)] : [t])).rows;
      return pageOf(q, rows.map(r => ({ tid: r.id, name: r.name, type: r.type, kind: r.kind, cpName: r.cp_name, mk: { pilot: r.pilot, by: r.pilot_by, at: r.pilot_at } }))); },
    'GET /api/market/settle/closes': async req => { await needSanta(req); return T(async c => ({ items: (await c.query('select * from mk_close order by quarter desc, at desc limit 40')).rows.map(z => ({ id: z.id, quarter: z.quarter, runBy: z.run_by, confirmBy: z.confirm_by, checks: z.checks, totals: z.totals, status: z.status, at: z.at, confirmedAt: z.confirmed_at })) })); },
    'GET /api/market/ops/quotes': async req => { await needSanta(req); const q = Q(req); const st = str(q.get('status'), 10);
      return T(async c => pageOf(q, (await c.query('select * from mk_quote' + (st ? ' where status = $1' : '') + ' order by at desc limit 1000', st ? [st] : [])).rows.map(x => quoteOut(x, true)))); },
    'POST /api/market/ops/quotes/auto': async req => { const a = await needSanta(req); const b = await body(req); const buyer = str(b.buyerTid, 20);
      return T(async c => { if (!(await pool.query('select 1 from tenants where id = $1', [buyer])).rowCount) throw E(404, 'tenant', '없는 기관입니다.');
        return idem(c, a.tid, 'ops-quotes-auto', b.idem, async () => { const x = await singleQuote(c, buyer, b, a.email); return { ok: true, quote: quoteOut(x, true), auto: x.status === 'ready' }; }); }); },
    'GET /api/market/cp/requests': async req => { const a = await needCp(req); return T(async c => { const own = new Set((await c.query('select id from mk_product where owner_tid = $1', [a.tid])).rows.map(r => r.id));
      const items = (await c.query("select * from mk_quote where kind = 'single' and status = 'cp_wait' order by at")).rows.filter(x => (x.input.lines || []).some(l => own.has(l.productId)))
        .map(x => { const L = x.input.lines.filter(l => own.has(l.productId)); return { id: x.id, price: x.supply_total, lines: L.map(l => ({ productId: l.productId, people: l.people, lic: l.lic, floor: l.floor })), cand: x.est.cand, floorSum: L.reduce((s, l) => s + (l.floor || 0), 0), decided: !!(x.input.cpOk || {})[a.tid], validTo: x.valid_to }; });
      return { items }; }); },
    'POST /api/market/cp/catalog/import': async req => { const a = await needCp(req); const b = await readBody(req, 512 * 1024);
      return T(async c => idem(c, a.tid, 'cp-import', b.idem, async () => { const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 500); const created = [], failed = []; const day = today();
        for (let i = 0; i < rows.length; i++) { const r = rows[i] || {}; const title = str(r.title, 120).trim(); const lp = int(r.listPrice); const hx = Math.round(+r.hours * 10) || 0;
          const bad = [...(!title ? ['title'] : []), ...(!(hx > 0) ? ['hours'] : []), ...(r.listPrice != null && !(lp > 0) ? ['listPrice'] : [])]; if (bad.length) { failed.push({ row: i + 1, failed: bad }); continue; }
          const id = rid('mp_'); await c.query("insert into mk_product (id, owner_tid, owner_kind, kind, title, sector, level, hours_x10, launched_at) values ($1,$2,'cp',$3,$4,$5,$6,$7,$8)", [id, a.tid, ['course', 'item', 'path', 'book'].includes(r.kind) ? r.kind : 'course', title, str(r.sector, 40) || null, str(r.level, 20) || null, hx, DAY_RE.test(r.launchedAt || '') ? r.launchedAt : day]);
          if (lp > 0) await c.query('insert into mk_price (product_id, list_price, credits, effective_from, by_email) values ($1,$2,$3,$4,$5)', [id, lp, calc.credits(lp), day, a.email]);
          created.push(id); }
        const jobId = rid('mj_'); const out = { ok: true, jobId, status: 'done', created: created.length, ids: created, failed };
        await c.query('insert into mk_idem (tid, route, key, resp) values ($1,$2,$3,$4)', [a.tid, 'cp-import-job', jobId, JSON.stringify(out)]); return out; })); },
    'POST /api/market/ops/collections': async req => { const a = await needSanta(req); const b = await body(req);
      return T(async c => { const id = str(b.id, 30); if (!COL_RE.test(id)) throw E(400, 'id', '컬렉션 번호(mc_…)를 확인하십시오.'); const title = str(b.title, 80).trim(); if (!title) throw E(400, 'title', '이름을 입력하십시오.');
        const kind = ['basic', 'industry', 'campus', 'original'].includes(b.kind) ? b.kind : 'basic';
        await c.query('insert into mk_collection (id, kind, title, sector, cover, sort) values ($1,$2,$3,$4,$5,$6) on conflict (id) do update set kind = $2, title = $3, sector = $4, cover = $5, sort = $6, active = true', [id, kind, title, str(b.sector, 40) || null, str(b.cover, 200) || null, int(b.sort) || 0]);
        const day = today(); const want = arr(b.items, 500, PID_RE); const ok = [], skipped = [];
        for (const pid of want) { const r = await prod(c, pid, day); (r && r.status === 'listed' && modeOf(r, day) === 'credit' ? ok : skipped).push(pid); } /* 크레딧 참여 상품만 */
        const orig = []; for (const pid of ok) { const r = await prod(c, pid, day); if (r.owner_kind === 'santa') orig.push(pid); }
        if (kind !== 'original' && orig.length && !calc.origCapOk(ok.length - 1, orig.length - 1)) /* 「산타 오리지널」 컬렉션은 상한 밖 */ throw E(409, 'mk_orig_cap', MSG2.mk_orig_cap);
        await c.query('delete from mk_collection_item where collection_id = $1', [id]); let i = 0; for (const pid of ok) await c.query('insert into mk_collection_item (collection_id, product_id, sort) values ($1,$2,$3)', [id, pid, i++]);
        return { ok: true, collection: { id, kind, title, count: ok.length }, skipped }; }); }
  };
  const MSG2 = {
    mk_cp_rate: 'CP 요율은 표준 65% · 독점 60% · 영업 대행 55% · 해외 IP 50% 중에서만 고를 수 있고, CP 서면 동의 번호가 필요합니다.',
    mk_promo_target: '크레딧에 참여하고 심사를 통과한 CP 상품만 추천 슬롯을 신청할 수 있습니다(산타 오리지널 · 신규 출시 90일이 지난 상품의 「신규 출시」 슬롯 제외).',
    mk_promo_full: '선택한 달의 추천 슬롯이 모두 찼습니다. 다른 달이나 다른 슬롯을 고르십시오.',
    mk_promo_months: '한 번에 최대 3개월(신규 출시는 1개월)까지, 다음 달부터 신청할 수 있습니다.',
    mk_promo_state: '이미 처리된 신청이라 취소할 수 없습니다.',
    mk_orig_cap: '이 컬렉션의 산타 오리지널 비중이 30%를 넘게 됩니다. 다른 컬렉션을 고르십시오.'
  };
  Object.assign(S.MSG, MSG2);
  const promoOut = p => ({ id: p.id, cpTid: p.cp_tid, productId: p.product_id, slot: p.slot, ym: p.ym, fee: p.fee, status: p.status, memo: p.memo, closeId: p.close_id, at: p.at });
  async function rateInfo(c, cp) { const rows = (await c.query("select rate_kind, cp_bp, to_char(effective_from, 'YYYY-MM-DD') ef from mk_cp_rate where cp_tid = $1 order by effective_from, id", [cp])).rows; const day = today();
    const cur = rows.filter(r => r.ef <= day).pop(); const nxt = rows.filter(r => r.ef > day).pop();
    return { current: cur ? { rateKind: cur.rate_kind, cpBp: cur.cp_bp, effectiveFrom: cur.ef } : { rateKind: 'standard', cpBp: calc.CP_BP, effectiveFrom: null }, ...(nxt ? { next: { rateKind: nxt.rate_kind, cpBp: nxt.cp_bp, effectiveFrom: nxt.ef } } : {}) }; }
  async function activeOf(c, pid) { return S.txAs({ santa: true }, async c => (await c.query("select distinct k.id, to_char(k.carry_end, 'YYYY-MM-DD') ce from mk_credit_use u join mk_contract k on k.id = u.contract_id where u.product_id = $1 and u.kind = 'use' and k.status in ('active','carry')", [pid])).rows); }
  async function putControl(c, cid, b, by) {
    const n = v => v == null || v === '' ? null : Math.max(0, int(v)) || null;
    const cap = n(b.monthCap), pre = n(b.preFrom); const cols = b.allowCols == null ? null : arr(b.allowCols, 50, COL_RE); const grps = b.allowGroups == null ? null : arr(b.allowGroups, 100);
    const al = Array.isArray(b.alertBp) ? b.alertBp.map(int).filter(x => x > 0 && x < 10000).slice(0, 4) : [2000, 1000]; const to = Array.isArray(b.alertTo) ? b.alertTo.map(x => str(x, 80)).slice(0, 10) : null;
    return q1(c, `insert into mk_control (contract_id, month_cap, allow_cols, allow_groups, pre_from, alert_bp, alert_to, by_email) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (contract_id) do update set month_cap = $2, allow_cols = $3, allow_groups = $4, pre_from = $5, alert_bp = $6, alert_to = $7, by_email = $8, at = now() returning *`, [cid, cap, cols, grps, pre, al, to, by]);
  }
  /* 산타 운영 매출(dev-addendum 3장 · A9-V). from · to = YYYY-MM */
  async function revenue(c, q) {
    const to = /^\d{4}-\d{2}$/.test(q.get('to') || '') ? q.get('to') : ym(); const from = /^\d{4}-\d{2}$/.test(q.get('from') || '') ? q.get('from') : to.slice(0, 4) + '-01';
    const rows = (await c.query(`select to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') m, u.cp_tid, p.owner_kind ok, sum(u.credits)::int cr from mk_credit_use u join mk_product p on p.id = u.product_id
      where u.kind in ('use','restore') and to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2 group by 1, 2, 3`, [from, to])).rows;
    const rates = new Map(); const rateOf = async (cp, m) => { if (!rates.has(cp)) rates.set(cp, (await c.query("select cp_bp, to_char(effective_from, 'YYYY-MM-DD') ef from mk_cp_rate where cp_tid = $1", [cp])).rows.map(r => ({ effectiveFrom: r.ef, cpBp: r.cp_bp }))); return calc.rateAt(rates.get(cp), m + '-01'); };
    const lines = []; const byM = {}; const byRate = {};
    for (const r of rows) { const bp = r.ok === 'santa' ? 0 : await rateOf(r.cp_tid, r.m); const src = r.ok === 'santa' ? 'credit_orig' : 'credit_cp'; lines.push({ source: src, credits: r.cr, cpBp: bp }); (byM[r.m] = byM[r.m] || []).push({ source: src, credits: r.cr, cpBp: bp });
      if (r.ok !== 'santa') { const k = calc.rateKindOf(bp) || 'standard'; const x = byRate[k] || (byRate[k] = { rateKind: k, cps: new Set(), credits: 0, santa: 0 }); x.cps.add(r.cp_tid); x.credits += r.cr; x.santa += calc.settleLine(r.cr, bp).santa; } }
    const fee = (await q1(c, "select coalesce(sum(amount), 0)::int n from mk_entry where kind = 'promo_fee' and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2", [from, to])).n;
    const single = (await q1(c, "select coalesce(sum(amount), 0)::int n from mk_entry where kind = 'single_sale' and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2", [from, to])).n;
    if (fee) lines.push({ source: 'promo', amount: fee }); if (single) lines.push({ source: 'single', amount: single, cp: calc.singleCand(single) });
    const mix = calc.santaMix(lines); const bySource = mix.bySource.map(x => ({ source: x.source, gross: x.gross, cp: x.cp, santa: x.santa, santaBp: x.santaBp }));
    /* 인식 매출(소진 기준 · 보너스 반영): 계약별 순소진 × 계약 구매액(추가 구매 포함) ÷ 계약 총크레딧, 반올림 */
    const rk = (await c.query(`select u.contract_id, sum(u.credits)::int cr, (select coalesce(sum(credits), 0)::int from mk_credit_wallet w where w.contract_id = u.contract_id) tot,
        (select coalesce(sum(supply_total), 0)::int from mk_contract x where (x.id = u.contract_id or x.renew_of = u.contract_id) and x.status in ('active','carry','ended','merged')) sup
      from mk_credit_use u where u.kind in ('use','restore') and to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2 group by u.contract_id`, [from, to])).rows;
    const recognized = rk.reduce((s, r) => s + calc.recognized(r.cr, r.sup, r.tot), 0) + fee + single;
    const minQ = (await q1(c, "select min(santa_bp)::int n, count(*) filter (where santa_bp < 3000)::int below from mk_quote where kind = 'credit' and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2", [from, to]));
    return { from, to, bySource, byRate: Object.values(byRate).map(x => ({ rateKind: x.rateKind, cps: x.cps.size, credits: x.credits, santa: x.santa })),
      trend: Object.keys(byM).sort().map(m => { const z = calc.santaMix(byM[m]); return { ym: m, santa: z.santa, santaBp: z.santaBp }; }), guard: { minQuoteBp: minQ.n, below: minQ.below }, totals: { gross: mix.gross, cp: mix.cp, santa: mix.santa, santaBp: mix.santaBp, recognized, santaRecognized: recognized - mix.cp, santaRecognizedBp: recognized > 0 ? Math.floor((recognized - mix.cp) * 10000 / recognized) : 0 } };
  }

  /* 경로 매개변수 */
  const ID = '([a-z]{2,3}_[a-z0-9]{3,24})';
  const P = [
    ['GET', /^\/api\/market\/products\/(mp_[a-z0-9]{12})$/, async (req, id) => { const a = await need(req); const staff = a.role !== 'teacher';
      return T(async c => { await needPilot(c, a.tid); const day = today(); const r = await prod(c, id, day); if (!r || (r.status !== 'listed' && r.owner_tid !== a.tid && !isSanta(a))) throw E(404, 'product', '없는 상품입니다.');
        const H = await priceRows(c, id); const nxt = H.filter(h => h.ef > day).pop();
        const cols = (await c.query('select c.id, c.title from mk_collection_item i join mk_collection c on c.id = i.collection_id where i.product_id = $1', [id])).rows;
        return { product: prodOut(r, day, staff), ver: r.cur_ver, ...(staff && r.list_price ? { price: { listPrice: r.list_price, credits: r.credits, volRules: r.vol_rules, lic: r.lic_allowed, licAdd: r.lic_add_bp, ...(nxt ? { nextPrice: { credits: nxt.credits, effectiveFrom: nxt.ef } } : {}) } } : {}),
          optin: { mode: modeOf(r, day), creditFrom: r.cf, ...(r.mode === 'single_until' ? { singleUntil: optinFromOf(r) } : {}) }, collections: cols, seller: r.owner_kind === 'santa' ? '산타 오리지널' : r.cp_name || '' }; }); }],
    ['GET', /^\/api\/market\/collections\/(mc_[a-z0-9]{3,24})$/, async (req, id) => { const a = await need(req); return T(async c => { await needPilot(c, a.tid); const [x] = await collections(c, today(), [id]); if (!x) throw E(404, 'collection', '없는 컬렉션입니다.');
      return { collection: { id: x.id, kind: x.kind, title: x.title, sector: x.sector }, items: x.rows.map(r => prodOut(r, today(), a.role !== 'teacher')), avgCredits: x.avgCredits, count: x.count }; }); }],
    ['GET', /^\/api\/market\/quotes\/(mq_[a-z0-9]{12})$/, async (req, id) => { const a = await needStaff(req); return T(async c => { const q = await q1(c, 'select * from mk_quote where id = $1', [id]); if (!q || (q.buyer_tid !== a.tid && !isSanta(a))) throw E(404, 'quote', '없는 견적입니다.'); return { quote: quoteOut(q, isSanta(a)) }; }); }],
    ['GET', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})$/, async (req, id) => { const a = await needStaff(req); return T(async c => { const k = await contractOf(c, a, id); const W = await walletState(c, k);
      const byCp = (await c.query("select p.owner_kind ok, coalesce(pa.cp_name, '') cp, sum(u.credits)::int credits from mk_credit_use u join mk_product p on p.id = u.product_id left join mk_party pa on pa.tid = u.cp_tid where u.contract_id = $1 group by 1, 2 order by 3 desc", [k.id])).rows.map(r => ({ cp: r.ok === 'santa' ? '산타 오리지널' : r.cp, credits: r.credits }));
      const byGroup = (await c.query("select coalesce(grp, '') g, sum(credits)::int credits, count(distinct sid_hash)::int n from mk_credit_use where contract_id = $1 group by 1 order by 2 desc", [k.id])).rows.map(r => ({ group: r.g || null, credits: r.credits, learners: r.n < 5 ? '5명 미만' : r.n }));
      const month = await q1(c, "select coalesce(sum(credits), 0)::int n from mk_credit_use where contract_id = $1 and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') = $2", [k.id, ym()]);
      const pre = await q1(c, "select count(*)::int n from mk_preapproval where contract_id = $1 and status = 'asked'", [k.id]);
      return { contract: kOut(k), wallet: W.wallet, balance: W.balance, total: W.total, control: ctlOut(W.ctl), used: { month: month.n, total: W.total - W.lots.reduce((s, l) => s + l.remain, 0), byCollection: [], byGroup, byCp }, alerts: W.alert ? [W.alert] : [], pending: { pre: pre.n, restore: 0 } }; }); }],
    ['GET', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/uses$/, async (req, id) => { const a = await needStaff(req); const q = Q(req); return T(async c => { const k = await contractOf(c, a, id); const now = new Date().toISOString();
      const rows = (await c.query('select u.*, p.title from mk_credit_use u join mk_product p on p.id = u.product_id where u.contract_id = $1' + (q.get('product') ? ' and u.product_id = $2' : '') + ' order by u.at desc', q.get('product') ? [k.id, str(q.get('product'), 20)] : [k.id])).rows;
      return pageOf(q, rows.map(u => useOut(u, now))); }); }],
    ['PUT', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/controls$/, async (req, id) => { const a = await needOwner(req); const b = await body(req); return T(async c => { const k = await contractOf(c, a, id); if (k.buyer_tid !== a.tid) throw E(404, 'contract', '없는 계약입니다.');
      const t = await putControl(c, k.id, b, a.email); await log(a.tid, a.email, 'market.control', { contract: k.id }); return { ok: true, control: ctlOut(t) }; }); }],
    ['GET', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/preapprovals$/, async (req, id) => { const a = await needStaff(req); return T(async c => { const k = await contractOf(c, a, id);
      return { items: (await c.query('select a.*, p.title from mk_preapproval a join mk_product p on p.id = a.product_id where a.contract_id = $1 order by a.at desc', [k.id])).rows.map(x => ({ id: x.id, product: x.product_id, title: x.title, learner: { key: x.sid_hash.slice(0, 10) }, status: x.status, at: x.at })) }; }); }],
    ['POST', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/preapprovals\/(ma_[a-z0-9]{12})\/decide$/, async (req, id, pid) => { const a = await needStaff(req); const b = await body(req); return T(async c => { const k = await contractOf(c, a, id);
      const x = await q1(c, "update mk_preapproval set status = $3, memo = $4, decided_by = $5, decided_at = now() where id = $1 and contract_id = $2 and status = 'asked' returning *", [pid, k.id, b.ok ? 'ok' : 'no', str(b.memo, 200) || null, a.email]);
      if (!x) throw E(409, 'mk_pre_state', '이미 처리한 승인 요청입니다.'); return { ok: true, preapproval: { id: x.id, status: x.status } }; }); }],
    ['POST', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/restore$/, async (req, id) => { const a = await needStaff(req); const b = await body(req);
      return T(async c => { const k = await contractOf(c, a, id, true); if (k.buyer_tid !== a.tid) throw E(404, 'contract', '없는 계약입니다.'); return idem(c, a.tid, 'restore', b.idem, async () => {
        const u = await q1(c, "select * from mk_credit_use where id = $1 and contract_id = $2 and kind = 'use' for update", [str(b.useId, 20), k.id]); if (!u) throw E(404, 'use', '없는 차감 기록입니다.');
        if (u.restored) throw E(409, 'mk_restore_state', '이미 복원한 차감입니다.');
        const prog = Math.max(0, Math.min(100, int(b.progPct) || 0)); const h = calc.hoursBetween(new Date(u.at).toISOString(), new Date().toISOString());
        if (!calc.restorable(h, prog)) throw E(409, 'mk_restore_window');
        const r = await doRestore(c, k, u, a.email, b.reason, prog); const W = await walletState(c, k); await log(a.tid, a.email, 'market.restore', { contract: k.id, use: u.id, credits: u.credits });
        return { ok: true, use: { id: r.id, kind: 'restore', credits: r.credits, restoreOf: u.id }, wallet: W.wallet, balance: W.balance }; }); }); }],
    ['POST', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/dispute$/, async (req, id) => { const a = await needStaff(req); const b = await body(req); return T(async c => { const k = await contractOf(c, a, id); if (k.buyer_tid !== a.tid) throw E(404, 'contract', '없는 계약입니다.');
      const u = await q1(c, "select id from mk_credit_use where id = $1 and contract_id = $2 and kind = 'use' and not restored", [str(b.useId, 20), k.id]); if (!u) throw E(404, 'use', '없는 차감 기록입니다.');
      const d = await q1(c, "insert into mk_dispute (id, kind, ref, from_tid, body) values ($1,'restore',$2,$3,$4) returning *", [rid('md_'), u.id, a.tid, str(b.reason, 500)]); return { ok: true, dispute: d }; }); }],
    ['POST', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/topup$/, async (req, id) => { const a = await needOwner(req); const b = await body(req); await needPaid(a.tid);
      return T(async c => { await needPilot(c, a.tid); const k = await contractOf(c, a, id); if (k.buyer_tid !== a.tid || !['active', 'carry'].includes(k.status)) throw E(409, 'mk_contract_state', '이용 중인 계약만 추가 구매할 수 있습니다.');
        return idem(c, a.tid, 'topup', b.idem, async () => ({ ok: true, quote: quoteOut(await creditQuote(c, a.tid, { input: { budget: b.amount, collections: k.collections, topupOf: k.id } }, a.email, false), false) })); }); }],
    ['POST', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/refund$/, async (req, id) => { const a = await needOwner(req); const b = await body(req);
      return T(async c => { const k = await contractOf(c, a, id, true); if (k.buyer_tid !== a.tid) throw E(404, 'contract', '없는 계약입니다.'); return idem(c, a.tid, 'refund', b.idem, async () => {
        const L = liveLots(await lotsOf(c, k.id), today()); const paidUnused = L.filter(l => l.lot !== 'bonus').reduce((s, l) => s + l.remain, 0); const bonusUsed = (await lotsOf(c, k.id)).filter(l => l.lot === 'bonus').reduce((s, l) => s + l.credits - l.remain, 0);
        const refund = { paidUnused, bonusUsed, amount: Math.max(0, (paidUnused - bonusUsed) * calc.WON), reason: str(b.reason, 300), status: 'requested', at: new Date().toISOString(), lawCheck: '법무 검토 필요' };
        await c.query('update mk_contract set refund = $2 where id = $1', [k.id, JSON.stringify(refund)]); await log(a.tid, a.email, 'market.refund', { contract: k.id, amount: refund.amount }); return { ok: true, refund, status: 'requested' }; }); }); }],
    ['POST', /^\/api\/market\/contracts\/(mk_[a-z0-9]{12})\/activate$/, async (req, id) => { const a = await needSanta(req); const b = await body(req);
      return T(async c => idem(c, a.tid, 'activate:' + id, b.idem, async () => { const k = await contractOf(c, a, id, true); const out = await activate(c, k, b, a.email); await log(k.buyer_tid, a.email, 'market.activate', { contract: id }); return { ok: true, ...out }; })); }],
    /* CP 상품 */
    ['POST', /^\/api\/market\/cp\/products\/(mp_[a-z0-9]{12})\/submit$/, async (req, id) => { const a = await needCp(req); return T(async c => { const r = await prod(c, id, '9999-12-31'); if (!r || r.owner_tid !== a.tid) throw E(404, 'product', '없는 상품입니다.');
      if (!['draft', 'needs_fix'].includes(r.status)) throw E(409, 'mk_review_state', '이미 제출한 상품입니다.');
      const failed = [...(!r.title ? ['title'] : []), ...(!(r.hours_x10 > 0) ? ['hours'] : []), ...(!r.list_price ? ['price'] : [])]; if (failed.length) throw E(422, 'mk_check', null, { failed });
      await c.query("update mk_product set status = 'in_review' where id = $1", [id]); return { ok: true, product: { id, status: 'in_review' } }; }); }],
    ['PUT', /^\/api\/market\/cp\/products\/(mp_[a-z0-9]{12})\/price$/, async (req, id) => { const a = await needCp(req); const b = await body(req); return T(async c => {
      const r = await q1(c, 'select * from mk_product where id = $1 for update', [id]); if (!r || r.owner_tid !== a.tid) throw E(404, 'product', '없는 상품입니다.');
      const lp = int(b.listPrice); if (!(lp > 0 && lp <= 100000000)) throw E(400, 'price', '정가를 확인하십시오.');
      const fl = b.floorPrice == null || b.floorPrice === '' ? null : int(b.floorPrice); if (fl != null && (!(fl >= 0) || fl > lp)) throw E(422, 'mk_floor');
      const vol = (Array.isArray(b.volRules) ? b.volRules : []).slice(0, 5).map(v => ({ fromN: int(v.fromN), offBp: int(v.offBp) })); if (vol.some(v => !(v.fromN >= 2) || !(v.offBp > 0 && v.offBp <= 5000))) throw E(400, 'vol', '수량 할인은 2번째 수강 이상 · 50% 이내로 입력하십시오.');
      const lic = Array.isArray(b.lic) ? [...new Set(['stream', ...b.lic.filter(x => LIC.includes(x))])] : ['stream']; const add = {}; for (const k of ['lms_export', 'adapt']) if (b.licAdd && b.licAdd[k] != null) add[k] = Math.max(0, Math.min(10000, int(b.licAdd[k]) || 0));
      const H = await priceRows(c, id); const day = today(); const cur = priceNow(H, day);
      const eff = cur ? calc.effectiveFrom(day) : day; /* 첫 단가는 오늘부터, 변경은 다음 달 1일부터 */
      if (cur && lp > cur.list_price) { const qtr = d => `${d.slice(0, 4)}-${Math.floor((+d.slice(5, 7) - 1) / 3)}`; const ups = H.filter((h, i) => i > 0 && h.ef <= day && h.list_price > H[i - 1].list_price && qtr(kstDay(h.requested_at)) === qtr(day));
        if (lp * 10 > cur.list_price * 13 || ups.length) throw E(422, 'mk_price_step'); }
      await c.query('delete from mk_price where product_id = $1 and effective_from > $2::date', [id, day]); /* 아직 적용 전 변경은 새 값으로 대체 */
      const row = await q1(c, "insert into mk_price (product_id, list_price, credits, vol_rules, floor_price, lic_allowed, lic_add_bp, b2c_price_vat, effective_from, by_email) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *, to_char(effective_from, 'YYYY-MM-DD') ef",
        [id, lp, calc.credits(lp), JSON.stringify(vol), fl, lic, JSON.stringify(add), b.b2cPriceVat == null ? null : int(b.b2cPriceVat) || null, eff, a.email]);
      const po = x => x ? { effectiveFrom: x.ef, listPrice: x.list_price, credits: x.credits, volRules: x.vol_rules, floorPrice: x.floor_price, lic: x.lic_allowed, licAdd: x.lic_add_bp } : null;
      return { ok: true, price: po(row), current: po(cur || row) }; }); }],
    ['GET', /^\/api\/market\/cp\/products\/(mp_[a-z0-9]{12})\/price-history$/, async (req, id) => { const a = await needCp(req); return T(async c => { const r = await q1(c, 'select owner_tid from mk_product where id = $1', [id]); if (!r || r.owner_tid !== a.tid) throw E(404, 'product', '없는 상품입니다.');
      return { items: (await priceRows(c, id)).map(h => ({ effectiveFrom: h.ef, listPrice: h.list_price, credits: h.credits, volRules: h.vol_rules })) }; }); }],
    ['PUT', /^\/api\/market\/cp\/products\/(mp_[a-z0-9]{12})\/optin$/, async (req, id) => { const a = await needCp(req); if (a.role !== 'owner') throw E(403, 'role', '정운영자만 바꿀 수 있습니다.'); const b = await body(req);
      return T(async c => idem(c, a.tid, 'optin:' + id, b.idem, async () => { const day = today(); const r = await prod(c, id, day); if (!r || r.owner_tid !== a.tid) throw E(404, 'product', '없는 상품입니다.');
        const mode = ['credit', 'single', 'single_until'].includes(b.mode) ? b.mode : null; if (!mode) throw E(400, 'mode', '참여 방식을 고르십시오.');
        const months = mode === 'single_until' ? Math.max(1, Math.min(24, int(b.singleMonths) || 0)) : null; if (mode === 'single_until' && !(int(b.singleMonths) > 0)) throw E(400, 'months', '개별 전용 개월 수를 입력하십시오.');
        const cur = modeOf(r, day); const act = await activeOf(c, id);
        if (mode === 'single' && cur === 'credit' && r.mu && day < r.mu && !b.confirm) throw E(409, 'mk_optin_min', `최소 참여 기간(${r.mu}까지) 안의 철회입니다. 새 기관에는 바로 보이지 않고, 이미 이용 중인 ${act.length}곳은 계약 기간 끝까지 계속 이용합니다.`, { minUntil: r.mu, activeContracts: act.length });
        const from = mode === 'credit' ? (cur === 'credit' && r.cf ? r.cf : day) : mode === 'single_until' ? calc.eligibleFrom(r.la || day, months) : null;
        const row = await q1(c, "insert into mk_optin (product_id, mode, single_months, credit_from, min_until, withdrawn_at, by_email) values ($1,$2,$3,$4,$5,$6,$7) returning *, to_char(credit_from, 'YYYY-MM-DD') cf, to_char(min_until, 'YYYY-MM-DD') mu",
          [id, mode, months, from, from ? calc.optinMinEnd(from) : null, mode === 'single' && cur === 'credit' ? new Date() : null, a.email]);
        if (mode === 'single' && cur === 'credit') await log(a.tid, a.email, 'market.optin.withdraw', { product: id, activeContracts: act.length });
        return { ok: true, optin: { mode: row.mode, creditFrom: row.cf, singleMonths: row.single_months }, minUntil: row.mu, impact: { activeContracts: act.length, keepUntil: act.map(x => x.ce) } }; })); }],
    ['GET', /^\/api\/market\/cp\/statements\/(ms_[a-z0-9]{12})$/, async (req, id) => { const a = await needCp(req); return T(async c => { const s = await q1(c, 'select * from mk_stmt where id = $1 and cp_tid = $2', [id, a.tid]); if (!s) throw E(404, 'stmt', '없는 정산서입니다.'); return { stmt: S.settle.stmtOut(s) }; }); }],
    ['POST', /^\/api\/market\/cp\/statements\/(ms_[a-z0-9]{12})\/dispute$/, async (req, id) => { const a = await needCp(req); const b = await body(req); return T(async c => {
      const s = await q1(c, "update mk_stmt set status = 'disputed' where id = $1 and cp_tid = $2 and status = 'draft' returning *", [id, a.tid]); if (!s) throw E(409, 'mk_stmt_state', '초안 정산서만 이의 신청할 수 있습니다.');
      await c.query("insert into mk_dispute (id, kind, ref, from_tid, body) values ($1,'stmt',$2,$3,$4)", [rid('md_'), id, a.tid, str(b.reason, 500)]); return { ok: true, stmt: S.settle.stmtOut(s) }; }); }],
    ['GET', /^\/api\/market\/cp\/catalog\/import\/(mj_[a-z0-9]{12})$/, async (req, id) => { const a = await needCp(req); return T(async c => { const x = await q1(c, "select resp from mk_idem where tid = $1 and route = 'cp-import-job' and key = $2", [a.tid, id]); if (!x) throw E(404, 'job', '없는 작업입니다.'); return x.resp; }); }],
    ['POST', /^\/api\/market\/cp\/requests\/(mq_[a-z0-9]{12})\/decide$/, async (req, id) => { const a = await needCp(req); const b = await body(req); return T(async c => {
      const x = await q1(c, "select * from mk_quote where id = $1 and kind = 'single' and status = 'cp_wait' for update", [id]); if (!x) throw E(409, 'mk_quote_state');
      const own = new Set((await c.query('select id from mk_product where owner_tid = $1', [a.tid])).rows.map(r => r.id)); const mine = (x.input.lines || []).filter(l => own.has(l.productId)); if (!mine.length) throw E(404, 'quote', '없는 요청입니다.');
      const ok = Object.assign({}, x.input.cpOk || {}, { [a.tid]: !!b.ok }); const owners = new Set((await c.query('select distinct owner_tid from mk_product where id = any($1)', [(x.input.lines || []).map(l => l.productId)])).rows.map(r => r.owner_tid));
      /* 승인 = CP 몫을 견적가 × 70%(CP 후보)로 받아들임 → 산타 30% 유지. 거절이면 견적 취소(최소 견적가 안내는 est.minPrice) */
      const status = !b.ok ? 'cancelled' : [...owners].every(t => ok[t]) ? 'ready' : 'cp_wait';
      const y = await q1(c, 'update mk_quote set input = $2, status = $3 where id = $1 returning *', [id, JSON.stringify({ ...x.input, cpOk: ok }), status]); await log(x.buyer_tid, a.email, 'market.cp_request', { quote: id, ok: !!b.ok });
      return { ok: true, request: { id, status: y.status, decided: !!b.ok } }; }); }],
    ['POST', /^\/api\/market\/ops\/quotes\/(mq_[a-z0-9]{12})\/send$/, async (req, id) => { const a = await needSanta(req); return T(async c => { const x = await q1(c, "update mk_quote set status = 'sent' where id = $1 and status = 'ready' returning *", [id]); if (!x) throw E(409, 'mk_quote_state');
      await log(x.buyer_tid, a.email, 'market.quote.send', { quote: id }); return { ok: true, quote: quoteOut(x, true) }; }); }],
    ['POST', /^\/api\/market\/ops\/quotes\/(mq_[a-z0-9]{12})\/adjust$/, async (req, id) => { const a = await needSanta(req); const b = await body(req); return T(async c => idem(c, a.tid, 'ops-adjust:' + id, b.idem, async () => {
      const x = await q1(c, "select * from mk_quote where id = $1 and status in ('ready','sent','cp_wait') for update", [id]); if (!x) throw E(409, 'mk_quote_state');
      /* 조정 = 새 견적 발행(가드 다시 검사) + 이전 견적 취소 */
      const y = x.kind === 'single' ? await singleQuote(c, x.buyer_tid, { price: b.price != null ? b.price : x.supply_total, lines: b.lines || x.input.lines }, a.email)
        : await creditQuote(c, x.buyer_tid, { input: { ...x.input, ...(b.budget != null ? { budget: b.budget } : {}) }, bonusBp: b.bonusBp != null ? b.bonusBp : x.bonus_bp }, a.email, true);
      await c.query("update mk_quote set status = 'cancelled' where id = $1", [id]); return { ok: true, quote: quoteOut(y, true), replaced: id }; })); }],
    ['GET', /^\/api\/market\/cp\/statements\/(ms_[a-z0-9]{12})\/pdf$/, async (req, id, res) => { const a = await needCp(req); const s0 = await T(c => q1(c, 'select * from mk_stmt where id = $1 and cp_tid = $2', [id, a.tid])); if (!s0) throw E(404, 'stmt', '없는 정산서입니다.');
      const s = S.settle.stmtOut(s0); const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); const won = n => Number(n || 0).toLocaleString('ko-KR');
      const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>월 소진 정산서 ${h(s.ym)}</title><style>body{font-family:sans-serif;margin:32px;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px 8px;text-align:left}td.n{text-align:right}@media print{button{display:none}}</style></head><body>
<h1>디디쌤 콘텐츠 패스 월 소진 정산서</h1><p>정산 월 ${h(s.ym)} · 분기 ${h(s.quarter)} · 상태 ${h(s.status)} · 적용 요율 ${h(s.rateKind)} ${s.cpBp / 100}%</p>
<table><tr><th>차감</th><th>복원</th><th>순소진(크레딧)</th><th>CP 몫(원)</th><th>조정</th><th>합계</th></tr><tr><td class="n">${won(s.used)}</td><td class="n">${won(s.restored)}</td><td class="n">${won(s.net)}</td><td class="n">${won(s.cpAmount)}</td><td class="n">${won(s.adj)}</td><td class="n">${won(s.total)}</td></tr></table>
<h2>기관별 집계(가명 · 5명 미만 가림)</h2><table><tr><th>기관</th><th>과정</th><th>수강</th><th>순소진</th></tr>${(s.lines || []).map(l => `<tr><td>${h(l.buyer)}</td><td>${h(l.title)}</td><td>${h(l.enrollments)}</td><td class="n">${won(l.net)}</td></tr>`).join('')}</table>
<p>부가세 별도. 지급은 분기 마감 확정 후 지급 지시로 처리됩니다.</p><button onclick="print()">인쇄 · PDF 저장</button></body></html>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'" }); res.end(html); }],
    ['DELETE', /^\/api\/market\/cp\/promos\/(mpr_[a-z0-9]{12})$/, async (req, id) => { const a = await needCp(req); return T(async c => { const p = await q1(c, 'select * from mk_promo where id = $1 and cp_tid = $2 for update', [id, a.tid]); if (!p) throw E(404, 'promo', '없는 신청입니다.');
      if (p.status !== 'asked') throw E(409, 'mk_promo_state', MSG2.mk_promo_state); const x = await q1(c, "update mk_promo set status = 'cancelled' where id = $1 returning *", [id]); return { ok: true, promo: promoOut(x) }; }); }],
    /* 산타 운영 */
    ['POST', /^\/api\/market\/ops\/reviews\/(mp_[a-z0-9]{12})\/decide$/, async (req, id) => { const a = await needSanta(req); const b = await body(req); const res0 = ['listed', 'needs_fix', 'rejected', 'suspended'].includes(b.result) ? b.result : null; if (!res0) throw E(400, 'result', '심사 결과를 고르십시오.');
      return T(async c => { const r = await q1(c, "update mk_product set status = $2, review_memo = $3 where id = $1 and status in ('in_review','submitted','listed','reported') returning id, status, owner_tid", [id, res0, str(b.memo, 300) || null]); if (!r) throw E(409, 'mk_review_state', '심사할 수 없는 상태입니다.');
        await log(r.owner_tid, a.email, 'market.review', { product: id, result: res0 }); return { ok: true, product: { id: r.id, status: r.status } }; }); }],
    ['PUT', /^\/api\/market\/ops\/orgs\/(tn_[a-z0-9]{8,16})\/pilot$/, async (req, tid) => { const a = await needSanta(req); const b = await body(req); const on = b.on === true;
      if (!(await pool.query('select 1 from tenants where id = $1', [tid])).rowCount) throw E(404, 'tenant', '없는 기관입니다.');
      await T(c => c.query('insert into mk_party (tid, pilot, pilot_by, pilot_at) values ($1,$2,$3,now()) on conflict (tid) do update set pilot = $2, pilot_by = $3, pilot_at = now()', [tid, on, a.email]));
      const doc = await inTenant(pool, tid, async c => (await c.query("update tenant_state set doc = jsonb_set(jsonb_set(doc, '{org}', coalesce(doc->'org', '{}'::jsonb)), '{org,mk}', coalesce(doc->'org'->'mk', '{}'::jsonb) || jsonb_build_object('pilot', $2::boolean)) where tenant_id = $1 returning 1", [tid, on])).rowCount);
      await log(tid, a.email, 'market.pilot', { on }); return { ok: true, tid, pilot: on, doc: !!doc }; }],
    ['PUT', /^\/api\/market\/ops\/parties\/(tn_[a-z0-9]{8,16})$/, async (req, tid) => { const a = await needSanta(req); const b = await body(req); const kind = ['buyer', 'seller', 'cp', 'santa'].includes(b.kind) ? b.kind : 'buyer';
      if (!(await pool.query('select 1 from tenants where id = $1', [tid])).rowCount) throw E(404, 'tenant', '없는 기관입니다.');
      const r = await T(c => q1(c, 'insert into mk_party (tid, kind, cp_name, active) values ($1,$2,$3,$4) on conflict (tid) do update set kind = $2, cp_name = coalesce($3, mk_party.cp_name), active = $4 returning tid, kind, cp_name, active, pilot', [tid, kind, str(b.cpName, 60) || null, b.active !== false]));
      await log(tid, a.email, 'market.party', { kind }); return { ok: true, party: { tid: r.tid, kind: r.kind, cpName: r.cp_name, active: r.active, pilot: r.pilot } }; }],
    ['PUT', /^\/api\/market\/ops\/cp-rates\/(tn_[a-z0-9]{8,16})$/, async (req, tid) => { const a = await needSanta(req); const b = await body(req);
      const bp = b.rateKind ? calc.RATE[b.rateKind] : int(b.cpBp); if (calc.rateCheck(bp, b.agreeRef)) throw E(422, 'mk_cp_rate', MSG2.mk_cp_rate);
      return T(async c => { const p = await party(c, tid); if (!isCp(p)) throw E(404, 'mk_cp'); return idem(c, a.tid, 'cp-rate:' + tid, b.idem, async () => { const eff = calc.nextMonth1(today());
        await c.query('delete from mk_cp_rate where cp_tid = $1 and effective_from > $2::date', [tid, today()]);
        const r = await q1(c, "insert into mk_cp_rate (cp_tid, rate_kind, cp_bp, effective_from, agree_ref, memo, by_email) values ($1,$2,$3,$4,$5,$6,$7) returning *, to_char(effective_from, 'YYYY-MM-DD') ef", [tid, calc.rateKindOf(bp), bp, eff, str(b.agreeRef, 80).trim(), str(b.memo, 300) || null, a.email]);
        await log(tid, a.email, 'market.cp_rate', { cpBp: bp, effectiveFrom: eff }); return { ok: true, rate: { rateKind: r.rate_kind, cpBp: r.cp_bp, effectiveFrom: r.ef } }; }); }); }],
    ['POST', /^\/api\/market\/ops\/promos\/(mpr_[a-z0-9]{12})\/decide$/, async (req, id) => { const a = await needSanta(req); const b = await body(req); return T(async c => { const p = await q1(c, 'select * from mk_promo where id = $1 for update', [id]); if (!p) throw E(404, 'promo', '없는 신청입니다.');
      if (p.status !== 'asked') throw E(409, 'mk_promo_state', MSG2.mk_promo_state);
      if (b.ok) { await c.query('select pg_advisory_xact_lock(hashtext($1))', ['mk_promo:' + p.ym + ':' + p.slot]); const n = (await q1(c, "select count(*)::int n from mk_promo where ym = $1 and slot = $2 and status = 'ok'", [p.ym, p.slot])).n; if (n >= calc.SLOT[p.slot].cap) throw E(409, 'mk_promo_full', MSG2.mk_promo_full); }
      const x = await q1(c, 'update mk_promo set status = $2, memo = $3, decided_by = $4 where id = $1 returning *', [id, b.ok ? 'ok' : 'no', str(b.memo, 200) || null, a.email]); return { ok: true, promo: promoOut(x) }; }); }],
    ['POST', /^\/api\/market\/ops\/disputes\/(md_[a-z0-9]{12})\/decide$/, async (req, id) => { const a = await needSanta(req); const b = await body(req); return T(async c => { const d = await q1(c, "select * from mk_dispute where id = $1 and status = 'open' for update", [id]); if (!d) throw E(409, 'mk_dispute_state', '이미 처리한 이의 신청입니다.');
      if (b.accept && d.kind === 'restore') { const u = await q1(c, "select * from mk_credit_use where id = $1 and kind = 'use' and not restored for update", [d.ref]); if (u) { const k = await contractOf(c, a, u.contract_id, true); await doRestore(c, k, u, a.email, '분쟁 승인: ' + str(b.memo, 150), null); } }
      if (d.kind === 'stmt') await c.query("update mk_stmt set status = 'draft' where id = $1 and status = 'disputed'", [d.ref]); /* 정산서 이의: 판정 뒤 초안으로 되돌려 다시 집계 */
      const x = await q1(c, 'update mk_dispute set status = $2, memo = $3, decided_by = $4, decided_at = now() where id = $1 returning *', [id, b.accept ? 'accepted' : 'rejected', str(b.memo, 300) || null, a.email]); return { ok: true, dispute: x }; }); }],
    ['POST', /^\/api\/market\/settle\/close\/(mz_[a-z0-9]{12})\/confirm$/, async (req, id) => { const a = await needSanta(req); return S.settle.confirm(id, a.email); }]
  ];
  void ID;
  return {
    pub,
    match(method, p) { if (!p.startsWith('/api/market/')) return null; const k = `${method} ${p}`; if (R[k]) return (req, res) => R[k](req, res);
      for (const [m, re, fn] of P) { if (m !== method) continue; const x = re.exec(p); if (x) return (req, res) => fn(req, ...x.slice(1), res); } return null; }
  };
};
