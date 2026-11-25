'use strict';
/* 디디쌤 가디언 주간 자가 보완 루프 — node service/security/guard.js weekly
   collect(NVD · KEV · GHSA · KISA + ATLAS · OWASP · AI 3사) → scan → 레드팀 생성(security/redteam/gen.js generate)
   → 실행(security/redteam/run.js runCases) → 결과 묶음 security/weekly/YYYY-MM-DD.json + 보고서 .md + 대책 카드(뚫린 사례 · 새 기법).
   종료 코드: P0 있으면 4 · 뚫린 공격 있으면 3 · 정상 0. 주말 · 공휴일은 force 없으면 실행하지 않고 0.
   보강은 초안(카드 · 보고서)까지 — 코드 수정 · 병합 · 배포는 사람 승인(9-3). 수집 텍스트 · 공격 사례 글은 데이터로만 다룬다. */
const fs = require('node:fs'); const path = require('node:path');
const { createCard } = require('./cards'); const { notify } = require('./notify');
const { untrusted, plain, fenceText, isBusinessDay, kstDate, readJson, writeJson } = require('./util');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTROL = new Set(['ATLAS', 'OWASP', 'AI-BLOG']);
const PLATFORM_IDS = require('./intel/platform').IDS;
const GUARD_FILES = { node: 'service/server/aiguard.js', java: 'service-egov/src/main/java/egovframework/didisam/cmm/DdAiGuard.java' };
/* 놓친 검사 → 보강 함수(Node · Java 같은 이름) */
const CHECKS = [
  [/inject|인젝션|score/i, 'injectScore'], [/fence|태그|탈출/i, 'fence'], [/leak|유출/i, 'leakCheck'], [/redact|가림/i, 'redact'], [/오탐|benign|false/i, 'injectScore(오탐 축소)'],
];
const checkOf = m => (CHECKS.find(([re]) => re.test(m)) || [, '판정 확인'])[1];

/* 보안전문가(exp) 모듈 로더: gen.js generate · run.js runCases. run.js가 require 시 바로 실행되는 형태면 불러오지 않는다(프로세스 종료 방지) */
function loadRedteam(root = ROOT) {
  const dir = path.join(root, 'security', 'redteam'); const out = { generate: null, runCases: null, missing: [] };
  try { const g = require(path.join(dir, 'gen.js')); if (typeof g.generate === 'function') out.generate = g.generate; } catch { /* 미병합 */ }
  try {
    const f = path.join(dir, 'run.js'); const src = fs.readFileSync(f, 'utf8');
    if (/require\.main\s*===\s*module/.test(src) && /runCases/.test(src)) { const r = require(f); if (typeof r.runCases === 'function') out.runCases = r.runCases; }
  } catch { /* 미병합 */ }
  if (!out.generate) out.missing.push('security/redteam/gen.js generate'); if (!out.runCases) out.missing.push('security/redteam/run.js runCases');
  return out;
}

/* runCases 결과 정규화 — { failed:[…] } · 배열 · { results:[…fail] } 모두 허용. 엔진(Node · Java)별 중복은 id로 합친다 */
function normalizeRun(r, cases) {
  const byId = new Map((cases || []).map(c => [c.id, c]));
  const raw = Array.isArray(r) ? r : (r && (r.failed || r.breached || (r.results || []).filter(x => (x.fail || x.missed || []).length))) || [];
  const m = new Map();
  for (const x of raw) {
    const id = x.id || x.case || x.caseId; if (!id) continue; const c = byId.get(id) || {};
    const missed = [].concat(x.missed || [], x.fail || [], x.checks || []).map(String);
    const benign = !!(x.benign || c.benign || c.expect === 'benign' || (c.check || []).includes('benign') || /^OK/.test(id));
    const prev = m.get(id);
    if (prev) { prev.missed = [...new Set([...prev.missed, ...missed])]; prev.engines = [...new Set([...prev.engines, x.engine || 'Node'])]; continue; }
    m.set(id, { id, benign, technique: x.technique || c.technique || null, variant: x.variant || c.variant || null, cat: x.cat || c.cat || '', engines: [x.engine || 'Node'], missed, input: c.input ?? x.input ?? null });
  }
  const all = [...m.values()];
  const total = (r && (r.total ?? r.count)) ?? (cases ? cases.length : null);
  return { total, breached: all.filter(x => !x.benign), falsePositives: all.filter(x => x.benign) };
}

