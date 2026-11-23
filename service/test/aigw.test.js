'use strict';
/* v46 Ver2 AI 게이트웨이 · 학습 이벤트 API 시험 — 정책 off는 기존 요청 본문 그대로, on이면 L0 차단 · 레벨 지시문 · 힌트 잠금 · 기능 한도 · 대화 저장(암호화) · 이벤트 */
const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http');
const { poolFrom, migrate, inTenant } = require('../server/db'); const { createApp } = require('../server/app');
const AG = require('../server/aigw'); const LEV = require('../server/lev');

test('aigw 단위: 레벨 판정 · 힌트 검증', () => {
  const pol = AG.polOf({ on: true, lvl: 'L2', preset: { exam: 'L0', assign: 'L1' } });
  assert.equal(AG.levelOf(AG.polOf({ on: false }), { ai: { lvl: 'L3' } }), '');
  assert.equal(AG.levelOf(pol, { type: 'exam' }), 'L0'); assert.equal(AG.levelOf(pol, { type: 'assign' }), 'L1'); assert.equal(AG.levelOf(pol, { type: 'exam', ai: { lvl: 'L2' } }), 'L2');
  assert.equal(AG.levelOf(AG.polOf({ on: true, lvl: 'L3' }), {}), 'L3');
  const it = { ai: { lvl: 'L1', sol: false } };
  assert.equal(AG.hintCheck('L1', it, null, { step: 2 }).err.code, 'hint_locked'); /* 건너뛰기 */
  const h1 = AG.hintCheck('L1', it, null, { step: 1 }); assert.equal(h1.next.step, 1);
  assert.equal(AG.hintCheck('L1', it, h1.next, { step: 2 }).err.code, 'hint_locked'); /* 시도 없음 */
  assert.equal(AG.hintCheck('L1', it, h1.next, { step: 2, attempt: '내 풀이는 x=3' }).next.step, 2);
  assert.ok(AG.hintCheck('L2', it, h1.next, { step: 2 }).next); /* L2 잠금 완화 */
  assert.equal(AG.hintCheck('L1', it, { step: 4 }, { step: 5, attempt: '자기 설명을 충분히 적었습니다', selfExp: true }).err.code, 'hint_locked'); /* sol 없음 */
  const sol = { ai: { lvl: 'L1', sol: true } };
  assert.equal(AG.hintCheck('L1', sol, { step: 4 }, { step: 5, attempt: '짧음' }).err.code, 'hint_locked'); /* 자기 설명 없음 */
  assert.equal(AG.hintCheck('L1', sol, { step: 4 }, { step: 5, attempt: '자기 설명을 충분히 적었습니다', selfExp: true }).next.step, 5);
  assert.equal(AG.hintCheck('L1', it, null, { step: 9 }).err.status, 400);
  assert.deepEqual(Object.keys(AG.pubPol({ on: true, train: true, preset: {} })).sort(), ['evalNotice', 'lvl', 'on', 'preset', 'retain']); /* 통합 v46: preset은 학습자 레벨 판정용으로 공개(train · quota는 비공개 유지) */
});

test('lev 단위: 글 거부 · diffLp', () => {
  assert.throws(() => LEV.cleanEvent({ verb: 'reflect', obj: 'c1/i1', text: '오늘 배운 것' }), e => e.code === 'lev_free_text');
  assert.throws(() => LEV.cleanEvent({ verb: 'reflect', val: { note: '오늘 배운 것은 무엇' } }), e => e.code === 'lev_free_text');
  assert.throws(() => LEV.cleanEvent({ verb: 'jump' }), e => e.code === 'lev_verb');
  assert.throws(() => LEV.cleanBatch(Array.from({ length: 51 }, () => ({ verb: 'attempt' }))), e => e.code === 'lev_batch');
  assert.deepEqual(LEV.cleanEvent({ verb: 'attempt', obj: 'c1/i1', lvl: 'L1', val: { len: 40 } }).val, { len: 40 });
  const ev = LEV.diffLp({ cls: { c1: { items: { a: { done: true } } } } }, { cls: { c1: { items: { a: { done: true }, b: { done: true, score: 90 } } } }, vision: { at: 't1', goals: [{ id: 'g1', done: true }] } });
  assert.deepEqual(ev.map(e => e.verb).sort(), ['goal', 'submit', 'vision']); assert.equal(ev.find(e => e.verb === 'submit').obj, 'c1/b');
});

