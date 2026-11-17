'use strict';
/* v44 대학 홈페이지 템플릿 10종(hp44-univ.js) 점검 — 이전: v43.9 hpv-univ 점검 — 시안 4종(에디토리얼 · 시네마틱 · 콜라주 · 전통)
   등록 · 갤러리 노출 · 학습자 게시본(siteHTML) PC 1440 · 390 관문(넘침 · 잘림 · 44px · 13px · 한 글자 꺾임 · pageerror)
   · 첫 화면 구성(큰 제목 · 버튼 2개 · 사진, 판 · D-day 없음) · 실제 데이터(강좌 · 일정 · 공지 · 큰 숫자) · 버튼 실제 경로 · 데이터 없음 · 대학 개인정보
   · 템플릿 사용 → 학습자 미리보기(Shadow DOM) 링크 클릭
   index.html에 hpv-univ.js 태그가 없으면 테스트가 hpprem.js 뒤에 주입한다(태그 · ?v= · sw.js는 통합 담당).
   사용: node tests/ui/tpl439-univ.js   (SHOT=<폴더> 를 주면 화면을 남긴다) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.env.SHOT || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
const IDS = ['uncine', 'unsplit', 'uncollage', 'unclassic', 'univy', 'unposter', 'undark', 'unmag', 'unblock', 'unoverlap'];
const inject = h => /hp44-univ\.js/.test(h) ? h : /hpv-univ\.js/.test(h) ? h.replace(/(<script src="hpv-univ\.js[^"]*"><\/script>)/, '$1<script src="hp44-univ.js"></script>') : h.replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1<script src="hp44-univ.js"></script>');

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
  /* ── 1) 등록 · g44 · 세부 유형 ── */
  { const r = await p.evaluate(ids => ids.map(id => { const tp = TPL.find(t => t.id === 't44-' + id) || {};
      return { id, has: HPT.has(id), tp: !!tp.build, g44: tp.g44, sub: tp.sub, form: tp.form, types: tp.types || [], hd: !!(window.HPD && HPD.list().includes(id)) }; }), IDS);
    ok(r.every(x => x.has && x.tp && x.g44 === 1 && x.sub && x.hd && x.types.includes('univ') && x.types.includes('univ_lms')), `등록: HPT.reg · HPD.reg · TPL(t44-*, g44, 세부 유형) · 대학 유형 ${JSON.stringify(r.filter(x => !(x.has && x.tp && x.g44 && x.hd)))}`);
    ok(new Set(r.map(x => x.sub)).size === 10, `세부 유형 10가지 (${r.map(x => x.sub).join(' · ')})`);
    ok(new Set(r.map(x => x.form)).size >= 6, `첫 화면 구성 ${new Set(r.map(x => x.form)).size}가지 (${r.map(x => x.form).join(' · ')})`);
    ok(r.some(x => /전통|격식/.test(x.sub + x.form)), '전통 · 격식형 1종 이상'); }
  /* ── 2) 테마 미리보기(HPT.thumb) — 갤러리 화면은 G 담당 ── */
  { ok(await p.evaluate(() => /u4-ivy-h/.test(HPT.thumb(site(), 'univy')) && /u4-cls-h/.test(HPT.thumb(site(), 'unclassic')) && /u4-dark-h/.test(HPT.thumb(site(), 'undark'))), '테마 미리보기(HPT.thumb): 게시본과 같은 첫 화면'); }

  /* ── 3) 게시본 390 · 1440 관문 + 구성 ── */
  const HSEL = { univy: '.u4-ivy-h', uncine: '.u4-cine-h', uncollage: '.u4-col-h', unclassic: '.u4-cls-h', unsplit: '.u4-split-h', unposter: '.u4-poster-h', undark: '.u4-dark-h', unmag: '.u4-mag-h', unblock: '.u4-block-h', unoverlap: '.u4-over-h' };
  for (const id of IDS) { const h = await p.evaluate(id => siteHTML(siteFromTpl(TPL.find(t => t.id === 't44-' + id)), true, 'ko'), id); pages['/__t.html'] = h;
    for (const w of [1440, 390]) { const c = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 } }); await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); const q = await c.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message));
      await q.goto(base + '/__t.html', { waitUntil: 'load' }); await q.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } scrollTo(0, 0); }); await q.waitForTimeout(500);
      const g = await gate(q); ok(!g.ovf && !g.out.length && !g.small.length && !g.tiny.length && !g.wrap1.length && !pe.length, `${id} @${w}: 넘침 ${g.ovf} · 잘림 ${g.out.length} · 44px 미만 ${g.small.length} · 13px 미만 ${g.tiny.length} · 한 글자 꺾임 ${g.wrap1.length} · 오류 ${pe.length} ${[...g.out, ...g.small, ...g.tiny, ...g.wrap1, ...pe].slice(0, 4).join(' / ')}`);
      const s = await q.evaluate(sel => { const H = document.querySelector(sel); const h1 = H && H.querySelector('h1'); const im = H && [...H.querySelectorAll('img')].find(i => i.offsetWidth > 0); const r = H ? H.getBoundingClientRect() : { height: 0 };
        return { hero: !!H, h1: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, btn: H ? H.querySelectorAll('.u4-btn').length : 0, photo: !!(im && im.naturalWidth > 0), dday: H ? /D-\d|마감 임박/.test(H.innerText) : true, panel: H ? H.querySelectorAll('aside, .hxu-uh-pn').length : 1, hh: Math.round(r.height),
          first: (document.querySelector('#p-home section') || {}).className || '', secs: [...document.querySelectorAll('#p-home section.u4')].map(x => (String(x.className).match(/u4-(story|cls|big|quote|board|band|open|lms|medal|motto|close|whos|steps)\b/) || [''])[0]).filter(Boolean),
          cls: document.querySelectorAll('#p-home .u4-cls li a').length, imgs: [...document.querySelectorAll('#p-home .u4-cls img')].map(i => i.getAttribute('src')), cal: (document.querySelector('.u4-board .bcal') || {}).innerText || '', nt: (document.querySelector('.u4-board .bnt') || {}).innerText || '' }; }, HSEL[id]);
      const big = w === 1440 ? 64 : 34; ok(s.hero && s.h1 >= big && s.btn === 2 && s.photo && !s.dday && !s.panel, `${id} @${w}: 첫 화면 — 큰 제목 ${s.h1}px · 버튼 ${s.btn}개 · 사진 · 판/D-day 없음`);
      if (w === 1440) { ok(s.secs.length >= 4 && s.secs.length <= 8, `${id}: 섹션 구성 ${s.secs.join(' ')}`); ok(s.cls >= 3 && new Set(s.imgs).size === s.imgs.length, `${id}: 공개 강좌 ${s.cls}개(실제 강좌 · 사진 중복 ${s.imgs.length - new Set(s.imgs).size})`);
        if (s.cal) ok(/기말고사/.test(s.cal) && !/교직원 회의/.test(s.cal), `${id}: 학사 일정 — 학습자에게 보이는 일정만(내부 회의 제외)`); if (s.nt) ok(/중요/.test(s.nt) && /추가 모집/.test(s.nt), `${id}: 공지(중요 먼저)`); }
      if (w === 390) ok(s.hh > 0 && s.hh <= 1500, `${id} @390: 첫 화면 높이 ${s.hh}px`);
      if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await q.screenshot({ path: path.join(SHOT, `t-${id}-${w}.jpg`), type: 'jpeg', quality: 70 }); }
      await c.close(); } }

  /* ── 4) 링크 · 개인정보 ── */
  { const r = await p.evaluate(ids => ids.map(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); const h = siteHTML(s, true, 'ko'); const d = new DOMParser().parseFromString(h, 'text/html');
      const A = [...d.querySelectorAll('.u4 a[href]')].map(a => a.getAttribute('href')); const menus = (s.menus || []).map(m => m.id); const cls = (S.classes || []).map(c => c.id);
      const bad = A.filter(h => !(/^#(login|cal|badges|my|shop|notice|comm)$/.test(h) || /^https:\/\/map\.(naver|kakao)\.com\//.test(h) || /^tel:\+?\d+$/.test(h) || /^mailto:/.test(h) || (/^#p-m-/.test(h) && menus.includes(h.slice(5))) || (/^#p-c-/.test(h) && cls.includes(h.slice(5)))));
      const txt = [...d.querySelectorAll('.u4')].map(x => x.textContent).join(' ');
      return { id, n: A.length, bad, inputs: d.querySelectorAll('.u4 input, .u4 select, .u4 textarea, .u4 form').length, phone: /휴대폰 번호를|휴대폰을? 입력|전화번호를?\s*입력|주민\s*(등록)?\s*번호|생년월일/.test(txt), sid: /학번/.test(txt) }; }), IDS);
    r.forEach(x => { ok(x.n >= 12 && !x.bad.length, `${x.id}: 링크 ${x.n}개 모두 실제 경로 ${x.bad.join(' ')}`); ok(!x.inputs && !x.phone && x.sid, `${x.id}: 대학 개인정보 — 학번 · 학과만 안내, 입력칸 · 휴대폰 입력 문구 없음`); });
    const r2 = await p.evaluate(ids => ids.map(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); s.menus = (s.menus || []).filter(m => !['class', 'notice', 'community', 'board'].includes(m.kind) && !/클래스|교과목|강좌|공지|커뮤니티|게시판/.test(m.l || '')); const d = new DOMParser().parseFromString(siteHTML(s, true, 'ko'), 'text/html');
      const A = [...d.querySelectorAll('.u4 a[href]')].map(a => a.getAttribute('href')); return { id, dead: A.filter(x => /^#p-m-/.test(x)).length, shop: A.includes('#shop') }; }), IDS);
    r2.forEach(x => ok(!x.dead && x.shop, `${x.id}: 강좌 · 공지 메뉴가 없으면 #shop · #notice로(고정 메뉴 id ${x.dead}개)`)); }

  /* ── 5) 기관 색이 바뀌어도 글자 대비 ── */
  { const r = await p.evaluate(ids => { const out = []; ids.forEach(id => ['#1F4E9E', '#F5C400', '#10B981'].forEach(c => { const s = JSON.parse(JSON.stringify(site())); HPT.apply(s, id, { color: c }); try { HPT.audit(s).filter(x => x[3] < 4.5).forEach(x => out.push(id + c + ' ' + x[0] + ' ' + x[3])); } catch (e) { } })); return out; }, IDS);
    ok(!r.length, `대비 4.5:1(기관 색 3종) ${r.slice(0, 4).join(' / ')}`); }

  /* ── 6) 템플릿 사용 → 학습자 미리보기(Shadow DOM) ── */
  const CLK = { univy: [['.u4-idx a', /^#class\//], ['.u4-paths a:nth-child(2)', /^#login/]], uncine: [['.u4-tall a', /^#class\//], ['.u4-bar a:nth-child(2)', /^#login/]],
    uncollage: [['.u4-card a', /^#class\//], ['.u4-who a:nth-of-type(2)', /^#login/]], unclassic: [['.u4-frame a', /^#class\//], ['.u4-board .bcal li a', /^#cal/]],
    unsplit: [['.u4-row a', /^#class\//], ['.u4-split-h .u4-btn.p', /^#login/]], unposter: [['.u4-card a', /^#class\//]], undark: [['.u4-tall a', /^#class\//]], unmag: [['.u4-wide a', /^#class\//]], unblock: [['.u4-wide a', /^#class\//]], unoverlap: [['.u4-wide a', /^#class\//], ['.u4-over-h .u4-btn.s', /^#login/]] };
  for (const id of IDS) { await p.evaluate(id => { const f = document.getElementById('pvF'); if (f) f.remove(); ACT['tpl-use']({ dataset: { v: 't44-' + id } }); save(); }, id); await p.waitForTimeout(700);
    ok(await p.evaluate(id => S.site.theme === id && S.site.tpl === 't44-' + id, id), `${id} 템플릿 사용: 테마 · 템플릿 반영`);
    await p.evaluate(() => { const f = document.createElement('iframe'); f.id = 'pvF'; f.src = 'learner.html?preview=1#home'; f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:900px;z-index:99999;background:#fff'; document.body.appendChild(f); }); await p.waitForFunction(() => { const f = document.getElementById('pvF'); const d = f && f.contentDocument; return !!(d && [...d.querySelectorAll('.smhost')].some(x => x.shadowRoot && x.shadowRoot.querySelector('.hp-hero.u4'))); }, null, { timeout: 15000 }).catch(() => 0); await p.waitForTimeout(400);
    const L = await p.evaluate(() => { const d = document.getElementById('pvF').contentDocument; const h = [...d.querySelectorAll('.smhost')].find(x => x.shadowRoot && x.shadowRoot.querySelector('.hp-hero.u4')); return h ? [...h.shadowRoot.querySelectorAll('.u4 a[href]')].map(a => a.getAttribute('href')) : null; });
    ok(!!L && L.length >= 10, `${id} 학습자 미리보기: 게시본에 첫 화면 · 부품 (${L ? L.length : 0} 링크)`);
    ok(!!L && L.every(h => /^#(login|cal|badges|my|shop|notice|home|comm|class\/[\w-]+|courses|c)$/.test(h) || /^#(m|c)\/|^#p-/.test(h) || /^(tel|mailto):/.test(h) || /^https:\/\/map\.(naver|kakao)\.com\//.test(h)), `${id} 학습자 미리보기: 링크가 학습자 경로 ${L ? [...new Set(L)].slice(0, 12).join(' ') : ''}`);
    for (const [sel, want] of CLK[id]) {
      const hh = await p.evaluate(sel => { const d = document.getElementById('pvF').contentDocument; const h = [...d.querySelectorAll('.smhost')].find(x => x.shadowRoot && x.shadowRoot.querySelector('.hp-hero.u4')); const a = h && h.shadowRoot.querySelector(sel); if (!a) return ['(없음)', 0]; a.click(); return new Promise(r => setTimeout(() => r([d.defaultView.location.hash, (d.querySelector('#lm') || d.body).innerText.length]), 900)); }, sel);
      ok(want.test(hh[0]) && hh[1] > 40, `${id} 학습자 미리보기: ${sel} 누르면 ${hh[0]} 화면(내용 ${hh[1]}자)`);
      await p.evaluate(() => { const w = document.getElementById('pvF').contentWindow; w.location.hash = '#home'; }); await p.waitForTimeout(900); } }
  ok(!errs.length, `관리자 pageerror 0 ${errs.join('|')}`); await ctx.close();

  /* ── 7) 빈 기관: 사실 없는 덩어리는 숨기고 첫 화면은 남는다 ── */
  { const { ctx, p, errs } = await admin({ empty: true });
    const r = await p.evaluate(ids => ids.map(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); const h = siteHTML(s, true, 'ko'); const d = new DOMParser().parseFromString(h, 'text/html');
      return { id, n: (S.classes || []).length, hero: !!d.querySelector('.hp-hero.u4'), cls: d.querySelectorAll('.u4-cls li').length, big: !!d.querySelector('.u4-big'), medal: !!d.querySelector('.u4-medal'), nb: (S.badges || []).length, login: /학번/.test(h) }; }), IDS);
    r.forEach(x => ok(x.hero && x.login && (x.n ? true : !x.cls && !x.big) && (x.nb ? true : !x.medal), `빈 기관 ${x.id}: 첫 화면 유지 · 강좌 · 큰 숫자 · 배지는 데이터가 있을 때만 ${JSON.stringify(x)}`));
    ok(!errs.length, `빈 기관 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
