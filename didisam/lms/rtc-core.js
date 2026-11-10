/* x2 실시간 수업 · 실시간 자막 공용(운영 화면 lms/rtc.js · 수업 화면 liveclass.html이 함께 쓴다)
   운영(서버) 모드: /api/lms/live/* 호출. 데모(정적) 모드: 이 브라우저에만 저장(localStorage)하고, 신호는 같은 브라우저의 다른 탭과 BroadcastChannel로 주고받는다
   → 데모에서도 교수자 탭 · 학생 탭 두 개를 열면 실제 WebRTC로 영상이 오간다. 개인정보: 학번만. */
(function () {
  'use strict';
  if (window.LV) return;
  const LN = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어', vi: '베트남어', uz: '우즈베크어', mn: '몽골어', ru: '러시아어', es: '스페인어', fr: '프랑스어', de: '독일어', id: '인도네시아어' };
  const SR = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', vi: 'vi-VN', uz: 'uz-UZ', mn: 'mn-MN', ru: 'ru-RU', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', id: 'id-ID' };
  const KEY = 'didisam.lmslive.demo.v1';
  const now = () => new Date().toISOString();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
  const err = (st, msg, code) => { const e = new Error(msg); e.status = st; e.code = code; throw e; };
  let mode = null; /* 'live' | 'demo' */

  /* ── 데모 저장소 ── */
  function seed() {
    const sec = { section_id: 'demo-sec-1', title: '자료구조(01)', term_id: '2026-2', students: ['20261001', '20261002', '20261003', '20261004', '20261005'], audit: ['20261006'] };
    const sec2 = { section_id: 'demo-sec-2', title: '경영정보시스템(02)', term_id: '2026-2', students: ['20261004', '20261005', '20261006'], audit: [] };
    const t0 = Date.now(); const ago = m => new Date(t0 - m * 60e3).toISOString();
    const done = { room_id: 'demo-room-0', section_id: sec.section_id, session_id: 'demo-ses-2', session: { week_no: 2, seq: 1 }, title: '2차시 배열과 리스트(실시간)', mode: 'mesh', ext_url: null, status: 'ended', code: 'demo.' + rnd(10), rec_allowed: true, started_at: ago(10080), ended_at: ago(10005), created_at: ago(10200), att: { written: 5, kept: 0, present: 3, late: 1, absent: 1, session: true } };
    const ready = { room_id: 'demo-room-1', section_id: sec.section_id, session_id: 'demo-ses-3', session: { week_no: 3, seq: 1 }, title: '3차시 스택과 큐(실시간)', mode: 'mesh', ext_url: null, status: 'ready', code: 'demo.' + rnd(10), rec_allowed: true, started_at: null, ended_at: null, created_at: ago(60), att: null };
    const link = { room_id: 'demo-room-2', section_id: sec2.section_id, session_id: null, title: '보강(Zoom)', mode: 'link', ext_url: 'https://zoom.us/j/0000000000', status: 'ready', code: 'demo.' + rnd(10), rec_allowed: false, created_at: ago(30), att: null };
    const att = { 'demo-room-0': [['20261001', 0, 4500], ['20261002', 2, 4400], ['20261003', 14, 3900], ['20261004', 5, 900]].map(([m, o, s]) => ({ member_no: m, first_at: new Date(Date.parse(done.started_at) + o * 60e3).toISOString(), last_at: done.ended_at, sec: s, joins: 1 })) };
    const L = [['안녕하세요 여러분, 오늘 수업은 스택과 큐입니다.', { en: 'Hello everyone, today\'s class is about stacks and queues.', vi: 'Xin chào các bạn, hôm nay chúng ta học về ngăn xếp và hàng đợi.' }],
      ['스택은 마지막에 넣은 데이터를 먼저 꺼내는 자료구조입니다.', { en: 'A stack is a data structure where the last item in is the first out.', vi: 'Ngăn xếp là cấu trúc dữ liệu vào sau ra trước.' }],
      ['큐는 먼저 넣은 데이터를 먼저 꺼냅니다. 다음 주에는 트리를 다룹니다.', { en: 'A queue takes out the first item first. Next week we cover trees.', vi: 'Hàng đợi lấy ra phần tử vào trước. Tuần sau chúng ta học cây.' }]];
    const cap = { room_id: 'demo-cap-1', section_id: sec.section_id, title: '3차시 대면 수업 자막', src_lang: 'ko', langs: ['ko', 'en', 'vi'], code: 'demo.' + rnd(10), status: 'closed', visibility: 'public', created_at: ago(9000), finished_at: ago(8940), live_room_id: null,
      transcript: L.map(x => x[0]).join('\n'), summary: '- 스택: 나중에 넣은 것을 먼저 꺼냄(LIFO)\n- 큐: 먼저 넣은 것을 먼저 꺼냄(FIFO)\n한 줄 요약: 두 자료구조의 꺼내는 순서 차이', summary_engine: 'rule',
      lines: L.map(([t, tr], i) => ({ seq: i + 1, text: t, tr, tr_engine: { en: 'ai', vi: 'ai' }, source: 'stt', edited: false, at: ago(9000 - i) })), views: { en: ['a', 'b', 'c'], vi: ['d', 'e'] } };
    return { v: 1, sections: [sec, sec2], rooms: [done, ready, link], peers: [], evts: { 'demo-room-0': [{ id: 1, kind: 'chat', by: '20261001', body: { text: '질문 있습니다!' }, at: done.started_at }, { id: 2, kind: 'qa', by: '20261002', body: { text: '연결 리스트와 배열의 삽입 비용 차이는?' }, at: done.started_at }, { id: 3, kind: 'answer', ref: 2, by: '교수자', body: { text: '배열은 O(n), 연결 리스트는 위치를 알면 O(1)입니다.' }, at: done.started_at }] },
      att, recs: [{ rec_id: 'demo-rec-0', room_id: done.room_id, mime: 'video/webm', parts: 0, bytes: 0, status: 'done', res_id: 'demo-res', retain_until: new Date(t0 + 170 * 864e5).toISOString(), created_at: done.started_at, done_at: done.ended_at, views: 7, room_title: done.title, consent: { host: true, days: 180 } }],
      setting: { stun_urls: ['stun:stun.l.google.com:19302'], turn_urls: [], turn_user: null, turn_cred_set: false, sfu_url: null, mesh_max: 6, fanout_max: 25, rec_days: 180, att_min_pct: 70 },
      caps: [cap], capset: {}, audio: [], seq: 10 };
  }
  /* v38 데모 저장소는 기관(데이터룸)별 키 — 스튜디오는 DREG.cur(), 학습자 앱은 LR.tid. 빈 스튜디오 기관은 샘플 없이 시작한다 */
  const tidOf = () => { try { if (typeof DREG !== 'undefined' && DREG.cur && DREG.cur()) return DREG.cur(); } catch (e) { } try { if (typeof LR !== 'undefined' && LR && LR.tid) return LR.tid; } catch (e) { } return ''; };
  const kOf = () => { const t = tidOf(); return t ? KEY + '.' + t : KEY; };
  const emptyOrg = () => { try { if (typeof S !== 'undefined' && S && S.org) return !!S.org.empty; } catch (e) { } try { const r = typeof demoRoom === 'function' ? demoRoom() : null; return !!(r && r.org && r.org.empty); } catch (e) { return false; } };
  function seedFor() { const d = seed(); if (!emptyOrg()) return d; return { ...d, sections: [], rooms: [], peers: [], evts: {}, att: {}, recs: [], caps: [], capset: {}, audio: [] }; }
  function db() { let d = null; try { d = JSON.parse(localStorage.getItem(kOf()) || 'null'); } catch (e) { } if (!d || d.v !== 1) { d = seedFor(); save(d); } return d; }
  function save(d) { try { localStorage.setItem(kOf(), JSON.stringify(d)); } catch (e) { } }
  const LIM = '실시간 수업은 브라우저끼리 직접 연결합니다. 소그룹(메시)은 최대 6명 발언, 방송은 교수자 1명이 설정 인원까지 직접 보냅니다. 그보다 큰 수업은 SFU 연동 후 동작합니다.';
  const secOf = (d, id) => d.sections.find(s => s.section_id === id);
  const roomJ = (d, r) => ({ ...r, section_title: (secOf(d, r.section_id) || {}).title || '', online: d.peers.filter(p => p.room_id === r.room_id && p.state === 'on' && Date.now() - p.seen < 30e3).length, recording: d.recs.some(c => c.room_id === r.room_id && c.status === 'rec') });
  const capJ = c => { const { lines, views, transcript, summary, ...o } = c; return { ...o, has_transcript: transcript != null, has_summary: summary != null, lines: lines.length, viewers: Object.values(views || {}).reduce((a, x) => a + x.length, 0) }; };
  function attRows(d, r) {
    const st = d.setting; const dur = Math.max(1, Math.round(((r.ended_at ? Date.parse(r.ended_at) : Date.now()) - (r.started_at ? Date.parse(r.started_at) : Date.now())) / 1000)); const s = secOf(d, r.section_id); const A = d.att[r.room_id] || [];
    return [...s.students.map(m => ['regular', m]), ...s.audit.map(m => ['audit', m])].sort((a, b) => a[1].localeCompare(b[1])).map(([kind, m]) => { const t = A.find(x => x.member_no === m); const pct = Math.min(100, Math.round((t ? t.sec : 0) * 100 / dur));
      return { member_no: m, kind, first_at: t ? t.first_at : null, last_at: t ? t.last_at : null, sec: t ? t.sec : 0, joins: t ? t.joins : 0, pct, status: kind === 'audit' ? null : !t || pct < st.att_min_pct ? 'absent' : Date.parse(t.first_at) > Date.parse(r.started_at) + 10 * 60e3 ? 'late' : 'present' }; });
  }
  /* 규칙 번역(데모 · 서버 규칙과 같은 사전 일부) */
  const DICT = { en: { 안녕하세요: 'Hello', 여러분: 'everyone', 오늘: 'today', 수업: 'class', 강의: 'lecture', 과제: 'assignment', 시험: 'exam', 질문: 'question', 예제: 'example', 개념: 'concept', 데이터: 'data', 알고리즘: 'algorithm', 자료구조: 'data structure', 배열: 'array', 스택: 'stack', 큐: 'queue', 트리: 'tree', 그래프: 'graph', 정렬: 'sorting', 함수: 'function', 감사합니다: 'thank you', '다음 주': 'next week' },
    ja: { 안녕하세요: 'こんにちは', 여러분: '皆さん', 오늘: '今日', 수업: '授業', 데이터: 'データ', 스택: 'スタック', 큐: 'キュー', 트리: '木', 자료구조: 'データ構造', 감사합니다: 'ありがとうございます' },
    zh: { 안녕하세요: '你好', 여러분: '大家', 오늘: '今天', 수업: '课', 데이터: '数据', 스택: '栈', 큐: '队列', 트리: '树', 자료구조: '数据结构', 감사합니다: '谢谢' },
    vi: { 안녕하세요: 'Xin chào', 여러분: 'các bạn', 오늘: 'hôm nay', 수업: 'lớp học', 데이터: 'dữ liệu', 자료구조: 'cấu trúc dữ liệu', 감사합니다: 'cảm ơn' } };
  const ruleTr = (t, src, dst) => { const m = src === 'ko' && DICT[dst]; if (!m) return t; let o = t; Object.keys(m).sort((a, b) => b.length - a.length).forEach(k => { o = o.split(k).join(m[k]); }); return o; };
  const ruleSum = t => { const S = String(t || '').split(/(?<=[.?!。])\s+|\n+/).map(x => x.trim()).filter(x => x.length >= 8); const W = {}; S.forEach(s => (s.toLowerCase().match(/[0-9a-z가-힣]{2,}/g) || []).forEach(w => { W[w] = (W[w] || 0) + 1; }));
    const sc = S.map((x, n) => ({ n, x, s: Object.entries(W).filter(([w, c]) => c >= 2 && x.toLowerCase().includes(w)).reduce((a, [, c]) => a + c, 0) })); return sc.sort((a, b) => b.s - a.s || a.n - b.n).slice(0, 5).sort((a, b) => a.n - b.n).map(z => '- ' + z.x).join('\n') || '(요약할 문장이 없습니다)'; };

  /* 데모 신호: 같은 브라우저 탭끼리 */
  const inbox = {}; let bc = null;
  function chan() { if (bc || typeof BroadcastChannel === 'undefined') return bc; bc = new BroadcastChannel('ddlv-demo'); bc.onmessage = e => { const m = e.data || {}; if (m.t === 'sig') (inbox[m.to] = inbox[m.to] || []).push(m.s); }; return bc; }
  const sigPush = (to, s) => { (inbox[to] = inbox[to] || []).push(s); const c = chan(); if (c) c.postMessage({ t: 'sig', to, s }); };
  /* 데모 녹화 조각(IndexedDB) */
  const idb = () => new Promise((ok, no) => { const q = indexedDB.open('ddlv-demo', 1); q.onupgradeneeded = () => q.result.createObjectStore('parts'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
  const idbPut = async (k, v) => { const x = await idb(); return new Promise((ok, no) => { const t = x.transaction('parts', 'readwrite'); t.objectStore('parts').put(v, k); t.oncomplete = ok; t.onerror = () => no(t.error); }); };
  const idbGet = async k => { const x = await idb(); return new Promise((ok, no) => { const q = x.transaction('parts').objectStore('parts').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }); };

  async function DEMO(method, path, body) {
    chan(); const u = new URL(path, 'http://x'); const q = u.searchParams; const k = method + ' ' + u.pathname.replace('/api/lms/live/', ''); const b = body || {}; const d = db(); const me = window.LV.demoMe || { kind: 'staff' };
    const R = id => { const r = d.rooms.find(x => x.room_id === id || x.code === id); if (!r) err(404, '실시간 수업을 찾을 수 없습니다.', 'room'); return r; };
    const C = id => { const c = d.caps.find(x => x.room_id === id); if (!c) err(404, '자막방을 찾을 수 없습니다.', 'room'); return c; };
    const P = () => { const p = d.peers.find(x => x.peer_id === b.peer_id); if (!p) err(404, '연결 정보를 찾을 수 없습니다. 다시 입장하세요.', 'peer'); if ((d.rooms.find(x => x.room_id === p.room_id) || {}).status === 'ended') err(409, '수업이 끝났습니다. 참여해 주셔서 감사합니다.', 'ended'); if (p.state === 'replaced') err(409, '다른 기기 · 창에서 같은 학번으로 입장해 이 화면의 연결을 끊었습니다(중복 접속 차단).', 'replaced'); if (p.state !== 'on') err(409, '연결이 끊겼습니다. 다시 입장하세요.', 'left'); return p; };
    const evt = (rid, e) => { const L = d.evts[rid] = d.evts[rid] || []; e.id = (d.seq = (d.seq || 10) + 1); e.at = now(); L.push(e); return e; };
    const fin = v => { save(d); return JSON.parse(JSON.stringify(v)); };
    d.peers.forEach(p => { if (p.state === 'on' && Date.now() - p.seen > 30e3) p.state = 'left'; });
    switch (k) {
      case 'GET setting': return fin({ ...d.setting, limits: LIM });
      case 'POST setting': Object.assign(d.setting, b, { turn_cred_set: !!(b.turn_cred || d.setting.turn_cred_set) }); delete d.setting.turn_cred; return fin({ ...d.setting, limits: LIM });
      case 'GET sections': return fin({ sections: d.sections });
      case 'GET rooms': return fin({ rooms: d.rooms.filter(r => !q.get('section_id') || r.section_id === q.get('section_id')).slice().sort((x, y) => y.created_at.localeCompare(x.created_at)).map(r => roomJ(d, r)), limits: LIM });
      case 'POST room': { if (!b.title) err(400, '수업 제목을 입력하세요.', 'required'); if (b.mode === 'link' && !/^https:\/\//.test(b.ext_url || '')) err(400, '외부 화상(Zoom · Teams) 주소를 https://로 넣으세요.', 'ext_url');
        let r = b.room_id ? R(b.room_id) : null; if (!r) { r = { room_id: uid(), section_id: b.section_id || d.sections[0].section_id, status: 'ready', code: 'demo.' + rnd(10), created_at: now(), att: null }; d.rooms.push(r); }
        Object.assign(r, { title: b.title, mode: b.mode || 'mesh', ext_url: b.ext_url || null, rec_allowed: !!b.rec_allowed, session_id: null }); return fin({ room: roomJ(d, r) }); }
      case 'GET room': { const r = R(q.get('room_id')); return fin({ room: roomJ(d, r), peers: d.peers.filter(p => p.room_id === r.room_id && p.state === 'on') }); }
      case 'POST room-state': { const r = R(b.room_id); if (r.status === 'ended') err(409, '이미 끝난 수업입니다.', 'ended');
        if (b.status === 'live') { if (r.status === 'live') err(409, '이미 진행 중입니다.', 'live'); r.status = 'live'; r.started_at = now(); evt(r.room_id, { kind: 'sys', by: '시스템', body: { text: '수업을 시작했습니다.' } }); return fin({ room: roomJ(d, r) }); }
        if (r.status !== 'live') err(409, '시작하지 않은 수업입니다.', 'not_live'); r.status = 'ended'; r.ended_at = now(); d.peers.filter(p => p.room_id === r.room_id).forEach(p => { p.state = 'left'; }); d.recs.filter(c => c.room_id === r.room_id && c.status === 'rec').forEach(c => { c.status = 'done'; });
        evt(r.room_id, { kind: 'sys', by: '시스템', body: { text: '수업을 마쳤습니다.' } }); const rows = attRows(d, r); const cnt = s => rows.filter(x => x.status === s).length;
        r.att = { written: r.session_id ? rows.filter(x => x.status).length : 0, kept: 0, session: !!r.session_id, present: cnt('present'), late: cnt('late'), absent: cnt('absent') }; return fin({ room: roomJ(d, r), attendance: r.att, rows }); }
      case 'GET attendance': { const r = R(q.get('room_id')); return fin({ room: roomJ(d, r), min_pct: d.setting.att_min_pct, duration_sec: r.started_at ? Math.round(((r.ended_at ? Date.parse(r.ended_at) : Date.now()) - Date.parse(r.started_at)) / 1000) : 0, rows: attRows(d, r), final: r.status === 'ended' }); }
      case 'GET summary': { const r = R(q.get('room_id')); const E = d.evts[r.room_id] || [];
        return fin({ room: roomJ(d, r), chat: E.filter(e => e.kind === 'chat').length, hands: E.filter(e => e.kind === 'hand').length, qa: E.filter(e => e.kind === 'qa').map(e => ({ id: e.id, by: e.by, text: e.body.text, at: e.at, answers: E.filter(x => x.kind === 'answer' && x.ref === e.id).map(x => x.body.text) })),
          polls: E.filter(e => e.kind === 'poll').map(e => ({ id: e.id, text: e.body.text, options: e.body.options, closed: E.some(x => x.kind === 'close' && x.ref === e.id), tally: e.body.options.map((_, i) => E.filter(v => v.kind === 'vote' && v.ref === e.id && v.body.choice === i).length) })), chat_log: E.filter(e => e.kind === 'chat').map(e => ({ by: e.by, text: e.body.text, at: e.at })) }); }
      case 'POST join': { const r = R(b.room_id || b.code); if (r.status === 'ended') err(409, '이미 끝난 수업입니다.', 'ended'); const host = me.kind === 'staff'; const s = secOf(d, r.section_id);
        if (!host && ![...s.students, ...s.audit].includes(me.sid)) err(403, '이 분반 수강생이 아닙니다(데모 학번: ' + s.students.join(', ') + ').', 'not_enrolled');
        if (!host && r.rec_allowed && !b.consent_rec) err(428, '이 수업은 녹화될 수 있습니다. 녹화 안내에 동의한 뒤 입장하세요.', 'rec_consent');
        if (r.mode === 'link') return fin({ room: roomJ(d, r), role: host ? 'host' : 'student', ext_url: r.ext_url, peer: null });
        const owner = host ? 'u:demo' : 'm:' + me.sid; let rep = 0; d.peers.filter(p => p.owner === owner && p.state === 'on').forEach(p => { p.state = 'replaced'; rep++; sigPush(p.peer_id, { id: Date.now(), from: p.peer_id, kind: 'kick', data: { reason: 'replaced' } }); });
        const n = d.peers.filter(p => p.room_id === r.room_id && p.state === 'on' && p.role === 'student').length;
        if (!host && r.mode === 'mesh' && n + 1 >= d.setting.mesh_max) err(409, `소그룹 수업 정원(${d.setting.mesh_max}명)이 찼습니다.`, 'full');
        if (!host && r.mode === 'broadcast' && n >= d.setting.fanout_max && !d.setting.sfu_url) err(409, `방송 수업 직접 연결 한도(${d.setting.fanout_max}명)를 넘었습니다. 대규모 수업은 SFU 연동 후 동작합니다.`, 'full');
        const p = { peer_id: uid(), room_id: r.room_id, role: host ? 'host' : 'student', owner, member_no: host ? null : me.sid, label: host ? '교수자' : me.sid, state: 'on', hand: false, seen: Date.now(), joined: Date.now() }; d.peers.push(p);
        if (!host && r.status === 'live') { const A = d.att[r.room_id] = d.att[r.room_id] || []; const t = A.find(x => x.member_no === me.sid); if (t) { t.joins++; t.last_at = now(); } else A.push({ member_no: me.sid, first_at: now(), last_at: now(), sec: 0, joins: 1 }); }
        return fin({ room: roomJ(d, r), role: p.role, peer: { peer_id: p.peer_id, label: p.label }, replaced: rep, ice: d.setting.stun_urls.map(u2 => ({ urls: u2 })), sfu: null, limits: { mesh_max: d.setting.mesh_max, fanout_max: d.setting.fanout_max }, last_sig: 0, last_evt: 0 }); }
      case 'POST leave': { const p = d.peers.find(x => x.peer_id === b.peer_id); if (p && p.state === 'on') { p.state = 'left'; d.peers.filter(x => x.room_id === p.room_id && x.state === 'on').forEach(x => sigPush(x.peer_id, { id: Date.now(), from: p.peer_id, kind: 'bye', data: {} })); } return fin({ ok: true }); }
      case 'POST signal': { const p = P(); if (!b.to) err(400, '받는 연결(to)을 지정하세요.', 'to'); sigPush(b.to, { id: Date.now() + Math.random(), from: p.peer_id, kind: b.kind, data: b.data }); return fin({ id: 0 }); }
      case 'POST poll': { const p = P(); const r = R(p.room_id); const was = p.seen; p.seen = Date.now();
        if (p.role === 'student' && r.status === 'live') { const A = d.att[r.room_id] = d.att[r.room_id] || []; let t = A.find(x => x.member_no === p.member_no); if (!t) A.push(t = { member_no: p.member_no, first_at: now(), last_at: now(), sec: 0, joins: 1 }); else if (Date.now() - was <= 20e3) { t.sec += Math.floor((Date.now() - Date.parse(t.last_at)) / 1000); t.last_at = now(); } }
        const sig = (inbox[p.peer_id] || []).splice(0); const es = +b.esince || 0; const E = (d.evts[r.room_id] || []).filter(e => e.id > es && (e.kind !== 'vote' || p.role === 'host' || e.peer_id === p.peer_id));
        const cap = d.caps.filter(c => c.live_room_id === r.room_id && c.status === 'live').pop();
        return fin({ room: { status: r.status, mode: r.mode, title: r.title, recording: d.recs.some(c => c.room_id === r.room_id && c.status === 'rec'), cap: cap ? { code: cap.code, src_lang: cap.src_lang, langs: cap.langs } : null }, me: { peer_id: p.peer_id, role: p.role, hand: p.hand },
          peers: d.peers.filter(x => x.room_id === r.room_id && x.state === 'on').sort((x, y) => x.joined - y.joined).map(x => ({ peer_id: x.peer_id, role: x.role, label: x.label, hand: x.hand })), signals: sig, events: E, last_sig: 0, last_evt: Math.max(es, ...E.map(e => e.id), 0) }); }
      case 'POST event': { const p = P(); const r = R(p.room_id); const E = d.evts[r.room_id] = d.evts[r.room_id] || []; const kk = b.kind;
        if (['answer', 'poll', 'close'].includes(kk) && p.role !== 'host') err(403, '교수자만 할 수 있습니다.', 'host_only');
        if (['chat', 'qa', 'answer'].includes(kk) && !String(b.text || '').trim()) err(400, '내용을 입력하세요.', 'required');
        if (kk === 'hand' || kk === 'lower') { if (b.to && p.role === 'host') { const t = d.peers.find(x => x.peer_id === b.to); if (t) t.hand = false; } else p.hand = kk === 'hand'; }
        let body2 = { text: b.text };
        if (kk === 'poll') { if (!Array.isArray(b.options) || b.options.length < 2 || b.options.length > 6) err(400, '보기는 2~6개입니다.', 'options'); body2 = { text: b.text, options: b.options }; }
        if (kk === 'vote' || kk === 'close') { const pl = E.find(e => e.id === +b.ref && e.kind === 'poll'); if (!pl) err(404, '투표를 찾을 수 없습니다.', 'poll'); if (E.some(e => e.kind === 'close' && e.ref === pl.id)) err(409, '마감된 투표입니다.', 'poll_closed');
          if (kk === 'vote') { if (E.some(e => e.kind === 'vote' && e.ref === pl.id && e.member_no === p.member_no)) err(409, '이미 투표했습니다.', 'voted'); body2 = { choice: +b.choice }; }
          else body2 = { text: pl.body.text, options: pl.body.options, tally: pl.body.options.map((_, i) => E.filter(v => v.kind === 'vote' && v.ref === pl.id && v.body.choice === i).length) }; }
        const e = evt(r.room_id, { kind: kk, by: p.label, member_no: p.member_no, peer_id: p.peer_id, ref: b.ref ? +b.ref : null, body: body2 }); return fin({ event: e }); }
      case 'GET my': { const sid = me.sid; return fin({ member_no: sid, rooms: d.rooms.filter(r => r.status !== 'ended' && (secOf(d, r.section_id) || { students: [] }).students.concat(secOf(d, r.section_id).audit).includes(sid)).map(r => roomJ(d, r)), captions: d.caps.filter(c => c.visibility === 'public').map(c => ({ room_id: c.room_id, title: c.title, src_lang: c.src_lang, finished_at: c.finished_at, has_summary: !!c.summary })) }); }
      case 'POST rec-start': { const r = R(b.room_id); if (!r.rec_allowed) err(403, '이 수업은 녹화를 허용하지 않았습니다.', 'rec_off'); if (r.status !== 'live') err(409, '수업을 시작한 뒤 녹화할 수 있습니다.', 'not_live'); if (!b.consent) err(428, '녹화 안내에 동의하세요.', 'consent');
        const c = { rec_id: uid(), room_id: r.room_id, mime: b.mime || 'video/webm', parts: 0, bytes: 0, status: 'rec', retain_until: new Date(Date.now() + d.setting.rec_days * 864e5).toISOString(), created_at: now(), views: 0, room_title: r.title, consent: { host: true, days: d.setting.rec_days } }; d.recs.push(c);
        evt(r.room_id, { kind: 'rec', by: '시스템', body: { on: true, text: '녹화를 시작했습니다.' } }); return fin({ rec: c }); }
      case 'POST rec-part': { const c = d.recs.find(x => x.rec_id === b.rec_id); if (!c) err(404, '녹화를 찾을 수 없습니다.', 'rec'); await idbPut(c.rec_id + ':' + c.parts, b.b64); c.parts++; c.bytes += Math.floor(b.b64.length * 3 / 4); return fin({ rec_id: c.rec_id, parts: c.parts, bytes: c.bytes }); }
      case 'POST rec-finish': { const c = d.recs.find(x => x.rec_id === b.rec_id); if (!c) err(404, '녹화를 찾을 수 없습니다.', 'rec'); c.status = 'done'; c.done_at = now(); c.res_id = 'demo-res-' + rnd(4); c.visible = !!b.publish; evt(c.room_id, { kind: 'rec', by: '시스템', body: { on: false, text: '녹화를 마쳤습니다.' } }); return fin({ rec: c, resource: { res_id: c.res_id, visible: !!b.publish } }); }
      case 'POST rec-delete': { const c = d.recs.find(x => x.rec_id === b.rec_id); if (!c) err(404, '녹화를 찾을 수 없습니다.', 'rec'); c.status = 'deleted'; c.deleted_at = now(); c.delete_reason = 'manual'; return fin({ rec: c }); }
      case 'GET recs': d.recs.forEach(c => { if (c.status !== 'deleted' && Date.parse(c.retain_until) < Date.now()) { c.status = 'deleted'; c.delete_reason = 'retention'; } }); return fin({ purged: 0, recs: d.recs.filter(c => !q.get('room_id') || c.room_id === q.get('room_id')).slice().reverse() });
      case 'GET rec': { const c = d.recs.find(x => x.rec_id === q.get('rec_id')); if (!c) err(404, '녹화를 찾을 수 없습니다.', 'rec'); if (c.status === 'deleted') err(410, '파기된 녹화입니다.', 'deleted'); if (!c.parts) err(404, '데모 샘플 녹화에는 영상 파일이 없습니다. 수업 화면에서 직접 녹화해 보세요.', 'part');
        const i = +(q.get('idx') || 0); if (!i) c.views = (c.views || 0) + 1; return fin({ rec_id: c.rec_id, idx: i, parts: c.parts, mime: c.mime, b64: await idbGet(c.rec_id + ':' + i) }); }
      case 'GET rec-views': { const c = d.recs.find(x => x.rec_id === q.get('rec_id')); return fin({ rec: c, views: Array.from({ length: c.views || 0 }, (_, i) => ({ who: 'm:2026100' + (1 + i % 5), at: c.done_at || c.created_at })) }); }
      case 'GET cap-setting': { const s = d.capset[q.get('section_id')] || {}; return fin({ section_id: q.get('section_id'), saved: !!s.src_lang, enabled: s.enabled !== false, src_lang: s.src_lang || 'ko', langs: s.langs || ['ko', 'en'], visibility: s.visibility || 'private' }); }
      case 'POST cap-setting': { if (!Array.isArray(b.langs) || !b.langs.length || b.langs.length > 4) err(400, '자막 언어는 1~4개입니다.', 'lang'); d.capset[b.section_id] = { enabled: b.enabled !== false, src_lang: b.src_lang || 'ko', langs: b.langs, visibility: b.visibility || 'private' }; return fin({ section_id: b.section_id, saved: true, ...d.capset[b.section_id] }); }
      case 'GET cap-rooms': return fin({ rooms: d.caps.filter(c => !q.get('section_id') || c.section_id === q.get('section_id')).slice().reverse().map(capJ) });
      case 'POST cap-room': { const s = d.capset[b.section_id] || {}; if (s.enabled === false) err(403, '이 강의는 실시간 자막을 쓰지 않도록 설정되어 있습니다.', 'cap_off'); const langs = b.langs || s.langs || ['ko', 'en']; if (langs.length > 4) err(400, '자막 언어는 1~4개입니다.', 'lang'); if (!b.title) err(400, '제목을 입력하세요.', 'required');
        const c = { room_id: uid(), section_id: b.section_id || null, title: b.title, src_lang: b.src_lang || s.src_lang || 'ko', langs, code: 'demo.' + rnd(10), status: 'live', visibility: b.visibility || s.visibility || 'private', created_at: now(), finished_at: null, live_room_id: b.live_room_id || null, transcript: null, summary: null, lines: [], views: {} }; d.caps.push(c); return fin({ room: capJ(c) }); }
      case 'POST cap-seg': { const c = C(b.room_id); if (c.status !== 'live') err(409, '종료된 자막방입니다.', 'closed'); const t = String(b.text || '').trim(); if (!t) err(400, '자막 문장을 입력하세요.', 'required'); const l = { seq: c.lines.length + 1, text: t.slice(0, 1000), tr: {}, tr_engine: {}, source: b.source || 'stt', edited: false, at: now() }; c.lines.push(l); return fin({ line: l }); }
      case 'GET cap-lines': { const c = C(q.get('room_id')); return fin({ room: capJ(c), lines: c.lines.filter(l => l.seq > (+q.get('since') || 0)) }); }
      case 'POST cap-edit': { const c = C(b.room_id); const l = c.lines.find(x => x.seq === +b.seq); if (!l) err(404, '자막 문장을 찾을 수 없습니다.', 'line'); if (b.text) l.text = b.text; if (b.tr) Object.entries(b.tr).forEach(([kk, v]) => { l.tr[kk] = v; l.tr_engine[kk] = 'manual'; }); l.edited = true; return fin({ line: l }); }
      case 'POST cap-translate': { const c = C(b.room_id); let n = 0; c.lines.forEach(l => c.langs.filter(x => x !== c.src_lang && !(x in l.tr)).forEach(x => { l.tr[x] = ruleTr(l.text, c.src_lang, x); l.tr_engine[x] = 'rule'; n++; })); return fin({ saved: n, engine: n ? 'rule' : null, lines: c.lines.slice(-20), ai_error: n ? 'demo' : null, note: n ? '데모: 규칙 번역(강의 용어 사전)으로 채웠습니다. 운영 서버에서는 AI 번역을 씁니다.' : null }); }
      case 'POST cap-finish': { const c = C(b.room_id); c.status = 'closed'; c.finished_at = c.finished_at || now(); if (c.transcript == null) c.transcript = c.lines.map(l => l.text).join('\n'); return fin({ room: capJ(c), transcript: c.transcript }); }
      case 'GET cap-transcript': { const c = C(q.get('room_id')); return fin({ room: capJ(c), transcript: c.transcript != null ? c.transcript : c.lines.map(l => l.text).join('\n'), summary: c.summary, saved: c.transcript != null }); }
      case 'POST cap-script': { const c = C(b.room_id); if ('transcript' in b) c.transcript = b.transcript; if ('summary' in b) { c.summary = b.summary; c.summary_engine = 'manual'; } if (b.visibility) c.visibility = b.visibility; return fin({ room: capJ(c), transcript: c.transcript, summary: c.summary }); }
      case 'POST cap-summary': { const c = C(b.room_id); const t = c.transcript != null ? c.transcript : c.lines.map(l => l.text).join('\n'); if (!t.trim()) err(422, '요약할 자막이 없습니다.', 'empty'); c.summary = ruleSum(t); c.summary_engine = 'rule'; return fin({ room: capJ(c), summary: c.summary, engine: 'rule', ai_error: 'demo' }); }
      case 'GET cap-stats': { const L = d.caps.flatMap(c => c.lines); const tr = {}, eng = {}, vw = {}; L.forEach(l => Object.entries(l.tr_engine || {}).forEach(([x, e]) => { tr[x] = (tr[x] || 0) + 1; eng[e] = (eng[e] || 0) + 1; })); d.caps.forEach(c => Object.entries(c.views || {}).forEach(([x, v]) => { vw[x] = (vw[x] || 0) + v.length; }));
        return fin({ days: 30, rooms: d.caps.length, lines: L.length, stt: L.filter(l => l.source === 'stt').length, manual: L.filter(l => l.source === 'manual').length, edited: L.filter(l => l.edited).length, translated: tr, engines: eng, viewers: vw, minutes: d.caps.length * 3, public: d.caps.filter(c => c.visibility === 'public').length, summaries: d.caps.filter(c => c.summary).length,
          by_section: d.sections.map(s => ({ section_id: s.section_id, title: s.title, rooms: d.caps.filter(c => c.section_id === s.section_id).length, lines: d.caps.filter(c => c.section_id === s.section_id).reduce((a, c) => a + c.lines.length, 0) })) }); }
      case 'POST cap-audio': { const c = C(b.room_id); const j = { job_id: uid(), room_id: c.room_id, files: (b.file_ids || []).length, lang: c.src_lang, hook: 'lmsVodSubtitleJob', status: 'queued', created_at: now() }; d.audio.push(j); return fin({ job: j }); }
      case 'GET cap-audio': return fin({ jobs: d.audio.filter(j => j.room_id === q.get('room_id')).reverse() });
      case 'GET cap-view': { const c = d.caps.find(x => x.code === q.get('code')); if (!c) err(404, '자막방을 찾을 수 없습니다.', 'room'); const lang = q.get('lang') || null; const v = q.get('v');
        if (v && lang) { const V = c.views[lang] = c.views[lang] || []; if (!V.includes(v)) V.push(v); }
        return fin({ room: { title: c.title, src_lang: c.src_lang, langs: c.langs, status: c.status }, lang, lines: c.lines.filter(l => l.seq > (+q.get('since') || 0)).map(l => ({ seq: l.seq, text: l.text, tr: lang && lang !== c.src_lang ? (l.tr[lang] == null ? null : l.tr[lang]) : null, engine: lang && lang !== c.src_lang ? l.tr_engine[lang] || null : null, edited: l.edited })) }); }
      case 'POST e-file': return fin({ file_id: uid(), name: b.name, mime: b.mime, size: Math.floor((b.b64 || '').length * 3 / 4) });
    }
    err(404, '데모에서 지원하지 않는 기능입니다.', 'not_found');
  }

  async function api(method, path, body) {
    if (mode !== 'live') return DEMO(method, path, body);
    const r = await fetch(path, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; throw e; } return j;
  }
  /* 파일 → 2MB 조각 base64 */
  const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  /* QR(묶음 O의 부호기를 쓴다 — 없으면 주소만) */
  function qr(text) { const M = typeof window.lmsoQr === 'function' ? window.lmsoQr(text) : null; if (!M) return ''; const N = M.length + 8; let p = ''; M.forEach((row, y) => row.forEach((dd, x) => { if (dd) p += `M${x + 4} ${y + 4}h1v1h-1z`; })); return `<svg viewBox="0 0 ${N} ${N}" role="img" aria-label="접속 QR" shape-rendering="crispEdges"><rect width="${N}" height="${N}" fill="#fff"/><path d="${p}" fill="#000"/></svg>`; }
  const base = () => location.origin + location.pathname.replace(/[^/]*$/, '');
  window.LV = { LN, SR, api, b64, qr, uid, ruleTr, ruleSum, demoMe: null, setMode: m => { mode = m; }, mode: () => mode, demoDb: db, demoReset: () => { try { localStorage.removeItem(kOf()); } catch (e) { } },
    url: hash => base() + 'liveclass.html#' + hash, LIMIT: LIM };
})();
