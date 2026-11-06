'use strict';
/* v30 학사 LMS 묶음 P — 공통 · 비기능: 언어 · 접근성 · 강의실 언어 · 업로드 · 에디터 임시저장 · 포털 위젯 · 앱 출석 · KOCW XML ·
   관리자 2차 로그인(5회 실패 10분 잠금 · 동시 접속 차단 · 최종 접속) · 개인정보 열람 사유 통계 · 데이터 분류/ARIA 연결 지점 · 부하 시험 결과 · 무들 이관.
   업무 규칙: sql/90_p.sql lms_p(). 핵심 로그인(/api/login)은 고치지 않는다. */
const crypto = require('node:crypto');
const { build, sha } = require('./lmp-core');
const aria = require('./aria');
const adminTok = req => { const t = String(req.headers['x-lms-admin'] || ''); return /^[A-Za-z0-9_-]{20,100}$/.test(t) ? sha(t) : ''; };
const ROUTES = [
  ['POST', 'att.checkin', { learner: true }], ['POST', 'att.open'], ['GET', 'att.board'],
  ['GET', 'pref.get'], ['POST', 'pref.save'], ['GET', 'cls.langs'], ['POST', 'cls.lang'],
  ['POST', 'upload.add'], ['GET', 'upload.recent'], ['POST', 'draft.save', { max: 512 * 1024 }], ['GET', 'draft.get'],
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
module.exports = ctx => { module.exports._ctx = ctx; return build(ctx, 'p', 'lms_p', ROUTES); };
module.exports.ROUTES = ROUTES;
