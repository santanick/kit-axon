-- v32 미디어 파이프라인(자체 CMS · 스트리밍) — ECR-002 CMS 서비스 · SFR-062 CDN · ECR-003 강의저작(녹화) · SFR-073 AI 자동자막
-- 묶음 I(lms_content · lms_progress · lms_subtitle: 진도 · 하트비트 · 자동출석) · E(lms_x_* 도우미) · B(lms_b_resource: 주차 · 차시 자원)를 그대로 쓴다.
-- 업무 규칙 · 응답 JSON은 이 파일의 SQL 함수 lms_v_*(ctx, a)가 만든다 → Node(lms/mod-v.js) · 전자정부 Java(lms.v)가 같은 함수를 불러 같은 JSON을 낸다.
-- 바이트(원본 조각 · HLS 세그먼트)는 저장소 어댑터(db: lms_media_obj.data · disk: MEDIA_DIR · gcs: 운영 연결 지점)에 두고, 이 표에는 경로 · 크기만 남긴다.
-- 작업 대기열(lms_media_q)은 기관을 가로질러 일감을 집는 작업기용이라 RLS를 두지 않고, 기관 역할(didisam_tenant)에는 권한을 주지 않는다(트리거만 쓴다).

-- ── 표 ──
create table if not exists lms_media (
  tenant_id text not null references tenants(id) on delete cascade,
  media_id uuid not null default gen_random_uuid(),
  title text not null,
  kind text not null default 'upload' check (kind in ('upload', 'record')),
  status text not null default 'uploading' check (status in ('uploading', 'queued', 'processing', 'ready', 'failed', 'deleted')),
  owner_uid text,
  src_name text, src_mime text not null, src_size bigint not null, chunk_size int not null, chunks int not null,
  trim_start numeric(10,3), trim_end numeric(10,3),
  duration_sec numeric(10,3), width int, height int, has_audio boolean,
  renditions jsonb not null default '[]',
  storage text not null default 'db',
  secret text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  url_ver int not null default 1,
  access text not null default 'enrolled' check (access in ('enrolled', 'staff')),
  domains text[] not null default '{}',
  consent jsonb,                                   -- 녹화(웹캠 · 화면 · 마이크) 동의 기록 {at, by, ver}
  retain_until date,                               -- 보존 기한 — 지나면 작업기가 자동 파기
  stt_auto boolean not null default false, stt_lang text,
  place_session uuid, place_title text,            -- 처리 완료 후 자동 배치할 차시
  progress int not null default 0, error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), ready_at timestamptz,
  primary key (tenant_id, media_id)
);
create table if not exists lms_media_obj (
  tenant_id text not null, media_id uuid not null, path text not null,
  mime text not null, size bigint not null, store text not null default 'db',
  data bytea,                                      -- store = 'db'일 때만. disk · gcs는 어댑터 키(tenant/media/path)
  created_at timestamptz not null default now(),
  primary key (tenant_id, media_id, path),
  foreign key (tenant_id, media_id) references lms_media (tenant_id, media_id) on delete cascade
);
create table if not exists lms_media_job (
  tenant_id text not null, job_id uuid not null default gen_random_uuid(), media_id uuid not null,
  kind text not null check (kind in ('transcode', 'stt')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  progress int not null default 0, step text, lang text, engine text, error text, attempts int not null default 0,
  created_at timestamptz not null default clock_timestamp(), started_at timestamptz, finished_at timestamptz,
  primary key (tenant_id, job_id),
  foreign key (tenant_id, media_id) references lms_media (tenant_id, media_id) on delete cascade
);
create table if not exists lms_media_cap (
  tenant_id text not null, media_id uuid not null, lang text not null,
  cues jsonb not null default '[]',
  source text not null check (source in ('stt', 'demo', 'translate', 'edit', 'upload')),
  engine text, status text not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now(), published_at timestamptz,
  primary key (tenant_id, media_id, lang),
  foreign key (tenant_id, media_id) references lms_media (tenant_id, media_id) on delete cascade
);
create table if not exists lms_media_set (
  tenant_id text not null primary key references tenants(id) on delete cascade,
  delivery text not null default 'origin' check (delivery in ('origin', 'cdn')),
  cdn_base text, ttl_sec int not null default 3600, domains text[] not null default '{}',
  stt_lang text not null default 'ko', targets text[] not null default '{en,zh,ja,vi}', retain_days int not null default 365,
  updated_at timestamptz not null default now()
);
create table if not exists lms_media_log (
  tenant_id text not null, id bigserial, media_id uuid not null, actor text not null, action text not null, ip text,
  at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_media_log_m on lms_media_log (tenant_id, media_id, at desc);
create table if not exists lms_media_q (
  job_id uuid primary key, tenant_id text not null, kind text not null,
  status text not null default 'queued', locked_at timestamptz, worker text, created_at timestamptz not null default clock_timestamp()
);
do $$ declare t text; begin
  foreach t in array array['lms_media','lms_media_obj','lms_media_job','lms_media_cap','lms_media_set','lms_media_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
end $$;
grant usage on sequence lms_media_log_id_seq to didisam_tenant;

-- 작업 → 대기열(정의자 권한 트리거: 기관 역할은 대기열 표를 직접 못 본다)
create or replace function lms_v_trg_q() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'queued' then
    insert into lms_media_q (job_id, tenant_id, kind) values (new.job_id, new.tenant_id, new.kind)
      on conflict (job_id) do update set status = 'queued', locked_at = null, worker = null;
  elsif new.status in ('done', 'failed') then
    delete from lms_media_q where job_id = new.job_id;
  end if;
  return new;
end $$;
drop trigger if exists lms_v_q on lms_media_job;
create trigger lms_v_q after insert or update of status on lms_media_job for each row execute function lms_v_trg_q();
create or replace function lms_v_trg_qdel() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from lms_media_q where job_id = old.job_id; return old; end $$;
drop trigger if exists lms_v_qdel on lms_media_job;
create trigger lms_v_qdel after delete on lms_media_job for each row execute function lms_v_trg_qdel();

-- ── 내부 도우미 ──
create or replace function lms_v_langs() returns text[] language sql immutable as $$ select array['ko','en','ja','zh','vi','uz','mn','ru','es','fr','de','id','th','ne'] $$;
create or replace function lms_v_set() returns lms_media_set language plpgsql stable as $$
declare r lms_media_set;
begin
  select * into r from lms_media_set where tenant_id = lms_x_tid();
  if r.tenant_id is null then r.tenant_id := lms_x_tid(); r.delivery := 'origin'; r.ttl_sec := 3600; r.domains := '{}'; r.stt_lang := 'ko'; r.targets := '{en,zh,ja,vi}'; r.retain_days := 365; end if;
  return r;
end $$;
create or replace function lms_v_set_json(r lms_media_set) returns jsonb language sql stable as $$
  select jsonb_build_object('delivery', r.delivery, 'cdn_base', r.cdn_base, 'ttl_sec', r.ttl_sec, 'domains', to_jsonb(r.domains), 'stt_lang', r.stt_lang,
    'targets', to_jsonb(r.targets), 'retain_days', r.retain_days, 'langs', to_jsonb(lms_v_langs()),
    'renditions', '[{"name":"360p","height":360,"kbps":800},{"name":"720p","height":720,"kbps":2500}]'::jsonb,
    'storage_hint', 'db(기본) · disk(MEDIA_DIR) · gcs(운영: MEDIA_STORE=gcs, MEDIA_GCS_BUCKET)') $$;
create or replace function lms_v_m(id uuid) returns lms_media language plpgsql as $$
declare r lms_media;
begin
  select * into r from lms_media where media_id = id and status <> 'deleted';
  if r.media_id is null then perform lms_x_err(404, 'media', '없는 영상입니다.'); end if;
  return r;
end $$;
-- 교수자는 자기가 올린 영상 · 담당 분반에 배치된 영상만(운영자 · 부운영자 전체)
create or replace function lms_v_can(r lms_media) returns boolean language plpgsql stable as $$
declare c jsonb := lms_x_ctx();
begin
  if c is null or c->>'kind' <> 'staff' or c->>'role' in ('owner', 'sub') then return true; end if;
  if r.owner_uid = c->>'uid' then return true; end if;
  return exists (select 1 from lms_content ct join lms_session s on s.session_id = ct.session_id where ct.src = 'media:' || r.media_id and lms_x_can(s.section_id));
end $$;
create or replace function lms_v_mine(ctx jsonb, a jsonb) returns lms_media language plpgsql as $$
declare r lms_media;
begin
  perform lms_x_staff(ctx);
  r := lms_v_m(lms_x_uuid(a->>'media_id', '영상'));
  if not lms_v_can(r) then perform lms_x_err(403, 'lms_role', '내가 올렸거나 담당 분반에 배치된 영상만 다룰 수 있습니다.'); end if;
  return r;
end $$;
create or replace function lms_v_log_put(id uuid, ctx jsonb, act text) returns void language sql as $$
  insert into lms_media_log (tenant_id, media_id, actor, action, ip)
  values (lms_x_tid(), id, case when ctx->>'kind' = 'learner' then 'learner:' || (ctx->>'sid') when ctx->>'kind' = 'staff' then coalesce(ctx->>'email', 'staff') else coalesce(ctx->>'kind', 'none') end, act, lms_x_ipmask(ctx->>'ip')) $$;
-- 서명: sha256(비밀 · sha256(비밀 · 내용)) 앞 32자 — 길이 확장 공격이 통하지 않는 이중 해시(HMAC 대용, pgcrypto 불필요)
create or replace function lms_v_sig(r lms_media, e bigint) returns text language sql immutable as $$
  select left(encode(sha256(convert_to(r.secret || encode(sha256(convert_to(r.secret || '|' || r.tenant_id || '|' || r.media_id || '|' || e || '|' || r.url_ver, 'UTF8')), 'hex'), 'UTF8')), 'hex'), 32) $$;
create or replace function lms_v_q(r lms_media, e bigint) returns text language sql immutable as $$
  select 't=' || r.tenant_id || '&m=' || r.media_id || '&e=' || e || '&s=' || lms_v_sig(r, e) $$;
create or replace function lms_v_job_json(j lms_media_job) returns jsonb language sql stable as $$
  select case when j.job_id is null then null else jsonb_build_object('job_id', j.job_id, 'kind', j.kind, 'status', j.status, 'progress', j.progress, 'step', j.step, 'lang', j.lang, 'engine', j.engine,
    'error', j.error, 'attempts', j.attempts, 'created_at', lms_x_ts(j.created_at), 'started_at', lms_x_ts(j.started_at), 'finished_at', lms_x_ts(j.finished_at)) end $$;
create or replace function lms_v_json(r lms_media) returns jsonb language sql stable as $$
  select jsonb_build_object('media_id', r.media_id, 'title', r.title, 'kind', r.kind, 'status', r.status, 'progress', r.progress, 'error', r.error,
    'src_name', r.src_name, 'src_mime', r.src_mime, 'src_size', r.src_size, 'chunk_size', r.chunk_size, 'chunks', r.chunks,
    'received', (select count(*) from lms_media_obj o where o.media_id = r.media_id and o.path like 'src/%'),
    'trim_start', r.trim_start::float8, 'trim_end', r.trim_end::float8, 'duration_sec', r.duration_sec::float8, 'width', r.width, 'height', r.height, 'has_audio', r.has_audio,
    'renditions', r.renditions, 'storage', r.storage, 'url_ver', r.url_ver, 'access', r.access, 'domains', to_jsonb(r.domains),
    'consent', r.consent, 'retain_until', r.retain_until, 'stt_auto', r.stt_auto, 'stt_lang', r.stt_lang, 'place_session', r.place_session,
    'placements', (select count(*) from lms_content ct where ct.src = 'media:' || r.media_id),
    'captions', coalesce((select jsonb_agg(jsonb_build_object('lang', c.lang, 'status', c.status, 'source', c.source) order by c.lang) from lms_media_cap c where c.media_id = r.media_id), '[]'),
    'job', (select lms_v_job_json(j) from lms_media_job j where j.media_id = r.media_id order by j.created_at desc, j.job_id limit 1),
    'created_at', lms_x_ts(r.created_at), 'ready_at', lms_x_ts(r.ready_at)) $$;
-- 자막 큐 검사(묶음 I subCues와 같은 규칙: 1~3000개, s < e, 대사 500자)
create or replace function lms_v_cues(v jsonb) returns jsonb language plpgsql as $$
declare n jsonb;
begin
  if jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v) not between 1 and 3000 or exists (select 1 from jsonb_array_elements(v) e where jsonb_typeof(e->'s') is distinct from 'number'
    or jsonb_typeof(e->'e') is distinct from 'number' or jsonb_typeof(e->'t') is distinct from 'string' or (e->>'e')::float8 <= (e->>'s')::float8 or (e->>'s')::float8 < 0 or length(e->>'t') > 500) then
    perform lms_x_err(400, 'bad_sub', '자막 형식이 올바르지 않습니다(시작 < 끝, 대사 500자 이내, 1~3000줄).');
  end if;
  select jsonb_agg(jsonb_build_object('s', round((e->>'s')::numeric, 3)::float8, 'e', round((e->>'e')::numeric, 3)::float8, 't', e->>'t') order by (e->>'s')::float8, o) into n
    from jsonb_array_elements(v) with ordinality u(e, o);
  return n;
end $$;
-- WebVTT · SRT 글 → 큐(묶음 I subParse와 같은 규칙)
create or replace function lms_v_vtt(txt text) returns jsonb language sql immutable as $$
  with t as (select replace(replace(coalesce(txt, ''), E'\r\n', E'\n'), E'\r', E'\n') x),
    b as (select blk, ord from t, regexp_split_to_table(t.x, E'\n[ \t]*\n') with ordinality u(blk, ord)),
    m as (select ord, blk, regexp_match(blk, '((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})[ \t]*-->[ \t]*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})') tm from b),
    q as (select ord, tm[1] a, tm[2] z, btrim(regexp_replace(regexp_replace(substring(blk from position(tm[2] in blk) + length(tm[2])), '^[^\n]*(\n|$)', ''), '<[^>]+>', '', 'g'), E' \t\n') tx from m where tm is not null),
    sec as (select q.*, (select sum(p::numeric * power(60::numeric, k.n - i)) from unnest(string_to_array(replace(q.a, ',', '.'), ':')) with ordinality u(p, i), (select cardinality(string_to_array(q.a, ':')) n) k) s,
      (select sum(p::numeric * power(60::numeric, k.n - i)) from unnest(string_to_array(replace(q.z, ',', '.'), ':')) with ordinality u(p, i), (select cardinality(string_to_array(q.z, ':')) n) k) e from q)
  select coalesce(jsonb_agg(jsonb_build_object('s', round(s, 3)::float8, 'e', round(e, 3)::float8, 't', left(tx, 500)) order by s, ord), '[]'::jsonb)
    from (select * from sec where tx <> '' and e > s order by s, ord limit 3000) z $$;
-- 데모 자막(STT 엔진이 없는 환경): 실제 음성이 아님을 대사에 밝힌다
create or replace function lms_v_demo_cues(dur numeric) returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object('s', (g * 6)::float8, 'e', least(g * 6 + 5.5, greatest(dur, 1))::float8,
    't', '[데모 자막 ' || (g + 1) || '] 음성 인식 엔진이 설치되지 않은 환경의 예시입니다. 실제 음성 내용이 아니므로 편집하거나 엔진을 연결한 뒤 다시 만드세요.') order by g), '[]'::jsonb)
  from generate_series(0, least(599, greatest(0, ceil(greatest(dur, 1) / 6)::int - 1))) g where g * 6 < greatest(dur, 1) $$;
