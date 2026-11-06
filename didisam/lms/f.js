/* v30 학사 LMS 묶음 F — 시험 · 문제은행(SFR-004 · 023 · 045 · 060 · 085)
   문제은행(분반 · 교과목 공유 · 기관 공용, 강좌 간 이관 · 재사용, 난이도 자동 분류, 이미지 · 영상 첨부) · 응시 제어(문항 · 보기 · 난이도별 무작위,
   시간 · 횟수 제한 — 운영은 서버가 강제, IP 기록 · 대역 제한, 응시 전 기능 테스트) · 채점(자동 · 수동 · 서술형) · 오답 피드백 · 재시도 · 결과 통계 ·
   성적 분포 · 본인 위치 · 엑셀(CSV). 프록터링은 연동 지점(만들지 않음). 공용 도우미는 lms/e.js의 window.EFH. */
(function () {
  'use strict';
  if (!window.EFH) return;
  const { ON, LIVE_ON, st, D, call, load, drop, wait, errBox, run, secPick, demoStudents, rid, r2, fmt, ERR, nowIso, toB64, css, gradeLink, gradePut, mno, todo, dots, tabs4, mi } = EFH;
  const DIFF = { easy: '쉬움', mid: '보통', hard: '어려움' }; const KIND = { single: '객관식(단일)', multi: '객관식(복수)', tf: '참/거짓', short: '단답형', numeric: '숫자형', essay: '서술형' };
  const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  /* ═════════ 데모 처리기(F) — 서버 lms_f_* 와 같은 응답 형태 ═════════ */
  const qOf = id => st().qs.find(q => q.q_id === id && !q.deleted);
  const exOf = id => { const x = st().exams.find(e => e.exam_id === id); if (!x) ERR(404, 'exam', '없는 시험입니다.'); return x; };
  const qJ = q => ({ ...q, correct_rate: q.attempts_n ? r2(100 * q.correct_n / q.attempts_n) : null });
  const bankJ = b => { const L = st().qs.filter(q => q.bank_id === b.bank_id && !q.deleted); return { ...b, count: L.length, easy: L.filter(q => q.difficulty === 'easy').length, mid: L.filter(q => q.difficulty === 'mid').length, hard: L.filter(q => q.difficulty === 'hard').length }; };
  const bankOk = (b, sec) => b.scope === 'tenant' || (b.scope === 'section' && b.section_id === sec) || (b.scope === 'course' && b.course_key === courseKey(sec));
  const courseKey = sec => { const c = (S.classes || []).find(x => x.id === sec); if (c) return c.name.replace(/\s*\d+분반$/, ''); const a = EFH.aSec && EFH.aSec(sec); return a ? a.course_code : sec; };
  const ids = v => v == null ? [] : (Array.isArray(v) ? v : [v]).map(String).sort();
  const norm = t => String(t ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  function correct(q, ans) { if (ans == null) return false; if (/single|multi|tf/.test(q.kind)) return JSON.stringify([...new Set(ids(ans))]) === JSON.stringify(ids(q.answer)); if (q.kind === 'short') return q.answer.some(x => norm(x) === norm(ans)); if (q.kind === 'numeric') return Math.abs(+ans - q.answer.value) <= (q.answer.tol || 0); return null; }
  D['GET /api/lms/f/banks'] = a => ({ banks: st().banks.filter(b => !a.section || bankOk(b, a.section)).map(bankJ) });
  D['POST /api/lms/f/bank-save'] = a => { if (!String(a.name || '').trim()) ERR(400, 'required', '문제은행 이름을(를) 입력하세요.'); const sc = a.scope || 'section'; let b = a.bank_id && st().banks.find(x => x.bank_id === a.bank_id);
    if (b) b.name = a.name; else { b = { bank_id: rid(), name: a.name, scope: sc, section_id: sc === 'section' ? a.section_id : null, course_key: sc === 'course' ? courseKey(a.section_id) : null }; st().banks.push(b); } return { bank: bankJ(b) }; };
  D['GET /api/lms/f/questions'] = a => ({ questions: st().qs.filter(q => q.bank_id === a.bank && !q.deleted && (!a.difficulty || q.difficulty === a.difficulty)).map(qJ) });
  D['POST /api/lms/f/q-save'] = a => {
    if (!KIND[a.kind]) ERR(400, 'kind', '문항 유형을 고르세요(single · multi · tf · short · numeric · essay).'); if (!String(a.stem || '').trim()) ERR(400, 'required', '문항을(를) 입력하세요.');
    let ch = []; let ans = a.answer;
    if (a.kind === 'tf') ch = [{ id: 't', text: '참' }, { id: 'f', text: '거짓' }];
    if (/single|multi/.test(a.kind)) { if (!Array.isArray(a.choices) || a.choices.length < 2) ERR(400, 'choices', '보기를 2~10개 입력하세요.'); ch = a.choices.map((c, i) => ({ id: (c && c.id) || 'c' + (i + 1), text: typeof c === 'object' ? c.text : String(c) })); }
    if (/single|multi|tf/.test(a.kind)) { ans = [...new Set(ids(ans))]; if (!ans.length || (a.kind !== 'multi' && ans.length !== 1) || ans.some(v => !ch.some(c => c.id === v))) ERR(400, 'answer', '정답 보기를 올바르게 고르세요.'); }
    if (a.kind === 'short') { ans = (Array.isArray(ans) ? ans : [ans]).filter(x => String(x || '').trim()); if (!ans.length) ERR(400, 'answer', '단답형 정답을 1개 이상 입력하세요.'); }
    if (a.kind === 'numeric') { if (!ans || !isFinite(+ans.value)) ERR(400, 'answer', '숫자형 정답은 {value, tol} 형식입니다.'); ans = { value: +ans.value, tol: +ans.tol || 0 }; }
    if (a.kind === 'essay') ans = null;
    (a.media || []).forEach(m => { if (!(m.file_id || /^https:\/\/\S+$/.test(m.url || ''))) ERR(400, 'media', '첨부는 이미지 파일 또는 https 주소(이미지 · 영상)만 쓸 수 있습니다.'); });
    const v = { kind: a.kind, stem: a.stem, choices: ch, answer: ans, points: +a.points || 1, difficulty: a.difficulty || 'mid', diff_auto: false, tags: a.tags || [], media: a.media || [], explanation: a.explanation || '' };
    let q = a.q_id && qOf(a.q_id); if (q) Object.assign(q, v); else { q = { q_id: rid(), bank_id: a.bank_id, ...v, origin_q: null, attempts_n: 0, correct_n: 0 }; st().qs.push(q); } return { question: qJ(q) }; };
  D['POST /api/lms/f/q-delete'] = a => { const q = qOf(a.q_id); if (!q) ERR(404, 'question', '없는 문항입니다.'); q.deleted = true; return { ok: true }; };
  D['POST /api/lms/f/q-copy'] = a => { const L = (a.q_ids || []).map(qOf).filter(Boolean); if (!L.length) ERR(400, 'q_ids', '옮길 문항을 1~500개 고르세요.'); L.forEach(q => st().qs.push({ ...JSON.parse(JSON.stringify(q)), q_id: rid(), bank_id: a.to_bank, origin_q: q.q_id, attempts_n: 0, correct_n: 0 })); return { copied: L.length }; };
  D['POST /api/lms/f/classify'] = a => { let n = 0; st().qs.filter(q => q.bank_id === a.bank_id && !q.deleted && q.kind !== 'essay' && q.attempts_n >= (+a.min_n || 3)).forEach(q => { const r = q.correct_n / q.attempts_n; q.difficulty = r >= .8 ? 'easy' : r >= .5 ? 'mid' : 'hard'; q.diff_auto = true; n++; }); return { classified: n }; };
  D['GET /api/lms/f/exams'] = a => ({ exams: st().exams.filter(x => x.section_id === a.section).map(x => ({ ...x, attempts: st().atts.filter(t => t.exam_id === x.exam_id).length, pending: st().atts.filter(t => t.exam_id === x.exam_id && t.status === 'submitted').length })) });
  D['POST /api/lms/f/exam-save'] = a => { if (!String(a.title || '').trim()) ERR(400, 'required', '시험 제목을(를) 입력하세요.');
    (a.ip_allow || []).forEach(v => { if (!/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(v) || v.split('/')[0].split('.').some(n => +n > 255)) ERR(400, 'ip_allow', '허용 IP 대역 형식이 올바르지 않습니다: ' + v); });
    if (a.status === 'published' && !(a.rules || []).length && !(a.fixed || []).length) ERR(400, 'empty', '출제할 문항(무작위 규칙 또는 고정 문항)을 정하세요.');
    const v = { title: a.title, guide: a.guide || '', open_at: a.open_at || null, close_at: a.close_at || null, time_limit_min: +a.time_limit_min || 60, max_attempts: +a.max_attempts || 1, shuffle_q: a.shuffle_q !== false, shuffle_c: a.shuffle_c !== false, rules: a.rules || [], fixed: a.fixed || [], ip_allow: a.ip_allow || [], need_precheck: !!a.need_precheck, show_result: a.show_result || 'immediate', retry_wrong: a.retry_wrong !== false, score_policy: a.score_policy || 'best', status: a.status || 'draft' };
    let x = a.exam_id && st().exams.find(e => e.exam_id === a.exam_id); if (x) Object.assign(x, v); else { x = { exam_id: rid(), section_id: a.section_id, ...v }; st().exams.push(x); }
    gradeLink(x.section_id, 'exam:' + x.exam_id, 'quiz', x.title, 100); logAudit('시험 저장 — ' + x.title); return { exam: x }; };
  function finalize(t, auto) { if (t.status !== 'in_progress') return t; let s = 0, mx = 0, pend = false; t.marks = {};
    t.items.forEach(i => { const q = st().qs.find(x => x.q_id === i.q); mx += i.p; const ok = correct(q, t.answers[i.q]); if (ok === null) { pend = true; t.marks[i.q] = { score: null, ok: null, auto: false }; } else { t.marks[i.q] = { score: ok ? i.p : 0, ok, auto: true }; if (ok) s += i.p; q.attempts_n++; if (ok) q.correct_n++; } });
    Object.assign(t, { status: pend ? 'submitted' : 'graded', submitted_at: nowIso(), auto_closed: auto, auto_score: s, score: pend ? null : s, max_score: mx }); if (!pend) push(t); return t; }
  function push(t) { const x = exOf(t.exam_id); const L = st().atts.filter(a => a.exam_id === x.exam_id && a.person_id === t.person_id && a.status === 'graded').map(a => 100 * a.score / (a.max_score || 1)); if (!L.length) return; gradePut(x.section_id, gradeLink(x.section_id, 'exam:' + x.exam_id, 'quiz', x.title, 100), t.person_id, r2(x.score_policy === 'best' ? Math.max(...L) : L[L.length - 1])); }
  const expire = () => st().atts.filter(t => t.status === 'in_progress' && Date.now() > Date.parse(t.deadline_at) + 30e3).forEach(t => finalize(t, true));
  const attRow = t => ({ attempt_id: t.attempt_id, exam_id: t.exam_id, no: t.no, status: t.status, started_at: t.started_at, deadline_at: t.deadline_at, submitted_at: t.submitted_at || null, auto_closed: !!t.auto_closed, score: t.score ?? null, auto_score: t.auto_score ?? null, max_score: t.max_score ?? null });
  const enrollOf = (sec, pid) => (demoStudents(sec).find(p => p.person_id === pid) || {}).kind;
  D['GET /api/lms/f/attempts'] = a => { expire(); const x = exOf(a.exam); return { exam: x, attempts: st().atts.filter(t => t.exam_id === x.exam_id).map(t => ({ ...attRow(t), member_no: mno(t.person_id), enroll: enrollOf(x.section_id, t.person_id), ip_start: t.ip_start, ip_last: t.ip_last, ip_changed: t.ip_changed, ip_log: t.ip_log })) }; };
  D['GET /api/lms/f/attempt'] = a => { const t = st().atts.find(x => x.attempt_id === a.id); if (!t) ERR(404, 'attempt', '없는 응시 기록입니다.'); return { attempt: { ...attRow(t), member_no: mno(t.person_id), answers: t.answers, marks: t.marks }, items: t.items.map((i, n) => ({ ...qJ(st().qs.find(q => q.q_id === i.q)), order: n + 1, p: i.p, choice_order: i.c })) }; };
  D['POST /api/lms/f/mark'] = a => { const t = st().atts.find(x => x.attempt_id === a.attempt_id); if (!t) ERR(404, 'attempt', '없는 응시 기록입니다.'); if (t.status === 'in_progress') ERR(409, 'in_progress', '응시가 끝난 뒤 채점할 수 있습니다.');
    const it = t.items.find(i => i.q === a.q_id); if (!it) ERR(404, 'question', '이 응시에 없는 문항입니다.'); const sc = +a.score; if (a.score === '' || !(sc >= 0 && sc <= it.p)) ERR(400, 'range', `점수은(는) 0~${it.p} 사이로 입력하세요.`);
    t.marks[a.q_id] = { score: sc, ok: sc >= it.p, auto: false, fb: a.feedback || null }; const pend = Object.values(t.marks).some(m => m.score == null); t.status = pend ? 'submitted' : 'graded'; t.score = pend ? null : Object.values(t.marks).reduce((s, m) => s + m.score, 0); if (!pend) push(t); return { attempt: { ...attRow(t), marks: t.marks } }; };
  D['GET /api/lms/f/stats'] = a => { expire(); const x = exOf(a.exam); const best = {};
    st().atts.filter(t => t.exam_id === x.exam_id && t.status === 'graded' && enrollOf(x.section_id, t.person_id) === 'regular').forEach(t => { const p = 100 * t.score / (t.max_score || 1); if (x.score_policy === 'last' || best[t.person_id] == null || p > best[t.person_id]) best[t.person_id] = p; });
    const v = Object.values(best); const n = v.length; const mean = n ? v.reduce((s, y) => s + y, 0) / n : null; const srt = [...v].sort((p, q) => p - q);
    const qs = {}; st().atts.filter(t => t.exam_id === x.exam_id && t.status !== 'in_progress').forEach(t => t.items.forEach(i => { const m = t.marks[i.q] || {}; const o = qs[i.q] = qs[i.q] || { n: 0, c: 0 }; if (m.ok != null) o.n++; if (m.ok === true) o.c++; }));
    return { exam: x, summary: { n, mean: n ? r2(mean) : null, sd: n ? r2(Math.sqrt(v.reduce((s, y) => s + (y - mean) ** 2, 0) / n)) : null, min: n ? r2(srt[0]) : null, max: n ? r2(srt[n - 1]) : null, median: n ? r2(n % 2 ? srt[(n - 1) / 2] : (srt[n / 2 - 1] + srt[n / 2]) / 2) : null, hist: Array.from({ length: 10 }, (_, g) => ({ from: g * 10, to: g * 10 + 10, n: v.filter(y => Math.min(9, Math.floor(y / 10)) === g).length })) },
      questions: Object.entries(qs).map(([id, o]) => { const q = st().qs.find(z => z.q_id === id); return { q_id: id, stem: q.stem.slice(0, 80), kind: q.kind, difficulty: q.difficulty, n: o.n, correct: o.c, rate: o.n ? r2(100 * o.c / o.n) : null }; }),
      rows: st().atts.filter(t => t.exam_id === x.exam_id).map(t => ({ member_no: mno(t.person_id), unit_code: (demoStudents(x.section_id).find(p => p.person_id === t.person_id) || {}).unit_code, enroll: enrollOf(x.section_id, t.person_id), no: t.no, status: t.status, score: t.score ?? null, max_score: t.max_score ?? null, pct: t.score != null ? r2(100 * t.score / t.max_score) : null, submitted_at: t.submitted_at || null, ip_start: t.ip_start, ip_changed: t.ip_changed })) }; };
  D['GET /api/lms/f/settings'] = () => ({ exam_ip_keep_days: st().ipKeep || 0, note: '시험 응시 IP는 학기 종료일 다음 날부터 보존 일수가 지나면 앞 세 자리만 남기고 가립니다(예: 10.20.30.*). 가린 값은 되돌릴 수 없습니다.' });
  D['POST /api/lms/f/settings'] = a => { if (S.me && S.me.role === 'teacher') ERR(403, 'role', '운영자만 쓸 수 있습니다.'); const k = +a.exam_ip_keep_days; if (!(k >= 0 && k <= 3650)) ERR(400, 'range', '시험 IP 보존 일수은(는) 0~3650 사이로 입력하세요.'); st().ipKeep = Math.round(k); return D['GET /api/lms/f/settings'](); };
  /* 학습자(데모 미리보기) — IP는 데모에서 '데모 브라우저'로 기록 */
  const me = () => { if (!UI.lmsfAs) ERR(401, 'auth', '로그인이 필요합니다.'); return UI.lmsfAs; };
  const DIP = '127.0.0.1(데모)';
  D['GET /api/lms/f/my'] = a => { const pid = me(); expire(); return { now: nowIso(), exams: st().exams.filter(x => x.section_id === a.section && x.status !== 'draft').map(x => ({ ...x, precheck_ok: !!st().pre[x.exam_id + ':' + pid], attempts: st().atts.filter(t => t.exam_id === x.exam_id && t.person_id === pid).map(attRow) })) }; };
  D['POST /api/lms/f/precheck'] = a => { const pid = me(); const r = a.result || {}; const res = { browser: !!r.browser, storage: !!r.storage, screen: !!r.screen, clock: !!r.clock, network_ms: r2(r.network_ms ?? 99999) }; const fails = Object.entries(res).filter(([k, v]) => v === false || (k === 'network_ms' && v > 3000)).map(([k]) => k); if (!fails.length) st().pre[a.exam_id + ':' + pid] = true; return { ok: !fails.length, result: res, fails }; };
  const paper = t => ({ attempt: attRow(t), now: nowIso(), remaining_sec: Math.max(0, Math.floor((Date.parse(t.deadline_at) - Date.now()) / 1000)), answers: t.answers, questions: t.items.map(i => { const q = st().qs.find(z => z.q_id === i.q); return { q_id: q.q_id, kind: q.kind, stem: q.stem, media: q.media, points: i.p, choices: i.c.map(c => q.choices.find(o => o.id === c)) }; }) });
  D['POST /api/lms/f/start'] = a => { const pid = me(); const x = exOf(a.exam_id); expire();
    if (x.status !== 'published') ERR(409, 'not_open', '응시할 수 없는 시험입니다.'); if (x.open_at && Date.now() < Date.parse(x.open_at)) ERR(409, 'not_open', '아직 시험 시간이 아닙니다.'); if (x.close_at && Date.now() >= Date.parse(x.close_at)) ERR(409, 'closed', '시험이 끝났습니다.');
    if (x.ip_allow.length) ERR(403, 'ip', '허용된 장소(네트워크)에서만 응시할 수 있습니다.');
    const cur = st().atts.find(t => t.exam_id === x.exam_id && t.person_id === pid && t.status === 'in_progress'); if (cur) return { ...paper(cur), resumed: true };
    if (x.need_precheck && !st().pre[x.exam_id + ':' + pid]) ERR(409, 'precheck', '응시 전 기능 테스트를 먼저 통과하세요.');
    const n = st().atts.filter(t => t.exam_id === x.exam_id && t.person_id === pid).length; if (n >= x.max_attempts) ERR(409, 'attempts', `응시 횟수(${x.max_attempts}회)를 모두 썼습니다.`);
    const seen = new Set(); let items = []; const add = q => { if (!q || seen.has(q.q_id)) return; seen.add(q.q_id); items.push({ q: q.q_id, p: q.points, c: (x.shuffle_c && /single|multi/.test(q.kind) ? shuffle(q.choices) : q.choices).map(c => c.id) }); };
    x.fixed.forEach(id => add(qOf(id))); x.rules.forEach(r => shuffle(st().qs.filter(q => q.bank_id === r.bank_id && !q.deleted && (!r.difficulty || q.difficulty === r.difficulty) && !seen.has(q.q_id))).slice(0, +r.n).forEach(add));
    if (!items.length) ERR(409, 'empty', '출제할 문항이 없습니다. 교수자에게 문의하세요.'); if (x.shuffle_q) items = shuffle(items);
    const t = { attempt_id: rid(), exam_id: x.exam_id, person_id: pid, no: n + 1, status: 'in_progress', started_at: nowIso(), deadline_at: new Date(Math.min(Date.now() + x.time_limit_min * 6e4, x.close_at ? Date.parse(x.close_at) : Infinity)).toISOString(), ip_start: DIP, ip_last: DIP, ip_changed: false, ip_log: [{ ip: DIP, at: nowIso(), ev: 'start' }], items, answers: {}, marks: {} };
    st().atts.push(t); return { ...paper(t), resumed: false }; };
  const myAtt = id => { const t = st().atts.find(x => x.attempt_id === id && x.person_id === me()); if (!t) ERR(404, 'attempt', '없는 응시 기록입니다.'); return t; };
  D['POST /api/lms/f/answer'] = a => { const t = myAtt(a.attempt_id); if (t.status !== 'in_progress') ERR(409, 'finished', '이미 제출한 시험입니다.'); if (Date.now() > Date.parse(t.deadline_at) + 30e3) { finalize(t, true); return { expired: true, attempt: attRow(t) }; }
    Object.entries(a.answers || {}).forEach(([k, v]) => { if (!t.items.some(i => i.q === k)) ERR(400, 'question', '이 시험에 없는 문항입니다.'); t.answers[k] = v; }); return { expired: false, saved: Object.keys(a.answers || {}).length, remaining_sec: Math.max(0, Math.floor((Date.parse(t.deadline_at) - Date.now()) / 1000)) }; };
  D['POST /api/lms/f/submit'] = a => { const t = myAtt(a.attempt_id); if (t.status !== 'in_progress') ERR(409, 'finished', '이미 제출한 시험입니다.'); if (a.answers && Date.now() <= Date.parse(t.deadline_at) + 30e3) Object.assign(t.answers, a.answers); finalize(t, Date.now() > Date.parse(t.deadline_at) + 30e3); return { attempt: attRow(t) }; };
  D['GET /api/lms/f/result'] = a => { const t = myAtt(a.attempt); const x = exOf(t.exam_id); if (t.status === 'in_progress') ERR(409, 'in_progress', '응시 중인 시험입니다.');
    if (x.show_result === 'never' || (x.show_result === 'after_close' && (!x.close_at || Date.now() < Date.parse(x.close_at)))) return { attempt: { ...attRow(t), score: null, auto_score: null }, visible: false, message: x.show_result === 'never' ? '이 시험은 결과를 공개하지 않습니다.' : '시험이 끝난 뒤 결과가 공개됩니다.' };
    const pct = t.score != null ? 100 * t.score / t.max_score : null; const S2 = D['GET /api/lms/f/stats']({ exam: x.exam_id }); const best = {}; st().atts.filter(z => z.exam_id === x.exam_id && z.status === 'graded' && enrollOf(x.section_id, z.person_id) === 'regular').forEach(z => { const p = 100 * z.score / z.max_score; best[z.person_id] = Math.max(best[z.person_id] ?? -1, p); }); const v = Object.values(best);
    return { attempt: attRow(t), visible: true, pct: pct == null ? null : r2(pct), position: { n: v.length, mean: S2.summary.mean, rank: pct == null ? null : 1 + v.filter(y => y > pct).length, top_pct: pct == null || !v.length ? null : r2(100 * (1 + v.filter(y => y > pct).length) / v.length) }, retry_wrong: x.retry_wrong,
      items: t.items.map(i => { const q = st().qs.find(z => z.q_id === i.q); const m = t.marks[i.q] || {}; return { q_id: q.q_id, kind: q.kind, stem: q.stem, points: i.p, your_answer: t.answers[i.q] ?? null, score: m.score ?? null, ok: m.ok ?? null, feedback: m.fb || null, answer: m.ok != null ? q.answer : null, choices: q.choices, explanation: m.ok === false ? q.explanation : null }; }) }; };
  D['POST /api/lms/f/retry'] = a => { const t = myAtt(a.attempt_id); if (!exOf(t.exam_id).retry_wrong) ERR(409, 'retry_off', '이 시험은 오답 재시도를 쓰지 않습니다.'); const wrong = t.items.map(i => st().qs.find(q => q.q_id === i.q)).filter(q => (t.marks[q.q_id] || {}).ok === false && q.kind !== 'essay');
    if (a.answers) return { checked: wrong.filter(q => q.q_id in a.answers).map(q => ({ q_id: q.q_id, ok: correct(q, a.answers[q.q_id]), answer: q.answer, explanation: q.explanation })) };
    return { questions: wrong.map(q => ({ q_id: q.q_id, kind: q.kind, stem: q.stem, media: q.media, choices: shuffle(q.choices) })) }; };

  /* ═════════ 화면 ═════════ */
  if (typeof MENU === 'object') {
    Object.assign(MENU, { lmsf: { label: '시험 · 문제은행', ws: 'learn', only: 'univ' } });
    Object.keys(PRESET).forEach(k => { const P = PRESET[k]; if (k === 'univ_lms') { if (!P.on.includes('lmsf')) P.on.splice(Math.max(0, P.on.indexOf('lmse')) + 1, 0, 'lmsf'); } else if (!P.on.includes('lmsf') && !P.off.includes('lmsf')) P.off.push('lmsf'); });
  }
  VIEWS.lmsf = () => {
    if (!ON()) return '<div class="empty">대학(학사 LMS) 기관에서 쓰는 화면입니다.</div>'; css();
    const P = secPick('lmsfSec', 'lmsf-sec'); const tab = UI.lmsfT || 'exam';
    let h = head('시험 · 문제은행', '문제은행에서 무작위로 출제하고, 응시 기록 · 서술형 채점 · 결과 통계를 봅니다. 시간 · 횟수 · IP 제한과 자동 채점은 운영 서버가 처리합니다.', P.sec ? `<button class="btn" data-act="lmsf-exam" data-v="">새 시험</button>` : '') + P.html;
    if (!P.sec) return h;
    const sec = P.sec.section_id;
    const er = load('lmsf:ex:' + sec, () => call('GET', '/api/lms/f/exams', { section: sec })); if (er && er.ok) h += todoF(er.ok.exams);
    h += tabs4('lmsfT', [['exam', '시험 · 채점'], ['proctor', '응시 감독'], ['bank', '문제은행'], ['stats', '결과 · 통계']], tab, LIVE_ON() ? [] : [['take', '학생 응시 미리보기']]);
    if (tab === 'exam') return h + examView(sec) + setCard(); if (tab === 'stats') return h + statsView(sec); if (tab === 'take') return h + takeView(sec); if (tab === 'proctor') return h + PROC.view(sec);
    const br = load('lmsf:banks:' + sec, () => call('GET', '/api/lms/f/banks', { section: sec })); if (!br) return h + wait(); if (br.err) return h + errBox(br.err);
    const B = br.ok.banks; const bk = B.find(b => b.bank_id === UI.lmsfB) || B[0]; if (bk) UI.lmsfB = bk.bank_id;
    h += `<div class="card"><div class="ch"><b>문제은행</b><small>분반 전용 · 교과목 공유(같은 교과목 다른 분반에서 재사용) · 기관 공용</small><span class="efh-acts"><button class="btn sm" data-act="lmsf-bank">새 문제은행</button></span></div>
      ${table(['이름', '범위', '문항', '쉬움 · 보통 · 어려움', ''], B.map(b => [`<b>${esc(b.name)}</b>`, tag({ section: '분반', course: '교과목 공유', tenant: '기관 공용' }[b.scope]), String(b.count), `${b.easy} · ${b.mid} · ${b.hard}`, bk && bk.bank_id === b.bank_id ? tag('보는 중', 'g') : `<button class="btn sm" data-act="lmsf-bsel" data-v="${esc(b.bank_id)}">열기</button>`]), '문제은행이 없습니다. 「새 문제은행」으로 만드세요.')}</div>`;
    if (!bk) return h;
    const qr = load('lmsf:q:' + bk.bank_id, () => call('GET', '/api/lms/f/questions', { bank: bk.bank_id })); if (!qr) return h + wait(); if (qr.err) return h + errBox(qr.err);
    return h + `<div class="card"><div class="ch"><b>${esc(bk.name)} 문항 ${qr.ok.questions.length}개</b><span class="efh-acts"><button class="btn sm" data-act="lmsf-q" data-v="">문항 추가</button>${dots([mi('lmsf-classify', '난이도 자동 분류(정답률 기준)', bk.bank_id), mi('lmsf-copy', '선택 문항 이관 · 복사', bk.bank_id)], '문항 다른 작업')}</span></div>
      ${table(['', '문항', '난이도', '정답률', ''], qr.ok.questions.map(q => [`<input type="checkbox" class="lmsf-ck" value="${esc(q.q_id)}" aria-label="선택">`, `${esc(q.stem.slice(0, 60))}<small class="efh-sub2">${esc(KIND[q.kind])} · ${q.points}점${q.media.length ? ' · ' + q.media.map(m => m.type === 'video' ? '영상' : '이미지').join(' · ') : ''}</small>`, tag(DIFF[q.difficulty] + (q.diff_auto ? '(자동)' : ''), q.difficulty === 'hard' ? 'r' : q.difficulty === 'easy' ? 'g' : ''), q.correct_rate == null ? '-' : q.correct_rate + '% (' + q.attempts_n + ')', `<button class="btn sm" data-act="lmsf-q" data-v="${esc(q.q_id)}">편집</button>`]), '문항이 없습니다.')}</div>`;
  };
  /* 지금 할 일: 서술형 채점 대기 · 진행 중 시험 */
  function todoF(L) {
    const pend = L.filter(x => x.pending > 0).sort((a, b) => b.pending - a.pending); const tot = pend.reduce((s, x) => s + x.pending, 0);
    const live = L.filter(x => x.status === 'published' && (!x.open_at || Date.parse(x.open_at) <= Date.now()) && (!x.close_at || Date.parse(x.close_at) > Date.now()));
    const lv = live.length ? ` · 응시 중인 시험 <b>${esc(live[0].title)}</b>${live.length > 1 ? ` 외 ${live.length - 1}개` : ''} (마감 ${fmt(live[0].close_at)})` : '';
    if (tot) return todo(`서술형 채점 대기 <b>${tot}건</b>${lv}`, `<button class="btn sm pri" data-act="lmsf-start-mark" data-v="${esc(pend[0].exam_id)}">채점 시작</button>`);
    if (!L.length) return todo('이 분반에 아직 시험이 없습니다.', `<button class="btn sm pri" data-act="lmsf-exam" data-v="">새 시험 만들기</button>`);
    return todo(`채점할 응시가 없습니다${lv}`, live.length ? `<button class="btn sm pri" data-act="lmsf-start-mark" data-v="${esc(live[0].exam_id)}">응시 현황 보기</button>` : '');
  }
  ACT['lmsf-start-mark'] = el => { UI.lmsfX = el.dataset.v; UI.lmsfT = 'exam'; drop('lmsf:att:'); render(); };
  ACT['lmsf-sec'] = el => { UI.lmsfSec = el.value; UI.lmsfB = null; UI.lmsfX = null; render(); };
  ACT['lmsf-bsel'] = el => { UI.lmsfB = el.dataset.v; render(); };
  ACT['lmsf-bank'] = () => modal('새 문제은행', `<div class="form2"><label class="full">이름<input name="n"></label><label>공유 범위<select name="s"><option value="section">이 분반 전용</option><option value="course">교과목 공유(분반 간 재사용)</option><option value="tenant">기관 공용(운영자)</option></select></label></div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { run(() => call('POST', '/api/lms/f/bank-save', { name: fv(w, 'n'), scope: fv(w, 's'), section_id: UI.lmsfSec }), '문제은행을 만들었습니다.', 'lmsf:'); } }]);
  ACT['lmsf-q'] = el => {
    const qc = C2('lmsf:q:' + UI.lmsfB); const q = qc && qc.questions.find(x => x.q_id === el.dataset.v);
    const ans = q ? (Array.isArray(q.answer) ? q.answer.join(', ') : q.answer && typeof q.answer === 'object' ? `${q.answer.value}±${q.answer.tol}` : '') : '';
    modal(q ? '문항 편집' : '문항 추가', `<div class="form2 efh-form"><label>유형<select name="k">${Object.entries(KIND).map(([k, l]) => `<option value="${k}" ${q && q.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label>난이도<select name="d">${Object.entries(DIFF).map(([k, l]) => `<option value="${k}" ${(q ? q.difficulty : 'mid') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="full">문항<textarea name="s" rows="3">${esc(q ? q.stem : '')}</textarea></label><label class="full">보기(한 줄에 하나, 객관식만)<textarea name="c" rows="4">${esc(q ? q.choices.filter(() => /single|multi/.test(q.kind)).map(c => c.text).join('\n') : '')}</textarea></label>
      <label class="full">정답 — 객관식은 보기 번호(1, 3), 참/거짓은 참 · 거짓, 단답형은 쉼표로 여러 답, 숫자형은 값±허용오차<input name="a" value="${esc(q && /single|multi/.test(q.kind) ? q.answer.map(x => String(q.choices.findIndex(c => c.id === x) + 1)).join(', ') : q && q.kind === 'tf' ? (q.answer[0] === 't' ? '참' : '거짓') : ans)}"></label>
      <label>배점<input type="number" name="p" min="0" value="${q ? q.points : 1}"></label><label class="full">해설(오답 피드백)<textarea name="e" rows="2">${esc(q ? q.explanation : '')}</textarea></label>
      <label>이미지 첨부<input type="file" name="img" accept="image/*"></label><label>영상 주소(https)<input name="v" placeholder="https://…" value="${esc(q ? (q.media.find(m => m.type === 'video') || {}).url || '' : '')}"></label></div>`,
      [...(q ? [{ id: 'd', label: '문항 삭제', run: () => { run(() => call('POST', '/api/lms/f/q-delete', { q_id: q.q_id }), '문항을 지웠습니다.', 'lmsf:'); } }] : []), { id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { (async () => {
        const k = fv(w, 'k'); const lines = fv(w, 'c').split('\n').map(s => s.trim()).filter(Boolean); const choices = lines.map((t, i) => ({ id: 'c' + (i + 1), text: t })); const raw = fv(w, 'a');
        let answer = raw; if (/single|multi/.test(k)) answer = raw.split(/[\s,]+/).filter(Boolean).map(n => 'c' + n); else if (k === 'tf') answer = /참|t|o/i.test(raw) ? 't' : 'f'; else if (k === 'short') answer = raw.split(',').map(s => s.trim()).filter(Boolean); else if (k === 'numeric') { const [v, t] = raw.split('±'); answer = { value: +v, tol: +t || 0 }; }
        const media = q ? q.media.filter(m => m.type === 'image') : []; const f = w.querySelector('[name=img]').files[0]; if (f) { const up = await call('POST', '/api/lms/e/file', { name: f.name, mime: f.type || 'image/png', b64: await toB64(f) }); media.push({ type: 'image', file_id: up.file_id }); } if (fv(w, 'v')) media.push({ type: 'video', url: fv(w, 'v') });
        await run(() => call('POST', '/api/lms/f/q-save', { q_id: q ? q.q_id : undefined, bank_id: UI.lmsfB, kind: k, stem: fv(w, 's'), choices, answer, points: fv(w, 'p'), difficulty: fv(w, 'd'), explanation: fv(w, 'e'), media }), '문항을 저장했습니다.', 'lmsf:'); })().catch(e => toast(e.message, 'warn')); } }], true);
  };
  const C2 = key => EFH.peek(key);
  ACT['lmsf-qdel'] = el => run(() => call('POST', '/api/lms/f/q-delete', { q_id: el.dataset.v }), '문항을 지웠습니다.', 'lmsf:');
  ACT['lmsf-classify'] = el => run(() => call('POST', '/api/lms/f/classify', { bank_id: el.dataset.v, min_n: 3 }).then(r => { toast(`${r.classified}문항의 난이도를 정답률로 다시 정했습니다.`, 'ok'); return r; }), '', 'lmsf:');
  ACT['lmsf-copy'] = el => { const ids = [...document.querySelectorAll('.lmsf-ck:checked')].map(x => x.value); if (!ids.length) return toast('옮길 문항을 고르세요.'); const B = (C2('lmsf:banks:' + UI.lmsfSec) || { banks: [] }).banks.filter(b => b.bank_id !== el.dataset.v);
    modal('문항 이관 · 복사', `<p>${ids.length}문항을 다른 문제은행으로 복사합니다(출처 기록). 다른 교과목 · 분반으로 옮기려면 교과목 공유 · 기관 공용 은행을 고르세요.</p><div class="form2"><label>받을 문제은행<select name="b">${B.map(b => `<option value="${esc(b.bank_id)}">${esc(b.name)}</option>`).join('')}</select></label><label class="ul-ck"><input type="checkbox" name="m"> 원본에서 지우기(이동)</label></div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '복사', kind: 'pri', run: w => { if (!fv(w, 'b')) { toast('받을 문제은행을 먼저 만드세요.', 'warn'); return false; } run(() => call('POST', '/api/lms/f/q-copy', { q_ids: ids, to_bank: fv(w, 'b'), move: fv(w, 'm') }), '문항을 복사했습니다.', 'lmsf:'); } }]); };

  function examView(sec) {
    const r = load('lmsf:ex:' + sec, () => call('GET', '/api/lms/f/exams', { section: sec })); if (!r) return wait(); if (r.err) return errBox(r.err);
    return `<div class="card"><div class="ch"><b>시험</b><small>웹캠 · 화면 감독은 「응시 감독」에서 켭니다</small></div>
      ${table(['시험', '기간', '응시', '채점 대기', ''], r.ok.exams.map(x => [`<b>${esc(x.title)}</b> ${x.status === 'published' ? '' : tag({ draft: '비공개', closed: '마감' }[x.status] || x.status)}<small class="efh-sub2">${x.time_limit_min}분 · ${x.max_attempts}회${x.ip_allow.length ? ' · IP 제한' : ''}${x.need_precheck ? ' · 사전 점검' : ''}${x.fixed.length ? ' · 고정 ' + x.fixed.length + '문항' : ''}${x.rules.length ? ' · 무작위 ' + x.rules.reduce((s, y) => s + +y.n, 0) + '문항' : ''}</small>`, `${fmt(x.open_at)} ~ ${fmt(x.close_at)}`, String(x.attempts), x.pending ? tag(String(x.pending), 'y') : '0',
        `<button class="btn sm" data-act="lmsf-att" data-v="${esc(x.exam_id)}">${UI.lmsfX === x.exam_id ? '보는 중' : '응시 · 채점'}</button>`]), '시험이 없습니다. 「새 시험」으로 만드세요.')}</div>` + attView();
  }
  /* 설정(접기): 시험 IP 보존 기간 */
  function setCard() { const r = load('lmsf:ipset', () => call('GET', '/api/lms/f/settings')); if (!r || !r.ok) return ''; const admin = !S.me || S.me.role !== 'teacher';
    return `<details class="card efh-set"${UI.lmsfSetO ? ' open' : ''}><summary data-act="lmsf-seto">설정 · 시험 IP 보존 기간 <small class="muted">학기 종료 후 ${r.ok.exam_ip_keep_days}일 지나면 가림</small></summary><p class="efh-note">${esc(r.ok.note)}</p><p>학기 종료 후 <b>${r.ok.exam_ip_keep_days}일</b> 지나면 가림${admin ? ` <input type="number" min="0" max="3650" id="lmsfIpKeep" value="${r.ok.exam_ip_keep_days}" aria-label="보존 일수" style="width:90px"> <button class="btn sm" data-act="lmsf-ipkeep">저장</button>` : ''}</p></details>`; }
  ACT['lmsf-seto'] = (el, e) => { UI.lmsfSetO = !el.parentElement.open; el.parentElement.open = UI.lmsfSetO; };
  ACT['lmsf-ipkeep'] = () => run(() => call('POST', '/api/lms/f/settings', { exam_ip_keep_days: +document.getElementById('lmsfIpKeep').value }), '시험 IP 보존 기간을 저장했습니다.', 'lmsf:ipset');
  ACT['lmsf-exam'] = el => {
    const sec = UI.lmsfSec; const ex = (C2('lmsf:ex:' + sec) || { exams: [] }).exams.find(x => x.exam_id === el.dataset.v); const B = (C2('lmsf:banks:' + sec) || { banks: [] }).banks; if (!C2('lmsf:banks:' + sec)) load('lmsf:banks:' + sec, () => call('GET', '/api/lms/f/banks', { section: sec }));
    const loc = t => t ? new Date(Date.parse(t) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : ''; const x = ex || { time_limit_min: 60, max_attempts: 1, shuffle_q: true, shuffle_c: true, rules: [], ip_allow: [], show_result: 'immediate', retry_wrong: true, score_policy: 'best', status: 'published' };
    const rule = d => { const r = x.rules.find(y => (y.difficulty || '') === d) || {}; return `<label>${d ? DIFF[d] : '난이도 무관'} 문항 수<input type="number" min="0" max="200" name="n_${d || 'any'}" value="${r.n || ''}"></label>`; };
    modal(ex ? '시험 편집' : '새 시험', `<div class="form2 efh-form"><label class="full">제목<input name="t" value="${esc(x.title || '')}"></label><label>시작<input type="datetime-local" name="o" value="${loc(x.open_at)}"></label><label>종료<input type="datetime-local" name="cl" value="${loc(x.close_at)}"></label>
      <label>제한 시간(분)<input type="number" name="tl" min="1" max="600" value="${x.time_limit_min}"></label><label>응시 횟수<input type="number" name="ma" min="1" max="20" value="${x.max_attempts}"></label>
      <label class="full">출제 문제은행<select name="b">${B.map(b => `<option value="${esc(b.bank_id)}" ${x.rules[0] && x.rules[0].bank_id === b.bank_id ? 'selected' : ''}>${esc(b.name)} (${b.count}문항)</option>`).join('')}</select></label>${rule('easy')}${rule('mid')}${rule('hard')}${rule('')}
      <label class="ul-ck"><input type="checkbox" name="sq" ${x.shuffle_q ? 'checked' : ''}> 문항 순서 무작위</label><label class="ul-ck"><input type="checkbox" name="sc" ${x.shuffle_c ? 'checked' : ''}> 보기 순서 무작위</label>
      <label class="full">허용 IP 대역(쉼표, 비우면 제한 없음)<input name="ip" placeholder="10.20.0.0/16" value="${esc(x.ip_allow.join(', '))}"></label><label class="ul-ck"><input type="checkbox" name="pc" ${x.need_precheck ? 'checked' : ''}> 응시 전 기능 테스트 필수</label>
      <label>결과 공개<select name="sr">${[['immediate', '제출 즉시'], ['after_close', '시험 종료 후'], ['never', '공개 안 함']].map(([k, l]) => `<option value="${k}" ${x.show_result === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label>성적 반영<select name="sp"><option value="best" ${x.score_policy === 'best' ? 'selected' : ''}>최고 점수</option><option value="last" ${x.score_policy === 'last' ? 'selected' : ''}>마지막 응시</option></select></label>
      <label class="ul-ck"><input type="checkbox" name="rw" ${x.retry_wrong ? 'checked' : ''}> 오답 재시도(연습, 성적 미반영)</label><label>상태<select name="st">${[['draft', '비공개'], ['published', '공개'], ['closed', '마감']].map(([k, l]) => `<option value="${k}" ${x.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const bk = fv(w, 'b'); const rules = ['easy', 'mid', 'hard', 'any'].map(d => ({ bank_id: bk, difficulty: d === 'any' ? null : d, n: +fv(w, 'n_' + d) || 0 })).filter(r => r.n > 0 && r.bank_id); const iso = n => fv(w, n) ? new Date(fv(w, n)).toISOString() : null;
        run(() => call('POST', '/api/lms/f/exam-save', { exam_id: ex ? ex.exam_id : undefined, section_id: sec, title: fv(w, 't'), open_at: iso('o'), close_at: iso('cl'), time_limit_min: fv(w, 'tl'), max_attempts: fv(w, 'ma'), rules, fixed: ex ? ex.fixed : [], shuffle_q: fv(w, 'sq'), shuffle_c: fv(w, 'sc'), ip_allow: fv(w, 'ip').split(',').map(s => s.trim()).filter(Boolean), need_precheck: fv(w, 'pc'), show_result: fv(w, 'sr'), score_policy: fv(w, 'sp'), retry_wrong: fv(w, 'rw'), status: fv(w, 'st') }), '시험을 저장했습니다.', 'lmsf:'); } }], true);
  };
  ACT['lmsf-att'] = el => { UI.lmsfX = el.dataset.v; drop('lmsf:att:'); render(); };
  function attView() {
    if (!UI.lmsfX) return ''; const r = load('lmsf:att:' + UI.lmsfX, () => call('GET', '/api/lms/f/attempts', { exam: UI.lmsfX })); if (!r) return wait(); if (r.err) return errBox(r.err);
    const P0 = r.ok.attempts.filter(t => t.status === 'submitted').length;
    return `<div class="card"><div class="ch"><b>${esc(r.ok.exam.title)} — 응시 기록</b><small>채점 대기 ${P0}건 · 시작 IP와 IP 변경 표시(부정행위 확인용)</small><span class="efh-acts"><button class="btn sm" data-act="lmsf-exam" data-v="${esc(r.ok.exam.exam_id)}">시험 설정 편집</button></span></div>${table(['학번', '상태', '점수', 'IP', ''], r.ok.attempts.slice().sort((a, b) => (a.status === 'submitted' ? 0 : 1) - (b.status === 'submitted' ? 0 : 1) || (a.member_no < b.member_no ? -1 : 1)).map(t => [`<b>${esc(t.member_no)}</b>${t.enroll === 'audit' ? ' ' + tag('청강', 'y') : ''}<small class="efh-sub2">${t.no}회차 · ${fmt(t.submitted_at)}</small>`, tag({ in_progress: '응시 중', submitted: '채점 대기', graded: '채점 완료' }[t.status], t.status === 'submitted' ? 'y' : t.status === 'graded' ? 'g' : ''), t.score == null ? (t.auto_score == null ? '-' : `자동 ${t.auto_score} / ${t.max_score}`) : `${t.score} / ${t.max_score}`, esc(t.ip_start || '') + (t.ip_changed ? ' ' + tag('IP 변경', 'r') : ''), t.status !== 'in_progress' ? `<button class="btn sm" data-act="lmsf-mark" data-v="${esc(t.attempt_id)}">${t.status === 'submitted' ? '채점' : '보기'}</button>` : '']), '응시 기록이 없습니다.')}</div>`;
  }
  ACT['lmsf-mark'] = async el => { const r = await run(() => call('GET', '/api/lms/f/attempt', { id: el.dataset.v })); if (!r) return; const t = r.attempt;
    const showAns = (q, v) => v == null ? '<span class="muted">무응답</span>' : esc(/single|multi|tf/.test(q.kind) ? [].concat(v).map(id => (q.choices.find(c => c.id === id) || {}).text || id).join(', ') : String(v));
    modal(`채점 — ${t.member_no} ${t.no}회차`, r.items.map(q => { const m = t.marks[q.q_id] || {}; return `<div class="efh-q"><b>${q.order}. ${esc(q.stem)}</b> <small>(${q.p}점 · ${esc(KIND[q.kind])})</small><p>답: ${showAns(q, t.answers[q.q_id])} ${m.ok === true ? tag('정답', 'g') : m.ok === false ? tag('오답', 'r') : tag('채점 필요', 'y')}</p>
      <label>점수 <input type="number" min="0" max="${q.p}" step="0.5" data-q="${esc(q.q_id)}" class="lmsf-ms" value="${m.score ?? ''}"></label> <label>피드백 <input class="lmsf-mf" data-q="${esc(q.q_id)}" value="${esc(m.fb || '')}"></label></div>`; }).join(''),
      [{ id: 'c', label: '닫기' }, { id: 'ok', label: '채점 저장', kind: 'pri', run: w => { (async () => { for (const i of w.querySelectorAll('.lmsf-ms')) { const q = i.dataset.q; const m = t.marks[q] || {}; const fb = w.querySelector(`.lmsf-mf[data-q="${q}"]`).value; if (i.value === '' || (+i.value === m.score && fb === (m.fb || ''))) continue; await call('POST', '/api/lms/f/mark', { attempt_id: t.attempt_id, q_id: q, score: +i.value, feedback: fb }); } toast('채점을 저장했습니다.', 'ok'); drop('lmsf:'); render(); })().catch(e => toast(e.message, 'warn')); } }], true); };

  function statsView(sec) {
    const r = load('lmsf:ex:' + sec, () => call('GET', '/api/lms/f/exams', { section: sec })); if (!r) return wait(); if (r.err) return errBox(r.err); const L = r.ok.exams; if (!L.length) return '<div class="empty">시험이 없습니다.</div>';
    const id = L.some(x => x.exam_id === UI.lmsfS) ? UI.lmsfS : L[0].exam_id; UI.lmsfS = id;
    const s = load('lmsf:stat:' + id, () => call('GET', '/api/lms/f/stats', { exam: id })); const pick = `<div class="bar2"><select data-chg="lmsf-spick" aria-label="시험 선택">${L.map(x => `<option value="${esc(x.exam_id)}" ${x.exam_id === id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select><button class="btn sm" data-act="lmsf-xls">엑셀(CSV) 내려받기</button></div>`;
    if (!s) return pick + wait(); if (s.err) return pick + errBox(s.err); const m = s.ok.summary; const mx = Math.max(1, ...m.hist.map(x => x.n));
    return pick + `<div class="kpis">${kpi('응시(정규)', m.n)}${kpi('평균(%)', m.mean ?? '-')}${kpi('표준편차', m.sd ?? '-')}${kpi('최저 · 최고', m.n ? `${m.min} · ${m.max}` : '-')}${kpi('중앙값', m.median ?? '-')}</div>
      <div class="card"><div class="ch"><b>성적 분포</b><small>백분율 10점 구간 · 청강생 제외</small></div><div class="efh-hist" role="img" aria-label="성적 분포">${m.hist.map(x => `<div title="${x.from}~${x.to}: ${x.n}명"><i style="height:${100 * x.n / mx}%"></i></div>`).join('')}</div><div class="efh-hist" style="height:auto">${m.hist.map(x => `<small style="flex:1">${x.from}</small>`).join('')}</div></div>
      <div class="card"><div class="ch"><b>문항 분석</b></div>${table(['문항', '유형', '난이도', '채점 수', '정답률'], s.ok.questions.map(q => [esc(q.stem), esc(KIND[q.kind]), esc(DIFF[q.difficulty]), String(q.n), q.rate == null ? '-' : bar(q.rate) + ' ' + q.rate + '%']))}</div>
      <div class="card efh-wrap">${table(['학번', '점수', '%', 'IP'], s.ok.rows.map(x => [`<b>${esc(x.member_no)}</b>${x.enroll === 'audit' ? ' ' + tag('청강', 'y') : ''}<small class="efh-sub2">${x.no}회차 · ${esc({ in_progress: '응시 중', submitted: '채점 대기', graded: '채점 완료' }[x.status] || x.status)}</small>`, x.score == null ? '-' : `${x.score}/${x.max_score}`, x.pct == null ? '-' : String(x.pct), esc(x.ip_start || '') + (x.ip_changed ? ' ' + tag('IP 변경', 'r') : '')]))}</div>`;
  }
  ACT['lmsf-spick'] = el => { UI.lmsfS = el.value; render(); };
  ACT['lmsf-xls'] = () => { const s = C2('lmsf:stat:' + UI.lmsfS); if (!s) return; downloadCSV(`시험결과_${s.exam.title}_${today()}.csv`, ['학번', '학과', '구분', '회차', '상태', '점수', '만점', '백분율', '제출', '시작 IP', 'IP 변경'], s.rows.map(x => [x.member_no, x.unit_code || '', x.enroll === 'audit' ? '청강' : '정규', x.no, x.status, x.score ?? '', x.max_score ?? '', x.pct ?? '', x.submitted_at || '', x.ip_start || '', x.ip_changed ? 'Y' : ''])); };

  /* 학생 응시 미리보기(데모) — 운영: 학습자 포털이 /api/lms/f/my · precheck · start · answer · submit · result · retry를 부른다 */
  let tick = 0;
  function takeView(sec) {
    const ps = demoStudents(sec); if (!ps.some(p => p.person_id === UI.lmsfAs)) UI.lmsfAs = ps[0] && ps[0].person_id;
    const pick = `<div class="bar2"><label class="efh-lab">학생 <select data-chg="lmsf-as" aria-label="학생 선택">${ps.map(p => `<option value="${esc(p.person_id)}" ${p.person_id === UI.lmsfAs ? 'selected' : ''}>${esc(p.member_no)}${p.kind === 'audit' ? ' (청강)' : ''}</option>`).join('')}</select></label><small class="muted">데모 동작 — IP는 데모 값으로 기록합니다.</small></div>`;
    if (UI.lmsfP) return pick + paperView(UI.lmsfP);
    if (UI.lmsfR) { const r = load('lmsf:res:' + UI.lmsfR, () => call('GET', '/api/lms/f/result', { attempt: UI.lmsfR })); if (!r) return pick + wait(); if (r.err) return pick + errBox(r.err); return pick + resultView(r.ok); }
    const r = load('lmsf:my:' + sec + ':' + UI.lmsfAs, () => call('GET', '/api/lms/f/my', { section: sec })); if (!r) return pick + wait(); if (r.err) return pick + errBox(r.err);
    return pick + (r.ok.exams.map(x => `<div class="card"><div class="ch"><b>${esc(x.title)}</b><small>${x.time_limit_min}분 · ${x.attempts.length}/${x.max_attempts}회 응시</small></div>
      <div class="efh-acts">${x.need_precheck && !x.precheck_ok ? `<button class="btn sm" data-act="lmsf-pre" data-v="${esc(x.exam_id)}">응시 전 기능 테스트</button>` : ''}<button class="btn sm pri" data-act="lmsf-start" data-v="${esc(x.exam_id)}">응시하기</button>${x.attempts.filter(t => t.status !== 'in_progress').map(t => `<button class="btn sm" data-act="lmsf-res" data-v="${esc(t.attempt_id)}">${t.no}회차 결과</button>`).join('')}</div></div>`).join('') || '<div class="empty">공개된 시험이 없습니다.</div>');
  }
  ACT['lmsf-as'] = el => { UI.lmsfAs = el.value; UI.lmsfP = null; UI.lmsfR = null; render(); };
  ACT['lmsf-pre'] = el => run(async () => { const t0 = performance.now(); try { await fetch(location.href, { method: 'HEAD', cache: 'no-store' }); } catch (e) { } const ms = Math.round(performance.now() - t0); let storage = false; try { localStorage.setItem('efh_t', '1'); localStorage.removeItem('efh_t'); storage = true; } catch (e) { }
    const r = await call('POST', '/api/lms/f/precheck', { exam_id: el.dataset.v, result: { browser: !!(window.fetch && window.Promise), storage, screen: innerWidth >= 320, clock: true, network_ms: ms } }); toast(r.ok ? '기능 테스트를 통과했습니다.' : '기능 테스트 실패: ' + r.fails.join(', '), r.ok ? 'ok' : 'warn'); return r; }, '', 'lmsf:my');
  ACT['lmsf-start'] = el => run(async () => { const r = await call('POST', '/api/lms/f/start', { exam_id: el.dataset.v }); UI.lmsfPT = await PROC.previewBegin(el.dataset.v, r.attempt.attempt_id); UI.lmsfP = r; UI.lmsfR = null; return r; }, '', 'lmsf:my');
  function paperView(p) {
    clearInterval(tick); tick = setInterval(() => { const e = document.getElementById('efhTimer'); if (!e) return clearInterval(tick); const s = Math.max(0, Math.floor((Date.parse(p.attempt.deadline_at) - Date.now()) / 1000)); e.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (!s) { clearInterval(tick); ACT['lmsf-submit'](); } }, 1000);
    const a = p.answers || {}; const has = (q, id) => [].concat(a[q.q_id] ?? []).includes(id);
    return `<div class="card"><div class="ch"><b>${p.attempt.no}회차 응시</b><small>남은 시간 <span class="efh-timer" id="efhTimer">${Math.floor(p.remaining_sec / 60)}:${String(p.remaining_sec % 60).padStart(2, '0')}</span> · 답은 고를 때마다 저장됩니다(시간은 서버 기준)</small></div>
      ${p.questions.map((q, i) => `<div class="efh-q" data-q="${esc(q.q_id)}"><b>${i + 1}. ${esc(q.stem)}</b> <small>(${q.points}점)</small>${(q.media || []).map(m => m.type === 'video' ? `<p>${tag('영상')} ${esc(m.url)}</p>` : `<p>${tag('이미지 첨부')}</p>`).join('')}
        ${/single|tf/.test(q.kind) ? q.choices.map(c => `<label><input type="radio" name="q_${esc(q.q_id)}" value="${esc(c.id)}" data-chg="lmsf-ans" data-q="${esc(q.q_id)}" ${has(q, c.id) ? 'checked' : ''}> ${esc(c.text)}</label>`).join('')
        : q.kind === 'multi' ? q.choices.map(c => `<label><input type="checkbox" value="${esc(c.id)}" data-chg="lmsf-ans" data-q="${esc(q.q_id)}" data-multi="1" ${has(q, c.id) ? 'checked' : ''}> ${esc(c.text)}</label>`).join('')
        : q.kind === 'essay' ? `<textarea rows="4" class="efh-ans" data-chg="lmsf-ans" data-q="${esc(q.q_id)}" aria-label="답">${esc(a[q.q_id] || '')}</textarea>` : `<input class="efh-ans" data-chg="lmsf-ans" data-q="${esc(q.q_id)}" aria-label="답" value="${esc(a[q.q_id] ?? '')}">`}</div>`).join('')}
      <div class="efh-acts"><button class="btn pri" data-act="lmsf-submit">제출</button></div></div>`;
  }
  ACT['lmsf-ans'] = el => { const q = el.dataset.q; let v; if (el.dataset.multi) v = [...document.querySelectorAll(`[data-q="${q}"][data-multi]:checked`)].map(x => x.value); else v = el.value;
    UI.lmsfP.answers = { ...(UI.lmsfP.answers || {}), [q]: v }; call('POST', '/api/lms/f/answer', { attempt_id: UI.lmsfP.attempt.attempt_id, ptoken: UI.lmsfPT || undefined, answers: { [q]: v } }).then(r => { if (r.expired) { toast('시험 시간이 끝나 자동 제출했습니다.', 'warn'); UI.lmsfR = r.attempt.attempt_id; UI.lmsfP = null; drop('lmsf:'); render(); } }).catch(e => toast(e.message, 'warn')); };
  ACT['lmsf-submit'] = () => { const p = UI.lmsfP; if (!p) return; clearInterval(tick); run(async () => { const r = await call('POST', '/api/lms/f/submit', { attempt_id: p.attempt.attempt_id, ptoken: UI.lmsfPT || undefined, answers: p.answers || {} }); UI.lmsfP = null; UI.lmsfPT = null; UI.lmsfR = r.attempt.attempt_id; return r; }, '제출했습니다. 객관식은 바로 채점됩니다.', 'lmsf:'); };
  ACT['lmsf-res'] = el => { UI.lmsfR = el.dataset.v; UI.lmsfP = null; drop('lmsf:res:'); render(); };
  ACT['lmsf-back'] = () => { UI.lmsfR = null; UI.lmsfP = null; drop('lmsf:'); render(); };
  function resultView(r) {
    const back = `<button class="btn sm" data-act="lmsf-back">시험 목록</button>`; if (!r.visible) return `<div class="card"><p>${esc(r.message)}</p>${back}</div>`; const t = r.attempt; const pos = r.position || {};
    const txt = (q, v) => v == null ? '무응답' : /single|multi|tf/.test(q.kind) ? [].concat(v).map(id => (q.choices.find(c => c.id === id) || {}).text || id).join(', ') : typeof v === 'object' ? `${v.value}` : String(v);
    return `<div class="kpis">${kpi('점수', t.score == null ? `자동 ${t.auto_score} (서술형 채점 대기)` : `${t.score} / ${t.max_score}`)}${kpi('백분율', r.pct ?? '-')}${kpi('내 위치', pos.rank ? `${pos.rank}등 / ${pos.n}명 (상위 ${pos.top_pct}%)` : '-')}${kpi('평균', pos.mean ?? '-')}</div>
      <div class="card"><div class="ch"><b>문항별 결과 · 오답 피드백</b>${back}${r.retry_wrong ? `<button class="btn sm" data-act="lmsf-retry" data-v="${esc(t.attempt_id)}">오답 다시 풀기</button>` : ''}</div>${r.items.map((q, i) => `<div class="efh-q"><b>${i + 1}. ${esc(q.stem)}</b> ${q.ok === true ? tag('정답', 'g') : q.ok === false ? tag('오답', 'r') : tag('채점 대기', 'y')}<p>내 답: ${esc(txt(q, q.your_answer))}${q.ok === false && q.answer ? ` · 정답: ${esc(txt(q, q.answer))}` : ''}</p>${q.explanation ? `<p class="muted">해설: ${esc(q.explanation)}</p>` : ''}${q.feedback ? `<p>교수 피드백: ${esc(q.feedback)}</p>` : ''}</div>`).join('')}</div>`;
  }
  ACT['lmsf-retry'] = async el => { const r = await run(() => call('POST', '/api/lms/f/retry', { attempt_id: el.dataset.v })); if (!r) return; if (!r.questions.length) return toast('다시 풀 오답이 없습니다.', 'ok');
    modal('오답 다시 풀기(성적 미반영)', r.questions.map((q, i) => `<div class="efh-q"><b>${i + 1}. ${esc(q.stem)}</b>${q.choices.length ? q.choices.map(c => `<label><input type="${q.kind === 'multi' ? 'checkbox' : 'radio'}" name="r_${esc(q.q_id)}" value="${esc(c.id)}"> ${esc(c.text)}</label>`).join('') : `<input name="r_${esc(q.q_id)}" aria-label="답">`}</div>`).join(''),
      [{ id: 'c', label: '닫기' }, { id: 'ok', label: '확인', kind: 'pri', run: w => { const answers = {}; r.questions.forEach(q => { const els = [...w.querySelectorAll(`[name="r_${q.q_id}"]`)]; const v = q.kind === 'multi' ? els.filter(x => x.checked).map(x => x.value) : q.choices.length ? (els.find(x => x.checked) || {}).value : els[0].value; if (v != null && v !== '') answers[q.q_id] = v; });
        call('POST', '/api/lms/f/retry', { attempt_id: el.dataset.v, answers }).then(c => toast(`${c.checked.filter(x => x.ok).length} / ${c.checked.length}문항 정답입니다.`, 'ok')).catch(e => toast(e.message, 'warn')); } }], true); };
  /* ═════════ x3 · SFR-089 웹 시험 감독(응시 감독 탭) ═════════
     운영: /api/lms/f/proctor-* (sql/a3_integrity.sql). 데모: 아래 처리기가 같은 규칙(사건 가중치 · 1기기 · 보존 기간 · 열람 기록)으로 흉내 낸다.
     웹 페이지가 못 하는 것(다른 프로그램 차단 · PC 화면 전체 녹화)은 화면과 설정에 그대로 밝히고, 보안 브라우저 연동 지점(window.DD_SECURE_BROWSER)만 둔다. */
  const PROC = (() => {
    const PK = { begin: '감독 시작', resume: '다시 연결', second_device: '다른 기기에서 시작', blocked_device: '다른 기기 시작 막음', fs_exit: '전체 화면 나감', fs_enter: '전체 화면 복귀', blur: '다른 창 클릭', focus: '시험 창 복귀',
      hidden: '탭 · 창 전환', visible: '시험 화면 복귀', copy: '복사 시도', cut: '잘라내기 시도', paste: '붙여넣기 시도', context: '오른쪽 클릭', print: '인쇄 시도', devtools: '개발자 도구 단축키', capture: '화면 캡처 · 공유 시도',
      shortcut: '금지 단축키', no_face: '얼굴 안 보임', multi_face: '얼굴 여러 개', face_ok: '얼굴 확인', face_skip: '얼굴 확인 건너뜀', cam_off: '카메라 꺼짐', cam_on: '카메라 켜짐', net_off: '네트워크 끊김', net_on: '네트워크 복구',
      resize: '창 크기 변경', id_photo: '본인 확인 사진', submit: '제출' };
    const W8 = { fs_exit: 10, blur: 4, hidden: 6, copy: 3, cut: 3, paste: 5, context: 1, print: 6, devtools: 8, capture: 10, shortcut: 2, no_face: 8, multi_face: 15, cam_off: 12, net_off: 2, resize: 1, second_device: 20, blocked_device: 10 };
    const CK = ['fs_exit', 'fs_enter', 'blur', 'focus', 'hidden', 'visible', 'copy', 'cut', 'paste', 'context', 'print', 'devtools', 'capture', 'shortcut', 'no_face', 'multi_face', 'face_ok', 'cam_off', 'cam_on', 'net_off', 'net_on', 'resize', 'face_skip'];
    const DEC = { pending: ['판정 전', ''], ok: ['문제없음', 'g'], warn: ['주의', 'y'], void: ['무효', 'r'] };
    const LIMITS = ['웹 페이지는 다른 프로그램(메신저 · 원격 제어 · 녹화 프로그램)의 실행을 막을 수 없습니다.', '웹 페이지는 PC 화면 전체를 녹화하거나 다른 모니터를 볼 수 없습니다.', '캡처 키 · 화면 공유는 일부만 감지합니다(운영체제 단축키는 브라우저가 받지 못할 수 있음).', '휴대폰 등 두 번째 기기 사용은 웹캠 사진과 얼굴 수로만 간접 확인합니다.', '완전한 차단이 필요하면 전용 보안 브라우저(연동 후 동작)를 함께 쓰세요.'];
    const consent = k => `이 시험은 부정행위 방지를 위해 응시 중 다음을 기록합니다: ① 응시 전 본인 확인 사진 1장 ② 정해진 간격의 웹캠 사진 ③ 전체 화면 이탈 · 창 전환 · 복사 · 붙여넣기 · 인쇄 · 개발자 도구 단축키 같은 화면 사건과 시각. 영상 · 소리는 녹화하지 않고 사진만 저장하며, 얼굴 인식은 이 기기 안에서 얼굴 수만 셉니다(얼굴 특징 · 생체 정보는 저장하지 않음). 사진은 담당 교수 · 운영자만 보며, 볼 때마다 열람 기록이 남습니다. 사진은 촬영 ${k}일 뒤 자동 파기됩니다. 동의하지 않으면 감독 시험에 응시할 수 없으니 교수자에게 대체 방법을 문의하세요.`;
    const DEF = { enabled: false, need_camera: true, need_mic: false, id_photo: true, fullscreen: true, block_copy: true, face_check: true, snap_sec: 60, single_device: 'kick', idv: 'none', secure_browser: false, risk_flag: 30 };

    /* ── 데모 저장소 ── */
    const PR = () => { const X = st(); X.pr = X.pr || { cfg: {}, sess: {}, ev: [], snaps: [], views: [], keep: 30, seq: 1 }; return X.pr; };
    const cfgOf = ex => ({ exam_id: ex, ...DEF, ...(PR().cfg[ex] || {}) });
    const riskOf = att => { const by = {}; PR().ev.filter(e => e.attempt_id === att && e.weight > 0).forEach(e => { by[e.kind] = by[e.kind] || { w: e.weight, n: 0 }; by[e.kind].n++; }); return Math.min(100, Object.values(by).reduce((s, o) => s + Math.min(o.w * o.n, o.w * 5), 0)); };
    const evAdd = (att, kind, detail, at) => { const P = PR(); P.ev.push({ id: P.seq++, attempt_id: att, at: at || nowIso(), client_at: null, kind, weight: W8[kind] || 0, detail: detail || null }); const s = P.sess[att]; if (s) s.risk = riskOf(att); };
    const purge = () => { const P = PR(); let n = 0; P.snaps.forEach(x => { if (!x.purged && Date.parse(x.purge_at) <= Date.now()) { x.purged = true; x.data = null; n++; } }); return n; };
    const tokOf = () => rid().replace(/-/g, '') + rid().replace(/-/g, '');
    const hsh = v => { let h = 2166136261; for (const c of String(v)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
    const viewer = () => (S.me && (S.me.email || S.me.name)) || '데모 운영자';
    /* 데모 시드: 마감된 첫 시험(1차 퀴즈) 응시에 감독 기록을 붙여 검토 화면이 비지 않게 한다 */
    function seed(exId) {
      const P = PR(); P.seeded = P.seeded || {}; if (P.seeded[exId]) return; P.seeded[exId] = 1;
      const x = st().exams.find(e => e.exam_id === exId); if (!x || x.title !== '1차 퀴즈') return;
      P.cfg[exId] = { ...DEF, enabled: true, snap_sec: 60 };
      st().atts.filter(t => t.exam_id === exId).forEach((t, i) => {
        const h = hsh(t.attempt_id); const t0 = Date.parse(t.started_at); const at = m => new Date(t0 + m * 6e4).toISOString();
        P.sess[t.attempt_id] = { attempt_id: t.attempt_id, exam_id: exId, token: tokOf(), device: ['desktop · Chrome', 'laptop · Edge', 'desktop · Whale'][h % 3], checks: { camera: true, mic: false, browser: true, network_ms: 30 + h % 90 }, consent_at: at(0), began_at: at(0), last_at: t.submitted_at || at(12), ended_at: t.submitted_at, gen: 1, risk: 0, decision: 'pending' };
        evAdd(t.attempt_id, 'begin', { device: P.sess[t.attempt_id].device }, at(0)); evAdd(t.attempt_id, 'id_photo', { faces: 1 }, at(0.2));
        P.snaps.push({ snap_id: rid(), attempt_id: t.attempt_id, kind: 'id', at: at(0.2), faces: 1, face_method: 'facedetector', bytes: 14200, purge_at: new Date(Date.parse(at(0.2)) + P.keep * 864e5).toISOString(), purged: false, demo: 1 });
        [4, 8].forEach(m => P.snaps.push({ snap_id: rid(), attempt_id: t.attempt_id, kind: 'periodic', at: at(m), faces: i === 1 && m === 8 ? 2 : 1, face_method: 'facedetector', bytes: 13800, purge_at: new Date(Date.parse(at(m)) + P.keep * 864e5).toISOString(), purged: false, demo: 1 }));
        if (h % 3 === 0) evAdd(t.attempt_id, 'blur', null, at(3));
        if (i === 1) { evAdd(t.attempt_id, 'hidden', null, at(5)); evAdd(t.attempt_id, 'paste', { len: 180 }, at(5.5)); evAdd(t.attempt_id, 'multi_face', { faces: 2 }, at(8)); evAdd(t.attempt_id, 'fs_exit', null, at(9)); }
        if (i === 4) { evAdd(t.attempt_id, 'second_device', { device: 'mobile · Safari' }, at(6)); evAdd(t.attempt_id, 'devtools', { key: 'F12' }, at(7)); }
        evAdd(t.attempt_id, 'submit', null, t.submitted_at || at(12));
      });
    }
    const myAtt = a => { const pid = UI.lmsfAs; const t = st().atts.find(x => x.attempt_id === a.attempt_id && x.person_id === pid); if (!t) ERR(404, 'attempt', '없는 응시 기록입니다.'); return t; };
    const psess = a => { const t = myAtt(a); const c = cfgOf(t.exam_id); const s = PR().sess[t.attempt_id]; if (!s) ERR(409, 'proctor_begin', '응시 감독 준비(장치 확인 · 동의)를 먼저 마치세요.');
      if (c.single_device !== 'off' && s.token !== a.ptoken) ERR(409, 'replaced', '다른 기기 · 창에서 이 시험을 이어 응시하고 있어 이 화면은 종료되었습니다.'); s.last_at = nowIso(); return { t, c, s }; };
    D['GET /api/lms/f/proctor'] = a => { const x = exOf(a.exam); const pid = UI.lmsfAs; const t = st().atts.find(z => z.exam_id === x.exam_id && z.person_id === pid && z.status === 'in_progress'); const s = t && PR().sess[t.attempt_id];
      return { exam_id: x.exam_id, cfg: cfgOf(x.exam_id), consent: consent(PR().keep), keep_days: PR().keep, limits: LIMITS, session: s ? { attempt_id: s.attempt_id, began_at: s.began_at, risk: s.risk } : null }; };
    D['POST /api/lms/f/proctor-begin'] = a => { const t = myAtt(a); const c = cfgOf(t.exam_id); const ck = a.checks || {}; const P = PR();
      if (!c.enabled) ERR(409, 'proctor_off', '감독을 쓰지 않는 시험입니다.'); if (t.status !== 'in_progress') ERR(409, 'finished', '이미 제출한 시험입니다.');
      if (!a.consent) ERR(400, 'consent', '감독 기록(사진 · 화면 사건)에 동의해야 응시할 수 있습니다.');
      if (c.need_camera && !ck.camera) ERR(409, 'device', '카메라 사용을 허용해야 응시할 수 있습니다. 브라우저 주소창의 카메라 권한을 확인하세요.'); if (c.need_mic && !ck.mic) ERR(409, 'device', '마이크 사용을 허용해야 응시할 수 있습니다.');
      if (c.secure_browser && !(a.secure_browser && a.secure_browser.vendor)) ERR(428, 'secure_browser', '이 시험은 전용 보안 브라우저에서만 응시할 수 있습니다(보안 브라우저 연동 후 동작).');
      let s = P.sess[t.attempt_id]; const fresh = s && !s.ended_at && Date.now() - Date.parse(s.last_at) < 90e3 && s.token !== a.ptoken;
      if (s && c.single_device === 'block' && fresh) { evAdd(t.attempt_id, 'blocked_device', { device: String(a.device || '').slice(0, 60) }); return { blocked: true, error: 'other_device', message: '이미 다른 기기 · 창에서 응시 중입니다. 그 기기에서 이어서 응시하세요(1분 30초 동안 응답이 없으면 이 기기로 옮길 수 있습니다).' }; }
      if (c.idv !== 'none' && !s && !(window.DDIDV && DDIDV.take('exam', t.exam_id, c.idv))) ERR(428, 'idv_needed', c.idv === 'webauthn' ? '시험 시작 전 패스키(지문 · 얼굴 인식)로 본인 확인을 하세요.' : c.idv === 'totp' ? '시험 시작 전 인증 앱의 6자리 번호로 본인 확인을 하세요.' : '시험 시작 전 본인 확인(패스키 또는 인증 앱)을 하세요.');
      const tok = tokOf(); let ev = 'begin';
      if (!s) s = P.sess[t.attempt_id] = { attempt_id: t.attempt_id, exam_id: t.exam_id, token: tok, device: String(a.device || '').slice(0, 60), checks: ck, consent_at: nowIso(), began_at: nowIso(), last_at: nowIso(), ended_at: null, gen: 1, risk: 0, decision: 'pending' };
      else { ev = fresh && c.single_device === 'kick' ? 'second_device' : 'resume'; Object.assign(s, { token: tok, device: String(a.device || '').slice(0, 60), checks: ck, gen: s.gen + 1, last_at: nowIso(), ended_at: null }); }
      evAdd(t.attempt_id, ev, { device: s.device, camera: !!ck.camera, mic: !!ck.mic }); return { ptoken: tok, cfg: c, risk: s.risk, gen: s.gen, limits: LIMITS }; };
    D['POST /api/lms/f/proctor-event'] = a => { const { t, c, s } = psess(a); if (t.status !== 'in_progress') return { ended: true, accepted: 0, risk: s.risk }; const L = a.events || [];
      if (L.length > 50) ERR(400, 'events', '사건은 한 번에 50개까지 보낼 수 있습니다.'); L.forEach(e => { if (!CK.includes(e.kind)) ERR(400, 'kind', '알 수 없는 사건 종류입니다: ' + e.kind); });
      L.forEach(e => evAdd(t.attempt_id, e.kind, e.detail || null)); s.risk = riskOf(t.attempt_id); return { ended: false, accepted: L.length, risk: s.risk, flagged: s.risk >= c.risk_flag }; };
    D['POST /api/lms/f/proctor-snap'] = a => { const { t } = psess(a); const P = PR(); if (t.status !== 'in_progress') ERR(409, 'finished', '이미 제출한 시험입니다.');
      if (!/^\/9j\//.test(String(a.b64 || ''))) ERR(400, 'jpeg', 'JPEG 사진만 올릴 수 있습니다.'); if (String(a.b64).length > 280000) ERR(413, 'too_large', '사진은 200KB까지 올릴 수 있습니다.');
      const last = P.snaps.filter(x => x.attempt_id === t.attempt_id).map(x => Date.parse(x.at)).sort().pop(); if (last && Date.now() - last < 5000) ERR(429, 'snap_rate', '사진을 너무 자주 보냈습니다.');
      const faces = a.face_method === 'skip' || a.faces == null ? null : +a.faces; const n = { snap_id: rid(), attempt_id: t.attempt_id, kind: a.kind || 'periodic', at: nowIso(), faces, face_method: a.face_method || 'skip', bytes: Math.round(String(a.b64).length * 3 / 4), purge_at: new Date(Date.now() + P.keep * 864e5).toISOString(), purged: false };
      /* 데모: 브라우저 저장 공간을 아끼려고 최근 사진 6장만 원본을 둔다 */
      n.data = a.b64; P.snaps.push(n); P.snaps.filter(x => x.data).slice(0, -6).forEach(x => { x.data = null; x.demo = 1; });
      if (n.kind === 'id') evAdd(t.attempt_id, 'id_photo', { faces }); if (faces === 0) evAdd(t.attempt_id, 'no_face', { snap: n.snap_id, method: n.face_method }); else if (faces >= 2) evAdd(t.attempt_id, 'multi_face', { snap: n.snap_id, faces, method: n.face_method });
      return { snap_id: n.snap_id, faces, risk: P.sess[t.attempt_id].risk, purge_at: n.purge_at }; };
    { const bA = D['POST /api/lms/f/answer'], bS = D['POST /api/lms/f/submit'];
      const guard = a => { const t = st().atts.find(x => x.attempt_id === a.attempt_id && x.person_id === UI.lmsfAs); if (!t || t.status !== 'in_progress' || !cfgOf(t.exam_id).enabled) return false; psess(a); return true; };
      D['POST /api/lms/f/answer'] = a => { guard(a); return bA(a); };
      D['POST /api/lms/f/submit'] = a => { const g = guard(a); const r = bS(a); if (g) { evAdd(a.attempt_id, 'submit'); PR().sess[a.attempt_id].ended_at = nowIso(); } return r; }; }
    D['GET /api/lms/f/proctor-cfg'] = a => { const x = exOf(a.exam); seed(x.exam_id); return { cfg: cfgOf(x.exam_id), keep_days: PR().keep, consent: consent(PR().keep), limits: LIMITS, adapter: { secure_browser: '전용 보안 브라우저(다른 프로그램 차단 · 화면 전체 녹화)는 연동 지점만 있습니다 — 보안 브라우저가 window.DD_SECURE_BROWSER로 자신을 알리면 감독 시작 때 함께 기록합니다.' } }; };
    D['POST /api/lms/f/proctor-cfg'] = a => { const x = exOf(a.exam_id); const c = cfgOf(x.exam_id);
      if (a.single_device && !['off', 'kick', 'block'].includes(a.single_device)) ERR(400, 'single_device', '동시 응시 규칙은 off · kick · block 중에서 고르세요.'); if (a.idv && !['none', 'webauthn', 'totp', 'any'].includes(a.idv)) ERR(400, 'idv', '본인 확인 방식은 none · webauthn · totp · any 중에서 고르세요.');
      const sn = a.snap_sec == null || a.snap_sec === '' ? c.snap_sec : +a.snap_sec; if (!(sn === 0 || (sn >= 15 && sn <= 600))) ERR(400, 'range', '사진 간격(초)은(는) 0(끔) 또는 15~600 사이로 입력하세요.');
      const rf = a.risk_flag == null || a.risk_flag === '' ? c.risk_flag : +a.risk_flag; if (!(rf >= 1 && rf <= 100)) ERR(400, 'range', '주의 기준 점수은(는) 1~100 사이로 입력하세요.');
      const b = k => a[k] == null ? c[k] : !!a[k];
      PR().cfg[x.exam_id] = { enabled: b('enabled'), need_camera: b('need_camera'), need_mic: b('need_mic'), id_photo: b('id_photo'), fullscreen: b('fullscreen'), block_copy: b('block_copy'), face_check: b('face_check'), snap_sec: sn, single_device: a.single_device || c.single_device, idv: a.idv || c.idv, secure_browser: b('secure_browser'), risk_flag: rf };
      logAudit('시험 감독 설정 — ' + x.title); return { cfg: cfgOf(x.exam_id) }; };
    D['GET /api/lms/f/proctor-review'] = a => { const x = exOf(a.exam); seed(x.exam_id); purge(); const c = cfgOf(x.exam_id); const P = PR();
      const L = st().atts.filter(t => t.exam_id === x.exam_id).map(t => { const s = P.sess[t.attempt_id]; const E = P.ev.filter(e => e.attempt_id === t.attempt_id && e.weight > 0); const kinds = {}; E.forEach(e => { kinds[e.kind] = (kinds[e.kind] || 0) + 1; });
        return { attempt_id: t.attempt_id, member_no: mno(t.person_id), no: t.no, status: t.status, proctored: !!s, risk: s ? s.risk : null, flagged: !!s && s.risk >= c.risk_flag, decision: s ? s.decision : 'pending', began_at: s ? s.began_at : null, last_at: s ? s.last_at : null, device: s ? s.device : null, gen: s ? s.gen : null, events: E.length, kinds, snaps: P.snaps.filter(n => n.attempt_id === t.attempt_id).length }; })
        .sort((p, q) => (q.risk ?? -1) - (p.risk ?? -1) || (p.member_no < q.member_no ? -1 : 1));
      return { exam: { exam_id: x.exam_id, title: x.title }, cfg: c, keep_days: P.keep, summary: { n: L.length, proctored: L.filter(r => r.proctored).length, flagged: L.filter(r => r.flagged).length, pending: L.filter(r => r.flagged && r.decision === 'pending').length, void: L.filter(r => r.decision === 'void').length }, attempts: L }; };
    D['GET /api/lms/f/proctor-timeline'] = a => { const t = st().atts.find(z => z.attempt_id === a.attempt); if (!t) ERR(404, 'attempt', '없는 응시 기록입니다.'); const x = exOf(t.exam_id); purge(); const P = PR(); const s = P.sess[t.attempt_id];
      P.views.push({ id: P.seq++, exam_id: x.exam_id, attempt_id: t.attempt_id, snap_id: null, viewer: viewer(), role: (S.me && S.me.role) || 'owner', what: 'timeline', at: nowIso() });
      return { attempt: { attempt_id: t.attempt_id, exam_id: t.exam_id, member_no: mno(t.person_id), no: t.no, status: t.status, started_at: t.started_at, submitted_at: t.submitted_at || null, score: t.score ?? null, max_score: t.max_score ?? null },
        session: s ? { began_at: s.began_at, last_at: s.last_at, ended_at: s.ended_at, device: s.device, checks: s.checks, consent_at: s.consent_at, gen: s.gen, risk: s.risk, decision: s.decision, decided_by: s.decided_by || null, decided_at: s.decided_at || null, note: s.note || null } : null,
        risk_flag: cfgOf(x.exam_id).risk_flag, events: P.ev.filter(e => e.attempt_id === t.attempt_id), snaps: P.snaps.filter(n => n.attempt_id === t.attempt_id).map(n => ({ snap_id: n.snap_id, at: n.at, kind: n.kind, faces: n.faces, face_method: n.face_method, bytes: n.bytes, purged: !!n.purged, purge_at: n.purge_at })) }; };
    /* 데모 사진: 원본이 없으면(시드 · 오래된 사진) 자리 표시 그림을 만든다 */
    function placeholder(n) { try { const c = document.createElement('canvas'); c.width = 240; c.height = 180; const g = c.getContext('2d'); g.fillStyle = '#d9dee8'; g.fillRect(0, 0, 240, 180); g.fillStyle = '#9aa3b5';
      for (let i = 0; i < Math.max(1, n.faces || 1); i++) { const cx = 120 + (i - ((n.faces || 1) - 1) / 2) * 70; g.beginPath(); g.arc(cx, 72, 26, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx, 160, 48, 46, 0, 0, 7); g.fill(); }
      g.fillStyle = '#4b5565'; g.font = '13px sans-serif'; g.fillText('데모 사진(실제 촬영 아님)', 8, 18); return c.toDataURL('image/jpeg', 0.7).split(',')[1]; } catch (e) { return ''; } }
    D['GET /api/lms/f/proctor-photo'] = a => { const P = PR(); purge(); const n = P.snaps.find(z => z.snap_id === a.id); if (!n) ERR(404, 'snap', '없는 사진입니다.'); const t = st().atts.find(z => z.attempt_id === n.attempt_id);
      P.views.push({ id: P.seq++, exam_id: t.exam_id, attempt_id: t.attempt_id, snap_id: n.snap_id, viewer: viewer(), role: (S.me && S.me.role) || 'owner', what: 'photo', at: nowIso() });
      if (n.purged) ERR(410, 'purged', '보존 기간이 지나 파기된 사진입니다.'); return { snap_id: n.snap_id, mime: 'image/jpeg', b64: n.data || placeholder(n), at: n.at, purge_at: n.purge_at }; };
    D['POST /api/lms/f/proctor-decide'] = a => { const s = PR().sess[a.attempt_id]; if (!['pending', 'ok', 'warn', 'void'].includes(a.decision)) ERR(400, 'decision', '판정은 pending · ok · warn · void 중에서 고르세요.');
      if (['warn', 'void'].includes(a.decision) && !String(a.note || '').trim()) ERR(400, 'need_reason', '주의 · 무효 판정에는 사유가 필요합니다.'); if (!s) ERR(409, 'not_proctored', '감독 기록이 없는 응시입니다.');
      Object.assign(s, { decision: a.decision, note: String(a.note || '').trim() || null, decided_by: viewer(), decided_at: nowIso() }); logAudit('시험 감독 판정 — ' + a.decision);
      return { attempt_id: a.attempt_id, decision: s.decision, note: s.note, decided_at: s.decided_at, message: a.decision === 'void' ? '무효로 판정했습니다. 점수 처리(0점 · 재시험)는 성적 화면에서 정하세요.' : '판정을 저장했습니다.' }; };
    D['GET /api/lms/f/proctor-views'] = a => ({ views: PR().views.filter(v => v.exam_id === a.exam).slice(-200).reverse().map(v => ({ ...v, member_no: (t => t ? mno(t.person_id) : null)(st().atts.find(z => z.attempt_id === v.attempt_id)) })) });
    D['GET /api/lms/f/proctor-settings'] = () => ({ keep_days: PR().keep, note: '감독 사진은 촬영일로부터 보존 일수가 지나면 자동 파기됩니다(사진 데이터 삭제, 촬영 시각 · 얼굴 수 기록만 남음). 파기된 사진은 되돌릴 수 없습니다.' });
    D['POST /api/lms/f/proctor-settings'] = a => { if (S.me && S.me.role === 'teacher') ERR(403, 'role', '운영자만 쓸 수 있습니다.'); const k = +a.keep_days; if (!(k >= 1 && k <= 365)) ERR(400, 'range', '감독 사진 보존 일수은(는) 1~365 사이로 입력하세요.');
      const P = PR(); P.keep = Math.round(k); P.snaps.filter(x => !x.purged).forEach(x => { x.purge_at = new Date(Date.parse(x.at) + P.keep * 864e5).toISOString(); }); return { ...D['GET /api/lms/f/proctor-settings'](), purged: purge() }; };
    D['POST /api/lms/f/proctor-purge'] = () => ({ purged: purge() });

    /* ── 화면: 응시 감독 ── */
    const riskTag = (r, f) => r == null ? tag('감독 기록 없음') : tag(`${r}점`, r >= f ? 'r' : r >= f / 2 ? 'y' : 'g');
    const top3 = k => Object.entries(k || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([x, n]) => `${esc(PK[x] || x)} ${n}`).join(' · ') || '<span class="muted">없음</span>';
    function view(sec) {
      const r = load('lmsf:ex:' + sec, () => call('GET', '/api/lms/f/exams', { section: sec })); if (!r) return wait(); if (r.err) return errBox(r.err); const L = r.ok.exams;
      if (!L.length) return todo('이 분반에 아직 시험이 없습니다.', `<button class="btn sm pri" data-act="lmsf-exam" data-v="">새 시험 만들기</button>`);
      const id = L.some(x => x.exam_id === UI.lmsfPX) ? UI.lmsfPX : L[0].exam_id; UI.lmsfPX = id;
      const pick = `<div class="bar2"><label class="efh-lab">시험 <select data-chg="lmsf-pxpick" aria-label="시험 선택">${L.map(x => `<option value="${esc(x.exam_id)}" ${x.exam_id === id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label><button class="btn sm" data-act="lmsf-pcfg" data-v="${esc(id)}">감독 설정</button></div>`;
      const v = load('lmsf:pr:' + id, () => call('GET', '/api/lms/f/proctor-review', { exam: id })); if (!v) return pick + wait(); if (v.err) return pick + errBox(v.err); const R = v.ok; const c = R.cfg; const m = R.summary;
      const first = R.attempts.find(t => t.flagged && t.decision === 'pending');
      const td = !c.enabled ? todo('이 시험은 웹 감독이 꺼져 있습니다. 켜면 학생이 응시 전에 카메라 · 동의를 확인하고, 응시 중 화면 사건과 사진이 기록됩니다.', `<button class="btn sm pri" data-act="lmsf-pcfg" data-v="${esc(id)}">감독 켜기</button>`)
        : first ? todo(`주의 응시 <b>${m.pending}건</b>이 판정을 기다립니다(위험 점수 ${c.risk_flag}점 이상).`, `<button class="btn sm pri" data-act="lmsf-ptl" data-v="${esc(first.attempt_id)}">검토 시작</button>`)
        : todo(`판정할 주의 응시가 없습니다 · 감독 기록 ${m.proctored}건`, '');
      const set = `웹캠 ${c.need_camera ? '필수' : '선택'} · 사진 ${c.snap_sec ? c.snap_sec + '초마다' : '끔'} · 전체 화면 ${c.fullscreen ? '강제' : '안 함'} · 복사 · 붙여넣기 ${c.block_copy ? '막음' : '허용'} · 동시 응시 ${{ off: '허용', kick: '새 기기가 이어받음', block: '두 번째 기기 막음' }[c.single_device]} · 본인 확인 ${{ none: '안 함', webauthn: '패스키', totp: '인증 앱', any: '패스키 또는 인증 앱' }[c.idv]}`;
      return pick + td + `<div class="kpis">${kpi('응시', m.n)}${kpi('감독 기록', m.proctored)}${kpi('주의', m.flagged, '', m.flagged ? 'warn' : '')}${kpi('무효 판정', m.void)}</div>
        <div class="card"><div class="ch"><b>응시별 위험 점수</b><small>${c.enabled ? esc(set) : '감독 꺼짐'}</small></div>
        ${table(['학번', '위험 점수', '주요 사건', '판정', ''], R.attempts.map(t => [`<b>${esc(t.member_no)}</b><small class="efh-sub2">${t.no}회차 · 사진 ${t.snaps}장${t.gen > 1 ? ` · 접속 ${t.gen}번` : ''}</small>`, riskTag(t.risk, c.risk_flag), `<small>${top3(t.kinds)}</small>`, tag(...DEC[t.decision]), t.proctored ? `<button class="btn sm" data-act="lmsf-ptl" data-v="${esc(t.attempt_id)}">타임라인</button>` : '']), '응시 기록이 없습니다.')}</div>
        <details class="card efh-set"><summary>웹 감독이 할 수 없는 것 · 보안 브라우저 연동</summary><ul class="efh-note">${LIMITS.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="efh-note">보안 브라우저(다른 프로그램 차단 · 화면 전체 녹화)는 연동 지점만 있습니다. 「감독 설정 › 보안 브라우저 필수」를 켜면 보안 브라우저가 아닌 브라우저에서는 응시를 시작할 수 없습니다(연동 후 동작).</p></details>
        ${psetCard()}${viewsCard(id)}`;
    }
    function psetCard() { const r = load('lmsf:pset', () => call('GET', '/api/lms/f/proctor-settings')); if (!r || !r.ok) return ''; const admin = !S.me || S.me.role !== 'teacher';
      return `<details class="card efh-set"><summary>감독 사진 보존 기간 <small class="muted">촬영 ${r.ok.keep_days}일 뒤 자동 파기</small></summary><p class="efh-note">${esc(r.ok.note)}</p><p>촬영 <b>${r.ok.keep_days}일</b> 뒤 파기${admin ? ` <input type="number" min="1" max="365" id="lmsfPKeep" value="${r.ok.keep_days}" aria-label="보존 일수" style="width:90px"> <button class="btn sm" data-act="lmsf-pkeep">저장</button>` : ''}</p></details>`; }
    function viewsCard(id) { const r = load('lmsf:pv:' + id, () => call('GET', '/api/lms/f/proctor-views', { exam: id })); if (!r || !r.ok) return '';
      return `<details class="card efh-set"><summary>열람 기록 <small class="muted">${r.ok.views.length}건 · 타임라인 · 사진을 누가 언제 봤는지</small></summary>${table(['시각', '본 사람', '대상', '내용'], r.ok.views.slice(0, 50).map(x => [esc(fmt(x.at)), esc(x.viewer), esc(x.member_no || ''), x.what === 'photo' ? '사진' : '타임라인']), '열람 기록이 없습니다.')}</details>`; }
    ACT['lmsf-pxpick'] = el => { UI.lmsfPX = el.value; render(); };
    ACT['lmsf-pkeep'] = () => run(() => call('POST', '/api/lms/f/proctor-settings', { keep_days: +document.getElementById('lmsfPKeep').value }), '감독 사진 보존 기간을 저장했습니다.', 'lmsf:pset', 'lmsf:pr:');
    ACT['lmsf-pcfg'] = async el => { const r = await run(() => call('GET', '/api/lms/f/proctor-cfg', { exam: el.dataset.v })); if (!r) return; const c = r.cfg;
      const ck = (k, l) => `<label class="ul-ck"><input type="checkbox" name="${k}" ${c[k] ? 'checked' : ''}> ${esc(l)}</label>`;
      modal('시험 감독 설정', `<div class="form2 efh-form">${ck('enabled', '웹 감독 켜기')}${ck('need_camera', '웹캠 필수')}${ck('id_photo', '응시 전 본인 확인 사진')}${ck('face_check', '얼굴 수 확인(기기 안에서)')}${ck('fullscreen', '전체 화면 강제 · 이탈 기록')}${ck('block_copy', '복사 · 붙여넣기 · 오른쪽 클릭 · 인쇄 막기')}${ck('need_mic', '마이크 확인(녹음하지 않음)')}${ck('secure_browser', '보안 브라우저 필수(연동 후 동작)')}
        <label>사진 간격(초, 0 = 끔)<input type="number" name="snap_sec" min="0" max="600" value="${c.snap_sec}"></label><label>주의 기준 점수<input type="number" name="risk_flag" min="1" max="100" value="${c.risk_flag}"></label>
        <label>한 계정 동시 응시<select name="single_device">${[['kick', '새 기기가 이어받기(옛 화면 종료 · 기록)'], ['block', '두 번째 기기 막기'], ['off', '허용']].map(([k, l]) => `<option value="${k}" ${c.single_device === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>시작 전 본인 확인<select name="idv">${[['none', '안 함'], ['webauthn', '패스키(지문 · 얼굴 인식)'], ['totp', '인증 앱 6자리'], ['any', '패스키 또는 인증 앱']].map(([k, l]) => `<option value="${k}" ${c.idv === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
        <details class="efh-set"><summary>학생에게 보이는 동의문</summary><p class="efh-note">${esc(r.consent)}</p></details><details class="efh-set"><summary>웹 감독이 할 수 없는 것</summary><ul class="efh-note">${r.limits.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="efh-note">${esc(r.adapter.secure_browser)}</p></details>`,
        [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const b = { exam_id: el.dataset.v }; ['enabled', 'need_camera', 'id_photo', 'face_check', 'fullscreen', 'block_copy', 'need_mic', 'secure_browser'].forEach(k => { b[k] = fv(w, k); }); b.snap_sec = +fv(w, 'snap_sec'); b.risk_flag = +fv(w, 'risk_flag'); b.single_device = fv(w, 'single_device'); b.idv = fv(w, 'idv');
          run(() => call('POST', '/api/lms/f/proctor-cfg', b), '감독 설정을 저장했습니다.', 'lmsf:pr:'); } }], true); };
    ACT['lmsf-ptl'] = async el => { const r = await run(() => call('GET', '/api/lms/f/proctor-timeline', { attempt: el.dataset.v })); if (!r) return; drop('lmsf:pv:'); const t = r.attempt; const s = r.session || {};
      const tm = x => new Date(x).toLocaleTimeString('ko-KR', { hour12: false });
      modal(`감독 타임라인 — ${t.member_no} ${t.no}회차`, `<div class="kpis">${kpi('위험 점수', s.risk ?? '-', '', s.risk >= r.risk_flag ? 'warn' : '')}${kpi('기기', esc(s.device || '-'))}${kpi('접속', (s.gen || 0) + '번')}${kpi('동의', s.consent_at ? fmt(s.consent_at) : '-')}</div>
        <p class="efh-note">사진을 열면 열람 기록이 남습니다. 파기된 사진은 촬영 시각 · 얼굴 수만 남습니다.</p>
        <div class="lmsf-snaps">${r.snaps.map((n, i) => `<button class="btn sm" data-act="lmsf-photo" data-v="${esc(n.snap_id)}" ${n.purged ? 'disabled' : ''}>${n.kind === 'id' ? '본인 확인' : '사진 ' + i} · ${tm(n.at)} · 얼굴 ${n.faces ?? '?'}${n.purged ? ' · 파기됨' : ''}</button>`).join('') || '<span class="muted">사진 없음</span>'}</div><div id="lmsfPhotoBox"></div>
        <ol class="lmsf-tl">${r.events.map(e => `<li class="${e.weight ? 'w' : ''}"><time>${tm(e.at)}</time> ${esc(PK[e.kind] || e.kind)}${e.weight ? ` <small>+${e.weight}</small>` : ''}${e.detail && e.detail.key ? ` <small>(${esc(e.detail.key)})</small>` : ''}${e.detail && e.detail.device ? ` <small>(${esc(e.detail.device)})</small>` : ''}</li>`).join('')}</ol>
        <div class="form2 efh-form"><label>판정<select name="d">${Object.entries(DEC).map(([k, [l]]) => `<option value="${k}" ${(s.decision || 'pending') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="full">사유(주의 · 무효는 필수)<input name="n" maxlength="500" value="${esc(s.note || '')}"></label></div>${s.decided_at ? `<p class="muted">${esc(s.decided_by || '')} · ${fmt(s.decided_at)} 판정</p>` : ''}`,
        [{ id: 'c', label: '닫기' }, ...(r.session ? [{ id: 'ok', label: '판정 저장', kind: 'pri', run: w => { run(() => call('POST', '/api/lms/f/proctor-decide', { attempt_id: t.attempt_id, decision: fv(w, 'd'), note: fv(w, 'n') }).then(x => { toast(x.message, 'ok'); return x; }), '', 'lmsf:pr:', 'lmsf:pv:'); } }] : [])], true); };
    ACT['lmsf-photo'] = async el => { const r = await run(() => call('GET', '/api/lms/f/proctor-photo', { id: el.dataset.v })); drop('lmsf:pv:'); const b = document.getElementById('lmsfPhotoBox'); if (r && b) b.innerHTML = `<img class="lmsf-photo" alt="감독 사진" src="data:image/jpeg;base64,${r.b64}"><p class="muted">촬영 ${fmt(r.at)} · ${fmt(r.purge_at)} 자동 파기</p>`; };
    /* 교수 미리보기(데모): 감독 시험은 동의 · 장치 확인을 마친 것으로 시작한다(카메라 없음 표시) */
    async function previewBegin(exId, att) { try { const c = await call('GET', '/api/lms/f/proctor-cfg', { exam: exId }); if (!c.cfg.enabled) return null;
      const b = await call('POST', '/api/lms/f/proctor-begin', { attempt_id: att, consent: true, device: '교수 미리보기', checks: { camera: true, browser: true, preview: true } }); if (b.blocked) { toast(b.message, 'warn'); return null; } toast('감독 시험 미리보기 — 학생 화면에서는 카메라 · 동의 확인 뒤 시작합니다.', 'ok'); return b.ptoken; } catch (e) { toast(e.message, 'warn'); return null; } }
    if (!document.getElementById('lmsfProcCss')) { const st2 = document.createElement('style'); st2.id = 'lmsfProcCss'; st2.textContent = '.lmsf-snaps{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.lmsf-photo{max-width:100%;width:320px;border-radius:8px;display:block;margin:6px 0}.lmsf-tl{list-style:none;padding:0;margin:8px 0;max-height:260px;overflow:auto;border-top:1px solid var(--line,#e5e7eb)}.lmsf-tl li{padding:4px 2px;border-bottom:1px solid var(--line,#e5e7eb);font-size:13px}.lmsf-tl li.w{color:var(--warn,#b45309)}.lmsf-tl time{font-variant-numeric:tabular-nums;color:var(--muted,#6b7280);margin-right:6px}'; document.head.appendChild(st2); }
    return { view, previewBegin, PK };
  })();

})();
