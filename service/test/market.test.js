'use strict';
/* 콘텐츠 마켓 v1.1 서버 — 계산 기준값(tests/market-vectors.json: spec 10장 42건 + dev-addendum margin 26건) · 계약 시나리오(tests/contract-market.js, 같은 프로세스 서버) · DB 확인.
   DATABASE_URL=postgres://… node --test service/test/market.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto'); const path = require('node:path'); const fs = require('node:fs');
const ROOT = path.join(__dirname, '..', '..');
const calc = require('../server/market/calc');
const V = require(path.join(ROOT, 'tests', 'market-vectors.json'));
const run = require(path.join(ROOT, 'tests', 'market-vectors-run.js'));

test('계산 기준값(market-vectors.json) · 화면 공용 파일과 서버 사본 동일', () => {
  assert.equal(fs.readFileSync(path.join(ROOT, 'didisam', 'marketcalc.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '..', 'server', 'market', 'calc.js'), 'utf8'), 'service/server/market/calc.js는 didisam/marketcalc.js 사본이어야 합니다');
  assert.equal(V.cases.length, 42); assert.equal(V.margin.length, 26);
  for (const c of [...V.cases, ...V.margin]) assert.deepEqual(JSON.parse(JSON.stringify(run(calc, c))), c.out, c.name);
  /* 경계: 2/29 시작 · 말일 넘침 · 12월 단가 변경 · 보너스 상한 · 로트 순서(구매 → 보너스) */
  assert.deepEqual(calc.expiry('2028-02-29'), { validTo: '2029-02-28', carryTo: '2030-02-28' });
  assert.equal(calc.eligibleFrom('2027-01-31', 1), '2027-02-28'); assert.equal(calc.effectiveFrom('2027-12-15'), '2028-01-01');
  assert.equal(calc.wallet(30000000, false, 900).bonusBp, 700); assert.equal(calc.wallet(30000000, false, 900).bonusOver, true);
  assert.deepEqual(calc.useLots([{ id: 'b', kind: 'bonus', exp: '2028-01-01', remain: 10 }, { id: 'p', kind: 'paid', exp: '2028-01-01', remain: 5 }], 8).lots.map(l => l.take), [5, 3]);
  assert.equal(calc.useCredits(50000, 499, [{ fromN: 500, offBp: 1000 }]), 50); assert.equal(calc.useCredits(50000, 500, [{ fromN: 500, offBp: 1000 }]), 45);
  assert.equal(calc.settleLine(10, 7000).error, 'mk_cp_rate');
});

