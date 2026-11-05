'use strict';
/* v30 묶음 A 대조 테스트 — 학사 LMS 학기 · 교과목 · 분반 · 수강 · CSV · 분반 동기화 · 합반 · 조교/청강 · 단과대학 범위 · 학습자 내 분반.
   Node 서버와 Java(전자정부) 서버에 같은 시나리오를 돌려 상태코드 · 오류 코드/문구 · 응답 본문(시각 · uuid · 학번 접미 정규화)을 비교한다.
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/<db> node test/lms-a.js http://127.0.0.1:<node> http://127.0.0.1:<java>
   (두 번째 주소를 생략하면 Node만 돌리고 기대 상태코드만 확인한다) */
const crypto = require('node:crypto');
const path = require('node:path');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8711', process.argv[3] || ''];
const DBURL = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/ddv30';
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
let pg; try { pg = require('pg'); } catch { pg = require(path.join(__dirname, '../../service/server/node_modules/pg')); }

async function call(base, method, p, { body, cookie, csrf = true } = {}) {
  const h = {}; if (csrf && method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (body !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  const sc = r.headers.get('set-cookie'); return { st: r.status, j, ck: sc ? sc.split(';')[0] : null };
}
async function db(fn) { const c = new pg.Client({ connectionString: DBURL }); await c.connect(); try { return await fn(c); } finally { await c.end(); } }
const tok = () => crypto.randomBytes(32).toString('base64url');
const h = t => crypto.createHash('sha256').update(t).digest('hex');
async function userCookie(tid, role, tag) {
  return db(async c => { const u = (await c.query("insert into users (tenant_id, email, pw, role) values ($1, $2, 'scrypt$x$y', $3) returning id::text", [tid, `${role}_${tag}_${Date.now()}@example.com`, role])).rows[0].id; const t = tok();
    await c.query("insert into sessions (id, user_id, tenant_id, expires_at) values ($1, $2, $3, now() + interval '1 hour')", [h(t), u, tid]); return { ck: 'dd_sid=' + t, uid: u, email: (await c.query('select email from users where id = $1', [u])).rows[0].email }; });
}
async function learnerCookie(tid, sid) { return db(async c => { const t = tok(); await c.query("insert into learner_sessions (id, tenant_id, sid, expires_at) values ($1, $2, $3, now() + interval '1 hour')", [h(t), tid, sid]); return 'dd_lsid=' + t; }); }

/* 한 서버에서 묶음 A 시나리오 — R: 비교 대상 응답, X: 내부 값 */
async function scenario(base, tag) {
  const R = {}; const X = {}; const P = tag === 'n' ? '1' : '2'; /* 학번 접미(두 서버가 같은 DB를 써도 겹치지 않게) */
  const stu = i => `2026${P}${String(i).padStart(3, '0')}`;
  const su = await call(base, 'POST', '/api/signup', { body: { email: `lmsa_${tag}_${Date.now()}@example.com`, password: 'LmsAtest2026x', orgName: '대조 국립대', type: 'univ' } });
  const ck = su.ck; const tid = su.j.tenant.tid; X.tid = tid; X.ck = ck;
  const corp = await call(base, 'POST', '/api/signup', { body: { email: `lmsc_${tag}_${Date.now()}@example.com`, password: 'LmsAtest2026x', orgName: '대조 기업', type: 'corp' } });
  R.edition = await call(base, 'GET', '/api/lms/a/overview', { cookie: corp.ck });
  R.noAuth = await call(base, 'GET', '/api/lms/a/overview');
  R.csrf = await call(base, 'POST', '/api/lms/a/term', { cookie: ck, body: {}, csrf: false });
  R.ov0 = await call(base, 'GET', '/api/lms/a/overview', { cookie: ck });
  /* 기관 문서(스튜디오 강의실 3개 + 활동) */
  const cur = [{ id: 'it1', type: 'chapter', title: '1주차' }, { id: 'it2', type: 'video', title: '오리엔테이션', len: 12.5 }, { id: 'it3', type: 'assign', title: '과제 1' }, { id: 'it4', type: 'exam', title: '중간고사', qs: [1, 2, 3] }, { id: 'it5', type: 'survey', title: '토론' }];
  const doc = { org: { name: '대조 국립대', type: 'univ', ed: 'lms', room: { mode: 'saas' } }, classes: [
    { id: 'c0', name: 'AI 리터러시', learners: ['m1', 'm2'], prog: { m1: { p: 50 } }, curriculum: cur, notices: [{ id: 'n1', title: '첫 공지', pin: true }, { title: '아이디 없음' }] },
    { id: 'c1', name: 'AI 리터러시 02', learners: [], prog: {}, curriculum: [{ id: 'own1', type: 'video', title: '분반 자체 자료' }], notices: [] },
    { id: 'c2', name: 'AI 리터러시 03', learners: ['m3'], prog: { m3: { p: 10 } } },
    { id: 'c3', name: '데이터 분석', learners: ['m1', 'm4'], prog: { m1: { p: 70 }, m4: { p: 20 } } },
    { id: 'c4', name: '데이터 분석 02', learners: ['m5', 'm1'], prog: { m5: { p: 90 }, m1: { p: 5 } } }] };
  await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc, rev: 0 } });
  /* 학기 · 조직 */
  R.termBad = await call(base, 'POST', '/api/lms/a/term', { cookie: ck, body: { term_id: '2026-3', name: 'x', starts_on: '2026-09-01', ends_on: '2026-12-20' } });
  R.termName = await call(base, 'POST', '/api/lms/a/term', { cookie: ck, body: { term_id: '2026-2', name: '', starts_on: '2026-09-01', ends_on: '2026-12-20' } });
  R.termDate = await call(base, 'POST', '/api/lms/a/term', { cookie: ck, body: { term_id: '2026-2', name: '2026학년도 2학기', starts_on: '2026-09-01', ends_on: '2026-02-30' } });
  R.term = await call(base, 'POST', '/api/lms/a/term', { cookie: ck, body: { term_id: '2026-2', name: '2026학년도 2학기', starts_on: '2026-09-01', ends_on: '2026-12-20', is_operating: true } });
  R.term1 = await call(base, 'POST', '/api/lms/a/term', { cookie: ck, body: { term_id: '2026-1', name: '2026학년도 1학기', starts_on: '2026-03-02', ends_on: '2026-06-20' } });
  R.unitBad = await call(base, 'POST', '/api/lms/a/unit', { cookie: ck, body: { unit_code: 'x', name: '공대' } });
  R.unitKind = await call(base, 'POST', '/api/lms/a/unit', { cookie: ck, body: { unit_code: 'ENG', name: '공과대학', kind: 'school' } });
  R.unitPar = await call(base, 'POST', '/api/lms/a/unit', { cookie: ck, body: { unit_code: 'CSE', name: '컴퓨터공학과', parent_code: 'NOPE' } });
  for (const [u, n, k, p] of [['ENG', '공과대학', 'college', ''], ['BIZ', '경영대학', 'college', ''], ['CSE', '컴퓨터공학과', 'dept', 'ENG'], ['MEC', '기계공학과', 'dept', 'ENG'], ['BUS', '경영학과', 'dept', 'BIZ']]) R['unit_' + u] = await call(base, 'POST', '/api/lms/a/unit', { cookie: ck, body: { unit_code: u, name: n, kind: k, parent_code: p } });
  R.unitDelUsed = await call(base, 'POST', '/api/lms/a/unit-delete', { cookie: ck, body: { unit_code: 'ENG' } });
  /* 교과목 */
  R.courseBad = await call(base, 'POST', '/api/lms/a/course', { cookie: ck, body: { course_code: 'A', name: 'x' } });
  R.courseCred = await call(base, 'POST', '/api/lms/a/course', { cookie: ck, body: { course_code: 'GEN1001', name: 'AI 리터러시', credits: 31 } });
  R.courseCat = await call(base, 'POST', '/api/lms/a/course', { cookie: ck, body: { course_code: 'GEN1001', name: 'AI 리터러시', category: 'zzz' } });
  R.courseUnit = await call(base, 'POST', '/api/lms/a/course', { cookie: ck, body: { course_code: 'GEN1001', name: 'AI 리터러시', unit_code: 'NOPE' } });
  R.course1 = await call(base, 'POST', '/api/lms/a/course', { cookie: ck, body: { course_code: 'GEN1001', name: 'AI 리터러시', credits: 3, unit_code: 'CSE', category: '교양' } });
  R.course2 = await call(base, 'POST', '/api/lms/a/course', { cookie: ck, body: { course_code: 'BUS2001', name: '데이터 분석', credits: '2.5', unit_code: 'BUS', category: 'major' } });
  /* 분반 */
  R.secNoTerm = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { term_id: '2025-1', course_code: 'GEN1001', section_no: '1' } });
  R.secNoCourse = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { term_id: '2026-2', course_code: 'NOPE01', section_no: '1' } });
  R.secBadNo = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { term_id: '2026-2', course_code: 'GEN1001', section_no: '1a' } });
  R.secMode = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { term_id: '2026-2', course_code: 'GEN1001', section_no: '1', mode: 'vr' } });
  R.secCap = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { term_id: '2026-2', course_code: 'GEN1001', section_no: '1', capacity: 1.5 } });
  R.secSch = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { term_id: '2026-2', course_code: 'GEN1001', section_no: '1', schedule: [{ day: 'x' }] } });
  const S = {};
  for (const [k, code, no, cls, mode] of [['g1', 'GEN1001', '1', 'c0', 'blended'], ['g2', 'GEN1001', '02', 'c1', 'online'], ['g3', 'GEN1001', '3', 'c2', 'hyflex'], ['b1', 'BUS2001', '1', 'c3', 'offline'], ['b2', 'BUS2001', '2', 'c4', 'offline']]) {
    const r = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { term_id: '2026-2', course_code: code, section_no: no, class_id: cls, mode, capacity: 40, schedule: [{ day: '월', period: '1-2', room: '공학관 301' }] } });
    R['sec_' + k] = r; S[k] = r.j && r.j.section_id;
  }
  X.S = S;
  R.secDup = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { term_id: '2026-2', course_code: 'GEN1001', section_no: '01' } });
  R.secUpd = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { section_id: S.g1, title: 'AI 리터러시 01분반(대표)', mode: 'blended', capacity: 60, class_id: 'c0' } });
  R.secNotFound = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { section_id: '00000000-0000-0000-0000-000000000000' } });
  R.secBadId = await call(base, 'POST', '/api/lms/a/section', { cookie: ck, body: { section_id: 'zz' } });
  R.termDelUsed = await call(base, 'POST', '/api/lms/a/term-delete', { cookie: ck, body: { term_id: '2026-2' } });
  R.termDel = await call(base, 'POST', '/api/lms/a/term-delete', { cookie: ck, body: { term_id: '2026-1' } });
  R.courseDelUsed = await call(base, 'POST', '/api/lms/a/course-delete', { cookie: ck, body: { course_code: 'GEN1001' } });
  /* 구성원(수동 · CSV) */
  R.perBad = await call(base, 'POST', '/api/lms/a/person', { cookie: ck, body: { member_no: '12' } });
  R.perStu = await call(base, 'POST', '/api/lms/a/person', { cookie: ck, body: { member_no: 'AB1234', kind: 'student' } });
  R.perKind = await call(base, 'POST', '/api/lms/a/person', { cookie: ck, body: { member_no: stu(900), kind: '교직원' } });
  R.perYear = await call(base, 'POST', '/api/lms/a/person', { cookie: ck, body: { member_no: stu(900), grade_year: 7 } });
  R.perProf = await call(base, 'POST', '/api/lms/a/person', { cookie: ck, body: { member_no: `P${P}001`, kind: '교수', unit_code: 'CSE' } });
  R.perProf2 = await call(base, 'POST', '/api/lms/a/person', { cookie: ck, body: { member_no: `P${P}002`, kind: 'professor', unit_code: 'BUS' } });
  R.perDup = await call(base, 'POST', '/api/lms/a/person', { cookie: ck, body: { member_no: `P${P}001`, kind: '교수' } });
  const pcsv = '\ufeff학번,구분,학과코드,학적,학년\r\n' + Array.from({ length: 12 }, (_, i) => `${stu(i + 1)},학생,${i % 2 ? 'BUS' : 'CSE'},${i === 5 ? '휴학' : '재학'},${1 + (i % 4)}`).join('\r\n') +
    `\r\n12ab,학생,CSE,재학,1\r\n${stu(1)},학생,CSE,재학,1\r\n${stu(20)},교직원,CSE,재학,\r\n${stu(21)},학생,NOPE,재학,\r\n${stu(22)},학생,CSE,무단,\r\n"${stu(23)}","학생","CSE","재학","9"\r\n,,,,\r\n${stu(24)},외부,,,\n`;
  R.impHead = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'person', csv: '번호,이름\n1,2' } });
  R.impEmpty = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'person', csv: '  ' } });
  R.impKind = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'grade', csv: 'a' } });
  R.impBig = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'person', csv: '학번\n' + Array.from({ length: 5001 }, (_, i) => String(30000000 + i)).join('\n') } });
  R.impPrev = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'person', csv: pcsv } });
  R.impApply = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'person', csv: pcsv, apply: true } });
  R.impAgain = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'person', csv: pcsv } });
  const scsv = '학수번호,교과목명,분반,학점,학과코드,수업방식,정원,교과구분\nMEC3001,열역학,1,3,MEC,오프라인,50,전공\nMEC3001,열역학,2,3,MEC,온라인,50,전공\nGEN1001,AI 리터러시,1,,,,,\nMEC3001,열역학,2,3,MEC,온라인,50,전공\nX,이름,1,,,,,\nMEC3002,"동역학, 기초",1,3,MEC,VR,,\nMEC3003,제어,1,40,MEC,,,\nMEC3004,설계,1,3,MEC,,-1,\n';
  R.impSecTerm = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'section', csv: scsv } });
  R.impSec = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'section', term_id: '2026-2', csv: scsv, apply: true } });
  const ecsv = `학번,학수번호,분반,구분\n${stu(1)},GEN1001,1,정규\n${stu(2)},GEN1001,01,\n${stu(3)},GEN1001,2,\n${stu(4)},GEN1001,3,\n${stu(5)},BUS2001,1,\n${stu(6)},BUS2001,2,\n${stu(7)},GEN1001,1,청강\n${stu(8)},MEC3001,1,\n${stu(1)},GEN1001,1,\n${stu(99)},GEN1001,1,\n${stu(9)},NOPE01,1,\n${stu(9)},GEN1001,1,미정\nabc,GEN1001,1,\n`;
  R.impEnr = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'enrollment', term_id: '2026-2', csv: ecsv } });
  R.impEnrApply = await call(base, 'POST', '/api/lms/a/import', { cookie: ck, body: { kind: 'enrollment', term_id: '2026-2', csv: ecsv, apply: true } });
  /* 일괄 수강신청 · 취소 */
  R.enrList = await call(base, 'POST', '/api/lms/a/enroll', { cookie: ck, body: { section_id: S.g1, member_nos: [] } });
  R.enrKind = await call(base, 'POST', '/api/lms/a/enroll', { cookie: ck, body: { section_id: S.g1, member_nos: [stu(10)], kind: 'x' } });
  R.enr = await call(base, 'POST', '/api/lms/a/enroll', { cookie: ck, body: { section_id: S.g1, member_nos: [stu(10), stu(11), stu(1), stu(98), 'x', stu(10), ' '] } });
  R.drop = await call(base, 'POST', '/api/lms/a/enroll-drop', { cookie: ck, body: { section_id: S.g1, member_no: stu(11) } });
  R.dropAgain = await call(base, 'POST', '/api/lms/a/enroll-drop', { cookie: ck, body: { section_id: S.g1, member_no: stu(11) } });
  R.reEnr = await call(base, 'POST', '/api/lms/a/enroll', { cookie: ck, body: { section_id: S.g1, member_nos: [stu(11)], kind: 'regular' } });
  R.persons = await call(base, 'GET', `/api/lms/a/persons?q=2026${P}&kind=student`, { cookie: ck });
  /* 담당 교수 · 공동교수 */
  R.staffRole = await call(base, 'POST', '/api/lms/a/staff', { cookie: ck, body: { section_id: S.g1, member_no: `P${P}001`, role: 'boss' } });
  R.staffKind = await call(base, 'POST', '/api/lms/a/staff', { cookie: ck, body: { section_id: S.g1, member_no: stu(1), role: 'professor' } });
  R.staffNone = await call(base, 'POST', '/api/lms/a/staff', { cookie: ck, body: { section_id: S.g1, member_no: 'Q99999', role: 'ta' } });
  R.staff1 = await call(base, 'POST', '/api/lms/a/staff', { cookie: ck, body: { section_id: S.g1, member_no: `P${P}001`, role: 'professor' } });
  R.staff2 = await call(base, 'POST', '/api/lms/a/staff', { cookie: ck, body: { section_id: S.g1, member_no: `P${P}002`, role: 'co_professor' } });
  R.staffDup = await call(base, 'POST', '/api/lms/a/staff', { cookie: ck, body: { section_id: S.g1, member_no: `P${P}001`, role: 'professor' } });
  R.staff3 = await call(base, 'POST', '/api/lms/a/staff', { cookie: ck, body: { section_id: S.g2, member_no: `P${P}001`, role: 'professor' } });
  /* 분반 동기화: 복제 → 자식 수정 · 삭제 → 재동기화 제외 → 원본 수정 반영 */
  R.syncMerged = null;
  R.sync1 = await call(base, 'POST', '/api/lms/a/sync', { cookie: ck, body: { section_id: S.g1 } });
  const st1 = await call(base, 'GET', '/api/state', { cookie: ck }); const d1 = st1.j.doc;
  X.c1Items = (d1.classes.find(k => k.id === 'c1').curriculum || []).map(i => i.id); X.c2Notices = (d1.classes.find(k => k.id === 'c2').notices || []).map(n => n.id);
  const c1 = d1.classes.find(k => k.id === 'c1'); c1.curriculum.find(i => i.syncSrc === 'it2').title = '분반에서 고친 제목';
  c1.curriculum = c1.curriculum.filter(i => i.syncSrc !== 'it3');
  const c0 = d1.classes.find(k => k.id === 'c0'); c0.curriculum.find(i => i.id === 'it4').title = '중간고사(수정)'; c0.curriculum = c0.curriculum.filter(i => i.id !== 'it5'); c0.curriculum.push({ id: 'it6', type: 'quiz', title: '퀴즈 추가' });
  await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc: d1, rev: st1.j.rev } });
  R.sync2 = await call(base, 'POST', '/api/lms/a/sync', { cookie: ck, body: { section_id: S.g1 } });
  R.sync3 = await call(base, 'POST', '/api/lms/a/sync', { cookie: ck, body: { section_id: S.g1 } });
  const st2 = await call(base, 'GET', '/api/state', { cookie: ck }); X.c1After = st2.j.doc.classes.find(k => k.id === 'c1').curriculum.map(i => [i.id, i.title]);
  R.hist = await call(base, 'GET', `/api/lms/a/sync-history?section_id=${S.g1}`, { cookie: ck });
  R.syncNone = await call(base, 'POST', '/api/lms/a/sync', { cookie: ck, body: { section_id: await secId(base, ck, 'MEC3001') } });
  /* 합반: b2(공유) → b1(대표) */
  R.mergeSelf = await call(base, 'POST', '/api/lms/a/merge', { cookie: ck, body: { rep_section_id: S.b1, section_ids: [S.b1] } });
  R.mergeTerm = await call(base, 'POST', '/api/lms/a/merge', { cookie: ck, body: { rep_section_id: S.b1, section_ids: [] } });
  R.merge = await call(base, 'POST', '/api/lms/a/merge', { cookie: ck, body: { rep_section_id: S.b1, section_ids: [S.b2] } });
  R.mergeAgain = await call(base, 'POST', '/api/lms/a/merge', { cookie: ck, body: { rep_section_id: S.b1, section_ids: [S.b2] } });
  R.syncRepChild = await call(base, 'POST', '/api/lms/a/sync', { cookie: ck, body: { section_id: S.b2 } });
  R.delRep = await call(base, 'POST', '/api/lms/a/section-delete', { cookie: ck, body: { section_id: S.b1 } });
  const st3 = await call(base, 'GET', '/api/state', { cookie: ck }); X.b1Cls = st3.j.doc.classes.find(k => k.id === 'c3'); X.b2Cls = st3.j.doc.classes.find(k => k.id === 'c4');
  R.rosterRep = await call(base, 'GET', `/api/lms/a/enrollments?section_id=${S.b1}`, { cookie: ck });
  /* 조교 · 청강 신청 */
  R.reqKind = await call(base, 'POST', '/api/lms/a/request', { cookie: ck, body: { section_id: S.g1, member_no: stu(12), kind: 'x' } });
  R.reqTa = await call(base, 'POST', '/api/lms/a/request', { cookie: ck, body: { section_id: S.g1, member_no: stu(12), kind: 'ta' } });
  R.reqTaDup = await call(base, 'POST', '/api/lms/a/request', { cookie: ck, body: { section_id: S.g1, member_no: stu(12), kind: 'ta' } });
  R.reqAud = await call(base, 'POST', '/api/lms/a/request', { cookie: ck, body: { section_id: S.g1, member_no: stu(3), kind: 'audit' } });
  R.reqAudDup = await call(base, 'POST', '/api/lms/a/request', { cookie: ck, body: { section_id: S.g1, member_no: stu(1), kind: 'audit' } });
  R.ovReq = await call(base, 'GET', '/api/lms/a/overview', { cookie: ck });
  R.decTa = await call(base, 'POST', '/api/lms/a/request-decide', { cookie: ck, body: { section_id: S.g1, member_no: stu(12), kind: 'ta', approve: true } });
  R.decAud = await call(base, 'POST', '/api/lms/a/request-decide', { cookie: ck, body: { section_id: S.g1, member_no: stu(3), kind: 'audit', approve: true } });
  R.decNone = await call(base, 'POST', '/api/lms/a/request-decide', { cookie: ck, body: { section_id: S.g1, member_no: stu(3), kind: 'audit', approve: false } });
  R.rosterAll = await call(base, 'GET', `/api/lms/a/enrollments?section_id=${S.g1}`, { cookie: ck });
  R.rosterGrade = await call(base, 'GET', `/api/lms/a/enrollments?section_id=${S.g1}&grading=1`, { cookie: ck });
  /* 교수(teacher) · 단과대학 관리자(sub + 범위) */
  const T = await userCookie(tid, 'teacher', tag); const U = await userCookie(tid, 'sub', tag);
  R.tNoLink = await call(base, 'GET', '/api/lms/a/overview', { cookie: T.ck });
  R.scopeRole = await call(base, 'POST', '/api/lms/a/scope', { cookie: U.ck, body: { email: T.email, units: [] } });
  R.scopeUser = await call(base, 'POST', '/api/lms/a/scope', { cookie: ck, body: { email: 'nobody@example.com', units: [] } });
  R.scopeUnits = await call(base, 'POST', '/api/lms/a/scope', { cookie: ck, body: { email: U.email, units: ['ENG', 'NOPE'] } });
  R.scopeT = await call(base, 'POST', '/api/lms/a/scope', { cookie: ck, body: { email: T.email, units: [], member_no: `P${P}001` } });
  R.scopeU = await call(base, 'POST', '/api/lms/a/scope', { cookie: ck, body: { email: U.email, units: ['ENG'] } });
  R.tOv = await call(base, 'GET', '/api/lms/a/overview', { cookie: T.ck });
  R.tTerm = await call(base, 'POST', '/api/lms/a/term', { cookie: T.ck, body: { term_id: '2027-1', name: 'x', starts_on: '2027-03-01', ends_on: '2027-06-01' } });
  R.tSyncOther = await call(base, 'POST', '/api/lms/a/sync', { cookie: T.ck, body: { section_id: S.b1 } });
  R.tStaff = await call(base, 'POST', '/api/lms/a/staff', { cookie: T.ck, body: { section_id: S.g2, member_no: `P${P}002`, role: 'co_professor' } });
  R.tPersons = await call(base, 'GET', '/api/lms/a/persons', { cookie: T.ck });
  R.tRoster = await call(base, 'GET', `/api/lms/a/enrollments?section_id=${S.g1}&grading=1`, { cookie: T.ck });
  R.uOv = await call(base, 'GET', '/api/lms/a/overview', { cookie: U.ck });
  R.uCourseOut = await call(base, 'POST', '/api/lms/a/course', { cookie: U.ck, body: { course_code: 'BUS2001', name: '데이터 분석(수정)', unit_code: 'BUS' } });
  R.uCourseIn = await call(base, 'POST', '/api/lms/a/course', { cookie: U.ck, body: { course_code: 'MEC4001', name: '로봇공학', unit_code: 'MEC' } });
  R.uSecOut = await call(base, 'POST', '/api/lms/a/section', { cookie: U.ck, body: { section_id: S.b1, title: 'x' } });
  R.uTerm = await call(base, 'POST', '/api/lms/a/term', { cookie: U.ck, body: { term_id: '2027-1', name: 'x', starts_on: '2027-03-01', ends_on: '2027-06-01' } });
  R.uImp = await call(base, 'POST', '/api/lms/a/import', { cookie: U.ck, body: { kind: 'person', csv: `학번,구분,학과코드\n${stu(30)},학생,MEC\n${stu(31)},학생,BUS\n${stu(32)},학생,\n` } });
  R.uPersons = await call(base, 'GET', '/api/lms/a/persons', { cookie: U.ck });
  /* 학습자: 내 분반(공유분반 숨김 → 대표분반) · 청강 신청 · 취소 */
  const L6 = await learnerCookie(tid, stu(6)); const Lx = await learnerCookie(tid, stu(77));
  R.lNo = await call(base, 'GET', '/api/lms/a/my');
  R.lUnknown = await call(base, 'GET', '/api/lms/a/my', { cookie: Lx });
  R.lMy = await call(base, 'GET', '/api/lms/a/my', { cookie: L6 });
  R.lReqBad = await call(base, 'POST', '/api/lms/a/my', { cookie: L6, body: { act: 'request', kind: 'audit', section_id: S.b2 } });
  R.lReq = await call(base, 'POST', '/api/lms/a/my', { cookie: L6, body: { act: 'request', kind: 'audit', section_id: S.g3 } });
  R.lReqDup = await call(base, 'POST', '/api/lms/a/my', { cookie: L6, body: { act: 'request', kind: 'audit', section_id: S.g3 } });
  R.lMy2 = await call(base, 'GET', '/api/lms/a/my', { cookie: L6 });
  R.lCancel = await call(base, 'POST', '/api/lms/a/my', { cookie: L6, body: { act: 'cancel', kind: 'audit', section_id: S.g3 } });
  R.lCancel2 = await call(base, 'POST', '/api/lms/a/my', { cookie: L6, body: { act: 'cancel', kind: 'audit', section_id: S.g3 } });
  R.lCsrf = await call(base, 'POST', '/api/lms/a/my', { cookie: L6, body: { act: 'cancel' }, csrf: false });
  /* 합반 해제 · 정리 */
  R.unmerge = await call(base, 'POST', '/api/lms/a/unmerge', { cookie: ck, body: { section_id: S.b2 } });
  R.unmergeAgain = await call(base, 'POST', '/api/lms/a/unmerge', { cookie: ck, body: { section_id: S.b2 } });
  R.ovEnd = await call(base, 'GET', '/api/lms/a/overview', { cookie: ck });
  R.unitDel = await call(base, 'POST', '/api/lms/a/unit-delete', { cookie: ck, body: { unit_code: 'NOPE' } });
  R.staffDel = await call(base, 'POST', '/api/lms/a/staff-delete', { cookie: ck, body: { section_id: S.g2, member_no: `P${P}002`, role: 'co_professor' } });
  R.staffDelAgain = await call(base, 'POST', '/api/lms/a/staff-delete', { cookie: ck, body: { section_id: S.g2, member_no: `P${P}002`, role: 'co_professor' } });
  return { R, X };
}
async function secId(base, ck, code) { const o = await call(base, 'GET', '/api/lms/a/overview', { cookie: ck }); const s = (o.j.sections || []).find(x => x.course_code === code); return s && s.section_id; }

