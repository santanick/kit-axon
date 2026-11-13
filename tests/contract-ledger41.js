'use strict';
/* v41.0 통합 수납 원장 /api 계약 시나리오 — Node · Java 공용(09 개발 규격 6절).
   사용(대상 서버는 BASE, 토스 모의 서버는 이 스크립트가 TOSS_MOCK_PORT에 띄운다):
     서버를 TOSS_URL=http://127.0.0.1:<TOSS_MOCK_PORT> SIGNUP_CODE=C0DE PII_DEV_OTP=1 PII_KEY=<hex64> 로 띄운 뒤
     BASE=http://127.0.0.1:9611 TOSS_MOCK_PORT=9619 node tests/contract-ledger41.js
   기관 비밀키는 API(POST /api/ledger/units tossSecret)로 넣으므로 서버에 TOSS_SECRET_KEY는 필요 없다(있어도 됨).
   가입은 IP당 시간 10회 제한이므로 다른 대조 테스트를 돌린 서버는 다시 띄운 뒤 실행한다.
   Node 단위 테스트(service/test/ledger41.test.js)는 이 파일의 run()을 같은 서버 안에서 부른다. 결과는 상태코드 · 오류 코드 · 금액으로만 비교한다. */
const http = require('node:http');
const SK = 'test_sk_ledger41_contract';

