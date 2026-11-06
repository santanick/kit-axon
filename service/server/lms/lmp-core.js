'use strict';
/* 묶음 L · M · P 공용: 라우트 표 → SQL 디스패처(lms_l · lms_m · lms_p) 호출.
   업무 규칙은 SQL 함수에 있고 Java(egovframework.didisam.lms.*)도 같은 함수를 같은 인자로 부른다 → 같은 JSON.
   SQL 오류는 detail 'lms:<상태>:<코드>'로 오고 HttpErr로 바꾼다. */
const crypto = require('node:crypto');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const BODY_MAX = 64 * 1024;
const ipOf = req => { const L = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean); const hops = Math.max(0, Math.min(5, Number(process.env.TRUST_PROXY_HOPS == null ? 1 : process.env.TRUST_PROXY_HOPS))); return (hops && L.length >= hops ? L[L.length - hops] : '') || String(req.socket.remoteAddress || ''); };
const pathOf = (b, op) => `/api/lms/${b}/${op.replace(/\./g, '/')}`;

function mapErr(ctx, e) {
  const d = e && typeof e.detail === 'string' && e.detail.match(/^lms:(\d{3}):([a-z_]+)$/);
  if (d) return new ctx.HttpErr(+d[1], e.message, d[2]);
  if (e && /^22/.test(e.code || '')) return new ctx.HttpErr(400, '입력 값이 올바르지 않습니다.', 'bad_input');
  return e;
}

/* 학습자 앱 세션(learner_sessions) — 핵심 인증은 고치지 않고 같은 쿠키를 읽는다 */
async function learner(ctx, req) {
  const name = process.env.COOKIE_SECURE !== '0' ? '__Host-dd_lsid' : 'dd_lsid';
  const t = Object.fromEntries(String(req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]))[name];
  const r = t && t.length <= 100 ? (await ctx.pool.query('select tenant_id tid, sid from learner_sessions where id = $1 and expires_at > now()', [sha(t)])).rows[0] : null;
  if (!r) throw new ctx.HttpErr(401, '로그인이 필요합니다.', 'auth');
  return r;
}
/* fn: SQL 디스패처 이름, table: [[method, op, opts]] — opts.max 본문 한도, opts.pre(req, q, a) 앱 계층 보강(IP · UA · 지표 등), opts.post(out, res) 응답 가공 */
function build(ctx, b, fn, table) {
  const out = {};
  for (const [method, op, o = {}] of table) {
    out[`${method} ${pathOf(b, op)}`] = async (req, res) => {
      /* o.learner: true = 학습자 세션만, 'any' = 운영자 · 교수자 세션이 없으면 학습자 세션(학번 = lms_person.member_no) */
      let a, isL = o.learner === true;
      if (o.learner === 'any') { try { a = await ctx.need(req); } catch (e) { if (!(e instanceof ctx.HttpErr) || e.status !== 401) throw e; a = await learner(ctx, req); isL = true; } }
      else a = isL ? await learner(ctx, req) : await ctx.need(req);
      const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
      if (method !== 'GET') { const body = await ctx.readBody(req, o.max || BODY_MAX); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ctx.HttpErr(400, '형식이 올바르지 않습니다.', 'bad_json'); Object.assign(q, body); }
      const me = isL ? { learner: a.sid, role: 'learner', ip: ipOf(req), ua: String(req.headers['user-agent'] || '').slice(0, 300) } : { uid: String(a.uid), email: a.email, role: a.role, ip: ipOf(req), ua: String(req.headers['user-agent'] || '').slice(0, 300) };
      if (o.pre) await o.pre(req, q, a, me, res);
      let r;
      try { r = await ctx.inTenant(ctx.pool, a.tid, async c => (await c.query(`select ${fn}($1, $2::jsonb, $3::jsonb) j`, [op, JSON.stringify(me), JSON.stringify(q)])).rows[0].j); }
      catch (e) { throw mapErr(ctx, e); }
      /* _status: SQL이 기록(실패 횟수 등)을 남기고 커밋한 뒤 돌려주는 오류 */
      if (r && typeof r === 'object' && r._status) throw new ctx.HttpErr(r._status, r.message, r.error);
      return o.post ? o.post(r, res, q) : r;
    };
  }
  return out;
}
module.exports = { build, mapErr, ipOf, pathOf, BODY_MAX, sha };
