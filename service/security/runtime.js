'use strict';
/* 런타임 버전 대조 — Dockerfile · pom.xml에서 Node · JDK · Spring Boot 버전을 읽어 Node 보안 릴리스와 대조한다.
   - 기준(최소 안전 버전): 고정값 BASE(2026-11-11 보안 릴리스 22.23.5 · 24.22.3 · 26.13.1) ∪ nodejs.org/dist/index.json(security:true 최신, 무료 · 키 없음)
   - 정확한 버전이 있으면(태그 node:22.23.5-… · 빌드 기록 node -v → opts.nodeVersion · GUARD_NODE_VERSION) 최소 버전 미만이면 P1 Finding(해당)
   - 메이저만 있으면(node:22-alpine@sha256 …) 판정 불가 → P2 '일부'(사람 확인 · 빌드 기록 대조). 지원 계열(BASE)에 없는 메이저면 P1(지원 종료 의심)
   - JDK · Spring Boot는 버전만 보고(기준 피드가 변경 감지형이라 자동 판정하지 않음 — OPENJDK · ORACLE-CPU · SPRING 수집 항목으로 사람 확인) */
const fs = require('node:fs'); const path = require('node:path');
const { fetchOr } = require('./util'); const { cmp } = require('./impact'); const { parsePom } = require('./sbom');

const BASE = { 22: '22.23.5', 24: '24.22.3', 26: '26.13.1' };
const DOCKERFILES = ['service/Dockerfile', 'service-egov/Dockerfile'];
const DUE_H = { P1: 24 * 7, P2: 24 * 30 };

/* 기준표: 메이저별 최소 안전 버전(BASE와 dist 최신 보안 릴리스 중 높은 값) */
async function minimums(opts = {}) {
  const r = await fetchOr('https://nodejs.org/dist/index.json', { ...opts, fixture: 'plat-node-dist.json' }); const min = { ...BASE };
  for (const x of Array.isArray(r.data) ? r.data : []) {
    if (!x || !x.security) continue; const v = String(x.version || '').replace(/^v/, ''); const mj = v.split('.')[0];
    if (!(mj in BASE) || /-/.test(v)) continue; if (cmp(v, min[mj]) > 0) min[mj] = v;
  }
  return { origin: r.origin, min };
}

/* Dockerfile FROM 줄 → [{ file, stage, image, tag, final }] */
function froms(root, files = DOCKERFILES) {
  const out = [];
  for (const rel of files) {
    const f = path.join(root, rel); if (!fs.existsSync(f)) continue;
    const L = fs.readFileSync(f, 'utf8').split('\n').map(s => s.trim()).filter(s => /^FROM\s/i.test(s));
    L.forEach((s, i) => { const m = s.match(/^FROM\s+(?:--platform=\S+\s+)?([^\s:@]+)(?::([^\s@]+))?(?:@(\S+))?(?:\s+AS\s+(\S+))?/i); if (m) out.push({ file: rel, image: m[1], tag: m[2] || 'latest', digest: m[3] || null, stage: m[4] || null, final: i === L.length - 1 }); });
  }
  return out;
}

function inspect(root, { nodeVersion = process.env.GUARD_NODE_VERSION || '', files } = {}) {
  const F = froms(root, files);
  const node = F.filter(x => x.image === 'node' || x.image.endsWith('/node')).map(x => {
    const m = x.tag.match(/^(\d+)(?:\.(\d+)\.(\d+))?/); const major = m ? m[1] : null; let exact = m && m[2] ? `${m[1]}.${m[2]}.${m[3]}` : null; let via = exact ? 'tag' : null;
    const nv = String(nodeVersion).replace(/^node\s+/, '').replace(/^v/, '').trim();
    if (!exact && x.final && /^\d+\.\d+\.\d+$/.test(nv) && nv.split('.')[0] === major) { exact = nv; via = 'build-log'; }
    return { ...x, major, version: exact, via, runtime: x.final }; // 마지막 단계 = 운영 런타임, 그 외 = 빌드 전용
  });
  const jdk = F.filter(x => /(^|\/)(eclipse-temurin|openjdk|amazoncorretto)$/.test(x.image) || /^maven$/.test(x.image)).map(x => ({ ...x, major: (x.tag.match(/(?:^|-)(\d{2})(?:[.-]|$)/) || [])[1] || null, runtime: x.final }));
  let springBoot = null; const pom = path.join(root, 'service-egov/pom.xml');
  if (fs.existsSync(pom)) { const p = parsePom(fs.readFileSync(pom, 'utf8'), 'service-egov/pom.xml').find(c => c.role === 'parent' && /spring-boot/.test(c.name)); springBoot = p ? p.version : null; }
  return { node, jdk, springBoot };
}

