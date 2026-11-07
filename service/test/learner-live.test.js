'use strict';
/* v33 운영 학습자 계정 · 요청함 테스트 — 메일 미설정 안내 · 개발 인증번호 · 승인 대기 · 대학 첫 로그인 동의 · 학습자 → 운영자 이벤트(가림 · 권한 · 크기 · 종류) */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto'); const http = require('node:http');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('운영 학습자 계정 · 요청함', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const PII_KEY = crypto.randomBytes(32).toString('hex');
  const mails = []; const hook = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => { mails.push({ auth: q.headers.authorization, body: JSON.parse(b) }); r.end('{}'); }); });
  await new Promise(ok => hook.listen(0, ok));
  const mk = async env => { const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY, ...env }, log: {} }); await new Promise(ok => app.listen(0, ok)); return { app, U: `http://127.0.0.1:${app.address().port}` }; };
  const dev = await mk({}); const prod = await mk({ NODE_ENV: 'production', SESSION_PEPPER: 'x'.repeat(40), PII_KEY, COOKIE_SECURE: '1' }).catch(() => null);
  const mailOn = await mk({ MAIL_PROVIDER: 'webhook', MAIL_WEBHOOK_URL: `http://127.0.0.1:${hook.address().port}/send`, MAIL_WEBHOOK_TOKEN: 'tok' });
  const jar = {}; const call = async (who, method, path, body, U = dev.U) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `ll${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: '배움학원', type: 'adult', code: 'C0DE' })).j.tenant;
  const U2 = (await call('U', 'POST', '/api/signup', { email: `lu${sfx}@a.kr`, password: 'Passw0rd-uuu', orgName: '한빛대', type: 'univ', code: 'C0DE' })).j.tenant;
  const docA = acct => ({ org: { name: '배움학원', type: 'adult', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: false, approve: 'auto', ...acct } }, members: [], lsite: { pub: { org: { name: '배움학원' }, pages: [] } } });
  let rev = (await call('A', 'PUT', '/api/state', { doc: docA({}), rev: 0 })).j.rev;
  const P = p => `/api/pub/${A.tid}/${p}`;

  await t.test('메일 미설정: 개발은 dev_code, 운영은 안내(503)', async () => {
    const o = await call('X', 'POST', P('otp'), { email: `a${sfx}@ex.com`, purpose: 'signup' }); assert.equal(o.status, 200); assert.match(o.j.dev_code, /^\d{6}$/);
    assert.ok(prod, '운영 설정으로 서버가 떠야 함');
    const p = await fetch(prod.U + P('otp'), { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: `a${sfx}@ex.com` }) });
    const j = await p.json(); assert.equal(p.status, 503); assert.equal(j.error, 'mail_unset'); assert.match(j.message, /메일 발송이 아직 설정되지 않았습니다/); assert.equal(j.dev_code, undefined);
  });
  await t.test('메일 설정(webhook): 발송 · 응답에 코드 없음', async () => {
    const o = await call('X', 'POST', P('otp'), { email: `m${sfx}@ex.com`, purpose: 'signup' }, mailOn.U); assert.equal(o.status, 200); assert.equal(o.j.dev_code, undefined);
    assert.equal(mails.length, 1); assert.equal(mails[0].auth, 'Bearer tok'); assert.equal(mails[0].body.to, `m${sfx}@ex.com`); assert.match(mails[0].body.subject, /\[배움학원\] 인증번호/); assert.match(mails[0].body.text, /\d{6}/);
  });
  let lid;
  await t.test('이메일 가입 → 요청함에 가입 알림(가린 이메일) · 로그인 · 재로그인', async () => {
    const email = `j${sfx}@ex.com`; const o = await call('X', 'POST', P('otp'), { email, purpose: 'signup' });
    const s = await call('E', 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '배움이', consent: { tos: true, privacy: true }, age14: true, extra: { 직업: '회사원 010-1234-5678' } });
    assert.equal(s.status, 200); assert.equal(s.j.me.status, 'active'); lid = s.j.me.sid;
    assert.equal((await call('E', 'GET', P('me'))).j.me.acct.nickname, '배움이');
    await call('E', 'POST', P('logout'));
    assert.equal((await call('E', 'GET', P('me'))).status, 401);
    const o2 = await call('X', 'POST', P('otp'), { email, purpose: 'login' }); assert.equal((await call('E', 'POST', P('login'), { via: 'email', email, code: o2.j.dev_code })).j.me.sid, lid);
    const ev = await call('A', 'GET', P('events')); const j = ev.j.events.find(e => e.type === 'acct-join' && e.who === lid);
    assert.ok(j); assert.equal(j.data.nick, '배움이'); assert.match(j.data.emailMask, /^j/); assert.ok(!JSON.stringify(ev.j).includes(email)); assert.ok(!JSON.stringify(ev.j).includes('010-1234-5678'));
  });
  await t.test('인증번호: 5회 틀리면 다시 받기 · 만료 10분(ttl)', async () => {
    const email = `t${sfx}@ex.com`; const o = await call('X', 'POST', P('otp'), { email, purpose: 'signup' }); assert.equal(o.j.ttl, 600);
    for (let i = 0; i < 5; i++) assert.equal((await call('T', 'POST', P('signup'), { via: 'email', email, code: '000000', nickname: '틀림', consent: { tos: true, privacy: true }, age14: true })).j.error, 'otp_bad');
    assert.equal((await call('T', 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '틀림', consent: { tos: true, privacy: true }, age14: true })).j.error, 'otp_tries');
  });
  await t.test('승인 대기 → 운영자 승인(회원 등급) → 로그인', async () => {
    rev = (await call('A', 'PUT', '/api/state', { doc: docA({ approve: 'manual' }), rev })).j.rev;
    const email = `p${sfx}@ex.com`; const o = await call('X', 'POST', P('otp'), { email, purpose: 'signup' });
    const s = await call('Q', 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '대기생', consent: { tos: true, privacy: true }, age14: true });
    assert.equal(s.j.me.status, 'pending'); assert.equal(jar.Q, undefined); const sid = s.j.me.sid;
    const lo = async () => { const c = await call('X', 'POST', P('otp'), { email, purpose: 'login' }); return call('Q', 'POST', P('login'), { via: 'email', email, code: c.j.dev_code }); };
    assert.equal((await lo()).j.error, 'pending');
    const d = docA({ approve: 'manual' }); d.members = [{ id: 'm9', sid, grade: '승인 대기', name: '대기생' }]; rev = (await call('A', 'PUT', '/api/state', { doc: d, rev })).j.rev; assert.equal((await lo()).j.error, 'pending');
    d.members[0].grade = '거절'; d.members[0].reject = '수강 대상 아님'; rev = (await call('A', 'PUT', '/api/state', { doc: d, rev })).j.rev; const rj = await lo(); assert.equal(rj.j.error, 'rejected'); assert.match(rj.j.message, /수강 대상 아님/);
    d.members[0].grade = '정회원'; rev = (await call('A', 'PUT', '/api/state', { doc: d, rev })).j.rev; const ok = await lo(); assert.equal(ok.status, 200); assert.equal(ok.j.me.sid, sid);
  });
  await t.test('요청함: 손님은 문의 · 코드 재발급만, 서버 전용 종류 금지, 가림 · 크기 · 권한', async () => {
    assert.equal((await call('G', 'POST', P('events'), { type: 'acct-inq', id: 'x1abc', data: { body: '주민번호 900101-1234567 연락 010-2222-3333', email: 'me@ex.com' } })).status, 200);
    assert.equal((await call('G', 'POST', P('events'), { type: 'sub-cancel', data: {} })).status, 401);
    assert.equal((await call('E', 'POST', P('events'), { type: 'acct-join', data: { sid: 'fake' } })).j.error, 'type');
    assert.equal((await call('E', 'POST', P('events'), { type: 'sub-cancel', data: { body: 'x'.repeat(13000) } })).status, 413);
    assert.equal((await call('E', 'POST', P('events'), { type: 'fam-req', data: { code: 'F123' } })).status, 200);
    assert.equal((await call('E', 'GET', P('events'))).status, 401); // 학습자 쿠키로는 못 읽음
    assert.equal((await call('U', 'GET', P('events'))).status, 403); // 다른 기관 운영자
    const ev = (await call('A', 'GET', P('events'))).j; const inq = ev.events.find(e => e.id === 'x1abc');
    assert.ok(inq && inq.who === ''); assert.ok(!JSON.stringify(inq).includes('1234567')); assert.ok(!JSON.stringify(inq).includes('010-2222')); assert.equal(inq.data.email, undefined);
    const fam = ev.events.find(e => e.type === 'fam-req'); assert.equal(fam.who, lid);
    const after = (await call('A', 'GET', P('events') + '?after=' + ev.last)).j; assert.equal(after.events.length, 0);
  });
  await t.test('대학 학번 · 접근코드 첫 로그인 동의', async () => {
    const d = { org: { name: '한빛대', type: 'univ', room: { mode: 'saas' } }, codes: [{ sid: '20261234', dept: '간호학과', code: 'KEY777' }], members: [], lsite: { pub: { org: { name: '한빛대' }, pages: [] } } };
    await call('U', 'PUT', '/api/state', { doc: d, rev: 0 }); const UP = p => `/api/pub/${U2.tid}/${p}`;
    const l = await call('S', 'POST', UP('login'), { sid: '20261234', code: 'key777' }); assert.equal(l.status, 200); assert.equal(l.j.me.needConsent, true);
    assert.equal((await call('S', 'POST', UP('consent'), { tos: true })).status, 400);
    const c = await call('S', 'POST', UP('consent'), { tos: true, privacy: true, ver: 'v33' }); assert.equal(c.status, 200);
    const me = (await call('S', 'GET', UP('me'))).j.me; assert.equal(me.needConsent, undefined); assert.ok(me.consentAt);
    const row = (await pool.query('select consent from learners where tenant_id = $1 and sid = $2', [U2.tid, '20261234'])).rows[0].consent; assert.deepEqual(Object.keys(row).sort(), ['at', 'privacy', 'tos', 'ver']);
    assert.equal((await call('Z', 'POST', UP('consent'), { tos: true, privacy: true })).status, 401);
  });
  for (const x of [dev, prod, mailOn]) if (x) x.app.close(); hook.close(); await pool.end();
});
