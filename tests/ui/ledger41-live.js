'use strict';
/* v41 통합 수납 원장 — 스튜디오 운영 모드 전 구간(실제 Node 서버 + PostgreSQL + 브라우저)
   단위 생성 → 청구 → 현장 수납 → 부분 환불(규정 계산 → 확인 카드 → 확정) → 마감 → 쉐어 탭 · 카드 4 = 서버 summary
   사용: NODE_PATH=$(npm root -g):<service/server/node_modules> LEDGER_DB=postgres://didisam@127.0.0.1:5544/l41s node tests/ui/ledger41-live.js
   BASE를 주면 이미 떠 있는 서버를 쓰고, 없으면 공개 폴더를 만들고 서버를 띄운 뒤 끝에 종료한다. */
const path = require('node:path'); const { spawn, execFileSync } = require('node:child_process'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const PORT = process.env.LEDGER_PORT || '9632';
let B = process.env.BASE || ''; let srv = null;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const wait = ms => new Promise(k => setTimeout(k, ms));
(async () => {
  if (!B) {
    execFileSync(process.execPath, ['service/build-public.js', 'didisam', 'service/public'], { cwd: ROOT, stdio: 'ignore' });
    const env = { ...process.env, DATABASE_URL: process.env.LEDGER_DB || 'postgres://didisam@127.0.0.1:5544/l41s', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SIGNUP_CODE: 'C0DE', PII_DEV_OTP: '1', SESSION_PEPPER: 'ci-only', PORT, PII_KEY: '0'.repeat(64) };
    srv = spawn(process.execPath, ['server/index.js'], { cwd: path.join(ROOT, 'service'), env, stdio: ['ignore', 'ignore', 'pipe'] }); let elog = ''; srv.stderr.on('data', d => { elog += d; });
    B = `http://127.0.0.1:${PORT}`; let up = false; for (let i = 0; i < 60 && !up; i++) { await wait(500); try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } }
    if (!up) { console.error('서버가 뜨지 않았습니다', elog.slice(-800)); process.exit(1); }
  }
  const br = await chromium.launch(); const errs = []; const H = { 'x-didisam': '1', origin: B };
  const ctx = await br.newContext({ timezoneId: 'Asia/Seoul', viewport: { width: 1440, height: 900 } });
  const su = await ctx.request.post(B + '/api/signup', { headers: H, data: { email: `led${Date.now()}@example.com`, password: 'Contract2026x', orgName: '라이브 수학 본사', type: 'k12', code: 'C0DE' } });
  ok(su.status() === 200, '가입 ' + su.status());
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await p.goto(B + '/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant, null, { timeout: 15000 });
  const saved = () => p.waitForFunction(() => !LIVE.dirty && !LIVE.saving, null, { timeout: 15000 });
  const idle = async () => { await wait(150); await p.waitForFunction(() => document.querySelector('.lg') && !document.querySelector('.lg-err'), null, { timeout: 10000 }).catch(() => { }); await wait(250); };
  const tab = async t => { await p.evaluate(t => { UI.ledger = t; render(); }, t); await idle(); };

  /* ⓪ 켜기: 기관 문서 ledger.on(시연 데이터는 문서에 싣지 않음) */
  await p.evaluate(() => { if (!S || !S.org) createOrg('k12', '라이브 수학 본사'); S.me.role = 'owner'; ledgerEnsure(); S.ledger.on = true; save(); go('ledger'); render(); }); await saved();
  const D0 = await p.evaluate(() => ({ on: S.ledger.on, live: S.ledger.live, rec: S.ledger.receipts.length + S.ledger.charges.length }));
  ok(D0.on && D0.live && D0.rec === 0, '운영 모드 문서: 켜짐 · 시연 기록 없음 ' + JSON.stringify(D0));

  /* ① 설정: 하위 단위 생성(POST units) */
  await tab('set'); await p.click('[data-act="led-u-add"][data-v="lu_root"]'); await p.fill('#modal [name="n"]', '라이브 1호점'); await p.click('#modal [data-mact="ok"]');
  await p.waitForFunction(() => [...document.querySelectorAll('.lg-unit option')].some(o => /라이브 1호점/.test(o.textContent)), null, { timeout: 10000 }).catch(() => { });
  const U1 = await p.evaluate(() => { const o = [...document.querySelectorAll('.lg-unit option')].find(x => /라이브 1호점/.test(x.textContent)); return o && o.value; });
  ok(!!U1, '단위 생성 ' + U1);

  /* ② 청구(POST charges, 할인 줄 포함) */
  await tab('charge'); await p.click('[data-act="led-chg-new"]'); await p.fill('#modal [name="sid"]', '70001'); await p.fill('#modal [name="a0"]', '300000'); await p.fill('#modal [name="n2"]', '형제 할인'); await p.fill('#modal [name="a2"]', '-30000'); await p.click('#modal [data-mact="ok"]');
  await p.waitForFunction(() => /270,000원/.test((document.querySelector('.lg-body') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => { });
  const C1 = await p.evaluate(() => document.querySelector('.lg-body').textContent);
  ok(/학습자 ···0001/.test(C1) && /270,000원/.test(C1), '청구 생성 · 목록(할인 반영 합계) ' + C1.slice(0, 120));

  /* ③ 미납 · 현장 수납(서버 balance) */
  await tab('desk'); await p.fill('.lg-body [data-chg="led-dsid"]', '70001'); await p.press('.lg-body [data-chg="led-dsid"]', 'Enter'); await p.dispatchEvent('.lg-body [data-chg="led-dsid"]', 'change'); await idle();
  const bal = await p.evaluate(() => (document.querySelector('.lg-bal b') || {}).textContent || '');
  ok(bal === '270,000원', '현장 수납: 받을 금액 = 서버 잔액 ' + bal);
  await p.click('[data-act="led-dm"][data-v="cash"]'); await p.fill('.lg-form [name="a"]', '270000'); await p.click('[data-act="led-desk"]');
  await p.waitForFunction(() => !document.querySelector('.lg-bal'), null, { timeout: 10000 }).catch(() => { }); await idle();
  const K1 = await p.evaluate(() => [...document.querySelectorAll('.lg-kpi b')].map(b => b.textContent));
  ok(K1[0] === '270,000원' && K1[1] === '100%' && K1[2] === '0원', '수납 후 카드 4(서버 summary) ' + K1.join(' / '));

  /* ④ 부분 환불: 학원법 2/8회 → 2/3(10원 미만 내림) → 확정 대기 → 확인 카드 → 완료 */
  await tab('refund'); await p.click('[data-act="led-ref-new"]'); await p.selectOption('#modal [name="rule"]', 'hakwon_law'); await p.fill('#modal [name="used"]', '2'); await p.fill('#modal [name="tot"]', '8'); await p.click('#modal [data-mact="ok"]');
  await p.waitForSelector('[data-act="led-ref-ok"]', { timeout: 10000 }).catch(() => { });
  const pend = await p.evaluate(() => { const b = document.querySelector('[data-act="led-ref-ok"]'); return b ? b.closest('tr').textContent : ''; });
  ok(/180,000원/.test(pend), '환불 계산 → 확정 대기(서버 계산 180,000원) ' + pend);
  await p.click('[data-act="led-ref-ok"]'); const card = await p.textContent('#modal .mb'); await p.click('#modal [data-mact="ok"]');
  await p.waitForFunction(() => !document.querySelector('[data-act="led-ref-ok"]'), null, { timeout: 10000 }).catch(() => { }); await idle();
  const K2 = await p.evaluate(() => ({ k: [...document.querySelectorAll('.lg-kpi b')].map(b => b.textContent), body: document.querySelector('.lg-body').textContent }));
  ok(/기록만 남깁니다/.test(card) && K2.k[0] === '90,000원' && K2.k[3] === '180,000원' && /환불 완료/.test(K2.body), '환불 확정(현금은 기록만) · 순매출 90,000원 ' + K2.k.join(' / '));

  /* ⑤ 마감: 시스템 현금 = 수납 − 환불 */
  await tab('close'); const sys = await p.evaluate(() => [...document.querySelectorAll('.lg-close .lg-sys b')].map(b => b.textContent));
  await p.click('.lg-close [data-act="led-close"]'); await p.waitForFunction(() => /마감 완료/.test(document.querySelector('.lg-close').textContent), null, { timeout: 10000 }).catch(() => { });
  const cl = await p.evaluate(() => document.querySelector('.lg-close').textContent);
  ok(sys[0] === '90,000원' && /마감 완료/.test(cl), '일 마감 ' + JSON.stringify(sys));

  /* ⑥ 쉐어 탭: 현금은 대상 아님(0원), 소유자에게만 보임 */
  await tab('share'); const sh = await p.evaluate(() => ({ v: (document.querySelector('.lg-body .lg-kpi b') || {}).textContent, err: !!document.querySelector('.lg-err') }));
  ok(sh.v === '0원' && !sh.err, '쉐어 탭(현금 제외) ' + JSON.stringify(sh));
  await tab('today'); const cmp = await p.evaluate(() => { const c = [...document.querySelectorAll('.lg-card')].find(e => /가맹점별 수납/.test(e.textContent)); return c ? c.querySelector('tbody').textContent : ''; });
  ok(/라이브 1호점/.test(cmp) && /270,000원/.test(cmp), '가맹점별 수납(byUnitDetail) ' + cmp.slice(0, 100));

  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await br.close(); if (srv) srv.kill(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); if (srv) srv.kill(); process.exit(1); });
