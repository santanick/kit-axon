'use strict';
/* 13차 MS Teams /api/conn/teams/* 규격 대조 — Node(service/server)와 Java(service-egov conn/web/TeamsController)를 같은 요청 묶음으로 부르고
   상태 코드 · 응답 형태(키 구조) · 오류 코드가 같은지 본다(teams.md 6절 T20). 두 서버 모두 MS_CLIENT_ID 없이(시연 모드) 띄운다 — 실제 키 금지.
   사용: node tests/contract-teams.js http://127.0.0.1:<Node> http://127.0.0.1:<Java>
   SIGNUP_CODE를 쓰는 서버면 같은 값을 환경변수로 준다. 한쪽만 주면 그 서버의 응답 형태만 출력한다(개발용). */
const [A, B] = [process.argv[2] || 'http://127.0.0.1:9940', process.argv[3] || ''];
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
const shape = v => v === null ? 'null' : Array.isArray(v) ? '[' + (v.length ? shape(v[0]) : '') + ']' : typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => k + ':' + shape(v[k])).join(',') + '}' : typeof v;

function client(base) {
  let jar = '';
  return async (method, p, body) => {
    const h = { 'x-didisam': '1' }; if (jar) h.cookie = jar; if (body !== undefined) h['content-type'] = 'application/json';
    const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const sc = (typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).filter(c => !/=$/.test(c)); if (sc.length) jar = [...new Set([...jar.split('; ').filter(Boolean), ...sc])].join('; ');
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* 빈 응답 · 리다이렉트 */ }
    return { st: r.status, j, loc: r.headers.get('location') || '' };
  };
}

async function scenario(base, tag) {
  const R = {}; const call = client(base); const em = `ct_tm_${tag}_${Date.now()}@example.com`;
  R.noauth = await call('GET', '/api/conn/teams');
  R.signup = await call('POST', '/api/signup', { email: em, password: 'Contract2026x', orgName: '대조 대학교', type: 'univ', ...(process.env.SIGNUP_CODE ? { code: process.env.SIGNUP_CODE } : {}) });
  R.state = await call('PUT', '/api/state', { doc: { org: { name: '대조 대학교', type: 'univ' }, members: [{ id: 'm1', name: '가' }, { id: 'm2', name: '나' }], classes: [{ id: 'c1', name: '반', learners: ['m1', 'm2'], curriculum: [{ id: 'it1', type: 'live', title: '라이브', url: '' }], att: {} }] }, rev: 0 });
  R.get0 = await call('GET', '/api/conn/teams');
  R.consent = await call('GET', '/api/conn/teams/consent/start');
  R.opStart = await call('GET', '/api/oauth/microsoft/start');
  R.demo = await call('PUT', '/api/conn/teams/demo', { on: true });
  R.chBadEv = await call('POST', '/api/conn/teams/channels', { name: 'x', events: ['hack'] });
  R.chNoName = await call('POST', '/api/conn/teams/channels', { name: '' });
  R.chBadUrl = await call('POST', '/api/conn/teams/channels', { name: 'x', url: 'https://contoso.webhook.office.com/webhookb2/a/workflows/b' });
  R.chDemo = await call('POST', '/api/conn/teams/channels', { name: '교육운영', events: ['notice', 'approval'] });
  const ch = R.chDemo.j && R.chDemo.j.id;
  R.chPatch = await call('PATCH', `/api/conn/teams/channels/${ch}`, { events: ['notice'] });
  R.test = await call('POST', '/api/conn/teams/test', { channelId: ch });
  R.testNone = await call('POST', '/api/conn/teams/test', { channelId: 'ch_zzzzzzzzzz' });
  R.setBad = await call('PUT', '/api/conn/teams/settings', { events: { [ch]: ['nope'] } });
  R.set = await call('PUT', '/api/conn/teams/settings', { meetingDefaults: { lobby: 'everyone', attMin: 15 }, features: { notify: true } });
  R.notifyBad = await call('POST', '/api/conn/teams/notify', { event: 'hack' });
  R.notify = await call('POST', '/api/conn/teams/notify', { event: 'notice', title: '휴강 안내' });
  R.mtTime = await call('POST', '/api/conn/teams/meetings', { subject: 'x', start: '2026-12-02T20:00:00+09:00', end: '2026-12-02T19:00:00+09:00' });
  R.mtLong = await call('POST', '/api/conn/teams/meetings', { subject: 'x', start: '2026-12-02T10:00:00+09:00', end: '2026-12-03T11:00:00+09:00' });
  R.mt = await call('POST', '/api/conn/teams/meetings', { classId: 'c1', itemId: 'it1', subject: '대조 실시간', start: '2026-12-02T19:00:00+09:00', end: '2026-12-02T20:30:00+09:00' });
  const mt = R.mt.j && R.mt.j.id;
  R.mtList = await call('GET', '/api/conn/teams/meetings');
  R.mtPatch = await call('PATCH', `/api/conn/teams/meetings/${mt}`, { subject: '바뀐 제목' });
  R.sync = await call('POST', `/api/conn/teams/meetings/${mt}/attendance/sync`);
  R.applyBad = await call('POST', `/api/conn/teams/meetings/${mt}/attendance/apply`, { rows: [{ lid: 'm1', value: '조퇴' }] });
  R.apply = await call('POST', `/api/conn/teams/meetings/${mt}/attendance/apply`, { rows: [{ lid: 'm1', value: '출석' }, { lid: 'm2', value: '지각' }, { lid: 'zz', value: '출석' }] });
  R.doc = await call('GET', '/api/state');
  R.mtNone = await call('DELETE', '/api/conn/teams/meetings/tm_zzzzzzzzzz');
  R.mtDel = await call('DELETE', `/api/conn/teams/meetings/${mt}`);
  R.sso = await call('PUT', '/api/conn/teams/sso', { operator: true });
  R.learner = await call('PUT', '/api/conn/teams/learner', { on: true });
  R.acNone = await call('DELETE', '/api/conn/teams/account/ac_zzzzzzzzzz');
  R.unknown = await call('GET', '/api/conn/teams/nope');
  R.get1 = await call('GET', '/api/conn/teams');
  R.chDel = await call('DELETE', `/api/conn/teams/channels/${ch}`);
  R.off = await call('DELETE', '/api/conn/teams');
  R.get2 = await call('GET', '/api/conn/teams');
  return R;
}

