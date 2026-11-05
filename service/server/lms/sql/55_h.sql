-- v30 묶음 H — 성적: 평가 항목 · 카테고리(수업계획서 비율) · 점수 입력 · 등급 산출(절대 · 상대 · 점수 · 백분율 · P/NP) · 평균 조정 ·
--               채점 비공개 · 종합 평가 보드 · 조건별 학생 선택 메시지 · 성적 확정 · 변경 이력 · 학사 전송 대기열. 청강생(lms_enrollment.kind='audit')은 제외.
create table if not exists lms_grade_policy (
  tenant_id text not null references tenants(id) on delete cascade,
  section_id uuid not null,
  scale text not null default 'abc' check (scale in ('abc', 'relative', 'score', 'pct', 'pass')),
  cutoffs jsonb not null default '[["A+",95],["A0",90],["B+",85],["B0",80],["C+",75],["C0",70],["D+",65],["D0",60],["F",0]]',
  rel jsonb not null default '{"A":30,"AB":70}',      -- 상대평가: A 이하 30%, A+B 누적 70%
  adjust jsonb not null default '{"mode":"none"}',    -- 평균 조정: none · shift(가산) · linear(비례), target
  pass_cut numeric(5,2) not null default 60,
  hidden boolean not null default false,              -- 채점 비공개(확정 전 학생에게 점수 숨김)
  status text not null default 'open' check (status in ('open', 'confirmed')),
  confirmed_at timestamptz, confirmed_by uuid, updated_at timestamptz not null default now(),
  primary key (tenant_id, section_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
-- 학사 성적 전송 대기열(연동 지점 — 학사 어댑터가 pending을 가져가 전송하고 queue-ack로 결과를 돌려준다)
create table if not exists lms_sis_grade_queue (
  tenant_id text not null references tenants(id) on delete cascade,
  qid bigserial, section_id uuid not null, person_id uuid not null, member_no text not null,
  payload jsonb not null, status text not null default 'pending' check (status in ('pending', 'sent', 'error')),
  tries int not null default 0, enqueued_at timestamptz not null default now(), sent_at timestamptz, ack text, last_error text,
  primary key (tenant_id, qid)
);
create index if not exists lms_sgq_status on lms_sis_grade_queue (tenant_id, status, qid);
-- 안내 메시지 대기열(연동 지점 — 문자 · 메일 · 푸시 발송기가 가져간다. 연락처는 저장하지 않고 학번만)
create table if not exists lms_grade_msg_queue (
  tenant_id text not null references tenants(id) on delete cascade,
  mid bigserial, section_id uuid not null, channel text not null check (channel in ('push', 'email', 'sms', 'kakao')),
  targets jsonb not null, body text not null, status text not null default 'queued' check (status in ('queued', 'sent', 'error')),
  by_person uuid, created_at timestamptz not null default now(),
  primary key (tenant_id, mid)
);
do $$ declare t text; begin
  foreach t in array array['lms_grade_policy','lms_sis_grade_queue','lms_grade_msg_queue'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_sis_grade_queue_qid_seq, lms_grade_msg_queue_mid_seq to didisam_tenant;
end $$;

-- ── 도우미 ──
create or replace function lms_h_pol(sec uuid) returns lms_grade_policy language plpgsql as $$
declare p lms_grade_policy;
begin
  select * into p from lms_grade_policy where section_id = sec;
  if p.section_id is null then
    insert into lms_grade_policy (tenant_id, section_id) values (lms_x_tid(), sec) on conflict do nothing;
    select * into p from lms_grade_policy where section_id = sec;
  end if;
  return p;
end $$;
create or replace function lms_h_hidden(sec uuid) returns boolean language sql stable as $$
  select coalesce((select hidden and status <> 'confirmed' from lms_grade_policy where section_id = sec), false) $$;
create or replace function lms_h_pol_json(p lms_grade_policy) returns jsonb language sql stable as $$
  select jsonb_build_object('scale', p.scale, 'cutoffs', p.cutoffs, 'rel', p.rel, 'adjust', p.adjust, 'pass_cut', lms_x_n(p.pass_cut), 'hidden', p.hidden,
    'status', p.status, 'confirmed_at', lms_x_ts(p.confirmed_at)) $$;
create or replace function lms_h_item_json(i lms_grade_item) returns jsonb language sql stable as $$
  select jsonb_build_object('item_id', i.item_id, 'category', i.category, 'name', i.name, 'weight_pct', lms_x_n(i.weight_pct), 'max_score', lms_x_n(i.max_score),
    'source_ref', i.source_ref, 'sort', i.sort) $$;
create or replace function lms_h_cut(p lms_grade_policy, tot numeric) returns text language sql stable as $$
  select c->>0 from jsonb_array_elements(p.cutoffs) with ordinality x(c, n) where tot >= (c->>1)::numeric order by n limit 1 $$;
-- 산출: 정규 수강생만. raw = Σ(점수/만점 × 비율) (비율 합 0이면 Σ점수/Σ만점 × 100), total = 평균 조정 후, letter = 등급
create or replace function lms_h_compute(sec uuid) returns jsonb language plpgsql as $$
declare p lms_grade_policy := lms_h_pol(sec); wsum numeric; rows jsonb; mean numeric; mode text := coalesce(p.adjust->>'mode', 'none'); tgt numeric := (p.adjust->>'target')::numeric; n int;
begin
  select coalesce(sum(weight_pct), 0) into wsum from lms_grade_item where section_id = sec;
  with st as (select e.person_id, pe.member_no, pe.unit_code from lms_enrollment e join lms_person pe on pe.person_id = e.person_id
              where e.section_id = sec and e.status = 'enrolled' and e.kind = 'regular'),
  sc as (select st.person_id, i.item_id, i.weight_pct, i.max_score, s.score from st cross join lms_grade_item i
         left join lms_grade_score s on s.item_id = i.item_id and s.person_id = st.person_id where i.section_id = sec),
  agg as (select st.*, case when wsum > 0 then round(coalesce((select sum(coalesce(score, 0) / nullif(max_score, 0) * weight_pct) from sc where sc.person_id = st.person_id), 0), 2)
                            else round(coalesce(100.0 * (select sum(coalesce(score, 0)) from sc where sc.person_id = st.person_id) / nullif((select sum(max_score) from sc where sc.person_id = st.person_id), 0), 0), 2) end raw,
            coalesce((select jsonb_object_agg(item_id, lms_x_n(score)) from sc where sc.person_id = st.person_id and score is not null), '{}') scores,
            (select count(*) from sc where sc.person_id = st.person_id and score is null) missing from st)
  select jsonb_agg(jsonb_build_object('person_id', person_id, 'member_no', member_no, 'unit_code', unit_code, 'raw', raw, 'scores', scores, 'missing', missing) order by member_no) into rows from agg;
  rows := coalesce(rows, '[]'); n := jsonb_array_length(rows);
  select avg((r->>'raw')::numeric) into mean from jsonb_array_elements(rows) r;
  select coalesce(jsonb_agg(r || jsonb_build_object('total', round(least(100, greatest(0, case
      when mode = 'shift' and tgt is not null and mean is not null then (r->>'raw')::numeric + (tgt - mean)
      when mode = 'linear' and tgt is not null and coalesce(mean, 0) > 0 then (r->>'raw')::numeric * tgt / mean
      else (r->>'raw')::numeric end)), 2)) order by r->>'member_no'), '[]') into rows from jsonb_array_elements(rows) r;
  -- 순위(동점 공동) · 등급
  select coalesce(jsonb_agg(r || jsonb_build_object('rank', 1 + (select count(*) from jsonb_array_elements(rows) o where (o->>'total')::numeric > (r->>'total')::numeric)) order by r->>'member_no'), '[]')
    into rows from jsonb_array_elements(rows) r;
  select coalesce(jsonb_agg(r || jsonb_build_object('letter', case p.scale
      when 'abc' then lms_h_cut(p, (r->>'total')::numeric)
      when 'pass' then case when (r->>'total')::numeric >= p.pass_cut then 'P' else 'NP' end
      when 'relative' then (with b as (select lms_h_cut(p, (r->>'total')::numeric) l, (r->>'rank')::numeric / greatest(n, 1) * 100 f)
        select case when left(l, 1) = 'A' and f > (p.rel->>'A')::numeric then case when f > (p.rel->>'AB')::numeric then 'C+' else 'B+' end
                    when left(l, 1) = 'B' and f > (p.rel->>'AB')::numeric then 'C+' else l end from b)
      else null end, 'raw', lms_x_n((r->>'raw')::numeric), 'total', lms_x_n((r->>'total')::numeric)) order by r->>'member_no'), '[]') into rows from jsonb_array_elements(rows) r;
  return jsonb_build_object('weight_sum', lms_x_n(wsum), 'rows', rows, 'mean_raw', lms_x_n(mean));
end $$;
create or replace function lms_h_sec(a jsonb, k text) returns uuid language plpgsql as $$
declare s uuid := lms_x_uuid(a->>k, '분반'); begin perform lms_x_section(s); return s; end $$;

-- ── 종합 평가 보드 ──
create or replace function lms_h_board(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_h_sec(a, 'section'); c jsonb; p lms_grade_policy; rows jsonb;
begin
  perform lms_x_staff(ctx); p := lms_h_pol(sec); c := lms_h_compute(sec);
  select coalesce(jsonb_agg(r - 'person_id' || jsonb_build_object('final', (select jsonb_build_object('total', lms_x_n(f.total), 'letter', f.letter, 'confirmed_at', lms_x_ts(f.confirmed_at), 'sent_at', lms_x_ts(f.sent_to_sis_at))
      from lms_grade_final f where f.section_id = sec and f.person_id = (r->>'person_id')::uuid)) order by r->>'member_no'), '[]') into rows from jsonb_array_elements(c->'rows') r;
  return jsonb_build_object('section_id', sec, 'policy', lms_h_pol_json(p),
    'items', coalesce((select jsonb_agg(lms_h_item_json(i) order by i.sort, i.name) from lms_grade_item i where i.section_id = sec), '[]'),
    'weight_sum', c->'weight_sum', 'rows', rows,
    'auditors', (select count(*) from lms_enrollment where section_id = sec and status = 'enrolled' and kind = 'audit'),
    'stats', (select jsonb_build_object('n', count(*), 'mean', lms_x_n(avg((r->>'total')::numeric)), 'sd', lms_x_n(coalesce(stddev_pop((r->>'total')::numeric), 0)),
        'min', lms_x_n(min((r->>'total')::numeric)), 'max', lms_x_n(max((r->>'total')::numeric)), 'mean_raw', c->'mean_raw') from jsonb_array_elements(c->'rows') r),
    'dist', coalesce((select jsonb_agg(jsonb_build_object('letter', l, 'n', k) order by l) from (select r->>'letter' l, count(*) k from jsonb_array_elements(c->'rows') r where r->>'letter' is not null group by 1) q), '[]'),
    'hist', (select jsonb_agg(jsonb_build_object('from', g * 10, 'to', g * 10 + 10, 'n', (select count(*) from jsonb_array_elements(c->'rows') r where least(9, floor((r->>'total')::numeric / 10)) = g)) order by g) from generate_series(0, 9) g));
end $$;

-- ── 평가 항목 ──
create or replace function lms_h_item_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare i lms_grade_item; sec uuid; cat text := coalesce(nullif(a->>'category', ''), 'other');
begin
  perform lms_x_staff(ctx);
  if cat not in ('midterm', 'final', 'assignment', 'quiz', 'attendance', 'participation', 'project', 'other') then perform lms_x_err(400, 'category', '평가 카테고리를 고르세요.'); end if;
  if nullif(a->>'item_id', '') is not null then
    update lms_grade_item set category = cat, name = lms_x_str(a, 'name', 100, true, '항목 이름'), weight_pct = lms_x_num(a, 'weight_pct', 0, 100, 0, '반영 비율(%)'),
      max_score = lms_x_num(a, 'max_score', 1, 1000, 100, '만점'), sort = lms_x_num(a, 'sort', 0, 999, 0, '순서')::int
    where item_id = lms_x_uuid(a->>'item_id', '평가 항목') returning * into i;
    if i.item_id is null then perform lms_x_err(404, 'item', '없는 평가 항목입니다.'); end if;
  else
    sec := lms_h_sec(a, 'section_id');
    insert into lms_grade_item (tenant_id, section_id, category, name, weight_pct, max_score, sort)
    values (lms_x_tid(), sec, cat, lms_x_str(a, 'name', 100, true, '항목 이름'), lms_x_num(a, 'weight_pct', 0, 100, 0, '반영 비율(%)'),
      lms_x_num(a, 'max_score', 1, 1000, 100, '만점'), lms_x_num(a, 'sort', 0, 999, 0, '순서')::int) returning * into i;
  end if;
  return jsonb_build_object('item', lms_h_item_json(i), '_audit', lms_x_audit('lms.h.item_save', jsonb_build_object('item', i.item_id, 'weight', lms_x_n(i.weight_pct))));
end $$;
create or replace function lms_h_item_delete(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare id uuid := lms_x_uuid(a->>'item_id', '평가 항목');
begin
  perform lms_x_staff(ctx);
  delete from lms_grade_item where item_id = id;
  if not found then perform lms_x_err(404, 'item', '없는 평가 항목입니다.'); end if;
  return jsonb_build_object('ok', true, '_audit', lms_x_audit('lms.h.item_delete', jsonb_build_object('item', id)));
end $$;
-- 수업계획서 평가 비율 자동 등록: syllabus.eval = {midterm:30, …} 또는 [{category, name, weight}]
create or replace function lms_h_from_syllabus(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_h_sec(a, 'section_id'); ev jsonb; e record; n int := 0; nm text;
  lbl jsonb := '{"midterm":"중간고사","final":"기말고사","assignment":"과제","quiz":"퀴즈","attendance":"출석","participation":"참여","project":"프로젝트","other":"기타"}';
begin
  perform lms_x_staff(ctx);
  select syllabus->'eval' into ev from lms_section where section_id = sec;
  if ev is null or jsonb_typeof(ev) not in ('object', 'array') or ev in ('{}', '[]') then
    perform lms_x_err(400, 'no_syllabus', '수업계획서에 평가 비율이 없습니다. 학사 계획서 연동 후 자동으로 채워집니다(직접 입력도 할 수 있습니다).'); end if;
  for e in select case when jsonb_typeof(ev) = 'object' then k else v->>'category' end cat,
                  case when jsonb_typeof(ev) = 'object' then v #>> '{}' else v->>'weight' end w,
                  case when jsonb_typeof(ev) = 'array' then v->>'name' end nm2
           from (select key k, value v from jsonb_each(case when jsonb_typeof(ev) = 'object' then ev else '{}' end)
                 union all select null, value from jsonb_array_elements(case when jsonb_typeof(ev) = 'array' then ev else '[]' end)) q loop
    if e.cat is null or not lbl ? e.cat then continue; end if;
    nm := coalesce(nullif(left(e.nm2, 100), ''), lbl->>e.cat);
    update lms_grade_item set weight_pct = e.w::numeric where section_id = sec and category = e.cat and source_ref is null;
    if not found then insert into lms_grade_item (tenant_id, section_id, category, name, weight_pct, sort) values (lms_x_tid(), sec, e.cat, nm, e.w::numeric, n); end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('applied', n, 'items', coalesce((select jsonb_agg(lms_h_item_json(i) order by i.sort, i.name) from lms_grade_item i where i.section_id = sec), '[]'),
    '_audit', lms_x_audit('lms.h.from_syllabus', jsonb_build_object('section', sec, 'n', n)));
end $$;

-- 점수 입력(한 명 · 엑셀 일괄) — 청강생 · 미수강 학번은 건너뜀
create or replace function lms_h_scores(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare i lms_grade_item; r jsonb; pid uuid; k text; sc numeric; saved int := 0; skipped jsonb := '[]';
begin
  perform lms_x_staff(ctx);
  select * into i from lms_grade_item where item_id = lms_x_uuid(a->>'item_id', '평가 항목');
  if i.item_id is null then perform lms_x_err(404, 'item', '없는 평가 항목입니다.'); end if;
  if jsonb_typeof(a->'rows') <> 'array' or jsonb_array_length(a->'rows') > 5000 then perform lms_x_err(400, 'rows', '점수 목록(최대 5,000행)을 보내세요.'); end if;
  for r in select * from jsonb_array_elements(a->'rows') loop
    select p.person_id, e.kind into pid, k from lms_person p left join lms_enrollment e on e.person_id = p.person_id and e.section_id = i.section_id and e.status = 'enrolled'
     where p.member_no = r->>'member_no';
    if pid is null or k is null then skipped := skipped || jsonb_build_object('member_no', r->>'member_no', 'reason', 'not_enrolled'); continue; end if;
    if k = 'audit' then skipped := skipped || jsonb_build_object('member_no', r->>'member_no', 'reason', 'audit'); continue; end if;
    if r->'score' is null or jsonb_typeof(r->'score') = 'null' or btrim(r->>'score') = '' then sc := null;
    else begin sc := (r->>'score')::numeric; exception when others then skipped := skipped || jsonb_build_object('member_no', r->>'member_no', 'reason', 'bad_score'); continue; end; end if;
    if sc is not null and (sc < 0 or sc > i.max_score) then skipped := skipped || jsonb_build_object('member_no', r->>'member_no', 'reason', 'range'); continue; end if;
    insert into lms_grade_score (tenant_id, item_id, person_id, score, feedback, graded_by) values (lms_x_tid(), i.item_id, pid, sc, left(r->>'feedback', 2000), lms_x_uid(ctx))
    on conflict (tenant_id, item_id, person_id) do update set score = excluded.score, feedback = coalesce(excluded.feedback, lms_grade_score.feedback), graded_by = excluded.graded_by, graded_at = now();
    saved := saved + 1; pid := null; k := null;
  end loop;
  return jsonb_build_object('saved', saved, 'skipped', skipped, '_audit', lms_x_audit('lms.h.scores', jsonb_build_object('item', i.item_id, 'saved', saved, 'skipped', jsonb_array_length(skipped))));
end $$;

-- 등급 정책(등급 방식 · 기준 · 상대평가 비율 · 평균 조정 · 비공개)
create or replace function lms_h_policy(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_h_sec(a, 'section_id'); p lms_grade_policy; sc text; cu jsonb; rl jsonb; ad jsonb; c jsonb; prev numeric := 1e9; md text;
begin
  perform lms_x_staff(ctx); p := lms_h_pol(sec);
  sc := coalesce(nullif(a->>'scale', ''), p.scale);
  if sc not in ('abc', 'relative', 'score', 'pct', 'pass') then perform lms_x_err(400, 'scale', '등급 방식을 고르세요(abc · relative · score · pct · pass).'); end if;
  cu := coalesce(a->'cutoffs', p.cutoffs);
  if jsonb_typeof(cu) <> 'array' or jsonb_array_length(cu) < 2 then perform lms_x_err(400, 'cutoffs', '등급 기준표를 2개 이상 입력하세요.'); end if;
  for c in select * from jsonb_array_elements(cu) loop
    begin if jsonb_typeof(c) <> 'array' or (c->>1)::numeric >= prev or (c->>1)::numeric < 0 or length(c->>0) not between 1 and 4 then raise exception 'x'; end if; prev := (c->>1)::numeric;
    exception when others then perform lms_x_err(400, 'cutoffs', '등급 기준은 [등급, 최저점]을 높은 점수부터 차례로 입력하세요.'); end;
  end loop;
  if prev <> 0 then perform lms_x_err(400, 'cutoffs', '마지막 등급의 최저점은 0이어야 합니다.'); end if;
  rl := coalesce(a->'rel', p.rel);
  begin if (rl->>'A')::numeric not between 0 and 100 or (rl->>'AB')::numeric not between (rl->>'A')::numeric and 100 then raise exception 'x'; end if;
  exception when others then perform lms_x_err(400, 'rel', '상대평가 비율은 0 ≤ A ≤ A+B ≤ 100(%)로 입력하세요.'); end;
  rl := jsonb_build_object('A', lms_x_n((rl->>'A')::numeric), 'AB', lms_x_n((rl->>'AB')::numeric));
  ad := coalesce(a->'adjust', p.adjust); md := coalesce(ad->>'mode', 'none');
  if md not in ('none', 'shift', 'linear') then perform lms_x_err(400, 'adjust', '평균 조정 방식은 none · shift · linear입니다.'); end if;
  if md <> 'none' then
    begin if (ad->>'target')::numeric not between 1 and 100 then raise exception 'x'; end if; exception when others then perform lms_x_err(400, 'adjust', '목표 평균은 1~100 사이로 입력하세요.'); end;
    ad := jsonb_build_object('mode', md, 'target', lms_x_n((ad->>'target')::numeric));
  else ad := '{"mode":"none"}'; end if;
  update lms_grade_policy set scale = sc, cutoffs = cu, rel = rl, adjust = ad, pass_cut = lms_x_num(a, 'pass_cut', 0, 100, p.pass_cut, 'P/NP 기준'),
    hidden = lms_x_bool(a, 'hidden', p.hidden), updated_at = now() where section_id = sec returning * into p;
  return jsonb_build_object('policy', lms_h_pol_json(p), '_audit', lms_x_audit('lms.h.policy', jsonb_build_object('section', sec, 'scale', sc, 'adjust', ad, 'hidden', p.hidden)));
end $$;

-- 성적 확정 → 최종 성적 · 변경 이력 · 학사 전송 대기열
create or replace function lms_h_enqueue(sec uuid, pid uuid, mno text, f lms_grade_final, kind text) returns void language plpgsql as $$
begin
  insert into lms_sis_grade_queue (tenant_id, section_id, person_id, member_no, payload)
  values (lms_x_tid(), sec, pid, mno, jsonb_build_object('kind', kind, 'term_id', (select term_id from lms_section where section_id = sec),
    'course_code', (select course_code from lms_section where section_id = sec), 'section_no', (select section_no from lms_section where section_id = sec),
    'member_no', mno, 'total', lms_x_n(f.total), 'letter', f.letter, 'scale', f.scale));
end $$;
create or replace function lms_h_confirm(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_h_sec(a, 'section_id'); p lms_grade_policy; c jsonb; r jsonb; old lms_grade_final; f lms_grade_final; n int := 0; q int := 0; sc text;
begin
  perform lms_x_staff(ctx); p := lms_h_pol(sec); c := lms_h_compute(sec);
  if (c->>'weight_sum')::numeric not in (0, 100) then perform lms_x_err(400, 'weight', '평가 항목 반영 비율의 합이 100%가 되어야 확정할 수 있습니다(현재 ' || (c->>'weight_sum') || '%).'); end if;
  if jsonb_array_length(c->'rows') = 0 then perform lms_x_err(400, 'empty', '성적을 확정할 정규 수강생이 없습니다.'); end if;
  sc := p.scale;
  for r in select * from jsonb_array_elements(c->'rows') loop
    select * into old from lms_grade_final where section_id = sec and person_id = (r->>'person_id')::uuid;
    if old.person_id is not null and old.total = (r->>'total')::numeric and old.letter is not distinct from (r->>'letter') and old.confirmed_at is not null then continue; end if;
    insert into lms_grade_final (tenant_id, section_id, person_id, total, scale, letter, confirmed_by, confirmed_at)
    values (lms_x_tid(), sec, (r->>'person_id')::uuid, (r->>'total')::numeric, sc, r->>'letter', lms_x_uid(ctx), now())
    on conflict (tenant_id, section_id, person_id) do update set total = excluded.total, scale = excluded.scale, letter = excluded.letter, confirmed_by = excluded.confirmed_by,
      confirmed_at = now(), sent_to_sis_at = null, sis_ack = null returning * into f;
    insert into lms_grade_history (tenant_id, section_id, person_id, before, after, reason, by_person)
    values (lms_x_tid(), sec, f.person_id, case when old.person_id is null then null else jsonb_build_object('total', lms_x_n(old.total), 'letter', old.letter) end,
      jsonb_build_object('total', lms_x_n(f.total), 'letter', f.letter), coalesce(lms_x_str(a, 'reason', 500, false, '사유'), '성적 확정'), lms_x_uid(ctx));
    perform lms_h_enqueue(sec, f.person_id, r->>'member_no', f, case when old.person_id is null then 'confirm' else 'correction' end);
    n := n + 1; q := q + 1;
  end loop;
  update lms_grade_policy set status = 'confirmed', confirmed_at = now(), confirmed_by = lms_x_uid(ctx) where section_id = sec;
  return jsonb_build_object('confirmed', jsonb_array_length(c->'rows'), 'changed', n, 'queued', q, '_audit', lms_x_audit('lms.h.confirm', jsonb_build_object('section', sec, 'changed', n)));
end $$;
-- 확정 후 개별 정정(사유 필수 · 이력 · 다시 전송)
create or replace function lms_h_change(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_h_sec(a, 'section_id'); old lms_grade_final; f lms_grade_final; pid uuid; rs text := lms_x_str(a, 'reason', 500, true, '정정 사유'); tot numeric; lt text;
begin
  perform lms_x_staff(ctx);
  select person_id into pid from lms_person where member_no = a->>'member_no';
  select * into old from lms_grade_final where section_id = sec and person_id = pid;
  if old.person_id is null or old.confirmed_at is null then perform lms_x_err(409, 'not_confirmed', '확정된 성적만 정정할 수 있습니다.'); end if;
  if length(rs) < 2 then perform lms_x_err(400, 'reason', '정정 사유를 2자 이상 입력하세요.'); end if;
  tot := lms_x_num(a, 'total', 0, 100, old.total, '총점'); lt := coalesce(lms_x_str(a, 'letter', 4, false, '등급'), old.letter);
  update lms_grade_final set total = tot, letter = lt, confirmed_by = lms_x_uid(ctx), confirmed_at = now(), sent_to_sis_at = null, sis_ack = null
  where section_id = sec and person_id = pid returning * into f;
  insert into lms_grade_history (tenant_id, section_id, person_id, before, after, reason, by_person)
  values (lms_x_tid(), sec, pid, jsonb_build_object('total', lms_x_n(old.total), 'letter', old.letter), jsonb_build_object('total', lms_x_n(f.total), 'letter', f.letter), rs, lms_x_uid(ctx));
  perform lms_h_enqueue(sec, pid, a->>'member_no', f, 'correction');
  return jsonb_build_object('final', jsonb_build_object('member_no', a->>'member_no', 'total', lms_x_n(f.total), 'letter', f.letter),
    '_audit', lms_x_audit('lms.h.change', jsonb_build_object('section', sec, 'member_no', a->>'member_no', 'reason', rs)));
end $$;
create or replace function lms_h_history(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_h_sec(a, 'section');
begin
  perform lms_x_staff(ctx);
  return jsonb_build_object('history', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'member_no', p.member_no, 'before', h.before, 'after', h.after, 'reason', h.reason,
      'by', h.by_person, 'at', lms_x_ts(h.at)) order by h.id desc)
    from (select * from lms_grade_history where section_id = sec order by id desc limit 500) h left join lms_person p on p.person_id = h.person_id), '[]'));
end $$;
create or replace function lms_h_queue(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare stv text := nullif(a->>'status', '');
begin
  perform lms_x_staff(ctx);
  if stv is not null and stv not in ('pending', 'sent', 'error') then perform lms_x_err(400, 'status', '상태는 pending · sent · error입니다.'); end if;
  return jsonb_build_object('connected', false, 'note', '학사 성적 전송 연동 전입니다. 연동 후 동작: 학사 어댑터가 대기(pending) 건을 가져가 전송하고 결과를 queue-ack로 돌려줍니다.',
    'counts', (select jsonb_build_object('pending', count(*) filter (where status = 'pending'), 'sent', count(*) filter (where status = 'sent'), 'error', count(*) filter (where status = 'error')) from lms_sis_grade_queue
               where nullif(a->>'section', '') is null or section_id::text = a->>'section'),
    'queue', coalesce((select jsonb_agg(jsonb_build_object('qid', q.qid, 'section_id', q.section_id, 'member_no', q.member_no, 'payload', q.payload, 'status', q.status, 'tries', q.tries,
        'enqueued_at', lms_x_ts(q.enqueued_at), 'sent_at', lms_x_ts(q.sent_at), 'ack', q.ack, 'last_error', q.last_error) order by q.qid desc)
      from (select * from lms_sis_grade_queue where (stv is null or status = stv) and (nullif(a->>'section', '') is null or section_id::text = a->>'section') order by qid desc limit 500) q), '[]'));
end $$;
-- 학사 어댑터 결과 반영(연동 지점). 운영자만.
create or replace function lms_h_queue_ack(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare okv boolean := lms_x_bool(a, 'ok', true); n int;
begin
  perform lms_x_admin(ctx);
  if jsonb_typeof(a->'qids') <> 'array' or jsonb_array_length(a->'qids') = 0 then perform lms_x_err(400, 'qids', '처리할 대기열 번호를 보내세요.'); end if;
  update lms_sis_grade_queue set status = case when okv then 'sent' else 'error' end, tries = tries + 1, sent_at = case when okv then now() end,
    ack = case when okv then coalesce(lms_x_str(a, 'ack', 200, false, '확인 번호'), 'manual') end, last_error = case when okv then null else coalesce(lms_x_str(a, 'error', 500, false, '오류'), '전송 실패') end
  where status <> 'sent' and qid::text in (select jsonb_array_elements_text(a->'qids'));
  get diagnostics n = row_count;
  if okv then
    update lms_grade_final f set sent_to_sis_at = now(), sis_ack = q.ack from lms_sis_grade_queue q
    where q.qid::text in (select jsonb_array_elements_text(a->'qids')) and q.status = 'sent' and f.section_id = q.section_id and f.person_id = q.person_id;
  end if;
  return jsonb_build_object('updated', n, '_audit', lms_x_audit('lms.h.queue_ack', jsonb_build_object('n', n, 'ok', okv)));
end $$;
-- 조건별 학생 자동 선택 · 안내 메시지 대기열
create or replace function lms_h_select(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_h_sec(a, 'section_id'); c jsonb := coalesce(a->'cond', '{}'); rows jsonb; below numeric := lms_x_num(coalesce(a->'cond', '{}'), 'total_below', 0, 100, null, '총점 기준');
begin
  perform lms_x_staff(ctx);
  select coalesce(jsonb_agg(jsonb_build_object('member_no', r->>'member_no', 'unit_code', r->'unit_code', 'total', r->'total', 'letter', r->'letter', 'missing', r->'missing')
      order by r->>'member_no'), '[]') into rows
  from jsonb_array_elements(lms_h_compute(sec)->'rows') r
  where (below is null or (r->>'total')::numeric < below)
    and (coalesce(jsonb_typeof(c->'letter_in'), '') <> 'array' or (c->'letter_in') ? (r->>'letter'))
    and (not lms_x_bool(c, 'missing_any', false) or (r->>'missing')::int > 0)
    and (nullif(c->>'missing_item', '') is null or not (r->'scores') ? (c->>'missing_item'))
    and (below is not null or coalesce(jsonb_typeof(c->'letter_in'), '') = 'array' or lms_x_bool(c, 'missing_any', false) or nullif(c->>'missing_item', '') is not null);
  return jsonb_build_object('targets', rows, 'n', jsonb_array_length(rows));
end $$;
create or replace function lms_h_message(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_h_sec(a, 'section_id'); ch text := coalesce(nullif(a->>'channel', ''), 'push'); tg jsonb; id bigint; bd text := lms_x_str(a, 'text', 1000, true, '메시지');
begin
  perform lms_x_staff(ctx);
  if ch not in ('push', 'email', 'sms', 'kakao') then perform lms_x_err(400, 'channel', '보낼 방법을 고르세요(push · email · sms · kakao).'); end if;
  if jsonb_typeof(a->'member_nos') <> 'array' or jsonb_array_length(a->'member_nos') = 0 then perform lms_x_err(400, 'targets', '받을 학생을 고르세요.'); end if;
  select coalesce(jsonb_agg(p.member_no order by p.member_no), '[]') into tg from lms_person p join lms_enrollment e on e.person_id = p.person_id and e.section_id = sec and e.status = 'enrolled'
  where p.member_no in (select jsonb_array_elements_text(a->'member_nos'));
  if jsonb_array_length(tg) = 0 then perform lms_x_err(400, 'targets', '이 분반 수강생이 아닙니다.'); end if;
  insert into lms_grade_msg_queue (tenant_id, section_id, channel, targets, body, by_person) values (lms_x_tid(), sec, ch, tg, bd, lms_x_uid(ctx)) returning mid into id;
  return jsonb_build_object('mid', id, 'n', jsonb_array_length(tg), 'status', 'queued', 'note', '연동 후 동작: 문자 · 메일 · 푸시 발송기가 대기열에서 가져가 보냅니다.',
    '_audit', lms_x_audit('lms.h.message', jsonb_build_object('section', sec, 'channel', ch, 'n', jsonb_array_length(tg))));
end $$;
-- 학습자 본인 성적(비공개 · 청강 처리)
create or replace function lms_h_my(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare pid uuid := lms_x_learner(ctx); sec uuid := lms_h_sec(a, 'section'); k text := lms_x_enr(sec, pid); p lms_grade_policy; r jsonb; f lms_grade_final;
begin
  if k is null then perform lms_x_err(403, 'not_enrolled', '수강 중인 분반이 아닙니다.'); end if;
  if k = 'audit' then return jsonb_build_object('audit', true, 'message', '청강생은 성적이 산출되지 않습니다.'); end if;
  p := lms_h_pol(sec);
  if lms_h_hidden(sec) then
    return jsonb_build_object('audit', false, 'hidden', true, 'message', '교수자가 성적 확정 전까지 점수를 비공개로 두었습니다.',
      'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'category', i.category, 'weight_pct', lms_x_n(i.weight_pct)) order by i.sort, i.name) from lms_grade_item i where i.section_id = sec), '[]'));
  end if;
  select x into r from jsonb_array_elements(lms_h_compute(sec)->'rows') x where x->>'person_id' = pid::text;
  select * into f from lms_grade_final where section_id = sec and person_id = pid;
  return jsonb_build_object('audit', false, 'hidden', false, 'status', p.status,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'category', i.category, 'weight_pct', lms_x_n(i.weight_pct), 'max_score', lms_x_n(i.max_score),
        'score', lms_x_n(s.score), 'feedback', s.feedback) order by i.sort, i.name) from lms_grade_item i left join lms_grade_score s on s.item_id = i.item_id and s.person_id = pid where i.section_id = sec), '[]'),
    'total', case when f.confirmed_at is not null then to_jsonb(lms_x_n(f.total)) else r->'total' end,
    'letter', case when f.confirmed_at is not null then f.letter else r->>'letter' end, 'confirmed', f.confirmed_at is not null);
end $$;
