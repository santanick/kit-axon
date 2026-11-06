-- 묶음 O(AI) — RAG(문서 · 청크 · 벡터) · AI Q&A 스레드 · FAQ · 생성물 검토 · AI 자동평가(LMS 기록만) · 실시간 자막 · LLM 관리
-- 요건: SFR-013 · 074 · 076 · 077 · 079 · 080 · 082 · 083 · 084 · 085 · 086 · 087
-- 벡터: 결정적 로컬 임베딩(해시 BoW, 256차원 정수 빈도) → lms_o_vec가 (1+ln tf) L2 정규화 real[]로 저장. 유사도 계산은 DB에서(lms_o_cos) → Node · Java가 같은 값.

create or replace function lms_o_vec(c int[]) returns real[] language sql immutable as $$
  select case when q.s = 0 then null else (select array_agg((case when x > 0 then (1 + ln(x)) / q.s else 0 end)::real order by i) from unnest(c) with ordinality u(x, i)) end
  from (select sqrt(coalesce(sum(case when x > 0 then (1 + ln(x)) ^ 2 else 0 end), 0)) s from unnest(c) x) q $$;
create or replace function lms_o_cos(a real[], b real[]) returns float8 language sql immutable as $$
  select case when a is null or b is null then 0 else round(coalesce((select sum(x::float8 * y::float8) from unnest(a, b) t(x, y)), 0)::numeric, 4)::float8 end $$;

