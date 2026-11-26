-- 통합 센터(기관 묶음) 표 — F/grp/spec.md 2-2절 + 통합 담당 판정(복수 소속 · 해제 후 365일 보관 · 개별 열람 시범 플래그).
-- 기관 표(tenant_state · learner_accounts · lms_* · led_*)에는 손대지 않는다. grp_lkey만 기관 범위 표(tenant_iso).
create table if not exists grp_group (
  id text primary key check (id ~ '^gp_[a-z0-9]{12}$'),
  owner_tid text not null unique references tenants(id) on delete cascade,
  kind text not null check (kind in ('franchise','univ','region')),
  name text not null check (length(name) between 1 and 40),
  pilot boolean not null default false,
  detail boolean not null default false,
  status text not null default 'active' check (status in ('active','closed')),
  salt text not null,
  targets jsonb not null default '{}',
  created_by text, created_at timestamptz not null default now()
);
create table if not exists grp_link (
  id text primary key check (id ~ '^gl_[a-z0-9]{12}$'),
  group_id text not null references grp_group(id) on delete cascade,
  owner_tid text not null,
  child_tid text references tenants(id) on delete cascade,
  label text not null check (length(label) between 1 and 40),
  unit text not null,
  status text not null check (status in ('invited','active','declined','expired','left','removed')),
  code_hash text, invite_to text, expires_at timestamptz,
  ask jsonb not null default '{}', share jsonb, agree_ver text,
  invited_by text, invited_at timestamptz not null default now(),
  accepted_by text, accepted_at timestamptz,
  ended_by text, ended_at timestamptz, end_reason text
);
-- 판정 ①: 한 기관이 여러 묶음에 소속 가능. 같은 묶음 안에서만 초대 · 연결 1건
create unique index if not exists grp_link_one on grp_link (group_id, child_tid) where status in ('invited','active') and child_tid is not null;
create unique index if not exists grp_link_code on grp_link (code_hash) where code_hash is not null;
create index if not exists grp_link_child on grp_link (child_tid, status);
create table if not exists grp_staff (
  group_id text not null references grp_group(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('grp_admin','grp_viewer','grp_content','grp_learner')),
  by text, at timestamptz not null default now(),
  primary key (group_id, user_id, role)
);
create table if not exists grp_kpi_day (
  group_id text not null references grp_group(id) on delete cascade, child_tid text not null,
  day date not null, v jsonb not null, src text not null default 'grp-kpi-1', at timestamptz not null default now(),
  primary key (group_id, child_tid, day)
);
create table if not exists grp_kpi_month (
  group_id text not null references grp_group(id) on delete cascade, child_tid text not null,
  ym text not null check (ym ~ '^\d{4}-\d{2}$'), v jsonb not null, src text not null default 'grp-kpi-1', at timestamptz not null default now(),
  primary key (group_id, child_tid, ym)
);
create table if not exists grp_lx (
  group_id text not null references grp_group(id) on delete cascade,
  gkey text not null check (gkey ~ '^[0-9a-f]{32}$'), child_tid text not null,
  dept text check (dept is null or length(dept) <= 40), enr integer not null default 0, cmp integer not null default 0, last_ym text,
  at timestamptz not null default now(),
  primary key (group_id, gkey, child_tid)
);
create table if not exists grp_lkey (
  tenant_id text not null references tenants(id) on delete cascade, learner_id text not null,
  group_id text not null, gkey text not null,
  primary key (tenant_id, learner_id, group_id)
);
create table if not exists grp_share (
  id text primary key check (id ~ '^gs_[a-z0-9]{12}$'),
  group_id text not null references grp_group(id) on delete cascade,
  dir text not null check (dir in ('down','up')), from_tid text not null,
  kind text not null check (kind in ('course','page','notice')),
  title text not null, ver integer not null default 1,
  snap jsonb not null, lic jsonb not null default '{"origin":"own","mk":false}',
  required boolean not null default false, targets jsonb not null default '"all"',
  status text not null check (status in ('draft','published','recalled','requested','approved','rejected')),
  note text, by text, at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (octet_length(snap::text) <= 2097152)
);
create table if not exists grp_share_ver (
  share_id text not null references grp_share(id) on delete cascade, group_id text not null,
  ver integer not null, snap jsonb not null, note text, at timestamptz not null default now(),
  primary key (share_id, ver)
);
create table if not exists grp_share_tgt (
  share_id text not null references grp_share(id) on delete cascade, group_id text not null,
  child_tid text not null,
  status text not null check (status in ('offered','adopted','declined','recalled')),
  ver integer, local_id text, at timestamptz not null default now(),
  primary key (share_id, child_tid)
);
create table if not exists grp_policy (
  group_id text not null references grp_group(id) on delete cascade,
  key text not null check (key in ('brand','terms','notice','footer','menu','ai')),
  ver integer not null default 1, lock text not null check (lock in ('locked','default')),
  value jsonb not null check (octet_length(value::text) <= 262144), by text, at timestamptz not null default now(),
  primary key (group_id, key)
);
create table if not exists grp_policy_apply (
  group_id text not null references grp_group(id) on delete cascade, child_tid text not null,
  key text not null, ver integer not null,
  state text not null check (state in ('applied','overridden','pending')), at timestamptz not null default now(),
  primary key (group_id, child_tid, key)
);
create table if not exists grp_rule (
  group_id text not null references grp_group(id) on delete cascade, n integer not null,
  kpi text not null, op text not null check (op in ('lt','gt')), value numeric not null,
  period text not null check (period in ('week','month')), label text not null,
  primary key (group_id, n)
);
create table if not exists grp_audit (
  id bigserial primary key, group_id text not null, at timestamptz not null default now(),
  actor text not null, actor_tid text not null, action text not null, child_tid text,
  target text, purpose text, fields text[], ok boolean not null default true, ip_hash text,
  prev_hash text, hash text
);
create index if not exists grp_audit_g on grp_audit (group_id, at desc);
create index if not exists grp_audit_c on grp_audit (child_tid, at desc);
create table if not exists grp_audit_head (group_id text primary key, hash text not null);
create table if not exists grp_idem (
  tid text not null, route text not null, key text not null, resp jsonb not null, at timestamptz not null default now(),
  primary key (tid, route, key)
);
