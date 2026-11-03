'use strict';
/* v24 홈페이지 벤치마크 읽기 — 운영자 세션 · https만 · 내부 주소 차단(SSRF, DNS 확인 포함) · 리다이렉트 재검사 · 2MB · 스크립트 제거 · 구조만 */
const test = require('node:test'); const assert = require('node:assert/strict'); const { Readable } = require('node:stream');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');
const { extract, isPrivate, checkUrl, benchmark } = require('../server/bench');

const PAGE = `<!doctype html><html><head><title>참고 학원 | 홈</title><meta name="description" content="실무 강좌 전문"><meta name="theme-color" content="#2255aa">
<style>.hero{background:#2255AA;color:#fff}.x{color:#ff6600}</style><script>alert('x');window.secret='tok'</script></head><body>
<header><nav><a href="/">홈</a><a href="/about">학원 소개</a><a href="/courses">강좌</a><a href="/review">수강후기</a></nav></header>
<section class="hero"><h1>실무를 바꾸는 강좌</h1><p>현업 강사와 함께합니다.</p><a href="/apply">수강 신청</a></section>
<section><h2>왜 우리 학원인가</h2><ul><li>소수 정예</li><li>실습 중심</li><li>취업 연계</li></ul></section>
<section><h2>숫자로 보는 성과</h2><p>수료생 1,200명 · 만족도 98%</p></section>
<section><h2>상담 신청</h2><form><input name="n"></form></section>
<!-- 주석 비밀 --><noscript>NS</noscript></body></html>`;
const fakeGet = (routes) => async (u) => { const r = routes[u.href]; if (!r) throw new Error('no route'); return { status: r.status || 200, headers: r.headers || { 'content-type': 'text/html; charset=utf-8' }, stream: Readable.from([Buffer.from(r.body || '')]) }; };
const PUB = async () => [{ address: '93.184.216.34', family: 4 }];

test('벤치마크 — 추출 · 차단 규칙(단위)', async t => {
  await t.test('구조만 추출 · 스크립트 · 주석 제거 · 색', () => {
    const x = extract(PAGE, 'https://ex.com/'); const all = JSON.stringify(x);
    assert.equal(x.title, '참고 학원 | 홈'); assert.equal(x.desc, '실무 강좌 전문');
    assert.deepEqual(x.nav, ['홈', '학원 소개', '강좌', '수강후기']);
    assert.ok(x.headings.includes('실무를 바꾸는 강좌') && x.headings.includes('왜 우리 학원인가'));
    assert.equal(x.sections.length, 4); assert.equal(x.sections[1].kind, 'list'); assert.equal(x.sections[2].kind, 'stats'); assert.equal(x.sections[3].kind, 'form');
    assert.ok(x.colors.includes('#2255aa') && x.colors.includes('#ff6600'));
    assert.ok(!/alert|secret|tok|주석 비밀|NS/.test(all), '스크립트 · 주석 · noscript 제거');
  });
  await t.test('내부 IP 판별', () => {
    ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.0.10', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '64:ff9b::a00:1', 'not-ip'].forEach(ip => assert.ok(isPrivate(ip), ip));
    ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700::1111'].forEach(ip => assert.ok(!isPrivate(ip), ip));
  });
  await t.test('주소 규칙: https만 · 계정 · 포트 · localhost', () => {
    assert.throws(() => checkUrl('http://ex.com'), e => e.code === 'https_only');
    assert.throws(() => checkUrl('https://u:p@ex.com'), e => e.code === 'bad_url');
    assert.throws(() => checkUrl('https://ex.com:8443/'), e => e.code === 'bad_port');
    assert.throws(() => checkUrl('https://localhost/'), e => e.code === 'private');
    assert.throws(() => checkUrl('https://intranet/'), e => e.code === 'private');
    assert.throws(() => checkUrl('https://127.0.0.1/'), e => e.code === 'private');
    assert.throws(() => checkUrl('https://[::1]/'), e => e.code === 'private');
    assert.throws(() => checkUrl('ftp://ex.com'), e => e.code === 'https_only');
    assert.equal(checkUrl('https://ex.com/a?b=1').hostname, 'ex.com');
  });
  await t.test('DNS가 내부 IP면 차단 · 리다이렉트도 다시 검사', async () => {
    await assert.rejects(benchmark('https://evil.example/', { lookup: async () => [{ address: '10.0.0.5', family: 4 }], get: fakeGet({}) }), e => e.code === 'private');
    await assert.rejects(benchmark('https://ex.com/', { lookup: async () => [{ address: '93.184.216.34', family: 4 }, { address: '127.0.0.1', family: 4 }], get: fakeGet({}) }), e => e.code === 'private');
    await assert.rejects(benchmark('https://ex.com/', { lookup: PUB, get: fakeGet({ 'https://ex.com/': { status: 302, headers: { location: 'https://169.254.169.254/latest/meta-data' } } }) }), e => e.code === 'private');
    await assert.rejects(benchmark('https://ex.com/', { lookup: PUB, get: fakeGet({ 'https://ex.com/': { status: 301, headers: { location: 'http://ex.com/' } } }) }), e => e.code === 'https_only');
    const ok = await benchmark('https://ex.com/', { lookup: PUB, get: fakeGet({ 'https://ex.com/': { status: 302, headers: { location: '/home' } }, 'https://ex.com/home': { body: PAGE } }) });
    assert.equal(ok.url, 'https://ex.com/home'); assert.equal(ok.title, '참고 학원 | 홈');
  });
  await t.test('HTML만 · 2MB까지만 읽음 · 10초 제한', async () => {
    await assert.rejects(benchmark('https://ex.com/', { lookup: PUB, get: fakeGet({ 'https://ex.com/': { headers: { 'content-type': 'application/pdf' }, body: '%PDF' } }) }), e => e.code === 'type');
    const big = '<html><head><title>큰 페이지</title></head><body>' + '<p>가</p>'.repeat(400000) + '<h2>끝 제목</h2></body></html>';
    const r = await benchmark('https://ex.com/', { lookup: PUB, get: fakeGet({ 'https://ex.com/': { body: big } }) }); assert.equal(r.truncated, true); assert.equal(r.title, '큰 페이지'); assert.ok(!r.headings.includes('끝 제목'));
    const slow = async (u, a, signal) => new Promise((ok, no) => { signal.addEventListener('abort', () => no(new Error('aborted'))); });
    await assert.rejects(benchmark('https://ex.com/', { lookup: PUB, get: slow, timeout: 150 }), e => e.code === 'timeout');
  });
});

