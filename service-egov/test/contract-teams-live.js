'use strict';
/* MS Teams 실제 경로(MS_CLIENT_ID 설정) Node · Java 대조 — Entra 관리자 동의 · 회의 계정 위임(PKCE · 토큰 교환 · 갱신) · Graph 온라인 회의 · 출석 리포트 · 운영자 SSO · 학습자 openid 로그인.
   Microsoft 로그인 · 토큰 · Graph 끝점은 이 파일의 가짜 서버(OAUTH_MOCK_URL)가 가로챈다 — 실제 키 금지.
   사용: node test/contract-teams-live.js serve <포트>   (가짜 서버만 띄움, contract-teams-live.sh가 씀)
         node test/contract-teams-live.js <Node 주소> <Java 주소> <가짜 서버 주소> */
const http = require('node:http'); const crypto = require('node:crypto');
const MS_ID = 'ms-app-contract', MS_SEC = 'ms-sec-contract';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = c => `${b64({ alg: 'none' })}.${b64(c)}.sig`;

function serve(port) {
  const M = { reports: [], records: [], meetings: 0 };
  http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    const u = new URL(q.url, 'http://x'); const out = (s, j, h = {}) => { r.writeHead(s, { 'content-type': 'application/json', ...h }); r.end(j === undefined ? '' : JSON.stringify(j)); };
    if (u.pathname === '/_ctl') { const j = JSON.parse(b || '{}'); Object.assign(M, j); return out(200, { ok: true }); }
    let m = u.pathname.match(/^\/microsoft\/([^/]+)\/token$/);
    if (m) { const f = new URLSearchParams(b); if (f.get('client_id') !== MS_ID || f.get('client_secret') !== MS_SEC) return out(401, { error: 'invalid_client' });
      if (f.get('grant_type') === 'refresh_token') { const rt = f.get('refresh_token'); return out(200, { access_token: 'at2.' + rt, refresh_token: rt + '.n', expires_in: 3600, token_type: 'Bearer' }); }
      if (!f.get('code_verifier')) return out(400, { error: 'invalid_request' });
      let c; try { c = JSON.parse(Buffer.from(f.get('code'), 'base64url').toString()); } catch (e) { return out(400, { error: 'invalid_grant' }); }
      const idt = jwt({ aud: c.aud || MS_ID, iss: `https://login.microsoftonline.com/${c.tid}/v2.0`, tid: c.tid, oid: c.oid, preferred_username: c.upn, nonce: c.nonce, exp: Math.floor(Date.now() / 1000) + 600 });
      return out(200, { access_token: 'at.' + c.oid, id_token: idt, refresh_token: 'rt.' + c.oid, scope: 'openid OnlineMeetings.ReadWrite OnlineMeetingArtifact.Read.All', expires_in: 3600 }); }
    if (/^\/graph\/v1\.0\/me\/onlineMeetings$/.test(u.pathname) && q.method === 'POST') { const j = JSON.parse(b); if (!j.subject || !j.startDateTime || !j.lobbyBypassSettings) return out(400, {}); M.meetings++; return out(201, { id: 'MSMT' + M.meetings, joinWebUrl: `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${M.meetings}` }); }
    m = u.pathname.match(/^\/graph\/v1\.0\/me\/onlineMeetings\/([^/]+)(\/attendanceReports(?:\/([^/]+))?)?$/);
    if (m && !(q.headers.authorization || '').startsWith('Bearer at')) return out(401, {});
    if (m && !m[2]) return out(204);
    if (m && m[2] && !m[3]) return out(200, { value: M.reports });
    if (m && m[3]) return out(200, { id: m[3], meetingStartDateTime: '2026-12-02T10:00:00Z', meetingEndDateTime: '2026-12-02T11:30:00Z', attendanceRecords: M.records });
    out(404, {}); }); }).listen(port, '127.0.0.1');
}

