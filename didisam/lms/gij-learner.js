/* v30 학사 LMS 묶음 G · I · J — 학습자 앱 화면(learner.html의 「내 학습」에 카드로 붙는다)
   ① 출석하기: 인증번호 · QR(카메라 BarcodeDetector, 안 되면 직접 입력) · 사진(위치 제공 동의 후 위치 · 일시만) · NFC(Web NFC) · 비콘(앱 연동 지점), 본인 재인증 표시
   ② 내 출결 · 진도: 분반별 출석 · 지각 · 결석 · 공결, 차시별 상태, 강의 영상 진도율
   ③ 강의 영상: 이어보기 · 1.0~2.0배속 · 자막(언어 선택 · 대본) · 영상 중간 퀴즈 · 10초 하트비트(동시 재생 차단)
   ④ 성찰일지: 주차별 작성 · 교수 코멘트 확인
   운영: 학습자 포털 세션(dd_lsid)으로 G · I · J API를 부른다 — 학번은 서버가 세션에서 정한다(본문 member_no는 무시).
     GET  /api/lms/g/my                → {member_no, found, sections:[{section_id, title, rule:{methods, require_identity, …}, sessions:[{session_id, week_no, seq, kind, starts_at, room, status, method, open}], sum}]}
     POST /api/lms/g/checkin           {session_id, method: code|qr|nfc|ble|photo, code?, qr?, tag_id?, lat?, lng?, taken_at?, idv?} → {session_id, member_no, status, method, evidence}
     GET  /api/lms/i/my                → {sections:[{section_id, title, contents:[{content_id, title, pct, last_pos, subtitles, quizzes, …}]}]}
     POST /api/lms/i/play/start · beat · end, GET /api/lms/i/subtitles · quizzes, POST /api/lms/i/quiz/answer
     POST /api/lms/j/reflection {section_id, week_no, body, mood}, GET /api/lms/j/reflections?section_id=
   데모: 이 브라우저의 기관 데이터룸(S.lms.w3)을 읽기만 한다(기록은 운영 서버에서). */
