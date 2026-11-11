'use strict';
/* v38 학사 LMS 화면 칩(운영 서버 모드) 응답 키 대조 — 칩 답(scn-univ-lms.js ULV)이 읽는 키가 실제 /api/lms/* 응답에 있는지 Node 서버로 한 번씩 호출해 확인한다.
   (Java 전자정부 서버는 같은 SQL을 쓴다 — 묶음별 대조 테스트(service-egov/test/lms-*.js)의 sqlParity가 Node mod-*.js ↔ lms_*.xml SQL 동일성을 지킨다)
   DATABASE_URL=postgres://… node --test service/test/lms-chip38.test.js */
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE || '0'; /* 학습자 쿠키 이름 dd_lsid */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');
const keys = o => o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o).sort().join(',') : Array.isArray(o) ? `array(${o.length})${o[0] && typeof o[0] === 'object' ? '[' + Object.keys(o[0]).sort().join(',') + ']' : ''}` : String(o);

test('학사 LMS 화면 칩 — 운영 조회 응답 키', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP: 'on' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  try {
  const call = async (m, p, body, ck) => { const h = { 'x-didisam': '1' }; if (ck) h.cookie = ck; if (body) h['content-type'] = 'application/json'; const r = await fetch(U + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); const tx = await r.text(); let j = null; try { j = JSON.parse(tx); } catch { } return { st: r.status, j, ck: (r.headers.get('set-cookie') || '').split(';')[0] }; };
  const su = await call('POST', '/api/signup', { email: `chip38_${Date.now()}@example.com`, password: 'Chip38test2026x', orgName: '칩 대조 대학', type: 'univ' }); const ck = su.ck; assert.equal(su.st, 200, JSON.stringify(su.j));
  await call('PUT', '/api/state', { doc: { org: { name: '칩 대조 대학', type: 'univ', ed: 'lms', room: { mode: 'saas' } }, classes: [] }, rev: 0 }, ck);
  const G = async p => { const r = await call('GET', p, null, ck); return r; };
  /* 최소 학사 데이터: 학기 · 학과 · 교과목 · 분반 · 학생 · 수강 */
  const y = new Date().getFullYear(); const term = `${y}-2`;
  await call('POST', '/api/lms/a/term', { term_id: term, name: `${y}학년도 2학기`, starts_on: `${y}-09-01`, ends_on: `${y}-12-20`, is_operating: true }, ck);
  await call('POST', '/api/lms/a/unit', { unit_code: 'CSE', name: '컴퓨터공학과', kind: 'dept' }, ck);
  await call('POST', '/api/lms/a/course', { course_code: 'CHP1001', name: '칩 교과목', credits: 3, unit_code: 'CSE' }, ck);
  const sec = await call('POST', '/api/lms/a/section', { term_id: term, course_code: 'CHP1001', section_no: '01', mode: 'blended' }, ck);
  await call('POST', '/api/lms/a/import', { kind: 'person', csv: '학번,구분,학과코드\n20268801,학생,CSE\n', apply: true }, ck);
  if (sec.j && sec.j.section_id) await call('POST', '/api/lms/a/enroll', { section_id: sec.j.section_id, member_nos: ['20268801'] }, ck);
  const R = {}; const sid = sec.j && sec.j.section_id;
  R.a = await G('/api/lms/a/overview');
  R.b = await G('/api/lms/b/sections'); const room = R.b.j && (R.b.j.sections || [])[0];
  R.c = room ? await G('/api/lms/c/forums?section=' + room.id) : { st: 0, j: null };
  R.d = room ? await G('/api/lms/d/boards?section=' + room.id) : { st: 0, j: null };
  R.e = await G('/api/lms/e/sections'); const es = R.e.j && (R.e.j.sections || [])[0];
  if (es) R.esave = await call('POST', '/api/lms/e/save', { section_id: es.section_id, title: '칩 과제', status: 'published', due_at: new Date(Date.now() + 864e5).toISOString() }, ck);
  R.el = es ? await G('/api/lms/e/list?section=' + es.section_id) : { st: 0, j: null };
  R.h = es ? await G('/api/lms/h/board?section=' + es.section_id) : { st: 0, j: null };
  R.g = await G('/api/lms/g/sections'); const gs = Array.isArray(R.g.j) ? R.g.j[0] : R.g.j && (R.g.j.sections || [])[0];
  R.gs = gs ? await G('/api/lms/g/sessions?section_id=' + gs.section_id) : { st: 0, j: null };
  R.i = gs ? await G('/api/lms/i/progress?section_id=' + gs.section_id) : { st: 0, j: null };
  R.j = gs ? await G('/api/lms/j/risk?section_id=' + gs.section_id) : { st: 0, j: null };
  R.lc = await G('/api/lms/l/cal/list'); R.ln = await G('/api/lms/l/noti/rules'); R.m = await G('/api/lms/m/users/list');
  R.od = await G('/api/lms/o/rag/docs'); R.of = await G('/api/lms/o/qa/faq');
  if (process.env.CHIP_DUMP) console.log(Object.entries(R).map(([k, v]) => `${k} ${v.st} ${keys(v.j)}`).join('\n'));
  /* 칩 답이 읽는 키(scn-univ-lms.js ULV) — 화면별 */
  const has = (o, k, why) => { assert.ok(o && typeof o === 'object' && k in o, `${why}: 응답에 「${k}」 없음 (${keys(o)})`); };
  const each = (L, ks, why) => { assert.ok(Array.isArray(L), `${why}: 배열 아님`); if (L.length) ks.forEach(k => has(L[0], k, why + ' 항목')); };
  for (const [k, v] of Object.entries(R)) assert.equal(v.st, 200, `${k} 상태 ${v.st} ${JSON.stringify(v.j).slice(0, 200)}`);
  has(R.a.j, 'runs', '학적 연동(sis) /a/overview'); has(R.a.j, 'units', '학과(groups) /a/overview'); each(R.a.j.units, ['kind', 'unit_code'], 'units');
  has(R.b.j, 'sections', '강의실(lmsb) /b/sections'); each(R.b.j.sections, ['id', 'resources'], '강의실 sections');
  has(R.c.j, 'forums', '학습활동(lmsc) /c/forums'); has(R.d.j, 'boards', '게시판(lmsd) /d/boards'); each(R.d.j.boards, ['posts', 'open'], '게시판 boards');
  has(R.e.j, 'sections', '과제(lmse) /e/sections'); each(R.e.j.sections, ['section_id'], '과제 sections'); has(R.el.j, 'assignments', '과제 /e/list');
  assert.ok(R.el.j.assignments.length >= 1, '과제 하나를 만들었는데 목록이 비었음'); each(R.el.j.assignments, ['status', 'due_at', 'targets', 'submitted', 'title'], '과제 assignments');
  has(R.h.j, 'items', '성적(grade) /h/board');
  assert.ok(Array.isArray(R.g.j), '출결(lmsg) /g/sections는 배열'); each(R.g.j, ['section_id'], '출결 sections'); assert.ok(Array.isArray(R.gs.j), '출결 /g/sessions는 배열'); each(R.gs.j, ['starts_at'], '출결 sessions');
  has(R.i.j, 'contents', '진도(lmsi) /i/progress'); has(R.i.j, 'students', '진도 /i/progress'); each(R.i.j.students, ['member_no', 'avg_pct'], '진도 students');
  has(R.j.j, 'summary', '학습 분석(lmsj) /j/risk'); ['danger', 'warn'].forEach(k => has(R.j.j.summary, k, '학습 분석 summary'));
  has(R.lc.j, 'items', '통합 달력(lmsl-cal) /l/cal/list'); each(R.lc.j.items, ['scope', 'starts_at'], '달력 items');
  has(R.ln.j, 'items', '알림 규칙(lmsl-noti) /l/noti/rules'); each(R.ln.j.items, ['enabled'], '알림 규칙 items');
  has(R.m.j, 'total', '시스템 관리(lmsm) /m/users/list'); has(R.od.j, 'docs', 'AI 학습 지원(lmso) /o/rag/docs'); has(R.of.j, 'faq', 'AI 학습 지원 /o/qa/faq');
  /* 3차: 학습자 세션으로 통합 달력 학사 일정 조회 — 학사만, 운영자 '개인' 일정(시험 출제 메모 등)은 제목과 상관없이 안 보임. JAVA_URL을 주면 Java 서버도 같은 결과인지 대조 */
  const crypto = require('node:crypto'); const tid = (await G('/api/me')).j.tenant.tid; const hh = x => crypto.createHash('sha256').update(x).digest('hex');
  const at = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 16);
  const add1 = await call('POST', '/api/lms/l/cal/add', { scope: 'academic', title: '중간고사(학사)', kind: 'exam', starts_at: at(3), all_day: true }, ck); assert.equal(add1.st, 200, JSON.stringify(add1.j));
  const add2 = await call('POST', '/api/lms/l/cal/add', { scope: 'personal', title: '기말고사 문제 출제', kind: 'exam', starts_at: at(4) }, ck); assert.equal(add2.st, 200, JSON.stringify(add2.j));
  const lt = crypto.randomBytes(32).toString('base64url'); await pool.query("insert into learner_sessions (id, tenant_id, sid, expires_at) values ($1, $2, $3, now() + interval '1 hour')", [hh(lt), tid, '20268801']);
  const qp = `/api/lms/l/cal/list?scope=academic&from=${encodeURIComponent(new Date(Date.now() - 864e5).toISOString())}&to=${encodeURIComponent(new Date(Date.now() + 60 * 864e5).toISOString())}`;
  const shape = j => ((j && j.items) || []).filter(e => e.src !== 'term').map(e => `${e.scope}|${e.kind}|${e.title}`).sort();
  for (const [name, base] of [['Node', U], ...(process.env.JAVA_URL ? [['Java', process.env.JAVA_URL]] : [])]) {
    const r = await fetch(base + qp, { headers: { cookie: 'dd_lsid=' + lt } }); const j = await r.json().catch(() => null);
    assert.equal(r.status, 200, `${name} 학습자 학사 일정 조회 ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    assert.deepEqual(shape(j), ['academic|exam|중간고사(학사)'], `${name}: 학사 일정만(개인 「기말고사 문제 출제」 제외) ${JSON.stringify(shape(j))}`); }
  const own = await G(qp.replace('scope=academic', 'scope=personal')); assert.ok(shape(own.j).some(x => /기말고사 문제 출제/.test(x)), '운영자 본인에게는 개인 일정이 보임');
  } finally { await new Promise(ok => app.close(ok)); await pool.end(); }
});
