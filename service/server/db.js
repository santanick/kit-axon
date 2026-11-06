'use strict';
/* 데이터 계층 — PostgreSQL 16. 기관 데이터 테이블은 행 수준 보안(RLS)으로 기관(tenant)마다 격리한다.
   요청마다 트랜잭션 안에서 app.tenant를 설정하고(set_config … true = 트랜잭션 한정), 정책이 그 값과 같은 행만 보이게 한다.
   FORCE ROW LEVEL SECURITY라 테이블 소유자도 정책을 따른다(슈퍼유저 · BYPASSRLS 역할만 예외 → 앱 계정에 주지 않는다). */
const { Pool } = require('pg');

function poolFrom(env) {
  const cfg = { connectionString: env.DATABASE_URL, max: Number(env.DB_POOL || 8), idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 };
  if (env.DB_SSL === 'require') cfg.ssl = { rejectUnauthorized: false };
  return new Pool(cfg);
}

const MIGRATIONS = [
  /* 1 — 기본 스키마 */
  `create table if not exists tenants (
     id text primary key check (id ~ '^tn_[a-z0-9]{8,16}$'),
     name text not null check (length(name) between 1 and 60),
     type text not null,
     mode text not null default 'saas',
     created_at timestamptz not null default now()
   );
   create table if not exists users (
     id uuid primary key default gen_random_uuid(),
     tenant_id text not null references tenants(id) on delete cascade,
     email text not null,
     pw text not null,
     role text not null default 'owner' check (role in ('owner','sub','teacher')),
     created_at timestamptz not null default now(),
     last_login timestamptz
   );
   create unique index if not exists users_email_uq on users (lower(email));
   create table if not exists sessions (
     id text primary key,
     user_id uuid not null references users(id) on delete cascade,
     tenant_id text not null references tenants(id) on delete cascade,
     created_at timestamptz not null default now(),
     expires_at timestamptz not null
   );
   create index if not exists sessions_exp on sessions (expires_at);
   create table if not exists tenant_state (
     tenant_id text primary key references tenants(id) on delete cascade,
     doc jsonb not null,
     rev integer not null default 1,
     bytes integer not null default 0,
     updated_at timestamptz not null default now()
   );
   create table if not exists ai_usage (
     tenant_id text not null references tenants(id) on delete cascade,
     day date not null,
     calls integer not null default 0,
     tin bigint not null default 0,
     tout bigint not null default 0,
     primary key (tenant_id, day)
   );
   create table if not exists audit_log (
     id bigserial primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     at timestamptz not null default now(),
     actor text,
     action text not null,
     detail jsonb
   );
   create index if not exists audit_tenant_at on audit_log (tenant_id, at desc);`,
  /* 2 — 기관 데이터 RLS */
  `do $$ declare t text; begin
     foreach t in array array['tenant_state','ai_usage','audit_log'] loop
       execute format('alter table %I enable row level security', t);
       execute format('alter table %I force row level security', t);
       execute format('drop policy if exists tenant_iso on %I', t);
       execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
     end loop; end $$;`,
  /* 3 — 기관 트랜잭션 전용 역할: 로그인 계정이 BYPASSRLS(관리형 DB 기본 사용자 등)여도 RLS가 반드시 적용되게
        요청마다 SET LOCAL ROLE didisam_tenant로 내려간다(NOLOGIN · NOBYPASSRLS · 기관 테이블 권한만). */
  `do $$ begin
     if not exists (select 1 from pg_roles where rolname = 'didisam_tenant') then create role didisam_tenant nologin nobypassrls; end if;
     if not exists (select 1 from pg_auth_members m join pg_roles r on r.oid = m.roleid join pg_roles u on u.oid = m.member where r.rolname = 'didisam_tenant' and u.rolname = current_user and m.set_option) then
       execute format('grant didisam_tenant to %I with set true, inherit false', current_user);
     end if; end $$;
   grant usage on schema public to didisam_tenant;
   grant select, insert, update, delete on tenant_state, ai_usage, audit_log to didisam_tenant;
   grant usage on sequence audit_log_id_seq to didisam_tenant;`,
  /* 4 — 학습자(v10): 학번(번호) + 접근코드 해시 · 학습자 세션 · 학습 활동. 이름 · 연락처는 받지 않는다. */
  `create table if not exists learners (
     tenant_id text not null references tenants(id) on delete cascade,
     sid text not null check (sid ~ '^[A-Za-z0-9_-]{4,20}$'),
     dept text not null default '',
     code_fp text not null,
     code_hash text not null,
     created_at timestamptz not null default now(),
     last_login timestamptz,
     primary key (tenant_id, sid)
   );
   create table if not exists learner_sessions (
     id text primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     sid text not null,
     expires_at timestamptz not null
   );
   create index if not exists lsess_exp on learner_sessions (expires_at);
   create table if not exists learner_progress (
     tenant_id text not null references tenants(id) on delete cascade,
     sid text not null,
     lp jsonb not null,
     bytes integer not null default 0,
     updated_at timestamptz not null default now(),
     primary key (tenant_id, sid)
   );
   do $$ declare t text; begin
     foreach t in array array['learners','learner_progress'] loop
       execute format('alter table %I enable row level security', t);
       execute format('alter table %I force row level security', t);
       execute format('drop policy if exists tenant_iso on %I', t);
       execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
     end loop; end $$;
   grant select, insert, update, delete on learners, learner_progress to didisam_tenant;`,
  /* 5 — 외부 AI 연결(v16 MCP): 기관 API 키. 평문은 저장하지 않고 HMAC 지문만. 인증 표라 세션처럼 RLS 밖에서 코드로 기관을 거른다. */
  `create table if not exists api_keys (
     id text primary key check (id ~ '^k_[a-f0-9]{12}$'),
     tenant_id text not null references tenants(id) on delete cascade,
     name text not null check (length(name) between 1 and 40),
     prefix text not null,
     hash text not null unique,
     scope text not null default 'read' check (scope in ('read','write')),
     created_by text not null default '',
     created_at timestamptz not null default now(),
     last_used timestamptz,
     calls integer not null default 0,
     revoked_at timestamptz
   );
   create index if not exists api_keys_tenant on api_keys (tenant_id);`,
  /* 6 — v23 개인정보 분리(데이터 최소화): 신원(PII)은 pii 스키마에만, 학습 쪽은 가명 learner_id(uuid) + 닉네임만.
        pii 값은 앱에서 AES-256-GCM으로 암호화(키 PII_KEY · DB에 없음), 조회용은 HMAC 블라인드 인덱스.
        역할 분리: didisam_tenant(학습 · 운영 데이터)는 pii 스키마 권한이 없고, didisam_pii는 pii 스키마만 쓴다. */
  `create schema if not exists pii;
   revoke all on schema pii from public;
   create table if not exists learner_accounts (
     tenant_id text not null references tenants(id) on delete cascade,
     learner_id uuid not null default gen_random_uuid(),
     kind text not null default 'learner' check (kind in ('learner','parent')),
     login text not null check (login in ('email','kakao','naver','google','apple','univ')),
     nickname text not null check (length(nickname) between 1 and 20),
     student_no text check (student_no is null or student_no ~ '^[0-9]{6,10}$'),
     dept text not null default '' check (length(dept) <= 40),
     status text not null default 'active' check (status in ('active','guardian_pending','withdrawn')),
     minor boolean not null default false,
     idv_ok boolean not null default false,
     mkt boolean not null default false,
     created_at timestamptz not null default now(),
     withdrawn_at timestamptz,
     primary key (tenant_id, learner_id)
   );
   create unique index if not exists lacc_stuno on learner_accounts (tenant_id, student_no) where student_no is not null;
   alter table learner_accounts enable row level security;
   alter table learner_accounts force row level security;
   drop policy if exists tenant_iso on learner_accounts;
   create policy tenant_iso on learner_accounts using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
   grant select, insert, update, delete on learner_accounts to didisam_tenant;

   create table if not exists pii.identity (
     id uuid primary key default gen_random_uuid(),
     tid text not null references public.tenants(id) on delete cascade,
     learner_id uuid not null,
     provider text not null check (provider in ('email','kakao','naver','google','apple','univ')),
     provider_sub_hash text,
     email_bidx text,
     email_enc text,
     email_mask text,
     phone_enc text,
     name_enc text,
     pw_hash text,
     consent jsonb not null default '{}',
     created_at timestamptz not null default now(),
     deleted_at timestamptz,
     unique (tid, learner_id)
   );
   create unique index if not exists pii_sub_uq on pii.identity (tid, provider, provider_sub_hash) where provider_sub_hash is not null;
   create unique index if not exists pii_email_uq on pii.identity (tid, email_bidx) where email_bidx is not null;
   create table if not exists pii.otp (
     tid text not null references public.tenants(id) on delete cascade,
     bidx text not null,
     purpose text not null check (purpose in ('signup','login','find')),
     code_hash text not null,
     tries integer not null default 0,
     expires_at timestamptz not null,
     primary key (tid, bidx, purpose)
   );
   create table if not exists pii.guardian (
     id uuid primary key default gen_random_uuid(),
     tid text not null references public.tenants(id) on delete cascade,
     learner_id uuid not null,
     contact_enc text not null,
     token_hash text not null unique,
     status text not null default 'pending' check (status in ('pending','ok')),
     created_at timestamptz not null default now(),
     expires_at timestamptz not null,
     confirmed_at timestamptz
   );
   create table if not exists pii.access_log (
     id bigserial primary key,
     tid text not null references public.tenants(id) on delete cascade,
     at timestamptz not null default now(),
     actor text not null,
     action text not null,
     learner_id uuid,
     purpose text,
     fields text[] not null default '{}'
   );
   create index if not exists pii_log_tid_at on pii.access_log (tid, at desc);
   do $$ declare t text; begin
     if not exists (select 1 from pg_roles where rolname = 'didisam_pii') then create role didisam_pii nologin nobypassrls; end if;
     if not exists (select 1 from pg_auth_members m join pg_roles r on r.oid = m.roleid join pg_roles u on u.oid = m.member where r.rolname = 'didisam_pii' and u.rolname = current_user and m.set_option) then
       execute format('grant didisam_pii to %I with set true, inherit false', current_user);
     end if;
     foreach t in array array['identity','otp','guardian','access_log'] loop
       execute format('alter table pii.%I enable row level security', t);
       execute format('alter table pii.%I force row level security', t);
       execute format('drop policy if exists tenant_iso on pii.%I', t);
       execute format($p$create policy tenant_iso on pii.%I using (tid = current_setting('app.tenant', true)) with check (tid = current_setting('app.tenant', true))$p$, t);
     end loop; end $$;
   revoke all on all tables in schema pii from didisam_tenant;
   grant usage on schema pii to didisam_pii;
   grant select, insert, update, delete on pii.identity, pii.otp, pii.guardian to didisam_pii;
   grant select, insert on pii.access_log to didisam_pii;
   grant usage on sequence pii.access_log_id_seq to didisam_pii;`,
  /* 7 — v30 규정 준수: 훈련생 활동 원본 로그(로그인 · 차시별 학습시간 · 본인확인 · IP). 기관 삭제 시 함께 삭제 */
  `create table if not exists cpl_log (
     id bigserial primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     sid text not null,
     kind text not null check (kind in ('login','beat','attend','verify-phone','verify-motp')),
     cls text, item text,
     secs integer not null default 0 check (secs >= 0),
     ip text, ua text,
     day date not null default ((now() at time zone 'Asia/Seoul')::date),
     at timestamptz not null default now()
   );
   create index if not exists cpl_log_sid on cpl_log (tenant_id, sid, day);
   alter table cpl_log enable row level security;
   alter table cpl_log force row level security;
   drop policy if exists tenant_iso on cpl_log;
   create policy tenant_iso on cpl_log using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
   grant select, insert on cpl_log to didisam_tenant;
   grant usage, select on sequence cpl_log_id_seq to didisam_tenant;`,
];

async function migrate(pool) {
  const c = await pool.connect();
  try {
    await c.query('select pg_advisory_lock(820820)');
    await c.query('create table if not exists schema_version (v integer primary key, at timestamptz not null default now())');
    const { rows } = await c.query('select coalesce(max(v), 0) as v from schema_version');
    for (let i = rows[0].v; i < MIGRATIONS.length; i++) {
      await c.query('begin');
      try { await c.query(MIGRATIONS[i]); await c.query('insert into schema_version (v) values ($1)', [i + 1]); await c.query('commit'); }
      catch (e) { await c.query('rollback'); throw e; }
    }
  } finally { await c.query('select pg_advisory_unlock(820820)').catch(() => {}); c.release(); }
}

/* 기관 범위 트랜잭션: fn(client)는 이 기관 행만 볼 수 있다 */
async function inTenant(pool, tid, fn) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query('set local role didisam_tenant');
    await c.query("select set_config('app.tenant', $1, true)", [tid]);
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
}

module.exports = { poolFrom, migrate, inTenant, MIGRATIONS };
