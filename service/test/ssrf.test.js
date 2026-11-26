'use strict';
/* 가디언 4차 #19 SSRF(KISA 2026 SF) — 서버 외부 요청 지점 전수 목록 고정 + 내부 주소 차단 확인
   · 새 fetch · https.request 지점이 생기면 이 시험이 실패한다 → docs/security/kisa-web-check.md 「SF」 목록과 함께 검토 후 INVENTORY에 추가
   · DB · 서버 없이 실행(node --test service/test/ssrf.test.js) */
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const { isPrivate, checkUrl } = require('../server/bench');
const { isMetaOrLinkLocal, checkSelfUrl } = require('../server/ssrf');

const SRV = path.join(__dirname, '../server');
/* 파일 → [호출 수, 대상 주소의 출처] — 기관 · 사용자가 주소를 정할 수 있는 곳은 user */
const INVENTORY = {
  'bench.js': [1, 'user'],          // 홈페이지 벤치마크 — https · 443 · 사설/루프백/링크로컬/메타데이터 차단 · IP 고정 · 리다이렉트마다 재검사
  'lms/mod-o.js': [2, 'user'],      // Anthropic(환경변수) + 학내 LLM(기관 입력 주소, 서버 허용 목록 + ssrf.checkSelfUrl)
  'aigw.js': [1, 'env'],            // ANTHROPIC_URL
  'oauth.js': [2, 'env'],           // 구글 · 카카오 고정 주소(시험은 OAUTH_MOCK)
  'loauth.js': [2, 'env'],          // QA7 학습자 구글 · 카카오 · 네이버 고정 주소(시험은 OAUTH_MOCK)
  'mail.js': [1, 'env'],            // MAIL_WEBHOOK_URL
  'fac/pay.js': [1, 'env'],         // 토스 고정 주소(TOSS_URL)
  'teams/index.js': [3, 'user'],    // v49 MS Teams: Microsoft 토큰 · Graph 고정 주소(시험은 OAUTH_MOCK) + 기관 워크플로 주소(checkHook: https · 443 · Azure 워크플로 호스트 허용 목록 · 사설/루프백 차단 · IP 표기 거부) — 3곳 모두 redirect: 'manual'
};
const TOOLS = /^lms\/tools\//; // 운영자 PC에서 돌리는 CLI(서버 경로 아님)

function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) { if (f === 'node_modules') continue; const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p, out); else if (f.endsWith('.js')) out.push(p); }
  return out;
}

test('외부 요청 지점 전수 — 목록에 없는 새 지점 금지', () => {
  const found = {};
  for (const p of walk(SRV)) {
    const rel = path.relative(SRV, p).split(path.sep).join('/'); if (TOOLS.test(rel)) continue;
    const s = fs.readFileSync(p, 'utf8');
    const n = (s.match(/\bawait fetch(?:Fn)?\(|\bhttps?\.(?:request|get)\(/g) || []).length;
    if (n) found[rel] = n;
  }
  assert.deepEqual(found, Object.fromEntries(Object.entries(INVENTORY).map(([k, v]) => [k, v[0]])));
});

test('서버 외부 요청은 리다이렉트를 따라가지 않음(Java HttpClient 기본 NEVER와 같게)', () => {
  for (const f of ['lms/mod-o.js', 'aigw.js', 'oauth.js', 'loauth.js', 'mail.js', 'teams/index.js']) {
    const s = fs.readFileSync(path.join(SRV, f), 'utf8');
    const calls = s.match(/await fetch\([^)]*?\{[^}]*/g) || [];
    assert.ok(calls.length > 0, f);
    for (const c of calls) assert.match(c, /redirect: '(manual|error)'/, `${f}: ${c.slice(0, 80)}`);
  }
});

test('벤치마크 주소 검사 — 사설 · 루프백 · 링크로컬 · 메타데이터 · 우회 표기 차단', () => {
  const bad = ['https://127.0.0.1/', 'https://localhost/', 'https://10.0.0.5/', 'https://172.16.1.1/', 'https://192.168.0.1/',
    'https://169.254.169.254/latest/meta-data/', 'https://[::1]/', 'https://[::ffff:169.254.169.254]/', 'https://[fe80::1]/', 'https://[fd00:ec2::254]/',
    'https://2130706433/', 'https://0x7f.0.0.1/', 'https://0/', 'https://metadata.google.internal/', 'https://100.64.0.1/',
    'http://example.com/', 'https://example.com:8443/', 'https://u:p@example.com/', 'file:///etc/passwd', 'gopher://x/'];
  for (const u of bad) assert.throws(() => checkUrl(u), e => e.status === 400, u);
  assert.equal(checkUrl('https://example.com/a?b=1').hostname, 'example.com');
  for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '::1', '::ffff:10.0.0.1', 'fe80::1', 'fc00::1', '64:ff9b::a9fe:a9fe', '2002:a9fe:a9fe::', '0.0.0.0', '224.0.0.1']) assert.equal(isPrivate(ip), true, ip);
  for (const ip of ['8.8.8.8', '2001:4860:4860::8888']) assert.equal(isPrivate(ip), false, ip);
});

