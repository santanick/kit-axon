'use strict';
/* v43.9 기업 · 공공 홈페이지 템플릿(hpv-corp.js) 점검 — 키노트 · 시민 저널 · 시티 포스터 · 관공서 · 전통 기업
   - 등록(HPT · HPD · TPL) · 갤러리 노출(기관 유형 추천 · 첫 순서) · 미리보기(HPT.thumb)
   - 게시본 PC 1440 · 390: 가로 넘침 0 · 화면 밖 요소 0 · 누르는 칸 44px(390) · 글자 13px 이상 · 한 글자 꺾임 0 · pageerror 0
   - 버튼 · 링크가 학습자 실제 경로(#my · #courses · #badges · #cal · #notice · #login · #fac · #shop · #comm · tel: · #p-c-<id>)인지
   - 데이터 없음(빈 스튜디오): 숫자 · 강좌 섹션이 숨겨지고 첫 화면은 그대로
   - 실제 게시본(learner.html Shadow DOM) 1종
   index.html에 hpv-corp.js 태그가 없으면 이 테스트가 hpprem.js 뒤에 주입한다(태그 · ?v=는 통합 담당).
   사용: node tests/ui/tpl439-corp.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const CASES = [['cvkeynote', 'corp', ''], ['cvjournal', 'public', 'citizen'], ['cvposter', 'public', 'facility'], ['cvcivic', 'public', 'staff'], ['cvheritage', 'corp', '']];
const ROUTES = /^#(my|courses|badges|notice|login|home|shop|comm|cal|fac|join)$/;

(async () => {
  const PV = new Map();
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    let body = fs.readFileSync(f); if (u === '/index.html' && !/hpv-corp\.js/.test(body)) body = String(body).replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1\n<script src="hpv-corp.js"></script>');
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(body); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const view = async (key, html, minN) => { PV.set(key + '.html', html.replace('<head>', `<head><base href="${base}/">`));
    for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: 900 } }); const q = await c2.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await q.goto(`${base}/__pv/${key}.html`, { waitUntil: 'load' }); await q.waitForTimeout(400);
      const m = await q.evaluate(w => { const de = document.documentElement; const vw = de.clientWidth; const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const C = [...document.querySelectorAll('section.cv')]; const inS = el => C.some(s => s.contains(el));
        return { n: C.length, over: de.scrollWidth - vw, out: [...document.querySelectorAll('section.cv *')].filter(el => vis(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest('.cv-cg')).length,
          small: w < 600 ? [...document.querySelectorAll('section.cv a')].filter(a => vis(a) && a.getBoundingClientRect().height < 44).map(a => a.textContent.trim().slice(0, 12)) : [],
          tiny: [...document.querySelectorAll('section.cv *')].filter(el => vis(el) && inS(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13).map(el => el.textContent.trim().slice(0, 10)),
          narrow: [...document.querySelectorAll('section.cv :is(h1,h2,h3,b,small,a,p,em,span)')].filter(el => { if (!vis(el) || el.textContent.trim().length < 3) return false; const r = el.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(el).fontSize); return r.height > fs * 5 && r.width < fs * 2.2; }).length,
          h1: (() => { const h = document.querySelector('section.cv-hero h1'); return h ? parseFloat(getComputedStyle(h).fontSize) : 0; })() }; }, w);
      ok(m.n >= (minN || 4) && m.over <= 0 && !m.out, `${key} ${w}: 섹션 ${m.n}개 · 가로 넘침 0 · 화면 밖 요소 0(${m.over}/${m.out})`);
      ok(!m.small.length, `${key} ${w}: 누르는 칸 44px 이상 ${m.small.join(',')}`);
      ok(!m.tiny.length, `${key} ${w}: 글자 13px 이상 ${m.tiny.join(',')}`);
      ok(!m.narrow, `${key} ${w}: 한 글자 꺾임 0(${m.narrow})`);
      ok(w > 600 ? m.h1 >= 64 : m.h1 >= 36 && m.h1 <= 46, `${key} ${w}: 첫 화면 제목 크기 ${m.h1}px(PC 64~88 · 휴대폰 36~44)`);
      ok(!pe.length, `${key} ${w}: pageerror 0 ${pe.join('|')}`);
      await c2.close(); } };
  const admin = async (type, ed, empty) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(([t, e, emp]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', emp ? '1' : '0'); const bx = document.querySelector('#suEmpty'); if (bx) bx.checked = !!emp; createOrg(t, t === 'corp' ? '한빛테크' : e === 'citizen' ? '해운대구 시민대학' : e === 'facility' ? '좌동 스포츠문화센터' : '해운대구 인재개발원', e || undefined); }, [type, ed, empty]); await p.waitForTimeout(1200);
    return { ctx, p, errs }; };
  const linksOf = async (p, html) => { const L = await p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('section.cv a[href]')].map(a => a.getAttribute('href')); }, html); const cid = await p.evaluate(() => S.classes.map(c => c.id));
    return { L, bad: L.filter(h => !(ROUTES.test(h) || (/^#p-c-/.test(h) && cid.includes(h.slice(5))) || /^tel:[\d-]+$/.test(h))) }; };

  for (const [id, type, ed] of CASES) { const a = await admin(type, ed, false);
    const reg = await a.p.evaluate(id => ({ th: HPT.has(id), prem: !!(HPT.meta(id) || {}).prem, hd: !!(window.HPD && HPD.list().includes(id)), tp: TPL.some(t => t.id === 'prem-' + id && t.prem && t.noPalette), fit: HPT.premFits(id), first: HPT.premFor().slice(0, 2).includes(id), thumb: /cv-hero/.test(HPT.thumb(null, id)) }), id);
    ok(reg.th && reg.prem && reg.hd && reg.tp && reg.fit && reg.first && reg.thumb, `${id}: 등록 · 기관 유형(${type}${ed ? ' ' + ed : ''}) 추천 · 앞 순서 · 미리보기(${JSON.stringify(reg)})`);
    const r = await a.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); S.site = s; return { html: siteHTML(s), color: s.color, live: s.sections.filter(x => !x.hide).map(x => (x.data && x.data.hpt) || x.type) }; }, id);
    ok(r.color === (await a.p.evaluate(id => HPVC.DEF[id].acc, id)), `${id}: 시안 색 그대로(팔레트로 바뀌지 않음 ${r.color})`);
    ok(r.live[0] === 'banner' && /class="hpt cv [a-z]+ cv-hero"/.test(r.html), `${id}: 첫 화면 = 시안 첫 화면(${r.live.join(',')})`);
    const hero = (r.html.match(/<section class="hpt cv [a-z]+ cv-hero"[\s\S]*?<\/section>/) || [''])[0];
    ok(!/cv-(num|tag n|stat)|D-\d/.test(hero.replace(/cv-tag">/, '')) || id === 'cvposter', `${id}: 첫 화면에 숫자 판 · D-day 없음(한 화면 한 메시지)`);
    ok(!/hps-flow|hps-short/.test((r.html.match(/<section class="[^"]*\bcv\b[^"]*"/g) || []).join(' ')), `${id}: 섹션 간격 압축 클래스 제거(시안 리듬)`);
    const { L, bad } = await linksOf(a.p, r.html);
    ok(L.length >= 6 && !bad.length, `${id}: 버튼 · 링크 ${L.length}개 모두 실제 경로 ${bad.join(',')}`);
    ok(!/학번|주민등록|주민번호|휴대폰 번호|<input|<form/.test((r.html.match(/<section class="hpt cv[\s\S]*?<\/section>/g) || []).join('')), `${id}: 개인정보 — 입력 칸 · 번호 수집 문구 없음`);
    if (id === 'cvkeynote') ok(/cv-stat/.test(r.html) && /cv-cards/.test(r.html) && L.includes('#my') && L.some(h => /^#p-c-/.test(h)), 'cvkeynote: 실제 이수율 숫자 · 과정 카드 · #my · 과정 상세');
    if (id === 'cvposter') { const f = await a.p.evaluate(() => S.fac.facilities.filter(f => f.on !== false).slice(0, 5).map(f => f.name)); ok(f.every(n => r.html.includes(n)) && /cv-hours/.test(r.html) && L.includes('#fac') && L.includes('#shop') && !/object Object/.test(r.html), `cvposter: 실제 시설 ${f.length}곳 · 운영 시간 · #fac · #shop`); }
    if (id === 'cvcivic') ok(/공식 누리집입니다/.test(r.html) && /cv-svc/.test(r.html) && ['#my', '#courses', '#badges', '#cal', '#notice'].every(h => L.includes(h)) && /cv-rows/.test(r.html), 'cvcivic: 공식 누리집 띠 · 자주 찾는 서비스(#my · #courses · #badges · #cal · #notice) · 날짜 열 목록');
    if (id === 'cvjournal') ok(/noto-serif-kr\/font\.css/.test(r.html) && /cv-mag/.test(r.html) && /cv-band/.test(r.html), 'cvjournal: 세리프 글꼴 · 잡지형 강좌 · 무료 강좌 사진 띠');
    if (id === 'cvheritage') ok(/cv-levels/.test(r.html) && /cv-vals/.test(r.html) && /cv-figs/.test(r.html), 'cvheritage: 교육 철학 · 계층별 체계 · 숫자');
    await view(id, r.html);
    ok(!a.errs.length, `${id}: 관리자 pageerror 0 ${a.errs.join('|')}`); await a.ctx.close(); }

  /* ── 데이터 없음(빈 스튜디오): 숫자 · 강좌 섹션은 숨기고 첫 화면 · 안내 섹션은 그대로 ── */
  for (const [id, type, ed] of [['cvkeynote', 'corp', ''], ['cvcivic', 'public', 'staff']]) { const a = await admin(type, ed, true);
    const r = await a.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); return { n: S.classes.length, html: siteHTML(s) }; }, id);
    ok(r.n === 0 && /cv-hero/.test(r.html) && !/cv-(stat|cards|rows|figs)"/.test(r.html) && !/NaN|undefined|object Object/.test(r.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')), `${id}: 빈 스튜디오 — 숫자 · 강좌 섹션 숨김 · 첫 화면 유지 · NaN/undefined 없음`);
    await view(id + '-empty', r.html, 2); ok(!a.errs.length, `${id} 빈 상태 pageerror 0 ${a.errs.join('|')}`); await a.ctx.close(); }

  /* ── 실제 게시본(learner.html Shadow DOM): 키노트 ── */
  { const a = await admin('corp', '', false);
    const tid = await a.p.evaluate(() => { try { closeModal(); } catch (e) { } const s = siteFromTpl(TPL.find(t => t.id === 'prem-cvkeynote')); S.site = s; s.published = true; save(); smPublish(); try { closeModal(); } catch (e) { } return DREG.cur(); });
    for (const w of [1440, 390]) { const q = await a.ctx.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.setViewportSize({ width: w, height: 900 });
      await q.goto(`${base}/learner.html?t=${tid}#home`, { waitUntil: 'load' }); await q.waitForTimeout(1500);
      const r = await q.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const one = sel => R.map(r => r.querySelector(sel)).find(Boolean);
        const h1 = one('section.cv-hero h1'); return { hero: !!h1, fs: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, stat: !!one('section.cv-stat'), cls: (R.map(r => [...r.querySelectorAll('a[href^="#class/"]')]).flat()).length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      ok(r.hero && r.stat && r.cls >= 1 && r.over <= 0 && (w > 600 ? r.fs >= 64 : r.fs <= 46), `게시본 cvkeynote ${w}: 첫 화면 · 이수율 · 과정 상세(#class/) · 넘침 0(${JSON.stringify(r)})`);
      ok(!pe.length, `게시본 cvkeynote ${w} pageerror 0 ${pe.join('|')}`); await q.close(); }
    await a.ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
