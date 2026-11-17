'use strict';
/* v43.6 셀프러닝 노트 lp.notes · 학습자 연결 lp.conn 정리(lpnotes.js) — Java PubServiceImpl.cleanNotes · cleanConn과 같은 기준값(tests/lpnotes-vectors.json).
   DB 없이 돈다. 운영 경로(PUT progress → cleanLP)는 learner-sync.test.js 방식과 같고 여기서는 규칙만 확인한다. */
const test = require('node:test'); const assert = require('node:assert');
const { cleanNotes, cleanConn, NOTES_BYTES } = require('../server/lpnotes');
const V = require('../../tests/lpnotes-vectors.json');
for (const v of V) test(`벡터: ${v.name}`, () => { const r = v.kind === 'conn' ? cleanConn(v.in) : cleanNotes(v.in); assert.deepStrictEqual(r, v.out); });
test('개수 제한: 노트 120 · 카드 300', () => {
  const items = Array.from({ length: 200 }, (_, i) => ({ id: 'n' + i.toString(36), t: '노트 ' + i, b: 'x' }));
  const cards = Array.from({ length: 400 }, (_, i) => ({ id: 'k' + i.toString(36), f: '앞 ' + i, k: '뒤', due: '2026-11-17' }));
  const r = cleanNotes({ items, cards }); assert.strictEqual(r.items.length, 120); assert.strictEqual(r.cards.length, 300); assert.strictEqual(r.items[0].id, 'n0');
});
test('길이 제한: 제목 80 · 본문 1500 · 카드 120/240 · 목표 40 · 페이지 60', () => {
  const r = cleanNotes({ items: [{ id: 'na', t: '가'.repeat(200), b: '나'.repeat(3000) }], cards: [{ id: 'ka', f: '다'.repeat(300), k: '라'.repeat(500), due: '2026-11-17' }], goal: { exam: '마'.repeat(90), date: '2027-01-01' }, sync: { notion: { on: true, page: '바'.repeat(99) } } });
  assert.strictEqual(r.items[0].t.length, 80); assert.strictEqual(r.items[0].b.length, 1500); assert.strictEqual(r.cards[0].f.length, 120); assert.strictEqual(r.cards[0].k.length, 240); assert.strictEqual(r.goal.exam.length, 40); assert.strictEqual(r.sync.notion.page.length, 60);
});
test('크기 안전장치: 360KB를 넘으면 오래된 노트부터 뺌', () => {
  const items = Array.from({ length: 120 }, (_, i) => ({ id: 'n' + i.toString(36), t: '제목', b: '한'.repeat(1500) }));
  const r = cleanNotes({ items }); assert.ok(Buffer.byteLength(JSON.stringify(r)) <= NOTES_BYTES); assert.ok(r.items.length < 120 && r.items.length > 60); assert.strictEqual(r.items[0].id, 'n0');
});
test('카드 due가 없으면 오늘(KST)', () => { const r = cleanNotes({ cards: [{ id: 'kz', f: '앞' }] }); assert.match(r.cards[0].due, /^\d{4}-\d{2}-\d{2}$/); assert.strictEqual(r.cards[0].iv, 1); assert.strictEqual(r.cards[0].ef, 2.5); });
test('app.js cleanLP가 notes · conn을 남기고 LP_MAX는 512KB', () => {
  const src = require('node:fs').readFileSync(require.resolve('../server/app.js'), 'utf8');
  assert.match(src, /const LP_MAX = 512 \* 1024/); assert.match(src, /cleanNotes\(lp\.notes\)/); assert.match(src, /cleanConn\(lp\.conn\)/);
});
test('marks: 300개 제한 · 키 형식', () => { const m = {}; for (let i = 0; i < 350; i++) m['ask:e' + i] = { pin: true }; const r = cleanNotes({ marks: m }); assert.strictEqual(Object.keys(r.marks).length, 300); assert.deepStrictEqual(cleanNotes({ marks: { 'x:1': { pin: true } } }).marks, {}); });
