'use strict';
/* QA7 대조: 학습자 회원가입 · 소셜 로그인(구글 · 카카오 · 네이버, 모의 제공자) · 누구나 가입 · 기관 승인 · 거절 · 승인 후 로그인 · decide 권한 · 대기 쿠키
   Node와 Java에 같은 시나리오를 돌려 상태코드 · 오류 코드 · 응답 키 · 리디렉션 모양 · state 내용 · 감사 기록을 비교한다.
   사용: DATABASE_URL=… node test/contract-lsignup.js http://127.0.0.1:9971 http://127.0.0.1:9972
   두 서버 환경: . test/env.sh 후 SIGNUP_CODE=C0DE OAUTH_MOCK_URL=http://127.0.0.1:${LSU_MOCK_PORT:-8096}
     LEARNER_OAUTH_KAKAO_ID=lk-id LEARNER_OAUTH_NAVER_ID=ln-id LEARNER_OAUTH_NAVER_SECRET=ln-sec OAUTH_GOOGLE_ID=op-g-id OAUTH_GOOGLE_SECRET=op-g-sec
   모의 제공자(이 프로세스): 인가 코드 = 회원 번호 씨앗(Node service/test/learner-signup.test.js와 같은 방식) */
const http = require('node:http'); const { Pool } = require('pg');
const [A, B] = [process.argv[2], process.argv[3]]; const MP = Number(process.env.LSU_MOCK_PORT || 8096); const MU = `http://127.0.0.1:${MP}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const seen = [];
const mock = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
  const u = new URL(q.url, 'http://x'); const [, p, act] = u.pathname.split('/'); const out = j => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify(j)); };
  if (act === 'token') { const f = new URLSearchParams(b); seen.push(`${p}:${f.get('client_id')}:${!!f.get('client_secret')}:${p === 'naver' ? !!f.get('state') : '-'}`); if (f.get('code') === 'bad') { r.writeHead(400); return r.end('{}'); } return out({ access_token: 'at.' + f.get('code'), token_type: 'bearer' }); }
  if (act === 'me') { const sub = 'S' + String(q.headers.authorization || '').replace('Bearer at.', ''); return out(p === 'google' ? { sub } : p === 'naver' ? { resultcode: '00', message: 'success', response: { id: sub } } : { id: Number.isNaN(+sub.slice(1)) ? sub : sub }); }
  r.writeHead(404); r.end(); }); });

async function run(U, tag) {
  const jar = {}; const ck = who => Object.entries(jar[who] || {}).map(([k, v]) => `${k}=${v}`).join('; ');
  const keep = (who, r) => { const J = jar[who] = jar[who] || {}; for (const c of r.headers.getSetCookie()) { const [kv, ...a] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i).trim(); if (/max-age=0/i.test(a.join(';')) || !kv.slice(i + 1)) delete J[k]; else J[k] = kv.slice(i + 1); } };
  const call = async (who, method, p, body) => { const r = await fetch(U + p, { method, redirect: 'manual', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), cookie: ck(who) }, body: body ? JSON.stringify(body) : undefined });
    const set = r.headers.getSetCookie().map(c => c.split('=')[0] + (/max-age=0/i.test(c) ? ':del' : '')).sort().join(','); keep(who, r); const j = await r.json().catch(() => ({}));
    return { st: r.status, loc: r.headers.get('location') || '', j, err: j.error || '', keys: Object.keys(j).sort().join(','), set }; };
  const oa = loc => decodeURIComponent((/[?&]oa=([\w-]+)/.exec(loc) || [])[1] || '');
  const shape = loc => loc.replace(/t=tn_[a-z0-9]+/, 't=T');
  const social = async (who, tid, p, code, m = 'join') => { const s = await call(who, 'GET', `/api/pub/${tid}/loauth/${p}/start?m=${m}`); const au = new URL(s.loc);
    const c = await call(who, 'GET', `/api/pub/loauth/${p}/callback?code=${code}&state=${encodeURIComponent(au.searchParams.get('state'))}`); return { st: c.st, oa: oa(c.loc), loc: shape(c.loc), set: c.set }; };
  const sfx = tag + Date.now().toString(36); const R = {}; const consent = { tos: true, privacy: true };
  const org = async (who, type, acct) => { const T = (await call(who, 'POST', '/api/signup', { email: `ls${who.toLowerCase()}${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: who, type, code: 'C0DE' })).j.tenant;
    await call(who, 'PUT', '/api/state', { doc: { org: { name: who, type, room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: ['kakao', 'google', 'naver'], ...acct } }, members: [] }, rev: 0 }); return T; };
  const OPEN = await org('OPEN', 'adult', { approve: 'auto' }); const APR = await org('APR', 'corp', { approve: 'manual' }); const UNI = await org('UNI', 'univ', { approve: 'auto', social: ['kakao'] });
  const emailJoin = async (who, tid, email, nick) => { const o = await call(who, 'POST', `/api/pub/${tid}/otp`, { email, purpose: 'signup' }); return call(who, 'POST', `/api/pub/${tid}/signup`, { via: 'email', email, code: o.j.dev_code, nickname: nick, pw: 'Learn!ng123', consent, age14: true }); };

  /* 1. ready · start 리디렉션 · state */
  { const r = await call('X', 'GET', `/api/pub/${OPEN.tid}/loauth`); R.ready = { st: r.st, keys: r.keys, ready: [...r.j.ready].sort() }; }
  R.readyBadTid = (await call('X', 'GET', '/api/pub/nope/loauth')).err;
  R.start = {};
  for (const p of ['google', 'kakao', 'naver']) { const s = await call('S0', 'GET', `/api/pub/${OPEN.tid}/loauth/${p}/start?m=login&app=1`); const au = new URL(s.loc); const st = au.searchParams.get('state'); const [b64, mac] = st.split('.');
    const o = JSON.parse(Buffer.from(b64, 'base64url').toString()); R.start[p] = { st: s.st, at: au.origin + au.pathname === `${MU}/${p}/auth`, q: [...au.searchParams.keys()].sort().join(','), scope: au.searchParams.get('scope'), prompt: au.searchParams.get('prompt'), client: au.searchParams.get('client_id'),
      cb: au.searchParams.get('redirect_uri') === `${U}/api/pub/loauth/${p}/callback`, state: Object.keys(o).sort().join(','), stT: o.t === OPEN.tid, stP: o.p, stM: o.m, stA: o.a, ttl: Math.round((o.x - Date.now()) / 60000), mac: mac.length, nonce: o.n === jar.S0.dd_lnonce, set: s.set, cc: s.loc && 1 }; }
  R.startBadTid = (await call('X', 'GET', '/api/pub/nope/loauth/kakao/start')).st;
  R.post = (await call('X', 'POST', `/api/pub/loauth/kakao/callback`, {})).st;
  /* 2. state 검증 */
  { const s = await call('Z', 'GET', `/api/pub/${OPEN.tid}/loauth/kakao/start`); const st = new URL(s.loc).searchParams.get('state');
    R.noNonce = shape((await call('Z2', 'GET', `/api/pub/loauth/kakao/callback?code=x&state=${encodeURIComponent(st)}`)).loc);
    R.swap = shape((await call('Z', 'GET', `/api/pub/loauth/naver/callback?code=x&state=${encodeURIComponent(st)}`)).loc);
    R.tamper = shape((await call('Z', 'GET', `/api/pub/loauth/kakao/callback?code=x&state=${encodeURIComponent(st.slice(0, -2) + 'AA')}`)).loc);
    R.denied = shape((await call('Z', 'GET', `/api/pub/loauth/kakao/callback?error=access_denied&state=${encodeURIComponent(st)}`)).loc); }
  R.off = shape((await call('Z', 'GET', `/api/pub/${UNI.tid}/loauth/google/start`)).loc);
  R.bad = await social('Z3', OPEN.tid, 'kakao', 'bad');
  /* 3. 누구나 가입(open): 이메일 · 소셜 */
  { const s = await emailJoin('E1', OPEN.tid, `e1${sfx}@ex.com`, '열린학습자'); R.emailOpen = { st: s.st, keys: s.keys, me: Object.keys(s.j.me || {}).sort().join(','), status: s.j.me && s.j.me.status, me2: (await call('E1', 'GET', `/api/pub/${OPEN.tid}/me`)).st }; }
  R.soc = {};
  for (const p of ['kakao', 'google', 'naver']) { const code = p[0] + '1' + sfx; const j = await social('S' + p, OPEN.tid, p, code); const pre = (await call('S' + p, 'GET', `/api/pub/${OPEN.tid}/me`)).st;
    const s = await call('S' + p, 'POST', `/api/pub/${OPEN.tid}/signup`, { via: 'sns', oauth: true, nickname: p + '회원', consent, age14: true });
    const again = (await call('S' + p, 'POST', `/api/pub/${OPEN.tid}/signup`, { via: 'sns', oauth: true, nickname: p + '두번', consent, age14: true })).err;
    R.soc[p] = { join: j, pre, st: s.st, keys: s.keys, login: s.j.me && s.j.me.login, status: s.j.me && s.j.me.status, set: s.set, again };
    if (p === 'kakao') { const l = await social('S2' + p, OPEN.tid, p, code, 'login'); R.soc[p].relogin = l; R.soc[p].sameSid = (await call('S2' + p, 'GET', `/api/pub/${OPEN.tid}/me`)).j.me.sid === s.j.me.sid; } }
  R.forge = (await call('Z4', 'POST', `/api/pub/${OPEN.tid}/signup`, { via: 'sns', oauth: true, nickname: '위조', consent, age14: true })).err;
  R.rawSub = (await pool.query("select count(*)::int n from pii.identity where tid = $1 and provider_sub_hash like $2", [OPEN.tid, '%' + sfx + '%'])).rows[0].n;
  R.noEmail = (await pool.query("select count(*)::int n from pii.identity where tid = $1 and provider in ('kakao','google','naver') and email_enc is not null", [OPEN.tid])).rows[0].n;
  /* 4. 기관 승인(approval): 가입 → 대기 · 대기 쿠키 · 로그인도 대기 */
  let lidA, lidB, lidK;
  { const s = await emailJoin('A1', APR.tid, `a1${sfx}@ex.com`, '승인대기'); lidA = s.j.me.sid; R.aprJoin = { st: s.st, keys: s.keys, status: s.j.me.status, pend: Object.keys(s.j.pending || {}).sort().join(','), pstatus: s.j.pending && s.j.pending.status, set: s.set };
    R.aprMe = (await call('A1', 'GET', `/api/pub/${APR.tid}/me`)).st;
    const p = await call('A1', 'GET', `/api/pub/${APR.tid}/pending`); R.aprPend = { st: p.st, keys: p.keys, status: p.j.status, nick: p.j.nick, login: p.j.login, at: !!p.j.at };
    const l = await call('A2', 'POST', `/api/pub/${APR.tid}/login`, { via: 'email', email: `a1${sfx}@ex.com`, pw: 'Learn!ng123' }); R.aprLogin = { st: l.st, keys: l.keys, err: l.err, pend: Object.keys(l.j.pending || {}).sort().join(','), msg: l.j.message, set: l.set };
    R.aprPend2 = (await call('A2', 'GET', `/api/pub/${APR.tid}/pending`)).j.status;
    lidB = (await emailJoin('B1', APR.tid, `b1${sfx}@ex.com`, '거절될회원')).j.me.sid;
    R.aprK1 = await social('K1', APR.tid, 'kakao', 'ka' + sfx); const k = await call('K1', 'POST', `/api/pub/${APR.tid}/signup`, { via: 'sns', oauth: true, nickname: '카카오대기', consent, age14: true }); R.aprK1s = { status: k.j.me.status, set: k.set }; lidK = k.j.me.sid;
    R.aprK2 = await social('K2', APR.tid, 'kakao', 'ka' + sfx, 'login');
    R.noTicket = (await call('X', 'GET', `/api/pub/${APR.tid}/pending`));
    R.noTicket = { st: R.noTicket.st, err: R.noTicket.err }; }
  /* 5. decide: 권한 · 사유 · 거절 · 승인 · 다른 기관 · 승인 후 로그인 */
  { R.dNoAuth = (await call('X', 'POST', '/api/learners/decide', { sids: [lidA], ok: true })).st;
    const tc = await call('APR', 'POST', '/api/staff', { email: `lt${sfx}@a.kr`, role: 'teacher' }); await call('T', 'POST', '/api/login', { email: `lt${sfx}@a.kr`, password: tc.j.password }); await call('T', 'POST', '/api/password', { current: tc.j.password, next: 'Passw0rd-tch1' });
    const t = await call('T', 'POST', '/api/learners/decide', { sids: [lidA], ok: true }); R.dTeacher = { st: t.st, err: t.err };
    R.dNoSids = (await call('APR', 'POST', '/api/learners/decide', { sids: ['x'], ok: true })).err;
    R.dNoReason = (await call('APR', 'POST', '/api/learners/decide', { sids: [lidB], ok: false })).err;
    const rj = await call('APR', 'POST', '/api/learners/decide', { sids: [lidB], ok: false, reason: '재직 확인이 필요합니다' }); R.dReject = { st: rj.st, keys: rj.keys, n: rj.j.n, mail: rj.j.mail, mailed: rj.j.mailed };
    const pb = await call('B1', 'GET', `/api/pub/${APR.tid}/pending`); R.pRejected = { keys: pb.keys, status: pb.j.status, reason: pb.j.reason };
    const lb = await call('B2', 'POST', `/api/pub/${APR.tid}/login`, { via: 'email', email: `b1${sfx}@ex.com`, pw: 'Learn!ng123' }); R.lRejected = { st: lb.st, err: lb.err, msg: lb.j.message, pend: Object.keys(lb.j.pending || {}).sort().join(',') };
    R.dOther = (await call('OPEN', 'POST', '/api/learners/decide', { sids: [lidA], ok: true })).j.n;
    R.dOk = (await call('APR', 'POST', '/api/learners/decide', { sids: [lidA, lidK, 'not-a-uuid', lidA], ok: true })).j.n;
    const pa = await call('A1', 'GET', `/api/pub/${APR.tid}/pending`); R.pActive = { keys: pa.keys, status: pa.j.status, sid: pa.j.sid === lidA, set: pa.set, me: (await call('A1', 'GET', `/api/pub/${APR.tid}/me`)).j.me.sid === lidA };
    R.pUsed = (await call('A1', 'GET', `/api/pub/${APR.tid}/pending`)).st;
    R.kAfter = await social('K3', APR.tid, 'kakao', 'ka' + sfx, 'login');
    R.audit = (await pool.query("select action, detail from audit_log where tenant_id = $1 and action in ('learner.approve','learner.reject') order by at, action", [APR.tid])).rows.map(x => x.action + ':' + Object.keys(typeof x.detail === 'string' ? JSON.parse(x.detail) : x.detail).sort().join('+')).sort();
    R.dbDecision = (await pool.query('select decision, reject_reason is not null r, decided_at is not null d from learner_accounts where tenant_id = $1 and learner_id = any($2::uuid[]) order by decision', [APR.tid, [lidA, lidB]])).rows;
    await call('APR', 'POST', '/api/learners/decide', { sids: [lidB], ok: true }); R.reApprove = (await call('B2', 'POST', `/api/pub/${APR.tid}/login`, { via: 'email', email: `b1${sfx}@ex.com`, pw: 'Learn!ng123' })).st;
    const dl = await call('B1', 'DELETE', `/api/pub/${APR.tid}/pending`); R.pDelete = { st: dl.st, keys: dl.keys, set: dl.set, after: (await call('B1', 'GET', `/api/pub/${APR.tid}/pending`)).st }; }
  /* 6. 대학: 소셜 가입도 학번 · 학과만 */
  { R.uJoin = await social('U1', UNI.tid, 'kakao', 'u1' + sfx);
    R.uNoStu = (await call('U1', 'POST', `/api/pub/${UNI.tid}/signup`, { via: 'sns', oauth: true, consent })).err;
    const s = await call('U1', 'POST', `/api/pub/${UNI.tid}/signup`, { via: 'sns', oauth: true, student_no: '20269001', dept: '컴퓨터공학과', email: 'leak@ex.com', pw: 'Learn!ng123', consent }); R.uSign = { st: s.st, login: s.j.me && s.j.me.login, nick: s.j.me && s.j.me.nickname };
    const id = (await pool.query('select email_enc, email_bidx, pw_hash, provider from pii.identity where tid = $1 and learner_id = $2', [UNI.tid, s.j.me.sid])).rows[0]; R.uPii = [id.email_enc, id.email_bidx, id.pw_hash, id.provider];
    R.uAcct = (await pool.query('select login, student_no, dept from learner_accounts where tenant_id = $1 and learner_id = $2', [UNI.tid, s.j.me.sid])).rows[0];
    R.uLogin = await social('U2', UNI.tid, 'kakao', 'u1' + sfx, 'login');
    R.uEmail = (await call('U3', 'POST', `/api/pub/${UNI.tid}/signup`, { via: 'email', email: `u3${sfx}@ex.com`, consent })).err;
    R.uStu = (await call('U3', 'POST', `/api/pub/${UNI.tid}/signup`, { via: 'univ', student_no: '20269002', dept: '경영학과', pw: 'Learn!ng123', consent })).st; }
  return R;
}

