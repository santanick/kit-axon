'use strict';
/* v30 학사 LMS(대학 · 전교생 메인 LMS) — 학기 · 조직 · 교과목 · 분반 · 수강 · 학사 CSV · 분반 동기화 · 합반 · 조교/청강 신청 · 단과대학 관리 범위.
   근거: 전남대 e클래스2.0 RFP SFR-003 · 018 · 019 · 021 · 025 · 031 · 050 · 051 · 052. 규격: service/lms-domain/API.md
   원칙: 모든 lms_* 조회 · 쓰기는 inTenant(RLS). 구성원은 학번(사번) · 학과 · 학적만 저장한다(이름 · 연락처 없음).
   응답 JSON은 SQL(json_build_object)이 만든다 → 전자정부 Java 에디션이 같은 SQL로 같은 바이트를 낸다(test/contract.js 대조). */
const crypto = require('node:crypto');

const E = {
  lms_edition: [403, '학사 LMS(대학) 기관에서만 쓸 수 있습니다.'],
  lms_role: [403, '학사 관리 권한이 없습니다.'],
  lms_scope: [403, '담당 단과대학 범위 밖의 항목입니다.'],
  term_id: [400, '학기 코드는 2026-1 · 2026-2 · 2026-S · 2026-W 형식으로 입력하세요.'],
  lms_name: [400, '이름을 1~60자로 입력하세요.'],
  lms_date: [400, '시작일 · 종료일(YYYY-MM-DD)을 확인하세요.'],
  unit_code: [400, '조직 코드는 영문 · 숫자 2~20자입니다.'],
  unit_kind: [400, '조직 구분을 고르세요.'],
  course_code: [400, '학수번호는 영문 · 숫자 4~20자입니다.'],
  credits: [400, '학점은 0~30 사이 숫자입니다.'],
  category: [400, '교과 구분을 고르세요.'],
  section_no: [400, '분반 번호는 숫자 1~3자리입니다.'],
  lms_mode: [400, '수업 방식을 고르세요.'],
  capacity: [400, '정원은 0~9999 사이 정수입니다.'],
  schedule: [400, '강의 시간 형식이 올바르지 않습니다.'],
  class_id: [400, '연결할 강의실 번호가 올바르지 않습니다.'],
  sec_status: [400, '분반 상태를 고르세요.'],
  member_no: [400, '학번(사번) 형식이 올바르지 않습니다.'],
  person_kind: [400, '구성원 구분을 고르세요.'],
  person_status: [400, '학적 상태를 고르세요.'],
  grade_year: [400, '학년은 1~6 사이 숫자입니다.'],
  lms_stu: [400, '학생 학번은 숫자 6~10자리입니다.'],
  staff_role: [400, '담당 역할을 고르세요.'],
  staff_kind: [400, '교수 · 공동교수는 교수 구성원만 지정할 수 있습니다.'],
  enr_kind: [400, '수강 구분(정규 · 청강)을 고르세요.'],
  req_kind: [400, '신청 구분(조교 · 청강)을 고르세요.'],
  import_kind: [400, '올릴 데이터 종류를 고르세요.'],
  csv: [400, 'CSV 내용이 없습니다.'],
  csv_head: [400, '첫 줄(머리글)에 필수 열이 없습니다. 양식을 내려받아 확인하세요.'],
  csv_rows: [413, '한 번에 5,000행까지 올릴 수 있습니다.'],
  lms_list: [400, '학번 목록을 확인하세요(한 번에 5,000명까지).'],
  merge: [400, '합반할 분반을 확인하세요(같은 학기 · 대표 분반 제외 · 이미 합반된 분반 제외).'],
  unmerge: [400, '합반된 분반이 아닙니다.'],
  sync_rep: [400, '다른 분반에 합반된 분반은 동기화의 기준이 될 수 없습니다.'],
  sync_class: [400, '대표 분반에 강의실이 연결되어 있지 않습니다.'],
  sync_none: [400, '같은 교과목 · 학기에 동기화할 다른 분반이 없습니다.'],
  scope_units: [400, '단과대학 · 학과 코드를 확인하세요.'],
  term: [404, '없는 학기입니다.'],
  unit: [404, '없는 조직입니다.'],
  course: [404, '없는 교과목입니다.'],
  section: [404, '없는 분반입니다.'],
  person: [404, '등록되지 않은 학번(사번)입니다.'],
  staff: [404, '등록된 담당자가 없습니다.'],
  enr: [404, '수강 정보가 없습니다.'],
  req: [404, '처리할 신청이 없습니다.'],
  lms_user: [404, '이 기관의 운영자 계정이 아닙니다.'],
  lms_state: [404, '기관 데이터가 아직 저장되지 않았습니다.'],
  section_dup: [409, '같은 학기에 같은 분반 번호가 이미 있습니다.'],
  in_use: [409, '연결된 분반 · 수강 정보가 있어 삭제할 수 없습니다.'],
  req_dup: [409, '이미 신청했거나 등록되어 있습니다.'],
  staff_dup: [409, '이미 같은 역할로 등록되어 있습니다.'],
  person_dup: [409, '이미 등록된 학번(사번)입니다.'],
  merged: [409, '합반된 분반이 있어 먼저 합반을 해제해야 합니다.']
};
/* CSV 행 오류 문구(데이터) — Java LmsCsv · 화면 데모와 같은 문자열 */
const R = {
  MNO: '학번(사번) 형식이 올바르지 않습니다.', STU: '학생 학번은 숫자 6~10자리입니다.', KIND: '구분은 학생 · 교수 · 직원 · 외부 중 하나입니다.',
  STAT: '학적은 재학 · 휴학 · 졸업 · 제적 · 자퇴 · 퇴직 중 하나입니다.', YEAR: '학년은 1~6 사이 숫자입니다.', UNIT: '없는 학과 코드입니다.', SCOPE: '담당 범위 밖의 학과입니다.',
  DUPF: '파일 안에 같은 행이 이미 있습니다.', EXIST_P: '이미 등록된 학번입니다(건너뜀).', COURSE: '학수번호 형식이 올바르지 않습니다.', CNAME: '교과목명을 입력하세요(60자 이내).',
  SECNO: '분반 번호는 숫자 1~3자리입니다.', MODE: '수업 방식은 온라인 · 블렌디드 · 오프라인 · 하이플렉스 중 하나입니다.', CAP: '정원은 0~9999 사이 정수입니다.', CRED: '학점은 0~30 사이 숫자입니다.',
  CAT: '교과 구분은 전공 · 교양 · 일반선택 · 비교과 · 공개 · 학점교류 중 하나입니다.', EXIST_S: '이미 있는 분반입니다(건너뜀).', NOPERSON: '등록되지 않은 학번입니다.',
  NOSEC: '이 학기에 없는 교과목 · 분반입니다.', ENRKIND: '구분은 정규 · 청강 중 하나입니다.', EXIST_E: '이미 수강 중입니다(건너뜀).'
};
const MAP = {
  kind: { 학생: 'student', 교수: 'professor', 직원: 'staff', 외부: 'external', student: 'student', professor: 'professor', staff: 'staff', external: 'external' },
  status: { 재학: 'active', 휴학: 'leave', 졸업: 'graduated', 제적: 'expelled', 자퇴: 'withdrawn', 퇴직: 'retired', active: 'active', leave: 'leave', graduated: 'graduated', expelled: 'expelled', withdrawn: 'withdrawn', retired: 'retired' },
  mode: { 온라인: 'online', 블렌디드: 'blended', 오프라인: 'offline', 하이플렉스: 'hyflex', online: 'online', blended: 'blended', offline: 'offline', hyflex: 'hyflex' },
  cat: { 전공: 'major', 교양: 'general', 일반선택: 'elective', 비교과: 'extracurricular', 공개: 'open', 학점교류: 'exchange', major: 'major', general: 'general', elective: 'elective', extracurricular: 'extracurricular', open: 'open', exchange: 'exchange' },
  enr: { 정규: 'regular', 청강: 'audit', regular: 'regular', audit: 'audit' }
};
const has = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
const RE = { term: /^\d{4}-(1|2|S|W)$/, unit: /^[A-Za-z0-9_-]{2,20}$/, course: /^[A-Za-z0-9-]{4,20}$/, secno: /^\d{1,3}$/, mno: /^[A-Za-z0-9]{4,20}$/, stu: /^\d{6,10}$/, cls: /^[A-Za-z0-9_-]{1,40}$/, uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, date: /^\d{4}-\d{2}-\d{2}$/ };
const UNIT_KINDS = ['univ', 'college', 'dept', 'major', 'office'];
const STAFF_ROLES = ['professor', 'co_professor', 'ta', 'grader', 'staff'];
const SEC_STATUS = ['draft', 'open', 'closed', 'archived'];
const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const MAX_ROWS = 5000;
const S = v => String(v == null ? '' : v);
const T = v => S(v || '').trim();
const secNo = v => { const s = T(v); return RE.secno.test(s) ? (s.length === 1 ? '0' + s : s) : null; };
const dateOk = d => RE.date.test(d) && !isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = v => Array.isArray(v) ? v : [];

