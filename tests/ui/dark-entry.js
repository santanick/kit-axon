'use strict';
/* 운영자 진입 화면(로그인 · 가입) 다크 모드 글자 대비 4.5:1 — 2026-11-25 대표님 「다크 모드에서 연동 로그인 글자가 잘 안 보여」.
   사용: DATABASE_URL=… node tests/ui/dark-entry.js  (주소를 주지 않으면 운영 모드 Node 서버를 직접 띄우고 끈다)
         또는 node tests/ui/dark-entry.js 'http://127.0.0.1:PORT/#login' [스크린샷 접두어]  (이미 띄운 서버)
   v49.1 개발1: 예전에는 주소 인자가 필수인 도구형이라 회귀 일괄 실행(인자 없음)에서 page.goto 오류로 실패했다(시험이 낡음).
   회귀에서 혼자 돌도록 서버 기동을 넣고, 메일 로그인 화면(lv-mail · lvMail)이 실제로 그려졌는지 확인해 빈 화면 통과를 막는다. */
const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process'); const net = require('node:net');
const { chromium } = require('playwright');
let URL = process.argv[2]; const OUT = process.argv[3] || '/tmp/x';
(async () => {
  let ch = null;
  if (!URL) {
    if (!process.env.DATABASE_URL) { console.error('✗ 환경: DATABASE_URL이 필요합니다(운영 모드 서버를 띄워 진입 화면을 확인).'); process.exit(1); }
    const SVC = path.resolve(__dirname, '../../service'); const pub = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'de-pub-'));
    cp.execFileSync(process.execPath, [path.join(SVC, 'build-public.js'), path.resolve(SVC, '../didisam'), pub], { cwd: SVC, stdio: 'ignore' });
    const port = await new Promise(k => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => k(p)); }); });
    const env = { ...process.env, COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SESSION_PEPPER: 'ci-only', PII_KEY: '0'.repeat(64), PORT: String(port), PUBLIC_DIR: pub, MFA_OFF: '1' }; delete env.SIGNUP_CODE;
    ch = cp.spawn(process.execPath, ['server/index.js'], { cwd: SVC, env, stdio: ['ignore', 'ignore', 'pipe'] }); let elog = ''; ch.stderr.on('data', d => { elog += d; });
    const B = `http://127.0.0.1:${port}`; let up = false;
    for (let i = 0; i < 150 && !up; i++) { try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } if (!up) await new Promise(k => setTimeout(k, 100)); }
    if (!up) { console.error('✗ 환경: 서버 기동 실패\n' + elog.slice(-800)); ch.kill('SIGKILL'); process.exit(1); }
    URL = B + '/#login';
  }
  const b = await chromium.launch(); const res = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) for (const view of ['login', 'signup']) {
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: 'dark' });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    if (view === 'signup') { const s = p.locator('[data-act="lv-signup"]').first(); if (await s.count()) { await s.click(); await p.waitForTimeout(400); } }
    const m = p.locator('[data-act="lv-mail"]').first(); if (await m.count()) { await m.click(); await p.waitForTimeout(300); }
    const drawn = await p.evaluate(() => !!document.getElementById('entry') && !!document.querySelector('#lvMail, [data-act="lv-mail"], #liForm'));
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
    if (!drawn) errs.push('진입 화면(메일 로그인)이 그려지지 않음'); res[`${w}-${view}`] = { bad, errs }; await p.close();
  }
  await b.close(); if (ch) ch.kill('SIGKILL'); let bad = 0; for (const [k, v] of Object.entries(res)) { bad += v.bad.length + v.errs.length; console.log((v.bad.length + v.errs.length ? '✗ ' : '✓ ') + k + ' 대비 미달 ' + v.bad.length + ' · 오류 ' + v.errs.length, v.bad.length ? JSON.stringify(v.bad) : '', v.errs.join(' | ')); } process.exit(bad ? 1 : 0);
})();
