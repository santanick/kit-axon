/* x2 실시간 수업(SFR-024 · 049 · 072) · AI 실시간 자막 · 번역(SFR-077) — 스튜디오 화면 「강의실 › 실시간 수업」(lmslive)
   탭 4개(수업 · 출석 · 녹화 · 실시간 자막) + 더보기(자막 이용 현황 · 연결 설정). 수업 진행 · 학생 입장 · 자막 보기는 liveclass.html(새 창).
   운영(서버) 모드: /api/lms/live/* · 데모(정적): lms/rtc-core.js 데모 저장소(브라우저에만 저장). 묶음 O 「수업 실시간 자막」 탭은 이 화면으로 잇는다. */
(function () {
  'use strict';
  if (typeof MENU !== 'object' || typeof VIEWS !== 'object' || !window.LV) return;
  const LIVEM = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const api = (m, p, b) => { LV.setMode(LIVEM() ? 'live' : 'demo'); if (!LIVEM()) LV.demoMe = { kind: 'staff' }; return LV.api(m, p, b); };
  const LN = LV.LN;
  const C = { c: {}, room: null, cap: null };
  (function css() { if (document.querySelector('link[data-lvs]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/rtc.css?v=32.2'; l.dataset.lvs = '1'; document.head.appendChild(l); })();

  /* ── 메뉴: 학사 LMS 프리셋 · 「수업 › 강의실」 메뉴 안(동영상 · 진도 다음) ── */
  MENU.lmslive = { label: '실시간 수업', ws: 'learn', only: 'univ' };
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; if (k === 'univ_lms') { if (!P.on.includes('lmslive')) P.on.push('lmslive'); P.off = P.off.filter(x => x !== 'lmslive'); } else if (!P.on.includes('lmslive') && !P.off.includes('lmslive')) P.off.push('lmslive'); });
  (function navHook() { const N = window.LMSNAV; if (!N || !N.G) return setTimeout(navHook, 0); N.LBL.lmslive = '실시간 수업'; N.G.forEach(g => g[3].forEach(h => { if (h[0] === 'h-room' && !h[3].includes('lmslive')) { const i = h[3].indexOf('lmsi'); h[3].splice(i >= 0 ? i + 1 : 0, 0, 'lmslive'); } })); })();
  /* 저장된 학사 LMS 기관: 메뉴 켜기(반복 실행해도 안전) */
  const navOn = () => { if (!S || !S.nav || !S.nav.tabs || !(S.org && S.org.type === 'univ' && S.org.ed === 'lms') || typeof navAdd !== 'function') return; if (!Object.values(S.nav.tabs).some(L => L.some(x => x.id === 'lmslive'))) navAdd('lmslive', true); };
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { navOn(); } catch (e) { } return r; }; } // eslint-disable-line no-global-assign
  if (typeof postSeed === 'function') { const base = postSeed; postSeed = (...a) => { const r = base(...a); try { navOn(); } catch (e) { } return r; }; } // eslint-disable-line no-global-assign

  /* ── 공용 ── */
  const ts = v => v ? new Date(v).toLocaleString('ko-KR', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const mmss = s => `${Math.floor(s / 60)}분 ${s % 60}초`;
  const busy = '<div class="empty">불러오는 중…</div>';
  function load(k, p) { if (C.c[k] !== undefined) return C.c[k]; C.c[k] = null; api('GET', p).then(j => { C.c[k] = j; render(); }).catch(e => { C.c[k] = { _err: e.message }; render(); }); return null; }
  const errBox = d => `<div class="empty">${esc(d._err)}</div>`;
  const refresh = () => { C.c = {}; render(); };
  async function act(fn, ok) { try { const r = await fn(); if (ok) toast(ok, 'ok'); refresh(); return r; } catch (e) { toast(e.message || '처리하지 못했습니다.', 'warn'); return null; } }
  const modeTag = () => LIVEM() ? tag('운영 서버') : tag('데모: 브라우저에만 저장', 'y');
  const sections = () => { const d = LIVEM() ? load('secs', '/api/lms/o/sections') : { sections: LV.demoDb().sections }; return d && d.sections || []; };
  const secName = id => { const s = sections().find(x => x.section_id === id); return s ? s.title : '—'; };
  const secSel = (name, cur) => `<select name="${name}">${sections().map(s => `<option value="${esc(s.section_id)}" ${s.section_id === cur ? 'selected' : ''}>${esc(s.title)}${s.term_id ? ' · ' + esc(s.term_id) : ''}</option>`).join('')}</select>`;
  const open = h => { const w = window.open(LV.url(h), '_blank', 'noopener'); if (!w) toast('새 창이 막혔습니다. 브라우저의 팝업 허용을 켜 주세요.', 'warn'); };
  const ST = { ready: ['시작 전', ''], live: ['진행 중', 'ok'], ended: ['종료', 'y'] };
  const MODE = { mesh: '소그룹(서로 연결)', broadcast: '방송(교수자 → 학생)', link: '외부 링크(Zoom · Teams)' };
  const AST = { present: ['출석', 'ok'], late: ['지각', 'y'], absent: ['결석', 'bad'] };

  /* ═════════ 화면 ═════════ */
  VIEWS.lmslive = () => {
    const t = UI.lvT || 'rooms'; const U = window.LMP && LMP.ux;
    const V = [['rooms', '수업'], ['att', '출석'], ['rec', '녹화'], ['cap', '실시간 자막']], M = [['stats', '자막 이용 현황'], ['set', '연결 설정']];
    const R = load('rooms', '/api/lms/live/rooms'); const rooms = R && R.rooms || [];
    const liveR = rooms.filter(r => r.status === 'live'), next = rooms.filter(r => r.status === 'ready').sort((x, y) => (x.mode === 'link') - (y.mode === 'link'));
    const todo = `<div class="card"><div class="ch"><b>지금 할 일</b></div><div class="lvs-now">${liveR.length ? `<span>진행 중 <b>${liveR.length}</b>개 수업 · 접속 ${liveR.reduce((a, r) => a + r.online, 0)}명</span><button class="btn pri" data-act="lvs-open" data-id="${esc(liveR[0].room_id)}">수업 화면 열기</button>`
      : next.length ? `<span>시작 전 수업 <b>${next.length}</b>개 — 「${esc(next[0].title)}」</span><button class="btn pri" data-act="lvs-open" data-id="${esc(next[0].room_id)}">수업 화면 열기</button>` : `<span>예정된 실시간 수업이 없습니다.</span><button class="btn pri" data-act="lvs-new">새 실시간 수업</button>`}</div>
      <p class="lvs-limit">${esc(LV.LIMIT)}</p></div>`;
    const body = R && R._err ? errBox(R) : { rooms: vRooms, att: vAtt, rec: vRec, cap: vCap, stats: vStats, set: vSet }[t](rooms);
    return head('실시간 수업', '교수자 화면 · 음성 · 화면 공유를 학생에게 보내고, 채팅 · 손들기 · 질문 · 투표로 함께 수업합니다. 접속 시간으로 출석이 자동 기록되고, 실시간 자막 · 번역도 여기서 켭니다.', modeTag()) +
      (U ? U.tabs('lvT', V, M, t) : tabs('lvT', V.concat(M), t)) + todo + body;
  };

  /* ── 수업 ── */
  function vRooms(rooms) {
    if (!rooms && !C.c.rooms) return busy;
    return `<div class="card"><div class="ch"><b>실시간 수업</b><button class="btn sm" data-act="lvs-new">새 실시간 수업</button></div>${table(['수업', '분반', '방식', '상태', ''], rooms.map(r => [
      `<b>${esc(r.title)}</b>${r.session ? `<br><small class="mini">${r.session.week_no}주 ${r.session.seq}차시 출결 연결</small>` : '<br><small class="mini">차시 연결 없음(출결 미기록)</small>'}`, esc(r.section_title || secName(r.section_id)), esc(MODE[r.mode]) + (r.rec_allowed ? ' ' + tag('녹화 허용') : ''),
      tag(...ST[r.status]) + (r.status === 'live' ? ` <small class="mini">접속 ${r.online}</small>` : '') + (r.recording ? ' ' + tag('녹화 중', 'bad') : ''),
      r.status === 'ended' ? `<button class="btn sm" data-act="lvs-att" data-id="${esc(r.room_id)}">출석 보기</button>` : `<button class="btn sm pri" data-act="lvs-open" data-id="${esc(r.room_id)}">열기</button> <button class="btn sm" data-act="lvs-share" data-id="${esc(r.room_id)}">학생 링크 · QR</button> <button class="btn sm ghost" data-act="lvs-edit" data-id="${esc(r.room_id)}">수정</button>`]), '아직 실시간 수업이 없습니다. 「새 실시간 수업」으로 만드세요.')}
      <p class="mini">학생은 학습자 사이트 「내 학습」의 실시간 수업 카드, 링크, QR로 입장합니다(휴대폰 가능). 같은 학번으로 두 번째 창 · 기기에서 들어오면 먼저 연결은 끊깁니다(중복 접속 차단).</p></div>`;
  }
  const roomOf = id => (C.c.rooms && C.c.rooms.rooms || []).find(r => r.room_id === id);
  ACT['lvs-open'] = el => { const r = roomOf(el.dataset.id); if (r && r.mode === 'link') { window.open(r.ext_url, '_blank', 'noopener'); return; } open('room=' + encodeURIComponent(el.dataset.id)); };
  ACT['lvs-share'] = el => { const r = roomOf(el.dataset.id); const u = LV.url('join=' + encodeURIComponent(r.code));
    modal('학생 입장 링크 · QR', `<div class="lvs-qr">${LV.qr(u)}<div><p class="mini">학생은 학습자 사이트에 로그인한 상태에서 이 링크 · QR로 들어옵니다. 휴대폰은 카메라로 QR을 찍으면 됩니다.</p><code>${esc(u)}</code></div></div>`, [{ id: 'c', label: '닫기' }, { id: 'cp', label: '링크 복사', kind: 'pri', run: () => { navigator.clipboard && navigator.clipboard.writeText(u).then(() => toast('링크를 복사했습니다.', 'ok')); } }]); };
  function roomForm(r) {
    const live = LIVEM(); const sec = r ? r.section_id : (sections()[0] || {}).section_id;
    return `<label class="fl">수업 제목<input name="t" maxlength="80" value="${esc(r ? r.title : '')}" placeholder="자료구조 3주차 실시간 수업"></label>
      ${r ? '' : `<label class="fl">분반${secSel('sec', sec)}</label>`}
      <label class="fl">진행 방식<select name="m">${Object.entries(MODE).map(([k, v]) => `<option value="${k}" ${(r ? r.mode : 'mesh') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <p class="mini">소그룹: 최대 6명이 서로 보고 말합니다 · 방송: 교수자 1명이 학생 여럿에게 보냅니다(직접 연결 한도, 그 이상은 SFU 연동 후) · 외부 링크: 학교가 쓰는 Zoom · Teams 주소로 안내만 합니다.</p>
      <label class="fl">외부 화상 주소(외부 링크일 때)<input name="u" maxlength="500" value="${esc(r && r.ext_url || '')}" placeholder="https://zoom.us/j/…"></label>
      ${live && !r ? `<label class="fl">출결 차시(선택 — 수업 종료 때 접속 시간으로 출석 기록)<select name="ses"><option value="">연결 안 함</option></select></label>` : ''}
      <label class="ck"><input type="checkbox" name="rec" ${r && r.rec_allowed ? 'checked' : ''}> 녹화 허용(학생은 입장 전 녹화 고지에 동의합니다)</label>`;
  }
  async function fillSessions(w) { if (!LIVEM()) return; const s = w.querySelector('[name="sec"]'), o = w.querySelector('[name="ses"]'); if (!s || !o) return;
    const f = async () => { try { const j = await LV.api('GET', '/api/lms/g/sessions?section_id=' + encodeURIComponent(s.value)); o.innerHTML = '<option value="">연결 안 함</option>' + (j.sessions || []).filter(x => x.kind !== 'holiday').map(x => `<option value="${esc(x.session_id)}">${x.week_no}주 ${x.seq}차시${x.starts_at ? ' · ' + esc(ts(x.starts_at)) : ''}</option>`).join(''); } catch (e) { } };
    s.onchange = f; f(); }
  function saveRoom(w, r) { const m = fv(w, 'm'); if (!fv(w, 't')) { toast('수업 제목을 입력하세요.', 'warn'); return false; }
    act(() => api('POST', '/api/lms/live/room', { room_id: r ? r.room_id : undefined, section_id: r ? undefined : fv(w, 'sec'), session_id: r ? (r.session_id || undefined) : (fv(w, 'ses') || undefined), title: fv(w, 't'), mode: m, ext_url: fv(w, 'u') || undefined, rec_allowed: fv(w, 'rec') }), r ? '수정했습니다.' : '실시간 수업을 만들었습니다. 「열기」로 수업 화면을 엽니다.'); }
  ACT['lvs-new'] = () => { const w = modal('새 실시간 수업', roomForm(null), [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w2 => saveRoom(w2, null) }]); fillSessions(w); };
  ACT['lvs-edit'] = el => { const r = roomOf(el.dataset.id); modal('실시간 수업 수정', roomForm(r), [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w2 => saveRoom(w2, r) }]); };

  /* ── 출석 · 수업 기록 ── */
  function vAtt(rooms) {
    const L = rooms.filter(r => r.status !== 'ready' && r.mode !== 'link'); if (!L.length) return '<div class="card"><p class="mini">시작한 실시간 수업이 아직 없습니다. 수업을 시작하면 학생 접속 시간이 쌓이고, 종료하면 출결에 기록됩니다.</p></div>';
    const id = UI.lvAtt && L.some(r => r.room_id === UI.lvAtt) ? UI.lvAtt : L[0].room_id; const A = load('att:' + id, '/api/lms/live/attendance?room_id=' + encodeURIComponent(id)); const Sm = load('sum:' + id, '/api/lms/live/summary?room_id=' + encodeURIComponent(id));
    const sel = `<select data-chg="lvs-attsel" aria-label="수업 고르기">${L.map(r => `<option value="${esc(r.room_id)}" ${r.room_id === id ? 'selected' : ''}>${esc(r.title)} · ${esc(ST[r.status][0])}</option>`).join('')}</select>`;
    if (!A || !Sm) return `<div class="card">${sel}${busy}</div>`; if (A._err) return errBox(A);
    const cnt = k => A.rows.filter(x => x.status === k).length;
    return `<div class="card"><div class="ch"><b>접속 시간 출석</b>${sel}<button class="btn sm" data-act="lvs-attcsv" data-id="${esc(id)}">엑셀(CSV) 내려받기</button></div>
      <p class="mini">수업 시간 ${mmss(A.duration_sec)} · 출석 인정: 접속 ${A.min_pct}% 이상, 시작 10분 뒤 입장은 지각 · 청강생 제외. ${A.final ? (A.room.att && A.room.att.session ? `출결 ${A.room.att.written}명 기록 완료${A.room.att.kept ? ` · 다른 방식으로 이미 정해진 ${A.room.att.kept}명은 그대로` : ''}` : '차시가 연결되지 않아 출결에는 기록하지 않았습니다.') : '수업 중 — 종료하면 출결에 기록됩니다.'}</p>
      <p>${tag('출석 ' + cnt('present'), 'ok')} ${tag('지각 ' + cnt('late'), 'y')} ${tag('결석 ' + cnt('absent'), 'bad')}</p>
      ${table(['학번', '판정', '접속 시간', '비율', '처음 입장'], A.rows.map(x => [esc(x.member_no) + (x.kind === 'audit' ? ' ' + tag('청강') : ''), x.status ? tag(...AST[x.status]) : '—', mmss(x.sec), x.pct + '%', esc(ts(x.first_at))]), '수강생이 없습니다.')}</div>
      <div class="card"><div class="ch"><b>수업 기록</b><small>채팅 ${Sm.chat} · 손들기 ${Sm.hands}</small></div>
      ${Sm.qa.map(q => `<p><b>Q.</b> ${esc(q.text)} <small class="mini">${esc(q.by)}</small>${q.answers.map(a => `<br>↳ ${esc(a)}`).join('')}</p>`).join('') || '<p class="mini">질문이 없었습니다.</p>'}
      ${Sm.polls.map(p => { const tot = p.tally.reduce((a, b) => a + b, 0); return `<p><b>투표</b> ${esc(p.text)} ${p.closed ? tag('마감') : ''}<br>${p.options.map((o, i) => `${esc(o)} ${p.tally[i]}표${tot ? `(${Math.round(p.tally[i] * 100 / tot)}%)` : ''}`).join(' · ')}</p>`; }).join('')}</div>`;
  }
  ACT['lvs-attsel'] = el => { UI.lvAtt = el.value; render(); };
  ACT['lvs-att'] = el => { UI.lvT = 'att'; UI.lvAtt = el.dataset.id; render(); };
  ACT['lvs-attcsv'] = el => { const A = C.c['att:' + el.dataset.id]; if (!A || !A.rows) return; downloadCSV(`실시간수업_출석_${(A.room.title || '').replace(/[\\/:*?"<>|]/g, '')}.csv`, ['학번', '구분', '판정', '접속(초)', '비율(%)', '처음 입장', '마지막 접속', '입장 횟수'], A.rows.map(x => [x.member_no, x.kind === 'audit' ? '청강' : '정규', x.status ? AST[x.status][0] : '', x.sec, x.pct, x.first_at || '', x.last_at || '', x.joins])); };

  /* ── 녹화 ── */
  function vRec() {
    const R = load('recs', '/api/lms/live/recs'); if (!R) return busy; if (R._err) return errBox(R);
    return `<div class="card"><div class="ch"><b>수업 녹화</b><small>교수자 화면 · 음성만 녹화 · 강의자료(동영상)로 등록</small></div>
      <p class="mini">녹화는 수업 화면의 「녹화」로 합니다. 학생은 입장 전 녹화 고지에 동의하고, 녹화 중에는 화면에 표시됩니다. 보존 기간이 지나면 자동으로 파기되고 강의자료에서도 내려갑니다.${R.purged ? ` 방금 보존 기간이 지난 녹화 ${R.purged}건을 파기했습니다.` : ''}</p>
      ${table(['수업', '크기', '보존 기한', '열람', ''], R.recs.map(c => [`<b>${esc(c.room_title || '')}</b><br><small class="mini">${esc(ts(c.created_at))} · ${c.status === 'rec' ? '녹화 중' : c.status === 'deleted' ? (c.delete_reason === 'retention' ? '보존 기간 만료로 파기' : '파기') : c.res_id ? '강의자료 등록' : '완료'}</small>`,
        c.bytes ? (c.bytes / 1048576).toFixed(1) + 'MB' : '—', esc(ts(c.retain_until)), `${c.views}회`,
        c.status === 'deleted' ? '' : `<button class="btn sm" data-act="lvs-recplay" data-id="${esc(c.rec_id)}">보기</button> <button class="btn sm ghost" data-act="lvs-recviews" data-id="${esc(c.rec_id)}">열람 기록</button> <button class="btn sm ghost" data-act="lvs-recdel" data-id="${esc(c.rec_id)}">파기</button>`]), '녹화가 없습니다.')}</div>`;
  }
  ACT['lvs-recplay'] = el => open('rec=' + encodeURIComponent(el.dataset.id));
  ACT['lvs-recviews'] = async el => { try { const j = await api('GET', '/api/lms/live/rec-views?rec_id=' + encodeURIComponent(el.dataset.id)); modal('녹화 열람 기록', table(['누가', '언제'], j.views.map(v => [esc(v.who.replace(/^m:/, '학번 ')), esc(ts(v.at))]), '열람 기록이 없습니다.'), [{ id: 'c', label: '닫기' }]); } catch (e) { toast(e.message, 'warn'); } };
  ACT['lvs-recdel'] = el => modal('녹화 파기', '<p>녹화 파일을 지우고 강의자료에서도 내립니다. 되돌릴 수 없습니다.</p>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '파기', kind: 'pri', run: () => { act(() => api('POST', '/api/lms/live/rec-delete', { rec_id: el.dataset.id }), '녹화를 파기했습니다.'); } }]);

  /* ── 실시간 자막 ── */
  function vCap() {
    const R = load('caps', '/api/lms/live/cap-rooms'); if (!R) return busy; if (R._err) return errBox(R);
    if (!C.cap && R.rooms[0]) C.cap = R.rooms[0].room_id; const r = R.rooms.find(x => x.room_id === C.cap);
    const left = `<div class="card"><div class="ch"><b>자막방</b><button class="btn sm" data-act="lvs-capnew">새 자막방</button></div>${R.rooms.map(x => `<p><button class="btn sm ${x.room_id === C.cap ? 'pri' : 'ghost'}" data-act="lvs-capsel" data-id="${esc(x.room_id)}">${esc(x.title)}</button> <small class="mini">${x.status === 'live' ? '진행 중' : '종료'} · ${esc(LN[x.src_lang])} → ${x.langs.filter(l => l !== x.src_lang).map(l => esc(LN[l])).join(', ') || '번역 없음'} · ${x.lines}문장 · 보는 사람 ${x.viewers}</small></p>`).join('') || '<p class="mini">대면 수업 자막방을 만드세요. 학생은 QR · 링크로 들어와 자기 언어를 고릅니다.</p>'}
      ${capSetting()}</div>`;
    if (!r) return `<div class="lvs-grid">${left}<div class="card"><p class="mini">자막방을 고르거나 만드세요.</p></div></div>`;
    const Ls = load('lines:' + r.room_id, '/api/lms/live/cap-lines?room_id=' + encodeURIComponent(r.room_id)); const T = r.status !== 'live' ? load('tr:' + r.room_id, '/api/lms/live/cap-transcript?room_id=' + encodeURIComponent(r.room_id)) : null;
    const u = LV.url(`cap=${encodeURIComponent(r.code)}`);
    const right = `<div class="card"><div class="ch"><b>${esc(r.title)}</b>${tag(r.status === 'live' ? '진행 중' : '종료', r.status === 'live' ? 'ok' : '')} ${tag(r.visibility === 'public' ? '학생 공개' : '비공개')}</div>
      <div class="lvs-qr">${LV.qr(u)}<div><p class="mini">학생용 QR · 링크(로그인 없이 보기 전용, PC · 휴대폰). 학생이 화면에서 언어 · 글자 크기를 고릅니다.</p><code>${esc(u)}</code>
      <p>${r.status === 'live' ? `<button class="btn sm pri" data-act="lvs-capture" data-id="${esc(r.room_id)}">받아쓰기 시작(마이크)</button> ` : ''}<button class="btn sm" data-act="lvs-capview" data-code="${esc(r.code)}">학생 화면 열기</button></p></div></div></div>
      ${r.status !== 'live' && T ? (T._err ? errBox(T) : `<div class="card"><div class="ch"><b>수업 후 대본 · 요약</b><button class="btn sm" data-act="lvs-capvis" data-v="${r.visibility === 'public' ? 'private' : 'public'}">${r.visibility === 'public' ? '비공개로' : '학생에게 공개'}</button></div>
        <label class="fl">대본(받아쓰기 텍스트 — 고쳐서 저장)<textarea id="lvsTr" class="lvs-txt" maxlength="200000">${esc(T.transcript || '')}</textarea></label>
        <label class="fl">요약 ${T.summary ? tag(r.summary_engine === 'ai' ? 'AI 생성' : r.summary_engine === 'rule' ? '자동 추출' : '직접 작성') : ''}<textarea id="lvsSum" class="lvs-txt" style="min-height:90px" maxlength="20000">${esc(T.summary || '')}</textarea></label>
        <p><button class="btn pri" data-act="lvs-capsave">대본 · 요약 저장</button> <button class="btn" data-act="lvs-capsum">AI로 요약 만들기</button> <button class="btn ghost" data-act="lvs-captxt">텍스트 내려받기</button></p>
        <p class="mini">공개하면 수강생이 학습자 사이트 「내 학습」에서 대본 · 요약을 봅니다. AI 키가 없으면 대본에서 자주 나온 낱말이 많은 문장을 뽑아 요약합니다.</p></div>`) : ''}
      <div class="card"><div class="ch"><b>자막 문장</b>${r.status === 'live' ? `<button class="btn sm" data-act="lvs-captr">번역 채우기</button> <button class="btn sm ghost" data-act="lvs-capend">자막 마치기</button>` : ''}</div>
        ${r.status === 'live' ? `<div class="lo-row" style="display:flex;gap:6px;flex-wrap:wrap"><input id="lvsLine" maxlength="1000" style="flex:1;min-width:160px" placeholder="자막 문장 직접 입력 후 Enter"><button class="btn sm" data-act="lvs-capline">보내기</button></div>` : ''}
        <div class="lvs-lines">${!Ls ? busy : Ls._err ? errBox(Ls) : Ls.lines.slice().reverse().map(l => `<p><small>#${l.seq} ${l.source === 'stt' ? '받아쓰기' : '입력'}${l.edited ? ' · 수정' : ''}</small> ${esc(l.text)} <button class="btn sm ghost" data-act="lvs-capedit" data-seq="${l.seq}">수정</button>${Object.entries(l.tr || {}).map(([k, v]) => `<br><small>[${esc(LN[k])}${(l.tr_engine || {})[k] === 'rule' ? ' · 규칙 번역' : (l.tr_engine || {})[k] === 'manual' ? ' · 직접' : ''}] ${esc(v)}</small>`).join('')}</p>`).join('') || '<p class="mini">아직 자막이 없습니다. 「받아쓰기 시작」으로 말하거나 위 칸에 입력하세요.</p>'}</div>
        <p class="mini">받아쓰기는 교수자 브라우저(크롬 · 엣지 · 사파리)의 음성 인식으로 하고, 번역은 서버 AI가 자막 언어(최대 4개)로 합니다. AI 키가 없으면 강의 용어 사전으로 바꾸는 규칙 번역으로 채우고 「규칙 번역」으로 표시합니다.</p></div>`;
    return `<div class="lvs-grid">${left}<div>${right}</div></div>`;
  }
  function capSetting() {
    const L = sections(); if (!L.length) return ''; const sid = UI.lvCs && L.some(s => s.section_id === UI.lvCs) ? UI.lvCs : L[0].section_id; const s = load('cs:' + sid, '/api/lms/live/cap-setting?section_id=' + encodeURIComponent(sid)); if (!s) return busy; if (s._err) return '';
    return `<details class="fold"><summary><b>강의별 자막 설정</b></summary><label class="fl">분반<select data-chg="lvs-cssel">${L.map(x => `<option value="${esc(x.section_id)}" ${x.section_id === sid ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>
      <label class="ck"><input type="checkbox" id="lvsCsOn" ${s.enabled ? 'checked' : ''}> 이 강의에서 실시간 자막 사용</label>
      <label class="fl">말하는 언어<select id="lvsCsSrc">${Object.keys(LN).map(l => `<option value="${l}" ${l === s.src_lang ? 'selected' : ''}>${LN[l]}</option>`).join('')}</select></label>
      <p class="mini">자막 언어(최대 4개)</p><div class="lv-langs">${Object.keys(LN).map(l => `<label><input type="checkbox" class="lvsCsL" value="${l}" ${s.langs.includes(l) ? 'checked' : ''}> ${LN[l]}</label>`).join('')}</div>
      <label class="fl">수업 후 대본 기본 공개<select id="lvsCsVis"><option value="private" ${s.visibility === 'private' ? 'selected' : ''}>비공개</option><option value="public" ${s.visibility === 'public' ? 'selected' : ''}>수강생에게 공개</option></select></label>
      <button class="btn sm" data-act="lvs-cssave" data-id="${esc(sid)}">설정 저장</button></details>`;
  }
  ACT['lvs-cssel'] = el => { UI.lvCs = el.value; render(); };
  ACT['lvs-cssave'] = el => { const src = document.getElementById('lvsCsSrc').value; const langs = [...new Set([src, ...[...document.querySelectorAll('.lvsCsL:checked')].map(x => x.value)])]; if (langs.length > 4) return toast('자막 언어는 말하는 언어를 포함해 4개까지입니다.', 'warn');
    act(() => api('POST', '/api/lms/live/cap-setting', { section_id: el.dataset.id, enabled: document.getElementById('lvsCsOn').checked, src_lang: src, langs, visibility: document.getElementById('lvsCsVis').value }), '강의별 자막 설정을 저장했습니다.'); };
  ACT['lvs-capsel'] = el => { C.cap = el.dataset.id; render(); };
  ACT['lvs-capnew'] = () => modal('새 자막방', `<label class="fl">제목<input name="t" maxlength="80" placeholder="자료구조 3주차 대면 수업"></label><label class="fl">분반${secSel('sec', UI.lvCs)}</label><p class="mini">말하는 언어 · 자막 언어 · 공개 범위는 「강의별 자막 설정」을 따릅니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { if (!fv(w, 't')) { toast('제목을 입력하세요.', 'warn'); return false; } act(async () => { const j = await api('POST', '/api/lms/live/cap-room', { title: fv(w, 't'), section_id: fv(w, 'sec') || undefined }); C.cap = j.room.room_id; return j; }, '자막방을 열었습니다. 「받아쓰기 시작」을 누르세요.'); } }]);
  ACT['lvs-capture'] = el => open('capture=' + encodeURIComponent(el.dataset.id));
  ACT['lvs-capview'] = el => open('cap=' + encodeURIComponent(el.dataset.code));
  ACT['lvs-capline'] = () => { const i = document.getElementById('lvsLine'); const t = i && i.value.trim(); if (!t) return; act(() => api('POST', '/api/lms/live/cap-seg', { room_id: C.cap, text: t, source: 'manual' })).then(() => { const e = document.getElementById('lvsLine'); if (e) e.focus(); }); };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'lvsLine') { e.preventDefault(); ACT['lvs-capline'](); } });
  ACT['lvs-captr'] = () => act(async () => { const j = await api('POST', '/api/lms/live/cap-translate', { room_id: C.cap }); if (j.note) toast(j.note, 'warn'); else toast(j.saved ? `번역 ${j.saved}건을 채웠습니다.` : '번역할 문장이 없습니다.', 'ok'); return j; });
  ACT['lvs-capend'] = () => act(async () => { await api('POST', '/api/lms/live/cap-translate', { room_id: C.cap }).catch(() => { }); return api('POST', '/api/lms/live/cap-finish', { room_id: C.cap }); }, '자막을 마치고 대본을 저장했습니다.');
  ACT['lvs-capedit'] = el => { const L = C.c['lines:' + C.cap].lines.find(x => x.seq === +el.dataset.seq); const r = C.c.caps.rooms.find(x => x.room_id === C.cap);
    modal(`자막 #${L.seq} 수정`, `<label class="fl">원문<input name="t" maxlength="1000" value="${esc(L.text)}"></label>${r.langs.filter(l => l !== r.src_lang).map(l => `<label class="fl">${LN[l]}<input name="tr_${l}" maxlength="1000" value="${esc((L.tr || {})[l] || '')}"></label>`).join('')}`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const tr = {}; r.langs.filter(l => l !== r.src_lang).forEach(l => { const v = fv(w, 'tr_' + l); if (v && v !== (L.tr || {})[l]) tr[l] = v; }); act(() => api('POST', '/api/lms/live/cap-edit', { room_id: C.cap, seq: L.seq, text: fv(w, 't'), tr: Object.keys(tr).length ? tr : null }), '수정했습니다.'); } }]); };
  ACT['lvs-capsave'] = () => act(() => api('POST', '/api/lms/live/cap-script', { room_id: C.cap, transcript: document.getElementById('lvsTr').value, summary: document.getElementById('lvsSum').value }), '대본 · 요약을 저장했습니다.');
  ACT['lvs-capsum'] = () => act(async () => { const j = await api('POST', '/api/lms/live/cap-summary', { room_id: C.cap }); toast(j.engine === 'ai' ? 'AI 요약을 만들었습니다(검토 후 공개하세요).' : 'AI를 쓸 수 없어 대본에서 핵심 문장을 뽑아 요약했습니다.', j.engine === 'ai' ? 'ok' : 'warn'); return j; });
  ACT['lvs-capvis'] = el => act(() => api('POST', '/api/lms/live/cap-script', { room_id: C.cap, visibility: el.dataset.v }), el.dataset.v === 'public' ? '수강생에게 공개했습니다.' : '비공개로 바꿨습니다.');
  ACT['lvs-captxt'] = () => { const T = C.c['tr:' + C.cap]; if (!T) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + (T.transcript || '') + (T.summary ? '\n\n[요약]\n' + T.summary : '')], { type: 'text/plain' })); a.download = `${(T.room.title || '자막').replace(/[\\/:*?"<>|]/g, '')}_대본.txt`; a.click(); };

  /* ── 자막 이용 현황 ── */
  function vStats() {
    const d = UI.lvDays || 30; const s = load('stats:' + d, '/api/lms/live/cap-stats?days=' + d); if (!s) return busy; if (s._err) return errBox(s);
    const kv = o => Object.entries(o).map(([k, v]) => `${esc(LN[k] || ({ ai: 'AI 번역', rule: '규칙 번역', manual: '직접 입력' })[k] || k)} ${v}`).join(' · ') || '—';
    return `<div class="card"><div class="ch"><b>자막 이용 현황</b><select data-chg="lvs-days">${[7, 30, 90, 365].map(x => `<option value="${x}" ${x === d ? 'selected' : ''}>최근 ${x}일</option>`).join('')}</select></div>
      <p>${tag('자막방 ' + s.rooms)} ${tag('문장 ' + s.lines)} ${tag('받아쓰기 ' + s.stt)} ${tag('직접 입력 ' + s.manual)} ${tag('수정 ' + s.edited)} ${tag('약 ' + s.minutes + '분')} ${tag('공개 대본 ' + s.public)} ${tag('요약 ' + s.summaries)}</p>
      <p class="mini">언어별 번역: ${kv(s.translated)}<br>번역 방식: ${kv(s.engines)}<br>언어별 보는 사람(중복 제외): ${kv(s.viewers)}</p>
      ${table(['분반', '자막방', '문장'], s.by_section.map(x => [esc(x.title), x.rooms, x.lines]), '이 기간에 자막을 쓴 강의가 없습니다.')}</div>`;
  }
  ACT['lvs-days'] = el => { UI.lvDays = +el.value; render(); };

  /* ── 연결 설정(TURN · SFU · 한도 · 보존) ── */
  function vSet() {
    const s = load('set', '/api/lms/live/setting'); if (!s) return busy; if (s._err) return errBox(s); const adm = S.me && ['owner', 'sub', 'admin'].includes(S.me.role);
    return `<div class="card"><div class="ch"><b>연결 설정</b>${adm ? '' : '<small>운영자만 바꿀 수 있습니다</small>'}</div>
      <p class="mini">${esc(LV.LIMIT)} 학교 방화벽 · 휴대폰 데이터망에서는 직접 연결이 막힐 수 있어 TURN 서버(coturn 등)를 넣어야 안정적입니다.</p>
      <label class="fl">STUN 주소(쉼표로)<input id="lvsStun" value="${esc((s.stun_urls || []).join(', '))}"></label>
      <label class="fl">TURN 주소(쉼표로 · 예: turn:turn.학교.ac.kr:3478)<input id="lvsTurn" value="${esc((s.turn_urls || []).join(', '))}"></label>
      <div class="form2"><label class="fl">TURN 사용자<input id="lvsTu" value="${esc(s.turn_user || '')}"></label><label class="fl">TURN 비밀번호${s.turn_cred_set ? ' (설정됨)' : ''}<input id="lvsTc" type="password" placeholder="바꿀 때만 입력"></label></div>
      <label class="fl">SFU 어댑터 주소(대규모 수업 — 연동 후 동작)<input id="lvsSfu" value="${esc(s.sfu_url || '')}" placeholder="wss://sfu.학교.ac.kr/rtc"></label>
      <div class="form2"><label class="fl">소그룹 최대 인원<input id="lvsMesh" type="number" min="2" max="12" value="${s.mesh_max}"></label><label class="fl">방송 직접 연결 최대 학생 수<input id="lvsFan" type="number" min="1" max="60" value="${s.fanout_max}"></label>
      <label class="fl">녹화 보존 기간(일)<input id="lvsDays" type="number" min="1" max="1825" value="${s.rec_days}"></label><label class="fl">출석 인정 접속 비율(%)<input id="lvsPct" type="number" min="1" max="100" value="${s.att_min_pct}"></label></div>
      ${adm ? '<button class="btn pri" data-act="lvs-setsave">저장</button>' : ''}</div>`;
  }
  ACT['lvs-setsave'] = () => { const v = id => document.getElementById(id).value.trim(); const arr = id => v(id).split(',').map(x => x.trim()).filter(Boolean);
    const b = { stun_urls: arr('lvsStun'), turn_urls: arr('lvsTurn'), turn_user: v('lvsTu'), sfu_url: v('lvsSfu'), mesh_max: +v('lvsMesh'), fanout_max: +v('lvsFan'), rec_days: +v('lvsDays'), att_min_pct: +v('lvsPct') }; if (v('lvsTc')) b.turn_cred = v('lvsTc');
    act(() => api('POST', '/api/lms/live/setting', b), '연결 설정을 저장했습니다.'); };

  /* ═════════ 묶음 O 「수업 실시간 자막」 탭 → 이 화면으로 잇기(원본은 그대로) ═════════ */
  { const base = VIEWS.lmso; if (typeof base === 'function') VIEWS.lmso = (...a) => { const h = base(...a); if (UI.loT !== 'cap' || !(typeof ULMS === 'function' && ULMS())) return h;
    const note = '<div class="card"><div class="ch"><b>음성 받아쓰기 · 자동 번역 · 수업 후 대본</b><button class="btn sm pri" data-act="lvs-gocap">실시간 자막 열기</button></div><p class="mini">교수자 마이크로 받아쓰고(크롬 · 엣지 · 사파리), 최대 4개 언어로 번역하며, 수업 뒤 대본 · 요약 · 공개 설정 · 이용 현황까지 「강의실 › 실시간 수업 › 실시간 자막」에서 합니다. 여기서 만든 자막방도 그대로 보입니다.</p></div>';
    const i = h.indexOf('<div class="lo-grid">'); return i >= 0 ? h.slice(0, i) + note + h.slice(i) : h + note; }; }
  ACT['lvs-gocap'] = () => { UI.lvT = 'cap'; go('lmslive'); };
})();
