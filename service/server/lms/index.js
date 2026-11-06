'use strict';
/* v30 학사 LMS 묶음 로더 — 묶음(A~Q)마다 독립 파일로 붙여 동시에 개발해도 충돌하지 않게 한다.
   - sql/NN_<묶음>.sql : 파일 이름순으로 기본 마이그레이션(db.js) 뒤에 이어 붙는다.
                         00_base = 학사 LMS 도메인 스키마(service/lms-domain/001). 배포된 파일은 고치지 않고 새 번호 파일로 추가한다.
                         번호 예약: 10 A · 20 B · 25 C · 28 D · 30 E · 40 F · 50 G · 55 H · 60 I · 65 J · 68 K · 70 L · 75 M · 80 N · 85 O · 90 P · 95 Q
   - mod-<묶음>.js     : module.exports = ctx => ({ 'GET /api/lms/<묶음>/<이름>': async (req, res) => 결과(쿼리는 new URL(req.url, 'http://x').searchParams) })
                         ctx = { pool, inTenant, need, readBody, HttpErr, audit, today, limit, log }. 경로 매개변수 대신 쿼리 문자열을 쓴다. */
const fs = require('node:fs');
const path = require('node:path');
const SQL = path.join(__dirname, 'sql');

function sqlMigrations() {
  if (!fs.existsSync(SQL)) return [];
  return fs.readdirSync(SQL).filter(f => /^\d{2}_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => [f, fs.readFileSync(path.join(SQL, f), 'utf8')]);
}

function loadRoutes(ctx) {
  const out = {};
  for (const f of fs.readdirSync(__dirname).filter(f => /^mod-[a-z0-9_]+\.js$/.test(f)).sort()) {
    const r = require(path.join(__dirname, f))(ctx);
    for (const k of Object.keys(r)) {
      if (!/^(GET|POST|PUT|DELETE) \/api\/lms\//.test(k)) throw new Error(`LMS 라우트는 /api/lms/ 아래만 허용: ${k} (${f})`);
      if (out[k]) throw new Error(`LMS 라우트 중복: ${k} (${f})`);
      out[k] = r[k];
    }
  }
  return out;
}

module.exports = { sqlMigrations, loadRoutes };
