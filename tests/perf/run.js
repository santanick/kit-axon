'use strict';
/* GS #21 성능 실측 — 로컬 Node 서버(시험 안에서 띄우고 끔)에 주요 화면 · API를 동시 20 · 50으로 보내 p50 · p95 · 처리량을 잰다.
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/kit_sec4_d4 NODE_PATH=… node tests/perf/run.js [--n 400] [--json out.json]
   포트 PERF_PORT(기본 9841, d4 전용). 운영 값 아님 — 시험용 가입 코드 · MFA_OFF=1(d1 2단계 인증 도입 뒤에도 로그인 직후 세션) 사용.
   로그인은 서버 남용 제한(이메일당 10분 8회)이 있어 순차 8회만 잰다. 저장(PUT /api/state)은 rev 충돌을 피하려 순차로 잰다. */
const path = require('node:path'); const fs = require('node:fs');
const SRV = path.resolve(__dirname, '../../service/server');
const { poolFrom, migrate } = require(path.join(SRV, 'db')); const { createApp } = require(path.join(SRV, 'app'));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('n', 400), OUT = arg('json', ''), PORT = +(process.env.PERF_PORT || 9841);
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)].toFixed(1); };
(async () => {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL이 필요합니다.'); process.exit(1); }
  const pool = poolFrom(process.env); await migrate(pool);
  const env = { ...process.env, COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SIGNUP_CODE: 'PERF', MFA_OFF: '1', SESSION_PEPPER: process.env.SESSION_PEPPER || 'perf-test-pepper-not-for-production' };
  const app = createApp({ pool, env, publicDir: path.resolve(__dirname, '../../didisam'), log: {} });
  await new Promise((ok, no) => { app.once('error', no); app.listen(PORT, '127.0.0.1', ok); });
  const U = `http://127.0.0.1:${PORT}`; let cookie = '';
  const req = async (method, p, body) => { const t0 = performance.now(); const r = await fetch(U + p, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c && /sid=/.test(c)) cookie = c.split(';')[0]; const txt = await r.text(); return { ms: performance.now() - t0, status: r.status, txt }; };
  const rows = [];
  try {
    const sfx = Date.now().toString(36), email = `perf${sfx}@perf.test`, pw = 'Perf-Passw0rd-' + sfx;
    const su = await req('POST', '/api/signup', { email, password: pw, orgName: '성능 시험 기관', type: 'univ', code: 'PERF' }); if (su.status !== 200) throw new Error('가입 실패 ' + su.status + ' ' + su.txt.slice(0, 120));
    const tid = JSON.parse(su.txt).tenant.tid;
    /* 화면에 쓰일 크기의 기관 데이터(학습자 300명 · 과정 20개) */
    const doc = { org: { name: '성능 시험 기관', type: 'univ', room: { mode: 'saas' } }, members: [], classes: Array.from({ length: 20 }, (_, i) => ({ id: 'c' + i, name: '과정 ' + i, mods: Array.from({ length: 10 }, (_, j) => ({ id: `m${i}_${j}`, t: '차시 ' + j })) })), learners: Array.from({ length: 300 }, (_, i) => ({ id: 'L' + i, no: String(20260000 + i), dept: '학과 ' + (i % 12) })) };
    let rev = JSON.parse((await req('PUT', '/api/state', { doc, rev: 0 })).txt).rev;
    const ENDS = [
      ['화면 index.html', 'GET', '/index.html'], ['화면 learner.html', 'GET', '/learner.html'], ['정적 core.js', 'GET', '/core.js'],
      ['API GET /api/me', 'GET', '/api/me'], ['API GET /api/state', 'GET', '/api/state'], ['API GET /api/audit', 'GET', '/api/audit'],
      ['API GET /api/pub/:tid/site', 'GET', `/api/pub/${tid}/site`]
    ];
    for (const C of [20, 50]) for (const [name, m, p] of ENDS) {
      const ms = []; let bad = 0, i = 0; const t0 = performance.now();
      await Promise.all(Array.from({ length: C }, async () => { while (i < N) { i++; const r = await req(m, p); ms.push(r.ms); if (r.status >= 500 || (r.status >= 400 && !/pub\//.test(p))) bad++; } }));
      const sec = (performance.now() - t0) / 1000; rows.push({ name, c: C, n: ms.length, p50: pct(ms, 50), p95: pct(ms, 95), max: pct(ms, 100), rps: Math.round(ms.length / sec), err: bad });
    }
    { const ms = []; for (let k = 0; k < 50; k++) { const r = await req('PUT', '/api/state', { doc, rev }); if (r.status === 200) rev = JSON.parse(r.txt).rev; ms.push(r.ms); } rows.push({ name: 'API PUT /api/state(약 60KB, 순차)', c: 1, n: ms.length, p50: pct(ms, 50), p95: pct(ms, 95), max: pct(ms, 100), rps: 0, err: 0 }); }
    { const ms = []; let bad = 0; const keep = cookie; for (let k = 0; k < 8; k++) { cookie = ''; const r = await req('POST', '/api/login', { email, password: pw }); ms.push(r.ms); if (r.status !== 200) bad++; } cookie = keep; rows.push({ name: 'API POST /api/login(비밀번호 해시, 순차)', c: 1, n: ms.length, p50: pct(ms, 50), p95: pct(ms, 95), max: pct(ms, 100), rps: 0, err: bad }); }
  } finally { await new Promise(k => app.close(k)); await pool.end(); }
  console.log('| 대상 | 동시 | 요청 | p50(ms) | p95(ms) | 최대(ms) | 초당 처리 | 오류 |'); console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.name} | ${r.c} | ${r.n} | ${r.p50} | ${r.p95} | ${r.max} | ${r.rps || '—'} | ${r.err} |`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), node: process.version, n: N, rows }, null, 2));
  process.exit(rows.some(r => r.err) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