(async () => {
  await new Promise(r => mock.listen(MP, '127.0.0.1', r));
  try {
    const a = await run(A, 'n'); const b = await run(B, 'j');
    if (process.env.LSU_DUMP) console.log(JSON.stringify(b));
    /* 기대값(Node 기준 시나리오) */
    ok(a.ready.ready.join() === 'google,kakao,naver', 'ready ' + a.ready.ready); ok(a.start.google.scope === 'openid' && a.start.kakao.scope === null && a.start.naver.scope === null, 'scope 최소');
    ok(a.start.kakao.state === 'a,m,n,p,t,x' && a.start.kakao.stT && a.start.kakao.nonce && a.start.kakao.at && a.start.kakao.cb, 'state 모양');
    ok(a.soc.kakao.join.oa === 'join-kakao' && a.soc.kakao.status === 'active' && a.soc.kakao.relogin.oa === 'ok' && a.soc.kakao.sameSid, '소셜 가입 · 재로그인');
    ok(a.aprJoin.status === 'pending' && a.aprLogin.err === 'pending' && a.aprK2.oa === 'pending', '승인제'); ok(a.pRejected.status === 'rejected' && a.lRejected.err === 'rejected', '거절');
    ok(a.pActive.status === 'active' && a.pActive.me && a.kAfter.oa === 'ok', '승인 후 로그인'); ok(a.dTeacher.st === 403 && a.dTeacher.err === 'teacher', '교수자 403 ' + a.dTeacher.err);
    ok(a.rawSub === 0 && a.noEmail === 0 && a.uPii.join() === ',,,kakao', '식별자 해시만 · 대학 학번 · 학과만');
    ok(seen.filter(x => x.startsWith('naver:')).every(x => x === 'naver:ln-id:true:true') && seen.some(x => x === 'google:op-g-id:true:-') && seen.some(x => x === 'kakao:lk-id:false:-'), 'token 교환 키 ' + [...new Set(seen)].join(' '));
    /* Node = Java */
    for (const k of Object.keys(a)) { const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]); ok(x === y, `${k}\n   node ${x}\n   java ${y}`); }
  } catch (e) { fail++; console.error(e); }
  await pool.end(); mock.close();
  console.log(`contract-lsignup: ${pass} 통과, ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