/* 값 비교용 정규화: 시각 · uuid · 서버별 학번 접미 · rev · run_id · 이메일 */
const norm = (v, P) => JSON.parse(JSON.stringify(v === undefined ? null : v)
  .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/g, 'T').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'U')
  .replace(new RegExp(`2026${P}(\\d{3})`, 'g'), '2026X$1').replace(new RegExp(`P${P}00`, 'g'), 'PX00').replace(/"(rev|run_id)":\d+/g, '"$1":0').replace(/[a-z]+_[nj]_\d+@example\.com/g, 'E'));
const canon = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
const EXP = { edition: 403, noAuth: 401, csrf: 403, ov0: 200, termBad: 400, termName: 400, termDate: 400, term: 200, term1: 200, unitBad: 400, unitKind: 400, unitPar: 404, unit_ENG: 200, unit_CSE: 200, unitDelUsed: 409,
  courseBad: 400, courseCred: 400, courseCat: 400, courseUnit: 404, course1: 200, course2: 200, secNoTerm: 404, secNoCourse: 404, secBadNo: 400, secMode: 400, secCap: 400, secSch: 400, sec_g1: 200, sec_b2: 200, secDup: 409, secUpd: 200, secNotFound: 404, secBadId: 404,
  termDelUsed: 409, termDel: 200, courseDelUsed: 409, perBad: 400, perStu: 400, perKind: 400, perYear: 400, perProf: 200, perDup: 409, impHead: 400, impEmpty: 400, impKind: 400, impBig: 413, impPrev: 200, impApply: 200, impAgain: 200, impSecTerm: 400, impSec: 200, impEnr: 200, impEnrApply: 200,
  enrList: 400, enrKind: 400, enr: 200, drop: 200, dropAgain: 404, reEnr: 200, persons: 200, staffRole: 400, staffKind: 400, staffNone: 404, staff1: 200, staff2: 200, staffDup: 409, staff3: 200, sync1: 200, sync2: 200, sync3: 200, hist: 200, syncNone: 400,
  mergeSelf: 400, mergeTerm: 400, merge: 200, mergeAgain: 400, syncRepChild: 400, delRep: 409, rosterRep: 200, reqKind: 400, reqTa: 200, reqTaDup: 409, reqAud: 200, reqAudDup: 409, ovReq: 200, decTa: 200, decAud: 200, decNone: 404, rosterAll: 200, rosterGrade: 200,
  tNoLink: 200, scopeRole: 403, scopeUser: 404, scopeUnits: 400, scopeT: 200, scopeU: 200, tOv: 200, tTerm: 403, tSyncOther: 403, tStaff: 200, tPersons: 403, tRoster: 200, uOv: 200, uCourseOut: 403, uCourseIn: 200, uSecOut: 403, uTerm: 403, uImp: 200, uPersons: 200,
  lNo: 401, lUnknown: 200, lMy: 200, lReqBad: 404, lReq: 200, lReqDup: 409, lMy2: 200, lCancel: 200, lCancel2: 404, lCsrf: 403, unmerge: 200, unmergeAgain: 400, ovEnd: 200, unitDel: 404, staffDel: 200, staffDelAgain: 404 };

