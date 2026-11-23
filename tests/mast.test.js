'use strict';
/* v46 D6 숙달 판정 · 오늘 익힐 것 선정 · 작은 성취 단위 시험(순수 계산) — 사용: node --test tests/mast.test.js */
const test = require('node:test'); const assert = require('node:assert');
const M = require('../didisam/mastcalc.js'); const V = require('./mastery-vectors.json');
test('숙달 판정 벡터(SPEC 1-3)', () => { for (const v of V.judge) { const r = M.judge(v.ev); assert.strictEqual(r.st, v.st, v.n); if (v.reg != null) assert.strictEqual(r.reg, v.reg, v.n + ' reg'); if (v.hist != null) assert.strictEqual(r.hist.length, v.hist, v.n + ' hist');
  assert.deepStrictEqual(M.judge(v.ev), r, v.n + ' 같은 입력 같은 결과'); } });
const NOW = '2026-12-10T03:00:00Z';
const C = { id: 'c1', name: '데이터', concepts: [{ id: 'k1', name: '평균', wk: 1 }, { id: 'k2', name: '중앙값', wk: 2 }, { id: 'k3', name: '결측값', wk: 3 }, { id: 'k4', name: '그래프', wk: 4 }, { id: 'k5', name: '상관', wk: 5 }],
  items: [{ id: 'q1', type: 'quiz', week: 1, loop: 'check', concepts: ['k1'], qs: [1, 2, 3, 4, 5] }, { id: 'a2', type: 'assign', week: 2, title: '과제2' }, { id: 'q3', type: 'quiz', week: 3, loop: 'check', concepts: ['k3'] }, { id: 'a4', type: 'assign', week: 4, due: '2026-12-14T14:00:00Z', title: '과제4' }, { id: 'v5', type: 'video', week: 5 }] };
const REC = { items: { q1: { tries: [{ at: '2026-12-08T01:00:00Z', score: 70 }] }, a2: { subs: [{ at: '2026-12-01T01:00:00Z' }] },
  q3: { tries: [{ at: '2026-11-20T01:00:00Z', score: 90 }, { at: '2026-11-21T01:00:00Z', score: 90 }, { at: '2026-12-05T01:00:00Z', score: 40 }] } }, refl: { 1: { s: 'x', r: 'y', at: '2026-12-08T02:00:00Z' } } };
test('개념별 상태(과정 · 항목 · 기록)', () => { const L = M.course(C, REC, {}, { now: NOW }); const st = Object.fromEntries(L.map(k => [k.id, k.st]));
  assert.deepStrictEqual(st, { k1: 'prog', k2: 'prog', k3: 'prog', k4: 'new', k5: 'new' }); assert.ok(L.find(k => k.id === 'k3').reg); assert.ok(L.find(k => k.id === 'k4').due); assert.strictEqual(L.find(k => k.id === 'k1').check.n, 5); });
test('오늘 익힐 것 선정 순서 ① 마감 ② 익히는 중 최근 ③ 되돌림 ④ 다음 차시', () => { const L = M.course(C, REC, {}, { now: NOW }); const R = M.rank(L, { now: NOW });
  assert.deepStrictEqual(R.map(x => x.id + ':' + x.why), ['k4:due', 'k1:prog', 'k3:reg', 'k2:next', 'k5:next']);
  const T = M.today(L, null, { now: NOW }); assert.deepStrictEqual(T.ids, ['c1/k4', 'c1/k1', 'c1/k3']); assert.strictEqual(T.rows.length, 3);
  const T2 = M.today(L, T, { now: '2026-12-10T14:00:00Z' }); assert.deepStrictEqual(T2.ids, T.ids, '같은 날 유지');
  const S = M.swap(L, T, 1, { now: NOW }); assert.deepStrictEqual(S.ids, ['c1/k4', 'c1/k2', 'c1/k3'], '다른 개념으로'); });
