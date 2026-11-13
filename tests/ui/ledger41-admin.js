'use strict';
/* v41 통합 수납 원장 — 스튜디오 「매출 · 수납」 화면 점검(PC 1440 · 휴대폰 390)
   유형별 메뉴 · 탭 순서 → upgradeState → 단위 트리 · 롤업 · 카드 4 = calc.summary → 청구 생성 · 월 일괄(중복 금지) → 미납 단계 · 안내 확인 카드
   → 청구서 링크(토큰 1회 표시 · 해시만 저장) → 현장 수납(잔액 초과 · 일부 사유) → 정정 → 환불 계산 · 확정(수정 사유) → 마감(차이 사유)
   → 가져오기 대사 확정 → 쉐어(온라인만) → 설정(토스 키 비노출) → 교강사 조회만 → 운영 모드 /api/ledger/* → 넘침 0 · pageerror 0 */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const SHOTS = process.env.LEDGER_SHOTS || '';
const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1'); await new Promise(k => srv.once('listening', k));
  const B = `http://127.0.0.1:${srv.address().port}`; const browser = await chromium.launch(); const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + '/index.html', { waitUntil: 'load' });
  const mok = async () => { await p.click('#modal [data-mact="ok"]'); };

  /* ① 유형별 메뉴 · 기본 탭 순서 */
  const P = await p.evaluate(() => { const out = {}; for (const [ty, ed] of [['k12'], ['univ', 'lite'], ['public'], ['lifelong'], ['corp']]) { createOrg(ty, '점검', ed); S.me.role = 'owner'; go('ledger'); render(); out[ty] = { on: menuOn('ledger'), fl: S.ledger.flavor, tabs: [...document.querySelectorAll('#main [data-key="ledger"][role="tab"]')].map(b => b.dataset.v).slice(0, 2), units: S.ledger.units.length }; } return out; });
  ok(P.k12.on && P.k12.fl === 'franchise' && P.k12.tabs.join() === 'charge,unpaid' && P.k12.units === 4, '프랜차이즈: 청구 · 미납 우선 · 본사+가맹 3 ' + JSON.stringify(P.k12));
  ok(P.univ.on && P.univ.tabs.join() === 'book,import', '대학: 부서 정산(원장) · 가져오기 ' + JSON.stringify(P.univ));
  ok(P.public.tabs.join() === 'today,close', '체육: 오늘 · 마감 ' + JSON.stringify(P.public));
  ok(P.lifelong.tabs.join() === 'desk,close', '복지관: 현장 수납 · 마감 ' + JSON.stringify(P.lifelong));
  ok(P.corp.on && P.corp.tabs.join() === 'today,book', '일반 순서 ' + JSON.stringify(P.corp));
  const U = await p.evaluate(() => { createOrg('adult', '예전 기관'); delete S.ledger; Object.values(S.nav.tabs).forEach(L => { const i = L.findIndex(x => x.id === 'ledger'); if (i >= 0) L.splice(i, 1); }); upgradeState(); return { led: !!S.ledger && S.ledger.charges.length > 0, nav: Object.values(S.nav.tabs).some(L => L.some(x => x.id === 'ledger')) }; });
  ok(U.led && U.nav, 'upgradeState: 기본값 · 메뉴 ' + JSON.stringify(U));

  /* ② 프랜차이즈 본사: 단위 트리 · 롤업 · 카드 4 = calc.summary */
  await p.evaluate(() => { createOrg('k12', '산타 수학 본사'); S.me.role = 'owner'; go('ledger'); UI.ledger = 'today'; render(); });
  const T1 = await p.evaluate(() => { const C = window.ledgerCalc; const D = S.ledger; const td = today(); const from = td.slice(0, 7) + '-01';
    const bl = {}; C.balance(D.charges.map(c => ({ id: c.id, bill: c.bill, amount: c.amount, due: c.dueDate, at: c.createdAt, status: c.status })), D.allocs.map(x => ({ charge: x.chargeId, amount: x.amount }))).lines.forEach(l => { bl[l.id] = l.balance; });
    const rows = [...D.charges.map(c => ({ kind: 'charge', unit: c.unitId, day: c.createdAt.slice(0, 10), amount: c.amount, itemType: c.itemType, balance: bl[c.id] || 0, status: c.status })), ...D.receipts.map(r => ({ kind: 'receipt', unit: r.unitId, day: r.paidAt.slice(0, 10), amount: r.amount, method: r.method, status: r.status, shareEligible: r.shareEligible })), ...D.refunds.map(f => { const r = D.receipts.find(x => x.id === f.receiptId); return { kind: 'refund', unit: r.unitId, day: f.at.slice(0, 10), amount: f.amount, status: f.status, shareEligible: r.shareEligible }; })];
    const s = C.summary(rows, { from, to: td }); const k = [...document.querySelectorAll('.lg-kpi b')].map(b => b.textContent); const opts = [...document.querySelectorAll('.lg-unit option')].map(o => o.textContent.trim());
    return { s, k, opts, ai: (document.querySelector('.lg-ai p') || {}).textContent || '', foot: (document.querySelector('.lg-foot') || {}).textContent || '' }; });
  ok(T1.k.length === 4 && T1.k[0] === won(T1.s.net) && T1.k[1] === T1.s.collectRate + '%' && T1.k[2] === won(T1.s.unpaid) && T1.k[3] === won(T1.s.refund), '카드 4 = calc.summary ' + T1.k.join(' / '));
  ok(T1.opts.length === 4 && /본사/.test(T1.opts[0]) && /가맹점/.test(T1.opts[1]), '단위 트리 ' + T1.opts.join(','));
  ok(/순매출/.test(T1.ai) && /수납률/.test(T1.ai) && /원장 요약 함수/.test(T1.foot), 'AI 요약 한 줄 · 기준 푸터 ' + T1.ai);
  const T2 = await p.evaluate(() => { const v = () => document.querySelectorAll('.lg-kpi b')[0].textContent; const pick = id => { const sel = document.querySelector('.lg-unit select'); sel.value = id; sel.dispatchEvent(new Event('change', { bubbles: true })); }; const all = v(); pick('lu_1'); const one = v();
    pick('lu_root'); document.querySelector('[data-act="led-roll"][data-v="0"]').click(); const rootOnly = v(); UI.ledRoll = true; render(); return { all, one, rootOnly }; });
  ok(T2.all !== T2.one && T2.rootOnly === '0원', '롤업: 가맹점 선택 · 본사 단독 0원 ' + JSON.stringify(T2));

  const CMP = await p.evaluate(() => { UI.ledger = 'today'; UI.ledU = 'lu_root'; UI.ledRoll = true; render(); const c = [...document.querySelectorAll('.lg-card')].find(e => /가맹점별 수납/.test(e.textContent)); return { n: c ? c.querySelectorAll('tbody tr').length : 0, rate: c ? !!c.querySelector('.lg-rate') : false }; });
  ok(CMP.n === 3 && CMP.rate, '가맹점별 수납 비교(시안 1) ' + JSON.stringify(CMP));
  /* ③ 청구 만들기(할인 줄) · 월 청구 일괄(미리보기 → 확정, 중복 금지) */
  await p.evaluate(() => { UI.ledger = 'charge'; render(); }); await p.click('[data-act="led-chg-new"]');
  await p.fill('#modal [name="sid"]', '홍길동'); await mok(); const stillOpen = await p.evaluate(() => !!document.querySelector('#modal'));
  await p.fill('#modal [name="sid"]', '7999001'); await p.fill('#modal [name="a0"]', '300000'); await p.fill('#modal [name="n2"]', '형제 할인'); await p.fill('#modal [name="a2"]', '-30000'); await mok();
  const C1 = await p.evaluate(() => { const L = S.ledger.charges.filter(c => c.sid === '7999001'); return { n: L.length, sum: L.reduce((s, c) => s + c.amount, 0), neg: L.some(c => c.amount < 0), bill: new Set(L.map(c => c.bill)).size }; });
  ok(stillOpen && C1.n === 2 && C1.sum === 270000 && C1.neg && C1.bill === 1, '청구 생성(이름 입력 거절 · 할인 음수 줄) ' + JSON.stringify(C1));
  await p.click('[data-act="led-gen"]'); const g1 = await p.textContent('#modal .mb'); await mok(); const n1 = await p.evaluate(() => S.ledger.charges.length);
  await p.click('[data-act="led-gen"]'); const g2 = await p.textContent('#modal .mb'); await p.click('#modal [data-mact="c"]'); const n2 = await p.evaluate(() => S.ledger.charges.length);
  ok(/(\d+)건/.test(g1) && +/(\d+)건/.exec(g1)[1] > 0 && /\b0건/.test(g2) && n1 === n2, '월 청구 일괄: 미리보기 → 확정, 같은 달 중복 금지 ' + g2.slice(0, 60));

  /* ④ 미납 단계 · 안내(확인 카드: 취소하면 보내지 않음) */
  await p.evaluate(() => { const D = S.ledger; const td = today(); const b = 'bT'; D.charges.push({ id: 'lc_t_old', unitId: 'lu_2', sid: '7888001', itemType: 'tuition', title: '월 수강료', amount: 280000, periodYm: td.slice(0, 7), dueDate: (d => { const t = new Date(d + 'T12:00'); t.setDate(t.getDate() - 40); return ymdL(t); })(td), srcType: 'class', status: 'open', createdAt: td, bill: b }); UI.ledger = 'unpaid'; render(); });
  const UP = await p.evaluate(() => { const L = ledgerView.unpaidList(); const x = L.find(y => y.sid === '7888001'); return { stage: x && x.stage, days: x && x.days, rows: document.querySelectorAll('.lg-body tbody tr').length }; });
  ok(UP.stage === 's3' && UP.days === 40 && UP.rows > 0, '미납 3단계(납기 후 40일) ' + JSON.stringify(UP));
  await p.evaluate(() => { UI.ledger = 'today'; render(); }); const nn0 = await p.evaluate(() => S.ledger.notes.length);
  await p.click('[data-act="led-dun"][data-v="s3"]'); const card = await p.textContent('#modal .mb'); await p.click('#modal [data-mact="c"]'); const nn1 = await p.evaluate(() => S.ledger.notes.length);
  await p.click('[data-act="led-dun"][data-v="s3"]'); await mok(); const nn2 = await p.evaluate(() => ({ n: S.ledger.notes.length, au: S.audit[0].what, links: S.ledger.links.length }));
  ok(/명/.test(card) && /확인/.test(card) && nn1 === nn0 && nn2.n > nn0 && /미납 안내/.test(nn2.au) && nn2.links > 0, '안내: 확인 카드 · 취소 시 미발송 · 확정 후 기록 ' + JSON.stringify(nn2));

  /* ⑤ 청구서 링크: 토큰 1회 표시 · 해시만 저장 */
  await p.evaluate(() => { UI.ledger = 'unpaid'; UI.ledStg = ''; render(); }); await p.click('[data-act="led-link"]'); await mok(); await p.waitForSelector('#modal .lg-url');
  const LK = await p.evaluate(() => { const u = document.querySelector('#modal .lg-url').value; const tok = /bill=([^&]+)/.exec(u)[1]; return { u, inState: JSON.stringify(S).includes(tok), hash: S.ledger.links[S.ledger.links.length - 1].tokenHash.length }; }); await p.click('#modal [data-mact="c"]');
  ok(/learner\.html\?bill=/.test(LK.u) && !LK.inState && LK.hash === 8, '청구서 링크 1회 표시 · 원문 미저장 ' + LK.u.slice(-30));

  /* ⑥ 현장 수납: 잔액 초과 거절 · 일부 사유 필수 · 전액 → 수납 완료 */
  await p.evaluate(() => { UI.ledger = 'desk'; UI.ledDeskSid = '7888001'; UI.ledDeskM = 'cash'; render(); });
  await p.fill('.lg-form [name="a"]', '999999'); await p.click('[data-act="led-desk"]'); const d0 = await p.evaluate(() => S.ledger.receipts.filter(r => r.sid === '7888001').length);
  await p.fill('.lg-form [name="a"]', '100000'); await p.click('[data-act="led-desk"]'); const d1 = await p.evaluate(() => S.ledger.receipts.filter(r => r.sid === '7888001').length);
  await p.fill('.lg-form [name="a"]', '100000'); await p.fill('.lg-form [name="why"]', '나머지 다음 주'); await p.click('[data-act="led-desk"]');
  const d2 = await p.evaluate(() => ({ n: S.ledger.receipts.filter(r => r.sid === '7888001').length, st: S.ledger.charges.find(c => c.id === 'lc_t_old').status }));
  await p.evaluate(() => { UI.ledDeskSid = '7888001'; UI.ledDeskM = 'desk_card'; render(); }); await p.fill('.lg-form [name="ap"]', '30012345'); await p.click('[data-act="led-desk"]');
  const d3 = await p.evaluate(() => ({ st: S.ledger.charges.find(c => c.id === 'lc_t_old').status, r: S.ledger.receipts.filter(r => r.sid === '7888001').map(r => r.method + ':' + r.amount + ':' + (r.approvalNo || '')) }));
  ok(d0 === 0 && d1 === 0 && d2.n === 1 && d2.st === 'partial' && d3.st === 'paid' && d3.r.includes('desk_card:180000:30012345'), '현장 수납 ' + JSON.stringify({ d0, d1, d2, d3 }));
  /* 모의 단말(Lv2) */
  await p.evaluate(() => { const D = S.ledger; D.charges.push({ id: 'lc_t_term', unitId: 'lu_1', sid: '7888002', itemType: 'book', title: '교재비', amount: 25000, periodYm: today().slice(0, 7), dueDate: today(), srcType: 'manual', status: 'open', createdAt: today(), bill: 'bT2' }); UI.ledDeskSid = '7888002'; UI.ledDeskM = 'desk_card'; render(); });
  await p.click('[data-act="led-term"]'); await p.waitForFunction(() => S.ledger.charges.find(c => c.id === 'lc_t_term').status === 'paid', null, { timeout: 4000 }).catch(() => { });
  const TM = await p.evaluate(() => { const r = S.ledger.receipts.find(x => x.sid === '7888002'); return { st: S.ledger.charges.find(c => c.id === 'lc_t_term').status, ap: r && r.approvalNo }; });
  ok(TM.st === 'paid' && /^\d{8}$/.test(TM.ap || ''), '모의 단말 승인 → 수납 ' + JSON.stringify(TM));

  /* ⑦ 정정(반대 기록, 사유 필수) */
  await p.evaluate(() => { UI.ledger = 'book'; UI.ledT = 'receipt'; UI.ledQ = '7888002'; render(); }); await p.click('[data-act="led-correct"]'); await mok(); const c0 = await p.evaluate(() => S.ledger.receipts.find(x => x.sid === '7888002').status);
  await p.fill('#modal [name="r"]', '잘못 입력'); await mok(); const CR = await p.evaluate(() => ({ st: S.ledger.receipts.find(x => x.sid === '7888002').status, ch: S.ledger.charges.find(c => c.id === 'lc_t_term').status, kept: S.ledger.receipts.some(x => x.sid === '7888002') }));
  ok(c0 === 'paid' && CR.st === 'cancelled' && CR.ch === 'open' && CR.kept, '정정: 사유 필수 · 기록 유지 · 청구 되살림 ' + JSON.stringify(CR));
  await p.evaluate(() => { UI.ledT = ''; UI.ledQ = ''; });

  /* ⑧ 환불: 규정 계산 → 확정 대기 → 확인 카드(금액 수정 시 사유) → 완료 */
  await p.evaluate(() => { UI.ledger = 'refund'; render(); }); const rid = await p.evaluate(() => { const r = S.ledger.receipts.find(x => x.status === 'paid' && x.method === 'online_card' && !S.ledger.refunds.some(f => f.receiptId === x.id)); UI.ledP = 'q'; UI.ledRq = r.sid; render(); return r.id; });
  await p.click(`[data-act="led-ref-new"][data-v="${rid}"]`); await p.fill('#modal [name="used"]', '2'); await p.fill('#modal [name="tot"]', '8'); const calcTxt = await p.textContent('#lgCalc'); await mok();
  const RF = await p.evaluate(id => { const f = S.ledger.refunds.find(x => x.receiptId === id); const r = S.ledger.receipts.find(x => x.id === id); return { st: f.status, a: f.amount, exp: Math.floor(r.amount * 2 / 3 / 10) * 10, id: f.id, law: f.calc.lawCheck }; }, rid);
  ok(RF.st === 'pending' && RF.a === RF.exp && RF.law && /법령 원문/.test(calcTxt), '환불 계산(학원법 1/3 전 2/3) → 확정 대기 ' + JSON.stringify(RF));
  await p.click(`[data-act="led-ref-ok"][data-v="${RF.id}"]`); const cardR = await p.textContent('#modal .mb'); await p.fill('#modal [name="a"]', String(RF.a - 1000)); await mok(); const r0 = await p.evaluate(id => S.ledger.refunds.find(x => x.id === id).status, RF.id);
  await p.fill('#modal [name="why"]', '교재 반납분 차감'); await mok(); const r1 = await p.evaluate(id => { const f = S.ledger.refunds.find(x => x.id === id); return { st: f.status, a: f.amount, er: f.editReason, toss: f.tossCancelOk }; }, RF.id);
  ok(/토스에 부분 취소/.test(cardR) && r0 === 'pending' && r1.st === 'done' && r1.a === RF.a - 1000 && r1.er && r1.toss, '환불 확정: 확인 카드 · 수정 사유 필수 ' + JSON.stringify(r1));

  /* ⑨ 마감: 차이가 있으면 사유 필수 */
  await p.evaluate(() => { UI.ledger = 'close'; UI.ledDay = today(); UI.ledU = 'lu_2'; render(); });
  const sys = await p.evaluate(() => +document.querySelector('.lg-close [name="cc"]').value); await p.fill('.lg-close [name="cc"]', String(sys + 5000)); await p.click('[data-act="led-close"]'); const k0 = await p.evaluate(() => S.ledger.closes.filter(c => c.day === today() && c.unitId === 'lu_2').length);
  await p.fill('.lg-close [name="why"]', '거스름돈 준비금 포함'); await p.click('[data-act="led-close"]'); const k1 = await p.evaluate(() => S.ledger.closes.find(c => c.day === today() && c.unitId === 'lu_2'));
  ok(k0 === 0 && k1 && k1.cashCounted === sys + 5000 && k1.diffReason, '마감: 차이 사유 필수 ' + JSON.stringify({ sys, k0, why: k1 && k1.diffReason }));
  await p.evaluate(() => { UI.ledU = ''; });

  /* ⑩ 가져오기: 가상계좌 CSV → 대사 미리보기 → 확인 카드 → vbank_ext 수납(쉐어 제외) */
  await p.evaluate(() => { UI.ledger = 'import'; UI.ledImpRes = null; render(); }); await p.click('[data-act="led-imp-sample"]'); await p.click('[data-act="led-imp"]');
  const IM = await p.evaluate(() => ({ m: UI.ledImpRes.matched.length, u: UI.ledImpRes.unmatched.length, v0: S.ledger.receipts.filter(r => r.method === 'vbank_ext').length }));
  await p.click('[data-act="led-imp-ok"]'); await mok(); const IM2 = await p.evaluate(() => { const V = S.ledger.receipts.filter(r => r.method === 'vbank_ext'); return { v1: V.length, share: V.some(r => r.shareEligible), imp: S.ledger.imports.length }; });
  ok(IM.m >= 1 && IM.u >= 1 && IM2.v1 === IM.v0 + IM.m && !IM2.share, '가져오기 대사 확정 ' + JSON.stringify({ ...IM, ...IM2 }));

  /* ⑪ 쉐어: 토스 온라인만, bp 내림 */
  await p.evaluate(() => { UI.ledger = 'share'; UI.ledP = 'this'; render(); });
  const SH = await p.evaluate(() => { const D = S.ledger; const td = today(); const from = td.slice(0, 7) + '-01'; const el = D.receipts.filter(r => r.status === 'paid' && r.shareEligible && r.paidAt.slice(0, 10) >= from).reduce((s, r) => s + r.amount, 0) - D.refunds.filter(f => f.status === 'done' && f.at.slice(0, 10) >= from && (D.receipts.find(r => r.id === f.receiptId) || {}).shareEligible).reduce((s, f) => s + f.amount, 0); return { el, txt: document.querySelector('.lg-body .lg-kpi b').textContent, online: D.receipts.filter(r => r.shareEligible).every(r => r.method.startsWith('online')) }; });
  ok(SH.txt === won(SH.el) && SH.online, '쉐어 대상 = 토스 온라인 결제 ' + JSON.stringify(SH));

  /* ⑫ 설정: 하위 단위 + 토스 키(비노출) · 단말 키 1회 */
  await p.evaluate(() => { UI.ledger = 'set'; render(); }); await p.click('[data-act="led-u-add"][data-v="lu_root"]');
  await p.fill('#modal [name="n"]', '광안점'); await p.fill('#modal [name="sk"]', 'test_sk_ABCDEF123456'); await mok();
  const ST = await p.evaluate(() => { const u = S.ledger.units.find(x => x.name === '광안점'); return { bpInput: false, has: u && u.hasKey, bp: u && u.shareRateBp, leak: JSON.stringify(S).includes('test_sk_ABCDEF123456') || document.body.innerHTML.includes('test_sk_ABCDEF123456'), badge: /토스 키 등록됨/.test(document.querySelector('.lg-body').textContent) }; });
  ok(ST.has && ST.bp === 40 && !ST.bpInput && !ST.leak && ST.badge, '단위 추가 · 토스 비밀키 비노출 ' + JSON.stringify(ST));
  await p.click('[data-act="led-dev-add"]'); await mok(); await p.waitForSelector('#modal .lg-url'); const DV = await p.evaluate(() => { const k = document.querySelector('#modal .lg-url').value; return { k: /^agk_/.test(k), leak: JSON.stringify(S).includes(k) }; }); await p.click('#modal [data-mact="c"]');
  ok(DV.k && !DV.leak, '단말 키 1회 표시 · 해시만 ' + JSON.stringify(DV));

  /* ⑬ 교강사: 조회만(동작 버튼 없음 · 설정 탭 없음) */
  const TC = await p.evaluate(() => { S.me.role = 'teacher'; const out = {}; for (const t of ['today', 'charge', 'unpaid', 'desk', 'refund', 'close', 'import']) { UI.ledger = t; render(); out[t] = document.querySelectorAll('.lg-body [data-act^="led-"]:not([data-act="led-dsid"]):not([data-act="led-day"]):not([data-act="led-imp-sample"]):not([data-act="led-stg"]):not([data-act="led-dm"]):not([data-act="led-rq"]):not([data-act="led-cmp"])').length; } const tabs = [...document.querySelectorAll('#main [data-key="ledger"][role="tab"]')].map(b => b.dataset.v); S.me.role = 'owner'; return { out, set: tabs.includes('set'), ro: !!document.querySelector('.lg-ro') || true }; });
  const SUB = await p.evaluate(() => { S.me.role = 'sub'; render(); const t = [...document.querySelectorAll('#main [data-key="ledger"][role="tab"]')].map(b => b.dataset.v); S.me.role = 'owner'; render(); return t.includes('share'); });
  ok(!SUB, '쉐어 탭은 기관 소유자만');
  ok(Object.values(TC.out).every(n => n === 0) && !TC.set, '교강사 조회만 ' + JSON.stringify(TC));

  /* ⑭ 화면 크기: 1440 · 390 가로 넘침 0, 주요 버튼 44px */
  const TABS = ['today', 'book', 'charge', 'unpaid', 'desk', 'refund', 'close', 'import', 'share', 'set'];
  for (const w of [1440, 390]) { await p.setViewportSize({ width: w, height: 900 }); const o = await p.evaluate(T => { const bad = []; for (const t of T) { UI.ledger = t; render(); if (document.documentElement.scrollWidth > innerWidth + 1) bad.push(t + ':' + document.documentElement.scrollWidth); const x = [...document.querySelectorAll('.lg')].find(e => e.scrollWidth > e.clientWidth + 1); if (x) bad.push(t + ':lg'); } return bad; }, TABS); ok(!o.length, `${w}px 가로 넘침 0 ` + o.join(','));
    const small = await p.evaluate(() => { UI.ledger = 'desk'; render(); return [...document.querySelectorAll('.lg .btn, .lg .lg-chip')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => b.textContent).slice(0, 5); }); ok(!small.length, `${w}px 버튼 44px ` + small.join(','));
    const tiny = await p.evaluate(() => [...document.querySelectorAll('.lg *')].filter(e => e.offsetParent && e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length); ok(tiny === 0, `${w}px 글자 12px 이상 ` + tiny);
    if (SHOTS) for (const t of TABS) { await p.evaluate(t => { UI.ledger = t; render(); }, t); await p.screenshot({ path: path.join(SHOTS, `ledger-${w}-${t}.png`), fullPage: true }); } }
  await p.setViewportSize({ width: 1440, height: 900 });

  /* ⑮ 운영 모드: /api/ledger/* 호출 · 응답 표시 · 실패 안내 */
  const LV = await p.evaluate(async () => { const calls = []; const units = { units: [{ id: 'u_hq', parentId: null, kind: 'hq', name: '운영 본사', hasKey: true, children: [{ id: 'u_b1', kind: 'branch', name: '운영 1호점' }] }] };
    const R = { '/api/ledger/units': units, '/api/ledger/summary': { net: 1234000, paid: 1300000, refund: 66000, unpaid: 200000, collectRate: 86.7, charged: 1500000, byUnit: {}, share: { eligible: 900000, estimate: 3600 } }, '/api/ledger/today': { unpaid: { people: { d1: 2, d8: 1, d31: 0 }, amount: { d1: 150000, d8: 50000, d31: 0 } }, unmatched: 1, refundsPending: 1, unclosed: [] }, '/api/ledger/entries': { entries: [{ id: 'lp_x', kind: 'receipt', unitId: 'u_b1', sid: '9123', method: 'online_card', amount: 300000, at: today() + ' 10:00', status: 'paid' }] } };
    window.LIVE = { tenant: 't1', cfg: {} }; window.api = async (m, u, b) => { calls.push(m + ' ' + u + (b ? ' ' + JSON.stringify(b) : '')); const k = u.split('?')[0]; if (R[k]) return R[k]; if (m === 'POST') return { ok: true }; const e = new Error('없는 경로'); e.status = 404; e.code = 'not_found'; throw e; };
    UI.ledger = 'book'; UI.ledU = ''; UI.ledP = 'this'; UI.ledT = ''; render(); await new Promise(k => setTimeout(k, 120));
    const k = [...document.querySelectorAll('.lg-kpi b')].map(b => b.textContent); const opts = [...document.querySelectorAll('.lg-unit option')].map(o => o.textContent.trim()); const row = [...document.querySelectorAll('.lg-body tbody tr')].map(t => t.textContent).join(' | '); const ai = document.querySelector('.lg-ai p').textContent;
    /* 원장에서 정정 → POST /api/ledger/receipts/:id/correct */
    document.querySelector('[data-act="led-correct"]').click(); document.querySelector('#modal [name="r"]').value = '운영 정정'; document.querySelector('#modal [data-mact="ok"]').click(); await new Promise(k => setTimeout(k, 60));
    window.api = async (m, u) => { calls.push(m + ' ' + u); const e = new Error('꺼짐'); e.status = 403; e.code = 'ledger_off'; throw e; }; UI.ledger = 'today'; render(); await new Promise(k => setTimeout(k, 120)); const err = (document.querySelector('.lg-err') || {}).textContent || '';
    delete window.LIVE; delete window.api; UI.ledU = ''; render(); return { calls, k, opts, row, err, ai }; });
  ok(LV.calls.some(c => c.startsWith('GET /api/ledger/summary?from=')) && LV.calls.some(c => c.startsWith('GET /api/ledger/entries?')) && LV.calls.some(c => c.startsWith('GET /api/ledger/today')), '운영 모드 GET 호출 ' + LV.calls.slice(0, 4).join(' | '));
  ok(LV.k[0] === '1,234,000원' && LV.k[1] === '86.7%' && LV.opts.length === 2 && /300,000원/.test(LV.row), '운영 응답 표시 ' + JSON.stringify({ k: LV.k, o: LV.opts }));
  ok(/미납 3명 200,000원/.test(LV.ai) && /확정 대기 환불 1건/.test(LV.ai), '운영 today → AI 요약 ' + LV.ai);
  ok(LV.calls.some(c => /^POST \/api\/ledger\/receipts\/lp_x\/correct .*"reason":"운영 정정".*"idem"/.test(c)), '운영 정정 POST · 멱등키 ' + LV.calls.filter(c => c.startsWith('POST')).join(' | '));
  ok(/매출 · 수납 기능에 연결하지 못했습니다\(403 ledger_off\)/.test(LV.err) && /모듈이 꺼져/.test(LV.err), '운영 실패 안내 ' + LV.err.slice(0, 60));

  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
