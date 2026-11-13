/* 운영 이미지 점검: service/server 아래 폴더(node_modules 제외)가 Dockerfile에 모두 복사되는지 확인.
   v40.0 배포 실패(2026-11-14) — fac/ 폴더가 이미지에 빠져 서버가 기동하지 못함 → 같은 실수를 PR 점검에서 막는다. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), srv = path.join(root, 'service/server');
const dirs = fs.readdirSync(srv, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'node_modules').map(d => d.name);
let bad = 0;
for (const f of ['service/Dockerfile', 'service/gcp/Dockerfile.lite']) {
  const t = fs.readFileSync(path.join(root, f), 'utf8');
  for (const d of dirs) if (!new RegExp(`COPY\\s+service/server/${d}\\s`).test(t)) { console.error(`✗ ${f}: service/server/${d} 를 복사하지 않음`); bad++; }
}
console.log(bad ? `실패 ${bad}` : `✓ Dockerfile 서버 폴더 복사 점검 통과(${dirs.join(', ')})`); process.exit(bad ? 1 : 0);
