'use strict';
/* v44 평생교육 · 시니어 홈페이지 템플릿 10종(hp44-life.js) 점검
   - 10종 등록(HPT · HPD · TPL t44- · g44 · types lifelong · sub) · 첫 화면 종류 10가지 모두 다름 · 첫 화면 사진 중복 없음
   - 게시본 PC 1440 · 390: 가로 넘침 0 · 화면 밖 요소 0 · 누르는 칸 44px(390) · 글자 13px 이상 · 한 글자 꺾임 0 · 제목 크기 · pageerror 0
   - 버튼 · 링크가 학습자 실제 경로(#my · #courses · #cert · #notice · #comm · #login · #join · tel: · #p-c-<id>)인지
   - 빈 기관(빈 스튜디오): 강좌 · 숫자 섹션 숨김 · NaN/undefined 없음 · 첫 화면 유지
   - 실제 게시본(learner.html Shadow DOM) 1종
   index.html에 hp44-life.js 태그가 없으면 이 테스트가 hpprem.js 뒤에 주입한다(태그 · ?v=는 통합 담당).
   사용: node tests/ui/tpl44-life.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const IDS = ['lfhall', 'lfuniv', 'lfsenior', 'lfhuman', 'lfvillage', 'lfcredit', 'lfculture', 'lflibrary', 'lfretire', 'lffamily'];
const ROUTES = /^#(my|courses|cert|notice|comm|login|join|home|shop)$/;

(async () => {
  const PV = new Map();
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    let body = fs.readFileSync(f); if (u === '/index.html' && !/hp44-life\.js/.test(body)) body = String(body).replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1\n<script src="hp44-life.js"></script>');
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(body); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const view = async (key, html, minN) => { PV.set(key + '.html', html.replace('<head>', `<head><base href="${base}/">`));
    for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: 900 } }); const q = await c2.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await q.goto(`${base}/__pv/${key}.html`, { waitUntil: 'load' }); await q.waitForTimeout(300);
      const m = await q.evaluate(w => { const de = document.documentElement; const vw = de.clientWidth; const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const C = [...document.querySelectorAll('section.l4')];
        return { n: C.length, over: de.scrollWidth - vw, out: [...document.querySelectorAll('section.l4 *')].filter(el => vis(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest('.l4-orb')).length,
          small: w < 600 ? [...document.querySelectorAll('section.l4 a')].filter(a => vis(a) && a.getBoundingClientRect().height < 44).map(a => a.textContent.trim().slice(0, 12)) : [],
          tiny: [...document.querySelectorAll('section.l4 *')].filter(el => vis(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13).map(el => el.textContent.trim().slice(0, 10)),
          narrow: [...document.querySelectorAll('section.l4 :is(h1,h2,h3,b,small,a,p,em,span)')].filter(el => { if (!vis(el) || el.textContent.trim().length < 3) return false; const r = el.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(el).fontSize); return r.height > fs * 5 && r.width < fs * 2.2; }).length,
          h1: (() => { const h = document.querySelector('section.l4-hero h1'); return h ? parseFloat(getComputedStyle(h).fontSize) : 0; })() }; }, w);
      ok(m.n >= (minN || 4) && m.over <= 0 && !m.out, `${key} ${w}: 섹션 ${m.n}개 · 가로 넘침 0 · 화면 밖 요소 0(${m.over}/${m.out})`);
      ok(!m.small.length, `${key} ${w}: 누르는 칸 44px 이상 ${m.small.join(',')}`);
      ok(!m.tiny.length, `${key} ${w}: 글자 13px 이상 ${m.tiny.join(',')}`);
      ok(!m.narrow, `${key} ${w}: 한 글자 꺾임 0(${m.narrow})`);
      ok(w > 600 ? m.h1 >= 64 && m.h1 <= 104 : m.h1 >= 36 && m.h1 <= 46, `${key} ${w}: 첫 화면 제목 ${m.h1}px(PC 64~104 · 휴대폰 36~44)`);
      ok(!pe.length, `${key} ${w}: pageerror 0 ${pe.join('|')}`);
      await c2.close(); } };
  const admin = async empty => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(emp => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', emp ? '1' : '0'); const bx = document.querySelector('#suEmpty'); if (bx) bx.checked = !!emp; createOrg('lifelong', '해운대평생학습관'); }, empty); await p.waitForTimeout(1200);
    return { ctx, p, errs }; };

  const a = await admin(false);
  const reg = await a.p.evaluate(ids => ids.map(id => { const t = TPL.find(x => x.id === 't44-' + id) || {}; return { id, th: HPT.has(id), hd: !!(window.HPD && HPD.list().includes(id)), g44: t.g44 === 1, types: (t.types || []).join(), sub: t.sub || '', k: HP44L.DEF[id].k, hero: HP44L.DEF[id].ph.hero || '', fit: HPT.premFits(id, 'lifelong'), thumb: /l4-hero/.test(HPT.thumb(null, id)) }; }), IDS);
  reg.forEach(r => ok(r.th && r.hd && r.g44 && r.types === 'lifelong' && r.sub && r.fit && r.thumb, `${r.id}: 등록 · g44 · types lifelong · 세부 유형 「${r.sub}」 · 미리보기(${JSON.stringify(r)})`));
  ok(new Set(reg.map(r => r.k)).size === 10, `첫 화면 종류 10가지 모두 다름(${reg.map(r => r.k).join(' · ')})`);
  const heroes = reg.map(r => r.hero).filter(Boolean); ok(new Set(heroes).size === heroes.length, `첫 화면 사진 중복 없음(${heroes.join(',')})`);
  ok(reg.some(r => /전통/.test(r.sub)), '전통 · 격식형 1종 이상');
  const cid = await a.p.evaluate(() => S.classes.map(c => c.id));
  for (const id of IDS) {
    const r = await a.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); S.site = s; return { html: siteHTML(s), color: s.color, theme: s.theme, first: (s.sections.find(x => !x.hide) || {}).type }; }, id);
    ok(r.theme === id && r.first === 'banner' && new RegExp(`class="hpt l4 ${id} l4-hero`).test(r.html) && /^#[0-9a-f]{6}$/i.test(r.color), `${id}: 테마 적용 · 첫 화면 = 시안 첫 화면 · 기관 색(${r.color}, 흰 글자 대비 보정 허용)`);
    const L = await a.p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('section.l4 a[href]')].map(a => a.getAttribute('href')); }, r.html);
    const bad = L.filter(h => !(ROUTES.test(h) || (/^#p-c-/.test(h) && cid.includes(h.slice(5))) || /^tel:[\d-]+$/.test(h)));
    ok(L.length >= 6 && !bad.length && L.some(h => /^#p-c-/.test(h)), `${id}: 링크 ${L.length}개 실제 경로 · 과정 상세 포함 ${bad.join(',')}`);
    ok(!/hps-flow|hps-short/.test((r.html.match(/<section class="[^"]*\bl4\b[^"]*"/g) || []).join(' ')), `${id}: 섹션 간격 압축 클래스 제거`);
    ok(!/NaN|undefined|object Object|<input|<form|주민등록|휴대폰 번호/.test((r.html.match(/<section class="hpt l4[\s\S]*?<\/section>/g) || []).join('')), `${id}: 이상 값 · 입력 칸 · 개인정보 문구 없음`);
    ok(!/국비|훈련생|고용24|내일배움/.test((r.html.match(/<section class="hpt l4[\s\S]*?<\/section>/g) || []).join('')), `${id}: 평생교육에 훈련 · 국비 문구 없음`);
    await view(id, r.html); }
  /* ── 시니어: 큰 글씨 · 큰 버튼 ── */
  { const html = await a.p.evaluate(() => { const s = siteFromTpl(TPL.find(t => t.id === 't44-lfsenior')); return siteHTML(s); }); PV.set('sen.html', html.replace('<head>', `<head><base href="${base}/">`));
    for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: 900 } }); const q = await c2.newPage(); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await q.goto(`${base}/__pv/sen.html`, { waitUntil: 'load' });
      const m = await q.evaluate(() => ({ bb: [...document.querySelectorAll('.l4-bb, section.l4 .l4-b')].map(b => b.getBoundingClientRect().height).filter(h => h > 0), body: Math.min(...[...document.querySelectorAll('section.l4 :is(p,small,dd,li)')].filter(e => e.getBoundingClientRect().height > 0 && e.textContent.trim()).map(e => parseFloat(getComputedStyle(e).fontSize))), lead: parseFloat(getComputedStyle(document.querySelector('.l4-hero .l4-lead')).fontSize) }));
      ok(Math.min(...m.bb) >= 64 && m.lead >= 20 && m.body >= 14, `lfsenior ${w}: 버튼 64px 이상(${Math.min(...m.bb)}) · 첫 화면 부제 ${m.lead}px · 최소 글자 ${m.body}px`); await c2.close(); } }
  ok(!a.errs.length, `관리자 pageerror 0 ${a.errs.join('|')}`); await a.ctx.close();

  /* ── 빈 기관 ── */
  { const e = await admin(true);
    for (const id of ['lfhall', 'lfsenior', 'lfcredit', 'lfhuman']) { const r = await e.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); return { n: S.classes.length, html: siteHTML(s) }; }, id);
      const body = (r.html.match(/<section class="hpt l4[\s\S]*?<\/section>/g) || []).join('');
      ok(r.n === 0 && /l4-hero/.test(r.html) && !/l4-(cards|rows|num)"/.test(r.html) && !/NaN|undefined|object Object/.test(body), `${id}: 빈 기관 — 강좌 · 숫자 섹션 숨김 · 첫 화면 유지`);
      await view(id + '-empty', r.html, 2); }
    ok(!e.errs.length, `빈 기관 pageerror 0 ${e.errs.join('|')}`); await e.ctx.close(); }

  /* ── 실제 게시본(learner.html Shadow DOM) ── */
  { const g = await admin(false);
    const tid = await g.p.evaluate(() => { try { closeModal(); } catch (e) { } const s = siteFromTpl(TPL.find(t => t.id === 't44-lfhall')); S.site = s; s.published = true; save(); smPublish(); try { closeModal(); } catch (e) { } return DREG.cur(); });
    for (const w of [1440, 390]) { const q = await g.ctx.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.setViewportSize({ width: w, height: 900 });
      await q.goto(`${base}/learner.html?t=${tid}#home`, { waitUntil: 'load' }); await q.waitForTimeout(1500);
      const r = await q.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const one = sel => R.map(r => r.querySelector(sel)).find(Boolean);
        const h1 = one('section.l4-hero h1'); return { hero: !!h1, fs: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, cls: R.map(r => [...r.querySelectorAll('section.l4 a[href^="#class/"]')]).flat().length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      ok(r.hero && r.cls >= 1 && r.over <= 0 && (w > 600 ? r.fs >= 64 : r.fs <= 46), `게시본 lfhall ${w}: 첫 화면 · 과정 상세(#class/) · 넘침 0(${JSON.stringify(r)})`);
      ok(!pe.length, `게시본 ${w} pageerror 0 ${pe.join('|')}`); await q.close(); }
    await g.ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
