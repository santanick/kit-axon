'use strict';
/* v34.5 화면에서 바로 고치기 · AI SAM 사진 첨부 점검(키 없이 · 규칙)
   - 글자: 첫 화면 제목을 눌러 고치기 → 떠 있는 툴바로 글꼴(이 글자만 · 사이트 제목) · 크기 · 굵게 · 색(대비 자동 보정) · 정렬 → 데이터(sty · font) 저장 → 되돌리기
   - 게시본: [게시하기] 뒤 학습자 홈(Shadow DOM)에 같은 글꼴 · 색 · 크기가 나오는지, 휴대폰 390 가로 넘침 0
   - 사진: 첫 화면 자리 클릭 → 패널 → 작은 PNG 올리기 · 맞춤 · 초점 끌기 · 대체 텍스트 · 지우기, 끌어다 놓기, 이미지 섹션, 로고 올리기 → 색 2개 제안 → 맞추기
   - AI SAM: [사진] 첨부 → 의도 7종(첫 화면 · 로고+색 · 강사 소개 · 갤러리 · 브로슈어 문서 · 첫 화면 짧게 · 폰트) 계획 카드 → 미리보기 → 적용 → 되돌리기, 무관한 말은 가로채지 않음
   - 바로 고치기 '말로 고치기': 선택한 글자 '더 짧게 · 굵게', 사진 패널 + 📎 첨부 '이 사진으로 바꿔줘'
   사용: node tests/ui/hp-edit.js  (필요: playwright) · SHOT_DIR=폴더 를 주면 스크린샷을 남긴다 */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const zlib = require('node:zlib');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json', '.svg': 'image/svg+xml' };
const SHOT = process.env.SHOT_DIR || '';

