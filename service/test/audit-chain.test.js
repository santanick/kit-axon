'use strict';
/* 가디언 2차(SEC-0006) — 일반 audit_log 해시 체인(DB 트리거) · GET /api/audit/verify
   DATABASE_URL=postgresql://… node --test service/test/audit-chain.test.js
   시험 DB 전용: 변조 재현을 위해 트리거를 잠시 끄고 행을 고친다(로그인 계정 = 표 소유자). */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp } = require('../server/app');

test('감사 기록 해시 체인', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE' }, log: {} }); await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `ac${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'AudA', type: 'adult', code: 'C0DE' })).j.tenant.tid;
  const B = (await call('B', 'POST', '/api/signup', { email: `bc${sfx}@a.kr`, password: 'Passw0rd-bbb', orgName: 'AudB', type: 'adult', code: 'C0DE' })).j.tenant.tid;
  const ins = (tid, action, detail) => inTenant(pool, tid, c => c.query('insert into audit_log (tenant_id, actor, action, detail) values ($1, $2, $3, $4)', [tid, 't@a.kr', action, detail ? JSON.stringify(detail) : null]));
  const verify = tid => inTenant(pool, tid, async c => (await c.query('select audit_verify($1) v', [tid])).rows[0].v);
  const owner = async (sql, args) => pool.query(sql, args);

  await t.test('insert마다 prev_hash · hash가 채워지고 기관별 체인이 이어진다', async () => {
    await ins(A, 'x.one', { a: 1 }); await ins(B, 'x.one'); await ins(A, 'x.two', { b: '한글|"' });
    const rows = (await owner('select id, prev_hash, hash from audit_log where tenant_id = $1 order by id', [A])).rows;
    assert.ok(rows.length >= 3); assert.equal(rows[0].prev_hash, '0'.repeat(64));
    for (let i = 1; i < rows.length; i++) assert.equal(rows[i].prev_hash, rows[i - 1].hash);
    const v = await verify(A); assert.equal(v.ok, true); assert.equal(v.n, rows.length); assert.equal(v.head, rows.at(-1).hash);
  });
  await t.test('동시 insert 40건(한 기관)도 체인이 끊기지 않는다', async () => {
    await Promise.all(Array.from({ length: 40 }, (_, i) => ins(A, 'x.par', { i })));
    const v = await verify(A); assert.equal(v.ok, true, JSON.stringify(v));
  });
  await t.test('기관 역할은 update · delete 불가, update는 소유자도 트리거가 거부', async () => {
    await assert.rejects(inTenant(pool, A, c => c.query("update audit_log set actor = 'x' where tenant_id = $1", [A])), /permission denied|append-only/);
    await assert.rejects(inTenant(pool, A, c => c.query('delete from audit_log where tenant_id = $1', [A])), /permission denied/);
    await assert.rejects(owner("update audit_log set actor = 'x' where tenant_id = $1", [A]), /append-only/);
  });
  await t.test('API: 정운영자 200 · 비로그인 401', async () => {
    const r = await call('A', 'GET', '/api/audit/verify'); assert.equal(r.status, 200); assert.equal(r.j.ok, true); assert.match(r.j.head, /^[0-9a-f]{64}$/);
    assert.equal((await call('X', 'GET', '/api/audit/verify')).status, 401);
  });
  await t.test('변조 탐지: 내용 수정 · 중간 삭제', async () => {
    const mid = (await owner("select id from audit_log where tenant_id = $1 and action = 'x.par' order by id limit 1 offset 5", [A])).rows[0].id;
    await owner('alter table audit_log disable trigger audit_log_chain');
    try {
      await owner(`update audit_log set detail = '{"i":999}' where id = $1`, [mid]);
      let v = await verify(A); assert.equal(v.ok, false); assert.equal(Number(v.brokenAt), Number(mid)); assert.equal(v.reason, 'hash');
      await owner('delete from audit_log where id = $1', [mid]);
      v = await verify(A); assert.equal(v.ok, false); assert.equal(v.reason, 'hash');
      assert.equal((await verify(B)).ok, true, '다른 기관 체인은 영향 없음');
    } finally { await owner('alter table audit_log enable trigger audit_log_chain'); }
  });
  await t.test('기존 행(해시 없음) → 체인 시작점(audit.chain.start)이 건수 · 다이제스트를 고정', async () => {
    const C = (await call('C', 'POST', '/api/signup', { email: `cc${sfx}@a.kr`, password: 'Passw0rd-ccc', orgName: 'AudC', type: 'adult', code: 'C0DE' })).j.tenant.tid;
    await owner('alter table audit_log disable trigger audit_log_chain');
    try {
      await owner('delete from audit_log where tenant_id = $1', [C]);
      for (const k of ['old.1', 'old.2', 'old.3']) await owner('insert into audit_log (tenant_id, actor, action) values ($1, $2, $3)', [C, 'o@a.kr', k]);
    } finally { await owner('alter table audit_log enable trigger audit_log_chain'); }
    /* 마이그레이션 do 블록과 같은 처리 */
    await inTenant(pool, C, c => c.query("insert into audit_log (tenant_id, actor, action, detail) values ($1, 'system', 'audit.chain.start', audit_legacy_digest($1, 9223372036854775807))", [C]));
    await ins(C, 'new.1');
    let v = await verify(C); assert.equal(v.ok, true, JSON.stringify(v)); assert.equal(v.legacy, 3); assert.equal(v.n, 2);
    await owner('alter table audit_log disable trigger audit_log_chain');
    try { await owner("update audit_log set actor = 'evil' where tenant_id = $1 and action = 'old.2'", [C]); } finally { await owner('alter table audit_log enable trigger audit_log_chain'); }
    v = await verify(C); assert.equal(v.ok, false); assert.equal(v.reason, 'legacy');
  });
  await new Promise(ok => app.close(ok)); await pool.end();
});
