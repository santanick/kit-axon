'use strict';
/* v37 캘린더 강화 점검(calx.js): 날짜 클릭 → 그날 일정 · 추가, 일정 추가 · 수정 · 삭제, 과정 일정 자동 표시(개강 · 종강 · 회차 · 시험 · 과제),
   월 · 주 · 목록 보기, PC 끌어서 날짜 바꾸기(직접 넣은 일정 · 회차), 홈 › 현황 달력에서 일정 상세 열기, 휴대폰 390 오류 없음.
   사용: node tests/ui/calendar-x.js  (SHOT_DIR=폴더 를 주면 화면을 찍는다) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const open = async (vw, type) => { const ctx = await browser.newContext({ viewport: vw }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(`${base}/index.html`, { waitUntil: 'load' });
    await p.evaluate(t1 => { try { localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg(t1, '캘린더 점검', t1 === 'univ' ? 'lite' : undefined); UI.calT = 'month'; UI.cxV = 'month'; go('calendar'); render(); }, type); await p.waitForTimeout(250); return { ctx, p, errs }; };
  { const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'univ');
    const auto = await p.evaluate(() => [...new Set(cxEvents().map(e => e.kind))]);
    ok(['개강', '회차', '과제', '시험'].every(k => auto.includes(k)), `과정 일정 자동 표시 — ${auto.join(' · ')}`);
    ok(await p.locator('#main .cx-month .cx-day[data-cxday]').count() >= 28, '월 보기: 날짜 칸');
    /* 날짜 클릭 → 그날 시트 */
    const d0 = await p.evaluate(() => { const y = (UI.cxD || today()).slice(0, 7); return y + '-12'; });
    await p.click(`#main .cx-day[data-cxday="${d0}"] .cx-dn`); await p.waitForTimeout(200);
    ok(await p.locator('#slSheet [data-act="cx-add"]').count() === 1, '날짜 클릭 → 그날 일정 시트 + [이 날 일정 추가]');
    await p.click('#slSheet [data-act="cx-add"]'); await p.waitForTimeout(150);
    await p.fill('#slSheet [name="cxT"]', '학사 일정 점검 회의'); await p.fill('#slSheet [name="cxS"]', '14:00'); await p.click('#slSheet [data-act="cx-save"]'); await p.waitForTimeout(250);
    const added = await p.evaluate(d => (S.calx.ev || []).find(e => e.title === '학사 일정 점검 회의' && e.date === d), d0);
    ok(!!added && added.kind === '학사 일정', `일정 추가 — 대학 일정 종류 '${added && added.kind}'`);
    ok(await p.locator(`#main .cx-day[data-cxday="${d0}"] .cx-ev`, { hasText: '학사 일정 점검 회의' }).count() === 1, '추가한 일정이 달력에 보임');
    /* 일정 클릭 → 수정 */
    await p.click(`#main .cx-day[data-cxday="${d0}"] .cx-ev:has-text("학사 일정 점검 회의")`); await p.waitForTimeout(150);
    await p.fill('#slSheet [name="cxT"]', '학사 일정 점검 회의(변경)'); await p.click('#slSheet [data-act="cx-save"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => (S.calx.ev || []).some(e => e.title === '학사 일정 점검 회의(변경)')), '일정 클릭 → 수정 저장');
    /* 끌어서 날짜 바꾸기 */
    const d1 = d0.slice(0, 8) + '19';
    await p.dragAndDrop(`#main .cx-day[data-cxday="${d0}"] .cx-ev:has-text("점검 회의")`, `#main .cx-day[data-cxday="${d1}"]`); await p.waitForTimeout(250);
    ok(await p.evaluate(d => (S.calx.ev || []).some(e => e.title.includes('점검 회의') && e.date === d), d1), `끌어서 날짜 바꾸기(직접 넣은 일정) → ${d1}`);
    const ses = await p.evaluate(() => { const e = cxEvents().find(x => x.sid && x.date.slice(0, 7) === (UI.cxD || today()).slice(0, 7)); if (!e) return null; const c = S.classes.find(c => c.id === e.cls); let d = e.date; for (let i = 1; i < 10; i++) { const n = new Date(d); n.setDate(n.getDate() + 1); d = n.toISOString().slice(0, 10); if (d.slice(0, 7) !== e.date.slice(0, 7)) return null; if (!c.sessions.some(s => s.date === d)) return { id: e.id, from: e.date, to: d }; } return null; });
    if (ses) { await p.dragAndDrop(`#main .cx-ev[data-v="${ses.id}"]`, `#main .cx-day[data-cxday="${ses.to}"]`); await p.waitForTimeout(250);
      ok(await p.evaluate(s => { const [, c, sid] = s.id.split(':'); return S.classes.find(x => x.id === c).sessions.find(x => x.id === sid).date === s.to; }, ses), `끌어서 날짜 바꾸기(회차) ${ses.from} → ${ses.to}`); }
    /* 자동 일정 상세 */
    await p.evaluate(() => { const e = cxEvents().find(x => x.kind === '개강'); UI.cxD = e.date; render(); }); await p.waitForTimeout(150);
    await p.click('#main .cx-ev:has-text("개강")'); await p.waitForTimeout(150);
    ok(await p.locator('#slSheet [data-act="cx-cls"]').count() === 1, '과정 일정 클릭 → 상세 + [과정 열기]');
    await p.evaluate(() => slClose());
    /* 삭제 */
    await p.evaluate(() => { const e = (S.calx.ev || [])[0]; UI.cxD = e.date; render(); }); await p.click('#main .cx-ev:has-text("점검 회의")'); await p.waitForTimeout(150);
    await p.click('#slSheet [data-act="cx-del"]'); await p.waitForTimeout(150); await p.click('[data-mact="ok"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !(S.calx.ev || []).length), '일정 삭제');
    /* 주 · 목록 */
    await p.click('#main [data-act="cx-view"][data-v="week"]'); await p.waitForTimeout(150); ok(await p.locator('#main .cx-week .cx-wcol').count() === 7, '주 보기 7칸');
    await p.click('#main [data-act="cx-view"][data-v="list"]'); await p.waitForTimeout(150); ok(await p.locator('#main .cx-list .cx-lr, #main .sl-empty').count() > 0, '목록 보기');
    if (process.env.SHOT_DIR) await p.screenshot({ path: path.join(process.env.SHOT_DIR, 'calx-list-1280.png') });
    /* 홈 › 현황 달력 */
    await p.evaluate(() => { go('dash'); render(); }); await p.waitForTimeout(250);
    const hasCal = await p.locator('.d26-cal').count(); if (hasCal) { const day = await p.evaluate(() => { const b = [...document.querySelectorAll('.d26-cal [data-act="d26-day"]')].find(x => x.querySelector('i')); return b && b.dataset.v; });
      if (day) { await p.click(`.d26-cal [data-act="d26-day"][data-v="${day}"]`); await p.waitForTimeout(200); await p.click('.d26-evl [data-act="cx-ev"] >> nth=0'); await p.waitForTimeout(200);
        ok(await p.locator('#slSheet').count() === 1, `홈 › 현황 달력: ${day} 일정 클릭 → 상세`); } }
    ok(!errs.length, `PC 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }
  for (const ty of ['k12', 'voc', 'corp']) { const { ctx, p, errs } = await open({ width: 390, height: 844 }, ty);
    const r = await p.evaluate(() => ({ v: document.querySelector('#main .cx-list, #main .cx-month') ? 1 : 0, w: document.documentElement.scrollWidth }));
    await p.click('#main [data-act="cx-add"] >> nth=0'); await p.waitForTimeout(150); const kinds = await p.evaluate(() => [...document.querySelectorAll('#slSheet [name="cxK"] option')].map(o => o.textContent));
    ok(r.v && r.w <= 392 && kinds.length >= 3, `${ty} 390: 캘린더 · 가로 넘침 없음(${r.w}) · 유형별 일정 종류 ${kinds.join(' · ')}`);
    if (process.env.SHOT_DIR) await p.screenshot({ path: path.join(process.env.SHOT_DIR, `calx-${ty}-390.png`) });
    ok(!errs.length, `${ty} 390 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }
  await browser.close(); srv.close();
  if (fails.length) { console.error(`실패 ${fails.length}건`); process.exit(1); }
  console.log('✓ 캘린더 점검 통과');
})().catch(e => { console.error(e); process.exit(1); });
