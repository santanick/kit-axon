'use strict';
/* v30 규정 준수 API — 활동 로그 · 1일 제한 · 동시접속 방지 · 본인확인 미연동 · 기관 분리 */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('규정 준수 API', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36);
  const su = await call('A', 'POST', '/api/signup', { email: `ca${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'voc', code: 'C0DE' });
  const tid = su.j.tenant && su.j.tenant.tid; assert.ok(tid, JSON.stringify(su.j));
  const doc = cpl => ({ org: { name: 'A', type: 'voc', room: { mode: 'saas' }, cpl }, codes: [{ sid: 'T0001', dept: '1반', code: 'ABC234' }], members: [{ id: 'm1', sid: 'T0001', name: 'T0001' }], classes: [], lsite: { pub: { org: { name: 'A', type: 'voc' }, classes: [], tuts: [] } } });
  let rev = (await call('A', 'GET', '/api/state')).j.rev || 0;
  const put = async cpl => { const r = await call('A', 'PUT', '/api/state', { doc: doc(cpl), rev }); assert.equal(r.status, 200, JSON.stringify(r.j)); rev = r.j.rev; };
  await put({ on: true, single: true, dayMax: 1 });
  const login = who => call(who, 'POST', `/api/pub/${tid}/login`, { sid: 'T0001', code: 'ABC234' });

  await t.test('동시접속: 새 로그인이 이전 세션을 끊는다', async () => {
    assert.equal((await login('L1')).status, 200); assert.equal((await call('L1', 'GET', `/api/pub/${tid}/me`)).status, 200);
    assert.equal((await login('L2')).status, 200);
    assert.equal((await call('L1', 'GET', `/api/pub/${tid}/me`)).status, 401);
    assert.equal((await call('L2', 'GET', `/api/pub/${tid}/me`)).status, 200);
  });
  await t.test('학습시간: 서버 합산 · 값 검증 · 1일 제한', async () => {
    const beat = secs => call('L2', 'POST', `/api/pub/${tid}/cpl`, { kind: 'beat', cls: 'c1', item: 'i1', secs });
    assert.equal((await beat(0)).status, 400); assert.equal((await beat(61)).status, 400);
    const r = await beat(30); assert.equal(r.status, 200); assert.equal(r.j.today, 30); assert.equal(r.j.max, 3600); assert.equal(r.j.over, false);
    const r1b = await beat(60); assert.ok(r1b.j.today <= 30 + 6, '실제 경과 시간보다 많이 적립하지 않음: ' + r1b.j.today);
    const had = r1b.j.today; await pool.query("insert into cpl_log (tenant_id, sid, kind, cls, item, secs, at) values ($1, 'T0001', 'beat', 'c1', 'i1', $2, now() - interval '5 minutes')", [tid, 3560 - had + 30]);
    await pool.query("update cpl_log set at = now() - interval '5 minutes' where tenant_id = $1 and kind = 'beat'", [tid]);
    const r2 = await beat(60); assert.equal(r2.j.today, 3600, '제한을 넘겨 적립하지 않음'); assert.equal(r2.j.over, true);
    const r3 = await beat(60); assert.equal(r3.j.today, 3600); assert.equal(r3.j.over, true);
  });
  await t.test('본인확인: 제공사 미연동이면 501', async () => {
    const r = await call('L2', 'POST', `/api/pub/${tid}/cpl`, { kind: 'verify-start', method: 'motp' });
    assert.equal(r.status, 501); assert.equal(r.j.code || r.j.error, 'provider_missing');
  });
  await t.test('QR 출결: 코드 검증 · 만료 · 중복 없음', async () => {
    await put({ on: true, single: true, dayMax: 1, attend: { cls: 'c1', code: 'QR1234', exp: Date.now() + 60000 } });
    const att = code => call('L2', 'POST', `/api/pub/${tid}/cpl`, { kind: 'attend', cls: 'c1', code });
    assert.equal((await att('NOPE')).status, 400); assert.equal((await att('QR1234')).status, 200); assert.equal((await att('QR1234')).status, 200);
    const n = (await pool.query("select count(*)::int n from cpl_log where tenant_id = $1 and kind = 'attend'", [tid])).rows[0].n; assert.equal(n, 1);
    await put({ on: true, single: true, dayMax: 1, attend: { cls: 'c1', code: 'OLD999', exp: Date.now() - 1000 } }); assert.equal((await att('OLD999')).status, 400);
  });
  await t.test('서버 채점: 정답 비공개 · 무작위 출제 · 재응시 · 위조 차단', async () => {
    const qs = Array.from({ length: 6 }, (_, i) => ({ t: 'mc', q: 'Q' + i, opts: ['a', 'b'], a: 0, pts: 10 }));
    const D = { ...doc({ on: true, single: true, pass: 60 }), classes: [{ id: 'cx', name: 'X', curriculum: [{ id: 'e1', type: 'exam', time: 30, cplN: 2, qs, rules: { retry: { mode: 'count', v: 2 }, pass: { on: true, v: 60 } } }, { id: 'e2', type: 'exam', time: 1, qs }, { id: 'v1', type: 'video' }] }] };
    const r0 = await call('A', 'PUT', '/api/state', { doc: D, rev }); assert.equal(r0.status, 200); rev = r0.j.rev; const px = `/api/pub/${tid}/cpl`;
    const s = await call('L2', 'POST', px, { kind: 'exam-start', cls: 'cx', item: 'e1' }); assert.equal(s.status, 200, JSON.stringify(s.j)); assert.equal(s.j.qs.length, 2); assert.ok(s.j.qs.every(q => !('a' in q)), '정답 미전송'); assert.ok(s.j.end > Date.now());
    const again = await call('L2', 'POST', px, { kind: 'exam-start', cls: 'cx', item: 'e1' }); assert.equal(again.j.attempt, s.j.attempt, '재시작해도 같은 응시'); assert.equal(again.j.end, s.j.end, '시간 초기화 없음');
    assert.equal((await call('L2', 'POST', px, { kind: 'exam-start', cls: 'cx', item: 'v1' })).status, 400); assert.equal((await call('L2', 'POST', px, { kind: 'exam-start', cls: 'nope', item: 'e1' })).status, 400);
    const wrong = {}; s.j.qs.forEach(q => { wrong[q.i] = '1'; }); const w = await call('L2', 'POST', px, { kind: 'exam-submit', attempt: s.j.attempt, ans: wrong }); assert.equal(w.j.score, 0); assert.equal(w.j.pass, false); assert.ok(w.j.res.every(x => !('a' in x)));
    assert.equal((await call('L2', 'POST', px, { kind: 'exam-submit', attempt: s.j.attempt, ans: wrong })).status, 400, '중복 제출 차단');
    const s2 = await call('L2', 'POST', px, { kind: 'exam-start', cls: 'cx', item: 'e1' }); const good = {}; s2.j.qs.forEach(q => { good[q.i] = '0'; }); const g = await call('L2', 'POST', px, { kind: 'exam-submit', attempt: s2.j.attempt, ans: good }); assert.equal(g.j.score, 100); assert.equal(g.j.pass, true);
    assert.equal((await call('L2', 'POST', px, { kind: 'exam-start', cls: 'cx', item: 'e1' })).status, 400, '재응시 한도');
    const s3 = await call('L2', 'POST', px, { kind: 'exam-start', cls: 'cx', item: 'e2' }); await pool.query("update cpl_exam set ends_at = now() - interval '5 minutes' where id = $1", [s3.j.attempt]); const g3 = {}; s3.j.qs.forEach(q => { g3[q.i] = '0'; }); const late = await call('L2', 'POST', px, { kind: 'exam-submit', attempt: s3.j.attempt, ans: g3 }); assert.equal(late.j.late, true); assert.equal(late.j.score, 0, '시간 초과 답안 무효');
    const ex = await call('A', 'GET', '/api/cpl/exams'); assert.equal(ex.status, 200); assert.ok(ex.j.rows.some(x => x.item === 'e1' && x.score === 100)); assert.equal((await call('anon', 'GET', '/api/cpl/exams')).status, 401);
    await put({ on: true, single: true, dayMax: 1 });
  });
  await t.test('공단 체크리스트: 1일 8차시 · 재응시 · 결과 공개', async () => {
    await put({ on: true, single: true, dayMax: 8, dayChasi: 2 }); const px = `/api/pub/${tid}/cpl`;
    await pool.query("delete from cpl_log where tenant_id = $1 and kind = 'beat'", [tid]);
    const beat = item => call('L2', 'POST', px, { kind: 'beat', cls: 'c9', item, secs: 5 });
    assert.equal((await beat('a')).j.over, false); assert.equal((await beat('b')).j.over, false); const third = await beat('c'); assert.equal(third.j.over, true); assert.equal(third.j.chasi, true); assert.equal((await beat('a')).j.over, false, '오늘 들은 차시는 계속 가능');
    const qs = Array.from({ length: 4 }, (_, i) => ({ t: 'mc', q: 'Q' + i, opts: ['a', 'b'], a: 0 })); const mk = end => ({ ...doc({ on: true, profile: 'moel-entrust', pass: 60 }), classes: [{ id: 'cz', name: 'Z', end, curriculum: [{ id: 'e1', type: 'exam', time: 30, qs }] }] });
    const save = async d => { const r = await call('A', 'PUT', '/api/state', { doc: d, rev }); assert.equal(r.status, 200); rev = r.j.rev; };
    const fut = new Date(Date.now() + 864e6).toISOString().slice(0, 10), past = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10), old = new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10);
    await save(mk(fut)); const go = () => call('L2', 'POST', px, { kind: 'exam-start', cls: 'cz', item: 'e1' }); const s = await go(); const w = {}; s.j.qs.forEach(q => { w[q.i] = '1'; }); const r = await call('L2', 'POST', px, { kind: 'exam-submit', attempt: s.j.attempt, ans: w }); assert.equal(r.j.score, 0); assert.equal(r.j.res.length, 0, '훈련 종료 1주 전에는 문항별 결과 미공개');
    assert.equal((await go()).status, 400, '훈련 기간 중 재응시 불가');
    await save(mk(past)); const s2 = await go(); assert.equal(s2.status, 200, 'N차 평가 가능'); const g = {}; s2.j.qs.forEach(q => { g[q.i] = '0'; }); assert.equal((await call('L2', 'POST', px, { kind: 'exam-submit', attempt: s2.j.attempt, ans: g })).j.score, 100); assert.equal((await go()).status, 400, 'N차는 1회');
    await save(mk(old)); assert.equal((await go()).status, 400);
    await put({ on: true, single: true, dayMax: 1 });
  });
  await t.test('운영자: 집계 · 로그 조회, 로그인 필요', async () => {
    const s = await call('A', 'GET', '/api/cpl/summary'); assert.equal(s.status, 200); const row = s.j.rows.find(x => x.sid === 'T0001'); assert.ok(row && row.secs >= 5); assert.ok(row.ips >= 1);
    const l = await call('A', 'GET', '/api/cpl/logs?sid=T0001&limit=5'); assert.equal(l.status, 200); assert.ok(l.j.rows.length >= 1); assert.ok('ip' in l.j.rows[0]);
    assert.equal((await call('anon', 'GET', '/api/cpl/summary')).status, 401);
  });
  await t.test('기관 분리: 다른 기관에 보이지 않음', async () => {
    await call('B', 'POST', '/api/signup', { email: `cb${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: 'B', type: 'voc', code: 'C0DE' });
    const s = await call('B', 'GET', '/api/cpl/summary'); assert.equal(s.status, 200); assert.equal(s.j.rows.length, 0);
  });
  await t.test('정책이 꺼진 기관은 활동을 기록하지 않음', async () => {
    await put({ on: false }); const r = await call('L2', 'POST', `/api/pub/${tid}/cpl`, { kind: 'beat', cls: 'c1', item: 'i2', secs: 10 }); assert.equal(r.status, 200); assert.equal(r.j.max, 0);
    const n = (await pool.query("select count(*)::int n from cpl_log where tenant_id = $1 and item = 'i2'", [tid])).rows[0].n; assert.equal(n, 0);
  });
  await new Promise(ok => app.close(ok)); await pool.end();
});
