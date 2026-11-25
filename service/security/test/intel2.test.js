'use strict';
/* 가디언 5차 g2 — 플랫폼 감시 소스(무료 공개 피드 10종 + OSV 감시) · composer.lock · 런타임 버전 대조. 네트워크 없이 픽스처로 시험 */
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const platform = require('../intel/platform'); const intel = require('../intel'); const osv = require('../intel/osv');
const sbom = require('../sbom'); const runtime = require('../runtime'); const { assess } = require('../impact'); const W = require('../weekly');
const off = { offline: true };

test('플랫폼 10종: 픽스처 수집 · untrusted · 키 없는 https 소스', async () => {
  assert.deepEqual(platform.IDS, ['GCP', 'FIREBASE', 'NODE', 'SPRING', 'EGOV', 'PIPC', 'PHP', 'TOMCAT', 'OPENJDK', 'ORACLE-CPU']);
  for (const s of platform.SOURCES) {
    assert.match(s.url, /^https:\/\//, s.id); assert.ok(!/api[_-]?key|token=/i.test(s.url), `${s.id} 키 없는 URL`);
    const r = await platform.collectOne(s, off); assert.equal(r.origin, 'fixture'); assert.ok(r.items.length >= 2, s.id);
    for (const it of r.items) { assert.ok(it.title.untrusted && it.summary.untrusted, s.id); assert.ok(it.external_id.startsWith(s.id + ':')); assert.ok(!it.url || /^https:\/\//.test(it.url), `${s.id} ${it.url}`); assert.equal(it.new, true); }
  }
  const tc = (await platform.collectOne(platform.SOURCES.find(s => s.id === 'TOMCAT'), off)).items[0];
  assert.equal(tc.external_id, 'TOMCAT:10.1.63'); assert.ok(tc.aliases.includes('CVE-2026-133325')); assert.deepEqual(tc.keywords, ['tomcat']);
  const sp = (await platform.collectOne(platform.SOURCES.find(s => s.id === 'SPRING'), off)).items[0]; assert.equal(sp.cvss, 7.5); assert.ok(sp.aliases.includes('CVE-2026-123886'));
  const eg = (await platform.collectOne(platform.SOURCES.find(s => s.id === 'EGOV'), off)).items; assert.equal(eg[0].external_id, 'EGOV:2101'); assert.match(eg[0].url, /nttId=2101$/);
  const or = (await platform.collectOne(platform.SOURCES.find(s => s.id === 'ORACLE-CPU'), off)).items; assert.equal(or[0].external_id, 'ORACLE-CPU:cpuoct2026'); assert.equal(or[0].cvss, null, '"Critical Patch Update"는 심각도 표기가 아님');
});

test('변경 감지: seen 대비 new · weekly 상태 갱신 대상', async () => {
  const s = platform.SOURCES.find(x => x.id === 'OPENJDK');
  const r = await platform.collectOne(s, { ...off, seen: { OPENJDK: ['OPENJDK:2026-10-24', 'OPENJDK:2026-10-21'] } });
  assert.deepEqual(r.items.filter(i => i.new).map(i => i.external_id), ['OPENJDK:2026-11-17']);
  const st = W.nextState({ seen: {} }, { sources: { OPENJDK: { origin: 'live' }, PIPC: { origin: 'fixture' } }, threats: [{ source: 'OPENJDK', external_id: 'OPENJDK:2026-11-17' }, { source: 'PIPC', external_id: 'PIPC:1' }] });
  assert.deepEqual(st.seen.OPENJDK, ['OPENJDK:2026-11-17']); assert.equal(st.seen.PIPC, undefined, '픽스처는 seen 갱신 안 함');
});

test('영향 판정: 제품 키워드 → 일부 · 개인정보위 → 통제점검형 · 무관 → 없음', async () => {
  const comps = sbom.collectComponents(path.join(__dirname, '..', '..', '..'));
  const pick = async id => (await platform.collectOne(platform.SOURCES.find(s => s.id === id), off)).items[0];
  assert.equal(assess(await pick('TOMCAT'), comps)[0].verdict, '일부');
  assert.equal(assess(await pick('NODE'), comps)[0].verdict, '일부');
  assert.equal(assess({ ...(await pick('PIPC')), kind: 'reg' }, comps)[0].verdict, '통제점검형');
  assert.equal(assess({ source: 'GCP', kind: 'advisory', title: { untrusted: true, text: 'GKE Autopilot issue' }, summary: '', aliases: [] }, comps)[0].verdict, '없음');
});

test('collectAll: 플랫폼 · OSV 감시 등록, platform:false면 생략', async () => {
  const a = await intel.collectAll({ ...off, ai: false });
  for (const id of [...platform.IDS, 'OSV-WATCH']) assert.ok(a.sources[id] && a.sources[id].origin === 'fixture', id);
  const b = await intel.collectAll({ ...off, ai: false, platform: false }); assert.ok(!b.sources.GCP && !b.sources['OSV-WATCH']);
});

test('OSV 감시(Next.js · MCP): 최근 30일만 · MAL-은 경보(강제 P0 아님)', async () => {
  const r = await osv.watch({ ...off, now: new Date('2026-11-25T00:00:00Z') });
  assert.deepEqual(r.items.map(i => i.external_id).sort(), ['GHSA-fx00-next-0001', 'MAL-2026-0001']);
  const m = r.items.find(i => i.external_id.startsWith('MAL-')); assert.equal(m.malicious, false); assert.equal(m.malAlert, true); assert.equal(m.source, 'OSV-WATCH');
  assert.equal(r.items.find(i => i.watch === 'npm:next').cvss, 9.5);
});

test('composer.lock → Packagist purl (OSV querybatch 대상)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g2-'));
  fs.writeFileSync(path.join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'guzzlehttp/guzzle', version: 'v7.8.1' }], 'packages-dev': [{ name: 'phpunit/phpunit', version: '10.5.0' }] }));
  const c = sbom.collectComponents(root);
  assert.deepEqual(c.map(x => [x.purl, x.exposure]), [['pkg:composer/guzzlehttp/guzzle@7.8.1', 'prod'], ['pkg:composer/phpunit/phpunit@10.5.0', 'dev']]);
  const hit = assess({ source: 'OSV', kind: 'vuln', aliases: ['X'], affected: [{ ecosystem: 'Packagist', name: 'guzzlehttp/guzzle', ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '7.9.0' }] }] }] }, c);
  assert.equal(hit[0].verdict, '해당');
});

