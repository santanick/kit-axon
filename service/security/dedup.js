'use strict';
/* 중복 제거 — 키 = 대표 별칭(CVE > GHSA > OSV/기타) × purl(버전 제외) × 위치. 같은 purl · 위치에서 별칭이 겹치면 하나로 합친다 */
const { basePurl } = require('./sbom');
const rank = a => (/^CVE-/.test(a) ? 0 : /^GHSA-/.test(a) ? 1 : 2);
const canonical = aliases => [...new Set(aliases)].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1))[0];
const keyOf = (aliases, purl, location) => `${canonical(aliases)}|${purl ? basePurl(purl) : '-'}|${location || '-'}`;

function dedup(findings) {
  const groups = new Map();
  for (const f of findings) { const g = `${f.component ? basePurl(f.component.purl) : '-'}|${f.component ? f.component.location : f.source}`; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f); }
  const out = [];
  for (const list of groups.values()) {
    const merged = [];
    for (const f of list) {
      const m = merged.find(x => x.aliases.some(a => f.aliases.includes(a)));
      if (!m) { merged.push({ ...f, aliases: [...new Set(f.aliases)], sources: [...new Set(f.sources || [f.source])] }); continue; }
      m.aliases = [...new Set([...m.aliases, ...f.aliases])]; m.sources = [...new Set([...m.sources, ...(f.sources || [f.source])])];
      for (const k of ['cvss', 'percentile', 'epss']) if (f[k] != null && (m[k] == null || f[k] > m[k])) m[k] = f[k];
      m.kev = m.kev || f.kev; m.malicious = m.malicious || f.malicious; m.fixed = [...new Set([...(m.fixed || []), ...(f.fixed || [])])];
      if (f.verdict === '해당') m.verdict = '해당';
    }
    for (const m of merged) { m.key = keyOf(m.aliases, m.component && m.component.purl, m.component ? m.component.location : m.source); out.push(m); }
  }
  return out;
}
module.exports = { dedup, keyOf, canonical };