test('벤치마크 API — 운영자 세션 전용', async t => {
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE' }, log: {}, benchOpts: { lookup: async h => h === 'inner.example' ? [{ address: '192.168.1.10', family: 4 }] : [{ address: '93.184.216.34', family: 4 }], get: fakeGet({ 'https://academy.example/': { body: PAGE } }) } });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  const jar = {}; const call = async (who, method, path, body, hdr = {}) => {
    const r = await fetch(U + path, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}), ...hdr }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const sfx = Date.now().toString(36);
  const A = (await call('A', 'POST', '/api/signup', { email: `bm${sfx}@a.kr`, password: 'Passw0rd-aaa', orgName: 'B', type: 'adult', code: 'C0DE' })).j.tenant;
  await t.test('로그인 없이 401 · CSRF 헤더 없으면 403', async () => {
    assert.equal((await call('X', 'POST', '/api/site/benchmark', { url: 'https://academy.example/' })).status, 401);
    const r = await fetch(U + '/api/site/benchmark', { method: 'POST', headers: { 'content-type': 'application/json', cookie: jar.A }, body: JSON.stringify({ url: 'https://academy.example/' }) }); assert.equal(r.status, 403);
  });
  await t.test('구조 응답(스크립트 없음)', async () => {
    const r = await call('A', 'POST', '/api/site/benchmark', { url: 'https://academy.example/' }); assert.equal(r.status, 200);
    assert.equal(r.j.title, '참고 학원 | 홈'); assert.deepEqual(r.j.nav.slice(0, 2), ['홈', '학원 소개']); assert.ok(!JSON.stringify(r.j).includes('alert'));
  });
  await t.test('http · 내부 주소 · DNS 내부 IP · 빈 주소 거부', async () => {
    assert.equal((await call('A', 'POST', '/api/site/benchmark', { url: 'http://academy.example/' })).status, 400);
    assert.equal((await call('A', 'POST', '/api/site/benchmark', { url: 'https://127.0.0.1/' })).status, 400);
    assert.equal((await call('A', 'POST', '/api/site/benchmark', { url: 'https://169.254.169.254/latest/meta-data' })).status, 400);
    const r = await call('A', 'POST', '/api/site/benchmark', { url: 'https://inner.example/' }); assert.equal(r.status, 400); assert.equal(r.j.error, 'private');
    assert.equal((await call('A', 'POST', '/api/site/benchmark', {})).status, 400);
  });
  await pool.query('delete from tenants where id = $1', [A.tid]);
  app.close(); await pool.end();
});
