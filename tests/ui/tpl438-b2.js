'use strict';
/* v43.8 B2 — 기본 템플릿 tech · kids · campus · senior 고도화(didisam/hpup-b2.js) 점검
   index.html에 태그가 들어가기 전에도 돌도록, 페이지 로드 후 hpup-b2.js를 주입한다(이미 태그가 있으면 중복 주입하지 않음).
   점검: 「어떤 일로 오셨어요?」 판 삽입 · 실제 경로 링크 · 1440/390 가로 넘침 0 · 13px 미만 0 · (390) 누르는 칸 44px · 한 글자 꺾임 0 · pageerror 0 · 대학 개인정보 문구
   사용: node tests/ui/tpl438-b2.js [shots폴더] */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
const CASES = [['tech', 'corp'], ['tech', 'adult'], ['kids', 'k12'], ['campus', 'univ'], ['senior', 'lifelong'], ['senior', 'public']];
const PV = new Map();
(async () => {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  try {
    for (const [th, ty] of CASES) { const P = `[${th} ${ty}]`;
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' });
      if (!(await p.evaluate(() => !!window.HPUP_B2))) await p.addScriptTag({ url: `${base}/hpup-b2.js` });
      await p.evaluate(ty => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg(ty, '해운대 점검 기관'); }, ty);
      await p.waitForTimeout(700);
      const g = await p.evaluate(th => { const s = siteFromTpl(tplFor(S.org.type)[0]); HPT.apply(s, th, { force: 1 }); const html = siteHTML(s, true, 'ko');
        const off = siteHTML(Object.assign({}, s, { theme: 'clean' }), true, 'ko');
        return { html, off: /hu2-who/.test(off), cls: S.classes.map(x => x.id), menus: (s.menus || []).map(m => m.id) }; }, th);
      ok(!errs.length, `${P} 스튜디오 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
      ok(/class="hu2-who"/.test(g.html) && (g.html.match(/class="hu2-who"/g) || []).length === 1, `${P} 「어떤 일로 오셨어요?」 판 1개 삽입`);
      ok(!g.off, `${P} 다른 테마(clean)에는 넣지 않음`);
      const sec = (g.html.match(/<section class="hu2-who"[\s\S]*?<\/section>/) || [''])[0]; const hrefs = [...sec.matchAll(/href="([^"]*)"/g)].map(x => x[1].replace(/&amp;/g, '&'));
      const bad = hrefs.filter(h => !(/^#login\/(my|family|mypay)$/.test(h) || h === '#join' || /^tel:|^mailto:/.test(h) || (h.startsWith('#p-m-') && g.menus.includes(h.slice(5))) || (h.startsWith('#p-c-') && g.cls.includes(h.slice(5)))));
      ok(hrefs.length >= 4 && !bad.length, `${P} 버튼 ${hrefs.length}개 모두 실제 경로 ${bad.join(' ')}`);
      if (ty === 'univ') ok(/학번 · 학과/.test(sec) && !/주민|생년월일|휴대폰 번호/.test(sec), `${P} 대학 로그인 안내는 학번 · 학과만`);
      PV.set(`${th}-${ty}.html`, g.html.replace('<head>', `<head><base href="${base}/">`));
      for (const [w, h, tag] of [[1440, 900, 'pc'], [390, 844, 'm']]) {
        const c2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SHOT ? 2 : 1 }); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
        await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await q.goto(`${base}/__pv/${th}-${ty}.html`, { waitUntil: 'load' }); await q.waitForTimeout(300);
        const m = await q.evaluate(() => { const vw = document.documentElement.clientWidth; const R = { ow: document.documentElement.scrollWidth - vw, small: [], t44: [], wrap1: [], out: [] };
          const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
          const scr = e => { for (let x = e.parentElement; x; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll') return 1; } return 0; };
          document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(''); if (!t) return;
            const fs = parseFloat(getComputedStyle(e).fontSize); const r = e.getBoundingClientRect(); if (fs < 13) R.small.push(`${e.className}:${fs}:${t.slice(0, 10)}`);
            if (r.right > vw + 1 && !scr(e)) R.out.push(t.slice(0, 10)); if (t.length >= 2 && r.width < fs * 1.6 && r.height > fs * 2.6) R.wrap1.push(t.slice(0, 10)); });
          if (vw < 600) document.querySelectorAll('a,button,summary,label').forEach(e => { if (!vis(e) || e.closest('header,nav')) return; const r = e.getBoundingClientRect(); if (r.height < 44) R.t44.push(`${e.textContent.trim().slice(0, 12)}(${Math.round(r.height)})`); });
          else document.querySelectorAll('.hu2-who a').forEach(e => { if (vis(e) && e.getBoundingClientRect().height < 44) R.t44.push(e.textContent.trim().slice(0, 12)); });
          return R; });
        ok(m.ow <= 0 && !m.out.length, `${P} ${tag} 가로 넘침 0 ${m.out.slice(0, 3).join(' | ')}`);
        ok(!m.small.length, `${P} ${tag} 13px 미만 0 ${m.small.slice(0, 3).join(' | ')}`);
        ok(!m.t44.length, `${P} ${tag} 누르는 칸 44px 이상 ${m.t44.slice(0, 4).join(' | ')}`);
        ok(!m.wrap1.length, `${P} ${tag} 한 글자 꺾임 0 ${m.wrap1.slice(0, 3).join(' | ')}`);
        ok(!e2.length, `${P} ${tag} 게시본 pageerror 0`);
        if (SHOT) await q.screenshot({ path: path.join(SHOT, `b2-${th}-${ty}-${tag}.png`) });
        await c2.close(); }
      await c.close(); }
  } finally { await browser.close(); srv.close(); }
  console.log(fails.length ? `실패 ${fails.length}` : '모두 통과'); process.exit(fails.length ? 1 : 0);
})();
