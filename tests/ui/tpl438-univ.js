'use strict';
/* v43.8 대학 묶음 홈페이지 템플릿(hpx-univ.js) 점검
   등록(PASS 표 · HPX_ALL) · 갤러리 노출(프리미엄 · 추천 맨 앞) · 템플릿 사용 → 학습자 미리보기(Shadow DOM) · 390 · 1440 관문(넘침 · 잘림 · 44px · 13px · 한 글자 꺾임)
   · 시나리오 버튼이 실제 학습자 경로로 이어지는지 · 대학 개인정보(학번 · 학과만, 휴대폰 입력 없음) · 대비 4.5:1 · 데이터가 없을 때 판 숨김
   사용: node tests/ui/tpl438-univ.js   (SHOT=<폴더> 를 주면 화면을 남긴다) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.env.SHOT || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
const IDS = ['uvhub', 'uvlms', 'uvopen']; /* uvhub(L1) · uvlms · uvopen(보조 A1) */
const HERO = '.hp-hero.hxu-u'; /* 세 템플릿 공통 첫 화면 */

(async () => {
  const pages = {};
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (pages[u]) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(pages[u]); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const admin = async (all, o = {}) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    if (all) await ctx.addInitScript(() => { window.HPX_ALL = 1; });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(([e, ed]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', e ? '1' : '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = !!e; createOrg('univ', '해운대대학교', ed); }, [!!o.empty, o.ed]);
    await p.waitForFunction(() => window.S && S.org); await p.waitForTimeout(900); try { await p.evaluate(() => { try { closeModal(); } catch (e) { } }); } catch (e) { }
    return { ctx, p, errs }; };
  /* 같은 기관 데이터: 모집 기간 · 기관 일정 · 공지 · 연락처 */
  const seed = p => p.evaluate(() => { const f = S.settings.footer; f.tel = '051-000-1234'; f.email = 'edu@example.ac.kr'; f.addr = '부산광역시 해운대구 센텀로 00';
    const C = S.classes; const set = (i, o) => { if (C[i]) Object.assign(C[i], o); }; const T0 = today(); const add = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymdL(d); };
    set(5, { status: '운영중', recruit: { on: true, mode: 'first', cap: 30, from: add(-7), to: add(4) }, start: add(7), end: add(70) });
    set(4, { recruit: { on: true, mode: 'approve', cap: 40, from: add(-5), to: add(2) }, start: add(9), end: add(30) });
    S.calx = S.calx || {}; S.calx.ev = [{ id: 'e1', title: '기말고사', date: add(27), kind: '학사', pub: true }, { id: 'e9', title: '교직원 회의', date: add(3), kind: '회의' }];
    S.notices = [{ id: 'n1', title: '비교과 프로그램 추가 모집 안내', at: T0, pin: true }]; save(); return T0; });
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

  /* ── 1) 등록: PASS 표에 없으면 등록하지 않음 · HPX_ALL이면 강제 등록 ── */
  { const { ctx, p, errs } = await admin(false);
    const r = await p.evaluate(ids => ids.map(id => [HPT.has(id), TPL.some(t => t.id === 'prem-' + id)]), IDS);
    ok(r.every(([a, b]) => !a && !b), `등록: 심사 전(PASS 비어 있음 · HPX_ALL 없음)에는 등록하지 않음 ${JSON.stringify(r)}`);
    ok(!errs.length, `등록 전 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  const { ctx, p, errs } = await admin(true); const T0 = await seed(p);
  { const r = await p.evaluate(ids => ids.map(id => { const m = HPT.meta(id) || {}; const tp = TPL.find(t => t.id === 'prem-' + id) || {};
      return { id, has: HPT.has(id), prem: m.prem, tags: m.tags, tp: !!tp.build, types: tp.types, hd: !!(window.HPD && HPD.list().includes(id)), fits: HPT.premFits(id, 'univ') && HPT.premFits(id, 'univ_lms') && !HPT.premFits(id, 'corp') }; }), IDS);
    ok(r.every(x => x.has && x.prem && x.tp && x.hd && x.fits && x.types[0] === 'prem' && x.types.includes('univ')), `등록: HPT.reg · HPD.reg · TPL(prem · univ) · 대학 태그 ${JSON.stringify(r)}`);
    const pf = await p.evaluate(() => HPT.premFor('univ').slice(0, 3)); ok(IDS.includes(pf[0]), `추천 순서: 대학 기관은 이 묶음이 프리미엄 맨 앞 ${pf}`);
    const oth = await p.evaluate(() => HPT.premFor('corp').slice(0, 2)); ok(!IDS.includes(oth[0]), `추천 순서: 기업 기관에는 앞에 두지 않음 ${oth}`); }

  /* ── 2) 갤러리: 추천 · 프리미엄 묶음에 카드 ── */
  { await p.evaluate(() => { UI.tpdK = 'mine'; ACT['tpl-gallery'](); }); await p.waitForTimeout(900);
    const mine = await p.evaluate(() => [...document.querySelectorAll('.tpd-c .tpg-th[data-tp]')].map(x => x.dataset.tp));
    ok(IDS.every(id => mine.includes('prem-' + id)) && mine.indexOf('prem-' + IDS[0]) === 0, `갤러리(추천): 첫 카드 prem-${IDS[0]} (${mine.slice(0, 3)})`);
    await p.evaluate(() => { UI.tpdK = 'prem'; render(); }); await p.waitForTimeout(700);
    const pr = await p.evaluate(() => [...document.querySelectorAll('.tpd-c .tpg-th[data-tp]')].map(x => x.dataset.tp));
    ok(IDS.every(id => pr.includes('prem-' + id)), `갤러리(프리미엄 묶음)에 노출 (${pr.length}종)`);
    const th = await p.evaluate(id => { const h = HPT.thumb(site(), id); return /hxu-uh/.test(h) && /hxu-who/.test(h); }, IDS[0]); ok(th, '테마 미리보기(HPT.thumb): 게시본과 같은 첫 화면 · 방문자 바로 가기'); }

  /* ── 3) 390 · 1440 관문(게시본 siteHTML) + 시나리오 내용 ── */
  for (const id of IDS) { const h = await p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); return siteHTML(s, true, 'ko'); }, id); pages['/__t.html'] = h;
    for (const w of [1440, 390]) { const c = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 } }); await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); const q = await c.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message));
      await q.goto(base + '/__t.html', { waitUntil: 'load' }); await q.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); }); await q.waitForTimeout(400);
      const g = await gate(q); ok(!g.ovf && !g.out.length && !g.small.length && !g.tiny.length && !g.wrap1.length && !pe.length, `${id} @${w}: 넘침 ${g.ovf} · 잘림 ${g.out.length} · 44px 미만 ${g.small.length} · 13px 미만 ${g.tiny.length} · 한 글자 꺾임 ${g.wrap1.length} ${[...g.out, ...g.small, ...g.tiny, ...g.wrap1].slice(0, 4).join(' / ')}`);
      if (w === 1440 && id === 'uvhub') { const s = await q.evaluate(() => { const T = s => (document.querySelector(s) || {}).innerText || ''; const hero = T('.hxu-uh'); const ph = document.querySelector('.hxu-uh img');
          return { hero, photo: !!(ph && ph.naturalWidth > 0), who: [...document.querySelectorAll('.hxu-pc h3')].map(x => x.innerText), due: document.querySelectorAll('.hxu-pn-l li').length, cal: T('.hxu-cal'), nt: T('.hxu-nt'), bd: document.querySelectorAll('.hxu-lad li').length,
            order: [...document.querySelectorAll('main section, body > section, section.hpt')].slice(0, 3).map(x => x.className.match(/hxu-\w+|hp-\w+/g) || []).flat().join(' '), facts1: !!document.querySelector('.hxu-uh + section [class*=hps-fact], .hxu-uh + .hp-stats') }; });
        ok(/학번으로 로그인/.test(s.hero) && /비교과 신청하기/.test(s.hero) && /마감 임박/.test(s.hero) && s.due >= 2 && /D-2/.test(s.hero) && s.photo, `${id}: 첫 화면 — 학번 로그인 · 비교과 신청 · 마감 임박(D-day ${s.due}건) · 실사진`);
        ok(s.who.join('/') === '재학생/신입생/교수자/산학 · 지역', `${id}: 방문자별 바로 가기 4종 ${s.who}`);
        ok(/기말고사/.test(s.cal) && !/교직원 회의/.test(s.cal) && /접수 마감/.test(s.cal), `${id}: 학사 일정 — 학습자에게 보이는 일정 · 모집 마감만(내부 회의 제외)`);
        ok(/비교과 프로그램 추가 모집/.test(s.nt) && /중요/.test(s.nt), `${id}: 공지(중요 먼저)`); ok(s.bd >= 2, `${id}: 이수 · 배지 사다리 ${s.bd}단계(실제 배지)`); }
      if (w === 1440 && id !== 'uvhub') { const s = await q.evaluate(() => { const T = s => (document.querySelector(s) || {}).innerText || ''; const ph = document.querySelector('.hp-hero.hxu-u img');
          return { hero: T('.hp-hero.hxu-u'), photo: !!(ph && ph.naturalWidth > 0), who: [...document.querySelectorAll('.hxu-pc h3')].map(x => x.innerText), wk: document.querySelectorAll('.hxu-wk a').length, cur: (document.querySelector('.hxu-wk a[aria-current]') || {}).innerText || '', td: document.querySelectorAll('.hxu-td li').length,
            chips: [...document.querySelectorAll('.hxu-op-ch li a')].map(a => a.innerText.replace(/\s+/g, ' ')), tel: !!document.querySelector('.hxu-op-if a[href^="tel:"]'), seats: [...document.querySelectorAll('.hxu-se-l li')].map(x => x.innerText.replace(/\s+/g, ' ')), cal: T('.hxu-cal'), nt: T('.hxu-nt'), list: !!document.querySelector('.hp-cls') }; });
        if (id === 'uvlms') { ok(/학번으로 로그인/.test(s.hero) && /이번 주 할 일/.test(s.hero) && s.wk === 7 && /오늘/.test(s.cur) && s.td >= 2 && /D-2/.test(s.hero) && /학번 · 학과로만/.test(s.hero) && s.photo, `uvlms: 첫 화면 — 7일 띠(${s.wk}칸 · 오늘 표시) · 이번 주 할 일 ${s.td}건(D-2) · 학번 로그인 카드 · 실사진`);
          ok(s.who.join('/') === '재학생/신입생/교수자/산학 · 지역' && /기말고사/.test(s.cal) && !/교직원 회의/.test(s.cal) && /중요/.test(s.nt) && s.list, `uvlms: 교과목 목록 · 학사 일정(내부 회의 제외) · 공지 · 방문자 바로 가기`);
          ok(!/교직원 회의/.test(s.hero), 'uvlms: 이번 주 할 일에 내부 일정(교직원 회의) 없음'); }
        if (id === 'uvopen') { ok(/공개 강좌 둘러보기/.test(s.hero) && /수강 문의하기/.test(s.hero) && /^전체/.test(s.chips[0] || '') && s.chips.length >= 5 && /D-2 접수 중/.test(s.chips[1] || '') && s.tel && s.photo, `uvopen: 첫 화면 — 강좌 칩 ${s.chips.length}개(접수 중 먼저: ${s.chips[1]}) · 문의 전화 · 실사진`);
          ok(s.seats.length >= 2 && s.seats.every(x => /자리 남음|정원이 찼어요|정원 \d+명/.test(x)) && /34 \/ 40명|\d+ \/ 40명/.test(s.seats.join(' ')), `uvopen: 남은 자리 막대 ${s.seats.length}건 (${s.seats[0]})`);
          ok(s.who[0] === '시민 · 지역 주민' && s.who.length === 4, `uvopen: 방문자 바로 가기 — 시민 · 지역 주민 먼저 ${s.who}`);
          ok(/기말고사/.test(s.cal) && !/교직원 회의/.test(s.cal) && /중요/.test(s.nt), 'uvopen: 행사 · 학사 일정 · 공지'); } }
      if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await q.screenshot({ path: path.join(SHOT, `t-${id}-${w}.png`), fullPage: true }); }
      await c.close(); } }

  /* ── 4) 시나리오 버튼 → 실제 경로 · 대학 개인정보 ── */
  { const r = await p.evaluate(ids => ids.map(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); const h = siteHTML(s, true, 'ko'); const d = new DOMParser().parseFromString(h, 'text/html');
      const A = [...d.querySelectorAll('.hxu-u a[href]')].map(a => a.getAttribute('href')); const menus = (s.menus || []).map(m => m.id); const cls = (S.classes || []).map(c => c.id);
      const bad = A.filter(h => !(/^#(login|cal|badges|my)$/.test(h) || /^tel:\+?\d+$/.test(h) || /^mailto:/.test(h) || (/^#p-m-/.test(h) && menus.includes(h.slice(5))) || (/^#p-c-/.test(h) && cls.includes(h.slice(5)))));
      const txt = [...d.querySelectorAll('.hxu-u')].map(x => x.textContent).join(' ');
      return { id, n: A.length, bad, inputs: d.querySelectorAll('.hxu-u input, .hxu-u select, .hxu-u textarea, form').length, phone: /휴대폰|핸드폰|전화번호를?\s*입력|주민(등록)?번호/.test(txt) /* 「지역 주민」은 방문자 이름이라 허용 */, sid: /학번/.test(txt) }; }), IDS);
    r.forEach(x => { ok(x.n >= 15 && !x.bad.length, `${x.id}: 시나리오 링크 ${x.n}개 모두 실제 경로(죽은 링크 0) ${x.bad.join(' ')}`); ok(!x.inputs && !x.phone && x.sid, `${x.id}: 대학 개인정보 — 학번 · 학과만 안내, 입력칸 · 휴대폰 문구 없음`); }); }

  /* ── 5) 템플릿 사용 → 학습자 미리보기(Shadow DOM) · 링크 클릭 ── */
  const CLK = { uvhub: [['.hxu-pn-f', /^#cal/], ['.hxu-pn-l a', /^#class\//], ['.hxu-uh .hxu-btn.g', /^#shop|^#class\//]],
    uvlms: [['.hxu-wk a', /^#cal/], ['.hxu-td a', /^#class\//], ['.hxu-lm-bt .hxu-btn.p', /^#login/]],
    uvopen: [['.hxu-op-ch a.all', /^#shop|^#class\//], ['.hxu-op-ch li:nth-child(2) a', /^#class\//], ['.hxu-se-l a', /^#class\//]] };
  for (const id of IDS) { await p.evaluate(id => { const f = document.getElementById('pvF'); if (f) f.remove(); ACT['tpl-use']({ dataset: { v: 'prem-' + id } }); save(); }, id); await p.waitForTimeout(700);
    ok(await p.evaluate(id => S.site.theme === id && S.site.tpl === 'prem-' + id, id), `${id} 템플릿 사용: 사이트 테마 · 템플릿 반영`);
    await p.evaluate(() => { const f = document.createElement('iframe'); f.id = 'pvF'; f.src = 'learner.html?preview=1#home'; f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:900px;z-index:99999;background:#fff'; document.body.appendChild(f); }); await p.waitForTimeout(3200);
    const L = await p.evaluate(H => { const d = document.getElementById('pvF').contentDocument; const h = [...d.querySelectorAll('.smhost')].find(x => x.shadowRoot && x.shadowRoot.querySelector(H)); return h ? [...h.shadowRoot.querySelectorAll('.hxu-u a[href]')].map(a => a.getAttribute('href')) : null; }, HERO);
    ok(!!L && L.length >= 15, `${id} 학습자 미리보기: 게시본(Shadow DOM)에 첫 화면 · 부품 (${L ? L.length : 0} 링크)`);
    ok(!!L && L.every(h => /^#(login|cal|badges|my|shop|notice|home|comm|class\/[\w-]+)$/.test(h) || /^(tel|mailto):/.test(h)), `${id} 학습자 미리보기: 링크가 학습자 경로로 바뀜 ${L ? [...new Set(L)].join(' ') : ''}`);
    for (const [sel, want] of CLK[id]) {
      const hh = await p.evaluate(([sel, H]) => { const d = document.getElementById('pvF').contentDocument; const h = [...d.querySelectorAll('.smhost')].find(x => x.shadowRoot && x.shadowRoot.querySelector(H)); const a = h && h.shadowRoot.querySelector(sel); if (!a) return ['(없음)', 0]; a.click(); return new Promise(r => setTimeout(() => r([d.defaultView.location.hash, (d.querySelector('#lm') || d.body).innerText.length]), 900)); }, [sel, HERO]);
      ok(want.test(hh[0]) && hh[1] > 40, `${id} 학습자 미리보기: ${sel} 누르면 ${hh[0]} 화면(내용 ${hh[1]}자)`);
      await p.evaluate(() => { const w = document.getElementById('pvF').contentWindow; w.location.hash = '#home'; }); await p.waitForTimeout(900); } }

  /* ── 6) 대비: 기관 색이 무엇이든 4.5:1 ── */
  { const r = await p.evaluate(ids => { const out = []; ids.forEach(id => ['#1F4E9E', '#F5C400', '#E11D48', '#10B981', '#7C3AED'].forEach(c => { const s = JSON.parse(JSON.stringify(site())); HPT.apply(s, id, { color: c }); HPT.audit(s).filter(x => x[3] < 4.5).forEach(x => out.push(id + c + ' ' + x[0] + ' ' + x[3])); })); return out; }, IDS);
    ok(!r.length, `대비 4.5:1(기관 색 5종) ${r.slice(0, 4).join(' / ')}`);
    for (const id of IDS) { const css = await p.evaluate(id => { const s = JSON.parse(JSON.stringify(site())); HPT.apply(s, id, { color: '#F5C400' }); const h = siteHTML(s, true, 'ko'); const m = h.match(/\.hxu-u\{--x-a:[^}]*\}/); return m ? m[0] : ''; }, id);
    const v = k => (css.match(new RegExp(`--x-${k}:(#[0-9a-fA-F]{6})`)) || [])[1]; const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    ok(v('at') && cr(v('at'), '#ffffff') >= 4.5 && cr(v('at50'), v('50')) >= 4.5 && cr(v('wt'), v('wbg')) >= 4.5 && cr(v('on'), v('a')) >= 4.5, `${id} 부품 글자 대비(노랑 기관 색): 라벨 ${v('at') && cr(v('at'), '#ffffff').toFixed(2)} · 옅은 칸 ${v('at50') && cr(v('at50'), v('50')).toFixed(2)} · 마감 ${v('wt') && cr(v('wt'), v('wbg')).toFixed(2)} · 버튼 ${v('on') && cr(v('on'), v('a')).toFixed(2)}`); } }
  ok(!errs.length, `관리자 pageerror 0 ${errs.join('|')}`); await ctx.close();

  /* ── 7) 빈 기관: 사실 없는 판은 숨김 ── */
  { const { ctx, p, errs } = await admin(true, { empty: true });
    const r = await p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); const h = siteHTML(s, true, 'ko'); const d = new DOMParser().parseFromString(h, 'text/html');
      return { hero: !!d.querySelector('.hxu-uh'), pn: !!d.querySelector('.hxu-uh-pn'), bd: !!d.querySelector('.hxu-bd'), who: !!d.querySelector('.hxu-who'), dday: /D-\d/.test(h), nb: (S.badges || []).filter(b => b && b.name).length, zero: /첫 발급 전/.test(h) || !(S.badges || []).length }; }, IDS[0]);
    ok(r.hero && r.who && !r.pn && r.bd === r.nb > 0 && r.zero && !r.dday, `빈 기관: 마감 판 · D-day 숨김, 배지 판은 배지가 정해진 경우에만(발급 0건은 「첫 발급 전」) ${JSON.stringify(r)}`);
    const r2 = await p.evaluate(() => ['uvlms', 'uvopen'].map(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); const h = siteHTML(s, true, 'ko'); const d = new DOMParser().parseFromString(h, 'text/html');
      return { id, hero: !!d.querySelector('.hp-hero.hxu-u'), dday: /D-\d/.test(h), seats: !!d.querySelector('.hxu-se'), wkItems: d.querySelectorAll('.hxu-td li').length, chips: d.querySelectorAll('.hxu-op-ch li').length, cls: (S.classes || []).length, login: /학번 · 학과로만/.test(h) }; }));
    r2.forEach(x => ok(x.hero && x.login && !x.dday && !x.seats && (x.cls ? true : !x.wkItems && !x.chips), `빈 기관 ${x.id}: 첫 화면은 남고 D-day · 남은 자리 · 칩은 사실이 없으면 숨김 ${JSON.stringify(x)}`));
    ok(!errs.length, `빈 기관 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  await browser.close(); srv.close(); void T0;
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
