'use strict';
/* v42 학습 마일리지 서버 — 기준값(tests/mileage-vectors.json)을 데모 엔진(milecalc.js) · SQL 함수(mil_*) 두 벌로 돌려 같은지, 계약 시나리오(tests/contract-mileage42.js, Node · Java 공용), DB 강제 규칙.
   DATABASE_URL=postgres://… node --test service/test/mileage42.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto'); const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..');
const RUN = require(path.join(ROOT, 'tests', 'mileage-run.js'));
const MC = require(path.join(ROOT, 'didisam', 'milecalc.js'));

test('서버 사본 = 화면 공용 파일', () => { const fs = require('node:fs'); assert.equal(fs.readFileSync(path.join(ROOT, 'didisam', 'milecalc.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '..', 'server', 'mileage', 'calc.js'), 'utf8'), 'service/server/mileage/calc.js는 didisam/milecalc.js 사본이어야 합니다'); });
test('기준값: 데모 엔진(milecalc.js)', () => { let n = 0; for (const v of RUN.VEC.vectors) { const bad = RUN.runJs(v); assert.deepEqual(bad, [], bad.join('\n')); n++; } assert.ok(n >= 28); });
test('템플릿 8종 · 권장값 경고(차감 30%)', () => { assert.equal(MC.TEMPLATES.length, 8); for (const k of MC.TEMPLATES) { const t = MC.template(null, k, null); assert.ok(t.rules.length > 0, k); assert.ok(!t.rewards.some(r => r.kind === 'tuition' || r.kind === 'coupon'), k + ' 예산 없으면 비현금형'); }
  assert.ok(MC.warnings({ budget: { monthP: 1 } }, [{ id: 'x', kind: 'tuition', maxUse: { billPct: 31 } }]).some(w => w.code === 'bill_pct'));
  assert.ok(!MC.warnings({ budget: { monthP: 1 } }, [{ id: 'x', kind: 'tuition', maxUse: { billPct: 30 } }]).some(w => w.code === 'bill_pct')); });

test('운영 서버: 마일리지', { skip: !process.env.DATABASE_URL }, async t => {
  const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp } = require('../server/app'); const C = require(path.join(ROOT, 'tests', 'contract-mileage42.js'));
  const pool = poolFrom(process.env); await migrate(pool); await migrate(pool);
  t.after(() => pool.end());
  await t.test('기준값: SQL 함수(mil_*) = 데모 엔진, 지갑 캐시 = 원장 합계(MV-28)', async () => { for (const v of RUN.VEC.vectors) { const bad = await RUN.runSql(pool, inTenant, v); assert.deepEqual(bad, [], bad.join('\n')); } });
  await t.test('DB 강제: 국비 lot 전환 가능 금지(MV-31) · 원장 삭제 · 수정 불가', async () => {
    const tid = await RUN.setup(pool, inTenant, { id: 'db', given: {} });
    await assert.rejects(inTenant(pool, tid, c => c.query("insert into mil_entry (tenant_id, id, sid, kind, points, funded, convertible) values ($1, 'me_aaaaaaaaaaaa', 's1', 'earn', 10, true, true)", [tid])), /mil_funded_cash/);
    await inTenant(pool, tid, c => c.query("insert into mil_entry (tenant_id, id, sid, kind, points) values ($1, 'me_bbbbbbbbbbbb', 's1', 'earn', 10)", [tid]));
    await assert.rejects(inTenant(pool, tid, c => c.query("delete from mil_entry where tenant_id = $1", [tid])), /permission denied/);
    await assert.rejects(inTenant(pool, tid, c => c.query("update mil_entry set points = 999 where tenant_id = $1", [tid])), /permission denied/);
    await assert.rejects(inTenant(pool, tid, c => c.query("insert into mil_entry (tenant_id, id, sid, kind, points) values ($1, 'me_cccccccccccc', 's1', 'use', 10)", [tid])), /mil_sign/);
  });
  await t.test('동시 신청 2건(잔액 1건분) → 1건만(MV-12 동시성)', async () => {
    const tid = await RUN.setup(pool, inTenant, { id: 'cc', given: { rules: [{ id: 'mru_l', trigger: 'lesson_done', score: { mode: 'fixed', v: 100 } }], rewards: [{ id: 'mrw_c', kind: 'coupon', title: 'c', approval: 'manual' }] } });
    await inTenant(pool, tid, c => c.query("select mil_emit($1,'s1','lesson_done','item','1',null,'A')", [tid]));
    const R = await Promise.all(['a', 'b', 'c'].map(k => inTenant(pool, tid, async c => (await c.query("select mil_redeem_req($1,'s1','mrw_c',100,$2) r", [tid, k])).rows[0].r)));
    assert.equal(R.filter(r => r.status === 'requested').length, 1); assert.equal(R.filter(r => r.error === 'insufficient').length, 2);
  });
  await t.test('비교과 이관 · 마감 트리거: 같은 키 중복 없음, 대조 0건(MV-19)', async () => {
    const tid = await RUN.setup(pool, inTenant, { id: 'q', given: { rules: [{ id: 'mru_nc', trigger: 'noncredit_done', score: { mode: 'source' } }] } });
    const ok = await inTenant(pool, tid, async c => { const p = (await c.query("insert into lms_q_program (tenant_id, title, status) values ($1, '봉사', 'closing') returning program_id", [tid])).rows[0].program_id;
      await c.query("insert into lms_q_application (tenant_id, program_id, member_no, status, completion, mileage, extra_mileage) values ($1,$2,'s1','approved','completed',30,5),($1,$2,'s2','approved','completed',30,0)", [tid, p]);
      const dry = (await c.query('select mil_import_q($1,true) r', [tid])).rows[0].r; await c.query("update lms_q_program set status = 'closed' where tenant_id = $1 and program_id = $2", [tid, p]);
      const run = (await c.query('select mil_import_q($1,false) r', [tid])).rows[0].r; return { dry, run, n: +(await c.query("select count(*) n from mil_entry where tenant_id = $1 and trigger = 'noncredit_done'", [tid])).rows[0].n }; }).catch(e => ({ err: e.message }));
    if (ok.err && /lms_q_program/.test(ok.err)) return t.skip('lms_q 표 없음'); assert.ok(!ok.err, ok.err);
    assert.equal(ok.n, 2); assert.equal(ok.run.diff, 0); assert.equal(ok.run.imported, 0); assert.equal(ok.dry.totalP, 0);
  });
  await t.test('계약 시나리오(contract-mileage42.js)', async () => {
    const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex'), PII_DEV_OTP: '1', LEDGER_SWEEP_MS: '0' }, log: process.env.MIL_LOG ? console : {} });
    await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
    try { const R = await C.run(U, 'n'); if (process.env.DBG) console.log(JSON.stringify(R)); const bad = C.check(R); assert.deepEqual(bad, [], bad.join('\n')); } finally { app.close(); }
  });
  await t.test('sweep: 소멸 · 고지 · 캐시 대조', async () => {
    const tid = await RUN.setup(pool, inTenant, { id: 'sw', given: { rules: [{ id: 'mru_l', trigger: 'lesson_done', score: { mode: 'fixed', v: 100 }, expiry: { mode: 'months', months: 1 } }] } });
    await inTenant(pool, tid, c => c.query("select mil_emit($1,'s1','lesson_done','item','1',null,'A',now() - interval '40 days')", [tid]));
    const { sweep } = require('../server/mileage/sweep'); const r = await inTenant(pool, tid, c => sweep(c, tid, null)); assert.equal(r.expired, 1);
    assert.equal((await inTenant(pool, tid, c => sweep(c, tid, null))).expired, 0);
  });
});