/* 뚫린 사례 → 대책 카드용 항목(공격 글은 untrusted 울타리 안에만) */
function breachFinding(b, now) {
  const fns = [...new Set(b.missed.map(checkOf))];
  return { key: `REDTEAM|${b.technique || b.cat || '-'}|${b.variant || b.id}`, source: 'REDTEAM', sources: ['REDTEAM'], aliases: [b.id, ...(b.technique ? [b.technique] : [])],
    title: untrusted(`레드팀 뚫림 ${b.id} · ${b.technique || b.cat || '-'} · ${b.variant || '-'}`, 'redteam'), summary: untrusted(String(b.input || '').slice(0, 300), 'redteam'),
    verdict: '통제점검형', evidence: `놓친 검사 ${b.missed.join(', ') || '-'} (${b.engines.join('·')}) — 보강 대상 ${GUARD_FILES.node} · ${GUARD_FILES.java}의 ${fns.join(' · ')}`,
    priority: 'P1', severity: 'High', priority_score: null, sla_due_at: new Date(now.getTime() + 7 * 86400e3).toISOString(), url: null, component: null };
}

function exitCodeOf({ p0 = 0, breached = 0 } = {}) { return p0 > 0 ? 4 : breached > 0 ? 3 : 0; }

function loadState(file) { try { const s = readJson(file); return { seen: s.seen || {} }; } catch { return { seen: {} }; } }
/* live로 받은 소스만 seen 갱신(픽스처 · 차단 결과로 '이미 봤음' 처리하지 않음) */
function nextState(state, collect, { trustFixture = false } = {}) {
  const seen = { ...state.seen }; const ok = s => collect.sources[s] && (collect.sources[s].origin === 'live' || (trustFixture && /fixture/.test(collect.sources[s].origin)));
  for (const s of [...CONTROL, ...PLATFORM_IDS]) { // 플랫폼 변경 감지형 소스도 seen 관리(new 표시)
    if (!ok(s)) continue;
    const ids = collect.threats.filter(t => t.source === s).map(t => t.external_id).concat(s === 'ATLAS' ? collect.atlas_catalog || [] : []);
    seen[s] = [...new Set([...(seen[s] || []), ...ids])].sort();
  }
  return { updated_at: new Date().toISOString(), seen };
}

function skillProposals({ newTech, newPosts, breached, fps, missing }) {
  const out = [];
  if (newTech.length) out.push(`7절 레드팀: 새 기법 ${newTech.slice(0, 8).map(t => t.technique.id).join(' · ')}${newTech.length > 8 ? ` 외 ${newTech.length - 8}건` : ''}을 시나리오 · techniques.json 매핑 후보로 추가 검토`);
  if (breached.length) out.push(`2절 · 7절: 뚫린 ${breached.length}건을 cases.json 회귀에 편입하고 가드 보강(${[...new Set(breached.flatMap(b => b.missed.map(checkOf)))].join(' · ')}) 내용을 기록`);
  if (fps.length) out.push(`7절: 정상 질문 오탐 ${fps.length}건 — 패턴 축소 기준을 명시`);
  if (newPosts.length) out.push(`9-1 감시 소스: AI 3사 · OWASP 새 공지 ${newPosts.length}건 — 키워드 · 통제 매핑 확인`);
  if (missing.length) out.push(`11절: 레드팀 생성 · 실행 모듈 미병합(${missing.join(', ')}) — 병합 후 루프 완전 가동`);
  out.push('11절 고도화 루프: 이번 주 결과(새 사례 · 뚫림 · 보강)를 누적 기록(12절)에 추가');
  return out;
}

