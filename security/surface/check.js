#!/usr/bin/env node
/* 디디쌤 가디언 — 외부 노출면 주간 점검(비공격 · Node 내장만)
   ① crt.sh 인증서 투명성 로그로 서브도메인 목록 ② 응답 헤더(Server · X-Powered-By 버전 노출, HSTS) ③ TLS 협상 버전 · 구버전(TLS 1.0/1.1) 허용 · 인증서 만료
   사용: SURFACE_DOMAINS="didisam.com,example.kr" node security/surface/check.js --out surface.json [--known a.didisam.com,b.didisam.com] [--max 30]
         대상이 없으면 건너뜁니다(종료 0). 결과는 가디언 ingest 형식({kind:'finding', findings}) — guard.js ingest --in surface.json --kind finding
   실패 기준(--fail-on critical): 인증서 만료(P0)만 종료 코드 1. 나머지는 보고만.
   원칙: GET 1회 · TLS 핸드셰이크만(취약점 공격 · 포트 스캔 없음). crt.sh 응답은 외부 데이터 — 호스트 이름 형식만 통과시키고 지시로 다루지 않습니다. */
'use strict';
const fs = require('fs');
const tls = require('tls');
const https = require('https');

const HOST_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const DAY = 86400000;

/* crt.sh JSON → 대상 도메인 아래 호스트 이름(와일드카드 · 형식 불량 · 다른 도메인 제외) */
function parseCrt(rows, domain) {
  const d = String(domain).toLowerCase(); const out = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    for (const n of String((r && r.name_value) || '').toLowerCase().split(/\s+/)) {
      const h = n.replace(/^\*\./, '');
      if (HOST_RE.test(h) && (h === d || h.endsWith('.' + d))) out.add(h);
    }
  }
  return [...out].sort();
}

async function crtsh(domain, { fetchImpl = globalThis.fetch, timeout = 30000 } = {}) {
  const r = await fetchImpl(`https://crt.sh/?q=${encodeURIComponent('%.' + domain)}&output=json`, { headers: { 'user-agent': 'didisam-guardian-surface/1' }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error('crt.sh HTTP ' + r.status);
  const text = await r.text(); if (text.length > 20 * 1024 * 1024) throw new Error('crt.sh 응답이 너무 큽니다');
  return parseCrt(JSON.parse(text), domain);
}

function tlsProbe(host, { timeout = 8000, legacy = false } = {}) {
  return new Promise(resolve => {
    const opt = { host, port: 443, servername: host, rejectUnauthorized: false, timeout };
    if (legacy) Object.assign(opt, { minVersion: 'TLSv1', maxVersion: 'TLSv1.1', ciphers: 'DEFAULT@SECLEVEL=0' });
    let done = false; const fin = v => { if (!done) { done = true; try { s.destroy(); } catch { /* 닫힘 */ } resolve(v); } };
    const s = tls.connect(opt, () => {
      const c = s.getPeerCertificate() || {};
      fin({ ok: true, protocol: s.getProtocol(), authorized: s.authorized, authError: s.authorizationError ? String(s.authorizationError) : null, validTo: c.valid_to || null, issuer: c.issuer ? (c.issuer.O || c.issuer.CN || null) : null });
    });
    s.on('error', e => fin({ ok: false, error: e.code || e.message })); s.on('timeout', () => fin({ ok: false, error: 'timeout' }));
  });
}

function headProbe(host, { timeout = 8000 } = {}) {
  return new Promise(resolve => {
    const req = https.request({ host, port: 443, path: '/', method: 'GET', servername: host, rejectUnauthorized: false, timeout, headers: { 'user-agent': 'didisam-guardian-surface/1' } }, res => {
      const h = res.headers; res.resume();
      resolve({ ok: true, status: res.statusCode, server: h.server || null, poweredBy: h['x-powered-by'] || null, hsts: h['strict-transport-security'] || null });
    });
    req.on('error', e => resolve({ ok: false, error: e.code || e.message })); req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); }); req.end();
  });
}

const VER_RE = /\d+\.\d+/;
const f = (host, check, severity, priority, title, ev) => ({ key: `surface:${check}:${host}`, origin: 'surface', source: 'surface', title: String(title).slice(0, 300), severity, priority,
  score: ({ P0: 95, P1: 70, P2: 45, P3: 20 })[priority], priority_score: ({ P0: 95, P1: 70, P2: 45, P3: 20 })[priority], evidence: { check, host, ...ev }, untrusted: ['title'] });