test('빈 상태 · 모두 숙달 · 목표 완료', () => { assert.strictEqual(M.today([], null, { now: NOW }).empty, 'none'); const L = M.course(C, REC, {}, { now: NOW }).map(k => ({ ...k, st: 'done', reg: false, due: '' }));
  assert.strictEqual(M.today(L, null, { now: NOW }).empty, 'all'); const L2 = M.course(C, REC, {}, { now: NOW }); const T = M.today(L2, null, { now: NOW }); const done = L2.map(k => ({ ...k, st: 'done' })); assert.ok(M.today(done, T, { now: NOW }).done); });
test('개념 미등록 과정은 차시 제목을 개념 1개로', () => { const K = M.conceptsOf({ items: [{ type: 'video', week: 1, title: '과정: 오리엔테이션' }, { type: 'quiz', week: 1 }, { type: 'chapter', week: 2, title: '2주차 핵심' }] });
  assert.deepStrictEqual(K, [{ id: 'w1', name: '오리엔테이션', wk: 1 }, { id: 'w2', name: '2주차 핵심', wk: 2 }]); });
test('작은 성취 6종 · 하루 1회 · 마일리지 기본 0점 · 꺼짐', () => { const rec = { items: { a: { subs: [{ at: '2026-12-01T01:00:00Z' }, { at: '2026-12-01T05:00:00Z' }, { at: '2026-12-02T01:00:00Z' }] }, q: { tries: [{ at: '2026-12-01T01:00:00Z', score: 60 }, { at: '2026-12-02T01:00:00Z', score: 80 }, { at: '2026-12-03T01:00:00Z', score: 90 }] } }, refl: { 1: { r: 'x', at: '2026-12-02T01:00:00Z' } } };
  const c = { id: 'c', items: [{ id: 'a', type: 'assign', week: 1 }, { id: 'q', type: 'quiz', week: 1 }] }; const cp = M.course(c, rec, {}, { now: NOW });
  const A = M.ach({ courses: [{ c, rec, cpts: cp }], goals: ['2026-12-03'] }); const K = A.map(a => a.k).sort();
  assert.deepStrictEqual([...new Set(K)].sort(), ['goal', 'improve', 'mastery', 'reflect', 'streak', 'submit']); assert.strictEqual(A.filter(a => a.k === 'submit').length, 2, '같은 날 제출 2회 → 1건');
  assert.strictEqual(new Set(A.map(a => a.id)).size, A.length, 'id 중복 0'); assert.ok(A.every(a => a.pts === 0), '기본 0점'); assert.deepStrictEqual(M.mileEvents(A, null), [], '꺼짐이면 마일리지 이벤트 0');
  const A2 = M.ach({ courses: [{ c, rec, cpts: cp }], goals: ['2026-12-03'] }, { pol: { on: true } }); assert.strictEqual(A2.find(a => a.k === 'mastery').pts, 10); const ME = M.mileEvents(A2, { on: true });
  assert.strictEqual(ME.length, A2.length); assert.ok(ME.every((e, i) => e.srcId === A2[i].id), 'srcId = 작은 성취 id'); assert.deepStrictEqual(M.ach({ courses: [{ c, rec, cpts: cp }], goals: ['2026-12-03'] }), A, '다시 계산해도 같음'); });
test('정거장 진척 = 연결 개념 숙달 비율 · 연속 학습', () => { const K = [{ cid: 'c', id: 'k1', st: 'done' }, { cid: 'c', id: 'k2', st: 'prog' }, { cid: 'c', id: 'k3', st: 'done' }, { cid: 'c', id: 'k4', st: 'done' }];
  const S = M.stations([{ t: 'A' }, { t: 'B' }], K); assert.deepStrictEqual(S.map(s => [s.n, s.of, s.left, s.full]), [[1, 2, 1, false], [2, 2, 0, true]]);
  assert.deepStrictEqual(M.stations([{ t: 'A', cpts: ['k2'] }], K).map(s => s.left), [1]); assert.strictEqual(M.streak(['2026-12-08', '2026-12-09', '2026-12-10'], NOW), 3); assert.strictEqual(M.streak(['2026-12-08', '2026-12-09'], NOW), 2); assert.ok(M.reached(K) === false); });
