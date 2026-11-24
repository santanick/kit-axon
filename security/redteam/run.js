'use strict';
/* 디디쌤 가디언 로컬 레드팀 실행기 — service/server/aiguard.js를 직접 호출한다(키 · 네트워크 불필요).
   node security/redteam/run.js [--json] [--java] [--cases <파일>] [--out <결과.json>]   → 실패가 하나라도 있으면 종료 코드 1
   --java: Java DdAiGuard(service-egov, mvn compile 후 target/classes)도 같은 사례로 판정하고 Node와 점수 · 결과를 대조한다
   --cases: cases.json 대신 생성 사례 파일(gen.js 출력 { cases: [...] } 또는 배열)로 실행
   판정: inject = injectScore ≥ 1 · fence = 경계 태그 탈출 무력화 · redact = 값 가림 · leak = 응답 유출 차단 · benign = 오탐 0(점수 0 · 가림 0)
   모듈: runCases(cases, { java }) → { total, engines, failed, missed, missedBy, summary, parity } (weekly가 부른다)
   사례 글은 시험용 데이터일 뿐이며 어떤 모델에도 보내지 않는다. */
const path = require('path'); const fs = require('fs');
const { NODE, judge } = require('./lib');

/* Java 엔진: 사례 전체를 한 번에 보내고 결과를 받아 둔다(서버 · 네트워크 없음). 탭은 GuardParity 구분자라 사례 글에 쓰지 않는다 */
function javaEngine(cases) {
  const { execFileSync } = require('child_process'); const os = require('os');
  const root = path.join(__dirname, '../..'), cls = path.join(root, 'service-egov/target/classes');
  if (!fs.existsSync(path.join(cls, 'egovframework/didisam/cmm/DdAiGuard.class'))) throw Object.assign(new Error('Java 대조: service-egov에서 mvn -q -DskipTests compile 먼저 실행'), { code: 'NO_JAVA' });
  /* DdAiGuard가 Jackson 타입을 참조하므로 로컬 Maven 저장소의 jackson-core · databind · annotations를 붙인다 */
  const m2 = path.join(process.env.M2_REPO || path.join(os.homedir(), '.m2/repository'), 'com/fasterxml/jackson/core');
  const jars = ['jackson-databind', 'jackson-core', 'jackson-annotations'].map(a => { try { const v = fs.readdirSync(path.join(m2, a)).sort().pop(); return path.join(m2, a, v, `${a}-${v}.jar`); } catch (e) { return null; } }).filter(Boolean);
  const q = []; const key = (...a) => a.join('\u0001');
  for (const c of cases) { if (c.input != null) { q.push(['score', '', c.input]); q.push(['redact', '', c.input]); if (c.tag) q.push(['fence', c.tag, c.input]); } if (c.response != null) q.push(['leak', '', c.response, ...(c.markers || [])]); }
  const b64 = x => Buffer.from(x, 'utf8').toString('base64');
  const out = execFileSync('java', ['-cp', [cls, ...jars].join(path.delimiter), path.join(__dirname, 'GuardParity.java')], { input: q.map(x => b64(x.join('\t'))).join('\n') + '\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).trim().split('\n').map(l => Buffer.from(l, 'base64').toString('utf8'));
  const M = new Map(q.map((x, i) => [key(x[0], x[1], x[2]), out[i]]));
  return { name: 'Java', score: t => Number(M.get(key('score', '', t))), fence: (tag, t) => M.get(key('fence', tag, t)), redact: t => { const [n, ...r] = M.get(key('redact', '', t)).split('\t'); return { n: Number(n), text: r.join('\t') }; }, leak: t => M.get(key('leak', '', t)) === 'true' };
}

/* 판정 사유 → 놓친 검사 이름 */
const MISS = [[/^인젝션 미탐/, 'injectScore'], [/^태그 탈출/, 'fence'], [/^응답 유출/, 'leakCheck'], [/^가림 누락/, 'redact'], [/^오탐/, 'benign']];
const missOf = w => (MISS.find(([re]) => re.test(w)) || [0, 'other'])[1];
const isAtk = c => c.expect ? c.expect === 'block' : !String(c.id).startsWith('OK');

function runCases(cases, { java = false } = {}) {
  cases = Array.isArray(cases) ? cases : (cases && cases.cases) || [];
  const engines = [NODE, ...(java ? [javaEngine(cases)] : [])];
  const res = []; const parity = [];
  for (const E of engines) for (const c of cases) { const fail = judge(c, E); res.push({ engine: E.name, id: c.id, cat: c.cat, technique: c.technique, variant: c.variant, fail, missed: [...new Set(fail.map(missOf))] }); }
  if (engines.length > 1) for (const c of cases) if (c.input != null) {
    const [a, b] = engines.map(E => E.score(c.input)); if (a !== b) parity.push(`${c.id} 점수 Node ${a} · Java ${b}`);
    const [fa, fb] = engines.map(E => c.tag ? E.fence(c.tag, c.input) : ''); if (fa !== fb) parity.push(`${c.id} fence 결과 다름`);
  } else if (c.response != null) { const [a, b] = engines.map(E => E.leak(c.response, c.markers || [])); if (a !== b) parity.push(`${c.id} leak Node ${a} · Java ${b}`); }
  const failed = res.filter(r => r.fail.length); const missedBy = {};
  for (const r of failed) for (const m of r.missed) missedBy[m] = (missedBy[m] || 0) + 1;
  const byId = new Map(cases.map(c => [c.id, c])); const summary = {};
  for (const E of engines) { const R = res.filter(r => r.engine === E.name), atk = R.filter(r => isAtk(byId.get(r.id))), ok = R.filter(r => !isAtk(byId.get(r.id))); summary[E.name] = { attack: atk.length, blocked: atk.filter(r => !r.fail.length).length, benign: ok.length, falsePositive: ok.filter(r => r.fail.length).length }; }
  return { total: cases.length, engines: engines.map(e => e.name), results: res, failed, missed: failed.filter(r => isAtk(byId.get(r.id))), falsePositives: failed.filter(r => !isAtk(byId.get(r.id))), missedBy, summary, parity, ok: !failed.length && !parity.length };
}

module.exports = { runCases, javaEngine };

if (require.main === module) {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const cf = arg('--cases'); const cases = cf ? JSON.parse(fs.readFileSync(cf, 'utf8')) : require('./cases.json').cases;
  let r; try { r = runCases(cases, { java: process.argv.includes('--java') }); } catch (e) { if (e.code === 'NO_JAVA') { console.error(e.message); process.exit(2); } throw e; }
  const J = { total: r.total, engines: r.engines, summary: r.summary, missedBy: r.missedBy, failed: r.failed, parity: r.parity };
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(J, null, 1) + '\n');
  if (process.argv.includes('--json')) console.log(JSON.stringify(J, null, 2));
  else {
    const quiet = !!cf; /* 생성 사례는 실패만 줄로 찍는다 */
    for (const x of r.results) if (!quiet || x.fail.length) console.log(`${x.fail.length ? 'FAIL' : 'PASS'}  ${x.engine.padEnd(4)}  ${x.id}  ${x.cat}${x.fail.length ? '  — ' + x.fail.join(', ') : ''}`);
    for (const [n, s] of Object.entries(r.summary)) console.log(`\n[${n}] 공격 ${s.attack}건 중 차단 ${s.blocked} · 정상 ${s.benign}건 중 오탐 ${s.falsePositive}`);
    if (Object.keys(r.missedBy).length) console.log('놓친 검사: ' + Object.entries(r.missedBy).map(([k, n]) => `${k} ${n}`).join(' · '));
    if (r.engines.length > 1) console.log(r.parity.length ? 'Node · Java 불일치:\n  ' + r.parity.join('\n  ') : 'Node · Java 점수 · fence 결과 일치');
  }
  process.exit(r.ok ? 0 : 1);
}
