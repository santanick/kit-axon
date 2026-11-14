-- v42 학습 마일리지 · 보상 표(docs/mileage/04-data-api.md 2절). 모든 표: tenant_id + RLS tenant_iso + didisam_tenant 권한. 개인정보 컬럼 없음(sid만).
-- 포인트는 integer. 원장(mil_entry)은 insert와 status · posted_at 변경만 허용(삭제 권한 없음) — 정정은 반대 줄.
-- 계약과 다른 점(보고서 「계약 변경 요청」): 정책 켜짐 칸 이름 is_on(on은 예약어), mil_wallet 기본키에 scope_unit 추가, mil_entry.trigger 칸 추가, mil_policy.grant_cfg 추가.
create table if not exists mil_policy (
  tenant_id text primary key references tenants(id) on delete cascade,
  is_on boolean not null default false,                        -- D2 제도 기본 끔
  ver integer not null default 0, unit_name text not null default 'P', template text,
  expiry jsonb not null default '{"mode":"months","months":12}',
  notice jsonb not null default '{"monthsBefore":6,"daysBefore":[30,3]}',
  budget jsonb not null default '{}',                           -- {monthP, termP}
  daily_cap_total integer,
  league jsonb not null default '{"on":false,"size":10,"reset":"week"}',
  streak jsonb not null default '{"minMin":10,"freezePerWeek":1,"milestones":[7,30,100],"repair":{"withinH":48,"factor":2,"perMonth":1},"breakNotice":false}',
  scope jsonb not null default '{"mode":"unit","sameBizUnits":[],"hqPool":false}',
  tiers jsonb not null default '[]', tier_window text not null default 'm12' check (tier_window in ('m12','term','year')),
  cash_lock jsonb not null default '{"needTrust":"B","achievementOnly":true}',
  sunset jsonb, rank jsonb not null default '{"on":false}', penalty jsonb not null default '{"on":false}',
  grant_cfg jsonb not null default '{"approveOver":1000}',     -- {approveOver, staffMonthCap}
  recommended jsonb, draft_hash text,
  updated_by text, updated_at timestamptz not null default now()
);

create table if not exists mil_policy_log (
  id bigserial primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  ver integer, area text not null check (area in ('policy','rule','reward','rank_penalty','funded','onoff','sunset')),
  before jsonb, after jsonb, reason text, by_staff text, at timestamptz not null default now()
);
create index if not exists mil_plog_t on mil_policy_log (tenant_id, id);

create table if not exists mil_funded (
  tenant_id text not null references tenants(id) on delete cascade,
  cls_id text not null, funded boolean not null, source text not null default 'etc' check (source in ('naeil','moel','etc','profile')),
  set_by text, at timestamptz not null default now(),
  primary key (tenant_id, cls_id)
);

create table if not exists mil_rule (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^mru_[a-z0-9_]{1,30}$'), ver integer not null default 1,
  trigger text not null check (trigger in ('signup','first_login','attend_day','streak','lesson_done','course_done','exam_score','assign_submit','survey_done','noncredit_done','review_ok','referral_ok','tube_goal','evidence','manual','penalty')),
  nature text not null check (nature in ('achievement','participation')), label text not null default '',
  cond jsonb not null default '{}', score jsonb not null default '{"mode":"fixed","v":0}',
  caps jsonb not null default '{}', once text not null default 'per_src' check (once in ('none','ever','per_src','per_day')),
  group_key text, trust_min text not null default 'C' check (trust_min in ('A','B','C')),
  approval text not null default 'auto' check (approval in ('auto','manual','over','evidence','two_step')), approve_over integer,
  expiry jsonb, record jsonb, starts_on date, ends_on date, active boolean not null default true,
  created_by text, at timestamptz not null default now(),
  primary key (tenant_id, id, ver)
);

create table if not exists mil_group (
  tenant_id text not null references tenants(id) on delete cascade,
  key text not null, label text not null default '', caps jsonb not null default '{}',
  primary key (tenant_id, key)
);

create table if not exists mil_event (
  id bigserial primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  sid text not null, trigger text not null, src_type text not null, src_id text not null,
  value numeric, trust text not null check (trust in ('A','B','C')), cls_id text, scope_unit text not null default 'lu_root',
  occurred_at timestamptz not null, received_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','done','skipped','held')), result jsonb
);
create unique index if not exists mil_ev_uq on mil_event (tenant_id, trigger, src_type, src_id, sid);
create index if not exists mil_ev_sid on mil_event (tenant_id, sid, trigger, occurred_at);

