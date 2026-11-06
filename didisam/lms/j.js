/* v30 학사 LMS 묶음 J — 학습 분석(SFR-028 · 029 · 078)
   학습 부진 복합 지표(성적 35 · 출결 30 · LMS 참여 25 · 비교과 10) 현재 상태 + 추이 · 2주 뒤 예측 그래프, 중도이탈 가능성, 조기 경고 규칙 · 대상 추출(CSV),
   그룹(학과 · 학년)별 학습 패턴 인사이트, 교수자 · 학습자 맞춤 피드백(규칙 초안 → 운영 모드에서는 서버 AI 게이트웨이 /api/ai/messages로 다듬기),
   학습 성찰일지 · 교수 코멘트, 학습활동 보고서, 학생 모드(교수자가 학생 화면 확인). 학사 원천 · 실발송은 연동 지점. 공용 W3는 lms/g.js. */
(function () {
  'use strict';
  if (!window.W3) return;
  const W3 = window.W3; const L = W3.LOCAL; const D = () => W3.D(); const now = () => Date.now();
  const ULMS_ = () => typeof ULMS === 'function' && ULMS();
  const kday = (t = now()) => new Date(t + 9 * 36e5).toISOString().slice(0, 10);
  const LVN = { danger: '위험', warn: '주의', ok: '양호' }; const LVT = { danger: 'r', warn: 'y', ok: 'g' };
  const MET = { risk: '위험지수', grade: '성적', attendance: '출석률', participation: '진도율', extra: '비교과', dropout: '중도이탈 가능성' };

  /* ═════════ 데모 경로(서버 lms_j_comps와 같은 공식) ═════════ */
  const secOf = id => D().sections.find(s => s.section_id === id);
  function comps(sid) {
    const d = D(); const ss = d.sessions.filter(s => s.section_id === sid && s.kind !== 'holiday' && Date.parse(s.starts_at) <= now());
    const cts = d.contents.filter(c => ss.some(s => s.session_id === c.session_id));
    return d.persons.filter(p => p.ekind === 'regular' && (p.secs || []).includes(sid)).map(p => {
      const a = ss.length ? Math.round(100 * ss.filter(s => ['present', 'late', 'excused'].includes(d.att[s.session_id + '|' + p.person_id]?.status)).length / ss.length) : null;
      const g = d.grades[p.person_id] != null ? Math.round(d.grades[p.person_id]) : null;
      const pa = cts.length ? Math.round(cts.reduce((n, c) => n + (d.prog[c.content_id + '|' + p.person_id]?.pct || 0), 0) / cts.length) : null;
      const x = 0; const num = (g == null ? 0 : 35 * g) + (a == null ? 0 : 30 * a) + (pa == null ? 0 : 25 * pa) + 10 * x; const den = (g == null ? 0 : 35) + (a == null ? 0 : 30) + (pa == null ? 0 : 25) + 10;
      return { person_id: p.person_id, member_no: p.member_no, unit_code: p.unit_code, grade_year: p.grade_year, grade: g, attendance: a, participation: pa, extra: x, risk: 100 - Math.round(num / den) };
    });
  }
  const lvl = r => r >= 50 ? 'danger' : r >= 30 ? 'warn' : 'ok';
  function riskRows(sid) {
    const day0 = Date.parse('2026-01-01'); const today = kday();
    return comps(sid).map(c => { const h = D().snaps.filter(s => s.section_id === sid && s.person_id === c.person_id && s.day < today).map(s => ({ day: s.day, risk: s.risk })).concat([{ day: today, risk: c.risk }]).sort((a, b) => a.day < b.day ? -1 : 1).slice(-8);
      let pred = c.risk; if (h.length >= 2) { const X = h.map(x => (Date.parse(x.day) - day0) / 864e5), Y = h.map(x => x.risk); const mx = X.reduce((a, b) => a + b) / X.length, my = Y.reduce((a, b) => a + b) / Y.length; const sxx = X.reduce((a, x) => a + (x - mx) ** 2, 0);
        if (sxx > 0) { const sl = X.reduce((a, x, i) => a + (x - mx) * (Y[i] - my), 0) / sxx; const ic = my - sl * mx; pred = Math.max(0, Math.min(100, Math.round(ic + sl * ((Date.parse(today) - day0) / 864e5 + 14)))); } }
      return { ...c, level: lvl(c.risk), pred, dropout: Math.round(100 / (1 + Math.exp(-(pred - 50) / 8))), trend: h }; });
  }
  W3.seedJ = sid => { const today = Date.parse(kday()); comps(sid).forEach((c, j) => { for (let k = 5; k >= 1; k--) { const drift = j === 6 ? -4 * k : j === 3 ? 3 * k : ((j + k) % 3) - 1; D().snaps.push({ section_id: sid, person_id: c.person_id, day: kday(today - k * 7 * 864e5 - 9 * 36e5), risk: Math.max(0, Math.min(100, c.risk + drift)) }); } });
    const reg = D().persons.filter(p => p.ekind === 'regular' && (p.secs || []).includes(sid)); [[0, 2, '데이터 종류를 구분하는 기준이 처음엔 헷갈렸지만 예시로 이해했습니다.', 4], [3, 3, '실습 과제가 어려워 질문 게시판을 활용했습니다.', 3], [6, 3, '진도가 밀려 다음 주에 몰아서 들어야 할 것 같습니다.', 2]].forEach(([i, w, body, mood]) => D().refl.push({ id: W3.uid(), section_id: sid, person_id: reg[i].person_id, week_no: w, body, mood, comment: null, commented_by: null, commented_at: null, created_at: W3.ts(now() - (5 - w) * 864e5) })); };
  const DEF_RULES = [{ name: '위험지수 50 이상', metric: 'risk', op: 'gte', threshold: 50, level: 'danger' }, { name: '출석률 75% 이하', metric: 'attendance', op: 'lte', threshold: 75, level: 'warn' }, { name: '진도율 50% 이하', metric: 'participation', op: 'lte', threshold: 50, level: 'warn' }];
  const need = sid => { if (!secOf(sid)) throw W3.err('not_found'); };
  L['GET /api/lms/j/risk'] = b => { need(b.section_id); const R = riskRows(b.section_id).sort((a, z) => z.risk - a.risk || (a.member_no < z.member_no ? -1 : 1));
    return { weights: { grade: 35, attendance: 30, participation: 25, extra: 10 }, extra_source: 'none', summary: { danger: R.filter(r => r.level === 'danger').length, warn: R.filter(r => r.level === 'warn').length, ok: R.filter(r => r.level === 'ok').length, avg_risk: R.length ? Math.round(R.reduce((a, r) => a + r.risk, 0) / R.length) : 0 },
      students: R.map(r => ({ member_no: r.member_no, unit_code: r.unit_code, grade_year: r.grade_year, grade: r.grade, attendance: r.attendance, participation: r.participation, extra: r.extra, risk: r.risk, level: r.level, predicted: r.pred, dropout_pct: r.dropout, trend: r.trend })) }; };
  L['POST /api/lms/j/snapshot'] = b => { need(b.section_id); const day = kday(); const C = comps(b.section_id); D().snaps = D().snaps.filter(s => !(s.section_id === b.section_id && s.day === day)); C.forEach(c => D().snaps.push({ section_id: b.section_id, person_id: c.person_id, day, risk: c.risk })); return { day, saved: C.length }; };
  L['GET /api/lms/j/rules'] = () => D().rules.map(r => ({ ...r }));
  L['POST /api/lms/j/rule'] = b => { if (!b.name || !MET[b.metric] || !['gte', 'lte'].includes(b.op) || !(b.threshold >= 0 && b.threshold <= 100) || !LVN[b.level]) throw W3.err('bad_input'); const r = { rule_id: b.rule_id || W3.uid(), name: b.name, metric: b.metric, op: b.op, threshold: +b.threshold, level: b.level, active: b.active !== false };
    const i = D().rules.findIndex(x => x.rule_id === r.rule_id); if (i >= 0) D().rules[i] = r; else D().rules.push(r); return r; };
  L['POST /api/lms/j/rule/delete'] = b => { const n = D().rules.length; D().rules = D().rules.filter(r => r.rule_id !== b.rule_id); if (n === D().rules.length) throw W3.err('not_found'); return { deleted: 1 }; };
  L['GET /api/lms/j/targets'] = b => { need(b.section_id); const rl = D().rules.length ? D().rules.filter(r => r.active) : DEF_RULES; const R = riskRows(b.section_id);
    const mv = (r, m) => m === 'dropout' ? r.dropout : r[m];
    const T = R.map(r => { const hit = rl.filter(x => { const v = mv(r, x.metric); return v != null && (x.op === 'gte' ? v >= x.threshold : v <= x.threshold); }); return hit.length ? { member_no: r.member_no, unit_code: r.unit_code, risk: r.risk, dropout_pct: r.dropout, attendance: r.attendance, participation: r.participation, grade: r.grade, level: hit.some(h => h.level === 'danger') ? 'danger' : 'warn', matched: hit.map(h => h.name).sort() } : null; }).filter(Boolean)
      .sort((a, z) => (z.level === 'danger') - (a.level === 'danger') || z.risk - a.risk || (a.member_no < z.member_no ? -1 : 1));
    return { rules: rl.map(({ name, metric, op, threshold, level }) => ({ name, metric, op, threshold, level })), targets: T }; };
  L['GET /api/lms/j/insights'] = b => { need(b.section_id); const R = riskRows(b.section_id); const avg = (a, k) => { const v = a.map(x => x[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
    const grp = f => Object.entries(R.reduce((m, r) => { (m[f(r)] = m[f(r)] || []).push(r); return m; }, {})).map(([g, a]) => ({ g, n: a.length, risk: avg(a, 'risk'), attendance: avg(a, 'attendance'), participation: avg(a, 'participation'), grade: avg(a, 'grade'), danger: a.filter(x => x.level === 'danger').length })).sort((a, z) => a.g < z.g ? -1 : 1);
    const gu = grp(r => r.unit_code || '미지정'), gy = grp(r => r.grade_year ? r.grade_year + '학년' : '미지정'); const P = [];
    if (gu.length > 1) { const t = gu.slice().sort((a, z) => z.risk - a.risk)[0]; P.push(`학과별 위험지수가 가장 높은 그룹은 ${t.g}(평균 ${t.risk}, ${t.n}명)입니다.`); }
    if (gy.length > 1) { const t = gy.filter(x => x.attendance != null).sort((a, z) => a.attendance - z.attendance)[0]; if (t) P.push(`학년별 출석률은 ${t.g}이 평균 ${t.attendance}%로 가장 낮습니다.`); }
    const lo = avg(R.filter(r => r.participation < 50), 'grade'), hi = avg(R.filter(r => r.participation >= 50), 'grade'); if (lo != null && hi != null && hi > lo) P.push(`진도율 50% 미만 학생의 평균 성적은 ${lo}점으로 나머지(${hi}점)보다 ${hi - lo}점 낮습니다.`);
    const dn = R.filter(r => r.level === 'danger').length; if (dn) P.push(`위험 등급 학생이 ${dn}명입니다. 개별 상담 · 튜터링 연계를 권합니다.`);
    return { by_unit: gu, by_year: gy, patterns: P }; };
  function fbText(sid, mno, aud) { const R = riskRows(sid); const av = k => { const v = R.map(r => r[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '-'; };
    if (!mno) { const dr = R.filter(r => r.dropout >= 50).sort((a, z) => z.dropout - a.dropout).slice(0, 5); return [`분반 학습 현황 요약: 위험 ${R.filter(r => r.level === 'danger').length}명 · 주의 ${R.filter(r => r.level === 'warn').length}명 · 양호 ${R.filter(r => r.level === 'ok').length}명.`, `평균 출석률 ${av('attendance')}% · 평균 진도율 ${av('participation')}% · 평균 성적 ${av('grade')}점.`, dr.length ? '중도이탈 가능성이 높은 학생: ' + dr.map(r => `${r.member_no}(${r.dropout}%)`).join(', ') : null, '권장 조치: 위험 학생 개별 면담 · 학습 튜터링 연계, 진도 부족 학생에게 주차 마감 전 안내, 다음 주 수업 초반 핵심 개념 복습.'].filter(Boolean).join('\n'); }
    const m = R.find(r => r.member_no === mno); if (!m) throw W3.err('not_enrolled');
    if (aud === 'professor') return [`학생 ${m.member_no}: 위험지수 ${m.risk}(${LVN[m.level]}) · 2주 뒤 예측 ${m.pred} · 중도이탈 가능성 ${m.dropout}%.`, `지표: 출석 ${m.attendance ?? '-'}% · 진도 ${m.participation ?? '-'}% · 성적 ${m.grade ?? '-'}점 · 비교과 ${m.extra}점.`, m.level === 'danger' ? '권장 조치: 이번 주 안에 면담을 요청하고 학습 계획을 함께 세우세요.' : m.level === 'warn' ? '권장 조치: 격려 메시지와 미수강 차시 안내를 보내세요.' : '권장 조치: 현재 학습 흐름을 칭찬해 동기를 유지하세요.'].join('\n');
    return [`학번 ${m.member_no} 학생, 이번 주 학습 상태를 안내드립니다.`, m.attendance == null ? null : m.attendance < 80 ? `출석률이 ${m.attendance}%입니다. 남은 수업에 빠짐없이 참여해 주세요(결석이 수업의 1/4을 넘으면 학점 취득이 어려울 수 있습니다).` : `출석률 ${m.attendance}%로 잘 유지하고 있습니다.`,
      m.participation == null ? null : m.participation < 60 ? `온라인 강의 진도율이 ${m.participation}%입니다. 듣지 않은 차시를 주차 학습 기간 안에 들어 주세요.` : `온라인 강의 진도율 ${m.participation}%로 좋습니다.`, m.grade != null && m.grade < 60 ? `평가 점수 평균이 ${m.grade}점입니다. 질의응답 게시판과 학습 튜터링을 활용해 보세요.` : null,
      m.extra === 0 ? '비교과 프로그램 참여 기록이 없습니다. 관심 분야 프로그램 참여를 권합니다.' : null, m.level === 'danger' ? '교수님과 상담을 권합니다. 함께 학습 계획을 세워 보세요.' : m.level === 'warn' ? '조금만 더 힘내면 충분히 따라잡을 수 있습니다.' : '지금처럼 꾸준히 학습해 주세요.'].filter(Boolean).join('\n'); }
  const fbSave = (b, body, source) => { const p = b.member_no ? D().persons.find(x => x.member_no === b.member_no && (x.secs || []).includes(b.section_id)) : null; if (b.member_no && !p) throw W3.err('not_enrolled');
    const f = { id: W3.uid(), section_id: b.section_id, person_id: p ? p.person_id : null, audience: b.audience, body, source, actor: S.me?.name || '교수자', created_at: W3.ts(now()) }; D().fb.push(f); return { id: f.id, member_no: b.member_no || null, audience: f.audience, source, body, created_at: f.created_at }; };
  L['POST /api/lms/j/feedback'] = b => { need(b.section_id); if (!b.member_no && b.audience === 'student') throw W3.err('required'); return fbSave(b, fbText(b.section_id, b.member_no, b.audience), 'rule'); };
  L['POST /api/lms/j/feedback/save'] = b => { need(b.section_id); if (!b.body) throw W3.err('required'); return fbSave(b, String(b.body).slice(0, 4000), b.source); };
  L['GET /api/lms/j/feedbacks'] = b => { need(b.section_id); const mn = pid => D().persons.find(p => p.person_id === pid)?.member_no || null; return D().fb.filter(f => f.section_id === b.section_id && (!b.member_no || mn(f.person_id) === b.member_no)).sort((a, z) => a.created_at < z.created_at ? 1 : -1).map(f => ({ id: f.id, member_no: mn(f.person_id), audience: f.audience, source: f.source, body: f.body, actor: f.actor, created_at: f.created_at })); };
  L['POST /api/lms/j/reflection'] = b => { need(b.section_id); const p = D().persons.find(x => x.member_no === b.member_no && (x.secs || []).includes(b.section_id)); if (!p) throw W3.err('not_enrolled'); if (!b.body || !(b.week_no >= 1 && b.week_no <= 20)) throw W3.err('bad_input');
    const r = { id: W3.uid(), section_id: b.section_id, person_id: p.person_id, week_no: +b.week_no, body: String(b.body).slice(0, 4000), mood: b.mood ? +b.mood : null, comment: null, commented_by: null, commented_at: null, created_at: W3.ts(now()) }; D().refl.push(r); return { id: r.id, member_no: b.member_no, week_no: r.week_no, body: r.body, mood: r.mood, created_at: r.created_at }; };
  L['GET /api/lms/j/reflections'] = b => { need(b.section_id); const mn = pid => D().persons.find(p => p.person_id === pid)?.member_no; return D().refl.filter(r => r.section_id === b.section_id && (!b.member_no || mn(r.person_id) === b.member_no)).sort((a, z) => z.week_no - a.week_no || (a.created_at < z.created_at ? 1 : -1)).map(r => ({ id: r.id, member_no: mn(r.person_id), week_no: r.week_no, body: r.body, mood: r.mood, comment: r.comment, commented_by: r.commented_by, commented_at: r.commented_at, created_at: r.created_at })); };
  L['POST /api/lms/j/reflection/comment'] = b => { const r = D().refl.find(x => x.id === b.id); if (!r) throw W3.err('not_found'); if (!b.comment) throw W3.err('required'); Object.assign(r, { comment: b.comment, commented_by: S.me?.name || '교수자', commented_at: W3.ts(now()) }); return { id: r.id, week_no: r.week_no, comment: r.comment, commented_at: r.commented_at }; };
  L['GET /api/lms/j/report'] = b => { need(b.section_id); const d = D(); const R = riskRows(b.section_id); const m = R.find(r => r.member_no === b.member_no); if (!m) throw W3.err('not_enrolled'); const sec = secOf(b.section_id);
    const ss = d.sessions.filter(s => s.section_id === b.section_id); const att = { present: 0, late: 0, absent: 0, excused: 0 }; ss.forEach(s => { const a = d.att[s.session_id + '|' + m.person_id]; if (a) att[a.status]++; });
    const pg = d.contents.filter(c => ss.some(s => s.session_id === c.session_id)).map(c => d.prog[c.content_id + '|' + m.person_id] || {}); const acts = {}; d.acts.filter(a => a.section_id === b.section_id && a.person_id === m.person_id).forEach(a => { acts[a.kind] = (acts[a.kind] || 0) + 1; });
    const fb = d.fb.filter(f => f.section_id === b.section_id && f.person_id === m.person_id && f.audience === 'student').sort((a, z) => a.created_at < z.created_at ? 1 : -1)[0];
    return { member_no: m.member_no, unit_code: m.unit_code, view: b.view || 'professor', section: { title: sec.title, term_id: sec.term_id }, status: { risk: m.risk, level: m.level, grade: m.grade, attendance: m.attendance, participation: m.participation, extra: m.extra, predicted: m.pred, dropout_pct: b.view === 'student' ? null : m.dropout, trend: m.trend },
      attendance: att, progress: { contents: pg.length, done: pg.filter(x => (x.pct || 0) >= 90).length, avg_pct: pg.length ? Math.round(pg.reduce((a, x) => a + (x.pct || 0), 0) / pg.length) : 0, watched_sec: pg.reduce((a, x) => a + (x.watched_sec || 0), 0) },
      quiz_score: d.grades[m.person_id] ?? null, activities: acts, reflections: d.refl.filter(r => r.section_id === b.section_id && r.person_id === m.person_id).length, feedback: fb ? { body: fb.body, source: fb.source, created_at: fb.created_at } : null }; };

  /* ═════════ 화면 ═════════ */
  Object.assign(MENU, { lmsj: { label: '학습 분석', ws: 'learn', only: 'univ' } });
  if (PRESET.univ_lms && !PRESET.univ_lms.on.includes('lmsj')) { const at = PRESET.univ_lms.on.indexOf('lmsi'); PRESET.univ_lms.on.splice(at >= 0 ? at + 1 : PRESET.univ_lms.on.length, 0, 'lmsj'); PRESET.univ_lms.off = PRESET.univ_lms.off.filter(x => x !== 'lmsj'); }
  Object.keys(PRESET).filter(k => k !== 'univ_lms').forEach(k => { if (!PRESET[k].on.includes('lmsj') && !PRESET[k].off.includes('lmsj')) PRESET[k].off.push('lmsj'); });

  VIEWS.lmsj = () => {
    W3.css('w3'); if (window.EFH) EFH.css(); if (!ULMS_()) return '<div class="empty">대학(학사 LMS) 에디션에서 쓰는 화면입니다.</div>';
    const sec = W3.section(); if (sec === undefined) return W3.loading; if (sec.__err) return `<div class="empty">${esc(sec.__err)}</div>`;
    const t = UI.w3jT || 'risk'; const T4 = window.EFH ? EFH.tabs4 : (k, a, c, m) => tabs(k, [...a, ...(m || [])], c);
    return head('학습 분석', `${esc(sec.title)} · 학습 부진 복합 지표 = 성적 35 · 출결 30 · LMS 참여 25 · 비교과 10 · 학사 원천 데이터는 연동 후 반영`, `${W3.secPick()} ${W3.mode()}`)
      + (t === 'stu' ? '' : todoJ(sec, t))
      + T4('w3jT', [['risk', '위험 현황 · 예측'], ['warn', '조기 경고'], ['fb', '맞춤 피드백'], ['refl', '성찰일지']], t, [['ins', '그룹 인사이트(학과 · 학년)'], ['stu', '학생 화면 미리보기']])
      + ({ risk: jRisk, warn: jWarn, ins: jIns, fb: jFb, refl: jRefl, stu: jStu }[t])(sec);
  };
  /* 지금 할 일: 위험 학생 → 맞춤 피드백 */
  function todoJ(sec, t) {
    if (!window.EFH) return ''; const R = W3.get('jrisk:' + sec.section_id, 'GET', '/api/lms/j/risk', { section_id: sec.section_id }); if (!R || R.__err) return '';
    const up = R.students.filter(s => s.predicted >= 50 && s.risk < 50).length; const top = R.students[0];
    const RF = W3.get('jrefl:' + sec.section_id, 'GET', '/api/lms/j/reflections', { section_id: sec.section_id }); const nc = RF && !RF.__err ? RF.filter(r => !r.comment).length : 0;
    const txt = `위험 <b>${R.summary.danger}명</b> · 주의 ${R.summary.warn}명${up ? ` · 2주 뒤 위험 예상 ${up}명` : ''}${nc ? ` · 코멘트 기다리는 성찰일지 ${nc}건` : ''}`;
    const btn = R.summary.danger && top && t !== 'fb' ? `<button class="btn sm pri" data-act="w3j-fgo" data-m="${esc(top.member_no)}">맞춤 피드백 만들기</button>` : '';
    return EFH.todo(txt, btn);
  }
  ACT['w3j-fgo'] = el => { UI.w3jFm = el.dataset.m; UI.w3jT = 'fb'; render(); };
  const v = x => x == null ? '—' : x;

  /* 추이 + 예측 SVG(선: 기록, 점선: 2주 뒤 예측) */
  function chart(trend, pred) {
    const W = 520, H = 200, P = 30; const pts = (trend || []).slice(); if (!pts.length) return '<div class="empty">기록이 없습니다.</div>';
    const t0 = Date.parse(pts[0].day), tN = Date.parse(pts[pts.length - 1].day) + 14 * 864e5; const sx = t => P + (W - 2 * P) * (t - t0) / Math.max(tN - t0, 1); const sy = r => H - P - (H - 2 * P) * r / 100;
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(Date.parse(p.day)).toFixed(1)},${sy(p.risk).toFixed(1)}`).join(' '); const last = pts[pts.length - 1];
    return `<svg class="w3-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="위험지수 추이와 2주 뒤 예측 ${pred}">
      <rect x="${P}" y="${sy(100)}" width="${W - 2 * P}" height="${sy(50) - sy(100)}" fill="var(--badl)"/><rect x="${P}" y="${sy(50)}" width="${W - 2 * P}" height="${sy(30) - sy(50)}" fill="var(--warnl)"/>
      ${[0, 30, 50, 100].map(r => `<text x="4" y="${sy(r) + 4}">${r}</text>`).join('')}
      <path d="${line}" fill="none" stroke="var(--mag)" stroke-width="2.5"/>${pts.map(p => `<circle cx="${sx(Date.parse(p.day))}" cy="${sy(p.risk)}" r="3.5" fill="var(--mag)"/>`).join('')}
      <path d="M${sx(Date.parse(last.day))},${sy(last.risk)} L${sx(tN)},${sy(pred)}" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 4" fill="none"/><circle cx="${sx(tN)}" cy="${sy(pred)}" r="4" fill="var(--warn)"/>
      <text x="${P}" y="${H - 8}">${esc(pts[0].day.slice(5))}</text><text x="${W - P - 60}" y="${H - 8}">2주 뒤 예측 ${pred}</text></svg>`;
  }
  function jRisk(sec) {
    const R = W3.get('jrisk:' + sec.section_id, 'GET', '/api/lms/j/risk', { section_id: sec.section_id }); if (R === undefined) return W3.loading; if (R.__err) return `<div class="empty">${esc(R.__err)}</div>`;
    const sel = R.students.find(s => s.member_no === UI.w3jM) || R.students[0]; if (sel) UI.w3jM = sel.member_no;
    const dots = window.EFH ? EFH.dots : () => ''; const mi = window.EFH ? EFH.mi : () => '';
    return `<div class="kpis">${kpi('위험', R.summary.danger + '명', '위험지수 50 이상', R.summary.danger ? 'warn' : '')}${kpi('주의', R.summary.warn + '명', '30~49')}${kpi('양호', R.summary.ok + '명')}${kpi('평균 위험지수', String(R.summary.avg_risk))}</div>
      <div class="card"><div class="ch"><b>학습 부진 복합 지표</b><small>행을 누르면 성적 · 출석 · 진도와 추이 그래프 · 비교과 출처: ${R.extra_source === 'none' ? '비교과 데이터 없음 → 0점' : esc(R.extra_source)}</small><span class="efh-acts">${dots([mi('w3j-snap', '오늘 기록 저장(추이에 쌓기)'), mi('w3j-csv', '엑셀(CSV) 내려받기')], '학습 분석 다른 작업')}</span></div>
      ${R.students.length ? `<div class="tw nomcard"><table class="efh-board"><thead><tr><th>학번</th><th>위험지수</th><th>2주 뒤</th><th>중도이탈</th></tr></thead><tbody>${R.students.map(s => `<tr class="efh-row${sel && sel.member_no === s.member_no ? ' on' : ''}" data-act="w3j-pick" data-m="${esc(s.member_no)}" tabindex="0"><td><b>${esc(s.member_no)}</b><small class="efh-sub2">${esc(s.unit_code || '')}${s.grade_year ? ' · ' + s.grade_year + '학년' : ''}</small></td><td><b class="w3-lvl-${s.level}">${s.risk}</b> ${tag(LVN[s.level], LVT[s.level])}</td><td>${(s.predicted > s.risk ? '▲ ' : s.predicted < s.risk ? '▼ ' : '') + s.predicted}</td><td>${s.dropout_pct}%</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">수강생이 없습니다.</div>'}</div>
      ${sel ? `<div class="card"><div class="ch"><b>${esc(sel.member_no)} 현재 상태 · 예측</b><small>성적 ${v(sel.grade)} · 출석 ${v(sel.attendance)}% · 진도 ${v(sel.participation)}% · 비교과 ${sel.extra} — 최근 기록 8개의 추세로 2주 뒤를 예측합니다</small></div>${chart(sel.trend, sel.predicted)}</div>` : ''}`;
  }
  ACT['w3j-pick'] = el => { UI.w3jM = el.dataset.m; render(); };
  ACT['w3j-snap'] = () => W3.act(() => W3.call('POST', '/api/lms/j/snapshot', { section_id: UI.w3sec }), r => `${r.day} 기록 ${r.saved}명을 저장했습니다.`).then(() => { W3.drop('jrisk:'); render(); });
  ACT['w3j-csv'] = () => { const R = W3.cache['jrisk:' + UI.w3sec]; if (!R) return; downloadCSV(`학습위험지수_${today()}.csv`, ['학번', '학과', '학년', '성적', '출석', '진도', '비교과', '위험지수', '등급', '2주 뒤 예측', '중도이탈(%)'], R.students.map(s => [s.member_no, s.unit_code || '', s.grade_year ?? '', s.grade ?? '', s.attendance ?? '', s.participation ?? '', s.extra, s.risk, LVN[s.level], s.predicted, s.dropout_pct])); };

  function jWarn(sec) {
    const T = W3.get('jtar:' + sec.section_id, 'GET', '/api/lms/j/targets', { section_id: sec.section_id }); const RL = W3.get('jrules', 'GET', '/api/lms/j/rules'); if (T === undefined || RL === undefined) return W3.loading; if (T.__err) return `<div class="empty">${esc(T.__err)}</div>`;
    const op = { gte: '이상', lte: '이하' };
    return `<div class="card"><div class="ch"><b>조기 경고 규칙</b><small>${RL.length ? '기관 규칙' : '기본 규칙 사용 중(규칙을 추가하면 대체됩니다)'}</small></div>
      ${table(['이름', '지표', '조건', '등급', ''], (RL.length ? RL : T.rules).map(r => [esc(r.name), esc(MET[r.metric]), `${r.threshold} ${op[r.op]}`, tag(LVN[r.level], LVT[r.level]), r.rule_id ? `<button class="btn sm ghost" data-act="w3j-rdel" data-id="${esc(r.rule_id)}">삭제</button>` : '기본']))}
      <div class="form2"><label>이름<input id="w3rn" maxlength="60" placeholder="예: 진도율 40% 이하"></label><label>지표<select id="w3rm">${Object.entries(MET).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label><label>조건<select id="w3ro"><option value="gte">이상</option><option value="lte">이하</option></select></label><label>값<input type="number" id="w3rt" min="0" max="100" value="50"></label><label>등급<select id="w3rl"><option value="warn">주의</option><option value="danger">위험</option></select></label></div>
      <button class="btn sm" data-act="w3j-radd">규칙 추가</button></div>
      <div class="card"><div class="ch"><b>경고 대상 ${T.targets.length}명</b><span class="efh-acts"><button class="btn sm" data-act="w3j-notify">안내 보내기</button>${window.EFH ? EFH.dots([EFH.mi('w3j-tcsv', '엑셀(CSV) 내려받기')], '경고 대상 다른 작업') : ''}</span></div>
      ${table(['학번', '등급', '위험지수', '해당 규칙'], T.targets.map(t => [`<b>${esc(t.member_no)}</b><small class="efh-sub2">${esc(t.unit_code || '')} · 출석 ${v(t.attendance)} · 진도 ${v(t.participation)} · 성적 ${v(t.grade)}</small>`, tag(LVN[t.level], LVT[t.level]), `${t.risk}<small class="efh-sub2">중도이탈 ${t.dropout_pct}%</small>`, esc(t.matched.join(', '))]), '경고 대상이 없습니다.')}</div>`;
  }
  ACT['w3j-radd'] = () => W3.act(() => W3.call('POST', '/api/lms/j/rule', { name: $('#w3rn').value.trim() || `${MET[$('#w3rm').value]} ${$('#w3rt').value} ${$('#w3ro').value === 'gte' ? '이상' : '이하'}`, metric: $('#w3rm').value, op: $('#w3ro').value, threshold: +$('#w3rt').value, level: $('#w3rl').value }), '규칙을 추가했습니다.').then(() => { W3.drop('jrules'); W3.drop('jtar:'); render(); });
  ACT['w3j-rdel'] = el => W3.act(() => W3.call('POST', '/api/lms/j/rule/delete', { rule_id: el.dataset.id }), '삭제했습니다.').then(() => { W3.drop('jrules'); W3.drop('jtar:'); render(); });
  ACT['w3j-tcsv'] = () => { const T = W3.cache['jtar:' + UI.w3sec]; if (!T) return; downloadCSV(`조기경고대상_${today()}.csv`, ['학번', '학과', '등급', '위험지수', '중도이탈(%)', '출석', '진도', '성적', '해당 규칙'], T.targets.map(t => [t.member_no, t.unit_code || '', LVN[t.level], t.risk, t.dropout_pct, t.attendance ?? '', t.participation ?? '', t.grade ?? '', t.matched.join(' / ')])); };
  ACT['w3j-notify'] = () => { const T = W3.cache['jtar:' + UI.w3sec]; toast(`대상 ${T ? T.targets.length : 0}명 — 문자 · 메일 · 앱 푸시 실발송은 연동 후 동작합니다. 「맞춤 피드백」에서 학생별 안내문을 만들 수 있습니다.`, 'warn'); };

  function jIns(sec) {
    const I = W3.get('jins:' + sec.section_id, 'GET', '/api/lms/j/insights', { section_id: sec.section_id }); if (I === undefined) return W3.loading; if (I.__err) return `<div class="empty">${esc(I.__err)}</div>`;
    const grp = (title, G) => `<div class="card"><div class="ch"><b>${title}</b></div>${table(['그룹', '인원', '위험지수', '출석', '진도'], G.map(g => [`<b>${esc(g.g)}</b><small class="efh-sub2">성적 ${v(g.grade)} · 위험 ${g.danger}명</small>`, g.n, `${bar(g.risk, g.risk >= 50 ? 'r' : '')} ${v(g.risk)}`, v(g.attendance), v(g.participation)]))}</div>`;
    return `<div class="card"><div class="ch"><b>학습 패턴 인사이트</b><small>규칙 기반 자동 생성</small></div>${I.patterns.length ? `<ul>${I.patterns.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '<div class="empty">두드러진 패턴이 없습니다.</div>'}</div>` + grp('학과별', I.by_unit) + grp('학년별', I.by_year);
  }

  function jFb(sec) {
    const F = W3.get('jfb:' + sec.section_id, 'GET', '/api/lms/j/feedbacks', { section_id: sec.section_id }); if (F === undefined) return W3.loading; if (F.__err) return `<div class="empty">${esc(F.__err)}</div>`;
    const ai = W3.live() && typeof LIVE !== 'undefined' && LIVE.cfg && LIVE.cfg.ai; const dr = UI.w3jDraft;
    return `<div class="card"><div class="ch"><b>맞춤 피드백 만들기</b><small>${ai ? '서버 AI 게이트웨이로 다듬기 가능' : 'AI 미연결 — 규칙 기반 초안(AI 관리에서 LLM 연결 후 다듬기)'}</small></div>
      <div class="form2"><label>대상<select id="w3fa"><option value="student">학습자</option><option value="professor">교수자</option></select></label><label>학번(교수자용은 비우면 분반 요약)<input id="w3fm" maxlength="20" value="${esc(UI.w3jFm || '')}" placeholder="20269007"></label></div>
      <button class="btn pri" data-act="w3j-fgen">초안 만들기</button>
      ${dr ? `<label class="fl">초안(수정 가능)<textarea id="w3ftx" rows="7">${esc(dr.body)}</textarea></label><div class="w3-btns"><button class="btn sm ai" data-act="w3j-fai">✦ AI로 다듬기</button><button class="btn sm pri" data-act="w3j-fsave">수정본 저장</button></div><p class="mini">AI 결과는 교수자가 확인 · 수정한 뒤 저장합니다(AI기본법 고지 · 사람 검토). 학생 발송은 연동 후 동작합니다.</p>` : ''}</div>
      <div class="card"><div class="ch"><b>피드백 기록</b></div>${F.length ? F.slice(0, 30).map(f => `<div class="row"><span>${tag(f.audience === 'student' ? '학습자' : '교수자', f.audience === 'student' ? 'b' : '')} ${tag({ rule: '규칙', ai: 'AI', edited: '수정' }[f.source])} ${esc(f.member_no || '분반 전체')} · ${esc(W3.fmt(f.created_at))}</span></div><div class="w3-fb mini">${esc(f.body)}</div>`).join('') : '<div class="empty">아직 만든 피드백이 없습니다.</div>'}</div>`;
  }
  ACT['w3j-fgen'] = () => { const aud = $('#w3fa').value, m = $('#w3fm').value.trim(); UI.w3jFm = m; W3.act(() => W3.call('POST', '/api/lms/j/feedback', { section_id: UI.w3sec, audience: aud, member_no: m || undefined })).then(r => { if (r) { UI.w3jDraft = r; W3.drop('jfb:'); render(); } }); };
  ACT['w3j-fai'] = async () => { const d = UI.w3jDraft; if (!d) return; const txt = $('#w3ftx').value;
    if (!(W3.live() && LIVE.cfg && LIVE.cfg.ai)) { toast('AI가 연결되지 않아 규칙 기반 초안을 그대로 씁니다(AI 관리에서 LLM 연결 후 동작).', 'warn'); return; }
    try { const r = await api('POST', '/api/ai/messages', { system: '너는 대학 LMS 학습 코치다. 주어진 학습 상태 안내문을 존댓말로 따뜻하고 구체적으로 다듬는다. 숫자와 사실은 바꾸지 않는다. 학번 외 개인정보를 만들지 않는다. 6문장 이내.', messages: [{ role: 'user', content: `대상: ${d.audience === 'student' ? '학습자' : '교수자'}\n안내문:\n${txt}` }], max: 600 });
      const out = (r.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim(); if (out) { $('#w3ftx').value = out; UI.w3jDraft.ai = 1; toast('AI가 다듬었습니다. 확인 후 저장하세요.', 'ok'); } }
    catch (e) { toast(e.message + ' — 규칙 기반 초안을 유지합니다.', 'warn'); } };
  ACT['w3j-fsave'] = () => { const d = UI.w3jDraft; W3.act(() => W3.call('POST', '/api/lms/j/feedback/save', { section_id: UI.w3sec, audience: d.audience, member_no: d.member_no || undefined, body: $('#w3ftx').value, source: d.ai ? 'ai' : 'edited' }), '저장했습니다.').then(r => { if (r) { UI.w3jDraft = null; W3.drop('jfb:'); render(); } }); };

  function jRefl(sec) {
    const R = W3.get('jrefl:' + sec.section_id, 'GET', '/api/lms/j/reflections', { section_id: sec.section_id }); if (R === undefined) return W3.loading; if (R.__err) return `<div class="empty">${esc(R.__err)}</div>`;
    const MOOD = ['', '매우 어려움', '어려움', '보통', '좋음', '매우 좋음'];
    return `<div class="card"><div class="ch"><b>학습 성찰일지</b><small>학생이 주차마다 쓰고 교수자가 코멘트합니다</small></div>${R.length ? R.map(r => `<div class="card" style="margin:8px 0"><div class="ch"><b>${esc(r.member_no)} · ${r.week_no}주차</b><small>${esc(MOOD[r.mood] || '')} · ${esc(W3.fmt(r.created_at))}</small></div><p class="w3-fb">${esc(r.body)}</p>
      ${r.comment ? `<p class="mini"><b>교수 코멘트</b> ${esc(r.comment)}</p>` : `<div class="form2"><input id="w3cm_${esc(r.id)}" maxlength="1000" placeholder="코멘트" aria-label="코멘트"><button class="btn sm" data-act="w3j-cm" data-id="${esc(r.id)}">코멘트 남기기</button></div>`}</div>`).join('') : '<div class="empty">작성된 성찰일지가 없습니다.</div>'}</div>`;
  }
  ACT['w3j-cm'] = el => { const t = ($('#w3cm_' + el.dataset.id)?.value || '').trim(); if (!t) { toast('코멘트를 입력하세요.', 'warn'); return; } W3.act(() => W3.call('POST', '/api/lms/j/reflection/comment', { id: el.dataset.id, comment: t }), '코멘트를 남겼습니다.').then(() => { W3.drop('jrefl:'); render(); }); };

  /* 학생 모드: 교수자가 학생 화면을 그대로 확인(중도이탈 가능성 등 교수 전용 값은 숨김) */
  function jStu(sec) {
    const mno = UI.w3jS || '20269007'; const k = `jrep:${sec.section_id}:${mno}:${UI.w3jV || 'student'}`; const R = W3.get(k, 'GET', '/api/lms/j/report', { section_id: sec.section_id, member_no: mno, view: UI.w3jV || 'student' });
    const pick = `<div class="form2"><label>학번<input id="w3js" maxlength="20" value="${esc(mno)}"></label><label>보기<select id="w3jv"><option value="student" ${UI.w3jV !== 'professor' ? 'selected' : ''}>학생 화면</option><option value="professor" ${UI.w3jV === 'professor' ? 'selected' : ''}>교수용 활동 보고서</option></select></label></div><button class="btn sm" data-act="w3j-sv">보기</button>`;
    if (R === undefined) return pick + W3.loading; if (R.__err) return `<div class="card">${pick}<div class="empty">${esc(R.__err)}</div></div>`;
    const s = R.status; const stu = R.view === 'student'; const A = R.attendance; const ACT_N = { view_notice: '공지 열람', view_material: '자료 열람', download: '내려받기', submit_assignment: '과제 제출', post: '글쓰기', comment: '댓글', quiz: '퀴즈', exam: '시험', live_join: '화상 입장', page: '페이지' };
    const body = `<div class="kpis">${kpi('출석', `${A.present + A.late + A.excused}회`, `지각 ${A.late} · 결석 ${A.absent} · 공결 ${A.excused}`)}${kpi('강의 진도', R.progress.avg_pct + '%', `완료 ${R.progress.done}/${R.progress.contents}`)}${kpi('영상 퀴즈', R.quiz_score == null ? '—' : R.quiz_score + '점')}${kpi('학습 상태', stu ? LVN[s.level] : `${s.risk} (${LVN[s.level]})`, stu ? '지난 기록과 비교' : `중도이탈 ${s.dropout_pct}% · 2주 뒤 ${s.predicted}`, s.level === 'danger' ? 'warn' : '')}</div>
      ${stu ? '' : chart(s.trend, s.predicted)}
      <div class="card"><div class="ch"><b>${stu ? '교수님 피드백' : '최근 학습자 피드백'}</b></div>${R.feedback ? `<p class="w3-fb">${esc(R.feedback.body)}</p>` : '<div class="empty">받은 피드백이 없습니다.</div>'}</div>
      <div class="card"><div class="ch"><b>학습 활동</b><small>성찰일지 ${R.reflections}건 · 시청 ${Math.round(R.progress.watched_sec / 60)}분</small></div>${Object.keys(R.activities).length ? Object.entries(R.activities).map(([k2, n]) => tag(`${ACT_N[k2] || k2} ${n}`)).join(' ') : '<div class="empty">기록이 없습니다.</div>'}</div>
      ${stu ? `<div class="card"><div class="ch"><b>이번 주 성찰일지 쓰기</b></div><div class="form2"><label>주차<input type="number" id="w3rw" min="1" max="20" value="${Math.min(15, Math.max(1, Math.ceil((Date.now() - Date.parse('2026-09-07')) / 6048e5)))}"></label><label>느낌<select id="w3rmood"><option value="5">매우 좋음</option><option value="4">좋음</option><option value="3" selected>보통</option><option value="2">어려움</option><option value="1">매우 어려움</option></select></label></div><textarea id="w3rb" rows="4" maxlength="4000" style="width:100%" placeholder="이번 주에 배운 것, 어려웠던 것, 다음 주 계획" aria-label="성찰일지"></textarea><button class="btn sm pri" data-act="w3j-rw">저장</button></div>` : ''}`;
    return `<div class="card">${pick}</div><div class="${stu ? 'w3-stu' : ''}">${stu ? `<p class="mini"><b>학생 화면 미리보기</b> — ${esc(R.member_no)} 학생이 보는 「${esc(R.section.title)}」 학습 현황입니다(교수 전용 값은 숨김).</p>` : `<p class="mini"><b>학습활동 보고서</b> — ${esc(R.member_no)} · ${esc(R.unit_code || '')} · ${esc(R.section.title)}</p>`}${body}</div>`;
  }
  ACT['w3j-sv'] = () => { UI.w3jS = $('#w3js').value.trim(); UI.w3jV = $('#w3jv').value; render(); };
  ACT['w3j-rw'] = () => W3.act(() => W3.call('POST', '/api/lms/j/reflection', { section_id: UI.w3sec, member_no: UI.w3jS || '20269007', week_no: +$('#w3rw').value, body: $('#w3rb').value.trim(), mood: +$('#w3rmood').value }), '성찰일지를 저장했습니다.').then(r => { if (r) { W3.drop('jrep:'); W3.drop('jrefl:'); render(); } });
})();
