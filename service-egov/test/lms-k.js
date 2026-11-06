'use strict';
/* 묶음 K(설문) 대조 테스트 — Node(A)와 Java(B)에 같은 시나리오를 돌려 상태코드 · 본문(아이디 · 시각 정규화)이 같은지 본다.
   사용: node test/lms-k.js http://127.0.0.1:8231 http://127.0.0.1:8232 [postgres://didisam@127.0.0.1:5544/ddw4]
   B를 생략하면 A 하나로 시나리오 기대값만 검사한다. 이 파일의 lib는 lms-q.js · lms-n.js도 쓴다. */
const path = require('node:path');
const PGDIR = [path.join(__dirname, '../../service/server/node_modules/pg'), 'pg'];
const lib = {
  pass: 0, fail: 0, errs: [],
  ok(c, m) { if (c) lib.pass++; else { lib.fail++; lib.errs.push(m); } },
  async call(base, method, p, { body, cookie, csrf = true } = {}) {
    const h = {}; if (csrf && method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (body !== undefined) h['content-type'] = 'application/json';
    const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
    const sc = r.headers.get('set-cookie'); return { st: r.status, j, ck: sc ? sc.split(';')[0] : null };
  },
  pg() { for (const d of PGDIR) { try { return require(d); } catch { } } throw new Error('pg 모듈 없음'); },
  /* 기관 하나 + 정운영자 · 부운영자 · 교수자 세션, 학사 구성원 시드 */
  async org(base, dbUrl, tag) {
    /* 기관 · 계정 · 세션을 DB에 바로 만든다(가입 API는 IP당 시간 10회 제한 — 통합 회귀에서 429가 나므로 쓰지 않는다) */
    const crypto = require('node:crypto'); const sfx = crypto.randomBytes(5).toString('hex');
    const tid = 'tn_' + sfx + 'w4'; const em = `w4_${tag}_${Date.now()}_${sfx}@example.com`;
    const { Client } = lib.pg(); const c = new Client({ connectionString: dbUrl }); await c.connect();
    await c.query("insert into tenants (id, name, type, mode) values ($1, '대조 대학교', 'univ', 'saas')", [tid]);
    const ck = {};
    for (const role of ['owner', 'sub', 'teacher']) {
      const e2 = role === 'owner' ? em : role + '_' + em; const t = crypto.randomBytes(32).toString('base64url');
      const uid = (await c.query("insert into users (tenant_id, email, pw, role) values ($1, $2, 'scrypt$x$y', $3) returning id", [tid, e2, role])).rows[0].id;
      await c.query("insert into sessions (id, user_id, tenant_id, expires_at) values ($1, $2, $3, now() + interval '2 hours')", [crypto.createHash('sha256').update(t).digest('hex'), uid, tid]);
      ck[role] = 'dd_sid=' + t;
    }
    await c.query('begin'); await c.query("select set_config('app.tenant', $1, true)", [tid]);
    await c.query("insert into lms_org_unit (tenant_id, unit_code, name, parent_code, kind) values ($1,'ENG','공과대학',null,'college'),($1,'CSE','컴퓨터공학과','ENG','dept'),($1,'BUS','경영학과',null,'dept')", [tid]);
    const P = [['20261001', 'student', 'CSE', 1], ['20261002', 'student', 'CSE', 2], ['20261003', 'student', 'BUS', 1], ['20261004', 'student', 'BUS', 3], ['20261005', 'student', 'CSE', 4], ['20261006', 'student', 'BUS', 2], ['P2026001', 'professor', 'CSE', null], ['S2026001', 'staff', 'BUS', null]];
    for (const [no, k, u, g] of P) await c.query('insert into lms_person (tenant_id, member_no, kind, unit_code, grade_year, source) values ($1,$2,$3,$4,$5,$6)', [tid, no, k, u, g, 'manual']);
    await c.query("insert into lms_term (tenant_id, term_id, name, starts_on, ends_on) values ($1,'2026-2','2026학년도 2학기','2026-09-01','2026-12-20')", [tid]);
    await c.query("insert into lms_course (tenant_id, course_code, name, credits, unit_code, category) values ($1,'CSE2001','자료구조',3,'CSE','major')", [tid]);
    const sec = (await c.query("insert into lms_section (tenant_id, term_id, course_code, section_no, title, source) values ($1,'2026-2','CSE2001','01','자료구조 01분반','manual') returning section_id", [tid])).rows[0].section_id;
    await c.query("insert into lms_enrollment (tenant_id, section_id, person_id, source) select $1, $2, person_id, 'manual' from lms_person where member_no in ('20261001','20261002','20261003')", [tid, sec]);
    await c.query('commit'); await c.end();
    return { tid, ck, sec, em };
  },
  /* 학습자 포털 세션(dd_lsid) — 학번 = lms_person.member_no. 포털 로그인과 같은 형태로 learner_sessions에 직접 넣는다 */
  async learner(db, tid, sid) {
    const crypto = require('node:crypto'); const t = crypto.randomBytes(32).toString('base64url');
    const { Client } = lib.pg(); const c = new Client({ connectionString: db }); await c.connect();
    await c.query("insert into learner_sessions (id, tenant_id, sid, expires_at) values ($1, $2, $3, now() + interval '1 day')", [crypto.createHash('sha256').update(t).digest('hex'), tid, sid]); await c.end();
    return 'dd_lsid=' + t;
  },
  /* 비교용 정규화: uuid · 시각 · 이메일 · 기관 아이디를 순번 토큰으로 */
  norm(v, M = new Map()) {
    const tok = (s, k) => { if (!M.has(s)) M.set(s, k + M.size); return M.get(s); };
    const f = x => {
      if (typeof x === 'string') return x.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, s => tok(s, 'U'))
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)/g, 'T').replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g, 'T').replace(/\d{4}\.\d{2}\.\d{2}( \d{2}:\d{2})?/g, 'D').replace(/[\w.+-]+@example\.com/g, 'E').replace(/tn_[a-z0-9]{8,16}/g, 'TID').replace(/(Q|N)-\d{4}-\d{4,}/g, '$1-NO');
      if (Array.isArray(x)) return x.map(f);
      if (x && typeof x === 'object') { const U = /^[0-9a-f]{8}-[0-9a-f]{4}-/; const ks = Object.keys(x); if (ks.length && ks.every(k => U.test(k))) ks.sort((a, b) => JSON.stringify(x[a]).localeCompare(JSON.stringify(x[b])));
        const o = {}; for (const k of ks.map(k => [f(k), k]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) o[k[0]] = f(x[k[1]]); return o; }
      return x;
    };
    return f(v);
  },
  async compare(name, scenario, A, B, db) {
    const ra = await scenario(A, db, 'a'); const rb = B ? await scenario(B, db, 'b') : null;
    for (const [k, x] of Object.entries(ra)) {
      if (x.expect !== undefined) lib.ok(x.st === x.expect, `${name}.${k}: A 상태 ${x.st} (기대 ${x.expect}) ${JSON.stringify(x.j).slice(0, 200)}`);
      if (!rb) continue; const y = rb[k];
      lib.ok(y && y.st === x.st, `${name}.${k}: 상태 A ${x.st} / B ${y && y.st} ${JSON.stringify(y && y.j).slice(0, 200)}`);
      const na = JSON.stringify(lib.norm(x.j)), nb = JSON.stringify(lib.norm(y && y.j));
      lib.ok(na === nb, `${name}.${k}: 본문 다름\n  A ${na.slice(0, 400)}\n  B ${nb.slice(0, 400)}`);
    }
  },
  done(name) {
    console.log(`${name}: 검사 ${lib.pass + lib.fail} · 통과 ${lib.pass} · 실패 ${lib.fail}`);
    lib.errs.slice(0, 30).forEach(e => console.log(' ✗ ' + e));
    process.exitCode = lib.fail ? 1 : 0;
  }
};

