'use strict';
/* v30 학사 LMS 묶음 G — 출결(인증번호 · 회전 QR · NFC · BLE · 사진 · 수동 · 온라인 인정 · 휴보강 · 장애 조정 · 연강 복사 · 학교 양식 · 비정상 학습행동)
   구조: 경로마다 선언(SPEC) — 권한 · 입력 검증 · SQL 문 이름 · 감사 · 제한. SQL은 응답 JSON까지 만들어 돌려준다(Node · Java가 같은 문장을 실행 → 같은 JSON).
   Java(전자정부 표준프레임워크) 쪽 lms_g.xml 매퍼는 이 파일의 SQL과 글자 그대로 같아야 한다(service-egov/test/lms-g.js가 확인).
   SQL 자리표시 #{이름}은 모두 문자열로 넘기고 SQL 안에서 cast(... as 형식)한다. */

/* ── 공용 실행기(묶음 G · I · J가 같이 쓴다) ── */
const ERR = {
  bad_input: [400, '입력값이 올바르지 않습니다.'], required: [400, '필수 입력값이 없습니다.'],
  not_found: [404, '대상을 찾을 수 없습니다.'], role: [403, '이 작업을 할 권한이 없습니다.'],
  holiday: [409, '휴강 차시입니다.'], not_enrolled: [403, '이 분반 수강생이 아닙니다.'], audit: [403, '청강생은 출석 대상이 아닙니다.'],
  method_off: [403, '이 분반에서 허용하지 않은 출석 방식입니다.'], no_time: [409, '차시 시작 시각이 정해지지 않았습니다.'],
  not_open: [409, '아직 출석 시간이 아닙니다.'], closed: [409, '출석 인정 시간이 지났습니다. 교수자에게 문의하세요.'],
  dup: [409, '이미 이 차시에 출석했습니다.'], idv_required: [428, '출석 전 본인 재인증이 필요합니다(SSO 재인증 연동 후 동작).'],
  no_code: [409, '발급된 인증번호가 없습니다.'], expired: [410, '인증번호 · QR이 만료되었습니다.'], bad_code: [400, '인증번호가 맞지 않습니다.'],
  bad_qr: [400, 'QR이 맞지 않거나 바뀌었습니다. 다시 촬영하세요.'], bad_tag: [400, '등록되지 않은 NFC 태그 · 비콘입니다.'],
  room_mismatch: [403, '이 차시 강의실의 태그 · 비콘이 아닙니다.'], need_geo: [400, '촬영 위치(위도 · 경도)가 필요합니다.'],
  need_reason: [400, '공결 · 조정에는 사유가 필요합니다.'], no_next: [404, '이어지는 연강 차시가 없습니다.'],
  concurrent: [409, '다른 기기 · 창에서 재생 중입니다. 동시 재생은 허용되지 않습니다.'], play_over: [409, '끝났거나 다른 재생으로 바뀐 재생입니다.'],
  bad_rate: [400, '배속은 1.0~2.0배만 허용됩니다.'], bad_sub: [400, '자막 파일 형식이 올바르지 않습니다(VTT · SRT).'],
  answered: [409, '이미 응답한 퀴즈입니다.'], bad_choice: [400, '보기 번호가 올바르지 않습니다.']
};
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const MNO = /^[A-Za-z0-9_-]{4,20}$/;
const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const INT = /^-?\d{1,9}$/; const NUM = /^-?\d{1,9}(\.\d{1,9})?$/;

