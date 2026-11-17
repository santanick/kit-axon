'use strict';
/* v43.8 B1: 기본 테마 clean · premium · warm · official 업그레이드(didisam/hpup-b1.js) 점검
   - index.html 태그는 통합 담당이 넣으므로, 여기서는 페이지 로드 후 hpup-b1.js를 주입한다(이미 로드돼 있으면 건너뜀).
   - 각 테마를 쓰는 대표 템플릿 × PC 1440 · 휴대폰 390: 방문 안내 데스크 있음 · 가로 넘침 0 · 13px 미만 0 · (390) 누르는 칸 44px 미만 0 ·
     한 글자 꺾임 0 · pageerror 0 · 데스크 링크가 실제 학습자 경로 · 게시본(smHp)에도 데스크가 들어가고 #p- 링크가 #class/로 바뀜.
   사용: node tests/ui/tpl438-b1.js  (포트 9711~) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const CASES = [['adult', 'adult-lang', 'clean'], ['corp', 'corp-onboard', 'clean'], ['univ', 'univ-aicenter', 'premium'], ['k12', 'k12-exam', 'premium'],
  ['adult', 'adult-hobby', 'warm'], ['k12', 't1-k12-english', 'warm'], ['corp', 'corp-academy', 'official'], ['k12', 'k12-total', 'official'], ['voc', 'voc-card', 'official'], ['lifelong', 'life-city', 'official']];
const ROUTE = /^(#(courses|cal|my|badges|login|comm|fac|notice)|tel:\+?\d+|#p-c-[\w-]+)$/;
const PV = new Map();
(async () => {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  let port = 9711; for (; port < 9719; port++) { const ok = await new Promise(res => { srv.once('error', () => res(false)); srv.listen(port, '127.0.0.1', () => res(true)); }); if (ok) break; }
  const base = `http://127.0.0.1:${port}`; const browser = await chromium.launch(); const fails = []; let n = 0;
  try {
    for (const [ty, id, theme] of CASES) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(600);
      if (!(await p.evaluate(() => !!window.HPUP_B1))) await p.addScriptTag({ url: base + '/hpup-b1.js' });
      await p.evaluate(ty => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const bx = document.querySelector('#suEmpty'); if (bx) bx.checked = false; createOrg(ty, '해운대 점검 기관'); }, ty); await p.waitForTimeout(1200);
      const r = await p.evaluate(id => { const tp = TPL.find(t => t.id === id); if (!tp) return { err: 'no tpl ' + id }; const s = siteFromTpl(tp); S.site = s;
        const html = siteHTML(s); let pub = ''; try { const h2 = siteHTML(JSON.parse(JSON.stringify(s)), true, 'ko'); pub = h2; } catch (e) { pub = 'ERR ' + e.message; }
        const pubIds = S.classes.filter(c => c.open === '전체' || c.open == null).map(c => c.id); return { theme: s.theme, html, pubIds, pubDesk: /class="hu1-desk/.test(pub) }; }, id);
      if (r.err) { fails.push(`${id}: ${r.err}`); await ctx.close(); continue; }
      if (r.theme !== theme) fails.push(`${id}: 테마 ${r.theme} ≠ ${theme}`);
      if (!r.pubDesk) fails.push(`${id}: 게시본(full)에 데스크 없음`);
      const key = `${ty}-${id}.html`; PV.set(key, r.html.replace('<head>', `<head><base href="${base}/">`));
      for (const w of [1440, 390]) { n++;
        const c2 = await browser.newContext({ viewport: { width: w, height: w > 600 ? 900 : 844 }, deviceScaleFactor: w > 600 ? 1 : 2 }); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
        await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await q.goto(`${base}/__pv/${key}`, { waitUntil: 'load' }); await q.waitForTimeout(400);
        const m = await q.evaluate(mob => { const de = document.documentElement; const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
          const D = document.querySelector('.hu1-desk'); if (!D) return { noDesk: 1 };
          const links = [...D.querySelectorAll('a')].map(a => a.getAttribute('href'));
          const tiny = [...document.querySelectorAll('body *')].filter(el => vis(el) && !el.closest('[aria-hidden=true],footer,.hp-ft') && [...el.childNodes].some(x => x.nodeType === 3 && x.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13).map(el => el.textContent.trim().slice(0, 12) + '<' + el.className + '>');
          const small = mob ? [...document.querySelectorAll('main a, main button, .hu1-desk a')].filter(el => vis(el) && el.offsetParent && el.getBoundingClientRect().height < 44 && !el.closest('nav.hp-nav,header,footer,.hp-ft')).map(el => el.textContent.trim().slice(0, 12) + '<' + el.className + '>') : [...D.querySelectorAll('a')].filter(el => el.getBoundingClientRect().height < 44).map(el => el.textContent.trim().slice(0, 12));
          const narrow = [...D.querySelectorAll('b,small,time,em,h2,p')].filter(el => { if (!vis(el)) return false; const fs = parseFloat(getComputedStyle(el).fontSize); const b = el.getBoundingClientRect(); return el.textContent.trim().length >= 3 && b.height > fs * 1.9 * 3 && b.width < fs * 2.2; }).map(el => el.textContent.trim().slice(0, 10));
          const wrapT = [...D.querySelectorAll('time b,time small,.hu1-tg')].filter(el => vis(el) && (() => { const cs = getComputedStyle(el); return el.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth) > parseFloat(cs.fontSize) * 1.9; })()).map(el => el.textContent);
          const dOut = [...D.querySelectorAll('*')].filter(el => vis(el) && el.getBoundingClientRect().right > de.clientWidth + 1).length;
          return { top: D.getBoundingClientRect().top + window.scrollY, over: de.scrollWidth - de.clientWidth, links, tiny: [...new Set(tiny)].slice(0, 6), small: [...new Set(small)].slice(0, 6), narrow, wrapT, dOut }; }, w < 600);
        const tag = `${id}(${theme})@${w}`;
        if (m.noDesk) { fails.push(`${tag}: 데스크 없음`); await c2.close(); continue; }
        if (m.over > 0 || m.dOut) fails.push(`${tag}: 가로 넘침 ${m.over} / 데스크 밖 ${m.dOut}`);
        if (m.tiny.length) fails.push(`${tag}: 13px 미만 ${m.tiny.join(', ')}`);
        if (m.small.length) fails.push(`${tag}: 44px 미만 ${m.small.join(', ')}`);
        if (m.narrow.length || m.wrapT.length) fails.push(`${tag}: 꺾임 ${[...m.narrow, ...m.wrapT].join(', ')}`);
        const badL = m.links.filter(h => !ROUTE.test(h || '')); if (badL.length || m.links.length < 4) fails.push(`${tag}: 링크 ${badL.join(', ') || '부족 ' + m.links.length}`);
        const cl = m.links.filter(h => /^#p-c-/.test(h)).map(h => h.slice(5)).filter(x => !r.pubIds.includes(x)); if (cl.length) fails.push(`${tag}: 비공개 강좌 링크 ${cl.join(', ')}`);
        if (!r.pubIds.length && !m.links.includes('#login')) fails.push(`${tag}: 공개 강좌 0인데 로그인 안내 없음`);
        if (w < 600 && m.top > 1100) fails.push(`${tag}: 데스크 시작 ${Math.round(m.top)}px(1,100px 이후)`);
        if (e2.length) fails.push(`${tag}: pageerror ${e2[0]}`);
        await c2.close(); }
      if (errs.length) fails.push(`${id}: admin pageerror ${errs[0]}`);
      await ctx.close(); }
  } finally { await browser.close(); srv.close(); }
  if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
  console.log(`PASS tpl438-b1: ${CASES.length}개 템플릿 × 2폭(${n}회) — 데스크 · 넘침 0 · 13px · 44px · 꺾임 0 · 실제 경로 · 게시본 반영`);
})();
