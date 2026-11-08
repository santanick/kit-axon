'use strict';
/* v34.5 홈페이지 이미지 /api/media — 업로드 · 조회(공개 · 캐시) · 권한 · 기관 분리 · 한도 · 잘못된 형식 · 메타데이터 제거 · SVG 정화
   DATABASE_URL=postgresql://… node --test service/test/media.test.js */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app'); const { prepare } = require('../server/media');

const { png, jpeg, webp, chunk } = require('./media-fixtures');

test('형식 판정 · 메타데이터 제거 · SVG 정화(prepare)', () => {
  const p = prepare(png(4, 3, [1, 2, 3], [chunk('tEXt', Buffer.from('Author\0kim')), chunk('eXIf', Buffer.from('MM\0*GPS'))]));
  assert.equal(p.mime, 'image/png'); assert.deepEqual([p.w, p.h], [4, 3]); assert.ok(!p.buf.includes('tEXt') && !p.buf.includes('eXIf') && !p.buf.includes('kim'));
  const j = prepare(jpeg()); assert.equal(j.mime, 'image/jpeg'); assert.deepEqual([j.w, j.h], [40, 30]); assert.ok(!j.buf.includes('GPS') && !j.buf.includes('owner') && j.buf.includes('JFIF'));
  const w = prepare(webp()); assert.equal(w.mime, 'image/webp'); assert.deepEqual([w.w, w.h], [64, 32]); assert.ok(!w.buf.includes('EXIF') && !w.buf.includes('XMP')); assert.equal(w.buf[20] & 0x0c, 0); assert.equal(w.buf.readUInt32LE(4), w.buf.length - 8);
  const s = prepare(Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" viewBox="0 0 10 10"><script>alert(2)</script><a href="javascript:alert(3)"><rect width="10" height="10" style="fill:red" onclick="x()"/></a><image href="https://evil.example/x.png"/><use href="#r"/><foreignObject><div>x</div></foreignObject><style>@import url(https://e.x/a.css)</style></svg>'));
  const t = s.buf.toString(); assert.equal(s.mime, 'image/svg+xml');
  for (const bad of ['script', 'onload', 'onclick', 'javascript', 'evil.example', 'foreignObject', '@import']) assert.ok(!t.includes(bad), bad);
  assert.ok(t.includes('<rect') && t.includes('href="#r"') && t.includes('style="fill:red"'));
  assert.throws(() => prepare(Buffer.from('<!DOCTYPE svg [<!ENTITY x "y">]><svg/>')), e => e.code === 'media_svg');
  assert.throws(() => prepare(Buffer.from('GIF89a......')), e => e.status === 415);
  assert.throws(() => prepare(Buffer.from('<html><script>alert(1)</script></html>')), e => e.status === 415);
  assert.throws(() => prepare(png(2, 2).subarray(0, 40)), e => e.code === 'media_bad');
  assert.throws(() => prepare(Buffer.alloc(0)), e => e.code === 'media_empty');
});

test('/api/media', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', MEDIA_TENANT_MB: '1', TRUST_PROXY_HOPS: '0' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {};
  const call = async (who, method, path, body, hdr = {}) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body && !Buffer.isBuffer(body) ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}), ...hdr }, body: body ? (Buffer.isBuffer(body) ? body : JSON.stringify(body)) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    const buf = Buffer.from(await r.arrayBuffer()); let j = {}; try { j = JSON.parse(buf.toString()); } catch (e) { }
    return { status: r.status, j, buf, h: r.headers };
  };
  const sfx = Date.now().toString(36); let A, B;
  await t.test('가입(두 기관)', async () => {
    A = (await call('A', 'POST', '/api/signup', { email: `ma${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'MA', type: 'univ', code: 'C0DE' })).j.tenant;
    B = (await call('B', 'POST', '/api/signup', { email: `mb${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: 'MB', type: 'k12', code: 'C0DE' })).j.tenant;
    assert.ok(A.tid && B.tid);
  });
  let id;
  await t.test('업로드 · 같은 내용은 같은 id(dup)', async () => {
    assert.equal((await call('x', 'POST', '/api/media', png(8, 8))).status, 401);
    assert.equal((await call('A', 'POST', '/api/media', png(8, 8), { 'x-didisam': '' })).status, 403);
    const r = await call('A', 'POST', '/api/media?name=' + encodeURIComponent('첫 화면<b>.png'), png(8, 8, [1, 2, 3], [chunk('tEXt', Buffer.from('GPS\0x'))]));
    assert.equal(r.status, 200); assert.equal(r.j.mime, 'image/png'); assert.equal(r.j.w, 8); assert.equal(r.j.dup, false);
    assert.match(r.j.id, new RegExp(`^${A.tid}\\.[a-f0-9]{40}$`)); assert.equal(r.j.url, '/api/media/' + r.j.id); id = r.j.id;
    const d = await call('A', 'POST', '/api/media', png(8, 8, [1, 2, 3], [chunk('tEXt', Buffer.from('other'))]));
    assert.equal(d.j.id, id); assert.equal(d.j.dup, true); // 메타데이터만 다른 사진 = 같은 사진
  });
  await t.test('공개 조회 · 캐시 머리말 · ETag · 메타데이터 없음', async () => {
    const r = await call('nobody', 'GET', '/api/media/' + id);
    assert.equal(r.status, 200); assert.equal(r.h.get('content-type'), 'image/png');
    assert.equal(r.h.get('cache-control'), 'public, max-age=31536000, immutable'); assert.match(r.h.get('content-security-policy'), /sandbox/); assert.equal(r.h.get('x-content-type-options'), 'nosniff');
    assert.ok(!r.buf.includes('tEXt')); assert.equal(r.buf.subarray(0, 4).toString('latin1'), '\x89PNG');
    assert.equal((await call('nobody', 'GET', '/api/media/' + id, null, { 'if-none-match': r.h.get('etag') })).status, 304);
    assert.equal((await call('nobody', 'GET', '/api/media/' + id.replace(/.$/, c => c === '0' ? '1' : '0'))).status, 404);
    assert.equal((await call('nobody', 'GET', '/api/media/a%2F..%2Fstate')).status, 404);
    assert.equal((await call('nobody', 'GET', '/api/media/nope')).j.error, 'media_missing');
  });
  await t.test('형식 · 크기 · SVG', async () => {
    assert.equal((await call('A', 'POST', '/api/media', Buffer.from('GIF89a-not-allowed'))).j.error, 'media_type');
    assert.equal((await call('A', 'POST', '/api/media', Buffer.alloc(2 * 1024 * 1024 + 1, 1))).status, 413);
    const s = await call('A', 'POST', '/api/media', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>x</script><circle r="4"/></svg>'));
    assert.equal(s.j.mime, 'image/svg+xml'); const g = await call('n', 'GET', s.j.url); assert.ok(!g.buf.toString().includes('script') && !g.buf.toString().includes('onload'));
    const j = await call('A', 'POST', '/api/media', jpeg()); assert.equal(j.j.mime, 'image/jpeg'); assert.ok(!(await call('n', 'GET', j.j.url)).buf.includes('GPS'));
    const w = await call('A', 'POST', '/api/media', webp()); assert.equal(w.j.mime, 'image/webp'); assert.deepEqual([w.j.w, w.j.h], [64, 32]);
  });
  await t.test('목록 · 기관 분리 · 교차 삭제 불가', async () => {
    const L = await call('A', 'GET', '/api/media?limit=2'); assert.equal(L.j.rows.length, 2); assert.equal(L.j.n, 4); assert.ok(L.j.used > 0); assert.equal(L.j.max, 1024 * 1024);
    assert.ok(L.j.rows.every(r => r.id.startsWith(A.tid + '.') && /Z$/.test(r.at)));
    assert.equal((await call('B', 'GET', '/api/media')).j.n, 0);
    assert.equal((await call('B', 'DELETE', '/api/media/' + id)).status, 404);
    assert.equal((await call('x', 'DELETE', '/api/media/' + id)).status, 401);
  });
  await t.test('기관 한도(1MB) · 삭제 · 감사 기록', async () => {
    const big = png(600, 600, [9, 9, 9]); const noisy = Buffer.concat([big.subarray(0, 33), chunk('zzZz', require('node:crypto').randomBytes(700 * 1024)), big.subarray(33)]); // 지우지 않는 보조 청크로 크기만 키움
    assert.equal((await call('B', 'POST', '/api/media', noisy)).status, 200);
    const noisy2 = Buffer.concat([big.subarray(0, 33), chunk('zzZz', require('node:crypto').randomBytes(700 * 1024)), big.subarray(33)]);
    assert.equal((await call('B', 'POST', '/api/media', noisy2)).j.error, 'media_quota');
    assert.equal((await call('A', 'DELETE', '/api/media/' + id)).j.ok, true);
    assert.equal((await call('n', 'GET', '/api/media/' + id)).status, 404);
    assert.equal((await call('A', 'DELETE', '/api/media/' + id)).status, 404);
    const au = (await call('A', 'GET', '/api/audit')).j.rows.map(r => r.action); assert.ok(au.includes('media.upload') && au.includes('media.delete'));
  });
  await t.test('RLS: 기관 설정 없이 0행', async () => {
    const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_tenant'); assert.equal((await c.query('select count(*)::int n from media')).rows[0].n, 0); await c.query('rollback'); } finally { c.release(); }
  });
  await t.test('기관 파기 시 이미지도 삭제', async () => {
    await pool.query('delete from tenants where id = any($1)', [[A.tid, B.tid]]);
    assert.equal((await pool.query('select count(*)::int n from media where tenant_id = any($1)', [[A.tid, B.tid]])).rows[0].n, 0);
  });
  app.close(); await pool.end();
});

test('모듈 분리: 이미지 조회는 학습자 · 교강사 모듈에서도 공개', () => {
  const M = require('../server/modules');
  for (const m of ['learner', 'tutor', 'admin']) { assert.equal(M.apiAllowed(m, 'GET', '/api/media/tn_abcdefgh.' + 'a'.repeat(40)), true); }
  assert.equal(M.apiAllowed('learner', 'POST', '/api/media'), false); assert.equal(M.apiAllowed('learner', 'DELETE', '/api/media/x'), false);
});
