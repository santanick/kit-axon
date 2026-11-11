'use strict';
/* v38 서버 출석률(attRate) = 화면 공용 계산(didisam/attcalc.js DDAtt) 대조 — 운영 서버 /api/cpl/completion 수료 판정이 화면 clsDone과 같은 출결 기준을 쓰는지.
   Java(CplServiceImpl.attRate)는 service-egov/test/contract-cpl.js의 completion 대조로 같은 값을 확인한다. */
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const { attRate } = require('../server/compliance');
const W = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../didisam/attcalc.js'), 'utf8'), { window: W, Date });
const TODAY = '2026-11-11';
const cases = [
  ['출석 5 · 지각 0', { curriculum: [1, 2, 3, 4, 5].map(k => ({ id: 'o' + k, type: 'offline', date: '2026-11-0' + k })), att: Object.fromEntries([1, 2, 3, 4, 5].map(k => ['o' + k, { m: '출석' }])) }],
  ['결석 2 · 지각 1 = 60%', { curriculum: [1, 2, 3, 4, 5].map(k => ({ id: 'o' + k, type: 'offline', date: '2026-11-0' + k })), att: { o1: { m: '출석' }, o2: { m: '결석' }, o3: { m: '출석' }, o4: { m: '결석' }, o5: { m: { st: '지각' } } } }],
  ['지각 3 = 결석 1(고용노동부)', { curriculum: [1, 2, 3, 4, 5].map(k => ({ id: 'o' + k, type: 'live', date: '2026-11-0' + k })), att: { o1: { m: '출석' }, o2: { m: '출석' }, o3: { m: '지각' }, o4: { m: '지각' }, o5: { m: '조퇴' } } }],
  ['지난 미입력 = 결석 · 오늘 이후 제외', { curriculum: [{ id: 'a', type: 'offline', date: '2026-11-01' }, { id: 'b', type: 'offline', date: '2026-11-11' }, { id: 'c', type: 'offline', date: '2026-12-01' }], att: {} }],
  ['수강 제외 회차', { curriculum: [{ id: 'a', type: 'offline', date: '2026-11-01' }, { id: 'b', type: 'offline', date: '2026-11-02' }], att: { a: { m: '출석' } }, enr: { m: { ex: ['b'] } } }],
  ['회차 클래스 · QR 출결(mid:n)', { kind: 'episode', sessions: [{ id: 's1', date: '2026-11-01' }, { id: 's2', date: '2026-11-02' }], att: { s1: { m: '출석' }, 'm:0': '출석', 'm:1': '결석' } }],
  ['출결 수업 없음 → null', { curriculum: [{ id: 'v', type: 'video' }], att: {} }]
];
test('서버 attRate = 화면 DDAtt', () => {
  for (const [name, cl] of cases) for (const conv of [true, false]) {
    const want = W.DDAtt.of(cl, 'm', { conv, today: TODAY }).rate; const got = attRate(cl, 'm', conv, TODAY);
    assert.equal(got, want, `${name} conv=${conv}`);
  }
  assert.equal(attRate(cases[1][1], 'm', true, TODAY), 60);
  assert.equal(attRate(cases[2][1], 'm', true, TODAY), 80);
  assert.equal(attRate(cases[2][1], 'm', false, TODAY), 100);
  assert.equal(attRate(cases[6][1], 'm', true, TODAY), null);
});
