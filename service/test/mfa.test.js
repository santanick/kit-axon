'use strict';
/* 보안 4차 #1 관리자 추가 인증(이메일 인증번호 · 인증 앱 TOTP · 기관 정책 · MFA_OFF 시험 예외)
   DATABASE_URL=postgresql://… node --test service/test/mfa.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const { hotp, totpCheck, b32, unb32, maskEmail, createMfa } = require('../server/mfa');

test('TOTP RFC 6238 시험 벡터 · base32 · 재사용 방지', () => {
  const key = Buffer.from('12345678901234567890');
  assert.equal(hotp(key, Math.floor(59 / 30)), '287082'); assert.equal(hotp(key, Math.floor(1111111109 / 30)), '081804'); assert.equal(hotp(key, Math.floor(2000000000 / 30)), '279037');
  assert.equal(b32(key), 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'); assert.deepEqual(unb32('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'), key);
  const now = 1111111109e3, s = Math.floor(1111111109 / 30);
  assert.equal(totpCheck(key, '081804', 0, now), s); assert.equal(totpCheck(key, hotp(key, s - 1), 0, now), s - 1, '이전 창 허용');
  assert.equal(totpCheck(key, hotp(key, s - 2), 0, now), 0, '±1창 밖'); assert.equal(totpCheck(key, '081804', s, now), 0, '같은 창 재사용 거부');
  assert.equal(maskEmail('abcdef@d.kr'), 'ab****@d.kr');
});

test('운영자 2단계 인증', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const mails = []; const mock = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => { mails.push(JSON.parse(b)); r.end('{}'); }); });
  await new Promise(ok => mock.listen(0, ok));
  const env = { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', MFA_OFF: '0', MAIL_PROVIDER: 'webhook', MAIL_WEBHOOK_URL: `http://127.0.0.1:${mock.address().port}/` };
  const app = createApp({ pool, env, log: {} }); await new Promise(ok => app.listen(0, ok));
  const appOff = createApp({ pool, env: { COOKIE_SECURE: '0', MFA_OFF: '1' }, log: {} }); await new Promise(ok => appOff.listen(0, ok));
  t.after(() => { app.close(); appOff.close(); mock.close(); pool.end(); });
  const jars = {}; const call = async (who, method, path, body, U = `http://127.0.0.1:${app.address().port}`) => {
    const J = jars[who] || (jars[who] = {});
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (kv.slice(i + 1)) J[kv.slice(0, i)] = kv.slice(i + 1); else delete J[kv.slice(0, i)]; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36); const OW = `mfa${sfx}@d.kr`, PW = 'Passw0rd-mfa'; const SUB = `msub${sfx}@d.kr`;
  const lastCode = to => { const m = mails.filter(x => x.to === to).pop(); return m && (m.text.match(/인증번호는 (\d{6})/) || [])[1]; };
  const login = async (who, email, pw) => { const l = await call(who, 'POST', '/api/login', { email, password: pw }); return l; };
  const full = async (who, email, pw) => { const l = await login(who, email, pw); assert.equal(l.j.mfa, 'email'); return call(who, 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: lastCode(email) }); };
  let secret = '';

  await t.test('비밀번호 성공 → 세션 대신 티켓, 인증번호 → 세션', async () => {
    assert.equal((await call('A', 'POST', '/api/signup', { email: OW, password: PW, orgName: 'M', type: 'corp', code: 'C0DE' })).status, 200);
    jars.B = {}; const l = await login('B', OW, PW);
    assert.equal(l.status, 200); assert.equal(l.j.mfa, 'email'); assert.match(l.j.ticket, /^[A-Za-z0-9_-]{43}$/); assert.equal(l.j.to, 'mf******@d.kr'); assert.ok(!l.j.user, '사용자 정보 없음'); assert.ok(!l.j.devCode, '메일 설정 시 devCode 없음');
    assert.ok(!jars.B.dd_sid, '세션 쿠키 없음'); assert.equal((await call('B', 'GET', '/api/me')).status, 401);
    const code = lastCode(OW); assert.match(code, /^\d{6}$/);
    const row = (await pool.query("select code_hash from mfa_tickets t join users u on u.id = t.user_id where u.email = $1", [OW])).rows[0]; assert.ok(row.code_hash && !row.code_hash.includes(code), '해시만 저장');
    const bad = await call('B', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: code === '000000' ? '111111' : '000000' }); assert.equal(bad.status, 401); assert.equal(bad.j.error, 'mfa_code');
    const ok = await call('B', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code }); assert.equal(ok.status, 200); assert.equal(ok.j.user.email, OW); assert.ok(jars.B.dd_sid);
    assert.equal((await call('B', 'GET', '/api/me')).status, 200);
    const again = await call('C', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code }); assert.equal(again.status, 401); assert.equal(again.j.error, 'mfa_expired', '1회용');
    const au = (await pool.query("select action, detail::text d from audit_log where actor = $1 and action in ('login', 'mfa.fail') order by id", [OW])).rows;
    assert.deepEqual(au.map(r => r.action), ['mfa.fail', 'login']); assert.ok(!au.some(r => r.d && r.d.includes(code)), '인증번호는 기록에 없음');
  });

  await t.test('freshWithin(user, seconds) — 최근 2단계 통과 여부(통합 관리 서버용 공개 함수)', async () => {
    const m = createMfa({ pool, env: { MFA_OFF: '0' }, log: {} }); const mOff = createMfa({ pool, env: { MFA_OFF: '1' }, log: {} });
    const uid = (await pool.query('select id::text id from users where email = $1', [OW])).rows[0].id;
    assert.equal(await m.freshWithin(uid, 60), true, '방금 통과 → 60초 안'); assert.equal(await m.freshWithin({ uid }, 60), true, '{ uid }'); assert.equal(await m.freshWithin({ id: uid }, 60), true, '{ id }');
    await pool.query("update mfa_fresh set at = now() - interval '120 seconds' where user_id = $1", [uid]);
    assert.equal(await m.freshWithin(uid, 60), false, '120초 전 통과 → 60초 기준 아님'); assert.equal(await m.freshWithin(uid, 300), true, '300초 기준은 통과');
    for (const bad of [0, -5, NaN, 'x', null]) assert.equal(await m.freshWithin(uid, bad), false, `seconds ${bad}`);
    for (const bad of ['', 'not-a-uuid', null, {}, { uid: "1' or '1'='1" }]) assert.equal(await m.freshWithin(bad, 60), false, `user ${JSON.stringify(bad)}`);
    const other = '00000000-0000-4000-8000-000000000000'; assert.equal(await m.freshWithin(other, 3600), false, '2단계를 한 적 없는 사용자');
    assert.equal(await mOff.freshWithin(uid, 1), true, 'MFA_OFF=1(시험 · 데모)은 true'); assert.equal(await mOff.freshWithin('bad', 1), false, 'MFA_OFF여도 잘못된 user는 false');
    await pool.query("update mfa_fresh set at = now() where user_id = $1", [uid]);
  });
  await t.test('5번 틀리면 무효 · 재발송 30초 간격', async () => {
    const l = await login('D', OW, PW); const rs = await call('D', 'POST', '/api/login/mfa/resend', { ticket: l.j.ticket }); assert.equal(rs.status, 429); assert.equal(rs.j.error, 'mfa_wait');
    await pool.query("update mfa_tickets set sent_at = now() - interval '1 minute' where id = encode(sha256($1::bytea), 'hex')", [l.j.ticket]);
    const r2 = await call('D', 'POST', '/api/login/mfa/resend', { ticket: l.j.ticket }); assert.equal(r2.status, 200); const code = lastCode(OW);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i++) assert.equal((await call('D', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: wrong })).j.error, 'mfa_code');
    const fifth = await call('D', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: wrong }); assert.equal(fifth.j.error, 'mfa_expired');
    assert.equal((await call('D', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code })).j.error, 'mfa_expired', '맞는 번호도 무효');
  });
  await t.test('인증 앱 등록 · 로그인 · 재사용 거부 · 해제', async () => {
    assert.equal((await call('B', 'GET', '/api/me/mfa')).j.method, 'email');
    assert.equal((await call('B', 'POST', '/api/me/mfa', { password: 'wrong' })).status, 401);
    const s = await call('B', 'POST', '/api/me/mfa', { password: PW }); assert.equal(s.status, 200); secret = s.j.secret;
    assert.match(s.j.uri, /^otpauth:\/\/totp\/DIDISAM:mfa.+%40d\.kr\?secret=[A-Z2-7]{32}&issuer=DIDISAM&algorithm=SHA1&digits=6&period=30$/);
    const stored = (await pool.query('select pend from user_totp t join users u on u.id = t.user_id where u.email = $1', [OW])).rows[0].pend; assert.ok(stored.startsWith('v1:') && !stored.includes(secret), '암호화 저장');
    const key = unb32(secret); const st = Math.floor(Date.now() / 30000);
    assert.equal((await call('B', 'POST', '/api/me/mfa', { code: '000000' === hotp(key, st) ? '111111' : '000000' })).status, 400);
    assert.equal((await call('B', 'POST', '/api/me/mfa', { code: hotp(key, st - 1) })).j.method, 'totp');
    const l = await login('E', OW, PW); assert.equal(l.j.mfa, 'totp'); assert.ok(!l.j.to);
    assert.equal((await call('E', 'POST', '/api/login/mfa/resend', { ticket: l.j.ticket })).j.error, 'mfa_kind');
    assert.equal((await call('E', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: hotp(key, st - 1) })).j.error, 'mfa_code', '등록 때 쓴 창 재사용 거부');
    const ok = await call('E', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: hotp(key, st) }); assert.equal(ok.status, 200);
    const l2 = await login('F', OW, PW); assert.equal((await call('F', 'POST', '/api/login/mfa', { ticket: l2.j.ticket, code: hotp(key, st) })).j.error, 'mfa_code', '같은 번호 재사용 거부');
  });
  await t.test('기관 정책 org.sec.mfa — 정운영자만 · audit · 인증 앱 강제', async () => {
    const st = await call('B', 'POST', '/api/staff', { email: SUB, role: 'sub' }); assert.equal(st.status, 200);
    const sl = await full('S', SUB, st.j.password); assert.equal(sl.status, 200); assert.equal((await call('S', 'POST', '/api/password', { current: st.j.password, next: 'Passw0rd-sub1' })).status, 200);
    /* 통합(가디언 4차): 기관 보안 정책은 POST /api/org/security(d2) 한 경로 — PUT /api/state의 org.sec는 서버 값 유지 */
    const sec = (who, b) => call(who, 'POST', '/api/org/security', b);
    if (!(await call('B', 'GET', '/api/state')).j.doc) await call('B', 'PUT', '/api/state', { doc: { org: { name: 'M' } }, rev: 0 });
    let r = await sec('B', { mfa: 'sms' }); assert.equal(r.status, 400); assert.equal(r.j.error, 'sec_mfa');
    r = await sec('S', { mfa: 'totp' }); assert.equal(r.status, 403);
    r = await sec('B', { mfa: 'totp' }); assert.equal(r.status, 200);
    const au = (await pool.query("select detail from audit_log where actor = $1 and action = 'org.sec'", [OW])).rows; assert.equal(au.length, 1); assert.deepEqual(au[0].detail.set, { mfa: 'totp' });
    assert.equal((await call('B', 'GET', '/api/me/mfa')).j.policy, 'totp');
    assert.equal((await call('B', 'DELETE', '/api/me/mfa', { password: PW })).j.error, 'mfa_policy', '정책상 해제 불가');
    const l = await login('S2', SUB, 'Passw0rd-sub1'); assert.equal(l.j.mfa, 'email'); assert.equal(l.j.totpSetup, true, '미등록자는 이메일로 들어온 뒤 등록 안내');
    const ok = await call('S2', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: lastCode(SUB) }); assert.equal(ok.status, 200); assert.equal(ok.j.totpSetup, true);
    assert.equal((await sec('B', { mfa: 'email' })).status, 200);
    assert.equal((await call('B', 'DELETE', '/api/me/mfa', {})).status, 401, '비밀번호 재확인');
    assert.equal((await call('B', 'DELETE', '/api/me/mfa', { password: PW })).j.method, 'email');
    assert.equal((await login('G', OW, PW)).j.mfa, 'email');
  });
  await t.test('MFA_OFF=1(시험 · 데모 전용)이면 바로 세션', async () => {
    const r = await call('H', 'POST', '/api/login', { email: OW, password: PW }, `http://127.0.0.1:${appOff.address().port}`);
    assert.equal(r.status, 200); assert.equal(r.j.user.email, OW); assert.ok(jars.H.dd_sid);
  });
});
