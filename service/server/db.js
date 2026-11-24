'use strict';
/* 데이터 계층 — PostgreSQL 16. 기관 데이터 테이블은 행 수준 보안(RLS)으로 기관(tenant)마다 격리한다.
   요청마다 트랜잭션 안에서 app.tenant를 설정하고(set_config … true = 트랜잭션 한정), 정책이 그 값과 같은 행만 보이게 한다.
   FORCE ROW LEVEL SECURITY라 테이블 소유자도 정책을 따른다(슈퍼유저 · BYPASSRLS 역할만 예외 → 앱 계정에 주지 않는다). */
const { Pool } = require('pg');

function poolFrom(env) {
  const cfg = { connectionString: env.DATABASE_URL, max: Number(env.DB_POOL || 8), idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 };
  /* 가디언 4차 #13: DB_SSL_CA(PEM 내용 또는 파일 경로, Secret 권장)가 있으면 서버 인증서를 검증한다(rejectUnauthorized: true).
     DB_SSL=require만 있으면 암호화만(검증 없음 — 이전 동작, 운영은 DB_SSL_CA 권장). Cloud SQL 커넥터(unix 소켓)는 커넥터가 암호화한다. */
  const ca = String(env.DB_SSL_CA || '').trim();
  if (ca) cfg.ssl = { rejectUnauthorized: true, ca: /-----BEGIN CERTIFICATE-----/.test(ca) ? ca.replace(/\\n/g, '\n') : require('node:fs').readFileSync(ca, 'utf8'), ...(env.DB_SSL_SERVERNAME ? { servername: env.DB_SSL_SERVERNAME } : {}) };
  else if (env.DB_SSL === 'require') cfg.ssl = { rejectUnauthorized: false };
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
  /* 8 — v30.1 서버 출제 · 채점: 응시별 출제 문항 · 답안 · 점수 원본 */
  `create table if not exists cpl_exam (
     id text primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     sid text not null, cls text not null, item text not null,
     qorder jsonb not null, answers jsonb,
     started_at timestamptz not null default now(), ends_at timestamptz, submitted_at timestamptz,
     score integer, pass boolean, late boolean not null default false
   );
   create index if not exists cpl_exam_sid on cpl_exam (tenant_id, sid, cls, item);
   alter table cpl_exam enable row level security;
   alter table cpl_exam force row level security;
   drop policy if exists tenant_iso on cpl_exam;
   create policy tenant_iso on cpl_exam using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
   grant select, insert, update on cpl_exam to didisam_tenant;`,
  /* 9 — v30.2 공단 체크리스트: 본인인증 평가코드 · 차시(00 입과 · 01 진도 · 02 시험 · 03 과제 · 04 진행평가) */
  `alter table cpl_log add column if not exists eval_cd text;
   alter table cpl_log add column if not exists chasi integer;`,
  /* 10 — v31 심사자 계정: 본인인증 면제 기록 */
  `alter table cpl_log drop constraint if exists cpl_log_kind_check;
   alter table cpl_log add constraint cpl_log_kind_check check (kind in ('login','beat','attend','verify-phone','verify-motp','review'));`,
  /* 11 — v31.1 임시 비밀번호 */
  `alter table users add column if not exists pw_temp boolean not null default false;`,
  /* 12 — v31.2 단체가입 최초 로그인: 훈련생이 정한 비밀번호, 접근코드를 재발급하면 지운다 */
  `alter table learners add column if not exists pw_hash text;
   alter table cpl_log drop constraint if exists cpl_log_kind_check;
   alter table cpl_log add constraint cpl_log_kind_check check (kind in ('login','beat','attend','verify-phone','verify-motp','review','group-pw'));`,
  /* 13 — v31.6 무활동 세션 만료: 마지막 활동 시각 */
  `alter table learner_sessions add column if not exists last_at timestamptz not null default now();`,
  /* 14 — v32.4 운영자 소셜 로그인: 제공자 회원 번호만 저장(이름 · 사진 · 전화번호 없음) */
  `create table if not exists user_oauth (
     provider text not null check (provider in ('google','kakao')),
     sub text not null check (length(sub) between 1 and 200),
     user_id uuid not null references users(id) on delete cascade,
     created_at timestamptz not null default now(),
     primary key (provider, sub)
   );
   create index if not exists user_oauth_user on user_oauth (user_id);`,
  /* 15 — v33 학습자 → 운영자 요청함(문의 · 수강 취소 · 가족 연결 · 코드 재발급 · 커뮤니티 등). 본문은 개인정보를 가린 뒤 저장, 90일 보관.
        대학 첫 로그인 동의: 동의 여부 · 일시만(학번 · 학과 외 항목 없음) */
  `alter table learners add column if not exists consent jsonb;
   create table if not exists learner_events (
     id bigserial primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     sid text not null default '',
     type text not null check (type ~ '^[a-z0-9-]{2,24}$'),
     xid text,
     data jsonb not null default '{}',
     at timestamptz not null default now()
   );
   create index if not exists levents_tid on learner_events (tenant_id, id);
   alter table learner_events enable row level security;
   alter table learner_events force row level security;
   drop policy if exists tenant_iso on learner_events;
   create policy tenant_iso on learner_events using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
   grant select, insert, delete on learner_events to didisam_tenant;
   grant usage, select on sequence learner_events_id_seq to didisam_tenant;`,
  /* 16 — v34.5 홈페이지 이미지(/api/media, media.js): 기관별 바이트 저장(Cloud Run 디스크 · GCS 미사용). id = 정화 후 내용 sha256 앞 40자.
        메타데이터(EXIF 등)는 저장 전에 지운다. 기관 삭제 시 함께 삭제 */
  `create table if not exists media (
     tenant_id text not null references tenants(id) on delete cascade,
     id text not null check (id ~ '^[a-f0-9]{40}$'),
     mime text not null check (mime in ('image/png','image/jpeg','image/webp','image/svg+xml')),
     bytes integer not null check (bytes between 1 and 2097152),
     w integer, h integer,
     name text not null default '' check (length(name) <= 80),
     data bytea not null,
     created_by text not null default '',
     created_at timestamptz not null default now(),
     primary key (tenant_id, id)
   );
   create index if not exists media_tenant_at on media (tenant_id, created_at desc);
   alter table media enable row level security;
   alter table media force row level security;
   drop policy if exists tenant_iso on media;
   create policy tenant_iso on media using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
   grant select, insert, delete on media to didisam_tenant;`,
  /* 17 — v35 강의 파일(/api/media/f, mediafile.js): 같은 media 표에 kind(doc · video · audio) · status(up = 올리는 중 · ok)를 더하고
        바이트는 media_part(조각, 기본 8MB, 저장 방식 external — Range 응답이 필요한 부분만 읽음)에 둔다. 이미지는 그대로(2MB · data 열). */
  `alter table media drop constraint if exists media_mime_check;
   alter table media drop constraint if exists media_bytes_check;
   alter table media add column if not exists kind text not null default 'image';
   alter table media add column if not exists status text not null default 'ok';
   alter table media add column if not exists parts integer not null default 0;
   alter table media add column if not exists chunk integer not null default 0;
   alter table media alter column data drop not null;
   alter table media drop constraint if exists media_kind_ck;
   alter table media add constraint media_kind_ck check (
     (kind = 'image' and status = 'ok' and data is not null and bytes between 1 and 2097152 and mime in ('image/png','image/jpeg','image/webp','image/svg+xml'))
     or (kind = 'doc' and data is null and status in ('up','ok') and bytes between 1 and 1073741824 and mime in ('application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/x-hwp','application/hwp+zip'))
     or (kind = 'video' and data is null and status in ('up','ok') and bytes between 1 and 2147483647 and mime in ('video/mp4','video/webm'))
     or (kind = 'audio' and data is null and status in ('up','ok') and bytes between 1 and 1073741824 and mime in ('audio/mpeg','audio/mp4')));
   create index if not exists media_tenant_kind on media (tenant_id, kind, created_at desc);
   create table if not exists media_part (
     tenant_id text not null,
     id text not null,
     seq integer not null check (seq between 0 and 200000),
     data bytea not null,
     primary key (tenant_id, id, seq),
     foreign key (tenant_id, id) references media (tenant_id, id) on delete cascade
   );
   alter table media_part alter column data set storage external;
   alter table media_part enable row level security;
   alter table media_part force row level security;
   drop policy if exists tenant_iso on media_part;
   create policy tenant_iso on media_part using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
   grant update (status) on media to didisam_tenant;
   grant select, insert, update, delete on media_part to didisam_tenant;`,
  /* v38 계정 연결: 14세 미만 가입의 초대 토큰(보호자 동의 뒤 요청함에 실음, 개인정보 아님) · 동의한 보호자의 1회용 보호자 계정 연결 토큰(해시) */
  `alter table learner_accounts add column if not exists invite_token text;
   alter table pii.guardian add column if not exists parent_tok_hash text;`,
  /* v46 Ver2: AI 게이트웨이 기능별 사용량(ai_usage_f — 기존 ai_usage(tenant_id, day) 합계 행은 그대로 둬 한도 · LMS · Java 쿼리 불변) ·
     대화 기록(ai_turn, 가림 뒤 AES-GCM 암호화, purge_at 지나면 삭제) · 학습 이벤트(learning_event, 자유 글 없음 — 숫자 · 짧은 코드만) */
  `create table if not exists ai_usage_f (
     tenant_id text not null references tenants(id) on delete cascade,
     day date not null,
     feature text not null check (feature ~ '^[a-z]{2,12}$'),
     calls integer not null default 0,
     tin bigint not null default 0,
     tout bigint not null default 0,
     primary key (tenant_id, day, feature)
   );
   create table if not exists ai_turn (
     id bigserial primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     sid text not null default '',
     feature text not null,
     cls text not null default '',
     item text not null default '',
     level text not null default '',
     q_enc text not null,
     a_enc text not null,
     tin integer not null default 0,
     tout integer not null default 0,
     at timestamptz not null default now(),
     purge_at timestamptz not null
   );
   create index if not exists ai_turn_t on ai_turn (tenant_id, sid, at);
   create index if not exists ai_turn_purge on ai_turn (purge_at);
   create table if not exists learning_event (
     id bigserial primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     sid text not null,
     verb text not null check (verb in ('attempt','hint','submit','revise','reflect','mastery','ai.ask','vision','goal')),
     obj text not null default '' check (length(obj) <= 120),
     lvl text not null default '' check (lvl in ('','L0','L1','L2','L3')),
     val jsonb not null default '{}'::jsonb check (octet_length(val::text) <= 512),
     src text not null check (src in ('client','server')),
     trust text not null check (trust in ('A','C')),
     at timestamptz not null default now()
   );
   create index if not exists learning_event_sid on learning_event (tenant_id, sid, at);
   create index if not exists learning_event_obj on learning_event (tenant_id, obj);
   do $$ declare t text; begin
     foreach t in array array['ai_usage_f','ai_turn','learning_event'] loop
       execute format('alter table %I enable row level security', t);
       execute format('alter table %I force row level security', t);
       execute format('drop policy if exists tenant_iso on %I', t);
       execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
     end loop; end $$;
   grant select, insert, update, delete on ai_usage_f, ai_turn, learning_event to didisam_tenant;
   grant usage on sequence ai_turn_id_seq, learning_event_id_seq to didisam_tenant;`,
  /* v47 AI 추가 충전(ai_credit): 정운영자가 토스로 산 토큰 묶음. ready(결제 창 열림) → paid(서버가 토스 승인 확인) 뒤에만 한도에 더한다.
     month(YYYY-MM, KST)는 주문한 달. 사용 기간은 expires_at(뒤 이전, 충전일 + 365일)까지 — 남은 양은 다음 달로 이어진다. 금액은 공급가 + 부가세(aiprice.js) */
  `create table if not exists ai_credit (
     id text primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     month text not null check (month ~ '^\\d{4}-\\d{2}$'),
     pack text not null check (pack ~ '^[a-z0-9]{2,12}$'),
     tokens bigint not null check (tokens > 0),
     amount integer not null check (amount >= 0),
     order_id text not null unique,
     payment_key text,
     status text not null default 'ready' check (status in ('ready','paid','failed')),
     demo boolean not null default false,
     by_email text not null default '',
     at timestamptz not null default now(),
     paid_at timestamptz
   );
   create index if not exists ai_credit_t on ai_credit (tenant_id, month, status);
   alter table ai_credit enable row level security;
   alter table ai_credit force row level security;
   drop policy if exists tenant_iso on ai_credit;
   create policy tenant_iso on ai_credit using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
   grant select, insert, update on ai_credit to didisam_tenant;`,
  /* v47 산타 관리 변경 이력(santa_plan_log): 산타 관리자가 넣은 요금제 · 월 포함 토큰 · 메모. 기관 역할(didisam_tenant)에는 권한을 주지 않는다 — 산타 내부 메모는 기관에 보이지 않음.
     기관 쪽에는 audit_log 'santa.plan'(코드 · 포함 토큰만)이 함께 남는다 */
  `create table if not exists santa_plan_log (
     id bigserial primary key,
     tenant_id text not null references tenants(id) on delete cascade,
     at timestamptz not null default now(),
     actor text not null,
     before jsonb,
     after jsonb not null,
     memo text not null default ''
   );
   create index if not exists santa_plan_log_t on santa_plan_log (tenant_id, id desc);
   revoke all on santa_plan_log from didisam_tenant;`,
  /* v47 충전량 1년 사용(이월): 만료일(이 날까지 사용) = 충전일(KST) + 365일. 이미 승인된 충전은 같은 규칙으로 채운다 */
  `alter table ai_credit add column if not exists expires_at date;
   update ai_credit set expires_at = (paid_at at time zone 'Asia/Seoul')::date + 365 where status = 'paid' and expires_at is null and paid_at is not null;
   create index if not exists ai_credit_exp on ai_credit (tenant_id, status, expires_at);`,
  /* 가디언(보안봇) Phase 0 — 내부 전용 security 스키마(보고서 1231줄 데이터 모델). 기관 역할(didisam_tenant)에는 권한을 주지 않는다.
     승인 · 긴급 차단 · 감사는 서버 기록만 유효. audit는 해시 체인(prev_hash · hash = sha256(prev|ts|actor|action|target|detail)) — Node security.js · Java SecServiceImpl 같은 식 */
  `create schema if not exists security;
   revoke all on schema security from public;
   create table if not exists security.threat_item (
     id text primary key, source text not null, external_id text not null, title text not null default '', cvss double precision, epss double precision, kev boolean not null default false,
     affected jsonb not null default '[]', attack_type text not null default '', url text not null default '', published_at timestamptz, verdict text not null default 'pending', hash text not null default '', summary text not null default '',
     created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (source, external_id));
   create table if not exists security.finding (
     id text primary key, key text not null unique, origin text not null default 'scan', title text not null default '', severity text not null default 'medium' check (severity in ('critical','high','medium','low')),
     priority text not null default 'P3' check (priority in ('P0','P1','P2','P3')), score double precision not null default 0, status text not null default 'open' check (status in ('open','triage','fixing','fixed','accepted','false_positive')),
     tenant_scope text not null default 'all', owner text not null default '', sla_due_at timestamptz, jira_key text not null default '', note text not null default '', threat_id text, evidence jsonb not null default '{}',
     created_at timestamptz not null default now(), updated_at timestamptz not null default now(), resolved_at timestamptz);
   create index if not exists sec_finding_st on security.finding (status, priority);
   create table if not exists security.scan (
     id bigserial primary key, type text not null, target text not null default '', tool text not null default '', tool_version_sha text not null default '', findings_count integer not null default 0, raw_ref text not null default '', at timestamptz not null default now());
   create table if not exists security.fix_pr (
     id text primary key, pr_number integer, title text not null default '', finding_ids jsonb not null default '[]', severity text not null default 'medium' check (severity in ('critical','high','medium','low')),
     change_type text not null default '', files jsonb not null default '[]', verify_result text not null default '', risk text not null default '', rollback_ref text not null default '', url text not null default '',
     status text not null default 'open' check (status in ('open','pending','approved','rejected','merged','closed')), reject_reason text not null default '', created_at timestamptz not null default now(), approved_at timestamptz, merged_at timestamptz);
   create table if not exists security.approval (
     id bigserial primary key, pr_id text not null references security.fix_pr(id) on delete cascade, approver text not null, method text not null check (method in ('reauth','link')), at timestamptz not null default now(), unique (pr_id, approver));
   create table if not exists security.approve_link (
     id text primary key, secret_hash text not null, pr_id text not null references security.fix_pr(id) on delete cascade, uid uuid not null, email text not null, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now());
   create table if not exists security.countermeasure (
     id text primary key, threat_id text, title text not null default '', threat_pattern text not null default '', controls jsonb not null default '[]', regression_tests jsonb not null default '[]',
     skill_refs jsonb not null default '[]', playbook text not null default '', body text not null default '', reuse_count integer not null default 0, version integer not null default 1, status text not null default 'draft',
     created_at timestamptz not null default now(), updated_at timestamptz not null default now());
   create table if not exists security.incident (
     id text primary key, type text not null, scope text not null default '', phase text not null default 'detect', timeline jsonb not null default '[]', notify_due_at timestamptz, decision_log jsonb not null default '[]', created_at timestamptz not null default now());
   create table if not exists security.kill_switch (
     id text primary key, action text not null check (action in ('key_disable','feature_off','egress_block')), tenant_id text not null references tenants(id) on delete cascade,
     mode text not null check (mode in ('dry','live')), trigger text not null default 'manual', rule_id text not null default '', reason text not null, signals jsonb not null default '[]', actor text not null,
     activated_at timestamptz not null default now(), expires_at timestamptz, released_at timestamptz, released_by text, release_note text not null default '', kday date not null);
   create index if not exists sec_kill_t on security.kill_switch (tenant_id, released_at);
   create index if not exists sec_kill_day on security.kill_switch (kday);
   create table if not exists security.audit (
     id bigserial primary key, at timestamptz not null default now(), ts text not null, actor text not null, actor_kind text not null check (actor_kind in ('user','agent')),
     action text not null, target text not null default '', detail text not null default '', ip_masked text not null default '', prev_hash text not null, hash text not null);
   revoke all on all tables in schema security from didisam_tenant;
   revoke all on schema security from didisam_tenant;`,
  /* 가디언 2차(SEC-0006) — 일반 audit_log 해시 체인. 기관별 체인: hash = sha256(prev_hash || audit_row_text(행)), 첫 행 prev = '0'×64.
     계산은 DB 트리거(BEFORE INSERT)가 한다 — 기존 insert 호출부(Node · Java · LMS SQL 함수)는 그대로이고 두 서버 결과가 자동으로 같다.
     동시성: 기관 단위 advisory xact lock(820824, hashtext(기관)) 안에서 id를 다시 뽑아(nextval) 체인 순서 = id 순서를 보장한다.
     위변조 방지: UPDATE는 트리거가 거부, 기관 역할(didisam_tenant)의 update · delete 권한 회수(기관 파기 cascade는 로그인 계정이라 유지).
     기존 행(hash 없음)은 마이그레이션 때 기관마다 'audit.chain.start' 행(legacy 건수 · 다이제스트)을 체인 첫 행으로 남겨 이후 변조도 잡는다.
     검증은 audit_verify(기관) 한 함수 — GET /api/audit/verify(Node app.js · Java TenantServiceImpl)가 그대로 돌려준다. */
  `alter table audit_log add column if not exists prev_hash text;
   alter table audit_log add column if not exists hash text;
   create index if not exists audit_tenant_id on audit_log (tenant_id, id);
   create or replace function audit_row_text(p_id bigint, p_tenant text, p_at timestamptz, p_actor text, p_action text, p_detail jsonb) returns text
     language sql stable as $f$ select jsonb_build_array(p_id, p_tenant, to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), p_actor, p_action, p_detail)::text $f$;
   create or replace function audit_log_chain() returns trigger language plpgsql as $f$
     declare p text;
     begin
       if tg_op = 'UPDATE' then raise exception 'audit_log is append-only' using errcode = '42501'; end if;
       perform pg_advisory_xact_lock(820824, hashtext(NEW.tenant_id));
       NEW.id := nextval('audit_log_id_seq'::regclass);
       NEW.at := coalesce(NEW.at, now());
       select hash into p from audit_log where tenant_id = NEW.tenant_id and hash is not null order by id desc limit 1;
       NEW.prev_hash := coalesce(p, repeat('0', 64));
       NEW.hash := encode(sha256(convert_to(NEW.prev_hash || audit_row_text(NEW.id, NEW.tenant_id, NEW.at, NEW.actor, NEW.action, NEW.detail), 'UTF8')), 'hex');
       return NEW;
     end $f$;
   drop trigger if exists audit_log_chain on audit_log;
   create trigger audit_log_chain before insert or update on audit_log for each row execute function audit_log_chain();
   revoke update, delete on audit_log from didisam_tenant;
   create or replace function audit_legacy_digest(p_tenant text, p_below bigint) returns jsonb language sql stable as $f$
     select jsonb_build_object('legacy', count(*), 'legacyDigest', encode(sha256(convert_to(coalesce(string_agg(audit_row_text(id, tenant_id, at, actor, action, detail), E'\\n' order by id), ''), 'UTF8')), 'hex'))
       from audit_log where tenant_id = p_tenant and hash is null and id < p_below $f$;
   create or replace function audit_verify(p_tenant text) returns jsonb language plpgsql stable as $f$
     declare r record; prev text := repeat('0', 64); started boolean := false; n integer := 0; legacy integer := 0; d jsonb;
     begin
       for r in select id, tenant_id, at, actor, action, detail, prev_hash, hash from audit_log where tenant_id = p_tenant order by id loop
         if r.hash is null then
           if started then return jsonb_build_object('ok', false, 'n', n, 'legacy', legacy, 'brokenAt', r.id, 'reason', 'unhashed'); end if;
           legacy := legacy + 1; continue;
         end if;
         started := true; n := n + 1;
         if r.prev_hash is distinct from prev or r.hash <> encode(sha256(convert_to(prev || audit_row_text(r.id, r.tenant_id, r.at, r.actor, r.action, r.detail), 'UTF8')), 'hex') then
           return jsonb_build_object('ok', false, 'n', n, 'legacy', legacy, 'brokenAt', r.id, 'reason', 'hash');
         end if;
         if r.action = 'audit.chain.start' then
           d := audit_legacy_digest(p_tenant, r.id);
           if (d->>'legacy')::int <> legacy or d->>'legacy' is distinct from r.detail->>'legacy' or d->>'legacyDigest' is distinct from r.detail->>'legacyDigest' then
             return jsonb_build_object('ok', false, 'n', n, 'legacy', legacy, 'brokenAt', r.id, 'reason', 'legacy');
           end if;
         end if;
         prev := r.hash;
       end loop;
       return jsonb_build_object('ok', true, 'n', n, 'legacy', legacy, 'head', prev);
     end $f$;
   do $$ declare t text; d jsonb; begin
     for t in select distinct tenant_id from audit_log where hash is null loop
       perform set_config('app.tenant', t, true);
       d := audit_legacy_digest(t, 9223372036854775807);
       if (d->>'legacy')::int > 0 then insert into audit_log (tenant_id, actor, action, detail) values (t, 'system', 'audit.chain.start', d); end if;
     end loop;
     perform set_config('app.tenant', '', true);
   end $$;`,
];

