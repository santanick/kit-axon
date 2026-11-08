'use strict';
/* 유사 짝 찾기 (통합 결정 12:00) — 같은 유형(types에 포함, includes) 안에서 둘 중 하나면 '유사'
   ① 엄격(strict): 첫 화면 dHash ≤ 12(--th) 이고 섹션 종류 순서가 같음(variant · 첫 화면 배치는 보지 않음)
   ② 첫 화면 닮음(look): 구조와 관계없이 dHash ≤ 8(--look)
   사용: node tests/ui/hp-visual/similar.js --in <run.js 출력 폴더> [--th 12] [--look 8] [--type k12] [--cross]
   - 결과: <in>/similar/similar.json · similar.csv · verdict.txt(판정 요약 한 줄) · heat_<유형>.png · pairs_<유형>_<n>.jpg
   - 판정 요약: 유형별 ①·② 짝 수, 대비 4.5 미만 템플릿 수, 지어낸 숫자 의심 템플릿 수, 첫 화면 사진 미달(hero 슬롯 아님 · 긴 변 1200 미만) 수,
     번호 단계 섹션이 있는 템플릿 수(절반 넘으면 '!'), 15종 미만 경고 → 모두 통과해야 OK */
const fs = require('node:fs'); const path = require('node:path');
const H = require('./lib.js'); const A = H.args(process.argv.slice(2));
const IN = path.resolve(A.in || A._[0] || 'hp-visual-out'); const OUT = path.resolve(A.out || path.join(IN, 'similar'));
const TH = A.th != null ? +A.th : 12; const LOOK = A.look != null ? +A.look : 8;
fs.mkdirSync(OUT, { recursive: true });
const sharp = H.need('sharp');
const FONT = "font-family=\"Noto Sans CJK KR, Noto Sans KR, Pretendard, sans-serif\"";

