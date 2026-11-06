-- 외부 연계 자체 구현 x2 — 실시간 수업(SFR-024 · 049 · 072) · AI 실시간 자막 · 번역(SFR-077)
--  ① 실시간 수업: 우리 서버 신호 중계(폴링) + 브라우저 WebRTC. 소그룹 = 메시(최대 6명 발언) · 방송 = 교수자 P2P 분배(기관 설정 한도) · 외부 링크(Zoom · Teams) 그대로
--     TURN(coturn) · SFU 어댑터 주소는 기관 설정(lms_live_setting). 대규모 수업은 SFU 연동 후 동작(어댑터 지점만 둔다)
--  ② 채팅 · 손들기 · 질문(Q&A) · 투표, 접속 시간 누적 → 수업 종료 때 묶음 G 출결(lms_attendance method 'live' + lms_attendance_log)에 자동 기록
--  ③ 녹화: 교수자 브라우저 MediaRecorder → 2MB 조각 업로드 → 강의자료(lms_b_resource video)로 등록. 동의 · 보존 기간 · 자동 파기 · 열람 기록
--  ④ 자막: 묶음 O 자막방(lms_o_caption_room · line)을 넓힌다 — 발화 언어 · 공개 범위 · 대본 · 요약 · 강의별 사용 설정 · 이용 현황 · 음성 파일 후처리 대기열(VOD 자막 연결 지점)
-- 함수 규약: lms_live_<이름>(ctx jsonb, a jsonb) returns jsonb — Node(mod-live.js) · Java(lms.live)가 같은 함수를 부른다(efh 게이트웨이).

-- ── 표 ──
create table if not exists lms_live_setting (
  tenant_id  text not null references tenants(id) on delete cascade,
  stun_urls  text[] not null default '{stun:stun.l.google.com:19302}',
  turn_urls  text[] not null default '{}',
  turn_user  text, turn_cred text,
  sfu_url    text,                                   -- SFU 어댑터(대규모 수업) — 연동 후 동작
  mesh_max   int not null default 6 check (mesh_max between 2 and 12),
  fanout_max int not null default 25 check (fanout_max between 1 and 60),
  rec_days   int not null default 180 check (rec_days between 1 and 1825),
  att_min_pct int not null default 70 check (att_min_pct between 1 and 100),
  updated_at timestamptz not null default now(),
  primary key (tenant_id)
);
create table if not exists lms_live_room (
  tenant_id  text not null,
  room_id    uuid not null default gen_random_uuid(),
  section_id uuid not null,
  session_id uuid,
  title      text not null,
  mode       text not null default 'mesh' check (mode in ('mesh','broadcast','link')),
  ext_url    text,
  status     text not null default 'ready' check (status in ('ready','live','ended')),
  code       text not null,
  host_key   text not null,
  rec_allowed boolean not null default false,
  started_at timestamptz, ended_at timestamptz,
  att        jsonb,
  created_at timestamptz not null default now(),
  primary key (tenant_id, room_id), unique (tenant_id, code),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, session_id) references lms_session (tenant_id, session_id) on delete set null (session_id)
);
create table if not exists lms_live_peer (
  tenant_id text not null,
  peer_id   uuid not null default gen_random_uuid(),
  room_id   uuid not null,
  role      text not null check (role in ('host','student')),
  owner     text not null,                           -- u:<운영자 uid> · m:<학번>
  member_no text,
  label     text not null,
  state     text not null default 'on' check (state in ('on','left','replaced')),
  hand      boolean not null default false,
  device    text,
  joined_at timestamptz not null default now(), seen_at timestamptz not null default now(), left_at timestamptz,
  primary key (tenant_id, peer_id),
  foreign key (tenant_id, room_id) references lms_live_room (tenant_id, room_id) on delete cascade
);
create index if not exists lms_live_peer_room on lms_live_peer (tenant_id, room_id, state);
create index if not exists lms_live_peer_owner on lms_live_peer (tenant_id, owner, state);
create table if not exists lms_live_sig (
  tenant_id text not null, id bigserial, room_id uuid not null, src uuid not null, dst uuid,
  kind text not null check (kind in ('offer','answer','ice','bye','renego','kick')), data jsonb not null default '{}',
  at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, room_id) references lms_live_room (tenant_id, room_id) on delete cascade
);
create index if not exists lms_live_sig_room on lms_live_sig (tenant_id, room_id, id);
create table if not exists lms_live_evt (
  tenant_id text not null, id bigserial, room_id uuid not null, peer_id uuid, by_label text not null, member_no text,
  kind text not null check (kind in ('chat','hand','lower','qa','answer','poll','vote','close','sys','rec')),
  ref bigint, body jsonb not null default '{}', at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, room_id) references lms_live_room (tenant_id, room_id) on delete cascade
);
create index if not exists lms_live_evt_room on lms_live_evt (tenant_id, room_id, id);
create table if not exists lms_live_att (
  tenant_id text not null, room_id uuid not null, member_no text not null, person_id uuid,
  first_at timestamptz not null default now(), last_at timestamptz not null default now(), sec int not null default 0, joins int not null default 1,
  primary key (tenant_id, room_id, member_no),
  foreign key (tenant_id, room_id) references lms_live_room (tenant_id, room_id) on delete cascade
);
create table if not exists lms_live_rec (
  tenant_id text not null, rec_id uuid not null default gen_random_uuid(), room_id uuid not null,
  mime text not null default 'video/webm', parts int not null default 0, bytes bigint not null default 0,
  status text not null default 'rec' check (status in ('rec','done','deleted')),
  res_id uuid, retain_until timestamptz not null, consent jsonb not null default '{}',
  created_by text not null, created_at timestamptz not null default now(), done_at timestamptz, deleted_at timestamptz, delete_reason text,
  primary key (tenant_id, rec_id),
  foreign key (tenant_id, room_id) references lms_live_room (tenant_id, room_id) on delete cascade
);
create table if not exists lms_live_rec_part (
  tenant_id text not null, rec_id uuid not null, idx int not null, data bytea not null,
  primary key (tenant_id, rec_id, idx),
  foreign key (tenant_id, rec_id) references lms_live_rec (tenant_id, rec_id) on delete cascade
);
create table if not exists lms_live_rec_view (
  tenant_id text not null, id bigserial, rec_id uuid not null, who text not null, at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, rec_id) references lms_live_rec (tenant_id, rec_id) on delete cascade
);
-- 자막(묶음 O 자막방 확장)
alter table lms_o_caption_room add column if not exists src_lang text not null default 'ko';
alter table lms_o_caption_room add column if not exists visibility text not null default 'private';
alter table lms_o_caption_room add column if not exists transcript text;
alter table lms_o_caption_room add column if not exists summary text;
alter table lms_o_caption_room add column if not exists summary_engine text;
alter table lms_o_caption_room add column if not exists finished_at timestamptz;
alter table lms_o_caption_room add column if not exists live_room_id uuid;
alter table lms_o_caption_room add column if not exists created_by text;
alter table lms_o_caption_line add column if not exists tr_engine jsonb not null default '{}';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lms_o_caption_room_vis_check') then
    alter table lms_o_caption_room add constraint lms_o_caption_room_vis_check check (visibility in ('private','public'));
  end if;
