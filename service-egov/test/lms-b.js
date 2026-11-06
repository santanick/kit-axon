'use strict';
/* v30 묶음 B 대조 테스트 — 강의실 구성(주차 · 차시 · 자원 · SCORM · 조건부/순차/수준별/적응형 · 템플릿 · 복사 · 백업 · 휴지통 · 버전 · 공유 · 역할/메뉴).
   Node 서버와 Java(전자정부) 서버에 같은 시나리오를 돌려 상태코드 · 응답 본문(uuid · 시각 정규화)을 비교한다.
   기관은 서버마다 따로 가입하고, 같은 학번 · 같은 데이터로 채우므로 정규화한 본문이 같아야 한다.
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/<db> node test/lms-b.js http://127.0.0.1:<node> [http://127.0.0.1:<java>] */
const path = require('node:path');
let pg; try { pg = require('pg'); } catch { pg = require(path.join(__dirname, '../../service/server/node_modules/pg')); }
const DBURL = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/ddw1';

async function call(base, method, p, { body, cookie, csrf = true } = {}) {
  const h = {}; if (csrf && method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (body !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  const sc = r.headers.get('set-cookie'); return { st: r.status, j, ck: sc ? sc.split(';')[0] : null };
}
async function learnerCookie(tid, sid) { const crypto = require('node:crypto'); const t = crypto.randomBytes(32).toString('base64url'); await db(c => c.query("insert into learner_sessions (id, tenant_id, sid, expires_at) values ($1, $2, $3, now() + interval '1 hour')", [crypto.createHash('sha256').update(t).digest('hex'), tid, sid])); return 'dd_lsid=' + t; }
async function db(fn) { const c = new pg.Client({ connectionString: DBURL }); await c.connect(); try { return await fn(c); } finally { await c.end(); } }
/* 기관 하나 + 학기 2개 · 교과목 · 분반 2개(이전 학기 · 이번 학기) · 교수/조교/채점자/학생 4명 */
async function setup(base, tag) {
  /* 가입 API는 IP당 시간 10회 제한이 있어 기관 · 운영자 · 세션을 DB에 바로 만든다(scrypt 비밀번호는 쓰지 않음) */
  const crypto = require('node:crypto'); const tok = crypto.randomBytes(32).toString('base64url'); const tid = 'tn_' + crypto.randomBytes(6).toString('hex');
  await db(async c => { await c.query("insert into tenants (id, name, type) values ($1, '대조 국립대', 'univ')", [tid]);
    const u = (await c.query("insert into users (tenant_id, email, pw, role) values ($1, $2, 'scrypt$x$y', 'owner') returning id", [tid, `lmsbcd_${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`])).rows[0].id;
    await c.query("insert into sessions (id, user_id, tenant_id, expires_at) values ($1, $2, $3, now() + interval '2 hours')", [crypto.createHash('sha256').update(tok).digest('hex'), u, tid]); });
  const ck = 'dd_sid=' + tok;
  const ids = await db(async c => {
    await c.query('begin'); await c.query('set local role didisam_tenant'); await c.query("select set_config('app.tenant', $1, true)", [tid]);
    await c.query(`insert into lms_term (tenant_id, term_id, name, starts_on, ends_on) values ($1, '2026-1', '2026학년도 1학기', '2026-03-02', '2026-06-20'), ($1, '2026-2', '2026학년도 2학기', '2026-09-01', '2026-12-19')`, [tid]);
    await c.query(`insert into lms_org_unit (tenant_id, unit_code, name) values ($1, 'CSE', '컴퓨터공학과'), ($1, 'BUS', '경영학과')`, [tid]);
    await c.query(`insert into lms_course (tenant_id, course_code, name, credits, unit_code, category) values ($1, 'CSE2001', '자료구조', 3, 'CSE', 'major')`, [tid]);
    const s1 = (await c.query(`insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode, capacity, syllabus) values ($1, '2026-1', 'CSE2001', '01', '자료구조(01) 1학기', 'offline', 40, '{}') returning section_id`, [tid])).rows[0].section_id;
    const s2 = (await c.query(`insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode, capacity, syllabus) values ($1, '2026-2', 'CSE2001', '01', '자료구조(01)', 'blended', 40, $2) returning section_id`, [tid, JSON.stringify({ weeks: [{ week: 1, title: '오리엔테이션', plan: '강의 소개' }, { week: 2, title: '배열과 리스트', plan: '선형 자료구조' }] })])).rows[0].section_id;
    const P = {};
    for (const [no, kind, unit, yr] of [['P2026001', 'professor', 'CSE', null], ['T2026001', 'student', 'CSE', 4], ['G2026001', 'staff', 'CSE', null], ['S2026001', 'staff', 'CSE', null], ['20261001', 'student', 'CSE', 2], ['20261002', 'student', 'CSE', 2], ['20261003', 'student', 'BUS', 3], ['20261004', 'student', 'BUS', 1]])
      P[no] = (await c.query('insert into lms_person (tenant_id, member_no, kind, unit_code, grade_year, source) values ($1, $2, $3, $4, $5, \'manual\') returning person_id', [tid, no, kind, unit, yr])).rows[0].person_id;
    for (const s of [s1, s2]) {
      await c.query(`insert into lms_section_staff (tenant_id, section_id, person_id, role, source) values ($1, $2, $3, 'professor', 'manual'), ($1, $2, $4, 'ta', 'manual'), ($1, $2, $5, 'grader', 'manual')`, [tid, s, P.P2026001, P.T2026001, P.G2026001]);
      for (const no of ['20261001', '20261002', '20261003', '20261004']) await c.query(`insert into lms_enrollment (tenant_id, section_id, person_id, kind, source, enrolled_at) values ($1, $2, $3, $4, 'manual', '2026-08-20T01:00:00Z')`, [tid, s, P[no], no === '20261004' ? 'audit' : 'regular']);
    }
    await c.query('commit'); return { s1, s2, P };
  });
  return { ck, tid, ...ids };
}
/* uuid · 시각 · 기관 ID 정규화 */
const UU = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const norm0 = v => JSON.parse(JSON.stringify(v ?? null).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'U').replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})/g, 'T').replace(/tn_[a-z0-9]{8,16}/g, 'TN').replace(/lmsbcd_[a-z]_\d+_[a-z0-9]+@example\.com/g, 'EM'));
/* uuid 키 객체 → 정렬한 값 배열, 일련번호 id → N (두 서버가 같은 DB를 쓰므로 bigserial 값은 다르다) */
const deep = v => { if (Array.isArray(v)) return v.map(deep); if (v && typeof v === 'object') { const ks = Object.keys(v); if (ks.length && ks.every(k => UU.test(k))) return ks.map(k => JSON.stringify(deep(v[k]))).sort(); const o = {}; for (const k of ks) o[k] = (k === 'id' && typeof v[k] === 'number') ? 'N' : deep(v[k]); return o; } return v; };
const norm = v => norm0(deep(v ?? null));
function compare(RA, RB, okf, label) {
  for (const k of Object.keys(RA)) {
    const a = RA[k], b = RB[k];
    okf(a.st === b.st, `${label}.${k} 상태 Node ${a.st} ≠ Java ${b && b.st}`);
    const ja = JSON.stringify(norm(a.j)), jb = JSON.stringify(norm(b && b.j));
    okf(ja === jb, `${label}.${k} 본문 다름\n  N ${ja.slice(0, 400)}\n  J ${jb.slice(0, 400)}`);
  }
}
async function run(scenario, EXP, label) {
  const [A, B] = [process.argv[2] || 'http://127.0.0.1:8201', process.argv[3] || ''];
  let pass = 0, fail = 0; const errs = []; const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
  const RA = await scenario(A, 'n');
  for (const [k, st] of Object.entries(EXP)) ok(RA[k] && RA[k].st === st, `Node ${label}.${k}: 기대 ${st}, 실제 ${RA[k] && RA[k].st} ${RA[k] && JSON.stringify(RA[k].j).slice(0, 200)}`);
  if (B) { const RB = await scenario(B, 'j'); for (const [k, st] of Object.entries(EXP)) ok(RB[k] && RB[k].st === st, `Java ${label}.${k}: 기대 ${st}, 실제 ${RB[k] && RB[k].st} ${RB[k] && JSON.stringify(RB[k].j).slice(0, 200)}`); compare(RA, RB, ok, label); }
  console.log(errs.slice(0, 40).join('\n'));
  console.log(`${label} 대조: 검사 ${pass + fail} · 통과 ${pass} · 실패 ${fail}${B ? '' : ' (Node만)'}`);
  return fail;
}