/* ── CSV(RFC 4180 · 따옴표 · CRLF · BOM) — eval 없이 문자 단위로 읽는다 ── */
function parseCsv(text) {
  let s = S(text); if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const recs = []; let rec = []; let f = ''; let q = false; let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; } f += ch; i++; continue; }
    if (ch === '"' && f === '') { q = true; i++; continue; }
    if (ch === ',') { rec.push(f); f = ''; i++; continue; }
    if (ch === '\r' || ch === '\n') { rec.push(f); recs.push(rec); rec = []; f = ''; i += ch === '\r' && s[i + 1] === '\n' ? 2 : 1; continue; }
    f += ch; i++;
  }
  if (f !== '' || rec.length) { rec.push(f); recs.push(rec); }
  return recs.map(r => r.map(x => x.trim().slice(0, 200))).filter(r => r.some(x => x !== ''));
}

/* ── 분반 동기화: 스튜디오 강의실(doc.classes)의 공지 · 커리큘럼 항목을 같은 과목 분반 강의실로 복제 ── */
const TYPEMAP = { chapter: 'week', offline: 'week', live: 'week', week: 'week', assign: 'assignment', assignment: 'assignment', discuss: 'discussion', discussion: 'discussion', board: 'discussion', survey: 'discussion', quiz: 'exam', exam: 'exam' };
const objType = (list, it) => list === 'notices' ? 'notice' : (typeof it.type === 'string' && has(TYPEMAP, it.type) ? TYPEMAP[it.type] : 'material');
const canon = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
const itemHash = it => { const o = {}; Object.keys(it).forEach(k => { if (k !== 'id' && k !== 'syncSrc' && k !== 'syncHash') o[k] = it[k]; }); return fnv(canon(o)); };
const LISTS = ['notices', 'curriculum'];
/* hist: Map key `${dst}|${type}|${oid}` → 마지막 action. 결과: { changed, log: [{dst, type, oid, action}], n: {...} } */
function syncClasses(src, dsts, hist) {
  const n = { copied: 0, updated: 0, deleted: 0, excluded: 0, unchanged: 0 }; const log = []; let changed = false;
  for (const { dst, no, cls } of dsts) {
    for (const list of LISTS) {
      const S0 = arr(src[list]).filter(it => isObj(it) && typeof it.id === 'string' && it.id !== '');
      if (!Array.isArray(cls[list])) cls[list] = [];
      const D = cls[list]; const ids = new Set(S0.map(it => it.id));
      for (const it of S0) {
        const type = objType(list, it); const key = `${dst}|${type}|${it.id}`; const last = hist.get(key) || '';
        if (last === 'excluded') { n.excluded++; continue; }
        const h = itemHash(it); const i = D.findIndex(x => isObj(x) && x.syncSrc === it.id);
        if (i < 0) {
          if (last === 'copied' || last === 'updated') { n.excluded++; log.push({ dst, type, oid: it.id, action: 'excluded' }); hist.set(key, 'excluded'); continue; }
          D.push({ ...it, id: it.id + '-' + no, syncSrc: it.id, syncHash: h }); n.copied++; changed = true; log.push({ dst, type, oid: it.id, action: 'copied' }); hist.set(key, 'copied'); continue;
        }
        const x = D[i];
        if (itemHash(x) !== x.syncHash) { n.excluded++; log.push({ dst, type, oid: it.id, action: 'excluded' }); hist.set(key, 'excluded'); continue; }
        if (x.syncHash === h) { n.unchanged++; continue; }
        D[i] = { ...it, id: x.id, syncSrc: it.id, syncHash: h }; n.updated++; changed = true; log.push({ dst, type, oid: it.id, action: 'updated' }); hist.set(key, 'updated');
      }
      for (let i = D.length - 1; i >= 0; i--) {
        const x = D[i]; if (!isObj(x) || typeof x.syncSrc !== 'string' || ids.has(x.syncSrc)) continue;
        if (itemHash(x) !== x.syncHash) continue;
        D.splice(i, 1); n.deleted++; changed = true; const type = objType(list, x); log.push({ dst, type, oid: x.syncSrc, action: 'deleted' }); hist.set(`${dst}|${type}|${x.syncSrc}`, 'deleted');
      }
    }
  }
  return { changed, log, n };
}
/* 합반: 공유분반 강의실의 활동(수강생 목록 · 진도 · 과제 · 점수 기록)을 대표분반 강의실로 옮긴다 */
function mergeActivity(rep, shared) {
  let moved = 0; if (!Array.isArray(rep.learners)) rep.learners = []; if (!isObj(rep.prog)) rep.prog = {};
  for (const cs of shared) {
    for (const id of arr(cs.learners)) if (!rep.learners.some(x => x === id)) rep.learners.push(id);
    if (isObj(cs.prog)) for (const k of Object.keys(cs.prog)) { if (!has(rep.prog, k)) { rep.prog[k] = cs.prog[k]; moved++; } }
    cs.learners = []; cs.prog = {}; cs.mergedInto = rep.id;
  }
  return moved;
}

/* ── SQL(응답 JSON) — Java LmsMapper.xml과 같은 문장 ── */
const SCOPE_C = `($1::text is null or c.unit_code = any(string_to_array($1, ',')) or exists (select 1 from lms_org_unit u where u.unit_code = c.unit_code and u.parent_code = any(string_to_array($1, ','))))`;
const STAFF_S = `($2::text is null or exists (select 1 from lms_section_staff st join lms_person p on p.tenant_id = st.tenant_id and p.person_id = st.person_id where st.section_id = s.section_id and p.member_no = $2 and st.status = 'active'))`;
const SQL_OVERVIEW = `select json_build_object(
  'terms', coalesce((select json_agg(json_build_object('term_id', t.term_id, 'name', t.name, 'starts_on', t.starts_on::text, 'ends_on', t.ends_on::text, 'is_operating', t.is_operating) order by t.term_id desc) from lms_term t), '[]'::json),
  'units', coalesce((select json_agg(json_build_object('unit_code', u.unit_code, 'name', u.name, 'kind', u.kind, 'parent_code', u.parent_code) order by u.kind, u.unit_code) from lms_org_unit u), '[]'::json),
  'courses', coalesce((select json_agg(json_build_object('course_code', c.course_code, 'name', c.name, 'credits', c.credits::float8, 'unit_code', c.unit_code, 'category', c.category) order by c.course_code) from lms_course c where ${SCOPE_C} and ($2::text is null or exists (select 1 from lms_section s where s.course_code = c.course_code and ${STAFF_S}))), '[]'::json),
  'sections', coalesce((select json_agg(json_build_object('section_id', s.section_id, 'term_id', s.term_id, 'course_code', s.course_code, 'course_name', c.name, 'unit_code', c.unit_code, 'section_no', s.section_no, 'title', s.title, 'mode', s.mode, 'capacity', s.capacity, 'schedule', s.schedule, 'rep_section_id', s.rep_section_id, 'hidden', s.hidden, 'class_id', s.class_id, 'status', s.status, 'source', s.source,
      'staff', coalesce((select json_agg(json_build_object('member_no', p.member_no, 'role', st.role, 'status', st.status, 'source', st.source) order by st.role, p.member_no) from lms_section_staff st join lms_person p on p.tenant_id = st.tenant_id and p.person_id = st.person_id where st.section_id = s.section_id), '[]'::json),
      'enrolled', (select count(*) from lms_enrollment e where e.section_id = s.section_id and e.status = 'enrolled' and e.kind = 'regular')::int,
      'audit', (select count(*) from lms_enrollment e where e.section_id = s.section_id and e.status = 'enrolled' and e.kind = 'audit')::int,
      'pending', ((select count(*) from lms_enrollment e where e.section_id = s.section_id and e.status = 'pending') + (select count(*) from lms_section_staff st where st.section_id = s.section_id and st.status = 'pending'))::int
    ) order by s.term_id desc, s.course_code, s.section_no) from lms_section s join lms_course c on c.tenant_id = s.tenant_id and c.course_code = s.course_code where ${SCOPE_C} and ${STAFF_S}), '[]'::json),
  'requests', coalesce((select json_agg(json_build_object('section_id', r.section_id, 'member_no', r.member_no, 'unit_code', r.unit_code, 'kind', r.kind, 'at', lms_ts(r.at)) order by r.at, r.member_no) from (
      select st.section_id, p.member_no, p.unit_code, 'ta'::text kind, st.requested_at at from lms_section_staff st join lms_person p on p.tenant_id = st.tenant_id and p.person_id = st.person_id where st.status = 'pending'
      union all select e.section_id, p.member_no, p.unit_code, 'audit'::text, e.enrolled_at from lms_enrollment e join lms_person p on p.tenant_id = e.tenant_id and p.person_id = e.person_id where e.status = 'pending'
    ) r join lms_section s on s.section_id = r.section_id join lms_course c on c.tenant_id = s.tenant_id and c.course_code = s.course_code where ${SCOPE_C} and ${STAFF_S}), '[]'::json),
  'runs', coalesce((select json_agg(json_build_object('run_id', x.run_id, 'term_id', x.term_id, 'scope', x.scope, 'trigger', x.trigger, 'at', lms_ts(x.started_at), 'counts', x.counts, 'errors_n', jsonb_array_length(x.errors)) order by x.run_id desc) from (select * from lms_sis_sync_run where $2::text is null order by run_id desc limit 20) x), '[]'::json),
  'persons', (select json_build_object('total', count(*), 'manual', count(*) filter (where source = 'manual')) from lms_person)
)::text j`;
const SQL_SECTION = `select s.section_id::text, s.term_id, s.course_code, s.section_no, s.title, s.rep_section_id::text, s.hidden, s.class_id, s.status, c.unit_code, u.parent_code from lms_section s join lms_course c on c.tenant_id = s.tenant_id and c.course_code = s.course_code left join lms_org_unit u on u.tenant_id = c.tenant_id and u.unit_code = c.unit_code where s.section_id = $1::uuid`;
const SQL_ENR = `select coalesce(json_agg(json_build_object('member_no', p.member_no, 'person_kind', p.kind, 'unit_code', p.unit_code, 'status', p.status, 'kind', e.kind, 'enr_status', e.status, 'source', e.source, 'section_no', s.section_no, 'at', lms_ts(e.enrolled_at)) order by p.member_no, s.section_no), '[]'::json)::text j
  from lms_enrollment e join lms_person p on p.tenant_id = e.tenant_id and p.person_id = e.person_id join lms_section s on s.tenant_id = e.tenant_id and s.section_id = e.section_id
  where (e.section_id = $1::uuid or s.rep_section_id = $1::uuid) and e.status <> 'dropped' and ($2::boolean is false or (e.kind = 'regular' and e.status = 'enrolled'))`;
