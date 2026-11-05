-- 디디쌤 학사 LMS 도메인 스키마 v1.0 (2026-11-05, 설계안)
-- 대상: 대학 학사 LMS 에디션(전교생 메인 LMS). 근거 요건: 전남대 RFP SFR-003 · 005 · 010 · 015 · 016 · 018 · 019 · 025 · 028 · 031 · 032 · 033 · 050 · 068, PER-001, DAR-001 · 002 · 006
-- 원칙
--  1) 모든 표에 tenant_id + RLS(tenant_iso) — 기존 디디쌤 스키마(service/server/db.js)와 같은 방식. 앱은 didisam_tenant 역할로만 접근.
--  2) 개인정보 최소화: 구성원은 학번(사번) · 학과 · 학적 상태만 저장한다(대표 지시 「학번과 학과만 저장, 필요하면 학교와 SSO」). 이름 · 연락처는 SSO/학사 조회로 화면에서만 표시하고 저장하지 않는다.
--  3) 학사 원천(SIS)이 주인인 값과 LMS가 주인인 값을 구분: sis_key · source · synced_at 열로 출처를 남기고, 학사 동기화는 SIS 값만 덮어쓴다.
--  4) 명명: 테이블 lms_ 접두 · snake_case · 코드값은 text + check(DAR-001 코드 표준화). 시간은 timestamptz.
--  5) 성능(PER-001: 3초 · 동시 3,000명): 조회 경로마다 복합 인덱스, 출석 · 점수는 (section, person) 유일키로 upsert.

begin;

-- ── 학기 ───────────────────────────────────────────────
create table if not exists lms_term (
  tenant_id   text not null references tenants(id) on delete cascade,
  term_id     text not null,                       -- 예: 2026-1, 2026-S(여름)
  name        text not null,
  starts_on   date not null,
  ends_on     date not null,
  is_operating boolean not null default false,     -- 운영학기(SFR-050)
  is_syncing  boolean not null default false,      -- 연동학기
  primary key (tenant_id, term_id),
  check (ends_on >= starts_on)
);

-- ── 조직(대학 · 학과) ─────────────────────────────────
create table if not exists lms_org_unit (
  tenant_id   text not null references tenants(id) on delete cascade,
  unit_code   text not null,                       -- 학사 조직 코드
  name        text not null,
  parent_code text,
  kind        text not null default 'dept' check (kind in ('univ','college','dept','major','office')),
  sis_key     text, synced_at timestamptz,
  primary key (tenant_id, unit_code)
);

-- ── 구성원(가명 · 최소정보) ───────────────────────────
create table if not exists lms_person (
  tenant_id   text not null references tenants(id) on delete cascade,
  person_id   uuid not null default gen_random_uuid(),
  member_no   text not null,                       -- 학번 · 사번
  kind        text not null check (kind in ('student','professor','staff','external')),
  unit_code   text,                                -- 학과
  status      text not null default 'active' check (status in ('active','leave','graduated','expelled','withdrawn','retired')), -- 학적(재학 · 휴학 · 졸업 · 제적 · 자퇴)
  grade_year  smallint,                            -- 학년(설문 대상 구분 SFR-014)
  source      text not null default 'sis' check (source in ('sis','manual','external')),
  sis_key     text, synced_at timestamptz,
  last_login_at timestamptz, last_login_ip_masked text, -- SFR-005 최종접속 표시(IP 끝자리 가림)
  primary key (tenant_id, person_id),
  unique (tenant_id, member_no)
);
create index if not exists lms_person_unit on lms_person (tenant_id, unit_code, kind);

-- ── 교과목 ────────────────────────────────────────────
create table if not exists lms_course (
  tenant_id   text not null references tenants(id) on delete cascade,
  course_code text not null,                       -- 학수번호
  name        text not null,
  credits     numeric(3,1),
  unit_code   text,
  category    text check (category in ('major','general','elective','extracurricular','open','exchange')), -- 정규 · 비정규(SFR-004)
  sis_key     text, synced_at timestamptz,
  primary key (tenant_id, course_code)
);

