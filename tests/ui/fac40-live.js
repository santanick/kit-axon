'use strict';
/* v40 시설 · 장비 — 운영 모드 전 구간(실제 Node 서버 + PostgreSQL + 브라우저)
   스튜디오(운영 모드): 등록 → 게시 → [이용자 공개 API 예약 1건] → 예약 현황 → 승인 → 현장 결제 → 체크인 → 환불(수정 사유) → 정산 통계 · 이용권 목록
   사용: NODE_PATH=$(npm root -g):<server node_modules> FAC_DB=postgres://... node tests/ui/fac40-live.js
   BASE를 주면 이미 떠 있는 서버를 쓰고, 없으면 공개 폴더를 만들고 서버를 띄운 뒤 끝에 종료한다. */
const path = require('node:path'); const { spawn, execFileSync } = require('node:child_process'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const PORT = process.env.FAC_PORT || '9631';
let B = process.env.BASE || ''; let srv = null;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const wait = ms => new Promise(k => setTimeout(k, ms));
(async () => {
  if (!B) {
    execFileSync(process.execPath, ['service/build-public.js', 'didisam', 'service/public'], { cwd: ROOT, stdio: 'ignore' });
    const env = { ...process.env, DATABASE_URL: process.env.FAC_DB || 'postgres://didisam@127.0.0.1:5544/fac40s', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SIGNUP_CODE: 'C0DE', PII_DEV_OTP: '1', SESSION_PEPPER: 'ci-only', PORT, PII_KEY: '0'.repeat(64) };
    srv = spawn(process.execPath, ['server/index.js'], { cwd: path.join(ROOT, 'service'), env, stdio: ['ignore', 'ignore', 'pipe'] }); let elog = ''; srv.stderr.on('data', d => { elog += d; });
    B = `http://127.0.0.1:${PORT}`; let up = false; for (let i = 0; i < 60 && !up; i++) { await wait(500); try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } }
    if (!up) { console.error('서버가 뜨지 않았습니다', elog.slice(-800)); process.exit(1); }
  }
  const br = await chromium.launch(); const errs = []; const H = { 'x-didisam': '1', origin: B };
  const admin = await br.newContext({ timezoneId: 'Asia/Seoul', viewport: { width: 1440, height: 900 } });
  const su = await admin.request.post(B + '/api/signup', { headers: H, data: { email: `fac${Date.now()}@example.com`, password: 'Contract2026x', orgName: '라이브 스포츠센터', type: 'public', code: 'C0DE' } });
  ok(su.status() === 200, '가입 ' + su.status()); const tid = (await su.json()).tenant.tid;
  const p = await admin.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await p.goto(B + '/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant, null, { timeout: 15000 });
  const saved = () => p.waitForFunction(() => !LIVE.dirty && !LIVE.saving, null, { timeout: 15000 });

  /* ① 등록(화면) → 설정 → 게시 */
  await p.evaluate(() => { if (!S || !S.org) createOrg('public', '라이브 스포츠센터'); S.me.role = 'owner'; go('fac'); UI.fac = 'list'; render(); });
  await p.click('[data-act="fac-new"]'); await p.fill('#modal [name="n"]', '라이브 코트'); await p.click('#modal [data-mact="ok"]');
  const FID = await p.evaluate(() => { const f = S.fac.facilities.find(x => x.name === '라이브 코트'); const all = ['00:00', '24:00']; for (let d = 0; d < 7; d++) f.hours[d] = [...all]; f.slotMin = 15; f.maxSlots = 4; f.audience = ['public']; f.prices = { public: { slot: 5000 } }; f.pay = 'onsite'; f.approval = true; f.verify = 'none'; f.rules.noShowMin = 15;
    S.codes = [{ sid: 'T0001', dept: '', code: 'ABC234' }]; S.members = S.members || []; S.members.push({ id: 'm_lv', sid: 'T0001', name: 'T0001', group: '', grade: '정회원', joined: today(), last: today(), extra: {} }); save(); render(); return f.id; });
  await p.click('[data-act="fac-pub"]'); await saved();
  const L0 = await admin.request.get(`${B}/api/pub/${tid}/fac-list`); const fl = await L0.json().catch(() => ({}));
  ok(L0.status() === 200 && (fl.facilities || []).some(f => f.id === FID), '게시 → 공개 목록 ' + L0.status() + ' ' + JSON.stringify(fl).slice(0, 160));

  /* ② 이용자: 로그인 → 빈 칸 조회 → 예약 1건(승인제 → 대기) */
  const lc = await br.newContext({ timezoneId: 'Asia/Seoul' }); const lp = await lc.newPage(); lp.on('pageerror', e => errs.push('L ' + e.message)); await lp.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await lp.goto(`${B}/learner.html?t=${tid}`, { waitUntil: 'load' }); await lp.waitForTimeout(400);
  const BK = await lp.evaluate(async ({ tid, fid }) => { await LR.api.login('T0001', 'ABC234'); const r = { me: !!LR.me }; const j = (m, u, b) => fetch(u, { method: m, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}) }, body: b ? JSON.stringify(b) : undefined }).then(async x => ({ s: x.status, j: await x.json().catch(() => ({})) }));
    const now = new Date(Date.now() + 9 * 3600e3); const day = now.toISOString().slice(0, 10); const nm = now.getUTCHours() * 60 + now.getUTCMinutes();
    const av = await j('GET', `/api/pub/${tid}/fac-avail?fac=${fid}&day=${day}`); r.av = av.s; const sl = (av.j.slots || []).find(x => { const [h, m] = x.from.split(':').map(Number); return h * 60 + m > nm && h * 60 + m <= nm + 20 && x.left > 0; });
    if (!sl) { r.noSlot = true; return r; } r.slot = sl.slot; r.from = sl.from; r.day = day;
    const bk = await j('POST', `/api/pub/${tid}/fac-book`, { fac: fid, day, slot: sl.slot, slots: 1, aud: 'public', idem: crypto.randomUUID() }); r.book = bk.s; r.b = bk.j.booking; r.next = bk.j.next;
    const dup = await j('POST', `/api/pub/${tid}/fac-book`, { fac: fid, day, slot: sl.slot, slots: 1, aud: 'public', idem: crypto.randomUUID() }); r.dup = dup.s + ' ' + (dup.j.error || ''); return r; }, { tid, fid: FID });
  ok(BK.me && BK.av === 200 && BK.book === 200 && BK.b && BK.b.status === 'requested' && BK.next === 'wait', '이용자 예약(승인 대기) ' + JSON.stringify(BK));
  ok(/^409/.test(BK.dup), '같은 칸 다시 예약 → 409 ' + BK.dup);
  const id = BK.b && BK.b.id;

  /* ③ 예약 현황(운영 서버) → 승인 */
  await p.evaluate(() => { UI.fac = 'tl'; UI.facDay = facCalc.kstDay(Date.now()); render(); });
  await p.waitForSelector(`[data-act="fac-bk"][data-v="${id}"]`, { timeout: 10000 }).catch(() => null);
  const T = await p.evaluate(id => { const b = document.querySelector(`[data-act="fac-bk"][data-v="${id}"]`); return { blk: b && b.textContent, err: (document.querySelector('.fc-err') || {}).textContent || '' }; }, id);
  ok(T.blk && /대기/.test(T.blk) && !T.err, '타임라인에 서버 예약 · 대기 표시 ' + JSON.stringify(T));
  await p.click(`.fc-side [data-act="fac-approve"][data-v="${id}"]`);
  await wait(800);
  const D1 = await (await admin.request.get(`${B}/api/fac/bookings/${id}`)).json(); ok(D1.booking && D1.booking.status === 'confirmed' && D1.booking.payStatus === 'pending', '승인 → 확정 · 현장 결제 대기 ' + JSON.stringify(D1.booking && { s: D1.booking.status, p: D1.booking.payStatus }));

  /* ④ 현장 결제 기록(화면) → 체크인(코드 입력) */
  await p.evaluate(() => { UI.fac = 'pay'; render(); }); await p.waitForSelector(`[data-act="fac-paybk"][data-v="${id}"]`, { timeout: 10000 });
  await p.click(`[data-act="fac-paybk"][data-v="${id}"]`); const amt = await p.inputValue('#modal [name="a"]'); await p.fill('#modal [name="r"]', 'R-001'); await p.click('#modal [data-mact="ok"]'); await wait(800);
  const D2 = await (await admin.request.get(`${B}/api/fac/bookings/${id}`)).json(); const pay = (D2.payments || []).find(x => x.status === 'paid');
  ok(amt === '5000' && D2.booking.payStatus === 'paid' && pay && pay.amount === 5000, '현장 결제 기록 ' + amt + ' ' + JSON.stringify(D2.payments));
  await p.evaluate(() => { UI.fac = 'chk'; render(); }); await p.fill('#fcCode', id); await p.click('[data-act="fac-code"]'); await p.waitForSelector('.fc-res', { timeout: 10000 });
  const ck = await p.textContent('.fc-res'); const D3 = await (await admin.request.get(`${B}/api/fac/bookings/${id}`)).json();
  ok(/입장 처리/.test(ck) && D3.booking.status === 'checked_in' && (D3.checkins || []).length === 1, '체크인 ' + ck + ' ' + D3.booking.status);
  await p.fill('#fcCode', id); await p.click('[data-act="fac-code"]'); await wait(800); ok(/이미|used|입장/.test(await p.textContent('.fc-res')) && !/입장 처리했습니다/.test(await p.textContent('.fc-res')), '같은 예약 재입장 거절 ' + await p.textContent('.fc-res'));

  /* ⑤ 환불: 미리보기(공식 자동 계산) → 금액 수정은 사유 필수 → 확정 */
  await p.evaluate(() => { UI.fac = 'ref'; render(); }); await p.waitForSelector(`[data-act="fac-ref-live"][data-v="${id}"]`, { timeout: 10000 });
  await p.click(`[data-act="fac-ref-live"][data-v="${id}"]`); await p.waitForSelector('#modal .fc-calc', { timeout: 10000 }); const calc = await p.textContent('#modal .fc-calc');
  await p.fill('#modal [name="a"]', '5000'); await p.click('#modal [data-mact="ok"]'); const blocked = await p.evaluate(() => !!document.querySelector('#modal .fc-calc'));
  await p.fill('#modal [name="why"]', '시설 사정으로 전액 환불'); await p.click('#modal [data-mact="ok"]'); await wait(1000);
  const D4 = await (await admin.request.get(`${B}/api/fac/bookings/${id}`)).json(); const rf = (D4.refunds || [])[0];
  ok(/자동 계산 0원/.test(calc) && blocked && rf && rf.amount === 5000 && rf.auto === 0 && rf.editReason && D4.booking.payStatus === 'refunded', '환불 미리보기 · 사유 · 확정 ' + calc.replace(/\s+/g, ' ') + ' ' + JSON.stringify(rf));

  /* ⑥ 정산 · 통계(/api/fac/stats) · 이용권 목록(/api/fac/passes) */
  await p.evaluate(() => { UI.fac = 'stat'; UI.facFrom = ''; UI.facTo = ''; render(); }); await p.waitForFunction(() => /시설별 이용/.test(document.querySelector('#main').innerText), null, { timeout: 10000 }).catch(() => null);
  const ST = await p.evaluate(() => document.querySelector('#main').innerText);
  ok(/총 매출/.test(ST) && /현장 결제 5,000원/.test(ST) && /라이브 코트/.test(ST) && /−5,000원/.test(ST), '정산 통계(운영) ' + ST.slice(ST.indexOf('총 매출'), ST.indexOf('총 매출') + 160).replace(/\s+/g, ' '));
  const PS = await admin.request.get(`${B}/api/fac/passes`); await p.evaluate(() => { UI.fac = 'pay'; render(); }); await wait(600); const PT = await p.evaluate(() => document.querySelector('#main').innerText);
  ok(PS.status() === 200 && /결제 전 이용권/.test(PT) && /이용권 0건|이용권이 없습니다/.test(PT), '이용권 목록 연결 ' + PS.status());
  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await br.close(); if (srv) srv.kill(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); if (srv) srv.kill(); process.exit(1); });
