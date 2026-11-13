-- v41.0 통합 수납 원장(09 개발 규격 2절). 모든 표: tenant_id + RLS tenant_iso + didisam_tenant 권한. 개인정보 컬럼 없음(sid = 학습자 내부 ID · 대학은 학번).
-- 금액 integer(원). 수납 정정은 삭제 대신 반대 기록(corrects), 시설(v40) 결제 · 환불은 트리거로 같은 트랜잭션에서 한 줄 추가(legacy_ref 유일).
create table if not exists led_unit (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^lu_[a-z0-9]{4,24}$'),
  parent_id text, kind text not null check (kind in ('hq','branch','dept','facility')),
  name text not null, toss_mid text, toss_client_key text, toss_secret_enc text,
  share_rate_bp integer not null default 40 check (share_rate_bp between 0 and 10000),
  active boolean not null default true, sort integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists led_charge (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^lc_[a-z0-9]{12}$'),
  bill_id text not null, unit_id text not null, sid text not null,
  item_type text not null check (item_type in ('tuition','book','facility','pass','rental','program','event','etc')),
  title text not null, amount integer not null, period_ym text, due_date date,
  src_type text, src_id text, idem_key text,
  status text not null default 'open' check (status in ('open','partial','paid','void')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists led_ch_sid on led_charge (tenant_id, sid, status);
create index if not exists led_ch_bill on led_charge (tenant_id, bill_id);
create index if not exists led_ch_day on led_charge (tenant_id, created_at);
create unique index if not exists led_ch_src on led_charge (tenant_id, src_type, src_id, sid, period_ym) where src_type is not null and period_ym is not null and status <> 'void' and amount > 0;
create unique index if not exists led_ch_idem on led_charge (tenant_id, idem_key) where idem_key is not null;

create table if not exists led_receipt (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^lp_[a-z0-9]{12}$'),
  unit_id text not null, sid text,
  method text not null check (method in ('online_card','online_transfer','desk_card','cash','transfer','vbank_ext','voucher')),
  channel text not null check (channel in ('toss','desk','import','manual')),
  amount integer not null, paid_at timestamptz,
  status text not null check (status in ('ready','paid','failed','cancelled')),
  toss_payment_key text, toss_order_id text, approval_no text, card_issuer text, installment smallint, terminal_id text,
  share_eligible boolean not null default false,
  recorded_by text, diff_reason text, idem_key text, close_id text, legacy_ref text,
  charge_ids text[], link_hash text, corrects text,
  created_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create unique index if not exists led_rc_order on led_receipt (tenant_id, toss_order_id) where toss_order_id is not null;
create unique index if not exists led_rc_idem on led_receipt (tenant_id, idem_key) where idem_key is not null;
create unique index if not exists led_rc_legacy on led_receipt (tenant_id, legacy_ref) where legacy_ref is not null;
create unique index if not exists led_rc_corr on led_receipt (tenant_id, corrects) where corrects is not null;
create index if not exists led_rc_day on led_receipt (tenant_id, paid_at);
create index if not exists led_rc_sid on led_receipt (tenant_id, sid);

create table if not exists led_alloc (
  id bigserial primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  receipt_id text not null, charge_id text not null, amount integer not null
);
create index if not exists led_al_ch on led_alloc (tenant_id, charge_id);
create index if not exists led_al_rc on led_alloc (tenant_id, receipt_id);

create table if not exists led_refund (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^lr_[a-z0-9]{12}$'),
  receipt_id text not null, amount integer not null check (amount >= 0), rule_type text not null,
  calc jsonb not null default '[]', auto_amount integer not null check (auto_amount >= 0), edit_reason text, reason text,
  status text not null check (status in ('pending','done','cancelled')),
  toss_cancel_ok boolean, toss_cancel_key text, by_staff text, idem_key text, legacy_ref text,
  at timestamptz not null default now(), done_at timestamptz,
  primary key (tenant_id, id)
);
create unique index if not exists led_rf_open on led_refund (tenant_id, receipt_id) where status = 'pending';
create unique index if not exists led_rf_idem on led_refund (tenant_id, idem_key) where idem_key is not null;
create unique index if not exists led_rf_legacy on led_refund (tenant_id, legacy_ref) where legacy_ref is not null;

create table if not exists led_close (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^lk_[a-z0-9]{12}$'),
  unit_id text not null, day date not null,
  cash_system integer not null, cash_counted integer not null, card_system integer not null, card_counted integer not null,
  diff_reason text, closed_by text, closed_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create unique index if not exists led_close_day on led_close (tenant_id, unit_id, day);

create table if not exists led_link (
  tenant_id text not null references tenants(id) on delete cascade,
  token_hash text not null, charge_ids text[] not null, sid text not null,
  expires_at timestamptz not null, used_at timestamptz, created_by text, created_at timestamptz not null default now(),
  primary key (tenant_id, token_hash)
);

create table if not exists led_import (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^li_[a-z0-9]{12}$'),
  kind text not null check (kind in ('vbank','van','toss_settle')),
  file_name text, rows integer not null default 0, matched integer not null default 0, unmatched jsonb not null default '[]', meta jsonb not null default '{}',
  by_staff text, at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists led_device (
  tenant_id text not null references tenants(id) on delete cascade,
  id text not null check (id ~ '^ld_[a-z0-9]{12}$'),
  unit_id text not null, label text not null, agent_key_hash text not null, last_seen timestamptz,
  mode text not null check (mode in ('mock','ksnet','nice')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create unique index if not exists led_dev_key on led_device (agent_key_hash);

do $$ declare t text; begin
  foreach t in array array['led_unit','led_charge','led_receipt','led_alloc','led_refund','led_close','led_link','led_import','led_device'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
end $$;
grant usage, select on sequence led_alloc_id_seq to didisam_tenant;

-- 시설(v40) 이중 기록: fac_payment가 paid가 되거나 fac_refund가 done이 되면 같은 트랜잭션에서 원장에 한 줄(legacy_ref 유일 → 재실행 · 재갱신 안전).
-- Node · Java 서버 모두 같은 DB를 쓰므로 트리거 하나로 두 서버가 같은 결과를 낸다. 루트 단위 'lu_root'는 없으면 만든다.
create or replace function led_fac_pay() returns trigger language plpgsql as $f$
declare s text; begin
  if new.status <> 'paid' or new.amount <= 0 then return new; end if;
  insert into led_unit (tenant_id, id, kind, name) values (new.tenant_id, 'lu_root', 'hq', '기관 전체') on conflict do nothing;
  select coalesce(b.sid, ps.sid, r.sid) into s from (select 1) x
    left join fac_booking b on b.tenant_id = new.tenant_id and b.id = new.booking_id
    left join fac_pass ps on ps.tenant_id = new.tenant_id and ps.id = new.pass_id
    left join fac_rental r on r.tenant_id = new.tenant_id and r.id = new.rental_id;
  insert into led_receipt (tenant_id, id, unit_id, sid, method, channel, amount, paid_at, status, toss_payment_key, share_eligible, recorded_by, legacy_ref)
  values (new.tenant_id, 'lp_' || substr(md5(new.tenant_id || '|' || new.id), 1, 12), 'lu_root', s,
    case new.method when 'toss' then 'online_card' when 'card_onsite' then 'desk_card' when 'cash' then 'cash' else 'transfer' end,
    case when new.method = 'toss' then 'toss' else 'desk' end, new.amount, new.at, 'paid', new.toss_key, new.method = 'toss', new.recorded_by, 'fac_payment:' || new.id)
  on conflict do nothing;
  return new;
end $f$;
drop trigger if exists led_fac_pay on fac_payment;
create trigger led_fac_pay after insert or update of status on fac_payment for each row execute function led_fac_pay();

create or replace function led_fac_refund() returns trigger language plpgsql as $f$
declare rc text; begin
  if new.status <> 'done' or new.amount <= 0 then return new; end if;
  select id into rc from led_receipt where tenant_id = new.tenant_id and legacy_ref = 'fac_payment:' || new.payment_id;
  if rc is null then return new; end if;
  insert into led_refund (tenant_id, id, receipt_id, amount, rule_type, calc, auto_amount, edit_reason, status, toss_cancel_ok, toss_cancel_key, by_staff, legacy_ref, at, done_at)
  values (new.tenant_id, 'lr_' || substr(md5(new.tenant_id || '|' || new.id), 1, 12), rc, new.amount, 'facility', new.calc, new.auto_amount, new.edit_reason, 'done',
    new.toss_cancel_key is not null, new.toss_cancel_key, new.by_staff, 'fac_refund:' || new.id, new.at, now())
  on conflict do nothing;
  return new;
end $f$;
drop trigger if exists led_fac_refund on fac_refund;
create trigger led_fac_refund after insert or update of status on fac_refund for each row execute function led_fac_refund();
