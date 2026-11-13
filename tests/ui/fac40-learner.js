'use strict';
/* v40 시설 · 장비 예약 — 이용자 앱(390) · 웹(1280 · 390) 흐름 점검(lfac.js)
   찾기 → 칸 선택 → 구분 · 요금 → 현장 결제 예약 → 완료 → 내 예약 → 당일 QR → 중복 예약 차단 안내 → 취소 · 환불 예상
   + 앱 위치(홈 칩 「예약」 · 오늘 예약 카드 · 일정 탭 내 예약 · 하단 탭 4칸 유지) · 이용권 구매 · 대학 학번 · 학과만 · 선택 수집 목적/보관 기간
   + 가로 넘침 0 · 누르는 곳 44px · 글자 12px 이상 · pageerror 0
   사용: node tests/ui/fac40-learner.js  (SHOTS=<폴더> 이면 앱 390 화면 6장 저장) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const NOW = today + 'T03:50:00Z'; /* KST 12:50 — 13:00 칸은 15분 전 QR 활성 */
const H = ['07:00', '22:00']; const HRS = { 0: H, 1: H, 2: H, 3: H, 4: H, 5: H, 6: H };
const court = (id, name) => ({ id, name, kind: 'time', place: '야외 하드코트', hours: HRS, closed: [], slotMin: 60, maxSlots: 2, maxPeople: 4, capacity: { res: 1, perSlot: 1 }, open: { daysAhead: 7, at: '09:00' }, approval: false, pay: 'online', audience: ['student', 'staff', 'public'], verify: 'sid',
  prices: { student: { slot: 4000 }, staff: { slot: 5000 }, public: { slot: 8000 } }, rules: { dupSame: true, exclGroup: 'tennis', noShowMin: 15 }, refund: { type: 'time', steps: [{ beforeH: 24, rate: 100 }, { beforeH: 3, rate: 50 }, { rate: 0 }] },
  extra: [{ key: 'car', label: '차량번호', purpose: '방문 차량 출입 등록', keepDays: 30, required: false }], note: '비 오면 운영 취소 · 전액 환불' });
