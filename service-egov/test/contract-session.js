'use strict';
/* 가디언 4차 대조: 운영자 세션 정책(/api/session · /api/session/touch · /api/session/work · /api/me/sessions · /api/me/sessions/logout-others · /api/org/security)
   + 로그인 응답 others · 세션 쿠키 · 학습자 keep:false 세션 쿠키 · 학습자 이메일 로그인 DB 잠금 — Node와 Java에 같은 시나리오를 돌려 상태코드 · 오류 코드 · 응답 키를 비교한다.
   사용: DATABASE_URL=… node test/contract-session.js http://127.0.0.1:9821 http://127.0.0.1:9822   (두 서버: . test/env.sh + SIGNUP_CODE=C0DE) */
const crypto = require('node:crypto'); const { Pool } = require('pg');
const [A, B] = [process.argv[2], process.argv[3]]; const pool = new Pool({ connectionString: process.env.DATABASE_URL }); let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const keys = o => o && typeof o === 'object' ? Object.keys(o).sort().join() : String(o);

async function run(U, tag) {
  const jars = {}; const raw = {}; const call = async (who, method, path, body) => {
    const J = jars[who] || (jars[who] = {});
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (kv.slice(i + 1)) J[kv.slice(0, i)] = kv.slice(i + 1); raw[who + ':' + kv.slice(0, i)] = c; }
    const j = await r.json().catch(() => ({})); return { st: r.status, j, err: j.error || '' };
  };
  const sid = who => sha(jars[who].dd_sid);
  const sfx = tag + Date.now().toString(36); const OW = `cs${sfx}@d.kr`, PW = 'Passw0rd-ses'; const R = {};
  R.signup = await call('A', 'POST', '/api/signup', { email: OW, password: PW, orgName: 'S' + tag, type: 'univ', code: 'C0DE' }); const tid = R.signup.j.tenant.tid;
  R.cookieNoMax = !/Max-Age/i.test(raw['A:dd_sid']);
  R.info = await call('A', 'GET', '/api/session'); R.anon = await call('X', 'GET', '/api/session');
  R.relogin = await call('A', 'POST', '/api/login', { email: OW, password: PW });
  R.second = await call('B', 'POST', '/api/login', { email: OW, password: PW });
  R.list = await call('A', 'GET', '/api/me/sessions');
  await pool.query("update sessions set expires_at = now() + interval '10 minutes' where id = $1", [sid('A')]);
  await call('A', 'GET', '/api/session'); R.peekLeft = (await pool.query('select extract(epoch from expires_at - now())::int s from sessions where id = $1', [sid('A')])).rows[0].s;
  await call('A', 'GET', '/api/me'); R.slideLeft = (await pool.query('select extract(epoch from expires_at - now())::int s from sessions where id = $1', [sid('A')])).rows[0].s;
  await pool.query("update sessions set created_at = now() - interval '12 hours 1 minute' where id = $1", [sid('B')]); R.maxLife = await call('B', 'GET', '/api/me');
  R.workBad = await call('A', 'POST', '/api/session/work', { minutes: 300, reason: '성적 입력' }); R.workStr = await call('A', 'POST', '/api/session/work', { minutes: '60', reason: '성적 입력' });
  R.workNoReason = await call('A', 'POST', '/api/session/work', { minutes: 60 }); R.work = await call('A', 'POST', '/api/session/work', { minutes: 120, reason: '성적 일괄 입력' });
  R.workEnd = await call('A', 'POST', '/api/session/work', { minutes: 0 }); R.touch = await call('A', 'POST', '/api/session/touch');
  R.secFirst = await call('A', 'POST', '/api/org/security', { idleMin: 20 });
  R.put0 = await call('A', 'PUT', '/api/state', { doc: { org: { name: 'S', type: 'univ', room: { mode: 'saas' } }, codes: [{ sid: '20261234', dept: '컴공', code: 'ABC234' }] }, rev: 0 });
  R.secIdle = await call('A', 'POST', '/api/org/security', { idleMin: 5 }); R.secMax = await call('A', 'POST', '/api/org/security', { maxSessions: 11 }); R.secMfa = await call('A', 'POST', '/api/org/security', { mfa: 'sms' }); R.secStr = await call('A', 'POST', '/api/org/security', { idleMin: '20' });
  R.secOk = await call('A', 'POST', '/api/org/security', { idleMin: 20, mfa: 'totp' });
  const st = await call('A', 'GET', '/api/state'); const doc = st.j.doc; doc.org.sec = { idleMin: 60 }; R.putSec = await call('A', 'PUT', '/api/state', { doc, rev: st.j.rev });
  R.secGet = await call('A', 'GET', '/api/org/security'); R.info20 = await call('A', 'GET', '/api/session');
  R.audit = (await pool.query("select action from audit_log where actor = $1 and action like 'session.%' or (actor = $1 and action = 'org.sec') order by id", [OW])).rows.map(r => r.action);
  await call('B', 'POST', '/api/login', { email: OW, password: PW }); await call('A', 'POST', '/api/org/security', { maxSessions: 1 });
  R.third = await call('C', 'POST', '/api/login', { email: OW, password: PW }); R.evictedA = await call('A', 'GET', '/api/me'); R.evictedB = await call('B', 'GET', '/api/me');
  await call('C', 'POST', '/api/org/security', { maxSessions: 0 }); await call('A', 'POST', '/api/login', { email: OW, password: PW });
  R.logoutOthers = await call('C', 'POST', '/api/me/sessions/logout-others'); R.afterA = await call('A', 'GET', '/api/me'); R.afterC = await call('C', 'GET', '/api/me');
  R.lshort = await call('L1', 'POST', `/api/pub/${tid}/login`, { sid: '20261234', code: 'ABC234', keep: false }); R.lshortNoMax = !/Max-Age/i.test(raw['L1:dd_lsid'] || 'Max-Age');
  R.lshortRow = (await pool.query('select keep, extract(epoch from expires_at - now())::int s from learner_sessions where id = $1', [sha(jars.L1.dd_lsid || '')])).rows[0];
  R.lkeep = await call('L2', 'POST', `/api/pub/${tid}/login`, { sid: '20261234', code: 'ABC234' }); const id2 = sha(jars.L2.dd_lsid || '');
  await pool.query("update learner_sessions set last_at = now() - interval '2 minutes', expires_at = now() + interval '1 day' where id = $1", [id2]); await call('L2', 'GET', `/api/pub/${tid}/me`);
  R.lkeepLeft = (await pool.query('select keep, extract(epoch from expires_at - now())::int s from learner_sessions where id = $1', [id2])).rows[0];
  R.lfails = []; for (let i = 0; i < 6; i++) R.lfails.push(await call('E', 'POST', `/api/pub/${tid}/login`, { via: 'email', email: `nobody${sfx}@x.kr`, pw: 'Wrong-pass1' }));
  R.lockMsg = R.lfails[5].j.message;
  return R;
}

