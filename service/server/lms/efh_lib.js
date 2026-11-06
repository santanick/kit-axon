'use strict';
/* v30 묶음 E · F · H 공용 — 라우트 표를 SQL 함수(lms_e_* · lms_f_* · lms_h_*) 호출로 바꾼다.
   업무 규칙 · 응답 JSON은 SQL 함수가 만든다 → 전자정부 Java 에디션(egovframework.didisam.lms.e|f|h)이 같은 함수를 불러 같은 JSON을 낸다.
   who: 'staff'(운영자 · 교수자 세션) | 'learner'(학습자 포털 세션 — 학번 = lms_person.member_no) | 'any'(둘 중 하나)
   ctx(SQL) = { kind, uid, email, role, sid, ip } — IP는 TRUST_PROXY_HOPS 규칙(app.js와 같음)으로 구한다. */
const crypto = require('node:crypto');

module.exports = function gateway(ctx, table) {
  const { pool, inTenant, need, readBody, HttpErr, audit } = ctx;
  const env = process.env; const secure = env.COOKIE_SECURE !== '0';
  const hops = Math.max(0, Math.min(5, Number(env.TRUST_PROXY_HOPS == null ? 1 : env.TRUST_PROXY_HOPS)));
  const lcookie = secure ? '__Host-dd_lsid' : 'dd_lsid';
  const ip = req => { const L = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean); return (hops && L.length >= hops ? L[L.length - hops] : '') || String(req.socket.remoteAddress || ''); };
  const cookie = (req, n) => { for (const s of String(req.headers.cookie || '').split(';')) { const i = s.indexOf('='); if (i > 0 && s.slice(0, i).trim() === n) return decodeURIComponent(s.slice(i + 1).trim()); } return null; };
  async function learner(req) {
    const t = cookie(req, lcookie); if (!t || t.length > 100) return null;
    const { rows } = await pool.query('select tenant_id, sid from learner_sessions where id = $1 and expires_at > now()', [crypto.createHash('sha256').update(t).digest('hex')]);
    return rows[0] || null;
  }
  async function actor(req, who) {
    if (who !== 'learner') {
      let a = null;
      try { a = await need(req); } catch (e) { if (!(e instanceof HttpErr) || who === 'staff') throw e; }
      if (a) return { tid: a.tid, by: a.email, c: { kind: 'staff', uid: a.uid, email: a.email, role: a.role, ip: ip(req) } };
    }
    const s = await learner(req); if (!s) throw new HttpErr(401, '로그인이 필요합니다.', 'auth');
    return { tid: s.tenant_id, by: 'learner:' + s.sid, c: { kind: 'learner', sid: s.sid, ip: ip(req) } };
  }
  const out = {};
  for (const [key, fn, who, max] of table) {
    const get = key.startsWith('GET ');
    out[key] = async req => {
      const act = await actor(req, who);
      const a = get ? Object.fromEntries(new URL(req.url, 'http://x').searchParams) : await readBody(req, max || 65536);
      return inTenant(pool, act.tid, async c => {
        let r;
        try { r = (await c.query(`select ${fn}($1::jsonb, $2::jsonb) as r`, [JSON.stringify(act.c), JSON.stringify(a)])).rows[0].r; }
        catch (e) { const m = /^dd:(\d{3}):([a-z_]+)$/.exec(e.detail || ''); if (m) throw new HttpErr(+m[1], e.message, m[2]); throw e; }
        if (r && r._audit) { const x = r._audit; delete r._audit; await audit(c, act.tid, act.by, x.a, x.d); }
        return r;
      });
    };
  }
  return out;
};
