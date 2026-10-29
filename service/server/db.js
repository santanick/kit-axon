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
   grant usage on sequence audit_log_id_seq to didisam_tenant;`
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
