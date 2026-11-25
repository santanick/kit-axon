#!/usr/bin/env node
/* 디디쌤 가디언 — 무료 스캐너 결과(Trivy · OSV-Scanner)를 가디언 ingest 형식으로 바꾸고, 기존 SBOM×OSV와 교차합니다.
   사용(저장소 루트):
     node security/ci/to-ingest.js trivy trivy.json [--target 이름] --out trivy.ingest.json [--fail-on critical]
     node security/ci/to-ingest.js osv osv.json --scan scan.json --sbom sbom.cdx.json --out osv.ingest.json [--fail-on critical]
   출력: { kind:'finding', tool, findings:[{ key, origin, title, severity, priority, score, priority_score, evidence, untrusted }], summary, cross }
         → `node service/security/guard.js ingest --in <출력> --kind finding` 또는 POST /api/security/ingest {kind, items: findings}
   실패 기준(--fail-on critical): severity critical(수정 버전 있음) 또는 P0(OSV MAL- 악성 패키지)만 종료 코드 1. 나머지는 보고만.
   결과 속 문자열(요약 · 제목)은 외부 데이터입니다 — 지시로 다루지 않고 길이를 자르고 untrusted로 표시합니다. 네트워크는 쓰지 않습니다. */
'use strict';
const fs = require('fs');

const SEVS = ['critical', 'high', 'medium', 'low'];
const clip = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, n);
const sevOf = s => { const v = String(s || '').toLowerCase(); return SEVS.includes(v) ? v : 'medium'; };
const sevFromScore = n => { const x = Number(n); if (!Number.isFinite(x) || x <= 0) return 'medium'; return x >= 9 ? 'critical' : x >= 7 ? 'high' : x >= 4 ? 'medium' : 'low'; };
/* 가디언 우선순위 규칙: MAL-(악성 패키지)만 즉시 P0. CVSS Critical이라도 KEV · 운영 도달 판정 전에는 P1(가디언 scan이 재판정) */
const priOf = (sev, malicious) => malicious ? 'P0' : ({ critical: 'P1', high: 'P1', medium: 'P2', low: 'P3' })[sev];
const scoreOf = (sev, malicious) => malicious ? 100 : ({ critical: 85, high: 70, medium: 45, low: 20 })[sev];

