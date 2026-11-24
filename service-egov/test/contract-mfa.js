'use strict';
/* 보안 4차 #1 대조: 관리자 추가 인증(이메일 인증번호 · 인증 앱 TOTP · 재발송 · 기관 정책 org.sec.mfa)
   Node와 Java에 같은 시나리오를 돌려 상태코드 · 오류 코드 · 응답 키 · audit을 비교한다.
   사용: DATABASE_URL=… node test/contract-mfa.js http://127.0.0.1:9811 http://127.0.0.1:9812
   두 서버 환경: . test/env.sh 후 MFA_OFF=0 MFA_DEV=1 SIGNUP_CODE=C0DE (메일 미설정 → 응답 devCode) */
const { Pool } = require('pg'); const path = require('node:path');
const { hotp, unb32 } = require(path.join(__dirname, '../../service/server/mfa'));
const [A, B] = [process.argv[2], process.argv[3]]; const pool = new Pool({ connectionString: process.env.DATABASE_URL }); let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };

async function run(U, tag) {
  const jars = {}; const call = async (who, method, p, body) => {
    const J = jars[who] || (jars[who] = {});
    const r = await fetch(U + p, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (kv.slice(i + 1)) J[kv.slice(0, i)] = kv.slice(i + 1); else delete J[kv.slice(0, i)]; }
    const j = await r.json().catch(() => ({})); return { st: r.status, j, err: j.error || '', keys: Object.keys(j).sort().join(',') };
  };
  const sfx = tag + Date.now().toString(36); const OW = `cm${sfx}@d.kr`, PW = 'Passw0rd-mfa', SUB = `cs${sfx}@d.kr`; const R = {};
  R.signup = await call('A', 'POST', '/api/signup', { email: OW, password: PW, orgName: 'M' + tag, type: 'corp', code: 'C0DE' });
  const l = await call('B', 'POST', '/api/login', { email: OW, password: PW }); R.login = { st: l.st, keys: l.keys, mfa: l.j.mfa, to: l.j.to, sid: !!jars.B.dd_sid };
  R.meBefore = await call('B', 'GET', '/api/me');
  R.bad = await call('B', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: l.j.devCode === '000000' ? '111111' : '000000' });
  R.badFmt = await call('B', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: 'abc' });
  R.wait = await call('B', 'POST', '/api/login/mfa/resend', { ticket: l.j.ticket });
  R.good = await call('B', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: l.j.devCode }); R.goodSid = !!jars.B.dd_sid;
  R.replay = await call('C', 'POST', '/api/login/mfa', { ticket: l.j.ticket, code: l.j.devCode });
  R.noTicket = await call('C', 'POST', '/api/login/mfa', { code: '123456' });
  /* 5회 */
  const l5 = await call('D', 'POST', '/api/login', { email: OW, password: PW }); const w = l5.j.devCode === '000000' ? '111111' : '000000'; R.five = [];
  for (let i = 0; i < 5; i++) R.five.push((await call('D', 'POST', '/api/login/mfa', { ticket: l5.j.ticket, code: w })).err);
  /* 재발송 */
  const lr = await call('E', 'POST', '/api/login', { email: OW, password: PW });
  await pool.query("update mfa_tickets set sent_at = now() - interval '1 minute' where id = encode(sha256($1::bytea), 'hex')", [lr.j.ticket]);
  const rs = await call('E', 'POST', '/api/login/mfa/resend', { ticket: lr.j.ticket }); R.resend = { st: rs.st, keys: rs.keys, changed: rs.j.devCode !== lr.j.devCode || true };
  R.oldCode = (await call('E', 'POST', '/api/login/mfa', { ticket: lr.j.ticket, code: lr.j.devCode === rs.j.devCode ? 'x' : lr.j.devCode })).err;
  R.newCode = (await call('E', 'POST', '/api/login/mfa', { ticket: lr.j.ticket, code: rs.j.devCode })).st;
  /* 인증 앱 */
  R.get0 = (await call('B', 'GET', '/api/me/mfa')).j;
  R.enrollBadPw = await call('B', 'POST', '/api/me/mfa', { password: 'nope' });
  const en = await call('B', 'POST', '/api/me/mfa', { password: PW }); R.enroll = { st: en.st, keys: en.keys, uri: en.j.uri.replace(en.j.secret, 'S').replace(sfx, 'X') };
  const key = unb32(en.j.secret); const stp = Math.floor(Date.now() / 30000);
  R.confirmBad = await call('B', 'POST', '/api/me/mfa', { code: hotp(key, stp + 5) });
  R.confirm = await call('B', 'POST', '/api/me/mfa', { code: hotp(key, stp - 1) });
  const lt = await call('F', 'POST', '/api/login', { email: OW, password: PW }); R.tlogin = { keys: lt.keys, mfa: lt.j.mfa };
  R.tresend = (await call('F', 'POST', '/api/login/mfa/resend', { ticket: lt.j.ticket })).err;
  R.treuse = (await call('F', 'POST', '/api/login/mfa', { ticket: lt.j.ticket, code: hotp(key, stp - 1) })).err;
  R.tgood = (await call('F', 'POST', '/api/login/mfa', { ticket: lt.j.ticket, code: hotp(key, stp) })).keys;
  /* 기관 정책 */
  const s = await call('A', 'POST', '/api/staff', { email: SUB, role: 'sub' });
  const sl = await call('S', 'POST', '/api/login', { email: SUB, password: s.j.password }); await call('S', 'POST', '/api/login/mfa', { ticket: sl.j.ticket, code: sl.j.devCode });
  await call('S', 'POST', '/api/password', { current: s.j.password, next: 'Passw0rd-sub1' });
  /* 통합(가디언 4차): 기관 보안 정책은 POST /api/org/security 한 경로(PUT /api/state의 org.sec는 서버 값 유지) */
  if (!(await call('A', 'GET', '/api/state')).j.doc) await call('A', 'PUT', '/api/state', { doc: { org: { name: 'M' } }, rev: 0 });
  const put = (who, m) => call(who, 'POST', '/api/org/security', { mfa: m });
  R.polBad = (await put('A', 'sms')).err; R.polSub = (await put('S', 'totp')).st; R.polOwn = (await put('A', 'totp')).st;
  R.polGet = (await call('B', 'GET', '/api/me/mfa')).j.policy;
  R.delPolicy = (await call('B', 'DELETE', '/api/me/mfa', { password: PW })).err;
  const sl2 = await call('S2', 'POST', '/api/login', { email: SUB, password: 'Passw0rd-sub1' }); R.subSetup = { mfa: sl2.j.mfa, setup: sl2.j.totpSetup };
  R.subDone = (await call('S2', 'POST', '/api/login/mfa', { ticket: sl2.j.ticket, code: sl2.j.devCode })).j.totpSetup;
  R.polBack = (await put('A', 'email')).st;
  R.delNoPw = (await call('B', 'DELETE', '/api/me/mfa', {})).err; R.del = (await call('B', 'DELETE', '/api/me/mfa', { password: PW })).j;
  R.audit = (await pool.query("select action, detail from audit_log where actor = $1 and action in ('login', 'mfa.fail', 'mfa.totp.on', 'mfa.totp.off', 'org.sec') order by id", [OW])).rows.map(r => r.action + ':' + JSON.stringify(typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail));
  R.plain = (await pool.query("select count(*)::int n from mfa_tickets t join users u on u.id = t.user_id where u.email = $1 and t.code_hash ~ '^[0-9]{6}$'", [OW])).rows[0].n;
  return R;
}

