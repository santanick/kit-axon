'use strict';
/* v23 간편가입 · 개인정보 분리 테스트 — 이메일 인증번호 · SNS · 학번 가입, 만 14세 미만 보호자 동의, 역할 분리(학습 역할은 pii 접근 불가),
   암호화 저장, 운영자는 가린 이메일만, 목적 열람 기록, 선택 본인확인, 탈퇴 시 PII 완전 삭제 · 학습 기록 가명 유지 */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('간편가입 · 개인정보 분리', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const PII_KEY = crypto.randomBytes(32).toString('hex');
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY, PII_DEV_OTP: '1', OAUTH_DEV: '1', IDV_DEV: '1' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  /* 지정한 역할 · 기관으로 SQL 실행(권한 · RLS 확인용) */
  const asRole = async (tid, role, sql, args) => { const c = await pool.connect(); try { await c.query('begin'); await c.query(`set local role ${role}`); await c.query("select set_config('app.tenant', $1, true)", [tid]); const r = await c.query(sql, args); await c.query('commit'); return r.rows; } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); } };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `pa${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'adult', code: 'C0DE' })).j.tenant;
  const B = (await call('B', 'POST', '/api/signup', { email: `pb${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: 'B', type: 'univ', code: 'C0DE' })).j.tenant;
  const docA = acct => ({ org: { name: 'A', type: 'adult', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: ['kakao', 'naver', 'google', 'apple'], under14: true, ...acct } }, members: [] });
  await call('A', 'PUT', '/api/state', { doc: docA({}), rev: 0 });
  await call('B', 'PUT', '/api/state', { doc: { org: { name: 'B', type: 'univ', room: { mode: 'saas' } }, settings: { acct: { mode: 'open' } }, members: [] }, rev: 0 });
  const P = p => `/api/pub/${A.tid}/${p}`; const email = `learner${sfx}@example.com`; let lidE, lidS;

  await t.test('학습 역할(didisam_tenant)은 pii 스키마를 읽을 수 없음', async () => {
    await assert.rejects(asRole(A.tid, 'didisam_tenant', 'select * from pii.identity'), /permission denied/);
    await assert.rejects(asRole(A.tid, 'didisam_pii', 'select * from learner_accounts'), /permission denied/);
  });
  await t.test('이메일 인증번호 간편가입: 필수 동의 · 인증번호 검사', async () => {
    const o = await call('X', 'POST', P('otp'), { email, purpose: 'signup' }); assert.equal(o.status, 200); assert.match(o.j.dev_code, /^\d{6}$/);
    assert.equal((await call('E', 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '배움이', consent: { tos: true }, age14: true })).status, 400);
    assert.equal((await call('E', 'POST', P('signup'), { via: 'email', email, code: '000000', nickname: '배움이', consent: { tos: true, privacy: true }, age14: true })).j.error, 'otp_bad');
    const s = await call('E', 'POST', P('signup'), { via: 'email', email, code: o.j.dev_code, nickname: '배움이', consent: { tos: true, privacy: true, mkt: false }, age14: true });
    assert.equal(s.status, 200); lidE = s.j.me.sid; assert.match(lidE, /^[0-9a-f-]{36}$/); assert.equal(s.j.me.status, 'active');
    const me = await call('E', 'GET', P('me')); assert.equal(me.j.me.acct.nickname, '배움이'); assert.equal(me.j.me.acct.login, 'email'); assert.ok(!JSON.stringify(me.j).includes(email));
  });
  await t.test('저장 형태: 학습 표에는 이메일 없음 · pii는 암호문', async () => {
    const acc = await asRole(A.tid, 'didisam_tenant', 'select * from learner_accounts where learner_id = $1', [lidE]); assert.equal(acc.length, 1); assert.ok(!JSON.stringify(acc).includes(email)); assert.equal(acc[0].nickname, '배움이');
    const idr = await asRole(A.tid, 'didisam_pii', 'select * from pii.identity where learner_id = $1', [lidE]); assert.equal(idr.length, 1);
    assert.ok(!JSON.stringify(idr).includes(email)); assert.match(idr[0].email_enc, /^v1\./); assert.equal(idr[0].name_enc, null); assert.equal(idr[0].phone_enc, null); assert.match(idr[0].email_mask, /^le\*+@e\*+\.com$/);
    assert.equal((await asRole(B.tid, 'didisam_pii', 'select 1 from pii.identity where learner_id = $1', [lidE])).length, 0); // 다른 기관 RLS
    const o = await call('X', 'POST', P('otp'), { email: email.toUpperCase(), purpose: 'signup' });
    assert.equal((await call('E2', 'POST', P('signup'), { via: 'email', email: email.toUpperCase(), code: o.j.dev_code, nickname: '중복', consent: { tos: true, privacy: true }, age14: true })).status, 409);
  });
  await t.test('이메일 인증번호 로그인 · 비밀번호 없는 계정', async () => {
    assert.equal((await call('E3', 'POST', P('login'), { via: 'email', email, pw: 'whatever1' })).status, 401);
    const o = await call('X', 'POST', P('otp'), { email, purpose: 'login' }); const l = await call('E3', 'POST', P('login'), { via: 'email', email, code: o.j.dev_code }); assert.equal(l.status, 200); assert.equal(l.j.me.sid, lidE);
  });
  await t.test('SNS 간편가입 · 로그인 · 중복', async () => {
    const s = await call('S', 'POST', P('signup'), { via: 'sns', provider: 'kakao', dev_sub: 'kakao-123', nickname: '카카오친구', consent: { tos: true, privacy: true }, age14: true }); assert.equal(s.status, 200); lidS = s.j.me.sid;
    assert.equal((await call('S2', 'POST', P('signup'), { via: 'sns', provider: 'kakao', dev_sub: 'kakao-123', nickname: '또가입', consent: { tos: true, privacy: true }, age14: true })).status, 409);
    assert.equal((await call('S3', 'POST', P('login'), { via: 'sns', provider: 'kakao', dev_sub: 'kakao-123' })).j.me.sid, lidS);
    assert.equal((await call('S4', 'POST', P('login'), { via: 'sns', provider: 'naver', dev_sub: 'kakao-123' })).status, 404);
    const idr = await asRole(A.tid, 'didisam_pii', 'select provider_sub_hash, email_enc from pii.identity where learner_id = $1', [lidS]); assert.ok(idr[0].provider_sub_hash && !idr[0].provider_sub_hash.includes('kakao-123')); assert.equal(idr[0].email_enc, null);
  });
  await t.test('만 14세 미만: 보호자 동의 전 로그인 불가 → 동의 후 가능', async () => {
    const s = await call('K', 'POST', P('signup'), { via: 'sns', provider: 'naver', dev_sub: 'kid-1', nickname: '어린이', consent: { tos: true, privacy: true }, age14: false, guardian: { contact: 'parent@example.com' } });
    assert.equal(s.j.me.status, 'guardian_pending'); assert.ok(s.j.dev_token); assert.equal(jar.K, undefined);
    assert.equal((await call('K', 'POST', P('login'), { via: 'sns', provider: 'naver', dev_sub: 'kid-1' })).j.error, 'guardian_pending');
    assert.equal((await call('G', 'POST', P('guardian'), { token: 'wrong', ok: true })).status, 404);
    assert.equal((await call('G', 'POST', P('guardian'), { token: s.j.dev_token, ok: true })).j.status, 'active');
    assert.equal((await call('K', 'POST', P('login'), { via: 'sns', provider: 'naver', dev_sub: 'kid-1' })).status, 200);
    assert.equal((await call('K2', 'POST', P('signup'), { via: 'sns', provider: 'naver', dev_sub: 'kid-2', nickname: '보호자없음', consent: { tos: true, privacy: true }, age14: false })).j.error, 'guardian');
  });
  await t.test('대학: 학번 + 학과만(이메일 · 이름 없음)', async () => {
    const Q = p => `/api/pub/${B.tid}/${p}`;
    assert.equal((await call('U', 'POST', Q('signup'), { via: 'email', email: 'x@y.kr', code: '1', consent: { tos: true, privacy: true } })).status, 400);
    const s = await call('U', 'POST', Q('signup'), { via: 'univ', student_no: '20261234', dept: '컴퓨터공학과', pw: 'univpass12', nickname: '새내기', consent: { tos: true, privacy: true } }); assert.equal(s.status, 200);
    assert.equal((await call('U2', 'POST', Q('signup'), { via: 'univ', student_no: '20261234', dept: '경영', pw: 'univpass12', nickname: '다른이', consent: { tos: true, privacy: true } })).status, 409);
    const l = await call('U3', 'POST', Q('login'), { via: 'univ', student_no: '20261234', pw: 'univpass12' }); assert.equal(l.j.me.dept, '컴퓨터공학과'); assert.equal(l.j.me.acct.student_no, '20261234');
    const idr = await asRole(B.tid, 'didisam_pii', 'select email_enc, name_enc, phone_enc from pii.identity where learner_id = $1', [s.j.me.sid]); assert.deepEqual(idr[0], { email_enc: null, name_enc: null, phone_enc: null });
  });
  await t.test('학습 기록은 가명 learner_id로 저장', async () => {
    assert.equal((await call('E', 'PUT', P('progress'), { lp: { cls: { c1: { items: { i1: { done: true } } } } } })).j.ok, true);
    const lp = (await call('A', 'GET', '/api/learners/progress')).j.lp; assert.ok(lp[lidE]); assert.ok(!JSON.stringify(lp).includes(email));
  });
  await t.test('운영자: 닉네임 + 가린 이메일만 · 목적 열람은 기록', async () => {
    const L = (await call('A', 'GET', '/api/learners/accounts')).j.accounts; const me = L.find(x => x.learner_id === lidE);
    assert.equal(me.nickname, '배움이'); assert.match(me.email_mask, /\*/); assert.ok(!JSON.stringify(L).includes(email));
    assert.equal((await call('A', 'POST', '/api/learners/pii', { learner_id: lidE, field: 'email', purpose: 'curious' })).status, 400);
    const v = await call('A', 'POST', '/api/learners/pii', { learner_id: lidE, field: 'email', purpose: 'refund' }); assert.equal(v.j.value, email);
    const log = (await call('A', 'GET', '/api/learners/pii-log')).j.rows; assert.ok(log.some(r => r.action === 'view' && r.purpose === 'refund' && r.fields.includes('email')));
    assert.ok(log.some(r => r.action === 'list_masked')); assert.ok(!JSON.stringify(log).includes(email));
  });
  await t.test('필요할 때만 수집(이름: 수료증) · 본인 열람', async () => {
    assert.equal((await call('E', 'PUT', P('pii'), { field: 'name', value: '홍길동', purpose: 'alimtalk' })).status, 400);
    assert.equal((await call('E', 'PUT', P('pii'), { field: 'name', value: '홍길동', purpose: 'cert' })).j.ok, true);
    const g = await call('E', 'GET', P('pii')); assert.equal(g.j.name, '홍길동'); assert.equal(g.j.email, email); assert.equal(g.j.consent.privacy, true);
    const idr = await asRole(A.tid, 'didisam_pii', 'select name_enc from pii.identity where learner_id = $1', [lidE]); assert.ok(!idr[0].name_enc.includes('홍길동'));
  });
  await t.test('선택 본인확인: 기본 꺼짐 → 기관이 켜면 결과 플래그만', async () => {
    assert.equal((await call('E', 'POST', P('verify'), { dev_ok: true })).j.error, 'idv_off');
    await call('A', 'PUT', '/api/state', { doc: docA({ idv: { on: true, reason: 'refund' } }), rev: 1 });
    const v = await call('E', 'POST', P('verify'), { dev_ok: true }); assert.equal(v.j.idv_ok, true); assert.equal(v.j.reason, '고용보험 환급 과정');
    assert.equal((await call('E', 'GET', P('me'))).j.me.acct.idv_ok, true);
  });
  await t.test('탈퇴: PII 완전 삭제 · 학습 기록은 가명 유지', async () => {
    const w = await call('E', 'POST', P('withdraw'), {}); assert.equal(w.j.deleted, 'pii');
    assert.equal((await asRole(A.tid, 'didisam_pii', 'select 1 from pii.identity where learner_id = $1', [lidE])).length, 0);
    assert.equal((await call('E', 'GET', P('me'))).status, 401);
    const o = await call('X', 'POST', P('otp'), { email, purpose: 'login' }); assert.equal((await call('E4', 'POST', P('login'), { via: 'email', email, code: o.j.dev_code })).status, 401);
    assert.ok((await call('A', 'GET', '/api/learners/progress')).j.lp[lidE]);
    assert.equal((await call('A', 'POST', '/api/learners/pii', { learner_id: lidE, field: 'email', purpose: 'refund' })).status, 404);
    const acc = await asRole(A.tid, 'didisam_tenant', 'select nickname, status from learner_accounts where learner_id = $1', [lidE]); assert.deepEqual(acc[0], { nickname: '탈퇴 회원', status: 'withdrawn' });
    assert.ok((await call('A', 'GET', '/api/learners/pii-log')).j.rows.some(r => r.action === 'delete' && r.learner_id === lidE));
  });
  await t.test('PII_KEY가 없으면 가입 거부(503)', async () => {
    const app2 = createApp({ pool, env: { COOKIE_SECURE: '0', PII_DEV_OTP: '1' }, log: {} }); await new Promise(ok => app2.listen(0, ok));
    const r = await fetch(`http://127.0.0.1:${app2.address().port}/api/pub/${A.tid}/otp`, { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.kr' }) }); assert.equal(r.status, 503); app2.close();
  });
  await t.test('보존 기간 정리 실행', async () => { assert.equal(typeof (await app.piiPurge()), 'number'); });
  await pool.query('delete from tenants where id = any($1)', [[A.tid, B.tid]]);
  app.close(); await pool.end();
});
