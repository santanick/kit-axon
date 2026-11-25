'use strict';
/* 가디언 운영 지표(KPI) — security.* 표에서 한 번의 SQL로 계산한다. Java SecMapper.xml의 kpi와 같은 SQL(값 · 형태 동일).
   - mttdH  평균 탐지 시간(시간) = Finding 생성 − 위협 공개(threat_item.published_at), 공개 이전 생성(음수)은 제외
   - mttrH  평균 조치 시간(시간) = fixed 된 Finding의 resolved_at − created_at
   - slaOverHigh  고위험(P0 · P1) 미해결 중 SLA 기한 초과 수
   - prCreated · prMerged · prAdoption  자동 수정 PR 생성 수 · 병합 수 · 채택률(병합 ÷ 생성, 생성 0이면 null)
   - findings · falsePositive · falsePositiveRate  전체 Finding · '해당 없음 · 오탐'(false_positive) 수 · 오탐률(÷ 전체, 0이면 null)
   비율은 소수 셋째 자리, 시간은 첫째 자리 반올림. 기간 제한 없음(누적). */
const SQL = `select json_build_object(
  'mttdH', (select round((avg(extract(epoch from f.created_at - t.published_at)) / 3600)::numeric, 1)::float8 from security.finding f join security.threat_item t on t.id = f.threat_id where t.published_at is not null and f.created_at >= t.published_at),
  'mttrH', (select round((avg(extract(epoch from resolved_at - created_at)) / 3600)::numeric, 1)::float8 from security.finding where status = 'fixed' and resolved_at is not null),
  'slaOverHigh', (select count(*)::int from security.finding where status not in ('fixed','accepted','false_positive') and priority in ('P0','P1') and sla_due_at < now()),
  'prCreated', (select count(*)::int from security.fix_pr),
  'prMerged', (select count(*)::int from security.fix_pr where status = 'merged'),
  'prAdoption', (select case when count(*) = 0 then null else round((count(*) filter (where status = 'merged'))::numeric / count(*), 3)::float8 end from security.fix_pr),
  'findings', (select count(*)::int from security.finding),
  'falsePositive', (select count(*)::int from security.finding where status = 'false_positive'),
  'falsePositiveRate', (select case when count(*) = 0 then null else round((count(*) filter (where status = 'false_positive'))::numeric / count(*), 3)::float8 end from security.finding)
)::text k`;
const KEYS = ['mttdH', 'mttrH', 'slaOverHigh', 'prCreated', 'prMerged', 'prAdoption', 'findings', 'falsePositive', 'falsePositiveRate'];
async function kpi(db) { const r = (await db.query(SQL)).rows[0]; return JSON.parse(r.k); }

/* 보안 홈 종합 점수 — security/score.js와 같은 식: ① 남은 취약점(DB 미해결 Finding) · ② 필수 체크리스트 · ③ 인증 기준 통제
   ②③은 빌드 시 만든 스냅숏(SECURITY_SCORE_FILE, security/score.js --snapshot)에서 읽는다. 없으면 ①만(source 'vuln_only'). Java SecServiceImpl.scoreOf와 같은 식 */
const W = { P0: 25, P1: 10, P2: 3, P3: 1 };
function readSnapshot(file) {
  if (!file) return null;
  try { const s = JSON.parse(require('node:fs').readFileSync(file, 'utf8')); return typeof s.checklist === 'number' ? s : null; } catch { return null; }
}
function scoreOf(p, snap) {
  const vuln = Math.max(0, 100 - (p.P0 * W.P0 + p.P1 * W.P1 + p.P2 * W.P2 + p.P3 * W.P3));
  if (!snap) return { score: vuln, parts: { vuln, checklist: null, cert: null, source: 'vuln_only', at: null } };
  const c = Math.round(snap.checklist), k = typeof snap.cert === 'number' ? Math.round(snap.cert) : null;
  const score = k == null ? Math.round((vuln + c) / 2) : Math.round((vuln + c + k) / 3);
  return { score, parts: { vuln, checklist: snap.checklist, cert: k == null ? null : snap.cert, source: 'snapshot', at: snap.at || null } };
}
module.exports = { SQL, KEYS, kpi, scoreOf, readSnapshot, W };
