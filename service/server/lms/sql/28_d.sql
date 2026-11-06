-- v30 묶음 D — 강의 게시판: 공지(열람자 확인 · 상단 고정 · 카테고리 · 복제) · Q&A(공개/비공개 · 멀티 답변 · 실명/익명) · 자료실 · 1:1 상담 · 댓글
-- SMS · 메일 실발송은 연동 지점: lms_d_outbox 대기열에만 쌓는다(「연동 후 동작」). 첨부 파일은 묶음 B lms_b_file(file-put)을 같이 쓴다.

create table if not exists lms_d_board (
  tenant_id text not null, board_id uuid not null default gen_random_uuid(), section_id uuid not null,
  kind text not null check (kind in ('notice','qna','archive','counsel')), name text not null, categories text[] not null default '{}',
  created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, board_id), unique (tenant_id, section_id, kind),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_d_post (
  tenant_id text not null, post_id uuid not null default gen_random_uuid(), board_id uuid not null, section_id uuid not null,
  kind text not null, category text not null default '', title text not null, body text not null default '',
  author_pid uuid, author_label text not null, pinned boolean not null default false, private boolean not null default false, anonymous boolean not null default false,
  files jsonb not null default '[]', status text not null default 'open' check (status in ('open','answered','closed')), copied_from uuid,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), deleted_at timestamptz,
  primary key (tenant_id, post_id), foreign key (tenant_id, board_id) references lms_d_board (tenant_id, board_id) on delete cascade
);
create index if not exists lms_d_post_board on lms_d_post (tenant_id, board_id, deleted_at, pinned desc, created_at desc);
create table if not exists lms_d_read (
  tenant_id text not null, post_id uuid not null, who text not null, person_id uuid, at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, post_id, who), foreign key (tenant_id, post_id) references lms_d_post (tenant_id, post_id) on delete cascade
);
create table if not exists lms_d_answer (
  tenant_id text not null, answer_id uuid not null default gen_random_uuid(), post_id uuid not null, author_pid uuid, author_label text not null,
  body text not null, anonymous boolean not null default false, accepted boolean not null default false, created_at timestamptz not null default clock_timestamp(), deleted_at timestamptz,
  primary key (tenant_id, answer_id), foreign key (tenant_id, post_id) references lms_d_post (tenant_id, post_id) on delete cascade
);
create table if not exists lms_d_comment (
  tenant_id text not null, comment_id uuid not null default gen_random_uuid(), post_id uuid not null, author_pid uuid, author_label text not null,
  body text not null, anonymous boolean not null default false, created_at timestamptz not null default clock_timestamp(), deleted_at timestamptz,
  primary key (tenant_id, comment_id), foreign key (tenant_id, post_id) references lms_d_post (tenant_id, post_id) on delete cascade
);
create table if not exists lms_d_outbox (
  tenant_id text not null, id bigserial, section_id uuid not null, post_id uuid, channel text not null check (channel in ('sms','mail')),
  targets int not null, title text not null, status text not null default 'queued' check (status in ('queued','sent','failed')), created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
do $$ declare t text; begin
  foreach t in array array['lms_d_board','lms_d_post','lms_d_read','lms_d_answer','lms_d_comment','lms_d_outbox'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_d_outbox_id_seq to didisam_tenant;
end $$;

-- 기본 게시판 4종(없으면 만든다)
create or replace function lmsd_ensure(sec uuid) returns void language sql as $$
  insert into lms_d_board (tenant_id, section_id, kind, name, categories)
  select lmsb_tid(), sec, k, n, c from (values ('notice', '공지', array['일반','학사','시험','과제']), ('qna', 'Q&A', array['강의','과제','시험','기타']), ('archive', '자료실', array['강의자료','참고자료']), ('counsel', '1:1 상담', array['학업','진로','기타'])) v(k, n, c)
  on conflict (tenant_id, section_id, kind) do nothing $$;
create or replace function lmsd_board(sec uuid, k text) returns uuid language sql as $$ select board_id from lms_d_board where tenant_id = lmsb_tid() and section_id = sec and kind = k $$;
-- 글을 볼 수 있는가: 비공개 Q&A · 상담은 작성자 + 관리자만
create or replace function lmsd_can_see(q lms_d_post, a jsonb) returns boolean language sql stable as $$
  select q.deleted_at is null and (not (q.private or q.kind = 'counsel') or lmsb_mgr(a) or q.author_pid is not distinct from (a->>'pid')::uuid and (a->>'pid' is not null or q.author_pid is null)) $$;
create or replace function lmsd_name(pid uuid, label text, anon boolean, a jsonb) returns text language sql stable as $$
  select case when anon and a->>'role' not in ('admin','professor') and pid is distinct from (a->>'pid')::uuid then '익명' else coalesce((select member_no from lms_person where tenant_id = lmsb_tid() and person_id = pid), label) end $$;
create or replace function lmsd_mine(pid uuid, a jsonb) returns boolean language sql immutable as $$ select pid is not distinct from (a->>'pid')::uuid and (a->>'pid' is not null or pid is null) $$;
-- 다른 묶음(C 수업 평가 공지 등)이 공지를 올릴 때
create or replace function lmsd_notice(sec uuid, title text, body text, cat text, a jsonb) returns uuid language plpgsql as $$
declare id uuid;
begin
  perform lmsd_ensure(sec);
  insert into lms_d_post (tenant_id, board_id, section_id, kind, category, title, body, author_pid, author_label) values (lmsb_tid(), lmsd_board(sec, 'notice'), sec, 'notice', coalesce(cat, ''), left(title, 200), body, (a->>'pid')::uuid, a->>'label') returning post_id into id;
  return id;
end $$;
create or replace function lmsd_export(sec uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('posts', coalesce((select jsonb_agg(jsonb_build_object('kind', q.kind, 'category', q.category, 'title', q.title, 'body', q.body, 'pinned', q.pinned, 'files', q.files) order by q.created_at)
    from lms_d_post q where q.tenant_id = lmsb_tid() and q.section_id = sec and q.kind in ('notice','archive') and q.deleted_at is null), '[]')) $$;
create or replace function lmsd_import(sec uuid, d jsonb, repl boolean, a jsonb) returns void language plpgsql as $$
declare e jsonb;
begin
  perform lmsd_ensure(sec);
  if repl then update lms_d_post set deleted_at = now() where tenant_id = lmsb_tid() and section_id = sec and kind in ('notice','archive') and deleted_at is null; end if;
  for e in select * from jsonb_array_elements(coalesce(d->'posts', '[]')) loop
    if e->>'kind' in ('notice','archive') then
      insert into lms_d_post (tenant_id, board_id, section_id, kind, category, title, body, author_label, pinned, files)
      values (lmsb_tid(), lmsd_board(sec, e->>'kind'), sec, e->>'kind', coalesce(e->>'category', ''), left(e->>'title', 200), coalesce(e->>'body', ''), a->>'label', coalesce((e->>'pinned')::boolean, false), '[]');
    end if;
  end loop;
end $$;

create or replace function lms_d_api(op text, p jsonb, x jsonb) returns jsonb language plpgsql set timezone = 'UTC' as $$
declare tid text := lmsb_tid(); sec uuid; a jsonb; r record; cats text[]; q lms_d_post; id uuid; id2 uuid; n int; v text; d jsonb; arr uuid[]; pg int; k text;
begin
  if tid is null then perform lmsb_err(401, 'auth', '로그인이 필요합니다.'); end if;
  if op in ('posts','board-save') then
    id := lmsb_id(p, 'board', '게시판'); select b.* into r from lms_d_board b where b.tenant_id = tid and b.board_id = id; if not found then perform lmsb_err(404, 'board', '게시판을 찾을 수 없습니다.'); end if; sec := r.section_id;
  elsif op = 'post-save' and lmsb_uuid(p->>'id') is null then
    id := lmsb_id(p, 'board', '게시판'); select b.* into r from lms_d_board b where b.tenant_id = tid and b.board_id = id; if not found then perform lmsb_err(404, 'board', '게시판을 찾을 수 없습니다.'); end if; sec := r.section_id;
  elsif op in ('post','readers','post-save','post-del','post-pin','post-copy','counsel-status') or op in ('answer','comment') then
    id := lmsb_id(p, case when op in ('answer','comment') then 'post' else 'id' end, '글'); select * into q from lms_d_post where tenant_id = tid and post_id = id;
    if not found or q.deleted_at is not null then perform lmsb_err(404, 'post', '글을 찾을 수 없습니다.'); end if; sec := q.section_id;
  elsif op in ('answer-del','answer-accept') then
    id := lmsb_id(p, 'id', '답변'); select dp.* into q from lms_d_answer an join lms_d_post dp on dp.tenant_id = an.tenant_id and dp.post_id = an.post_id where an.tenant_id = tid and an.answer_id = id and an.deleted_at is null;
    if not found then perform lmsb_err(404, 'answer', '답변을 찾을 수 없습니다.'); end if; sec := q.section_id;
  elsif op = 'comment-del' then
    id := lmsb_id(p, 'id', '댓글'); select dp.* into q from lms_d_comment cm join lms_d_post dp on dp.tenant_id = cm.tenant_id and dp.post_id = cm.post_id where cm.tenant_id = tid and cm.comment_id = id and cm.deleted_at is null;
    if not found then perform lmsb_err(404, 'comment', '댓글을 찾을 수 없습니다.'); end if; sec := q.section_id;
  else sec := lmsb_sec(p); end if;
  a := lmsb_actor(sec, p, x); perform lmsb_need(a, 'course.view');
  if q.post_id is not null and not lmsd_can_see(q, a) then perform lmsb_err(403, 'private', '작성자와 담당 교수자만 볼 수 있는 글입니다.'); end if;

  if op = 'boards' then
    perform lmsd_ensure(sec);
    return jsonb_build_object('me', a || jsonb_build_object('manage', lmsb_can(a, 'board.manage'), 'write', lmsb_can(a, 'board.write')),
      'boards', (select jsonb_agg(jsonb_build_object('id', b.board_id, 'kind', b.kind, 'name', b.name, 'categories', to_jsonb(b.categories),
        'posts', (select count(*) from lms_d_post dp where dp.tenant_id = tid and dp.board_id = b.board_id and lmsd_can_see(dp, a)),
        'unread', case when a->>'pid' is null then 0 else (select count(*) from lms_d_post dp where dp.tenant_id = tid and dp.board_id = b.board_id and lmsd_can_see(dp, a) and not exists (select 1 from lms_d_read rd where rd.tenant_id = tid and rd.post_id = dp.post_id and rd.who = lmsb_who(a))) end,
        'open', (select count(*) from lms_d_post dp where dp.tenant_id = tid and dp.board_id = b.board_id and lmsd_can_see(dp, a) and dp.kind in ('qna','counsel') and dp.status = 'open'))
        order by array_position(array['notice','qna','archive','counsel'], b.kind)) from lms_d_board b where b.tenant_id = tid and b.section_id = sec));
  elsif op = 'board-save' then
    perform lmsb_need(a, 'board.manage');
    if jsonb_typeof(p->'categories') <> 'array' or jsonb_array_length(p->'categories') > 20 or exists (select 1 from jsonb_array_elements(p->'categories') c where jsonb_typeof(c) <> 'string' or btrim(c #>> '{}') = '' or length(c #>> '{}') > 30) then perform lmsb_err(400, 'input', '카테고리는 30자 이내로 최대 20개입니다.'); end if;
    update lms_d_board set name = coalesce(nullif(lmsb_t(p, 'name', 40), ''), name), categories = (select array_agg(btrim(c #>> '{}')) from jsonb_array_elements(p->'categories') c) where tenant_id = tid and board_id = id;
    return jsonb_build_object('ok', true);
  elsif op = 'posts' then
    v := nullif(lmsb_t(p, 'cat', 30), ''); k := nullif(lmsb_t(p, 'q', 100), ''); pg := lmsb_i(p, 'page', 1, 10000, 1);
    return jsonb_build_object('board', jsonb_build_object('id', r.board_id, 'kind', r.kind, 'name', r.name, 'categories', to_jsonb(r.categories)),
      'can_write', case r.kind when 'notice' then lmsb_can(a, 'board.manage') when 'archive' then lmsb_can(a, 'board.manage') when 'counsel' then lmsb_can(a, 'board.write') and a->>'role' in ('student','admin','professor') else lmsb_can(a, 'board.write') end,
      'total', (select count(*) from lms_d_post dp where dp.tenant_id = tid and dp.board_id = id and lmsd_can_see(dp, a) and (v is null or dp.category = v) and (k is null or dp.title ilike '%' || k || '%' or dp.body ilike '%' || k || '%')),
      'posts', coalesce((select jsonb_agg(z.j order by z.pinned desc, z.created_at desc) from (select dp.pinned, dp.created_at, jsonb_build_object('id', dp.post_id, 'category', dp.category, 'title', dp.title, 'author', lmsd_name(dp.author_pid, dp.author_label, dp.anonymous, a), 'mine', lmsd_mine(dp.author_pid, a),
          'pinned', dp.pinned, 'private', dp.private, 'anonymous', dp.anonymous, 'status', dp.status, 'files', jsonb_array_length(dp.files), 'created_at', dp.created_at,
          'reads', (select count(*) from lms_d_read rd where rd.tenant_id = tid and rd.post_id = dp.post_id and rd.person_id is not null), 'read', exists (select 1 from lms_d_read rd where rd.tenant_id = tid and rd.post_id = dp.post_id and rd.who = lmsb_who(a)),
          'answers', (select count(*) from lms_d_answer an where an.tenant_id = tid and an.post_id = dp.post_id and an.deleted_at is null), 'comments', (select count(*) from lms_d_comment cm where cm.tenant_id = tid and cm.post_id = dp.post_id and cm.deleted_at is null)) j
        from lms_d_post dp where dp.tenant_id = tid and dp.board_id = id and lmsd_can_see(dp, a) and (v is null or dp.category = v) and (k is null or dp.title ilike '%' || k || '%' or dp.body ilike '%' || k || '%')
        order by dp.pinned desc, dp.created_at desc limit 20 offset (pg - 1) * 20) z), '[]'));
  elsif op = 'post' then
    -- 열람 기록(열람자 확인)
    insert into lms_d_read (tenant_id, post_id, who, person_id) values (tid, id, lmsb_who(a), (a->>'pid')::uuid) on conflict do nothing;
    return jsonb_build_object('post', jsonb_build_object('id', q.post_id, 'board_id', q.board_id, 'kind', q.kind, 'category', q.category, 'title', q.title, 'body', q.body, 'author', lmsd_name(q.author_pid, q.author_label, q.anonymous, a), 'mine', lmsd_mine(q.author_pid, a),
        'pinned', q.pinned, 'private', q.private, 'anonymous', q.anonymous, 'status', q.status, 'files', q.files, 'copied_from', q.copied_from, 'created_at', q.created_at, 'updated_at', q.updated_at,
        'reads', (select count(*) from lms_d_read rd where rd.tenant_id = tid and rd.post_id = q.post_id and rd.person_id is not null)),
      'can_answer', case q.kind when 'qna' then lmsb_can(a, 'board.write') and (not q.private or lmsb_mgr(a)) when 'counsel' then lmsb_mgr(a) or lmsd_mine(q.author_pid, a) else false end,
      'can_comment', q.kind in ('notice','qna','archive') and lmsb_can(a, 'board.write'), 'manage', lmsb_can(a, 'board.manage'),
      'answers', coalesce((select jsonb_agg(jsonb_build_object('id', an.answer_id, 'author', lmsd_name(an.author_pid, an.author_label, an.anonymous, a), 'mine', lmsd_mine(an.author_pid, a), 'body', an.body, 'accepted', an.accepted, 'anonymous', an.anonymous, 'created_at', an.created_at) order by an.accepted desc, an.created_at)
        from lms_d_answer an where an.tenant_id = tid and an.post_id = q.post_id and an.deleted_at is null), '[]'),
      'comments', coalesce((select jsonb_agg(jsonb_build_object('id', cm.comment_id, 'author', lmsd_name(cm.author_pid, cm.author_label, cm.anonymous, a), 'mine', lmsd_mine(cm.author_pid, a), 'body', cm.body, 'created_at', cm.created_at) order by cm.created_at)
        from lms_d_comment cm where cm.tenant_id = tid and cm.post_id = q.post_id and cm.deleted_at is null), '[]'));
  elsif op = 'readers' then
    perform lmsb_need(a, 'board.manage');
    return jsonb_build_object('read', coalesce((select jsonb_agg(jsonb_build_object('no', pp.member_no, 'at', rd.at) order by rd.at) from lms_d_read rd join lms_person pp on pp.tenant_id = rd.tenant_id and pp.person_id = rd.person_id where rd.tenant_id = tid and rd.post_id = id), '[]'),
      'unread', coalesce((select jsonb_agg(pp.member_no order by pp.member_no) from lms_enrollment e join lms_person pp on pp.tenant_id = e.tenant_id and pp.person_id = e.person_id where e.tenant_id = tid and e.section_id = sec and e.status = 'enrolled' and not exists (select 1 from lms_d_read rd where rd.tenant_id = tid and rd.post_id = id and rd.person_id = e.person_id)), '[]'),
      'enrolled', (select count(*) from lms_enrollment e where e.tenant_id = tid and e.section_id = sec and e.status = 'enrolled'));
  elsif op = 'post-save' then
    if lmsb_uuid(p->>'id') is null then
      k := r.kind;
      if k in ('notice','archive') then perform lmsb_need(a, 'board.manage'); else perform lmsb_need(a, 'board.write'); end if;
      if k = 'counsel' and a->>'role' not in ('student','admin','professor') then perform lmsb_err(403, 'role', '1:1 상담은 학생이 신청합니다.'); end if;
    else
      k := q.kind;
      if not (lmsd_mine(q.author_pid, a) or lmsb_can(a, 'board.manage') and k in ('notice','archive')) then perform lmsb_err(403, 'owner', '내가 쓴 글만 고칠 수 있습니다.'); end if;
    end if;
    v := lmsb_t(p, 'category', 30);
    cats := case when lmsb_uuid(p->>'id') is null then r.categories else (select b.categories from lms_d_board b where b.tenant_id = tid and b.board_id = q.board_id) end;
    if v <> '' and not (v = any(cats)) then perform lmsb_err(400, 'input', '게시판에 없는 카테고리입니다.'); end if;
    d := case when jsonb_typeof(p->'files') = 'array' then p->'files' else '[]' end;
    if jsonb_array_length(d) > 10 or exists (select 1 from jsonb_array_elements(d) f where not exists (select 1 from lms_b_file bf where bf.tenant_id = tid and bf.section_id = sec and bf.file_id = lmsb_uuid(f->>'file_id'))) then perform lmsb_err(400, 'input', '첨부 파일을 확인하세요(이 강의실에 올린 파일 · 최대 10개).'); end if;
    d := coalesce((select jsonb_agg(jsonb_build_object('file_id', bf.file_id, 'name', bf.name, 'size', bf.size, 'mime', bf.mime) order by f.o) from jsonb_array_elements(d) with ordinality f(v, o) join lms_b_file bf on bf.tenant_id = tid and bf.file_id = lmsb_uuid(f.v->>'file_id')), '[]');
    if lmsb_uuid(p->>'id') is null then
      insert into lms_d_post (tenant_id, board_id, section_id, kind, category, title, body, author_pid, author_label, pinned, private, anonymous, files)
        values (tid, lmsd_board(sec, k), sec, k, v, lmsb_t(p, 'title', 200, true, '제목'), lmsb_t(p, 'body', 50000), (a->>'pid')::uuid, a->>'label',
          k = 'notice' and lmsb_bool(p, 'pinned', false), k = 'counsel' or (k = 'qna' and lmsb_bool(p, 'private', false)), k = 'qna' and lmsb_bool(p, 'anonymous', false), d)
        returning post_id into id;
    else
      update lms_d_post set category = v, title = lmsb_t(p, 'title', 200, true, '제목'), body = lmsb_t(p, 'body', 50000), files = case when p ? 'files' then d else files end,
        private = case when kind = 'qna' then lmsb_bool(p, 'private', private) else private end, anonymous = case when kind = 'qna' then lmsb_bool(p, 'anonymous', anonymous) else anonymous end, updated_at = now() where tenant_id = tid and post_id = id;
    end if;
    -- 알림 발송(연동 지점): 공지를 SMS · 메일로 알릴 때 대기열에 쌓는다
    n := 0;
    if jsonb_typeof(p->'notify') = 'array' and k = 'notice' then
      insert into lms_d_outbox (tenant_id, section_id, post_id, channel, targets, title)
        select tid, sec, id, c #>> '{}', (select count(*) from lms_enrollment e where e.tenant_id = tid and e.section_id = sec and e.status = 'enrolled'), lmsb_t(p, 'title', 200)
        from jsonb_array_elements(p->'notify') c where c #>> '{}' in ('sms','mail');
      get diagnostics n = row_count;
    end if;
    return jsonb_build_object('ok', true, 'id', id, 'queued', n);
  elsif op = 'post-del' then
    if not (lmsd_mine(q.author_pid, a) or lmsb_can(a, 'board.manage')) then perform lmsb_err(403, 'owner', '내가 쓴 글만 지울 수 있습니다.'); end if;
    update lms_d_post set deleted_at = now() where tenant_id = tid and post_id = id; return jsonb_build_object('ok', true);
  elsif op = 'post-pin' then
    perform lmsb_need(a, 'board.manage'); if q.kind <> 'notice' then perform lmsb_err(400, 'input', '상단 고정은 공지에만 씁니다.'); end if;
    update lms_d_post set pinned = lmsb_bool(p, 'pinned', true) where tenant_id = tid and post_id = id; return jsonb_build_object('ok', true, 'pinned', lmsb_bool(p, 'pinned', true));
  elsif op = 'post-copy' then
    -- 공지 복제: 다른 강의실(내가 관리하는 분반) 공지로
    perform lmsb_need(a, 'board.manage'); if q.kind not in ('notice','archive') then perform lmsb_err(400, 'input', '공지 · 자료실 글만 복제할 수 있습니다.'); end if;
    arr := lmsb_ids(p, 'sections'); if cardinality(arr) = 0 then perform lmsb_err(400, 'input', '복제할 강의실을 고르세요.'); end if;
    n := 0;
    foreach id2 in array arr loop
      if id2 = sec or not exists (select 1 from lms_section where tenant_id = tid and section_id = id2) then perform lmsb_err(404, 'section', '복제할 강의실을 찾을 수 없습니다.'); end if;
      perform lmsb_need(lmsb_actor(id2, p, x), 'board.manage'); perform lmsd_ensure(id2);
      insert into lms_d_post (tenant_id, board_id, section_id, kind, category, title, body, author_pid, author_label, pinned, files, copied_from)
        values (tid, lmsd_board(id2, q.kind), id2, q.kind, case when exists (select 1 from lms_d_board bb where bb.tenant_id = tid and bb.section_id = id2 and bb.kind = q.kind and q.category = any(bb.categories)) then q.category else '' end, q.title, q.body, (a->>'pid')::uuid, a->>'label', q.pinned, '[]', q.post_id);
      n := n + 1;
    end loop;
    return jsonb_build_object('ok', true, 'copied', n);
  elsif op = 'answer' then
    if q.kind not in ('qna','counsel') then perform lmsb_err(400, 'input', 'Q&A · 상담 글에만 답변합니다.'); end if;
    if q.kind = 'qna' and not (lmsb_can(a, 'board.write') and (not q.private or lmsb_mgr(a))) then perform lmsb_err(403, 'role', '비공개 질문은 담당 교수자만 답변합니다.'); end if;
    if q.kind = 'counsel' and not (lmsb_mgr(a) or lmsd_mine(q.author_pid, a)) then perform lmsb_err(403, 'role', '상담 담당자만 답변합니다.'); end if;
    if q.status = 'closed' then perform lmsb_err(409, 'closed', '종료된 상담입니다.'); end if;
    insert into lms_d_answer (tenant_id, post_id, author_pid, author_label, body, anonymous) values (tid, id, (a->>'pid')::uuid, a->>'label', lmsb_t(p, 'body', 20000, true, '답변'), q.kind = 'qna' and lmsb_bool(p, 'anonymous', false)) returning answer_id into id2;
    if lmsb_mgr(a) and q.status = 'open' then update lms_d_post set status = 'answered' where tenant_id = tid and post_id = id; end if;
    return jsonb_build_object('ok', true, 'id', id2);
  elsif op = 'answer-del' then
    select * into r from lms_d_answer where tenant_id = tid and answer_id = id;
    if not (lmsd_mine(r.author_pid, a) or lmsb_can(a, 'board.manage')) then perform lmsb_err(403, 'owner', '내가 쓴 답변만 지울 수 있습니다.'); end if;
    update lms_d_answer set deleted_at = now() where tenant_id = tid and answer_id = id; return jsonb_build_object('ok', true);
  elsif op = 'answer-accept' then
    if not (lmsd_mine(q.author_pid, a) or lmsb_can(a, 'board.manage')) then perform lmsb_err(403, 'owner', '질문한 사람만 채택할 수 있습니다.'); end if;
    update lms_d_answer set accepted = (answer_id = id) where tenant_id = tid and post_id = q.post_id; update lms_d_post set status = 'answered' where tenant_id = tid and post_id = q.post_id;
    return jsonb_build_object('ok', true);
  elsif op = 'comment' then
    if q.kind = 'counsel' then perform lmsb_err(400, 'input', '상담 글은 답변으로 이어 갑니다.'); end if;
    perform lmsb_need(a, 'board.write');
    insert into lms_d_comment (tenant_id, post_id, author_pid, author_label, body, anonymous) values (tid, id, (a->>'pid')::uuid, a->>'label', lmsb_t(p, 'body', 4000, true, '댓글'), lmsb_bool(p, 'anonymous', false)) returning comment_id into id2;
    return jsonb_build_object('ok', true, 'id', id2);
  elsif op = 'comment-del' then
    select * into r from lms_d_comment where tenant_id = tid and comment_id = id;
    if not (lmsd_mine(r.author_pid, a) or lmsb_can(a, 'board.manage')) then perform lmsb_err(403, 'owner', '내가 쓴 댓글만 지울 수 있습니다.'); end if;
    update lms_d_comment set deleted_at = now() where tenant_id = tid and comment_id = id; return jsonb_build_object('ok', true);
  elsif op = 'counsel-status' then
    v := lmsb_t(p, 'status', 10, true, '상태'); if v not in ('open','answered','closed') then perform lmsb_err(400, 'input', '상태는 open · answered · closed입니다.'); end if;
    if q.kind not in ('counsel','qna') or not (lmsb_mgr(a) or lmsd_mine(q.author_pid, a)) then perform lmsb_err(403, 'role', '상담 담당자 또는 신청자만 바꿀 수 있습니다.'); end if;
    update lms_d_post set status = v where tenant_id = tid and post_id = id; return jsonb_build_object('ok', true, 'status', v);
  elsif op = 'outbox' then
    perform lmsb_need(a, 'board.manage');
    return jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'channel', o.channel, 'targets', o.targets, 'title', o.title, 'status', o.status, 'created_at', o.created_at) order by o.id desc) from lms_d_outbox o where o.tenant_id = tid and o.section_id = sec), '[]'),
      'note', 'SMS · 메일 실발송은 학교 문자 · 메일 시스템 연동 후 동작합니다. 지금은 발송 대기열에만 쌓입니다.');
  end if;
  perform lmsb_err(404, 'not_found', '없는 주소입니다.');
  return null;
end $$;
