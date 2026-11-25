'use strict';
/* QA7 학습자 소셜 가입 · 로그인(구글 · 카카오 · 네이버) — 운영자 소셜 로그인(oauth.js)과 별도 경로 · 별도 쿠키.
   - 시작: GET /api/pub/<tid>/loauth/<제공자>/start?m=join|login → 제공자 동의 화면(기관 tid를 서명한 state에 담는다)
   - 콜백: GET /api/pub/loauth/<제공자>/callback(제공자별 리디렉션 URI 하나) → 코드 교환 → 회원 번호(sub)만 받는다.
     이름 · 이메일 · 사진 · 전화번호는 요청하지 않는다(구글 scope=openid, 카카오 · 네이버 동의 항목 없음).
   - 저장: pii.identity(provider, provider_sub_hash = HMAC 블라인드 인덱스) — 제공자 식별자 원문은 저장하지 않는다.
   - 결과는 학습자 사이트로 돌려보낸다: /learner.html?t=<tid>#oauth=ok | join-<p> | pending | err-<code>
   - 키: LEARNER_OAUTH_<P>_ID · _SECRET, 없으면 운영자 키 OAUTH_<P>_ID · _SECRET를 그대로 쓴다(같은 앱에 리디렉션 URI만 추가).
     키가 없는 제공자는 /api/pub/<tid>/loauth 응답의 ready에 빠지고 화면은 「준비 중」.
   - 시험: OAUTH_MOCK_URL(운영 NODE_ENV=production에서는 무시). Java(LearnerOAuthServiceImpl)와 같은 규격. */
const crypto = require('node:crypto');

const PROV = {
  google: { auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', me: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid' },
  kakao: { auth: 'https://kauth.kakao.com/oauth/authorize', token: 'https://kauth.kakao.com/oauth/token', me: 'https://kapi.kakao.com/v2/user/me', scope: '' },
  naver: { auth: 'https://nid.naver.com/oauth2.0/authorize', token: 'https://nid.naver.com/oauth2.0/token', me: 'https://openapi.naver.com/v1/nid/me', scope: '' },
};
const LPROV = Object.keys(PROV);

function loauthConfig(env) {
  const mock = env.NODE_ENV !== 'production' ? String(env.OAUTH_MOCK_URL || '').replace(/\/+$/, '') : '';
  const out = {};
  for (const p of LPROV) {
    const U = p.toUpperCase(); const own = String(env[`LEARNER_OAUTH_${U}_ID`] || '').trim();
    const id = own || String(env[`OAUTH_${U}_ID`] || '').trim(); if (!id) continue;
    const secret = String((own ? env[`LEARNER_OAUTH_${U}_SECRET`] : env[`OAUTH_${U}_SECRET`]) || '').trim();
    if (p === 'naver' && !secret) continue; /* 네이버는 client_secret 필수 */
    const u = mock ? { auth: `${mock}/${p}/auth`, token: `${mock}/${p}/token`, me: `${mock}/${p}/me` } : PROV[p];
    out[p] = { ...PROV[p], ...u, id, secret, reuse: !own };
  }
  return out;
}
/* 제공자 응답 → 회원 번호(sub)만 */
function subOf(p, j) {
  if (p === 'google') return String((j && j.sub) || '');
  if (p === 'naver') return String((j && j.resultcode === '00' && j.response && j.response.id) || '');
  return j && j.id != null ? String(j.id) : '';
}

