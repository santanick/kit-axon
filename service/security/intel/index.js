'use strict';
/* 인텔 일괄 수집 — 소스별 실패는 그 소스만 'fixture'/'blocked'로 표시하고 계속 진행.
   플랫폼 · 런타임 소스(intel/platform.js 10종 + OSV 감시 목록)는 opts.platform === false면 생략. 변경 감지형은 seen 대비 new 표시.
   AI · 규제 소스(ATLAS · OWASP · AI-BLOG)는 '통제점검형' — opts.seen({소스: [id]})으로 새 항목(new)을 표시한다. opts.ai === false면 생략 */
const nvd = require('./nvd'), kev = require('./kev'), osv = require('./osv'), epss = require('./epss'), ghsa = require('./ghsa'), kisa = require('./kisa');
const atlas = require('./atlas'), owasp = require('./owasp'), vendor = require('./vendor'), platform = require('./platform');
async function collectAll(opts = {}) {
  const src = {}; const items = [];
  const mods = [['NVD', nvd], ['KEV', kev], ['GHSA', ghsa], ['KISA', kisa], ...(opts.platform === false ? [] : [...platform.MODS, ['OSV-WATCH', { collect: o => osv.watch(o) }]]), ...(opts.ai === false ? [] : [['ATLAS', atlas], ['OWASP', owasp], ['AI-BLOG', vendor]])];
  for (const [name, mod] of mods) {
    try {
      const r = await mod.collect(opts); src[name] = { origin: r.origin, count: r.items.length }; items.push(...r.items);
      if (name === 'KEV') src.KEV.set = r.set;
      if (r.items.some(i => 'new' in i)) src[name].new = r.items.filter(i => i.new).length;
      if (name === 'ATLAS') { src.ATLAS.release = r.release; src.ATLAS.catalog = r.catalog; }
    } catch (e) { src[name] = { origin: 'error', error: String(e.message).slice(0, 200) }; }
  }
  return { sources: src, items };
}
module.exports = { collectAll, nvd, kev, osv, epss, ghsa, kisa, atlas, owasp, vendor, platform };
