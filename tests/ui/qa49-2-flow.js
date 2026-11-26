'use strict';
/* v49 QA 2 — 학습자 여정(정적 데모): 가입 → 수강(결제) → 강의 → 퀴즈 → 마이 · 앱 탭, 휴대폰 390에서 실제 클릭
   A) 성인 학원: 방문자 #join(이메일 · 소셜 단추) → 가입 → 둘러보기 → 결제(동의 없이 막힘 → 동의 · 결제 승인) → #payok → 강의실 → 영상 → 퀴즈 제출 → 나 · 결제 내역
   B) 결제 없는 유형(기업 · 대학 학사 LMS · 직업훈련): 결제 화면 대신 수강 신청 안내, 유형에 맞지 않는 문구(학사 LMS의 결제 · 장바구니) 없음
   사용: node tests/ui/qa49-2-flow.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(+(process.env.QA49_PORT || 9923), '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; let pass = 0; const ok = (c, m) => { if (c) pass++; else fails.push(m); console.log(`${c ? '✓' : '✗'} ${m}`); };
  const open = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/learner-demo-adult\.json/, r => { const j = JSON.parse(fs.readFileSync(ROOT + '/learner-demo-adult.json', 'utf8')); j.org.type = o.type || 'adult'; if (o.ed) j.org.ed = o.ed; else delete j.org.ed; if (o.type === 'voc' && j.cpl) j.cpl.on = true; r.fulfill({ contentType: 'application/json', body: JSON.stringify(j) }); });
    await p.addInitScript(g => { try { localStorage.setItem('didisam.app.instx', '1'); if (!g) sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '26년 10월 기수', id: '20269000' })); } catch (e) { } }, !!o.guest);
    await p.goto(`${base}/learner.html?demo=adult&app=1${o.hash || '#home'}`, { waitUntil: 'load' }); await p.waitForTimeout(800); return { ctx, p, errs }; };
  const T = p => p.evaluate(() => (document.querySelector('#lm') || document.body).innerText);
  const go = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(450); };

  /* A) 성인 학원 여정 — 체험(데모)의 #join은 「게시된 사이트에서 가입」 안내 + 로그인 · 홈 길(막다른 화면 아님). 실제 가입(이메일 · 카카오 · 네이버 · 구글)은 learner-signup.js(서버) */
  { const { ctx, p, errs } = await open({ guest: true, hash: '#join' });
    const j = await p.evaluate(() => [...document.querySelectorAll('#lm a[href]')].filter(a => a.offsetParent).map(a => a.getAttribute('href')));
    ok(j.some(h => /^#login/.test(h)) && j.some(h => /^#home/.test(h)), `A 체험 #join: 로그인 · 홈으로 가는 길 — ${j.join(',')}`);
    ok(!errs.length, `A 가입 화면 오류 0 — ${errs.join('/')}`); await ctx.close(); }
  { const { ctx, p, errs } = await open({});
    /* 둘러보기 탭(실제 탭) */
    const nav = await p.$$eval('.ap-nav a', a => a.map(x => [x.textContent.trim(), x.getAttribute('href')]));
    const fi = nav.findIndex(x => x[1] === '#shop'); ok(fi >= 0, `A 아래 탭에 둘러보기(#shop) — ${nav.map(x => x[0]).join(',')}`);
    if (fi >= 0) { await (await p.$$('.ap-nav a'))[fi].tap(); await p.waitForTimeout(500); ok(await p.evaluate(() => location.hash) === '#shop', 'A 둘러보기 탭 → #shop'); }
    /* 아직 신청하지 않은 클래스 고르기 */
    let cid = ''; for (const id of ['c3', 'c2', 'c1', 'c0']) { await go(p, '#pay/class/' + id); if (await p.$('#shpPay')) { cid = id; break; } }
    ok(!!cid, `A 결제 화면(#pay/class/…) 열림 — ${cid}`);
    if (cid) {
      await p.click('#shpPay button[type=submit]'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => { const e = document.querySelector('#shpPay .p26err'); return (e && !e.hidden) || !!document.querySelector('.ltoast'); }) && await p.evaluate(() => location.hash.startsWith('#pay/')), 'A 결제: 동의 없이 누르면 막고 안내');
      const box = await p.$('#shpPay [name=agree]'); const bb = await box.boundingBox(); ok(!!bb, 'A 결제: 동의 칸이 화면에 보임');
      await p.evaluate(() => { const a = document.querySelector('#shpPay [name=agree]'); if (!a.checked) a.click(); });
      const m = await p.$$('#shpPay [name=m]'); ok(m.length >= 3, `A 결제: 결제 방식 ${m.length}가지`);
      await p.click('#shpPay button[type=submit]'); await p.waitForTimeout(400);
      const ap = await p.$('text=결제 승인'); ok(!!ap, 'A 결제: 데모 결제창(결제 승인) 열림');
      if (ap) { await ap.click(); await p.waitForTimeout(700); }
      const h = await p.evaluate(() => location.hash); ok(/^#payok\//.test(h), `A 결제 완료 → ${h}`);
      const pt = await T(p); ok(/결제/.test(pt) && !/undefined|NaN/.test(pt), `A 결제 완료 화면 문구 — ${pt.replace(/\s+/g, ' ').slice(0, 80)}`);
      /* 결제 완료 화면에서 강의실로 가는 길(동선 끊김 점검) */
      const toC = await p.evaluate(cid => [...document.querySelectorAll('#lm a[href]')].map(a => a.getAttribute('href')).filter(x => x.includes(cid) || /^#(my|c\/)/.test(x)), cid);
      ok(toC.length > 0, `A 결제 완료 → 강의실 · 내 강의로 가는 링크 — ${toC.join(',')}`);
      await go(p, '#c/' + cid); const ct = await T(p); ok(ct.length > 50 && !/신청하지 않은|수강 신청 후/.test(ct), `A 결제 뒤 강의실 #c/${cid} 열림 — ${ct.replace(/\s+/g, ' ').slice(0, 80)}`);
      /* 나 → 결제 내역에 방금 결제 */
      await go(p, '#mypay'); const mp = await T(p);
      ok(await p.evaluate(() => !document.querySelector('#lm .tb-phk') && !/결제 금액\s*없음/.test(document.querySelector('#lm').innerText)), 'A 결제 내역: 요약 숫자 칸 한 줄 · 「결제 금액 없음」 모순 없음(v49 QA2)'); ok(/결제/.test(mp) && /완료/.test(mp), `A 결제 내역에 결제 완료 표시 — ${mp.replace(/\s+/g, ' ').slice(0, 90)}`);
    }
    /* 강의 → 퀴즈 */
    await go(p, '#c/c0'); const links = await p.evaluate(() => [...document.querySelectorAll('#lm a[href]')].map(a => a.getAttribute('href')).filter(h => /iti4jymw3|itcd8rdl0/.test(h)));
    ok(links.length > 0, `A 강의실에서 영상 · 퀴즈 링크 — ${links.slice(0, 3).join(',')}`);
    const qh = links.find(h => /iti4jymw3/.test(h)); if (qh) { await go(p, qh); const qt = await T(p); ok(/퀴즈|문제|제출|시작/.test(qt), `A 퀴즈 화면 — ${qt.replace(/\s+/g, ' ').slice(0, 80)}`);
      const st = await p.$('#lm button:visible:has-text("응시 시작"), #lm a:visible:has-text("응시 시작")'); if (st) { await st.click(); await p.waitForTimeout(400); }
      const radios = await p.$$('#lm input[type=radio]'); ok(radios.length >= 2, `A 퀴즈: 보기 ${radios.length}개`);
      if (radios.length) { await p.evaluate(() => { const g = {}; document.querySelectorAll('#lm input[type=radio]').forEach(r => { if (!g[r.name]) { g[r.name] = 1; r.click(); } }); });
        const sb = await p.$('#lm button[type=submit], #lm button:has-text("제출")'); ok(!!sb, 'A 퀴즈: 제출 단추'); if (sb) { await sb.click(); await p.waitForTimeout(400); const cf = await p.$('dialog[open] button:has-text("제출"), .lmodal button:has-text("제출")'); if (cf) { await cf.click(); await p.waitForTimeout(400); } }
        const sc = await p.evaluate(() => { const c = LR.lp && LR.lp.cls && LR.lp.cls.c0; const it = c && c.items && c.items.iti4jymw3; return it ? it.score : null; });
        ok(sc !== null && sc !== undefined, `A 퀴즈 제출 → 점수 저장(${sc})`); } }
    /* 나 탭 → 마이 카드 진입점(실제 탭) */
    const ni = (await p.$$eval('.ap-nav a', a => a.map(x => x.getAttribute('href')))).findIndex(h => /^#acct|^#me/.test(h)); if (ni >= 0) { await go(p, '#home'); await (await p.$$('.ap-nav a'))[ni].tap(); await p.waitForTimeout(500); const ah = await p.evaluate(() => location.hash); ok(/^#(acct|me)/.test(ah), `A 「나」 탭 → ${ah}`);
      const cards = await p.$$eval('#lm a[href^="#"]', a => a.map(x => x.getAttribute('href')).slice(0, 12)); for (const h of cards.slice(0, 6)) { const e0 = errs.length; await go(p, h); ok(errs.length === e0 && (await T(p)).length > 20, `A 나 → ${h} 열림`); await go(p, ah); } }
    ok(!errs.length, `A 여정 스크립트 오류 0 — ${[...new Set(errs)].join(' / ').slice(0, 300)}`); await ctx.close(); }

  /* B) 결제 없는 유형 · 유형 문구 */
  for (const [type, ed, bad] of [['univ', 'lms', /결제하기|장바구니|자격증 준비/], ['corp', '', /장바구니/], ['voc', '', /장바구니/], ['k12', '', /자격증 준비/]]) {
    const { ctx, p, errs } = await open({ type, ed }); const tag = ed ? type + '_' + ed : type; let hit = [];
    for (const h of await p.$$eval('.ap-nav a', a => a.map(x => x.getAttribute('href')))) { await go(p, h); const t = await T(p); const m = t.match(bad); if (m) hit.push(h + ':' + m[0]); }
    await go(p, '#home'); { const t = await T(p); const m = t.match(bad); if (m) hit.push('#home:' + m[0]); }
    ok(!hit.length, `B ${tag}: 유형에 맞지 않는 문구 없음 — ${hit.join(', ')}`);
    ok(!errs.length, `B ${tag} 오류 0 — ${errs.join('/').slice(0, 200)}`); await ctx.close(); }
  console.log(`\n통과 ${pass} · 실패 ${fails.length}`); await browser.close(); srv.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
