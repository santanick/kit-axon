'use strict';
/* v43.8 기업 · 공공 홈페이지 템플릿(hpx-corp.js) 점검
   - PASS 표가 비어 있으면 등록하지 않음 · window.HPX_ALL로 강제 등록
   - 등록(HPT · HPD · TPL) · 갤러리 노출(추천 · 프리미엄 묶음, 기관 유형 맞춤) · 게시 미리보기(HPT.thumb · siteHTML)
   - 390 · 1440: 가로 넘침 0 · 화면 밖 요소 0 · 본문 누르는 칸 44px 이상(390) · 글자 13px 이상 · 한 글자 꺾임 0
   - 시나리오 버튼이 학습자 사이트 실제 경로로 이어지는지(#my · #courses · #badges · #notice · #login · #class/<id>)
   사용: node tests/ui/tpl438-corp.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const IDS = ['dutydesk'];
const ROUTES = /^#(my|courses|badges|notice|login|home|shop|comm|cal|fac|textbooks)$/;

(async () => {
  const PV = new Map();
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const admin = async (all, type, ed) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); if (all) await p.addInitScript(() => { window.HPX_ALL = 1; });
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(([t, e]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const bx = document.querySelector('#suEmpty'); if (bx) bx.checked = false; createOrg(t, t === 'corp' ? '한빛테크' : '부산 인재개발원', e); }, [type, ed]); await p.waitForTimeout(1200);
    return { ctx, p, errs }; };

  /* ── PASS 표 비어 있음 → 등록 없음 ── */
  { const { ctx, p, errs } = await admin(false, 'corp');
    const r = await p.evaluate(ids => ({ th: ids.filter(id => HPT.has(id)), tp: ids.filter(id => TPL.some(t => t.id === 'prem-' + id)), x: !!window.HPXC }), IDS);
    ok(!r.th.length && !r.tp.length, `PASS 비어 있음 → 테마 · 템플릿 미등록(${JSON.stringify(r)})`);
    ok(!errs.length, `pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  /* ── HPX_ALL: 등록 · 갤러리 · 미리보기 · 시나리오 경로 ── */
  const { ctx, p, errs } = await admin(true, 'corp');
  const reg = await p.evaluate(ids => ids.map(id => ({ id, th: HPT.has(id), prem: !!(HPT.meta(id) || {}).prem, list: HPT.list.some(x => x.id === id && x.prem), hd: !!(window.HPD && HPD.list().includes(id)), tp: TPL.some(t => t.id === 'prem-' + id && t.prem) })), IDS);
  reg.forEach(r => ok(r.th && r.prem && r.list && r.hd && r.tp, `등록: ${r.id} 테마 · 목록 · 글자 토큰 · 템플릿(${JSON.stringify(r)})`));
  const gal = await p.evaluate(() => ({ fit: HPT.premFits('dutydesk'), first: HPT.premFor()[0], tags: (TPL.find(t => t.id === 'prem-dutydesk') || {}).types }));
  ok(gal.fit && gal.first === 'dutydesk' && gal.tags.includes('corp') && gal.tags.includes('public'), `갤러리: 기업 추천 · 프리미엄 첫 순서(${JSON.stringify(gal)})`);
  ok(await p.evaluate(() => { UI.tpdK = 'prem'; try { go('site'); } catch (e) { } return TPL.filter(t => t.prem).some(t => t.id === 'prem-dutydesk'); }), '갤러리: 프리미엄 묶음에 노출');
  const th = await p.evaluate(() => HPT.thumb(null, 'dutydesk')); ok(/hx-hero/.test(th) && /hx-cal/.test(th) && /hx-cert/.test(th), '게시 미리보기(HPT.thumb): 첫 화면 · 일정표 · 이수증 섹션');
  const html = await p.evaluate(() => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-dutydesk')); S.site = s; return siteHTML(s); });
  ok(/hx-led/.test(html) && /hx-roles/.test(html) && /hx-trk/.test(html), '게시본: 필수 교육 현황판 · 방문 목적 바로가기 · 직무 트랙');
  const links = await p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('section.hx a[href]')].map(a => a.getAttribute('href')); }, html);
  const ids = await p.evaluate(() => S.classes.map(c => c.id));
  const bad = links.filter(h => !(ROUTES.test(h) || (/^#p-c-/.test(h) && ids.includes(h.slice(5))) || /^(tel:|mailto:)/.test(h)));
  ok(links.length >= 10 && !bad.length, `시나리오 버튼 ${links.length}개 모두 실제 경로(${bad.join(',')})`);
  ok(['#my', '#courses', '#badges', '#login'].every(h => links.includes(h)), '시나리오: 내 필수 교육 #my · 직무 과정 #courses · 이수증 #badges · 로그인 #login');
  ok(links.some(h => /^#p-c-/.test(h)), '시나리오: 신입 온보딩 → 과정 상세(#p-c- → 게시 때 #class/<id>)');
  ok(/'courses', 'fac'\]\.includes\(r\)/.test(fs.readFileSync(ROOT + '/sitemerge.js', 'utf8')) && /key\.startsWith\('c-'\)\) return '#class\/'/.test(fs.readFileSync(ROOT + '/sitemerge.js', 'utf8')), '게시 변환: #p-c-<id> → #class/<id>(sitemerge)');
  ok(!/학번|주민|휴대폰 번호/.test(html.replace(/<style[\s\S]*?<\/style>/g, '')), '개인정보: 템플릿 문구에 학번 · 주민 · 휴대폰 수집 없음(기업은 초대 계정)');
  ok(!/\d{6}-\d{7}|010-\d{4}-\d{4}/.test((html.match(/<section class="hpt[^"]*hx[\s\S]*?<\/section>/g) || []).join('')), '개인정보: 섹션에 개인 번호 없음(이수율은 전사 합계)');
  /* 렌더 점검: 390 · 1440 */
  PV.set('corp.html', html.replace('<head>', `<head><base href="${base}/">`));
  for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: 900 } }); const q = await c2.newPage(); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await q.goto(`${base}/__pv/corp.html`, { waitUntil: 'load' }); await q.waitForTimeout(500);
    const m = await q.evaluate(w => { const de = document.documentElement; const vw = de.clientWidth; const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const H = [...document.querySelectorAll('section.hx, section.hps-cta, section.hp-s')]; const inS = el => H.some(s => s.contains(el));
      return { over: de.scrollWidth - vw, out: [...document.querySelectorAll('section.hx *')].filter(el => vis(el) && el.getBoundingClientRect().right > vw + 1).length,
        small: w < 600 ? [...document.querySelectorAll('section.hx a')].filter(a => vis(a) && a.getBoundingClientRect().height < 44).map(a => a.textContent.trim().slice(0, 12)) : [],
        tiny: [...document.querySelectorAll('body *')].filter(el => vis(el) && inS(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13).map(el => el.textContent.trim().slice(0, 10)),
        narrow: [...document.querySelectorAll('section.hx :is(h1,h2,b,small,a,p,em,span)')].filter(el => { if (!vis(el) || el.textContent.trim().length < 3) return false; const r = el.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(el).fontSize); return r.height > fs * 5 && r.width < fs * 2.2; }).length,
        order: w < 600 ? (() => { const a = document.querySelector('.hx-roles'), b = document.querySelector('.hx-led'); return a && b ? a.getBoundingClientRect().top < b.getBoundingClientRect().top : false; })() : true }; }, w);
    ok(m.over <= 0 && !m.out, `${w}: 가로 넘침 0 · 화면 밖 요소 0(${m.over}/${m.out})`);
    ok(!m.small.length, `${w}: 누르는 칸 44px 이상 ${m.small.join(',')}`);
    ok(!m.tiny.length, `${w}: 글자 13px 이상 ${m.tiny.join(',')}`);
    ok(!m.narrow, `${w}: 한 글자 꺾임 0(${m.narrow})`);
    ok(m.order, `${w}: 휴대폰에서 「무엇을 하러 오셨나요?」가 현황판보다 먼저`);
    await c2.close(); }
  ok(!errs.length, `기업 pageerror 0 ${errs.join('|')}`); await ctx.close();

  /* ── 공공: 직원형은 추천, 시민 · 시설형은 추천에서 뺌(보조 템플릿 몫) ── */
  for (const [ed, want] of [['staff', true], ['citizen', false], ['facility', false]]) { const a = await admin(true, 'public', ed);
    const r = await a.p.evaluate(() => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-dutydesk')); return { fit: HPT.premFits('dutydesk'), h: /hx-hero/.test(siteHTML(s)) }; });
    ok(r.fit === want && r.h, `공공 ${ed}: 추천 ${want ? '포함' : '제외'} · 렌더 정상(${JSON.stringify(r)})`); ok(!a.errs.length, `공공 ${ed} pageerror 0 ${a.errs.join('|')}`); await a.ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