function item({ tool, id, aliases, pkg, version, purl, location, sev, fixed, title, url, malicious = false }) {
  return {
    key: `${tool}:${id}:${purl || pkg + '@' + version}`, origin: 'scan', source: tool,
    title: clip(`${id} ${pkg}@${version}${title ? ' — ' + title : ''}`, 300), severity: sev, priority: priOf(sev, malicious),
    score: scoreOf(sev, malicious), priority_score: scoreOf(sev, malicious), malicious,
    evidence: { tool, id, aliases: (aliases || []).slice(0, 10).map(a => clip(a, 60)), purl: purl || null, location: clip(location, 200), fixed: fixed ? clip(fixed, 120) : null, url: /^https:\/\//.test(url || '') ? clip(url, 300) : null },
    untrusted: ['title']
  };
}

/* Trivy JSON(image · fs) → findings. Misconfiguration은 IaC 항목(IAC)으로 같이 넣습니다. */
function fromTrivy(doc, { target } = {}) {
  const out = [];
  for (const r of (doc && doc.Results) || []) {
    for (const v of r.Vulnerabilities || []) {
      out.push(item({ tool: 'trivy', id: clip(v.VulnerabilityID, 80), aliases: [v.VulnerabilityID], pkg: clip(v.PkgName, 200), version: clip(v.InstalledVersion, 80),
        purl: v.PkgIdentifier && v.PkgIdentifier.PURL ? clip(v.PkgIdentifier.PURL, 300) : null, location: `${target || doc.ArtifactName || ''} ${r.Target || ''}`.trim(),
        sev: sevOf(v.Severity), fixed: v.FixedVersion, title: v.Title, url: v.PrimaryURL }));
    }
    for (const m of r.Misconfigurations || []) {
      if (m.Status && m.Status !== 'FAIL') continue;
      out.push(item({ tool: 'trivy-config', id: clip(m.ID || m.AVDID, 40), pkg: clip(r.Target, 200), version: String((m.CauseMetadata && m.CauseMetadata.StartLine) || 0),
        location: r.Target, sev: sevOf(m.Severity), fixed: null, title: m.Title, url: m.PrimaryURL }));
    }
  }
  return out;
}

/* OSV-Scanner v2 JSON → findings(그룹 단위: 별칭을 묶어 1건) */
function fromOsv(doc) {
  const out = [];
  for (const res of (doc && doc.results) || []) {
    const loc = res.source && res.source.path ? String(res.source.path).replace(/^.*?(service[^/]*\/)/, '$1') : '';
    for (const p of res.packages || []) {
      const pk = p.package || {}; const vulns = new Map((p.vulnerabilities || []).map(v => [v.id, v]));
      const eco = String(pk.ecosystem || '').toLowerCase(); const name = clip(pk.name, 200); const ver = clip(pk.version, 80);
      const purl = eco === 'maven' ? `pkg:maven/${name.replace(':', '/')}@${ver}` : eco === 'npm' ? `pkg:npm/${name}@${ver}` : null;
      for (const g of p.groups || [{ ids: [...vulns.keys()], aliases: [], max_severity: '' }]) {
        const ids = g.ids || []; const v = vulns.get(ids[0]) || {}; const malicious = ids.some(i => /^MAL-/.test(i));
        const fixed = [...new Set(((v.affected || []).flatMap(a => (a.ranges || []).flatMap(rg => (rg.events || []).map(e => e.fixed).filter(Boolean)))))].join(' | ');
        out.push(item({ tool: 'osv-scanner', id: clip(ids.find(i => /^CVE-/.test(i)) || (g.aliases || []).find(i => /^CVE-/.test(i)) || ids[0], 80), aliases: [...new Set([...(g.aliases || []), ...ids])],
          pkg: name, version: ver, purl, location: loc, sev: malicious ? 'critical' : sevFromScore(g.max_severity), fixed, title: v.summary, url: `https://osv.dev/vulnerability/${encodeURIComponent(ids[0] || '')}`, malicious }));
      }
    }
  }
  return out;
}

/* 교차: OSV-Scanner(전이 의존성 해석) ↔ 가디언 SBOM×OSV(scan.json · sbom.cdx.json) */
function cross(findings, { scan, sbom } = {}) {
  const base = p => String(p || '').split('@')[0].toLowerCase();
  const guardPurls = new Set(((scan && scan.findings) || []).map(f => f.component && base(f.component.purl)).filter(Boolean));
  const sbomPurls = new Set(((sbom && sbom.components) || []).map(c => base(c.purl)).filter(Boolean));
  const pk = [...new Map(findings.filter(f => f.evidence.purl).map(f => [base(f.evidence.purl), f.evidence.purl])).entries()];
  const scannerOnly = pk.filter(([b]) => !guardPurls.has(b));
  return {
    guard_findings: guardPurls.size, scanner_packages: pk.length,
    scanner_only: scannerOnly.map(([, p]) => p).sort(),
    not_in_sbom: sbom ? scannerOnly.filter(([b]) => !sbomPurls.has(b)).map(([, p]) => p).sort() : null,
    note: scannerOnly.length ? 'OSV-Scanner에만 있는 구성요소는 가디언 SBOM이 직접 의존성만 담아 빠진 전이 의존성일 수 있습니다 — 원장에 finding으로 넣고 sbom.js 보완을 검토합니다.' : '차이 없음'
  };
}

const tally = fs_ => { const s = { critical: 0, high: 0, medium: 0, low: 0, P0: 0, P1: 0, P2: 0, P3: 0, total: fs_.length }; for (const f of fs_) { s[f.severity]++; s[f.priority]++; } return s; };
const gateFails = fs_ => fs_.filter(f => f.priority === 'P0' || (f.severity === 'critical' && f.evidence.fixed));

function main(argv) {
  const [kind, file, ...rest] = argv; const val = n => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : null; };
  const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!['trivy', 'osv'].includes(kind) || !file) { console.error('사용법: to-ingest.js trivy|osv <결과.json> [--out f] [--scan scan.json --sbom sbom.cdx.json] [--target 이름] [--fail-on critical]'); return 2; }
  const doc = read(file); const findings = kind === 'trivy' ? fromTrivy(doc, { target: val('target') }) : fromOsv(doc);
  const out = { kind: 'finding', tool: kind === 'trivy' ? 'trivy' : 'osv-scanner', generated_at: new Date().toISOString(), findings, summary: tally(findings) };
  if (kind === 'osv' && (val('scan') || val('sbom'))) out.cross = cross(findings, { scan: val('scan') && fs.existsSync(val('scan')) ? read(val('scan')) : null, sbom: val('sbom') && fs.existsSync(val('sbom')) ? read(val('sbom')) : null });
  if (val('out')) fs.writeFileSync(val('out'), JSON.stringify(out, null, 2) + '\n'); else process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  console.error(`${out.tool}: ${JSON.stringify(out.summary)}${out.cross ? ` · 교차: 스캐너에만 ${out.cross.scanner_only.length}건` + (out.cross.not_in_sbom ? ` (SBOM 미포함 ${out.cross.not_in_sbom.length})` : '') : ''}`);
  if (val('fail-on') === 'critical') { const bad = gateFails(findings); if (bad.length) { console.error(`실패 기준 해당(Critical · 수정 버전 있음 또는 P0) ${bad.length}건:\n` + bad.slice(0, 20).map(f => '  - ' + f.title).join('\n')); return 1; } }
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { fromTrivy, fromOsv, cross, tally, gateFails, sevFromScore, main };
