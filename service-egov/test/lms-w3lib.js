'use strict';
/* v30 묶음 G · I · J 대조 테스트 공용 — 호출 · 가입 · 정규화 · Node/Java 비교 · SQL 동일성(Node mod-*.js ↔ Java lms_*.xml) */
const fs = require('node:fs');
const path = require('node:path');
const caller = base => async (method, p, { body, cookie, csrf = true, raw } = {}) => {
  const h = {}; if (csrf && method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (body !== undefined || raw !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(base + p, { method, headers: h, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { st: r.status, j };
};
async function signup(base, tag) {
  const r = await fetch(base + '/api/signup', { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: `w3${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`, password: 'LmsW3test2026x', orgName: '대조 국립대', type: 'univ' }) });
  const sc = r.headers.get('set-cookie'); if (r.status !== 200 || !sc) throw new Error('가입 실패 ' + r.status + ' ' + await r.text()); return sc.split(';')[0];
}
const UU = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
function norm(v, k) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(x => norm(x, k));
  if (typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(x => [x, norm(v[x], x)]));
  if (typeof v === 'string') {
    if (k === 'code' && /^\d{6}$/.test(v)) return '<code>';
    if (k === 'qr') return '<qr>';
    return v.replace(UU, '<uuid>').replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<ts>').replace(/[\w.+-]+@example\.com/g, '<email>');
  }
  return v;
}
function sqlParity(bundle, ok) {
  const mod = require(path.join(__dirname, `../../service/server/lms/mod-${bundle}.js`));
  const xmlF = path.join(__dirname, `../src/main/resources/egovframework/mapper/lms_${bundle}.xml`);
  if (!fs.existsSync(xmlF)) { ok(false, `매퍼 없음 ${xmlF}`); return; }
  const xml = fs.readFileSync(xmlF, 'utf8'); const got = {};
  xml.replace(/<(select|insert|update|delete) id="(\w+)"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/\1>/g, (m, t, id, s) => { got[id] = s.replace(/#\{(\w+),jdbcType=VARCHAR\}/g, '#{$1}'); });
  for (const [k, s] of Object.entries(mod.SQL)) ok(got[k] === s, `SQL 불일치 ${bundle}.${k}`);
  ok(Object.keys(got).length === Object.keys(mod.SQL).length, `SQL 수 ${bundle}: xml ${Object.keys(got).length} / node ${Object.keys(mod.SQL).length}`);
  /* 경로 목록: Java 컨트롤러 소스에 같은 경로가 있어야 한다 */
  const dir = path.join(__dirname, `../src/main/java/egovframework/didisam/lms/${bundle}/web`);
  const src = fs.existsSync(dir) ? fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') : '';
  for (const r of mod.SPEC) ok(src.includes(`"${r.p}"`), `Java 경로 없음 ${r.m} ${r.p}`);
}
async function run({ name, A, B, scenario, EXPECT, checks, bundle }) {
  let pass = 0, fail = 0; const errs = []; const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
  sqlParity(bundle, ok);
  const RA = await scenario(A, 'n');
  for (const [k, st] of Object.entries(EXPECT)) ok(RA[k] && RA[k].st === st, `[Node] ${k}: ${st} 기대, ${RA[k] && RA[k].st} ${JSON.stringify(RA[k] && RA[k].j).slice(0, 200)}`);
  checks(RA, (c, m) => ok(c, '[Node] ' + m));
  if (B) {
    const RB = await scenario(B, 'j');
    checks(RB, (c, m) => ok(c, '[Java] ' + m));
    for (const k of Object.keys(RA)) {
      const a = JSON.stringify(norm(RA[k].j)), b = JSON.stringify(norm(RB[k] && RB[k].j));
      ok(RA[k].st === (RB[k] && RB[k].st), `상태 ${k}: Node ${RA[k].st} / Java ${RB[k] && RB[k].st}`);
      ok(a === b, `본문 ${k}:\n  N ${a.slice(0, 400)}\n  J ${b.slice(0, 400)}`);
    }
  }
  console.log(`lms-${bundle} 대조: ${pass} 통과 / ${fail} 실패 (검사 ${pass + fail})`); errs.slice(0, 40).forEach(e => console.log(' ✗ ' + e));
  process.exit(fail ? 1 : 0);
}
module.exports = { caller, signup, norm, run };
