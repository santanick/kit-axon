'use strict';
/* 시각 품질 자동 점검 — 템플릿마다 게시본(학습자 홈)을 PC 1280 · 휴대폰 390으로 찍고 지표를 표로 만든다.
   사용: node tests/ui/hp-visual/run.js [--type k12[,univ]](types에 포함된 템플릿) [--ids a,b] [--out dir] [--budget 240] [--force] [--port 9830] [--all]
   - 이어서 실행: 이미 찍은 템플릿(out/rows/<id>.json)은 건너뛴다. 시간 예산(--budget 초)을 넘기면 멈추고 exit 3 → 같은 명령을 다시 실행.
   - 실행기 안에서: QA_APP=1 qa-run.sh tests/ui/hp-visual/run.js --out <dir>  (1회 280초 제한 · 기본 예산 240초)
   - 결과: out/summary.json · summary.csv · shots/<id>_{pc,m}.jpg(전체) · shots/<id>_{hero,hero_m}.jpg(첫 화면)
   - 기관 상태(--state, v34.5 FB): both(기본) = filled(공개 강좌 6 · 공지 4 · 후기 3 · 연락처) → out/, empty(빈 스튜디오) → out/empty/
       filled | empty 하나만 주면 out/에 그 상태만 찍는다(empty = 예전 도구의 점검 기관). 유사 · 판정은 out/(filled) 기준. */
const fs = require('node:fs'); const path = require('node:path');
const H = require('./lib.js');
const A = H.args(process.argv.slice(2));
const OUT0 = path.resolve(A.out || path.join(process.cwd(), 'hp-visual-out'));
const ST = String(A.state || 'both') === 'both' ? ['filled', 'empty'] : String(A.state).split(',').filter(x => H.STATES.includes(x)); if (!ST.length) { console.error('--state: both | filled | empty'); process.exit(2); }
const dirOf = st => ST.length > 1 && st !== ST[0] ? path.join(OUT0, st) : OUT0;
let OUT = OUT0, SHOT = path.join(OUT, 'shots'), ROWS = path.join(OUT, 'rows'); const useOut = st => { OUT = dirOf(st); SHOT = path.join(OUT, 'shots'); ROWS = path.join(OUT, 'rows'); [OUT, SHOT, ROWS].forEach(d => fs.mkdirSync(d, { recursive: true })); };
const BUDGET = (+A.budget || 240) * 1000; const T0 = Date.now(); const PORT = +A.port || 9830;
ST.forEach(useOut); useOut(ST[0]);
const COLS = ['state', 'id', 'type', 'name', 'layout', 'theme', 'hero', 'color', 'q', 'qMiss', 'dh', 'dh_m', 'dh2', 'dh2_m', 'gap', 'gap_m', 'sig', 'low', 'nSec', 'cmin', 'cminTxt', 'cfail', 'cfailPx', 'auditMin', 'ov_pc', 'ov_m', 'wide_m', 'emptyDom', 'ph', 'numSus', 'photos', 'stock', 'stockRatio', 'art', 'nVis', 'numSec', 'clsVis', 'emptyCls', 'imgPending', 'hpH_pc', 'hpH_m', 'errs'];

function summarize() { const rows = H.loadRows(OUT).sort((a, b) => (a.type + a.id).localeCompare(b.type + b.id));
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(rows, null, 1)); fs.writeFileSync(path.join(OUT, 'summary.csv'), H.csv(rows.map(r => Object.assign({}, r, { auditMin: r.auditMin ? r.auditMin.join(' ') : '' })), COLS)); return rows; }

