'use strict';
/* SBOM — package-lock.json(v2/v3) · pom.xml → 구성요소 목록(purl) + CycloneDX 1.5 JSON
   exposure: 운영 런타임 'prod' · 개발 전용 'dev'(npm dev · maven test). 버전이 BOM 관리라 pom에 없으면 version=null(판정은 '일부'). */
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');

const enc = s => encodeURIComponent(s).replace(/%2F/g, '/');
function npmPurl(name, version) {
  const n = name.startsWith('@') ? '%40' + enc(name.slice(1)) : enc(name);
  return `pkg:npm/${n}${version ? '@' + version : ''}`;
}
const mavenPurl = (g, a, v) => `pkg:maven/${g}/${a}${v ? '@' + v : ''}`;
const basePurl = p => p.replace(/@[^@/]*$/, '');

function parseNpmLock(json, location) {
  const out = [];
  const pk = json.packages || {};
  for (const [k, v] of Object.entries(pk)) {
    if (!k || v.link) continue;
    const name = v.name || k.slice(k.lastIndexOf('node_modules/') + 13);
    if (!name || !v.version) continue;
    out.push({ ecosystem: 'npm', name, version: v.version, purl: npmPurl(name, v.version), exposure: v.dev ? 'dev' : 'prod', location, direct: !k.slice(13).includes('node_modules/') });
  }
  if (!out.length && json.dependencies) { // lockfile v1
    const walk = (deps, direct) => { for (const [name, v] of Object.entries(deps || {})) { out.push({ ecosystem: 'npm', name, version: v.version, purl: npmPurl(name, v.version), exposure: v.dev ? 'dev' : 'prod', location, direct }); walk(v.dependencies, false); } };
    walk(json.dependencies, true);
  }
  return out;
}

const tag = (x, t) => { const m = x.match(new RegExp(`<${t}>\\s*([^<]*?)\\s*</${t}>`)); return m ? m[1] : null; };
function parsePom(xml, location) {
  const src = xml.replace(/<!--[\s\S]*?-->/g, '');
  const props = {};
  for (const block of src.match(/<properties>[\s\S]*?<\/properties>/g) || []) for (const m of block.matchAll(/<([\w.-]+)>([^<]*)<\/\1>/g)) if (!(m[1] in props)) props[m[1]] = m[2].trim();
  const sub = s => (s ? s.replace(/\$\{([^}]+)\}/g, (_, k) => props[k] ?? `\${${k}}`) : s);
  const out = [];
  const parent = (src.match(/<parent>([\s\S]*?)<\/parent>/) || [])[1];
  let parentInfo = null;
  if (parent) {
    parentInfo = { g: tag(parent, 'groupId'), a: tag(parent, 'artifactId'), v: tag(parent, 'version') };
    out.push({ ecosystem: 'maven', name: `${parentInfo.g}:${parentInfo.a}`, version: parentInfo.v, purl: mavenPurl(parentInfo.g, parentInfo.a, parentInfo.v), exposure: 'prod', location, direct: true, role: 'parent' });
  }
  const noMgmt = src.replace(/<dependencyManagement>[\s\S]*?<\/dependencyManagement>/g, '').replace(/<plugins>[\s\S]*?<\/plugins>/g, '');
  for (const m of noMgmt.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
    const d = m[1].replace(/<exclusions>[\s\S]*?<\/exclusions>/g, '');
    const g = sub(tag(d, 'groupId')); const a = sub(tag(d, 'artifactId')); let v = sub(tag(d, 'version')); const scope = tag(d, 'scope') || 'compile';
    let managed = false;
    if (!v) { managed = true; if (parentInfo && parentInfo.g === 'org.springframework.boot' && g === 'org.springframework.boot') v = parentInfo.v; else v = null; }
    if (v && v.includes('${')) v = null;
    const profile = /<profile>[\s\S]*$/.test(noMgmt.slice(0, m.index)) && !/<\/profiles>/.test(noMgmt.slice(noMgmt.lastIndexOf('<profile>', m.index), m.index)) ? true : undefined;
    out.push({ ecosystem: 'maven', name: `${g}:${a}`, version: v, purl: mavenPurl(g, a, v), exposure: scope === 'test' ? 'dev' : 'prod', location, direct: true, scope, ...(managed ? { managed: true } : {}), ...(profile ? { profile: true } : {}) });
  }
  return out;
}

/* 저장소 기본 대상: Node 서버 lock + 전자정부 Java pom. 다른 파일은 opts.files로 추가 */
const DEFAULT_FILES = ['service/server/package-lock.json', 'service-egov/pom.xml'];
function collectComponents(root, files = DEFAULT_FILES) {
  const comps = [];
  for (const rel of files) {
    const f = path.join(root, rel); if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, 'utf8');
    if (rel.endsWith('.json')) comps.push(...parseNpmLock(JSON.parse(raw), rel)); else if (rel.endsWith('.xml')) comps.push(...parsePom(raw, rel));
  }
  const seen = new Set(); return comps.filter(c => { const k = c.purl + '|' + c.location; if (seen.has(k)) return false; seen.add(k); return true; });
}

function toCycloneDX(components, { name = 'didisam-v2', version = '0', now = new Date() } = {}) {
  return {
    bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: 'urn:uuid:' + crypto.randomUUID(), version: 1,
    metadata: { timestamp: now.toISOString(), tools: { components: [{ type: 'application', name: 'didisam-guardian', version: '0.1' }] }, component: { type: 'application', name, version } },
    components: components.map(c => ({
      type: 'library', name: c.name, ...(c.version ? { version: c.version } : {}), purl: c.purl, 'bom-ref': c.purl + '#' + c.location,
      scope: c.exposure === 'dev' ? 'optional' : 'required',
      properties: [{ name: 'didisam:location', value: c.location }, { name: 'didisam:exposure', value: c.exposure }, ...(c.managed ? [{ name: 'didisam:version', value: c.version ? 'parent-bom' : 'unresolved' }] : [])],
    })),
  };
}

function buildSbom(root, opts = {}) { const components = collectComponents(root, opts.files); return { components, purls: [...new Set(components.filter(c => c.version).map(c => c.purl))], cyclonedx: toCycloneDX(components, opts) }; }

module.exports = { parseNpmLock, parsePom, collectComponents, toCycloneDX, buildSbom, npmPurl, mavenPurl, basePurl, DEFAULT_FILES };
