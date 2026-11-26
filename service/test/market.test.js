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
  assert.equal(V.ui.length, 4);
  assert.equal(V.refund.length, 9); /* r3 C3 소멸 · 이월 · 해지 환불 R1~R9(policy v1.3 제19 · 19조의2 · 40조) */
  assert.equal(V.tax.length, 4); /* r3 C4 세금계산서 발행 대기 · 수정세금계산서 */
  for (const c of [...V.cases, ...V.margin, ...V.ui, ...V.refund, ...V.tax]) assert.deepEqual(JSON.parse(JSON.stringify(run(calc, c))), c.out, c.name);
  /* 경계: 2/29 시작 · 말일 넘침 · 12월 단가 변경 · 보너스 상한 · 로트 순서(구매 → 보너스) */
  assert.deepEqual(calc.expiry('2028-02-29'), { validTo: '2029-02-28', carryTo: '2029-02-28' }); /* r3 자동 이월 없음 */
  assert.equal(calc.eligibleFrom('2027-01-31', 1), '2027-02-28'); assert.equal(calc.effectiveFrom('2027-12-15'), '2028-01-01');
  assert.equal(calc.wallet(30000000, false, 900).bonusBp, 700); assert.equal(calc.wallet(30000000, false, 900).bonusOver, true);
  assert.deepEqual(calc.useLots([{ id: 'b', kind: 'bonus', exp: '2028-01-01', remain: 10 }, { id: 'p', kind: 'paid', exp: '2028-01-01', remain: 5 }], 8).lots.map(l => l.take), [5, 3]);
  assert.equal(calc.useCredits(50000, 499, [{ fromN: 500, offBp: 1000 }]), 50); assert.equal(calc.useCredits(50000, 500, [{ fromN: 500, offBp: 1000 }]), 45);
  assert.equal(calc.settleLine(10, 7000).error, 'mk_cp_rate');
  /* 모듈 게이트(MODULE=learner|tutor|admin, Java DdModule 같은 목록): 학습자 모듈은 mk-* 공개 경로만, 교강사는 카탈로그 조회만, 관리 모듈은 학습자 경로 차단 */
  const M = require('../server/modules');
  for (const a of ['mk-shelf', 'mk-list', 'mk-item', 'mk-start', 'mk-pre']) { assert.ok(M.apiAllowed('learner', 'GET', `/api/pub/tn_abcdefgh/${a}`), a); assert.ok(!M.apiAllowed('admin', 'POST', `/api/pub/tn_abcdefgh/${a}`), a); }
  assert.ok(!M.apiAllowed('learner', 'GET', '/api/market/home')); assert.ok(M.apiAllowed('tutor', 'GET', '/api/market/home')); assert.ok(!M.apiAllowed('tutor', 'POST', '/api/market/quotes')); assert.ok(M.apiAllowed('admin', 'POST', '/api/market/quotes'));
});

