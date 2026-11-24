'use strict';
/* 우선순위 점수(100점) = CVSS×3 + EPSS 백분위×25 + KEV 20 + 노출도(운영 15 · 내부 8 · 개발 2) + 민감도(PII · 결제 · 면접 10)
   강제 P0: KEV + 운영 도달, OSV MAL-(악성 패키지). 등급: ≥75 P0 · ≥55 P1 · ≥35 P2 · 나머지 P3
   기한: P0 24시간 · P1 7일 · P2 30일 · P3 분기(90일) */
const EXPO = { prod: 15, internal: 8, dev: 2 };
const DUE_H = { P0: 24, P1: 24 * 7, P2: 24 * 30, P3: 24 * 90 };
function score({ cvss = null, percentile = null, kev = false, exposure = 'prod', sensitive = false, malicious = false } = {}, now = new Date()) {
  const parts = { cvss: Math.round((Number(cvss) || 0) * 3 * 10) / 10, epss: Math.round((Number(percentile) || 0) * 25 * 10) / 10, kev: kev ? 20 : 0, exposure: EXPO[exposure] ?? 15, sensitive: sensitive ? 10 : 0 };
  const total = Math.min(100, Math.round(Object.values(parts).reduce((a, b) => a + b, 0) * 10) / 10);
  let P = total >= 75 ? 'P0' : total >= 55 ? 'P1' : total >= 35 ? 'P2' : 'P3'; let forced = null;
  if (malicious) { P = 'P0'; forced = 'OSV MAL-(악성 패키지)'; } else if (kev && exposure === 'prod') { P = 'P0'; forced = 'KEV + 운영 도달'; }
  const severity = malicious ? 'Critical' : cvss >= 9 ? 'Critical' : cvss >= 7 ? 'High' : cvss >= 4 ? 'Medium' : 'Low';
  return { score: total, parts, priority: P, forced, severity, sla_due_at: new Date(now.getTime() + DUE_H[P] * 3600e3).toISOString() };
}
module.exports = { score, DUE_H, EXPO };