(async () => {
  if (A['summary-only']) { ST.forEach(st => { useOut(st); console.log('요약', st, summarize().length); }); process.exit(0); }
  const { chromium } = H.need('playwright'); const sharp = H.need('sharp');
  const srv = await H.serve(PORT); const base = `http://127.0.0.1:${PORT}/`; const br = await chromium.launch();
  const errs = [];
  /* 템플릿 목록 */
  const p0 = await br.newPage(); await p0.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await p0.goto(base + 'index.html'); await p0.waitForFunction(() => typeof TPL !== 'undefined' && typeof siteFromTpl === 'function');
  const ALL = await p0.evaluate(() => TPL.map(t => ({ id: t.id, type: (t.types || [])[0] || '', types: t.types || [], hidden: !!t.hidden }))); await p0.close();
  const want = A.ids ? new Set(String(A.ids).split(',')) : null; const tys = A.type ? new Set(String(A.type).split(',')) : null;
  let list = ALL.filter(t => (A.all || !t.hidden) && (!want || want.has(t.id)) && (!tys || t.types.some(x => tys.has(x))));
  let done = 0, stop = false; let left = 0;
  for (const state of ST) { if (stop) break; useOut(state);
  fs.writeFileSync(path.join(OUT, 'list.json'), JSON.stringify(list));
  const todo = list.filter(t => A.force || !fs.existsSync(path.join(ROWS, t.id + '.json')));
  console.log(`[${state}] 템플릿 ${list.length}종 · 남은 ${todo.length}종 · 출력 ${OUT}`);
  const groups = {}; todo.forEach(t => { (groups[t.type] = groups[t.type] || []).push(t.id); });
  for (const [type, ids] of Object.entries(groups)) { if (stop) break;
    if (Date.now() - T0 > BUDGET - 25000) { stop = true; break; }
    const o = await H.mkOrg(br, base, type, errs, state);
    const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message.slice(0, 160))); pg.on('dialog', d => d.accept());
    await pg.setViewportSize({ width: 1280, height: 800 }); await pg.goto(base + 'learner.html?t=' + o.tid + '#home'); await pg.waitForTimeout(800);
    for (const id of ids) {
      if (Date.now() - T0 > BUDGET) { stop = true; break; }
      perr.length = 0; const t1 = Date.now();
      const r = await H.applyTpl(o.op, id); if (r.err) { console.log('건너뜀', id, r.err); continue; }
      const allowed = [...r.facts, ...r.prices];
      for (const [w, h, sfx] of [[1280, 800, 'pc'], [390, 844, 'm']]) {
        await pg.setViewportSize({ width: w, height: h });
        if (sfx === 'pc') { await pg.reload(); await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(900); }
        else await pg.waitForTimeout(500);
        const pend = await H.settle(pg); /* FIXLIST 16: 지연 불러오기 사진이 다 뜰 때까지(스크롤 · eager · decode) */
        const m = await pg.evaluate(H.MEASURE); if (sfx === 'pc') r.imgPending = pend;
        const buf = await pg.screenshot({ fullPage: true, type: 'jpeg', quality: 78 });
        fs.writeFileSync(path.join(SHOT, `${id}_${sfx}.jpg`), buf);
        const meta = await sharp(buf).metadata(); const sc = meta.width / w;
        const top = Math.min(Math.round(m.top * sc), Math.max(0, meta.height - 10)); const hh = Math.min(Math.round(h * sc), meta.height - top);
        const region = { left: 0, top, width: meta.width, height: Math.max(8, hh) };
        r[sfx === 'pc' ? 'dh' : 'dh_m'] = await H.dhash(sharp, buf, region);
        /* R2 N2(H1): 첫 화면 아래 2개 화면(두 번째 · 세 번째 화면)의 dHash — 아래 뼈대가 같은 사이트처럼 보이는지 */
        { const t2 = Math.min(top + Math.round(h * sc), Math.max(0, meta.height - 10)); const h2 = Math.min(Math.round(h * 2 * sc), meta.height - t2);
          if (h2 >= Math.round(h * sc * 0.5)) { const rg = { left: 0, top: t2, width: meta.width, height: h2 }; r[sfx === 'pc' ? 'dh2' : 'dh2_m'] = await H.dhash(sharp, buf, rg);
            await sharp(buf).extract(rg).resize(sfx === 'pc' ? 480 : 200).jpeg({ quality: 78 }).toFile(path.join(SHOT, `${id}_${sfx === 'pc' ? 'low' : 'low_m'}.jpg`)); } }
        await sharp(buf).extract(region).resize(sfx === 'pc' ? 640 : 260).jpeg({ quality: 80 }).toFile(path.join(SHOT, `${id}_${sfx === 'pc' ? 'hero' : 'hero_m'}.jpg`));
        /* R2 M6(H1): 홈페이지 안 가장 긴 빈 띠(첫 화면 아래 ~ 문서 끝 0.5화면 전) */
        try { const g = await H.blankRun(sharp, buf, w, m.top + h, Math.max(m.top + h, meta.height / sc - h * 0.5)); r[sfx === 'pc' ? 'gap' : 'gap_m'] = g.max; r[sfx === 'pc' ? 'gapAt' : 'gapAt_m'] = g.at; } catch (e) { }
        const px = m.texts.filter(x => x.bg === null); await H.pixelContrast(sharp, buf, { w }, px);
        const T = m.texts.filter(x => x.cr != null); const worst = T.slice().sort((a, b) => a.cr - b.cr);
        r['ov_' + sfx] = m.over; r['hpH_' + sfx] = m.docH; if (m.wide.length) r['wide_' + sfx] = m.wide;
        if (sfx === 'pc') { r.cmin = worst[0] ? worst[0].cr : null; r.cminTxt = worst[0] ? worst[0].t : ''; r.cfail = T.filter(x => x.cr < 4.5).length; r.cfailPx = T.filter(x => x.cr < 4.5 && x.px).length;
          r.cworst = worst.filter(x => x.cr < 4.5).slice(0, 6).map(x => [x.cr, x.t, x.px ? '사진 위' : '단색', x.fs, x.big ? '큰 글자' : '', x.box.join(',')]); r.nText = T.length;
          r.photos = m.photos.img + m.photos.bg; r.stock = m.photos.stock; r.stockRatio = r.photos ? Math.round(r.stock / r.photos * 100) / 100 : 0; r.art = m.photos.art; r.slots = m.photos.slots;
          r.emptyDom = m.empty; r.nVis = m.nVis; r.numSec = m.numSec; r.clsVis = m.clsVis; r.emptyCls = m.emptyCls; const tc = H.textChecks(m.txt, allowed); r.ph = tc.ph; r.nums = tc.nums; r.numSus = tc.numSus; r.hosts = m.hosts; }
        else { r.cmin_m = worst[0] ? worst[0].cr : null; r.cfail_m = T.filter(x => x.cr < 4.5).length; }
      }
      r.state = state; r.errs = perr.slice(0, 3); r.ms = Date.now() - t1; delete r.facts; delete r.prices;
      fs.writeFileSync(path.join(ROWS, id + '.json'), JSON.stringify(r)); done++;
      console.log('ROW', id, `q${r.q} c${r.cmin} ov${r.ov_m} 사진${r.photos} ${r.ms}ms`);
    }
    await o.ctx.close();
  }
  }
  await br.close(); srv.close();
  let rows = []; ST.forEach(st => { useOut(st); const R = summarize(); const l = list.filter(t => !fs.existsSync(path.join(ROWS, t.id + '.json'))).length; left += l; if (st === ST[0]) rows = R; if (ST.length > 1) console.log(`[${st}] 누적 ${R.length}종 · 남음 ${l}종`); });
  if (errs.length) console.log('오류', errs.slice(0, 5).join(' | '));
  console.log(`이번 ${done}종 · 누적 ${rows.length}종 · 남음 ${left}종${left ? ' — 같은 명령을 다시 실행하면 이어서 진행합니다' : ' — 완료'}`);
  process.exit(left ? 3 : 0);
})().catch(e => { console.error(e); process.exit(1); });
