'use strict';
/* GitHub Advisory — 악성(type=malware) npm 권고. 읽기 한도 보호: 큐의 읽기 버킷(시간당 20)을 통과해야 호출, 403 · 429면 24시간 중단 */
const { fetchOr, untrusted } = require('../util'); const { cvss3, fromLabel } = require('./cvss');
async function collect(opts = {}) {
  const q = opts.queue; let offline = opts.offline || process.env.GUARD_GHSA === '0'; // GUARD_GHSA=0: GitHub 호출 끔(픽스처)
  if (q && !offline) { const ok = q.takeRead('ghsa'); if (!ok.ok) offline = true; }
  const headers = { accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}) };
  const r = await fetchOr(`https://api.github.com/advisories?ecosystem=${opts.ecosystem || 'npm'}&type=${opts.type || 'malware'}&per_page=50`, { ...opts, offline, headers, fixture: 'ghsa.json' });
  if (r.origin === 'blocked' && q) q.halt(`GHSA ${r.status}`);
  const items = (Array.isArray(r.data) ? r.data : []).map(a => ({
    source: 'GHSA', kind: 'vuln', external_id: a.ghsa_id, aliases: [a.ghsa_id, ...(a.cve_id ? [a.cve_id] : [])], cve: a.cve_id || null, malicious: a.type === 'malware',
    cvss: (a.cvss && a.cvss.score) || cvss3(a.cvss && a.cvss.vector_string) || fromLabel(a.severity), title: untrusted(a.summary, 'ghsa'),
    affected: (a.vulnerabilities || []).map(v => ({ ecosystem: v.package && v.package.ecosystem, name: v.package && v.package.name, range: v.vulnerable_version_range })),
    url: a.html_url, published_at: a.published_at, origin: r.origin,
  }));
  return { origin: r.origin, items };
}
module.exports = { collect };
