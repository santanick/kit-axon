/* v33 출결 계산 공용(QA #31) — 학습자 화면(lcls.js 나의 출결) · 운영자 화면(cls3.js W2 출석률 · compliance.js 출결 환산)이 같은 식을 쓴다.
   기준: 운영자 규정 준수 화면(compliance.js)의 「출결 환산」. docs/compliance/README.md「출결 계산」 참고.
   - 대상 회차 = 출결이 입력된 회차 + 어제까지 지난 미입력 회차(결석으로 셈). 오늘 회차는 입력 전이면 세지 않는다. 수강 제외(c.enr[mid].ex) 회차는 뺀다.
   - 고용노동부 프로필(규정 준수 켜짐 · moel-*)은 지각 · 조퇴 · 외출 3회 = 결석 1회로 환산한다. 그 밖의 기관은 지각 · 조퇴 · 외출을 출석으로 인정한다.
   - 출석률 = (대상 회차 − 환산 결석) ÷ 대상 회차, 반올림. 대상 회차가 없으면 null.
   - 수료 출결 기준: 출석률 80% 이상(MIN). 운영자 화면은 80% 미만을 경고한다.
   운영자 · 학습자 모두 index.html · learner.html에서 이 파일을 먼저 읽는다. */
(function () {
  'use strict';
  const MIN = 80;
  const LATE = ['지각', '조퇴', '외출'];
  const dayStr = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const stOf = v => String((v && typeof v === 'object' ? v.st : v) || '');
  const convFor = cpl => !!(cpl && cpl.on && /^moel-/.test(String(cpl.profile || '')));
  /* rows: [{ st, date }] — 회차별 내 출결. opt: { conv, today } */
  function calc(rows, opt = {}) {
    const t = opt.today || dayStr(); const n = { 출석: 0, 지각: 0, 조퇴: 0, 외출: 0, 결석: 0, 미입력: 0 }; let D = 0;
    (rows || []).forEach(r => { const s = stOf(r.st); if (s && s !== '미입력' && n[s] != null) { n[s]++; D++; } else if (!s && r.date && String(r.date).slice(0, 10) < t) { n.미입력++; D++; } });
    const late = n.지각 + n.조퇴 + n.외출; const abs = n.결석 + n.미입력; const conv = abs + (opt.conv ? Math.floor(late / 3) : 0);
    return { n, att: n.출석, late, abs, miss: n.미입력, conv, tot: D, rate: D ? Math.round((D - conv) / D * 100) : null, ok: D ? Math.round((D - conv) / D * 100) >= MIN : null, rule: opt.conv ? '지각 · 조퇴 · 외출 3회 = 결석 1회' : '지각 · 조퇴 · 외출은 출석으로 인정' };
  }
  /* 출결 단위: 회차 클래스 = 회차, 그 외 = 라이브 · 오프라인 강의 */
  const unitsOf = c => { if (!c) return []; if (c.kind === 'episode' && Array.isArray(c.sessions) && c.sessions.length) return c.sessions.map(s => ({ id: s.id, date: s.date || '' })); return (c.curriculum || c.items || []).filter(i => i && (i.type === 'live' || i.type === 'offline')).map(i => ({ id: i.id, date: String(i.date || i.from || i.at || '').slice(0, 10) })); };
  /* 기관 원본 클래스(운영자 S.classes · 데모 학습자의 기관 문서)에서 한 사람의 출결 행을 만든다.
     c.att 형식 두 가지를 모두 읽는다: 회차별 { [회차 id]: { [mid]: 상태 } }(출결 입력 · 출결패드) · { 'mid:n': 상태 }(QR 출결) */
  function rowsOf(c, mid) { if (!c || !mid) return []; const A = c.att || {}; const X = new Set((((c.enr || {})[mid] || {}).ex) || []);
    const R = unitsOf(c).filter(u => !X.has(u.id)).map(u => ({ id: u.id, date: u.date, st: (A[u.id] && typeof A[u.id] === 'object') ? A[u.id][mid] : '' }));
    Object.keys(A).forEach(k => { if (k.startsWith(mid + ':') && typeof A[k] !== 'object') R.push({ id: k, date: '', st: A[k] }); });
    return R; }
  const of = (c, mid, opt) => calc(rowsOf(c, mid), opt);
  window.DDAtt = { MIN, LATE, calc, rowsOf, unitsOf, of, convFor, stOf };
})();
