'use strict';
/* v38 A-17 쿠폰 /api 대조: Node와 Java에 같은 시나리오(쿠폰 확인 · 결제 금액 검증 · 사용 횟수 · 결제 꺼진 기관)를 돌려 상태코드 · 값을 비교한다.
   사용: . test/env.sh; node test/contract-coupon.js http://127.0.0.1:<node> http://127.0.0.1:<java>  (SIGNUP_CODE=C0DE · PII_DEV_OTP=1) */
const [A, B] = [process.argv[2], process.argv[3]]; let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
async function run(U, tag) {
  const jar = {}; const call = async (who, m, p, b) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: b ? JSON.stringify(b) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { st: r.status, j: await r.json().catch(() => ({})) }; };
  const sfx = `${tag}${Date.now().toString(36)}`; const R = {};
  const su = await call('A', 'POST', '/api/signup', { email: `cpn_${sfx}@example.com`, password: 'Contract2026x', orgName: '쿠폰', type: 'adult', code: 'C0DE' }); const tid = su.j.tenant.tid;
  const doc = pay => ({ org: { name: '쿠폰', type: 'adult', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: false, approve: 'auto' } }, members: [],
    coupons: [{ id: 'k1', code: 'WELCOME10', type: 'rate', v: 10, until: '2099-12-31', max: 0, cls: [] }, { id: 'k2', code: 'ONCE5000', type: 'amount', v: 5000, max: 1, cls: ['c1'] }, { id: 'k3', code: 'OLD', type: 'rate', v: 30, until: '2020-01-01' }],
    lsite: { pub: { org: { name: '쿠폰' }, pages: [], ...(pay === false ? { pay: false } : {}), classes: [{ id: 'c1', name: '엑셀', price: 100000, discount: { on: true, type: 'rate', v: 20, until: '' } }, { id: 'c2', name: 'PPT', price: 50000 }] } } });
  let rev = (await call('A', 'GET', '/api/state')).j.rev || 0; rev = (await call('A', 'PUT', '/api/state', { doc: doc(), rev })).j.rev;
  const P = p => `/api/pub/${tid}/${p}`; const email = `l_${sfx}@example.com`;
  const o = await call('X', 'POST', P('otp'), { email, purpose: 'signup' }); await call('L', 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '쿠폰이', consent: { tos: true, privacy: true }, age14: true });
  R.guest = (await call('G', 'POST', P('coupon'), { code: 'WELCOME10', cls: 'c1' })).st;
  R.ok = (await call('L', 'POST', P('coupon'), { code: ' welcome10 ', cls: 'c1' })).j;
  R.none = (await call('L', 'POST', P('coupon'), { code: 'NOPE', cls: 'c1' })).j; R.old = (await call('L', 'POST', P('coupon'), { code: 'OLD', cls: 'c1' })).j; R.cls = (await call('L', 'POST', P('coupon'), { code: 'ONCE5000', cls: 'c2' })).j;
  const pay = (id, amount, cpn) => call('L', 'POST', P('events'), { type: 'pay', id, data: { payId: id, itemType: 'class', ref: 'c1', amount, cpn } });
  const w = await pay('pay-w1', 1000, 'WELCOME10'); R.wrong = [w.st, w.j.error]; const g = await pay('pay-g1', 72000, 'welcome10'); R.good = g.st;
  const ev = await call('A', 'GET', P('events') + '?after=0'); const e = (ev.j.events || []).find(x => x.id === 'pay-g1') || {}; R.ev = [e.data && e.data.cpn, e.data && e.data.cpnOff, e.data && e.data.cpnOk];
  R.once1 = (await pay('pay-o1', 75000, 'ONCE5000')).st; R.once2 = (await pay('pay-o2', 75000, 'ONCE5000')).st; R.onceCheck = (await call('L', 'POST', P('coupon'), { code: 'ONCE5000', cls: 'c1' })).j.ok;
  R.bad = (await pay('pay-b1', 80000, 'NOPE')).j.error;
  rev = (await call('A', 'PUT', '/api/state', { doc: doc(false), rev })).j.rev; R.payOff = (await call('L', 'POST', P('coupon'), { code: 'WELCOME10', cls: 'c1' })).j.ok;
  return R;
}
(async () => {
  const [a, b] = await Promise.all([run(A, 'n'), run(B, 'j')]);
  for (const R of [a, b]) {
    ok(R.guest === 401, `로그인 전 401 (${R.guest})`); ok(JSON.stringify(R.ok) === JSON.stringify({ ok: true, code: 'WELCOME10', off: 8000, final: 72000, label: '10% 할인' }), `확인 결과 ${JSON.stringify(R.ok)}`);
    ok(R.none.ok === false && !R.none.coupons, '없는 코드'); ok(R.old.ok === false && /기한/.test(R.old.msg || ''), '기한 지남'); ok(R.cls.ok === false, '대상 강좌 아님');
    ok(R.wrong[0] === 400 && R.wrong[1] === 'coupon_amount', `금액 틀림 거절 ${R.wrong}`); ok(R.good === 200, '맞는 금액 통과'); ok(R.ev.join() === 'WELCOME10,8000,true', `서버 확인 표시 ${R.ev}`);
    ok(R.once1 === 200 && R.once2 === 400 && R.onceCheck === false, `사용 횟수 ${R.once1}/${R.once2}/${R.onceCheck}`); ok(R.bad === 'coupon', '없는 쿠폰 결제 거절'); ok(R.payOff === false, '결제 꺼짐');
  }
  ok(JSON.stringify(a) === JSON.stringify(b), `Node ↔ Java 같은 결과\n N ${JSON.stringify(a)}\n J ${JSON.stringify(b)}`);
  console.log(`contract-coupon pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
