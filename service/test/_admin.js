'use strict';
/* QA8(v49) 시험 하네스 — 시험이 결과를 확인하려고 DB를 직접 읽고 고치는(audit_log · sessions · fac_* 등) 조회용 연결.
   운영과 같은 비슈퍼유저 계정(FORCE RLS)으로 서버를 띄우면, 시험의 직접 조회는 app.tenant가 없어 0행이 되어
   「기능은 맞는데 시험만 실패」(또는 실패 뒤 서버를 닫지 못해 멈춤)가 된다.
   · DATABASE_URL 계정이 슈퍼유저 · BYPASSRLS면 같은 연결을 쓴다(CI · 기존 방식 그대로).
   · 아니면 TEST_ADMIN_DATABASE_URL(슈퍼유저 계정)로 조회만 따로 연결한다 — 서버는 비슈퍼유저 그대로라 RLS 아래 동작을 시험한다.
   · 둘 다 없으면 null → 시험은 실패 대신 「건너뜀(이유)」으로 끝낸다.
   예: DATABASE_URL=postgresql://didisam@…/db TEST_ADMIN_DATABASE_URL=postgresql://postgres@…/db node --test service/test/session.test.js */
const { Pool } = require(require.resolve('pg', { paths: [require('node:path').join(__dirname, '../server')] })); // pg는 service/server에 설치됨
const NEED = '비슈퍼유저 DB — 직접 조회 확인에 TEST_ADMIN_DATABASE_URL(슈퍼유저) 필요';
async function adminPool(pool, env = process.env) {
  const r = await pool.query('select rolsuper or rolbypassrls ok from pg_roles where rolname = current_user');
  if (r.rows[0] && r.rows[0].ok) return pool;
  if (!env.TEST_ADMIN_DATABASE_URL) return null;
  const a = new Pool({ connectionString: env.TEST_ADMIN_DATABASE_URL, max: 3 });
  const s = await a.query('select rolsuper or rolbypassrls ok from pg_roles where rolname = current_user');
  if (!s.rows[0] || !s.rows[0].ok) { await a.end(); throw new Error('TEST_ADMIN_DATABASE_URL은 슈퍼유저 · BYPASSRLS 계정이어야 합니다'); }
  return a;
}
const closeAdmin = async (adm, pool) => { if (adm && adm !== pool) await adm.end(); };
module.exports = { adminPool, closeAdmin, NEED };