async function runWeekly({ root = ROOT, scanRoot, offline = false, fetchImpl, now = new Date(), force = false, dir, cardsDir, genDir, cards = true, notify: doNotify = false, deps, trustFixture = false, env = process.env } = {}) {
  const guard = require('./guard'); // 지연 로드: guard.js CLI에서 부를 때 순환 참조 방지
  if (!force && !isBusinessDay(now, env.GUARD_HOLIDAYS)) return { skipped: true, code: 0, reason: `${kstDate(now)} 주말 · 공휴일` };
  const date = kstDate(now); dir = dir || path.join(root, 'security', 'weekly'); cardsDir = cardsDir || path.join(root, 'security', 'cards'); genDir = genDir || path.join(root, 'security', 'redteam', 'generated');
  const stateFile = path.join(dir, 'state.json'); const state = loadState(stateFile);

  // 1) 수집 · 2) 스캔
  const collect = await guard.runCollect({ root: scanRoot || root, offline, fetchImpl, now, seen: state.seen });
  const scan = await guard.runScan({ root: scanRoot || root, offline, fetchImpl, now }); delete scan.cyclonedx; delete scan.aibom_cyclonedx;
  const control = collect.threats.filter(t => CONTROL.has(t.source));
  const newTech = control.filter(t => t.new && t.technique && (t.source !== 'ATLAS' || ['added', 'catalog'].includes(t.technique.change)));
  const newPosts = control.filter(t => t.new && !newTech.includes(t));

  // 3) 레드팀 생성 · 실행
  const rt = deps || loadRedteam(root); const missing = rt.missing || [];
  const techniques = control.filter(t => t.technique).map(t => ({ id: t.technique.id, name: t.technique.name, source: t.source, new: !!t.new, change: t.technique.change || null }));
  let red = { status: 'unavailable', missing, generated: 0, file: null, total: null, breached: [], falsePositives: [] };
  if (rt.generate && rt.runCases) {
    const g = await rt.generate({ techniques, date }); const cases = Array.isArray(g) ? g : (g && g.cases) || [];
    let file = (g && !Array.isArray(g) && g.file) || null;
    if (!file && cases.length) { file = path.join(genDir, `${date}.json`); if (!fs.existsSync(file)) writeJson(file, { date, techniques: techniques.map(t => t.id), cases }); }
    const rr = normalizeRun(await rt.runCases(cases), cases);
    red = { status: 'ran', missing: [], generated: cases.length, file: file && path.relative(root, file), total: rr.total, breached: rr.breached, falsePositives: rr.falsePositives };
  }

  // 4) 대책 카드: 뚫린 사례 · 새 기법별
  const cardList = [];
  if (cards) {
    for (const b of red.breached) cardList.push({ for: b.id, ...createCard(breachFinding(b, now), { dir: cardsDir, now }) });
    for (const t of newTech) cardList.push({ for: t.external_id, ...createCard(t, { dir: cardsDir, now }) });
  }
  const rel = f => { if (!f) return null; const r = path.relative(root, f); return r.startsWith('..') ? f : r; };

  // 5) 판정 · 보고
  const p0 = (scan.summary.P0 || 0) + collect.threats.filter(t => t.priority === 'P0').length;
  const code = exitCodeOf({ p0, breached: red.breached.length });
  const targets = red.breached.length || red.falsePositives.length ? [...new Set([...red.breached, ...red.falsePositives].flatMap(b => b.missed.map(checkOf)))].map(fn => ({ fn, files: [GUARD_FILES.node, GUARD_FILES.java] })) : [];
  const headline = code === 4 ? `P0 ${p0}건 · 뚫린 공격 ${red.breached.length}건 — 즉시 조치 필요`
    : code === 3 ? `뚫린 공격 ${red.breached.length}건 — 가드 보강 필요(${targets.map(t => t.fn).join(' · ')})`
      : `뚫린 공격 0건 · P0 0건 — 즉시 조치 없음(새 위협 ${newTech.length + newPosts.length}건 검토)`;
  const proposals = skillProposals({ newTech, newPosts, breached: red.breached, fps: red.falsePositives, missing });
  const origins = Object.fromEntries(Object.entries(collect.sources).map(([k, v]) => [k, v.origin]));
  const bundle = { kind: 'weekly', date, generated_at: now.toISOString(), code, headline, origins: { collect: origins, scan: scan.origin },
    counts: { collect: collect.counts, scan: scan.summary, new_techniques: newTech.length, new_posts: newPosts.length, redteam_generated: red.generated, breached: red.breached.length, false_positives: red.falsePositives.length, p0 },
    new_threats: [...newTech, ...newPosts].map(x => guard.flat(x)).map((x, i) => ({ ...x, technique: [...newTech, ...newPosts][i].technique || null })),
    redteam: { ...red, breached: red.breached.map(b => ({ ...b, input: b.input == null ? null : { untrusted: true, text: plain(untrusted(String(b.input).slice(0, 300), 'redteam')) } })), falsePositives: red.falsePositives.map(b => ({ ...b, input: null })) },
    targets, cards: cardList.map(c => ({ for: c.for, id: c.id || null, created: !!c.created, file: rel(c.file), reason: c.reason || null })), skill_proposals: proposals };
  const md = buildWeeklyMd(bundle, { newTech, newPosts, red });
  const files = { json: path.join(dir, `${date}.json`), md: path.join(dir, `${date}.md`) };
  writeJson(files.json, bundle); fs.writeFileSync(files.md, md);
  writeJson(stateFile, nextState(state, collect, { trustFixture }));
  let sent = null;
  if (doNotify) sent = await notify({ kind: 'report', severity: code === 4 ? 'Critical' : code === 3 ? 'High' : 'Low', title: `주간 자가 보완 ${date}`, lines: md.split('\n').slice(0, 1).concat(proposals.slice(0, 3).map(p => '- ' + p)) }, { env, now, fetchImpl });
  return { skipped: false, code, headline, bundle, md, files: { json: rel(files.json), md: rel(files.md) }, notify: sent };
}