/* 서명 봉투(state · 쿠키) — 내용은 비밀이 아닌 값만(기관 tid · 제공자 · 해시 · 만료) */
function sealer(pepper, tag) {
  const sign = s => crypto.createHmac('sha256', pepper).update(tag + '|' + s).digest('base64url');
  const eq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  return {
    seal: o => { const s = Buffer.from(JSON.stringify(o)).toString('base64url'); return `${s}.${sign(s)}`; },
    open: v => { const [s, m] = String(v || '').split('.'); if (!s || !m || !eq(m, sign(s))) return null; try { const o = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')); return o && o.x > Date.now() ? o : null; } catch (e) { return null; } },
  };
}

/* 학습자 쿠키 두 가지: 소셜 가입 보류(15분 · sub 해시) · 승인 대기 표(30일 · 가명 learner_id) */
function createTickets({ pepper, cookies, secure }) {
  const SN = secure ? '__Host-dd_lsns' : 'dd_lsns'; const PN = secure ? '__Host-dd_lpend' : 'dd_lpend';
  const S = sealer(pepper, 'lsns'); const T = sealer(pepper, 'lpend');
  const ck = (n, v, age) => `${n}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const add = (res, c) => { const h = res.getHeader('set-cookie'); res.setHeader('set-cookie', [].concat(h || [], c)); };
  return {
    snsSet: (res, tid, p, h) => add(res, ck(SN, S.seal({ t: tid, p, h, x: Date.now() + 15 * 60e3 }), 900)),
    snsGet: (req, tid) => { const o = S.open(cookies(req)[SN]); return o && o.t === tid ? o : null; },
    snsClear: res => add(res, ck(SN, '', 0)),
    pendSet: (res, tid, lid) => add(res, ck(PN, T.seal({ t: tid, l: lid, x: Date.now() + 30 * 864e5 }), 30 * 86400)),
    pendGet: (req, tid) => { const o = T.open(cookies(req)[PN]); return o && o.t === tid ? o : null; },
    pendClear: res => add(res, ck(PN, '', 0)),
  };
}

function createLearnerOAuth({ env, HttpErr, limit, ip, cookies, secure, pepper, pii, tickets, TID_RE }) {
  const P = loauthConfig(env);
  const ST = sealer(pepper, 'lstate'); const NC = secure ? '__Host-dd_lnonce' : 'dd_lnonce';
  const base = req => String(env.PUBLIC_URL || '').replace(/\/+$/, '') || `${secure ? 'https' : 'http'}://${req.headers.host}`;
  const cb = (req, p) => `${base(req)}/api/pub/loauth/${p}/callback`;
  const go = (res, tid, hash, extra) => { const h = { location: `/learner.html${tid ? '?t=' + encodeURIComponent(tid) : ''}#oauth=${hash}`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }; if (extra) res.setHeader('set-cookie', [].concat(res.getHeader('set-cookie') || [], extra)); res.writeHead(302, h); res.end(); };
  const nonceCk = (v, age) => `${NC}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;

  async function start(req, res, tid, p, url) {
    if (!TID_RE.test(tid)) throw new HttpErr(404, '없는 기관입니다.', 'tenant');
    const c = P[p]; if (!c) return go(res, tid, 'err-unset');
    limit('loa:' + ip(req), 30, 600e3);
    if (!(await pii.socialOn(tid, p))) return go(res, tid, 'err-provider_off');
    const n = crypto.randomBytes(18).toString('base64url'); const m = url.searchParams.get('m') === 'login' ? 'login' : 'join';
    const state = ST.seal({ t: tid, p, n, m, x: Date.now() + 10 * 60e3 });
    const q = new URLSearchParams({ response_type: 'code', client_id: c.id, redirect_uri: cb(req, p), state });
    if (c.scope) q.set('scope', c.scope); if (p === 'google') q.set('prompt', 'select_account');
    res.setHeader('set-cookie', nonceCk(n, 600));
    res.writeHead(302, { location: `${c.auth}?${q}`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }); res.end();
  }

  async function callback(req, res, p, url) {
    const clear = nonceCk('', 0); const st = ST.open(url.searchParams.get('state'));
    if (!st || st.p !== p || !TID_RE.test(st.t || '')) return go(res, '', 'err-state', clear);
    const tid = st.t; const n = cookies(req)[NC] || '';
    if (!n || n !== st.n) return go(res, tid, 'err-state', clear);
    const c = P[p]; if (!c) return go(res, tid, 'err-unset', clear);
    limit('loa:' + ip(req), 30, 600e3);
    const code = url.searchParams.get('code') || ''; if (url.searchParams.get('error') || !code) return go(res, tid, 'err-denied', clear);
    let sub = '';
    try {
      const form = { grant_type: 'authorization_code', client_id: c.id, redirect_uri: cb(req, p), code }; if (c.secret) form.client_secret = c.secret; if (p === 'naver') form.state = url.searchParams.get('state');
      const r = await fetch(c.token, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8', accept: 'application/json' }, body: new URLSearchParams(form), signal: AbortSignal.timeout(10000) });
      const t = await r.json().catch(() => ({})); if (!r.ok || !t.access_token) throw new Error('token');
      const m = await fetch(c.me, { redirect: 'manual', headers: { authorization: `Bearer ${t.access_token}`, accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!m.ok) throw new Error('me'); sub = subOf(p, await m.json());
    } catch (e) { return go(res, tid, 'err-provider', clear); }
    if (!sub || sub.length > 200) return go(res, tid, 'err-provider', clear);
    let r; try { r = await pii.oauthLogin(req, res, tid, p, sub); } catch (e) { return go(res, tid, 'err-' + (e && e.code ? String(e.code).replace(/[^\w]/g, '').slice(0, 30) : 'server'), clear); }
    return go(res, tid, r === 'join' ? 'join-' + p : r, clear);
  }

  async function handle(req, res, url) {
    if (req.method !== 'GET') return false;
    let m = url.pathname.match(/^\/api\/pub\/loauth\/(google|kakao|naver)\/callback$/); if (m) { await callback(req, res, m[1], url); return true; }
    m = url.pathname.match(/^\/api\/pub\/([^/]+)\/loauth\/(google|kakao|naver)\/start$/); if (m) { await start(req, res, m[1], m[2], url); return true; }
    return false;
  }
  return { ready: Object.keys(P), handle, config: P };
}

module.exports = { createLearnerOAuth, createTickets, loauthConfig, subOf, LPROV };