test('운영 서버: 콘텐츠 마켓', { skip: !process.env.DATABASE_URL }, async t => {
  const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const C = require(path.join(ROOT, 'tests', 'contract-market.js'));
  const pool = poolFrom(process.env); await migrate(pool); await migrate(pool); /* 두 번 적용해도 안전 */
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex'), PII_DEV_OTP: '1', FAC_SWEEP_MS: '0', LEDGER_SWEEP_MS: '0', SANTA_ADMIN_EMAILS: C.SANTA.join(',') }, log: process.env.MK_LOG ? console : {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  t.after(() => { app.close(); return pool.end(); });

  /* 마켓 표는 FORCE RLS — 비슈퍼유저 앱 계정(표 소유자)도 직접 읽을 수 없으므로 시험은 산타 범위로 읽고 쓴다 */
  const santa = async (sql, args) => { const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_market'); await c.query("select set_config('app.santa', '1', true)"); const r = await c.query(sql, args); await c.query('commit'); return r; } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); } };
  const R = await C.run(U, 'n'); if (process.env.DBG) console.log(JSON.stringify(R));
  const bad = C.check(R); assert.deepEqual(bad, [], bad.join('\n'));

  await t.test('광고 노출 선택: 켠 기관 응답에는 광고(ad:true), 끈 기관에는 0건(home · 학습자 진열대)', async () => {
    const { call, P, pa } = R._t; const ym = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
    const sh0 = ((await call('L1', 'GET', P('mk-shelf'))).j.shelf || [])[0]; const sp = sh0 && sh0.items[sh0.items.length - 1].id; /* 진열대 첫 줄 상품 */
    await santa("insert into mk_promo (id, cp_tid, product_id, slot, ym, fee, status) values ('mpr_zzzzzzzzzzz1', $1, $2, 'home_top', $3, 0, 'ok'), ('mpr_zzzzzzzzzzz2', $1, $4, 'shelf_top', $3, 0, 'ok')", [R.tids.C, pa, ym, sp || pa]);
    try { const ad = async () => [((await call('B', 'GET', '/api/market/home')).j.recommended || []).filter(x => x.ad).length, ((await call('L1', 'GET', P('mk-shelf'))).j.shelf || []).flatMap(x => x.items || []).filter(x => x.ad).length];
      assert.deepEqual(await ad(), [1, 1], '켬: 광고 1건씩 ' + sp + ' ' + JSON.stringify((await call('L1', 'GET', P('mk-shelf'))).j).slice(0, 600));
      assert.equal((await call('B', 'PUT', '/api/market/settings', { ads: false })).st, 200); assert.deepEqual(await ad(), [0, 0], '끔: 광고 0건');
      assert.equal((await santa("select count(*)::int n from audit_log where action = 'market.ads'").catch(() => ({ rows: [{ n: 1 }] }))).rows[0].n > 0, true);
    } finally { await call('B', 'PUT', '/api/market/settings', { ads: true }); await santa("delete from mk_promo where id like 'mpr_zzzzzzzzzzz%'"); }
  });
  await t.test('마켓 표: 기관 역할 권한 없음 · 개인정보 열 없음 · 학습자는 해시만', async () => {
    const g = (await pool.query("select count(*)::int n from information_schema.role_table_grants where grantee = 'didisam_tenant' and table_name like 'mk\\_%'")).rows[0].n; assert.equal(g, 0);
    assert.equal((await pool.query("select count(*)::int n from pg_class where relname like 'mk\\_%' and relkind = 'r' and not (relrowsecurity and relforcerowsecurity)")).rows[0].n, 0); /* 모든 마켓 표 RLS FORCE */
    const cols = (await pool.query("select table_name, column_name from information_schema.columns where table_name like 'mk\\_%'")).rows; assert.ok(cols.length > 100);
    assert.deepEqual(cols.filter(x => /phone|email$|^name$|card|sid$|student/.test(x.column_name) && x.column_name !== 'by_email'), []);
    assert.equal((await santa("select count(*)::int n from mk_credit_use where sid_hash !~ '^[0-9a-f]{64}$'")).rows[0].n, 0);
    if (!(await pool.query('select rolsuper from pg_roles where rolname = current_user')).rows[0].rolsuper) assert.equal((await pool.query('select count(*)::int n from mk_contract')).rows[0].n, 0, '앱 계정(소유자)도 역할 없이 마켓 표를 볼 수 없음'); /* 슈퍼유저 실행이면 이 줄은 건너뜀 */
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
    await assert.rejects(santa("insert into mk_quote (id, buyer_tid, kind, supply_total, cp_max, santa_bp, valid_to) select 'mq_zzzzzzzzzzzz', id, 'credit', 1, 1, 2999, now() from tenants limit 1"));
    const k = (await santa("select kind, count(*)::int n from mk_entry group by kind")).rows.map(r => r.kind).sort();
    for (const x of ['credit_sale', 'credit_bonus', 'platform_bundle', 'credit_use', 'credit_restore', 'cp_use', 'santa_use', 'santa_orig', 'payout']) assert.ok(k.includes(x), x);
  });
  await t.test('상태 전환(tick): 유효 만료 → 이월 · 이월 만료 → ended', async () => {
    const k = (await santa("select id from mk_contract where status = 'active' and kind = 'credit' order by at limit 1")).rows[0];
    await santa("update mk_contract set \"end\" = current_date - 2 where id = $1", [k.id]); await app.marketTick();
    assert.equal((await santa('select status from mk_contract where id = $1', [k.id])).rows[0].status, 'carry');
    assert.equal((await santa("select count(*)::int n from mk_entry where kind = 'credit_carry' and contract_id = $1", [k.id])).rows[0].n, 1);
    await santa("update mk_contract set carry_end = current_date - 1 where id = $1", [k.id]); await app.marketTick();
    assert.equal((await santa('select status from mk_contract where id = $1', [k.id])).rows[0].status, 'ended');
    assert.equal((await santa("select count(*)::int n from mk_entry where kind = 'lapse' and contract_id = $1", [k.id])).rows[0].n, 1, 'r3 소멸 장부(lapse)');
  });
  await t.test('r3 C11 만료 고지 90 · 30 · 7일(주말이면 직전 금요일) · 한 번만', async () => {
    const sw = require('../server/market/sweep'); const ad = calc.addDays;
    assert.equal(sw.dueNotice('2027-05-03', '2027-08-01', ad), 90); assert.equal(sw.dueNotice('2027-05-04', '2027-08-01', ad), 0);
    assert.equal(sw.dueNotice('2027-07-23', '2027-08-01', ad), 7, '일요일 → 직전 금요일'); assert.equal(sw.dueNotice('2027-07-23', '2027-07-31', ad), 7, '토요일 → 금요일');
    assert.equal(sw.dueNotice('2027-07-23', '2027-07-30', ad), 7); assert.equal(sw.dueNotice('2027-07-16', '2027-08-01', ad), 0); assert.equal(sw.dueNotice('2027-07-02', '2027-08-01', ad), 30);
    const k = (await santa("select id from mk_contract where status = 'active' and kind = 'credit' order by at limit 1")).rows[0];
    if (k) { await santa("update mk_contract set \"end\" = current_date + 30, carry_end = current_date + 30 where id = $1", [k.id]); await app.marketTick(); await app.marketTick();
      const t2 = (await santa('select terms from mk_contract where id = $1', [k.id])).rows[0].terms || {}; const dow = new Date(Date.now() + 9 * 3600e3).getUTCDay();
      if (dow !== 0 && dow !== 6) assert.deepEqual(t2.notices, ['30'], '30일 고지 한 번'); }
  });
  await t.test('C5 크레딧 사용처 제한: 기관 간 중개 상품(seller)은 크레딧 차감 불가(409 mk_credit_scope)', async () => {
    const { call, P, pa } = R._t; await santa("update mk_product set owner_kind = 'seller' where id = $1", [pa]);
    try { const r = await call('L2', 'POST', P('mk-start'), { productId: pa, idem: 'scope1' }); assert.equal(r.st, 409); assert.equal(r.j.error, 'mk_credit_scope'); }
    finally { await santa("update mk_product set owner_kind = 'cp' where id = $1", [pa]); }
  });
  await t.test('사용자에게 보이는 「법무 검토 필요 · 검증 필요」 문자열 0건(C10-3)', () => {
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (/node_modules|test/.test(e.name) ? [] : walk(path.join(d, e.name))) : /\.(js|java)$/.test(e.name) ? [path.join(d, e.name)] : []);
    const hit = [...walk(path.join(ROOT, 'didisam')), ...walk(path.join(ROOT, 'service', 'server')), ...walk(path.join(ROOT, 'service-egov', 'src'))].filter(f => /법무 검토 필요|검증 필요/.test(fs.readFileSync(f, 'utf8')));
    assert.deepEqual(hit.map(f => path.relative(ROOT, f)), []);
  });
  await t.test('로그인 없이 401 · 없는 경로 404', async () => {
    assert.equal((await fetch(`${U}/api/market/home`)).status, 401);
    assert.equal((await fetch(`${U}/api/market/nope`)).status, 404);
  });
});
