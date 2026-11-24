'use strict';
/* NVD API 2.0 — lastModStartDate 증분(기본 48시간, 2시간 주기). API 키(NVD_API_KEY)는 선택. 판정은 OSV가 하고 여기선 키워드 1차 */
const { fetchOr, untrusted } = require('../util');
async function collect(opts = {}) {
  const end = opts.now || new Date(); const start = opts.since || new Date(end.getTime() - 48 * 3600e3);
  const iso = d => encodeURIComponent(d.toISOString()); // '+00:00'을 쓰면 '+'가 공백으로 바뀌어 404 — Z 형식 사용
  const q = `lastModStartDate=${iso(start)}&lastModEndDate=${iso(end)}&resultsPerPage=${opts.perPage || 200}`;
  const headers = process.env.NVD_API_KEY ? { apiKey: process.env.NVD_API_KEY } : {};
  const r = await fetchOr('https://services.nvd.nist.gov/rest/json/cves/2.0?' + q, { ...opts, headers, fixture: 'nvd.json', timeoutMs: 30000 });
  const items = ((r.data && r.data.vulnerabilities) || []).map(({ cve }) => {
    const m = cve.metrics || {}; const mm = (m.cvssMetricV31 || m.cvssMetricV30 || m.cvssMetricV40 || [])[0];
    const cpes = (cve.configurations || []).flatMap(c => c.nodes || []).flatMap(n => n.cpeMatch || []).map(x => x.criteria);
    return { source: 'NVD', kind: 'vuln', external_id: cve.id, aliases: [cve.id], cve: cve.id, cvss: mm ? mm.cvssData.baseScore : null, title: untrusted(((cve.descriptions || []).find(d => d.lang === 'en') || {}).value || cve.id, 'nvd'), keywords: cpes.map(c => c.split(':').slice(3, 5).join(' ')), cpes, url: `https://nvd.nist.gov/vuln/detail/${cve.id}`, published_at: cve.published, modified_at: cve.lastModified, origin: r.origin };
  });
  return { origin: r.origin, items };
}
module.exports = { collect };
