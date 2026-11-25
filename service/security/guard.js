#!/usr/bin/env node
'use strict';
/* 디디쌤 가디언 CLI (Phase 0 · 수집 · 판정)
   node service/security/guard.js scan    [--offline] [--out f.json] [--cards] [--sbom sbom.json] [--aibom aibom.json]  저장소 SBOM × OSV 판정 + 런타임 버전 대조(GUARD_NODE_VERSION=빌드 기록 node -v) + AIBOM 요약 · 잠금 대조 → findings JSON
   node service/security/guard.js aibom   [--out aibom.json] [--check] [--update-lock]                AI 구성(모델 · MCP · 플러그인 · 프롬프트 해시) CycloneDX ML-BOM · 잠금 대조
   node service/security/guard.js collect [--offline] [--out f.json]                                NVD · KEV · GHSA · KISA + 플랫폼 10종 · OSV 감시 수집 + 영향 판정
   node service/security/guard.js report  --in findings.json [--threats t.json] [--out r.md] [--notify] 주간 리포트(md)
   node service/security/guard.js ingest  --in findings.json [--kind finding|threat]                 GUARD_TOKEN 있으면 /api/security/ingest 전송, 없으면 dry
   node service/security/guard.js weekly  [--offline] [--force] [--dir security/weekly] [--no-cards] [--notify]  자가 보완 루프: collect(+ATLAS · OWASP · AI 3사) → scan → 레드팀 생성 · 실행 → 결과 · 보고서 · 대책 카드
                                          종료 코드: P0 있으면 4, 뚫린 공격 있으면 3, 정상 0. 주말 · 공휴일은 --force 없으면 실행 안 함(0)
   기본은 dry · 미연결 안전 정지. 운영 DB 쓰기 · 비밀키 보유 · 병합은 하지 않는다. */
const path = require('node:path'); const fs = require('node:fs');
const { buildSbom } = require('./sbom'); const aibom = require('./aibom'); const intel = require('./intel'); const { assess, cmp } = require('./impact');
const { score } = require('./score'); const runtime = require('./runtime'); const { dedup } = require('./dedup'); const { createCard } = require('./cards');
const { notify } = require('./notify'); const { plain, writeJson, readJson, fenceText } = require('./util');

