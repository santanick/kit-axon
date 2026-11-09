'use strict';
/* v36 일괄 등록(최대 5,000명) — 학습자 로그인 계정(접근코드 해시)을 저장 때 일부, 나머지는 POST /api/learners/sync로 배치 처리.
   한도에서 멈춘 뒤에도 앞서 만든 계정이 지워지지 않는지(이전 버그) · 남은 건수 · 늦게 만든 계정 로그인까지 확인한다. */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('학습자 계정 배치 동기화', async () => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', LEARNER_SYNC_PUT: '5', LEARNER_SYNC_BATCH: '7' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `ls${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'univ', code: 'C0DE' })).j.tenant;
  const codes = Array.from({ length: 20 }, (_, i) => ({ sid: `2026${String(i).padStart(4, '0')}`, dept: '컴공', code: `CODE${String(i).padStart(2, '0')}` }));
  const doc = c => ({ org: { name: 'A', type: 'univ', room: { mode: 'saas' } }, codes: c, members: [], lsite: { pub: { org: { name: 'A' }, pages: [] } } });
  const put = await call('A', 'PUT', '/api/state', { doc: doc(codes), rev: 0 }); assert.equal(put.status, 200); assert.equal(put.j.pending, 15);
  const n = async () => (await pool.query('select count(*)::int n from learners where tenant_id = $1', [A.tid])).rows[0].n;
  assert.equal(await n(), 5);
  /* 다시 저장해도 앞의 5건은 남고(이전: 한도 뒤 학번이 삭제 대상) 5건 더 */
  const put2 = await call('A', 'PUT', '/api/state', { doc: doc(codes), rev: 1 }); assert.equal(put2.j.pending, 10); assert.equal(await n(), 10);
  assert.equal((await call('A', 'POST', '/api/learners/sync', {})).j.pending, 3); assert.equal(await n(), 17);
  assert.equal((await call('A', 'POST', '/api/learners/sync', {})).j.pending, 0); assert.equal(await n(), 20);
  assert.equal((await call('X', 'POST', '/api/learners/sync', {})).status, 401);
  const lg = await call('L', 'POST', `/api/pub/${A.tid}/login`, { sid: '20260019', code: 'code19' }); assert.equal(lg.status, 200); assert.equal(lg.j.me.dept, '컴공');
  /* 명단에서 빠진 학번은 지운다 */
  const put3 = await call('A', 'PUT', '/api/state', { doc: doc(codes.slice(0, 12)), rev: 2 }); assert.equal(put3.j.pending, undefined); assert.equal(await n(), 12);
  await new Promise(ok => app.close(ok)); await pool.end();
});
