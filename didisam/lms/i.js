/* v30 학사 LMS 묶음 I — 동영상 · 진도(SFR-010 · 015 · 028 · 033 · 048 · 063 · 073)
   HTML5 플레이어(구간 기반 학습시간 · 이어보기 · 1.0~2.0배속 · 화질 목록 · 서버 하트비트 동시 재생 차단 · 재생 로그),
   다국어 자막(VTT · SRT 등록 · 편집 · 재생 동기화 대본), 영상 중간 퀴즈(성적 반영), 원격수업 학습분량 점검, 진도 · 학습 이력(디바이스 · IP · 시작/종료 · 시청시간) CSV, 강좌 내 행동 기록.
   CDN · 트랜스코더 · AI 자동자막은 연동 지점만 둔다(src는 저장소 키 · URL, 데모는 시간만 흐르는 가상 영상 또는 내 컴퓨터 영상 미리보기). 공용 W3는 lms/g.js. */
(function () {
  'use strict';
  if (!window.W3) return;
  const W3 = window.W3; const L = W3.LOCAL; const D = () => W3.D(); const now = () => Date.now();
  const ULMS_ = () => typeof ULMS === 'function' && ULMS();
  const ctOf = id => D().contents.find(c => c.content_id === id);
  const sesOf = id => D().sessions.find(s => s.session_id === id);
  const perOf = mno => D().persons.find(p => p.member_no === mno);
  const secCts = sid => D().contents.map(c => ({ c, s: sesOf(c.session_id) })).filter(x => x.s && x.s.section_id === sid).sort((a, b) => a.s.week_no - b.s.week_no || a.s.seq - b.s.seq || (a.c.title < b.c.title ? -1 : 1));
  const enr = (sid, mno) => { const p = perOf(mno); return p && (p.secs || []).includes(sid) ? p : null; };
  const ruleOf = sid => Object.assign({ online_min_pct: 90, block_concurrent: true }, D().rule[sid] || {});
  const cj = x => ({ content_id: x.c.content_id, session_id: x.c.session_id, week_no: x.s.week_no, seq: x.s.seq, title: x.c.title, duration_sec: x.c.duration_sec, src: x.c.src || null, qualities: x.c.qualities, check_at_sec: x.c.check_at_sec ?? null,
    subtitles: Object.keys(D().subs).filter(k => k.startsWith(x.c.content_id + '|')).map(k => k.split('|')[1]).sort(), quizzes: D().quizzes.filter(q => q.content_id === x.c.content_id).length });
  const merge = segs => { const a = segs.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]); const o = []; for (const s of a) { const l = o[o.length - 1]; if (l && s[0] <= l[1]) l[1] = Math.max(l[1], s[1]); else o.push([s[0], s[1]]); } return o; };
  const ev = (play, content_id, person_id, kind, pos, from_pos, rate_x100) => D().events.push({ play_id: play || null, content_id, person_id, kind, pos, from_pos: from_pos ?? null, rate_x100: rate_x100 ?? null, at: W3.ts(now()) });
  const pgK = (cid, pid) => cid + '|' + pid;
  const LANGS = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어', vi: '베트남어', uz: '우즈베크어', mn: '몽골어', ru: '러시아어', es: '스페인어', fr: '프랑스어', de: '독일어', id: '인도네시아어', th: '태국어', ne: '네팔어' };

  /* ── 자막 파싱(서버 SQL과 같은 규칙) ── */
  const tsec = a => a.replace(',', '.').split(':').reverse().reduce((s, p, i) => s + (+p) * Math.pow(60, i), 0);
  W3.parseSub = text => { const out = []; String(text || '').replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/).forEach((blk, ord) => {
    const m = blk.match(/((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})[ \t]*-->[ \t]*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})/); if (!m) return;
    const tx = blk.slice(blk.indexOf(m[2]) + m[2].length).replace(/^[^\n]*(\n|$)/, '').replace(/<[^>]+>/g, '').trim(); const s = tsec(m[1]), e = tsec(m[2]);
    if (tx && e > s) out.push({ s: Math.round(s * 1000) / 1000, e: Math.round(e * 1000) / 1000, t: tx.slice(0, 500), ord }); });
    return out.sort((a, b) => a.s - b.s || a.ord - b.ord).slice(0, 3000).map(({ s, e, t }) => ({ s, e, t })); };
  const toVTT = cues => 'WEBVTT\n\n' + cues.map(c => `${fmtT(c.s, '.')} --> ${fmtT(c.e, '.')}\n${c.t}`).join('\n\n') + '\n';
  const fmtT = (x, sep) => { const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s = Math.floor(x % 60), ms = Math.round((x % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms).padStart(3, '0')}`; };
  const mmss = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

  /* ═════════ 데모 경로 ═════════ */
  W3.seedI = sid => { const d = D(); const reg = d.persons.filter(p => p.ekind === 'regular' && (p.secs || []).includes(sid));
    d.sessions.filter(s => s.section_id === sid && s.seq === 1 && s.kind !== 'holiday').forEach(s => d.contents.push({ content_id: W3.uid(), session_id: s.session_id, title: `${s.week_no}차시 강의 영상`, duration_sec: 1500, src: `demo:lecture-${s.week_no}`, qualities: ['auto', '360p', '720p', '1080p'], check_at_sec: 1200 }));
    secCts(sid).forEach(({ c, s }) => { if (Date.parse(s.starts_at) > now()) return; reg.forEach((p, j) => { const pct = j === 6 ? (s.week_no * 17) % 60 : Math.min(100, 70 + ((s.week_no * 11 + j * 7) % 40)); const w = Math.round(c.duration_sec * pct / 100);
      d.prog[pgK(c.content_id, p.person_id)] = { segments: w ? [[0, w]] : [], watched_sec: w, last_pos: w, pct, completed_at: pct >= 90 ? W3.ts(Date.parse(s.starts_at) + 2 * 864e5) : null }; }); });
    const c1 = secCts(sid)[0]; const c3 = secCts(sid)[2]; const P = n => reg[n].person_id;
    if (c1) { ev(null, c1.c.content_id, P(6), 'rate', 300, null, 200); ev(null, c1.c.content_id, P(6), 'seek', 900, 120, 100); ev(null, c3.c.content_id, P(6), 'blocked', 0); ev(null, c3.c.content_id, P(3), 'seek', 700, 200, 100);
      d.subs[c1.c.content_id + '|ko'] = { format: 'vtt', cues: [{ s: 1, e: 5, t: '안녕하세요. 데이터와 인공지능 기초 1차시입니다.' }, { s: 5.5, e: 10, t: '오늘은 데이터의 종류와 수집 방법을 배웁니다.' }, { s: 10.5, e: 16, t: '먼저 정형 데이터와 비정형 데이터를 구분해 보겠습니다.' }, { s: 16.5, e: 22, t: '표 형태로 정리되는 데이터를 정형 데이터라고 합니다.' }], updated_at: W3.ts(now()) };
      d.subs[c1.c.content_id + '|en'] = { format: 'srt', cues: [{ s: 1, e: 5, t: 'Hello, this is week 1 of Data and AI Basics.' }, { s: 5.5, e: 10, t: 'Today we learn data types and collection.' }], updated_at: W3.ts(now()) };
      d.quizzes.push({ quiz_id: W3.uid(), content_id: c1.c.content_id, at_sec: 20, question: '표 형태로 정리되는 데이터는?', options: ['정형 데이터', '비정형 데이터', '스트리밍 데이터'], answer: 0, points: 1 }); }
    reg.forEach((p, j) => { if (c1) d.plays.push({ play_id: W3.uid(), content_id: c1.c.content_id, person_id: p.person_id, device: j % 3 ? 'desktop' : 'mobile', ip_masked: `10.20.${j}.*`, started_at: W3.ts(Date.parse(c1.s.starts_at) + 36e5 * (j + 1)), ended_at: W3.ts(Date.parse(c1.s.starts_at) + 36e5 * (j + 1) + 1500e3), last_beat_at: W3.ts(Date.parse(c1.s.starts_at) + 36e5 * (j + 1) + 1500e3), last_pos: 1500, rate_x100: 100, watched_sec: 1400 + j * 10 });
      d.acts.push({ section_id: sid, person_id: p.person_id, kind: ['view_material', 'download', 'post', 'submit_assignment'][j % 4], ref: '1차시', device: 'desktop', ip_masked: `10.20.${j}.*`, at: W3.ts(Date.parse(c1 ? c1.s.starts_at : now()) + 864e5) }); });
  };
  L['POST /api/lms/i/seed'] = b => { if (!D().sections.find(s => s.section_id === b.section_id)) throw W3.err('not_found'); const n0 = D().contents.length; if (!secCts(b.section_id).length && !(S && S.org && S.org.empty)) W3.seedI(b.section_id); return { created: D().contents.length - n0 }; };
  L['GET /api/lms/i/contents'] = b => { if (!D().sections.find(s => s.section_id === b.section_id)) throw W3.err('not_found'); return secCts(b.section_id).map(cj); };
  L['POST /api/lms/i/content'] = b => { const s = sesOf(b.session_id); if (!s) throw W3.err('not_found'); if (!b.title || !(+b.duration_sec >= 1)) throw W3.err('bad_input');
    const c = { content_id: W3.uid(), session_id: s.session_id, title: String(b.title).slice(0, 120), duration_sec: +b.duration_sec, src: b.src || null, qualities: ['auto', '360p', '720p', '1080p'], check_at_sec: b.check_at_sec != null ? Math.min(+b.check_at_sec, +b.duration_sec) : null }; D().contents.push(c); return cj({ c, s }); };
  L['POST /api/lms/i/play/start'] = b => { const c = ctOf(b.content_id); if (!c) throw W3.err('not_found'); const s = sesOf(c.session_id); const p = enr(s.section_id, b.member_no); if (!p) throw W3.err('not_enrolled');
    const blk = ruleOf(s.section_id).block_concurrent; const act = D().plays.filter(x => x.person_id === p.person_id && !x.ended_at && Date.parse(x.last_beat_at) > now() - 30e3);
    if (blk && act.length) { ev(null, c.content_id, p.person_id, 'blocked', 0); return { blocked: true, reason: 'concurrent', logged: 1 }; }
    let st = 0; D().plays.filter(x => x.person_id === p.person_id && !x.ended_at).forEach(x => { x.ended_at = x.last_beat_at; st++; });
    const old = D().prog[pgK(c.content_id, p.person_id)]; const rp = old && old.last_pos < c.duration_sec - 5 ? old.last_pos : 0;
    const pl = { play_id: W3.uid(), content_id: c.content_id, person_id: p.person_id, device: W3.device(), ip_masked: W3.ipMasked(), started_at: W3.ts(now()), last_beat_at: W3.ts(now()), last_pos: rp, rate_x100: 100, watched_sec: 0, ended_at: null };
    D().plays.push(pl); ev(pl.play_id, c.content_id, p.person_id, 'start', rp); if (!old) D().prog[pgK(c.content_id, p.person_id)] = { segments: [], watched_sec: 0, last_pos: 0, pct: 0, completed_at: null };
    return { play_id: pl.play_id, content_id: c.content_id, title: c.title, duration_sec: c.duration_sec, src: c.src, qualities: c.qualities, check_at_sec: c.check_at_sec ?? null, resume_pos: rp, segments: old ? old.segments : [], watched_sec: old ? old.watched_sec : 0, pct: old ? old.pct : 0, rates: [1, 1.25, 1.5, 1.75, 2], block_concurrent: blk, beat_sec: 10, device: pl.device, ended_stale: st }; };
  L['POST /api/lms/i/play/beat'] = b => { const pl = D().plays.find(x => x.play_id === b.play_id); if (!pl) throw W3.err('not_found');
    if (pl.ended_at || D().plays.some(x => x.person_id === pl.person_id && x.play_id !== pl.play_id && !x.ended_at && x.started_at > pl.started_at)) throw W3.err('play_over');
    const rt = +b.rate; if (!(rt >= 1 && rt <= 2)) throw W3.err('bad_rate'); const c = ctOf(pl.content_id); const r100 = Math.round(rt * 100); const evs = [];
    if (r100 !== pl.rate_x100) { ev(pl.play_id, c.content_id, pl.person_id, 'rate', +b.from, null, r100); evs.push('rate'); }
    if (Math.abs(b.from - pl.last_pos) > 10) { ev(pl.play_id, c.content_id, pl.person_id, 'seek', +b.from, pl.last_pos, r100); evs.push('seek'); }
    const f = Math.max(0, Math.min(+b.from, c.duration_sec)), ps = Math.max(0, Math.min(+b.pos, c.duration_sec)); const el = (now() - Date.parse(pl.last_beat_at)) / 1000; const e = Math.min(ps, f + Math.ceil(el * rt + 3));
    const k = pgK(c.content_id, pl.person_id); const g = D().prog[k]; if (e > f) g.segments = merge([...g.segments, [f, e]]); g.watched_sec = g.segments.reduce((a, s) => a + s[1] - s[0], 0); g.last_pos = ps;
    g.pct = Math.min(100, Math.floor(100 * g.watched_sec / c.duration_sec)); if (!g.completed_at && g.pct >= ruleOf(sesOf(c.session_id).section_id).online_min_pct) g.completed_at = W3.ts(now());
    pl.last_beat_at = W3.ts(now()); pl.last_pos = ps; pl.rate_x100 = r100; pl.watched_sec += Math.max(0, e - f);
    return { play_id: pl.play_id, credited: Math.max(0, e - f), watched_sec: g.watched_sec, pct: g.pct, segments: g.segments, completed: !!g.completed_at, beat: 1, events: evs }; };
  L['POST /api/lms/i/play/end'] = b => { const pl = D().plays.find(x => x.play_id === b.play_id && !x.ended_at); if (!pl) throw W3.err('play_over'); pl.ended_at = W3.ts(now()); if (b.pos != null) pl.last_pos = +b.pos; ev(pl.play_id, pl.content_id, pl.person_id, 'end', pl.last_pos); return { play_id: pl.play_id, watched_sec: pl.watched_sec, last_pos: pl.last_pos, ended: true }; };
  L['GET /api/lms/i/progress'] = b => { if (!D().sections.find(s => s.section_id === b.section_id)) throw W3.err('not_found'); const cts = secCts(b.section_id);
    return { contents: cts.map(x => ({ content_id: x.c.content_id, title: x.c.title, week_no: x.s.week_no, seq: x.s.seq, duration_sec: x.c.duration_sec })),
      students: D().persons.filter(p => p.ekind === 'regular' && (p.secs || []).includes(b.section_id)).sort((a, z) => a.member_no < z.member_no ? -1 : 1).map(p => { const g = cts.map(x => D().prog[pgK(x.c.content_id, p.person_id)] || {});
        return { member_no: p.member_no, unit_code: p.unit_code, pcts: g.map(x => x.pct || 0), watched: g.map(x => x.watched_sec || 0), avg_pct: g.length ? Math.round(g.reduce((a, x) => a + (x.pct || 0), 0) / g.length) : 0 }; }) }; };
  L['POST /api/lms/i/subtitle'] = b => { if (!ctOf(b.content_id)) throw W3.err('not_found'); if (!LANGS[b.lang] || !['vtt', 'srt'].includes(b.format)) throw W3.err('bad_input'); const cues = W3.parseSub(b.text); if (!cues.length) throw W3.err('bad_sub');
    D().subs[b.content_id + '|' + b.lang] = { format: b.format, cues, updated_at: W3.ts(now()) }; return { content_id: b.content_id, lang: b.lang, format: b.format, cues: cues.length, first: cues[0] }; };
  L['POST /api/lms/i/subtitle/cues'] = b => { if (!ctOf(b.content_id)) throw W3.err('not_found'); const c = b.cues; if (!Array.isArray(c) || !c.length || c.length > 3000 || c.some(x => typeof x.s !== 'number' || typeof x.e !== 'number' || typeof x.t !== 'string' || x.e <= x.s || x.s < 0 || x.t.length > 500)) throw W3.err('bad_sub');
    const k = b.content_id + '|' + b.lang; const cur = D().subs[k]; D().subs[k] = { format: cur ? cur.format : 'vtt', cues: c.map((x, i) => ({ s: Math.round(x.s * 1000) / 1000, e: Math.round(x.e * 1000) / 1000, t: x.t, i })).sort((a, z) => a.s - z.s || a.i - z.i).map(({ s, e, t }) => ({ s, e, t })), updated_at: W3.ts(now()) };
    return { content_id: b.content_id, lang: b.lang, format: D().subs[k].format, cues: c.length }; };
  L['GET /api/lms/i/subtitles'] = b => { if (!ctOf(b.content_id)) throw W3.err('not_found'); return Object.entries(D().subs).filter(([k]) => k.startsWith(b.content_id + '|')).map(([k, v]) => ({ lang: k.split('|')[1], format: v.format, cues: v.cues, updated_at: v.updated_at })).sort((a, z) => a.lang < z.lang ? -1 : 1); };
  L['POST /api/lms/i/quiz'] = b => { const c = ctOf(b.content_id); if (!c) throw W3.err('not_found'); const o = b.options; if (!Array.isArray(o) || o.length < 2 || o.length > 6 || o.some(x => typeof x !== 'string' || !x || x.length > 200) || !b.question || +b.at_sec > c.duration_sec) throw W3.err('bad_input'); if (+b.answer >= o.length) throw W3.err('bad_choice');
    const q = { quiz_id: W3.uid(), content_id: c.content_id, at_sec: +b.at_sec, question: b.question, options: o, answer: +b.answer, points: +(b.points || 1) }; D().quizzes.push(q); return { ...q, grade_item_created: 0 }; };
  L['GET /api/lms/i/quizzes'] = b => { if (!ctOf(b.content_id)) throw W3.err('not_found'); const p = b.member_no && perOf(b.member_no);
    return D().quizzes.filter(q => q.content_id === b.content_id).sort((a, z) => a.at_sec - z.at_sec).map(q => { const A = Object.entries(D().answers).filter(([k]) => k.startsWith(q.quiz_id + '|')).map(([, v]) => v); const m = p && D().answers[q.quiz_id + '|' + p.person_id];
      return { quiz_id: q.quiz_id, at_sec: q.at_sec, question: q.question, options: q.options, answer: q.answer, points: q.points, mine: m ? { choice: m.choice, correct: m.correct } : null, answered: A.length, correct_rate: A.length ? Math.round(100 * A.filter(a => a.correct).length / A.length) : 0 }; }); };
  L['POST /api/lms/i/quiz/answer'] = b => { const q = D().quizzes.find(x => x.quiz_id === b.quiz_id); if (!q) throw W3.err('not_found'); const s = sesOf(ctOf(q.content_id).session_id); const p = enr(s.section_id, b.member_no); if (!p) throw W3.err('not_enrolled');
    const k = q.quiz_id + '|' + p.person_id; if (D().answers[k]) throw W3.err('answered'); if (+b.choice >= q.options.length) throw W3.err('bad_choice'); const correct = +b.choice === q.answer; D().answers[k] = { choice: +b.choice, correct, at: W3.ts(now()) }; ev(null, q.content_id, p.person_id, 'quiz', q.at_sec);
    const all = D().quizzes.filter(x => { const c = ctOf(x.content_id); return c && sesOf(c.session_id).section_id === s.section_id; }); const tot = all.reduce((a, x) => a + x.points, 0); const got = all.reduce((a, x) => a + (D().answers[x.quiz_id + '|' + p.person_id]?.correct ? x.points : 0), 0);
    const score = Math.round(10000 * got / Math.max(tot, 1)) / 100; D().grades[p.person_id] = score; return { quiz_id: q.quiz_id, choice: +b.choice, correct, answer: q.answer, score, graded: 1 }; };
  L['GET /api/lms/i/workload'] = b => { const sec = D().sections.find(s => s.section_id === b.section_id); if (!sec) throw W3.err('not_found');
    const w = D().sessions.filter(s => s.section_id === sec.section_id && s.kind !== 'holiday' && (sec.mode !== 'offline' || s.kind === 'online')).sort((a, z) => a.week_no - z.week_no || a.seq - z.seq).map(s => { const cs = D().contents.filter(c => c.session_id === s.session_id); const sum = cs.reduce((a, c) => a + c.duration_sec, 0); const ex = s.extra_study_sec || 0; const req = s.required_sec > 0 ? s.required_sec : 1500;
      return { session_id: s.session_id, week_no: s.week_no, seq: s.seq, kind: s.kind, contents: cs.length, content_sec: sum, extra_study_sec: ex, total_sec: sum + ex, required_sec: req, short_sec: Math.max(0, req - sum - ex), short: sum + ex < req }; });
    return { sessions: w, short_count: w.filter(x => x.short).length, standard: '차시당 콘텐츠 재생시간 + 지정 학습시간 ≥ 기준(지정 없으면 25분)' }; };
  L['GET /api/lms/i/history'] = b => { if (!D().sections.find(s => s.section_id === b.section_id)) throw W3.err('not_found'); const who = b.member_no ? perOf(b.member_no) : null; const ok = pid => !b.member_no || (who && who.person_id === pid); const mno = pid => D().persons.find(p => p.person_id === pid)?.member_no;
    const cts = new Set(secCts(b.section_id).map(x => x.c.content_id));
    const plays = D().plays.filter(p => cts.has(p.content_id) && ok(p.person_id)).sort((a, z) => a.started_at < z.started_at ? 1 : -1).slice(0, 1000).map(p => { const c = ctOf(p.content_id); return { member_no: mno(p.person_id), content_title: c.title, week_no: sesOf(c.session_id).week_no, device: p.device, ip_masked: p.ip_masked, started_at: p.started_at, ended_at: p.ended_at, last_beat_at: p.last_beat_at, watched_sec: p.watched_sec, rate: p.rate_x100 / 100 }; });
    const acts = D().acts.filter(a => a.section_id === b.section_id && ok(a.person_id)).sort((a, z) => a.at < z.at ? 1 : -1).slice(0, 1000).map(a => ({ member_no: mno(a.person_id), kind: a.kind, ref: a.ref, device: a.device, ip_masked: a.ip_masked, at: a.at }));
    const evs = {}; D().events.filter(e => cts.has(e.content_id) && ok(e.person_id)).forEach(e => { evs[e.kind] = (evs[e.kind] || 0) + 1; }); return { plays, activities: acts, events: evs }; };
  L['POST /api/lms/i/activity'] = b => { const p = enr(b.section_id, b.member_no); if (!D().sections.find(s => s.section_id === b.section_id)) throw W3.err('not_found'); if (!p) throw W3.err('not_enrolled');
    const a = { section_id: b.section_id, person_id: p.person_id, kind: b.kind, ref: b.ref || null, device: W3.device(), ip_masked: W3.ipMasked(), at: W3.ts(now()) }; D().acts.push(a); return { kind: a.kind, ref: a.ref, device: a.device, ip_masked: a.ip_masked, at: a.at }; };

  /* ═════════ 화면 ═════════ */
  Object.assign(MENU, { lmsi: { label: '동영상 · 진도', ws: 'learn', only: 'univ' } });
  if (PRESET.univ_lms && !PRESET.univ_lms.on.includes('lmsi')) { const at = PRESET.univ_lms.on.indexOf('lmsg'); PRESET.univ_lms.on.splice(at >= 0 ? at + 1 : PRESET.univ_lms.on.length, 0, 'lmsi'); PRESET.univ_lms.off = PRESET.univ_lms.off.filter(x => x !== 'lmsi'); }
  Object.keys(PRESET).filter(k => k !== 'univ_lms').forEach(k => { if (!PRESET[k].on.includes('lmsi') && !PRESET[k].off.includes('lmsi')) PRESET[k].off.push('lmsi'); });

  const P = { st: null, pos: 0, from: 0, rate: 1, playing: false, timer: 0, lastTick: 0, cues: [], lang: 'ko', quizzes: [], quiz: null, video: null, msg: '' };
  W3.player = P;
  const stop = () => { if (P.timer) { clearInterval(P.timer); P.timer = 0; } P.playing = false; };

  VIEWS.lmsi = () => {
    W3.css('w3'); if (!ULMS_()) return '<div class="empty">대학(학사 LMS) 에디션에서 쓰는 화면입니다.</div>';
    const sec = W3.section(); if (sec === undefined) return W3.loading; if (sec.__err) return `<div class="empty">${esc(sec.__err)}</div>`;
    const C = W3.get('contents:' + sec.section_id, 'GET', '/api/lms/i/contents', { section_id: sec.section_id }); if (C === undefined) return W3.loading; if (C.__err) return `<div class="empty">${esc(C.__err)}</div>`;
    if (!C.length && (S && S.org && S.org.empty)) return `<div class="empty">이 분반에 올린 강의 영상이 없습니다.<small class="efh-note">강의 영상 관리에서 영상을 올리고 차시에 배치하면 진도 · 학습시간이 기록됩니다.</small><button class="btn sm" data-act="go" data-v="lmsv">강의 영상 관리로 가기</button></div>`;
    if (!C.length && !W3.busy.iseed) { W3.busy.iseed = 1; W3.call('POST', '/api/lms/i/seed', { section_id: sec.section_id }).finally(() => { delete W3.busy.iseed; W3.drop('contents:'); render(); }); return W3.loading; }
    const t = UI.w3iT || 'player'; if (t !== 'player' && P.st) endPlay(true);
    UI.w3iC = UI.w3iC && C.find(c => c.content_id === UI.w3iC) ? UI.w3iC : C[0]?.content_id;
    const csel = `<select data-chg="w3i-c" aria-label="콘텐츠">${C.map(c => `<option value="${esc(c.content_id)}" ${c.content_id === UI.w3iC ? 'selected' : ''}>${c.week_no}주 ${c.seq}차 · ${esc(c.title)} (${mmss(c.duration_sec)})</option>`).join('')}</select>`;
    /* 2단계(UX): 탭 6개 → 4개 + 더보기(학습분량 점검 · 학습 이력), 연동 안내는 한 줄 작은 글로 */
    const TB = [['player', '플레이어'], ['prog', '진도 현황'], ['quiz', '영상 퀴즈'], ['subs', '자막'], ['load', '학습분량 점검'], ['hist', '학습 이력']];
    const tb4 = window.LMSX && typeof LMSX.tabs4 === 'function' ? LMSX.tabs4('w3iT', TB, t) : tabs('w3iT', TB, t);
    return head('동영상 · 진도', `${esc(sec.title)} · 영상 ${C.length}개를 차시별로 재생하고 진도를 확인합니다. <small class="w3-mini">영상 서버 연결 · 화질 변환은 연동 후 동작</small>`, `${W3.secPick()} ${W3.mode()}`)
      + tb4
      + ({ player: iPlayer, prog: iProg, subs: iSubs, quiz: iQuiz, load: iLoad, hist: iHist }[t])(sec, C, csel);
  };
  ACT['w3i-c'] = el => { if (P.st) endPlay(true); UI.w3iC = el.value; render(); };

  /* ── 플레이어 ── */
  function iPlayer(sec, C, csel) {
    const c = C.find(x => x.content_id === UI.w3iC) || {}; const s = P.st && P.st.content_id === c.content_id ? P.st : null;
    const med = s && !P.blob && window.DDMEDIA && DDMEDIA.playable(s.src); /* v32 학교 서버 스트리밍(media:키, lms/media-play.js) */
    const real = s && (P.blob || /^(https?:|blob:)/.test(s.src || '') || med);
    setTimeout(paint, 0);
    return `<div class="card"><div class="ch"><b>HTML5 플레이어</b>${csel}</div>
      <div class="form2"><label>학번(학생 화면으로 재생)<input id="w3imno" maxlength="20" value="${esc(UI.w3iMno || '20269001')}"></label><label>내 컴퓨터 영상으로 미리보기<input type="file" id="w3ifile" accept="video/*" data-chg="w3i-file"></label></div>
      ${P.msg ? `<div class="w3-res bad" role="alert">${esc(P.msg)}</div>` : ''}
      <div class="w3-player"><div>
        <div class="w3-vid">${real ? (med ? `<video id="w3v" data-media="${esc(s.src)}" playsinline preload="metadata"></video>` : `<video id="w3v" src="${esc(P.blob || s.src)}" playsinline preload="metadata"></video>`) : `<div class="w3-sim" id="w3sim">${s ? '가상 영상(시간만 흐름) — 실제 영상은 CDN 연동 후 재생됩니다' : '「재생 시작」을 누르면 서버에 재생 세션을 엽니다(이어보기 · 동시 재생 확인)'}</div>`}
          <div class="w3-cap" id="w3cap" aria-live="polite"></div>${P.quiz ? quizBox(P.quiz) : ''}</div>
        <div class="w3-seg" id="w3seg" aria-hidden="true"></div>
        <input type="range" id="w3pos" min="0" max="${c.duration_sec || 1}" value="${Math.floor(P.pos)}" data-chg="w3i-seek" aria-label="재생 위치" style="width:100%" ${s ? '' : 'disabled'}>
        <div class="w3-ctl">${s ? `<button class="btn sm pri" data-act="w3i-toggle">${P.playing ? '일시정지' : '재생'}</button><button class="btn sm" data-act="w3i-end">재생 종료</button>` : `<button class="btn sm pri" data-act="w3i-start">재생 시작</button>`}
          <label>배속 <select data-chg="w3i-rate" aria-label="배속">${[1, 1.25, 1.5, 1.75, 2].map(r => `<option value="${r}" ${r === P.rate ? 'selected' : ''}>${r.toFixed(2).replace(/0$/, '')}x</option>`).join('')}</select></label>
          <label>화질 <select aria-label="화질">${(c.qualities || ['auto']).map(q => `<option>${esc(q)}</option>`).join('')}</select></label>
          <label>자막 <select data-chg="w3i-lang" aria-label="자막 언어"><option value="">끄기</option>${(c.subtitles || []).map(l => `<option value="${l}" ${l === P.lang ? 'selected' : ''}>${esc(LANGS[l] || l)}</option>`).join('')}</select></label>
          <span class="mini" id="w3time">${mmss(P.pos)} / ${mmss(c.duration_sec || 0)}</span></div>
        <p class="mini" id="w3stat">${s ? `학습 인정 ${mmss(s.watched_sec || 0)} · 진도 ${s.pct || 0}% · 이어보기 ${mmss(s.resume_pos)}부터 · ${s.block_concurrent ? '동시 재생 차단 중' : '동시 재생 허용'}` : '본 구간만 학습시간으로 인정합니다(건너뛴 구간 불인정, 배속은 1.0~2.0배).'}</p>
      </div><div><p class="mini"><b>대본</b> — 누르면 그 위치로 이동합니다</p><div class="w3-tr" id="w3tr">${P.cues.length ? P.cues.map((q, i) => `<button data-act="w3i-cue" data-i="${i}"><small>${mmss(q.s)}</small>${esc(q.t)}</button>`).join('') : '<div class="empty">자막이 없습니다.</div>'}</div></div></div></div>`;
  }
  const quizBox = q => `<div class="w3-quiz" role="dialog" aria-label="영상 중간 퀴즈"><b>${esc(q.question)}</b>${q.options.map((o, i) => `<button data-act="w3i-ans" data-i="${i}">${i + 1}. ${esc(o)}</button>`).join('')}</div>`;
  function paint() {
    const s = P.st; const seg = document.getElementById('w3seg'); if (!seg) { if (P.st) endPlay(true); return; }
    const dur = s ? s.duration_sec : 1;
    seg.innerHTML = (s ? (s.segments || []).map(g => `<i style="left:${100 * g[0] / dur}%;width:${100 * (g[1] - g[0]) / dur}%"></i>`).join('') + (s.check_at_sec != null ? `<em style="left:${100 * s.check_at_sec / dur}%" title="진도 체크 지점"></em>` : '') : '');
    const pos = document.getElementById('w3pos'); if (pos && document.activeElement !== pos) pos.value = Math.floor(P.pos);
    const tm = document.getElementById('w3time'); if (tm && s) tm.textContent = `${mmss(P.pos)} / ${mmss(dur)}`;
    const cue = P.cues.findIndex(q => P.pos >= q.s && P.pos < q.e); const cap = document.getElementById('w3cap'); if (cap) cap.textContent = cue >= 0 ? P.cues[cue].t : '';
    document.querySelectorAll('#w3tr button').forEach((b, i) => { const on = i === cue; if (on !== b.classList.contains('on')) { b.classList.toggle('on', on); if (on) b.scrollIntoView({ block: 'nearest' }); } });
  }
  async function loadSide(cid) {
    try { const subs = await W3.call('GET', '/api/lms/i/subtitles', { content_id: cid }); const pick = subs.find(x => x.lang === P.lang) || subs[0]; P.lang = pick ? pick.lang : ''; P.cues = pick ? pick.cues : []; } catch (e) { P.cues = []; }
    try { P.quizzes = await W3.call('GET', '/api/lms/i/quizzes', { content_id: cid, member_no: UI.w3iMno }); } catch (e) { P.quizzes = []; }
  }
  ACT['w3i-file'] = el => { const f = el.files && el.files[0]; if (!f) return; if (P.blob) URL.revokeObjectURL(P.blob); P.blob = URL.createObjectURL(f); toast('내 컴퓨터 영상으로 미리보기합니다(서버에 올리지 않습니다).'); render(); };
  ACT['w3i-start'] = async () => {
    const mno = ($('#w3imno')?.value || '').trim(); UI.w3iMno = mno; P.msg = '';
    try { const r = await W3.call('POST', '/api/lms/i/play/start', { content_id: UI.w3iC, member_no: mno });
      if (r.blocked) { P.msg = '다른 기기 · 창에서 재생 중입니다. 동시 재생은 허용되지 않습니다(재생 로그에 기록됨).'; render(); return; }
      P.st = r; P.pos = r.resume_pos; P.from = r.resume_pos; P.rate = 1; await loadSide(r.content_id); render(); ACT['w3i-toggle'](); } catch (e) { P.msg = e.message; render(); }
  };
  async function beat(extra) {
    const s = P.st; if (!s) return; const pos = Math.floor(P.pos); const from = Math.floor(P.from);
    try { const r = await W3.call('POST', '/api/lms/i/play/beat', { play_id: s.play_id, from, pos: Math.max(pos, from), rate: P.rate }); Object.assign(s, { watched_sec: r.watched_sec, pct: r.pct, segments: r.segments }); P.from = pos;
      const st = document.getElementById('w3stat'); if (st) st.textContent = `학습 인정 ${mmss(r.watched_sec)} · 진도 ${r.pct}%${r.completed ? ' · 완료' : ''}`; paint(); }
    catch (e) { if (e.code === 'play_over' || /바뀐 재생/.test(e.message)) { stop(); P.st = null; P.msg = '다른 기기에서 재생을 시작해 이 재생을 멈췄습니다.'; render(); } else toast(e.message, 'warn'); }
    if (extra) extra();
  }
  W3.beat = beat;
  function tick() {
    const s = P.st; if (!s || !document.getElementById('w3seg')) { stop(); return; }
    const t = now(); const dt = (t - P.lastTick) / 1000; P.lastTick = t;
    if (P.video) P.pos = P.video.currentTime; else P.pos = Math.min(s.duration_sec, P.pos + dt * P.rate);
    const q = P.quizzes.find(x => !x.mine && !x.skip && P.pos >= x.at_sec && P.pos - x.at_sec < 3); if (q) { P.quiz = q; ACT['w3i-toggle'](); render(); return; }
    if (Math.floor(P.pos) - P.from >= 10) beat();
    if (P.pos >= s.duration_sec) { ACT['w3i-toggle'](); }
    paint();
  }
  ACT['w3i-toggle'] = () => { if (!P.st) return; P.video = document.getElementById('w3v');
    if (P.playing) { stop(); if (P.video) P.video.pause(); beat(); } else { P.playing = true; P.lastTick = now(); if (P.video) { P.video.currentTime = P.pos; P.video.playbackRate = P.rate; P.video.play().catch(() => { }); } P.timer = setInterval(tick, 250); }
    const b = document.querySelector('[data-act="w3i-toggle"]'); if (b) b.textContent = P.playing ? '일시정지' : '재생'; };
  ACT['w3i-seek'] = el => { if (!P.st) return; const to = +el.value; beat(() => { P.pos = to; P.from = to; if (P.video) P.video.currentTime = to; paint(); }); };
  ACT['w3i-cue'] = el => { const q = P.cues[+el.dataset.i]; if (!q || !P.st) return; beat(() => { P.pos = q.s; P.from = Math.floor(q.s); if (P.video) P.video.currentTime = q.s; paint(); }); };
  ACT['w3i-rate'] = el => { const r = +el.value; beat(() => { P.rate = r; if (P.video) P.video.playbackRate = r; }); };
  ACT['w3i-lang'] = async el => { P.lang = el.value; if (!P.lang) { P.cues = []; render(); return; } const subs = await W3.call('GET', '/api/lms/i/subtitles', { content_id: UI.w3iC }).catch(() => []); P.cues = (subs.find(x => x.lang === P.lang) || {}).cues || []; render(); };
  ACT['w3i-ans'] = async el => { const q = P.quiz; if (!q) return; try { const r = await W3.call('POST', '/api/lms/i/quiz/answer', { quiz_id: q.quiz_id, member_no: UI.w3iMno, choice: +el.dataset.i }); q.mine = { choice: r.choice, correct: r.correct }; toast(r.correct ? `정답입니다. 영상 퀴즈 점수 ${r.score}점` : `오답입니다(정답 ${r.answer + 1}번). 영상 퀴즈 점수 ${r.score}점`, r.correct ? 'ok' : 'warn'); }
    catch (e) { q.skip = 1; toast(e.message, 'warn'); } P.quiz = null; render(); ACT['w3i-toggle'](); };
  function endPlay(silent) { const s = P.st; stop(); if (!s) return; const pos = Math.floor(P.pos); P.st = null; P.quiz = null;
    W3.call('POST', '/api/lms/i/play/beat', { play_id: s.play_id, from: Math.floor(P.from), pos: Math.max(pos, Math.floor(P.from)), rate: P.rate }).catch(() => { }).finally(() => W3.call('POST', '/api/lms/i/play/end', { play_id: s.play_id, pos }).catch(() => { }).finally(() => { W3.drop('prog:'); W3.drop('anom:'); if (!silent) render(); })); }
  ACT['w3i-end'] = () => { endPlay(false); toast('재생을 마쳤습니다.'); };

  /* ── 진도 현황 ── */
  function iProg(sec) {
    const R = W3.get('prog:' + sec.section_id, 'GET', '/api/lms/i/progress', { section_id: sec.section_id }); if (R === undefined) return W3.loading; if (R.__err) return `<div class="empty">${esc(R.__err)}</div>`;
    const avg = R.students.length ? Math.round(R.students.reduce((a, s) => a + s.avg_pct, 0) / R.students.length) : 0;
    return `<div class="kpis">${kpi('평균 진도', avg + '%')}${kpi('콘텐츠', R.contents.length + '개')}${kpi('진도 50% 미만', R.students.filter(s => s.avg_pct < 50).length + '명', '', R.students.some(s => s.avg_pct < 50) ? 'warn' : '')}</div>
      <div class="card"><div class="ch"><b>학생별 진도율(%)</b><button class="btn sm" data-act="w3i-prog-csv">CSV</button></div><div class="tw w3-grid"><table><thead><tr><th class="stick">학번</th><th>학과</th>${R.contents.map(c => `<th title="${esc(c.title)}">${c.week_no}-${c.seq}</th>`).join('')}<th>평균</th></tr></thead><tbody>
      ${R.students.map(s => `<tr><td class="stick"><b>${esc(s.member_no)}</b></td><td>${esc(s.unit_code || '')}</td>${s.pcts.map(p => `<td style="color:${p >= 90 ? 'var(--ok)' : p < 50 ? 'var(--bad)' : 'var(--ink)'}">${p}</td>`).join('')}<td>${tag(s.avg_pct + '%', s.avg_pct < 50 ? 'r' : s.avg_pct < 90 ? 'y' : 'g')}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  ACT['w3i-prog-csv'] = () => { const R = W3.cache['prog:' + UI.w3sec]; if (!R) return; downloadCSV(`진도현황_${today()}.csv`, ['학번', '학과', ...R.contents.map(c => `${c.week_no}주${c.seq}차 ${c.title}`), '평균(%)'], R.students.map(s => [s.member_no, s.unit_code || '', ...s.pcts, s.avg_pct])); };

  /* ── 자막 ── */
  function iSubs(sec, C, csel) {
    const S2 = W3.get('subs:' + UI.w3iC, 'GET', '/api/lms/i/subtitles', { content_id: UI.w3iC }); if (S2 === undefined) return W3.loading; if (S2.__err) return `<div class="empty">${esc(S2.__err)}</div>`;
    const cur = S2.find(x => x.lang === UI.w3iL) || S2[0]; if (cur) UI.w3iL = cur.lang;
    return `<div class="card w3-sub"><div class="ch"><b>자막 등록(VTT · SRT)</b>${csel}</div>
      <div class="form2"><label>언어<select id="w3sl">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label>형식<select id="w3sf"><option value="vtt">WebVTT(.vtt)</option><option value="srt">SubRip(.srt)</option></select></label><label>파일<input type="file" id="w3sfile" accept=".vtt,.srt,text/vtt" data-chg="w3i-subfile"></label></div>
      <textarea id="w3stext" placeholder="WEBVTT&#10;&#10;00:00:01.000 --> 00:00:04.000&#10;자막 내용" aria-label="자막 원문"></textarea>
      <div class="w3-btns"><button class="btn sm pri" data-act="w3i-subup">등록</button><button class="btn sm" data-act="w3i-ai-sub">AI 자동자막 · 번역</button></div></div>
      <div class="card"><div class="ch"><b>등록된 자막</b>${S2.length ? `<select data-chg="w3i-subl">${S2.map(x => `<option value="${x.lang}" ${x.lang === UI.w3iL ? 'selected' : ''}>${esc(LANGS[x.lang] || x.lang)} · ${x.cues.length}줄</option>`).join('')}</select>` : ''}</div>
      ${cur ? `<div class="tw"><table id="w3cues"><thead><tr><th>시작(초)</th><th>끝(초)</th><th>대사</th></tr></thead><tbody>${cur.cues.slice(0, 300).map((q, i) => `<tr><td><input type="number" step="0.1" min="0" value="${q.s}" data-i="${i}" data-k="s" style="width:84px" aria-label="시작"></td><td><input type="number" step="0.1" min="0" value="${q.e}" data-i="${i}" data-k="e" style="width:84px" aria-label="끝"></td><td><input value="${esc(q.t)}" maxlength="500" data-i="${i}" data-k="t" style="width:100%" aria-label="대사"></td></tr>`).join('')}</tbody></table></div>
        <div class="w3-btns"><button class="btn sm pri" data-act="w3i-cuesave">편집 저장</button><button class="btn sm" data-act="w3i-vtt">VTT 내려받기</button></div>` : '<div class="empty">등록된 자막이 없습니다.</div>'}</div>`;
  }
  ACT['w3i-subl'] = el => { UI.w3iL = el.value; render(); };
  ACT['w3i-subfile'] = el => { const f = el.files && el.files[0]; if (!f) return; if (f.size > 300000) { toast('300KB 이하 파일만 등록합니다.', 'warn'); return; } f.text().then(t => { $('#w3stext').value = t; $('#w3sf').value = /\.srt$/i.test(f.name) ? 'srt' : 'vtt'; }); };
  ACT['w3i-subup'] = () => W3.act(() => W3.call('POST', '/api/lms/i/subtitle', { content_id: UI.w3iC, lang: $('#w3sl').value, format: $('#w3sf').value, text: $('#w3stext').value }), r => `${r.cues}줄을 등록했습니다.`).then(r => { if (r) { UI.w3iL = r.lang; W3.drop('subs:'); W3.drop('contents:'); render(); } });
  ACT['w3i-ai-sub'] = () => toast('AI 자동자막(STT) · 번역 엔진은 「AI 관리」의 자막 모델 연동 후 동작합니다. 지금은 VTT · SRT를 직접 등록하세요.', 'warn');
  ACT['w3i-cuesave'] = () => { const rows = {}; document.querySelectorAll('#w3cues [data-i]').forEach(x => { const r = rows[x.dataset.i] = rows[x.dataset.i] || {}; r[x.dataset.k] = x.dataset.k === 't' ? x.value : +x.value; });
    W3.act(() => W3.call('POST', '/api/lms/i/subtitle/cues', { content_id: UI.w3iC, lang: UI.w3iL, cues: Object.values(rows) }), '자막을 저장했습니다.').then(r => { if (r) { W3.drop('subs:'); render(); } }); };
  ACT['w3i-vtt'] = () => { const cur = (W3.cache['subs:' + UI.w3iC] || []).find(x => x.lang === UI.w3iL); if (!cur) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toVTT(cur.cues)], { type: 'text/vtt' })); a.download = `자막_${UI.w3iL}.vtt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

  /* ── 영상 퀴즈 ── */
  function iQuiz(sec, C, csel) {
    const Q = W3.get('quiz:' + UI.w3iC, 'GET', '/api/lms/i/quizzes', { content_id: UI.w3iC }); if (Q === undefined) return W3.loading; if (Q.__err) return `<div class="empty">${esc(Q.__err)}</div>`;
    return `<div class="card"><div class="ch"><b>영상 중간 퀴즈</b>${csel}</div><p class="mini">재생이 지정 시점에 오면 멈추고 문제를 냅니다. 결과는 성적 항목 「영상 퀴즈」(배점 비율은 성적 화면에서 조정)에 자동 반영됩니다.</p>
      ${table(['시점', '문제', '보기', '정답', '배점', '응답', '정답률'], Q.map(q => [mmss(q.at_sec), esc(q.question), esc(q.options.join(' / ')), q.answer + 1 + '번', q.points, q.answered + '명', q.correct_rate + '%']), '등록된 퀴즈가 없습니다.')}
      <div class="form2"><label>시점(초)<input type="number" id="w3qa" min="0" value="60"></label><label>배점<input type="number" id="w3qp" min="1" max="10" value="1"></label><label>정답 번호<input type="number" id="w3qn" min="1" max="6" value="1"></label></div>
      <label class="fl">문제<input id="w3qq" maxlength="300"></label><label class="fl">보기(줄마다 하나, 2~6개)<textarea id="w3qo" rows="3"></textarea></label><button class="btn sm pri" data-act="w3i-qadd">퀴즈 추가</button></div>`;
  }
  ACT['w3i-qadd'] = () => W3.act(() => W3.call('POST', '/api/lms/i/quiz', { content_id: UI.w3iC, at_sec: +$('#w3qa').value, question: $('#w3qq').value.trim(), options: $('#w3qo').value.split('\n').map(x => x.trim()).filter(Boolean), answer: +$('#w3qn').value - 1, points: +$('#w3qp').value }), '퀴즈를 추가했습니다.').then(r => { if (r) { W3.drop('quiz:'); W3.drop('contents:'); render(); } });

  /* ── 학습분량 점검 ── */
  function iLoad(sec) {
    const R = W3.get('load:' + sec.section_id, 'GET', '/api/lms/i/workload', { section_id: sec.section_id }); if (R === undefined) return W3.loading; if (R.__err) return `<div class="empty">${esc(R.__err)}</div>`;
    return `<div class="card"><div class="ch"><b>원격수업 학습분량 점검</b><small>${esc(R.standard)}</small>${R.short_count ? tag(`부족 차시 ${R.short_count}개`, 'r') : tag('모두 충족', 'g')}</div>
      ${table(['차시', '콘텐츠', '재생시간', '지정 학습시간', '합계', '기준', '부족', ''], R.sessions.map(s => [`${s.week_no}주 ${s.seq}차`, s.contents + '개', mmss(s.content_sec), mmss(s.extra_study_sec), `<b>${mmss(s.total_sec)}</b>`, mmss(s.required_sec), s.short ? tag(mmss(s.short_sec) + ' 부족', 'r') : tag('충족', 'g'), `<button class="btn sm ghost" data-act="w3i-extra" data-s="${esc(s.session_id)}">지정 시간</button>`]))}</div>`;
  }
  ACT['w3i-extra'] = el => modal('지정 학습시간', `<label class="fl">지정 학습시간(분, 읽기 · 토론 · 과제 등)<input type="number" name="m" min="0" max="600" value="10"></label><label class="fl">차시 기준(분, 비우면 25분)<input type="number" name="r" min="0" max="600"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { W3.act(() => W3.call('POST', '/api/lms/g/session', { session_id: el.dataset.s, extra_study_sec: Math.round(+fv(w, 'm') * 60), ...(fv(w, 'r') ? { required_sec: Math.round(+fv(w, 'r') * 60) } : {}) }), '저장했습니다.').then(() => { W3.drop('load:'); render(); }); } }]);

  /* ── 학습 이력 ── */
  function iHist(sec) {
    const k = 'hist:' + sec.section_id + ':' + (UI.w3iHm || ''); const R = W3.get(k, 'GET', '/api/lms/i/history', { section_id: sec.section_id, member_no: UI.w3iHm || undefined }); if (R === undefined) return W3.loading; if (R.__err) return `<div class="empty">${esc(R.__err)}</div>`;
    const DV = { desktop: 'PC', mobile: '모바일', tablet: '태블릿', unknown: '알 수 없음' };
    return `<div class="card"><div class="ch"><b>진도 · 학습 이력</b><input id="w3ihm" maxlength="20" placeholder="학번(비우면 전체)" value="${esc(UI.w3iHm || '')}" style="max-width:160px" aria-label="학번 필터"><button class="btn sm" data-act="w3i-hf">조회</button><button class="btn sm" data-act="w3i-hcsv">CSV</button></div>
      <p class="mini">재생 로그 ${Object.entries(R.events).map(([k, v]) => `${esc({ start: '시작', end: '종료', seek: '이동', rate: '배속', blocked: '동시 재생 차단', quiz: '퀴즈', beat: '박동' }[k] || k)} ${v}`).join(' · ') || '없음'} · IP는 끝자리를 가립니다.</p>
      ${table(['학번', '차시', '콘텐츠', '기기', 'IP', '시작', '종료', '시청'], R.plays.slice(0, 200).map(p => [esc(p.member_no), p.week_no + '주', esc(p.content_title), esc(DV[p.device] || p.device || ''), esc(p.ip_masked || ''), esc(W3.fmt(p.started_at)), esc(p.ended_at ? W3.fmt(p.ended_at) : '재생 중'), mmss(p.watched_sec)]), '재생 이력이 없습니다.')}</div>
      <div class="card"><div class="ch"><b>강좌 내 행동 기록</b><button class="btn sm" data-act="w3i-actdemo">행동 기록 남기기(예: 자료 내려받기)</button></div>${table(['학번', '행동', '대상', '기기', 'IP', '시각'], R.activities.slice(0, 200).map(a => [esc(a.member_no), esc({ view_notice: '공지 열람', view_material: '자료 열람', download: '내려받기', submit_assignment: '과제 제출', post: '글쓰기', comment: '댓글', quiz: '퀴즈', exam: '시험', live_join: '화상 입장', page: '페이지' }[a.kind] || a.kind), esc(a.ref || ''), esc(DV[a.device] || a.device || ''), esc(a.ip_masked || ''), esc(W3.fmt(a.at))]), '행동 기록이 없습니다.')}</div>`;
  }
  ACT['w3i-hf'] = () => { UI.w3iHm = ($('#w3ihm').value || '').trim(); render(); };
  ACT['w3i-hcsv'] = () => { const R = W3.cache['hist:' + UI.w3sec + ':' + (UI.w3iHm || '')]; if (!R) return; downloadCSV(`학습이력_${today()}.csv`, ['학번', '차시', '콘텐츠', '기기', 'IP', '시작', '종료', '시청(초)', '배속'], R.plays.map(p => [p.member_no, p.week_no, p.content_title, p.device, p.ip_masked, p.started_at, p.ended_at || '', p.watched_sec, p.rate])); };
  ACT['w3i-actdemo'] = () => W3.act(() => W3.call('POST', '/api/lms/i/activity', { section_id: UI.w3sec, member_no: UI.w3iHm || '20269001', kind: 'download', ref: '강의자료.pdf' }), '행동을 기록했습니다.').then(() => { W3.drop('hist:'); render(); });
})();
