'use strict';
/* 콘텐츠 마켓 v1.1 /api/market/* · /api/pub/<tid>/mk-* 계약 시나리오 — Node · Java 공용(spec v1.1 8장 · dev-addendum 3장).
   사용: 서버를 SIGNUP_CODE=C0DE PII_DEV_OTP=1 PII_KEY=<hex64> SANTA_ADMIN_EMAILS=mk-santa1@example.com,mk-santa2@example.com 로 띄운 뒤
     BASE=http://127.0.0.1:9611 node tests/contract-market.js
   가입은 IP당 시간 10회 제한(이 시나리오 6회)이므로 다른 대조 테스트를 돌린 서버는 다시 띄운 뒤 실행합니다. 산타 계정은 있으면 로그인합니다(비밀번호 MK_SANTA_PW).
   Node 단위 테스트(service/test/market.test.js)는 run()을 같은 서버 안에서 부릅니다. 결과는 상태 코드 · 오류 코드 · 금액 · 크레딧으로만 비교합니다(날짜에 따라 바뀌는 값은 관계식으로). */
const SANTA = ['mk-santa1@example.com', 'mk-santa2@example.com'];
const PW = process.env.MK_SANTA_PW || 'Contract2026x';
const kst = (d = 0) => new Date(Date.now() + 9 * 3600e3 + d * 864e5).toISOString().slice(0, 10);
const nextYm = () => { const [y, m] = kst().split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
const quarter = () => { const [y, m] = kst().split('-').map(Number); return `${y}-Q${Math.floor((m - 1) / 3) + 1}`; };

async function run(U, tag) {
  const R = {}; const jar = {};
  const call = async (who, m, p, b) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: b ? JSON.stringify(b) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; const t = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await r.arrayBuffer()); let j = {}; try { j = JSON.parse(t); } catch { j = { _text: t }; } return { st: r.status, j, ct: r.headers.get('content-type') || '' }; };
  const sfx = `${tag}${Date.now().toString(36)}`;
  const join = async (who, email, orgName, type) => { const s = await call(who, 'POST', '/api/signup', { email, password: PW, orgName, type, code: 'C0DE' }); if (s.st === 200) return s.j.tenant.tid;
    const l = await call(who, 'POST', '/api/login', { email, password: PW }); return l.j.tenant && l.j.tenant.tid; };
  await join('S1', SANTA[0], '산타 운영', 'corp'); await join('S2', SANTA[1], '산타 운영 2', 'corp');
  const B = await join('B', `mkb_${sfx}@example.com`, '한빛전자', 'corp'); const C = await join('C', `mkc_${sfx}@example.com`, 'CP러닝웍스', 'corp');
  const P = p => `/api/pub/${B}/${p}`;
  const doc = { org: { name: '한빛전자', type: 'corp', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: false, approve: 'auto' } }, lsite: { pub: { org: { name: '한빛전자' }, pages: [] } } };
  await call('B', 'PUT', '/api/state', { doc, rev: (await call('B', 'GET', '/api/state')).j.rev || 0 });
  await call('C', 'PUT', '/api/state', { doc: { org: { name: 'CP러닝웍스', type: 'corp' } }, rev: (await call('C', 'GET', '/api/state')).j.rev || 0 });

  // 시범 플래그 · CP 등록
  R.off = (await call('B', 'GET', '/api/market/home')).j.error;
  R.notSanta = (await call('B', 'PUT', `/api/market/ops/orgs/${B}/pilot`, { on: true })).st;
  const pl = await call('S1', 'PUT', `/api/market/ops/orgs/${B}/pilot`, { on: true }); R.pilot = [pl.st, pl.j.pilot, pl.j.doc];
  R.notCp = (await call('C', 'GET', '/api/market/cp/products')).j.error;
  R.party = (await call('S1', 'PUT', `/api/market/ops/parties/${C}`, { kind: 'cp', cpName: 'CP러닝웍스' })).j.party.kind;

  // CP 상품 · 단가 · 심사 · opt-in
  const mk = async (title, hours) => (await call('C', 'POST', '/api/market/cp/products', { title, hours, kind: 'course', idem: 'p-' + title })).j.product.id;
  const pa = await mk('직무 데이터 분석', 15), pb = await mk('AI 업무 자동화', 12), px = await mk('개별 판매 과정', 10);
  R.floor = (await call('C', 'PUT', `/api/market/cp/products/${pa}/price`, { listPrice: 50000, floorPrice: 60000 })).j.error;
  R.submitNoPrice = (await call('C', 'POST', `/api/market/cp/products/${pa}/submit`)).j.error;
  const p1 = await call('C', 'PUT', `/api/market/cp/products/${pa}/price`, { listPrice: 50000, volRules: [{ fromN: 2, offBp: 1000 }], floorPrice: 30000, lic: ['stream', 'adapt'] }); R.price = [p1.st, p1.j.price && p1.j.price.credits, p1.j.price && p1.j.price.effectiveFrom === kst()];
  await call('C', 'PUT', `/api/market/cp/products/${pb}/price`, { listPrice: 42500 }); await call('C', 'PUT', `/api/market/cp/products/${px}/price`, { listPrice: 30000, floorPrice: 25000 });
  for (const id of [pa, pb, px]) { await call('C', 'POST', `/api/market/cp/products/${id}/submit`); await call('S1', 'POST', `/api/market/ops/reviews/${id}/decide`, { result: 'listed' }); }
  const p2 = await call('C', 'PUT', `/api/market/cp/products/${pa}/price`, { listPrice: 60000, volRules: [{ fromN: 2, offBp: 1000 }], floorPrice: 30000 }); R.priceNext = [p2.j.price && p2.j.price.effectiveFrom === nextYm() + '-01', p2.j.current && p2.j.current.credits];
  R.priceStep = (await call('C', 'PUT', `/api/market/cp/products/${pa}/price`, { listPrice: 70000 })).j.error;
  await call('C', 'PUT', `/api/market/cp/products/${pa}/price`, { listPrice: 60000, volRules: [{ fromN: 2, offBp: 1000 }], floorPrice: 30000 });
  const oa = await call('C', 'PUT', `/api/market/cp/products/${pa}/optin`, { mode: 'credit', idem: 'o1' }); R.optin = [oa.st, oa.j.optin && oa.j.optin.mode, oa.j.minUntil === `${+kst().slice(0, 4) + 1}${kst().slice(4)}` || kst().slice(5) === '02-29'];
  await call('C', 'PUT', `/api/market/cp/products/${pb}/optin`, { mode: 'credit', idem: 'o2' }); await call('C', 'PUT', `/api/market/cp/products/${px}/optin`, { mode: 'single', idem: 'o3' });

  // 컬렉션 · 산타 오리지널
  const col = await call('S1', 'POST', '/api/market/ops/collections', { id: 'mc_basic' + sfx.slice(-6).replace(/[^a-z0-9]/g, 'x'), kind: 'basic', title: '직무 베이직', items: [pa, pb, px] }); const CID = col.j.collection.id; R.col = [col.j.collection.count, col.j.skipped.length];
  R.origCap = (await call('S1', 'POST', '/api/market/ops/originals', { title: '엑셀 5분', listPrice: 15000, hoursX10: 5, collections: [CID], idem: 'og0' })).j.error;
  const og = await call('S1', 'POST', '/api/market/ops/originals', { title: '엑셀 5분', listPrice: 15000, hoursX10: 5, srcKind: 'ai', idem: 'og1' }); const po = og.j.product.id; R.orig = [og.st, og.j.price.credits, og.j.product.ownerKind, og.j.product.optin, og.j.product.minUntil];
  const oc = await call('S1', 'POST', '/api/market/ops/collections', { id: CID, kind: 'basic', title: '직무 베이직', items: [pa, pb, po] }); R.colOrig = oc.j.error || oc.j.collection.count;
  const ocol = await call('S1', 'POST', '/api/market/ops/collections', { id: 'mc_orig' + sfx.slice(-6).replace(/[^a-z0-9]/g, 'x'), kind: 'original', title: '산타 오리지널', items: [po] }); R.colOrigKind = ocol.j.collection && ocol.j.collection.count;

  // 구매 기관: 카탈로그 · 계산기 · 견적 · 가드
  const home = await call('B', 'GET', '/api/market/home'); const hc = (home.j.collections || []).find(x => x.id === CID); R.home = [home.st, hc && hc.count, hc && hc.avgCredits, home.j.eligible && home.j.eligible.ok];
  const list = await call('B', 'GET', `/api/market/products?collection=${CID}`); R.list = [list.j.total, (list.j.items || []).map(x => x.credits).join(',')];
  const det = await call('B', 'GET', `/api/market/products/${pa}`); R.detail = [det.j.price && det.j.price.credits, det.j.price && det.j.price.nextPrice && det.j.price.nextPrice.credits, det.j.optin && det.j.optin.mode, JSON.stringify(det.j).includes('floor')];
  const plan = await call('B', 'POST', '/api/market/credit/plan', { budget: 30000000, bundle: true, collections: [CID] }); R.plan = [plan.j.credits, plan.j.bonusCredits, plan.j.total, plan.j.santaBp === undefined && plan.j.cpMax === undefined, plan.j.ok];
  const plan8 = await call('B', 'POST', '/api/market/credit/plan', { budget: 30000000, bonusBp: 800 }); R.plan8 = [plan8.j.ok, plan8.j.bonusBp];
  const rules = await call('B', 'GET', '/api/market/credit/rules'); R.rules = [rules.j.won, rules.j.cpBp, rules.j.bonus.maxBp, rules.j.restore.hours];
  R.noPlan = (await call('B', 'POST', '/api/market/quotes', { kind: 'credit', input: { budget: 30000000, bundle: true, collections: [CID] }, idem: 'q0' })).j.error;
  await call('S1', 'PUT', `/api/santa/orgs/${B}/plan`, { code: 'U2', contract: 'sub' });
  R.bonusMax = (await call('B', 'POST', '/api/market/quotes', { kind: 'credit', input: { budget: 30000000 }, bonusBp: 800, idem: 'q8' })).j.error;
  R.noIdem = (await call('B', 'POST', '/api/market/quotes', { kind: 'credit', input: { budget: 30000000 } })).j.error;
  const OCID = ocol.j.collection.id; const q1 = await call('B', 'POST', '/api/market/quotes', { kind: 'credit', input: { budget: 30000000, bundle: true, collections: [CID, OCID] }, idem: 'q1' }); const qid = q1.j.quote.id;
  R.quote = [q1.st, q1.j.quote.credits, q1.j.quote.bonusBp, q1.j.quote.bonusCredits, q1.j.quote.santaBp === undefined && q1.j.quote.cpMax === undefined];
  const oq = (await call('S1', 'GET', '/api/market/ops/quotes?size=100')).j.items || []; const oq1 = oq.find(x => x.id === qid); R.opsQuote = [oq1 && oq1.santaBp, oq1 && oq1.cpMax];
  R.quoteIdem = (await call('B', 'POST', '/api/market/quotes', { kind: 'credit', input: { budget: 10000000 }, idem: 'q1' })).j.quote.id === qid;
  const sq = await call('B', 'POST', '/api/market/quotes', { kind: 'single', price: 30000000, lines: [{ productId: px, people: 1000 }], idem: 'qs' }); R.single = [sq.j.quote.status, sq.j.quote.est.floorSum === undefined, JSON.stringify(sq.j).includes('floor')];
  const sqo = (await call('S1', 'GET', '/api/market/ops/quotes?status=cp_wait')).j.items.find(x => x.id === sq.j.quote.id); R.singleOps = [sqo.est.floorSum, sqo.est.minPrice];
  const rq = (await call('C', 'GET', '/api/market/cp/requests')).j.items.find(x => x.id === sq.j.quote.id); R.cpReq = [rq && rq.cand, rq && rq.floorSum];
  const rd = await call('C', 'POST', `/api/market/cp/requests/${sq.j.quote.id}/decide`, { ok: true }); R.cpReqOk = rd.j.request && rd.j.request.status;
  R.send = (await call('S1', 'POST', `/api/market/ops/quotes/${sq.j.quote.id}/send`)).j.quote.status;
  const adj = await call('S1', 'POST', `/api/market/ops/quotes/${sq.j.quote.id}/adjust`, { price: 40000000, idem: 'adj1' }); R.adjust = [adj.j.quote && adj.j.quote.status, adj.j.quote && adj.j.quote.cpMax, adj.j.replaced === sq.j.quote.id];
  const aq = await call('S1', 'POST', '/api/market/ops/quotes/auto', { buyerTid: B, price: 30000000, lines: [{ productId: px, people: 100 }], idem: 'aq1' }); R.autoQuote = [aq.j.auto, aq.j.quote && aq.j.quote.santaBp];
  const im = await call('C', 'POST', '/api/market/cp/catalog/import', { rows: [{ title: '가져온 과정', hours: 2, listPrice: 20000 }, { title: '', hours: 1 }], idem: 'im1' }); const ij = await call('C', 'GET', `/api/market/cp/catalog/import/${im.j.jobId}`); R.import = [im.j.created, im.j.failed.length, ij.j.status];
  const og2 = (await call('S1', 'GET', '/api/market/ops/orgs?pilot=1')).j.items || []; R.opsOrgs = [og2.some(x => x.tid === B && x.mk.pilot === true), og2.some(x => x.tid === C)];

  // 계약 · 활성(세금계산서 발행 대기)
  R.noTerms = (await call('B', 'POST', '/api/market/contracts', { quoteId: qid, start: kst(), idem: 'k0' })).j.error; /* C2 이용 조건 동의 없음 → 422 */
  const k1 = await call('B', 'POST', '/api/market/contracts', { quoteId: qid, start: kst(), terms: 'mk-credit-v1', idem: 'k1' }); const kid = k1.j.contract.id; R.contract = [k1.st, k1.j.contract.status]; R.terms = [k1.j.contract.buyerKind, k1.j.contract.terms && k1.j.contract.terms.ver, k1.j.contract.carryEnd > k1.j.contract.end];
  R.contractAgain = (await call('B', 'POST', '/api/market/contracts', { quoteId: qid, terms: 'mk-credit-v1', idem: 'k1b' })).j.error;
  R.activateBuyer = (await call('B', 'POST', `/api/market/contracts/${kid}/activate`, { idem: 'a0' })).st;
  const ac = await call('S1', 'POST', `/api/market/contracts/${kid}/activate`, { idem: 'a1' }); R.activate = [ac.st, ac.j.contract && ac.j.contract.status, ac.j.contract && ac.j.contract.taxStatus, (ac.j.wallet || []).map(w => `${w.lot}:${w.credits}`).join(','), ac.j.balance];
  const ct = await call('B', 'PUT', `/api/market/contracts/${kid}/controls`, { monthCap: 100, preFrom: 46 }); R.controls = [ct.st, ct.j.control && ct.j.control.monthCap, ct.j.control && ct.j.control.preFrom];

  // 학습자: 진열대 · 시작(차감) · 사전 승인 · 상한 · 범위
  const learner = async who => { const e = `${who.toLowerCase()}_${sfx}@example.com`; const o = await call('X', 'POST', P('otp'), { email: e, purpose: 'signup' }); const sg = await call(who, 'POST', P('signup'), { via: 'email', email: e, code: o.j.dev_code, nickname: who, consent: { tos: true, privacy: true }, age14: true }); if (process.env.DBG) console.error('signup', o.st, JSON.stringify(o.j), sg.st, JSON.stringify(sg.j)); };
  await learner('L1'); await learner('L2');
  const sh = await call('L1', 'GET', P('mk-shelf')); const shc = (sh.j.shelf || []).find(x => x.colId === CID); R.shelf = [sh.st, sh.j.on, shc && shc.items.length, sh.j.me && sh.j.me.monthLeft, JSON.stringify(sh.j).includes('balance')];
  const st = id => call('L1', 'POST', P('mk-start'), { productId: id, idem: 's' + id });
  R.pre = (await st(pa)).j.error; const pk = await call('L1', 'POST', P('mk-pre'), { productId: pa }); if (process.env.DBG) console.error('pre', pk.st, JSON.stringify(pk.j), JSON.stringify(R)); R.preAsk = pk.j.preapproval && pk.j.preapproval.status;
  R.preAsked = [(await st(pa)).j.error, (await call('L1', 'GET', P(`mk-item?id=${pa}`))).j.item.access];
  const pre = (await call('B', 'GET', `/api/market/contracts/${kid}/preapprovals`)).j.items[0]; R.preDecide = (await call('B', 'POST', `/api/market/contracts/${kid}/preapprovals/${pre.id}/decide`, { ok: true })).j.preapproval.status;
  const s1 = await st(pa); R.start = [s1.st, s1.j.charged, s1.j.credits]; R.startAgain = (await st(pa)).j.charged;
  const s2 = await st(pb); R.start2 = [s2.j.charged, s2.j.credits];
  R.cap = (await st(po)).j.error; const ix = (await call('L1', 'GET', P(`mk-item?id=${px}`))).j.item; R.scope = [(await st(px)).j.error, ix.access, ix.credits, ix.accessLabel];
  const s3 = await call('L2', 'POST', P('mk-start'), { productId: pa, idem: 'l2a' }); R.vol = [s3.j.charged, s3.j.credits];
  R.guest = (await call('G', 'POST', P('mk-start'), { productId: pa })).st;

  // 계약 현황 · 복원
  const kd = await call('B', 'GET', `/api/market/contracts/${kid}`); R.balance = [kd.j.balance, kd.j.total, kd.j.used && kd.j.used.total, (kd.j.alerts || []).length];
  const uses = (await call('B', 'GET', `/api/market/contracts/${kid}/uses`)).j.items; const u2 = uses.find(u => u.credits === 45), u1b = uses.find(u => u.credits === 43);
  R.usesPii = [uses.length, JSON.stringify(uses).includes('@'), uses[0] && uses[0].learner.key.length];
  const rs = await call('B', 'POST', `/api/market/contracts/${kid}/restore`, { useId: u2.id, progPct: 3, idem: 'r1' }); R.restore = [rs.st, rs.j.use && rs.j.use.credits, rs.j.balance];
  R.restoreAgain = (await call('B', 'POST', `/api/market/contracts/${kid}/restore`, { useId: u2.id, progPct: 3, idem: 'r1b' })).j.error;
  R.restoreWindow = (await call('B', 'POST', `/api/market/contracts/${kid}/restore`, { useId: u1b.id, progPct: 15, idem: 'r2' })).j.error;
  const s4 = await call('L2', 'POST', P('mk-start'), { productId: pa, idem: 'l2b' }); R.restart = [s4.j.charged, s4.j.credits];
  const u4 = (await call('B', 'GET', `/api/market/contracts/${kid}/uses`)).j.items.find(u => u.kind === 'use' && !u.restored && u.credits === 45);
  R.restoreOnce = (await call('B', 'POST', `/api/market/contracts/${kid}/restore`, { useId: u4.id, progPct: 1, idem: 'r3' })).j.error;
  const s5 = await call('L2', 'POST', P('mk-start'), { productId: po, idem: 'l2o' }); R.origUse = [s5.j.charged, s5.j.credits];
  const dp = await call('B', 'POST', `/api/market/contracts/${kid}/dispute`, { useId: u1b.id, reason: '오개설' }); const dsp = (await call('S1', 'GET', '/api/market/ops/disputes')).j.items.find(d => d.ref === u1b.id);
  const dd = await call('S1', 'POST', `/api/market/ops/disputes/${dsp.id}/decide`, { accept: true, memo: '수강 취소 확인' }); R.dispute = [dp.st, dd.j.dispute && dd.j.dispute.status, (await call('B', 'GET', `/api/market/contracts/${kid}`)).j.balance];

  const ds1 = await call('B', 'POST', `/api/market/contracts/${kid}/disputes`, { kind: 'restore', useId: u4.id, reason: '오수강 신고', idem: 'ds1' });
  const ds2 = await call('B', 'POST', `/api/market/contracts/${kid}/disputes`, { kind: 'restore', useId: u4.id, reason: '중복', idem: 'ds2' });
  const ds3 = await call('B', 'POST', `/api/market/contracts/${kid}/disputes`, { kind: 'contract', reason: '보너스 기준 확인', idem: 'ds3' });
  R.disputes = [ds1.st, ds1.j.dispute && ds1.j.dispute.status, ds2.j.error, ds3.j.dispute && ds3.j.dispute.kind, (await call('B', 'POST', `/api/market/contracts/${kid}/disputes`, { reason: '' , idem: 'ds4' })).j.error, ((await call('B', 'GET', `/api/market/contracts/${kid}/disputes`)).j.items || []).length];
  const it1 = (await call('L1', 'GET', P(`mk-item?id=${pa}`))).j.item; R.item = [it1.access, it1.credits, !!it1.accessLabel];
  // 환불 요청 · 추가 구매
  const rf = await call('B', 'POST', `/api/market/contracts/${kid}/refund`, { reason: '예산 반납', idem: 'rf1' }); R.refund = [rf.j.refund && rf.j.refund.paidUnused, rf.j.refund && rf.j.refund.bonusUsed, rf.j.refund && rf.j.refund.amount, rf.j.status, rf.j.refund && rf.j.refund.mode, rf.j.refund && rf.j.refund.rule, JSON.stringify(rf.j).includes('검토 필요')];
  const tq = await call('B', 'POST', `/api/market/contracts/${kid}/topup`, { amount: 5000000, idem: 't1' }); const tk = await call('B', 'POST', '/api/market/contracts', { quoteId: tq.j.quote.id, terms: 'mk-credit-v1', idem: 'tk1' });
  const ta = await call('S1', 'POST', `/api/market/contracts/${tk.j.contract.id}/activate`, { taxInvNo: 'TX-0001', idem: 'ta1' }); R.topup = [tq.j.quote.credits, ta.j.contract && ta.j.contract.status, ta.j.target === kid, ta.j.balance];

  // CP 요율 · 프로모션
  R.rateBad = [(await call('S1', 'PUT', `/api/market/ops/cp-rates/${C}`, { cpBp: 7000, agreeRef: 'AG-1', idem: 'cr0' })).j.error, (await call('S1', 'PUT', `/api/market/ops/cp-rates/${C}`, { rateKind: 'exclusive', idem: 'cr00' })).j.error];
  const cr = await call('S1', 'PUT', `/api/market/ops/cp-rates/${C}`, { rateKind: 'exclusive', agreeRef: 'AG-2027-01', idem: 'cr1' }); R.rate = [cr.j.rate && cr.j.rate.cpBp, cr.j.rate && cr.j.rate.effectiveFrom === nextYm() + '-01'];
  const cpr = await call('C', 'GET', '/api/market/cp/rate'); R.cpRate = [cpr.j.current.cpBp, cpr.j.next && cpr.j.next.cpBp];
  R.promoMonths = (await call('C', 'POST', '/api/market/cp/promos', { productId: pa, slot: 'home_top', months: [kst().slice(0, 7)], idem: 'pm0' })).j.error;
  R.promoTarget = (await call('C', 'POST', '/api/market/cp/promos', { productId: px, slot: 'home_top', months: [nextYm()], idem: 'pm1' })).j.error;
  const pm = await call('C', 'POST', '/api/market/cp/promos', { productId: pa, slot: 'home_top', months: [nextYm()], idem: 'pm2' }); R.promo = [pm.st, pm.j.fee, pm.j.items && pm.j.items[0].status];
  R.promoOk = (await call('S1', 'POST', `/api/market/ops/promos/${pm.j.items[0].id}/decide`, { ok: true })).j.promo.status;
  R.promoCancel = (await call('C', 'DELETE', `/api/market/cp/promos/${pm.j.items[0].id}`)).j.error;

  // 월 집계 · 분기 마감(2인) · 지급 지시
  const sm = await call('S1', 'POST', '/api/market/settle/month', { ym: kst().slice(0, 7) }); const stc = (sm.j.stmts || []).find(s => s.cpTid === C);
  R.month = [sm.st, stc && stc.used, stc && stc.restored, stc && stc.net, stc && stc.cpBp, stc && stc.cpAmount, sm.j.orig && sm.j.orig.santa];
  const cs = await call('C', 'GET', '/api/market/cp/statements'); const cst = cs.j.items[0]; R.stmtLines = [cst.lines.length, cst.lines.every(l => l.enrollments === '5명 미만'), JSON.stringify(cst).includes('@')];
  R.stmtDispute = (await call('C', 'POST', `/api/market/cp/statements/${cst.id}/dispute`, { reason: '수강 건수 확인' })).j.stmt.status;
  const z0 = await call('S1', 'POST', '/api/market/settle/close', { quarter: quarter() }); R.closeChecks = z0.j.checks && z0.j.checks.find(x => x.k === 'disputed').ok;
  const d2 = (await call('S1', 'GET', '/api/market/ops/disputes')).j.items.find(d => d.ref === cst.id); await call('S1', 'POST', `/api/market/ops/disputes/${d2.id}/decide`, { accept: false, memo: '집계 정상' });
  const z1 = await call('S1', 'POST', '/api/market/settle/close', { quarter: quarter() }); const zid = z1.j.close.id;
  R.closeSame = (await call('S1', 'POST', `/api/market/settle/close/${zid}/confirm`)).j.error;
  const z2 = await call('S2', 'POST', `/api/market/settle/close/${zid}/confirm`); const zc = z2.j.totals && z2.j.totals.cps.find(x => x.cp === C);
  R.close = [z2.st, z2.j.close && z2.j.close.status, zc && zc.cpAmount, zc && zc.deduct + zc.pay === zc.cpAmount, z2.j.totals && z2.j.totals.santaOrig];
  const ex = await call('S1', 'GET', `/api/market/ops/export?close=${zid}`); R.export = [ex.st, ex.ct.startsWith('text/csv'), (ex.j._text || '').includes('지급 지시(송금 전)')];
  const rv = await call('S1', 'GET', '/api/market/ops/revenue'); R.revenue = [rv.st, (rv.j.bySource || []).some(x => x.source === 'credit_orig'), rv.j.guard && rv.j.guard.below];
  R.recognized = rv.j.totals && rv.j.totals.recognized - ((rv.j.bySource || []).find(x => x.source === 'promo') || { gross: 0 }).gross;
  R.closes = ((await call('S1', 'GET', '/api/market/settle/closes')).j.items || []).some(z => z.id === zid && z.status === 'confirmed');
  const pdf = await call('C', 'GET', `/api/market/cp/statements/${cst.id}/pdf`); R.stmtPdf = [pdf.st, pdf.ct.startsWith('text/html'), (pdf.j._text || '').includes('월 소진 정산서')];

  // 기관 격리
  const D = await join('D', `mkd_${sfx}@example.com`, '다른 대학', 'univ');
  R.isolation = [(await call('D', 'GET', '/api/market/home')).j.error, (await call('D', 'GET', `/api/market/contracts/${kid}`)).st, (await call('D', 'GET', '/api/market/cp/statements')).j.error];
  /* C1 교차 테넌트 차단: 시범 기관 D(구매) · 다른 CP E가 B의 지갑 · 견적 · 차감, C의 정산서를 보면 404 또는 0행 */
  await call('S1', 'PUT', `/api/market/ops/orgs/${D}/pilot`, { on: true }); const E2 = await join('E', `mke_${sfx}@example.com`, 'CP에듀온', 'corp'); await call('S1', 'PUT', `/api/market/ops/parties/${E2}`, { kind: 'cp', cpName: 'CP에듀온' });
  R.rls = [(await call('D', 'POST', `/api/market/contracts/${kid}/disputes`, { kind: 'contract', reason: '남의 계약', idem: 'x0' })).st, (await call('D', 'GET', `/api/market/contracts/${kid}`)).st, (await call('D', 'GET', `/api/market/contracts/${kid}/uses`)).st, (await call('D', 'GET', `/api/market/quotes/${qid}`)).st, ((await call('D', 'GET', '/api/market/quotes')).j.items || []).length,
    (await call('D', 'POST', `/api/market/contracts/${kid}/restore`, { useId: u4.id, progPct: 0, idem: 'x1' })).st, ((await call('D', 'GET', '/api/market/home')).j.myCredit || null),
    (await call('E', 'GET', `/api/market/cp/statements/${cst.id}`)).st, ((await call('E', 'GET', '/api/market/cp/statements')).j.items || []).length, (await call('E', 'GET', `/api/market/cp/statements/${cst.id}/pdf`)).st,
    (await call('E', 'PUT', `/api/market/cp/products/${pa}/price`, { listPrice: 1000 })).st, ((await call('E', 'GET', '/api/market/cp/requests')).j.items || []).length, ((await call('E', 'GET', '/api/market/cp/promos')).j.items || []).length];
  /* C3-4 공공 기관 계약: 이월 없음(carryEnd = end) · buyerKind public */
  const pq = await call('B', 'POST', '/api/market/quotes', { kind: 'credit', input: { budget: 30000000, collections: [CID] }, idem: 'pq1' });
  const pk2 = await call('B', 'POST', '/api/market/contracts', { quoteId: pq.j.quote && pq.j.quote.id, start: kst(), terms: 'mk-credit-v1', buyerKind: 'public', idem: 'pk1' });
  R.publicK = [pk2.st, pk2.j.contract && pk2.j.contract.buyerKind, pk2.j.contract && pk2.j.contract.carryEnd === pk2.j.contract.end];
  R.tids = { B, C, D, E: E2 }; Object.defineProperty(R, '_t', { value: { call, P, pa }, enumerable: false });
  return R;
}

