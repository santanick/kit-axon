'use strict';
const { adminPool, closeAdmin, NEED } = require('./_admin'); // QA8: 비슈퍼유저 DB에서는 직접 조회만 슈퍼유저 연결로(서버는 RLS 아래 그대로)
/* 가디언 4차(인증 크로스체크 #2 · #3 · #4 · #8 · #9) — 운영자 유휴 차단 · 최대 수명 · 세션 쿠키 · 동시 접속 · 작업 모드 · 기관 보안 설정 · 학습자 세션 · 잠금
   DATABASE_URL=postgresql://… node --test service/test/session.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('세션 정책', async t => {
  const pool = poolFrom(process.env); await migrate(pool); const adm = await adminPool(pool); if (!adm) { await pool.end(); t.skip(NEED); return; }
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex'), PII_DEV_OTP: '1', MFA_OFF: '1' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jars = {}; const raw = {}; const call = async (who, method, path, body) => {
    const J = jars[who] || (jars[who] = {});
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); J[kv.slice(0, i)] = kv.slice(i + 1); raw[who + ':' + kv.slice(0, i)] = c; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sha = s => crypto.createHash('sha256').update(s).digest('hex'); const sidOf = who => sha(jars[who].dd_sid);
  const left = async who => (await adm.query('select extract(epoch from expires_at - now())::int s from sessions where id = $1', [sidOf(who)])).rows[0];
  const acts = async (actor, act) => (await adm.query('select detail from audit_log where actor = $1 and action = $2 order by id', [actor, act])).rows.map(r => r.detail);
  const sfx = Date.now().toString(36); const OW = `ss${sfx}@d.kr`, PW = 'Passw0rd-ses'; let tid;

  await t.test('세션 쿠키 · 기본 유휴 60분 · 같은 브라우저 재로그인은 교체', async () => {
    const s = await call('A', 'POST', '/api/signup', { email: OW, password: PW, orgName: 'S', type: 'univ', code: 'C0DE' }); assert.equal(s.status, 200); tid = s.j.tenant.tid;
    assert.ok(!/Max-Age/i.test(raw['A:dd_sid']), '운영자 쿠키는 Max-Age 없음: ' + raw['A:dd_sid']);
    const i = await call('A', 'GET', '/api/session'); assert.equal(i.status, 200); assert.equal(i.j.idleMin, 60); assert.ok(i.j.remain > 3500 && i.j.remain <= 3600); assert.equal(i.j.work, null);
    assert.ok(Date.parse(i.j.maxAt) - Date.now() > 11.9 * 3600e3 && Date.parse(i.j.maxAt) - Date.now() <= 12 * 3600e3);
    const old = sidOf('A'); const l = await call('A', 'POST', '/api/login', { email: OW, password: PW }); assert.equal(l.status, 200);
    assert.deepEqual(Object.keys(l.j).sort(), ['tenant', 'user'], '다른 세션 없으면 others 생략');
    assert.equal((await adm.query('select 1 from sessions where id = $1', [old])).rowCount, 0, '이전 세션 삭제');
    assert.equal((await call('X', 'GET', '/api/session')).status, 401);
  });
  await t.test('동시 접속 알림 · 로그인 기기 목록', async () => {
    const l = await call('B', 'POST', '/api/login', { email: OW, password: PW }); assert.equal(l.j.others, 1);
    const m = await call('A', 'GET', '/api/me/sessions'); assert.equal(m.j.rows.length, 2); assert.equal(m.j.rows.filter(r => r.current).length, 1);
    assert.deepEqual(Object.keys(m.j.rows[0]).sort(), ['agent', 'band', 'createdAt', 'current', 'expiresAt', 'id', 'lastAt']); assert.equal(m.j.rows[0].id.length, 12);
  });
  await t.test('쓰는 동안 연장 · 조회는 연장 안 함 · 유휴 만료 · 최대 12시간', async () => {
    await adm.query("update sessions set expires_at = now() + interval '10 minutes' where id = $1", [sidOf('A')]);
    await call('A', 'GET', '/api/session'); assert.ok((await left('A')).s <= 600, '조회(peek)는 연장 안 함');
    await call('A', 'GET', '/api/me'); assert.ok((await left('A')).s > 3500, '사용하면 60분으로 연장');
    await adm.query("update sessions set expires_at = now() + interval '40 minutes' where id = $1", [sidOf('A')]);
    await call('A', 'GET', '/api/me'); assert.ok((await left('A')).s <= 2400, '절반 이상 남으면 쓰기 없음');
    const t1 = await call('A', 'POST', '/api/session/touch'); assert.ok(t1.j.remain > 3500, '계속 사용');
    await adm.query("update sessions set expires_at = now() - interval '1 second' where id = $1", [sidOf('B')]);
    assert.equal((await call('B', 'GET', '/api/me')).status, 401, '유휴 만료');
    await call('B', 'POST', '/api/login', { email: OW, password: PW });
    await adm.query("update sessions set created_at = now() - interval '12 hours 1 minute' where id = $1", [sidOf('B')]);
    assert.equal((await call('B', 'GET', '/api/me')).status, 401, '최대 수명 12시간');
    await adm.query("update sessions set created_at = now() - interval '11 hours 50 minutes' where id = $1", [sidOf('A')]);
    await call('A', 'POST', '/api/session/touch'); const r = await left('A'); assert.ok(r.s <= 600 && r.s > 500, '연장도 최대 수명을 넘지 않음: ' + r.s);
    await adm.query("update sessions set created_at = now() where id = $1", [sidOf('A')]);
  });
  await t.test('작업 모드', async () => {
    assert.equal((await call('A', 'POST', '/api/session/work', { minutes: 300, reason: '성적 입력' })).j.error, 'work_minutes');
    assert.equal((await call('A', 'POST', '/api/session/work', { minutes: 120, reason: ' ' })).j.error, 'work_reason');
    const w = await call('A', 'POST', '/api/session/work', { minutes: 120, reason: '성적 일괄 입력' }); assert.equal(w.status, 200); assert.equal(w.j.work.reason, '성적 일괄 입력');
    assert.ok(Date.parse(w.j.work.until) - Date.now() > 119 * 60e3); assert.ok(w.j.remain > 7100, '작업 모드 끝까지 유지');
    assert.deepEqual((await acts(OW, 'session.work')).pop(), { minutes: 120, reason: '성적 일괄 입력' });
    const e = await call('A', 'POST', '/api/session/work', { minutes: 0 }); assert.equal(e.j.work, null); assert.ok(e.j.remain <= 3600); assert.equal((await acts(OW, 'session.work_end')).length, 1);
  });
  await t.test('기관 보안 설정(정운영자) · 상태 저장으로 덮어쓰지 않음', async () => {
    assert.equal((await call('A', 'POST', '/api/org/security', { idleMin: 20 })).j.error, 'state_first');
    assert.equal((await call('A', 'PUT', '/api/state', { doc: { org: { name: 'S', type: 'univ', room: { mode: 'saas' } } }, rev: 0 })).status, 200);
    assert.equal((await call('A', 'POST', '/api/org/security', { idleMin: 5 })).j.error, 'idle_min');
    assert.equal((await call('A', 'POST', '/api/org/security', { maxSessions: 11 })).j.error, 'max_sessions');
    assert.equal((await call('A', 'POST', '/api/org/security', { mfa: 'sms' })).j.error, 'sec_mfa');
    const o = await call('A', 'POST', '/api/org/security', { idleMin: 20, mfa: 'totp' }); assert.deepEqual(o.j, { idleMin: 20, maxSessions: 0, mfa: 'totp', idleDefault: 60, maxHours: 12 });
    assert.equal((await acts(OW, 'org.sec')).length, 1);
    const st = await call('A', 'GET', '/api/state'); const doc = st.j.doc; doc.org.sec = { idleMin: 60, maxSessions: 0, mfa: 'email' };
    assert.equal((await call('A', 'PUT', '/api/state', { doc, rev: st.j.rev })).status, 200);
    assert.deepEqual((await call('A', 'GET', '/api/org/security')).j.idleMin, 20, '클라이언트 저장이 보안 정책을 바꾸지 못함');
    await call('A', 'POST', '/api/session/touch'); assert.equal((await call('A', 'GET', '/api/session')).j.idleMin, 20); assert.ok((await left('A')).s <= 1200);
    /* 부운영자는 조회만 */
    const s = await call('A', 'POST', '/api/staff', { email: `sub${sfx}@d.kr`, role: 'sub' }); await call('S', 'POST', '/api/login', { email: `sub${sfx}@d.kr`, password: s.j.password }); await call('S', 'POST', '/api/password', { current: s.j.password, next: 'Passw0rd-sub1' });
    assert.equal((await call('S', 'GET', '/api/org/security')).status, 200); assert.equal((await call('S', 'POST', '/api/org/security', { idleMin: 60 })).j.error, 'role');
  });
  await t.test('동시 세션 제한 · 다른 기기 모두 로그아웃', async () => {
    await call('B', 'POST', '/api/login', { email: OW, password: PW });
    await call('A', 'POST', '/api/org/security', { maxSessions: 1 });
    const c = await call('C', 'POST', '/api/login', { email: OW, password: PW }); assert.equal(c.status, 200); assert.equal(c.j.others, undefined);
    assert.equal((await call('A', 'GET', '/api/me')).status, 401); assert.equal((await call('B', 'GET', '/api/me')).status, 401);
    assert.ok((await acts(OW, 'session.evict')).pop().n >= 2);
    assert.equal((await call('C', 'POST', '/api/org/security', { maxSessions: 0 })).status, 200); await call('A', 'POST', '/api/login', { email: OW, password: PW }); await call('B', 'POST', '/api/login', { email: OW, password: PW });
    const lo = await call('B', 'POST', '/api/me/sessions/logout-others'); assert.equal(lo.j.n, 2, 'A · C 종료');
    assert.equal((await call('A', 'GET', '/api/me')).status, 401); assert.equal((await call('B', 'GET', '/api/me')).status, 200);
  });
  await t.test('학습자: 학번 로그인 keep:false는 세션 쿠키 · 12시간, 유지 켬은 마지막 사용 + 30일', async () => {
    const st = await call('B', 'GET', '/api/state'); const doc = st.j.doc; doc.codes = [{ sid: '20261234', dept: '컴공', code: 'ABC234' }];
    assert.equal((await call('B', 'PUT', '/api/state', { doc, rev: st.j.rev })).status, 200);
    const l1 = await call('L1', 'POST', `/api/pub/${tid}/login`, { sid: '20261234', code: 'ABC234', keep: false }); assert.equal(l1.status, 200);
    assert.ok(!/Max-Age/i.test(raw['L1:dd_lsid'])); const r1 = (await adm.query('select keep, extract(epoch from expires_at - now())::int s from learner_sessions where id = $1', [sha(jars.L1.dd_lsid)])).rows[0];
    assert.equal(r1.keep, false); assert.ok(r1.s <= 12 * 3600 && r1.s > 11 * 3600);
    const l2 = await call('L2', 'POST', `/api/pub/${tid}/login`, { sid: '20261234', code: 'ABC234' }); assert.equal(l2.status, 200); assert.match(raw['L2:dd_lsid'], /Max-Age=2592000/);
    const id2 = sha(jars.L2.dd_lsid); await adm.query("update learner_sessions set last_at = now() - interval '2 minutes', expires_at = now() + interval '1 day' where id = $1", [id2]);
    await call('L2', 'GET', `/api/pub/${tid}/me`); const r2 = (await adm.query('select extract(epoch from expires_at - now())::int s from learner_sessions where id = $1', [id2])).rows[0]; assert.ok(r2.s > 29 * 86400, '마지막 사용 기준 30일');
    await adm.query("update learner_sessions set last_at = now() - interval '2 minutes', created_at = now() - interval '89 days' where id = $1", [id2]);
    await call('L2', 'GET', `/api/pub/${tid}/me`); const r3 = (await adm.query('select extract(epoch from expires_at - now())::int s from learner_sessions where id = $1', [id2])).rows[0]; assert.ok(r3.s <= 86400, '최대 90일');
  });
  await t.test('학습자 이메일 로그인도 DB 기준 15분 5회 잠금', async () => {
    for (let i = 0; i < 5; i++) assert.equal((await call('E', 'POST', `/api/pub/${tid}/login`, { via: 'email', email: `nobody${sfx}@x.kr`, pw: 'Wrong-pass1' })).status, 401);
    const z = await call('E', 'POST', `/api/pub/${tid}/login`, { via: 'email', email: `nobody${sfx}@x.kr`, pw: 'Wrong-pass1' }); assert.equal(z.status, 429); assert.equal(z.j.error, 'locked');
    const rows = (await adm.query("select actor from audit_log where tenant_id = $1 and action = 'llogin.fail' and actor like 'lk:e:%'", [tid])).rows; assert.equal(rows.length, 5); assert.ok(!rows[0].actor.includes('nobody'), '이메일 원문 없음');
  });
  app.close(); await Promise.all([closeAdmin(adm, pool), pool.end()]);
});
