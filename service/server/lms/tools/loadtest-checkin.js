#!/usr/bin/env node
'use strict';
/* 출석 피크 부하 시험(PER-001 · 002 · QUR-001) — 한 차시에 N명이 앱 출석(POST /api/lms/p/att/checkin)을 동시에 보낸다.
   준비(시험 전용 기관): 가입 → 구성원 N · 수강 · 학습자 세션을 DB에 직접 만든다(학번 9자리 가명) → 출석 코드 발급(API) → 동시성 C로 발사.
   결과: 성공 · 실패 · 지연(p50 · p95 · p99 · 최대) · 처리량 · 3초 이내 비율 → POST /api/lms/p/perf/save 로 기관에 남기고 JSON 출력.
   사용: DATABASE_URL=postgres://… node loadtest-checkin.js http://127.0.0.1:8241 [N=3000] [C=300]
   2코어 공유 장비에서는 flock /tmp/lms-heavy.lock 으로 감싸 실행한다. */
const crypto = require('node:crypto'); const path = require('node:path');
let pg; try { pg = require('pg'); } catch { pg = require(path.join(__dirname, '../../node_modules/pg')); }
const [U = 'http://127.0.0.1:8241', N0 = '3000', C0 = '300'] = process.argv.slice(2); const N = +N0, C = +C0;
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const http = require('node:http'); const agent = new http.Agent({ keepAlive: true, maxSockets: C });
function post(p, body, cookie) { return new Promise((ok) => { const b = Buffer.from(JSON.stringify(body)); const u = new URL(U + p); const t0 = process.hrtime.bigint();
  const rq = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': b.length, 'x-didisam': '1', cookie } }, rs => { const ch = []; rs.on('data', c => ch.push(c)); rs.on('end', () => ok({ st: rs.statusCode, ms: Number(process.hrtime.bigint() - t0) / 1e6, body: Buffer.concat(ch).toString() })); });
  rq.on('error', e => ok({ st: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6, body: e.message })); rq.end(b); }); }
(async () => {
  const su = await fetch(U + '/api/signup', { method: 'POST', headers: { 'content-type': 'application/json', 'x-didisam': '1' }, body: JSON.stringify({ email: `load${Date.now()}@example.com`, password: 'LoadTest2026x', orgName: '부하 시험 대학', type: 'univ' }) });
  const ck = su.headers.get('set-cookie').split(';')[0]; const tid = (await su.json()).tenant.tid;
  await post('/api/lms/p/demo/seed', {}, ck);
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect(); const t0 = Date.now();
  await db.query('begin'); await db.query("select set_config('app.tenant', $1, true)", [tid]);
  const sec = (await db.query("select section_id from lms_section where tenant_id = $1 and course_code = 'CSE1001'", [tid])).rows[0].section_id;
  const ses = (await db.query("select session_id from lms_session where tenant_id = $1 and section_id = $2 order by week_no limit 1", [tid, sec])).rows[0].session_id;
  await db.query("insert into lms_person (tenant_id, member_no, kind, unit_code, source) select $1, '9' || lpad(g::text, 8, '0'), 'student', 'CSE', 'manual' from generate_series(1, $2) g on conflict do nothing", [tid, N]);
  await db.query("insert into lms_enrollment (tenant_id, section_id, person_id, source) select $1, $2, person_id, 'manual' from lms_person where tenant_id = $1 and member_no like '9%' on conflict do nothing", [tid, sec]);
  const toks = Array.from({ length: N }, () => crypto.randomBytes(32).toString('base64url'));
  for (let i = 0; i < N; i += 1000) { const sl = toks.slice(i, i + 1000); await db.query("insert into learner_sessions (id, tenant_id, sid, expires_at) select h, $1, '9' || lpad((($3::int) + o)::text, 8, '0'), now() + interval '1 hour' from unnest($2::text[]) with ordinality u(h, o)", [tid, sl.map(sha), i]); }
  await db.query('commit'); const prepMs = Date.now() - t0;
  const op = JSON.parse((await post('/api/lms/p/att/open', { session_id: ses, minutes: 30 }, ck)).body);
  const name = process.env.COOKIE_SECURE !== '0' ? '__Host-dd_lsid' : 'dd_lsid';
  /* 발사: 동시성 C(대기열) */
  const lat = []; const st = {}; let next = 0; const T0 = Date.now();
  await Promise.all(Array.from({ length: C }, async () => { while (next < N) { const i = next++; const r = await post('/api/lms/p/att/checkin', { session_id: ses, code: op.code }, `${name}=${toks[i]}`); lat.push(r.ms); st[r.st] = (st[r.st] || 0) + 1; } }));
  const wall = Date.now() - T0; lat.sort((a, b) => a - b); const q = p => Math.round(lat[Math.min(lat.length - 1, Math.floor(lat.length * p))]);
  await db.query("select set_config('app.tenant', $1, false)", [tid]); const cnt = (await db.query("select count(*)::int n from lms_attendance where tenant_id = $1 and session_id = $2", [tid, ses])).rows[0].n; await db.end();
  const result = { requests: N, concurrency: C, status: st, ok: st[200] || 0, recorded_in_db: cnt, wall_ms: wall, rps: Math.round(N / (wall / 1000)), p50_ms: q(.5), p95_ms: q(.95), p99_ms: q(.99), max_ms: Math.round(lat[lat.length - 1]), under_3s_pct: Math.round(lat.filter(x => x <= 3000).length / lat.length * 1000) / 10, prep_ms: prepMs };
  const params = { target: '3,000명 동시 출석(PER-001)', scale: N >= 3000 ? '실규모' : `축소(${N}명)`, host: `${require('node:os').cpus().length}코어 · 공유 장비`, server: U };
  await post('/api/lms/p/perf/save', { name: `출석 피크 ${N}명 · 동시 ${C}`, params, result }, ck);
  console.log(JSON.stringify({ params, result }, null, 1)); agent.destroy();
})().catch(e => { console.error(e); process.exit(1); });
