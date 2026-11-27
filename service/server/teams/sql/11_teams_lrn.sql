-- v49.1 학습자 Teams 알림(teams.md 1.7 · L-noti-teams) — 학습자 본인 동의 기록. 켠 사람만 행이 있고, 끄면(본인 · 기관) 행을 지운다. RLS FORCE(app.tenant)
create table if not exists conn_teams_lrn (
  tenant_id text not null references tenants(id) on delete cascade,
  sid text not null,
  events jsonb not null default '[]',
  agree_ver text not null,
  consent_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, sid)
);
alter table conn_teams_lrn enable row level security;
alter table conn_teams_lrn force row level security;
drop policy if exists tenant_iso on conn_teams_lrn;
create policy tenant_iso on conn_teams_lrn using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
grant select, insert, update, delete on conn_teams_lrn to didisam_tenant;
