'use strict';
/* 묶음 K — 설문(SFR-014 · 022 · 043 · 067). 업무 규칙은 sql/68_k.sql의 lms_k_* 함수에 있고, 여기서는 경로 · 권한 · 감사만 다룬다.
   같은 표를 Java(egovframework.didisam.lms.k)가 그대로 쓴다 → 응답 JSON이 같다.
   경로 표: [메서드, 이름, op, 허용 권한(o 정운영자 · s 부운영자 · t 교수자), w = 변경(감사 기록)] */
const ROUTES = [
  ['GET', 'surveys', 'survey_list', 'ost'],
  ['GET', 'survey', 'survey_get', 'ost'],
  ['POST', 'survey/save', 'survey_save', 'ost', 'w'],
  ['POST', 'survey/open', 'survey_open', 'ost', 'w'],
  ['POST', 'survey/close', 'survey_close', 'ost', 'w'],
  ['POST', 'survey/delete', 'survey_delete', 'os', 'w'],
  ['POST', 'survey/copy', 'survey_copy', 'ost', 'w'],
  ['POST', 'respond', 'respond', 'ost', 'w'],
  ['POST', 'import', 'import', 'os', 'w'],
  ['GET', 'pending', 'pending', 'ost'],
  ['GET', 'gate', 'gate', 'ost'],
  ['GET', 'stats', 'stats', 'ost'],
  ['GET', 'export', 'export', 'ost'],
  ['POST', 'remind', 'remind_run', 'os', 'w'],
  ['POST', 'course-eval', 'course_eval', 'ost', 'w'],
  ['POST', 'eval/public', 'eval_public', 'os', 'w']
];
const ROLE = { o: 'owner', s: 'sub', t: 'teacher' };

function bind(ctx, pfx, routes) {
  const out = {};
  for (const [m, name, op, roles, w] of routes) {
    out[`${m} /api/lms/${pfx}/${name}`] = async req => {
      const a = await ctx.need(req);
      if (!roles.split('').map(r => ROLE[r]).includes(a.role)) throw new ctx.HttpErr(403, '이 작업을 할 권한이 없습니다.', 'role');
      let args;
      if (m === 'GET') args = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
      else { args = await ctx.readBody(req, 2 * 1024 * 1024); if (!args || typeof args !== 'object' || Array.isArray(args)) throw new ctx.HttpErr(400, '형식이 올바르지 않습니다.', 'bad_json'); }
      const actor = { role: a.role, email: a.email };
      try {
        return await ctx.inTenant(ctx.pool, a.tid, async c => {
          const r = (await c.query('select lms_k_call($1, $2, $3::jsonb, $4::jsonb)::text j', [pfx, op, JSON.stringify(actor), JSON.stringify(args)])).rows[0].j;
          const j = JSON.parse(r);
          if (w) await ctx.audit(c, a.tid, a.email, `lms.${pfx}.${op}`, { id: (j && (j.survey_id || j.program_id || j.course_id || j.id)) || null });
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
