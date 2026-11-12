'use strict';
/* v32.4 운영자 소셜 로그인(구글 · 카카오) — 서버가 OAuth 인가 코드 흐름을 직접 처리한다.
   - 브라우저는 /api/oauth/<제공자>/start 로 이동 → 제공자 동의 → /api/oauth/<제공자>/callback(서버가 코드 교환)
   - 받는 정보: 제공자 회원 번호(sub)와 '제공자가 확인한' 이메일뿐. 이름 · 사진 · 전화번호는 요청하지 않는다.
   - 저장: user_oauth(provider, sub, user_id). 운영자 계정은 원래 이메일로 식별하므로 확인된 이메일이 같으면 기존 계정에 연결한다.
   - 처음 오는 사람은 서명된 보류 쿠키(15분)를 받고, 기관명 · 유형만 입력해 가입을 마친다(POST /api/oauth/signup).
   - 키: OAUTH_GOOGLE_ID · OAUTH_GOOGLE_SECRET · OAUTH_KAKAO_ID(REST API 키) · OAUTH_KAKAO_SECRET(선택) · PUBLIC_URL(콜백 주소의 앞부분)
   - 시험: OAUTH_MOCK_URL(운영 NODE_ENV=production에서는 무시) — 모든 제공자 주소를 모의 서버로 바꾼다. Java(OAuthServiceImpl)와 같은 규격. */
const crypto = require('node:crypto');

const PROV = {
  google: { auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', me: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email' },
  kakao: { auth: 'https://kauth.kakao.com/oauth/authorize', token: 'https://kauth.kakao.com/oauth/token', me: 'https://kapi.kakao.com/v2/user/me', scope: 'account_email' },
};
const PEND_MIN = 15;

function oauthConfig(env) {
  const mock = env.NODE_ENV !== 'production' ? String(env.OAUTH_MOCK_URL || '').replace(/\/+$/, '') : '';
  const out = {};
  for (const p of Object.keys(PROV)) {
    const id = String(env[`OAUTH_${p.toUpperCase()}_ID`] || '').trim(); if (!id) continue;
    const u = mock ? { auth: `${mock}/${p}/auth`, token: `${mock}/${p}/token`, me: `${mock}/${p}/me` } : PROV[p];
    out[p] = { ...PROV[p], ...u, id, secret: String(env[`OAUTH_${p.toUpperCase()}_SECRET`] || '').trim() };
  }
  return out;
}

/* 제공자 응답 → { sub, email } (이메일은 제공자가 확인한 경우만) */
function profileOf(p, j) {
  if (p === 'google') return { sub: String(j.sub || ''), email: j.email_verified === true || j.email_verified === 'true' ? String(j.email || '').toLowerCase() : '' };
  const a = j.kakao_account || {};
  return { sub: j.id == null ? '' : String(j.id), email: a.is_email_valid !== false && a.is_email_verified === true ? String(a.email || '').toLowerCase() : '' };
}

