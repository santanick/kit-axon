'use strict';
/* v38 A-17 쿠폰 · 할인 코드 — 서버 확인(POST /api/pub/<tid>/coupon)과 결제 이벤트 금액 검증(쿠폰 · 금액이 틀리면 거절) · 사용 횟수 · 결제 꺼진 기관 */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const coupon = require('../server/coupon');

test('쿠폰 계산 규칙(학습자 화면 · Java와 같음)', () => {
  const L = [{ code: 'WELCOME10', type: 'rate', v: 10, until: '2099-12-31', max: 0, cls: [] }, { code: 'OFF5000', type: 'amount', v: 5000, cls: ['c1'], max: 1 }, { code: 'OLD', type: 'rate', v: 50, until: '2020-01-01' }, { code: 'STOP', type: 'rate', v: 20, on: false }];
  assert.deepEqual(coupon.calc(L, ' welcome10 ', 'c1', 99000, 0, '2026-11-11'), { ok: true, code: 'WELCOME10', off: 9900, final: 89100, label: '10% 할인' });
  assert.equal(coupon.calc(L, 'OFF5000', 'c1', 3000, 0, '2026-11-11').final, 0); /* 정액은 결제 금액까지만 */
  assert.equal(coupon.calc(L, 'OFF5000', 'c2', 99000, 0, '2026-11-11').ok, false);
  assert.equal(coupon.calc(L, 'OFF5000', 'c1', 99000, 1, '2026-11-11').ok, false);
  assert.equal(coupon.calc(L, 'OLD', 'c1', 99000, 0, '2026-11-11').msg, '사용 기한이 지난 쿠폰이에요.');
  assert.equal(coupon.calc(L, 'STOP', 'c1', 99000, 0, '2026-11-11').ok, false);
  assert.equal(coupon.calc(L, 'NOPE', 'c1', 99000, 0, '2026-11-11').ok, false);
  assert.equal(coupon.priceOf({ price: 100000, discount: { on: true, type: 'rate', v: 20 } }, '2026-11-11'), 80000);
});

test('운영 서버: 쿠폰 확인 · 결제 금액 검증', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex') }, log: {} }); await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => { const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `cp${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: '쿠폰학원', type: 'adult', code: 'C0DE' })).j.tenant;
  const doc = pay => ({ org: { name: '쿠폰학원', type: 'adult', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: false, approve: 'auto' } }, members: [],
    coupons: [{ id: 'k1', code: 'WELCOME10', type: 'rate', v: 10, until: '2099-12-31', max: 0, cls: [] }, { id: 'k2', code: 'ONCE5000', type: 'amount', v: 5000, max: 1, cls: ['c1'] }],
    lsite: { pub: { org: { name: '쿠폰학원' }, pages: [], ...(pay === false ? { pay: false } : {}), classes: [{ id: 'c1', name: '엑셀 실무', price: 100000, discount: { on: true, type: 'rate', v: 20, until: '' } }, { id: 'c2', name: '파워포인트', price: 50000 }] } } });
  let rev = (await call('A', 'PUT', '/api/state', { doc: doc(), rev: 0 })).j.rev;
  const P = p => `/api/pub/${A.tid}/${p}`;
  const email = `l${sfx}@ex.com`; const o = await call('X', 'POST', P('otp'), { email, purpose: 'signup' });
  const sg = await call('L', 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '쿠폰이', consent: { tos: true, privacy: true }, age14: true });
  assert.equal(sg.status, 200);

  await t.test('로그인 전에는 확인 불가 · 코드 목록은 주지 않음', async () => {
    assert.equal((await call('G', 'POST', P('coupon'), { code: 'WELCOME10', cls: 'c1' })).status, 401);
    const r = await call('L', 'POST', P('coupon'), { code: 'welcome10', cls: 'c1' }); assert.equal(r.status, 200);
    assert.deepEqual(r.j, { ok: true, code: 'WELCOME10', off: 8000, final: 72000, label: '10% 할인' }); /* 100,000 → 할인가 80,000 → 쿠폰 10% */
    const bad = await call('L', 'POST', P('coupon'), { code: 'XXXX', cls: 'c1' }); assert.equal(bad.j.ok, false); assert.equal(bad.j.coupons, undefined);
    assert.equal((await call('L', 'POST', P('coupon'), { code: 'ONCE5000', cls: 'c2' })).j.ok, false);
  });
  await t.test('결제 이벤트: 금액이 다르면 거절 · 맞으면 서버가 확인 표시', async () => {
    const w = await call('L', 'POST', P('events'), { type: 'pay', id: 'pay-x1', data: { payId: 'pay-x1', itemType: 'class', ref: 'c1', amount: 1000, cpn: 'WELCOME10' } });
    assert.equal(w.status, 400); assert.equal(w.j.error, 'coupon_amount');
    const n = await call('L', 'POST', P('events'), { type: 'pay', id: 'pay-x2', data: { payId: 'pay-x2', itemType: 'class', ref: 'c1', amount: 72000, cpn: 'welcome10' } }); assert.equal(n.status, 200);
    const ev = await call('A', 'GET', P('events') + '?after=0'); const e = ev.j.events.find(x => x.id === 'pay-x2'); assert.equal(e.data.cpn, 'WELCOME10'); assert.equal(e.data.cpnOff, 8000); assert.equal(e.data.cpnOk, true);
    assert.equal((await call('L', 'POST', P('events'), { type: 'pay', id: 'pay-x3', data: { payId: 'pay-x3', itemType: 'class', ref: 'c1', amount: 80000, cpn: 'NOPE' } })).j.error, 'coupon');
  });
  await t.test('사용 횟수: 1회 쿠폰은 두 번째에 거절', async () => {
    assert.equal((await call('L', 'POST', P('events'), { type: 'pay', id: 'pay-y1', data: { payId: 'pay-y1', itemType: 'class', ref: 'c1', amount: 75000, cpn: 'ONCE5000' } })).status, 200);
    const r = await call('L', 'POST', P('coupon'), { code: 'ONCE5000', cls: 'c1' }); assert.equal(r.j.ok, false); assert.match(r.j.msg, /사용 횟수/);
    assert.equal((await call('L', 'POST', P('events'), { type: 'pay', id: 'pay-y2', data: { payId: 'pay-y2', itemType: 'class', ref: 'c1', amount: 75000, cpn: 'ONCE5000' } })).status, 400);
  });
  await t.test('결제를 쓰지 않는 기관은 쿠폰 불가', async () => {
    rev = (await call('A', 'PUT', '/api/state', { doc: doc(false), rev })).j.rev;
    const r = await call('L', 'POST', P('coupon'), { code: 'WELCOME10', cls: 'c1' }); assert.equal(r.j.ok, false);
  });
  app.close(); await pool.end();
});
