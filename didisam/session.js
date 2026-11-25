/* 가디언 4차(2026-11-25, 인증 크로스체크 #2 · #3 · #4) 운영자 세션 화면 — 운영 모드(live.js)에서만 동작, 기존 화면 파일은 감싸기로만 확장
   - 만료 5분 전 안내 + [계속 사용](POST /api/session/touch). 조회(GET /api/session)는 세션을 연장하지 않는다.
   - 화면을 쓰는 동안(클릭 · 입력)은 유휴 시간의 절반마다 한 번 연장.
   - 로그인 응답 others > 0 → "다른 기기에서도 로그인되어 있습니다." 배너
   - 설정: 「로그인 기기 · 세션」(목록 · 다른 기기 모두 로그아웃 · 작업 모드 · window.mfaSettingsHTML) · 「기관 보안 설정」(유휴 · 동시 세션 · 추가 인증 방식, 정운영자만 변경) */
(() => {
  'use strict';
  const live = () => typeof LIVE !== 'undefined' && LIVE && LIVE.user;
  const em = e => (window.errMsg ? window.errMsg(e) : (e && e.message) || '오류가 발생했습니다.');
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const call = async (method, url, body) => {
    const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; throw e; } return j;
  };
  const tst = (m, k) => { if (typeof toast === 'function') toast(m, k); };
  const role = () => (typeof S !== 'undefined' && S && S.me && S.me.role) || (live() && LIVE.user.role) || '';
  const fmt = iso => { try { return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(iso || ''); } };
  const SS = window.SESS = { info: null, at: 0, lastTouch: Date.now(), warned: false };

  /* ── 배너(만료 안내 · 다른 기기) ── */
  function bar(id, html) {
    let el = document.getElementById(id); if (!html) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = id; el.setAttribute('role', 'status'); el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:' + (id === 'ss-warn' ? '24px' : '84px') + ';z-index:9999;max-width:min(560px,calc(100vw - 32px));padding:12px 16px;border-radius:12px;background:var(--surface,#fff);color:var(--text,#111);box-shadow:0 6px 24px rgba(0,0,0,.18);border:1px solid var(--line,#ddd);font-size:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap'; document.body.appendChild(el); }
    el.innerHTML = html;
  }
  async function poll() {
    if (!live()) return;
    try { SS.info = await call('GET', '/api/session'); SS.at = Date.now(); }
    catch (e) { if (e.status === 401) { bar('ss-warn', '<span>오랫동안 사용하지 않아 자동으로 로그아웃되었습니다. 다시 로그인하십시오.</span><button class="btn pri" data-ss="relogin">다시 로그인</button>'); } return; }
    const r = SS.info.remain;
    if (r <= 300 && !SS.info.work) bar('ss-warn', `<span>${Math.max(1, Math.ceil(r / 60))}분 뒤 자동으로 로그아웃됩니다. 계속 사용하려면 [계속 사용]을 누르십시오.</span><button class="btn pri" data-ss="touch">계속 사용</button>`);
    else bar('ss-warn', '');
  }
  async function touch() { try { SS.info = await call('POST', '/api/session/touch'); SS.lastTouch = Date.now(); bar('ss-warn', ''); } catch (e) { if (e.status === 401) poll(); else tst(em(e), 'warn'); } }
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-ss]'); if (!b) return; const k = b.dataset.ss;
    if (k === 'touch') touch(); else if (k === 'relogin') location.reload();
    else if (k === 'devices') { bar('ss-others', ''); openSet('sess'); } else if (k === 'x') bar(b.closest('[id]').id, '');
  });
  /* 화면 사용 중: 유휴 시간의 절반마다 한 번 연장 */
  const act = () => { if (!live() || !SS.info) return; const half = (SS.info.idleMin || 60) * 30e3; if (Date.now() - SS.lastTouch > half) touch(); };
  ['click', 'keydown'].forEach(t => document.addEventListener(t, act, { passive: true, capture: true }));
  setInterval(poll, 60e3); setTimeout(poll, 3000); SS.poll = poll; /* 시험 · 다른 화면에서 즉시 확인 */
  /* 로그인 응답의 others(다른 활성 세션 수) — live.js · mfa.js를 고치지 않고 응답만 살핀다 */
  { const f0 = window.fetch; window.fetch = async (...a) => { const r = await f0(...a); try { const u = String(a[0] && a[0].url || a[0]); if (/\/api\/login(\/mfa)?$/.test(u.split('?')[0]) && r.ok) r.clone().json().then(j => { if (j && j.others > 0) setTimeout(() => bar('ss-others', '<span>다른 기기에서도 로그인되어 있습니다.</span><button class="btn" data-ss="devices">로그인 기기 보기</button><button class="btn ghost" data-ss="x" aria-label="닫기">닫기</button>'), 800); SS.lastTouch = Date.now(); setTimeout(poll, 1500); }).catch(() => { }); } catch (e) { } return r; }; }

  /* ── 설정 카드 ── */
  function openSet(k) { if (typeof S === 'undefined' || !S) return; if (typeof slSetOpen === 'function') slSetOpen(k); if (typeof UI !== 'undefined') UI.settings = k; if (typeof go === 'function') go('settings'); }
  { const prev = window.SXC_X; window.SXC_X = SXN => { const out = prev ? prev(SXN) : []; if (!live()) return out; SXN.sess = '로그인 기기 · 세션';
    out.push({ k: 'sess', n: '로그인 기기 · 세션', i: 'lock', subs: ['sess'], kw: '세션 로그인 기기 동시 접속 로그아웃 작업 모드 자동 로그아웃 추가 인증 2단계 인증 앱', sum: SS.info ? `자동 로그아웃 ${SS.info.idleMin}분` : '로그인 기기 확인', q: () => '<div class="sx-kv"><span>자동 로그아웃</span><b>' + (SS.info ? SS.info.idleMin + '분' : '-') + '</b></div>' });
    if (role() !== 'teacher') { SXN.osec = '기관 보안 설정'; out.push({ k: 'osec', n: '기관 보안 설정', i: 'shield', subs: ['osec'], kw: '보안 유휴 자동 로그아웃 동시 세션 추가 인증 이메일 인증번호 인증 앱', sum: '자동 로그아웃 · 동시 접속 · 추가 인증', q: () => '' }); }
    return out; }; }
  const fill = (id, fn) => setTimeout(async () => { const el = document.getElementById(id); if (!el) return; try { el.innerHTML = await fn(); } catch (e) { el.innerHTML = `<div class="warn">${H(em(e))}</div>`; } }, 0);
  async function sessHTML() {
    const [L, I] = await Promise.all([call('GET', '/api/me/sessions'), call('GET', '/api/session')]); SS.info = I;
    const rows = L.rows.map(r => `<tr><td>${H(r.agent || '알 수 없는 기기')}${r.current ? ' <span class="v2-chip v2-chip--g v2-chip--sm">이 기기</span>' : ''}</td><td>${H(r.band || '-')}</td><td>${H(fmt(r.lastAt))}</td></tr>`).join('');
    const w = I.work ? `<p>작업 모드 사용 중: ${H(fmt(I.work.until))}까지 · 사유 ${H(I.work.reason)} <button class="btn" data-act="ss-work-end">작업 모드 끝내기</button></p>`
      : `<p class="muted">성적 일괄 입력처럼 오래 걸리는 작업은 작업 모드를 켜면 그 시간 동안 자동 로그아웃되지 않습니다(최대 240분, 사유는 기록에 남습니다).</p><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="ss-wr" maxlength="200" placeholder="사유(예: 학기말 성적 입력)" style="flex:1;min-width:180px"><select id="ss-wm"><option value="60">60분</option><option value="120">120분</option><option value="240">240분</option></select><button class="btn pri" data-act="ss-work">작업 모드 켜기</button></div>`;
    return `<h3>로그인 기기 · 세션</h3><p class="muted">사용하지 않으면 ${I.idleMin}분 뒤 자동으로 로그아웃됩니다. 로그인은 최대 12시간 유지됩니다.</p>
      <table class="tbl"><thead><tr><th>기기</th><th>접속 위치</th><th>마지막 사용</th></tr></thead><tbody>${rows}</tbody></table>
      ${L.rows.length > 1 ? '<p><button class="btn" data-act="ss-out">다른 기기 모두 로그아웃</button></p>' : ''}<h4>작업 모드</h4>${w}
      ${typeof window.mfaSettingsHTML === 'function' ? '<h4>추가 인증</h4>' + window.mfaSettingsHTML() : ''}`;
  }
  async function osecHTML() {
    const o = await call('GET', '/api/org/security'); const own = role() === 'owner'; const dis = own ? '' : ' disabled';
    const opt = (v, cur, t) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${t}</option>`;
    return `<h3>기관 보안 설정</h3>${own ? '' : '<p class="muted">정운영자만 바꿀 수 있습니다.</p>'}
      <label>자동 로그아웃(사용하지 않을 때) <select id="os-idle"${dis}>${opt('', o.idleMin == null ? '' : 'x', `기본 ${o.idleDefault}분`)}${[10, 20, 30, 40, 50, 60].map(m => opt(m, o.idleMin, m + '분')).join('')}</select></label>
      <label>계정당 동시 접속 <select id="os-max"${dis}>${[0, 1, 2, 3, 5].map(n => opt(n, o.maxSessions, n ? n + '대(가장 오래된 접속 종료)' : '제한 없음')).join('')}</select></label>
      <label>운영자 추가 인증 <select id="os-mfa"${dis}>${opt('email', o.mfa, '이메일 인증번호(기본)')}${opt('totp', o.mfa, '인증 앱(기관 전원)')}</select></label>
      ${own ? '<p><button class="btn pri" data-act="os-save">저장</button></p>' : ''}`;
  }
  SS.sessHTML = sessHTML; SS.osecHTML = osecHTML;
  if (typeof VIEWS !== 'undefined' && VIEWS.settings) { const base = VIEWS.settings; VIEWS.settings = (...a) => {
    if (typeof UI !== 'undefined' && UI.settings === 'sess') { fill('ss-body', sessHTML); return '<div id="ss-body" class="card">불러오는 중…</div>'; }
    if (typeof UI !== 'undefined' && UI.settings === 'osec') { if (role() === 'teacher') return '<div class="empty">기관 보안 설정은 운영자만 볼 수 있습니다.</div>'; fill('os-body', osecHTML); return '<div id="os-body" class="card">불러오는 중…</div>'; }
    return base(...a); }; }
  const rerender = () => { if (typeof S !== 'undefined' && S && typeof render === 'function') render(); };
  if (typeof ACT !== 'undefined') {
    ACT['ss-out'] = async () => { try { const r = await call('POST', '/api/me/sessions/logout-others'); tst(`다른 기기 ${r.n}곳에서 로그아웃했습니다.`); rerender(); } catch (e) { tst(em(e), 'warn'); } };
    ACT['ss-work'] = async () => { const reason = (document.getElementById('ss-wr') || {}).value || ''; const minutes = +((document.getElementById('ss-wm') || {}).value || 60);
      try { SS.info = await call('POST', '/api/session/work', { reason, minutes }); tst(`작업 모드를 ${minutes}분 동안 켰습니다.`); rerender(); } catch (e) { tst(em(e), 'warn'); } };
    ACT['ss-work-end'] = async () => { try { SS.info = await call('POST', '/api/session/work', { minutes: 0 }); tst('작업 모드를 끝냈습니다.'); rerender(); } catch (e) { tst(em(e), 'warn'); } };
    ACT['os-save'] = async () => { const v = id => (document.getElementById(id) || {}).value; const idle = v('os-idle');
      try { await call('POST', '/api/org/security', { idleMin: idle ? +idle : null, maxSessions: +v('os-max'), mfa: v('os-mfa') }); tst('기관 보안 설정을 저장했습니다.'); SS.lastTouch = 0; poll(); rerender(); } catch (e) { tst(em(e), 'warn'); } };
  }

  /* ── qa7 d5 · 교수자 「내 계정」 — 설정(기관 설정)은 그대로 막고, 본인 카드(아이디 · 비밀번호 변경 · 로그인 기기 · 2단계 인증 · 로그아웃)만 연다.
     core.js의 TEACH_NO(settings)는 바꾸지 않는다: 교수자가 설정으로 가면 이 화면만 보이고, 기관 설정 API(/api/org/security · /api/staff 등)는 서버에서 403 그대로. ── */
  const tch = () => typeof S !== 'undefined' && S && S.me && S.me.role === 'teacher';
  const MYA = 'myacct';
  function myAcctView() {
    if (typeof UI !== 'undefined' && !UI.sxOpen) UI.sxOpen = MYA; /* 설정 머리 카드(l43 기관 현황 · 처리 필요)는 하위 설정을 연 상태처럼 숨긴다 */
    const L = live(); const id = L ? (LIVE.user.email || '') : ((S.me && S.me.name) || '');
    const head = `<section class="card mya-id" data-mya="id"><h3>내 계정</h3><p class="muted">교수자는 본인 계정만 관리합니다. 기관 설정(메뉴 · 보안 정책 · 운영자 · 결제)은 운영자에게 요청해 주십시오.</p>
      <div class="sx-kv"><span>로그인 아이디</span><b>${H(id)}</b></div>
      ${L ? '<p style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-act="live-pw">비밀번호 변경</button><button type="button" class="btn ghost" data-act="live-logout">로그아웃</button></p>'
        : '<p class="muted">시연판에는 로그인 계정이 없습니다. 운영 서버에서 비밀번호 변경 · 2단계 인증 · 로그인 기기를 관리합니다.</p>'}</section>`;
    if (!L) return `<div class="mya">${head}</div>`;
    fill('mya-sess', sessHTML);
    return `<div class="mya">${head}<section id="mya-sess" class="card" data-mya="sess">불러오는 중…</section></div>`;
  }
  /* 교수자가 설정으로 가면 → 「내 계정」(go를 감싼다 · 다른 역할은 그대로) */
  if (typeof go === 'function') { const base = go; go = (id, keep) => {
    if ((id === 'settings' || id === MYA) && tch()) { CUR = { ws: 'settings', tab: '' }; UI.myAcct = true; try { history.replaceState(null, '', '#settings'); } catch (e) { } render(); if (!keep) window.scrollTo(0, 0); document.body.classList.remove('nav-open'); return; }
    return base(id === MYA ? 'settings' : id, keep); }; }
  /* 설정 화면: 교수자면 내 계정만(가장 바깥에서 감싸도록 DOMContentLoaded — slim.js 설정 허브보다 늦게) */
  document.addEventListener('DOMContentLoaded', () => { if (typeof VIEWS === 'undefined' || !VIEWS.settings) return; const base = VIEWS.settings;
    VIEWS.settings = (...a) => { if (tch()) return myAcctView(); if (typeof UI !== 'undefined' && UI.sxOpen === MYA) UI.sxOpen = ''; return base(...a); }; });
  /* 교수자 레일 아래 「내 계정」 버튼 · 제목 「내 계정」 */
  if (typeof AFTER !== 'undefined') AFTER.push(() => { const t = tch(); const ex = document.getElementById('myaBtn');
    if (!t) { if (ex) ex.remove(); return; }
    const on = typeof CUR !== 'undefined' && CUR.ws === 'settings';
    if (!ex) { const foot = document.querySelector('nav.brail') || document.querySelector('.side .rfoot'); if (foot) foot.insertAdjacentHTML('beforeend', `<button type="button" id="myaBtn" class="ri${on ? ' on' : ''}" data-act="go" data-v="${MYA}" title="내 계정"${on ? ' aria-current="page"' : ''}>${typeof ic === 'function' ? ic('users') : ''}<span>내 계정</span></button>`); }
    else { ex.classList.toggle('on', on); if (on) ex.setAttribute('aria-current', 'page'); else ex.removeAttribute('aria-current'); }
    if (on) { const h = document.querySelector('#main .wh h1'); if (h) h.textContent = '내 계정'; } });
})();