(async () => {
  const out = []; for (const [U, tag] of [[A, 'n'], [B, 'j']]) {
    const R = await run(U, tag); out.push(R); const T = tag === 'n' ? 'Node' : 'Java';
    ok(R.signup.st === 200 && R.cookieNoMax, `${T} 운영자 세션 쿠키(Max-Age 없음)`);
    ok(R.info.st === 200 && keys(R.info.j) === 'expiresAt,idleMin,maxAt,remain,work' && R.info.j.idleMin === 60 && R.info.j.remain > 3500 && R.info.j.work === null && R.anon.st === 401, `${T} GET /api/session ${JSON.stringify(R.info.j)}`);
    ok(keys(R.relogin.j) === 'tenant,user' && R.second.j.others === 1, `${T} others ${keys(R.relogin.j)} / ${R.second.j.others}`);
    ok(R.list.j.rows && R.list.j.rows.length === 2 && keys(R.list.j.rows[0]) === 'agent,band,createdAt,current,expiresAt,id,lastAt' && R.list.j.rows.filter(r => r.current).length === 1, `${T} 로그인 기기 목록`);
    ok(R.peekLeft <= 600 && R.slideLeft > 3500 && R.maxLife.st === 401, `${T} 조회 비연장 · 사용 연장 · 최대 수명 ${R.peekLeft}/${R.slideLeft}/${R.maxLife.st}`);
    ok(R.work.st === 200 && R.work.j.work && R.work.j.work.reason === '성적 일괄 입력' && R.work.j.remain > 7100 && R.workEnd.j.work === null && R.touch.j.remain > 3500, `${T} 작업 모드`);
    ok(R.secOk.st === 200 && keys(R.secOk.j) === 'idleDefault,idleMin,maxHours,maxSessions,mfa' && R.secOk.j.idleMin === 20 && R.secOk.j.mfa === 'totp' && R.secGet.j.idleMin === 20 && R.info20.j.idleMin === 20, `${T} 기관 보안 설정 ${JSON.stringify(R.secGet.j)}`);
    ok(R.audit.join() === 'session.work,session.work_end,org.sec', `${T} audit ${R.audit.join()}`);
    ok(R.third.st === 200 && R.third.j.others === undefined && R.evictedA.st === 401 && R.evictedB.st === 401, `${T} 동시 세션 제한`);
    ok(R.logoutOthers.j.n === 1 && R.afterA.st === 401 && R.afterC.st === 200, `${T} 다른 기기 모두 로그아웃 ${JSON.stringify(R.logoutOthers.j)}`);
    ok(R.lshort.st === 200 && R.lshortNoMax && R.lshortRow && R.lshortRow.keep === false && R.lshortRow.s <= 43200, `${T} 학습자 keep:false ${JSON.stringify(R.lshortRow)}`);
    ok(R.lkeep.st === 200 && R.lkeepLeft && R.lkeepLeft.keep === true && R.lkeepLeft.s > 29 * 86400, `${T} 학습자 유지 30일 연장 ${JSON.stringify(R.lkeepLeft)}`);
    ok(R.lfails.slice(0, 5).every(x => x.st === 401) && R.lfails[5].st === 429 && R.lfails[5].err === 'locked', `${T} 학습자 이메일 잠금 ${R.lfails.map(x => x.st).join()}`);
  }
  const [n, j] = out;
  for (const k of Object.keys(n)) if (n[k] && typeof n[k].st === 'number') ok(n[k].st === j[k].st && n[k].err === j[k].err, `대조 ${k}: Node ${n[k].st}/${n[k].err} · Java ${j[k].st}/${j[k].err}`);
  for (const k of ['workBad', 'workStr', 'workNoReason', 'secFirst', 'secIdle', 'secMax', 'secMfa', 'secStr']) ok(n[k].j.message === j[k].j.message, `문구 ${k}: ${n[k].j.message} · ${j[k].j.message}`);
  ok(n.lockMsg === j.lockMsg, `잠금 문구 ${n.lockMsg} · ${j.lockMsg}`);
  console.log(`contract-session: ${pass} 통과 · ${fail} 실패`); await pool.end(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
