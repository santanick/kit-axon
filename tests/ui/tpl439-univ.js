'use strict';
/* v43.9 대학 묶음 홈페이지 템플릿(hpv-univ.js) 점검 — 시안 4종(에디토리얼 · 시네마틱 · 콜라주 · 전통)
   등록 · 갤러리 노출 · 학습자 게시본(siteHTML) PC 1440 · 390 관문(넘침 · 잘림 · 44px · 13px · 한 글자 꺾임 · pageerror)
   · 첫 화면 구성(큰 제목 · 버튼 2개 · 사진, 판 · D-day 없음) · 실제 데이터(강좌 · 일정 · 공지 · 큰 숫자) · 버튼 실제 경로 · 데이터 없음 · 대학 개인정보
   · 템플릿 사용 → 학습자 미리보기(Shadow DOM) 링크 클릭
   index.html에 hpv-univ.js 태그가 없으면 테스트가 hpprem.js 뒤에 주입한다(태그 · ?v= · sw.js는 통합 담당).
   사용: node tests/ui/tpl439-univ.js   (SHOT=<폴더> 를 주면 화면을 남긴다) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.env.SHOT || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
const IDS = ['uvivy', 'uvcine', 'uvcollage', 'uvclassic'];
const inject = h => /hpv-univ\.js/.test(h) ? h : h.replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1<script src="hpv-univ.js"></script>');

(async () => {
  const pages = {};
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (pages[u]) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(pages[u]); }
    if (u === '/index.html') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(inject(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const admin = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(([e, ed]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', e ? '1' : '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = !!e; createOrg('univ', '해운대대학교', ed); }, [!!o.empty, o.ed]);
    await p.waitForFunction(() => window.S && S.org); await p.waitForTimeout(900); try { await p.evaluate(() => { try { closeModal(); } catch (e) { } }); } catch (e) { }
    return { ctx, p, errs }; };
  const seed = p => p.evaluate(() => { const f = S.settings.footer; f.tel = '051-000-1234'; f.email = 'edu@example.ac.kr'; f.addr = '부산광역시 해운대구 센텀로 00';
    const C = S.classes; const set = (i, o) => { if (C[i]) Object.assign(C[i], o); }; const add = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymdL(d); };
    set(5, { status: '운영중', recruit: { on: true, mode: 'first', cap: 30, from: add(-7), to: add(4) }, start: add(7), end: add(70) });
    set(4, { recruit: { on: true, mode: 'approve', cap: 40, from: add(-5), to: add(2) }, start: add(9), end: add(30) });
    set(3, { recruit: { on: true, mode: 'lottery', cap: 20, from: add(1), to: add(40) }, start: add(45), end: add(90) });
    S.calx = S.calx || {}; S.calx.ev = [{ id: 'e1', title: '기말고사', date: add(27), kind: '학사', pub: true }, { id: 'e9', title: '교직원 회의', date: add(3), kind: '회의' }];
    S.notices = [{ id: 'n1', title: '비교과 프로그램 추가 모집 안내', at: today(), pin: true }, { id: 'n2', title: '신입생 학번 로그인 방법 안내', at: today() }]; save(); });
  const gate = p => p.evaluate(() => { const W = document.documentElement.clientWidth; const R = { ovf: document.documentElement.scrollWidth - W, out: [], small: [], tiny: [], wrap1: [] };
    const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const clip = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (/hidden|clip|auto|scroll/.test(getComputedStyle(a).overflowX)) return true; return false; };
    const lab = e => String(e.className || e.tagName).slice(0, 30) + ':' + (e.innerText || '').trim().slice(0, 20);
    document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect();
      if ((r.right > W + 1 || r.left < -1) && !clip(e) && getComputedStyle(e).position !== 'fixed') R.out.push(lab(e));
      if (e.matches('a[href],button,summary,input,select') && (r.height < 44 || r.width < 44) && !e.closest('p,dd')) R.small.push(`${lab(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 13) R.tiny.push(`${lab(e)} ${fs}`);
        const lh = parseFloat(getComputedStyle(e).lineHeight) || fs * 1.4; if (e.innerText.trim().length >= 2 && r.width < fs * 1.6 && r.height > lh * 1.6) R.wrap1.push(lab(e)); } });
    return R; });

  const { ctx, p, errs } = await admin(); await seed(p);
  /* ── 1) 등록 · 추천 ── */
  { const r = await p.evaluate(ids => ids.map(id => { const m = HPT.meta(id) || {}; const tp = TPL.find(t => t.id === 'prem-' + id) || {};
      return { id, has: HPT.has(id), prem: m.prem, tp: !!tp.build, types: tp.types || [], hd: !!(window.HPD && HPD.list().includes(id)), fits: HPT.premFits(id, 'univ') && HPT.premFits(id, 'univ_lms') && !HPT.premFits(id, 'corp') }; }), IDS);
    ok(r.every(x => x.has && x.prem && x.tp && x.hd && x.fits && x.types.includes('univ')), `등록: HPT.reg · HPD.reg · TPL(prem-*) · 대학 태그 ${JSON.stringify(r.filter(x => !(x.has && x.tp && x.hd && x.fits)))}`);
    const pf = await p.evaluate(() => HPT.premFor('univ').slice(0, 4)); ok(IDS.every(id => pf.includes(id)), `추천 순서: 대학 기관은 이 4종이 맨 앞 ${pf}`);
    const oth = await p.evaluate(() => HPT.premFor('corp').slice(0, 2)); ok(!IDS.includes(oth[0]), `추천 순서: 기업 기관에는 앞에 두지 않음 ${oth}`); }
  /* ── 2) 갤러리 ── */
  { await p.evaluate(() => { UI.tpdK = 'all'; ACT['tpl-gallery'](); }); await p.waitForTimeout(900);
    const all = await p.evaluate(() => [...document.querySelectorAll('.tpd-c .tpg-th[data-tp]')].map(x => x.dataset.tp));
    ok(IDS.every(id => all.includes('prem-' + id)), `갤러리(전체)에 4종 노출 (${all.length}종)`);
    await p.evaluate(() => { UI.tpdK = 'mine'; render(); }); await p.waitForTimeout(700);
    const mine = await p.evaluate(() => [...document.querySelectorAll('.tpd-c .tpg-th[data-tp]')].map(x => x.dataset.tp));
    ok(IDS.some(id => mine.slice(0, 4).includes('prem-' + id)), `갤러리(추천) 앞쪽에 노출 (${mine.slice(0, 4)})`);
    ok(await p.evaluate(() => /uv9-ivy-h/.test(HPT.thumb(site(), 'uvivy')) && /uv9-cls-h/.test(HPT.thumb(site(), 'uvclassic'))), '테마 미리보기(HPT.thumb): 게시본과 같은 첫 화면'); }

  /* ── 3) 게시본 390 · 1440 관문 + 구성 ── */
  const HSEL = { uvivy: '.uv9-ivy-h', uvcine: '.uv9-cine-h', uvcollage: '.uv9-col-h', uvclassic: '.uv9-cls-h' };
  for (const id of IDS) { const h = await p.evaluate(id => siteHTML(siteFromTpl(TPL.find(t => t.id === 'prem-' + id)), true, 'ko'), id); pages['/__t.html'] = h;
    for (const w of [1440, 390]) { const c = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 } }); await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); const q = await c.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message));
      await q.goto(base + '/__t.html', { waitUntil: 'load' }); await q.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } scrollTo(0, 0); }); await q.waitForTimeout(500);
      const g = await gate(q); ok(!g.ovf && !g.out.length && !g.small.length && !g.tiny.length && !g.wrap1.length && !pe.length, `${id} @${w}: 넘침 ${g.ovf} · 잘림 ${g.out.length} · 44px 미만 ${g.small.length} · 13px 미만 ${g.tiny.length} · 한 글자 꺾임 ${g.wrap1.length} · 오류 ${pe.length} ${[...g.out, ...g.small, ...g.tiny, ...g.wrap1, ...pe].slice(0, 4).join(' / ')}`);
      const s = await q.evaluate(sel => { const H = document.querySelector(sel); const h1 = H && H.querySelector('h1'); const im = H && [...H.querySelectorAll('img')].find(i => i.offsetWidth > 0); const r = H ? H.getBoundingClientRect() : { height: 0 };
        return { hero: !!H, h1: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, btn: H ? H.querySelectorAll('.uv9-btn').length : 0, photo: !!(im && im.naturalWidth > 0), dday: H ? /D-\d|마감 임박/.test(H.innerText) : true, panel: H ? H.querySelectorAll('aside, .hxu-uh-pn').length : 1, hh: Math.round(r.height),
          first: (document.querySelector('#p-home section') || {}).className || '', secs: [...document.querySelectorAll('#p-home section.uv9')].map(x => (String(x.className).match(/uv9-(story|cls|big|quote|board|band|open|lms|medal|motto|close|whos)\b/) || [''])[0]).filter(Boolean),
          cls: document.querySelectorAll('#p-home .uv9-cls li a').length, imgs: [...document.querySelectorAll('#p-home .uv9-cls img')].map(i => i.getAttribute('src')), cal: (document.querySelector('.uv9-board .bcal') || {}).innerText || '', nt: (document.querySelector('.uv9-board .bnt') || {}).innerText || '' }; }, HSEL[id]);
      const big = w === 1440 ? 64 : 34; ok(s.hero && s.h1 >= big && s.btn === 2 && s.photo && !s.dday && !s.panel, `${id} @${w}: 첫 화면 — 큰 제목 ${s.h1}px · 버튼 ${s.btn}개 · 사진 · 판/D-day 없음`);
      if (w === 1440) { ok(s.secs.length >= 4 && s.secs.length <= 8, `${id}: 섹션 구성 ${s.secs.join(' ')}`); ok(s.cls >= 3 && new Set(s.imgs).size === s.imgs.length, `${id}: 공개 강좌 ${s.cls}개(실제 강좌 · 사진 중복 ${s.imgs.length - new Set(s.imgs).size})`);
        if (s.cal) ok(/기말고사/.test(s.cal) && !/교직원 회의/.test(s.cal), `${id}: 학사 일정 — 학습자에게 보이는 일정만(내부 회의 제외)`); if (s.nt) ok(/중요/.test(s.nt) && /추가 모집/.test(s.nt), `${id}: 공지(중요 먼저)`); }
      if (w === 390) ok(s.hh > 0 && s.hh <= 1500, `${id} @390: 첫 화면 높이 ${s.hh}px`);
      if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await q.screenshot({ path: path.join(SHOT, `t-${id}-${w}.jpg`), type: 'jpeg', quality: 70 }); }
      await c.close(); } }

  /* ── 4) 링크 · 개인정보 ── */
  { const r = await p.evaluate(ids => ids.map(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); const h = siteHTML(s, true, 'ko'); const d = new DOMParser().parseFromString(h, 'text/html');
      const A = [...d.querySelectorAll('.uv9 a[href]')].map(a => a.getAttribute('href')); const menus = (s.menus || []).map(m => m.id); const cls = (S.classes || []).map(c => c.id);
      const bad = A.filter(h => !(/^#(login|cal|badges|my|shop|notice|comm)$/.test(h) || /^https:\/\/map\.(naver|kakao)\.com\//.test(h) || /^tel:\+?\d+$/.test(h) || /^mailto:/.test(h) || (/^#p-m-/.test(h) && menus.includes(h.slice(5))) || (/^#p-c-/.test(h) && cls.includes(h.slice(5)))));
      const txt = [...d.querySelectorAll('.uv9')].map(x => x.textContent).join(' ');
      return { id, n: A.length, bad, inputs: d.querySelectorAll('.uv9 input, .uv9 select, .uv9 textarea, .uv9 form').length, phone: /휴대폰 번호를|휴대폰을? 입력|전화번호를?\s*입력|주민\s*(등록)?\s*번호|생년월일/.test(txt), sid: /학번/.test(txt) }; }), IDS);
    r.forEach(x => { ok(x.n >= 12 && !x.bad.length, `${x.id}: 링크 ${x.n}개 모두 실제 경로 ${x.bad.join(' ')}`); ok(!x.inputs && !x.phone && x.sid, `${x.id}: 대학 개인정보 — 학번 · 학과만 안내, 입력칸 · 휴대폰 입력 문구 없음`); });
    const r2 = await p.evaluate(ids => ids.map(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); s.menus = (s.menus || []).filter(m => !['class', 'notice', 'community', 'board'].includes(m.kind) && !/클래스|교과목|강좌|공지|커뮤니티|게시판/.test(m.l || '')); const d = new DOMParser().parseFromString(siteHTML(s, true, 'ko'), 'text/html');
      const A = [...d.querySelectorAll('.uv9 a[href]')].map(a => a.getAttribute('href')); return { id, dead: A.filter(x => /^#p-m-/.test(x)).length, shop: A.includes('#shop') }; }), IDS);
    r2.forEach(x => ok(!x.dead && x.shop, `${x.id}: 강좌 · 공지 메뉴가 없으면 #shop · #notice로(고정 메뉴 id ${x.dead}개)`)); }

  /* ── 5) 기관 색이 바뀌어도 글자 대비 ── */
  { const r = await p.evaluate(ids => { const out = []; ids.forEach(id => ['#1F4E9E', '#F5C400', '#10B981'].forEach(c => { const s = JSON.parse(JSON.stringify(site())); HPT.apply(s, id, { color: c }); try { HPT.audit(s).filter(x => x[3] < 4.5).forEach(x => out.push(id + c + ' ' + x[0] + ' ' + x[3])); } catch (e) { } })); return out; }, IDS);
    ok(!r.length, `대비 4.5:1(기관 색 3종) ${r.slice(0, 4).join(' / ')}`); }

  /* ── 6) 템플릿 사용 → 학습자 미리보기(Shadow DOM) ── */
  const CLK = { uvivy: [['.uv9-idx a', /^#class\//], ['.uv9-paths a:nth-child(2)', /^#login/]], uvcine: [['.uv9-tall a', /^#class\//], ['.uv9-bar a:nth-child(2)', /^#login/]],
    uvcollage: [['.uv9-card a', /^#class\//], ['.uv9-who a:nth-of-type(2)', /^#login/]], uvclassic: [['.uv9-frame a', /^#class\//], ['.uv9-board .bcal li a', /^#cal/]] };
  for (const id of IDS) { await p.evaluate(id => { const f = document.getElementById('pvF'); if (f) f.remove(); ACT['tpl-use']({ dataset: { v: 'prem-' + id } }); save(); }, id); await p.waitForTimeout(700);
    ok(await p.evaluate(id => S.site.theme === id && S.site.tpl === 'prem-' + id, id), `${id} 템플릿 사용: 테마 · 템플릿 반영`);
    await p.evaluate(() => { const f = document.createElement('iframe'); f.id = 'pvF'; f.src = 'learner.html?preview=1#home'; f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:900px;z-index:99999;background:#fff'; document.body.appendChild(f); }); await p.waitForTimeout(3200);
    const L = await p.evaluate(() => { const d = document.getElementById('pvF').contentDocument; const h = [...d.querySelectorAll('.smhost')].find(x => x.shadowRoot && x.shadowRoot.querySelector('.hp-hero.uv9')); return h ? [...h.shadowRoot.querySelectorAll('.uv9 a[href]')].map(a => a.getAttribute('href')) : null; });
    ok(!!L && L.length >= 10, `${id} 학습자 미리보기: 게시본에 첫 화면 · 부품 (${L ? L.length : 0} 링크)`);
    ok(!!L && L.every(h => /^#(login|cal|badges|my|shop|notice|home|comm|class\/[\w-]+|courses|c)$/.test(h) || /^#(m|c)\/|^#p-/.test(h) || /^(tel|mailto):/.test(h) || /^https:\/\/map\.(naver|kakao)\.com\//.test(h)), `${id} 학습자 미리보기: 링크가 학습자 경로 ${L ? [...new Set(L)].slice(0, 12).join(' ') : ''}`);
    for (const [sel, want] of CLK[id]) {
      const hh = await p.evaluate(sel => { const d = document.getElementById('pvF').contentDocument; const h = [...d.querySelectorAll('.smhost')].find(x => x.shadowRoot && x.shadowRoot.querySelector('.hp-hero.uv9')); const a = h && h.shadowRoot.querySelector(sel); if (!a) return ['(없음)', 0]; a.click(); return new Promise(r => setTimeout(() => r([d.defaultView.location.hash, (d.querySelector('#lm') || d.body).innerText.length]), 900)); }, sel);
      ok(want.test(hh[0]) && hh[1] > 40, `${id} 학습자 미리보기: ${sel} 누르면 ${hh[0]} 화면(내용 ${hh[1]}자)`);
      await p.evaluate(() => { const w = document.getElementById('pvF').contentWindow; w.location.hash = '#home'; }); await p.waitForTimeout(900); } }
  ok(!errs.length, `관리자 pageerror 0 ${errs.join('|')}`); await ctx.close();

  /* ── 7) 빈 기관: 사실 없는 덩어리는 숨기고 첫 화면은 남는다 ── */
  { const { ctx, p, errs } = await admin({ empty: true });
    const r = await p.evaluate(ids => ids.map(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); const h = siteHTML(s, true, 'ko'); const d = new DOMParser().parseFromString(h, 'text/html');
      return { id, n: (S.classes || []).length, hero: !!d.querySelector('.hp-hero.uv9'), cls: d.querySelectorAll('.uv9-cls li').length, big: !!d.querySelector('.uv9-big'), medal: !!d.querySelector('.uv9-medal'), nb: (S.badges || []).length, login: /학번/.test(h) }; }), IDS);
    r.forEach(x => ok(x.hero && x.login && (x.n ? true : !x.cls && !x.big) && (x.nb ? true : !x.medal), `빈 기관 ${x.id}: 첫 화면 유지 · 강좌 · 큰 숫자 · 배지는 데이터가 있을 때만 ${JSON.stringify(x)}`));
    ok(!errs.length, `빈 기관 pageerror 0 ${errs.join('|')}`); await ctx.close(); }


  /* ── 8) 학습자 게시본(learner.html?t=… · Shadow DOM)에서 테마가 그대로인지 — v44 QA: body 선택자만 쓰면 게시본에서 변수 · 배경이 통째로 빠짐 ── */
  { const { ctx, p, errs } = await admin(); await seed(p);
    for (const id of IDS) { const tid = await p.evaluate(tp => { try { closeModal(); } catch (e) { } const s = siteFromTpl(TPL.find(x => x.id === tp)); S.site = s; s.published = true; save(); smPublish(); try { closeModal(); } catch (e) { } return DREG.cur(); }, 'prem-' + id);
      for (const w of [1440, 390]) { const q = await ctx.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.setViewportSize({ width: w, height: w > 600 ? 900 : 844 });
        await q.goto(`${base}/learner.html?t=${tid}#home`, { waitUntil: 'load' });
        await q.waitForFunction(H => [...document.querySelectorAll('.smhost')].some(x => x.shadowRoot && x.shadowRoot.querySelector(H)), '.hp-hero.uv9', { timeout: 15000 }).catch(() => 0); await q.waitForTimeout(500);
        const r = await q.evaluate(([H, id]) => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).find(x => x && x.querySelector(H)); if (!R) return null; const h = R.querySelector(H); const cs = getComputedStyle(h);
          const rgb = c => (String(c).match(/\d+(\.\d+)?/g) || []).map(Number); const lum = c => { const [r0, g0, b0] = rgb(c).map(v => v / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * r0 + .7152 * g0 + .0722 * b0; };
          const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return 'rgb(255, 255, 255)'; };
          const h1 = h.querySelector('h1'); const t1 = h1 ? h1.getBoundingClientRect() : null; const b1 = h.querySelector('[class*="-btn"]'); const bb = b1 ? b1.getBoundingClientRect() : null;
          const photo = h.querySelector('figure img'); const onPhoto = !!(photo && photo.closest('figure') && getComputedStyle(photo.closest('figure')).position === 'absolute');
          const fg = h1 ? getComputedStyle(h1).color : ''; const bg = onPhoto ? 'rgb(20, 20, 30)' : bgOf(h1 || h); const L1 = lum(fg), L2 = lum(bg); const cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
          return { a: cs.getPropertyValue('--u-a').trim(), heroBg: cs.backgroundColor, cr: Math.round(cr * 10) / 10, h1fs: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, h1b: t1 ? Math.round(t1.bottom) : 9999, btnb: bb ? Math.round(bb.bottom) : 9999, big: !!R.querySelector('.' + id + '-big'), scrim: (() => { const s = h.querySelector('[class*="-scrim"]'); return s ? getComputedStyle(s).backgroundImage !== 'none' : null; })() }; }, ['.hp-hero.uv9', 'uv9']);
        const need = ({ uvcine: 1, uvclassic: 1 })[id]; ok(!!r && !!r.a && (!need || !/rgba\(0, 0, 0, 0\)|transparent/.test(r.heroBg)) && r.cr >= 4.5 && r.scrim !== false && !pe.length, `${id} 게시본 @${w}: 테마 변수 ${r && r.a} · 첫 화면 바탕 ${r && r.heroBg} · 제목 대비 ${r && r.cr} · 스크림 ${r && r.scrim} · 오류 ${pe.length}`);
        if (w === 390 && r) { const lim = id === 'none' ? 64 : 48; ok(r.h1fs >= 36 && r.h1fs <= lim && r.h1b <= 844 && r.btnb <= 844 + 40, `${id} 게시본 @390: 제목 ${r.h1fs}px(36~${lim}) · 제목 · 버튼이 첫 화면 안(제목 ${r.h1b} · 버튼 ${r.btnb})`); }
        if (w === 1440 && r) ok(!r.big, `${id} 게시본: 시연 데이터(강좌 10개 미만 · 배지 100개 미만)에서는 큰 숫자 블록 숨김`);
        await q.close(); } }
    ok(!errs.length, `게시본 점검 관리자 pageerror 0 ${errs.join('|')}`); await ctx.close(); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