function checks(o, who) {
  const { R, X } = o; const J = k => R[k] && R[k].j;
  for (const [k, s] of Object.entries(EXP)) ok(R[k] && R[k].st === s, `${who} ${k}: 기대 ${s} 실제 ${R[k] && R[k].st} ${JSON.stringify(J(k)).slice(0, 200)}`);
  const ip = J('impPrev'); ok(ip && ip.total === 19 && ip.ok === 13 && ip.error === 6 && ip.skip === 0, `${who} CSV 미리보기 집계 ${ip && JSON.stringify({ t: ip.total, o: ip.ok, e: ip.error, s: ip.skip })}`);
  ok(ip && ip.errors.map(e => e.line).join(',') === '14,15,16,17,18,19', `${who} CSV 오류 행 ${ip && ip.errors.map(e => e.line + ':' + e.msg).join(' | ')}`);
  ok(J('impApply') && J('impApply').applied === true && J('impApply').counts.inserted === 13 && J('impApply').run_id > 0, `${who} CSV 반영 · 실행 기록`);
  ok(J('impAgain') && J('impAgain').skip === 13 && J('impAgain').ok === 0, `${who} 다시 올리면 건너뜀`);
  ok(J('impSec') && J('impSec').counts.inserted === 2 && J('impSec').skip === 1 && J('impSec').error === 5, `${who} 분반 CSV ${JSON.stringify(J('impSec') && J('impSec').errors)}`);
  ok(J('impEnr') && J('impEnr').ok === 8 && J('impEnr').error === 5, `${who} 수강 CSV ${JSON.stringify(J('impEnr') && J('impEnr').errors)}`);
  ok(J('enr') && J('enr').added === 2 && J('enr').skipped === 1 && J('enr').errors.length === 2, `${who} 일괄 수강신청 ${JSON.stringify(J('enr'))}`);
  const s1 = J('sync1'); ok(s1 && s1.sections === 2 && s1.copied === 12 && s1.excluded === 0, `${who} 동기화 1회 ${JSON.stringify(s1)}`);
  const s2 = J('sync2'); ok(s2 && s2.copied === 2 && s2.updated === 2 && s2.deleted === 2 && s2.excluded === 2, `${who} 동기화 2회(수정 · 삭제분 제외, 원본 수정 · 삭제 · 추가 반영) ${JSON.stringify(s2)}`);
  const s3 = J('sync3'); ok(s3 && s3.copied === 0 && s3.updated === 0 && s3.excluded === 2 && s3.unchanged === 10, `${who} 동기화 3회 ${JSON.stringify(s3)}`);
  ok(X.c1After && X.c1After.some(([, t]) => t === '분반에서 고친 제목') && !X.c1After.some(([i]) => i === 'it3-02') && X.c1After.some(([i]) => i === 'own1') && X.c1After.some(([i, t]) => i === 'it4-02' && t === '중간고사(수정)'), `${who} 분반 강의실 결과 ${JSON.stringify(X.c1After)}`);
  ok(X.b1Cls && X.b1Cls.learners.join() === 'm1,m4,m5' && X.b1Cls.prog.m5.p === 90 && X.b1Cls.prog.m1.p === 70 && X.b2Cls.learners.length === 0 && X.b2Cls.mergedInto === 'c3', `${who} 합반 활동 이전 ${JSON.stringify([X.b1Cls, X.b2Cls])}`);
  ok(J('merge') && J('merge').moved === 1, `${who} 합반 moved`);
  const rg = J('rosterGrade'); ok(rg && rg.rows.length > 0 && rg.rows.every(r => r.kind === 'regular' && r.enr_status === 'enrolled') && J('rosterAll').rows.some(r => r.kind === 'audit'), `${who} 성적 명단에서 청강생 제외`);
  const lm = J('lMy'); ok(lm && lm.sections.length === 1 && lm.sections[0].section_no === '01' && lm.sections[0].via === '02' && lm.sections[0].course_code === 'BUS2001', `${who} 학습자 공유분반 → 대표분반 ${JSON.stringify(lm && lm.sections)}`);
  ok(J('lUnknown') && J('lUnknown').me === null, `${who} 학사 미등록 학습자`);
  ok(J('lMy2') && J('lMy2').requests.length === 1 && J('lMy2').requests[0].kind === 'audit', `${who} 학습자 청강 신청 목록`);
  ok(J('tOv') && J('tOv').sections.length === 2 && J('tOv').sections.every(s => s.course_code === 'GEN1001') && J('tOv').runs.length === 0, `${who} 교수: 담당 분반만`);
  ok(J('tNoLink') && J('tNoLink').sections.length === 0, `${who} 교수(사번 미연결): 분반 없음`);
  ok(J('uOv') && J('uOv').sections.length > 0 && J('uOv').sections.every(s => ['CSE', 'MEC'].includes(s.unit_code)) && J('uOv').me.units.join() === 'ENG', `${who} 단과대학 관리자 범위`);
  ok(J('uImp') && J('uImp').ok === 1 && J('uImp').error === 2, `${who} 단과대학 범위 CSV`);
  ok(J('uPersons') && J('uPersons').rows.length > 0 && J('uPersons').rows.every(r => ['CSE', 'MEC'].includes(r.unit_code)), `${who} 단과대학 범위 구성원`);
  const ov = J('ovEnd'); ok(ov && ov.scopes.length === 2 && ov.sections.find(s => s.section_id === X.S.b2).hidden === false && ov.runs.length === 3, `${who} 개요(범위 목록 · 합반 해제 · 실행 기록)`);
  ok(J('ovReq') && J('ovReq').requests.length === 2, `${who} 신청 목록`);
  ok(J('persons') && J('persons').rows.every(r => !('name' in r) && !('phone' in r) && !('email' in r)), `${who} 구성원 응답에 이름 · 연락처 없음`);
}

