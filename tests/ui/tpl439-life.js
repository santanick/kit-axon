'use strict';
/* v43.9 평생 · 직업훈련 홈페이지 템플릿(hpv-life.js) 점검 — D4 시안 3종(현장 · 계절 매거진 · 전환)
   등록 · 갤러리 노출 · 게시 HTML 1440/390(넘침 · 13px · 44px · 한 글자 꺾임 · pageerror) · 버튼 실제 경로 · 평생교육 문구 · 데이터 없음 상태
   index.html에 태그가 없으면 이 테스트가 hpstudio.js 앞에 주입한다(태그 · ?v=는 통합 담당).
   사용: node tests/ui/tpl439-life.js [shots폴더] */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
const T = { lvworkshop: { ty: ['voc'], hero: 'lvA-hero', secs: ['lv-a-zero', 'lv-a-cards', 'lv-a-steps', 'lv-a-quote', 'lv-a-cta'] },
  lvalmanac: { ty: ['lifelong'], hero: 'lvB-hero', secs: ['lv-b-season', 'lv-b-num', 'lv-b-story', 'lv-b-quote', 'lv-b-cta'] },
  lvshift: { ty: ['voc', 'lifelong'], hero: 'lvC-hero', secs: ['lv-c-tracks', 'lv-c-big', 'lv-c-how', 'lv-c-voice', 'lv-c-cta'] } };
