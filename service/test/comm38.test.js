'use strict';
/* v38 C#17 학습자 글 · 댓글 즉시 게시 — 운영자 화면을 열지 않아도 같은 기관 학습자에게 보인다.
   권한(쓰기 · 공개 범위 · 승인 필요) · 정화 · 길이 · 시도 횟수 · 운영자 반영 뒤 중복 없음 · 다른 기관 분리 · 위조한 _cm 무시 */
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const CL = require('../server/commlive');

test('학습자 글 · 댓글 즉시 게시', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', PII_KEY: crypto.randomBytes(32).toString('hex') }, log: {} }); await new Promise(ok => app.listen(0, ok));
  const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `ca${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'A', type: 'adult', code: 'C0DE' })).j.tenant;
  const B = (await call('B', 'POST', '/api/signup', { email: `cb${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: 'B', type: 'adult', code: 'C0DE' })).j.tenant;
  const au = sid => CL.H(A.tid + ':' + sid);
  const comm = (posts = []) => ({ v: 1, tid: A.tid, boards: [
    { id: 'free', name: '자유', type: 'free', write: 'all', cmt: true, file: true, perm: { type: 'all', cls: [], who: [] } },
    { id: 'notice', name: '공지', type: 'notice', write: 'admin', cmt: false, file: true, perm: { type: 'all', cls: [], who: [] } },
    { id: 'c1b', name: '과정', type: 'talk', write: 'all', cmt: true, file: true, perm: { type: 'cls', cls: ['c1'], who: [] } },
    { id: 'ok', name: '승인', type: 'free', write: 'all', cmt: true, file: true, appr: true, perm: { type: 'all', cls: [], who: [] } },
    { id: 'nocmt', name: '댓글 끔', type: 'free', write: 'all', cmt: false, file: true, perm: { type: 'all', cls: [], who: [] } }],
    posts, notes: [], reviews: [], enr: { c1: [au('L00001')] }, cfg: { c1: { community: 'class', kind: 'period' } }, layout: 'list' });
  const codes = [{ sid: 'L00001', code: 'AAA234' }, { sid: 'L00002', code: 'BBB234' }];
  const members = [{ id: 'm1', sid: 'L00001', name: '김철수' }, { id: 'm2', sid: 'L00002', name: '이영희', nick: '영희' }];
  const docA = (c, lpxSeq = 0) => ({ org: { name: 'A', type: 'adult', room: { mode: 'saas' } }, codes, members, lpxSeq, lsite: { pub: { org: { name: 'A' }, pages: [], comm: c } } });
  let rev = (await call('A', 'PUT', '/api/state', { doc: docA(comm()), rev: 0 })).j.rev;
  await call('B', 'PUT', '/api/state', { doc: { org: { name: 'B', type: 'adult', room: { mode: 'saas' } }, codes, members, lsite: { pub: { org: { name: 'B' }, pages: [], comm: { ...comm(), tid: B.tid } } } }, rev: 0 });
  for (const [w, sid, code, T] of [['L1', 'L00001', 'AAA234', A], ['L2', 'L00002', 'BBB234', A], ['LB', 'L00001', 'AAA234', B]]) assert.equal((await call(w, 'POST', `/api/pub/${T.tid}/login`, { sid, code })).status, 200);
  const P = (tid, p) => `/api/pub/${tid}/${p}`; const ev = (w, type, data, tid = A.tid) => call(w, 'POST', P(tid, 'events'), { type, id: data.id, data });
  const site = async (w = 'L2', tid = A.tid) => (await call(w, 'GET', P(tid, 'site'))).j.site.comm;

  await t.test('글: 바로 보임 · 정화 · 길이 · 가린 닉네임 · 작성자 키', async () => {
    assert.equal((await ev('L1', 'post-new', { id: 'po_a1', board: 'free', title: '<b>안녕</b>하세요', body: '<script>x()</script>본문 ' + 'ㄱ'.repeat(5000), kind: '질문', cls: 'zz' })).status, 200);
    const p = (await site()).posts.find(x => x.id === 'po_a1'); assert.ok(p, '운영자 화면 없이 다른 학습자에게 보여야 함');
    assert.equal(p.title, '안녕하세요'); assert.ok(!p.body.includes('<')); assert.equal(p.body.length, 4000); assert.equal(p.kind, '질문'); assert.equal(p.cls, '');
    assert.equal(p.nick, '김○○'); assert.equal(p.au, au('L00001')); assert.equal(p.admin, false); assert.deepEqual(p.cmts, []);
    assert.equal((await call('X', 'GET', P(A.tid, 'site'))).j.site.comm.posts[0].id, 'po_a1', '로그인 전 게시본에도 같은 모양');
  });
  await t.test('권한: 운영자만 쓰기 · 다른 과정 · 승인 필요 · 비밀 · 운영자에게만 → 대기(요청함에는 남음)', async () => {
    await ev('L2', 'post-new', { id: 'po_n1', board: 'notice', body: '공지 흉내' });
    await ev('L2', 'post-new', { id: 'po_c2', board: 'c1b', body: '남의 과정' });
    await ev('L1', 'post-new', { id: 'po_c1', board: 'c1b', body: '내 과정', cls: 'c1' });
    await ev('L1', 'post-new', { id: 'po_ok', board: 'ok', body: '승인 대기' });
    await ev('L1', 'post-new', { id: 'po_pv', board: 'free', body: '비밀', priv: true });
    await ev('L1', 'post-new', { id: 'po_to', board: 'free', body: '운영자에게만', tonly: true });
    await ev('L1', 'post-new', { id: 'po_bd', board: 'nope', body: '없는 게시판' });
    const ids = (await site()).posts.map(x => x.id);
    for (const id of ['po_n1', 'po_c2', 'po_ok', 'po_pv', 'po_to', 'po_bd']) assert.ok(!ids.includes(id), id + ' 게시되면 안 됨');
    assert.ok(ids.includes('po_c1')); assert.equal((await site()).posts.find(x => x.id === 'po_c1').cls, 'c1');
    const E = (await call('A', 'GET', P(A.tid, 'events'))).j.events; for (const id of ['po_n1', 'po_ok', 'po_pv']) assert.ok(E.some(e => e.data.id === id && !e.data._cm), id + ' 요청함에 대기');
  });
  await t.test('댓글 · 답글: 바로 보임 · 댓글 끈 게시판 · 중복 id', async () => {
    await ev('L2', 'post-cmt', { id: 'cm_1', post: 'po_a1', body: '<i>좋아요</i>' });
    await ev('L1', 'post-cmt', { id: 'cm_2', post: 'po_a1', parent: 'cm_1', body: '감사' });
    await ev('L2', 'post-cmt', { id: 'cm_1', post: 'po_a1', body: '두 번' });
    await ev('L2', 'post-cmt', { id: 'cm_x', post: 'po_ok', body: '대기 글' });
    await ev('L2', 'post-cmt', { id: 'cm_e', post: 'po_a1', body: '   ' });
    const p = (await site()).posts.find(x => x.id === 'po_a1'); assert.equal(p.cmts.length, 1); assert.equal(p.ncmt, 1);
    assert.equal(p.cmts[0].body, '좋아요'); assert.equal(p.cmts[0].nick, '영희'); assert.equal(p.cmts[0].au, au('L00002')); assert.match(p.cmts[0].at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    assert.equal(p.cmts[0].replies[0].id, 'cm_2'); assert.equal(p.cmts[0].replies[0].nick, '김○○');
    rev = (await call('A', 'PUT', '/api/state', { doc: docA(comm([{ id: 'po_s', board: 'nocmt', kind: '이야기', nick: '운영자', au: '', admin: true, title: 't', body: 'b', cmts: [], ncmt: 0, at: '2026-11-11' }])), rev })).j.rev;
    await ev('L2', 'post-cmt', { id: 'cm_n', post: 'po_s', body: '댓글 끔' });
    assert.equal((await site()).posts.find(x => x.id === 'po_s').cmts.length, 0);
  });
  await t.test('위조한 _cm 무시 · 다른 기관 분리', async () => {
    await ev('L2', 'post-new', { id: 'po_fk', board: 'notice', body: 'x', _cm: { p: { id: 'po_fk', board: 'notice', nick: '운영자', admin: true, body: '가짜 공지' } } });
    assert.ok(!(await site()).posts.some(x => x.id === 'po_fk'));
    await ev('LB', 'post-new', { id: 'po_b1', board: 'free', body: 'B 기관' }, B.tid);
    assert.ok(!(await site()).posts.some(x => x.id === 'po_b1')); assert.ok((await site('LB', B.tid)).posts.some(x => x.id === 'po_b1'));
  });
  await t.test('운영자 화면이 반영하면(lpxSeq) 중복 없이 게시본 하나로 · 숨긴 글은 되살아나지 않음', async () => {
    const E = (await call('A', 'GET', P(A.tid, 'events'))).j; const p = (await site()).posts.find(x => x.id === 'po_a1');
    /* 운영자 화면은 po_a1을 반영하고 po_c1은 숨긴 채 게시 */
    rev = (await call('A', 'PUT', '/api/state', { doc: docA(comm([{ ...p, nick: '김○○', cmts: p.cmts }]), E.last), rev })).j.rev;
    const C = await site(); assert.equal(C.posts.filter(x => x.id === 'po_a1').length, 1); assert.equal(C.posts.find(x => x.id === 'po_a1').cmts.length, 1);
    assert.ok(!C.posts.some(x => x.id === 'po_c1'), '운영자가 반영하지 않은(숨긴) 글은 되살아나지 않음');
    await ev('L1', 'post-new', { id: 'po_a1', board: 'free', body: '같은 id 재전송' }); assert.equal((await site()).posts.filter(x => x.id === 'po_a1').length, 1);
    await ev('L1', 'post-cmt', { id: 'cm_9', post: 'po_a1', body: '반영 뒤 새 댓글' }); assert.equal((await site()).posts.find(x => x.id === 'po_a1').cmts.length, 2);
  });
  await t.test('시도 횟수 제한(글 10건 / 10분)', async () => {
    let last; for (let i = 0; i < 12; i++) last = await ev('L2', 'post-new', { id: 'po_r' + i, board: 'free', body: 'r' + i }); assert.equal(last.status, 429);
  });
  await t.test('단위: merge는 원본을 바꾸지 않음', () => {
    const pub = { comm: comm([{ id: 'p1', board: 'free', cmts: [], ncmt: 0 }]) }; const s0 = JSON.stringify(pub);
    const out = CL.merge(pub, [{ post: 'p1', parent: '', c: { id: 'c1', body: 'x', replies: [] } }, { p: { id: 'p2', board: 'free' } }]);
    assert.equal(JSON.stringify(pub), s0); assert.equal(out.comm.posts[0].id, 'p2'); assert.equal(out.comm.posts[1].cmts.length, 1);
    assert.equal(CL.H('tn_x:L1'), CL.H('tn_x:L1')); assert.equal(CL.clean('<a href=x>링크</a>\u0001', 10), '링크');
  });
  await new Promise(ok => app.close(ok)); await pool.end();
});
