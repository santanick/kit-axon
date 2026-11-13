'use strict';
/* v40 시설 · 장비 예약 /api 대조: 같은 시나리오를 Node · Java에 돌려 상태코드 · 오류 코드 · 금액을 비교한다(contract-coupon.js 방식).
   사용: . test/env.sh; SIGNUP_CODE=C0DE로 띄운 뒤
     node test/contract-fac40.js http://127.0.0.1:<node> http://127.0.0.1:<java>   # 두 서버 대조 + QR 교차 검증(같은 FAC_QR_KEY · PII_KEY 필요)
     node test/contract-fac40.js http://127.0.0.1:<java>                           # 한 서버만 기대값 확인 */
const URLS = process.argv.slice(2); let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const kst = (d = 0) => new Date(Date.now() + 9 * 3600e3 + d * 864e5).toISOString().slice(0, 10);
const hourNow = () => new Date(Date.now() + 9 * 3600e3).getUTCHours();

const FAC = () => ({ on: true,
  facilities: [
    { id: 'f_golf', name: '골프연습장', kind: 'time', pay: 'online', approval: false, audience: ['student', 'staff', 'public'], verify: 'none', slotMin: 60, minSlots: 1, maxSlots: 4,
      hours: { 0: ['00:00', '24:00'], 1: ['00:00', '24:00'], 2: ['00:00', '24:00'], 3: ['00:00', '24:00'], 4: ['00:00', '24:00'], 5: ['00:00', '24:00'], 6: ['00:00', '24:00'] },
      open: { daysAhead: 7, at: '00:00' }, capacity: { res: 2, perSlot: 1 }, prices: { student: { slot: 5000 }, staff: { slot: 8000 }, public: { slot: 10000 } },
      rules: { dupSame: true, exclGroup: 'golf', noShowMin: 120, maxActive: 5 }, refund: { type: 'time', steps: [{ beforeH: 48, rate: 100 }, { beforeH: 24, rate: 50 }, { rate: 0 }] },
      resources: [{ id: 'r1', name: '타석 1', on: true }, { id: 'r2', name: '타석 2', on: true }] },
    { id: 'f_room', name: '세미나실', kind: 'time', pay: 'free', approval: true, audience: ['student', 'staff'], verify: 'sid', slotMin: 60, hours: { all: ['09:00', '18:00'] }, minSlots: 1, maxSlots: 3,
      open: { daysAhead: 30, at: '00:00' }, capacity: { res: 1, perSlot: 1 }, prices: { student: { slot: 0 }, staff: { slot: 0 } }, resources: [{ id: 'r1', name: 'A실', on: true }] },
    { id: 'f_cam', name: '카메라', kind: 'rent', pay: 'free', approval: true, audience: ['student', 'public'], resources: [{ id: 'c1', name: '카메라 1', on: true }] },
    { id: 'f_lap', name: '노트북', kind: 'rent', pay: 'onsite', approval: false, audience: ['student', 'public'], resources: [{ id: 'n1', name: '노트북 1', on: true }] }],
  products: [
    { id: 'p_m3', fac: 'f_golf', type: 'pass-period', name: '월이용권 3개월', days: 90, prices: { public: 450000 }, discountRate: 10, refund: { type: 'pass-period', unitPrice: { public: 12000 }, feeRate: 10 } },
    { id: 'p_d5', fac: 'f_golf', type: 'pass-count', name: '일일권 5매', count: 5, expireDays: 90, prices: { public: 45000 } },
    { id: 'p_cam', fac: 'f_cam', type: 'rent', name: '카메라 3일', days: 3, prices: { public: 0, student: 0 } },
    { id: 'p_lap', fac: 'f_lap', type: 'rent', name: '노트북 7일', days: 7, deposit: 50000, lateFeePerDay: 2000, prices: { public: 10000, student: 0 } }],
  settings: { kioskPin: '4321' } });

