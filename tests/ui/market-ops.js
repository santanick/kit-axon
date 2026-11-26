'use strict';
/* 콘텐츠 마켓 v1.1 — 공급 · 운영 화면(개발자 4) 점검: mksell(A5 · A6) · mkcp(A7 + A7-P) · mkops(A8 · A9 · 슬롯 · 오리지널 · 요율 · 매출 · 시범 기관)
   ① 메뉴 · 권한(산타 전용 C6 · 교수자 차단 C5) ② 시범 플래그 게이트(운영 모의: org.mk.pilot) ③ 계산 = spec 10장 · dev-addendum 5장 벡터
   ④ A7 단가표 · 참여 설정 철회 확인 카드 · 월 소진 정산서 ⑤ A9 마진 가드(보너스 7% 통과 · 8% 차단, 개별 임대 31,428,572원) ⑥ 슬롯 신청 → 승인 → 분기 마감(2인 확인) 공제
   ⑦ 요율 변경 확인 카드(다음 달 1일) ⑧ 매출 대시보드 CP 지급 = 분기 마감 CP 몫 ⑨ 시범 기관 켜기 → 메뉴 노출 ⑩ 휴대폰 390 넘침 0 · pageerror 0
   사용: node tests/ui/market-ops.js (필요: playwright). 통합 전에는 index.html에 mksell · mkcp · mkops 태그가 없으면 시험 서버가 boot.js 앞에 넣어 줍니다. */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.webmanifest': 'application/json', '.json': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const MINE = ['marketcalc.js', 'mksell.js', 'mkcp.js', 'mkops.js'];
