-- v30 학사 LMS 묶음 I — 동영상 · 진도(SFR-010 · 015 · 028 · 033 · 048 · 063 · 073)
-- 콘텐츠(차시에 붙는 영상) — 원본 파일 · 트랜스코딩은 CDN · 트랜스코더 연동 후 동작(src는 저장소 키 또는 URL)
create table if not exists lms_content (
  tenant_id    text not null references tenants(id) on delete cascade,
  content_id   uuid not null default gen_random_uuid(),
  session_id   uuid not null,
  title        text not null,
  duration_sec int not null check (duration_sec between 1 and 36000),
  src          text,
  qualities    jsonb not null default '["auto","360p","720p","1080p"]',
  check_at_sec int,                                  -- 진도 체크 지점(이 지점 전 배속 · 건너뛰기를 비정상 행동으로 본다)
  created_at   timestamptz not null default now(),
  primary key (tenant_id, content_id),
  foreign key (tenant_id, session_id) references lms_session (tenant_id, session_id) on delete cascade
);
create index if not exists lms_content_s on lms_content (tenant_id, session_id);

-- 진도: 실제 본 구간(겹침 병합)으로 학습시간 산정 — 건너뛴 구간은 인정하지 않는다
create table if not exists lms_progress (
  tenant_id    text not null,
  content_id   uuid not null,
  person_id    uuid not null,
  segments     jsonb not null default '[]',         -- [[시작초, 끝초], ...] 병합됨
  watched_sec  int not null default 0,
  last_pos     int not null default 0,
  pct          smallint not null default 0,
  first_at     timestamptz not null default now(),
  completed_at timestamptz,                         -- 진도율 기준 도달 시각(주차 기간 판정)
  updated_at   timestamptz not null default now(),
  primary key (tenant_id, content_id, person_id),
  foreign key (tenant_id, content_id) references lms_content (tenant_id, content_id) on delete cascade
);

-- 재생 세션(하트비트) — 동시 재생 차단 · 재생 이력(디바이스 · IP 끝자리 가림 · 시작/종료 · 시청시간)
create table if not exists lms_play (
  tenant_id    text not null,
  play_id      uuid not null default gen_random_uuid(),
  content_id   uuid not null,
  person_id    uuid not null,
  device       text, ip_masked text,
  started_at   timestamptz not null default now(),
  last_beat_at timestamptz not null default now(),
  last_pos     int not null default 0,
  rate_x100    smallint not null default 100,
  watched_sec  int not null default 0,
  ended_at     timestamptz,
  primary key (tenant_id, play_id)
);
create index if not exists lms_play_p on lms_play (tenant_id, person_id, ended_at);
create index if not exists lms_play_c on lms_play (tenant_id, content_id);

-- 재생 로그(시작 · 박동 · 이동 · 배속 · 종료 · 차단 · 퀴즈)
create table if not exists lms_play_event (
  tenant_id  text not null,
  id         bigserial,
  play_id    uuid,
  content_id uuid not null,
  person_id  uuid not null,
  kind       text not null check (kind in ('start','beat','seek','rate','end','blocked','quiz')),
  pos        int, from_pos int, rate_x100 smallint,
  at         timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_pe_c on lms_play_event (tenant_id, content_id, person_id);

-- 자막(VTT · SRT 파싱 결과 큐) — AI 자동자막은 STT 엔진 연동 후 동작
create table if not exists lms_subtitle (
  tenant_id  text not null,
  content_id uuid not null,
  lang       text not null,
  format     text not null check (format in ('vtt','srt')),
  cues       jsonb not null default '[]',           -- [{s, e, t}] 초 단위(소수 3자리)
  updated_at timestamptz not null default now(),
  primary key (tenant_id, content_id, lang),
  foreign key (tenant_id, content_id) references lms_content (tenant_id, content_id) on delete cascade
);

-- 영상 중간 퀴즈 → 성적 반영(분반 성적 항목 「영상 퀴즈」)
create table if not exists lms_video_quiz (
  tenant_id  text not null,
  quiz_id    uuid not null default gen_random_uuid(),
  content_id uuid not null,
  at_sec     int not null,
  question   text not null,
  options    jsonb not null,
  answer     smallint not null,
  points     smallint not null default 1,
  primary key (tenant_id, quiz_id),
  foreign key (tenant_id, content_id) references lms_content (tenant_id, content_id) on delete cascade
);
create table if not exists lms_video_quiz_answer (
  tenant_id text not null,
  quiz_id   uuid not null,
  person_id uuid not null,
  choice    smallint not null,
  correct   boolean not null,
  at        timestamptz not null default now(),
  primary key (tenant_id, quiz_id, person_id),
  foreign key (tenant_id, quiz_id) references lms_video_quiz (tenant_id, quiz_id) on delete cascade
);

-- 강좌 내 행동 기록(게시물 열람 · 자료 내려받기 · 과제 제출 등 화면 동작)
create table if not exists lms_activity (
  tenant_id  text not null,
  id         bigserial,
  section_id uuid not null,
  person_id  uuid not null,
  kind       text not null,
  ref        text,
  device     text, ip_masked text,
  at         timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_act_sp on lms_activity (tenant_id, section_id, person_id);

do $$ declare t text; begin
  foreach t in array array['lms_content','lms_progress','lms_play','lms_play_event','lms_subtitle','lms_video_quiz','lms_video_quiz_answer','lms_activity'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_play_event_id_seq, lms_activity_id_seq to didisam_tenant;
end $$;