(async () => {
  const n = await scenario(A, 'n'); checks(n, 'Node');
  if (B) {
    const j = await scenario(B, 'j'); checks(j, 'Java');
    for (const k of Object.keys(n.R)) {
      const x = n.R[k], y = j.R[k]; if (!x) continue; if (!y) { ok(false, `${k}: Java 결과 없음`); continue; }
      ok(x.st === y.st, `${k}: 상태코드 Node ${x.st} ≠ Java ${y.st}`);
      if (x.j && x.j.error) ok(x.j.error === (y.j && y.j.error) && x.j.message === (y.j && y.j.message), `${k}: 오류 N ${x.j.error}/${x.j.message} J ${y.j && y.j.error}/${y.j && y.j.message}`);
      else { const a = canon(norm(x.j, '1')), b = canon(norm(y.j, '2')); ok(a === b, `${k}: 본문 다름\n   N ${a.slice(0, 1500)}\n   J ${b.slice(0, 1500)}`); }
    }
    ok(canon(norm(n.X.c1After, '1')) === canon(norm(j.X.c1After, '2')), '동기화 결과 강의실 같음');
    ok(canon(n.X.b1Cls) === canon(j.X.b1Cls) && canon(n.X.b2Cls) === canon(j.X.b2Cls), '합반 결과 강의실 같음');
    /* 서버 간 호환: Node가 만든 분반을 Java가 동기화(이력 공유) */
    const cx = await call(B, 'POST', '/api/lms/a/sync', { cookie: n.X.ck, body: { section_id: n.X.S.g1 } });
    ok(cx.st === 200 && cx.j.copied === 0 && cx.j.updated === 0 && cx.j.excluded === 2, `Node 기관 → Java 재동기화(이력 · 해시 호환) ${JSON.stringify(cx.j)}`);
    const cy = await call(A, 'GET', '/api/lms/a/overview', { cookie: j.X.ck }); const cz = await call(B, 'GET', '/api/lms/a/overview', { cookie: j.X.ck });
    ok(cy.st === 200 && canon(cy.j) === canon(cz.j), 'Java 기관 개요: Node · Java 같은 바이트');
  }
  console.log(`묶음 A 대조: 통과 ${pass} / 실패 ${fail}`);
  if (fail) { console.log(errs.map(e => ' ✗ ' + e).join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
