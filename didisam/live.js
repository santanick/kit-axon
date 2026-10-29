/* 디디쌤 스튜디오 v9 — 운영 서비스 모드(실서버 데이터 포트)
   운영 배포(service/)에서만 index.html에 들어간다(GitHub Pages 데모에는 없음).
   화면 코드는 그대로 두고 Store(저장) · DREG(데이터룸) · CL(Claude) · 가입/로그인만 서버 API로 바꾼다.
   - 기관 데이터: GET/PUT /api/state (rev 낙관적 잠금, 서버가 로그인 세션의 기관으로만 읽고 씀 + DB 행 수준 보안)
   - AI: POST /api/ai/messages (키는 서버 Secret Manager에만, 브라우저는 키를 모름)
   - 로그인: 이메일 + 비밀번호(HttpOnly 세션 쿠키). 학교 SSO는 다음 단계. */
'use strict';
const LIVE = { cfg: null, user: null, tenant: null, rev: 0, doc: null, timer: 0, saving: false, dirty: false, err: '' };
const api = async (method, url, body) => {
  const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; throw e; }
  return j;
};

/* ── 부팅 전에 세션 · 상태를 불러온다(boot.js가 __preboot를 기다림) ── */
window.__preboot = (async () => {
  try { LIVE.cfg = await api('GET', '/api/config'); } catch (e) { LIVE.cfg = { live: true, signup: false, ai: false, models: [] }; LIVE.err = '서버에 연결하지 못했습니다.'; }
  try { const me = await api('GET', '/api/me'); LIVE.user = me.user; LIVE.tenant = me.tenant; } catch (e) { return; }
  try { const st = await api('GET', '/api/state'); LIVE.doc = st.doc; LIVE.rev = st.rev; } catch (e) { LIVE.err = e.message; }
  try { window.__LP = (await api('GET', '/api/learners/progress')).lp || {}; } catch (e) { window.__LP = {}; } // 학습자 활동(v10) → lpApply
})();
document.documentElement.classList.add('live');
if (typeof STQ !== 'undefined') STQ.LIMIT = 8 * 1024 * 1024;

/* ── 데이터룸 = 로그인한 기관 하나(브라우저 목록 없음) ── */
DREG.cur = () => LIVE.tenant ? LIVE.tenant.tid : null;
DREG.use = () => {}; DREG.upsert = () => {}; DREG.drop = () => {};
DREG.get = () => ({ cur: DREG.cur(), list: LIVE.tenant ? [{ tid: LIVE.tenant.tid, name: LIVE.tenant.name, type: LIVE.tenant.type, mode: (LIVE.doc && LIVE.doc.org && LIVE.doc.org.room && LIVE.doc.org.room.mode) || 'saas', at: '' }] : [] });