(async () => {
  const want = A.type ? new Set(String(A.type).split(',')) : null;
  const rows = H.loadRows(IN).filter(r => r.dh);
  if (!rows.length) { console.error('행이 없습니다 — 먼저 run.js를 실행하세요:', IN); process.exit(2); }
  let groups = A.cross ? { all: rows.slice().sort((a, b) => a.id.localeCompare(b.id)) } : H.byType(rows);
  if (want && !A.cross) groups = Object.fromEntries(Object.entries(groups).filter(([t]) => want.has(t)));
  const res = { th: TH, look: LOOK, rule: '① dHash≤th + 섹션 종류 순서 같음 · ② dHash≤look', at: new Date().toISOString(), n: rows.length, strict: 0, look: 0, similar: 0, types: {} }; const flat = []; const V = [];
  for (const [ty, L] of Object.entries(groups)) {
    const n = L.length; const D = L.map(a => L.map(b => H.hamming(a.dh, b.dh))); const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = D[i][j]; const dm = H.hamming(L[i].dh_m, L[j].dh_m); const ke = H.kinds(L[i]) === H.kinds(L[j]);
      const strict = d <= TH && ke, look = d <= LOOK; if (strict || look || ke || d <= TH) pairs.push({ a: L[i].id, b: L[j].id, d, dm, kindsEq: ke, sigEq: L[i].sig === L[j].sig, strict, look, similar: strict || look }); }
    pairs.sort((x, y) => x.d - y.d);
    const st = pairs.filter(p => p.strict), lk = pairs.filter(p => p.look), sim = pairs.filter(p => p.similar);
    const inSim = new Set(sim.flatMap(p => [p.a, p.b]));
    const lay = {}; L.forEach(r => { lay[r.layout] = (lay[r.layout] || 0) + 1; });
    let dsum = 0, dc = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { dsum += D[i][j]; dc++; }
    const cBad = L.filter(r => r.cmin != null && r.cmin < 4.5).map(r => r.id), nBad = L.filter(r => (r.numSus || []).length).map(r => r.id);
    /* v34.5 FB: 첫 화면 사진(hero 슬롯 · 긴 변 1200 이상, R1 H6) · 번호 단계 섹션은 유형 템플릿의 절반 이하(R1 H3) — 측정값이 없는 예전 결과는 건너뜀 */
    const pBad = L.filter(r => r.heroPh && r.heroPh.ok === false).map(r => r.id); const nNum = L.filter(r => r.numSec > 0).length; const numOver = L.some(r => r.numSec != null) && nNum * 2 > n;
    const t = res.types[ty] = { n, short: n < H.MIN_N, strict: st.length, look: lk.length, similar: sim.length, idsInSimilar: inSim.size, contrastBad: cBad, numSus: nBad, photoBad: pBad, numSec: nNum, avgDist: dc ? Math.round(dsum / dc * 10) / 10 : 0, layouts: lay, pairs };
    res.strict += st.length; res.look += lk.length; res.similar += sim.length;
    pairs.forEach(p => flat.push(Object.assign({ type: ty }, p)));
    await heat(ty, L, D, pairs); await side(ty, L, sim);
    t.pass = !t.short && !st.length && !lk.length && !cBad.length && !nBad.length && !pBad.length && !numOver;
    V.push(`${ty} ${t.pass ? 'OK' : 'NG'} ①${st.length} ②${lk.length} 대비${cBad.length} 숫자${nBad.length} 사진${pBad.length} 단계${nNum}/${n}${numOver ? '!' : ''} ${n}종${t.short ? '(15종 미만!)' : ''}`);
    console.log(`${ty}: ${n}종${t.short ? ' ⚠ 15종 미만' : ''} · ①엄격 ${st.length}짝 · ②첫 화면 닮음 ${lk.length}짝 · 유사 관련 ${inSim.size}종 · 대비 미달 ${cBad.length} · 숫자 의심 ${nBad.length} · 평균 거리 ${t.avgDist}`);
  }
  const pass = Object.values(res.types).filter(t => t.pass).length, tot = Object.keys(res.types).length;
  res.verdict = `판정 ${pass}/${tot} 통과 | ` + V.join(' | ');
  fs.writeFileSync(path.join(OUT, 'similar.json'), JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(OUT, 'similar.csv'), H.csv(flat, ['type', 'a', 'b', 'd', 'dm', 'kindsEq', 'sigEq', 'strict', 'look', 'similar']));
  fs.writeFileSync(path.join(OUT, 'verdict.txt'), res.verdict + '\n');
  console.log(`합계: ①엄격 ${res.strict}짝 · ②첫 화면 닮음 ${res.look}짝 · 유사(①∪②) ${res.similar}짝 (${rows.length}종) → ${OUT}`);
  console.log(res.verdict);
})().catch(e => { console.error(e); process.exit(1); });

/* 거리 행렬 히트맵: 진할수록 비슷함 · 빨간 테두리 = ①엄격 · 주황 테두리 = ②첫 화면 닮음 · 파란 점 = 섹션 종류 순서만 같음 */
async function heat(ty, L, D, pairs) {
  const n = L.length, c = Math.max(14, Math.min(28, Math.floor(900 / Math.max(1, n)))), lw = 210, th = 210, W = lw + n * c + 20, Hh = th + n * c + 60;
  const P = {}; pairs.forEach(p => { P[p.a + '|' + p.b] = P[p.b + '|' + p.a] = p; });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}"><rect width="100%" height="100%" fill="#fff"/>`;
  s += `<text x="10" y="24" font-size="16" font-weight="700" ${FONT}>${H.esc(ty)} — 첫 화면 dHash 거리(빨강=①엄격 ≤${TH}+구조 · 주황=②닮음 ≤${LOOK} · 점=구조만 같음)</text>`;
  L.forEach((r, i) => { s += `<text x="${lw - 6}" y="${th + i * c + c * 0.7}" font-size="${Math.min(12, c - 3)}" text-anchor="end" ${FONT}>${H.esc(r.id)}</text>`;
    s += `<text transform="translate(${lw + i * c + c * 0.7},${th - 6}) rotate(-60)" font-size="${Math.min(12, c - 3)}" ${FONT}>${H.esc(r.id)}</text>`; });
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const d = D[i][j]; const t = Math.min(1, d / 32); const g = Math.round(40 + 215 * t); const col = i === j ? '#ddd' : `rgb(${Math.round(200 + 55 * t)},${g},${g})`;
    const p = P[L[i].id + '|' + L[j].id]; s += `<rect x="${lw + j * c}" y="${th + i * c}" width="${c}" height="${c}" fill="${col}" stroke="${p && p.strict ? '#dc2626' : p && p.look ? '#f59e0b' : '#fff'}" stroke-width="${p && p.similar ? 2.5 : 0.5}"/>`;
    if (i !== j && c >= 18) s += `<text x="${lw + j * c + c / 2}" y="${th + i * c + c * 0.68}" font-size="${Math.min(10, c - 8)}" text-anchor="middle" fill="${t < 0.45 ? '#fff' : '#333'}" ${FONT}>${d}</text>`;
    if (p && p.kindsEq && !p.similar) s += `<circle cx="${lw + j * c + 3}" cy="${th + i * c + 3}" r="2" fill="#1d4ed8"/>`; }
  s += '</svg>'; await sharp(Buffer.from(s)).png().toFile(path.join(OUT, `heat_${ty}.png`));
}

