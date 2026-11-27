'use strict';
/* 13차 MS Teams 연동(teams.md 6절 T1~T21 중 서버 범위) — Graph · 토큰 끝점 · 워크플로 웹훅은 이 시험 안의 가짜 서버로 가로챈다(실제 키 금지).
   사용: DATABASE_URL=postgresql://didisam@127.0.0.1:<포트>/didisam node --test service/test/teams.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http'); const crypto = require('node:crypto');
const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp, hashPw } = require('../server/app');
const { checkHook, teamsConfig } = require('../server/teams');

const MS_ID = 'ms-app-test';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = c => `${b64({ alg: 'none' })}.${b64(c)}.sig`;

test('MS Teams 연동 — 시연 · 웹훅 · 조직 연결 · 회의 · 출석 · SSO', { skip: !process.env.DATABASE_URL }, async t => {
  /* 가짜 Microsoft: 인가 코드 = base64url JSON { tid, oid, upn, nonce, aud? } */
  const M = { hits: [], reports: [], records: [], meetings: 0, hook429: 1 };
  const mock = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    const u = new URL(q.url, 'http://x'); M.hits.push(`${q.method} ${u.pathname}`);
    const out = (s, j, h = {}) => { r.writeHead(s, { 'content-type': 'application/json', ...h }); r.end(j === undefined ? '' : JSON.stringify(j)); };
    let m = u.pathname.match(/^\/microsoft\/([^/]+)\/token$/);
    if (m) { const f = new URLSearchParams(b); if (f.get('client_id') !== MS_ID || f.get('client_secret') !== 'ms-sec') return out(401, { error: 'invalid_client' });
      if (f.get('grant_type') === 'refresh_token') { const rt = f.get('refresh_token'); return out(200, { access_token: 'at2.' + rt, refresh_token: rt + '.n', expires_in: 3600, token_type: 'Bearer' }); }
      if (!f.get('code_verifier')) return out(400, { error: 'invalid_request' });
      let c; try { c = JSON.parse(Buffer.from(f.get('code'), 'base64url').toString()); } catch (e) { return out(400, { error: 'invalid_grant' }); }
      const idt = jwt({ aud: c.aud || MS_ID, iss: `https://login.microsoftonline.com/${c.tid}/v2.0`, tid: c.tid, oid: c.oid, preferred_username: c.upn, nonce: c.nonce, exp: Math.floor(Date.now() / 1000) + 600 });
      return out(200, { access_token: 'at.' + c.oid, id_token: idt, refresh_token: 'rt.' + c.oid, scope: 'openid OnlineMeetings.ReadWrite OnlineMeetingArtifact.Read.All', expires_in: 3600 }); }
    if (/^\/graph\/v1\.0\/me\/onlineMeetings$/.test(u.pathname) && q.method === 'POST') { const j = JSON.parse(b); if (!j.subject || !j.startDateTime) return out(400, {}); M.meetings++; return out(201, { id: 'MSMT' + M.meetings, joinWebUrl: `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${M.meetings}` }); }
    m = u.pathname.match(/^\/graph\/v1\.0\/me\/onlineMeetings\/([^/]+)(\/attendanceReports(?:\/([^/]+))?)?$/);
    if (m && !m[2]) return out(204);
    if (m && m[2] && !m[3]) return out(200, { value: M.reports });
    if (m && m[3]) return out(200, { id: m[3], meetingStartDateTime: '2026-12-02T10:00:00Z', meetingEndDateTime: '2026-12-02T11:30:00Z', attendanceRecords: M.records });
    if (/\/workflows\/ok/.test(u.pathname)) { M.lastHook = JSON.parse(b); return out(202, {}); }
    if (/\/workflows\/gone/.test(u.pathname)) return out(404, {});
    if (/\/workflows\/busy/.test(u.pathname)) { if (M.hook429-- > 0) return out(429, {}, { 'retry-after': '0' }); return out(200, {}); }
    out(404, {}); }); }).listen(0, '127.0.0.1');
  await new Promise(ok => mock.once('listening', ok)); const MU = `http://127.0.0.1:${mock.address().port}`;
  const pool = poolFrom(process.env); await migrate(pool);
  const base = { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', MFA_OFF: '1', PII_KEY: crypto.randomBytes(32).toString('hex'), OAUTH_MOCK_URL: MU, TEAMS_WEBHOOK_TEST: '1', TEAMS_GAP_MS: '20', NEW_DEVICE_MAIL: 'off', TEAMS_PILOT: 'all' };
  const appL = createApp({ pool, env: { ...base, MS_CLIENT_ID: MS_ID, MS_CLIENT_SECRET: 'ms-sec' }, log: {} });
  const appD = createApp({ pool, env: base, log: {} });
  await new Promise(ok => appL.listen(0, ok)); await new Promise(ok => appD.listen(0, ok));
  const UL = `http://127.0.0.1:${appL.address().port}`, UD = `http://127.0.0.1:${appD.address().port}`;
  t.after(() => { appL.close(); appD.close(); mock.close(); return pool.end(); });
  const jar = {}; const keep = (who, r) => { const J = jar[who] = jar[who] || {}; for (const c of r.headers.getSetCookie()) { const [kv, ...a] = c.split(';'); const [k, ...v] = kv.split('='); if (/max-age=0/i.test(a.join(';'))) delete J[k.trim()]; else J[k.trim()] = v.join('='); } };
  const ck = who => Object.entries(jar[who] || {}).map(([k, v]) => `${k}=${v}`).join('; ');
  const call = async (U, who, method, p, body) => { const r = await fetch(U + p, { method, redirect: 'manual', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), cookie: ck(who) }, body: body ? JSON.stringify(body) : undefined }); keep(who, r); const txt = await r.text(); let j = {}; try { j = JSON.parse(txt); } catch (e) { /* 빈 응답 */ } return { status: r.status, loc: r.headers.get('location') || '', j, txt }; };
  const sfx = Date.now().toString(36);
  const q = (tid, sql, p) => inTenant(pool, tid, c => c.query(sql, p)); /* 새 표는 RLS FORCE — 기관 범위로만 읽는다 */
  const org = async (U, who, type) => { const T = (await call(U, who, 'POST', '/api/signup', { email: `tm${who}${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: who, type, code: 'C0DE' })).j.tenant; assert.ok(T, who); return T; };
  const putDoc = async (U, who, doc) => { const g = await call(U, who, 'GET', '/api/state'); return call(U, who, 'PUT', '/api/state', { doc, rev: g.j.rev || 0 }); };
  const getDoc = async (U, who) => (await call(U, who, 'GET', '/api/state')).j.doc;
  const MST = crypto.randomUUID(), OTHER = crypto.randomUUID();
  const code = o => Buffer.from(JSON.stringify(o)).toString('base64url');

  /* 시연 서버(키 없음) */
  const D = await org(UD, 'D', 'univ');
  await t.test('T1 키 없음: 미연결 · mode demo · 조직 연결/SSO는 시연 안내', async () => {
    const g = await call(UD, 'D', 'GET', '/api/conn/teams'); assert.equal(g.status, 200); assert.equal(g.j.mode, 'demo'); assert.equal(g.j.st, '미연결'); assert.deepEqual(g.j.scopesAvail, ['notify']);
    assert.match((await call(UD, 'D', 'GET', '/api/conn/teams/consent/start')).loc, /#conn=teams:err-unset$/);
    assert.equal((await call(UD, 'D', 'PUT', '/api/conn/teams/sso', { operator: true })).j.error, 'teams_unset');
    assert.match((await call(UD, 'X', 'GET', '/api/oauth/microsoft/start')).loc, /#oauth=err:unset$/);
    assert.ok(!(await call(UD, 'X', 'GET', '/api/config')).j.oauth.includes('microsoft'), '키 없으면 로그인 버튼 없음');
    assert.ok(!(await call(UD, 'X', 'GET', `/api/pub/${D.tid}/loauth`)).j.ready.includes('microsoft'));
    const d = await call(UD, 'D', 'PUT', '/api/conn/teams/demo', { on: true }); assert.equal(d.j.st, '연결됨'); assert.equal(d.j.org.domain, 'demo.onmicrosoft.com');
  });
  await t.test('시연: 채널 이름만 등록 → 최근 실행 기록 · 회의 시연 링크 · 출석 제안 → 반영', async () => {
    const c = await call(UD, 'D', 'POST', '/api/conn/teams/channels', { name: '교육운영', events: ['notice'] }); assert.equal(c.status, 201, c.txt); assert.equal(c.j.kind, 'demo');
    const s = await call(UD, 'D', 'POST', '/api/conn/teams/test', { channelId: c.j.id }); assert.equal(s.j.demo, true);
    assert.equal((await call(UD, 'D', 'POST', '/api/conn/teams/notify', { event: 'notice', title: '휴강 안내', text: '연락처 010-1234-5678' })).j.queued, 1); await appD.teams.flush();
    const g = await call(UD, 'D', 'GET', '/api/conn/teams'); assert.ok(g.j.runs.some(x => x.title === '휴강 안내' && x.demo)); assert.ok(!JSON.stringify(g.j).includes('010-1234'), '본문 개인정보 가림');
    await putDoc(UD, 'D', { org: { name: 'D', type: 'univ' }, members: [{ id: 'm1', name: '가' }, { id: 'm2', name: '나' }, { id: 'm3', name: '다' }], classes: [{ id: 'c1', name: '반', learners: ['m1', 'm2', 'm3'], curriculum: [{ id: 'it1', type: 'live', title: '라이브', url: '' }], att: {} }] });
    const m = await call(UD, 'D', 'POST', '/api/conn/teams/meetings', { classId: 'c1', itemId: 'it1', subject: 'AI 기초 실시간', start: '2026-12-02T19:00:00+09:00', end: '2026-12-02T20:30:00+09:00' });
    assert.equal(m.status, 201, m.txt); assert.equal(m.j.mode, 'demo'); assert.equal(m.j.joinUrl, '/learner.html#live-demo'); assert.equal(m.j.linked, true);
    const it = (await getDoc(UD, 'D')).classes[0].curriculum[0]; assert.equal(it.url, '/learner.html#live-demo'); assert.equal(it.teams.mid, m.j.id);
    const sy = await call(UD, 'D', 'POST', `/api/conn/teams/meetings/${m.j.id}/attendance/sync`); assert.equal(sy.j.mode, 'demo'); assert.equal(sy.j.matched.length, 3); assert.ok(sy.j.matched.every(x => /^L-[0-9a-f]{4}$/.test(x.label) && ['출석', '지각', '결석'].includes(x.suggest)));
    assert.deepEqual((await getDoc(UD, 'D')).classes[0].att, {}, '반영 전 출석부 변경 없음');
    const ap = await call(UD, 'D', 'POST', `/api/conn/teams/meetings/${m.j.id}/attendance/apply`, { rows: sy.j.matched.map(x => ({ lid: x.lid, value: x.suggest })).concat([{ lid: 'zz', value: '출석' }]) }); assert.equal(ap.j.applied, 3);
    assert.equal(Object.keys((await getDoc(UD, 'D')).classes[0].att.it1).length, 3);
    assert.equal((await call(UD, 'D', 'POST', `/api/conn/teams/meetings/${m.j.id}/attendance/apply`, { rows: [{ lid: 'm1', value: '조퇴' }] })).j.error, 'teams_input');
    assert.equal((await call(UD, 'D', 'DELETE', `/api/conn/teams/meetings/${m.j.id}`)).j.ok, true); assert.equal((await getDoc(UD, 'D')).classes[0].curriculum[0].url, '');
  });
  await t.test('T9 수업 시간 검사', async () => {
    const k = await call(UD, 'D', 'POST', '/api/conn/teams/meetings', { classId: 'c1', itemId: 'it1', subject: '스튜디오 편집 중', start: '2026-12-09T19:00:00+09:00', end: '2026-12-09T20:00:00+09:00', docLink: false });
    assert.equal(k.j.linked, false); assert.equal((await getDoc(UD, 'D')).classes[0].curriculum[0].url, '', 'docLink:false → 기관 문서 그대로(스튜디오가 저장)');
    assert.equal((await call(UD, 'D', 'DELETE', `/api/conn/teams/meetings/${k.j.id}?doc=0`)).j.ok, true);
    for (const [s, e] of [['2026-12-02T20:00:00+09:00', '2026-12-02T19:00:00+09:00'], ['2026-12-02T10:00:00+09:00', '2026-12-03T11:00:00+09:00'], ['내일', '모레']]) assert.equal((await call(UD, 'D', 'POST', '/api/conn/teams/meetings', { subject: 'x', start: s, end: e })).j.error, 'teams_time');
  });

  /* 키 있는 서버 */
  const A = await org(UL, 'A', 'univ'); const B = await org(UL, 'B', 'corp'); const K = await org(UL, 'K', 'adult');
  await t.test('T2 · T3 웹훅 등록: 정상 주소 → 시험 카드 · 원문 비노출 / 잘못된 주소 → 외부 요청 0건', async () => {
    const before = M.hits.length;
    for (const bad of ['https://contoso.webhook.office.com/webhookb2/x/workflows/y', 'https://outlook.office.com/webhook/workflows/x', 'http://prod-1.westus.logic.azure.com/workflows/x', 'https://u:p@prod-1.westus.logic.azure.com/workflows/x', 'https://10.0.0.1/workflows/x', 'https://prod-1.westus.logic.azure.com:8443/workflows/x', 'https://evil.example.com/workflows/x', 'https://prod-1.westus.logic.azure.com/api/x'])
      assert.equal((await call(UL, 'A', 'POST', '/api/conn/teams/channels', { name: 'x', url: bad })).j.error, 'teams_webhook_url', bad);
    assert.equal(M.hits.length, before, '잘못된 주소는 보내지 않음');
    assert.equal((await call(UL, 'A', 'POST', '/api/conn/teams/channels', { name: '데모' })).j.error, 'teams_webhook_url', '키 있는 서버는 주소 필수');
    const url = `${MU}/hook/workflows/ok/triggers/manual/paths/invoke?sig=SECRETSIG123`;
    const c = await call(UL, 'A', 'POST', '/api/conn/teams/channels', { name: '교육운영', url, events: ['notice', 'approval'] }); assert.equal(c.status, 201, c.txt);
    assert.equal(M.lastHook.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive'); assert.equal(M.lastHook.attachments[0].content.version, '1.4');
    const g = await call(UL, 'A', 'GET', '/api/conn/teams'); assert.equal(g.j.st, '연결됨'); assert.ok(!g.txt.includes('SECRETSIG'), '응답에 원문 없음');
    const row = (await q(A.tid, 'select enc, mask from conn_secret where id = $1', [c.j.id])).rows[0]; assert.match(row.enc, /^enc1:v1\./); assert.ok(!row.enc.includes('SECRETSIG') && !row.mask.includes('SECRETSIG'));
    assert.ok(!JSON.stringify(await getDoc(UL, 'A') || {}).includes('SECRETSIG'), '기관 문서에도 없음');
    assert.equal((await call(UL, 'A', 'POST', '/api/conn/teams/channels', { name: '꺼짐', url: `${MU}/hook/workflows/gone` })).j.error, 'teams_webhook_fail');
    assert.equal((await call(UL, 'A', 'PUT', '/api/conn/teams/settings', { events: { [c.j.id]: ['notice', 'hack'] } })).j.error, 'teams_bad_event');
  });
  await t.test('T4 · T5 알림: 이벤트 구독 채널만 · 429 재시도 후 성공 · 3회 연속 실패 → 점검 필요', async () => {
    const busy = await call(UL, 'A', 'POST', '/api/conn/teams/channels', { name: '바쁜 채널', url: `${MU}/hook/workflows/busy`, events: ['due'] }); assert.equal(busy.status, 201, busy.txt);
    assert.equal((await call(UL, 'A', 'POST', '/api/conn/teams/notify', { event: 'approval', title: '승인 요청 3건' })).j.queued, 1);
    for (let i = 0; i < 5; i++) await call(UL, 'A', 'POST', '/api/conn/teams/notify', { event: 'due', title: '마감 ' + i });
    M.hook429 = 2; await appL.teams.flush();
    const g = await call(UL, 'A', 'GET', '/api/conn/teams'); const ch = g.j.channels.find(x => x.id === busy.j.id); assert.equal(ch.err, ''); assert.equal(g.j.runs.filter(x => x.ch === '바쁜 채널' && x.ok).length, 5, '유실 0');
    const c3 = await call(UL, 'A', 'POST', '/api/conn/teams/channels', { name: '곧 꺼짐', url: `${MU}/hook/workflows/ok/x`, events: ['report'] }); assert.equal(c3.status, 201);
    await q(A.tid, "update conn_secret set meta = jsonb_set(meta, '{fails}', '2') where id = $1", [c3.j.id]);
    const r = await call(UL, 'A', 'POST', '/api/conn/teams/test', { channelId: c3.j.id }); assert.equal(r.j.ok, true, '성공하면 실패 횟수 초기화');
    assert.equal((await q(A.tid, 'select meta from conn_secret where id = $1', [c3.j.id])).rows[0].meta.fails, 0);
  });
  await t.test('T4 연속 실패 3회 → 채널 err · 점검 필요 · 감사', async () => {
    /* 성공 응답 후 워크플로를 끈 상황: 모의 서버가 ok 경로를 404로 돌려주게 바꾼다 */
    const c = await call(UL, 'B', 'POST', '/api/conn/teams/channels', { name: 'B채널', url: `${MU}/hook/workflows/ok/b`, events: ['notice'] }); assert.equal(c.status, 201);
    const orig = mock.listeners('request')[0]; mock.removeAllListeners('request');
    mock.on('request', (q, r) => { if (q.url.includes('/workflows/ok/b')) { q.resume(); r.writeHead(404); return r.end(); } orig(q, r); });
    for (let i = 0; i < 3; i++) await call(UL, 'B', 'POST', '/api/conn/teams/notify', { event: 'notice', title: '공지' + i });
    await appL.teams.flush(); mock.removeAllListeners('request'); mock.on('request', orig);
    const g = await call(UL, 'B', 'GET', '/api/conn/teams'); assert.equal(g.j.st, '점검 필요'); assert.match(g.j.channels[0].err, /404/);
    assert.equal((await q(B.tid, "select count(*)::int n from audit_log where tenant_id = $1 and action = 'teams.channel.err'", [B.tid])).rows[0].n, 1);
  });

  /* 조직 연결 */
  const consent = async (who, tid, opt = {}) => {
    const s = await call(UL, who, 'GET', '/api/conn/teams/consent/start'); assert.equal(s.status, 302); const au = new URL(s.loc);
    assert.equal(au.origin + au.pathname, `${MU}/microsoft/organizations/auth`); assert.equal(au.searchParams.get('scope'), 'openid profile'); assert.equal(au.searchParams.get('code_challenge_method'), 'S256');
    const w = await call(UL, who, 'GET', `/api/conn/teams/consent/whoami?code=${code({ tid, oid: crypto.randomUUID(), upn: 'admin@contoso.ac.kr', nonce: au.searchParams.get('nonce') })}&state=${encodeURIComponent(au.searchParams.get('state'))}`);
    const cu = new URL(w.loc); assert.equal(cu.origin + cu.pathname, `${MU}/microsoft/${tid}/adminconsent`, w.loc); assert.equal(cu.searchParams.get('scope'), 'https://graph.microsoft.com/.default');
    const cb = await call(UL, who, 'GET', `/api/conn/teams/consent/callback?tenant=${opt.forge || tid}&admin_consent=True&state=${encodeURIComponent(cu.searchParams.get('state'))}`);
    return (cb.loc.match(/#conn=teams:(.+)$/) || [])[1];
  };
  await t.test('T6 · T7 조직 연결: 콜백 tenant 위조 → mismatch · 정상 → ok · 다른 기관 같은 조직 → taken', async () => {
    assert.equal(await consent('A', MST, { forge: OTHER }), 'err-tenant_mismatch'); assert.equal((await q(A.tid, 'select count(*)::int n from conn_ms_org where tenant_id = $1', [A.tid])).rows[0].n, 0);
    assert.equal(await consent('A', MST), 'ok');
    const g = await call(UL, 'A', 'GET', '/api/conn/teams'); assert.equal(g.j.org.domain, 'contoso.ac.kr'); assert.ok(!g.txt.includes(MST), 'tid 가림'); assert.equal(g.j.org.consentBy, 'adm••••@contoso.ac.kr');
    assert.equal(await consent('B', MST), 'err-tenant_taken');
    /* state 재사용 · 다른 브라우저 */
    const s = await call(UL, 'A', 'GET', '/api/conn/teams/consent/start'); const st = new URL(s.loc).searchParams.get('state');
    assert.match((await call(UL, 'Z', 'GET', `/api/conn/teams/consent/whoami?code=x&state=${encodeURIComponent(st)}`)).loc, /err-state$/);
    /* aud가 다른 id_token */
    const s2 = await call(UL, 'A', 'GET', '/api/conn/teams/consent/start'); const a2 = new URL(s2.loc);
    assert.match((await call(UL, 'A', 'GET', `/api/conn/teams/consent/whoami?code=${code({ tid: MST, oid: crypto.randomUUID(), upn: 'a@b.c', nonce: a2.searchParams.get('nonce'), aud: 'other' })}&state=${encodeURIComponent(a2.searchParams.get('state'))}`)).loc, /err-provider$/);
  });
  const hashOf = async (who, U = UL) => (await call(U, who, 'GET', '/api/conn/teams')).j;
  let acct;
  await t.test('T8 회의 계정 연결 → 회의 생성 → 반 항목 url · 학습자 라이브 입장 주소 동일', async () => {
    const s = await call(UL, 'A', 'GET', '/api/conn/teams/account/start'); const au = new URL(s.loc); assert.equal(au.pathname, `/microsoft/${MST}/auth`); assert.match(au.searchParams.get('scope'), /offline_access OnlineMeetings\.ReadWrite OnlineMeetingArtifact\.Read\.All/);
    const oid = crypto.randomUUID();
    assert.match((await call(UL, 'A', 'GET', `/api/conn/teams/account/callback?code=${code({ tid: OTHER, oid, upn: 'kim@other.kr', nonce: au.searchParams.get('nonce') })}&state=${encodeURIComponent(au.searchParams.get('state'))}`)).loc, /err-tenant_mismatch$/, '다른 조직 계정 거부');
    const s2 = await call(UL, 'A', 'GET', '/api/conn/teams/account/start'); const a2 = new URL(s2.loc);
    assert.match((await call(UL, 'A', 'GET', `/api/conn/teams/account/callback?code=${code({ tid: MST, oid, upn: 'kimprof@contoso.ac.kr', nonce: a2.searchParams.get('nonce') })}&state=${encodeURIComponent(a2.searchParams.get('state'))}`)).loc, /#conn=teams:acct-ok$/);
    const g = await hashOf('A'); acct = g.accounts[0]; assert.equal(acct.upn, 'kim••••@contoso.ac.kr'); assert.equal(acct.mine, true);
    assert.ok(!(await q(A.tid, 'select enc from conn_secret where id = $1', [acct.id])).rows[0].enc.includes('rt.'), '갱신 토큰 암호화');
    await putDoc(UL, 'A', { org: { name: 'A', type: 'univ' }, members: [], classes: [{ id: 'c1', name: '반', learners: [], curriculum: [{ id: 'it1', type: 'live', title: '라이브', url: '', attMin: 10 }], att: {} }] });
    const m = await call(UL, 'A', 'POST', '/api/conn/teams/meetings', { classId: 'c1', itemId: 'it1', subject: 'AI 기초 3주차', start: '2026-12-02T19:00:00+09:00', end: '2026-12-02T20:30:00+09:00', accountId: acct.id });
    assert.equal(m.status, 201, m.txt); assert.equal(m.j.mode, 'live'); assert.match(m.j.joinUrl, /^https:\/\/teams\.microsoft\.com\/l\/meetup-join\//);
    assert.equal((await getDoc(UL, 'A')).classes[0].curriculum[0].url, m.j.joinUrl);
    assert.equal((await q(A.tid, "select count(*)::int n from audit_log where tenant_id = $1 and action = 'teams.meeting.create'", [A.tid])).rows[0].n, 1);
    assert.equal((await call(UL, 'A', 'PATCH', `/api/conn/teams/meetings/${m.j.id}`, { subject: '바뀐 제목' })).j.ok, true);
    acct.meeting = m.j.id;
  });
  await t.test('T17 · T18 권한 · 기관 격리', async () => {
    const em = `tmteach${sfx}@a.kr`; await pool.query('insert into users (tenant_id, email, pw, role) values ($1, $2, $3, $4)', [A.tid, em, await hashPw('Passw0rd-aaa'), 'teacher']);
    assert.equal((await call(UL, 'T', 'POST', '/api/login', { email: em, password: 'Passw0rd-aaa' })).status, 200);
    assert.equal((await call(UL, 'T', 'POST', '/api/conn/teams/channels', { name: 'x', url: 'https://x' })).j.error, 'teams_role');
    assert.equal((await call(UL, 'T', 'PUT', '/api/conn/teams/sso', { operator: true })).j.error, 'teams_role');
    const mt = (o = {}) => call(UL, 'T', 'POST', '/api/conn/teams/meetings', { subject: 'x', start: '2026-12-02T19:00:00+09:00', end: '2026-12-02T20:00:00+09:00', ...o });
    assert.equal((await mt({ accountId: acct.id })).j.error, 'teams_class', 'QA4 #1 반 없는 회의는 운영자만');
    assert.equal((await mt({ classId: 'c1', itemId: 'it1', accountId: acct.id })).j.error, 'teams_class', 'QA4 #1 담당 아닌 반');
    assert.equal((await call(UL, 'T', 'PATCH', `/api/conn/teams/meetings/${acct.meeting}`, { subject: '교수자 수정' })).j.error, 'teams_class');
    assert.equal((await call(UL, 'T', 'POST', `/api/conn/teams/meetings/${acct.meeting}/attendance/apply`, { rows: [] })).j.error, 'teams_class');
    assert.equal((await call(UL, 'T', 'GET', '/api/conn/teams/meetings')).j.meetings.length, 0, '담당 반 회의만 목록');
    assert.equal((await call(UL, 'T', 'POST', '/api/conn/teams/notify', { event: 'report', title: 'x' })).j.error, 'teams_role', 'QA4 #2 교수자는 공지 · 마감만');
    const d0 = await getDoc(UL, 'A'); await putDoc(UL, 'A', { ...d0, admins: [{ email: em, role: 'teacher', classes: ['c1'] }] });
    assert.equal((await mt({ classId: 'c1', itemId: 'it1', accountId: acct.id })).j.error, 'teams_role', '교수자는 남의 계정 불가');
    assert.equal((await mt({ classId: 'c1', itemId: 'it1' })).j.error, 'teams_account', '본인 계정 없음');
    assert.equal((await call(UL, 'T', 'GET', '/api/conn/teams/meetings')).j.meetings.length, 1, '담당 반 회의는 보임');
    assert.equal((await call(UL, 'T', 'POST', '/api/conn/teams/notify', { event: 'notice', title: 'x' })).status, 200);
    assert.equal((await call(UL, 'B', 'DELETE', `/api/conn/teams/meetings/${acct.meeting}`)).status, 404, '다른 기관 회의');
    assert.equal((await call(UL, 'B', 'POST', `/api/conn/teams/meetings/${acct.meeting}/attendance/sync`)).status, 404);
    assert.equal((await call(UL, 'B', 'GET', '/api/conn/teams')).j.accounts.length, 0);
    assert.equal((await call(UL, 'A', 'PUT', '/api/conn/teams/learner', { on: true })).j.error, 'teams_lrn_sso', 'v49.1: 2차 학습자 알림 구현 — 운영은 학습자 SSO를 먼저 켜야 함(이전 기대값 teams_phase2는 1차 예약 시점)');
  });

  /* SSO */
  await t.test('T13 · T14 운영자 SSO: 자동 연결 없음 · 직접 연결 후 로그인 · 다른 조직 · 개인 MSA', async () => {
    assert.ok((await call(UL, 'X', 'GET', '/api/config')).j.oauth.includes('microsoft'));
    const oid = crypto.randomUUID();
    const login = async (who, tid, upn, o = oid) => { const s = await call(UL, who, 'GET', '/api/oauth/microsoft/start'); const au = new URL(s.loc); assert.equal(au.searchParams.get('scope'), 'openid profile email');
      return (await call(UL, who, 'GET', `/api/oauth/microsoft/callback?code=${code({ tid, oid: o, upn, nonce: au.searchParams.get('nonce') })}&state=${encodeURIComponent(au.searchParams.get('state'))}`)).loc; };
    assert.match(await login('P1', MST, `tmA${sfx}@a.kr`), /#oauth=err:ms_unlinked$/, '같은 이메일이어도 자동 연결 안 함');
    const ls = await call(UL, 'A', 'POST', '/api/oauth/microsoft/link-start'); const lu = new URL(ls.j.url);
    assert.match((await call(UL, 'A', 'GET', `/api/oauth/microsoft/callback?code=${code({ tid: MST, oid, upn: 'x@contoso.ac.kr', nonce: lu.searchParams.get('nonce') })}&state=${encodeURIComponent(lu.searchParams.get('state'))}`)).loc, /#oauth=linked$/);
    assert.match(await login('P2', MST, 'x@contoso.ac.kr'), /#oauth=err:tenant$/, 'SSO 꺼짐');
    assert.equal((await call(UL, 'A', 'PUT', '/api/conn/teams/sso', { operator: true, learner: true })).j.sso.operator, true);
    assert.match(await login('P3', MST, 'x@contoso.ac.kr'), /#oauth=ok$/); assert.equal((await call(UL, 'P3', 'GET', '/api/me')).j.tenant.tid, A.tid);
    assert.match(await login('P4', OTHER, 'x@other.kr'), /#oauth=err:ms_unlinked$/, '다른 조직(같은 oid라도 tid:oid 키가 다름)');
    assert.match(await login('P5', '9188040d-6c67-4c5b-b112-36a304b66dad', 'me@outlook.com'), /#oauth=err:msa$/, '개인 계정 거부');
    assert.equal((await pool.query("select sub from user_oauth where provider = 'microsoft' and sub like $1", [MST + ':%'])).rowCount, 1);
    /* QA4 #3: 관리자 모듈(MODULE=admin)에서는 교수자의 Microsoft 로그인도 err:module(Google · 카카오와 같음) */
    const toid = crypto.randomUUID(); const tu = (await pool.query('select id from users where tenant_id = $1 and role = $2 limit 1', [A.tid, 'teacher'])).rows[0];
    await pool.query('insert into user_oauth (provider, sub, user_id) values ($1, $2, $3)', ['microsoft', `${MST}:${toid}`, tu.id]);
    const appT = createApp({ pool, env: { ...base, MS_CLIENT_ID: MS_ID, MS_CLIENT_SECRET: 'ms-sec', MODULE: 'admin' }, log: {} }); await new Promise(ok => appT.listen(0, ok));
    try { const UT = `http://127.0.0.1:${appT.address().port}`; const s = await call(UT, 'P6', 'GET', '/api/oauth/microsoft/start'); const au = new URL(s.loc);
      const r = await call(UT, 'P6', 'GET', `/api/oauth/microsoft/callback?code=${code({ tid: MST, oid: toid, upn: 't@contoso.ac.kr', nonce: au.searchParams.get('nonce') })}&state=${encodeURIComponent(au.searchParams.get('state'))}`);
      assert.match(r.loc, /#oauth=err:module$/); assert.equal((await call(UT, 'P6', 'GET', '/api/me')).status, 401); } finally { appT.close(); }
    /* QA4 #4: 학습자 모듈(MODULE=learner)에서도 학습자 Microsoft 콜백 경로가 열려 있어야 한다 */
    const appLr = createApp({ pool, env: { ...base, MS_CLIENT_ID: MS_ID, MS_CLIENT_SECRET: 'ms-sec', MODULE: 'learner' }, log: {} }); await new Promise(ok => appLr.listen(0, ok));
    try { const r = await call(`http://127.0.0.1:${appLr.address().port}`, 'P7', 'GET', '/api/pub/loauth/microsoft/callback?state=x&code=y'); assert.equal(r.status, 302); assert.match(r.loc, /oa=err-state/); } finally { appLr.close(); }
  });
  let lsid; const loid = crypto.randomUUID();
  await t.test('T15 · T16 학습자 SSO(대학): HMAC만 · 학번 · 학과 입력 · 학원은 미표시', async () => {
    assert.ok((await call(UL, 'X', 'GET', `/api/pub/${A.tid}/loauth`)).j.ready.includes('microsoft'));
    assert.ok(!(await call(UL, 'X', 'GET', `/api/pub/${K.tid}/loauth`)).j.ready.includes('microsoft'), '학원');
    assert.match((await call(UL, 'X', 'GET', `/api/pub/${K.tid}/loauth/microsoft/start`)).loc, /oa=err-provider_off/);
    const go = async (who, tid0, o, m = 'join') => { const s = await call(UL, who, 'GET', `/api/pub/${A.tid}/loauth/microsoft/start?m=${m}`); const au = new URL(s.loc); assert.equal(au.searchParams.get('scope'), 'openid', '이메일 · 프로필 요청 금지');
      return decodeURIComponent((/[?&]oa=([\w-]+)/.exec((await call(UL, who, 'GET', `/api/pub/loauth/microsoft/callback?code=${code({ tid: tid0, oid: o, upn: 'stu@contoso.ac.kr', nonce: au.searchParams.get('nonce') })}&state=${encodeURIComponent(au.searchParams.get('state'))}`)).loc) || [])[1] || ''); };
    assert.equal(await go('L0', OTHER, loid), 'err-tenant');
    assert.equal(await go('L1', MST, loid), 'join-microsoft');
    assert.equal((await call(UL, 'L1', 'POST', `/api/pub/${A.tid}/signup`, { via: 'sns', oauth: true, consent: { tos: true, privacy: true } })).j.error, 'student_no');
    const s = await call(UL, 'L1', 'POST', `/api/pub/${A.tid}/signup`, { via: 'sns', oauth: true, student_no: '20261234', dept: '컴퓨터공학과', consent: { tos: true, privacy: true } }); assert.equal(s.status, 200, JSON.stringify(s.j)); assert.equal(s.j.me.login, 'microsoft'); lsid = s.j.me.sid;
    const id = (await (async () => { const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_pii'); await c.query("select set_config('app.tenant', $1, true)", [A.tid]); return await c.query('select provider, provider_sub_hash, email_enc, name_enc from pii.identity where tid = $1 and learner_id = $2', [A.tid, lsid]); } finally { await c.query('rollback'); c.release(); } })()).rows[0];
    assert.equal(id.provider, 'microsoft'); assert.equal(id.email_enc, null); assert.equal(id.name_enc, null); assert.ok(!id.provider_sub_hash.includes(loid));
    assert.equal(await go('L2', MST, loid, 'login'), 'ok');
    /* v49.1 L-noti-teams 운영: Microsoft로 로그인한 학습자만 linked · 동의 후 켜기 · 발송은 Teams 앱 배포 전 「대기」 기록 */
    const on = await call(UL, 'A', 'PUT', '/api/conn/teams/learner', { on: true, events: ['notice'] }); assert.equal(on.status, 200, on.txt); assert.equal(on.j.learnerNoti.on, true); assert.deepEqual(on.j.learnerNoti.events, ['notice']);
    const g0 = await call(UL, 'L2', 'GET', `/api/pub/${A.tid}/teams-noti`); assert.equal(g0.j.available, true); assert.equal(g0.j.linked, true); assert.equal(g0.j.mode, 'live'); assert.deepEqual(g0.j.orgEvents, ['notice']);
    assert.equal((await call(UL, 'L2', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: true, agree: true, agreeVer: 'teams-lrn-v1', events: ['notice'] })).j.on, true);
    assert.equal((await call(UL, 'A', 'POST', '/api/conn/teams/notify', { event: 'notice', title: '보강 안내' })).j.learners, 1);
    assert.ok((await call(UL, 'A', 'GET', '/api/conn/teams')).j.runs.some(r => r.ch === '학습자 Teams 알림' && r.n === 1 && r.wait && !r.demo), '운영: 대기 기록');
    assert.equal((await call(UL, 'L2', 'PUT', `/api/pub/${A.tid}/teams-noti`, { on: false })).j.on, false);
  });
  await t.test('T11 · T12 출석 가져오기: 보고서 없음 → 404 · 출석/지각/결석 제안 · 미매칭 수 · 이메일 미저장', async () => {
    assert.equal((await call(UL, 'A', 'POST', `/api/conn/teams/meetings/${acct.meeting}/attendance/sync`)).j.error, 'teams_report_none');
    await putDoc(UL, 'A', { org: { name: 'A', type: 'univ' }, members: [{ id: 'm1', name: '학습자', sid: lsid }, { id: 'm2', name: '둘' }], classes: [{ id: 'c1', name: '반', learners: ['m1', 'm2'], curriculum: [{ id: 'it1', type: 'live', title: '라이브', url: '', attMin: 10 }], att: {} }] });
    M.reports = [{ id: 'r1', meetingEndDateTime: '2026-12-02T11:30:00Z' }];
    M.records = [{ identity: { id: loid }, emailAddress: 'stu@contoso.ac.kr', role: 'Attendee', totalAttendanceInSeconds: 84 * 60, attendanceIntervals: [{ joinDateTime: '2026-12-02T10:15:00Z' }] },
      { identity: { id: crypto.randomUUID() }, emailAddress: 'x@contoso.ac.kr', role: 'Attendee', totalAttendanceInSeconds: 3000, attendanceIntervals: [] },
      { identity: { id: crypto.randomUUID() }, role: 'Attendee', totalAttendanceInSeconds: 10 },
      { identity: { id: crypto.randomUUID() }, role: 'Organizer', totalAttendanceInSeconds: 5400 }];
    const sy = await call(UL, 'A', 'POST', `/api/conn/teams/meetings/${acct.meeting}/attendance/sync`); assert.equal(sy.status, 200, sy.txt);
    assert.equal(sy.j.matched.length, 1); assert.equal(sy.j.matched[0].lid, 'm1'); assert.equal(sy.j.matched[0].suggest, '지각'); assert.equal(sy.j.matched[0].minutes, 84); assert.equal(sy.j.unmatched, 2);
    assert.ok(!sy.txt.includes('contoso'), '이메일 미노출');
    assert.equal((await call(UL, 'A', 'POST', `/api/conn/teams/meetings/${acct.meeting}/attendance/apply`, { rows: [{ lid: 'm1', value: '지각' }] })).j.applied, 1);
    assert.equal((await getDoc(UL, 'A')).classes[0].att.it1.m1, '지각');
  });
  await t.test('T10 갱신 토큰 만료 → teams_account · reauth · 점검 필요', async () => {
    /* 액세스 토큰 캐시가 없는 새 앱 인스턴스 + 토큰 끝점이 invalid_grant */
    const app3 = createApp({ pool, env: { ...base, MS_CLIENT_ID: MS_ID, MS_CLIENT_SECRET: 'ms-sec' }, log: {} }); await new Promise(ok => app3.listen(0, ok)); const U3 = `http://127.0.0.1:${app3.address().port}`;
    jar.A3 = { ...jar.A }; const orig = mock.listeners('request')[0]; mock.removeAllListeners('request');
    mock.on('request', (q, r) => { if (/\/token$/.test(q.url)) { q.resume(); r.writeHead(400, { 'content-type': 'application/json' }); return r.end('{"error":"invalid_grant"}'); } orig(q, r); });
    const m = await call(U3, 'A3', 'POST', '/api/conn/teams/meetings', { subject: 'x', start: '2026-12-03T19:00:00+09:00', end: '2026-12-03T20:00:00+09:00', accountId: acct.id });
    mock.removeAllListeners('request'); mock.on('request', orig); app3.close();
    assert.equal(m.j.error, 'teams_account'); const g = await hashOf('A'); assert.equal(g.accounts[0].exp, 'reauth'); assert.equal(g.st, '점검 필요');
  });
  await t.test('T19 전체 해제: 토큰 · 주소 파기 · 반 항목 링크 유지', async () => {
    const url0 = (await getDoc(UL, 'A')).classes[0].curriculum[0].url;
    assert.equal((await call(UL, 'T', 'DELETE', '/api/conn/teams')).j.error, 'teams_role');
    const d = await call(UL, 'A', 'DELETE', '/api/conn/teams'); assert.equal(d.j.ok, true); assert.ok(d.j.removed.channels >= 1); assert.equal(d.j.removed.accounts, 1);
    assert.equal((await q(A.tid, 'select count(*)::int n from conn_secret where tenant_id = $1', [A.tid])).rows[0].n, 0);
    assert.equal((await getDoc(UL, 'A')).classes[0].curriculum[0].url, url0); assert.equal((await hashOf('A')).st, '미연결');
  });
  await t.test('T21 시범 플래그(QA4 #5): TEAMS_PILOT 없음 → 상태 pilot:false · 변경 403 teams_off · 알림 0 · 로그인 버튼 없음', async () => {
    const appP = createApp({ pool, env: { ...base, TEAMS_PILOT: '', MS_CLIENT_ID: MS_ID, MS_CLIENT_SECRET: 'ms-sec' }, log: {} }); await new Promise(ok => appP.listen(0, ok));
    try { const UP = `http://127.0.0.1:${appP.address().port}`; const P = await org(UP, 'PL', 'univ');
      const g = await call(UP, 'PL', 'GET', '/api/conn/teams'); assert.equal(g.status, 200); assert.equal(g.j.pilot, false); assert.ok(!g.j.channels, '상태 외 정보 없음');
      assert.equal((await call(UP, 'PL', 'PUT', '/api/conn/teams/demo', { on: true })).j.error, 'teams_off');
      assert.equal((await call(UP, 'PL', 'POST', '/api/conn/teams/channels', { name: 'x', demo: true })).j.error, 'teams_off');
      assert.equal((await call(UP, 'PL', 'POST', '/api/conn/teams/meetings', { subject: 'x', start: '2026-12-02T19:00:00+09:00', end: '2026-12-02T20:00:00+09:00' })).j.error, 'teams_off');
      assert.match((await call(UP, 'PL', 'GET', '/api/conn/teams/consent/start')).loc, /#conn=teams:err-off$/);
      assert.ok(!(await call(UP, 'X', 'GET', '/api/config')).j.oauth.includes('microsoft'), '시범 기관 설정 전에는 Microsoft 로그인 버튼 없음');
      assert.ok(!(await call(UP, 'X', 'GET', `/api/pub/${P.tid}/loauth`)).j.ready.includes('microsoft'));
      assert.equal((await call(UP, 'PL', 'POST', '/api/conn/teams/notify', { event: 'notice' })).j.error, 'teams_off');
    } finally { appP.close(); }
    const appQ = createApp({ pool, env: { ...base, TEAMS_PILOT: A.tid }, log: {} }); await new Promise(ok => appQ.listen(0, ok));
    try { const UQ = `http://127.0.0.1:${appQ.address().port}`; await org(UQ, 'QL', 'univ'); assert.equal((await call(UQ, 'QL', 'GET', '/api/conn/teams')).j.pilot, false, '목록에 없는 기관은 꺼짐'); } finally { appQ.close(); }
  });
  await t.test('RLS: 기관 역할로 다른 기관 행이 보이지 않음', async () => {
    const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_tenant'); await c.query("select set_config('app.tenant', $1, true)", [B.tid]);
      assert.equal((await c.query('select count(*)::int n from conn_secret where tenant_id <> $1', [B.tid])).rows[0].n, 0); assert.equal((await c.query('select count(*)::int n from conn_teams_meeting')).rows[0].n, 0);
      await assert.rejects(c.query("insert into conn_secret (id, tenant_id, kind, label, mask, enc) values ('x1', $1, 'teams_webhook', 'x', 'x', 'x')", [A.tid])); } finally { await c.query('rollback').catch(() => {}); c.release(); }
  });
  await t.test('주소 검사 단위(운영 설정): 허용 호스트 · 사설 IP 해석 차단', async () => {
    const cfg = teamsConfig({ NODE_ENV: 'production', TEAMS_WEBHOOK_TEST: '1', TEAMS_WEBHOOK_HOSTS: 'flow.contoso.kr' });
    const pub = async () => [{ address: '20.1.2.3' }]; const priv = async () => [{ address: '10.1.2.3' }];
    assert.ok(await checkHook(cfg, 'https://prod-12.koreacentral.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke?sig=x', pub));
    assert.ok(await checkHook(cfg, 'https://default1.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/x', pub));
    assert.ok(await checkHook(cfg, 'https://a.flow.contoso.kr/workflows/x', pub), 'TEAMS_WEBHOOK_HOSTS');
    assert.equal(await checkHook(cfg, 'https://prod-12.koreacentral.logic.azure.com/workflows/x', priv), null, '사설 IP로 해석');
    assert.equal(await checkHook(cfg, 'http://127.0.0.1:1/workflows/x', pub), null, '운영은 시험 플래그 무시');
  });
});