/* ── 저장소 → 서버 ── */
const liveBar = (msg, kind) => { let b = $('#liveBar'); if (!msg) { b && b.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'liveBar'; b.setAttribute('role', 'status'); document.body.appendChild(b); } b.className = 'livebar ' + (kind || ''); b.textContent = msg; };
async function liveFlush() {
  if (LIVE.saving || !LIVE.dirty || !LIVE.tenant || !S) return; LIVE.saving = true; LIVE.dirty = false;
  try { const r = await api('PUT', '/api/state', { doc: S, rev: LIVE.rev }); LIVE.rev = r.rev; STQ.fail = false; liveBar(''); }
  catch (e) {
    if (e.status === 409) { try { const st = await api('GET', '/api/state'); LIVE.rev = st.rev; if (st.doc) { S = st.doc; upgradeState(); } toast(e.message, 'warn'); render(); } catch (x) { } }
    else if (e.status === 401) { liveBar('로그인이 만료되었습니다. 새로고침 후 다시 로그인하세요. 마지막 변경은 저장되지 않았습니다.', 'bad'); }
    else { LIVE.dirty = true; STQ.fail = true; liveBar(`저장하지 못했습니다 — ${e.message} 잠시 후 다시 시도합니다.`, 'bad'); clearTimeout(LIVE.timer); LIVE.timer = setTimeout(liveFlush, 5000); }
  } finally { LIVE.saving = false; if (LIVE.dirty) { clearTimeout(LIVE.timer); LIVE.timer = setTimeout(liveFlush, 400); } }
}
Store.get = () => { const d = LIVE.doc; if (!d || !LIVE.tenant) return null; if (d.org && d.org.room && d.org.room.tid && d.org.room.tid !== LIVE.tenant.tid) return null; return d; };
Store.clear = () => {};
Store.set = v => {
  if (!v || !LIVE.tenant) return;
  if (v.org) v.org.room = { ...roomDefault(LIVE.tenant.tid), ...(v.org.room || {}), tid: LIVE.tenant.tid };
  fixDeep(v); LIVE.doc = v; STQ.size = JSON.stringify(v).length;
  if (STQ.size > STQ.LIMIT * 0.9) compactState(v);
  LIVE.dirty = true; clearTimeout(LIVE.timer); LIVE.timer = setTimeout(liveFlush, 700);
};
window.addEventListener('beforeunload', e => { if (LIVE.dirty || LIVE.saving) { liveFlush(); e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') liveFlush(); });

/* ── Claude → 서버 AI 게이트웨이 ── */
{ const baseGet = CL.get.bind(CL);
  CL.get = () => { const c = baseGet(); return { ...c, key: LIVE.cfg && LIVE.cfg.ai ? 'server' : '' }; };
  CL.set = p => { try { const { key, ...rest } = p; localStorage.setItem(CL.K, JSON.stringify({ ...baseGet(), ...rest, key: '' })); } catch (e) { } };
  CL.call = async ({ system, messages, tools, max = 1200 }) => {
    const c = CL.get();
    try {
      const j = await api('POST', '/api/ai/messages', { model: c.model, system, messages, tools, max });
      const u = j.usage || {}; CL.set({ calls: (c.calls || 0) + 1, tin: (c.tin || 0) + (u.input_tokens || 0), tout: (c.tout || 0) + (u.output_tokens || 0), last: nowStr() });
      return { text: (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim(), tools: (j.content || []).filter(b => b.type === 'tool_use'), usage: u, model: j.model || c.model };
    } catch (e) { if (e instanceof TypeError) throw new Error('네트워크에 연결하지 못했습니다'); throw e; }
  };
}
claudeCard = () => {
  const c = CL.get(); const on = LIVE.cfg && LIVE.cfg.ai;
  return `<div class="card clc"><div class="ch"><span class="orb sm">${ic('spark', 14)}</span><b>Claude AI 연결</b>${on ? tag('서버 연결됨', 'g') : tag('서버 키 없음')}<span class="sp"></span><small>대화 · 문서 · 홈페이지 AI 수정</small></div>
    <div class="form2"><label class="fl">모델<select id="clModel" data-chg="cl-model">${CLM.map(([id, n, dd]) => `<option value="${id}" ${c.model === id ? 'selected' : ''}>${n} — ${dd}</option>`).join('')}</select></label><div class="fl"><span>오늘 사용</span><b id="aiUse">불러오는 중…</b></div></div>
    <div class="chips2">${[['chat', 'AI SAM 대화'], ['docs', '문서 AI 수정'], ['site', '홈페이지 AI 수정']].map(([k, l]) => `<label class="ckl"><input type="checkbox" data-chg="cl-use" data-v="${k}" ${c[k] !== false ? 'checked' : ''}> ${l}</label>`).join('')}</div>
    <div class="bar2"><button class="btn ink sm" data-act="cl-save" ${on ? '' : 'disabled'}>${ic('check', 14)} 연결 테스트</button></div>
    <p class="mini">운영 서비스: API 키는 서버(Secret Manager)에만 있고 브라우저에는 전달되지 않습니다. 호출은 기관 계정으로 인증된 서버를 거치며, 데이터룸 정책(AI 경로 · 외부 연결)과 기관별 하루 한도를 서버에서 확인합니다. 이름 · 연락처는 보내지 않고 집계 · 과정명 · 문서 본문만 보냅니다.</p></div>`;
};
ACT['cl-off'] = () => toast('운영 서비스의 AI 키는 서버에서 관리합니다.');
AFTER.push(cur => {
  const el = $('#aiUse'); if (!el || el.dataset.done) return; el.dataset.done = '1';
  api('GET', '/api/ai/usage').then(r => { const d = r.days.find(x => x.day === new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)) || { calls: 0, tin: 0, tout: 0 }; el.textContent = `${d.calls} / ${r.daily}회 · 입력 ${d.tin.toLocaleString()} · 출력 ${d.tout.toLocaleString()} tokens`; }).catch(e => { el.textContent = e.message; });
});

/* ── 가입 · 로그인 ── */
let LV = { view: 'signup', sample: false };
const liveFields = () => `<div class="lvf"><label class="fl">운영자 이메일<input name="email" type="email" autocomplete="username" maxlength="120" required placeholder="admin@기관.ac.kr"></label>
  <label class="fl">비밀번호<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="200" required placeholder="10자 이상 · 영문 + 숫자"></label>
  ${LIVE.cfg && LIVE.cfg.signupCode ? `<label class="fl">가입 코드<input name="code" autocomplete="off" maxlength="60" required placeholder="디디쌤에서 받은 코드"></label>` : ''}
  <label class="ckl"><input type="checkbox" name="sample" ${LV.sample ? 'checked' : ''}> 샘플 데이터로 둘러보기(나중에 지울 수 있음)</label></div>`;
function renderLogin() {
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '') + ' mode-signup';
  $('#app').innerHTML = `<div class="su"><div class="su-l"><div class="brand big"><span class="logo">D</span><b>디디쌤 스튜디오</b></div><h1>다시 오신 것을<br><em>환영합니다</em></h1><p class="lead">기관 운영자 계정으로 로그인합니다. 기관마다 데이터룸이 분리되어 있어 로그인한 기관의 데이터만 보입니다.</p>${LIVE.err ? `<p class="note bad">${esc(LIVE.err)}</p>` : ''}</div>
  <form class="su-r" id="liForm"><h2>로그인</h2><label class="fl">이메일<input name="email" type="email" autocomplete="username" required maxlength="120"></label><label class="fl">비밀번호<input name="password" type="password" autocomplete="current-password" required maxlength="200"></label><p class="lverr" id="liErr" role="alert"></p>
  <button class="btn pri lg" type="submit">로그인</button>${LIVE.cfg && LIVE.cfg.signup ? `<p class="lvsw">처음이신가요? <button type="button" class="linkb" data-act="lv-signup">새 기관 만들기</button></p>` : ''}</form></div>`;
  const f = $('#liForm');
  f.addEventListener('submit', async e => { e.preventDefault(); const b = f.querySelector('button[type=submit]'); b.disabled = true; $('#liErr').textContent = '';
    try { await api('POST', '/api/login', { email: f.email.value.trim(), password: f.password.value }); location.replace(location.pathname); } catch (x) { $('#liErr').textContent = x.message; b.disabled = false; } });
}
{ const base = renderSignup; renderSignup = (...a) => {
    if (LIVE.user) return base(...a);
    if (LV.view === 'login' || !(LIVE.cfg && LIVE.cfg.signup)) return renderLogin();
    base(...a);
    const note = $('.su-l .note'); if (note) note.textContent = '기관마다 데이터룸이 분리됩니다. 학습자 개인정보는 기관 정책에 따라 최소한만 저장합니다(대학: 학번 · 학과).';
    $('.drback') && $('.drback').remove();
    const f = $('#suForm'); if (!f) return;
    f.querySelector('button[type=submit]').insertAdjacentHTML('beforebegin', liveFields() + '<p class="lverr" id="suErr" role="alert"></p>');
    f.insertAdjacentHTML('beforeend', `<p class="lvsw">이미 계정이 있으신가요? <button type="button" class="linkb" data-act="lv-login">로그인</button></p>`);
  };
}
ACT['lv-login'] = () => { LV.view = 'login'; render(); };
ACT['lv-signup'] = () => { LV.view = 'signup'; render(); };

/* 샘플 없이 시작: 시드가 만든 가상 사람 · 과정 · 거래 기록을 비운다(메뉴 · 템플릿 · 루브릭 · 자동화 레시피는 유지) */
function liveEmpty() {
  ['members', 'parents', 'classes', 'pays', 'bills', 'consults', 'posts', 'books', 'certs', 'msgs', 'alerts', 'codes', 'runs', 'chat', 'diags', 'groups', 'weeks', 'orgs', 'journey'].forEach(k => { if (Array.isArray(S[k])) S[k] = []; });
  (S.badges || []).forEach(b => { b.issued = []; });
  if (S.hrd) S.hrd.reports = [];
  if (S.cal && Array.isArray(S.cal.log)) S.cal.log = [];
  if (S.lib && typeof S.lib === 'object') Object.keys(S.lib).forEach(k => { if (Array.isArray(S.lib[k])) S.lib[k] = []; });
  (S.docs || []).forEach(d => { d.cls = ''; d.sent = []; });
  S.tutorUsage = Array.isArray(S.tutorUsage) ? [] : S.tutorUsage;
}
{ const base = createOrg; createOrg = async (type, name) => {
    if (LIVE.user) return base(type, name);
    const f = $('#suForm'); const err = $('#suErr'); const btn = f && f.querySelector('button[type=submit]');
    if (!f || !f.email) return;
    if (!f.reportValidity()) return;
    LV.sample = !!f.sample.checked; btn.disabled = true; err.textContent = '';
    try {
      const r = await api('POST', '/api/signup', { email: f.email.value.trim(), password: f.password.value, code: f.code ? f.code.value.trim() : '', orgName: name, type });
      LIVE.user = r.user; LIVE.tenant = r.tenant; LIVE.rev = 0; LIVE.doc = null;
    } catch (x) { err.textContent = x.message; btn.disabled = false; if (x.code === 'exists') { LV.view = 'login'; setTimeout(render, 1600); } return; }
    base(type, name);
    if (!LV.sample) { liveEmpty(); logAudit('샘플 없이 시작'); }
    S.me.name = '관리자'; save();
  };
}

/* ── 데이터룸 화면: 브라우저 목록 대신 운영 계정 ── */
ACT['dr-new'] = ACT['dr-switch'] = ACT['dr-drop'] = () => toast('운영 서비스에서는 기관마다 별도 계정으로 로그인합니다.');
ACT['reset-all'] = () => {
  if (!LIVE.tenant) return; if (S.me.role !== 'owner') { toast('정운영자만 파기할 수 있습니다.', 'warn'); return; }
  modal('기관 데이터룸 파기', `<p>「${esc(LIVE.tenant.name)}」의 모든 데이터 · 운영자 계정 · AI 사용 기록 · 감사 로그를 서버에서 삭제합니다. <b>되돌릴 수 없습니다.</b> 먼저 데이터룸 내보내기(JSON)를 받아 두세요.</p>
    <label class="fl">기관명 확인<input id="dlName" autocomplete="off" placeholder="${esc(LIVE.tenant.name)}"></label><label class="fl">비밀번호<input id="dlPw" type="password" autocomplete="current-password"></label><p class="lverr" id="dlErr" role="alert"></p>`,
  [{ id: 'x', label: '취소' }, { id: 'ok', label: '영구 삭제', kind: 'red', run: async () => {
      try { await api('POST', '/api/tenant/delete', { confirm: $('#dlName').value.trim(), password: $('#dlPw').value }); location.replace(location.pathname); }
      catch (e) { toast(e.message, 'bad'); }
    } }]);
};
ACT['live-logout'] = async () => { await liveFlush(); try { await api('POST', '/api/logout'); } catch (e) { } location.replace(location.pathname); };
AFTER.push(cur => {
  if (!LIVE.user) return;
  const foot = $('.side .rfoot'); if (foot && !$('#liveAcct')) foot.insertAdjacentHTML('beforeend', `<div id="liveAcct" class="lvacct"><small title="${esc(LIVE.user.email)}">${esc(LIVE.user.email)}</small><button class="btn sm ghost" data-act="live-logout">로그아웃</button></div>`);
  if (cur.ws === 'settings' && UI.settings === 'room') {
    const b = $('[data-act="dr-new"]'); const card = b && b.closest('.card');
    if (card) card.outerHTML = `<div class="card"><div class="ch"><b>운영 서비스 계정</b><small>이 데이터룸은 서버(공유 SaaS · 서울 리전)에 있습니다</small></div><p>로그인 계정 <b>${esc(LIVE.user.email)}</b> · 테넌트 <code>${esc(LIVE.tenant.tid)}</code>. 기관 데이터는 서버 DB에서 행 수준 보안으로 격리되고, 저장할 때마다 버전(rev ${LIVE.rev})이 올라갑니다. 다른 기관은 별도 계정으로 가입 · 로그인합니다.</p></div>`;
  }
});
/* 데모 안내 문구 정리 */
Object.assign(DICT, { '로그아웃': 'Log out|ログアウト|退出登录|登出|Đăng xuất|ออกจากระบบ|Keluar|Cerrar sesión|Se déconnecter', '로그인': 'Log in|ログイン|登录|登入|Đăng nhập|เข้าสู่ระบบ|Masuk|Iniciar sesión|Se connecter' });