-- 배치: 묶음 I 콘텐츠(진도 · 하트비트 · 자동출석) + 묶음 B 영상 자원(주차 · 차시) + 게시된 자막 복사
create or replace function lms_v_place_do(r lms_media, ses uuid, ttl text) returns jsonb language plpgsql as $$
declare s lms_session; cid uuid; rid uuid; dur int := greatest(1, ceil(coalesce(r.duration_sec, 1))::int); nm text;
begin
  select * into s from lms_session where session_id = ses;
  if s.session_id is null then perform lms_x_err(404, 'session', '없는 차시입니다.'); end if;
  perform lms_x_scope(s.section_id);
  nm := left(coalesce(nullif(btrim(ttl), ''), r.title), 120);
  select content_id into cid from lms_content where session_id = ses and src = 'media:' || r.media_id;
  if cid is null then
    insert into lms_content (tenant_id, session_id, title, duration_sec, src, qualities, check_at_sec)
    values (lms_x_tid(), ses, nm, dur, 'media:' || r.media_id, jsonb_build_array('auto') || coalesce((select jsonb_agg(x->'name') from jsonb_array_elements(r.renditions) x), '[]'), floor(dur * 0.8)::int)
    returning content_id into cid;
  else update lms_content set title = nm, duration_sec = dur where content_id = cid; end if;
  select res_id into rid from lms_b_resource where section_id = s.section_id and kind = 'video' and body->>'media_id' = r.media_id::text and deleted_at is null and session_id is not distinct from ses;
  if rid is null then
    insert into lms_b_resource (tenant_id, section_id, session_id, kind, title, body, completion, sort, owner_label)
    values (lms_x_tid(), s.section_id, ses, 'video', nm, jsonb_build_object('url', '', 'media_id', r.media_id, 'content_id', cid, 'player', 'lmsi'), '{"type":"view"}',
      coalesce((select max(sort) + 1 from lms_b_resource where section_id = s.section_id and session_id is not distinct from ses), 0), '강의 영상 관리')
    returning res_id into rid;
  end if;
  insert into lms_subtitle (tenant_id, content_id, lang, format, cues, updated_at)
    select lms_x_tid(), cid, c.lang, 'vtt', c.cues, now() from lms_media_cap c where c.media_id = r.media_id and c.status = 'published'
    on conflict (tenant_id, content_id, lang) do update set cues = excluded.cues, updated_at = now();
  return jsonb_build_object('content_id', cid, 'res_id', rid, 'section_id', s.section_id, 'session_id', ses, 'week_no', s.week_no, 'seq', s.seq,
    'section_title', (select title from lms_section where section_id = s.section_id), 'title', nm);