const SQL_PERSONS = `select coalesce(json_agg(json_build_object('member_no', x.member_no, 'kind', x.kind, 'unit_code', x.unit_code, 'status', x.status, 'grade_year', x.grade_year, 'source', x.source) order by x.member_no), '[]'::json)::text j from (
  select p.* from lms_person p left join lms_org_unit u on u.tenant_id = p.tenant_id and u.unit_code = p.unit_code
  where ($1::text is null or p.unit_code = any(string_to_array($1, ',')) or u.parent_code = any(string_to_array($1, ','))) and p.member_no like $2 || '%' and ($3::text = '' or p.kind = $3) order by p.member_no limit 200) x`;
const SQL_SYNC_HIST = `select coalesce(json_agg(json_build_object('at', lms_ts(x.at), 'src_section', x.src_section, 'dst_section', x.dst_section, 'dst_no', x.section_no, 'object_type', x.object_type, 'object_id', x.object_id, 'action', x.action) order by x.id desc), '[]'::json)::text j
  from (select y.*, s.section_no from lms_section_sync y left join lms_section s on s.tenant_id = y.tenant_id and s.section_id = y.dst_section where y.src_section = $1::uuid or y.dst_section = $1::uuid order by y.id desc limit 200) x`;
const SQL_PUB = `select json_build_object(
  'sections', coalesce((select json_agg(z.o order by z.term_id desc, z.course_code, z.section_no) from (
      select distinct on (v.section_id) v.term_id, v.course_code, v.section_no, json_build_object('section_id', v.section_id, 'term_id', v.term_id, 'course_code', v.course_code, 'course_name', c.name, 'section_no', v.section_no, 'title', v.title, 'mode', v.mode, 'schedule', v.schedule, 'class_id', v.class_id, 'kind', m.kind, 'via', case when m.section_id <> v.section_id then m.section_no end) o
      from (select e.section_id, e.kind, s0.section_no, coalesce(s0.rep_section_id, s0.section_id) shown from lms_enrollment e join lms_section s0 on s0.tenant_id = e.tenant_id and s0.section_id = e.section_id where e.person_id = $1::uuid and e.status = 'enrolled'
            union all select st.section_id, 'ta', s0.section_no, coalesce(s0.rep_section_id, s0.section_id) from lms_section_staff st join lms_section s0 on s0.tenant_id = st.tenant_id and s0.section_id = st.section_id where st.person_id = $1::uuid and st.status = 'active') m
      join lms_section v on v.section_id = m.shown join lms_course c on c.tenant_id = v.tenant_id and c.course_code = v.course_code where v.status in ('open', 'closed') order by v.section_id, m.kind desc) z), '[]'::json),
  'requests', coalesce((select json_agg(json_build_object('section_id', r.section_id, 'kind', r.kind, 'at', lms_ts(r.at)) order by r.at) from (
      select st.section_id, 'ta'::text kind, st.requested_at at from lms_section_staff st where st.person_id = $1::uuid and st.status = 'pending'
      union all select e.section_id, 'audit', e.enrolled_at from lms_enrollment e where e.person_id = $1::uuid and e.status = 'pending') r), '[]'::json),
  'open', coalesce((select json_agg(json_build_object('section_id', s.section_id, 'term_id', s.term_id, 'course_code', s.course_code, 'course_name', c.name, 'section_no', s.section_no, 'title', s.title, 'mode', s.mode) order by s.course_code, s.section_no) from (
      select s1.* from lms_section s1 join lms_term t on t.tenant_id = s1.tenant_id and t.term_id = s1.term_id where t.is_operating and s1.status = 'open' and not s1.hidden and s1.rep_section_id is null
        and not exists (select 1 from lms_enrollment e where e.section_id = s1.section_id and e.person_id = $1::uuid and e.status <> 'dropped') order by s1.course_code, s1.section_no limit 100) s join lms_course c on c.tenant_id = s.tenant_id and c.course_code = s.course_code), '[]'::json)
)::text j`;

