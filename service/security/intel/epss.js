'use strict';
/* FIRST EPSS — 매칭된 CVE에만 부착(쉼표 일괄, 100개씩). percentile 0~1 */
const { fetchOr } = require('../util');
async function lookup(cves, opts = {}) {
  const out = {}; let origin = 'live'; const list = [...new Set(cves.filter(c => /^CVE-\d{4}-\d+$/.test(c)))];
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const r = await fetchOr('https://api.first.org/data/v1/epss?cve=' + chunk.join(','), { ...opts, fixture: 'epss.json' });
    if (r.origin !== 'live') origin = r.origin;
    for (const d of (r.data && r.data.data) || []) if (chunk.includes(d.cve)) out[d.cve] = { epss: Number(d.epss), percentile: Number(d.percentile) };
  }
  return { origin, map: out };
}
module.exports = { lookup };
