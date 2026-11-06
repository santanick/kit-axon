/* x2 실시간 수업 화면(liveclass.html) — 교수자 · 학생 공용, PC · 휴대폰
   #room=<수업 id>  교수자(운영자 · 교수자 로그인) — 카메라 · 마이크 · 화면 공유 · 녹화 · 자막(받아쓰기) · 시작 · 종료
   #join=<코드>     학생(학습자 사이트 로그인) — 링크 · QR로 입장, 녹화 고지 동의, 손들기 · 채팅 · 질문 · 투표 · 개인 자막 언어
   #cap=<코드>&lang= 대면 수업 자막 보기(로그인 없음)   #capture=<자막방 id> 대면 수업 받아쓰기 콘솔(교수자)   #rec=<녹화 id> 녹화 다시 보기
   연결: 소그룹 = 메시(모두 서로 연결, 최대 6명), 방송 = 교수자 → 학생 직접 연결(학생은 받기만). 교수자 영상은 캔버스 한 장으로 보내 카메라 ↔ 화면 공유를 바꿔도 연결 · 녹화가 끊기지 않는다. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LN = LV.LN; const api = LV.api; const root = $('#lv');
  const H = {}; (location.hash || '').slice(1).split('&').forEach(kv => { const i = kv.indexOf('='); if (i > 0) H[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
  const st = { role: null, room: null, peer: null, ice: [], peers: [], pcs: new Map(), since: 0, esince: 0, evts: [], tab: 'chat', mic: null, cam: null, scr: null, canvas: null, out: null, rec: null, cap: null, capLang: null, capLines: [], capSince: 0, stt: null, timer: 0, ended: false, msg: '', hand: false, voted: {} };
  const toast = (m, k) => { let t = $('#lvToast'); if (!t) { t = document.createElement('div'); t.id = 'lvToast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.className = 'lv-toast ' + (k || ''); t.textContent = m; clearTimeout(t._h); t._h = setTimeout(() => { t.className = 'lv-toast hide'; }, 3500); };
  const fmt = t => { if (!t) return ''; const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  async function boot() {
    let live = false; try { const r = await fetch('api/health', { cache: 'no-store' }); live = r.ok && /json/.test(r.headers.get('content-type') || '') && (await r.json()).ok === true; } catch (e) { }
    LV.setMode(live ? 'live' : 'demo');
    if (H.cap) return capView(H.cap, H.lang);
    if (H.rec) return recView(H.rec);
    if (H.capture) return capture(H.capture);
    if (H.room || H.join) return lobby();
    root.innerHTML = `<div class="lv-card lv-center"><h1>실시간 수업</h1><p>수업 링크 · QR로 들어오세요. 교수자는 스튜디오 「강의실 › 실시간 수업」에서 수업을 엽니다.</p></div>`;
  }
  const demoNote = () => LV.mode() === 'demo' ? '<p class="lv-mini">데모: 이 브라우저에만 저장됩니다. 같은 브라우저에서 교수자 탭과 학생 탭을 함께 열면 실제로 영상이 연결됩니다.</p>' : '';

  /* ═════════ 입장 전 ═════════ */
  function lobby(err) {
    const host = !!H.room; const demo = LV.mode() === 'demo';
    root.innerHTML = `<div class="lv-card lv-center lv-lobby"><h1>${host ? '실시간 수업 진행' : '실시간 수업 입장'}</h1>
      <p class="lv-mini">카메라 · 마이크는 이 브라우저가 권한을 물어봅니다. 허용하지 않아도 보기 · 채팅 · 질문으로 참여할 수 있습니다.</p>
      ${!host && demo ? `<label class="lv-f">학번(데모)<select id="lvSid">${['20261001', '20261002', '20261003', '20261004', '20261005', '20261006'].map(x => `<option ${x === st.sid ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}
      <video id="lvPrev" class="lv-prev" playsinline muted autoplay hidden></video>
      <div class="lv-row"><label class="lv-ck"><input type="checkbox" id="lvUseCam" ${host ? 'checked' : ''}> 카메라 켜기</label><label class="lv-ck"><input type="checkbox" id="lvUseMic" ${host ? 'checked' : ''}> 마이크 켜기</label></div>
      ${err && err.code === 'rec_consent' ? `<div class="lv-warn"><b>녹화 안내</b><p>이 수업은 교수자 화면 · 음성이 녹화되어 강의자료로 올라갈 수 있습니다. 학생의 카메라 영상은 녹화하지 않습니다. 녹화본은 기관이 정한 보존 기간이 지나면 자동으로 파기되고, 누가 열람했는지 기록됩니다.</p><label class="lv-ck"><input type="checkbox" id="lvConsent"> 위 내용을 확인했고 동의합니다.</label></div>` : ''}
      ${err && err.code !== 'rec_consent' ? `<p class="lv-err" role="alert">${E(err.message)}${err.status === 401 ? ` <a href="learner.html">학습자 사이트에서 로그인</a>` : ''}</p>` : ''}
      <button class="lv-btn pri" id="lvGo">${host ? '수업 화면 열기' : '입장하기'}</button>${demoNote()}</div>`;
    $('#lvGo').onclick = () => enter(host);
  }
  async function media(useCam, useMic) {
    const out = { cam: null, mic: null, note: '' };
    if (!(useCam || useMic)) return out;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { out.note = '이 브라우저는 카메라 · 마이크를 쓸 수 없습니다(HTTPS 주소에서 여세요).'; return out; }
    try { const s = await navigator.mediaDevices.getUserMedia({ video: useCam ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false, audio: useMic ? { echoCancellation: true, noiseSuppression: true } : false }); out.cam = s.getVideoTracks()[0] || null; out.mic = s.getAudioTracks()[0] || null; }
    catch (e) { out.note = e && e.name === 'NotAllowedError' ? '카메라 · 마이크 권한을 허용하지 않았습니다. 주소창의 자물쇠에서 허용하면 다시 쓸 수 있습니다. 지금은 보기 · 채팅 · 질문으로 참여합니다.' : '카메라 · 마이크를 찾지 못했습니다. 보기 · 채팅 · 질문으로 참여합니다.'; }
    return out;
  }
  async function enter(host) {
    const btn = $('#lvGo'); btn.disabled = true;
    if (LV.mode() === 'demo') { st.sid = ($('#lvSid') || {}).value || '20261001'; LV.demoMe = host ? { kind: 'staff' } : { kind: 'learner', sid: st.sid }; }
    const c = $('#lvConsent');
    let j; try { j = await api('POST', '/api/lms/live/join', { [host ? 'room_id' : 'code']: host ? H.room : H.join, consent_rec: !!(c && c.checked), device: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'pc' }); }
    catch (e) { return lobby(e); }
    if (j.ext_url) { root.innerHTML = `<div class="lv-card lv-center"><h1>${E(j.room.title)}</h1><p>이 수업은 외부 화상 수업(Zoom · Teams)으로 진행합니다.</p><a class="lv-btn pri" href="${E(j.ext_url)}" target="_blank" rel="noopener">외부 화상 수업 열기</a></div>`; if (/Mobi/.test(navigator.userAgent)) location.href = j.ext_url; return; }
    Object.assign(st, { role: j.role, room: j.room, peer: j.peer, ice: j.ice || [], since: j.last_sig || 0, esince: 0, sfu: j.sfu, limits: j.limits });
    if (j.replaced) toast('다른 창 · 기기에서 열린 같은 계정의 연결을 끊었습니다(중복 접속 차단).', 'warn');
    const m = await media($('#lvUseCam') && $('#lvUseCam').checked && (host || j.room.mode === 'mesh'), $('#lvUseMic') && $('#lvUseMic').checked && (host || j.room.mode === 'mesh'));
    st.cam = m.cam; st.mic = m.mic; st.msg = m.note;
    if (host || j.room.mode === 'mesh') stage();
    room(); loop();
    window.addEventListener('pagehide', () => { if (st.ended) return; try { if (LV.mode() === 'live') fetch('api/lms/live/leave', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ peer_id: st.peer.peer_id }) }); else api('POST', '/api/lms/live/leave', { peer_id: st.peer.peer_id }); } catch (e) { } });
  }
  /* 보내는 영상: 캔버스(카메라 또는 화면 공유를 그린다) */
  function stage() {
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g = cv.getContext('2d'); st.canvas = cv;
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; st.srcV = v;
    const setSrc = () => { const t = st.scr || st.cam; v.srcObject = t ? new MediaStream([t]) : null; if (t) v.play().catch(() => { }); };
    st.setSrc = setSrc; setSrc();
    const draw = () => { g.fillStyle = '#111'; g.fillRect(0, 0, 1280, 720); if (v.srcObject && v.videoWidth) { const r = Math.min(1280 / v.videoWidth, 720 / v.videoHeight); const w = v.videoWidth * r, h = v.videoHeight * r; g.drawImage(v, (1280 - w) / 2, (720 - h) / 2, w, h); }
      else { g.fillStyle = '#ddd'; g.font = '40px sans-serif'; g.textAlign = 'center'; g.fillText(st.role === 'host' ? '교수자 화면 꺼짐' : st.peer.label, 640, 370); } };
    st.drawT = setInterval(draw, 1000 / 15); draw();
    const vt = cv.captureStream ? cv.captureStream(15).getVideoTracks()[0] : null; st.out = new MediaStream([vt, st.mic].filter(Boolean));
  }

  /* ═════════ 수업 화면 ═════════ */
  function room() {
    const host = st.role === 'host'; const r = st.room;
    root.innerHTML = `<div class="lv-app">
      <header class="lv-hd"><div><b>${E(r.title)}</b><small id="lvSt"></small></div><div class="lv-hdr"><span id="lvRec" class="lv-recdot" hidden>● 녹화 중</span><button class="lv-btn sm" id="lvLeave">나가기</button></div></header>
      <p class="lv-limit">${r.mode === 'broadcast' ? `방송: 교수자가 학생에게 직접 보냅니다(최대 ${st.limits ? st.limits.fanout_max : 25}명${st.sfu ? ' · 초과분 SFU 연동 후 동작' : ''})` : `소그룹: 모두 서로 연결합니다(최대 ${st.limits ? st.limits.mesh_max : 6}명)`} · 큰 수업은 SFU 연동 후 동작</p>
      ${st.msg ? `<p class="lv-warnline" role="alert">${E(st.msg)}</p>` : ''}
      <div class="lv-main"><section class="lv-stage"><div class="lv-grid" id="lvGrid"></div><div class="lv-capbar" id="lvCapBar" hidden></div>
        <div class="lv-tools" id="lvTools"></div></section>
        <aside class="lv-side"><div class="lv-tabs" role="tablist">${[['chat', '채팅'], ['qa', '질문'], ['poll', '투표'], ['ppl', '참여자']].map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${st.tab === k}" class="${st.tab === k ? 'on' : ''}">${l}<span class="lv-n" data-n="${k}"></span></button>`).join('')}</div><div class="lv-panel" id="lvPanel"></div>
        <form class="lv-send" id="lvSend"><input id="lvTxt" maxlength="500" autocomplete="off" placeholder="메시지"><button class="lv-btn pri sm">보내기</button></form></aside></div>
      ${demoNote()}</div>`;
    $('#lvLeave').onclick = leave;
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; room(); });
    $('#lvSend').onsubmit = e => { e.preventDefault(); send(); };
    tools(); tiles(); panel(); status(); capBar();
  }
  function tools() {
    const host = st.role === 'host'; const r = st.room; const T = $('#lvTools'); if (!T) return;
    const mic = st.mic ? `<button class="lv-tool ${st.mic.enabled ? '' : 'off'}" data-t="mic">${st.mic.enabled ? '마이크 켜짐' : '마이크 꺼짐'}</button>` : '';
    const cam = st.cam ? `<button class="lv-tool ${st.cam.enabled ? '' : 'off'}" data-t="cam">${st.cam.enabled ? '카메라 켜짐' : '카메라 꺼짐'}</button>` : '';
    T.innerHTML = host ? `${r.status !== 'live' ? '<button class="lv-tool pri" data-t="start">수업 시작</button>' : '<button class="lv-tool bad" data-t="end">수업 종료</button>'}${mic}${cam}
      <button class="lv-tool" data-t="share">${st.scr ? '화면 공유 끄기' : '화면 공유'}</button>${r.rec_allowed ? `<button class="lv-tool" data-t="rec">${st.rec ? '녹화 마치기' : '녹화'}</button>` : ''}<button class="lv-tool" data-t="cap">${st.stt || st.capRoom ? '자막 끄기' : '실시간 자막'}</button>`
      : `${mic}${cam}<button class="lv-tool ${st.hand ? 'on' : ''}" data-t="hand">${st.hand ? '손 내리기' : '손들기'}</button>`;
    T.querySelectorAll('[data-t]').forEach(b => b.onclick = () => TOOL[b.dataset.t]());
  }
  const TOOL = {
    mic: () => { st.mic.enabled = !st.mic.enabled; tools(); }, cam: () => { st.cam.enabled = !st.cam.enabled; tools(); },
    start: async () => { try { const j = await api('POST', '/api/lms/live/room-state', { room_id: st.room.room_id, status: 'live' }); st.room = { ...st.room, ...j.room }; toast('수업을 시작했습니다. 지금부터 접속 시간으로 출석을 셉니다.', 'ok'); tools(); status(); } catch (e) { toast(e.message, 'warn'); } },
    end: async () => { if (!confirm('수업을 마칠까요? 접속 시간으로 출석이 기록되고 모든 연결이 끊깁니다.')) return; try { if (st.rec) await recStop(false); if (st.stt || st.capRoom) await capStop(); const j = await api('POST', '/api/lms/live/room-state', { room_id: st.room.room_id, status: 'ended' }); st.ended = true; stop(); const a = j.attendance;
      root.innerHTML = `<div class="lv-card lv-center"><h1>수업을 마쳤습니다</h1><p>출석 ${a.present} · 지각 ${a.late} · 결석 ${a.absent}${a.session ? ` — 출결에 ${a.written}명 기록${a.kept ? `(다른 방식으로 이미 정해진 ${a.kept}명은 그대로)` : ''}` : ' — 차시가 연결되지 않아 출결에는 기록하지 않았습니다'}</p><p class="lv-mini">스튜디오 「실시간 수업 › 출석」에서 자세히 보고 내려받을 수 있습니다.</p></div>`; } catch (e) { toast(e.message, 'warn'); } },
    share: async () => { if (st.scr) { st.scr.stop(); st.scr = null; st.setSrc(); tools(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return toast('이 기기 · 브라우저는 화면 공유를 지원하지 않습니다(휴대폰은 카메라로 진행하세요).', 'warn');
      try { const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false }); st.scr = s.getVideoTracks()[0]; st.scr.onended = () => { st.scr = null; st.setSrc(); tools(); }; st.setSrc(); tools(); } catch (e) { toast('화면 공유를 취소했거나 허용하지 않았습니다.', 'warn'); } },
    rec: () => st.rec ? recAsk() : recStart(),
    cap: () => (st.stt || st.capRoom) ? capStop() : capStart(),
    hand: async () => { try { await ev(st.hand ? 'lower' : 'hand'); st.hand = !st.hand; tools(); } catch (e) { toast(e.message, 'warn'); } }
  };
  function status() { const s = $('#lvSt'); if (s) s.textContent = ` · ${{ ready: '시작 전', live: '진행 중', ended: '종료' }[st.room.status] || ''} · 참여 ${st.peers.length}명`; const rr = $('#lvRec'); if (rr) rr.hidden = !st.room.recording; }
  const ev = (kind, x = {}) => api('POST', '/api/lms/live/event', { room_id: st.room.room_id, peer_id: st.peer.peer_id, kind, ...x });
  async function send() { const t = $('#lvTxt').value.trim(); if (!t) return; try { await ev(st.tab === 'qa' ? 'qa' : 'chat', { text: t }); $('#lvTxt').value = ''; } catch (e) { toast(e.message, 'warn'); } }

  /* 영상 칸 */
  function tiles() {
    const G = $('#lvGrid'); if (!G) return; const host = st.role === 'host'; const bc = st.room.mode === 'broadcast';
    const list = []; if (st.out && (host || !bc)) list.push({ id: 'me', label: host ? '나(교수자)' : '나', stream: st.out, me: true });
    st.pcs.forEach((x, id) => { const p = st.peers.find(q => q.peer_id === id); if (bc && !host && (!p || p.role !== 'host')) return; list.push({ id, label: p ? p.label : '', stream: x.stream, hand: p && p.hand, host: p && p.role === 'host' }); });
    if (!list.length) { G.innerHTML = `<div class="lv-empty">${st.role === 'host' ? '학생이 들어오면 여기에 보입니다.' : '교수자 화면을 기다리는 중입니다…'}</div>`; return; }
    const ids = list.map(t => t.id).join(); if (G.dataset.ids !== ids) { G.dataset.ids = ids; G.className = 'lv-grid n' + Math.min(list.length, 6) + (bc && !host ? ' one' : '');
      G.innerHTML = list.map(t => `<div class="lv-tile ${t.host ? 'host' : ''}" data-id="${E(t.id)}"><video playsinline autoplay ${t.me ? 'muted' : ''}></video><span class="lv-lbl">${E(t.label)}<i class="lv-hand" hidden>✋</i></span></div>`).join(''); }
    list.forEach(t => { const el = G.querySelector(`[data-id="${CSS.escape(t.id)}"]`); if (!el) return; const v = el.querySelector('video'); if (t.me) { if (v.srcObject !== st.out && st.canvas) { v.srcObject = new MediaStream(st.out.getVideoTracks()); v.play().catch(() => { }); } } else if (t.stream && v.srcObject !== t.stream) { v.srcObject = t.stream; v.play().catch(() => { }); } const hd = el.querySelector('.lv-hand'); if (hd) hd.hidden = !t.hand; });
  }
  /* 옆 패널 */
  function panel() {
    const P = $('#lvPanel'); if (!P) return; const host = st.role === 'host'; const ev2 = st.evts; const inp = $('#lvTxt'); const send2 = $('#lvSend');
    const n = k => ({ chat: ev2.filter(e => e.kind === 'chat').length, qa: ev2.filter(e => e.kind === 'qa').length, poll: ev2.filter(e => e.kind === 'poll' && !ev2.some(c => c.kind === 'close' && c.ref === e.id)).length, ppl: st.peers.length })[k];
    root.querySelectorAll('[data-n]').forEach(s => { const v = n(s.dataset.n); s.textContent = v ? ' ' + v : ''; });
    if (send2) send2.hidden = !['chat', 'qa'].includes(st.tab); if (inp) inp.placeholder = st.tab === 'qa' ? '질문 입력(교수자가 답합니다)' : '메시지';
    let h = '';
    if (st.tab === 'chat') h = ev2.filter(e => ['chat', 'sys', 'rec'].includes(e.kind)).map(e => `<p class="lv-msg ${e.kind !== 'chat' ? 'sys' : ''}"><b>${E(e.by)}</b> ${E(e.body.text)} <small>${fmt(e.at)}</small></p>`).join('') || '<p class="lv-mini">아직 메시지가 없습니다.</p>';
    if (st.tab === 'qa') h = ev2.filter(e => e.kind === 'qa').map(q => `<div class="lv-q"><p><b>${E(q.by)}</b> ${E(q.body.text)}</p>${ev2.filter(a => a.kind === 'answer' && a.ref === q.id).map(a => `<p class="lv-a">↳ ${E(a.body.text)}</p>`).join('')}${host ? `<form class="lv-ans" data-q="${q.id}"><input maxlength="500" placeholder="답변"><button class="lv-btn sm">답변</button></form>` : ''}</div>`).join('') || '<p class="lv-mini">질문이 없습니다. 아래 칸에 질문을 남기세요.</p>';
    if (st.tab === 'poll') h = (host ? `<form class="lv-pollnew" id="lvPollNew"><input id="lvPq" maxlength="200" placeholder="투표 질문(예: 이해했나요?)"><input id="lvPo" maxlength="300" placeholder="보기를 쉼표로(예: 예, 아니요, 조금)"><button class="lv-btn sm pri">투표 올리기</button></form>` : '') +
      (ev2.filter(e => e.kind === 'poll').reverse().map(p => { const cl = ev2.find(c => c.kind === 'close' && c.ref === p.id); const votes = ev2.filter(v => v.kind === 'vote' && v.ref === p.id); const tally = cl ? cl.body.tally : p.body.options.map((_, i) => votes.filter(v => v.body.choice === i).length); const tot = tally.reduce((a, b) => a + b, 0);
        return `<div class="lv-poll"><b>${E(p.body.text)}</b>${cl ? ' <small>마감</small>' : ''}${p.body.options.map((o, i) => (host || cl) ? `<div class="lv-bar"><span>${E(o)}</span><i style="width:${tot ? tally[i] * 100 / tot : 0}%"></i><em>${tally[i]}</em></div>` : `<button class="lv-btn sm ${st.voted[p.id] === i ? 'pri' : ''}" data-vote="${p.id}" data-c="${i}" ${st.voted[p.id] != null ? 'disabled' : ''}>${E(o)}</button>`).join('')}${host && !cl ? `<button class="lv-btn sm" data-close="${p.id}">마감하고 결과 보여 주기</button>` : ''}</div>`; }).join('') || '<p class="lv-mini">올라온 투표가 없습니다.</p>');
    if (st.tab === 'ppl') h = st.peers.map(p => `<p class="lv-ppl"><b>${E(p.label)}</b> ${p.role === 'host' ? '<small>교수자</small>' : ''}${p.hand ? ' ✋' : ''}${host && p.hand ? ` <button class="lv-btn sm" data-lower="${E(p.peer_id)}">손 내리기</button>` : ''}</p>`).join('');
    const atBottom = P.scrollTop + P.clientHeight >= P.scrollHeight - 30; P.innerHTML = h; if (atBottom) P.scrollTop = P.scrollHeight;
    P.querySelectorAll('.lv-ans').forEach(f => f.onsubmit = async e => { e.preventDefault(); const t = f.querySelector('input').value.trim(); if (!t) return; try { await ev('answer', { ref: +f.dataset.q, text: t }); } catch (x) { toast(x.message, 'warn'); } });
    P.querySelectorAll('[data-vote]').forEach(b => b.onclick = async () => { try { await ev('vote', { ref: +b.dataset.vote, choice: +b.dataset.c }); st.voted[b.dataset.vote] = +b.dataset.c; panel(); } catch (x) { toast(x.message, 'warn'); } });
    P.querySelectorAll('[data-close]').forEach(b => b.onclick = async () => { try { await ev('close', { ref: +b.dataset.close }); } catch (x) { toast(x.message, 'warn'); } });
    P.querySelectorAll('[data-lower]').forEach(b => b.onclick = async () => { try { await ev('lower', { to: b.dataset.lower }); } catch (x) { toast(x.message, 'warn'); } });
    const pf = $('#lvPollNew'); if (pf) pf.onsubmit = async e => { e.preventDefault(); const o = $('#lvPo').value.split(',').map(x => x.trim()).filter(Boolean); try { await ev('poll', { text: $('#lvPq').value.trim(), options: o }); pf.reset(); } catch (x) { toast(x.message, 'warn'); } };
  }

  /* ═════════ 신호 · 연결 ═════════ */
  function loop() { clearTimeout(st.timer); const tick = async () => { if (st.ended) return; try { await poll(); } catch (e) { if (e.code === 'ended') { st.ended = true; stop(); if (st.role !== 'host') root.innerHTML = `<div class="lv-card lv-center"><h1>수업이 끝났습니다</h1><p>참여해 주셔서 감사합니다. 출석은 접속 시간으로 자동 기록됩니다.</p></div>`; return; } if (e.code === 'replaced' || e.code === 'left' || e.code === 'peer') { st.ended = true; stop(); root.innerHTML = `<div class="lv-card lv-center"><h1>연결이 끊겼습니다</h1><p>${E(e.message)}</p><button class="lv-btn pri" data-reload>다시 입장</button></div>`; return; } }
    st.timer = setTimeout(tick, [...st.pcs.values()].some(x => x.pc.connectionState !== 'connected') ? 800 : 1500); }; tick(); }
  async function poll() {
    const j = await api('POST', '/api/lms/live/poll', { room_id: st.room.room_id, peer_id: st.peer.peer_id, since: st.since, esince: st.esince });
    st.since = Math.max(st.since, j.last_sig || 0); st.esince = Math.max(st.esince, j.last_evt || 0);
    const was = st.room.status; st.room = { ...st.room, status: j.room.status, recording: j.room.recording };
    if (j.room.status === 'ended' && st.role !== 'host') { st.ended = true; stop(); root.innerHTML = `<div class="lv-card lv-center"><h1>수업이 끝났습니다</h1><p>참여해 주셔서 감사합니다. 출석은 접속 시간으로 자동 기록됩니다.</p></div>`; return; }
    const newEv = j.events || []; if (newEv.length) { st.evts.push(...newEv); if (newEv.some(e => e.kind === 'poll') && st.role !== 'host') toast('새 투표가 올라왔습니다(투표 탭).', 'ok'); }
    const ids = st.peers.map(p => p.peer_id + p.hand).join(); st.peers = j.peers || [];
    for (const s of j.signals || []) await onSig(s);
    sync();
    const capChanged = JSON.stringify(st.cap) !== JSON.stringify(j.room.cap || null); st.cap = j.room.cap || null;
    if (newEv.length || ids !== st.peers.map(p => p.peer_id + p.hand).join()) panel();
    if (was !== st.room.status) tools(); status(); tiles(); if (capChanged) capBar();
  }
  const sig = (to, kind, data) => api('POST', '/api/lms/live/signal', { room_id: st.room.room_id, peer_id: st.peer.peer_id, to, kind, data }).catch(() => { });
  function want(p) { const host = st.role === 'host'; if (p.peer_id === st.peer.peer_id) return false; if (st.room.mode === 'broadcast') return host ? p.role === 'student' : p.role === 'host'; return true; }
  const initiator = p => st.room.mode === 'broadcast' ? st.role === 'host' : st.peer.peer_id < p.peer_id;
  function sync() {
    const live = new Set(st.peers.filter(want).map(p => p.peer_id));
    st.pcs.forEach((x, id) => { if (!live.has(id)) { x.pc.close(); st.pcs.delete(id); } });
    st.peers.filter(want).forEach(p => { if (!st.pcs.has(p.peer_id) && initiator(p)) offer(p.peer_id); });
  }
  function mk(id) {
    const pc = new RTCPeerConnection({ iceServers: st.ice }); const x = { pc, stream: new MediaStream(), q: [] }; st.pcs.set(id, x);
    const send = st.out && (st.role === 'host' || st.room.mode === 'mesh');
    if (send) st.out.getTracks().forEach(t => pc.addTrack(t, st.out));
    if (!send || !st.out.getAudioTracks().length) pc.addTransceiver('audio', { direction: send ? 'sendrecv' : 'recvonly' });
    if (!send || !st.out.getVideoTracks().length) pc.addTransceiver('video', { direction: send ? 'sendrecv' : 'recvonly' });
    pc.onicecandidate = e => { if (e.candidate) sig(id, 'ice', { c: e.candidate.toJSON() }); };
    pc.ontrack = e => { if (!x.stream.getTracks().includes(e.track)) x.stream.addTrack(e.track); tiles(); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { toast('연결이 끊겨 다시 연결합니다. 학교 망에서 계속 실패하면 TURN 서버 설정이 필요합니다.', 'warn'); pc.close(); st.pcs.delete(id); } };
    return x;
  }
  async function offer(id) { const x = mk(id); try { const o = await x.pc.createOffer(); await x.pc.setLocalDescription(o); sig(id, 'offer', { type: o.type, sdp: o.sdp }); } catch (e) { console.warn(e); } }
  async function onSig(s) {
    try {
      if (s.kind === 'kick') { const e = new Error('다른 기기 · 창에서 같은 계정으로 입장해 이 화면의 연결을 끊었습니다(중복 접속 차단).'); e.code = 'replaced'; throw e; }
      let x = st.pcs.get(s.from);
      if (s.kind === 'bye') { if (x) { x.pc.close(); st.pcs.delete(s.from); } return; }
      if (s.kind === 'offer') { if (x) { x.pc.close(); } x = mk(s.from); await x.pc.setRemoteDescription(s.data); const a = await x.pc.createAnswer(); await x.pc.setLocalDescription(a); sig(s.from, 'answer', { type: a.type, sdp: a.sdp }); for (const c of x.q.splice(0)) await x.pc.addIceCandidate(c).catch(() => { }); return; }
      if (!x) return;
      if (s.kind === 'answer') { await x.pc.setRemoteDescription(s.data); for (const c of x.q.splice(0)) await x.pc.addIceCandidate(c).catch(() => { }); return; }
      if (s.kind === 'ice') { if (x.pc.remoteDescription) await x.pc.addIceCandidate(s.data.c).catch(() => { }); else x.q.push(s.data.c); }
    } catch (e) { if (e.code === 'replaced') throw e; console.warn(e); }
  }
  function stop() { clearTimeout(st.timer); clearInterval(st.drawT); clearInterval(st.capT); st.pcs.forEach(x => x.pc.close()); st.pcs.clear(); [st.cam, st.mic, st.scr].forEach(t => t && t.stop()); if (st.stt) { st.stt.onend = null; try { st.stt.stop(); } catch (e) { } } }
  async function leave() { try { await api('POST', '/api/lms/live/leave', { peer_id: st.peer.peer_id }); } catch (e) { } st.ended = true; stop(); root.innerHTML = `<div class="lv-card lv-center"><h1>수업에서 나왔습니다</h1><button class="lv-btn pri" data-reload>다시 입장</button></div>`; }

  /* ═════════ 녹화(교수자 화면 · 음성만) ═════════ */
  async function recStart() {
    if (typeof MediaRecorder === 'undefined' || !st.out) return toast('이 브라우저는 녹화를 지원하지 않습니다(크롬 · 엣지에서 진행하세요).', 'warn');
    if (st.room.status !== 'live') return toast('수업을 시작한 뒤 녹화할 수 있습니다.', 'warn');
    if (!confirm('녹화를 시작할까요?\n· 학생 화면에 「녹화 중」이 표시됩니다(입장 때 고지 · 동의).\n· 교수자 화면 · 음성만 녹화합니다.\n· 녹화본은 기관 보존 기간이 지나면 자동 파기되고, 열람 기록이 남습니다.')) return;
    const mime = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    try { const j = await api('POST', '/api/lms/live/rec-start', { room_id: st.room.room_id, consent: true, mime: mime || 'video/webm' }); st.rec = { id: j.rec.rec_id, idx: 0, buf: [], size: 0, up: Promise.resolve(), mr: new MediaRecorder(st.out, mime ? { mimeType: mime, videoBitsPerSecond: 900e3 } : undefined) };
      st.rec.mr.ondataavailable = e => { if (!e.data || !e.data.size) return; st.rec.buf.push(e.data); st.rec.size += e.data.size; if (st.rec.size >= 1.5e6) flush(); };
      st.rec.mr.start(5000); st.room.recording = true; tools(); status(); toast('녹화를 시작했습니다.', 'ok'); } catch (e) { toast(e.message, 'warn'); }
  }
  function flush() { const R = st.rec; if (!R || !R.buf.length) return R ? R.up : null; const blob = new Blob(R.buf, { type: R.buf[0].type }); R.buf = []; R.size = 0;
    R.up = R.up.then(async () => { const ab = await blob.arrayBuffer(); for (let o = 0; o < ab.byteLength; o += 2 * 1024 * 1024) { await api('POST', '/api/lms/live/rec-part', { rec_id: R.id, idx: R.idx, b64: LV.b64(ab.slice(o, o + 2 * 1024 * 1024)) }); R.idx++; } }).catch(e => toast('녹화 조각을 올리지 못했습니다: ' + e.message, 'warn')); return R.up; }
  function recAsk() { modal('녹화 마치기', '<label class="lv-ck"><input type="checkbox" id="lvPub"> 강의자료에 올리고 학생에게 바로 공개합니다(끄면 교수자만 봅니다).</label>', '마치고 강의자료에 올리기', () => recStop($('#lvPub').checked)); }
  async function recStop(pub) { const R = st.rec; if (!R) return; await new Promise(ok => { R.mr.onstop = ok; try { R.mr.stop(); } catch (e) { ok(); } }); await flush(); await R.up; st.rec = null; tools();
    try { if (R.idx) { await api('POST', '/api/lms/live/rec-finish', { rec_id: R.id, publish: !!pub }); toast('녹화본을 강의자료에 올렸습니다.', 'ok'); } } catch (e) { toast(e.message, 'warn'); } }
  function modal(title, body, ok, run) { const w = document.createElement('div'); w.className = 'lv-modal'; w.innerHTML = `<div class="lv-card" role="dialog" aria-modal="true"><h2>${E(title)}</h2>${body}<div class="lv-row"><button class="lv-btn" data-x>취소</button><button class="lv-btn pri" data-ok>${E(ok)}</button></div></div>`; document.body.appendChild(w); w.querySelector('[data-x]').onclick = () => w.remove(); w.querySelector('[data-ok]').onclick = async () => { const r = await run(w); if (r !== false) w.remove(); }; }

  /* ═════════ 자막 ═════════ */
  const SRC = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  const langOpts = (sel, only) => (only || Object.keys(LN)).map(l => `<option value="${l}" ${l === sel ? 'selected' : ''}>${LN[l]}</option>`).join('');
  function capStart() {
    modal('실시간 자막', `<label class="lv-f">말하는 언어<select id="lvSrc">${langOpts('ko')}</select></label><p class="lv-mini">학생에게 보여 줄 자막 언어(최대 4개, 말하는 언어 포함)</p><div class="lv-langs">${Object.keys(LN).map(l => `<label><input type="checkbox" class="lvL" value="${l}" ${['ko', 'en'].includes(l) ? 'checked' : ''}> ${LN[l]}</label>`).join('')}</div>
      ${SRC() ? '<p class="lv-mini">이 브라우저의 음성 인식으로 받아쓰고, 서버가 언어별로 번역합니다.</p>' : '<p class="lv-warnline">이 브라우저는 음성 받아쓰기를 지원하지 않습니다(크롬 · 엣지 · 사파리). 자막 문장을 직접 입력할 수 있고, 수업 녹음 파일은 나중에 영상 자막으로 처리할 수 있습니다.</p>'}`, '자막 시작', async w => {
      const src = w.querySelector('#lvSrc').value; const langs = [...new Set([src, ...[...w.querySelectorAll('.lvL:checked')].map(x => x.value)])]; if (langs.length > 4) { toast('자막 언어는 말하는 언어를 포함해 4개까지입니다.', 'warn'); return false; }
      try { const j = await api('POST', '/api/lms/live/cap-room', { section_id: st.room.section_id, title: st.room.title + ' 자막', src_lang: src, langs, live_room_id: st.room.room_id }); st.capRoom = j.room; sttRun(src); tools(); capBar(); } catch (e) { toast(e.message, 'warn'); return false; } });
  }
  /* 받아쓰기: 끝난 문장만 서버로, 4초마다 번역 */
  function sttRun(src, onLine) {
    const C = SRC(); st.capRoomId = st.capRoom.room_id; let pend = false;
    const tr = () => { if (!pend) return; pend = false; api('POST', '/api/lms/live/cap-translate', { room_id: st.capRoomId }).catch(() => { }); };
    st.capT = setInterval(tr, 4000);
    st.pushSeg = async (text, source) => { try { const j = await api('POST', '/api/lms/live/cap-seg', { room_id: st.capRoomId, text, source }); pend = true; if (onLine) onLine(j.line); } catch (e) { toast(e.message, 'warn'); } };
    if (!C) return;
    const r = new C(); r.lang = LV.SR[src] || 'ko-KR'; r.continuous = true; r.interimResults = true; st.stt = r;
    r.onresult = e => { let fin = '', mid = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else mid += t; } const it = $('#lvInterim'); if (it) it.textContent = mid; if (fin.trim()) st.pushSeg(fin.trim().slice(0, 1000), 'stt'); };
    r.onerror = e => { if (e.error === 'not-allowed') { toast('마이크 권한이 없어 받아쓰기를 할 수 없습니다. 자막 문장을 직접 입력하세요.', 'warn'); st.stt = null; } };
    r.onend = () => { if (st.stt === r) { try { r.start(); } catch (e) { } } };
    try { r.start(); } catch (e) { }
  }
  async function capStop() { if (st.stt) { const r = st.stt; st.stt = null; r.onend = null; try { r.stop(); } catch (e) { } } clearInterval(st.capT); const id = st.capRoomId; st.capRoom = null;
    if (id) { try { await api('POST', '/api/lms/live/cap-translate', { room_id: id }); await api('POST', '/api/lms/live/cap-finish', { room_id: id }); toast('자막을 마치고 대본을 저장했습니다. 스튜디오에서 요약 · 수정 · 공개할 수 있습니다.', 'ok'); } catch (e) { } } tools(); capBar(); }
  /* 자막 줄(학생: 내 언어 고르기 · 교수자: 직접 입력) */
  function capBar() {
    const B = $('#lvCapBar'); if (!B) return; const host = st.role === 'host';
    if (host) { B.hidden = !st.capRoom; if (!st.capRoom) return; B.innerHTML = `<span class="lv-mini">${st.stt ? '받아쓰는 중' : '직접 입력'} · 학생은 화면 아래에서 언어를 고릅니다</span><i id="lvInterim"></i><form id="lvCapIn"><input maxlength="1000" placeholder="자막 문장 직접 입력 후 Enter"></form>`; $('#lvCapIn').onsubmit = e => { e.preventDefault(); const i = e.target.querySelector('input'); if (i.value.trim()) st.pushSeg(i.value.trim(), 'manual'); i.value = ''; }; return; }
    clearInterval(st.capT); B.hidden = !st.cap; if (!st.cap) return; const c = st.cap; if (!st.capLang || !c.langs.includes(st.capLang)) st.capLang = c.langs.find(l => l !== c.src_lang) || c.src_lang;
    B.innerHTML = `<select id="lvCapL" aria-label="자막 언어">${langOpts(st.capLang, c.langs)}</select><div id="lvCapTxt" class="lv-captxt"></div>`;
    $('#lvCapL').onchange = e => { st.capLang = e.target.value; st.capSince = 0; st.capLines = []; capTick(); };
    const capTick = async () => { try { const j = await api('GET', `/api/lms/live/cap-view?code=${encodeURIComponent(c.code)}&lang=${st.capLang}&since=${Math.max(0, st.capSince - 3)}&v=${viewer()}`); j.lines.forEach(l => { const i = st.capLines.findIndex(x => x.seq === l.seq); if (i >= 0) st.capLines[i] = l; else st.capLines.push(l); }); st.capSince = Math.max(st.capSince, ...j.lines.map(l => l.seq), 0);
      const T = $('#lvCapTxt'); if (T) T.innerHTML = st.capLines.slice(-2).map(l => `<p>${E(l.tr || l.text)}</p>`).join(''); } catch (e) { } };
    capTick(); st.capT = setInterval(capTick, 2000);
  }
  function viewer() { let v = null; try { v = localStorage.getItem('ddlv.viewer'); if (!v) { v = LV.uid().replace(/-/g, '').slice(0, 20); localStorage.setItem('ddlv.viewer', v); } } catch (e) { v = 'anon' + Math.random().toString(36).slice(2, 12); } return v; }

  /* ═════════ 대면 수업 자막 보기(QR · 링크, 로그인 없음) ═════════ */
  function capView(code, lang) {
    let size = 26, lines = [], since = 0, room = null; let L = lang || null;
    const draw = () => { root.innerHTML = `<div class="lv-capview"><header><b>${E(room ? room.title : '실시간 자막')}</b><select id="cvL" aria-label="자막 언어">${room ? langOpts(L, room.langs) : ''}</select><button class="lv-btn sm" id="cvS">글자 ${size >= 34 ? '작게' : '크게'}</button></header>
      ${room && room.status === 'closed' ? '<p class="lv-mini">수업 자막이 끝났습니다.</p>' : ''}<div class="cv-lines" style="font-size:${size}px">${lines.slice(-30).map(l => `<p>${E(l.tr || l.text)}${l.tr && L !== room.src_lang ? `<small>${E(l.text)}${l.engine === 'rule' ? ' · 규칙 번역' : ''}</small>` : !l.tr && room && L !== room.src_lang ? '<small>번역 중…</small>' : ''}</p>`).join('') || '<p class="lv-mini">교수자가 말하면 여기에 자막이 나옵니다.</p>'}</div></div>`;
      const s = $('#cvL'); if (s) s.onchange = e => { L = e.target.value; since = 0; lines = []; tick(); history.replaceState(null, '', `#cap=${encodeURIComponent(code)}&lang=${L}`); };
      $('#cvS').onclick = () => { size = size >= 34 ? 22 : size + 6; draw(); }; const b = root.querySelector('.cv-lines'); if (b) b.scrollTop = b.scrollHeight; };
    const tick = async () => { try { const j = await api('GET', `/api/lms/live/cap-view?code=${encodeURIComponent(code)}${L ? '&lang=' + L : ''}&since=${Math.max(0, since - 5)}&v=${viewer()}`); room = j.room; if (!L) { L = room.langs.find(x => x !== room.src_lang) || room.src_lang; return tick(); }
      j.lines.forEach(l => { const i = lines.findIndex(x => x.seq === l.seq); if (i >= 0) lines[i] = l; else lines.push(l); }); since = Math.max(since, ...j.lines.map(l => l.seq), 0); draw(); } catch (e) { root.innerHTML = `<div class="lv-card lv-center"><p class="lv-err">${E(e.message)}</p></div>`; } };
    tick(); setInterval(tick, 2500);
  }

  /* ═════════ 대면 수업 받아쓰기 콘솔(교수자) ═════════ */
  async function capture(id) {
    if (LV.mode() === 'demo') LV.demoMe = { kind: 'staff' };
    let j; try { j = await api('GET', '/api/lms/live/cap-lines?room_id=' + encodeURIComponent(id)); } catch (e) { root.innerHTML = `<div class="lv-card lv-center"><p class="lv-err">${E(e.message)}</p></div>`; return; }
    st.capRoom = j.room; let lines = j.lines;
    const view = LV.url(`cap=${encodeURIComponent(j.room.code)}`);
    const draw = () => { root.innerHTML = `<div class="lv-card lv-capture"><h1>${E(j.room.title)}</h1><p class="lv-mini">말하는 언어 ${LN[j.room.src_lang]} → 자막 ${j.room.langs.map(l => LN[l]).join(' · ')} · 학생 화면: <a href="${E(view)}" target="_blank" rel="noopener">${E(view)}</a></p>
      ${j.room.status !== 'live' ? '<p class="lv-warnline">종료된 자막방입니다. 스튜디오에서 대본 · 요약을 다룹니다.</p>' : `<div class="lv-row">${SRC() ? `<button class="lv-btn pri" id="cpGo">${st.stt ? '받아쓰기 멈추기' : '받아쓰기 시작'}</button>` : '<p class="lv-warnline">이 브라우저는 음성 받아쓰기를 지원하지 않습니다(크롬 · 엣지 · 사파리). 문장을 직접 입력하거나, 수업 녹음 파일을 올려 나중에 영상 자막으로 만드세요.</p>'}<button class="lv-btn" id="cpEnd">자막 마치기</button></div>
      <i id="lvInterim" class="lv-mini"></i><form id="cpIn" class="lv-row"><input maxlength="1000" placeholder="자막 문장 직접 입력 후 Enter" style="flex:1"><button class="lv-btn sm">보내기</button></form>
      <details class="lv-up"><summary>녹음 파일로 나중에 자막 만들기</summary><p class="lv-mini">녹음 · 녹화 파일(음성 · 영상)을 올리면 영상 자막 처리 대기열에 들어갑니다.</p><input type="file" id="cpFile" accept="audio/*,video/*"><button class="lv-btn sm" id="cpUp">올리기</button></details>`}
      <div class="lv-lines">${lines.slice().reverse().map(l => `<p><small>#${l.seq} ${l.source === 'stt' ? '받아쓰기' : '입력'}</small> ${E(l.text)}${Object.entries(l.tr || {}).map(([k, v]) => `<br><small>[${E(LN[k])}${(l.tr_engine || {})[k] === 'rule' ? ' · 규칙' : ''}] ${E(v)}</small>`).join('')}</p>`).join('') || '<p class="lv-mini">아직 자막이 없습니다.</p>'}</div>${demoNote()}</div>`;
      const g = $('#cpGo'); if (g) g.onclick = () => { if (st.stt) { const r = st.stt; st.stt = null; r.onend = null; try { r.stop(); } catch (e) { } clearInterval(st.capT); draw(); } else { sttRun(j.room.src_lang, l => { lines.push(l); draw(); }); draw(); } };
      const f = $('#cpIn'); if (f) f.onsubmit = async e => { e.preventDefault(); const i = f.querySelector('input'); const t = i.value.trim(); if (!t) return; if (!st.pushSeg) sttRunManual(); await st.pushSeg(t, 'manual'); i.value = ''; };
      const en = $('#cpEnd'); if (en) en.onclick = async () => { if (st.stt) { st.stt.onend = null; try { st.stt.stop(); } catch (e) { } st.stt = null; } clearInterval(st.capT); try { await api('POST', '/api/lms/live/cap-translate', { room_id: id }); const r = await api('POST', '/api/lms/live/cap-finish', { room_id: id }); j.room = r.room; toast('자막을 마치고 대본을 저장했습니다.', 'ok'); draw(); } catch (x) { toast(x.message, 'warn'); } };
      const up = $('#cpUp'); if (up) up.onclick = () => audioUp(id);
    };
    const sttRunManual = () => { const C = window.SpeechRecognition; window.SpeechRecognition = null; const W = window.webkitSpeechRecognition; window.webkitSpeechRecognition = null; sttRun(j.room.src_lang, l => { lines.push(l); draw(); }); window.SpeechRecognition = C; window.webkitSpeechRecognition = W; };
    setInterval(async () => { try { const r = await api('GET', '/api/lms/live/cap-lines?room_id=' + encodeURIComponent(id)); if (JSON.stringify(r.lines) !== JSON.stringify(lines)) { lines = r.lines; draw(); } } catch (e) { } }, 5000);
    draw();
  }
  /* 녹음 파일 → 묶음 E 파일 저장소(2MB 조각) → 후처리 대기열 + VOD 자막 파이프라인 훅(window.lmsVodSubtitleJob, 묶음 I · x1 연결 지점) */
  async function audioUp(id) {
    const f = $('#cpFile') && $('#cpFile').files[0]; if (!f) return toast('파일을 고르세요.', 'warn'); if (f.size > 100 * 1024 * 1024) return toast('100MB까지 올릴 수 있습니다.', 'warn');
    try { const ab = await f.arrayBuffer(); const ids = []; for (let o = 0, i = 0; o < ab.byteLength; o += 2 * 1024 * 1024, i++) { const r = LV.mode() === 'live' ? await api('POST', '/api/lms/e/file', { name: `${f.name}.part${i}`, mime: f.type || 'audio/webm', b64: LV.b64(ab.slice(o, o + 2 * 1024 * 1024)) }) : { file_id: LV.uid() }; ids.push(r.file_id); }
      const j = await api('POST', '/api/lms/live/cap-audio', { room_id: id, file_ids: ids }); if (typeof window.lmsVodSubtitleJob === 'function') { try { window.lmsVodSubtitleJob(j.job); } catch (e) { } }
      toast('영상 자막 처리 대기열에 넣었습니다(영상 자막 엔진이 처리하면 대본에 반영).', 'ok'); } catch (e) { toast(e.message, 'warn'); }
  }

  /* ═════════ 녹화 다시 보기 ═════════ */
  async function recView(id) {
    root.innerHTML = '<div class="lv-card lv-center"><p>녹화본을 불러오고 있습니다…</p></div>';
    try { const first = await api('GET', `/api/lms/live/rec?rec_id=${encodeURIComponent(id)}&idx=0`); const parts = [first]; for (let i = 1; i < first.parts; i++) parts.push(await api('GET', `/api/lms/live/rec?rec_id=${encodeURIComponent(id)}&idx=${i}`));
      const blob = new Blob(parts.map(p => Uint8Array.from(atob(p.b64), c => c.charCodeAt(0))), { type: first.mime.split(';')[0] });
      root.innerHTML = `<div class="lv-card lv-rec"><h1>실시간 수업 녹화</h1><video controls playsinline src="${URL.createObjectURL(blob)}"></video><p class="lv-mini">열람 기록이 남습니다. 보존 기간이 지나면 자동으로 파기됩니다.</p></div>`; }
    catch (e) { root.innerHTML = `<div class="lv-card lv-center"><p class="lv-err">${E(e.message)}</p>${e.status === 401 ? '<a href="learner.html">학습자 사이트에서 로그인</a>' : ''}</div>`; }
  }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-reload]')) location.reload(); });
  window.LVROOM = { st };
  boot();
})();
