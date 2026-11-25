'use strict';
/* 가디언 4차(d3) 기록 · 데이터 — 접속기록 ip(#5) · 분기 권한 검토(#7) · 로그 연쇄 삭제 제거 + 보관 만료 파기(#10 · #11) · 내려받기 통제(#14) · 국외 로그인 차단(#15)
   DATABASE_URL=… node --test service/test/records.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('가디언 4차 기록 · 데이터', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const env = { COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '1', GEO_COUNTRY_HEADER: 'x-client-geo-country', PII_KEY: crypto.randomBytes(32).toString('hex'), SIGNUP_CODE: 'C0DE', MFA_OFF: '1' };
  const app = createApp({ pool, env, log: {} }); await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body, hd = {}) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', 'x-forwarded-for': '211.36.1.1', ...hd, ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c && c.split(';')[0].split('=')[1]) jar[who] = c.split(';')[0];
    const tx = await r.text(); let j = {}; try { j = JSON.parse(tx); } catch (e) { j = { _text: tx }; } return { st: r.status, j, ct: r.headers.get('content-type') || '' };
  };
  const sfx = Date.now().toString(36); const OW = `r${sfx}@r.kr`, PW = 'Passw0rd-rec1'; let tid;
  const q1 = async (sql, a, t0) => { const c = await pool.connect(); try { await c.query('begin'); if (t0) await c.query("select set_config('app.tenant', $1, true)", [t0]); const r = await c.query(sql, a); await c.query('commit'); return r.rows; } finally { c.release(); } };

  await t.test('가입 · 부운영자', async () => {
    tid = (await call('A', 'POST', '/api/signup', { email: OW, password: PW, orgName: '기록', type: 'corp', code: 'C0DE' })).j.tenant.tid; assert.ok(tid);
    assert.equal((await call('A', 'PUT', '/api/state', { doc: { org: { name: '기록', type: 'corp' } }, rev: 0 })).st, 200);
    const s = await call('A', 'POST', '/api/staff', { email: `s${sfx}@r.kr`, role: 'sub' }); assert.equal(s.st, 200);
    await call('S', 'POST', '/api/login', { email: `s${sfx}@r.kr`, password: s.j.password }); assert.equal((await call('S', 'POST', '/api/password', { current: s.j.password, next: 'Passw0rd-sub9' })).st, 200);
  });
  await t.test('#5 접속기록에 접속지 ip', async () => {
    assert.equal((await call('A', 'GET', '/api/learners/accounts')).st, 200);
    const r = await q1("select ip from pii.access_log where tid = $1 and action = 'list_masked' order by id desc limit 1", [tid], tid); assert.equal(r[0].ip, '211.36.1.1');
  });
  await t.test('#7 분기 접근권한 검토', async () => {
    assert.equal((await call('S', 'GET', '/api/access-review')).j.error, 'role');
    const g = await call('A', 'GET', '/api/access-review'); assert.equal(g.st, 200); assert.equal(g.j.rows.length, 2); assert.equal(g.j.due, true); assert.equal(g.j.lastReview, null);
    assert.deepEqual(Object.keys(g.j.rows[0]).sort(), ['email', 'lastLogin', 'role']); assert.equal(g.j.rows[0].role, 'owner');
    assert.equal((await call('A', 'POST', '/api/access-review', { note: 'x'.repeat(501) })).j.error, 'note');
    assert.equal((await call('S', 'POST', '/api/access-review', { note: 'a' })).st, 403);
    assert.equal((await call('A', 'POST', '/api/access-review', { note: '2026 4분기 검토 — 이상 없음' })).j.ok, true);
    const g2 = await call('A', 'GET', '/api/access-review'); assert.equal(g2.j.due, false); assert.equal(g2.j.lastReview.note, '2026 4분기 검토 — 이상 없음'); assert.equal(g2.j.lastReview.by, OW);
    const d = (await q1("select detail from audit_log where tenant_id = $1 and action = 'access.review'", [tid], tid))[0].detail; assert.deepEqual(d.roles, { owner: 1, sub: 1, teacher: 0 });
  });
  await t.test('#14 내려받기: 사유 필수 · 원본은 정운영자 · audit export', async () => {
    const n0 = await call('A', 'GET', '/api/fac/export'); assert.equal(n0.st, 400); assert.equal(n0.j.error, 'export_reason');
    const r1 = await call('S', 'GET', '/api/ledger/export?reason=' + encodeURIComponent('정산 확인') + '&raw=1'); assert.equal(r1.j.error, 'export_raw');
    assert.equal((await call('S', 'GET', '/api/ledger/export')).j.error, 'export_reason');
    const ok = await call('A', 'GET', '/api/fac/export?reason=' + encodeURIComponent('월 정산')); assert.equal(ok.st, 200, JSON.stringify(ok.j)); assert.match(ok.ct, /csv/);
    const d = (await q1("select detail from audit_log where tenant_id = $1 and action = 'export' order by id desc limit 1", [tid], tid))[0].detail; assert.deepEqual(d, { kind: 'fac', n: 0, raw: false, reason: '월 정산' });
  });
  await t.test('#15 국외 운영자 로그인 차단(기관 선택)', async () => {
    const R = (cc) => ({ headers: cc ? { 'x-client-geo-country': cc } : {} });
    await app.geoCheck(R('NL'), tid, OW); /* 꺼짐 기본 */
    assert.equal((await call('S', 'POST', '/api/org/sec/geo', { krOnly: true })).st, 403);
    assert.equal((await call('A', 'POST', '/api/org/sec/geo', { krOnly: 'yes' })).j.error, 'krOnly');
    assert.deepEqual((await call('A', 'POST', '/api/org/sec/geo', { krOnly: true })).j, { ok: true, krOnly: true });
    assert.equal((await call('S', 'GET', '/api/org/sec/geo')).j.krOnly, true);
    await assert.rejects(app.geoCheck(R('nl'), tid, OW), e => e.code === 'geo_blocked' && e.status === 403);
    await app.geoCheck(R('KR'), tid, OW); await app.geoCheck(R(''), tid, OW);
    assert.equal((await q1("select count(*)::int n from audit_log where tenant_id = $1 and action = 'login.geo_blocked'", [tid], tid))[0].n, 1);
  });
  await t.test('#10 · #11 보관 만료 파기 + 체인 검증 유지', async () => {
    const T = 'tn_z' + crypto.randomBytes(5).toString('hex'); await pool.query('insert into tenant_gone (tid, name) values ($1, $2)', [T, '해지']);
    const ins = (at, action) => q1(`insert into audit_log (tenant_id, actor, action, detail, at) values ($1, 'x', $2, '{}', now() - $3::interval)`, [T, action, at], T);
    await ins('30 months', 'role.change'); await ins('26 months', 'x.old'); await ins('50 months', 'member.remove'); await ins('11 months', 'staff.create'); await ins('0 days', 'y.now');
    await q1("insert into pii.access_log (tid, actor, action, at, ip) values ($1, 'x', 'view', now() - interval '25 months', '1.1.1.1'), ($1, 'x', 'view', now(), '1.1.1.2')", [T], T);
    const r = (await pool.query('select records_purge() r')).rows[0].r; assert.deepEqual(r[T], [3, 1, 1]);
    const left = await q1('select action from audit_log where tenant_id = $1 order by id', [T], T); assert.deepEqual(left.map(x => x.action), ['staff.create', 'y.now', 'audit.purge']);
    const arc = await q1('select action from audit_archive where tenant_id = $1 order by id', [T]); assert.deepEqual(arc.map(x => x.action), ['role.change']);
    assert.equal((await q1('select count(*)::int n from pii.access_log where tid = $1', [T], T))[0].n, 1);
    assert.equal((await q1('select audit_verify($1) v', [T], T))[0].v.ok, true);
    assert.deepEqual((await pool.query('select records_purge() r')).rows[0].r[T], undefined, '두 번째는 지울 것 없음');
    assert.equal((await q1('select audit_verify($1) v', [T], T))[0].v.ok, true);
    assert.equal((await call('A', 'GET', '/api/audit/verify')).j.ok, true);
  });
  await t.test('#10 기관을 파기해도 접속기록 · 감사기록은 남는다', async () => {
    assert.equal((await call('A', 'POST', '/api/tenant/delete', { confirm: '기록', password: PW })).j.ok, true);
    assert.ok((await q1('select count(*)::int n from audit_log where tenant_id = $1', [tid], tid))[0].n > 3);
    assert.equal((await q1('select count(*)::int n from pii.access_log where tid = $1', [tid], tid))[0].n, 1);
    assert.equal((await pool.query('select name from tenant_gone where tid = $1', [tid])).rows[0].name, '기록');
  });
  app.close(); await pool.end();
});
