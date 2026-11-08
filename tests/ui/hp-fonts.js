'use strict';
/* v34.5 F2 분할 웹폰트 점검(HPF · tools/fonts/build.py 산출물)
   - siteHTML: 사이트 CSS에 @font-face 대신 표식(--hpf · --hpf-pre)만, 미리보기 문서 머리에 글꼴 CSS link + 첫 화면 제목 조각 preload, 옛 2,350자 파일 참조 0
   - 바로 고치기 미리보기(iframe)와 게시된 학습자 홈(Shadow DOM) 둘 다에서 글꼴이 실제로 내려받아지는지(document.fonts · 네트워크)
   - 한글 11,172자: 2,350자 밖 음절(똠 · 햏 · 뷁)도 분할본으로 그려지는지
   - 첫 화면 글꼴 전송량(저장소 글꼴, 조각 수 · KB) · 휴대폰 390 넘침 0 · 크기 보정 폴백 face 존재
   - 편집기: 조합 고르기(HPF.panel)와 조합 적용 → S.site.font(기존 키 호환) · 되돌리기
   사용: node tests/ui/hp-fonts.js  (필요: playwright) · SHOT_DIR=폴더 를 주면 스크린샷을 남긴다 */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const SHOT = process.env.SHOT_DIR || '';

(async () => {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  const R = []; const ok = (name, cond, info) => { R.push([name, !!cond, info]); console.log(`${cond ? '✓' : '✗'} ${name}${info != null ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`); };
  const shot = async (n, el) => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await (el || page).screenshot({ path: path.join(SHOT, n + '.png') }); };
  const ev = (f, a) => page.evaluate(f, a); const wait = ms => page.waitForTimeout(ms);
  const frameReady = async () => { await page.waitForFunction(() => { const f = document.getElementById('hpeF'); const d = f && f.contentDocument; return d && d.querySelector('[data-hpe-f]'); }, null, { timeout: 15000 }); };
  try {
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await ev(() => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); createOrg('univ', '해운대 열린 캠퍼스'); });
    await page.waitForFunction(() => window.S && S.org); await wait(400);
    await ev(() => window.HPF && HPF.load());
    ok('HPF 인터페이스(list · faces · need · css · href · pairs)', await ev(() => !!(window.HPF && HPF.list.length >= 7 && ['faces', 'need', 'css', 'href', 'pairs', 'panel'].every(k => typeof HPF[k] === 'function'))));
    await ev(() => { try { closeModal(); } catch (e) { } const s = site(); if (window.HPT) { HPT.apply(s, 'campus'); HPT.enrich(s); } const b = s.sections.find(x => x.type === 'banner'); b.data.title = '똠방각하도 배우는 열린 캠퍼스'; s.font = { h: 'hahmlet', b: 'serif' }; s.ai = s.ai || { at: today(), by: 'test' }; save(); });

    /* ── 1) siteHTML 산출물 ── */
    const sh = await ev(() => { const h = siteHTML(site(), true, 'ko'); const he = h.indexOf('</head>'); const css = [...h.slice(0, he).matchAll(/<style>([\s\S]*?)<\/style>/g)].map(x => x[1]).join('\n');
      return { mark: (css.match(/--hpf:"([^"]*)"/) || [])[1] || '', pre: (css.match(/--hpf-pre:"([^"]*)"/) || [])[1] || '', faceN: (css.match(/@font-face/g) || []).length, cssLen: css.length, link: (h.slice(0, he).match(/<link rel="stylesheet" href="[^"]*fonts\/[\w-]+\/font\.css[^"]*"/g) || []).length,
        preTag: (h.match(/<link rel="preload" as="font"[^>]*>/g) || []).length, old: /NotoSerifKR-\d|GowunDodum-4/.test(h), csp: (h.match(/font-src [^;"]*/) || [''])[0], full: /pretendardvariable\.min\.css/.test(h) }; });
    ok('게시 CSS: 표식에 함렛 · 노토 세리프 CSS', /fonts\/hahmlet\/font\.css/.test(sh.mark) && /fonts\/noto-serif-kr\/font\.css/.test(sh.mark), sh.mark);
    ok('게시 CSS에 분할 @font-face를 넣지 않음(safeCSS 200,000자 한도 안)', sh.faceN <= 8 && sh.cssLen < 200000, { faceN: sh.faceN, cssLen: sh.cssLen });
    ok('미리보기 머리: 글꼴 CSS link + 첫 화면 제목 조각 preload 1~2개', sh.link >= 2 && sh.preTag >= 1 && sh.preTag <= 2 && /hahmlet\/800-\d+\.woff2/.test(sh.pre), { link: sh.link, preTag: sh.preTag, pre: sh.pre });
    ok("옛 2,350자 파일 참조 0 · font-src 'self'", !sh.old && /'self'/.test(sh.csp), sh.csp);
    ok('미리보기 Pretendard는 dynamic-subset(전체 가변 2MB 아님)', !sh.full);

    /* ── 2) 바로 고치기 미리보기(iframe)에서 실제 로드 ── */
    await ev(() => { go('site'); render(); hpEdit('home'); }); await frameReady(); await wait(1500);
    const fr = await ev(async () => { const d = document.getElementById('hpeF').contentDocument; await d.fonts.ready;
      const a = await d.fonts.load('800 40px Hahmlet', '배우는'); const b = await d.fonts.load('400 16px "Noto Serif KR"', '똠햏뷁');
      const h1 = d.querySelector('.hp-hero h1'); return { hah: a.length, nsk: b.length, ff: h1 ? getComputedStyle(h1).fontFamily : '' }; });
    ok('미리보기: 함렛(제목) · 노토 세리프(2,350자 밖 똠햏뷁) 로드', fr.hah > 0 && fr.nsk > 0 && /Hahmlet/.test(fr.ff), fr);
    await shot('hpf-preview', page.locator('#hpeF'));

    /* ── 3) 편집기 조합 고르기 ── */
    const pn = await ev(() => { const d = document.createElement('div'); d.id = 'hpfT'; document.body.appendChild(d); HPF.panel(d); return { n: d.querySelectorAll('[data-hpf="pair"]').length, t: (d.querySelector('.hpf-t') || {}).textContent || '', on: d.querySelectorAll('.hpf-pair.on').length }; });
    ok('조합 고르기 6~10개 · 실제 제목으로 미리 보기', pn.n >= 6 && pn.n <= 10 && /똠방각하/.test(pn.t), pn);
    const u0 = await ev(() => HPE.undo.length); await page.click('#hpfT [data-hpf="pair"][data-v="p-serif"]').catch(async () => { await ev(() => HPF.applyPair(HPF.pairs()[2].id)); }); await wait(600);
    const f1 = await ev(() => site().font || null); ok('조합 적용 → S.site.font(기존 키 호환: serif) · 되돌리기 쌓임', f1 && f1.h === 'serif' && !f1.b && (await ev(() => HPE.undo.length)) === u0 + 1, f1);
    await ev(() => { site().font = { h: 'hahmlet', b: 'serif' }; save(); }); await ev(() => { document.getElementById('hpfT').remove(); });
    await ev(() => { hpPaint && hpPaint(); }).catch(() => { }); await frameReady();

    /* ── 4) 게시된 학습자 홈: 조합별 실제 로드 · 전송량(조각은 Resource Timing의 encodedBodySize) ── */
    const COMBO = [['함렛 제목 + 프리텐다드', { h: 'hahmlet' }, 'Hahmlet', 1], ['노토 세리프 제목 + 프리텐다드', { h: 'serif' }, 'Noto Serif KR', 1], ['고운돋움 제목 + 프리텐다드', { h: 'round' }, 'Gowun Dodum', 1],
      ['도현 제목 + 프리텐다드', { h: 'do-hyeon' }, 'Do Hyeon', 1], ['명조 제목 + 명조 본문(긴 글)', { h: 'hahmlet', b: 'serif' }, 'Hahmlet', 0]];
    const tid = await ev(() => DREG.cur()); const TAB = [];
    for (const [nm, font, fam, budget] of COMBO) {
      await ev(f => { site().font = f; save(); if (typeof hpPaint === 'function') hpPaint(); }, font); await frameReady(); await wait(300);
      await page.click('#hpe [data-act="hpe-pub"]'); await wait(500);
      for (const [vw, vh, tag] of nm === COMBO[0][0] ? [[1280, 800, 'pc'], [390, 844, 'm']] : [[1280, 800, 'pc']]) {
        const pc = await browser.newContext({ viewport: { width: vw, height: vh } }); await pc.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
        const st = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))));
        await pc.addInitScript(s => { try { if (!localStorage.length) { const o = JSON.parse(s); Object.keys(o).forEach(k => localStorage.setItem(k, o[k])); } } catch (e) { } }, st);
        const pm = await pc.newPage(); pm.on('pageerror', e => errs.push('learner: ' + e.message));
        await pm.goto(`${base}/learner.html?t=${tid}#home`, { waitUntil: 'load' }); await pm.waitForTimeout(2500);
        const lh = await pm.evaluate(async () => { await document.fonts.ready; await new Promise(r => setTimeout(r, 300)); const H = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const h1 = H.map(r => r.querySelector('.hp-hero h1')).find(Boolean);
          const loaded = [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')))];
          const R = performance.getEntriesByType('resource').filter(e => /\/fonts\//.test(e.name)); const W = R.filter(e => /\.woff2/.test(e.name));
          return { ff: h1 ? getComputedStyle(h1).fontFamily : '', links: [...document.querySelectorAll('link[data-hpf]')].map(l => l.rel + ':' + l.getAttribute('href').replace(/\?.*/, '')), loaded,
            n: W.length, kb: Math.round(W.reduce((a, e) => a + (e.encodedBodySize || e.decodedBodySize || 0), 0) / 1024), css: Math.round(R.filter(e => /\.css/.test(e.name)).reduce((a, e) => a + (e.encodedBodySize || 0), 0) / 1024),
            sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
        TAB.push([nm, tag, lh.n, lh.kb, lh.css, lh.links.filter(l => /^stylesheet/.test(l)).map(l => l.split('/')[1]).join('+')]);
        ok(`${nm} ${tag}: 제목 글꼴 로드 · link`, lh.loaded.includes(fam) && new RegExp(fam).test(lh.ff) && lh.links.some(l => /^stylesheet:fonts\//.test(l)), { loaded: lh.loaded, links: lh.links });
        if (budget) ok(`${nm} ${tag}: 저장소 글꼴 조각 전송량 ≤ 300KB`, lh.kb <= 300, { woff2: lh.n, kb: lh.kb, cssKb: lh.css });
        if (tag === 'm') ok(`${nm} 휴대폰 390 넘침 0`, lh.sw <= lh.vw + 1, { sw: lh.sw, vw: lh.vw });
        if (SHOT && (tag === 'm' || nm === COMBO[0][0])) { fs.mkdirSync(SHOT, { recursive: true }); await pm.screenshot({ path: path.join(SHOT, `hpf-learner-${COMBO.findIndex(c => c[0] === nm)}-${tag}.png`) }); }
        await pc.close();
      }
    }
    console.log('조합 | 화면 | 조각 수 | 조각 KB | 글꼴 CSS KB | 건 CSS'); TAB.forEach(r => console.log(r.join(' | ')));
    /* v34.5 FZ(FIXLIST 24): HPF.need는 font-family(var(--x))로 실제로 참조된 변수만 센다 — 고딕 템플릿에 노토 세리프가 붙지 않음, 명조 계열에는 붙음 */
    const nd = await ev(() => { const R = { goth: 0, gothSer: [], ser: [] }; tplFor(S.org.type).forEach(tp => { const s = siteFromTpl(tp); const p = window.HPFT && HPFT.pair(s); const n = HPF.need(s, siteHTML(s, true, 'ko'));
        const serifSite = !p || /serif|hahmlet|maru|batang/.test(p.hd + ' ' + p.bd) || ['editorial', 'noir'].includes(s.layout);
        if (serifSite) { if (!n.includes('noto-serif-kr') && ['editorial', 'noir'].includes(s.layout)) R.ser.push(tp.id); } else { R.goth++; if (n.includes('noto-serif-kr')) R.gothSer.push(tp.id); } });
      const g = siteFromTpl(tplFor(S.org.type).find(tp => !['editorial', 'noir'].includes(siteFromTpl(tp).layout)) || tplFor(S.org.type)[0]); const h0 = siteHTML(g, true, 'ko'); R.base = HPF.need(g, h0); const h = h0.replace('</style>', '.fzx{--fz-only-def:"Noto Serif KR"}.fzy{font:700 20px var(--fz-ref)}:root{--fz-ref:"Gowun Dodum",serif}</style>'); R.def = HPF.need(g, h); return R; });
    ok('HPF.need: 고딕 템플릿에 노토 세리프 0 · 명조 계열(editorial · noir)에는 있음 · 정의만 된 변수는 세지 않고 font 줄임의 var는 셈', nd.goth > 0 && !nd.gothSer.length && !nd.ser.length && nd.def.includes('noto-serif-kr') === nd.base.includes('noto-serif-kr') && nd.def.includes('gowun-dodum'), nd);
  } catch (e) { ok('예외 없음', false, String(e && e.stack || e)); }
  ok('페이지 오류 0', !errs.length, errs.slice(0, 5));
  await browser.close(); srv.close();
  const bad = R.filter(r => !r[1]); console.log(bad.length ? `실패 ${bad.length}/${R.length}` : `통과 ${R.length}개 항목 — 분할 웹폰트 · 미리 받기 · 게시본 로드 · 조합 고르기`);
  process.exit(bad.length ? 1 : 0);
})();
