-- v30 학사 LMS 묶음 G — 출결(SFR-010 · 016 · 031 · 033 · 048 · 068 · 088)
-- 00_base의 lms_session · lms_attendance · lms_attendance_rule · lms_attendance_code를 그대로 쓰고 필요한 열 · 표만 더한다.

-- 시각 문자열(UTC ISO, 밀리초) — Node · Java가 같은 JSON을 내도록 시각은 SQL에서 문자열로 만든다
create or replace function lms_ts(t timestamptz) returns text language sql immutable as
$$ select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

-- 차시: 강의실(NFC · BLE 대조), 보강 원본, 휴강 사유
alter table lms_session add column if not exists room text;
alter table lms_session add column if not exists makeup_of uuid;
alter table lms_session add column if not exists note text;
alter table lms_session add column if not exists extra_study_sec int not null default 0; -- 지정 학습시간(SFR-015, 묶음 I 학습분량 점검)

-- 출석 규칙: 하이플렉스 조건(오프라인 차시도 온라인 진도 기준 충족 시 출석 인정)
alter table lms_attendance_rule add column if not exists hyflex_online boolean not null default true;

-- 인증번호 · QR: 회전 QR 비밀(짧은 수명), 회전 주기
alter table lms_attendance_code add column if not exists qr_secret text;
alter table lms_attendance_code add column if not exists rotate_sec smallint not null default 15;
alter table lms_attendance_code add column if not exists issued_at timestamptz not null default now();

-- 출석 방식에 qr · nfc · ble · photo 추가
alter table lms_attendance drop constraint if exists lms_attendance_method_check;
alter table lms_attendance add constraint lms_attendance_method_check check (method in ('code','qr','nfc','ble','photo','bio','otp','sms','email','kakao','online','live','manual','sis','copy','adjust'));

-- NFC 태그 · BLE 비콘 → 강의실 매핑(장비 연동은 학교 비콘 장비 연동 후 동작)
create table if not exists lms_att_beacon (
  tenant_id  text not null references tenants(id) on delete cascade,
  beacon_id  text not null,
  kind       text not null check (kind in ('nfc','ble')),
  room       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, beacon_id)
);

-- 출결 변경 이력(장애 조정 · 공결 · 수동 변경)
create table if not exists lms_attendance_log (
  tenant_id  text not null,
  id         bigserial,
  session_id uuid not null,
  person_id  uuid not null,
  before     text, after text not null,
  reason     text, actor text,
  at         timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_attlog_s on lms_attendance_log (tenant_id, session_id);

do $$ declare t text; begin
  foreach t in array array['lms_att_beacon','lms_attendance_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_attendance_log_id_seq to didisam_tenant;
end $$;
