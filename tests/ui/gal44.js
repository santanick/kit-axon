'use strict';
/* v44 G — 홈페이지 템플릿 갤러리 · 마법사를 기관 유형별로(대표님 11-18 「종류도 지금 카테고리 말고 기관 유형별로」)
   ① 칩 = 대학 · 학원(초중고) · 성인 · 1인 강사 · 기업 교육 · 공공 교육원 · 평생교육 · 직업훈련 · 전체, 기본 선택은 우리 기관 유형
   ② g44: 1 템플릿만 노출(예전 템플릿 숨김) — 그 유형의 g44가 없으면 예전 목록으로 대체
   ③ 예전 템플릿을 쓰는 사이트는 그대로 동작하고 「사용 중」 카드로 보인다
   ④ 새 기관 기본 사이트 · 학사 LMS 세부 맞춤 · HPT.pick/rec · 마법사 1단계(g44 테마만) · 시안의 tpl
   g44 템플릿은 다른 요원이 만드는 중이므로 window.G44_DEMO=1(가짜 g44 = 예전 템플릿 복제 3종씩)로 확인한다.
   사용: node tests/ui/gal44.js [캡처 폴더]  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const fails = []; const ok = (name, cond, info) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' ' + JSON.stringify(info || '')}`); if (!cond) fails.push(name); };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  let port = 9861; await new Promise((res, rej) => { const tryL = () => { srv.once('error', e => { if (e.code === 'EADDRINUSE' && port < 9880) { port++; tryL(); } else rej(e); }); srv.listen(port, '127.0.0.1', res); }; tryL(); });
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const open = async (type, ed, demo, w = 1360) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    if (demo) await ctx.addInitScript(() => { window.G44_DEMO = 1; });
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.evaluate(([type, ed]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); createOrg(type, '센텀 배움 아카데미', ed); }, [type, ed]);
    await page.waitForFunction(() => window.S && S.org); await page.waitForTimeout(400);
    await page.evaluate(() => { try { closeModal(); } catch (e) { } if (typeof fabClose === 'function') try { fabClose(); } catch (e) { } });
    return { ctx, page, errs };
  };
  const gal = async page => { await page.evaluate(() => ACT['tpl-gallery']()); await page.waitForSelector('.tpd-c', { timeout: 15000 }); await page.waitForTimeout(300); };
  const state = page => page.evaluate(() => { const root = document.querySelector('#hpsGal') || document;
    return { chips: [...root.querySelectorAll('[data-k="tpdT"]')].map(b => [b.dataset.v, b.textContent.trim(), b.classList.contains('on')]),
      cards: [...root.querySelectorAll('.tpd-c:not([hidden])')].map(c => ({ v: c.dataset.v, sub: (c.querySelector('.tpd-sub') || {}).textContent || '', now: !!c.querySelector('.tpd-now') })),
      cnt: (root.querySelector('.tpd-cnt') || {}).textContent || '', sel: !!root.querySelector('#tpdSub') }; });
  const chip = async (page, v) => { const root = await page.$('#hpsGal') ? '#hpsGal ' : ''; await page.click(`${root}[data-k="tpdT"][data-v="${v}"]`); await page.waitForTimeout(350); };
  try {
    /* A. g44가 없을 때(지금 저장소 상태): 유형 칩 · 기본 선택 · 예전 목록 대체 */
    { const { ctx, page, errs } = await open('k12', undefined, false); await gal(page); const s = await state(page);
      ok('A 칩 9개(기관 유형 8 + 전체)', s.chips.length === 9 && s.chips.map(x => x[1]).join('|') === '대학|학원(초중고)|성인|1인 강사|기업 교육|공공 교육원|평생교육|직업훈련|전체', s.chips);
      ok('A 기본 선택 = 우리 기관 유형(학원 초중고)', (s.chips.find(x => x[2]) || [])[0] === 'k12', s.chips);
      ok('A g44 없음 → 예전 목록 대체 표시', s.cards.length >= 3 && s.cards.every(c => !/^t44-/.test(c.v)), s.cards.length);
      ok('A 새 기관 기본 사이트(예전 동작)', await page.evaluate(() => !!S.site.tpl && !/^t44-/.test(S.site.tpl) && siteHTML(S.site, false, 'ko').length > 1000));
      ok('A 스크립트 오류 0', !errs.length, errs); await ctx.close(); }

    /* B. G44_DEMO: 성인 기관 */
    { const { ctx, page, errs } = await open('adult', undefined, true);
      const def = await page.evaluate(() => ({ tpl: S.site.tpl, html: siteHTML(S.site, false, 'ko').length, n44: TPL.filter(t => t.g44).length, rec: HPT.rec('adult'), th: (TPL.find(t => t.id === tplFor('adult')[0].id) || {}).theme }));
      ok('B 새 기관 기본 사이트 = 그 유형 g44', /^t44-demoadult/.test(def.tpl) && def.html > 1000, def);
      ok('B HPT.rec = g44 템플릿 테마', def.rec === def.th, def);
      await gal(page); let s = await state(page);
      ok('B 기본 선택 = 성인', (s.chips.find(x => x[2]) || [])[0] === 'adult', s.chips);
      ok('B g44만 노출(예전 숨김) · 세부 유형 표시', s.cards.length === 3 && s.cards.every(c => /^t44-demoadult/.test(c.v) && c.sub), s.cards);
      ok('B 사용 중 표시(기본 사이트 템플릿)', s.cards.some(c => c.now && c.v === def.tpl), s.cards);
      if (SHOT) await page.screenshot({ path: path.join(SHOT, 'gal44-adult-pc.jpg'), type: 'jpeg', quality: 70 });
      await chip(page, 'solo'); s = await state(page);
      ok('B 1인 강사 칩 → 1인 강사 세부 유형', s.cards.length >= 1 && s.cards.every(c => /1인/.test(c.sub)), s.cards);
      await chip(page, 'corp'); s = await state(page);
      ok('B 기업 교육 칩 → 기업 g44만', s.cards.length === 3 && s.cards.every(c => /^t44-democorp/.test(c.v)), s.cards);
      await chip(page, 'all'); s = await state(page);
      ok('B 전체 칩 → g44 21종 · 세부 유형 선택 있음', s.cards.length === 21 && s.cards.every(c => /^t44-/.test(c.v)) && s.sel, [s.cards.length, s.sel]);
      await page.selectOption('#tpdSub', '조리 · 제과'); await page.waitForTimeout(350); s = await state(page);
      ok('B 세부 유형 필터', s.cards.length === 1 && s.cards[0].sub === '조리 · 제과', s.cards);
      /* 예전 템플릿을 쓰는 사이트: 그대로 동작 + 「사용 중」 카드 */
      await page.evaluate(() => { UI.tpdT = ''; UI.tpdSub = ''; S.site = siteFromTpl(TPL.find(t => t.id === 'adult-cert')); save(); UI.siteGallery = false; try { if (typeof slClose === 'function') slClose(); } catch (e) { } go('site'); render(); });
      await page.waitForTimeout(500);
      ok('B 예전 템플릿 사이트 게시본 동작', await page.evaluate(() => S.site.tpl === 'adult-cert' && siteHTML(S.site, false, 'ko').length > 1000));
      await gal(page); s = await state(page);
      ok('B 예전 템플릿 = 맨 앞 「사용 중」 카드 · 나머지는 g44', s.cards[0] && s.cards[0].v === 'adult-cert' && s.cards[0].now && s.cards.slice(1).every(c => /^t44-/.test(c.v)), s.cards);
      await chip(page, 'corp'); s = await state(page);
      ok('B 다른 유형 칩에는 예전 템플릿 없음', s.cards.every(c => c.v !== 'adult-cert'), s.cards);
      if (SHOT) { await page.setViewportSize({ width: 390, height: 844 }); await chip(page, 'adult'); await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOT, 'gal44-adult-m.jpg'), type: 'jpeg', quality: 70 });
        ok('B 휴대폰 가로 넘침 0', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
      ok('B 스크립트 오류 0', !errs.length, errs); await ctx.close(); }

    /* C. 학사 LMS: 세부 맞춤 · 대학 칩 · pick */
    { const { ctx, page, errs } = await open('univ', 'lms', true); await page.waitForTimeout(200);
      const r = await page.evaluate(() => ({ sub: (TPL.find(t => t.id === S.site.tpl) || {}).sub, kids: (G44.pick('k12', '', '유아 아이들 놀이 수업') || {}).sub, pickTh: HPT.pick('k12', '', '유아 아이들 놀이 수업'), kidsTh: (TPL.find(t => t.g44 && t.sub === '유아 · 초등 저학년') || {}).theme }));
      ok('C 학사 LMS 기관 → 「학사 LMS 강의실」 g44로 시작', r.sub === '학사 LMS 강의실', r);
      ok('C AI 추천(G44.pick · HPT.pick)이 한 줄 설명의 세부 유형을 고름', r.kids === '유아 · 초등 저학년' && r.pickTh === r.kidsTh, r);
      await gal(page); const s = await state(page);
      ok('C 대학 칩 기본 선택 · LMS 먼저', (s.chips.find(x => x[2]) || [])[0] === 'univ' && s.cards[0] && s.cards[0].sub === '학사 LMS 강의실', s);
      ok('C 스크립트 오류 0', !errs.length, errs); await ctx.close(); }

    /* D. 처음 만들기 마법사: 1단계 = 우리 유형 g44 테마, 추천 = g44, 시안의 tpl = g44 */
    { const { ctx, page, errs } = await open('corp', undefined, true);
      await page.evaluate(() => { go('site'); render(); }); await page.waitForTimeout(300);
      await page.evaluate(() => hpwOpen()); await page.waitForSelector('.hpw-th');
      const w = await page.evaluate(() => { const ids = [...document.querySelectorAll('.hpw-th')].map(e => e.dataset.v); const G = G44.list('corp').map(t => t.theme); return { ids, G, rec: HPW.st.rec, on: (document.querySelector('.hpw-th.on') || {}).dataset?.v, names: [...document.querySelectorAll('.hpw-th b')].map(b => b.textContent) }; });
      ok('D 마법사 1단계 = 기업 g44 테마만', w.ids.length >= 1 && w.ids.every(id => w.G.includes(id)), w);
      ok('D 추천 · 선택 = g44 테마(세부 유형 이름)', w.G.includes(w.rec) && w.on === w.rec && w.names.some(n => /HRD|법정|온보딩/.test(n)), w);
      await page.click('.hpw-th.on'); await page.waitForSelector('[name=hw_brief]'); await page.click('[data-hw="gen"]');
      await page.waitForFunction(() => document.querySelectorAll('.hpw-d').length === 3, null, { timeout: 30000 });
      const d = await page.evaluate(() => HPW.st.drafts.map(x => x.site.tpl));
      ok('D 시안의 tpl = 고른 g44 템플릿', d.every(v => /^t44-democorp/.test(v || '')), d);
      ok('D 스크립트 오류 0', !errs.length, errs); await ctx.close(); }
  } catch (e) { console.error(e); fails.push('예외: ' + e.message); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건: ${fails.join(' / ')}` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
