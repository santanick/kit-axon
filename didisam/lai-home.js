/* 디디쌤 학습자 화면 v24 — '내 AI 학습 비서' 홈(lai)
   대표님(2026-11-03): '요즘 AI 비서 서비스처럼 심플하게. Connect로 업무 툴을 연결해 자동화를 만들듯이, 학습자에게도 AI 비서를.'
   - 홈 맨 위 = 비서: 인사 + 입력창 하나 + 추천 질문(최대 4) + 화면 안 답(떠 있는 튜터 창을 열지 않음)
   - 로그인 후: 이어서 학습하기(lux) → 오늘 할 일 → Connect(Google Calendar 학습 일정 · 카카오톡 알림) · 내 자동화(학습 리마인더)
   - 로그인 전: 같은 입력창으로 강좌 · 수강 방법 · 가입을 바로 물어봄(v23.4 방문자 튜터 그대로), 연결 · 자동화는 로그인 안내
   - 튜터 원칙 그대로: 과제를 대신 써 주지 않음 · 사람이 열 때만 열림 · 대화 내용 저장 안 함
   - 저장: LR.lp.conn = { gcal:{on,at,mode} }, LR.lp.auto = [{ id, k, on, t, m, at }] (데모 — 실제 알림 · 캘린더 등록은 운영 서버)
   learner.html에서 lux.js 다음, lboot.js 바로 앞. */
