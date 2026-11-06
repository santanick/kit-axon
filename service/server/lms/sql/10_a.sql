-- v30 묶음 A: 분반 ↔ 스튜디오 강의실 연결 · 조교 신청 상태 · 단과대학 관리 범위 · 교수 계정 연결 · ISO 시각 함수 (SFR-018 · 019 · 025 · 052)
alter table lms_section add column if not exists class_id text check (class_id is null or class_id ~ '^[A-Za-z0-9_-]{1,40}$');
alter table lms_section_staff add column if not exists status text not null default 'active' check (status in ('active','pending'));
alter table lms_section_staff add column if not exists requested_at timestamptz not null default now();
alter table lms_enrollment add column if not exists decided_at timestamptz;
create index if not exists lms_ss_src on lms_section_sync (tenant_id, src_section, id desc);
create table if not exists lms_user_link (
  tenant_id text not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  units text[] not null default '{}',
  member_no text check (member_no is null or member_no ~ '^[A-Za-z0-9]{4,20}$'),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
alter table lms_user_link enable row level security;
alter table lms_user_link force row level security;
drop policy if exists tenant_iso on lms_user_link;
create policy tenant_iso on lms_user_link using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
grant select, insert, update, delete on lms_user_link to didisam_tenant;
create or replace function lms_ts(t timestamptz) returns text language sql immutable as $f$ select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $f$;
grant execute on function lms_ts(timestamptz) to didisam_tenant;
