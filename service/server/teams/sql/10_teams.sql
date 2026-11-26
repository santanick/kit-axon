-- MS Teams 연동 1차(teams.md 1.9) — 기관 ↔ Entra 조직 · 토큰/웹훅 암호문 · 설정 · 회의 기록. 모든 표 RLS FORCE(app.tenant)
create table if not exists conn_ms_org (            -- 기관 ↔ Entra 테넌트(기관당 1, 같은 Entra 조직은 한 기관만)
  tenant_id text primary key references tenants(id) on delete cascade,
  ms_tid uuid not null unique,
  domain text, consent_at timestamptz not null default now(), consent_by text not null,
  sso jsonb not null default '{"operator":false,"learner":false}'
);
create table if not exists conn_secret (             -- 갱신 토큰 · 워크플로 주소(암호문만, AAD = tid|conn|teams|kind|id)
  id text primary key, tenant_id text not null references tenants(id) on delete cascade,
  kind text not null check (kind in ('teams_webhook','teams_refresh')),
  owner_user uuid references users(id) on delete cascade,
  label text not null, mask text not null, meta jsonb not null default '{}',
  enc text not null,
  expires_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists conn_secret_t on conn_secret (tenant_id, kind);
create table if not exists conn_teams_cfg (          -- 기능 켜기 · 회의 기본값 · 시연 연결(비밀값 없음)
  tenant_id text primary key references tenants(id) on delete cascade,
  cfg jsonb not null default '{}', demo boolean not null default false, updated_at timestamptz not null default now()
);
create table if not exists conn_teams_meeting (      -- 만든 온라인 회의(회의 주소는 반 항목 it.url에도 기록)
  id text primary key, tenant_id text not null references tenants(id) on delete cascade,
  class_id text not null default '', item_id text not null default '', account_id text not null default '',
  ms_id text not null default '', join_url text not null, subject text not null,
  start_at timestamptz not null, end_at timestamptz not null, demo boolean not null default false,
  created_by text not null, created_at timestamptz not null default now()
);
create index if not exists conn_teams_meeting_t on conn_teams_meeting (tenant_id, created_at desc);
do $$ declare t text; begin
  foreach t in array array['conn_ms_org','conn_secret','conn_teams_cfg','conn_teams_meeting'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format('create policy tenant_iso on %I using (tenant_id = current_setting(''app.tenant'', true)) with check (tenant_id = current_setting(''app.tenant'', true))', t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
end $$;
-- 제공자 microsoft(운영자 user_oauth · 학습자 learner_accounts.login · pii.identity.provider)
alter table user_oauth drop constraint if exists user_oauth_provider_check;
alter table user_oauth add constraint user_oauth_provider_check check (provider in ('google','kakao','microsoft'));
alter table learner_accounts drop constraint if exists learner_accounts_login_check;
alter table learner_accounts add constraint learner_accounts_login_check check (login in ('email','kakao','naver','google','apple','univ','microsoft'));
alter table pii.identity drop constraint if exists identity_provider_check;
alter table pii.identity add constraint identity_provider_check check (provider in ('email','kakao','naver','google','apple','univ','microsoft'));
