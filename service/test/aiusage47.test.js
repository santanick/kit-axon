'use strict';
/* v47 AI 사용량 · 추가 충전 — 고정가(100만 토큰 2만 원) · 할인 구간 · 10만 원 단위 · 충전량 1년 이월 · 월 한도 · 차단 429 ai_month_quota · 토스 승인(모의) · 정운영자만 충전 · 산타 관리자 요금제
   사용: DATABASE_URL=… node --test service/test/aiusage47.test.js (키 · 비밀번호 없음 — 토스 · AI는 모의 서버) */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http');
const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp } = require('../server/app');
const AP = require('../server/aiprice');

test('aiprice 단위: 고정가 · 할인 경계값 · 10만 원 단위 · 요금제 보존 · 산타 입력', () => {
  assert.equal(AP.PRICE_PER_M, 20000); assert.deepEqual(AP.priceInfo().discounts.map(x => x[1]), [0, 5, 10, 15, 20, 25, 30]); assert.equal(AP.priceInfo().perMVat, 22000);
  /* 할인 경계값: 구간 시작은 그 할인, 바로 아래(10만 원 적게)는 이전 할인 */
  const cases = [[100000, 0], [400000, 0], [500000, 5], [900000, 5], [1000000, 10], [2900000, 10], [3000000, 15], [4900000, 15], [5000000, 20], [9900000, 20], [10000000, 25], [19900000, 25], [20000000, 30], [100000000, 30]];
  for (const [w, d] of cases) { const q = AP.quote(w); assert.equal(q.discount, d, String(w)); assert.equal(q.tokens, Math.floor(w * 5000 / (100 - d)), String(w)); assert.equal(q.vat, w / 10); assert.equal(q.total, w + w / 10); }
  assert.equal(AP.quote(100000).tokens, 5000000); assert.equal(AP.quote(1000000).tokens, 55555555); assert.equal(AP.quote(20000000).tokens, 1428571428); assert.equal(AP.quote(20000000).unit, 14000);
  /* 10만 원 단위 · 범위 */
  for (const bad of [0, 50000, 150000, 100001, 100000.5, -100000, 100100000, NaN, null, 'abc']) assert.equal(AP.quote(bad), null, String(bad));
  assert.equal(AP.quote('300000').won, 300000); assert.equal(AP.packId(300000), 'w3'); assert.equal(AP.packId(100000000), 'w1000');
  /* 계획 · 상태 */
  assert.equal(AP.planOf(undefined).on, false); assert.equal(AP.planOf({ monthTokens: 7777777 }).monthTokens, 7777777); assert.equal(AP.planOf({ monthTokens: 1.5 }).on, false);
  assert.equal(AP.planOf({ monthTokens: 1e6, overage: 'block' }).overage, 'block'); assert.equal(AP.planOf({ monthTokens: 1e6 }).overage, 'pack');
  assert.ok(AP.validPlan(null) && AP.validPlan({ monthTokens: 1234567, overage: 'pack' })); assert.ok(!AP.validPlan({ monthTokens: -1 })); assert.ok(!AP.validPlan({ overage: 'x' })); assert.ok(!AP.validPlan([1]));
  const on = AP.planOf({ monthTokens: 1e6 });
  assert.equal(AP.stateOf(on, '2026-11', 790000, 0).state, 'ok'); assert.equal(AP.stateOf(on, '2026-11', 800000, 0).state, 'warn'); assert.equal(AP.stateOf(on, '2026-11', 1e6, 0).state, 'over');
  const s = AP.stateOf(on, '2026-11', 1.2e6, 1e6); assert.equal(s.remaining, 8e5); assert.equal(s.creditLeft, 8e5); assert.equal(s.pct, 60);
  /* 요금제 보존: 저장값이 원천 · 체험 기본값만 새로 켬 · overage는 받음 */
  const E1 = { code: 'E1', tier: 'Enterprise', contract: 'sub', aiMonthTokens: 3e7, since: '2026-11-01' };
  const kept = AP.keepPlan({ org: {}, aiplan: { monthTokens: 9e9, overage: 'block' }, plan: { code: 'TRIAL' } }, { aiplan: { monthTokens: 3e7, overage: 'pack' }, plan: E1 }, '2026-11-24');
  assert.deepEqual(kept.aiplan, { monthTokens: 3e7, overage: 'block' }); assert.deepEqual(kept.plan, E1);
  assert.equal(AP.keepPlan({ org: {}, aiplan: { monthTokens: 5e6 } }, null, '2026-11-24').aiplan, undefined); /* 체험 기본값이 아니면 버림 */
  const tr = AP.keepPlan({ org: {}, aiplan: { monthTokens: AP.TRIAL_TOKENS, overage: 'pack' } }, { aiplan: null, plan: null }, '2026-11-24'); assert.equal(tr.aiplan.monthTokens, AP.TRIAL_TOKENS); assert.equal(tr.plan.code, 'TRIAL');
  assert.equal(AP.keepPlan({ org: {} }, { aiplan: { monthTokens: 3e7 }, plan: E1 }, '2026-11-24').aiplan.monthTokens, 3e7); /* 기관이 aiplan을 지워도 남음 */
  /* 산타 입력 */
  assert.equal(AP.santaInput({ code: 'e1', aiMonthTokens: 1e6 }, '2026-11-24').plan.code, 'E1'); assert.equal(AP.santaInput({ code: 'U0', aiMonthTokens: 0 }, '2026-11-24').plan.since, '2026-11-24');
  assert.equal(AP.santaInput({ code: 'XX', aiMonthTokens: 1 }, 'd').code, 'plan_code'); assert.equal(AP.santaInput({ code: 'G4', aiMonthTokens: -5 }, 'd').code, 'plan_tokens'); assert.equal(AP.santaInput({ code: 'G4', aiMonthTokens: 1.5 }, 'd').code, 'plan_tokens');
  assert.deepEqual([...AP.santaSet({ SANTA_ADMIN_EMAILS: ' A@x.kr, b@y.kr ,' })], ['a@x.kr', 'b@y.kr']); assert.deepEqual([...AP.santaSet({})], ['nick@didisam.com']); assert.equal(AP.santaSet({ SANTA_ADMIN_EMAILS: '' }).size, 0); /* 기본 산타 관리자(대표님 지정) · 빈 값이면 없음 */
});


