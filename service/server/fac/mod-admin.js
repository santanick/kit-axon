'use strict';
/* v40 운영자 /api/fac/* (02 명세 5-2 · 8절 권한). 정 · 부 운영자 = needStaff, 교강사는 overview · bookings 목록 · checkin · rentals 반납만(담당 시설 admins[].fac[]).
   키오스크: POST /api/fac/kiosk/start {pin} → 시설 한정 토큰, POST /api/fac/checkin {kiosk, token}은 로그인 없이 이 토큰으로만. */
module.exports = (ctx, S) => {
  const { pool, inTenant, readBody, limit, ip, audit, need, needStaff, needOwner, crypt } = ctx; const { E, calc, str, tail } = S;
  const q = req => new URL(req.url, 'http://x').searchParams;
  /* 교강사 담당 시설(없으면 빈 집합) */
  async function teacherFacs(a) { const r = await inTenant(pool, a.tid, async c => (await c.query('select doc from tenant_state where tenant_id = $1', [a.tid])).rows[0]); const doc = r ? (crypt ? crypt.open(r.doc, a.tid) : r.doc) : {};
    const me = (Array.isArray(doc.admins) ? doc.admins : []).find(x => x && String(x.email || '').toLowerCase() === String(a.email).toLowerCase()); return new Set(me && Array.isArray(me.fac) ? me.fac.map(String) : []); }
  const staffOrTeacher = async req => { const a = await need(req); a.facs = a.role === 'teacher' ? await teacherFacs(a) : null; return a; };
  const inScope = (a, fid) => { if (a.facs && !a.facs.has(String(fid))) throw E(403, 'fac_scope', '담당 시설이 아닙니다.'); };
  const T = (a, fn) => inTenant(pool, a.tid, fn);
  const getBk = async (c, tid, id, lock) => { const b = (await c.query(`select *, to_char(day, 'YYYY-MM-DD') as day from fac_booking where tenant_id = $1 and id = $2${lock ? ' for update' : ''}`, [tid, str(id, 40)])).rows[0]; if (!b) throw E(404, 'booking', '없는 예약입니다.'); return b; };
  const listRow = (C, b) => ({ id: b.id, fac: b.fac_id, facName: (C.facs.find(x => x.id === b.fac_id) || {}).name || b.fac_id, res: b.res_id, resName: S.resName(C, b.fac_id, b.res_id), day: b.day, slot: b.start_slot, slots: b.slots, from: calc.isoKst(b.start_at).slice(11, 16), to: calc.isoKst(b.end_at).slice(11, 16), status: b.status, aud: b.aud, sidTail: tail(b.member_no || b.sid), amount: b.amount, payMode: b.pay_mode, payStatus: b.pay_status, passId: b.pass_id });
  const reqAmt = async (c, tid, P) => P.booking_id ? (await c.query('select amount from fac_booking where tenant_id = $1 and id = $2', [tid, P.booking_id])).rows[0] : null;

  /* 체크인 본체: QR · 수동 · 키오스크 */
  async function checkin(c, tid, b, by, via, onlyFac) {
    const now = Date.now(); const today = calc.kstDay(now); let o = null;
    if (b.token) { o = S.qr.open(tid, b.token); if (!o) throw E(403, 'qr', '이 기관의 입장 QR이 아니거나 위조된 QR입니다.'); if (o.exp * 1000 < now) throw E(410, 'expired', '만료된 QR입니다. 새로 고쳐 주세요.'); if (o.nbf && o.nbf * 1000 > now) throw E(409, 'early', '아직 입장 시간이 아닙니다(시작 30분 전부터).'); if (o.d !== today) throw E(410, 'expired', '오늘 발급한 QR이 아닙니다.'); }
    const fac = onlyFac || (b.fac ? str(b.fac, 40) : ''); if (o && fac && o.f !== fac) throw E(409, 'wrong_fac', '다른 시설의 QR입니다.');
    const C = await S.cfg(c, tid);
    let bk = null, ps = null;
    if (o && o.b) bk = await getBk(c, tid, o.b, true);
    else if (o && o.p) ps = (await c.query('select * from fac_pass where tenant_id = $1 and id = $2 for update', [tid, o.p])).rows[0];
    else if (o && o.r) { const r = (await c.query('select * from fac_rental where tenant_id = $1 and id = $2', [tid, o.r])).rows[0]; if (!r) throw E(404, 'rental', '없는 대여입니다.');
      try { await c.query('insert into fac_checkin (tenant_id, rental_id, sid, fac_id, day, via, by_staff, token_jti) values ($1,$2,$3,$4,$5,$6,$7,$8)', [tid, r.id, r.sid, r.fac_id, today, via, by, o.jti]); } catch (e) { if (e.code === '23505') throw E(409, 'used', '이미 사용한 QR입니다.'); throw e; }
      if (r.status !== 'approved') throw E(409, 'not_ready', '수령할 수 있는 대여가 아닙니다.'); await c.query("update fac_rental set status = 'lent' where tenant_id = $1 and id = $2", [tid, r.id]); await audit(c, tid, by, 'fac.lend', { rental: r.id, via });
      return { ok: true, kind: 'rental', who: { sidTail: tail(r.sid), aud: r.aud }, rental: r.id, dueDay: calc.kstDay(new Date(r.due_day).getTime() + 12 * 3600e3) }; }
    else if (b.booking) bk = await getBk(c, tid, b.booking, true);
    else if (b.passId) ps = (await c.query('select * from fac_pass where tenant_id = $1 and id = $2 for update', [tid, str(b.passId, 40)])).rows[0];
    else if (b.sidTail) { const d = S.DAY_RE.test(str(b.day, 10)) ? b.day : today; const L = (await c.query(`select *, to_char(day, 'YYYY-MM-DD') as day from fac_booking where tenant_id = $1 and day = $2 and status = 'confirmed' and right(coalesce(member_no, sid), 4) = $3 ${fac ? 'and fac_id = $4' : ''} order by start_at`, fac ? [tid, d, str(b.sidTail, 4), fac] : [tid, d, str(b.sidTail, 4)])).rows;
      if (!L.length) throw E(404, 'booking', '해당 예약이 없습니다.'); if (L.length > 1) throw E(409, 'ambiguous', '같은 번호의 예약이 여러 건입니다. 예약 번호로 확인해 주십시오.', { candidates: L.map(x => listRow(C, x)) }); bk = L[0]; }
    else throw E(400, 'target', 'QR 또는 예약 번호를 입력해 주십시오.');
    if (bk) {
      if (fac && bk.fac_id !== fac) throw E(409, 'wrong_fac', '다른 시설의 예약입니다.');
      if (bk.day !== today) throw E(409, bk.day > today ? 'early' : 'late', '오늘 예약이 아닙니다.');
      if (bk.status === 'checked_in') throw E(409, 'used', '이미 입장 처리된 예약입니다.');
      if (bk.status !== 'confirmed') throw E(409, 'not_ready', bk.status === 'requested' ? '승인 대기 중인 예약입니다.' : '입장할 수 없는 예약입니다.');
      if (bk.pay_mode === 'online' && bk.pay_status === 'pending') throw E(409, 'not_ready', '결제가 끝나지 않은 예약입니다.');
      if (!o && now < new Date(bk.start_at).getTime() - 30 * 60e3) throw E(409, 'early', '아직 입장 시간이 아닙니다(시작 30분 전부터).');
      if (now > new Date(bk.end_at).getTime() + 15 * 60e3) throw E(409, 'late', '이용 시간이 지났습니다.');
      try { await c.query('insert into fac_checkin (tenant_id, booking_id, sid, fac_id, day, via, by_staff, token_jti) values ($1,$2,$3,$4,$5,$6,$7,$8)', [tid, bk.id, bk.sid, bk.fac_id, today, via, by, o ? o.jti : null]); }
      catch (e) { if (e.code === '23505') throw E(409, 'used', '이미 사용한 QR입니다.'); throw e; }
      await c.query("update fac_booking set status = 'checked_in', updated_at = now() where tenant_id = $1 and id = $2", [tid, bk.id]);
      await audit(c, tid, by, 'fac.checkin', { booking: bk.id, via });
      const unpaid = bk.pay_mode === 'onsite' && bk.pay_status === 'pending' ? bk.amount : 0;
      return { ok: true, kind: 'booking', who: { sidTail: tail(bk.member_no || bk.sid), aud: bk.aud }, booking: bk.id, product: (C.facs.find(x => x.id === bk.fac_id) || {}).name || bk.fac_id, res: S.resName(C, bk.fac_id, bk.res_id), from: calc.isoKst(bk.start_at).slice(11, 16), to: calc.isoKst(bk.end_at).slice(11, 16), left: null, ...(unpaid ? { unpaid } : {}) };
    }
    if (!ps) throw E(404, 'pass', '없는 이용권입니다.'); if (fac && ps.fac_id !== fac) throw E(409, 'wrong_fac', '다른 시설의 이용권입니다.');
    if (ps.status !== 'active') throw E(409, 'not_ready', ps.status === 'pending' ? '결제가 끝나지 않은 이용권입니다.' : '쓸 수 없는 이용권입니다.');
    if (calc.kstDay(new Date(ps.starts_on).getTime() + 12 * 3600e3) > today || calc.kstDay(new Date(ps.ends_on).getTime() + 12 * 3600e3) < today) throw E(410, 'expired', '이용 기간이 아닌 이용권입니다.');
    try { await c.query('insert into fac_checkin (tenant_id, pass_id, sid, fac_id, day, via, by_staff, token_jti) values ($1,$2,$3,$4,$5,$6,$7,$8)', [tid, ps.id, ps.sid, ps.fac_id, today, via, by, o ? o.jti : null]); }
    catch (e) { if (e.code === '23505') throw /fac_ck_jti/.test(e.constraint || '') ? E(409, 'used', '이미 사용한 QR입니다.') : E(409, 'once_per_day', '오늘 이미 입장했습니다(1일 1회).'); throw e; }
    const u = await c.query('update fac_pass set used = used + 1 where tenant_id = $1 and id = $2 and used < total returning total - used left', [tid, ps.id]); if (!u.rowCount) throw E(409, 'pass_used_up', '이용권 횟수를 모두 썼습니다.');
    await audit(c, tid, by, 'fac.checkin', { pass: ps.id, via });
    return { ok: true, kind: 'pass', who: { sidTail: tail(ps.sid), aud: ps.aud }, pass: ps.id, product: ((C.prods.find(x => x.id === ps.product_id)) || {}).name || ps.product_id, left: ps.kind === 'count' ? u.rows[0].left : null };
  }

  /* 환불 공식 자동 계산(대상별) */
  async function autoRefund(c, tid, P) {
    const C = await S.cfg(c, tid);
    if (P.booking_id) { const bk = await getBk(c, tid, P.booking_id); const f = C.facs.find(x => x.id === bk.fac_id) || {}; const rule = f.refund || { type: 'time' }; const r = calc.refund({ rule, paid: P.amount, startAt: bk.start_at, now: Date.now() }); return { ...r, type: rule.type || 'time', target: 'booking:' + bk.id }; }
    if (P.pass_id) { const ps = (await c.query('select * from fac_pass where tenant_id = $1 and id = $2', [tid, P.pass_id])).rows[0]; const p = C.prods.find(x => x.id === ps.product_id) || {}; const rule = S.passRule(p, ps.aud); const r = calc.refund({ rule, paid: P.amount, used: ps.used }); return { ...r, type: rule.type, target: 'pass:' + ps.id }; }
    const rt = (await c.query('select * from fac_rental where tenant_id = $1 and id = $2', [tid, P.rental_id])).rows[0]; const paidFee = Math.max(0, P.amount - rt.deposit);
    const r = rt.status === 'returned' || rt.status === 'lent' || rt.status === 'overdue' ? calc.refund({ rule: { type: 'rent' }, deposit: rt.deposit, lateFee: rt.late_fee }) : calc.refund({ rule: { type: 'full' }, paid: P.amount });
    return { ...r, type: rt.status === 'returned' ? 'rent' : 'full', target: 'rental:' + rt.id, fee: paidFee };
  }

  const R = {
    'GET /api/fac/overview': async req => { const a = await staffOrTeacher(req); return T(a, async c => { await S.sweepNow(c, a.tid, null); const F = a.facs ? [...a.facs] : null;
      const one = async (sql, p) => (await c.query(sql + (F ? ` and fac_id = any($${p.length + 1})` : ''), F ? [...p, F] : p)).rows[0].n;
      return { pendingApprovals: await one("select count(*)::int n from fac_booking where tenant_id = $1 and status = 'requested'", [a.tid]) + await one("select count(*)::int n from fac_rental where tenant_id = $1 and status = 'requested'", [a.tid]),
        dueReturns: await one("select count(*)::int n from fac_rental where tenant_id = $1 and status = 'lent' and due_day = (now() at time zone 'Asia/Seoul')::date", [a.tid]),
        overdue: await one("select count(*)::int n from fac_rental where tenant_id = $1 and (status = 'overdue' or (status = 'lent' and due_day < (now() at time zone 'Asia/Seoul')::date))", [a.tid]),
        noShow: await one("select count(*)::int n from fac_booking where tenant_id = $1 and status = 'no_show' and day = (now() at time zone 'Asia/Seoul')::date", [a.tid]),
        unpaidOnsite: await one("select count(*)::int n from fac_booking where tenant_id = $1 and pay_mode = 'onsite' and pay_status = 'pending' and status in ('confirmed','checked_in')", [a.tid]),
        refundsPending: a.facs ? 0 : (await c.query("select count(*)::int n from fac_refund where tenant_id = $1 and status = 'pending'", [a.tid])).rows[0].n,
        today: { bookings: await one("select count(*)::int n from fac_booking where tenant_id = $1 and day = (now() at time zone 'Asia/Seoul')::date and status in ('confirmed','checked_in','done')", [a.tid]), checkins: await one("select count(*)::int n from fac_checkin where tenant_id = $1 and day = (now() at time zone 'Asia/Seoul')::date", [a.tid]) } }; }); },

    'GET /api/fac/bookings': async req => { const a = await staffOrTeacher(req); const Q = q(req); const from = S.DAY_RE.test(Q.get('from') || '') ? Q.get('from') : calc.kstDay(Date.now()), to = S.DAY_RE.test(Q.get('to') || '') ? Q.get('to') : calc.addDays(from, 6);
      const fac = str(Q.get('fac'), 40), st = str(Q.get('status'), 20), qq = str(Q.get('q'), 20).trim(); if (fac) inScope(a, fac);
      return T(a, async c => { const C = await S.cfg(c, a.tid); await S.sweepNow(c, a.tid, fac || null); const P = [a.tid, from, to]; let w = '';
        if (fac) { P.push(fac); w += ` and fac_id = $${P.length}`; } if (a.facs) { P.push([...a.facs]); w += ` and fac_id = any($${P.length})`; } if (st) { P.push(st); w += ` and status = $${P.length}`; } if (qq) { P.push(qq); w += ` and (id = $${P.length} or right(coalesce(member_no, sid), 4) = right($${P.length}, 4))`; }
        const rows = (await c.query(`select *, to_char(day, 'YYYY-MM-DD') as day from fac_booking where tenant_id = $1 and day between $2 and $3${w} order by start_at, res_id limit 1000`, P)).rows; return { from, to, bookings: rows.map(b => listRow(C, b)) }; }); },

    'POST /api/fac/bookings': async req => { const a = await needStaff(req); const b = await readBody(req, 4096);
      const sid = b.walkin ? 'walkin-' + S.rid('').slice(0, 8) : str(b.sid, 40).trim(); if (!sid) throw E(400, 'sid', '학번(이용자 번호) 또는 현장 이용자 이름을 입력해 주십시오.');
      return T(a, c => S.book(c, a.tid, { sid, staff: a.email }, { ...b, note: b.walkin ? str(b.walkin, 40) : b.note })); },

    'POST /api/fac/closures': async req => { const a = await needStaff(req); const b = await readBody(req, 2048); const fac = str(b.fac, 40), from = str(b.from, 10), to = str(b.to || b.from, 10);
      if (!S.DAY_RE.test(from) || !S.DAY_RE.test(to) || to < from) throw E(400, 'date', '휴관 기간을 확인해 주십시오.');
      return T(a, async c => { const C = await S.cfg(c, a.tid); S.facOf(C, fac); const L = (await c.query("select * from fac_booking where tenant_id = $1 and fac_id = $2 and day between $3 and $4 and status = any($5) for update", [a.tid, fac, from, to, ['requested', 'approved', 'confirmed']])).rows;
        let cancelled = 0, refundsPending = 0; if (b.cancelBookings !== false) for (const bk of L) { const r = await S.cancelBooking(c, a.tid, bk, { staff: a.email }, '휴관: ' + str(b.reason || '시설 사정', 100), { type: 'full' }); cancelled++; if (r.refund.auto && r.status !== 'refunded') refundsPending++; await S.note(c, a.tid, bk.sid, 'closure', { booking: bk.id, fac, from, to }); }
        let extended = 0; if (b.pass === 'extend') { const n = calc.diffDays(from, to) + 1; extended = (await c.query("update fac_pass set ends_on = ends_on + $5::int where tenant_id = $1 and fac_id = $2 and status = 'active' and starts_on <= $4 and ends_on >= $3", [a.tid, fac, from, to, n])).rowCount; }
        await audit(c, a.tid, a.email, 'fac.closure', { fac, from, to, affected: L.length, cancelled, extended }); return { affected: L.length, cancelled, refundsPending, passesExtended: extended }; }); },

    'POST /api/fac/checkin': async req => { const b = await readBody(req, 2048); let tid, by, only = null, via = b.token ? 'qr' : 'front';
      if (b.kiosk) { tid = str(b.tid, 20); const k = /^tn_[a-z0-9]{8,16}$/.test(tid) ? S.qr.openKiosk(tid, b.kiosk) : null; if (!k) throw E(401, 'kiosk', '키오스크 토큰이 만료되었습니다. 운영자 PIN으로 다시 시작해 주십시오.'); limit('fk:' + ip(req), 600, 600e3); by = 'kiosk'; only = k.f; via = 'kiosk'; if (!b.token) throw E(400, 'target', 'QR을 비춰 주세요.'); }
      else { const a = await staffOrTeacher(req); tid = a.tid; by = a.email; if (a.facs) { if (!b.fac) throw E(400, 'fac', '시설을 고르십시오.'); inScope(a, b.fac); } }
      return inTenant(pool, tid, c => checkin(c, tid, b, by, via, only)); },

    'POST /api/fac/kiosk/start': async req => { const a = await needStaff(req); limit('fks:' + a.tid, 20, 600e3); const b = await readBody(req, 512);
      return T(a, async c => { const C = await S.cfg(c, a.tid); const f = S.facOf(C, str(b.fac, 40)); if (!C.pin) throw E(409, 'no_pin', '설정에서 키오스크 PIN을 먼저 정해 주십시오.');
        const x = Buffer.from(String(C.pin)), y = Buffer.from(str(b.pin, 20)); if (x.length !== y.length || !require('node:crypto').timingSafeEqual(x, y)) throw E(403, 'pin', 'PIN이 올바르지 않습니다.');
        await audit(c, a.tid, a.email, 'fac.kiosk', { fac: f.id }); return { kioskToken: S.qr.kiosk(a.tid, f.id, 12 * 3600), fac: f.id, tid: a.tid, exp: calc.isoKst(Date.now() + 12 * 3600e3) }; }); },

    'POST /api/fac/payments': async req => { const a = await needStaff(req); const b = await readBody(req, 2048); const method = str(b.method, 20); if (!['card_onsite', 'cash', 'bank'].includes(method)) throw E(400, 'method', '결제 수단을 고르십시오.');
      return T(a, async c => { let target, due, list;
        if (b.booking) { const bk = await getBk(c, a.tid, b.booking, true); if (!['confirmed', 'checked_in', 'done', 'approved'].includes(bk.status) || bk.pay_status === 'paid') throw E(409, 'paid', '결제할 예약이 아닙니다.'); target = { booking_id: bk.id }; due = bk.amount; list = bk.amount; }
        else if (b.pass) { const ps = (await c.query('select * from fac_pass where tenant_id = $1 and id = $2 for update', [a.tid, str(b.pass, 40)])).rows[0]; if (!ps || ps.status !== 'pending') throw E(409, 'paid', '결제할 이용권이 아닙니다.'); target = { pass_id: ps.id }; due = ps.amount; list = ps.amount; }
        else if (b.rental) { const rt = (await c.query('select * from fac_rental where tenant_id = $1 and id = $2 for update', [a.tid, str(b.rental, 40)])).rows[0]; if (!rt || rt.pay_status === 'paid') throw E(409, 'paid', '결제할 대여가 아닙니다.'); target = { rental_id: rt.id }; due = rt.amount + rt.deposit; list = due; }
        else throw E(400, 'target', '결제 대상을 고르십시오.');
        const amt = Math.round(+b.amount); if (!Number.isFinite(amt) || amt < 0) throw E(400, 'amount', '금액을 확인해 주십시오.');
        if (amt !== due && !str(b.diffReason, 200).trim()) throw E(400, 'amount', `요금표 금액(${due.toLocaleString('ko-KR')}원)과 다릅니다. 차액 사유를 입력해 주십시오.`, { expected: due });
        const id = S.rid('fp_'); await c.query("update fac_payment set status = 'cancelled' where tenant_id = $1 and status = 'ready' and (booking_id = $2 or pass_id = $3 or rental_id = $4)", [a.tid, target.booking_id || null, target.pass_id || null, target.rental_id || null]);
        await c.query("insert into fac_payment (tenant_id, id, booking_id, pass_id, rental_id, method, amount, list_amount, receipt_no, note, recorded_by, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'paid')", [a.tid, id, target.booking_id || null, target.pass_id || null, target.rental_id || null, method, amt, list, str(b.receiptNo, 40) || null, str(b.diffReason || b.note, 200) || null, a.email]);
        if (target.booking_id) await c.query("update fac_booking set pay_status = 'paid', hold_until = null, pay_mode = case when pay_mode = 'online' then 'onsite' else pay_mode end where tenant_id = $1 and id = $2", [a.tid, target.booking_id]);
        if (target.pass_id) await c.query("update fac_pass set status = 'active', pay_id = $3 where tenant_id = $1 and id = $2", [a.tid, target.pass_id, id]);
        if (target.rental_id) await c.query("update fac_rental set pay_status = 'paid' where tenant_id = $1 and id = $2", [a.tid, target.rental_id]);
        await audit(c, a.tid, a.email, 'fac.payment', { payment: id, method, amount: amt, expected: due, diff: amt !== due }); return { ok: true, payment: { id, method, amount: amt, expected: due } }; }); },

    'GET /api/fac/refunds': async req => { const a = await needStaff(req); const st = str(q(req).get('status'), 12);
      return T(a, async c => ({ refunds: (await c.query(`select r.id, r.payment_id payment, r.target, r.rule_type "ruleType", r.calc, r.auto_amount auto, r.amount, r.edit_reason "editReason", r.status, r.at, p.method, p.amount paid from fac_refund r join fac_payment p on p.tenant_id = r.tenant_id and p.id = r.payment_id where r.tenant_id = $1${st ? ' and r.status = $2' : ''} order by r.at desc limit 500`, st ? [a.tid, st] : [a.tid])).rows })); },

    /* 환불 확정: {payment, amount?, editReason?, preview?} — 공식 자동값과 다르면 editReason 필수. 토스면 취소 호출, 현장이면 기록만 */
    'POST /api/fac/refunds': async req => { const a = await needStaff(req); const b = await readBody(req, 2048);
      const out = await T(a, async c => { const P = (await c.query("select * from fac_payment where tenant_id = $1 and id = $2 and status = 'paid' for update", [a.tid, str(b.payment, 40)])).rows[0]; if (!P) throw E(404, 'payment', '환불할 결제가 없습니다.');
        const r = await autoRefund(c, a.tid, P); if (b.preview) return { preview: true, auto: r.auto, lines: r.lines, ruleType: r.type };
        if (a.role !== 'owner') { const S0 = (await c.query("select doc->'fac'->'settings'->>'subRefund' s from tenant_state where tenant_id = $1", [a.tid])).rows[0]; if (S0 && S0.s === 'owner') throw E(403, 'role', '환불 확정은 정운영자만 할 수 있습니다.'); }
        const amt = b.amount == null ? r.auto : Math.round(+b.amount); const reason = str(b.editReason, 300).trim();
        if (!Number.isFinite(amt) || amt < 0 || amt > P.amount) throw E(400, 'amount', '환불 금액을 확인해 주십시오.'); if (amt !== r.auto && !reason) throw E(400, 'reason', '자동 계산 금액과 다릅니다. 수정 사유를 입력해 주십시오.', { auto: r.auto });
        const ex = (await c.query("select id from fac_refund where tenant_id = $1 and payment_id = $2 and status <> 'cancelled' for update", [a.tid, P.id])).rows[0];
        if (ex) { const st = (await c.query('select status from fac_refund where tenant_id = $1 and id = $2', [a.tid, ex.id])).rows[0].status; if (st === 'done') throw E(409, 'refunded', '이미 환불을 확정했습니다.');
          await c.query("update fac_refund set calc = $3, auto_amount = $4, amount = $5, edit_reason = $6, by_staff = $7, at = now(), status = 'pending' where tenant_id = $1 and id = $2", [a.tid, ex.id, JSON.stringify(r.lines), r.auto, amt, amt !== r.auto ? reason : null, a.email]); }
        const id = ex ? ex.id : S.rid('fr_'); if (!ex) await c.query("insert into fac_refund (tenant_id, id, payment_id, target, rule_type, calc, auto_amount, amount, edit_reason, by_staff, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')", [a.tid, id, P.id, r.target, r.type, JSON.stringify(r.lines), r.auto, amt, amt !== r.auto ? reason : null, a.email]);
        await audit(c, a.tid, a.email, 'fac.refund', { refund: id, payment: P.id, auto: r.auto, amount: amt, edited: amt !== r.auto, reason: amt !== r.auto ? reason : undefined });
        return { id, P, r, amt }; });
      if (out.preview) return out;
      let cancelKey = null; if (out.P.method === 'toss' && out.amt > 0) { const x = await S.pay.cancel({ paymentKey: out.P.toss_key, reason: str(b.editReason, 200) || '환불', amount: out.amt, idem: 'rf-' + out.id }); if (!x.ok) throw E(502, 'pg', '결제사 환불 요청이 실패했습니다. 잠시 후 다시 시도해 주십시오.'); cancelKey = x.cancelKey; }
      return T(a, async c => { await c.query("update fac_refund set status = 'done', toss_cancel_key = $3 where tenant_id = $1 and id = $2", [a.tid, out.id, cancelKey]); const full = out.amt === out.P.amount;
        if (out.P.booking_id) await c.query('update fac_booking set pay_status = $3 where tenant_id = $1 and id = $2', [a.tid, out.P.booking_id, out.amt ? (full ? 'refunded' : 'partial') : 'paid']);
        if (out.P.pass_id) await c.query("update fac_pass set status = 'refunded' where tenant_id = $1 and id = $2", [a.tid, out.P.pass_id]);
        if (out.P.rental_id) await c.query("update fac_rental set deposit_status = case when deposit > 0 then 'returned' else deposit_status end where tenant_id = $1 and id = $2", [a.tid, out.P.rental_id]);
        const sid = (await c.query('select coalesce(b.sid, ps.sid, r.sid) sid from fac_payment p left join fac_booking b on b.tenant_id = p.tenant_id and b.id = p.booking_id left join fac_pass ps on ps.tenant_id = p.tenant_id and ps.id = p.pass_id left join fac_rental r on r.tenant_id = p.tenant_id and r.id = p.rental_id where p.tenant_id = $1 and p.id = $2', [a.tid, out.P.id])).rows[0].sid;
        await S.note(c, a.tid, sid, 'refund', { payment: out.P.id, amount: out.amt });
        return { ok: true, refund: { id: out.id, auto: out.r.auto, amount: out.amt, calc: out.r.lines, status: 'done' } }; }); },

    'GET /api/fac/rentals': async req => { const a = await staffOrTeacher(req); const st = str(q(req).get('status'), 12);
      return T(a, async c => ({ rentals: (await c.query(`select id, fac_id fac, res_id res, product_id "productId", right(sid, 4) "sidTail", aud, to_char(from_day, 'YYYY-MM-DD') "fromDay", to_char(due_day, 'YYYY-MM-DD') "dueDay", status, amount, deposit, deposit_status "depositStatus", late_fee "lateFee", pay_status "payStatus" from fac_rental where tenant_id = $1${st ? ' and status = $2' : ''}${a.facs ? ` and fac_id = any($${st ? 3 : 2})` : ''} order by due_day limit 1000`, [a.tid, ...(st ? [st] : []), ...(a.facs ? [[...a.facs]] : [])])).rows })); },

    'GET /api/fac/passes': async req => { const a = await needStaff(req); return T(a, async c => ({ passes: (await c.query("select id, product_id \"productId\", fac_id fac, right(sid, 4) \"sidTail\", kind, total, used, to_char(starts_on, 'YYYY-MM-DD') \"startsOn\", to_char(ends_on, 'YYYY-MM-DD') \"endsOn\", status, amount from fac_pass where tenant_id = $1 order by created_at desc limit 1000", [a.tid])).rows })); },

    'POST /api/fac/passes': async req => { const a = await needStaff(req); const b = await readBody(req, 1024); const sid = str(b.sid, 40).trim(); if (!sid) throw E(400, 'sid', '이용자 번호를 입력해 주십시오.');
      return T(a, async c => { const C = await S.cfg(c, a.tid); const p = S.prodOf(C, str(b.productId, 40)); if (!/^pass-/.test(p.type || '')) throw E(400, 'product', '이용권 상품이 아닙니다.'); S.facOf(C, p.fac);
        const per = calc.passPeriod(p, calc.kstDay(Date.now()), null); const id = S.rid('ps_');
        await c.query("insert into fac_pass (tenant_id, id, sid, product_id, fac_id, aud, kind, total, starts_on, ends_on, status, amount, cls_id, by_staff) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',0,$11,$12)", [a.tid, id, sid, p.id, p.fac, str(b.aud || 'student', 10), per.kind, per.total, per.startsOn, per.endsOn, str(p.cls || b.cls, 60) || null, a.email]);
        await audit(c, a.tid, a.email, 'fac.pass.grant', { pass: id, product: p.id, sid: tail(sid) }); await S.note(c, a.tid, sid, 'pass', { pass: id });
        return { ok: true, pass: { id, kind: per.kind, total: per.total, startsOn: per.startsOn, endsOn: per.endsOn, status: 'active' } }; }); },

    'GET /api/fac/noshow': async req => { const a = await needStaff(req); return T(a, async c => { await S.sweepNow(c, a.tid, null); const C = await S.cfg(c, a.tid);
      return { bookings: (await c.query("select *, to_char(day, 'YYYY-MM-DD') as day from fac_booking where tenant_id = $1 and status in ('no_show','expired') and day >= current_date - 60 order by start_at desc limit 500", [a.tid])).rows.map(b => ({ ...listRow(C, b), reason: b.cancel_reason })) }; }); },

    'GET /api/fac/stats': async req => { const a = await needStaff(req); const Q = q(req); const to = S.DAY_RE.test(Q.get('to') || '') ? Q.get('to') : calc.kstDay(Date.now()), from = S.DAY_RE.test(Q.get('from') || '') ? Q.get('from') : calc.addDays(to, -29); const g = ['fac', 'day', 'aud'].includes(Q.get('group')) ? Q.get('group') : 'fac';
      return T(a, async c => { const C = await S.cfg(c, a.tid); const key = g === 'fac' ? 'fac_id' : g === 'aud' ? 'aud' : "to_char(day, 'YYYY-MM-DD')";
        const rows = (await c.query(`select ${key} k, count(*) filter (where status in ('confirmed','checked_in','done'))::int booked, count(*) filter (where status = 'checked_in' or status = 'done')::int used, count(*) filter (where status = 'no_show')::int "noShow", count(*) filter (where status = 'cancelled')::int cancelled, coalesce(sum(slots) filter (where status in ('confirmed','checked_in','done')), 0)::int "slotsBooked" from fac_booking where tenant_id = $1 and day between $2 and $3 group by 1 order by 1`, [a.tid, from, to])).rows;
        const out = rows.map(r => ({ key: r.k, ...(g === 'fac' ? { name: (C.facs.find(x => x.id === r.k) || {}).name || r.k } : {}), booked: r.booked, used: r.used, noShow: r.noShow, cancelled: r.cancelled, slotsBooked: r.slotsBooked, noShowRate: r.booked + r.noShow ? Math.round(r.noShow * 1000 / (r.booked + r.noShow)) / 10 : 0 }));
        if (g === 'fac') for (const o of out) { const f = C.facs.find(x => x.id === o.key); if (!f) continue; let cap = 0; for (let d = from; d <= to; d = calc.addDays(d, 1)) if (!calc.closedOn(f, d).closed) cap += calc.slotsOf(f, d).length * S.resList(f).length * Math.max(1, +((f.capacity || {}).perSlot) || 1); o.capacity = cap; o.utilization = cap ? Math.round(o.slotsBooked * 1000 / cap) / 10 : 0; }
        const res = { from, to, group: g, rows: out };
        if (a.role === 'owner') { const m = (await c.query("select coalesce(sum(amount) filter (where method = 'toss'), 0)::int online, coalesce(sum(amount) filter (where method in ('card_onsite','cash','bank')), 0)::int onsite from fac_payment where tenant_id = $1 and status = 'paid' and (at at time zone 'Asia/Seoul')::date between $2 and $3", [a.tid, from, to])).rows[0];
          const rf = (await c.query("select coalesce(sum(amount), 0)::int n from fac_refund where tenant_id = $1 and status = 'done' and (at at time zone 'Asia/Seoul')::date between $2 and $3", [a.tid, from, to])).rows[0].n; res.sales = { online: m.online, onsite: m.onsite, refunds: rf, net: m.online + m.onsite - rf }; }
        return res; }); },

    'GET /api/fac/export': async (req, res) => { const a = await needOwner(req); const Q = q(req); const to = S.DAY_RE.test(Q.get('to') || '') ? Q.get('to') : calc.kstDay(Date.now()), from = S.DAY_RE.test(Q.get('from') || '') ? Q.get('from') : calc.addDays(to, -29);
      const rows = await T(a, async c => { const C = await S.cfg(c, a.tid); return (await c.query("select *, to_char(day, 'YYYY-MM-DD') as day from fac_booking where tenant_id = $1 and day between $2 and $3 order by start_at limit 20000", [a.tid, from, to])).rows.map(b => listRow(C, b)); });
      const esc = v => { const s = String(v == null ? '' : v); return /^[=+\-@]/.test(s) ? "'" + s : /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const H = ['id', 'facName', 'resName', 'day', 'from', 'to', 'status', 'aud', 'sidTail', 'amount', 'payMode', 'payStatus'];
      const csv = '﻿' + [H.join(','), ...rows.map(r => H.map(k => esc(r[k])).join(','))].join('\n');
      await T(a, c => audit(c, a.tid, a.email, 'fac.export', { from, to, n: rows.length }));
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="fac-${from}-${to}.csv"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(csv); return null; }
  };

  /* 경로 매개변수 :id 가 있는 라우트 */
  const P = [
    ['GET', /^\/api\/fac\/bookings\/(bk_[a-z0-9]{12})$/, async (req, id) => { const a = await needStaff(req); return T(a, async c => { const C = await S.cfg(c, a.tid); const b = await getBk(c, a.tid, id);
      const pays = (await c.query('select id, method, amount, status, receipt_no "receiptNo", at from fac_payment where tenant_id = $1 and booking_id = $2 order by at', [a.tid, id])).rows; const rfs = (await c.query('select r.id, r.auto_amount auto, r.amount, r.edit_reason "editReason", r.calc, r.status, r.at from fac_refund r join fac_payment p on p.tenant_id = r.tenant_id and p.id = r.payment_id where r.tenant_id = $1 and p.booking_id = $2', [a.tid, id])).rows;
      const cks = (await c.query('select at, via from fac_checkin where tenant_id = $1 and booking_id = $2', [a.tid, id])).rows; await audit(c, a.tid, a.email, 'fac.view', { booking: id });
      return { booking: { ...listRow(C, b), sid: b.sid, memberNo: b.member_no, note: b.note, extra: b.extra, cancelReason: b.cancel_reason, holdUntil: b.hold_until, createdAt: b.created_at }, payments: pays, refunds: rfs, checkins: cks }; }); }],
    ['POST', /^\/api\/fac\/bookings\/(bk_[a-z0-9]{12})\/approve$/, async (req, id) => { const a = await needStaff(req); return T(a, async c => { const b = await getBk(c, a.tid, id, true); if (b.status !== 'requested') throw E(409, 'state', '승인 대기 중인 예약이 아닙니다.');
      const C = await S.cfg(c, a.tid); const f = C.facs.find(x => x.id === b.fac_id) || {}; let mode = b.pay_mode; if (mode === 'after-approve') mode = S.pay.online() ? 'online' : 'onsite';
      const hold = mode === 'online' && b.amount ? new Date(Date.now() + Math.max(10, +(f.rules || {}).approveHoldMin || 24 * 60) * 60e3) : null;
      await c.query("update fac_booking set status = 'confirmed', pay_mode = $3, hold_until = $4, updated_at = now() where tenant_id = $1 and id = $2", [a.tid, id, mode, hold]);
      const orderId = hold ? await S.newOrder(c, a.tid, { booking_id: id }, b.amount, b.amount) : undefined;
      await S.note(c, a.tid, b.sid, 'approved', { booking: id }); await audit(c, a.tid, a.email, 'fac.approve', { booking: id }); return { status: 'confirmed', payStatus: b.amount ? 'pending' : 'none', ...(orderId ? { orderId } : {}) }; }); }],
    ['POST', /^\/api\/fac\/bookings\/(bk_[a-z0-9]{12})\/reject$/, async (req, id) => { const a = await needStaff(req); const body = await readBody(req, 1024); return T(a, async c => { const b = await getBk(c, a.tid, id, true); if (b.status !== 'requested') throw E(409, 'state', '승인 대기 중인 예약이 아닙니다.');
      const reason = str(body.reason, 200).trim(); if (!reason) throw E(400, 'reason', '반려 사유를 입력해 주십시오.');
      await c.query("update fac_booking set status = 'rejected', cancel_reason = $3, updated_at = now() where tenant_id = $1 and id = $2", [a.tid, id, reason]); await c.query('delete from fac_slot where tenant_id = $1 and booking_id = $2', [a.tid, id]);
      if (b.pass_id) await c.query("update fac_pass set used = greatest(0, used - 1) where tenant_id = $1 and id = $2 and kind = 'count'", [a.tid, b.pass_id]);
      await S.note(c, a.tid, b.sid, 'rejected', { booking: id, reason }); await audit(c, a.tid, a.email, 'fac.reject', { booking: id, reason }); return { status: 'rejected' }; }); }],
    ['POST', /^\/api\/fac\/bookings\/(bk_[a-z0-9]{12})\/cancel$/, async (req, id) => { const a = await needStaff(req); const body = await readBody(req, 1024); return T(a, async c => { const b = await getBk(c, a.tid, id, true); const r = await S.cancelBooking(c, a.tid, b, { staff: a.email }, str(body.reason, 200)); return { status: r.status, refund: r.refund }; }); }],
    ['POST', /^\/api\/fac\/rentals\/(rt_[a-z0-9]{12})\/(lend|return|approve)$/, async (req, id, act) => { const a = act === 'return' ? await staffOrTeacher(req) : await needStaff(req); const body = await readBody(req, 1024);
      return T(a, async c => { const r = (await c.query("select *, to_char(due_day, 'YYYY-MM-DD') as due_day from fac_rental where tenant_id = $1 and id = $2 for update", [a.tid, id])).rows[0]; if (!r) throw E(404, 'rental', '없는 대여입니다.'); inScope(a, r.fac_id);
        if (act === 'approve' || act === 'lend') { if (!['requested', 'approved'].includes(r.status) || (act === 'approve' && r.status !== 'requested')) throw E(409, 'state', '처리할 수 없는 상태입니다.');
          try { await c.query('update fac_rental set status = $3 where tenant_id = $1 and id = $2', [a.tid, id, act === 'approve' ? 'approved' : 'lent']); } catch (e) { if (e.code === '23505') throw E(409, 'taken', '이 물품은 이미 대여 중입니다.'); throw e; }
          if (act === 'approve') await S.note(c, a.tid, r.sid, 'approved', { rental: id }); await audit(c, a.tid, a.email, 'fac.' + act, { rental: id }); return { status: act === 'approve' ? 'approved' : 'lent' }; }
        if (!['lent', 'overdue'].includes(r.status)) throw E(409, 'state', '대여 중인 물품이 아닙니다.');
        const C = await S.cfg(c, a.tid); const p = C.prods.find(x => x.id === r.product_id) || {}; const L = calc.lateFee({ dueDay: r.due_day, returnDay: calc.kstDay(Date.now()), perDay: p.lateFeePerDay, cap: r.deposit || null });
        const ded = Math.max(0, Math.round(+body.deductions || 0)); const back = calc.refund({ rule: { type: 'rent' }, deposit: r.deposit, lateFee: L.fee, deductions: ded });
        await c.query("update fac_rental set status = 'returned', returned_at = now(), late_fee = $3, condition_note = $4, deposit_status = case when deposit > 0 then (case when $5::int > 0 then 'returned' else 'forfeited' end) else deposit_status end where tenant_id = $1 and id = $2", [a.tid, id, L.fee, str(body.condition, 300) || null, back.auto]);
        await audit(c, a.tid, a.email, 'fac.return', { rental: id, lateDays: L.days, lateFee: L.fee, deductions: ded, depositReturn: back.auto }); return { status: 'returned', lateDays: L.days, lateFee: L.fee, deductions: ded, depositReturn: back.auto, lines: back.lines }; }); }],
    ['POST', /^\/api\/fac\/passes\/(ps_[a-z0-9]{12})\/adjust$/, async (req, id) => { const a = await needStaff(req); const b = await readBody(req, 1024); const d = Math.round(+b.delta); const reason = str(b.reason, 200).trim(); if (!Number.isInteger(d) || !d || Math.abs(d) > 1000) throw E(400, 'delta', '조정 횟수를 확인해 주십시오.'); if (!reason) throw E(400, 'reason', '조정 사유를 입력해 주십시오.');
      return T(a, async c => { const r = (await c.query('update fac_pass set total = greatest(used, total + $3) where tenant_id = $1 and id = $2 returning total, used', [a.tid, id, d])).rows[0]; if (!r) throw E(404, 'pass', '없는 이용권입니다.'); await audit(c, a.tid, a.email, 'fac.pass.adjust', { pass: id, delta: d, reason }); return { ok: true, total: r.total, used: r.used, left: r.total - r.used }; }); }],
    ['POST', /^\/api\/fac\/noshow\/(bk_[a-z0-9]{12})\/restore$/, async (req, id) => { const a = await needStaff(req); return T(a, async c => { const b = await getBk(c, a.tid, id, true); if (!['no_show', 'expired'].includes(b.status)) throw E(409, 'state', '노쇼 · 만료 예약이 아닙니다.');
      const C = await S.cfg(c, a.tid); const f = C.facs.find(x => x.id === b.fac_id) || {}; const per = Math.max(1, +((f.capacity || {}).perSlot) || 1); const grp = S.rules(f).dupSame === false ? null : str(S.rules(f).exclGroup || f.id, 40);
      await c.query('select pg_advisory_xact_lock(hashtext($1))', [`fac|${a.tid}|${b.fac_id}|${b.day}`]);
      try { for (let s = b.start_slot; s < b.start_slot + b.slots; s++) { const r = await c.query(`insert into fac_slot (tenant_id, fac_id, res_id, day, slot, seat, booking_id, sid, excl_group) select $1, $2, $3, $4, $5, g, $6, $7, $8 from generate_series(1, $9::int) g where not exists (select 1 from fac_slot x where x.tenant_id = $1 and x.res_id = $3 and x.day = $4 and x.slot = $5 and x.seat = g) order by g limit 1 on conflict (tenant_id, res_id, day, slot, seat) do nothing returning seat`, [a.tid, b.fac_id, b.res_id, b.day, s, id, b.sid, grp, per]); if (!r.rowCount) throw E(409, 'taken', '그 사이 다른 예약이 칸을 차지해 되살릴 수 없습니다.'); } }
      catch (e) { if (e.code === '23505') throw E(409, 'dup_same', '이용자가 같은 시간에 다른 예약을 가지고 있습니다.'); throw e; }
      await c.query("update fac_booking set status = 'confirmed', noshow_min = 0, cancel_reason = null, hold_until = null, updated_at = now() where tenant_id = $1 and id = $2", [a.tid, id]); await audit(c, a.tid, a.email, 'fac.noshow.restore', { booking: id }); return { status: 'confirmed' }; }); }]
  ];
  return {
    match(method, p) { if (!p.startsWith('/api/fac/')) return null; const k = `${method} ${p}`; if (R[k]) return (req, res) => R[k](req, res);
      for (const [m, re, fn] of P) { if (m !== method) continue; const x = re.exec(p); if (x) return req => fn(req, ...x.slice(1)); } return null; }
  };
};