/* 유사 짝 나란히 보기(한 장에 최대 8짝) */
async function side(ty, L, list) {
  const by = {}; L.forEach(r => { by[r.id] = r; }); fs.readdirSync(OUT).filter(f => f.startsWith(`pairs_${ty}_`)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  const SH = path.join(IN, 'shots'); const tw = 560, thh = 350, mw = 120, mh = 260, rowH = Math.max(thh, mh) + 46, W = (tw + mw + 24) * 2 + 40;
  for (let k = 0; k * 8 < list.length; k++) { const part = list.slice(k * 8, k * 8 + 8); const Ht = part.length * rowH + 50; const comp = [];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}"><rect width="100%" height="100%" fill="#f4f4f5"/><text x="16" y="32" font-size="20" font-weight="700" ${FONT}>${H.esc(ty)} 유사 짝 ${k * 8 + 1}–${k * 8 + part.length} / ${list.length} (①엄격 ≤${TH}+구조 · ②닮음 ≤${LOOK})</text>`;
    for (let i = 0; i < part.length; i++) { const p = part[i]; const y = 50 + i * rowH;
      [p.a, p.b].forEach((id, side) => { const x = 16 + side * (tw + mw + 24 + 8); const r = by[id] || {};
        s += `<text x="${x}" y="${y + 18}" font-size="14" font-weight="700" ${FONT}>${H.esc(id)} · ${H.esc(r.name || '')}</text><text x="${x}" y="${y + 36}" font-size="12" fill="#555" ${FONT}>${H.esc([r.layout, r.theme, r.hero || '-', 'q' + r.q].join(' · '))}${side ? `  ← 거리 ${p.d}(휴대폰 ${p.dm}) · ${p.strict && p.look ? '①②' : p.strict ? '①엄격' : '②닮음'} · 구조 ${p.kindsEq ? '같음' : '다름'}` : ''}</text>`;
        const f1 = path.join(SH, `${id}_hero.jpg`), f2 = path.join(SH, `${id}_hero_m.jpg`);
        if (fs.existsSync(f1)) comp.push({ f: f1, w: tw, h: thh, left: x, top: y + 44 }); if (fs.existsSync(f2)) comp.push({ f: f2, w: mw, h: mh, left: x + tw + 8, top: y + 44 }); }); }
    s += '</svg>';
    const ims = await Promise.all(comp.map(async c => ({ input: await sharp(c.f).resize(c.w, c.h, { fit: 'cover', position: 'top' }).toBuffer(), left: c.left, top: c.top })));
    await sharp(Buffer.from(s)).composite(ims).jpeg({ quality: 82 }).toFile(path.join(OUT, `pairs_${ty}_${k + 1}.jpg`)); }
}
