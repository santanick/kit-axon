'use strict';
/* v37 L2 링크 공유 미리보기 — learner.html에 게시본 og 메타를 서버가 넣는다(Java DdOgMeta와 같은 결과) */
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const OG = require('../server/ogmeta');
const HEAD = '<!doctype html><html><head>\n<title>홈페이지 · 학습 사이트</title>\n<meta name="robots" content="noindex,nofollow">\n</head><body></body></html>';

test('og 값 뽑기 · 넣기(순수 함수)', () => {
  assert.equal(OG.ogFields(null), null); assert.equal(OG.ogFields({ hp: { seo: {} } }), null);
  const f = OG.ogFields({ hp: { name: '해운대 "아카데미"', seo: { title: '', desc: '줄\n바꿈 <b>설명</b>', img: 'https://cdn.example.kr/og.png', index: true } } });
  assert.deepEqual(f, { name: '해운대 "아카데미"', title: '해운대 "아카데미"', desc: '줄 바꿈 <b>설명</b>', img: 'https://cdn.example.kr/og.png', index: true });
  const h = OG.injectOg(HEAD, f);
  assert.ok(h.includes('<title>해운대 &quot;아카데미&quot;</title>'));
  assert.ok(h.includes('<meta property="og:title" content="해운대 &quot;아카데미&quot;">'));
  assert.ok(h.includes('<meta property="og:description" content="줄 바꿈 &lt;b&gt;설명&lt;/b&gt;">'));
  assert.ok(h.includes('<meta property="og:image" content="https://cdn.example.kr/og.png">') && h.includes('content="summary_large_image"'));
  assert.ok(h.includes('<meta name="robots" content="index,follow">') && !h.includes('noindex'));
  assert.ok(h.indexOf('og:title') < h.indexOf('</head>'));
  /* data: 이미지 · http 이미지는 넣지 않음, 검색 노출 끔은 noindex 유지, 설명 없으면 설명 태그 없음 */
  const g = OG.ogFields({ org: { name: '기관' }, hp: { seo: { img: 'data:image/png;base64,AAAA', index: false } } }); assert.equal(g.img, ''); assert.equal(g.title, '기관');
  const h2 = OG.injectOg(HEAD, g); assert.ok(!h2.includes('og:image') && !h2.includes('og:description') && h2.includes('noindex,nofollow') && h2.includes('content="summary"'));
  assert.equal(OG.ogFields({ hp: { name: 'x', seo: { img: 'http://a.kr/x.png' } } }).img, '');
  assert.equal(OG.ogFields({ hp: { name: 'x'.repeat(200), seo: { title: 't'.repeat(300), desc: 'd'.repeat(400) } } }).title.length, 120);
  assert.equal(OG.tidOf('/learner.html?t=tn_abcdefgh12', ''), 'tn_abcdefgh12'); assert.equal(OG.tidOf('/learner.html?t=../x', 'tn_zzzzzzzz'), 'tn_zzzzzzzz'); assert.equal(OG.tidOf('/learner.html', ''), '');
});

test('learner.html 응답에 게시본 og', { skip: !process.env.DATABASE_URL && 'DATABASE_URL 없음' }, async () => {
  const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-')); fs.writeFileSync(path.join(dir, 'learner.html'), HEAD); fs.writeFileSync(path.join(dir, 'index.html'), HEAD);
  const pool = poolFrom(process.env); await migrate(pool); const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE' }, log: {}, publicDir: dir });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  try {
    const sfx = Date.now().toString(36); const su = await fetch(U + '/api/signup', { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: `og${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'OG', type: 'public', code: 'C0DE' }) });
    const ck = su.headers.get('set-cookie').split(';')[0]; const tid = (await su.json()).tenant.tid;
    const put = doc => fetch(U + '/api/state', { method: 'PUT', headers: { 'x-didisam': '1', 'content-type': 'application/json', cookie: ck }, body: JSON.stringify(doc) });
    let r = await fetch(`${U}/learner.html?t=${tid}`); let h = await r.text(); assert.equal(r.status, 200); assert.equal(h, HEAD, '게시 전에는 원본 그대로');
    assert.equal(+r.headers.get('content-length'), Buffer.byteLength(HEAD));
    assert.equal((await put({ doc: { org: { name: 'OG', type: 'public' }, lsite: { pub: { org: { name: 'OG' }, hp: { name: '해운대구 평생학습관', seo: { title: '평생학습 포털', desc: '누구나 신청하는 강좌', img: 'https://cdn.example.kr/og.png', index: true } } } } }, rev: 0 })).status, 200);
    r = await fetch(`${U}/learner.html?t=${tid}`); h = await r.text();
    assert.ok(h.includes('<meta property="og:title" content="평생학습 포털">') && h.includes('<meta property="og:description" content="누구나 신청하는 강좌">') && h.includes('<meta property="og:image" content="https://cdn.example.kr/og.png">') && h.includes('<title>평생학습 포털</title>'));
    assert.equal(+r.headers.get('content-length'), Buffer.byteLength(h)); assert.ok(r.headers.get('content-security-policy'));
    const hd = await fetch(`${U}/learner.html?t=${tid}`, { method: 'HEAD' }); assert.equal(hd.status, 200); assert.equal(+hd.headers.get('content-length'), Buffer.byteLength(h));
    assert.equal(await (await fetch(`${U}/learner.html?t=tn_nonexist000`)).text(), HEAD, '없는 기관은 원본');
    assert.equal(await (await fetch(`${U}/index.html?t=${tid}`)).text(), HEAD, '운영자 화면에는 넣지 않음');
  } finally { app.close(); await pool.end(); }
});
