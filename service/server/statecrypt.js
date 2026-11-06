'use strict';
/* v31.1 기관 문서의 개인정보를 항목 단위로 암호화한다. 저장 직전 seal, 읽은 직후 open.
   값: enc1:v1.{iv}.{tag}.{암호문}(AES-256-GCM, PII_KEY), AAD = {tid}|state|{묶음}|{id}|{항목}. Java: cmm/DdStateCrypto.java */
const crypto = require('node:crypto');
const PFX = 'enc1:';
const SET = { members: ['name', 'nick', 'email', 'phone'], parents: ['name', 'phone'], codes: ['code'] };
const JSON_FIELDS = { members: ['extra'] };
const idOf = (kind, x) => String((kind === 'codes' ? x.sid : x.id) == null ? '' : (kind === 'codes' ? x.sid : x.id));

function createStateCrypto(K, HttpErr) {
  const enc = (v, aad) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', K.enc, iv); c.setAAD(Buffer.from(aad)); const ct = Buffer.concat([c.update(v, 'utf8'), c.final()]); return `${PFX}v1.${iv.toString('base64url')}.${c.getAuthTag().toString('base64url')}.${ct.toString('base64url')}`; };
  const fail = () => new HttpErr(503, '개인정보 암호화 키가 올바르지 않아 데이터를 읽을 수 없습니다.', 'state_key');
  const dec = (s, aad) => { if (!K) throw fail(); try { const [, iv, tag, ct] = s.slice(PFX.length).split('.'); const d = crypto.createDecipheriv('aes-256-gcm', K.enc, Buffer.from(iv, 'base64url')); d.setAAD(Buffer.from(aad)); d.setAuthTag(Buffer.from(tag, 'base64url')); return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'); } catch (e) { throw fail(); } };
  const aadOf = (tid, kind, x, f) => `${tid}|state|${kind}|${idOf(kind, x)}|${f}`;
  const map = (doc, fn) => { if (!doc || typeof doc !== 'object') return doc; const out = { ...doc }; for (const kind of Object.keys(SET)) if (Array.isArray(doc[kind])) out[kind] = doc[kind].map(x => x && typeof x === 'object' && !Array.isArray(x) ? fn(kind, x) : x); return out; };
  const seal = (doc, tid) => { if (!K) return doc; return map(doc, (kind, x) => { const o = { ...x }; for (const f of SET[kind]) if (typeof o[f] === 'string' && o[f] !== '') o[f] = enc(o[f], aadOf(tid, kind, x, f)); for (const f of JSON_FIELDS[kind] || []) if (o[f] && typeof o[f] === 'object') { const j = JSON.stringify(o[f]); if (j !== '{}' && j !== '[]') o[f] = enc(j, aadOf(tid, kind, x, f)); } return o; }); };
  const open = (doc, tid) => map(doc, (kind, x) => { const o = { ...x }; for (const f of SET[kind]) if (typeof o[f] === 'string' && o[f].startsWith(PFX)) o[f] = dec(o[f], aadOf(tid, kind, x, f)); for (const f of JSON_FIELDS[kind] || []) if (typeof o[f] === 'string' && o[f].startsWith(PFX)) o[f] = JSON.parse(dec(o[f], aadOf(tid, kind, x, f))); return o; });
  const memberName = (m, tid) => typeof m.name === 'string' && m.name.startsWith(PFX) ? dec(m.name, aadOf(tid, 'members', m, 'name')) : m.name;
  const unsealed = doc => { for (const kind of Object.keys(SET)) for (const x of Array.isArray(doc && doc[kind]) ? doc[kind] : []) { if (!x || typeof x !== 'object') continue; for (const f of SET[kind]) if (typeof x[f] === 'string' && x[f] !== '' && !x[f].startsWith(PFX)) return true; for (const f of JSON_FIELDS[kind] || []) if (x[f] && typeof x[f] === 'object' && !['{}', '[]'].includes(JSON.stringify(x[f]))) return true; } return false; };
  /* 기존 평문 문서를 한 번에 전환한다. rev는 그대로 둔다 */
  async function sealAll(pool, inTenant) { if (!K) return 0; let n = 0; const { rows } = await pool.query('select id from tenants'); for (const { id } of rows) { const done = await inTenant(pool, id, async c => { const r = (await c.query('select doc from tenant_state where tenant_id = $1 for update', [id])).rows[0]; if (!r || !unsealed(r.doc)) return 0; const s = JSON.stringify(seal(open(r.doc, id), id)); await c.query('update tenant_state set doc = $2, bytes = $3 where tenant_id = $1', [id, s, s.length]); return 1; }); n += done; } return n; }
  return { seal, open, memberName, unsealed, sealAll };
}
module.exports = { createStateCrypto, PFX };
