'use strict';
/* v42 학습 마일리지 /api 계약 시나리오 — Node · Java 공용(04 5절). 결과는 상태코드 · 오류 코드 · 포인트로만 비교한다.
   사용: 서버를 SIGNUP_CODE=C0DE PII_DEV_OTP=1 PII_KEY=<hex64> 로 띄운 뒤  BASE=http://127.0.0.1:9711 node tests/contract-mileage42.js
   Node 단위 테스트(service/test/mileage42.test.js)는 이 파일의 run()을 같은 프로세스 서버에 부른다. 가입은 IP당 시간 10회 제한. */
async function run(U, tag) {
  const R = {}; const jar = {};
  const call = async (who, m, p, b) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: b ? JSON.stringify(b) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; let j = {}; try { j = JSON.parse(await r.text()); } catch { j = {}; } return { st: r.status, j }; };
  const sfx = `${tag}${Date.now().toString(36)}`;
  const su = await call('A', 'POST', '/api/signup', { email: `mil_${sfx}@example.com`, password: 'Contract2026x', orgName: '마일리지 학원', type: 'adult', code: 'C0DE' }); const tid = su.j.tenant.tid;
  const P = p => `/api/pub/${tid}/${p}`;
  const o = await call('X', 'POST', P('otp'), { email: `m1_${sfx}@example.com`, purpose: 'signup' });
  await call('L1', 'POST', P('signup'), { via: 'email', email: `m1_${sfx}@example.com`, code: o.j.dev_code, nickname: 'M1', consent: { tos: true, privacy: true }, age14: true });
  const me = (await call('L1', 'GET', P('me'))).j; const sid = me.sid || (me.me || {}).sid; R.sid = !!sid;
  const doc = { org: { name: '마일리지 학원', type: 'adult', room: { mode: 'saas' } }, settings: { acct: { mode: 'open', social: [], under14: false, approve: 'auto' } }, members: [{ id: 'm1', sid, name: '홍길동' }],
    classes: [{ id: 'c1', name: '영어 A반', price: 250000, learners: ['m1'] }], ledger: { on: true }, lsite: { pub: { org: { name: '마일리지 학원' }, pages: [] } } };
  const rev = (await call('A', 'GET', '/api/state')).j.rev || 0; await call('A', 'PUT', '/api/state', { doc, rev });

  // 제도 기본 끔(D2) · 제품 고정 항목
  const c0 = await call('A', 'GET', '/api/mileage/config'); R.config = [c0.st, c0.j.policy && c0.j.policy.on, (c0.j.fixed || []).includes('self_grant'), (c0.j.fixed || []).includes('funded_cash')];
  R.pubOff = [(await call('L1', 'GET', P('mile-my'))).st];
  R.enableNoDraft = (await call('A', 'POST', '/api/mileage/enable', { draftHash: 'x' })).j.error;
  // 마법사: 초안(저장 안 함, 모의 계산) → 설정 · 규칙 · 보상 → 켜기
  const d = await call('A', 'POST', '/api/mileage/draft', { budget: { monthWon: 100000 } }); R.draft = [d.st, d.j.template, typeof d.j.draftHash === 'string' && d.j.draftHash.length === 64, (d.j.rules || []).length > 0, typeof (d.j.simulate || {}).totalP];
  const cf = await call('A', 'POST', '/api/mileage/config', { policy: { expiry: { mode: 'months', months: 3 }, dailyCapTotal: 1000 } }); R.cfg = [cf.st, cf.j.policy && cf.j.policy.expiry.months, (cf.j.warnings || []).some(w => w.code === 'expiry_short')];
  R.hq = (await call('A', 'POST', '/api/mileage/config', { policy: { scope: { mode: 'unit', hqPool: true } } })).j.error;
  const ru = await call('A', 'POST', '/api/mileage/rules', { id: 'mru_les', trigger: 'lesson_done', score: { mode: 'fixed', v: 100 }, caps: { day: 300 } }); R.rule = [ru.st, ru.j.rule && ru.j.rule.ver, ru.j.rule && ru.j.rule.nature];
  R.ruleBad = (await call('A', 'POST', '/api/mileage/rules', { trigger: 'teleport', score: { mode: 'fixed', v: 1 } })).j.error;
  R.ruleAtt = ((await call('A', 'POST', '/api/mileage/rules', { id: 'mru_att', trigger: 'attend_day', nature: 'achievement', once: 'per_day', score: { mode: 'fixed', v: 10 } })).j.rule || {}).nature;
  const RW = b => call('A', 'POST', '/api/mileage/rewards', b);
  R.rw = [(await RW({ id: 'mrw_cpn', kind: 'coupon', title: '수강 할인 쿠폰', cost: { wonPerP: 1 }, minUse: 100, step: 100, approval: 'manual' })).st,
    (await RW({ id: 'mrw_g', kind: 'goods', title: '텀블러', cost: { wonPerP: 0, fixedP: 500 }, approval: 'manual', link: { priceWon: 12000 } })).j.reward.link.priceWon,
    (await RW({ id: 'mrw_tu', kind: 'tuition', title: '학원비 차감', maxUse: { billPct: 40 }, approval: 'manual' })).j.warnings.some(w => w.code === 'bill_pct')];
  await call('A', 'POST', '/api/mileage/funded', { clsId: 'c9', funded: true, source: 'naeil' });
  R.rwFunded = (await RW({ id: 'mrw_c9', kind: 'coupon', title: '국비반 쿠폰', audience: { cls: ['c9'] } })).j.error;
  const en = await call('A', 'POST', '/api/mileage/enable', { draftHash: d.j.draftHash }); R.enable = [en.st, en.j.on];

  // 적립: 운영자 확정 사건(B) · 수동 지급 · 국비 과정
  const ev = await call('A', 'POST', '/api/mileage/events', { events: [{ trigger: 'lesson_done', sid, srcType: 'item', srcId: 'c1/1', cls: 'c1' }, { trigger: 'lesson_done', sid, srcType: 'item', srcId: 'c1/1', cls: 'c1' }, { trigger: 'lesson_done', sid, srcType: 'item', srcId: 'c9/1', cls: 'c9' }] });
  R.events = ev.j.results && ev.j.results.map(x => x.status);
  const g = await call('A', 'POST', '/api/mileage/grant', { sids: [sid], points: 100000, reason: '장학 준비', idem: 'g1' }); R.grant = [g.st, g.j.results && g.j.results[0].status];
  R.grantAgain = (await call('A', 'POST', '/api/mileage/grant', { sids: [sid], points: 100000, reason: '장학 준비', idem: 'g1' })).j.results[0].again;
  R.grantNoReason = (await call('A', 'POST', '/api/mileage/grant', { sids: [sid], points: 10, reason: '', idem: 'g2' })).j.error;
  const my = (await call('L1', 'GET', P('mile-my'))).j; R.my = [my.on, my.balance, my.funded > 0, Array.isArray(my.streak && my.streak.week) && my.streak.week.length, typeof my.daily];

  // 보상: 쿠폰 신청 → 줄여 승인(adjust) → 개인 쿠폰 코드
  const rq = await call('L1', 'POST', P('mile-redeem'), { rewardId: 'mrw_cpn', points: 1000, idem: 'req-0001' }); R.redeem = [rq.st, rq.j.status, rq.j.won];
  R.redeemAgain = (await call('L1', 'POST', P('mile-redeem'), { rewardId: 'mrw_cpn', points: 1000, idem: 'req-0001' })).j.again;
  R.redeemBad = (await call('L1', 'POST', P('mile-redeem'), { rewardId: 'mrw_cpn', points: 150, idem: 'req-0002' })).j.error;
  R.redeemMismatch = (await call('L1', 'POST', P('mile-redeem'), { rewardId: 'mrw_cpn', points: 200, won: 999, idem: 'req-0003' })).j.error;
  const ap = await call('A', 'GET', '/api/mileage/approvals?type=redeem'); R.approvals = [ap.st, (ap.j.items || []).length, Array.isArray((ap.j.items || [])[0] && ap.j.items[0].checks)];
  const ad = await call('A', 'POST', '/api/mileage/approvals/decide', { ids: [rq.j.id], decision: 'adjust', points: 800 }); const r0 = (ad.j.results || [])[0] || {};
  R.adjust = [ad.st, r0.status, r0.points, /^[A-Z2-9]{8}$/.test(((r0.fulfil || {}).couponCode) || '')];
  R.adjustUp = ((await call('A', 'POST', '/api/mileage/approvals/decide', { ids: [rq.j.id], decision: 'adjust', points: 900 })).j.results || [{}])[0].error;
  const rws = (await call('L1', 'GET', P('mile-rewards'))).j; R.requests = [(rws.requests || []).length >= 1, ((rws.requests || []).find(x => x.id === rq.j.id) || {}).code === (r0.fulfil || {}).couponCode];
  // 학습자 취소: requested → 복원
  const c3 = (await call('L1', 'POST', P('mile-redeem'), { rewardId: 'mrw_cpn', points: 100, idem: 'req-0006' })).j;
  R.learnerCancel = c3 ? (await call('L1', 'POST', P('mile-redeem-cancel'), { id: c3.id })).j.status : null;
  // 굿즈: 승인 → 전달 확인(handed)
  const gq = await call('L1', 'POST', P('mile-redeem'), { rewardId: 'mrw_g', points: 500, idem: 'req-0004' });
  await call('A', 'POST', '/api/mileage/approvals/decide', { ids: [gq.j.id], decision: 'approve' });
  const hd = await call('A', 'POST', '/api/mileage/redeems/handed', { id: gq.j.id }); R.handed = [hd.st, hd.j.status];
  // 학원비 차감: 열린 청구서에 음수 줄(src_type mileage)
  await call('A', 'GET', '/api/ledger/units'); /* 루트 단위 lu_root 생성 */
  const ch = await call('A', 'POST', '/api/ledger/charges', { unitId: 'lu_root', sid, items: [{ itemType: 'tuition', title: '12월 수강료', amount: 300000 }], periodYm: '2026-12', idem: 'mch1' });
  if (process.env.DBG) console.log('charge', ch.st, JSON.stringify(ch.j).slice(0, 300));
  const tq = await call('L1', 'POST', P('mile-redeem'), { rewardId: 'mrw_tu', points: 50000, idem: 'req-0005' });
  const ap2 = (await call('A', 'GET', '/api/mileage/approvals?type=redeem')).j.items.find(x => x.id === tq.j.id) || {}; R.bill = [!!ap2.bill, ap2.bill && ap2.bill.paid, ap2.bill && ap2.bill.funded, (ap2.checks || []).filter(x => x.block).length];
  const td = ((await call('A', 'POST', '/api/mileage/approvals/decide', { ids: [tq.j.id], decision: 'approve', billId: ch.j.bill && ch.j.bill.id })).j.results || [{}])[0]; R.tuition = [td.status, !!(td.fulfil || {}).chargeId];
  const lm = (await call('L1', 'GET', P('ledger-my'))).j; R.billNet = JSON.stringify(lm).includes('마일리지 차감');

  // 부정 의심 · 숍 · 이력 · 끄기 · 순위/감점
  R.flagNoReason = (await call('A', 'POST', '/api/mileage/flags/resolve', { id: 'mfl_x', decision: 'clear' })).j.error;
  R.shopNoAck = (await call('A', 'POST', '/api/mileage/config', { policy: { shop: { on: true } } })).j.error;
  R.shopAck = (await call('A', 'POST', '/api/mileage/config', { policy: { shop: { on: true, ack: { read: true } } } })).st;
  R.log = (((await call('A', 'GET', '/api/mileage/log?area=reward')).j.log) || []).length > 0;
  const po = await call('A', 'GET', '/api/mileage/shop/payouts?ym=2026-11'); R.payouts = [po.st, Array.isArray(po.j.rows), Array.isArray(po.j.sent)];
  R.off = (await call('A', 'POST', '/api/mileage/onoff', { on: false, reason: 'x' })).j.error;
  R.rankNoAck = (await call('A', 'POST', '/api/mileage/rank-penalty', { rank: { on: true } })).j.error;
  R.penalty = (await call('A', 'POST', '/api/mileage/rank-penalty', { penalty: { on: true, maxOnce: 50 }, ack: { read: true, reason: '학부모 합의' } })).st;
  const sm = await call('A', 'GET', '/api/mileage/summary'); R.summary = [sm.st, sm.j.earned > 0, typeof sm.j.pending];
  const lst = await call('L1', 'GET', P('mile-list')); R.list = [lst.st, (lst.j.items || []).length > 0];
  R.noTopup = [(await call('L1', 'POST', P('mile-charge'), { points: 1000 })).st, (await call('A', 'POST', '/api/mileage/transfer', {})).st];
  return R;
}
const EXPECT = {
  sid: true, config: [200, false, true, true], pubOff: [404], enableNoDraft: 'need_draft', draft: [200, 'adult', true, true, 'number'], cfg: [200, 3, true], hq: 'hq_pool_locked',
  rule: [200, 1, 'achievement'], ruleBad: 'bad_rule', ruleAtt: 'participation', rw: [200, 12000, true], rwFunded: 'funded_blocked', enable: [200, true],
  events: ['done', 'already', 'done'], grant: [200, 'posted'], grantAgain: true, grantNoReason: 'reason', my: [true, 100200, true, 7, 'object'],
  redeem: [200, 'requested', 1000], redeemAgain: true, redeemBad: 'bad_points', redeemMismatch: 'amount_mismatch', approvals: [200, 1, true], adjust: [200, 'fulfilled', 800, true], adjustUp: 'state',
  requests: [true, true], learnerCancel: 'cancelled', handed: [200, 'fulfilled'], bill: [true, 0, false, 0], tuition: ['fulfilled', true], billNet: true,
  flagNoReason: 'reason', shopNoAck: 'ack_required', shopAck: 200, log: true, payouts: [200, true, true], off: 'need_sunset', rankNoAck: 'ack_required', penalty: 200, summary: [200, true, 'object'], list: [200, true], noTopup: [404, 404]
};
function check(R) { const bad = []; for (const k of Object.keys(EXPECT)) { const e = JSON.stringify(EXPECT[k]), g = JSON.stringify(R[k]); if (e !== g) bad.push(`${k}: 기대 ${e} · 실제 ${g}`); } return bad; }
module.exports = { run, check, EXPECT };
if (require.main === module) { const U = process.env.BASE || 'http://127.0.0.1:9711'; run(U, 'c').then(R => { const b = check(R); console.log(b.length ? b.join('\n') : 'contract-mileage42 통과'); process.exit(b.length ? 1 : 0); }, e => { console.error(e); process.exit(1); }); }
