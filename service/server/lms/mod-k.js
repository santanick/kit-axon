'use strict';
/* 묶음 K — 설문(SFR-014 · 022 · 043 · 067). 업무 규칙은 sql/68_k.sql의 lms_k_* 함수에 있고, 여기서는 경로 · 권한 · 감사만 다룬다.
   같은 표를 Java(egovframework.didisam.lms.k)가 그대로 쓴다 → 응답 JSON이 같다.
   경로 표: [메서드, 이름, op, 허용 권한(o 정운영자 · s 부운영자 · t 교수자 · L 학습자 본인 세션), w = 변경(감사 기록)] */
const ROUTES = [
  ['GET', 'surveys', 'survey_list', 'ost'],
  ['GET', 'survey', 'survey_get', 'ostL'],
  ['POST', 'survey/save', 'survey_save', 'ost', 'w'],
  ['POST', 'survey/open', 'survey_open', 'ost', 'w'],
  ['POST', 'survey/close', 'survey_close', 'ost', 'w'],
  ['POST', 'survey/delete', 'survey_delete', 'os', 'w'],
  ['POST', 'survey/copy', 'survey_copy', 'ost', 'w'],
  ['POST', 'respond', 'respond', 'ostL', 'w'],
  ['POST', 'import', 'import', 'os', 'w'],
  ['GET', 'pending', 'pending', 'ostL'],
  ['GET', 'gate', 'gate', 'ostL'],
  ['GET', 'stats', 'stats', 'ost'],
  ['GET', 'export', 'export', 'ost'],
  ['POST', 'remind', 'remind_run', 'os', 'w'],
  ['POST', 'course-eval', 'course_eval', 'ost', 'w'],
  ['POST', 'eval/public', 'eval_public', 'os', 'w']
];
const ROLE = { o: 'owner', s: 'sub', t: 'teacher' };
const crypto = require('node:crypto');

/* 학습자 본인 세션(L): 학습자 포털 쿠키(dd_lsid) → learner_sessions.sid = 학번(lms_person.member_no).
   운영자 · 교수자 세션이 있으면 그쪽이 먼저(「해당 사용자로 보기」는 운영자 세션 + member_no). 학습자는 member_no가 본인 학번으로 고정된다. */
function lcookieName() { return process.env.COOKIE_SECURE !== '0' ? '__Host-dd_lsid' : 'dd_lsid'; }
function cookieOf(req, n) { for (const s of String(req.headers.cookie || '').split(';')) { const i = s.indexOf('='); if (i > 0 && s.slice(0, i).trim() === n) return decodeURIComponent(s.slice(i + 1).trim()); } return null; }
async function learnerOf(ctx, req) {
  const t = cookieOf(req, lcookieName()); if (!t || t.length > 100) return null;
  const { rows } = await ctx.pool.query('select tenant_id, sid from learner_sessions where id = $1 and expires_at > now()', [crypto.createHash('sha256').update(t).digest('hex')]);
  return rows[0] || null;
}

function bind(ctx, pfx, routes) {
  const out = {};
  for (const [m, name, op, roles, w] of routes) {
    out[`${m} /api/lms/${pfx}/${name}`] = async req => {
      let a = null, ls = null;
      try { a = await ctx.need(req); } catch (e) { if (!(e instanceof ctx.HttpErr) || !roles.includes('L')) throw e; }
      if (!a) { ls = await learnerOf(ctx, req); if (!ls) throw new ctx.HttpErr(401, '로그인이 필요합니다.', 'auth'); }
      if (a && !roles.split('').map(r => ROLE[r]).includes(a.role)) throw new ctx.HttpErr(403, '이 작업을 할 권한이 없습니다.', 'role');
      let args;
      if (m === 'GET') args = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
      else { args = await ctx.readBody(req, 2 * 1024 * 1024); if (!args || typeof args !== 'object' || Array.isArray(args)) throw new ctx.HttpErr(400, '형식이 올바르지 않습니다.', 'bad_json'); }
      const tid = a ? a.tid : ls.tenant_id; const by = a ? a.email : 'learner:' + ls.sid;
      const actor = a ? { role: a.role, email: a.email } : { role: 'learner', email: by, member_no: ls.sid };
      if (ls) { args.member_no = ls.sid; delete args.by_operator; delete args.all; }
      try {
        return await ctx.inTenant(ctx.pool, tid, async c => {
          const r = (await c.query('select lms_k_call($1, $2, $3::jsonb, $4::jsonb)::text j', [pfx, op, JSON.stringify(actor), JSON.stringify(args)])).rows[0].j;
          const j = JSON.parse(r);
          if (w) await ctx.audit(c, tid, by, `lms.${pfx}.${op}`, { id: (j && (j.survey_id || j.program_id || j.course_id || j.id)) || null });
          return j;
        });
      } catch (e) {
        const p = /^DD\|(\d{3})\|([a-z_]+)\|([\s\S]*)$/.exec(e && e.message || '');
        if (p) throw new ctx.HttpErr(+p[1], p[3], p[2]);
        throw e;
      }
    };
  }
  return out;
}

module.exports = ctx => bind(ctx, 'k', ROUTES);
module.exports.bind = bind;