/* 작은 PNG(가로 절반씩 두 색) */
function png(w, h, c1, c2) {
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const c = x < w / 2 ? c1 : c2; raw.set(c, y * (w * 3 + 1) + 1 + x * 3); } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
const PHOTO = { name: 'campus.png', mimeType: 'image/png', buffer: png(320, 180, [30, 90, 160], [220, 160, 60]) };
const LOGO = { name: 'logo.png', mimeType: 'image/png', buffer: png(120, 60, [196, 30, 58], [20, 120, 90]) };
const PHOTO2 = { name: 'room.png', mimeType: 'image/png', buffer: png(240, 240, [90, 60, 140], [240, 240, 240]) };
const BROCHURE = { name: 'brochure.txt', mimeType: 'text/plain', buffer: Buffer.from('센텀 배움 아카데미 안내서\n\n센텀 배움 아카데미는 직장인을 위한 저녁 실무 교육을 운영합니다. 수업은 소수 정원으로 진행하고 과제마다 강사가 직접 피드백합니다.\n\n• 실무 중심: 회사에서 바로 쓰는 과제\n• 소수 정원: 한 반 12명 이내\n• 1:1 피드백: 과제마다 강사 코멘트\n') };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  const R = []; const ok = (name, cond, info) => { R.push([name, !!cond, info]); console.log(`${cond ? '✓' : '✗'} ${name}${info != null && !cond ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`); };
  const shot = async (n, el) => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await (el || page).screenshot({ path: path.join(SHOT, n + '.png') }); };
  const ev = (f, a) => page.evaluate(f, a); const wait = ms => page.waitForTimeout(ms);
  const F = () => page.frameLocator('#hpeF');
  const frameReady = async () => { await page.waitForFunction(() => { const f = document.getElementById('hpeF'); const d = f && f.contentDocument; return d && d.__hpi && d.querySelector('[data-hpe-f]'); }, null, { timeout: 15000 }); };
  try {
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await ev(() => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); createOrg('adult', '센텀 배움 아카데미'); });
    await page.waitForFunction(() => window.S && S.org); await wait(400);
    await ev(() => { try { closeModal(); } catch (e) { } if (typeof fabClose === 'function') try { fabClose(); } catch (e) { } const s = site(); if (window.HPT) { HPT.apply(s, 'clean'); HPT.enrich(s); } s.ai = s.ai || { at: today(), by: 'test' }; save(); go('site'); render(); hpEdit('home'); });
    await frameReady();
    ok('바로 고치기 열림 · 사진 자리 표시', await ev(() => document.getElementById('hpeF').contentDocument.querySelectorAll('[data-hpi-img]').length >= 2));

    /* ── 1) 글자 고치기 + 툴바 ── */
    const h1 = F().locator('.hp-hero h1[data-hpe-f]').first(); await h1.click(); await page.waitForSelector('#hpiTb', { state: 'visible' });
    ok('글자를 누르면 떠 있는 툴바', await page.isVisible('#hpiTb [data-hpi="ff"]'));
    await page.keyboard.type('함께 배우는 저녁 교실'); await page.keyboard.press('Enter'); await wait(300); await frameReady();
    const t1 = await ev(() => site().sections.find(x => x.type === 'banner').data.title); ok('글자 수정 저장', t1 === '함께 배우는 저녁 교실', t1);
    await F().locator('.hp-hero h1[data-hpe-f]').first().click(); await page.waitForSelector('#hpiTb', { state: 'visible' });
    await page.click('#hpiTb [data-hpi="ff"]'); await page.waitForSelector('#hpiTb .hpi-ffl'); const nf = await page.$$eval('#hpiTb [data-hpi="ffv"]', L => L.map(b => b.querySelector('span').style.fontFamily));
    ok('글꼴 후보 6개(각 글꼴로 미리 보기)', nf.length === 6 && new Set(nf).size === 6, nf.length);
    await shot('hpe-toolbar-font');
    await page.click('#hpiTb [data-hpi="ffv"][data-v="serif"]'); await wait(400); await frameReady();
    const sty = () => ev(() => { const b = site().sections.find(x => x.type === 'banner'); return (b.data.sty || {}).title || null; });
    ok('이 글자만 글꼴(명조) → data.sty', (await sty() || {}).ff === 'serif', await sty());
    await page.click('#hpiTb [data-hpi="sz"][data-v="1"]'); await wait(350); await page.click('#hpiTb [data-hpi="fw"]'); await wait(350);
    let st = await sty(); ok('크기 L · 굵게 저장', st && st.fs === 1.25 && st.b >= 30 && st.fw === 800, st);
    await page.click('#hpiTb [data-hpi="al"]'); await page.click('#hpiTb [data-hpi="alv"][data-v="center"]'); await wait(350);
    await page.click('#hpiTb [data-hpi="c"]'); await page.fill('#hpiTb [data-hpi="cin"]', '#ffee88'); await wait(400);
    st = await sty(); const cr = await ev(c => { const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const L = h => { const c2 = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c2[0] + .7152 * c2[1] + .0722 * c2[2]; };
      const f = document.getElementById('hpeF'); const el = f.contentDocument.querySelector('.hp-hero h1'); let n = el, bg = '#ffffff'; while (n) { const m = getComputedStyle(n).backgroundColor.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/); if (m && (m[4] == null || +m[4] > .5)) { bg = '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join(''); break; } n = n.parentElement; }
      const x = L(c), y = L(bg); return { r: (Math.max(x, y) + .05) / (Math.min(x, y) + .05), bg }; }, (st && st.c) || '#ffee88');
    ok('정렬 가운데 · 낮은 대비 색은 4.5:1로 자동 보정', st && st.al === 'center' && st.c && st.c !== '#ffee88' && cr.r >= 4.5, { st, cr });
    const inl = await ev(() => document.getElementById('hpeF').contentDocument.querySelector('.hp-hero h1').getAttribute('style') || '');
    ok('편집 화면에 인라인 스타일 반영', /font-family/.test(inl) && /clamp\(/.test(inl) && /font-weight: ?800/.test(inl), inl);
    await page.click('#hpiTb [data-hpi="ff"]'); await page.click('#hpiTb [data-hpi="ffs"][data-v="b"]'); await page.click('#hpiTb [data-hpi="ffv"][data-v="round"]'); await wait(400);
    ok('사이트 본문 글꼴(둥근) → S.site.font.b', await ev(() => (site().font || {}).b === 'round'));
    const nUndo = await ev(() => HPE.undo.length); await page.click('#hpe [data-act="hpe-undo"]'); await wait(400); await frameReady();
    ok('되돌리기(HPE.undo) 한 단계', await ev(n => !(site().font || {}).b && HPE.undo.length === n - 1, nUndo));
    await ev(() => { site().font = { b: 'round' }; save(); });

    /* ── 2) 게시본 반영(학습자 홈 · 휴대폰 390) ── */
    await page.click('#hpe [data-act="hpe-pub"]'); await wait(500);
    const pub = await ev(() => { const hp = S.lsite && S.lsite.pub && S.lsite.pub.hp; return { home: !!hp && /Noto Serif KR/.test(hp.home || ''), css: !!hp && /hpimg font/.test(hp.css || ''), tid: DREG.cur() }; });
    ok('게시본 HTML · CSS에 요소 스타일 · 사이트 글꼴', pub.home && pub.css, pub);
    const pm = await ctx.newPage(); pm.on('pageerror', e => errs.push('learner: ' + e.message)); await pm.setViewportSize({ width: 390, height: 844 });
    await pm.goto(`${base}/learner.html?t=${pub.tid}#home`, { waitUntil: 'load' }); await pm.waitForTimeout(1500);
    const lh = await pm.evaluate(() => { const H = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const h1 = H.map(r => r.querySelector('.hp-hero h1')).find(Boolean); const cs = h1 ? getComputedStyle(h1) : null;
      const vw = document.documentElement.clientWidth; return { ff: cs ? cs.fontFamily : '', fw: cs ? cs.fontWeight : '', fs: cs ? parseFloat(cs.fontSize) : 0, sw: document.documentElement.scrollWidth, vw, hw: h1 ? Math.round(h1.getBoundingClientRect().right) : 0 }; });
    ok('학습자 홈에 같은 글꼴 · 굵기', /Noto Serif KR/.test(lh.ff) && +lh.fw >= 800, lh);
    ok('휴대폰 390 넘침 0(큰 제목은 clamp로 줄어듦)', lh.sw <= lh.vw + 1 && lh.hw <= lh.vw + 1 && lh.fs > 0 && lh.fs < 48, lh);
    await pm.close();

    /* ── 3) 사진: 첫 화면 자리 클릭 → 패널 ── */
    await page.keyboard.press('Escape').catch(() => { });
    await ev(() => { if (!HPE.on) hpEdit('home'); }); await frameReady();
    await F().locator('.hp-hero [data-hpi-img]').first().click(); await page.waitForSelector('#hpiImg', { state: 'visible' });
    ok('첫 화면 자리 누르면 사진 패널', await page.isVisible('#hpiImg .hpi-up'));
    await page.setInputFiles('#hpiImg [data-hpi-i="file"]', PHOTO); await page.waitForFunction(() => { const b = site().sections.find(x => x.type === 'banner'); return /^data:image\//.test(b.data.img || ''); }, null, { timeout: 8000 });
    let hero = await ev(() => ({ d: site().sections.find(x => x.type === 'banner').data.img.slice(0, 30), s: ((site().img || {}).hero || {}).src ? 1 : 0, len: site().sections.find(x => x.type === 'banner').data.img.length }));
    ok('사진 올리기 → banner.data.img = site.img.hero(300KB 이하)', hero.s && hero.len <= 300 * 1024, hero);
    await frameReady(); await page.waitForSelector('#hpiImg .hpi-pv img');
    await page.click('#hpiImg [data-hpi-i="fit"][data-v="contain"]'); await wait(350);
    const pv = await page.$('#hpiImg .hpi-pv'); const bx = await pv.boundingBox(); await page.mouse.move(bx.x + bx.width * .5, bx.y + bx.height * .5); await page.mouse.down(); await page.mouse.move(bx.x + bx.width * .2, bx.y + bx.height * .3, { steps: 4 }); await page.mouse.up(); await wait(400);
    await page.fill('#hpiImg [data-hpi-i="alt"]', '저녁 강의실 모습'); await page.press('#hpiImg [data-hpi-i="alt"]', 'Tab'); await wait(400);
    hero = await ev(() => (site().img || {}).hero || {}); ok('맞춤(전체) · 초점 끌기 · 대체 텍스트', hero.fit === 'contain' && /^2\d% 3\d%$/.test(hero.pos || '') && hero.alt === '저녁 강의실 모습', { fit: hero.fit, pos: hero.pos, alt: hero.alt });
    await frameReady(); const fimg = await ev(() => { const im = document.getElementById('hpeF').contentDocument.querySelector('.hp-photo img'); return im ? [im.style.objectFit, im.style.objectPosition, im.alt] : null; });
    ok('편집 화면 사진에 맞춤 · 초점 반영', fimg && fimg[0] === 'contain' && /2\d% 3\d%/.test(fimg[1]), fimg);
    await shot('hpe-image-panel');
    await page.click('#hpiImg [data-hpi-i="clr"]'); await wait(400);
    ok('지우기 → 그림(아트)으로', await ev(() => !site().sections.find(x => x.type === 'banner').data.img && !(site().img || {}).hero));
    await page.click('#hpiImg [data-hpi-i="x"]').catch(() => { });
    /* 끌어다 놓기 */
    await frameReady();
    await ev(async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const f = new File([bin], 'drop.png', { type: 'image/png' }); const dt = new DataTransfer(); dt.items.add(f);
      const d = document.getElementById('hpeF').contentDocument; const t = d.querySelector('.hp-hero [data-hpi-img]'); const W = d.defaultView;
      t.dispatchEvent(new W.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })); t.dispatchEvent(new W.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })); }, PHOTO2.buffer.toString('base64'));
    await page.waitForFunction(() => /^data:image\//.test(site().sections.find(x => x.type === 'banner').data.img || ''), null, { timeout: 8000 }).catch(() => { });
    ok('파일 끌어다 놓기로 교체', await ev(() => /^data:image\//.test(site().sections.find(x => x.type === 'banner').data.img || '')));
    /* 이미지 섹션 */
    await ev(() => { const L = site().sections; L.splice(2, 0, S2('image', { title: '현장 사진', imgs: [{ src: '', title: '', body: '' }], dstyle: 2 })); save(); hpPaint(); }); await wait(400); await frameReady();
    const nSec = await ev(() => document.getElementById('hpeF').contentDocument.querySelectorAll('[data-hpi-img*="\\"sec\\""]').length); ok('이미지 섹션 자리 표시', nSec >= 1, nSec);
    await F().locator('[data-hpi-img*="\\"sec\\""]').first().click(); await page.waitForSelector('#hpiImg', { state: 'visible' }); await page.setInputFiles('#hpiImg [data-hpi-i="file"]', PHOTO2);
    await page.waitForFunction(() => { const x = site().sections.find(y => y.type === 'image'); return x && /^data:image/.test((x.data.imgs[0] || {}).src || ''); }, null, { timeout: 8000 }).catch(() => { });
    ok('이미지 섹션 사진 교체', await ev(() => { const x = site().sections.find(y => y.type === 'image'); return x && /^data:image/.test((x.data.imgs[0] || {}).src || ''); }));
    await page.click('#hpiImg [data-hpi-i="x"]').catch(() => { });
    /* 로고 → 색 제안 */
    await frameReady(); await F().locator('header .logo').first().click(); await page.waitForSelector('#hpiImg', { state: 'visible' });
    await page.setInputFiles('#hpiImg [data-hpi-i="file"]', LOGO); await page.waitForSelector('#hpiSug .hpi-sgc', { timeout: 8000 }).catch(() => { });
    const sw = await page.$$eval('#hpiSug .hpi-sgc', L => L.map(b => b.dataset.v)); ok('로고 올리기 → 색 2개 제안', sw.length === 2 && await ev(() => /^data:image/.test(site().gnb.logo || '')), sw);
    await shot('hpe-logo-suggest');
    if (sw[1]) await page.click(`#hpiSug .hpi-sgc[data-v="${sw[1]}"]`); await page.click('#hpiSug [data-hpi-i="sugok"]'); await wait(400);
    const col = await ev(() => ({ c: site().color, lock: site().hpColorLock, th: site().theme })); ok('맞추기 → HPT.apply color · hpColorLock', col.lock === 1 && !!col.c && col.c.toLowerCase() === String(sw[1] || '').toLowerCase(), { col, sw });
    const au = await ev(() => window.HPT ? HPT.audit(site()).filter(r => r[3] < 4.5).length : 0); ok('로고 색으로 맞춘 뒤 대비 4.5:1 유지', au === 0, au);
    await page.click('#hpiImg [data-hpi-i="x"]').catch(() => { });

    /* 휴대폰 화면에서도 툴바 */
    await page.click('#hpe [data-act="hpe-dev"][data-v="mo"]'); await frameReady(); await F().locator('.hp-hero h1[data-hpe-f]').first().click(); await page.waitForSelector('#hpiTb', { state: 'visible' });
    const tbm = await ev(() => { const r = document.getElementById('hpiTb').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }); ok('휴대폰 미리보기에서도 툴바가 화면 안', tbm); await shot('hpe-mobile-toolbar'); await page.keyboard.press('Escape');
    await page.click('#hpe [data-act="hpe-dev"][data-v="pc"]'); await frameReady();
    /* ── 4) 바로 고치기 '말로 고치기': 선택 글자 · 사진 패널 + 첨부 ── */
    await frameReady(); await F().locator('.hp-hero [data-hpe-f]').nth(1).click(); await page.waitForSelector('#hpiTb', { state: 'visible' }); await page.keyboard.press('Escape'); await wait(150);
    await F().locator('.hp-hero [data-hpe-f]').nth(1).click(); await page.waitForSelector('#hpe .hpi-tgt');
    const before = await ev(() => HPI.sel && HPI.sel.k);
    await page.fill('#hpe .hpw-talk input[name=q]', '굵게 하고 가운데 정렬'); await page.press('#hpe .hpw-talk input[name=q]', 'Enter'); await page.waitForSelector('#modal [data-mact="ok"]'); await shot('hpe-talk-preview');
    await page.click('#modal [data-mact="ok"]'); await wait(400);
    const st2 = await ev(k => { const b = site().sections.find(x => x.type === 'banner'); return (b.data.sty || {})[k] || null; }, before);
    ok('말로 고치기 — 선택한 글자 대상(굵게 · 가운데)', st2 && st2.fw === 800 && st2.al === 'center', { before, st2 });
    await frameReady(); await F().locator('.hp-hero [data-hpi-img]').first().click(); await page.waitForSelector('#hpiImg', { state: 'visible' });
    await page.setInputFiles('#hpe .hpi-tclip input', PHOTO); await page.waitForSelector('#hpe .hpi-tg .hpi-chip', { state: 'attached' });
    const old = await ev(() => site().sections.find(x => x.type === 'banner').data.img.length);
    await page.fill('#hpe .hpw-talk input[name=q]', '이 사진으로 바꿔줘'); await page.press('#hpe .hpw-talk input[name=q]', 'Enter'); await page.waitForSelector('#modal [data-mact="ok"]'); await page.click('#modal [data-mact="ok"]'); await wait(400);
    ok('말로 고치기 — 사진 패널 대상 + 📎 첨부 교체', await ev(o => { const v = site().sections.find(x => x.type === 'banner').data.img; return /^data:image/.test(v) && v.length !== o && !HPI.att.length; }, old));

    /* ── 5) AI SAM: 사진 첨부 + 의도(키 없음 · 규칙) ── */
    await ev(() => { hpClose(true); go('site'); if (typeof fabOpen === 'function' && fabOn()) fabOpen(); else ACT['chat-open'](); }); await page.waitForSelector('.composer .hpi-att input', { state: 'attached' });
    await page.setInputFiles('.composer .hpi-att input', PHOTO2); await page.waitForSelector('.hpi-abar .hpi-chip');
    ok('AI SAM 입력창 사진 첨부 칩', (await page.$$('.hpi-abar .hpi-chip')).length === 1);
    await page.fill('.composer textarea', '이 사진으로 첫 화면 바꿔줘'); await page.press('.composer textarea', 'Enter'); await page.waitForSelector('.thread [data-act="hpi-pv"] >> nth=-1');
    await shot('sam-plan-card');
    await page.click('.thread [data-act="hpi-pv"] >> nth=-1'); await page.waitForSelector('#modal [data-hpi-ba="1"]'); ok('계획 카드 → 미리보기(전 · 후)', (await page.$$('#modal iframe')).length === 2); await shot('sam-preview'); await ev(() => closeModal());
    const pre = await ev(() => (window.__pre = site().sections.find(x => x.type === 'banner').data.img).length);
    await page.click('.thread [data-act="plan-ok"] >> nth=-1'); await wait(400);
    const aft = await ev(() => site().sections.find(x => x.type === 'banner').data.img !== window.__pre); ok('[적용] → 첫 화면 사진 교체', aft && !(await ev(() => HPI.att.length)), { pre, aft });
    await page.click('.thread [data-act="hpi-undo"] >> nth=-1'); await wait(300); ok('[되돌리기]', await ev(() => site().sections.find(x => x.type === 'banner').data.img === window.__pre));
    /* 나머지 의도(규칙) — 첨부 후 chatSend → 카드 → 실행 */
    const attach = async files => { await page.setInputFiles('.composer .hpi-att input', files); await page.waitForFunction(n => HPI.att.length === n, files.length); };
    const send = async q => { const n0 = await ev(() => S.chat.length); await page.fill('.composer textarea', q); await page.press('.composer textarea', 'Enter'); await page.waitForFunction(n => S.chat.length >= n + 2 && !S.chat[S.chat.length - 1].typing, n0, { timeout: 8000 }); return ev(() => { const m = S.chat[S.chat.length - 1]; return { plan: m.plan || '', steps: m.steps || [], title: m.title || '', text: m.text || '' }; }); };
    const run = pid => ev(p => { const r = PLANS[p] && PLANS[p].run(); return r; }, pid);
    await attach([LOGO]); let c = await send('로고 넣고 색 맞춰줘'); ok('의도: 로고 + 색 맞추기(2단계)', c.plan && c.steps.length === 2, c); const c0 = await ev(() => site().color); await run(c.plan);
    ok('  → 로고 · 대표 색 적용', await ev(o => /^data:image/.test(site().gnb.logo) && site().color !== o && site().hpColorLock === 1, c0));
    await attach([PHOTO2]); c = await send('강사 소개에 이 사진 넣어줘'); ok('의도: 강사 소개 사진', !!c.plan, c); await run(c.plan);
    ok('  → 강사 소개 사진(계열 자리 없으면 이미지 섹션)', await ev(() => site().sections.some(x => x.type === 'image' && x.data.hpiSlot === 'teacher' && x.data.imgs.length === 1) || /^data:/.test(((site().img || {}).teacher || {}).src || '')));
    await attach([PHOTO, PHOTO2]); c = await send('갤러리에 이 사진들 넣어줘'); ok('의도: 갤러리(여러 장)', !!c.plan, c); await run(c.plan);
    ok('  → 갤러리 2장', await ev(() => site().sections.some(x => x.type === 'image' && x.data.hpiSlot === 'gallery' && x.data.imgs.length === 2)));
    await attach([PHOTO]); c = await send('사이트에 넣어줘'); ok('의도: 자리를 모르면 어디에 넣을지 묻기', !c.plan && /어디에/.test(c.title), c); await ev(() => { HPI.att = []; });
    await page.setInputFiles('.composer .rg-att input', BROCHURE); await page.waitForFunction(() => RG.docs().length === 1, null, { timeout: 8000 });
    c = await send('브로슈어 보고 소개 문구 업데이트해줘'); ok('의도: 브로슈어 문서로 소개 문구', !!c.plan, c); await run(c.plan);
    ok('  → 소개 섹션에 문서 문장(지어내지 않음)', await ev(() => site().sections.some(x => x.type === 'text' && /저녁 실무 교육/.test(x.data.body || ''))));
    await ev(() => { const b = site().sections.find(x => x.type === 'banner'); b.data.title = '센텀 배움 아카데미에서 일과 배움을 함께, 퇴근 후 저녁 실무 교육'; b.data.sub = '회사에서 바로 쓰는 과제로 배우고, 소수 정원 수업에서 강사가 직접 피드백합니다. 지금 신청하세요.'; save(); });
    c = await send('홈페이지 첫 화면 문구 더 짧게 해줘'); ok('의도: 첫 화면 문구 짧게', !!c.plan, c); await run(c.plan);
    ok('  → 제목 16자 · 설명 44자 이내', await ev(() => { const d = site().sections.find(x => x.type === 'banner').data; return d.title.replace(/\n/g, '').length <= 16 && d.sub.length <= 44; }));
    c = await send('홈페이지 폰트 고급스럽게 바꿔줘'); ok('의도: 폰트 분위기(테마는 그대로)', !!c.plan, c); const th0 = await ev(() => site().theme); await run(c.plan);
    ok('  → 제목 명조', await ev(t => (site().font || {}).h === 'serif' && site().theme === t, th0));
    const none = await ev(() => ['수강료 청구해줘', '14일 미접속 학습자에게 독려 메시지 보내줘', '이번 달 매출 요약해줘'].map(q => HPI.intent(q, [])).filter(Boolean).length); ok('무관한 말은 가로채지 않음', none === 0, none);
    ok('대화 기록에 사진 원본(data URL)을 저장하지 않음', await ev(() => !JSON.stringify(S.chat).includes('data:image')));
    /* 이미지 자리 규약(figure[data-slot] · site.img[slot]) — D1 · D2 계열이 붙으면 바로 쓰는 경로 */
    const slotOK = await ev(() => { const s = JSON.parse(JSON.stringify(site())); HPI.apply(s, { k: 'slot', slot: 'about' }, { src: 'data:image/png;base64,AAAA', fit: 'contain', pos: '10% 20%', alt: '소개' });
      const h = HPI.decorate('<section class="hpl"><figure class="hpl-img" data-slot="about"><img src="data:image/png;base64,AAAA" alt=""></figure></section>', { type: 'text', data: {} }, s);
      return s.img.about.alt === '소개' && /object-fit: ?contain/.test(h) && /object-position: ?10% 20%/.test(h); });
    ok('이미지 자리 규약 site.img[slot] · figure[data-slot] 맞춤 반영', slotOK);
    /* 레이아웃 계열(HPL) figure.hpl-img[data-slot] 클릭 교체 + 샘플 사진 표시(편집 화면에서만) */
    const hasHPL = await ev(() => !!(window.HPL && typeof HPL.fig === 'function'));
    if (hasHPL) {
      await ev(() => { hpClose(true); HPL.reg('t4', { name: '시험', fits: [], slots: ['hero', 'about'], css: () => '', hero: (s, d, th, T) => `<section class="hpt hp-hero hpl-t4"><div class="hp-w"><h1>${esc(d.title || '')}</h1>${HPL.fig('hero', s, th, T, { ratio: '16/9' })}</div></section>` });
        const s = site(); s.layout = 't4'; s.img = { hero: { src: 'https://cdn.example.invalid/img/stock/sample-classroom.webp', alt: '', fit: 'cover', pos: '50% 40%' } }; save(); hpEdit('home'); });
      await frameReady();
      const st0 = await ev(() => { const d = document.getElementById('hpeF').contentDocument; const fg = d.querySelector('figure.hpl-img[data-slot="hero"]'); return { fig: !!fg, click: !!(fg && fg.hasAttribute('data-hpi-img')), stock: !!(fg && fg.hasAttribute('data-hpi-stock')), lb: fg ? getComputedStyle(fg, '::before').content : '' }; });
      ok('계열 figure[data-slot] 클릭 자리 · 샘플 표시(편집 화면)', st0.fig && st0.click && st0.stock && /샘플/.test(st0.lb), st0);
      ok('게시본 HTML에는 샘플 표시 없음', await ev(() => !/data-hpi-stock|샘플 — 우리 기관/.test(siteHTML(site(), true, 'ko'))));
      await shot('hpe-stock-badge');
      await F().locator('figure.hpl-img[data-slot="hero"]').first().click(); await page.waitForSelector('#hpiImg', { state: 'visible' }); await page.setInputFiles('#hpiImg [data-hpi-i="file"]', PHOTO2);
      await page.waitForFunction(() => /^data:image/.test(((site().img || {}).hero || {}).src || ''), null, { timeout: 8000 }).catch(() => { }); await frameReady();
      const st1 = await ev(() => { const d = document.getElementById('hpeF').contentDocument; const fg = d.querySelector('figure.hpl-img[data-slot="hero"]'); const b = site().sections.find(x => x.type === 'banner');
        return { img: /^data:image/.test(((site().img || {}).hero || {}).src || ''), banner: b.data.img === site().img.hero.src, shown: !!(fg && fg.querySelector('img') && /^data:image/.test(fg.querySelector('img').getAttribute('src'))), stock: !!(fg && fg.hasAttribute('data-hpi-stock')) }; });
      ok('계열 자리 교체 → site.img.hero = banner.data.img · 샘플 표시 사라짐', st1.img && st1.banner && st1.shown && !st1.stock, st1);
      await page.click('#hpiImg [data-hpi-i="clr"]'); await wait(400);
      ok('지우기 → site.img.hero · banner.data.img 함께 비움', await ev(() => !(site().img || {}).hero && !site().sections.find(x => x.type === 'banner').data.img));
      await page.click('#hpiImg [data-hpi-i="x"]').catch(() => { }); await ev(() => { delete site().layout; save(); hpPaint(); }); await frameReady();
    }
    /* 저장 공간 한도: 저장이 실패하면 되돌리고 안내 */
    await ev(() => { hpEdit('home'); }); await frameReady();
    const b0 = await ev(() => { window.__toast = []; const t0 = toast; window.toast = (m, k) => { window.__toast.push(m); return t0(m, k); }; window.__si = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === KEY && String(v).length > 1000) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return window.__si.call(this, k, v); }; return site().sections.find(x => x.type === 'banner').data.img.length; });
    await F().locator('.hp-hero [data-hpi-img]').first().click(); await page.waitForSelector('#hpiImg', { state: 'visible' }); await page.setInputFiles('#hpiImg [data-hpi-i="file"]', LOGO); await wait(900);
    const qv = await ev(b => { Storage.prototype.setItem = window.__si; return { same: site().sections.find(x => x.type === 'banner').data.img.length === b, msg: window.__toast.some(m => /저장 공간/.test(m)) }; }, b0);
    ok('저장 공간이 가득 차면 되돌리고 안내', qv.same && qv.msg, qv);
  } catch (e) { ok('crash', false, e.message.split('\n').slice(0, 3).join(' | ') + ' @' + ((String(e.stack).match(/hp-edit\.js:(\d+)/) || [])[1] || '?')); }
  ok('스크립트 오류 없음', !errs.length, errs.slice(0, 3));
  await browser.close(); srv.close();
  const bad = R.filter(r => !r[1]); console.log(bad.length ? `실패 ${bad.length}/${R.length}` : `통과 ${R.length}개 항목 — 글자 · 글꼴 · 스타일 · 게시본 · 사진 · 로고 색 · AI SAM 의도 7종 · 되돌리기`);
  process.exit(bad.length ? 1 : 0);
})();
