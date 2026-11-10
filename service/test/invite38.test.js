'use strict';
/* v38 초대 링크 가입(운영) — 공용 초대 · 등록 회원 개인 초대(itok) 토큰을 서버가 검사하고, 운영자 요청함(acct-join)에 token을 실어
   스튜디오가 그 등록 행에 계정을 붙인다(QA K1 · C2). Java(service-egov PiiServiceImpl.signup)도 같은 규칙. */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('초대 토큰 가입', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex'), PII_DEV_OTP: '1' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => { const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined }); const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const sfx = Date.now().toString(36);
  const C = (await call('C', 'POST', '/api/signup', { email: `pc${sfx}@c.kr`, password: 'Passw0rd-ccc', orgName: 'C', type: 'corp', code: 'C0DE' })).j.tenant;
  const doc = { org: { name: 'C', type: 'corp', room: { mode: 'saas' } }, settings: { acct: { mode: 'invite', approve: 'manual', social: [], under14: false } },
    invites: [{ id: 'iv1', token: 'pubtok12345', target: 'student', active: true }, { id: 'iv0', token: 'oldtok12345', target: 'student', active: false }],
    members: [{ id: 'm1', sid: 'u1', name: '김지훈', email: 'jh@c.kr', src: 'bulk', itok: 'perstok1234', grade: '정회원' }] };
  assert.equal((await call('C', 'PUT', '/api/state', { doc, rev: 0 })).status, 200);
  const P = p => `/api/pub/${C.tid}/${p}`;
  const join = async (who, email, token) => { const o = await call(who, 'POST', P('otp'), { email, purpose: 'signup' }); return call(who, 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '지훈', consent: { tos: true, privacy: true }, age14: true, ...(token ? { token } : {}) }); };
  const ev = async lid => { const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_tenant'); await c.query("select set_config('app.tenant', $1, true)", [C.tid]); const r = await c.query("select data from learner_events where tenant_id = $1 and sid = $2 and type = 'acct-join'", [C.tid, lid]); await c.query('commit'); return r.rows.map(x => x.data); } finally { c.release(); } };

  await t.test('초대제 기관: 토큰 없으면 403 mode, 틀리거나 끈 토큰은 invite_bad', async () => {
    assert.equal((await join('a', `a${sfx}@x.kr`)).j.error, 'mode');
    assert.equal((await join('b', `b${sfx}@x.kr`, 'nosuchtok99')).j.error, 'invite_bad');
    assert.equal((await join('c', `c${sfx}@x.kr`, 'oldtok12345')).j.error, 'invite_bad');
  });
  await t.test('개인 초대 토큰: 승인 없이 가입 · 요청함에 token', async () => {
    const r = await join('d', `jh${sfx}@c.kr`, 'perstok1234'); assert.equal(r.status, 200); assert.equal(r.j.me.status, 'active');
    const E = await ev(r.j.me.sid); assert.equal(E.length, 1); assert.equal(E[0].token, 'perstok1234'); assert.ok(!JSON.stringify(E[0]).includes(`jh${sfx}@c.kr`));
  });
  await t.test('공용 초대 토큰도 가입 · token 전달', async () => {
    const r = await join('e', `e${sfx}@x.kr`, 'pubtok12345'); assert.equal(r.status, 200); assert.equal((await ev(r.j.me.sid))[0].token, 'pubtok12345');
  });
  await pool.query('delete from tenants where id = $1', [C.tid]);
  app.close(); await pool.end();
});