/* 토스 모의 서버: 승인 · 취소. Basic 인증이 SK와 다르면 401 */
function tossMock(port) {
  const calls = [];
  const srv = http.createServer((req, res) => { let d = ''; req.on('data', x => { d += x; }); req.on('end', () => {
    const b = d ? JSON.parse(d) : {}; const auth = req.headers.authorization === 'Basic ' + Buffer.from(SK + ':').toString('base64'); calls.push({ path: req.url, body: b, auth, idem: req.headers['idempotency-key'] || '' });
    const send = (st, j) => { res.writeHead(st, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
    if (!auth) return send(401, { code: 'UNAUTHORIZED_KEY' });
    if (req.url === '/v1/payments/confirm') { if (String(b.paymentKey).startsWith('fail')) return send(400, { code: 'REJECT_CARD_COMPANY' }); return send(200, { totalAmount: b.paymentKey === 'pk_short' ? b.amount - 1 : b.amount, status: 'DONE', method: '카드', receipt: { url: 'https://dashboard.tosspayments.com/receipt/' + b.paymentKey } }); }
    const m = /^\/v1\/payments\/([^/]+)\/cancel$/.exec(req.url); if (m) return send(200, { cancels: [{ transactionKey: 'tx_' + calls.length, cancelAmount: b.cancelAmount }] });
    send(404, { code: 'NOT_FOUND' }); }); });
  return new Promise(ok => srv.listen(port, '127.0.0.1', () => ok({ srv, calls, port: srv.address().port })));
}

const kst = (d = 0) => new Date(Date.now() + 9 * 3600e3 + d * 864e5).toISOString().slice(0, 10);
const FAC = () => ({ on: true, facilities: [{ id: 'f_g', name: '골프연습장', kind: 'time', pay: 'onsite', approval: false, audience: ['student', 'public'], verify: 'none', slotMin: 60, minSlots: 1, maxSlots: 2,
  hours: { all: ['00:00', '24:00'] }, open: { daysAhead: 7, at: '00:00' }, capacity: { res: 1, perSlot: 1 }, prices: { student: { slot: 5000 }, public: { slot: 8000 } }, refund: { type: 'full' }, resources: [{ id: 'r1', name: '타석 1', on: true }] }], products: [] });

async function run(U, tag, mock) {
  const R = {}; const jar = {};
  const call = async (who, m, p, b, h) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}), ...(h || {}) }, body: b ? JSON.stringify(b) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; const t = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await r.arrayBuffer()); let j = {}; try { j = JSON.parse(t); } catch { j = { _text: t }; } return { st: r.status, j, ct: r.headers.get('content-type') || '' }; };
  const sfx = `${tag}${Date.now().toString(36)}`;
  const su = await call('A', 'POST', '/api/signup', { email: `led_${sfx}@example.com`, password: 'Contract2026x', orgName: '원장 학원', type: 'adult', code: 'C0DE' }); const tid = su.j.tenant.tid;
  const P = p => `/api/pub/${tid}/${p}`;
  const o = await call('X', 'POST', P('otp'), { email: `l1_${sfx}@example.com`, purpose: 'signup' });
  await call('L1', 'POST', P('signup'), { via: 'email', email: `l1_${sfx}@example.com`, code: o.j.dev_code, nickname: 'L1', consent: { tos: true, privacy: true }, age14: true });
  const me = (await call('L1', 'GET', P('me'))).j; const sid = me.sid || (me.me || {}).sid; R.sid = !!sid;
  const doc = on => ({ org: { name: '원장 학원', type: 'adult', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: false, approve: 'auto' } },
    members: [{ id: 'm1', sid, name: '홍길동' }], classes: [{ id: 'c1', name: '영어 A반', price: 250000, learners: ['m1'] }], ledger: { on }, fac: FAC(), lsite: { pub: { org: { name: '원장 학원' }, pages: [], fac: FAC() } } });
  let rev = (await call('A', 'GET', '/api/state')).j.rev || 0; rev = (await call('A', 'PUT', '/api/state', { doc: doc(false), rev })).j.rev;
  const off = await call('A', 'GET', '/api/ledger/summary'); R.off = [off.st, off.j.error]; R.offPub = (await call('L1', 'GET', P('ledger-my'))).j.error;
  R.siteOff = ((await call('G', 'GET', P('site'))).j.site || {}).ledger;
  rev = (await call('A', 'PUT', '/api/state', { doc: doc(true), rev })).j.rev;

  // 단위 · 토스 키(비밀키는 응답에 없음)
  const u0 = await call('A', 'GET', '/api/ledger/units'); R.units = [u0.st, u0.j.units && u0.j.units[0].id, u0.j.units && u0.j.units[0].hasKey];
  const ub = await call('A', 'POST', '/api/ledger/units', { id: 'lu_branch1', parentId: 'lu_root', kind: 'branch', name: '해운대점', tossSecret: SK, tossClientKey: 'test_ck_x', shareRateBp: 50 });
  R.unit = [ub.st, ub.j.unit && ub.j.unit.hasKey, JSON.stringify(ub.j).includes(SK), ub.j.unit && ub.j.unit.shareRateBp];
  const ud = await call('A', 'POST', '/api/ledger/units', { id: 'lu_dept1', parentId: 'lu_branch1', kind: 'dept', name: '영어부' }); R.unitChild = ud.st;
  R.unitCycle = (await call('A', 'POST', '/api/ledger/units', { id: 'lu_branch1', parentId: 'lu_dept1', name: '해운대점' })).j.error;
  const tr = await call('A', 'GET', '/api/ledger/units'); R.tree = [tr.j.units[0].children.length, tr.j.units[0].children[0].children.length, JSON.stringify(tr.j).includes('enc1:')];

  // 청구(할인 줄) · 멱등
  const C = items => call('A', 'POST', '/api/ledger/charges', { unitId: 'lu_dept1', sid, items, periodYm: kst().slice(0, 7), dueDate: kst(-10), idem: 'ch1' });
  const c1 = await C([{ itemType: 'tuition', title: '11월 수강료', amount: 300000 }, { itemType: 'tuition', title: '형제 할인', amount: -30000 }]);
  R.charge = [c1.st, c1.j.bill && c1.j.bill.total, c1.j.bill && c1.j.bill.lines.length, c1.j.bill && c1.j.bill.lines[0].due, c1.j.bill && c1.j.bill.lines[1].due];
  const c1b = await C([{ itemType: 'tuition', title: '11월 수강료', amount: 300000 }]); R.chargeIdem = [c1b.j.again, c1b.j.bill && c1b.j.bill.id === c1.j.bill.id];
  R.chargeBad = (await call('A', 'POST', '/api/ledger/charges', { unitId: 'lu_dept1', sid, items: [{ title: '할인만', amount: -1000 }] })).j.error;
  R.chargeUnit = (await call('A', 'POST', '/api/ledger/charges', { unitId: 'lu_nope1', sid, items: [{ title: 'x', amount: 1000 }] })).j.error;
  const ch1 = c1.j.bill.lines.map(l => l.id);

  // 현장 수납(Lv0) · 잔액 초과 · 승인번호
  R.over = (await call('A', 'POST', '/api/ledger/receipts', { unitId: 'lu_dept1', sid, method: 'cash', amount: 300000, idem: 'r0' })).j.error;
  R.noAppr = (await call('A', 'POST', '/api/ledger/receipts', { unitId: 'lu_dept1', sid, method: 'desk_card', amount: 1000 })).j.error;
  R.badMethod = (await call('A', 'POST', '/api/ledger/receipts', { unitId: 'lu_dept1', sid, method: 'online_card', amount: 1000 })).j.error;
  const r1 = await call('A', 'POST', '/api/ledger/receipts', { unitId: 'lu_dept1', sid, method: 'cash', amount: 100000, idem: 'r1' });
  R.receipt = [r1.st, r1.j.receipt && r1.j.receipt.amount, r1.j.allocs && r1.j.allocs.length, r1.j.allocs && r1.j.allocs[0].amount, r1.j.receipt && r1.j.receipt.shareEligible];
  R.receiptIdem = (await call('A', 'POST', '/api/ledger/receipts', { unitId: 'lu_dept1', sid, method: 'cash', amount: 100000, idem: 'r1' })).j.receipt.id === r1.j.receipt.id;

  // 학습자: 내 청구 · 온라인 결제(토스 모의)
  const my = await call('L1', 'GET', P('ledger-my')); R.my = [my.st, my.j.balance, (my.j.charges || []).length, my.j.payOnline];
  R.guest = (await call('G', 'GET', P('ledger-my'))).st;
  R.orderMismatch = (await call('L1', 'POST', P('ledger-order'), { chargeIds: ch1, amount: 1 })).j.error;
  const od = await call('L1', 'POST', P('ledger-order'), { chargeIds: ch1, amount: 170000 }); R.order = [od.st, od.j.amount, /^lo_[a-z0-9]{12}$/.test(od.j.orderId || ''), od.j.clientKey, od.j.payOnline];
  R.confirmBad = (await call('L1', 'POST', P('ledger-confirm'), { orderId: od.j.orderId, paymentKey: 'pk_1', amount: 1 })).j.error;
  const cf = await call('L1', 'POST', P('ledger-confirm'), { orderId: od.j.orderId, paymentKey: 'pk_1', amount: 170000 }); R.confirm = [cf.st, cf.j.status, cf.j.receipt && cf.j.receipt.amount];
  const cf2 = await call('L1', 'POST', P('ledger-confirm'), { orderId: od.j.orderId, paymentKey: 'pk_1', amount: 170000 }); R.confirmAgain = [cf2.st, cf2.j.receipt && cf2.j.receipt.id === cf.j.receipt.id];
  R.tossCalls = mock ? mock.calls.filter(x => x.path === '/v1/payments/confirm').length : null;
  const my2 = await call('L1', 'GET', P('ledger-my')); R.my2 = [my2.j.balance, (my2.j.charges || []).map(x => x.status).join(','), (my2.j.receipts || []).length];
  const rx = (my2.j.receipts || []).find(x => x.id === cf.j.receipt.id) || {}, rcash = (my2.j.receipts || []).find(x => x.id === r1.j.receipt.id) || {};
  R.myReceipt = [rx.receiptUrl, (rx.chargeIds || []).join(',') === ch1[0] /* 배분된 줄만(할인 줄은 배분 없음) */, rcash.receiptUrl, (rcash.chargeIds || []).length];
  R.siteFlag = (await call('G', 'GET', P('site'))).j.site.ledger;
  R.paidAgain = (await call('L1', 'POST', P('ledger-order'), { chargeIds: ch1 })).j.error;

  // 환불: 토스 부분 취소(확정은 직원) · 합계 초과 · 사유
  const rf = await call('A', 'POST', '/api/ledger/refunds', { receiptId: cf.j.receipt.id, ruleType: 'hakwon_law', used: 300, total: 1200, idem: 'f1' });
  R.refund = [rf.st, rf.j.refund && rf.j.refund.auto, rf.j.refund && rf.j.refund.status, rf.j.refund && rf.j.refund.lawCheck];
  R.refundPending = (await call('A', 'POST', '/api/ledger/refunds', { receiptId: cf.j.receipt.id, ruleType: 'full' })).j.error;
  R.confirmReason = (await call('A', 'POST', `/api/ledger/refunds/${rf.j.refund.id}/confirm`, { amount: 50000 })).j.error;
  R.confirmOver = (await call('A', 'POST', `/api/ledger/refunds/${rf.j.refund.id}/confirm`, { amount: 170001, editReason: 'x' })).j.error;
  const rc = await call('A', 'POST', `/api/ledger/refunds/${rf.j.refund.id}/confirm`, { amount: 50000, editReason: '상담 후 합의' }); R.refundDone = [rc.st, rc.j.refund && rc.j.refund.status, rc.j.refund && rc.j.refund.amount, rc.j.refund && rc.j.refund.tossCancelOk];
  const cx = mock ? mock.calls.filter(x => /\/cancel$/.test(x.path)) : []; R.tossCancel = mock ? [cx.length, cx[0] && cx[0].body.cancelAmount] : null;
  R.refundTwice = (await call('A', 'POST', `/api/ledger/refunds/${rf.j.refund.id}/confirm`, {})).j.error;
  R.refundOver = (await call('A', 'POST', '/api/ledger/refunds', { receiptId: cf.j.receipt.id, ruleType: 'full' })).j.refund.auto; /* 남은 120000 */

  // 정정(반대 기록)
  const co = await call('A', 'POST', `/api/ledger/receipts/${r1.j.receipt.id}/correct`, { reason: '금액 오입력' }); R.correct = [co.st, co.j.receipt && co.j.receipt.amount, co.j.receipt && co.j.receipt.corrects === r1.j.receipt.id];
  R.correct2 = (await call('A', 'POST', `/api/ledger/receipts/${r1.j.receipt.id}/correct`, { reason: '다시' })).j.error;
  R.correctToss = (await call('A', 'POST', `/api/ledger/receipts/${cf.j.receipt.id}/correct`, { reason: 'x' })).j.error;
  R.balAfterCorrect = (await call('L1', 'GET', P('ledger-my'))).j.balance;

  // 청구서 링크(로그인 없음 · 1회)
  const c2 = await call('A', 'POST', '/api/ledger/charges', { unitId: 'lu_branch1', sid, items: [{ itemType: 'book', title: '교재', amount: 25000 }] });
  const lk = await call('A', 'POST', '/api/ledger/links', { chargeIds: [c2.j.bill.lines[0].id], sid, ttlHours: 1 }); const tok = lk.j.token; R.link = [lk.st, /bill=/.test(lk.j.url || '')];
  const bl = await call('G', 'GET', P(`ledger-bill?t=${tok}`)); R.bill = [bl.st, bl.j.bill && bl.j.bill.who, bl.j.bill && bl.j.bill.total, JSON.stringify(bl.j).includes('홍길동'), JSON.stringify(bl.j).includes(sid)];
  R.billBad = (await call('G', 'GET', P('ledger-bill?t=' + 'x'.repeat(32)))).j.error;
  const bo = await call('G', 'POST', P('ledger-bill-order'), { t: tok, amount: 25000 }); R.billOrder = [bo.st, bo.j.amount];
  const bc = await call('G', 'POST', P('ledger-bill-confirm'), { t: tok, orderId: bo.j.orderId, paymentKey: 'pk_2', amount: 25000 }); R.billConfirm = [bc.st, bc.j.status];
  R.billUsed = (await call('G', 'GET', P(`ledger-bill?t=${tok}`))).j.error;
  R.pgFail = await (async () => { const c3 = await call('A', 'POST', '/api/ledger/charges', { unitId: 'lu_branch1', sid, items: [{ itemType: 'event', title: '행사', amount: 9000 }] });
    const o3 = await call('L1', 'POST', P('ledger-order'), { chargeIds: [c3.j.bill.lines[0].id] }); const f = await call('L1', 'POST', P('ledger-confirm'), { orderId: o3.j.orderId, paymentKey: 'fail_1', amount: 9000 });
    const s = await call('L1', 'POST', P('ledger-confirm'), { orderId: o3.j.orderId, paymentKey: 'pk_x', amount: 9000 }); return [f.st, f.j.error, s.j.error]; })();

  // 월 청구 일괄 생성(같은 원천 · 같은 달 중복 금지)
  const ym = kst(40).slice(0, 7);
  const g1 = await call('A', 'POST', '/api/ledger/charges/generate', { unitId: 'lu_dept1', periodYm: ym, dryRun: true }); R.genDry = [g1.st, g1.j.count, g1.j.total];
  const g2 = await call('A', 'POST', '/api/ledger/charges/generate', { unitId: 'lu_dept1', periodYm: ym, dryRun: false }); R.gen = [g2.st, g2.j.made];
  const g3 = await call('A', 'POST', '/api/ledger/charges/generate', { unitId: 'lu_dept1', periodYm: ym, dryRun: false }); R.genAgain = [g3.j.made, g3.j.skipped];

  // 가상계좌 가져오기(학번 + 금액) → vbank_ext 수납(쉐어 제외), 재실행 안전
  const csv = `입금일,학번,입금액,입금자명\n${kst()},${sid},"250,000",무시됨\n${kst()},${sid},999,무시됨\n`;
  const im = await call('A', 'POST', '/api/ledger/import', { kind: 'vbank', csv, fileName: 'vbank.csv' }); R.import = [im.st, im.j.import && im.j.import.matched, im.j.import && im.j.import.unmatched.length, im.j.import && im.j.import.unmatched[0] && im.j.import.unmatched[0].reason];
  const im2 = await call('A', 'POST', '/api/ledger/import', { kind: 'vbank', csv }); R.importAgain = [im2.j.import && im2.j.import.matched, im2.j.import && im2.j.import.already];
  R.importCols = (await call('A', 'POST', '/api/ledger/import', { kind: 'van', csv: 'a,b\n1,2' })).j.error;
  const ts = await call('A', 'POST', '/api/ledger/import', { kind: 'toss_settle', csv: `정산일,주문번호,결제금액,쉐어\n${kst()},${od.j.orderId},170000,500\n` }); R.tossSettle = [ts.st, ts.j.import && ts.j.import.matched];

  // 시설(v40) 결제 · 환불 이중 기록(legacy_ref)
  const fb = await call('A', 'POST', '/api/fac/bookings', { fac: 'f_g', res: 'r1', day: kst(1), slot: 10, slots: 1, sid, aud: 'student', payMode: 'onsite' });
  const fp = await call('A', 'POST', '/api/fac/payments', { booking: fb.j.booking && fb.j.booking.id, method: 'cash', amount: 5000 });
  const ffr = await call('A', 'POST', '/api/fac/refunds', { payment: fp.j.payment && fp.j.payment.id, amount: 2000, editReason: '현장 합의' });
  const en = await call('A', 'GET', `/api/ledger/entries?from=${kst(-1)}&to=${kst(1)}`); const E = en.j.entries || [];
  const ec = E.filter(x => x.type === 'charge' && x.bill === c1.j.bill.id).sort((x, y) => y.amount - x.amount); R.entryBalance = ec.map(x => x.balance); /* 정정 뒤 c1 잔액 100000, 할인 줄 0 */
  R.facDual = [fp.st, ffr.st, E.filter(x => x.type === 'receipt' && x.legacyRef === 'fac_payment:' + fp.j.payment.id).length, E.filter(x => x.type === 'refund' && x.legacyRef && x.amount === 2000).length];

  // 요약 · 쉐어 · 오늘 할 일 · 마감 · 내보내기
  const sm = await call('A', 'GET', `/api/ledger/summary?from=${kst()}&to=${kst()}`); R.summary = [sm.st, sm.j.paid, sm.j.refund, sm.j.net, sm.j.byMethod && sm.j.byMethod.online_card, sm.j.share && sm.j.share.eligible, sm.j.share && sm.j.share.estimate];
  const sr = await call('A', 'GET', `/api/ledger/summary?from=${kst()}&to=${kst()}&unit=lu_branch1&rollup=1`); R.rollup = [sr.j.paid, sr.j.byUnit && sr.j.byUnit.lu_dept1];
  R.byUnitDetail = (sr.j.byUnitDetail || []).map(x => [x.unitId, x.charged, x.paid, x.refund, x.net, x.unpaid, x.collectRate]);
  const sh = await call('A', 'GET', `/api/ledger/share?ym=${kst().slice(0, 7)}`); R.share = [sh.st, sh.j.eligible, sh.j.estimate, sh.j.actual, sh.j.diff, (sh.j.units || []).map(x => x.unit + ':' + x.rateBp).join(',')];
  const td = await call('A', 'GET', '/api/ledger/today'); R.today = [td.st, td.j.unpaid && td.j.unpaid.people.d8, td.j.refundsPending, td.j.unmatched];
  const cg = await call('A', 'GET', `/api/ledger/close?unitId=lu_dept1&day=${kst()}`); R.closeGet = [cg.st, cg.j.cashSystem, cg.j.cardSystem];
  R.closeReason = (await call('A', 'POST', '/api/ledger/close', { unitId: 'lu_dept1', day: kst(), cashCounted: 1, cardCounted: 0 })).j.error;
  const cl = await call('A', 'POST', '/api/ledger/close', { unitId: 'lu_dept1', day: kst(), cashCounted: cg.j.cashSystem, cardCounted: cg.j.cardSystem }); R.close = [cl.st, cl.j.close && cl.j.close.cashCounted];
  R.close2 = (await call('A', 'POST', '/api/ledger/close', { unitId: 'lu_dept1', day: kst(), cashCounted: 0, cardCounted: 0, diffReason: 'x' })).j.error;
  const ex = await call('A', 'GET', `/api/ledger/export?from=${kst(-1)}&to=${kst(1)}`); R.export = [ex.st, /text\/csv/.test(ex.ct), (ex.j._text || '').charCodeAt(0) === 0xFEFF, (ex.j._text || '').split('\r\n').length > 5];

  // Lv2 단말 에이전트(모의)
  const dv = await call('A', 'POST', '/api/ledger/devices', { unitId: 'lu_dept1', label: '데스크 1', mode: 'mock' }); R.device = [dv.st, !!dv.j.agentKey, dv.j.device && dv.j.device.mode];
  const c4 = await call('A', 'POST', '/api/ledger/charges', { unitId: 'lu_dept1', sid, items: [{ itemType: 'program', title: '특강', amount: 40000 }] });
  const dp = await call('Z', 'POST', '/api/ledger/device-push', { amount: 40000, approvalNo: '30012345', cardIssuer: '신한', chargeIds: [c4.j.bill.lines[0].id], idem: 'd1' }, { 'x-agent-key': dv.j.agentKey });
  R.devicePush = [dp.st, dp.j.receipt && dp.j.receipt.method, dp.j.receipt && dp.j.receipt.approvalNo];
  R.devicePushAgain = (await call('Z', 'POST', '/api/ledger/device-push', { amount: 40000, approvalNo: '30012345', idem: 'd1' }, { 'x-agent-key': dv.j.agentKey })).j.again;
  R.deviceBad = (await call('Z', 'POST', '/api/ledger/device-push', { amount: 1, approvalNo: '1' }, { 'x-agent-key': `${tid}.${'A'.repeat(32)}` })).st;
  R.devices = (await call('A', 'GET', '/api/ledger/devices')).j.devices.length;

  // 기관 격리
  await call('B', 'POST', '/api/signup', { email: `ledb_${sfx}@example.com`, password: 'Contract2026x', orgName: '다른 기관', type: 'adult', code: 'C0DE' });
  await call('B', 'PUT', '/api/state', { doc: { org: { name: '다른 기관', type: 'adult' }, ledger: { on: true } }, rev: 0 });
  R.isolation = [(await call('B', 'POST', '/api/ledger/refunds', { receiptId: cf.j.receipt.id, ruleType: 'full' })).j.error, ((await call('B', 'GET', '/api/ledger/entries')).j.entries || []).length];
  return R;
}

