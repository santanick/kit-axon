'use strict';
/* v48.1 콘텐츠 마켓 다크 모드 점검(2026-11-26 대표님 「다크 모드 확인 못 함」)
   ① 정적 검사: 마켓 CSS · JS(market · market-m · lmarket .css, market · mksell · mkcp · mkops · mksam · lmarket .js)에 하드코딩 색(#hex · rgb())이 없어야 합니다.
      예외는 그림 위 글자(#fff)와 그림자 · 그림 위 덮개용 rgba(0,0,0,a)뿐입니다.
   ② 화면 검사(라이트 · 다크 × PC 1440 · 휴대폰 390): 스튜디오 market 6탭 · mksell 4탭 · mkcp 7탭 · mkops 10탭 · AI SAM 패스 대화,
      학습자 진열대 · #mk 탐색 · 필터 · 상세(시작 전 · 시작 후 · 월 상한 · 사전 승인).
      - 글자 대비 4.5:1(큰 글자 3:1) 미달 0
      - 다크에서 밝은 바탕(휘도 0.6 초과) 상자 0(그림 · [data-light] 제외)
      - 가로 넘침 0 · pageerror 0
   사용: node tests/ui/market-dark.js   캡처: SHOT=<폴더> node tests/ui/market-dark.js (배율 2, <화면>-<폭>-<light|dark>.png) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.env.SHOT || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };

/* ① 정적 검사 */
{ const files = ['market.css', 'market-m.css', 'lmarket.css', 'market.js', 'mksell.js', 'mkcp.js', 'mkops.js', 'mksam.js', 'lmarket.js'];
  const bad = [];
  for (const f of files) { const src = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g; let m;
    while ((m = re.exec(src))) { const v = m[0]; const before = src.slice(Math.max(0, m.index - 40), m.index);
      if (/^#[0-9a-fA-F]+$/.test(v) && /(&|\bid=|href=|#)$/.test(before)) continue; /* 해시 · 앵커 */
      if (/^#[0-9a-fA-F]+$/.test(v) && /['"`]$/.test(before) && !/(color|background|fill|stroke)\s*:\s*['"`]?$/.test(before)) continue; /* 문자열 속 해시(#mk 등) */
      if (/^rgba\(0,\s*0,\s*0,\s*[\d.]+\)$/.test(v)) continue; /* 그림자 · 그림 덮개 */
      if (/--mk-[a-z-]+:\s*$/.test(before)) continue; /* 그림 위 고정 색 정의(:root --mk-on-img 등 한 곳) */
      if (/^#fff(fff)?$/i.test(v) && /(color:\s*)$/.test(before)) { const ctx = src.slice(Math.max(0, m.index - 260), m.index); if (/scrim|rgba\(0,\s*0,\s*0|mk-im|mk-ov|mk-hero|mk-tv/.test(ctx)) continue; }
      if (f.endsWith('.js') && !/(color|background|fill|stroke|border)[^;'"`]{0,20}$/.test(before)) continue; /* JS 안 숫자 · 정규식 */
      bad.push(`${f}: ${v} …${before.slice(-30)}`); } }
  ok(!bad.length, `하드코딩 색 없음(토큰만 사용) ${bad.length ? bad.slice(0, 8).join(' | ') : ''}`); }

const SCAN = (rootSel, dark) => {
  const px = c => { const m = String(c).match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const L = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const mix = (top, bot) => { const a = top.length > 3 ? top[3] : 1; return [0, 1, 2].map(i => top[i] * a + bot[i] * (1 - a)); };
  const imgish = e => { for (let x = e; x; x = x.parentElement) { const cs = getComputedStyle(x); if (/url\(|gradient/.test(cs.backgroundImage) || x.tagName === 'IMG' || x.tagName === 'VIDEO' || x.hasAttribute('data-light') || (x.classList && x.classList.contains('mk-pv'))) return true; } return false; };
  const bgOf = el => { const st = []; for (let e = el; e; e = e.parentElement) { const c = px(getComputedStyle(e).backgroundColor); if (c.length > 3 && c[3] === 0) continue; st.push(c); if (c.length < 4 || c[3] >= .99) break; }
    let base = dark ? [7, 17, 12] : [255, 255, 255]; for (let i = st.length - 1; i >= 0; i--) base = mix(st[i], base); return base; };
  const roots = [...document.querySelectorAll(rootSel)]; const out = { low: [], light: [] };
  const vis = el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let x = el; x; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .15) return false; } return true; };
  for (const root of roots) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!vis(el) || imgish(el)) continue; if (el.closest('svg')) continue;
      const cs = getComputedStyle(el); const fg = px(cs.color); const bg = bgOf(el); const fgc = mix(fg, bg); const a = L(fgc), c = L(bg); const cr = (Math.max(a, c) + .05) / (Math.min(a, c) + .05);
      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400; const big = fs >= 24 || (fs >= 18.6 && fw >= 700); const need = el.closest(':disabled,[aria-disabled=true]') ? 3 : (big ? 3 : 4.5);
      if (cr < need) out.low.push({ t: t.slice(0, 24), cls: String(el.className || el.tagName).slice(0, 36), fg: cs.color, bg: 'rgb(' + bg.map(Math.round).join(',') + ')', cr: +cr.toFixed(2) }); }
    if (dark) for (const el of root.querySelectorAll('*')) { if (!vis(el) || imgish(el) || el.closest('svg')) continue; const c = px(getComputedStyle(el).backgroundColor); if (c.length > 3 && c[3] < .5) continue; const r = el.getBoundingClientRect(); if (r.width < 24 || r.height < 24) continue; if (el.matches('button,a,.btn,.lbtn,.tb-chip,[role=tab],[role=button]')) continue; /* 선택 칩 · 주 버튼의 반전 색은 설계(글자 대비는 위에서 검사) */
      if (L(c) > .6) out.light.push({ cls: String(el.className || el.tagName).slice(0, 40), bg: getComputedStyle(el).backgroundColor }); } }
  const seen = new Set(); out.low = out.low.filter(x => { const k = x.cls + x.fg + x.bg; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12); out.light = out.light.slice(0, 8);
  /* 좁은 칸 검사(휴대폰): ① 폭 48px 미만 칸에 2글자 이상이 여러 줄로 쌓임(또는 140px 미만 칸에 5줄 이상 — 2단이 남아 세로로 좁아짐) ② text-overflow로 잘린 글자 ③ ol 기본 번호 + 직접 쓴 번호 중복 */
  out.narrow = []; out.cut = []; out.dup = [];
  if (innerWidth <= 480) for (const root of roots) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t.length < 2) continue; const el = n.parentElement; if (!vis(el) || el.closest('svg')) continue;
      const rg = document.createRange(); rg.selectNodeContents(n); const lines = new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size; const box = el.getBoundingClientRect();
      if ((lines >= 2 && box.width < 48) || (lines >= 5 && box.width < 140 && t.length >= 8)) out.narrow.push({ t: t.slice(0, 16), cls: String(el.className || el.tagName).slice(0, 36), w: Math.round(box.width) }); }
    for (const el of root.querySelectorAll('*')) { if (!vis(el)) continue; const cs = getComputedStyle(el); if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) out.cut.push({ t: el.textContent.trim().slice(0, 16), cls: String(el.className || el.tagName).slice(0, 36) }); }
  }
  for (const root of roots) for (const li of root.querySelectorAll('ol > li')) { const cs = getComputedStyle(li); if (cs.listStyleType !== 'none' && vis(li) && /^\s*\d+[.)]\s/.test(li.textContent)) out.dup.push(li.textContent.trim().slice(0, 16)); }
  out.narrow = out.narrow.slice(0, 8); out.cut = out.cut.slice(0, 8); out.dup = out.dup.slice(0, 4);
  out.over = document.documentElement.scrollWidth - innerWidth; return out; };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`;
  if (SHOT) fs.mkdirSync(SHOT, { recursive: true });
  const browser = await chromium.launch(); const sum = { n: 0 };
  const check = async (p, name, w, th, sel) => { await p.waitForTimeout(60); const r = await p.evaluate(([s, d]) => (0, eval)('(' + s + ')')(d[0], d[1]), [SCAN.toString(), [sel, th === 'dark']]); sum.n++;
    const bad = r.low.length + r.light.length + (r.over > 0 ? 1 : 0) + r.narrow.length + r.cut.length + r.dup.length;
    if (bad) ok(false, `${name} ${w} ${th}: 대비 미달 ${r.low.length} · 밝은 바탕 ${r.light.length} · 넘침 ${r.over} · 좁은 칸 ${r.narrow.length} · 잘림 ${r.cut.length} · 번호 중복 ${r.dup.length} ${JSON.stringify(r.low.slice(0, 3))} ${JSON.stringify(r.light.slice(0, 2))} ${JSON.stringify(r.narrow.slice(0, 4))} ${JSON.stringify(r.cut.slice(0, 4))} ${JSON.stringify(r.dup)}`);
    if (SHOT) await p.screenshot({ path: path.join(SHOT, `${name}-${w}-${th}.png`), fullPage: true }); return !bad; };
  const STUDIO = { market: ['home', 'build', 'credit', 'ctrl', 'approve', 'cart'], mksell: ['items', 'new', 'settle', 'stat'], mkcp: ['home', 'catalog', 'price', 'optin', 'inbox', 'settle', 'promo'], mkops: ['review', 'quote', 'credit', 'close', 'dispute', 'promo', 'orig', 'rate', 'rev', 'pilot'] };
  for (const th of ['light', 'dark']) for (const w of [1440, 390]) {
    /* ── 스튜디오 ── */
    { const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: SHOT ? 2 : 1, colorScheme: th }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.addInitScript(t => { try { localStorage.setItem('didisam.theme', t); localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } }, th);
      await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.evaluate(() => { createOrg('univ', '한빛대학교', 'lite'); S.me.role = 'owner'; upgradeState(); });
      ok(await p.evaluate(t => document.documentElement.getAttribute('data-theme') === t, th), `스튜디오 ${w} data-theme=${th}`);
      let good = 0, all = 0;
      for (const [menu, tabs] of Object.entries(STUDIO)) for (const t of tabs) { await p.evaluate(([m, t]) => { UI[m] = t; go(m); render(); scrollTo(0, 0); }, [menu, t]); all++; if (await check(p, `s-${menu}-${t}`, w, th, '#main')) good++; }
      /* 상품 상세 · 확인 카드(모달) */
      const clickScan = async (pre, sel, name, scope) => { await p.evaluate(([m, t]) => { if (document.getElementById('modal')) { try { closeModal(); } catch (e) { } } UI.market = t; go(m); render(); scrollTo(0, 0); }, pre); const el = p.locator(sel).first(); if (!(await el.count())) { ok(false, `${name}: ${sel} 없음`); return; } await el.click(); await p.waitForTimeout(150); all++; if (await check(p, name, w, th, scope)) good++; };
      await clickScan(['market', 'home'], '[data-act="mk-open"]', 's-market-item', '#main');
      { const pv = p.locator('#main [data-act="mk-preview"]').first(); if (await pv.count()) { await pv.click(); await p.waitForTimeout(150); all++; if (await check(p, 's-market-preview', w, th, '#modal')) good++; } else ok(false, 's-market-item: 맛보기 버튼 없음'); }
      await clickScan(['market', 'build'], '[data-act="mk-confirm"]', 's-market-confirm', '#modal');
      await p.evaluate(() => { try { closeModal(); } catch (e) { } });
      /* AI SAM 패스 대화(규칙 엔진) */
      await p.evaluate(() => { UI.market = 'home'; go('market'); if (typeof fabOpen === 'function' && fabOpen(false)) return; ACT['chat-open'](); }); await p.waitForTimeout(200); await p.evaluate(() => chatSend('예산 3,000만 원으로 비교과 패스 구성해 줘')); await p.waitForTimeout(900);
      const has = await p.evaluate(() => { const q = document.querySelector('.mk-a-q'); return !!q && q.getBoundingClientRect().height > 0; }); ok(has, `AI SAM 패스 견적 카드 ${w} ${th}`); all++; await p.evaluate(() => { const q = document.querySelector('.mk-a-q'); if (q) q.scrollIntoView({ block: 'center' }); }); if (await check(p, 's-sam-pass', w, th, '.mk-a-q')) good++;
      ok(good === all, `스튜디오 ${w} ${th}: ${good}/${all} 화면 통과`); ok(!errs.length, `스튜디오 ${w} ${th} pageerror 없음 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
    /* ── 학습자 ── */
    { const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: SHOT ? 2 : 1, colorScheme: th }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.addInitScript(t => { try { localStorage.setItem('didisam.theme', t); sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20260001', dept: '체험학과', id: '20260001' })); localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, th);
      await p.goto(`${base}/learner.html?demo=1&app=1&mk=1#home`, { waitUntil: 'load' }); await p.waitForTimeout(900);
      const hop = async h => { await p.evaluate(x => { location.hash = x; scrollTo(0, 0); }, h); await p.waitForTimeout(380); };
      let good = 0, all = 0; const C = async (n, s) => { all++; if (await check(p, n, w, th, s)) good++; };
      await hop('#home'); await C('l-shelf', '[data-mk="pass-shelf"]');
      await hop('#mk'); await C('l-list', '#lm');
      await p.click('[data-mkl="f"][data-v="pre"]'); await p.waitForTimeout(200); await C('l-list-pre', '#lm');
      await hop('#mk/i/mp_wr01'); await C('l-item', '#lm');
      await p.click('[data-mkl="start"]'); await p.waitForTimeout(300); await C('l-item-started', '#lm');
      await hop('#mk/i/mp_en01'); await C('l-item-cap', '#lm');
      await hop('#mk/i/mp_dt01'); await C('l-item-pre', '#lm'); await p.click('[data-mkl="pre"]'); await p.waitForTimeout(300); await C('l-item-preasked', '#lm');
      ok(good === all, `학습자 ${w} ${th}: ${good}/${all} 화면 통과`); ok(!errs.length, `학습자 ${w} ${th} pageerror 없음 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  }
  await browser.close(); srv.close();
  if (fails.length) { console.error(`실패 ${fails.length}건 (검사 화면 ${sum.n})`); process.exit(1); }
  console.log(`✓ 콘텐츠 마켓 다크 모드 점검 통과(검사 화면 ${sum.n})`);
})().catch(e => { console.error(e); process.exit(1); });