function createOAuth({ env, pool, HttpErr, readBody, limit, ip, cookies, secure, newSession, inTenant, audit, hashPw, newTid, sha, safeEq, pepper, mod, M, TYPES, emailOk, allowSignup, signupCode }) {
  const P = oauthConfig(env);
  const base = req => String(env.PUBLIC_URL || '').replace(/\/+$/, '') || `${secure ? 'https' : 'http'}://${req.headers.host}`;
  const cb = (req, p) => `${base(req)}/api/oauth/${p}/callback`;
  const SC = secure ? '__Host-dd_oauth' : 'dd_oauth'; const PC = secure ? '__Host-dd_oauthp' : 'dd_oauthp';
  const ck = (n, v, age, same) => `${n}=${v}; Path=/; HttpOnly; SameSite=${same}; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const addCookie = (res, c) => { const h = res.getHeader('set-cookie'); res.setHeader('set-cookie', [].concat(h || [], c)); };
  const go = (res, hash) => { res.writeHead(302, { location: '/#oauth=' + hash, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }); res.end(); };
  const sign = s => crypto.createHmac('sha256', pepper).update('oauthp|' + s).digest('base64url');
  const seal = o => { const s = Buffer.from(JSON.stringify(o)).toString('base64url'); return `${s}.${sign(s)}`; };
  const unseal = v => {
    const [s, m] = String(v || '').split('.'); if (!s || !m || !safeEq(m, sign(s))) return null;
    try { const o = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')); return o && o.x > Date.now() ? o : null; } catch (e) { return null; }
  };
  const provOf = p => { const c = P[p]; if (!c) throw new HttpErr(404, '사용할 수 없는 로그인 방식입니다.', 'oauth_prov'); return c; };
  const postForm = async (url, form) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8', accept: 'application/json' }, body: new URLSearchParams(form), signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw new Error('token'); return j;
  };
  const getJson = async (url, tok) => {
    const r = await fetch(url, { headers: { authorization: `Bearer ${tok}`, accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('me'); return r.json();
  };

  async function start(req, res, p) {
    const c = provOf(p); limit('oa:' + ip(req), 30, 600e3);
    const state = crypto.randomBytes(24).toString('base64url');
    const q = new URLSearchParams({ response_type: 'code', client_id: c.id, redirect_uri: cb(req, p), scope: c.scope, state });
    if (p === 'google') q.set('prompt', 'select_account');
    res.setHeader('set-cookie', ck(SC, `${state}.${p}`, 600, 'Lax'));
    res.writeHead(302, { location: `${c.auth}?${q}`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }); res.end();
  }

  async function callback(req, res, p, url) {
    const c = provOf(p); limit('oa:' + ip(req), 30, 600e3);
    const clear = ck(SC, '', 0, 'Lax');
    const [st, sp] = String(cookies(req)[SC] || '').split('.');
    const state = url.searchParams.get('state') || ''; const code = url.searchParams.get('code') || '';
    if (!st || sp !== p || !state || !safeEq(st, state)) { res.setHeader('set-cookie', clear); return go(res, 'err:state'); }
    if (url.searchParams.get('error') || !code) { res.setHeader('set-cookie', clear); return go(res, 'err:denied'); }
    let pf;
    try {
      const form = { grant_type: 'authorization_code', client_id: c.id, redirect_uri: cb(req, p), code }; if (c.secret) form.client_secret = c.secret;
      const t = await postForm(c.token, form); pf = profileOf(p, await getJson(c.me, t.access_token));
    } catch (e) { res.setHeader('set-cookie', clear); return go(res, 'err:provider'); }
    if (!pf.sub || pf.sub.length > 200) { res.setHeader('set-cookie', clear); return go(res, 'err:provider'); }
    let u = (await pool.query('select u.id, u.tenant_id, u.role, u.email from user_oauth o join users u on u.id = o.user_id where o.provider = $1 and o.sub = $2', [p, pf.sub])).rows[0];
    if (!u) {
      if (!pf.email || !emailOk(pf.email)) { res.setHeader('set-cookie', clear); return go(res, 'err:email'); }
      u = (await pool.query('select id, tenant_id, role, email from users where lower(email) = $1', [pf.email])).rows[0];
      if (u) {
        await pool.query('insert into user_oauth (provider, sub, user_id) values ($1, $2, $3) on conflict do nothing', [p, pf.sub, u.id]);
        await inTenant(pool, u.tenant_id, cl => audit(cl, u.tenant_id, u.email, 'oauth.link', { provider: p })).catch(() => {});
      }
    }
    if (!u) { /* 처음 온 운영자 → 기관 만들기로 */
      if (!allowSignup) { res.setHeader('set-cookie', clear); return go(res, 'err:signup_off'); }
      res.setHeader('set-cookie', [clear, ck(PC, seal({ p, s: pf.sub, e: pf.email, x: Date.now() + PEND_MIN * 60e3 }), PEND_MIN * 60, 'Strict')]);
      return go(res, 'signup');
    }
    if (mod && !M.roleAllowed(mod, u.role)) { res.setHeader('set-cookie', clear); return go(res, 'err:module'); }
    await pool.query('update users set last_login = now() where id = $1', [u.id]);
    await pool.query('delete from sessions where user_id = $1 and expires_at < now()', [u.id]);
    await newSession(res, u.id, u.tenant_id); addCookie(res, clear);
    await inTenant(pool, u.tenant_id, cl => audit(cl, u.tenant_id, u.email, 'login', { via: p })).catch(() => {});
    return go(res, 'ok');
  }

  const pending = req => unseal(cookies(req)[PC]);
  const routes = {
    'GET /api/oauth/pending': async req => { const o = pending(req); if (!o) throw new HttpErr(404, '소셜 가입 정보가 없거나 만료되었습니다. 다시 시도하세요.', 'oauth_pending'); return { provider: o.p, email: o.e }; },
    'POST /api/oauth/cancel': async (req, res) => { res.setHeader('set-cookie', ck(PC, '', 0, 'Strict')); return { ok: true }; },
    'POST /api/oauth/signup': async (req, res) => {
      if (!allowSignup) throw new HttpErr(403, '지금은 새 기관 가입을 받지 않습니다.', 'signup_off');
      limit('su:' + ip(req), 10, 3600e3);
      const b = await readBody(req, 16384); const o = pending(req);
      if (!o) throw new HttpErr(404, '소셜 가입 정보가 없거나 만료되었습니다. 다시 시도하세요.', 'oauth_pending');
      const name = String(b.orgName || '').trim(); const email = o.e;
      if (signupCode && !safeEq(String(b.code || ''), signupCode)) throw new HttpErr(403, '가입 코드가 올바르지 않습니다.', 'code');
      if (!name || name.length > 30) throw new HttpErr(400, '기관명을 30자 이내로 입력하세요.', 'name');
      if (!TYPES.includes(b.type)) throw new HttpErr(400, '기관 유형을 고르세요.', 'type');
      const pw = await hashPw(crypto.randomBytes(32).toString('base64url') + 'a1'); const tid = newTid();
      const c = await pool.connect(); let uid;
      try {
        await c.query('begin');
        if ((await c.query('select 1 from users where lower(email) = $1', [email])).rowCount) throw new HttpErr(409, '이미 가입된 이메일입니다. 로그인하세요.', 'exists');
        await c.query('insert into tenants (id, name, type) values ($1, $2, $3)', [tid, name, b.type]);
        uid = (await c.query('insert into users (tenant_id, email, pw, role) values ($1, $2, $3, $4) returning id', [tid, email, pw, 'owner'])).rows[0].id;
        await c.query('insert into user_oauth (provider, sub, user_id) values ($1, $2, $3)', [o.p, o.s, uid]);
        await c.query('commit');
      } catch (e) { await c.query('rollback').catch(() => {}); if (e.code === '23505') throw new HttpErr(409, '이미 가입된 계정입니다. 로그인하세요.', 'exists'); throw e; } finally { c.release(); }
      await inTenant(pool, tid, cl => audit(cl, tid, email, 'tenant.create', { type: b.type, via: o.p }));
      await newSession(res, uid, tid); addCookie(res, ck(PC, '', 0, 'Strict'));
      return { user: { email, role: 'owner' }, tenant: { tid, name, type: b.type, mode: 'saas' } };
    },
  };
  /* 리다이렉트로 직접 응답하는 GET 경로 */
  async function handle(req, res, url) {
    const m = url.pathname.match(/^\/api\/oauth\/(google|kakao)\/(start|callback)$/); if (!m || req.method !== 'GET') return false;
    if (m[2] === 'start') await start(req, res, m[1]); else await callback(req, res, m[1], url);
    return true;
  }
  return { providers: Object.keys(P), routes, handle };
}

module.exports = { createOAuth, oauthConfig, profileOf };
