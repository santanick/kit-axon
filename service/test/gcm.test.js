'use strict';
/* v47.5 AES-256-GCM 인증 태그 길이 고정(Semgrep gcm-no-tag-length · 가디언 5차 h2)
   ① 짧은 태그(4 · 8 · 12 · 15바이트) 거부 ② 기존 저장 암호문(태그 16바이트 — 변경 전 코드로 만든 고정값) 복호화 유지
   ③ service/server의 GCM 복호화가 모두 gcm.js를 거치는지 ④ Node↔Java 교차 복호화(빌드가 있을 때) */
const test = require('node:test'); const assert = require('node:assert/strict');
const crypto = require('node:crypto'); const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { execFileSync } = require('node:child_process');
const SRV = path.join(__dirname, '../server');
const { gcmDecipher } = require('../server/gcm'); const { piiKeys } = require('../server/pii');
const { createStateCrypto } = require('../server/statecrypt'); const aria = require('../server/lms/aria');

const KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const K = piiKeys({ PII_KEY: KEY }); const MK = crypto.createHash('sha256').update('dd-totp|' + KEY).digest();
/* 변경 전 코드(createCipheriv 기본 태그 16바이트)로 만든 저장값 — 기존 데이터 대용 */
const OLD = {
  state_name: 'enc1:v1.KPmTr0S5sWOHE0Bk.Vvv_YkS8mpo9TIdnBKlQUw.xSJdE7N7lj5H',          // statecrypt members.name = 홍길동, tid t1, id m1
  pii: 'v1.KUDy_QN2Ag3yf3bA.MCbQ_MjFSups1vnQIUKExQ.bKpxNIWaFRYKy5JTFNAuHfWI2g',          // pii.js email, AAD t1|L1|email
  aria: 'v1:Gk5-jbEtTOa2drRhExmN_1tlsp-dSsCyog7WAnv2YMgoWX2rLb5qmxw',                    // aria interim, AAD t1|att
  mfa: 'v1:6UNP5uHgu0PgckRqXOzxP_yCzKsvp0lPceD2WNssVbpm82-pcgEQRMqDP4M',                 // mfa TOTP 비밀(iv | 암호문 | tag)
};
const b64 = s => Buffer.from(s, 'base64url');
/* 각 모듈과 같은 해석(gcm.js 경유) */
const decSplit = (key, s, aad) => { const [v, iv, tag, ct] = s.split('.'); assert.equal(v, 'v1'); const d = gcmDecipher(key, b64(iv), b64(tag)); d.setAAD(Buffer.from(aad)); return Buffer.concat([d.update(b64(ct)), d.final()]).toString('utf8'); };
const decMfa = s => { const b = b64(s.slice(3)); if (b.length < 28) throw new Error('gcm_tag'); const d = gcmDecipher(MK, b.subarray(0, 12), b.subarray(b.length - 16)); return Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()]).toString('utf8'); };
const shortSplit = (s, n) => { const p = s.split('.'); p[p.length - 2] = b64(p[p.length - 2]).subarray(0, n).toString('base64url'); return p.join('.'); };

