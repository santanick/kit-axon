'use strict';
/* 운영자 진입 화면(로그인 · 가입) 다크 모드 글자 대비 4.5:1 — 2026-11-25 대표님 「다크 모드에서 연동 로그인 글자가 잘 안 보여」. 사용: 실서버를 띄운 뒤 node tests/ui/dark-entry.js 'http://127.0.0.1:PORT/#login' */
const { chromium } = require('playwright');
const URL = process.argv[2], OUT = process.argv[3] || '/tmp/x';
(async () => {
  const b = await chromium.launch(); const res = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) for (const view of ['login', 'signup']) {
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: 'dark' });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    if (view === 'signup') { const s = p.locator('[data-act="lv-signup"]').first(); if (await s.count()) { await s.click(); await p.waitForTimeout(400); } }
    const m = p.locator('[data-act="lv-mail"]').first(); if (await m.count()) { await m.click(); await p.waitForTimeout(300); }
    const bad = await p.evaluate(() => {
      const px = c => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
      const L = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = px(getComputedStyle(e).backgroundColor); if (c.length < 4 || c[3] > .5) return c; } return [255, 255, 255]; };
      const out = []; const root = document.getElementById('entry') || document.body;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!r.width || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .1) continue;
        const fg = px(cs.color), bg = bgOf(el); const a = L(fg), c = L(bg); const cr = (Math.max(a, c) + .05) / (Math.min(a, c) + .05);
        if (cr < 4.5) out.push({ t: t.slice(0, 30), cls: el.className && String(el.className).slice(0, 40), tag: el.tagName, fg: cs.color, bg: 'rgb(' + bg.slice(0, 3).join(',') + ')', cr: +cr.toFixed(2) }); }
      return out; });
    if (process.env.SHOT) await p.screenshot({ path: `${OUT}-${w}-${view}.png`, fullPage: true });
    res[`${w}-${view}`] = { bad, errs }; await p.close();
  }
  await b.close(); let bad = 0; for (const [k, v] of Object.entries(res)) { bad += v.bad.length + v.errs.length; console.log((v.bad.length + v.errs.length ? '✗ ' : '✓ ') + k + ' 대비 미달 ' + v.bad.length + ' · 오류 ' + v.errs.length, v.bad.length ? JSON.stringify(v.bad) : ''); } process.exit(bad ? 1 : 0);
})();