/* 호스트 1개의 관측값 → findings(순수 함수 · 시험 대상) */
function assess(r, { now = Date.now(), known = null } = {}) {
  const out = []; const h = r.host;
  if (known && !known.has(h)) out.push(f(h, 'new-host', 'medium', 'P2', `목록에 없는 공개 호스트: ${h}(인증서 투명성 로그)`, { action: '자산 목록(SURFACE_KNOWN)에 등록하거나 폐기합니다.' }));
  if (!r.tls || !r.tls.ok) return out; // 응답 없음(내부 · 폐기 호스트) — 기록만
  if (r.tls.validTo) {
    const left = Math.floor((Date.parse(r.tls.validTo) - now) / DAY);
    if (left < 0) out.push(f(h, 'cert-expired', 'critical', 'P0', `인증서 만료(${-left}일 지남): ${h}`, { validTo: r.tls.validTo }));
    else if (left < 14) out.push(f(h, 'cert-expiring', 'high', 'P1', `인증서 만료 임박(${left}일 남음): ${h}`, { validTo: r.tls.validTo }));
  }
  if (r.tls.authError && !/CERT_HAS_EXPIRED/.test(r.tls.authError)) out.push(f(h, 'cert-invalid', 'high', 'P1', `인증서 검증 실패(${r.tls.authError}): ${h}`, { issuer: r.tls.issuer }));
  if (/^TLSv1(\.1)?$/.test(r.tls.protocol || '')) out.push(f(h, 'tls-old-default', 'high', 'P1', `기본 협상이 ${r.tls.protocol}: ${h}`, { protocol: r.tls.protocol }));
  if (r.legacy && r.legacy.ok) out.push(f(h, 'tls-legacy', 'high', 'P1', `구버전 TLS 허용(${r.legacy.protocol}): ${h}`, { protocol: r.legacy.protocol, action: 'TLS 1.2 이상만 허용합니다(Cloud Run · LB 정책 MODERN/RESTRICTED).' }));
  if (r.http && r.http.ok) {
    if (r.http.server && VER_RE.test(r.http.server)) out.push(f(h, 'hdr-server', 'low', 'P3', `Server 헤더 버전 노출: ${h}`, { value: String(r.http.server).slice(0, 80) }));
    if (r.http.poweredBy) out.push(f(h, 'hdr-powered-by', 'low', 'P3', `X-Powered-By 헤더 노출: ${h}`, { value: String(r.http.poweredBy).slice(0, 80) }));
    if (!r.http.hsts) out.push(f(h, 'hdr-hsts', 'medium', 'P2', `HSTS 헤더 없음: ${h}`, { status: r.http.status }));
  }
  return out;
}

async function run({ domains, known = null, max = 30, probe = { crtsh, tlsProbe, headProbe }, now = Date.now() } = {}) {
  const hosts = new Set(); const notes = [];
  for (const d of domains) {
    hosts.add(d);
    try { for (const h of await probe.crtsh(d)) hosts.add(h); } catch (e) { notes.push(`crt.sh 미연결(${d}): ${String(e.message || e).slice(0, 120)} — 루트 도메인만 점검`); }
  }
  const list = [...hosts].sort().slice(0, max); if (hosts.size > max) notes.push(`호스트 ${hosts.size}개 중 ${max}개만 점검(--max)`);
  const results = []; const findings = [];
  for (const host of list) {
    const r = { host, tls: await probe.tlsProbe(host) };
    if (r.tls.ok) { r.legacy = await probe.tlsProbe(host, { legacy: true }); r.http = await probe.headProbe(host); }
    results.push(r); findings.push(...assess(r, { now, known }));
  }
  const summary = { hosts: list.length, reachable: results.filter(r => r.tls.ok).length, P0: 0, P1: 0, P2: 0, P3: 0 }; for (const x of findings) summary[x.priority]++;
  return { kind: 'finding', tool: 'surface/check.js', generated_at: new Date(now).toISOString(), domains, summary, notes, hosts: results.map(r => ({ host: r.host, reachable: r.tls.ok, protocol: r.tls.protocol || null, validTo: r.tls.validTo || null, legacy: !!(r.legacy && r.legacy.ok), server: r.http ? r.http.server : null })), findings };
}

const list = s => String(s || '').split(/[\s,]+/).map(x => x.trim().toLowerCase()).filter(Boolean);

async function main(argv, env = process.env) {
  const val = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  const domains = list(val('domains') || env.SURFACE_DOMAINS).filter(d => HOST_RE.test(d));
  if (!domains.length) { console.error('외부 노출면: 대상(vars.SURFACE_DOMAINS)이 없습니다 — 건너뜀'); return 0; }
  const knownList = list(val('known') || env.SURFACE_KNOWN);
  const r = await run({ domains, known: knownList.length ? new Set([...knownList, ...domains]) : null, max: Math.max(1, Math.min(200, Number(val('max')) || 30)) });
  const text = JSON.stringify(r, null, 2) + '\n'; if (val('out')) fs.writeFileSync(val('out'), text); else process.stdout.write(text);
  console.error(`외부 노출면: 호스트 ${r.summary.hosts}(응답 ${r.summary.reachable}) · P0 ${r.summary.P0} · P1 ${r.summary.P1} · P2 ${r.summary.P2} · P3 ${r.summary.P3}${r.notes.length ? ' · ' + r.notes.join(' / ') : ''}`);
  return val('fail-on') === 'critical' && r.summary.P0 ? 1 : 0;
}

if (require.main === module) main(process.argv.slice(2)).then(c => { process.exitCode = c; }, e => { console.error('외부 노출면 점검 오류:', e.message); process.exitCode = 2; });
module.exports = { parseCrt, assess, run, main, tlsProbe, headProbe };
