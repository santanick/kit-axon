'use strict';
/* 통합 센터(기관 묶음) 서버 — 계약 시나리오(tests/contract-group.js, 같은 프로세스 서버) + DB 격리(T-ISO-1 · 5 · 10) · 가림 단위 · 감사 체인.
   DATABASE_URL=postgres://didisam:…@127.0.0.1:5610/didisam node --test service/test/group.test.js   (비슈퍼유저 앱 계정 권장 — RLS FORCE 확인) */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto'); const path = require('node:path'); const fs = require('node:fs');
const ROOT = path.join(__dirname, '..', '..');
const K = require('../server/group/kpi');
const CT = require('../server/group/contract.json');

test('KPI 계산 · 가림(순수 함수) · 계약 파일 · 오류 문구 한 곳', () => {
  const doc = { members: [{ id: 'a' }, { id: 'b', withdrawn: true }], classes: [{ id: 'c', learners: ['a', 'x1', 'x2', 'x3', 'x4', 'x5'], prog: { a: { p: 100 }, x1: { p: 40 } } }] };
  const v = K.fromDoc(doc, '2026-11-27'); assert.equal(v.lrn, 6); assert.equal(v.enr, 6); assert.equal(v.cmp, 1);
  const m = K.mask(v, {}); assert.equal(m.v.cmp, '5명 미만'); assert.ok(m.masked.includes('cmp')); assert.deepEqual(m.noConsent, ['aiCalls', 'aiTok', 'rev']); assert.equal(m.v.cmpRateBp, 1667);
  assert.equal(K.mask({ lrn: 0, enr: 3, cmp: 0 }, {}).v.cmpRateBp, null, '분모 5명 미만 비율 가림'); assert.equal(K.mask({ lrn: 0 }, {}).v.lrn, 0, '0은 그대로');
  assert.deepEqual(K.total([{ raw: { lrn: 3 }, noConsent: [] }, { raw: { lrn: 1 }, noConsent: ['rev'] }]).lrn, '5명 미만'); assert.equal(K.total([{ raw: { rev: 5 }, noConsent: ['rev'] }]).rev, null);
  assert.deepEqual(K.combine([{ day: '2026-11-01', v: { lrn: 5, aiCalls: 2 } }, { day: '2026-11-02', v: { lrn: 7, aiCalls: 3 } }]), { lrn: 7, aiCalls: 5 });
  assert.equal(K.bucket('2026-01-01', 'week'), '2026-W01'); assert.equal(K.bucket('2026-11-27', 'month'), '2026-11');
  assert.deepEqual(K.fold([{ d: 'a', n: 7 }, { d: 'b', n: 2 }, { d: 'c', n: 1 }], 'd', 'n', '묶음'), [{ d: 'a', n: 7 }, { d: '묶음', n: '5명 미만' }]);
  const { MSG } = require('../server/group'); for (const [k, [st, msg]] of Object.entries(CT.errors)) { assert.equal(MSG[k], msg); assert.ok([400, 403, 404, 409, 410, 413, 429].includes(st), k); assert.ok(/(니다|십시오|\))\.$/.test(msg), '합니다체: ' + k); }
  const src = fs.readFileSync(path.join(ROOT, 'service', 'server', 'group', 'routes.js'), 'utf8'); for (const [m, p] of CT.routes) { const re = p.replace(/:[a-zA-Z]+/g, 'X'); assert.ok(src.includes(`['${m}'`), m); void re; }
});