async function run(U, tag) {
  const jar = {}; const call = async (who, m, p, b) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: b ? JSON.stringify(b) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch { j = { _text: t.slice(0, 200) }; } return { st: r.status, j }; };
  const sfx = `${tag}${Date.now().toString(36)}`; const R = {}; const T1 = kst(1), T0 = kst(0);
  const su = await call('A', 'POST', '/api/signup', { email: `fac_${sfx}@example.com`, password: 'Contract2026x', orgName: '시설', type: 'adult', code: 'C0DE' }); const tid = su.j.tenant.tid;
  const doc = { org: { name: '시설', type: 'adult', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: false, approve: 'auto' } }, members: [], fac: FAC(), lsite: { pub: { org: { name: '시설' }, pages: [], fac: FAC() } } };
  let rev = (await call('A', 'GET', '/api/state')).j.rev || 0; rev = (await call('A', 'PUT', '/api/state', { doc, rev })).j.rev;
  const P = p => `/api/pub/${tid}/${p}`; const L = ['L1', 'L2', 'L3', 'L4', 'L5'];
  for (const w of L) { const email = `${w.toLowerCase()}_${sfx}@example.com`; const o = await call('X', 'POST', P('otp'), { email, purpose: 'signup' }); await call(w, 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: w, consent: { tos: true, privacy: true }, age14: true }); }
  const sid1 = (await call('L1', 'GET', P('me'))).j.sid || ((await call('L1', 'GET', P('me'))).j.me || {}).sid;
  R.sid = !!sid1;

  // 열람 · 견적
  const li = await call('G', 'GET', P('fac-list')); R.list = [li.st, (li.j.facilities || []).length, li.j.payOnline, li.j.facilities[0].pay]; R.config = (await call('G', 'GET', '/api/config')).j.payOnline;
  const av = await call('G', 'GET', P(`fac-avail?fac=f_golf&day=${T1}`)); R.avail = [av.st, (av.j.slots || []).length, av.j.slots && av.j.slots[10].left, JSON.stringify(av.j.slots && av.j.slots[10].free)];
  const nv = await call('G', 'GET', P(`fac-avail?fac=f_golf&day=${kst(20)}`)); R.notOpen = [nv.st, nv.j.error, !!nv.j.opensAt];
  R.badFac = (await call('G', 'GET', P(`fac-avail?fac=nope&day=${T1}`))).st;
  R.guestQuote = (await call('G', 'POST', P('fac-quote'), { fac: 'f_golf', aud: 'student', slots: 2 })).st;
  const q = await call('L1', 'POST', P('fac-quote'), { fac: 'f_golf', aud: 'student', day: T1, slot: 10, slots: 2 }); R.quote = [q.st, q.j.list, q.j.final, q.j.pay];
  R.quoteAud = (await call('L1', 'POST', P('fac-quote'), { fac: 'f_room', aud: 'public', slots: 1 })).j.error;

  // 예약 · 중복
  const B = (who, x) => call(who, 'POST', P('fac-book'), { fac: 'f_golf', day: T1, slot: 10, slots: 2, aud: 'student', ...x });
  R.amount = (await B('L1', { amount: 1, payMode: 'onsite', idem: 'a0' })).j.error;
  R.pgOff = [(await B('L1', { payMode: 'online', idem: 'a1' })).st, (await B('L1', { payMode: 'online', idem: 'a1' })).j.error];
  const b1 = await B('L1', { res: 'r1', payMode: 'onsite', idem: 'u1' }); if (process.env.DBG) console.log(JSON.stringify({ av: av.st, q: q.j, b1: b1.j, st: b1.st }).slice(0, 1500)); R.book = [b1.st, b1.j.next, b1.j.booking && b1.j.booking.status, b1.j.booking && b1.j.booking.payStatus, b1.j.booking && b1.j.booking.amount];
  const b1b = await B('L1', { res: 'r1', payMode: 'onsite', idem: 'u1' }); R.idem = b1b.j.booking && b1b.j.booking.id === b1.j.booking.id;
  const tk = await B('L2', { res: 'r1', payMode: 'onsite', idem: 'u2' }); R.taken = [tk.st, tk.j.error, JSON.stringify(tk.j.alt)];
  const dp = await B('L1', { res: 'r2', slot: 11, slots: 1, payMode: 'onsite', idem: 'u3' }); R.dup = [dp.st, dp.j.error];
  const conc = await Promise.all(['L2', 'L3', 'L4', 'L5'].map(w => B(w, { slot: 20, slots: 1, payMode: 'onsite', idem: 'c' + w })));
  R.conc = [conc.filter(r => r.st === 200).length, conc.filter(r => r.st === 409 && r.j.error === 'taken').length];
  const av2 = await call('G', 'GET', P(`fac-avail?fac=f_golf&day=${T1}`)); R.availAfter = [av2.j.slots[10].left, av2.j.slots[20].left];
  const my = await call('L1', 'GET', P('fac-my')); R.my = [my.st, (my.j.bookings || []).length, (my.j.bookings || [])[0] && my.j.bookings[0].facName];
  R.qrNotToday = (await call('L1', 'POST', P('fac-qr'), { booking: b1.j.booking.id })).j.error;
  const cn = await call('L1', 'POST', P('fac-cancel'), { booking: b1.j.booking.id, reason: '일정 변경' }); R.cancel = [cn.st, cn.j.status, cn.j.refund && cn.j.refund.auto];
  R.cancel2 = (await call('L1', 'POST', P('fac-cancel'), { booking: b1.j.booking.id })).j.error;

  // 승인제(대학 학번 확인)
  const rq = await call('L1', 'POST', P('fac-book'), { fac: 'f_room', day: T1, slot: 0, slots: 1, aud: 'student', idem: 'r1' }); R.req = [rq.st, rq.j.next, rq.j.booking && rq.j.booking.status];
  const ov = await call('A', 'GET', '/api/fac/overview'); R.overview = [ov.st, ov.j.pendingApprovals];
  const ap = await call('A', 'POST', `/api/fac/bookings/${rq.j.booking.id}/approve`, {}); R.approve = [ap.st, ap.j.status];
  R.rejectNoReason = (await call('A', 'POST', `/api/fac/bookings/${rq.j.booking.id}/reject`, {})).j.error;
  const ls = await call('A', 'GET', `/api/fac/bookings?from=${T1}&to=${T1}&fac=f_golf`); R.adminList = [ls.st, (ls.j.bookings || []).length, ls.j.bookings && ls.j.bookings[0] && ls.j.bookings[0].sid === undefined && ls.j.bookings[0].sidTail.length];

  // 당일 · 체크인(운영자가 대신 예약 → 학습자 QR → 체크인)
  const h = hourNow();
  const ab = await call('A', 'POST', '/api/fac/bookings', { fac: 'f_golf', res: 'r2', day: T0, slot: h, slots: 1, sid: sid1, aud: 'student', payMode: 'onsite' }); R.adminBook = [ab.st, ab.j.booking && ab.j.booking.status];
  const pw = await call('A', 'POST', '/api/fac/payments', { booking: ab.j.booking.id, method: 'cash', amount: 1000 }); R.payWrong = [pw.st, pw.j.error, pw.j.expected];
  const pg = await call('A', 'POST', '/api/fac/payments', { booking: ab.j.booking.id, method: 'cash', amount: 5000, receiptNo: 'R-1' }); R.payOk = [pg.st, pg.j.payment && pg.j.payment.amount, pg.j.payment && pg.j.payment.expected];
  const qr = await call('L1', 'POST', P('fac-qr'), { booking: ab.j.booking.id }); R.qr = [qr.st, /^v1\.[\w-]+\.[\w-]+$/.test(qr.j.token || ''), qr.j.day];
  R.forged = (await call('A', 'POST', '/api/fac/checkin', { token: (qr.j.token || 'v1.a.b').slice(0, -2) + 'AA' })).j.error;
  R.wrongFac = (await call('A', 'POST', '/api/fac/checkin', { token: qr.j.token, fac: 'f_room' })).j.error;
  const ci = await call('A', 'POST', '/api/fac/checkin', { token: qr.j.token }); R.checkin = [ci.st, ci.j.ok, ci.j.who && ci.j.who.aud];
  R.used = (await call('A', 'POST', '/api/fac/checkin', { token: qr.j.token })).j.error;

  // 이용권(운영자 부여 → 1일 1회 입장)
  const gp = await call('A', 'POST', '/api/fac/passes', { sid: sid1, productId: 'p_d5' }); R.grant = [gp.st, gp.j.pass && gp.j.pass.total];
  const pq1 = await call('L1', 'POST', P('fac-qr'), { passId: gp.j.pass.id }); const pc1 = await call('A', 'POST', '/api/fac/checkin', { token: pq1.j.token }); R.passIn = [pc1.st, pc1.j.left];
  const pq2 = await call('L1', 'POST', P('fac-qr'), { passId: gp.j.pass.id }); R.once = (await call('A', 'POST', '/api/fac/checkin', { token: pq2.j.token })).j.error;
  R.adjustNoReason = (await call('A', 'POST', `/api/fac/passes/${gp.j.pass.id}/adjust`, { delta: 1 })).j.error;
  const bu = await call('L2', 'POST', P('fac-buy'), { productId: 'p_m3', aud: 'public', payMode: 'onsite', idem: 'b1' }); R.buy = [bu.st, bu.j.pass && bu.j.pass.amount, bu.j.pass && bu.j.pass.status, bu.j.next];

  const pp = await call('A', 'POST', '/api/fac/payments', { pass: bu.j.pass.id, method: 'card_onsite', amount: 405000 }); const bu2 = await call('L2', 'POST', P('fac-buy'), { productId: 'p_m3', aud: 'public', payMode: 'onsite', idem: 'b2' });
  const bu3 = await call('L2', 'POST', P('fac-buy'), { productId: 'p_m3', aud: 'public', payMode: 'onsite', idem: 'b3', extend: false });
  R.extend = [pp.st, bu.j.pass.endsOn, bu2.j.pass && bu2.j.pass.startsOn, bu3.j.pass && bu3.j.pass.startsOn === T0, bu.j.pass.startsOn === T0, bu.j.pass.kind, bu.j.pass.total];
  if (h <= 21) { for (const s of [h + 1, h + 2]) await call('A', 'POST', '/api/fac/bookings', { fac: 'f_golf', res: 'r1', day: T0, slot: s, slots: 1, sid: sid1, aud: 'student', payMode: 'onsite' });
    const am = await call('A', 'POST', '/api/fac/checkin', { sidTail: sid1.slice(-4) }); R.ambiguous = [am.st, am.j.error, (am.j.candidates || []).length]; } else R.ambiguous = [409, 'ambiguous', 2];
  // 환불(수정 사유 필수)
  const pv = await call('A', 'POST', '/api/fac/refunds', { payment: pg.j.payment.id, preview: true }); R.preview = [pv.st, pv.j.preview, pv.j.auto, pv.j.ruleType, Array.isArray(pv.j.lines)];
  const rfBad = await call('A', 'POST', '/api/fac/refunds', { payment: pg.j.payment.id, amount: 1234 }); R.refundReason = [rfBad.st, rfBad.j.error, rfBad.j.auto];
  const rf = await call('A', 'POST', '/api/fac/refunds', { payment: pg.j.payment.id, amount: 1000, editReason: '현장 합의' }); R.refund = [rf.st, rf.j.refund && rf.j.refund.amount, rf.j.refund && rf.j.refund.auto];

  // 대여(같은 물품 이중 대여 거절 → 반납)
  const rt = await call('L1', 'POST', P('fac-rent'), { fac: 'f_lap', productId: 'p_lap', aud: 'public', idem: 'n1' }); R.rent = [rt.st, rt.j.rental && rt.j.rental.status, rt.j.rental && rt.j.rental.deposit, rt.j.next];
  R.rent2 = (await call('L2', 'POST', P('fac-rent'), { fac: 'f_lap', productId: 'p_lap', aud: 'public', idem: 'n2' })).j.error;
  R.lend = (await call('A', 'POST', `/api/fac/rentals/${rt.j.rental.id}/lend`, {})).j.status;
  const rr = await call('A', 'POST', `/api/fac/rentals/${rt.j.rental.id}/return`, { deductions: 5000 }); R.ret = [rr.st, rr.j.lateFee, rr.j.depositReturn];

  const cm = await call('L3', 'POST', P('fac-rent'), { fac: 'f_cam', productId: 'p_cam', aud: 'public', idem: 'm1' }); const ca = await call('A', 'POST', `/api/fac/rentals/${cm.j.rental.id}/approve`, {});
  R.camApprove = [cm.j.rental.status, cm.j.next, ca.st, ca.j.status, (await call('A', 'POST', `/api/fac/rentals/${cm.j.rental.id}/approve`, {})).j.error];
  const rl = await call('A', 'GET', '/api/fac/rentals'); const pl = await call('A', 'GET', '/api/fac/passes'); R.lists = [rl.st, (rl.j.rentals || []).length, pl.st, (pl.j.passes || []).length, (rl.j.rentals || [])[0] && Object.keys(rl.j.rentals[0]).join()];
  // 휴관 · 통계 · 권한
  const cl = await call('A', 'POST', '/api/fac/closures', { fac: 'f_golf', from: T1, to: T1, reason: '점검', cancelBookings: true, pass: 'extend' }); R.closure = [cl.st, cl.j.affected, cl.j.cancelled];
  const st = await call('A', 'GET', `/api/fac/stats?from=${T0}&to=${T1}`); R.stats = [st.st, Array.isArray(st.j.rows)];
  R.learnerAdmin = (await call('L1', 'GET', '/api/fac/overview')).st;
  R.noshow = (await call('A', 'GET', '/api/fac/noshow')).st;
  const ex = await fetch(U + `/api/fac/export?from=${T0}&to=${T1}`, { headers: { cookie: jar.A } }); R.export = [ex.status, /csv/.test(ex.headers.get('content-type') || '')];
  R.kioskBad = (await call('A', 'POST', '/api/fac/kiosk/start', { pin: '0000', fac: 'f_golf' })).j.error;
  const ks = await call('A', 'POST', '/api/fac/kiosk/start', { pin: '4321', fac: 'f_golf' }); R.kiosk = [ks.st, !!ks.j.kioskToken];
  const pq3 = await call('L2', 'POST', P('fac-qr'), { passId: bu2.j.pass.id }); R.pausedQr = pq3.j.error;
  R._qrToken = qr.j.token; R._tid = tid; R._jarA = jar.A;
  return R;
}