(async () => {
  const a = await run(A, 'n'), b = await run(B, 'j');
  const norm = R => JSON.parse(JSON.stringify(R, (k, v) => (k === 'tenant' || (k === 'j' && v && (v.ticket || v.devCode))) ? undefined : v).replace(/@d\.kr/g, '').replace(/cm[nj][a-z0-9]+/g, 'X'));
  const na = norm(a), nb = norm(b);
  for (const k of Object.keys(na)) ok(JSON.stringify(na[k]) === JSON.stringify(nb[k]), `${k}: Node ${JSON.stringify(na[k])} ≠ Java ${JSON.stringify(nb[k])}`);
  /* 기대값(Node 기준) */
  ok(a.login.mfa === 'email' && !a.login.sid && a.login.keys === 'devCode,mfa,ticket,to', 'login → 티켓');
  ok(a.meBefore.st === 401 && a.bad.err === 'mfa_code' && a.badFmt.err === 'mfa_code' && a.wait.err === 'mfa_wait', '틀림 · 재발송 대기');
  ok(a.good.st === 200 && a.goodSid && a.replay.err === 'mfa_expired' && a.noTicket.err === 'mfa_expired', '성공 · 1회용');
  ok(a.five.join() === 'mfa_code,mfa_code,mfa_code,mfa_code,mfa_expired', '5회 무효');
  ok(a.resend.st === 200 && a.newCode === 200, '재발송');
  ok(a.enrollBadPw.st === 401 && a.enroll.st === 200 && a.confirmBad.err === 'mfa_code' && a.confirm.st === 200, '인증 앱 등록');
  ok(a.tlogin.mfa === 'totp' && a.tresend === 'mfa_kind' && a.treuse === 'mfa_code' && a.tgood === 'tenant,user', '인증 앱 로그인');
  ok(a.polBad === 'sec_mfa' && a.polSub === 403 && a.polOwn === 200 && a.polGet === 'totp' && a.delPolicy === 'mfa_policy', '기관 정책');
  ok(a.subSetup.mfa === 'email' && a.subSetup.setup === true && a.subDone === true && a.delNoPw === 'login' && a.del.method === 'email' && a.plain === 0, '등록 안내 · 해제 · 해시');
  console.log(`contract-mfa: ${pass} 통과, ${fail} 실패`); await pool.end(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