-- ── 분반(개설 강좌) ───────────────────────────────────
create table if not exists lms_section (
  tenant_id   text not null references tenants(id) on delete cascade,
  section_id  uuid not null default gen_random_uuid(),
  term_id     text not null,
  course_code text not null,
  section_no  text not null,                       -- 분반 번호
  title       text not null,
  mode        text not null default 'offline' check (mode in ('online','blended','offline','hyflex')),
  schedule    jsonb not null default '[]',         -- [{요일, 교시, 강의실}] 학사 원천
  capacity    int,
  rep_section_id uuid,                             -- 합반 대표분반(SFR-019). null = 자기 자신이 대표
  merged_code_share text,                          -- Code Share 그룹 키
  hidden      boolean not null default false,      -- 공유분반 숨김
  syllabus    jsonb not null default '{}',         -- 수업계획서(평가 비율 포함, SFR-032 자동 등록)
  status      text not null default 'open' check (status in ('draft','open','closed','archived')),
  source      text not null default 'sis' check (source in ('sis','manual')),
  sis_key     text, synced_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (tenant_id, section_id),
  unique (tenant_id, term_id, course_code, section_no),
  foreign key (tenant_id, term_id) references lms_term (tenant_id, term_id),
  foreign key (tenant_id, course_code) references lms_course (tenant_id, course_code),
  foreign key (tenant_id, rep_section_id) references lms_section (tenant_id, section_id)
);
create index if not exists lms_section_term on lms_section (tenant_id, term_id, status);
create index if not exists lms_section_rep on lms_section (tenant_id, rep_section_id) where rep_section_id is not null;

-- 분반 담당(교수 · 조교 · 채점자) — 조교 · 청강 신청 승인(SFR-025)은 manual로 남긴다
create table if not exists lms_section_staff (
  tenant_id   text not null,
  section_id  uuid not null,
  person_id   uuid not null,
  role        text not null check (role in ('professor','co_professor','ta','grader','staff')),
  source      text not null default 'sis' check (source in ('sis','manual','request')),
  approved_by uuid, approved_at timestamptz,
  primary key (tenant_id, section_id, person_id, role),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);
create index if not exists lms_staff_person on lms_section_staff (tenant_id, person_id);

