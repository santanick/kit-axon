'use strict';
/* v10 학습자 API 테스트 — 게시본 · 학번+접근코드 로그인 · 학습 기록 · 기관 분리 · 어드민 반영 */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('학습자 사이트 API', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `la${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'univ', code: 'C0DE' })).j.tenant;
  const B = (await call('B', 'POST', '/api/signup', { email: `lb${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: 'B', type: 'univ', code: 'C0DE' })).j.tenant;
  const doc = (name, codes, pub) => ({ org: { name, type: 'univ', room: { mode: 'saas' } }, codes, members: [{ id: 'm1', sid: '20260001', name: '20260001' }], badges: [{ id: 'bd0', name: 'Explorer', issued: [{ who: 'm1', at: '2026-10-01', no: '1-0001', st: '유효' }] }], classes: [{ id: 'c0', prog: { m1: { p: 40 } } }], lsite: { pub } });

  await t.test('게시 전에는 404', async () => {
    await call('A', 'PUT', '/api/state', { doc: doc('A', [{ sid: '20260001', dept: '컴공', code: 'ABC234' }], null), rev: 0 });
    assert.equal((await call('X', 'GET', `/api/pub/${A.tid}/site`)).status, 404);
    assert.equal((await call('X', 'GET', '/api/pub/../site')).status, 404);
  });
  await t.test('게시본 · 로그인', async () => {
    await call('A', 'PUT', '/api/state', { doc: doc('A', [{ sid: '20260001', dept: '컴공', code: 'ABC234' }], { org: { name: 'A' }, pages: [] }), rev: 1 });
    const s = await call('X', 'GET', `/api/pub/${A.tid}/site`); assert.equal(s.j.site.org.name, 'A'); assert.ok(!JSON.stringify(s.j).includes('ABC234'));
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/login`, { sid: '20260001', code: 'WRONG1' })).status, 401);
    const ok = await call('L', 'POST', `/api/pub/${A.tid}/login`, { sid: '20260001', code: 'abc234' });
    assert.equal(ok.j.me.dept, '컴공'); assert.equal(ok.j.mine.badges.length, 1); assert.equal(ok.j.mine.cls.c0.p, 40);
  });
  await t.test('학습 기록 저장 · 정리', async () => {
    const lp = { tut: { tu1: { w: 0.9, steps: [true, true, true], mission: 'x' } }, cls: {}, diag: { dg0: { out: 'MAP' } }, days: { '2026-10-29': 3, 'bad': 1 }, evil: { a: 1 } };
    assert.equal((await call('L', 'PUT', `/api/pub/${A.tid}/progress`, { lp })).j.ok, true);
    const me = await call('L', 'GET', `/api/pub/${A.tid}/me`); assert.equal(me.j.lp.diag.dg0.out, 'MAP'); assert.equal(me.j.lp.evil, undefined); assert.deepEqual(me.j.lp.days, { '2026-10-29': 3 }); assert.equal(me.j.mine.cls.c0.p, 40);
  });
  await t.test('디지털북 기록 · 채점(mine.bk)', async () => {
    const prev = (await call('L', 'GET', `/api/pub/${A.tid}/me`)).j.lp; const lp = { ...prev, book: { bk1: { r: { ch1: 1 }, b: { b1: { done: true, score: 80 }, w1: { done: true, ans: '내 생각' } }, last: 0 }, '../x': { r: {} } } };
    await call('L', 'PUT', `/api/pub/${A.tid}/progress`, { lp });
    const d = doc('A', [{ sid: '20260001', dept: '컴공', code: 'ABC234' }], { org: { name: 'A' }, pages: [] }); d.bkgrades = { bk1: { '20260001': { w1: { score: 18, fb: '좋습니다' } }, '20269999': { w1: { score: 1 } } } };
    await call('A', 'PUT', '/api/state', { doc: d, rev: 2 });
    const me = await call('L', 'GET', `/api/pub/${A.tid}/me`); assert.equal(me.j.lp.book.bk1.b.b1.score, 80); assert.equal(me.j.lp.book['../x'], undefined);
    assert.deepEqual(me.j.mine.bk, { bk1: { w1: { score: 18, fb: '좋습니다' } } });
    const s = await call('X', 'GET', `/api/pub/${A.tid}/site`); assert.ok(!JSON.stringify(s.j).includes('좋습니다'));
  });
  await t.test('기관 분리: A 학습자 세션으로 B 접근 불가', async () => {
    await call('B', 'PUT', '/api/state', { doc: doc('B', [{ sid: '20260001', dept: '경영', code: 'ZZZ999' }], { org: { name: 'B' } }), rev: 0 });
    assert.equal((await call('L', 'GET', `/api/pub/${B.tid}/me`)).status, 401);
    assert.equal((await call('L', 'POST', `/api/pub/${B.tid}/login`, { sid: '20260001', code: 'ABC234' })).status, 401);
  });
  await t.test('어드민이 학습 기록을 읽음(자기 기관만)', async () => {
    assert.equal((await call('A', 'GET', '/api/learners/progress')).j.lp['20260001'].diag.dg0.out, 'MAP');
    assert.deepEqual((await call('B', 'GET', '/api/learners/progress')).j.lp, {});
  });
  await t.test('코드 삭제 → 로그인 · 세션 무효', async () => {
    await call('A', 'PUT', '/api/state', { doc: doc('A', [], { org: { name: 'A' } }), rev: 3 });
    assert.equal((await call('L', 'GET', `/api/pub/${A.tid}/me`)).status, 401);
    assert.equal((await call('L2', 'POST', `/api/pub/${A.tid}/login`, { sid: '20260001', code: 'ABC234' })).status, 401);
  });
  await t.test('learner.html은 같은 출처 프레임 허용', async () => {
    const r = await fetch(U + '/learner.html'); void r; // publicDir 없음 → 404, 헤더 검사는 t16에서
  });
  await pool.query('delete from tenants where id = any($1)', [[A.tid, B.tid]]);
  app.close(); await pool.end();
});
