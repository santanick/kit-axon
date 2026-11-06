'use strict';
/* v30 묶음 E · F · H 대조 테스트 공용 — 가입 · 학사 시드(DB) · 학습자 세션 · 요청 · 정규화 · 비교.
   두 서버(Node · Java)가 같은 DB를 쓴다. 기관은 서버마다 따로 가입하므로 학번은 같아도 겹치지 않는다(기관별 유일). */
const crypto = require('node:crypto');
const path = require('node:path');
let pg; try { pg = require('pg'); } catch { pg = require(path.join(__dirname, '../../service/server/node_modules/pg')); }
const DBURL = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/ddw2';

async function call(base, method, p, { body, cookie, csrf = true, xff } = {}) {
  const h = {}; if (csrf && method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (body !== undefined) h['content-type'] = 'application/json'; if (xff) h['x-forwarded-for'] = xff;
  const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  const sc = r.headers.get('set-cookie'); return { st: r.status, j, ck: sc ? sc.split(';')[0] : null };
}
async function db(fn) { const c = new pg.Client({ connectionString: DBURL }); await c.connect(); try { return await fn(c); } finally { await c.end(); } }
const h = t => crypto.createHash('sha256').update(t).digest('hex');
const STU = ['20261001', '20261002', '20261003', '20261004', '20261005'];
const AUD = '20269001';

/* 기관 가입 → 학기 · 교과목 · 분반(수업계획서 평가 비율) · 학생 5명 + 청강 1명 · 학습자 세션 */
async function setup(base, tag) {
  /* 가입 API는 IP당 시간 제한(10회)이 있어 기관 · 운영자 · 세션을 DB에 바로 만든다(서버 세션 규칙: sha256(token)) */
  const tid = 'tn_' + crypto.randomBytes(8).toString('hex').replace(/[01]/g, 'k').slice(0, 10);
  const tok = crypto.randomBytes(32).toString('base64url');
  await db(async c => {
    await c.query("insert into tenants (id, name, type) values ($1, '대조 국립대', 'univ')", [tid]);
    const u = (await c.query("insert into users (tenant_id, email, pw, role) values ($1, $2, 'scrypt$x$y', 'owner') returning id", [tid, `efh_${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`])).rows[0].id;
    await c.query("insert into sessions (id, user_id, tenant_id, expires_at) values ($1, $2, $3, now() + interval '2 hour')", [h(tok), u, tid]);
  });
  const su = { ck: 'dd_sid=' + tok };
  const X = await db(async c => {
    await c.query("select set_config('app.tenant', $1, false)", [tid]);
    await c.query("insert into lms_term (tenant_id, term_id, name, starts_on, ends_on, is_operating) values ($1, '2026-2', '2026학년도 2학기', '2026-09-01', '2026-12-31', true)", [tid]);
    await c.query("insert into lms_course (tenant_id, course_code, name, credits, category) values ($1, 'CSE2001', '자료구조', 3, 'major')", [tid]);
    const sec = (await c.query(`insert into lms_section (tenant_id, term_id, course_code, section_no, title, syllabus) values ($1, '2026-2', 'CSE2001', '01', '자료구조 01분반', '{"eval":{"midterm":30,"final":30,"assignment":20,"quiz":10,"attendance":10}}') returning section_id::text`, [tid])).rows[0].section_id;
    const sec2 = (await c.query(`insert into lms_section (tenant_id, term_id, course_code, section_no, title) values ($1, '2026-2', 'CSE2001', '02', '자료구조 02분반') returning section_id::text`, [tid])).rows[0].section_id;
    /* 조직 · 교과목 학과 · 담당 교원(교수 · 조교) */
    await c.query("insert into lms_org_unit (tenant_id, unit_code, name, kind) values ($1, 'ENG', '공과대학', 'college'), ($1, 'SCI', '자연과학대학', 'college')", [tid]);
    await c.query("insert into lms_org_unit (tenant_id, unit_code, name, parent_code, kind) values ($1, 'CSE', '컴퓨터공학과', 'ENG', 'dept'), ($1, 'MTH', '수학과', 'SCI', 'dept')", [tid]);
    await c.query("update lms_course set unit_code = 'CSE' where course_code = 'CSE2001'");
    const prof = (await c.query("insert into lms_person (tenant_id, member_no, kind, unit_code) values ($1, 'P1001', 'professor', 'CSE') returning person_id::text", [tid])).rows[0].person_id;
    const ta = (await c.query("insert into lms_person (tenant_id, member_no, kind, unit_code) values ($1, '20265555', 'student', 'CSE') returning person_id::text", [tid])).rows[0].person_id;
    await c.query("insert into lms_section_staff (tenant_id, section_id, person_id, role, source) values ($1, $2, $3, 'professor', 'sis'), ($1, $2, $4, 'ta', 'manual')", [tid, sec, prof, ta]);
    const U = {};
    for (const [k, role, units, m] of [['prof', 'teacher', [], 'P1001'], ['ta', 'teacher', [], '20265555'], ['subE', 'sub', ['ENG'], null], ['subM', 'sub', ['MTH'], null], ['tnl', 'teacher', null, null]]) {
      const u = (await c.query("insert into users (tenant_id, email, pw, role) values ($1, $2, 'scrypt$x$y', $3) returning id", [tid, `efh_${tag}_${k}_${Date.now()}@example.com`, role])).rows[0].id;
      if (units) await c.query('insert into lms_user_link (tenant_id, user_id, units, member_no) values ($1, $2, $3, $4)', [tid, u, units, m]);
      const t = crypto.randomBytes(32).toString('base64url'); await c.query("insert into sessions (id, user_id, tenant_id, expires_at) values ($1, $2, $3, now() + interval '2 hour')", [h(t), u, tid]); U[k] = 'dd_sid=' + t;
    }
    const P = {};
    for (const m of [...STU, AUD]) {
      P[m] = (await c.query("insert into lms_person (tenant_id, member_no, kind, unit_code, grade_year) values ($1, $2, 'student', 'CSE', 2) returning person_id::text", [tid, m])).rows[0].person_id;
      await c.query('insert into lms_enrollment (tenant_id, section_id, person_id, kind) values ($1, $2, $3, $4)', [tid, sec, P[m], m === AUD ? 'audit' : 'regular']);
    }
    await c.query("insert into lms_person (tenant_id, member_no, kind, unit_code) values ($1, '20267777', 'student', 'MTH')", [tid]); // 미수강
    const L = {};
    for (const m of [...STU, AUD, '20267777', '20268888']) { const t = crypto.randomBytes(32).toString('base64url'); await c.query("insert into learner_sessions (id, tenant_id, sid, expires_at) values ($1, $2, $3, now() + interval '2 hour')", [h(t), tid, m]); L[m] = 'dd_lsid=' + t; }
    return { sec, sec2, P, L, U };
  });
  return { ck: su.ck, tid, ...X };
}
async function setSql(tid, sql, args = []) { return db(async c => { await c.query("select set_config('app.tenant', $1, false)", [tid]); return c.query(sql, args); }); }

/* 정규화: uuid는 처음 나온 순서 번호(U0…), 시각은 'T', 기관 id는 'TID', 일련번호(qid · mid · id)는 'N'.
   uuid를 키로 쓰는 객체(문항별 답안 · 채점)는 키 순서가 uuid 값에 달려 있으므로 [키, 값] 목록을 값 기준으로 정렬해 비교한 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function norm(v) {
  const map = new Map(); const U = u => { if (!map.has(u)) map.set(u, 'U' + map.size); return map.get(u); };
  const walk = x => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      const ks = Object.keys(x);
      if (ks.length && ks.every(k => UUID.test(k))) return ks.map(k => JSON.stringify(walk(x[k]))).sort();
      const o = {}; for (const k of ks) o[k] = ['qid', 'mid', 'id'].includes(k) && typeof x[k] === 'number' ? 'N' : walk(x[k]); return o;
    }
    if (typeof x === 'string') { if (UUID.test(x)) return U(x); return x.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, U).replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, 'T').replace(/tn_[a-z0-9]{8,16}/g, 'TID').replace(/efh_[nj]_[a-z0-9_]+@example\.com/g, 'EMAIL'); }
    return x;
  };
  return JSON.stringify(walk(v === undefined ? null : v));
}
function report(name, pass, fail, errs) {
  console.log(`${name}: ${pass + fail}항목 중 ${pass} 통과 · ${fail} 실패`);
  for (const e of errs.slice(0, 40)) console.log('  ✗ ' + e);
  if (fail) process.exitCode = 1;
}
/* 실행: scenario(base, tag) → {R: {이름: 응답}, P: [[조건, 설명]]}. 두 서버 결과를 상태 · 본문(정규화)으로 비교 */
async function run(name, scenario, A, B, skip = []) {
  let pass = 0, fail = 0; const errs = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
  const ra = await scenario(A, 'n');
  for (const [c, m] of ra.P) ok(c, 'Node: ' + m);
  if (B) {
    const rb = await scenario(B, 'j');
    for (const [c, m] of rb.P) ok(c, 'Java: ' + m);
    for (const k of Object.keys(ra.R)) {
      const x = ra.R[k], y = rb.R[k];
      if (!y) { ok(false, `${k}: Java 응답 없음`); continue; }
      ok(x.st === y.st, `${k}: 상태 ${x.st} ≠ ${y.st}`);
      if (!skip.includes(k)) { const nx = norm(x.j), ny = norm(y.j); ok(nx === ny, `${k}: 본문 다름\n    N ${nx.slice(0, 600)}\n    J ${ny.slice(0, 600)}`); }
    }
  }
  report(name, pass, fail, errs);
}
module.exports = { call, db, setup, setSql, norm, run, STU, AUD };