async function scenario(U, MU, tag) {
  const R = {}; const jar = {};
  const call = async (who, method, p, body) => { const h = { 'x-didisam': '1' }; if (jar[who]) h.cookie = Object.entries(jar[who]).map(([k, v]) => `${k}=${v}`).join('; '); if (body !== undefined) h['content-type'] = 'application/json';
    const r = await fetch(U + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
    for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) { const [kv] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1); jar[who] = jar[who] || {}; if (v) jar[who][k] = v; else delete jar[who][k]; }
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* 리다이렉트 */ } return { st: r.status, j, loc: r.headers.get('location') || '' }; };
  const ctl = o => fetch(MU + '/_ctl', { method: 'POST', body: JSON.stringify(o) });
  const code = c => b64(c);
  /* 리다이렉트 비교: 가짜 서버 주소 · 동적 값(state · nonce · challenge)을 지우고 경로 + 고정 매개변수만 */
  const norm = loc => { if (!loc) return ''; let u; try { u = new URL(loc, 'http://app'); } catch (e) { return loc; } const keep = ['scope', 'response_type', 'response_mode', 'code_challenge_method', 'prompt', 'client_id', 't', 'oa', 'm'];
    const q = keep.filter(k => u.searchParams.has(k)).map(k => `${k}=${u.searchParams.get(k)}`).join('&'); return (u.origin === 'http://app' ? '' : u.origin.startsWith('http://127.0.0.1') ? 'MOCK' : u.origin) + u.pathname.replace(/\/tn_[a-z0-9]+/, '/TID').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'UUID') + (q ? '?' + q.replace(/t=tn_[a-z0-9]+/, 't=TID') : '') + u.hash; };
  const MST = crypto.randomUUID(), OTHER = crypto.randomUUID(), oid = crypto.randomUUID();
  const em = `ctl_${tag}_${Date.now()}@example.com`;
  const sg = await call('A', 'POST', '/api/signup', { email: em, password: 'Contract2026x', orgName: '대조 대학교', type: 'univ', code: 'C0DE' }); const TID = sg.j && sg.j.tenant && sg.j.tenant.tid;
  const doc = (await call('A', 'GET', '/api/state')).j; await call('A', 'PUT', '/api/state', { rev: doc.rev || 0, doc: { org: { name: '대조 대학교', type: 'univ' }, members: [{ id: 'm1', name: '가' }], classes: [{ id: 'c1', name: '반', learners: ['m1'], curriculum: [{ id: 'it1', type: 'live', title: '실시간' }] }] } });
  R.config = ((await call('X', 'GET', '/api/config')).j.oauth || []).includes('microsoft');
  R.get0 = (x => [x.mode, x.st, x.scopesAvail.join()])((await call('A', 'GET', '/api/conn/teams')).j);
  R.acctNoConsent = norm((await call('A', 'GET', '/api/conn/teams/account/start')).loc);
  R.chLiveNoUrl = (await call('A', 'POST', '/api/conn/teams/channels', { name: 'x' })).j.error;
  /* 관리자 동의 */
  const consent = async (forge, aud) => { const s = await call('A', 'GET', '/api/conn/teams/consent/start'); const au = new URL(s.loc); const r1 = norm(s.loc);
    const w = await call('A', 'GET', `/api/conn/teams/consent/whoami?code=${code({ tid: MST, oid: crypto.randomUUID(), upn: 'admin@contoso.ac.kr', nonce: au.searchParams.get('nonce'), ...(aud ? { aud } : {}) })}&state=${encodeURIComponent(au.searchParams.get('state'))}`);
    if (!/adminconsent/.test(w.loc)) return [r1, norm(w.loc)]; const cu = new URL(w.loc);
    const cb = await call('A', 'GET', `/api/conn/teams/consent/callback?tenant=${forge || MST}&admin_consent=True&state=${encodeURIComponent(cu.searchParams.get('state'))}`); return [r1, norm(w.loc), cu.searchParams.get('redirect_uri').replace(/^https?:\/\/[^/]+/, ''), norm(cb.loc)]; };
  R.consentAud = await consent(null, 'other');
  R.consentForge = await consent(OTHER);
  R.consent = await consent();
  R.badState = norm((await call('Z', 'GET', '/api/conn/teams/consent/whoami?code=x&state=bad')).loc);
  const g1 = (await call('A', 'GET', '/api/conn/teams')).j; R.get1 = [g1.st, g1.org && g1.org.domain, g1.org && g1.org.consentBy, g1.org && g1.org.msTid === MST, JSON.stringify(g1).includes(MST)];
  /* 회의 계정 */
  const acct = async t => { const s = await call('A', 'GET', '/api/conn/teams/account/start'); const au = new URL(s.loc);
    const cb = await call('A', 'GET', `/api/conn/teams/account/callback?code=${code({ tid: t, oid, upn: 'kimprof@contoso.ac.kr', nonce: au.searchParams.get('nonce') })}&state=${encodeURIComponent(au.searchParams.get('state'))}`); return [norm(s.loc).replace(MST, 'MST'), norm(cb.loc)]; };
  R.acctOther = await acct(OTHER); R.acct = await acct(MST);
  const g2 = (await call('A', 'GET', '/api/conn/teams')).j; R.get2 = [g2.st, g2.accounts.length, g2.accounts[0] && g2.accounts[0].upn, g2.accounts[0] && g2.accounts[0].mine, g2.accounts[0] && g2.accounts[0].scopes.join(), g2.note];
  /* Graph 회의 · 출석 */
  await ctl({ reports: [], records: [] });
  const mt = await call('A', 'POST', '/api/conn/teams/meetings', { classId: 'c1', itemId: 'it1', subject: '실시간 3주차', start: '2026-12-02T19:00:00+09:00', end: '2026-12-02T20:30:00+09:00', lobby: 'everyone' });
  R.mt = [mt.st, mt.j.mode, /^https:\/\/teams\.microsoft\.com\/l\/meetup-join\//.test(mt.j.joinUrl || ''), mt.j.linked];
  R.docUrl = (d => { const it = d.classes[0].curriculum[0]; return [/^https:\/\/teams/.test(it.url), !!(it.teams && it.teams.mid), it.teams && it.teams.demo === undefined]; })((await call('A', 'GET', '/api/state')).j.doc);
  R.mtPatch = (x => [x.st, x.j.ok])(await call('A', 'PATCH', `/api/conn/teams/meetings/${mt.j.id}`, { subject: '바뀐 제목' }));
  R.syncNone = (x => [x.st, x.j.error])(await call('A', 'POST', `/api/conn/teams/meetings/${mt.j.id}/attendance/sync`));
  await ctl({ reports: [{ id: 'r0', meetingEndDateTime: '2026-12-01T11:30:00Z' }, { id: 'r1', meetingEndDateTime: '2026-12-02T11:30:00Z' }], records: [{ identity: { id: crypto.randomUUID() }, role: 'Attendee', totalAttendanceInSeconds: 3000, attendanceIntervals: [] }, { identity: { id: 'x' }, role: 'Organizer', totalAttendanceInSeconds: 10 }] });
  R.sync = (x => [x.st, x.j.mode, x.j.reportId, x.j.matched && x.j.matched.length, x.j.unmatched, x.j.meetingStart])(await call('A', 'POST', `/api/conn/teams/meetings/${mt.j.id}/attendance/sync`));
  R.mtList = (x => x.j.meetings.map(m => [m.mode, m.subject, m.accountId ? 'ac' : '']))(await call('A', 'GET', '/api/conn/teams/meetings'));
  /* 운영자 SSO */
  R.ssoBad = (await call('A', 'PUT', '/api/conn/teams/sso', { operator: 'x' })).st;
  R.sso = (x => [x.st, x.j.sso && x.j.sso.operator, x.j.sso && x.j.sso.learner, x.j.features && x.j.features.sso])(await call('A', 'PUT', '/api/conn/teams/sso', { operator: true, learner: true }));
  const op = async (who, t, o, start) => { const s = start || await call(who, 'GET', '/api/oauth/microsoft/start'); const au = new URL(s.loc || s.j.url);
    const cb = await call(who, 'GET', `/api/oauth/microsoft/callback?code=${code({ tid: t, oid: o, upn: 'x@contoso.ac.kr', nonce: au.searchParams.get('nonce') })}&state=${encodeURIComponent(au.searchParams.get('state'))}`); return [norm(s.loc || s.j.url), norm(cb.loc)]; };
  const ooid = crypto.randomUUID();
  R.opUnlinked = await op('O', MST, ooid);
  const ls = await call('A', 'POST', '/api/oauth/microsoft/link-start'); R.linkOther = await op('A', OTHER, ooid, ls);
  R.link = await op('A', MST, ooid, await call('A', 'POST', '/api/oauth/microsoft/link-start'));
  R.opLogin = await op('O', MST, ooid); R.opMe = (await call('O', 'GET', '/api/me')).st;
  /* 학습자 openid 로그인 */
  R.lReady = ((await call('L', 'GET', `/api/pub/${TID}/loauth`)).j.ready || []).includes('microsoft');
  const lo = crypto.randomUUID(); const ls1 = await call('L', 'GET', `/api/pub/${TID}/loauth/microsoft/start?m=join`); const lu = new URL(ls1.loc);
  const lcOther = await call('L2', 'GET', `/api/pub/loauth/microsoft/callback?code=${code({ tid: OTHER, oid: lo, nonce: lu.searchParams.get('nonce') })}&state=${encodeURIComponent(lu.searchParams.get('state'))}`);
  const ls2 = await call('L', 'GET', `/api/pub/${TID}/loauth/microsoft/start?m=join`); const lu2 = new URL(ls2.loc);
  const lc = await call('L', 'GET', `/api/pub/loauth/microsoft/callback?code=${code({ tid: MST, oid: lo, nonce: lu2.searchParams.get('nonce') })}&state=${encodeURIComponent(lu2.searchParams.get('state'))}`);
  R.learner = [norm(ls1.loc), norm(lcOther.loc), norm(lc.loc)];
  const su = await call('L', 'POST', `/api/pub/${TID}/signup`, { via: 'sns', oauth: true, student_no: '20261234', dept: '컴퓨터공학과', consent: { tos: true, privacy: true } }); R.lSignup = [su.st, su.j && su.j.me && su.j.me.login];
  const ls3 = await call('L3', 'GET', `/api/pub/${TID}/loauth/microsoft/start?m=login`); const lu3 = new URL(ls3.loc);
  R.lLogin = norm((await call('L3', 'GET', `/api/pub/loauth/microsoft/callback?code=${code({ tid: MST, oid: lo, nonce: lu3.searchParams.get('nonce') })}&state=${encodeURIComponent(lu3.searchParams.get('state'))}`)).loc);
  R.mtDel = (x => [x.st, x.j.ok])(await call('A', 'DELETE', `/api/conn/teams/meetings/${mt.j.id}`));
  R.docAfter = (d => [d.classes[0].curriculum[0].url, d.classes[0].curriculum[0].teams === undefined])((await call('A', 'GET', '/api/state')).j.doc);
  R.acctDel = (x => [x.st, x.j.ok])(await call('A', 'DELETE', `/api/conn/teams/account/${g2.accounts[0] && g2.accounts[0].id}`));
  R.off = (x => [x.st, x.j.removed])(await call('A', 'DELETE', '/api/conn/teams'));
  return R;
}

if (process.argv[2] === 'serve') serve(+process.argv[3]);
else (async () => {
  const [N, J, MU] = process.argv.slice(2); const a = await scenario(N, MU, 'n'), b = await scenario(J, MU, 'j'); let ok = 0, bad = 0;
  for (const k of Object.keys(a)) { const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]); if (x === y) ok++; else { bad++; console.log(`✗ ${k}\n   Node ${x}\n   Java ${y}`); } }
  if (process.env.DBG) console.log(JSON.stringify(a, null, 1));
  console.log(`${bad ? '✗' : '✓'} Teams 실제 경로 대조 ${ok}건 같음 · ${bad}건 다름`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
