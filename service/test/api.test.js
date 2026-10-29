'use strict';
/* 배포 전 API 테스트(node:test) — 실제 PostgreSQL에 연결해 가입 · 저장 · 기관 분리 · RLS · CSRF · AI 정책을 확인한다.
   DATABASE_URL=postgresql://… node --test service/test/ */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('디디쌤 스튜디오 API', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  let upstream = 0; const mock = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => { upstream++; r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ model: JSON.parse(b).model, content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 5, output_tokens: 1 } })); }); });
  await new Promise(ok => mock.listen(0, ok));
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', ANTHROPIC_API_KEY: 'sk-ant-test', ANTHROPIC_URL: `http://127.0.0.1:${mock.address().port}/`, SIGNUP_CODE: 'C0DE', AI_DAILY_CALLS: '3' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body, hdr = { 'x-didisam': '1' }) => {
    const r = await fetch(U + path, { method, headers: { ...hdr, ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36);
  const doc = name => ({ org: { name, type: 'univ', room: { mode: 'saas', ai: 'anthropic', egress: { ai: true } } }, members: [] });

  await t.test('CSRF 헤더 없으면 거부', async () => { assert.equal((await call('x', 'POST', '/api/signup', {}, {})).status, 403); });
  await t.test('가입 코드 · 비밀번호 규칙', async () => {
    assert.equal((await call('x', 'POST', '/api/signup', { email: `a${sfx}@a.kr`, password: 'Passw0rd-xyz', orgName: 'A', type: 'univ', code: 'no' })).status, 403);
    assert.equal((await call('x', 'POST', '/api/signup', { email: `a${sfx}@a.kr`, password: 'short1', orgName: 'A', type: 'univ', code: 'C0DE' })).status, 400);
  });
  let A, B;
  await t.test('두 기관 가입', async () => {
    A = (await call('A', 'POST', '/api/signup', { email: `a${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'univ', code: 'C0DE' })).j.tenant;
    B = (await call('B', 'POST', '/api/signup', { email: `b${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: 'B', type: 'corp', code: 'C0DE' })).j.tenant;
    assert.ok(A.tid && B.tid && A.tid !== B.tid);
    assert.equal((await call('C', 'POST', '/api/signup', { email: `A${sfx}@A.kr`, password: 'Passw0rd-aaa', orgName: 'A2', type: 'univ', code: 'C0DE' })).status, 409);
  });
  await t.test('저장 · rev 충돌', async () => {
    assert.equal((await call('A', 'PUT', '/api/state', { doc: doc('A-secret'), rev: 0 })).j.rev, 1);
    assert.equal((await call('A', 'PUT', '/api/state', { doc: doc('A-secret'), rev: 1 })).j.rev, 2);
    assert.equal((await call('A', 'PUT', '/api/state', { doc: doc('A-secret'), rev: 1 })).status, 409);
    assert.equal((await call('B', 'PUT', '/api/state', { doc: doc('B-only'), rev: 0 })).j.rev, 1);
  });
  await t.test('기관 분리: B는 A를 읽거나 쓸 수 없음', async () => {
    assert.equal((await call('B', 'GET', '/api/state')).j.doc.org.name, 'B-only');
    const d = doc('hijack'); d.org.room.tid = A.tid;
    assert.equal((await call('B', 'PUT', '/api/state', { doc: d, rev: 1 })).status, 403);
    assert.equal((await call('A', 'GET', '/api/state')).j.doc.org.name, 'A-secret');
  });
  await t.test('RLS: 기관 설정 없이 tenant 역할로는 0행', async () => {
    const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_tenant'); assert.equal((await c.query('select count(*)::int n from tenant_state')).rows[0].n, 0); await c.query("select set_config('app.tenant', $1, true)", [A.tid]); assert.equal((await c.query('select count(*)::int n from tenant_state')).rows[0].n, 1); await c.query('rollback'); } finally { c.release(); }
  });
  await t.test('AI: 서버 키로 호출 · 정책 · 한도', async () => {
    const m = { messages: [{ role: 'user', content: 'hi' }] };
    assert.equal((await call('A', 'POST', '/api/ai/messages', m)).j.content[0].text, 'ok');
    const d = doc('A-secret'); d.org.room.egress.ai = false; await call('A', 'PUT', '/api/state', { doc: d, rev: 2 });
    assert.equal((await call('A', 'POST', '/api/ai/messages', m)).j.error, 'policy');
    for (let i = 0; i < 3; i++) await call('B', 'POST', '/api/ai/messages', m);
    assert.equal((await call('B', 'POST', '/api/ai/messages', m)).status, 429);
    assert.equal(upstream, 4); // A 1회 + B 3회(정책 차단 · 한도 초과는 업스트림 호출 없음)
  });
  await t.test('로그인 · 로그아웃 · 파기', async () => {
    assert.equal((await call('L', 'POST', '/api/login', { email: `b${sfx}@b.kr`, password: 'wrong-pass-1' })).status, 401);
    assert.equal((await call('L', 'POST', '/api/login', { email: `b${sfx}@b.kr`, password: 'Passw0rd-bbb' })).j.tenant.tid, B.tid);
    assert.equal((await call('L', 'POST', '/api/tenant/delete', { confirm: 'B', password: 'Passw0rd-bbb' })).j.ok, true);
    assert.equal((await call('B', 'GET', '/api/state')).status, 401);
    await call('A', 'POST', '/api/logout'); assert.equal((await call('A', 'GET', '/api/me')).status, 401);
    await pool.query('delete from tenants where id = $1', [A.tid]);
  });
  app.close(); mock.close(); await pool.end();
});
