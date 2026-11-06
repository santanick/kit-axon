-- 외부 연계 자체 구현 x3(2026-11-07): ① SFR-089 온라인 시험 부정행위 방지(웹 감독) ② SFR-016 원격수업 대리출석 방지(패스키 · 인증 앱 · 이메일 어댑터)
-- 규약은 30_e.sql 머리 주석과 같다: fn(ctx jsonb, a jsonb) returns jsonb · 오류 detail 'dd:상태:코드' · 결과 _audit → audit_log.
-- 기존 함수 lms_f_answer · lms_f_submit은 *_p0으로 이름을 바꿔 감싼다(감독을 켠 시험에서만 동작이 달라진다 — 기존 응답 형태는 그대로).
-- 개인정보: 웹캠 사진은 동의 · 보존 기간(기관 설정, 기본 30일) · 자동 파기 · 열람 기록을 둔다. 생체 정보는 저장하지 않는다(패스키는 공개키만).

-- ═════════ 공용 도우미 ═════════
-- 무작위 바이트(gen_random_uuid는 강한 난수원을 쓴다 — pgcrypto 없이)
create or replace function lms_x_rand() returns bytea language sql volatile as $$
  select sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')) $$;
create or replace function lms_x_b64u(b bytea) returns text language sql immutable as $$
  select rtrim(translate(replace(encode(b, 'base64'), E'\n', ''), '+/', '-_'), '=') $$;
create or replace function lms_x_hash(t text) returns text language sql immutable as $$ select encode(sha256(convert_to(coalesce(t, ''), 'UTF8')), 'hex') $$;
-- RFC 4648 base32(인증 앱 비밀키 표기)
create or replace function lms_x_b32(b bytea) returns text language plpgsql immutable as $$
declare A text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; o text := ''; buf bigint := 0; bits int := 0; i int;
begin
  for i in 0 .. length(b) - 1 loop
    buf := ((buf << 8) | get_byte(b, i)) & 1099511627775; bits := bits + 8;
    while bits >= 5 loop o := o || substr(A, ((buf >> (bits - 5)) & 31)::int + 1, 1); bits := bits - 5; end loop;
  end loop;
  if bits > 0 then o := o || substr(A, ((buf << (5 - bits)) & 31)::int + 1, 1); end if;
  return o;
end $$;
create or replace function lms_x_b32d(s text) returns bytea language plpgsql immutable as $$
declare A text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; o bytea := ''; buf bigint := 0; bits int := 0; ch text; v int;
begin
  foreach ch in array regexp_split_to_array(upper(regexp_replace(coalesce(s, ''), '[\s=]', '', 'g')), '') loop
    v := strpos(A, ch) - 1; if v < 0 then return null; end if;
    buf := ((buf << 5) | v) & 1099511627775; bits := bits + 5;
    if bits >= 8 then o := o || set_byte('\x00'::bytea, 0, ((buf >> (bits - 8)) & 255)::int); bits := bits - 8; end if;
  end loop;
  return o;
end $$;
-- SHA-1 · HMAC-SHA1 · TOTP(RFC 6238, 30초 · 6자리) — 인증 앱 호환을 위해 SHA-1을 SQL로 계산한다(Node · Java가 같은 함수를 부른다)
create or replace function lms_x_sha1(m bytea) returns bytea language plpgsql immutable strict as $$
declare msk bigint := 4294967295; h0 bigint := 1732584193; h1 bigint := 4023233417; h2 bigint := 2562383102; h3 bigint := 271733878; h4 bigint := 3285377520;
  p bytea; w bigint[]; a bigint; b bigint; c bigint; d bigint; e bigint; f bigint; k bigint; t bigint; i int; o int; blk int;
begin
  p := m || '\x80'::bytea;
  while length(p) % 64 <> 56 loop p := p || '\x00'::bytea; end loop;
  p := p || int8send(length(m)::bigint * 8);
  for blk in 0 .. length(p) / 64 - 1 loop
    o := blk * 64; w := array_fill(0::bigint, array[80]);
    for i in 0 .. 15 loop w[i + 1] := (get_byte(p, o + i * 4)::bigint << 24) | (get_byte(p, o + i * 4 + 1)::bigint << 16) | (get_byte(p, o + i * 4 + 2)::bigint << 8) | get_byte(p, o + i * 4 + 3)::bigint; end loop;
    for i in 16 .. 79 loop t := w[i - 2] # w[i - 7] # w[i - 13] # w[i - 15]; w[i + 1] := ((t << 1) | (t >> 31)) & msk; end loop;
    a := h0; b := h1; c := h2; d := h3; e := h4;
    for i in 0 .. 79 loop
      if i < 20 then f := (b & c) | ((~b & msk) & d); k := 1518500249;
      elsif i < 40 then f := b # c # d; k := 1859775393;
      elsif i < 60 then f := (b & c) | (b & d) | (c & d); k := 2400959708;
      else f := b # c # d; k := 3395469782; end if;
      t := ((((a << 5) | (a >> 27)) & msk) + f + e + k + w[i + 1]) & msk;
      e := d; d := c; c := ((b << 30) | (b >> 2)) & msk; b := a; a := t;
    end loop;
    h0 := (h0 + a) & msk; h1 := (h1 + b) & msk; h2 := (h2 + c) & msk; h3 := (h3 + d) & msk; h4 := (h4 + e) & msk;
  end loop;
  return substring(int8send(h0) from 5) || substring(int8send(h1) from 5) || substring(int8send(h2) from 5) || substring(int8send(h3) from 5) || substring(int8send(h4) from 5);
