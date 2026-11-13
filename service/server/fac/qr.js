'use strict';
/* v40 QR 체크인 토큰(02 명세 5-5): v1.<base64url(payload)>.<base64url(HMAC-SHA256)>
   payload = {t:tid, b|p|r, f:facId, d:'YYYY-MM-DD', jti, nbf, exp}(초). 서명 키 = HMAC(FAC_QR_KEY, tid), FAC_QR_KEY가 없으면 PII_KEY에서 파생.
   키오스크 토큰: k1.<payload>.<sig> payload = {t, f, k:1, exp}. 응답 · 로그에 키를 남기지 않는다. Java: DdFacQr 같은 형식. */
const crypto = require('node:crypto');
function createQr(env) {
  const root = String(env.FAC_QR_KEY || '').trim() || (String(env.PII_KEY || '').trim() ? crypto.createHmac('sha256', String(env.PII_KEY).trim()).update('didisam-fac-qr').digest('hex') : '');
  const keyOf = tid => crypto.createHmac('sha256', root).update(String(tid)).digest();
  const mac = (tid, s) => crypto.createHmac('sha256', keyOf(tid)).update(s).digest('base64url');
  const sign = (tid, pfx, payload) => { const p = Buffer.from(JSON.stringify(payload)).toString('base64url'); return `${pfx}.${p}.${mac(tid, pfx + '.' + p)}`; };
  /* 서명 · 기관만 확인하고 payload를 돌려준다. 만료 · 사용 여부는 호출하는 쪽에서 */
  function open(tid, token, pfx) {
    const m = /^(v1|k1)\.([A-Za-z0-9_-]{10,800})\.([A-Za-z0-9_-]{43})$/.exec(String(token || '').trim()); if (!m || m[1] !== pfx || !root) return null;
    const want = Buffer.from(mac(tid, m[1] + '.' + m[2])), got = Buffer.from(m[3]); if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
    try { const p = JSON.parse(Buffer.from(m[2], 'base64url').toString('utf8')); return p && p.t === tid ? p : null; } catch (e) { return null; }
  }
  return {
    ready: () => !!root,
    issue: (tid, o) => sign(tid, 'v1', { t: tid, ...o, jti: crypto.randomBytes(12).toString('base64url') }),
    kiosk: (tid, fac, sec) => sign(tid, 'k1', { t: tid, f: fac, k: 1, exp: Math.floor(Date.now() / 1000) + sec }),
    open: (tid, token) => open(tid, token, 'v1'),
    openKiosk: (tid, token) => { const p = open(tid, token, 'k1'); return p && p.k === 1 && p.exp > Date.now() / 1000 ? p : null; }
  };
}
module.exports = { createQr };
