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
  const M = { reports: [], records: [], meetings: 0, noAt: false, refreshFail: '', g401: 0, assertOk: 0, assertBad: 0 };
  const PUB = process.env.MOCK_CERT_PUB ? require('node:fs').readFileSync(process.env.MOCK_CERT_PUB, 'utf8') : '', THUMB = String(process.env.MOCK_CERT_THUMB || '').replace(/:/g, '');
  http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    const u = new URL(q.url, 'http://x'); const out = (s, j, h = {}) => { r.writeHead(s, { 'content-type': 'application/json', ...h }); r.end(j === undefined ? '' : JSON.stringify(j)); };
    if (u.pathname === '/_ctl') { const j = JSON.parse(b || '{}'); Object.assign(M, j); return out(200, { assertOk: M.assertOk, assertBad: M.assertBad }); }
    let m = u.pathname.match(/^\/microsoft\/([^/]+)\/token$/);
    if (m) { const f = new URLSearchParams(b); if (f.get('client_id') !== MS_ID) return out(401, { error: 'invalid_client' });
      if (f.get('client_assertion')) { /* 인증서 자격 증명: RS256 서명 · x5t · aud(이 토큰 끝점) · iss=sub=앱 · exp 확인 */
        const [h, p, sg] = f.get('client_assertion').split('.'); let ok = false;
        try { const H = JSON.parse(Buffer.from(h, 'base64url')), P = JSON.parse(Buffer.from(p, 'base64url')); const now = Date.now() / 1000;
          ok = f.get('client_assertion_type') === 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer' && H.alg === 'RS256' && H.x5t === Buffer.from(THUMB, 'hex').toString('base64url') && P.aud === `http://${q.headers.host}${u.pathname}` && P.iss === MS_ID && P.sub === MS_ID && P.exp > now && P.nbf <= now + 5 && !!P.jti && !!PUB && crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), PUB, Buffer.from(sg, 'base64url')); } catch (e) { ok = false; }
        if (!ok || f.get('client_secret')) { M.assertBad++; return out(401, { error: 'invalid_client' }); } M.assertOk++; }
      else if (f.get('client_secret') !== MS_SEC) return out(401, { error: 'invalid_client' });
      if (f.get('grant_type') === 'refresh_token') { if (M.refreshFail) return out(400, { error: M.refreshFail }); const rt = f.get('refresh_token'); return out(200, { access_token: 'at2.' + rt, refresh_token: rt + '.n', expires_in: 3600, token_type: 'Bearer' }); }
      if (!f.get('code_verifier')) return out(400, { error: 'invalid_request' });
      let c; try { c = JSON.parse(Buffer.from(f.get('code'), 'base64url').toString()); } catch (e) { return out(400, { error: 'invalid_grant' }); }
      const idt = jwt({ aud: c.aud || MS_ID, iss: `https://login.microsoftonline.com/${c.tid}/v2.0`, tid: c.tid, oid: c.oid, preferred_username: c.upn, nonce: c.nonce, exp: Math.floor(Date.now() / 1000) + 600 });
      return out(200, { ...(M.noAt ? {} : { access_token: 'at.' + c.oid }), id_token: idt, refresh_token: 'rt.' + c.oid, scope: 'openid OnlineMeetings.ReadWrite OnlineMeetingArtifact.Read.All', expires_in: 3600 }); }
    if (/^\/graph\//.test(u.pathname) && M.g401 > 0) { M.g401--; return out(401, {}); }
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
  /* 출석 매칭(학습자 Entra 연결 2명 + 미연결 1명) — pii.identity 블라인드 인덱스 ↔ 기관 문서 members[].sid */
  const lo2 = crypto.randomUUID(); const ls4 = await call('L4', 'GET', `/api/pub/${TID}/loauth/microsoft/start?m=join`); const lu4 = new URL(ls4.loc);
  await call('L4', 'GET', `/api/pub/loauth/microsoft/callback?code=${code({ tid: MST, oid: lo2, nonce: lu4.searchParams.get('nonce') })}&state=${encodeURIComponent(lu4.searchParams.get('state'))}`);
  const su2 = await call('L4', 'POST', `/api/pub/${TID}/signup`, { via: 'sns', oauth: true, student_no: '20261235', dept: '컴퓨터공학과', consent: { tos: true, privacy: true } });
  const sid1 = su.j && su.j.me && su.j.me.sid, sid2 = su2.j && su2.j.me && su2.j.me.sid; R.lSids = [typeof sid1, typeof sid2, sid1 !== sid2];
  const d2 = (await call('A', 'GET', '/api/state')).j; const cl = d2.doc.classes[0]; cl.learners = ['m1', 'm2', 'm3'];
  d2.doc.members = [{ id: 'm1', name: '가', sid: sid1 }, { id: 'm2', name: '나', sid: sid2 }, { id: 'm3', name: '다' }]; await call('A', 'PUT', '/api/state', { rev: d2.rev, doc: d2.doc });
  const mt2 = await call('A', 'POST', '/api/conn/teams/meetings', { classId: 'c1', itemId: 'it1', subject: '출석 대조', start: '2026-12-02T19:00:00+09:00', end: '2026-12-02T20:30:00+09:00' });
  await ctl({ reports: [{ id: 'r9', meetingEndDateTime: '2026-12-02T11:30:00Z' }], records: [
    { identity: { id: lo }, role: 'Attendee', totalAttendanceInSeconds: 84 * 60, attendanceIntervals: [{ joinDateTime: '2026-12-02T10:15:00Z' }, { joinDateTime: '2026-12-02T10:40:00Z' }] },
    { identity: { id: lo2.toUpperCase() }, role: 'Attendee', totalAttendanceInSeconds: 70 * 60, attendanceIntervals: [{ joinDateTime: '2026-12-02T10:02:00Z' }] },
    { identity: { id: crypto.randomUUID() }, role: 'Attendee', totalAttendanceInSeconds: 3000, attendanceIntervals: [] },
    { identity: { id: lo }, role: 'Organizer', totalAttendanceInSeconds: 5400 }] });
  const sy = await call('A', 'POST', `/api/conn/teams/meetings/${mt2.j.id}/attendance/sync`);
  R.syncMatch = [sy.st, sy.j.mode, sy.j.unmatched, (sy.j.matched || []).map(x => [x.lid, /^L-[0-9a-f]{4}$/.test(x.label), x.suggest, x.minutes, x.firstJoin]).sort((a, b) => (a[0] < b[0] ? -1 : 1))];
  R.applyMatch = (x => [x.st, x.j.applied])(await call('A', 'POST', `/api/conn/teams/meetings/${mt2.j.id}/attendance/apply`, { rows: (sy.j.matched || []).map(x => ({ lid: x.lid, value: x.suggest })) }));
  R.attDoc = (d => JSON.stringify(d.classes[0].att && d.classes[0].att.it1))((await call('A', 'GET', '/api/state')).j.doc);
  await call('A', 'DELETE', `/api/conn/teams/meetings/${mt2.j.id}`);
  R.mtDel = (x => [x.st, x.j.ok])(await call('A', 'DELETE', `/api/conn/teams/meetings/${mt.j.id}`));
  R.docAfter = (d => [d.classes[0].curriculum[0].url, d.classes[0].curriculum[0].teams === undefined])((await call('A', 'GET', '/api/state')).j.doc);
  R.acctDel = (x => [x.st, x.j.ok])(await call('A', 'DELETE', `/api/conn/teams/account/${g2.accounts[0] && g2.accounts[0].id}`));
  R.off = (x => [x.st, x.j.removed])(await call('A', 'DELETE', '/api/conn/teams'));
  return R;
}

/* 인증서 자격 증명(MS_CLIENT_CERT_PEM · THUMB, 비밀값 없음) + 갱신 토큰 만료(invalid_grant → 재연결 필요) */
async function certScenario(U, MU, tag) {
  const R = {}; const jar = {};
  const call = async (who, method, p, body) => { const h = { 'x-didisam': '1' }; if (jar[who]) h.cookie = Object.entries(jar[who]).map(([k, v]) => `${k}=${v}`).join('; '); if (body !== undefined) h['content-type'] = 'application/json';
    const r = await fetch(U + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
    for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) { const [kv] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1); jar[who] = jar[who] || {}; if (v) jar[who][k] = v; else delete jar[who][k]; }
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* 리다이렉트 */ } return { st: r.status, j, loc: r.headers.get('location') || '' }; };
  const ctl = async o => (await fetch(MU + '/_ctl', { method: 'POST', body: JSON.stringify(o) })).json();
  const MST = crypto.randomUUID(), oid = crypto.randomUUID(); await ctl({ assertOk: 0, assertBad: 0, noAt: true, refreshFail: '', g401: 0, reports: [], records: [] });
  await call('A', 'POST', '/api/signup', { email: `ctc_${tag}_${Date.now()}@example.com`, password: 'Contract2026x', orgName: '인증서 대학교', type: 'univ', code: 'C0DE' });
  const s = await call('A', 'GET', '/api/conn/teams/consent/start'); const au = new URL(s.loc);
  const w = await call('A', 'GET', `/api/conn/teams/consent/whoami?code=${b64({ tid: MST, oid: crypto.randomUUID(), upn: 'admin@cert.ac.kr', nonce: au.searchParams.get('nonce') })}&state=${encodeURIComponent(au.searchParams.get('state'))}`); const cu = new URL(w.loc);
  R.consent = (await call('A', 'GET', `/api/conn/teams/consent/callback?tenant=${MST}&admin_consent=True&state=${encodeURIComponent(cu.searchParams.get('state'))}`)).loc;
  const as = await call('A', 'GET', '/api/conn/teams/account/start'); const aa = new URL(as.loc);
  R.acct = (await call('A', 'GET', `/api/conn/teams/account/callback?code=${b64({ tid: MST, oid, upn: 'prof@cert.ac.kr', nonce: aa.searchParams.get('nonce') })}&state=${encodeURIComponent(aa.searchParams.get('state'))}`)).loc;
  R.assert1 = await ctl({}); /* 코드 교환 2회(동의 확인 · 회의 계정) = 서명 검증 2회 */
  const body = { subject: '인증서 회의', start: '2026-12-02T19:00:00+09:00', end: '2026-12-02T20:00:00+09:00' };
  const m1 = await call('A', 'POST', '/api/conn/teams/meetings', body); R.mtRefresh = [m1.st, m1.j.mode]; R.assert2 = await ctl({}); /* 캐시 없음 → 갱신 토큰으로 access token(서명 1회 더) */
  await ctl({ g401: 1, refreshFail: 'invalid_grant' });
  R.g401 = (x => [x.st, x.j.error])(await call('A', 'PATCH', `/api/conn/teams/meetings/${m1.j.id}`, { subject: '바꿈' })); /* Graph 401 → 캐시 비움 · teams_account */
  R.expired = (x => [x.st, x.j.error])(await call('A', 'PATCH', `/api/conn/teams/meetings/${m1.j.id}`, { subject: '바꿈' })); /* 갱신 invalid_grant → reauth */
  const g = (await call('A', 'GET', '/api/conn/teams')).j; R.view = [g.st, g.accounts.length, g.accounts[0] && g.accounts[0].exp, g.accounts[0] && g.accounts[0].mine, g.note];
  R.after = (x => [x.st, x.j.error])(await call('A', 'POST', '/api/conn/teams/meetings', body)); /* reauth 계정은 Graph 호출 없이 거절 */
  const as2 = await call('A', 'GET', '/api/conn/teams/account/start'); const aa2 = new URL(as2.loc); await ctl({ refreshFail: '', noAt: false });
  R.relink = (await call('A', 'GET', `/api/conn/teams/account/callback?code=${b64({ tid: MST, oid, upn: 'prof@cert.ac.kr', nonce: aa2.searchParams.get('nonce') })}&state=${encodeURIComponent(aa2.searchParams.get('state'))}`)).loc;
  const g2 = (await call('A', 'GET', '/api/conn/teams')).j; R.view2 = [g2.st, g2.accounts.length, g2.accounts[0] && g2.accounts[0].exp];
  R.mtAgain = (await call('A', 'POST', '/api/conn/teams/meetings', body)).st; R.assert3 = await ctl({});
  return R;
}