end $$;

-- ── 설정(전송 위치 원클릭 전환 · 서명 URL 유효 시간 · 도메인 · 자막 언어 · 보존 기간) ──
create or replace function lms_v_settings(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
begin perform lms_x_staff(ctx); return lms_v_set_json(lms_v_set()); end $$;
create or replace function lms_v_settings_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media_set := lms_v_set(); d text[]; tg text[]; v text;
begin
  perform lms_x_admin(ctx);
  if a ? 'delivery' then if a->>'delivery' not in ('origin', 'cdn') then perform lms_x_err(400, 'delivery', '전송 위치는 origin(우리 서버) 또는 cdn입니다.'); end if; r.delivery := a->>'delivery'; end if;
  if a ? 'cdn_base' then v := nullif(btrim(coalesce(a->>'cdn_base', '')), '');
    if v is not null and (v !~ '^https://[a-z0-9.-]+(:\d+)?(/[A-Za-z0-9._~/-]*)?$' or length(v) > 200) then perform lms_x_err(400, 'cdn_base', 'CDN 주소는 https://로 시작하는 주소여야 합니다.'); end if;
    r.cdn_base := regexp_replace(v, '/+$', ''); end if;
  if r.delivery = 'cdn' and r.cdn_base is null then perform lms_x_err(400, 'cdn_base', 'CDN으로 전환하려면 CDN 주소를 먼저 입력하세요.'); end if;
  if a ? 'ttl_sec' then r.ttl_sec := lms_x_num(a, 'ttl_sec', 60, 86400, 3600, '재생 주소 유효 시간')::int; end if;
  if a ? 'retain_days' then r.retain_days := lms_x_num(a, 'retain_days', 30, 3650, 365, '보존 기간')::int; end if;
  if a ? 'domains' then
    if jsonb_typeof(a->'domains') <> 'array' or jsonb_array_length(a->'domains') > 20 then perform lms_x_err(400, 'domains', '허용 도메인은 20개까지 목록으로 넣으세요.'); end if;
    select coalesce(array_agg(lower(btrim(x)) order by o), '{}') into d from jsonb_array_elements_text(a->'domains') with ordinality u(x, o) where btrim(x) <> '';
    if exists (select 1 from unnest(d) x where x !~ '^[a-z0-9.-]+(:\d+)?$') then perform lms_x_err(400, 'domains', '도메인 형식이 올바르지 않습니다(예: eclass.jnu.ac.kr).'); end if;
    r.domains := d; end if;
  if a ? 'stt_lang' then if not (a->>'stt_lang' = any(lms_v_langs())) then perform lms_x_err(400, 'lang', '지원하지 않는 언어입니다.'); end if; r.stt_lang := a->>'stt_lang'; end if;
  if a ? 'targets' then
    if jsonb_typeof(a->'targets') <> 'array' then perform lms_x_err(400, 'lang', '번역 언어는 목록으로 넣으세요.'); end if;
    select coalesce(array_agg(x order by o), '{}') into tg from jsonb_array_elements_text(a->'targets') with ordinality u(x, o);
    if exists (select 1 from unnest(tg) x where not (x = any(lms_v_langs()))) then perform lms_x_err(400, 'lang', '지원하지 않는 언어가 있습니다.'); end if;
    r.targets := tg; end if;
  insert into lms_media_set (tenant_id, delivery, cdn_base, ttl_sec, domains, stt_lang, targets, retain_days, updated_at)
  values (lms_x_tid(), r.delivery, r.cdn_base, r.ttl_sec, r.domains, r.stt_lang, r.targets, r.retain_days, now())
  on conflict (tenant_id) do update set delivery = excluded.delivery, cdn_base = excluded.cdn_base, ttl_sec = excluded.ttl_sec, domains = excluded.domains,
    stt_lang = excluded.stt_lang, targets = excluded.targets, retain_days = excluded.retain_days, updated_at = now();
  return lms_v_set_json(lms_v_set()) || jsonb_build_object('_audit', lms_x_audit('lms.v.settings', jsonb_build_object('delivery', r.delivery, 'ttl_sec', r.ttl_sec)));
end $$;

-- ── 올리기: 만들기 → 조각(1MB) → 마침(대기열) ──
create or replace function lms_v_create(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare st lms_media_set := lms_v_set(); r lms_media; sz bigint; k text := coalesce(a->>'kind', 'upload'); mm text; cs int := 1048576; ts numeric; te numeric; ses uuid; lg text;
begin
  perform lms_x_staff(ctx);
  if k not in ('upload', 'record') then perform lms_x_err(400, 'kind', '영상 종류가 올바르지 않습니다.'); end if;
  mm := lower(coalesce(lms_x_str(a, 'mime', 100, true, '파일 형식'), ''));
  if mm !~ '^(video|audio)/[a-z0-9.+-]+(;.*)?$' then perform lms_x_err(400, 'mime', '동영상 · 음성 파일만 올릴 수 있습니다.'); end if;
  mm := split_part(mm, ';', 1);
  sz := lms_x_num(a, 'size', 1, 4294967296, null, '파일 크기')::bigint;
  if sz is null then perform lms_x_err(400, 'required', '파일 크기를 입력하세요.'); end if;
  if sz > 2147483648 then perform lms_x_err(413, 'too_large', '영상은 2GB까지 올릴 수 있습니다.'); end if;
  if k = 'record' and coalesce(a->>'consent', '') <> 'true' then perform lms_x_err(400, 'consent', '녹화 영상은 촬영 · 녹음 동의가 필요합니다.'); end if;
  ts := lms_x_num(a, 'trim_start', 0, 36000, null, '앞 자르기'); te := lms_x_num(a, 'trim_end', 0, 36000, null, '뒤 자르기');
  if ts is not null and te is not null and te <= ts then perform lms_x_err(400, 'trim', '자르기 끝은 시작보다 뒤여야 합니다.'); end if;
  if nullif(a->>'session_id', '') is not null then ses := lms_x_uuid(a->>'session_id', '차시');
    if not exists (select 1 from lms_session where session_id = ses) then perform lms_x_err(404, 'session', '없는 차시입니다.'); end if;
    perform lms_x_scope((select section_id from lms_session where session_id = ses)); end if;
  lg := coalesce(nullif(a->>'stt_lang', ''), st.stt_lang); if not (lg = any(lms_v_langs())) then perform lms_x_err(400, 'lang', '지원하지 않는 언어입니다.'); end if;
  insert into lms_media (tenant_id, title, kind, owner_uid, src_name, src_mime, src_size, chunk_size, chunks, trim_start, trim_end, storage, access, domains, consent, retain_until, stt_auto, stt_lang, place_session, place_title)
  values (lms_x_tid(), lms_x_str(a, 'title', 120, true, '영상 제목'), k, ctx->>'uid', left(coalesce(a->>'name', ''), 200), mm, sz, cs, ceil(sz::numeric / cs)::int, ts, te,
    'db', 'enrolled', '{}',
    case when k = 'record' then jsonb_build_object('at', lms_x_ts(now()), 'by', ctx->>'email', 'ver', 'rec-v1', 'items', coalesce(a->'consent_items', '[]')) end,
    current_date + st.retain_days, lms_x_bool(a, 'stt', false), lg, ses, nullif(btrim(coalesce(a->>'place_title', '')), ''))
  returning * into r;
  perform lms_v_log_put(r.media_id, ctx, 'create');
  return jsonb_build_object('media', lms_v_json(r), '_audit', lms_x_audit('lms.v.create', jsonb_build_object('media_id', r.media_id, 'kind', k, 'size', sz)));
end $$;
create or replace function lms_v_chunk(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a); n int := lms_x_num(a, 'seq', 0, 100000, null, '조각 번호')::int; d bytea; want int;
begin
  if n is null then perform lms_x_err(400, 'required', '조각 번호를 입력하세요.'); end if;
  if r.status <> 'uploading' then perform lms_x_err(409, 'not_uploading', '이미 올리기를 마친 영상입니다.'); end if;
  if n >= r.chunks then perform lms_x_err(400, 'seq', '조각 번호가 범위를 벗어났습니다.'); end if;
  begin d := decode(coalesce(a->>'b64', ''), 'base64'); exception when others then perform lms_x_err(400, 'b64', '조각 내용(base64)이 올바르지 않습니다.'); end;
  want := case when n = r.chunks - 1 then (r.src_size - r.chunk_size::bigint * (r.chunks - 1))::int else r.chunk_size end;
  if d is null or length(d) <> want then perform lms_x_err(400, 'chunk_size', '조각 크기가 맞지 않습니다(' || want || '바이트).'); end if;
  insert into lms_media_obj (tenant_id, media_id, path, mime, size, store, data) values (lms_x_tid(), r.media_id, 'src/' || lpad(n::text, 6, '0'), r.src_mime, length(d), 'db', d)
    on conflict (tenant_id, media_id, path) do update set data = excluded.data, size = excluded.size;
  update lms_media set updated_at = now() where media_id = r.media_id;
  return jsonb_build_object('media_id', r.media_id, 'seq', n, 'received', (select count(*) from lms_media_obj where media_id = r.media_id and path like 'src/%'), 'chunks', r.chunks);
end $$;
create or replace function lms_v_finish(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a); got int; tot bigint;
begin
  if r.status <> 'uploading' then perform lms_x_err(409, 'not_uploading', '이미 올리기를 마친 영상입니다.'); end if;
  select count(*), coalesce(sum(size), 0) into got, tot from lms_media_obj where media_id = r.media_id and path like 'src/%';
  if got <> r.chunks or tot <> r.src_size then perform lms_x_err(409, 'incomplete', '아직 다 올라가지 않았습니다(' || got || '/' || r.chunks || '조각).'); end if;
  update lms_media set status = 'queued', progress = 0, updated_at = now() where media_id = r.media_id returning * into r;
  insert into lms_media_job (tenant_id, media_id, kind, step) values (lms_x_tid(), r.media_id, 'transcode', '대기');
  perform lms_v_log_put(r.media_id, ctx, 'upload');
  return jsonb_build_object('media', lms_v_json(r), '_audit', lms_x_audit('lms.v.finish', jsonb_build_object('media_id', r.media_id)));
end $$;

-- ── 목록 · 상세 ──
create or replace function lms_v_list(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare q text := lms_x_str(a, 'q', 60, false, '검색어');
begin
  perform lms_x_staff(ctx);
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(lms_v_json(m) order by m.created_at desc, m.media_id) from lms_media m where m.media_id in (select x.media_id from lms_media x where x.status <> 'deleted' and lms_v_can(x)
      and (q is null or x.title ilike '%' || q || '%') order by x.created_at desc, x.media_id limit 200)), '[]'),
    'counts', (select jsonb_build_object('ready', count(*) filter (where status = 'ready'), 'working', count(*) filter (where status in ('uploading', 'queued', 'processing')), 'failed', count(*) filter (where status = 'failed'),
      'no_caption', count(*) filter (where status = 'ready' and not exists (select 1 from lms_media_cap c where c.media_id = m.media_id and c.status = 'published')),
      'unplaced', count(*) filter (where status = 'ready' and not exists (select 1 from lms_content ct where ct.src = 'media:' || m.media_id))) from lms_media m where m.status <> 'deleted' and lms_v_can(m)),
    'settings', lms_v_set_json(lms_v_set()));
