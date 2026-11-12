'use strict';
/* v32.4 운영자 소셜 로그인(구글 · 카카오) 대조 테스트 — 모의 제공자를 이 프로세스에서 띄운다.
   서버 환경: OAUTH_MOCK_URL=http://127.0.0.1:8097 OAUTH_GOOGLE_ID=gid OAUTH_GOOGLE_SECRET=gsec OAUTH_KAKAO_ID=kid (COOKIE_SECURE=0)
   사용: node test/oauth.js http://127.0.0.1:8301 http://127.0.0.1:8302 */
const http = require('node:http');
const crypto = require('node:crypto');
const MOCK_PORT = Number(process.env.OAUTH_MOCK_PORT || 8097);
const LOG = [];
const mock = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const [, p, what] = u.pathname.split('/');
  let body = ''; req.on('data', c => { body += c; }); req.on('end', () => {
    if (what === 'token' && req.method === 'POST') {
      const f = new URLSearchParams(body); LOG.push({ p, client_id: f.get('client_id'), secret: !!f.get('client_secret'), grant: f.get('grant_type'), cb: f.get('redirect_uri') });
      if (f.get('code') === 'bad') { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"error":"invalid_grant"}'); }
      res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ access_token: f.get('code'), token_type: 'bearer' }));
    }
    if (what === 'me') { const t = String(req.headers.authorization || '').replace(/^Bearer /, ''); try { const j = JSON.parse(Buffer.from(t, 'base64url').toString()); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(j)); } catch (e) { res.writeHead(401); return res.end(); } }
    res.writeHead(404); res.end();
  });
});
const code = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const cookieOf = r => (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(s => s.split(';')[0]);
const jar = (old, add) => { const m = new Map(String(old || '').split('; ').filter(Boolean).map(s => [s.split('=')[0], s])); for (const c of add) { const [k, v] = [c.split('=')[0], c.slice(c.indexOf('=') + 1)]; if (v === '') m.delete(k); else m.set(k, c); } return [...m.values()].join('; '); };
async function req(base, method, p, { cookie, body } = {}) {
  const h = {}; if (cookie) h.cookie = cookie; if (method !== 'GET') h['x-didisam'] = '1'; if (body) h['content-type'] = 'application/json';
  const r = await fetch(base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { j = null; }
  return { st: r.status, loc: r.headers.get('location') || '', set: cookieOf(r), j };
}
/* 시작 → 콜백까지 한 번에. 콜백 결과의 해시(#oauth=…)와 쿠키를 돌려준다 */
async function flow(base, p, profile, { cookie = '', state, error } = {}) {
  const s = await req(base, 'GET', `/api/oauth/${p}/start`, { cookie });
  const au = new URL(s.loc); const ck = jar(cookie, s.set); const st = state || au.searchParams.get('state');
  const q = new URLSearchParams(error ? { error, state: st } : { code: profile === 'bad' ? 'bad' : code(profile), state: st });
  const c = await req(base, 'GET', `/api/oauth/${p}/callback?${q}`, { cookie: ck });
  return { start: { st: s.st, host: au.host, path: au.pathname, client: au.searchParams.get('client_id'), scope: au.searchParams.get('scope'), cbOk: /\/api\/oauth\/(google|kakao)\/callback$/.test(au.searchParams.get('redirect_uri') || ''), hasState: !!st, prompt: au.searchParams.get('prompt') }, st: c.st, hash: c.loc.replace(/^.*#oauth=/, ''), cookie: jar(ck, c.set) };
}
async function scenario(base, tag) {
  const R = {}; const id = `${tag}${Date.now()}${crypto.randomBytes(2).toString('hex')}`;
  const gEmail = `oa_${id}@gmail.com`; const kEmail = `oak_${id}@example.com`;
  R.cfg = (await req(base, 'GET', '/api/config')).j.oauth;
  R.bogus = (await req(base, 'GET', '/api/oauth/naver/start')).st;
  /* 1 상태값 위조 · 거부 · 제공자 오류 · 확인 안 된 이메일 */
  const f1 = await flow(base, 'google', { sub: 'g' + id, email: gEmail, email_verified: true }, { state: 'forged' }); R.start = f1.start; R.forged = [f1.st, f1.hash];
  R.denied = (await flow(base, 'google', null, { error: 'access_denied' })).hash;
  R.provErr = (await flow(base, 'google', 'bad')).hash;
  R.unverified = (await flow(base, 'google', { sub: 'gx' + id, email: gEmail, email_verified: false })).hash;
  R.noCookie = (await req(base, 'GET', `/api/oauth/google/callback?code=x&state=y`)).loc.replace(/^.*#oauth=/, '');
  /* 2 처음 온 운영자 → 보류 → 기관 만들기 */
  const f2 = await flow(base, 'google', { sub: 'g' + id, email: gEmail.toUpperCase(), email_verified: true }); R.newUser = [f2.st, f2.hash];
  const pend = await req(base, 'GET', '/api/oauth/pending', { cookie: f2.cookie }); R.pending = { st: pend.st, provider: pend.j && pend.j.provider, emailOk: pend.j && pend.j.email === gEmail };
  R.pendNone = (await req(base, 'GET', '/api/oauth/pending')).st;
  R.pendForged = (await req(base, 'GET', '/api/oauth/pending', { cookie: 'dd_oauthp=eyJwIjoiZ29vZ2xlIn0.AAAA' })).st;
  R.suNoPend = (await req(base, 'POST', '/api/oauth/signup', { body: { orgName: '대조 기관', type: 'univ' } })).st;
  R.suBadType = (await req(base, 'POST', '/api/oauth/signup', { cookie: f2.cookie, body: { orgName: '대조 기관', type: 'alien' } })).j.error;
  R.suBadName = (await req(base, 'POST', '/api/oauth/signup', { cookie: f2.cookie, body: { orgName: '', type: 'univ' } })).j.error;
  R.suCsrf = (await fetch(base + '/api/oauth/signup', { method: 'POST', headers: { cookie: f2.cookie, 'content-type': 'application/json' }, body: '{}' })).status;
  const su = await req(base, 'POST', '/api/oauth/signup', { cookie: f2.cookie, body: { orgName: '대조 소셜 대학', type: 'univ' } });
  R.signup = { st: su.st, email: su.j && su.j.user.email === gEmail, role: su.j && su.j.user.role, type: su.j && su.j.tenant.type, cleared: su.set.some(c => /oauthp=$/.test(c)) };
  const ck2 = jar(f2.cookie, su.set);
  const me = await req(base, 'GET', '/api/me', { cookie: ck2 }); R.me = { st: me.st, email: me.j && me.j.user.email === gEmail };
  R.suAgain = (await req(base, 'POST', '/api/oauth/signup', { cookie: ck2, body: { orgName: '대조 소셜 대학', type: 'univ' } })).st;
  R.pwLogin = (await req(base, 'POST', '/api/login', { body: { email: gEmail, password: 'whatever123' } })).st;
  /* 3 다시 오면 바로 로그인 */
  const f3 = await flow(base, 'google', { sub: 'g' + id, email: 'other_' + gEmail, email_verified: true }); R.again = [f3.st, f3.hash];
  const me3 = await req(base, 'GET', '/api/me', { cookie: f3.cookie }); R.me3 = { st: me3.st, email: me3.j && me3.j.user.email === gEmail };
  /* 4 이메일로 가입한 운영자 → 카카오(확인된 같은 이메일)로 연결 */
  const pw = await req(base, 'POST', '/api/signup', { body: { email: kEmail, password: 'OauthTest2026x', orgName: '대조 기업', type: 'corp' } }); R.pwSignup = pw.st;
  const f4 = await flow(base, 'kakao', { id: Number(String(Date.now()).slice(-9)), kakao_account: { email: kEmail, is_email_valid: true, is_email_verified: true } }); R.link = [f4.st, f4.hash]; R.kstart = f4.start;
  const me4 = await req(base, 'GET', '/api/me', { cookie: f4.cookie }); R.me4 = { st: me4.st, email: me4.j && me4.j.user.email === kEmail, type: me4.j && me4.j.tenant.type };
  R.kakaoNoEmail = (await flow(base, 'kakao', { id: 77 + Date.now() % 1000000, kakao_account: { is_email_verified: false } })).hash;
  const lg = LOG.filter(x => x.p === 'kakao').pop(); R.kakaoToken = { client: lg && lg.client_id, secret: lg && lg.secret, grant: lg && lg.grant };
  const lgg = LOG.filter(x => x.p === 'google').pop(); R.googleToken = { client: lgg && lgg.client_id, secret: lgg && lgg.secret };
  return R;
}
const WANT = {
  cfg: ['google', 'kakao'], bogus: 404,
  start: { st: 302, host: `127.0.0.1:${MOCK_PORT}`, path: '/google/auth', client: 'gid', scope: 'openid email', cbOk: true, hasState: true, prompt: 'select_account' },
  forged: [302, 'err:state'], denied: 'err:denied', provErr: 'err:provider', unverified: 'err:email', noCookie: 'err:state',
  newUser: [302, 'signup'], pending: { st: 200, provider: 'google', emailOk: true }, pendNone: 404, pendForged: 404, suNoPend: 404, suBadType: 'type', suBadName: 'name', suCsrf: 403,
  signup: { st: 200, email: true, role: 'owner', type: 'univ', cleared: true }, me: { st: 200, email: true }, suAgain: 404, pwLogin: 401,
  again: [302, 'ok'], me3: { st: 200, email: true },
  pwSignup: 200, link: [302, 'ok'], kstart: { st: 302, host: `127.0.0.1:${MOCK_PORT}`, path: '/kakao/auth', client: 'kid', scope: 'account_email', cbOk: true, hasState: true, prompt: null },
  me4: { st: 200, email: true, type: 'corp' }, kakaoNoEmail: 'err:email',
  kakaoToken: { client: 'kid', secret: false, grant: 'authorization_code' }, googleToken: { client: 'gid', secret: true },
};
(async () => {
  await new Promise(ok => mock.listen(MOCK_PORT, '127.0.0.1', ok));
  const bases = [process.argv[2] || 'http://127.0.0.1:8301', process.argv[3]].filter(Boolean);
  let pass = 0, fail = 0;
  for (const [i, b] of bases.entries()) {
    const R = await scenario(b, i ? 'j' : 'n');
    for (const k of Object.keys(WANT)) { const a = JSON.stringify(R[k]), w = JSON.stringify(WANT[k]); if (a === w) pass++; else { fail++; console.log(`  ✗ ${i ? 'Java' : 'Node'} ${k}: ${a} ≠ ${w}`); } }
  }
  console.log(`oauth: 검사 ${pass + fail} · 통과 ${pass} · 실패 ${fail}${bases.length > 1 ? ' (Node · Java)' : ' (Node만)'}`);
  mock.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
