'use strict';
/* 가디언 5차 F8 사고 대응 /api/security/incidents — 권한(산타 관리자) · 등록(72시간 기한) · 단계 타임라인 · 결정은 사람만(가디언 토큰 403 human_only) · 신고 · 통지 초안(제34조 항목, 개인정보 · 비밀값 가림) · 긴급 차단 발동 시 자동 생성
   사용: DATABASE_URL=… node --test service/test/incident.test.js. 시험 DB 전용: 오늘 kill_switch 기록을 지운다 */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const S = require('../server/security');

test('초안 단위: 제34조 항목 · 가림 · 합니다체', () => {
  const D = S.incidentDraft({ type: 'pii_leak', scope: { tenants: ['tn_aaaaaaaa'], data: '이름 · 이메일(hong@ex.com) · 010-1234-5678', period: '2026-11-20 ~ 2026-11-24' }, phases: ['detect', 'contain'], createdKst: '2026-11-25 10:00', dueKst: '2026-11-28 10:00' });
  for (const k of ['유출된 개인정보 항목', '유출된 시점과 그 경위', '피해를 최소화', '대응 조치', '피해 구제 절차', '연락처']) assert.ok(D.notify.includes(k), k);
  assert.ok(!/hong@ex\.com|010-1234/.test(D.notify + D.report)); assert.ok(D.notify.includes('[가림]')); assert.ok(D.notify.includes('2026-11-20 ~ 2026-11-24'));
  assert.ok(D.notify.includes('탐지 · 격리 단계를 진행했습니다.')); assert.ok(D.report.includes('2026-11-28 10:00 KST(사고 인지 후 72시간)')); assert.ok(D.report.includes('기관 1곳'));
  assert.ok(/대표님 · 부대표/.test(D.notify) && !/개발 총괄/.test(D.notify + D.report)); assert.equal(D.items.length, 7);
  assert.equal(S.scrub('키 sk-ant-abcdefghijk · ' + 'A'.repeat(40)), '키 [가림] · [가림]');
});