create table if not exists mil_entry (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^me_[a-z0-9]{12}$'), sid text not null, scope_unit text not null default 'lu_root',
  kind text not null check (kind in ('earn','use','hold','release','expire','cancel','adjust','restore','penalty')),
  points integer not null, status text not null default 'posted' check (status in ('pending','posted','void')),
  nature text not null default 'achievement' check (nature in ('achievement','participation')),
  trust text not null default 'B' check (trust in ('A','B','C')), convertible boolean not null default false,
  funded boolean not null default false, cls_id text, trigger text,
  rule_id text, rule_ver integer, event_id bigint, redeem_id text, ref_entry text,
  expires_at timestamptz, reason text, by_staff text, idem_key text,
  at timestamptz not null default now(), posted_at timestamptz,
  primary key (tenant_id, id),
  constraint mil_funded_cash check (not funded or convertible = false),           -- D1 국비 차단(제품 고정)
  constraint mil_sign check ((kind in ('earn','release','restore') and points > 0) or (kind in ('use','hold','expire','cancel','penalty') and points < 0) or (kind = 'adjust' and points <> 0))
);
create unique index if not exists mil_en_idem on mil_entry (tenant_id, idem_key) where idem_key is not null;
create index if not exists mil_en_sid on mil_entry (tenant_id, sid, scope_unit, status);
create index if not exists mil_en_exp on mil_entry (tenant_id, expires_at) where expires_at is not null;

create table if not exists mil_lotuse (
  id bigserial primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  entry_id text not null, lot_id text not null, points integer not null      -- +소진, −되돌림(release)
);
create index if not exists mil_lu_lot on mil_lotuse (tenant_id, lot_id);
create index if not exists mil_lu_en on mil_lotuse (tenant_id, entry_id);

create table if not exists mil_wallet (
  tenant_id text not null references tenants(id) on delete cascade,
  sid text not null, scope_unit text not null default 'lu_root',
  balance integer not null default 0, pending integer not null default 0, convertible integer not null default 0,
  earned_window integer not null default 0, tier text, streak jsonb not null default '{}', next_expire jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (tenant_id, sid, scope_unit)
);

create table if not exists mil_reward (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^mrw_[a-z0-9_]{1,30}$'),
  kind text not null check (kind in ('tuition','coupon','goods','badge','cert','scholar','shop')), title text not null,
  cost jsonb not null default '{"wonPerP":1}', min_use integer not null default 0, max_use jsonb not null default '{}', step integer not null default 1,
  threshold integer not null default 0, stock integer, per_sid jsonb not null default '{}',
  approval text not null default 'manual' check (approval in ('auto','manual','two_step')), cash boolean not null default true,
  audience jsonb not null default '{}', active boolean not null default true, link jsonb not null default '{}',
  at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists mil_redeem (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^mrd_[a-z0-9]{12}$'), sid text not null, scope_unit text not null default 'lu_root',
  reward_id text not null, points integer not null check (points > 0), won integer not null default 0,
  status text not null check (status in ('requested','approved','fulfilled','rejected','cancelled','reclaimed')),
  hold_entry text, use_entry text, fulfil jsonb not null default '{}',
  decided_by text, decided_at timestamptz, reason text, idem_key text, at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create unique index if not exists mil_rd_idem on mil_redeem (tenant_id, idem_key) where idem_key is not null;
create index if not exists mil_rd_sid on mil_redeem (tenant_id, sid, at);
create unique index if not exists mil_rd_coupon on mil_redeem (tenant_id, (fulfil->>'couponCode')) where fulfil ? 'couponCode';

create table if not exists mil_proof (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^mpf_[a-z0-9]{12}$'), sid text not null, rule_id text not null, item text not null default '',
  activity_on date, file_ref text, ai jsonb, status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  points integer, reason text, decided_by text, at timestamptz not null default now(), purge_at timestamptz,
  primary key (tenant_id, id)
);

create table if not exists mil_flag (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^mfl_[a-z0-9]{12}$'), sid text not null,
  kind text not null check (kind in ('velocity','cap_streak','device','referral','retake','progress_jump','staff_grant','self_grant')),
  evidence jsonb not null default '{}', held_entries text[] not null default '{}',
  status text not null default 'open' check (status in ('open','cleared','confirmed')), resolved_by text, at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists mil_notice (
  tenant_id text not null references tenants(id) on delete cascade,
  sid text not null, scope_unit text not null default 'lu_root',
  kind text not null check (kind in ('expire_month','expire_d30','expire_d3','sunset','redeem','hold','streak_break')),
  ym text not null, points integer not null default 0, due_at timestamptz, sent_at timestamptz not null default now(), read_at timestamptz,
  primary key (tenant_id, sid, scope_unit, kind, ym)
);

do $$ declare t text; begin
  foreach t in array array['mil_policy','mil_policy_log','mil_funded','mil_rule','mil_group','mil_event','mil_entry','mil_lotuse','mil_wallet','mil_reward','mil_redeem','mil_proof','mil_flag','mil_notice'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    if t in ('mil_entry','mil_lotuse','mil_policy_log') then
      execute format('revoke all on %I from didisam_tenant', t);
      execute format('grant select, insert on %I to didisam_tenant', t);
    else
      execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
    end if;
  end loop;
end $$;
grant update (status, posted_at, expires_at) on mil_entry to didisam_tenant;   -- 원장 불변: 상태 · 확정 시각(확정 때 만료일 기록)만
grant usage, select on sequence mil_event_id_seq, mil_lotuse_id_seq, mil_policy_log_id_seq to didisam_tenant;
