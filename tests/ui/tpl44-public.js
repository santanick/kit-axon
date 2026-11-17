'use strict';
/* v44 공공 교육원 홈페이지 템플릿 10종(hp44-public.js) 점검
   - 등록(HPT · HPD · TPL g44 · types ['public'] · 세부 유형) · 미리보기(HPT.thumb)
   - 게시본 PC 1440 · 390: 가로 넘침 0 · 화면 밖 요소 0 · 누르는 칸 44px(390) · 글자 13px 이상 · 한 글자 꺾임 0 · pageerror 0 · 첫 화면 제목 크기
   - 버튼 · 링크가 학습자 실제 경로인지, 첫 화면 사진이 10종 모두 다른지, 개인정보 입력 칸이 없는지
   - 데이터 없음(빈 스튜디오): 강좌 · 숫자 섹션 숨김 · 첫 화면 유지
   - 실제 게시본(learner.html Shadow DOM) 1종
   index.html에 hp44-public.js 태그가 없으면 이 테스트가 hpv-corp.js 뒤에 주입한다(태그 · ?v=는 통합 담당).
   사용: node tests/ui/tpl44-public.js   (CAP=<폴더> 이면 첫 화면 PC · 휴대폰 캡처를 JPEG로 저장) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const CAP = process.env.CAP || '';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const CASES = [['pbcivic', 'staff'], ['pbjournal', 'citizen'], ['pbposter', 'facility'], ['pbcampus', 'staff'], ['pblibrary', 'citizen'], ['pbyouth', 'citizen'], ['pbsenior', 'citizen'], ['pbjobs', 'citizen'], ['pbmuseum', 'citizen'], ['pbheritage', 'staff']];
const NAME = { staff: '해운대구 인재개발원', citizen: '해운대구 시민대학', facility: '좌동 스포츠문화센터' };
const ROUTES = /^#(my|courses|badges|notice|login|home|shop|comm|cal|fac|join|family)$/;

(async () => {
  const PV = new Map();
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    let body = fs.readFileSync(f); if (u === '/index.html' && !/hp44-public\.js/.test(body)) body = String(body).replace(/(<script src="hpv-corp\.js[^"]*"><\/script>)/, '$1\n<script src="hp44-public.js"></script>');
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(body); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const view = async (key, html, minN, cap) => { PV.set(key + '.html', html.replace('<head>', `<head><base href="${base}/">`));
    for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: w > 600 ? 900 : 844 } }); const q = await c2.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await q.goto(`${base}/__pv/${key}.html`, { waitUntil: 'load' }); await q.waitForTimeout(500);
      const m = await q.evaluate(w => { const de = document.documentElement; const vw = de.clientWidth; const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const C = [...document.querySelectorAll('section.p4')]; const inS = el => C.some(s => s.contains(el));
        return { n: C.length, over: de.scrollWidth - vw, out: [...document.querySelectorAll('section.p4 *')].filter(el => vis(el) && el.getBoundingClientRect().right > vw + 1).map(el => el.className).slice(0, 4),
          small: w < 600 ? [...document.querySelectorAll('section.p4 a')].filter(a => vis(a) && a.getBoundingClientRect().height < 44).map(a => a.textContent.trim().slice(0, 12)) : [],
          tiny: [...document.querySelectorAll('section.p4 *')].filter(el => vis(el) && inS(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13).map(el => el.textContent.trim().slice(0, 10)),
          narrow: [...document.querySelectorAll('section.p4 :is(h1,h2,h3,b,small,a,p,em,span,dd,dt)')].filter(el => { if (!vis(el) || el.textContent.trim().length < 3) return false; const r = el.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(el).fontSize); return r.height > fs * 5 && r.width < fs * 2.2; }).map(el => el.textContent.trim().slice(0, 8)),
          bad: [...document.querySelectorAll('section.p4 img')].filter(i => i.complete && !i.naturalWidth).length,
          h1: (() => { const h = document.querySelector('section.p4-hero h1'); return h ? parseFloat(getComputedStyle(h).fontSize) : 0; })() }; }, w);
      ok(m.n >= (minN || 5) && m.over <= 0 && !m.out.length, `${key} ${w}: 섹션 ${m.n}개 · 가로 넘침 0 · 화면 밖 요소 0(${m.over}/${m.out.join(',')})`);
      ok(!m.small.length, `${key} ${w}: 누르는 칸 44px 이상 ${m.small.join(',')}`);
      ok(!m.tiny.length, `${key} ${w}: 글자 13px 이상 ${m.tiny.join(',')}`);
      ok(!m.narrow.length, `${key} ${w}: 한 글자 꺾임 0 ${m.narrow.join(',')}`);
      ok(!m.bad, `${key} ${w}: 깨진 사진 0(${m.bad})`);
      ok(w > 600 ? m.h1 >= 64 && m.h1 <= 96 : m.h1 >= 36 && m.h1 <= 46, `${key} ${w}: 첫 화면 제목 크기 ${m.h1}px(PC 64~96 · 휴대폰 36~44)`);
      ok(!pe.length, `${key} ${w}: pageerror 0 ${pe.join('|')}`);
      if (cap) { await q.evaluate(() => document.fonts && document.fonts.ready); await q.waitForTimeout(300); await q.screenshot({ path: path.join(CAP, `${key}-${w > 600 ? 'pc' : 'm'}.jpg`), type: 'jpeg', quality: 80 });
        if (w > 600) { await q.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }); await new Promise(r => setTimeout(r, 800)); }); } if (w > 600) await q.screenshot({ path: path.join(CAP, `${key}-full.jpg`), type: 'jpeg', quality: 60, fullPage: true }); }
      await c2.close(); } };
  const admin = async (ed, empty) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(([e, n, emp]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', emp ? '1' : '0'); const bx = document.querySelector('#suEmpty'); if (bx) bx.checked = !!emp; createOrg('public', n, e); }, [ed, NAME[ed], empty]); await p.waitForTimeout(1200);
    return { ctx, p, errs }; };
  const linksOf = async (p, html) => { const L = await p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('section.p4 a[href]')].map(a => a.getAttribute('href')); }, html); const cid = await p.evaluate(() => S.classes.map(c => c.id));
    return { L, bad: L.filter(h => !(ROUTES.test(h) || (/^#p-c-/.test(h) && cid.includes(h.slice(5))) || /^tel:[\d-]+$/.test(h))) }; };

  const heroImg = {}; const heroCls = {};
  for (const [id, ed] of CASES.filter(c => !process.env.ONLY || process.env.ONLY.split(',').includes(c[0]))) { const a = await admin(ed, false);
    const reg = await a.p.evaluate(id => { const tp = TPL.find(t => t.id === 't44-' + id); return { th: HPT.has(id), hd: !!(window.HPD && HPD.list().includes(id)), g44: !!(tp && tp.g44 === 1 && tp.types.join() === 'public' && tp.sub && tp.theme === id && tp.scene), fit: HP44P.fits(id), thumb: /p4-hero/.test(HPT.thumb(null, id)) }; }, id);
    ok(reg.th && reg.hd && reg.g44 && reg.fit && reg.thumb, `${id}: 등록 · g44 · 공공(${ed}) 세부 유형 · 미리보기(${JSON.stringify(reg)})`);
    const r = await a.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); S.site = s; HPT.enrich(s); return { html: siteHTML(s), theme: s.theme, color: s.color, live: s.sections.filter(x => !x.hide).map(x => (x.data && x.data.hpt) || x.type) }; }, id);
    ok(r.theme === id && r.color === (await a.p.evaluate(id => HP44P.DEF[id].acc, id)), `${id}: 테마 · 시안 색 그대로(${r.theme} ${r.color})`);
    const hero = (r.html.match(/<section class="hpt p4 [a-z]+ p4-hero"[\s\S]*?<\/section>/) || [''])[0];
    ok(r.live[0] === 'banner' && !!hero, `${id}: 첫 화면 = 전용 첫 화면(${r.live.join(',')})`);
    ok(!/p4-(num|tag n)|D-\d|<table/.test(hero), `${id}: 첫 화면에 숫자 판 · D-day · 표 없음`);
    heroImg[id] = ((hero.match(/<img src="([^"]+)"/) || [])[1] || '').split('/').pop().replace(/(-800)?\.webp.*/, '');
    heroCls[id] = (hero.match(/p4-hero[^"]*"><(div|figure) class="([^"]+)"/) || [])[2] || '';
    ok(!/hps-flow|hps-short/.test((r.html.match(/<section class="[^"]*\bp4\b[^"]*"/g) || []).join(' ')), `${id}: 섹션 간격 압축 클래스 제거`);
    const { L, bad } = await linksOf(a.p, r.html);
    ok(L.length >= 6 && !bad.length, `${id}: 버튼 · 링크 ${L.length}개 모두 실제 경로 ${bad.join(',')}`);
    ok(!/학번|주민등록|주민번호|<input|<form/.test((r.html.match(/<section class="hpt p4[\s\S]*?<\/section>/g) || []).join('')), `${id}: 개인정보 — 입력 칸 · 번호 수집 문구 없음`);
    ok(!/NaN|undefined|object Object/.test(r.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')), `${id}: NaN · undefined 없음`);
    if (['pbjournal', 'pbmuseum', 'pbheritage'].includes(id)) ok(/noto-serif-kr\/font\.css/.test(r.html), `${id}: 세리프 글꼴`);
    if (id === 'pbposter') { const f = await a.p.evaluate(() => S.fac.facilities.filter(f => f.on !== false).slice(0, 5).map(f => f.name)); ok(f.every(n => r.html.includes(n)) && /p4-hours/.test(r.html) && L.includes('#fac') && L.includes('#shop'), `pbposter: 실제 시설 ${f.length}곳 · 운영 시간 · #fac · #shop`); }
    if (id === 'pbcivic') ok(/공식 누리집입니다/.test(r.html) && ['#my', '#courses', '#badges', '#cal', '#notice'].every(h => L.includes(h)), 'pbcivic: 공식 누리집 띠 · 자주 찾는 서비스');
    if (id === 'pbyouth' || id === 'pbsenior') ok(L.includes('#family'), `${id}: 보호자 · 가족 연결(#family)`);
    if (id === 'pbsenior') ok(/p4-call/.test(r.html) && /p4-big/.test(r.html), 'pbsenior: 전화 신청 띠 · 큰 글씨 강좌');
    await view(id, r.html, 5, !!CAP);
    ok(!a.errs.length, `${id}: 관리자 pageerror 0 ${a.errs.join('|')}`); await a.ctx.close(); }
  const imgs = Object.values(heroImg); if (!process.env.ONLY) ok(imgs.every(Boolean) && new Set(imgs).size === imgs.length, `첫 화면 사진 10종 모두 다름(${imgs.join(',')})`);

  /* ── 데이터 없음(빈 스튜디오) ── */
  for (const [id, ed] of [['pbcivic', 'staff'], ['pbsenior', 'citizen'], ['pbcampus', 'staff']].filter(c => !process.env.ONLY || process.env.ONLY.split(',').includes(c[0]))) { const a = await admin(ed, true);
    const r = await a.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); return { n: S.classes.length, html: siteHTML(s) }; }, id);
    ok(r.n === 0 && /p4-hero/.test(r.html) && !/p4-(rows|figs|big|tracks|shelf|wide)"/.test(r.html) && !/NaN|undefined|object Object/.test(r.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')), `${id}: 빈 스튜디오 — 강좌 · 숫자 섹션 숨김 · 첫 화면 유지(${r.n} ${(r.html.match(/p4-(rows|figs|big|tracks|shelf|wide)"/g) || []).join(',')} ${(r.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').match(/.{30}(NaN|undefined|object Object).{10}/) || [''])[0]})`);
    await view(id + '-empty', r.html, 2, false); ok(!a.errs.length, `${id} 빈 상태 pageerror 0 ${a.errs.join('|')}`); await a.ctx.close(); }

  /* ── 실제 게시본(learner.html Shadow DOM): 시민 저널 ── */
  { const a = await admin('citizen', false);
    const tid = await a.p.evaluate(() => { try { closeModal(); } catch (e) { } const s = siteFromTpl(TPL.find(t => t.id === 't44-pbjournal')); S.site = s; s.published = true; save(); smPublish(); try { closeModal(); } catch (e) { } return DREG.cur(); });
    for (const w of [1440, 390]) { const q = await a.ctx.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.setViewportSize({ width: w, height: 900 });
      await q.goto(`${base}/learner.html?t=${tid}#home`, { waitUntil: 'load' }); await q.waitForTimeout(1500);
      const r = await q.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const one = sel => R.map(r => r.querySelector(sel)).find(Boolean);
        const h1 = one('section.p4-hero h1'); return { hero: !!h1, fs: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, cls: (R.map(r => [...r.querySelectorAll('a[href^="#class/"]')]).flat()).length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      ok(r.hero && r.cls >= 1 && r.over <= 0 && (w > 600 ? r.fs >= 64 : r.fs <= 46), `게시본 pbjournal ${w}: 첫 화면 · 과정 상세(#class/) · 넘침 0(${JSON.stringify(r)})`);
      ok(!pe.length, `게시본 pbjournal ${w} pageerror 0 ${pe.join('|')}`); await q.close(); }
    await a.ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