test('사고 대응 API', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  await pool.query("delete from security.kill_switch where kday = ((now() at time zone 'Asia/Seoul')::date)");
  const sfx = Date.now().toString(36); const Z1 = `iz1${sfx}@santa.kr`; const TOK = 'i'.repeat(40);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', SANTA_ADMIN_EMAILS: Z1, GUARD_TOKEN: TOK }, log: {} });
  await new Promise(ok => app.listen(0, '127.0.0.1', ok)); t.after(async () => { app.close(); await pool.end(); });
  const jar = {}; const call = async (who, method, path, body, hd = {}) => {
    const r = await fetch(`http://127.0.0.1:${app.address().port}` + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}), ...hd }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const G = { authorization: 'Bearer ' + TOK };
  const su = (who, email, pw) => call(who, 'POST', '/api/signup', { email, password: pw, orgName: who + sfx, type: 'univ', code: 'C0DE' });
  const A = (await su('A', `ia${sfx}@a.kr`, 'Passw0rd-aaa')).j.tenant; await su('Z', Z1, 'Passw0rd-z1z');
  let inc;

  await t.test('권한: 비로그인 401 · 일반 owner 403 santa · 잘못된 토큰 403', async () => {
    assert.equal((await call('X', 'GET', '/api/security/incidents')).status, 401);
    assert.equal((await call('A', 'GET', '/api/security/incidents')).j.error, 'santa');
    assert.equal((await call('A', 'POST', '/api/security/incidents', { type: 'other', title: 'x' })).j.error, 'santa');
    assert.equal((await call('X', 'POST', '/api/security/incidents', { type: 'other', title: 'x' }, { authorization: 'Bearer ' + 'x'.repeat(40) })).j.error, 'guard');
  });
  await t.test('등록: 검증 · 72시간 기한 · 탐지 단계', async () => {
    assert.equal((await call('Z', 'POST', '/api/security/incidents', { type: 'nuke', title: 'x' })).j.error, 'type');
    assert.equal((await call('Z', 'POST', '/api/security/incidents', { type: 'other', title: ' ' })).j.error, 'title');
    assert.equal((await call('Z', 'POST', '/api/security/incidents', { type: 'other', title: 'x', severity: 'huge' })).j.error, 'sev');
    const r = await call('Z', 'POST', '/api/security/incidents', { type: 'pii_leak', title: '학습자 명단 노출 의심', severity: 'critical', scope: { tenants: [A.tid, 'bad', A.tid], data: '이름 · 이메일', period: '11-24 02시~03시' } });
    assert.equal(r.status, 200, JSON.stringify(r.j)); inc = r.j.incident;
    assert.match(inc.id, /^inc_[0-9a-f]{16}$/); assert.equal(inc.phase, 'detect'); assert.equal(inc.status, 'open'); assert.equal(inc.severity, 'critical');
    assert.deepEqual(inc.scope, { tenants: [A.tid], data: '이름 · 이메일', period: '11-24 02시~03시' });
    assert.equal(Math.round((new Date(inc.notifyDueAt) - new Date(inc.createdAt)) / 3600e3), 72); assert.ok(inc.leftMin > 71 * 60 && inc.leftMin <= 72 * 60);
    assert.equal(inc.timeline.length, 1); assert.equal(inc.timeline[0].by, Z1); assert.equal(inc.notified, false); assert.deepEqual(inc.decisions, []);
    const g = await call('X', 'POST', '/api/security/incidents', { type: 'llmjacking', title: '가디언 탐지' }, G); assert.equal(g.status, 200); assert.equal(g.j.incident.createdBy, 'agent:guardian'); assert.equal(g.j.incident.severity, 'high');
  });
  await t.test('단계: 타임라인 추가 · 재발 방지면 종결 · 가디언도 기록', async () => {
    assert.equal((await call('Z', 'POST', `/api/security/incidents/${inc.id}/step`, { phase: 'zz' })).j.error, 'phase');
    assert.equal((await call('Z', 'POST', '/api/security/incidents/inc_0000000000000000/step', { phase: 'contain' })).status, 404);
    const r = await call('Z', 'POST', `/api/security/incidents/${inc.id}/step`, { phase: 'contain', note: '세션 만료 · 공유 링크 회수' }); assert.equal(r.j.incident.phase, 'contain'); assert.equal(r.j.incident.timeline.length, 2);
    const g = await call('X', 'POST', `/api/security/incidents/${inc.id}/step`, { phase: 'recover', note: '규칙 재가동' }, G); assert.equal(g.status, 200); assert.equal(g.j.incident.timeline[2].by, 'agent:guardian');
  });
  await t.test('결정: 사람만(토큰 403 human_only) · 값 검증 · 기록', async () => {
    const g = await call('X', 'POST', `/api/security/incidents/${inc.id}/decision`, { kind: 'notify', decided: true }, G); assert.equal(g.status, 403); assert.equal(g.j.error, 'human_only');
    assert.equal((await call('A', 'POST', `/api/security/incidents/${inc.id}/decision`, { kind: 'notify', decided: true })).j.error, 'santa');
    assert.equal((await call('Z', 'POST', `/api/security/incidents/${inc.id}/decision`, { kind: 'x', decided: true })).j.error, 'kind');
    assert.equal((await call('Z', 'POST', `/api/security/incidents/${inc.id}/decision`, { kind: 'notify', decided: 'yes' })).j.error, 'decided');
    const r = await call('Z', 'POST', `/api/security/incidents/${inc.id}/decision`, { kind: 'notify', decided: true, note: '대표님 · 부대표 결정' });
    assert.equal(r.status, 200); assert.equal(r.j.incident.notified, true); assert.deepEqual(Object.keys(r.j.incident.decisions[0]).sort(), ['at', 'by', 'decided', 'kind', 'note']);
    await call('Z', 'POST', `/api/security/incidents/${inc.id}/decision`, { kind: 'shutdown', decided: false });
    const l = await call('Z', 'GET', '/api/security/incidents'); const x = l.j.rows.find(y => y.id === inc.id); assert.equal(x.decisions.length, 2); assert.equal(l.j.notifyHours, 72); assert.deepEqual(l.j.phases, S.PHASES);
  });
  await t.test('초안: 제34조 항목 · 기록된 단계 · 비밀값 없음', async () => {
    const r = await call('Z', 'GET', `/api/security/incidents/${inc.id}/draft`); assert.equal(r.status, 200);
    assert.ok(r.j.notify.includes('이름 · 이메일') && r.j.notify.includes('탐지 · 격리 · 복구 단계를 진행했습니다.')); assert.ok(r.j.report.includes('기관 1곳')); assert.ok(!r.j.notify.includes(Z1) && !r.j.report.includes(TOK));
    assert.equal(r.j.law, '개인정보 보호법 제34조'); assert.equal((await call('A', 'GET', `/api/security/incidents/${inc.id}/draft`)).j.error, 'santa');
    assert.equal((await call('Z', 'GET', '/api/security/incidents/inc_0000000000000000/draft')).status, 404);
  });
  await t.test('긴급 차단 발동 → 사고 자동 생성(탐지 → 격리) · 감사 체인', async () => {
    const k = await call('X', 'POST', '/api/security/kill', { action: 'key_disable', tenant: A.tid, reason: '운영 키 노출 규칙', ruleId: 'R-key' }, G);
    assert.equal(k.status, 200, JSON.stringify(k.j)); assert.match(k.j.incident, /^inc_/);
    const l = await call('Z', 'GET', '/api/security/incidents'); const x = l.j.rows.find(y => y.id === k.j.incident);
    assert.equal(x.killId, k.j.kill.id); assert.equal(x.type, 'key_leak'); assert.equal(x.phase, 'contain'); assert.deepEqual(x.scope.tenants, [A.tid]); assert.ok(/dry-run/.test(x.timeline[1].note));
    const a = await call('Z', 'GET', '/api/security/audit'); assert.equal(a.j.ok, true); assert.ok(a.j.rows.some(r => r.action === 'incident.create' && r.target === k.j.incident));
    await pool.query("delete from security.kill_switch where kday = ((now() at time zone 'Asia/Seoul')::date)");
  });
});
