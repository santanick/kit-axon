'use strict';
/* 시나리오 브랜치가 등록된 범위 밖을 고치지 않았는지, 시나리오 파일이 IIFE인지 확인한다.
   사용: node scripts/check-scope.js [기준 브랜치=origin/main]  (BRANCH 환경변수로 브랜치 이름 지정 가능) */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path');
const root = path.resolve(__dirname, '..');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const SC = JSON.parse(fs.readFileSync(path.join(root, 'scripts/scenarios.json'), 'utf8'));
const errs = [];

/* 등록된 시나리오의 어드민·학습자 파일: 모든 브랜치에서 형식 확인 */
for (const id of Object.keys(SC)) for (const f of [`didisam/scn-${id}.js`, `didisam/lscn-${id}.js`]) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { errs.push(`${f}: 파일이 없습니다`); continue; }
  const code = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').trim();
  if (!/^\(\s*(function\b|\(\s*\)\s*=>|async\b)/.test(code) || !/\)\s*\(\s*\)\s*;?\s*$/.test(code)) errs.push(`${f}: 파일 전체를 IIFE로 감싸야 합니다`);
}

const branch = process.env.BRANCH || git('rev-parse', '--abbrev-ref', 'HEAD');
const m = branch.match(/^scenario\/(.+)$/);
if (m) {
  const sc = SC[m[1]];
  if (!sc) errs.push(`scripts/scenarios.json에 '${m[1]}'가 없습니다. 통합 채팅방에 등록을 요청하십시오`);
  else {
    const base = process.argv[2] || 'origin/main';
    const changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
    const allowed = f => sc.paths.some(p => p.endsWith('/') ? f.startsWith(p) : f === p);
    for (const f of changed) if (!allowed(f)) errs.push(`${f}: '${m[1]}' 범위 밖입니다. 통합 채팅방에 요청하십시오`);
    console.log(`${branch}: 변경 파일 ${changed.length}개 확인`);
  }
} else console.log(`${branch}: 시나리오 브랜치가 아니므로 범위 확인은 생략합니다`);

if (errs.length) { console.error(errs.map(e => '✗ ' + e).join('\n')); process.exit(1); }
console.log('✓ 범위·형식 점검 통과');
