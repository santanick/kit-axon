'use strict';
/* v40 화면 계산(didisam/faccalc.js) = Node service/server/fac/calc.js — tests/fac-vectors.json 전 항목 대조(브라우저 없이) */
const path = require('node:path'); const F = require(path.resolve(__dirname, '../../didisam/faccalc.js')); const V = require(path.resolve(__dirname, '../fac-vectors.json'));
const fac = x => typeof x === 'string' ? V.facilities[x] : x, pr = x => typeof x === 'string' ? V.products[x] : x;
const sub = (o, e) => e === null || typeof e !== 'object' ? o === e : Object.keys(e).every(k => JSON.stringify(o[k]) === JSON.stringify(e[k]));
const run = { quote: i => F.quote({ ...i, fac: fac(i.fac), product: i.product ? pr(i.product) : undefined }), slots: i => { const L = F.slotsOf(fac(i.fac), i.day); return { count: L.length, first: L[0], last: L[L.length - 1] }; }, slotTime: i => F.slotTime(fac(i.fac), i.day, i.startSlot, i.slots), openState: i => F.openState(fac(i.fac), i.day, i.now), refund: i => F.refund({ ...i, rule: typeof i.rule === 'string' ? V.facilities[i.rule].refund : i.rule }), lateFee: i => F.lateFee(i), noShow: i => F.isNoShow(i), suspension: i => F.suspension(i), dupSame: i => F.dupSame(i.existing, i.req) };
let pass = 0, fail = 0;
for (const k in run) for (const v of V[k] || []) { let e = v.out; if (k === 'slotTime') e = { startAt: Date.parse(e.startAt), endAt: Date.parse(e.endAt) }; if (k === 'slots' && !e.first) e = { count: e.count }; const o = run[k](v.in); if (sub(o, e)) pass++; else { fail++; console.error('✗', k, v.name || '', JSON.stringify(o)); } }
/* 화면 보조 이름 유지(이용자 화면이 씀) */
['quote', 'slots', 'isOpen', 'dayHours', 'refund', 'lateFee'].forEach(n => { if (typeof F[n] === 'function') pass++; else { fail++; console.error('✗ 함수 없음', n); } });
const io = F.isOpen(V.facilities.golf, '2026-11-24', '2026-11-17T08:00'); if (io.open === false && io.reason === 'not_open') pass++; else { fail++; console.error('✗ isOpen 호환', JSON.stringify(io)); }
console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