test('학내 LLM 주소 — 메타데이터 · 링크로컬 · 계정 정보는 허용 목록과 상관없이 차단, 사설 대역은 허용', async () => {
  for (const ip of ['169.254.169.254', '169.254.170.2', '100.100.100.200', 'fd00:ec2::254', 'fe80::1', '::ffff:169.254.169.254', '0.0.0.0', '::']) assert.equal(isMetaOrLinkLocal(ip), true, ip);
  for (const ip of ['10.0.0.5', '192.168.1.10', '127.0.0.1', '8.8.8.8']) assert.equal(isMetaOrLinkLocal(ip), false, ip);
  const dnsTo = addr => async () => [{ address: addr, family: addr.includes(':') ? 6 : 4 }];
  const blocked = e => e.status === 503 && e.code === 'provider_blocked';
  await assert.rejects(checkSelfUrl('http://llm.campus.ac.kr/v1/chat/completions', dnsTo('169.254.169.254')), blocked); // DNS 재지정
  await assert.rejects(checkSelfUrl('http://169.254.169.254/latest/', dnsTo('8.8.8.8')), blocked);
  await assert.rejects(checkSelfUrl('http://[fd00:ec2::254]/', dnsTo('8.8.8.8')), blocked);
  await assert.rejects(checkSelfUrl('http://llm.campus.ac.kr@169.254.169.254/', dnsTo('8.8.8.8')), blocked);
  await assert.rejects(checkSelfUrl('ftp://llm.campus.ac.kr/', dnsTo('10.0.0.5')), blocked);
  await assert.rejects(checkSelfUrl('http://nx.campus.ac.kr/', async () => { throw new Error('ENOTFOUND'); }), blocked);
  await assert.rejects(checkSelfUrl('not a url'), blocked);
  assert.equal((await checkSelfUrl('http://llm.campus.ac.kr:8000/v1/chat/completions', dnsTo('10.0.0.5'))).port, '8000');
});

test('학내 LLM 호출 경로가 검사를 거침(허용 목록 → checkSelfUrl → fetch redirect manual)', () => {
  const s = fs.readFileSync(path.join(SRV, 'lms/mod-o.js'), 'utf8');
  assert.match(s, /P\.ready\(p\);\s*if \(p\.kind === 'openai_compat'\) \{ try \{ await checkSelfUrl\(p\.endpoint_url\)/);
  const j = fs.readFileSync(path.join(__dirname, '../../service-egov/src/main/java/egovframework/didisam/lms/o/service/impl/LmsOServiceImpl.java'), 'utf8');
  assert.match(j, /DdSsrf\.selfUrlOk\(endpoint\)\) throw E\(503, egovframework\.didisam\.cmm\.DdSsrf\.MSG, "provider_blocked"\)/);
});

test('정적 경로 열린 리다이렉트(CWE-601) — //호스트 · 역슬래시 경로는 리다이렉트하지 않음', async () => {
  const os = require('node:os'); const http = require('node:http');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssrf-')); fs.mkdirSync(path.join(dir, 'docs')); fs.writeFileSync(path.join(dir, 'docs/index.html'), 'ok');
  const fake = { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => ({ rows: [] }), release() { } }) };
  const { createApp } = require('../server/app');
  const app = createApp({ pool: fake, env: { COOKIE_SECURE: '0' }, publicDir: dir, log: {} });
  await new Promise(ok => app.listen(0, '127.0.0.1', ok)); const port = app.address().port;
  const get = p => new Promise((ok, no) => http.get({ host: '127.0.0.1', port, path: p }, r => { r.resume(); ok({ st: r.statusCode, loc: r.headers.location }); }).on('error', no));
  try {
    const d = await get('/docs'); assert.equal(d.st, 302); assert.equal(d.loc, '/docs/');
    for (const p of ['/%2Fevil', '/%2F%2Fevil%E3%80%82com', '/%5Cevil', '/%2F%5Cevil']) { const r = await get(p); assert.notEqual(r.st, 302, p); assert.equal(r.loc, undefined, p); }
  } finally { await new Promise(ok => { if (app.closeAllConnections) app.closeAllConnections(); app.close(ok); }); fs.rmSync(dir, { recursive: true, force: true }); }
});
