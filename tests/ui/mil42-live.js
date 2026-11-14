'use strict';
/* v42 학습 마일리지 — 운영 모드 전 구간(실제 Node 서버 + PostgreSQL + 브라우저, QA v42)
   제도 끔(학습자 숨김) → 켜기 마법사(UI: draft → config · rules · rewards → enable{draftHash}) → 학습자 화면 보임 → 제도 끄기(UI) → 학습자 숨김 → 다시 켬
   → 가입 적립 · 시험 점수(a2-try → 운영자 확정 사건) · 이수(수료증 자동 발급) → 수동 지급(UI 확인 카드) → 학습자 「내 마일리지」 = 서버 지갑
   → 학원비 차감 신청(학습자 UI, hold) → 승인(보상 탭 UI) → v41 청구서에 「마일리지 차감」 줄 → 수납 · 전액 환불 확정 → 차감 P 복원
   → 굿즈 신청 → 반려(UI, 사유) → 복원 → 국비 과정: 금전성 보상 연결 거절(funded_blocked) · 국비 적립 기록만 → 본인 지급 금지(self_grant)
   → 미성년 공개 순위 켜기(UI 6단계 → rank-penalty, 이력 rank_penalty) → pageerror 0
   사용: NODE_PATH=$(npm root -g):<service/server/node_modules> MIL_DB=postgres://didisam@127.0.0.1:5544/m42q node tests/ui/mil42-live.js
   BASE를 주면 이미 떠 있는 서버(SIGNUP_CODE=C0DE PII_DEV_OTP=1)를 쓰고, 없으면 공개 폴더를 만들고 서버를 띄운 뒤 끝에 종료한다. */
