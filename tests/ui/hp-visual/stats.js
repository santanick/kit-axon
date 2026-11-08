'use strict';
/* 유형별 집계(브라우저 불필요) — v34.5 FB(R1 H3 · H4 · M8)
   사용: node tests/ui/hp-visual/stats.js --in <run.js 출력 폴더> [--vs <비교 폴더>] [--type k12] [--json out.json]
   유형마다: 템플릿 수 · 번호 단계 섹션이 있는 템플릿(비율) · 보이는 섹션 수(평균 · 최소) · 강좌 카드가 보이는 수 · '개설 준비 중' 수 · 품질 점수(최소 · 중앙 · 최대 · 서로 다른 값 수) */
const fs = require('node:fs'); const path = require('node:path');
const H = require('./lib.js'); const A = H.args(process.argv.slice(2));
const want = A.type ? new Set(String(A.type).split(',')) : null;
const med = L => { if (!L.length) return null; const a = L.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
function stat(dir) { const rows = H.loadRows(path.resolve(dir)); const G = H.byType(rows); const out = {};
  for (const [ty, L] of Object.entries(G)) { if (want && !want.has(ty)) continue; const q = L.map(r => r.q).filter(v => v != null); const nv = L.map(r => r.nVis != null ? r.nVis : r.nSec).filter(v => v != null);
    out[ty] = { n: L.length, numSec: L.filter(r => r.numSec > 0).length, numRatio: L.length ? Math.round(L.filter(r => r.numSec > 0).length / L.length * 100) : 0, nVisAvg: nv.length ? Math.round(nv.reduce((a, b) => a + b, 0) / nv.length * 10) / 10 : null, nVisMin: nv.length ? Math.min(...nv) : null,
      cls: L.filter(r => r.clsVis > 0).length, emptyCls: L.filter(r => r.emptyCls > 0).length, qMin: q.length ? Math.min(...q) : null, qMed: med(q), qMax: q.length ? Math.max(...q) : null, qDistinct: new Set(q).size, imgPending: L.reduce((a, r) => a + (r.imgPending > 0 ? r.imgPending : 0), 0) }; }
  const all = Object.values(out); return { types: out, n: rows.length }; }
const a = stat(A.in || A._[0] || 'hp-visual-out'); const b = A.vs ? stat(A.vs) : null;
const f = (t, k) => t ? t[k] : '-';
const line = (ty, t, u) => `${ty.padEnd(8)} ${String(t.n).padStart(3)}종 | 단계 ${u ? `${f(u, 'numSec')}(${f(u, 'numRatio')}%) → ` : ''}${t.numSec}(${t.numRatio}%) | 보이는 섹션 ${u ? `${f(u, 'nVisAvg')}/${f(u, 'nVisMin')} → ` : ''}${t.nVisAvg}/${t.nVisMin}(평균/최소) | 강좌 카드 ${u ? `${f(u, 'cls')} → ` : ''}${t.cls} · 준비 중 ${t.emptyCls} | 품질 ${u ? `${f(u, 'qMin')}/${f(u, 'qMed')}/${f(u, 'qMax')}(${f(u, 'qDistinct')}) → ` : ''}${t.qMin}/${t.qMed}/${t.qMax}(${t.qDistinct}가지)${t.imgPending ? ` | 안 뜬 사진 ${t.imgPending}` : ''}`;
console.log(`집계 ${a.n}종${b ? ` (비교: ${b.n}종 → 이번)` : ''} — 품질은 최소/중앙/최대(서로 다른 값 수)`);
Object.entries(a.types).forEach(([ty, t]) => console.log(line(ty, t, b && b.types[ty])));
if (A.json) fs.writeFileSync(path.resolve(A.json), JSON.stringify({ now: a, before: b }, null, 1));
