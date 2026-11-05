'use strict';
/* 공통 회귀 점검: 유형·에디션별로 기관을 만들어 모든 공간을 렌더하고 스크립트 오류가 없는지 확인한다.
   사용: node tests/ui/smoke.js  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json' };
const CASES = [['univ', 'lms'], ['univ', 'lite'], ['corp'], ['public'], ['k12'], ['adult'], ['lifelong'], ['voc']];

(async () => {
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = [];
  for (const [type, ed] of CASES) {
    const label = ed ? `${type}/${ed}` : type;
    const ctx = await browser.newContext(); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    const res = await page.evaluate(async ([type, ed]) => {
      createOrg(type, '점검 기관', ed); await new Promise(ok => setTimeout(ok, 50)); render();
      const bad = []; const spaces = S.nav.ws; let tabs = 0;
      const check = id => { go(id); render(); if (document.querySelector('#main .warn') && /화면을 표시하는 중 문제가 생겼습니다/.test(document.querySelector('#main').innerText)) bad.push(id); };
      for (const w of spaces) { check(w); for (const t of (typeof wsTabs === 'function' ? wsTabs(w) : [])) { tabs++; check(t.id || t); } }
      return { type: S.org.type, ed: S.org.ed || '', spaces: spaces.length, tabs, bad };
    }, [type, ed]).catch(e => ({ crash: e.message }));
    await ctx.close();
    const ok = !errs.length && !res.crash && !res.bad.length && res.type === type && (!ed || res.ed === ed);
    console.log(`${ok ? '✓' : '✗'} ${label}`, JSON.stringify(res), errs.length ? errs.slice(0, 3) : '');
    if (!ok) fails.push(label);
  }
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await page.goto(`${base}/learner.html`, { waitUntil: 'load' }); await page.waitForTimeout(300);
  const pick = await page.evaluate(() => Array.isArray(window.LSCN_PICK));
  console.log(`${!errs.length && pick ? '✓' : '✗'} learner`, errs.slice(0, 3));
  if (errs.length || !pick) fails.push('learner');
  await browser.close(); srv.close();
  if (fails.length) { console.error('실패:', fails.join(', ')); process.exit(1); }
  console.log('✓ 공통 회귀 점검 통과');
})().catch(e => { console.error(e); process.exit(1); });
