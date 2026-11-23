'use strict';
/* v47 AI 사용량 · 추가 충전 — 요금표(원가 × 2.5, 부가세 별도) · 월 한도(포함량 + 충전량) · 차단 429 ai_month_quota · 토스 승인(모의) · 정운영자만 충전
   사용: DATABASE_URL=… node --test service/test/aiusage47.test.js (키 · 비밀번호 없음 — 토스 · AI는 모의 서버) */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http');
const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp } = require('../server/app');
const AP = require('../server/aiprice');

test('aiprice 단위: 가격 · 계획 · 상태', () => {
  const p = AP.priceOf(1000000); assert.equal(p.supply, Math.round(AP.COST_KRW_PER_M * 2.5 / 100) * 100); assert.equal(p.vat, Math.round(p.supply * 0.1)); assert.equal(p.total, p.supply + p.vat);
  assert.deepEqual(AP.packs().map(x => x.tokens), [1e6, 5e6, 2e7]); assert.equal(AP.packOf('zz'), null);
  assert.equal(AP.planOf(undefined).on, false); assert.equal(AP.planOf({ monthTokens: 5e6 }).monthTokens, 5e6); assert.equal(AP.planOf({ monthTokens: 777 }).monthTokens, AP.MONTH_DEFAULT);
  assert.equal(AP.planOf({ monthTokens: 1e6, overage: 'block' }).overage, 'block'); assert.equal(AP.planOf({ monthTokens: 1e6 }).overage, 'pack');
  assert.ok(AP.validPlan(null) && AP.validPlan({ monthTokens: 1e6, overage: 'pack' })); assert.ok(!AP.validPlan({ monthTokens: 123 })); assert.ok(!AP.validPlan({ overage: 'x' }));
  const on = AP.planOf({ monthTokens: 1e6 });
  assert.equal(AP.stateOf(on, '2026-11', 790000, 0).state, 'ok'); assert.equal(AP.stateOf(on, '2026-11', 800000, 0).state, 'warn'); assert.equal(AP.stateOf(on, '2026-11', 1e6, 0).state, 'over');
  const s = AP.stateOf(on, '2026-11', 1.2e6, 1e6); assert.equal(s.remaining, 8e5); assert.equal(s.creditLeft, 8e5); assert.equal(s.state, 'ok'); assert.equal(s.pct, 60);
  assert.equal(AP.stateOf(on, '2026-11', 3e5, 1e6).creditLeft, 1e6); assert.equal(AP.stateOf(AP.planOf(null), '2026-11', 9e9, 0).state, 'off');
});

