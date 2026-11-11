'use strict';
/* v37 클릭 후 스크롤이 맨 위로 튀지 않는지(대표님 2026-11-10 '해당 페이지 부분에 고정되어 있어야 돼').
   대표 화면 20곳 이상(대학 · 학원 · 기업, 샘플 데이터)에서 화면 중간으로 스크롤한 뒤 화면 안 버튼(탭 · 칩 · 스위치 · 펼치기 등, 다른 화면으로 가는 이동 제외)을
   눌러 클릭 전후 스크롤 위치(PC: #main 상자, 휴대폰: 창 scrollY)가 같은지 본다. 사용: node tests/ui/scroll-keep.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const PLAN = [['univ', 'lite', ['dash', 'class', 'members', 'enroll', 'board', 'community', 'message', 'settings', 'clib', 'cert', 'calendar', 'auto', 'docs', 'admins', 'academic']],
  ['k12', '', ['crmstu', 'crmatt', 'crmex', 'crmbill', 'site', 'settings', 'calendar']], ['corp', '', ['compliance', 'cpl', 'members', 'auto', 'dash']], ['adult', '', ['sales', 'class']]];
const SKIP = /^(go|chat-q|chat-open|chat-close|cls-open|mem-open|ux-find|sl-close|reset-all|data-export|live-|cx-full|nav|sl-cn|sl-set|sx-sub|bk-open|cn-open|dg-edit|site-open|hp-open|tab|slg-open)$/; /* slg-open: 화면 가이드(모든 화면 공통) — 화면마다 다른 버튼을 재려고 뺀다 */
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; let screens = 0, clicks = 0;
  for (const vw of [{ width: 1280, height: 720 }, { width: 390, height: 760 }]) for (const [type, ed, list] of PLAN) {
    const ctx = await browser.newContext({ viewport: vw }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(`${base}/index.html`, { waitUntil: 'load' });
    await p.evaluate(([t1, e1]) => { try { localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg(t1, '스크롤 점검', e1 || undefined); }, [type, ed]);
    for (const s of list) {
      const r = await p.evaluate(async ([s, SKIPs]) => { const SK = new RegExp(SKIPs); const wait = ms => new Promise(ok => setTimeout(ok, ms));
        try { go(s); } catch (e) { return { s, err: e.message }; } render(); await wait(120);
        const M = () => document.getElementById('main'); const win = getComputedStyle(M()).overflowY === 'visible' || M().scrollHeight <= M().clientHeight + 4;
        const SY = () => win ? scrollY : M().scrollTop; const ST = y => win ? scrollTo(0, y) : (M().scrollTop = y); const room = win ? document.documentElement.scrollHeight - innerHeight : M().scrollHeight - M().clientHeight;
        if (room < 240) return { s, short: room };
        const key = () => `${CUR.ws}/${CUR.tab}`; const head = () => { const h = [...M().querySelectorAll('.sl-h h2, h1, h2')].find(x => x.offsetParent); return h ? h.textContent.replace(/[\d\s,.·()]/g, '').slice(0, 20) : ''; };
        const sel = el => `#main [data-act="${el.dataset.act}"]${el.dataset.v != null ? `[data-v="${CSS.escape(el.dataset.v)}"]` : ''}`;
        const C = [...M().querySelectorAll('[data-act]')].filter(e => !SK.test(e.dataset.act) && e.offsetParent && !e.disabled && !e.closest('a[href]:not([href="#"])')).map(sel).filter((x, i, a) => a.indexOf(x) === i).slice(0, 6);
        const out = []; for (const q of C) { if (out.filter(x => x.ok != null).length >= 3) break; go(s); render(); await wait(40); const el = document.querySelector(q); if (!el) continue;
          const top = el.getBoundingClientRect().top - (win ? 0 : M().getBoundingClientRect().top) + SY(); ST(Math.max(120, Math.min(room - 10, top - 200))); await wait(40); const y1 = SY(); if (y1 < 100) continue;
          const k0 = key(), h0 = head(); el.click(); await wait(160); const y2 = SY(); const nav = key() !== k0 || head() !== h0;
          document.querySelectorAll('#slSheet').forEach(x => x.remove()); try { closeModal(); } catch (e) { }
          const room2 = win ? document.documentElement.scrollHeight - innerHeight : M().scrollHeight - M().clientHeight; /* 내용이 줄어 끝까지 당겨진 경우는 튐이 아니다 */
          if (nav) continue; out.push({ q: q.replace('#main ', ''), y1, y2, ok: Math.abs(y2 - y1) <= 4 || (room2 < y1 && y2 >= room2 - 4) }); }
        return { s, win, n: out.length, bad: out.filter(x => !x.ok), sample: out[0] }; }, [s, SKIP.source]);
      if (r.err || r.short != null || !r.n) { console.log(`· ${vw.width} ${type} ${s}: 측정 안 함 ${JSON.stringify(r)}`); continue; }
      screens++; clicks += r.n; const ok = !r.bad.length; console.log(`${ok ? '✓' : '✗'} ${vw.width} ${type} ${s}: ${r.n}번 클릭 ${r.win ? '창' : '#main'} 스크롤 유지 ${ok ? JSON.stringify(r.sample) : JSON.stringify(r.bad)}`);
      if (!ok) fails.push(`${vw.width} ${type} ${s}`);
    }
    if (errs.length) { console.log(`✗ ${vw.width} ${type}: 스크립트 오류 ${errs.slice(0, 2).join(' | ')}`); fails.push(`${type} errors`); }
    await ctx.close();
  }
  /* v38 F5: 390 원생 화면 [전체 원생 현황 엑셀](ops-xls) 고정 — 화면을 다시 그린 직후(40ms) 스크롤해 누르면 늦은 스크롤 복원(60ms)이 예전 위치로 되돌리던 간헐 실패 */
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 760 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(`${base}/index.html`, { waitUntil: 'load' });
    await p.evaluate(() => { try { localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg('k12', '스크롤 점검'); });
    const R = await p.evaluate(async () => { const wait = ms => new Promise(ok => setTimeout(ok, ms)); const out = []; go('crmstu'); render(); await wait(120);
      for (const y0 of [284, 120, 400, 185, 300]) { scrollTo(0, y0); await wait(30); go('crmstu'); render(); await wait(40); const el = document.querySelector('#main [data-act="ops-xls"]'); if (!el) return ['no ops-xls'];
        const top = el.getBoundingClientRect().top + scrollY; scrollTo(0, Math.max(120, top - 200)); await wait(5); const y1 = scrollY; el.click(); await wait(160); out.push([y1, scrollY]); }
      return out; });
    const bad = Array.isArray(R[0]) ? R.filter(([a, b]) => Math.abs(a - b) > 4) : R; clicks += R.length;
    console.log(`${bad.length ? '✗' : '✓'} 390 k12 crmstu [전체 원생 현황 엑셀] 고정 5번: ${JSON.stringify(R)}`); if (bad.length || errs.length) fails.push('390 k12 ops-xls 고정');
    await ctx.close(); }
  await browser.close(); srv.close();
  console.log(`측정 화면 ${screens}곳 · 클릭 ${clicks}번`);
  if (screens < 20) fails.push(`측정 화면 ${screens}곳(20곳 미만)`);
  if (fails.length) { console.error('실패:', fails.join(', ')); process.exit(1); }
  console.log('✓ 클릭 후 스크롤 위치 유지 점검 통과');
})().catch(e => { console.error(e); process.exit(1); });
