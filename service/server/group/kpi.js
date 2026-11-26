'use strict';
/* 통합 센터 KPI(spec 2-4 · 1-7 · 5-2) — 순수 함수. 서버 집계 · 대시보드 응답 · 화면 시연 자료가 같은 규칙을 쓴다.
   하루 행 v(가리기 전 원래 수): 상태 값(그날 기준) lrn · act(최근 28일 활동) · enr · cmp · cmpBase(종료 과정 수강) · progSum · progN · crs
                                 흐름 값(그날 하루) new · aiCalls · aiTok · rev
   기간 값 = 상태 값은 기간 마지막 날 행, 흐름 값은 기간 합. 동의하지 않은 키는 하루 행에 아예 없다. */
const KPIS = ['lrn', 'new', 'act', 'enr', 'cmp', 'cmpRateBp', 'progBp', 'crs', 'aiCalls', 'aiTok', 'rev'];
const PEOPLE = ['lrn', 'new', 'act', 'enr', 'cmp'];
const STATE = ['lrn', 'act', 'enr', 'cmp', 'cmpEnd', 'cmpBase', 'progSum', 'progN', 'crs'];
const FLOW = ['new', 'aiCalls', 'aiTok', 'rev'];
const CONSENT = { aiCalls: 'ai', aiTok: 'ai', rev: 'revenue' };
const UNDER5 = '5명 미만';
const day = s => String(s || '').slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

