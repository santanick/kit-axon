'use strict';
/* tests/market-vectors.json 한 건 실행기(Node 단위 테스트 · 화면 점검 공용). Java DdMarketCalc 시험도 같은 fn · in 이름으로 부릅니다.
   run(calc, {fn, in}) → out */
module.exports = function run(calc, c) {
  const i = c.in;
  switch (c.fn) {
    case 'credits': return calc.credits(i.price);
    case 'wallet': { const w = calc.wallet(i.amount, i.bundle, i.bonusBp); return { base: w.base, bonus: w.bonus, bonusBp: w.bonusBp, total: w.total }; }
    case 'estimate': return calc.estimate(i.totalCredits, i.avgCredits, i.coursesPerPerson);
    case 'guard': return calc.guard(i.amount, i.bonusBp);
    case 'partial': return calc.partial(i.amount, i.totalCredits, i.pct);
    case 'deductMany': return calc.deductMany(i.price, i.n, i.fromN, i.offBp);
    case 'restorable': return calc.restorable(i.hours, i.progPct);
    case 'settle': return calc.settle(i.rows);
    case 'cpOf': return calc.cpOf(i.credits);
    case 'sum': return calc.sum(i.values);
    case 'expiry': return calc.expiry(i.start);
    case 'useLots': return calc.useLots(i.lots, i.n);
    case 'capOk': return i.cases.map(x => calc.capOk(...x));
    case 'needApproval': return i.cases.map(x => calc.needApproval(...x));
    case 'alertOf': return i.cases.map(x => calc.alertOf(...x));
    case 'priceAt': { const r = i.days.map(d => calc.priceAt(i.history, d)); return { listPrice: r.map(x => x.listPrice), credits: r.map(x => calc.credits(x.listPrice)), effectiveFrom: calc.effectiveFrom(i.asked) }; }
    case 'eligibleFrom': return calc.eligibleFrom(i.launch, i.months);
    case 'optinMinEnd': return calc.optinMinEnd(i.from);
    case 'singleAuto': return calc.singleAuto(i.price, i.floorSum);
    case 'singleMin': return calc.singleMin(i.floorSum);
    case 'broker': return calc.broker(i.amount);
    case 'b2c': return calc.b2c(i.vatPrice);
    case 'path': return calc.path(i.vatPrice);
    case 'refundOf': return calc.refundOf(i.lots, i.day, i.o);
    default: throw new Error('알 수 없는 fn: ' + c.fn);
  }
};
const base = module.exports;
/* margin 묶음(dev-addendum 5장) */
module.exports = function run(calc, c) {
  const i = c.in;
  switch (c.fn) {
    case 'settleLine': return calc.settleLine(i.net, i.cpBp);
    case 'rateCheck': return calc.rateCheck(i.cpBp, i.agreeRef);
    case 'rateAt': { const rows = [{ effectiveFrom: '0000-01-01', cpBp: 6500 }, { effectiveFrom: calc.nextMonth1(i.asked), cpBp: i.cpBp }]; return { effectiveFrom: rows[1].effectiveFrom, cp: i.days.map(d => calc.settleLine(i.net, calc.rateAt(rows, d)).cp) }; }
    case 'santaMix': return calc.santaMix(i.lines);
    case 'recognized': { const rec = calc.recognized(i.credits, i.amount, i.totalCredits); const s = rec - i.cp, t = rec - i.cpStd; return { rec, santa: s, santaBp: Math.floor(s * 10000 / rec), santaStd: t, santaStdBp: Math.floor(t * 10000 / rec) }; }
    case 'promoCheck': return calc.promoCheck(i.slot, i.months, i.o);
    case 'promoDeduct': return calc.promoDeduct(i.total, i.fee, i.carryIn);
    case 'origCapOk': return calc.origCapOk(i.colCount, i.origCount);
    case 'alertLevel': return i.cases.map(x => calc.alertLevel(...x));
    case 'preNeeded': return i.cases.map(x => calc.preNeeded(...x));
    case 'validity': return i.starts.map(x => calc.validity(x));
    case 'capOkUi': return i.cases.map(x => calc.capOk(...x));
    default: return base(calc, c);
  }
};