function engine(ctx, SPEC, SQL) {
  const { pool, inTenant, need, readBody, HttpErr, audit, limit } = ctx;
  const bad = (code, extra) => { const e = ERR[code] || [400, '요청을 처리할 수 없습니다.']; return new HttpErr(e[0], e[1] + (extra ? ` (${extra})` : ''), code); };
  /* #{이름} → ($n::text) — 같은 이름은 같은 번호 */
  const compiled = {};
  for (const [k, s] of Object.entries(SQL)) { const names = []; const text = s.replace(/#\{(\w+)\}/g, (m, n) => { let i = names.indexOf(n); if (i < 0) { names.push(n); i = names.length - 1; } return `($${i + 1}::text)`; }); compiled[k] = { text, names }; }
  const hops = Math.max(0, Math.min(5, Number(process.env.TRUST_PROXY_HOPS == null ? 1 : process.env.TRUST_PROXY_HOPS)));
  const ipOf = req => { const L = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean); const v = (hops && L.length >= hops ? L[L.length - hops] : '') || String(req.socket.remoteAddress || ''); return v.replace(/^::ffff:/, ''); };
  /* 입력 하나 검증 — Java LmsEngine.param과 같은 규칙 */
  function param(src, isQuery, [name, type, req, a, b, def]) {
    let v = src[name];
    if (v === undefined || v === null || v === '') { if (req) throw bad('required', name); return def === undefined ? null : String(def); }
    if (type === 'uuid') { if (typeof v !== 'string' || !UUID.test(v)) throw bad('bad_input', name); return v.toLowerCase(); }
    if (type === 'mno') { if (typeof v !== 'string' || !MNO.test(v)) throw bad('bad_input', name); return v; }
    if (type === 'text') { if (typeof v !== 'string') throw bad('bad_input', name); v = v.trim(); if (!v) { if (req) throw bad('required', name); return def === undefined ? null : String(def); } if (v.length > a) throw bad('bad_input', name); return v; }
    if (type === 'enum') { if (typeof v !== 'string' || !a.includes(v)) throw bad('bad_input', name); return v; }
    if (type === 'ts') { if (typeof v !== 'string' || !TS.test(v)) throw bad('bad_input', name); return v; }
    if (type === 'int' || type === 'num') {
      let s; if (typeof v === 'number' && Number.isFinite(v)) s = String(v); else if (typeof v === 'string' && (isQuery || true)) s = v.trim(); else throw bad('bad_input', name);
      if (!(type === 'int' ? INT : NUM).test(s) && !(typeof v === 'number' && type === 'num')) throw bad('bad_input', name);
      const n = Number(s); if (type === 'int' && !Number.isInteger(n)) throw bad('bad_input', name);
      if (n < a || n > b) throw bad('bad_input', name); return type === 'int' ? String(n) : s;
    }
    if (type === 'bool') { if (v === true || v === 'true' || v === '1') return 'true'; if (v === false || v === 'false' || v === '0') return 'false'; throw bad('bad_input', name); }
    if (type === 'json') { if (typeof v !== 'object') throw bad('bad_input', name); const s = JSON.stringify(v); if (s.length > a) throw bad('bad_input', name); return s; }
    throw bad('bad_input', name);
  }
  const routes = {};
  for (const r of SPEC) {
    routes[`${r.m} ${r.p}`] = async (req) => {
      const a = await need(req);
      if (r.roles === 'staff' && !['owner', 'sub'].includes(a.role)) throw bad('role');
      const isQ = r.m === 'GET';
      const src = isQ ? Object.fromEntries(new URL(req.url, 'http://x').searchParams) : await readBody(req, r.max || 16384);
      if (!isQ && (typeof src !== 'object' || Array.isArray(src) || src === null)) throw bad('bad_input', 'body');
      const P = { _actor: a.email, _role: a.role, _ip: ipOf(req), _ua: String(req.headers['user-agent'] || '').slice(0, 200) || null };
      for (const d of r.params || []) P[d[0]] = param(src, isQ, d);
      if (r.limit) limit(`${r.limit[0]}:${a.uid}`, r.limit[1], r.limit[2]);
      return inTenant(pool, a.tid, async c => {
        let out = null;
        for (const st of r.stmts) {
          const q = compiled[st]; if (!q) throw new Error('SQL 없음: ' + st);
          const { rows } = await c.query(q.text, q.names.map(n => P[n] === undefined ? null : P[n]));
          const raw = rows[0] ? rows[0][Object.keys(rows[0])[0]] : null;
          out = raw == null ? null : JSON.parse(raw);
          if (out && typeof out === 'object' && !Array.isArray(out) && out.err) throw bad(out.err);
          if (out && typeof out === 'object' && !Array.isArray(out)) for (const [k, v] of Object.entries(out)) if (typeof v === 'string' && P['$' + k] === undefined) P['$' + k] = v;
        }
        if (r.audit) await audit(c, a.tid, a.email, r.audit, Object.fromEntries((r.params || []).filter(d => d[1] === 'uuid' || d[1] === 'mno' || d[1] === 'enum').map(d => [d[0], P[d[0]]])));
        return out;
      });
    };
  }
  return routes;
}

/* ── 묶음 G SQL ── (#{_ip} · #{_ua} · #{_actor}는 실행기가 넣는다) */
const DEV = `case when #{_ua} is null then 'unknown' when #{_ua} ~* '(ipad|tablet)' then 'tablet' when #{_ua} ~* '(mobi|android|iphone)' then 'mobile' else 'desktop' end`;
const IPM = `regexp_replace(coalesce(#{_ip}, ''), '[0-9a-fA-F]+$', '*')`;
const SQL = {
  seedTerm: `insert into lms_term (tenant_id, term_id, name, starts_on, ends_on, is_operating) values (current_setting('app.tenant'), '2026-2', '2026학년도 2학기', date '2026-09-01', date '2026-12-20', true) on conflict do nothing returning '{}'::text`,
  seedCourse: `insert into lms_course (tenant_id, course_code, name, credits, unit_code, category) values (current_setting('app.tenant'), 'DEMO1001', '데이터와 인공지능 기초', 3, 'CSE', 'major') on conflict do nothing returning '{}'::text`,
  seedPersons: `insert into lms_person (tenant_id, member_no, kind, unit_code, grade_year, source)
    select current_setting('app.tenant'), (20269000 + i)::text, 'student', (array['CSE','BIZ','EDU'])[1 + i % 3], 1 + i % 4, 'manual' from generate_series(1, 9) i
    on conflict (tenant_id, member_no) do nothing returning '{}'::text`,
  seedSection: `insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode, schedule, capacity, source)
    values (current_setting('app.tenant'), '2026-2', 'DEMO1001', '01', '데이터와 인공지능 기초 (01분반)', 'hyflex', '[{"day":"월","period":"1-2","room":"공학관 301"}]', 40, 'manual')
    on conflict (tenant_id, term_id, course_code, section_no) do nothing returning '{}'::text`,
  seedSessions: `with sec as (select section_id from lms_section where term_id = '2026-2' and course_code = 'DEMO1001' and section_no = '01'),
    w as (select g w, (timestamp '2026-09-07 09:00' + (g - 1) * interval '7 days') at time zone 'Asia/Seoul' t from generate_series(1, 15) g)
    insert into lms_session (tenant_id, section_id, week_no, seq, kind, starts_at, ends_at, open_at, close_at, room)
    select current_setting('app.tenant'), sec.section_id, w.w, x.seq, 'class', w.t + (x.seq - 1) * interval '90 minutes', w.t + (x.seq - 1) * interval '90 minutes' + interval '75 minutes', w.t, w.t + interval '7 days', '공학관 301'
    from sec, w, (values (1), (2)) x(seq) where x.seq = 1 or w.w = 10
    on conflict (tenant_id, section_id, week_no, seq) do nothing returning '{}'::text`,
  seedEnroll: `with sec as (select section_id from lms_section where term_id = '2026-2' and course_code = 'DEMO1001' and section_no = '01')
    insert into lms_enrollment (tenant_id, section_id, person_id, kind, source)
    select current_setting('app.tenant'), sec.section_id, p.person_id, case when p.member_no = '20269009' then 'audit' else 'regular' end, 'manual'
    from sec, lms_person p where p.member_no between '20269001' and '20269009'
    on conflict do nothing returning '{}'::text`,
  seedRule: `with sec as (select section_id from lms_section where term_id = '2026-2' and course_code = 'DEMO1001' and section_no = '01'),
    r as (insert into lms_attendance_rule (tenant_id, section_id, methods) select current_setting('app.tenant'), section_id, '{code,qr,nfc,ble,photo,online,manual}' from sec on conflict do nothing returning 1),
    b as (insert into lms_att_beacon (tenant_id, beacon_id, kind, room) values (current_setting('app.tenant'), 'NFC-ENG301', 'nfc', '공학관 301'), (current_setting('app.tenant'), 'BLE-ENG301', 'ble', '공학관 301') on conflict do nothing returning 1)
    select json_build_object('section_id', sec.section_id, 'sessions', (select count(*) from lms_session s where s.section_id = sec.section_id), 'students', (select count(*) from lms_enrollment e where e.section_id = sec.section_id and e.kind = 'regular'), 'rule', (select count(*) from r), 'beacons', (select count(*) from b))::text from sec`,

  sections: `select coalesce(json_agg(x order by x.term_id desc, x.course_code, x.section_no), '[]')::text from (
    select s.section_id, s.term_id, s.course_code, s.section_no, s.title, s.mode, (select count(*) from lms_enrollment e where e.section_id = s.section_id and e.status = 'enrolled' and e.kind = 'regular')::int students
    from lms_section s where s.status in ('open','closed')) x`,
  sessions: `select coalesce(json_agg(json_build_object('session_id', s.session_id, 'week_no', s.week_no, 'seq', s.seq, 'kind', s.kind, 'starts_at', lms_ts(s.starts_at), 'ends_at', lms_ts(s.ends_at), 'open_at', lms_ts(s.open_at), 'close_at', lms_ts(s.close_at), 'room', s.room, 'makeup_of', s.makeup_of, 'note', s.note, 'required_sec', s.required_sec, 'extra_study_sec', s.extra_study_sec) order by s.week_no, s.seq), '[]')::text
    from lms_session s where s.section_id = cast(#{section_id} as uuid)`,
  sessionSet: `with u as (update lms_session set starts_at = coalesce(cast(#{starts_at} as timestamptz), starts_at), ends_at = coalesce(cast(#{ends_at} as timestamptz), ends_at),
      open_at = coalesce(cast(#{open_at} as timestamptz), open_at), close_at = coalesce(cast(#{close_at} as timestamptz), close_at), room = coalesce(#{room}, room),
      kind = coalesce(#{kind}, kind), note = coalesce(#{note}, note), required_sec = coalesce(cast(#{required_sec} as int), required_sec), extra_study_sec = coalesce(cast(#{extra_study_sec} as int), extra_study_sec)
      where session_id = cast(#{session_id} as uuid) returning *)
    select coalesce((select json_build_object('session_id', session_id, 'week_no', week_no, 'seq', seq, 'kind', kind, 'starts_at', lms_ts(starts_at), 'ends_at', lms_ts(ends_at), 'open_at', lms_ts(open_at), 'close_at', lms_ts(close_at), 'room', room, 'note', note, 'required_sec', required_sec, 'extra_study_sec', extra_study_sec)::text from u), '{"err":"not_found"}')`,
  makeup: `with o as (select * from lms_session where session_id = cast(#{session_id} as uuid)),
    n as (insert into lms_session (tenant_id, section_id, week_no, seq, kind, starts_at, ends_at, open_at, close_at, room, makeup_of, note)
      select current_setting('app.tenant'), o.section_id, o.week_no, (select max(seq) + 1 from lms_session x where x.section_id = o.section_id and x.week_no = o.week_no), 'class',
        cast(#{starts_at} as timestamptz), cast(#{starts_at} as timestamptz) + coalesce(o.ends_at - o.starts_at, interval '75 minutes'), cast(#{starts_at} as timestamptz), cast(#{starts_at} as timestamptz) + interval '7 days', coalesce(#{room}, o.room), o.session_id, '보강'
      from o returning *)
    select coalesce((select json_build_object('session_id', session_id, 'week_no', week_no, 'seq', seq, 'kind', kind, 'starts_at', lms_ts(starts_at), 'room', room, 'makeup_of', makeup_of)::text from n), '{"err":"not_found"}')`,
  ruleGet: `select case when not exists (select 1 from lms_section where section_id = cast(#{section_id} as uuid)) then '{"err":"not_found"}' else (
    select json_build_object('section_id', cast(#{section_id} as uuid), 'methods', coalesce(to_json(r.methods), '["code","qr","nfc","ble","photo","online","manual"]'::json), 'late_after_min', coalesce(r.late_after_min, 10), 'absent_after_min', coalesce(r.absent_after_min, 30),
      'online_min_pct', coalesce(r.online_min_pct, 90), 'require_identity', coalesce(r.require_identity, false), 'block_concurrent', coalesce(r.block_concurrent, true), 'hyflex_online', coalesce(r.hyflex_online, true))::text
    from (select 1) k left join lms_attendance_rule r on r.section_id = cast(#{section_id} as uuid)) end`,
  ruleSet: `insert into lms_attendance_rule (tenant_id, section_id, methods, late_after_min, absent_after_min, online_min_pct, require_identity, block_concurrent, hyflex_online, updated_at)
    select current_setting('app.tenant'), s.section_id,
      coalesce((select array_agg(distinct m order by m) from jsonb_array_elements_text(cast(#{methods} as jsonb)) m where m in ('code','qr','nfc','ble','photo','online','manual')), '{code,qr,nfc,ble,photo,online,manual}'),
      coalesce(cast(#{late_after_min} as int), 10), coalesce(cast(#{absent_after_min} as int), 30), coalesce(cast(#{online_min_pct} as int), 90),
      coalesce(cast(#{require_identity} as boolean), false), coalesce(cast(#{block_concurrent} as boolean), true), coalesce(cast(#{hyflex_online} as boolean), true), now()
    from lms_section s where s.section_id = cast(#{section_id} as uuid)
    on conflict (tenant_id, section_id) do update set methods = excluded.methods, late_after_min = excluded.late_after_min, absent_after_min = excluded.absent_after_min, online_min_pct = excluded.online_min_pct,
      require_identity = excluded.require_identity, block_concurrent = excluded.block_concurrent, hyflex_online = excluded.hyflex_online, updated_at = now()
    returning json_build_object('section_id', section_id, 'methods', to_json(methods), 'late_after_min', late_after_min, 'absent_after_min', absent_after_min, 'online_min_pct', online_min_pct, 'require_identity', require_identity, 'block_concurrent', block_concurrent, 'hyflex_online', hyflex_online)::text`,
  ruleCheck: `select case when exists (select 1 from lms_section where section_id = cast(#{section_id} as uuid)) then '{}' else '{"err":"not_found"}' end`,

  /* 인증번호(6자리, 서버 난수 · 해시 저장) + 회전 QR 비밀 */
  codeIssue: `with s as (select session_id, kind from lms_session where session_id = cast(#{session_id} as uuid)),
    g as (select lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int) % 1000000)::text, 6, '0') code, md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text) sec),
    up as (insert into lms_attendance_code (tenant_id, session_id, code_hash, expires_at, qr_secret, rotate_sec, issued_at)
      select current_setting('app.tenant'), s.session_id, encode(sha256(convert_to(current_setting('app.tenant') || '|' || s.session_id::text || '|' || g.code, 'UTF8')), 'hex'),
        now() + make_interval(secs => cast(#{ttl_sec} as int)), g.sec, cast(#{rotate_sec} as int), now() from s, g where s.kind <> 'holiday'
      on conflict (tenant_id, session_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, qr_secret = excluded.qr_secret, rotate_sec = excluded.rotate_sec, issued_at = now()
      returning session_id, expires_at, qr_secret, rotate_sec)
    select case when not exists (select 1 from s) then '{"err":"not_found"}' when not exists (select 1 from up) then '{"err":"holiday"}' else (
      select json_build_object('session_id', up.session_id, 'code', g.code, 'expires_at', lms_ts(up.expires_at), 'ttl_sec', cast(#{ttl_sec} as int), 'rotate_sec', up.rotate_sec,
        'qr', 'DDATT1.' || up.session_id || '.' || k.slot || '.' || substr(encode(sha256(convert_to(up.qr_secret || '|' || k.slot, 'UTF8')), 'hex'), 1, 12))::text
      from up, g, lateral (select floor(extract(epoch from now()) / up.rotate_sec)::bigint slot) k) end`,
  qr: `select coalesce((select case when c.expires_at < now() then '{"err":"expired"}' else json_build_object('session_id', c.session_id, 'expires_at', lms_ts(c.expires_at), 'rotate_sec', c.rotate_sec,
      'qr', 'DDATT1.' || c.session_id || '.' || k.slot || '.' || substr(encode(sha256(convert_to(c.qr_secret || '|' || k.slot, 'UTF8')), 'hex'), 1, 12), 'next_at', lms_ts(to_timestamp((k.slot + 1) * c.rotate_sec)))::text end
    from lms_attendance_code c, lateral (select floor(extract(epoch from now()) / c.rotate_sec)::bigint slot) k where c.session_id = cast(#{session_id} as uuid)), '{"err":"no_code"}')`,

  /* 학생 출석 — 시간 창 · 수강 · 방식 · 중복 · 본인 재인증 · 코드/QR/태그/위치 검증 후 1회만 기록 */
  checkin: `with s as (select ss.session_id, ss.section_id, ss.kind, ss.starts_at, ss.room, r.methods, coalesce(r.late_after_min, 10) late_min, coalesce(r.absent_after_min, 30) absent_min, coalesce(r.require_identity, false) need_idv
      from lms_session ss left join lms_attendance_rule r on r.section_id = ss.section_id where ss.session_id = cast(#{session_id} as uuid)),
    p as (select pe.person_id, e.kind ekind, e.status estatus from lms_person pe left join lms_enrollment e on e.person_id = pe.person_id and e.section_id = (select section_id from s) where pe.member_no = #{member_no}),
    c as (select *, floor(extract(epoch from now()) / rotate_sec)::bigint slot from lms_attendance_code where session_id = cast(#{session_id} as uuid)),
    b as (select * from lms_att_beacon where beacon_id = #{tag_id} and active),
    v as (select s.*, p.person_id, c.expires_at, c.code_hash, c.slot, c.qr_secret, b.kind bkind, b.room broom, case
      when s.session_id is null then 'not_found'
      when s.kind = 'holiday' then 'holiday'
      when p.person_id is null or p.estatus is distinct from 'enrolled' then 'not_enrolled'
      when p.ekind = 'audit' then 'audit'
      when s.methods is not null and not (#{method} = any(s.methods)) then 'method_off'
      when s.starts_at is null then 'no_time'
      when now() < s.starts_at - interval '10 minutes' then 'not_open'
      when now() > s.starts_at + make_interval(mins => s.absent_min) then 'closed'
      when exists (select 1 from lms_attendance a where a.session_id = s.session_id and a.person_id = p.person_id) then 'dup'
      when s.need_idv and #{idv} is null then 'idv_required'
      when #{method} in ('code', 'qr') and c.session_id is null then 'no_code'
      when #{method} in ('code', 'qr') and c.expires_at < now() then 'expired'
      when #{method} = 'code' and c.code_hash <> encode(sha256(convert_to(current_setting('app.tenant') || '|' || s.session_id::text || '|' || coalesce(#{code}, ''), 'UTF8')), 'hex') then 'bad_code'
      when #{method} = 'qr' and coalesce(#{qr}, '') not in ('DDATT1.' || s.session_id || '.' || c.slot || '.' || substr(encode(sha256(convert_to(c.qr_secret || '|' || c.slot, 'UTF8')), 'hex'), 1, 12),
        'DDATT1.' || s.session_id || '.' || (c.slot - 1) || '.' || substr(encode(sha256(convert_to(c.qr_secret || '|' || (c.slot - 1), 'UTF8')), 'hex'), 1, 12)) then 'bad_qr'
      when #{method} in ('nfc', 'ble') and (b.beacon_id is null or b.kind <> #{method}) then 'bad_tag'
      when #{method} in ('nfc', 'ble') and b.room is distinct from s.room then 'room_mismatch'
      when #{method} = 'photo' and (#{lat} is null or #{lng} is null) then 'need_geo'
      else 'ok' end r
      from (select 1) k left join s on true left join p on true left join c on true left join b on true),
    ins as (insert into lms_attendance (tenant_id, session_id, person_id, status, method, evidence)
      select current_setting('app.tenant'), v.session_id, v.person_id, case when now() > v.starts_at + make_interval(mins => v.late_min) then 'late' else 'present' end, #{method},
        jsonb_strip_nulls(jsonb_build_object('at', lms_ts(now()), 'ip', ${IPM}, 'device', ${DEV}, 'room', case when #{method} in ('nfc','ble') then v.broom end, 'tag', case when #{method} in ('nfc','ble') then #{tag_id} end,
          'lat', round(cast(#{lat} as numeric), 5), 'lng', round(cast(#{lng} as numeric), 5), 'taken_at', lms_ts(cast(#{taken_at} as timestamptz)), 'idv', case when #{idv} is not null then 'sso_pending' end))
      from v where v.r = 'ok' on conflict do nothing returning *)
    select case when (select r from v) <> 'ok' then json_build_object('err', (select r from v))::text when not exists (select 1 from ins) then '{"err":"dup"}' else (
      select json_build_object('session_id', session_id, 'member_no', #{member_no}, 'status', status, 'method', method, 'evidence', evidence)::text from ins) end`,

  /* 교수 수동 출결(출석 · 지각 · 결석 · 공결 + 사유 · 증빙) */
  mark: `with s as (select session_id, section_id from lms_session where session_id = cast(#{session_id} as uuid)),
    p as (select pe.person_id, e.kind, e.status from lms_person pe join lms_enrollment e on e.person_id = pe.person_id and e.section_id = (select section_id from s) where pe.member_no = #{member_no}),
    old as (select a.status from lms_attendance a, p where a.session_id = cast(#{session_id} as uuid) and a.person_id = p.person_id),
    v as (select case when not exists (select 1 from s) then 'not_found' when not exists (select 1 from p where status = 'enrolled') then 'not_enrolled' when (select kind from p) = 'audit' then 'audit'
      when #{status} = 'excused' and #{reason} is null then 'need_reason' else 'ok' end r),
    up as (insert into lms_attendance (tenant_id, session_id, person_id, status, method, evidence, reason, decided_at)
      select current_setting('app.tenant'), cast(#{session_id} as uuid), p.person_id, #{status}, 'manual', jsonb_strip_nulls(jsonb_build_object('by', #{_actor}, 'ref', #{evidence_ref}, 'at', lms_ts(now()))), #{reason}, now() from p, v where v.r = 'ok'
      on conflict (tenant_id, session_id, person_id) do update set status = excluded.status, method = 'manual', evidence = lms_attendance.evidence || excluded.evidence, reason = coalesce(excluded.reason, lms_attendance.reason), decided_at = now()
      returning *),
    lg as (insert into lms_attendance_log (tenant_id, session_id, person_id, before, after, reason, actor) select current_setting('app.tenant'), up.session_id, up.person_id, (select status from old), up.status, #{reason}, #{_actor} from up returning 1)
    select case when (select r from v) <> 'ok' then json_build_object('err', (select r from v))::text else (select json_build_object('session_id', up.session_id, 'member_no', #{member_no}, 'status', up.status, 'method', up.method, 'reason', up.reason, 'before', (select status from old), 'logged', (select count(*) from lg))::text from up) end`,

  /* 장애 시 일괄 조정(예: 인증 서버 장애로 결석 처리된 학생 → 출석) — 미기록은 결석으로 본다 */
  adjust: `with s as (select session_id, section_id from lms_session where session_id = cast(#{session_id} as uuid)),
    t as (select pe.person_id, a.status from s join lms_enrollment e on e.section_id = s.section_id and e.status = 'enrolled' and e.kind = 'regular' join lms_person pe on pe.person_id = e.person_id
      left join lms_attendance a on a.session_id = s.session_id and a.person_id = pe.person_id where coalesce(a.status, 'absent') = #{from}),
    up as (insert into lms_attendance (tenant_id, session_id, person_id, status, method, evidence, reason, decided_at)
      select current_setting('app.tenant'), cast(#{session_id} as uuid), t.person_id, #{to}, 'adjust', jsonb_build_object('by', #{_actor}, 'at', lms_ts(now())), #{reason}, now() from t
      on conflict (tenant_id, session_id, person_id) do update set status = excluded.status, method = 'adjust', reason = excluded.reason, evidence = lms_attendance.evidence || excluded.evidence, decided_at = now() returning person_id),
    lg as (insert into lms_attendance_log (tenant_id, session_id, person_id, before, after, reason, actor) select current_setting('app.tenant'), cast(#{session_id} as uuid), t.person_id, t.status, #{to}, #{reason}, #{_actor} from t returning 1)
    select case when not exists (select 1 from s) then '{"err":"not_found"}' else json_build_object('session_id', cast(#{session_id} as uuid), 'from', #{from}, 'to', #{to}, 'changed', (select count(*) from up), 'logged', (select count(*) from lg))::text end`,

  /* 연강 자동 복사: 같은 날 바로 이어지는 차시(3시간 안)에 출결 복사 */
  copy: `with s as (select * from lms_session where session_id = cast(#{session_id} as uuid)),
    n as (select x.* from lms_session x, s where x.section_id = s.section_id and x.session_id <> s.session_id and x.kind <> 'holiday' and x.starts_at > s.starts_at and x.starts_at <= coalesce(s.ends_at, s.starts_at) + interval '3 hours'
      and (x.starts_at at time zone 'Asia/Seoul')::date = (s.starts_at at time zone 'Asia/Seoul')::date order by x.starts_at limit 1),
    up as (insert into lms_attendance (tenant_id, session_id, person_id, status, method, evidence, reason)
      select current_setting('app.tenant'), n.session_id, a.person_id, a.status, 'copy', jsonb_build_object('from', a.session_id, 'by', #{_actor}), a.reason from n, lms_attendance a where a.session_id = cast(#{session_id} as uuid)
      on conflict do nothing returning 1)
    select case when not exists (select 1 from s) then '{"err":"not_found"}' when not exists (select 1 from n) then '{"err":"no_next"}' else json_build_object('source_session_id', cast(#{session_id} as uuid), 'target_session_id', (select session_id from n), 'week_no', (select week_no from n), 'seq', (select seq from n), 'copied', (select count(*) from up))::text end`,

  /* 온라인 출석 인정: 진도율 기준 + 주차 학습 기간 안 완료. 오프라인 · 수동 기록이 있으면 그대로 두고(우선), 없을 때만 online으로 넣는다. 하이플렉스 분반은 대면 차시도 온라인 인정 */
  online: `with sec as (select s.section_id, s.mode, coalesce(r.online_min_pct, 90) minp, coalesce(r.hyflex_online, true) hy from lms_section s left join lms_attendance_rule r on r.section_id = s.section_id where s.section_id = cast(#{section_id} as uuid)),
    ss as (select x.* from lms_session x, sec where x.section_id = sec.section_id and x.kind <> 'holiday' and (x.kind = 'online' or (sec.mode in ('hyflex','blended') and sec.hy and x.kind in ('class','live')))
      and exists (select 1 from lms_content ct where ct.session_id = x.session_id)),
    st as (select e.person_id from lms_enrollment e, sec where e.section_id = sec.section_id and e.status = 'enrolled' and e.kind = 'regular'),
    calc as (select ss.session_id, ss.open_at, ss.close_at, st.person_id,
        round(100.0 * sum(least(coalesce(pg.watched_sec, 0), ct.duration_sec)) / greatest(sum(ct.duration_sec), 1))::int pct,
        bool_and(pg.completed_at is not null) all_done, max(pg.completed_at) done_at, sum(least(coalesce(pg.watched_sec, 0), ct.duration_sec))::int sec
      from ss cross join st join lms_content ct on ct.session_id = ss.session_id left join lms_progress pg on pg.content_id = ct.content_id and pg.person_id = st.person_id
      group by ss.session_id, ss.open_at, ss.close_at, st.person_id),
    dec as (select calc.*, case when pct >= (select minp from sec) and all_done and (open_at is null or done_at >= open_at) and (close_at is null or done_at <= close_at) then 'present'
        when close_at is not null and close_at < now() then 'absent' end st from calc),
    up as (insert into lms_attendance (tenant_id, session_id, person_id, status, method, evidence, online_sec)
      select current_setting('app.tenant'), session_id, person_id, st, 'online', jsonb_build_object('pct', pct, 'done_at', lms_ts(done_at)), sec from dec where st is not null
      on conflict (tenant_id, session_id, person_id) do update set status = excluded.status, evidence = excluded.evidence, online_sec = excluded.online_sec, decided_at = now() where lms_attendance.method = 'online'
      returning status)
    select case when not exists (select 1 from sec) then '{"err":"not_found"}' else json_build_object('section_id', cast(#{section_id} as uuid), 'sessions', (select count(*) from ss),
      'present', (select count(*) from up where status = 'present'), 'absent', (select count(*) from up where status = 'absent'), 'kept_offline', (select count(*) from dec where st is not null) - (select count(*) from up))::text end`,

  roster: `with sec as (select * from lms_section where section_id = cast(#{section_id} as uuid)),
    ss as (select s.* from lms_session s join sec on s.section_id = sec.section_id),
    st as (select pe.person_id, pe.member_no, pe.unit_code, pe.grade_year from lms_enrollment e join sec on e.section_id = sec.section_id join lms_person pe on pe.person_id = e.person_id where e.status = 'enrolled' and e.kind = 'regular'),
    cl as (select st.person_id, ss.session_id, ss.week_no, ss.seq, ss.kind, ss.starts_at, a.status, a.method, a.reason from st cross join ss left join lms_attendance a on a.session_id = ss.session_id and a.person_id = st.person_id)
    select case when not exists (select 1 from sec) then '{"err":"not_found"}' else json_build_object(
      'section', (select json_build_object('section_id', section_id, 'term_id', term_id, 'course_code', course_code, 'section_no', section_no, 'title', title, 'mode', mode) from sec),
      'sessions', coalesce((select json_agg(json_build_object('session_id', session_id, 'week_no', week_no, 'seq', seq, 'kind', kind, 'starts_at', lms_ts(starts_at), 'room', room, 'makeup_of', makeup_of) order by week_no, seq) from ss), '[]'),
      'students', coalesce((select json_agg(x order by x.member_no) from (select st.member_no, st.unit_code, st.grade_year,
          (select json_agg(c.status order by c.week_no, c.seq) from cl c where c.person_id = st.person_id) cells,
          (select json_agg(c.method order by c.week_no, c.seq) from cl c where c.person_id = st.person_id) methods,
          (select json_build_object('present', count(*) filter (where status = 'present'), 'late', count(*) filter (where status = 'late'), 'absent', count(*) filter (where status = 'absent'),
            'excused', count(*) filter (where status = 'excused'), 'unrecorded', count(*) filter (where status is null and kind <> 'holiday' and starts_at <= now()), 'past', count(*) filter (where kind <> 'holiday' and starts_at <= now()))
            from cl c where c.person_id = st.person_id) sum from st) x), '[]'),
      'audit_excluded', (select count(*) from lms_enrollment e join sec on e.section_id = sec.section_id where e.kind = 'audit' and e.status = 'enrolled'))::text end`,

  /* 학교 출석부 양식: ○ 출석 · △ 지각 · × 결석 · ◎ 공결 · 휴 휴강, 지각 3회 = 결석 1회 환산 */
  export: `with sec as (select * from lms_section where section_id = cast(#{section_id} as uuid)),
    ss as (select s.* from lms_session s join sec on s.section_id = sec.section_id),
    st as (select pe.person_id, pe.member_no, pe.unit_code from lms_enrollment e join sec on e.section_id = sec.section_id join lms_person pe on pe.person_id = e.person_id where e.status = 'enrolled' and e.kind = 'regular'),
    cl as (select st.person_id, ss.week_no, ss.seq, ss.kind, ss.starts_at, a.status from st cross join ss left join lms_attendance a on a.session_id = ss.session_id and a.person_id = st.person_id),
    agg as (select person_id, count(*) filter (where status = 'present') p, count(*) filter (where status = 'late') l, count(*) filter (where status = 'absent' or (status is null and kind <> 'holiday' and starts_at <= now())) ab,
      count(*) filter (where status = 'excused') e, count(*) filter (where kind <> 'holiday' and starts_at <= now()) past from cl group by person_id)
    select case when not exists (select 1 from sec) then '{"err":"not_found"}' else json_build_object(
      'filename', (select '출석부_' || course_code || '-' || section_no || '_' || term_id from sec),
      'title', (select title || ' 출석부 (' || term_id || ')' from sec),
      'legend', '○ 출석 · △ 지각 · × 결석 · ◎ 공결 · 휴 휴강 · 지각 3회 = 결석 1회',
      'columns', (select json_agg(c) from (select '학번' c, 0 o, 0 o2 union all select '학과', 0, 1 union all select week_no || '주' || seq || '차', week_no, seq + 1 from ss union all select x, 99, n from unnest(array['출석','지각','결석','공결','결석환산','출석률(%)']) with ordinality u(x, n) order by o, o2) cc),
      'rows', coalesce((select json_agg(r order by m) from (select st.member_no m, (select json_agg(v) from (select st.member_no v, 0 o, 0 o2 union all select coalesce(st.unit_code, ''), 0, 1
          union all select case c.status when 'present' then '○' when 'late' then '△' when 'absent' then '×' when 'excused' then '◎' else case when c.kind = 'holiday' then '휴' else '' end end, c.week_no, c.seq + 1 from cl c where c.person_id = st.person_id
          union all select x, 99, n from agg, unnest(array[agg.p::text, agg.l::text, agg.ab::text, agg.e::text, (agg.ab + agg.l / 3)::text, (case when agg.past = 0 then 100 else round(100.0 * (agg.p + agg.l + agg.e) / agg.past) end)::int::text]) with ordinality u(x, n) where agg.person_id = st.person_id
          order by o, o2) vv) r from st) rr), '[]'))::text end`,

  beacons: `select coalesce(json_agg(json_build_object('beacon_id', beacon_id, 'kind', kind, 'room', room, 'active', active) order by beacon_id), '[]')::text from lms_att_beacon`,
  beaconSet: `insert into lms_att_beacon (tenant_id, beacon_id, kind, room, active) values (current_setting('app.tenant'), #{beacon_id}, #{kind}, #{room}, cast(#{active} as boolean))
    on conflict (tenant_id, beacon_id) do update set kind = excluded.kind, room = excluded.room, active = excluded.active returning json_build_object('beacon_id', beacon_id, 'kind', kind, 'room', room, 'active', active)::text`,

  /* 비정상 학습행동: 진도 체크 지점 전 배속(>1.0) · 앞으로 건너뛰기(10초 초과) · 동시 재생 차단/겹친 재생 */
  anomalies: `with sec as (select section_id from lms_section where section_id = cast(#{section_id} as uuid)),
    ct as (select c.content_id, c.title, c.duration_sec, coalesce(c.check_at_sec, c.duration_sec) chk, s.week_no from lms_content c join lms_session s on s.session_id = c.session_id join sec on s.section_id = sec.section_id),
    ev as (select e.person_id, ct.content_id, ct.title, ct.week_no, case when e.kind = 'rate' and e.rate_x100 > 100 and coalesce(e.pos, 0) < ct.chk then 'speed_before_check'
        when e.kind = 'seek' and e.pos - e.from_pos > 10 and e.from_pos < ct.chk then 'skip' when e.kind = 'blocked' then 'concurrent' end k, e.at
      from lms_play_event e join ct on ct.content_id = e.content_id where e.kind in ('rate','seek','blocked')),
    ov as (select a.person_id, ct.content_id, ct.title, ct.week_no, 'concurrent' k, b.started_at at from lms_play a join lms_play b on b.person_id = a.person_id and b.play_id <> a.play_id and b.started_at > a.started_at
        and b.started_at < coalesce(a.ended_at, a.last_beat_at) join ct on ct.content_id = b.content_id),
    al as (select * from ev where k is not null union all select * from ov)
    select case when not exists (select 1 from sec) then '{"err":"not_found"}' else coalesce((select json_agg(x order by x.last_at desc, x.member_no, x.kind) from (
      select p.member_no, p.unit_code, al.title content_title, al.week_no, al.k kind, count(*)::int n, lms_ts(max(al.at)) last_at from al join lms_person p on p.person_id = al.person_id
      group by p.member_no, p.unit_code, al.title, al.week_no, al.k limit 500) x), '[]')::text end`,
  log: `select coalesce(json_agg(json_build_object('member_no', p.member_no, 'before', l.before, 'after', l.after, 'reason', l.reason, 'actor', l.actor, 'at', lms_ts(l.at)) order by l.at desc, p.member_no), '[]')::text
    from lms_attendance_log l join lms_person p on p.person_id = l.person_id where l.session_id = cast(#{session_id} as uuid)`
};

const ST = ['present', 'late', 'absent', 'excused'];
const SPEC = [
  { m: 'POST', p: '/api/lms/g/seed', roles: 'staff', stmts: ['seedTerm', 'seedCourse', 'seedPersons', 'seedSection', 'seedSessions', 'seedEnroll', 'seedRule'], audit: 'lms.g.seed' },
  { m: 'GET', p: '/api/lms/g/sections', stmts: ['sections'] },
  { m: 'GET', p: '/api/lms/g/sessions', params: [['section_id', 'uuid', 1]], stmts: ['sessions'] },
  { m: 'POST', p: '/api/lms/g/session', params: [['session_id', 'uuid', 1], ['starts_at', 'ts'], ['ends_at', 'ts'], ['open_at', 'ts'], ['close_at', 'ts'], ['room', 'text', 0, 60], ['kind', 'enum', 0, ['class', 'online', 'live', 'exam', 'holiday']], ['note', 'text', 0, 200], ['required_sec', 'int', 0, 0, 36000], ['extra_study_sec', 'int', 0, 0, 36000]], stmts: ['sessionSet'], audit: 'lms.g.session' },
  { m: 'POST', p: '/api/lms/g/makeup', params: [['session_id', 'uuid', 1], ['starts_at', 'ts', 1], ['room', 'text', 0, 60]], stmts: ['makeup'], audit: 'lms.g.makeup' },
  { m: 'GET', p: '/api/lms/g/rule', params: [['section_id', 'uuid', 1]], stmts: ['ruleGet'] },
  { m: 'POST', p: '/api/lms/g/rule', params: [['section_id', 'uuid', 1], ['methods', 'json', 0, 400], ['late_after_min', 'int', 0, 0, 120], ['absent_after_min', 'int', 0, 0, 240], ['online_min_pct', 'int', 0, 10, 100], ['require_identity', 'bool'], ['block_concurrent', 'bool'], ['hyflex_online', 'bool']], stmts: ['ruleCheck', 'ruleSet'], audit: 'lms.g.rule' },
  { m: 'POST', p: '/api/lms/g/code', params: [['session_id', 'uuid', 1], ['ttl_sec', 'int', 0, 30, 900, 180], ['rotate_sec', 'int', 0, 10, 60, 15]], stmts: ['codeIssue'], audit: 'lms.g.code' },
  { m: 'GET', p: '/api/lms/g/qr', params: [['session_id', 'uuid', 1]], stmts: ['qr'] },
  { m: 'POST', p: '/api/lms/g/checkin', limit: ['lmsg-ck', 60, 60000], params: [['session_id', 'uuid', 1], ['member_no', 'mno', 1], ['method', 'enum', 1, ['code', 'qr', 'nfc', 'ble', 'photo']], ['code', 'text', 0, 12], ['qr', 'text', 0, 200], ['tag_id', 'text', 0, 64], ['lat', 'num', 0, -90, 90], ['lng', 'num', 0, -180, 180], ['taken_at', 'ts'], ['idv', 'text', 0, 200]], stmts: ['checkin'], audit: 'lms.g.checkin' },
  { m: 'POST', p: '/api/lms/g/mark', params: [['session_id', 'uuid', 1], ['member_no', 'mno', 1], ['status', 'enum', 1, ST], ['reason', 'text', 0, 300], ['evidence_ref', 'text', 0, 200]], stmts: ['mark'], audit: 'lms.g.mark' },
  { m: 'POST', p: '/api/lms/g/adjust', params: [['session_id', 'uuid', 1], ['from', 'enum', 1, ['absent', 'late']], ['to', 'enum', 1, ['present', 'late', 'excused']], ['reason', 'text', 1, 300]], stmts: ['adjust'], audit: 'lms.g.adjust' },
  { m: 'POST', p: '/api/lms/g/copy', params: [['session_id', 'uuid', 1]], stmts: ['copy'], audit: 'lms.g.copy' },
  { m: 'POST', p: '/api/lms/g/online', params: [['section_id', 'uuid', 1]], stmts: ['online'], audit: 'lms.g.online' },
  { m: 'GET', p: '/api/lms/g/roster', params: [['section_id', 'uuid', 1]], stmts: ['roster'] },
  { m: 'GET', p: '/api/lms/g/export', params: [['section_id', 'uuid', 1]], stmts: ['export'] },
  { m: 'GET', p: '/api/lms/g/beacons', stmts: ['beacons'] },
  { m: 'POST', p: '/api/lms/g/beacon', roles: 'staff', params: [['beacon_id', 'text', 1, 64], ['kind', 'enum', 1, ['nfc', 'ble']], ['room', 'text', 1, 60], ['active', 'bool', 0, 0, 0, 'true']], stmts: ['beaconSet'], audit: 'lms.g.beacon' },
  { m: 'GET', p: '/api/lms/g/anomalies', params: [['section_id', 'uuid', 1]], stmts: ['anomalies'] },
  { m: 'GET', p: '/api/lms/g/log', params: [['session_id', 'uuid', 1]], stmts: ['log'] }
];

module.exports = ctx => engine(ctx, SPEC, SQL);
module.exports.engine = engine;
module.exports.ERR = ERR;
module.exports.SPEC = SPEC;
module.exports.SQL = SQL;
