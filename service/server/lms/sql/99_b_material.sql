-- v30 묶음 B 후속 — SFR-038 (교수자) 강의자료 관리
--  ① 브라우저 미리보기: PDF · 이미지 · 텍스트는 바로 보기, HWP · DOC · PPT · XLS는 HTML 변환 엔진 연동 지점(변환 요청 대기열 + 엔진 결과 받기)
--  ② 교수자 개인 자료함: 내가 올린 파일을 담아 두고 다른 강의실에 재사용(파일 복사 + 파일 자원 생성)
--  ③ 자료별 내려받기 허용 · 내려받은 사람 기록(누가 · 언제 · 보기/내려받기)
--  ④ 외부 영상(YouTube · Vimeo)은 기존 video 자원(body.url)으로 두고, 화면이 주소로 공급자를 판별한다(진도는 progress-mark 학습 시간)
-- 20_b.sql은 이미 배포된 통합 DB에 들어 있어 고치지 않는다 → 별도 함수 lms_bm_api(Node mod-b · Java lms.b가 경로 표의 함수 이름으로 부른다)

create table if not exists lms_bm_lib (
  tenant_id text not null, lib_id uuid not null default gen_random_uuid(), owner text not null,
  file_id uuid not null, name text not null, mime text not null, size int not null, tags text[] not null default '{}',
  added_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, lib_id), unique (tenant_id, owner, file_id)
);
create table if not exists lms_bm_download (
  tenant_id text not null, id bigserial, res_id uuid not null, file_id uuid not null, who text not null, person_id uuid,
  mode text not null check (mode in ('view','download')), at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, id),
  foreign key (tenant_id, res_id) references lms_b_resource (tenant_id, res_id) on delete cascade
);
create index if not exists lms_bm_dl_res on lms_bm_download (tenant_id, res_id, file_id);
create table if not exists lms_bm_convert (
  tenant_id text not null, file_id uuid not null, fmt text not null, status text not null default 'queued' check (status in ('queued','done','failed')),
  html text, error text, requested_by text, requested_at timestamptz not null default clock_timestamp(), done_at timestamptz,
  primary key (tenant_id, file_id),
  foreign key (tenant_id, file_id) references lms_file (tenant_id, file_id) on delete cascade   -- 파일 저장소 통합(90_p): lms_b_file은 lms_file 위의 뷰
);
do $$ declare t text; begin
  foreach t in array array['lms_bm_lib','lms_bm_download','lms_bm_convert'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_bm_download_id_seq to didisam_tenant;
end $$;

-- 미리보기 방식: pdf · image · text · convert(문서 변환 필요) · none
create or replace function lmsbm_kind(name text, mime text) returns text language sql immutable as $$
  select case when mime = 'application/pdf' or name ~* '\.pdf$' then 'pdf'
    when mime like 'image/%' or name ~* '\.(png|jpe?g|gif|webp|svg)$' then 'image'
    when mime like 'text/%' or name ~* '\.(txt|csv|md|json|log)$' then 'text'
    when name ~* '\.(hwp|hwpx|doc|docx|ppt|pptx|xls|xlsx|odt|odp|ods)$' then 'convert' else 'none' end $$;
-- 자원에 달린 파일(file · folder)
create or replace function lmsbm_files(r lms_b_resource) returns setof uuid language sql immutable as $$
  select lmsb_uuid(r.body->>'file_id') where r.kind = 'file' and lmsb_uuid(r.body->>'file_id') is not null
  union all select lmsb_uuid(f->>'file_id') from jsonb_array_elements(case when r.kind = 'folder' and jsonb_typeof(r.body->'files') = 'array' then r.body->'files' else '[]' end) f where lmsb_uuid(f->>'file_id') is not null $$;

create or replace function lms_bm_api(op text, p jsonb, x jsonb) returns jsonb language plpgsql set timezone = 'UTC' as $$
declare tid text := lmsb_tid(); a jsonb; r lms_b_resource; f record; id uuid; sec uuid; v text; n int; ok boolean;
begin
  if tid is null then perform lmsb_err(401, 'auth', '로그인이 필요합니다.'); end if;
  -- 개인 자료함(강의실과 무관)
  if op in ('mylib','mylib-add','mylib-del') then
    a := lmsb_actor(null, p, x);
    if a->>'role' not in ('admin','professor','staff') and not (a->>'role' = 'ta') then perform lmsb_err(403, 'role', '개인 자료함은 교수자 · 조교 · 교직원이 씁니다.'); end if;
    if op = 'mylib' then
      return jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('id', l.lib_id, 'file_id', l.file_id, 'name', l.name, 'mime', l.mime, 'size', l.size, 'tags', to_jsonb(l.tags), 'added_at', l.added_at,
          'preview', lmsbm_kind(l.name, l.mime), 'alive', exists (select 1 from lms_b_file bf where bf.tenant_id = tid and bf.file_id = l.file_id),
          'used', (select count(*) from lms_b_resource z where z.tenant_id = tid and z.deleted_at is null and z.body->>'lib' = l.lib_id::text)) order by l.added_at desc)
        from lms_bm_lib l where l.tenant_id = tid and l.owner = lmsb_who(a)), '[]'));
    elsif op = 'mylib-add' then
      id := lmsb_id(p, 'file_id', '파일'); select bf.* into f from lms_b_file bf where bf.tenant_id = tid and bf.file_id = id;
      if not found then perform lmsb_err(404, 'file', '파일을 찾을 수 없습니다.'); end if;
      perform lmsb_need(lmsb_actor(f.section_id, p, x), 'resource.edit');
      if (select count(*) from jsonb_array_elements_text(case when jsonb_typeof(p->'tags') = 'array' then p->'tags' else '[]' end)) > 10 then perform lmsb_err(400, 'input', '태그는 10개까지입니다.'); end if;
      insert into lms_bm_lib (tenant_id, owner, file_id, name, mime, size, tags) values (tid, lmsb_who(a), id, f.name, f.mime, f.size,
        (select coalesce(array_agg(left(btrim(t), 30)), '{}') from jsonb_array_elements_text(case when jsonb_typeof(p->'tags') = 'array' then p->'tags' else '[]' end) t where btrim(t) <> ''))
        on conflict (tenant_id, owner, file_id) do update set tags = excluded.tags returning lib_id into id;
      return jsonb_build_object('ok', true, 'id', id);
    else
      delete from lms_bm_lib where tenant_id = tid and lib_id = lmsb_id(p, 'id', '자료') and owner = lmsb_who(a);
      if not found then perform lmsb_err(404, 'lib', '내 자료함에 없는 자료입니다.'); end if;
      return jsonb_build_object('ok', true);
    end if;
  elsif op = 'mylib-use' then
    -- 다른 강의실에 재사용: 파일을 대상 강의실로 복사하고 파일 자원을 만든다
    sec := lmsb_sec(p); a := lmsb_actor(sec, p, x); perform lmsb_need(a, 'resource.edit');
    select l.* into f from lms_bm_lib l where l.tenant_id = tid and l.lib_id = lmsb_id(p, 'id', '자료') and l.owner = lmsb_who(lmsb_actor(null, p, x));
    if not found then perform lmsb_err(404, 'lib', '내 자료함에 없는 자료입니다.'); end if;
    id := lmsb_uuid(p->>'session_id');
    if id is not null and not exists (select 1 from lms_session s where s.tenant_id = tid and s.section_id = sec and s.session_id = id) then perform lmsb_err(400, 'input', '차시가 이 강의실에 없습니다.'); end if;
    insert into lms_b_file (tenant_id, section_id, name, mime, size, data) select tid, sec, bf.name, bf.mime, bf.size, bf.data from lms_b_file bf where bf.tenant_id = tid and bf.file_id = f.file_id returning file_id into v;
    if v is null then perform lmsb_err(410, 'gone', '원본 파일이 지워져 재사용할 수 없습니다.'); end if;
    insert into lms_b_resource (tenant_id, section_id, session_id, kind, title, body, owner_label) values (tid, sec, id, 'file', coalesce(nullif(lmsb_t(p, 'title', 200), ''), f.name),
      jsonb_build_object('file_id', v, 'name', f.name, 'size', f.size, 'mime', f.mime, 'lib', f.lib_id, 'download', lmsb_bool(p, 'download', true)), a->>'label') returning res_id into id;
    insert into lms_b_res_ver (tenant_id, res_id, ver, snap, by_label) select tid, z.res_id, 1, lmsb_res_json(z), a->>'label' from lms_b_resource z where z.tenant_id = tid and z.res_id = id;
    return jsonb_build_object('ok', true, 'id', id, 'file_id', v);
  elsif op = 'convert-done' then
    -- 연동 지점: HTML 변환 엔진이 결과를 돌려준다(운영자 세션 또는 엔진 서비스 계정). HTML은 화면에서 정화한 뒤 보여 준다
    a := lmsb_actor(null, p, x); if a->>'role' <> 'admin' then perform lmsb_err(403, 'role', '변환 결과는 운영자(엔진 서비스 계정)만 넣을 수 있습니다.'); end if;
    v := lmsb_t(p, 'status', 10, true, '상태'); if v not in ('done','failed') then perform lmsb_err(400, 'input', '상태는 done · failed입니다.'); end if;
    if length(coalesce(p->>'html', '')) > 2000000 then perform lmsb_err(413, 'too_large', '변환 결과가 너무 큽니다.'); end if;
    update lms_bm_convert set status = v, html = case when v = 'done' then p->>'html' end, error = case when v = 'failed' then lmsb_t(p, 'error', 500) end, done_at = now()
      where tenant_id = tid and file_id = lmsb_id(p, 'file_id', '파일');
    if not found then perform lmsb_err(404, 'convert', '변환 요청이 없습니다.'); end if;
    return jsonb_build_object('ok', true, 'status', v);
  end if;

  -- 자원 단위
  id := lmsb_id(p, 'resource', '학습 자원');
  select z.* into r from lms_b_resource z where z.tenant_id = tid and z.res_id = id and z.deleted_at is null;
  if not found then perform lmsb_err(404, 'resource', '학습 자원을 찾을 수 없습니다.'); end if;
  a := lmsb_actor(r.section_id, p, x); perform lmsb_need(a, 'course.view');
  if a->>'role' = 'student' and not coalesce((select c.open from lmsb_access(r.section_id, (a->>'pid')::uuid) c where c.res_id = r.res_id), false) then perform lmsb_err(403, 'locked', '아직 열리지 않은 자원입니다.'); end if;
  ok := coalesce((r.body->>'download')::boolean, true) or lmsb_mgr(a);   -- 내려받기 허용(관리자는 항상)
  if op = 'material' then
    return jsonb_build_object('id', r.res_id, 'title', r.title, 'kind', r.kind, 'download', coalesce((r.body->>'download')::boolean, true), 'can_download', ok,
      'files', coalesce((select jsonb_agg(jsonb_build_object('file_id', bf.file_id, 'name', bf.name, 'mime', bf.mime, 'size', bf.size, 'preview', lmsbm_kind(bf.name, bf.mime),
          'convert', (select jsonb_build_object('status', c.status, 'error', c.error, 'done_at', c.done_at) from lms_bm_convert c where c.tenant_id = tid and c.file_id = bf.file_id),
          'mine', (select count(*) from lms_bm_download d where d.tenant_id = tid and d.res_id = r.res_id and d.file_id = bf.file_id and d.who = lmsb_who(a) and d.mode = 'download')) order by bf.name)
        from lms_b_file bf where bf.tenant_id = tid and bf.file_id in (select lmsbm_files(r))), '[]'));
  end if;
  id := lmsb_uuid(p->>'file_id');
  if op in ('material-file','convert-request','converted') and (id is null or not exists (select 1 from lmsbm_files(r) q where q = id)) then perform lmsb_err(404, 'file', '이 자원의 파일이 아닙니다.'); end if;
  if op = 'material-file' then
    v := coalesce(nullif(lmsb_t(p, 'mode', 10), ''), 'view'); if v not in ('view','download') then perform lmsb_err(400, 'input', '방식은 view · download입니다.'); end if;
    if v = 'download' and not ok then perform lmsb_err(403, 'no_download', '이 자료는 내려받기가 허용되지 않았습니다. 화면에서 보기만 할 수 있습니다.'); end if;
    select bf.* into f from lms_b_file bf where bf.tenant_id = tid and bf.file_id = id;
    if v = 'view' and lmsbm_kind(f.name, f.mime) not in ('pdf','image','text') then perform lmsb_err(415, 'no_preview', '이 형식은 바로 보기를 지원하지 않습니다(문서 변환 연동 후 동작).'); end if;
    insert into lms_bm_download (tenant_id, res_id, file_id, who, person_id, mode) values (tid, r.res_id, id, lmsb_who(a), (a->>'pid')::uuid, v);
    return jsonb_build_object('name', f.name, 'mime', f.mime, 'size', f.size, 'mode', v, 'b64', translate(encode(f.data, 'base64'), E'\n', ''));
  elsif op = 'convert-request' then
    select bf.name, bf.mime into f from lms_b_file bf where bf.tenant_id = tid and bf.file_id = id;
    if lmsbm_kind(f.name, f.mime) <> 'convert' then perform lmsb_err(400, 'input', '변환이 필요한 문서(HWP · DOC · PPT · XLS)만 요청합니다.'); end if;
    insert into lms_bm_convert (tenant_id, file_id, fmt, requested_by) values (tid, id, lower(substring(f.name from '\.([A-Za-z0-9]+)$')), a->>'label')
      on conflict (tenant_id, file_id) do update set status = case when lms_bm_convert.status = 'failed' then 'queued' else lms_bm_convert.status end, requested_at = case when lms_bm_convert.status = 'failed' then now() else lms_bm_convert.requested_at end;
    return (select jsonb_build_object('ok', true, 'status', c.status, 'note', 'HTML 변환 엔진 연동 후 동작합니다. 지금은 변환 대기열에 넣었습니다.') from lms_bm_convert c where c.tenant_id = tid and c.file_id = id);
  elsif op = 'converted' then
    select c.* into f from lms_bm_convert c where c.tenant_id = tid and c.file_id = id;
    if not found or f.status <> 'done' then perform lmsb_err(409, 'not_ready', '아직 변환되지 않았습니다(HTML 변환 엔진 연동 후 동작).'); end if;
    insert into lms_bm_download (tenant_id, res_id, file_id, who, person_id, mode) values (tid, r.res_id, id, lmsb_who(a), (a->>'pid')::uuid, 'view');
    return jsonb_build_object('html', f.html, 'done_at', f.done_at);
  elsif op = 'downloads' then
    perform lmsb_need(a, 'grade');
    return jsonb_build_object('rows', coalesce((select jsonb_agg(jsonb_build_object('no', coalesce(pp.member_no, '운영자'), 'file', bf.name, 'views', q.v, 'downloads', q.d, 'last_at', q.l) order by pp.member_no nulls last, bf.name)
        from (select d.who, d.person_id, d.file_id, count(*) filter (where d.mode = 'view') v, count(*) filter (where d.mode = 'download') d, max(d.at) l from lms_bm_download d where d.tenant_id = tid and d.res_id = r.res_id group by d.who, d.person_id, d.file_id) q
        left join lms_person pp on pp.tenant_id = tid and pp.person_id = q.person_id join lms_b_file bf on bf.tenant_id = tid and bf.file_id = q.file_id), '[]'),
      'not_yet', coalesce((select jsonb_agg(pp.member_no order by pp.member_no) from lms_enrollment e join lms_person pp on pp.tenant_id = e.tenant_id and pp.person_id = e.person_id
        where e.tenant_id = tid and e.section_id = r.section_id and e.status = 'enrolled' and not exists (select 1 from lms_bm_download d where d.tenant_id = tid and d.res_id = r.res_id and d.person_id = e.person_id)), '[]'),
      'download', coalesce((r.body->>'download')::boolean, true));
  end if;
  perform lmsb_err(404, 'not_found', '없는 주소입니다.');
  return null;
end $$;
