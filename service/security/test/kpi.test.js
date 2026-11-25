'use strict';
/* 가디언 5차 g2 — 운영 지표(MTTD · MTTR · 고위험 SLA 초과 · 자동 PR 채택률 · 오탐률)와 보안 홈 종합 점수(①DB + ②③ 스냅숏)
   사용: DATABASE_URL=postgres://…/kit_sec5_g2 node --test service/security/test/kpi.test.js
   시험 DB 전용: security.finding · threat_item · fix_pr를 비운다(DB 이름에 kit_ 또는 test가 없으면 DB 시험은 건너뜀) */
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const K = require('../kpi');

test('scoreOf: security/score.js total()과 같은 식', () => {
  const p = { P0: 0, P1: 0, P2: 3, P3: 5 };
  assert.deepEqual(K.scoreOf(p, null), { score: 86, parts: { vuln: 86, checklist: null, cert: null, source: 'vuln_only', at: null } });
  const S = require('../../../security/score.js'); const snap = { checklist: 93.3, cert: 88.9, at: 'x' };
  assert.equal(K.scoreOf(p, snap).score, S.total({ score: 86 }, { score: 93.3 }, { score: 88.9 }));
  assert.equal(K.scoreOf(p, snap).score, 89); assert.equal(K.scoreOf(p, { checklist: 93.3, cert: null }).score, 90, '③ 없으면 ÷ 2');
  assert.equal(K.scoreOf({ P0: 5, P1: 0, P2: 0, P3: 0 }, snap).score, Math.round((0 + 93 + 89) / 3), '① 0 미만은 0');
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'g2k-')), 's.json'); fs.writeFileSync(f, '{"checklist":93.3,"cert":88.9}');
  assert.equal(K.readSnapshot(f).cert, 88.9); assert.equal(K.readSnapshot(f + 'x'), null); assert.equal(K.readSnapshot(''), null);
});

const DB = process.env.DATABASE_URL || '';
test('KPI SQL · /api/security/summary kpi · score', { skip: !/kit_|test/.test(DB) && 'DATABASE_URL(시험 DB) 없음' }, async t => {
  const { poolFrom, migrate } = require('../../server/db'); const { createApp } = require('../../server/app');
  const pool = poolFrom(process.env); await migrate(pool);
  await pool.query('delete from security.approval'); await pool.query('delete from security.approve_link'); await pool.query('delete from security.fix_pr'); await pool.query('delete from security.finding'); await pool.query('delete from security.countermeasure'); await pool.query('delete from security.threat_item');
  const e0 = await K.kpi(pool); assert.deepEqual(Object.keys(e0), K.KEYS);
  assert.deepEqual(e0, { mttdH: null, mttrH: null, slaOverHigh: 0, prCreated: 0, prMerged: 0, prAdoption: null, findings: 0, falsePositive: 0, falsePositiveRate: null });
  const q = (s, a) => pool.query(s, a);
  await q("insert into security.threat_item (id, source, external_id, published_at) values ('t1','NVD','CVE-1', now() - interval '6 hours'), ('t2','NVD','CVE-2', now() - interval '2 hours'), ('t3','NVD','CVE-3', now() + interval '1 hour')");
  await q(`insert into security.finding (id, key, title, severity, priority, status, threat_id, created_at, sla_due_at, resolved_at) values
    ('f1','k1','a','critical','P0','open','t1', now(), now() - interval '1 hour', null),
    ('f2','k2','b','high','P1','fixed','t2', now() - interval '10 hours', now() + interval '1 day', now() - interval '4 hours'),
    ('f3','k3','c','medium','P2','false_positive', null, now(), now() - interval '1 hour', now()),
    ('f4','k4','d','low','P3','open','t3', now(), now() - interval '1 hour', null)`);
  /* f1: 6h 후 탐지 · f2: 공개 2h 전 생성(음수 → 제외) · f4: 공개 전(음수 → 제외) → MTTD 6.0 / MTTR f2 6.0 / SLA 초과 고위험 f1만 */
  await q("insert into security.fix_pr (id, title, severity, status) values ('p1','x','high','merged'), ('p2','y','high','open'), ('p3','z','low','rejected')");
  const k = await K.kpi(pool);
  assert.deepEqual(k, { mttdH: 6, mttrH: 6, slaOverHigh: 1, prCreated: 3, prMerged: 1, prAdoption: 0.333, findings: 4, falsePositive: 1, falsePositiveRate: 0.25 });

  const snapF = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'g2s-')), 'score.json'); fs.writeFileSync(snapF, JSON.stringify({ checklist: 93.3, cert: 88.9, at: '2026-11-25T00:00:00Z' }));
  const sfx = Date.now().toString(36); const Z = `sk${sfx}@santa.kr`;
  const env = { COOKIE_SECURE: '0', SIGNUP_CODE: 'C0DE', SANTA_ADMIN_EMAILS: Z, GUARD_TOKEN: 'g'.repeat(40), MFA_OFF: '1' };
  const a = createApp({ pool, env: { ...env, SECURITY_SCORE_FILE: snapF }, log: {} }); const b = createApp({ pool, env, log: {} });
  await Promise.all([a, b].map(s => new Promise(ok => s.listen(0, '127.0.0.1', ok))));
  t.after(async () => { a.close(); b.close(); await pool.end(); });
  let cookie = ''; const call = async (srv, m, p, body) => { const r = await fetch(`http://127.0.0.1:${srv.address().port}${p}`, { method: m, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); const c = r.headers.get('set-cookie'); if (c) cookie = c.split(';')[0]; return { st: r.status, j: await r.json().catch(() => ({})) }; };
  assert.equal((await call(a, 'POST', '/api/signup', { email: Z, password: 'Passw0rd-zzz', orgName: 'Z' + sfx, type: 'univ', code: 'C0DE' })).st, 200);
  const s1 = await call(a, 'GET', '/api/security/summary'); assert.equal(s1.st, 200);
  assert.deepEqual(s1.j.kpi, k, 'summary.kpi = KPI SQL');
  /* 미해결 P0 1 · P3 1 → ① 100 − 26 = 74, 종합 round((74 + 93 + 89) / 3) = 85 */
  assert.equal(s1.j.score, 85); assert.deepEqual(s1.j.scoreParts, { vuln: 74, checklist: 93.3, cert: 88.9, source: 'snapshot', at: '2026-11-25T00:00:00Z' });
  const s2 = await call(b, 'GET', '/api/security/summary'); assert.equal(s2.j.score, 74); assert.equal(s2.j.scoreParts.source, 'vuln_only');
  await pool.query('delete from security.fix_pr'); await pool.query('delete from security.finding'); await pool.query('delete from security.threat_item');
});