end $$;
create or replace function lms_x_hmac1(k bytea, m bytea) returns bytea language plpgsql immutable strict as $$
declare kp bytea; ip bytea; op bytea; i int;
begin
  if length(k) > 64 then k := lms_x_sha1(k); end if;
  kp := k || decode(repeat('00', 64 - length(k)), 'hex'); ip := kp; op := kp;
  for i in 0 .. 63 loop ip := set_byte(ip, i, get_byte(kp, i) # 54); op := set_byte(op, i, get_byte(kp, i) # 92); end loop;
  return lms_x_sha1(op || lms_x_sha1(ip || m));
end $$;
create or replace function lms_x_totp(secret bytea, step bigint) returns text language plpgsql immutable strict as $$
declare h bytea := lms_x_hmac1(secret, int8send(step)); o int; v bigint;
begin
  o := get_byte(h, 19) & 15;
  v := ((get_byte(h, o) & 127)::bigint << 24) | (get_byte(h, o + 1)::bigint << 16) | (get_byte(h, o + 2)::bigint << 8) | get_byte(h, o + 3)::bigint;
  return lpad((v % 1000000)::text, 6, '0');
end $$;

-- ═════════ ① SFR-089 시험 감독 ═════════
alter table lms_efh_setting add column if not exists proctor_keep_days int not null default 30;
alter table lms_efh_setting drop constraint if exists lms_efh_setting_proctor_keep_chk;
alter table lms_efh_setting add constraint lms_efh_setting_proctor_keep_chk check (proctor_keep_days between 1 and 365);

create table if not exists lms_proctor_cfg (
  tenant_id text not null, exam_id uuid not null,
  enabled boolean not null default false,
  need_camera boolean not null default true, need_mic boolean not null default false, id_photo boolean not null default true,
  fullscreen boolean not null default true, block_copy boolean not null default true, face_check boolean not null default true,
  snap_sec int not null default 60 check (snap_sec = 0 or snap_sec between 15 and 600),
  single_device text not null default 'kick' check (single_device in ('off', 'kick', 'block')),
  idv text not null default 'none' check (idv in ('none', 'webauthn', 'totp', 'any')),
  secure_browser boolean not null default false,
  risk_flag int not null default 30 check (risk_flag between 1 and 100),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, exam_id),
  foreign key (tenant_id, exam_id) references lms_exam (tenant_id, exam_id) on delete cascade
);
create table if not exists lms_proctor_sess (
  tenant_id text not null, attempt_id uuid not null, exam_id uuid not null, person_id uuid not null,
  token_hash text not null, device text, checks jsonb not null default '{}', consent_at timestamptz not null,
  began_at timestamptz not null default now(), last_at timestamptz not null default now(), ended_at timestamptz, gen int not null default 1,
  risk int not null default 0, decision text not null default 'pending' check (decision in ('pending', 'ok', 'warn', 'void')),
  decided_by text, decided_at timestamptz, note text,
  primary key (tenant_id, attempt_id),
  foreign key (tenant_id, attempt_id) references lms_exam_attempt (tenant_id, attempt_id) on delete cascade
);
create table if not exists lms_proctor_event (
  tenant_id text not null, id bigserial, attempt_id uuid not null,
  at timestamptz not null default now(), client_at timestamptz, kind text not null, weight int not null default 0, detail jsonb,
  primary key (tenant_id, id),
  foreign key (tenant_id, attempt_id) references lms_exam_attempt (tenant_id, attempt_id) on delete cascade
);
create index if not exists lms_pev_att on lms_proctor_event (tenant_id, attempt_id, id);
create table if not exists lms_proctor_snap (
  tenant_id text not null, snap_id uuid not null default gen_random_uuid(), attempt_id uuid not null,
  kind text not null check (kind in ('id', 'periodic', 'flag')), at timestamptz not null default now(),
  faces int, face_method text, bytes int not null default 0, data bytea, purge_at timestamptz not null, purged_at timestamptz,
  primary key (tenant_id, snap_id),
  foreign key (tenant_id, attempt_id) references lms_exam_attempt (tenant_id, attempt_id) on delete cascade
);
create index if not exists lms_psnap_att on lms_proctor_snap (tenant_id, attempt_id, at);
create index if not exists lms_psnap_purge on lms_proctor_snap (tenant_id, purge_at) where purged_at is null;
-- 열람 기록(누가 · 언제 · 어떤 응시의 타임라인 · 사진을 봤는가)
create table if not exists lms_proctor_view (
  tenant_id text not null, id bigserial, exam_id uuid not null, attempt_id uuid, snap_id uuid,
  viewer text not null, role text, what text not null, at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_pview_ex on lms_proctor_view (tenant_id, exam_id, id);

-- ═════════ ② SFR-016 본인 확인 ═════════
create table if not exists lms_idv_rule (
  tenant_id text not null, section_id uuid not null,
  method text not null default 'none' check (method in ('none', 'webauthn', 'totp', 'any', 'email')),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, section_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
-- 패스키(WebAuthn): 공개키(SPKI DER, base64url)와 서명 횟수만 저장한다. 지문 · 얼굴 등 생체 정보는 기기 밖으로 나오지 않는다.
create table if not exists lms_wa_cred (
  tenant_id text not null, cred_id text not null, member_no text not null,
  public_key text not null, alg int not null, sign_count bigint not null default 0, uv boolean not null default false,
  label text, created_at timestamptz not null default now(), last_used_at timestamptz,
  primary key (tenant_id, cred_id)
);
create index if not exists lms_wa_cred_m on lms_wa_cred (tenant_id, member_no);
create table if not exists lms_idv_challenge (
  tenant_id text not null, ch_id uuid not null default gen_random_uuid(), member_no text not null,
  purpose text not null check (purpose in ('register', 'checkin', 'exam')), ref text, challenge text not null,
  created_at timestamptz not null default now(), used_at timestamptz,
  primary key (tenant_id, ch_id)
);
create index if not exists lms_idv_ch_m on lms_idv_challenge (tenant_id, member_no, created_at);
-- 인증 앱(TOTP): 공유 비밀키는 서버가 계산에 써야 하므로 저장한다(기관 범위 RLS)
create table if not exists lms_totp (
  tenant_id text not null, member_no text not null, secret text not null,
  confirmed_at timestamptz, last_step bigint, fail_n int not null default 0, fail_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (tenant_id, member_no)
);
-- 본인 확인 통과 표(1회용, 10분) — 출석 · 시험 시작이 소비한다
create table if not exists lms_idv_ticket (
  tenant_id text not null, ticket_id uuid not null default gen_random_uuid(), member_no text not null,
  purpose text not null check (purpose in ('checkin', 'exam')), ref text not null, method text not null check (method in ('webauthn', 'totp', 'email')),
  created_at timestamptz not null default now(), used_at timestamptz,
  primary key (tenant_id, ticket_id)
);
create index if not exists lms_idv_tk_m on lms_idv_ticket (tenant_id, member_no, purpose, ref);
-- 이메일 인증번호(어댑터): 학교 메일 게이트웨이가 가져가 보낸다. 주소는 저장하지 않는다(게이트웨이가 학번으로 찾는다).
create table if not exists lms_idv_mail (
  tenant_id text not null, id uuid not null default gen_random_uuid(), member_no text not null,
  purpose text not null, ref text not null, code text, code_hash text not null,
  status text not null default 'queued' check (status in ('queued', 'sent')),
  created_at timestamptz not null default now(), expires_at timestamptz not null, tries int not null default 0, used_at timestamptz,
  primary key (tenant_id, id)
);

do $$ declare t text; begin
  foreach t in array array['lms_proctor_cfg', 'lms_proctor_sess', 'lms_proctor_event', 'lms_proctor_snap', 'lms_proctor_view',
      'lms_idv_rule', 'lms_wa_cred', 'lms_idv_challenge', 'lms_totp', 'lms_idv_ticket', 'lms_idv_mail'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_proctor_event_id_seq to didisam_tenant;
  grant usage on sequence lms_proctor_view_id_seq to didisam_tenant;
end $$;

-- ═════════ 시험 감독: 도우미 ═════════
create or replace function lms_f_pkeep() returns int language sql stable as $$ select coalesce((select proctor_keep_days from lms_efh_setting), 30) $$;
create or replace function lms_f_pconsent(k int) returns text language sql immutable as $$
  select '이 시험은 부정행위 방지를 위해 응시 중 다음을 기록합니다: ① 응시 전 본인 확인 사진 1장 ② 정해진 간격의 웹캠 사진 ③ 전체 화면 이탈 · 창 전환 · 복사 · 붙여넣기 · 인쇄 · 개발자 도구 단축키 같은 화면 사건과 시각. '
    || '영상 · 소리는 녹화하지 않고 사진만 저장하며, 얼굴 인식은 이 기기 안에서 얼굴 수만 셉니다(얼굴 특징 · 생체 정보는 저장하지 않음). '
    || '사진은 담당 교수 · 운영자만 보며, 볼 때마다 열람 기록이 남습니다. 사진은 촬영 ' || k || '일 뒤 자동 파기됩니다. 동의하지 않으면 감독 시험에 응시할 수 없으니 교수자에게 대체 방법을 문의하세요.' $$;
create or replace function lms_f_plimits() returns jsonb language sql immutable as $$
  select '["웹 페이지는 다른 프로그램(메신저 · 원격 제어 · 녹화 프로그램)의 실행을 막을 수 없습니다.","웹 페이지는 PC 화면 전체를 녹화하거나 다른 모니터를 볼 수 없습니다.","캡처 키 · 화면 공유는 일부만 감지합니다(운영체제 단축키는 브라우저가 받지 못할 수 있음).","휴대폰 등 두 번째 기기 사용은 웹캠 사진과 얼굴 수로만 간접 확인합니다.","완전한 차단이 필요하면 전용 보안 브라우저(연동 후 동작)를 함께 쓰세요."]'::jsonb $$;
create or replace function lms_f_pweight(k text) returns int language sql immutable as $$
  select case k when 'fs_exit' then 10 when 'blur' then 4 when 'hidden' then 6 when 'copy' then 3 when 'cut' then 3 when 'paste' then 5 when 'context' then 1
    when 'print' then 6 when 'devtools' then 8 when 'capture' then 10 when 'shortcut' then 2 when 'no_face' then 8 when 'multi_face' then 15 when 'cam_off' then 12
    when 'net_off' then 2 when 'resize' then 1 when 'second_device' then 20 when 'blocked_device' then 10 else 0 end $$;
create or replace function lms_f_pcfg(ex uuid) returns jsonb language plpgsql stable as $$
declare c lms_proctor_cfg;
begin
  select * into c from lms_proctor_cfg where exam_id = ex;
  if c.exam_id is null then c.exam_id := ex; c.enabled := false; c.need_camera := true; c.need_mic := false; c.id_photo := true; c.fullscreen := true; c.block_copy := true; c.face_check := true;
    c.snap_sec := 60; c.single_device := 'kick'; c.idv := 'none'; c.secure_browser := false; c.risk_flag := 30; end if;
  return jsonb_build_object('exam_id', c.exam_id, 'enabled', c.enabled, 'need_camera', c.need_camera, 'need_mic', c.need_mic, 'id_photo', c.id_photo, 'fullscreen', c.fullscreen,
    'block_copy', c.block_copy, 'face_check', c.face_check, 'snap_sec', c.snap_sec, 'single_device', c.single_device, 'idv', c.idv, 'secure_browser', c.secure_browser, 'risk_flag', c.risk_flag);
end $$;
-- 위험 점수: 사건 종류별 (가중치 × 횟수)를 가중치 5배까지만 더하고 100에서 자른다
create or replace function lms_f_prisk(att uuid) returns int language sql stable as $$
  select least(100, coalesce(sum(least(w * n, w * 5)), 0))::int from (select max(weight) w, count(*) n from lms_proctor_event where attempt_id = att and weight > 0 group by kind) x $$;
create or replace function lms_f_ppurge_due() returns int language plpgsql as $$
declare n int;
begin
  update lms_proctor_snap set data = null, purged_at = now() where purged_at is null and purge_at <= now();
  get diagnostics n = row_count; return n;
end $$;
create or replace function lms_f_pevent_add(att uuid, k text, d jsonb, cat timestamptz) returns void language plpgsql as $$
begin
  insert into lms_proctor_event (tenant_id, attempt_id, kind, weight, detail, client_at) values (lms_x_tid(), att, k, lms_f_pweight(k), d, cat);
  update lms_proctor_sess set risk = lms_f_prisk(att) where attempt_id = att;
end $$;
-- 학습자 본인 응시 + 감독 세션(토큰 확인)
create or replace function lms_f_psess(ctx jsonb, a jsonb, out t lms_exam_attempt, out s lms_proctor_sess, out c jsonb) language plpgsql as $$
begin
  t := lms_f_my_attempt(ctx, lms_x_uuid(a->>'attempt_id', '응시'));
  c := lms_f_pcfg(t.exam_id);
  select * into s from lms_proctor_sess where attempt_id = t.attempt_id;
  if s.attempt_id is null then perform lms_x_err(409, 'proctor_begin', '응시 감독 준비(장치 확인 · 동의)를 먼저 마치세요.'); end if;
  if c->>'single_device' <> 'off' and s.token_hash is distinct from lms_x_hash(a->>'ptoken') then
    perform lms_x_err(409, 'replaced', '다른 기기 · 창에서 이 시험을 이어 응시하고 있어 이 화면은 종료되었습니다.'); end if;
  update lms_proctor_sess set last_at = now() where attempt_id = t.attempt_id returning * into s;
end $$;

-- ═════════ 시험 감독: 학습자 ═════════
create or replace function lms_f_proctor(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare pid uuid := lms_x_learner(ctx); x lms_exam := lms_f_exam(lms_x_uuid(a->>'exam', '시험')); c jsonb; t lms_exam_attempt; s lms_proctor_sess;
begin
  if lms_x_enr(x.section_id, pid) is null then perform lms_x_err(403, 'not_enrolled', '수강 중인 분반이 아닙니다.'); end if;
  c := lms_f_pcfg(x.exam_id);
  select * into t from lms_exam_attempt where exam_id = x.exam_id and person_id = pid and status = 'in_progress';
  if t.attempt_id is not null then select * into s from lms_proctor_sess where attempt_id = t.attempt_id; end if;
  return jsonb_build_object('exam_id', x.exam_id, 'cfg', c, 'consent', lms_f_pconsent(lms_f_pkeep()), 'keep_days', lms_f_pkeep(), 'limits', lms_f_plimits(),
    'session', case when s.attempt_id is null then null else jsonb_build_object('attempt_id', s.attempt_id, 'began_at', lms_x_ts(s.began_at), 'risk', s.risk) end);
end $$;
-- 감독 시작(응시 시작 직후): 동의 · 장치 확인 · 본인 확인 표 · 1기기 규칙 → 감독 토큰
create or replace function lms_f_proctor_begin(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt := lms_f_my_attempt(ctx, lms_x_uuid(a->>'attempt_id', '응시')); c jsonb := lms_f_pcfg(t.exam_id); s lms_proctor_sess;
  ck jsonb := coalesce(a->'checks', '{}'); tok text; tk uuid; ev text := 'begin'; mno text := ctx->>'sid';
begin
  if not (c->>'enabled')::boolean then perform lms_x_err(409, 'proctor_off', '감독을 쓰지 않는 시험입니다.'); end if;
  if t.status <> 'in_progress' then perform lms_x_err(409, 'finished', '이미 제출한 시험입니다.'); end if;
  if jsonb_typeof(ck) <> 'object' or length(ck::text) > 2000 then perform lms_x_err(400, 'checks', '장치 확인 결과 형식이 올바르지 않습니다.'); end if;
  if not lms_x_bool(a, 'consent', false) then perform lms_x_err(400, 'consent', '감독 기록(사진 · 화면 사건)에 동의해야 응시할 수 있습니다.'); end if;
  if (c->>'need_camera')::boolean and not lms_x_bool(ck, 'camera', false) then perform lms_x_err(409, 'device', '카메라 사용을 허용해야 응시할 수 있습니다. 브라우저 주소창의 카메라 권한을 확인하세요.'); end if;
  if (c->>'need_mic')::boolean and not lms_x_bool(ck, 'mic', false) then perform lms_x_err(409, 'device', '마이크 사용을 허용해야 응시할 수 있습니다.'); end if;
  if (c->>'secure_browser')::boolean and (jsonb_typeof(a->'secure_browser') is distinct from 'object' or nullif(a->'secure_browser'->>'vendor', '') is null) then
    perform lms_x_err(428, 'secure_browser', '이 시험은 전용 보안 브라우저에서만 응시할 수 있습니다(보안 브라우저 연동 후 동작).'); end if;
  select * into s from lms_proctor_sess where attempt_id = t.attempt_id;
  if s.attempt_id is not null and c->>'single_device' = 'block' and s.ended_at is null and s.last_at > now() - interval '90 seconds'
     and s.token_hash is distinct from lms_x_hash(a->>'ptoken') then
    perform lms_f_pevent_add(t.attempt_id, 'blocked_device', jsonb_build_object('device', left(coalesce(a->>'device', ''), 60)), null);
    return jsonb_build_object('blocked', true, 'error', 'other_device', 'message', '이미 다른 기기 · 창에서 응시 중입니다. 그 기기에서 이어서 응시하세요(1분 30초 동안 응답이 없으면 이 기기로 옮길 수 있습니다).');
  end if;
  -- 본인 확인(패스키 · 인증 앱): 처음 시작할 때만, 표 1장 소비
  if c->>'idv' <> 'none' and s.attempt_id is null then
    select ticket_id into tk from lms_idv_ticket where member_no = mno and purpose = 'exam' and ref = t.exam_id::text and used_at is null and created_at > now() - interval '10 minutes'
      and (c->>'idv' = 'any' or method = c->>'idv') order by created_at desc limit 1;
    if tk is null then perform lms_x_err(428, 'idv_needed', case c->>'idv' when 'webauthn' then '시험 시작 전 패스키(지문 · 얼굴 인식)로 본인 확인을 하세요.' when 'totp' then '시험 시작 전 인증 앱의 6자리 번호로 본인 확인을 하세요.' else '시험 시작 전 본인 확인(패스키 또는 인증 앱)을 하세요.' end); end if;
    update lms_idv_ticket set used_at = now() where ticket_id = tk;
  end if;
  tok := lms_x_b64u(lms_x_rand());
  if s.attempt_id is null then
    insert into lms_proctor_sess (tenant_id, attempt_id, exam_id, person_id, token_hash, device, checks, consent_at)
    values (lms_x_tid(), t.attempt_id, t.exam_id, t.person_id, lms_x_hash(tok), left(coalesce(a->>'device', ''), 60), ck || jsonb_build_object('secure_browser', a->'secure_browser'), now()) returning * into s;
  else
    if s.token_hash is distinct from lms_x_hash(a->>'ptoken') and s.ended_at is null and s.last_at > now() - interval '90 seconds' and c->>'single_device' = 'kick' then ev := 'second_device'; else ev := 'resume'; end if;
    update lms_proctor_sess set token_hash = lms_x_hash(tok), device = left(coalesce(a->>'device', ''), 60), checks = ck, gen = gen + 1, last_at = now(), ended_at = null where attempt_id = t.attempt_id returning * into s;
  end if;
  perform lms_f_pevent_add(t.attempt_id, ev, jsonb_build_object('device', s.device, 'camera', lms_x_bool(ck, 'camera', false), 'mic', lms_x_bool(ck, 'mic', false), 'idv', case when tk is not null then c->>'idv' end), null);
  select * into s from lms_proctor_sess where attempt_id = t.attempt_id;
  return jsonb_build_object('ptoken', tok, 'cfg', c, 'risk', s.risk, 'gen', s.gen, 'limits', lms_f_plimits(),
    '_audit', lms_x_audit('lms.f.proctor_begin', jsonb_build_object('attempt', t.attempt_id, 'ev', ev)));
end $$;
-- 화면 사건 묶음 보내기(빈 목록 = 연결 확인)
create or replace function lms_f_proctor_event(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r record; e jsonb; n int := 0; k text; cat timestamptz; tot int;
begin
  select * into r from lms_f_psess(ctx, a);
  if (r.t).status <> 'in_progress' then return jsonb_build_object('ended', true, 'accepted', 0, 'risk', (r.s).risk); end if;
  if a->'events' is not null and jsonb_typeof(a->'events') <> 'array' then perform lms_x_err(400, 'events', '사건 목록 형식이 올바르지 않습니다.'); end if;
  if jsonb_array_length(coalesce(a->'events', '[]')) > 50 then perform lms_x_err(400, 'events', '사건은 한 번에 50개까지 보낼 수 있습니다.'); end if;
  select count(*) into tot from lms_proctor_event where attempt_id = (r.t).attempt_id;
  for e in select * from jsonb_array_elements(coalesce(a->'events', '[]')) loop
    k := e->>'kind';
    if k is null or k not in ('fs_exit', 'fs_enter', 'blur', 'focus', 'hidden', 'visible', 'copy', 'cut', 'paste', 'context', 'print', 'devtools', 'capture', 'shortcut',
        'no_face', 'multi_face', 'face_ok', 'cam_off', 'cam_on', 'net_off', 'net_on', 'resize', 'face_skip') then perform lms_x_err(400, 'kind', '알 수 없는 사건 종류입니다: ' || coalesce(k, '')); end if;
    if e->'detail' is not null and length((e->'detail')::text) > 500 then perform lms_x_err(400, 'detail', '사건 설명이 너무 깁니다.'); end if;
    begin cat := (e->>'at')::timestamptz; exception when others then cat := null; end;
    if tot + n < 3000 then
      insert into lms_proctor_event (tenant_id, attempt_id, kind, weight, detail, client_at) values (lms_x_tid(), (r.t).attempt_id, k, lms_f_pweight(k), e->'detail', cat);
      n := n + 1;
    end if;
  end loop;
  update lms_proctor_sess set risk = lms_f_prisk((r.t).attempt_id) where attempt_id = (r.t).attempt_id returning risk into tot;
  return jsonb_build_object('ended', false, 'accepted', n, 'risk', tot, 'flagged', tot >= ((r.c)->>'risk_flag')::int);
end $$;
-- 웹캠 사진(JPEG, 200KB 이하) — 얼굴 수는 브라우저가 기기 안에서 센 값(FaceDetector · 간이 판별 · 건너뜀)
create or replace function lms_f_proctor_snap(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r record; b bytea; k text := coalesce(nullif(a->>'kind', ''), 'periodic'); fc int; fm text := coalesce(nullif(a->>'face_method', ''), 'skip'); id uuid; rk int; last timestamptz;
begin
  select * into r from lms_f_psess(ctx, a);
  if (r.t).status <> 'in_progress' then perform lms_x_err(409, 'finished', '이미 제출한 시험입니다.'); end if;
  if k not in ('id', 'periodic', 'flag') then perform lms_x_err(400, 'kind', '사진 종류가 올바르지 않습니다.'); end if;
  if fm not in ('facedetector', 'heuristic', 'skip') then perform lms_x_err(400, 'face_method', '얼굴 확인 방식이 올바르지 않습니다.'); end if;
  if length(coalesce(a->>'b64', '')) > 280000 then perform lms_x_err(413, 'too_large', '사진은 200KB까지 올릴 수 있습니다.'); end if;
  begin b := decode(coalesce(a->>'b64', ''), 'base64'); exception when others then perform lms_x_err(400, 'b64', '사진 형식이 올바르지 않습니다.'); end;
  if b is null or length(b) < 100 or substring(b from 1 for 3) <> '\xffd8ff'::bytea then perform lms_x_err(400, 'jpeg', 'JPEG 사진만 올릴 수 있습니다.'); end if;
  if length(b) > 204800 then perform lms_x_err(413, 'too_large', '사진은 200KB까지 올릴 수 있습니다.'); end if;
  fc := case when fm = 'skip' then null else lms_x_num(a, 'faces', 0, 20, null, '얼굴 수')::int end;
  select max(at) into last from lms_proctor_snap where attempt_id = (r.t).attempt_id;
  if last is not null and last > now() - interval '5 seconds' then perform lms_x_err(429, 'snap_rate', '사진을 너무 자주 보냈습니다.'); end if;
  if (select count(*) from lms_proctor_snap where attempt_id = (r.t).attempt_id) >= 600 then perform lms_x_err(409, 'snap_max', '이 응시의 사진 수 한도를 넘었습니다.'); end if;
  insert into lms_proctor_snap (tenant_id, attempt_id, kind, faces, face_method, bytes, data, purge_at)
  values (lms_x_tid(), (r.t).attempt_id, k, fc, fm, length(b), b, now() + make_interval(days => lms_f_pkeep())) returning snap_id into id;
  if k = 'id' then perform lms_f_pevent_add((r.t).attempt_id, 'id_photo', jsonb_build_object('faces', fc), null); end if;
  if fc = 0 then perform lms_f_pevent_add((r.t).attempt_id, 'no_face', jsonb_build_object('snap', id, 'method', fm), null);
  elsif fc >= 2 then perform lms_f_pevent_add((r.t).attempt_id, 'multi_face', jsonb_build_object('snap', id, 'faces', fc, 'method', fm), null); end if;
  select risk into rk from lms_proctor_sess where attempt_id = (r.t).attempt_id;
  return jsonb_build_object('snap_id', id, 'faces', fc, 'risk', rk, 'purge_at', lms_x_ts(now() + make_interval(days => lms_f_pkeep())));
end $$;

-- 답안 저장 · 제출 감싸기: 감독을 켠 시험은 감독 시작 · 같은 토큰(1기기)일 때만
do $$ begin
  if to_regprocedure('lms_f_answer_p0(jsonb,jsonb)') is null then alter function lms_f_answer(jsonb, jsonb) rename to lms_f_answer_p0; end if;
  if to_regprocedure('lms_f_submit_p0(jsonb,jsonb)') is null then alter function lms_f_submit(jsonb, jsonb) rename to lms_f_submit_p0; end if;
end $$;
create or replace function lms_f_pguard(ctx jsonb, a jsonb) returns boolean language plpgsql as $$
declare t lms_exam_attempt; pid uuid := lms_x_learner(ctx); id uuid;
begin
  begin id := (a->>'attempt_id')::uuid; exception when others then return false; end;
  select * into t from lms_exam_attempt where attempt_id = id and person_id = pid;
  if t.attempt_id is null or t.status <> 'in_progress' or not (lms_f_pcfg(t.exam_id)->>'enabled')::boolean then return false; end if;
  perform lms_f_psess(ctx, a);
  return true;
end $$;
create or replace function lms_f_answer(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
begin perform lms_f_pguard(ctx, a); return lms_f_answer_p0(ctx, a); end $$;
create or replace function lms_f_submit(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare g boolean := lms_f_pguard(ctx, a); r jsonb;
begin
  r := lms_f_submit_p0(ctx, a);
  if g then
    perform lms_f_pevent_add((a->>'attempt_id')::uuid, 'submit', null, null);
    update lms_proctor_sess set ended_at = now() where attempt_id = (a->>'attempt_id')::uuid;
  end if;
  return r;
end $$;

-- ═════════ 시험 감독: 교수자 ═════════
create or replace function lms_f_proctor_cfg(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare x lms_exam;
begin
  perform lms_x_staff(ctx); x := lms_f_exam(lms_x_uuid(a->>'exam', '시험'));
  return jsonb_build_object('cfg', lms_f_pcfg(x.exam_id), 'keep_days', lms_f_pkeep(), 'consent', lms_f_pconsent(lms_f_pkeep()), 'limits', lms_f_plimits(),
    'adapter', jsonb_build_object('secure_browser', '전용 보안 브라우저(다른 프로그램 차단 · 화면 전체 녹화)는 연동 지점만 있습니다 — 보안 브라우저가 window.DD_SECURE_BROWSER로 자신을 알리면 감독 시작 때 함께 기록합니다.'));
end $$;
create or replace function lms_f_proctor_cfg_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare x lms_exam; c jsonb; sd text; iv text;
begin
  perform lms_x_staff(ctx); x := lms_f_exam(lms_x_uuid(a->>'exam_id', '시험')); c := lms_f_pcfg(x.exam_id);
  sd := coalesce(nullif(a->>'single_device', ''), c->>'single_device'); iv := coalesce(nullif(a->>'idv', ''), c->>'idv');
  if sd not in ('off', 'kick', 'block') then perform lms_x_err(400, 'single_device', '동시 응시 규칙은 off · kick · block 중에서 고르세요.'); end if;
  if iv not in ('none', 'webauthn', 'totp', 'any') then perform lms_x_err(400, 'idv', '본인 확인 방식은 none · webauthn · totp · any 중에서 고르세요.'); end if;
  if lms_x_num(a, 'snap_sec', 0, 600, (c->>'snap_sec')::numeric, '사진 간격(초)') between 1 and 14 then perform lms_x_err(400, 'range', '사진 간격(초)은(는) 0(끔) 또는 15~600 사이로 입력하세요.'); end if;
  insert into lms_proctor_cfg (tenant_id, exam_id, enabled, need_camera, need_mic, id_photo, fullscreen, block_copy, face_check, snap_sec, single_device, idv, secure_browser, risk_flag, updated_at)
  values (lms_x_tid(), x.exam_id, lms_x_bool(a, 'enabled', (c->>'enabled')::boolean), lms_x_bool(a, 'need_camera', (c->>'need_camera')::boolean), lms_x_bool(a, 'need_mic', (c->>'need_mic')::boolean),
    lms_x_bool(a, 'id_photo', (c->>'id_photo')::boolean), lms_x_bool(a, 'fullscreen', (c->>'fullscreen')::boolean), lms_x_bool(a, 'block_copy', (c->>'block_copy')::boolean),
    lms_x_bool(a, 'face_check', (c->>'face_check')::boolean), lms_x_num(a, 'snap_sec', 0, 600, (c->>'snap_sec')::numeric, '사진 간격(초)')::int, sd, iv,
    lms_x_bool(a, 'secure_browser', (c->>'secure_browser')::boolean), lms_x_num(a, 'risk_flag', 1, 100, (c->>'risk_flag')::numeric, '주의 기준 점수')::int, now())
  on conflict (tenant_id, exam_id) do update set enabled = excluded.enabled, need_camera = excluded.need_camera, need_mic = excluded.need_mic, id_photo = excluded.id_photo, fullscreen = excluded.fullscreen,
    block_copy = excluded.block_copy, face_check = excluded.face_check, snap_sec = excluded.snap_sec, single_device = excluded.single_device, idv = excluded.idv,
    secure_browser = excluded.secure_browser, risk_flag = excluded.risk_flag, updated_at = now();
  return jsonb_build_object('cfg', lms_f_pcfg(x.exam_id), '_audit', lms_x_audit('lms.f.proctor_cfg', lms_f_pcfg(x.exam_id)));
end $$;
create or replace function lms_f_proctor_review(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare x lms_exam; c jsonb; L jsonb; fl int;
begin
  perform lms_x_staff(ctx); x := lms_f_exam(lms_x_uuid(a->>'exam', '시험')); perform lms_f_ppurge_due(); c := lms_f_pcfg(x.exam_id); fl := (c->>'risk_flag')::int;
  select coalesce(jsonb_agg(jsonb_build_object('attempt_id', t.attempt_id, 'member_no', p.member_no, 'no', t.no, 'status', t.status,
      'proctored', s.attempt_id is not null, 'risk', s.risk, 'flagged', coalesce(s.risk >= fl, false), 'decision', coalesce(s.decision, 'pending'),
      'began_at', lms_x_ts(s.began_at), 'last_at', lms_x_ts(s.last_at), 'device', s.device, 'gen', s.gen,
      'events', (select count(*) from lms_proctor_event e where e.attempt_id = t.attempt_id and e.weight > 0),
      'kinds', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from lms_proctor_event e where e.attempt_id = t.attempt_id and e.weight > 0 group by kind) z), '{}'),
      'snaps', (select count(*) from lms_proctor_snap n where n.attempt_id = t.attempt_id)) order by coalesce(s.risk, -1) desc, p.member_no, t.no), '[]') into L
  from lms_exam_attempt t join lms_person p on p.person_id = t.person_id left join lms_proctor_sess s on s.attempt_id = t.attempt_id where t.exam_id = x.exam_id;
  return jsonb_build_object('exam', jsonb_build_object('exam_id', x.exam_id, 'title', x.title), 'cfg', c, 'keep_days', lms_f_pkeep(),
    'summary', jsonb_build_object('n', jsonb_array_length(L), 'proctored', (select count(*) from jsonb_array_elements(L) z where (z->>'proctored')::boolean),
      'flagged', (select count(*) from jsonb_array_elements(L) z where (z->>'flagged')::boolean),
      'pending', (select count(*) from jsonb_array_elements(L) z where (z->>'flagged')::boolean and z->>'decision' = 'pending'),
      'void', (select count(*) from jsonb_array_elements(L) z where z->>'decision' = 'void')), 'attempts', L);
end $$;
create or replace function lms_f_proctor_timeline(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt; x lms_exam; s lms_proctor_sess; m text;
begin
  perform lms_x_staff(ctx);
  select * into t from lms_exam_attempt where attempt_id = lms_x_uuid(a->>'attempt', '응시');
  if t.attempt_id is null then perform lms_x_err(404, 'attempt', '없는 응시 기록입니다.'); end if;
  x := lms_f_exam(t.exam_id); perform lms_f_ppurge_due();
  select * into s from lms_proctor_sess where attempt_id = t.attempt_id; select member_no into m from lms_person where person_id = t.person_id;
  insert into lms_proctor_view (tenant_id, exam_id, attempt_id, viewer, role, what) values (lms_x_tid(), x.exam_id, t.attempt_id, coalesce(ctx->>'email', ''), ctx->>'role', 'timeline');
  return jsonb_build_object('attempt', jsonb_build_object('attempt_id', t.attempt_id, 'exam_id', t.exam_id, 'member_no', m, 'no', t.no, 'status', t.status,
      'started_at', lms_x_ts(t.started_at), 'submitted_at', lms_x_ts(t.submitted_at), 'score', lms_x_n(t.score), 'max_score', lms_x_n(t.max_score)),
    'session', case when s.attempt_id is null then null else jsonb_build_object('began_at', lms_x_ts(s.began_at), 'last_at', lms_x_ts(s.last_at), 'ended_at', lms_x_ts(s.ended_at),
      'device', s.device, 'checks', s.checks, 'consent_at', lms_x_ts(s.consent_at), 'gen', s.gen, 'risk', s.risk, 'decision', s.decision, 'decided_by', s.decided_by, 'decided_at', lms_x_ts(s.decided_at), 'note', s.note) end,
    'risk_flag', (lms_f_pcfg(x.exam_id)->>'risk_flag')::int,
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'at', lms_x_ts(e.at), 'client_at', lms_x_ts(e.client_at), 'kind', e.kind, 'weight', e.weight, 'detail', e.detail) order by e.id) from lms_proctor_event e where e.attempt_id = t.attempt_id), '[]'),
    'snaps', coalesce((select jsonb_agg(jsonb_build_object('snap_id', n.snap_id, 'at', lms_x_ts(n.at), 'kind', n.kind, 'faces', n.faces, 'face_method', n.face_method, 'bytes', n.bytes,
      'purged', n.purged_at is not null, 'purge_at', lms_x_ts(n.purge_at)) order by n.at, n.snap_id) from lms_proctor_snap n where n.attempt_id = t.attempt_id), '[]'));
end $$;
create or replace function lms_f_proctor_photo(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare n lms_proctor_snap; t lms_exam_attempt;
begin
  perform lms_x_staff(ctx);
  select * into n from lms_proctor_snap where snap_id = lms_x_uuid(a->>'id', '사진');
  if n.snap_id is null then perform lms_x_err(404, 'snap', '없는 사진입니다.'); end if;
  select * into t from lms_exam_attempt where attempt_id = n.attempt_id; perform lms_f_exam(t.exam_id); perform lms_f_ppurge_due();
  select * into n from lms_proctor_snap where snap_id = n.snap_id;
  insert into lms_proctor_view (tenant_id, exam_id, attempt_id, snap_id, viewer, role, what) values (lms_x_tid(), t.exam_id, t.attempt_id, n.snap_id, coalesce(ctx->>'email', ''), ctx->>'role', 'photo');
  if n.purged_at is not null or n.data is null then perform lms_x_err(410, 'purged', '보존 기간이 지나 파기된 사진입니다.'); end if;
  return jsonb_build_object('snap_id', n.snap_id, 'mime', 'image/jpeg', 'b64', replace(encode(n.data, 'base64'), E'\n', ''), 'at', lms_x_ts(n.at), 'purge_at', lms_x_ts(n.purge_at));
end $$;
create or replace function lms_f_proctor_decide(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt; d text := a->>'decision'; s lms_proctor_sess;
begin
  perform lms_x_staff(ctx);
  select * into t from lms_exam_attempt where attempt_id = lms_x_uuid(a->>'attempt_id', '응시');
  if t.attempt_id is null then perform lms_x_err(404, 'attempt', '없는 응시 기록입니다.'); end if;
  perform lms_f_exam(t.exam_id);
  if d is null or d not in ('pending', 'ok', 'warn', 'void') then perform lms_x_err(400, 'decision', '판정은 pending · ok · warn · void 중에서 고르세요.'); end if;
  if d in ('warn', 'void') and lms_x_str(a, 'note', 500, false, '판정 사유') is null then perform lms_x_err(400, 'need_reason', '주의 · 무효 판정에는 사유가 필요합니다.'); end if;
  update lms_proctor_sess set decision = d, note = lms_x_str(a, 'note', 500, false, '판정 사유'), decided_by = ctx->>'email', decided_at = now() where attempt_id = t.attempt_id returning * into s;
  if s.attempt_id is null then perform lms_x_err(409, 'not_proctored', '감독 기록이 없는 응시입니다.'); end if;
  return jsonb_build_object('attempt_id', t.attempt_id, 'decision', s.decision, 'note', s.note, 'decided_at', lms_x_ts(s.decided_at),
    'message', case when d = 'void' then '무효로 판정했습니다. 점수 처리(0점 · 재시험)는 성적 화면에서 정하세요.' else '판정을 저장했습니다.' end,
    '_audit', lms_x_audit('lms.f.proctor_decide', jsonb_build_object('attempt', t.attempt_id, 'decision', d)));
end $$;
create or replace function lms_f_proctor_views(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare x lms_exam;
begin
  perform lms_x_staff(ctx); x := lms_f_exam(lms_x_uuid(a->>'exam', '시험'));
  return jsonb_build_object('views', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'at', lms_x_ts(v.at), 'viewer', v.viewer, 'role', v.role, 'what', v.what, 'attempt_id', v.attempt_id,
      'member_no', (select p.member_no from lms_exam_attempt t join lms_person p on p.person_id = t.person_id where t.attempt_id = v.attempt_id), 'snap_id', v.snap_id) order by v.id desc)
    from (select * from lms_proctor_view where exam_id = x.exam_id order by id desc limit 200) v), '[]'));
end $$;
create or replace function lms_f_proctor_settings(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
begin
  perform lms_x_staff(ctx);
  return jsonb_build_object('keep_days', lms_f_pkeep(), 'note', '감독 사진은 촬영일로부터 보존 일수가 지나면 자동 파기됩니다(사진 데이터 삭제, 촬영 시각 · 얼굴 수 기록만 남음). 파기된 사진은 되돌릴 수 없습니다.');
end $$;
create or replace function lms_f_proctor_settings_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare k int;
begin
  perform lms_x_admin(ctx);
  k := lms_x_num(a, 'keep_days', 1, 365, null, '감독 사진 보존 일수')::int;
  if k is null then perform lms_x_err(400, 'required', '감독 사진 보존 일수을(를) 입력하세요.'); end if;
  insert into lms_efh_setting (tenant_id, proctor_keep_days) values (lms_x_tid(), k) on conflict (tenant_id) do update set proctor_keep_days = excluded.proctor_keep_days, updated_at = now();
  -- 이미 찍은 사진도 새 보존 기간으로 다시 계산(줄이면 바로 파기 대상)
  update lms_proctor_snap set purge_at = at + make_interval(days => k) where purged_at is null;
  return lms_f_proctor_settings(ctx, a) || jsonb_build_object('purged', lms_f_ppurge_due(), '_audit', lms_x_audit('lms.f.proctor_settings', jsonb_build_object('keep_days', k)));
end $$;
-- 정기 작업 연결 지점(매일 1회 권장): 보존 기간이 지난 사진 파기
create or replace function lms_f_proctor_purge(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare n int;
begin
  perform lms_x_admin(ctx); n := lms_f_ppurge_due();
  return jsonb_build_object('purged', n, '_audit', lms_x_audit('lms.f.proctor_purge', jsonb_build_object('n', n)));
end $$;

-- ═════════ 본인 확인(SFR-016): 학습자 ═════════
create or replace function lms_g_me(ctx jsonb) returns text language plpgsql as $$
begin
  if coalesce(ctx->>'kind', '') <> 'learner' then perform lms_x_err(403, 'role', '학습자 로그인이 필요합니다.'); end if;
  if not exists (select 1 from lms_person where member_no = ctx->>'sid' and kind = 'student') then perform lms_x_err(403, 'person', '학사 구성원으로 등록되지 않은 학습자입니다.'); end if;
  return ctx->>'sid';
end $$;
-- 확인 대상 검사: 출석(차시 · 수강) · 시험(시험 · 수강)
create or replace function lms_g_idv_ref(mno text, pur text, ref text) returns uuid language plpgsql as $$
declare id uuid; sec uuid; pid uuid;
begin
  if pur not in ('checkin', 'exam') then perform lms_x_err(400, 'purpose', '확인 목적은 checkin · exam 중 하나입니다.'); end if;
  id := lms_x_uuid(ref, case pur when 'checkin' then '차시' else '시험' end);
  if pur = 'checkin' then select section_id into sec from lms_session where session_id = id; else select section_id into sec from lms_exam where exam_id = id; end if;
  if sec is null then perform lms_x_err(404, 'not_found', '대상을 찾을 수 없습니다.'); end if;
  select person_id into pid from lms_person where member_no = mno and kind = 'student';
  if lms_x_enr(sec, pid) is null then perform lms_x_err(403, 'not_enrolled', '이 분반 수강생이 아닙니다.'); end if;
  return sec;
end $$;
create or replace function lms_g_ticket(mno text, pur text, ref text, m text) returns jsonb language plpgsql as $$
declare id uuid;
begin
  insert into lms_idv_ticket (tenant_id, member_no, purpose, ref, method) values (lms_x_tid(), mno, pur, ref, m) returning ticket_id into id;
  return jsonb_build_object('ok', true, 'ticket', id, 'purpose', pur, 'ref', ref, 'method', m, 'expires_at', lms_x_ts(now() + interval '10 minutes'));
end $$;
create or replace function lms_g_idv(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); t lms_totp;
begin
  select * into t from lms_totp where member_no = mno;
  return jsonb_build_object('member_no', mno,
    'passkeys', coalesce((select jsonb_agg(jsonb_build_object('cred_id', c.cred_id, 'label', c.label, 'alg', c.alg, 'created_at', lms_x_ts(c.created_at), 'last_used_at', lms_x_ts(c.last_used_at)) order by c.created_at, c.cred_id) from lms_wa_cred c where c.member_no = mno), '[]'),
    'totp', jsonb_build_object('enrolled', t.member_no is not null, 'confirmed', t.confirmed_at is not null),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('section_id', s.section_id, 'title', s.title, 'method', r.method) order by s.title)
      from lms_idv_rule r join lms_section s on s.section_id = r.section_id join lms_enrollment e on e.section_id = s.section_id and e.status = 'enrolled'
      join lms_person p on p.person_id = e.person_id and p.member_no = mno where r.method <> 'none'), '[]'),
    'email_adapter', '이메일 인증번호는 학교 메일 게이트웨이 연동 후 발송됩니다.');
end $$;
-- 패스키 등록 · 확인 요청(challenge). rp_id · origin은 서버(Node · Java)가 요청 주소로 정해 덧붙인다.
create or replace function lms_g_wa_options(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); p text := coalesce(nullif(a->>'purpose', ''), 'register'); rf text; ch text; id uuid; L jsonb;
begin
  if p not in ('register', 'checkin', 'exam') then perform lms_x_err(400, 'purpose', '확인 목적은 register · checkin · exam 중 하나입니다.'); end if;
  if p <> 'register' then perform lms_g_idv_ref(mno, p, a->>'ref'); rf := lower(a->>'ref'); end if;
  select coalesce(jsonb_agg(cred_id order by created_at, cred_id), '[]') into L from lms_wa_cred where member_no = mno;
  if p = 'register' and jsonb_array_length(L) >= 5 then perform lms_x_err(409, 'cred_max', '패스키는 5개까지 등록할 수 있습니다. 쓰지 않는 패스키를 지우세요.'); end if;
  if p <> 'register' and jsonb_array_length(L) = 0 then perform lms_x_err(409, 'no_cred', '등록된 패스키가 없습니다. 먼저 「패스키 등록」을 하세요.'); end if;
  if (select count(*) from lms_idv_challenge where member_no = mno and created_at > now() - interval '1 minute') >= 10 then perform lms_x_err(429, 'rate', '요청이 너무 많습니다. 잠시 뒤 다시 시도하세요.'); end if;
  delete from lms_idv_challenge where member_no = mno and created_at < now() - interval '1 hour';
  ch := lms_x_b64u(lms_x_rand());
  insert into lms_idv_challenge (tenant_id, member_no, purpose, ref, challenge) values (lms_x_tid(), mno, p, rf, ch) returning ch_id into id;
  return jsonb_build_object('ch_id', id, 'challenge', ch, 'purpose', p, 'ref', rf, 'timeout_ms', 120000, 'rp_name', '디디쌤',
    'user', jsonb_build_object('id', lms_x_b64u(sha256(convert_to(lms_x_tid() || '|' || mno, 'UTF8'))), 'name', mno, 'display_name', '학번 ' || mno),
    'algs', '[-7, -257, -8]'::jsonb, 'user_verification', 'required', case when p = 'register' then 'exclude' else 'allow' end, L);
end $$;
create or replace function lms_g_wa_ch(mno text, id uuid, pur text[], ch text) returns lms_idv_challenge language plpgsql as $$
declare r lms_idv_challenge;
begin
  select * into r from lms_idv_challenge where ch_id = id and member_no = mno;
  if r.ch_id is null or not (r.purpose = any(pur)) then perform lms_x_err(400, 'wa_challenge', '확인 요청을 찾을 수 없습니다. 처음부터 다시 시도하세요.'); end if;
  if r.used_at is not null then perform lms_x_err(409, 'wa_used', '이미 사용한 확인 요청입니다. 처음부터 다시 시도하세요.'); end if;
  if r.created_at < now() - interval '5 minutes' then perform lms_x_err(410, 'wa_expired', '확인 요청 시간이 지났습니다. 처음부터 다시 시도하세요.'); end if;
  if ch is distinct from r.challenge then perform lms_x_err(400, 'wa_challenge', '확인 요청 값이 맞지 않습니다.'); end if;
  return r;
end $$;
-- (서버 내부) 등록 저장 — 서버가 clientDataJSON · authenticatorData · 공개키를 검사한 뒤 부른다
create or replace function lms_g_wa_reg_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); r lms_idv_challenge := lms_g_wa_ch(mno, lms_x_uuid(a->>'ch_id', '확인 요청'), array['register'], a->>'challenge'); c lms_wa_cred;
begin
  if coalesce(a->>'cred_id', '') !~ '^[A-Za-z0-9_-]+$' or length(a->>'cred_id') not between 16 and 1400 then perform lms_x_err(400, 'wa_bad', '패스키 ID 형식이 올바르지 않습니다.'); end if;
  if coalesce(a->>'public_key', '') !~ '^[A-Za-z0-9_-]+$' or length(a->>'public_key') not between 40 and 2000 then perform lms_x_err(400, 'wa_bad', '공개키 형식이 올바르지 않습니다.'); end if;
  if coalesce(a->>'alg', '') not in ('-7', '-257', '-8') then perform lms_x_err(400, 'wa_alg', '지원하지 않는 서명 방식입니다.'); end if;
  if exists (select 1 from lms_wa_cred where cred_id = a->>'cred_id') then perform lms_x_err(409, 'cred_dup', '이미 등록된 패스키입니다.'); end if;
  update lms_idv_challenge set used_at = now() where ch_id = r.ch_id;
  insert into lms_wa_cred (tenant_id, cred_id, member_no, public_key, alg, sign_count, uv, label)
  values (lms_x_tid(), a->>'cred_id', mno, a->>'public_key', (a->>'alg')::int, coalesce(lms_x_num(a, 'sign_count', 0, 4294967295, 0, '서명 횟수'), 0)::bigint, lms_x_bool(a, 'uv', false),
    coalesce(lms_x_str(a, 'label', 40, false, '이름'), '내 기기')) returning * into c;
  return jsonb_build_object('cred', jsonb_build_object('cred_id', c.cred_id, 'label', c.label, 'alg', c.alg, 'uv', c.uv, 'created_at', lms_x_ts(c.created_at)),
    '_audit', lms_x_audit('lms.g.wa_register', jsonb_build_object('member_no', mno, 'alg', c.alg)));
end $$;
-- (서버 내부) 확인용 공개키 조회
create or replace function lms_g_wa_get(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); r lms_idv_challenge := lms_g_wa_ch(mno, lms_x_uuid(a->>'ch_id', '확인 요청'), array['checkin', 'exam'], a->>'challenge'); c lms_wa_cred;
begin
  select * into c from lms_wa_cred where cred_id = a->>'cred_id' and member_no = mno;
  if c.cred_id is null then perform lms_x_err(400, 'wa_cred', '이 계정에 등록된 패스키가 아닙니다.'); end if;
  return jsonb_build_object('public_key', c.public_key, 'alg', c.alg, 'sign_count', c.sign_count, 'purpose', r.purpose, 'ref', r.ref);
end $$;
-- (서버 내부) 서명 확인 뒤: 서명 횟수 갱신 · 표 발급
create or replace function lms_g_wa_done(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); r lms_idv_challenge; c lms_wa_cred; n bigint := coalesce(lms_x_num(a, 'sign_count', 0, 4294967295, 0, '서명 횟수'), 0)::bigint;
begin
  update lms_idv_challenge set used_at = now() where ch_id = lms_x_uuid(a->>'ch_id', '확인 요청') and member_no = mno and used_at is null returning * into r;
  if r.ch_id is null then perform lms_x_err(409, 'wa_used', '이미 사용한 확인 요청입니다. 처음부터 다시 시도하세요.'); end if;
  select * into c from lms_wa_cred where cred_id = a->>'cred_id' and member_no = mno;
  if (n > 0 or c.sign_count > 0) and n <= c.sign_count then perform lms_x_err(403, 'wa_counter', '패스키 서명 횟수가 맞지 않습니다(복제 의심). 패스키를 다시 등록하세요.'); end if;
  update lms_wa_cred set sign_count = n, last_used_at = now(), uv = uv or lms_x_bool(a, 'uv', false) where cred_id = c.cred_id;
  return lms_g_ticket(mno, r.purpose, r.ref, 'webauthn') || jsonb_build_object('_audit', lms_x_audit('lms.g.wa_verify', jsonb_build_object('member_no', mno, 'purpose', r.purpose, 'ref', r.ref)));
end $$;
create or replace function lms_g_wa_delete(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); n int;
begin
  delete from lms_wa_cred where cred_id = a->>'cred_id' and member_no = mno; get diagnostics n = row_count;
  if n = 0 then perform lms_x_err(404, 'not_found', '대상을 찾을 수 없습니다.'); end if;
  return jsonb_build_object('deleted', n, '_audit', lms_x_audit('lms.g.wa_delete', jsonb_build_object('member_no', mno)));
end $$;
-- 인증 앱(TOTP) 등록: 비밀키 · otpauth 주소(QR) — 확인 번호를 한 번 넣어야 등록이 끝난다
create or replace function lms_g_totp_new(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); t lms_totp; sec text := lms_x_b32(substring(lms_x_rand() from 1 for 20));
begin
  select * into t from lms_totp where member_no = mno;
  if t.confirmed_at is not null and not lms_x_bool(a, 'reset', false) then perform lms_x_err(409, 'totp_exists', '이미 인증 앱을 등록했습니다. 바꾸려면 다시 등록(reset)을 고르세요.'); end if;
  insert into lms_totp (tenant_id, member_no, secret) values (lms_x_tid(), mno, sec)
  on conflict (tenant_id, member_no) do update set secret = excluded.secret, confirmed_at = null, last_step = null, fail_n = 0, fail_at = null, created_at = now();
  return jsonb_build_object('secret', sec, 'digits', 6, 'period', 30,
    'otpauth', 'otpauth://totp/' || replace('디디쌤:' || mno, ' ', '%20') || '?secret=' || sec || '&issuer=' || '디디쌤' || '&digits=6&period=30',
    '_audit', lms_x_audit('lms.g.totp_new', jsonb_build_object('member_no', mno)));
end $$;
create or replace function lms_g_totp_verify(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); t lms_totp; p text := coalesce(nullif(a->>'purpose', ''), 'enroll'); cd text := btrim(coalesce(a->>'code', '')); st bigint := floor(extract(epoch from now()) / 30)::bigint; d int; hit bigint; k bytea; rf text;
begin
  if p not in ('enroll', 'checkin', 'exam') then perform lms_x_err(400, 'purpose', '확인 목적은 enroll · checkin · exam 중 하나입니다.'); end if;
  if cd !~ '^\d{6}$' then perform lms_x_err(400, 'bad_otp', '인증 앱의 6자리 숫자를 입력하세요.'); end if;
  if p <> 'enroll' then perform lms_g_idv_ref(mno, p, a->>'ref'); rf := lower(a->>'ref'); end if;
  select * into t from lms_totp where member_no = mno for update;
  if t.member_no is null or (p <> 'enroll' and t.confirmed_at is null) then perform lms_x_err(409, 'no_totp', '인증 앱이 등록되지 않았습니다. 먼저 「인증 앱 등록」을 하세요.'); end if;
  if t.fail_n >= 5 and t.fail_at > now() - interval '5 minutes' then perform lms_x_err(429, 'otp_locked', '5번 틀려 5분 동안 잠겼습니다. 잠시 뒤 다시 시도하세요.'); end if;
  k := lms_x_b32d(t.secret);
  for d in -1 .. 1 loop
    if (st + d) > coalesce(t.last_step, -1) and lms_x_totp(k, st + d) = cd then hit := st + d; exit; end if;
  end loop;
  if hit is null then
    update lms_totp set fail_n = case when fail_at > now() - interval '5 minutes' then fail_n + 1 else 1 end, fail_at = now() where member_no = mno;
    return jsonb_build_object('ok', false, 'error', 'bad_otp', 'message', '번호가 맞지 않거나 이미 쓴 번호입니다. 인증 앱의 새 번호를 넣으세요.');
  end if;
  update lms_totp set last_step = hit, fail_n = 0, fail_at = null, confirmed_at = coalesce(confirmed_at, now()) where member_no = mno;
  if p = 'enroll' then return jsonb_build_object('ok', true, 'confirmed', true, '_audit', lms_x_audit('lms.g.totp_confirm', jsonb_build_object('member_no', mno))); end if;
  return lms_g_ticket(mno, p, rf, 'totp') || jsonb_build_object('_audit', lms_x_audit('lms.g.totp_verify', jsonb_build_object('member_no', mno, 'purpose', p, 'ref', rf)));
end $$;
-- 이메일 인증번호(어댑터): 대기열에 넣고, 학교 메일 게이트웨이가 가져가 보낸다
create or replace function lms_g_email_code(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); p text := a->>'purpose'; rf text; b bytea := lms_x_rand(); cd text;
begin
  perform lms_g_idv_ref(mno, p, a->>'ref'); rf := lower(a->>'ref');
  if exists (select 1 from lms_idv_mail where member_no = mno and created_at > now() - interval '60 seconds') then perform lms_x_err(429, 'rate', '인증번호는 1분에 한 번 요청할 수 있습니다.'); end if;
  cd := lpad((((get_byte(b, 0)::bigint << 24) | (get_byte(b, 1) << 16) | (get_byte(b, 2) << 8) | get_byte(b, 3)) % 1000000)::text, 6, '0');
  insert into lms_idv_mail (tenant_id, member_no, purpose, ref, code, code_hash, expires_at) values (lms_x_tid(), mno, p, rf, cd, lms_x_hash(lms_x_tid() || '|' || mno || '|' || cd), now() + interval '10 minutes');
  return jsonb_build_object('queued', true, 'expires_at', lms_x_ts(now() + interval '10 minutes'), 'note', '학교 메일 게이트웨이 연동 후 학교 메일로 발송됩니다(연동 전에는 대기열에만 등록).',
    '_audit', lms_x_audit('lms.g.email_code', jsonb_build_object('member_no', mno, 'purpose', p)));
end $$;
create or replace function lms_g_email_verify(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_g_me(ctx); p text := a->>'purpose'; rf text; m lms_idv_mail;
begin
  perform lms_g_idv_ref(mno, p, a->>'ref'); rf := lower(a->>'ref');
  select * into m from lms_idv_mail where member_no = mno and purpose = p and ref = rf and used_at is null and expires_at > now() order by created_at desc limit 1 for update;
  if m.id is null then perform lms_x_err(409, 'no_code', '유효한 인증번호가 없습니다. 인증번호를 다시 요청하세요.'); end if;
  if m.tries >= 5 then perform lms_x_err(429, 'otp_locked', '5번 틀렸습니다. 인증번호를 다시 요청하세요.'); end if;
  if m.code_hash <> lms_x_hash(lms_x_tid() || '|' || mno || '|' || btrim(coalesce(a->>'code', ''))) then
    update lms_idv_mail set tries = tries + 1 where id = m.id;
    return jsonb_build_object('ok', false, 'error', 'bad_code', 'message', '인증번호가 맞지 않습니다.');
  end if;
  update lms_idv_mail set used_at = now(), code = null where id = m.id;
  return lms_g_ticket(mno, p, rf, 'email') || jsonb_build_object('_audit', lms_x_audit('lms.g.email_verify', jsonb_build_object('member_no', mno, 'purpose', p)));
end $$;

-- ═════════ 본인 확인: 교수자 · 운영자 ═════════
create or replace function lms_g_idv_rule(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_x_uuid(a->>'section_id', '분반');
begin
  perform lms_x_staff(ctx); perform lms_x_section(sec);
  return jsonb_build_object('section_id', sec, 'method', coalesce((select method from lms_idv_rule where section_id = sec), 'none'),
    'methods', '[["none","확인 안 함"],["webauthn","패스키(지문 · 얼굴 인식)"],["totp","인증 앱 6자리"],["any","패스키 또는 인증 앱"],["email","이메일 인증번호(메일 게이트웨이 연동 후)"]]'::jsonb,
    'note', '학생이 출석 직전 본인 기기로 확인합니다. 생체 정보는 학생 기기 밖으로 나오지 않고, 서버에는 공개키만 저장합니다. 문자(SMS) 인증은 학교 문자 게이트웨이 연동 후 동작합니다.');
end $$;
create or replace function lms_g_idv_rule_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_x_uuid(a->>'section_id', '분반'); m text := coalesce(a->>'method', '');
begin
  perform lms_x_staff(ctx); perform lms_x_section(sec);
  if m not in ('none', 'webauthn', 'totp', 'any', 'email') then perform lms_x_err(400, 'method', '본인 확인 방식은 none · webauthn · totp · any · email 중에서 고르세요.'); end if;
  insert into lms_idv_rule (tenant_id, section_id, method) values (lms_x_tid(), sec, m) on conflict (tenant_id, section_id) do update set method = excluded.method, updated_at = now();
  return lms_g_idv_rule(ctx, a) || jsonb_build_object('_audit', lms_x_audit('lms.g.idv_rule', jsonb_build_object('section_id', sec, 'method', m)));
end $$;
create or replace function lms_g_idv_report(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_x_uuid(a->>'section_id', '분반'); L jsonb;
begin
  perform lms_x_staff(ctx); perform lms_x_section(sec);
  select coalesce(jsonb_agg(jsonb_build_object('member_no', p.member_no,
      'passkeys', (select count(*) from lms_wa_cred c where c.member_no = p.member_no),
      'totp', exists (select 1 from lms_totp t where t.member_no = p.member_no and t.confirmed_at is not null),
      'checkins', (select count(*) from lms_attendance at join lms_session ss on ss.session_id = at.session_id where ss.section_id = sec and at.person_id = p.person_id and at.evidence ? 'idv' and at.evidence->>'idv' in ('webauthn', 'totp', 'email')),
      'last_method', (select at.evidence->>'idv' from lms_attendance at join lms_session ss on ss.session_id = at.session_id where ss.section_id = sec and at.person_id = p.person_id and at.evidence->>'idv' in ('webauthn', 'totp', 'email') order by at.evidence->>'at' desc limit 1)) order by p.member_no), '[]') into L
  from lms_enrollment e join lms_person p on p.person_id = e.person_id where e.section_id = sec and e.status = 'enrolled' and e.kind = 'regular';
  return jsonb_build_object('section_id', sec, 'method', coalesce((select method from lms_idv_rule where section_id = sec), 'none'), 'students', L,
    'summary', jsonb_build_object('n', jsonb_array_length(L), 'passkey', (select count(*) from jsonb_array_elements(L) z where (z->>'passkeys')::int > 0),
      'totp', (select count(*) from jsonb_array_elements(L) z where (z->>'totp')::boolean),
      'none', (select count(*) from jsonb_array_elements(L) z where (z->>'passkeys')::int = 0 and not (z->>'totp')::boolean)));
end $$;
-- 메일 게이트웨이 어댑터: 보낼 인증번호를 가져가면 대기열에서 번호를 지운다(운영자 · 연동 계정)
create or replace function lms_g_mail_pull(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare L jsonb;
begin
  perform lms_x_admin(ctx);
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'member_no', member_no, 'purpose', purpose, 'code', code, 'expires_at', lms_x_ts(expires_at)) order by created_at, id), '[]') into L
  from (select * from lms_idv_mail where status = 'queued' and expires_at > now() order by created_at, id limit 100 for update) q;
  update lms_idv_mail set status = 'sent', code = null where id in (select (z->>'id')::uuid from jsonb_array_elements(L) z);
  return jsonb_build_object('mails', L, 'template', '[디디쌤] 본인 확인 인증번호는 {code}입니다(10분 안에 입력).', '_audit', lms_x_audit('lms.g.mail_pull', jsonb_build_object('n', jsonb_array_length(L))));
end $$;

-- ═════════ 출석 본인 확인 강제(트리거): 분반 규칙이 있으면 학생 출석(인증번호 · QR · NFC · BLE · 사진)마다 확인 표 1장 소비 ═════════
create or replace function lms_g_idv_trg() returns trigger language plpgsql as $$
declare m text; mno text; tk lms_idv_ticket;
begin
  if NEW.method not in ('code', 'qr', 'nfc', 'ble', 'photo') then return NEW; end if;
  select r.method into m from lms_idv_rule r join lms_session s on s.section_id = r.section_id where s.session_id = NEW.session_id;
  if m is null or m = 'none' then return NEW; end if;
  select member_no into mno from lms_person where person_id = NEW.person_id;
  select * into tk from lms_idv_ticket where member_no = mno and purpose = 'checkin' and ref = NEW.session_id::text and used_at is null and created_at > now() - interval '10 minutes'
    and (m = 'any' or method = m) order by created_at desc limit 1;
  if tk.ticket_id is null then
    perform lms_x_err(428, 'idv_needed', case m when 'webauthn' then '출석 전 패스키(지문 · 얼굴 인식)로 본인 확인을 하세요.' when 'totp' then '출석 전 인증 앱의 6자리 번호로 본인 확인을 하세요.'
      when 'email' then '출석 전 이메일 인증번호로 본인 확인을 하세요.' else '출석 전 본인 확인(패스키 또는 인증 앱)을 하세요.' end);
  end if;
  update lms_idv_ticket set used_at = now() where ticket_id = tk.ticket_id;
  NEW.evidence := coalesce(NEW.evidence, '{}'::jsonb) || jsonb_build_object('idv', tk.method);
  return NEW;
end $$;
drop trigger if exists lms_g_idv on lms_attendance;
create trigger lms_g_idv before insert on lms_attendance for each row execute function lms_g_idv_trg();