create table if not exists lms_o_setting (
  tenant_id    text primary key references tenants(id) on delete cascade,
  limit_tokens bigint not null default 0,           -- 월 토큰 할당량(0 = 무제한)
  alert_pct    int not null default 80 check (alert_pct between 1 and 100),
  hard_block   boolean not null default true,       -- 초과 시 차단
  embed        jsonb not null default '{"kind":"local-hash"}'
);
create table if not exists lms_o_provider (
  tenant_id    text not null references tenants(id) on delete cascade,
  provider_id  uuid not null default gen_random_uuid(),
  kind         text not null check (kind in ('anthropic','openai_compat')),
  name         text not null,
  endpoint_url text,
  model        text not null,
  enabled      boolean not null default true,
  created_at   timestamptz not null default now(),
  primary key (tenant_id, provider_id)
);
create table if not exists lms_o_route (
  tenant_id    text not null,
  feature      text not null,
  provider_id  uuid not null,
  primary key (tenant_id, feature),
  foreign key (tenant_id, provider_id) references lms_o_provider (tenant_id, provider_id) on delete cascade
);
create table if not exists lms_o_llm_call (
  tenant_id    text not null references tenants(id) on delete cascade,
  id           bigserial,
  provider_kind text not null, model text not null, feature text not null,
  ms int not null default 0, tin int not null default 0, tout int not null default 0,
  ok boolean not null, err text,
  at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_o_call_at on lms_o_llm_call (tenant_id, at);
create table if not exists lms_o_alert (
  tenant_id    text not null references tenants(id) on delete cascade,
  id           bigserial,
  month        text not null, level text not null check (level in ('warn','over')),
  used bigint not null, limit_tokens bigint not null,
  at timestamptz not null default now(),
  primary key (tenant_id, id), unique (tenant_id, month, level)
);
create table if not exists lms_o_source (
  tenant_id    text not null references tenants(id) on delete cascade,
  source_id    uuid not null default gen_random_uuid(),
  name         text not null,
  kind         text not null check (kind in ('file','url','board','manual')),
  section_id   uuid,
  url          text,
  enabled      boolean not null default true,
  indexed_at   timestamptz,
  created_at   timestamptz not null default now(),
  primary key (tenant_id, source_id)
);
create table if not exists lms_o_doc (
  tenant_id    text not null references tenants(id) on delete cascade,
  doc_id       uuid not null default gen_random_uuid(),
  source_id    uuid,
  section_id   uuid,
  name         text not null, ext text not null,
  bytes int not null default 0, chars int not null default 0,
  paras        jsonb not null default '[]',          -- [{t: h|p|li|row, x}] 원본 구조(번역 뷰어)
  created_by   text,
  created_at   timestamptz not null default now(),
  primary key (tenant_id, doc_id),
  foreign key (tenant_id, source_id) references lms_o_source (tenant_id, source_id) on delete cascade
);
create table if not exists lms_o_chunk (
  tenant_id    text not null,
  doc_id       uuid not null,
  seq          int not null,
  text         text not null,
  vec          real[],
  primary key (tenant_id, doc_id, seq),
  foreign key (tenant_id, doc_id) references lms_o_doc (tenant_id, doc_id) on delete cascade
);
create table if not exists lms_o_thread (
  tenant_id    text not null references tenants(id) on delete cascade,
  thread_id    uuid not null default gen_random_uuid(),
  title        text not null,
  owner        text not null,
  section_id   uuid, member_no text,
  temperature  real not null default 0.3,
  top_k        int not null default 4,
  share_token  text,
  created_at   timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, thread_id), unique (tenant_id, share_token)
);
create table if not exists lms_o_msg (
  tenant_id    text not null,
  thread_id    uuid not null,
  seq          int not null,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  cites        jsonb not null default '[]',
  faq_id       uuid,
  edited       boolean not null default false,
  at           timestamptz not null default now(),
  primary key (tenant_id, thread_id, seq),
  foreign key (tenant_id, thread_id) references lms_o_thread (tenant_id, thread_id) on delete cascade
);
create table if not exists lms_o_faq (
  tenant_id    text not null references tenants(id) on delete cascade,
  faq_id       uuid not null default gen_random_uuid(),
  section_id   uuid,
  q text not null, a text not null, tags text not null default '',
  vec real[],
  created_at   timestamptz not null default now(),
  primary key (tenant_id, faq_id)
);
create table if not exists lms_o_gen (
  tenant_id    text not null references tenants(id) on delete cascade,
  gen_id       uuid not null default gen_random_uuid(),
  kind         text not null check (kind in ('summary','translation','quiz','rubric','discussion')),
  section_id   uuid, doc_id uuid, lang text,
  params       jsonb not null default '{}',
  output       jsonb not null default '{}',
  parsed       boolean not null default true,
  status       text not null default 'review' check (status in ('review','approved','published','rejected')),
  created_by   text, reviewer text, review_note text,
  created_at   timestamptz not null default now(), reviewed_at timestamptz, published_at timestamptz,
  primary key (tenant_id, gen_id)
);
create index if not exists lms_o_gen_k on lms_o_gen (tenant_id, kind, status);
create table if not exists lms_o_eval (
  tenant_id    text not null references tenants(id) on delete cascade,
  eval_id      uuid not null default gen_random_uuid(),
  section_id   uuid, member_no text not null, rubric_gen_id uuid,
  answer_chars int not null default 0,
  max_score    float8 not null default 100,
  ai_score     float8, rationale text, criteria jsonb not null default '[]',
  status       text not null default 'suggested' check (status in ('suggested','confirmed')),
  final_score  float8, confirmed_by text,
  created_at   timestamptz not null default now(), confirmed_at timestamptz,
  primary key (tenant_id, eval_id)
);
create table if not exists lms_o_caption_room (
  tenant_id    text not null references tenants(id) on delete cascade,
  room_id      uuid not null default gen_random_uuid(),
  section_id   uuid, title text not null,
  langs        jsonb not null default '[]',
  code         text not null,
  status       text not null default 'live' check (status in ('live','closed')),
  created_at   timestamptz not null default now(),
  primary key (tenant_id, room_id), unique (tenant_id, code)
);
create table if not exists lms_o_caption_line (
  tenant_id    text not null,
  room_id      uuid not null,
  seq          int not null,
  text         text not null,
  tr           jsonb not null default '{}',
  source       text not null default 'manual' check (source in ('manual','stt')),
  edited       boolean not null default false,
  at           timestamptz not null default now(),
  primary key (tenant_id, room_id, seq),
  foreign key (tenant_id, room_id) references lms_o_caption_room (tenant_id, room_id) on delete cascade
);

do $$ declare t text; begin
  foreach t in array array['lms_o_setting','lms_o_provider','lms_o_route','lms_o_llm_call','lms_o_alert','lms_o_source','lms_o_doc','lms_o_chunk','lms_o_thread','lms_o_msg','lms_o_faq','lms_o_gen','lms_o_eval','lms_o_caption_room','lms_o_caption_line'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_o_llm_call_id_seq, lms_o_alert_id_seq to didisam_tenant;
end $$;
