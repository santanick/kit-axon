'use strict';
/* v40 공개 · 학습자 /api/pub/<tid>/fac-* (02 명세 5-1). 학습자 화면 lfac.js · Java FacController가 같은 규격.
   로그인 불필요: fac-list · fac-avail. 나머지는 학습자 세션(lauth) 필요. 모든 조회 · 쓰기는 inTenant(RLS). */
module.exports = (ctx, S) => {
  const { pool, inTenant, readBody, limit, ip, lauth, audit } = ctx; const { E, calc, str } = S;
  const who = async (req, tid) => { const s = await lauth(req, tid); if (!s) throw E(401, 'auth', '로그인이 필요합니다.'); return { sid: s.sid }; };
  const PUB_FAC = ['id', 'name', 'kind', 'place', 'photo', 'note', 'link', 'hours', 'closed', 'slotMin', 'minSlots', 'maxSlots', 'capacity', 'audience', 'pay', 'approval', 'verify', 'open', 'windows', 'prices', 'refund'];
  const PUB_RULES = ['dupSame', 'noShowMin', 'noShowStrikes', 'suspendDays', 'oneEntryPerDay', 'transferable', 'maxActive'];
  const pick = (o, ks) => Object.fromEntries(ks.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
  const myPass = p => ({ id: p.id, productId: p.product_id, fac: p.fac_id, kind: p.kind, total: p.total, used: p.used, left: p.kind === 'count' ? p.total - p.used : null, startsOn: p.starts_on, endsOn: p.ends_on, status: p.status, amount: p.amount });
  const myBk = (C, b) => ({ id: b.id, fac: b.fac_id, facName: (C.facs.find(x => x.id === b.fac_id) || {}).name || b.fac_id, res: b.res_id, resName: S.resName(C, b.fac_id, b.res_id), day: b.day, slot: b.start_slot, slots: b.slots, from: calc.isoKst(b.start_at).slice(11, 16), to: calc.isoKst(b.end_at).slice(11, 16), startAt: new Date(b.start_at).toISOString(), status: b.status, aud: b.aud, amount: b.amount, payMode: b.pay_mode, payStatus: b.pay_status, holdUntil: b.hold_until ? new Date(b.hold_until).toISOString() : null, passId: b.pass_id });
  const myRt = r => ({ id: r.id, fac: r.fac_id, res: r.res_id, productId: r.product_id, fromDay: r.from_day, dueDay: r.due_day, status: r.status, amount: r.amount, deposit: r.deposit, lateFee: r.late_fee, payStatus: r.pay_status });
  const DATE = "to_char(%s, 'YYYY-MM-DD') as %s";
  const dcols = (...k) => k.map(x => DATE.replace(/%s/g, x)).join(', ');

  return {
    'GET fac-list': async (req, res, tid) => { limit('fl:' + ip(req), 120, 600e3);
      return inTenant(pool, tid, async c => { const C = await S.cfg(c, tid); if (!C.on) return { facilities: [], payOnline: S.pay.online() };
        return { payOnline: S.pay.online(), facilities: C.facs.map(f => ({ ...pick(f, PUB_FAC), ...(f.pay === 'online' && !S.pay.online() ? { pay: 'onsite' } : {}), rules: pick(f.rules || {}, PUB_RULES), resources: S.resList(f).map(r => ({ id: r.id, name: String(r.name || r.id) })),
          extra: (Array.isArray(f.extra) ? f.extra : []).filter(x => x && x.key && x.purpose).map(x => pick(x, ['key', 'label', 'purpose', 'keepDays', 'required'])),
          products: C.prods.filter(p => p.fac === f.id).map(p => pick(p, ['id', 'fac', 'type', 'name', 'days', 'count', 'expireDays', 'prices', 'unitPrice', 'discountRate', 'perDayEntry', 'transferable', 'deposit', 'lateFeePerDay', 'refund'])) })) }; }); },

    'GET fac-avail': async (req, res, tid) => { limit('fl:' + ip(req), 120, 600e3); const u = new URL(req.url, 'http://x'); const fid = str(u.searchParams.get('fac'), 40), day = str(u.searchParams.get('day'), 10);
      if (!S.DAY_RE.test(day)) throw E(400, 'date', '날짜를 확인해 주세요.');
      return inTenant(pool, tid, async c => { const C = await S.cfg(c, tid); const f = S.facOf(C, fid); await S.sweepNow(c, tid, f.id);
        const st = calc.openState(f, day, Date.now());
        if (!st.ok && (st.code === 'not_open' || st.code === 'window')) throw E(409, 'not_open', '아직 예약이 열리지 않았어요.', st.opensAt ? { opensAt: st.opensAt } : undefined);
        if (!st.ok && (st.code === 'past' || st.code === 'date')) throw E(400, 'date', '지난 날짜예요.');
        const closed = !st.ok && st.code === 'closed'; const per = Math.max(1, +((f.capacity || {}).perSlot) || 1); const R = S.resList(f);
        const used = closed ? [] : (await c.query('select res_id, slot, count(*)::int n from fac_slot where tenant_id = $1 and fac_id = $2 and day = $3 group by res_id, slot', [tid, f.id, day])).rows;
        const now = Date.now();
        const slots = calc.slotsOf(f, day).map(s => { const left = R.map(r => per - ((used.find(x => x.res_id === r.id && x.slot === s.slot) || {}).n || 0)); const T = calc.slotTime(f, day, s.slot, 1);
          return { ...s, free: closed ? [] : R.filter((r, i) => left[i] > 0).map(r => r.id), left: closed ? 0 : left.reduce((a, b) => a + Math.max(0, b), 0), closed, past: T.endAt <= now }; });
        return { day, open: !closed, slots, note: closed ? st.reason || '휴관일이에요.' : '' }; }); },

    'POST fac-quote': async (req, res, tid) => { await who(req, tid); const b = await readBody(req, 2048);
      return inTenant(pool, tid, async c => { const C = await S.cfg(c, tid); const f = S.facOf(C, str(b.fac, 40)); const product = b.productId ? S.prodOf(C, str(b.productId, 40)) : null;
        const q = calc.quote({ fac: f, aud: str(b.aud || 'public', 10), day: str(b.day, 10), startSlot: Math.round(+b.slot), slots: Math.round(+b.slots || 1), product });
        if (q.error === 'aud') throw E(403, 'aud', '선택할 수 없는 신청자 구분이에요.'); if (q.error) throw E(400, q.error, '신청 내용을 확인해 주세요.');
        return { list: q.list, off: q.off, final: q.final, deposit: q.deposit, lines: q.lines, pay: q.final ? (q.pay === 'online' && !S.pay.online() ? 'onsite' : q.pay) : 'free', needVerify: q.needVerify, approval: q.approval }; }); },

    'POST fac-book': async (req, res, tid) => { const w = await who(req, tid); limit(`fb:${tid}:${w.sid}`, 30, 600e3); const b = await readBody(req, 4096);
      return inTenant(pool, tid, async c => { await S.sweepNow(c, tid, str(b.fac, 40)); return S.book(c, tid, w, b); }); },

    'POST fac-pay': async (req, res, tid) => { const w = await who(req, tid); limit(`fp:${tid}:${w.sid}`, 30, 600e3); const b = await readBody(req, 2048);
      if (!S.pay.online()) throw E(409, 'onsite_only', '지금은 현장 결제만 가능해요.');
      const orderId = str(b.orderId, 40), paymentKey = str(b.paymentKey, 200); if (!/^fo_[a-z0-9]{12}$/.test(orderId) || !paymentKey) throw E(400, 'pay', '결제 정보를 확인해 주세요.');
      const P = await inTenant(pool, tid, async c => { await S.sweepNow(c, tid, null);
        const p = (await c.query(`select p.*, b.sid bsid, b.status bst, b.hold_until, ps.sid psid, r.sid rsid from fac_payment p left join fac_booking b on b.tenant_id = p.tenant_id and b.id = p.booking_id left join fac_pass ps on ps.tenant_id = p.tenant_id and ps.id = p.pass_id left join fac_rental r on r.tenant_id = p.tenant_id and r.id = p.rental_id where p.tenant_id = $1 and p.toss_order_id = $2`, [tid, orderId])).rows[0];
        if (!p || (p.bsid || p.psid || p.rsid) !== w.sid) throw E(404, 'order', '결제 요청을 찾지 못했어요.');
        if (p.status === 'paid') return { done: true, p }; if (p.status !== 'ready') throw E(409, 'hold_expired', '결제 시간이 지나 예약이 풀렸어요. 다시 예약해 주세요.');
        if (p.booking_id && (p.bst !== 'confirmed' || (p.hold_until && new Date(p.hold_until).getTime() < Date.now()))) throw E(409, 'hold_expired', '결제 시간이 지나 예약이 풀렸어요. 다시 예약해 주세요.');
        if (Math.round(+b.amount) !== p.amount) throw E(400, 'amount_mismatch', '결제 금액이 예약 금액과 달라요.');
        return { p }; });
      if (P.done) return { ok: true, status: P.p.booking_id ? 'confirmed' : 'active' };
      const p = P.p; const r = await S.pay.confirm({ paymentKey, orderId, amount: p.amount });
      if (!r.ok) throw E(502, 'pg', '결제 승인에 실패했어요. 잠시 후 다시 시도해 주세요.');
      if (r.amount !== p.amount) { await S.pay.cancel({ paymentKey, reason: '금액 불일치', idem: 'mm-' + orderId }); throw E(400, 'amount_mismatch', '결제 금액이 예약 금액과 달라 승인을 취소했어요.'); }
      return inTenant(pool, tid, async c => {
        await c.query("update fac_payment set status = 'paid', toss_key = $3, at = now() where tenant_id = $1 and id = $2", [tid, p.id, paymentKey]);
        if (p.booking_id) await c.query("update fac_booking set pay_status = 'paid', hold_until = null, updated_at = now() where tenant_id = $1 and id = $2", [tid, p.booking_id]);
        if (p.pass_id) await c.query("update fac_pass set status = 'active', pay_id = $3 where tenant_id = $1 and id = $2 and status = 'pending'", [tid, p.pass_id, p.id]);
        if (p.rental_id) await c.query("update fac_rental set pay_status = 'paid' where tenant_id = $1 and id = $2", [tid, p.rental_id]);
        await audit(c, tid, 'learner:' + w.sid, 'fac.pay', { payment: p.id, amount: p.amount });
        return { ok: true, status: p.booking_id ? 'confirmed' : 'active' }; }); },

    'GET fac-my': async (req, res, tid) => { const w = await who(req, tid); const scope = new URL(req.url, 'http://x').searchParams.get('scope') === 'past' ? 'past' : 'upcoming';
      return inTenant(pool, tid, async c => { const C = await S.cfg(c, tid); await S.sweepNow(c, tid, null);
        const bk = (await c.query(`select *, ${dcols('day')} from fac_booking where tenant_id = $1 and sid = $2 and ${scope === 'past' ? "(end_at <= now() or status not in ('requested','approved','confirmed','checked_in'))" : "end_at > now() and status in ('requested','approved','confirmed','checked_in')"} order by start_at ${scope === 'past' ? 'desc' : ''} limit 100`, [tid, w.sid])).rows;
        const ps = (await c.query(`select *, ${dcols('starts_on', 'ends_on')} from fac_pass where tenant_id = $1 and sid = $2 order by created_at desc limit 50`, [tid, w.sid])).rows;
        const rt = (await c.query(`select *, ${dcols('from_day', 'due_day')} from fac_rental where tenant_id = $1 and sid = $2 order by created_at desc limit 50`, [tid, w.sid])).rows;
        return { bookings: bk.map(b => myBk(C, b)), passes: ps.map(p => ({ ...myPass(p), name: ((C.prods.find(x => x.id === p.product_id)) || {}).name || p.product_id })), rentals: rt.map(myRt) }; }); },

    'POST fac-cancel': async (req, res, tid) => { const w = await who(req, tid); limit(`fb:${tid}:${w.sid}`, 30, 600e3); const b = await readBody(req, 1024);
      return inTenant(pool, tid, async c => { const bk = (await c.query('select * from fac_booking where tenant_id = $1 and id = $2 and sid = $3 for update', [tid, str(b.booking, 40), w.sid])).rows[0]; if (!bk) throw E(404, 'booking', '예약을 찾지 못했어요.');
        return S.cancelBooking(c, tid, bk, { sid: w.sid }, str(b.reason, 200)); }); },

    'POST fac-qr': async (req, res, tid) => { const w = await who(req, tid); if (!S.qr.ready()) throw E(503, 'qr_key', '입장 QR을 만들 수 없습니다(서버 키 미설정).'); const b = await readBody(req, 1024);
      return inTenant(pool, tid, async c => { const today = calc.kstDay(Date.now()); let o, nbf, exp;
        if (b.booking) { const x = (await c.query(`select *, ${dcols('day')} from fac_booking where tenant_id = $1 and id = $2 and sid = $3`, [tid, str(b.booking, 40), w.sid])).rows[0]; if (!x) throw E(404, 'booking', '예약을 찾지 못했어요.');
          if (x.day !== today) throw E(409, 'not_today', '입장 QR은 이용 당일에 열려요.'); if (x.status !== 'confirmed' || (x.pay_status === 'pending' && x.pay_mode === 'online')) throw E(409, 'not_ready', x.status === 'requested' ? '승인을 기다리고 있어요.' : '입장할 수 있는 예약이 아니에요.');
          o = { b: x.id, f: x.fac_id, d: today }; nbf = new Date(x.start_at).getTime() - 30 * 60e3; exp = new Date(x.end_at).getTime() + 15 * 60e3; }
        else if (b.passId) { const x = (await c.query(`select *, ${dcols('starts_on', 'ends_on')} from fac_pass where tenant_id = $1 and id = $2 and sid = $3`, [tid, str(b.passId, 40), w.sid])).rows[0]; if (!x) throw E(404, 'pass', '이용권을 찾지 못했어요.');
          if (x.status !== 'active') throw E(409, 'not_ready', '쓸 수 있는 이용권이 아니에요.'); if (x.starts_on > today || x.ends_on < today) throw E(409, 'not_today', '이용 기간이 아니에요.');
          o = { p: x.id, f: x.fac_id, d: today }; nbf = calc.dayMs(today); exp = calc.dayMs(today) + 864e5 - 1000; }
        else if (b.rental) { const x = (await c.query(`select *, ${dcols('from_day')} from fac_rental where tenant_id = $1 and id = $2 and sid = $3`, [tid, str(b.rental, 40), w.sid])).rows[0]; if (!x) throw E(404, 'rental', '대여 신청을 찾지 못했어요.');
          if (x.status !== 'approved') throw E(409, 'not_ready', '수령할 수 있는 대여가 아니에요.'); if (x.from_day > today) throw E(409, 'not_today', '수령일에 QR이 열려요.');
          o = { r: x.id, f: x.fac_id, d: today }; nbf = calc.dayMs(today); exp = calc.dayMs(today) + 864e5 - 1000; }
        else throw E(400, 'target', '예약 · 이용권 · 대여 중 하나를 골라 주세요.');
        const token = S.qr.issue(tid, { ...o, nbf: Math.floor(nbf / 1000), exp: Math.floor(exp / 1000) }); return { token, exp: calc.isoKst(exp), day: today }; }); },

    'POST fac-rent': async (req, res, tid) => { const w = await who(req, tid); limit(`fb:${tid}:${w.sid}`, 30, 600e3); const b = await readBody(req, 2048);
      return inTenant(pool, tid, async c => { const C = await S.cfg(c, tid); const f = S.facOf(C, str(b.fac, 40)); const p = S.prodOf(C, str(b.productId, 40)); if (p.type !== 'rent' || (p.fac && p.fac !== f.id)) throw E(400, 'product', '대여 상품이 아니에요.');
        const aud = str(b.aud || 'public', 10); const q = calc.quote({ fac: f, aud, product: p }); if (q.error === 'aud') throw E(403, 'aud', '선택할 수 없는 신청자 구분이에요.'); if (q.error) throw E(400, q.error, '신청 내용을 확인해 주세요.');
        const ver = S.verifyOf(C, q, str(b.memberNo || w.sid, 20).trim());
        const until = await S.suspendedOf(c, tid, f, w.sid); if (until) throw E(403, 'suspended', `${until}까지 신청할 수 없어요.`, { until });
        if ((await c.query("select 1 from fac_rental where tenant_id = $1 and sid = $2 and status = 'overdue' limit 1", [tid, w.sid])).rowCount) throw E(409, 'overdue', '반납이 늦은 대여가 있어 새로 신청할 수 없어요.');
        const today = calc.kstDay(Date.now()); const from = S.DAY_RE.test(str(b.from, 10)) && b.from >= today ? b.from : today; const days = Math.max(1, Math.round(+p.days || 1)); const due = calc.addDays(from, days - 1);
        const total = q.final + q.deposit; if (b.amount != null && Math.round(+b.amount) !== total) throw E(400, 'amount', '결제 금액이 요금표와 맞지 않아요.');
        const mode = S.payModeOf(f, total, b.payMode, false); const id = b.idem ? S.hid('rt_', `${tid}|${w.sid}|${str(b.idem, 80)}`) : S.rid('rt_');
        const prev = (await c.query('select * from fac_rental where tenant_id = $1 and id = $2', [tid, id])).rows[0]; if (prev) return { ok: true, rental: { id: prev.id, status: prev.status, dueDay: due, deposit: prev.deposit }, next: prev.status === 'requested' ? 'wait' : 'done' };
        const status = f.approval || ver === 'manual' ? 'requested' : 'approved'; const want = b.res ? str(b.res, 40) : ''; let got = null;
        for (const r of S.resList(f).filter(x => !want || x.id === want)) { await c.query('savepoint fr');
          try { await c.query('insert into fac_rental (tenant_id, id, sid, aud, fac_id, res_id, product_id, from_day, due_day, amount, deposit, deposit_status, status, pay_mode, pay_status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [tid, id, w.sid, aud, f.id, r.id, p.id, from, due, q.final, q.deposit, q.deposit ? 'held' : 'none', status, mode, total ? 'pending' : 'none']); got = r; await c.query('release savepoint fr'); break; }
          catch (e) { await c.query('rollback to savepoint fr'); if (e.code !== '23505') throw e; } }
        if (!got) throw E(409, 'taken', '남은 물품이 없어요.', { alt: [] });
        const orderId = mode === 'online' && status === 'approved' ? await S.newOrder(c, tid, { rental_id: id }, total, q.list + q.deposit) : undefined;
        await audit(c, tid, 'learner:' + w.sid, 'fac.rent', { rental: id, res: got.id, amount: q.final, deposit: q.deposit });
        return { ok: true, rental: { id, status, dueDay: due, deposit: q.deposit, amount: q.final, res: got.id }, next: status === 'requested' ? 'wait' : orderId ? 'pay' : 'done', ...(orderId ? { orderId } : {}) }; }); },

    'POST fac-buy': async (req, res, tid) => { const w = await who(req, tid); limit(`fb:${tid}:${w.sid}`, 30, 600e3); const b = await readBody(req, 2048);
      return inTenant(pool, tid, async c => { const C = await S.cfg(c, tid); const p = S.prodOf(C, str(b.productId, 40)); if (!/^pass-(count|period)$/.test(p.type || '')) throw E(400, p.type === 'pass-course' ? 'course_only' : 'product', p.type === 'pass-course' ? '수강생 자율이용권은 운영자가 발급해요.' : '이용권 상품이 아니에요.');
        const f = S.facOf(C, p.fac); const aud = str(b.aud || 'public', 10); const q = calc.quote({ fac: f, aud, product: p }); if (q.error === 'aud') throw E(403, 'aud', '선택할 수 없는 신청자 구분이에요.'); if (q.error) throw E(400, q.error, '신청 내용을 확인해 주세요.');
        const today = calc.kstDay(Date.now()); const W = Array.isArray(f.windows) ? f.windows.filter(x => x && x.from && x.to) : []; if (W.length && !W.some(x => today >= x.from && today <= x.to)) throw E(409, 'not_open', '신청 기간이 아니에요.');
        S.verifyOf(C, q, str(b.memberNo || w.sid, 20).trim());
        if (b.amount != null && Math.round(+b.amount) !== q.final) throw E(400, 'amount', '결제 금액이 요금표와 맞지 않아요.');
        const id = b.idem ? S.hid('ps_', `${tid}|${w.sid}|${str(b.idem, 80)}`) : S.rid('ps_');
        const prev = (await c.query(`select *, ${dcols('starts_on', 'ends_on')} from fac_pass where tenant_id = $1 and id = $2`, [tid, id])).rows[0]; if (prev) return { ok: true, pass: myPass(prev), next: prev.status === 'active' ? 'done' : 'pay' };
        const last = (await c.query("select to_char(max(ends_on), 'YYYY-MM-DD') e from fac_pass where tenant_id = $1 and sid = $2 and product_id = $3 and status = 'active'", [tid, w.sid, p.id])).rows[0].e;
        const per = calc.passPeriod(p, today, b.extend === false ? null : last); const mode = S.payModeOf(f, q.final, b.payMode, false);
        const row = (await c.query(`insert into fac_pass (tenant_id, id, sid, product_id, fac_id, aud, kind, total, starts_on, ends_on, status, amount) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *, ${dcols('starts_on', 'ends_on')}`, [tid, id, w.sid, p.id, f.id, aud, per.kind, per.total, per.startsOn, per.endsOn, mode === 'free' ? 'active' : 'pending', q.final])).rows[0];
        const orderId = mode === 'online' ? await S.newOrder(c, tid, { pass_id: id }, q.final, q.list) : undefined;
        await audit(c, tid, 'learner:' + w.sid, 'fac.buy', { pass: id, product: p.id, amount: q.final, mode });
        return { ok: true, pass: myPass(row), next: mode === 'free' ? 'done' : mode === 'online' ? 'pay' : 'onsite', ...(orderId ? { orderId } : {}) }; }); }
  };
};
