'use strict';
/* v46 Ver2 학습자 — ⑨ 나의 비전 · 목표(lv2.js, 6단계 규칙 대화)
   꺼짐: 자동 시작 · 홈 카드 0 / 켜짐: 첫 로그인 홈에서 자동 시작 · 6단계 진행 표시 · 비전 카드 실시간 채움 · 이름 · 연락처 가드
   · 목표 3개 초과 불가 · 저장 · vision · goal 이벤트(원문 없음) · 건너뛰기 → 홈 작은 카드 · 나중에 이어서 → 이어 하기 · 공유 기본 꺼짐 · 390 가로 넘침 0
   사용: node tests/ui/v2-vision.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const RAW = fs.readFileSync(ROOT + '/learner-demo.json', 'utf8');
const ON = (() => { const j = JSON.parse(RAW); j.aipol = { on: true, lvl: 'L1', retain: 'term', evalNotice: false }; return JSON.stringify(j); })();

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const T = (p, s) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', s);
  const ctxOf = async w => { const ctx = await browser.newContext({ viewport: { width: w, height: 860 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await ctx.addInitScript(() => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20260001', dept: '', id: '20260001' })); localStorage.setItem('didisam.app.instx', '1'); localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } window.__ev = []; window.LEV = { emit: (v, o, x) => window.__ev.push([v, o, x]), flush() { } }; }); return ctx; };
  const page = async (ctx, on) => { const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); if (on) await p.route(/learner-demo\.json/, x => x.fulfill({ status: 200, contentType: 'application/json', body: ON })); await p.goto(`${base}/learner.html?demo=1#home`, { waitUntil: 'load' }); await p.waitForTimeout(900); return { p, errs }; };

  { const ctx = await ctxOf(1280); const { p, errs } = await page(ctx, false);
    ok(!(await p.$('#v2vis .v2-vis')) && !(await p.$('.v2-vcard')), '꺼짐: 비전 자동 시작 · 홈 카드 없음'); ok(!(await p.evaluate(() => 'vision' in (LR.lp || {}))), '꺼짐: lp.vision 만들지 않음');
    ok(!errs.length, `꺼짐 pageerror 0 ${errs[0] || ''}`); await ctx.close(); }

  { const ctx = await ctxOf(1280); const { p, errs } = await page(ctx, true); const click = async s => { await p.click(s); await p.waitForTimeout(200); };
    const send = async t => { await p.fill('#v2v', t); await click('.v2-vin button[type=submit]'); };
    ok(!!(await p.$('#v2vis .v2-vis')), '첫 로그인 홈: 비전 대화 자동 시작'); const v0 = await T(p, '.v2-vis');
    ok(/반가워요! 이번 학기를 시작하기 전에, 함께 나만의 비전을 만들어 볼까요\?/.test(v0) && /1 \/ 6단계/.test(v0) && /건너뛰기/.test(v0) && /나중에 이어서 할게요/.test(v0), '1단계 인사 · 진행 표시 · 건너뛰기 · 나중에');
    await click('[data-vis="next"]'); ok(/2 \/ 6단계/.test(await T(p, '.v2-prog')), '2단계로');
    await send('제 이름은 김민수입니다. 사람들 이야기를 정리하는 걸 좋아해요 010-1234-5678');
    const g1 = await p.evaluate(() => ({ e: (document.querySelector('.v2-verr') || {}).textContent, how: LR.lp.vision.card.how }));
    ok(/개인정보\(이름 · 연락처\)는 적지 않아도 돼요\. 지우고 저장할게요\./.test(g1.e || '') && !/김민수|010-1234/.test(g1.how), `이름 · 연락처 가드(${g1.how})`);
    await send('데이터로 우리 동아리 문제를 푸는 사람'); ok(/데이터로 우리 동아리 문제를 푸는 사람/.test(await T(p, '.v2-vc h3')), '비전 카드 실시간 채움');
    await send('설문을 직접 분석해 보고 싶어요'); ok(/5 \/ 6단계/.test(await T(p, '.v2-prog')), '4단계 → 5단계(비전 한 문장)');
    await send('데이터로 우리 주변 문제를 푸는 사람'); ok(/6 \/ 6단계/.test(await T(p, '.v2-prog')) && /목표는 3개까지 정할 수 있어요/.test(await T(p, '.v2-vis')), '6단계 목표 · 안내 문구');
    ok(!(await p.$eval('[data-vis="share"]', x => x.checked)), '목표 공유 기본 꺼짐');
    for (const g of ['데이터분석 기초 개념 10개 숙달', '동아리 설문 분석 보고서 1편 쓰기', '매주 학습 3회']) await send(g);
    ok(await p.evaluate(() => LR.lp.vision.goals.length === 3 && document.querySelector('.v2-vin').hidden), '목표 3개 뒤 입력칸 닫힘');
    await p.evaluate(() => { const f = document.querySelector('.v2-vin'); f.hidden = false; f.querySelector('textarea').value = '네 번째 목표'; f.requestSubmit(); }); await p.waitForTimeout(150);
    ok(await p.evaluate(() => LR.lp.vision.goals.length === 3), '목표 3개 초과 입력 불가');
    await click('[data-vis="save"]'); const V = await p.evaluate(() => ({ ...LR.lp.vision, open: document.body.classList.contains('v2-vison') }));
    ok(V.step === 6 && V.at && !V.open && V.card.who && V.txt, '비전 카드 저장 · 창 닫힘');
    ok(!(await p.$('.v2-vcard')), '완성 뒤 홈 카드 없음');
    const ev = await p.evaluate(() => window.__ev.filter(e => e[0] === 'vision')); ok(ev.length === 1 && Object.values(ev[0][2]).every(v => typeof v === 'number'), 'vision 이벤트 1건 · 값은 숫자만');
    await p.evaluate(() => LV2.openVision()); await p.waitForTimeout(150); await click('[data-vis="gdone"][data-i="0"]');
    ok(await p.evaluate(() => LR.lp.vision.goals[0].done && window.__ev.some(e => e[0] === 'goal')), '목표 달성 표시 · goal 이벤트');
    ok(!errs.length, `켜짐 pageerror 0 ${errs[0] || ''}`); await ctx.close(); }

  /* 건너뛰기 · 나중에 이어서 · 390 */
  { const ctx = await ctxOf(390); let { p, errs } = await page(ctx, true); const click = async s => { await p.click(s); await p.waitForTimeout(200); };
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 0), '390: 비전 창 가로 넘침 없음');
    await click('[data-vis="next"]'); await p.fill('#v2v', '그림 그리기를 좋아해요'); await click('.v2-vin button[type=submit]'); await click('[data-vis="later"]');
    ok(/비전 만들기 이어서/.test(await T(p, '.v2-vcard')), '나중에 → 홈 「비전 만들기 이어서」');
    await click('.v2-vcard [data-v2="vis"]'); ok(/3 \/ 6단계/.test(await T(p, '.v2-prog')), '이어 하기: 3단계부터');
    await click('[data-vis="skip"]'); ok(/1분이면 나만의 비전을 만들 수 있어요/.test(await T(p, '.v2-vcard')) && await p.evaluate(() => LR.lp.vision.skip === true), '건너뛰기 → 홈 작은 카드 「1분이면…」 [시작하기]');
    await p.reload(); await p.waitForTimeout(900); ok(!(await p.$('#v2vis .v2-vis')), '건너뛴 학습자: 다시 접속해도 자동 시작 안 함');
    ok(!errs.length, `390 pageerror 0 ${errs[0] || ''}`); await ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
