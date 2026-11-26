'use strict';
/* 디디쌤 Ver2 통합 센터(기관 묶음 · 통합 모니터링) 서버 모듈 — F/grp/spec.md 1 · 2절, 계약 group/contract.json. market/과 같은 구조.
   - sql/NN_*.sql : db.js가 lms_schema에 'group/<파일>'로 기록.
   - 경로 /api/group/* : routes.js, 집계(소속 기관 범위에서 숫자만 → 집계 표) : snap.js, 계산 · 가림 : kpi.js(순수 함수).
   - DB: SET LOCAL ROLE didisam_group(기관 표 권한 없음) + app.tenant · app.grp · app.santa. 기관 원본은 inTenant(소속 기관)로만 읽는다(한 트랜잭션에 두 기관 없음).
   - 시범 플래그: grp_group.pilot(산타가 켬). 꺼진 기관 · 묶음 없는 기관의 화면 · 응답은 지금과 같다. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { AsyncLocalStorage } = require('node:async_hooks');
const K = require('./kpi');
const C = require('./contract.json');
const als = new AsyncLocalStorage();
const SQL = path.join(__dirname, 'sql');

function sqlMigrations() {
  if (!fs.existsSync(SQL)) return [];
  return fs.readdirSync(SQL).filter(f => /^\d\d_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => ['group/' + f, fs.readFileSync(path.join(SQL, f), 'utf8')]);
}
const MSG = Object.fromEntries(Object.entries(C.errors).map(([k, [, m]]) => [k, m]));
const ST = Object.fromEntries(Object.entries(C.errors).map(([k, [s]]) => [k, s]));
const AZ = 'abcdefghijklmnopqrstuvwxyz0123456789';
const rid = p => p + Array.from(crypto.randomBytes(12), b => AZ[b % 36]).join('');
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const kstDay = t => new Date((t ? new Date(t).getTime() : Date.now()) + 9 * 3600e3).toISOString().slice(0, 10);
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function createGroup(ctx) {
  const { pool, inTenant, HttpErr, audit, env = process.env } = ctx;
  const E = (code, extra, message) => { const e = new HttpErr(ST[code] || (code === 'idem' ? 400 : 400), message || MSG[code] || '요청을 처리할 수 없습니다.', code); if (extra) e.extra = extra; return e; };
  /* 통합 센터 트랜잭션(마켓 txIn과 같은 모양). 범위가 비면 아무 행도 보이지 않는다 */
  async function txIn(scope, fn) {
    const c = await pool.connect(); const s = scope || {};
    try { await c.query('begin'); await c.query('set local role didisam_group');
      await c.query("select set_config('app.tenant', $1, true), set_config('app.grp', $2, true), set_config('app.santa', $3, true)", [String(s.tid || ''), String(s.gid || ''), s.santa ? '1' : '0']);
      const r = await fn(c); await c.query('commit'); return r; }
    catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  }
  const tx = fn => txIn(als.getStore(), fn);
  const scopeSet = (tid, gid, santa) => { const st = als.getStore(); if (st) { st.tid = tid; st.gid = gid || ''; st.santa = !!santa; } };
  const q1 = async (c, sql, a) => (await c.query(sql, a)).rows[0];
  /* 멱등(grp_idem): 같은 (기관, 경로, idem)이면 첫 응답 + again */
  async function idem(c, tid, route, key, fn) {
    if (!key || typeof key !== 'string') throw E('idem');
    const k = str(key, 80); const ex = await q1(c, 'select resp from grp_idem where tid = $1 and route = $2 and key = $3', [tid, route, k]); if (ex) return { ...ex.resp, again: true };
    const out = await fn(); await c.query('insert into grp_idem (tid, route, key, resp) values ($1,$2,$3,$4)', [tid, route, k, JSON.stringify(out)]); return out;
  }
  /* 감사(grp_audit, 해시 체인은 DB 트리거). 학번 원문은 넣지 않는다 */
  const gaudit = (c, row) => c.query('insert into grp_audit (group_id, actor, actor_tid, action, child_tid, target, purpose, fields, ok, ip_hash) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [row.gid, row.actor, row.actorTid, row.action, row.childTid || null, str(row.target, 120) || null, str(row.purpose, 200) || null, row.fields || null, row.ok !== false, row.ip ? sha('grp|' + row.ip).slice(0, 16) : null]);
  /* 기관 감사(audit_log) — 소속 기관에도 남긴다 */
  const tlog = (tid, actor, action, detail) => inTenant(pool, tid, c => audit(c, tid, actor, action, detail)).catch(() => {});
  /* 기관 문서 읽기 · 고치기(소속 · 상위 기관 자기 범위). 반환값만 밖으로 */
  const docOf = tid => inTenant(pool, tid, async c => { const r = (await c.query('select doc from tenant_state where tenant_id = $1', [tid])).rows[0]; return (r && r.doc) || {}; });
  const docEdit = (tid, fn) => inTenant(pool, tid, async c => { const r = (await c.query('select doc from tenant_state where tenant_id = $1 for update', [tid])).rows[0]; if (!r) return null; const doc = r.doc || {};
    const out = fn(doc); const t = JSON.stringify(doc); await c.query('update tenant_state set doc = $2, rev = rev + 1, bytes = $3, updated_at = now() where tenant_id = $1', [tid, t, Buffer.byteLength(t)]); return out; });
  const tenantName = async tid => { const r = (await pool.query('select name, type from tenants where id = $1', [tid])).rows[0]; return r || { name: '', type: '' }; };
  const gkey = (salt, no) => crypto.createHmac('sha256', salt).update(String(no).replace(/\D/g, '')).digest('hex').slice(0, 32);
  const shared = { E, MSG, K, C, rid, str, kstDay, sha, tx, txIn, als, scopeSet, q1, idem, gaudit, tlog, docOf, docEdit, tenantName, gkey };
  shared.snap = require('./snap')(ctx, shared);
  const R = require('./routes')(ctx, shared);
  return {
    match: (method, p) => { const fn = R.match(method, p); return fn && ((req, res) => als.run({}, () => fn(req, res))); },
    tick: () => shared.snap.tick(),
    MSG
  };
}
module.exports = { sqlMigrations, createGroup, MSG };
