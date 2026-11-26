-- 디디쌤 콘텐츠 마켓 v1.1(크레딧형 패스 + CP 선택 참여) — 서비스 기획서 v1.1 7장. Java MarketMapper.xml과 같은 표.
-- 공통: 금액 integer(원) · 부가세 별도, 크레딧 integer, 비율 bp 정수, 정정은 반대 기록, 개인정보 컬럼 없음(학습자는 sid_hash = 기관별 해시).
-- 기관 경계: 마켓 표는 구매 기관 · CP · 산타가 함께 쓰는 교차 표라 기관 역할(didisam_tenant)에는 권한을 주지 않고(santa_plan_log와 같음),
-- 서버 market 모듈만 로그인 계정으로 접근하며 모든 질의에 buyer_tid · owner_tid · cp_tid 조건을 둔다(코어 요청 C1: 교차 RLS 정책 mk_party · mk_listed는 통합 담당 판단).
create table if not exists mk_party (
  tid text primary key references tenants(id) on delete cascade,
  kind text not null default 'buyer' check (kind in ('buyer','seller','cp','santa')),
  cp_name text, biz_no_enc text, payout_bank_enc text,
  pilot boolean not null default false, pilot_by text, pilot_at timestamptz,
  active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists mk_product (
  id text primary key check (id ~ '^mp_[a-z0-9]{12}$'),
  owner_tid text not null references tenants(id) on delete cascade,
  owner_kind text not null default 'cp' check (owner_kind in ('cp','seller','santa')),
  kind text not null default 'course' check (kind in ('course','item','path','book')),
  title text not null, sector text, level text, hours_x10 integer not null default 0, thumb text,
  status text not null default 'draft' check (status in ('draft','submitted','in_review','listed','needs_fix','rejected','reported','suspended')),
  cur_ver integer not null default 1, launched_at date, b2c_ok boolean not null default false,
  src_kind text check (src_kind is null or src_kind in ('self','ai')), clib_ref text,
  review_memo text, created_at timestamptz not null default now()
);
create index if not exists mk_product_owner on mk_product (owner_tid, status);

-- 단가표 이력: 변경마다 새 행, 차감은 effective_from ≤ 차감일 최신 행(소급 없음)
create table if not exists mk_price (
  id bigserial primary key,
  product_id text not null references mk_product(id) on delete cascade,
  list_price integer not null check (list_price > 0),
  credits integer not null check (credits > 0),
  vol_rules jsonb not null default '[]',
  floor_price integer, lic_allowed text[] not null default '{stream}', lic_add_bp jsonb not null default '{}',
  b2c_price_vat integer, effective_from date not null, requested_at timestamptz not null default now(), by_email text
);
create index if not exists mk_price_p on mk_price (product_id, effective_from desc, id desc);

create table if not exists mk_optin (
  id bigserial primary key,
  product_id text not null references mk_product(id) on delete cascade,
  mode text not null check (mode in ('credit','single','single_until')),
  single_months integer, credit_from date, min_until date, withdrawn_at timestamptz, by_email text, at timestamptz not null default now()
);
create index if not exists mk_optin_p on mk_optin (product_id, id desc);

create table if not exists mk_collection (
  id text primary key check (id ~ '^mc_[a-z0-9]{3,24}$'),
  kind text not null default 'basic' check (kind in ('basic','industry','campus','original')),
  title text not null, sector text, cover text, active boolean not null default true, sort integer not null default 0
);
create table if not exists mk_collection_item (
  collection_id text not null references mk_collection(id) on delete cascade,
  product_id text not null references mk_product(id) on delete cascade,
  sort integer not null default 0, primary key (collection_id, product_id)
);

create table if not exists mk_quote (
  id text primary key check (id ~ '^mq_[a-z0-9]{12}$'),
  buyer_tid text not null references tenants(id) on delete cascade,
  kind text not null check (kind in ('credit','single','broker')),
  input jsonb not null default '{}', credits integer not null default 0, bonus_bp integer not null default 0 check (bonus_bp between 0 and 700),
  bonus_credits integer not null default 0, est jsonb not null default '{}', supply_total integer not null, cp_max integer not null,
  santa_bp integer not null check (santa_bp >= 3000),
  status text not null default 'ready' check (status in ('ready','cp_wait','sent','accepted','expired','cancelled')),
  valid_to date not null, by_email text, at timestamptz not null default now()
);
create index if not exists mk_quote_b on mk_quote (buyer_tid, at desc);

create table if not exists mk_contract (
  id text primary key check (id ~ '^mk_[a-z0-9]{12}$'),
  buyer_tid text not null references tenants(id) on delete cascade,
  quote_id text not null references mk_quote(id), kind text not null default 'credit' check (kind in ('credit','single')),
  collections text[] not null default '{}', start date not null, "end" date not null, carry_end date not null,
  supply_total integer not null, bonus_bp integer not null default 0, bundle_platform boolean not null default false,
  status text not null default 'pending_pay' check (status in ('pending_pay','active','carry','ended','cancelled','merged')),
  tax_status text not null default 'none' check (tax_status in ('none','waiting','issued')), tax_inv_no text,
  renew_of text, refund jsonb, by_email text, at timestamptz not null default now(), activated_at timestamptz
);
create unique index if not exists mk_contract_quote on mk_contract (quote_id) where status <> 'cancelled';
create index if not exists mk_contract_b on mk_contract (buyer_tid, status);

create table if not exists mk_credit_wallet (
  id text primary key check (id ~ '^mw_[a-z0-9]{12}$'),
  contract_id text not null references mk_contract(id) on delete cascade,
  lot text not null check (lot in ('paid','bonus','topup')),
  credits integer not null check (credits >= 0), remain integer not null check (remain >= 0 and remain <= credits),
  valid_to date not null, carry_to date not null, src_contract text, at timestamptz not null default now()
);
create index if not exists mk_wallet_c on mk_credit_wallet (contract_id);

create table if not exists mk_credit_use (
  id text primary key check (id ~ '^mu_[a-z0-9]{12}$'),
  contract_id text not null references mk_contract(id) on delete cascade,
  buyer_tid text not null, kind text not null check (kind in ('use','restore','adjust')),
  product_id text not null, cp_tid text not null, sid_hash text not null check (sid_hash ~ '^[0-9a-f]{64}$'), grp text,
  credits integer not null, lots jsonb not null default '[]', price_id bigint, vol_n integer,
  restored boolean not null default false, prog_pct_at_restore integer, restore_of text, reason text,
  settle_ym text, at timestamptz not null default now()
);
create unique index if not exists mk_use_once on mk_credit_use (contract_id, product_id, sid_hash) where kind = 'use' and not restored;
create unique index if not exists mk_restore_once on mk_credit_use (restore_of) where kind = 'restore';
create index if not exists mk_use_c on mk_credit_use (contract_id, at);
create index if not exists mk_use_cp on mk_credit_use (cp_tid, at);

create table if not exists mk_control (
  contract_id text primary key references mk_contract(id) on delete cascade,
  month_cap integer, allow_cols text[], allow_groups text[], pre_from integer,
  alert_bp integer[] not null default '{2000,1000}', alert_to text[], by_email text, at timestamptz not null default now()
);

create table if not exists mk_preapproval (
  id text primary key check (id ~ '^ma_[a-z0-9]{12}$'),
  contract_id text not null references mk_contract(id) on delete cascade,
  product_id text not null, sid_hash text not null, status text not null default 'asked' check (status in ('asked','ok','no','expired')),
  memo text, decided_by text, at timestamptz not null default now(), decided_at timestamptz
);
create unique index if not exists mk_pre_open on mk_preapproval (contract_id, product_id, sid_hash) where status in ('asked','ok');

create table if not exists mk_stmt (
  id text primary key check (id ~ '^ms_[a-z0-9]{12}$'),
  cp_tid text not null references tenants(id) on delete cascade, ym text not null check (ym ~ '^\d{4}-\d{2}$'), quarter text not null,
  used integer not null, restored integer not null, net integer not null, cp_bp integer not null default 6500,
  cp_amount integer not null, adj integer not null default 0, total integer not null,
  rate_kind text not null default 'standard', promo_fee integer not null default 0, promo_carry_in integer not null default 0, promo_carry_out integer not null default 0, pay integer,
  status text not null default 'draft' check (status in ('draft','disputed','final','paid')), lines jsonb not null default '[]',
  close_id text, at timestamptz not null default now()
);
create unique index if not exists mk_stmt_ym on mk_stmt (cp_tid, ym);

create table if not exists mk_close (
  id text primary key check (id ~ '^mz_[a-z0-9]{12}$'),
  quarter text not null, run_by text not null, confirm_by text, checks jsonb not null default '[]', totals jsonb not null default '{}',
  status text not null default 'run' check (status in ('run','confirmed','cancelled')), at timestamptz not null default now(), confirmed_at timestamptz
);
create unique index if not exists mk_close_q on mk_close (quarter) where status <> 'cancelled';

create table if not exists mk_dispute (
  id text primary key check (id ~ '^md_[a-z0-9]{12}$'),
  kind text not null check (kind in ('restore','stmt')), ref text not null, from_tid text not null,
  body text, status text not null default 'open' check (status in ('open','accepted','rejected')), memo text, decided_by text,
  at timestamptz not null default now(), decided_at timestamptz
);

create table if not exists mk_entry (
  id bigserial primary key, at timestamptz not null default now(),
  kind text not null check (kind in ('credit_sale','credit_bonus','platform_bundle','credit_use','credit_restore','cp_use','santa_use','credit_carry','credit_refund','single_sale','cp_single','santa_orig','promo_fee','promo_carry','payout','adj')),
  contract_id text, party_tid text, amount integer not null default 0, credits integer not null default 0, ref text, corrects bigint
);
create index if not exists mk_entry_k on mk_entry (kind, at);

-- dev-addendum M3: CP별 차등 요율(이력, 다음 달 1일 적용 · 소급 없음). 행 없으면 standard 6500
create table if not exists mk_cp_rate (
  id bigserial primary key, cp_tid text not null references tenants(id) on delete cascade,
  rate_kind text not null check (rate_kind in ('standard','exclusive','agency','overseas')),
  cp_bp integer not null check (cp_bp in (6500,6000,5500,5000)), effective_from date not null,
  agree_ref text not null check (length(agree_ref) between 1 and 80), memo text, by_email text, at timestamptz not null default now()
);
create index if not exists mk_cp_rate_t on mk_cp_rate (cp_tid, effective_from desc, id desc);

-- dev-addendum M2: CP 프로모션 진열(한 상품 · 한 슬롯 · 한 달 1행). 수수료는 분기 CP 지급액에서 공제(실제 청구 없음)
create table if not exists mk_promo (
  id text primary key check (id ~ '^mpr_[a-z0-9]{12}$'),
  cp_tid text not null references tenants(id) on delete cascade, product_id text not null references mk_product(id) on delete cascade,
  slot text not null check (slot in ('home_top','shelf_top','new_launch')), ym text not null check (ym ~ '^\d{4}-\d{2}$'), fee integer not null check (fee >= 0),
  status text not null default 'asked' check (status in ('asked','ok','no','cancelled','done')), decided_by text, memo text, stmt_id text, close_id text, at timestamptz not null default now()
);
create unique index if not exists mk_promo_once on mk_promo (product_id, slot, ym) where status in ('asked','ok');
create index if not exists mk_promo_ym on mk_promo (ym, slot, status);

create table if not exists mk_idem (
  tid text not null, key text not null, route text not null, resp jsonb not null, at timestamptz not null default now(),
  primary key (tid, route, key)
);

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'didisam_tenant') then
    revoke all on mk_party, mk_product, mk_price, mk_optin, mk_collection, mk_collection_item, mk_quote, mk_contract, mk_credit_wallet, mk_credit_use,
      mk_control, mk_preapproval, mk_stmt, mk_close, mk_dispute, mk_entry, mk_cp_rate, mk_promo, mk_idem from didisam_tenant;
  end if; end $$;