/* 기관 문서 → 그날 하루 행(상태 값 + 신규). 이름 · 연락처는 읽지 않는다 */
function fromDoc(doc, d) {
  const D = doc || {}; const C = Array.isArray(D.classes) ? D.classes : []; const M = (Array.isArray(D.members) ? D.members : []).filter(m => m && !m.withdrawn);
  const since = addDays(d, -27); const L = new Set(M.map(m => m.id)); let enr = 0, cmp = 0, cmpEnd = 0, cmpBase = 0, progSum = 0, progN = 0; const act = new Set();
  for (const c of C) { if (!c || typeof c !== 'object') continue; const ids = Array.isArray(c.learners) ? c.learners : []; const ended = !!(c.end && day(c.end) < d) || /종료|마감/.test(String(c.status || ''));
    for (const id of ids) { L.add(id); enr++; const p = ((c.prog || {})[id]) || {}; const pv = Math.max(0, Math.min(100, +p.p || 0)); const done = !!p.done || pv >= 100 || !!(c.done && c.done[id]);
      if (done) cmp++; if (ended) { cmpBase++; if (done) cmpEnd++; } else if (!done) { progSum += pv; progN++; } if (p.at && day(p.at) >= since && day(p.at) <= d) act.add(id); } }
  for (const m of M) if (m.last && day(m.last) >= since && day(m.last) <= d) act.add(m.id);
  return { lrn: L.size, act: act.size, enr, cmp, cmpEnd, cmpBase, progSum, progN, crs: C.length, new: M.filter(m => day(m.joined || m.at) === d).length };
}
/* 대학 학번 묶음(통합 학습자) — 학번 숫자 · 학과 · 수강 · 이수 수만 */
function lxRows(doc) {
  const D = doc || {}; const C = Array.isArray(D.classes) ? D.classes : []; const codes = new Map((Array.isArray(D.codes) ? D.codes : []).map(x => [x && x.sid, x && x.dept]));
  return (Array.isArray(D.members) ? D.members : []).filter(m => m && !m.withdrawn && m.sid && /\d/.test(m.sid)).map(m => { let enr = 0, cmp = 0;
    for (const c of C) if (c && (c.learners || []).includes(m.id)) { enr++; const p = ((c.prog || {})[m.id]) || {}; if (p.done || +p.p >= 100) cmp++; }
    return { no: String(m.sid).replace(/\D/g, ''), dept: String(m.dept || codes.get(m.sid) || '').slice(0, 40) || null, enr, cmp }; });
}
/* 여러 하루 행 → 기간 값(원래 수) */
function combine(rows) {
  const R = [...rows].sort((a, b) => (a.day < b.day ? -1 : 1)); if (!R.length) return null; const last = R[R.length - 1].v || {}; const out = {};
  for (const k of STATE) if (k in last) out[k] = +last[k] || 0;
  for (const k of FLOW) if (R.some(r => r.v && k in r.v)) out[k] = R.reduce((s, r) => s + (+((r.v || {})[k]) || 0), 0);
  return out;
}
const rate = (n, d) => (d > 0 ? Math.round(n / d * 10000) : 0);
/* 원래 수 → 응답 값(가림 · 동의). share: 소속 기관 공유 범위 */
function mask(raw, share) {
  const S = share || {}; const v = {}; const masked = [], noConsent = [];
  for (const k of KPIS) { const ck = CONSENT[k]; if (ck && !S[ck]) { v[k] = null; noConsent.push(k); continue; } }
  const R = raw || {};
  for (const k of PEOPLE) { const n = +R[k] || 0; if (n >= 1 && n <= 4) { v[k] = UNDER5; masked.push(k); } else v[k] = n; }
  /* 수료율: 종료 과정 수강이 있으면 그 안의 수료, 없으면 전체 수강 대비 수료 */
  const ended = (+R.cmpBase || 0) > 0; const base = ended ? +R.cmpBase : +R.enr || 0; if (base >= 1 && base <= 4) { v.cmpRateBp = null; masked.push('cmpRateBp'); } else v.cmpRateBp = rate(ended ? +R.cmpEnd || 0 : +R.cmp || 0, base);
  const pn = +R.progN || 0; if (pn >= 1 && pn <= 4) { v.progBp = null; masked.push('progBp'); } else v.progBp = pn ? Math.round((+R.progSum || 0) / pn * 100) : 0;
  v.crs = +R.crs || 0;
  for (const k of ['aiCalls', 'aiTok', 'rev']) if (!noConsent.includes(k)) v[k] = R[k] == null ? null : +R[k] || 0;
  return { v, masked, noConsent };
}
/* 합계: 동의한 원래 수만 더한 뒤 다시 가림. 동의하지 않은 기관이 하나라도 있으면 그 키는 null */
function total(list) {
  const sum = {}; const nc = new Set();
  for (const x of list) { for (const k of [...STATE, ...FLOW]) if (x.raw && x.raw[k] != null) sum[k] = (sum[k] || 0) + (+x.raw[k] || 0); for (const k of x.noConsent || []) nc.add(k); }
  const m = mask(sum, { ai: true, revenue: true }).v; for (const k of nc) m[k] = null; return m;
}
/* 순위(큰 값이 1등, 가림 · null 제외) */
function ranks(children, kpis) {
  for (const k of kpis) { const L = children.filter(c => typeof c.v[k] === 'number').sort((a, b) => b.v[k] - a.v[k]); L.forEach((c, i) => { c.rank[k] = i + 1; }); }
}
/* 경고 기준(spec 1-4 rules): 숫자 값만 비교. 비율 키(Bp)는 value를 % 로 받는다 */
function flags(v, rules) {
  const out = []; (rules || []).forEach(r => { const x = v[r.kpi]; if (typeof x !== 'number') return; const lim = /Bp$/.test(r.kpi) ? +r.value * 100 : +r.value; if (r.op === 'lt' ? x < lim : x > lim) out.push({ rule: r.n, kpi: r.kpi, label: r.label }); }); return out;
}
/* 기간 버킷(day · week(ISO) · month) */
function bucket(d, unit) {
  if (unit === 'month') return d.slice(0, 7); if (unit !== 'week') return d;
  const t = new Date(d + 'T00:00:00Z'); const wd = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - wd + 3); const y = t.getUTCFullYear(); const w1 = new Date(Date.UTC(y, 0, 4));
  return `${y}-W${String(1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getUTCDay() + 6) % 7)) / 7)).padStart(2, '0')}`;
}
/* 작은 칸 묶기(학과 · 이동 경로): 5명 미만 칸은 한 줄로 */
function fold(rows, key, n, label) {
  const big = rows.filter(r => r[n] >= 5); const small = rows.filter(r => r[n] > 0 && r[n] < 5).reduce((s, r) => s + r[n], 0);
  if (small) big.push({ [key]: label, [n]: small >= 5 ? small : UNDER5 }); return big;
}
module.exports = { KPIS, PEOPLE, STATE, FLOW, CONSENT, UNDER5, fromDoc, lxRows, combine, mask, total, ranks, flags, bucket, fold, addDays };