test('GCM 태그 16바이트 고정', async t => {
  await t.test('기존 저장 암호문을 그대로 복호화', () => {
    const sc = createStateCrypto(K, class extends Error {});
    assert.equal(sc.open({ members: [{ id: 'm1', name: OLD.state_name }] }, 't1').members[0].name, '홍길동');
    assert.equal(decSplit(K.enc, OLD.pii, 't1|L1|email'), 'learner@example.com');
    assert.equal(aria.interim(KEY).decrypt(OLD.aria, 't1|att'), '출석 기록');
    assert.equal(decMfa(OLD.mfa), 'JBSWY3DPEHPK3PXP');
  });

  await t.test('짧은 태그 거부(4 · 8 · 12 · 15바이트)', () => {
    const sc = createStateCrypto(K, class extends Error {});
    for (const n of [4, 8, 12, 15]) {
      assert.throws(() => gcmDecipher(K.enc, crypto.randomBytes(12), crypto.randomBytes(n)), /gcm_tag/);
      assert.throws(() => decSplit(K.enc, shortSplit(OLD.pii, n), 't1|L1|email'), /gcm_tag/);
      assert.throws(() => sc.open({ members: [{ id: 'm1', name: 'enc1:' + shortSplit(OLD.state_name.slice(5), n) }] }, 't1'));
    }
    assert.throws(() => gcmDecipher(K.enc, crypto.randomBytes(8), crypto.randomBytes(16)), /gcm_iv/);
    /* 연결형(iv | tag | 본문, iv | 본문 | tag): 28바이트 미만은 거부 */
    assert.throws(() => aria.interim(KEY).decrypt('v1:' + b64(OLD.aria.slice(3)).subarray(0, 20).toString('base64url'), 't1|att'), /gcm_tag/);
    assert.throws(() => decMfa('v1:' + crypto.randomBytes(20).toString('base64url')), /gcm_tag/);
    /* 태그 위조(1비트) — 길이는 맞아도 실패 */
    const p = OLD.pii.split('.'); const tg = b64(p[2]); tg[0] ^= 1; p[2] = tg.toString('base64url');
    assert.throws(() => decSplit(K.enc, p.join('.'), 't1|L1|email'));
  });

  await t.test('service/server의 GCM 복호화는 모두 gcm.js(authTagLength 16) 경유', () => {
    const files = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules') continue; const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (f.endsWith('.js')) files.push(f); } }; walk(SRV);
    const raw = files.filter(f => /createDecipheriv\(/.test(fs.readFileSync(f, 'utf8')) && path.basename(f) !== 'gcm.js');
    assert.deepEqual(raw.map(f => path.relative(SRV, f)), [], 'gcm.js 밖에서 createDecipheriv를 직접 쓰지 않는다');
    assert.match(fs.readFileSync(path.join(SRV, 'gcm.js'), 'utf8'), /authTagLength: TAG/);
    for (const f of ['pii.js', 'mfa.js', 'statecrypt.js', 'aigw.js', 'ledger/index.js', 'lms/aria.js', 'teams/index.js']) assert.match(fs.readFileSync(path.join(SRV, f), 'utf8'), /gcmDecipher\(/, f);
  });

  await t.test('Node↔Java 교차 복호화(GCMParameterSpec 128)', t2 => {
    const egov = path.join(__dirname, '../../service-egov'); const cls = path.join(egov, 'target/classes/egovframework/didisam/cmm/DdPiiCrypto.class');
    let java = true; try { execFileSync('java', ['-version'], { stdio: 'ignore' }); } catch { java = false; }
    if (!java || !fs.existsSync(cls)) return t2.skip('Java 빌드 없음(mvn -o -f service-egov/pom.xml -DskipTests package 후 실행)');
    for (const f of ['cmm/DdPiiCrypto.java', 'lms/p/service/impl/InterimAesGcmAdapter.java', 'auth/service/impl/LoginMfa.java']) {
      const s = fs.readFileSync(path.join(egov, 'src/main/java/egovframework/didisam', f), 'utf8');
      assert.ok(s.includes('new GCMParameterSpec(128') && !/GCMParameterSpec\((?!128)\d+/.test(s), f + ': 태그 128비트');
    }
    const short = n => shortSplit(OLD.pii, n);
    const items = [
      { kind: 'pii', aad: 't1|L1|email', ct: OLD.pii, want: 'learner@example.com' },
      { kind: 'pii', aad: 't1|m1', ct: OLD.state_name.slice(5), want: null }, // AAD 불일치 → 실패
      { kind: 'aria', aad: 't1|att', ct: OLD.aria, want: '출석 기록' },
      { kind: 'mfa', aad: '', ct: OLD.mfa, want: 'JBSWY3DPEHPK3PXP' },
      ...[4, 12, 15].map(n => ({ kind: 'pii', aad: 't1|L1|email', ct: short(n), want: null })),
      { kind: 'aria', aad: 't1|att', ct: 'v1:' + b64(OLD.aria.slice(3)).subarray(0, 20).toString('base64url'), want: null },
      { kind: 'mfa', aad: '', ct: 'v1:' + crypto.randomBytes(20).toString('base64url'), want: null },
    ];
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gcm-')); const inF = path.join(dir, 'in.json');
    fs.writeFileSync(inF, JSON.stringify({ key: KEY, items }));
    const out = JSON.parse(execFileSync('java', ['-Dfile.encoding=UTF-8', '-Dsun.stdout.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', 'target/classes:target/didisam-egov/WEB-INF/lib/*', 'test/GcmVectors.java', inF], { cwd: egov, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 }).trim().split('\n').pop());
    fs.rmSync(dir, { recursive: true, force: true });
    items.forEach((it, i) => { const r = out.results[i]; if (it.want == null) assert.equal(r.ok, false, `Java가 거부해야 함 #${i}`); else assert.deepEqual(r, { ok: true, got: it.want }, `Java 복호화 #${i}`); });
    for (const m of out.made) {
      const got = m.kind === 'pii' ? decSplit(K.enc, m.ct, m.aad) : m.kind === 'aria' ? aria.interim(KEY).decrypt(m.ct, m.aad) : decMfa(m.ct);
      assert.equal(got, m.plain, 'Node가 Java 암호문 복호화: ' + m.kind);
      if (m.kind === 'pii') { assert.equal(b64(m.ct.split('.')[2]).length, 16, 'Java 저장 태그 16바이트'); }
    }
  });
});
