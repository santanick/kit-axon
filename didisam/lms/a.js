/* v30 학사 LMS 묶음 A — 강좌 · 분반 운영(전남대 e클래스2.0 RFP SFR-003 · 018 · 019 · 021 · 025 · 031 · 050 · 051 · 052)
   탭: 학기 / 교과목 / 분반 / 수강 / 학사 업로드 / 조교 · 청강 신청 / 조직 · 권한 (교수 화면: 내 분반 / 수강 / 조교 · 청강 신청)
   - 데모: S.lms.a 상태(학번 · 학과 · 학적만 저장) + 서버와 같은 규칙 · 문구로 이 브라우저에서 처리
   - 운영: /api/lms/a/* (서버가 권한 · 단과대학 범위 · RLS를 강제). 분반 동기화 · 합반은 서버가 기관 문서를 고치므로 처리 뒤 최신 상태를 다시 받는다.
   학사 자동 동기화 · 자동 합반(Code Share) · 승인 메일 실발송은 연동 지점(「학사 연동 시 자동」)으로만 표시한다. */
(function () {
  'use strict';
  if (typeof MENU !== 'object' || typeof VIEWS !== 'object') return;
  const ON = () => !!(S && S.org && S.org.type === 'univ' && S.org.ed === 'lms');
  try { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/a.css?v=31.8'; document.head.appendChild(l); } catch (e) { }

  /* ── 메뉴 · 프리셋 ── */
  MENU.lmsa = { label: '강좌 · 분반', ws: 'learn', only: 'univ' };
  if (PRESET.univ_lms) { const P = PRESET.univ_lms; P.off = P.off.filter(x => x !== 'lmsa'); if (!P.on.includes('lmsa')) P.on.splice(Math.max(0, P.on.indexOf('class') + 1), 0, 'lmsa'); }
  Object.keys(PRESET).forEach(k => { if (k === 'univ_lms') return; const P = PRESET[k]; if (!P.on.includes('lmsa') && !P.off.includes('lmsa')) P.off.push('lmsa'); });
  const navOn = () => { if (!S || !S.nav || !ON() || typeof navAdd !== 'function') return; if (!Object.values(S.nav.tabs).some(L => L.some(x => x.id === 'lmsa'))) { navAdd('lmsa', true); } };
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { navOn(); } catch (e) { } return r; }; } // eslint-disable-line no-global-assign
  if (typeof ACT['ed-chg'] === 'function') { /* 대학 도입 형태를 학사 LMS로 바꾸면 프리셋이 새로 깔리므로 따로 할 일 없음 */ }

  /* ── 문구(서버 mod-a.js와 같음) ── */
  const E = {
    lms_role: '학사 관리 권한이 없습니다.', lms_scope: '담당 단과대학 범위 밖의 항목입니다.', term_id: '학기 코드는 2026-1 · 2026-2 · 2026-S · 2026-W 형식으로 입력하세요.', lms_name: '이름을 1~60자로 입력하세요.',
    lms_date: '시작일 · 종료일(YYYY-MM-DD)을 확인하세요.', unit_code: '조직 코드는 영문 · 숫자 2~20자입니다.', unit_kind: '조직 구분을 고르세요.', course_code: '학수번호는 영문 · 숫자 4~20자입니다.', credits: '학점은 0~30 사이 숫자입니다.',
    category: '교과 구분을 고르세요.', section_no: '분반 번호는 숫자 1~3자리입니다.', lms_mode: '수업 방식을 고르세요.', capacity: '정원은 0~9999 사이 정수입니다.', class_id: '연결할 강의실 번호가 올바르지 않습니다.',
    member_no: '학번(사번) 형식이 올바르지 않습니다.', person_kind: '구성원 구분을 고르세요.', person_status: '학적 상태를 고르세요.', grade_year: '학년은 1~6 사이 숫자입니다.', lms_stu: '학생 학번은 숫자 6~10자리입니다.',
    staff_role: '담당 역할을 고르세요.', staff_kind: '교수 · 공동교수는 교수 구성원만 지정할 수 있습니다.', enr_kind: '수강 구분(정규 · 청강)을 고르세요.', req_kind: '신청 구분(조교 · 청강)을 고르세요.', import_kind: '올릴 데이터 종류를 고르세요.',
    csv: 'CSV 내용이 없습니다.', csv_head: '첫 줄(머리글)에 필수 열이 없습니다. 양식을 내려받아 확인하세요.', csv_rows: '한 번에 5,000행까지 올릴 수 있습니다.', lms_list: '학번 목록을 확인하세요(한 번에 5,000명까지).',
    merge: '합반할 분반을 확인하세요(같은 학기 · 대표 분반 제외 · 이미 합반된 분반 제외).', unmerge: '합반된 분반이 아닙니다.', sync_rep: '다른 분반에 합반된 분반은 동기화의 기준이 될 수 없습니다.', sync_class: '대표 분반에 강의실이 연결되어 있지 않습니다.',
    sync_none: '같은 교과목 · 학기에 동기화할 다른 분반이 없습니다.', scope_units: '단과대학 · 학과 코드를 확인하세요.', term: '없는 학기입니다.', unit: '없는 조직입니다.', course: '없는 교과목입니다.', section: '없는 분반입니다.',
    person: '등록되지 않은 학번(사번)입니다.', staff: '등록된 담당자가 없습니다.', enr: '수강 정보가 없습니다.', req: '처리할 신청이 없습니다.', section_dup: '같은 학기에 같은 분반 번호가 이미 있습니다.', in_use: '연결된 분반 · 수강 정보가 있어 삭제할 수 없습니다.',
    req_dup: '이미 신청했거나 등록되어 있습니다.', staff_dup: '이미 같은 역할로 등록되어 있습니다.', person_dup: '이미 등록된 학번(사번)입니다.', merged: '합반된 분반이 있어 먼저 합반을 해제해야 합니다.'
  };
  const R = {
    MNO: '학번(사번) 형식이 올바르지 않습니다.', STU: '학생 학번은 숫자 6~10자리입니다.', KIND: '구분은 학생 · 교수 · 직원 · 외부 중 하나입니다.', STAT: '학적은 재학 · 휴학 · 졸업 · 제적 · 자퇴 · 퇴직 중 하나입니다.', YEAR: '학년은 1~6 사이 숫자입니다.',
    UNIT: '없는 학과 코드입니다.', SCOPE: '담당 범위 밖의 학과입니다.', DUPF: '파일 안에 같은 행이 이미 있습니다.', EXIST_P: '이미 등록된 학번입니다(건너뜀).', COURSE: '학수번호 형식이 올바르지 않습니다.', CNAME: '교과목명을 입력하세요(60자 이내).',
    SECNO: '분반 번호는 숫자 1~3자리입니다.', MODE: '수업 방식은 온라인 · 블렌디드 · 오프라인 · 하이플렉스 중 하나입니다.', CAP: '정원은 0~9999 사이 정수입니다.', CRED: '학점은 0~30 사이 숫자입니다.',
    CAT: '교과 구분은 전공 · 교양 · 일반선택 · 비교과 · 공개 · 학점교류 중 하나입니다.', EXIST_S: '이미 있는 분반입니다(건너뜀).', NOPERSON: '등록되지 않은 학번입니다.', NOSEC: '이 학기에 없는 교과목 · 분반입니다.', ENRKIND: '구분은 정규 · 청강 중 하나입니다.', EXIST_E: '이미 수강 중입니다(건너뜀).'
  };
  const MAP = {
    kind: { 학생: 'student', 교수: 'professor', 직원: 'staff', 외부: 'external', student: 'student', professor: 'professor', staff: 'staff', external: 'external' },
    status: { 재학: 'active', 휴학: 'leave', 졸업: 'graduated', 제적: 'expelled', 자퇴: 'withdrawn', 퇴직: 'retired', active: 'active', leave: 'leave', graduated: 'graduated', expelled: 'expelled', withdrawn: 'withdrawn', retired: 'retired' },
    mode: { 온라인: 'online', 블렌디드: 'blended', 오프라인: 'offline', 하이플렉스: 'hyflex', online: 'online', blended: 'blended', offline: 'offline', hyflex: 'hyflex' },
    cat: { 전공: 'major', 교양: 'general', 일반선택: 'elective', 비교과: 'extracurricular', 공개: 'open', 학점교류: 'exchange', major: 'major', general: 'general', elective: 'elective', extracurricular: 'extracurricular', open: 'open', exchange: 'exchange' },
    enr: { 정규: 'regular', 청강: 'audit', regular: 'regular', audit: 'audit' }
  };
  const L = {
    mode: { online: '온라인', blended: '블렌디드', offline: '오프라인', hyflex: '하이플렉스' }, kind: { student: '학생', professor: '교수', staff: '직원', external: '외부' },
    status: { active: '재학', leave: '휴학', graduated: '졸업', expelled: '제적', withdrawn: '자퇴', retired: '퇴직' }, cat: { major: '전공', general: '교양', elective: '일반선택', extracurricular: '비교과', open: '공개', exchange: '학점교류' },
    role: { professor: '교수', co_professor: '공동교수', ta: '조교', grader: '채점자', staff: '직원' }, ukind: { univ: '대학본부', college: '단과대학', dept: '학과', major: '전공', office: '부서' },
    enr: { regular: '정규', audit: '청강' }, sec: { draft: '준비', open: '운영', closed: '종료', archived: '보관' }, imp: { person: '구성원(비학사 사용자)', section: '교과목 · 분반', enrollment: '수강' },
    act: { copied: '복제', updated: '갱신', deleted: '삭제', excluded: '제외(분반에서 수정 · 삭제)' }, obj: { notice: '공지', material: '자료', week: '차시', assignment: '과제', discussion: '토론', exam: '시험' }
  };
  const has = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
  const RE = { term: /^\d{4}-(1|2|S|W)$/, unit: /^[A-Za-z0-9_-]{2,20}$/, course: /^[A-Za-z0-9-]{4,20}$/, secno: /^\d{1,3}$/, mno: /^[A-Za-z0-9]{4,20}$/, stu: /^\d{6,10}$/, cls: /^[A-Za-z0-9_-]{1,40}$/, date: /^\d{4}-\d{2}-\d{2}$/ };
  const T = v => String(v == null ? '' : v).trim();
  const secNo = v => { const s = T(v); return RE.secno.test(s) ? (s.length === 1 ? '0' + s : s) : null; };
  const dateOk = d => RE.date.test(d) && !isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const arr = v => Array.isArray(v) ? v : [];
  const fail = k => { throw new Error(E[k] || k); };
  const iso = () => new Date().toISOString();
  const newId = () => { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) { } const h = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20)}`; };

  /* ── CSV · 분반 동기화 · 합반(서버와 같은 알고리즘) ── */
  function parseCsv(text) {
    let s = String(text == null ? '' : text); if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    const recs = []; let rec = []; let f = ''; let q = false; let i = 0;
    while (i < s.length) { const ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; } f += ch; i++; continue; }
      if (ch === '"' && f === '') { q = true; i++; continue; }
      if (ch === ',') { rec.push(f); f = ''; i++; continue; }
      if (ch === '\r' || ch === '\n') { rec.push(f); recs.push(rec); rec = []; f = ''; i += ch === '\r' && s[i + 1] === '\n' ? 2 : 1; continue; }
      f += ch; i++; }
    if (f !== '' || rec.length) { rec.push(f); recs.push(rec); }
    return recs.map(r => r.map(x => x.trim().slice(0, 200))).filter(r => r.some(x => x !== ''));
  }
  const TYPEMAP = { chapter: 'week', offline: 'week', live: 'week', week: 'week', assign: 'assignment', assignment: 'assignment', discuss: 'discussion', discussion: 'discussion', board: 'discussion', survey: 'discussion', quiz: 'exam', exam: 'exam' };
  const objType = (list, it) => list === 'notices' ? 'notice' : (typeof it.type === 'string' && has(TYPEMAP, it.type) ? TYPEMAP[it.type] : 'material');
  const canon = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const itemHash = it => { const o = {}; Object.keys(it).forEach(k => { if (k !== 'id' && k !== 'syncSrc' && k !== 'syncHash') o[k] = it[k]; }); return fnv(canon(o)); };
  function syncClasses(src, dsts, hist) {
    const n = { copied: 0, updated: 0, deleted: 0, excluded: 0, unchanged: 0 }; const log = []; let changed = false;
    for (const { dst, no, cls } of dsts) for (const list of ['notices', 'curriculum']) {
      const S0 = arr(src[list]).filter(it => isObj(it) && typeof it.id === 'string' && it.id !== ''); if (!Array.isArray(cls[list])) cls[list] = [];
      const D = cls[list]; const ids = new Set(S0.map(it => it.id));
      for (const it of S0) {
        const type = objType(list, it); const key = `${dst}|${type}|${it.id}`; const last = hist.get(key) || '';
        if (last === 'excluded') { n.excluded++; continue; }
        const h = itemHash(it); const i = D.findIndex(x => isObj(x) && x.syncSrc === it.id);
        if (i < 0) { if (last === 'copied' || last === 'updated') { n.excluded++; log.push({ dst, type, oid: it.id, action: 'excluded' }); hist.set(key, 'excluded'); continue; }
          D.push({ ...it, id: it.id + '-' + no, syncSrc: it.id, syncHash: h }); n.copied++; changed = true; log.push({ dst, type, oid: it.id, action: 'copied' }); hist.set(key, 'copied'); continue; }
        const x = D[i];
        if (itemHash(x) !== x.syncHash) { n.excluded++; log.push({ dst, type, oid: it.id, action: 'excluded' }); hist.set(key, 'excluded'); continue; }
        if (x.syncHash === h) { n.unchanged++; continue; }
        D[i] = { ...it, id: x.id, syncSrc: it.id, syncHash: h }; n.updated++; changed = true; log.push({ dst, type, oid: it.id, action: 'updated' }); hist.set(key, 'updated');
      }
      for (let i = D.length - 1; i >= 0; i--) { const x = D[i]; if (!isObj(x) || typeof x.syncSrc !== 'string' || ids.has(x.syncSrc)) continue; if (itemHash(x) !== x.syncHash) continue;
        D.splice(i, 1); n.deleted++; changed = true; const type = objType(list, x); log.push({ dst, type, oid: x.syncSrc, action: 'deleted' }); hist.set(`${dst}|${type}|${x.syncSrc}`, 'deleted'); }
    }
    return { changed, log, n };
  }
  function mergeActivity(rep, shared) {
    let moved = 0; if (!Array.isArray(rep.learners)) rep.learners = []; if (!isObj(rep.prog)) rep.prog = {};
    for (const cs of shared) { for (const id of arr(cs.learners)) if (!rep.learners.some(x => x === id)) rep.learners.push(id);
      if (isObj(cs.prog)) for (const k of Object.keys(cs.prog)) { if (!has(rep.prog, k)) { rep.prog[k] = cs.prog[k]; moved++; } }
      cs.learners = []; cs.prog = {}; cs.mergedInto = rep.id; }
    return moved;
  }

  /* ═════════ 데모 저장소(S.lms.a) · 시드 ═════════ */
  function seed() {
    const A = { v: 1, terms: [], units: [], courses: [], persons: [], sections: [], staff: [], enr: [], sync: [], runs: [], scopes: { sub: { units: ['ENG'] }, teacher: { member_no: 'P0001' } } };
    A.terms.push({ term_id: (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() < 7 ? 1 : 2}`; })(), name: '', starts_on: '', ends_on: '', is_operating: true });
    { const t = A.terms[0]; const y = t.term_id.slice(0, 4); const h = t.term_id.slice(5); t.name = `${y}학년도 ${h}학기`; t.starts_on = h === '1' ? `${y}-03-02` : `${y}-09-01`; t.ends_on = h === '1' ? `${y}-06-20` : `${y}-12-20`; }
    [['ENG', '공과대학', 'college', null], ['BIZ', '경영대학', 'college', null], ['CSE', '컴퓨터공학과', 'dept', 'ENG'], ['MEC', '기계공학과', 'dept', 'ENG'], ['BUS', '경영학과', 'dept', 'BIZ'], ['ACC', '회계학과', 'dept', 'BIZ']].forEach(([unit_code, name, kind, parent_code]) => A.units.push({ unit_code, name, kind, parent_code }));
    [['GEN1001', 'AI 리터러시(교양)', 3, 'CSE', 'general'], ['CSE2001', '데이터 분석 기초', 3, 'CSE', 'major'], ['CSE3001', '캡스톤디자인', 3, 'CSE', 'major'], ['MEC3001', '열역학', 3, 'MEC', 'major'], ['BUS2001', '경영학원론', 3, 'BUS', 'major'], ['ACC2001', '회계원리', 3, 'ACC', 'major']]
      .forEach(([course_code, name, credits, unit_code, category]) => A.courses.push({ course_code, name, credits, unit_code, category }));
    const U4 = ['CSE', 'MEC', 'BUS', 'ACC'];
    for (let i = 0; i < 60; i++) A.persons.push({ member_no: String(20261000 + i), kind: 'student', unit_code: U4[i % 4], status: i % 17 === 9 ? 'leave' : 'active', grade_year: 1 + (i % 4), source: 'sis' });
    [['P0001', 'CSE'], ['P0002', 'CSE'], ['P0003', 'MEC'], ['P0004', 'BUS'], ['P0005', 'ACC']].forEach(([m, u]) => A.persons.push({ member_no: m, kind: 'professor', unit_code: u, status: 'active', grade_year: null, source: 'sis' }));
    const t = A.terms[0].term_id; const cls = S.classes || [];
    const mk = (code, no, mode, cap, class_id, sch, extra = {}) => { const id = newId(); const co = A.courses.find(c => c.course_code === code); A.sections.push({ section_id: id, term_id: t, course_code: code, section_no: no, title: `${co.name} ${no}분반`, mode, capacity: cap, schedule: sch, rep_section_id: null, hidden: false, class_id, status: 'open', source: 'sis', ...extra }); return id; };
    /* 3분반 과목(분반 동기화 데모): 01분반 = 기존 강의실, 02 · 03분반 = 새 강의실 */
    const base = cls[0]; const mkCls = (id, name) => { if (!base || cls.some(c => c.id === id)) return cls.some(c => c.id === id) ? id : null; const c = JSON.parse(JSON.stringify(base)); Object.assign(c, { id, name, learners: [], prog: {}, curriculum: [], notices: [] }); cls.push(c); return id; };
    const g1 = mk('GEN1001', '01', 'blended', 60, base ? base.id : null, [{ day: '월', period: '1-2', room: '공학관 301' }]);
    const g2 = mk('GEN1001', '02', 'online', 60, mkCls('c_lmsa_g2', 'AI 리터러시(교양) 02분반'), []);
    const g3 = mk('GEN1001', '03', 'hyflex', 60, mkCls('c_lmsa_g3', 'AI 리터러시(교양) 03분반'), [{ day: '수', period: '5-6', room: '공학관 205' }]);
    const d1 = mk('CSE2001', '01', 'offline', 40, cls[2] ? cls[2].id : null, [{ day: '화', period: '3-4', room: '공학관 402' }]);
    const cp = mk('CSE3001', '01', 'offline', 30, cls[3] ? cls[3].id : null, [{ day: '목', period: '6-8', room: '창의관 101' }]);
    const m1 = mk('MEC3001', '01', 'offline', 50, null, [{ day: '화', period: '1-2', room: '기계관 110' }]);
    const m2 = mk('MEC3001', '02', 'offline', 50, null, [{ day: '화', period: '1-2', room: '기계관 110' }]);
    const b1 = mk('BUS2001', '01', 'offline', 45, null, [{ day: '금', period: '1-2', room: '경영관 201' }]);
    const b2 = mk('BUS2001', '02', 'online', 45, null, []);
    const a1 = mk('ACC2001', '01', 'blended', 40, null, [{ day: '목', period: '3-4', room: '경영관 305' }]);
    const sm2 = A.sections.find(s => s.section_id === m2); sm2.rep_section_id = m1; sm2.hidden = true; /* 합반(대표 01분반) */
    const st = (sid, m, role, status = 'active', source = 'sis') => A.staff.push({ section_id: sid, member_no: m, role, status, source, at: iso() });
    [g1, g2, g3, d1, cp].forEach(s => st(s, 'P0001', 'professor')); st(g1, 'P0002', 'co_professor'); st(m1, 'P0003', 'professor'); st(m2, 'P0003', 'professor'); [b1, b2].forEach(s => st(s, 'P0004', 'professor')); st(a1, 'P0005', 'professor');
    st(g1, '20261050', 'ta', 'pending', 'request');
    const en = (sid, m, kind = 'regular', status = 'enrolled', source = 'sis') => A.enr.push({ section_id: sid, member_no: m, kind, status, source, at: iso() });
    const SEC = [g1, g2, g3, d1, cp, m1, m2, b1, b2, a1];
    for (let i = 0; i < 60; i++) { const m = String(20261000 + i); if (i === 50 || i === 51) continue; en(SEC[i % 3], m); en(SEC[3 + (i % 7)], m); }
    en(g1, '20261002', 'audit'); en(b1, '20261051', 'audit', 'pending', 'request');
    A.runs.push({ run_id: 1, term_id: t, scope: 'enrollment', trigger: 'manual', at: iso(), counts: { inserted: A.enr.length, skipped: 0, error: 0 }, errors_n: 0, errors: [] });
    return A;
  }
  /* v38 빈 스튜디오: 학사 샘플 없이 이번 학기만 만든다(교과목 · 분반 · 구성원 · 조직 없음) */
  const EMPTY = () => !!(S && S.org && S.org.empty);
  function seedEmpty() { const A = seed0(); A.scopes = { sub: { units: [] }, teacher: { member_no: null } }; return A; }
  function seed0() { const A = { v: 1, terms: [], units: [], courses: [], persons: [], sections: [], staff: [], enr: [], sync: [], runs: [], scopes: { sub: { units: ['ENG'] }, teacher: { member_no: 'P0001' } } };
    const d = new Date(); const y = d.getFullYear(), h = d.getMonth() < 7 ? '1' : '2'; A.terms.push({ term_id: `${y}-${h}`, name: `${y}학년도 ${h}학기`, starts_on: h === '1' ? `${y}-03-02` : `${y}-09-01`, ends_on: h === '1' ? `${y}-06-20` : `${y}-12-20`, is_operating: true }); return A; }
  const ens = () => { S.lms = S.lms || {}; if (!S.lms.a) { S.lms.a = EMPTY() ? seedEmpty() : seed(); try { save(); } catch (e) { } } const A = S.lms.a; try { if (ON() && !LIVEM()) bridge(A); } catch (e) { console.error('lmsa bridge', e); } return A; };
  window.lmsaEns = ens;

  /* ═════════ v38 한 번 등록: 학번 등록(접근코드) = 학사 구성원 = 강의실 · 출결 구성원 ═════════
     - 학생 › 학번 등록(접근코드 발급)한 학번은 학사 구성원(학생)으로 자동 등록한다(학과명은 같은 이름의 학과로 잇고, 없으면 학과를 만든다).
     - 학사 구성원 · 분반 · 수강 · 담당이 바뀌면 강의실(묶음 B · S.lms.bcd)과 출결 · 강의 · 성찰(묶음 G · S.lms.w3)에 같은 분반 · 학번으로 반영한다.
       (데모 전용 — 운영 서버는 같은 학사 테이블을 모든 묶음이 함께 읽는다) */
  let bridging = false;
  const unitCode = (A, raw, create) => { const v = T(raw); if (!v) return null; const lo = v.toLowerCase();
    const u = A.units.find(x => x.unit_code.toLowerCase() === lo || x.name === v); if (u) return u.unit_code; if (!create) return undefined;
    let n = A.units.length + 1, code; do { code = 'D' + String(n++).padStart(3, '0'); } while (A.units.some(x => x.unit_code === code));
    A.units.push({ unit_code: code, name: v.slice(0, 60), kind: 'dept', parent_code: null }); return code; };
  function codesToPersons(A) { const C = Array.isArray(S.codes) ? S.codes : []; if (A._cn === C.length) return false; const have = new Set(A.persons.map(p => p.member_no)); let n = 0;
    C.forEach(c => { const m = T(c.sid); if (!m || have.has(m) || !RE.mno.test(m)) return; have.add(m); A.persons.push({ member_no: m, kind: RE.stu.test(m) ? 'student' : 'external', unit_code: unitCode(A, c.dept, true), status: 'active', grade_year: null, source: 'code' }); n++; });
    A._cn = C.length; return n > 0; }
  /* 구성원(학생)을 엑셀 · 직접 등록으로 넣으면 접근코드도 함께 발급해 학습자 로그인까지 한 번에 이어지게 한다 */
  function issueCodes(list) { if (!Array.isArray(S.codes) || !Array.isArray(S.members)) return 0; const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const mk = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => ch[b % ch.length]).join('');
    const have = new Set(S.codes.map(c => c.sid)); const mem = new Set(S.members.flatMap(m => [m.sid, (m.extra || {}).학번]).filter(Boolean)); const gid = new Map((S.groups || []).map(g => [g.name, g.id])); let n = 0;
    list.forEach(({ sid, dept }) => { if (!RE.stu.test(sid)) return; const dp = String(dept || '').slice(0, 20); if (!have.has(sid)) { S.codes.unshift({ sid, dept: dp, code: mk(), at: today() }); have.add(sid); n++; }
      if (!mem.has(sid)) { S.members.push({ id: uid('m'), name: sid, nick: '', email: '', phone: '', sid, group: gid.get(dp) || '', grade: '정회원', joined: today(), last: '', extra: { 학번: sid, 학과: dp } }); mem.add(sid); } });
    const A = S.lms && S.lms.a; if (A) A._cn = S.codes.length; return n; }
  const bump = () => { const A = S.lms && S.lms.a; if (A) A.rev = (A.rev || 0) + 1; };
  function bridge(A) { if (bridging) return; bridging = true;
    try { const ch = codesToPersons(A); if (ch) A.rev = (A.rev || 0) + 1; if (!A.rev) A.rev = 1;
      if (A._pj !== A.rev) { let done = 0; try { if (window.LMSX && typeof LMSX.syncA === 'function') { LMSX.syncA(A); done++; } } catch (e) { console.error('lmsa→강의실', e); } try { if (window.W3 && typeof W3.syncA === 'function') { W3.syncA(A); done++; } } catch (e) { console.error('lmsa→출결', e); }
        if (done) { A._pj = A.rev; try { save(); } catch (e) { } try { if (window.LMSX) LMSX.sections = null; if (window.W3 && W3.drop) W3.drop(); if (window.EFH && EFH.drop) EFH.drop(); } catch (e) { } } } }
    finally { bridging = false; } }
  window.lmsaPoke = () => { if (!bridging && ON() && !LIVEM()) ens(); };
  window.lmsaBump = () => { bump(); window.lmsaPoke(); };
  window.lmsaIssue = issueCodes;

  /* ── 권한 맥락(데모: 화면 권한 선택 = 역할) ── */
  function ctx() { const A = ens(); const role = S.me.role; const admin = role === 'owner' || role === 'sub';
    const su = A.scopes.sub || {}; const tc = A.scopes.teacher || {};
    return { role, admin, units: role === 'sub' && arr(su.units).length ? su.units.slice() : null, mno: admin ? null : (tc.member_no || '') }; }
  const unitOf = code => ens().units.find(u => u.unit_code === code) || null;
  const inUnits = (x, unit, parent) => !x.units || (unit != null && x.units.includes(unit)) || (parent != null && x.units.includes(parent));
  const courseOf = code => ens().courses.find(c => c.course_code === code) || null;
  const secView = s => { const c = courseOf(s.course_code) || {}; const u = unitOf(c.unit_code); return { ...s, unit_code: c.unit_code || null, parent_code: u ? u.parent_code : null }; };
  const adminOnly = x => { if (!x.admin) fail('lms_role'); };
  const fullAdmin = x => { adminOnly(x); if (x.units) fail('lms_scope'); };
  const visible = (x, s) => { const v = secView(s); if (!inUnits(x, v.unit_code, v.parent_code)) return false; if (x.mno !== null) return ens().staff.some(t => t.section_id === s.section_id && t.member_no === x.mno && t.status === 'active'); return true; };
  function sectionOf(id) { const s = ens().sections.find(y => y.section_id === T(id)); if (!s) fail('section'); return s; }
  function canSection(x, s) { const v = secView(s); if (x.admin) { if (!inUnits(x, v.unit_code, v.parent_code)) fail('lms_scope'); return; }
    if (!(x.mno && ens().staff.some(t => t.section_id === s.section_id && t.member_no === x.mno && t.status === 'active' && (t.role === 'professor' || t.role === 'co_professor')))) fail('lms_role'); }
  function personOf(m) { if (!RE.mno.test(m)) fail('member_no'); const p = ens().persons.find(y => y.member_no === m); if (!p) fail('person'); return p; }
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;

  function demoOverview() {
    const A = ens(); const x = ctx(); const secs = A.sections.filter(s => visible(x, s));
    const courses = A.courses.filter(c => { const u = unitOf(c.unit_code); return inUnits(x, c.unit_code || null, u ? u.parent_code : null) && (x.mno === null || secs.some(s => s.course_code === c.course_code)); }).sort((a, b) => cmp(a.course_code, b.course_code));
    const cnt = (s, f) => A.enr.filter(e => e.section_id === s.section_id && f(e)).length;
    const sections = secs.slice().sort((a, b) => cmp(b.term_id, a.term_id) || cmp(a.course_code, b.course_code) || cmp(a.section_no, b.section_no)).map(s => { const c = courseOf(s.course_code) || {};
      return { ...s, course_name: c.name || '', unit_code: c.unit_code || null, staff: A.staff.filter(t => t.section_id === s.section_id).sort((a, b) => cmp(a.role, b.role) || cmp(a.member_no, b.member_no)).map(t => ({ member_no: t.member_no, role: t.role, status: t.status, source: t.source })),
        enrolled: cnt(s, e => e.status === 'enrolled' && e.kind === 'regular'), audit: cnt(s, e => e.status === 'enrolled' && e.kind === 'audit'), pending: cnt(s, e => e.status === 'pending') + A.staff.filter(t => t.section_id === s.section_id && t.status === 'pending').length }; });
    const sid = new Set(secs.map(s => s.section_id)); const pu = m => (A.persons.find(p => p.member_no === m) || {}).unit_code || null;
    const requests = [...A.staff.filter(t => t.status === 'pending').map(t => ({ section_id: t.section_id, member_no: t.member_no, unit_code: pu(t.member_no), kind: 'ta', at: t.at })), ...A.enr.filter(e => e.status === 'pending').map(e => ({ section_id: e.section_id, member_no: e.member_no, unit_code: pu(e.member_no), kind: 'audit', at: e.at }))].filter(r => sid.has(r.section_id)).sort((a, b) => cmp(a.at, b.at) || cmp(a.member_no, b.member_no));
    return { me: { role: x.role, admin: x.admin, units: x.units, member_no: x.mno }, terms: A.terms.slice().sort((a, b) => cmp(b.term_id, a.term_id)), units: A.units.slice().sort((a, b) => cmp(a.kind, b.kind) || cmp(a.unit_code, b.unit_code)), courses, sections, requests,
      runs: x.mno === null ? A.runs.slice().sort((a, b) => b.run_id - a.run_id).slice(0, 20) : [], persons: { total: A.persons.length, manual: A.persons.filter(p => p.source === 'manual').length },
      scopes: x.role === 'owner' ? [{ email: '부운영자 화면(데모)', role: 'sub', units: arr(A.scopes.sub.units), member_no: null }, { email: `${t('teacher')} 화면(데모)`, role: 'teacher', units: [], member_no: A.scopes.teacher.member_no || null }] : [] };
  }
  function demoRoster(sec, grading) { const A = ens(); const ids = new Set([sec.section_id, ...A.sections.filter(s => s.rep_section_id === sec.section_id).map(s => s.section_id)]);
    return A.enr.filter(e => ids.has(e.section_id) && e.status !== 'dropped' && (!grading || (e.kind === 'regular' && e.status === 'enrolled'))).map(e => { const p = A.persons.find(y => y.member_no === e.member_no) || {}; const s = A.sections.find(y => y.section_id === e.section_id) || {};
      return { member_no: e.member_no, person_kind: p.kind, unit_code: p.unit_code || null, status: p.status, kind: e.kind, enr_status: e.status, source: e.source, section_no: s.section_no, at: e.at }; }).sort((a, b) => cmp(a.member_no, b.member_no) || cmp(a.section_no, b.section_no)); }
  /* 학생에게 보이는 분반(서버 /api/lms/a/my 와 같은 규칙: 공유분반은 대표분반으로, 숨김 분반은 보이지 않음) */
  function studentView(m) { const A = ens(); const out = new Map();
    const add = (sid, kind) => { const s0 = A.sections.find(s => s.section_id === sid); if (!s0) return; const v = A.sections.find(s => s.section_id === (s0.rep_section_id || s0.section_id)); if (!v || !['open', 'closed'].includes(v.status)) return; if (out.has(v.section_id)) { const o = out.get(v.section_id); if (kind === 'ta') o.ta = true; else if (o.kind === 'ta') { o.kind = kind; o.ta = true; } return; }
      out.set(v.section_id, { section_id: v.section_id, course_code: v.course_code, course_name: (courseOf(v.course_code) || {}).name || '', section_no: v.section_no, title: v.title, mode: v.mode, kind, ta: kind === 'ta', via: s0.section_id !== v.section_id ? s0.section_no : null }); };
    A.enr.filter(e => e.member_no === m && e.status === 'enrolled').forEach(e => add(e.section_id, e.kind)); A.staff.filter(t => t.member_no === m && t.status === 'active').forEach(t => add(t.section_id, 'ta'));
    return [...out.values()].sort((a, b) => cmp(a.course_code, b.course_code) || cmp(a.section_no, b.section_no)); }

  /* CSV 검증(서버 validate와 같은 순서 · 문구) */
  function demoValidate(x, kind, termId, recs) {
    const A = ens(); const head = recs[0]; const col = n => head.indexOf(n); const rows = recs.slice(1);
    const need = kind === 'person' ? ['학번'] : kind === 'section' ? ['학수번호', '교과목명', '분반'] : ['학번', '학수번호', '분반'];
    if (need.some(n => col(n) < 0)) fail('csv_head'); if (rows.length > 5000) fail('csv_rows');
    const g = (r, n) => { const i = col(n); return i >= 0 && i < r.length ? r[i] : ''; };
    const units = new Map(A.units.map(u => [u.unit_code, u.parent_code])); const seen = new Set(); const out = [];
    if (kind === 'person') { const have = new Set(A.persons.map(p => p.member_no));
      /* v38 학과코드 자리에 학과 이름도 받는다: 있는 학과면 그 코드로, 처음 보는 한글 이름이면 반영할 때 학과를 새로 만든다(학번 등록 화면과 같은 규칙) */
      const unitByName = v => { const u = A.units.find(y => y.name === v || y.unit_code.toLowerCase() === v.toLowerCase()); return u ? { code: u.unit_code } : /[가-힣]/.test(v) && v.length <= 60 ? { name: v } : null; };
      rows.forEach((r, i) => { const d = { member_no: g(r, '학번'), kind: g(r, '구분'), unit_code: g(r, '학과코드'), status: g(r, '학적'), grade_year: g(r, '학년') }; let msg = ''; let st = 'error'; let uName = null;
        const kd = d.kind === '' ? 'student' : has(MAP.kind, d.kind) ? MAP.kind[d.kind] : null; const ss = d.status === '' ? 'active' : has(MAP.status, d.status) ? MAP.status[d.status] : null; const gy = d.grade_year === '' ? null : /^[1-6]$/.test(d.grade_year) ? Number(d.grade_year) : -1;
        if (!RE.mno.test(d.member_no)) msg = R.MNO; else if (!kd) msg = R.KIND; else if (kd === 'student' && !RE.stu.test(d.member_no)) msg = R.STU; else if (!ss) msg = R.STAT; else if (gy === -1) msg = R.YEAR;
        else if (d.unit_code !== '' && !units.has(d.unit_code) && !(uName = unitByName(d.unit_code))) msg = R.UNIT + ' 조직 · 권한에서 학과를 먼저 만들거나, 학과 이름(예: 간호학과)으로 적으세요.'; else if (x.units && !(d.unit_code !== '' && inUnits(x, uName && uName.code ? uName.code : d.unit_code, units.get(uName && uName.code ? uName.code : d.unit_code)))) msg = R.SCOPE;
        else if (seen.has(d.member_no)) msg = R.DUPF; else if (have.has(d.member_no)) { st = 'skip'; msg = R.EXIST_P; } else st = 'ok';
        if (uName) { if (uName.code) d.unit_code = uName.code; else { d.unit_name = d.unit_code; d.unit_code = ''; if (st === 'ok') msg = `새 학과 「${d.unit_name}」를 함께 만듭니다.`; } }
        if (st !== 'error' || msg !== R.MNO) seen.add(d.member_no);
        out.push({ line: i + 2, st, msg, data: { member_no: d.member_no, kind: kd, unit_code: d.unit_code || null, status: ss, grade_year: gy === -1 ? null : gy, ...(d.unit_name ? { unit_name: d.unit_name } : {}) } }); });
      return out; }
    const secs = new Map(A.sections.filter(s => s.term_id === termId).map(s => [s.course_code + '|' + s.section_no, { section_id: s.section_id, unit_code: (courseOf(s.course_code) || {}).unit_code || null }]));
    if (kind === 'section') { const courses = new Map(A.courses.map(c => [c.course_code, c.unit_code]));
      rows.forEach((r, i) => { const d = { course_code: g(r, '학수번호'), name: g(r, '교과목명'), section_no: g(r, '분반'), credits: g(r, '학점'), unit_code: g(r, '학과코드'), mode: g(r, '수업방식'), capacity: g(r, '정원'), category: g(r, '교과구분') }; let msg = ''; let st = 'error';
        const no = secNo(d.section_no); const md = d.mode === '' ? 'offline' : has(MAP.mode, d.mode) ? MAP.mode[d.mode] : null; const ct = d.category === '' ? null : has(MAP.cat, d.category) ? MAP.cat[d.category] : -1;
        const cap = d.capacity === '' ? null : /^\d{1,4}$/.test(d.capacity) ? Number(d.capacity) : -1; const cr = d.credits === '' ? null : /^\d{1,2}(\.\d)?$/.test(d.credits) && Number(d.credits) <= 30 ? Number(d.credits) : -1;
        const unit = d.unit_code !== '' ? d.unit_code : courses.has(d.course_code) ? courses.get(d.course_code) : null;
        if (!RE.course.test(d.course_code)) msg = R.COURSE; else if (d.name === '' || d.name.length > 60) msg = R.CNAME; else if (!no) msg = R.SECNO; else if (!md) msg = R.MODE; else if (cap === -1) msg = R.CAP; else if (cr === -1) msg = R.CRED; else if (ct === -1) msg = R.CAT;
        else if (d.unit_code !== '' && !units.has(d.unit_code)) msg = R.UNIT; else if (x.units && !(unit != null && inUnits(x, unit, units.get(unit)))) msg = R.SCOPE;
        else if (seen.has(d.course_code + '|' + no)) msg = R.DUPF; else if (secs.has(d.course_code + '|' + no)) { st = 'skip'; msg = R.EXIST_S; } else st = 'ok';
        if (no && RE.course.test(d.course_code)) seen.add(d.course_code + '|' + no);
        out.push({ line: i + 2, st, msg, data: { course_code: d.course_code, name: d.name, section_no: no || d.section_no, credits: cr === -1 ? null : cr, unit_code: d.unit_code || null, mode: md, capacity: cap === -1 ? null : cap, category: ct === -1 ? null : ct } }); });
      return out; }
    const persons = new Set(A.persons.map(p => p.member_no)); const enr = new Set(A.enr.filter(e => e.status !== 'dropped').map(e => e.section_id + '|' + e.member_no));
    rows.forEach((r, i) => { const d = { member_no: g(r, '학번'), course_code: g(r, '학수번호'), section_no: g(r, '분반'), kind: g(r, '구분') }; let msg = ''; let st = 'error';
      const no = secNo(d.section_no); const kd = d.kind === '' ? 'regular' : has(MAP.enr, d.kind) ? MAP.enr[d.kind] : null; const sec = no ? secs.get(d.course_code + '|' + no) : null; const k = d.member_no + '|' + d.course_code + '|' + no;
      if (!RE.mno.test(d.member_no)) msg = R.MNO; else if (!kd) msg = R.ENRKIND; else if (seen.has(k)) msg = R.DUPF; else if (!persons.has(d.member_no)) msg = R.NOPERSON; else if (!sec) msg = R.NOSEC;
      else if (x.units && !inUnits(x, sec.unit_code, units.get(sec.unit_code))) msg = R.SCOPE; else if (enr.has(sec.section_id + '|' + d.member_no)) { st = 'skip'; msg = R.EXIST_E; } else st = 'ok';
      if (RE.mno.test(d.member_no)) seen.add(k);
      out.push({ line: i + 2, st, msg, data: { member_no: d.member_no, course_code: d.course_code, section_no: no || d.section_no, kind: kd }, _sid: sec ? sec.section_id : null }); });
    return out;
  }

  /* 데모 처리기 — 경로 이름은 서버 /api/lms/a/<이름> 과 같다 */
  const DEMO = {
    overview: () => demoOverview(),
    term(b) { const x = ctx(); fullAdmin(x); const id = T(b.term_id), name = T(b.name), s = T(b.starts_on), e = T(b.ends_on); if (!RE.term.test(id)) fail('term_id'); if (!name || name.length > 60) fail('lms_name'); if (!dateOk(s) || !dateOk(e) || e < s) fail('lms_date');
      const A = ens(); const op = b.is_operating === true; if (op) A.terms.forEach(t0 => { if (t0.term_id !== id) t0.is_operating = false; }); const r = { term_id: id, name, starts_on: s, ends_on: e, is_operating: op }; const i = A.terms.findIndex(t0 => t0.term_id === id); if (i < 0) A.terms.push(r); else A.terms[i] = r; return { ok: true }; },
    'term-delete'(b) { const x = ctx(); fullAdmin(x); const id = T(b.term_id); if (!RE.term.test(id)) fail('term_id'); const A = ens(); if (!A.terms.some(t0 => t0.term_id === id)) fail('term'); if (A.sections.some(s => s.term_id === id)) fail('in_use'); A.terms = A.terms.filter(t0 => t0.term_id !== id); return { ok: true }; },
    unit(b) { const x = ctx(); fullAdmin(x); const code = T(b.unit_code), name = T(b.name), kind = T(b.kind) || 'dept', par = T(b.parent_code); if (!RE.unit.test(code)) fail('unit_code'); if (!name || name.length > 60) fail('lms_name'); if (!has(L.ukind, kind)) fail('unit_kind');
      if (par) { if (!RE.unit.test(par) || par === code) fail('unit_code'); if (!unitOf(par)) fail('unit'); } const A = ens(); const r = { unit_code: code, name, kind, parent_code: par || null }; const i = A.units.findIndex(u => u.unit_code === code); if (i < 0) A.units.push(r); else A.units[i] = r; return { ok: true }; },
    'unit-delete'(b) { const x = ctx(); fullAdmin(x); const code = T(b.unit_code); if (!RE.unit.test(code)) fail('unit_code'); if (!unitOf(code)) fail('unit'); const A = ens();
      if (A.units.some(u => u.parent_code === code) || A.courses.some(c => c.unit_code === code) || A.persons.some(p => p.unit_code === code)) fail('in_use'); A.units = A.units.filter(u => u.unit_code !== code); Object.values(A.scopes).forEach(s => { if (s.units) s.units = s.units.filter(u => u !== code); }); return { ok: true }; },
    course(b) { const x = ctx(); adminOnly(x); const code = T(b.course_code), name = T(b.name), unit = T(b.unit_code), cat = T(b.category); if (!RE.course.test(code)) fail('course_code'); if (!name || name.length > 60) fail('lms_name');
      const cr = b.credits == null || b.credits === '' ? null : Number(b.credits); if (cr !== null && !(Number.isFinite(cr) && cr >= 0 && cr <= 30)) fail('credits'); if (cat && !has(MAP.cat, cat)) fail('category');
      let u = null; if (unit) { if (!RE.unit.test(unit)) fail('unit_code'); u = unitOf(unit); if (!u) fail('unit'); } if (!inUnits(x, u ? u.unit_code : null, u ? u.parent_code : null)) fail('lms_scope');
      const A = ens(); const prev = courseOf(code); if (prev) { const pu = unitOf(prev.unit_code); if (!inUnits(x, prev.unit_code || null, pu ? pu.parent_code : null)) fail('lms_scope'); }
      const r = { course_code: code, name, credits: cr, unit_code: unit || null, category: cat ? MAP.cat[cat] : null }; if (prev) Object.assign(prev, r); else A.courses.push(r); return { ok: true }; },
    'course-delete'(b) { const x = ctx(); adminOnly(x); const code = T(b.course_code); if (!RE.course.test(code)) fail('course_code'); const prev = courseOf(code); if (!prev) fail('course'); const pu = unitOf(prev.unit_code); if (!inUnits(x, prev.unit_code || null, pu ? pu.parent_code : null)) fail('lms_scope');
      const A = ens(); if (A.sections.some(s => s.course_code === code)) fail('in_use'); A.courses = A.courses.filter(c => c.course_code !== code); return { ok: true }; },
    section(b) { const x = ctx(); const A = ens(); const id = T(b.section_id), title = T(b.title), mode = T(b.mode) || 'offline', status = T(b.status) || 'open', cls = T(b.class_id); const cap = b.capacity == null || b.capacity === '' ? null : Number(b.capacity);
      if (title.length > 60) fail('lms_name'); if (!has(MAP.mode, mode)) fail('lms_mode'); if (cap !== null && !(Number.isInteger(cap) && cap >= 0 && cap <= 9999)) fail('capacity'); if (!has(L.sec, status)) fail('lms_mode'); if (cls && !RE.cls.test(cls)) fail('class_id');
      const sch = Array.isArray(b.schedule) ? b.schedule.map(s => ({ day: s.day, period: T(s.period), room: T(s.room) })) : null;
      if (id) { const s = sectionOf(id); canSection(x, s); Object.assign(s, { title: title || s.title, mode: MAP.mode[mode], capacity: cap, class_id: cls || null, status }, sch ? { schedule: sch } : {}); return { ok: true, section_id: s.section_id }; }
      adminOnly(x); const term = T(b.term_id), code = T(b.course_code), no = secNo(b.section_no); if (!RE.term.test(term)) fail('term_id'); if (!RE.course.test(code)) fail('course_code'); if (!no) fail('section_no');
      if (!A.terms.some(t0 => t0.term_id === term)) fail('term'); const co = courseOf(code); if (!co) fail('course'); const cu = unitOf(co.unit_code); if (!inUnits(x, co.unit_code || null, cu ? cu.parent_code : null)) fail('lms_scope');
      if (A.sections.some(s => s.term_id === term && s.course_code === code && s.section_no === no)) fail('section_dup');
      const sid = newId(); A.sections.push({ section_id: sid, term_id: term, course_code: code, section_no: no, title: title || `${co.name} ${no}분반`, mode: MAP.mode[mode], capacity: cap, schedule: sch || [], rep_section_id: null, hidden: false, class_id: cls || null, status, source: 'manual' }); return { ok: true, section_id: sid }; },
    'section-delete'(b) { const x = ctx(); adminOnly(x); const s = sectionOf(b.section_id); canSection(x, s); const A = ens(); if (A.sections.some(y => y.rep_section_id === s.section_id)) fail('merged'); if (A.enr.some(e => e.section_id === s.section_id && e.status !== 'dropped')) fail('in_use');
      A.enr = A.enr.filter(e => e.section_id !== s.section_id); A.staff = A.staff.filter(t0 => t0.section_id !== s.section_id); A.sections = A.sections.filter(y => y !== s); return { ok: true }; },
    staff(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); const role = T(b.role); if (!has(L.role, role)) fail('staff_role');
      /* v38 처음 보는 사번 · 학번을 담당으로 넣으면 구성원으로 함께 등록한다(교수 · 공동교수 → 교수, 조교 · 채점자 → 학번이면 학생) */
      { const m0 = T(b.member_no); const A0 = ens(); if (RE.mno.test(m0) && !A0.persons.some(y => y.member_no === m0) && x.admin) A0.persons.push({ member_no: m0, kind: role === 'professor' || role === 'co_professor' ? 'professor' : RE.stu.test(m0) ? 'student' : 'staff', unit_code: (courseOf(s.course_code) || {}).unit_code || null, status: 'active', grade_year: null, source: 'manual' });
        if ((role === 'professor' || role === 'co_professor') && A0.scopes && A0.scopes.teacher && !A0.scopes.teacher.member_no) A0.scopes.teacher.member_no = m0; }
      const p = personOf(T(b.member_no)); if ((role === 'professor' || role === 'co_professor') && p.kind !== 'professor') fail('staff_kind');
      const A = ens(); if (A.staff.some(t0 => t0.section_id === s.section_id && t0.member_no === p.member_no && t0.role === role)) fail('staff_dup'); A.staff.push({ section_id: s.section_id, member_no: p.member_no, role, status: 'active', source: 'manual', at: iso() }); return { ok: true }; },
    'staff-delete'(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); const role = T(b.role); if (!has(L.role, role)) fail('staff_role'); const p = personOf(T(b.member_no)); const A = ens(); const n = A.staff.length;
      A.staff = A.staff.filter(t0 => !(t0.section_id === s.section_id && t0.member_no === p.member_no && t0.role === role)); if (A.staff.length === n) fail('staff'); return { ok: true }; },
    enrollments(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); return { section_id: s.section_id, rows: demoRoster(s, b.grading === '1') }; },
    enroll(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); const kind = T(b.kind) || 'regular'; if (kind !== 'regular' && kind !== 'audit') fail('enr_kind');
      if (!Array.isArray(b.member_nos) || !b.member_nos.length || b.member_nos.length > 5000) fail('lms_list'); const Ls = [...new Set(b.member_nos.map(v => T(v)).filter(v => v !== ''))]; if (!Ls.length) fail('lms_list');
      const A = ens(); let added = 0, skipped = 0; const errors = [];
      for (const m of Ls) { if (!RE.mno.test(m)) { errors.push({ member_no: m, msg: R.MNO }); continue; } if (!A.persons.some(p => p.member_no === m)) { errors.push({ member_no: m, msg: R.NOPERSON }); continue; }
        const e = A.enr.find(y => y.section_id === s.section_id && y.member_no === m); if (e && e.status !== 'dropped') { skipped++; continue; }
        if (e) Object.assign(e, { status: 'enrolled', kind, source: 'manual', at: iso() }); else A.enr.push({ section_id: s.section_id, member_no: m, kind, status: 'enrolled', source: 'manual', at: iso() }); added++; }
      return { added, skipped, errors: errors.slice(0, 200) }; },
    'enroll-drop'(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); const p = personOf(T(b.member_no)); const e = ens().enr.find(y => y.section_id === s.section_id && y.member_no === p.member_no && y.status !== 'dropped'); if (!e) fail('enr'); e.status = 'dropped'; return { ok: true }; },
    persons(b) { const x = ctx(); adminOnly(x); const q = T(b.q); const kind = T(b.kind); const qq = /^[A-Za-z0-9]{0,20}$/.test(q) ? q : '';
      return { rows: ens().persons.filter(p => { const u = unitOf(p.unit_code); return (!x.units || (p.unit_code && x.units.includes(p.unit_code)) || (u && x.units.includes(u.parent_code))) && p.member_no.startsWith(qq) && (!has(MAP.kind, kind) || p.kind === MAP.kind[kind]); }).sort((a, b2) => cmp(a.member_no, b2.member_no)).slice(0, 200) }; },
    person(b) { const x = ctx(); adminOnly(x); const m = T(b.member_no), kind = T(b.kind) || 'student', st = T(b.status) || 'active', unit = T(b.unit_code); const gy = b.grade_year == null || b.grade_year === '' ? null : Number(b.grade_year);
      if (!RE.mno.test(m)) fail('member_no'); if (!has(MAP.kind, kind)) fail('person_kind'); if (MAP.kind[kind] === 'student' && !RE.stu.test(m)) fail('lms_stu'); if (!has(MAP.status, st)) fail('person_status'); if (gy !== null && !(Number.isInteger(gy) && gy >= 1 && gy <= 6)) fail('grade_year');
      let u = null; if (unit) { if (!RE.unit.test(unit)) fail('unit_code'); u = unitOf(unit); if (!u) fail('unit'); } if (!inUnits(x, u ? u.unit_code : null, u ? u.parent_code : null)) fail('lms_scope');
      const A = ens(); if (A.persons.some(p => p.member_no === m)) fail('person_dup'); A.persons.push({ member_no: m, kind: MAP.kind[kind], unit_code: unit || null, status: MAP.status[st], grade_year: gy, source: 'manual' }); const nc = MAP.kind[kind] === 'student' ? issueCodes([{ sid: m, dept: u ? u.name : '' }]) : 0; return { ok: true, codes: nc }; },
    import(b) { const x = ctx(); adminOnly(x); const kind = T(b.kind); if (!['person', 'section', 'enrollment'].includes(kind)) fail('import_kind'); const A = ens();
      let term = null; if (kind !== 'person') { term = T(b.term_id); if (!RE.term.test(term)) fail('term_id'); if (!A.terms.some(t0 => t0.term_id === term)) fail('term'); }
      if (typeof b.csv !== 'string' || !b.csv.trim()) fail('csv'); const recs = parseCsv(b.csv); if (recs.length < 2) fail('csv');
      const rows = demoValidate(x, kind, term, recs);
      const cnt = { total: rows.length, ok: rows.filter(r => r.st === 'ok').length, skip: rows.filter(r => r.st === 'skip').length, error: rows.filter(r => r.st === 'error').length };
      const errors = rows.filter(r => r.st === 'error').slice(0, 500).map(r => ({ line: r.line, msg: r.msg }));
      const out = { kind, term_id: term, ...cnt, rows: rows.slice(0, 300).map(r => ({ line: r.line, st: r.st, msg: r.msg, data: r.data })), errors };
      if (b.apply !== true) return out; let ins = 0; const newStu = [];
      for (const r of rows) { if (r.st !== 'ok') continue; const d = r.data;
        if (kind === 'person') { const uc = d.unit_name ? unitCode(A, d.unit_name, true) : d.unit_code; A.persons.push({ member_no: d.member_no, kind: d.kind, unit_code: uc || null, status: d.status, grade_year: d.grade_year, source: 'manual' }); if (d.kind === 'student') newStu.push({ sid: d.member_no, dept: (unitOf(uc) || {}).name || '' }); }
        else if (kind === 'section') { const co = courseOf(d.course_code); if (co) Object.assign(co, { name: d.name, credits: d.credits != null ? d.credits : co.credits, unit_code: d.unit_code || co.unit_code, category: d.category || co.category }); else A.courses.push({ course_code: d.course_code, name: d.name, credits: d.credits, unit_code: d.unit_code, category: d.category });
          A.sections.push({ section_id: newId(), term_id: term, course_code: d.course_code, section_no: d.section_no, title: `${d.name} ${d.section_no}분반`, mode: d.mode, capacity: d.capacity, schedule: [], rep_section_id: null, hidden: false, class_id: null, status: 'open', source: 'sis' }); }
        else { const e = A.enr.find(y => y.section_id === r._sid && y.member_no === d.member_no); if (e) Object.assign(e, { status: 'enrolled', kind: d.kind }); else A.enr.push({ section_id: r._sid, member_no: d.member_no, kind: d.kind, status: 'enrolled', source: 'sis', at: iso() }); }
        ins++; }
      const counts = { inserted: ins, skipped: cnt.skip, error: cnt.error }; const run_id = A.runs.reduce((m, r) => Math.max(m, r.run_id), 0) + 1;
      A.runs.push({ run_id, term_id: term, scope: kind, trigger: 'manual', at: iso(), counts, errors_n: errors.length, errors: errors.slice(0, 200) }); A.runs = A.runs.slice(-60);
      const codes = newStu.length ? issueCodes(newStu) : 0; return { ...out, applied: true, run_id, counts, codes }; },
    sync(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); if (s.rep_section_id) fail('sync_rep'); if (!s.class_id) fail('sync_class'); const A = ens();
      const sib = A.sections.filter(y => y.term_id === s.term_id && y.course_code === s.course_code && y.section_id !== s.section_id && !y.rep_section_id).sort((a, b2) => cmp(a.section_no, b2.section_no)); if (!sib.length) fail('sync_none');
      const CL = arr(S.classes); const src = CL.find(k => isObj(k) && k.id === s.class_id); if (!src) fail('sync_class');
      const dsts = []; let noclass = 0; for (const d of sib) { const k = d.class_id ? CL.find(y => isObj(y) && y.id === d.class_id && y !== src) : null; if (k) dsts.push({ dst: d.section_id, no: d.section_no, cls: k }); else noclass++; }
      const hist = new Map(); A.sync.forEach(h => hist.set(`${h.dst}|${h.type}|${h.oid}`, h.action));
      const R0 = syncClasses(src, dsts, hist); const at = iso(); R0.log.forEach(l => A.sync.push({ at, src: s.section_id, dst: l.dst, type: l.type, oid: l.oid, action: l.action })); A.sync = A.sync.slice(-2000);
      return { sections: dsts.length, noclass, ...R0.n }; },
    'sync-history'(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); const A = ens();
      return { rows: A.sync.filter(h => h.src === s.section_id || h.dst === s.section_id).slice(-200).reverse().map(h => ({ at: h.at, src_section: h.src, dst_section: h.dst, dst_no: (A.sections.find(y => y.section_id === h.dst) || {}).section_no || null, object_type: h.type, object_id: h.oid, action: h.action })) }; },
    merge(b) { const x = ctx(); const rep = sectionOf(b.rep_section_id); canSection(x, rep); if (rep.rep_section_id) fail('merge'); if (!Array.isArray(b.section_ids) || !b.section_ids.length || b.section_ids.length > 20) fail('merge');
      const A = ens(); const Ls = [...new Set(b.section_ids.map(v => T(v)))].map(id => { const s = sectionOf(id); canSection(x, s); if (s === rep || s.term_id !== rep.term_id || s.rep_section_id || A.sections.some(y => y.rep_section_id === s.section_id)) fail('merge'); return s; });
      Ls.forEach(s => { s.rep_section_id = rep.section_id; s.hidden = true; });
      const CL = arr(S.classes); const cr = rep.class_id ? CL.find(k => isObj(k) && k.id === rep.class_id) : null; const sh = cr ? Ls.map(s => s.class_id ? CL.find(k => isObj(k) && k.id === s.class_id && k !== cr) : null).filter(Boolean) : [];
      const moved = cr && sh.length ? mergeActivity(cr, sh) : 0; return { merged: Ls.length, moved }; },
    unmerge(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); if (!s.rep_section_id) fail('unmerge'); s.rep_section_id = null; s.hidden = false; return { ok: true }; },
    request(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); const kind = T(b.kind); if (kind !== 'ta' && kind !== 'audit') fail('req_kind'); const p = personOf(T(b.member_no)); const A = ens();
      if (kind === 'ta') { if (A.staff.some(t0 => t0.section_id === s.section_id && t0.member_no === p.member_no && t0.role === 'ta')) fail('req_dup'); A.staff.push({ section_id: s.section_id, member_no: p.member_no, role: 'ta', status: 'pending', source: 'manual', at: iso() }); return { ok: true }; }
      const e = A.enr.find(y => y.section_id === s.section_id && y.member_no === p.member_no); if (e && e.status !== 'dropped') fail('req_dup');
      if (e) Object.assign(e, { kind: 'audit', status: 'pending', source: 'manual', at: iso() }); else A.enr.push({ section_id: s.section_id, member_no: p.member_no, kind: 'audit', status: 'pending', source: 'manual', at: iso() }); return { ok: true }; },
    'request-decide'(b) { const x = ctx(); const s = sectionOf(b.section_id); canSection(x, s); const kind = T(b.kind); if (kind !== 'ta' && kind !== 'audit') fail('req_kind'); const p = personOf(T(b.member_no)); const yes = b.approve === true; const A = ens();
      if (kind === 'ta') { const r = A.staff.find(t0 => t0.section_id === s.section_id && t0.member_no === p.member_no && t0.role === 'ta' && t0.status === 'pending'); if (!r) fail('req'); if (yes) r.status = 'active'; else A.staff = A.staff.filter(y => y !== r); }
      else { const r = A.enr.find(e => e.section_id === s.section_id && e.member_no === p.member_no && e.status === 'pending'); if (!r) fail('req'); if (yes) r.status = 'enrolled'; else A.enr = A.enr.filter(y => y !== r); }
      return { ok: true, status: yes ? 'approved' : 'rejected' }; },
    scope(b) { const x = ctx(); if (x.role !== 'owner') fail('lms_role'); const A = ens(); const who = T(b.email) === 'teacher' ? 'teacher' : 'sub';
      if (!Array.isArray(b.units) || b.units.length > 20) fail('scope_units'); const units = [...new Set(b.units.map(v => T(v)))]; if (units.some(v => !RE.unit.test(v) || !unitOf(v))) fail('scope_units');
      const m = T(b.member_no); if (m && !RE.mno.test(m)) fail('member_no'); A.scopes[who] = { units, member_no: m || null }; return { ok: true }; }
  };

  /* ═════════ 데이터 포트: 데모(DEMO) / 운영(/api/lms/a) ═════════ */
  const LIVEM = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const AC = { ov: null, loading: false, err: '', enr: {}, prev: null, hist: null, view: null, audit: {} };
  async function X(name, body, get) {
    if (LIVEM()) { const qs = get && body ? '?' + new URLSearchParams(Object.entries(body).filter(([, v]) => v != null && v !== '')).toString() : '';
      return api(get ? 'GET' : 'POST', '/api/lms/a/' + name + qs, get ? undefined : body); }
    const r = DEMO[name](body || {}); if (!get) { bump(); try { ens(); } catch (e) { } try { save(); } catch (e) { } } return r;
  }
  async function reload() { if (!LIVEM()) { AC.ov = null; return; } AC.loading = true; try { AC.ov = await X('overview', null, true); AC.err = ''; } catch (e) { AC.err = e.message; } finally { AC.loading = false; } }
  const OV = () => { if (!LIVEM()) return demoOverview(); if (!AC.ov && !AC.loading && !AC.err) reload().then(() => { if (CUR.tab === 'lmsa') render(); }); return AC.ov; };
  /* 서버가 기관 문서를 고친 뒤(동기화 · 합반): 저장 대기분을 먼저 보내고, 처리 후 최신 문서를 다시 받는다 */
  async function docOp(name, body) {
    if (!LIVEM()) return X(name, body);
    try { if (typeof liveFlush === 'function') await liveFlush(); } catch (e) { }
    const r = await X(name, body);
    try { const st = await api('GET', '/api/state'); if (st.doc) { LIVE.rev = st.rev; LIVE.doc = st.doc; S = st.doc; if (typeof upgradeState === 'function') upgradeState(); } } catch (e) { }
    return r;
  }
  async function act(name, body, okMsg, { doc = false, after } = {}) {
    try { const r = doc ? await docOp(name, body) : await X(name, body); if (typeof logAudit === 'function') logAudit('강좌 · 분반 — ' + name); await reload(); if (after) after(r); render(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'ok'); return r; }
    catch (e) { toast(e.message, 'warn'); return null; }
  }

  /* ═════════ 화면 ═════════ */
  const secName = (ov, id) => { const s = (ov.sections || []).find(y => y.section_id === id); return s ? `${s.course_name || s.course_code} ${s.section_no}분반` : '(범위 밖 분반)'; };
  const unitName = (ov, c) => { const u = (ov.units || []).find(y => y.unit_code === c); return u ? u.name : (c || '—'); };
  const roleLabel = r => L.role[r] || r;
  const isTeacher = ov => ov && ov.me && !ov.me.admin;
  const termSel = (ov, name, cur) => `<select name="${name}" ${name === 'lmsaTerm' ? 'data-chg="lmsa-term"' : ''} aria-label="학기">${(ov.terms || []).map(t0 => `<option value="${esc(t0.term_id)}" ${t0.term_id === cur ? 'selected' : ''}>${esc(t0.name)}${t0.is_operating ? ' (운영)' : ''}</option>`).join('')}</select>`;
  const curTerm = ov => { const T0 = ov.terms || []; return (T0.find(t0 => t0.term_id === UI.lmsaTerm) || T0.find(t0 => t0.is_operating) || T0[0] || {}).term_id || ''; };
  const staffTxt = s => (s.staff || []).filter(t0 => t0.status === 'active').map(t0 => `${roleLabel(t0.role)} ${t0.member_no}`).join(' · ') || '—';
  const SYNCNOTE = '학사 연동 시 자동';

  VIEWS.lmsa = () => {
    if (!ON()) return head('강좌 · 분반') + '<div class="empty">대학(학사 LMS) 기관에서 쓰는 화면입니다. 설정 › 기관 유형에서 도입 형태를 학사 LMS로 바꾸세요.</div>';
    const ov = OV();
    if (!ov) return head('강좌 · 분반') + `<div class="empty">${AC.err ? esc(AC.err) : '학사 데이터를 불러오는 중입니다.'}</div>`;
    const tch = isTeacher(ov); const nReq = (ov.requests || []).length;
    /* 2단계(UX): 학교 담당자용 — 「이번 학기 준비」 4단계(학기 → 교과목 → 분반 → 수강생)를 탭 줄로 쓰고, 나머지 일은 「더보기」 */
    const TABS = tch ? [['section', '내 분반'], ['enr', '수강생'], ['req', '조교 · 청강 신청']] : [['term', '학기'], ['course', '교과목'], ['section', '분반'], ['enr', '수강생'], ['upload', '엑셀로 한꺼번에 올리기'], ['req', `조교 · 청강 신청${nReq ? ' ' + nReq : ''}`], ['org', '단과대학 · 학과 · 권한']];
    let tb = UI.lmsaT || 'section'; if (!TABS.some(([k]) => k === tb)) tb = 'section';
    const term = curTerm(ov); const secs = (ov.sections || []).filter(s => s.term_id === term);
    const scopeNote = ov.me.units ? `<span class="lmsa-scope">${ic('corp', 14)} 담당 범위: ${ov.me.units.map(u => esc(unitName(ov, u))).join(' · ')}</span>` : tch ? `<span class="lmsa-scope">${ic('users', 14)} ${esc(t('teacher'))} 사번 ${esc(ov.me.member_no || '미연결')}의 담당 분반</span>` : '';
    const nSec = secs.filter(s => !s.hidden).length; const nEnr = secs.reduce((a, s) => a + s.enrolled, 0); const nAud = secs.reduce((a, s) => a + s.audit, 0);
    const demoTag = LIVEM() ? '' : '<span class="lmsa-demo">데모: 브라우저에만 저장</span>';
    const top = head('학기 · 강좌', tch ? '내가 맡은 분반의 수강생과 조교 · 청강 신청을 확인합니다.' : `이번 학기 수업을 <b>학기 → 교과목 → 분반 → 수강생</b> 순서로 준비합니다. <small class="lmsa-sub">학사 연동을 붙이면 자동으로 채워집니다 · 학번 · 학과 · 학적만 저장</small>`, scopeNote + demoTag);
    let bar;
    if (tch) bar = `<div class="lmsa-todo"><span>${ic('check', 16)} 이번 학기 담당 분반 <b>${nSec}</b> · 수강생 <b>${nEnr}</b>명${nReq ? ` · 처리할 신청 <b>${nReq}</b>건` : ''}</span>${nReq ? '<button class="btn sm pri" data-act="tab" data-key="lmsaT" data-v="req">신청 처리하기</button>' : ''}</div><div class="bar2 lmsa-bar">${termSel(ov, 'lmsaTerm', term)}${tabs('lmsaT', TABS, tb)}</div>`;
    else {
      const opTerm = (ov.terms || []).find(t0 => t0.term_id === term) || {};
      const ST = [['term', '학기', (ov.terms || []).length ? esc(opTerm.name || term) : '아직 없음', (ov.terms || []).length > 0],
        ['course', '교과목', `${(ov.courses || []).length}개`, (ov.courses || []).length > 0],
        ['section', '분반', `${nSec}개${secs.length - nSec ? ` · 합반 ${secs.length - nSec}` : ''}`, nSec > 0],
        ['enr', '수강생', `${nEnr}명${nAud ? ` · 청강 ${nAud}` : ''}`, nEnr > 0]];
      const nx = ST.find(s => !s[3]); const noCls = secs.filter(s => !s.hidden && !s.class_id).length;
      const NEXT = { term: ['학기 추가', 'lmsa-term-new', ''], course: ['교과목 추가', 'lmsa-course-new', ''], section: ['분반 개설', 'lmsa-sec-new', ''], enr: ['수강생 엑셀로 올리기', 'lmsa-goimp', 'enrollment'] };
      const todo = nx ? `<span>${ic('spark', 16)} 다음 할 일: <b>${nx[1]}</b> 준비</span><button class="btn sm pri" data-act="${NEXT[nx[0]][1]}" data-v="${NEXT[nx[0]][2]}">${NEXT[nx[0]][0]}</button>`
        : nReq ? `<span>${ic('check', 16)} 이번 학기 준비 완료 · 처리할 조교 · 청강 신청 <b>${nReq}</b>건</span><button class="btn sm pri" data-act="tab" data-key="lmsaT" data-v="req">신청 처리하기</button>`
        : noCls ? `<span>${ic('check', 16)} 이번 학기 준비 완료 · 강의실이 연결되지 않은 분반 <b>${noCls}</b>개</span><button class="btn sm pri" data-act="tab" data-key="lmsaT" data-v="section">분반 확인하기</button>`
        : `<span>${ic('check', 16)} 이번 학기 준비가 끝났습니다.</span>`;
      const more = TABS.slice(4); const curMore = more.find(([k]) => k === tb);
      bar = `<div class="lmsa-steps" role="tablist" aria-label="이번 학기 준비 순서">${ST.map(([k, l, n, done], i) => `<button role="tab" aria-selected="${k === tb}" class="lmsa-step ${k === tb ? 'on' : ''} ${done ? 'done' : ''} ${nx && nx[0] === k ? 'next' : ''}" data-act="tab" data-key="lmsaT" data-v="${k}"><i>${done ? ic('check', 14) : i + 1}</i><span><b>${l}</b><small>${n}</small></span></button>`).join('')}</div>
        <div class="lmsa-todo">${todo}<span class="lmsa-tsel">${termSel(ov, 'lmsaTerm', term)}</span><details class="uxmore lmsa-more"><summary>${curMore ? esc(curMore[1]) : '더보기'}${curMore ? '' : ` <em>${more.length}</em>`}</summary><div class="uxpop" role="menu">${more.map(([k, l]) => `<button role="menuitem" class="${k === tb ? 'on' : ''}" data-act="tab" data-key="lmsaT" data-v="${k}">${esc(l)}</button>`).join('')}</div></details></div>`;
    }
    const top2 = top + bar;
    let b = '';
    try { b = ({ term: vTerm, course: vCourse, section: vSection, enr: vEnr, upload: vUpload, req: vReq, org: vOrg })[tb](ov, term, secs); } catch (e) { console.error(e); b = `<div class="warn">${esc(e.message)}</div>`; }
    return `<div class="lmsa">${top2}${b}</div>`;
  };
  ACT['lmsa-term'] = el => { UI.lmsaTerm = el.value; render(); };
  ACT['lmsa-goimp'] = el => { UI.lmsaT = 'upload'; UI.lmsaImp = (el && el.dataset && el.dataset.v) || 'enrollment'; AC.prev = null; render(); };

  function vTerm(ov) {
    return `<div class="card"><div class="ch"><b>학기</b><small>운영 학기는 하나만 지정합니다(학생 청강 신청 · 수강 화면 기준)</small><button class="btn sm" data-act="lmsa-term-new">학기 추가</button></div>
      ${table(['학기', '기간', '운영', ''], (ov.terms || []).map(t0 => [`<b>${esc(t0.name)}</b><small class="lmsa-sub">${esc(t0.term_id)}</small>`, `${esc(t0.starts_on)} ~ ${esc(t0.ends_on)}`, t0.is_operating ? tag('운영 학기') : '—', `<button class="btn sm" data-act="lmsa-term-edit" data-v="${esc(t0.term_id)}">수정</button>`]), '등록된 학기가 없습니다. 학기 추가를 누르세요.')}</div>`;
  }
  const termForm = t0 => `<label class="fl">학기 코드<input name="term_id" maxlength="7" placeholder="2026-2" value="${esc(t0 ? t0.term_id : '')}" ${t0 ? 'readonly' : ''}></label><label class="fl">이름<input name="name" maxlength="60" placeholder="2026학년도 2학기" value="${esc(t0 ? t0.name : '')}"></label>
    <div class="form2"><label class="fl">시작일<input type="date" name="starts_on" value="${esc(t0 ? t0.starts_on : '')}"></label><label class="fl">종료일<input type="date" name="ends_on" value="${esc(t0 ? t0.ends_on : '')}"></label></div><label class="ul-ck"><input type="checkbox" name="is_operating" ${t0 && t0.is_operating ? 'checked' : ''}> 운영 학기로 지정</label>`;
  const termModal = t0 => modal(t0 ? '학기 수정' : '학기 추가', termForm(t0), [...(t0 ? [{ id: 'del', label: '삭제', kind: 'red', run: () => { ACT['lmsa-term-del']({ dataset: { v: t0.term_id } }); return false; } }] : []), { id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { act('term', { term_id: fv(w, 'term_id'), name: fv(w, 'name'), starts_on: fv(w, 'starts_on'), ends_on: fv(w, 'ends_on'), is_operating: fv(w, 'is_operating') === true }, '학기를 저장했습니다.'); } }]);
  ACT['lmsa-term-new'] = () => termModal(null);
  ACT['lmsa-term-edit'] = el => termModal((OV().terms || []).find(t0 => t0.term_id === el.dataset.v));
  ACT['lmsa-term-del'] = el => modal('학기 삭제', `<p><b>${esc(el.dataset.v)}</b> 학기를 삭제합니다. 분반이 있는 학기는 삭제할 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { act('term-delete', { term_id: el.dataset.v }, '학기를 삭제했습니다.'); } }]);

  function vCourse(ov) {
    return `<div class="card"><div class="ch"><b>교과목</b><small>학수번호 · 학점 · 개설 학과 · 교과 구분</small><button class="btn sm" data-act="lmsa-course-new">교과목 추가</button></div>
      ${table(['교과목', '학과', '학점 · 구분', '분반', ''], (ov.courses || []).map(c => [`<b>${esc(c.name)}</b><small class="lmsa-sub">${esc(c.course_code)}</small>`, esc(unitName(ov, c.unit_code)), `${c.credits == null ? '—' : esc(c.credits) + '학점'}${c.category ? ' ' + tag(L.cat[c.category] || c.category) : ''}`, (ov.sections || []).filter(s => s.course_code === c.course_code).length + '개',
        `<button class="btn sm" data-act="lmsa-course-edit" data-v="${esc(c.course_code)}">수정</button>`]), '교과목이 없습니다. 엑셀로 한꺼번에 올리기 또는 교과목 추가로 등록하세요.')}</div>`;
  }
  const courseModal = c => { const ov = OV(); modal(c ? '교과목 수정' : '교과목 추가', `<label class="fl">학수번호<input name="course_code" maxlength="20" placeholder="GEN1001" value="${esc(c ? c.course_code : '')}" ${c ? 'readonly' : ''}></label><label class="fl">교과목명<input name="name" maxlength="60" value="${esc(c ? c.name : '')}"></label>
      <div class="form2"><label class="fl">학점<input name="credits" type="number" min="0" max="30" step="0.5" value="${esc(c && c.credits != null ? c.credits : '')}"></label><label class="fl">개설 학과<select name="unit_code"><option value="">(없음)</option>${(ov.units || []).map(u => `<option value="${esc(u.unit_code)}" ${c && c.unit_code === u.unit_code ? 'selected' : ''}>${esc(u.name)} (${esc(u.unit_code)})</option>`).join('')}</select></label>
      <label class="fl">교과 구분<select name="category"><option value="">(없음)</option>${Object.entries(L.cat).map(([k, v]) => `<option value="${k}" ${c && c.category === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>`,
    [...(c ? [{ id: 'del', label: '삭제', kind: 'red', run: () => { act('course-delete', { course_code: c.course_code }, '교과목을 삭제했습니다.'); } }] : []), { id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { act('course', { course_code: fv(w, 'course_code'), name: fv(w, 'name'), credits: fv(w, 'credits'), unit_code: fv(w, 'unit_code'), category: fv(w, 'category') }, '교과목을 저장했습니다.'); } }]); };
  ACT['lmsa-course-new'] = () => courseModal(null);
  ACT['lmsa-course-edit'] = el => courseModal((OV().courses || []).find(c => c.course_code === el.dataset.v));
  ACT['lmsa-course-del'] = el => act('course-delete', { course_code: el.dataset.v }, '교과목을 삭제했습니다.');

  function vSection(ov, term, secs) {
    const tch = isTeacher(ov); const byCourse = {}; secs.forEach(s => (byCourse[s.course_code] = byCourse[s.course_code] || []).push(s));
    const rows = secs.map(s => { const sib = byCourse[s.course_code].filter(y => y !== s && !y.rep_section_id); const rep = s.rep_section_id ? secs.find(y => y.section_id === s.rep_section_id) : null; const shared = secs.filter(y => y.rep_section_id === s.section_id);
      const cls = s.class_id ? (S.classes || []).find(c => c.id === s.class_id) : null;
      const more = [!rep && s.class_id && sib.length ? `<button data-act="lmsa-sync" data-v="${esc(s.section_id)}">분반 자료 맞추기(동기화)</button>` : '', rep ? `<button data-act="lmsa-unmerge" data-v="${esc(s.section_id)}">합반 해제</button>` : `<button data-act="lmsa-merge" data-v="${esc(s.section_id)}">합반</button>`, `<button data-act="lmsa-hist" data-v="${esc(s.section_id)}">동기화 이력</button>`].filter(Boolean);
      return [`<b>${esc(s.course_name)} ${esc(s.section_no)}분반</b><small class="lmsa-sub">${esc(s.course_code)} · ${esc(L.mode[s.mode] || s.mode)}${s.title && s.title !== `${s.course_name} ${s.section_no}분반` ? ' · ' + esc(s.title) : ''}</small>`, `<small>${esc(staffTxt(s))}</small>`, `${s.enrolled}명${s.audit ? ` <small>+청강 ${s.audit}</small>` : ''}${s.pending ? ` ${tag('대기 ' + s.pending, 'y')}` : ''}`,
        `${rep ? `${tag('합반됨', 'y')}<small class="lmsa-sub">${esc(rep.section_no)}분반으로 보임</small>` : shared.length ? `${tag('대표분반')}<small class="lmsa-sub">${shared.map(y => esc(y.section_no)).join(' · ')}분반 함께</small>` : ''}${roomOf(s.section_id) ? `<small class="lmsa-sub">강의실 15주 준비됨</small>` : cls ? `<small class="lmsa-sub">강의실: ${esc(cls.name)}</small>` : s.class_id ? `<small class="lmsa-sub">강의실 연결됨</small>` : `<small class="lmsa-sub lmsa-warn">강의실 미연결</small>`}`,
        `<div class="lmsa-acts"><button class="btn sm" data-act="lmsa-sec-open" data-v="${esc(s.section_id)}">관리</button><details class="uxmore lmsa-rmore" data-lmsa-more="${esc(s.section_id)}"><summary aria-label="다른 작업">${ic('dots', 16)}</summary><div class="uxpop" role="menu">${more.join('')}</div></details></div>`]; });
    return `<div class="card"><div class="ch"><b>${tch ? '내 분반' : '분반'}</b><small>같은 과목 여러 분반은 「⋯ › 분반 자료 맞추기」로 대표 분반의 자료를 한 번에 복제합니다(분반에서 고친 항목은 덮어쓰지 않음)</small>${tch ? '' : '<button class="btn sm" data-act="lmsa-sec-new">분반 개설</button>'}</div>
      ${table(['분반', '담당', '수강', '합반 · 강의실', ''], rows, tch ? '담당 분반이 없습니다. 정운영자에게 사번 연결을 요청하세요.' : '이 학기에 개설된 분반이 없습니다. 엑셀로 한꺼번에 올리기 또는 분반 개설로 등록하세요.')}
      <p class="mini">자동 분반 개설 · 자동 합반은 학사 연동 후 동작합니다. 합반한 분반은 학생에게 대표분반으로 보입니다.</p></div>`;
  }
  ACT['lmsa-sec-new'] = () => { const ov = OV(); const term = curTerm(ov);
    modal('분반 개설', `<label class="fl">학기${termSel(ov, 'term_id', term)}</label><label class="fl">교과목<select name="course_code">${(ov.courses || []).map(c => `<option value="${esc(c.course_code)}">${esc(c.course_code)} ${esc(c.name)}</option>`).join('')}</select></label>
      <div class="form2"><label class="fl">분반 번호<input name="section_no" maxlength="3" placeholder="01"></label><label class="fl">수업 방식<select name="mode">${Object.entries(L.mode).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label class="fl">정원<input name="capacity" type="number" min="0" max="9999"></label></div><label class="fl">분반 이름(비우면 자동)<input name="title" maxlength="60"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '개설', kind: 'pri', run: w => { act('section', { term_id: fv(w, 'term_id'), course_code: fv(w, 'course_code'), section_no: fv(w, 'section_no'), mode: fv(w, 'mode'), capacity: fv(w, 'capacity') === '' ? null : Number(fv(w, 'capacity')), title: fv(w, 'title') }, LIVEM() ? '분반을 개설했습니다.' : '분반을 개설하고 15주 강의실을 만들었습니다. 이제 수강생을 등록하세요.'); } }]); };
  ACT['lmsa-sec-open'] = el => { const ov = OV(); const s = (ov.sections || []).find(y => y.section_id === el.dataset.v); if (!s) return; const tch = isTeacher(ov);
    const sch = (s.schedule || []).map(x => `${x.day} ${x.period}${x.room ? ' · ' + x.room : ''}`).join(', ');
    modal(`${s.course_name} ${s.section_no}분반`, `<div class="lmsa-mrow"><span>방식 ${esc(L.mode[s.mode] || s.mode)} · 정원 ${s.capacity == null ? '—' : esc(s.capacity)} · 상태 ${esc(L.sec[s.status] || s.status)}</span><small>${esc(sch || '강의 시간 미정')}</small></div>
      <h4 class="lmsa-h">담당(공동교수 · 팀티칭 · 조교)</h4>${table(['역할', '사번 · 학번', '상태', ''], (s.staff || []).map(t0 => [esc(roleLabel(t0.role)), esc(t0.member_no), t0.status === 'pending' ? tag('신청 대기', 'y') : tag('활성'), `<button class="btn sm ghost" data-act="lmsa-staff-del" data-s="${esc(s.section_id)}" data-m="${esc(t0.member_no)}" data-r="${esc(t0.role)}">빼기</button>`]), '담당자가 없습니다.')}
      <div class="form2 lmsa-inline"><label class="fl">사번 · 학번<input name="member_no" maxlength="20" placeholder="P0002"></label><label class="fl">역할<select name="role">${Object.entries(L.role).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><button class="btn sm" data-mact="addstaff">담당 추가</button></div>
      <h4 class="lmsa-h">강의실</h4>${roomOf(s.section_id) ? `<div class="lmsa-mrow"><span>${esc(roomOf(s.section_id).title)} · 15주 강의실</span><button class="btn sm" data-act="lmsa-room" data-v="${esc(s.section_id)}">강의실 열기</button></div><p class="mini">분반을 개설하면 수업 방식에 맞는 15주 강의실이 자동으로 만들어집니다. 수강생 · 담당은 이 분반과 같습니다.</p>` : LIVEM() ? '' : '<p class="mini">강의실을 준비하고 있습니다.</p>'}
      ${(S.classes || []).length ? `<details class="nt"><summary>스튜디오 과정과 연결(분반 자료 맞추기용)</summary><div class="form2 lmsa-inline"><label class="fl">스튜디오 과정<select name="class_id"><option value="">(연결 안 함)</option>${(S.classes || []).map(c => `<option value="${esc(c.id)}" ${c.id === s.class_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label><button class="btn sm" data-mact="link">연결 저장</button></div>
      <p class="mini">분반 동기화는 연결된 과정끼리 복제합니다. 동기화 이력은 아래 버튼으로 봅니다.</p></details>` : ''}`,
    [{ id: 'hist', label: '동기화 이력', run: () => { ACT['lmsa-hist']({ dataset: { v: s.section_id } }); } }, ...(tch ? [] : [{ id: 'del', label: '분반 삭제', kind: 'red', run: () => { act('section-delete', { section_id: s.section_id }, '분반을 삭제했습니다.'); } }]),
      { id: 'addstaff', label: '', run: w => { act('staff', { section_id: s.section_id, member_no: fv(w, 'member_no'), role: fv(w, 'role') }, '담당자를 추가했습니다.'); } },
      { id: 'link', label: '', run: w => { act('section', { section_id: s.section_id, title: s.title, mode: s.mode, capacity: s.capacity, status: s.status, class_id: fv(w, 'class_id') }, '강의실 연결을 저장했습니다.'); } },
      { id: 'c', label: '닫기' }], true);
    $$('#modal .mf [data-mact="addstaff"], #modal .mf [data-mact="link"]').forEach(x => x.remove()); };
  const roomOf = sid => { try { return !LIVEM() && window.LMSX ? LMSX.db().sections.find(r => r.lmsa === sid) || null : null; } catch (e) { return null; } };
  ACT['lmsa-room'] = el => { const r = roomOf(el.dataset.v); closeModal(); if (r && window.LMSX) { LMSX.sec = r.id; LMSX.sections = null; } go('lmsb'); };
  ACT['lmsa-staff-del'] = el => { closeModal(); act('staff-delete', { section_id: el.dataset.s, member_no: el.dataset.m, role: el.dataset.r }, '담당자를 뺐습니다.'); };
  ACT['lmsa-sync'] = el => { const ov = OV(); const s = (ov.sections || []).find(y => y.section_id === el.dataset.v); if (!s) return; const sib = (ov.sections || []).filter(y => y.term_id === s.term_id && y.course_code === s.course_code && y !== s && !y.rep_section_id);
    modal('분반 동기화', `<p><b>${esc(s.course_name)} ${esc(s.section_no)}분반</b>(대표)의 공지 · 자료 · 차시 학습 · 과제 · 토론 · 시험을 ${sib.map(y => esc(y.section_no) + '분반').join(' · ')}에 반영합니다.</p><p class="mini">분반에서 따로 고치거나 지운 항목은 「제외」로 기록하고 덮어쓰지 않습니다. 대표 분반에서 지운 항목은 분반에서도 지웁니다(분반에서 고치지 않은 경우).</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '동기화', kind: 'pri', run: () => { act('sync', { section_id: s.section_id }, r => `${r.sections}개 분반 — 복제 ${r.copied} · 갱신 ${r.updated} · 삭제 ${r.deleted} · 제외 ${r.excluded}${r.noclass ? ` · 강의실 미연결 ${r.noclass}` : ''}`, { doc: true, after: r => { AC.lastSync = r; } }); } }]); };
  ACT['lmsa-hist'] = async el => { let r; try { r = await X('sync-history', { section_id: el.dataset.v }, true); } catch (e) { return toast(e.message, 'warn'); } const ov = OV();
    modal('분반 동기화 이력', table(['시각', '대상 분반', '항목', '원본 번호', '결과'], (r.rows || []).map(h => [esc(new Date(h.at).toLocaleString('ko-KR', { hour12: false })), esc((h.dst_no || '') + '분반'), esc(L.obj[h.object_type] || h.object_type), `<code>${esc(h.object_id)}</code>`, h.action === 'excluded' ? tag(L.act.excluded, 'y') : tag(L.act[h.action] || h.action)]), '아직 동기화 기록이 없습니다.') + `<p class="mini">${esc(secName(ov, el.dataset.v))} 기준 · 최근 200건</p>`, [{ id: 'c', label: '닫기' }], true); };
  ACT['lmsa-merge'] = el => { const ov = OV(); const rep = (ov.sections || []).find(y => y.section_id === el.dataset.v); if (!rep) return;
    const cand = (ov.sections || []).filter(y => y.term_id === rep.term_id && y !== rep && !y.rep_section_id && !(ov.sections || []).some(z => z.rep_section_id === y.section_id));
    modal('합반 — 대표분반 지정', `<p><b>${esc(rep.course_name)} ${esc(rep.section_no)}분반</b>을 대표분반으로 하고 아래 분반을 합칩니다. 공유분반은 학생 화면에서 숨겨지고 대표분반으로 보이며, 공유분반 강의실의 활동 기록(수강생 · 진도 · 과제 · 점수)은 대표분반 강의실로 옮깁니다.</p>
      ${cand.length ? cand.map(y => `<label class="ul-ck"><input type="checkbox" name="m_${esc(y.section_id)}" value="${esc(y.section_id)}"> ${esc(y.course_code)} ${esc(y.course_name)} ${esc(y.section_no)}분반 <small>(수강 ${y.enrolled})</small></label>`).join('') : '<div class="empty">합칠 수 있는 분반이 없습니다(같은 학기 · 다른 분반의 대표가 아닌 분반).</div>'}`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '합반', kind: 'pri', run: w => { const ids = $$('input[type=checkbox]:checked', w).map(x => x.value); if (!ids.length) { toast('합칠 분반을 고르세요.', 'warn'); return false; } act('merge', { rep_section_id: rep.section_id, section_ids: ids }, r => `${r.merged}개 분반을 합반했습니다. 활동 기록 ${r.moved}건을 옮겼습니다.`, { doc: true }); } }]); };
  ACT['lmsa-unmerge'] = el => modal('합반 해제', '<p>공유분반을 다시 학생에게 보이게 합니다. 이미 대표분반으로 옮긴 활동 기록은 대표분반에 남습니다.</p>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '해제', kind: 'pri', run: () => { act('unmerge', { section_id: el.dataset.v }, '합반을 해제했습니다.'); } }]);

  function vEnr(ov, term, secs) {
    const vis = secs.filter(s => !s.rep_section_id); const sid = vis.some(s => s.section_id === UI.lmsaSec) ? UI.lmsaSec : (vis[0] || {}).section_id;
    if (!sid) return '<div class="empty">이 학기에 분반이 아직 없습니다. 「분반」 단계에서 분반을 먼저 개설하세요.</div>';
    const grading = UI.lmsaGrade === '1'; const key = sid + '|' + (grading ? 1 : 0);
    let rows = null; if (!LIVEM()) { try { rows = DEMO.enrollments({ section_id: sid, grading: grading ? '1' : '' }).rows; } catch (e) { return `<div class="warn">${esc(e.message)}</div>`; } }
    else { rows = AC.enr[key] || null; if (!rows) X('enrollments', { section_id: sid, grading: grading ? '1' : '' }, true).then(r => { AC.enr[key] = r.rows; render(); }).catch(e => toast(e.message, 'warn')); }
    const s = vis.find(y => y.section_id === sid); const tch = isTeacher(ov);
    const look = UI.lmsaLook || ''; const vis0 = new Set((ov.sections || []).map(y => y.section_id)); const sv = !LIVEM() && look ? studentView(look).filter(v => vis0.has(v.section_id)) : null;
    return `<div class="card"><div class="ch"><b>수강생</b><select data-chg="lmsa-sec" aria-label="분반">${vis.map(y => `<option value="${esc(y.section_id)}" ${y.section_id === sid ? 'selected' : ''}>${esc(y.course_code)} ${esc(y.course_name)} ${esc(y.section_no)}분반</option>`).join('')}</select>
      <label class="ul-ck in"><input type="checkbox" data-chg="lmsa-grade" ${grading ? 'checked' : ''}> 성적 처리 명단(청강 · 대기 제외)</label><button class="btn sm" data-act="lmsa-roster-csv" data-v="${esc(sid)}">엑셀(CSV) 내려받기</button></div>
      ${rows ? table(['학번', '학과 · 학적', '구분', '분반', ''], rows.map(r => [`<b>${esc(r.member_no)}</b><small class="lmsa-sub">${esc(r.source === 'sis' ? '학사' : r.source === 'request' ? '신청' : '수동')} 등록</small>`, `${esc(unitName(ov, r.unit_code))}<small class="lmsa-sub">${esc(L.status[r.status] || r.status || '')}</small>`, `${r.kind === 'audit' ? tag('청강', 'y') : '정규'}${r.enr_status === 'pending' ? ' ' + tag('승인 대기', 'y') : ''}`, esc(r.section_no) + (s && r.section_no !== s.section_no ? ' ' + tag('합반') : ''),
        r.enr_status === 'enrolled' ? `<button class="btn sm ghost" data-act="lmsa-drop" data-s="${esc(sid)}" data-m="${esc(r.member_no)}">수강 취소</button>` : '']), '수강생이 없습니다.') : '<div class="empty">불러오는 중입니다.</div>'}
      <p class="mini">청강생은 성적 처리 명단 · 성적 화면에서 자동으로 빠집니다. 합반의 대표분반에는 공유분반 수강생이 함께 보입니다.</p></div>
      <div class="card"><div class="ch"><b>일괄 수강신청</b><small>비학사 사용자 · 휴학생 청강 등록 등 — 학번을 줄바꿈 · 쉼표로 구분</small></div>
      <textarea id="lmsaBulk" rows="3" class="lmsa-ta" placeholder="20261001&#10;20261002"></textarea><div class="bar2"><select id="lmsaBulkKind" aria-label="수강 구분"><option value="regular">정규</option><option value="audit">청강</option></select><button class="btn sm" data-act="lmsa-bulk" data-v="${esc(sid)}">수강 등록</button></div></div>
      ${tch ? '' : `<div class="card"><div class="ch"><b>학생 화면 미리보기</b><small>학번을 넣으면 그 학생에게 보이는 분반(공유분반은 대표분반으로)을 확인합니다</small></div><div class="bar2"><input id="lmsaLook" maxlength="20" placeholder="20261001" value="${esc(look)}" aria-label="학번"><button class="btn sm" data-act="lmsa-look">보기</button></div>
        ${LIVEM() ? '<p class="mini">운영 서버에서는 학생이 학습자 앱에서 로그인하면 /api/lms/a/my 로 같은 목록을 받습니다.</p>' : sv ? table(['학수번호', '교과목', '분반', '구분', '비고'], sv.map(v => [esc(v.course_code), esc(v.course_name), esc(v.section_no), esc(v.kind === 'ta' ? '조교' : L.enr[v.kind] + (v.ta ? ' · 조교' : '')), v.via ? `${esc(v.via)}분반 수강 → 대표분반으로 표시` : '']), '이 학번에게 보이는 분반이 없습니다.') : ''}</div>`}`;
  }
  ACT['lmsa-sec'] = el => { UI.lmsaSec = el.value; render(); };
  ACT['lmsa-grade'] = el => { UI.lmsaGrade = el.checked ? '1' : ''; render(); };
  ACT['lmsa-look'] = () => { UI.lmsaLook = T(($('#lmsaLook') || {}).value); render(); };
  ACT['lmsa-drop'] = el => act('enroll-drop', { section_id: el.dataset.s, member_no: el.dataset.m }, '수강을 취소했습니다.', { after: () => { AC.enr = {}; } });
  ACT['lmsa-bulk'] = el => { const L0 = T(($('#lmsaBulk') || {}).value).split(/[\s,;]+/).filter(Boolean); if (!L0.length) return toast('학번을 입력하세요.', 'warn');
    act('enroll', { section_id: el.dataset.v, member_nos: L0, kind: ($('#lmsaBulkKind') || {}).value || 'regular' }, r => `등록 ${r.added}명 · 이미 수강 ${r.skipped}명${r.errors.length ? ` · 오류 ${r.errors.length}건(${r.errors.slice(0, 3).map(e => e.member_no + ': ' + e.msg).join(', ')})${r.errors.some(e => e.msg === R.NOPERSON) ? ' — ' + NOP_HINT : ''}` : ''}`, { after: () => { AC.enr = {}; } }); };
  const NOP_HINT = '학생 › 학번 등록(접근코드 발급)에서 학번을 먼저 등록하면 바로 수강 등록됩니다.';
  ACT['lmsa-roster-csv'] = async el => { try { const r = await X('enrollments', { section_id: el.dataset.v, grading: UI.lmsaGrade === '1' ? '1' : '' }, true); downloadCSV(`수강생_${today()}.csv`, ['학번', '학과코드', '학적', '구분', '상태', '분반'], r.rows.map(x => [x.member_no, x.unit_code || '', L.status[x.status] || '', L.enr[x.kind], x.enr_status === 'pending' ? '승인 대기' : '수강', x.section_no])); } catch (e) { toast(e.message, 'warn'); } };

  const TPL = { person: '학번,구분,학과코드,학적,학년\n20269001,학생,CSE,휴학,3\nX0001,외부,,재학,\n', section: '학수번호,교과목명,분반,학점,학과코드,수업방식,정원,교과구분\nGEN2001,글쓰기와 소통,1,2,CSE,블렌디드,40,교양\n', enrollment: '학번,학수번호,분반,구분\n20261001,GEN1001,1,정규\n20261002,GEN1001,2,청강\n' };
  function vUpload(ov, term) {
    const k = UI.lmsaImp || 'enrollment'; const P = AC.prev && AC.prev.kind === k ? AC.prev : null;
    return `<div class="card"><div class="ch"><b>엑셀로 한꺼번에 올리기</b><small>엑셀에서 CSV(UTF-8)로 저장해 올립니다 · 한 번에 5,000행 · 학사 연동 후에는 자동으로 들어옵니다</small></div>
      <ol class="lmsa-steps mini" aria-label="올리는 순서"><li class="${k === 'person' ? 'on' : ''}"><b>① 구성원</b> 학생 · 교수 학번(학생 › 학번 등록으로 발급한 학번은 건너뛰어도 됩니다)</li><li class="${k === 'section' ? 'on' : ''}"><b>② 교과목 · 분반</b> 분반마다 15주 강의실이 함께 만들어집니다</li><li class="${k === 'enrollment' ? 'on' : ''}"><b>③ 수강</b> 등록된 학번과 이 학기 분반을 잇습니다</li></ol>
      <div class="form2"><label class="fl">데이터 종류<select data-chg="lmsa-imp-kind">${Object.entries(L.imp).map(([v, l]) => `<option value="${v}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>${k === 'person' ? '' : `<label class="fl">학기${termSel(ov, 'impTerm', term)}</label>`}<label class="fl">CSV 파일<input type="file" accept=".csv,text/csv" data-chg="lmsa-file"></label></div>
      <textarea id="lmsaCsv" rows="6" class="lmsa-ta" spellcheck="false" placeholder="${esc(TPL[k])}">${esc(UI.lmsaCsv || '')}</textarea>
      <div class="bar2"><button class="btn sm" data-act="lmsa-tpl">양식 내려받기</button><button class="btn sm ${P && P.ok ? '' : 'pri'}" data-act="lmsa-prev">미리보기 · 검증</button>${P && P.ok ? `<button class="btn sm pri" data-act="lmsa-apply">${P.ok}행 반영${P.error ? `(오류 ${P.error}행 제외)` : ''}</button>` : ''}</div>
      <p class="mini">${k === 'person' ? '학생 · 교수 · 외부 사용자를 일괄 등록합니다. 학번 · 구분 · 학과코드(또는 학과 이름) · 학적 · 학년만 받고, 이름 · 연락처 열은 받지 않습니다. 학생 학번에는 접근코드를 함께 발급합니다(학생 › 학번 등록에서 확인).' : k === 'section' ? '없는 교과목은 함께 만들고, 이미 있는 분반은 건너뜁니다.' : '등록된 학번과 이 학기 분반만 받습니다. 구분이 「청강」이면 성적 처리에서 자동 제외됩니다.'}</p></div>
      ${P ? `<div class="card" id="lmsaPrev"><div class="ch"><b>미리보기</b><small>전체 ${P.total}행 · 정상 ${P.ok} · 건너뜀 ${P.skip} · 오류 ${P.error}${P.applied ? ' · 반영 완료' : ''}</small></div>
        ${P.errors.length ? `<h4 class="lmsa-h">오류 행</h4>${P.errors.some(e => e.msg === R.NOPERSON) ? `<p class="mini lmsa-warn">${esc(NOP_HINT)} 엑셀로 올릴 때는 ① 구성원 → ② 교과목 · 분반 → ③ 수강 순서로 올리세요.</p>` : ''}${table(['행', '내용'], P.errors.slice(0, 100).map(e => [esc(e.line), `<span class="lmsa-err">${esc(e.msg)}</span>`]))}` : ''}
        ${table(['행', '결과', '값', '안내'], P.rows.slice(0, 50).map(r => [esc(r.line), r.st === 'ok' ? tag('정상') : r.st === 'skip' ? tag('건너뜀', 'y') : tag('오류', 'r'), `<small>${esc(Object.values(r.data).filter(v => v != null && v !== '').join(' · '))}</small>`, esc(r.msg)]))}</div>` : ''}
      <div class="card"><div class="ch"><b>올린 기록</b></div>${table(['올린 때', '종류 · 학기', '반영 · 건너뜀', '오류'], (ov.runs || []).map(r => [`${esc(new Date(r.at).toLocaleString('ko-KR', { hour12: false }))}<small class="lmsa-sub">#${esc(r.run_id)}</small>`, `${esc(L.imp[r.scope] || r.scope)}<small class="lmsa-sub">${esc(r.term_id || '—')}</small>`, `${esc(r.counts.inserted)} · ${esc(r.counts.skipped)}`, r.errors_n ? tag(r.errors_n + '건', 'r') : '0']), '기록이 없습니다.')}</div>`;
  }
  ACT['lmsa-imp-kind'] = el => { UI.lmsaImp = el.value; AC.prev = null; render(); };
  ACT['lmsa-file'] = el => { const f = el.files && el.files[0]; if (!f) return; if (f.size > 3 * 1024 * 1024) return toast('3MB 이하 CSV만 올릴 수 있습니다.', 'warn'); const rd = new FileReader(); rd.onload = () => { UI.lmsaCsv = String(rd.result || ''); AC.prev = null; render(); }; rd.readAsText(f, 'utf-8'); };
  ACT['lmsa-tpl'] = () => { const k = UI.lmsaImp || 'enrollment'; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + TPL[k]], { type: 'text/csv' })); a.download = `학사업로드_${L.imp[k].replace(/[^가-힣]/g, '')}_양식.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const impBody = apply => { const k = UI.lmsaImp || 'enrollment'; UI.lmsaCsv = ($('#lmsaCsv') || {}).value || UI.lmsaCsv || ''; const tsel = $('select[name="impTerm"]'); return { kind: k, term_id: k === 'person' ? undefined : (tsel ? tsel.value : curTerm(OV())), csv: UI.lmsaCsv, apply }; };
  ACT['lmsa-prev'] = async () => { try { AC.prev = await X('import', impBody(false)); render(); const p = $('#lmsaPrev'); p && p.scrollIntoView && p.scrollIntoView({ block: 'nearest' }); } catch (e) { AC.prev = null; toast(e.message, 'warn'); render(); } };
  ACT['lmsa-apply'] = () => { const P = AC.prev; modal('학사 데이터 반영', `<p>정상 <b>${P.ok}</b>행을 반영합니다.${P.error ? ` 오류 ${P.error}행은 빼고 기록으로 남깁니다.` : ''}${P.skip ? ` 이미 있는 ${P.skip}행은 건너뜁니다.` : ''}</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '반영', kind: 'pri', run: () => { act('import', impBody(true), r => `반영 ${r.counts.inserted}행 · 건너뜀 ${r.counts.skipped} · 오류 ${r.counts.error} (기록 #${r.run_id})${r.codes ? ` · 접근코드 ${r.codes}건 발급` : ''}`, { after: r => { AC.prev = r; AC.enr = {}; } }); } }]); };

  function vReq(ov, term, secs) {
    const R0 = (ov.requests || []); const vis = secs.filter(s => !s.rep_section_id);
    return `<div class="card"><div class="ch"><b>처리할 신청</b><small>조교 · 청강생 신청을 승인하거나 반려합니다. 승인 안내 메일은 메일 연동 후 자동 발송됩니다</small></div>
      ${table(['신청 시각', '분반', '학번', '학과', '구분', ''], R0.map(r => [esc(new Date(r.at).toLocaleString('ko-KR', { hour12: false })), esc(secName(ov, r.section_id)), esc(r.member_no), esc(unitName(ov, r.unit_code)), r.kind === 'ta' ? tag('조교') : tag('청강', 'y'),
        `<div class="lmsa-acts"><button class="btn sm pri" data-act="lmsa-dec" data-y="1" data-s="${esc(r.section_id)}" data-m="${esc(r.member_no)}" data-k="${esc(r.kind)}">승인</button><button class="btn sm ghost" data-act="lmsa-dec" data-y="0" data-s="${esc(r.section_id)}" data-m="${esc(r.member_no)}" data-k="${esc(r.kind)}">반려</button></div>`]), '처리할 신청이 없습니다.')}</div>
      <div class="card"><div class="ch"><b>신청 등록</b><small>학생이 학습자 앱에서 직접 신청 · 취소할 수 있고, 교수 · 관리자가 대신 등록할 수도 있습니다</small></div>
      <div class="form2"><label class="fl">분반<select id="lmsaReqSec">${vis.map(y => `<option value="${esc(y.section_id)}">${esc(y.course_code)} ${esc(y.course_name)} ${esc(y.section_no)}분반</option>`).join('')}</select></label><label class="fl">학번 · 사번<input id="lmsaReqM" maxlength="20" placeholder="20261005"></label><label class="fl">구분<select id="lmsaReqK"><option value="audit">청강</option><option value="ta">조교</option></select></label></div>
      <div class="bar2"><button class="btn sm" data-act="lmsa-req">신청 등록</button></div><p class="mini">청강생은 승인되면 수강 명단에 「청강」으로 들어가고 성적 처리에서 자동 제외됩니다. 조교는 승인되면 분반 담당(조교)으로 등록됩니다.</p></div>`;
  }
  ACT['lmsa-dec'] = el => act('request-decide', { section_id: el.dataset.s, member_no: el.dataset.m, kind: el.dataset.k, approve: el.dataset.y === '1' }, el.dataset.y === '1' ? '승인했습니다.' : '반려했습니다.', { after: () => { AC.enr = {}; } });
  ACT['lmsa-req'] = () => act('request', { section_id: ($('#lmsaReqSec') || {}).value, member_no: T(($('#lmsaReqM') || {}).value), kind: ($('#lmsaReqK') || {}).value }, '신청을 등록했습니다.');

  function vOrg(ov) {
    const U0 = ov.units || []; const colleges = U0.filter(u => u.kind === 'college' || u.kind === 'univ'); const owner = ov.me.role === 'owner';
    return `<div class="card"><div class="ch"><b>단과대학 · 학과</b><small>학사 조직 코드 기준 · 학사 연동 후 자동</small><button class="btn sm" data-act="lmsa-unit-new">조직 추가</button></div>
      ${table(['코드', '이름', '구분', '상위', ''], U0.map(u => [esc(u.unit_code), esc(u.name), esc(L.ukind[u.kind] || u.kind), esc(u.parent_code ? unitName(ov, u.parent_code) : '—'), `<button class="btn sm ghost" data-act="lmsa-unit-del" data-v="${esc(u.unit_code)}">삭제</button>`]), '조직이 없습니다.')}</div>
      <div class="card"><div class="ch"><b>단과대학 관리 권한 · 교수 계정 연결</b><small>부운영자에게 단과대학을 지정하면 그 단과대학(소속 학과 포함)의 교과목 · 분반 · 구성원만 관리합니다. 서버에서도 같은 범위를 강제합니다</small></div>
      ${table(['계정', '역할', '관리 범위', '연결 사번'], (ov.scopes || []).map(s => [esc(s.email), esc(roleName(s.role)), s.units && s.units.length ? s.units.map(u => tag(unitName(ov, u))).join(' ') : '전체', esc(s.member_no || '—')]), '지정된 범위가 없습니다(모든 운영자가 전체 범위).')}
      ${owner ? `<div class="lmsa-scopeform"><label class="fl">${LIVEM() ? '운영자 이메일<input id="lmsaScEmail" maxlength="120" placeholder="dean@univ.ac.kr">' : `대상<select id="lmsaScEmail"><option value="sub">부운영자 화면(데모)</option><option value="teacher">${esc(t('teacher'))} 화면(데모)</option></select>`}</label>
        <div class="fl"><span>관리 범위(단과대학)</span><div class="lmsa-units">${colleges.map(u => `<label class="ul-ck in"><input type="checkbox" class="lmsaScU" value="${esc(u.unit_code)}"> ${esc(u.name)}</label>`).join('') || '<small>단과대학을 먼저 추가하세요.</small>'}</div></div>
        <label class="fl">교수 사번(교수 화면 연결)<input id="lmsaScM" maxlength="20" placeholder="P0001"></label><div class="bar2"><button class="btn sm" data-act="lmsa-scope">저장</button></div></div>` : '<p class="mini">범위 지정은 정운영자만 할 수 있습니다.</p>'}</div>`;
  }
  ACT['lmsa-unit-new'] = () => { const ov = OV(); modal('조직 추가', `<div class="form2"><label class="fl">코드<input name="unit_code" maxlength="20" placeholder="CSE"></label><label class="fl">이름<input name="name" maxlength="60" placeholder="컴퓨터공학과"></label></div>
    <div class="form2"><label class="fl">구분<select name="kind">${Object.entries(L.ukind).map(([k, v]) => `<option value="${k}" ${k === 'dept' ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="fl">상위 조직<select name="parent_code"><option value="">(없음)</option>${(ov.units || []).map(u => `<option value="${esc(u.unit_code)}">${esc(u.name)}</option>`).join('')}</select></label></div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { act('unit', { unit_code: fv(w, 'unit_code'), name: fv(w, 'name'), kind: fv(w, 'kind'), parent_code: fv(w, 'parent_code') }, '조직을 저장했습니다.'); } }]); };
  ACT['lmsa-unit-del'] = el => act('unit-delete', { unit_code: el.dataset.v }, '조직을 삭제했습니다.');
  ACT['lmsa-scope'] = () => act('scope', { email: T(($('#lmsaScEmail') || {}).value), units: $$('.lmsaScU:checked').map(x => x.value), member_no: T(($('#lmsaScM') || {}).value) }, '권한 범위를 저장했습니다.');

  /* ── 성적(ulms) — 청강생 자동 제외: 강의실에 연결된 분반(합반 공유분반 포함)의 청강 학번을 성적 계산에서 뺀다 ── */
  function auditMembers(classId) {
    let nos = [];
    if (!LIVEM()) { const A = S.lms && S.lms.a; if (!A) return new Set(); const secIds = new Set(A.sections.filter(s => s.class_id === classId).map(s => s.section_id)); A.sections.filter(s => secIds.has(s.rep_section_id)).forEach(s => secIds.add(s.section_id));
      nos = A.enr.filter(e => secIds.has(e.section_id) && e.kind === 'audit' && e.status !== 'dropped').map(e => e.member_no); }
    else { nos = AC.audit[classId] || []; const ov = AC.ov; if (ov && !AC.audit[classId]) { AC.audit[classId] = []; const ss = (ov.sections || []).filter(s => s.class_id === classId && s.audit);
      Promise.all(ss.map(s => X('enrollments', { section_id: s.section_id }, true).then(r => r.rows.filter(x => x.kind === 'audit').map(x => x.member_no)).catch(() => []))).then(L1 => { AC.audit[classId] = L1.flat(); if (AC.audit[classId].length && CUR.tab === 'grade') render(); }); } }
    const set = new Set(nos); const ids = new Set(); (S.members || []).forEach(m => { const no = String(m.sid || (m.extra && m.extra['학번']) || ''); if (no && set.has(no)) ids.add(m.id); }); return ids;
  }
  const withoutAudit = fn => { const saved = []; try { (S.classes || []).forEach(c => { const ex = auditMembers(c.id); if (ex.size && Array.isArray(c.learners)) { saved.push([c, c.learners]); c.learners = c.learners.filter(id => !ex.has(id)); } }); return fn(saved); } finally { saved.forEach(([c, l]) => { c.learners = l; }); } };
  if (typeof VIEWS.grade === 'function') { const base = VIEWS.grade; VIEWS.grade = () => { if (!ON()) return base(); return withoutAudit(saved => { const h = base(); const n = saved.reduce((a, [c, l]) => a + l.length - c.learners.length, 0); return n ? `<div class="lmsa-note" id="lmsaAuditNote">${ic('check', 14)} 청강생 ${n}명은 성적 처리에서 자동 제외되었습니다(학기 · 강좌 › 수강생).</div>` + h : h; }); }; }
  ['grade-xls', 'grade-send', 'gr-nudge'].forEach(k => { if (typeof ACT[k] === 'function') { const base = ACT[k]; ACT[k] = (...a) => (ON() ? withoutAudit(() => base(...a)) : base(...a)); } });
  window.lmsaX = X;
  window.lmsaDemo = (name, body) => { const r = DEMO[name](body || {}); bump(); ens(); try { save(); } catch (e) { } return r; }; /* 점검(tests/ui/lms38.js)용 */
  /* v38 학번 등록(접근코드 발급, mem2.js) 직후 학사 구성원 · 강의실 · 출결에 바로 반영 */
  { const base = ACT['en-codes']; if (typeof base === 'function') ACT['en-codes'] = (...a) => { const r = base(...a); try { if (ON() && !LIVEM()) { ens(); save(); } } catch (e) { console.error(e); } return r; }; }
})();
