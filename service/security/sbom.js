'use strict';
/* SBOM — package-lock.json(v2/v3) · pom.xml · composer.lock → 구성요소 목록(purl) + CycloneDX 1.5 JSON
   exposure: 운영 런타임 'prod' · 개발 전용 'dev'(npm dev · maven test). 버전이 BOM 관리라 pom에 없으면 version=null(판정은 '일부').
   v47.5 전이 의존성: npm은 lock의 packages 전체(direct/transitive 구분), Maven은 {pom 폴더}/target/dependency-list.txt(mvn dependency:list)가 있으면 그 목록,
   없으면 직접 의존성 + managed_by(spring-boot-dependencies@부모 버전) 표기. */
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');

const enc = s => encodeURIComponent(s).replace(/%2F/g, '/');
function npmPurl(name, version) {
  const n = name.startsWith('@') ? '%40' + enc(name.slice(1)) : enc(name);
  return `pkg:npm/${n}${version ? '@' + version : ''}`;
}
const mavenPurl = (g, a, v) => `pkg:maven/${g}/${a}${v ? '@' + v : ''}`;
const composerPurl = (n, v) => `pkg:composer/${n.split('/').map(enc).join('/')}${v ? '@' + v : ''}`;
const basePurl = p => p.replace(/@[^@/]*$/, '');

function parseNpmLock(json, location) {
  const out = [];
  const pk = json.packages || {};
  /* v47.5 전이 의존성: packages 전체(직접 · 전이)를 싣는다. 직접 = 루트 package.json에 선언된 이름이 최상위에 설치된 것(호이스팅된 전이 의존성은 transitive) */
  const root = pk[''] || {}; const declared = new Set(Object.keys({ ...root.dependencies, ...root.devDependencies, ...root.optionalDependencies, ...root.peerDependencies }));
  for (const [k, v] of Object.entries(pk)) {
    if (!k || v.link) continue;
    const name = v.name || k.slice(k.lastIndexOf('node_modules/') + 13);
    if (!name || !v.version) continue;
    const top = k.startsWith('node_modules/') && !k.slice(13).includes('node_modules/');
    out.push({ ecosystem: 'npm', name, version: v.version, purl: npmPurl(name, v.version), exposure: v.dev ? 'dev' : 'prod', location, direct: declared.size ? top && declared.has(name) : top, source: 'lock' });
  }
  if (!out.length && json.dependencies) { // lockfile v1
    const walk = (deps, direct) => { for (const [name, v] of Object.entries(deps || {})) { out.push({ ecosystem: 'npm', name, version: v.version, purl: npmPurl(name, v.version), exposure: v.dev ? 'dev' : 'prod', location, direct }); walk(v.dependencies, false); } };
    walk(json.dependencies, true); for (const c of out) c.source = 'lock';
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
    out.push({ ecosystem: 'maven', name: `${parentInfo.g}:${parentInfo.a}`, version: parentInfo.v, purl: mavenPurl(parentInfo.g, parentInfo.a, parentInfo.v), exposure: 'prod', location, direct: true, role: 'parent', source: 'pom' });
  }
  const noMgmt = src.replace(/<dependencyManagement>[\s\S]*?<\/dependencyManagement>/g, '').replace(/<plugins>[\s\S]*?<\/plugins>/g, '');
  for (const m of noMgmt.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
    const d = m[1].replace(/<exclusions>[\s\S]*?<\/exclusions>/g, '');
    const g = sub(tag(d, 'groupId')); const a = sub(tag(d, 'artifactId')); let v = sub(tag(d, 'version')); const scope = tag(d, 'scope') || 'compile';
    let managed = false;
    if (!v) { managed = true; if (parentInfo && parentInfo.g === 'org.springframework.boot' && g === 'org.springframework.boot') v = parentInfo.v; else v = null; }
    if (v && v.includes('${')) v = null;
    /* v47.5 BOM 관리 버전 표기: Spring Boot 부모면 spring-boot-dependencies@{부모 버전}이 정한다(실제 값은 mvn dependency:list로 확정, 없으면 판정 '일부') */
    const managedBy = managed && parentInfo && parentInfo.g === 'org.springframework.boot' ? `org.springframework.boot:spring-boot-dependencies@${parentInfo.v}` : managed ? 'unknown-bom' : undefined;
    const profile = /<profile>[\s\S]*$/.test(noMgmt.slice(0, m.index)) && !/<\/profiles>/.test(noMgmt.slice(noMgmt.lastIndexOf('<profile>', m.index), m.index)) ? true : undefined;
    out.push({ ecosystem: 'maven', name: `${g}:${a}`, version: v, purl: mavenPurl(g, a, v), exposure: scope === 'test' ? 'dev' : 'prod', location, direct: true, scope, source: 'pom', ...(managed ? { managed: true, managed_by: managedBy } : {}), ...(profile ? { profile: true } : {}) });
  }
  return out;
}

