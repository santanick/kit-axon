/* v30 학사 LMS 묶음 G — 출결 관리(SFR-010 · 016 · 031 · 033 · 048 · 068 · 088)
   인증번호 · 회전 QR · NFC · BLE · 사진(위치 · 일시만) 출석, 본인 재인증 호출 지점, 교수 수동 출결(출석 · 지각 · 결석 · 공결 + 사유 · 증빙),
   휴강 · 보강, 장애 시 일괄 조정, 연강 자동 복사, 온라인 출석 인정(진도율 · 주차 기간) + 오프라인 통합, 청강생 제외, 학교 양식 CSV · 인쇄, 비정상 학습행동.
   운영(서버) 모드: /api/lms/g/... 호출. 데모 모드: 같은 경로를 브라우저 안 W3.LOCAL이 흉내 낸다(S.lms.w3).
   W3(공용 호출 · 데모 저장소)는 묶음 I · J 화면도 같이 쓴다. */
(function () {
  'use strict';
  const ULMS_ = () => typeof ULMS === 'function' && ULMS();

  /* ═════════ 공용: 호출 · 데모 저장소 ═════════ */
  const ERRM = { bad_input: '입력값이 올바르지 않습니다.', required: '필수 입력값이 없습니다.', not_found: '대상을 찾을 수 없습니다.', role: '이 작업을 할 권한이 없습니다.', holiday: '휴강 차시입니다.',
    not_enrolled: '이 분반 수강생이 아닙니다.', audit: '청강생은 출석 대상이 아닙니다.', method_off: '이 분반에서 허용하지 않은 출석 방식입니다.', no_time: '차시 시작 시각이 정해지지 않았습니다.',
    not_open: '아직 출석 시간이 아닙니다.', closed: '출석 인정 시간이 지났습니다. 교수자에게 문의하세요.', dup: '이미 이 차시에 출석했습니다.', idv_required: '출석 전 본인 재인증이 필요합니다(SSO 재인증 연동 후 동작).',
    no_code: '발급된 인증번호가 없습니다.', expired: '인증번호 · QR이 만료되었습니다.', bad_code: '인증번호가 맞지 않습니다.', bad_qr: 'QR이 맞지 않거나 바뀌었습니다. 다시 촬영하세요.',
    bad_tag: '등록되지 않은 NFC 태그 · 비콘입니다.', room_mismatch: '이 차시 강의실의 태그 · 비콘이 아닙니다.', need_geo: '촬영 위치(위도 · 경도)가 필요합니다.', need_reason: '공결 · 조정에는 사유가 필요합니다.',
    no_next: '이어지는 연강 차시가 없습니다.', concurrent: '다른 기기 · 창에서 재생 중입니다. 동시 재생은 허용되지 않습니다.', play_over: '끝났거나 다른 재생으로 바뀐 재생입니다.', bad_rate: '배속은 1.0~2.0배만 허용됩니다.',
    bad_sub: '자막 파일 형식이 올바르지 않습니다(VTT · SRT).', answered: '이미 응답한 퀴즈입니다.', bad_choice: '보기 번호가 올바르지 않습니다.' };
  const W3 = window.W3 = {
    LOCAL: {}, cache: {}, busy: {},
    live: () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user),
    err(code) { const e = new Error(ERRM[code] || '요청을 처리할 수 없습니다.'); e.code = code; return e; },
    uid() { return (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16))); },
    ts(t) { return t == null ? null : new Date(t).toISOString(); },
    D() { S.lms = S.lms || {}; const D = S.lms.w3 = S.lms.w3 || {}; ['sections', 'sessions', 'persons', 'beacons', 'log', 'contents', 'plays', 'events', 'quizzes', 'acts', 'rules', 'snaps', 'refl', 'fb'].forEach(k => D[k] = D[k] || []); ['att', 'codes', 'prog', 'subs', 'answers', 'grades', 'rule'].forEach(k => D[k] = D[k] || {}); return D; },
    async call(m, p, b) {
      if (W3.live()) {
        if (m === 'GET') { const q = new URLSearchParams(Object.entries(b || {}).filter(([, v]) => v != null && v !== '')).toString(); return api('GET', p + (q ? '?' + q : '')); }
        return api(m, p, b || {});
      }
      const f = W3.LOCAL[m + ' ' + p]; if (!f) throw W3.err('not_found');
      const out = f(b || {}); if (m !== 'GET') save(); return JSON.parse(JSON.stringify(out == null ? null : out));
    },
    /* 화면 캐시: 키별로 한 번 불러와 render() — 화면 함수는 동기라 캐시만 읽는다 */
    get(key, m, p, b) {
      if (key in W3.cache) return W3.cache[key];
      if (!W3.busy[key]) { W3.busy[key] = 1; W3.call(m, p, b).then(v => { W3.cache[key] = v; }).catch(e => { W3.cache[key] = { __err: e.message }; }).finally(() => { delete W3.busy[key]; render(); }); }
      return undefined;
    },
    drop(prefix) { Object.keys(W3.cache).forEach(k => { if (!prefix || k.startsWith(prefix)) delete W3.cache[k]; }); },
    async act(fn, ok) { try { const r = await fn(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok, 'ok'); return r; } catch (e) { toast(e.message, 'warn'); return null; } },
    loading: '<div class="empty">불러오는 중입니다…</div>',
    /* 분반 선택(모든 묶음 화면 공통): 데모 첫 진입 시 데모 분반을 만든다 */
    section() {
      const L = W3.get('sections', 'GET', '/api/lms/g/sections'); if (L === undefined) return undefined;
      if (L.__err) return L;
      if (!L.length) { if (!W3.busy.seed) { W3.busy.seed = 1; W3.call('POST', '/api/lms/g/seed', {}).catch(e => toast(e.message, 'warn')).finally(() => { delete W3.busy.seed; W3.drop(); render(); }); } return undefined; }
      UI.w3sec = UI.w3sec && L.find(s => s.section_id === UI.w3sec) ? UI.w3sec : L[0].section_id; return L.find(s => s.section_id === UI.w3sec);
    },
    secPick() { const L = W3.cache.sections || []; return L.length > 1 ? `<select data-chg="w3-sec" aria-label="분반 선택">${L.map(s => `<option value="${esc(s.section_id)}" ${s.section_id === UI.w3sec ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>` : ''; },
    mode() { return W3.live() ? tag('운영 서버', 'g') : '<small class="efh-demo" title="서버 없이 이 브라우저에만 저장됩니다">데모: 브라우저에만 저장</small>'; },
    fmt(t) { if (!t) return '—'; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; },
    css(name) { if (!document.querySelector(`link[data-w3css="${name}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `lms/${name}.css?v=30.0`; l.dataset.w3css = name; document.head.appendChild(l); } }
  };
  ACT['w3-sec'] = el => { UI.w3sec = el.value; W3.drop(); render(); };
  /* 학생 · 행 데이터 접근(데모) */
  const D = () => W3.D();
  const now = () => Date.now();
  const sesOf = id => D().sessions.find(s => s.session_id === id);
  const secOf = id => D().sections.find(s => s.section_id === id);
  const perOf = mno => D().persons.find(p => p.member_no === mno);
  const ruleOf = sid => Object.assign({ section_id: sid, methods: ['ble', 'code', 'manual', 'nfc', 'online', 'photo', 'qr'], late_after_min: 10, absent_after_min: 30, online_min_pct: 90, require_identity: false, block_concurrent: true, hyflex_online: true }, D().rule[sid] || {});
  const regular = sid => D().persons.filter(p => p.ekind === 'regular' && (p.secs || []).includes(sid));
  const attK = (sid, pid) => sid + '|' + pid;
  const h12 = s => { let a = 0x811c9dc5, b = 0x01000193; for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619) >>> 0; b = Math.imul(b ^ s.charCodeAt(i), 2246822519) >>> 0; } return (a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')).slice(0, 12); };
  const qrTok = (sid, c, slot) => `DDATT1.${sid}.${slot}.${h12(c.secret + '|' + slot)}`;
  W3.ipMasked = () => '10.0.0.*'; W3.device = () => /ipad|tablet/i.test(navigator.userAgent) ? 'tablet' : /mobi|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const sessJ = s => ({ session_id: s.session_id, week_no: s.week_no, seq: s.seq, kind: s.kind, starts_at: s.starts_at, ends_at: s.ends_at, open_at: s.open_at, close_at: s.close_at, room: s.room, makeup_of: s.makeup_of || null, note: s.note || null, required_sec: s.required_sec || 0, extra_study_sec: s.extra_study_sec || 0 });
  const secSessions = sid => D().sessions.filter(s => s.section_id === sid).sort((a, b) => a.week_no - b.week_no || a.seq - b.seq);
  const logIt = (sid, pid, before, after, reason) => D().log.unshift({ session_id: sid, person_id: pid, before: before || null, after, reason: reason || null, actor: S.me?.name || '교수자', at: W3.ts(now()) });

  /* ═════════ 데모 경로(서버 SQL과 같은 규칙을 단순화) ═════════ */
  const L = W3.LOCAL;
  L['POST /api/lms/g/seed'] = () => {
    const d = D(); if (d.sections.length) return { section_id: d.sections[0].section_id, sessions: d.sessions.length, students: regular(d.sections[0].section_id).length, rule: 0, beacons: 0 };
    const sec = { section_id: W3.uid(), term_id: '2026-2', course_code: 'DEMO1001', section_no: '01', title: '데이터와 인공지능 기초 (01분반)', mode: 'hyflex' }; d.sections.push(sec);
    const base = Date.parse('2026-09-07T00:00:00Z'); /* 09:00 KST */
    for (let w = 1; w <= 15; w++) for (const seq of (w === 10 ? [1, 2] : [1])) { const t = base + (w - 1) * 7 * 864e5 + (seq - 1) * 90 * 6e4; d.sessions.push({ session_id: W3.uid(), section_id: sec.section_id, week_no: w, seq, kind: [3, 7, 12].includes(w) ? 'online' : 'class', starts_at: W3.ts(t), ends_at: W3.ts(t + 75 * 6e4), open_at: W3.ts(t), close_at: W3.ts(t + 7 * 864e5), room: '공학관 301', required_sec: 0, extra_study_sec: 0 }); }
    for (let i = 1; i <= 9; i++) d.persons.push({ person_id: W3.uid(), member_no: String(20269000 + i), unit_code: ['CSE', 'BIZ', 'EDU'][i % 3], grade_year: 1 + i % 4, ekind: i === 9 ? 'audit' : 'regular', secs: [sec.section_id] });
    d.beacons.push({ beacon_id: 'NFC-ENG301', kind: 'nfc', room: '공학관 301', active: true }, { beacon_id: 'BLE-ENG301', kind: 'ble', room: '공학관 301', active: true });
    /* 지난 주차 출결 · 학습 데모(결정적) */
    const reg = regular(sec.section_id); const M = ['code', 'qr', 'nfc', 'ble', 'photo'];
    secSessions(sec.section_id).filter(s => Date.parse(s.starts_at) < now() && s.kind !== 'online').forEach(s => reg.forEach((p, j) => { const r = (s.week_no * 7 + j * 13) % 23; const st = j === 6 ? (r < 9 ? 'absent' : r < 13 ? 'late' : 'present') : r === 0 ? 'absent' : r < 3 ? 'late' : r === 3 ? 'excused' : 'present';
      d.att[attK(s.session_id, p.person_id)] = { status: st, method: st === 'excused' ? 'manual' : M[(s.week_no + j) % 5], evidence: { at: s.starts_at }, reason: st === 'excused' ? '병결(진단서 제출)' : null }; }));
    if (typeof W3.seedI === 'function') W3.seedI(sec.section_id);
    if (typeof W3.seedJ === 'function') W3.seedJ(sec.section_id);
    return { section_id: sec.section_id, sessions: d.sessions.length, students: reg.length, rule: 1, beacons: 2 };
  };
  L['GET /api/lms/g/sections'] = () => D().sections.map(s => ({ ...s, students: regular(s.section_id).length }));
  L['GET /api/lms/g/sessions'] = b => secSessions(b.section_id).map(sessJ);
  L['POST /api/lms/g/session'] = b => { const s = sesOf(b.session_id); if (!s) throw W3.err('not_found'); ['starts_at', 'ends_at', 'open_at', 'close_at', 'room', 'kind', 'note', 'required_sec', 'extra_study_sec'].forEach(k => { if (b[k] != null && b[k] !== '') s[k] = /_at$/.test(k) ? W3.ts(b[k]) : /_sec$/.test(k) ? +b[k] : b[k]; }); return sessJ(s); };
  L['POST /api/lms/g/makeup'] = b => { const o = sesOf(b.session_id); if (!o) throw W3.err('not_found'); if (!b.starts_at) throw W3.err('required'); const t = Date.parse(b.starts_at); const dur = o.ends_at ? Date.parse(o.ends_at) - Date.parse(o.starts_at) : 75 * 6e4;
    const n = { session_id: W3.uid(), section_id: o.section_id, week_no: o.week_no, seq: Math.max(...D().sessions.filter(x => x.section_id === o.section_id && x.week_no === o.week_no).map(x => x.seq)) + 1, kind: 'class', starts_at: W3.ts(t), ends_at: W3.ts(t + dur), open_at: W3.ts(t), close_at: W3.ts(t + 7 * 864e5), room: b.room || o.room, makeup_of: o.session_id, note: '보강', required_sec: 0, extra_study_sec: 0 };
    D().sessions.push(n); return { session_id: n.session_id, week_no: n.week_no, seq: n.seq, kind: n.kind, starts_at: n.starts_at, room: n.room, makeup_of: n.makeup_of }; };
  L['GET /api/lms/g/rule'] = b => { if (!secOf(b.section_id)) throw W3.err('not_found'); return ruleOf(b.section_id); };
  L['POST /api/lms/g/rule'] = b => { if (!secOf(b.section_id)) throw W3.err('not_found'); const r = ruleOf(b.section_id);
    if (Array.isArray(b.methods)) r.methods = [...new Set(b.methods.filter(m => ['code', 'qr', 'nfc', 'ble', 'photo', 'online', 'manual'].includes(m)))].sort();
    ['late_after_min', 'absent_after_min', 'online_min_pct'].forEach(k => { if (b[k] != null && b[k] !== '') r[k] = +b[k]; }); ['require_identity', 'block_concurrent', 'hyflex_online'].forEach(k => { if (typeof b[k] === 'boolean') r[k] = b[k]; });
    D().rule[b.section_id] = r; return r; };
  L['POST /api/lms/g/code'] = b => { const s = sesOf(b.session_id); if (!s) throw W3.err('not_found'); if (s.kind === 'holiday') throw W3.err('holiday');
    const ttl = +(b.ttl_sec || 180), rot = +(b.rotate_sec || 15); const a = new Uint32Array(1); crypto.getRandomValues(a); const code = String(a[0] % 1000000).padStart(6, '0');
    const c = D().codes[s.session_id] = { code, expires_at: W3.ts(now() + ttl * 1000), rotate_sec: rot, secret: W3.uid() + W3.uid() }; const slot = Math.floor(now() / 1000 / rot);
    return { session_id: s.session_id, code, expires_at: c.expires_at, ttl_sec: ttl, rotate_sec: rot, qr: qrTok(s.session_id, c, slot) }; };
  L['GET /api/lms/g/qr'] = b => { const c = D().codes[b.session_id]; if (!c) throw W3.err('no_code'); if (Date.parse(c.expires_at) < now()) throw W3.err('expired'); const slot = Math.floor(now() / 1000 / c.rotate_sec);
    return { session_id: b.session_id, expires_at: c.expires_at, rotate_sec: c.rotate_sec, qr: qrTok(b.session_id, c, slot), next_at: W3.ts((slot + 1) * c.rotate_sec * 1000) }; };
  L['POST /api/lms/g/checkin'] = b => {
    const s = sesOf(b.session_id); if (!s) throw W3.err('not_found'); if (s.kind === 'holiday') throw W3.err('holiday');
    const p = perOf(b.member_no); if (!p || !(p.secs || []).includes(s.section_id)) throw W3.err('not_enrolled'); if (p.ekind === 'audit') throw W3.err('audit');
    const r = ruleOf(s.section_id); if (!r.methods.includes(b.method)) throw W3.err('method_off'); const t0 = Date.parse(s.starts_at);
    if (now() < t0 - 10 * 6e4) throw W3.err('not_open'); if (now() > t0 + r.absent_after_min * 6e4) throw W3.err('closed');
    if (D().att[attK(s.session_id, p.person_id)]) throw W3.err('dup'); if (r.require_identity && !b.idv) throw W3.err('idv_required');
    const c = D().codes[s.session_id];
    if (['code', 'qr'].includes(b.method)) { if (!c) throw W3.err('no_code'); if (Date.parse(c.expires_at) < now()) throw W3.err('expired'); }
    if (b.method === 'code' && String(b.code || '') !== c.code) throw W3.err('bad_code');
    if (b.method === 'qr') { const sl = Math.floor(now() / 1000 / c.rotate_sec); if (![qrTok(s.session_id, c, sl), qrTok(s.session_id, c, sl - 1)].includes(b.qr)) throw W3.err('bad_qr'); }
    const bc = D().beacons.find(x => x.beacon_id === b.tag_id && x.active);
    if (['nfc', 'ble'].includes(b.method)) { if (!bc || bc.kind !== b.method) throw W3.err('bad_tag'); if (bc.room !== s.room) throw W3.err('room_mismatch'); }
    if (b.method === 'photo' && (b.lat == null || b.lng == null)) throw W3.err('need_geo');
    const ev = { at: W3.ts(now()), ip: W3.ipMasked(), device: W3.device() }; if (bc && ['nfc', 'ble'].includes(b.method)) { ev.room = bc.room; ev.tag = bc.beacon_id; }
    if (b.lat != null) { ev.lat = Math.round(b.lat * 1e5) / 1e5; ev.lng = Math.round(b.lng * 1e5) / 1e5; } if (b.taken_at) ev.taken_at = W3.ts(b.taken_at); if (b.idv) ev.idv = 'sso_pending';
    const st = now() > t0 + r.late_after_min * 6e4 ? 'late' : 'present'; D().att[attK(s.session_id, p.person_id)] = { status: st, method: b.method, evidence: ev };
    return { session_id: s.session_id, member_no: b.member_no, status: st, method: b.method, evidence: ev };
  };
  L['POST /api/lms/g/mark'] = b => { const s = sesOf(b.session_id); if (!s) throw W3.err('not_found'); const p = perOf(b.member_no); if (!p || !(p.secs || []).includes(s.section_id)) throw W3.err('not_enrolled'); if (p.ekind === 'audit') throw W3.err('audit');
    if (b.status === 'excused' && !b.reason) throw W3.err('need_reason'); const k = attK(s.session_id, p.person_id); const old = D().att[k];
    D().att[k] = { status: b.status, method: 'manual', evidence: { ...(old?.evidence || {}), by: S.me?.name, ref: b.evidence_ref || undefined, at: W3.ts(now()) }, reason: b.reason || old?.reason || null };
    logIt(s.session_id, p.person_id, old?.status, b.status, b.reason); return { session_id: s.session_id, member_no: b.member_no, status: b.status, method: 'manual', reason: D().att[k].reason, before: old?.status || null, logged: 1 }; };
  L['POST /api/lms/g/adjust'] = b => { const s = sesOf(b.session_id); if (!s) throw W3.err('not_found'); if (!b.reason) throw W3.err('required'); let n = 0;
    regular(s.section_id).forEach(p => { const k = attK(s.session_id, p.person_id); const cur = D().att[k]; if ((cur?.status || 'absent') !== b.from) return; D().att[k] = { ...(cur || { evidence: {} }), status: b.to, method: 'adjust', reason: b.reason }; logIt(s.session_id, p.person_id, cur?.status, b.to, b.reason); n++; });
    return { session_id: s.session_id, from: b.from, to: b.to, changed: n, logged: n }; };
  L['POST /api/lms/g/copy'] = b => { const s = sesOf(b.session_id); if (!s) throw W3.err('not_found'); const t = Date.parse(s.starts_at), e = Date.parse(s.ends_at || s.starts_at);
    const n = secSessions(s.section_id).filter(x => x.session_id !== s.session_id && x.kind !== 'holiday' && Date.parse(x.starts_at) > t && Date.parse(x.starts_at) <= e + 3 * 36e5 && new Date(Date.parse(x.starts_at) + 9 * 36e5).toISOString().slice(0, 10) === new Date(t + 9 * 36e5).toISOString().slice(0, 10)).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
    if (!n) throw W3.err('no_next'); let c = 0; regular(s.section_id).forEach(p => { const a = D().att[attK(s.session_id, p.person_id)]; const k = attK(n.session_id, p.person_id); if (a && !D().att[k]) { D().att[k] = { status: a.status, method: 'copy', evidence: { from: s.session_id }, reason: a.reason }; c++; } });
    return { source_session_id: s.session_id, target_session_id: n.session_id, week_no: n.week_no, seq: n.seq, copied: c }; };
  L['POST /api/lms/g/online'] = b => { const sec = secOf(b.section_id); if (!sec) throw W3.err('not_found'); const r = ruleOf(sec.section_id); let ns = 0, pr = 0, ab = 0, kept = 0;
    secSessions(sec.section_id).filter(x => x.kind !== 'holiday' && (x.kind === 'online' || (['hyflex', 'blended'].includes(sec.mode) && r.hyflex_online && ['class', 'live'].includes(x.kind)))).forEach(x => {
      const cts = D().contents.filter(c => c.session_id === x.session_id); if (!cts.length) return; ns++;
      regular(sec.section_id).forEach(p => { const pg = cts.map(c => D().prog[c.content_id + '|' + p.person_id] || {}); const tot = cts.reduce((a, c) => a + c.duration_sec, 0); const w = cts.reduce((a, c, i) => a + Math.min(pg[i].watched_sec || 0, c.duration_sec), 0);
        const pct = Math.round(100 * w / Math.max(tot, 1)); const done = pg.every(g => g.completed_at); const at = done ? Math.max(...pg.map(g => Date.parse(g.completed_at))) : null;
        const st = pct >= r.online_min_pct && done && (!x.open_at || at >= Date.parse(x.open_at)) && (!x.close_at || at <= Date.parse(x.close_at)) ? 'present' : x.close_at && Date.parse(x.close_at) < now() ? 'absent' : null; if (!st) return;
        const k = attK(x.session_id, p.person_id); const cur = D().att[k]; if (cur && cur.method !== 'online') { kept++; return; } D().att[k] = { status: st, method: 'online', evidence: { pct, done_at: at ? W3.ts(at) : null }, online_sec: w }; st === 'present' ? pr++ : ab++; }); });
    return { section_id: sec.section_id, sessions: ns, present: pr, absent: ab, kept_offline: kept }; };
  L['GET /api/lms/g/roster'] = b => { const sec = secOf(b.section_id); if (!sec) throw W3.err('not_found'); const ss = secSessions(sec.section_id); const n = now();
    return { section: { section_id: sec.section_id, term_id: sec.term_id, course_code: sec.course_code, section_no: sec.section_no, title: sec.title, mode: sec.mode },
      sessions: ss.map(s => ({ session_id: s.session_id, week_no: s.week_no, seq: s.seq, kind: s.kind, starts_at: s.starts_at, room: s.room, makeup_of: s.makeup_of || null })),
      students: regular(sec.section_id).sort((a, b) => a.member_no < b.member_no ? -1 : 1).map(p => { const cl = ss.map(s => ({ s, a: D().att[attK(s.session_id, p.person_id)] })); const c = st => cl.filter(x => x.a?.status === st).length;
        return { member_no: p.member_no, unit_code: p.unit_code, grade_year: p.grade_year, cells: cl.map(x => x.a?.status || null), methods: cl.map(x => x.a?.method || null),
          sum: { present: c('present'), late: c('late'), absent: c('absent'), excused: c('excused'), unrecorded: cl.filter(x => !x.a && x.s.kind !== 'holiday' && Date.parse(x.s.starts_at) <= n).length, past: cl.filter(x => x.s.kind !== 'holiday' && Date.parse(x.s.starts_at) <= n).length } }; }),
      audit_excluded: D().persons.filter(p => p.ekind === 'audit' && (p.secs || []).includes(sec.section_id)).length }; };
  L['GET /api/lms/g/export'] = b => { const R = L['GET /api/lms/g/roster'](b); const SY = { present: '○', late: '△', absent: '×', excused: '◎' };
    return { filename: `출석부_${R.section.course_code}-${R.section.section_no}_${R.section.term_id}`, title: `${R.section.title} 출석부 (${R.section.term_id})`, legend: '○ 출석 · △ 지각 · × 결석 · ◎ 공결 · 휴 휴강 · 지각 3회 = 결석 1회',
      columns: ['학번', '학과', ...R.sessions.map(s => `${s.week_no}주${s.seq}차`), '출석', '지각', '결석', '공결', '결석환산', '출석률(%)'],
      rows: R.students.map(st => { const u = st.sum; const ab = u.absent + u.unrecorded; return [st.member_no, st.unit_code || '', ...st.cells.map((c, i) => c ? SY[c] : R.sessions[i].kind === 'holiday' ? '휴' : ''), String(u.present), String(u.late), String(ab), String(u.excused), String(ab + Math.floor(u.late / 3)), String(u.past ? Math.round(100 * (u.present + u.late + u.excused) / u.past) : 100)]; }) }; };
  L['GET /api/lms/g/beacons'] = () => D().beacons.slice().sort((a, b) => a.beacon_id < b.beacon_id ? -1 : 1);
  L['POST /api/lms/g/beacon'] = b => { if (!b.beacon_id || !b.room || !['nfc', 'ble'].includes(b.kind)) throw W3.err('bad_input'); const x = D().beacons.find(y => y.beacon_id === b.beacon_id); const v = { beacon_id: b.beacon_id, kind: b.kind, room: b.room, active: b.active !== false }; if (x) Object.assign(x, v); else D().beacons.push(v); return v; };
  L['GET /api/lms/g/anomalies'] = b => { if (!secOf(b.section_id)) throw W3.err('not_found'); const d = D(); const out = {};
    const ct = id => { const c = d.contents.find(x => x.content_id === id); const s = c && sesOf(c.session_id); return c && s && s.section_id === b.section_id ? { c, s, chk: c.check_at_sec ?? c.duration_sec } : null; };
    const add = (pid, info, k, at) => { const p = d.persons.find(x => x.person_id === pid); const key = [p.member_no, info.c.title, k].join('|'); const o = out[key] = out[key] || { member_no: p.member_no, unit_code: p.unit_code, content_title: info.c.title, week_no: info.s.week_no, kind: k, n: 0, last_at: at }; o.n++; if (at > o.last_at) o.last_at = at; };
    d.events.forEach(e => { const info = ct(e.content_id); if (!info) return; const k = e.kind === 'rate' && e.rate_x100 > 100 && (e.pos || 0) < info.chk ? 'speed_before_check' : e.kind === 'seek' && e.pos - e.from_pos > 10 && e.from_pos < info.chk ? 'skip' : e.kind === 'blocked' ? 'concurrent' : null; if (k) add(e.person_id, info, k, e.at); });
    return Object.values(out).sort((a, b) => a.last_at < b.last_at ? 1 : a.last_at > b.last_at ? -1 : a.member_no < b.member_no ? -1 : 1); };
  L['GET /api/lms/g/log'] = b => D().log.filter(l => l.session_id === b.session_id).map(l => ({ member_no: D().persons.find(p => p.person_id === l.person_id)?.member_no, before: l.before, after: l.after, reason: l.reason, actor: l.actor, at: l.at }));

  /* ═════════ QR 부호기(바이트 모드 · 오류정정 L · 버전 1~6 · 마스크 0) — 외부 라이브러리 없이 canvas로 그린다 ═════════ */
  const QRV = [null, [19, 7, 1], [34, 10, 1], [55, 15, 1], [80, 20, 1], [108, 26, 1], [136, 18, 2]]; /* [데이터 코드워드, 블록당 EC, 블록 수] */
  function gmul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; }
  function rsDiv(deg) { const d = new Array(deg).fill(0); d[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { d[j] = gmul(d[j], root); if (j + 1 < deg) d[j] ^= d[j + 1]; } root = gmul(root, 2); } return d; }
  function rsRem(data, div) { const r = new Array(div.length).fill(0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gmul(c, f); }); } return r; }
  W3.qrMatrix = function (text) {
    const bytes = Array.from(new TextEncoder().encode(text)); let v = 1; while (v <= 6 && bytes.length > QRV[v][0] - 2) v++; if (v > 6) return null;
    const [dc, ec, nb] = QRV[v]; const size = 4 * v + 17;
    const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8)); put(0, Math.min(4, dc * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2)); for (let p = 0; data.length < dc; p++) data.push(p % 2 ? 0x11 : 0xEC);
    const per = dc / nb; const div = rsDiv(ec); const blocks = []; for (let i = 0; i < nb; i++) { const d = data.slice(i * per, (i + 1) * per); blocks.push({ d, e: rsRem(d, div) }); }
    const cw = []; for (let i = 0; i < per; i++) blocks.forEach(b => cw.push(b.d[i])); for (let i = 0; i < ec; i++) blocks.forEach(b => cw.push(b.e[i]));
    const M = Array.from({ length: size }, () => new Array(size).fill(false)); const F = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { if (x < 0 || y < 0 || x >= size || y >= size) return; M[y][x] = dark; F[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const dist = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, dist !== 2 && dist !== 4); }
    if (v >= 2) { const a = size - 7; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, a + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
    const fd = (1 << 3) | 0; let rem = fd; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537); const fb = ((fd << 10) | rem) ^ 0x5412; const g = i => ((fb >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i)); set(8, size - 8, true);
    let k = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j; const up = ((right + 1) & 2) === 0; const y = up ? size - 1 - vert : vert;
      if (!F[y][x] && k < cw.length * 8) { M[y][x] = ((cw[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; } } }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && (x + y) % 2 === 0) M[y][x] = !M[y][x];
    return M;
  };
  W3.drawQR = function (canvas, text) {
    const M = W3.qrMatrix(text); if (!M || !canvas) return; const n = M.length + 8; const px = Math.max(2, Math.floor(Math.min(canvas.width, canvas.height) / n));
    const c = canvas.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, canvas.width, canvas.height); c.fillStyle = '#111'; const off = Math.floor((canvas.width - px * n) / 2) + 4 * px;
    M.forEach((row, y) => row.forEach((d, x) => { if (d) c.fillRect(off + x * px, off + y * px, px, px); }));
  };

  /* ═════════ 화면 ═════════ */
  Object.assign(MENU, { lmsg: { label: '출결 관리', ws: 'learn', only: 'univ' } });
  if (PRESET.univ_lms && !PRESET.univ_lms.on.includes('lmsg')) { PRESET.univ_lms.on.splice(Math.max(0, PRESET.univ_lms.on.indexOf('attend') + 1), 0, 'lmsg'); PRESET.univ_lms.off = PRESET.univ_lms.off.filter(x => x !== 'lmsg'); }
  Object.keys(PRESET).filter(k => k !== 'univ_lms').forEach(k => { if (!PRESET[k].on.includes('lmsg') && !PRESET[k].off.includes('lmsg')) PRESET[k].off.push('lmsg'); });
  const ST = { present: ['출석', 'g', '○'], late: ['지각', 'y', '△'], absent: ['결석', 'r', '×'], excused: ['공결', 'b', '◎'] };
  const MTH = { code: '인증번호', qr: 'QR', nfc: 'NFC', ble: '비콘(BLE)', photo: '사진', online: '온라인', manual: '수동', copy: '연강 복사', adjust: '장애 조정', bio: '생체', otp: 'OTP', sms: 'SMS', email: '이메일', kakao: '카카오', live: '화상', sis: '학사' };
  const KN = { speed_before_check: '진도 체크 전 배속', skip: '건너뛰기', concurrent: '다중 접속 · 동시 재생' };
  let qrTimer = 0;
  const stopQR = () => { if (qrTimer) { clearInterval(qrTimer); qrTimer = 0; } };

  VIEWS.lmsg = () => {
    W3.css('w3'); if (window.EFH) EFH.css(); if (!ULMS_()) return '<div class="empty">대학(학사 LMS) 에디션에서 쓰는 화면입니다.</div>';
    const sec = W3.section(); if (sec === undefined) return W3.loading; if (sec.__err) return `<div class="empty">${esc(sec.__err)}</div>`;
    const t = UI.w3gT || 'board'; if (t !== 'live') stopQR();
    const T4 = window.EFH ? EFH.tabs4 : (k, a, c, m) => tabs(k, [...a, ...(m || [])], c);
    const top = head('출결 관리', `${esc(sec.title)} · ${esc(sec.term_id)} · 수업 방식 ${esc({ hyflex: '하이플렉스', blended: '블렌디드', online: '온라인', offline: '대면' }[sec.mode] || sec.mode)}`, `${W3.secPick()} ${W3.mode()}`)
      + T4('w3gT', [['board', '출석부'], ['live', '출석 진행(인증번호 · QR)'], ['anom', '비정상 학습행동']], t, [['check', '학생 출석 화면(미리보기)'], ['rule', '출석 규칙 · 장비']]);
    const body = { board: gBoard, live: gLive, check: gCheck, rule: gRule, anom: gAnom }[t](sec);
    return top + body;
  };

  /* u2: 출석부 = 지금 할 일 + 분반 목록 + 차시 고르기 → 고른 차시의 출석부만. 학기 전체 표는 「⋯ › 학기 전체 출석부」 */
  const kd = t => new Date(Date.parse(t) + 9 * 36e5).toISOString().slice(0, 10);
  function sesCount(R, i) { const c = { present: 0, late: 0, absent: 0, excused: 0, none: 0 }; R.students.forEach(st => { const v = st.cells[i]; c[v || 'none']++; }); return c; }
  function gBoard(sec) {
    const R = W3.get('roster:' + sec.section_id, 'GET', '/api/lms/g/roster', { section_id: sec.section_id }); if (R === undefined) return W3.loading; if (R.__err) return `<div class="empty">${esc(R.__err)}</div>`;
    const ss = R.sessions; const past = ss.map((s, i) => ({ s, i })).filter(x => x.s.kind !== 'holiday' && Date.parse(x.s.starts_at) <= Date.now());
    const cur = UI.w3gS && ss.find(s => s.session_id === UI.w3gS) ? UI.w3gS : ((past[past.length - 1] || {}).s || ss[0] || {}).session_id; UI.w3gS = cur;
    const tot = R.students.reduce((a, s) => { const u = s.sum; a.p += u.present + u.late + u.excused; a.past += u.past; a.risk += u.past && (u.absent + u.unrecorded + Math.floor(u.late / 3)) >= Math.ceil(u.past / 4) ? 1 : 0; return a; }, { p: 0, past: 0, risk: 0 });
    const today = kd(new Date().toISOString()); const tod = ss.filter(s => s.kind !== 'holiday' && kd(s.starts_at) === today);
    const last = past[past.length - 1]; const sus = last ? R.students.filter(st => !st.cells[last.i] || st.cells[last.i] === 'absent') : [];
    UI.w3gSus = { session_id: last ? last.s.session_id : null, label: last ? `${last.s.week_no}주 ${last.s.seq}차` : '', list: sus.map(x => x.member_no) };
    const todoH = (tod.length ? `오늘 수업 <b>${tod.length}개</b>` : last ? `최근 수업 <b>${last.s.week_no}주 ${last.s.seq}차</b>(${esc(W3.fmt(last.s.starts_at))})` : '아직 지난 수업이 없습니다') + (last ? ` · 결석 의심 <b>${sus.length}명</b>` : '') + (tot.risk ? ` · 결석 1/4 이상 ${tot.risk}명` : '');
    const todoC = window.EFH ? EFH.todo(todoH, sus.length ? `<button class="btn sm pri" data-act="w3g-notify">결석 알림 보내기</button>` : '') : '';
    const head2 = `<div class="kpis">${kpi('수강생', R.students.length + '명', `청강생 ${R.audit_excluded}명 출석 대상 제외`)}${kpi('평균 출석률', (tot.past ? Math.round(100 * tot.p / tot.past) : 100) + '%', '출석 · 지각 · 공결 인정')}${kpi('결석 1/4 이상', tot.risk + '명', '학칙상 F 처리 주의', tot.risk ? 'warn' : '')}${kpi('차시', ss.length + '개', `휴강 ${ss.filter(s => s.kind === 'holiday').length} · 보강 ${ss.filter(s => s.makeup_of).length}`)}</div>`;
    const dots = window.EFH ? EFH.dots : () => ''; const mi = window.EFH ? EFH.mi : () => '';
    /* 분반 목록(학기 기준) */
    const SL = (W3.cache.sections || [sec]).slice(0, 12); /* 분반이 많으면 앞 12개만(나머지는 위 분반 선택으로) */
    const secRows = SL.map(s => { const Q = s.section_id === sec.section_id ? R : W3.get('roster:' + s.section_id, 'GET', '/api/lms/g/roster', { section_id: s.section_id }); const ok = Q && !Q.__err;
      const t2 = ok ? Q.students.reduce((a, x) => { const u = x.sum; a.p += u.present + u.late + u.excused; a.past += u.past; a.risk += u.past && (u.absent + u.unrecorded + Math.floor(u.late / 3)) >= Math.ceil(u.past / 4) ? 1 : 0; return a; }, { p: 0, past: 0, risk: 0 }) : null;
      return [`<b>${esc(s.title)}</b>`, ok ? Q.students.length + '명' : '…', t2 ? (t2.past ? Math.round(100 * t2.p / t2.past) : 100) + '%' : '…', t2 ? (t2.risk ? tag(t2.risk + '명', 'r') : '0') : '…', s.section_id === sec.section_id ? tag('보는 중', 'g') : `<button class="btn sm" data-act="w3g-secgo" data-v="${esc(s.section_id)}">열기</button>`]; });
    const secCard = `<div class="card"><div class="ch"><b>분반별 출석</b><small>${esc(sec.term_id)} 학기</small><span class="efh-acts">${dots([mi('w3g-online', '온라인 출석 반영(진도율 · 주차 기간)'), mi('w3g-csv', '학교 양식 엑셀(CSV) 내려받기'), mi('w3g-print', '출석부 인쇄'), mi('w3g-full', UI.w3gFull ? '학기 전체 출석부 닫기' : '학기 전체 출석부 보기')], '분반 출석 다른 작업')}</span></div>${table(['분반', '수강생', '평균 출석률', '결석 1/4 이상', ''], secRows)}</div>`;
    /* 차시 고르기 */
    const recent = past.slice(-4).reverse();
    const sel = `<select data-chg="w3g-ses" aria-label="차시 선택"><option value="">다른 차시 고르기 (${ss.length}개)</option>${ss.map(s => `<option value="${esc(s.session_id)}">${s.week_no}주 ${s.seq}차 · ${W3.fmt(s.starts_at)}${s.kind === 'holiday' ? ' (휴강)' : ''}${s.makeup_of ? ' (보강)' : ''}</option>`).join('')}</select>`;
    const pickCard = `<div class="card"><div class="ch"><b>통합 출석부 — 차시를 고르세요</b><small>대면 · 온라인 출석이 한 표에 모입니다</small><span class="efh-acts">${sel}</span></div>
      ${table(['차시', '출석', '결석 · 미기록', ''], recent.map(({ s, i }) => { const c = sesCount(R, i); return [`<b>${s.week_no}주 ${s.seq}차</b><small class="efh-sub2">${esc(W3.fmt(s.starts_at))} · ${esc(s.room || '')}${s.makeup_of ? ' · 보강' : ''}</small>`, `${c.present + c.late + c.excused}명${c.late ? ` <small>(지각 ${c.late})</small>` : ''}`, c.absent + c.none ? tag((c.absent + c.none) + '명', 'r') : '0', `<button class="btn sm" data-act="w3g-open" data-v="${esc(s.session_id)}">${UI.w3gOpen && cur === s.session_id ? '보는 중' : '출석부 열기'}</button>`]; }), '지난 차시가 없습니다. 「다른 차시 고르기」에서 고르세요.')}</div>`;
    /* 고른 차시의 출석부 */
    let one = '';
    if (UI.w3gOpen) { const i = ss.findIndex(s => s.session_id === cur); const s = ss[i];
      if (s) one = `<div class="card"><div class="ch"><b>${s.week_no}주 ${s.seq}차 출석부</b><small>${esc(W3.fmt(s.starts_at))} · ${esc(s.room || '')}${s.kind === 'holiday' ? ' · 휴강' : ''} · 상태를 누르면 출석 · 지각 · 결석 · 공결로 바꿉니다</small><span class="efh-acts"><button class="btn sm" data-act="w3g-close">닫기</button>${dots([mi('w3g-adjust', '장애 시 일괄 조정'), mi('w3g-copy', '연강 차시로 복사'), mi('w3g-holiday', '휴강 지정'), mi('w3g-makeup', '보강 차시 만들기'), mi('w3g-log', '변경 이력')], '이 차시 다른 작업')}</span></div>
        <div class="tw nomcard"><table class="w3-one"><thead><tr><th>학번</th><th>상태</th><th>방식</th><th>누적 출석률</th></tr></thead><tbody>${R.students.map(st => { const u = st.sum; const rate = u.past ? Math.round(100 * (u.present + u.late + u.excused) / u.past) : 100; const c = st.cells[i], m = st.methods[i];
          return `<tr><td><b>${esc(st.member_no)}</b><small class="efh-sub2">${esc(st.unit_code || '')}</small></td><td><button class="w3-c w3-c2 ${c ? 'st-' + c : s.kind === 'holiday' ? 'st-h' : ''}" data-act="w3g-cell" data-s="${esc(s.session_id)}" data-m="${esc(st.member_no)}">${c ? ST[c][0] : s.kind === 'holiday' ? '휴강' : '미기록'}</button></td><td><small>${c ? esc(MTH[m] || m || '') : ''}</small></td><td>${tag(rate + '%', rate < 75 ? 'r' : rate < 90 ? 'y' : 'g')}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="mini">오프라인 · 수동 기록이 있으면 온라인 반영보다 우선합니다. 학사 출석 전송은 학사 연동 후 동작합니다.</p></div>`; }
    return todoC + head2 + secCard + pickCard + one + (UI.w3gFull ? gFull(R, cur) : '');
  }
  /* 학기 전체 출석부(예전 표 — ⋯ 메뉴에서 열기) */
  function gFull(R, cur) { const ss = R.sessions;
    const cell = (st, m, s, mno) => `<button class="w3-c ${st ? 'st-' + st : s.kind === 'holiday' ? 'st-h' : ''}" data-act="w3g-cell" data-s="${esc(s.session_id)}" data-m="${esc(mno)}" title="${s.week_no}주 ${s.seq}차 · ${st ? ST[st][0] + ' · ' + (MTH[m] || m) : s.kind === 'holiday' ? '휴강' : '미기록'}">${st ? ST[st][2] : s.kind === 'holiday' ? '휴' : '·'}</button>`;
    return `<div class="card"><div class="ch"><b>학기 전체 출석부</b><small>○ 출석 · △ 지각 · × 결석 · ◎ 공결 · 휴 휴강 · 지각 3회 = 결석 1회</small><span class="efh-acts"><button class="btn sm" data-act="w3g-full">닫기</button></span></div><div class="tw w3-grid nomcard"><table><thead><tr><th class="stick">학번</th><th>학과</th>${ss.map(s => `<th class="${s.session_id === cur ? 'on' : ''}">${s.week_no}-${s.seq}</th>`).join('')}<th>출석률</th></tr></thead><tbody>
      ${R.students.map(st => { const u = st.sum; const rate = u.past ? Math.round(100 * (u.present + u.late + u.excused) / u.past) : 100; return `<tr><td class="stick"><b>${esc(st.member_no)}</b></td><td>${esc(st.unit_code || '')}</td>${st.cells.map((c, i) => `<td>${cell(c, st.methods[i], ss[i], st.member_no)}</td>`).join('')}<td>${tag(rate + '%', rate < 75 ? 'r' : rate < 90 ? 'y' : 'g')}</td></tr>`; }).join('')}</tbody></table></div></div>`; }
  ACT['w3g-ses'] = el => { if (!el.value) return; UI.w3gS = el.value; UI.w3gOpen = 1; render(); };
  ACT['w3g-open'] = el => { UI.w3gS = el.dataset.v; UI.w3gOpen = 1; render(); };
  ACT['w3g-close'] = () => { UI.w3gOpen = 0; render(); };
  ACT['w3g-full'] = () => { UI.w3gFull = !UI.w3gFull; render(); };
  ACT['w3g-secgo'] = el => { UI.w3sec = el.dataset.v; UI.w3gOpen = 0; W3.drop('roster:'); render(); };
  ACT['w3g-notify'] = () => { const T = UI.w3gSus || { list: [] }; if (!T.list.length) return toast('결석 의심 학생이 없습니다.');
    const msg = `[${T.label} 출결 안내] 출석이 확인되지 않았습니다. 사유가 있으면 증빙과 함께 교수자에게 알려 주세요. 결석이 수업의 1/4을 넘으면 학점 취득이 어려울 수 있습니다.`;
    modal(`결석 알림 — ${T.label} · ${T.list.length}명`, `<p class="mini">받는 학생(학번): ${esc(T.list.join(', '))}</p><label class="fl">알림 내용<textarea name="tx" rows="4" maxlength="500">${esc(msg)}</textarea></label><p class="mini">${W3.live() ? '실제 발송은 문자 · 앱 알림 연동 후 동작합니다. 지금은 학번 목록을 복사해 「메시지」에서 보낼 수 있습니다.' : '데모: 보낼 목록은 이 브라우저에만 저장합니다. 실제 발송은 문자 · 앱 알림 연동 후 동작합니다.'}</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: W3.live() ? '학번 목록 복사' : '알림 보내기', kind: 'pri', run: w => {
        if (W3.live()) { try { navigator.clipboard.writeText(T.list.join('\n')); toast(`학번 ${T.list.length}개를 복사했습니다.`, 'ok'); } catch (e) { toast('복사하지 못했습니다.', 'warn'); } return; }
        const d = D(); d.notices = d.notices || []; d.notices.unshift({ at: W3.ts(now()), session_id: T.session_id, targets: T.list.slice(), body: fv(w, 'tx') }); save(); toast(`${T.list.length}명에게 보낼 결석 알림을 대기열에 넣었습니다(연동 후 발송).`, 'ok'); } }]); };
  const reload = () => { W3.drop('roster:'); W3.drop('anom:'); W3.drop('sessions:'); render(); };
  ACT['w3g-cell'] = el => {
    const sid = el.dataset.s, mno = el.dataset.m;
    modal(`출결 변경 — ${mno}`, `<label class="fl">상태<select name="st">${Object.entries(ST).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></label><label class="fl">사유(공결은 필수)<input name="rs" maxlength="300" placeholder="예: 병결(진단서), 공가(대회 참가)"></label><label class="fl">증빙 파일 키<input name="ev" maxlength="200" placeholder="예: file:진단서-001 (파일 보관은 자료실 연동)"></label>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { W3.act(() => W3.call('POST', '/api/lms/g/mark', { session_id: sid, member_no: mno, status: fv(w, 'st'), reason: fv(w, 'rs') || undefined, evidence_ref: fv(w, 'ev') || undefined }), '출결을 변경했습니다.').then(reload); } }]);
  };
  ACT['w3g-online'] = () => W3.act(() => W3.call('POST', '/api/lms/g/online', { section_id: UI.w3sec }), r => `온라인 출석 반영: 차시 ${r.sessions}개 · 출석 ${r.present} · 결석 ${r.absent} · 오프라인 우선 ${r.kept_offline}`).then(reload);
  ACT['w3g-adjust'] = () => modal('장애 시 일괄 조정', `<p class="mini">출석 인증 장애 · 정전 등으로 출석하지 못한 학생을 한 번에 바꿉니다. 바뀐 내역은 변경 이력에 남습니다.</p><div class="form2"><label>대상<select name="f"><option value="absent">결석 · 미기록</option><option value="late">지각</option></select></label><label>변경<select name="t"><option value="present">출석</option><option value="late">지각</option><option value="excused">공결</option></select></label></div><label class="fl">사유(필수)<input name="r" maxlength="300" placeholder="예: 인증 서버 장애(10:02~10:10)"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '조정', kind: 'pri', run: w => { if (!fv(w, 'r')) { toast('사유를 입력하세요.', 'warn'); return false; } W3.act(() => W3.call('POST', '/api/lms/g/adjust', { session_id: UI.w3gS, from: fv(w, 'f'), to: fv(w, 't'), reason: fv(w, 'r') }), r => `${r.changed}명을 조정했습니다.`).then(reload); } }]);
  ACT['w3g-copy'] = () => W3.act(() => W3.call('POST', '/api/lms/g/copy', { session_id: UI.w3gS }), r => `${r.week_no}주 ${r.seq}차로 ${r.copied}명 복사했습니다.`).then(reload);
  ACT['w3g-holiday'] = () => modal('휴강 지정', `<label class="fl">휴강 사유<input name="n" maxlength="200" placeholder="예: 개교기념일"></label><p class="mini">학생 푸시 알림은 문자 · 앱 연동 후 동작합니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '지정', kind: 'pri', run: w => { W3.act(() => W3.call('POST', '/api/lms/g/session', { session_id: UI.w3gS, kind: 'holiday', note: fv(w, 'n') || '휴강' }), '휴강으로 지정했습니다.').then(reload); } }]);
  ACT['w3g-makeup'] = () => modal('보강 차시 만들기', `<label class="fl">보강 일시<input type="datetime-local" name="t"></label><label class="fl">강의실<input name="r" maxlength="60" placeholder="비우면 원래 강의실"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const t = fv(w, 't'); if (!t) { toast('일시를 고르세요.', 'warn'); return false; } W3.act(() => W3.call('POST', '/api/lms/g/makeup', { session_id: UI.w3gS, starts_at: new Date(t).toISOString(), room: fv(w, 'r') || undefined }), r => `${r.week_no}주 ${r.seq}차 보강을 만들었습니다.`).then(reload); } }]);
  ACT['w3g-log'] = () => W3.act(() => W3.call('GET', '/api/lms/g/log', { session_id: UI.w3gS })).then(L2 => L2 && modal('출결 변경 이력', table(['학번', '이전', '변경', '사유', '처리자', '시각'], L2.map(l => [esc(l.member_no), esc(ST[l.before]?.[0] || '미기록'), esc(ST[l.after]?.[0] || l.after), esc(l.reason || ''), esc(l.actor || ''), esc(W3.fmt(l.at))]), '변경 이력이 없습니다.'), [], true));
  async function exp() { return W3.call('GET', '/api/lms/g/export', { section_id: UI.w3sec }); }
  ACT['w3g-csv'] = () => W3.act(exp).then(x => x && downloadCSV(x.filename + '.csv', x.columns, x.rows));
  ACT['w3g-print'] = () => W3.act(exp).then(x => { if (!x) return; const w = window.open('', '_blank'); if (!w) { toast('팝업이 막혀 있습니다.', 'warn'); return; }
    w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(x.filename)}</title><style>body{font:12px sans-serif;margin:16px}table{border-collapse:collapse}td,th{border:1px solid #888;padding:2px 4px;text-align:center}h1{font-size:16px}@page{size:A4 landscape}</style><h1>${esc(x.title)}</h1><p>${esc(x.legend)}</p><table><tr>${x.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${x.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table><p>교수 확인: ____________ (인)</p>`); w.document.close(); w.focus(); try { w.print(); } catch (e) { } });

  function gSessions(sec) { return W3.get('sessions:' + sec.section_id, 'GET', '/api/lms/g/sessions', { section_id: sec.section_id }); }
  function sesSel(ss, key, act) { const cur = UI[key] && ss.find(s => s.session_id === UI[key]) ? UI[key] : (ss.filter(s => s.kind !== 'holiday' && Date.parse(s.starts_at) <= Date.now() + 36e5).pop() || ss[0] || {}).session_id; UI[key] = cur;
    return `<select data-chg="${act}" aria-label="차시">${ss.map(s => `<option value="${esc(s.session_id)}" ${s.session_id === cur ? 'selected' : ''}>${s.week_no}주 ${s.seq}차 · ${W3.fmt(s.starts_at)}${s.kind === 'holiday' ? ' (휴강)' : ''}</option>`).join('')}</select>`; }
  ACT['w3g-lses'] = el => { UI.w3gL = el.value; UI.w3gCode = null; stopQR(); render(); };

  function gLive(sec) {
    const ss = gSessions(sec); if (ss === undefined) return W3.loading; if (ss.__err) return `<div class="empty">${esc(ss.__err)}</div>`;
    const sel = sesSel(ss, 'w3gL', 'w3g-lses'); const s = ss.find(x => x.session_id === UI.w3gL) || {}; const C = UI.w3gCode && UI.w3gCode.session_id === s.session_id ? UI.w3gCode : null;
    const left = C ? Math.max(0, Math.round((Date.parse(C.expires_at) - Date.now()) / 1000)) : 0;
    setTimeout(() => { const cv = document.getElementById('w3qr'); if (cv && C && C.qr) W3.drawQR(cv, C.qr); if (C && !qrTimer) qrTimer = setInterval(tickQR, 1000); }, 0);
    return `<div class="card"><div class="ch"><b>출석 진행</b>${sel}</div>
      <p class="mini">차시 시작 ${esc(W3.fmt(s.starts_at))} · 강의실 ${esc(s.room || '미지정')} · 시작 10분 전부터 출석 가능, 지각 · 결석 기준은 「규칙 · 장비」에서 정합니다.</p>
      <div class="form2"><label>인증번호 유효시간(초)<input type="number" id="w3ttl" min="30" max="900" value="${UI.w3ttl || 180}"></label><label>QR 바뀌는 주기(초)<input type="number" id="w3rot" min="10" max="60" value="${UI.w3rot || 15}"></label></div>
      <button class="btn pri" data-act="w3g-issue">${C ? '다시 발급' : '인증번호 · QR 발급'}</button>
      ${C ? `<div class="w3-live"><div class="w3-code" aria-live="polite"><small>인증번호</small><b id="w3code">${left ? esc(C.code) : '만료'}</b><small id="w3left">${left ? `남은 시간 ${left}초` : '다시 발급하세요'}</small></div>
        <div class="w3-qrbox"><canvas id="w3qr" width="232" height="232" aria-label="회전 QR"></canvas><small id="w3qrt">QR은 ${C.rotate_sec}초마다 바뀝니다(캡처 공유 방지)</small></div></div>` : ''}
      <p class="mini">인증번호는 서버가 난수로 만들고 해시만 저장합니다. 한 학생은 차시마다 한 번만 출석할 수 있습니다.</p></div>`;
  }
  ACT['w3g-issue'] = () => { const ttl = +($('#w3ttl')?.value || 180), rot = +($('#w3rot')?.value || 15); UI.w3ttl = ttl; UI.w3rot = rot; stopQR();
    W3.act(() => W3.call('POST', '/api/lms/g/code', { session_id: UI.w3gL, ttl_sec: ttl, rotate_sec: rot }), '발급했습니다.').then(r => { if (r) { UI.w3gCode = r; render(); } }); };
  async function tickQR() {
    const C = UI.w3gCode; const el = document.getElementById('w3left'); if (!C || !el) { stopQR(); return; }
    const left = Math.max(0, Math.round((Date.parse(C.expires_at) - Date.now()) / 1000)); el.textContent = left ? `남은 시간 ${left}초` : '다시 발급하세요'; if (!left) { $('#w3code').textContent = '만료'; stopQR(); return; }
    const slot = Math.floor(Date.now() / 1000 / C.rotate_sec); if (slot === C.slot) return; C.slot = slot;
    try { const q = await W3.call('GET', '/api/lms/g/qr', { session_id: C.session_id }); C.qr = q.qr; W3.drawQR(document.getElementById('w3qr'), q.qr); } catch (e) { }
  }

  function gCheck(sec) {
    const ss = gSessions(sec); if (ss === undefined) return W3.loading; if (ss.__err) return `<div class="empty">${esc(ss.__err)}</div>`;
    const R = W3.get('rule:' + sec.section_id, 'GET', '/api/lms/g/rule', { section_id: sec.section_id }); if (R === undefined) return W3.loading;
    const sel = sesSel(ss, 'w3gL', 'w3g-lses'); const m = UI.w3gM || 'code'; const r = UI.w3gR;
    const ms = [['code', '인증번호'], ['qr', 'QR'], ['nfc', 'NFC'], ['ble', '비콘(BLE)'], ['photo', '사진']].filter(([k]) => !R.methods || R.methods.includes(k));
    const nfcOk = 'NDEFReader' in window;
    const extra = { code: `<label class="fl">인증번호 6자리<input id="w3in" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>`,
      qr: `<label class="fl">QR 내용(앱 카메라로 스캔)<input id="w3in" maxlength="200" placeholder="DDATT1.…"></label><button class="btn sm" data-act="w3g-scan">${W3.live() ? '화면의 QR 붙여넣기' : '데모: 진행 화면 QR 스캔'}</button>`,
      nfc: `<label class="fl">NFC 태그 ID<input id="w3in" maxlength="64" placeholder="NFC-ENG301"></label><button class="btn sm" data-act="w3g-nfc">${nfcOk ? 'NFC 태그 읽기(Web NFC)' : 'NFC 읽기 — 앱 연동 후 동작'}</button>`,
      ble: `<label class="fl">비콘 ID<input id="w3in" maxlength="64" placeholder="BLE-ENG301"></label><button class="btn sm" data-act="w3g-ble">${window.DidisamApp?.scanBeacon ? '비콘 찾기(앱)' : '비콘 찾기 — 앱 · 비콘 장비 연동 후 동작'}</button>`,
      photo: `<label class="fl">사진 촬영<input type="file" id="w3ph" accept="image/*" capture="user"></label><div class="form2"><label>위도<input id="w3lat" inputmode="decimal" placeholder="35.1760"></label><label>경도<input id="w3lng" inputmode="decimal" placeholder="126.9095"></label></div><p class="mini">사진 원본 · 얼굴 정보는 저장하지 않고 촬영 일시와 위치만 저장합니다. 기기 위치 자동 입력은 앱 연동 후 동작합니다.</p>` }[m];
    return `<div class="card w3-kiosk"><div class="ch"><b>학생 출석</b>${sel}</div><p class="mini">학생 앱 · 모바일 웹에서 보이는 출석 화면입니다. 학습자 포털 로그인과 묶는 것은 SSO 연동 후 동작하며, 여기서는 학번으로 확인합니다.</p>
      <label class="fl">학번<input id="w3mno" maxlength="20" value="${esc(UI.w3gMno || '20269001')}"></label>
      <div class="seg2" role="tablist">${ms.map(([k, l]) => `<button role="tab" aria-selected="${k === m}" class="${k === m ? 'on' : ''}" data-act="w3g-m" data-v="${k}">${l}</button>`).join('')}</div>
      ${extra || ''}
      ${R.require_identity ? `<label class="ul-ck"><input type="checkbox" id="w3idv"> 본인 재인증 완료(SSO 재인증 호출 — 연동 후 동작, 데모는 확인 표시)</label>` : ''}
      <button class="btn pri" data-act="w3g-go">출석하기</button>
      ${r ? `<div class="w3-res ${r.ok ? 'ok' : 'bad'}" role="status">${r.ok ? `${esc(ST[r.status][0])} 처리되었습니다 · ${esc(MTH[r.method])} · ${esc(W3.fmt(r.evidence.at))}` : esc(r.msg)}</div>` : ''}</div>`;
  }
  ACT['w3g-m'] = el => { UI.w3gM = el.dataset.v; UI.w3gR = null; render(); };
  ACT['w3g-scan'] = async () => { const c = UI.w3gCode; if (!W3.live() && c) { try { const q = await W3.call('GET', '/api/lms/g/qr', { session_id: c.session_id }); $('#w3in').value = q.qr; } catch (e) { toast(e.message, 'warn'); } } else if (navigator.clipboard?.readText) { try { $('#w3in').value = await navigator.clipboard.readText(); } catch (e) { toast('카메라 스캔은 앱 연동 후 동작합니다.', 'warn'); } } else toast('먼저 「출석 진행」에서 발급하세요.', 'warn'); };
  ACT['w3g-nfc'] = async () => { if (!('NDEFReader' in window)) { toast('이 기기 · 브라우저는 Web NFC를 지원하지 않습니다(앱 연동 후 동작).', 'warn'); return; } try { const r = new NDEFReader(); await r.scan(); r.onreading = e => { $('#w3in').value = e.serialNumber || ''; toast('태그를 읽었습니다.', 'ok'); }; } catch (e) { toast('NFC 권한이 필요합니다.', 'warn'); } };
  ACT['w3g-ble'] = async () => { if (window.DidisamApp?.scanBeacon) { try { $('#w3in').value = await window.DidisamApp.scanBeacon(); } catch (e) { toast('비콘을 찾지 못했습니다.', 'warn'); } } else toast('비콘 탐색은 학교 비콘 장비 · 앱 연동 후 동작합니다. 비콘 ID를 직접 입력해 보세요.', 'warn'); };
  ACT['w3g-go'] = async () => {
    const m = UI.w3gM || 'code'; const mno = ($('#w3mno')?.value || '').trim(); UI.w3gMno = mno; const v = ($('#w3in')?.value || '').trim();
    const b = { session_id: UI.w3gL, member_no: mno, method: m };
    if (m === 'code') b.code = v; if (m === 'qr') b.qr = v; if (m === 'nfc' || m === 'ble') b.tag_id = v;
    if (m === 'photo') { const la = $('#w3lat')?.value.trim(), lo = $('#w3lng')?.value.trim(); if (la) b.lat = +la; if (lo) b.lng = +lo; const f = $('#w3ph')?.files?.[0]; b.taken_at = new Date(f && f.lastModified ? f.lastModified : Date.now()).toISOString(); }
    if ($('#w3idv')?.checked) b.idv = 'sso-reauth-pending';
    try { const r = await W3.call('POST', '/api/lms/g/checkin', b); UI.w3gR = { ok: 1, ...r }; W3.drop('roster:'); } catch (e) { UI.w3gR = { ok: 0, msg: e.message }; }
    render();
  };

  function gRule(sec) {
    const R = W3.get('rule:' + sec.section_id, 'GET', '/api/lms/g/rule', { section_id: sec.section_id }); const B = W3.get('beacons', 'GET', '/api/lms/g/beacons'); if (R === undefined || B === undefined) return W3.loading;
    if (R.__err) return `<div class="empty">${esc(R.__err)}</div>`;
    const ck = (k, l) => `<label class="ul-ck"><input type="checkbox" name="m_${k}" ${R.methods.includes(k) ? 'checked' : ''}> ${esc(l)}</label>`;
    const bk = (k, l) => `<label class="ul-ck"><input type="checkbox" name="${k}" ${R[k] ? 'checked' : ''}> ${esc(l)}</label>`;
    return `<div class="card" id="w3rule"><div class="ch"><b>분반 출석 규칙</b><small>SFR-010 · 016 · 068</small></div><div class="ul-cols"><div><p class="mini"><b>허용 방식</b></p>${ck('code', '인증번호')}${ck('qr', '회전 QR')}${ck('nfc', 'NFC 태그')}${ck('ble', 'BLE 비콘')}${ck('photo', '사진(위치 · 일시)')}${ck('online', '온라인(진도율)')}${ck('manual', '교수 수동')}</div>
      <div><div class="form2"><label>지각 기준(분)<input type="number" name="late" min="0" max="120" value="${R.late_after_min}"></label><label>출석 마감(분)<input type="number" name="abs" min="0" max="240" value="${R.absent_after_min}"></label><label>온라인 인정 진도율(%)<input type="number" name="pct" min="10" max="100" value="${R.online_min_pct}"></label></div>
      ${bk('require_identity', '출석 전 본인 재인증(SSO 재인증 — 연동 후 동작)')}${bk('block_concurrent', '여러 기기 · 창 동시 재생 차단')}${bk('hyflex_online', '하이플렉스: 대면 차시도 온라인 진도 기준 충족 시 출석 인정')}</div></div>
      <button class="btn pri" data-act="w3g-rule">규칙 저장</button></div>
      <div class="card"><div class="ch"><b>NFC 태그 · BLE 비콘 → 강의실</b><small>장비 설치 · 신호 수신은 학교 비콘 장비 연동 후 동작</small></div>
      ${table(['ID', '종류', '강의실', '상태'], B.map(b => [esc(b.beacon_id), esc(b.kind.toUpperCase()), esc(b.room), b.active ? tag('사용', 'g') : tag('중지')]), '등록된 장비가 없습니다.')}
      <div class="form2"><label>ID<input id="w3bid" maxlength="64" placeholder="BLE-HUM101"></label><label>종류<select id="w3bk"><option value="nfc">NFC</option><option value="ble">BLE</option></select></label><label>강의실<input id="w3brm" maxlength="60" placeholder="인문관 101"></label></div>
      <button class="btn sm" data-act="w3g-beacon">장비 등록</button></div>`;
  }
  ACT['w3g-rule'] = () => { const w = $('#w3rule'); const methods = ['code', 'qr', 'nfc', 'ble', 'photo', 'online', 'manual'].filter(k => w.querySelector(`[name=m_${k}]`).checked);
    W3.act(() => W3.call('POST', '/api/lms/g/rule', { section_id: UI.w3sec, methods, late_after_min: +fv(w, 'late'), absent_after_min: +fv(w, 'abs'), online_min_pct: +fv(w, 'pct'), require_identity: fv(w, 'require_identity'), block_concurrent: fv(w, 'block_concurrent'), hyflex_online: fv(w, 'hyflex_online') }), '규칙을 저장했습니다.').then(r => { if (r) { W3.cache['rule:' + UI.w3sec] = r; render(); } }); };
  ACT['w3g-beacon'] = () => W3.act(() => W3.call('POST', '/api/lms/g/beacon', { beacon_id: $('#w3bid').value.trim(), kind: $('#w3bk').value, room: $('#w3brm').value.trim() }), '등록했습니다.').then(r => { if (r) { W3.drop('beacons'); render(); } });

  function gAnom(sec) {
    const A = W3.get('anom:' + sec.section_id, 'GET', '/api/lms/g/anomalies', { section_id: sec.section_id }); if (A === undefined) return W3.loading; if (A.__err) return `<div class="empty">${esc(A.__err)}</div>`;
    const c = k => A.filter(a => a.kind === k).reduce((n, a) => n + a.n, 0);
    return `<div class="kpis">${kpi('진도 체크 전 배속', c('speed_before_check') + '건')}${kpi('건너뛰기', c('skip') + '건')}${kpi('다중 접속 · 동시 재생', c('concurrent') + '건', '', c('concurrent') ? 'warn' : '')}</div>
      <div class="card"><div class="ch"><b>비정상 학습행동</b><small>재생 로그(동영상 · 진도) 기준 · 출석 인정 전 교수 확인용</small><button class="btn sm" data-act="w3g-anom-csv">CSV</button></div>
      ${table(['학번', '학과', '주차', '콘텐츠', '유형', '횟수', '최근'], A.map(a => [esc(a.member_no), esc(a.unit_code || ''), a.week_no + '주', esc(a.content_title), tag(KN[a.kind] || a.kind, a.kind === 'concurrent' ? 'r' : 'y'), a.n, esc(W3.fmt(a.last_at))]), '감지된 비정상 학습행동이 없습니다.')}</div>`;
  }
  ACT['w3g-anom-csv'] = () => { const A = W3.cache['anom:' + UI.w3sec] || []; downloadCSV(`비정상학습행동_${today()}.csv`, ['학번', '학과', '주차', '콘텐츠', '유형', '횟수', '최근'], A.map(a => [a.member_no, a.unit_code || '', a.week_no, a.content_title, KN[a.kind] || a.kind, a.n, a.last_at])); };
})();
