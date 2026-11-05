'use strict';
/* 묶음 L · M · P 대조 테스트 공용 — 같은 시나리오를 Node · Java에 돌려 상태코드 · 오류 코드 · 정규화한 본문을 비교한다.
   정규화: uuid → U1, U2…(등장 순서), 시각 → T, 숫자 id(공유 시퀀스) → N1…, 기관 id · 이메일 → 고정 문자, 프로세스 지표 값 → 형태만 */
const path = require('node:path'); const crypto = require('node:crypto');
let pg; try { pg = require('pg'); } catch { pg = require(path.join(__dirname, '../../service/server/node_modules/pg')); }
const DBURL = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/ddw5';
async function call(base, method, p, { body, cookie, csrf = true, headers = {} } = {}) {
  const h = { ...headers }; if (csrf && method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (body !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { j = t; }
  const sc = r.headers.get('set-cookie'); return { st: r.status, j, ct: (r.headers.get('content-type') || '').split(';')[0], ck: sc ? sc.split(';')[0] : null };
}
async function db(fn) { const c = new pg.Client({ connectionString: DBURL }); await c.connect(); try { return await fn(c); } finally { await c.end(); } }
async function signup(base, tag) {
  const su = await call(base, 'POST', '/api/signup', { body: { email: `lmp_${tag}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}@example.com`, password: 'LmpTest2026x', orgName: '대조 국립대', type: 'univ' } });
  return { ck: su.ck, tid: su.j.tenant.tid, email: su.j.user.email };
}
const tok = () => crypto.randomBytes(32).toString('base64url');
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
async function extraUser(tid, role, pw) { return db(async c => { const em = `${role}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}@example.com`; const u = (await c.query('insert into users (tenant_id, email, pw, role) values ($1, $2, $3, $4) returning id::text', [tid, em, pw || 'scrypt$x$y', role])).rows[0].id; const t = tok(); await c.query("insert into sessions (id, user_id, tenant_id, expires_at) values ($1, $2, $3, now() + interval '1 hour')", [sha(t), u, tid]); return { ck: 'dd_sid=' + t, uid: u, email: em }; }); }
async function learnerCookie(tid, sid) { return db(async c => { const t = tok(); await c.query("insert into learner_sessions (id, tenant_id, sid, expires_at) values ($1, $2, $3, now() + interval '1 hour')", [sha(t), tid, sid]); return 'dd_lsid=' + t; }); }
/* 데모 학사 데이터(학번만): 학기 1 · 교과목 2 · 분반 2 · 학생 6 · 교수 1 · 차시 4 */
async function seedAcademic(tid) {
  return db(async c => {
    await c.query('begin'); await c.query("select set_config('app.tenant', $1, true)", [tid]);
    await c.query("insert into lms_term (tenant_id, term_id, name, starts_on, ends_on, is_operating) values ($1, '2026-2', '2026학년도 2학기', '2026-09-01', '2026-12-20', true) on conflict do nothing", [tid]);
    await c.query("insert into lms_org_unit (tenant_id, unit_code, name) values ($1, 'CSE', '컴퓨터공학과'), ($1, 'BUS', '경영학과') on conflict do nothing", [tid]);
    await c.query("insert into lms_course (tenant_id, course_code, name, credits, unit_code, category) values ($1, 'CSE1001', '프로그래밍 기초', 3, 'CSE', 'major'), ($1, 'BUS2001', '경영 데이터 분석', 3, 'BUS', 'major') on conflict do nothing", [tid]);
    const sec = []; for (const [cc, no, ttl] of [['CSE1001', '01', '프로그래밍 기초 01'], ['BUS2001', '01', '경영 데이터 분석 01']]) sec.push((await c.query("insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode) values ($1, '2026-2', $2, $3, $4, 'blended') returning section_id::text", [tid, cc, no, ttl])).rows[0].section_id);
    const per = []; for (let i = 1; i <= 6; i++) per.push((await c.query("insert into lms_person (tenant_id, member_no, kind, unit_code, grade_year, source) values ($1, $2, 'student', $3, 2, 'manual') returning person_id::text", [tid, `2026100${i}`, i <= 3 ? 'CSE' : 'BUS'])).rows[0].person_id);
    const prof = (await c.query("insert into lms_person (tenant_id, member_no, kind, unit_code, source) values ($1, 'P2026001', 'professor', 'CSE', 'manual') returning person_id::text", [tid])).rows[0].person_id;
    await c.query("insert into lms_section_staff (tenant_id, section_id, person_id, role, source) values ($1, $2, $3, 'professor', 'manual')", [tid, sec[0], prof]);
    for (let i = 0; i < 6; i++) await c.query("insert into lms_enrollment (tenant_id, section_id, person_id, source) values ($1, $2, $3, 'manual')", [tid, sec[i < 4 ? 0 : 1], per[i]]);
    const ses = []; for (let w = 1; w <= 4; w++) ses.push((await c.query("insert into lms_session (tenant_id, section_id, week_no, seq, kind, starts_at, ends_at, open_at, close_at) values ($1, $2, $3::int, 1, $4, now() + make_interval(days => $3::int - 3), now() + make_interval(days => $3::int - 3, hours => 2), now() - interval '7 days', now() + make_interval(hours => case when $3::int = 3 then 12 else 24 * $3::int * 3 end)) returning session_id::text", [tid, sec[0], w, w === 3 ? 'online' : 'class'])).rows[0].session_id);
    await c.query("insert into lms_attendance (tenant_id, session_id, person_id, status, method) values ($1, $2, $3, 'absent', 'manual'), ($1, $4, $3, 'absent', 'manual'), ($1, $2, $5, 'late', 'manual')", [tid, ses[0], per[0], ses[1], per[1]]);
    await c.query('commit'); return { sec, per, prof, ses };
  });
}
const UU = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;
const TS = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(\+09:00|Z)\b/g;
function normalizer() {
  const um = new Map(); const nm = new Map();
  const s = v => String(v).replace(UU, x => { if (!um.has(x)) um.set(x, 'U' + (um.size + 1)); return um.get(x); }).replace(TS, 'T').replace(/tn_[a-z0-9]{8,16}/g, 'TID').replace(/[\w.+-]+@example\.com/g, 'EMAIL').replace(/^[A-Za-z0-9_-]{43}$/, 'TOKEN').replace(/(DTSTART|DTEND|DTSTAMP)(;VALUE=DATE)?:\d{8}(T\d{6}Z)?/g, '$1:D');
  const go = (v, k) => {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(x => go(x, k));
    if (typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(x => [x, go(v[x], x)]));
    if (typeof v === 'number' && /^(id|after|run_id|ids)$/.test(k || '')) { if (!nm.has(v)) nm.set(v, 'N' + (nm.size + 1)); return nm.get(v); }
    if (typeof v === 'string') return s(v);
    return v;
  };
  return go;
}
/* 응답 R(이름 → 응답) 두 벌을 비교 — shapeOnly: 값 대신 형태만(프로세스 지표 등) */
const shape = v => v === null ? 'null' : Array.isArray(v) ? '[' + (v.length ? shape(v[0]) : '') + ']' : typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => k + ':' + shape(v[k])).join(',') + '}' : typeof v;
function compare(RA, RB, shapeOnly = []) {
  let pass = 0, fail = 0; const errs = [];
  for (const k of Object.keys(RA)) {
    const na = normalizer(), nb = normalizer(); /* 응답마다 새로 번호(공유 시퀀스 · DB 상태와 무관) */
    const a = RA[k], b = RB[k]; if (!b) { fail++; errs.push(k + ': Java 응답 없음'); continue; }
    const ja = shapeOnly.includes(k) ? shape(a.j) : JSON.stringify(na(a.j)), jb = shapeOnly.includes(k) ? shape(b.j) : JSON.stringify(nb(b.j));
    if (a.st === b.st && ja === jb && a.ct === b.ct) pass++; else { fail++; errs.push(`${k}: Node ${a.st} ${a.ct} ${ja.slice(0, 300)}\n      Java ${b.st} ${b.ct} ${jb.slice(0, 300)}`); }
  }
  return { pass, fail, errs };
}
function expect(R, want) { let pass = 0, fail = 0; const errs = []; for (const [k, st] of Object.entries(want)) { if (R[k] && R[k].st === st) pass++; else { fail++; errs.push(`${k}: 기대 ${st}, 실제 ${R[k] && R[k].st} ${JSON.stringify(R[k] && R[k].j).slice(0, 200)}`); } } return { pass, fail, errs }; }
async function main(name, scenario, want, shapeOnly) {
  const [A, B] = [process.argv[2] || 'http://127.0.0.1:8241', process.argv[3] || ''];
  const RA = await scenario(A, 'n'); const e = expect(RA, want); let c = { pass: 0, fail: 0, errs: [] };
  if (B) { const RB = await scenario(B, 'j'); const eb = expect(RB, want); e.pass += eb.pass; e.fail += eb.fail; e.errs.push(...eb.errs.map(x => 'Java ' + x)); c = compare(RA, RB, shapeOnly); }
  const pass = e.pass + c.pass, fail = e.fail + c.fail;
  [...e.errs, ...c.errs].forEach(x => console.log('  ✗ ' + x));
  console.log(`${name}: 검사 ${pass + fail} · 통과 ${pass} · 실패 ${fail}${B ? ' (Node · Java 대조 포함)' : ' (Node만)'}`);
  process.exit(fail ? 1 : 0);
}
module.exports = { call, db, signup, extraUser, learnerCookie, seedAcademic, main, sha, tok };
