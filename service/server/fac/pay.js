'use strict';
/* v40 토스페이먼츠 서버 승인 · 취소(결정 1). 상점 비밀키는 환경변수 TOSS_SECRET_KEY(GCP Secret) — 없으면 온라인 결제를 열지 않는다(payOnline:false).
   승인: POST {TOSS_URL}/v1/payments/confirm {paymentKey, orderId, amount}, 취소: POST /v1/payments/{paymentKey}/cancel {cancelReason, cancelAmount}.
   인증: Basic base64(secretKey + ':'). 키 값은 응답 · 로그에 남기지 않는다. */
function createPay(env, fetchFn = globalThis.fetch) {
  const key = String(env.TOSS_SECRET_KEY || '').trim(); const base = String(env.TOSS_URL || 'https://api.tosspayments.com').replace(/\/+$/, '');
  const head = () => ({ authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'), 'content-type': 'application/json' });
  async function post(path, body, idem) {
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 15000);
    try { const r = await fetchFn(base + path, { method: 'POST', headers: { ...head(), ...(idem ? { 'idempotency-key': idem } : {}) }, body: JSON.stringify(body), signal: ac.signal }); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j }; }
    catch (e) { return { ok: false, status: 0, j: { code: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK' } }; } finally { clearTimeout(to); }
  }
  return {
    online: () => !!key,
    /* 반환 { ok, amount, method, raw } | { ok:false, code } */
    async confirm({ paymentKey, orderId, amount }) { if (!key) return { ok: false, code: 'onsite_only' }; const r = await post('/v1/payments/confirm', { paymentKey, orderId, amount }, 'cf-' + orderId);
      return r.ok ? { ok: true, amount: Math.round(+r.j.totalAmount || 0), status: r.j.status, method: r.j.method || '' } : { ok: false, code: String(r.j.code || 'pg') }; },
    async cancel({ paymentKey, reason, amount, idem }) { if (!key) return { ok: false, code: 'onsite_only' }; const r = await post(`/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, { cancelReason: String(reason || '고객 요청').slice(0, 200), ...(amount != null ? { cancelAmount: amount } : {}) }, idem);
      const c = r.ok && Array.isArray(r.j.cancels) ? r.j.cancels[r.j.cancels.length - 1] : null; return r.ok ? { ok: true, cancelKey: c && c.transactionKey ? String(c.transactionKey) : 'ok' } : { ok: false, code: String(r.j.code || 'pg') }; }
  };
}
module.exports = { createPay };