const FAC = { on: true, payOnline: false, facilities: [court('f_ta', '테니스 코트 A'), court('f_tb', '테니스 코트 B'),
  { id: 'f_golf', name: '골프 타석', kind: 'time', place: '골프연습동 2층', hours: HRS, slotMin: 60, maxSlots: 1, capacity: { res: 12, perSlot: 1 }, open: { daysAhead: 7, at: '09:00' }, pay: 'onsite', audience: ['student', 'staff', 'public'], prices: { student: { slot: 3000 }, staff: { slot: 4000 }, public: { slot: 6000 } }, rules: { noShowMin: 15 } },
  { id: 'f_room', name: '공학관 302 세미나실', kind: 'time', place: '공학관 3층', hours: HRS, slotMin: 60, maxSlots: 3, capacity: { res: 1, perSlot: 24 }, open: { daysAhead: 14, at: '09:00' }, approval: true, pay: 'free', audience: ['student', 'staff'], prices: { student: { slot: 0 }, staff: { slot: 0 } } },
  { id: 'f_lock', name: '사물함 2층', kind: 'rent', place: '스포츠센터 2층', capacity: { res: 20 }, pay: 'onsite', audience: ['student', 'public'] }],
  products: [{ id: 'p_m1', fac: 'f_golf', type: 'pass-period', name: '골프 월이용권 1개월', days: 30, prices: { student: 120000, staff: 140000, public: 150000 }, refund: { type: 'pass-period', unitPrice: { student: 12000, public: 12000 }, feeRate: 10 } },
    { id: 'p_d5', fac: 'f_golf', type: 'pass-count', name: '골프 일일권 5매', count: 5, expireDays: 365, prices: { student: 40000, staff: 45000, public: 50000 } },
    { id: 'p_lk', fac: 'f_lock', type: 'rent', per: 'month', name: '사물함 1개월', prices: { student: 3000, public: 5000 }, deposit: 10000, lateFeePerDay: 1000 }] };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const SH = process.env.SHOTS || ''; if (SH) fs.mkdirSync(SH, { recursive: true });
  const open = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: 844 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/learner-demo-adult\.json/, r => { const j = JSON.parse(fs.readFileSync(ROOT + '/learner-demo-adult.json', 'utf8')); j.org.type = 'univ'; j.org.name = '창원대 스포츠진흥원(가상)'; delete j.org.ed; if (!o.nofac) j.fac = o.fac || FAC; r.fulfill({ contentType: 'application/json', body: JSON.stringify(j) }); });
    await p.addInitScript(([now, web]) => { window.__facNow = now; try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '체육학과', id: '20269000' })); localStorage.setItem('didisam.app.instx', '1'); if (web) localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } }, [NOW, !!o.web]);
    await p.goto(`${base}/learner.html?demo=adult${o.web ? '' : '&app=1'}#home`, { waitUntil: 'load' }); await p.waitForTimeout(800); return { ctx, p, errs }; };
  const go = async (p, h, ms = 350) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(ms); };
  const over = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const a11y = p => p.evaluate(() => { const bad = []; document.querySelectorAll('.fx a, .fx button, .fx label.fx-ck, .fx .fx-seg label, .fx-today a, a.fx-chip-go, .fx-calc').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden') return; if (e.closest('.fx-empty,.fx-hint,.fx-kv')) return; if (r.height < 44) bad.push('h ' + (e.className || e.tagName) + ' ' + Math.round(r.height) + ' ' + e.textContent.trim().slice(0, 12)); });
    document.querySelectorAll('.fx *, .fx-today *, .fx-calc *').forEach(e => { if (!e.childNodes.length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return; const fs = parseFloat(getComputedStyle(e).fontSize); const r = e.getBoundingClientRect(); if (r.width && fs < 12) bad.push('f ' + e.tagName + ' ' + fs + ' ' + e.textContent.trim().slice(0, 10)); }); return bad.slice(0, 6); });
  const shot = async (p, n, top) => { if (SH) await p.evaluate(t => { document.querySelectorAll('.ltoast').forEach(x => x.remove()); if (t) scrollTo(0, 0); }, !!top); if (SH) await p.screenshot({ path: path.join(SH, n) }); };
  const txt = (p, s) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', s);
  const pickSlot = async (p, hm) => { const b = await p.$(`.fx-slot:has(b:text-is("${hm}"))`); if (!b) return false; await b.click(); await p.waitForTimeout(250); return true; };

  /* 공통 흐름 */
  async function flow(tag, o) { const { ctx, p, errs } = await open(o); const app = !o.web;
    if (app) { const r = await p.evaluate(() => ({ chip: !!document.querySelector('.tb-chips a.fx-chip-go[href="#fac"]'), tabs: [...document.querySelectorAll('#lapp .ap-nav > a')].map(a => a.textContent.trim()), card: !!document.querySelector('.fx-today') }));
      ok(r.chip, `${tag} 홈 칩 「예약」`); ok(r.tabs.length === 4 && r.tabs[1] === '일정', `${tag} 하단 탭 4칸 유지(${r.tabs.join('·')})`); ok(!r.card, `${tag} 예약 없으면 오늘 예약 카드 없음`);
      await p.click('a.fx-chip-go'); await p.waitForTimeout(400); }
    else { ok(await p.evaluate(() => !!document.querySelector('header.lh nav.ln a[href="#fac"]')), `${tag} 웹 머리 메뉴 「시설 예약」`); await go(p, '#fac'); }
    const h = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.fx-home .fx-row b')].map(x => x.textContent), chips: [...document.querySelectorAll('.fx-home .fx-chip')].map(x => x.textContent), tag: (document.querySelector('.fx-row[href="#fac/f_room"] .fx-b') || {}).textContent }));
    ok(h.rows.length === 5 && h.chips.includes('테니스') && h.chips.includes('이용권'), `${tag} 예약 홈: 시설 5 · 칩(${h.chips.join('·')})`); ok(h.tag === '승인제', `${tag} 승인제 표시`);
    await p.click('.fx-chip[data-v="테니스"]'); await p.waitForTimeout(200); ok((await p.$$('.fx-home .fx-row')).length === 2, `${tag} 칩 거르기(테니스 2)`);
    if (app) await shot(p, '01-home.png');
    await p.click('.fx-row[href="#fac/f_ta"]'); await p.waitForTimeout(400);
    ok(await pickSlot(p, '13:00') && await pickSlot(p, '14:00'), `${tag} 연속 칸 2개 선택`);
    const sel = await p.evaluate(() => ({ n: document.querySelectorAll('.fx-slot.sel').length, bar: (document.querySelector('.fx-bs') || {}).textContent || '', past: document.querySelectorAll('.fx-slot.past').length }));
    ok(sel.n === 2 && /8,000원/.test(sel.bar) && /학생/.test(sel.bar), `${tag} 선택 줄: 2시간 · 학생 8,000원 (${sel.bar.trim()})`); ok(sel.past >= 5, `${tag} 지난 칸 표시`);
    await pickSlot(p, '15:00'); ok(/최대 2칸/.test(await txt(p, '#fxMsg')) || (await p.$$('.fx-slot.sel')).length <= 2, `${tag} 하루 최대 칸 안내`);
    await pickSlot(p, '15:00'); if ((await p.$$('.fx-slot.sel')).length !== 2) { await pickSlot(p, '13:00'); await pickSlot(p, '14:00'); }
    if (app) await shot(p, '02-detail.png');
    await p.click('[data-fx="next"]'); await p.waitForTimeout(400); if (process.env.DBG) console.log(await p.evaluate(() => location.hash + ' ' + document.getElementById('lm').textContent.slice(0, 300)));
    const pay = await p.evaluate(() => ({ aud: [...document.querySelectorAll('.fx-seg label')].map(x => x.textContent.trim()), sid: (document.querySelector('#fxPay [name=sid]') || {}).value, hint: document.querySelector('#fxPay .fx-hint').textContent, meth: [...document.querySelectorAll('.fx-rad b')].map(x => x.textContent), name: !!document.querySelector('#fxPay [name=name], #fxPay [name=phone]'), car: (document.querySelector('.fx-opt') || {}).textContent || '' }));
    ok(pay.aud.join() === '학생,교직원,일반' && pay.sid === '20269000', `${tag} 구분 3종 · 학번 자동 채움`); ok(/학번 · 학과만/.test(pay.hint) && /승인/.test(pay.hint) && !pay.name, `${tag} 대학: 학번 · 학과만 · 운영자 승인 안내 · 이름/연락처 없음`);
    ok(pay.meth.join() === '현장 결제', `${tag} 온라인 결제 꺼짐 → 현장 결제만(${pay.meth.join()})`); ok(/방문 차량 출입 등록/.test(pay.car) && /30일/.test(pay.car), `${tag} 차량번호 선택 · 목적 · 보유 기간 표시`);
    await p.click('.fx-seg label:nth-child(3)'); await p.waitForTimeout(250); ok(/16,000원/.test(await txt(p, '.fx-tot')), `${tag} 일반 선택 → 16,000원`);
    await p.click('.fx-seg label:nth-child(1)'); await p.waitForTimeout(250); ok(/8,000원/.test(await txt(p, '.fx-tot')), `${tag} 학생 → 8,000원`);
    await p.fill('#fxPay [name=dept]', '체육학과'); await p.click('#fxPay button[type=submit]'); await p.waitForTimeout(250); ok(/체크/.test(await txt(p, '#fxErr')), `${tag} 동의 없으면 막힘`);
    await p.check('#fxPay [name=carOn]'); await p.waitForTimeout(250); await p.fill('#fxPay [name=car]', '12가 3456'); await p.click('#fxPay [name=agree]'); await p.click('#fxPay button[type=submit]'); await p.waitForTimeout(250);
    ok(/동의/.test(await txt(p, '#fxErr')), `${tag} 차량번호는 동의해야 저장`); await p.check('#fxPay [name=consent]'); await p.waitForTimeout(200);
    if (!(await p.isChecked('#fxPay [name=agree]'))) await p.check('#fxPay [name=agree]');
    if (app) await shot(p, '03-pay.png');
    await p.click('#fxPay button[type=submit]'); await p.waitForTimeout(500);
    const dn = await p.evaluate(() => ({ h: location.hash, t: (document.querySelector('.fx-ok h2') || {}).textContent, kv: (document.querySelector('.fx-kv') || {}).textContent || '' }));
    ok(/^#fac\/done\//.test(dn.h) && dn.t === '예약했어요' && /현장 결제/.test(dn.kv) && /F-\d{4}-\d{4}/.test(dn.kv), `${tag} 완료: 예약 번호 · 현장 결제`);
    const id = decodeURIComponent(dn.h.split('/')[2]); if (app) await shot(p, '04-done.png', 1);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 3000 }).catch(() => null), p.click('[data-fx="ics"]')]); let icsOK = false; if (dl) { const f = await dl.path(); icsOK = /DTSTART:\d{8}T040000Z/.test(fs.readFileSync(f, 'utf8')); } ok(icsOK, `${tag} 캘린더에 추가(.ics, 13:00 KST)`);
    await go(p, '#fac/my', 400); const my = await p.evaluate(() => ({ row: (document.querySelector('.fx-my .fx-row') || {}).textContent || '', tab: (document.querySelector('#lapp .ap-nav a.on') || {}).textContent || '' }));
    ok(/테니스 코트 A/.test(my.row) && /현장 결제/.test(my.row), `${tag} 내 예약 목록`); if (app) ok(my.tab.trim() === '일정', `${tag} 내 예약은 일정 탭(${my.tab.trim()})`);
    if (app) { await shot(p, '06-mine.png', 1); await go(p, '#home', 500); ok(!!(await p.$('.tb-main > .fx-today a[href^="#fac/qr/"]')), `${tag} 홈 맨 위 오늘 예약 QR 카드`); }
    await go(p, '#cal', 500); const cal = await p.evaluate(() => ({ card: (document.querySelector('.fx-calc') || {}).textContent || '', ev: (window.lcalEvents ? lcalEvents() : []).filter(e => e.src === 'fac').length }));
    ok(/예정 1건/.test(cal.card) && cal.ev === 1, `${tag} 일정 탭: 내 예약 카드 · 캘린더 일정`);
    await go(p, '#fac/qr/' + encodeURIComponent(id), 900); const qr = await p.evaluate(() => ({ svg: !!document.querySelector('#fxQr svg path'), t: (document.querySelector('#fxQt') || {}).textContent || '', left: (document.querySelector('#fxLeft') || {}).textContent || '' }));
    ok(qr.svg && /뒤 새 코드/.test(qr.t) && /남은 시간/.test(qr.left), `${tag} 당일 QR(15분 전 활성 · 코드 갱신 · 남은 시간)`);
    if (app) await shot(p, '05-qr.png', 1);
    await go(p, '#fac/f_tb', 400); await pickSlot(p, '13:00'); ok(/같은 시간에 예약이 있어요/.test(await txt(p, '#fxMsg')), `${tag} 중복 예약 차단 안내(코트 B 같은 시간)`);
    await p.evaluate(() => { FAC_UI.sel = { fac: 'f_tb', day: Object.values(FAC_UI.day)[0], s0: 6, n: 1 }; }); await go(p, '#fac/f_tb/pay', 300); await p.check('#fxPay [name=agree]'); await p.fill('#fxPay [name=dept]', '체육학과'); await p.click('#fxPay button[type=submit]'); await p.waitForTimeout(300);
    ok(/같은 시간에 예약이 있어요/.test(await txt(p, '#fxErr')), `${tag} 우회 신청도 막힘`);
    await go(p, '#fac/bk/' + encodeURIComponent(id), 400); await p.click('[data-fx="cx"]'); await p.waitForTimeout(300);
    const cx = await txt(p, '.fx-cx'); ok(/환불 예상액/.test(cx) && /현장 결제/.test(cx) && /50%|0%|환불 없음|%/.test(cx), `${tag} 취소 · 환불 예상 계산 줄`);
    await p.click('[data-fx="cx-go"]'); await p.waitForTimeout(400); ok(/취소됨/.test(await txt(p, '.fx-sum')), `${tag} 취소 완료`);
    /* 이용권 구매 → 환불 예상 */
    await go(p, '#fac/f_golf/buy/p_m1', 400); ok(/120,000원/.test(await txt(p, '.fx-tot')), `${tag} 월이용권 학생 120,000원`); await p.fill('#fxPay [name=dept]', '체육학과'); await p.check('#fxPay [name=agree]'); await p.click('#fxPay button[type=submit]'); await p.waitForTimeout(400);
    ok(/이용권을 신청했어요/.test(await txt(p, '.fx-ok h2')), `${tag} 이용권 신청 완료(현장 결제 대기)`);
    const pid = decodeURIComponent((await p.evaluate(() => location.hash)).split('/')[2]); await p.evaluate(pid => { const k = Object.keys(localStorage).find(x => x.startsWith('didisam.fac.')); const v = JSON.parse(localStorage.getItem(k)); const x = v.ps.find(z => z.id === pid); x.status = 'active'; x.payStatus = 'paid'; x.used = 3; localStorage.setItem(k, JSON.stringify(v)); FAC_UI.st = null; }, pid); /* 프론트 결제 · 3회 입장 가정 */
    await go(p, '#fac/ps/' + encodeURIComponent(pid), 400); await p.click('[data-fx="cx"]'); await p.waitForTimeout(300); const pr = await txt(p, '.fx-cx');
    ok(/60,000원/.test(pr) && /12,000원 × 5회/.test(pr) && /수수료 10%/.test(pr) && /48,000원/.test(pr), `${tag} 월이용권 환불 예상(120,000 − 12,000×5 − 12,000 = 48,000)`);
    await p.selectOption('#fxWhy', { index: 1 }); await p.click('[data-fx="cx-go"]'); await p.waitForTimeout(400); ok(/운영자 확인 후 환불돼요/.test(await txt(p, '.fx-it')) && !(await p.$('[data-fx="cx"]')), `${tag} 이용권 환불 신청 → 운영자 확인 대기 상태`);
    await go(p, '#fac/f_lock/buy/p_lk', 400); await p.check('#fxPay [name=agree]'); await p.fill('#fxPay [name=dept]', '체육학과'); await p.click('#fxPay button[type=submit]'); await p.waitForTimeout(400);
    const rid = decodeURIComponent((await p.evaluate(() => location.hash)).split('/')[2]); await go(p, '#fac/rt/' + encodeURIComponent(rid), 400); const rb = await txt(p, '[data-fx="cx"]'); await p.click('[data-fx="cx"]'); await p.waitForTimeout(300);
    const rc = await txt(p, '.fx-cx'); await p.click('[data-fx="cx-go"]'); await p.waitForTimeout(300); ok(/대여 취소/.test(rb) && /환불/.test(rc) && (await p.evaluate(id => { const k = Object.keys(localStorage).find(x => x.startsWith('didisam.fac.')); return JSON.parse(localStorage.getItem(k)).rt.find(z => z.id === id).status; }, rid)) === 'cancelled', `${tag} 대여 취소(수령 전)`);
    for (const r of ['#fac', '#fac/f_ta', '#fac/f_ta/pay', '#fac/my', '#fac/qr/' + pid, '#fac/f_lock', '#fac/f_golf/buy/p_lk', '#cal']) { await go(p, r, 300); const v = await over(p); if (v > 0) ok(false, `${tag} 가로 넘침 ${r} ${v}px`); }
    ok(true, `${tag} 가로 넘침 점검 8화면`);
    await go(p, '#fac/f_ta', 300); const bad = (await a11y(p)).concat(await (async () => { await go(p, '#fac/my', 300); return a11y(p); })()); ok(!bad.length, `${tag} 44px · 12px ${bad.join(' | ')}`);
    ok(!errs.length, `${tag} pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  await flow('앱390', {}); await flow('웹1280', { web: 1, w: 1280 }); await flow('웹390', { web: 1, w: 390 });
  /* 온라인 결제(payOnline:true): 학습자 결제창 흐름 재사용 — 승인 → 결제 완료, 실패 → 결제 대기 + 다시 결제 */
  { const { ctx, p, errs } = await open({ fac: { ...FAC, payOnline: true } }); await go(p, '#fac/f_ta', 400); await pickSlot(p, '16:00'); await p.click('[data-fx="next"]'); await p.waitForTimeout(400);
    const M = await p.evaluate(() => [...document.querySelectorAll('.fx-rad b')].map(x => x.textContent)); ok(M.join() === '온라인 결제,현장 결제' && /4,000원 결제하기/.test(await txt(p, '#fxPay button[type=submit]')), `온라인 결제 켜짐: 방법 2종(${M.join()})`);
    await p.fill('#fxPay [name=dept]', '체육학과'); await p.check('#fxPay [name=agree]'); await p.click('#fxPay button[type=submit]'); await p.waitForTimeout(600);
    ok(!!(await p.$('#shpModal')), '결제창(기존 학습자 결제 흐름) 열림'); await p.click('#shpModal button:has-text("결제 승인")'); await p.waitForTimeout(400); ok(/결제 완료/.test(await txt(p, '.fx-kv')), '승인 → 결제 완료 · 확정');
    await go(p, '#fac/f_ta', 400); await pickSlot(p, '18:00'); await p.click('[data-fx="next"]'); await p.waitForTimeout(300); await p.fill('#fxPay [name=dept]', '체육학과'); await p.check('#fxPay [name=agree]'); await p.click('#fxPay button[type=submit]'); await p.waitForTimeout(600);
    await p.click('#shpModal button:has-text("결제 실패 테스트")'); await p.waitForTimeout(400); const mm = await p.$('#shpModal button'); if (mm) await p.evaluate(() => { const m = document.getElementById('shpModal'); m && m.remove(); });
    const bid = decodeURIComponent((await p.evaluate(() => location.hash)).split('/')[2]); ok(/결제 대기/.test(await txt(p, '.fx-kv')), '실패 → 결제 대기');
    await go(p, '#fac/bk/' + encodeURIComponent(bid), 400); ok(/결제 대기/.test(await txt(p, '.fx-sum')) && !!(await p.$('[data-fx="pay"]')), '결제 대기 예약에 「결제하기」');
    await p.click('[data-fx="pay"]'); await p.waitForTimeout(400); await p.click('#shpModal button:has-text("결제 승인")'); await p.waitForTimeout(400); ok(/결제 완료/.test(await txt(p, '.fx-kv')) && !(await p.$('[data-fx="pay"]')), '다시 결제 → 결제 완료');
    ok(!errs.length, `온라인 결제 pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }
  /* 모듈이 꺼진 기관: 칩 · 메뉴 없음 */
  { const { ctx, p, errs } = await open({ nofac: 1 }); ok(!(await p.$('a.fx-chip-go')) && !(await p.$('.fx-today')), '시설 예약 꺼짐: 홈 칩 없음'); await go(p, '#fac'); ok(/쓰지 않아요/.test(await txt(p, '#lm')), '꺼짐: #fac 안내'); ok(!errs.length, '꺼짐 pageerror 0'); await ctx.close(); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
