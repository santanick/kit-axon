'use strict';
/* v16 외부 AI 연결(MCP) · API 키 테스트 — 발급(정운영자) · 평문 1회 · 읽기/쓰기 권한 · 폐기 · 기관 격리 · 개인정보 제외 · 쓰기 반영 · 감사 기록 */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');

test('MCP · API 키', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  let rid = 0; const rpc = async (key, method, params) => { const r = await fetch(U + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(key ? { authorization: 'Bearer ' + key } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rid, method, params }) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const tool = async (key, name, args) => (await rpc(key, 'tools/call', { name, arguments: args || {} })).j.result;
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `ma${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: '부산시 인재개발원', type: 'public', code: 'C0DE' })).j.tenant;
  const B = (await call('B', 'POST', '/api/signup', { email: `mb${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: 'B대학', type: 'univ', code: 'C0DE' })).j.tenant;
  assert.ok(A && A.tid, '공공기관 유형 가입');
  const doc = { org: { name: '부산시 인재개발원', type: 'public', room: { mode: 'saas' } }, groups: [{ id: 'g0', name: '기획조정실' }],
    members: [{ id: 'm1', sid: 'P0001', name: '김비밀', email: 'secret@x.kr', phone: '010-0000-1111', group: 'g0', grade: '정회원', last: '2026-11-01' }],
    classes: [{ id: 'c0', name: '4대 폭력예방 통합교육', status: '운영중', legal: true, learners: ['m1'], prog: { m1: { p: 40, assign: 'submitted', exam: 70 } }, criteria: { threshold: 100 }, curriculum: [{ id: 'i1', type: 'video', title: '1차시' }], notices: [] }],
    tq: [{ id: 'q1', sid: 'P0001', q: '이수 기준이 어떻게 되나요?', cls: '4대 폭력예방 통합교육', st: 'open' }], codes: [{ sid: 'P0001', dept: '기획조정실', code: 'SECRET77' }] };
  assert.equal((await call('A', 'PUT', '/api/state', { doc, rev: 0 })).status, 200);
  await call('B', 'PUT', '/api/state', { doc: { org: { name: 'B대학', type: 'univ' }, members: [{ id: 'x', sid: '20260001' }], classes: [{ id: 'b0', name: 'B과정', learners: [] }] }, rev: 0 });

  let RK, WK, rkId;
  await t.test('키 발급: 이름 필수 · 평문은 발급 응답에만 · 목록엔 앞자리만', async () => {
    assert.equal((await call('A', 'POST', '/api/keys', { name: '' })).status, 400);
    const r = await call('A', 'POST', '/api/keys', { name: 'Claude 데스크톱', scope: 'read' }); assert.equal(r.status, 200); RK = r.j.key; rkId = r.j.id;
    assert.match(RK, /^dds_[A-Za-z0-9_-]{40}$/); assert.equal(r.j.scope, 'read');
    WK = (await call('A', 'POST', '/api/keys', { name: '운영 자동화', scope: 'write' })).j.key;
    const L = await call('A', 'GET', '/api/keys'); assert.equal(L.j.keys.length, 2); assert.ok(!JSON.stringify(L.j).includes(RK)); assert.equal(L.j.keys[0].prefix.length, 12);
    assert.equal((await call('X', 'GET', '/api/keys')).status, 401);
  });
  await t.test('키 없음 · 잘못된 키 · GET은 거부', async () => {
    assert.equal((await rpc('', 'tools/list')).status, 401);
    assert.equal((await rpc('dds_' + 'a'.repeat(40), 'tools/list')).status, 401);
    assert.equal((await fetch(U + '/mcp', { headers: { authorization: 'Bearer ' + RK } })).status, 405);
  });
  await t.test('initialize · 알림 · tools/list(읽기 키는 읽기 도구만)', async () => {
    const i = await rpc(RK, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    assert.equal(i.j.result.protocolVersion, '2025-06-18'); assert.equal(i.j.result.serverInfo.name, 'didisam-studio'); assert.match(i.j.result.instructions, /읽기 전용/);
    const n = await fetch(U + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + RK }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) }); assert.equal(n.status, 202);
    const names = (await rpc(RK, 'tools/list')).j.result.tools.map(x => x.name); assert.ok(names.includes('get_overview')); assert.ok(!names.includes('answer_question'));
    const wn = (await rpc(WK, 'tools/list')).j.result.tools.map(x => x.name); assert.ok(wn.includes('answer_question') && wn.includes('post_notice') && wn.includes('create_course_draft'));
  });
  await t.test('읽기 도구: 요약 · 과정 · 학습자(개인정보 제외) · 진도 · 질문', async () => {
    const o = (await tool(RK, 'get_overview')).structuredContent; assert.equal(o.learners, 1); assert.equal(o.pending_grading, 1); assert.equal(o.open_questions, 1); assert.equal(o.legal_incomplete, 1); assert.equal(o.type, 'public');
    const ls = await tool(RK, 'list_learners'); const s = JSON.stringify(ls);
    assert.equal(ls.structuredContent.learners[0].id, 'P0001'); assert.equal(ls.structuredContent.learners[0].group, '기획조정실');
    assert.ok(!s.includes('김비밀') && !s.includes('secret@x.kr') && !s.includes('010-0000-1111') && !s.includes('SECRET77'));
    assert.equal((await tool(RK, 'get_learner_progress', { learner_id: 'P0001' })).structuredContent.courses[0].progress, 40);
    assert.equal((await tool(RK, 'get_course', { course_id: 'c0' })).structuredContent.curriculum.length, 1);
    assert.equal((await tool(RK, 'get_course', { course_id: 'nope' })).isError, true);
    assert.equal((await tool(RK, 'list_questions')).structuredContent.questions[0].id, 'q1');
  });
  await t.test('읽기 키로 쓰기 거부 · 쓰기 키로 답변 · 공지 · 과정 초안 반영 + 감사 기록', async () => {
    const d = await tool(RK, 'answer_question', { question_id: 'q1', answer: 'x' }); assert.equal(d.isError, true); assert.match(d.content[0].text, /읽기 전용/);
    assert.equal((await tool(WK, 'answer_question', { question_id: 'q1', answer: '100% 수강하면 이수됩니다.' })).isError, false);
    assert.equal((await tool(WK, 'post_notice', { title: '12월 법정교육 마감 안내', course_id: 'c0' })).isError, false);
    const cd = (await tool(WK, 'create_course_draft', { name: '생성형 AI 행정 활용', weeks: ['AI 이해', '문서 작성'] })).structuredContent; assert.equal(cd.status, '준비중');
    const st = await call('A', 'GET', '/api/state'); const D = st.j.doc;
    assert.equal(D.tq[0].st, 'answered'); assert.match(D.tq[0].a, /100%/); assert.equal(D.classes[0].notices[0].title, '12월 법정교육 마감 안내');
    assert.equal(D.classes.find(c => c.id === cd.course_id).curriculum.length, 2); assert.ok(st.j.rev >= 4);
    const au = await call('A', 'GET', '/api/audit'); assert.ok(au.j.rows.some(r => r.action === 'mcp.answer_question' && /mcp:운영 자동화/.test(r.actor)));
  });
  await t.test('기관 격리: A 키로 B 데이터가 보이지 않음', async () => {
    const c = (await tool(RK, 'list_courses')).structuredContent.courses; assert.ok(c.every(x => x.id !== 'b0'));
  });
  await t.test('폐기하면 즉시 401 · 다른 기관은 폐기 불가', async () => {
    assert.equal((await call('B', 'POST', '/api/keys/revoke', { id: rkId })).status, 404);
    assert.equal((await call('A', 'POST', '/api/keys/revoke', { id: rkId })).status, 200);
    assert.equal((await rpc(RK, 'tools/list')).status, 401);
    assert.ok((await call('A', 'GET', '/api/keys')).j.keys.find(k => k.id === rkId).revoked_at);
  });
  await t.test('데이터룸 정책에서 MCP를 끄면 도구 호출 거부', async () => {
    const st = await call('A', 'GET', '/api/state'); const D = st.j.doc; D.org.room = { ...(D.org.room || {}), egress: { mcp: false } };
    assert.equal((await call('A', 'PUT', '/api/state', { doc: D, rev: st.j.rev })).status, 200);
    const r = await tool(WK, 'get_overview'); assert.equal(r.isError, true); assert.match(r.content[0].text, /MCP/);
  });
  await pool.query('delete from tenants where id = any($1)', [[A.tid, B.tid]]);
  app.close(); await pool.end();
});
