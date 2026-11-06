'use strict';
/* 암호화 어댑터(SER-008 · DAR-002) — 검증필 암호모듈(ARIA, KCMVP) 연결 지점.
   인터페이스: { id, alg, certified, target, ready(), encrypt(plain, aad) → 'v1:' base64url, decrypt(ct, aad) → plain }
   구축 때 검증필 모듈(예: 기관이 구매한 ARIA 라이브러리)을 같은 인터페이스로 감싸 register()로 바꿔 끼운다.
   지금 기본값은 AES-256-GCM(PII_KEY) 임시 어댑터 — 형식 'v1:'(iv 12 · tag 16 · 본문)은 Java LmsCryptoAdapter와 같다. */
const crypto = require('node:crypto');
function interim(keyHex) {
  const key = /^[0-9a-f]{64}$/i.test(String(keyHex || '')) ? Buffer.from(keyHex, 'hex') : null;
  return {
    id: 'interim-aes-gcm', alg: 'AES-256-GCM', certified: false, target: 'ARIA-256-GCM(KCMVP 검증필 모듈)',
    ready: () => !!key,
    encrypt(plain, aad = '') { if (!key) throw new Error('키 없음'); const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key, iv); c.setAAD(Buffer.from(aad)); const b = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]); return 'v1:' + Buffer.concat([iv, c.getAuthTag(), b]).toString('base64url'); },
    decrypt(ct, aad = '') { if (!key) throw new Error('키 없음'); const raw = Buffer.from(String(ct).slice(3), 'base64url'); const d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12)); d.setAAD(Buffer.from(aad)); d.setAuthTag(raw.subarray(12, 28)); return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8'); }
  };
}
let cur = interim(process.env.PII_KEY);
const register = a => { for (const k of ['id', 'alg', 'ready', 'encrypt', 'decrypt']) if (!(k in a)) throw new Error('암호화 어댑터 규격 위반: ' + k); cur = a; };
function describe() {
  let selftest = false; try { selftest = cur.ready() && cur.decrypt(cur.encrypt('20261234|자체 점검', 'lms'), 'lms') === '20261234|자체 점검'; } catch { selftest = false; }
  return { id: cur.id, alg: cur.alg, certified: !!cur.certified, target: cur.target || '', ready: !!cur.ready(), selftest };
}
module.exports = { register, describe, current: () => cur, interim };
