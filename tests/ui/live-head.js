'use strict';
/* v37 운영 모드(서버 로그인) 머리 점검 — 로컬에서 운영 서버를 흉내 낸다.
   service/build-public.js와 같이 index.html의 boot.js 앞에 live.js를 넣고, /api/*는 가짜 응답(로그인한 정운영자 · 기관 문서)으로 돌려준다.
   확인: 머리(header.top) · 레일(nav.side) 어디에도 로그인 아이디(이메일) · 비밀번호 변경 · 로그아웃이 없다(PC 1280 · 휴대폰 390, 여러 화면 · 다시 그리기 후에도).
         두 기능은 설정 › 계정 카드에 있고, 로그아웃을 누르면 /api/logout을 부른다.
   사용: node tests/ui/live-head.js  (SHOT_DIR=폴더 를 주면 화면을 찍는다) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const EMAIL = 'ops-check@example.com';
const CASES = [['univ', 'lite'], ['public'], ['k12']];

(async () => {
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const f = path.join(ROOT, u === '/' ? '/index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    if (/\/index\.html$/.test(f)) { /* build-public.js와 같은 방식으로 live.js를 boot.js 앞에 넣는다 */
      const h = fs.readFileSync(f, 'utf8').replace(/<script src="boot\.js(\?v=[^"]*)?"><\/script>/, m => '<script src="live.js"></script>\n' + m).replace(/ https:\/\/api\.anthropic\.com/g, '');
      r.writeHead(200, { 'content-type': 'text/html' }); return r.end(h); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = [];
  const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  for (const [type, ed] of CASES) {
    const label = ed ? `${type}/${ed}` : type;
    /* 1) 데모 화면에서 기관 문서를 만든다(서버 /api/state가 돌려줄 문서) */
    let doc;
    { const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.route(/\/index\.html$/, async x => { const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); x.fulfill({ status: 200, contentType: 'text/html', body: h }); }); /* 데모(live.js 없음) */
      await p.goto(`${base}/index.html`, { waitUntil: 'load' });
      doc = await p.evaluate(([t, e]) => { createOrg(t, '닉 점검 기관', e); return JSON.parse(JSON.stringify(S)); }, [type, ed]); await ctx.close();
      if (doc.org.room) doc.org.room.tid = 't-check'; /* 서버 테넌트와 같은 데이터룸 */ }
    for (const vw of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const ctx = await browser.newContext({ viewport: vw }); const page = await ctx.newPage(); const errs = []; const calls = [];
      page.on('pageerror', e => errs.push(e.message));
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      let rev = 1;
      await page.route(/\/api\//, x => { const u = new URL(x.request().url()); const m = x.request().method(); calls.push(m + ' ' + u.pathname);
        const J = o => x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
        if (u.pathname === '/api/config') return J({ live: true, signup: true, ai: false, models: [] });
        if (u.pathname === '/api/me') return J({ user: { email: EMAIL, role: 'owner' }, tenant: { tid: 't-check', name: doc.org.name, type } });
        if (u.pathname === '/api/state' && m === 'GET') return J({ doc, rev });
        if (u.pathname === '/api/state') return J({ rev: ++rev, pending: 0 });
        if (u.pathname === '/api/learners/progress') return J({ lp: {} });
        return J({}); });
      await page.goto(`${base}/index.html`, { waitUntil: 'load' }); await page.waitForTimeout(500);
      const live = await page.evaluate(() => typeof LIVE !== 'undefined' && !!(LIVE.user && LIVE.tenant) && document.documentElement.classList.contains('live') && !!(S && S.org));
      ok(live, `${label} ${vw.width}: 운영 모드(live.js · 로그인 세션)로 열림`);
      const head = async where => page.evaluate(em => { const H = [...document.querySelectorAll('header.top, nav.side, .top, .side')]; const tx = H.map(h => h.innerText).join(' ');
        const vis = el => !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
        return { acct: vis(document.querySelector('#liveAcct')), email: tx.includes(em), pw: /비밀번호 변경/.test(tx), out: /로그아웃/.test(tx), btn: H.some(h => [...h.querySelectorAll('[data-act="live-pw"],[data-act="live-logout"]')].some(vis)) }; }, EMAIL);
      for (const w of ['home', 'class', 'members', 'site', 'settings', 'home']) {
        await page.evaluate(w => { try { go(w); } catch (e) { } render(); render(); }, w); await page.waitForTimeout(120);
        const h = await head(w); ok(!h.acct && !h.email && !h.pw && !h.out && !h.btn, `${label} ${vw.width} ${w}: 머리 · 레일에 아이디 · 비밀번호 변경 · 로그아웃 없음 ${JSON.stringify(h)}`);
      }
      /* 설정 › 계정에만 있다 */
      await page.evaluate(() => { go('settings'); render(); }); await page.waitForTimeout(150);
      const acc = await page.evaluate(em => { const m = document.querySelector('#main'); const tx = m ? m.innerText : ''; return { pw: !!m.querySelector('[data-act="live-pw"], [data-v="act:live-pw"]'), out: !!m.querySelector('[data-act="live-logout"], [data-v="act:live-logout"]'), email: tx.includes(em) }; }, EMAIL);
      ok(acc.pw && acc.out && acc.email, `${label} ${vw.width}: 설정 › 계정에 로그인 아이디 · 비밀번호 변경 · 로그아웃 ${JSON.stringify(acc)}`);
      if (process.env.SHOT_DIR) { await page.evaluate(() => { go('home'); render(); }); await page.waitForTimeout(150); await page.screenshot({ path: path.join(process.env.SHOT_DIR, `live-head-${type}${ed || ''}-${vw.width}.png`) }); }
      if (vw.width === 1280 && type === 'univ') { await page.evaluate(() => { go('settings'); render(); }); await page.waitForTimeout(100);
        await page.click('#main [data-act="live-logout"], #main [data-v="act:live-logout"]'); await page.waitForTimeout(400);
        ok(calls.includes('POST /api/logout'), `${label}: 설정 › 계정 [로그아웃] → POST /api/logout`); }
      ok(!errs.length, `${label} ${vw.width}: 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
      await ctx.close();
    }
  }
  await browser.close(); srv.close();
  if (fails.length) { console.error(`실패 ${fails.length}건`); process.exit(1); }
  console.log('✓ 운영 모드 머리 점검 통과');
})().catch(e => { console.error(e); process.exit(1); });
