'use strict';
/* v35 강의 파일 /api/media/f — 형식 판정(확장자 + 시그니처) · 나눠 올리기 · Range 재생 · Content-Disposition · 한도 · 기관 분리 · 이미지와 분리
   DATABASE_URL=postgresql://… node --test service/test/mediafile.test.js */
const test = require('node:test'); const assert = require('node:assert/strict');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');
const F = require('../server/mediafile'); const M = require('../server/modules');
const X = require('./mediafile-fixtures'); const { png } = require('./media-fixtures');

test('형식 판정 · Range · 이름(순수 함수)', () => {
  assert.deepEqual(F.fileType('강의 1.PDF'), { ext: 'pdf', mime: 'application/pdf', type: 'doc' });
  assert.equal(F.fileType('a.mp4').type, 'video'); assert.equal(F.fileType('a.m4a').mime, 'audio/mp4'); assert.equal(F.fileType('a.exe'), null); assert.equal(F.fileType('noext'), null);
  for (const [ext, b] of [['pdf', X.pdf()], ['docx', X.docx()], ['pptx', X.pptx()], ['hwpx', X.hwpx()], ['hwp', X.hwp()], ['mp4', X.mp4()], ['m4a', X.m4a()], ['webm', X.webm()], ['mp3', X.mp3()]]) assert.ok(F.headOk(ext, b), ext);
  assert.ok(!F.headOk('pdf', png(2, 2))); assert.ok(!F.headOk('mp4', X.webm())); assert.ok(!F.headOk('hwpx', X.docx())); assert.ok(!F.headOk('mp4', X.mp4(0, 'qt  ')));
  assert.equal(F.tailErr('docx', X.docx()), null); assert.equal(F.tailErr('docx', X.docx(0, [['word/vbaProject.bin', 'x']]))[1], 'media_macro');
  assert.equal(F.tailErr('pptx', X.docx())[1], 'media_type'); assert.equal(F.tailErr('docx', X.docx().subarray(0, 60))[1], 'media_bad'); assert.equal(F.tailErr('pdf', X.pdf()), null);
  assert.deepEqual(F.parseRange('bytes=0-', 100), [0, 99]); assert.deepEqual(F.parseRange('bytes=10-19', 100), [10, 19]); assert.deepEqual(F.parseRange('bytes=-10', 100), [90, 99]);
  assert.deepEqual(F.parseRange('bytes=90-500', 100), [90, 99]); assert.equal(F.parseRange('bytes=100-', 100), 'bad'); assert.equal(F.parseRange('items=1-2', 100), 'bad'); assert.equal(F.parseRange('bytes=0-1,5-6', 100), null); assert.equal(F.parseRange(undefined, 100), null);
  assert.equal(F.cleanFileName(' ../a<b>"c".PDF ', 'pdf'), '..abc.pdf'); assert.ok(F.cleanFileName('가'.repeat(200) + '.mp4', 'mp4').length <= 80);
  assert.match(F.disposition('1차시 교안.pdf', 'pdf', false), /^inline; filename="1__ __\.pdf"; filename\*=UTF-8''1%EC%B0%A8%EC%8B%9C%20%EA%B5%90%EC%95%88\.pdf$/);
  assert.match(F.disposition('a.docx', 'docx', false), /^attachment;/); assert.match(F.disposition('a.mp4', 'mp4', true), /^attachment;/);
  assert.ok(M.apiAllowed('learner', 'GET', '/api/media/f/tn_abcdefgh.' + 'a'.repeat(40))); assert.ok(!M.apiAllowed('learner', 'PUT', '/api/media/f/x'));
});

