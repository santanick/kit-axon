'use strict';
/* v47.5 SBOM 전이 의존성 — npm lock packages 전체(직접 · 전이 구분) · mvn dependency:list 우선 · 없으면 직접 + BOM 관리 표기('일부') */
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const sbom = require('../sbom'); const { assess } = require('../impact');

const LOCK = { name: 'x', lockfileVersion: 3, packages: {
  '': { name: 'x', dependencies: { pg: '^8' }, devDependencies: { tap: '^1' } },
  'node_modules/pg': { version: '8.23.1' },
  'node_modules/pg-pool': { version: '3.10.1' },                       // 호이스팅된 전이
  'node_modules/tap': { version: '1.0.0', dev: true },
  'node_modules/tap/node_modules/minimist': { version: '0.0.8', dev: true }, // 중첩 전이
} };
const POM = `<project><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3.5.14</version></parent>
<dependencies>
<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
<dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>
<dependency><groupId>junit</groupId><artifactId>junit</artifactId><version>4.13.2</version><scope>test</scope></dependency>
</dependencies></project>`;
/* mvn dependency:list 출력(색 코드 · module 꼬리 포함 그대로) */
const LIST = `
The following files have been resolved:
   org.springframework.boot:spring-boot-starter-web:jar:3.5.14:compile\x1b[36m -- module spring.boot.starter.web\x1b[0;1m [auto]\x1b[m
   org.springframework:spring-webmvc:jar:6.2.18:compile -- module spring.webmvc
   org.apache.tomcat.embed:tomcat-embed-core:jar:10.1.50:compile -- module org.apache.tomcat.embed.core
   org.postgresql:postgresql:jar:42.7.8:compile -- module org.postgresql.jdbc
   io.netty:netty-transport-native-epoll:jar:linux-x86_64:4.1.128.Final:runtime
`;
const repo = withList => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-')); fs.mkdirSync(path.join(d, 'service/server'), { recursive: true }); fs.mkdirSync(path.join(d, 'service-egov/target'), { recursive: true });
  fs.writeFileSync(path.join(d, 'service/server/package-lock.json'), JSON.stringify(LOCK)); fs.writeFileSync(path.join(d, 'service-egov/pom.xml'), POM);
  if (withList) fs.writeFileSync(path.join(d, 'service-egov', sbom.MVN_LIST), LIST); return d; };
const find = (cs, n) => cs.find(c => c.name === n);

test('npm: lock packages 전체 · 직접/전이 구분', () => {
  const cs = sbom.parseNpmLock(LOCK, 'l');
  assert.equal(cs.length, 4);
  assert.equal(find(cs, 'pg').direct, true); assert.equal(find(cs, 'tap').direct, true);
  assert.equal(find(cs, 'pg-pool').direct, false, '호이스팅돼도 전이'); assert.equal(find(cs, 'minimist').direct, false);
  assert.equal(find(cs, 'minimist').exposure, 'dev');
});

test('Maven: dependency:list가 있으면 전이 · 해석 버전 사용', () => {
  const d = repo(true); const r = sbom.buildSbom(d);
  const mv = r.components.filter(c => c.ecosystem === 'maven');
  assert.equal(find(mv, 'org.springframework:spring-webmvc').version, '6.2.18'); assert.equal(find(mv, 'org.springframework:spring-webmvc').direct, false);
  assert.equal(find(mv, 'org.postgresql:postgresql').version, '42.7.8', 'BOM 관리 버전이 목록으로 확정');
  assert.equal(find(mv, 'org.postgresql:postgresql').direct, true); assert.equal(find(mv, 'org.postgresql:postgresql').source, 'mvn-list');
  assert.equal(find(mv, 'io.netty:netty-transport-native-epoll').version, '4.1.128.Final', 'classifier 줄');
  assert.equal(find(mv, 'junit:junit').source, 'pom', '목록에 없는 직접 의존성(test)은 pom 유지');
  assert.ok(find(mv, 'org.springframework.boot:spring-boot-starter-parent'), '부모 유지');
  assert.equal(mv.filter(c => c.name === 'org.springframework.boot:spring-boot-starter-web').length, 1, '중복 없음');
  assert.ok(r.purls.includes('pkg:maven/org.apache.tomcat.embed/tomcat-embed-core@10.1.50'), '전이 의존성도 OSV 질의 대상');
  const cdx = r.cyclonedx.components.find(c => c.name === 'org.apache.tomcat.embed:tomcat-embed-core');
  assert.deepEqual(cdx.properties.find(p => p.name === 'didisam:dependency'), { name: 'didisam:dependency', value: 'transitive' });
  /* 전이 의존성 취약점이 '해당'으로 잡힌다 */
  const it = { source: 'OSV', aliases: ['CVE-T'], affected: [{ ecosystem: 'Maven', name: 'org.apache.tomcat.embed:tomcat-embed-core', ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '10.1.0' }, { fixed: '10.1.51' }] }] }] };
  assert.equal(assess(it, r.components)[0].verdict, '해당');
  fs.rmSync(d, { recursive: true, force: true });
});

test('Maven: 목록이 없으면 직접 + BOM 관리 표기 → 일부', () => {
  const d = repo(false); const r = sbom.buildSbom(d);
  const pg = find(r.components, 'org.postgresql:postgresql');
  assert.equal(pg.version, null); assert.equal(pg.managed_by, 'org.springframework.boot:spring-boot-dependencies@3.5.14');
  assert.ok(!r.components.some(c => c.name === 'org.springframework:spring-webmvc'), '전이 없음');
  assert.ok(r.cyclonedx.components.find(c => c.name === 'org.postgresql:postgresql').properties.some(p => p.name === 'didisam:managed-by'));
  assert.equal(assess({ source: 'OSV', aliases: ['X'], affected: [{ ecosystem: 'Maven', name: 'org.postgresql:postgresql', ranges: [] }] }, r.components)[0].verdict, '일부');
  /* mavenList:false는 목록이 있어도 무시 */
  const d2 = repo(true); assert.equal(find(sbom.buildSbom(d2, { mavenList: false }).components, 'org.postgresql:postgresql').version, null);
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(d2, { recursive: true, force: true });
});
