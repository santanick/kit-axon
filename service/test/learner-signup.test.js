'use strict';
/* QA7 학습자 회원가입 · 연동 로그인 · 가입 승인 — 이메일 · 소셜(모의 OAuth: 구글 · 카카오 · 네이버) · 누구나 가입(open) · 기관 승인(approval) · 승인/거절 · 대학 PII 최소.
   사용: DATABASE_URL=… node --test service/test/learner-signup.test.js (키 · 비밀값 없음 — 제공자는 이 시험 안의 모의 서버) */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('QA7 학습자 가입 · 소셜 로그인 · 승인', { skip: !process.env.DATABASE_URL }, async t => {
  /* 모의 OAuth 제공자: 인가 코드 = 회원 번호 씨앗 */
  const seen = [];
  const mock = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    const u = new URL(q.url, 'http://x'); const [, p, act] = u.pathname.split('/'); seen.push(`${q.method} ${p}/${act}`);
    const out = j => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify(j)); };
    if (act === 'token') { const f = new URLSearchParams(b); if (f.get('code') === 'bad') { r.writeHead(400); return r.end('{}'); } return out({ access_token: 'at.' + f.get('code'), token_type: 'bearer' }); }
    if (act === 'me') { const tok = String(q.headers.authorization || '').replace('Bearer at.', ''); const sub = 'S' + tok;
      return out(p === 'google' ? { sub } : p === 'naver' ? { resultcode: '00', message: 'success', response: { id: sub } } : { id: sub }); }
    r.writeHead(404); r.end(); }); }).listen(0, '127.0.0.1');
  await new Promise(ok => mock.once('listening', ok)); const MU = `http://127.0.0.1:${mock.address().port}`;
  const pool = poolFrom(process.env); await migrate(pool);
  const env = { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', MFA_OFF: '1', PII_KEY: crypto.randomBytes(32).toString('hex'), PII_DEV_OTP: '1', OAUTH_MOCK_URL: MU,
    LEARNER_OAUTH_KAKAO_ID: 'lk-id', LEARNER_OAUTH_NAVER_ID: 'ln-id', LEARNER_OAUTH_NAVER_SECRET: 'ln-sec', OAUTH_GOOGLE_ID: 'op-g-id', OAUTH_GOOGLE_SECRET: 'op-g-sec' };
  const app = createApp({ pool, env, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  t.after(() => { app.close(); mock.close(); return pool.end(); });
  /* 쿠키 여러 개 보관 */
  const jar = {}; const keep = (who, r) => { const L = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : []; const J = jar[who] = jar[who] || {}; for (const c of L) { const [kv, ...a] = c.split(';'); const [k, ...v] = kv.split('='); if (/max-age=0/i.test(a.join(';'))) delete J[k.trim()]; else J[k.trim()] = v.join('='); } };
  const ck = who => Object.entries(jar[who] || {}).map(([k, v]) => `${k}=${v}`).join('; ');
  const call = async (who, method, path, body) => { const r = await fetch(U + path, { method, redirect: 'manual', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), cookie: ck(who) }, body: body ? JSON.stringify(body) : undefined }); keep(who, r); return { status: r.status, loc: r.headers.get('location') || '', j: await r.json().catch(() => ({})) }; };
  /* 소셜 한 바퀴: start → (제공자 동의 대신) callback 직접 호출 */
  const social = async (who, tid, p, code, m = 'join') => {
    const s = await call(who, 'GET', `/api/pub/${tid}/loauth/${p}/start?m=${m}`); assert.equal(s.status, 302, s.loc); const au = new URL(s.loc);
    assert.equal(au.origin + au.pathname, `${MU}/${p}/auth`); assert.ok(!au.searchParams.get('scope') || au.searchParams.get('scope') === 'openid', '이메일 · 프로필 scope 요청 금지');
    assert.equal(au.searchParams.get('redirect_uri'), `${U}/api/pub/loauth/${p}/callback`);
    const cb = await call(who, 'GET', `/api/pub/loauth/${p}/callback?code=${code}&state=${encodeURIComponent(au.searchParams.get('state'))}`); assert.equal(cb.status, 302);
    return decodeURIComponent((/[?&]oa=([\w-]+)/.exec(cb.loc) || [])[1] || ''); };
  const sfx = Date.now().toString(36);
  const org = async (who, type, acct) => { const T = (await call(who, 'POST', '/api/signup', { email: `qa7${who}${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: who, type, code: 'C0DE' })).j.tenant;
    await call(who, 'PUT', '/api/state', { doc: { org: { name: who, type, room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: ['kakao', 'google', 'naver'], ...acct } }, members: [] }, rev: 0 }); return T; };
  const OPEN = await org('OPEN', 'adult', { approve: 'auto' }); const APR = await org('APR', 'corp', { approve: 'manual' }); const UNI = await org('UNI', 'univ', { approve: 'auto', social: ['kakao'] });
  const consent = { tos: true, privacy: true };
  const emailJoin = async (who, tid, email, nick) => { const o = await call(who, 'POST', `/api/pub/${tid}/otp`, { email, purpose: 'signup' }); return call(who, 'POST', `/api/pub/${tid}/signup`, { via: 'email', email, code: o.j.dev_code, nickname: nick, pw: 'Learn!ng123', consent, age14: true }); };

  await t.test('키 설정 판단: 학습자 키 → 운영자 키 재사용 → 없음(준비 중)', async () => {
    const r = await call('X', 'GET', `/api/pub/${OPEN.tid}/loauth`); assert.deepEqual(r.j.ready.sort(), ['google', 'kakao', 'naver']);
    const { loauthConfig } = require('../server/loauth');
    assert.equal(loauthConfig(env).google.reuse, true); assert.equal(loauthConfig(env).kakao.reuse, false);
    assert.deepEqual(Object.keys(loauthConfig({ LEARNER_OAUTH_NAVER_ID: 'x' })), [], '네이버는 secret 없으면 준비 중');
    assert.equal(loauthConfig({ NODE_ENV: 'production', OAUTH_MOCK_URL: MU, LEARNER_OAUTH_KAKAO_ID: 'k' }).kakao.auth, 'https://kauth.kakao.com/oauth/authorize', '운영은 모의 주소 무시');
    assert.equal(loauthConfig({ LEARNER_OAUTH_NAVER_ID: 'x', LEARNER_OAUTH_NAVER_SECRET: 'y' }).naver.me, 'https://openapi.naver.com/v1/nid/me');
  });
  await t.test('누구나 가입(open): 이메일 가입 즉시 정회원 · 비밀번호 로그인', async () => {
    const s = await emailJoin('E1', OPEN.tid, `e1${sfx}@ex.com`, '열린학습자'); assert.equal(s.status, 200, JSON.stringify(s.j)); assert.equal(s.j.me.status, 'active');
    assert.equal((await call('E1', 'GET', `/api/pub/${OPEN.tid}/me`)).status, 200);
    const l = await call('E1b', 'POST', `/api/pub/${OPEN.tid}/login`, { via: 'email', email: `e1${sfx}@ex.com`, pw: 'Learn!ng123' }); assert.equal(l.status, 200);
  });
  await t.test('소셜(open): 카카오 · 구글 · 네이버 가입 → 다시 로그인 · 식별자는 해시로만', async () => {
    for (const [p, code] of [['kakao', 'k1' + sfx], ['google', 'g1' + sfx], ['naver', 'n1' + sfx]]) {
      assert.equal(await social('S' + p, OPEN.tid, p, code), 'join-' + p);
      assert.equal((await call('S' + p, 'GET', `/api/pub/${OPEN.tid}/me`)).status, 401, '가입 전에는 세션 없음');
      const s = await call('S' + p, 'POST', `/api/pub/${OPEN.tid}/signup`, { via: 'sns', oauth: true, nickname: p + '회원', consent, age14: true }); assert.equal(s.status, 200, JSON.stringify(s.j)); assert.equal(s.j.me.login, p); assert.equal(s.j.me.status, 'active');
      assert.equal((await call('S' + p, 'POST', `/api/pub/${OPEN.tid}/signup`, { via: 'sns', oauth: true, nickname: p + '두번', consent, age14: true })).j.error, 'oauth_pending', '보류 쿠키는 한 번만');
      assert.equal(await social('S2' + p, OPEN.tid, p, code, 'login'), 'ok'); assert.equal((await call('S2' + p, 'GET', `/api/pub/${OPEN.tid}/me`)).j.me.sid, s.j.me.sid);
    }
    const raw = (await pool.query("select count(*)::int n from pii.identity where provider_sub_hash like $1 or provider_sub_hash = $2", ['%Sk1' + sfx + '%', 'Sk1' + sfx])).rows[0].n; assert.equal(raw, 0, '원문 sub 저장 금지');
    assert.equal((await pool.query("select email_enc from pii.identity where tid = $1 and provider = 'kakao'", [OPEN.tid])).rows[0].email_enc, null);
    assert.ok(seen.includes('POST naver/token') && seen.includes('GET naver/me'));
  });
  await t.test('소셜 보안: state 위조 · 다른 브라우저 콜백 · 꺼진 제공자 · 제공자 오류', async () => {
    const s = await call('Z', 'GET', `/api/pub/${OPEN.tid}/loauth/kakao/start`); const st = new URL(s.loc).searchParams.get('state');
    assert.match((await call('Z2', 'GET', `/api/pub/loauth/kakao/callback?code=x&state=${encodeURIComponent(st)}`)).loc, /[?&]oa=err-state#/, '논스 쿠키 없는 브라우저');
    assert.match((await call('Z', 'GET', `/api/pub/loauth/naver/callback?code=x&state=${encodeURIComponent(st)}`)).loc, /[?&]oa=err-state#/, '제공자 바꿔치기');
    assert.match((await call('Z', 'GET', `/api/pub/loauth/kakao/callback?code=x&state=${encodeURIComponent(st.slice(0, -2) + 'AA')}`)).loc, /[?&]oa=err-state#/);
    assert.match((await call('Z', 'GET', `/api/pub/${UNI.tid}/loauth/google/start`)).loc, /[?&]oa=err-provider_off#/, '기관이 켜지 않은 제공자');
    assert.equal(await social('Z3', OPEN.tid, 'kakao', 'bad'), 'err-provider');
    assert.equal((await call('Z4', 'POST', `/api/pub/${OPEN.tid}/signup`, { via: 'sns', oauth: true, nickname: '위조', consent, age14: true })).j.error, 'oauth_pending');
  });
  let lidA, lidB, lidK;
  await t.test('기관 승인(approval): 가입 → 승인 대기(세션 없음 · 표 쿠키) · 로그인도 대기 · 신청 정보', async () => {
    const s = await emailJoin('A1', APR.tid, `a1${sfx}@ex.com`, '승인대기'); assert.equal(s.j.me.status, 'pending'); assert.equal(s.j.pending.nick, '승인대기'); lidA = s.j.me.sid;
    assert.equal((await call('A1', 'GET', `/api/pub/${APR.tid}/me`)).status, 401, '대기 중 활동 잠금');
    const p = await call('A1', 'GET', `/api/pub/${APR.tid}/pending`); assert.equal(p.j.status, 'pending'); assert.equal(p.j.nick, '승인대기'); assert.equal(p.j.login, 'email'); assert.ok(p.j.at);
    const l = await call('A2', 'POST', `/api/pub/${APR.tid}/login`, { via: 'email', email: `a1${sfx}@ex.com`, pw: 'Learn!ng123' }); assert.equal(l.status, 403); assert.equal(l.j.error, 'pending'); assert.equal(l.j.pending.status, 'pending');
    assert.equal((await call('A2', 'GET', `/api/pub/${APR.tid}/pending`)).j.status, 'pending', '다른 기기에서도 대기 유지');
    const b = await emailJoin('B1', APR.tid, `b1${sfx}@ex.com`, '거절될회원'); lidB = b.j.me.sid;
    assert.equal(await social('K1', APR.tid, 'kakao', 'ka' + sfx), 'join-kakao'); const k = await call('K1', 'POST', `/api/pub/${APR.tid}/signup`, { via: 'sns', oauth: true, nickname: '카카오대기', consent, age14: true }); assert.equal(k.j.me.status, 'pending'); lidK = k.j.me.sid;
    assert.equal(await social('K2', APR.tid, 'kakao', 'ka' + sfx, 'login'), 'pending');
    assert.equal((await call('X', 'GET', `/api/pub/${APR.tid}/pending`)).status, 404);
  });
  await t.test('운영자 승인 · 거절(사유) · 일괄 — 감사 기록 · 승인되면 대기 표로 바로 로그인', async () => {
    assert.equal((await call('X', 'POST', '/api/learners/decide', { sids: [lidA], ok: true })).status, 401);
    assert.equal((await call('APR', 'POST', '/api/learners/decide', { sids: [lidB], ok: false })).j.error, 'reason');
    const rj = await call('APR', 'POST', '/api/learners/decide', { sids: [lidB], ok: false, reason: '재직 확인이 필요합니다' }); assert.equal(rj.j.n, 1); assert.equal(rj.j.mail, false);
    const pb = await call('B1', 'GET', `/api/pub/${APR.tid}/pending`); assert.equal(pb.j.status, 'rejected'); assert.equal(pb.j.reason, '재직 확인이 필요합니다');
    assert.equal((await call('B2', 'POST', `/api/pub/${APR.tid}/login`, { via: 'email', email: `b1${sfx}@ex.com`, pw: 'Learn!ng123' })).j.error, 'rejected');
    assert.equal((await call('OPEN', 'POST', '/api/learners/decide', { sids: [lidA], ok: true })).j.n, 0, '다른 기관 학습자는 처리 불가');
    const ok = await call('APR', 'POST', '/api/learners/decide', { sids: [lidA, lidK, 'not-a-uuid'], ok: true }); assert.equal(ok.j.n, 2);
    const pa = await call('A1', 'GET', `/api/pub/${APR.tid}/pending`); assert.equal(pa.j.status, 'active'); assert.equal((await call('A1', 'GET', `/api/pub/${APR.tid}/me`)).j.me.sid, lidA);
    assert.equal((await call('A1', 'GET', `/api/pub/${APR.tid}/pending`)).status, 404, '표는 한 번 쓰고 지움');
    assert.equal(await social('K3', APR.tid, 'kakao', 'ka' + sfx, 'login'), 'ok');
    const au = (await pool.query("select action, detail from audit_log where tenant_id = $1 and action like 'learner.%' and action <> 'learner.signup' order by at", [APR.tid])).rows;
    assert.deepEqual(au.map(x => x.action).sort(), ['learner.approve', 'learner.approve', 'learner.reject']);
    /* 거절 뒤 다시 승인 */ await call('APR', 'POST', '/api/learners/decide', { sids: [lidB], ok: true }); assert.equal((await call('B2', 'POST', `/api/pub/${APR.tid}/login`, { via: 'email', email: `b1${sfx}@ex.com`, pw: 'Learn!ng123' })).status, 200);
  });
  await t.test('대학: 소셜 가입도 학번 · 학과만(이메일 · 비밀번호 없음)', async () => {
    assert.equal(await social('U1', UNI.tid, 'kakao', 'u1' + sfx), 'join-kakao');
    assert.equal((await call('U1', 'POST', `/api/pub/${UNI.tid}/signup`, { via: 'sns', oauth: true, consent })).j.error, 'student_no');
    const s = await call('U1', 'POST', `/api/pub/${UNI.tid}/signup`, { via: 'sns', oauth: true, student_no: '20269001', dept: '컴퓨터공학과', email: 'leak@ex.com', consent }); assert.equal(s.status, 200, JSON.stringify(s.j)); assert.equal(s.j.me.login, 'kakao');
    const id = (await pool.query('select email_enc, email_bidx, pw_hash, provider from pii.identity where tid = $1 and learner_id = $2', [UNI.tid, s.j.me.sid])).rows[0]; assert.deepEqual([id.email_enc, id.email_bidx, id.pw_hash, id.provider], [null, null, null, 'kakao']);
    assert.equal((await pool.query('select student_no from learner_accounts where tenant_id = $1 and learner_id = $2', [UNI.tid, s.j.me.sid])).rows[0].student_no, '20269001');
    assert.equal(await social('U2', UNI.tid, 'kakao', 'u1' + sfx, 'login'), 'ok');
    assert.equal((await call('U3', 'POST', `/api/pub/${UNI.tid}/signup`, { via: 'univ', student_no: '20269002', dept: '경영학과', pw: 'Learn!ng123', consent })).status, 200, '학번 가입은 그대로');
  });
});
