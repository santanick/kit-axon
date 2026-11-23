'use strict';
/* v47 요금제 기능 묶음 — 단계 판정(코드 · tier · TRIAL 14일) · 게이트웨이 403 plan_feature(정책 off · plan 없는 기관 영향 없음) · 공개 데이터에 plan 없음
   사용: node --test service/test/plan47.test.js (DATABASE_URL이 있으면 API 시험까지) */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http');
const PF = require('../server/planfeat');

test('planfeat 단위: 코드 → 단계 · TRIAL · 판정', () => {
  for (const c of ['E1', 'A1', 'U0', 'G1']) assert.equal(PF.tierOf({ code: c }, '2026-11-24').tier, 'standard', c);
  for (const c of ['E2', 'A2', 'U1', 'U2', 'G2']) assert.equal(PF.tierOf({ code: c }, '2026-11-24').tier, 'pro', c);
  for (const c of ['E3', 'E4', 'A3', 'A4', 'U3', 'U4', 'G3', 'G4']) assert.equal(PF.tierOf({ code: c }, '2026-11-24').tier, 'enterprise', c);
  assert.equal(PF.tierOf(null, '2026-11-24'), null); assert.equal(PF.tierOf({ code: 'ZZ9' }, '2026-11-24').tier, 'enterprise'); /* 모르는 코드는 잠그지 않음 */
  assert.equal(PF.tierOf({ code: 'E1', tier: 'pro' }, '2026-11-24').tier, 'pro'); /* 산타가 tier를 직접 조정 */
  assert.equal(PF.tierOf({ code: 'TRIAL', since: '2026-11-11' }, '2026-11-24').tier, 'pro'); /* 13일째 */
  const ex = PF.tierOf({ code: 'TRIAL', since: '2026-11-10' }, '2026-11-24'); assert.equal(ex.tier, 'standard'); assert.equal(ex.expired, true);
  const on = { on: true }, off = { on: false };
  assert.equal(PF.check({ code: 'E1' }, off, { lvl: 'L3', feature: 'grade' }, '2026-11-24'), null, '정책 off 영향 없음');
  assert.equal(PF.check(null, on, { lvl: 'L3', feature: 'grade' }, '2026-11-24'), null, 'plan 없음 영향 없음');
  assert.equal(PF.check({ code: 'E1' }, on, { lvl: 'L1', feature: 'tutor' }, '2026-11-24'), null);
  assert.equal(PF.check({ code: 'E1' }, on, { lvl: 'L2' }, '2026-11-24').need, 'pro');
  assert.equal(PF.check({ code: 'E2' }, on, { lvl: 'L3' }, '2026-11-24').need, 'enterprise');
  assert.equal(PF.check({ code: 'E2' }, on, { lvl: 'L2', feature: 'grade' }, '2026-11-24'), null);
  assert.equal(PF.check({ code: 'A1' }, on, { feature: 'grade' }, '2026-11-24').need, 'pro');
  assert.equal(PF.check({ code: 'A1' }, on, { feature: 'vision' }, '2026-11-24').need, 'pro');
  assert.equal(PF.check({ code: 'A3' }, on, { lvl: 'L3', feature: 'grade' }, '2026-11-24'), null);
  class HE extends Error { constructor(s, m, c) { super(m); this.status = s; this.code = c; } }
  assert.throws(() => PF.guard(HE, { code: 'E1' }, on, { lvl: 'L2' }, '2026-11-24', true), e => e.status === 403 && e.code === 'plan_feature' && /요금제에서 쓸 수 없어요/.test(e.message));
  assert.throws(() => PF.guard(HE, { code: 'E1' }, on, { feature: 'grade' }, '2026-11-24', false), e => /Pro 요금제부터 이용할 수 있습니다/.test(e.message));
});

