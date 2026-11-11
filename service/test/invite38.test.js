'use strict';
/* v38 초대 링크 가입(운영) — 공용 초대 · 등록 회원 개인 초대(itok) 토큰을 서버가 검사하고, 운영자 요청함(acct-join)에 token을 실어
   스튜디오가 그 등록 행에 계정을 붙인다(QA K1 · C2). Java(service-egov PiiServiceImpl.signup)도 같은 규칙. */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('초대 토큰 가입', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const KEY = crypto.randomBytes(32).toString('hex'); const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: KEY, PII_DEV_OTP: '1' }, log: {} });
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
  await t.test('같은 이메일 자동 연결(운영): 저장할 때 ebx(이메일 HMAC)만 남기고, 가입 때 원문 없이 대조', async () => {
    const cur = await pool.connect(); let raw; try { await cur.query('begin'); await cur.query("select set_config('app.tenant', $1, true)", [C.tid]); raw = (await cur.query('select doc from tenant_state where tenant_id = $1', [C.tid])).rows[0].doc; await cur.query('commit'); } finally { cur.release(); }
    const m1 = raw.members.find(m => m.id === 'm1'); assert.ok(m1.ebx && !JSON.stringify(raw).includes('jh@c.kr'), 'ebx 저장 · 원문 없음');
    const D = (await call('C', 'GET', '/api/state')).j; D.doc.settings.acct.mode = 'open'; D.doc.members.push({ id: 'm2', sid: 'u2', name: '박예린', email: 'YR@c.kr ', src: 'bulk', grade: '정회원' }); assert.equal((await call('C', 'PUT', '/api/state', { doc: D.doc, rev: D.rev })).status, 200);
    const r = await join('f', 'yr@c.kr'); assert.equal(r.status, 200); const E = await ev(r.j.me.sid); assert.equal(E[0].link.mid, 'm2'); assert.equal(E[0].link.by, 'email'); assert.ok(E[0].link.ebx); assert.ok(!JSON.stringify(E[0]).includes('yr@c.kr'));
    const r2 = await join('g', `zz${sfx}@x.kr`); assert.equal((await ev(r2.j.me.sid))[0].link, undefined, '등록 안 된 이메일은 연결 없음');
  });
  await t.test('마이그레이션: ebx 없는 기존 문서는 sealAll이 한 번 계산', async () => {
    const { createStateCrypto } = require('../server/statecrypt'); const { inTenant } = require('../server/db'); const crypt = createStateCrypto(require('../server/pii').piiKeys({ PII_KEY: KEY }), class extends Error { constructor(s, m, c) { super(m); this.code = c; } });
    await inTenant(pool, C.tid, c => c.query(`update tenant_state set doc = jsonb_set(doc, '{members}', (select jsonb_agg(m - 'ebx') from jsonb_array_elements(doc->'members') m)) where tenant_id = $1`, [C.tid]));
    const n = await crypt.sealAll(pool, inTenant); assert.ok(n >= 1);
    const raw = await inTenant(pool, C.tid, async c => (await c.query('select doc from tenant_state where tenant_id = $1', [C.tid])).rows[0].doc); assert.ok(raw.members.every(m => !m.email || m.ebx));
  });
  await t.test('학원 보호자: 14세 미만 개인 초대 토큰은 동의 뒤 요청함에, 동의한 보호자는 1회용 토큰으로 자녀와 연결', async () => {
    const K = (await call('K', 'POST', '/api/signup', { email: `pk${sfx}@k.kr`, password: 'Passw0rd-kkk', orgName: 'K', type: 'k12', code: 'C0DE' })).j.tenant; const KP = p => `/api/pub/${K.tid}/${p}`;
    const kdoc = { org: { name: 'K', type: 'k12', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: true, parent: true } }, members: [{ id: 'k1', sid: 'S0001', name: '김지아', itok: 'kidtok12345' }], parents: [{ id: 'p1', child: 'k1', name: '김미정', phone: '010-1111-2222', itok: 'partok12345', status: '연결 요청' }] };
    assert.equal((await call('K', 'PUT', '/api/state', { doc: kdoc, rev: 0 })).status, 200);
    const kev = async lid => { const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_tenant'); await c.query("select set_config('app.tenant', $1, true)", [K.tid]); const r = await c.query("select data from learner_events where tenant_id = $1 and sid = $2 and type = 'acct-join'", [K.tid, lid]); await c.query('commit'); return r.rows.map(x => x.data); } finally { c.release(); } };
    const kj = async (who, email, extra) => { const o = await call(who, 'POST', KP('otp'), { email, purpose: 'signup' }); return call(who, 'POST', KP('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '지아', consent: { tos: true, privacy: true }, ...extra }); };
    const kid = await kj('kid', `kid${sfx}@k.kr`, { age14: false, guardian: { contact: '010-1111-2222' }, token: 'kidtok12345' }); assert.equal(kid.status, 200); assert.equal(kid.j.me.status, 'guardian_pending'); assert.equal((await kev(kid.j.me.sid)).length, 0);
    const g = await call('G', 'POST', KP('guardian'), { token: kid.j.dev_token, ok: true }); assert.equal(g.status, 200); assert.ok(g.j.parent_token);
    const E = await kev(kid.j.me.sid); assert.equal(E[0].token, 'kidtok12345');
    const pa = await kj('pa', `mom${sfx}@k.kr`, { kind: 'parent', gtok: g.j.parent_token }); assert.equal(pa.status, 200); const PE = (await kev(pa.j.me.sid))[0]; assert.equal(PE.kind, 'parent'); assert.equal(PE.famSid, kid.j.me.sid);
    assert.equal((await kj('pb', `dad${sfx}@k.kr`, { kind: 'parent', gtok: g.j.parent_token })).j.error, 'gtok_bad', '연결 토큰은 1회용');
    const pp = await kj('pc', `par${sfx}@k.kr`, { kind: 'parent', token: 'partok12345' }); assert.equal(pp.status, 200); assert.equal((await kev(pp.j.me.sid))[0].token, 'partok12345');
    assert.equal((await kj('pd', `x${sfx}@k.kr`, { kind: 'parent', token: 'kidtok12345' })).j.error, 'invite_bad', '원생 토큰으로 보호자 가입 불가');
    await pool.query('delete from tenants where id = $1', [K.tid]);
  });
  await pool.query('delete from tenants where id = $1', [C.tid]);
  app.close(); await pool.end();
});
