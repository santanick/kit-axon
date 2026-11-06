'use strict';
/* v30 규정 준수(고용노동부 원격훈련 · 내일배움카드 · 원격평생교육) 서버 기능
   - 학습 활동 로그(cpl_log): 로그인 · 차시별 학습시간 · 본인확인 · IP를 기관 DB에 원본으로 보관 — 별표 1 자료보존
   - 1일 학습시간 제한: 서버가 합산해 판정(브라우저 값을 믿지 않는다)
   - 동시접속 방지: 정책이 켜진 기관은 새 로그인이 이전 세션을 끊는다
   - 본인확인: 실제 제공사(휴대폰 · 공단 MOTP)는 계약 · 규격 확정 뒤 어댑터로 붙인다. 미연동이면 501 provider_missing */
const crypto = require('node:crypto');

function createCompliance({ pool, inTenant, readBody, limit, ip, HttpErr, env = {} }) {
  const KEY_RE = /^[\w-]{1,60}$/;
  const dev = env.IDV_DEV === '1'; const pending = new Map();
  const policy = async (c, tid) => (await c.query("select doc->'org'->'cpl' p from tenant_state where tenant_id = $1", [tid])).rows[0]?.p || null;
  const rec = (c, tid, sid, kind, o = {}) => c.query('insert into cpl_log (tenant_id, sid, kind, cls, item, secs, ip, ua) values ($1, $2, $3, $4, $5, $6, $7, $8)',
    [tid, sid, kind, o.cls || null, o.item || null, o.secs || 0, o.ip || null, o.ua ? String(o.ua).slice(0, 160) : null]);
  const dayMaxOf = P => { const h = +(P && P.dayMax); return P && P.on && h > 0 ? Math.min(24, h) * 3600 : 0; };
  const today = async (c, tid, sid) => +(await c.query("select coalesce(sum(secs), 0) s from cpl_log where tenant_id = $1 and sid = $2 and kind = 'beat' and day = (now() at time zone 'Asia/Seoul')::date", [tid, sid])).rows[0].s;

  /* 로그인 직후: 활동 기록 + 동시접속 방지(최신 로그인만 유지) */
  async function afterLogin(req, tid, sid, keepHash) {
    const P = await inTenant(pool, tid, async c => { const p = await policy(c, tid); if (p && p.on) await rec(c, tid, sid, 'login', { ip: ip(req), ua: req.headers['user-agent'] }); return p; });
    if (P && P.on && P.single) await pool.query('delete from learner_sessions where tenant_id = $1 and sid = $2 and id <> $3', [tid, sid, keepHash]);
  }

  async function route(req, tid, sid) {
    const b = await readBody(req, 2048); const kind = String(b.kind || '');
    if (kind === 'beat') {
      limit(`cplb:${tid}:${sid}`, 40, 60e3);
      const secs = Math.floor(+b.secs); if (!(secs >= 1 && secs <= 60)) throw new HttpErr(400, '학습시간 값이 올바르지 않습니다.', 'secs');
      const cls = String(b.cls || ''), item = String(b.item || ''); if (!KEY_RE.test(cls) || !KEY_RE.test(item)) throw new HttpErr(400, '과정 정보가 올바르지 않습니다.', 'item');
      return inTenant(pool, tid, async c => { const P = await policy(c, tid); const max = dayMaxOf(P); let s = await today(c, tid, sid); const over = !!max && s >= max;
        if (P && P.on && !over) { const add = max ? Math.min(secs, max - s) : secs; await rec(c, tid, sid, 'beat', { cls, item, secs: add, ip: ip(req) }); s += add; }
        return { today: s, max, over: !!max && s >= max }; });
    }
    if (kind === 'verify-start' || kind === 'verify-confirm') {
      const method = String(b.method || ''); if (!['phone', 'motp'].includes(method)) throw new HttpErr(400, '본인확인 방식이 올바르지 않습니다.', 'method');
      limit(`cplv:${tid}:${sid}`, 10, 600e3);
      if (!dev) throw new HttpErr(501, '본인확인 제공사가 아직 연동되지 않았습니다.', 'provider_missing');
      const k = `${tid}|${sid}|${method}`;
      if (kind === 'verify-start') { const code = String(crypto.randomInt(100000, 1000000)); pending.set(k, { code, exp: Date.now() + 300e3 }); return { ok: true, ttl: 300, dev_code: code }; }
      const p = pending.get(k); if (!p || p.exp < Date.now() || p.code !== String(b.code || '')) throw new HttpErr(400, '인증번호가 올바르지 않습니다.', 'code');
      pending.delete(k); await inTenant(pool, tid, c => rec(c, tid, sid, 'verify-' + method, { ip: ip(req), ua: req.headers['user-agent'] })); return { ok: true };
    }
    if (kind === 'attend') {
      limit(`cpla:${tid}:${sid}`, 10, 600e3);
      const cls = String(b.cls || ''), code = String(b.code || '');
      return inTenant(pool, tid, async c => { const P = await policy(c, tid); const A = P && P.on && P.attend; if (!A || A.cls !== cls || A.code !== code || !(+A.exp > Date.now())) throw new HttpErr(400, '출석 코드가 올바르지 않거나 만료되었습니다.', 'attend'); const dup = (await c.query("select 1 from cpl_log where tenant_id = $1 and sid = $2 and kind = 'attend' and cls = $3 and day = (now() at time zone 'Asia/Seoul')::date limit 1", [tid, sid, cls])).rows.length; if (!dup) await rec(c, tid, sid, 'attend', { cls, ip: ip(req), ua: req.headers['user-agent'] }); return { ok: true }; });
    }
    throw new HttpErr(400, '지원하지 않는 요청입니다.', 'kind');
  }

  /* 어드민: 훈련생별 집계 · 원본 로그 */
  const summary = a => inTenant(pool, a.tid, async c => ({ rows: (await c.query(`select sid, coalesce(sum(secs) filter (where kind = 'beat'), 0)::int secs,
      coalesce(sum(secs) filter (where kind = 'beat' and day = (now() at time zone 'Asia/Seoul')::date), 0)::int today,
      count(distinct ip)::int ips, to_char(max(at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') last, (count(*) filter (where kind like 'verify-%'))::int verified
      from cpl_log where tenant_id = $1 group by sid order by max(at) desc limit 1000`, [a.tid])).rows }));
  const logs = (a, url) => { const sid = url.searchParams.get('sid') || ''; const n = Math.min(2000, Math.max(1, +url.searchParams.get('limit') || 200));
    return inTenant(pool, a.tid, async c => ({ rows: (await c.query(`select id::text, sid, kind, cls, item, secs, ip, ua, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') at from cpl_log where tenant_id = $1 and ($2 = '' or sid = $2) order by cpl_log.id desc limit $3`, [a.tid, sid, n])).rows })); };
  return { afterLogin, route, summary, logs };
}
module.exports = { createCompliance };
