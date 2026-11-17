'use strict';
/* v43.8 평생 · 직업훈련 홈페이지 템플릿(hpx-life.js) 점검
   등록(PASS 표 · HPX_ALL) · 갤러리(프리미엄 묶음) · 게시 미리보기 · 390/1440 넘침 · 13px · 44px · 한 글자 꺾임 · 시나리오 버튼 경로 · 평생교육 문구 · 첫 화면 방문자 고르기
   사용: node tests/ui/tpl438-life.js [shots폴더] */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
const ID = 'careernav';
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const make = (p, ty) => p.evaluate(([ty]) => { localStorage.setItem('didisam.emptyStart', '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg(ty, ty === 'voc' ? '해운대 디지털직업전문학교' : '해운대 평생학습관'); }, [ty]);
  try {
    /* 1) PASS 표에 없으면 등록하지 않는다(플래그 없음) */
    { const c = await browser.newContext(); const p = await c.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' }); const r = await p.evaluate(id => ({ pass: HPX_LIFE.PASS[id] || 0, th: HPT.has(id), tp: TPL.some(t => t.id === 'prem-' + id), sec: typeof HPS.hero }), ID);
      ok(r.pass >= 85 ? r.th && r.tp : !r.th && !r.tp, `PASS 표 규칙(점수 ${r.pass}) — 테마 ${r.th} · 템플릿 ${r.tp}`); await c.close(); }
    /* 2) HPX_ALL로 강제 등록 → 기관 유형별 렌더 */
    for (const ty of ['voc', 'lifelong']) {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.addInitScript(() => { window.HPX_ALL = 1; }); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await make(p, ty);
      const g = await p.evaluate(id => { const L = TPL.filter(t => t.prem).sort((a, b) => HPT.premFor().indexOf(a.theme) - HPT.premFor().indexOf(b.theme)); const tp = TPL.find(t => t.id === 'prem-' + id);
        const s = siteFromTpl(tp); const html = siteHTML(s, true, 'ko'); let th = ''; try { th = HPT.thumb(s, id); } catch (e) { th = 'ERR ' + e.message; }
        const classIds = S.classes.map(c => c.id), menuIds = (s.menus || []).map(m => m.id).filter(Boolean);
        return { reg: HPT.has(id), inGal: L.some(t => t.id === 'prem-' + id), fits: HPT.premFits(id), first: HPT.premFor()[0], html, thumbOk: /lfx-hero/.test(th), classIds, menuIds, secs: s.sections.map(x => (x.data && x.data.hpt) || x.type) }; }, ID);
      ok(g.reg && g.inGal && g.fits && g.first === ID, `[${ty}] 등록 · 프리미엄 갤러리 노출 · 유형 추천 1순위(${g.first})`);
      ok(g.thumbOk, `[${ty}] 갤러리 미리보기(HPT.thumb)에 새 첫 화면`);
      ok(['lf-find', 'lf-elig', 'lf-track'].every(k => g.secs.includes(k)) && g.secs[0] === 'banner', `[${ty}] 시나리오 섹션 구성 ${g.secs.join(' · ')}`);
      ok(!errs.length, `[${ty}] 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
      /* 게시 미리보기: 게시 HTML을 그대로 1440 · 390에 띄운다 */
      for (const [w, h, tag] of [[1440, 900, 'pc'], [390, 844, 'm']]) {
        const c2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SHOT ? 2 : 1 }); const q = await c2.newPage(); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
        await q.goto(`${base}/index.html#blank`, { waitUntil: 'domcontentloaded' }).catch(() => { }); await q.setContent(g.html, { waitUntil: 'load' }).catch(() => { }); await q.waitForTimeout(300);
        const m = await q.evaluate(() => { const vw = innerWidth; const R = { ow: document.documentElement.scrollWidth - vw, small: [], t44: [], wrap1: [], out: [] };
          const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
          const scrollerOf = e => { for (let x = e.parentElement; x; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll') return x; } return null; };
          document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(''); if (!t) return; const fs = parseFloat(getComputedStyle(e).fontSize); const r = e.getBoundingClientRect();
            if (fs < 13) R.small.push(`${e.className}:${fs}:${t.slice(0, 10)}`); if ((r.right > vw + 1 || r.left < -1) && !scrollerOf(e)) R.out.push(t.slice(0, 10)); const lh = parseFloat(getComputedStyle(e).lineHeight) || fs * 1.4; if (t.length >= 2 && r.width < fs * 1.6 && r.height > lh * 1.8) R.wrap1.push(t.slice(0, 10)); });
          /* 44px: 새 섹션의 누르는 칸(링크 · 라벨) */
          document.querySelectorAll('.lfx-hero a,.lfx-hero label,.lfx-find a,.lfx-find label,.lfx-elig a,.lfx-track a').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.height < 44 || r.width < 44) R.t44.push(`${(e.textContent || '').trim().slice(0, 10)}:${Math.round(r.width)}x${Math.round(r.height)}`); });
          return R; });
        ok(m.ow <= 0 && !m.out.length, `[${ty} ${tag}] 가로 넘침 0 · 화면 밖 0 ${m.out.slice(0, 3).join(' | ')}`);
        ok(!m.small.length, `[${ty} ${tag}] 13px 미만 0 ${m.small.slice(0, 3).join(' | ')}`);
        ok(!m.t44.length, `[${ty} ${tag}] 누르는 칸 44px 이상 ${m.t44.slice(0, 3).join(' | ')}`);
        ok(!m.wrap1.length, `[${ty} ${tag}] 한 글자 꺾임 0 ${m.wrap1.slice(0, 3).join(' | ')}`);
        /* 첫 화면 방문자 고르기: 라벨을 누르면 그 사람의 할 일이 열린다 */
        const sw = await q.evaluate(async () => { const vis = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }; const a0 = vis('.lfx-ans.a0') && !vis('.lfx-ans.a3'); document.querySelector('label[for="lfxp3"]').click(); await new Promise(r => setTimeout(r, 50)); return { a0, a3: vis('.lfx-ans.a3') && !vis('.lfx-ans.a0'), first: [...document.querySelectorAll('.lfx-ans.a3 a')].map(a => a.getAttribute('href')) }; });
        ok(sw.a0 && sw.a3 && sw.first.includes('#login/my'), `[${ty} ${tag}] 「어떤 분이세요?」 전환 → ${ty === 'voc' ? '훈련생' : '수강생'} 할 일 ${sw.first.join(' ')}`);
        if (tag === 'pc') { const fl = await q.evaluate(() => { const lab = document.querySelector('.lfx-ch label:nth-of-type(2)'); if (!lab) return null; const n0 = [...document.querySelectorAll('.lfx-cc')].filter(e => getComputedStyle(e).display !== 'none').length; lab.click(); const n1 = [...document.querySelectorAll('.lfx-cc')].filter(e => getComputedStyle(e).display !== 'none').length; return [n0, n1, +lab.querySelector('small').textContent]; });
          ok(fl && fl[1] === fl[2] && fl[1] < fl[0], `[${ty}] 과정 거르기 칩 ${fl && fl.join(' → ')}`); }
        if (SHOT) await q.screenshot({ path: path.join(SHOT, `t-${ty}-${tag}.png`) });
        await c2.close(); }
      /* 시나리오 버튼 경로: 실제 강좌 · 메뉴 · 학습자 경로 · 전화 · 고용24만 */
      const H = [...g.html.matchAll(/<section class="[^"]*lfx-[\s\S]*?<\/section>/g)].map(x => x[0]).join(''); const hrefs = [...H.matchAll(/href="([^"]*)"/g)].map(x => x[1]);
      const good = h => { const m = h.match(/^#p-c-(.+)$/); if (m) return g.classIds.includes(m[1]); const n = h.match(/^#p-m-(.+)$/); if (n) return g.menuIds.includes(n[1]); return /^(#p-home|#login\/(my|cal)|tel:[\d+]+|mailto:\S+@\S+|https:\/\/www\.work24\.go\.kr)$/.test(h); };
      const bad = hrefs.filter(h => !good(h)); ok(hrefs.length >= 10 && !bad.length, `[${ty}] 시나리오 링크 ${hrefs.length}개 모두 실제 경로 ${bad.slice(0, 3).join(' ')}`);
      if (ty === 'voc') ok(/work24\.go\.kr/.test(H) && /내일배움카드/.test(H), '[voc] 국비 · 내일배움카드 자격 확인 → 고용24');
      else { const txt = H.replace(/<[^>]+>/g, ' '); ok(!/훈련|국비|내일배움|고용노동부/.test(txt) && /휴대폰 번호는 동의한 경우에만/.test(txt), '[lifelong] 훈련 · 국비 문구 없음 · 휴대폰 번호는 동의 시에만'); }
      await c.close(); }
  } catch (e) { fails.push('예외 ' + e.message); console.log(e); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