end $$;
create or replace function lms_v_get(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a);
begin
  return lms_v_json(r) || jsonb_build_object(
    'jobs', coalesce((select jsonb_agg(lms_v_job_json(j) order by j.created_at desc, j.job_id) from lms_media_job j where j.media_id = r.media_id), '[]'),
    'files', (select jsonb_build_object('count', count(*), 'bytes', coalesce(sum(size), 0), 'segments', count(*) filter (where path like '%.ts')) from lms_media_obj where media_id = r.media_id and path not like 'src/%' and path not like 'stt/%'),
    'places', coalesce((select jsonb_agg(jsonb_build_object('content_id', ct.content_id, 'section_id', s.section_id, 'section_title', sc.title, 'week_no', s.week_no, 'seq', s.seq, 'title', ct.title) order by sc.title, s.week_no, s.seq)
      from lms_content ct join lms_session s on s.session_id = ct.session_id join lms_section sc on sc.section_id = s.section_id where ct.src = 'media:' || r.media_id), '[]'),
    'log', coalesce((select jsonb_agg(jsonb_build_object('actor', l.actor, 'action', l.action, 'ip', l.ip, 'at', lms_x_ts(l.at)) order by l.at desc, l.id desc) from (select * from lms_media_log l where l.media_id = r.media_id order by l.at desc, l.id desc limit 30) l), '[]'));