test('운영 서버: 통합 센터', { skip: !process.env.DATABASE_URL }, async t => {
  const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const C = require(path.join(ROOT, 'tests', 'contract-group.js'));
  const pool = poolFrom(process.env); await migrate(pool); await migrate(pool); /* 두 번 적용해도 안전 */
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex'), PII_DEV_OTP: '1', MFA_OFF: '1', FAC_SWEEP_MS: '0', LEDGER_SWEEP_MS: '0', SANTA_ADMIN_EMAILS: C.SANTA }, log: process.env.GRP_LOG ? console : {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  t.after(() => { app.close(); return pool.end(); });
  const as = async (scope, sql, args, role = 'didisam_group') => { const c = await pool.connect(); try { await c.query('begin'); await c.query(`set local role ${role}`); await c.query("select set_config('app.tenant', $1, true), set_config('app.santa', $2, true)", [scope.tid || '', scope.santa ? '1' : '0']); const r = await c.query(sql, args); await c.query('commit'); return r; } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); } };
  const superuser = (await pool.query('select rolsuper from pg_roles where rolname = current_user')).rows[0].rolsuper;

  let R;
  await t.test('계약 시나리오(tests/contract-group.js)', async () => {
    R = await C.run(U, 'n', { stale: () => as({ santa: true }, 'select 1').then(() => pool.query("update sessions set created_at = now() - interval '11 minutes' where user_id in (select id from users where email like 'gu\\_%')")) });
    if (process.env.DBG) { const x = { ...R }; delete x._t; console.log(JSON.stringify(x)); }
    const bad = C.check(R); assert.deepEqual(bad, [], bad.join('\n'));
  });
  await t.test('수납액 KPI: 그날 수납 − 그날 완료 환불(coalesce(done_at, at) KST 날짜, status=done만)', async () => {
    const { inTenant } = require('../server/db'); const tid = R.tids.X; const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const G = require('../server/group').createGroup({ pool, inTenant, HttpErr: class extends Error {}, audit: async () => {}, env: {}, log: {} });
    await inTenant(pool, tid, async c => {
      await c.query("insert into led_receipt (tenant_id, id, unit_id, method, channel, amount, paid_at, status) values ($1, 'lp_grptest00001', 'u1', 'cash', 'desk', 50000, now(), 'paid')", [tid]);
      const rf = (id, amt, st, at, done) => c.query(`insert into led_refund (tenant_id, id, receipt_id, amount, rule_type, auto_amount, status, at, done_at) values ($1, $2, 'lp_grptest00001', $3, 'manual', $3, $4, ${at}, ${done})`, [tid, id, amt, st]);
      await rf('lr_grptest00001', 12000, 'done', 'now()', 'now()');                                   /* 오늘 완료 → 차감 */
      await rf('lr_grptest00002', 1000, 'done', 'now()', 'null');                                     /* 완료 시각 없음 → at 기준 오늘 → 차감 */
      await rf('lr_grptest00003', 7000, 'done', "now() - interval '3 days'", "now() - interval '3 days'"); /* 다른 날 → 제외 */
      await rf('lr_grptest00004', 9999, 'pending', 'now()', 'null');                                  /* 대기 → 제외 */
      await rf('lr_grptest00005', 3000, 'done', "now() - interval '3 days'", 'now()');                /* 신청은 3일 전 · 완료는 오늘 → 차감 */
    });
    const m = await G.snap.measure(tid, day, { revenue: true }, false); assert.equal(m.v.rev, 50000 - 12000 - 1000 - 3000);
    assert.equal((await G.snap.measure(tid, day, {}, false)).v.rev, undefined, '동의 없으면 값 없음');
  });
  await t.test('T-ISO-1 통합 센터 역할은 기관 표 권한 없음 · 모든 grp 표 RLS FORCE · 앱 계정도 직접 못 읽음', async () => {
    for (const x of ['tenant_state', 'learner_accounts', 'learners', 'users', 'audit_log', 'ai_usage', 'led_receipt']) await assert.rejects(as({ tid: R.tids.F }, `select 1 from ${x} limit 1`), /permission denied/, x);
    await assert.rejects(as({ tid: R.tids.F }, 'select 1 from grp_lkey'), /permission denied/);
    assert.equal((await pool.query("select count(*)::int n from pg_class where relname like 'grp\\_%' and relkind = 'r' and not (relrowsecurity and relforcerowsecurity)")).rows[0].n, 0);
    assert.equal((await pool.query("select count(*)::int n from information_schema.role_table_grants where grantee = 'didisam_group' and table_name not like 'grp\\_%'")).rows[0].n, 0);
    if (!superuser) assert.equal((await pool.query('select count(*)::int n from grp_link')).rows[0].n, 0, '앱 계정(소유자)도 역할 · 범위 없이 0행');
    assert.equal((await as({}, 'select count(*)::int n from grp_link')).rows[0].n, 0, '범위가 비면 0행');
  });
  await t.test('T-ISO-2 · 3 · 4 RLS: 다른 묶음 · 끝난 연결 집계는 상위 기관에 안 보임, 소속 기관은 자기 행만', async () => {
    const T = R.tids; const n = async (tid, sql) => (await as({ tid }, sql)).rows[0].n;
    assert.equal(await n(T.F, `select count(*)::int n from grp_kpi_day where child_tid in ('${T.X}','${T.Y}')`), 0, '대학 묶음 집계는 본사에 0행');
    assert.equal(await n(T.F, `select count(*)::int n from grp_kpi_day where child_tid = '${T.B}'`), 0, '탈퇴(left) 기관 집계는 즉시 0행');
    assert.ok(await n(T.B, `select count(*)::int n from grp_kpi_day where child_tid = '${T.B}'`) > 0, '소속 기관 자기 행은 남음(365일 보관)');
    assert.ok(await n(T.F, `select count(*)::int n from grp_kpi_day where child_tid = '${T.A}'`) > 0);
    assert.equal(await n(T.A, `select count(*)::int n from grp_kpi_day where child_tid <> '${T.A}'`), 0);
    assert.equal(await n(T.F, 'select count(*)::int n from grp_group'), 1); assert.equal(await n(T.F, 'select count(*)::int n from grp_lx'), 0);
    assert.equal(await n(T.U, `select count(*)::int n from grp_audit where group_id = '${R._t.GF}'`), 0, '다른 묶음 감사 0행');
  });
  await t.test('T-ISO-5 · 10 트리거 · 쓰기 정책: 연결 열 변경 거부, 다른 기관 이름으로 집계 쓰기 거부', async () => {
    const T = R.tids; const l = (await as({ santa: true }, `select id, group_id from grp_link where child_tid = '${T.A}' and status = 'active' and group_id = '${R._t.GF}'`)).rows[0];
    await assert.rejects(as({ tid: T.A }, 'update grp_link set child_tid = $2 where id = $1', [l.id, T.B]), /grp_link_guard/);
    await assert.rejects(as({ tid: T.A }, 'update grp_link set group_id = $2 where id = $1', [l.id, R._t.GU]), /grp_link_guard|violates/);
    await assert.rejects(as({ tid: T.A }, "update grp_link set status = 'removed' where id = $1", [l.id]), /grp_link_guard/, '소속 기관은 removed로 못 바꿈');
    await assert.rejects(as({ tid: T.F }, "update grp_link set status = 'left' where id = $1", [l.id]), /grp_link_guard/, '상위 기관은 left로 못 바꿈');
    await assert.rejects(as({ tid: T.A }, "insert into grp_kpi_day (group_id, child_tid, day, v) values ($1, $2, current_date, '{}')", [R._t.GF, T.B]), /row-level security/);
    await assert.rejects(as({ tid: T.F }, "insert into grp_kpi_day (group_id, child_tid, day, v) values ($1, $2, current_date - 400, '{}')", [R._t.GF, T.A]), /row-level security/, '상위 기관은 집계를 쓸 수 없음');
    await assert.rejects(as({ tid: T.F }, 'update grp_audit set purpose = $1', ['x']), /permission denied/); await assert.rejects(as({ tid: T.F }, 'delete from grp_audit'), /permission denied/);
    await assert.rejects(as({ tid: T.A }, "insert into grp_audit (group_id, actor, actor_tid, action) values ($1, 'x', $2, 'fake')", [R._t.GF, T.F]), /row-level security/, '다른 기관 이름으로 감사 기록 불가');
  });
  await t.test('T-PRV-8 · 11 감사 체인 · 학번 원문 없음 · 소속 기관 audit_log', async () => {
    const rows = (await as({ santa: true }, 'select prev_hash, hash, target from grp_audit where group_id = $1 order by id', [R._t.GU])).rows; assert.ok(rows.length > 3);
    for (let i = 1; i < rows.length; i++) assert.equal(rows[i].prev_hash, rows[i - 1].hash, '해시 체인'); assert.equal(rows[0].prev_hash, '0'.repeat(64));
    const all = JSON.stringify((await as({ santa: true }, 'select * from grp_audit')).rows) + JSON.stringify((await as({ santa: true }, 'select * from grp_lx')).rows); assert.ok(!/2023123[4-9]/.test(all), '학번 원문 없음');
    assert.ok((await as({ santa: true }, "select count(*)::int n from grp_lx where gkey !~ '^[0-9a-f]{32}$'")).rows[0].n === 0);
    const v = (await as({ tid: R.tids.X }, "select count(*)::int n from audit_log where action = 'grp.learner.view'", [], 'didisam_tenant')).rows[0].n; assert.equal(v, 1);
  });
  await t.test('T-FN-1 초대 기한: 15일 지난 코드는 410, tick이 만료 처리 · 끝난 연결 집계 365일 뒤 삭제', async () => {
    const { call, I } = R._t; const iv = await call('F', 'POST', '/api/group/invites', { idem: I(), label: '늦은 지점', unit: 'branch' });
    await as({ santa: true }, "update grp_link set expires_at = now() - interval '1 day', invited_at = now() - interval '15 days' where id = $1", [iv.j.linkId]);
    const r = await call('B', 'POST', '/api/group/my/accept', { idem: I(), code: iv.j.code, share: { kpi: true }, agreeVer: 'grp-share-v1' }); assert.equal(`${r.st}:${r.j.error}`, '410:grp_invite_expired');
    await as({ santa: true }, "update grp_link set ended_at = now() - interval '366 days' where child_tid = $1 and status = 'left'", [R.tids.B]); await app.groupTick();
    assert.equal((await as({ santa: true }, 'select status from grp_link where id = $1', [iv.j.linkId])).rows[0].status, 'expired');
    assert.equal((await as({ santa: true }, 'select count(*)::int n from grp_kpi_day where child_tid = $1 and group_id = $2', [R.tids.B, R._t.GF])).rows[0].n, 0, '365일 지난 스냅숏 삭제');
    assert.ok((await as({ santa: true }, 'select count(*)::int n from grp_kpi_day where child_tid = $1', [R.tids.A])).rows[0].n > 0, '연결 중 기관은 유지');
  });
  await t.test('시범 꺼짐: 상위 기관 경로 403 grp_off, 소속 기관 경로는 그대로', async () => {
    const { call, I, GF } = R._t; await call('S', 'PATCH', `/api/group/admin/groups/${GF}`, { idem: I(), pilot: false });
    assert.equal((await call('F', 'GET', '/api/group/dash')).j.error, 'grp_off'); assert.equal((await call('F', 'GET', '/api/group/me')).j.me.perms.length, 0); assert.equal((await call('A', 'GET', '/api/group/my')).st, 200);
    await call('S', 'PATCH', `/api/group/admin/groups/${GF}`, { idem: I(), pilot: true });
  });
});
