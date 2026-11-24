'use strict';
/* 인텔 일괄 수집 — 소스별 실패는 그 소스만 'fixture'/'blocked'로 표시하고 계속 진행 */
const nvd = require('./nvd'), kev = require('./kev'), osv = require('./osv'), epss = require('./epss'), ghsa = require('./ghsa'), kisa = require('./kisa');
async function collectAll(opts = {}) {
  const src = {}; const items = [];
  for (const [name, mod] of [['NVD', nvd], ['KEV', kev], ['GHSA', ghsa], ['KISA', kisa]]) {
    try { const r = await mod.collect(opts); src[name] = { origin: r.origin, count: r.items.length }; items.push(...r.items); if (name === 'KEV') src.KEV.set = r.set; }
    catch (e) { src[name] = { origin: 'error', error: String(e.message).slice(0, 200) }; }
  }
  return { sources: src, items };
}
module.exports = { collectAll, nvd, kev, osv, epss, ghsa, kisa };
