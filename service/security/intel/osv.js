'use strict';
/* OSV.dev — querybatch(purl 일괄, 1,000개씩) → 취약점 상세(/v1/vulns/{id}). MAL- 접두는 악성 패키지(즉시 P0).
   오프라인 · 실패 시: fixtures/osv-querybatch.json({purl:[id]}) + fixtures/osv-vulns/<id>.json */
const fs = require('node:fs'); const path = require('node:path');
const { fetchOr, untrusted, FIX } = require('../util'); const { cvss3, fromLabel } = require('./cvss'); const { basePurl } = require('../sbom');
const API = 'https://api.osv.dev/v1';

async function querybatch(purls, opts = {}) {
  const map = {}; let origin = 'live';
  for (let i = 0; i < purls.length; i += 1000) {
    const chunk = purls.slice(i, i + 1000);
    const r = await fetchOr(API + '/querybatch', { ...opts, method: 'POST', body: { queries: chunk.map(purl => ({ package: { purl } })) } });
    if (r.origin === 'live') chunk.forEach((p, j) => { const v = (r.data.results[j] || {}).vulns || []; if (v.length) map[p] = v.map(x => x.id); });
    else {
      origin = r.origin === 'blocked' ? 'blocked' : 'fixture';
      const fx = JSON.parse(fs.readFileSync(path.join(FIX, 'osv-querybatch.json'), 'utf8'));
      for (const p of chunk) if (fx[p]) map[p] = fx[p];
    }
  }
  return { origin, map };
}

function normalize(v, origin) {
  const vec = (v.severity || []).map(s => s.score).find(s => /^CVSS:3/.test(s));
  const cvss = cvss3(vec) ?? fromLabel(v.database_specific && v.database_specific.severity) ?? (v.id.startsWith('MAL-') ? 10 : null);
  const aliases = [v.id, ...(v.aliases || [])];
  return {
    source: 'OSV', kind: 'vuln', external_id: v.id, aliases, cve: aliases.find(a => /^CVE-/.test(a)) || null,
    title: untrusted(v.summary || v.id, 'osv'), summary: untrusted((v.details || '').slice(0, 800), 'osv'),
    cvss, cvss_vector: vec || null, malicious: v.id.startsWith('MAL-'),
    affected: (v.affected || []).map(a => ({ ecosystem: (a.package || {}).ecosystem, name: (a.package || {}).name, purl: a.package && a.package.purl ? basePurl(a.package.purl) : null, ranges: a.ranges || [], versions: a.versions || [] })),
    fixed: [...new Set((v.affected || []).flatMap(a => (a.ranges || []).flatMap(r => r.events.filter(e => e.fixed).map(e => e.fixed))))],
    url: `https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`, published_at: v.published || null, modified_at: v.modified || null, origin,
  };
}

async function vuln(id, opts = {}) {
  const r = await fetchOr(`${API}/vulns/${encodeURIComponent(id)}`, { ...opts, fixture: fs.existsSync(path.join(FIX, 'osv-vulns', id + '.json')) ? `osv-vulns/${id}.json` : null });
  return r.data ? normalize(r.data, r.origin) : null;
}

/* purl 목록 → { origin, items:[ThreatItem], hits:{purl:[id]} } (상세 조회는 최대 opts.maxDetails건) */
async function scan(purls, opts = {}) {
  const q = await querybatch(purls, opts);
  const ids = [...new Set(Object.values(q.map).flat())].slice(0, opts.maxDetails || 200);
  const items = []; for (const id of ids) { const it = await vuln(id, q.origin === 'live' ? opts : { ...opts, offline: true }); if (it) items.push(it); }
  return { origin: q.origin, items, hits: q.map };
}
/* 감시 목록(버전 무관, 패키지 이름 단위) — Next.js 권고 · MCP SDK · 스킬 생태계 악성 패키지(MAL-) 경보. /v1/query는 키 없이 무료.
   최근 opts.days(기본 30)일 안에 수정된 항목만. 오프라인 · 실패 시 fixtures/osv-watch.json({"<생태계>:<이름>": {vulns:[…]}}) */
const WATCH = [['npm', 'next'], ['npm', '@modelcontextprotocol/sdk'], ['PyPI', 'mcp']];
async function watch(opts = {}) {
  const since = new Date(opts.now || Date.now()).getTime() - (opts.days || 30) * 86400e3; const items = []; const origins = new Set(); let fx = null;
  for (const [ecosystem, name] of opts.watch || WATCH) {
    const r = await fetchOr(API + '/query', { ...opts, method: 'POST', body: { package: { name, ecosystem } } });
    let vulns; if (r.origin === 'live') vulns = r.data.vulns || []; else { fx = fx || JSON.parse(fs.readFileSync(path.join(FIX, 'osv-watch.json'), 'utf8')); vulns = ((fx[`${ecosystem}:${name}`] || {}).vulns) || []; }
    origins.add(r.origin === 'live' ? 'live' : r.origin === 'blocked' ? 'blocked' : 'fixture');
    for (const v of vulns) { if (!(new Date(v.modified || v.published || 0).getTime() >= since)) continue; const it = normalize(v, r.origin === 'live' ? 'live' : 'fixture'); it.source = 'OSV-WATCH'; it.watch = `${ecosystem}:${name}`; it.keywords = [name]; it.malAlert = it.malicious; it.malicious = false; /* 사용 중 패키지가 아니면 강제 P0 아님 — 경보만(실제 사용 판정은 scan의 querybatch) */ items.push(it); }
  }
  const o = [...origins]; return { origin: o.length === 1 ? o[0] : o.join(','), items };
}
module.exports = { querybatch, vuln, scan, normalize, watch, WATCH };
