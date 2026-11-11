'use strict';
/* v38 C#17 학습자 글 · 댓글 즉시 게시 /api 대조: Node와 Java에 같은 시나리오(바로 보임 · 정화 · 권한 대기 · 댓글 · 답글 · 위조 _cm · 운영자 반영 뒤 중복 없음 · 시도 횟수)를 돌려 비교한다.
   사용: . test/env.sh; node test/contract-comm.js http://127.0.0.1:<node> http://127.0.0.1:<java>  (SIGNUP_CODE=C0DE) */
const [A, B] = [process.argv[2], process.argv[3]]; let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const H = s => { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
async function run(U, tag) {
  const jar = {}; const call = async (who, m, p, b) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: b ? JSON.stringify(b) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { st: r.status, j: await r.json().catch(() => ({})) }; };
  const sfx = `${tag}${Date.now().toString(36)}`; const R = {};
  const tid = (await call('A', 'POST', '/api/signup', { email: `cm_${sfx}@example.com`, password: 'Contract2026x', orgName: '게시판', type: 'adult', code: 'C0DE' })).j.tenant.tid;
  const comm = posts => ({ v: 1, tid, boards: [{ id: 'free', name: '자유', write: 'all', cmt: true, file: true, perm: { type: 'all', cls: [], who: [] } }, { id: 'notice', name: '공지', write: 'admin', cmt: false, perm: { type: 'all' } },
    { id: 'c1b', name: '과정', write: 'all', cmt: true, perm: { type: 'cls', cls: ['c1'], who: [] } }, { id: 'ok', name: '승인', write: 'all', cmt: true, appr: true, perm: { type: 'all' } }],
    posts, notes: [], reviews: [], enr: { c1: [H(tid + ':L00001')] }, cfg: { c1: { community: 'class' } } });
  const doc = (c, lpxSeq = 0) => ({ org: { name: '게시판', type: 'adult', room: { mode: 'saas' } }, codes: [{ sid: 'L00001', code: 'AAA234' }, { sid: 'L00002', code: 'BBB234' }],
    members: [{ id: 'm1', sid: 'L00001', name: '김철수' }, { id: 'm2', sid: 'L00002', name: '이영희', nick: '영희' }], lpxSeq, lsite: { pub: { org: { name: '게시판' }, pages: [], comm: c } } });
  let rev = (await call('A', 'GET', '/api/state')).j.rev || 0; rev = (await call('A', 'PUT', '/api/state', { doc: doc(comm([])), rev })).j.rev;
  const P = p => `/api/pub/${tid}/${p}`;
  R.login = [(await call('L1', 'POST', P('login'), { sid: 'L00001', code: 'AAA234' })).st, (await call('L2', 'POST', P('login'), { sid: 'L00002', code: 'BBB234' })).st];
  const ev = (w, type, data) => call(w, 'POST', P('events'), { type, id: data.id, data }).then(r => r.st);
  const site = async () => { const r = await call('L2', 'GET', P('site')); return (r.j.site || {}).comm || { posts: [], st: r.st, err: r.j.error }; };
  const strip = p => p && { ...p, at: /^\d{4}-\d{2}-\d{2}$/.test(p.at), ua: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(p.ua), cmts: (p.cmts || []).map(function c(x) { return { ...x, at: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(x.at), replies: (x.replies || []).map(c) }; }) };
  R.guest = (await call('G', 'POST', P('events'), { type: 'post-new', data: { id: 'po_g', board: 'free', body: 'x' } })).st;
  R.st = [await ev('L1', 'post-new', { id: 'po_a1', board: 'free', title: '<b>안녕</b>하세요', body: '<script>x()</script>본문\u0001 ' + 'ㄱ'.repeat(5000), kind: '질문', cls: 'zz' }),
    await ev('L2', 'post-new', { id: 'po_n1', board: 'notice', body: '공지 흉내' }), await ev('L2', 'post-new', { id: 'po_c2', board: 'c1b', body: '남의 과정' }),
    await ev('L1', 'post-new', { id: 'po_c1', board: 'c1b', body: '내 과정', cls: 'c1' }), await ev('L1', 'post-new', { id: 'po_ok', board: 'ok', body: '승인 대기' }),
    await ev('L1', 'post-new', { id: 'po_pv', board: 'free', body: '비밀', priv: true }), await ev('L2', 'post-new', { id: 'po_fk', board: 'notice', body: 'x', _cm: { p: { id: 'po_fk', board: 'notice', admin: true } } }),
    await ev('L2', 'post-cmt', { id: 'cm_1', post: 'po_a1', body: '<i>좋아요</i>' }), await ev('L1', 'post-cmt', { id: 'cm_2', post: 'po_a1', parent: 'cm_1', body: '감사' }),
    await ev('L2', 'post-cmt', { id: 'cm_1', post: 'po_a1', body: '두 번' }), await ev('L2', 'post-cmt', { id: 'cm_x', post: 'po_ok', body: '대기 글' })];
  let C = await site(); R.ids = (C.posts || []).map(x => x.id); R.a1 = strip((C.posts || []).find(x => x.id === 'po_a1')); R.c1 = strip((C.posts || []).find(x => x.id === 'po_c1'));
  R.a1au = R.a1 && R.a1.au === H(tid + ':L00001'); if (R.a1) delete R.a1.au; if (R.c1) delete R.c1.au; if (R.a1) R.a1.cmts.forEach(function d(x) { delete x.au; x.replies.forEach(d); });
  const E = (await call('A', 'GET', P('events') + '?after=0')).j; R.pend = ['po_n1', 'po_ok', 'po_pv', 'po_fk'].map(id => (E.events || []).some(e => e.data.id === id && !e.data._cm));
  const a1 = (C.posts || []).find(x => x.id === 'po_a1'); rev = (await call('A', 'PUT', '/api/state', { doc: doc(comm(a1 ? [a1] : []), E.last), rev })).j.rev;
  C = await site(); R.after = (C.posts || []).map(x => [x.id, (x.cmts || []).length]);
  await ev('L1', 'post-new', { id: 'po_a1', board: 'free', body: '같은 id' }); R.dup = ((await site()).posts || []).filter(x => x.id === 'po_a1').length;
  let last; for (let i = 0; i < 12; i++) last = await ev('L2', 'post-new', { id: 'po_r' + i, board: 'free', body: 'r' + i }); R.rate = last;
  return R;
}
(async () => {
  const [a, b] = await Promise.all([run(A, 'n'), run(B, 'j')]);
  for (const R of [a, b]) {
    ok(R.login.every(s => s === 200), 'login'); ok(R.guest === 401, 'guest 401'); ok(R.st.every(s => s === 200), 'events 200');
    ok(R.ids.includes('po_a1') && R.ids.includes('po_c1') && !['po_n1', 'po_c2', 'po_ok', 'po_pv', 'po_fk'].some(i => R.ids.includes(i)), 'visible ids ' + R.ids);
    ok(R.a1 && R.a1.title === '안녕하세요' && R.a1.body.length === 4000 && !R.a1.body.includes('<') && R.a1.nick === '김○○' && R.a1.at && R.a1.ua, 'post shape');
    ok(R.a1 && R.a1.cmts.length === 1 && R.a1.cmts[0].body === '좋아요' && R.a1.cmts[0].nick === '영희' && R.a1.cmts[0].replies[0].id === 'cm_2', 'comments'); ok(R.a1au, 'au');
    ok(R.pend.every(Boolean), 'pending kept'); ok(JSON.stringify(R.after) === JSON.stringify([['po_a1', 1]]), 'after studio ' + JSON.stringify(R.after)); ok(R.dup === 1, 'dup'); ok(R.rate === 429, 'rate');
  }
  ok(JSON.stringify(a) === JSON.stringify(b) || require('node:util').isDeepStrictEqual(a, b), 'Node ↔ Java 같음\n' + JSON.stringify(a) + '\n' + JSON.stringify(b));
  console.log(`contract-comm: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
