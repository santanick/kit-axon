'use strict';
/* qa7(2026-11-25) 대표님 지시: 「웹 기반의 AX 튜터는 상단 배치가 아니고 사이트의 하단 구석에 배치하여 늘 따라 다녀야 돼. 클릭하면 대화창이 나와야 되고.
   (이는 관리자 부분도 마찬가지야) 모니터 보는 쪽 우측 하단으로 배치해줘.」 + 통합 추가 기준: 홈 화면에서도 숨기지 않음, 누를 때만 열림, 홈 입력과 같은 대화가 이어짐.
   학습자 웹(1440 · 390) · 학습자 앱(390) · 스튜디오(1440 · 390) × 홈 · 다른 화면:
   우측 하단 고정 원형 버튼 1개 · 스크롤 후에도 화면 안 · 상단 중복 진입 없음 · 누르면 우측 하단 대화창(PC 카드 · 휴대폰 아래 시트) · 포커스 이동 · Esc 닫힘 · 가로 넘침 없음 · pageerror 0
   사용: node tests/ui/float-ai.js  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json' };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };

  /* 화면에 보이는 떠 있는 AI 버튼(학습자: 튜브 #tbFab 또는 #ltut .lt-fab, 스튜디오: #fabBtn) */
  const FAB = () => { const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.5 && cs.display !== 'none'; };
    const L = [...document.querySelectorAll('#fabBtn, #tbFab, #ltut .lt-fab')].filter(vis);
    const b = L[0]; if (!b) return { n: 0, label: '' }; const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); const nav = [...document.querySelectorAll('body.lapp .ap-nav, .tabbar')].find(e => e.getBoundingClientRect().height && getComputedStyle(e).position === 'fixed' && getComputedStyle(e).display !== 'none'); const nr = nav && nav.getBoundingClientRect(); /* 아래 탭 바(앱 .ap-nav · 휴대폰 웹 .tabbar) 위 */
    return { n: L.length, id: b.id || b.className.split(' ')[0], pos: cs.position, rg: Math.round(innerWidth - r.right), bg: Math.round(innerHeight - r.bottom), w: Math.round(r.width), h: Math.round(r.height), round: parseFloat(cs.borderTopLeftRadius) >= r.width / 2 - 1, inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, aboveNav: !nr || !nr.height || r.bottom <= nr.top + 1, label: b.getAttribute('aria-label') || '' }; };
  /* 머리(화면 위 140px) 안에 보이는 AI 튜터 · AI SAM 진입 단추 — 대화창 안은 제외 */
  const TOPDUP = () => [...document.querySelectorAll('button, a')].filter(e => { if (e.closest('#ltut .lt-panel, .bchat, #drawer, .tb-sheet, #tbFab, #fabBtn, #ltut .lt-fab')) return false; const t = (e.getAttribute('aria-label') || '') + ' ' + e.textContent; if (!/AI 튜터|AX 튜터|AI SAM 열기|AI SAM과|^\s*AI SAM\s*$/.test(t)) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < 140 && r.bottom > 0 && getComputedStyle(e).visibility !== 'hidden'; }).map(e => e.className || e.tagName);
  const PANEL = sel => { const vis = e => e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none'; const p = [...document.querySelectorAll(sel)].find(vis); if (!p) return null; const r = p.getBoundingClientRect(); return { rg: Math.round(innerWidth - r.right), bg: Math.round(innerHeight - r.bottom), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), focusIn: p.contains(document.activeElement), text: p.innerText.slice(0, 4000) }; };
  const scrollAll = p => p.evaluate(async () => { scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); const m = document.querySelector('#main, .bcanvas'); if (m && m.scrollHeight > m.clientHeight) m.scrollTop = m.scrollHeight; window.dispatchEvent(new Event('scroll')); await new Promise(r => setTimeout(r, 900)); });
  const over = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

  const check = async (p, K, { mob, panelSel, studio }) => {
    await p.evaluate(async () => { dispatchEvent(new Event('resize')); dispatchEvent(new Event('scroll')); await new Promise(r => setTimeout(r, 700)); }); /* 아래 탭 바 위로 올리는 자리 계산(ltPlace) · 스크롤 중 숨김이 끝난 뒤 */
    const F = await p.evaluate(FAB);
    ok(F.n === 1, `${K} 떠 있는 AI 버튼 1개(겹침 없음) — ${F.n}개 ${F.id || ''}`);
    ok(F.pos === 'fixed' && F.rg >= 8 && F.rg <= 32 && F.bg >= 8 && F.inView && F.aboveNav && F.round && F.w >= 44 && Math.abs(F.w - F.h) <= 2, `${K} 우측 하단 고정 원형 버튼 ${JSON.stringify({ pos: F.pos, rg: F.rg, bg: F.bg, w: F.w, h: F.h, round: F.round, aboveNav: F.aboveNav })}`);
    ok(studio ? /^AI SAM과 대화하기/.test(F.label) : /^AI 튜터와 대화하기/.test(F.label), `${K} aria-label 「${F.label.slice(0, 40)}」`);
    const D = await p.evaluate(TOPDUP); ok(!D.length, `${K} 상단 중복 진입 없음 ${D.join(',')}`);
    await scrollAll(p); const F2 = await p.evaluate(FAB);
    ok(F2.n === 1 && F2.inView && F2.aboveNav && Math.abs(F2.rg - F.rg) <= 1 && F2.bg <= 220, `${K} 스크롤 후에도 우측 하단 · 화면 안(아래 탭 바 · 고정 막대가 있으면 그 위로 비켜 앉음, ltPlace) ${JSON.stringify({ rg: F2.rg, bg: F2.bg, bg0: F.bg, inView: F2.inView })}`);
    ok(await over(p) <= 1, `${K} 가로 넘침 없음`);
    const before = await p.evaluate(PANEL, panelSel); ok(!before, `${K} 누르기 전에는 대화창 닫힘(자동으로 펼치지 않음)`);
    await p.focus(`#${F2.id === 'lt-fab' ? 'ltut .lt-fab' : F2.id}`).catch(() => { }); await p.keyboard.press('Enter'); await p.waitForTimeout(450);
    const P = await p.evaluate(PANEL, panelSel);
    ok(!!P, `${K} 키보드(Enter)로 대화창 열림`);
    if (P) { if (mob) ok(P.bg <= 1 && P.w >= 380 && P.top > 40, `${K} 휴대폰: 아래에서 올라온 시트 ${JSON.stringify({ bg: P.bg, w: P.w, top: P.top })}`);
      else ok(P.rg >= 8 && P.rg <= 40 && P.bg >= 8 && P.bg <= 140 && P.w >= 360 && P.w <= 420 && P.h >= 420 && P.h <= 620, `${K} PC: 우측 하단 약 400×600 카드 ${JSON.stringify({ rg: P.rg, bg: P.bg, w: P.w, h: P.h })}`);
      ok(P.focusIn, `${K} 열면 포커스가 대화창 안으로`); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    const A = await p.evaluate(PANEL, panelSel); const F3 = await p.evaluate(FAB); const fo = await p.evaluate(() => { const a = document.activeElement; return !!a && (a.id === 'fabBtn' || a.id === 'tbFab' || a.matches('#ltut .lt-fab')); });
    ok(!A && F3.n === 1, `${K} Esc로 닫힘 · 버튼 다시 보임`); ok(fo, `${K} 닫으면 포커스가 버튼으로`);
    return P;
  };

  /* ── 학습자 ── */
  const LC = [['웹 PC', 1440, 'learner.html?demo=1', 1], ['웹 휴대폰', 390, 'learner.html?demo=1', 1], ['앱', 390, 'learner.html?demo=1&app=1', 0]];
  for (const [nm, w, u, classic] of LC) for (const h of ['#home', '#my', '#courses']) {
    const K = `[학습자 ${nm} ${w} ${h}]`; const vh = w === 390 ? 844 : 900;
    const ctx = await browser.newContext({ viewport: { width: w, height: vh } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(c => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20260001', dept: '', id: '20260001' })); localStorage.setItem('didisam.app.instx', '1'); if (c) localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } }, classic);
    await p.goto(`${base}/${u}${h}`, { waitUntil: 'load' }); await p.waitForTimeout(1300);
    await p.evaluate(() => { try { LR.lp.vision = { skip: true, step: 0 }; lrender(); } catch (e) { } }); await p.waitForTimeout(500);
    const sk = await p.$('.v2-vis [data-vis="skip"], .v2-vis [data-vis="close"]'); if (sk) { await sk.click().catch(() => { }); await p.waitForTimeout(300); }
    await p.evaluate(() => scrollTo(0, 0));
    if (h === '#home') { /* 홈 입력(화면 안 튜터 바 · AI 비서)에서 물은 대화가 떠 있는 창에도 이어짐 */
      await p.evaluate(async () => { try { await ltAsk('오늘 할 일 알려줘'); } catch (e) { } }); await p.waitForTimeout(600);
      await p.evaluate(() => { if (typeof LT === 'object' && LT.open) { const x = document.querySelector('#ltut [data-tact="close"]'); if (x) x.click(); } scrollTo(0, 0); }); await p.waitForTimeout(300); }
    const P = await check(p, K, { mob: w <= 860, panelSel: '#ltut .lt-panel:not([hidden]), .tb-sheet.open' });
    if (h === '#home' && P) ok(/오늘 할 일 알려줘/.test(P.text), `${K} 홈에서 물은 대화가 대화창에 이어짐`);
    ok(!errs.length, `${K} pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await ctx.close();
  }

  /* ── 스튜디오(운영자 · AI SAM) ── */
  for (const w of [1440, 390]) for (const ws of ['home', 'dash', 'crs']) {
    const K = `[스튜디오 ${w} ${ws}]`; const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' });
    const got = await p.evaluate(async ws => { createOrg('univ', '점검 기관', 'lms'); await new Promise(r => setTimeout(r, 50)); render(); const rest = S.nav.ws.filter(x => x !== 'home'); const id = ws === 'home' ? 'home' : (S.nav.ws.includes(ws) ? ws : rest[ws === 'crs' ? 1 : 0] || rest[0]); go(id); render(); return id; }, ws); await p.waitForTimeout(600);
    if (got === 'home') { await p.evaluate(async () => { try { await chatSend('이번 주 운영 현황 요약해줘'); } catch (e) { } }); await p.waitForTimeout(900); }
    const P = await check(p, `${K.slice(0, -1)}=${got}]`, { mob: w <= 860, panelSel: '.bchat, #drawer', studio: 1 });
    if (got === 'home' && P) ok(/이번 주 운영 현황 요약해줘/.test(P.text), `${K} 홈 AI 비서 입력의 대화가 떠 있는 대화창에 이어짐`);
    ok(!errs.length, `${K} pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