const plainFinding = (o, now) => ({ source: 'RUNTIME', sources: ['RUNTIME'], aliases: [o.external_id], cve: null, kev: false, malicious: false, url: 'https://nodejs.org/en/blog/vulnerability', cvss: null, origin: o.origin, confidence: o.verdict === '해당' ? 'high' : 'low',
  priority_score: o.priority === 'P1' ? 60 : 40, score_parts: null, forced: null, severity: o.priority === 'P1' ? 'High' : 'Medium', sla_due_at: new Date(now.getTime() + DUE_H[o.priority] * 3600e3).toISOString(), status: o.verdict === '해당' ? 'open' : 'needs_review', ...o });

/* → { origin, min, versions, findings[] } — findings는 guard scan 결과에 합쳐진다 */
async function check(root, opts = {}) {
  const now = opts.now || new Date(); const m = await minimums(opts); const v = inspect(root, opts); const findings = [];
  for (const n of v.node) {
    const comp = { ecosystem: 'runtime', name: 'node', version: n.version, purl: `pkg:docker/node@${n.tag}`, exposure: n.runtime ? 'prod' : 'dev', location: n.file };
    const base = { key: `RUNTIME|node|${n.file}|${n.stage || 'final'}`, external_id: `RUNTIME:node:${n.file}`, component: comp, origin: m.origin };
    const need = m.min[n.major];
    if (!need) { findings.push(plainFinding({ ...base, priority: n.runtime ? 'P1' : 'P2', verdict: '해당', title: `Node ${n.major || n.tag} — 보안 지원 계열(${Object.keys(m.min).join(' · ')})이 아닙니다`, summary: `${n.file} FROM node:${n.tag}`, fixed: [m.min[22]], evidence: `지원 계열 밖 메이저(${n.major || '알 수 없음'})` }, now)); continue; }
    if (n.version && cmp(n.version, need) < 0) findings.push(plainFinding({ ...base, priority: n.runtime ? 'P1' : 'P2', verdict: '해당', title: `Node ${n.version} < 보안 릴리스 ${need}`, summary: `${n.file}${n.stage ? ' (' + n.stage + ' 단계)' : ''} FROM node:${n.tag} — 확인 경로 ${n.via}`, fixed: [need], evidence: `${n.version} < ${need}` }, now));
    else if (!n.version && n.runtime) findings.push(plainFinding({ ...base, priority: 'P2', verdict: '일부', title: `Node ${n.major} 정확한 버전 미확정 — ${need} 이상인지 확인 필요`, summary: `${n.file} FROM node:${n.tag}${n.digest ? ' (다이제스트 고정)' : ''} — 빌드 기록의 node -v를 GUARD_NODE_VERSION으로 넘기거나 태그를 ${need} 이상으로 고정합니다`, fixed: [need], evidence: '태그에 메이저만 있음' }, now));
  }
  return { origin: m.origin, min: m.min, versions: { node: v.node.map(n => ({ file: n.file, stage: n.stage, tag: n.tag, version: n.version, via: n.via, runtime: n.runtime })), jdk: v.jdk.map(j => ({ file: j.file, image: j.image, tag: j.tag, major: j.major, runtime: j.runtime })), springBoot: v.springBoot }, findings };
}
module.exports = { check, inspect, minimums, froms, BASE };
