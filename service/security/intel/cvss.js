'use strict';
/* CVSS 3.x 기본 점수 계산(벡터 → 0~10). 4.0 벡터나 계산 불가 시 등급 라벨로 근사 */
const W = { AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }, AC: { L: 0.77, H: 0.44 }, UI: { N: 0.85, R: 0.62 }, C: { H: 0.56, L: 0.22, N: 0 }, I: { H: 0.56, L: 0.22, N: 0 }, A: { H: 0.56, L: 0.22, N: 0 } };
const roundup = x => { const i = Math.round(x * 100000); return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10; };
function cvss3(vector) {
  if (!/^CVSS:3\.[01]\//.test(vector || '')) return null;
  const m = Object.fromEntries(vector.split('/').slice(1).map(p => p.split(':')));
  const S = m.S === 'C'; const PR = { N: 0.85, L: S ? 0.68 : 0.62, H: S ? 0.5 : 0.27 }[m.PR];
  const vals = [W.AV[m.AV], W.AC[m.AC], PR, W.UI[m.UI], W.C[m.C], W.I[m.I], W.A[m.A]]; if (vals.some(v => v == null)) return null;
  const iss = 1 - (1 - W.C[m.C]) * (1 - W.I[m.I]) * (1 - W.A[m.A]);
  const imp = S ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  const expl = 8.22 * W.AV[m.AV] * W.AC[m.AC] * PR * W.UI[m.UI];
  if (imp <= 0) return 0;
  return S ? roundup(Math.min(1.08 * (imp + expl), 10)) : roundup(Math.min(imp + expl, 10));
}
const LABEL = { CRITICAL: 9.5, HIGH: 7.5, MODERATE: 5.5, MEDIUM: 5.5, LOW: 2.5 };
const fromLabel = l => LABEL[String(l || '').toUpperCase()] ?? null;
module.exports = { cvss3, fromLabel };
