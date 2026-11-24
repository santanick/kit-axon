'use strict';
/* 보안 2차 대조: 새 환경 로그인 알림(GET /api/me/devices · audit login.newdevice · 알림 메일) + SEC-0011(쓰기 MCP 키는 정운영자만)
   Node와 Java에 같은 시나리오를 돌려 상태코드 · 응답 형태 · audit 내용 · 메일 수를 비교한다.
   사용: DATABASE_URL=… MAIL_PORT=<모의 메일 포트(이 스크립트가 연다)> node test/contract-devices.js http://127.0.0.1:9721 http://127.0.0.1:9722
   두 서버 환경: SIGNUP_CODE=C0DE · TRUST_PROXY_HOPS=1 · GEO_COUNTRY_HEADER=x-client-geo-country · MAIL_PROVIDER=webhook · MAIL_WEBHOOK_URL=http://127.0.0.1:$MAIL_PORT/ */
const http = require('node:http'); const { Pool } = require('pg');
const [A, B] = [process.argv[2], process.argv[3]]; const pool = new Pool({ connectionString: process.env.DATABASE_URL }); let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const mails = []; const mock = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => { try { mails.push(JSON.parse(b)); } catch (e) {} r.end('{}'); }); });
const wait = ms => new Promise(ok => setTimeout(ok, ms));

