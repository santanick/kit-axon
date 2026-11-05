# 학사 LMS 묶음 A API — 강좌 · 분반 (`/api/lms/a/*`, v30)

Node `service/server/lms/mod-a.js` · Java `egovframework.didisam.lms.a`(+ `mapper/lms_a.xml`)가 같은 규격을 낸다. 대조: `service-egov/test/lms-a.js`.

- 인증: 운영자 세션 쿠키(`/api/login`). `GET`이 아니면 `x-didisam: 1` 헤더 필수(CSRF). 오류는 `{ error: 코드, message: 한국어 문구 }`.
- 기관 유형이 `univ`가 아니면 모두 `403 lms_edition`.
- 권한 맥락
  - 정운영자 · 부운영자(`owner` · `sub`)는 관리자.
  - 부운영자에게 단과대학 범위(`lms_user_link.units`)가 있으면, 그 조직과 하위 학과의 교과목 · 분반 · 구성원만 다룬다. 범위 밖이면 `403 lms_scope`.
  - 교수(`teacher`)는 연결된 사번(`lms_user_link.member_no`)이 교수 · 공동교수로 담당하는 분반만 다룬다(관리 경로는 `403 lms_role`).
- 개인정보: 구성원은 학번(사번) · 구분 · 학과 코드 · 학적 · 학년만 저장하고 응답한다.
- 쿼리 · 쓰기는 모두 `inTenant`(RLS) 안에서 한다. 스키마: `service/server/lms/sql/00_base.sql` + `10_a.sql`.

## 조회 경로(GET)

| 경로 | 매개변수 | 응답 | 권한 |
|---|---|---|---|
| `/overview` | — | `{me:{role,admin,units,member_no}, terms[], units[], courses[], sections[{section_id, term_id, course_code, course_name, unit_code, section_no, title, mode, capacity, schedule[], rep_section_id, hidden, class_id, status, source, staff[{member_no,role,status,source}], enrolled, audit, pending}], requests[{section_id,member_no,unit_code,kind,at}], runs[], persons:{total,manual}, scopes[]}` | 모두(범위 · 담당으로 걸러짐) |
| `/enrollments` | `section_id`, `grading=1` | `{section_id, rows[{member_no, person_kind, unit_code, status, kind, enr_status, source, section_no, at}]}` | 분반 관리자 · 교수 |
| `/persons` | `q`(학번 앞자리), `kind` | `{rows[{member_no, kind, unit_code, status, grade_year, source}]}`(최대 200) | 관리자 |
| `/sync-history` | `section_id` | `{rows[{at, src_section, dst_section, dst_no, object_type, object_id, action}]}`(최근 200) | 분반 관리자 · 교수 |
| `/my` | — | `{me:{member_no}|null, sections[], requests[], open[]}` | 학습자 세션 쿠키 |

보충:
- `/enrollments`에서 `grading=1`이면 성적 처리 명단을 준다. 정규 · 수강 확정만 들어가고 청강 · 대기는 빠진다. 대표분반을 조회하면 공유분반의 수강생도 함께 나온다.
- `/my`에서 `sections`의 공유분반은 대표분반으로 바꿔 보여 주고, 실제 수강한 분반 번호를 `via`에 넣는다.

## 변경 경로(POST)

응답은 별도 표시가 없으면 `{ok:true}`.

### 학기 · 조직 · 교과목 · 구성원

| 경로 | 본문 | 비고 |
|---|---|---|
| `/term` | `{term_id:'2026-2', name, starts_on, ends_on, is_operating}` | 전체 관리자만. 운영 학기는 하나만 둔다 |
| `/term-delete` | `{term_id}` | 분반이 있으면 `409 in_use` |
| `/unit` · `/unit-delete` | `{unit_code, name, kind:'college'|'dept'|…, parent_code}` | 전체 관리자만 |
| `/course` · `/course-delete` | `{course_code, name, credits, unit_code, category}` | 범위 안에서만 |
| `/person` | `{member_no, kind, unit_code, status, grade_year}` | 수동 입력. `source='manual'` |