const IDS = Object.keys(T);
(async () => {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const tagged = /hpv-life\.js/.test(idx);
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    if (/\/index\.html$/.test(f) && !tagged) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(idx.replace(/<script src="hpstudio\.js/, '<script src="hpv-life.js"></script>\n<script src="hpstudio.js')); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const make = (p, ty, empty) => p.evaluate(([ty, empty]) => { localStorage.setItem('didisam.emptyStart', empty ? '1' : '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = !!empty; createOrg(ty, ty === 'voc' ? '한빛직업전문학교' : '해운대평생학습관'); if (empty) { S.classes = []; S.reviews = []; S.notices = []; } }, [ty, !!empty]);
  try {
    for (const ID of IDS) for (const ty of T[ID].ty) for (const empty of [false, true]) {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await make(p, ty, empty);
      const g = await p.evaluate(id => { const tp = TPL.find(t => t.id === 'prem-' + id); const s = siteFromTpl(tp); const html = siteHTML(s, true, 'ko'); let th = ''; try { th = HPT.thumb(s, id); } catch (e) { th = 'ERR ' + e.message; }
        const gal = TPL.filter(t => t.prem).map(t => t.theme);
        return { reg: HPT.has(id), inGal: gal.includes(id), fits: HPT.premFits(id), top: HPT.premFor().slice(0, 3), html, th, classIds: S.classes.map(c => c.id), menuIds: (s.menus || []).map(m => m.id).filter(Boolean), secs: s.sections.map(x => (x.data && x.data.hpt) || x.type) }; }, ID);
      const P = `[${ID} ${ty}${empty ? ' 빈 기관' : ''}]`;
      if (!empty) { ok(g.reg && g.inGal && g.fits && g.top.includes(ID), `${P} 등록 · 갤러리 · 유형 추천 앞자리(${g.top.join(' · ')})`);
        ok(g.th.includes(T[ID].hero), `${P} 갤러리 미리보기에 새 첫 화면`);
        ok(T[ID].secs.every(k => g.secs.includes(k)) && g.html.includes(T[ID].hero), `${P} 섹션 구성 ${g.secs.join(' · ')}`); }
      ok(!errs.length, `${P} 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
      for (const [w, h, tag] of [[1440, 900, 'pc'], [390, 844, 'm']]) {
        const c2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SHOT && !empty ? 2 : 1 }); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message)); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
        await q.goto(`${base}/index.html#blank`, { waitUntil: 'domcontentloaded' }).catch(() => { }); await q.setContent(g.html, { waitUntil: 'load' }).catch(() => { }); await q.waitForTimeout(400);
        const m = await q.evaluate(() => { const vw = innerWidth; const R = { ow: document.documentElement.scrollWidth - vw, small: [], t44: [], wrap1: [], out: [], secs: document.querySelectorAll('section.lv').length };
          const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
          document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(''); if (!t) return; const fs = parseFloat(getComputedStyle(e).fontSize); const r = e.getBoundingClientRect();
            if (fs < 13) R.small.push(`${e.className}:${fs}:${t.slice(0, 10)}`); if (r.right > vw + 1 || r.left < -1) R.out.push(t.slice(0, 10)); const lh = parseFloat(getComputedStyle(e).lineHeight) || fs * 1.4; if (t.length >= 2 && r.width < fs * 1.6 && r.height > lh * 1.8) R.wrap1.push(t.slice(0, 10)); });
          document.querySelectorAll('section.lv a').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.height < 44 || r.width < 44) R.t44.push(`${(e.textContent || '').trim().slice(0, 10)}:${Math.round(r.width)}x${Math.round(r.height)}`); });
          const h1 = document.querySelector('section.lv h1'); R.h1 = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0; return R; });
        ok(m.ow <= 0 && !m.out.length, `${P} ${tag} 가로 넘침 0 ${m.out.slice(0, 3).join(' | ')}`);
        ok(!m.small.length, `${P} ${tag} 13px 미만 0 ${m.small.slice(0, 3).join(' | ')}`);
        ok(!m.t44.length, `${P} ${tag} 누르는 칸 44px ${m.t44.slice(0, 3).join(' | ')}`);
        ok(!m.wrap1.length, `${P} ${tag} 한 글자 꺾임 0 ${m.wrap1.slice(0, 3).join(' | ')}`);
        ok(!e2.length, `${P} ${tag} 게시본 오류 없음`);
        ok(tag === 'pc' ? m.h1 >= 80 : m.h1 >= 36 && m.h1 <= 44, `${P} ${tag} 첫 화면 제목 ${m.h1}px`);
        if (empty) ok(m.secs >= 3, `${P} ${tag} 데이터 없음: 과정 · 숫자 덩어리는 숨기고 첫 화면 · 이야기 · 마지막 행동은 남음(섹션 ${m.secs})`);
        if (SHOT && !empty) { await q.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }); await q.waitForTimeout(500); await q.screenshot({ path: path.join(SHOT, `${ID}-${ty}-${tag}-hero.jpg`), type: 'jpeg', quality: 82 }); await q.screenshot({ path: path.join(SHOT, `${ID}-${ty}-${tag}-full.jpg`), type: 'jpeg', quality: 70, fullPage: true }); }
        await c2.close(); }
      const H = [...g.html.matchAll(/<section class="[^"]*\blv\b[\s\S]*?<\/section>/g)].map(x => x[0]).join(''); const hrefs = [...H.matchAll(/href="([^"]*)"/g)].map(x => x[1]);
      const good = h => { const a = h.match(/^#p-c-(.+)$/); if (a) return g.classIds.includes(a[1]); const n = h.match(/^#p-m-(.+)$/); if (n) return g.menuIds.includes(n[1]); return /^(#p-home|#login\/(my|cal)|tel:[\d+]+|mailto:\S+@\S+|https:\/\/www\.work24\.go\.kr)$/.test(h); };
      const bad = hrefs.filter(h => !good(h)); ok(hrefs.length >= (empty ? 4 : 8) && !bad.length, `${P} 링크 ${hrefs.length}개 모두 실제 경로 ${bad.slice(0, 3).join(' ')}`);
      if (!empty) { const txt = H.replace(/<[^>]+>/g, ' ');
        if (ty === 'voc') ok(/work24\.go\.kr/.test(H), `${P} 국비 자격 확인 → 고용24`);
        else ok(!/훈련|국비|내일배움|고용노동부|고용24/.test(txt), `${P} 평생교육: 훈련 · 국비 문구 없음`);
        ok(!/78%|92%|4,812|호텔|물류센터/.test(txt), `${P} 시안의 가상 수치 · 가상 후기 없음`);
        const n = (g.html.match(/<section class="[^"]*\blv\b/g) || []).length; ok(n >= 5 && n <= 7, `${P} 섹션 ${n}개(5~7)`); }
      await c.close(); }
  } catch (e) { fails.push('예외 ' + e.message); console.log(e); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
