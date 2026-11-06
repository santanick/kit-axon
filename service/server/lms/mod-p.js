'use strict';
/* v30 학사 LMS 묶음 P — 공통 · 비기능: 언어 · 접근성 · 강의실 언어 · 업로드 · 에디터 임시저장 · 포털 위젯 · 앱 출석 · KOCW XML ·
   관리자 2차 로그인(5회 실패 10분 잠금 · 동시 접속 차단 · 최종 접속) · 개인정보 열람 사유 통계 · 데이터 분류/ARIA 연결 지점 · 부하 시험 결과 · 무들 이관.
   업무 규칙: sql/90_p.sql lms_p(). 핵심 로그인(/api/login)은 고치지 않는다. */
const crypto = require('node:crypto');
const { build, sha } = require('./lmp-core');
const aria = require('./aria');
const adminTok = req => { const t = String(req.headers['x-lms-admin'] || ''); return /^[A-Za-z0-9_-]{20,100}$/.test(t) ? sha(t) : ''; };
const ROUTES = [
  ['GET', 'pref.get'], ['POST', 'pref.save'], ['GET', 'cls.langs'], ['POST', 'cls.lang'],
  ['POST', 'upload.add'], ['GET', 'upload.recent'], ['GET', 'upload.get'], ['POST', 'draft.save', { max: 512 * 1024 }], ['GET', 'draft.get'],
  ['POST', 'widget.save'], ['GET', 'portal'],
  ['GET', 'kocw', { pre: (req, q, a) => { q.org_name = String(a.name || ''); }, post: (r, res) => { res.setHeader('content-type', 'application/xml; charset=utf-8'); res.setHeader('content-disposition', 'attachment; filename="kocw-metadata.xml"'); return r.xml; } }],
  ['POST', 'admin.login', { pre: async (req, q, a, me, res) => {
    const ctxp = module.exports._ctx; ctxp.limit('lmsadm:' + a.uid, 20, 60000);
    const { checkPw } = require('../app');
    const row = (await ctxp.pool.query('select pw from users where id = $1', [a.uid])).rows[0];
    q.pw_ok = !!(row && typeof q.password === 'string' && q.password.length <= 200 && await checkPw(q.password, row.pw)); delete q.password;
    const t = crypto.randomBytes(32).toString('base64url'); q.token_hash = sha(t); res._lmsTok = t;
  }, post: (r, res) => ({ ...r, token: res._lmsTok }) }],
  ['GET', 'admin.status', { pre: (req, q) => { q.token_hash = adminTok(req); } }], ['POST', 'admin.logout', { pre: (req, q) => { q.token_hash = adminTok(req); } }],
  ['POST', 'pii.view'], ['GET', 'pii.stats'],
  ['GET', 'crypto.status', { pre: (req, q) => { q.adapter = aria.describe(); } }], ['POST', 'crypto.class_save'],
  ['POST', 'perf.save', { max: 256 * 1024 }], ['GET', 'perf.list'],
  ['POST', 'mig.import', { max: 4 * 1024 * 1024 }], ['GET', 'mig.runs'], ['GET', 'mig.videos'],
  ['POST', 'demo.seed']
];
/* 앱 출석(학습자 PWA): 출석 규칙 · 인증번호 · QR의 원본은 묶음 G다. 학습자 포털 세션(dd_lsid → 학번)으로 G의 checkin 경로를 그대로 실행한다
   (같은 검증 · 오류 · 감사 · 제한). 오프라인 출석부는 items[]로 한 번에 보내고 건별 결과를 돌려준다. Java: lms.g.service.impl.LmsGLearnerCheckin */
const G = require('./mod-g');
const G_CK = G.SPEC.find(r => r.m === 'POST' && r.p === '/api/lms/g/checkin');
function attCheckin(ctx) {
  const lname = () => process.env.COOKIE_SECURE !== '0' ? '__Host-dd_lsid' : 'dd_lsid';
  const cookie = (req, n) => { for (const x of String(req.headers.cookie || '').split(';')) { const i = x.indexOf('='); if (i > 0 && x.slice(0, i).trim() === n) return decodeURIComponent(x.slice(i + 1).trim()); } return null; };
  return async (req, res) => {
    const t = cookie(req, lname()); const s = t && t.length <= 100 ? (await ctx.pool.query('select tenant_id, sid from learner_sessions where id = $1 and expires_at > now()', [sha(t)])).rows[0] : null;
    if (!s) throw new ctx.HttpErr(401, '로그인이 필요합니다.', 'auth');
    const body = await ctx.readBody(req, 64 * 1024); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ctx.HttpErr(400, '형식이 올바르지 않습니다.', 'bad_json');
    const who = { tid: s.tenant_id, uid: 'learner:' + s.sid, email: 'learner:' + s.sid, role: 'learner' };
    const one = async x => { const b = { session_id: x.session_id, member_no: s.sid, method: x.method || (x.qr ? 'qr' : 'code'), code: x.code, qr: x.qr, taken_at: x.offline_at || x.taken_at };
      const h = G.engine({ ...ctx, need: async () => who, readBody: async () => b }, [G_CK], G.SQL)['POST /api/lms/g/checkin']; return h(req, res); };
    if (!Array.isArray(body.items)) return one(body);
    if (body.items.length > 50) throw new ctx.HttpErr(400, '오프라인 출석은 한 번에 50건까지 보냅니다.', 'bad_input');
    const items = [];
    for (const x of body.items) { if (!x || typeof x !== 'object') { items.push({ session_id: null, ok: false, error: 'bad_input' }); continue; }
      try { const r = await one(x); items.push({ session_id: r.session_id, ok: true, status: r.status }); } catch (e) { if (!(e instanceof ctx.HttpErr)) throw e; items.push({ session_id: x.session_id || null, ok: false, error: e.code, message: e.message }); } }
    return { ok: true, items };
  };
}
module.exports = ctx => { module.exports._ctx = ctx; return { ...build(ctx, 'p', 'lms_p', ROUTES), 'POST /api/lms/p/att/checkin': attCheckin(ctx) }; };
module.exports.ROUTES = ROUTES;
