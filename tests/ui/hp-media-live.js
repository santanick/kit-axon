'use strict';
/* v34.5 이미지 업로드 /api/media 화면 연결(운영 서버 · live.js) — HPM이 있으면 바로 고치기 · AI SAM 첨부 사진을 서버에 올리고 주소만 저장한다.
   - 첫 화면 사진 올리기 → site.img.hero · banner.data.img가 '/api/media/<id>' · 편집 화면 · 게시된 학습자 홈(휴대폰 390)에서 사진이 보임
   - AI SAM [사진] 첨부 → 첨부 주소도 서버 주소, '이 사진으로 첫 화면 바꿔줘' 적용
   - 서버 저장 실패(500)면 지금처럼 data URL로 대체, HPM.list · del · dataURL
   사용: ADMIN=http://127.0.0.1:9811 node tests/ui/hp-media-live.js  (서버 PUBLIC_DIR은 build-public.js 결과 — live.js 포함) · SHOT_DIR=폴더 */
const fs = require('node:fs'); const path = require('node:path'); const zlib = require('node:zlib');
const { chromium } = require('playwright'); const A = process.env.ADMIN || 'http://127.0.0.1:9811'; const SHOT = process.env.SHOT_DIR || '';
function png(w, h, c1, c2) {
  const T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(x < w / 2 ? c1 : c2, y * (w * 3 + 1) + 1 + x * 3);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]); }
const PHOTO = { name: 'campus.png', mimeType: 'image/png', buffer: png(320, 180, [30, 90, 160], [220, 160, 60]) };
const PHOTO2 = { name: 'room.png', mimeType: 'image/png', buffer: png(240, 240, [90, 60, 140], [240, 240, 240]) };
const MED = /^\/api\/media\/tn_[a-z0-9]{8,16}\.[a-f0-9]{40}$/;
let pass = 0, fail = 0; const ok = (m, c, info) => { if (c) pass++; else fail++; console.log(`${c ? '✓' : '✗'} ${m}${!c && info != null ? ' — ' + JSON.stringify(info) : ''}`); };