### 분반 · 담당 · 수강

| 경로 | 본문 | 응답 · 비고 |
|---|---|---|
| `/section` | 개설: `{term_id, course_code, section_no, title?, mode, capacity, schedule[{day,period,room}], class_id?, status}` · 수정: `{section_id, …}` | `{ok, section_id}`. `class_id`는 스튜디오 강의실 연결 |
| `/section-delete` | `{section_id}` | 수강생이 있으면 `409 in_use`, 공유분반이 있으면 `409 merged` |
| `/staff` · `/staff-delete` | `{section_id, member_no, role:'professor'|'co_professor'|'ta'|'grader'|'staff'}` | 공동교수 · 팀티칭 |
| `/enroll` | `{section_id, member_nos[], kind:'regular'|'audit'}` | `{added, skipped, errors[{member_no,msg}]}`. 최대 5,000명 |
| `/enroll-drop` | `{section_id, member_no}` | 수강 취소 |

### 학사 CSV 업로드 · 분반 동기화 · 합반

**`/import`** — `{kind:'person'|'section'|'enrollment', term_id?, csv, apply?}`
- 미리보기 응답: `{kind, term_id, total, ok, skip, error, rows[≤300 {line, st:'ok'|'skip'|'error', msg, data}], errors[≤500 {line,msg}]}`
- `apply:true`이면 위 응답에 `applied`, `run_id`, `counts:{inserted, skipped, error}`가 더해진다.
- 오류 행을 빼고 반영하고, 실행 기록을 `lms_sis_sync_run`에 남긴다(trigger `manual`).
- 머리글: 구성원 `학번,구분,학과코드,학적,학년` · 교과목 · 분반 `학수번호,교과목명,분반,학점,학과코드,수업방식,정원,교과구분` · 수강 `학번,학수번호,분반,구분`
- 한 번에 5,000행까지(넘으면 `413 csv_rows`), 본문은 3MB까지.

**`/sync`** — `{section_id}`(대표 분반)
- 응답: `{sections, noclass, copied, updated, deleted, excluded, unchanged, rev}`
- 기관 문서의 강의실 공지 · 커리큘럼을 같은 학기 · 교과목의 다른 분반 강의실로 복제한다.
- 분반에서 고치거나 지운 항목은 `excluded`로 기록하고 다시 덮어쓰지 않는다.
- 문서 `rev`가 올라가므로 화면은 처리 후 `/api/state`를 다시 받는다.

**`/merge`** — `{rep_section_id, section_ids[]}`
- 응답: `{merged, moved, rev}`
- 공유분반은 `rep_section_id` · `hidden=true`가 되고, 강의실 활동 기록은 대표분반으로 옮긴다.

**`/unmerge`** — `{section_id}`: 합반을 해제한다. 이미 옮긴 활동 기록은 대표분반에 남는다.

### 조교 · 청강 신청 · 권한 범위 · 학습자

| 경로 | 본문 | 비고 |
|---|---|---|
| `/request` | `{section_id, member_no, kind:'ta'|'audit'}` | 교수 · 관리자가 대신 등록 |
| `/request-decide` | `{section_id, member_no, kind, approve:true|false}` | `{ok, status}` |
| `/scope` | `{email, units[], member_no}` | 정운영자만. 단과대학 범위 · 교수 사번 연결. 둘 다 비우면 해제 |
| `/my` | `{act:'request'|'cancel', kind:'audit'|'ta', section_id}` | 학습자 자율 청강 · 조교 신청 · 취소(운영 학기의 공개 분반만) |

## 연동 지점(만들지 않음)

- 학사 자동 동기화(DB · API · SFTP): 같은 표를 채우는 배치로 붙인다. `source='sis'` · `trigger='schedule'`.
- Code Share 자동 합반: 학사 연동 데이터에 합반 키가 오면 `/merge`와 같은 처리를 호출한다.
- 승인 안내 메일 실발송: 메일 연동 후 `lms.request.*` 감사 기록을 트리거로 쓴다.
