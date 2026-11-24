'use strict';
/* CISA KEV — 실제 악용 확인 목록(일 1회). SBOM CVE와 교집합이면 P0 후보 */
const { fetchOr, untrusted } = require('../util');
const URL_ = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
async function collect(opts = {}) {
  const r = await fetchOr(URL_, { ...opts, fixture: 'kev.json', timeoutMs: 30000 });
  const list = (r.data && r.data.vulnerabilities) || [];
  const set = new Map(list.map(v => [v.cveID, v]));
  const items = list.slice(0, opts.limit || Infinity).map(v => ({ source: 'KEV', kind: 'vuln', external_id: v.cveID, aliases: [v.cveID], cve: v.cveID, kev: true, title: untrusted(`${v.vendorProject} ${v.product}: ${v.vulnerabilityName}`, 'kev'), summary: untrusted(v.shortDescription, 'kev'), keywords: [v.vendorProject, v.product], matchFields: ['keywords'], url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`, published_at: v.dateAdded, origin: r.origin }));
  return { origin: r.origin, set, items };
}
module.exports = { collect };