/* 값까지 같아야 하는 항목(시각 · id 같은 가변 값 제외) */
const FIX = {
  get0: j => [j.mode, j.st, j.scopesAvail.join(), j.channels.length],
  demo: j => [j.st, j.org && j.org.domain],
  chBadEv: j => [j.error], chNoName: j => [j.error], chBadUrl: j => [j.error], chDemo: j => [j.kind, j.events.join()],
  test: j => [j.ok, j.demo], testNone: j => [j.error], setBad: j => [j.error], set: j => [j.meetingDefaults.lobby, j.meetingDefaults.attMin],
  notifyBad: j => [j.error], notify: j => [j.queued], mtTime: j => [j.error], mtLong: j => [j.error], mt: j => [j.mode, j.joinUrl, j.linked],
  sync: j => [j.mode, j.matched.length, j.unmatched], applyBad: j => [j.error], apply: j => [j.applied],
  doc: j => { const c = j.doc.classes[0]; return [c.curriculum[0].url, JSON.stringify(c.att.it1 || {})]; },
  mtNone: j => [j.error], mtDel: j => [j.ok], sso: j => [j.error], learner: j => [j.error], acNone: j => [j.error], unknown: j => [j.error],
  get1: j => [j.st, j.channels.length, j.channels[0] && j.channels[0].events.join()], off: j => [j.ok, j.removed.channels, j.removed.accounts], get2: j => [j.st, j.channels.length],
};

(async () => {
  const ra = await scenario(A, 'a');
  if (!B) { for (const [k, v] of Object.entries(ra)) console.log(k.padEnd(10), v.st, v.j ? shape(v.j).slice(0, 160) : v.loc); return; }
  const rb = await scenario(B, 'b');
  for (const k of Object.keys(ra)) {
    const a = ra[k], b = rb[k];
    ok(a.st === b.st, `${k}: 상태 ${a.st} ≠ ${b.st}`);
    if (a.loc || b.loc) ok(a.loc.replace(/\?.*$/, '') === b.loc.replace(/\?.*$/, ''), `${k}: 리다이렉트 ${a.loc} ≠ ${b.loc}`);
    if (a.j && b.j && k !== 'doc' && k !== 'state' && k !== 'signup') ok(shape(a.j) === shape(b.j), `${k}: 형태\n  Node ${shape(a.j)}\n  Java ${shape(b.j)}`);
    if (FIX[k] && a.j && b.j) { let x, y; try { x = JSON.stringify(FIX[k](a.j)); y = JSON.stringify(FIX[k](b.j)); } catch (e) { x = 'err:' + e.message; y = ''; } ok(x === y, `${k}: 값 ${x} ≠ ${y}`); }
  }
  /* Node 자체 기대값(Java가 따라야 할 규격) */
  ok(ra.get0.j.mode === 'demo' && ra.get0.j.st === '미연결', 'Node 기준: 키 없음 → demo · 미연결');
  ok(/#conn=teams:err-unset$/.test(ra.consent.loc) && /#oauth=err:unset$/.test(ra.opStart.loc), 'Node 기준: 키 없음 리다이렉트');
  ok(ra.chDemo.st === 201 && ra.mt.st === 201, 'Node 기준: 만들기 201');
  ok(ra.sso.j.error === 'teams_unset' && ra.learner.j.error === 'teams_phase2', 'Node 기준: SSO 503 · 학습자 알림 501');
  console.log(`contract-teams: ${pass} 통과 · ${fail} 실패`); errs.forEach(e => console.log(' ✗', e)); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