async function run(U, tag) {
  const jars = {}; const call = async (who, method, path, body, hd = {}) => {
    const J = jars[who] || (jars[who] = {});
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', 'x-forwarded-for': '211.36.1.1', ...hd, ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (kv.slice(i + 1)) J[kv.slice(0, i)] = kv.slice(i + 1); }
    const j = await r.json().catch(() => ({})); return { st: r.status, j, err: j.error || j.code || '' };
  };
  const sfx = tag + Date.now().toString(36); const OW = `cd${sfx}@d.kr`, PW = 'Passw0rd-dev'; const R = {}; const m0 = mails.length;
  const evs = async () => (await pool.query("select detail from audit_log where actor = $1 and action = 'login.newdevice' order by id", [OW])).rows.map(r => typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail);
  R.signup = await call('A', 'POST', '/api/signup', { email: OW, password: PW, orgName: 'D' + tag, type: 'corp', code: 'C0DE' }); R.devCookie = !!jars.A.dd_dev;
  R.same = await call('A', 'POST', '/api/login', { email: OW, password: PW });
  R.newDev = await call('B', 'POST', '/api/login', { email: OW, password: PW }, { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1' });
  R.newBand = await call('A', 'POST', '/api/login', { email: OW, password: PW }, { 'x-forwarded-for': '45.12.9.9', 'x-client-geo-country': 'nl' });
  R.again = await call('A', 'POST', '/api/login', { email: OW, password: PW }, { 'x-forwarded-for': '45.12.200.1', 'x-client-geo-country': 'NL' });
  jars.C = { dd_dev: 'not-a-valid-token' }; R.forged = await call('C', 'POST', '/api/login', { email: OW, password: PW });
  R.anonDev = await call('X', 'GET', '/api/me/devices'); R.devs = await call('A', 'GET', '/api/me/devices');
  await wait(400); R.ev = await evs(); R.mails = mails.slice(m0).filter(m => m.to === OW);
  /* SEC-0011 */
  const s = await call('A', 'POST', '/api/staff', { email: `sub${sfx}@d.kr`, role: 'sub' });
  await call('S', 'POST', '/api/login', { email: `sub${sfx}@d.kr`, password: s.j.password }); await call('S', 'POST', '/api/password', { current: s.j.password, next: 'Passw0rd-sub1' });
  R.subWrite = await call('S', 'POST', '/api/keys', { name: 'w', scope: 'write' }); R.subRead = await call('S', 'POST', '/api/keys', { name: 'r', scope: 'read' });
  R.ownWrite = await call('A', 'POST', '/api/keys', { name: 'w', scope: 'write' });
  R.subRevW = await call('S', 'POST', '/api/keys/revoke', { id: R.ownWrite.j.id }); R.subRevR = await call('S', 'POST', '/api/keys/revoke', { id: R.subRead.j.id }); R.ownRevW = await call('A', 'POST', '/api/keys/revoke', { id: R.ownWrite.j.id });
  R.subRev404 = await call('S', 'POST', '/api/keys/revoke', { id: 'k_000000000000' });
  return R;
}

(async () => {
  await new Promise(r => mock.listen(Number(process.env.MAIL_PORT), '127.0.0.1', r));
  const out = []; for (const [U, tag] of [[A, 'n'], [B, 'j']]) {
    const R = await run(U, tag); out.push(R); const T = tag === 'n' ? 'Node' : 'Java';
    ok(R.signup.st === 200 && R.devCookie, `${T} 가입 + 기기 표식`); ok(R.same.st === 200 && Object.keys(R.same.j).sort().join() === 'tenant,user', `${T} 로그인 응답 형태 그대로`);
    ok(R.ev.length === 3, `${T} 알림 3건(새 기기 · 대역+국가 · 위조 표식) — ${R.ev.length}`);
    ok(R.ev[0] && R.ev[0].why.join() === 'device' && R.ev[0].agent === 'Safari · iOS' && R.ev[0].band === '211.36.x.x' && R.ev[0].mailed === true, `${T} 1건째 ${JSON.stringify(R.ev[0])}`);
    ok(R.ev[1] && R.ev[1].why.join() === 'band,country' && R.ev[1].country === 'NL', `${T} 2건째 ${JSON.stringify(R.ev[1])}`);
    ok(R.mails.length === 3 && /새 환경 로그인 알림/.test(R.mails[0].subject) && !R.mails[0].text.includes('211.36.1.1') && /국가: NL/.test(R.mails[1].text), `${T} 메일 ${R.mails.length}`);
    ok(R.anonDev.st === 401 && R.devs.st === 200 && R.devs.j.rows.length === 3 && R.devs.j.rows.filter(x => x.current).length === 1, `${T} 기기 목록`);
    ok(Object.keys(R.devs.j.rows[0] || {}).sort().join() === 'agent,band,country,current,firstAt,lastAt', `${T} 기기 목록 키`);
    ok(R.subWrite.st === 403 && R.subWrite.err === 'role' && R.subRead.st === 200 && R.subRead.j.scope === 'read' && R.ownWrite.st === 200, `${T} SEC-0011 발급`);
    ok(R.subRevW.st === 403 && R.subRevR.st === 200 && R.ownRevW.st === 200 && R.subRev404.st === 404, `${T} SEC-0011 폐기 ${R.subRevW.st}/${R.subRevR.st}/${R.ownRevW.st}/${R.subRev404.st}`);
  }
  const [n, j] = out; for (const k of Object.keys(n)) if (n[k] && typeof n[k].st === 'number') ok(n[k].st === j[k].st && n[k].err === j[k].err, `대조 ${k}: Node ${n[k].st}/${n[k].err} · Java ${j[k].st}/${j[k].err}`);
  ok(JSON.stringify(n.ev.map(e => Object.keys(e))) === JSON.stringify(j.ev.map(e => Object.keys(e))), 'audit 키 순서 동일');
  ok(n.mails.length && j.mails.length && n.mails[0].text.replace(/^\S+/, '').replace(/시각: .*\n/, '') === j.mails[0].text.replace(/^\S+/, '').replace(/시각: .*\n/, '') && /시각: \d{4}-\d\d-\d\d \d\d:\d\d \(한국 시간\)/.test(n.mails[0].text + j.mails[0].text), '알림 메일 본문 동일(시각 제외)');
  console.log(`contract-devices: ${pass} 통과 · ${fail} 실패`); mock.close(); await pool.end(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