end $$;
create table if not exists lms_live_cap_setting (
  tenant_id text not null, section_id uuid not null,
  enabled boolean not null default true, src_lang text not null default 'ko', langs jsonb not null default '["ko","en"]',
  visibility text not null default 'private' check (visibility in ('private','public')),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, section_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_live_cap_view (
  tenant_id text not null, room_id uuid not null, lang text not null, viewer text not null, day date not null default current_date,
  primary key (tenant_id, room_id, lang, viewer, day),
  foreign key (tenant_id, room_id) references lms_o_caption_room (tenant_id, room_id) on delete cascade
);
-- 음성 파일 후처리(브라우저 받아쓰기를 못 쓸 때) — VOD 자막 파이프라인(묶음 I · x1)이 가져가는 대기열
create table if not exists lms_live_cap_audio (
  tenant_id text not null, job_id uuid not null default gen_random_uuid(), room_id uuid not null, file_ids jsonb not null, lang text not null,
  hook text not null default 'lmsVodSubtitleJob', status text not null default 'queued' check (status in ('queued','running','done','failed')),
  result jsonb, created_by text not null, created_at timestamptz not null default now(), done_at timestamptz,
  primary key (tenant_id, job_id),
  foreign key (tenant_id, room_id) references lms_o_caption_room (tenant_id, room_id) on delete cascade
);

do $$ declare t text; begin
  foreach t in array array['lms_live_setting','lms_live_room','lms_live_peer','lms_live_sig','lms_live_evt','lms_live_att','lms_live_rec','lms_live_rec_part','lms_live_rec_view','lms_live_cap_setting','lms_live_cap_view','lms_live_cap_audio'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_live_sig_id_seq, lms_live_evt_id_seq, lms_live_rec_view_id_seq to didisam_tenant;
end $$;

-- ── 도우미 ──
create or replace function lms_lv_langs() returns text[] language sql immutable as $$ select array['ko','en','ja','zh','vi','uz','mn','ru','es','fr','de','id'] $$;
create or replace function lms_lv_code() returns text language sql volatile as $$ select substr(replace(gen_random_uuid()::text, '-', ''), 1, 10) $$;
create or replace function lms_lv_owner(ctx jsonb) returns text language plpgsql as $$
begin
  if ctx->>'kind' = 'staff' and coalesce(ctx->>'uid', '') <> '' then return 'u:' || (ctx->>'uid'); end if;
  if ctx->>'kind' = 'learner' and coalesce(ctx->>'sid', '') <> '' then return 'm:' || (ctx->>'sid'); end if;
  perform lms_x_err(401, 'auth', '로그인이 필요합니다.'); return null;
end $$;
create or replace function lms_lv_set() returns lms_live_setting language plpgsql as $$
declare s lms_live_setting;
begin
  select * into s from lms_live_setting where tenant_id = lms_x_tid();
  if s.tenant_id is null then insert into lms_live_setting (tenant_id) values (lms_x_tid()) on conflict do nothing; select * into s from lms_live_setting where tenant_id = lms_x_tid(); end if;
  return s;
end $$;
create or replace function lms_lv_room(id uuid) returns lms_live_room language plpgsql as $$
declare r lms_live_room;
begin
  select * into r from lms_live_room where room_id = id;
  if r.room_id is null then perform lms_x_err(404, 'room', '실시간 수업을 찾을 수 없습니다.'); end if;
  return r;
end $$;
create or replace function lms_lv_room_j(r lms_live_room) returns jsonb language sql stable as $$
  select jsonb_build_object('room_id', r.room_id, 'section_id', r.section_id, 'session_id', r.session_id, 'title', r.title, 'mode', r.mode, 'ext_url', r.ext_url,
    'status', r.status, 'code', r.code, 'rec_allowed', r.rec_allowed, 'started_at', lms_x_ts(r.started_at), 'ended_at', lms_x_ts(r.ended_at), 'att', r.att, 'created_at', lms_x_ts(r.created_at),
    'section_title', (select s.title from lms_section s where s.section_id = r.section_id),
    'session', (select jsonb_build_object('week_no', x.week_no, 'seq', x.seq, 'starts_at', lms_x_ts(x.starts_at)) from lms_session x where x.session_id = r.session_id),
    'online', (select count(*)::int from lms_live_peer p where p.room_id = r.room_id and p.state = 'on'),
    'recording', exists (select 1 from lms_live_rec c where c.room_id = r.room_id and c.status = 'rec')) $$;
-- 교수자 화면: 분반 범위(담당 분반만) 확인 후 방
create or replace function lms_lv_staff_room(ctx jsonb, a jsonb) returns lms_live_room language plpgsql as $$
declare r lms_live_room;
begin
  perform lms_x_staff(ctx);
  r := lms_lv_room(lms_x_uuid(a->>'room_id', '실시간 수업'));
  perform lms_x_scope(r.section_id);
  return r;
end $$;
-- 참여자 확인: 내 연결이고 접속 중이어야 한다
create or replace function lms_lv_me(ctx jsonb, a jsonb) returns lms_live_peer language plpgsql as $$
declare p lms_live_peer;
begin
  select * into p from lms_live_peer where peer_id = lms_x_uuid(a->>'peer_id', '연결') and room_id = lms_x_uuid(a->>'room_id', '실시간 수업');
  if p.peer_id is null or p.owner <> lms_lv_owner(ctx) then perform lms_x_err(404, 'peer', '연결 정보를 찾을 수 없습니다. 다시 입장하세요.'); end if;
  if p.state = 'replaced' then perform lms_x_err(409, 'replaced', '다른 기기 · 창에서 같은 학번으로 입장해 이 화면의 연결을 끊었습니다(중복 접속 차단).'); end if;
  if p.state = 'left' then perform lms_x_err(409, 'left', '연결이 끊겼습니다. 다시 입장하세요.'); end if;
  return p;
end $$;

-- ── 설정(TURN · SFU · 한도 · 보존 기간) ──
create or replace function lms_live_setting(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_live_setting; adm boolean;
begin
  perform lms_x_staff(ctx); s := lms_lv_set(); adm := ctx->>'role' in ('owner','sub');
  return jsonb_build_object('stun_urls', to_jsonb(s.stun_urls), 'turn_urls', to_jsonb(s.turn_urls), 'turn_user', case when adm then s.turn_user end, 'turn_cred_set', s.turn_cred is not null,
    'sfu_url', s.sfu_url, 'mesh_max', s.mesh_max, 'fanout_max', s.fanout_max, 'rec_days', s.rec_days, 'att_min_pct', s.att_min_pct, 'updated_at', lms_x_ts(s.updated_at),
    'limits', '실시간 수업은 브라우저끼리 직접 연결합니다. 소그룹(메시)은 최대 6명 발언, 방송은 교수자 1명이 설정 인원까지 직접 보냅니다. 그보다 큰 수업은 SFU 연동 후 동작합니다.');
end $$;
create or replace function lms_live_setting_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_live_setting; u text; v text[];
begin
  perform lms_x_admin(ctx); s := lms_lv_set();
  if a ? 'stun_urls' or a ? 'turn_urls' then
    foreach u in array array['stun_urls','turn_urls'] loop
      if a ? u then
        if jsonb_typeof(a->u) <> 'array' or jsonb_array_length(a->u) > 6 then perform lms_x_err(400, 'ice', 'STUN · TURN 주소는 6개까지 목록으로 넣으세요.'); end if;
        select coalesce(array_agg(x), '{}') into v from jsonb_array_elements_text(a->u) x;
        if exists (select 1 from unnest(v) x where x !~ '^(stun|turn|turns):[A-Za-z0-9.\-]+(:\d{2,5})?(\?transport=(udp|tcp))?$') then perform lms_x_err(400, 'ice', 'STUN · TURN 주소 형식이 올바르지 않습니다(예: turn:turn.example.ac.kr:3478).'); end if;
        if u = 'stun_urls' then s.stun_urls := v; else s.turn_urls := v; end if;
      end if;
    end loop;
  end if;
  if a ? 'turn_user' then s.turn_user := lms_x_str(a, 'turn_user', 100, false, 'TURN 사용자'); end if;
  if a ? 'turn_cred' then s.turn_cred := lms_x_str(a, 'turn_cred', 200, false, 'TURN 비밀번호'); end if;
  if a ? 'sfu_url' then s.sfu_url := lms_x_str(a, 'sfu_url', 300, false, 'SFU 주소');
    if s.sfu_url is not null and s.sfu_url !~ '^(https|wss)://[A-Za-z0-9.\-]+(:\d{2,5})?(/[A-Za-z0-9._~/\-]*)?$' then perform lms_x_err(400, 'sfu', 'SFU 주소는 https:// 또는 wss:// 로 시작해야 합니다.'); end if; end if;
  s.mesh_max := lms_x_num(a, 'mesh_max', 2, 12, s.mesh_max, '소그룹 인원');
  s.fanout_max := lms_x_num(a, 'fanout_max', 1, 60, s.fanout_max, '방송 인원');
  s.rec_days := lms_x_num(a, 'rec_days', 1, 1825, s.rec_days, '녹화 보존 기간');
  s.att_min_pct := lms_x_num(a, 'att_min_pct', 1, 100, s.att_min_pct, '출석 인정 비율');
  update lms_live_setting set stun_urls = s.stun_urls, turn_urls = s.turn_urls, turn_user = s.turn_user, turn_cred = s.turn_cred, sfu_url = s.sfu_url,
    mesh_max = s.mesh_max, fanout_max = s.fanout_max, rec_days = s.rec_days, att_min_pct = s.att_min_pct, updated_at = now() where tenant_id = lms_x_tid();
  return lms_live_setting(ctx, a) || jsonb_build_object('_audit', lms_x_audit('lms.live.setting', jsonb_build_object('turn', cardinality(s.turn_urls), 'sfu', s.sfu_url is not null)));
end $$;

-- ── 수업(방) ──
create or replace function lms_live_rooms(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := case when nullif(a->>'section_id', '') is null then null else lms_x_uuid(a->>'section_id', '분반') end;
begin
  perform lms_x_staff(ctx);
  if sec is not null then perform lms_x_section(sec); end if;
  -- 30초 넘게 신호가 없는 연결은 나간 것으로 본다
  update lms_live_peer set state = 'left', left_at = seen_at where state = 'on' and seen_at < now() - interval '30 seconds';
  return jsonb_build_object('rooms', coalesce((select jsonb_agg(lms_lv_room_j(r) order by r.created_at desc, r.room_id) from (select * from lms_live_room r where (sec is null or r.section_id = sec) and lms_x_can(r.section_id) order by r.created_at desc limit 100) r), '[]'),
    'limits', (lms_live_setting(ctx, '{}'))->'limits');
end $$;
create or replace function lms_live_room_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_live_room; sec uuid; ses uuid; m text := coalesce(nullif(a->>'mode', ''), 'mesh'); u text := lms_x_str(a, 'ext_url', 500, false, '외부 화상 주소');
  t text := lms_x_str(a, 'title', 80, true, '수업 제목'); isnew boolean := nullif(a->>'room_id', '') is null;
begin
  perform lms_x_staff(ctx);
  if m not in ('mesh','broadcast','link') then perform lms_x_err(400, 'mode', '수업 방식은 소그룹(mesh) · 방송(broadcast) · 외부 링크(link) 중에서 고르세요.'); end if;
  if m = 'link' and u is null then perform lms_x_err(400, 'ext_url', '외부 화상(Zoom · Teams) 주소를 넣으세요.'); end if;
  if u is not null and u !~ '^https://[^\s<>"]+$' then perform lms_x_err(400, 'ext_url', '외부 화상 주소는 https:// 로 시작해야 합니다.'); end if;
  if isnew then
    sec := lms_x_uuid(a->>'section_id', '분반'); perform lms_x_section(sec);
  else
    r := lms_lv_staff_room(ctx, a); sec := r.section_id;
    if r.status = 'ended' then perform lms_x_err(409, 'ended', '끝난 수업은 바꿀 수 없습니다.'); end if;
  end if;
  ses := case when nullif(a->>'session_id', '') is null then null else lms_x_uuid(a->>'session_id', '차시') end;
  if ses is not null and not exists (select 1 from lms_session x where x.session_id = ses and x.section_id = sec) then perform lms_x_err(400, 'session', '이 분반의 차시가 아닙니다.'); end if;
  if isnew then
    insert into lms_live_room (tenant_id, section_id, session_id, title, mode, ext_url, code, host_key, rec_allowed)
    values (lms_x_tid(), sec, ses, t, m, u, lms_x_tid() || '.' || lms_lv_code(), lms_lv_owner(ctx), lms_x_bool(a, 'rec_allowed', false)) returning * into r;
  else
    update lms_live_room set session_id = ses, title = t, mode = m, ext_url = u, rec_allowed = lms_x_bool(a, 'rec_allowed', rec_allowed) where room_id = r.room_id returning * into r;
  end if;
  return jsonb_build_object('room', lms_lv_room_j(r), '_audit', lms_x_audit(case when isnew then 'lms.live.room' else 'lms.live.room_upd' end, jsonb_build_object('id', r.room_id, 'mode', m)));
end $$;
create or replace function lms_live_room(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_live_room;
begin
  r := lms_lv_staff_room(ctx, a);
  return jsonb_build_object('room', lms_lv_room_j(r),
    'peers', coalesce((select jsonb_agg(jsonb_build_object('peer_id', p.peer_id, 'role', p.role, 'label', p.label, 'hand', p.hand, 'joined_at', lms_x_ts(p.joined_at)) order by p.joined_at, p.peer_id) from lms_live_peer p where p.room_id = r.room_id and p.state = 'on'), '[]'));
end $$;
-- 출석 계산(수업 중에는 미리 보기, 종료 때 확정)
create or replace function lms_lv_att_rows(r lms_live_room) returns jsonb language plpgsql as $$
declare dur int := greatest(1, extract(epoch from coalesce(r.ended_at, now()) - coalesce(r.started_at, now()))::int);
  st lms_live_setting := lms_lv_set(); late int := coalesce((select late_after_min from lms_attendance_rule where section_id = r.section_id), 10);
begin
  return coalesce((select jsonb_agg(x order by x->>'member_no') from (
    select jsonb_build_object('member_no', pe.member_no, 'kind', e.kind, 'first_at', lms_x_ts(t.first_at), 'last_at', lms_x_ts(t.last_at), 'sec', coalesce(t.sec, 0), 'joins', coalesce(t.joins, 0),
      'pct', least(100, round(coalesce(t.sec, 0) * 100.0 / dur))::int,
      'status', case when e.kind = 'audit' then null when t.member_no is null then 'absent' when coalesce(t.sec, 0) * 100.0 / dur < st.att_min_pct then 'absent'
        when t.first_at > coalesce(r.started_at, t.first_at) + make_interval(mins => late) then 'late' else 'present' end) x
    from lms_enrollment e join lms_person pe on pe.person_id = e.person_id left join lms_live_att t on t.room_id = r.room_id and t.member_no = pe.member_no
    where e.section_id = r.section_id and e.status = 'enrolled') q), '[]');
end $$;
create or replace function lms_live_attendance(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_live_room; st lms_live_setting;
begin
  r := lms_lv_staff_room(ctx, a); st := lms_lv_set();
  return jsonb_build_object('room', lms_lv_room_j(r), 'min_pct', st.att_min_pct, 'duration_sec', case when r.started_at is null then 0 else greatest(1, extract(epoch from coalesce(r.ended_at, now()) - r.started_at)::int) end,
    'rows', lms_lv_att_rows(r), 'final', r.status = 'ended');
end $$;
create or replace function lms_live_room_state(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_live_room; s text := a->>'status'; rows jsonb; x jsonb; pid uuid; old text; oldm text; w int := 0; kept int := 0; res jsonb;
begin
  r := lms_lv_staff_room(ctx, a);
  if s not in ('live','ended') then perform lms_x_err(400, 'status', '상태는 live(시작) · ended(종료)만 됩니다.'); end if;
  if r.mode = 'link' and s = 'live' then null; end if;
  if r.status = 'ended' then perform lms_x_err(409, 'ended', '이미 끝난 수업입니다.'); end if;
  if s = 'live' then
    if r.status = 'live' then perform lms_x_err(409, 'live', '이미 진행 중입니다.'); end if;
    update lms_live_room set status = 'live', started_at = now() where room_id = r.room_id returning * into r;
    insert into lms_live_evt (tenant_id, room_id, by_label, kind, body) values (lms_x_tid(), r.room_id, '시스템', 'sys', '{"text":"수업을 시작했습니다."}');
    return jsonb_build_object('room', lms_lv_room_j(r), '_audit', lms_x_audit('lms.live.start', jsonb_build_object('id', r.room_id)));
  end if;
  if r.status <> 'live' then perform lms_x_err(409, 'not_live', '시작하지 않은 수업입니다.'); end if;
  update lms_live_room set status = 'ended', ended_at = now() where room_id = r.room_id returning * into r;
  update lms_live_peer set state = 'left', left_at = now() where room_id = r.room_id and state = 'on';
  update lms_live_rec set status = 'done', done_at = now() where room_id = r.room_id and status = 'rec';
  insert into lms_live_evt (tenant_id, room_id, by_label, kind, body) values (lms_x_tid(), r.room_id, '시스템', 'sys', '{"text":"수업을 마쳤습니다."}');
  rows := lms_lv_att_rows(r);
  -- 묶음 G 출결에 기록: 차시가 연결된 경우만. 다른 방식(인증번호 · 수동 · 조정)으로 이미 정해진 출결은 그대로 둔다
  if r.session_id is not null then
    for x in select * from jsonb_array_elements(rows) loop
      continue when x->>'status' is null;
      select person_id into pid from lms_person where member_no = x->>'member_no';
      select status, method into old, oldm from lms_attendance where session_id = r.session_id and person_id = pid;
      if oldm is not null and oldm <> 'live' then kept := kept + 1; old := null; oldm := null; continue; end if;
      insert into lms_attendance (tenant_id, session_id, person_id, status, method, evidence, online_sec, decided_at)
      values (lms_x_tid(), r.session_id, pid, x->>'status', 'live', jsonb_build_object('room', r.room_id, 'sec', (x->>'sec')::int, 'pct', (x->>'pct')::int, 'at', lms_x_ts(now())), (x->>'sec')::int, now())
      on conflict (tenant_id, session_id, person_id) do update set status = excluded.status, evidence = excluded.evidence, online_sec = excluded.online_sec, decided_at = now();
      insert into lms_attendance_log (tenant_id, session_id, person_id, before, after, reason, actor) values (lms_x_tid(), r.session_id, pid, old, x->>'status', '실시간 수업 자동 출석', ctx->>'email');
      w := w + 1; old := null; oldm := null;
    end loop;
  end if;
  res := jsonb_build_object('written', w, 'kept', kept, 'session', r.session_id is not null,
    'present', (select count(*) from jsonb_array_elements(rows) z where z->>'status' = 'present'), 'late', (select count(*) from jsonb_array_elements(rows) z where z->>'status' = 'late'),
    'absent', (select count(*) from jsonb_array_elements(rows) z where z->>'status' = 'absent'));
  update lms_live_room set att = res where room_id = r.room_id returning * into r;
  return jsonb_build_object('room', lms_lv_room_j(r), 'attendance', res, 'rows', rows, '_audit', lms_x_audit('lms.live.end', jsonb_build_object('id', r.room_id, 'written', w)));
end $$;

-- ── 입장 · 신호 · 폴링 ──
create or replace function lms_live_join(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_live_room; st lms_live_setting; me text := lms_lv_owner(ctx); rl text; mno text; pid uuid; ek text; p lms_live_peer; n int; rep int := 0; ice jsonb; sfu boolean := false;
begin
  if nullif(a->>'code', '') is not null then
    select * into r from lms_live_room where code = a->>'code';
    if r.room_id is null then perform lms_x_err(404, 'room', '실시간 수업을 찾을 수 없습니다. 링크 · QR을 다시 확인하세요.'); end if;
  else r := lms_lv_room(lms_x_uuid(a->>'room_id', '실시간 수업')); end if;
  if r.status = 'ended' then perform lms_x_err(409, 'ended', '이미 끝난 수업입니다.'); end if;
  st := lms_lv_set();
  if ctx->>'kind' = 'staff' then
    perform lms_x_staff(ctx); perform lms_x_scope(r.section_id); rl := 'host';
  else
    pid := lms_x_learner(ctx); mno := ctx->>'sid'; ek := lms_x_enr(r.section_id, pid);
    if ek is null then perform lms_x_err(403, 'not_enrolled', '이 분반 수강생이 아닙니다.'); end if;
    rl := 'student';
    if r.rec_allowed and not lms_x_bool(a, 'consent_rec', false) then perform lms_x_err(428, 'rec_consent', '이 수업은 녹화될 수 있습니다. 녹화 안내에 동의한 뒤 입장하세요.'); end if;
  end if;
  if r.mode = 'link' then
    return jsonb_build_object('room', lms_lv_room_j(r), 'role', rl, 'ext_url', r.ext_url, 'peer', null);
  end if;
  update lms_live_peer set state = 'left', left_at = seen_at where room_id = r.room_id and state = 'on' and seen_at < now() - interval '30 seconds';
  -- 중복 접속 차단: 같은 사람(학번 · 운영자)의 다른 연결은 모든 수업에서 끊는다
  with x as (update lms_live_peer set state = 'replaced', left_at = now() where owner = me and state = 'on' returning peer_id, room_id)
  insert into lms_live_sig (tenant_id, room_id, src, dst, kind, data) select lms_x_tid(), x.room_id, x.peer_id, x.peer_id, 'kick', '{"reason":"replaced"}' from x;
  get diagnostics rep = row_count;
  select count(*) into n from lms_live_peer where room_id = r.room_id and state = 'on' and role = 'student';
  if rl = 'student' then
    if r.mode = 'mesh' and n + 1 >= st.mesh_max then perform lms_x_err(409, 'full', '소그룹 수업 정원(' || st.mesh_max || '명)이 찼습니다. 교수자에게 방송 방식으로 바꿔 달라고 요청하세요.'); end if;
    if r.mode = 'broadcast' and n >= st.fanout_max then
      if st.sfu_url is null then perform lms_x_err(409, 'full', '방송 수업 직접 연결 한도(' || st.fanout_max || '명)를 넘었습니다. 대규모 수업은 SFU 연동 후 동작합니다.'); end if;
      sfu := true;
    end if;
  elsif exists (select 1 from lms_live_peer where room_id = r.room_id and state = 'on' and role = 'host') then
    perform lms_x_err(409, 'host_dup', '다른 교수자 화면이 이미 수업을 진행 중입니다.');
  end if;
  insert into lms_live_peer (tenant_id, room_id, role, owner, member_no, label, device)
  values (lms_x_tid(), r.room_id, rl, me, mno, case when rl = 'host' then '교수자' else mno end, lms_x_str(a, 'device', 40, false, '기기')) returning * into p;
  if rl = 'student' and r.status = 'live' then
    insert into lms_live_att (tenant_id, room_id, member_no, person_id) values (lms_x_tid(), r.room_id, mno, pid)
    on conflict (tenant_id, room_id, member_no) do update set joins = lms_live_att.joins + 1, last_at = now();
  end if;
  ice := coalesce((select jsonb_agg(jsonb_build_object('urls', u)) from unnest(st.stun_urls) u), '[]');
  if cardinality(st.turn_urls) > 0 then ice := ice || jsonb_build_array(jsonb_build_object('urls', to_jsonb(st.turn_urls), 'username', coalesce(st.turn_user, ''), 'credential', coalesce(st.turn_cred, ''))); end if;
  return jsonb_build_object('room', lms_lv_room_j(r), 'role', rl, 'peer', jsonb_build_object('peer_id', p.peer_id, 'label', p.label), 'replaced', rep,
    'ice', ice, 'sfu', case when sfu then jsonb_build_object('url', st.sfu_url, 'note', 'SFU 어댑터 연동 후 동작') end,
    'limits', jsonb_build_object('mesh_max', st.mesh_max, 'fanout_max', st.fanout_max),
    'last_sig', coalesce((select max(id) from lms_live_sig where room_id = r.room_id), 0), 'last_evt', 0);
end $$;
create or replace function lms_live_leave(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_live_peer;
begin
  select * into p from lms_live_peer where peer_id = lms_x_uuid(a->>'peer_id', '연결') and owner = lms_lv_owner(ctx);
  if p.peer_id is null then perform lms_x_err(404, 'peer', '연결 정보를 찾을 수 없습니다.'); end if;
  if p.state = 'on' then
    update lms_live_peer set state = 'left', left_at = now(), hand = false where peer_id = p.peer_id;
    insert into lms_live_sig (tenant_id, room_id, src, dst, kind) values (lms_x_tid(), p.room_id, p.peer_id, null, 'bye');
  end if;
  return jsonb_build_object('ok', true);
end $$;
create or replace function lms_live_signal(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_live_peer; k text := a->>'kind'; dst uuid; id bigint;
begin
  p := lms_lv_me(ctx, a);
  if k not in ('offer','answer','ice','bye','renego') then perform lms_x_err(400, 'kind', '신호 종류가 올바르지 않습니다.'); end if;
  dst := case when nullif(a->>'to', '') is null then null else lms_x_uuid(a->>'to', '받는 연결') end;
  if dst is not null and not exists (select 1 from lms_live_peer where peer_id = dst and room_id = p.room_id and state = 'on') then perform lms_x_err(404, 'peer_gone', '상대 연결이 끊겼습니다.'); end if;
  if dst is null and k <> 'bye' then perform lms_x_err(400, 'to', '받는 연결(to)을 지정하세요.'); end if;
  if jsonb_typeof(coalesce(a->'data', 'null')) not in ('object') then perform lms_x_err(400, 'data', '신호 내용(data)이 올바르지 않습니다.'); end if;
  if length((a->'data')::text) > 32000 then perform lms_x_err(413, 'too_large', '신호 내용이 너무 큽니다.'); end if;
  insert into lms_live_sig (tenant_id, room_id, src, dst, kind, data) values (lms_x_tid(), p.room_id, p.peer_id, dst, k, a->'data') returning lms_live_sig.id into id;
  return jsonb_build_object('id', id);
end $$;
create or replace function lms_lv_evt_j(e lms_live_evt) returns jsonb language sql immutable as $$
  select jsonb_build_object('id', e.id, 'kind', e.kind, 'by', e.by_label, 'peer_id', e.peer_id, 'ref', e.ref, 'body', e.body, 'at', lms_x_ts(e.at)) $$;
create or replace function lms_live_poll(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_live_peer; r lms_live_room; since bigint := coalesce(nullif(a->>'since', '')::bigint, 0); es bigint := coalesce(nullif(a->>'esince', '')::bigint, 0);
begin
  begin since := coalesce(nullif(a->>'since', '')::bigint, 0); es := coalesce(nullif(a->>'esince', '')::bigint, 0); exception when others then perform lms_x_err(400, 'since', '순번이 올바르지 않습니다.'); end;
  p := lms_lv_me(ctx, a); r := lms_lv_room(p.room_id);
  update lms_live_peer set seen_at = now() where peer_id = p.peer_id;
  if p.role = 'student' and r.status = 'live' then
    insert into lms_live_att (tenant_id, room_id, member_no, person_id) values (lms_x_tid(), r.room_id, p.member_no, (select person_id from lms_person where member_no = p.member_no))
    on conflict (tenant_id, room_id, member_no) do update set sec = lms_live_att.sec + case when now() - lms_live_att.last_at <= interval '20 seconds' then floor(extract(epoch from now() - lms_live_att.last_at))::int else 0 end,
      last_at = case when now() - lms_live_att.last_at <= interval '20 seconds' then lms_live_att.last_at + make_interval(secs => floor(extract(epoch from now() - lms_live_att.last_at))) else now() end;
  end if;
  update lms_live_peer set state = 'left', left_at = seen_at where room_id = r.room_id and state = 'on' and seen_at < now() - interval '30 seconds';
  delete from lms_live_sig where room_id = r.room_id and at < now() - interval '5 minutes';
  return jsonb_build_object('room', jsonb_build_object('status', r.status, 'mode', r.mode, 'recording', exists (select 1 from lms_live_rec c where c.room_id = r.room_id and c.status = 'rec'), 'title', r.title,
      'cap', (select jsonb_build_object('code', c.code, 'src_lang', c.src_lang, 'langs', c.langs) from lms_o_caption_room c where c.live_room_id = r.room_id and c.status = 'live' order by c.created_at desc limit 1)),
    'me', jsonb_build_object('peer_id', p.peer_id, 'role', p.role, 'hand', p.hand),
    'peers', coalesce((select jsonb_agg(jsonb_build_object('peer_id', q.peer_id, 'role', q.role, 'label', q.label, 'hand', q.hand) order by q.joined_at, q.peer_id) from lms_live_peer q where q.room_id = r.room_id and q.state = 'on'), '[]'),
    'signals', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'from', s.src, 'kind', s.kind, 'data', s.data) order by s.id) from (select * from lms_live_sig s where s.room_id = r.room_id and s.id > since and (s.dst = p.peer_id or (s.dst is null and s.src <> p.peer_id)) order by s.id limit 200) s), '[]'),
    'events', coalesce((select jsonb_agg(lms_lv_evt_j(e) order by e.id) from (select * from lms_live_evt e where e.room_id = r.room_id and e.id > es and (e.kind <> 'vote' or p.role = 'host' or e.peer_id = p.peer_id) order by e.id limit 200) e), '[]'),
    'last_sig', greatest(since, coalesce((select max(id) from lms_live_sig s where s.room_id = r.room_id and (s.dst = p.peer_id or (s.dst is null and s.src <> p.peer_id))), 0)),
    'last_evt', greatest(es, coalesce((select max(id) from lms_live_evt e where e.room_id = r.room_id), 0)));
end $$;

-- ── 채팅 · 손들기 · 질문 · 투표 ──
create or replace function lms_live_event(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_live_peer; r lms_live_room; k text := a->>'kind'; t text; b jsonb := '{}'; rf bigint; q lms_live_evt; e lms_live_evt; n int;
begin
  p := lms_lv_me(ctx, a); r := lms_lv_room(p.room_id);
  if r.status = 'ended' then perform lms_x_err(409, 'ended', '끝난 수업입니다.'); end if;
  if k not in ('chat','hand','lower','qa','answer','poll','vote','close') then perform lms_x_err(400, 'kind', '종류가 올바르지 않습니다.'); end if;
  if k in ('answer','poll','close') and p.role <> 'host' then perform lms_x_err(403, 'host_only', '교수자만 할 수 있습니다.'); end if;
  if k in ('answer','vote','close') or (k = 'lower' and nullif(a->>'ref', '') is not null) then
    begin rf := (a->>'ref')::bigint; exception when others then perform lms_x_err(400, 'ref', '대상 번호가 올바르지 않습니다.'); end;
  end if;
  if k = 'chat' or k = 'qa' or k = 'answer' then
    t := lms_x_str(a, 'text', 500, true, case k when 'chat' then '채팅' when 'qa' then '질문' else '답변' end); b := jsonb_build_object('text', t);
  end if;
  if k = 'hand' or k = 'lower' then
    if k = 'lower' and rf is not null and p.role = 'host' then update lms_live_peer set hand = false where peer_id = (select peer_id from lms_live_peer where room_id = r.room_id and peer_id::text = a->>'to');
    else update lms_live_peer set hand = (k = 'hand') where peer_id = p.peer_id; end if;
    if k = 'lower' and p.role = 'host' and nullif(a->>'to', '') is not null then update lms_live_peer set hand = false where room_id = r.room_id and peer_id = lms_x_uuid(a->>'to', '연결'); b := jsonb_build_object('to', a->>'to'); end if;
  end if;
  if k = 'answer' then
    select * into q from lms_live_evt where id = rf and room_id = r.room_id and kind = 'qa'; if q.id is null then perform lms_x_err(404, 'qa', '질문을 찾을 수 없습니다.'); end if;
  end if;
  if k = 'poll' then
    t := lms_x_str(a, 'text', 200, true, '투표 질문');
    if jsonb_typeof(a->'options') <> 'array' or jsonb_array_length(a->'options') not between 2 and 6 then perform lms_x_err(400, 'options', '보기는 2~6개입니다.'); end if;
    if exists (select 1 from jsonb_array_elements(a->'options') o where jsonb_typeof(o) <> 'string' or length(btrim(o #>> '{}')) = 0 or length(o #>> '{}') > 80) then perform lms_x_err(400, 'options', '보기는 1~80자 글자로 넣으세요.'); end if;
    b := jsonb_build_object('text', t, 'options', a->'options');
  end if;
  if k = 'vote' or k = 'close' then
    select * into q from lms_live_evt where id = rf and room_id = r.room_id and kind = 'poll'; if q.id is null then perform lms_x_err(404, 'poll', '투표를 찾을 수 없습니다.'); end if;
    if exists (select 1 from lms_live_evt where room_id = r.room_id and kind = 'close' and ref = rf) then perform lms_x_err(409, 'poll_closed', '마감된 투표입니다.'); end if;
  end if;
  if k = 'vote' then
    if p.role <> 'student' then perform lms_x_err(403, 'student_only', '학생만 투표합니다.'); end if;
    begin n := (a->>'choice')::int; exception when others then n := -1; end;
    if n is null or n < 0 or n >= jsonb_array_length(q.body->'options') then perform lms_x_err(400, 'choice', '보기 번호가 올바르지 않습니다.'); end if;
    if exists (select 1 from lms_live_evt where room_id = r.room_id and kind = 'vote' and ref = rf and member_no = p.member_no) then perform lms_x_err(409, 'voted', '이미 투표했습니다.'); end if;
    b := jsonb_build_object('choice', n);
  end if;
  if k = 'close' then
    b := jsonb_build_object('text', q.body->>'text', 'options', q.body->'options', 'tally', (select jsonb_agg(coalesce((select count(*) from lms_live_evt v where v.room_id = r.room_id and v.kind = 'vote' and v.ref = rf and (v.body->>'choice')::int = i), 0) order by i) from generate_series(0, jsonb_array_length(q.body->'options') - 1) i));
  end if;
  insert into lms_live_evt (tenant_id, room_id, peer_id, by_label, member_no, kind, ref, body) values (lms_x_tid(), r.room_id, p.peer_id, p.label, p.member_no, k, rf, b) returning * into e;
  return jsonb_build_object('event', lms_lv_evt_j(e));
end $$;
-- 수업 기록(교수자): 채팅 수 · 질문과 답 · 투표 결과
create or replace function lms_live_summary(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_live_room;
begin
  r := lms_lv_staff_room(ctx, a);
  return jsonb_build_object('room', lms_lv_room_j(r),
    'chat', (select count(*) from lms_live_evt where room_id = r.room_id and kind = 'chat'),
    'hands', (select count(*) from lms_live_evt where room_id = r.room_id and kind = 'hand'),
    'qa', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'by', q.by_label, 'text', q.body->>'text', 'at', lms_x_ts(q.at),
        'answers', coalesce((select jsonb_agg(x.body->>'text' order by x.id) from lms_live_evt x where x.room_id = r.room_id and x.kind = 'answer' and x.ref = q.id), '[]')) order by q.id) from lms_live_evt q where q.room_id = r.room_id and q.kind = 'qa'), '[]'),
    'polls', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'text', q.body->>'text', 'options', q.body->'options', 'closed', exists (select 1 from lms_live_evt c where c.room_id = r.room_id and c.kind = 'close' and c.ref = q.id),
        'tally', (select jsonb_agg(coalesce((select count(*) from lms_live_evt v where v.room_id = r.room_id and v.kind = 'vote' and v.ref = q.id and (v.body->>'choice')::int = i), 0) order by i) from generate_series(0, jsonb_array_length(q.body->'options') - 1) i)) order by q.id)
      from lms_live_evt q where q.room_id = r.room_id and q.kind = 'poll'), '[]'),
    'chat_log', coalesce((select jsonb_agg(jsonb_build_object('by', c.by_label, 'text', c.body->>'text', 'at', lms_x_ts(c.at)) order by c.id) from (select * from lms_live_evt c where c.room_id = r.room_id and c.kind = 'chat' order by c.id limit 500) c), '[]'));
end $$;
-- 학습자: 내 수강 분반의 실시간 수업(예정 · 진행 중)
create or replace function lms_live_my(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare pid uuid := lms_x_learner(ctx);
begin
  return jsonb_build_object('member_no', ctx->>'sid', 'rooms', coalesce((select jsonb_agg(lms_lv_room_j(r) - 'code' - 'att' || jsonb_build_object('code', r.code) order by r.status desc, r.created_at desc, r.room_id)
    from lms_live_room r where r.status in ('ready','live') and lms_x_enr(r.section_id, pid) is not null), '[]'),
    'captions', coalesce((select jsonb_agg(jsonb_build_object('room_id', c.room_id, 'title', c.title, 'src_lang', c.src_lang, 'finished_at', lms_x_ts(c.finished_at), 'has_summary', c.summary is not null) order by c.created_at desc, c.room_id)
    from lms_o_caption_room c where c.visibility = 'public' and c.section_id is not null and lms_x_enr(c.section_id, pid) is not null), '[]'));
end $$;

-- ── 녹화(동의 · 보존 · 자동 파기 · 열람 기록) ──
create or replace function lms_live_purge() returns int language plpgsql as $$
declare n int;
begin
  with x as (update lms_live_rec set status = 'deleted', deleted_at = now(), delete_reason = 'retention' where status <> 'deleted' and retain_until < now() returning rec_id, res_id)
  , d as (delete from lms_live_rec_part p using x where p.rec_id = x.rec_id returning 1)
  , b as (update lms_b_resource z set deleted_at = now(), deleted_by = 'system:retention' from x where z.res_id = x.res_id and z.deleted_at is null returning 1)
  select count(*) into n from x;
  return n;
end $$;
create or replace function lms_lv_rec_j(c lms_live_rec) returns jsonb language sql stable as $$
  select jsonb_build_object('rec_id', c.rec_id, 'room_id', c.room_id, 'mime', c.mime, 'parts', c.parts, 'bytes', c.bytes, 'status', c.status, 'res_id', c.res_id,
    'retain_until', lms_x_ts(c.retain_until), 'consent', c.consent, 'created_at', lms_x_ts(c.created_at), 'done_at', lms_x_ts(c.done_at), 'deleted_at', lms_x_ts(c.deleted_at), 'delete_reason', c.delete_reason,
    'views', (select count(*)::int from lms_live_rec_view v where v.rec_id = c.rec_id),
    'room_title', (select r.title from lms_live_room r where r.room_id = c.room_id)) $$;
create or replace function lms_live_rec_start(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_live_room; c lms_live_rec; st lms_live_setting;
begin
  r := lms_lv_staff_room(ctx, a); st := lms_lv_set();
  if not r.rec_allowed then perform lms_x_err(403, 'rec_off', '이 수업은 녹화를 허용하지 않았습니다(수업 설정에서 녹화 허용).'); end if;
  if r.status <> 'live' then perform lms_x_err(409, 'not_live', '수업을 시작한 뒤 녹화할 수 있습니다.'); end if;
  if not lms_x_bool(a, 'consent', false) then perform lms_x_err(428, 'consent', '녹화 안내(학생 고지 · 보존 기간 · 자동 파기)를 확인하고 동의하세요.'); end if;
  if exists (select 1 from lms_live_rec where room_id = r.room_id and status = 'rec') then perform lms_x_err(409, 'recording', '이미 녹화 중입니다.'); end if;
  insert into lms_live_rec (tenant_id, room_id, mime, retain_until, consent, created_by)
  values (lms_x_tid(), r.room_id, coalesce(lms_x_str(a, 'mime', 60, false, '형식'), 'video/webm'), now() + make_interval(days => st.rec_days),
    jsonb_build_object('host', true, 'notice', '학생 화면에 녹화 중 표시 · 입장 전 고지 동의', 'days', st.rec_days, 'at', lms_x_ts(now())), ctx->>'email') returning * into c;
  if c.mime !~ '^(video|audio)/[a-z0-9.+-]+(;[ a-z0-9=.,"+-]*)?$' then perform lms_x_err(400, 'mime', '녹화 형식이 올바르지 않습니다.'); end if;
  insert into lms_live_evt (tenant_id, room_id, by_label, kind, body) values (lms_x_tid(), r.room_id, '시스템', 'rec', '{"on":true,"text":"녹화를 시작했습니다."}');
  return jsonb_build_object('rec', lms_lv_rec_j(c), '_audit', lms_x_audit('lms.live.rec_start', jsonb_build_object('id', c.rec_id, 'room', r.room_id)));
end $$;
create or replace function lms_lv_staff_rec(ctx jsonb, a jsonb) returns lms_live_rec language plpgsql as $$
declare c lms_live_rec;
begin
  perform lms_x_staff(ctx);
  select * into c from lms_live_rec where rec_id = lms_x_uuid(a->>'rec_id', '녹화');
  if c.rec_id is null then perform lms_x_err(404, 'rec', '녹화를 찾을 수 없습니다.'); end if;
  perform lms_x_scope((select section_id from lms_live_room where room_id = c.room_id));
  return c;
end $$;
create or replace function lms_live_rec_part(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_live_rec := lms_lv_staff_rec(ctx, a); i int; d bytea;
begin
  if c.status <> 'rec' then perform lms_x_err(409, 'rec_done', '끝난 녹화입니다.'); end if;
  begin i := (a->>'idx')::int; exception when others then i := null; end;
  if i is null or i <> c.parts then perform lms_x_err(409, 'idx', '녹화 조각 순서가 맞지 않습니다(다음 조각 ' || c.parts || ').'); end if;
  if i >= 400 then perform lms_x_err(413, 'too_long', '녹화는 400조각(약 800MB)까지입니다.'); end if;
  begin d := decode(coalesce(a->>'b64', ''), 'base64'); exception when others then perform lms_x_err(400, 'b64', '녹화 조각(base64)이 올바르지 않습니다.'); end;
  if d is null or length(d) = 0 then perform lms_x_err(400, 'empty', '빈 조각입니다.'); end if;
  if length(d) > 2 * 1024 * 1024 then perform lms_x_err(413, 'too_large', '조각은 2MB까지입니다.'); end if;
  insert into lms_live_rec_part (tenant_id, rec_id, idx, data) values (lms_x_tid(), c.rec_id, i, d);
  update lms_live_rec set parts = parts + 1, bytes = bytes + length(d) where rec_id = c.rec_id returning * into c;
  return jsonb_build_object('rec_id', c.rec_id, 'parts', c.parts, 'bytes', c.bytes);
end $$;
create or replace function lms_live_rec_finish(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_live_rec := lms_lv_staff_rec(ctx, a); r lms_live_room; rid uuid; pub boolean := lms_x_bool(a, 'publish', false);
begin
  if c.status = 'deleted' then perform lms_x_err(410, 'deleted', '파기된 녹화입니다.'); end if;
  if c.res_id is not null then perform lms_x_err(409, 'finished', '이미 강의자료로 등록한 녹화입니다.'); end if;
  if c.parts = 0 then perform lms_x_err(400, 'empty', '올린 녹화 조각이 없습니다.'); end if;
  r := lms_lv_room(c.room_id);
  insert into lms_b_resource (tenant_id, section_id, session_id, kind, title, body, visible, sort, owner_label)
  values (lms_x_tid(), r.section_id, r.session_id, 'video', '실시간 수업 녹화 — ' || r.title,
    jsonb_build_object('url', 'liveclass.html#rec=' || c.rec_id, 'provider', 'live', 'live_rec', c.rec_id, 'mime', c.mime, 'bytes', c.bytes, 'retain_until', lms_x_ts(c.retain_until)),
    pub, coalesce((select max(sort) + 1 from lms_b_resource where section_id = r.section_id), 0), '실시간 수업') returning res_id into rid;
  update lms_live_rec set status = 'done', done_at = coalesce(done_at, now()), res_id = rid where rec_id = c.rec_id returning * into c;
  if r.status = 'live' then insert into lms_live_evt (tenant_id, room_id, by_label, kind, body) values (lms_x_tid(), r.room_id, '시스템', 'rec', '{"on":false,"text":"녹화를 마쳤습니다."}'); end if;
  return jsonb_build_object('rec', lms_lv_rec_j(c), 'resource', jsonb_build_object('res_id', rid, 'visible', pub), '_audit', lms_x_audit('lms.live.rec_finish', jsonb_build_object('id', c.rec_id, 'res', rid, 'bytes', c.bytes)));
end $$;
create or replace function lms_live_recs(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare n int;
begin
  perform lms_x_staff(ctx); n := lms_live_purge();
  return jsonb_build_object('purged', n, 'recs', coalesce((select jsonb_agg(lms_lv_rec_j(c) order by c.created_at desc, c.rec_id) from lms_live_rec c join lms_live_room r on r.room_id = c.room_id
    where lms_x_can(r.section_id) and (nullif(a->>'room_id', '') is null or c.room_id::text = a->>'room_id')), '[]'));
end $$;
create or replace function lms_live_rec_delete(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_live_rec := lms_lv_staff_rec(ctx, a);
begin
  if c.status = 'deleted' then perform lms_x_err(410, 'deleted', '이미 파기된 녹화입니다.'); end if;
  delete from lms_live_rec_part where rec_id = c.rec_id;
  update lms_b_resource set deleted_at = now(), deleted_by = ctx->>'email' where res_id = c.res_id and deleted_at is null;
  update lms_live_rec set status = 'deleted', deleted_at = now(), delete_reason = 'manual' where rec_id = c.rec_id returning * into c;
  return jsonb_build_object('rec', lms_lv_rec_j(c), '_audit', lms_x_audit('lms.live.rec_delete', jsonb_build_object('id', c.rec_id)));
end $$;
-- 재생(조각 단위). 학습자는 수강 분반 · 공개된 강의자료일 때만. 첫 조각을 받을 때 열람 기록
create or replace function lms_live_rec_get(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_live_rec; r lms_live_room; i int; d bytea; pid uuid;
begin
  perform lms_live_purge();
  select * into c from lms_live_rec where rec_id = lms_x_uuid(a->>'rec_id', '녹화');
  if c.rec_id is null then perform lms_x_err(404, 'rec', '녹화를 찾을 수 없습니다.'); end if;
  if c.status = 'deleted' then perform lms_x_err(410, 'deleted', '보존 기간이 지나 파기된 녹화입니다.'); end if;
  r := lms_lv_room(c.room_id);
  if ctx->>'kind' = 'learner' then
    pid := lms_x_learner(ctx);
    if lms_x_enr(r.section_id, pid) is null then perform lms_x_err(403, 'not_enrolled', '이 분반 수강생이 아닙니다.'); end if;
    if not exists (select 1 from lms_b_resource z where z.res_id = c.res_id and z.visible and z.deleted_at is null) then perform lms_x_err(403, 'not_public', '교수자가 아직 공개하지 않은 녹화입니다.'); end if;
  else perform lms_x_staff(ctx); perform lms_x_scope(r.section_id); end if;
  begin i := coalesce(nullif(a->>'idx', ''), '0')::int; exception when others then i := -1; end;
  select data into d from lms_live_rec_part where rec_id = c.rec_id and idx = i;
  if d is null then perform lms_x_err(404, 'part', '녹화 조각이 없습니다.'); end if;
  if i = 0 then insert into lms_live_rec_view (tenant_id, rec_id, who) values (lms_x_tid(), c.rec_id, case when ctx->>'kind' = 'learner' then 'm:' || (ctx->>'sid') else coalesce(ctx->>'email', 'staff') end); end if;
  return jsonb_build_object('rec_id', c.rec_id, 'idx', i, 'parts', c.parts, 'mime', c.mime, 'b64', translate(encode(d, 'base64'), E'\n', ''));
end $$;
create or replace function lms_live_rec_views(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_live_rec := lms_lv_staff_rec(ctx, a);
begin
  return jsonb_build_object('rec', lms_lv_rec_j(c), 'views', coalesce((select jsonb_agg(jsonb_build_object('who', v.who, 'at', lms_x_ts(v.at)) order by v.id desc) from (select * from lms_live_rec_view v where v.rec_id = c.rec_id order by v.id desc limit 500) v), '[]'));
end $$;

-- ═════════ 자막 · 번역(SFR-077) ═════════
create or replace function lms_lv_cap_j(c lms_o_caption_room) returns jsonb language sql stable as $$
  select jsonb_build_object('room_id', c.room_id, 'section_id', c.section_id, 'title', c.title, 'src_lang', c.src_lang, 'langs', c.langs, 'code', c.code, 'status', c.status,
    'visibility', c.visibility, 'has_transcript', c.transcript is not null, 'has_summary', c.summary is not null, 'summary_engine', c.summary_engine, 'live_room_id', c.live_room_id,
    'created_at', lms_x_ts(c.created_at), 'finished_at', lms_x_ts(c.finished_at),
    'lines', (select count(*)::int from lms_o_caption_line l where l.room_id = c.room_id),
    'viewers', (select count(distinct v.viewer)::int from lms_live_cap_view v where v.room_id = c.room_id)) $$;
create or replace function lms_lv_cap_line_j(l lms_o_caption_line) returns jsonb language sql immutable as $$
  select jsonb_build_object('seq', l.seq, 'text', l.text, 'tr', l.tr, 'tr_engine', l.tr_engine, 'source', l.source, 'edited', l.edited, 'at', lms_x_ts(l.at)) $$;
create or replace function lms_lv_cap(ctx jsonb, a jsonb) returns lms_o_caption_room language plpgsql as $$
declare c lms_o_caption_room;
begin
  perform lms_x_staff(ctx);
  select * into c from lms_o_caption_room where room_id = lms_x_uuid(a->>'room_id', '자막방');
  if c.room_id is null then perform lms_x_err(404, 'room', '자막방을 찾을 수 없습니다.'); end if;
  if c.section_id is not null then perform lms_x_scope(c.section_id); end if;
  return c;
end $$;
create or replace function lms_lv_chk_langs(src text, langs jsonb) returns void language plpgsql as $$
begin
  if src is null or not (src = any(lms_lv_langs())) then perform lms_x_err(400, 'lang', '발화 언어가 지원 목록에 없습니다.'); end if;
  if jsonb_typeof(langs) <> 'array' or jsonb_array_length(langs) not between 1 and 4 then perform lms_x_err(400, 'lang', '자막 언어는 1~4개입니다.'); end if;
  if exists (select 1 from jsonb_array_elements(langs) x where jsonb_typeof(x) <> 'string' or not ((x #>> '{}') = any(lms_lv_langs())))
    or (select count(distinct x) from jsonb_array_elements_text(langs) x) <> jsonb_array_length(langs) then perform lms_x_err(400, 'lang', '자막 언어는 지원 목록에서 서로 다르게 고르세요.'); end if;
end $$;
-- 강의별 사용 여부 · 언어 설정
create or replace function lms_live_cap_setting(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_x_uuid(a->>'section_id', '분반'); s lms_live_cap_setting;
begin
  perform lms_x_staff(ctx); perform lms_x_section(sec);
  select * into s from lms_live_cap_setting where section_id = sec;
  return jsonb_build_object('section_id', sec, 'saved', s.section_id is not null, 'enabled', coalesce(s.enabled, true), 'src_lang', coalesce(s.src_lang, 'ko'),
    'langs', coalesce(s.langs, '["ko","en"]'), 'visibility', coalesce(s.visibility, 'private'), 'updated_at', lms_x_ts(s.updated_at));
end $$;
create or replace function lms_live_cap_setting_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_x_uuid(a->>'section_id', '분반'); src text := coalesce(nullif(a->>'src_lang', ''), 'ko'); L jsonb := coalesce(a->'langs', '["ko","en"]'); v text := coalesce(nullif(a->>'visibility', ''), 'private');
begin
  perform lms_x_staff(ctx); perform lms_x_section(sec); perform lms_lv_chk_langs(src, L);
  if v not in ('private','public') then perform lms_x_err(400, 'visibility', '공개 범위는 private · public 입니다.'); end if;
  insert into lms_live_cap_setting (tenant_id, section_id, enabled, src_lang, langs, visibility) values (lms_x_tid(), sec, lms_x_bool(a, 'enabled', true), src, L, v)
  on conflict (tenant_id, section_id) do update set enabled = excluded.enabled, src_lang = excluded.src_lang, langs = excluded.langs, visibility = excluded.visibility, updated_at = now();
  return lms_live_cap_setting(ctx, a) || jsonb_build_object('_audit', lms_x_audit('lms.live.cap_setting', jsonb_build_object('section', sec, 'enabled', lms_x_bool(a, 'enabled', true))));
end $$;
create or replace function lms_live_cap_rooms(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
begin
  perform lms_x_staff(ctx);
  return jsonb_build_object('rooms', coalesce((select jsonb_agg(lms_lv_cap_j(c) order by c.created_at desc, c.room_id) from (select * from lms_o_caption_room c where (c.section_id is null or lms_x_can(c.section_id))
    and (nullif(a->>'section_id', '') is null or c.section_id::text = a->>'section_id') order by c.created_at desc limit 100) c), '[]'));
end $$;
create or replace function lms_live_cap_room(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := case when nullif(a->>'section_id', '') is null then null else lms_x_uuid(a->>'section_id', '분반') end; s lms_live_cap_setting; src text; L jsonb; v text; c lms_o_caption_room; lr uuid;
begin
  perform lms_x_staff(ctx);
  if sec is not null then perform lms_x_section(sec); select * into s from lms_live_cap_setting where section_id = sec; end if;
  if s.section_id is not null and not s.enabled then perform lms_x_err(403, 'cap_off', '이 강의는 실시간 자막을 쓰지 않도록 설정되어 있습니다(강의별 자막 설정).'); end if;
  src := coalesce(nullif(a->>'src_lang', ''), s.src_lang, 'ko'); L := coalesce(a->'langs', s.langs, '["ko","en"]'); v := coalesce(nullif(a->>'visibility', ''), s.visibility, 'private');
  perform lms_lv_chk_langs(src, L);
  if v not in ('private','public') then perform lms_x_err(400, 'visibility', '공개 범위는 private · public 입니다.'); end if;
  if nullif(a->>'live_room_id', '') is not null then lr := lms_x_uuid(a->>'live_room_id', '실시간 수업');
    if not exists (select 1 from lms_live_room where room_id = lr) then perform lms_x_err(404, 'room', '실시간 수업을 찾을 수 없습니다.'); end if; end if;
  insert into lms_o_caption_room (tenant_id, section_id, title, langs, code, src_lang, visibility, live_room_id, created_by)
  values (lms_x_tid(), sec, lms_x_str(a, 'title', 80, true, '제목'), L, lms_x_tid() || '.' || lms_lv_code(), src, v, lr, ctx->>'email') returning * into c;
  return jsonb_build_object('room', lms_lv_cap_j(c), '_audit', lms_x_audit('lms.live.cap_room', jsonb_build_object('id', c.room_id)));
end $$;
-- 받아쓰기 구간 · 직접 입력 문장 보내기
create or replace function lms_live_cap_seg(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a); t text := lms_x_str(a, 'text', 1000, true, '자막 문장'); src text := coalesce(nullif(a->>'source', ''), 'stt'); l lms_o_caption_line;
begin
  if src not in ('manual','stt') then perform lms_x_err(400, 'source', '출처는 stt · manual 입니다.'); end if;
  if c.status <> 'live' then perform lms_x_err(409, 'closed', '종료된 자막방입니다.'); end if;
  insert into lms_o_caption_line (tenant_id, room_id, seq, text, source)
  select lms_x_tid(), c.room_id, coalesce(max(seq), 0) + 1, t, src from lms_o_caption_line where room_id = c.room_id returning * into l;
  return jsonb_build_object('line', lms_lv_cap_line_j(l));
end $$;
create or replace function lms_live_cap_lines(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a); s int;
begin
  begin s := coalesce(nullif(a->>'since', ''), '0')::int; exception when others then s := 0; end;
  return jsonb_build_object('room', lms_lv_cap_j(c), 'lines', coalesce((select jsonb_agg(lms_lv_cap_line_j(l) order by l.seq) from (select * from lms_o_caption_line l where l.room_id = c.room_id and l.seq > s order by l.seq limit 1000) l), '[]'));
end $$;
create or replace function lms_live_cap_edit(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a); l lms_o_caption_line; n int; t text := lms_x_str(a, 'text', 1000, false, '자막 문장'); trv jsonb := '{}'; eng jsonb := '{}';
begin
  begin n := (a->>'seq')::int; exception when others then n := null; end;
  if n is null then perform lms_x_err(400, 'seq', '문장 번호가 올바르지 않습니다.'); end if;
  if a ? 'tr' and jsonb_typeof(a->'tr') = 'object' then
    if exists (select 1 from jsonb_each(a->'tr') e where not (e.key = any(lms_lv_langs())) or jsonb_typeof(e.value) <> 'string' or length(e.value #>> '{}') > 1000) then perform lms_x_err(400, 'tr', '번역문 형식이 올바르지 않습니다.'); end if;
    trv := a->'tr'; select coalesce(jsonb_object_agg(k, 'manual'), '{}') into eng from jsonb_object_keys(trv) k;
  elsif a ? 'tr' and jsonb_typeof(a->'tr') <> 'null' then perform lms_x_err(400, 'tr', '번역문 형식이 올바르지 않습니다.'); end if;
  update lms_o_caption_line set text = coalesce(t, text), tr = tr || trv, tr_engine = tr_engine || eng, edited = true where room_id = c.room_id and seq = n returning * into l;
  if l.seq is null then perform lms_x_err(404, 'line', '자막 문장을 찾을 수 없습니다.'); end if;
  return jsonb_build_object('line', lms_lv_cap_line_j(l), '_audit', lms_x_audit('lms.live.cap_edit', jsonb_build_object('id', c.room_id, 'seq', n)));
end $$;
-- 학생 화면(로그인 없음 · QR · 링크): 코드 = 기관.난수, 언어는 학생이 고른다. 보는 사람 수는 화면이 만든 임의 값의 해시로만 센다
create or replace function lms_live_cap_view(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room; lang text := nullif(a->>'lang', ''); s int; v text := nullif(a->>'v', '');
begin
  select * into c from lms_o_caption_room where code = a->>'code';
  if c.room_id is null then perform lms_x_err(404, 'room', '자막방을 찾을 수 없습니다.'); end if;
  if lang is not null and not (lang = any(lms_lv_langs())) then perform lms_x_err(400, 'lang', '지원하지 않는 언어입니다.'); end if;
  begin s := coalesce(nullif(a->>'since', ''), '0')::int; exception when others then s := 0; end;
  if v is not null and v ~ '^[A-Za-z0-9]{8,40}$' and lang is not null then
    insert into lms_live_cap_view (tenant_id, room_id, lang, viewer) values (lms_x_tid(), c.room_id, lang, md5(c.room_id::text || v)) on conflict do nothing;
  end if;
  return jsonb_build_object('room', jsonb_build_object('title', c.title, 'src_lang', c.src_lang, 'langs', c.langs, 'status', c.status), 'lang', lang,
    'lines', coalesce((select jsonb_agg(jsonb_build_object('seq', l.seq, 'text', l.text, 'tr', case when lang is null or lang = c.src_lang then null else l.tr->>lang end, 'engine', case when lang is null or lang = c.src_lang then null else l.tr_engine->>lang end, 'edited', l.edited) order by l.seq)
      from (select * from lms_o_caption_line l where l.room_id = c.room_id and l.seq > s order by l.seq limit 300) l), '[]'));
end $$;
-- 번역 대기 문장(서버 AI 번역 경로가 부른다)
create or replace function lms_live_cap_pending(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a);
begin
  return jsonb_build_object('room', lms_lv_cap_j(c), 'targets', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(c.langs) x where x <> c.src_lang), '[]'),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('seq', l.seq, 'text', l.text, 'need', (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements_text(c.langs) x where x <> c.src_lang and not (l.tr ? x))) order by l.seq)
      from (select * from lms_o_caption_line l where l.room_id = c.room_id and exists (select 1 from jsonb_array_elements_text(c.langs) x where x <> c.src_lang and not (l.tr ? x))
        and (jsonb_typeof(a->'seqs') is distinct from 'array' or l.seq in (select (z #>> '{}')::int from jsonb_array_elements(a->'seqs') z where jsonb_typeof(z) = 'number')) order by l.seq limit 20) l), '[]'));
end $$;
-- 규칙 기반 번역(키가 없을 때): 강의 용어 사전으로 바꾸고 나머지는 원문 그대로 둔다 — 화면에 「규칙 번역」으로 표시
create or replace function lms_lv_rule_tr(t text, src text, dst text) returns text language plpgsql immutable as $$
declare d jsonb := '{
  "ko>en":{"안녕하세요":"Hello","여러분":"everyone","오늘":"today","수업":"class","강의":"lecture","과제":"assignment","시험":"exam","중간고사":"midterm exam","기말고사":"final exam","질문":"question","답변":"answer","예제":"example","정의":"definition","개념":"concept","데이터":"data","알고리즘":"algorithm","자료구조":"data structure","배열":"array","리스트":"list","스택":"stack","큐":"queue","트리":"tree","그래프":"graph","정렬":"sorting","탐색":"search","함수":"function","변수":"variable","복잡도":"complexity","다음 주":"next week","이번 주":"this week","시작하겠습니다":"let us begin","감사합니다":"thank you","중요합니다":"is important","입니다":" is","합니다":" do"},
  "ko>ja":{"안녕하세요":"こんにちは","여러분":"皆さん","오늘":"今日","수업":"授業","강의":"講義","과제":"課題","시험":"試験","질문":"質問","답변":"回答","예제":"例題","개념":"概念","데이터":"データ","알고리즘":"アルゴリズム","자료구조":"データ構造","배열":"配列","스택":"スタック","큐":"キュー","트리":"木","그래프":"グラフ","정렬":"ソート","함수":"関数","변수":"変数","감사합니다":"ありがとうございます"},
  "ko>zh":{"안녕하세요":"你好","여러분":"大家","오늘":"今天","수업":"课","강의":"讲座","과제":"作业","시험":"考试","질문":"问题","답변":"回答","예제":"例题","개념":"概念","데이터":"数据","알고리즘":"算法","자료구조":"数据结构","배열":"数组","스택":"栈","큐":"队列","트리":"树","그래프":"图","정렬":"排序","함수":"函数","변수":"变量","감사합니다":"谢谢"},
  "ko>vi":{"안녕하세요":"Xin chào","여러분":"các bạn","오늘":"hôm nay","수업":"lớp học","강의":"bài giảng","과제":"bài tập","시험":"kỳ thi","질문":"câu hỏi","답변":"câu trả lời","예제":"ví dụ","개념":"khái niệm","데이터":"dữ liệu","알고리즘":"thuật toán","자료구조":"cấu trúc dữ liệu","배열":"mảng","함수":"hàm","변수":"biến","감사합니다":"cảm ơn"},
  "en>ko":{"hello":"안녕하세요","everyone":"여러분","today":"오늘","class":"수업","lecture":"강의","assignment":"과제","exam":"시험","question":"질문","answer":"답변","example":"예제","definition":"정의","concept":"개념","data":"데이터","algorithm":"알고리즘","array":"배열","list":"리스트","stack":"스택","queue":"큐","tree":"트리","graph":"그래프","function":"함수","variable":"변수","thank you":"감사합니다"}
}'; m jsonb := d->(src || '>' || dst); k text; out text := t;
begin
  if m is null then return null; end if;
  for k in select key from jsonb_each_text(m) order by length(key) desc, key loop
    out := replace(out, k, m->>k);
    if src = 'en' then out := regexp_replace(out, '\m' || k || '\M', m->>k, 'gi'); end if;
  end loop;
  return out;
end $$;
-- 번역 저장: items[{seq, lang, text}](AI 결과) 또는 rule = true(규칙 번역으로 남은 언어 채우기)
create or replace function lms_live_cap_tr_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a); x jsonb; n int := 0; eng text := coalesce(nullif(a->>'engine', ''), 'ai'); l lms_o_caption_line; tg text; v text;
begin
  if eng not in ('ai','rule') then perform lms_x_err(400, 'engine', '번역 엔진 표시가 올바르지 않습니다.'); end if;
  if jsonb_typeof(a->'items') = 'array' then
    for x in select * from jsonb_array_elements(a->'items') loop
      continue when not ((x->>'lang') = any(lms_lv_langs())) or x->>'lang' = c.src_lang or not (c.langs ? (x->>'lang')) or coalesce(x->>'text', '') = '';
      update lms_o_caption_line set tr = tr || jsonb_build_object(x->>'lang', left(x->>'text', 1000)), tr_engine = tr_engine || jsonb_build_object(x->>'lang', eng)
      where room_id = c.room_id and seq = (x->>'seq')::int and not (tr ? (x->>'lang')); if found then n := n + 1; end if;
    end loop;
  end if;
  if lms_x_bool(a, 'rule', false) then
    for l in select * from lms_o_caption_line where room_id = c.room_id and (jsonb_typeof(a->'seqs') is distinct from 'array' or seq in (select (z #>> '{}')::int from jsonb_array_elements(a->'seqs') z where jsonb_typeof(z) = 'number')) order by seq loop
      for tg in select y from jsonb_array_elements_text(c.langs) y where y <> c.src_lang and not (l.tr ? y) loop
        v := coalesce(lms_lv_rule_tr(l.text, c.src_lang, tg), l.text);
        update lms_o_caption_line set tr = tr || jsonb_build_object(tg, v), tr_engine = tr_engine || jsonb_build_object(tg, 'rule') where room_id = c.room_id and seq = l.seq; n := n + 1;
      end loop;
    end loop;
  end if;
  return jsonb_build_object('saved', n, 'engine', case when lms_x_bool(a, 'rule', false) then 'rule' else eng end,
    'lines', coalesce((select jsonb_agg(lms_lv_cap_line_j(l2) order by l2.seq) from (select * from lms_o_caption_line l2 where l2.room_id = c.room_id order by l2.seq desc limit 20) l2), '[]'));
end $$;
-- 수업 후: 종료 · 대본 저장
create or replace function lms_live_cap_finish(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a);
begin
  update lms_o_caption_room set status = 'closed', finished_at = coalesce(finished_at, now()),
    transcript = coalesce(transcript, (select string_agg(l.text, E'\n' order by l.seq) from lms_o_caption_line l where l.room_id = c.room_id), '') where room_id = c.room_id returning * into c;
  return jsonb_build_object('room', lms_lv_cap_j(c), 'transcript', c.transcript, '_audit', lms_x_audit('lms.live.cap_finish', jsonb_build_object('id', c.room_id)));
end $$;
create or replace function lms_live_cap_get(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room; pid uuid;
begin
  select * into c from lms_o_caption_room where room_id = lms_x_uuid(a->>'room_id', '자막방');
  if c.room_id is null then perform lms_x_err(404, 'room', '자막방을 찾을 수 없습니다.'); end if;
  if ctx->>'kind' = 'learner' then
    pid := lms_x_learner(ctx);
    if c.visibility <> 'public' or c.section_id is null or lms_x_enr(c.section_id, pid) is null then perform lms_x_err(403, 'private', '공개된 수업 대본만 볼 수 있습니다.'); end if;
    return jsonb_build_object('room', lms_lv_cap_j(c) - 'code', 'transcript', c.transcript, 'summary', c.summary);
  end if;
  perform lms_x_staff(ctx); if c.section_id is not null then perform lms_x_scope(c.section_id); end if;
  return jsonb_build_object('room', lms_lv_cap_j(c), 'transcript', coalesce(c.transcript, (select string_agg(l.text, E'\n' order by l.seq) from lms_o_caption_line l where l.room_id = c.room_id)), 'summary', c.summary, 'saved', c.transcript is not null);
end $$;
create or replace function lms_live_cap_script(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a); v text := nullif(a->>'visibility', '');
begin
  if v is not null and v not in ('private','public') then perform lms_x_err(400, 'visibility', '공개 범위는 private · public 입니다.'); end if;
  if a ? 'transcript' and (jsonb_typeof(a->'transcript') <> 'string' or length(a->>'transcript') > 200000) then perform lms_x_err(400, 'transcript', '대본은 20만 자까지 글자로 넣으세요.'); end if;
  if a ? 'summary' and (jsonb_typeof(a->'summary') <> 'string' or length(a->>'summary') > 20000) then perform lms_x_err(400, 'summary', '요약은 2만 자까지 글자로 넣으세요.'); end if;
  if v = 'public' and c.section_id is null then perform lms_x_err(400, 'section', '분반이 없는 자막방은 학생에게 공개할 수 없습니다.'); end if;
  update lms_o_caption_room set transcript = case when a ? 'transcript' then a->>'transcript' else transcript end, summary = case when a ? 'summary' then a->>'summary' else summary end,
    summary_engine = case when a ? 'summary' then 'manual' else summary_engine end, visibility = coalesce(v, visibility) where room_id = c.room_id returning * into c;
  return jsonb_build_object('room', lms_lv_cap_j(c), 'transcript', c.transcript, 'summary', c.summary, '_audit', lms_x_audit('lms.live.cap_script', jsonb_build_object('id', c.room_id, 'visibility', c.visibility)));
end $$;
-- 요약 저장(AI 결과) 또는 rule = true(규칙 요약: 자주 나온 낱말이 많은 문장 5개를 원래 순서로)
create or replace function lms_lv_rule_sum(t text) returns text language plpgsql immutable as $$
declare out text;
begin
  with s as (select row_number() over () n, btrim(x) x from regexp_split_to_table(coalesce(t, ''), E'(?<=[.?!。])\\s+|\\n+') x where length(btrim(x)) >= 8),
    w as (select lower(m[1]) w from s, regexp_matches(s.x, '([[:alnum:]가-힣]{2,})', 'g') m),
    f as (select w, count(*) c from w group by w having count(*) >= 2),
    sc as (select s.n, s.x, coalesce((select sum(f.c) from f where position(f.w in lower(s.x)) > 0), 0) score from s),
    top as (select * from sc order by score desc, n limit 5)
  select string_agg('- ' || x, E'\n' order by n) into out from top;
  return coalesce(out, '(요약할 문장이 없습니다)');
end $$;
create or replace function lms_live_cap_sum_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a); t text; rule boolean := lms_x_bool(a, 'rule', false);
begin
  t := coalesce(c.transcript, (select string_agg(l.text, E'\n' order by l.seq) from lms_o_caption_line l where l.room_id = c.room_id));
  if coalesce(t, '') = '' then perform lms_x_err(422, 'empty', '요약할 자막이 없습니다.'); end if;
  update lms_o_caption_room set summary = case when rule then lms_lv_rule_sum(t) else left(lms_x_str(a, 'summary', 20000, true, '요약'), 20000) end, summary_engine = case when rule then 'rule' else 'ai' end
  where room_id = c.room_id returning * into c;
  return jsonb_build_object('room', lms_lv_cap_j(c), 'summary', c.summary, 'engine', c.summary_engine, '_audit', lms_x_audit('lms.live.cap_summary', jsonb_build_object('id', c.room_id, 'engine', c.summary_engine)));
end $$;
-- 이용 현황(기간 · 분반별 · 언어별)
create or replace function lms_live_cap_stats(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare d int := lms_x_num(a, 'days', 1, 365, 30, '기간');
begin
  perform lms_x_staff(ctx);
  return (with R as (select c.* from lms_o_caption_room c where c.created_at >= now() - make_interval(days => d) and (c.section_id is null or lms_x_can(c.section_id))),
    L as (select l.* from lms_o_caption_line l join R on R.room_id = l.room_id),
    TR as (select e.key lang, e.value #>> '{}' eng from L, jsonb_each(L.tr_engine) e),
    V as (select v.* from lms_live_cap_view v join R on R.room_id = v.room_id)
  select jsonb_build_object('days', d, 'rooms', (select count(*) from R), 'lines', (select count(*) from L),
    'stt', (select count(*) from L where source = 'stt'), 'manual', (select count(*) from L where source = 'manual'), 'edited', (select count(*) from L where edited),
    'translated', coalesce((select jsonb_object_agg(lang, n) from (select lang, count(*) n from TR group by lang) z), '{}'),
    'engines', coalesce((select jsonb_object_agg(eng, n) from (select eng, count(*) n from TR group by eng) z), '{}'),
    'viewers', coalesce((select jsonb_object_agg(lang, n) from (select lang, count(distinct viewer) n from V group by lang) z), '{}'),
    'minutes', coalesce((select sum(m)::int from (select ceil(extract(epoch from max(L.at) - min(L.at)) / 60.0) m from L group by L.room_id) z), 0),
    'public', (select count(*) from R where visibility = 'public'), 'summaries', (select count(*) from R where summary is not null),
    'by_section', coalesce((select jsonb_agg(jsonb_build_object('section_id', z.section_id, 'title', coalesce(s.title, '기관 공통'), 'rooms', z.rooms, 'lines', z.lines) order by z.lines desc, s.title)
      from (select R.section_id, count(distinct R.room_id) rooms, count(L.seq) lines from R left join L on L.room_id = R.room_id group by R.section_id) z left join lms_section s on s.section_id = z.section_id), '[]')));
end $$;
-- 음성 파일 후처리 대기열(브라우저 받아쓰기가 없을 때) — 파일은 묶음 E 저장소(POST /api/lms/e/file)에 먼저 올린다
create or replace function lms_live_cap_audio(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a); j lms_live_cap_audio; f jsonb := a->'file_ids';
begin
  if jsonb_typeof(f) <> 'array' or jsonb_array_length(f) not between 1 and 50 then perform lms_x_err(400, 'file_ids', '음성 파일(file_ids)을 1~50개 넣으세요.'); end if;
  if exists (select 1 from jsonb_array_elements_text(f) x where not exists (select 1 from lms_file lf where lf.file_id::text = x and (lf.mime like 'audio/%' or lf.mime like 'video/%'))) then
    perform lms_x_err(400, 'file', '음성 · 영상 파일만 올릴 수 있습니다(먼저 파일 저장소에 올리세요).'); end if;
  insert into lms_live_cap_audio (tenant_id, room_id, file_ids, lang, created_by) values (lms_x_tid(), c.room_id, f, c.src_lang, ctx->>'email') returning * into j;
  return jsonb_build_object('job', jsonb_build_object('job_id', j.job_id, 'room_id', j.room_id, 'files', jsonb_array_length(j.file_ids), 'lang', j.lang, 'hook', j.hook, 'status', j.status, 'created_at', lms_x_ts(j.created_at)),
    '_audit', lms_x_audit('lms.live.cap_audio', jsonb_build_object('id', c.room_id, 'job', j.job_id)));
end $$;
create or replace function lms_live_cap_audio_list(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_o_caption_room := lms_lv_cap(ctx, a);
begin
  return jsonb_build_object('jobs', coalesce((select jsonb_agg(jsonb_build_object('job_id', j.job_id, 'files', jsonb_array_length(j.file_ids), 'lang', j.lang, 'hook', j.hook, 'status', j.status, 'created_at', lms_x_ts(j.created_at), 'done_at', lms_x_ts(j.done_at)) order by j.created_at desc, j.job_id)
    from lms_live_cap_audio j where j.room_id = c.room_id), '[]'));
end $$;
