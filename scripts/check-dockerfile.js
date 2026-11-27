/* 운영 이미지 점검
   ① service/server 아래 폴더(node_modules 제외)가 Dockerfile에 모두 복사되는지 확인.
      v40.0 배포 실패(2026-11-14) — fac/ 폴더가 이미지에 빠져 서버가 기동하지 못함 → 같은 실수를 PR 점검에서 막는다.
   ② v49.1 P2 Node 고정(보안 스킬 2-3 · 2-A): 모든 FROM은 다이제스트(@sha256) 고정, node 이미지는 지원 계열(22 · 24 · 26)의
      정확한 버전(x.y.z) 태그 · 세 Dockerfile 같은 버전, server/package.json engines가 그 버전을 허용하고 지원 계열만 열어 두는지,
      npm ci는 --ignore-scripts인지 확인한다. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), srv = path.join(root, 'service/server');
const SUPPORTED = [22, 24, 26];
const dirs = fs.readdirSync(srv, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'node_modules').map(d => d.name);
let bad = 0; const no = m => { console.error('✗ ' + m); bad++; };
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

/* ① 서버 폴더 복사 */
for (const f of ['service/Dockerfile', 'service/gcp/Dockerfile.lite']) {
  const t = read(f);
  for (const d of dirs) if (!new RegExp(`COPY\\s+service/server/${d}\\s`).test(t)) no(`${f}: service/server/${d} 를 복사하지 않음`);
}

/* ② 기준 이미지 고정 */
const vers = new Set();
for (const f of ['service/Dockerfile', 'service/gcp/Dockerfile.lite', 'service-egov/Dockerfile']) {
  const t = read(f);
  for (const m of t.matchAll(/^FROM\s+(\S+)/gm)) {
    const img = m[1];
    if (!/@sha256:[0-9a-f]{64}$/.test(img)) no(`${f}: ${img} — 다이제스트(@sha256) 고정 아님`);
    if (!/^node:/.test(img)) continue;
    const v = /^node:(\d+)\.(\d+)\.(\d+)-[a-z0-9.]+@/.exec(img);
    if (!v) { no(`${f}: ${img} — node 태그가 정확한 버전(x.y.z-변형)이 아님`); continue; }
    if (!SUPPORTED.includes(+v[1])) no(`${f}: node ${v[1]} 계열은 지원 계열(${SUPPORTED.join(' · ')})이 아님`);
    vers.add(`${v[1]}.${v[2]}.${v[3]}`);
  }
  for (const m of t.matchAll(/npm ci\b[^\n&|;]*/g)) if (!/--ignore-scripts/.test(m[0])) no(`${f}: ${m[0].trim()} — --ignore-scripts 없음`);
}
if (vers.size > 1) no(`Dockerfile마다 Node 버전이 다름: ${[...vers].join(', ')}`);

/* engines: '^a.b.c || ^d.e.f' 형식만 받는다(지원 계열별 최저 버전) */
const cmp = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
const pkg = JSON.parse(read('service/server/package.json'));
const eng = String((pkg.engines || {}).node || '');
const ranges = eng.split('||').map(s => s.trim()).filter(Boolean).map(s => /^\^(\d+)\.(\d+)\.(\d+)$/.exec(s));
if (!ranges.length || ranges.some(r => !r)) no(`service/server/package.json engines.node "${eng}" — '^x.y.z || …' 형식이 아님`);
else {
  for (const r of ranges) if (!SUPPORTED.includes(+r[1])) no(`engines.node ${r[0]} — 지원 계열 밖`);
  for (const v of vers) { const x = v.split('.').map(Number);
    if (!ranges.some(r => +r[1] === x[0] && cmp(x, [+r[1], +r[2], +r[3]]) >= 0)) no(`이미지 node ${v} 가 engines.node "${eng}" 를 만족하지 않음`); }
  const lock = JSON.parse(read('service/server/package-lock.json'));
  const le = (((lock.packages || {})[''] || {}).engines || {}).node;
  if (le !== eng) no(`package-lock.json engines.node "${le}" ≠ package.json "${eng}" — npm install로 lock을 맞추세요`);
}

console.log(bad ? `실패 ${bad}` : `✓ Dockerfile 점검 통과(서버 폴더 ${dirs.join(', ')} · node ${[...vers].join(', ')} 다이제스트 고정 · engines "${eng}")`);
process.exit(bad ? 1 : 0);
