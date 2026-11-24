#!/usr/bin/env node
/* 디디쌤 가디언 보안 점수 — 발견 원장(security/findings/seed.json) + 필수 체크리스트 15 + 인증 기준 통제 27(security/checklist.json)
 *
 *   ① 남은 취약점 = 100 − (P0×25 + P1×10 + P2×3 + P3×1)   (0 미만은 0)
 *      남은 것 = status가 fixed · accepted가 아닌 항목(open · partial · needs_verify는 모두 감점 — 일부 조치는 점수에 넣지 않음)
 *      우선순위 = 항목의 priority, 없으면 심각도(critical P0 · high P1 · medium P2 · low · info P3)
 *   ② 필수 체크리스트 = (충족 1 + 부분 0.5 + 미흡 0) ÷ 15 × 100
 *   ③ 인증 기준 통제 = (충족 1 + 부분 0.5 + 미흡 · 확인 필요 0) ÷ 27 × 100
 *      27개 = 인증 크로스체크(2026-11-25) 3절 #1~27 — 개인정보 안전성 확보조치 고시 · ISMS-P · KISA 2026 웹 21항목 · GS · 교육부 필수기준을 한 줄로 묶은 통제
 *   종합 = (① + ② + ③) ÷ 3   — 각각 반올림한 값으로 평균하고 다시 반올림합니다(화면 · 보고 표기와 같게). cert 표가 없으면 (① + ②) ÷ 2(이전 판 호환).
 *
 * 정직성 검사(위반이면 종료 코드 2): 체크리스트 15항목 · id 01~15, status는 충족 · 부분 · 미흡만,
 * 충족에는 evidence가 1개 이상이고 그 파일이 저장소에 있어야 함, 원장의 priority · status 값 확인.
 * in_progress(다른 브랜치에서 진행 중)는 점수에 넣지 않고 목록으로만 보여 줍니다.
 * 인증 기준 정직성: cert 27개 · no 1~27, 충족은 evidence 필수, 미흡 · 부분 · 확인 필요는 원장 항목(finding)이 있어야 하고 그 항목이 끝난 상태(fixed · accepted)면 안 됨,
 * 체크리스트 항목의 cert 연결에 미흡 · 확인 필요가 하나라도 있으면 그 항목은 충족일 수 없음(점수가 인증 기준과 어긋나지 않게).
 *
 * 사용: node security/score.js [--json] [--gate 95] [--seed 경로] [--checklist 경로]
 *   --gate N  종합이 N 미만이면 종료 코드 1(CI · 배포 전 게이트용)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const W = { P0: 25, P1: 10, P2: 3, P3: 1 };
const SEV = { critical: 'P0', high: 'P1', medium: 'P2', low: 'P3', info: 'P3' };
const DONE = new Set(['fixed', 'accepted']);
const STATUSES = new Set(['open', 'partial', 'needs_verify', 'fixed', 'accepted']);
const CK = { '충족': 1, '부분': 0.5, '미흡': 0 };
const CERT = { '충족': 1, '부분': 0.5, '미흡': 0, '확인 필요': 0 };
const CERT_N = 27;

function priorityOf(f) { return f.priority || SEV[String(f.severity || '').toLowerCase()] || null; }

/** 원장 → ① */
function vulnScore(seed) {
  const errors = []; const left = [];
  for (const f of seed.items || []) {
    const p = priorityOf(f);
    if (!W[p]) errors.push(`${f.id}: 우선순위를 정할 수 없습니다(priority · severity 확인)`);
    if (!STATUSES.has(f.status)) errors.push(`${f.id}: 알 수 없는 status '${f.status}'`);
    if (!DONE.has(f.status) && W[p]) left.push({ id: f.id, priority: p, status: f.status, title: f.title, deduct: W[p] });
  }
  left.sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
  const deduct = left.reduce((s, x) => s + x.deduct, 0);
  const count = { P0: 0, P1: 0, P2: 0, P3: 0 }; left.forEach(x => count[x.priority]++);
  return { score: Math.max(0, 100 - deduct), deduct, count, left, errors };
}

/** 체크리스트 → ② */
function checklistScore(ck, root = ROOT) {
  const errors = []; const items = ck.items || [];
  if (items.length !== 15) errors.push(`체크리스트는 15항목이어야 합니다(현재 ${items.length})`);
  const want = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0'));
  const ids = items.map(x => x.id);
  want.forEach(id => { if (!ids.includes(id)) errors.push(`체크리스트 ${id} 항목이 없습니다`); });
  let sum = 0; const tally = { '충족': 0, '부분': 0, '미흡': 0 }; const progress = [];
  for (const x of items) {
    if (!(x.status in CK)) { errors.push(`${x.id}: status는 충족 · 부분 · 미흡만 씁니다('${x.status}')`); continue; }
    tally[x.status]++; sum += CK[x.status];
    const ev = Array.isArray(x.evidence) ? x.evidence : [];
    if (x.status === '충족' && !ev.length) errors.push(`${x.id}: 근거(evidence) 없는 충족입니다`);
    for (const e of ev) { const file = String(e).split(':')[0]; if (!fs.existsSync(path.join(root, file))) errors.push(`${x.id}: 근거 파일이 없습니다 — ${file}`); }
    if (x.status !== '충족' && !String(x.remaining || '').trim()) errors.push(`${x.id}: ${x.status}인데 남은 것(remaining)이 비었습니다`);
    if (x.in_progress) progress.push({ id: x.id, title: x.title, status: x.status, ...x.in_progress });
  }
  return { score: Math.round(sum / 15 * 1000) / 10, tally, progress, errors };
}

