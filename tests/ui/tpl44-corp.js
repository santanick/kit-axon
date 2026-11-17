'use strict';
/* v44 기업 교육 홈페이지 템플릿 12종(v44.1: CS · 콜센터, 대리점 · 가맹점 추가)(hp44-corp.js) 점검
   - 10종 등록(HPT · HPD · TPL t44- · g44 · types corp · sub) · 첫 화면 종류 10가지 모두 다름 · 첫 화면 사진 중복 없음
   - 게시본 PC 1440 · 390: 가로 넘침 0 · 화면 밖 요소 0 · 누르는 칸 44px(390) · 글자 13px 이상 · 한 글자 꺾임 0 · 제목 크기 · pageerror 0
   - 버튼 · 링크가 학습자 실제 경로(#my · #courses · #cert · #notice · #comm · #login · #join · tel: · #p-c-<id>)인지
   - 빈 기관(빈 스튜디오): 강좌 · 숫자 섹션 숨김 · NaN/undefined 없음 · 첫 화면 유지
   - 실제 게시본(learner.html Shadow DOM) 1종
   index.html에 hp44-corp.js 태그가 없으면 이 테스트가 hpprem.js 뒤에 주입한다(태그 · ?v=는 통합 담당).
   사용: node tests/ui/tpl44-corp.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const IDS = ['cphrd', 'cplegal', 'cponboard', 'cplead', 'cpdx', 'cpsales', 'cpheritage', 'cpstartup', 'cppartner', 'cpuniv', 'cpcs', 'cpstore'];
const ROUTES = /^#(my|courses|cert|notice|comm|login|join|home|shop)$/;

(async () => {
  const PV = new Map();
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    let body = fs.readFileSync(f); if (u === '/index.html' && !/hp44-corp\.js/.test(body)) body = String(body).replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1\n<script src="hp44-corp.js"></script>');
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(body); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const view = async (key, html, minN) => { PV.set(key + '.html', html.replace('<head>', `<head><base href="${base}/">`));
    for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 } }); const q = await c2.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await q.goto(`${base}/__pv/${key}.html`, { waitUntil: 'load' }); await q.waitForTimeout(300);
      const m = await q.evaluate(w => { const de = document.documentElement; const vw = de.clientWidth; const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const C = [...document.querySelectorAll('section.c4')];
        return { n: C.length, over: de.scrollWidth - vw, out: [...document.querySelectorAll('section.c4 *')].filter(el => vis(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest('.c4-cg')).length,
          small: w < 600 ? [...document.querySelectorAll('section.c4 a')].filter(a => vis(a) && a.getBoundingClientRect().height < 44).map(a => a.textContent.trim().slice(0, 12)) : [],
          tiny: [...document.querySelectorAll('section.c4 *')].filter(el => vis(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13).map(el => el.textContent.trim().slice(0, 10)),
          narrow: [...document.querySelectorAll('section.c4 :is(h1,h2,h3,b,small,a,p,em,span)')].filter(el => { if (!vis(el) || el.textContent.trim().length < 3) return false; const r = el.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(el).fontSize); return r.height > fs * 5 && r.width < fs * 2.2; }).length,
          h1: (() => { const h = document.querySelector('section.c4-hero h1'); return h ? parseFloat(getComputedStyle(h).fontSize) : 0; })(), cta: (() => { const b = [...document.querySelectorAll('section.c4-hero .c4-cta a')].pop(); return b ? Math.round(b.getBoundingClientRect().bottom) : 0; })(), heroImg: [...document.querySelectorAll('section.c4-hero img')].filter(i => i.getBoundingClientRect().width > 0).map(i => i.complete && i.naturalWidth > 0), badImg: [...document.querySelectorAll('section.c4 img')].filter(i => i.complete && !i.naturalWidth).length }; }, w);
      ok(m.n >= (minN || 4) && m.over <= 0 && !m.out, `${key} ${w}: 섹션 ${m.n}개 · 가로 넘침 0 · 화면 밖 요소 0(${m.over}/${m.out})`);
      ok(!m.small.length, `${key} ${w}: 누르는 칸 44px 이상 ${m.small.join(',')}`);
      ok(!m.tiny.length, `${key} ${w}: 글자 13px 이상 ${m.tiny.join(',')}`);
      ok(!m.narrow, `${key} ${w}: 한 글자 꺾임 0(${m.narrow})`);
      ok(w > 600 ? m.h1 >= 64 && m.h1 <= 104 : m.h1 >= 36 && m.h1 <= 48, `${key} ${w}: 첫 화면 제목 ${m.h1}px(PC 64~104 · 휴대폰 36~48)`);
      if (w < 600) ok(m.cta > 0 && m.cta <= 844, `${key} 390: 첫 화면 안에 제목 · 버튼(마지막 버튼 아래 ${m.cta}px ≤ 844)`);
      ok(!m.badImg && (!m.heroImg.length || m.heroImg.every(Boolean)), `${key} ${w}: 사진이 실제로 나옴(첫 화면 ${m.heroImg.length}장 · 깨진 사진 ${m.badImg})`);
      ok(!pe.length, `${key} ${w}: pageerror 0 ${pe.join('|')}`);
      await c2.close(); } };
  const admin = async empty => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(emp => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', emp ? '1' : '0'); const bx = document.querySelector('#suEmpty'); if (bx) bx.checked = !!emp; createOrg('corp', '한빛테크'); }, empty); await p.waitForTimeout(1200);
    return { ctx, p, errs }; };

  const a = await admin(false);
  const reg = await a.p.evaluate(ids => ids.map(id => { const t = TPL.find(x => x.id === 't44-' + id) || {}; return { id, th: HPT.has(id), hd: !!(window.HPD && HPD.list().includes(id)), g44: t.g44 === 1, types: (t.types || []).join(), sub: t.sub || '', k: HP44C.DEF[id].k, hero: HP44C.DEF[id].ph.hero || '', fit: HPT.premFits(id, 'corp'), thumb: /c4-hero/.test(HPT.thumb(null, id)) && (HP44C.DEF[id].k === 'list' || /c4-hero[\s\S]*?<img[^>]+src="[^"]*img\/stock\/[a-z]{3}-\d{2}/.test(HPT.thumb(null, id))) }; }), IDS);
  reg.forEach(r => ok(r.th && r.hd && r.g44 && r.types === 'corp' && r.sub && r.fit && r.thumb, `${r.id}: 등록 · g44 · types corp · 세부 유형 「${r.sub}」 · 미리보기(${JSON.stringify(r)})`));
  ok(new Set(reg.map(r => r.k)).size === IDS.length, `첫 화면 종류 ${IDS.length}가지 모두 다름(${reg.map(r => r.k).join(' · ')})`);
  const heroes = reg.map(r => r.hero).filter(Boolean); ok(new Set(heroes).size === heroes.length, `첫 화면 사진 중복 없음(${heroes.join(',')})`);
  ok(reg.some(r => /전통/.test(r.sub)), '전통 · 격식형 1종 이상');
  const cid = await a.p.evaluate(() => S.classes.map(c => c.id));
  for (const id of IDS) {
    const r = await a.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); S.site = s; return { html: siteHTML(s), color: s.color, theme: s.theme, first: (s.sections.find(x => !x.hide) || {}).type }; }, id);
    ok(r.theme === id && r.first === 'banner' && new RegExp(`class="hpt c4 ${id} c4-hero`).test(r.html) && /^#[0-9a-f]{6}$/i.test(r.color), `${id}: 테마 적용 · 첫 화면 = 시안 첫 화면 · 기관 색(${r.color}, 흰 글자 대비 보정 허용)`);
    const L = await a.p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('section.c4 a[href]')].map(a => a.getAttribute('href')); }, r.html);
    const bad = L.filter(h => !(ROUTES.test(h) || (/^#p-c-/.test(h) && cid.includes(h.slice(5))) || /^tel:[\d-]+$/.test(h)));
    ok(L.length >= 6 && !bad.length && L.some(h => /^#p-c-/.test(h)), `${id}: 링크 ${L.length}개 실제 경로 · 과정 상세 포함 ${bad.join(',')}`);
    ok(!/hps-flow|hps-short/.test((r.html.match(/<section class="[^"]*\bc4\b[^"]*"/g) || []).join(' ')), `${id}: 섹션 간격 압축 클래스 제거`);
    ok(!/NaN|undefined|object Object|<input|<form|주민등록|휴대폰 번호/.test((r.html.match(/<section class="hpt c4[\s\S]*?<\/section>/g) || []).join('')), `${id}: 이상 값 · 입력 칸 · 개인정보 문구 없음`);
    await view(id, r.html); }
  /* QA 11-18: 낮은 숫자 블록 숨김 · 후기 필터 */
  { const q = await a.p.evaluate(() => { const out = {}; const ids = ['cplegal', 'cpdx', 'cpheritage', 'cpuniv']; const h = id => siteHTML(siteFromTpl(TPL.find(t => t.id === 't44-' + id)));
      out.n = S.classes.filter(c => c.status !== '종료').length; out.figs = ids.filter(id => /class="hpt c4 [a-z]+ c4-figs"/.test(h(id)));
      out.nums = /운영 중인 과정<\/p>|함께 배우는 인원<\/p>/.test(h('cpdx'));
      const keep = S.reviews; S.reviews = [{ id: 'r1', cls: S.classes[0].id, stars: 5, body: '영상이 자꾸 끊겨요 확인 부탁드립니다', at: '2026-11-10' }, { id: 'r2', cls: S.classes[0].id, stars: 5, body: '퀴즈 3번 해설도 올려 주실 수 있나요?', at: '2026-11-11' }];
      out.bad = /c4-quote"/.test(h('cphrd'));
      S.reviews.push({ id: 'r3', cls: S.classes[0].id, stars: 5, body: '팀장이 되고 처음 6주가 막막했는데 리더 과정이 지도가 돼 줬어요', at: '2026-11-12' });
      const g = h('cphrd'); out.good = /c4-quote"/.test(g) && /지도가 돼 줬어요/.test(g) && !/끊겨요|해설도/.test(g); S.reviews = keep; return out; });
    ok(q.n < 10 && !q.figs.length && !q.nums, `숫자 블록: 과정 ${q.n}개 · 인원 100명 미만 시연 데이터에서 4종 모두 숨김(${q.figs.join(',')})`);
    ok(!q.bad && q.good, `후기 인용: 불만 · 요청 · 질문 글 제외, 긍정 글만 크게(${JSON.stringify(q)})`); }
  ok(!a.errs.length, `관리자 pageerror 0 ${a.errs.join('|')}`); await a.ctx.close();

  /* ── 빈 기관 ── */
  { const e = await admin(true);
    for (const id of ['cphrd', 'cplegal', 'cpheritage']) { const r = await e.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); return { n: S.classes.length, html: siteHTML(s) }; }, id);
      const body = (r.html.match(/<section class="hpt c4[\s\S]*?<\/section>/g) || []).join('');
      ok(r.n === 0 && /c4-hero/.test(r.html) && !/c4-(stat|cards|rows|figs|levels|prog)"/.test(r.html) && !/NaN|undefined|object Object/.test(body), `${id}: 빈 기관 — 강좌 · 숫자 섹션 숨김 · 첫 화면 유지`);
      await view(id + '-empty', r.html, 2); }
    ok(!e.errs.length, `빈 기관 pageerror 0 ${e.errs.join('|')}`); await e.ctx.close(); }

  /* ── 실제 게시본(learner.html Shadow DOM) ── */
  { const g = await admin(false);
    const tid = await g.p.evaluate(() => { try { closeModal(); } catch (e) { } const s = siteFromTpl(TPL.find(t => t.id === 't44-cplead')); S.site = s; s.published = true; save(); smPublish(); try { closeModal(); } catch (e) { } return DREG.cur(); });
    for (const w of [1440, 390]) { const q = await g.ctx.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.setViewportSize({ width: w, height: 900 });
      await q.goto(`${base}/learner.html?t=${tid}#home`, { waitUntil: 'load' }); await q.waitForTimeout(1500);
      const r = await q.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const one = sel => R.map(r => r.querySelector(sel)).find(Boolean);
        const h1 = one('section.c4-hero h1'); return { hero: !!h1, fs: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, cls: R.map(r => [...r.querySelectorAll('section.c4 a[href^="#class/"]')]).flat().length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      ok(r.hero && r.cls >= 1 && r.over <= 0 && (w > 600 ? r.fs >= 64 : r.fs <= 46), `게시본 cplead ${w}: 첫 화면 · 과정 상세(#class/) · 넘침 0(${JSON.stringify(r)})`);
      ok(!pe.length, `게시본 ${w} pageerror 0 ${pe.join('|')}`); await q.close(); }
    await g.ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
