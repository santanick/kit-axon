'use strict';
const { adminPool, closeAdmin, NEED } = require('./_admin'); // QA8: 비슈퍼유저 DB에서는 직접 조회만 슈퍼유저 연결로(서버는 RLS 아래 그대로)
/* 보안 2차 — 새 환경 로그인 알림(SEC-0008 보완 통제) · SEC-0011 쓰기 MCP 키는 정운영자만
   DATABASE_URL=postgresql://… node --test service/test/devices.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const { agent, band } = require('../server/devices');

test('기기 요약 · IP 대역 단위', () => {
  assert.equal(agent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'), 'Chrome · Windows');
  assert.equal(agent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'), 'Safari · iOS');
  assert.equal(band('211.36.140.7'), '211.36.x.x'); assert.equal(band('::ffff:10.1.2.3'), '10.1.x.x'); assert.equal(band('2001:DB8:1::5'), '2001:db8::'); assert.equal(band(''), '');
});

test('새 환경 로그인 알림 · 기기 목록 · SEC-0011', async t => {
  const pool = poolFrom(process.env); await migrate(pool); const adm = await adminPool(pool); if (!adm) { await pool.end(); t.skip(NEED); return; }
  const mails = []; const mock = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => { mails.push(JSON.parse(b)); r.end('{}'); }); });
  await new Promise(ok => mock.listen(0, ok));
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', MFA_OFF: '1', TRUST_PROXY_HOPS: '1', GEO_COUNTRY_HEADER: 'x-client-geo-country', MAIL_PROVIDER: 'webhook', MAIL_WEBHOOK_URL: `http://127.0.0.1:${mock.address().port}/` }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  /* QA8: 실패해도 서버를 닫아 멈추지 않게(이전: 첫 실패 뒤 240초 멈춤) · 2단계 인증은 mfa.test가 따로 검증 */
  t.after(() => { app.close(); mock.close(); return Promise.all([closeAdmin(adm, pool), pool.end()]); });
  /* 브라우저마다 쿠키 통(세션 · 기기 표식) */
  const jars = {}; const call = async (who, method, path, body, hd = {}) => {
    const J = jars[who] || (jars[who] = {});
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', 'x-forwarded-for': '211.36.1.1', ...hd, ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); J[kv.slice(0, i)] = kv.slice(i + 1); }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36); const OW = `dev${sfx}@d.kr`, PW = 'Passw0rd-dev';
  const evs = async () => (await adm.query("select detail from audit_log where actor = $1 and action = 'login.newdevice' order by id", [OW])).rows.map(r => r.detail);
  const wait = () => new Promise(ok => setTimeout(ok, 150));

  await t.test('가입 · 같은 기기 재로그인은 알림 없음(단계 · 응답 형태 그대로)', async () => {
    const s = await call('A', 'POST', '/api/signup', { email: OW, password: PW, orgName: 'D', type: 'corp', code: 'C0DE' }); assert.equal(s.status, 200);
    assert.ok(jars.A.dd_sid && jars.A.dd_dev, '세션 + 기기 표식 쿠키');
    const l = await call('A', 'POST', '/api/login', { email: OW, password: PW }); assert.equal(l.status, 200); assert.equal(l.j.user.email, OW); assert.deepEqual(Object.keys(l.j).sort(), ['tenant', 'user']);
    await wait(); assert.equal((await evs()).length, 0); assert.equal(mails.length, 0);
  });
  await t.test('새 기기 → audit login.newdevice + 본인 메일', async () => {
    const l = await call('B', 'POST', '/api/login', { email: OW, password: PW }, { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1' }); assert.equal(l.status, 200);
    await wait(); const e = await evs(); assert.equal(e.length, 1); assert.deepEqual(e[0].why, ['device']); assert.equal(e[0].mailed, true);
    assert.equal(mails.length, 1); assert.equal(mails[0].to, OW); assert.match(mails[0].subject, /새 환경 로그인 알림/); assert.match(mails[0].text, /Safari · iOS/); assert.match(mails[0].text, /211\.36\.x\.x/);
    assert.ok(!mails[0].text.includes('211.36.1.1'), '전체 IP는 메일에 쓰지 않음');
  });
  await t.test('같은 기기라도 처음 보는 대역 · 국가면 알림', async () => {
    await call('A', 'POST', '/api/login', { email: OW, password: PW }, { 'x-forwarded-for': '45.12.9.9', 'x-client-geo-country': 'nl' });
    await wait(); const e = await evs(); assert.deepEqual(e[1].why, ['band', 'country']); assert.equal(mails.length, 2); assert.match(mails[1].text, /국가: NL/);
    await call('A', 'POST', '/api/login', { email: OW, password: PW }, { 'x-forwarded-for': '45.12.200.1', 'x-client-geo-country': 'NL' });
    await wait(); assert.equal((await evs()).length, 2, '이미 본 대역 · 국가');
  });
  await t.test('위조 · 이상한 기기 표식은 새 기기로 처리', async () => {
    jars.C = { dd_dev: 'not-a-valid-token' }; await call('C', 'POST', '/api/login', { email: OW, password: PW });
    await wait(); assert.equal((await evs()).length, 3); assert.match(jars.C.dd_dev, /^[A-Za-z0-9_-]{43}$/);
  });
  await t.test('GET /api/me/devices: 본인 기록만, 현재 기기 표시, 원문 UA · 전체 IP 없음', async () => {
    assert.equal((await call('X', 'GET', '/api/me/devices')).status, 401);
    const r = await call('A', 'GET', '/api/me/devices'); assert.equal(r.status, 200); assert.equal(r.j.rows.length, 3);
    const cur = r.j.rows.filter(x => x.current); assert.equal(cur.length, 1); assert.equal(cur[0].agent, 'Chrome · Windows'); assert.equal(cur[0].band, '45.12.x.x'); assert.equal(cur[0].country, 'NL');
    assert.deepEqual(Object.keys(r.j.rows[0]).sort(), ['agent', 'band', 'country', 'current', 'firstAt', 'lastAt']);
    const o = await call('O2', 'POST', '/api/signup', { email: `o2${sfx}@d.kr`, password: PW, orgName: 'E', type: 'corp', code: 'C0DE' }); assert.equal(o.status, 200);
    assert.equal((await call('O2', 'GET', '/api/me/devices')).j.rows.length, 1, '다른 계정 기록은 보이지 않음');
  });
  await t.test('SEC-0011: 부운영자는 읽기 키만 발급 · 폐기, 쓰기 키는 정운영자만', async () => {
    const s = await call('A', 'POST', '/api/staff', { email: `sub${sfx}@d.kr`, role: 'sub' }); assert.equal(s.status, 200);
    await call('S', 'POST', '/api/login', { email: `sub${sfx}@d.kr`, password: s.j.password }); await call('S', 'POST', '/api/password', { current: s.j.password, next: 'Passw0rd-sub1' });
    const w = await call('S', 'POST', '/api/keys', { name: 'w', scope: 'write' }); assert.equal(w.status, 403); assert.equal(w.j.error, 'role');
    const rk = await call('S', 'POST', '/api/keys', { name: 'r', scope: 'read' }); assert.equal(rk.status, 200); assert.equal(rk.j.scope, 'read');
    const wk = await call('A', 'POST', '/api/keys', { name: 'w', scope: 'write' }); assert.equal(wk.status, 200); assert.equal(wk.j.scope, 'write');
    assert.equal((await call('S', 'POST', '/api/keys/revoke', { id: wk.j.id })).status, 403);
    assert.equal((await call('S', 'POST', '/api/keys/revoke', { id: rk.j.id })).status, 200);
    assert.equal((await call('A', 'POST', '/api/keys/revoke', { id: wk.j.id })).status, 200);
    const t2 = await call('A', 'POST', '/api/staff', { email: `tch${sfx}@d.kr`, role: 'teacher' }); await call('T', 'POST', '/api/login', { email: `tch${sfx}@d.kr`, password: t2.j.password }); await call('T', 'POST', '/api/password', { current: t2.j.password, next: 'Passw0rd-tch1' });
    assert.equal((await call('T', 'POST', '/api/keys', { name: 'r', scope: 'read' })).status, 403, '교강사는 키 발급 불가');
  });
  await t.test('메일 미설정이면 audit만(mailed:false)', async () => {
    const app2 = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', MFA_OFF: '1' }, log: {} }); await new Promise(ok => app2.listen(0, ok));
    const n0 = mails.length; const r = await fetch(`http://127.0.0.1:${app2.address().port}/api/login`, { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: OW, password: PW }) });
    assert.equal(r.status, 200); await wait(); const e = await evs(); assert.equal(e[e.length - 1].mailed, false); assert.equal(mails.length, n0); app2.close();
  });
});