const ROOT = path.resolve(__dirname, '..', '..');
const SENSITIVE_LOC = [/^service\/server\//, /^service-egov\//]; // 학습자 PII · 결제 · 면접 데이터를 다루는 서버

/* 이 구성요소에 맞는 수정 버전 중 현재보다 높은 최소값(다른 패키지 범위는 제외) */
function fixedFor(item, c) {
  if (!c || !c.version) return item.fixed || [];
  const eco = { npm: 'npm', maven: 'Maven', composer: 'Packagist' }[c.ecosystem];
  const vs = (item.affected || []).filter(a => a.ecosystem === eco && a.name === c.name).flatMap(a => (a.ranges || []).flatMap(r => (r.events || []).filter(e => e.fixed).map(e => e.fixed))).filter(v => cmp(v, c.version) > 0).sort(cmp);
  return vs.length ? [vs[0]] : [];
}
function toFinding(item, imp, extra = {}) {
  return { source: item.source, sources: [item.source], external_id: item.external_id, aliases: [...new Set(item.aliases || [item.external_id])], cve: item.cve || (item.aliases || []).find(a => /^CVE-/.test(a)) || null,
    title: item.title, summary: item.summary, url: item.url, cvss: item.cvss ?? null, kev: !!item.kev, malicious: !!item.malicious, fixed: fixedFor(item, imp.component),
    verdict: imp.verdict, evidence: imp.evidence, confidence: imp.confidence, component: imp.component, origin: item.origin,
    ...(item.technique ? { technique: item.technique } : {}), ...(item.vendor ? { vendor: item.vendor } : {}), ...('new' in item ? { new: !!item.new } : {}), ...extra };
}
function finalize(list, { kevSet, epssMap, now }) {
  return dedup(list).map(f => {
    const cves = f.aliases.filter(a => /^CVE-/.test(a));
    f.kev = f.kev || cves.some(c => kevSet && kevSet.has(c));
    const e = cves.map(c => epssMap[c]).filter(Boolean).sort((a, b) => b.percentile - a.percentile)[0];
    if (e) { f.epss = e.epss; f.percentile = e.percentile; }
    const c = f.component; const exposure = c ? c.exposure : 'internal'; // 구성요소 미확정(키워드 '일부')은 운영 도달 미확인 → 강제 P0 없음
    const s = score({ cvss: f.cvss, percentile: f.percentile, kev: f.kev, exposure, sensitive: !!(c && exposure === 'prod' && SENSITIVE_LOC.some(r => r.test(c.location))), malicious: f.malicious }, now);
    return { ...f, priority_score: s.score, score_parts: s.parts, priority: s.priority, forced: s.forced, severity: s.severity, sla_due_at: s.sla_due_at, status: f.verdict === '해당' ? 'open' : 'needs_review' };
  }).sort((a, b) => b.priority_score - a.priority_score);
}
const tally = fs_ => ({ P0: 0, P1: 0, P2: 0, P3: 0, ...fs_.reduce((m, f) => ((m[f.priority] = (m[f.priority] || 0) + 1), m), {}) });

async function runScan({ root = ROOT, offline = false, fetchImpl, now = new Date(), cardsDir, files, nodeVersion } = {}) {
  const opts = { offline, fetchImpl };
  const sbom = buildSbom(root, { files, now });
  const osvR = await intel.osv.scan(sbom.purls, opts);
  const raw = [];
  for (const it of osvR.items) for (const imp of assess(it, sbom.components, { hits: osvR.hits })) if (imp.verdict === '해당' || imp.verdict === '일부') raw.push(toFinding(it, imp));
  const kevR = raw.length ? await intel.kev.collect(opts) : { origin: 'skipped', set: new Map() };
  const epssR = await intel.epss.lookup(raw.flatMap(f => f.aliases), opts);
  const findings = finalize(raw, { kevSet: kevR.set, epssMap: epssR.map, now });
  /* 런타임 버전 대조(Node 보안 릴리스 미만 P1) — 대책 카드는 의존성 건만 만든다 */
  const rt = await runtime.check(root, { ...opts, now, ...(nodeVersion ? { nodeVersion } : {}) });
  const cards = cardsDir ? findings.map(f => createCard(f, { dir: cardsDir, now })) : [];
  const ab = aibom.buildAibom(root, { now }); /* 13 AIBOM: 요약 · 잠금 대조(drift)를 scan 결과에 포함 */
  findings.push(...rt.findings);
  return { kind: 'scan', generated_at: now.toISOString(), origin: { osv: osvR.origin, kev: kevR.origin, epss: epssR.origin, runtime: rt.origin }, runtime: { min: rt.min, versions: rt.versions }, sbom: { components: sbom.components.length, purls: sbom.purls.length, files: [...new Set(sbom.components.map(c => c.location))] }, summary: { ...tally(findings), 해당: findings.filter(f => f.verdict === '해당').length, 일부: findings.filter(f => f.verdict === '일부').length }, findings, cards, aibom: { summary: ab.summary, lock: ab.lock, diff: ab.diff }, cyclonedx: sbom.cyclonedx, aibom_cyclonedx: ab.cyclonedx };
}

async function runCollect({ root = ROOT, offline = false, fetchImpl, now = new Date(), queue, seen, ai } = {}) {
  const opts = { offline, fetchImpl, now, queue, seen, ai };
  const sbom = buildSbom(root, { now });
  const all = await intel.collectAll(opts);
  const kevSet = all.sources.KEV && all.sources.KEV.set; if (all.sources.KEV) delete all.sources.KEV.set;
  const catalog = all.sources.ATLAS && all.sources.ATLAS.catalog; if (catalog) delete all.sources.ATLAS.catalog; // ATLAS 기법 목록은 상태(seen) 갱신용
  const judged = []; const counts = { 해당: 0, 일부: 0, 없음: 0, 통제점검형: 0 };
  for (const it of all.items) for (const imp of assess(it, sbom.components)) { counts[imp.verdict]++; if (imp.verdict !== '없음') judged.push(toFinding(it, imp)); }
  const epssR = await intel.epss.lookup(judged.flatMap(f => f.aliases), opts);
  const threats = finalize(judged, { kevSet, epssMap: epssR.map, now });
  return { kind: 'threat', generated_at: now.toISOString(), sources: { ...all.sources, EPSS: { origin: epssR.origin } }, counts, threats, ...(catalog ? { atlas_catalog: catalog } : {}) };
}

function buildReport(scan, threats, now = new Date()) {
  const f = scan ? scan.findings : []; const s = scan ? scan.summary : tally([]);
  const soon = f.filter(x => new Date(x.sla_due_at) - now < 72 * 3600e3);
  const row = x => `| ${x.priority} | ${x.priority_score} | ${x.key.split("|")[0]} | ${x.component ? '`' + x.component.purl + '`' : '-'} | ${x.verdict} | ${(x.fixed || []).join(', ') || '-'} | ${x.sla_due_at.slice(0, 10)} |`;
  const origins = scan ? Object.entries(scan.origin).map(([k, v]) => `${k}=${v}`).join(' · ') : '-';
  return [`# 디디쌤 가디언 주간 보안 리포트 (${now.toISOString().slice(0, 10)})`, '',
    `- 대상: SBOM 구성요소 ${scan ? scan.sbom.components : 0}개 (${scan ? scan.sbom.files.join(', ') : '-'})`,
    `- 데이터 출처: ${origins}${/fixture|blocked/.test(origins) ? ' — **픽스처 · 차단 포함: 실제 판정 아님**' : ''}`,
    `- 우선순위: P0 ${s.P0} · P1 ${s.P1} · P2 ${s.P2} · P3 ${s.P3} (해당 ${s.해당 ?? 0} · 일부 ${s.일부 ?? 0})`,
    `- 72시간 내 기한 도래: ${soon.length}건`,
    `- AIBOM: ${scan && scan.aibom ? `모델 ${scan.aibom.summary.models} · MCP 도구 ${scan.aibom.summary.mcp_tools} · 플러그인 ${scan.aibom.summary.plugins} · 프롬프트 ${scan.aibom.summary.prompts} · 잠금 ${scan.aibom.lock}${scan.aibom.diff && scan.aibom.diff.drift ? ` · **변경 ${scan.aibom.diff.drift}건(검토 필요)**` : ''}` : '-'}`, '',
    '## 취약점(점수순)', '', '| P | 점수 | 식별자 | 구성요소 | 판정 | 수정 버전 | 기한 |', '|---|---|---|---|---|---|---|', ...(f.length ? f.slice(0, 30).map(row) : ['| - | - | 발견 없음 | - | - | - | - |']), '',
    ...(threats ? ['## 위협 인텔(해당 · 일부 · 통제점검형)', '', `판정 분포: 해당 ${threats.counts.해당} · 일부 ${threats.counts.일부} · 없음 ${threats.counts.없음} · 통제점검형 ${threats.counts.통제점검형}`, '', ...threats.threats.slice(0, 15).map(t => `- ${t.priority} ${t.aliases[0]} (${t.source}) — ${t.verdict}: ${t.evidence}\n${fenceText(t.title)}`), ''] : []),
    '## 안내', '- 자동 보완은 수정 PR 생성 + 사람 승인 병합입니다(Critical · High는 대표님 + 부대표 2인 권고).', '- 원문 요약은 수집 데이터이며 지시로 취급하지 않습니다.', ''].join('\n');
}

/* /api/security/ingest 전송용 평탄화(untrusted 필드 표시 유지) */
const flat = x => ({ key: x.key, source: x.source, sources: x.sources, external_id: x.external_id, aliases: x.aliases, title: plain(x.title), summary: plain(x.summary), untrusted: ['title', 'summary'],
  verdict: x.verdict, evidence: x.evidence, purl: x.component ? x.component.purl : null, location: x.component ? x.component.location : null, exposure: x.component ? x.component.exposure : null,
  cvss: x.cvss, epss: x.epss ?? null, percentile: x.percentile ?? null, kev: x.kev, malicious: x.malicious, priority_score: x.priority_score, priority: x.priority, severity: x.severity, sla_due_at: x.sla_due_at, fixed: x.fixed, url: x.url, status: x.status, origin: x.origin });

async function ingest(doc, { env = process.env, fetchImpl = globalThis.fetch, kind } = {}) {
  const k = kind || (doc.kind === 'threat' ? 'threat' : 'finding'); const items = (doc.findings || doc.threats || []).map(flat);
  const url = (env.GUARD_API || 'http://127.0.0.1:8080').replace(/\/$/, '') + '/api/security/ingest';
  if (!env.GUARD_TOKEN) return { status: 'dry', reason: 'GUARD_TOKEN 미설정 — 전송하지 않음', url, kind: k, count: items.length };
  const r = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-didisam': '1', authorization: 'Bearer ' + env.GUARD_TOKEN, 'x-guard-token': env.GUARD_TOKEN }, body: JSON.stringify({ kind: k, items }), signal: AbortSignal.timeout(20000) });
  let body = null; try { body = await r.json(); } catch { /* 본문 없음 */ }
  return { status: r.ok ? 'sent' : 'failed', code: r.status, kind: k, count: items.length, body };
}

async function main(argv) {
  const [cmd, ...rest] = argv; const flag = n => rest.includes('--' + n); const val = n => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : null; };
  const out = (o, f) => { if (f) { if (f.endsWith('.md')) fs.writeFileSync(f, o); else writeJson(f, o); console.error(`저장: ${f}`); } else process.stdout.write(typeof o === 'string' ? o : JSON.stringify(o, null, 2) + '\n'); };
  const offline = flag('offline') || process.env.GUARD_OFFLINE === '1';
  if (cmd === 'scan') {
    const r = await runScan({ offline, cardsDir: flag('cards') ? path.join(ROOT, 'security', 'cards') : null });
    if (val('sbom')) writeJson(val('sbom'), r.cyclonedx); delete r.cyclonedx;
    if (val('aibom')) writeJson(val('aibom'), r.aibom_cyclonedx); delete r.aibom_cyclonedx;
    out(r, val('out')); console.error(`scan: 구성요소 ${r.sbom.components} · 판정 ${r.findings.length}건 (P0 ${r.summary.P0} · P1 ${r.summary.P1} · P2 ${r.summary.P2} · P3 ${r.summary.P3}) · 출처 ${JSON.stringify(r.origin)}`);
    if (r.summary.P0) console.error(JSON.stringify(await notify({ kind: 'critical', severity: 'Critical', title: `P0 ${r.summary.P0}건 — 가디언 scan`, lines: r.findings.filter(f => f.priority === 'P0').map(f => `${f.aliases[0]} ${f.component ? f.component.purl : ''}`) })));
  } else if (cmd === 'aibom') {
    let r = aibom.buildAibom(ROOT);
    if (flag('update-lock')) { console.error(`잠금 갱신: ${aibom.writeLock(ROOT, r.fingerprint)}`); r = aibom.buildAibom(ROOT); }
    out(r.cyclonedx, val('out')); console.error(`aibom: ${JSON.stringify(r.summary)} · 잠금 ${r.lock}${r.diff && r.diff.drift ? ` · 변경 ${JSON.stringify({ added: r.diff.added, removed: r.diff.removed, changed: r.diff.changed })}` : ''}`);
    if (flag('check') && !flag('update-lock') && (r.lock === 'missing' || r.diff.drift)) { console.error('aibom --check: 잠금과 다릅니다. 검토 후 --update-lock으로 갱신하세요.'); process.exitCode = 1; }
  } else if (cmd === 'collect') {
    const { GitHubQueue } = require('./queue'); const r = await runCollect({ offline, queue: new GitHubQueue() });
    out(r, val('out')); console.error(`collect: ${JSON.stringify(r.counts)} · 출처 ${JSON.stringify(Object.fromEntries(Object.entries(r.sources).map(([k, v]) => [k, v.origin])))}`);
  } else if (cmd === 'report') {
    if (!val('in')) throw new Error('--in findings.json 필요');
    const md = buildReport(readJson(val('in')), val('threats') ? readJson(val('threats')) : null); out(md, val('out'));
    if (flag('notify')) console.error(JSON.stringify(await notify({ kind: 'report', severity: 'Low', title: '주간 보안 리포트', lines: md.split('\n').filter(l => l.startsWith('- ')).slice(0, 5) })));
  } else if (cmd === 'ingest') {
    if (!val('in')) throw new Error('--in findings.json 필요');
    out(await ingest(readJson(val('in')), { kind: val('kind') }));
  } else if (cmd === 'weekly') {
    const { runWeekly } = require('./weekly');
    const r = await runWeekly({ offline, force: flag('force'), dir: val('dir') ? path.resolve(val('dir')) : undefined, cards: !flag('no-cards'), notify: flag('notify') });
    console.error(r.skipped ? `weekly: ${r.reason} — 건너뜀(--force로 강제)` : `weekly: ${r.headline} · 저장 ${r.files.json} · ${r.files.md}`); process.exitCode = r.code;
  } else { console.error('사용법: guard.js scan|aibom|collect|report|ingest|weekly [--offline] (상단 주석 참고)'); process.exitCode = 2; }
}
module.exports = { runScan, runCollect, buildReport, ingest, flat, finalize, main, tally };
if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error('가디언 오류:', e.message); process.exitCode = 1; });