test('운영 서버: 콘텐츠 마켓', { skip: !process.env.DATABASE_URL }, async t => {
  const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const C = require(path.join(ROOT, 'tests', 'contract-market.js'));
  const pool = poolFrom(process.env); await migrate(pool); await migrate(pool); /* 두 번 적용해도 안전 */
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex'), PII_DEV_OTP: '1', FAC_SWEEP_MS: '0', LEDGER_SWEEP_MS: '0', SANTA_ADMIN_EMAILS: C.SANTA.join(',') }, log: process.env.MK_LOG ? console : {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  t.after(() => { app.close(); return pool.end(); });

  const R = await C.run(U, 'n'); if (process.env.DBG) console.log(JSON.stringify(R));
  const bad = C.check(R); assert.deepEqual(bad, [], bad.join('\n'));

  await t.test('마켓 표: 기관 역할 권한 없음 · 개인정보 열 없음 · 학습자는 해시만', async () => {
    const g = (await pool.query("select count(*)::int n from information_schema.role_table_grants where grantee = 'didisam_tenant' and table_name like 'mk\\_%'")).rows[0].n; assert.equal(g, 0);
    assert.equal((await pool.query("select count(*)::int n from pg_class where relname like 'mk\\_%' and relkind = 'r' and not (relrowsecurity and relforcerowsecurity)")).rows[0].n, 0); /* 모든 마켓 표 RLS FORCE */
    const cols = (await pool.query("select table_name, column_name from information_schema.columns where table_name like 'mk\\_%'")).rows; assert.ok(cols.length > 100);
    assert.deepEqual(cols.filter(x => /phone|email$|^name$|card|sid$|student/.test(x.column_name) && x.column_name !== 'by_email'), []);
    assert.equal((await pool.query("select count(*)::int n from mk_credit_use where sid_hash !~ '^[0-9a-f]{64}$'")).rows[0].n, 0);
  });
  await t.test('C1 RLS: 마켓 역할로 다른 기관 세션이면 지갑 · 차감 · 견적 · 계약 · 정산서 0행, 산타 세션만 전체', async () => {
    const as = async (tid, santa, sql) => { const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_market'); await c.query("select set_config('app.tenant', $1, true), set_config('app.santa', $2, true)", [tid, santa ? '1' : '0']); return (await c.query(sql)).rows[0].n; } finally { await c.query('rollback'); c.release(); } };
    const T = R.tids; const tables = ['mk_credit_wallet', 'mk_credit_use', 'mk_control', 'mk_preapproval', 'mk_quote', 'mk_contract'];
    for (const x of tables) { assert.equal(await as(T.D, false, `select count(*)::int n from ${x}`), 0, x + ' D'); assert.ok(await as(T.B, false, `select count(*)::int n from ${x}`) > 0, x + ' B'); }
    assert.equal(await as(T.E, false, 'select count(*)::int n from mk_stmt'), 0); assert.ok(await as(T.C, false, 'select count(*)::int n from mk_stmt') > 0);
    assert.equal(await as(T.B, false, 'select count(*)::int n from mk_stmt'), 0); assert.equal(await as(T.B, false, 'select count(*)::int n from mk_entry'), 0); assert.equal(await as(T.B, false, 'select count(*)::int n from mk_close'), 0);
    assert.ok(await as('', true, 'select count(*)::int n from mk_credit_wallet') > 0); assert.equal(await as('', false, 'select count(*)::int n from mk_contract'), 0); /* 범위 없으면 0행 */
    await assert.rejects(as(T.D, false, `insert into mk_contract (id, buyer_tid, quote_id, start, "end", carry_end, supply_total) select 'mk_zzzzzzzzzzzz', '${T.B}', id, current_date, current_date, current_date, 1 from mk_quote limit 1 returning 1 n`));
  });
  await t.test('마진 가드는 DB 제약으로도 막힘 · 장부 줄', async () => {
    await assert.rejects(pool.query("insert into mk_quote (id, buyer_tid, kind, supply_total, cp_max, santa_bp, valid_to) select 'mq_zzzzzzzzzzzz', id, 'credit', 1, 1, 2999, now() from tenants limit 1"));
    const k = (await pool.query("select kind, count(*)::int n from mk_entry group by kind")).rows.map(r => r.kind).sort();
    for (const x of ['credit_sale', 'credit_bonus', 'platform_bundle', 'credit_use', 'credit_restore', 'cp_use', 'santa_use', 'santa_orig', 'payout']) assert.ok(k.includes(x), x);
  });
  await t.test('상태 전환(tick): 유효 만료 → 이월 · 이월 만료 → ended', async () => {
    const k = (await pool.query("select id from mk_contract where status = 'active' and kind = 'credit' order by at limit 1")).rows[0];
    await pool.query("update mk_contract set \"end\" = current_date - 2 where id = $1", [k.id]); await app.marketTick();
    assert.equal((await pool.query('select status from mk_contract where id = $1', [k.id])).rows[0].status, 'carry');
    assert.equal((await pool.query("select count(*)::int n from mk_entry where kind = 'credit_carry' and contract_id = $1", [k.id])).rows[0].n, 1);
    await pool.query("update mk_contract set carry_end = current_date - 1 where id = $1", [k.id]); await app.marketTick();
    assert.equal((await pool.query('select status from mk_contract where id = $1', [k.id])).rows[0].status, 'ended');
  });
  await t.test('로그인 없이 401 · 없는 경로 404', async () => {
    assert.equal((await fetch(`${U}/api/market/home`)).status, 401);
    assert.equal((await fetch(`${U}/api/market/nope`)).status, 404);
  });
});
