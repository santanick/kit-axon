'use strict';
/* 유사 짝 찾기 — 같은 유형 안에서 첫 화면 dHash 해밍 거리 ≤ 기준(기본 12) 이고 섹션 구조 서명이 같으면 '유사'.
   사용: node tests/ui/hp-visual/similar.js --in <run.js 출력 폴더> [--th 12] [--type k12] [--cross] [--near]
   - --cross: 유형을 넘어서도 비교(참고용) · --near: 구조가 달라도 거리 기준 이하인 짝을 나란히 보기에 함께 넣음
   - 결과: <in>/similar/similar.json · similar.csv · heat_<유형>.png(거리 행렬) · pairs_<유형>_<n>.jpg(나란히 보기) */
const fs = require('node:fs'); const path = require('node:path');
const H = require('./lib.js'); const A = H.args(process.argv.slice(2));
const IN = path.resolve(A.in || A._[0] || 'hp-visual-out'); const OUT = path.resolve(A.out || path.join(IN, 'similar')); const TH = A.th != null ? +A.th : 12;
fs.mkdirSync(OUT, { recursive: true });
const sharp = H.need('sharp');
const FONT = "font-family=\"Noto Sans CJK KR, Noto Sans KR, Pretendard, sans-serif\"";

(async () => {
  let rows = H.loadRows(IN).filter(r => r.dh); if (A.type) { const T = new Set(String(A.type).split(',')); rows = rows.filter(r => T.has(r.type)); }
  if (!rows.length) { console.error('행이 없습니다 — 먼저 run.js를 실행하세요:', IN); process.exit(2); }
  const groups = A.cross ? { all: rows.slice().sort((a, b) => (a.type + a.id).localeCompare(b.type + b.id)) } : H.byType(rows);
  const res = { th: TH, at: new Date().toISOString(), n: rows.length, similar: 0, near: 0, sigEq: 0, types: {} }; const flat = [];
  for (const [ty, L] of Object.entries(groups)) {
    const n = L.length; const D = L.map(a => L.map(b => H.hamming(a.dh, b.dh))); const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = D[i][j]; const dm = H.hamming(L[i].dh_m, L[j].dh_m); const se = L[i].sig === L[j].sig;
      if (d <= TH || se) pairs.push({ a: L[i].id, b: L[j].id, d, dm, sigEq: se, similar: d <= TH && se, near: d <= TH }); }
    pairs.sort((x, y) => x.d - y.d);
    const sim = pairs.filter(p => p.similar); const near = pairs.filter(p => p.near); const se = pairs.filter(p => p.sigEq);
    const inSim = new Set(sim.flatMap(p => [p.a, p.b]));
    const lay = {}; L.forEach(r => { lay[r.layout] = (lay[r.layout] || 0) + 1; });
    let dsum = 0, dc = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { dsum += D[i][j]; dc++; }
    res.types[ty] = { n, similar: sim.length, near: near.length, sigEq: se.length, idsInSimilar: inSim.size, avgDist: dc ? Math.round(dsum / dc * 10) / 10 : 0, layouts: lay, pairs: pairs.filter(p => p.near || p.sigEq) };
    res.similar += sim.length; res.near += near.length; res.sigEq += se.length;
    pairs.forEach(p => flat.push(Object.assign({ type: ty }, p)));
    await heat(ty, L, D, pairs); await side(ty, L, A.near ? near : sim);
    console.log(`${ty}: ${n}종 · 유사 ${sim.length}짝(관련 ${inSim.size}종) · 거리≤${TH} ${near.length}짝 · 구조 같음 ${se.length}짝 · 평균 거리 ${res.types[ty].avgDist}`);
  }
  fs.writeFileSync(path.join(OUT, 'similar.json'), JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(OUT, 'similar.csv'), H.csv(flat, ['type', 'a', 'b', 'd', 'dm', 'sigEq', 'near', 'similar']));
  console.log(`합계: 유사 ${res.similar}짝 · 거리≤${TH} ${res.near}짝 · 구조 같음 ${res.sigEq}짝 (${rows.length}종) → ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });

/* 거리 행렬 히트맵: 진할수록 비슷함 · 검은 테두리 = 유사(거리 ≤ 기준 + 구조 같음) · 점 = 구조 같음 */
async function heat(ty, L, D, pairs) {
  const n = L.length, c = Math.max(14, Math.min(28, Math.floor(900 / Math.max(1, n)))), lw = 210, th = 210, W = lw + n * c + 20, Hh = th + n * c + 60;
  const P = {}; pairs.forEach(p => { P[p.a + '|' + p.b] = P[p.b + '|' + p.a] = p; });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}"><rect width="100%" height="100%" fill="#fff"/>`;
  s += `<text x="10" y="24" font-size="16" font-weight="700" ${FONT}>${H.esc(ty)} — 첫 화면 dHash 거리(진할수록 비슷 · 테두리=유사 · 점=구조 같음, 기준 ${TH})</text>`;
  L.forEach((r, i) => { s += `<text x="${lw - 6}" y="${th + i * c + c * 0.7}" font-size="${Math.min(12, c - 3)}" text-anchor="end" ${FONT}>${H.esc(r.id)}</text>`;
    s += `<text transform="translate(${lw + i * c + c * 0.7},${th - 6}) rotate(-60)" font-size="${Math.min(12, c - 3)}" ${FONT}>${H.esc(r.id)}</text>`; });
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const d = D[i][j]; const t = Math.min(1, d / 32); const g = Math.round(40 + 215 * t); const col = i === j ? '#ddd' : `rgb(${Math.round(200 + 55 * t)},${g},${g})`;
    const p = P[L[i].id + '|' + L[j].id]; s += `<rect x="${lw + j * c}" y="${th + i * c}" width="${c}" height="${c}" fill="${col}" stroke="${p && p.similar ? '#000' : '#fff'}" stroke-width="${p && p.similar ? 2 : 0.5}"/>`;
    if (i !== j && c >= 18) s += `<text x="${lw + j * c + c / 2}" y="${th + i * c + c * 0.68}" font-size="${Math.min(10, c - 8)}" text-anchor="middle" fill="${t < 0.45 ? '#fff' : '#333'}" ${FONT}>${d}</text>`;
    if (p && p.sigEq && !p.similar) s += `<circle cx="${lw + j * c + 3}" cy="${th + i * c + 3}" r="2" fill="#1d4ed8"/>`; }
  s += '</svg>'; await sharp(Buffer.from(s)).png().toFile(path.join(OUT, `heat_${ty}.png`));
}

