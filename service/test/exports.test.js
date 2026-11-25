'use strict';
/* 가디언 4차(d5) 남은 내려받기 통제 — LMS 설문 내보내기(k/export) · 신청자(q/applicants/export) · 설문 일괄(q/survey/results) · 출석부(g/export) · 마일리지 지급 내역 메일(payouts/send)
   규칙은 d3 /api/fac/export · /api/ledger/export와 같다: reason 없으면 400 export_reason, raw=1은 정운영자만(아니면 403 export_raw), 학번 기본 끝 4자리, audit 'export' {kind, n, raw, reason}
   DATABASE_URL=… node --test service/test/exports.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const { mask } = require('../server/records');
const lib = require('../../service-egov/test/lms-k.js');

test('가디언 4차 d5 남은 내려받기 통제', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const env = { COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', PII_KEY: crypto.randomBytes(32).toString('hex'), MFA_OFF: '1' };
  const app = createApp({ pool, env, log: {} }); await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const O = await lib.org(U, process.env.DATABASE_URL, 'x'); const ow = { cookie: O.ck.owner }, su = { cookie: O.ck.sub }, te = { cookie: O.ck.teacher };
  const C = (m, p, o) => lib.call(U, m, p, o); const R = encodeURIComponent('학사 점검');
  const auditOf = async () => { const c = await pool.connect(); try { await c.query('begin'); await c.query("select set_config('app.tenant', $1, true)", [O.tid]); const r = await c.query("select detail from audit_log where tenant_id = $1 and action = 'export' order by id", [O.tid]); await c.query('commit'); return r.rows.map(x => x.detail); } finally { c.release(); } };
  let sid;

  await t.test('가림 규칙(Node mask = SQL lms_k_mask)', async () => {
    for (const v of ['20261001', '1234', '12', 'A2026-77']) assert.equal((await pool.query('select lms_k_mask($1) m', [v])).rows[0].m, mask(v));
    assert.equal(mask('20261001'), '****1001');
  });
  await t.test('설문 내보내기(k/export)', async () => {
    const s = await C('POST', '/api/lms/k/survey/save', { ...ow, body: { title: '내려받기 점검', anonymous: false, scope: 'univ', kind: 'general', target: { kinds: ['student'] }, questions: [{ type: 'likert5', text: '만족' }] } }); assert.equal(s.st, 200, JSON.stringify(s.j)); sid = s.j.survey_id;
    assert.equal((await C('POST', '/api/lms/k/survey/open', { ...ow, body: { survey_id: sid } })).st, 200);
    const qid = s.j.questions[0].qid; assert.equal((await C('POST', '/api/lms/k/respond', { ...ow, body: { survey_id: sid, member_no: '20261001', answers: { [qid]: 4 } } })).st, 200);
    const n0 = await C('GET', '/api/lms/k/export?survey_id=' + sid, ow); assert.equal(n0.st, 400); assert.equal(n0.j.error, 'export_reason'); assert.equal(n0.j.message, '개인정보가 포함된 파일을 내려받으려면 사유를 입력하십시오.');
    const r1 = await C('GET', `/api/lms/k/export?survey_id=${sid}&reason=${R}&raw=1`, te); assert.equal(r1.st, 403); assert.equal(r1.j.error, 'export_raw'); assert.equal(r1.j.message, '원본(가리지 않은) 내려받기는 정운영자만 할 수 있습니다.');
    const m = await C('GET', `/api/lms/k/export?survey_id=${sid}&reason=${R}`, te); assert.equal(m.st, 200); assert.match(m.j.content, /\*\*\*\*1001/); assert.doesNotMatch(m.j.content, /20261001/); assert.equal(m.j.n, 1);
    const raw = await C('GET', `/api/lms/k/export?survey_id=${sid}&reason=${R}&raw=1`, ow); assert.equal(raw.st, 200); assert.match(raw.j.content, /20261001/);
    assert.deepEqual(await auditOf(), [{ kind: 'lms_k_survey', n: 1, raw: false, reason: '학사 점검' }, { kind: 'lms_k_survey', n: 1, raw: true, reason: '학사 점검' }]);
  });
  await t.test('신청자 · 설문 일괄(q) — 사유 · 원본 권한', async () => {
    assert.equal((await C('GET', '/api/lms/q/applicants/export?program_id=' + crypto.randomUUID(), su)).j.error, 'export_reason');
    assert.equal((await C('GET', `/api/lms/q/applicants/export?program_id=${crypto.randomUUID()}&reason=${R}&raw=1`, su)).j.error, 'export_raw');
    assert.equal((await C('GET', '/api/lms/q/survey/results?program_id=' + crypto.randomUUID(), su)).j.error, 'export_reason');
  });
  await t.test('출석부(g/export)', async () => {
    const n0 = await C('GET', '/api/lms/g/export?section_id=' + O.sec, ow); assert.equal(n0.st, 400); assert.equal(n0.j.error, 'export_reason');
    assert.equal((await C('GET', `/api/lms/g/export?section_id=${O.sec}&reason=${R}&raw=1`, su)).j.error, 'export_raw');
    const m = await C('GET', `/api/lms/g/export?section_id=${O.sec}&reason=${R}`, su); assert.equal(m.st, 200, JSON.stringify(m.j)); const i = m.j.columns.indexOf('학번'); assert.equal(i, 0);
    assert.ok(m.j.rows.length >= 1); for (const r of m.j.rows) assert.match(r[i], /^\*{4}\d{4}$/);
    const raw = await C('GET', `/api/lms/g/export?section_id=${O.sec}&reason=${R}&raw=1`, ow); assert.ok(raw.j.rows.some(r => r[0] === '20261001'));
    const a = (await auditOf()).filter(x => x.kind === 'lms_g_attendance'); assert.deepEqual(a, [{ kind: 'lms_g_attendance', n: m.j.rows.length, raw: false, reason: '학사 점검' }, { kind: 'lms_g_attendance', n: m.j.rows.length, raw: true, reason: '학사 점검' }]);
  });
  await t.test('마일리지 지급 내역 메일(payouts/send) — 본문 사유', async () => {
    const n0 = await C('POST', '/api/mileage/shop/payouts/send', { ...ow, body: { ym: '2026-11', to: 'pay@example.com' } }); assert.equal(n0.st, 400); assert.equal(n0.j.error, 'export_reason');
    assert.equal((await C('POST', '/api/mileage/shop/payouts/send', { ...su, body: { ym: '2026-11', to: 'pay@example.com', reason: '급여 정산' } })).st, 403);
  });
  await t.test('화면 CSV 기록(POST /api/export/log, d6)', async () => {
    const L = (o, body) => C('POST', '/api/export/log', { ...o, body });
    const n0 = await L(ow, { kind: 'lms_a_roster', n: 3 }); assert.equal(n0.st, 400); assert.equal(n0.j.error, 'export_reason'); assert.equal(n0.j.message, '개인정보가 포함된 파일을 내려받으려면 사유를 입력하십시오.');
    assert.equal((await L(ow, { kind: 'lms_a_roster', n: 3, reason: ' ' })).j.error, 'export_reason');
    const r1 = await L(su, { kind: 'lms_a_roster', n: 3, reason: '학사 점검', raw: true }); assert.equal(r1.st, 403); assert.equal(r1.j.error, 'export_raw'); assert.equal(r1.j.message, '원본(가리지 않은) 내려받기는 정운영자만 할 수 있습니다.');
    assert.equal((await L(te, { kind: 'lms_a_roster', n: 3, reason: '학사 점검', raw: true })).st, 403);
    const k0 = await L(ow, { kind: '<x>', n: 1, reason: '학사 점검' }); assert.equal(k0.st, 400); assert.equal(k0.j.error, 'export_kind');
    const m = await L(te, { kind: 'mods_grades', n: 7, reason: '학사 점검' }); assert.equal(m.st, 200); assert.deepEqual(m.j, { ok: true, raw: false });
    const r = await L(ow, { kind: 'milrw_payout', n: '2', reason: '급여 정산', raw: true }); assert.equal(r.st, 200); assert.deepEqual(r.j, { ok: true, raw: true });
    assert.equal((await C('POST', '/api/export/log', { body: { kind: 'x', n: 1, reason: '학사 점검' } })).st, 401);
    const a = (await auditOf()).filter(x => x.via === 'client'); assert.deepEqual(a, [{ kind: 'mods_grades', n: 7, raw: false, reason: '학사 점검', via: 'client' }, { kind: 'milrw_payout', n: 2, raw: true, reason: '급여 정산', via: 'client' }]);
  });
  await new Promise(ok => app.close(ok)); await pool.end();
});