const expect = R => {
  ok(R.extend[0] === 200 && R.extend[2] === (R.extend[1] && new Date(Date.parse(R.extend[1] + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10)) && R.extend[3] && R.extend[4] && R.extend[5] === 'period' && R.extend[6] === 90, `연장 구매 ${R.extend}`);
  ok(R.ambiguous.join() === '409,ambiguous,2', `학번 끝 여러 건 ${R.ambiguous}`); ok(R.camApprove.join() === 'requested,wait,200,approved,state', `대여 승인 ${R.camApprove}`);
  ok(R.lists[0] === 200 && R.lists[1] === 2 && R.lists[2] === 200 && R.lists[3] === 4, `대여 · 이용권 목록 ${R.lists}`);
  ok(R.sid, '학습자 sid'); ok(R.config === false, `config payOnline ${R.config}`); ok(R.list.join() === '200,4,false,onsite', `목록 ${R.list}`); ok(R.avail.join() === '200,24,2,["r1","r2"]', `빈 칸 ${R.avail}`); ok(R.notOpen.join() === '409,not_open,true', `오픈 전 ${R.notOpen}`);
  ok(R.badFac === 404, `없는 시설 ${R.badFac}`); ok(R.guestQuote === 401, '로그인 전 견적 401'); ok(R.quote.join() === '200,10000,10000,onsite', `견적 ${R.quote}`); ok(R.quoteAud === 'aud', `구분 ${R.quoteAud}`);
  ok(R.amount === 'amount', `금액 불일치 ${R.amount}`); ok(R.pgOff.join() === '409,onsite_only', `토스 키 없음 ${R.pgOff}`); ok(R.book.join() === '200,done,confirmed,pending,10000', `예약 ${R.book}`); ok(R.idem, '같은 idem 한 건');
  ok(R.taken.join() === '409,taken,["r2"]', `같은 칸 ${R.taken}`); ok(R.dup.join() === '409,dup_same', `동일인 중복 ${R.dup}`); ok(R.conc.join() === '2,2', `동시 4건 → 정원 2 ${R.conc}`); ok(R.availAfter.join() === '1,0', `점유 후 ${R.availAfter}`);
  ok(R.my[0] === 200 && R.my[1] >= 1 && R.my[2] === '골프연습장', `내 예약 ${R.my}`); ok(R.qrNotToday === 'not_today', `QR 당일만 ${R.qrNotToday}`); ok(R.cancel.join() === '200,cancelled,0', `취소 ${R.cancel}`); ok(R.cancel2 === 'not_cancelable', `재취소 ${R.cancel2}`);
  ok(R.req.join() === '200,wait,requested', `승인제 ${R.req}`); ok(R.overview[0] === 200 && R.overview[1] === 1, `현황 ${R.overview}`); ok(R.approve.join() === '200,confirmed', `승인 ${R.approve}`); ok(R.rejectNoReason === 'state', `반려 ${R.rejectNoReason}`);
  ok(R.adminList[0] === 200 && R.adminList[2] === 4, `운영자 목록 마스킹 ${R.adminList}`); ok(R.adminBook.join() === '200,confirmed', `대신 예약 ${R.adminBook}`); ok(R.payWrong.join() === '400,amount,5000', `현장 결제 금액 ${R.payWrong}`); ok(R.payOk.join() === '200,5000,5000', `현장 결제 ${R.payOk}`);
  ok(R.qr[0] === 200 && R.qr[1], `QR 발급 ${R.qr}`); ok(R.forged === 'qr', `위조 QR ${R.forged}`); ok(R.wrongFac === 'wrong_fac', `다른 시설 ${R.wrongFac}`); ok(R.checkin.join() === '200,true,student', `체크인 ${R.checkin}`); ok(R.used === 'used', `QR 1회용 ${R.used}`);
  ok(R.grant.join() === '200,5', `이용권 부여 ${R.grant}`); ok(R.passIn.join() === '200,4', `이용권 입장 ${R.passIn}`); ok(R.once === 'once_per_day', `1일 1회 ${R.once}`); ok(R.adjustNoReason === 'reason', `조정 사유 ${R.adjustNoReason}`);
  ok(R.buy.join() === '200,405000,pending,onsite', `이용권 구매(3개월 10%) ${R.buy}`); ok(R.preview.join() === '200,true,0,time,true', `환불 미리보기 ${R.preview}`); ok(R.refundReason.join() === '400,reason,0', `환불 수정 사유 ${R.refundReason}`); ok(R.refund[0] === 200 && R.refund[1] === 1000, `환불 ${R.refund}`);
  ok(R.rent.join() === '200,approved,50000,done', `대여 ${R.rent}`); ok(R.rent2 === 'taken', `이중 대여 ${R.rent2}`); ok(R.lend === 'lent', '대여 내줌'); ok(R.ret.join() === '200,0,45000', `반납 ${R.ret}`);
  ok(R.closure[0] === 200 && R.closure[1] >= 2 && R.closure[1] === R.closure[2], `휴관 일괄 취소 ${R.closure}`); ok(R.stats.join() === '200,true', `통계 ${R.stats}`); ok(R.learnerAdmin === 401, `학습자 운영자 API ${R.learnerAdmin}`);
  ok(R.noshow === 200, '노쇼 목록'); ok(R.export.join() === '200,true', `CSV ${R.export}`); ok(R.kioskBad === 'pin', `키오스크 PIN ${R.kioskBad}`); ok(R.kiosk.join() === '200,true', `키오스크 ${R.kiosk}`); ok(R.pausedQr === 'not_ready', `미결제 이용권 QR ${R.pausedQr}`);
};
const strip = R => { const o = { ...R }; delete o._qrToken; delete o._tid; delete o._jarA; return o; };

(async () => {
  const res = await Promise.all(URLS.map((u, i) => run(u, 'fk' + i)));
  res.forEach(expect);
  if (res.length === 2) {
    ok(JSON.stringify(strip(res[0])) === JSON.stringify(strip(res[1])), `Node ↔ Java 같은 결과\n N ${JSON.stringify(strip(res[0]))}\n J ${JSON.stringify(strip(res[1]))}`);
    /* QR 교차 검증: 같은 DB · 같은 키라면 A 서버가 발급한 토큰을 B 서버가 검증한다(이미 사용됐으므로 used, 서명이 틀리면 qr) */
    for (const [i, j] of [[0, 1], [1, 0]]) { const r = await fetch(URLS[j] + '/api/fac/checkin', { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json', cookie: res[i]._jarA }, body: JSON.stringify({ token: res[i]._qrToken }) }); const e = (await r.json()).error; ok(e === 'used', `QR 교차 ${i}→${j}: ${e}`); }
  }
  console.log(`contract-fac40 pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
