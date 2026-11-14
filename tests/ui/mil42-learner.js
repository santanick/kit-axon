'use strict';
/* v42 학습 마일리지 — 학습자 앱 · 웹(lmil.js) 점검
   시연판(체험 샘플 ?mile=1): 「나」 카드 → 내 마일리지(잔액 3칸 · 다음 목표 · 국비 기록만) → 적립 내역 · 근거 시트(정정 · 원 줄) → 소멸 예정 → 보상 신청(확인 시트) → 내 신청 · 취소
     → 배지 지갑 · 연속 학습 → 적립 토스트 · 하루 상한(#done) · 웹 마이페이지 블록 / 스튜디오 문서(mileage) 빈 상태 · 제도 끔 / 마일리지 없는 기관
   운영 모드(서버 응답 가짜): mile-my · mile-list · mile-rewards → 신청(rewardId · points · idem만 보냄) · 409 insufficient 안내 · 신청 취소 · 403 mile_off면 진입점 없음
   + 가로 넘침 0 · 누르는 곳 44px · 글자 12px 이상 · 금지 문구 없음 · pageerror 0
   사용: node tests/ui/mil42-learner.js  (SHOTS=<폴더>면 화면 저장) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const SITEJ = JSON.parse(fs.readFileSync(ROOT + '/learner-demo-adult.json', 'utf8'));
const SID = '20269000';
const BAN = /서두르세요|곧 사라져요|놓치지 마세요|끊겨요|꼴찌|벌점/;

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const SH = process.env.SHOTS || ''; if (SH) fs.mkdirSync(SH, { recursive: true });
  const shot = async (p, n) => { if (SH) await p.screenshot({ path: path.join(SH, n), fullPage: false }); };
  const go = async (p, h, ms = 350) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(ms); };
  const txt = (p, s) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', s);
  const over = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const a11y = p => p.evaluate(() => { const bad = []; document.querySelectorAll('.lm a, .lm button, .lm input, .lm-me a, .lm-me button, .lm-sheet a, .lm-sheet button, .lm-myb a, .lm-myb button').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden') return; if (r.height < 44) bad.push(`${e.tagName}.${e.className} ${Math.round(r.height)}px`); });
    document.querySelectorAll('.lm *, .lm-me *, .lm-sheet *, .lm-toast *, .lm-myb *, .lm-cap *').forEach(e => { if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return; const r = e.getBoundingClientRect(); if (!r.width || e.closest('.sr')) return; const f = parseFloat(getComputedStyle(e).fontSize); if (f < 12) bad.push(`글자 ${f}px ${e.textContent.trim().slice(0, 10)}`); }); return bad; });
  const check = async (p, tag) => { const b = await a11y(p); ok(!b.length, `${tag} 누르는 곳 44px · 글자 12px${b.length ? ' ' + b.slice(0, 3).join(' / ') : ''}`); ok(await over(p) <= 0, `${tag} 가로 넘침 없음`); ok(!BAN.test(await p.evaluate(() => document.body.innerText)), `${tag} 손실 압박 문구 없음`); };
  const openDemo = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(([sid, k, v, cl]) => { try { sessionStorage.setItem(k || 'didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); localStorage.setItem('didisam.app.instx', '1'); if (cl) localStorage.setItem('didisam.app.classic', '1'); if (v) Object.entries(v).forEach(([a, b]) => localStorage.getItem(a) || localStorage.setItem(a, b)); } catch (e) { } }, [SID, o.sess || '', o.ls || null, !!o.web]);
    await p.goto(`${base}/learner.html?${o.t ? 't=' + o.t : 'demo=adult'}${o.web ? '' : '&app=1'}${o.q ?? '&mile=1'}${o.h || '#acct'}`, { waitUntil: 'load' }); await p.waitForTimeout(900); return { ctx, p, errs }; };

  /* ── 1. 시연판 앱 ── */
  { const { ctx, p, errs } = await openDemo();
    const me = await p.evaluate(() => { const c = document.querySelector('.lm-me'); return c ? { t: c.textContent, after: !!(c.previousElementSibling && c.previousElementSibling.classList.contains('ls-prof')), ring: !!c.querySelector('.lm-ring') } : null; });
    ok(!!me, '「나」 탭: 내 마일리지 카드'); ok(me && me.after, '카드 위치: 프로필 바로 아래'); ok(me && /잔액/.test(me.t) && /다음 목표/.test(me.t) && /연속 학습 중/.test(me.t) && /소멸 예정/.test(me.t) && /보상 보기/.test(me.t), '카드 구성: 잔액 · 다음 목표 · 연속 · 소멸 예정 · 보상 보기');
    ok(me && me.ring, '등급 링(화면당 1개)'); const tabs = await p.evaluate(() => document.querySelectorAll('#lapp .ap-nav > a').length); ok(tabs === 4, `하단 탭 4칸 유지(${tabs})`);
    await check(p, '「나」 카드'); await shot(p, '01-me.png');
    await p.click('.lm-me .lm-more'); await p.waitForTimeout(400);
    const m = await p.evaluate(() => ({ h: location.hash, sp: [...document.querySelectorAll('.lm-split dt')].map(x => x.textContent.trim()), dd: [...document.querySelectorAll('.lm-split dd')].map(x => x.textContent), goal: !!document.querySelector('.lm-goal'), ways: document.querySelectorAll('#lmWays + .lm-ul li').length, fund: (document.querySelector('.lm-fund') || {}).textContent || '', tt: (document.querySelector('.ap-bar .ap-tt') || {}).textContent || '', nav: (document.querySelector('#lapp .ap-nav a.on, #lapp .ap-nav a[aria-current]') || {}).getAttribute ? document.querySelector('#lapp .ap-nav a[aria-current]').getAttribute('href') : '' }));
    ok(m.h === '#mile' && m.sp.join('|') === '쓸 수 있어요|적립 예정|사용 대기', `내 마일리지 잔액 3칸(${m.sp.join('|')})`); ok(m.dd[1] === '20점', `적립 예정 20점(${m.dd.join(',')})`);
    ok(m.goal, '다음 목표 카드 1개'); ok(m.ways >= 4, `이렇게 모을 수 있어요(${m.ways})`); ok(/국비 과정 적립 40점/.test(m.fund) && /배지 · 기록만/.test(m.fund), '국비 과정 적립은 기록만(D1)'); ok(m.tt === '내 마일리지', `앱 위 막대 제목(${m.tt})`); ok(m.nav === '#acct', '하단 탭 「나」 켜짐');
    const bal = await p.evaluate(() => document.querySelector('.lm-top .lm-big').textContent); ok(bal === '205점', `잔액(선입선출 · 정정 상계) ${bal}`);
    await check(p, '내 마일리지'); await shot(p, '02-mile.png');
    /* 적립 내역 · 근거 */
    await go(p, '#mile/list'); const L = await p.evaluate(() => ({ mon: document.querySelectorAll('.lm-mon').length, rows: document.querySelectorAll('.lm-row').length, pend: [...document.querySelectorAll('.lm-row.pend')].map(x => x.textContent).join(''), fix: [...document.querySelectorAll('.lm-row.k-cancel')].map(x => x.textContent).join(''), tag: !!document.querySelector('.lm-row .lm-locktag') }));
    ok(L.mon >= 2 && L.rows >= 10, `월별 묶음 내역(${L.mon}개월 · ${L.rows}줄)`); ok(/확인 대기/.test(L.pend) && /\+20점/.test(L.pend), '확인 대기 적립 예정 줄'); ok(/정정/.test(L.fix) && /두 번 기록/.test(L.fix) && /−30점/.test(L.fix), '정정 줄(지우지 않고 반대 줄 · 이유)'); ok(L.tag, '국비 과정 줄 슬레이트 태그');
    await check(p, '적립 내역'); await shot(p, '03-list.png');
    await p.click('.lm-row.k-cancel'); await p.waitForTimeout(300);
    const sh = await p.evaluate(() => { const s = document.querySelector('.lm-sheet'); return s ? { t: s.textContent, ref: !!s.querySelector('.lm-refr'), dlg: s.getAttribute('role') } : null; });
    ok(sh && sh.dlg === 'dialog' && /정정한 이유/.test(sh.t) && /규칙/.test(sh.t) && /조건/.test(sh.t) && /확인 방식/.test(sh.t), '근거 시트: 이유 · 규칙 · 조건 · 확인 방식'); ok(sh && sh.ref && /연결된 원 줄/.test(sh.t), '근거 시트: 연결된 원 줄');
    await check(p, '근거 시트'); await shot(p, '04-detail.png'); await p.click('.lm-sheet [data-lm="close"]'); await p.waitForTimeout(250); ok(!(await p.$('.lm-sheet')), '시트 닫기');
    await p.click('[data-lm="f"][data-v="use"]'); await p.waitForTimeout(250); ok((await p.$$eval('.lm-row', R => R.every(r => /−/.test(r.querySelector('.lm-pv').textContent)))), '거르기: 사용');
    /* 소멸 예정 */
    await go(p, '#mile/exp'); const ex = await txt(p, '.lm-exp-x, .lm'); ok(/6개월 안에 소멸될 마일리지/.test(ex) && /45점/.test(ex) && /보상으로 바꿀 수 있어요/.test(ex) && /30일 전 알림/.test(ex), '소멸 예정: 합계 · 날짜별 표 · 정보형 문구 · 알림 시점'); await check(p, '소멸 예정'); await shot(p, '05-exp.png');
    /* 보상 · 신청 */
    await go(p, '#mile/rewards'); const rw = await p.evaluate(() => ({ t: document.querySelector('.lm').textContent, btn: [...document.querySelectorAll('[data-lm="redeem"]')].map(b => b.textContent) }));
    ok(/쓸 수 있어요/.test(rw.t) && /까지 쓸 수 있어요/.test(rw.t) && /참여 적립 10점/.test(rw.t), '보상: 쓸 수 있는 양 · 현금성 한도 설명'); ok(rw.btn.length === 2 && /받았어요/.test(rw.t), `보상 카드: 신청 2 · 배지 받았어요(${rw.btn.join('/')})`);
    await check(p, '보상'); await shot(p, '06-rewards.png');
    await p.click('[data-lm="redeem"][data-v="mrw_meal"]'); await p.waitForTimeout(300); const rs = await txt(p, '.lm-sheet'); ok(/학생식당 식권 1매로 바꿀까요/.test(rs) && /쓸 양50점/.test(rs) && /신청하면 바로 잡아 둬요/.test(rs) && /이번 달 한도/.test(rs), '신청 확인 시트: 쓸 양 · 처리 방식 · 한도 · 잡아 둠 안내');
    ok(/국비 지원 과정 적립은 빠져요/.test(rs), '현금성 보상 시트: 국비 적립 제외 안내'); await check(p, '신청 시트'); await shot(p, '07-request.png');
    await p.click('#lmRdF button[type=submit]'); await p.waitForTimeout(500);
    const rq = await p.evaluate(() => ({ h: location.hash, cards: [...document.querySelectorAll('.lm-q')].map(x => x.textContent), held: [...document.querySelectorAll('.lm-split dd')].map(x => x.textContent), q: JSON.parse(localStorage.getItem('didisam.room.sample.lpx') || '[]').map(x => x.type) }));
    ok(rq.h === '#mile/req' && /받을 수 있어요/.test(rq.cards[0] || '') && /수령 코드/.test(rq.cards[0] || ''), '자동 처리 보상: 내 신청 · 수령 코드'); ok(rq.held[2] === '50점' && rq.held[0] === '155점', `사용 대기 50점 · 쓸 수 있어요 155점(${rq.held.join(',')})`);
    ok(rq.q.includes('mile-redeem'), '운영자 요청함(lpx mile-redeem)'); ok(rq.cards.some(c => /반려/.test(c) && /재고가 없어/.test(c)), '반려 사유 표시');
    await check(p, '내 신청'); await shot(p, '08-req.png');
    await go(p, '#mile/rewards'); await p.click('[data-lm="redeem"][data-v="mrw_room"]'); await p.waitForTimeout(250); await p.click('#lmRdF button[type=submit]'); await p.waitForTimeout(450);
    ok(/확인 대기/.test(await txt(p, '.lm-q')) && !!(await p.$('[data-lm="rcancel"]')), '담당자 확인 보상: 확인 대기 · 취소 버튼');
    p.once('dialog', d => d.accept()); await p.click('[data-lm="rcancel"]'); await p.waitForTimeout(400);
    const af = await p.evaluate(() => ({ c: document.querySelector('.lm-q').textContent, dd: [...document.querySelectorAll('.lm-split dd')].map(x => x.textContent), q: JSON.parse(localStorage.getItem('didisam.room.sample.lpx') || '[]').map(x => x.type) }));
    ok(/취소함/.test(af.c) && af.dd[2] === '50점' && af.q.includes('mile-redeem-cancel'), `신청 취소 → 복원 · lpx(${af.dd.join(',')})`);
    /* 부족 · 문턱 */
    await go(p, '#mile/rewards'); const lk = await p.evaluate(() => [...document.querySelectorAll('.lm-rv small')].map(x => x.textContent)); ok(lk.some(t => /더 모으면 돼요/.test(t)), `모자라면 신청 대신 이유(${lk.join('/')})`);
    /* 배지 · 연속 */
    await go(p, '#mile/badges'); const bd = await p.evaluate(() => ({ t1: document.querySelectorAll('.lm-bd.t1').length, t2: document.querySelectorAll('.lm-bd.t2').length, t3: document.querySelectorAll('.lm-bd.t3').length, lk: document.querySelectorAll('.lm-bd.tl').length, n: document.querySelector('.lm-ub b').textContent }));
    ok(bd.t1 >= 1 && bd.t2 === 1 && bd.t3 === 1 && bd.lk >= 3, `배지 지갑: 기록 · 성취 · 인증 · 잠김(${JSON.stringify(bd)})`); await check(p, '배지 지갑'); await shot(p, '09-badges.png');
    await go(p, '#mile/streak'); const sk = await p.evaluate(() => ({ cells: document.querySelectorAll('.lm-wk li').length, today: document.querySelectorAll('.lm-wk .s-today, .lm-wk .s-done').length, t: document.querySelector('.lm').textContent }));
    ok(sk.cells === 7 && /쉬는 날 1번 남음/.test(sk.t) && /복구 학습/.test(sk.t) && /알림을 보내지 않아요/.test(sk.t), '연속 학습: 주 7칸 · 쉬는 날 · 복구 안내 · 알림 없음'); await check(p, '연속 학습'); await shot(p, '10-streak.png');
    /* 적립 토스트 · 하루 상한 */
    await go(p, '#mile'); await p.evaluate(() => window.LMIL.demoEarn('특강 「AI로 리포트 구조 잡기」 출석', 30, { trust: 'B' })); await p.waitForTimeout(200);
    const t1 = await txt(p, '.lm-toast'); ok(/특강 「AI로 리포트 구조 잡기」 출석으로 쌓였어요/.test(t1) && /\+30점/.test(t1) && !/다 모았어요/.test(t1), `적립 토스트: 학습 내용 앞 · +숫자 뒤(${t1})`);
    await check(p, '적립 토스트'); await shot(p, '11-earn.png');
    const e2 = await p.evaluate(() => { const e = window.LMIL.demoEarn('과제 제출', 30); return e && e.points; }); await p.waitForTimeout(200); const t2 = await txt(p, '.lm-toast');
    ok(e2 === 20 && /\+20점/.test(t2) && /오늘 마일리지는 다 모았어요/.test(t2), `하루 상한 50점: 20점만 적립 · 상한 문구(${t2})`);
    const e3 = await p.evaluate(() => window.LMIL.demoEarn('퀴즈 통과', 10)); ok(e3 === null, '상한 도달 뒤 적립 없음');
    await go(p, '#mile'); ok(/오늘 마일리지는 다 모았어요/.test(await txt(p, '.lm-note.ok')) && /실력으로 쌓여요/.test(await txt(p, '.lm-note.ok')), '내 마일리지: 하루 상한 안내');
    await go(p, '#done', 600); const dn = await p.evaluate(() => ({ cap: (document.querySelector('.lm-cap') || {}).textContent || '' })); ok(/다 모았어요/.test(dn.cap) && /\+50점/.test(dn.cap), `#done 오늘 목표 화면: 상한 문구 · 오늘 쌓인 마일리지(${dn.cap.slice(0, 60)})`); await shot(p, '12-cap.png');
    ok(!errs.length, `시연판 앱 pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* ── 2. 웹 마이페이지 블록 ── */
  { const { ctx, p, errs } = await openDemo({ web: true, w: 1280, h: '#my' }); const b = await p.evaluate(() => { const x = document.querySelector('.lm-myb'); return x ? { t: x.textContent, first: [...document.querySelector('.mygrid').children].indexOf(x) <= 1, wk: x.querySelectorAll('.lm-wk li').length } : null; });
    ok(!!b && b.first, '웹 마이페이지: 「내 마일리지」 블록(앞쪽)'); ok(b && /마일리지 잔액/.test(b.t) && /다음 목표/.test(b.t) && b.wk === 7 && /보상 보기/.test(b.t), '블록 구성: 잔액 · 다음 목표 · 주 7칸 · 보상');
    await check(p, '웹 1280'); await shot(p, '13-web.png'); await go(p, '#mile'); ok(!!(await p.$('.lm-top')), '웹 #mile 화면'); await go(p, '#mile/rewards'); await check(p, '웹 보상');
    ok(!errs.length, `웹 pageerror 0 ${errs.join('|')}`); await ctx.close(); }
  { const { ctx, p } = await openDemo({ h: '#my' }); ok(!(await p.$('.lm-myb')), '앱 「내 과정」(#my)에는 웹 블록 없음(앱은 「나」 카드)'); await ctx.close(); }

  /* ── 3. 마일리지 없는 기관 · 스튜디오 문서(빈 상태 · 제도 끔) ── */
  { const { ctx, p, errs } = await openDemo({ q: '' }); ok(!(await p.$('.lm-me')), '마일리지 없는 기관: 「나」 카드 없음'); await go(p, '#mile'); ok(!(await p.$('.lm')), '마일리지 없는 기관: #mile 경로 없음'); await go(p, '#home'); ok(!(await p.$('.lm-gp, .lm-toast')), '홈 보조문 · 토스트 없음'); ok(!errs.length, 'pageerror 0'); await ctx.close(); }
  const room = mil => JSON.stringify({ lsite: { pub: SITEJ }, codes: [{ sid: SID, code: 'ABC123' }], mileage: mil });
  { const { ctx, p, errs } = await openDemo({ t: 'T42e', q: '', sess: 'didisam.learner.T42e', ls: { 'didisam.room.T42e': room({ on: true, policy: { unitName: 'P' }, rules: [{ id: 'r1', trigger: 'lesson', label: '차시 완료', say: '첫 차시를 들으면 10P', act: '첫 차시', score: { mode: 'fixed', v: 10 }, active: true }], entries: [], rewards: [] }) } });
    ok(!!(await p.$('.lm-me')), '스튜디오 문서(S.mileage) 켜짐 → 「나」 카드'); await go(p, '#mile'); const em = await txt(p, '.lm-empty'); ok(/아직 쌓인 마일리지가 없어요/.test(em) && /첫 차시를 들으면 10P가 쌓여요/.test(em) && /첫 차시 시작하기/.test(em), `빈 상태: 가장 쉬운 규칙 1개(${em.trim().slice(0, 50)})`);
    await check(p, '빈 상태'); await shot(p, '14-empty.png'); ok(!errs.length, `빈 상태 pageerror 0 ${errs.join('|')}`); await ctx.close(); }
  { const { ctx, p, errs } = await openDemo({ t: 'T42f', q: '', sess: 'didisam.learner.T42f', ls: { 'didisam.room.T42f': room({ on: false, entries: [{ id: 'x', sid: SID, kind: 'earn', points: 10, status: 'posted', at: '2026-11-01T00:00:00Z' }] }) } });
    ok(!(await p.$('.lm-me')), '제도 끔(on:false): 카드 없음'); await go(p, '#mile'); ok(!(await p.$('.lm')), '제도 끔: #mile 없음'); ok(!errs.length, 'pageerror 0'); await ctx.close(); }

  /* 스튜디오 문서 모양 그대로: S.mileage(mil.js — policy.ab · say {P} · caps · nowStr 시각) + S.milrw(milrw.js — 보상 · 신청 guardian:'wait' · hold 줄) */
  { const T = 'T42s'; const doc = room({ v: 42, policy: { on: true, unitName: '포인트', ab: 'P', dailyCapTotal: 500, tierWindow: 'm12', tiers: [{ name: '시작', min: 0 }, { name: '성장', min: 1500 }] }, rules: [{ id: 'mru_a1', ver: 1, trigger: 'lesson_done', label: '차시 완료', say: '차시를 끝까지 들으면 {P}', score: { mode: 'fixed', v: 2 }, caps: { day: 20 }, active: true }], funded: {},
      entries: [{ id: 'me_a', sid: SID, scopeUnit: 'main', kind: 'earn', points: 300, status: 'posted', nature: 'achievement', trust: 'A', convertible: true, funded: false, ruleId: 'mru_a1', expiresAt: '2027-11-10', at: '2026-11-10 10:00' }] });
    const d = JSON.parse(doc); d.milrw = { v: 42, rewards: [{ id: 'mrw_t', kind: 'tuition', title: '학원비 차감', cost: { wonPerP: 1 }, minUse: 100, step: 100, maxUse: { billPct: 30 }, approval: 'guardian', active: true }], redeems: [{ id: 'mrd_x', sid: SID, rewardId: 'mrw_t', points: 100, won: 100, status: 'requested', guardian: 'wait', at: '2026-11-13 10:00', idem: 'k1' }], entries: [{ id: 'me_h', sid: SID, kind: 'hold', points: -100, status: 'posted', redeemId: 'mrd_x', at: '2026-11-13 10:00' }] };
    const { ctx, p, errs } = await openDemo({ t: T, q: '', sess: 'didisam.learner.' + T, ls: { ['didisam.room.' + T]: JSON.stringify(d) }, h: '#mile' });
    const m = await p.evaluate(() => ({ dd: [...document.querySelectorAll('.lm-split dd')].map(x => x.textContent), w: (document.querySelector('#lmWays + .lm-ul') || {}).textContent || '' }));
    ok(m.dd.join() === '200P,0P,100P', `스튜디오 문서: 잔액 · hold 줄 사용 대기(${m.dd.join()})`); ok(/차시를 끝까지 들으면 2P/.test(m.w) && /하루 20P까지/.test(m.w), `규칙 문장 {P} · 한도(${m.w.trim().slice(0, 40)})`);
    await go(p, '#mile/req'); ok(/보호자 확인 대기/.test(await txt(p, '.lm-q')) && /학원비 차감/.test(await txt(p, '.lm-q')), '신청 guardian:wait → 보호자 확인 대기 · 보상 이름');
    p.once('dialog', x => x.accept()); await p.click('[data-lm="rcancel"]'); await p.waitForTimeout(400);
    const c = await p.evaluate(t => ({ dd: [...document.querySelectorAll('.lm-split dd')].map(x => x.textContent), q: JSON.parse(localStorage.getItem('didisam.room.' + t + '.lpx') || '[]') }), T);
    const cx = c.q.find(x => x.type === 'mile-redeem-cancel'); ok(c.dd.join() === '300P,0P,0P' && cx && cx.data.id === 'mrd_x' && cx.data.redeemId === 'mrd_x', `스튜디오 신청 취소 → 복원 · lpx {id, redeemId}(${c.dd.join()})`);
    await go(p, '#mile/rewards'); await p.click('[data-lm="redeem"][data-v="mrw_t"]'); await p.waitForTimeout(300); ok(!!(await p.$('#lmRdP')), '학원비 차감: 쓸 양 입력(단위 · 최소)'); await p.fill('#lmRdP', '200'); await p.click('#lmRdF button[type=submit]'); await p.waitForTimeout(400);
    const r = await p.evaluate(t => JSON.parse(localStorage.getItem('didisam.room.' + t + '.lpx') || '[]').filter(x => x.type === 'mile-redeem').map(x => x.data), T);
    ok(r.length === 1 && r[0].rewardId === 'mrw_t' && r[0].points === 200 && r[0].sid === SID && r[0].id === r[0].redeemId && !!r[0].idem, `lpx mile-redeem {id, redeemId, rewardId, points, sid, idem}(${JSON.stringify(r[0] || {})})`);
    ok(!errs.length, `스튜디오 문서 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  /* ── 4. 운영 모드(서버 응답 가짜) ── */
  const LIVE = (o = {}) => { const st = { redeems: [], cancels: [], my: 0, held: 0, q: [{ id: 'mrd_1', rewardId: 'mrw_c', title: '스터디카페 이용권', points: 100, status: 'requested', at: '2026-11-13T02:00:00Z' }] };
    const my = () => ({ ok: true, on: true, unitName: 'LP', balance: 650 - st.held, pending: 0, held: st.held + 100, convertible: 350 - st.held, funded: 300, tier: { name: '성장', pct: 40 }, nextGoal: { label: '도서 이용권', need: 50, pct: 88, now: 350, target: 400 }, streak: { n: 5, freeze: 1 }, expiring: [{ at: '2026-12-31', points: 60 }], ways: ['차시를 끝까지 들으면 10LP', '과제를 기한 안에 내면 20LP'], daily: { cap: 50, today: 10 } });
    return { st, async route(p) { await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.route(/\/api\/(.*)/, async r => { const u = new URL(r.request().url()); const pa = u.pathname; const J = (b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) }); let body = null; try { body = r.request().postDataJSON(); } catch (e) { }
        if (pa === '/api/config') return J({ live: true }); if (/\/site$/.test(pa)) return J({ site: SITEJ }); if (/\/me$/.test(pa)) return J({ me: { sid: SID, kind: 'learner' } });
        if (/mile-my$/.test(pa)) { st.my++; return o.off ? J({ error: 'mile_off', message: '꺼짐' }, 403) : J(my()); }
        if (/mile-list$/.test(pa)) return J({ ok: true, items: [{ id: 'me_1', kind: 'earn', points: 200, status: 'posted', at: '2026-10-21T01:00:00Z', title: '「AI 실무 기초」 과정 이수', trust: 'A', funded: true, convertible: false, expiresAt: '2026-12-31T14:59:59Z' }, { id: 'me_2', kind: 'earn', points: 450, status: 'posted', at: '2026-11-02T01:00:00Z', title: '「데이터 리터러시」 과정 이수', trust: 'A', expiresAt: '2027-11-02T14:59:59Z' }] });
        if (/mile-rewards$/.test(pa)) return J({ ok: true, rewards: [{ id: 'mrw_b', kind: 'coupon', title: '도서 이용권', cost: { fixedP: 400 }, cash: true, approval: 'manual', how: '담당자 확인 후' }, { id: 'mrw_c', kind: 'goods', title: '스터디카페 이용권', cost: { fixedP: 100 }, cash: true, approval: 'manual' }], requests: st.q });
        if (/mile-redeem$/.test(pa)) { st.redeems.push(body); if (body.rewardId === 'mrw_b') return J({ error: 'insufficient', message: '모자람' }, 409); st.held += body.points; st.q.unshift({ id: 'mrd_2', rewardId: body.rewardId, title: '스터디카페 이용권', points: body.points, status: 'requested', at: '2026-11-14T02:00:00Z' }); return J({ ok: true, id: 'mrd_2', status: 'requested' }); }
        if (/mile-redeem-cancel$/.test(pa)) { st.cancels.push(body); const q = st.q.find(x => x.id === body.id); if (q) { q.status = 'cancelled'; st.held = Math.max(0, st.held - (q.id === 'mrd_2' ? q.points : 0)); } return J({ ok: true }); }
        return J({ ok: true }); }); } }; };
  const openLive = async (L, url, w = 390) => { const ctx = await browser.newContext({ viewport: { width: w, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await L.route(p); await p.goto(base + url, { waitUntil: 'load' }); await p.waitForTimeout(1200); return { ctx, p, errs }; };
  { const L = LIVE(); const { ctx, p, errs } = await openLive(L, '/learner.html?t=T1&app=1#acct');
    const c = await txt(p, '.lm-me'); ok(/650LP/.test(c) && /성장/.test(c) && /남은 50LP/.test(c) && /5일/.test(c), `운영: mile-my → 「나」 카드(${c.replace(/\s+/g, ' ').slice(0, 70)})`);
    await go(p, '#mile', 900); const m = await p.evaluate(() => ({ dd: [...document.querySelectorAll('.lm-split dd')].map(x => x.textContent), fund: !!document.querySelector('.lm-fund'), rows: document.querySelectorAll('.lm-row').length, ways: document.querySelectorAll('#lmWays + .lm-ul li').length }));
    ok(m.dd.join() === '650LP,0LP,100LP' && m.fund && m.rows === 2 && m.ways === 2, `운영: 내 마일리지 · 국비 분리 · 최근 내역 · 모으는 방법 ${JSON.stringify(m)}`);
    await go(p, '#mile/rewards', 900); await p.click('[data-lm="redeem"][data-v="mrw_c"]'); await p.waitForTimeout(300); await p.click('#lmRdF button[type=submit]'); await p.waitForTimeout(900);
    const rb = L.st.redeems[0] || {}; ok(rb.rewardId === 'mrw_c' && rb.points === 100 && /^lm_/.test(rb.idem || '') && Object.keys(rb).sort().join() === 'idem,points,rewardId', `운영: 신청 본문은 rewardId · points · idem만(${JSON.stringify(rb)})`);
    ok(await p.evaluate(() => location.hash) === '#mile/req' && (await p.$$('.lm-q')).length === 2, '운영: 신청 후 내 신청');
    await p.evaluate(() => { window.confirm = () => true; }); await p.click('[data-lm="rcancel"][data-v="mrd_2"]'); await p.waitForTimeout(900); ok((L.st.cancels[0] || {}).id === 'mrd_2', '운영: mile-redeem-cancel {id}');
    await go(p, '#mile/rewards', 900); const bb = await p.$('[data-lm="redeem"][data-v="mrw_b"]'); if (bb) { await bb.click(); await p.waitForTimeout(300); await p.click('#lmRdF button[type=submit]'); await p.waitForTimeout(800); ok(/모자라요/.test(await txt(p, '.lm-err')), '운영: 409 insufficient → 시트에 안내'); } else ok(/더 모으면/.test(await txt(p, '.lm')), '운영: 모자란 보상은 신청 버튼 대신 이유');
    await check(p, '운영 보상'); ok(!errs.length, `운영 pageerror 0 ${errs.join('|')}`); await ctx.close(); }
  { const L = LIVE({ off: true }); const { ctx, p, errs } = await openLive(L, '/learner.html?t=T1&app=1#acct'); ok(!(await p.$('.lm-me')) && L.st.my >= 1, '운영 403 mile_off: 카드 없음'); await go(p, '#mile', 600); ok(!(await p.$('.lm')), '운영 403: #mile 경로 없음'); ok(L.st.my === 1, `운영 403: 다시 묻지 않음(${L.st.my})`); ok(!errs.length, 'pageerror 0'); await ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
