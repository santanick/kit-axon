/* v30 학사 LMS 묶음 L — 통합 달력(학사 · 강좌 · 개인, iCal 내보내기, 미이수 D-1 알림, To-do) · DM 채팅(읽음 · 그룹 · 첨부 · 일괄 발송 · 번역) · 개인화 알림 규칙 · 방해금지
   운영(서버) 모드: /api/lms/l/... (업무 규칙은 서버 SQL lms_l). 데모 모드: S.lms.l 상태 + 시드.
   연동 지점: 푸시 · 알림톡 · SMS · 메일 실발송은 발송 대기열(lms_noti_outbox)까지만 — 화면 문구 「연동 후 발송」. Google Calendar 동기화는 iCal 구독 주소로 대체. */
(function () {
  'use strict';
  /* ── 묶음 L · M · P 공용 도우미(LMP) ── */
  const LMP = window.LMP = window.LMP || {};
  LMP.live = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.tenant);
  LMP.path = (b, op) => `/api/lms/${b}/${op.replace(/\./g, '/')}`;
  LMP.demo = LMP.demo || {};
  LMP.cache = LMP.cache || {};
  LMP.isAdm = () => S && S.me && (S.me.role === 'owner' || S.me.role === 'sub');
  LMP.call = async (b, op, q = {}, get) => {
    if (LMP.live()) {
      const isGet = get || /^(cal\.list|cal\.ics|dm\.rooms|dm\.msgs|noti\.rules|noti\.inbox|noti\.outbox)$/.test(op) && b === 'l' || (LMP.GETS && LMP.GETS[b] && LMP.GETS[b].includes(op));
      const u = isGet ? LMP.path(b, op) + '?' + new URLSearchParams(Object.entries(q).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])) : LMP.path(b, op);
      const xh = LMP.hdr && LMP.hdr(b, op);
      if (!xh) return isGet ? api('GET', u) : api('POST', u, q);
      const r = await fetch(u, { method: isGet ? 'GET' : 'POST', credentials: 'same-origin', headers: { 'x-didisam': '1', ...xh, ...(isGet ? {} : { 'content-type': 'application/json' }) }, body: isGet ? undefined : JSON.stringify(q) });
      const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; throw e; } return j;
    }
    const f = LMP.demo[b] && LMP.demo[b][op]; if (!f) throw new Error('데모에서 지원하지 않는 동작입니다.');
    const r = f(q); save(); return JSON.parse(JSON.stringify(r));
  };
  /* 화면은 동기 렌더 — 캐시에 없으면 불러온 뒤 다시 그린다 */
  LMP.load = (key, b, op, q) => {
    const c = LMP.cache[key]; if (c && c.ok) return c.v;
    if (!c || !c.busy) { LMP.cache[key] = { busy: true }; LMP.call(b, op, q).then(v => { LMP.cache[key] = { ok: true, v }; render(); }).catch(e => { LMP.cache[key] = { ok: true, v: null, err: e.message }; render(); }); }
    return null;
  };
  LMP.err = key => LMP.cache[key] && LMP.cache[key].err;
  LMP.drop = pre => Object.keys(LMP.cache).forEach(k => { if (k.startsWith(pre)) delete LMP.cache[k]; });
  LMP.run = async (b, op, q, okMsg, drop) => { try { const r = await LMP.call(b, op, q); if (drop) LMP.drop(drop); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'ok'); render(); return r; } catch (e) { toast(e.message, 'warn'); return null; } };
  LMP.ts = s => s ? String(s).replace('T', ' ').slice(0, 16) : '—';
  LMP.mode = () => LMP.live() ? tag('운영 모드 · 서버 저장') : tag('데모 동작 · 이 브라우저에 저장', 'y');
  LMP.uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  LMP.nowIso = () => { const d = new Date(Date.now() + 9 * 3600e3); return d.toISOString().slice(0, 19) + '+09:00'; };
  LMP.iso = d => new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().slice(0, 19) + '+09:00';
  LMP.menu = (items) => {
    Object.assign(MENU, items);
    const U = PRESET.univ_lms; if (U) Object.keys(items).forEach(id => { if (!U.on.includes(id)) U.on.push(id); });
    Object.keys(PRESET).forEach(k => { if (k === 'univ_lms') return; Object.keys(items).forEach(id => { const P = PRESET[k]; if (!P.on.includes(id) && !P.off.includes(id)) P.off.push(id); }); });
    /* 기존 학사 LMS 기관 상태에 새 메뉴를 켠다 */
    const up = () => { if (!S || !S.nav || !window.ULMS || !ULMS()) return; let ch = 0; Object.keys(items).forEach(id => { const w = items[id].ws; S.nav.tabs[w] = S.nav.tabs[w] || []; if (!Object.values(S.nav.tabs).some(L => L.some(x => x.id === id))) { S.nav.tabs[w].push({ id, on: true }); ch = 1; } }); if (ch) save(); };
    if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { up(); } catch (e) { console.error(e); } return r; }; }
    AFTER.push(up);
  };
  LMP.guard = (view) => () => (window.ULMS && ULMS() ? view() : `<div class="empty">대학 학사 LMS 에디션에서 쓰는 화면입니다. 설정 › 기관 유형에서 학사 LMS를 고르세요.</div>`);
  (function css() { if (document.querySelector('link[data-lmp]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/l.css?v=31.8'; l.dataset.lmp = '1'; document.head.appendChild(l); })();

  /* ── 데모 상태 ── */
  const ME = () => 'u:demo-' + ((S && S.me && S.me.role) || 'owner');
  /* 데모 학기 2026-2(전남대 예시): 학사 일정 · 강좌 일정 · 대화 · 알림 규칙과 발생한 알림 */
  const KST = (y, m, d, h = 9, mi = 0) => LMP.iso(new Date(Date.UTC(y, m - 1, d, h - 9, mi)));
  function seed2(l) {
    const d0 = new Date(); const at = (dd, h = 9) => { const d = new Date(d0); d.setDate(d.getDate() + dd); return KST(d.getFullYear(), d.getMonth() + 1, d.getDate(), h); };
    const E = (scope, title, kind, starts_at, all_day) => ({ id: LMP.uuid(), scope, title, kind, starts_at, all_day: !!all_day, done: false, owner: scope === 'personal' ? ME() : null });
    const ev = [E('academic', '2026-2학기 개강', 'event', KST(2026, 9, 1, 0), 1), E('academic', '수강 정정 마감', 'deadline', KST(2026, 9, 7, 18)), E('academic', '추석 연휴', 'holiday', KST(2026, 9, 24, 0), 1), E('academic', '중간고사 기간(10.20~10.24)', 'exam', KST(2026, 10, 20, 0), 1),
      E('academic', '수업 일수 1/2선 · 수강 포기 마감', 'deadline', KST(2026, 10, 30, 18)), E('academic', '강의평가 시작', 'event', KST(2026, 12, 1, 0), 1), E('academic', '기말고사 기간(12.15~12.19)', 'exam', KST(2026, 12, 15, 0), 1), E('academic', '성탄절', 'holiday', KST(2026, 12, 25, 0), 1), E('academic', '성적 입력 마감', 'deadline', KST(2026, 12, 28, 18)),
      E('course', '자료구조 01 · 퀴즈 3', 'exam', KST(2026, 11, 10, 10)), E('course', '프로그래밍 기초 01 · 과제 3 마감', 'deadline', KST(2026, 11, 12, 23)), E('course', '경영 데이터 분석 01 · 팀 발표', 'event', KST(2026, 11, 19, 13)), E('course', '간호학 개론 02 · 실습 보고서 마감', 'deadline', KST(2026, 11, 27, 18)),
      E('course', '프로그래밍 기초 01 · 10차시 온라인 학습', 'event', at(0, 10)), E('course', '자료구조 01 · 11차시 온라인 학습 인정 마감', 'deadline', at(1, 23)), E('personal', '팀 프로젝트 자료 정리', 'todo', at(3, 14)), E('personal', '교수학습센터 튜터링 신청', 'todo', at(5, 11))];
    ev.forEach(e => { if (!l.ev.some(x => x.title === e.title)) l.ev.push(e); });
    const P = n => 'p:' + n; let id = Math.max(l.seq || 0, 100); const M = (sender, body, dd, h, read) => ({ id: ++id, sender, body, attachments: [], at: at(dd, h), read: read || 0 });
    const rooms = [{ id: 'r2', kind: 'direct', title: '', members: [P('20261004')], msgs: [M(P('20261004'), '교수님, 과제 3은 PDF 한 파일로 내면 될까요?', -1, 21), M(ME(), '네, 코드와 보고서를 PDF 하나로 묶어 올려 주세요.', -1, 22, 1), M(P('20261004'), '감사합니다! 마감 전에 올리겠습니다.', 0, 8)] },
      { id: 'r3', kind: 'group', title: '프로그래밍 기초 01 조교', members: [P('T2026001'), P('T2026002')], msgs: [M(P('T2026001'), '9차시 출결 정정 요청 2건 확인 부탁드립니다.', -2, 16), M(ME(), '확인했습니다. 병결 서류는 학과 사무실로 받아 주세요.', -2, 17, 2), M(P('T2026002'), '과제 3 채점 기준표 초안 올렸습니다.', 0, 9)] },
      { id: 'r4', kind: 'broadcast', title: '중간고사 성적 공개 안내', members: ['20261001', '20261002', '20261003', '20261005'].map(P), msgs: [M(ME(), '중간고사 성적을 공개했습니다. 이의 신청은 11월 13일까지 강의 게시판 1:1 상담으로 해 주세요.', -3, 10, 4)] },
      { id: 'r5', kind: 'direct', title: '', members: [P('20261007')], msgs: [M(P('20261007'), '다음 학기 휴학 관련해서 상담 가능할까요?', 0, 7)] }];
    rooms.forEach(r => { if (!l.rooms.some(x => x.id === r.id)) { r.read = r.msgs.filter(m => m.sender === ME() || r.kind === 'broadcast').reduce((a, m) => Math.max(a, m.id), 0); if (r.id === 'r2') r.read = r.msgs[1].id; l.rooms.push(r); } });
    const R = (event, params, channels, enabled = true) => ({ id: LMP.uuid(), event, section_id: null, params, channels, enabled });
    [R('qna_new', {}, ['email', 'inapp']), R('analytics', { metric: 'absent_count', op: '>=', value: 3 }, ['inapp', 'kakao']), R('resource_new', {}, ['inapp'], false)].forEach(r => { if (!l.rules.some(x => x.event === r.event)) l.rules.push(r); });
    const O = (ch, p, title, status, dd, h) => ({ id: ++id, principal: p, channel: ch, title, body: '', status, at: at(dd, h), not_before: status === 'held_quiet' ? '방해금지 종료 후' : null });
    if (!l.inbox.length) l.inbox.push(O('inapp', ME(), '[Q&A] 프로그래밍 기초 01 · 과제 3 제출 형식 문의', 'sent', 0, 8), O('inapp', ME(), '[마감 24시간 전] 자료구조 01 · 11차시 온라인 학습 인정 마감', 'sent', 0, 7), O('inapp', ME(), '[학습 분석] 경영 데이터 분석 01 · 결석 3회 이상 2명', 'sent', -1, 18),
      O('inapp', ME(), '[D-1] 10차시 온라인 학습 미이수 3명 — 알림 발송', 'sent', -2, 9), O('inapp', ME(), '[Q&A] 자료구조 01 · 퀴즈 3 범위 문의', 'sent', -3, 15));
    if (!l.outbox.length) l.outbox.push(O('push', P('20261001'), '[D-1] 11차시 온라인 학습 미이수', 'queued', 0, 9), O('push', P('20261004'), '[D-1] 11차시 온라인 학습 미이수', 'queued', 0, 9), O('kakao', ME(), '[학습 분석] 결석 3회 이상 2명', 'held_quiet', -1, 23),
      O('email', ME(), '[Q&A] 과제 3 제출 형식 문의', 'sent', 0, 8), O('push', P('20261002'), '중간고사 성적 공개 안내', 'sent', -3, 10), O('push', P('20261003'), '중간고사 성적 공개 안내', 'sent', -3, 10));
    l.seq = id; l.v2 = 1;
  }
  function ens() {
    const L = (S.lms = S.lms || {}); if (L.l) { if (!L.l.v2) seed2(L.l); return L.l; }
    L.l = { ev: [], rooms: [{ id: 'r1', kind: 'group', title: '1조 프로젝트', members: ['p:20261001', 'p:20261002', 'p:20261003'], msgs: [{ id: 1, sender: 'p:20261001', body: '자료 조사 끝냈습니다.', attachments: [], at: LMP.nowIso(), read: 3 }], read: 0 }],
      rules: [{ id: LMP.uuid(), event: 'due_before', section_id: null, params: { hours: 24 }, channels: ['inapp', 'push'], enabled: true }],
      quiet: { starts: '22:00', ends: '07:00', enabled: true }, outbox: [], inbox: [], seq: 10 };
    if ((S && S.org && S.org.empty)) { L.l.rooms = []; L.l.v2 = 1; return L.l; } /* v38 빈 스튜디오: 학사 · 강좌 일정 · 대화 샘플 없이 */
    seed2(L.l); return L.l;
  }
  const qNow = () => { const Q = ens().quiet; if (!Q || !Q.enabled || Q.starts === Q.ends) return false; const t = new Date().toTimeString().slice(0, 5); return Q.starts < Q.ends ? t >= Q.starts && t < Q.ends : t >= Q.starts || t < Q.ends; };
  const enq = (p, ch, title, body) => { const L = ens(); const st = ch === 'inapp' ? 'sent' : qNow() ? 'held_quiet' : 'queued'; const o = { id: ++L.seq, principal: p, channel: ch, title, body, status: st, at: LMP.nowIso(), not_before: st === 'held_quiet' ? '방해금지 종료 후' : null }; if (ch === 'inapp') L.inbox.unshift(o); else L.outbox.unshift(o); return st; };
  const need = (v, m) => { if (!v) throw new Error(m); };
  LMP.demo.l = {
    'cal.list': q => ({ items: ens().ev.filter(e => (e.scope !== 'personal' || e.owner === ME()) && (!q.scope || e.scope === q.scope) && (!q.from || String(e.starts_at).slice(0, 10) >= q.from) && (!q.to || String(e.starts_at).slice(0, 10) < q.to)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(e => ({ ...e, mine: e.scope === 'personal', src: 'event' })) }),
    'cal.add': q => { need(['academic', 'course', 'personal'].includes(q.scope), '구분은 학사 · 강좌 · 개인 중 하나입니다.'); need(q.title, 'title 값을 입력하세요.'); need(q.starts_at, 'starts_at 일시를 입력하세요.'); if (q.scope === 'academic') need(LMP.isAdm(), '학사 일정은 관리자만 등록할 수 있습니다.');
      const e = { id: LMP.uuid(), scope: q.scope, title: String(q.title).slice(0, 120), kind: q.kind || 'event', starts_at: LMP.iso(q.starts_at), all_day: !!q.all_day, done: false, owner: q.scope === 'personal' ? ME() : null }; ens().ev.push(e); logAudit('통합 달력 일정 등록'); return { ok: true, item: e }; },
    'cal.done': q => { const e = ens().ev.find(x => x.id === q.id); need(e, '없는 일정입니다.'); e.done = q.done == null ? !e.done : !!q.done; return { ok: true, item: e }; },
    'cal.del': q => { const L = ens(); const n = L.ev.length; L.ev = L.ev.filter(x => x.id !== q.id); need(L.ev.length < n, '없는 일정입니다.'); return { ok: true }; },
    'cal.d1': () => { need(LMP.isAdm(), '관리자만 사용할 수 있습니다.'); let n = 0, h = 0; ['p:20261001', 'p:20261004'].forEach(p => { enq(p, 'push', '[D-1] 4차시 온라인 학습 미이수', '학습 인정 기간이 내일 끝납니다.') === 'held_quiet' ? h++ : n++; }); return { queued: n, held: h }; },
    'dm.rooms': () => ({ me: ME(), items: ens().rooms.map(r => ({ id: r.id, kind: r.kind, title: r.title, members: r.members, unread: r.msgs.filter(m => m.id > r.read && m.sender !== ME()).length, last: (r.msgs[r.msgs.length - 1] || {}).body || '', last_at: (r.msgs[r.msgs.length - 1] || {}).at || null })) }),
    'dm.open': q => { const mem = (q.members || []).filter(Boolean); need(mem.length, '대화 상대(members)를 고르세요.'); mem.forEach(m => need(/^p:[A-Za-z0-9_-]{4,20}$/.test(m), '없는 구성원입니다: ' + m)); const L = ens();
      if (q.kind !== 'group') { need(mem.length === 1, '1:1 대화는 상대가 한 명이어야 합니다.'); const ex = L.rooms.find(r => r.kind === 'direct' && r.members[0] === mem[0]); if (ex) return { id: ex.id, created: false }; }
      const r = { id: 'r' + (++L.seq), kind: q.kind === 'group' ? 'group' : 'direct', title: q.kind === 'group' ? (q.title || '그룹 대화') : '', members: mem, msgs: [], read: 0 }; L.rooms.unshift(r); return { id: r.id, created: true }; },
    'dm.send': q => { const L = ens(); const r = L.rooms.find(x => x.id === q.room_id); need(r, '참여하지 않은 대화방입니다.'); const att = (q.attachments || []).map(a => ({ file_id: a.file_id, name: a.name, size: a.size, mime: a.mime, kind: /^image\//.test(a.mime) ? 'image' : /^audio\//.test(a.mime) ? 'voice' : 'file' }));
      need(att.every(a => a.file_id), '첨부 파일을 먼저 올리세요(file_id).'); need(q.body || att.length, '보낼 내용을 입력하세요.'); const id = ++L.seq; r.msgs.push({ id, sender: ME(), body: q.body || '', attachments: att, at: LMP.nowIso(), read: 0 }); r.read = id;
      setTimeout(() => { r.msgs.forEach(m => { if (m.sender === ME()) m.read = Math.min(r.members.length, (m.read || 0) + 1); }); save(); if (CUR.tab === 'lmsl-dm') { LMP.drop('l:'); render(); } }, 1500); return { ok: true, id }; },
    'dm.msgs': q => { const r = ens().rooms.find(x => x.id === q.room_id); need(r, '참여하지 않은 대화방입니다.'); return { room: { id: r.id, kind: r.kind, title: r.title }, members: r.members.length + 1, items: r.msgs.map(m => ({ ...m, mine: m.sender === ME(), read_by: m.sender === ME() ? (m.read || 0) : 1 })) }; },
    'dm.read': q => { const r = ens().rooms.find(x => x.id === q.room_id); if (r) r.read = Math.max(0, ...r.msgs.map(m => m.id)); return { ok: true }; },
    'dm.broadcast': q => { need(q.body, 'body 값을 입력하세요.'); const L = ens(); const mem = q.members && q.members.length ? q.members : ['p:20261001', 'p:20261002', 'p:20261003', 'p:20261004']; const id = 'r' + (++L.seq);
      L.rooms.unshift({ id, kind: 'broadcast', title: q.title || '일괄 안내', members: mem, msgs: [{ id: ++L.seq, sender: ME(), body: q.body, attachments: [], at: LMP.nowIso(), read: 0 }], read: L.seq });
      let n = 0, h = 0; mem.forEach(p => { enq(p, 'inapp', q.title || '일괄 안내', q.body); if (q.push) enq(p, 'push', q.title || '일괄 안내', q.body) === 'held_quiet' ? h++ : n++; }); logAudit(`일괄 발송 ${mem.length}명`); return { ok: true, id, to: mem.length, push_queued: n, push_held: h }; },
    'noti.rules': () => { const L = ens(); return { items: L.rules, quiet: L.quiet, quiet_now: qNow() }; },
    'noti.rule_save': q => { need(['resource_new', 'qna_new', 'due_before', 'analytics'].includes(q.event), '알림 조건이 올바르지 않습니다.'); need((q.channels || []).length, '받을 채널을 고르세요.'); const L = ens();
      const params = q.event === 'due_before' ? { hours: Math.max(1, Math.min(168, +((q.params || {}).hours) || 24)) } : q.event === 'analytics' ? { metric: (q.params || {}).metric || 'absent_count', op: '>=', value: +((q.params || {}).value) || 3 } : {};
      const ex = q.id && L.rules.find(r => r.id === q.id); const r = ex || { id: LMP.uuid() }; Object.assign(r, { event: q.event, section_id: null, params, channels: [...new Set(q.channels)].sort(), enabled: q.enabled !== false }); if (!ex) L.rules.push(r); return { ok: true, id: r.id, params }; },
    'noti.rule_del': q => { const L = ens(); L.rules = L.rules.filter(r => r.id !== q.id); return { ok: true }; },
    'noti.quiet': q => { need(/^([01]\d|2[0-3]):[0-5]\d$/.test(q.starts || '') && /^([01]\d|2[0-3]):[0-5]\d$/.test(q.ends || ''), '방해금지 시간은 HH:MM 형식입니다.'); ens().quiet = { starts: q.starts, ends: q.ends, enabled: q.enabled !== false }; return { ok: true, quiet_now: qNow() }; },
    'noti.fire': q => { let n = 0, h = 0; ens().rules.filter(r => r.enabled && r.event === q.event).forEach(r => r.channels.forEach(ch => (enq(ME(), ch, (q.event === 'resource_new' ? '[자료 등록] ' : '[Q&A] ') + q.title, q.body || '') === 'held_quiet' ? h++ : n++))); return { queued: n, held: h }; },
    'noti.scan': () => { const L = ens(); let n = 0, rel = 0; L.outbox.forEach(o => { if (o.status === 'held_quiet' && !qNow()) { o.status = 'queued'; rel++; } });
      L.rules.filter(r => r.enabled && r.event === 'due_before').forEach(r => L.ev.filter(e => ['deadline', 'exam'].includes(e.kind) && new Date(e.starts_at) > new Date() && new Date(e.starts_at) - new Date() <= r.params.hours * 3600e3).forEach(e => r.channels.forEach(ch => { if (![...L.outbox, ...L.inbox].some(o => o.ref === r.id + e.id + ch)) { enq(ME(), ch, `[마감 ${r.params.hours}시간 전] ${e.title}`, LMP.ts(e.starts_at) + ' 마감'); ([...L.outbox, ...L.inbox].find(o => !o.ref) || {}).ref = r.id + e.id + ch; n++; } })));
      return { queued: n, released: rel }; },
    'noti.inbox': () => ({ items: ens().inbox.slice(0, 50) }),
    'noti.outbox': q => { const L = ens(); const c = {}; L.outbox.forEach(o => c[o.status] = (c[o.status] || 0) + 1); return { items: L.outbox.filter(o => !q.status || o.status === q.status).slice(0, 200), counts: c }; },
    'noti.ack': q => { let n = 0; ens().outbox.forEach(o => { if ((q.ids || []).includes(o.id) && ['queued', 'held_quiet'].includes(o.status)) { o.status = q.status; n++; } }); return { ok: true, n }; }
  };

  LMP.menu({
    'lmsl-cal': { label: '통합 달력', ws: 'talk' },
    'lmsl-dm': { label: 'DM 채팅', ws: 'talk' },
    'lmsl-noti': { label: '알림 규칙', ws: 'talk' }
  });

  /* ═════════ 통합 달력(SFR-012 · 040) ═════════ */
  const SC = { academic: ['학사', 'r'], course: ['강좌', ''], personal: ['개인', 'y'] };
  const KD = { event: '일정', deadline: '마감', exam: '시험', holiday: '휴일', todo: 'To-do' };
  const ym = () => UI.lmslYm || new Date().toISOString().slice(0, 7);
  VIEWS['lmsl-cal'] = LMP.guard(() => {
    const m = ym(); const [Y, M] = m.split('-').map(Number); const first = new Date(Y, M - 1, 1); const from = `${m}-01`; const nx = new Date(Y, M, 1); const to = `${nx.getFullYear()}-${String(nx.getMonth() + 1).padStart(2, '0')}-01`;
    const sc = UI.lmslSc || ''; const key = `l:cal:${from}:${sc}`; const d = LMP.load(key, 'l', 'cal.list', { from, to, scope: sc }); const items = (d && d.items) || [];
    const days = []; const start = new Date(first); start.setDate(1 - first.getDay()); for (let i = 0; i < 42; i++) { const x = new Date(start); x.setDate(start.getDate() + i); days.push(x); }
    const dk = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const by = {}; items.forEach(e => { const k = String(e.starts_at).slice(0, 10); (by[k] = by[k] || []).push(e); });
    const todos = items.filter(e => e.kind === 'todo' || e.kind === 'deadline');
    const td = dk(new Date());
    const now = Date.now(); const soon = items.filter(e => ['deadline', 'exam'].includes(e.kind) && !e.done && new Date(e.starts_at).getTime() > now && new Date(e.starts_at).getTime() - now <= 7 * 864e5).length;
    const todayN = (by[td] || []).length; const dm = LW4.demoTag(LMP.live());
    return head('통합 달력', `학사 · 강좌 · 개인 일정을 한 달력에서 보고, 휴대폰 · Google 캘린더로 내보냅니다. ${dm}`,
      LW4.more(LW4.mi('lmsl-ics', 'iCal(.ics) 내보내기', { from, to }) + (LMP.isAdm() ? LW4.mi('lmsl-d1', '미이수 학생에게 D-1 알림 보내기') : '')) + `<button class="btn pri" data-act="lmsl-add">일정 추가</button>`) +
      LW4.todo([{ n: todayN, t: '건 오늘 일정' }, { n: soon, t: '건 7일 안 마감 · 시험', btn: LMP.isAdm() ? LW4.go('lmsl-d1', '미이수 D-1 알림 보내기') : '' }], '이번 주 마감 · 시험이 없습니다.') +
      `<div class="bar2 lmp-calbar"><button class="btn sm" data-act="lmsl-mon" data-d="-1" aria-label="이전 달">‹</button><b>${Y}년 ${M}월</b><button class="btn sm" data-act="lmsl-mon" data-d="1" aria-label="다음 달">›</button>${tabs('lmslSc', [['', '전체'], ['academic', '학사'], ['course', '강좌'], ['personal', '개인']], sc)}</div>` +
      (LMP.err(key) ? `<div class="warn">${esc(LMP.err(key))}</div>` : '') +
      `<div class="card lmp-cal" role="grid" aria-label="${Y}년 ${M}월 달력"><div class="lmp-calh" role="row">${['일', '월', '화', '수', '목', '금', '토'].map(w => `<span role="columnheader">${w}</span>`).join('')}</div><div class="lmp-calg">${days.map(x => { const k = dk(x); const L = by[k] || [];
        return `<div class="lmp-day ${x.getMonth() !== M - 1 ? 'out' : ''} ${k === td ? 'today' : ''}" role="gridcell" aria-label="${k} 일정 ${L.length}건"><i>${x.getDate()}</i>${L.slice(0, 3).map(e => `<span class="lmp-ev s-${e.scope} ${e.done ? 'done' : ''}" title="${esc(SC[e.scope][0] + ' · ' + e.title)}">${esc(e.title)}</span>`).join('')}${L.length > 3 ? `<small>+${L.length - 3}</small>` : ''}</div>`; }).join('')}</div></div>` +
      `<div class="grid g2"><div class="card"><div class="ch"><b>To-do · 마감</b><small>체크하면 완료로 표시합니다</small></div>${todos.length ? todos.map(e => `<div class="row"><label class="ul-ck"><input type="checkbox" ${e.done ? 'checked' : ''} ${e.src === 'event' ? '' : 'disabled'} data-chg="lmsl-done" data-id="${esc(e.id)}"> ${esc(e.title)}</label><span class="mini">${tag(SC[e.scope][0], SC[e.scope][1])} ${esc(LMP.ts(e.starts_at))}</span></div>`).join('') : '<p class="mini">이번 달 To-do · 마감이 없습니다. 「일정 추가」로 넣을 수 있습니다.</p>'}</div>
      <div class="card"><div class="ch"><b>이번 달 일정</b><small>${items.length}건</small></div>${items.slice(0, 12).map(e => `<div class="row"><span>${tag(SC[e.scope][0], SC[e.scope][1])} ${esc(e.title)} <small class="mini">${esc(KD[e.kind] || e.kind)}</small></span><span class="mini">${esc(LMP.ts(e.starts_at))} ${e.src === 'event' && (e.mine || LMP.isAdm()) ? `<button class="btn sm ghost" data-act="lmsl-del" data-id="${esc(e.id)}" aria-label="일정 삭제" title="일정 삭제">✕</button>` : ''}</span></div>`).join('') || '<div class="empty">일정이 없습니다.</div>'}
      <p class="mini">Google 캘린더 양방향 연결은 연동 후 동작합니다(지금은 ⋯ › iCal 내보내기).</p></div></div>`;
  });
  ACT.lmslSc = el => { UI.lmslSc = el.dataset.v; render(); };
  ACT['lmsl-mon'] = el => { const [Y, M] = ym().split('-').map(Number); const d = new Date(Y, M - 1 + (+el.dataset.d), 1); UI.lmslYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; render(); };
  ACT['lmsl-add'] = () => modal('일정 추가', `<label class="fl">구분<select name="scope">${LMP.isAdm() ? '<option value="academic">학사</option>' : ''}<option value="personal" selected>개인</option></select></label>
    <label class="fl">제목<input name="title" maxlength="120" placeholder="예: 기말 보고서 제출"></label><label class="fl">종류<select name="kind">${Object.entries(KD).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="fl">시작<input name="starts_at" type="datetime-local" value="${new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16)}"></label><label class="ul-ck"><input type="checkbox" name="all_day"> 하루 종일</label>
    <p class="mini">강좌 일정(차시 · 과제 마감)은 강의실에서 등록하면 자동으로 달력에 들어옵니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: async w => { const r = await LMP.run('l', 'cal.add', { scope: fv(w, 'scope'), title: fv(w, 'title'), kind: fv(w, 'kind'), starts_at: fv(w, 'starts_at'), all_day: fv(w, 'all_day') }, '일정을 추가했습니다.', 'l:cal'); return !!r; } }]);
  ACT['lmsl-done'] = el => LMP.run('l', 'cal.done', { id: el.dataset.id, done: el.checked }, null, 'l:cal');
  ACT['lmsl-del'] = el => LMP.run('l', 'cal.del', { id: el.dataset.id }, '일정을 지웠습니다.', 'l:cal');
  ACT['lmsl-d1'] = () => LMP.run('l', 'cal.d1', {}, r => `미이수 D-1 알림: 대기열 ${r.queued}건 · 방해금지 보류 ${r.held}건(연동 후 발송)`, 'l:');
  const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  ACT['lmsl-ics'] = async el => {
    if (LMP.live()) { const a = document.createElement('a'); a.href = `/api/lms/l/cal/ics?from=${el.dataset.from}&to=${el.dataset.to}`; a.download = 'didisam-calendar.ics'; document.body.appendChild(a); a.click(); a.remove(); return; }
    const d = await LMP.call('l', 'cal.list', { from: el.dataset.from, to: el.dataset.to }); const z = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DiDiSam//LMS Calendar//KO', 'CALSCALE:GREGORIAN', 'X-WR-TIMEZONE:Asia/Seoul', ...d.items.flatMap(e => ['BEGIN:VEVENT', `UID:${e.id}@didisam`, e.all_day ? `DTSTART;VALUE=DATE:${e.starts_at.slice(0, 10).replace(/-/g, '')}` : `DTSTART:${z(e.starts_at)}`, `DTSTAMP:${z(e.starts_at)}`, `SUMMARY:${icsEsc(e.title)}`, `CATEGORIES:${e.scope.toUpperCase()},${e.kind.toUpperCase()}`, 'END:VEVENT']), 'END:VCALENDAR', ''].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = 'didisam-calendar.ics'; document.body.appendChild(a); a.click(); a.remove(); toast(`iCal 파일(${d.items.length}건)을 내려받았습니다.`, 'ok');
  };

  /* ═════════ DM 채팅(SFR-070) ═════════ */
  const who = p => String(p || '').startsWith('p:') ? String(p).slice(2) : '나(운영자)';
  VIEWS['lmsl-dm'] = LMP.guard(() => {
    const rooms = LMP.load('l:rooms', 'l', 'dm.rooms', {}); const L = (rooms && rooms.items) || []; const cur = UI.lmslRoom && L.find(r => r.id === UI.lmslRoom) ? UI.lmslRoom : (L[0] || {}).id;
    const ms = cur ? LMP.load('l:msgs:' + cur, 'l', 'dm.msgs', { room_id: cur }) : null;
    const K = { direct: '1:1', group: '그룹', broadcast: '일괄' };
    const unread = L.reduce((a, r) => a + (r.unread || 0), 0); const ur = L.find(r => r.unread);
    return head('DM 채팅', `교수 · 조교 · 학생과 1:1 · 그룹으로 대화하고, 여러 학생에게 한 번에 안내합니다. 구성원은 학번으로 찾습니다. ${LW4.demoTag(LMP.live())}`,
      LW4.more(LW4.mi('lmsl-bc', '여러 학생에게 일괄 발송')) + `<button class="btn pri" data-act="lmsl-new">새 대화</button>`) +
      LW4.todo([{ n: unread, t: '개 안 읽은 메시지', btn: ur ? LW4.go('lmsl-room', '읽기', { id: ur.id }) : '' }, { n: L.length, t: '개 대화방' }], '안 읽은 메시지가 없습니다.') +
      `<div class="lmp-dm"><div class="card lmp-rooms" role="list" aria-label="대화방 목록">${L.length ? L.map(r => `<button role="listitem" class="lmp-room ${r.id === cur ? 'on' : ''}" data-act="lmsl-room" data-id="${esc(r.id)}"><b>${esc(r.title || (r.members || []).map(who).join(', '))}</b><small>${tag(K[r.kind] || r.kind)} ${esc(String(r.last || '').slice(0, 24))}</small>${r.unread ? `<em aria-label="안 읽은 메시지 ${r.unread}개">${r.unread}</em>` : ''}</button>`).join('') : '<p class="mini">대화방이 아직 없습니다. 「새 대화」로 시작하세요.</p>'}</div>
      <div class="card lmp-chat">${ms ? `<div class="ch"><b>${esc(ms.room.title || '1:1 대화')}</b><small>참여 ${ms.members}명</small><button class="btn sm" data-act="lmsl-tr" data-id="${esc(cur)}">✦ 번역해서 보기</button></div>
        <div class="lmp-msgs" aria-live="polite">${ms.items.map(m => `<div class="lmp-msg ${m.mine ? 'mine' : ''}"><small>${esc(who(m.sender))} · ${esc(LMP.ts(m.at))}</small><p data-tr="${m.id}">${esc(m.body)}</p>${(m.attachments || []).map(a => `<button class="lmp-att" data-act="lmsl-att" data-room="${esc(cur)}" data-id="${esc(a.file_id || '')}" data-name="${esc(a.name)}" data-mime="${esc(a.mime || '')}" aria-label="${esc(a.name)} 내려받기">${a.kind === 'image' ? '🖼' : a.kind === 'voice' ? '🎙' : '📎'} ${esc(a.name)} <small>${Math.ceil((a.size || 0) / 1024)}KB</small></button>`).join('')}${m.mine ? `<small class="lmp-read">${m.read_by ? `읽음 ${m.read_by}` : '안 읽음'}</small>` : ''}</div>`).join('') || '<div class="empty">첫 메시지를 보내세요.</div>'}</div>
        <div class="lmp-send"><input id="lmslMsg" maxlength="2000" placeholder="메시지 입력" aria-label="메시지 입력"><label class="btn sm">첨부<input type="file" id="lmslFile" multiple hidden></label><button class="btn lw-go" data-act="lmsl-send" data-id="${esc(cur)}">보내기</button></div>
        <p class="mini">첨부 파일은 기관 파일 저장소에 저장되고, 대화방 참여자만 내려받을 수 있습니다(파일당 2MB · 실행 파일 차단).</p>` : cur ? '<div class="empty">불러오는 중…</div>' : '<div class="empty">왼쪽에서 대화방을 고르세요.</div>'}</div></div>`;
  });
  ACT['lmsl-room'] = el => { UI.lmslRoom = el.dataset.id; LMP.call('l', 'dm.read', { room_id: el.dataset.id }).catch(() => { }); LMP.drop('l:'); render(); };
  ACT['lmsl-new'] = () => modal('새 대화', `<label class="fl">종류<select name="kind"><option value="direct">1:1</option><option value="group">그룹</option></select></label><label class="fl">그룹 이름(그룹일 때)<input name="title" maxlength="60" placeholder="예: 1조 프로젝트"></label><label class="fl">상대 학번 · 사번(쉼표로 구분)<input name="m" placeholder="20261001, 20261002"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: async w => { const r = await LMP.run('l', 'dm.open', { kind: fv(w, 'kind'), title: fv(w, 'title'), members: fv(w, 'm').split(/[,\s]+/).filter(Boolean).map(x => 'p:' + x) }, null, 'l:'); if (r) { UI.lmslRoom = r.id; render(); } return !!r; } }]);
  ACT['lmsl-send'] = async el => { const t = $('#lmslMsg'); const f = $('#lmslFile'); const att = [];
    /* 첨부 바이트는 파일 저장소(lms_file)에 먼저 올리고 file_id만 보낸다(파일당 2MB · 실행 파일 차단) */
    for (const x of (f && f.files ? [...f.files].slice(0, 10) : [])) { const mime = x.type || 'application/octet-stream'; const bad = LMP.fileOk ? LMP.fileOk(x.name, mime) : null; if (bad) return toast(`${x.name}: ${bad}`, 'warn'); if (x.size > 2 * 1048576) return toast(`${x.name}: 대화 첨부는 2MB까지입니다(큰 파일은 공통 설정 › 업로드).`, 'warn');
      try { const r = await LMP.putBlob(x, x.name, mime); att.push({ file_id: r.file_id, name: x.name, size: x.size, mime }); } catch (e) { return toast(e.message, 'warn'); } }
    const r = await LMP.run('l', 'dm.send', { room_id: el.dataset.id, body: t ? t.value : '', attachments: att }, null, 'l:'); if (r && t) t.value = ''; };
  ACT['lmsl-att'] = async el => { if (!el.dataset.id) return; try { if (!LMP.live()) return LMP.saveBlob(LMP.BLOBS[el.dataset.id] || new Blob([]), el.dataset.name); const r = await LMP.call('l', 'dm.file', { room_id: el.dataset.room, file_id: el.dataset.id }, true); const bin = atob(r.b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); LMP.saveBlob(new Blob([u], { type: r.mime }), r.name); } catch (e) { toast(e.message, 'warn'); } };
  ACT['lmsl-bc'] = () => modal('일괄 발송', `<label class="fl">제목<input name="title" maxlength="60" value="안내"></label><label class="fl">받는 사람 학번(쉼표, 비우면 데모 분반 전체)<input name="m"></label><label class="fl">내용<textarea name="body" rows="4" maxlength="2000"></textarea></label><label class="ul-ck"><input type="checkbox" name="push" checked> 푸시 알림도 보내기(방해금지 시간이면 보류 · 연동 후 발송)</label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '보내기', kind: 'pri', run: async w => !!(await LMP.run('l', 'dm.broadcast', { title: fv(w, 'title'), body: fv(w, 'body'), push: fv(w, 'push'), members: fv(w, 'm').split(/[,\s]+/).filter(Boolean).map(x => 'p:' + x) }, r => `${r.to}명에게 보냈습니다 · 푸시 대기열 ${r.push_queued}건 · 보류 ${r.push_held}건`, 'l:')) }]);
  ACT['lmsl-tr'] = async () => { const to = (typeof I18N === 'function' && I18N().ui !== 'ko') ? I18N().ui : 'en'; let n = 0;
    for (const p of $$('.lmp-msgs [data-tr]')) { const r = typeof trText === 'function' ? await trText(p.textContent, to) : null; if (r && r.t) { p.textContent = r.t; n++; } }
    toast(n ? `${n}개 메시지를 ${to}로 번역했습니다.` : '이 브라우저에 번역 엔진이 없습니다. 운영 모드 번역 API는 연동 후 동작합니다.', n ? 'ok' : 'warn'); };

  /* ═════════ 개인화 알림 규칙 · 방해금지(SFR-071 · 029) ═════════ */
  const EVN = { resource_new: '자원(자료) 등록', qna_new: 'Q&A 등록', due_before: '마감 n시간 전', analytics: '학습 분석 조건' };
  const CHN = { inapp: '알림함', push: '푸시', sms: 'SMS', kakao: '알림톡', email: '메일' };
  const STN = { queued: ['발송 대기', 'y'], held_quiet: ['방해금지 보류', 'r'], sent: ['발송 완료', ''], failed: ['실패', 'r'], cancelled: ['취소', ''] };
  VIEWS['lmsl-noti'] = LMP.guard(() => {
    const d = LMP.load('l:rules', 'l', 'noti.rules', {}); const ob = LMP.isAdm() ? LMP.load('l:outbox', 'l', 'noti.outbox', {}) : null; const ib = LMP.load('l:inbox', 'l', 'noti.inbox', {});
    const Q = (d && d.quiet) || { starts: '22:00', ends: '07:00', enabled: false };
    const desc = r => r.event === 'due_before' ? `마감 ${r.params.hours}시간 전` : r.event === 'analytics' ? `${r.params.metric === 'late_count' ? '지각' : '결석'} ${r.params.value}회 ${r.params.op === '>' ? '초과' : '이상'}` : EVN[r.event];
    const cnt = (ob && ob.counts) || {}; const ibL = (ib && ib.items) || [];
    return head('알림 규칙', `받고 싶은 알림을 조건별로 정하고, 방해금지 시간에는 푸시 · 문자 · 알림톡을 보류했다가 끝나면 보냅니다. ${LW4.demoTag(LMP.live())}`,
      (LMP.isAdm() ? LW4.more(LW4.mi('lmsl-scan', '지금 규칙대로 알림 점검') + ((ob && (ob.items || []).some(x => x.status === 'queued')) ? LW4.mi('lmsl-ack', '대기 건 발송 완료로 표시(시험)') : '')) : '') + `<button class="btn pri" data-act="lmsl-rule">규칙 추가</button>`) +
      LW4.todo([{ n: ibL.length, t: '건 받은 알림' }, LMP.isAdm() ? { n: cnt.queued || 0, t: '건 발송 대기(연동 후 발송)' } : null, LMP.isAdm() ? { n: cnt.held_quiet || 0, t: '건 방해금지로 보류', btn: LW4.go('lmsl-scan', '보류 다시 확인') } : null, { n: ((d && d.items) || []).filter(r => r.enabled).length, t: '개 규칙 켜짐' }], '새 알림이 없습니다.') +
      `<div class="grid g2"><div class="card"><div class="ch"><b>내 알림 규칙</b><small>${((d && d.items) || []).length}개</small></div>${((d && d.items) || []).map(r => `<div class="row"><span><b>${esc(desc(r))}</b> <small class="mini">${r.channels.map(c => CHN[c] || c).join(' · ')}</small></span><span>${r.enabled ? tag('켜짐') : tag('꺼짐', 'y')} <button class="btn sm ghost" data-act="lmsl-rdel" data-id="${esc(r.id)}" title="규칙 삭제" aria-label="규칙 삭제">✕</button></span></div>`).join('') || '<p class="mini">규칙이 아직 없습니다. 「규칙 추가」로 만드세요.</p>'}</div>
      <div class="card"><div class="ch"><b>방해금지 시간</b><small>푸시 · SMS · 알림톡 · 메일 보류(알림함은 바로 쌓임)</small></div><div class="form2"><label>시작<input type="time" id="lmslQs" value="${esc(Q.starts)}"></label><label>끝<input type="time" id="lmslQe" value="${esc(Q.ends)}"></label></div><label class="ul-ck"><input type="checkbox" id="lmslQo" ${Q.enabled ? 'checked' : ''}> 방해금지 사용</label><button class="btn" data-act="lmsl-quiet">저장</button></div></div>` +
      (ob ? `<div class="card"><div class="ch"><b>발송 대기열</b><small>푸시 · 알림톡 · SMS · 메일 — 외부 발송기 연동 지점(연동 후 발송)</small></div>${table(['받는 사람', '채널', '제목', '상태'], (ob.items || []).slice(0, 30).map(o => [esc(who(o.principal)), esc(CHN[o.channel] || o.channel), esc(o.title) + `<small class="lw-sub">${esc(LMP.ts(o.at))}${o.not_before ? ' · 보류: ' + esc(o.not_before) : ''}</small>`, tag(...(STN[o.status] || [o.status]))]), '대기열이 비어 있습니다.')}</div>` : '') +
      `<div class="card"><div class="ch"><b>내 알림함</b><small>최근 10건</small></div>${((ib && ib.items) || []).slice(0, 10).map(o => `<div class="row"><span>${esc(o.title)}</span><span class="mini">${esc(LMP.ts(o.at))}</span></div>`).join('') || '<p class="mini">받은 알림이 아직 없습니다.</p>'}</div>`;
  });
  ACT['lmsl-rule'] = () => modal('알림 규칙 추가', `<label class="fl">조건<select name="event">${Object.entries(EVN).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label class="fl">마감 몇 시간 전(마감 조건)<input name="hours" type="number" min="1" max="168" value="24"></label>
    <label class="fl">분석 조건(학습 분석)<select name="metric"><option value="absent_count">결석 횟수</option><option value="late_count">지각 횟수</option></select></label><label class="fl">기준 횟수(이상)<input name="value" type="number" min="1" max="100" value="3"></label>
    <fieldset class="lmp-fs"><legend>받을 채널</legend>${Object.entries(CHN).map(([k, v]) => `<label class="ul-ck in"><input type="checkbox" name="ch_${k}" ${k === 'inapp' ? 'checked' : ''}> ${v}</label>`).join('')}</fieldset>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: async w => { const ev = fv(w, 'event'); return !!(await LMP.run('l', 'noti.rule_save', { event: ev, channels: Object.keys(CHN).filter(k => fv(w, 'ch_' + k)), params: ev === 'due_before' ? { hours: +fv(w, 'hours') } : ev === 'analytics' ? { metric: fv(w, 'metric'), op: '>=', value: +fv(w, 'value') } : {} }, '규칙을 추가했습니다.', 'l:')); } }]);
  ACT['lmsl-rdel'] = el => LMP.run('l', 'noti.rule_del', { id: el.dataset.id }, '규칙을 지웠습니다.', 'l:');
  ACT['lmsl-quiet'] = () => LMP.run('l', 'noti.quiet', { starts: $('#lmslQs').value, ends: $('#lmslQe').value, enabled: $('#lmslQo').checked }, r => r.quiet_now ? '저장했습니다. 지금은 방해금지 시간입니다.' : '방해금지 시간을 저장했습니다.', 'l:');
  ACT['lmsl-scan'] = () => LMP.run('l', 'noti.scan', {}, r => `규칙 평가: 새 알림 ${r.queued}건 · 보류 해제 ${r.released}건`, 'l:');
  ACT['lmsl-ack'] = () => { const ob = LMP.cache['l:outbox'] && LMP.cache['l:outbox'].v; const ids = ((ob && ob.items) || []).filter(x => x.status === 'queued').map(x => x.id); LMP.run('l', 'noti.ack', { status: 'sent', ids }, r => `${r.n}건을 발송 완료로 표시했습니다(외부 발송기 응답 시험).`, 'l:'); };
})();