function createLms({ pool, inTenant, need, HttpErr, readBody, limit, audit }) {
  const err = (code) => { const [st, msg] = E[code]; return new HttpErr(st, msg, code); };
  const q = (c, sql, p) => c.query(sql, p);
  const one = async (c, sql, p) => (await c.query(sql, p)).rows[0] || null;

  /* 로그인 운영자 → 학사 권한 맥락: 정운영자 · 부운영자(관리자, 부운영자는 단과대학 범위로 좁힐 수 있음) · 교수(연결된 사번의 담당 분반만) */
  async function ctxOf(c, a) {
    const link = await one(c, 'select units, member_no from lms_user_link where tenant_id = $1 and user_id = $2::uuid', [a.tid, a.uid]);
    const admin = a.role === 'owner' || a.role === 'sub';
    const units = a.role === 'sub' && link && link.units.length ? link.units : null;
    return { tid: a.tid, uid: a.uid, email: a.email, role: a.role, admin, units, mno: admin ? null : (link && link.member_no) || '' };
  }
  const adminOnly = x => { if (!x.admin) throw err('lms_role'); };
  const fullAdmin = x => { adminOnly(x); if (x.units) throw err('lms_scope'); };
  const inUnits = (x, unit, parent) => !x.units || (unit != null && x.units.includes(unit)) || (parent != null && x.units.includes(parent));
  async function unitRow(c, code) { return one(c, 'select unit_code, parent_code, kind from lms_org_unit where unit_code = $1', [code]); }
  async function sectionOf(c, id) { const s = T(id); if (!RE.uuid.test(s)) throw err('section'); const r = await one(c, SQL_SECTION, [s]); if (!r) throw err('section'); return r; }
  /* 분반 관리: 관리자(범위 안) 또는 그 분반의 교수 · 공동교수 */
  async function canSection(c, x, s) {
    if (x.admin) { if (!inUnits(x, s.unit_code, s.parent_code)) throw err('lms_scope'); return; }
    const r = x.mno ? await one(c, "select 1 from lms_section_staff st join lms_person p on p.tenant_id = st.tenant_id and p.person_id = st.person_id where st.section_id = $1::uuid and p.member_no = $2 and st.status = 'active' and st.role in ('professor','co_professor')", [s.section_id, x.mno]) : null;
    if (!r) throw err('lms_role');
  }
  async function personOf(c, mno) { if (!RE.mno.test(mno)) throw err('member_no'); const p = await one(c, 'select person_id::text, member_no, kind, unit_code from lms_person where member_no = $1', [mno]); if (!p) throw err('person'); return p; }
  const run = async (req, fn) => {
    const a = await need(req); if (a.type !== 'univ') throw err('lms_edition');
    return inTenant(pool, a.tid, async c => fn(c, await ctxOf(c, a), a));
  };
  const body = (req, n = 64 * 1024) => readBody(req, n);
  const qs = req => new URL(req.url, 'http://x').searchParams;
  const ok = (o = {}) => ({ ok: true, ...o });

  /* 문서(tenant_state) 수정 — 분반 동기화 · 합반 활동 이전. rev를 올려 화면이 최신본을 다시 받게 한다 */
  async function docLoad(c, tid) { return one(c, 'select doc, rev from tenant_state where tenant_id = $1 for update', [tid]); }
  async function docSave(c, tid, doc) { const s = JSON.stringify(doc); return (await one(c, 'update tenant_state set doc = $2, rev = rev + 1, bytes = $3, updated_at = now() where tenant_id = $1 returning rev', [tid, s, s.length])).rev; }

  /* ── CSV 검증(미리보기 · 반영 공통) ── */
  async function validate(c, x, kind, termId, recs) {
    const head = recs[0]; const col = n => head.indexOf(n); const rows = recs.slice(1);
    const need = kind === 'person' ? ['학번'] : kind === 'section' ? ['학수번호', '교과목명', '분반'] : ['학번', '학수번호', '분반'];
    if (need.some(n => col(n) < 0)) throw err('csv_head');
    if (rows.length > MAX_ROWS) throw err('csv_rows');
    const g = (r, n) => { const i = col(n); return i >= 0 && i < r.length ? r[i] : ''; };
    const units = new Map((await q(c, 'select unit_code, parent_code from lms_org_unit', [])).rows.map(r => [r.unit_code, r.parent_code]));
    const seen = new Set(); const out = [];
    if (kind === 'person') {
      const have = new Set((await q(c, 'select member_no from lms_person', [])).rows.map(r => r.member_no));
      rows.forEach((r, i) => {
        const d = { member_no: g(r, '학번'), kind: g(r, '구분'), unit_code: g(r, '학과코드'), status: g(r, '학적'), grade_year: g(r, '학년') }; let msg = ''; let st = 'error';
        const kd = d.kind === '' ? 'student' : has(MAP.kind, d.kind) ? MAP.kind[d.kind] : null; const ss = d.status === '' ? 'active' : has(MAP.status, d.status) ? MAP.status[d.status] : null;
        const gy = d.grade_year === '' ? null : /^[1-6]$/.test(d.grade_year) ? Number(d.grade_year) : -1;
        if (!RE.mno.test(d.member_no)) msg = R.MNO; else if (!kd) msg = R.KIND; else if (kd === 'student' && !RE.stu.test(d.member_no)) msg = R.STU; else if (!ss) msg = R.STAT; else if (gy === -1) msg = R.YEAR;
        else if (d.unit_code !== '' && !units.has(d.unit_code)) msg = R.UNIT; else if (x.units && !(d.unit_code !== '' && inUnits(x, d.unit_code, units.get(d.unit_code)))) msg = R.SCOPE;
        else if (seen.has(d.member_no)) msg = R.DUPF; else if (have.has(d.member_no)) { st = 'skip'; msg = R.EXIST_P; } else st = 'ok';
        if (st !== 'error' || msg !== R.MNO) seen.add(d.member_no);
        out.push({ line: i + 2, st, msg, data: { member_no: d.member_no, kind: kd, unit_code: d.unit_code || null, status: ss, grade_year: gy === -1 ? null : gy } });
      });
      return out;
    }
    const secs = new Map((await q(c, 'select s.course_code, s.section_no, s.section_id::text, c.unit_code from lms_section s join lms_course c on c.tenant_id = s.tenant_id and c.course_code = s.course_code where s.term_id = $1', [termId])).rows.map(r => [r.course_code + '|' + r.section_no, r]));
    if (kind === 'section') {
      const courses = new Map((await q(c, 'select course_code, unit_code from lms_course', [])).rows.map(r => [r.course_code, r.unit_code]));
      rows.forEach((r, i) => {
        const d = { course_code: g(r, '학수번호'), name: g(r, '교과목명'), section_no: g(r, '분반'), credits: g(r, '학점'), unit_code: g(r, '학과코드'), mode: g(r, '수업방식'), capacity: g(r, '정원'), category: g(r, '교과구분') }; let msg = ''; let st = 'error';
        const no = secNo(d.section_no); const md = d.mode === '' ? 'offline' : has(MAP.mode, d.mode) ? MAP.mode[d.mode] : null; const ct = d.category === '' ? null : has(MAP.cat, d.category) ? MAP.cat[d.category] : -1;
        const cap = d.capacity === '' ? null : /^\d{1,4}$/.test(d.capacity) ? Number(d.capacity) : -1; const cr = d.credits === '' ? null : /^\d{1,2}(\.\d)?$/.test(d.credits) && Number(d.credits) <= 30 ? Number(d.credits) : -1;
        const unit = d.unit_code !== '' ? d.unit_code : courses.has(d.course_code) ? courses.get(d.course_code) : null;
        if (!RE.course.test(d.course_code)) msg = R.COURSE; else if (d.name === '' || d.name.length > 60) msg = R.CNAME; else if (!no) msg = R.SECNO; else if (!md) msg = R.MODE; else if (cap === -1) msg = R.CAP; else if (cr === -1) msg = R.CRED; else if (ct === -1) msg = R.CAT;
        else if (d.unit_code !== '' && !units.has(d.unit_code)) msg = R.UNIT; else if (x.units && !(unit != null && inUnits(x, unit, units.get(unit)))) msg = R.SCOPE;
        else if (seen.has(d.course_code + '|' + no)) msg = R.DUPF; else if (secs.has(d.course_code + '|' + no)) { st = 'skip'; msg = R.EXIST_S; } else st = 'ok';
        if (no && RE.course.test(d.course_code)) seen.add(d.course_code + '|' + no);
        out.push({ line: i + 2, st, msg, data: { course_code: d.course_code, name: d.name, section_no: no || d.section_no, credits: cr === -1 ? null : cr, unit_code: d.unit_code || null, mode: md, capacity: cap === -1 ? null : cap, category: ct === -1 ? null : ct } });
      });
      return out;
    }
    const persons = new Map((await q(c, 'select member_no, person_id::text from lms_person', [])).rows.map(r => [r.member_no, r.person_id]));
    const enr = new Set((await q(c, "select e.section_id::text || '|' || e.person_id::text k from lms_enrollment e join lms_section s on s.tenant_id = e.tenant_id and s.section_id = e.section_id where s.term_id = $1 and e.status <> 'dropped'", [termId])).rows.map(r => r.k));
    rows.forEach((r, i) => {
      const d = { member_no: g(r, '학번'), course_code: g(r, '학수번호'), section_no: g(r, '분반'), kind: g(r, '구분') }; let msg = ''; let st = 'error';
      const no = secNo(d.section_no); const kd = d.kind === '' ? 'regular' : has(MAP.enr, d.kind) ? MAP.enr[d.kind] : null; const sec = no ? secs.get(d.course_code + '|' + no) : null; const k = d.member_no + '|' + d.course_code + '|' + no;
      if (!RE.mno.test(d.member_no)) msg = R.MNO; else if (!kd) msg = R.ENRKIND; else if (seen.has(k)) msg = R.DUPF; else if (!persons.has(d.member_no)) msg = R.NOPERSON; else if (!sec) msg = R.NOSEC;
      else if (x.units && !inUnits(x, sec.unit_code, units.get(sec.unit_code))) msg = R.SCOPE; else if (enr.has(sec.section_id + '|' + persons.get(d.member_no))) { st = 'skip'; msg = R.EXIST_E; } else st = 'ok';
      if (RE.mno.test(d.member_no)) seen.add(k);
      out.push({ line: i + 2, st, msg, data: { member_no: d.member_no, course_code: d.course_code, section_no: no || d.section_no, kind: kd }, _sid: sec ? sec.section_id : null, _pid: persons.get(d.member_no) || null });
    });
    return out;
  }

  const routes = {
    'GET /api/lms/a/overview': req => run(req, async (c, x) => {
      const o = JSON.parse((await one(c, SQL_OVERVIEW, [x.units ? x.units.join(',') : null, x.mno])).j);
      let scopes = [];
      if (x.role === 'owner') {
        const L = (await q(c, 'select user_id::text uid, units, member_no from lms_user_link order by updated_at', [])).rows;
        if (L.length) { const U = new Map((await pool.query('select id::text, email, role from users where tenant_id = $1 and id = any($2::uuid[])', [x.tid, L.map(l => l.uid)])).rows.map(u => [u.id, u]));
          scopes = L.filter(l => U.has(l.uid)).map(l => ({ email: U.get(l.uid).email, role: U.get(l.uid).role, units: l.units, member_no: l.member_no })); }
      }
      return { me: { role: x.role, admin: x.admin, units: x.units, member_no: x.mno }, ...o, scopes };
    }),

    'POST /api/lms/a/term': async req => { const b = await body(req); return run(req, async (c, x, a) => {
      fullAdmin(x); const id = T(b.term_id); const name = T(b.name); const s = T(b.starts_on); const e = T(b.ends_on);
      if (!RE.term.test(id)) throw err('term_id'); if (!name || name.length > 60) throw err('lms_name'); if (!dateOk(s) || !dateOk(e) || e < s) throw err('lms_date');
      const op = b.is_operating === true;
      if (op) await q(c, 'update lms_term set is_operating = false where term_id <> $1', [id]);
      await q(c, 'insert into lms_term (tenant_id, term_id, name, starts_on, ends_on, is_operating, is_syncing) values ($1, $2, $3, $4::date, $5::date, $6, $6) on conflict (tenant_id, term_id) do update set name = excluded.name, starts_on = excluded.starts_on, ends_on = excluded.ends_on, is_operating = excluded.is_operating, is_syncing = excluded.is_syncing', [x.tid, id, name, s, e, op]);
      await audit(c, x.tid, x.email, 'lms.term', { term_id: id }); return ok();
    }); },
    'POST /api/lms/a/term-delete': async req => { const b = await body(req); return run(req, async (c, x) => {
      fullAdmin(x); const id = T(b.term_id); if (!RE.term.test(id)) throw err('term_id');
      if (!(await one(c, 'select 1 from lms_term where term_id = $1', [id]))) throw err('term');
      if (await one(c, 'select 1 from lms_section where term_id = $1 limit 1', [id])) throw err('in_use');
      await q(c, 'delete from lms_term where term_id = $1', [id]); await audit(c, x.tid, x.email, 'lms.term.delete', { term_id: id }); return ok();
    }); },

    'POST /api/lms/a/unit': async req => { const b = await body(req); return run(req, async (c, x) => {
      fullAdmin(x); const code = T(b.unit_code); const name = T(b.name); const kind = T(b.kind) || 'dept'; const par = T(b.parent_code);
      if (!RE.unit.test(code)) throw err('unit_code'); if (!name || name.length > 60) throw err('lms_name'); if (!UNIT_KINDS.includes(kind)) throw err('unit_kind');
      if (par) { if (!RE.unit.test(par) || par === code) throw err('unit_code'); if (!(await unitRow(c, par))) throw err('unit'); }
      await q(c, 'insert into lms_org_unit (tenant_id, unit_code, name, kind, parent_code) values ($1, $2, $3, $4, $5) on conflict (tenant_id, unit_code) do update set name = excluded.name, kind = excluded.kind, parent_code = excluded.parent_code', [x.tid, code, name, kind, par || null]);
      await audit(c, x.tid, x.email, 'lms.unit', { unit_code: code }); return ok();
    }); },
    'POST /api/lms/a/unit-delete': async req => { const b = await body(req); return run(req, async (c, x) => {
      fullAdmin(x); const code = T(b.unit_code); if (!RE.unit.test(code)) throw err('unit_code'); if (!(await unitRow(c, code))) throw err('unit');
      if (await one(c, 'select 1 from lms_org_unit where parent_code = $1 union all select 1 from lms_course where unit_code = $1 union all select 1 from lms_person where unit_code = $1 limit 1', [code])) throw err('in_use');
      await q(c, 'delete from lms_org_unit where unit_code = $1', [code]); await audit(c, x.tid, x.email, 'lms.unit.delete', { unit_code: code }); return ok();
    }); },

    'POST /api/lms/a/course': async req => { const b = await body(req); return run(req, async (c, x) => {
      adminOnly(x); const code = T(b.course_code); const name = T(b.name); const unit = T(b.unit_code); const cat = T(b.category);
      if (!RE.course.test(code)) throw err('course_code'); if (!name || name.length > 60) throw err('lms_name');
      const cr = b.credits == null || b.credits === '' ? null : Number(b.credits); if (cr !== null && !(Number.isFinite(cr) && cr >= 0 && cr <= 30)) throw err('credits');
      if (cat && !has(MAP.cat, cat)) throw err('category');
      let u = null; if (unit) { if (!RE.unit.test(unit)) throw err('unit_code'); u = await unitRow(c, unit); if (!u) throw err('unit'); }
      if (!inUnits(x, u ? u.unit_code : null, u ? u.parent_code : null)) throw err('lms_scope');
      const prev = await one(c, 'select c.unit_code, u.parent_code from lms_course c left join lms_org_unit u on u.tenant_id = c.tenant_id and u.unit_code = c.unit_code where c.course_code = $1', [code]);
      if (prev && !inUnits(x, prev.unit_code, prev.parent_code)) throw err('lms_scope');
      await q(c, 'insert into lms_course (tenant_id, course_code, name, credits, unit_code, category) values ($1, $2, $3, $4, $5, $6) on conflict (tenant_id, course_code) do update set name = excluded.name, credits = excluded.credits, unit_code = excluded.unit_code, category = excluded.category', [x.tid, code, name, cr, unit || null, cat ? MAP.cat[cat] : null]);
      await audit(c, x.tid, x.email, 'lms.course', { course_code: code }); return ok();
    }); },
    'POST /api/lms/a/course-delete': async req => { const b = await body(req); return run(req, async (c, x) => {
      adminOnly(x); const code = T(b.course_code); if (!RE.course.test(code)) throw err('course_code');
      const prev = await one(c, 'select c.unit_code, u.parent_code from lms_course c left join lms_org_unit u on u.tenant_id = c.tenant_id and u.unit_code = c.unit_code where c.course_code = $1', [code]); if (!prev) throw err('course');
      if (!inUnits(x, prev.unit_code, prev.parent_code)) throw err('lms_scope');
      if (await one(c, 'select 1 from lms_section where course_code = $1 limit 1', [code])) throw err('in_use');
      await q(c, 'delete from lms_course where course_code = $1', [code]); await audit(c, x.tid, x.email, 'lms.course.delete', { course_code: code }); return ok();
    }); },

    'POST /api/lms/a/section': async req => { const b = await body(req); return run(req, async (c, x) => {
      const id = T(b.section_id); const title = T(b.title); const mode = T(b.mode) || 'offline'; const status = T(b.status) || 'open'; const cls = T(b.class_id);
      const cap = b.capacity == null || b.capacity === '' ? null : Number(b.capacity);
      if (title.length > 60) throw err('lms_name'); if (!has(MAP.mode, mode)) throw err('lms_mode'); if (cap !== null && !(Number.isInteger(cap) && cap >= 0 && cap <= 9999)) throw err('capacity');
      if (!SEC_STATUS.includes(status)) throw err('sec_status'); if (cls && !RE.cls.test(cls)) throw err('class_id');
      let sch = '[]'; if (b.schedule != null) { const L = b.schedule; if (!Array.isArray(L) || L.length > 10 || L.some(s => !isObj(s) || !DAYS.includes(s.day) || S(s.period == null ? '' : s.period).length > 10 || S(s.room == null ? '' : s.room).length > 30)) throw err('schedule');
        sch = JSON.stringify(L.map(s => ({ day: s.day, period: T(s.period), room: T(s.room) }))); }
      if (id) {
        const s = await sectionOf(c, id); await canSection(c, x, s);
        await q(c, 'update lms_section set title = $2, mode = $3, capacity = $4, schedule = case when $5::boolean then $6::jsonb else schedule end, class_id = $7, status = $8 where section_id = $1::uuid', [s.section_id, title || s.title, MAP.mode[mode], cap, b.schedule != null, sch, cls || null, status]);
        await audit(c, x.tid, x.email, 'lms.section.update', { section_id: s.section_id }); return ok({ section_id: s.section_id });
      }
      adminOnly(x); const term = T(b.term_id); const code = T(b.course_code); const no = secNo(b.section_no);
      if (!RE.term.test(term)) throw err('term_id'); if (!RE.course.test(code)) throw err('course_code'); if (!no) throw err('section_no');
      if (!(await one(c, 'select 1 from lms_term where term_id = $1', [term]))) throw err('term');
      const co = await one(c, 'select c.name, c.unit_code, u.parent_code from lms_course c left join lms_org_unit u on u.tenant_id = c.tenant_id and u.unit_code = c.unit_code where c.course_code = $1', [code]); if (!co) throw err('course');
      if (!inUnits(x, co.unit_code, co.parent_code)) throw err('lms_scope');
      if (await one(c, 'select 1 from lms_section where term_id = $1 and course_code = $2 and section_no = $3', [term, code, no])) throw err('section_dup');
      const r = await one(c, "insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode, capacity, schedule, class_id, status, source) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, 'manual') returning section_id::text", [x.tid, term, code, no, title || `${co.name} ${no}분반`, MAP.mode[mode], cap, sch, cls || null, status]);
      await audit(c, x.tid, x.email, 'lms.section', { section_id: r.section_id }); return ok({ section_id: r.section_id });
    }); },
    'POST /api/lms/a/section-delete': async req => { const b = await body(req); return run(req, async (c, x) => {
      adminOnly(x); const s = await sectionOf(c, b.section_id); await canSection(c, x, s);
      if (await one(c, 'select 1 from lms_section where rep_section_id = $1::uuid limit 1', [s.section_id])) throw err('merged');
      if (await one(c, "select 1 from lms_enrollment where section_id = $1::uuid and status <> 'dropped' limit 1", [s.section_id])) throw err('in_use');
      await q(c, 'delete from lms_enrollment where section_id = $1::uuid', [s.section_id]); await q(c, 'delete from lms_section where section_id = $1::uuid', [s.section_id]);
      await audit(c, x.tid, x.email, 'lms.section.delete', { section_id: s.section_id }); return ok();
    }); },

    'POST /api/lms/a/staff': async req => { const b = await body(req); return run(req, async (c, x) => {
      const s = await sectionOf(c, b.section_id); await canSection(c, x, s); const role = T(b.role); if (!STAFF_ROLES.includes(role)) throw err('staff_role');
      const p = await personOf(c, T(b.member_no)); if ((role === 'professor' || role === 'co_professor') && p.kind !== 'professor') throw err('staff_kind');
      if (await one(c, 'select 1 from lms_section_staff where section_id = $1::uuid and person_id = $2::uuid and role = $3', [s.section_id, p.person_id, role])) throw err('staff_dup');
      await q(c, "insert into lms_section_staff (tenant_id, section_id, person_id, role, source, status, approved_by, approved_at) values ($1, $2::uuid, $3::uuid, $4, 'manual', 'active', $5::uuid, now())", [x.tid, s.section_id, p.person_id, role, x.uid]);
      await audit(c, x.tid, x.email, 'lms.staff', { section_id: s.section_id, member_no: p.member_no, role }); return ok();
    }); },
    'POST /api/lms/a/staff-delete': async req => { const b = await body(req); return run(req, async (c, x) => {
      const s = await sectionOf(c, b.section_id); await canSection(c, x, s); const role = T(b.role); if (!STAFF_ROLES.includes(role)) throw err('staff_role');
      const p = await personOf(c, T(b.member_no));
      const r = await q(c, 'delete from lms_section_staff where section_id = $1::uuid and person_id = $2::uuid and role = $3', [s.section_id, p.person_id, role]); if (!r.rowCount) throw err('staff');
      await audit(c, x.tid, x.email, 'lms.staff.delete', { section_id: s.section_id, member_no: p.member_no, role }); return ok();
    }); },

    'GET /api/lms/a/enrollments': req => run(req, async (c, x) => {
      const p = qs(req); const s = await sectionOf(c, p.get('section_id')); await canSection(c, x, s);
      return { section_id: s.section_id, rows: JSON.parse((await one(c, SQL_ENR, [s.section_id, p.get('grading') === '1'])).j) };
    }),
    'POST /api/lms/a/enroll': async req => { const b = await body(req, 512 * 1024); return run(req, async (c, x) => {
      const s = await sectionOf(c, b.section_id); await canSection(c, x, s); const kind = T(b.kind) || 'regular'; if (kind !== 'regular' && kind !== 'audit') throw err('enr_kind');
      if (!Array.isArray(b.member_nos) || !b.member_nos.length || b.member_nos.length > MAX_ROWS) throw err('lms_list');
      const L = [...new Set(b.member_nos.map(v => T(v)).filter(v => v !== ''))]; if (!L.length) throw err('lms_list');
      const okL = L.filter(m => RE.mno.test(m));
      const P = new Map((await q(c, 'select member_no, person_id::text from lms_person where member_no = any(string_to_array($1, \',\'))', [okL.join(',')])).rows.map(r => [r.member_no, r.person_id]));
      const cur = new Map((await q(c, 'select person_id::text, status from lms_enrollment where section_id = $1::uuid', [s.section_id])).rows.map(r => [r.person_id, r.status]));
      let added = 0, skipped = 0; const errors = [];
      for (const m of L) {
        if (!RE.mno.test(m)) { errors.push({ member_no: m, msg: R.MNO }); continue; }
        const pid = P.get(m); if (!pid) { errors.push({ member_no: m, msg: R.NOPERSON }); continue; }
        const st = cur.get(pid);
        if (st && st !== 'dropped') { skipped++; continue; }
        if (st === 'dropped') await q(c, "update lms_enrollment set status = 'enrolled', kind = $3, source = 'manual', dropped_at = null, enrolled_at = now(), decided_at = now() where section_id = $1::uuid and person_id = $2::uuid", [s.section_id, pid, kind]);
        else await q(c, "insert into lms_enrollment (tenant_id, section_id, person_id, kind, status, source, decided_at) values ($1, $2::uuid, $3::uuid, $4, 'enrolled', 'manual', now())", [x.tid, s.section_id, pid, kind]);
        cur.set(pid, 'enrolled'); added++;
      }
      await audit(c, x.tid, x.email, 'lms.enroll', { section_id: s.section_id, added, skipped, errors: errors.length }); return { added, skipped, errors: errors.slice(0, 200) };
    }); },
    'POST /api/lms/a/enroll-drop': async req => { const b = await body(req); return run(req, async (c, x) => {
      const s = await sectionOf(c, b.section_id); await canSection(c, x, s); const p = await personOf(c, T(b.member_no));
      const r = await q(c, "update lms_enrollment set status = 'dropped', dropped_at = now() where section_id = $1::uuid and person_id = $2::uuid and status <> 'dropped'", [s.section_id, p.person_id]); if (!r.rowCount) throw err('enr');
      await audit(c, x.tid, x.email, 'lms.enroll.drop', { section_id: s.section_id, member_no: p.member_no }); return ok();
    }); },

    'GET /api/lms/a/persons': req => run(req, async (c, x) => {
      adminOnly(x); const p = qs(req); const qq = T(p.get('q')); const kind = T(p.get('kind'));
      return { rows: JSON.parse((await one(c, SQL_PERSONS, [x.units ? x.units.join(',') : null, /^[A-Za-z0-9]{0,20}$/.test(qq) ? qq : '', has(MAP.kind, kind) ? MAP.kind[kind] : ''])).j) };
    }),
    'POST /api/lms/a/person': async req => { const b = await body(req); return run(req, async (c, x) => {
      adminOnly(x); const m = T(b.member_no); const kind = T(b.kind) || 'student'; const st = T(b.status) || 'active'; const unit = T(b.unit_code);
      const gy = b.grade_year == null || b.grade_year === '' ? null : Number(b.grade_year);
      if (!RE.mno.test(m)) throw err('member_no'); if (!has(MAP.kind, kind)) throw err('person_kind'); if (MAP.kind[kind] === 'student' && !RE.stu.test(m)) throw err('lms_stu');
      if (!has(MAP.status, st)) throw err('person_status'); if (gy !== null && !(Number.isInteger(gy) && gy >= 1 && gy <= 6)) throw err('grade_year');
      let u = null; if (unit) { if (!RE.unit.test(unit)) throw err('unit_code'); u = await unitRow(c, unit); if (!u) throw err('unit'); }
      if (!inUnits(x, u ? u.unit_code : null, u ? u.parent_code : null)) throw err('lms_scope');
      if (await one(c, 'select 1 from lms_person where member_no = $1', [m])) throw err('person_dup');
      await q(c, "insert into lms_person (tenant_id, member_no, kind, unit_code, status, grade_year, source) values ($1, $2, $3, $4, $5, $6, 'manual')", [x.tid, m, MAP.kind[kind], unit || null, MAP.status[st], gy]);
      await audit(c, x.tid, x.email, 'lms.person', { member_no: m }); return ok();
    }); },

    /* 학사 CSV — 미리보기(apply 없음) → 반영(apply: true, 오류 행은 빼고 반영 · 실행 기록 lms_sis_sync_run) */
    'POST /api/lms/a/import': async req => { const b = await body(req, 3 * 1024 * 1024); return run(req, async (c, x) => {
      adminOnly(x); const kind = T(b.kind); if (!['person', 'section', 'enrollment'].includes(kind)) throw err('import_kind');
      limit('lmsimp:' + x.tid, 60, 600e3);
      let term = null; if (kind !== 'person') { term = T(b.term_id); if (!RE.term.test(term)) throw err('term_id'); if (!(await one(c, 'select 1 from lms_term where term_id = $1', [term]))) throw err('term'); }
      if (typeof b.csv !== 'string' || !b.csv.trim()) throw err('csv');
      const recs = parseCsv(b.csv); if (recs.length < 2) throw err('csv');
      const rows = await validate(c, x, kind, term, recs);
      const cnt = { total: rows.length, ok: rows.filter(r => r.st === 'ok').length, skip: rows.filter(r => r.st === 'skip').length, error: rows.filter(r => r.st === 'error').length };
      const errors = rows.filter(r => r.st === 'error').slice(0, 500).map(r => ({ line: r.line, msg: r.msg }));
      const out = { kind, term_id: term, ...cnt, rows: rows.slice(0, 300).map(r => ({ line: r.line, st: r.st, msg: r.msg, data: r.data })), errors };
      if (b.apply !== true) return out;
      let ins = 0;
      for (const r of rows) {
        if (r.st !== 'ok') continue; const d = r.data;
        if (kind === 'person') await q(c, "insert into lms_person (tenant_id, member_no, kind, unit_code, status, grade_year, source) values ($1, $2, $3, $4, $5, $6, 'manual') on conflict (tenant_id, member_no) do nothing", [x.tid, d.member_no, d.kind, d.unit_code, d.status, d.grade_year]);
        else if (kind === 'section') {
          await q(c, "insert into lms_course (tenant_id, course_code, name, credits, unit_code, category, synced_at) values ($1, $2, $3, $4, $5, $6, now()) on conflict (tenant_id, course_code) do update set name = excluded.name, credits = coalesce(excluded.credits, lms_course.credits), unit_code = coalesce(excluded.unit_code, lms_course.unit_code), category = coalesce(excluded.category, lms_course.category), synced_at = now()", [x.tid, d.course_code, d.name, d.credits, d.unit_code, d.category]);
          await q(c, "insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode, capacity, source, synced_at) values ($1, $2, $3, $4, $5, $6, $7, 'sis', now()) on conflict (tenant_id, term_id, course_code, section_no) do nothing", [x.tid, term, d.course_code, d.section_no, `${d.name} ${d.section_no}분반`, d.mode, d.capacity]);
        } else await q(c, "insert into lms_enrollment (tenant_id, section_id, person_id, kind, status, source, synced_at) values ($1, $2::uuid, $3::uuid, $4, 'enrolled', 'sis', now()) on conflict (tenant_id, section_id, person_id) do update set status = 'enrolled', kind = excluded.kind, dropped_at = null, synced_at = now()", [x.tid, r._sid, r._pid, d.kind]);
        ins++;
      }
      const counts = { inserted: ins, skipped: cnt.skip, error: cnt.error };
      const run0 = await one(c, "insert into lms_sis_sync_run (tenant_id, term_id, scope, trigger, finished_at, counts, errors) values ($1, $2, $3, 'manual', now(), $4::jsonb, $5::jsonb) returning run_id::int", [x.tid, term, kind, JSON.stringify(counts), JSON.stringify(errors)]);
      await audit(c, x.tid, x.email, 'lms.import', { kind, term_id: term, ...counts });
      return { ...out, applied: true, run_id: run0.run_id, counts };
    }); },

    /* 분반 동기화(SFR-018) */
    'POST /api/lms/a/sync': async req => { const b = await body(req); return run(req, async (c, x) => {
      const s = await sectionOf(c, b.section_id); await canSection(c, x, s);
      if (s.rep_section_id) throw err('sync_rep'); if (!s.class_id) throw err('sync_class');
      const sib = (await q(c, 'select section_id::text, section_no, class_id from lms_section where term_id = $1 and course_code = $2 and section_id <> $3::uuid and rep_section_id is null order by section_no', [s.term_id, s.course_code, s.section_id])).rows;
      if (!sib.length) throw err('sync_none');
      const st = await docLoad(c, x.tid); if (!st) throw err('lms_state');
      const doc = st.doc; const CL = arr(doc.classes); const src = CL.find(k => isObj(k) && k.id === s.class_id); if (!src) throw err('sync_class');
      const dsts = []; let noclass = 0;
      for (const d of sib) { const k = d.class_id ? CL.find(y => isObj(y) && y.id === d.class_id && y !== src) : null; if (k) dsts.push({ dst: d.section_id, no: d.section_no, cls: k }); else noclass++; }
      const hist = new Map((await q(c, "select distinct on (dst_section, object_type, object_id) dst_section::text d, object_type t, object_id o, action a from lms_section_sync where dst_section = any(string_to_array($1, ',')::uuid[]) order by dst_section, object_type, object_id, id desc", [dsts.map(d => d.dst).join(',') || '00000000-0000-0000-0000-000000000000'])).rows.map(r => [`${r.d}|${r.t}|${r.o}`, r.a]));
      const R0 = syncClasses(src, dsts, hist);
      for (const l of R0.log) await q(c, 'insert into lms_section_sync (tenant_id, src_section, dst_section, object_type, object_id, action, by_person) values ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::uuid)', [x.tid, s.section_id, l.dst, l.type, l.oid, l.action, x.uid]);
      const rev = R0.changed ? await docSave(c, x.tid, doc) : st.rev;
      await audit(c, x.tid, x.email, 'lms.sync', { section_id: s.section_id, ...R0.n });
      return { sections: dsts.length, noclass, ...R0.n, rev };
    }); },
    'GET /api/lms/a/sync-history': req => run(req, async (c, x) => {
      const s = await sectionOf(c, qs(req).get('section_id')); await canSection(c, x, s);
      return { rows: JSON.parse((await one(c, SQL_SYNC_HIST, [s.section_id])).j) };
    }),

    /* 합반(SFR-019 · 052): 공유분반 숨김 · 대표분반 지정 · 활동 데이터 이전 */
    'POST /api/lms/a/merge': async req => { const b = await body(req); return run(req, async (c, x) => {
      const rep = await sectionOf(c, b.rep_section_id); await canSection(c, x, rep); if (rep.rep_section_id) throw err('merge');
      if (!Array.isArray(b.section_ids) || !b.section_ids.length || b.section_ids.length > 20) throw err('merge');
      const ids = [...new Set(b.section_ids.map(v => T(v)))]; const L = [];
      for (const id of ids) { const s = await sectionOf(c, id); await canSection(c, x, s);
        if (s.section_id === rep.section_id || s.term_id !== rep.term_id || s.rep_section_id) throw err('merge');
        if (await one(c, 'select 1 from lms_section where rep_section_id = $1::uuid limit 1', [s.section_id])) throw err('merge');
        L.push(s); }
      for (const s of L) await q(c, 'update lms_section set rep_section_id = $2::uuid, hidden = true where section_id = $1::uuid', [s.section_id, rep.section_id]);
      let moved = 0; let rev = null; const st = await docLoad(c, x.tid);
      if (st) { const CL = arr(st.doc.classes); const cr = rep.class_id ? CL.find(k => isObj(k) && k.id === rep.class_id) : null;
        const sh = cr ? L.map(s => s.class_id ? CL.find(k => isObj(k) && k.id === s.class_id && k !== cr) : null).filter(Boolean) : [];
        if (cr && sh.length) { moved = mergeActivity(cr, sh); rev = await docSave(c, x.tid, st.doc); } else rev = st.rev; }
      await audit(c, x.tid, x.email, 'lms.merge', { rep_section_id: rep.section_id, n: L.length, moved });
      return { merged: L.length, moved, rev };
    }); },
    'POST /api/lms/a/unmerge': async req => { const b = await body(req); return run(req, async (c, x) => {
      const s = await sectionOf(c, b.section_id); await canSection(c, x, s); if (!s.rep_section_id) throw err('unmerge');
      await q(c, 'update lms_section set rep_section_id = null, hidden = false where section_id = $1::uuid', [s.section_id]);
      await audit(c, x.tid, x.email, 'lms.unmerge', { section_id: s.section_id }); return ok();
    }); },

    /* 조교 · 청강 신청(SFR-025 · 051): 신청 등록 · 승인 · 반려/취소 */
    'POST /api/lms/a/request': async req => { const b = await body(req); return run(req, async (c, x) => {
      const s = await sectionOf(c, b.section_id); await canSection(c, x, s); const kind = T(b.kind); if (kind !== 'ta' && kind !== 'audit') throw err('req_kind');
      const p = await personOf(c, T(b.member_no)); await requestAdd(c, x.tid, s.section_id, p.person_id, kind, 'manual');
      await audit(c, x.tid, x.email, 'lms.request', { section_id: s.section_id, member_no: p.member_no, kind }); return ok();
    }); },
    'POST /api/lms/a/request-decide': async req => { const b = await body(req); return run(req, async (c, x) => {
      const s = await sectionOf(c, b.section_id); await canSection(c, x, s); const kind = T(b.kind); if (kind !== 'ta' && kind !== 'audit') throw err('req_kind');
      const p = await personOf(c, T(b.member_no)); const yes = b.approve === true;
      let r;
      if (kind === 'ta') r = yes ? await q(c, "update lms_section_staff set status = 'active', approved_by = $3::uuid, approved_at = now() where section_id = $1::uuid and person_id = $2::uuid and role = 'ta' and status = 'pending'", [s.section_id, p.person_id, x.uid]) : await q(c, "delete from lms_section_staff where section_id = $1::uuid and person_id = $2::uuid and role = 'ta' and status = 'pending'", [s.section_id, p.person_id]);
      else r = yes ? await q(c, "update lms_enrollment set status = 'enrolled', decided_at = now() where section_id = $1::uuid and person_id = $2::uuid and status = 'pending'", [s.section_id, p.person_id]) : await q(c, "delete from lms_enrollment where section_id = $1::uuid and person_id = $2::uuid and status = 'pending'", [s.section_id, p.person_id]);
      if (!r.rowCount) throw err('req');
      await audit(c, x.tid, x.email, 'lms.request.' + (yes ? 'approve' : 'reject'), { section_id: s.section_id, member_no: p.member_no, kind }); return ok({ status: yes ? 'approved' : 'rejected' });
    }); },

    /* 단과대학 관리 범위 · 교수 계정 연결(정운영자) */
    'POST /api/lms/a/scope': async req => { const b = await body(req); return run(req, async (c, x) => {
      if (x.role !== 'owner') throw err('lms_role');
      const email = T(b.email).toLowerCase(); const u = (await pool.query('select id::text from users where lower(email) = $1 and tenant_id = $2', [email, x.tid])).rows[0]; if (!u) throw err('lms_user');
      if (!Array.isArray(b.units) || b.units.length > 20) throw err('scope_units');
      const units = [...new Set(b.units.map(v => T(v)))]; if (units.some(v => !RE.unit.test(v))) throw err('scope_units');
      if (units.length && Number((await one(c, "select count(*) n from lms_org_unit where unit_code = any(string_to_array($1, ','))", [units.join(',')])).n) !== units.length) throw err('scope_units');
      const m = T(b.member_no); if (m && !RE.mno.test(m)) throw err('member_no');
      if (!units.length && !m) await q(c, 'delete from lms_user_link where user_id = $1::uuid', [u.id]);
      else await q(c, 'insert into lms_user_link (tenant_id, user_id, units, member_no, updated_at) values ($1, $2::uuid, string_to_array($3, \',\'), $4, now()) on conflict (tenant_id, user_id) do update set units = excluded.units, member_no = excluded.member_no, updated_at = now()', [x.tid, u.id, units.join(','), m || null]);
      await audit(c, x.tid, x.email, 'lms.scope', { email, units, member_no: m || null }); return ok();
    }); }
  };
  async function requestAdd(c, tid, sid, pid, kind, source) {
    if (kind === 'ta') {
      if (await one(c, "select 1 from lms_section_staff where section_id = $1::uuid and person_id = $2::uuid and role = 'ta'", [sid, pid])) throw err('req_dup');
      await q(c, "insert into lms_section_staff (tenant_id, section_id, person_id, role, source, status, requested_at) values ($1, $2::uuid, $3::uuid, 'ta', $4, 'pending', now())", [tid, sid, pid, source === 'manual' ? 'manual' : 'request']);
      return;
    }
    const e = await one(c, 'select status from lms_enrollment where section_id = $1::uuid and person_id = $2::uuid', [sid, pid]);
    if (e && e.status !== 'dropped') throw err('req_dup');
    if (e) await q(c, "update lms_enrollment set kind = 'audit', status = 'pending', source = $3, enrolled_at = now(), dropped_at = null where section_id = $1::uuid and person_id = $2::uuid", [sid, pid, source]);
    else await q(c, "insert into lms_enrollment (tenant_id, section_id, person_id, kind, status, source) values ($1, $2::uuid, $3::uuid, 'audit', 'pending', $4)", [tid, sid, pid, source]);
  }

  /* 학습자 포털(/api/pub/{tid}/lms): 내 분반(공유분반은 대표분반으로) · 내 신청 · 청강 신청 가능 분반 / 청강 · 조교 신청 · 취소 */
  /* 학습자 세션(학습자 포털 쿠키) — 운영(__Host-) · 개발(COOKIE_SECURE=0) 이름 모두 받되, 토큰은 서버 세션 해시로만 인정 */
  async function lsess(req) {
    const ck = Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => v.trim().split('=')).filter(v => v[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
    const t = ck['__Host-dd_lsid'] || ck.dd_lsid; if (!t || t.length > 100) throw new HttpErr(401, '로그인이 필요합니다.', 'auth');
    const r = (await pool.query('select tenant_id, sid from learner_sessions where id = $1 and expires_at > now()', [crypto.createHash('sha256').update(t).digest('hex')])).rows[0];
    if (!r) throw new HttpErr(401, '로그인이 필요합니다.', 'auth'); return r;
  }
  async function pubLms(req) {
    const s = await lsess(req); const tid = s.tenant_id;
    const t = (await pool.query('select type from tenants where id = $1', [tid])).rows[0]; if (!t || t.type !== 'univ') throw err('lms_edition');
    const b = req.method === 'POST' ? await readBody(req, 4096) : null;
    if (b) limit(`lpr:${tid}:${s.sid}`, 30, 600e3);
    return inTenant(pool, tid, async c => {
      let p = await one(c, 'select person_id::text, member_no from lms_person where member_no = $1', [s.sid]);
      if (!p && RE.uuid.test(s.sid)) { const a = await one(c, 'select student_no from learner_accounts where learner_id = $1::uuid', [s.sid]); if (a && a.student_no) p = await one(c, 'select person_id::text, member_no from lms_person where member_no = $1', [a.student_no]); }
      if (!b) { if (!p) return { me: null, sections: [], requests: [], open: [] }; return { me: { member_no: p.member_no }, ...JSON.parse((await one(c, SQL_PUB, [p.person_id])).j) }; }
      if (!p) throw err('person');
      const act = T(b.act); const kind = T(b.kind); if (kind !== 'ta' && kind !== 'audit') throw err('req_kind');
      const sid = T(b.section_id); if (!RE.uuid.test(sid)) throw err('section');
      if (act === 'request') {
        const sec = await one(c, "select s.section_id::text from lms_section s join lms_term t on t.tenant_id = s.tenant_id and t.term_id = s.term_id where s.section_id = $1::uuid and t.is_operating and s.status = 'open' and not s.hidden and s.rep_section_id is null", [sid]); if (!sec) throw err('section');
        await requestAdd(c, tid, sid, p.person_id, kind, 'request'); await audit(c, tid, 'learner:' + s.sid, 'lms.request.self', { section_id: sid, kind }); return { ok: true };
      }
      if (act !== 'cancel') throw err('req_kind');
      const r = kind === 'ta' ? await q(c, "delete from lms_section_staff where section_id = $1::uuid and person_id = $2::uuid and role = 'ta' and status = 'pending'", [sid, p.person_id])
        : await q(c, "update lms_enrollment set status = 'dropped', dropped_at = now() where section_id = $1::uuid and person_id = $2::uuid and kind = 'audit' and status in ('pending','enrolled')", [sid, p.person_id]);
      if (!r.rowCount) throw err('req');
      await audit(c, tid, 'learner:' + s.sid, 'lms.request.cancel', { section_id: sid, kind }); return { ok: true };
    });
  }
  routes['GET /api/lms/a/my'] = req => pubLms(req);
  routes['POST /api/lms/a/my'] = req => pubLms(req);
  return routes;
}

module.exports = ctx => createLms(ctx);
Object.assign(module.exports, { parseCsv, syncClasses, mergeActivity, itemHash, E, R });
