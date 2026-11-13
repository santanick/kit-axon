'use strict';
/* v41 학습자 · 보호자 · 링크 공개 경로 /api/pub/<tid>/ledger-*(09 3절).
   ledger-my · ledger-order · ledger-confirm : 학습자 세션(lauth). ledger-bill · ledger-bill-order · ledger-bill-confirm : 로그인 없이 청구서 링크 토큰(해시 대조, 만료 · 1회).
   금액은 언제나 서버가 청구 잔액으로 다시 계산하고, 토스 승인은 서버가 확정한다(멱등: 같은 주문번호가 이미 paid면 그 결과). */
module.exports = (ctx, S) => {
  const { pool, inTenant, readBody, limit, ip, lauth, audit, crypt } = ctx; const { E, calc, str, sha } = S;
  const who = async (req, tid) => { const s = await lauth(req, tid); if (!s) throw E(401, 'auth', '로그인이 필요해요.'); return { sid: s.sid }; };
  const T = (tid, fn) => inTenant(pool, tid, async c => { await S.needOn(c, tid); return fn(c); });
  const ids = v => Array.isArray(v) ? [...new Set(v.map(x => str(x, 40)).filter(x => /^lc_[a-z0-9]{12}$/.test(x)))].slice(0, 50) : [];
  const chOut = (x, l) => ({ id: x.id, bill: x.bill_id, unit: x.unit_id, itemType: x.item_type, title: x.title, amount: x.amount, periodYm: x.period_ym, dueDate: x.due, status: l ? l.status : x.status, due: l ? l.due : x.amount, paid: l ? l.paid : 0, balance: l ? l.balance : 0 });

  /* 주문 만들기(학습자 · 링크 공통): 청구 잔액 합 = 결제 금액 */
  async function order(c, tid, sid, chargeIds, want, linkHash) {
    if (!chargeIds.length) throw E(400, 'charge', '결제할 청구서를 골라 주세요.');
    const L = await S.linesOf(c, tid, { ids: chargeIds }); const mine = L.charges.filter(x => chargeIds.includes(x.id));
    if (mine.length !== chargeIds.length || mine.some(x => x.sid !== sid)) throw E(404, 'charge', '청구서를 찾지 못했어요.');
    const lines = L.bal.lines.filter(l => chargeIds.includes(l.id)); const amount = lines.reduce((s, l) => s + l.balance, 0);
    if (amount <= 0) throw E(409, 'paid', '이미 결제가 끝난 청구서예요.');
    if (want != null && Math.round(+want) !== amount) throw E(400, 'amount_mismatch', '결제 금액이 청구 금액과 달라요. 다시 확인해 주세요.');
    const unit = mine[0].unit_id; const P = await S.payFor(c, tid, unit); if (!P.pay.online()) return { ok: true, payOnline: false, amount };
    const id = S.rid('lp_'), orderId = S.rid('lo_'); const name = mine[0].title + (mine.length > 1 ? ` 외 ${mine.length - 1}건` : '');
    await c.query(`insert into led_receipt (tenant_id, id, unit_id, sid, method, channel, amount, status, toss_order_id, share_eligible, charge_ids, link_hash) values ($1,$2,$3,$4,'online_card','toss',$5,'ready',$6,true,$7,$8)`, [tid, id, unit, sid, amount, orderId, chargeIds, linkHash || null]);
    await audit(c, tid, linkHash ? 'link' : 'learner:' + sid, 'ledger.order', { receipt: id, orderId, amount });
    return { ok: true, payOnline: true, orderId, amount, orderName: str(name, 100), clientKey: P.clientKey };
  }
  /* 토스 승인: 조회 · 검증(트랜잭션) → 승인 호출 → 기록(트랜잭션) */
  async function confirm(tid, sid, b, linkHash) {
    const orderId = str(b.orderId, 40), paymentKey = str(b.paymentKey, 200); if (!/^lo_[a-z0-9]{12}$/.test(orderId) || !paymentKey) throw E(400, 'pay', '결제 정보를 확인해 주세요.');
    const X = await T(tid, async c => { const rc = (await c.query('select * from led_receipt where tenant_id = $1 and toss_order_id = $2', [tid, orderId])).rows[0];
      if (!rc || rc.sid !== sid || (linkHash && rc.link_hash !== linkHash)) throw E(404, 'order', '결제 요청을 찾지 못했어요.');
      if (rc.status === 'paid') return { done: rc }; if (rc.status !== 'ready') throw E(409, 'expired', '결제 시간이 지났어요. 다시 결제해 주세요.');
      if (Math.round(+b.amount) !== rc.amount) throw E(400, 'amount_mismatch', '결제 금액이 청구 금액과 달라요.');
      return { rc, P: await S.payFor(c, tid, rc.unit_id) }; });
    const out = rc => ({ ok: true, status: 'paid', receipt: { id: rc.id, amount: rc.amount } });
    if (X.done) return out(X.done);
    const r = await X.P.pay.confirm({ paymentKey, orderId, amount: X.rc.amount });
    if (!r.ok) { await T(tid, c => c.query("update led_receipt set status = 'failed' where tenant_id = $1 and id = $2 and status = 'ready'", [tid, X.rc.id])); throw E(502, 'pg', '결제 승인에 실패했어요. 잠시 후 다시 시도해 주세요.'); }
    if (r.amount !== X.rc.amount) { await X.P.pay.cancel({ paymentKey, reason: '금액 불일치', idem: 'mm-' + orderId }); await T(tid, c => c.query("update led_receipt set status = 'failed' where tenant_id = $1 and id = $2", [tid, X.rc.id])); throw E(400, 'amount_mismatch', '결제 금액이 달라 승인을 취소했어요.'); }
    return T(tid, async c => { const rc = (await c.query('select * from led_receipt where tenant_id = $1 and id = $2 for update', [tid, X.rc.id])).rows[0]; if (rc.status === 'paid') return out(rc);
      await S.settle(c, tid, rc, paymentKey); if (linkHash) await c.query('update led_link set used_at = now() where tenant_id = $1 and token_hash = $2', [tid, linkHash]);
      await audit(c, tid, linkHash ? 'link' : 'learner:' + sid, 'ledger.pay', { receipt: rc.id, amount: rc.amount }); return out(rc); });
  }
  /* 링크 토큰 → 청구서(만료 410 expired · 사용 409 used · 없음 404 link) */
  async function link(c, tid, t) { const tok = str(t, 100); if (!/^[A-Za-z0-9_-]{20,100}$/.test(tok)) throw E(404, 'link', '청구서를 찾지 못했어요.'); const h = sha(tok);
    const L = (await c.query('select * from led_link where tenant_id = $1 and token_hash = $2', [tid, h])).rows[0]; if (!L) throw E(404, 'link', '청구서를 찾지 못했어요.');
    if (L.used_at) throw E(409, 'used', '이미 결제한 청구서예요.'); if (new Date(L.expires_at).getTime() < Date.now()) throw E(410, 'expired', '청구서 링크 기간이 지났어요. 기관에 다시 요청해 주세요.'); return { ...L, h }; }
  async function initial(c, tid, sid) { try { const d = (await c.query("select m from tenant_state t, jsonb_array_elements(case when jsonb_typeof(t.doc->'members') = 'array' then t.doc->'members' else '[]'::jsonb end) m where t.tenant_id = $1 and m->>'sid' = $2 limit 1", [tid, sid])).rows[0];
    const n = d && crypt ? String(crypt.memberName(d.m, tid) || '') : ''; return n ? Array.from(n)[0] + '○' : '○○'; } catch { return '○○'; } }

  return {
    'GET ledger-my': async (req, res, tid) => { const w = await who(req, tid); return T(tid, async c => { await S.sweepNow(c, tid);
      const L = await S.linesOf(c, tid, { sid: w.sid }); const B = new Map(L.bal.lines.map(l => [l.id, l]));
      const charges = L.charges.filter(x => x.sid === w.sid && x.status !== 'void').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map(x => chOut(x, B.get(x.id)));
      const receipts = (await c.query("select id, method, channel, amount, status, paid_at \"paidAt\", approval_no is not null \"hasApproval\" from led_receipt where tenant_id = $1 and sid = $2 and status in ('paid') order by paid_at desc limit 100", [tid, w.sid])).rows;
      const refunds = (await c.query("select f.id, f.receipt_id receipt, f.amount, f.status, f.at, f.done_at \"doneAt\" from led_refund f join led_receipt r on r.tenant_id = f.tenant_id and r.id = f.receipt_id where f.tenant_id = $1 and r.sid = $2 and f.status <> 'cancelled' order by f.at desc limit 100", [tid, w.sid])).rows;
      let online = false; for (const u of [...new Set(charges.filter(x => x.balance > 0).map(x => x.unit))].concat(['lu_root']).slice(0, 20)) if ((await S.payFor(c, tid, u)).pay.online()) { online = true; break; }
      return { ok: true, charges, receipts, refunds, balance: charges.reduce((s, x) => s + x.balance, 0), payOnline: online }; }); },

    'POST ledger-order': async (req, res, tid) => { const w = await who(req, tid); limit(`lo:${tid}:${w.sid}`, 30, 600e3); const b = await readBody(req, 4096);
      return T(tid, async c => { await S.sweepNow(c, tid); return order(c, tid, w.sid, ids(b.chargeIds), b.amount, null); }); },
    'POST ledger-confirm': async (req, res, tid) => { const w = await who(req, tid); limit(`lc:${tid}:${w.sid}`, 30, 600e3); return confirm(tid, w.sid, await readBody(req, 2048), null); },

    'GET ledger-bill': async (req, res, tid) => { limit('lbill:' + ip(req), 60, 600e3); const t = new URL(req.url, 'http://x').searchParams.get('t');
      return T(tid, async c => { const L = await link(c, tid, t); const X = await S.linesOf(c, tid, { ids: L.charge_ids }); const B = new Map(X.bal.lines.map(l => [l.id, l]));
        const items = X.charges.filter(x => L.charge_ids.includes(x.id)).map(x => chOut(x, B.get(x.id))); const P = await S.payFor(c, tid, items[0] ? items[0].unit : 'lu_root');
        const org = (await c.query("select coalesce(doc->'lsite'->'pub'->'org'->>'name', doc->'org'->>'name') n from tenant_state where tenant_id = $1", [tid])).rows[0];
        return { ok: true, bill: { who: `${await initial(c, tid, L.sid)} 학습자님`, org: org ? org.n || '' : '', items, total: items.reduce((s, x) => s + x.balance, 0), expiresAt: L.expires_at, payOnline: P.pay.online() } }; }); },
    'POST ledger-bill-order': async (req, res, tid) => { limit('lbo:' + ip(req), 30, 600e3); const b = await readBody(req, 2048);
      return T(tid, async c => { await S.sweepNow(c, tid); const L = await link(c, tid, b.t); return order(c, tid, L.sid, L.charge_ids, b.amount, L.h); }); },
    'POST ledger-bill-confirm': async (req, res, tid) => { limit('lbc:' + ip(req), 30, 600e3); const b = await readBody(req, 2048);
      const L = await T(tid, async c => { const tok = str(b.t, 100); const x = (await c.query('select * from led_link where tenant_id = $1 and token_hash = $2', [tid, sha(tok)])).rows[0]; if (!x) throw E(404, 'link', '청구서를 찾지 못했어요.'); return x; });
      return confirm(tid, L.sid, b, L.token_hash); }
  };
};
