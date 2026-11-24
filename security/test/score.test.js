/* node --test security/test/score.test.js — 보안 점수 계산 · 정직성 검사 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const S = require('../score.js');

const ck = (over = {}) => ({ items: Array.from({ length: 15 }, (_, i) => ({ id: String(i + 1).padStart(2, '0'), status: '부분', remaining: '남음', evidence: [], ...(over[i + 1] || {}) })) });

test('① 우선순위 가중치 · 완료 상태 제외 · partial은 감점', () => {
  const v = S.vulnScore({ items: [
    { id: 'A', severity: 'medium', priority: 'P1', status: 'open' },
    { id: 'B', severity: 'medium', status: 'partial' },
    { id: 'C', severity: 'low', status: 'open' },
    { id: 'D', severity: 'info', status: 'needs_verify' },
    { id: 'E', severity: 'high', status: 'fixed' },
    { id: 'F', severity: 'critical', status: 'accepted' }
  ] });
  assert.strictEqual(v.deduct, 10 + 3 + 1 + 1);
  assert.strictEqual(v.score, 85);
  assert.deepStrictEqual(v.errors, []);
});

test('① 0 미만은 0, 알 수 없는 값은 오류', () => {
  assert.strictEqual(S.vulnScore({ items: [1, 2, 3, 4, 5].map(i => ({ id: 'X' + i, severity: 'critical', status: 'open' })) }).score, 0);
  assert.strictEqual(S.vulnScore({ items: [{ id: 'Y', severity: 'weird', status: 'done' }] }).errors.length, 2);
});

test('② 충족 1 · 부분 0.5 · 미흡 0 — 보고서 기준 63점', () => {
  const ev = { status: '충족', evidence: ['security/score.js'], remaining: '' };
  const c = S.checklistScore(ck({ 3: ev, 4: ev, 5: ev, 8: ev, 10: ev, 15: { status: '미흡' } }));
  assert.deepStrictEqual(c.errors, []);
  assert.strictEqual(Math.round(c.score), 63);
  assert.strictEqual(S.total({ score: 79 }, c), 71); /* 브리프 산식 (79 + 63) ÷ 2 */
});

test('정직성: 근거 없는 충족 · 없는 근거 파일 · 빈 remaining · 항목 수', () => {
  const c = S.checklistScore(ck({ 1: { status: '충족', evidence: [] }, 2: { status: '충족', evidence: ['nope/missing.js:3'] }, 3: { remaining: '' }, 4: { status: '충분' } }));
  const e = c.errors.join('\n');
  assert.match(e, /01: 근거\(evidence\) 없는 충족/);
  assert.match(e, /02: 근거 파일이 없습니다 — nope\/missing\.js/);
  assert.match(e, /03: 부분인데 남은 것/);
  assert.match(e, /04: status는 충족 · 부분 · 미흡만/);
  assert.ok(S.checklistScore({ items: ck().items.slice(0, 14) }).errors.some(x => /15항목/.test(x)));
});

test('저장소의 실제 원장 · 체크리스트는 정직성 검사를 통과', () => {
  const r = S.report(path.join(__dirname, '../findings/seed.json'), path.join(__dirname, '../checklist.json'));
  assert.deepStrictEqual(r.errors, []);
  assert.ok(r.total >= 0 && r.total <= 100);
});