end $$;
create or replace function lms_v_place(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a); o jsonb;
begin
  if r.status <> 'ready' then perform lms_x_err(409, 'not_ready', '변환이 끝난 영상만 배치할 수 있습니다.'); end if;
  o := lms_v_place_do(r, lms_x_uuid(a->>'session_id', '차시'), a->>'title');
  perform lms_v_log_put(r.media_id, ctx, 'place');
  return o || jsonb_build_object('_audit', lms_x_audit('lms.v.place', jsonb_build_object('media_id', r.media_id, 'session_id', o->>'session_id')));
end $$;
-- 영상별 접근 제한(수강생 · 교수자만) · 허용 도메인
create or replace function lms_v_access(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a); d text[] := r.domains; ac text := coalesce(nullif(a->>'access', ''), r.access);
begin
  if ac not in ('enrolled', 'staff') then perform lms_x_err(400, 'access', '공개 범위는 enrolled(수강생) 또는 staff(교수자 · 운영자만)입니다.'); end if;
  if a ? 'domains' then
    if jsonb_typeof(a->'domains') <> 'array' or jsonb_array_length(a->'domains') > 20 then perform lms_x_err(400, 'domains', '허용 도메인은 20개까지 목록으로 넣으세요.'); end if;
    select coalesce(array_agg(lower(btrim(x)) order by o), '{}') into d from jsonb_array_elements_text(a->'domains') with ordinality u(x, o) where btrim(x) <> '';
    if exists (select 1 from unnest(d) x where x !~ '^[a-z0-9.-]+(:\d+)?$') then perform lms_x_err(400, 'domains', '도메인 형식이 올바르지 않습니다(예: eclass.jnu.ac.kr).'); end if;
  end if;
  update lms_media set access = ac, domains = d, updated_at = now() where media_id = r.media_id returning * into r;
  perform lms_v_log_put(r.media_id, ctx, 'access');
  return jsonb_build_object('media', lms_v_json(r), '_audit', lms_x_audit('lms.v.access', jsonb_build_object('media_id', r.media_id, 'access', ac)));
end $$;
-- 소스 URL 재생성: 비밀 · 판 번호를 바꿔 이미 나간 재생 주소를 모두 끊는다
create or replace function lms_v_rotate(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a);
begin
  update lms_media set secret = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), url_ver = url_ver + 1, updated_at = now() where media_id = r.media_id returning * into r;
  perform lms_v_log_put(r.media_id, ctx, 'rotate');
  return jsonb_build_object('media_id', r.media_id, 'url_ver', r.url_ver, '_audit', lms_x_audit('lms.v.rotate', jsonb_build_object('media_id', r.media_id, 'url_ver', r.url_ver)));
end $$;
create or replace function lms_v_delete(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a); n int;
begin
  delete from lms_media_obj where media_id = r.media_id; get diagnostics n = row_count;
  delete from lms_media_job where media_id = r.media_id and status in ('queued', 'failed');
  update lms_media set status = 'deleted', updated_at = now() where media_id = r.media_id;
  perform lms_v_log_put(r.media_id, ctx, 'delete');
  return jsonb_build_object('media_id', r.media_id, 'deleted', true, 'files', n, 'store', r.storage, '_audit', lms_x_audit('lms.v.delete', jsonb_build_object('media_id', r.media_id)));