/* 기대값(Node · Java 같은 값). null이면 비교하지 않음 */
const EXPECT = {
  off: 'mk_off', notSanta: 403, pilot: [200, true, true], notCp: 'mk_cp', party: 'cp',
  floor: 'mk_floor', submitNoPrice: 'mk_check', price: [200, 50, true], priceNext: [true, 50], priceStep: 'mk_price_step', optin: [200, 'credit', true],
  col: [2, 1], origCap: 'mk_orig_cap', orig: [200, 15, 'santa', 'credit', null], colOrig: 'mk_orig_cap', colOrigKind: 1,
  home: [200, 2, 46, false], list: [2, '50,43'], detail: [50, 60, 'credit', false], plan: [30000, 2100, 32100, true, true], plan8: [false, 700], rules: [1000, 6500, 700, 168],
  noPlan: 'mk_plan', bonusMax: 'mk_bonus_max', noIdem: 'idem', quote: [200, 30000, 700, 2100, true], opsQuote: [3045, 20865000], quoteIdem: true, single: ['cp_wait', true, false], singleOps: [25000000, 35714286], cpReq: [21000000, 25000000], cpReqOk: 'ready', send: 'sent', adjust: ['ready', 28000000, true], autoQuote: [true, 3000], import: [1, 1, 'done'], opsOrgs: [true, false],
  contract: [200, 'pending_pay'], contractAgain: 'mk_quote_state', activateBuyer: 403, activate: [200, 'active', 'waiting', 'paid:30000,bonus:2100', 32100], controls: [200, 100, 46],
  shelf: [200, true, 2, 100, false], pre: 'mk_pre', preAsk: 'asked', preAsked: ['mk_pre', 'pre_asked'], preDecide: 'ok', start: [200, true, 50], startAgain: false, start2: [true, 43],
  cap: 'mk_cap', scope: ['mk_scope', 'buy', 30, '패스 밖 과정이라 따로 구매해야 해요'], vol: [true, 45], guest: 401,
  balance: [31962, 32100, 138, 0], usesPii: [3, false, 10], restore: [200, -45, 32007], restoreAgain: 'mk_restore_state', restoreWindow: 'mk_restore_window', restart: [true, 45], restoreOnce: 'mk_restore_once', origUse: [true, 15],
  dispute: [200, 'accepted', 31990],
  refund: [29890, 0, 29890000, 'requested', 'unused', 'mk-refund-v1', false], noTerms: 'mk_terms', terms: ['general', 'mk-credit-v1', true], publicK: [200, 'public', true], topup: [5000, 'merged', true, 36990],
  rateBad: ['mk_cp_rate', 'mk_cp_rate'], rate: [6000, true], cpRate: [6500, 6000], promoMonths: 'mk_promo_months', promoTarget: 'mk_promo_target', promo: [200, 500000, 'asked'], promoOk: 'ok', promoCancel: 'mk_promo_state',
  month: [200, 183, 88, 95, 6500, 61750, 15000], stmtLines: [2, true, false], stmtDispute: 'disputed', closeChecks: false, closeSame: 'mk_close_same_user', close: [200, 'confirmed', 61750, true, 15000],
  export: [200, true, true], revenue: [200, true, 0], recognized: 103774, closes: true, stmtPdf: [200, true, true], isolation: ['mk_off', 404, 'mk_cp'], disputes: [200, 'open', 'mk_dispute_open', 'contract', 'reason', 3], item: ['started', 50, true], rls: [404, 404, 404, 404, 0, 404, null, 404, 0, 404, 404, 0, 0]
};
function check(R) { const bad = []; for (const k of Object.keys(EXPECT)) { if (EXPECT[k] === null) continue; const e = JSON.stringify(EXPECT[k]); const g = JSON.stringify(Array.isArray(EXPECT[k]) && Array.isArray(R[k]) ? R[k].map((v, i) => EXPECT[k][i] === null ? null : v) : R[k]); if (e !== g) bad.push(`${k}: 기대 ${e} · 실제 ${g}`); } return bad; }

module.exports = { run, check, EXPECT, SANTA };
if (require.main === module) (async () => {
  const BASE = process.env.BASE || process.argv[2]; if (!BASE) { console.error('BASE=http://127.0.0.1:<port> 를 지정해 주세요.'); process.exit(2); }
  try { const R = await run(BASE.replace(/\/$/, ''), 'c'); if (process.env.DBG) console.log(JSON.stringify(R, null, 1)); const bad = check(R); const n = Object.keys(EXPECT).filter(k => EXPECT[k] !== null).length;
    if (bad.length) { bad.forEach(b => console.error('✗', b)); console.log(`실패 ${bad.length} / ${n}`); process.exitCode = 1; } else console.log(`✓ 마켓 계약 ${n}항목 통과 (${BASE})`); }
  catch (e) { console.error(e); process.exitCode = 1; }
})();