test('게이트웨이 · 이벤트 API', async t => {
  const seen = []; let usage = { input_tokens: 10, output_tokens: 5 };
  const ai = http.createServer((q, r) => { let b = ''; q.on('data', c => { b += c; }); q.on('end', () => { seen.push(JSON.parse(b)); r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ model: 'claude-haiku-5-5', content: [{ type: 'text', text: '먼저 개념을 떠올려 볼까요?' }], usage })); }); });
  await new Promise(ok => ai.listen(0, ok));
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', ANTHROPIC_API_KEY: 'sk-ant-test', ANTHROPIC_URL: `http://127.0.0.1:${ai.address().port}/v1/messages`, PII_KEY: 'a'.repeat(64) }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `gw${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'univ', code: 'C0DE' })).j.tenant;
  const pub = { org: { name: '산타대학교' }, pages: [], classes: [{ id: 'c1', name: '미적분', items: [{ id: 'i1', title: '극한' }] }] };
  const items = [{ id: 'i1', title: '극한', type: 'assign', ai: { lvl: 'L1', sol: false } }, { id: 'x1', title: '중간고사', type: 'exam' }, { id: 'i3', title: '실무', type: 'assign', ai: { lvl: 'L2' } }];
  const doc = aipol => ({ org: { name: 'A', type: 'univ', room: { mode: 'saas' } }, settings: { tutor: { enabled: true, daily: 50, help: 'hint' } }, lsite: { pub }, ...(aipol ? { aipol } : {}),
    codes: [{ sid: '20260001', dept: '수학', code: 'ABC234' }], members: [{ id: 'm1', sid: '20260001', name: '20260001' }], badges: [],
    classes: [{ id: 'c1', name: '미적분', items, prog: { m1: { p: 50, assign: 'submitted', fb: 'AI초안피드백', score: 70, ai: { total: 70, fb: 'AI초안피드백' } } } }] });
  let rev = (await call('A', 'PUT', '/api/state', { doc: doc({ on: false, v: 1 }), rev: 0 })).j.rev;
  assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/login`, { sid: '20260001', code: 'abc234' })).status, 200);

  await t.test('정책 off: item · hint를 보내도 기존 요청 본문과 같음 · 응답에 lvl 없음', async () => {
    const r0 = await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '극한이 뭐예요?' }); const b0 = seen[seen.length - 1];
    const r1 = await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '극한이 뭐예요?', item: { key: 'c1/x1', lvl: 'L3' }, hint: { step: 5 } }); const b1 = seen[seen.length - 1];
    assert.equal(r0.status, 200); assert.equal(r1.status, 200); assert.deepEqual(b1, b0); assert.equal(r1.j.lvl, undefined);
    assert.ok(!/AI 레벨/.test(b1.system));
    const s = await call('A', 'GET', '/api/ai/usage'); assert.equal(s.j.byFeature.tutor.calls, 2); assert.ok(s.j.days[0].calls >= 2);
    assert.equal(await inTenant(pool, A.tid, async c => (await c.query('select count(*)::int n from ai_turn')).rows[0].n), 0);
    const site = await call('X', 'GET', `/api/pub/${A.tid}/site`); assert.equal(site.j.site.aipol, undefined);
  });
  await t.test('정책 off: 미승인 AI 초안(p.ai)은 학습자 me에 숨김', async () => {
    const me = await call('L', 'GET', `/api/pub/${A.tid}/me`); const g = JSON.stringify(me.j); assert.ok(!g.includes('AI초안피드백'));
  });
  await t.test('정책 on: L0 시험 403 · 레벨 지시문 · 공개 aipol', async () => {
    const d = doc({ on: true, v: 1, lvl: 'L1', preset: { exam: 'L0', assign: 'L1' }, retain: 'term', evalNotice: true, train: false, quota: { tutor: 7 } });
    d.classes[0].prog.m1.fbSent = { at: '2026-11-23', by: 'A' };
    rev = (await call('A', 'PUT', '/api/state', { doc: d, rev })).j.rev; assert.ok(rev > 1);
    const x = await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '답 알려줘', item: { key: 'c1/x1', lvl: 'L3' } }); assert.equal(x.status, 403); assert.equal(x.j.error, 'ai_level_off');
    const n = seen.length; const r = await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '실무 정리 부탁', item: { key: 'c1/i3' } });
    assert.equal(r.status, 200); assert.equal(r.j.lvl, 'L2'); assert.match(seen[n].system, /파트너\(L2\)/);
    const site = await call('X', 'GET', `/api/pub/${A.tid}/site`); assert.deepEqual(site.j.site.aipol, { on: true, lvl: 'L1', retain: 'term', evalNotice: true, preset: { exam: 'L0', assign: 'L1' } });
    const me = await call('L', 'GET', `/api/pub/${A.tid}/me`); assert.ok(JSON.stringify(me.j).includes('AI초안피드백')); /* 승인 발송 뒤 보임 */
  });
  await t.test('정책 on: 힌트 사다리 서버 검증 · lp.hint 서버 소유 · 이벤트(신뢰 A)', async () => {
    const H = (step, attempt, extra) => call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '힌트 주세요', cls: 'c1', item: 'i1', hint: { step, attempt, ...extra } });
    assert.equal((await H(2)).j.error, 'hint_locked');
    const a = await H(1); assert.equal(a.status, 200); assert.equal(a.j.hint.step, 1); assert.match(seen[seen.length - 1].system, /힌트 1단계/);
    assert.equal((await H(2)).status, 409);
    await call('L', 'PUT', `/api/pub/${A.tid}/progress`, { lp: { hint: { 'c1/i1': { step: 5 } } } }); /* 클라이언트 위조는 무시 */
    assert.equal((await H(3, '시도')).j.error, 'hint_locked');
    const b = await H(2, '극한값을 대입해 봤어요'); assert.equal(b.status, 200); assert.equal(b.j.hint.step, 2);
    const ev = await call('A', 'GET', '/api/lev?sid=20260001'); const vs = ev.j.rows.map(r => r.verb);
    assert.ok(vs.includes('ai.ask') && vs.includes('hint') && vs.includes('attempt'));
    assert.ok(ev.j.rows.every(r => !JSON.stringify(r.val).includes('극한값'))); assert.equal(ev.j.rows.find(r => r.verb === 'attempt').val.len, 12);
  });
  await t.test('정책 on: 대화 기록 암호화 저장 · 기한 지나면 삭제', async () => {
    const rows = await inTenant(pool, A.tid, async c => (await c.query('select * from ai_turn order by id')).rows);
    assert.ok(rows.length >= 3); assert.ok(rows.every(r => r.q_enc.startsWith('enc1:') && !r.q_enc.includes('힌트')));
    assert.ok(rows[0].purge_at - rows[0].at > 180 * 864e5);
    await inTenant(pool, A.tid, c => c.query("update ai_turn set purge_at = now() - interval '1 day' where id = $1", [rows[0].id]));
    const gw = AG.createGateway({ pool, inTenant, keys: { enc: Buffer.alloc(32) }, today: () => '', HttpErr: Error });
    assert.equal(await inTenant(pool, A.tid, c => gw.purge(c, A.tid)), 1);
  });
  await t.test('정책 on: 기능별 한도 429 ai_feature_quota', async () => {
    let last; for (let i = 0; i < 6; i++) last = await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '질문 ' + i });
    assert.equal(last.status, 429); assert.equal(last.j.error, 'ai_feature_quota');
  });
  await t.test('이벤트 API: 묶음 저장 · 글 거부 · 50건 제한 · 조회 필터', async () => {
    const ok = await call('L', 'POST', `/api/pub/${A.tid}/lev`, { ev: [{ verb: 'reflect', obj: 'c1/i1', val: { len: 80 } }, { verb: 'mastery', obj: 'k1', val: { score: 85 } }] }); assert.equal(ok.status, 200); assert.equal(ok.j.n, 2);
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/lev`, { ev: [{ verb: 'reflect', text: '오늘 배운 것' }] })).j.error, 'lev_free_text');
    assert.equal((await call('L', 'POST', `/api/pub/${A.tid}/lev`, { ev: Array.from({ length: 51 }, () => ({ verb: 'attempt' })) })).j.error, 'lev_batch');
    assert.equal((await call('X', 'POST', `/api/pub/${A.tid}/lev`, { ev: [{ verb: 'attempt' }] })).status, 401);
    const f = await call('A', 'GET', '/api/lev?verb=mastery'); assert.equal(f.j.rows.length, 1); assert.equal(f.j.rows[0].trust, 'C'); assert.equal(f.j.rows[0].src, 'client');
    const c1 = await call('A', 'GET', '/api/lev?cls=c1&verb=reflect'); assert.equal(c1.j.rows.length, 1);
    await call('L', 'PUT', `/api/pub/${A.tid}/progress`, { lp: { cls: { c1: { items: { i1: { done: true } } } }, vision: { card: { who: '데이터 분석가', why: '010-1234-5678', how: '매일' }, goals: [{ t: '통계 A', by: '2027-01' }], at: 't1' } } });
    const s = await call('A', 'GET', '/api/lev?verb=submit'); assert.equal(s.j.rows[0].obj, 'c1/i1'); assert.equal(s.j.rows[0].trust, 'C');
    const me = await call('L', 'GET', `/api/pub/${A.tid}/me`); const v = me.j.lp && me.j.lp.vision; if (v) { assert.equal(v.card.who, '데이터 분석가'); assert.ok(!v.card.why.includes('1234-5678')); }
  });
  await t.test('AI 고지 확인(consent ai) · 비전 대화 모드(feature vision)', async () => {
    const c = await call('L', 'POST', `/api/pub/${A.tid}/consent`, { ai: true }); assert.equal(c.status, 200); assert.ok(c.j.aiAt);
    const n = seen.length; const v = await call('L', 'POST', `/api/pub/${A.tid}/tutor`, { q: '저는 데이터에 관심 있어요', mode: 'vision', step: 1 });
    assert.equal(v.status, 200); assert.match(seen[n].system, /비전 대화 1\/6단계/);
    const u = await call('A', 'GET', '/api/ai/usage'); assert.equal(u.j.byFeature.vision.calls, 1);
  });
  await t.test('aipol.train은 정운영자만(운영자 본인은 변경 가능)', async () => {
    const d = doc({ on: true, v: 1, lvl: 'L1', retain: 'none', train: true }); const r = await call('A', 'PUT', '/api/state', { doc: d, rev }); assert.equal(r.status, 200); rev = r.j.rev;
  });
  app.close(); ai.close(); await pool.end();
});