test('충전량 1년 이월: 포함량 먼저 · 오래된 충전부터 · 만료 전날 · 당일 · 다음 날', () => {
  assert.equal(AP.addDays('2026-11-24', 365), '2027-11-24'); assert.equal(AP.addDays('2027-03-01', 365), '2028-02-29');
  const C = [{ id: 'a', tokens: 1000, day: '2026-01-10' }, { id: 'b', tokens: 1000, day: '2026-02-05' }];
  /* 1월: 포함 500, 1,200 사용 → 넘친 700은 a에서. 2월: 900 사용 → 넘친 400은 a(남은 300) → b(100) */
  const U = [{ day: '2026-01-05', n: 400 }, { day: '2026-01-20', n: 800 }, { day: '2026-02-10', n: 900 }];
  let r = AP.simCredits(C, U, 500, '2026-02-20'); assert.deepEqual(r.list.map(x => x.left), [0, 900]); assert.equal(r.thisMonth, 400); assert.equal(r.left, 900); assert.equal(r.credit, 1300);
  /* 월 포함량 안에서 쓴 달은 충전량이 그대로 다음 달로 */
  r = AP.simCredits([{ id: 'x', tokens: 5000, day: '2026-03-01' }], [{ day: '2026-03-02', n: 400 }, { day: '2026-04-02', n: 450 }], 500, '2026-05-01'); assert.equal(r.left, 5000); assert.equal(r.thisMonth, 0);
  /* 충전 전 날짜의 초과는 그 충전에서 빼지 않음 */
  r = AP.simCredits([{ id: 'y', tokens: 1000, day: '2026-06-15' }], [{ day: '2026-06-01', n: 800 }, { day: '2026-06-16', n: 100 }], 500, '2026-06-20'); assert.equal(r.left, 900);
  /* 만료 경계(충전 2026-11-24 → 만료일 2027-11-24, 이 날까지 사용) */
  const K = [{ id: 'k', tokens: 1000, day: '2026-11-24' }];
  const at = (today, n) => AP.simCredits(K, n ? [{ day: today, n }] : [], 0, today);
  assert.equal(at('2027-11-23', 0).left, 1000, '만료 전날 사용 가능'); assert.equal(at('2027-11-24', 0).left, 1000, '만료일 당일 사용 가능'); assert.equal(at('2027-11-25', 0).left, 0, '다음 날 소멸');
  assert.equal(at('2027-11-24', 300).left, 700, '만료일 당일 차감'); assert.equal(at('2027-11-25', 300).credit, 0, '다음 날 쓴 양은 충전에서 빠지지 않음');
  assert.equal(at('2027-11-24', 0).live[0].expires, '2027-11-24');
  /* 만료일이 빠른 것부터: 한 해 전 충전이 먼저 */
  r = AP.simCredits([{ id: 'n', tokens: 100, day: '2027-11-01' }, { id: 'o', tokens: 100, day: '2026-12-01' }], [{ day: '2027-11-10', n: 150 }], 0, '2027-11-10'); assert.deepEqual(r.list.map(x => [x.id, x.left]), [['o', 0], ['n', 50]]);
  /* 상태: 이달 credit = 이달 차감 + 남은 양 → 포함량 · 충전 합 한도 */
  const st = AP.stateOf(AP.planOf({ monthTokens: 500 }), '2026-02', 900, 1300); assert.equal(st.remaining, 900); assert.equal(st.creditLeft, 900);
});