/* composer.lock(PHP · WordPress 플러그인 등) → Packagist purl. packages-dev는 dev. 버전 앞 'v'는 뗀다 */
function parseComposerLock(json, location) {
  const out = [];
  for (const [key, exposure] of [['packages', 'prod'], ['packages-dev', 'dev']]) for (const p of json[key] || []) { if (!p.name || !p.version) continue; const v = String(p.version).replace(/^v(?=\d)/, ''); out.push({ ecosystem: 'composer', name: p.name, version: v, purl: composerPurl(p.name, v), exposure, location, direct: true }); }
  return out;
}

/* v47.5 mvn dependency:list 결과(직접 · 전이, 해석된 버전) — 줄 형식 g:a:type[:classifier]:version:scope[ -- module …]
   만들기: cd service-egov && mvn -B -o org.apache.maven.plugins:maven-dependency-plugin:3.7.0:list -DoutputFile=target/dependency-list.txt */
const MVN_LIST = 'target/dependency-list.txt';
function parseMvnList(txt, location, pomComps = []) {
  const direct = new Set(pomComps.filter(c => c.role !== 'parent').map(c => c.name)); const out = [];
  for (const line0 of String(txt).replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/)) {
    const line = line0.replace(/\s+--\s+module\s.*$/, '').replace(/\s*\(optional\)\s*$/, '').trim();
    if (!/^[\w.-]+:[\w.-]+:[\w.-]+(:[\w.-]+)?:[^:\s]+:[a-z]+$/.test(line)) continue;
    const p = line.split(':'); const [g, a] = p; const scope = p[p.length - 1]; const v = p[p.length - 2]; const name = `${g}:${a}`;
    out.push({ ecosystem: 'maven', name, version: v, purl: mavenPurl(g, a, v), exposure: scope === 'test' ? 'dev' : 'prod', location, direct: direct.has(name), scope, source: 'mvn-list' });
  }
  return out;
}
function mergePomList(pomComps, listComps) {
  if (!listComps.length) return pomComps;
  const got = new Set(listComps.map(c => c.name));
  /* 부모 · 목록에 없는 직접 의존성(프로필 · 범위 제외분)은 pom 그대로 남긴다 */
  return [...pomComps.filter(c => c.role === 'parent' || !got.has(c.name)), ...listComps];
}

/* 저장소 기본 대상: Node 서버 lock + 전자정부 Java pom + composer.lock. 다른 파일은 opts.files로 추가 */
const DEFAULT_FILES = ['service/server/package-lock.json', 'service-egov/pom.xml', 'composer.lock']; // 없는 파일은 건너뜀
function collectComponents(root, files = DEFAULT_FILES, opts = {}) {
  const comps = [];
  for (const rel of files || DEFAULT_FILES) {
    const f = path.join(root, rel); if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, 'utf8');
    if (rel.endsWith('composer.lock')) comps.push(...parseComposerLock(JSON.parse(raw), rel));
    else if (rel.endsWith('.json')) comps.push(...parseNpmLock(JSON.parse(raw), rel));
    else if (rel.endsWith('.xml')) {
      const pom = parsePom(raw, rel);
      const lf = opts.mavenList ? path.resolve(root, opts.mavenList) : path.join(root, path.dirname(rel), MVN_LIST);
      comps.push(...(opts.mavenList !== false && fs.existsSync(lf) ? mergePomList(pom, parseMvnList(fs.readFileSync(lf, 'utf8'), rel, pom)) : pom));
    }
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
      properties: [{ name: 'didisam:location', value: c.location }, { name: 'didisam:exposure', value: c.exposure }, { name: 'didisam:dependency', value: c.direct ? 'direct' : 'transitive' }, { name: 'didisam:source', value: c.source || 'unknown' }, ...(c.managed ? [{ name: 'didisam:version', value: c.version ? 'parent-bom' : 'unresolved' }, ...(c.managed_by ? [{ name: 'didisam:managed-by', value: c.managed_by }] : [])] : [])],
    })),
  };
}

function buildSbom(root, opts = {}) { const components = collectComponents(root, opts.files, opts); return { components, purls: [...new Set(components.filter(c => c.version).map(c => c.purl))], cyclonedx: toCycloneDX(components, opts) }; }

module.exports = { parseNpmLock, parsePom, parseComposerLock, composerPurl, parseMvnList, mergePomList, MVN_LIST, collectComponents, toCycloneDX, buildSbom, npmPurl, mavenPurl, basePurl, DEFAULT_FILES };
