'use strict';
/* v41.0 통합 수납 원장 서버 — 계산 기준값(tests/ledger-vectors.json) · 계약 시나리오(tests/contract-ledger41.js, 같은 프로세스 서버 + 토스 모의) · DB 확인(시설 이중 기록 유일 · 결제창 이탈 정리 · 비밀키 암호화).
   DATABASE_URL=postgres://… node --test service/test/ledger41.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto'); const path = require('node:path'); const fs = require('node:fs');
const ROOT = path.join(__dirname, '..', '..');
const calc = require('../server/ledger/calc');
const V = require(path.join(ROOT, 'tests', 'ledger-vectors.json'));

test('계산 기준값(ledger-vectors.json) · 화면 공용 파일과 서버 사본 동일', () => {
  assert.equal(fs.readFileSync(path.join(ROOT, 'didisam', 'ledgercalc.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '..', 'server', 'ledger', 'calc.js'), 'utf8'), 'service/server/ledger/calc.js는 didisam/ledgercalc.js 사본이어야 합니다');
  const run = { balance: v => calc.balance(v.in.charges, v.in.allocs), allocate: v => calc.allocate(v.in.amount, v.in.open), summary: v => calc.summary(v.in.rows, v.in.opt), share: v => calc.share(v.in.rows, v.in.units), refund: v => calc.refund(v.in), match: v => calc.match(v.in.rows, v.in.cands, v.in.opt) };
  let n = 0; for (const k of Object.keys(run)) for (const v of V[k]) { assert.deepEqual(JSON.parse(JSON.stringify(run[k](v))), v.out, `${k} ${v.name}`); n++; }
  assert.ok(n >= 30);
  assert.deepEqual(calc.csvRows('﻿a,"b,1"\r\n"x""y",2\n\n'), [['a', 'b,1'], ['x"y', '2']]);
});

test('운영 서버: 통합 수납 원장', { skip: !process.env.DATABASE_URL }, async t => {
  const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp } = require('../server/app'); const C = require(path.join(ROOT, 'tests', 'contract-ledger41.js'));
  const pool = poolFrom(process.env); await migrate(pool); await migrate(pool); /* 두 번 적용해도 안전 */
  const mock = await C.tossMock(0);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex'), PII_DEV_OTP: '1', FAC_SWEEP_MS: '0', LEDGER_SWEEP_MS: '0', TOSS_URL: `http://127.0.0.1:${mock.port}` }, log: process.env.LED_LOG ? console : {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  t.after(() => { app.close(); mock.srv.close(); return pool.end(); });

  const R = await C.run(U, 'n', mock); if (process.env.DBG) console.log(JSON.stringify(R));
  const bad = C.check(R); assert.deepEqual(bad, [], bad.join('\n'));

  const tid = (await pool.query("select id from tenants where name = '원장 학원' order by created_at desc limit 1")).rows[0].id;
  await t.test('시설 이중 기록: 같은 결제를 다시 paid로 바꿔도 원장 한 줄, 비밀키는 암호문만', async () => {
    await inTenant(pool, tid, async c => {
      const fp = (await c.query("select id from fac_payment where tenant_id = $1 and status = 'paid' limit 1", [tid])).rows[0];
      await c.query("update fac_payment set status = 'paid' where tenant_id = $1 and id = $2", [tid, fp.id]);
      assert.equal((await c.query('select count(*)::int n from led_receipt where tenant_id = $1 and legacy_ref = $2', [tid, 'fac_payment:' + fp.id])).rows[0].n, 1);
      const u = (await c.query("select toss_secret_enc s from led_unit where tenant_id = $1 and id = 'lu_branch1'", [tid])).rows[0];
      assert.ok(u.s.startsWith('enc1:v1.') && !u.s.includes(C.SK));
      assert.equal((await c.query("select count(*)::int n from audit_log where tenant_id = $1 and detail::text like $2", [tid, '%' + C.SK + '%'])).rows[0].n, 0);
    });
  });
  await t.test('결제창 이탈 ready → 30분 뒤 failed(요청 때 정리)', async () => {
    const id = await inTenant(pool, tid, async c => { const x = (await c.query("select id from led_receipt where tenant_id = $1 and status = 'ready' limit 1", [tid])).rows[0]; if (x) await c.query("update led_receipt set created_at = now() - interval '31 minutes' where tenant_id = $1 and id = $2", [tid, x.id]); return x && x.id; });
    if (!id) return; await app.ledgerTick();
    assert.equal((await inTenant(pool, tid, c => c.query('select status from led_receipt where tenant_id = $1 and id = $2', [tid, id]))).rows[0].status, 'failed');
  });
  await t.test('로그인 없이 운영 경로 401 · 원장 표에 개인정보 열 없음', async () => {
    assert.equal((await fetch(`${U}/api/ledger/summary`)).status, 401);
    assert.equal((await fetch(`${U}/api/ledger/device-push`, { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: '{}' })).status, 401);
    const cols = (await pool.query("select table_name, column_name from information_schema.columns where table_name like 'led\\_%'")).rows;
    assert.ok(cols.length > 40); assert.deepEqual(cols.filter(x => /name$|phone|email|card_no|card_number|account/.test(x.column_name) && !['file_name'].includes(x.column_name) && !(x.table_name === 'led_unit' && x.column_name === 'name')), []);
  });
});