test('월 한도 · 충전 · 차단 · 권한 · 산타 관리 API', async t => {
  const ai = http.createServer((q, r) => { q.resume(); q.on('end', () => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ model: 'claude-haiku-5-5', content: [{ type: 'text', text: '좋아요' }], usage: { input_tokens: 10, output_tokens: 5 } })); }); });
  const toss = []; let tossFail = false;
  const pg = http.createServer((q, r) => { let b = ''; q.on('data', c => { b += c; }); q.on('end', () => { const j = JSON.parse(b || '{}'); toss.push({ path: q.url, auth: q.headers.authorization, j });
    if (tossFail) { r.writeHead(400, { 'content-type': 'application/json' }); return r.end(JSON.stringify({ code: 'REJECT_CARD_PAYMENT' })); }
    r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ status: 'DONE', totalAmount: j.amount, method: '카드' })); }); });
  await Promise.all([ai, pg].map(s => new Promise(ok => s.listen(0, ok))));
  const pool = poolFrom(process.env); await migrate(pool);
  const sfx = Date.now().toString(36); const santaMail = `santa${sfx}@santa.kr`;
  const base = { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', ANTHROPIC_API_KEY: 'sk-ant-test', ANTHROPIC_URL: `http://127.0.0.1:${ai.address().port}/v1/messages`, SANTA_ADMIN_EMAILS: `other@x.kr, ${santaMail.toUpperCase()}` };
  const app = createApp({ pool, env: { ...base, TOSS_SECRET_KEY: 'test_sk_mock', TOSS_CLIENT_KEY: 'test_ck_mock', TOSS_URL: `http://127.0.0.1:${pg.address().port}` }, log: process.env.DBG ? console : {} });
  const app0 = createApp({ pool, env: base, log: {} }); /* 토스 키 없음 */
  await Promise.all([app, app0].map(s => new Promise(ok => s.listen(0, ok))));
  t.after(async () => { for (const s of [ai, pg, app, app0]) s.close(); await pool.end(); });
  const jar = {}; const mk = srv => async (who, method, path, body) => {
    const r = await fetch(`http://127.0.0.1:${srv.address().port}` + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const call = mk(app), call0 = mk(app0);
  const A = (await call('A', 'POST', '/api/signup', { email: `au${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: `사용량대학${sfx}`, type: 'univ', code: 'C0DE' })).j.tenant;
  const Z = (await call('Z', 'POST', '/api/signup', { email: santaMail, password: 'Passw0rd-zzz', orgName: '산타', type: 'corp', code: 'C0DE' })).j.tenant;
  const pub = { org: { name: '산타대학교' }, pages: [], classes: [] };
  const doc = (aiplan, extra) => ({ org: { name: 'A', type: 'univ', room: { mode: 'saas' } }, settings: { tutor: { enabled: true, daily: 50 } }, lsite: { pub }, ...(aiplan ? { aiplan } : {}), ...(extra || {}),
    codes: [{ sid: '20260001', dept: '수학', code: 'ABC234' }], members: [{ id: 'm1', sid: '20260001', name: '20260001' }], classes: [] });
  let rev = (await call('A', 'PUT', '/api/state', { doc: doc(null), rev: 0 })).j.rev;
  assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/login`, { sid: '20260001', code: 'abc234' })).status, 200);
  const burn = n => inTenant(pool, A.tid, c => c.query("insert into ai_usage (tenant_id, day, calls, tin, tout) values ($1, (now() at time zone 'Asia/Seoul')::date, 0, $2, 0) on conflict (tenant_id, day) do update set tin = ai_usage.tin + $2", [A.tid, n]));
  const studio = () => call('A', 'POST', '/api/ai/messages', { messages: [{ role: 'user', content: '안녕' }] });
  const santaPut = (who, tid, b) => call(who, 'PUT', `/api/santa/orgs/${tid}/plan`, b);

  await t.test('aiplan 없음(기존 기관): 많이 써도 막지 않음 · usage에 month · price 항목', async () => {
    await burn(50e6);
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '극한이 뭐예요?' })).status, 200);
    assert.equal((await studio()).status, 200);
    const u = (await call('A', 'GET', '/api/ai/usage')).j;
    if (process.env.DBG) console.log('DBG', JSON.stringify(u).slice(0,400));
    assert.ok(u.used >= 50e6); assert.equal(u.state, 'off'); assert.equal(u.plan.on, false); for (const k of ['month', 'included', 'credit', 'remaining', 'price', 'monthFeature', 'contractPlan']) assert.ok(k in u, k);
    assert.equal(u.price.perM, 20000); assert.equal(u.price.step, 100000); assert.equal(u.contractPlan, null); assert.ok(!('packs' in u));
    assert.equal(u.payOnline, true); assert.ok(u.monthFeature.tutor.calls >= 1);
    await burn(-50e6);
  });

  await t.test('산타 권한: 환경변수 계정만 · 기관 정운영자 403', async () => {
    assert.equal((await call('Z', 'GET', '/api/me')).j.user.santa, true); assert.equal((await call('A', 'GET', '/api/me')).j.user.santa, undefined);
    const x = await call('A', 'GET', '/api/santa/orgs?q=a'); assert.equal(x.status, 403); assert.equal(x.j.error, 'santa');
    const y = await santaPut('A', A.tid, { code: 'E1', aiMonthTokens: 9e9 }); assert.equal(y.status, 403); assert.equal(y.j.error, 'santa');
    assert.equal((await call('X', 'GET', '/api/santa/orgs')).status, 401);
    const off = await call0('Z0', 'POST', '/api/login', { email: santaMail, password: 'Passw0rd-zzz' }); assert.equal(off.status, 200);
    assert.equal((await call0('Z0', 'GET', '/api/santa/orgs')).status, 200); /* 같은 env */
    const f = (await call('Z', 'GET', `/api/santa/orgs?q=${encodeURIComponent('사용량대학' + sfx)}`)).j; assert.equal(f.orgs.length, 1); assert.equal(f.orgs[0].tid, A.tid); assert.equal(f.orgs[0].plan, null);
    assert.equal((await call('Z', 'GET', `/api/santa/orgs?q=${A.tid}`)).j.orgs[0].tid, A.tid);
    assert.equal((await santaPut('Z', A.tid, { code: 'Q', aiMonthTokens: 1e6 })).j.error, 'plan_code'); assert.equal((await santaPut('Z', A.tid, { code: 'E1', aiMonthTokens: -1 })).j.error, 'plan_tokens');
    assert.equal((await santaPut('Z', 'tn_zzzzzzzzzz', { code: 'E1', aiMonthTokens: 1e6 })).status, 404);
  });

  await t.test('산타가 포함량 넣음 → 초과 시 429 ai_month_quota(학습자 해요체 · 운영자 안내) · 감사 · 이력', async () => {
    const r = await santaPut('Z', A.tid, { code: 'e1', tier: 'Enterprise', contract: 'sub', aiMonthTokens: 1000000, memo: '1차 계약 — 월 100만' }); assert.equal(r.status, 200, JSON.stringify(r.j));
    let u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.plan.on, true); assert.equal(u.included, 1e6); assert.equal(u.state, 'ok'); assert.equal(u.contractPlan.code, 'E1'); assert.equal(u.contractPlan.aiMonthTokens, 1e6);
    const au = await inTenant(pool, A.tid, async c => (await c.query("select actor, detail from audit_log where tenant_id = $1 and action = 'santa.plan'", [A.tid])).rows); assert.equal(au.length, 1); assert.equal(au[0].actor, santaMail); assert.ok(!('memo' in au[0].detail));
    const f = (await call('Z', 'GET', `/api/santa/orgs?q=${A.tid}`)).j.orgs[0]; assert.equal(f.memo, '1차 계약 — 월 100만'); assert.equal(f.log.length, 1); assert.equal(f.log[0].after.code, 'E1'); assert.equal(f.log[0].before, null); assert.equal(f.plan.code, 'E1');
    await burn(850000); u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.state, 'warn');
    await burn(200000);
    const x = await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '다시 질문' }); assert.equal(x.status, 429); assert.equal(x.j.error, 'ai_month_quota'); assert.equal(x.j.message, '이번 달 AI 사용량을 다 썼어요. 선생님께 질문을 넘겨 주세요');
    const y = await studio(); assert.equal(y.status, 429); assert.equal(y.j.error, 'ai_month_quota'); assert.match(y.j.message, /추가 충전/);
    u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.state, 'over'); assert.equal(u.remaining, 0);
  });

  await t.test('정운영자 포함량 · 요금제 변경 거부(저장값 유지) · 초과 처리만 변경 · 부운영자 403', async () => {
    const g = await call('A', 'GET', '/api/state'); rev = g.j.rev;
    const p = await call('A', 'PUT', '/api/state', { doc: { ...g.j.doc, aiplan: { monthTokens: 50000000, overage: 'pack' }, plan: { code: 'U0', aiMonthTokens: 5e7 } }, rev }); assert.equal(p.status, 200, JSON.stringify(p.j)); rev = p.j.rev;
    let u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.included, 1e6); assert.equal(u.contractPlan.code, 'E1');
    const del = await call('A', 'PUT', '/api/state', { doc: doc(null), rev }); assert.equal(del.status, 200); rev = del.j.rev; /* 지워도 남음 */
    u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.plan.on, true); assert.equal(u.included, 1e6);
    const st = await call('A', 'POST', '/api/staff', { email: `sub${sfx}@a.kr`, role: 'sub' }); assert.equal(st.status, 200);
    assert.equal((await call('S', 'POST', '/api/login', { email: `sub${sfx}@a.kr`, password: st.j.password, tid: A.tid })).status, 200);
    assert.equal((await call('S', 'POST', '/api/password', { current: st.j.password, next: 'Passw0rd-sub1' })).status, 200);
    const s1 = await call('S', 'POST', '/api/ai/topup', { won: 100000 }); assert.equal(s1.status, 403); assert.equal(s1.j.error, 'role');
    const s2 = await call('S', 'POST', '/api/ai/topup/confirm', { orderId: 'aitop-' + '0'.repeat(24), paymentKey: 'k', amount: 1 }); assert.equal(s2.status, 403);
    const g2 = await call('S', 'GET', '/api/state'); const sp = await call('S', 'PUT', '/api/state', { doc: { ...g2.j.doc, aiplan: { ...g2.j.doc.aiplan, overage: 'block' } }, rev: g2.j.rev });
    assert.equal(sp.status, 403, JSON.stringify(sp.j)); assert.equal(sp.j.error, 'aiplan_role');
    const keep = await call('S', 'PUT', '/api/state', { doc: g2.j.doc, rev: g2.j.rev }); assert.equal(keep.status, 200, JSON.stringify(keep.j)); rev = keep.j.rev;
    const bad = await call('A', 'PUT', '/api/state', { doc: doc({ monthTokens: -3 }), rev }); assert.equal(bad.status, 400); assert.equal(bad.j.error, 'aiplan');
  });

  await t.test('새 기관 체험 기본값만 받음(TRIAL)', async () => {
    assert.equal((await call('Z', 'PUT', '/api/state', { doc: { org: { name: '산타', type: 'corp', room: {} }, aiplan: { monthTokens: AP.TRIAL_TOKENS, overage: 'pack' } }, rev: 0 })).status, 200);
    const u = (await call('Z', 'GET', '/api/ai/usage')).j; assert.equal(u.included, AP.TRIAL_TOKENS); assert.equal(u.contractPlan.code, 'TRIAL');
  });

  await t.test('토스 키 없음: 결제 연결 준비 중', async () => {
    await call0('A0', 'POST', '/api/login', { email: `au${sfx}@a.kr`, password: 'Passw0rd-aaa' });
    const r2 = await call0('A0', 'POST', '/api/ai/topup', { won: 100000 }); assert.equal(r2.status, 503); assert.equal(r2.j.error, 'pay_off'); assert.match(r2.j.message, /결제 연결 준비 중 — 산타에 문의/);
    assert.equal((await call0('A0', 'GET', '/api/ai/usage')).j.payOnline, false);
  });

  await t.test('충전(금액 선택): 10만 원 단위 검증 → 금액 불일치 409 → 승인 실패 402 → 승인 → 만료일 · 남은 양 · 중복 승인 무해', async () => {
    for (const w of [150000, 50000, 0, 'x', 100100000]) { const b = await call('A', 'POST', '/api/ai/topup', { won: w }); assert.equal(b.status, 400, String(w)); assert.equal(b.j.error, 'won'); }
    const o = (await call('A', 'POST', '/api/ai/topup', { won: 100000 })).j;
    assert.equal(o.amount, 110000); assert.equal(o.supply, 100000); assert.equal(o.vat, 10000); assert.equal(o.tokens, 5e6); assert.equal(o.discount, 0); assert.equal(o.clientKey, 'test_ck_mock'); assert.match(o.orderId, /^aitop-[0-9a-f]{24}$/);
    const big = (await call('A', 'POST', '/api/ai/topup', { won: 3000000 })).j; assert.equal(big.discount, 15); assert.equal(big.tokens, AP.quote(3000000).tokens); assert.equal(big.amount, 3300000);
    assert.equal((await call('A', 'POST', '/api/ai/topup/confirm', { orderId: o.orderId, paymentKey: 'pk1', amount: o.amount - 100 })).status, 409);
    tossFail = true; const f = await call('A', 'POST', '/api/ai/topup/confirm', { orderId: o.orderId, paymentKey: 'pk1', amount: o.amount }); tossFail = false; assert.equal(f.status, 402);
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '아직 막힘' })).status, 429);
    const o2 = (await call('A', 'POST', '/api/ai/topup', { won: 100000 })).j;
    const ok = await call('A', 'POST', '/api/ai/topup/confirm', { orderId: o2.orderId, paymentKey: 'pk2', amount: o2.amount }); assert.equal(ok.status, 200, JSON.stringify(ok.j));
    const last = toss[toss.length - 1]; assert.equal(last.path, '/v1/payments/confirm'); assert.deepEqual(last.j, { paymentKey: 'pk2', orderId: o2.orderId, amount: 110000 }); assert.equal(last.auth, 'Basic ' + Buffer.from('test_sk_mock:').toString('base64'));
    const used = ok.j.used; const over = used - 1e6; /* 이달 이미 포함량을 넘은 양은 이 충전에서 빠진다(오늘 충전 → 오늘 사용분) */
    assert.equal(ok.j.credits.length, 1); const c0 = ok.j.credits[0]; assert.equal(c0.tokens, 5e6); assert.equal(c0.left, 5e6 - over); assert.equal(c0.expires, AP.addDays(c0.day, 365)); assert.equal(ok.j.creditLeft, 5e6 - over); assert.equal(ok.j.credit, 5e6);
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '이제 질문' })).status, 200);
    const again = await call('A', 'POST', '/api/ai/topup/confirm', { orderId: o2.orderId, paymentKey: 'pk2', amount: o2.amount }); assert.equal(again.j.already, true); assert.equal(again.j.credit, 5e6);
    const n = await inTenant(pool, A.tid, async c => (await c.query("select count(*)::int n from audit_log where tenant_id = $1 and action = 'ai.topup'", [A.tid])).rows[0].n); assert.equal(n, 1);
    const st = await inTenant(pool, A.tid, async c => (await c.query('select status from ai_credit where order_id = $1', [o.orderId])).rows[0].status); assert.equal(st, 'failed');
    /* 지난달 충전도 이어서 씀 · 만료된 충전은 빠짐 */
    const ins = (id, days, tokens) => inTenant(pool, A.tid, c => c.query("insert into ai_credit (id, tenant_id, month, pack, tokens, amount, order_id, status, paid_at, expires_at) values ($1, $2, to_char(now() - make_interval(days => $3), 'YYYY-MM'), 'w1', $4, 110000, $5, 'paid', now() - make_interval(days => $3), ((now() - make_interval(days => $3)) at time zone 'Asia/Seoul')::date + 365)", [id + sfx, A.tid, days, tokens, 'aitop-' + id + sfx]));
    await ins('ac_old', 200, 1000); await ins('ac_exp', 400, 7000);
    const u = (await call('A', 'GET', '/api/ai/usage')).j; assert.equal(u.credits.length, 2); assert.equal(u.credits[0].tokens, 1000); assert.equal(u.credits[0].left, 0, '오래된 충전부터 차감');
    assert.equal(u.creditLeft, 5e6 + 1000 - (u.used - 1e6));
  });

  await t.test('초과 처리 「차단」이면 충전 주문 409', async () => {
    const g = await call('A', 'GET', '/api/state'); rev = (await call('A', 'PUT', '/api/state', { doc: { ...g.j.doc, aiplan: { ...g.j.doc.aiplan, overage: 'block' } }, rev: g.j.rev })).j.rev;
    const r = await call('A', 'POST', '/api/ai/topup', { won: 100000 }); assert.equal(r.status, 409); assert.equal(r.j.error, 'overage_block');
  });
});
