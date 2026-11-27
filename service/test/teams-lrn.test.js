'use strict';
/* v49.1 L-noti-teams 학습자 Teams 알림(teams.md 1.7 · 2절 · 6절) — 시연 서버(MS_CLIENT_ID 없음, 외부 호출 없음).
   기관 켜기(유형 · 조직 연결 · 권한) → 학습자 본인 동의 → 발송 기록(시연) → 끄면 동의 기록 파기 · 기관 격리 · 시범 밖 차단.
   사용: DATABASE_URL=postgresql://didisam@127.0.0.1:<포트>/<db> MFA_OFF=1 node --test service/test/teams-lrn.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp } = require('../server/app');

test('학습자 Teams 알림 — 기관 켜기 · 본인 동의 · 시연 발송 · 파기 · 격리', { skip: !process.env.DATABASE_URL }, async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const base = { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', MFA_OFF: '1', PII_KEY: crypto.randomBytes(32).toString('hex'), NEW_DEVICE_MAIL: 'off', TEAMS_GAP_MS: '5' };
  const app = createApp({ pool, env: { ...base, TEAMS_PILOT: 'all' }, log: {} }); await new Promise(ok => app.listen(0, ok));
  const appOff = createApp({ pool, env: { ...base, TEAMS_PILOT: '' }, log: {} }); await new Promise(ok => appOff.listen(0, ok));
  t.after(() => { app.close(); appOff.close(); return pool.end(); });
  const U = `http://127.0.0.1:${app.address().port}`, UO = `http://127.0.0.1:${appOff.address().port}`;
  const jar = {}; const call = async (who, method, p, body, u = U) => { const r = await fetch(u + p, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.getSetCookie(); if (c.length) jar[who] = [...new Map([...(jar[who] || '').split('; ').filter(Boolean).map(x => x.split('=')), ...c.map(x => x.split(';')[0].split('='))].map(([k, ...v]) => [k, v.join('=')])).entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    const txt = await r.text(); let j = {}; try { j = JSON.parse(txt); } catch (e) { } return { status: r.status, j, txt }; };
  const sfx = Date.now().toString(36);
  const org = async (who, type) => (await call(who, 'POST', '/api/signup', { email: `tl${who}${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: who, type, code: 'C0DE' })).j.tenant;
  const doc = type => ({ org: { name: '대조', type }, lsite: { pub: { org: { name: '대조', type }, pages: [], classes: [] } }, codes: [{ sid: '20260001', dept: '수학', code: 'ABC234' }, { sid: '20260002', dept: '수학', code: 'BBC234' }], members: [{ id: 'm1', sid: '20260001', name: '20260001' }, { id: 'm2', sid: '20260002', name: '20260002' }], classes: [] });
  const A = await org('A', 'univ'), B = await org('B', 'univ'), C = await org('C', 'adult');
  for (const [w, T, ty] of [['A', A, 'univ'], ['B', B, 'univ'], ['C', C, 'adult']]) assert.equal((await call(w, 'PUT', '/api/state', { doc: doc(ty), rev: 0 })).status, 200);
  for (const [w, T, sid, code] of [['L1', A, '20260001', 'abc234'], ['L2', A, '20260002', 'bbc234'], ['LB', B, '20260001', 'abc234'], ['LC', C, '20260001', 'abc234']]) assert.equal((await call(w, 'POST', `/api/pub/${T.tid}/login`, { sid, code })).status, 200, w);

  await t.test('기관: 유형 · 조직 연결 · 입력 검사, 켜기 전 학습자는 사용 불가', async () => {
    assert.equal((await call('C', 'PUT', '/api/conn/teams/learner', { on: true })).j.error, 'teams_lrn_type', '학원 · 평생 유형 제외');
    assert.equal((await call('A', 'PUT', '/api/conn/teams/learner', { on: true })).j.error, 'teams_consent', '조직 연결(시연) 전');
    assert.equal((await call('A', 'PUT', '/api/conn/teams/learner', { on: 'yes' })).j.error, 'teams_input');
    assert.equal((await call('A', 'PUT', '/api/conn/teams/learner', { on: true, events: ['pay'] })).j.error, 'teams_bad_event');
    const g = await call('L1', 'GET', `/api/pub/${A.tid}/teams-noti`); assert.equal(g.status, 200); assert.equal(g.j.available, false); assert.equal(g.j.on, false);
    assert.equal((await call('L1', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: true, agree: true, agreeVer: 'teams-lrn-v1' })).j.error, 'teams_lrn_off');
    assert.equal((await call('X', 'GET', `/api/pub/${A.tid}/teams-noti`)).status, 401, '로그인 필요');
    assert.equal((await call('A', 'PUT', '/api/conn/teams/settings', { features: { learner: true } })).j.features.learner, false, 'settings로는 켜지지 않음(PUT /learner만)');
  });
  await t.test('기관 켜기 → 학습자 동의(필수) → 켜짐 · 기관 화면은 동의 수만', async () => {
    assert.equal((await call('A', 'PUT', '/api/conn/teams/demo', { on: true })).status, 200);
    const on = await call('A', 'PUT', '/api/conn/teams/learner', { on: true }); assert.equal(on.status, 200, on.txt); assert.deepEqual(on.j.learnerNoti, { typeOk: true, on: true, events: ['due', 'notice'], optIn: 0, agreeVer: 'teams-lrn-v1' });
    const g = await call('L1', 'GET', `/api/pub/${A.tid}/teams-noti`); assert.deepEqual(g.j, { available: true, on: false, events: [], orgEvents: ['due', 'notice'], mode: 'demo', linked: true, agreeVer: 'teams-lrn-v1', consentAt: '' });
    assert.equal((await call('L1', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: true })).j.error, 'teams_lrn_agree');
    assert.equal((await call('L1', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: true, agree: true, agreeVer: 'old' })).j.error, 'teams_lrn_agree');
    assert.equal((await call('L1', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: true, agree: true, agreeVer: 'teams-lrn-v1', events: [] })).j.error, 'teams_input');
    const p = await call('L1', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: true, agree: true, agreeVer: 'teams-lrn-v1', events: ['notice'] }); assert.equal(p.j.on, true); assert.deepEqual(p.j.events, ['notice']); assert.match(p.j.consentAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    const st = await call('A', 'GET', '/api/conn/teams'); assert.equal(st.j.learnerNoti.optIn, 1); assert.ok(!st.txt.includes('20260001'), '기관 화면에 학번 없음');
    const au = (await inTenant(pool, A.tid, c => c.query("select actor, action from audit_log where tenant_id = $1 and action like 'teams.lrn%'", [A.tid]))).rows; assert.ok(au.some(r => r.actor === 'sid:20260001' && r.action === 'teams.lrn.on'), '동의 감사 기록');
  });
  await t.test('발송(시연): 동의한 사람 · 구독한 종류만, 제목만 기록 · 다른 기관 격리', async () => {
    assert.equal((await call('L2', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: true, agree: true, agreeVer: 'teams-lrn-v1', events: ['due'] })).j.on, true);
    const n1 = await call('A', 'POST', '/api/conn/teams/notify', { event: 'notice', title: '휴강 안내', text: '연락처 010-1234-5678' }); assert.equal(n1.j.learners, 1);
    assert.equal((await call('A', 'POST', '/api/conn/teams/notify', { event: 'due', title: '과제 마감 D-1' })).j.learners, 1);
    assert.equal((await call('A', 'POST', '/api/conn/teams/notify', { event: 'report', title: '주간' })).j.learners, 0, '학습자 알림은 공지 · 마감만');
    const g = await call('A', 'GET', '/api/conn/teams'); const R = g.j.runs.filter(r => r.ch === '학습자 Teams 알림'); assert.equal(R.length, 2); assert.ok(R.every(r => r.demo && r.n === 1)); assert.ok(!g.txt.includes('010-1234'));
    assert.equal((await call('LB', 'GET', `/api/pub/${B.tid}/teams-noti`)).j.available, false, 'B 기관은 꺼짐');
    assert.equal((await call('L1', 'GET', `/api/pub/${B.tid}/teams-noti`)).status, 401, 'A 학습자 세션으로 B 조회 불가');
    assert.equal((await inTenant(pool, B.tid, c => c.query('select count(*)::int n from conn_teams_lrn'))).rows[0].n, 0, 'RLS: B 범위에서 A 동의 기록 안 보임');
    assert.equal((await call('LC', 'GET', `/api/pub/${C.tid}/teams-noti`)).j.available, false, '학원 유형');
  });
  await t.test('기관 알림 종류 줄이기 → 학습자 구독도 줄어듦 · 본인 끄기 · 기관 끄기 = 동의 기록 모두 파기', async () => {
    assert.deepEqual((await call('A', 'PUT', '/api/conn/teams/learner', { on: true, events: ['notice'] })).j.learnerNoti.events, ['notice']);
    assert.deepEqual((await call('L2', 'GET', `/api/pub/${A.tid}/teams-noti`)).j.events, [], 'L2의 due 구독은 빠짐');
    assert.equal((await call('L1', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: false })).j.on, false);
    assert.equal((await call('L1', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: true, agree: true, agreeVer: 'teams-lrn-v1' })).j.on, true);
    const off = await call('A', 'PUT', '/api/conn/teams/learner', { on: false }); assert.equal(off.j.learnerNoti.on, false); assert.equal(off.j.learnerNoti.optIn, 0);
    assert.equal((await inTenant(pool, A.tid, c => c.query('select count(*)::int n from conn_teams_lrn where tenant_id = $1', [A.tid]))).rows[0].n, 0, '기관 끄기 = 파기');
    assert.equal((await call('L1', 'GET', `/api/pub/${A.tid}/teams-noti`)).j.available, false);
  });
  await t.test('시범 밖(TEAMS_PILOT 비움): 기관 403 teams_off · 학습자 available false', async () => {
    jar.AO = jar.A; jar.L1O = jar.L1;
    assert.equal((await call('AO', 'PUT', '/api/conn/teams/learner', { on: true }, UO)).j.error, 'teams_off');
    assert.equal((await call('L1O', 'GET', `/api/pub/${A.tid}/teams-noti`, null, UO)).j.available, false);
  });
});