(function () {
  'use strict';
  if (typeof viewMy !== 'function' || typeof LR !== 'object') return;
  const on = () => { try { const o = SITE() && SITE().org; return !!(o && o.type === 'univ' && o.ed === 'lms' && LR.me); } catch (e) { return false; } };
  const live = () => LR.mode === 'live';
  const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? ''));
  const T = (m, k) => { try { toast(m, k); } catch (e) { } };
  const re = () => { if (typeof lrender === 'function') lrender(); };
  try { if (!document.querySelector('link[data-gij]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/gij-learner.css?v=30.0'; l.dataset.gij = '1'; document.head.appendChild(l); } } catch (e) { }
  const ST = { g: null, i: null, refl: {}, busy: {}, err: '', ses: '', m: 'code', res: null, geo: null, play: null, tab: 'att' };
  const ERRT = { not_open: '아직 출석 시간이 아닙니다.', closed: '출석 인정 시간이 지났습니다.', dup: '이미 출석했습니다.' };
  const ST_N = { present: '출석', late: '지각', absent: '결석', excused: '공결' };
  const MTH = [['code', '인증번호'], ['qr', 'QR'], ['photo', '사진'], ['nfc', 'NFC'], ['ble', '비콘']];
  const mmss = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  const fmt = t => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  /* ── 데모: 기관 데이터룸 읽기 ── */
  function room() { try { const r = typeof demoRoom === 'function' ? demoRoom() : null; return r && r.lms && r.lms.w3; } catch (e) { return null; } }
  function demoG() { const W = room(); const m = String(LR.me.sid || ''); const p = W && W.persons.find(x => x.member_no === m); if (!p) return { member_no: m, found: false, sections: [] };
    const now = Date.now(); return { member_no: m, found: true, sections: W.sections.filter(s => (p.secs || []).includes(s.section_id)).map(s => { const r = Object.assign({ methods: ['code', 'qr', 'nfc', 'ble', 'photo', 'online', 'manual'], require_identity: false, absent_after_min: 30 }, W.rule[s.section_id] || {});
      const ss = W.sessions.filter(x => x.section_id === s.section_id).sort((a, b) => a.week_no - b.week_no || a.seq - b.seq).map(x => { const a = W.att[x.session_id + '|' + p.person_id]; const t = Date.parse(x.starts_at); return { session_id: x.session_id, week_no: x.week_no, seq: x.seq, kind: x.kind, starts_at: x.starts_at, room: x.room, status: a ? a.status : null, method: a ? a.method : null, reason: a ? a.reason : null, open: x.kind !== 'holiday' && now >= t - 6e5 && now <= t + r.absent_after_min * 6e4 }; });
      const c = k => ss.filter(x => x.status === k).length; return { section_id: s.section_id, title: s.title, term_id: s.term_id, mode: s.mode, kind: p.ekind, rule: r, sessions: ss, sum: { present: c('present'), late: c('late'), absent: c('absent'), excused: c('excused'), past: ss.filter(x => x.kind !== 'holiday' && Date.parse(x.starts_at) <= now).length } }; }) }; }
  function demoI() { const W = room(); const m = String(LR.me.sid || ''); const p = W && W.persons.find(x => x.member_no === m); if (!p) return { member_no: m, found: false, sections: [] };
    return { member_no: m, found: true, sections: W.sections.filter(s => (p.secs || []).includes(s.section_id)).map(s => { const cts = W.contents.map(c => ({ c, x: W.sessions.find(z => z.session_id === c.session_id) })).filter(o => o.x && o.x.section_id === s.section_id).sort((a, b) => a.x.week_no - b.x.week_no || a.x.seq - b.x.seq);
      const L = cts.map(({ c, x }) => { const g = W.prog[c.content_id + '|' + p.person_id] || {}; return { content_id: c.content_id, week_no: x.week_no, seq: x.seq, title: c.title, duration_sec: c.duration_sec, open_at: x.open_at, close_at: x.close_at, pct: g.pct || 0, watched_sec: g.watched_sec || 0, last_pos: g.last_pos || 0, completed: !!g.completed_at, subtitles: Object.keys(W.subs).filter(k => k.startsWith(c.content_id + '|')).map(k => k.split('|')[1]).sort(), quizzes: W.quizzes.filter(q => q.content_id === c.content_id).length }; });
      return { section_id: s.section_id, title: s.title, term_id: s.term_id, contents: L, avg_pct: L.length ? Math.round(L.reduce((a, x) => a + x.pct, 0) / L.length) : 0 }; }) }; }
  function demoRefl(sid) { const W = room(); const p = W && W.persons.find(x => x.member_no === String(LR.me.sid || '')); if (!p) return []; return (W.refl || []).filter(r => r.section_id === sid && r.person_id === p.person_id).sort((a, b) => b.week_no - a.week_no).map(r => ({ ...r, member_no: p.member_no })); }
  const load = (k, path, demo) => { if (!live()) return demo(); if (ST[k] == null && !ST.busy[k]) { ST.busy[k] = 1; api('GET', path).then(r => { ST[k] = r; }).catch(e => { ST.err = e.message; ST[k] = { found: false, sections: [], err: e.message }; }).finally(() => { delete ST.busy[k]; re(); }); } return ST[k]; };
  const G = () => load('g', '/api/lms/g/my', demoG); const I = () => load('i', '/api/lms/i/my', demoI);

  /* x3: 분반 본인 확인 규칙(운영: /api/lms/g/idv의 rules · 데모: 기관 데이터룸 S.lms.w3.idvRule) */
  function idvRule(secId) { if (live()) { if (ST.idv == null && !ST.busy.idv) { ST.busy.idv = 1; api('GET', '/api/lms/g/idv').then(r => { ST.idv = r; }).catch(() => { ST.idv = { rules: [] }; }).finally(() => { delete ST.busy.idv; re(); }); } const r = ST.idv && ST.idv.rules.find(x => x.section_id === secId); return r ? r.method : 'none'; }
    const W = room(); return (W && W.idvRule && W.idvRule[secId]) || 'none'; }
  /* ── ① 출석하기 ── */
  function cAtt(g) {
    const open = g.sections.flatMap(s => s.sessions.filter(x => x.open && !x.status).map(x => ({ ...x, sec: s })));
    const res = ST.res ? `<p class="gij-res ${ST.res.ok ? 'ok' : 'bad'}" role="status">${E(ST.res.msg)}</p>` : '';
    if (!open.length) return `${res}<p class="mini">지금 출석할 수 있는 수업이 없습니다. 수업 시작 10분 전부터 출석할 수 있습니다.</p>`;
    const cur = open.find(x => x.session_id === ST.ses) || open[0]; ST.ses = cur.session_id; const ms = MTH.filter(([k]) => cur.sec.rule.methods.includes(k)); if (!ms.some(([k]) => k === ST.m)) ST.m = (ms[0] || ['code'])[0];
    const bd = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const box = { code: `<label class="gij-f">교수님이 알려 준 인증번호 6자리<input id="gijCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>`,
      qr: `${bd ? `<button class="lbtn sm" data-lact="gij-scan">카메라로 QR 찍기</button><video id="gijCam" playsinline muted class="gij-cam" hidden></video>` : '<p class="mini">이 기기 · 브라우저는 카메라 QR 인식을 지원하지 않습니다. QR 아래의 내용을 직접 붙여 넣으세요.</p>'}<label class="gij-f">QR 내용(직접 입력)<input id="gijQr" maxlength="200" placeholder="DDATT1.…"></label>`,
      photo: `<label class="gij-ck"><input type="checkbox" id="gijGeoOk" ${ST.geo ? 'checked' : ''}> 출석 확인을 위해 촬영 위치(위도 · 경도)와 일시를 학교에 제공하는 데 동의합니다. 사진 · 얼굴 정보는 저장하지 않습니다.</label>
        <label class="gij-f">사진 촬영<input type="file" id="gijPh" accept="image/*" capture="user"></label><button class="lbtn sm ghost" data-lact="gij-geo">현재 위치 가져오기</button>
        <div class="gij-2"><label class="gij-f">위도<input id="gijLat" inputmode="decimal" value="${ST.geo ? ST.geo.lat : ''}"></label><label class="gij-f">경도<input id="gijLng" inputmode="decimal" value="${ST.geo ? ST.geo.lng : ''}"></label></div>`,
      nfc: `<button class="lbtn sm" data-lact="gij-nfc">${'NDEFReader' in window ? '강의실 NFC 태그에 대기' : 'NFC 읽기 — 앱에서 동작'}</button><label class="gij-f">태그 ID<input id="gijTag" maxlength="64"></label>`,
      ble: `<button class="lbtn sm" data-lact="gij-ble">${window.DidisamApp && window.DidisamApp.scanBeacon ? '강의실 비콘 찾기' : '비콘 찾기 — 앱 · 비콘 장비 연동 후 동작'}</button><label class="gij-f">비콘 ID<input id="gijTag" maxlength="64"></label>` }[ST.m];
    return `<label class="gij-f">수업<select id="gijSes" data-lch="gij-ses">${open.map(x => `<option value="${E(x.session_id)}" ${x.session_id === cur.session_id ? 'selected' : ''}>${E(x.sec.title)} · ${x.week_no}주 ${x.seq}차 · ${E(fmt(x.starts_at))} · ${E(x.room || '')}</option>`).join('')}</select></label>
      <div class="gij-seg" role="tablist">${ms.map(([k, l]) => `<button role="tab" aria-selected="${k === ST.m}" class="${k === ST.m ? 'on' : ''}" data-lact="gij-m" data-v="${k}">${l}</button>`).join('')}</div>${box || ''}
      ${(m => m !== 'none' ? `<p class="mini gij-idv">이 수업은 출석 전 <b>${E(IDV.ML[m] || m)}</b>으로 본인 확인을 합니다(대리출석 방지). [출석하기]를 누르면 확인 창이 열립니다. <button class="lbtn sm ghost" data-lact="gij-idvm">본인 확인 수단 관리</button></p>` : '')(idvRule(cur.sec.section_id))}
      ${cur.sec.rule.require_identity ? `<label class="gij-ck"><input type="checkbox" id="gijIdv"> 본인 재인증을 마쳤습니다(학교 SSO 재인증 — 연동 후 자동 처리)</label>` : ''}
      <button class="lbtn" data-lact="gij-go">출석하기</button>${res}`;
  }
  /* ── ② 내 출결 · 진도 ── */
  function cMine(g, i) {
    return g.sections.map(s => { const u = s.sum; const rate = u.past ? Math.round(100 * (u.present + u.late + u.excused) / u.past) : 100; const vi = (i && i.sections || []).find(x => x.section_id === s.section_id);
      return `<div class="gij-sec"><b>${E(s.title)}</b>${s.kind === 'audit' ? ' <small>청강(출석 대상 아님)</small>' : ''}<div class="gij-kp"><span>출석률 <b>${rate}%</b></span><span>출석 ${u.present}</span><span>지각 ${u.late}</span><span>결석 ${u.absent}</span><span>공결 ${u.excused}</span>${vi ? `<span>영상 진도 <b>${vi.avg_pct}%</b></span>` : ''}</div>
        <div class="gij-cells" aria-label="차시별 출결">${s.sessions.map(x => `<i class="st-${x.status || (x.kind === 'holiday' ? 'h' : 'n')}" title="${x.week_no}주 ${x.seq}차 ${x.status ? ST_N[x.status] : x.kind === 'holiday' ? '휴강' : '미기록'}">${x.week_no}</i>`).join('')}</div></div>`; }).join('') || '<p class="mini">수강 중인 분반이 없습니다.</p>';
  }
  /* ── ③ 강의 영상 ── */
  function cVid(i) {
    const P = ST.play;
    if (P) return `<div class="gij-player"><div class="gij-scr" id="gijScr">${P.src && /^https?:/.test(P.src) ? `<video id="gijV" src="${E(P.src)}" playsinline></video>` : `<span>가상 영상 — ${E(P.title)}</span>`}<div class="gij-capt" id="gijCapt"></div>${P.quiz ? `<div class="gij-quiz" role="dialog" aria-label="영상 퀴즈"><b>${E(P.quiz.question)}</b>${P.quiz.options.map((o, n) => `<button data-lact="gij-ans" data-i="${n}">${n + 1}. ${E(o)}</button>`).join('')}</div>` : ''}</div>
      <input type="range" id="gijPos" min="0" max="${P.duration_sec}" value="${Math.floor(P.pos)}" aria-label="재생 위치" data-lch="gij-seek">
      <div class="gij-ctl"><button class="lbtn sm" data-lact="gij-toggle">${P.on ? '일시정지' : '재생'}</button><select data-lch="gij-rate" aria-label="배속">${[1, 1.25, 1.5, 1.75, 2].map(r => `<option value="${r}" ${r === P.rate ? 'selected' : ''}>${r}x</option>`).join('')}</select>
        <select data-lch="gij-lang" aria-label="자막">${['', ...(P.langs || [])].map(l => `<option value="${l}" ${l === P.lang ? 'selected' : ''}>${l ? l.toUpperCase() : '자막 끄기'}</option>`).join('')}</select><span class="mini" id="gijTime">${mmss(P.pos)} / ${mmss(P.duration_sec)}</span><button class="lbtn sm ghost" data-lact="gij-close">닫기</button></div>
      <p class="mini" id="gijStat">학습 인정 ${mmss(P.watched_sec || 0)} · 진도 ${P.pct || 0}% · 본 구간만 인정(건너뛴 구간 불인정)</p>
      <div class="gij-tr" id="gijTr">${(P.cues || []).map((c, n) => `<button data-lact="gij-cue" data-i="${n}"><small>${mmss(c.s)}</small> ${E(c.t)}</button>`).join('')}</div></div>`;
    return (i.sections || []).map(s => `<div class="gij-sec"><b>${E(s.title)}</b> <small>평균 진도 ${s.avg_pct}%</small><ul class="gij-ul">${s.contents.map(c => `<li><span>${c.week_no}주 · ${E(c.title)} <small>${mmss(c.duration_sec)}${c.subtitles.length ? ' · 자막 ' + c.subtitles.join('/') : ''}${c.quizzes ? ' · 퀴즈 ' + c.quizzes : ''}</small></span><span class="gij-bar"><i style="width:${c.pct}%"></i></span><button class="lbtn sm ghost" data-lact="gij-play" data-c="${E(c.content_id)}">${c.pct >= 90 ? '다시 보기' : c.last_pos ? '이어 보기' : '보기'}</button></li>`).join('')}</ul></div>`).join('') || '<p class="mini">강의 영상이 없습니다.</p>';
  }
  /* ── ④ 성찰일지 ── */
  function cRefl(g) {
    const s = g.sections[0]; if (!s) return '<p class="mini">수강 중인 분반이 없습니다.</p>';
    const sid = ST.rsec && g.sections.some(x => x.section_id === ST.rsec) ? ST.rsec : s.section_id; ST.rsec = sid;
    let L = live() ? ST.refl[sid] : demoRefl(sid); if (live() && L == null && !ST.busy['r' + sid]) { ST.busy['r' + sid] = 1; api('GET', '/api/lms/j/reflections?section_id=' + encodeURIComponent(sid)).then(r => { ST.refl[sid] = r; }).catch(() => { ST.refl[sid] = []; }).finally(() => { delete ST.busy['r' + sid]; re(); }); }
    const wk = Math.min(15, Math.max(1, Math.ceil((Date.now() - Date.parse('2026-09-07')) / 6048e5)));
    return `${g.sections.length > 1 ? `<label class="gij-f">분반<select data-lch="gij-rsec">${g.sections.map(x => `<option value="${E(x.section_id)}" ${x.section_id === sid ? 'selected' : ''}>${E(x.title)}</option>`).join('')}</select></label>` : ''}
      <div class="gij-2"><label class="gij-f">주차<input type="number" id="gijRw" min="1" max="20" value="${wk}"></label><label class="gij-f">이번 주 느낌<select id="gijRm"><option value="5">매우 좋음</option><option value="4">좋음</option><option value="3" selected>보통</option><option value="2">어려움</option><option value="1">매우 어려움</option></select></label></div>
      <textarea id="gijRb" rows="4" maxlength="4000" placeholder="배운 것 · 어려웠던 것 · 다음 주 계획" aria-label="성찰일지"></textarea><button class="lbtn sm" data-lact="gij-refl">저장</button>
      ${(L || []).map(r => `<div class="gij-rf"><b>${r.week_no}주차</b> <small>${E(fmt(r.created_at))}</small><p>${E(r.body)}</p>${r.comment ? `<p class="gij-cm"><b>교수 코멘트</b> ${E(r.comment)}</p>` : ''}</div>`).join('')}`;
  }
  function card() {
    const g = G(), i = I(); const head = '<div class="myhead"><h2>출석 · 강의 · 성찰</h2></div>';
    if (!g || !i) return `<div class="mycard wide" id="gijMy">${head}<p class="mini">${ST.err ? E(ST.err) : '불러오는 중입니다.'}</p></div>`;
    if (!g.found) return `<div class="mycard wide" id="gijMy">${head}<p class="mini">${g.err ? E(g.err) : '학사 정보에 등록된 학번이 아닙니다. 학교 학사 담당 부서에 문의하세요.'}</p></div>`;
    const tabs = [['att', '출석하기'], ['mine', '내 출결 · 진도'], ['vid', '강의 영상'], ['refl', '성찰일지']];
    const body = { att: () => cAtt(g), mine: () => cMine(g, i), vid: () => cVid(i), refl: () => cRefl(g) }[ST.tab]();
    return `<div class="mycard wide" id="gijMy">${head}<p class="mini">학번 ${E(g.member_no)}${live() ? '' : ' · 데모 화면(기록은 운영 서버에서 저장됩니다)'}</p><div class="gij-seg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === ST.tab}" class="${k === ST.tab ? 'on' : ''}" data-lact="gij-tab" data-v="${k}">${l}</button>`).join('')}</div>${body}</div>`;
  }
  { const base = viewMy; viewMy = function (...a) { const h = base.apply(this, a); if (!on()) return h; try { const c = card(); return h.includes('<div class="mygrid">') ? h.replace('<div class="mygrid">', '<div class="mygrid">' + c) : c + h; } catch (e) { console.error('gij my', e); return h; } }; } // eslint-disable-line no-global-assign

  /* ═════════ x3 · SFR-016 대리출석 방지: 본인 확인 창(window.DDIDV) — 출석 직전 · 시험 시작 전 ═════════
     패스키(WebAuthn: 지문 · 얼굴 인식 · 기기 PIN, 서버에는 공개키만) · 인증 앱(TOTP 6자리) · 이메일 인증번호(학교 메일 게이트웨이 연동 후 발송).
     문자(SMS)는 학교 문자 게이트웨이 연동 후 동작. 데모: 패스키는 이 브라우저의 실제 패스키 창을 띄워 보고(안 되면 '데모 통과'), 인증 앱 번호는 이 브라우저가 직접 계산해 확인한다. */
  const IDV = (() => {
    const b2u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const u2b = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
    const ML = { webauthn: '패스키(지문 · 얼굴 인식)', totp: '인증 앱 6자리', any: '패스키 또는 인증 앱', email: '이메일 인증번호' };
    const PU = { checkin: '출석 전', exam: '시험 시작 전' };
    const I = { st: null, req: null, msg: '', busy: false, secret: null, otpauth: null, mailSent: false, done: null };
    const devName = () => { const u = navigator.userAgent; return /iphone|ipad/i.test(u) ? 'iPhone · iPad' : /android/i.test(u) ? 'Android 휴대폰' : /mac/i.test(u) ? 'Mac' : /windows/i.test(u) ? 'Windows PC' : '내 기기'; };
    /* 데모 저장(이 브라우저에만): 등록한 패스키 · 인증 앱 비밀키 · 발급한 확인 표 */
    const dk = () => 'dd_demo_idv_' + String(LR.me && LR.me.sid || '');
    const dGet = () => { try { return JSON.parse(localStorage.getItem(dk()) || '{}'); } catch (e) { return {}; } };
    const dSet = v => { try { localStorage.setItem(dk(), JSON.stringify(v)); } catch (e) { } };
    const tickets = [];
    const issue = (purpose, ref, method) => { const t = { ticket: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), purpose, ref, method, at: Date.now(), used: false }; tickets.push(t); return t.ticket; };
    function take(purpose, ref, rule) { const t = tickets.find(x => !x.used && x.purpose === purpose && x.ref === ref && Date.now() - x.at < 6e5 && (rule === 'any' || x.method === rule)); if (!t) return false; t.used = true; return true; }
    async function totpAt(secret, step) {
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, v = 0; const out = []; for (const ch of secret) { v = (v << 5) | A.indexOf(ch); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } }
      const k = await crypto.subtle.importKey('raw', new Uint8Array(out), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']); const c = new DataView(new ArrayBuffer(8)); c.setUint32(4, step);
      const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, c.buffer)); const o = h[19] & 15; return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
    }
    const live = () => LR.mode === 'live';
    async function status() { if (live()) return api('GET', '/api/lms/g/idv'); const d = dGet(); return { passkeys: d.passkeys || [], totp: { enrolled: !!d.secret, confirmed: !!d.totpOk } }; }
    async function refresh() { try { I.st = await status(); } catch (e) { I.msg = e.message; } draw(); }
    const allow = m => !I.req || I.req.method === 'any' ? true : I.req.method === m;
    function html() {
      const s = I.st; const R = I.req; const pk = 'PublicKeyCredential' in window; const n = s ? s.passkeys.length : 0;
      const head = `<header><b>본인 확인</b><button class="lbtn sm ghost" data-ddidv="close" aria-label="닫기">닫기</button></header>`;
      if (!s) return head + '<p class="mini">불러오는 중입니다.</p>';
      const sec = [];
      if (R) sec.push(`<p class="mini">${PU[R.purpose] || ''} ${ML[R.method] || ''}으로 본인임을 확인합니다. 대리출석 · 대리응시를 막기 위한 절차입니다.</p>`);
      else sec.push('<p class="mini">출석 · 시험 전에 쓸 본인 확인 수단을 관리합니다.</p>');
      if (allow('webauthn')) sec.push(`<section><h4>패스키(지문 · 얼굴 인식 · 기기 PIN)</h4><p class="mini">생체 정보는 이 기기 밖으로 나가지 않고, 학교 서버에는 공개키만 저장됩니다. 등록된 패스키 ${n}개${n ? ': ' + s.passkeys.map(p => esc(p.label || '내 기기')).join(', ') : ''}.</p>
        ${pk ? '' : '<p class="mini ddidv-w">이 브라우저는 패스키를 지원하지 않습니다. 최신 크롬 · 엣지 · 사파리를 쓰거나 인증 앱을 쓰세요.</p>'}
        <div class="efl-acts">${R && n ? `<button class="lbtn sm" data-ddidv="wa">패스키로 확인</button>` : ''}<button class="lbtn sm ${R && n ? 'ghost' : ''}" data-ddidv="wareg">${n ? '이 기기도 등록' : '이 기기를 패스키로 등록'}</button>${!R && n ? s.passkeys.map(p => `<button class="lbtn sm ghost" data-ddidv="wadel" data-v="${esc(p.cred_id)}">${esc(p.label || '내 기기')} 지우기</button>`).join('') : ''}${!live() && R ? '<button class="lbtn sm ghost" data-ddidv="wademo">데모: 확인된 것으로 처리</button>' : ''}</div></section>`);
      if (allow('totp')) sec.push(`<section><h4>인증 앱(6자리 번호)</h4>${!s.totp.confirmed ? (I.secret ? `<p class="mini">구글 · 마이크로소프트 인증 앱 등에 아래 키를 추가한 뒤, 앱에 보이는 6자리를 넣으세요.</p><p class="ddidv-key">${esc(I.secret.replace(/(.{4})/g, '$1 ').trim())}</p><p class="mini"><a href="${esc(I.otpauth)}">휴대폰에서 인증 앱으로 열기</a></p>
          <div class="ddidv-row"><input id="ddidvT" inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="인증 앱 번호"><button class="lbtn sm" data-ddidv="totpok">등록 확인</button>${!live() ? '<button class="lbtn sm ghost" data-ddidv="totpfill">데모: 지금 번호 채우기</button>' : ''}</div>` : `<p class="mini">휴대폰 인증 앱에 학교 계정을 추가합니다.</p><button class="lbtn sm" data-ddidv="totpnew">인증 앱 등록</button>`)
        : R ? `<div class="ddidv-row"><input id="ddidvT" inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="인증 앱 번호" placeholder="6자리"><button class="lbtn sm" data-ddidv="totp">번호로 확인</button>${!live() ? '<button class="lbtn sm ghost" data-ddidv="totpfill">데모: 지금 번호 채우기</button>' : ''}</div>` : `<p class="mini">등록됨 · <button class="lbtn sm ghost" data-ddidv="totpreset">다시 등록</button></p>`}</section>`);
      if (R && allow('email')) sec.push(`<section><h4>이메일 인증번호</h4><p class="mini">학교 메일로 6자리를 보냅니다(학교 메일 게이트웨이 연동 후 발송).</p><div class="ddidv-row">${I.mailSent ? `<input id="ddidvM" inputmode="numeric" maxlength="6" aria-label="이메일 인증번호"><button class="lbtn sm" data-ddidv="mailok">확인</button>` : '<button class="lbtn sm" data-ddidv="mail">인증번호 받기</button>'}</div></section>`);
      if (R) sec.push('<p class="mini">문자(SMS) 인증은 학교 문자 게이트웨이 연동 후 동작합니다.</p>');
      return head + sec.join('') + (I.msg ? `<p class="mini ddidv-w" role="alert">${esc(I.msg)}</p>` : '');
    }
    function draw() { let w = document.getElementById('ddidv'); if (!I.open) { if (w) w.remove(); return; } if (!w) { w = document.createElement('div'); w.id = 'ddidv'; w.className = 'ddidv'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', '본인 확인'); document.body.appendChild(w); }
      w.innerHTML = `<div class="ddidv-in">${html()}</div>`; }
    function finish(ticket) { const f = I.done; I.open = false; I.done = null; draw(); if (f) f(ticket || null); }
    async function run(fn) { if (I.busy) return; I.busy = true; I.msg = ''; try { await fn(); } catch (e) { I.msg = e && e.name === 'NotAllowedError' ? '기기 확인이 취소되었거나 시간이 지났습니다. 다시 시도하세요.' : (e.message || String(e)); } finally { I.busy = false; draw(); } }
    async function waReg() {
      if (!('PublicKeyCredential' in window)) throw new Error('이 브라우저는 패스키를 지원하지 않습니다.');
      if (!live()) { const ch = crypto.getRandomValues(new Uint8Array(32)); let id = 'demo-' + Date.now();
        try { const c = await navigator.credentials.create({ publicKey: { challenge: ch, rp: { name: '디디쌤(데모)' }, user: { id: new TextEncoder().encode('demo|' + LR.me.sid), name: String(LR.me.sid), displayName: '학번 ' + LR.me.sid }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { userVerification: 'required' }, timeout: 60000, attestation: 'none' } }); id = b2u(c.rawId); }
        catch (e) { if (e && e.name === 'NotAllowedError') throw e; toast('데모: 이 기기에서 패스키를 만들 수 없어 가상 패스키로 등록합니다.', 'bad'); }
        const d = dGet(); d.passkeys = [...(d.passkeys || []), { cred_id: id, label: devName(), created_at: new Date().toISOString() }]; dSet(d); toast('패스키를 등록했습니다(데모).'); return refresh(); }
      const o = await api('POST', '/api/lms/g/wa-options', { purpose: 'register' });
      const c = await navigator.credentials.create({ publicKey: { challenge: u2b(o.challenge), rp: { id: o.rp_id, name: o.rp_name }, user: { id: u2b(o.user.id), name: o.user.name, displayName: o.user.display_name }, pubKeyCredParams: o.algs.map(alg => ({ type: 'public-key', alg })),
        authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' }, timeout: o.timeout_ms, attestation: 'none', excludeCredentials: (o.exclude || []).map(id => ({ type: 'public-key', id: u2b(id) })) } });
      const R = c.response; const pk = R.getPublicKey && R.getPublicKey(); if (!pk || !R.getAuthenticatorData) throw new Error('이 브라우저는 패스키 공개키를 꺼내 주지 않습니다. 최신 브라우저로 다시 시도하세요.');
      await api('POST', '/api/lms/g/wa-register', { ch_id: o.ch_id, client_data_json: b2u(R.clientDataJSON), authenticator_data: b2u(R.getAuthenticatorData()), public_key: b2u(pk), alg: R.getPublicKeyAlgorithm(), cred_id: b2u(c.rawId), label: devName() });
      toast('패스키를 등록했습니다.'); await refresh();
    }
    async function waVerify() { const R = I.req;
      if (!live()) { const d = dGet(); const ids = (d.passkeys || []).map(p => p.cred_id).filter(id => !/^demo-/.test(id));
        if (ids.length && 'PublicKeyCredential' in window) { try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: ids.map(id => ({ type: 'public-key', id: u2b(id) })), userVerification: 'required', timeout: 60000 } }); } catch (e) { if (e && e.name === 'NotAllowedError') throw e; } }
        toast('본인 확인을 마쳤습니다(데모).'); return finish(issue(R.purpose, R.ref, 'webauthn')); }
      const o = await api('POST', '/api/lms/g/wa-options', { purpose: R.purpose, ref: R.ref });
      const a = await navigator.credentials.get({ publicKey: { challenge: u2b(o.challenge), rpId: o.rp_id, allowCredentials: (o.allow || []).map(id => ({ type: 'public-key', id: u2b(id) })), userVerification: 'required', timeout: o.timeout_ms } });
      const t = await api('POST', '/api/lms/g/wa-verify', { ch_id: o.ch_id, cred_id: b2u(a.rawId), client_data_json: b2u(a.response.clientDataJSON), authenticator_data: b2u(a.response.authenticatorData), signature: b2u(a.response.signature) });
      toast('본인 확인을 마쳤습니다.'); finish(t.ticket);
    }
    async function totpNew(reset) { if (!live()) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; const r = crypto.getRandomValues(new Uint8Array(32)); const sec = [...r].map(x => A[x % 32]).join(''); const d = dGet(); d.secret = sec; d.totpOk = false; d.step = 0; dSet(d); I.secret = sec; I.otpauth = `otpauth://totp/${encodeURIComponent('디디쌤:' + LR.me.sid)}?secret=${sec}&issuer=${encodeURIComponent('디디쌤')}&digits=6&period=30`; return refresh(); }
      const r = await api('POST', '/api/lms/g/totp-new', reset ? { reset: true } : {}); I.secret = r.secret; I.otpauth = r.otpauth; await refresh(); }
    async function totpCheck(enroll) { const code = (document.getElementById('ddidvT') || {}).value?.trim() || ''; const R = I.req;
      if (!live()) { const d = dGet(); const st = Math.floor(Date.now() / 30000); let ok = false; for (const x of [st - 1, st, st + 1]) if (x > (d.step || 0) && await totpAt(d.secret || '', x) === code) { d.step = x; ok = true; break; }
        if (!ok) throw new Error('번호가 맞지 않거나 이미 쓴 번호입니다. 인증 앱의 새 번호를 넣으세요.'); d.totpOk = true; dSet(d); if (enroll) { I.secret = null; toast('인증 앱을 등록했습니다(데모).'); return refresh(); } toast('본인 확인을 마쳤습니다(데모).'); return finish(issue(R.purpose, R.ref, 'totp')); }
      const r = await api('POST', '/api/lms/g/totp-verify', enroll ? { code } : { purpose: R.purpose, ref: R.ref, code }); if (r.ok === false) throw new Error(r.message);
      if (enroll) { I.secret = null; toast('인증 앱을 등록했습니다.'); return refresh(); } toast('본인 확인을 마쳤습니다.'); finish(r.ticket); }
    async function totpFill() { const d = dGet(); const s = I.secret || d.secret; if (!s) return; const v = await totpAt(s, Math.floor(Date.now() / 30000)); const el = document.getElementById('ddidvT'); if (el) el.value = v; }
    async function mail() { const R = I.req; if (!live()) { const c = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, '0'); I.demoMail = c; I.mailSent = true; toast(`데모: 인증번호 ${c} (운영에서는 학교 메일로 발송됩니다)`); return; }
      await api('POST', '/api/lms/g/email-code', { purpose: R.purpose, ref: R.ref }); I.mailSent = true; toast('인증번호 요청을 등록했습니다. 학교 메일을 확인하세요.'); }
    async function mailOk() { const R = I.req; const code = (document.getElementById('ddidvM') || {}).value?.trim() || '';
      if (!live()) { if (code !== I.demoMail) throw new Error('인증번호가 맞지 않습니다.'); return finish(issue(R.purpose, R.ref, 'email')); }
      const r = await api('POST', '/api/lms/g/email-verify', { purpose: R.purpose, ref: R.ref, code }); if (r.ok === false) throw new Error(r.message); finish(r.ticket); }
    document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-ddidv]'); if (!el) return; e.preventDefault(); const a = el.dataset.ddidv;
      if (a === 'close') return finish(null);
      if (a === 'wareg') run(waReg); if (a === 'wa') run(waVerify); if (a === 'wademo') { toast('데모: 본인 확인을 통과한 것으로 처리합니다.'); finish(issue(I.req.purpose, I.req.ref, I.req.method === 'any' ? 'webauthn' : I.req.method)); }
      if (a === 'wadel') run(async () => { if (live()) await api('POST', '/api/lms/g/wa-delete', { cred_id: el.dataset.v }); else { const d = dGet(); d.passkeys = (d.passkeys || []).filter(p => p.cred_id !== el.dataset.v); dSet(d); } await refresh(); });
      if (a === 'totpnew') run(() => totpNew(false)); if (a === 'totpreset') run(() => totpNew(true)); if (a === 'totpok') run(() => totpCheck(true)); if (a === 'totp') run(() => totpCheck(false)); if (a === 'totpfill') totpFill();
      if (a === 'mail') run(mail); if (a === 'mailok') run(mailOk); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && I.open) finish(null); });
    try { if (!document.getElementById('ddidvCss')) { const s = document.createElement('style'); s.id = 'ddidvCss'; s.textContent = '.ddidv{position:fixed;inset:0;z-index:60;background:rgba(17,24,39,.55);display:flex;align-items:center;justify-content:center;padding:16px}.ddidv-in{background:var(--bg,#fff);color:var(--ink,#111827);border-radius:12px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.25)}.ddidv-in header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.ddidv-in section{border-top:1px solid var(--line,#e5e7eb);padding:10px 0}.ddidv-in h4{margin:0 0 4px;font-size:14px}.ddidv-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ddidv-row input{width:120px;font-size:18px;letter-spacing:2px;padding:6px}.ddidv-key{font-family:monospace;font-size:15px;word-break:break-all;background:var(--soft,#f3f4f6);padding:6px;border-radius:6px}.ddidv-w{color:#b45309}'; document.head.appendChild(s); } } catch (e) { }
    return {
      /* 확인 창을 열고 표(ticket)를 돌려준다(취소하면 null) */
      ensure(purpose, ref, method) { return new Promise(ok => { Object.assign(I, { open: true, req: { purpose, ref, method: method || 'any' }, msg: '', secret: null, mailSent: false, done: ok, st: null }); draw(); refresh(); }); },
      manage() { Object.assign(I, { open: true, req: null, msg: '', secret: null, done: null, st: null }); draw(); refresh(); },
      take, ML
    };
  })();
  window.DDIDV = IDV;

  /* ── 동작 ── */
  const $1 = s => document.querySelector(s);
  async function checkin() {
    const b = { session_id: ST.ses, method: ST.m };
    if (ST.m === 'code') b.code = ($1('#gijCode') || {}).value?.trim(); if (ST.m === 'qr') b.qr = ($1('#gijQr') || {}).value?.trim(); if (ST.m === 'nfc' || ST.m === 'ble') b.tag_id = ($1('#gijTag') || {}).value?.trim();
    if (ST.m === 'photo') { if (!$1('#gijGeoOk')?.checked) { ST.res = { ok: 0, msg: '위치 정보 제공에 동의해야 사진 출석을 할 수 있습니다.' }; re(); return; } const la = $1('#gijLat')?.value.trim(), lo = $1('#gijLng')?.value.trim(); if (la) b.lat = +la; if (lo) b.lng = +lo; const f = $1('#gijPh')?.files?.[0]; b.taken_at = new Date(f && f.lastModified ? f.lastModified : Date.now()).toISOString(); }
    if ($1('#gijIdv')?.checked) b.idv = 'sso-reauth-pending';
    { const sec = (G().sections || []).find(x => x.sessions.some(z => z.session_id === ST.ses)); const m = sec ? idvRule(sec.section_id) : 'none';
      if (m !== 'none') { const t = await IDV.ensure('checkin', ST.ses, m); if (!t) { ST.res = { ok: 0, msg: '본인 확인을 마치지 않아 출석하지 않았습니다.' }; re(); return; } if (live()) b.idv = t; else IDV.take('checkin', ST.ses, m); } }
    if (!live()) { ST.res = { ok: 1, msg: '데모 화면입니다. 운영 서버에 연결되면 이 내용으로 출석이 기록됩니다.' }; re(); return; }
    try { const r = await api('POST', '/api/lms/g/checkin', b); ST.res = { ok: 1, msg: `${ST_N[r.status]} 처리되었습니다 · ${fmt(r.evidence && r.evidence.at)}` }; ST.g = null; } catch (e) { ST.res = { ok: 0, msg: e.message }; }
    re();
  }
  let camStream = null;
  async function scanQR() {
    const v = $1('#gijCam'); if (!v) return;
    try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch (e) { T('카메라를 쓸 수 없습니다(권한 · 기기 정책). QR 내용을 직접 입력하세요.', 'bad'); return; }
    v.hidden = false; v.srcObject = camStream; await v.play().catch(() => { }); const det = new window.BarcodeDetector({ formats: ['qr_code'] }); const t0 = Date.now();
    const stopCam = () => { if (camStream) camStream.getTracks().forEach(t => t.stop()); camStream = null; v.hidden = true; };
    const loop = async () => { if (!camStream) return; try { const c = await det.detect(v); const q = c.find(x => /^DDATT1\./.test(x.rawValue)); if (q) { $1('#gijQr').value = q.rawValue; stopCam(); T('QR을 읽었습니다. 출석하기를 누르세요.'); return; } } catch (e) { } if (Date.now() - t0 > 30000) { stopCam(); T('QR을 찾지 못했습니다. 직접 입력하세요.', 'bad'); return; } requestAnimationFrame(loop); };
    loop();
  }
  /* 플레이어 */
  let timer = 0, last = 0;
  const stop = () => { if (timer) clearInterval(timer); timer = 0; if (ST.play) ST.play.on = false; };
  async function call(m, p, b) { if (!live()) return null; return api(m, p, b); }
  async function beat() { const P = ST.play; if (!P || !P.play_id) return; const pos = Math.floor(P.pos), from = Math.floor(P.from);
    try { const r = await call('POST', '/api/lms/i/play/beat', { play_id: P.play_id, from, pos: Math.max(pos, from), rate: P.rate }); if (r) { P.watched_sec = r.watched_sec; P.pct = r.pct; const s = $1('#gijStat'); if (s) s.textContent = `학습 인정 ${mmss(r.watched_sec)} · 진도 ${r.pct}%${r.completed ? ' · 완료' : ''}`; } P.from = pos; }
    catch (e) { stop(); T(/바뀐 재생|play_over/.test(e.message + e.code) ? '다른 기기에서 재생을 시작해 이 재생을 멈췄습니다.' : e.message, 'bad'); ST.play = null; re(); } }
  function paint() { const P = ST.play; if (!P) return; const r = $1('#gijPos'); if (r && document.activeElement !== r) r.value = Math.floor(P.pos); const t = $1('#gijTime'); if (t) t.textContent = `${mmss(P.pos)} / ${mmss(P.duration_sec)}`;
    const k = (P.cues || []).findIndex(c => P.pos >= c.s && P.pos < c.e); const cp = $1('#gijCapt'); if (cp) cp.textContent = k >= 0 ? P.cues[k].t : '';
    document.querySelectorAll('#gijTr button').forEach((b, n) => { const o = n === k; if (o !== b.classList.contains('on')) { b.classList.toggle('on', o); if (o) b.scrollIntoView({ block: 'nearest' }); } }); }
  function tick() { const P = ST.play; if (!P || !$1('#gijScr')) { stop(); return; } const n = Date.now(); const v = $1('#gijV'); P.pos = v ? v.currentTime : Math.min(P.duration_sec, P.pos + (n - last) / 1000 * P.rate); last = n;
    const q = (P.quizzes || []).find(x => !x.mine && !x.skip && P.pos >= x.at_sec && P.pos - x.at_sec < 3); if (q) { P.quiz = q; stop(); if (v) v.pause(); beat(); re(); return; }
    if (Math.floor(P.pos) - P.from >= 10) beat(); if (P.pos >= P.duration_sec) { stop(); beat(); re(); } paint(); }
  async function subsFor(cid, lang) { if (live()) { try { return await api('GET', '/api/lms/i/subtitles?content_id=' + encodeURIComponent(cid)); } catch (e) { return []; } } const W = room(); return Object.entries((W && W.subs) || {}).filter(([k]) => k.startsWith(cid + '|')).map(([k, x]) => ({ lang: k.split('|')[1], cues: x.cues })); }
  async function startPlay(cid) {
    const i = I(); const c = (i.sections || []).flatMap(s => s.contents).find(x => x.content_id === cid); if (!c) return; stop();
    let st = { content_id: cid, title: c.title, duration_sec: c.duration_sec, resume_pos: c.last_pos >= c.duration_sec - 5 ? 0 : c.last_pos, src: null, watched_sec: c.watched_sec, pct: c.pct, play_id: null };
    if (live()) { try { const r = await api('POST', '/api/lms/i/play/start', { content_id: cid }); if (r.blocked) { T('다른 기기 · 창에서 재생 중입니다. 동시 재생은 허용되지 않습니다.', 'bad'); return; } st = r; } catch (e) { T(e.message, 'bad'); return; } }
    const subs = await subsFor(cid); const pick = subs.find(x => x.lang === 'ko') || subs[0];
    let qz = []; if (live()) { try { qz = await api('GET', '/api/lms/i/quizzes?content_id=' + encodeURIComponent(cid)); } catch (e) { } } else { const W = room(); qz = ((W && W.quizzes) || []).filter(q => q.content_id === cid).map(q => ({ ...q, demoAnswer: q.answer, answer: null, mine: null })); }
    ST.play = { ...st, pos: st.resume_pos, from: st.resume_pos, rate: 1, on: false, langs: subs.map(x => x.lang), subs, lang: pick ? pick.lang : '', cues: pick ? pick.cues : [], quizzes: qz, quiz: null }; re(); toggle();
  }
  function toggle() { const P = ST.play; if (!P) return; const v = $1('#gijV'); if (P.on) { stop(); if (v) v.pause(); beat(); } else { P.on = true; last = Date.now(); if (v) { v.currentTime = P.pos; v.playbackRate = P.rate; v.play().catch(() => { }); } timer = setInterval(tick, 250); } const b = $1('[data-lact="gij-toggle"]'); if (b) b.textContent = P.on ? '일시정지' : '재생'; }
  async function answer(n) { const P = ST.play; const q = P && P.quiz; if (!q) return;
    try { if (live()) { const r = await api('POST', '/api/lms/i/quiz/answer', { quiz_id: q.quiz_id, choice: n }); q.mine = { choice: n, correct: r.correct }; T(r.correct ? `정답입니다 · 영상 퀴즈 ${r.score}점` : `오답입니다(정답 ${r.answer + 1}번)`); } else { q.mine = { choice: n, correct: n === q.demoAnswer }; T(q.mine.correct ? '정답입니다(데모)' : `오답입니다(정답 ${q.demoAnswer + 1}번, 데모)`); } }
    catch (e) { q.skip = 1; T(e.message, 'bad'); } P.quiz = null; re(); toggle(); }
  async function closePlay() { const P = ST.play; stop(); if (P && P.play_id) { await beat(); await call('POST', '/api/lms/i/play/end', { play_id: P.play_id, pos: Math.floor(P.pos) }).catch(() => { }); } ST.play = null; ST.i = null; re(); }
  async function saveRefl() { const b = { section_id: ST.rsec, week_no: +($1('#gijRw')?.value || 1), mood: +($1('#gijRm')?.value || 3), body: ($1('#gijRb')?.value || '').trim() }; if (!b.body) { T('내용을 입력하세요.', 'bad'); return; }
    if (!live()) { T('데모 화면입니다. 운영 서버에서 저장됩니다.'); return; } try { await api('POST', '/api/lms/j/reflection', b); T('성찰일지를 저장했습니다.'); delete ST.refl[ST.rsec]; re(); } catch (e) { T(e.message, 'bad'); } }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-lact^="gij-"]'); if (!el) return; e.preventDefault(); const a = el.dataset.lact;
    if (a === 'gij-tab') { if (ST.play && el.dataset.v !== 'vid') closePlay(); ST.tab = el.dataset.v; ST.res = null; re(); }
    else if (a === 'gij-m') { ST.m = el.dataset.v; ST.res = null; re(); }
    else if (a === 'gij-go') checkin();
    else if (a === 'gij-idvm') IDV.manage();
    else if (a === 'gij-scan') scanQR();
    else if (a === 'gij-geo') { if (!$1('#gijGeoOk')?.checked) { T('먼저 위치 정보 제공에 동의하세요.', 'bad'); return; } if (!navigator.geolocation) { T('이 기기는 위치를 제공하지 않습니다. 직접 입력하세요.', 'bad'); return; }
      navigator.geolocation.getCurrentPosition(p => { ST.geo = { lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 }; re(); }, () => T('위치를 가져오지 못했습니다(권한 · 기기 정책). 직접 입력하세요.', 'bad'), { timeout: 8000 }); }
    else if (a === 'gij-nfc') { if (!('NDEFReader' in window)) { T('NFC는 앱에서 동작합니다. 태그 ID를 직접 입력할 수 있습니다.', 'bad'); return; } try { const r = new NDEFReader(); r.scan().then(() => { r.onreading = ev => { $1('#gijTag').value = ev.serialNumber || ''; T('태그를 읽었습니다.'); }; }).catch(() => T('NFC 권한이 필요합니다.', 'bad')); } catch (x) { T('NFC를 쓸 수 없습니다.', 'bad'); } }
    else if (a === 'gij-ble') { if (window.DidisamApp && window.DidisamApp.scanBeacon) window.DidisamApp.scanBeacon().then(id => { $1('#gijTag').value = id || ''; }).catch(() => T('비콘을 찾지 못했습니다.', 'bad')); else T('비콘 탐색은 학교 비콘 장비 · 앱 연동 후 동작합니다.', 'bad'); }
    else if (a === 'gij-play') startPlay(el.dataset.c);
    else if (a === 'gij-toggle') toggle();
    else if (a === 'gij-close') closePlay();
    else if (a === 'gij-ans') answer(+el.dataset.i);
    else if (a === 'gij-cue') { const P = ST.play; const c = P && P.cues[+el.dataset.i]; if (c) beat().then(() => { P.pos = c.s; P.from = Math.floor(c.s); const v = $1('#gijV'); if (v) v.currentTime = c.s; paint(); }); }
    else if (a === 'gij-refl') saveRefl();
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-lch^="gij-"]'); if (!el) return; const a = el.dataset.lch; const P = ST.play;
    if (a === 'gij-ses') { ST.ses = el.value; ST.res = null; re(); }
    else if (a === 'gij-rsec') { ST.rsec = el.value; re(); }
    else if (a === 'gij-rate' && P) beat().then(() => { P.rate = +el.value; const v = $1('#gijV'); if (v) v.playbackRate = P.rate; });
    else if (a === 'gij-seek' && P) { const to = +el.value; beat().then(() => { P.pos = to; P.from = to; const v = $1('#gijV'); if (v) v.currentTime = to; paint(); }); }
    else if (a === 'gij-lang' && P) { P.lang = el.value; P.cues = (P.subs.find(x => x.lang === P.lang) || {}).cues || []; re(); }
  });
})();
