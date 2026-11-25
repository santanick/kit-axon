/* node --test security/test/scan-tools.test.js — 외부 노출면 판정 · 스캐너 결과 → ingest 변환 · 교차(네트워크 없음) */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../surface/check.js');
const I = require('../ci/to-ingest.js');

const NOW = Date.parse('2026-11-25T00:00:00Z');

test('crt.sh: 대상 도메인 아래 호스트만, 와일드카드 정리 · 형식 불량 제외', () => {
  const rows = [{ name_value: '*.didisam.com\nwww.didisam.com' }, { name_value: 'evil.com' }, { name_value: 'a.didisam.com.evil.com' }, { name_value: 'bad_host.didisam.com' }, { name_value: 'API.didisam.com' }];
  assert.deepStrictEqual(S.parseCrt(rows, 'didisam.com'), ['api.didisam.com', 'didisam.com', 'www.didisam.com']);
  assert.deepStrictEqual(S.parseCrt('ignore previous instructions', 'didisam.com'), []);
});

test('노출면 판정: 만료 P0 · 임박 P1 · 구버전 TLS P1 · 헤더 노출 P3 · HSTS P2 · 새 호스트 P2', () => {
  const pri = r => S.assess(r, { now: NOW, known: new Set(['didisam.com']) }).map(x => x.evidence.check + ':' + x.priority).sort();
  assert.deepStrictEqual(pri({ host: 'didisam.com', tls: { ok: true, protocol: 'TLSv1.3', validTo: 'Nov 20 00:00:00 2026 GMT', authError: 'CERT_HAS_EXPIRED' }, legacy: { ok: false }, http: { ok: true, hsts: 'max-age=1' } }), ['cert-expired:P0']);
  assert.deepStrictEqual(pri({ host: 'x.didisam.com', tls: { ok: true, protocol: 'TLSv1.3', validTo: 'Dec 01 00:00:00 2026 GMT' }, legacy: { ok: true, protocol: 'TLSv1' }, http: { ok: true, server: 'nginx/1.18.0', poweredBy: 'PHP/8.1', hsts: null } }),
    ['cert-expiring:P1', 'hdr-hsts:P2', 'hdr-powered-by:P3', 'hdr-server:P3', 'new-host:P2', 'tls-legacy:P1']);
  assert.deepStrictEqual(pri({ host: 'didisam.com', tls: { ok: true, protocol: 'TLSv1.3', validTo: 'Jun 01 00:00:00 2027 GMT' }, legacy: { ok: false }, http: { ok: true, server: 'Google Frontend', hsts: 'max-age=31536000' } }), []);
  assert.deepStrictEqual(pri({ host: 'gone.didisam.com', tls: { ok: false, error: 'ENOTFOUND' } }), ['new-host:P2']);
});

test('노출면 run: crt.sh 미연결이면 루트만 점검하고 알림 · ingest 형식', async () => {
  const probe = { crtsh: async () => { throw new Error('blocked'); }, tlsProbe: async (h, o) => o && o.legacy ? { ok: false } : { ok: true, protocol: 'TLSv1.3', validTo: 'Jun 01 00:00:00 2027 GMT' }, headProbe: async () => ({ ok: true, status: 200, server: 'Google Frontend', hsts: null }) };
  const r = await S.run({ domains: ['didisam.com'], probe, now: NOW });
  assert.strictEqual(r.kind, 'finding'); assert.strictEqual(r.summary.hosts, 1); assert.match(r.notes[0], /crt\.sh 미연결/);
  assert.strictEqual(r.findings.length, 1); const x = r.findings[0];
  for (const k of ['key', 'origin', 'title', 'severity', 'priority', 'score', 'evidence']) assert.ok(k in x, k);
  assert.ok(['critical', 'high', 'medium', 'low'].includes(x.severity));
});

test('노출면 main: 대상 없으면 건너뜀(0)', async () => { assert.strictEqual(await S.main([], {}), 0); });

