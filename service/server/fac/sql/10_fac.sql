-- v40 시설 · 장비 예약: 예약 · 칸 점유 · 이용권 · 입장 · 대여 · 결제 · 환불 (02 명세 3-2). 설정(시설 · 요금 · 규칙)은 기관 문서(S.fac 게시본)가 원본.
-- 모든 표: tenant_id + RLS tenant_iso + didisam_tenant 권한. 금액 integer(원), 날짜 · 칸 번호는 KST date + smallint.
create table if not exists fac_booking (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^bk_[a-z0-9]{12}$'),
  fac_id text not null, res_id text not null,
  sid text not null, aud text not null check (aud in ('student','staff','public')),
  member_no text,
  day date not null, start_slot smallint not null, slots smallint not null check (slots between 1 and 96),
  start_at timestamptz not null, end_at timestamptz not null, noshow_min smallint,
  status text not null check (status in ('requested','approved','confirmed','checked_in','done','cancelled','no_show','rejected','expired')),
  pay_mode text not null check (pay_mode in ('online','onsite','free','after-approve','pass')),
  amount integer not null default 0 check (amount >= 0),
  pay_status text not null default 'none' check (pay_status in ('none','pending','paid','refunded','partial')),
  pass_id text, group_no text, note text, by_staff text,
  extra jsonb, purge_at timestamptz,
  hold_until timestamptz, cancel_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists fac_bk_day on fac_booking (tenant_id, day, res_id);
create index if not exists fac_bk_sid on fac_booking (tenant_id, sid, day);
create index if not exists fac_bk_st on fac_booking (tenant_id, status, start_at);

create table if not exists fac_slot (
  tenant_id text not null references tenants(id) on delete cascade,
  fac_id text not null, res_id text not null, day date not null, slot smallint not null, seat smallint not null check (seat >= 1),
  booking_id text not null, sid text not null, excl_group text,
  primary key (tenant_id, res_id, day, slot, seat)
);
create unique index if not exists fac_slot_dup on fac_slot (tenant_id, sid, day, slot, excl_group) where excl_group is not null;
create index if not exists fac_slot_bk on fac_slot (tenant_id, booking_id);

create table if not exists fac_pass (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^ps_[a-z0-9]{12}$'),
  sid text not null, product_id text not null, fac_id text not null, aud text not null default 'public',
  kind text not null check (kind in ('count','period','course')),
  total integer not null check (total >= 0), used integer not null default 0 check (used >= 0 and used <= total),
  starts_on date not null, ends_on date not null,
  status text not null check (status in ('pending','active','expired','refunded','paused','cancelled')),
  amount integer not null default 0, pay_id text, cls_id text, by_staff text,
  created_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists fac_pass_sid on fac_pass (tenant_id, sid, status);

create table if not exists fac_checkin (
  id bigserial primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  booking_id text, pass_id text, rental_id text, sid text not null, fac_id text not null, day date not null,
  at timestamptz not null default now(), via text not null check (via in ('qr','front','kiosk')), by_staff text, token_jti text
);
create unique index if not exists fac_ck_pass_day on fac_checkin (tenant_id, sid, fac_id, day) where pass_id is not null;
create unique index if not exists fac_ck_jti on fac_checkin (tenant_id, token_jti) where token_jti is not null;
create unique index if not exists fac_ck_bk on fac_checkin (tenant_id, booking_id) where booking_id is not null;

create table if not exists fac_rental (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^rt_[a-z0-9]{12}$'),
  sid text not null, aud text not null default 'public', fac_id text not null, res_id text not null, product_id text not null,
  from_day date not null, due_day date not null, returned_at timestamptz,
  amount integer not null default 0, deposit integer not null default 0, deposit_status text not null default 'held' check (deposit_status in ('none','held','returned','forfeited')),
  late_fee integer not null default 0, condition_note text,
  status text not null check (status in ('requested','approved','lent','returned','overdue','cancelled')),
  pay_mode text not null default 'free', pay_status text not null default 'none',
  created_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create unique index if not exists fac_rt_one on fac_rental (tenant_id, res_id) where status in ('approved','lent','overdue');
create index if not exists fac_rt_sid on fac_rental (tenant_id, sid, status);

create table if not exists fac_payment (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^fp_[a-z0-9]{12}$'),
  booking_id text, pass_id text, rental_id text,
  method text not null check (method in ('toss','card_onsite','cash','bank','free')),
  amount integer not null check (amount >= 0), list_amount integer not null default 0,
  toss_key text, toss_order_id text, receipt_no text, note text, recorded_by text,
  at timestamptz not null default now(),
  status text not null check (status in ('ready','paid','cancelled')),
  primary key (tenant_id, id),
  check (num_nonnulls(booking_id, pass_id, rental_id) = 1)
);
create unique index if not exists fac_pay_order on fac_payment (tenant_id, toss_order_id) where toss_order_id is not null;
create index if not exists fac_pay_bk on fac_payment (tenant_id, booking_id);

create table if not exists fac_refund (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^fr_[a-z0-9]{12}$'),
  payment_id text not null, target text not null, rule_type text not null,
  calc jsonb not null default '[]', auto_amount integer not null check (auto_amount >= 0), amount integer not null check (amount >= 0),
  edit_reason text, by_staff text, at timestamptz not null default now(), toss_cancel_key text,
  status text not null check (status in ('pending','done','cancelled')),
  primary key (tenant_id, id),
  check (amount = auto_amount or (edit_reason is not null and length(edit_reason) > 0))
);
create unique index if not exists fac_rf_open on fac_refund (tenant_id, payment_id) where status <> 'cancelled';

do $$ declare t text; begin
  foreach t in array array['fac_booking','fac_slot','fac_pass','fac_checkin','fac_rental','fac_payment','fac_refund'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
end $$;
grant usage, select on sequence fac_checkin_id_seq to didisam_tenant;
