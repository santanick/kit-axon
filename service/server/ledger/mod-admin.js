'use strict';
/* v41 운영자 /api/ledger/*(09 3절). 조회는 owner · sub · teacher, 쓰기는 owner · sub(needStaff), 단위 · 단말 등록은 owner.
   돈이 나가거나 연락이 가는 일(환불 확정 · 청구서 링크 · 대사 반영)은 직원이 부른 요청에서만 실행한다. 모든 숫자는 calc 함수 값. */
module.exports = (ctx, S) => {
  const { pool, inTenant, readBody, limit, audit, need, needStaff, needOwner, env = process.env } = ctx; const { E, calc, str, int, DAY_RE, YM_RE } = S;
  const q = req => new URL(req.url, 'http://x').searchParams;
  const T = (a, fn) => inTenant(pool, a.tid, async c => { await S.needOn(c, a.tid); return fn(c); });
  const ids = v => Array.isArray(v) ? [...new Set(v.map(x => str(x, 40)).filter(x => /^lc_[a-z0-9]{12}$/.test(x)))].slice(0, 100) : [];
  const unitOut = u => ({ id: u.id, parentId: u.parent_id, kind: u.kind, name: u.name, tossMid: u.toss_mid, tossClientKey: u.toss_client_key, hasKey: !!u.toss_secret_enc, shareRateBp: u.share_rate_bp, active: u.active, sort: u.sort });
  const tree = U => { const by = new Map(U.map(u => [u.id, { ...unitOut(u), children: [] }])); const roots = []; for (const u of by.values()) { const p = u.parentId && by.get(u.parentId); if (p) p.children.push(u); else roots.push(u); } return roots; };
  const DESK = ['desk_card', 'cash', 'transfer', 'voucher'];
  const kstD = t => S.kstDay(t);
  const rcOut = r => ({ id: r.id, unit: r.unit_id, sid: r.sid, method: r.method, channel: r.channel, amount: r.amount, status: r.status, paidAt: r.paid_at, approvalNo: r.approval_no, cardIssuer: r.card_issuer, installment: r.installment, shareEligible: r.share_eligible, diffReason: r.diff_reason, corrects: r.corrects, legacyRef: r.legacy_ref });

  /* 미납 단계: 기한 지난 일수 */
  const stageOf = (due, today) => { if (!due) return 'nodue'; const d = Math.round((Date.parse(today) - Date.parse(due)) / 864e5); return d < -3 ? 'later' : d <= 0 ? 'soon' : d <= 7 ? 'd1' : d <= 30 ? 'd8' : 'd31'; };

  async function refundCreate(a, b) {
    const rid = str(b.receiptId, 40); const rule = str(b.ruleType || 'manual', 20); const reason = str(b.reason, 200).trim(); const idem = b.idem ? str(b.idem, 80) : null;
    return T(a, async c => {
      if (idem) { const ex = (await c.query('select * from led_refund where tenant_id = $1 and idem_key = $2', [a.tid, idem])).rows[0]; if (ex) return { ok: true, again: true, refund: rfOut(ex) }; }
      const R = (await c.query("select * from led_receipt where tenant_id = $1 and id = $2 and status = 'paid' for update", [a.tid, rid])).rows[0]; if (!R || R.amount <= 0) throw E(404, 'receipt', '환불할 수납이 없습니다.');
      if (R.corrects || (await c.query('select 1 from led_receipt where tenant_id = $1 and corrects = $2', [a.tid, R.id])).rowCount) throw E(409, 'corrected', '정정된 수납입니다.');
      if ((await c.query("select 1 from led_refund where tenant_id = $1 and receipt_id = $2 and status = 'pending'", [a.tid, R.id])).rowCount) throw E(409, 'pending', '확정하지 않은 환불이 있습니다.');
      const done = (await c.query("select coalesce(sum(amount), 0)::int n from led_refund where tenant_id = $1 and receipt_id = $2 and status = 'done'", [a.tid, R.id])).rows[0].n;
      const r = calc.refund({ rule, paid: R.amount, refunded: done, used: b.used, total: b.total, months: b.months, month: b.month, auto: b.auto });
      const amt = b.amount == null ? r.auto : int(b.amount); if (!Number.isInteger(amt) || amt <= 0) throw E(400, 'amount', '환불 금액을 확인해 주십시오.');
      if (amt > R.amount - done) throw E(400, 'over_refund', '환불 합계가 수납 금액을 넘습니다.', { max: R.amount - done });
      if (amt !== r.auto && !reason) throw E(400, 'reason', '계산 금액과 다르면 사유를 입력해 주십시오.', { auto: r.auto });
      const row = (await c.query("insert into led_refund (tenant_id, id, receipt_id, amount, rule_type, calc, auto_amount, edit_reason, reason, status, by_staff, idem_key) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11) returning *",
        [a.tid, S.rid('lr_'), R.id, amt, rule, JSON.stringify({ lines: r.lines, lawCheck: r.lawCheck }), r.auto, amt !== r.auto ? reason : null, reason || null, a.email, idem])).rows[0];
      await audit(c, a.tid, a.email, 'ledger.refund', { refund: row.id, receipt: R.id, amount: amt, auto: r.auto, rule });
      return { ok: true, refund: { ...rfOut(row), lines: r.lines, lawCheck: r.lawCheck } }; });
  }
  const rfOut = r => ({ id: r.id, receipt: r.receipt_id, amount: r.amount, auto: r.auto_amount, ruleType: r.rule_type, editReason: r.edit_reason, status: r.status, tossCancelOk: r.toss_cancel_ok, at: r.at, doneAt: r.done_at });

  async function refundConfirm(a, id, b) {
    const X = await T(a, async c => { const f = (await c.query('select * from led_refund where tenant_id = $1 and id = $2 for update', [a.tid, id])).rows[0]; if (!f) throw E(404, 'refund', '없는 환불입니다.');
      if (f.status !== 'pending') throw E(409, 'state', '이미 처리한 환불입니다.');
      const R = (await c.query('select * from led_receipt where tenant_id = $1 and id = $2', [a.tid, f.receipt_id])).rows[0];
      const done = (await c.query("select coalesce(sum(amount), 0)::int n from led_refund where tenant_id = $1 and receipt_id = $2 and status = 'done'", [a.tid, R.id])).rows[0].n;
      const amt = b.amount == null ? f.amount : int(b.amount); const why = str(b.editReason, 200).trim() || f.edit_reason || '';
      if (!Number.isInteger(amt) || amt <= 0) throw E(400, 'amount', '환불 금액을 확인해 주십시오.'); if (amt > R.amount - done) throw E(400, 'over_refund', '환불 합계가 수납 금액을 넘습니다.', { max: R.amount - done });
      if (amt !== f.auto_amount && !why) throw E(400, 'reason', '계산 금액과 다르면 사유를 입력해 주십시오.', { auto: f.auto_amount });
      return { f, R, amt, why, P: R.channel === 'toss' && R.toss_payment_key ? await S.payFor(c, a.tid, R.unit_id) : null }; });
    let key = null;
    if (X.P) { const r = await X.P.pay.cancel({ paymentKey: X.R.toss_payment_key, reason: X.f.reason || '환불', amount: X.amt, idem: 'lr-' + X.f.id + '-' + X.amt });
      if (!r.ok) { await T(a, c => audit(c, a.tid, a.email, 'ledger.refund.pg_fail', { refund: X.f.id, code: r.code })); throw E(502, 'pg', '토스 취소에 실패했습니다. 환불은 대기 상태로 남겨 두었습니다.'); } key = r.cancelKey; }
    return T(a, async c => { const row = (await c.query("update led_refund set status = 'done', amount = $3, edit_reason = $4, toss_cancel_ok = $5, toss_cancel_key = $6, done_at = now(), by_staff = $7 where tenant_id = $1 and id = $2 and status = 'pending' returning *",
      [a.tid, X.f.id, X.amt, X.amt !== X.f.auto_amount ? X.why : null, X.P ? true : null, key, a.email])).rows[0]; if (!row) throw E(409, 'state', '이미 처리한 환불입니다.');
      await audit(c, a.tid, a.email, 'ledger.refund.confirm', { refund: row.id, amount: X.amt, toss: !!X.P }); return { ok: true, refund: rfOut(row) }; });
  }

  const R = {
    'GET /api/ledger/units': async req => { const a = await need(req); return T(a, async c => { const U = await S.unitsOf(c, a.tid); return { ok: true, units: tree(U), flat: U.map(unitOut) }; }); },
    'POST /api/ledger/units': async req => { const a = await needOwner(req); const b = await readBody(req, 4096);
      return T(a, async c => { await S.ensureRoot(c, a.tid); const id = b.id ? str(b.id, 30) : S.rid('lu_'); if (!/^lu_[a-z0-9]{4,24}$/.test(id)) throw E(400, 'id', '단위 번호를 확인해 주십시오.');
        const cur = (await c.query('select * from led_unit where tenant_id = $1 and id = $2', [a.tid, id])).rows[0];
        const kind = b.kind != null ? str(b.kind, 10) : cur ? cur.kind : 'branch'; if (!['hq', 'branch', 'dept', 'facility'].includes(kind)) throw E(400, 'kind', '단위 종류를 확인해 주십시오.');
        const name = (b.name != null ? str(b.name, 60) : cur ? cur.name : '').trim(); if (!name) throw E(400, 'name', '이름을 입력해 주십시오.');
        let parent = id === 'lu_root' ? null : b.parentId !== undefined ? (b.parentId ? str(b.parentId, 30) : 'lu_root') : cur ? cur.parent_id : 'lu_root';
        if (parent) { const U = await S.unitsOf(c, a.tid); const by = new Map(U.map(u => [u.id, u])); if (!by.has(parent)) throw E(404, 'unit', '상위 단위가 없습니다.'); for (let p = parent, n = 0; p; p = (by.get(p) || {}).parent_id, n++) if (p === id || n > 50) throw E(400, 'cycle', '상위 단위를 확인해 주십시오.'); }
        const bp = b.shareRateBp != null ? int(b.shareRateBp) : cur ? cur.share_rate_bp : 40; if (!Number.isInteger(bp) || bp < 0 || bp > 10000) throw E(400, 'share', '쉐어율을 확인해 주십시오.');
        const sec = b.tossSecret === null || b.tossSecret === '' ? null : b.tossSecret != null ? S.seal(a.tid, id, str(b.tossSecret, 200).trim()) : cur ? cur.toss_secret_enc : null;
        const mid = b.tossMid !== undefined ? (str(b.tossMid, 60) || null) : cur ? cur.toss_mid : null; const ck = b.tossClientKey !== undefined ? (str(b.tossClientKey, 200) || null) : cur ? cur.toss_client_key : null;
        const act = b.active != null ? !!b.active : cur ? cur.active : true; const sort = b.sort != null ? int(b.sort) || 0 : cur ? cur.sort : 0;
        const row = (await c.query(`insert into led_unit (tenant_id, id, parent_id, kind, name, toss_mid, toss_client_key, toss_secret_enc, share_rate_bp, active, sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          on conflict (tenant_id, id) do update set parent_id = $3, kind = $4, name = $5, toss_mid = $6, toss_client_key = $7, toss_secret_enc = $8, share_rate_bp = $9, active = $10, sort = $11 returning *`, [a.tid, id, parent, kind, name, mid, ck, sec, bp, act, sort])).rows[0];
        await audit(c, a.tid, a.email, 'ledger.unit', { unit: id, name, keyChanged: b.tossSecret !== undefined }); return { ok: true, unit: unitOut(row) }; }); },

    'GET /api/ledger/summary': async req => { const a = await need(req); const Q = q(req); const { from, to } = S.range(Q);
      return T(a, async c => { const U = await S.unitsOf(c, a.tid); const rows = await S.rowsOf(c, a.tid, from, to); const unit = Q.get('unit') || null;
        return { ok: true, from, to, unit, ...calc.summary(rows, { from, to, unit, rollup: Q.get('rollup') === '1', units: S.unitCalc(U) }) }; }); },

    'GET /api/ledger/entries': async req => { const a = await need(req); const Q = q(req); const page = Math.max(1, int(Q.get('page')) || 1); const all = await entries(a, Q);
      return { ok: true, total: all.length, page, entries: all.slice((page - 1) * 50, page * 50) }; },

    'POST /api/ledger/charges': async req => { const a = await needStaff(req); const b = await readBody(req, 16 * 1024); const sid = str(b.sid, 40).trim(); if (!sid) throw E(400, 'sid', '학습자를 골라 주십시오.');
      const items = Array.isArray(b.items) ? b.items.slice(0, 50) : []; if (!items.length) throw E(400, 'items', '청구 항목을 입력해 주십시오.');
      const L = items.map(x => ({ itemType: S.ITEM.includes(x && x.itemType) ? x.itemType : 'etc', title: str(x && x.title, 100).trim(), amount: int(x && x.amount) }));
      if (L.some(x => !x.title || !Number.isInteger(x.amount) || !x.amount)) throw E(400, 'items', '항목 이름과 금액을 확인해 주십시오.'); if (L.reduce((s, x) => s + x.amount, 0) <= 0 || !L.some(x => x.amount > 0)) throw E(400, 'amount', '청구 합계는 0원보다 커야 합니다.');
      const ym = YM_RE.test(b.periodYm || '') ? b.periodYm : null; const due = DAY_RE.test(b.dueDate || '') ? b.dueDate : null; const idem = b.idem ? str(b.idem, 80) : null;
      return T(a, async c => { const u = await S.unitOf(c, a.tid, b.unitId);
        if (idem) { const ex = (await c.query('select bill_id from led_charge where tenant_id = $1 and idem_key = $2', [a.tid, idem + '#0'])).rows[0]; if (ex) return { ok: true, again: true, bill: await billOut(c, a.tid, ex.bill_id) }; }
        const bill = S.rid('lb_'); let i = 0; for (const x of L) await c.query('insert into led_charge (tenant_id, id, bill_id, unit_id, sid, item_type, title, amount, period_ym, due_date, src_type, src_id, idem_key) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
          [a.tid, S.rid('lc_'), bill, u.id, sid, x.itemType, x.title, x.amount, ym, due, b.srcType ? str(b.srcType, 20) : null, b.srcId ? str(b.srcId, 40) : null, idem ? `${idem}#${i++}` : null]);
        await audit(c, a.tid, a.email, 'ledger.charge', { bill, unit: u.id, lines: L.length, total: L.reduce((s, x) => s + x.amount, 0) }); return { ok: true, bill: await billOut(c, a.tid, bill) }; }); },

    'POST /api/ledger/charges/generate': async req => { const a = await needStaff(req); const b = await readBody(req, 2048); const ym = YM_RE.test(b.periodYm || '') ? b.periodYm : null; if (!ym) throw E(400, 'period', '청구 월을 확인해 주십시오.');
      const dry = b.dryRun !== false; const due = DAY_RE.test(b.dueDate || '') ? b.dueDate : `${ym}-10`;
      return T(a, async c => { const u = await S.unitOf(c, a.tid, b.unitId);
        const src = (await c.query(`select cl->>'id' cls, cl->>'name' name, cl->>'price' price, m->>'sid' sid from tenant_state t, jsonb_array_elements(case when jsonb_typeof(t.doc->'classes') = 'array' then t.doc->'classes' else '[]'::jsonb end) cl,
          jsonb_array_elements(case when jsonb_typeof(t.doc->'members') = 'array' then t.doc->'members' else '[]'::jsonb end) m
          where t.tenant_id = $1 and jsonb_typeof(cl->'learners') = 'array' and cl->'learners' @> jsonb_build_array(m->'id') and coalesce(m->>'sid', '') <> '' and coalesce(cl->>'status', '') not in ('closed', 'done', '종료')`, [a.tid])).rows
          .map(x => ({ cls: str(x.cls, 40), name: str(x.name || '수강료', 80), amount: int(String(x.price || '').replace(/[^\d.-]/g, '')), sid: str(x.sid, 40) })).filter(x => x.cls && Number.isInteger(x.amount) && x.amount > 0);
        const have = new Set((await c.query("select src_id || '|' || sid k from led_charge where tenant_id = $1 and src_type = 'class' and period_ym = $2 and status <> 'void' and amount > 0", [a.tid, ym])).rows.map(r => r.k));
        const todo = src.filter(x => !have.has(`${x.cls}|${x.sid}`)); const out = { ok: true, dryRun: dry, periodYm: ym, count: todo.length, skipped: src.length - todo.length, total: todo.reduce((s, x) => s + x.amount, 0), items: todo.slice(0, 200).map(x => ({ sid: x.sid, cls: x.cls, title: x.name, amount: x.amount })) };
        if (dry) return out; let made = 0;
        for (const x of todo) { const r = await c.query("insert into led_charge (tenant_id, id, bill_id, unit_id, sid, item_type, title, amount, period_ym, due_date, src_type, src_id) values ($1,$2,$3,$4,$5,'tuition',$6,$7,$8,$9,'class',$10) on conflict do nothing", [a.tid, S.rid('lc_'), S.rid('lb_'), u.id, x.sid, `${x.name} ${ym}`, x.amount, ym, due, x.cls]); made += r.rowCount; }
        await audit(c, a.tid, a.email, 'ledger.generate', { periodYm: ym, made, total: out.total }); return { ...out, made }; }); },

    'POST /api/ledger/receipts': async req => { const a = await needStaff(req); limit('lrc:' + a.tid, 600, 600e3); const b = await readBody(req, 4096);
      const method = str(b.method, 20); if (!DESK.includes(method)) throw E(400, 'method', '현장 수납 수단을 확인해 주십시오.'); const amount = int(b.amount); if (!Number.isInteger(amount) || amount <= 0) throw E(400, 'amount', '금액을 확인해 주십시오.');
      if (method === 'desk_card' && !str(b.approvalNo, 30).trim()) throw E(400, 'approval', '카드 승인번호를 입력해 주십시오.'); const idem = b.idem ? str(b.idem, 80) : null;
      const paidAt = b.paidAt && !isNaN(Date.parse(b.paidAt)) ? new Date(b.paidAt) : new Date(); if (paidAt.getTime() > Date.now() + 600e3) throw E(400, 'paid_at', '수납 시각을 확인해 주십시오.');
      return T(a, async c => { if (idem) { const ex = (await c.query('select * from led_receipt where tenant_id = $1 and idem_key = $2', [a.tid, idem])).rows[0]; if (ex) return { ok: true, again: true, receipt: rcOut(ex) }; }
        const u = await S.unitOf(c, a.tid, b.unitId);
        const { row, allocs } = await S.record(c, a.tid, { unit: u.id, sid: b.sid ? str(b.sid, 40) : null, chargeIds: ids(b.chargeIds), method, channel: 'desk', amount, paidAt, approvalNo: str(b.approvalNo, 30).trim() || null, cardIssuer: str(b.cardIssuer, 30) || null, installment: int(b.installment) || null, terminalId: str(b.terminalId, 30) || null, shareEligible: false, by: a.email, diffReason: str(b.diffReason, 200) || null, idem });
        await audit(c, a.tid, a.email, 'ledger.receipt', { receipt: row.id, amount, method }); return { ok: true, receipt: rcOut(row), allocs }; }); },

    'POST /api/ledger/refunds': async req => { const a = await needStaff(req); return refundCreate(a, await readBody(req, 4096)); },
    'GET /api/ledger/refunds': async req => { const a = await need(req); const st = q(req).get('status') || 'pending';
      return T(a, async c => ({ ok: true, refunds: (await c.query('select f.*, r.amount paid, r.method, r.channel, r.sid from led_refund f join led_receipt r on r.tenant_id = f.tenant_id and r.id = f.receipt_id where f.tenant_id = $1 and f.status = $2 order by f.at desc limit 200', [a.tid, str(st, 12)])).rows.map(r => ({ ...rfOut(r), paid: r.paid, method: r.method, channel: r.channel, sid: r.sid, calc: r.calc })) })); },

    'POST /api/ledger/links': async req => { const a = await needStaff(req); const b = await readBody(req, 4096); const chargeIds = ids(b.chargeIds); const sid = str(b.sid, 40).trim();
      if (!chargeIds.length || !sid) throw E(400, 'charge', '청구와 학습자를 골라 주십시오.'); const ttl = Math.min(24 * 30, Math.max(1, int(b.ttlHours) || 72));
      return T(a, async c => { const L = await S.linesOf(c, a.tid, { ids: chargeIds }); const mine = L.charges.filter(x => chargeIds.includes(x.id)); if (mine.length !== chargeIds.length || mine.some(x => x.sid !== sid)) throw E(404, 'charge', '없는 청구입니다.');
        if (!L.bal.lines.some(l => chargeIds.includes(l.id) && l.balance > 0)) throw E(409, 'paid', '잔액이 없는 청구입니다.');
        const tok = require('node:crypto').randomBytes(24).toString('base64url'); const exp = new Date(Date.now() + ttl * 3600e3);
        await c.query('insert into led_link (tenant_id, token_hash, charge_ids, sid, expires_at, created_by) values ($1,$2,$3,$4,$5,$6)', [a.tid, S.sha(tok), chargeIds, sid, exp, a.email]);
        await audit(c, a.tid, a.email, 'ledger.link', { charges: chargeIds, ttlHours: ttl }); return { ok: true, url: `/learner.html?t=${encodeURIComponent(a.tid)}&bill=${tok}`, token: tok, expiresAt: exp }; }); },

    'GET /api/ledger/close': async req => { const a = await need(req); const Q = q(req); const day = DAY_RE.test(Q.get('day') || '') ? Q.get('day') : S.kstDay(); const unit = Q.get('unitId') || Q.get('unit') || 'lu_root';
      return T(a, async c => ({ ok: true, day, unit, ...(await sys(c, a.tid, unit, day)), close: (await c.query('select * from led_close where tenant_id = $1 and unit_id = $2 and day = $3', [a.tid, unit, day])).rows.map(closeOut)[0] || null })); },
    'POST /api/ledger/close': async req => { const a = await needStaff(req); const b = await readBody(req, 2048); const day = DAY_RE.test(b.day || '') ? b.day : S.kstDay();
      const cc = int(b.cashCounted), kc = int(b.cardCounted); if (!Number.isInteger(cc) || !Number.isInteger(kc) || cc < 0 || kc < 0) throw E(400, 'counted', '실제 금액을 입력해 주십시오.');
      return T(a, async c => { const u = await S.unitOf(c, a.tid, b.unitId); const s = await sys(c, a.tid, u.id, day); const why = str(b.diffReason, 200).trim();
        if ((s.cashSystem !== cc || s.cardSystem !== kc) && !why) throw E(400, 'reason', '시스템 금액과 다르면 차이 사유를 입력해 주십시오.', { cashSystem: s.cashSystem, cardSystem: s.cardSystem });
        const id = S.rid('lk_'); let row; try { row = (await c.query('insert into led_close (tenant_id, id, unit_id, day, cash_system, cash_counted, card_system, card_counted, diff_reason, closed_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *', [a.tid, id, u.id, day, s.cashSystem, cc, s.cardSystem, kc, why || null, a.email])).rows[0]; }
        catch (e) { if (e.code === '23505') throw E(409, 'closed', '이미 마감한 날입니다.'); throw e; }
        await c.query("update led_receipt set close_id = $4 where tenant_id = $1 and unit_id = $2 and status = 'paid' and close_id is null and (paid_at at time zone 'Asia/Seoul')::date = $3", [a.tid, u.id, day, id]);
        await audit(c, a.tid, a.email, 'ledger.close', { unit: u.id, day, cashDiff: cc - s.cashSystem, cardDiff: kc - s.cardSystem }); return { ok: true, close: closeOut(row) }; }); },

    'GET /api/ledger/today': async req => { const a = await need(req);
      return T(a, async c => { const today = S.kstDay(); const sids = (await c.query("select distinct bill_id from led_charge where tenant_id = $1 and status in ('open','partial')", [a.tid])).rows.map(r => r.bill_id);
        const L = sids.length ? await S.linesOf(c, a.tid, { bills: sids }) : { bal: { lines: [] }, by: new Map() }; const stages = { soon: 0, d1: 0, d8: 0, d31: 0, nodue: 0, later: 0 }; const amounts = { soon: 0, d1: 0, d8: 0, d31: 0, nodue: 0, later: 0 }; const who = {};
        for (const l of L.bal.lines) { if (l.balance <= 0) continue; const x = L.by.get(l.id); const s = stageOf(x.due, today); amounts[s] += l.balance; (who[s] = who[s] || new Set()).add(x.sid); }
        for (const k of Object.keys(stages)) stages[k] = who[k] ? who[k].size : 0;
        const um = (await c.query("select coalesce(sum(jsonb_array_length(unmatched)), 0)::int n from led_import where tenant_id = $1 and at > now() - interval '30 days'", [a.tid])).rows[0].n;
        const pr = (await c.query("select count(*)::int n, coalesce(sum(amount), 0)::int amt from led_refund where tenant_id = $1 and status = 'pending'", [a.tid])).rows[0];
        const uc = (await c.query(`select r.unit_id unit, to_char((r.paid_at at time zone 'Asia/Seoul')::date, 'YYYY-MM-DD') as day from led_receipt r where r.tenant_id = $1 and r.status = 'paid' and r.channel = 'desk' and r.close_id is null and r.paid_at > now() - interval '8 days'
          and (r.paid_at at time zone 'Asia/Seoul')::date < (now() at time zone 'Asia/Seoul')::date group by 1, 2 order by 2`, [a.tid])).rows;
        const over = (await c.query("select count(*)::int n from led_receipt where tenant_id = $1 and diff_reason = 'over_paid' and status = 'paid'", [a.tid])).rows[0].n;
        return { ok: true, today, unpaid: { people: stages, amount: amounts }, unmatched: um, refundsPending: pr.n, refundsPendingAmount: pr.amt, unclosed: uc, overPaid: over }; }); },

    'GET /api/ledger/export': async (req, res) => { const a = await need(req); const Q = q(req); const { from, to } = S.range(Q);
      const out = { entries: await entries(a, Q) };
      const esc = v => { const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) && !/^-?\d+$/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
      const H = ['type', 'id', 'at', 'unit', 'sid', 'itemType', 'title', 'method', 'channel', 'amount', 'status', 'approvalNo', 'receipt', 'ruleType', 'diffReason'];
      const body = '﻿' + [H.join(',')].concat(out.entries.map(e => H.map(h => esc(e[h])).join(','))).join('\r\n') + '\r\n';
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="ledger-${from}-${to}.csv"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(body); },

    'POST /api/ledger/devices': async req => { const a = await needOwner(req); const b = await readBody(req, 1024); const mode = ['mock', 'ksnet', 'nice'].includes(b.mode) ? b.mode : 'mock'; const label = str(b.label, 40).trim() || '데스크 단말';
      return T(a, async c => { const u = await S.unitOf(c, a.tid, b.unitId); const id = S.rid('ld_'); const key = `${a.tid}.${require('node:crypto').randomBytes(24).toString('base64url')}`;
        await c.query('insert into led_device (tenant_id, id, unit_id, label, agent_key_hash, mode) values ($1,$2,$3,$4,$5,$6)', [a.tid, id, u.id, label, S.sha(key), mode]);
        await audit(c, a.tid, a.email, 'ledger.device', { device: id, unit: u.id, mode }); return { ok: true, device: { id, unit: u.id, label, mode }, agentKey: key }; }); },
    'GET /api/ledger/devices': async req => { const a = await needStaff(req); return T(a, async c => ({ ok: true, devices: (await c.query('select id, unit_id unit, label, mode, last_seen "lastSeen", created_at "createdAt" from led_device where tenant_id = $1 order by created_at', [a.tid])).rows })); },
    /* Lv2 에이전트: 로그인 없이 X-Agent-Key(= <tid>.<비밀>)로만. 단말 승인 결과 → desk_card 수납 확정 */
    'POST /api/ledger/device-push': async req => { const k = String(req.headers['x-agent-key'] || ''); const tid = k.split('.')[0]; if (!/^[A-Za-z0-9_-]{3,40}\.[A-Za-z0-9_-]{20,80}$/.test(k)) throw E(401, 'agent', '단말 키가 없습니다.');
      limit('ldp:' + tid, 600, 600e3); const b = await readBody(req, 4096); const amount = int(b.amount); if (!Number.isInteger(amount) || amount <= 0) throw E(400, 'amount', '금액을 확인해 주십시오.');
      const appr = str(b.approvalNo, 30).trim(); if (!appr) throw E(400, 'approval', '승인번호가 없습니다.');
      return inTenant(pool, tid, async c => { const d = (await c.query('select * from led_device where tenant_id = $1 and agent_key_hash = $2', [tid, S.sha(k)])).rows[0]; if (!d) throw E(401, 'agent', '등록되지 않은 단말입니다.'); await S.needOn(c, tid);
        await c.query('update led_device set last_seen = now() where tenant_id = $1 and id = $2', [tid, d.id]); const idem = 'dev:' + d.id + ':' + str(b.idem || appr, 60);
        const ex = (await c.query('select * from led_receipt where tenant_id = $1 and idem_key = $2', [tid, idem])).rows[0]; if (ex) return { ok: true, again: true, receipt: rcOut(ex) };
        const { row } = await S.record(c, tid, { unit: d.unit_id, sid: b.sid ? str(b.sid, 40) : null, chargeIds: ids(b.chargeIds), method: 'desk_card', channel: 'desk', amount, paidAt: new Date(), approvalNo: appr, cardIssuer: str(b.cardIssuer, 30) || null, installment: int(b.installment) || null, terminalId: str(b.terminalId, 30) || null, shareEligible: false, by: 'device:' + d.id, idem });
        await audit(c, tid, 'device:' + d.id, 'ledger.device.push', { receipt: row.id, amount, mode: d.mode }); return { ok: true, receipt: rcOut(row) }; }); },

    'GET /api/ledger/share': async req => { const a = await need(req); return require('./share')(ctx, S).report(a, q(req)); },
    'POST /api/ledger/import': async req => { const a = await needStaff(req); return require('./import')(ctx, S).run(a, await readBody(req, 2 * 1024 * 1024)); }
  };
  async function entries(a, Q) { const { from, to } = S.range(Q);
      const type = Q.get('type') || ''; const st = Q.get('status') || ''; const qq = str(Q.get('q'), 40).trim(); const unit = Q.get('unit') || null;
      return T(a, async c => { const U = await S.unitsOf(c, a.tid); const scope = unit ? calc.unitScope(unit, S.unitCalc(U), Q.get('rollup') === '1') : null;
        const ch = (await c.query("select 'charge' type, id, unit_id unit, sid, item_type \"itemType\", title, amount, status, created_at at, to_char(due_date, 'YYYY-MM-DD') \"dueDate\", bill_id bill from led_charge where tenant_id = $1 and (created_at at time zone 'Asia/Seoul')::date between $2 and $3", [a.tid, from, to])).rows;
        const rc = (await c.query("select 'receipt' type, id, unit_id unit, sid, method, channel, amount, status, coalesce(paid_at, created_at) at, approval_no \"approvalNo\", diff_reason \"diffReason\", corrects, legacy_ref \"legacyRef\", share_eligible \"shareEligible\" from led_receipt where tenant_id = $1 and (coalesce(paid_at, created_at) at time zone 'Asia/Seoul')::date between $2 and $3", [a.tid, from, to])).rows;
        const rf = (await c.query("select 'refund' type, f.id, r.unit_id unit, r.sid, f.receipt_id receipt, f.amount, f.status, coalesce(f.done_at, f.at) at, f.rule_type \"ruleType\", f.legacy_ref \"legacyRef\" from led_refund f join led_receipt r on r.tenant_id = f.tenant_id and r.id = f.receipt_id where f.tenant_id = $1 and (coalesce(f.done_at, f.at) at time zone 'Asia/Seoul')::date between $2 and $3", [a.tid, from, to])).rows;
        let all = ch.concat(rc, rf).filter(x => (!scope || scope.has(x.unit)) && (!type || x.type === type) && (!st || x.status === st) && (!qq || String(x.sid || '').includes(qq) || String(x.title || '').includes(qq) || x.id === qq));
        all.sort((x, y) => new Date(y.at) - new Date(x.at) || String(y.id).localeCompare(String(x.id)));
        return all; }); }
  async function sys(c, tid, unit, day) { const r = (await c.query(`select coalesce(sum(amount) filter (where method = 'cash'), 0)::int cash, coalesce(sum(amount) filter (where method = 'desk_card'), 0)::int card from led_receipt where tenant_id = $1 and unit_id = $2 and status = 'paid' and (paid_at at time zone 'Asia/Seoul')::date = $3`, [tid, unit, day])).rows[0];
    const f = (await c.query(`select coalesce(sum(f.amount) filter (where r.method = 'cash'), 0)::int cash, coalesce(sum(f.amount) filter (where r.method = 'desk_card'), 0)::int card from led_refund f join led_receipt r on r.tenant_id = f.tenant_id and r.id = f.receipt_id where f.tenant_id = $1 and r.unit_id = $2 and f.status = 'done' and (f.done_at at time zone 'Asia/Seoul')::date = $3`, [tid, unit, day])).rows[0];
    return { cashSystem: r.cash - f.cash, cardSystem: r.card - f.card }; }
  const closeOut = r => ({ id: r.id, unit: r.unit_id, day: kstD(r.day), cashSystem: r.cash_system, cashCounted: r.cash_counted, cardSystem: r.card_system, cardCounted: r.card_counted, diffReason: r.diff_reason, closedBy: r.closed_by, closedAt: r.closed_at });
  async function billOut(c, tid, bill) { const L = await S.linesOf(c, tid, { bills: [bill] }); const B = new Map(L.bal.lines.map(l => [l.id, l]));
    const lines = L.charges.sort((x, y) => String(x.idem_key || x.at_s).localeCompare(String(y.idem_key || y.at_s))).map(x => ({ id: x.id, itemType: x.item_type, title: x.title, amount: x.amount, due: (B.get(x.id) || {}).due || 0, balance: (B.get(x.id) || {}).balance || 0, status: (B.get(x.id) || {}).status || x.status }));
    return { id: bill, sid: L.charges[0] && L.charges[0].sid, unit: L.charges[0] && L.charges[0].unit_id, lines, total: lines.reduce((s, x) => s + x.due, 0), balance: lines.reduce((s, x) => s + x.balance, 0) }; }
  /* 정정: 반대 기록(삭제 금지). 토스 결제는 환불로 */
  async function correct(req, id) { const a = await needStaff(req); const b = await readBody(req, 1024); const reason = str(b.reason, 200).trim(); if (!reason) throw E(400, 'reason', '정정 사유를 입력해 주십시오.');
    return T(a, async c => { const o = (await c.query("select * from led_receipt where tenant_id = $1 and id = $2 and status = 'paid' for update", [a.tid, id])).rows[0]; if (!o || o.amount <= 0 || o.corrects) throw E(404, 'receipt', '정정할 수납이 없습니다.');
      if (o.channel === 'toss') throw E(409, 'use_refund', '온라인 결제는 환불로 처리해 주십시오.'); if (o.legacy_ref) throw E(409, 'legacy', '시설 예약 결제는 시설 화면에서 처리해 주십시오.');
      if ((await c.query("select 1 from led_refund where tenant_id = $1 and receipt_id = $2 and status <> 'cancelled'", [a.tid, id])).rowCount) throw E(409, 'refunded', '환불 기록이 있는 수납입니다.');
      const nid = S.rid('lp_'); let row;
      try { row = (await c.query(`insert into led_receipt (tenant_id, id, unit_id, sid, method, channel, amount, paid_at, status, approval_no, share_eligible, recorded_by, diff_reason, idem_key, corrects) values ($1,$2,$3,$4,$5,'manual',$6,now(),'paid',$7,$8,$9,$10,$11,$12) returning *`,
        [a.tid, nid, o.unit_id, o.sid, o.method, -o.amount, o.approval_no, o.share_eligible, a.email, reason, b.idem ? str(b.idem, 80) : null, o.id])).rows[0]; } catch (e) { if (e.code === '23505') throw E(409, 'corrected', '이미 정정한 수납입니다.'); throw e; }
      const al = (await c.query('select charge_id, amount from led_alloc where tenant_id = $1 and receipt_id = $2', [a.tid, id])).rows; for (const x of al) await c.query('insert into led_alloc (tenant_id, receipt_id, charge_id, amount) values ($1,$2,$3,$4)', [a.tid, nid, x.charge_id, -x.amount]);
      if (al.length) await S.refreshStatus(c, a.tid, (await c.query('select distinct bill_id from led_charge where tenant_id = $1 and id = any($2)', [a.tid, al.map(x => x.charge_id)])).rows.map(r => r.bill_id));
      await audit(c, a.tid, a.email, 'ledger.correct', { receipt: id, correction: nid, reason }); return { ok: true, receipt: rcOut(row) }; }); }
  const P = [
    ['POST', /^\/api\/ledger\/receipts\/(lp_[a-z0-9]{12})\/correct$/, correct],
    ['POST', /^\/api\/ledger\/refunds\/(lr_[a-z0-9]{12})\/confirm$/, async (req, id) => { const a = await needStaff(req); return refundConfirm(a, id, await readBody(req, 1024)); }]
  ];
  return {
    match(method, p) { if (!p.startsWith('/api/ledger/')) return null; const k = `${method} ${p}`; if (R[k]) return (req, res) => R[k](req, res);
      for (const [m, re, fn] of P) { if (m !== method) continue; const x = re.exec(p); if (x) return req => fn(req, ...x.slice(1)); } return null; }
  };
};