function indexHtml() { let h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const add = MINE.filter(f => fs.existsSync(path.join(ROOT, f)) && !new RegExp(`src="${f.replace('.', '\\.')}`).test(h)).map(f => `<script src="${f}"></script>`).join('');
  if (add) h = h.replace(/<script src="boot\.js/, add + '<script src="boot.js'); if (fs.existsSync(path.join(ROOT, 'market.css')) && !/market\.css/.test(h)) h = h.replace('</head>', '<link rel="stylesheet" href="market.css"></head>'); return h; }
(async () => {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/index.html') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(indexHtml()); } const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1'); await new Promise(k => srv.once('listening', k));
  const B = `http://127.0.0.1:${srv.address().port}`; const browser = await chromium.launch(); const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.addInitScript(() => { try { localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } }); await p.goto(B + '/index.html', { waitUntil: 'load' });
  const mok = async () => { await p.click('#modal [data-mact="ok"]'); };
  const main = () => p.evaluate(() => document.getElementById('main').innerText);
  const tab = async (menu, key, v) => { await p.evaluate(([m, k, x]) => { UI[k] = x; go(m); render(); }, [menu, key, v]); };

  /* ① 메뉴 · 권한 */
  const A = await p.evaluate(() => { createOrg('univ', '한빛대학교', 'lite'); S.me.role = 'owner'; upgradeState(); const all = Object.values(S.nav.tabs).flat().map(x => x.id); return { has: ['mksell', 'mkcp', 'mkops'].map(id => all.includes(id)), santa: MENU.mkops.santa === true, teach: ['mksell', 'mkcp', 'mkops'].every(id => TEACH_NO.includes(id)), mkx: !!window.MKX, gate: window.mkGate('mkops') }; });
  ok(A.has.every(Boolean) && A.santa && A.teach && A.mkx && A.gate, '메뉴 3개 등록 · mkops 산타 표시 · 교수자 차단 목록 · 공용 도구 ' + JSON.stringify(A));
  await tab('mkops', 'mkops', 'review'); ok(/심사 대기/.test(await main()) && /지역 창업 실전/.test(await main()), 'A8 심사 대기열이 그려짐');
  const T = await p.evaluate(() => { S.me.role = 'teacher'; const v = VIEWS.mkops(); go('mkops'); const where = CUR.tab; const gate = window.mkGate('mkops'); S.me.role = 'owner'; return { v: /산타 관리자만/.test(v), where, gate }; });
  ok(T.v && T.where !== 'mkops' && !T.gate, 'C6 · C5: 교수자는 산타 운영 화면 차단 ' + JSON.stringify(T));

  /* ② 시범 플래그(운영 모의: LIVE + api 가짜) — 꺼진 기관은 메뉴가 빠지고 화면도 닫힘 · 산타 아님 → mkops 닫힘 */
  const G = await p.evaluate(async () => { const calls = []; window.LIVE = { tenant: { tid: 'tn_x' }, user: { email: 'a@x.kr', santa: false }, cfg: {} }; window.api = async (m, u, b) => { calls.push([m, u, b]); return { items: [] }; };
    S.org.mk = {}; upgradeState(); const ids = Object.values(S.nav.tabs).flat().map(x => x.id); const off = { cp: VIEWS.mkcp(), ops: VIEWS.mkops(), sell: VIEWS.mksell(), menu: ['mksell', 'mkcp', 'mkops'].filter(id => ids.includes(id)) };
    S.org.mk = { pilot: true, cp: true, seller: true }; LIVE.user.santa = true; upgradeState(); const ids2 = Object.values(S.nav.tabs).flat().map(x => x.id); VIEWS.mkcp(); await new Promise(k => setTimeout(k, 30));
    const on = { menu: ['mksell', 'mkcp', 'mkops'].filter(id => ids2.includes(id)), urls: calls.map(c => c[1]) }; delete window.LIVE; delete window.api; S.org.mk = {}; upgradeState(); return { off: { cp: /시범 기관에서만/.test(off.cp), ops: /산타 관리자만/.test(off.ops), sell: /시범 기관에서만/.test(off.sell), menu: off.menu }, on }; });
  ok(G.off.cp && G.off.ops && G.off.sell && G.off.menu.length === 0, '시범 아님 · 산타 아님(운영): 화면 닫힘 · 메뉴 없음 ' + JSON.stringify(G.off));
  ok(G.on.menu.join() === 'mksell,mkcp,mkops' && G.on.urls.some(u => /\/api\/market\/cp\/optin/.test(u)), '시범 + CP + 산타(운영): 메뉴 3개 · /api/market/cp/* 호출 ' + JSON.stringify(G.on));

  /* ③ 계산 벡터(스텁 또는 marketcalc.js) */
  const V = await p.evaluate(() => { const c = MKX.calc; const g1 = c('creditQuote', 30000000, 700), g2 = c('creditQuote', 30000000, 800), g3 = c('creditQuote', 30000000, 0), e3 = c('creditQuote', 30000000, 300); const sq = c('singleQuote', 30000000, 22000000);
    return { C: [c('creditsOf', 30000), c('creditsOf', 42500), c('creditsOf', 49900)], B: [c('bonusBpOf', 30000000, true), c('bonusBpOf', 30000000, false), c('bonusBpOf', 5000000, false), c('bonusBpOf', 50000000, false), c('bonusBpOf', 29990000, false)], G: [g1.cpMax, g1.santaBp, g1.ok, g2.santaBp, g2.ok, g3.cpMax, g3.santaBp, e3.santaBp], V1: c('volCharge', 50000, 500, 1000, 600), I3: sq.minBudget, M1: [c('monthCp', 1800, 60).cp, c('monthCp', 700, 40).cp, c('monthCp', 3, 0).cp], O: [c('optinMinUntil', '2027-03-01'), c('creditFrom', '2027-05-01', 6), c('nextMonth1', '2027-11-15')],
      R: [c('settleLine', 1000, 6000).cp, c('settleLine', 1000, 5000).santa], P: [c('promoFee', 'home_top', 2), JSON.stringify(c('promoDeduct', 600000, 1000000, 0)), JSON.stringify(c('promoDeduct', 2000000, 0, 400000))], O2: [c('origCapOk', 20, 6), c('origCapOk', 20, 5)], R8: c('santaMix', [{ source: 'a', credits: 300, cpBp: 6500 }, { source: 'b', credits: 200, cpBp: 6000 }, { source: 'o', credits: 100, cpBp: 0 }]).santaBp }; });
  ok(V.C.join() === '30,43,50' && V.B.join() === '700,300,0,700,0', 'C1~C3 · B 보너스율 ' + JSON.stringify([V.C, V.B]));
  ok(V.G.join() === '20865000,3045,true,2980,false,19500000,3500,3305', 'G1~G3 · E3 마진 가드 ' + JSON.stringify(V.G));
  ok(V.V1 === 29495 && V.I3 === 31428572 && V.M1.join() === '1131000,429000,1950', 'V1 · I3 · M1 ' + JSON.stringify([V.V1, V.I3, V.M1]));
  ok(V.O.join() === '2028-03-01,2027-11-01,2027-12-01', 'O1 · O2 · P1 날짜 ' + JSON.stringify(V.O));
  ok(V.R.join() === '600000,500000' && V.P[0] === 1000000 && V.P[1] === '{"deduct":600000,"pay":0,"carryOut":400000}' && V.P[2] === '{"deduct":400000,"pay":1600000,"carryOut":0}' && V.O2.join() === 'false,true' && V.R8 === 4750, 'dev-addendum R2 · R4 · P1 · P4 · P5 · O2 · O3 · R8 ' + JSON.stringify(V));

  /* ④ A7 CP 포털 */
  await tab('mkcp', 'mkcp', 'price'); let t = await main(); ok(/= 50크레딧/.test(t) && /= 43크레딧/.test(t) && /500명째 수강부터 −10% → 45크레딧/.test(t) && /적용 요율 65%\(표준\)/.test(t), 'A7 단가표: 크레딧 환산 · 수량 할인 · 적용 요율 줄');
  await p.click('[data-act="mk-cp-price"][data-v="cp_p1"]'); await p.fill('#modal [name=lp]', '70000'); await mok(); ok(await p.evaluate(() => !!document.getElementById('modal') && S.mkcpD.products[0].listPrice === 50000), '정가 30% 초과 인상 → 막힘(mk_price_step)');
  await p.fill('#modal [name=lp]', '60000'); await mok(); const P1 = await p.evaluate(() => ({ ...S.mkcpD.products[0].pending, nm: MKX.calc('nextMonth1', today()) })); ok(P1 && P1.listPrice === 60000 && P1.from === P1.nm, '단가 변경은 다음 달 1일부터 ' + JSON.stringify(P1));
  await tab('mkcp', 'mkcp', 'optin'); await p.click('[data-act="mk-cp-optin"][data-v="cp_p1"][data-m="single"]'); ok(/최소 참여 기간\(.+까지\) 안의 철회입니다.*3곳은 계약 기간 끝까지/.test(await p.innerText('#modal')), 'A7 참여 설정: 최소 기간 안 철회 확인 카드(이용 중 3곳)'); await mok();
  ok(await p.evaluate(() => S.mkcpD.products[0].mode === 'single'), '철회 반영');
  await tab('mkcp', 'mkcp', 'settle'); t = await main(); ok(/순소진 1,740크레딧 · 지급 1,131,000원/.test(t) && /5건 미만/.test(t), 'A7 월 소진 정산서 M1 합계 · 5건 미만 가림');
  await tab('mkcp', 'mkcp', 'inbox'); await p.click('[data-act="mk-cp-decide"][data-v="rq_1"][data-ok="1"]'); await mok(); ok(await p.evaluate(() => S.mkcpD.requests[0].status === 'ok'), 'A7 승인 요청 수락(확인 카드)');

  /* ⑥ 슬롯 신청 → 승인 → 분기 마감 공제(2인 확인) */
  await tab('mkcp', 'mkcp', 'promo'); await p.selectOption('[data-chg="mk-promo-p"]', 'cp_p2'); await p.click('[data-act="mk-promo-ask"]'); ok(/분기 지급액에서 공제/.test(await p.innerText('#modal')), 'A7-P 신청 확인 카드'); await mok();
  const pr = await p.evaluate(() => S.mkopsD.promos.find(x => x.productId === 'cp_p2')); ok(pr && pr.status === 'asked' && pr.fee === 500000, '신청 생성(승인 대기) ' + JSON.stringify(pr));
  await tab('mkops', 'mkops', 'promo'); await p.click(`[data-act="mk-promo-decide"][data-v="${pr.id}"][data-ok="1"]`); await mok(); ok(await p.evaluate(id => S.mkopsD.promos.find(x => x.id === id).status === 'ok', pr.id), 'A8-P 슬롯 승인');
  const pay0 = await p.evaluate(() => { const O = S.mkopsD; const Q = window.mkopsLastQ(); return { cp: window.mkopsMonthLines(Q.months).filter(l => l.cpTid !== 'santa').reduce((s, l) => s + l.cp, 0) }; });
  await tab('mkops', 'mkops', 'close'); t = await main(); ok(/이의 미처리 0건\(지금 1건\)/.test(t) && await p.$eval('.mk-side [data-act="mk-close-run"]', b => b.disabled), '분기 마감: 미처리 이의가 있으면 실행 불가');
  await tab('mkops', 'mkops', 'dispute'); await p.click('[data-act="mk-dispute-decide"][data-ok="1"]'); await p.fill('#modal [name=m]', '학과 이동 확인'); await mok();
  await tab('mkops', 'mkops', 'close'); const payTxt = await p.getAttribute('[data-close-pay]', 'data-close-pay'); await p.click('.mk-side [data-act="mk-close-run"]'); await mok();
  await p.click('[data-act="mk-close-confirm"]'); await mok(); ok(await p.evaluate(() => !!document.getElementById('modal') && S.mkopsD.closes[0].status === 'run'), '같은 운영자 확정 → 막힘(mk_close_same_user)');
  await p.fill('#modal [name=u]', 'ops2@santa.kr'); await mok(); const CL = await p.evaluate(() => { const c = S.mkopsD.closes[0]; return { st: c.status, pay: c.snap.t.pay, cp: c.snap.t.cp, ded: c.snap.t.deduct, lw: c.snap.cps.find(x => x.cpTid === 'cp_lw') }; });
  ok(CL.st === 'confirmed' && CL.cp === pay0.cp && CL.pay === +payTxt && CL.ded > 0 && CL.lw.deduct === 300000, '2인 확인 확정 · CP 몫 = 월 정산 합 · 슬롯 공제(러닝웍스 진열대 30만) ' + JSON.stringify(CL));
  ok(/지급 지시 파일/.test(await main()), '확정 후 지급 지시 파일까지(실제 송금 없음)');

  /* ⑤ A9 마진 가드 */
  await tab('mkops', 'mkops', 'credit'); await p.fill('[name=crb]', '한빛대학교'); await p.dispatchEvent('[name=crb]', 'change'); await p.selectOption('[data-k="bundle"]', '1'); t = await main(); ok(/30\.45%\(보너스 7%\) — 통과/.test(t), 'G1 보너스 7% 통과 문구');
  await p.fill('[name=crp]', '8'); await p.dispatchEvent('[name=crp]', 'change'); t = await main(); ok(/30% 미만이라 계약을 만들 수 없습니다. 보너스는 최대 7%/.test(t) && /29\.80%/.test(t) && await p.$eval('[data-act="mk-cr-make"]', b => b.disabled), 'G2 보너스 8% 차단 · 버튼 비활성 · 예외 버튼 없음');
  await p.fill('[name=crp]', '3'); await p.dispatchEvent('[name=crp]', 'change'); await p.click('[data-act="mk-cr-make"]'); await p.click('[data-act="mk-cr-confirm"]'); ok(/세금계산서 발행 대기/.test(await p.innerText('#modal')), '계약 확정 = 세금계산서 발행 대기(확인 카드)'); await mok();
  await tab('mkops', 'mkops', 'quote'); t = await main(); ok(/31,428,572원 이상으로/.test(t) && /예외 승인이 없습니다/.test(t) && !/예외 승인하기|가드 해제/.test(t), 'I3 개별 임대 마진 가드 · 해결 3안');

  /* ⑦ 요율 · ⑧ 대시보드 */
  await tab('mkops', 'mkops', 'rate'); await p.click('[data-act="mk-rate-set"][data-v="cp_lw"]'); await mok(); ok(await p.evaluate(() => !!document.getElementById('modal')), '동의 번호 없으면 요율 변경 불가(mk_cp_rate)');
  await p.selectOption('#modal [name=k]', 'agency'); await p.fill('#modal [name=a]', 'AG-TEST-1'); await mok(); await p.waitForTimeout(50); ok(/부터 적용.*월 소진분은 기존 요율/.test(await p.innerText('#modal')), '요율 변경 확인 카드(다음 달 1일 · 소급 없음)'); await mok();
  ok(await p.evaluate(() => S.mkopsD.rates.some(r => r.cpTid === 'cp_lw' && r.cpBp === 5500 && r.effectiveFrom === MKX.calc('nextMonth1', today()))), '요율 행 추가(다음 달 1일)');
  await tab('mkops', 'mkops', 'rev'); const RV = await p.evaluate(() => { const r = window.mkopsRev(); return { cp: r.cpCredit, src: r.bySource.map(s => s.source), rec: r.rec, face: window.mkopsMonthLines(window.mkopsLastQ().months).reduce((a, l) => a + l.net * 1000, 0) }; });
  ok(RV.cp === CL.cp && RV.src.includes('credit_orig') && RV.src.includes('promo') && RV.rec > 0 && RV.rec < RV.face, 'A9-V 매출 대시보드 크레딧 CP 지급 = 분기 마감 CP 몫 ' + JSON.stringify(RV));
  t = await main(); ok(/인식 매출/.test(t) && /수익원별 산타 몫/.test(t) && /요율별 소진/.test(t) && /산타 오리지널\(100%\)/.test(t) && await p.$$eval('svg.mk-chart', x => x.length) === 2, '대시보드: 인식 매출 주 숫자 · 표 · 차트 2개(금액 · 비율)');
  await tab('mkops', 'mkops', 'orig'); await p.click('.ph [data-act="mk-orig-new"]'); await p.click('[data-act="mk-orig-f"][data-k="src"][data-ai="1"]');
  ok(await p.$eval('[data-act="mk-orig-f"][data-v="col_job"]', b => b.classList.contains('off')) && /33\.3%/.test(await main()), 'O2 비중 30% 초과 컬렉션은 선택 불가(7/21 33.3%)');
  await p.click('[data-act="mk-orig-f"][data-v="col_basic"]'); ok(await p.$eval('[data-act="mk-orig-save"]', b => b.disabled) && /사실 확인 경고가 남아/.test(await main()), 'AI 생성: 사실 확인 경고가 남으면 [등록] 비활성');
  await p.check('[data-chg="mk-orig-f"][data-k="ack"]'); ok(/= 15크레딧/.test(await main()) && !(await p.$eval('[data-act="mk-orig-save"]', b => b.disabled)), '「확인함」 체크 후 등록 가능 · O1 15,000원 = 15크레딧');
  await p.click('[data-act="mk-orig-save"]'); ok(await p.evaluate(() => S.mkopsD.originals.length === 2 && S.mkopsD.originals[0].srcKind === 'ai'), 'O1 · O3 오리지널 등록');

  /* ⑨ 시범 기관 켜기 */
  await tab('mkops', 'mkops', 'pilot'); await p.click('[data-act="mk-pilot-set"][data-v="self"][data-k="pilot"]'); ok(/마켓 메뉴가.*학습자 화면에 크레딧 진열대/.test(await p.innerText('#modal')), '시범 기관 켜기 확인 카드'); await mok();
  ok(await p.evaluate(() => S.org.mk && S.org.mk.pilot === true), '시범 플래그 켜짐(org.mk.pilot)');
  await p.click('[data-act="mk-pilot-set"][data-v="tn_demo_life"][data-k="pilot"]'); await mok(); ok(await p.evaluate(() => S.mkopsD.orgs.find(o => o.tid === 'tn_demo_life').pilot === true), '다른 기관 시범 켜기');

  /* A5 판매 상품 등록 */
  await tab('mksell', 'mksell', 'new'); await p.click('[data-act="mk-prod-pick"]'); await p.click('[data-act="mk-prod-ai"]'); ok(await p.$eval('[data-act="mk-prod-submit"]', b => b.disabled) && /기관 판매 상품은 개별 판매 · 중개로 판매됩니다/.test(await main()), 'A5 보완 2건 전 제출 불가 · 크레딧 참여 선택지 없음');
  for (const k of ['pii', 'link']) await p.click(`[data-act="mk-prod-check"][data-v="${k}"]`); await p.click('[data-act="mk-prod-submit"]'); ok(await p.evaluate(() => S.mksellD.items[0].status === 'review'), 'A5 심사 제출');

  /* ⑩ 휴대폰 390 · 넘침 */
  await p.setViewportSize({ width: 390, height: 844 }); const OV = [];
  for (const [m, k, v] of [['mkops', 'mkops', 'review'], ['mkops', 'mkops', 'quote'], ['mkops', 'mkops', 'credit'], ['mkops', 'mkops', 'close'], ['mkops', 'mkops', 'rev'], ['mkops', 'mkops', 'pilot'], ['mkcp', 'mkcp', 'home'], ['mkcp', 'mkcp', 'settle'], ['mkcp', 'mkcp', 'promo'], ['mksell', 'mksell', 'items']]) { await tab(m, k, v); const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > 392) OV.push(`${m}/${v}:${w}`); }
  ok(!OV.length, '휴대폰 390 가로 넘침 0 ' + OV.join(' '));
  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); console.log(`market-ops: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