(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1360, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  const email = `hpm${Date.now()}@example.com`;
  const su = await ctx.request.post(A + '/api/signup', { headers: { 'x-didisam': '1', origin: A }, data: { email, password: 'Contract2026x', orgName: '센텀 배움', type: 'adult', code: process.env.SIGNUP_CODE || '' } });
  ok('가입', su.status() === 200, su.status());
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  const ev = (f, a) => page.evaluate(f, a); const wait = ms => page.waitForTimeout(ms); const F = () => page.frameLocator('#hpeF');
  const shot = async n => { if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await page.screenshot({ path: path.join(SHOT, n + '.png') }); } };
  const frameReady = () => page.waitForFunction(() => { const f = document.getElementById('hpeF'); const d = f && f.contentDocument; return d && d.__hpi && d.querySelector('[data-hpe-f]'); }, null, { timeout: 15000 });
  try {
    await page.goto(A + '/', { waitUntil: 'load' }); await page.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant, null, { timeout: 15000 }); await wait(3000); /* 부팅(__preboot → boot.js) 끝난 뒤 기관을 만든다 */
    await ev(async () => { await createOrg('adult', '센텀 배움'); }); await page.waitForFunction(() => window.S && S.org); await wait(1500); await page.waitForFunction(() => window.S && S.org && typeof site === 'function', null, { timeout: 15000 });
    ok('HPM 운영 모드', await ev(() => !!(window.HPM && HPM.on())));
    await ev(() => { try { closeModal(); } catch (e) { } const s = site(); if (window.HPT) { HPT.apply(s, 'clean'); HPT.enrich(s); } s.ai = s.ai || { at: today(), by: 'test' }; save(); go('site'); render(); hpEdit('home'); });
    await frameReady();

    /* 1) 바로 고치기: 첫 화면 사진 */
    await F().locator('.hp-hero [data-hpi-img]').first().click(); await page.waitForSelector('#hpiImg', { state: 'visible' });
    await page.setInputFiles('#hpiImg [data-hpi-i="file"]', PHOTO);
    await page.waitForFunction(() => { const b = site().sections.find(x => x.type === 'banner'); return /^\/api\/media\//.test(b.data.img || ''); }, null, { timeout: 10000 }).catch(() => { });
    const hero = await ev(() => { const b = site().sections.find(x => x.type === 'banner'); return { d: b.data.img || '', s: ((site().img || {}).hero || {}).src || '', bytes: JSON.stringify(site()).length }; });
    ok('첫 화면 사진 → 서버 주소(data URL 아님)', MED.test(hero.d) && hero.s === hero.d, hero);
    const g = await ctx.request.get(A + hero.d); ok('주소로 이미지 조회(공개 · immutable)', g.status() === 200 && /^image\/(webp|png|jpeg)$/.test(g.headers()['content-type']) && /immutable/.test(g.headers()['cache-control'] || ''), g.status());
    await frameReady(); await wait(500);
    const shown = await ev(async u => { const d = document.getElementById('hpeF').contentDocument; const html = d.documentElement.outerHTML.includes(u);
      const im = [...d.querySelectorAll('img')].find(i => (i.getAttribute('src') || '') === u); const load = await new Promise(ok => { const t = new d.defaultView.Image(); t.onload = () => ok(t.naturalWidth); t.onerror = () => ok(0); t.src = u; });
      return { html, img: !!im && im.naturalWidth > 0, load }; }, hero.d);
    ok('편집 화면에 사진 표시(주소가 들어가고 frame 안에서 열림)', shown.html && shown.load > 0, shown); await shot('hpm-edit-hero');

    /* 2) 서버 실패 → data URL 대체 */
    const RT = /\/api\/media(\?|$)/; await page.route(RT, r => r.request().method() === 'POST' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"server","message":"x"}' }) : r.continue());
    await page.click('#hpiImg [data-hpi-i="x"]').catch(() => { });
    await F().locator('.hp-hero [data-hpi-img]').first().click(); await page.waitForSelector('#hpiImg', { state: 'visible' });
    await page.setInputFiles('#hpiImg [data-hpi-i="file"]', PHOTO2);
    await page.waitForFunction(() => /^data:image\//.test(site().sections.find(x => x.type === 'banner').data.img || ''), null, { timeout: 10000 }).catch(() => { });
    ok('서버 저장 실패 시 data URL로 대체', await ev(() => /^data:image\//.test(site().sections.find(x => x.type === 'banner').data.img || '') && !!(HPM.last && HPM.last.err)));
    await page.unroute(RT);
    await page.click('#hpe [data-act="hpe-undo"]'); await wait(500); await frameReady();
    ok('되돌리기 → 서버 주소 사진으로', await ev(() => /^\/api\/media\//.test(site().sections.find(x => x.type === 'banner').data.img || '')));
    await page.click('#hpiImg [data-hpi-i="x"]').catch(() => { });

    /* 3) AI SAM 첨부 */
    await ev(() => { if (HPE.on && typeof hpeClose === 'function') hpeClose(); go('site'); render(); }); await wait(400);
    const hasComposer = await page.$('.composer .hpi-att input');
    if (hasComposer) {
      await page.setInputFiles('.composer .hpi-att input', PHOTO2); await page.waitForFunction(() => window.HPI && HPI.att.length === 1, null, { timeout: 10000 }).catch(() => { });
      const att = await ev(() => (window.HPI && HPI.att[0]) ? HPI.att[0].url : ''); ok('AI SAM 첨부 사진 → 서버 주소', MED.test(att), att.slice(0, 60));
    } else ok('AI SAM 입력창 첨부 버튼', false, 'composer 없음');

    /* 4) HPM 함수 */
    const fn = await ev(async u => { const L = await HPM.list({ limit: 10 }); const d = await HPM.dataURL(u); const p = await HPM.put(new Blob([new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0x3e, 0x3c, 0x2f, 0x73, 0x76, 0x67, 0x3e])], { type: 'image/svg+xml' }), { name: 'a.svg' }); const del = await HPM.del(p.id); const L2 = await HPM.list(); return { n: L.n, rows: L.rows.length, d: d.slice(0, 22), p: p.mime, del: del.ok, gone: !L2.rows.some(r => r.id === p.id) }; }, hero.d);
    ok('HPM.list · dataURL · put(svg) · del', fn.n >= 2 && /^data:image\/(png|webp|jpeg);base64/.test(fn.d) && fn.p === 'image/svg+xml' && fn.del && fn.gone, fn);

    /* 5) 게시 → 학습자 홈(휴대폰 390) */
    await ev(() => { hpEdit('home'); }); await frameReady();
    await page.click('#hpe [data-act="hpe-pub"]'); await wait(2500);
    const tid = await ev(() => LIVE.tenant.tid);
    const pm = await ctx.newPage(); await pm.setViewportSize({ width: 390, height: 844 }); pm.on('pageerror', e => errs.push('learner: ' + e.message));
    await pm.goto(`${A}/learner.html?t=${tid}#home`, { waitUntil: 'load' }); await pm.waitForTimeout(2500);
    const lh = await pm.evaluate(() => { const H = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const all = H.flatMap(r => [...r.querySelectorAll('img')]); const im = all.find(i => /\/api\/media\//.test(i.getAttribute('src') || ''));
      const bg = H.some(r => [...r.querySelectorAll('*')].some(n => /\/api\/media\//.test(n.getAttribute('style') || ''))); return { img: !!im && im.naturalWidth > 0, bg, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
    ok('게시된 학습자 홈에 서버 사진', lh.img || lh.bg, lh); ok('휴대폰 390 넘침 0', lh.sw <= lh.vw + 1, lh);
    if (SHOT) await pm.screenshot({ path: path.join(SHOT, 'hpm-learner-390.png') }); await pm.close();
    ok('화면 오류 없음', !errs.length, errs.slice(0, 3));
  } catch (e) { ok('예외 없음', false, e.message); }
  await br.close(); console.log(`hp-media-live: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