test('/api/media/f', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', MEDIA_CHUNK_KB: '64', MEDIA_FILE_TENANT_MB: '1', MEDIA_VIDEO_MB: '0.9', MEDIA_DOC_MB: '0.5', TRUST_PROXY_HOPS: '0' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {};
  const call = async (who, method, path, body, hdr = {}) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body && !Buffer.isBuffer(body) ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}), ...hdr }, body: body ? (Buffer.isBuffer(body) ? body : JSON.stringify(body)) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    const buf = Buffer.from(await r.arrayBuffer()); let j = {}; try { j = JSON.parse(buf.toString()); } catch (e) { }
    return { status: r.status, j, buf, h: r.headers };
  };
  const up = async (who, name, buf, { skip = -1 } = {}) => {
    const s = await call(who, 'POST', '/api/media/f', { name, size: buf.length }); if (s.status !== 200) return s;
    for (let i = 0; i < s.j.parts; i++) { if (i === skip) continue; const r = await call(who, 'PUT', `/api/media/f/${encodeURIComponent(s.j.id)}?part=${i}`, buf.subarray(i * s.j.chunk, (i + 1) * s.j.chunk)); if (r.status !== 200) return { ...r, start: s.j }; }
    const d = await call(who, 'POST', `/api/media/f/${encodeURIComponent(s.j.id)}/done`); return { ...d, start: s.j };
  };
  const sfx = Date.now().toString(36); let A, B;
  await t.test('가입(두 기관)', async () => {
    A = (await call('A', 'POST', '/api/signup', { email: `fa${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'FA', type: 'voc', code: 'C0DE' })).j.tenant;
    B = (await call('B', 'POST', '/api/signup', { email: `fb${sfx}@b.kr`, password: 'Passw0rd-bbb', orgName: 'FB', type: 'k12', code: 'C0DE' })).j.tenant;
    assert.ok(A.tid && B.tid);
  });
  const vid = X.mp4(200 * 1024); let V, P, D;
  await t.test('권한 · CSRF · 형식 · 크기', async () => {
    assert.equal((await call('x', 'POST', '/api/media/f', { name: 'a.pdf', size: 10 })).status, 401);
    assert.equal((await call('A', 'POST', '/api/media/f', { name: 'a.pdf', size: 10 }, { 'x-didisam': '' })).status, 403);
    const e = await call('A', 'POST', '/api/media/f', { name: 'run.exe', size: 10 }); assert.equal(e.status, 415); assert.equal(e.j.error, 'media_type');
    const big = await call('A', 'POST', '/api/media/f', { name: 'big.mp4', size: 950 * 1024 }); assert.equal(big.status, 413); assert.equal(big.j.error, 'too_large'); assert.match(big.j.message, /영상 파일은/);
    assert.equal((await call('A', 'POST', '/api/media/f', { name: 'a.pdf', size: 0 })).j.error, 'media_bad');
  });
  await t.test('영상: 나눠 올리기(64KB × 4) → 완료', async () => {
    const r = await up('A', '1차시 강의.mp4', vid); assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.start.parts, 4); assert.equal(r.start.chunk, 65536);
    assert.match(r.j.id, new RegExp(`^${A.tid}\\.[a-f0-9]{40}$`)); assert.equal(r.j.url, '/api/media/f/' + r.j.id); assert.equal(r.j.type, 'video'); assert.equal(r.j.mime, 'video/mp4'); assert.equal(r.j.bytes, vid.length); assert.equal(r.j.name, '1차시 강의.mp4'); V = r.j;
    const again = await call('A', 'POST', `/api/media/f/${V.id}/done`); assert.equal(again.j.dup, true);
  });
  await t.test('공개 조회: 전체 · Range 206 · 416 · 304 · 머리말', async () => {
    const r = await call('nobody', 'GET', V.url); assert.equal(r.status, 200); assert.ok(r.buf.equals(vid));
    assert.equal(r.h.get('content-type'), 'video/mp4'); assert.equal(r.h.get('accept-ranges'), 'bytes'); assert.equal(+r.h.get('content-length'), vid.length);
    assert.equal(r.h.get('cache-control'), 'private, max-age=31536000, immutable'); assert.match(r.h.get('content-security-policy'), /sandbox/); assert.equal(r.h.get('x-content-type-options'), 'nosniff');
    assert.match(r.h.get('content-disposition'), /^inline; filename=".*\.mp4"; filename\*=UTF-8''1%EC%B0%A8%EC%8B%9C/);
    const a = await call('nobody', 'GET', V.url, null, { range: 'bytes=100-199' }); assert.equal(a.status, 206); assert.equal(a.h.get('content-range'), `bytes 100-199/${vid.length}`); assert.ok(a.buf.equals(vid.subarray(100, 200)));
    const o = await call('nobody', 'GET', V.url, null, { range: 'bytes=65000-' }); assert.equal(o.status, 206); assert.equal(o.h.get('content-range'), `bytes 65000-65535/${vid.length}`); assert.ok(o.buf.equals(vid.subarray(65000, 65536)));
    const s = await call('nobody', 'GET', V.url, null, { range: 'bytes=-10' }); assert.equal(s.status, 206); assert.ok(s.buf.equals(vid.subarray(vid.length - 10)));
    const x = await call('nobody', 'GET', V.url, null, { range: `bytes=${vid.length}-` }); assert.equal(x.status, 416); assert.equal(x.h.get('content-range'), `bytes */${vid.length}`);
    assert.equal((await call('nobody', 'GET', V.url, null, { 'if-none-match': r.h.get('etag') })).status, 304);
    assert.match((await call('nobody', 'GET', V.url + '?dl=1', null, { range: 'bytes=0-1' })).h.get('content-disposition'), /^attachment;/);
    assert.equal((await call('nobody', 'GET', '/api/media/' + V.id)).status, 404); // 이미지 경로로는 안 나감(학습자 서비스 워커 캐시 대상 아님)
    assert.equal((await call('nobody', 'GET', V.url.replace(/.$/, c => c === '0' ? '1' : '0'))).status, 404);
  });
  await t.test('문서: pdf 바로 보기 · docx 받기 · hwp · hwpx', async () => {
    const p = await up('A', '교안.pdf', X.pdf(1000)); assert.equal(p.status, 200); P = p.j; assert.equal(P.type, 'doc');
    const g = await call('nobody', 'GET', P.url); assert.match(g.h.get('content-disposition'), /^inline;/); assert.equal(g.h.get('x-frame-options'), 'SAMEORIGIN'); assert.equal(g.h.get('content-security-policy'), "frame-ancestors 'self'");
    const d = await up('A', '과제 안내.docx', X.docx(70000)); assert.equal(d.status, 200, JSON.stringify(d.j)); D = d.j;
    const gd = await call('nobody', 'GET', D.url); assert.match(gd.h.get('content-disposition'), /^attachment;/); assert.equal(gd.h.get('x-frame-options'), 'DENY'); assert.ok(gd.buf.equals(X.docx(70000)));
    assert.equal((await up('A', 'a.hwp', X.hwp())).status, 200); assert.equal((await up('A', 'a.hwpx', X.hwpx())).status, 200); assert.equal((await up('A', 'a.pptx', X.pptx())).status, 200);
    assert.equal((await up('A', 'a.mp3', X.mp3())).j.type, 'audio'); assert.equal((await up('A', 'a.webm', X.webm())).j.mime, 'video/webm');
  });
  await t.test('위장 파일 · 매크로 · 덜 올림 · 조각 크기', async () => {
    const f = await up('A', '사진.pdf', png(8, 8)); assert.equal(f.status, 415); assert.equal(f.j.error, 'media_type');
    assert.equal((await call('A', 'POST', `/api/media/f/${f.start.id}/done`)).status, 404); // 위장 파일은 기록까지 지움
    const m = await up('A', 'm.docx', X.docx(0, [['word/vbaProject.bin', 'Attribute VB']])); assert.equal(m.status, 415); assert.equal(m.j.error, 'media_macro');
    const z = await up('A', 'z.pptx', X.docx()); assert.equal(z.j.error, 'media_type');
    const i = await up('A', 'i.mp4', vid, { skip: 2 }); assert.equal(i.status, 409); assert.equal(i.j.error, 'media_incomplete');
    const s = await call('A', 'POST', '/api/media/f', { name: 'c.mp4', size: 70000 });
    assert.equal((await call('A', 'PUT', `/api/media/f/${s.j.id}?part=0`, Buffer.alloc(100))).j.error, 'media_part');
    assert.equal((await call('A', 'PUT', `/api/media/f/${s.j.id}?part=9`, Buffer.alloc(100))).j.error, 'media_part');
    assert.equal((await call('nobody', 'GET', s.j.url)).status, 404); // 올리는 중인 파일은 안 나감
  });
  await t.test('기관 분리 · 목록 · 이미지와 분리 · 한도', async () => {
    assert.equal((await call('B', 'DELETE', V.url)).status, 404);
    const s = await call('A', 'POST', '/api/media/f', { name: 'q.mp4', size: 1000 });
    assert.equal((await call('B', 'PUT', `/api/media/f/${s.j.id}?part=0`, X.mp4().subarray(0, 1000))).status, 404);
    const la = await call('A', 'GET', '/api/media?kind=file'); assert.ok(la.j.rows.some(r => r.id === V.id && r.type === 'video' && r.name === '1차시 강의.mp4')); assert.equal(la.j.max, 1024 * 1024); assert.ok(la.j.used >= vid.length);
    assert.ok(!(await call('B', 'GET', '/api/media?kind=file')).j.rows.length);
    const li = await call('A', 'GET', '/api/media'); assert.ok(!li.j.rows.some(r => r.id === V.id)); assert.equal(li.j.used, 0);
    const img = await call('A', 'POST', '/api/media', png(4, 4)); assert.equal(img.status, 200); assert.equal((await call('A', 'GET', '/api/media/f/' + img.j.id)).status, 404);
    const q = await call('A', 'POST', '/api/media/f', { name: 'more.mp4', size: 850 * 1024 }); assert.equal(q.status, 413); assert.equal(q.j.error, 'media_quota');
  });
  await t.test('삭제', async () => {
    const r = await call('A', 'DELETE', V.url); assert.equal(r.status, 200); assert.equal((await call('nobody', 'GET', V.url)).status, 404);
    assert.equal((await call('A', 'DELETE', V.url)).status, 404);
    /* v38: media_part · audit_log는 FORCE RLS — 기관 문맥(app.tenant)을 세우고 읽는다(문맥 없이 읽으면 0행이라 감사 기록이 없는 것처럼 실패) */
    const tq = async (q, a) => { const c = await pool.connect(); try { await c.query('begin'); await c.query("select set_config('app.tenant', $1, true)", [A.tid]); const r = await c.query(q, a); await c.query('commit'); return r; } finally { c.release(); } };
    const n = await tq("select count(*)::int n from media_part where id = $1", [V.id.split('.')[1]]); assert.equal(n.rows[0].n, 0);
    const au = await tq("select action from audit_log where tenant_id = $1 and action like 'media.%' order by id", [A.tid]); assert.ok(au.rows.some(x => x.action === 'media.file') && au.rows.some(x => x.action === 'media.delete'));
  });
  await new Promise(ok => app.close(ok)); await pool.end();
});