/** 인증 기준 통제 → ③ (seed가 있으면 원장 연결도 확인) */
function certScore(ck, seed, root = ROOT) {
  const errors = []; const items = ck.cert || []; const tally = { '충족': 0, '부분': 0, '미흡': 0, '확인 필요': 0 }; let sum = 0;
  if (items.length !== CERT_N) errors.push(`인증 기준 통제는 ${CERT_N}개여야 합니다(현재 ${items.length})`);
  const nos = items.map(x => x.no);
  for (let i = 1; i <= CERT_N; i++) if (!nos.includes(i)) errors.push(`인증 기준 통제 #${i}이 없습니다`);
  const F = new Map(((seed && seed.items) || []).map(f => [f.id, f]));
  for (const x of items) {
    if (!(x.status in CERT)) { errors.push(`#${x.no}: status는 충족 · 부분 · 미흡 · 확인 필요만 씁니다('${x.status}')`); continue; }
    tally[x.status]++; sum += CERT[x.status];
    const ev = Array.isArray(x.evidence) ? x.evidence : [];
    if (x.status === '충족' && !ev.length) errors.push(`#${x.no}: 근거(evidence) 없는 충족입니다`);
    for (const e of ev) { const file = String(e).split(':')[0]; if (!fs.existsSync(path.join(root, file))) errors.push(`#${x.no}: 근거 파일이 없습니다 — ${file}`); }
    if (x.status !== '충족' && seed) {
      const f = F.get(x.finding);
      if (!f) errors.push(`#${x.no}: ${x.status}인데 원장 항목(finding)이 없습니다`);
      else if (DONE.has(f.status)) errors.push(`#${x.no}: ${x.status}인데 원장 ${f.id}가 ${f.status}입니다(둘 중 하나를 고치십시오)`);
    }
  }
  const byNo = new Map(items.map(x => [String(x.no), x]));
  for (const c of ck.items || []) {
    const links = (c.cert || []).map(n => byNo.get(String(n))).filter(Boolean);
    const weak = links.filter(x => x.status === '미흡' || x.status === '확인 필요');
    if (c.status === '충족' && weak.length) errors.push(`체크리스트 ${c.id}: 충족인데 연결된 인증 통제 ${weak.map(x => '#' + x.no).join(' · ')}가 ${weak[0].status}입니다`);
  }
  return { score: items.length ? Math.round(sum / CERT_N * 1000) / 10 : null, tally, errors };
}

function total(v, c, k) {
  if (!k || k.score == null) return Math.round((Math.round(v.score) + Math.round(c.score)) / 2);
  return Math.round((Math.round(v.score) + Math.round(c.score) + Math.round(k.score)) / 3);
}

function report(seedPath, ckPath) {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const ck = JSON.parse(fs.readFileSync(ckPath, 'utf8'));
  const v = vulnScore(seed); const c = checklistScore(ck); const k = ck.cert ? certScore(ck, seed) : null;
  return { vuln: v, checklist: c, cert: k, total: total(v, c, k), errors: [...v.errors, ...c.errors, ...(k ? k.errors : [])] };
}

function main(argv) {
  const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const seedPath = path.resolve(arg('--seed') || path.join(ROOT, 'security/findings/seed.json'));
  const ckPath = path.resolve(arg('--checklist') || path.join(ROOT, 'security/checklist.json'));
  const r = report(seedPath, ckPath);
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  else {
    const v = r.vuln, c = r.checklist, k = r.cert, L = [];
    L.push(k ? `디디쌤 가디언 보안 점수 — 종합 ${r.total}점 = (① ${Math.round(v.score)} + ② ${Math.round(c.score)} + ③ ${Math.round(k.score)}) ÷ 3`
      : `디디쌤 가디언 보안 점수 — 종합 ${r.total}점 = (① ${Math.round(v.score)} + ② ${Math.round(c.score)}) ÷ 2`);
    L.push(`① 남은 취약점 ${v.score}점 = 100 − ${v.deduct} (P0 ${v.count.P0} · P1 ${v.count.P1} · P2 ${v.count.P2} · P3 ${v.count.P3})`);
    v.left.forEach(x => L.push(`   ${x.priority} −${x.deduct}  ${x.id} [${x.status}] ${x.title}`));
    L.push(`② 필수 체크리스트 ${c.score}점 = 충족 ${c.tally['충족']} · 부분 ${c.tally['부분']} · 미흡 ${c.tally['미흡']} / 15`);
    if (k) L.push(`③ 인증 기준 통제 ${k.score}점 = 충족 ${k.tally['충족']} · 부분 ${k.tally['부분']} · 미흡 ${k.tally['미흡']} · 확인 필요 ${k.tally['확인 필요']} / ${CERT_N}`);
    if (c.progress.length) { L.push('진행 중(점수 미반영 — 병합 후 갱신)'); c.progress.forEach(p => L.push(`   ${p.id} ${p.status} → ${p.owner}(${p.branch}): ${p.expect}`)); }
    if (r.errors.length) { L.push('정직성 검사 위반'); r.errors.forEach(e => L.push('   ' + e)); }
    process.stdout.write(L.join('\n') + '\n');
  }
  if (r.errors.length) return 2;
  const g = arg('--gate'); if (g != null && r.total < Number(g)) return 1;
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { vulnScore, checklistScore, certScore, total, report, priorityOf, W, CERT_N };