test('월 한도 · 충전 · 차단 · 권한 API', async t => {
  const ai = http.createServer((q, r) => { q.resume(); q.on('end', () => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ model: 'claude-haiku-5-5', content: [{ type: 'text', text: '좋아요' }], usage: { input_tokens: 10, output_tokens: 5 } })); }); });
  const toss = []; let tossFail = false;
  const pg = http.createServer((q, r) => { let b = ''; q.on('data', c => { b += c; }); q.on('end', () => { const j = JSON.parse(b || '{}'); toss.push({ path: q.url, auth: q.headers.authorization, j });
    if (tossFail) { r.writeHead(400, { 'content-type': 'application/json' }); return r.end(JSON.stringify({ code: 'REJECT_CARD_PAYMENT' })); }
    r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ status: 'DONE', totalAmount: j.amount, method: '카드' })); }); });
  await Promise.all([ai, pg].map(s => new Promise(ok => s.listen(0, ok))));
  const pool = poolFrom(process.env); await migrate(pool);
  const base = { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', ANTHROPIC_API_KEY: 'sk-ant-test', ANTHROPIC_URL: `http://127.0.0.1:${ai.address().port}/v1/messages` };
  const app = createApp({ pool, env: { ...base, TOSS_SECRET_KEY: 'test_sk_mock', TOSS_CLIENT_KEY: 'test_ck_mock', TOSS_URL: `http://127.0.0.1:${pg.address().port}` }, log: {} });
  const app0 = createApp({ pool, env: base, log: {} }); /* 토스 키 없음 */
  await Promise.all([app, app0].map(s => new Promise(ok => s.listen(0, ok))));
  t.after(async () => { for (const s of [ai, pg, app, app0]) s.close(); await pool.end(); });
  const jar = {}; const mk = srv => async (who, method, path, body) => {
    const r = await fetch(`http://127.0.0.1:${srv.address().port}` + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const call = mk(app), call0 = mk(app0);
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `au${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'univ', code: 'C0DE' })).j.tenant;
  const pub = { org: { name: '산타대학교' }, pages: [], classes: [] };
  const doc = aiplan => ({ org: { name: 'A', type: 'univ', room: { mode: 'saas' } }, settings: { tutor: { enabled: true, daily: 50 } }, lsite: { pub }, ...(aiplan ? { aiplan } : {}),
    codes: [{ sid: '20260001', dept: '수학', code: 'ABC234' }], members: [{ id: 'm1', sid: '20260001', name: '20260001' }], classes: [] });
  let rev = (await call('A', 'PUT', '/api/state', { doc: doc(null), rev: 0 })).j.rev;
  assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/login`, { sid: '20260001', code: 'abc234' })).status, 200);
  const burn = n => inTenant(pool, A.tid, c => c.query("insert into ai_usage (tenant_id, day, calls, tin, tout) values ($1, (now() at time zone 'Asia/Seoul')::date, 0, $2, 0) on conflict (tenant_id, day) do update set tin = ai_usage.tin + $2", [A.tid, n]));
  const studio = () => call('A', 'POST', '/api/ai/messages', { messages: [{ role: 'user', content: '안녕' }] });

  await t.test('aiplan 없음(기존 기관): 많이 써도 막지 않음 · usage에 month 항목', async () => {
    await burn(50e6);
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '극한이 뭐예요?' })).status, 200);
    assert.equal((await studio()).status, 200);
    const u = (await call('A', 'GET', '/api/ai/usage')).j;
    assert.ok(u.used >= 50e6); assert.equal(u.state, 'off'); assert.equal(u.plan.on, false); for (const k of ['month', 'included', 'credit', 'remaining', 'packs', 'monthFeature']) assert.ok(k in u, k);
    assert.equal(u.payOnline, true); assert.ok(u.monthFeature.tutor.calls >= 1);
    await burn(-50e6 - 0); /* 되돌림 */
  });

  await t.test('포함량 초과 → 429 ai_month_quota(학습자 해요체 · 운영자 안내)', async () => {
    rev = (await call('A', 'PUT', '/api/state', { doc: doc({ monthTokens: 1000000, overage: 'pack' }), rev })).j.rev;
    let u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.plan.on, true); assert.equal(u.included, 1e6); assert.equal(u.state, 'ok');
    await burn(850000); u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.state, 'warn');
    await burn(200000);
    const x = await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '다시 질문' }); assert.equal(x.status, 429); assert.equal(x.j.error, 'ai_month_quota'); assert.equal(x.j.message, '이번 달 AI 사용량을 다 썼어요. 선생님께 질문을 넘겨 주세요');
    const y = await studio(); assert.equal(y.status, 429); assert.equal(y.j.error, 'ai_month_quota'); assert.match(y.j.message, /추가 충전/);
    u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.state, 'over'); assert.equal(u.remaining, 0);
  });

  await t.test('권한: 부운영자는 충전 · 포함량 변경 불가, 잘못된 포함량 400', async () => {
    const st = await call('A', 'POST', '/api/staff', { email: `sub${sfx}@a.kr`, role: 'sub' }); assert.equal(st.status, 200);
    assert.equal((await call('S', 'POST', '/api/login', { email: `sub${sfx}@a.kr`, password: st.j.password, tid: A.tid })).status, 200);
    assert.equal((await call('S', 'POST', '/api/password', { current: st.j.password, next: 'Passw0rd-sub1' })).status, 200);
    const s1 = await call('S', 'POST', '/api/ai/topup', { pack: 'p1m' }); assert.equal(s1.status, 403); assert.equal(s1.j.error, 'role');
    const s2 = await call('S', 'POST', '/api/ai/topup/confirm', { orderId: 'aitop-' + '0'.repeat(24), paymentKey: 'k', amount: 1 }); assert.equal(s2.status, 403);
    const g = await call('S', 'GET', '/api/state'); const sp = await call('S', 'PUT', '/api/state', { doc: { ...g.j.doc, aiplan: { monthTokens: 50000000, overage: 'pack' } }, rev: g.j.rev });
    assert.equal(sp.status, 403, JSON.stringify(sp.j)); assert.equal(sp.j.error, 'aiplan_role');
    const keep = await call('S', 'PUT', '/api/state', { doc: g.j.doc, rev: g.j.rev }); assert.equal(keep.status, 200, JSON.stringify(keep.j)); rev = keep.j.rev; /* 값을 그대로 두면 저장됨 */
    const bad = await call('A', 'PUT', '/api/state', { doc: doc({ monthTokens: 123 }), rev }); assert.equal(bad.status, 400); assert.equal(bad.j.error, 'aiplan');
  });

  await t.test('토스 키 없음: 결제 연결 준비 중', async () => {
    const r = await call0('A', 'POST', '/api/ai/topup', { pack: 'p1m' }); /* 같은 DB · 다른 서버 → 다시 로그인 */
    if (r.status === 401) jar.A0 = null;
    await call0('A0', 'POST', '/api/login', { email: `au${sfx}@a.kr`, password: 'Passw0rd-aaa' });
    const r2 = await call0('A0', 'POST', '/api/ai/topup', { pack: 'p1m' }); assert.equal(r2.status, 503); assert.equal(r2.j.error, 'pay_off'); assert.match(r2.j.message, /결제 연결 준비 중 — 산타에 문의/);
    assert.equal((await call0('A0', 'GET', '/api/ai/usage')).j.payOnline, false);
  });

  await t.test('충전: 주문 → 금액 불일치 409 → 승인 실패 402 → 승인 → 즉시 한도 반영 · 중복 승인 무해', async () => {
    assert.equal((await call('A', 'POST', '/api/ai/topup', { pack: 'nope' })).status, 400);
    const o = (await call('A', 'POST', '/api/ai/topup', { pack: 'p1m' })).j; const P = AP.packOf('p1m');
    assert.equal(o.amount, P.total); assert.equal(o.clientKey, 'test_ck_mock'); assert.match(o.orderId, /^aitop-[0-9a-f]{24}$/);
    assert.equal((await call('A', 'POST', '/api/ai/topup/confirm', { orderId: o.orderId, paymentKey: 'pk1', amount: o.amount - 100 })).status, 409);
    tossFail = true; const f = await call('A', 'POST', '/api/ai/topup/confirm', { orderId: o.orderId, paymentKey: 'pk1', amount: o.amount }); tossFail = false; assert.equal(f.status, 402);
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '아직 막힘' })).status, 429);
    const o2 = (await call('A', 'POST', '/api/ai/topup', { pack: 'p1m' })).j;
    const ok = await call('A', 'POST', '/api/ai/topup/confirm', { orderId: o2.orderId, paymentKey: 'pk2', amount: o2.amount }); assert.equal(ok.status, 200);
    const last = toss[toss.length - 1]; assert.equal(last.path, '/v1/payments/confirm'); assert.deepEqual(last.j, { paymentKey: 'pk2', orderId: o2.orderId, amount: o2.amount }); assert.equal(last.auth, 'Basic ' + Buffer.from('test_sk_mock:').toString('base64'));
    assert.equal(ok.j.credit, 1e6); assert.ok(ok.j.remaining > 0); assert.equal(ok.j.credits.length, 1);
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '이제 질문' })).status, 200);
    const again = await call('A', 'POST', '/api/ai/topup/confirm', { orderId: o2.orderId, paymentKey: 'pk2', amount: o2.amount }); assert.equal(again.j.already, true); assert.equal(again.j.credit, 1e6);
    const n = await inTenant(pool, A.tid, async c => (await c.query("select count(*)::int n from audit_log where tenant_id = $1 and action = 'ai.topup'", [A.tid])).rows[0].n); assert.equal(n, 1);
    const st = await inTenant(pool, A.tid, async c => (await c.query('select status from ai_credit where order_id = $1', [o.orderId])).rows[0].status); assert.equal(st, 'failed');
  });

  await t.test('초과 처리 「차단」이면 충전 주문 409', async () => {
    rev = (await call('A', 'PUT', '/api/state', { doc: doc({ monthTokens: 1000000, overage: 'block' }), rev })).j.rev;
    const r = await call('A', 'POST', '/api/ai/topup', { pack: 'p1m' }); assert.equal(r.status, 409); assert.equal(r.j.error, 'overage_block');
  });
});
