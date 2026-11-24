'use strict';
/* 디디쌤 가디언 로컬 레드팀 실행기 — service/server/aiguard.js를 직접 호출한다(키 · 네트워크 불필요).
   node security/redteam/run.js [--json] [--java]   → 실패가 하나라도 있으면 종료 코드 1
   --java: Java DdAiGuard(service-egov, mvn compile 후 target/classes)도 같은 사례로 판정하고 Node와 점수 · 결과를 대조한다
   판정: inject = injectScore ≥ 1 · fence = 경계 태그 탈출 무력화 · redact = 값 가림 · leak = 응답 유출 차단 · benign = 오탐 0(점수 0 · 가림 0)
   사례 글은 시험용 데이터일 뿐이며 어떤 모델에도 보내지 않는다. */
const path = require('path');
const { NODE, judge } = require('./lib');
const { cases } = require('./cases.json');

/* Java 엔진: 사례 전체를 한 번에 보내고 결과를 받아 둔다(서버 · 네트워크 없음) */
function javaEngine() {
  const { execFileSync } = require('child_process'); const fs = require('fs'); const os = require('os');
  const root = path.join(__dirname, '../..'), cls = path.join(root, 'service-egov/target/classes');
  if (!fs.existsSync(path.join(cls, 'egovframework/didisam/cmm/DdAiGuard.class'))) { console.error('Java 대조: service-egov에서 mvn -q -DskipTests compile 먼저 실행'); process.exit(2); }
  /* DdAiGuard가 Jackson 타입을 참조하므로 로컬 Maven 저장소의 jackson-core · databind · annotations를 붙인다 */
  const m2 = path.join(process.env.M2_REPO || path.join(os.homedir(), '.m2/repository'), 'com/fasterxml/jackson/core');
  const jars = ['jackson-databind', 'jackson-core', 'jackson-annotations'].map(a => { try { const v = fs.readdirSync(path.join(m2, a)).sort().pop(); return path.join(m2, a, v, `${a}-${v}.jar`); } catch (e) { return null; } }).filter(Boolean);
  const q = []; const key = (...a) => a.join('\u0001');
  for (const c of cases) { if (c.input != null) { q.push(['score', '', c.input]); q.push(['redact', '', c.input]); if (c.tag) q.push(['fence', c.tag, c.input]); } if (c.response != null) q.push(['leak', '', c.response, ...(c.markers || [])]); }
  const b64 = x => Buffer.from(x, 'utf8').toString('base64');
  const out = execFileSync('java', ['-cp', [cls, ...jars].join(path.delimiter), path.join(__dirname, 'GuardParity.java')], { input: q.map(x => b64(x.join('\t'))).join('\n') + '\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim().split('\n').map(l => Buffer.from(l, 'base64').toString('utf8'));
  const M = new Map(q.map((x, i) => [key(x[0], x[1], x[2]), out[i]]));
  return { name: 'Java', score: t => Number(M.get(key('score', '', t))), fence: (tag, t) => M.get(key('fence', tag, t)), redact: t => { const [n, ...r] = M.get(key('redact', '', t)).split('\t'); return { n: Number(n), text: r.join('\t') }; }, leak: t => M.get(key('leak', '', t)) === 'true' };
}

const engines = [NODE, ...(process.argv.includes('--java') ? [javaEngine()] : [])];
const res = []; const diff = [];
for (const E of engines) for (const c of cases) res.push({ engine: E.name, id: c.id, cat: c.cat, fail: judge(c, E) });
if (engines.length > 1) for (const c of cases) if (c.input != null) { const [a, b] = engines.map(E => E.score(c.input)); if (a !== b) diff.push(`${c.id} 점수 Node ${a} · Java ${b}`); const [fa, fb] = engines.map(E => c.tag ? E.fence(c.tag, c.input) : ''); if (fa !== fb) diff.push(`${c.id} fence 결과 다름`); }
const bad = res.filter(r => r.fail.length);
if (process.argv.includes('--json')) console.log(JSON.stringify({ total: cases.length, engines: engines.map(e => e.name), failed: bad, parity: diff }, null, 2));
else {
  for (const r of res) console.log(`${r.fail.length ? 'FAIL' : 'PASS'}  ${r.engine.padEnd(4)}  ${r.id}  ${r.cat}${r.fail.length ? '  — ' + r.fail.join(', ') : ''}`);
  for (const E of engines) { const R = res.filter(r => r.engine === E.name), atk = R.filter(r => r.id.startsWith('RT')), ok = R.filter(r => r.id.startsWith('OK')); console.log(`\n[${E.name}] 공격 ${atk.length}건 중 차단 ${atk.filter(r => !r.fail.length).length} · 정상 ${ok.length}건 중 오탐 ${ok.filter(r => r.fail.length).length}`); }
  if (engines.length > 1) console.log(diff.length ? 'Node · Java 불일치:\n  ' + diff.join('\n  ') : 'Node · Java 점수 · fence 결과 일치');
}
process.exit(bad.length || diff.length ? 1 : 0);