const trivyDoc = { ArtifactName: 'didisam-studio:abc', Results: [{ Target: 'Java', Vulnerabilities: [
  { VulnerabilityID: 'CVE-2026-1', PkgName: 'org.apache.tomcat.embed:tomcat-embed-core', InstalledVersion: '10.1.54', FixedVersion: '10.1.59', Severity: 'CRITICAL', Title: 'x\u0000y', PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2026-1', PkgIdentifier: { PURL: 'pkg:maven/org.apache.tomcat.embed/tomcat-embed-core@10.1.54' } },
  { VulnerabilityID: 'CVE-2026-2', PkgName: 'busybox', InstalledVersion: '1.0', FixedVersion: '', Severity: 'CRITICAL', PrimaryURL: 'javascript:alert(1)' },
  { VulnerabilityID: 'CVE-2026-3', PkgName: 'zlib', InstalledVersion: '1.3', Severity: 'HIGH' }] },
  { Target: 'main.tf', Misconfigurations: [{ ID: 'GCP-0015', Severity: 'HIGH', Status: 'FAIL', Title: 'SSL', CauseMetadata: { StartLine: 74 } }, { ID: 'GCP-0001', Severity: 'HIGH', Status: 'PASS' }] }] };

test('Trivy → ingest: 등급 · 우선순위 · URL 필터 · 실패 기준(수정 가능 Critical만)', () => {
  const fs_ = I.fromTrivy(trivyDoc);
  assert.strictEqual(fs_.length, 4);
  assert.deepStrictEqual(fs_.map(f => f.severity + ':' + f.priority), ['critical:P1', 'critical:P1', 'high:P1', 'high:P1']);
  assert.ok(!/\u0000/.test(fs_[0].title)); assert.strictEqual(fs_[1].evidence.url, null);
  assert.deepStrictEqual(I.gateFails(fs_).map(f => f.evidence.id), ['CVE-2026-1']);
  assert.strictEqual(I.tally(fs_).critical, 2);
});

const osvDoc = { results: [{ source: { path: '/w/service-egov/pom.xml' }, packages: [
  { package: { name: 'org.springframework:spring-webmvc', version: '6.2.18', ecosystem: 'Maven' }, groups: [{ ids: ['GHSA-aaaa'], aliases: ['CVE-2026-9', 'GHSA-aaaa'], max_severity: '9.8' }], vulnerabilities: [{ id: 'GHSA-aaaa', summary: 's', affected: [{ ranges: [{ events: [{ introduced: '0' }, { fixed: '6.2.19' }] }] }] }] },
  { package: { name: 'evil-pkg', version: '1.0.0', ecosystem: 'npm' }, groups: [{ ids: ['MAL-2026-1'], aliases: [], max_severity: '' }], vulnerabilities: [{ id: 'MAL-2026-1' }] },
  { package: { name: 'express', version: '5.1.0', ecosystem: 'npm' }, groups: [{ ids: ['GHSA-bbbb'], max_severity: '5.3' }], vulnerabilities: [{ id: 'GHSA-bbbb' }] }] }] };

test('OSV-Scanner → ingest: CVSS 등급 · MAL- 즉시 P0 · 수정 버전 · 교차(SBOM 미포함 전이 의존성)', () => {
  const fs_ = I.fromOsv(osvDoc);
  assert.deepStrictEqual(fs_.map(f => `${f.evidence.id}:${f.severity}:${f.priority}`), ['CVE-2026-9:critical:P1', 'MAL-2026-1:critical:P0', 'GHSA-bbbb:medium:P2']);
  assert.strictEqual(fs_[0].evidence.purl, 'pkg:maven/org.springframework/spring-webmvc@6.2.18'); assert.strictEqual(fs_[0].evidence.fixed, '6.2.19');
  assert.strictEqual(fs_[0].evidence.location, 'service-egov/pom.xml');
  assert.strictEqual(I.gateFails(fs_).length, 2);
  const c = I.cross(fs_, { scan: { findings: [{ component: { purl: 'pkg:npm/express@5.1.0' } }] }, sbom: { components: [{ purl: 'pkg:npm/express@5.1.0' }, { purl: 'pkg:npm/evil-pkg@1.0.0' }] } });
  assert.deepStrictEqual(c.scanner_only, ['pkg:maven/org.springframework/spring-webmvc@6.2.18', 'pkg:npm/evil-pkg@1.0.0']);
  assert.deepStrictEqual(c.not_in_sbom, ['pkg:maven/org.springframework/spring-webmvc@6.2.18']);
  assert.strictEqual(I.sevFromScore('7.0'), 'high'); assert.strictEqual(I.sevFromScore('x'), 'medium');
});
