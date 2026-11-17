'use strict';
/* v44 직업훈련 홈페이지 템플릿 10종(hp44-voc.js) 점검 — 담당 V
   등록 · g44 · 세부 유형 · 갤러리 미리보기 · 게시 HTML 1440/390(넘침 · 13px · 44px · 한 글자 꺾임 · pageerror) · 첫 화면 제목 크기 · 섹션 5~7 · 실제 경로 · 빈 기관 · 첫 화면 사진 중복 없음
   index.html에 태그가 없으면 hpstudio.js 앞에 주입한다(태그 · ?v=는 통합 담당). 캡처 때는 CDN 웹글꼴을 받는다.
   사용: node tests/ui/tpl44-voc.js [shots폴더] */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
(async () => {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const tagged = /hp44-voc\.js/.test(idx);
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    if (/\/index\.html$/.test(f) && !tagged) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(idx.replace(/<script src="hpstudio\.js/, '<script src="hp44-voc.js"></script>\n<script src="hpstudio.js')); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(SHOT && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {});
  const NET = SHOT ? /^https?:\/\/(?!127\.0\.0\.1|cdn\.jsdelivr\.net)/ : /^https?:\/\/(?!127\.0\.0\.1)/;
  const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const make = (p, empty) => p.evaluate(([empty]) => { localStorage.setItem('didisam.emptyStart', '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg('voc', '한빛직업전문학교'); if (empty) { S.classes = []; S.reviews = []; S.notices = []; S.posts = []; } }, [!!empty]);
  try {
    const c0 = await browser.newContext(); const p0 = await c0.newPage(); await p0.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p0.goto(`${base}/index.html`, { waitUntil: 'load' }); await make(p0);
    const reg = await p0.evaluate(() => { const ids = HP44_VOC.ids; return { ids, tpl: ids.map(id => TPL.find(t => t.id === 't44-' + id)).map(t => t && { g: t.g44, ty: t.types.join(','), sub: t.sub, th: HPT.has(t.theme) }), hero: ids.map(id => HP44_VOC.DEF[id].ph.hero), hk: ids.map(id => HP44_VOC.DEF[id].hk) }; });
    const IDS = reg.ids; await c0.close();
    ok(IDS.length === 10 && reg.tpl.every(t => t && t.g === 1 && t.ty === 'voc' && t.sub && t.th), `10종 등록 · g44 · types voc · 세부 유형 (${reg.tpl.map(t => t && t.sub).join(' / ')})`);
    ok(new Set(reg.hero).size === 10, `첫 화면 사진 중복 없음`); ok(new Set(reg.hk).size === 10, `첫 화면 구성 10가지(${reg.hk.join(' · ')})`);
    for (const ID of IDS) for (const empty of [false, true]) {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await make(p, empty);
      const g = await p.evaluate(id => { const tp = TPL.find(t => t.id === 't44-' + id); const s = siteFromTpl(tp); const html = siteHTML(s, true, 'ko'); let th = ''; try { th = HPT.thumb(s, id); } catch (e) { th = 'ERR ' + e.message; }
        return { html, th, fits: HPT.premFits(id), classIds: S.classes.map(c => c.id), secs: s.sections.map(x => (x.data && x.data.hpt) || x.type) }; }, ID);
      const P = `[${ID}${empty ? ' 빈 기관' : ''}]`;
      if (!empty) { ok(g.fits && g.th.includes(`v4t-${ID}`), `${P} 유형 맞춤 · 갤러리 미리보기에 새 첫 화면`); }
      ok(!errs.length, `${P} 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
      for (const [w, h, tag] of [[1440, 900, 'pc'], [390, 844, 'm']]) {
        const c2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SHOT && !empty ? 2 : 1, ignoreHTTPSErrors: true }); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message)); await q.route(NET, x => x.abort());
        await q.goto(`${base}/index.html#blank`, { waitUntil: 'domcontentloaded' }).catch(() => { }); await q.setContent(g.html, { waitUntil: 'load' }).catch(() => { }); await q.waitForTimeout(300);
        const m = await q.evaluate(() => { const vw = innerWidth; const R = { ow: document.documentElement.scrollWidth - vw, small: [], t44: [], wrap1: [], out: [], secs: document.querySelectorAll('section.v4').length };
          const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
          document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; if (e.closest('[aria-hidden="true"]')) return; const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(''); if (!t) return; const fs = parseFloat(getComputedStyle(e).fontSize); const r = e.getBoundingClientRect();
            if (fs < 13) R.small.push(`${e.className}:${fs}:${t.slice(0, 10)}`); if (r.right > vw + 1 || r.left < -1) R.out.push(t.slice(0, 10)); const lh = parseFloat(getComputedStyle(e).lineHeight) || fs * 1.4; if (t.length >= 2 && r.width < fs * 1.6 && r.height > lh * 1.8) R.wrap1.push(t.slice(0, 10)); });
          document.querySelectorAll('section.v4 a').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.height < 44 || r.width < 44) R.t44.push(`${(e.textContent || '').trim().slice(0, 10)}:${Math.round(r.width)}x${Math.round(r.height)}`); });
          const h1 = document.querySelector('section.v4 h1'); R.h1 = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0; return R; });
        ok(m.ow <= 0 && !m.out.length, `${P} ${tag} 가로 넘침 0 ${m.out.slice(0, 3).join(' | ')}`);
        ok(!m.small.length, `${P} ${tag} 13px 미만 0 ${m.small.slice(0, 3).join(' | ')}`);
        ok(!m.t44.length, `${P} ${tag} 누르는 칸 44px ${m.t44.slice(0, 3).join(' | ')}`);
        ok(!m.wrap1.length, `${P} ${tag} 한 글자 꺾임 0 ${m.wrap1.slice(0, 3).join(' | ')}`);
        ok(!e2.length, `${P} ${tag} 게시본 오류 없음 ${e2.slice(0, 1).join('')}`);
        ok(tag === 'pc' ? m.h1 >= 64 && m.h1 <= 160 : m.h1 >= 36 && m.h1 <= 64, `${P} ${tag} 첫 화면 제목 ${m.h1}px`);
        if (empty) ok(m.secs >= 3, `${P} ${tag} 데이터 없음: 과정 · 숫자 · 후기 덩어리는 숨김(남은 섹션 ${m.secs})`);
        if (SHOT && !empty) { await q.evaluate(async () => { await document.fonts.ready; document.documentElement.style.scrollBehavior = 'auto'; for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); }); await q.waitForTimeout(500);
          await q.screenshot({ path: path.join(SHOT, `${ID}-${tag}-hero.jpg`), type: 'jpeg', quality: 80 }); if (tag === 'pc') await q.screenshot({ path: path.join(SHOT, `${ID}-pc-full.jpg`), type: 'jpeg', quality: 60, fullPage: true }); }
        await c2.close(); }
      const Hh = [...g.html.matchAll(/<section class="[^"]*\bv4\b[\s\S]*?<\/section>/g)].map(x => x[0]).join(''); const hrefs = [...Hh.matchAll(/href="([^"]*)"/g)].map(x => x[1]);
      const good = h => { const a = h.match(/^#p-c-(.+)$/); if (a) return g.classIds.includes(a[1]); return /^(#courses|#my|#cal|#notice|tel:[\d+]+|https:\/\/www\.work24\.go\.kr)$/.test(h); };
      const bad = hrefs.filter(h => !good(h)); ok(hrefs.length >= (empty ? 4 : 8) && !bad.length, `${P} 링크 ${hrefs.length}개 모두 실제 경로 ${bad.slice(0, 3).join(' ')}`);
      if (!empty) { const n = (g.html.match(/<section class="[^"]*\bv4\b/g) || []).length; ok(n >= 6 && n <= 8, `${P} 첫 화면 + 섹션 ${n - 1}개(5~7)`); ok(!/78%|92%|4,812/.test(Hh), `${P} 가상 수치 없음`); }
      await c.close(); }
  } catch (e) { fails.push('예외 ' + e.message); console.log(e); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
