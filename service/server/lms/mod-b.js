'use strict';
/* v30 묶음 B — 강의실 구성(주차 · 차시 · 자원 · SCORM · 조건부/순차/수준별/적응형 · 템플릿 · 복사 · 백업 · 휴지통 · 버전 · 공유 · 역할/메뉴).
   업무 규칙 · 응답 JSON은 SQL 함수 lms_b_api(op, 인자, 행위자)가 만든다(sql/20_b.sql) → 전자정부 Java(lms.b)도 같은 함수를 불러 같은 JSON을 낸다.
   이 파일은 경로 표 · 세션 확인 · 기관 유형 · 크기 제한 · 감사 기록만 맡는다. 묶음 C · D도 같은 디스패처(bundle)를 쓴다.
   경로 표 형식: 이름 → [메서드, 본문 최대 바이트, 운영자 전용(정 · 부운영자), SQL 함수(기본 lms_<묶음>_api)] */
const ROUTES = {
  sections: ['GET'], templates: ['GET'], 'ext-list': ['GET'], library: ['GET'], perms: ['GET'], file: ['GET'],
  overview: ['GET'], timeline: ['GET'], progress: ['GET'], next: ['GET'], backups: ['GET'], 'backup-get': ['GET'], trash: ['GET'], 'res-versions': ['GET'], menu: ['GET'],
  scorm: ['GET'], 'scorm-file': ['GET'], 'scorm-report': ['GET'],
  'perm-set': ['POST', 4096, true], 'week-save': ['POST'], 'week-del': ['POST'], 'session-save': ['POST'], 'session-del': ['POST'],
  'res-save': ['POST', 512 * 1024], 'res-del': ['POST'], 'res-restore': ['POST'], 'res-purge': ['POST'], 'res-revert': ['POST'], 'res-reuse': ['POST'],
  'progress-mark': ['POST'], 'level-set': ['POST'], 'level-auto': ['POST'], 'opt-set': ['POST', 128 * 1024], 'syllabus-import': ['POST', 256 * 1024],
  'template-apply': ['POST'], 'template-save': ['POST'], 'template-del': ['POST'], copy: ['POST'], shift: ['POST'],
  backup: ['POST'], 'backup-import': ['POST', 8 * 1024 * 1024], 'backup-del': ['POST'], restore: ['POST'],
  'file-put': ['POST', 4500 * 1024], 'scorm-pkg': ['POST', 256 * 1024], 'scorm-file-put': ['POST', 7 * 1024 * 1024], 'scorm-commit': ['POST', 512 * 1024],
  'menu-set': ['POST', 16384], 'menu-pref': ['POST', 16384],
  /* SFR-038 강의자료 관리(sql/99_b_material.sql의 lms_bm_api) */
  material: ['GET', 65536, false, 'lms_bm_api'], downloads: ['GET', 65536, false, 'lms_bm_api'], converted: ['GET', 65536, false, 'lms_bm_api'], mylib: ['GET', 65536, false, 'lms_bm_api'],
  'material-file': ['POST', 65536, false, 'lms_bm_api'], 'convert-request': ['POST', 65536, false, 'lms_bm_api'], 'convert-done': ['POST', 2200 * 1024, true, 'lms_bm_api'],
  'mylib-add': ['POST', 65536, false, 'lms_bm_api'], 'mylib-del': ['POST', 65536, false, 'lms_bm_api'], 'mylib-use': ['POST', 65536, false, 'lms_bm_api']
};

/* 묶음 공용 디스패처: GET은 쿼리 문자열, 그 밖은 쿼리 + JSON 본문(본문 우선)을 인자로 넘긴다.
   신원: 스튜디오 세션(운영자 · 교수자) 또는 학습자 포털 세션(dd_lsid → 학번, as 전환 불가). 학습자 세션은 운영자 전용 경로를 쓸 수 없다. */
const crypto = require('node:crypto');
function bundle(ctx, b, routes) {
  const out = {};
  const lsess = async req => {
    const ck = Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => v.trim().split('=')).filter(v => v[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
    const t = ck[process.env.COOKIE_SECURE !== '0' ? '__Host-dd_lsid' : 'dd_lsid']; if (!t || t.length > 100) return null;
    const r = (await ctx.pool.query('select s.tenant_id, s.sid, t.type from learner_sessions s join tenants t on t.id = s.tenant_id where s.id = $1 and s.expires_at > now()', [crypto.createHash('sha256').update(t).digest('hex')])).rows[0];
    return r || null;
  };
  for (const [op, [method, max = 65536, adm = false, fn = `lms_${b}_api`]] of Object.entries(routes)) {
    out[`${method} /api/lms/${b}/${op}`] = async req => {
      let a = null, actor, by;
      try { a = await ctx.need(req); } catch (e) { if (!(e instanceof ctx.HttpErr) || e.status !== 401) throw e; }
      if (a) { actor = { uid: a.uid, email: a.email, role: a.role }; by = a.email; }
      else {
        const s = await lsess(req); if (!s) throw new ctx.HttpErr(401, '로그인이 필요합니다.', 'auth');
        a = { tid: s.tenant_id, type: s.type, role: 'learner' }; actor = { kind: 'learner', sid: s.sid }; by = 'learner:' + s.sid;
      }
      if (a.type !== 'univ') throw new ctx.HttpErr(403, '학사 LMS(대학) 기관에서만 쓸 수 있습니다.', 'lms_edition');
      if (adm && !['owner', 'sub'].includes(a.role)) throw new ctx.HttpErr(403, '정 · 부운영자만 할 수 있습니다.', 'role');
      const args = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
      if (method !== 'GET') {
        const body = await ctx.readBody(req, max);
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ctx.HttpErr(400, '형식이 올바르지 않습니다.', 'bad_json');
        Object.assign(args, body);
      }
      try {
        return await ctx.inTenant(ctx.pool, a.tid, async c => {
          const r = (await c.query(`select ${fn}($1, $2::jsonb, $3::jsonb) as r`, [op, JSON.stringify(args), JSON.stringify(actor)])).rows[0].r;
          if (method !== 'GET') await ctx.audit(c, a.tid, by, `lms.${b}.${op}`, { section: args.section || null, id: (r && (r.id || null)) || args.id || null, as: args.as || null });
          return r;
        });
      } catch (e) {
        if (e && typeof e.code === 'string' && /^DD\d{3}$/.test(e.code)) throw new ctx.HttpErr(+e.code.slice(2), e.message, e.hint || 'error');
        throw e;
      }
    };
  }
  return out;
}

module.exports = ctx => bundle(ctx, 'b', ROUTES);
module.exports.bundle = bundle;
module.exports.ROUTES = ROUTES;