/* 유사 짝 나란히 보기(한 장에 최대 8짝) */
async function side(ty, L, list) {
  const by = {}; L.forEach(r => { by[r.id] = r; }); fs.readdirSync(OUT).filter(f => f.startsWith(`pairs_${ty}_`)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  const SH = path.join(IN, 'shots'); const tw = 560, thh = 350, mw = 120, mh = 260, rowH = Math.max(thh, mh) + 46, W = (tw + mw + 24) * 2 + 40;
  for (let k = 0; k * 8 < list.length; k++) { const part = list.slice(k * 8, k * 8 + 8); const Ht = part.length * rowH + 50; const comp = [];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}"><rect width="100%" height="100%" fill="#f4f4f5"/><text x="16" y="32" font-size="20" font-weight="700" ${FONT}>${H.esc(ty)} 유사 짝 ${k * 8 + 1}–${k * 8 + part.length} / ${list.length} (기준 dHash ≤ ${TH})</text>`;
    for (let i = 0; i < part.length; i++) { const p = part[i]; const y = 50 + i * rowH;
      [p.a, p.b].forEach((id, side) => { const x = 16 + side * (tw + mw + 24 + 8); const r = by[id] || {};
        s += `<text x="${x}" y="${y + 18}" font-size="14" font-weight="700" ${FONT}>${H.esc(id)} · ${H.esc(r.name || '')}</text><text x="${x}" y="${y + 36}" font-size="12" fill="#555" ${FONT}>${H.esc([r.layout, r.theme, r.hero || '-', 'q' + r.q].join(' · '))}${side ? `  ← 거리 ${p.d}(휴대폰 ${p.dm}) · 구조 ${p.sigEq ? '같음' : '다름'}` : ''}</text>`;
        const f1 = path.join(SH, `${id}_hero.jpg`), f2 = path.join(SH, `${id}_hero_m.jpg`);
        if (fs.existsSync(f1)) comp.push({ f: f1, w: tw, h: thh, left: x, top: y + 44 }); if (fs.existsSync(f2)) comp.push({ f: f2, w: mw, h: mh, left: x + tw + 8, top: y + 44 }); }); }
    s += '</svg>';
    const ims = await Promise.all(comp.map(async c => ({ input: await sharp(c.f).resize(c.w, c.h, { fit: 'cover', position: 'top' }).toBuffer(), left: c.left, top: c.top })));
    await sharp(Buffer.from(s)).composite(ims).jpeg({ quality: 82 }).toFile(path.join(OUT, `pairs_${ty}_${k + 1}.jpg`)); }
}