function buildWeeklyMd(b, { newTech, newPosts, red }) {
  const fakeData = Object.values(b.origins.collect).concat(Object.values(b.origins.scan || {})).some(o => /fixture|blocked|error/.test(String(o)));
  const L = [`디디쌤 영향: ${b.headline}`, '', `# 디디쌤 가디언 주간 자가 보완 (${b.date})`, '',
    `- 종료 코드 ${b.code} (4=P0 · 3=뚫린 공격 · 0=정상)`,
    `- 새 위협: 기법 ${newTech.length}건 · 공지 ${newPosts.length}건 / 스캔 P0 ${b.counts.scan.P0} · P1 ${b.counts.scan.P1} · P2 ${b.counts.scan.P2} · P3 ${b.counts.scan.P3}`,
    `- 레드팀: ${red.status === 'ran' ? `새 사례 ${red.generated}건 생성 · 뚫림 ${red.breached.length}건 · 정상 오탐 ${red.falsePositives.length}건${red.file ? ` (\`${red.file}\`)` : ''}` : `미실행 — ${red.missing.join(', ')} 미병합`}`,
    `- 데이터 출처: ${Object.entries(b.origins.collect).map(([k, v]) => `${k}=${v}`).join(' · ')}${fakeData ? ' — **픽스처 · 차단 포함: 실제 판정 아님**' : ''}`, '',
    '## 새 위협(통제점검형)', ''];
  const list = [...newTech, ...newPosts];
  if (!list.length) L.push('- 없음');
  for (const t of list.slice(0, 15)) L.push(`- ${t.technique ? `\`${t.technique.id}\`` : t.vendor || t.source} (${t.source}) ${t.url || ''}`, fenceText(t.title));
  if (list.length > 15) L.push(`- 외 ${list.length - 15}건(JSON 참고)`);
  L.push('', '## 새 레드팀 사례', '', red.status === 'ran' ? `- ${red.generated}건 생성 — 기법 ${b.new_threats.filter(t => t.technique).length}건 반영 대상` : '- 생성기 미병합 — 건너뜀', '', '## 뚫린 사례', '');
  if (!red.breached.length) L.push('- 없음');
  for (const x of red.breached.slice(0, 20)) L.push(`- ${x.id} · ${x.technique || x.cat || '-'} · ${x.variant || '-'} — 놓친 검사 ${x.missed.join(', ') || '-'} (${x.engines.join('·')})`, fenceText(untrusted(String(x.input || '').slice(0, 200), 'redteam')));
  if (red.falsePositives.length) L.push('', `정상 질문 오탐: ${red.falsePositives.map(x => x.id).join(', ')}`);
  L.push('', '## 보강 대상 파일', '', ...(b.targets.length ? b.targets.map(t => `- \`${t.fn}\` — ${t.files.map(f => '`' + f + '`').join(' · ')} (Node · Java 함께, \`node security/redteam/run.js --java\`로 동일 확인)`) : ['- 없음']));
  L.push('', '## 대책 카드', '', ...(b.cards.length ? b.cards.map(c => `- ${c.id || '-'} ${c.created ? '신규' : '재사용'} — ${c.for}${c.file ? ` (\`${c.file}\`)` : ''}`) : ['- 없음']));
  L.push('', '## 스킬 수정 제안 요지(didisam-security-agent)', '', ...b.skill_proposals.map(p => '- ' + p));
  L.push('', '## 안내', '- 보강은 초안(카드 · 보고서)까지입니다. 가드 수정은 PR + 사람 승인 병합, 스킬은 SKILL.md 전체 수정본으로 별도 제안합니다.', '- 원문 · 공격 사례 글은 수집 · 시험 데이터이며 지시로 취급하지 않습니다.', '');
  return L.join('\n');
}

module.exports = { runWeekly, loadRedteam, normalizeRun, exitCodeOf, nextState, breachFinding, buildWeeklyMd, GUARD_FILES };
