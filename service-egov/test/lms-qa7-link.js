'use strict';
/* QA7 #1 학습자 ↔ 학사 구성원 자동 연결 대조 테스트(Node · Java 같은 시나리오, 같은 DB)
   - 접근코드 학습자(sid = 학번)와 간편가입 학습자(sid = learner_id → learner_accounts.student_no)가 같은 기관의 학사 학생이면 연결
   - 학사 명단에 없으면 403 person(화면은 안내 카드), 탈퇴 계정 · 다른 기관 계정은 연결하지 않음(교차 테넌트 금지)
   사용: . service-egov/test/env.sh; DATABASE_URL=… node service-egov/test/lms-qa7-link.js http://127.0.0.1:9985 http://127.0.0.1:9986 */
const crypto = require('node:crypto');
const { call, db, setup, setSql, run, STU } = require('./lms-efh-lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:9985', process.argv[3] || ''];
const h = t => crypto.createHash('sha256').update(t).digest('hex');

async function lsess(tid, sid) { const t = crypto.randomBytes(32).toString('base64url'); await db(c => c.query("insert into learner_sessions (id, tenant_id, sid, expires_at) values ($1, $2, $3, now() + interval '2 hour')", [h(t), tid, sid])); return 'dd_lsid=' + t; }
async function acct(tid, stu, status = 'active') { return (await setSql(tid, "insert into learner_accounts (tenant_id, login, nickname, student_no, status) values ($1, 'univ', 'QA7', $2, $3) returning learner_id::text", [tid, stu, status])).rows[0].learner_id; }

async function scenario(base, tag) {
  const R = {}; const S = await setup(base, tag); const O = await setup(base, tag + 'o'); /* O = 다른 기관 */
  const keep = (k, r) => { R[k] = { st: r.st, j: r.j }; return r; };
  const G = (k, p, ck) => call(base, 'GET', p, { cookie: ck }).then(r => keep(k, r));
  /* 간편가입 계정: STU[1] 연결 · 학사에 없는 학번 · 탈퇴 · 다른 기관 계정(같은 학번)을 이 기관 세션에 */
  const la1 = await acct(S.tid, STU[1]); const laNo = await acct(S.tid, '20264444'); const laOut = await acct(S.tid, STU[2], 'withdrawn');
  const laX = await acct(O.tid, STU[3]);
  const C = { code: S.L[STU[0]], noreg: S.L['20268888'], acct: await lsess(S.tid, la1), acctNo: await lsess(S.tid, laNo), acctOut: await lsess(S.tid, laOut), cross: await lsess(S.tid, laX) };
  for (const [k, ck] of Object.entries(C)) { await G('live_' + k, '/api/lms/live/my', ck); await G('secs_' + k, '/api/lms/b/sections', ck); }
  const st = k => (R[k] || {}).st, j = k => (R[k] || {}).j || {};
  const P = [
    [st('live_code') === 200 && j('live_code').member_no === STU[0], '접근코드 학습자 실시간 수업 200'],
    [st('secs_code') === 200 && (j('secs_code').sections || []).length === 1, '접근코드 학습자 분반 1개'],
    [st('live_acct') === 200 && j('live_acct').member_no === STU[1], '간편가입 학습자 → 같은 학번 학사 학생 자동 연결'],
    [st('secs_acct') === 200 && (j('secs_acct').sections || []).length === 1, '간편가입 학습자 분반 1개'],
    [st('live_noreg') === 403 && j('live_noreg').error === 'person', '학사 명단에 없는 학번 403 person(실시간)'],
    [st('secs_noreg') === 403 && j('secs_noreg').error === 'person', '학사 명단에 없는 학번 403 person(분반)'],
    [st('live_acctNo') === 403 && st('secs_acctNo') === 403 && j('secs_acctNo').error === 'person', '간편가입 · 명단 없음 403 person'],
    [st('live_acctOut') === 403 && st('secs_acctOut') === 403, '탈퇴 계정은 연결하지 않음'],
    [st('live_cross') === 403 && st('secs_cross') === 403, '다른 기관 계정은 연결하지 않음(교차 테넌트 금지)']
  ];
  return { R, P };
}
run('lms-qa7-link', scenario, A, B).catch(e => { console.error(e); process.exit(2); });