if (process.argv[2] === 'serve') serve(+process.argv[3]);
else if (process.argv[5] === 'cert') (async () => {
  const [N, J, MU] = process.argv.slice(2); const a = await certScenario(N, MU, 'n'), b = await certScenario(J, MU, 'j'); let ok = 0, bad = 0;
  for (const k of Object.keys(a)) { const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]); if (x === y) ok++; else { bad++; console.log(`✗ ${k}\n   Node ${x}\n   Java ${y}`); } }
  if (process.env.DBG) console.log(JSON.stringify(a, null, 1));
  console.log(`${bad ? '✗' : '✓'} Teams 인증서 · 갱신 만료 대조 ${ok}건 같음 · ${bad}건 다름`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
else (async () => {
  const [N, J, MU] = process.argv.slice(2); const a = await scenario(N, MU, 'n'), b = await scenario(J, MU, 'j'); let ok = 0, bad = 0;
  for (const k of Object.keys(a)) { const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]); if (x === y) ok++; else { bad++; console.log(`✗ ${k}\n   Node ${x}\n   Java ${y}`); } }
  if (process.env.DBG) console.log(JSON.stringify(a, null, 1));
  console.log(`${bad ? '✗' : '✓'} Teams 실제 경로 대조 ${ok}건 같음 · ${bad}건 다름`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
