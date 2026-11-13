'use strict';
/* v40 시설 · 장비 예약 서버 — 계산 기준값(tests/fac-vectors.json) · 동시 예약 · 금액 위조 · 기관 격리 · QR 1회용 · 노쇼 정리 · 예약 정지 · 환불 = 벡터.
   DATABASE_URL=postgres://… FAC_SWEEP_MS=0 node --test service/test/fac40.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto'); const path = require('node:path');
const calc = require('../server/fac/calc');
const V = require(path.join(__dirname, '..', '..', 'tests', 'fac-vectors.json'));

test('계산 기준값(fac-vectors.json)', () => {
  const fac = x => typeof x === 'string' ? V.facilities[x] : x; const prod = x => typeof x === 'string' ? V.products[x] : x;
  for (const v of V.quote) { const o = calc.quote({ ...v.in, fac: fac(v.in.fac), product: v.in.product ? prod(v.in.product) : undefined }); for (const k of Object.keys(v.out)) assert.deepEqual(o[k], v.out[k], `quote ${v.name}: ${k}`); }
  for (const v of V.slots) { const S = calc.slotsOf(fac(v.in.fac), v.in.day); assert.equal(S.length, v.out.count, v.name); if (v.out.first) { assert.deepEqual(S[0], v.out.first); assert.deepEqual(S[S.length - 1], v.out.last); } }
  for (const v of V.slotTime) { const T = calc.slotTime(fac(v.in.fac), v.in.day, v.in.startSlot, v.in.slots); assert.equal(T.startAt, Date.parse(v.out.startAt)); assert.equal(T.endAt, Date.parse(v.out.endAt)); }
  for (const v of V.openState) { const o = calc.openState(fac(v.in.fac), v.in.day, v.in.now); for (const k of Object.keys(v.out)) assert.deepEqual(o[k], v.out[k], `open ${v.name}: ${k}`); }
  for (const v of V.refund) { const rule = typeof v.in.rule === 'string' ? V.facilities[v.in.rule].refund : v.in.rule; assert.equal(calc.refund({ ...v.in, rule }).auto, v.out.auto, `refund ${v.name}`); }
  for (const v of V.lateFee) assert.deepEqual(calc.lateFee(v.in), v.out);
  for (const v of V.noShow) assert.equal(calc.isNoShow(v.in), v.out, v.name);
  for (const v of V.suspension) assert.deepEqual(calc.suspension(v.in), v.out, v.name);
  for (const v of V.dupSame) assert.equal(calc.dupSame(v.in.existing, v.in.req), v.out);
});

test('운영 서버: 시설 · 장비 예약', { skip: !process.env.DATABASE_URL }, async t => {
  const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp } = require('../server/app');
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex'), FAC_SWEEP_MS: '0' }, log: process.env.FAC_LOG ? console : {} }); await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, p, body) => { const r = await fetch(U + p, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const sfx = Date.now().toString(36);
  const NOW = Date.now(); const today = calc.kstDay(NOW); const hour = Math.floor(calc.kstMin(NOW) / 60); const plus = n => calc.addDays(today, n);
  const all = ['00:00', '24:00']; const hours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [d, all]));
  const F = { on: true, facilities: [{ id: 'f_t', name: '테니스 코트', kind: 'time', hours, slotMin: 60, minSlots: 1, maxSlots: 2, capacity: { res: 2, perSlot: 1 }, open: { daysAhead: 7, at: '00:00' }, pay: 'online', audience: ['student', 'public'], verify: 'sid',
    prices: { student: { slot: 3000 }, public: { slot: 6000 } }, rules: { dupSame: true, noShowMin: 15, noShowStrikes: 3, suspendDays: 30 }, refund: V.facilities.golf.refund, resources: [{ id: 'r1', name: '1번 코트' }, { id: 'r2', name: '2번 코트' }] }],
    products: [{ id: 'p_m1', fac: 'f_t', type: 'pass-period', name: '월이용권', days: 30, prices: { public: 150000 }, discountRate: 0, refund: { type: 'pass-period', unitPrice: { public: 12000 }, feeRate: 10 } },
      { id: 'p_lt', fac: 'f_t', type: 'rent', name: '라켓 3일', days: 3, deposit: 10000, lateFeePerDay: 1000, prices: { public: 2000 } }] };
  const docOf = (name, extra) => ({ org: { name, type: 'adult', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: false, approve: 'auto' } }, members: [], fac: { roster: [], settings: { kioskPin: '4321' }, ...extra }, lsite: { pub: { org: { name }, pages: [], fac: F } } });
  const A = (await call('A', 'POST', '/api/signup', { email: `fa${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: '스포츠센터', type: 'adult', code: 'C0DE' })).j.tenant;
  let rev = (await call('A', 'PUT', '/api/state', { doc: docOf('스포츠센터'), rev: 0 })).j.rev;
  const B = (await call('B', 'POST', '/api/signup', { email: `fb${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: '다른기관', type: 'adult', code: 'C0DE' })).j.tenant;
  await call('B', 'PUT', '/api/state', { doc: docOf('다른기관'), rev: 0 });
  const P = (p, tid = A.tid) => `/api/pub/${tid}/${p}`;
  const join = async (who, tid = A.tid) => { const email = `${who.toLowerCase()}${sfx}@ex.com`; const o = await call('X', 'POST', P('otp', tid), { email, purpose: 'signup' }); const r = await call(who, 'POST', P('signup', tid), { via: 'email', email, code: o.j.dev_code, nickname: who, consent: { tos: true, privacy: true }, age14: true }); assert.equal(r.status, 200, JSON.stringify(r.j)); return (await call(who, 'GET', P('me', tid))).j.me.sid; };
  const L = {}; for (const w of ['L1', 'L2', 'L3', 'L4', 'L5']) L[w] = await join(w);
  const D3 = plus(3), D1 = plus(1);

  await t.test('설정 · 목록: 온라인 결제 키 없음 → payOnline:false, 명단 · PIN 비공개', async () => {
    assert.equal((await call('G', 'GET', '/api/config')).j.payOnline, false);
    const r = await call('G', 'GET', P('fac-list')); assert.equal(r.status, 200); const f = r.j.facilities[0]; assert.equal(f.id, 'f_t'); assert.equal(f.pay, 'onsite'); assert.equal(r.j.payOnline, false);
    assert.doesNotMatch(JSON.stringify(r.j), /4321|roster|kioskPin/);
    const a = await call('G', 'GET', P(`fac-avail?fac=f_t&day=${D3}`)); assert.equal(a.status, 200); assert.equal(a.j.slots.length, 24); assert.deepEqual(a.j.slots[10].free, ['r1', 'r2']);
    assert.equal((await call('G', 'GET', P(`fac-avail?fac=f_t&day=${plus(9)}`))).j.error, 'not_open');
    assert.equal((await call('G', 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 10, slots: 1, aud: 'public' })).status, 401);
  });

  await t.test('동시 예약: 같은 칸 2건 중 1건만 성공, 나머지 409 taken(다른 코트 제안)', async () => {
    const [x, y] = await Promise.all(['L1', 'L2'].map(w => call(w, 'POST', P('fac-book'), { fac: 'f_t', res: 'r1', day: D3, slot: 10, slots: 1, aud: 'public', idem: 'race-' + w })));
    const ok = [x, y].filter(r => r.status === 200), bad = [x, y].filter(r => r.status === 409); assert.equal(ok.length, 1); assert.equal(bad.length, 1);
    assert.equal(bad[0].j.error, 'taken'); assert.deepEqual(bad[0].j.alt, ['r2']); assert.equal(ok[0].j.booking.amount, 6000); assert.equal(ok[0].j.next, 'done'); assert.equal(ok[0].j.booking.payStatus, 'pending');
    /* 자원을 고르지 않은 4명 → 코트 2개만 성공 */
    const R = await Promise.all(['L1', 'L2', 'L3', 'L4'].map(w => call(w, 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 11, slots: 1, aud: 'public' })));
    assert.equal(R.filter(r => r.status === 200).length, 2); assert.deepEqual(R.filter(r => r.status !== 200).map(r => r.j.error), ['taken', 'taken']);
    const n = (await pool.query("select count(*)::int n from fac_slot where tenant_id = $1 and day = $2 and slot = 11", [A.tid, D3])).rows[0].n; assert.equal(n, 2);
    /* 같은 요청 번호 재전송은 한 건 */
    const w = ok[0] === x ? 'L1' : 'L2'; const again = await call(w, 'POST', P('fac-book'), { fac: 'f_t', res: 'r1', day: D3, slot: 10, slots: 1, aud: 'public', idem: 'race-' + w }); assert.equal(again.status, 200); assert.equal(again.j.booking.id, ok[0].j.booking.id);
    /* 동일인 같은 시간 다른 코트 */
    const d = await call(w, 'POST', P('fac-book'), { fac: 'f_t', res: 'r2', day: D3, slot: 10, slots: 1, aud: 'public' }); assert.equal(d.status, 409); assert.equal(d.j.error, 'dup_same');
  });

  await t.test('금액 위조 거부 · 서버 재계산 · 온라인 결제 키 없음 409', async () => {
    const f = await call('L5', 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 12, slots: 2, aud: 'public', amount: 100 }); assert.equal(f.status, 400); assert.equal(f.j.error, 'amount');
    const q = await call('L5', 'POST', P('fac-quote'), { fac: 'f_t', day: D3, slot: 12, slots: 2, aud: 'public' }); assert.equal(q.j.final, 12000); assert.equal(q.j.pay, 'onsite');
    const g = await call('L5', 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 12, slots: 2, aud: 'public', amount: 12000, price: 1, prices: { public: { slot: 1 } } }); assert.equal(g.status, 200); assert.equal(g.j.booking.amount, 12000);
    assert.equal((await call('L5', 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 14, slots: 1, aud: 'public', payMode: 'online' })).j.error, 'onsite_only');
    assert.equal((await call('L5', 'POST', P('fac-pay'), { orderId: 'fo_aaaaaaaaaaaa', paymentKey: 'x', amount: 12000 })).status, 409);
    /* 구성원 요금: 명단이 없으면 승인 대기, 명단에 없으면 거절 */
    const s = await call('L5', 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 16, slots: 1, aud: 'student', memberNo: '20261234' }); assert.equal(s.status, 200); assert.equal(s.j.next, 'wait'); assert.equal(s.j.booking.amount, 3000);
    rev = (await call('A', 'PUT', '/api/state', { doc: docOf('스포츠센터', { roster: ['20260001'] }), rev })).j.rev;
    assert.equal((await call('L5', 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 18, slots: 1, aud: 'student', memberNo: '20269999' })).j.error, 'verify');
    const ok = await call('L5', 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 18, slots: 1, aud: 'student', memberNo: '20260001' }); assert.equal(ok.j.booking.status, 'confirmed');
  });

  let mine;
  await t.test('다른 기관 데이터 접근 차단', async () => {
    mine = (await call('L1', 'GET', P('fac-my'))).j.bookings; assert.ok(mine.length >= 1);
    const lb = await call('B', 'GET', `/api/fac/bookings?from=${today}&to=${plus(7)}`); assert.equal(lb.status, 200); assert.equal(lb.j.bookings.length, 0);
    assert.equal((await call('B', 'GET', `/api/fac/bookings/${mine[0].id}`)).status, 404);
    assert.equal((await call('B', 'POST', `/api/fac/bookings/${mine[0].id}/cancel`, { reason: 'x' })).status, 404);
    assert.equal((await call('L1', 'GET', P('fac-my', B.tid))).status, 401); /* A 학습자 세션으로 B 기관 */
    const seen = await inTenant(pool, B.tid, async c => (await c.query('select count(*)::int n from fac_booking')).rows[0].n); assert.equal(seen, 0); /* RLS: 조건 없이 읽어도 B 행만 */
    const la = await call('A', 'GET', `/api/fac/bookings?from=${today}&to=${plus(7)}`); assert.ok(la.j.bookings.length >= 5); assert.ok(la.j.bookings.every(b => b.sidTail.length <= 4));
  });

  await t.test('QR: 당일 발급 · 1회용 · 위조 · 다른 기관 거부', async () => {
    const b = await call('L3', 'POST', P('fac-book'), { fac: 'f_t', res: 'r1', day: today, slot: hour, slots: 1, aud: 'public' }); assert.equal(b.status, 200, JSON.stringify(b.j));
    assert.equal((await call('L3', 'POST', P('fac-qr'), { booking: mine[0].id })).status, 404); /* 남의 예약 */
    const q = await call('L3', 'POST', P('fac-qr'), { booking: b.j.booking.id }); assert.equal(q.status, 200); assert.match(q.j.token, /^v1\./); assert.equal(q.j.day, today);
    assert.equal((await call('B', 'POST', '/api/fac/checkin', { token: q.j.token })).j.error, 'qr');
    const bad = q.j.token.slice(0, -2) + (q.j.token.endsWith('AA') ? 'BB' : 'AA'); assert.equal((await call('A', 'POST', '/api/fac/checkin', { token: bad })).j.error, 'qr');
    const c1 = await call('A', 'POST', '/api/fac/checkin', { token: q.j.token, fac: 'f_t' }); assert.equal(c1.status, 200, JSON.stringify(c1.j)); assert.equal(c1.j.kind, 'booking'); assert.equal(c1.j.unpaid, 6000);
    const c2 = await call('A', 'POST', '/api/fac/checkin', { token: q.j.token }); assert.equal(c2.status, 409); assert.equal(c2.j.error, 'used');
    assert.equal((await call('L3', 'POST', P('fac-qr'), { booking: b.j.booking.id })).j.error, 'not_ready');
    /* 키오스크: PIN으로 시작한 토큰으로만 */
    assert.equal((await call('A', 'POST', '/api/fac/kiosk/start', { fac: 'f_t', pin: '0000' })).j.error, 'pin');
    const k = await call('A', 'POST', '/api/fac/kiosk/start', { fac: 'f_t', pin: '4321' }); assert.ok(k.j.kioskToken);
    assert.equal((await call('K', 'POST', '/api/fac/checkin', { kiosk: k.j.kioskToken, tid: A.tid, token: q.j.token })).j.error, 'used');
    const d1 = await call('L3', 'POST', P('fac-book'), { fac: 'f_t', day: D1, slot: 5, slots: 1, aud: 'public' }); assert.equal((await call('L3', 'POST', P('fac-qr'), { booking: d1.j.booking.id })).j.error, 'not_today');
  });

  await t.test('노쇼: 요청 시 정리 → 칸 해제, 3회 누적 30일 정지', async () => {
    const b = await call('L4', 'POST', P('fac-book'), { fac: 'f_t', res: 'r2', day: today, slot: hour, slots: 1, aud: 'public' }); assert.equal(b.status, 200, JSON.stringify(b.j));
    await pool.query("update fac_booking set start_at = now() - interval '20 minutes' where tenant_id = $1 and id = $2", [A.tid, b.j.booking.id]);
    const o = await call('A', 'GET', '/api/fac/overview'); assert.equal(o.status, 200); assert.ok(o.j.noShow >= 1);
    const st = (await pool.query('select status from fac_booking where tenant_id = $1 and id = $2', [A.tid, b.j.booking.id])).rows[0].status; assert.equal(st, 'no_show');
    assert.equal((await pool.query('select count(*)::int n from fac_slot where tenant_id = $1 and booking_id = $2', [A.tid, b.j.booking.id])).rows[0].n, 0);
    const ns = await call('A', 'GET', '/api/fac/noshow'); assert.ok(ns.j.bookings.some(x => x.id === b.j.booking.id));
    const ev = (await pool.query("select data from learner_events where tenant_id = $1 and type = 'fac-note' and xid = $2", [A.tid, b.j.booking.id])).rows; assert.equal(ev[0].data.kind, 'no_show');
    /* 노쇼 2건 더(지난 날) → 3회 → 정지 */
    for (const n of [1, 2]) await pool.query("insert into fac_booking (tenant_id, id, fac_id, res_id, sid, aud, day, start_slot, slots, start_at, end_at, status, pay_mode) values ($1, $2, 'f_t', 'r1', $3, 'public', $4, 3, 1, now() - interval '3 days', now() - interval '3 days', 'no_show', 'onsite')", [A.tid, 'bk_nsx' + n + sfx.slice(-8).padStart(8, '0'), L.L4, plus(-n)]);
    const s = await call('L4', 'POST', P('fac-book'), { fac: 'f_t', day: D3, slot: 20, slots: 1, aud: 'public' }); assert.equal(s.status, 403); assert.equal(s.j.error, 'suspended'); assert.equal(s.j.until, calc.addDays(today, 29));
    /* 되살리기 */
    const r = await call('A', 'POST', `/api/fac/noshow/${b.j.booking.id}/restore`); assert.equal(r.j.status, 'confirmed');
  });

  await t.test('환불: 공식 자동 계산 = 벡터, 금액 수정은 사유 필수', async () => {
    /* 시간 예약: 3일 뒤(48시간 이상 전) 현장 결제 후 취소 → 100% */
    const b = await call('L5', 'POST', P('fac-book'), { fac: 'f_t', res: 'r2', day: D3, slot: 22, slots: 1, aud: 'public' });
    const w = await call('A', 'POST', '/api/fac/payments', { booking: b.j.booking.id, method: 'cash', amount: 5000 }); assert.equal(w.status, 400); assert.equal(w.j.error, 'amount'); assert.equal(w.j.expected, 6000);
    assert.equal((await call('A', 'POST', '/api/fac/payments', { booking: b.j.booking.id, method: 'cash', amount: 6000, receiptNo: 'R-1' })).status, 200);
    const start = calc.slotTime(F.facilities[0], D3, 22, 1).startAt; const c = await call('L5', 'POST', P('fac-cancel'), { booking: b.j.booking.id, reason: '일정 변경' }); assert.equal(c.status, 200);
    assert.equal(c.j.refund.auto, calc.refund({ rule: V.facilities.golf.refund, paid: 6000, startAt: start, now: Date.now() }).auto); assert.equal(c.j.refund.auto, 6000);
    const pend = (await call('A', 'GET', '/api/fac/refunds?status=pending')).j.refunds; const rf = pend.find(x => x.target === 'booking:' + b.j.booking.id); assert.equal(rf.auto, 6000);
    const done = await call('A', 'POST', '/api/fac/refunds', { payment: rf.payment }); assert.equal(done.status, 200); assert.equal(done.j.refund.amount, 6000);
    /* 월이용권: 현장 결제 → 1회 입장 → 환불 예상 = 벡터(월이용권 1회) */
    const p = await call('L2', 'POST', P('fac-buy'), { productId: 'p_m1', aud: 'public' }); assert.equal(p.status, 200); assert.equal(p.j.pass.status, 'pending'); assert.equal(p.j.next, 'onsite');
    assert.equal((await call('A', 'POST', '/api/fac/payments', { pass: p.j.pass.id, method: 'card_onsite', amount: 150000 })).status, 200);
    const ck = await call('A', 'POST', '/api/fac/checkin', { passId: p.j.pass.id }); assert.equal(ck.status, 200, JSON.stringify(ck.j)); assert.equal(ck.j.kind, 'pass');
    assert.equal((await call('A', 'POST', '/api/fac/checkin', { passId: p.j.pass.id })).j.error, 'once_per_day');
    const pay = (await pool.query('select id from fac_payment where tenant_id = $1 and pass_id = $2', [A.tid, p.j.pass.id])).rows[0].id;
    const vec = V.refund.find(x => x.name.startsWith('월이용권 1회'));
    const pv = await call('A', 'POST', '/api/fac/refunds', { payment: pay, preview: true }); assert.equal(pv.j.auto, vec.out.auto);
    const nr = await call('A', 'POST', '/api/fac/refunds', { payment: pay, amount: 80000 }); assert.equal(nr.status, 400); assert.equal(nr.j.error, 'reason'); assert.equal(nr.j.auto, 75000);
    const ok = await call('A', 'POST', '/api/fac/refunds', { payment: pay, amount: 80000, editReason: '부상 진단서 제출' }); assert.equal(ok.status, 200); assert.equal(ok.j.refund.auto, 75000); assert.equal(ok.j.refund.amount, 80000);
    assert.equal((await call('A', 'POST', '/api/fac/refunds', { payment: pay })).j.error, 'refunded');
    const ps = (await call('L2', 'GET', P('fac-my'))).j.passes.find(x => x.id === p.j.pass.id); assert.equal(ps.status, 'refunded');
  });

  await t.test('대여: 이중 대여 거절 · 반납 연체료', async () => {
    const one = await call('L1', 'POST', P('fac-rent'), { fac: 'f_t', productId: 'p_lt', aud: 'public', res: 'r1' }); assert.equal(one.status, 200); assert.equal(one.j.rental.deposit, 10000);
    assert.equal((await call('L2', 'POST', P('fac-rent'), { fac: 'f_t', productId: 'p_lt', aud: 'public', res: 'r1' })).j.error, 'taken');
    assert.equal((await call('A', 'POST', `/api/fac/rentals/${one.j.rental.id}/lend`, {})).j.status, 'lent');
    await pool.query("update fac_rental set due_day = due_day - 5 where tenant_id = $1 and id = $2", [A.tid, one.j.rental.id]);
    const r = await call('A', 'POST', `/api/fac/rentals/${one.j.rental.id}/return`, { condition: '양호' }); assert.equal(r.status, 200); assert.equal(r.j.lateDays, 3); assert.equal(r.j.lateFee, 3000); assert.equal(r.j.depositReturn, 7000);
  });

  await t.test('통계 · 교강사 제한', async () => {
    const s = await call('A', 'GET', `/api/fac/stats?from=${today}&to=${plus(7)}&group=fac`); assert.equal(s.status, 200); assert.ok(s.j.rows[0].booked >= 1); assert.ok(s.j.sales.onsite >= 156000);
    assert.equal((await call('G', 'GET', '/api/fac/overview')).status, 401);
  });
  app.close(); await pool.end();
});