/* v30 학사 LMS 묶음 스키마(lms/sql/NN_*.sql)는 번호가 아니라 파일 이름으로 기록한다(lms_schema).
   기본 MIGRATIONS 배열 끝에 새 항목을 더해도 LMS 파일 적용 기록이 밀리지 않는다. */
const LMS_SQL = [...require('./lms').sqlMigrations(), ...require('./fac').sqlMigrations(), ...require('./ledger').sqlMigrations(), ...require('./mileage').sqlMigrations(), ...require('./devices').sqlMigrations(), ...require('./records').sqlMigrations(), ...require('./mfa').sqlMigrations(), ...require('./session').sqlMigrations()]; /* 가디언 4차 기록 보관(접속기록 ip · FK cascade 제거 · 파기) */ /* 보안 2차 로그인 기기(이름 기록 — 번호 배열과 충돌 없음) */ /* v42 마일리지(mileage/sql) — 원장 뒤(차감 줄 · 환불 훅) */ /* v41 원장 표(ledger/sql) — fac 뒤(시설 이중 기록 트리거) */ /* v40 시설 예약 표(fac/sql) */

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
    await c.query('create table if not exists lms_schema (name text primary key, at timestamptz not null default now())');
    const done = new Set((await c.query('select name from lms_schema')).rows.map(r => r.name));
    for (const [name, sql] of LMS_SQL) {
      if (done.has(name)) continue;
      await c.query('begin');
      try { await c.query(sql); await c.query('insert into lms_schema (name) values ($1)', [name]); await c.query('commit'); }
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