test('런타임 대조: 기준표 · 미만 P1 · 메이저만 P2 일부 · 지원 밖 P1 · JDK · Spring Boot 보고', async () => {
  const m = await runtime.minimums(off); assert.deepEqual(m.min, { 22: '22.23.5', 24: '24.22.3', 26: '26.13.1' });
  const fake = { offline: true, fetchImpl: async () => ({ ok: true, status: 200, json: async () => [{ version: 'v22.24.0', security: true }, { version: 'v24.22.2', security: true }, { version: 'v26.14.0', security: false }] }) };
  assert.deepEqual((await runtime.minimums({ fetchImpl: fake.fetchImpl })).min, { 22: '22.24.0', 24: '24.22.3', 26: '26.13.1' }, 'dist 최신 보안 릴리스가 더 높으면 올림');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g2rt-')); fs.mkdirSync(path.join(root, 'service'));
  const df = s => fs.writeFileSync(path.join(root, 'service/Dockerfile'), s);
  df('FROM node:22.23.4-alpine AS build\nRUN x\nFROM node:22.23.4-alpine@sha256:abc\nCMD x\n');
  let r = await runtime.check(root, off); assert.equal(r.findings.length, 2);
  assert.deepEqual(r.findings.map(f => [f.priority, f.verdict]), [['P2', '해당'], ['P1', '해당']], '빌드 단계 P2 · 운영 런타임 P1');
  assert.deepEqual(r.findings[1].fixed, ['22.23.5']); assert.equal(r.findings[1].status, 'open'); assert.match(r.findings[1].title, /22\.23\.4 < 보안 릴리스 22\.23\.5/);
  df('FROM node:22-alpine@sha256:abc\n'); r = await runtime.check(root, off); assert.deepEqual(r.findings.map(f => [f.priority, f.verdict, f.status]), [['P2', '일부', 'needs_review']]);
  r = await runtime.check(root, { ...off, nodeVersion: 'v22.23.5' }); assert.equal(r.findings.length, 0, '빌드 기록 node -v가 기준 이상이면 Finding 없음');
  r = await runtime.check(root, { ...off, nodeVersion: 'node v22.20.0' }); assert.equal(r.findings[0].priority, 'P1'); assert.equal(r.versions.node[0].via, 'build-log');
  df('FROM node:20.19.0-slim\n'); r = await runtime.check(root, off); assert.equal(r.findings[0].priority, 'P1'); assert.match(r.findings[0].title, /보안 지원 계열/);
  df('FROM node:24.22.3\n'); r = await runtime.check(root, off); assert.equal(r.findings.length, 0);
  const repo = await runtime.check(path.join(__dirname, '..', '..', '..'), off);
  assert.equal(repo.versions.springBoot && /^\d+\.\d+\.\d+$/.test(repo.versions.springBoot), true); assert.ok(repo.versions.jdk.some(j => j.runtime && j.major === '17'));
});