-- ── 수강 ──────────────────────────────────────────────
create table if not exists lms_enrollment (
  tenant_id   text not null,
  section_id  uuid not null,
  person_id   uuid not null,
  kind        text not null default 'regular' check (kind in ('regular','audit')),  -- 정규 · 청강
  status      text not null default 'enrolled' check (status in ('enrolled','dropped','pending')),
  source      text not null default 'sis' check (source in ('sis','manual','request')),
  enrolled_at timestamptz not null default now(),
  dropped_at  timestamptz,
  sis_key     text, synced_at timestamptz,
  primary key (tenant_id, section_id, person_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);
create index if not exists lms_enr_person on lms_enrollment (tenant_id, person_id, status); -- 「내 강의」 조회

-- 분반 동기화 이력(SFR-018): 대표분반 → 하위 분반 복제, 개별 수정 · 삭제분은 excluded로 재동기화 제외
create table if not exists lms_section_sync (
  tenant_id   text not null,
  id          bigserial,
  src_section uuid not null,
  dst_section uuid not null,
  object_type text not null check (object_type in ('notice','material','week','assignment','discussion','exam')),
  object_id   text not null,
  action      text not null check (action in ('copied','updated','deleted','excluded')),
  at          timestamptz not null default now(),
  by_person   uuid,
  primary key (tenant_id, id)
);
create index if not exists lms_ss_dst on lms_section_sync (tenant_id, dst_section, object_type, object_id);

-- ── 주차 · 차시 ───────────────────────────────────────
create table if not exists lms_session (
  tenant_id   text not null,
  session_id  uuid not null default gen_random_uuid(),
  section_id  uuid not null,
  week_no     smallint not null,
  seq         smallint not null default 1,          -- 차시
  kind        text not null default 'class' check (kind in ('class','online','live','exam','holiday')),
  starts_at   timestamptz, ends_at timestamptz,
  open_at     timestamptz, close_at timestamptz,   -- 온라인 인정 기간
  required_sec int not null default 0,              -- 원격수업 학습분량(SFR-015): 콘텐츠 재생 + 지정 학습시간 합
  primary key (tenant_id, session_id),
  unique (tenant_id, section_id, week_no, seq),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);

-- ── 출석 ──────────────────────────────────────────────
-- 출석 규칙(분반 단위): 인증 방식 · 지각 기준 · 온라인 인정 진도율 · 하이플렉스 조건(SFR-010 · 016 · 068)
create table if not exists lms_attendance_rule (
  tenant_id   text not null,
  section_id  uuid not null,
  methods     text[] not null default '{code}',     -- code · photo · bio · otp · sms · email · kakao · online · live · manual
  late_after_min smallint not null default 10,
  absent_after_min smallint not null default 30,
  online_min_pct smallint not null default 90,      -- 진도율 기준
  require_identity boolean not null default false,  -- 대리출석 방지 본인인증 필수(SFR-016)
  block_concurrent boolean not null default true,   -- 동시 재생 차단
  updated_at  timestamptz not null default now(),
  primary key (tenant_id, section_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
-- 인증번호(평문 저장 금지 — 해시 · 짧은 만료)
create table if not exists lms_attendance_code (
  tenant_id   text not null,
  session_id  uuid not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  issued_by   uuid,
  primary key (tenant_id, session_id),
  foreign key (tenant_id, session_id) references lms_session (tenant_id, session_id) on delete cascade
);
create table if not exists lms_attendance (
  tenant_id   text not null,
  session_id  uuid not null,
  person_id   uuid not null,
  status      text not null check (status in ('present','late','absent','excused')),  -- 출석 · 지각 · 결석 · 공결
  method      text not null check (method in ('code','photo','bio','otp','sms','email','kakao','online','live','manual','sis')),
  evidence    jsonb not null default '{}',          -- 사진 촬영 위치 · 일시 해시, 인증 결과 코드, 접속 IP(끝자리 가림) — 원본 사진은 저장소 키만
  online_sec  int,                                  -- 온라인 학습 인정 시간
  reason      text,                                 -- 공결 사유(증빙 키)
  decided_by  uuid,                                 -- 교수자 수동 조정(SFR-031 장애 시 조정)
  decided_at  timestamptz not null default now(),
  sent_to_sis_at timestamptz,                       -- 학사 전송(SFR-050)
  primary key (tenant_id, session_id, person_id),
  foreign key (tenant_id, session_id) references lms_session (tenant_id, session_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);
create index if not exists lms_att_person on lms_attendance (tenant_id, person_id);

-- ── 성적 ──────────────────────────────────────────────
-- 평가 항목(수업계획서 평가 비율 자동 등록, 카테고리 유연 — SFR-032)
create table if not exists lms_grade_item (
  tenant_id   text not null,
  item_id     uuid not null default gen_random_uuid(),
  section_id  uuid not null,
  category    text not null check (category in ('midterm','final','assignment','quiz','attendance','participation','project','other')),
  name        text not null,
  weight_pct  numeric(5,2) not null default 0,
  max_score   numeric(7,2) not null default 100,
  source_ref  text,                                 -- 과제 · 시험 등 LMS 활동 키(자동 반영)
  sort        smallint not null default 0,
  primary key (tenant_id, item_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create index if not exists lms_gi_section on lms_grade_item (tenant_id, section_id);
create table if not exists lms_grade_score (
  tenant_id   text not null,
  item_id     uuid not null,
  person_id   uuid not null,
  score       numeric(7,2),
  feedback    text,
  graded_by   uuid, graded_at timestamptz not null default now(),
  primary key (tenant_id, item_id, person_id),
  foreign key (tenant_id, item_id) references lms_grade_item (tenant_id, item_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);
-- 최종 성적(교수 확정 → 학사 전송). 확정 후 변경은 이력으로만
create table if not exists lms_grade_final (
  tenant_id   text not null,
  section_id  uuid not null,
  person_id   uuid not null,
  total       numeric(6,2),
  scale       text not null default 'abc' check (scale in ('abc','relative','score','pct','pass')),
  letter      text,                                 -- A+ … F, P/NP
  confirmed_by uuid, confirmed_at timestamptz,
  sent_to_sis_at timestamptz, sis_ack text,
  primary key (tenant_id, section_id, person_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);
create table if not exists lms_grade_history (
  tenant_id   text not null,
  id          bigserial,
  section_id  uuid not null, person_id uuid not null,
  before      jsonb, after jsonb, reason text,
  by_person   uuid, at timestamptz not null default now(),
  primary key (tenant_id, id)
);

-- ── 학사 연동 실행 기록(SFR-003 · 050) ────────────────
create table if not exists lms_sis_sync_run (
  tenant_id   text not null references tenants(id) on delete cascade,
  run_id      bigserial,
  term_id     text,
  scope       text not null check (scope in ('all','org','person','course','section','enrollment','staff','grade_out','attendance_out')),
  trigger     text not null check (trigger in ('schedule','manual','realtime')),
  started_at  timestamptz not null default now(), finished_at timestamptz,
  counts      jsonb not null default '{}',          -- {inserted, updated, dropped, skipped}
  errors      jsonb not null default '[]',          -- 정합성 경고(학번 없음 · 분반 불일치 등)
  primary key (tenant_id, run_id)
);

-- ── RLS · 권한(기존 스키마와 같은 방식) ───────────────
do $$ declare t text; begin
  foreach t in array array['lms_term','lms_org_unit','lms_person','lms_course','lms_section','lms_section_staff','lms_enrollment','lms_section_sync','lms_session','lms_attendance_rule','lms_attendance_code','lms_attendance','lms_grade_item','lms_grade_score','lms_grade_final','lms_grade_history','lms_sis_sync_run'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_section_sync_id_seq, lms_grade_history_id_seq, lms_sis_sync_run_run_id_seq to didisam_tenant;
end $$;

commit;