const path = require('node:path'); const { spawn, execFileSync } = require('node:child_process'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const PORT = process.env.MIL_PORT || '9761';
let B = process.env.BASE || ''; let srv = null;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m.slice(0, 160)); } else { fail++; console.error('✗', m); } };
const wait = ms => new Promise(k => setTimeout(k, ms));
(async () => {
  if (!B) {
    execFileSync(process.execPath, ['service/build-public.js', 'didisam', 'service/public'], { cwd: ROOT, stdio: 'ignore' });
    const env = { ...process.env, DATABASE_URL: process.env.MIL_DB || 'postgres://didisam@127.0.0.1:5544/m42q', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SIGNUP_CODE: 'C0DE', PII_DEV_OTP: '1', SESSION_PEPPER: 'ci-only', PORT, PII_KEY: '0'.repeat(64), LEDGER_SWEEP_MS: '0' };
    srv = spawn(process.execPath, ['server/index.js'], { cwd: path.join(ROOT, 'service'), env, stdio: ['ignore', 'ignore', 'pipe'] }); let elog = ''; srv.stderr.on('data', d => { elog += d; });
    B = `http://127.0.0.1:${PORT}`; let up = false; for (let i = 0; i < 60 && !up; i++) { await wait(500); try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } }
    if (!up) { console.error('서버가 뜨지 않았습니다', elog.slice(-800)); process.exit(1); }
  }
  const br = await chromium.launch(); const errs = []; const H = { 'x-didisam': '1', origin: B }; const T0 = Date.now().toString(36);
  const ADM = `mil${T0}@example.com`;
  const ctx = await br.newContext({ timezoneId: 'Asia/Seoul', viewport: { width: 1440, height: 900 } });
  const su = await ctx.request.post(B + '/api/signup', { headers: H, data: { email: ADM, password: 'Contract2026x', orgName: '라이브 새봄학원', type: 'k12', code: 'C0DE' } });
  ok(su.status() === 200, '운영자 가입 ' + su.status()); const tid = (await su.json()).tenant.tid;
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('A ' + e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await p.addInitScript(() => { window.confirm = () => true; });
  await p.goto(B + '/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant, null, { timeout: 15000 });
  const saved = () => p.waitForFunction(() => !LIVE.dirty && !LIVE.saving, null, { timeout: 15000 });
  const A = (m, u, b) => p.evaluate(([m, u, b]) => api(m, u, b).then(j => ({ st: 200, j }), e => ({ st: e.status || 0, j: { error: e.code || e.error || (e.body && e.body.error) || e.message } })), [m, u, b]);
  const mok = () => p.click('#modal [data-mact="ok"]');
  const milTab = async t => { await p.evaluate(t => { UI.mil = t; if (window.MIL) MIL.invalidate(); go('mileage'); render(); }, t); await wait(700); await p.evaluate(() => render()); await wait(200); };

  /* 학습자 가입(이메일 OTP) — 컨텍스트마다 쿠키 */
  const learner = async (email, nick) => { const c = await br.newContext({ timezoneId: 'Asia/Seoul', viewport: { width: 390, height: 844 } });
    const o = await (await c.request.post(`${B}/api/pub/${tid}/otp`, { headers: H, data: { email, purpose: 'signup' } })).json();
    const sg = await c.request.post(`${B}/api/pub/${tid}/signup`, { headers: H, data: { via: 'email', email, code: o.dev_code, nickname: nick, consent: { tos: true, privacy: true }, age14: true } });
    const me = await (await c.request.get(`${B}/api/pub/${tid}/me`, { headers: H })).json(); const lp = await c.newPage(); lp.on('pageerror', e => errs.push(nick + ' ' + e.message)); await lp.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    lp.on('dialog', d => d.accept()); return { c, lp, st: sg.status(), sid: String(me.sid || (me.me || {}).sid || '') }; };
  const L = async (who, m, u, b) => { const r = await who.c.request.fetch(`${B}/api/pub/${tid}/${u}`, { method: m, headers: H, data: b }); let j = {}; try { j = await r.json(); } catch (e) { } return { st: r.status(), j }; };
  const lopen = async (who, h) => { await who.lp.goto(`${B}/learner.html?t=${tid}&app=1${h || '#acct'}`, { waitUntil: 'load' }); await wait(1500); };

  /* ⓪ 기관 문서: 정규반 · 국비 과정 · 원장 켜기 · 홈페이지 게시 */
  const L0 = await learner(ADM, '원장본인'); /* 운영자와 같은 이메일로 가입한 학습자(본인 지급 금지 확인용) */
  await p.evaluate(() => { if (!S || !S.org) createOrg('k12', '라이브 새봄학원'); S.me.role = 'owner';
    S.classes = S.classes || []; if (!S.classes.some(c => c.id === 'c_math')) S.classes.push({ id: 'c_math', name: '중등 수학 A반', kind: 'online', learners: [], prog: {}, curriculum: [{ id: 'e1', type: 'exam', title: '단원 평가', qs: [{ t: 'ox', q: '2는 짝수다', a: 'O', pts: 1 }] }], tries: {}, cert: 'auto', criteria: { threshold: 80 } });
    if (!S.classes.some(c => c.id === 'c_naeil')) S.classes.push({ id: 'c_naeil', name: '국민내일배움 컴활 과정', kind: 'online', learners: [], prog: {}, curriculum: [], fundSrc: 'naeil' });
    if (typeof ledgerEnsure === 'function') { ledgerEnsure(); S.ledger.on = true; } if (S.lsite) { S.lsite.pub = lsSnapshot(); S.lsite.pubAt = nowStr(); } save(); }); await saved();

  /* ① 제도 기본 끔(D2): 학습자 카드 · #mile 없음, 서버 404 */
  await lopen(L0, '#mile'); const off0 = await L0.lp.evaluate(() => ({ lm: !!document.querySelector('.lm:not(.lm-off)'), card: !!document.querySelector('.lm-me'), on: typeof mileOn === 'function' ? mileOn() : null }));
  ok(!off0.lm && !off0.card && (await L(L0, 'GET', 'mile-my')).st === 404, '제도 기본 끔: 학습자 화면 · 카드 없음 · mile-my 404 ' + JSON.stringify(off0));

  /* ② 켜기 마법사(UI) */
  await milTab('home'); await p.waitForFunction(() => /마일리지 제도 시작하기/.test(document.body.innerText), null, { timeout: 10000 }).catch(() => { });
  await p.click('[data-act="mil-w-pur"][data-v="cash"]'); await p.fill('[name="milBud"]', '300000'); await p.dispatchEvent('[name="milBud"]', 'change');
  await p.click('[data-act="mil-w-next"][data-v="2"]'); await p.waitForFunction(() => UI.milW && UI.milW.step === 2 && UI.milW.draft, null, { timeout: 10000 }).catch(() => { });
  const W2 = await p.evaluate(() => ({ hash: (UI.milW.draft || {}).hash, rules: ((UI.milW.draft || {}).rules || []).length, sim: !!UI.milSimLive, big: (document.querySelector('.mil-big') || {}).textContent }));
  ok(/^[0-9a-f]{64}$/.test(W2.hash || '') && W2.rules > 0 && W2.sim, '마법사 2단계: 서버 초안(draftHash 64자) · 서버 모의 계산 ' + JSON.stringify(W2));
  await p.click('[data-act="mil-w-next"][data-v="3"]'); await p.check('[data-chg="mil-w-ck"][data-v="a"]'); await p.check('[data-chg="mil-w-ck"][data-v="b"]'); await p.click('[data-act="mil-enable"]');
  await p.waitForFunction(() => document.querySelector('.mil-tabs'), null, { timeout: 15000 }).catch(() => { });
  const C1 = (await A('GET', '/api/mileage/config')).j; const LG1 = (await A('GET', '/api/mileage/log')).j.log || [];
  ok(C1.policy && C1.policy.on === true && (C1.rules || []).length === W2.rules && (C1.rewards || []).some(r => r.kind === 'tuition') && LG1.some(x => x.area === 'onoff' && x.after && x.after.on === true) && LG1.some(x => x.area === 'rule'),
    '켜기: 서버 정책 켜짐 · 규칙 · 보상(학원비 차감) 저장 · 변경 이력(onoff · rule) ' + JSON.stringify({ on: C1.policy && C1.policy.on, r: (C1.rules || []).length, rw: (C1.rewards || []).map(r => r.kind), lg: LG1.map(x => x.area) }));
  ok(C1.policy && C1.policy.budget && +C1.policy.budget.monthP === 300000 && C1.policy.grantCfg && +C1.policy.grantCfg.approveOver > 0, '마법사 config 본문(서버 정책 칸만 · grantCfg) 저장 ' + JSON.stringify({ b: C1.policy && C1.policy.budget, g: C1.policy && C1.policy.grantCfg }));
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.mil-tabs [role=tab]')].map(b => b.dataset.v));
  ok(['home', 'rules', 'ledger', 'rewards', 'approvals'].every(t => tabs.includes(t)), '켠 뒤 탭(정책 · 보상) ' + tabs.join(','));
  await lopen(L0, '#acct'); const on1 = await L0.lp.evaluate(() => ({ card: !!document.querySelector('.lm-me'), on: mileOn() }));
  await lopen(L0, '#mile'); const on1b = await L0.lp.evaluate(() => !!document.querySelector('.lm .lm-hd'));
  ok(on1.on && on1b, '켠 뒤 학습자: 마일리지 보임 ' + JSON.stringify({ on1, on1b }));

  /* ③ 제도 끄기(UI, 적립 없음 → 바로 끔) → 학습자 숨김 → 다시 켬 */
  await milTab('set'); const offBtn = await p.$('[data-act="mil-off"]'); if (offBtn) { await offBtn.click(); await p.fill('#modal [name="r"]', 'QA 끄기 확인'); await mok(); await wait(1200); }
  const C2 = (await A('GET', '/api/mileage/config')).j.policy || {};
  await lopen(L0, '#mile'); const off2 = await L0.lp.evaluate(() => ({ lm: !!document.querySelector('.lm .lm-hd'), on: mileOn() }));
  ok(!!offBtn && C2.on === false && !off2.lm && !off2.on && (await L(L0, 'GET', 'mile-my')).st === 404, '제도 끄기(UI) → 서버 끔 · 학습자 화면 숨김 ' + JSON.stringify({ btn: !!offBtn, on: C2.on, off2 }));
  const re = await A('POST', '/api/mileage/onoff', { on: true, reason: 'QA 다시 켬' }); ok(re.st === 200 && re.j.on === true, '다시 켜기(onoff, 기존 초안) ' + JSON.stringify(re));

  /* ④ 가입 적립 · 시험 점수 · 이수 적립 → 내 마일리지 */
  await A('POST', '/api/mileage/rules', { id: 'mru_signup', trigger: 'signup', label: '가입 축하', score: { mode: 'fixed', v: 50 }, once: 'ever' });
  await A('POST', '/api/mileage/config', { policy: { dailyCapTotal: 100000 } });
  const L1 = await learner(`l1${T0}@example.com`, '하늘'); const sid = L1.sid; ok(L1.st === 200 && !!sid, '학습자 가입 ' + L1.st);
  await p.evaluate(sid => { S.members = S.members || []; if (!S.members.some(m => m.sid === sid)) S.members.push({ id: 'm_l1', sid, name: '하늘', group: '', joined: today(), last: today(), extra: {} }); const c = S.classes.find(x => x.id === 'c_math'); if (!c.learners.includes('m_l1')) c.learners.push('m_l1'); save(); }, sid); await saved();
  const EX = await p.evaluate(async sid => { LPX['a2-try']({ who: sid, at: new Date().toISOString(), data: { cls: 'c_math', item: 'e1', ans: ['O'] } }); const c = S.classes.find(x => x.id === 'c_math'); c.prog.m_l1 = Object.assign(c.prog.m_l1 || {}, { p: 100 }); const cert = a2AutoCert(c, 'm_l1');
    save(); await new Promise(r => setTimeout(r, 1500)); return { q: (window.milEvents || {}).q ? window.milEvents.q.length : -1, cert, tries: (c.tries.e1 || []).length }; }, sid);
  await wait(800); const E1 = (await A('GET', '/api/mileage/entries?sid=' + sid)).j.entries || [];
  const trig = E1.filter(e => e.kind === 'earn').map(e => e.trigger + ':' + e.points + ':' + e.trust).sort();
  ok(E1.some(e => e.trigger === 'signup' && e.points === 50 && e.trust === 'A') && E1.some(e => e.trigger === 'exam_score' && e.points === 100 && e.trust === 'B') && (!EX.cert || E1.some(e => e.trigger === 'course_done' && e.trust === 'B')),
    '가입(A) · 시험 점수(스튜디오 → 운영자 확정 B) · 이수 적립 ' + JSON.stringify({ trig, EX }));
  ok(EX.cert === true, '수료증 자동 발급 → course_done 사건 ' + JSON.stringify(EX));
  /* 수동 지급(UI 확인 카드) */
  await milTab('ledger'); await p.click('[data-act="mil-grant"]'); await p.fill('#modal [name="sids"]', sid); await p.fill('#modal [name="pts"]', '5000'); await p.fill('#modal [name="why"]', '월간 우수 학습'); await mok(); await wait(200); await mok(); await wait(1500);
  const W1 = (await A('GET', '/api/mileage/wallet?sid=' + sid)).j; const w1 = (W1.wallets || [])[0] || {}; const sumEarn = ((await A('GET', '/api/mileage/entries?sid=' + sid)).j.entries || []).filter(e => e.status === 'posted').reduce((s, e) => s + e.points, 0);
  ok(w1.balance === sumEarn && w1.balance >= 5150, '수동 지급(UI) → 서버 지갑 = 원장 합계 ' + JSON.stringify({ bal: w1.balance, sumEarn }));
  await lopen(L1, '#mile'); const my1 = await L1.lp.evaluate(() => ({ big: (document.querySelector('.lm-top .lm-big') || {}).textContent || '', ways: document.querySelectorAll('#lmWays ~ ul li, .lm-ul li').length }));
  ok(my1.big.replace(/[^\d]/g, '') === String(w1.balance), '학습자 「내 마일리지」 잔액 = 서버 지갑 ' + JSON.stringify({ my1, bal: w1.balance }));

  /* ⑤ 학원비 차감: 청구서 → 학습자 신청(hold) → 승인(UI) → 원장 차감 줄 */
  await A('GET', '/api/ledger/units'); const ch = await A('POST', '/api/ledger/charges', { unitId: 'lu_root', sid, items: [{ itemType: 'tuition', title: '12월 교습비', amount: 300000 }], periodYm: '2026-12', idem: 'qa-ch1' });
  ok(ch.st === 200 && ch.j.bill && ch.j.bill.id, '청구서 생성(v41) ' + ch.st);
  await lopen(L1, '#mile/rewards'); const tuId = (C1.rewards.find(r => r.kind === 'tuition') || {}).id; await L1.lp.click(`[data-lm="redeem"][data-v="${tuId}"]`); await wait(300); await L1.lp.fill('#lmRdP', '3000'); await L1.lp.click('#lmRdF button[type=submit]'); await wait(1500);
  const RQ = ((await L(L1, 'GET', 'mile-rewards')).j.requests || []).find(x => x.rewardId === tuId) || {}; const my2 = (await L(L1, 'GET', 'mile-my')).j;
  ok(RQ.status === 'requested' && RQ.points === 3000 && my2.held === 3000 && my2.balance === w1.balance - 3000, '학습자 신청(UI) → hold(사용 대기 3,000P) ' + JSON.stringify({ st: RQ.status, held: my2.held, bal: my2.balance }));
  await milTab('approvals'); await p.waitForSelector(`tr[data-rd="${RQ.id}"] [data-act="mrw-ok"]`, { timeout: 8000 }).catch(() => { });
  const chk = await p.evaluate(id => (document.querySelector(`tr[data-rd="${id}"]`) || {}).innerText || '', RQ.id);
  await p.click(`tr[data-rd="${RQ.id}"] [data-act="mrw-ok"]`).catch(() => { }); await wait(200); await mok().catch(() => { }); await wait(1800);
  const RQ2 = ((await L(L1, 'GET', 'mile-rewards')).j.requests || []).find(x => x.id === RQ.id) || {}; const lm = await L(L1, 'GET', 'ledger-my'); const bills = JSON.stringify(lm.j);
  ok(RQ2.status === 'fulfilled' && /마일리지 차감/.test(bills) && /-3000|−3,000|-3,000/.test(bills.replace(/"amount":-3000/, '-3000')), '승인(UI) → v41 청구서에 「마일리지 차감 −3,000」 줄 ' + JSON.stringify({ st: RQ2.status, chk: chk.slice(0, 80) }));
  /* 수납 → 전액 환불 확정 → 차감 P 복원 */
  const rc = await A('POST', '/api/ledger/receipts', { unitId: 'lu_root', sid, method: 'cash', amount: 297000, idem: 'qa-r1' }); const rid = rc.j.receipt && rc.j.receipt.id;
  const rf = await A('POST', '/api/ledger/refunds', { receiptId: rid, ruleType: 'full', idem: 'qa-f1' }); const fid = rf.j.refund && rf.j.refund.id;
  const cf = fid ? await A('POST', `/api/ledger/refunds/${fid}/confirm`, {}) : { st: 0, j: {} };
  const E2 = (await A('GET', '/api/mileage/entries?sid=' + sid)).j.entries || [];
  ok(rc.st === 200 && cf.st === 200 && E2.some(e => e.kind === 'restore' && e.points === 3000), '수납 → 전액 환불 확정 → 마일리지 3,000P 복원(restore) ' + JSON.stringify({ rc: rc.st, rf: rf.st, cf: cf.st, mil: cf.j.mileage, k: E2.map(e => e.kind + ':' + e.points).slice(0, 6) }));

  /* ⑥ 굿즈 신청 → 반려(UI · 사유) → 복원 */
  const goods = C1.rewards.find(r => r.kind === 'goods'); const before = (await L(L1, 'GET', 'mile-my')).j.balance;
  const gq = await L(L1, 'POST', 'mile-redeem', { rewardId: goods.id, points: 500, idem: 'qa-goods-0001' }); const mid = (await L(L1, 'GET', 'mile-my')).j.balance;
  await milTab('approvals'); await p.waitForSelector(`tr[data-rd="${gq.j.id}"] [data-act="mrw-no"]`, { timeout: 8000 }).catch(() => { });
  await p.click(`tr[data-rd="${gq.j.id}"] [data-act="mrw-no"]`).catch(() => { }); await p.fill('#modal [name="why"]', '재고 소진').catch(() => { }); await mok().catch(() => { }); await wait(1500);
  const after = (await L(L1, 'GET', 'mile-my')).j.balance; const gr = ((await L(L1, 'GET', 'mile-rewards')).j.requests || []).find(x => x.id === gq.j.id) || {};
  ok(gq.st === 200 && mid === before - 500 && after === before && gr.status === 'rejected' && gr.reason === '재고 소진', '반려(UI) → 잡아 둔 500P 복원 · 사유 학습자에게 표시 ' + JSON.stringify({ before, mid, after, st: gr.status, why: gr.reason }));

  /* ⑦ 국비 과정(D1): 금전성 보상 연결 서버 거절 · 국비 적립은 전환 불가 */
  const fd = await A('POST', '/api/mileage/funded', { clsId: 'c_naeil', funded: true, source: 'naeil', reason: '내일배움카드 과정' });
  const rwF = await A('POST', '/api/mileage/rewards', { kind: 'coupon', title: '국비반 할인 쿠폰', audience: { cls: ['c_naeil'] } });
  const evF = await A('POST', '/api/mileage/events', { events: [{ trigger: 'exam_score', sid, srcType: 'exam', srcId: 'c_naeil/x#1', value: 95, cls: 'c_naeil' }] });
  const enF = ((await A('GET', '/api/mileage/entries?sid=' + sid)).j.entries || []).find(e => e.cls === 'c_naeil') || {};
  ok(fd.st === 200 && rwF.st === 400 && rwF.j.error === 'funded_blocked' && enF.funded === true && enF.convertible === false, '국비 과정: 금전성 보상 연결 400 funded_blocked · 적립은 기록만(전환 불가) ' + JSON.stringify({ rw: rwF.st + ' ' + rwF.j.error, en: [enF.funded, enF.convertible], ev: (evF.j.results || [])[0] }));
  await lopen(L1, '#mile'); const fdUi = await L1.lp.evaluate(() => /국비 지원 과정에는 쓸 수 없어요/.test(document.body.innerText));
  ok(fdUi, '학습자: 국비 과정 적립 잠금 안내');

  /* ⑧ 본인 지급 금지(제품 고정, 서버 강제) */
  await milTab('ledger'); await p.click('[data-act="mil-grant"]'); await p.fill('#modal [name="sids"]', L0.sid); await p.fill('#modal [name="pts"]', '100'); await p.fill('#modal [name="why"]', '본인 지급 시도'); await mok(); await wait(200); await mok(); await wait(1200);
  const sg = await A('POST', '/api/mileage/grant', { sids: [L0.sid], points: 100, reason: '본인 지급 시도', idem: 'qa-self' }); const toastT = await p.evaluate(() => (document.querySelector('#toasts') || {}).innerText || '');
  const fl = ((await A('GET', '/api/mileage/flags')).j.flags || []).some(f => f.kind === 'self_grant');
  ok(sg.st === 403 && sg.j.error === 'self_grant' && fl, '본인 지급 403 self_grant · 부정 의심 기록 ' + JSON.stringify({ st: sg.st, e: sg.j.error, fl, toast: toastT.slice(0, 60) }));

  /* ⑨ 미성년 공개 순위 켜기(UI 6단계, D3) → 이력 */
  await milTab('set'); await p.evaluate(() => { const el = document.querySelector('[data-chg="mil-rank"][data-v="rank"]'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await mok(); await wait(60); await mok(); await wait(60); await mok(); await wait(60); await p.check('#modal [name="ack"]'); await p.fill('#modal [name="r"]', '중등부 학습 습관 캠페인. 학부모 설명회에서 별명 · 근접 순위 방식에 동의받음.'); await mok(); await wait(1500);
  const RK = (await A('GET', '/api/mileage/log?area=rank_penalty')).j.log || []; const C3 = (await A('GET', '/api/mileage/config')).j.policy || {};
  ok(RK.length >= 1 && C3.rank && C3.rank.on === true && C3.rank.ack && /학부모/.test(C3.rank.ack.reason || ''), '미성년 순위 켜기(UI) → rank-penalty · 이력 rank_penalty · 확인 기록 ' + JSON.stringify({ n: RK.length, rank: C3.rank && { on: C3.rank.on, scope: C3.rank.scope } }));

  /* ⑩ 한눈에(서버 summary) · 변경 이력 화면 */
  await milTab('home'); const HK = await p.evaluate(() => [...document.querySelectorAll('.mil-kpi .v')].map(x => x.textContent)); const SM = (await A('GET', '/api/mileage/summary')).j;
  ok(HK.length && HK[0].replace(/[^\d]/g, '') === String(SM.earned), '한눈에 「이번 달 적립」 = 서버 summary.earned ' + JSON.stringify({ k: HK[0], earned: SM.earned }));
  await milTab('log'); const LT = await p.evaluate(() => document.querySelector('.mil-body').innerText); ok(/공개 순위|rank/.test(LT) && !/불러오지 못했습니다/.test(LT), '변경 이력 화면(GET /api/mileage/log)');

  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await br.close(); if (srv) srv.kill(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); if (srv) srv.kill(); process.exit(1); });
