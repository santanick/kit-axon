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

/* ── 부팅 전에 세션 · 상태를 불러온다(boot.js가 __preboot를 기다림) ──
   v45 진입 동선: 세션 없음 → 진입 한 장(로그인 / 가입 탭) · 세션 있고 문서 없음 → ① 기관 이어가기 · 문서 있음 → 대시보드(② 대기는 onb45.js가 S.onb로 판정) */
window.__preboot = (async () => {
  try { Object.keys(localStorage).filter(k => /^didisam\.(?:claude$|app\.claude\.|room\..*\.claude$)/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { } /* v25 운영: 브라우저에 AI 키를 남기지 않음(서버 게이트웨이만 사용) */
  try { LIVE.cfg = await api('GET', '/api/config'); } catch (e) { LIVE.cfg = { live: true, signup: false, ai: false, models: [] }; LIVE.err = '서버에 연결하지 못했습니다. 잠시 후 새로고침해 주십시오.'; }
  LV.view = lvPick(); LV.step = 'entry';
  const m = location.hash.match(/^#oauth=([\w:]+)/);
  if (m) { /* v32.4 소셜 로그인 결과(서버 콜백이 넘겨 줌) */
    history.replaceState(null, '', location.pathname + location.search);
    if (m[1] === 'signup') { try { LIVE.oauth = await api('GET', '/api/oauth/pending'); LV.view = 'signup'; LV.step = 'org'; } catch (e) { LV.oerr = LVMSG.oauth_pending; LV.view = 'signup'; } }
    else if (m[1].startsWith('mfa-')) LIVE.mfa = { mfa: m[1].slice(4), ticket: '' }; /* 보안 4차 #1: 소셜 로그인 뒤 2단계(티켓은 쿠키) → mfa.js가 입력 화면을 띄운다 */
    else if (m[1].startsWith('err:')) LV.oerr = OAUTH_ERR[m[1].slice(4)] || '소셜 로그인에 실패했습니다. 다시 시도해 주십시오.';
  }
  if (!(LIVE.cfg && LIVE.cfg.signup)) LV.view = 'login';
  try { const me = await api('GET', '/api/me'); LIVE.user = me.user; LIVE.tenant = me.tenant; }
  catch (e) { /* C3: 소셜 가입 보류(15분) 중에 해시 없이 다시 오면 ①로 이어 간다 */
    if (!m && !LIVE.oauth && LIVE.cfg && LIVE.cfg.signup && (LIVE.cfg.oauth || []).length) { try { LIVE.oauth = await api('GET', '/api/oauth/pending'); LV.view = 'signup'; LV.step = 'org'; } catch (x) { } }
    if (LIVE.oauth) lvRestore();
    return;
  }
  lvSeen();
  if (LIVE.user.pwTemp) await new Promise(() => { /* v31.1 임시 비밀번호는 변경 전까지 다른 화면을 열지 않는다 */ document.body.innerHTML = `<main class="su-r" style="max-width:420px;margin:60px auto;padding:0 16px"><form id="pwTempF"><h2>비밀번호 변경</h2><p>임시 비밀번호를 새 비밀번호로 변경해 주십시오.</p><label class="fl">임시 비밀번호<input name="cur" type="password" autocomplete="current-password" required></label><label class="fl">새 비밀번호<input name="next" type="password" autocomplete="new-password" required placeholder="10자 이상, 영문과 숫자"></label><p id="pwTempE" role="alert"></p><button class="btn pri lg" type="submit">변경</button></form></main>`; const f = document.getElementById('pwTempF'); f.addEventListener('submit', async e => { e.preventDefault(); try { await api('POST', '/api/password', { current: f.cur.value, next: f.next.value }); location.reload(); } catch (x) { document.getElementById('pwTempE').textContent = x.message; } }); });
  try { const st = await api('GET', '/api/state'); LIVE.doc = st.doc; LIVE.rev = st.rev; } catch (e) { LIVE.err = e.message; }
  if (!LIVE.doc) { LV.step = 'org'; LV.resume = true; } /* C2: 계정 · 기관은 서버에 있고 첫 저장 전에 닫힘 → ① 이어가기(API 추가 호출 없음) */
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
  try { const r = await api('PUT', '/api/state', { doc: S, rev: LIVE.rev }); LIVE.rev = r.rev; STQ.fail = false; liveBar(''); if (r.pending > 0) liveSync(r.pending); }
  catch (e) {
    if (e.status === 409) { try { const st = await api('GET', '/api/state'); LIVE.rev = st.rev; if (st.doc) { S = liveMe(st.doc); upgradeState(); } toast(e.message, 'warn'); render(); } catch (x) { } }
    else if (e.status === 401) { liveBar('로그인이 만료되었습니다. 새로고침 후 다시 로그인하세요. 마지막 변경은 저장되지 않았습니다.', 'bad'); }
    else { LIVE.dirty = true; STQ.fail = true; liveBar(`저장하지 못했습니다 — ${e.message} 잠시 후 다시 시도합니다.`, 'bad'); clearTimeout(LIVE.timer); LIVE.timer = setTimeout(liveFlush, 5000); }
  } finally { LIVE.saving = false; if (LIVE.dirty) { clearTimeout(LIVE.timer); LIVE.timer = setTimeout(liveFlush, 400); } }
}
/* v36 일괄 등록(최대 5,000명) 뒤 학습자 로그인 계정(접근코드)을 500건씩 마저 만든다 — 남은 건수를 아래 띠로 보여 준다 */
async function liveSync(n) { if (LIVE.syncing) return; LIVE.syncing = true; let left = n;
  try { while (left > 0) { liveBar(`학습자 로그인 계정을 준비하고 있습니다 — ${left.toLocaleString()}명 남음`); const r = await api('POST', '/api/learners/sync', {}); if (!(r.pending < left)) break; left = r.pending; } liveBar(''); if (n > 0 && left <= 0) toast(`학습자 로그인 계정 ${n.toLocaleString()}명 준비를 마쳤습니다.`, 'ok'); }
  catch (e) { liveBar(`학습자 로그인 계정 준비가 멈췄습니다 — ${e.message} 다음 저장 때 이어서 합니다.`, 'bad'); } finally { LIVE.syncing = false; } }
const liveMe = d => { if (d && LIVE.user) { const a = (d.admins || []).find(x => x && String(x.email || '').toLowerCase() === String(LIVE.user.email).toLowerCase()); d.me = { ...(d.me || {}), role: LIVE.user.role, email: LIVE.user.email, ...(a && a.name ? { name: a.name } : {}) }; } return d; }; /* v31 권한은 서버 세션 기준 */
Store.get = () => { const d = LIVE.doc; if (!d || !LIVE.tenant) return null; if (d.org && d.org.room && d.org.room.tid && d.org.room.tid !== LIVE.tenant.tid) return null; return liveMe(d); };
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
  CL.call = async ({ system, messages, tools, max = 1200, toolConfirm }) => {
    const c = CL.get();
    try {
      const j = await api('POST', '/api/ai/messages', { model: c.model, system, messages, tools, max, ...(toolConfirm && Object.keys(toolConfirm).length ? { toolConfirm } : {}) });
      const u = j.usage || {}; CL.set({ calls: (c.calls || 0) + 1, tin: (c.tin || 0) + (u.input_tokens || 0), tout: (c.tout || 0) + (u.output_tokens || 0), last: nowStr() });
      return { text: (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim(), tools: (j.content || []).filter(b => b.type === 'tool_use'), content: j.content || [], stop: j.stop_reason, usage: u, model: j.model || c.model, guard: (j.toolGuard && j.toolGuard.confirm) || [] };
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

/* ── 가입 · 로그인 (v45) ──
   진입 한 장(로그인 / 가입 탭 · 카카오 · Google · 이메일) → ① 기관(유형 · 기관명) → ② 홈페이지(onb45.js) → 대시보드.
   - 화면 틀은 core.js(renderSignup → 진입 #entry / ① #suForm)가 그리고, 운영 모드의 내용(#entrySoc · #entryMail · #entryErr)은 여기서 채운다.
   - 공용 상태는 window.SUV(= LV): view 'login'|'signup', step 'entry'|'org'. core.js가 SUV를 만들지 않았으면 여기서 만든다.
   - B안(FLOW §4): 이메일 가입은 이메일 · 비밀번호를 ① [다음]까지 메모리에만 두고 /api/signup을 한 번 호출한다(비밀번호는 저장하지 않음).
     소셜 가입은 서버 보류 쿠키(15분)로 ①까지 이어 가고 /api/oauth/signup을 호출한다. /api · DB는 바꾸지 않는다.
   - createOrg는 성공하면 true, 실패 · 취소면 false를 돌려주는 Promise다. ② 진입은 UI.onbNew=1 → onb45.js의 createOrg 감싸기(base 안쪽)가 서버 응답 뒤 onbStart를 부른다.
     실패하면 base를 부르지 않으므로 S.onb도 생기지 않는다. core.js가 createOrg 직후 onbStart()를 불러도(S 없음 → UI.onbNew=1) 같은 결과다. */
const LV = (typeof SUV !== 'undefined' && SUV) || window.SUV || (window.SUV = {});
Object.assign(LV, { view: LV.view || 'signup', step: LV.step || 'entry', oerr: '', sample: false, mail: null, email: '', mailOpen: false, focus: '' });
let lvPw = ''; /* 이메일 가입 비밀번호 — 변수에만 둔다(저장소 · sessionStorage 금지), 가입 호출 뒤 지운다 */
const LV_K = { seen: 'didisam.seen', view: 'didisam.lvview', su: 'didisam.su45' };
const lvSeen = () => { try { localStorage.setItem(LV_K.seen, '1'); } catch (e) { } };
/* D4 첫 화면 탭: #signup · #login 해시 > 소셜 로그인 직전 탭 > 이 브라우저에 기존 회원 흔적(didisam.seen)이 있으면 로그인, 없으면 가입 */
function lvPick() {
  const h = location.hash; let v = '';
  if (/^#(signup|login)\b/.test(h)) { v = h.slice(1).split(/[/?]/)[0]; history.replaceState(null, '', location.pathname + location.search); }
  try { const s = sessionStorage.getItem(LV_K.view); sessionStorage.removeItem(LV_K.view); if (!v && (s === 'login' || s === 'signup')) v = s; } catch (e) { }
  if (v) return v;
  try { return localStorage.getItem(LV_K.seen) === '1' ? 'login' : 'signup'; } catch (e) { return 'signup'; }
}
/* ① 입력값(유형 · 세부 · 기관명)만 탭 안에 보관 — 소셜 보류가 만료돼 다시 돌아와도 채워 둔다 */
const lvSave = v => { try { sessionStorage.setItem(LV_K.su, JSON.stringify(v || { type: SU.type, ed: SU.ed, name: SU.name })); } catch (e) { } };
function lvRestore() { try { const v = JSON.parse(sessionStorage.getItem(LV_K.su) || 'null'); if (v && !SU.type && !SU.name) Object.assign(SU, { type: v.type || '', ed: v.ed, name: v.name || '' }); } catch (e) { } }
const lvDrop = () => { try { sessionStorage.removeItem(LV_K.su); } catch (e) { } };
const emailOk = e => typeof e === 'string' && e.length <= 120 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(e); /* 서버 app.js와 같은 규칙 */
const pwOk = p => typeof p === 'string' && p.length >= 10 && p.length <= 200 && /[a-zA-Z]/.test(p) && /\d/.test(p);
const LVMSG = {
  login: '이메일 또는 비밀번호가 올바르지 않습니다.', rate: '시도가 많습니다. 잠시 후 다시 시도해 주십시오.', module: '이 주소로 로그인할 수 없는 계정입니다.',
  net: '서버에 연결하지 못했습니다. 다시 시도해 주십시오.', email: '이메일 형식을 확인해 주십시오.', password: '비밀번호는 10자 이상, 영문과 숫자를 함께 씁니다.',
  exists: '이미 가입된 이메일입니다. 로그인해 주십시오.', oauth_pending: '가입 시간이 지났습니다. 카카오 또는 Google로 다시 계속해 주십시오.', code: '초대 코드가 올바르지 않습니다.', codeNeed: '초대 코드를 입력해 주십시오.',
  name: '기관명을 30자 이내로 입력해 주십시오.', type: '기관 유형을 골라 주십시오.', signup_off: '지금은 새 기관 가입을 받지 않습니다.',
  kakaoOff: '카카오 로그인은 준비 중입니다. Google 또는 이메일로 시작해 주십시오.', need: '이메일과 비밀번호를 입력해 주십시오.',
};
const lvMsg = x => (x && x.status && LVMSG[x.code]) || (x && !x.status ? LVMSG.net : (x && x.message) || LVMSG.net);
/* v32.4 운영자 소셜 로그인(구글 · 카카오) — 서버가 /api/oauth/<제공자>/start → 콜백을 처리하고 #oauth=… 로 돌려보낸다 */
const OAUTH_ERR = { geo_blocked: '이 기관은 국내에서만 운영자 로그인을 허용합니다.', state: '로그인 요청이 만료되었습니다. 다시 시도해 주십시오.', denied: '로그인을 취소했습니다. 다른 방법으로 계속할 수 있습니다.', provider: '제공자와 연결하지 못했습니다. 잠시 후 다시 시도해 주십시오.', email: '확인된 이메일이 있어야 합니다. 이메일 제공에 동의한 뒤 다시 시도해 주십시오.', module: '이 주소로 로그인할 수 없는 계정입니다.', signup_off: '지금은 새 기관 가입을 받지 않습니다.', mfa_mail: '인증번호 메일을 보낼 수 없습니다. 관리자에게 문의하십시오.' };
const OAUTH_P = { google: ['Google', '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>'],
  kakao: ['카카오', '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#000" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/></svg>'] };
const MAIL_IC = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>';
const lvProv = () => ((LIVE.cfg && LIVE.cfg.oauth) || []).filter(p => OAUTH_P[p]);
/* 카카오 · Google 버튼(로그인 · 가입 탭이 같은 주소 — 서버가 기존 회원인지 판정). 카카오 키가 없으면 숨기지 않고 '준비 중' 안내(대표님 결정 대기) */
function lvSocBtns() {
  const P = lvProv();
  const kakao = P.includes('kakao') ? `<a class="lvsb kakao" href="/api/oauth/kakao/start" rel="nofollow" data-lvp="kakao">${OAUTH_P.kakao[1]}<span>카카오로 계속하기</span></a>`
    : `<button type="button" class="lvsb kakao" data-act="lv-kakao-off" aria-describedby="entryErr">${OAUTH_P.kakao[1]}<span>카카오로 계속하기</span></button>`;
  const google = P.includes('google') ? `<a class="lvsb google" href="/api/oauth/google/start" rel="nofollow" data-lvp="google">${OAUTH_P.google[1]}<span>Google로 계속하기</span></a>` : '';
  return `<div class="lvsoc">${kakao}${google}</div>`;
}
function lvMailFields() {
  const su = LV.view === 'signup'; const code = su && LIVE.cfg && LIVE.cfg.signupCode;
  return `<div class="lvf" id="lvMail"><label class="fl">이메일<input name="email" type="email" autocomplete="username" maxlength="120" required placeholder="admin@기관.ac.kr" value="${esc(LV.email || '')}"></label>
    <label class="fl">비밀번호<input name="password" type="password" autocomplete="${su ? 'new-password' : 'current-password'}" maxlength="200" required ${su ? 'minlength="10" aria-describedby="lvPwHint"' : ''}></label>${su ? '<small class="mini" id="lvPwHint">10자 이상 · 영문과 숫자</small>' : ''}
    ${code ? '<label class="fl">초대 코드<input name="code" autocomplete="off" maxlength="60" required placeholder="디디쌤에서 받은 코드"></label>' : ''}
    <button type="button" class="btn pri lg" id="lvMailGo">${su ? '다음' : '로그인'}</button></div>`;
}
/* core.js가 아직 v45 진입 화면(#entry)을 그리지 않는 경우(통합 전)의 최소 틀 — 같은 id를 써서 시험 · 채우기 코드가 그대로 동작 */
function lvEntryShell() {
  const su = LV.view === 'signup'; const on = !!(LIVE.cfg && LIVE.cfg.signup);
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '') + ' mode-signup';
  $('#app').innerHTML = `<div class="su45" style="min-height:100vh;background:#fff;display:flex;justify-content:center;padding:40px 16px;box-sizing:border-box"><section id="entry" class="lv45" style="width:100%;max-width:440px;color:#1d2420">
    <div class="brand big"><span class="logo">D</span><b>디디쌤 스튜디오</b></div>
    ${on ? `<div class="seg2 full" role="tablist" aria-label="로그인 또는 가입"><button type="button" role="tab" data-act="lv-login" data-v="login" aria-selected="${!su}" class="${su ? '' : 'on'}">로그인</button><button type="button" role="tab" data-act="lv-signup" data-v="signup" aria-selected="${su}" class="${su ? 'on' : ''}">가입</button></div>` : ''}
    <h1 tabindex="-1" style="font-size:24px;margin:20px 0 6px">${su ? '3초 만에 시작합니다' : '다시 오신 것을 환영합니다'}</h1><p style="margin:0 0 8px;color:#4a524d">${su ? '계정을 만든 뒤 기관과 홈페이지를 고릅니다.' : '운영하던 기관으로 바로 이동합니다.'}</p>
    <div id="entrySoc"></div><div id="entryMail"></div><p class="lverr" id="entryErr" role="alert" style="color:#B42318"></p>
    ${on ? (su ? '<p class="lvsw">이미 계정이 있으신가요? <button type="button" class="linkb" data-act="lv-login" data-v="login">로그인</button></p>' : '<p class="lvsw">처음이신가요? <button type="button" class="linkb" data-act="lv-signup" data-v="signup">3초 만에 시작</button></p>') : ''}
    <p class="su-who" style="color:#4a524d">강사 · 직원은 받은 초대 링크로, 수강생은 기관 홈페이지에서 로그인합니다.${su ? ' 이메일 외 개인정보는 받지 않습니다.' : ''}</p></section></div>`;
}
/* 진입 화면 채우기(운영) */
function lvEntry() {
  const e = $('#entry'); if (!e) return;
  const cfg = LIVE.cfg || {};
  if (!cfg.signup) e.querySelectorAll('[data-v="signup"], [data-act="lv-signup"]').forEach(x => { const p = x.closest('.lvsw, p'); (p && e.contains(p) && p !== e ? p : x).remove(); });
  const soc = $('#entrySoc'), mail = $('#entryMail'); if (!soc || !mail) return;
  let err = $('#entryErr'); if (!err) { mail.insertAdjacentHTML('afterend', '<p class="lverr" id="entryErr" role="alert"></p>'); err = $('#entryErr'); }
  const open = LV.mailOpen || !lvProv().length;
  soc.innerHTML = lvSocBtns();
  mail.innerHTML = `<div class="lvsoc"><button type="button" class="lvsb mail" data-act="lv-mail" aria-expanded="${open}" aria-controls="lvMail">${MAIL_IC}<span>이메일로 계속하기</span></button></div>${open ? lvMailFields() : ''}`;
  err.textContent = LV.oerr || LIVE.err || ''; LV.oerr = '';
  soc.querySelectorAll('a[data-lvp]').forEach(a => a.addEventListener('click', () => { try { sessionStorage.setItem(LV_K.view, LV.view); } catch (x) { } }));
  const box = $('#lvMail');
  if (box) {
    box.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') { ev.preventDefault(); lvMailGo(); } });
    $('#lvMailGo').addEventListener('click', lvMailGo);
    const f = LV.focus && box.querySelector(`[name="${LV.focus}"]`); if (f) f.focus(); LV.focus = '';
  }
}
async function lvMailGo() {
  const box = $('#lvMail'); if (!box) return; const err = $('#entryErr'); const btn = $('#lvMailGo');
  const fe = box.querySelector('[name=email]'), fp = box.querySelector('[name=password]'), fc = box.querySelector('[name=code]');
  const email = fe.value.trim().toLowerCase(); const pw = fp.value; LV.email = email;
  const say = (m, el) => { err.textContent = m; if (el) el.focus(); };
  if (LV.view !== 'signup') {
    if (!email || !pw) return say(LVMSG.need, email ? fp : fe);
    btn.disabled = true; say('');
    try { const r = await api('POST', '/api/login', { email, password: pw }); const go = () => { lvSeen(); location.replace(location.pathname); }; if (r && r.mfa && window.mfaPrompt) { btn.disabled = false; return window.mfaPrompt(r, go); } go(); } /* 보안 4차 #1 2단계 */
    catch (x) { btn.disabled = false; say(window.errMsg && !(x && x.status && LVMSG[x.code]) ? errMsg(x, lvMsg(x)) : lvMsg(x)); if (x.status === 401) { fp.value = ''; fp.focus(); } }
    return;
  }
  if (!emailOk(email)) return say(LVMSG.email, fe);
  if (!pwOk(pw)) return say(LVMSG.password, fp);
  if (fc && !fc.value.trim()) return say(LVMSG.codeNeed, fc);
  lvPw = pw; LV.mail = { email, code: fc ? fc.value.trim() : '' }; LV.step = 'org'; lvRestore(); render();
}
/* ① 기관 화면 보강(운영): 계정 줄 · 초대 코드(소셜) · 오류 줄 · 이전 버튼 */
function lvOrg() {
  const f = $('#suForm'); if (!f) return; const cfg = LIVE.cfg || {};
  document.querySelectorAll('.drback').forEach(x => x.remove()); f.querySelectorAll('.lvf, .lvacc, #suErr, .lvback').forEach(x => x.remove());
  const o = LIVE.oauth; const pv = o && OAUTH_P[o.provider];
  const who = o ? `${pv ? pv[1] : ''}<span>${esc(pv ? pv[0] : o.provider)} 계정 <b>${esc(o.email)}</b>으로 가입합니다</span>`
    : LIVE.user ? `<span><b>${esc(LIVE.user.email)}</b> 계정의 기관 준비를 이어서 합니다</span>` : `${MAIL_IC}<span><b>${esc((LV.mail && LV.mail.email) || '')}</b></span>`;
  const h = f.querySelector('h1, h2'); (h || f.firstElementChild || f).insertAdjacentHTML(h ? 'afterend' : 'beforebegin', `<p class="lvpend lvacc">${who}</p>`);
  const btn = f.querySelector('button[type=submit]');
  if (btn) btn.insertAdjacentHTML('beforebegin', `${o && cfg.signupCode ? '<label class="fl lvf">초대 코드<input name="code" autocomplete="off" maxlength="60" placeholder="디디쌤에서 받은 코드"></label>' : ''}<p class="lverr" id="suErr" role="alert"></p>`);
  /* 이전: 이메일 → 진입(이메일 유지) · 소셜 보류 → 다른 방법으로 가입(보류 취소) · 이어가기 → 다른 계정으로 로그인 */
  const act = o ? 'lv-ocancel' : LIVE.user ? 'live-logout' : 'lv-back'; const lab = o ? '다른 방법으로 가입' : LIVE.user ? '다른 계정으로 로그인' : '← 이전';
  const bk = document.querySelector('[data-act="su-back"]');
  if (bk) { bk.dataset.act = act; if (o || LIVE.user) bk.textContent = lab; }
  else f.insertAdjacentHTML('afterbegin', `<button type="button" class="linkb lvback" data-act="${act}">${lab}</button>`);
  if (LIVE.user && LIVE.tenant && f.name && !f.name.value) f.name.value = SU.name = LIVE.tenant.name;
  if (!f.dataset.lv) { f.dataset.lv = '1'; f.addEventListener('input', () => { SU.name = f.name ? f.name.value : SU.name; lvSave(); });
    /* ② 훅(onb45.js): 화면의 ① [다음]으로 만든 기관만 ②로 보낸다(시험 · 코드의 createOrg 직접 호출은 그대로 대시보드) — 운영 createOrg는 서버 응답 뒤 base를 부르고, onb45 감싸기가 그때 onbStart를 실행 */
    f.addEventListener('submit', () => { if (typeof UI !== 'undefined') UI.onbNew = 1; }, true); }
  lvSave();
}
{ const base = renderSignup; renderSignup = (...a) => {
    if (LIVE.cfg && LIVE.cfg.module && LIVE.cfg.module !== 'admin') return LIVE.user ? base(...a) : renderLogin(); /* 교강사 화면(MODULE=tutor)은 로그인만 */
    const org = !!LIVE.user || !!LIVE.oauth || (LV.step === 'org' && !!LV.mail);
    LV.step = org ? 'org' : 'entry';
    if (org) {
      if (LIVE.user && LIVE.tenant && !LV.pre) { LV.pre = 1; if (!SU.type) SU.type = LIVE.tenant.type; if (!SU.name) SU.name = LIVE.tenant.name; }
      base(...a); if (!$('#suForm') && typeof window.renderOrgStep === 'function') window.renderOrgStep();
      lvOrg(); return;
    }
    base(...a); if (!$('#entry')) lvEntryShell();
    lvEntry();
  };
}
/* 교강사 모듈(tutor.html) 로그인 — v45 진입 동선 밖(가입 없음) */
function renderLogin() {
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '') + ' mode-signup';
  $('#app').innerHTML = `<div class="su"><div class="su-l"><div class="brand big"><span class="logo">D</span><b>디디쌤 스튜디오</b></div><h1>다시 오신 것을<br><em>환영합니다</em></h1><p class="lead">기관 계정으로 로그인합니다. 기관마다 데이터룸이 분리되어 있어 로그인한 기관의 데이터만 보입니다.</p>${LIVE.err ? `<p class="note bad">${esc(LIVE.err)}</p>` : ''}</div>
  <form class="su-r" id="liForm"><h2>로그인</h2><label class="fl">이메일<input name="email" type="email" autocomplete="username" required maxlength="120"></label><label class="fl">비밀번호<input name="password" type="password" autocomplete="current-password" required maxlength="200"></label><p class="lverr" id="liErr" role="alert">${LV.oerr ? esc(LV.oerr) : ''}</p>
  <button class="btn pri lg" type="submit">로그인</button></form></div>`;
  const f = $('#liForm');
  f.addEventListener('submit', async e => { e.preventDefault(); const b = f.querySelector('button[type=submit]'); b.disabled = true; $('#liErr').textContent = '';
    try { const r = await api('POST', '/api/login', { email: f.email.value.trim(), password: f.password.value }); const go = () => location.replace(location.pathname); if (r && r.mfa && window.mfaPrompt) { b.disabled = false; return window.mfaPrompt(r, go); } go(); } catch (x) { $('#liErr').textContent = window.errMsg && !(x && x.status && LVMSG[x.code]) ? errMsg(x, lvMsg(x)) : lvMsg(x); b.disabled = false; } }); /* 보안 4차 #1 2단계 */
}
const lvTo = (view, o) => { Object.assign(LV, { view, step: 'entry', mail: null }, o || {}); lvPw = ''; const fx = !!LV.focus; render(); const h = $('#entry h1, #entry h2'); if (h && !fx) { h.setAttribute('tabindex', '-1'); h.focus(); } };
ACT['lv-login'] = () => lvTo('login');
ACT['lv-signup'] = () => lvTo('signup');
ACT['lv-back'] = () => lvTo('signup', { mailOpen: true });
ACT['lv-mail'] = () => { LV.mailOpen = !lvProv().length || !LV.mailOpen; render(); const i = $('#lvMail [name=email]'); if (i) i.focus(); };
ACT['lv-kakao-off'] = () => { const e = $('#entryErr'); if (e) e.textContent = LVMSG.kakaoOff; else toast(LVMSG.kakaoOff); };
ACT['lv-ocancel'] = async () => { try { await api('POST', '/api/oauth/cancel'); } catch (e) { } LIVE.oauth = null; lvTo('signup'); };

/* 가입 실패 → 문구 · 화면 (FLOW §2 ① 오류 표) */
function lvSignupErr(x) {
  const say = m => { const e = $('#suErr'); if (e) e.textContent = m; else toast(m, 'warn'); };
  const c = x && x.status ? x.code : 'net'; const viaO = !!LIVE.oauth;
  if (c === 'exists') { say(LVMSG.exists); const em = viaO ? LIVE.oauth.email : (LV.mail && LV.mail.email) || LV.email;
    setTimeout(async () => { if (LIVE.oauth) { try { await api('POST', '/api/oauth/cancel'); } catch (e) { } LIVE.oauth = null; } lvTo('login', { email: em, mailOpen: true, focus: 'password', oerr: LVMSG.exists }); }, 1200); return; }
  if (c === 'oauth_pending') { LIVE.oauth = null; return lvTo('signup', { oerr: LVMSG.oauth_pending }); }
  if (c === 'code') { if (viaO) { say(LVMSG.code); const i = $('#suForm [name=code]'); if (i) { i.value = ''; i.focus(); } return; } return lvTo('signup', { oerr: LVMSG.code, mailOpen: true, focus: 'code' }); }
  if (c === 'email' || c === 'password') { if (!viaO) return lvTo('signup', { oerr: LVMSG[c], mailOpen: true, focus: c }); }
  say(LVMSG[c] || lvMsg(x));
}
{ const base = createOrg; createOrg = async (type, name, ed) => {
    if (LIVE.user) { base(type, name, ed); return true; } /* 로그인됨(문서 없음 이어가기 · 시험의 직접 호출) */
    if (!LIVE.oauth && !LV.mail) return false;
    const f = $('#suForm'); const btn = f && f.querySelector('button[type=submit]'); const err = $('#suErr');
    lvSave({ type, ed, name });
    const code = LIVE.oauth ? ((f && f.code && f.code.value.trim()) || '') : LV.mail.code || '';
    if (LIVE.oauth && LIVE.cfg && LIVE.cfg.signupCode && !code) { if (typeof UI !== 'undefined') delete UI.onbNew; if (err) err.textContent = LVMSG.codeNeed; if (f && f.code) f.code.focus(); return false; }
    if (btn) btn.disabled = true; if (err) err.textContent = '';
    const via = LIVE.oauth ? LIVE.oauth.provider : 'email'; let r;
    try { r = LIVE.oauth ? await api('POST', '/api/oauth/signup', { code, orgName: name, type }) : await api('POST', '/api/signup', { email: LV.mail.email, password: lvPw, code, orgName: name, type }); }
    catch (x) { if (typeof UI !== 'undefined') delete UI.onbNew; if (btn) btn.disabled = false; if (x && ['exists', 'oauth_pending', 'email', 'password'].includes(x.code) || (x && x.code === 'code' && !LIVE.oauth)) lvPw = ''; lvSignupErr(x); return false; }
    if (typeof UI !== 'undefined') UI.onbNew = 1; /* 새 동선 가입(이메일 · 소셜)은 언제나 ②로 */
    lvPw = ''; LIVE.oauth = null; LV.mail = null; LIVE.user = r.user; LIVE.tenant = r.tenant; LIVE.rev = 0; LIVE.doc = null; lvSeen(); lvDrop();
    const box = $('#suEmpty'); LV.sample = !!box && !box.checked; /* D7: 「샘플 데이터로 둘러보기」 대신 ①의 「빈 스튜디오로 시작」(empty.js) 하나로 */
    base(type, name, ed);
    S.me.name = '관리자'; logAudit(`운영자 가입 — ${via === 'email' ? '이메일' : (OAUTH_P[via] || [via])[0]}${LV.sample ? ' · 샘플 데이터 포함' : ''}`); save();
    return true;
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
ACT['live-pw'] = () => modal('비밀번호 변경', `<label class="fl">현재 비밀번호<input name="cur" type="password" autocomplete="current-password"></label><label class="fl">새 비밀번호<input name="next" type="password" autocomplete="new-password" placeholder="10자 이상, 영문과 숫자"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '변경', kind: 'pri', run: w => { api('POST', '/api/password', { current: fv(w, 'cur'), next: fv(w, 'next') }).then(() => toast('비밀번호를 변경했습니다.')).catch(e => toast(e.message, 'warn')); } }]);
AFTER.push(cur => {
  if (!LIVE.user) return;
  /* v37: 머리(상단 · 레일 아래)에 로그인 아이디 · 비밀번호 변경 · 로그아웃을 넣지 않는다(대표님 2026-11-10 — v36은 slim.js에서 숨겼지만
     live.js가 slim.js보다 늦게 읽혀 매 렌더마다 다시 넣어 운영 서버에서 그대로 보였다). 두 기능은 설정 › 계정 카드에만 있다. */
  /* v38.4 교강사 머리 계정 줄은 qa7 d5에서 뺐다 — 교강사도 레일 「내 계정」(session.js)에서 비밀번호 변경 · 로그아웃 · 로그인 기기 · 2단계 인증을 한다(휴대폰 390 머리 넘침 해소) */
  { const old = $('#liveAcct'); if (old) old.remove(); }
  if (LIVE.user.role !== 'owner' || (LIVE.cfg && LIVE.cfg.module)) { const rs = $('#roleSel'); if (rs) rs.remove(); }
  if (LIVE.user.role === 'teacher') document.querySelectorAll('[data-act="tst-new"], [data-act="cls-new"]').forEach(x => x.remove());
  if (cur.ws === 'settings' && UI.settings === 'room') {
    const b = $('[data-act="dr-new"]'); const card = b && b.closest('.card');
    if (card) card.outerHTML = `<div class="card"><div class="ch"><b>운영 서비스 계정</b><small>이 데이터룸은 서버(공유 SaaS · 서울 리전)에 있습니다</small></div><p>로그인 계정 <b>${esc(LIVE.user.email)}</b> · 테넌트 <code>${esc(LIVE.tenant.tid)}</code>. 기관 데이터는 서버 DB에서 행 수준 보안으로 격리되고, 저장할 때마다 버전(rev ${LIVE.rev})이 올라갑니다. 다른 기관은 별도 계정으로 가입 · 로그인합니다.</p></div>`;
  }
});
/* 데모 안내 문구 정리 */
Object.assign(DICT, { '로그아웃': 'Log out|ログアウト|退出登录|登出|Đăng xuất|ออกจากระบบ|Keluar|Cerrar sesión|Se déconnecter', '로그인': 'Log in|ログイン|登录|登入|Đăng nhập|เข้าสู่ระบบ|Masuk|Iniciar sesión|Se connecter' });