'use strict';
(() => {
  Object.assign(ICP, { bolt: 'M13 3L5 14h6l-1 7 8-11h-6z', sparkle: 'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z', bell: ICP.bell || 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0' });
  const on = () => { try { return !!SITE() && TCFG().enabled !== false && route().a === 'home'; } catch (e) { return false; } };
  const U = () => SITE().org.type === 'univ';
  const lp = () => LR.lp || {};
  const conn = () => { const L = LR.lp; L.conn = L.conn && typeof L.conn === 'object' ? L.conn : {}; return L.conn; };
  const autos = () => { const L = LR.lp; L.auto = Array.isArray(L.auto) ? L.auto : []; return L.auto; };
  const phoneOn = () => { try { return !!(LR.me && typeof laV === 'function' && (laV().ids[LR.me.sid] || {}).phone); } catch (e) { return false; } };
  const gcalOn = () => !!(LR.me && conn().gcal && conn().gcal.on);
  const TPL = [
    { k: 'review', n: '매일 저녁 복습', d: t => `매일 ${t || '21:00'} · 10분 복습할 레슨을 골라 알려 드려요`, t: '21:00' },
    { k: 'deadline', n: '마감 3일 전 알림', d: () => '과제 · 수강 기간 마감 3일 전에 남은 할 일을 알려 드려요' },
    { k: 'weekly', n: '일요일 저녁 · 이번 주 정리', d: () => '일요일 20:00 · 이번 주 진도와 다음 주 계획을 정리해 드려요', t: '20:00' }
  ];
  const chans = () => ['앱 알림', ...(phoneOn() ? ['카카오톡'] : []), ...(gcalOn() ? ['캘린더'] : [])].join(' · ');

  /* ── 화면 조각 ── */
  function threadHTML() { const M = (LT.msgs || []).filter(m => !m.sys); return M.map(ltMsgHTML).join('') + (LT.busy ? '<div class="lt-m"><span class="lt-orb sm" aria-hidden="true"></span><div class="lt-b"><span class="lt-dots"><i></i><i></i><i></i></span></div></div>' : ''); }
  function heroHTML() {
    const C = TCFG(); const me = LR.me; const who = me ? (typeof lCall === 'function' ? lCall() : (me.nick || me.sid) + '님') : '';
    const chips = (typeof LSAM === 'object' ? LSAM.screen().chips.filter(c => !c.kind).map(c => [c.l, c.q]) : (typeof ltChips === 'function' ? ltChips() : []).map(x => [x, x])).slice(0, 4); const th = threadHTML();
    return `<section class="lai" aria-labelledby="laiH"><div class="in lai-w">
      <span class="lai-orb" aria-hidden="true">${ico('sparkle', 22)}</span>
      <p class="lai-ey">${esc(C.name)} · 내 AI 학습 비서</p>
      <h1 id="laiH">${me ? `${esc(who)}, 오늘은<br><em>무엇을 함께 해 볼까요?</em>` : `궁금한 것을<br><em>무엇이든 물어보세요</em>`}</h1>
      <form class="lai-f" id="laiF"><label for="laiQ" class="sr">${esc(C.name)}에게 질문</label><textarea id="laiQ" rows="1" maxlength="800" placeholder="${me ? '예: 이번 주 학습 계획 짜줘' : '예: 어떤 강좌가 있어요?'}"></textarea><button type="submit" aria-label="보내기">${ico('send', 18)}</button></form>
      <div class="lai-chips" role="list" aria-label="추천 질문">${chips.map(([l, q]) => `<button type="button" role="listitem" class="lt-chip" data-tact="q" data-v="${esc(q)}">${esc(l)}</button>`).join('')}</div>
      <p class="lai-note">${me ? '과제를 대신 써 주지 않고 함께 풀어요 · 대화 내용은 저장하지 않아요' : '로그인 없이 강좌 · 수강 방법 · 가격을 안내해 드려요. <a href="#login">로그인</a>하면 이어서 학습 · 학습 리마인더도 쓸 수 있어요.'}</p>
      <div class="lai-res" ${th ? '' : 'hidden'}><div class="lai-rh"><b>${esc(C.name)}의 답</b><button type="button" class="lai-lk" data-lai="clear">지우기</button></div><div class="lai-th" aria-live="polite">${th}</div></div>
    </div></section>`;
  }
  function todoHTML() { const A = typeof ltTodo === 'function' ? ltTodo() : []; if (!A.length) return '';
    return `<div class="lai-sec"><div class="lai-sh"><h2>오늘 할 일 <small>${A.length}가지</small></h2></div><ul class="lai-l">${A.map(a => `<li><a class="lai-row ${a.k === 'warn' ? 'warn' : ''}" href="${esc(a.href)}"><span><b>${esc(a.h)}</b><small>${esc(a.d || '')}</small></span>${ico('arrow', 16)}</a></li>`).join('')}</ul></div>`; }
  function connHTML() {
    const g = gcalOn(); const p = phoneOn(); const cards = [`<button type="button" class="lai-cc ${g ? 'on' : ''}" data-lai="gcal" aria-label="Google Calendar — ${g ? '연결됨' : '미연결'}. 연결 안내 열기"><span class="lai-lg" style="--c:#1A73E8">G</span><span class="lai-cm"><b>Google Calendar</b><small>${g ? '학습 일정 연동 중' : '학습 일정 연동'}</small></span><i class="lai-dot" aria-hidden="true"></i></button>`];
    if (!U()) cards.push(`<a class="lai-cc ${p ? 'on' : ''}" href="#acct/phone" aria-label="카카오톡 알림 — ${p ? '받는 중' : '미신청'}. 신청 화면으로"><span class="lai-lg" style="--c:#F2C200;color:#3A1D1D">K</span><span class="lai-cm"><b>카카오톡 알림</b><small>${p ? '알림톡 받는 중' : '알림톡 신청하기'}</small></span><i class="lai-dot" aria-hidden="true"></i></a>`);
    return `<div class="lai-sec"><div class="lai-sh"><h2>Connect <small>${[g, !U() && p].filter(Boolean).length}/${cards.length}</small></h2></div><div class="lai-cn">${cards.join('')}</div><p class="lai-sub">연결하면 리마인더를 캘린더 · 카카오톡으로도 받아요.</p></div>`; }
  function autoHTML() { const L = autos(); const rows = L.map(a => { const T = TPL.find(x => x.k === a.k) || { n: a.k, d: () => '' };
      return `<li class="lai-ar ${a.on ? '' : 'off'}"><span class="lai-ai">${ico('bolt', 15)}</span><span class="lai-am"><b>${esc(T.n)}</b><small>${esc(T.d(a.t))}${a.on ? ` · ${esc(chans())}` : ' · 꺼짐'}</small>${a.k === 'review' ? `<label class="lai-tm">알림 시각 <input type="time" value="${esc(a.t || '21:00')}" data-lai-t="${esc(a.id)}"></label>` : ''}</span><label class="lai-sw"><input type="checkbox" ${a.on ? 'checked' : ''} data-lai-on="${esc(a.id)}" aria-label="${esc(T.n)} ${a.on ? '끄기' : '켜기'}"><span></span></label></li>`; });
    const tp = TPL.filter(x => !L.some(a => a.k === x.k)).map(x => `<li class="lai-ar tp"><span class="lai-am"><b>${esc(x.n)}</b><small>${esc(x.d(x.t))}</small></span><button type="button" class="lbtn sm ghost" data-lai="mk" data-v="${x.k}">켜기</button></li>`);
    return `<div class="lai-sec"><div class="lai-sh"><h2>내 자동화 <small>${L.filter(a => a.on).length ? `${L.filter(a => a.on).length}개 켜짐` : '학습 리마인더'}</small></h2></div><ul class="lai-l">${rows.join('')}${tp.join('')}</ul><p class="lai-sub">데모에서는 설정만 저장합니다. 실제 알림은 운영 서버가 보냅니다.</p></div>`; }
  const moreHTML = () => `<section class="lai-more" aria-label="내 학습 비서 도구"><div class="in lai-w">${todoHTML()}<div class="lai-two">${connHTML()}${autoHTML()}</div></div></section>`;

  window.laiMore = () => moreHTML(); /* v27.1 학습자 앱 '연결 · 알림' 화면(#connect)이 같은 카드를 쓴다 */
  function mount() { const lm = document.getElementById('lm'); if (!lm || lm.querySelector('.lai')) return;
    /* v25.1 잔여 QA: 방문자에게는 기관 홈페이지 첫 화면(히어로)을 먼저 보여 주고 AI 학습 비서는 그 바로 아래에 둔다(로그인하면 비서가 맨 위). */
    let placed = false; if (!LR.me && LR.mode !== 'preview') { try { const host = lm.querySelector('.smhost[data-smk=home]'); const sr = host && host.shadowRoot; const smr = sr && sr.querySelector('.smr'); const kids = smr ? [...smr.children] : [];
      if (kids.length > 1) { const h2 = document.createElement('div'); h2.className = 'smhost lai-split'; h2.dataset.ok = '1'; host.after(h2); const sr2 = h2.attachShadow({ mode: 'open' }); const st = sr.querySelector('style'); sr2.innerHTML = (st ? st.outerHTML : '') + `<div class="${smr.className}"></div>`; const box = sr2.querySelector('.smr'); kids.slice(1).forEach(k => box.appendChild(k)); host.insertAdjacentHTML('afterend', heroHTML()); placed = true; } if (!placed) { const hero = lm.querySelector(':scope > .hero'); if (hero) { hero.insertAdjacentHTML('afterend', heroHTML()); placed = true; } } } catch (e) { console.error('lai split', e); } }
    if (!placed) lm.insertAdjacentHTML('afterbegin', heroHTML()); document.body.classList.add('lai-on');
    if (LR.me) { const after = lm.querySelector('.lux-cont') || lm.querySelector('.lai'); after.insertAdjacentHTML('afterend', moreHTML()); } }
  function sync() { const box = document.querySelector('.lai-res'); if (!box) return; const h = threadHTML(); box.hidden = !h; const th = box.querySelector('.lai-th'); th.innerHTML = h; th.scrollTop = th.scrollHeight; }
  function remount() { document.querySelectorAll('#lm .lai-more').forEach(x => x.remove()); const lm = document.getElementById('lm'); if (!lm || !LR.me) return; const after = lm.querySelector('.lux-cont') || lm.querySelector('.lai') || lm.querySelector('.ap-conn-a'); if (after) after.insertAdjacentHTML('afterend', moreHTML()); }

  { const base = lrender; lrender = (...a) => { document.body.classList.remove('lai-on'); base(...a); try { if (on()) { mount(); if (LT.nudge) { LT.nudge = ''; ltRender(); } } } catch (e) { console.error('lai', e); } }; }
  { const base = ltRender; ltRender = (...a) => { const r = base(...a); try { sync(); } catch (e) { } return r; }; }

  /* ── Google Calendar 연결(데모) · 학습 일정 파일(.ics) ── */
  /* v27.1 캘린더에 리마인더 + 수강 마감일(3일 전 알림) + AI 선생님과 짠 이번 주 계획까지 넣는다(iPhone · 안드로이드 · Google · Outlook 캘린더 공통 .ics) */
  function ics() { const L = autos().filter(a => a.on); const pad = n => String(n).padStart(2, '0'); const d = new Date(); const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const tx = v => String(v || '').replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\r?\n/g, '\\n').slice(0, 150); const org = SITE().org.name; const ev = [];
    L.filter(a => a.k !== 'deadline').forEach(a => { const tm = String(a.t || (a.k === 'weekly' ? '20:00' : '21:00')).replace(':', '') + '00'; const T = TPL.find(x => x.k === a.k);
      ev.push(['BEGIN:VEVENT', `UID:${a.id}@didisam`, `DTSTAMP:${day}T000000`, `DTSTART:${day}T${tm}`, 'DURATION:PT10M', a.k === 'weekly' ? 'RRULE:FREQ=WEEKLY;BYDAY=SU' : 'RRULE:FREQ=DAILY', `SUMMARY:${tx(T.n + ' · ' + org)}`, 'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:학습 리마인더', 'END:VALARM', 'END:VEVENT'].join('\r\n')); });
    try { const st = typeof myStats === 'function' ? myStats() : null; (st ? st.courses : []).filter(x => !x.done && /^\d{4}-\d{2}-\d{2}$/.test(String(x.c.end || ''))).forEach(x => { const e = x.c.end.replace(/-/g, '');
      ev.push(['BEGIN:VEVENT', `UID:end-${x.c.id}@didisam`, `DTSTAMP:${day}T000000`, `DTSTART;VALUE=DATE:${e}`, `SUMMARY:${tx('수강 마감 · ' + x.c.name)}`, `DESCRIPTION:${tx(org + ' · 남은 진도 ' + (100 - x.p) + '%')}`, 'BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', 'DESCRIPTION:수강 마감 3일 전', 'END:VALARM', 'END:VEVENT'].join('\r\n')); }); } catch (e) { }
    try { const P = ((LR.lp.tutor || {}).plan || []); const y = d.getFullYear(); P.forEach((x, i) => { const m = String(x.d || '').match(/(\d{1,2})\/(\d{1,2})/); if (!m) return; const ds = `${y}${pad(+m[1])}${pad(+m[2])}`; const st = `T${pad(19 + (i % 2))}0000`;
      ev.push(['BEGIN:VEVENT', `UID:plan-${ds}-${i}@didisam`, `DTSTAMP:${day}T000000`, `DTSTART:${ds}${st}`, `DURATION:PT${Math.max(10, +x.m || 20)}M`, `SUMMARY:${tx(x.t)}`, `DESCRIPTION:${tx('AI 선생님과 짠 학습 계획 · ' + org)}`, 'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:학습 계획', 'END:VALARM', 'END:VEVENT'].join('\r\n')); }); } catch (e) { }
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DIDISAM//learner//KO', `X-WR-CALNAME:${tx(org + ' 학습')}`, ...ev, 'END:VCALENDAR'].join('\r\n'); }
  function dlg(title, body, btns) { let d = document.getElementById('laiDlg'); if (d) d.remove(); d = document.createElement('dialog'); d.id = 'laiDlg'; d.className = 'lai-dlg'; d.setAttribute('aria-labelledby', 'laiDlgT');
    d.innerHTML = `<h2 id="laiDlgT">${esc(title)}</h2>${body}<div class="lai-db">${btns}</div>`; document.body.appendChild(d); try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } d.addEventListener('close', () => d.remove()); return d; }
  function gcalDlg() { const g = gcalOn();
    dlg('Google Calendar 학습 일정', `<p class="mini">켜 둔 학습 리마인더(복습 · 주간 정리)를 내 캘린더 일정으로 넣어 휴대폰 알림으로 받습니다. 지금 상태: <b>${g ? '연결됨' : '미연결'}</b></p><ol class="lai-steps"><li>[연결하기]를 누르고 내 Google 계정을 고릅니다.</li><li>동의 화면에서 「캘린더 일정 만들기」 권한만 허용합니다(다른 일정은 읽지 않습니다).</li><li>내 자동화에서 리마인더를 켜면 같은 시각에 캘린더 알림이 옵니다.</li></ol><p class="mini">Google 계정 없이도 [일정 파일 받기]로 받은 .ics 파일을 캘린더 앱에서 열면 같은 일정이 들어갑니다.</p>`,
      `<button type="button" class="lbtn sm ghost" data-lai="ics">일정 파일 받기(.ics)</button>${g ? '<button type="button" class="lbtn sm ghost" data-lai="gcal-off">연결 해제</button>' : '<button type="button" class="lbtn sm pri" data-lai="gcal-on">연결하기(데모)</button>'}<button type="button" class="lbtn sm ghost" data-lai="x">닫기</button>`); }
  function save(msg) { LR.api.save(); remount(); if (msg) toast(msg, 'ok'); }

  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-lai]'); if (!el) return; const k = el.dataset.lai;
    if (k === 'clear') { LT.msgs = []; sync(); return; }
    if (k === 'x') { const d = document.getElementById('laiDlg'); d && d.close(); return; }
    if (!LR.me && ['gcal', 'mk', 'gcal-on'].includes(k)) { location.hash = '#login'; return; }
    if (k === 'gcal') gcalDlg();
    if (k === 'gcal-on') { conn().gcal = { on: true, mode: 'demo', at: new Date().toISOString() }; /* 운영: Google OAuth(calendar.events 범위만) → 서버가 리마인더를 일정으로 등록 */ document.getElementById('laiDlg')?.close(); save('Google Calendar를 연결했습니다(데모). 켜 둔 리마인더가 캘린더 일정으로 들어갑니다.'); }
    if (k === 'gcal-off') { delete conn().gcal; document.getElementById('laiDlg')?.close(); save('Google Calendar 연결을 해제했습니다.'); }
    if (k === 'ics') { try { const b = new Blob([ics()], { type: 'text/calendar' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'didisam-study.ics'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('학습 일정 파일을 받았습니다. 캘린더 앱에서 열어 주세요.', 'ok'); } catch (er) { toast('파일을 만들지 못했습니다.', 'bad'); } }
    if (k === 'mk') { const T = TPL.find(x => x.k === el.dataset.v); if (!T || autos().some(a => a.k === T.k)) return; autos().push({ id: 'ra' + Date.now().toString(36), k: T.k, on: true, t: T.t || '', at: new Date().toISOString() }); /* 운영: 서버 스케줄러가 시각에 앱 알림 · 알림톡 · 캘린더로 보냄 */ save(`「${T.n}」 리마인더를 켰습니다.`); }
  });
  document.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.laiOn) { const a = autos().find(x => x.id === t.dataset.laiOn); if (a) { a.on = t.checked; save(a.on ? '리마인더를 켰습니다.' : '리마인더를 껐습니다.'); } }
    if (t.dataset.laiT) { const a = autos().find(x => x.id === t.dataset.laiT); if (a && /^\d{2}:\d{2}$/.test(t.value)) { a.t = t.value; save(`복습 알림을 ${t.value}로 바꿨습니다.`); } } });
  document.addEventListener('submit', e => { if (e.target.id !== 'laiF') return; e.preventDefault(); const ta = e.target.querySelector('textarea'); const v = ta.value; ta.value = ''; ta.style.height = ''; ltAsk(v); });
  document.addEventListener('keydown', e => { if (e.target.id === 'laiQ' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); } });
  document.addEventListener('input', e => { if (e.target.id === 'laiQ') { e.target.style.height = 'auto'; e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px'; } });
})();