/* 기대값(Node · Java 같은 값). null이면 비교하지 않음 */
const EXPECT = {
  sid: true, off: [403, 'ledger_off'], offPub: 'ledger_off', units: [200, 'lu_root', false], unit: [200, true, false, 50], unitChild: 200, unitCycle: 'cycle', tree: [1, 1, false],
  charge: [200, 270000, 2, 270000, 0], chargeIdem: [true, true], chargeBad: 'amount', chargeUnit: 'unit',
  over: 'over_balance', noAppr: 'approval', badMethod: 'method', receipt: [200, 100000, 1, 100000, false], receiptIdem: true,
  my: [200, 170000, 2, true], guest: 401, orderMismatch: 'amount_mismatch', order: [200, 170000, true, 'test_ck_x', true], confirmBad: 'amount_mismatch', confirm: [200, 'paid', 170000], confirmAgain: [200, true], tossCalls: 1,
  my2: [0, 'paid,paid', 2], myReceipt: ['https://dashboard.tosspayments.com/receipt/pk_1', true, null, 1], siteFlag: { on: true }, siteOff: { on: false }, paidAgain: 'paid',
  refund: [200, 113330, 'pending', true], refundPending: 'pending', confirmReason: 'reason', confirmOver: 'over_refund', refundDone: [200, 'done', 50000, true], tossCancel: [1, 50000], refundTwice: 'state', refundOver: 120000,
  correct: [200, -100000, true], correct2: 'corrected', correctToss: 'use_refund', balAfterCorrect: 100000,
  link: [200, true], bill: [200, '홍○ 학습자님', 25000, false, false], billBad: 'link', billOrder: [200, 25000], billConfirm: [200, 'paid'], billUsed: 'used', pgFail: [502, 'pg', 'expired'],
  genDry: [200, 1, 250000], gen: [200, 1], genAgain: [0, 1],
  import: [200, 1, 1, 'amount'], importAgain: [0, 1], importCols: 'columns', tossSettle: [200, 1],
  entryBalance: [100000, 0], facDual: [200, 200, 1, 1],
  summary: [200, 450000, 52000, 398000, 195000, 145000, 605], rollup: [445000, 370000], byUnitDetail: [["lu_branch1", 34000, 25000, 0, 25000, 9000, 73.5], ["lu_dept1", 520000, 420000, 50000, 370000, 100000, 80.7]],
  share: [200, 145000, 605, 500, -105, 'lu_branch1:50,lu_dept1:40'], today: [200, 1, 1, null], closeGet: [200, 0, 0], closeReason: 'reason', close: [200, 0], close2: 'closed', export: [200, true, true, true],
  device: [200, true, 'mock'], devicePush: [200, 'desk_card', '30012345'], devicePushAgain: true, deviceBad: 401, devices: 1,
  isolation: ['receipt', 0]
};
function check(R) { const bad = []; for (const k of Object.keys(EXPECT)) { if (EXPECT[k] === null) continue; const e = JSON.stringify(EXPECT[k]); const g = JSON.stringify(Array.isArray(EXPECT[k]) && Array.isArray(R[k]) ? R[k].map((v, i) => EXPECT[k][i] === null ? null : v) : R[k]); if (e !== g) bad.push(`${k}: 기대 ${e} · 실제 ${g}`); } return bad; }

module.exports = { run, check, tossMock, EXPECT, SK };
if (require.main === module) (async () => {
  const BASE = process.env.BASE || process.argv[2]; if (!BASE) { console.error('BASE=http://127.0.0.1:<port> 를 지정해 주세요.'); process.exit(2); }
  const mock = await tossMock(+(process.env.TOSS_MOCK_PORT || 9619));
  try { const R = await run(BASE.replace(/\/$/, ''), 'c', mock); if (process.env.DBG) console.log(JSON.stringify(R, null, 1)); const bad = check(R); const n = Object.keys(EXPECT).filter(k => EXPECT[k] !== null).length;
    if (bad.length) { bad.forEach(b => console.error('✗', b)); console.log(`실패 ${bad.length} / ${n}`); process.exitCode = 1; } else console.log(`✓ 원장 계약 ${n}항목 통과 (${BASE})`); }
  catch (e) { console.error(e); process.exitCode = 1; } finally { mock.srv.close(); }
})();
