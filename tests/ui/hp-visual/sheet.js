'use strict';
/* 유형별 모음 시트 — 첫 화면 썸네일(PC + 휴대폰) + 이름 + 계열 · 테마 · 점수 · 대비 · 사진. 유사 짝(similar.json)이 있으면 테두리: 빨강 = ①엄격, 주황 = ②첫 화면 닮음만.
   사용: node tests/ui/hp-visual/sheet.js --in <run.js 출력 폴더> [--type k12] [--cols 4] [--full]
   - --full: 첫 화면 대신 PC 전체 화면 위쪽 2400px를 세로로 길게 넣음(섹션 흐름 비교용)
   - 결과: <in>/sheets/sheet_<유형>.jpg */
const fs = require('node:fs'); const path = require('node:path');
const H = require('./lib.js'); const A = H.args(process.argv.slice(2));
const IN = path.resolve(A.in || A._[0] || 'hp-visual-out'); const OUT = path.resolve(A.out || path.join(IN, 'sheets')); const SH = path.join(IN, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const sharp = H.need('sharp');
const FONT = "font-family=\"Noto Sans CJK KR, Noto Sans KR, Pretendard, sans-serif\"";

(async () => {
  const rows = H.loadRows(IN); const want = A.type ? new Set(String(A.type).split(',')) : null;
  if (!rows.length) { console.error('행이 없습니다 — 먼저 run.js를 실행하세요:', IN); process.exit(2); }
  const SIM = {}; const sf = path.join(IN, 'similar', 'similar.json'); /* SIM[유형][id] = { st: [짝], lk: [짝] } */
  if (fs.existsSync(sf)) { const S = JSON.parse(fs.readFileSync(sf, 'utf8')); Object.entries(S.types || {}).forEach(([ty, t]) => { const m = SIM[ty] = {}; const add = (a, b, k) => { m[a] = m[a] || { st: [], lk: [] }; m[a][k].push(b); };
    (t.pairs || []).forEach(p => { if (p.strict) { add(p.a, p.b, 'st'); add(p.b, p.a, 'st'); } else if (p.look) { add(p.a, p.b, 'lk'); add(p.b, p.a, 'lk'); } }); }); }
  const full = !!A.full; const cols = +A.cols || (full ? 6 : 4);
  const tw = full ? 300 : 400, th = full ? 1000 : 250, mw = full ? 0 : 116, mh = full ? 0 : 250, cw = tw + (mw ? mw + 8 : 0) + 24, ch = th + 78;
  for (const [ty, L] of Object.entries(H.byType(rows))) { if (want && !want.has(ty)) continue; const simIds = {}; const sm = SIM[ty] || {}; Object.keys(sm).forEach(id => { simIds[id] = sm[id]; });
    const nr = Math.ceil(L.length / cols), W = cols * cw + 24, Ht = nr * ch + 70; const comp = [];
    const lays = [...new Set(L.map(r => r.layout))].length, ths = [...new Set(L.map(r => r.theme))].length;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}"><rect width="100%" height="100%" fill="#f4f4f5"/>`;
    s += `<text x="16" y="36" font-size="24" font-weight="800" ${FONT}>${H.esc(ty)} · ${L.length}종 · 계열 ${lays} · 테마 ${ths} · 유사 관련 ${L.filter(r => simIds[r.id]).length}종${L.length < H.MIN_N ? ' · ⚠ 15종 미만' : ''}</text>`;
    s += `<text x="16" y="58" font-size="13" fill="#555" ${FONT}>줄1 이름(id) · 줄2 계열 · 테마 · 첫 화면 · 품질 q · 대비 최소 c · 넘침 ov · 사진(샘플) · 빨강 테두리 = ①엄격 유사 · 주황 = ②첫 화면 닮음 · 주황 글 = 점검 미달</text>`;
    for (let i = 0; i < L.length; i++) { const r = L[i]; const x = 12 + (i % cols) * cw, y = 70 + Math.floor(i / cols) * ch;
      const bad = (r.q != null && r.q < 90) || (r.cmin != null && r.cmin < 4.5) || r.ov_m > 0 || (r.ph && r.ph.length) || (r.numSus && r.numSus.length);
      s += `<rect x="${x - 4}" y="${y - 4}" width="${cw - 16}" height="${ch - 8}" rx="6" fill="#fff" stroke="${simIds[r.id] ? (simIds[r.id].st.length ? '#dc2626' : '#f59e0b') : '#e4e4e7'}" stroke-width="${simIds[r.id] ? 3 : 1}"/>`;
      s += `<text x="${x + 4}" y="${y + th + 20}" font-size="14" font-weight="700" ${FONT}>${H.esc((r.name || '').slice(0, 22))} <tspan fill="#71717a" font-weight="400">${H.esc(r.id)}</tspan></text>`;
      s += `<text x="${x + 4}" y="${y + th + 39}" font-size="12" fill="${bad ? '#b45309' : '#3f3f46'}" ${FONT}>${H.esc([r.layout, r.theme, r.hero || '-', 'q' + r.q, 'c' + r.cmin, 'ov' + r.ov_m, `사진 ${r.photos || 0}(${r.stock || 0})`].join(' · '))}</text>`;
      if (simIds[r.id]) { const v = simIds[r.id]; s += `<text x="${x + 4}" y="${y + th + 58}" font-size="12" fill="${v.st.length ? '#dc2626' : '#d97706'}" font-weight="700" ${FONT}>${H.esc([v.st.length ? '①엄격: ' + v.st.join(', ') : '', v.lk.length ? '②닮음: ' + v.lk.join(', ') : ''].filter(Boolean).join(' / ').slice(0, 70))}</text>`; }
      const f1 = path.join(SH, full ? `${r.id}_pc.jpg` : `${r.id}_hero.jpg`), f2 = path.join(SH, `${r.id}_hero_m.jpg`);
      if (fs.existsSync(f1)) comp.push(full ? { input: await sharp(f1).resize(tw).extract({ left: 0, top: 0, width: tw, height: th }).toBuffer().catch(async () => sharp(f1).resize(tw, th, { fit: 'contain', position: 'top', background: '#ffffff' }).toBuffer()), left: x, top: y }
        : { input: await sharp(f1).resize(tw, th, { fit: 'cover', position: 'top' }).toBuffer(), left: x, top: y });
      if (mw && fs.existsSync(f2)) comp.push({ input: await sharp(f2).resize(mw, mh, { fit: 'cover', position: 'top' }).toBuffer(), left: x + tw + 8, top: y }); }
    s += '</svg>'; const f = path.join(OUT, `sheet_${ty}${full ? '_full' : ''}.jpg`);
    await sharp(Buffer.from(s)).composite(comp).jpeg({ quality: 80 }).toFile(f); console.log('시트', f, L.length + '종');
  }
})().catch(e => { console.error(e); process.exit(1); });