/* 아주 작은 SCORM 1.2 패키지(매니페스트를 브라우저가 풀어 보낸 결과 형태) */
const MANI = { version: '1.2', identifier: 'pkg1', title: '자료구조 이러닝', scos: [{ id: 'sco1', title: '1장', href: 'index.html' }, { id: 'sco2', title: '2장', href: 'ch2/index.html' }], files: ['index.html', 'ch2/index.html'] };

async function scenario(base, tag) {
  const R = {}; const { ck, s1, s2, tid, P: PP } = await setup(base, tag); void PP;
  const G = (p, as) => call(base, 'GET', `/api/lms/b/${p}${as ? (p.includes('?') ? '&' : '?') + 'as=' + as : ''}`, { cookie: ck });
  const P = (p, body) => call(base, 'POST', `/api/lms/b/${p}`, { cookie: ck, body });
  R.noAuth = await call(base, 'GET', `/api/lms/b/overview?section=${s2}`);
  R.csrf = await call(base, 'POST', '/api/lms/b/week-save', { cookie: ck, body: {}, csrf: false });
  R.nf = await G('nope');
  R.badSec = await G('overview?section=x');
  R.sections = await G('sections');
  R.tpls = await G('templates');
  R.tplApply = await P('template-apply', { section: s1, template: 'offline' });
  R.syl = await P('syllabus-import', { section: s2 });
  R.sylNone = await P('syllabus-import', { section: s1 });
  R.week = await P('week-save', { section: s2, week_no: 3, title: '스택과 큐', starts_on: '2026-09-15', ends_on: '2026-09-21', summary: 'LIFO · FIFO' });
  R.weekBad = await P('week-save', { section: s2, week_no: 99 });
  R.ses1 = await P('session-save', { section: s2, week_no: 1, seq: 1, title: '강의 소개', kind: 'online', open_at: '2026-09-01T09:00', close_at: '2026-09-14T23:59', required_sec: 600 });
  R.ses2 = await P('session-save', { section: s2, week_no: 2, seq: 1, title: '배열', kind: 'class', prereq: [R.ses1.j.id] });
  R.sesDup = await P('session-save', { section: s2, week_no: 2, seq: 1, title: '중복' });
  R.sesBadKind = await P('session-save', { section: s2, week_no: 2, seq: 2, kind: 'party' });
  const ses1 = R.ses1.j.id, ses2 = R.ses2.j.id;
  R.r1 = await P('res-save', { section: s2, session_id: ses1, kind: 'page', title: '강의 계획 안내', body: { html: '<p>안녕하세요</p>' }, completion: { type: 'view' } });
  R.r2 = await P('res-save', { section: s2, session_id: ses1, kind: 'url', title: '참고 사이트', body: { url: 'https://example.com/ds' }, completion: { type: 'view' }, access: { after: [R.r1.j.id] } });
  R.rBadUrl = await P('res-save', { section: s2, kind: 'url', title: 'x', body: { url: 'javascript:alert(1)' } });
  R.rBadKind = await P('res-save', { section: s2, kind: 'exe', title: 'x' });
  R.r3 = await P('res-save', { section: s2, session_id: ses2, kind: 'label', title: '2주차 표지', body: { text: '배열 단원' } });
  R.r4 = await P('res-save', { section: s2, session_id: ses2, kind: 'page', title: '심화 읽기', body: { html: '<p>심화</p>' }, access: { levels: ['advanced'] }, completion: { type: 'view' }, share: 'shared' });
  R.file = await P('file-put', { section: s2, name: '강의안.txt', mime: 'text/plain', b64: Buffer.from('자료구조 강의안').toString('base64') });
  R.fileExe = await P('file-put', { section: s2, name: 'a.exe', b64: 'AA==' });
  R.r5 = await P('res-save', { section: s2, kind: 'file', title: '강의안', body: { file_id: R.file.j.id, name: '강의안.txt', size: R.file.j.size } });
  R.fileGet = await G(`file?id=${R.file.j.id}`);
  R.r1edit = await P('res-save', { id: R.r1.j.id, title: '강의 계획 안내(수정)', body: { html: '<p>수정본</p>' } });
  R.vers = await G(`res-versions?id=${R.r1.j.id}`);
  R.revert = await P('res-revert', { id: R.r1.j.id, ver: 1 });
  /* SCORM */
  R.pkg = await P('scorm-pkg', { section: s2, session_id: ses2, title: '이러닝 1장', manifest: MANI });
  R.pkgBad = await P('scorm-pkg', { section: s2, manifest: { version: '1.2', scos: [{ id: 'x', href: '../etc/passwd' }] } });
  R.fput = await P('scorm-file-put', { pkg: R.pkg.j.pkg_id, path: 'index.html', mime: 'text/html', b64: Buffer.from('<html><body>SCO</body></html>').toString('base64') });
  R.fputBad = await P('scorm-file-put', { pkg: R.pkg.j.pkg_id, path: '../x', b64: 'AA==' });
  R.fget = await G(`scorm-file?pkg=${R.pkg.j.pkg_id}&path=index.html`);
  R.scorm = await G(`scorm?resource=${R.pkg.j.id}`, '20261001');
  R.commit1 = await P('scorm-commit', { as: '20261001', resource: R.pkg.j.id, sco: 'sco1', cmi: { 'cmi.core.lesson_status': 'incomplete', 'cmi.core.lesson_location': 'p3', 'cmi.suspend_data': 'abc', 'cmi.core.session_time': '0000:05:30.00', 'cmi.core.exit': 'suspend' }, finish: true });
  R.commit2 = await P('scorm-commit', { as: '20261001', resource: R.pkg.j.id, sco: 'sco1', cmi: { 'cmi.core.lesson_status': 'passed', 'cmi.core.score.raw': '88', 'cmi.core.session_time': '0000:02:00' }, finish: true });
  R.commitBad = await P('scorm-commit', { as: '20261001', resource: R.pkg.j.id, sco: 'sco1', cmi: { 'evil.key': 'x' } });
  R.commitSco = await P('scorm-commit', { as: '20261001', resource: R.pkg.j.id, sco: 'nope', cmi: {} });
  R.scormResume = await G(`scorm?resource=${R.pkg.j.id}`, '20261001');
  R.scormRep = await G(`scorm-report?resource=${R.pkg.j.id}`);
  R.scormRepStu = await G(`scorm-report?resource=${R.pkg.j.id}`, '20261002');
  /* 학생 화면 · 조건부 · 순차 · 수준별 */
  R.ovStu = await G(`overview?section=${s2}`, '20261001');
  R.markLocked = await P('progress-mark', { as: '20261001', resource: R.r2.j.id });
  R.mark1 = await P('progress-mark', { as: '20261001', resource: R.r1.j.id });
  R.mark2 = await P('progress-mark', { as: '20261001', resource: R.r2.j.id });
  R.levelSet = await P('level-set', { section: s2, no: '20261001', level: 'advanced' });
  R.levelBad = await P('level-set', { section: s2, no: '20261001', level: 'genius' });
  R.optSeq = await P('opt-set', { section: s2, sequential: true, adaptive: [{ if_res: R.pkg.j.id, below: 90, then: [R.r3.j.id], else: [R.r4.j.id] }] });
  R.ovStu2 = await G(`overview?section=${s2}`, '20261002');
  R.next = await G(`next?section=${s2}`, '20261001');
  R.progress = await G(`progress?section=${s2}`);
  R.progressStu = await G(`progress?section=${s2}`, '20261001');
  R.notMember = await G(`overview?section=${s2}`, 'S2026001');
  R.noPerson = await G(`overview?section=${s2}`, '99999999');
  R.stuEdit = await P('res-save', { as: '20261001', section: s2, kind: 'label', title: '학생이 만든 것' });
  R.taEdit = await P('res-save', { as: 'T2026001', section: s2, kind: 'label', title: '조교 공지 표지' });
  R.graderEdit = await P('res-save', { as: 'G2026001', section: s2, kind: 'label', title: '채점자' });
  /* 휴지통 · 버전 */
  R.del = await P('res-del', { id: R.r3.j.id });
  R.delAgain = await P('res-del', { id: R.r3.j.id });
  R.trash = await G(`trash?section=${s2}`);
  R.restore = await P('res-restore', { id: R.r3.j.id });
  R.del2 = await P('res-del', { id: R.taEdit.j.id });
  R.purgeTa = await P('res-purge', { as: 'T2026001', id: R.taEdit.j.id });
  R.purge = await P('res-purge', { id: R.taEdit.j.id });
  /* 공유 · 재사용 */
  R.lib = await G('library');
  R.reuse = await P('res-reuse', { section: s1, src: R.r4.j.id });
  /* 타임라인 · 기간 이동 · 템플릿 저장 · 복사 */
  R.timeline = await G(`timeline?section=${s2}`);
  R.shift = await P('shift', { section: s2, days: 7 });
  R.shift0 = await P('shift', { section: s2, days: 0 });
  R.tplSave = await P('template-save', { section: s2, name: '자료구조 표준' });
  R.tpls2 = await G('templates');
  R.copy = await P('copy', { from: s2, to: s1, parts: ['structure', 'resources'] });
  R.copySelf = await P('copy', { from: s2, to: s2 });
  R.ovCopied = await G(`overview?section=${s1}`);
  /* 백업 · 복구 */
  R.bk = await P('backup', { section: s2, parts: ['structure', 'resources'], note: '중간 점검' });
  R.bks = await G(`backups?section=${s2}`);
  R.bkGet = await G(`backup-get?backup=${R.bk.j.id}`);
  R.restoreStu = await P('restore', { as: '20261001', backup: R.bk.j.id });
  R.restoreTa = await P('restore', { as: 'T2026001', backup: R.bk.j.id });
  R.restoreBad = await P('restore', { backup: R.bk.j.id, parts: ['boards'] });
  R.restorePart = await P('restore', { backup: R.bk.j.id, parts: ['resources'], mode: 'replace' });
  R.bkImp = await P('backup-import', { section: s1, data: R.bkGet.j, note: '파일에서' });
  R.bkImpBad = await P('backup-import', { section: s1, data: { x: 1 } });
  R.ovAfter = await G(`overview?section=${s2}`);
  /* 역할 · 권한 · 메뉴 */
  R.perms = await G('perms');
  R.permSet = await P('perm-set', { role: 'ta', perm: 'backup', allowed: true });
  R.permBad = await P('perm-set', { role: 'professor', perm: 'course.view', allowed: false });
  R.taBackup = await P('backup', { as: 'T2026001', section: s2, parts: ['structure'] });
  R.menuSet = await P('menu-set', { section: s2, modules: [{ id: 'board', on: true }, { id: 'wiki', on: false }] });
  R.menuPref = await P('menu-pref', { as: '20261001', section: s2, hidden: ['chat'], order: ['board', 'forum'] });
  R.menu = await G(`menu?section=${s2}`, '20261001');
  R.menuStu = await P('menu-set', { as: '20261001', section: s2, modules: [] });
  /* 학습자 포털 세션(dd_lsid → 학번): 학번으로 고정, as 전환 무시, 운영자 전용 경로 거부 */
  const lck = await learnerCookie(tid, '20261002');
  R.lOverview = await call(base, 'GET', `/api/lms/b/overview?section=${s2}&as=P2026001`, { cookie: lck });
  R.lSections = await call(base, 'GET', '/api/lms/b/sections', { cookie: lck });
  R.lEdit = await call(base, 'POST', '/api/lms/b/res-save', { cookie: lck, body: { section: s2, kind: 'label', title: '학생' } });
  R.lPerm = await call(base, 'POST', '/api/lms/b/perm-set', { cookie: lck, body: { role: 'ta', perm: 'grade', allowed: true } });
  R.lMark = await call(base, 'POST', '/api/lms/b/progress-mark', { cookie: lck, body: { resource: R.r1.j.id, score: 100 } });
  R.lNone = await call(base, 'GET', `/api/lms/b/overview?section=${s2}`, { cookie: await learnerCookie(tid, '99990000') });
  /* E 과제 · F 시험 결과 → 진도 · 이수 조건 자동 반영(제출 · 채점 · 응시를 DB에 넣으면 트리거가 반영) */
  const ext = await db(async c => { await c.query('begin'); await c.query('set local role didisam_tenant'); await c.query("select set_config('app.tenant', $1, true)", [tid]);
    const asg = (await c.query("insert into lms_assignment (tenant_id, section_id, title, status, max_score) values ($1, $2, '자료구조 과제 1', 'published', 100) returning asg_id", [tid, s2])).rows[0].asg_id;
    const ex = (await c.query("insert into lms_exam (tenant_id, section_id, title, status, score_policy) values ($1, $2, '쪽지 시험', 'published', 'best') returning exam_id", [tid, s2])).rows[0].exam_id;
    await c.query('commit'); return { asg, ex }; });
  R.extList = await G(`ext-list?section=${s2}`);
  R.rAsg = await P('res-save', { section: s2, kind: 'assign', title: '과제 1 연결', body: { ref: ext.asg }, completion: { type: 'score', score: 70 } });
  R.rAsgBad = await P('res-save', { section: s2, kind: 'assign', title: 'x', body: { ref: '00000000-0000-4000-8000-000000000000' } });
  R.rExam = await P('res-save', { section: s2, kind: 'exam', title: '쪽지 시험 연결', body: { ref: ext.ex }, completion: { type: 'score', score: 50 } });
  R.rGated = await P('res-save', { section: s2, kind: 'page', title: '과제 통과 후 자료', body: { html: '<p>x</p>' }, access: { min_score: { res: R.rAsg.j.id, score: 80 } } });
  await db(async c => { await c.query('begin'); await c.query('set local role didisam_tenant'); await c.query("select set_config('app.tenant', $1, true)", [tid]);
    const pid = (await c.query("select person_id from lms_person where member_no = '20261003'")).rows[0].person_id;
    await c.query("insert into lms_submission (tenant_id, asg_id, owner_key, person_id, status, submitted_at) values ($1, $2, 'p:' || $3::text, $3::uuid, 'submitted', now())", [tid, ext.asg, pid]);
    await c.query("update lms_submission set status = 'graded', score = 85, graded_at = now() where tenant_id = $1 and asg_id = $2", [tid, ext.asg]);
    await c.query("insert into lms_exam_attempt (tenant_id, exam_id, person_id, no, status, deadline_at, score, max_score) values ($1, $2, $3, 1, 'graded', now(), 40, 100), ($1, $2, $3, 2, 'graded', now(), 65, 100)", [tid, ext.ex, pid]);
    await c.query('commit'); });
  R.extProg = await G(`progress?section=${s2}`);
  R.extStu = await G(`overview?section=${s2}`, '20261003');
  R.extMark = await P('progress-mark', { as: '20261003', resource: R.rAsg.j.id });
  R.sesDel = await P('session-del', { section: s2, id: ses2 });
  R.weekDel = await P('week-del', { section: s2, week_no: 3 });
  return R;
}
const EXP = { noAuth: 401, csrf: 403, nf: 404, badSec: 404, sections: 200, tpls: 200, tplApply: 200, syl: 200, sylNone: 409, week: 200, weekBad: 400, ses1: 200, ses2: 200, sesDup: 409, sesBadKind: 400,
  r1: 200, r2: 200, rBadUrl: 400, rBadKind: 400, r3: 200, r4: 200, file: 200, fileExe: 400, r5: 200, fileGet: 200, r1edit: 200, vers: 200, revert: 200,
  pkg: 200, pkgBad: 400, fput: 200, fputBad: 400, fget: 200, scorm: 200, commit1: 200, commit2: 200, commitBad: 400, commitSco: 404, scormResume: 200, scormRep: 200, scormRepStu: 403,
  ovStu: 200, markLocked: 403, mark1: 200, mark2: 200, levelSet: 200, levelBad: 400, optSeq: 200, ovStu2: 200, next: 200, progress: 200, progressStu: 403, notMember: 200, noPerson: 404,
  stuEdit: 403, taEdit: 200, graderEdit: 403, del: 200, delAgain: 409, trash: 200, restore: 200, del2: 200, purgeTa: 403, purge: 200, lib: 200, reuse: 200,
  timeline: 200, shift: 200, shift0: 400, tplSave: 200, tpls2: 200, copy: 200, copySelf: 404, ovCopied: 200, bk: 200, bks: 200, bkGet: 200, restoreStu: 403, restoreTa: 403, restoreBad: 400, restorePart: 200, bkImp: 200, bkImpBad: 400, ovAfter: 200,
  lOverview: 200, lSections: 200, lEdit: 403, lPerm: 403, lMark: 403, lNone: 403, extList: 200, rAsg: 200, rAsgBad: 400, rExam: 200, rGated: 200, extProg: 200, extStu: 200, extMark: 200, perms: 200, permSet: 200, permBad: 400, taBackup: 200, menuSet: 200, menuPref: 200, menu: 200, menuStu: 403, sesDel: 200, weekDel: 200 };

module.exports = { learnerCookie, call, db, setup, norm, compare, run, scenario, EXP };
if (require.main === module) run(scenario, EXP, 'lms-b').then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1); });