test('API: 403 plan_feature · 기존 기관 · 정책 off · 공개 데이터', { skip: !process.env.DATABASE_URL && 'DATABASE_URL 없음' }, async t => {
  const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');
  const ai = http.createServer((q, r) => { q.resume(); q.on('end', () => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ model: 'claude-haiku-5-5', content: [{ type: 'text', text: '좋아요' }], usage: { input_tokens: 3, output_tokens: 2 } })); }); });
  await new Promise(ok => ai.listen(0, ok));
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', ANTHROPIC_API_KEY: 'sk-ant-test', ANTHROPIC_URL: `http://127.0.0.1:${ai.address().port}/v1/messages` }, log: {} });
  await new Promise(ok => app.listen(0, ok)); t.after(async () => { ai.close(); app.close(); await pool.end(); });
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(`http://127.0.0.1:${app.address().port}` + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `pl${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'corp', code: 'C0DE' })).j.tenant;
  const items = [{ id: 'a2', type: 'assign', title: '과제2', ai: { lvl: 'L2' } }, { id: 'a3', type: 'assign', title: '과제3', ai: { lvl: 'L3' } }, { id: 'a1', type: 'assign', title: '과제1', ai: { lvl: 'L1' } }];
  const pub = { org: { name: '산타' }, pages: [], classes: [{ id: 'c1', name: '실무', items }] };
  const doc = (x = {}) => ({ org: { name: 'A', type: 'corp', room: { mode: 'saas' } }, settings: { tutor: { enabled: true, daily: 200 } }, lsite: { pub }, codes: [{ sid: '20260001', dept: '영업', code: 'ABC234' }], members: [{ id: 'm1', sid: '20260001', name: '20260001' }], classes: [{ id: 'c1', name: '실무', items }], ...x });
  let rev = (await call('A', 'PUT', '/api/state', { doc: doc(), rev: 0 })).j.rev;
  const put = async x => { const g = await call('A', 'GET', '/api/state'); rev = g.j.rev; const r = await call('A', 'PUT', '/api/state', { doc: doc(x), rev }); assert.equal(r.status, 200, JSON.stringify(r.j)); rev = r.j.rev; };
  assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/login`, { sid: '20260001', code: 'abc234' })).status, 200);
  const tutor = key => call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '어떻게 시작해요?', item: { key } });
  const grade = () => call('A', 'POST', '/api/ai/messages', { feature: 'grade', messages: [{ role: 'user', content: '채점' }] });
  const POL = { on: true, v: 1, lvl: 'L1', preset: { exam: 'L0', assign: 'L1' }, max: 'L3' };

  await t.test('plan 없는 기존 기관: L3 · grade 모두 통과', async () => {
    await put({ aipol: POL }); assert.equal((await tutor('c1/a3')).status, 200); assert.equal((await grade()).status, 200);
  });
  await t.test('정책 off 기관: Standard여도 영향 없음', async () => {
    await put({ plan: { code: 'E1', tier: 'standard', contract: 'annual', since: '2026-03-01' } }); assert.equal((await tutor('c1/a3')).status, 200); assert.equal((await grade()).status, 200);
  });
  await t.test('Standard + 정책 on: L2 · L3 · grade 403 plan_feature, L1 통과', async () => {
    await put({ aipol: POL, plan: { code: 'E1', tier: 'standard', contract: 'annual', since: '2026-03-01' } });
    assert.equal((await tutor('c1/a1')).status, 200);
    const x = await tutor('c1/a2'); assert.equal(x.status, 403); assert.equal(x.j.error, 'plan_feature'); assert.match(x.j.message, /요금제에서 쓸 수 없어요/);
    assert.equal((await tutor('c1/a3')).status, 403);
    const g = await grade(); assert.equal(g.status, 403); assert.equal(g.j.error, 'plan_feature'); assert.match(g.j.message, /Pro 요금제부터 이용할 수 있습니다/);
  });
  await t.test('Pro: L2 · grade 통과, L3만 403', async () => {
    await put({ aipol: POL, plan: { code: 'E2', tier: 'pro', contract: 'annual', since: '2026-03-01' } });
    assert.equal((await tutor('c1/a2')).status, 200); assert.equal((await grade()).status, 200); assert.equal((await tutor('c1/a3')).status, 403);
  });
  await t.test('공개 데이터에 plan 없음', async () => {
    const s = await call('X', 'GET', `/api/pub/${A.tid}/site`); assert.equal(s.status, 200); assert.equal(s.j.site.plan, undefined); assert.ok(!/"E2"|"tier"/.test(JSON.stringify(s.j)));
  });
});