end $$;
create or replace function lms_v_log(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a);
begin
  return jsonb_build_object('media_id', r.media_id, 'log', coalesce((select jsonb_agg(jsonb_build_object('actor', l.actor, 'action', l.action, 'ip', l.ip, 'at', lms_x_ts(l.at)) order by l.at desc, l.id desc)
    from (select * from lms_media_log l where l.media_id = r.media_id order by l.at desc, l.id desc limit 500) l), '[]'));
end $$;

-- ── 재생 주소(서명 · 만료) · 스트리밍 ──
create or replace function lms_v_url(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare id uuid; r lms_media; st lms_media_set := lms_v_set(); pid uuid; e bigint; base text;
begin
  id := lms_x_uuid(regexp_replace(coalesce(a->>'media_id', ''), '^media:', ''), '영상');
  select * into r from lms_media where media_id = id and status <> 'deleted';
  if r.media_id is null then perform lms_x_err(404, 'media', '없는 영상입니다.'); end if;
  if ctx->>'kind' = 'learner' then
    pid := lms_x_learner(ctx);
    if r.access = 'staff' then perform lms_x_err(403, 'restricted', '교수자 · 운영자만 볼 수 있는 영상입니다.'); end if;
    if not exists (select 1 from lms_content ct join lms_session s on s.session_id = ct.session_id join lms_enrollment en on en.section_id = s.section_id and en.person_id = pid and en.status = 'enrolled' where ct.src = 'media:' || r.media_id) then
      perform lms_x_err(403, 'not_enrolled', '이 영상이 배치된 분반의 수강생만 볼 수 있습니다.'); end if;
  else
    perform lms_x_staff(ctx);
    if not lms_v_can(r) then perform lms_x_err(403, 'lms_role', '내가 올렸거나 담당 분반에 배치된 영상만 볼 수 있습니다.'); end if;
  end if;
  if r.status <> 'ready' then perform lms_x_err(409, 'not_ready', '아직 변환 중인 영상입니다.'); end if;
  e := floor(extract(epoch from now()))::bigint + st.ttl_sec;
  base := case when st.delivery = 'cdn' and st.cdn_base is not null then st.cdn_base else '' end;
  perform lms_v_log_put(r.media_id, ctx, 'url');
  return jsonb_build_object('media_id', r.media_id, 'url', base || '/api/lms/v/hls?' || lms_v_q(r, e) || '&f=master.m3u8', 'poster', base || '/api/lms/v/hls?' || lms_v_q(r, e) || '&f=poster.jpg',
    'expires_at', lms_x_ts(to_timestamp(e)), 'delivery', st.delivery, 'renditions', r.renditions, 'duration_sec', r.duration_sec::float8, 'type', 'application/vnd.apple.mpegurl');
end $$;
-- ctx.kind = none(쿠키 없음) | staff | learner, ctx.ref = 요청 Referer · Origin의 호스트(없으면 null). 기관(app.tenant)은 서버가 t로 정한다.
create or replace function lms_v_hls(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare id uuid; r lms_media; st lms_media_set := lms_v_set(); f text := coalesce(a->>'f', ''); e bigint; o lms_media_obj; d text[]; dir text; pl boolean; body text;
begin
  if f !~ '^(master\.m3u8|poster\.jpg|\d{2,4}p/(index\.m3u8|seg_\d{3,5}\.ts))$' then perform lms_x_err(400, 'bad_file', '요청한 파일 이름이 올바르지 않습니다.'); end if;
  begin id := (a->>'m')::uuid; e := (a->>'e')::bigint; exception when others then perform lms_x_err(403, 'bad_sig', '재생 주소가 올바르지 않습니다.'); end;
  select * into r from lms_media where media_id = id and status = 'ready';
  if r.media_id is null then perform lms_x_err(404, 'media', '없는 영상입니다.'); end if;
  if coalesce(a->>'s', '') <> lms_v_sig(r, e) then perform lms_x_err(403, 'bad_sig', '재생 주소가 올바르지 않거나 다시 만들어졌습니다. 새로 고침하세요.'); end if;
  if e < floor(extract(epoch from now()))::bigint then perform lms_x_err(403, 'expired', '재생 주소의 유효 시간이 지났습니다. 새로 고침하세요.'); end if;
  pl := f like '%.m3u8';
  d := case when cardinality(r.domains) > 0 then r.domains else st.domains end;
  if pl and cardinality(d) > 0 and (ctx->>'ref' is null or not (lower(ctx->>'ref') = any(d))) then perform lms_x_err(403, 'domain', '허용되지 않은 사이트에서 재생을 요청했습니다.'); end if;
  if pl and st.delivery = 'origin' and coalesce(ctx->>'kind', 'none') = 'none' then perform lms_x_err(401, 'auth', '로그인한 상태에서만 재생할 수 있습니다.'); end if;
  select * into o from lms_media_obj where media_id = r.media_id and path = f;
  if o.path is null then perform lms_x_err(404, 'file', '없는 파일입니다.'); end if;
  if pl then
    dir := case when f = 'master.m3u8' then '' else split_part(f, '/', 1) || '/' end;
    body := regexp_replace(convert_from(o.data, 'UTF8'), '^([^#\n][^\n]*)$', 'hls?' || lms_v_q(r, e) || '&f=' || dir || '\1', 'gn');
    if f = 'master.m3u8' then perform lms_v_log_put(r.media_id, ctx, 'play'); end if;
    return jsonb_build_object('kind', 'text', 'mime', 'application/vnd.apple.mpegurl', 'cache', 'private, max-age=30', 'body', body);
  end if;
  return jsonb_build_object('kind', 'obj', 'mime', o.mime, 'cache', 'public, max-age=86400, immutable', 'store', o.store, 'path', o.path, 'size', o.size, 'media_id', r.media_id);
end $$;

-- ── 자막(자동 생성 · 편집 · 번역 · 게시) ──
create or replace function lms_v_stt(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a); lg text := coalesce(nullif(a->>'lang', ''), r.stt_lang, lms_v_set_json(lms_v_set())->>'stt_lang'); j lms_media_job;
begin
  if not (lg = any(lms_v_langs())) then perform lms_x_err(400, 'lang', '지원하지 않는 언어입니다.'); end if;
  if r.status <> 'ready' then perform lms_x_err(409, 'not_ready', '변환이 끝난 영상에서 자막을 만들 수 있습니다.'); end if;
  if exists (select 1 from lms_media_job where media_id = r.media_id and kind = 'stt' and status in ('queued', 'running')) then perform lms_x_err(409, 'busy', '자막을 만드는 중입니다. 잠시 뒤 확인하세요.'); end if;
  insert into lms_media_job (tenant_id, media_id, kind, lang, step) values (lms_x_tid(), r.media_id, 'stt', lg, '대기') returning * into j;
  return jsonb_build_object('job', lms_v_job_json(j), '_audit', lms_x_audit('lms.v.stt', jsonb_build_object('media_id', r.media_id, 'lang', lg)));
end $$;
create or replace function lms_v_caps(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a);
begin
  return jsonb_build_object('media_id', r.media_id, 'duration_sec', r.duration_sec::float8, 'targets', to_jsonb((lms_v_set()).targets),
    'captions', coalesce((select jsonb_agg(jsonb_build_object('lang', c.lang, 'status', c.status, 'source', c.source, 'engine', c.engine, 'cues', c.cues, 'updated_at', lms_x_ts(c.updated_at), 'published_at', lms_x_ts(c.published_at)) order by c.lang)
      from lms_media_cap c where c.media_id = r.media_id), '[]'),
    'job', (select lms_v_job_json(j) from lms_media_job j where j.media_id = r.media_id and j.kind = 'stt' order by j.created_at desc, j.job_id limit 1));
end $$;
create or replace function lms_v_cap_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a); lg text := coalesce(a->>'lang', ''); src text := coalesce(nullif(a->>'source', ''), 'edit'); cu jsonb;
begin
  if not (lg = any(lms_v_langs())) then perform lms_x_err(400, 'lang', '지원하지 않는 언어입니다.'); end if;
  if src not in ('edit', 'translate', 'upload') then perform lms_x_err(400, 'source', '자막 출처가 올바르지 않습니다.'); end if;
  if jsonb_typeof(a->'text') = 'string' then
    if length(a->>'text') > 300000 then perform lms_x_err(413, 'too_large', '자막 파일은 300KB까지입니다.'); end if;
    cu := lms_v_vtt(a->>'text'); if jsonb_array_length(cu) = 0 then perform lms_x_err(400, 'bad_sub', '자막 파일 형식이 올바르지 않습니다(VTT · SRT).'); end if;
  else cu := lms_v_cues(a->'cues'); end if;
  insert into lms_media_cap (tenant_id, media_id, lang, cues, source, engine, status, updated_at)
  values (lms_x_tid(), r.media_id, lg, cu, src, case when src = 'translate' then left(coalesce(a->>'engine', 'claude'), 40) end, 'draft', now())
  on conflict (tenant_id, media_id, lang) do update set cues = excluded.cues, source = excluded.source, engine = excluded.engine, status = 'draft', updated_at = now();
  return jsonb_build_object('media_id', r.media_id, 'lang', lg, 'cues', jsonb_array_length(cu), 'status', 'draft', 'source', src);
end $$;
create or replace function lms_v_cap_publish(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_media := lms_v_mine(ctx, a); lg text := coalesce(a->>'lang', ''); c lms_media_cap; n int;
begin
  select * into c from lms_media_cap where media_id = r.media_id and lang = lg;
  if c.lang is null then perform lms_x_err(404, 'caption', '이 언어의 자막이 없습니다.'); end if;
  update lms_media_cap set status = 'published', published_at = now() where media_id = r.media_id and lang = lg;
  insert into lms_subtitle (tenant_id, content_id, lang, format, cues, updated_at)
    select lms_x_tid(), ct.content_id, lg, 'vtt', c.cues, now() from lms_content ct where ct.src = 'media:' || r.media_id
    on conflict (tenant_id, content_id, lang) do update set cues = excluded.cues, updated_at = now();
  get diagnostics n = row_count;
  perform lms_v_log_put(r.media_id, ctx, 'caption:' || lg);
  return jsonb_build_object('media_id', r.media_id, 'lang', lg, 'status', 'published', 'contents', n, '_audit', lms_x_audit('lms.v.caption', jsonb_build_object('media_id', r.media_id, 'lang', lg)));
end $$;

-- ── 작업기(Node lms/media/worker.js · Java LmsVWorker) — ctx.kind = 'worker'만 ──
create or replace function lms_v_w(ctx jsonb) returns void language plpgsql as $$
begin if coalesce(ctx->>'kind', '') <> 'worker' then perform lms_x_err(403, 'role', '작업기 전용입니다.'); end if; end $$;
create or replace function lms_v_w_job(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare j lms_media_job; r lms_media;
begin
  perform lms_v_w(ctx);
  update lms_media_job set status = 'running', attempts = attempts + 1, started_at = now(), engine = case when kind = 'transcode' then left(ctx->>'engine', 40) else engine end, step = '시작', error = null
    where job_id = (a->>'job_id')::uuid and status in ('queued', 'running') returning * into j;
  if j.job_id is null then return null; end if;
  select * into r from lms_media where media_id = j.media_id;
  if r.status = 'deleted' then update lms_media_job set status = 'failed', error = '삭제된 영상', finished_at = now() where job_id = j.job_id; return null; end if;
  if j.kind = 'transcode' then update lms_media set status = 'processing', progress = 0, error = null, updated_at = now() where media_id = r.media_id; end if;
  return jsonb_build_object('job_id', j.job_id, 'kind', j.kind, 'lang', j.lang, 'attempts', j.attempts, 'media_id', r.media_id, 'storage', r.storage, 'src_mime', r.src_mime, 'src_size', r.src_size,
    'chunks', r.chunks, 'trim_start', r.trim_start::float8, 'trim_end', r.trim_end::float8, 'duration_sec', r.duration_sec::float8, 'has_audio', r.has_audio);
end $$;
create or replace function lms_v_w_progress(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare j lms_media_job; p int := greatest(0, least(99, coalesce((a->>'progress')::int, 0)));
begin
  perform lms_v_w(ctx);
  update lms_media_job set progress = p, step = left(coalesce(a->>'step', step), 60) where job_id = (a->>'job_id')::uuid and status = 'running' returning * into j;
  if j.kind = 'transcode' then update lms_media set progress = p, updated_at = now() where media_id = j.media_id; end if;
  return jsonb_build_object('ok', j.job_id is not null);
end $$;
create or replace function lms_v_w_transcoded(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare j lms_media_job; r lms_media; pl jsonb; sj uuid;
begin
  perform lms_v_w(ctx);
  select * into j from lms_media_job where job_id = (a->>'job_id')::uuid and status = 'running' and kind = 'transcode';
  if j.job_id is null then perform lms_x_err(409, 'job', '실행 중인 변환 작업이 아닙니다.'); end if;
  if not exists (select 1 from lms_media_obj where media_id = j.media_id and path = 'master.m3u8') then perform lms_x_err(409, 'no_output', '변환 결과(master.m3u8)가 없습니다.'); end if;
  delete from lms_media_obj where media_id = j.media_id and path like 'src/%';
  update lms_media set status = 'ready', progress = 100, ready_at = now(), updated_at = now(), duration_sec = (a->>'duration_sec')::numeric, width = (a->>'width')::int, height = (a->>'height')::int,
    has_audio = coalesce((a->>'has_audio')::boolean, false), renditions = coalesce(a->'renditions', '[]'),
    storage = case when a->>'storage' in ('db', 'disk', 'gcs') then a->>'storage' else storage end, error = null where media_id = j.media_id returning * into r;
  update lms_media_job set status = 'done', progress = 100, step = '완료', finished_at = now() where job_id = j.job_id;
  if r.place_session is not null and exists (select 1 from lms_session where session_id = r.place_session) then pl := lms_v_place_do(r, r.place_session, r.place_title); end if;
  if r.stt_auto and r.has_audio then insert into lms_media_job (tenant_id, media_id, kind, lang, step) values (lms_x_tid(), r.media_id, 'stt', coalesce(r.stt_lang, 'ko'), '대기') returning job_id into sj; end if;
  return jsonb_build_object('media_id', r.media_id, 'status', r.status, 'placed', pl, 'stt_job', sj);
end $$;
create or replace function lms_v_w_stt(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare j lms_media_job; r lms_media; cu jsonb; demo boolean := coalesce(a->>'engine', '') = 'demo';
begin
  perform lms_v_w(ctx);
  select * into j from lms_media_job where job_id = (a->>'job_id')::uuid and status = 'running' and kind = 'stt';
  if j.job_id is null then perform lms_x_err(409, 'job', '실행 중인 자막 작업이 아닙니다.'); end if;
  select * into r from lms_media where media_id = j.media_id;
  cu := case when demo then lms_v_demo_cues(coalesce(r.duration_sec, 30)) else lms_v_vtt(a->>'vtt') end;
  if jsonb_array_length(cu) = 0 then cu := jsonb_build_array(jsonb_build_object('s', 0, 'e', least(5, greatest(coalesce(r.duration_sec, 5)::float8, 1)), 't', '(인식된 음성이 없습니다)')); end if;
  insert into lms_media_cap (tenant_id, media_id, lang, cues, source, engine, status, updated_at)
  values (lms_x_tid(), r.media_id, j.lang, cu, case when demo then 'demo' else 'stt' end, left(a->>'engine', 40), 'draft', now())
  on conflict (tenant_id, media_id, lang) do update set cues = excluded.cues, source = excluded.source, engine = excluded.engine, status = 'draft', updated_at = now();
  update lms_media_job set status = 'done', progress = 100, step = '완료', engine = left(a->>'engine', 40), finished_at = now() where job_id = j.job_id;
  return jsonb_build_object('media_id', r.media_id, 'lang', j.lang, 'cues', jsonb_array_length(cu), 'source', case when demo then 'demo' else 'stt' end);
end $$;
create or replace function lms_v_w_fail(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare j lms_media_job; again boolean;
begin
  perform lms_v_w(ctx);
  select * into j from lms_media_job where job_id = (a->>'job_id')::uuid;
  if j.job_id is null then return jsonb_build_object('ok', false); end if;
  again := j.attempts < 3 and coalesce((a->>'final')::boolean, false) = false;
  update lms_media_job set status = case when again then 'queued' else 'failed' end, error = left(coalesce(a->>'error', '알 수 없는 오류'), 500), step = case when again then '다시 시도 대기' else '실패' end,
    finished_at = case when again then null else now() end where job_id = j.job_id;
  if j.kind = 'transcode' and not again then update lms_media set status = 'failed', error = left(coalesce(a->>'error', '변환 실패'), 500), updated_at = now() where media_id = j.media_id; end if;
  if j.kind = 'transcode' and again then update lms_media set status = 'queued', updated_at = now() where media_id = j.media_id; end if;
  return jsonb_build_object('ok', true, 'retry', again);
end $$;
-- 보존 기한이 지난 영상 자동 파기(작업기가 한 시간마다 기관별로 부른다). 디스크 · GCS 객체는 돌려준 목록으로 어댑터가 지운다.
create or replace function lms_v_w_purge(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare ids jsonb;
begin
  perform lms_v_w(ctx);
  select coalesce(jsonb_agg(jsonb_build_object('media_id', media_id, 'storage', storage)), '[]') into ids from lms_media where status <> 'deleted' and retain_until < current_date;
  delete from lms_media_obj o using lms_media m where m.media_id = o.media_id and m.status <> 'deleted' and m.retain_until < current_date;
  insert into lms_media_log (tenant_id, media_id, actor, action) select lms_x_tid(), media_id, 'system', 'purge' from lms_media where status <> 'deleted' and retain_until < current_date;
  update lms_media set status = 'deleted', updated_at = now() where status <> 'deleted' and retain_until < current_date;
  return jsonb_build_object('purged', ids);
end $$;

-- ── 실시간 수업 음성 후처리(x2 a2_live.sql의 lms_live_cap_audio, hook = 'lmsVodSubtitleJob') — 같은 STT 어댑터로 처리 ──
-- 표가 없는 DB(x2 미병합)에서는 아무것도 하지 않는다. file_ids = 묶음 E lms_file 조각(순서대로 이어 붙이면 원본 음성)
create or replace function lms_v_w_live_claim(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r record;
begin
  perform lms_v_w(ctx);
  if to_regclass('lms_live_cap_audio') is null then return null; end if;
  execute $q$update lms_live_cap_audio set status = 'running' where job_id = (select job_id from lms_live_cap_audio where status = 'queued' and hook = 'lmsVodSubtitleJob'
    order by created_at limit 1 for update skip locked) returning job_id, lang, file_ids$q$ into r;
  if r.job_id is null then return null; end if;
  return jsonb_build_object('job_id', r.job_id, 'lang', r.lang, 'file_ids', r.file_ids);
end $$;
create or replace function lms_v_w_live_done(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare demo boolean := coalesce(a->>'engine', '') = 'demo'; cu jsonb; ok boolean := coalesce(a->>'error', '') = '';
begin
  perform lms_v_w(ctx);
  if to_regclass('lms_live_cap_audio') is null then return null; end if;
  cu := case when not ok then '[]'::jsonb when demo then lms_v_demo_cues(coalesce((a->>'duration_sec')::numeric, 30)) else lms_v_vtt(a->>'vtt') end;
  execute $q$update lms_live_cap_audio set status = $2, done_at = now(), result = $3 where job_id = $1$q$
    using (a->>'job_id')::uuid, case when ok then 'done' else 'failed' end,
      case when ok then jsonb_build_object('engine', left(a->>'engine', 40), 'source', case when demo then 'demo' else 'stt' end, 'cues', cu, 'vtt_cues', jsonb_array_length(cu))
      else jsonb_build_object('error', left(a->>'error', 400)) end;
  return jsonb_build_object('job_id', a->>'job_id', 'cues', jsonb_array_length(cu), 'ok', ok);
end $$;
