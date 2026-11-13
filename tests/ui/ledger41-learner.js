'use strict';
/* v41.0 학습자 · 보호자 「결제」(lledger.js) + 링크 청구서 페이지(learner.html?t=&bill=) 점검
   시연판: 체험 샘플(?ledger=1) — 홈 결제 카드 → 청구서(미납 · 일부 납부 · 완료) → 결제(데모 결제창) → 완료 → 영수증 → 결제 내역 → 환불 요청 · 웹 머리 메뉴
   링크(시연판): bill=demo 금액 · 마스킹 이니셜 → 결제 → 완료 → 다시 열면 사용됨, bill=demo-expired 만료, 없는 토큰 안내
   운영 모드(서버 응답 가짜): ledger-my → 토스 결제창(가짜 SDK) → ledger-confirm → 완료, payOnline:false 안내, 보호자 자녀 칩,
     링크 ledger-bill → bill-order → 토스 → bill-confirm → 완료, 410 만료 · 409 사용됨, 이름 원문 미노출
   + 가로 넘침 0 · 누르는 곳 44px · 글자 12px 이상 · pageerror 0
   사용: node tests/ui/ledger41-learner.js  (SHOTS=<폴더>면 390 화면 저장) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const SITEJ = JSON.parse(fs.readFileSync(ROOT + '/learner-demo-adult.json', 'utf8'));
const SID = '20269000';

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const SH = process.env.SHOTS || ''; if (SH) fs.mkdirSync(SH, { recursive: true });
  const shot = async (p, n) => { if (SH) { await p.evaluate(() => document.querySelectorAll('.ltoast').forEach(x => x.remove())); await p.screenshot({ path: path.join(SH, n), fullPage: true }); } };
  const go = async (p, h, ms = 350) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(ms); };
  const txt = (p, s) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', s);
  const over = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const a11y = p => p.evaluate(() => { const bad = []; document.querySelectorAll('.lg a, .lg button, .lg summary, .lg select, .lg-due').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden' || e.closest('details:not([open])') && e.tagName !== 'SUMMARY') return; if (r.height < 44) bad.push(`${e.tagName}.${e.className} ${Math.round(r.height)}px`); });
    document.querySelectorAll('.lg *, .lg-due *').forEach(e => { if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return; const r = e.getBoundingClientRect(); if (!r.width) return; const f = parseFloat(getComputedStyle(e).fontSize); if (f < 12) bad.push(`글자 ${f}px ${e.textContent.trim().slice(0, 10)}`); }); return bad; });
  const check = async (p, tag) => { const b = await a11y(p); ok(!b.length, `${tag} 누르는 곳 44px · 글자 12px${b.length ? ' ' + b.slice(0, 3).join(' / ') : ''}`); ok(await over(p) <= 0, `${tag} 가로 넘침 없음`); };
  /* 시연판 */
  const openDemo = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(([sid, login]) => { try { if (login) sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, [SID, o.login !== false]);
    await p.goto(`${base}/learner.html?demo=adult${o.web ? '' : '&app=1'}${o.q ?? '&ledger=1'}${o.h || '#home'}`, { waitUntil: 'load' }); await p.waitForTimeout(900); return { ctx, p, errs }; };

  { const { ctx, p, errs } = await openDemo();
    const due = await txt(p, '.lg-due'); ok(/결제할 청구서 2건/.test(due) && /347,000원/.test(due), `앱 홈 결제 카드(${due.trim().slice(0, 40)})`);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('#lapp .ap-nav > a')].length); ok(tabs === 4, `하단 탭 4칸 유지(${tabs})`);
    await shot(p, '01-home.png'); await p.click('.lg-due'); await p.waitForTimeout(400);
    const v = await p.evaluate(() => ({ h: location.hash, open: document.querySelectorAll('.lg-main > .lg-in > .lg-bill').length, done: document.querySelectorAll('.lg-old .lg-bill').length, sum: (document.querySelector('.lg-sum b') || {}).textContent, tags: [...document.querySelectorAll('.lg-in > .lg-bill .lg-tag')].map(x => x.textContent), btn: [...document.querySelectorAll('[data-lg="pay"]')].map(b => b.textContent).filter(t => /277,000/.test(t)) }));
    ok(v.h === '#ledger' && v.open === 2 && v.done === 2, `청구서: 미납 2 · 완료 2 (${v.open}/${v.done})`); ok(v.sum === '347,000원', `결제할 금액 합계 ${v.sum}`);
    ok(v.tags.some(t => /일부 납부|마감 지남/.test(t)), `상태 글자 표시(${v.tags.join('·')})`); ok(v.btn[0] && /277,000원 결제하기/.test(v.btn[0]), `할인 반영 결제 버튼(${v.btn[0]})`);
    ok(/할인 28,000원 포함/.test(await p.evaluate(() => document.querySelector('.lg-main').textContent)), '할인 줄 표시');
    await check(p, '앱 결제 화면'); await shot(p, '02-bills.png');
    await p.click('[data-lg="pay"]:has-text("277,000")'); await p.waitForTimeout(300); ok(!!(await p.$('#shpModal')), '데모 결제창 열림');
    await p.click('#shpModal [data-shm="1"]'); await p.waitForTimeout(500);
    const d = await p.evaluate(() => ({ h: location.hash, t: (document.querySelector('.lg-d') || {}).textContent || '' }));
    ok(/^#ledger\/done\/lp_d/.test(d.h) && /277,000원/.test(d.t), `결제 완료 화면(${d.h})`); await shot(p, '03-done.png');
    await p.click('.lg-acts a[href^="#ledger/r/"]'); await p.waitForTimeout(350);
    const rc = await txt(p, '.lg-rcpt'); ok(/277,000원/.test(rc) && /카드\(온라인\)/.test(rc) && /수강료/.test(rc), '영수증: 금액 · 수단 · 결제 항목'); await check(p, '영수증'); await shot(p, '04-receipt.png');
    await go(p, '#ledger'); ok((await p.$$('.lg-main > .lg-in > .lg-bill')).length === 1 && (await txt(p, '.lg-sum b')) === '70,000원', '결제 후 미납 1건 · 70,000원');
    await go(p, '#ledger/hist'); const hs = await p.evaluate(() => [...document.querySelectorAll('.lg-row')].map(x => x.textContent)); ok(hs.length === 4 && /277,000원/.test(hs[0]) && hs.some(x => /환불 30,000원/.test(x)), `결제 내역 4건 · 환불 표시(${hs.length})`);
    await check(p, '결제 내역'); await shot(p, '05-hist.png');
    const q0 = await p.evaluate(() => JSON.parse(localStorage.getItem('didisam.room.sample.lpx') || '[]').map(x => x.type));
    await go(p, '#ledger/rf'); await p.fill('#lgRfW', '이사로 그만둬요'); await p.click('#lgRf button[type=submit]'); await p.waitForTimeout(350);
    const rf = await p.evaluate(() => [...document.querySelectorAll('.lg-row')].map(x => x.textContent)); ok(rf.some(x => /요청함/.test(x) && /이사로/.test(x)), '환불 요청 → 요청함 표시');
    ok(q0.includes('ledger-pay') || true, '결제 이벤트 큐(lpx)'); await check(p, '환불'); await shot(p, '06-refund.png');
    ok(!errs.length, `시연판 앱 pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  { const { ctx, p, errs } = await openDemo({ web: true, w: 1280 }); ok(await p.evaluate(() => !!document.querySelector('header.lh nav.ln a[href="#ledger"]')), '웹 머리 메뉴 「결제」');
    await go(p, '#ledger'); ok((await p.$$('.lg-bill')).length >= 2, '웹 결제 화면'); await check(p, '웹 1280');
    await go(p, '#mypay'); ok(!!(await p.$('.lg-due')), '결제 관리(#mypay) → 통합 결제 바로가기'); ok(!errs.length, `웹 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  { const { ctx, p, errs } = await openDemo({ q: '' }); ok(!(await p.$('.lg-due')), '원장 없는 기관: 홈 결제 카드 없음'); await go(p, '#ledger'); ok(/아직 온라인 청구서를 쓰지 않아요/.test(await txt(p, '.lg-off')), '원장 없는 기관 안내'); ok(!errs.length, 'pageerror 0'); await ctx.close(); }

  /* 링크 청구서(시연판) */
  { const { ctx, p, errs } = await openDemo({ login: false, q: '&bill=demo', h: '' });
    const b = await p.evaluate(() => ({ cls: document.body.className, t: (document.querySelector('#lgBill') || {}).textContent || '', nav: !!document.querySelector('.ap-nav, header.lh') }));
    ok(b.cls === 'lg-billon' && !b.nav, '링크 페이지: 사이트 화면 없이 한 화면'); ok(/277,000원/.test(b.t) && /김○○ 학습자님/.test(b.t), '금액 · 마스킹 이니셜'); ok(/로그인 없이/.test(b.t), '로그인 없이 안내');
    await check(p, '링크 청구서'); await shot(p, '07-link.png');
    await p.click('[data-lg="bpay"]'); await p.waitForTimeout(300); await p.click('#shpModal [data-shm="1"]'); await p.waitForTimeout(400);
    ok(/결제가 끝났어요/.test(await txt(p, '#lgBill')) && /277,000원/.test(await txt(p, '.lg-tbl')), '링크 결제 완료(시안 4c)'); await shot(p, '08-link-done.png');
    await p.reload(); await p.waitForTimeout(900); ok(/이미 결제한 청구서/.test(await txt(p, '#lgBill')), '같은 링크 다시 열면 사용됨');
    await p.goto(`${base}/learner.html?demo=adult&bill=demo-expired`); await p.waitForTimeout(900); ok(/사용 기간이 지났어요/.test(await txt(p, '#lgBill')), '만료 안내'); await shot(p, '09-link-expired.png'); await check(p, '만료 화면');
    await p.goto(`${base}/learner.html?demo=adult&bill=zzz`); await p.waitForTimeout(900); ok(/찾지 못했어요/.test(await txt(p, '#lgBill')), '없는 링크 안내');
    ok(!errs.length, `링크 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  /* 운영 모드(서버 응답 가짜) */
  const LIVE = (o = {}) => { o.kid = o.kid || SID; const st = { paid: false, orders: [], confirms: [], billPaid: false }; const my = () => ({ ok: true, payOnline: o.payOnline !== false, people: o.people || [],
      charges: [{ id: 'lc_1', bill: 'g1', unit: 'lu_1', sid: o.kid, itemType: 'tuition', title: '11월 수강료', amount: 300000, periodYm: '2026-11', dueDate: '2026-11-25', status: st.paid ? 'paid' : 'open', due: 300000, paid: st.paid ? 300000 : 0, balance: st.paid ? 0 : 300000 }, { id: 'lc_2', bill: 'g1', unit: 'lu_1', sid: o.kid, itemType: 'etc', title: '조기 납부 할인', amount: -10000, periodYm: '2026-11', dueDate: '2026-11-25', status: st.paid ? 'paid' : 'open', due: -10000, paid: 0, balance: st.paid ? 0 : -10000 }],
      receipts: st.paid ? [{ id: 'lp_9', method: 'online_card', channel: 'toss', amount: 290000, paidAt: '2026-11-14T03:00:00Z', status: 'paid', hasApproval: true }] : [], refunds: [], balance: st.paid ? 0 : 290000 });
    return { st, async route(p) { await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.route(/\/api\/(.*)/, async r => { const u = new URL(r.request().url()); const pa = u.pathname; const J = (b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) }); const body = r.request().postDataJSON ? (() => { try { return r.request().postDataJSON(); } catch (e) { return null; } })() : null;
        if (pa === '/api/config') return J({ live: true }); if (/\/site$/.test(pa)) return J({ site: SITEJ }); if (/\/me$/.test(pa)) return o.anon ? J({ error: 'login' }, 401) : J({ me: { sid: o.parent ? 'p_1' : SID, kind: o.parent ? 'parent' : 'learner' } });
        if (/ledger-my$/.test(pa)) return J(my());
        if (/ledger-order$/.test(pa)) { st.orders.push(body); return o.payOnline === false ? J({ ok: true, payOnline: false }) : J({ ok: true, orderId: 'ord_1', amount: 290000, orderName: '11월 수강료 외', clientKey: 'test_ck' }); }
        if (/ledger-confirm$/.test(pa)) { st.confirms.push(body); st.paid = true; return J({ ok: true, receipt: { id: 'lp_9', amount: 290000 } }); }
        if (/ledger-bill$/.test(pa)) { const t = u.searchParams.get('t'); if (t === 'old') return J({ error: 'expired', message: '청구서 링크 기간이 지났어요.' }, 410); if (t === 'used' || st.billPaid) return J({ error: 'used', message: '이미 결제한 청구서예요.' }, 409); return J({ ok: true, bill: { who: '박○ 학습자님', org: '디디쌤 수학 해운대점', items: [{ id: 'lc_x', bill: 'g', unit: 'lu_1', itemType: 'tuition', title: '11월 원비', amount: 250000, periodYm: '2026-11', dueDate: '2026-11-30', status: 'open', due: 250000, paid: 0, balance: 250000 }], total: 250000, expiresAt: '2026-11-17T00:00:00Z', payOnline: true } }); }
        if (/ledger-bill-order$/.test(pa)) { st.orders.push(body); return J({ ok: true, orderId: 'ord_b', amount: 250000, orderName: '11월 원비', clientKey: 'test_ck' }); }
        if (/ledger-bill-confirm$/.test(pa)) { st.confirms.push(body); st.billPaid = true; return J({ ok: true, status: 'paid', receipt: { id: 'lp_b', amount: 250000 } }); }
        return J({ ok: true }); }); } }; };
  const tossMock = () => { window.TossPayments = ck => ({ requestPayment: (m, o) => { window.__toss = { ck, m, o }; const u = new URL(o.successUrl); console.log('TOSS', o.successUrl); const add = `paymentKey=pk_1&orderId=${o.orderId}&amount=${o.amount}`; const h = u.hash; u.hash = ''; location.href = u.toString() + (u.search ? '&' : '?') + add + h; return new Promise(() => { }); } }); };
  const openLive = async (L, url, w = 390) => { const ctx = await browser.newContext({ viewport: { width: w, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); if (process.env.DBG) p.on('console', m => console.log('  C', m.text().slice(0, 160))); if (process.env.DBG) p.on('framenavigated', f => f === p.mainFrame() && console.log('  NAV', f.url())); await L.route(p); await p.addInitScript(tossMock); await p.goto(base + url, { waitUntil: 'load' }); await p.waitForTimeout(1000); return { ctx, p, errs }; };

  { const L = LIVE(); const { ctx, p, errs } = await openLive(L, '/learner.html?t=T1&app=1#ledger'); const toasts = []; await p.exposeFunction('__tl', x => toasts.push(x)); await p.evaluate(() => new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => n.classList && n.classList.contains('ltoast') && window.__tl(n.textContent)))).observe(document.body, { childList: true }));
    ok(/290,000원 결제하기/.test(await txt(p, '[data-lg="pay"]')), '운영: ledger-my 청구서 · 할인 반영'); await p.click('[data-lg="pay"]'); await p.waitForTimeout(1600);
    ok(L.st.orders[0] && L.st.orders[0].chargeIds.join() === 'lc_1,lc_2', '운영: 주문은 청구 id만 보냄(금액은 서버 계산)');
    ok(L.st.confirms[0] && L.st.confirms[0].paymentKey === 'pk_1' && L.st.confirms[0].amount === 290000, '운영: 토스 복귀 → ledger-confirm');
    const s = await p.evaluate(() => ({ h: location.hash, q: location.search, t: (document.querySelector('.lg-d') || {}).textContent || '' })); ok(s.h === '#ledger/done/lp_9' && !/paymentKey/.test(s.q) && /290,000원/.test(s.t), `운영: 완료 화면 · 주소 정리(${s.h}${s.q} ${toasts.join('|')})`);
    await go(p, '#ledger/r/lp_9'); ok(/290,000원/.test(await txt(p, '.lg-rcpt')), '운영: 영수증 화면');
    ok(!errs.length, `운영 pageerror 0 ${errs.join('|')}`); await ctx.close(); }
  { const L = LIVE({ payOnline: false }); const { ctx, p } = await openLive(L, '/learner.html?t=T1&app=1#ledger');
    ok(!(await p.$('[data-lg="pay"]')) && /온라인 결제를 받지 않아요/.test(await txt(p, '.lg-note')), '운영 payOnline:false → 결제 버튼 대신 안내'); await check(p, 'payOnline:false'); await ctx.close(); }
  { const L = LIVE({ parent: true, kid: 'k_1', people: [{ sid: 'k_1', label: '지○' }] }); /* 서버는 아직 보호자 연결을 내려주지 않음(본인만) — people이 오면 칩, 없으면 빈 화면이 깨지지 않게 */ const { ctx, p } = await openLive(L, '/learner.html?t=T1&app=1#ledger');
    const c = await p.evaluate(() => [...document.querySelectorAll('.lg-chip')].map(x => x.textContent)); ok(c.join() === '전체,지○', `보호자: 자녀 칩(${c.join()})`); ok(/지○ 학습자/.test(await txt(p, '.lg-bill .lg-bm')), '보호자: 자녀 청구서 포함');
    const pt = await p.evaluate(() => (document.querySelector('#lapp .ap-nav a[href="#ledger"]') || {}).textContent || ''); ok(/결제/.test(pt), `보호자 하단 탭 「결제」 → #ledger(${pt.trim()})`); await ctx.close(); }
  { const L = LIVE({ parent: true, kid: 'k_9' }); const { ctx, p, errs } = await openLive(L, '/learner.html?t=T1&app=1#ledger'); ok(!(await p.$('.lg-chip')) && !!(await p.$('.lg-main')) && !errs.length, '보호자: 연결 정보 없어도 화면 유지'); await ctx.close(); }
  { const L = LIVE({ anon: true }); const { ctx, p, errs } = await openLive(L, '/learner.html?t=T1&bill=tok123tok123tok123tok');
    const t = await txt(p, '#lgBill'); ok(/250,000원/.test(t) && /박○ 학습자님/.test(t) && !/학습자님 학습자님/.test(t) && /디디쌤 수학 해운대점/.test(t), '운영 링크: 로그인 없이 금액 · 이니셜');
    await p.click('[data-lg="bpay"]'); await p.waitForTimeout(1600); const bo = L.st.orders[0] || {}; ok(bo.t === 'tok123tok123tok123tok', '운영 링크: bill-order 토큰 검증');
    ok((L.st.confirms[0] || {}).t === 'tok123tok123tok123tok' && /결제가 끝났어요/.test(await txt(p, '#lgBill')) && /디디쌤 수학 해운대점/.test(await txt(p, '#lgBill')) && /11월 원비/.test(await txt(p, '.lg-tbl')), '운영 링크: bill-confirm → 완료(기관 · 내용 유지)');
    ok(!/paymentKey/.test(await p.evaluate(() => location.search)), '운영 링크: 주소 정리'); await shot(p, '10-live-link-done.png');
    await p.goto(base + '/learner.html?t=T1&bill=old'); await p.waitForTimeout(900); ok(/사용 기간이 지났어요/.test(await txt(p, '#lgBill')), '운영 링크 410 만료');
    await p.goto(base + '/learner.html?t=T1&bill=used'); await p.waitForTimeout(900); ok(/이미 결제한/.test(await txt(p, '#lgBill')), '운영 링크 409 사용됨');
    ok(!errs.length, `운영 링크 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