async function scenario(base, db, tag) {
  const O = await lib.org(base, db, 'k' + tag); const R = {}; const C = (m, p, o = {}) => lib.call(base, m, '/api/lms/k/' + p, o);
  const ow = { cookie: O.ck.owner }, te = { cookie: O.ck.teacher };
  const rec = async (k, pr, expect) => { R[k] = await pr; R[k].expect = expect; return R[k]; };
  await rec('noauth', C('GET', 'surveys'), 401);
  await rec('nf', C('GET', 'nope', ow), 404);
  await rec('csrf', C('POST', 'survey/save', { ...ow, csrf: false, body: {} }), 403);
  await rec('badTitle', C('POST', 'survey/save', { ...ow, body: { title: '' } }), 400);
  await rec('badOpts', C('POST', 'survey/save', { ...ow, body: { title: 'x', questions: [{ type: 'single', text: '하나', options: ['a'] }] } }), 400);
  const qs = [{ type: 'single', text: { ko: '학년 만족', en: 'Satisfaction' }, options: [{ ko: '예', en: 'Yes' }, { ko: '아니오', en: 'No' }] },
    { type: 'multi', text: '좋았던 점', options: ['강의', '자료', '실습'] }, { type: 'likert5', text: { ko: '전반 만족', en: 'Overall' } },
    { type: 'html', meta: { html: '<p>안내</p>' } }, { type: 'longtext', text: '의견', required: false }];
  const s = await rec('save', C('POST', 'survey/save', { ...ow, body: { title: '2026 학과 설문', i18n: { en: 'Dept survey' }, langs: ['ko', 'en'], scope: 'dept', scope_ref: '', kind: 'general', target: { kinds: ['student'] }, gate_steps: ['next'], questions: qs } }), 200);
  const sid = s.j && s.j.survey_id;
  await rec('getEn', C('GET', 'survey?survey_id=' + sid + '&lang=en', ow), 200);
  await rec('respClosed', C('POST', 'respond', { ...ow, body: { survey_id: sid, member_no: '20261001', answers: {} } }), 409);
  await rec('open', C('POST', 'survey/open', { ...ow, body: { survey_id: sid } }), 200);
  const q = (s.j.questions || []).filter(x => !['html', 'video'].includes(x.type)).map(x => x.qid);
  await rec('gate1', C('GET', 'gate?member_no=20261001&step=next', ow), 200);
  await rec('req', C('POST', 'respond', { ...ow, body: { survey_id: sid, member_no: '20261001', answers: { [q[0]]: 0 } } }), 400);
  await rec('r1', C('POST', 'respond', { ...ow, body: { survey_id: sid, member_no: '20261001', answers: { [q[0]]: 0, [q[1]]: [0, 2], [q[2]]: 5, [q[3]]: '좋아요' } } }), 200);
  await rec('dupe', C('POST', 'respond', { ...ow, body: { survey_id: sid, member_no: '20261001', answers: { [q[0]]: 0, [q[1]]: [0], [q[2]]: 5 } } }), 409);
  await rec('r2', C('POST', 'respond', { ...ow, body: { survey_id: sid, member_no: '20261003', answers: { [q[0]]: 1, [q[1]]: [1], [q[2]]: 3 } } }), 200);
  await rec('badVal', C('POST', 'respond', { ...ow, body: { survey_id: sid, member_no: '20261002', answers: { [q[0]]: 7, [q[1]]: [1], [q[2]]: 3 } } }), 400);
  await rec('notTarget', C('POST', 'respond', { ...ow, body: { survey_id: sid, member_no: 'P2026001', answers: { [q[0]]: 1, [q[1]]: [1], [q[2]]: 3 } } }), 403);
  await rec('gate2', C('GET', 'gate?member_no=20261001&step=next', ow), 200);
  await rec('gateBad', C('GET', 'gate?member_no=20261001&step=zzz', ow), 400);
  await rec('import', C('POST', 'import', { ...ow, body: { survey_id: sid, rows: [{ member_no: '20261004', answers: { 1: 0, 2: '0;1', 3: 4 } }, { member_no: '20261005', answers: { 1: 0 } }] } }), 200);
  await rec('pending', C('GET', 'pending?member_no=20261002', ow), 200);
  await rec('stats', C('GET', 'stats?survey_id=' + sid + '&by=grade_year', ow), 200);
  await rec('export', C('GET', 'export?survey_id=' + sid, ow), 200);
  await rec('remind', C('POST', 'remind', { ...ow, body: { survey_id: sid } }), 200);
  await rec('qLocked', C('POST', 'survey/save', { ...ow, body: { survey_id: sid, title: '2026 학과 설문', questions: qs } }), 409);
  await rec('teacherDel', C('POST', 'survey/delete', { ...te, body: { survey_id: sid } }), 403);
  await rec('close', C('POST', 'survey/close', { ...ow, body: { survey_id: sid } }), 200);
  const tp = await rec('tpl', C('POST', 'survey/save', { ...ow, body: { title: '만족도 템플릿', is_template: true, questions: [{ type: 'likert5', text: '만족' }] } }), 200);
  await rec('tplList', C('GET', 'surveys?template=1', ow), 200);
  await rec('copy', C('POST', 'survey/copy', { ...ow, body: { survey_id: tp.j.survey_id, title: '복사본', scope: 'univ' } }), 200);
  const ev = await rec('eval', C('POST', 'course-eval', { ...ow, body: { section_id: O.sec, prof_public: false, gate_steps: ['grade'] } }), 200);
  await rec('evalDup', C('POST', 'course-eval', { ...ow, body: { section_id: O.sec } }), 409);
  await rec('evalOpen', C('POST', 'survey/open', { ...ow, body: { survey_id: ev.j.survey_id } }), 200);
  await rec('evalGate', C('GET', 'gate?member_no=20261002&step=grade&scope=section&ref=' + O.sec, ow), 200);
  await rec('evalNotEnrolled', C('GET', 'gate?member_no=20261004&step=grade&scope=section&ref=' + O.sec, ow), 200);
  await rec('evalTeacherStats', C('GET', 'stats?survey_id=' + ev.j.survey_id, te), 403);
  await rec('evalPublic', C('POST', 'eval/public', { ...ow, body: { survey_id: ev.j.survey_id, prof_public: true } }), 200);
  await rec('evalTeacherStats2', C('GET', 'stats?survey_id=' + ev.j.survey_id, te), 200);
  await rec('list', C('GET', 'surveys', ow), 200);
  /* 학습자 본인 세션: member_no는 세션 학번으로 고정(남의 학번을 보내도 무시) */
  const L2 = { cookie: await lib.learner(db, O.tid, '20261002') };
  await rec('lPending', C('GET', 'pending?member_no=20261001', L2), 200);
  await rec('lGate', C('GET', 'gate?step=grade&scope=section&ref=' + O.sec, L2), 200);
  await rec('lSurvey', C('GET', 'survey?survey_id=' + ev.j.survey_id, L2), 200);
  await rec('lClosed', C('GET', 'survey?survey_id=' + sid, L2), 404);
  const eq = (R.lSurvey.j.questions || []).filter(x => x.type === 'likert5').map(x => x.qid);
  await rec('lRespond', C('POST', 'respond', { ...L2, body: { survey_id: ev.j.survey_id, member_no: '20261001', answers: Object.fromEntries(eq.map(x => [x, 4])) } }), 200);
  await rec('lGate2', C('GET', 'gate?step=grade&scope=section&ref=' + O.sec, L2), 200);
  await rec('lStats', C('GET', 'stats?survey_id=' + ev.j.survey_id, L2), 401);
  await rec('lNoSession', C('GET', 'pending', { cookie: 'dd_lsid=bogus' }), 401);
  await rec('evalStats', C('GET', 'stats?survey_id=' + ev.j.survey_id, ow), 200);
  return R;
}

module.exports = lib;
if (require.main === module) (async () => {
  const [A, B, DB] = [process.argv[2] || 'http://127.0.0.1:8231', process.argv[3] && process.argv[3] !== '-' ? process.argv[3] : null, process.argv[4] || 'postgres://didisam@127.0.0.1:5544/ddw4'];
  await lib.compare('K', scenario, A, B, DB);
  lib.done('lms-k');
})().catch(e => { console.error(e); process.exit(2); });
