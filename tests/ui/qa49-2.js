'use strict';
/* v49 QA 2 — 학습자 시나리오 전수 크롤(정적 데모 · 서버 불필요)
   유형 8종(adult · k12 · univ · univ_lms · corp · public · lifelong · voc) × 역할(학습자 · 방문자) × 보기(앱 390 · 웹 1280 · 웹 390)
   1) 첫 화면에서 아래 탭 · 상단 메뉴를 실제 클릭(tap)해 해시가 바뀌는지
   2) 화면 안의 #링크를 모아 하나씩 열어: pageerror · 빈 화면 · 오류 문구(문제가 생겼습니다 · TypeError · NaN · undefined · 님님 · [object) · 가로 넘침 · 가려져 안 눌리는 버튼
   3) 방문자 #join · #login: 이메일 · 소셜(구글 · 카카오 · 네이버) 표시가 설정과 맞는지
   4) 보호자(k12) · 승인 대기 · 웹/앱 전환 · 여러 기관
   사용: node tests/ui/qa49-2.js [유형...]  (QA49_SHOT=dir 이면 실패 화면 캡처) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const TYPES = [['adult'], ['k12'], ['univ'], ['univ', 'lms'], ['corp'], ['public'], ['lifelong'], ['voc']];
const ONLY = process.argv.slice(2); const SHOT = process.env.QA49_SHOT || '';
const BAD = /문제가 생겼습니다|TypeError|ReferenceError|\bNaN\b|undefined|\[object |님님|null님|\$\{/;
function fixture(j, type, ed, o) {
  j.org.type = type; if (ed) j.org.ed = ed; else delete j.org.ed;
  if (type === 'voc' && j.cpl) j.cpl.on = true;
  if (o.social) { j.acct = j.acct || {}; j.acct.social = o.social; }
  if (o.patch) o.patch(j); return j; }
const LS = { sid: '20269000', dept: '26년 10월 기수', id: '20269000' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(+(process.env.QA49_PORT || 9921), '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; let pass = 0;
  const ok = (c, m) => { if (c) pass++; else { fails.push(m); console.log('✗ ' + m); } };
  const open = async (type, ed, o = {}) => {
    const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: 844 }, hasTouch: !!o.app }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/learner-demo-adult\.json/, r => { const j = fixture(JSON.parse(fs.readFileSync(ROOT + '/learner-demo-adult.json', 'utf8')), type, ed, o); r.fulfill({ contentType: 'application/json', body: JSON.stringify(j) }); });
    await p.addInitScript(([guest, lp, pend]) => { try { localStorage.setItem('didisam.app.instx', '1'); if (!guest) { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '26년 10월 기수', id: '20269000' })); if (lp) localStorage.setItem('didisam.room.sample.lp', JSON.stringify({ '20269000': lp })); } if (pend) localStorage.setItem('didisam.app.pend.sample', pend); } catch (e) { } }, [!!o.guest, o.lp || null, o.pend || '']);
    await p.goto(`${base}/learner.html?demo=adult${o.app ? '&app=1' : ''}${o.hash || '#home'}`, { waitUntil: 'load' }); await p.waitForTimeout(800); return { ctx, p, errs }; };
  const scan = p => p.evaluate((BADs) => { const BAD = new RegExp(BADs); const main = document.querySelector('#lm') || document.querySelector('main') || document.body;
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && (!e.checkVisibility || e.checkVisibility({ contentVisibilityAuto: true })) && s.visibility !== 'hidden' && s.display !== 'none'; };
    const clip = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') return true; } return false; };
    const shad = [...document.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => [...e.shadowRoot.children].filter(c => c.tagName !== 'STYLE' && c.tagName !== 'SCRIPT').map(c => c.innerText || '').join(' ')).join(' ');
    const tx = ((main.innerText || '') + ' ' + (main.innerText.trim().length < 40 ? shad.replace(/\s+/g, ' ') : '')).trim(); const W = document.documentElement.clientWidth;
    const over = document.documentElement.scrollWidth > W + 2;
    const wide = [...main.querySelectorAll('*')].filter(e => vis(e) && e.getBoundingClientRect().right > W + 2 && !clip(e)).slice(0, 3).map(e => (e.className || e.tagName).toString().slice(0, 40));
    const bad = (tx.match(BAD) || [''])[0];
    /* 가려져 안 눌리는 버튼(보이는 화면 안의 버튼만) */
    const cov = []; for (const b of [...document.querySelectorAll('#lm button, #lm a[href], #lm [data-act], .ap-nav a')].filter(vis).slice(0, 80)) { const r = b.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > W) continue; const x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); if (h && !b.contains(h) && !h.contains(b) && !h.closest('.lt-fab,#tbFab,.ltoast,[role=dialog],dialog,.lsheet,.ap-nav,header,.lhd,.ap-bar,.tabbar,.lux-bn,.pvbar,[class*="fab"],[class*="toast"]')) cov.push(((b.textContent || '').trim().slice(0, 16) || b.className) + ' ← ' + (h.className || h.tagName).toString().slice(0, 30)); }
    const links = [...new Set([...document.querySelectorAll('a[href^="#"]')].filter(vis).map(a => a.getAttribute('href')).filter(h => h.length > 1 && !/^#(lm|main|top|skip)/.test(h)))];
    const dup = !!(document.querySelector('#lm .lph-st') && document.querySelector('#lm .tb-phk'));
    return { dup, len: tx.length, over, wide, bad, cov: cov.slice(0, 3), links, title: document.title, h: location.hash }; }, BAD.source);
  for (const [type, ed] of TYPES) {
    const tn = ed ? type + '_' + ed : type; if (ONLY.length && !ONLY.includes(tn)) continue;
    for (const v of [{ app: 1, w: 390, n: '앱390' }, { w: 1280, n: '웹1280' }, { w: 390, n: '웹390' }]) for (const role of ['학습자', '방문자']) {
      const tag = `${tn}·${v.n}·${role}`; const { ctx, p, errs } = await open(type, ed, { ...v, guest: role === '방문자' });
      const h0 = await scan(p); ok(h0.len > 40, `${tag} 첫 화면 비어 있지 않음(${h0.len}자)`);
      /* 1) 아래 탭 실제 탭(앱) */
      if (v.app) { const tabs = await p.$$eval('.ap-nav a', as => as.map(a => ({ t: a.textContent.trim(), h: a.getAttribute('href') }))); ok(tabs.length >= 3, `${tag} 아래 탭 ${tabs.length}칸`);
        for (let i = 0; i < tabs.length; i++) { const T = tabs[i]; if (!T.h || !/^#/.test(T.h)) continue; await p.evaluate(() => { location.hash = '#home'; }); await p.waitForTimeout(250); const a = (await p.$$('.ap-nav a'))[i]; if (!a) continue; await a.tap().catch(() => a.click()); await p.waitForTimeout(450);
          const h = await p.evaluate(() => location.hash); const s = await scan(p); ok(h === T.h || T.h === '#home' || h.startsWith(T.h), `${tag} 아래 탭 「${T.t}」 누르면 ${T.h}로 이동 — 실제 ${h}`); ok(s.len > 30 && !s.bad, `${tag} 탭 「${T.t}」 화면 정상 — ${s.len}자 ${s.bad}`); } }
      /* 2) 링크 크롤(첫 화면 + 탭 화면 링크, 1단계) */
      const seen = new Set(); let queue = [...h0.links];
      if (v.app) for (const T of await p.$$eval('.ap-nav a', as => as.map(a => a.getAttribute('href')))) { await p.evaluate(h => { location.hash = h; }, T); await p.waitForTimeout(350); queue.push(...(await scan(p)).links); }
      queue = [...new Set(queue)].filter(h => !/^#(logout|out)$/.test(h)).slice(0, 40);
      for (const h of queue) { if (seen.has(h)) continue; seen.add(h); const e0 = errs.length; await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(380);
        const s = await scan(p);
        ok(!s.bad, `${tag} ${h} 오류 문구 없음 — 「${s.bad}」`);
        ok(s.len > 20, `${tag} ${h} 빈 화면 아님 — ${s.len}자`);
        ok(!s.over && !s.wide.length, `${tag} ${h} 가로 넘침 없음 — ${s.wide.join(',')}`);
        ok(!s.dup, `${tag} ${h} 요약 숫자 칸 한 줄(페이지 머리 · 앱 머리 중복 없음 — v49 QA2)`);
        ok(!s.cov.length, `${tag} ${h} 가려진 버튼 없음 — ${s.cov.join(' | ')}`);
        ok(errs.length === e0, `${tag} ${h} 스크립트 오류 없음 — ${errs.slice(e0).join(' / ').slice(0, 200)}`);
        if (SHOT && (s.bad || s.over || s.wide.length || s.cov.length || errs.length > e0)) await p.screenshot({ path: path.join(SHOT, `${tag}${h.replace(/[^\w가-힣]/g, '_')}.png`) }).catch(() => {}); }
      ok(!errs.length, `${tag} 전체 스크립트 오류 0 — ${[...new Set(errs)].join(' / ').slice(0, 300)}`);
      await ctx.close(); }
  }
  /* 3) 방문자 가입 · 로그인 — 체험(데모)에서는 가입 안내 + 로그인 길, 로그인 화면은 수강번호 · 접근코드(소셜 가입 표시는 learner-signup.js 서버 시험) */
  if (!ONLY.length || ONLY.includes('auth')) for (const [type, ed] of TYPES) { const tn = ed ? type + '_' + ed : type;
    const { ctx, p, errs } = await open(type, ed, { app: 1, guest: true, hash: '#join' }); const s1 = await scan(p);
    ok(!s1.bad && s1.links.some(h => /^#login/.test(h)), `${tn} 체험 #join: 로그인으로 가는 길 — ${s1.links.join(',')}`);
    await p.evaluate(() => { location.hash = '#login'; }); await p.waitForTimeout(400); const s = await scan(p);
    ok(!s.bad && await p.$('#lm input[type=password], #lm input[name=code], #lm input[autocomplete=current-password]') !== null, `${tn} #login 입력 칸 — ${s.bad}`);
    ok(!errs.length, `${tn} 가입 · 로그인 오류 0 — ${errs.join(' / ').slice(0, 200)}`); await ctx.close(); }
  /* 4) 보호자 · 승인 대기 · 웹/앱 전환 */
  if (!ONLY.length || ONLY.includes('etc')) {
    { const { ctx, p, errs } = await open('k12', '', { app: 1, guest: true, hash: '#guardian' }); const s = await scan(p); ok(!s.bad && s.len > 20, `k12 보호자 #guardian(토큰 없음) 정상 — ${s.len}자 ${s.bad}`); ok(!errs.length, `k12 보호자 오류 0 — ${errs.join('/')}`); await ctx.close(); }
    { const { ctx, p, errs } = await open('adult', '', { app: 1, guest: true, pend: 'pendX' }); const s = await scan(p); ok(!s.bad, `승인 대기 기억 상태 첫 화면 정상 ${s.bad}`); ok(!errs.length, `승인 대기 오류 0 — ${errs.join('/')}`); await ctx.close(); }
    for (const [type, ed] of TYPES) { const tn = ed ? type + '_' + ed : type; const { ctx, p, errs } = await open(type, ed, { w: 1280 });
      /* 웹 → 앱 보기 전환 링크/버튼 */
      const sw = await p.evaluate(() => { const a = [...document.querySelectorAll('a,button')].find(x => /앱으로 보기|앱 보기|앱으로 열기/.test(x.textContent)); return a ? (a.getAttribute('href') || 'btn') : ''; });
      if (sw) { const el = await p.$(`text=/앱으로 보기|앱 보기|앱으로 열기/`); await el.click().catch(() => {}); await p.waitForTimeout(700); const s = await scan(p); ok(!s.bad && s.len > 30, `${tn} 웹→앱 전환 뒤 정상 — ${s.bad}`); }
      ok(!errs.length, `${tn} 웹/앱 전환 오류 0 — ${errs.join('/').slice(0, 200)}`); await ctx.close(); }
  }
  console.log(`\n통과 ${pass} · 실패 ${fails.length}`); await browser.close(); srv.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
