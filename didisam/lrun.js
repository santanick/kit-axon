/* 디디쌤 스튜디오 v10 — 학습자 화면 런타임(learner.html)
   데이터 출처 3가지: ① 미리보기(?preview=1, 어드민 창의 초안 lsSnapshot) ② 데모(이 브라우저의 기관 데이터룸 게시본)
   ③ 운영(서버 /api/pub/<tid>/…). 화면 코드는 LR.api 하나만 부른다. 학습자는 학번(번호) + 접근코드로 로그인한다. */
'use strict';
const $ = (s, r = document) => r.querySelector(s); const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const ytOK = id => /^[\w-]{11}$/.test(id || '');
const nowISO = () => new Date().toISOString();
function ymdL(d) { d = d instanceof Date ? d : new Date(d == null ? Date.now() : d); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; } /* v38 현지(Asia/Seoul) 날짜 하나로 — toISOString().slice(0, 10)은 UTC라 오전 9시 전에 하루 전이 됨 */
/* v38 학습자 화면의 날짜 · 시각은 현지(Asia/Seoul) 기준 — UTC 시각(…Z)을 그대로 잘라 하루 전으로 보이던 문제(QA U8 · K11). 'YYYY-MM-DD HH:mm' */
const lLocal = v => { const s0 = String(v == null ? '' : v); const k = s0.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(?:(오전|오후)\s*)?(\d{1,2})(?:시\s*|:)(\d{1,2})/); if (k) { let h = +k[5]; if (k[4] === '오후' && h < 12) h += 12; if (k[4] === '오전' && h === 12) h = 0; const p = n => String(n).padStart(2, '0'); return `${k[1]}-${p(k[2])}-${p(k[3])} ${p(h)}:${p(k[6])}`; } const s = s0; /* v38 옛 한국어 시각 표기도 YYYY-MM-DD HH:mm */ if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) return s.replace('T', ' '); const d = new Date(s); if (isNaN(d)) return s.replace('T', ' '); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
window.lLocal = lLocal;
const Q = new URLSearchParams(location.search);
const LR = { mode: 'demo', tid: Q.get('t') || '', site: null, me: null, lp: { tut: {}, cls: {}, diag: {}, book: {} }, mine: { badges: [], cls: {}, bk: {} }, timer: 0, err: '' };

function toast(msg, kind = '') { document.querySelectorAll('.ltoast').forEach(x => x.remove()); /* v38 F5: 안내는 한 번에 하나만(겹쳐 버튼을 가리지 않게) */ const t = document.createElement('div'); t.className = 'ltoast ' + kind; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100); }
const api = async (method, url, body) => { const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; throw e; } return j; };

/* ── 데이터 포트 ── */
const demoRoom = () => { try { const reg = JSON.parse(localStorage.getItem('didisam.rooms') || 'null'); const tid = LR.tid || (reg && reg.cur) || ''; LR.tid = tid; return tid ? JSON.parse(localStorage.getItem('didisam.room.' + tid) || 'null') : null; } catch (e) { return null; } };
const demoLPKey = () => 'didisam.room.' + LR.tid + '.lp';
const mineFrom = (doc, sid) => { const own = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
  const bk = Object.fromEntries(Object.entries(doc.bkgrades || {}).filter(([, M]) => own(M, sid)).slice(0, 200).map(([id, M]) => [id, Object.fromEntries(Object.entries(M[sid] || {}).slice(0, 200).map(([k, g]) => [k, { score: g && g.score != null && g.score !== '' ? +g.score : null, fb: String((g && g.fb) || '').slice(0, 500) }]))]));
  const qa = (Array.isArray(doc.tq) ? doc.tq : []).filter(x => x && x.sid === sid && x.st === 'answered' && x.a).slice(0, 30).map(x => ({ id: String(x.id || ''), q: String(x.q || '').slice(0, 400), a: String(x.a || '').slice(0, 2000), cls: String(x.cls || '').slice(0, 60), at: String(x.aAt || x.at || '').slice(0, 25) }));
  const m = (doc.members || []).find(x => x && (x.sid === sid || x.name === sid)); if (!m) return { badges: [], cls: {}, bk, qa };
  return { bk, qa, badges: (doc.badges || []).flatMap(b => (b.issued || []).filter(i => i.who === m.id && i.st === '유효').map(i => ({ id: b.id, name: b.name, at: i.at, no: i.no }))),
    cls: Object.fromEntries((doc.classes || []).filter(c => c.prog && c.prog[m.id]).map(c => { const g = c.prog[m.id]; const thr = (c.criteria && c.criteria.threshold) || 80; return [c.id, { p: Math.round(+g.p || 0), st: g.assign || 'none', fb: String(g.fb || '').slice(0, 1000), score: g.score ?? null, exam: g.exam ?? null, done: (+g.p || 0) >= thr }]; })) }; };
const demoMine = st => (!st || !LR.me) ? { badges: [], cls: {} } : mineFrom(st, LR.me.sid);
const SESS = 'didisam.learner.' ;
/* v38 로그인 유지(QA K12): 앱은 기본으로 이 기기에 30일 기억(localStorage + 만료), 웹은 로그인 화면의 '이 기기에서 로그인 유지'를 고를 때만(공용 PC 대비). 운영 서버는 keep:false면 브라우저를 닫을 때 끝나는 쿠키 */
const lKeepApp = () => { try { return document.body.classList.contains('lapp') || Q.get('app') === '1' || matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; } };
const lKeepDef = () => lKeepApp(); /* 앱은 기본으로 기억, 웹은 '로그인 유지'를 고를 때만 */
const lKeepOn = () => { const K = [...document.querySelectorAll('form#laLogin [name=keep], form#li [name=keep]')]; return K.length ? K.some(k => k.checked) : lKeepDef(); };
const lKeepK = () => 'didisam.keep.' + (LR.tid || 'x') + (lKeepApp() ? '.app' : '.web'); /* 앱 · 웹 따로 기억 */
function lKeepSave(me) { try { if (me && LR.mode !== 'live' && lKeepOn()) localStorage.setItem(lKeepK(), JSON.stringify({ me, exp: Date.now() + 30 * 864e5 })); else localStorage.removeItem(lKeepK()); } catch (e) { } }
function lKeepLoad() { try { const v = JSON.parse(localStorage.getItem(lKeepK()) || 'null'); if (!v || !v.me || !(v.exp > Date.now())) { localStorage.removeItem(lKeepK()); return null; } return v.me; } catch (e) { return null; } }
const lKeepHTML = () => `<label class="ckl la-keep"><input type="checkbox" name="keep" ${lKeepDef() ? 'checked' : ''}> 이 기기에서 로그인 유지 <small>공용 PC에서는 끄세요</small></label>`;
Object.assign(window, { lKeepSave, lKeepLoad, lKeepOn, lKeepHTML });
LR.api = {
  async load() {
    if (Q.get('preview') === '1') {
      try { const P = window.parent; if (P !== window && P.lsSnapshot) { LR.mode = 'preview'; LR.tid = P.DREG && P.DREG.cur(); LR.site = P.lsSnapshot(); LR._codes = (P.S && P.S.codes) || []; } } catch (e) { }
    }
    if (!LR.site && !Q.get('demo')) { try { const c = await fetch('/api/config', { credentials: 'same-origin' }); const j = c.ok ? await c.json() : null; if (j && j.live) { LR.mode = 'live'; try { Object.keys(localStorage).filter(k => /^didisam\.(?:claude$|app\.claude\.|room\..*\.claude$)/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { } } /* v25 운영에서는 브라우저에 AI 키를 남기지 않는다 */ } catch (e) { } }
    if (LR.mode === 'live') {
      if (!LR.tid) { LR.err = '학습자 사이트 주소에 기관 정보(t=)가 없습니다.'; return; }
      try { LR.site = (await api('GET', `/api/pub/${encodeURIComponent(LR.tid)}/site`)).site; } catch (e) { LR.err = e.status === 404 ? '아직 게시되지 않은 학습자 사이트입니다.' : e.message; return; }
      try { const me = await api('GET', `/api/pub/${encodeURIComponent(LR.tid)}/me`); LR.me = me.me; LR.lp = me.lp || LR.lp; LR.mine = me.mine || LR.mine; } catch (e) { }
    } else if (LR.mode === 'demo') {
      const st = demoRoom(); LR.site = st && st.lsite && st.lsite.pub; LR._codes = (st && st.codes) || [];
      if (!LR.site && st) { LR.err = '아직 게시되지 않은 사이트입니다. 스튜디오 › 사이트 › 홈페이지 · 학습 사이트에서 [게시하기]를 누르면 학습자에게 열립니다.'; return; } /* v32.8 이 기관의 데이터가 있는데 게시 전이면 다른 기관 샘플을 보여 주지 않는다(QA U1) */
      if (!LR.site) { /* 이 브라우저에 게시본이 없으면(다른 기기 · 처음 방문) 체험용 샘플 사이트로 */
        try { const dm = String(Q.get('demo') || '').replace(/[^a-z0-9]/g, ''); const r = await fetch(dm && dm !== '1' ? `learner-demo-${dm}.json` : 'learner-demo.json', { cache: 'no-cache' }); /* v38.3 ?demo=1 · ?demo=adult: 운영 서버에서도 서버를 쓰지 않는 체험판(기록은 이 기기에만) */ const j = r.ok ? await r.json() : null; try { lDemoType(j, dm === 'adult' ? 'adult' : dm === 'sports' ? 'public' : 'univ'); } catch (e) { } if (j && j.pages) { LR.site = j; LR.sample = j.demo || null; LR.tid = 'sample'; LR._codes = j.demo ? [{ sid: j.demo.sid, code: j.demo.code, dept: j.demo.dept }] : []; } } catch (e) { }
        if (!LR.site) { LR.err = '아직 게시되지 않았습니다. 스튜디오 › 사이트 › 홈페이지 · 학습 사이트에서 [게시하기]를 누르세요.'; return; }
      }
    }
    try { const s = JSON.parse(sessionStorage.getItem(SESS + LR.tid) || 'null') || lKeepLoad(); if (s && LR.mode !== 'live') { LR.me = s; sessionStorage.setItem(SESS + LR.tid, JSON.stringify(s)); } } catch (e) { }
    if (LR.me && LR.mode !== 'live') { try { LR.lp = { tut: {}, cls: {}, diag: {}, ...((JSON.parse(localStorage.getItem(demoLPKey()) || '{}'))[LR.me.sid] || {}) }; } catch (e) { } if (LR.mode === 'demo') LR.mine = demoMine(demoRoom()); }
    try { LR.whoBoot = !sessionStorage.getItem('didisam.tab.' + LR.tid); sessionStorage.setItem('didisam.tab.' + LR.tid, '1'); } catch (e) { } /* v38 K12 이 창에서 처음 열 때만 계정 고르기 카드(lacct.js laWhoV) */
  },
  async login(sid, code) {
    if (LR.mode === 'live') { const r = await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/login`, { sid, code, keep: lKeepOn() }); LR.me = r.me; LR.lp = r.lp || LR.lp; LR.mine = r.mine || LR.mine; return; }
    const c = (LR._codes || []).find(x => x.sid === sid && String(x.code).toUpperCase() === String(code).toUpperCase());
    if (!c) throw new Error(`${(LR.site && LR.site.org && LR.site.org.type === 'univ') ? '학번' : '회원 번호'} 또는 접근코드가 올바르지 않습니다.`); /* v38 F5 U17 */
    LR.me = { sid, dept: c.dept || '' }; try { sessionStorage.setItem(SESS + LR.tid, JSON.stringify(LR.me)); } catch (e) { } lKeepSave(LR.me);
    try { LR.lp = { tut: {}, cls: {}, diag: {}, ...((JSON.parse(localStorage.getItem(demoLPKey()) || '{}'))[sid] || {}) }; } catch (e) { }
    if (LR.mode === 'demo') LR.mine = demoMine(demoRoom());
  },
  async logout() { if (LR.mode === 'live') { try { await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/logout`); } catch (e) { } } try { sessionStorage.removeItem(SESS + LR.tid); localStorage.removeItem(lKeepK()); } catch (e) { } LR.me = null; LR.lp = { tut: {}, cls: {}, diag: {} }; LR.mine = { badges: [], cls: {} }; },
  save() {
    if (!LR.me) return; LR.lp.at = nowISO(); clearTimeout(LR.timer);
    const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); LR.lp.days = LR.lp.days || {}; LR.lp.days[day] = Math.min(999, (LR.lp.days[day] || 0) + 1); const ks = Object.keys(LR.lp.days).sort(); if (ks.length > 370) ks.slice(0, ks.length - 370).forEach(k => delete LR.lp.days[k]);
    LR.timer = setTimeout(async () => {
      if (LR.mode === 'live') { try { await api('PUT', `/api/pub/${encodeURIComponent(LR.tid)}/progress`, { lp: LR.lp }); } catch (e) { toast('저장하지 못했습니다 — ' + e.message, 'bad'); } return; }
      if (LR.mode === 'preview') return;
      try { const k = demoLPKey(); const all = JSON.parse(localStorage.getItem(k) || '{}'); all[LR.me.sid] = LR.lp; localStorage.setItem(k, JSON.stringify(all)); } catch (e) { toast('브라우저 저장 공간에 저장하지 못했습니다.', 'bad'); }
    }, 500);
  }
};

/* ── 공통 조각(v11 디자인 — KIT AX ON 수준) ── */
/* v43: 학습 유형 · 트랙 · 단계 · 디지털북 색 중 보라 · 파랑 · 분홍(색상 200~360°)은 디디쌤 팔레트(그린 · 코랄 · 앰버 · 틸 · 잉크)로 바꿔 보여 준다. 원본 데이터(스튜디오 설정)는 그대로. */
const lNormC = (st) => { if (!st || typeof st !== 'object' || st.__nc) return st; try { Object.defineProperty(st, '__nc', { value: 1 }); } catch (e) { return st; }
  const PAL = ['#00862D', '#C2410C', '#A16207', '#0F766E', '#3F3A33', '#066B2A', '#9A3412'];
  const hue = (hx) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hx || '').trim()); if (!m) return null; const n = parseInt(m[1], 16); const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d || d / (1 - Math.abs(mx + mn - 1)) < .3) return null; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
  for (const key of ['types', 'tracks', 'levels', 'dbooks']) { const L = Array.isArray(st[key]) ? st[key] : []; const used = new Set(L.map(x => String((x && x.color) || '').toUpperCase())); let i = 0;
    L.forEach(x => { const h = x && hue(x.color); if (h == null || h < 195) return; while (i < PAL.length && used.has(PAL[i])) i++; x.color = PAL[i % PAL.length]; used.add(x.color); i++; }); }
  { const L = Array.isArray(st.badges) ? st.badges : []; const used = new Set(); let i = 0; L.forEach(x => { if (!x) return; const hf = hue(x.fill); if (hf != null && hf >= 195) { while (i < PAL.length && used.has(PAL[i])) i++; x.fill = PAL[i % PAL.length]; used.add(x.fill); i++; } const hr = hue(x.ring); if (hr != null && hr >= 195) x.ring = x.fill || PAL[0]; }); }
  /* 흰 글자를 올리는 머리 · 칩 바탕으로도 쓰이므로, 흰색 대비 4.5:1이 안 되는 밝은 색은 같은 색상으로 어둡게 */
  const lum = (hx) => { const n = parseInt(hx.slice(1), 16); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(n >> 16) + .7152 * f((n >> 8) & 255) + .0722 * f(n & 255); };
  const dark = (hx) => { if (!/^#[0-9a-f]{6}$/i.test(String(hx || ''))) return hx; let n = parseInt(hx.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, out = hx; for (let k = 0; k < 12 && 1.05 / (lum(out) + .05) < 4.6; k++) { r = Math.round(r * .9); g = Math.round(g * .9); b = Math.round(b * .9); out = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase(); } return out; };
  for (const key of ['types', 'tracks', 'levels', 'dbooks']) (Array.isArray(st[key]) ? st[key] : []).forEach(x => { if (x && x.color) x.color = dark(x.color); });
  return st; };
const SITE = () => lNormC(LR.site); window.lPayOff = () => { try { const st = LR.site || {}; return typeof st.pay === 'boolean' ? !st.pay : ['univ', 'corp', 'public'].includes((st.org || {}).type); } catch (e) { return false; } }; /* v38 F5 결제를 쓰지 않는 기관(게시본 pay:false · 대학 · 기업 · 공공 기본)은 학습자 화면의 결제 · 교재 · 구독 흔적을 감춘다 */ const lvOf = i => SITE().levels[i] || { name: '', color: '#666' }; const tyOf = k => SITE().types.find(x => x.k === k) || { name: k || '', color: '#666' };
const ICP = { arrow: 'M5 12h14M13 6l6 6-6 6', play: 'M8 5v14l11-7z', check: 'M5 12l5 5L20 7', lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z', pin: 'M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13', star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z', link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', brief: 'M4 8h16v11H4zM9 8V5h6v3', award: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.5 14L7 22l5-3 5 3-1.5-8', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', home: 'M3 11l9-7 9 7v9h-6v-6H9v6H3z', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z', menu: 'M4 7h16M4 12h16M4 17h16', x: 'M6 6l12 12M18 6L6 18', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6', video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z', down: 'M6 9l6 6 6-6', out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11' };
const ico = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${n === 'play' || n === 'star' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICP[n] || ''}"/></svg>`;
/* 육각 메달(배지) — 수준 번호 · 리본 */
const medal = (n, c, r, off) => { c = c || '#00A832' /* v43 기본 메달 그린(기관 색 없을 때) */; r = r || c; return `<svg class="medal ${off ? 'off' : ''}" viewBox="0 0 64 78" aria-hidden="true"><path d="M20 50l-5 26 10-6 7 7V56z" fill="${esc(r)}" opacity=".85"/><path d="M44 50l5 26-10-6-7 7V56z" fill="${esc(r)}"/><polygon points="32,2 59,17.5 59,48.5 32,64 5,48.5 5,17.5" fill="${esc(c)}"/><polygon points="32,9 53,21 53,45 32,57 11,45 11,21" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.6"/><text x="32" y="25" text-anchor="middle" font-size="5.5" font-weight="700" fill="#fff" letter-spacing=".6">LEVEL</text><text x="32" y="45" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">${esc(String(n))}</text></svg>`; };
const thumb = (yt, cls = '', name = '') => ytOK(yt) ? `<span class="th ${cls}${name && typeof lPhoto === 'function' ? ` ph" style="background-image:url('${esc(lPhoto(name, name))}')` : ''}"><img src="https://i.ytimg.com/vi/${esc(yt)}/hqdefault.jpg" alt="" loading="lazy"><i class="play">${ico('play', 18)}</i></span>` : `<span class="th none ${cls}${name && typeof lPhoto === 'function' ? ' ph' : ''}"${name && typeof lPhoto === 'function' ? ` style="background-image:url('${esc(lPhoto(name, name))}')"` : ''}><i class="play">${ico('play', 18)}</i></span>`; /* v43 Q2: 영상이 없으면 회색 대신 이름으로 고른 사진 */
const secHead = (d, right = '') => `<div class="sh"><div>${d.eyebrow ? `<p class="eb">${esc(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${nl(d.title)}</h2>` : ''}${d.sub ? `<p class="lead">${nl(d.sub)}</p>` : ''}</div>${right}</div>`;
const btn = (label, href, kind = 'pri', icn = '') => `<a class="lbtn ${kind}" href="${esc(href)}">${esc(label)}${icn ? ico(icn, 16) : ''}</a>`;
const diagFirst = id => (SITE().diags || []).find(d => !id || d.id === id) || (SITE().diags || [])[0];
const tutDone = t => { const r = LR.lp.tut[t.id]; return r && (r.steps || []).filter(Boolean).length >= 3; };
const isNew = at => { const d = Date.parse(String(at || '').slice(0, 10)); return d && Date.now() - d < 14 * 864e5; };
/* 학습자 상태 한 번에: 진단 유형 · 지금 단계(0 진단 → 1 코스 → 2 따라 하기 → 3 제출 · 배지) · 다음 할 일 */
function meNow() {
  const S2 = SITE(); const lp = LR.lp; const dg = diagFirst(); const dres = dg && lp.diag[dg.id]; const myType = dres ? dres.out : (Object.values(lp.diag || {})[0] || {}).out || '';
  const tStarted = S2.tuts.filter(t => lp.tut[t.id]); const tDone = S2.tuts.filter(tutDone); const cls = Object.keys(lp.cls || {}).filter(id => S2.classes.some(c => c.id === id));
  const step = !LR.me ? 0 : !myType ? 0 : !(tStarted.length || cls.length) ? 1 : !(tDone.length || LR.mine.badges.length) ? 2 : 3;
  const earned = new Set(LR.mine.badges.map(b => b.id)); const lvE = S2.badges.filter(b => earned.has(b.id)).map(b => b.level ?? 0); const level = lvE.length ? Math.min(S2.levels.length - 1, Math.max(...lvE) + 1) : 0;
  let next = null;
  if (!LR.me) next = { h: dg ? '3분 진단으로 시작하세요' : '로그인하고 시작하세요', d: dg ? '진단 결과에 맞는 코스와 튜토리얼이 열립니다.' : '학습 기록이 저장됩니다.', href: dg ? '#dg/' + dg.id : '#login', cta: dg ? '진단 시작' : '로그인' };
  else if (!myType && dg) next = { h: '진단부터 시작하세요', d: `${dg.items.length}문항 · 약 ${Math.max(3, Math.round(dg.items.length / 2))}분이면 내 유형이 나옵니다.`, href: '#dg/' + dg.id, cta: '진단 시작' };
  else { const ret = Object.entries(LR.mine.cls || {}).find(([, m]) => m.st === 'returned'); const rc = ret && S2.classes.find(c => c.id === ret[0]);
    if (rc) next = { h: `재제출 요청 · ${rc.name}`, d: ret[1].fb || '운영자 피드백을 확인하고 다시 제출하세요.', href: '#c/' + rc.id, cta: '다시 제출', warn: 1 };
    if (!next) { const c = cls.map(id => S2.classes.find(x => x.id === id)).find(c => c.items.some(i => !((lp.cls[c.id].items || {})[i.id] || {}).done)); if (c) { const it = c.items.find(i => !((lp.cls[c.id].items || {})[i.id] || {}).done); next = { h: `이어서 학습 · ${c.name}`, d: it.title, href: `#c/${c.id}/${it.id}`, cta: '이어서 학습' }; } }
    if (!next) { const t = tStarted.find(t => !tutDone(t)); if (t) next = { h: `이어서 따라 하기 · ${t.title}`, d: `${(lp.tut[t.id].steps || []).filter(Boolean).length}/3단계 완료`, href: '#t/' + t.id, cta: '이어서 하기' }; }
    if (!next) { const TV = S2.tuts.filter(t => t.yt); /* v38 F5 V12 · A8: 영상이 없는 기본 예시 튜토리얼('웹개발 첫 실습' 등)은 추천하지 않는다 */ const t = TV.find(t => !tutDone(t) && (!myType || t.type === myType) && t.level <= level) || TV.find(t => !tutDone(t)); if (t) next = { h: `추천 튜토리얼 · ${t.title}`, d: `${tyOf(t.type).name} · ${lvOf(t.level).name} · 영상 보고 3단계 따라 하기`, href: '#t/' + t.id, cta: '시작하기', yt: t.yt }; } }
  return { dg, dres, myType, step, level, earned, tStarted, tDone, cls, next };
}
const toolsOf = k => [...new Set(SITE().tuts.filter(t => t.type === k).map(t => t.tool).filter(Boolean))].slice(0, 4);

/* ── 섹션 렌더러 ── */
const SECR = {
  hero(d) {
    const T = SITE().tuts.filter(t => ytOK(t.yt)); const nT = SITE().tuts.length, nC = SITE().classes.length; const lines = String(d.title || SITE().org.name).split('\n'); const dg = diagFirst();
    const col = k => T.filter((_, i) => i % 3 === k).slice(0, 5).map(t => `<a class="mo" href="#t/${esc(t.id)}">${thumb(t.yt, '', t.title)}<span>${esc(t.title)}</span></a>`).join('');
    return `<section class="hero"><div class="hgrid"></div><div class="in"><div class="hl"><p class="hchip"><i></i>${esc(d.eyebrow || SITE().org.name)}</p><h1>${lines.map((l, i) => i === 1 ? `<em>${esc(l)}</em>` : esc(l)).join('<br>')}</h1><p class="lead">${nl(d.sub || '')}</p>
      <div class="cta">${d.cta1 ? btn(d.cta1, dg ? '#dg/' + dg.id : '#courses', 'pri', 'arrow') : ''}${d.cta2 ? btn(d.cta2.replace(/\d+개?/, ''), '#tutorials', 'ghost') : ''}</div>
      <div class="stats">${[[SITE().levels.length, '단계', '수준별 코스'], [nT, '편', '영상 튜토리얼'], [nC, '개', SITE().terms.cls || '과정'], [SITE().badges.length, '종', '디지털 배지']].map(([n, u, l]) => `<div><b>${esc(String(n))}<small>${u}</small></b><span>${esc(l)}</span></div>`).join('')}</div></div>
      <div class="hmos" aria-hidden="true">${T.length ? [0, 1, 2].map(k => `<div class="mcol c${k}">${col(k)}</div>`).join('') : `<div class="mempty">${esc(SITE().org.name)}</div>`}</div></div></section>`;
  },
  progress(d) {
    const B = SITE().badges; const M = meNow(); const N = SITE().notices[0];
    const tiles = SITE().levels.map((l, i) => { const b = B.find(x => x.level === i) || {}; const on = b.id && M.earned.has(b.id); const T = SITE().tuts.filter(t => t.level === i); const td = T.filter(tutDone).length; const cur = LR.me && i === M.level && !on;
      const st = on ? '<em class="ok">획득 ✓</em>' : cur ? `<em class="go">진행 중 ${Math.round(td / Math.max(1, T.length) * 100)}%</em>` : `<em>${LR.me ? (i < M.level ? '진행 가능' : '잠김') : '진단 후 시작'}</em>`;
      return `<a class="rmt ${on ? 'on' : ''} ${cur ? 'cur' : ''}" href="${on ? '#badge/' + esc(b.id) : '#badges'}">${medal(i + 1, b.fill || l.color, b.ring, LR.me && !on && !cur)}<div><small>BADGE ${i + 1}${l.diff ? ' · ' + esc(l.diff) : ''}</small><b>${esc(b.name || l.name)}</b><span>${esc(l.goal || b.desc || '')}</span></div>${st}</a>`; }).join('');
    return `<section class="prog"><div class="in"><div class="pbox"><div class="pbh"><b>${LR.me ? `${esc(LR.me.nick || LR.me.sid)}님의 배지 로드맵` : esc(d.title || '나의 배지 로드맵')}</b><span class="mini">${ico('award', 16)} ${B.length}종 모두 받으면 ${esc(SITE().org.short || SITE().org.name)} 인증</span></div>
      <div class="rmts">${tiles}</div>${M.next ? `<a class="pnext ${M.next.warn ? 'warn' : ''}" href="${esc(M.next.href)}"><span class="pn">지금 할 일</span><span class="pt"><b>${esc(M.next.h)}</b><small>${esc(M.next.d)}</small></span><span class="lbtn pri sm">${esc(M.next.cta)}${ico('arrow', 14)}</span></a>` : ''}</div>
      ${N ? `<a class="ticker" href="#notice"><span class="tk">${ico('bell', 14)} 공지</span>${N.cls ? `<span class="tcat">${esc(N.cls)}</span>` : ''}<b>${esc(N.title)}</b><time>${esc(N.at)}</time><span class="more">전체 공지 ${ico('arrow', 14)}</span></a>` : ''}</div></section>`;
  },
  steps(d) { const M = meNow(); const I = d.items || [];
    return `<section class="sec"><div class="in">${secHead(d, `<p class="shr">아래 ${I.length}단계를 차례로 따라가면 됩니다. 모든 단계는 이 사이트 안에서 이어집니다.</p>`)}<div class="steps">${I.map((s, i) => { const now = i === M.step, done = LR.me && i < M.step;
      const href = i === 0 ? (M.dg ? '#dg/' + M.dg.id : '#diag') : i === 1 ? '#courses' : i === 2 ? '#tutorials' : '#badges';
      return `<a class="step ${now ? 'now' : ''} ${done ? 'done' : ''}" href="${href}"><div class="sth"><span class="no">${String(i + 1).padStart(2, '0')}</span><em>${done ? '완료 ✓' : now ? '지금 할 차례' : '다음'}</em></div><b>${esc(s.h)}</b><p>${esc(s.d)}</p>${s.tag ? `<div class="stf"><span>${ico('clock', 13)} ${esc(s.tag)}</span></div>` : ''}</a>`; }).join('')}</div></div></section>`; },
  tracks(d) { const AP = document.body.classList.contains('lapp') || (typeof window.lappOn === 'function' && window.lappOn()); /* v43 R9(J4 117): 앱 트랙 카드 = 사진 띠 머리(단색 머리 → 사진 + 어둡게 깐 글자) · 그린 주 단추 */
    const ph = t => { try { return AP && typeof window.lPhoto === 'function' ? window.lPhoto(t.name + ' ' + (t.desc || ''), t.id || t.name, true) : ''; } catch (e) { return ''; } };
    return `<section class="sec"><div class="in">${secHead(d)}<div class="tracks">${SITE().tracks.map(t => { const u = ph(t); return `<div class="track${u ? ' tk9' : ''}" style="--c:${esc(t.color)}"><div class="tkh">${u ? `<img class="tkp" src="${esc(u)}" alt="" loading="lazy">` : ''}<p>${esc(t.eyebrow || 'TRACK')}</p><h3>${esc(t.name)}</h3></div><div class="tkb"><p>${esc(t.desc)}</p><ol>${(t.steps || []).map((s, i) => `<li><span>BADGE ${i + 1}</span>${esc(String(s).replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>${btn(t.cta || '시작하기', diagFirst() ? '#dg/' + diagFirst().id : '#courses', AP ? 'pri' : 'blk' /* v43 R5(117): 앱에서는 검정 단추 대신 그린 주 단추 */)}</div></div>`; }).join('')}</div></div></section>`; },
  tutorials(d) {
    const f = LR.tf || {}; const S2 = SITE(); let T = S2.tuts.filter(t => (f.lv == null || f.lv === '' || String(t.level) === String(f.lv)) && (!f.ty || t.type === f.ty)); const n = +d.n || 5; const all = T.length; T = T.slice(0, n); const main = T[0];
    const filt = `<div class="tfilt"><div class="seg">${['', ...S2.levels.map((_, i) => String(i))].map(v => `<button data-lact="tf" data-k="lv" data-v="${v}" class="${String(f.lv ?? '') === v ? 'on' : ''}">${v === '' ? '전체' : esc(lvOf(+v).name.split(' ').pop())}</button>`).join('')}</div><div class="chips">${S2.types.map(x => `<button data-lact="tf" data-k="ty" data-v="${(f.ty || '') === x.k ? '' : esc(x.k)}" class="${f.ty === x.k ? 'on' : ''}" style="--c:${esc(x.color)}"><i></i>${esc(x.k)} · ${esc(x.name)}</button>`).join('')}</div></div>`;
    const card = t => { const r = LR.lp.tut[t.id]; const n3 = r ? (r.steps || []).filter(Boolean).length : 0; return `<a class="tcard" href="#t/${esc(t.id)}">${thumb(t.yt, '', t.title)}<div class="tci"><span class="tg" style="--c:${esc(tyOf(t.type).color)}">${esc(tyOf(t.type).name)}</span><b>${esc(t.title)}</b><small>${esc(t.tool || t.ch || '')}</small><span class="go">${tutDone(t) ? `${ico('check', 14)} 완료` : n3 ? `${n3}/3 진행 중` : `3단계 따라 하기 ${ico('arrow', 13)}`}</span></div></a>`; };
    return `<section class="sec soft"><div class="in">${secHead(d, !d.filter && all > n ? btn(`전체 튜토리얼 라이브러리`, '#tutorials', 'dark', 'arrow') : '')}${filt}
      ${main && !d.filter ? `<div class="tmain"><a class="tmv" href="#t/${esc(main.id)}">${thumb(main.yt, 'big', main.title)}<span class="tml"><small>STEP 1 · 영상 보기</small>${esc(main.title)}<em>${esc(main.ch || main.tool || '')}</em></span></a><div class="tmi"><span class="tg" style="--c:${esc(tyOf(main.type).color)}">${esc(tyOf(main.type).name)} · ${esc(lvOf(main.level).name)}</span><h3>${esc(main.mission || main.title)}</h3><p class="mini">STEP 2 · 따라 하기</p><ol class="nsteps">${main.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="cta">${btn('이 튜토리얼 실행하기', '#t/' + main.id, 'pri')}${btn('영상만 보기', '#t/' + main.id, 'ghost')}</div></div></div>` : ''}
      <div class="tgrid">${(d.filter ? T : T.slice(1)).map(card).join('')}</div>${!all ? '<p class="empty">조건에 맞는 튜토리얼이 없습니다.</p>' : ''}</div></section>`;
  },
  diagtypes(d) { const dg = diagFirst(d.diag); const T = SITE().types; const mine = dg && LR.lp.diag[dg.id];
    const cards = (dg && dg.mode === 'type' ? dg.outs.map(o => { const x = T.find(y => y.k === o.k) || {}; return { k: o.k, name: x.name || o.l, l: o.l, color: x.color, d: x.d }; }) : T.map(x => ({ k: x.k, name: x.name, color: x.color, d: x.d })));
    return `<section class="sec"><div class="in">${secHead(d)}<div class="types">${cards.map(c => { const tu = SITE().tuts.find(t => t.type === c.k); const tools = toolsOf(c.k); const me = mine && mine.out === c.k;
      return `<div class="type ${me ? 'me' : ''}" style="--c:${esc(c.color || 'var(--pri)')}"><div class="tyh"><b>${esc(c.k)}</b><span>${esc(c.name)}</span>${me ? '<em>나의 유형</em>' : ''}</div><div class="tyb"><h4>${esc(c.l && c.l !== c.name ? c.l : c.name)}</h4>${c.d ? `<p>${esc(c.d)}</p>` : ''}${tools.length ? `<div class="tools">${tools.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}${tu ? `<span class="first">첫 결과물 · ${esc(tu.mission || tu.title)}</span>` : ''}</div></div>`; }).join('')}</div>
      ${dg ? `<div class="secfoot">${btn(mine ? '다시 진단하기' : `${dg.name} 시작`, '#dg/' + dg.id, 'pri', 'arrow')}<span class="mini">${dg.items.length}문항 · 약 ${Math.max(3, Math.round(dg.items.length / 2))}분 · 결과에 맞는 코스가 바로 열립니다</span></div>` : '<p class="empty">진행 중인 진단이 없습니다.</p>'}</div></section>`; },
  badges(d) { const has = new Set(LR.mine.badges.map(b => b.id));
    return `<section class="sec dark"><div class="in">${secHead(d)}<div class="badges">${SITE().badges.map(b => { const l = lvOf(b.level); const on = has.has(b.id); return `<div class="badge ${on ? 'on' : ''}">${medal((b.level ?? 0) + 1, b.fill, b.ring)}<small>BADGE ${(b.level ?? 0) + 1}${l.diff ? ' · ' + esc(l.diff) : ''}</small><b>${esc(b.name)}</b><p>${esc(b.desc || l.goal || '')}</p><div class="crit">${SITE().tuts.filter(t => t.level === (b.level ?? 0)).length ? `<span>영상 튜토리얼 ${SITE().tuts.filter(t => t.level === (b.level ?? 0)).length}편</span>` : ''}<span>결과물 제출 · 검수</span></div>${on ? `<a class="lbtn sm" href="#badge/${esc(b.id)}">획득 · 증명 보기</a>` : ''}</div>`; }).join('') || '<p class="empty">배지가 없습니다.</p>'}</div>
      <div class="bfeat">${[['link', '증명 링크 · 인쇄', '획득한 배지는 증명 화면으로 인쇄 · PDF 저장할 수 있습니다.'], ['layers', '결과물이 쌓이는 기록', '튜토리얼 미션 · 과제가 마이페이지에 모입니다.'], ['brief', '다음 수준이 열림', '배지를 받으면 다음 수준 코스가 추천됩니다.'], ['star', `${SITE().org.short || '기관'} 인증`, `${SITE().badges.length}종을 모두 받으면 인증으로 이어집니다.`]].map(([i, h, p]) => `<div>${ico(i, 20)}<b>${esc(h)}</b><p>${esc(p)}</p></div>`).join('')}</div></div></section>`; },
  courseware(d) { const S2 = SITE(); return `<section class="sec"><div class="in">${secHead(d)}${S2.levels.map((l, i) => `<div class="cwrow"><p class="cwl"><span style="color:${esc(l.color)}">BADGE ${i + 1}</span><b>${esc(l.name)}</b><small>${esc(l.goal || l.diff || '')}</small></p><div class="cw">${S2.types.map(x => { const c = S2.classes.find(k => k.id === S2.grid[i + ':' + x.k]); const m = c && LR.mine.cls[c.id]; const lp = c && LR.lp.cls[c.id]; const dn = lp ? Object.values(lp.items || {}).filter(y => y && y.done).length : 0; const p = m ? m.p : c && dn ? Math.round(dn / Math.max(1, c.items.length) * 100) : null;
      return c ? `<a class="cwc ph" href="#c/${esc(c.id)}" style="--c:${esc(x.color)}"><div class="cwh" style="--ph:url('${esc(lPhoto(c.name, c.id))}')"><i></i><span>${esc(x.name)}</span><b>${esc(l.name.split(' ').pop())} · ${esc(x.k)}</b><u>${esc(x.k)}</u></div><div class="cwb"><b>${esc(c.name)}</b><small>${c.items.length}개 항목${c.hours ? ` · ${c.hours}시간` : ''}</small>${p != null ? `<div class="wbar"><i style="width:${p}%"></i></div><small>진도 ${p}%</small>` : ''}</div></a>` : `<div class="cwc off" style="--c:${esc(x.color)}"><div class="cwh"><i></i><span>${esc(x.name)}</span><b>${esc(x.k)}</b><u>${esc(x.k)}</u></div><div class="cwb"><small>준비 중</small></div></div>`; }).join('')}</div></div>`).join('').replace(/<div class="cwc off"[\s\S]*?<small>준비 중<\/small><\/div><\/div>/g, m => document.body.classList.contains('lapp') ? '' : m).replace(/<div class="cwrow"><p class="cwl">(?:(?!<\/p>)[\s\S])*<\/p><div class="cw"><\/div><\/div>/g, '')}</div></section>`; }, /* v43 R5(117): 앱(390)에서는 「준비 중」 회색 칸을 빼고 열린 강좌만 */
  books(d) { return ''; },
  campus(d) { const I = d.items || []; return `<section class="sec"><div class="in">${secHead(d)}<div class="campus">${I.length ? `<div class="cp big"><span class="pill">${esc(SITE().org.short || '메인')}</span><b>${esc(I[0].h)}</b><p>${esc(I[0].d)}</p><div class="cpz">${['진단', '튜토리얼', '실습', '상담'].map(x => `<span>${x}</span>`).join('')}</div></div>` : ''}<div class="cps">${I.slice(1).map(p => `<div class="cp">${ico('pin', 18)}<b>${esc(p.h)}</b><p>${esc(p.d)}</p></div>`).join('')}</div></div></div></section>`; },
  notices(d) { const all = SITE().notices; const N = all.slice(0, +d.n || 4); const P = N.filter(n => n.pin).slice(0, 2); const R = (+d.n || 4) > 6 ? N : N.filter(n => !P.includes(n));
    const top = all.filter(n => isNew(n.at)).map(n => n.at).sort().pop(); let nw = false; const newOne = n => { if (nw || !top || n.at !== top) return false; nw = true; return true; }; /* v43 D-C: NEW는 가장 최근 1건만 */
    const row = n => `<details class="nt" data-nid="${esc(n.id || '')}"><summary>${n.cls ? `<span class="tcat">${esc(n.cls)}</span>` : n.pin ? '<span class="tcat">공지</span>' : ''}<b>${esc(n.title)}</b>${newOne(n) ? '<em class="new">NEW</em>' : ''}<time>${esc(n.at)}</time></summary>${window.lcNBody ? window.lcNBody(n) : n.body ? `<p>${nl(n.body)}</p>` : '<p class="mini">내용이 없습니다.</p>'}</details>`;
    return `<section class="sec"><div class="in">${secHead(d, (+d.n || 4) < all.length ? btn('공지사항 전체 보기', '#notice', 'dark', 'arrow') : '')}${N.length ? ((+d.n || 4) > 6 ? `${(() => { const PP = all.filter(n => n.pin).slice(0, 2); return PP.length ? `<div class="nt43pin" aria-label="고정 공지">${PP.map(n => `<a class="nt43c" href="#notice" data-nt43="${esc(n.id || '')}"><span class="nt43ph" style="background-image:url('${esc(lPhoto(n.cls || 'page:notice', 'nt:' + (n.id || n.title)))}')"><em>${ico('pin', 13)} 꼭 읽어 주세요</em></span><span class="nt43b">${n.cls ? `<small>${esc(n.cls)}</small>` : ''}<b>${esc(n.title)}</b><p>${esc(String(n.txt || n.body || '').replace(/[#*>\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 74))}</p><time>${esc(n.at)}</time></span></a>`).join('')}</div>` : ''; })()}<div class="nlist">${R.map(row).join('')}</div>` : `<div class="notices">${P.length ? `<div class="npin">${P.map(n => `<details class="ncard"><summary><span class="pin">${ico('pin', 12)} 고정</span>${n.cls ? `<span class="tcat">${esc(n.cls)}</span>` : ''}<b>${esc(n.title)}</b><p>${esc(String(n.txt || n.body || '').slice(0, 90))}</p><time>${esc(n.at)}</time></summary>${n.body && (n.fmt || n.body.length > 90) ? (window.lcNBody ? window.lcNBody(n) : `<p>${nl(n.body)}</p>`) : ''}</details>`).join('')}</div>` : ''}<div class="nlist">${R.map(row).join('') || '<p class="empty">새 공지가 없습니다.</p>'}</div></div>`) : '<p class="empty">공지가 없습니다.</p>'}</div></section>`; },
  cta(d) { const dg = diagFirst(); return `<section class="sec ctaw"><div class="in"><div class="ctab"><div><p>START IN ${dg ? Math.max(3, Math.round(dg.items.length / 2)) : 5} MINUTES</p><h2>${nl(d.title || '')}</h2></div>${d.cta ? btn(d.cta, dg ? '#dg/' + dg.id : '#courses', 'wht') : ''}</div></div></section>`; },
  text(d) { return `<section class="sec"><div class="in">${secHead(d)}${d.body ? `<div class="body">${nl(d.body)}</div>` : ''}</div></section>`; },
  faq(d) { return `<section class="sec"><div class="in">${secHead(d)}<div class="nlist faq">${(d.items || []).map(x => `<details class="nt"><summary><span class="tcat">Q</span><b>${esc(x.q)}</b></summary><p>${nl(x.a)}</p></details>`).join('')}</div></div></section>`; }
};
/* v43 D-C: 공지 고정 카드 → 아래 목록의 같은 공지를 펼친다 */
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a.nt43c'); if (!a) return; e.preventDefault(); const d = a.dataset.nt43 && document.querySelector(`#lm details.nt[data-nid="${CSS.escape(a.dataset.nt43)}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'center', behavior: 'smooth' }); } });

/* v43 G3 — 체험판 시드를 기관 유형별로 나눔: 같은 체험 데이터(learner-demo-*.json)를 다른 유형으로 열면
   강좌 이름 · 강사 · 가격이 그 유형답게 바뀐다(앱 유형별 홈이 서로 똑같이 보이던 문제). 파일 본래 유형이면 그대로. */
function lDemoType(j, nat) {
  if (!j || !j.org || !Array.isArray(j.classes)) return; const T = j.org.type + (j.org.type === 'univ' ? ':' + (j.org.ed || 'lite') : '');
  /* v43 R5: 체험 학습자 호칭(앱 홈 「○○님, 오늘 8분만 더 해 볼까요?」) — 유형마다 다른 가상 이름 */
  const NICK = { adult: '윤서아', k12: '김지우', 'univ:lite': '이도현', 'univ:lms': '박하은', corp: '정민준', voc: '최현우', lifelong: '한영숙', public: '오지민' };
  if (j.demo && !j.demo.nick) j.demo.nick = NICK[T] || NICK.adult;
  if (j.org.type === nat && !(nat === 'univ' && j.org.ed === 'lms')) return;
  const P = {
    k12: ['중2 수학 심화반', '중3 영어 리딩반', '고1 국어 문학 특강', '초6 과학 탐구반', '겨울방학 수학 선행', '주말 코딩 놀이반'],
    /* v43 R9(J4 203): AI교육센터 과정이 창업 · 글로벌과 섞여 보이던 문제 → 센터 과정을 AI 트랙으로 일관 */
    'univ:lite': ['AI 리터러시 기초', 'AI 데이터 분석 입문(파이썬)', 'AI 활용 취업 포트폴리오', '생성형 AI 창업 아이디어 캠프', 'AI 프롬프트 글쓰기', 'AI · SW 코딩 부트캠프'],
    'univ:lms': ['자료구조 01분반', '경영 데이터 분석 02분반', '프로그래밍 기초 01분반', '간호학 개론 02분반', '공학 수학 03분반', '교양 글쓰기 01분반'],
    corp: ['신입사원 온보딩', '생성형 AI 업무 활용', '개인정보보호 교육(법정)', '신임 팀장 리더십', '직장 내 괴롭힘 예방(법정)', '영업 협상 스킬'],
    voc: ['전기기능사 실기', '용접 기초 실습', 'CNC 선반 가공', '산업안전보건 교육', 'PLC 제어 입문', '현장 실무 프로젝트'],
    lifelong: ['스마트폰 사진 교실', '생활 영어 회화', '시니어 디지털 배움터', '수채화 기초', '우리 동네 역사 탐방', '건강 요가'],
    public: ['아쿠아로빅 오전반', '성인 수영 초급', '필라테스 저녁반', '배드민턴 강습', '키즈 수영', '헬스 PT 입문']
  }[T] || null; if (!P) return;
  const TR = { k12: '선생님', 'univ:lite': '교수', 'univ:lms': '교수', corp: '사내강사', voc: '훈련교사', lifelong: '강사', public: '코치' }[T];
  const NM = ['김서윤', '박지호', '이하린', '최도윤', '정민서', '한유진'];
  const PR = { k12: 1, 'univ:lite': 0, 'univ:lms': 0, corp: 0, voc: 0, lifelong: .4, public: .6 }[T];
  j.classes.forEach((c, i) => { if (!P[i]) return; c.name0 = c.name; c.name = P[i]; c.teacher = NM[i] + ' ' + TR; if (PR === 0) { c.price = c.salePrice = c.earlyPrice = 0; } else c.price = c.salePrice = c.earlyPrice = Math.round(c.price * PR / 1000) * 1000;
    const old = c.name0 || ''; (c.items || []).forEach((it, k) => { if (it && typeof it.title === 'string' && k === 0) it.title = '오리엔테이션 — ' + P[i]; if (it && old && typeof it.title === 'string') it.title = it.title.split(old).join(P[i]); });
    (c.sessions || []).forEach(u => { if (u && old && typeof u.title === 'string') u.title = u.title.split(old).join(P[i]); }); });
  /* v43 R5: 기관 이름 · 공지 · 오프라인 회차 이름도 유형답게(유형별 홈 8장이 같은 기관 · 같은 공지로 보이던 문제) */
  const ORG = { k12: '해운대 수학영어 학원', 'univ:lite': '해운대대학교 AI교육센터', 'univ:lms': '해운대대학교 e-캠퍼스', corp: '센텀테크 인재개발원', voc: '부산 스마트 직업전문학교', lifelong: '해운대구 평생학습관', public: '해운대 국민체육센터' }[T];
  if (ORG) { const o0 = j.org.name; j.org.name = ORG; j.org.short = ORG.slice(0, 4); try { const s2 = JSON.stringify(j.pages || []).split(o0).join(ORG); j.pages = JSON.parse(s2); } catch (e) { } }
  const map = {}; j.classes.forEach(c => { if (c.name0) map[c.name0] = c.name; });
  (j.notices || []).forEach(n => { if (!n || typeof n.title !== 'string') return; Object.entries(map).forEach(([a, b]) => { n.title = n.title.split(a).join(b); }); if (/원데이 클래스/.test(n.title)) n.title = n.title.replace(/토요일 원데이 클래스/, P[4]); });
}

/* v43 G4 — 학습자 다크: 기관 홈페이지 본문(Shadow DOM)도 다크 토큰을 따른다. 기관이 고른 브랜드 색(--c · --a)은 그대로 두고
   바탕 · 카드 · 글자 · 선 변수만 어둡게 바꾼다(게시본 CSS의 변수와 흰 바탕 고정값을 덮음). 라이트에서는 아무것도 바꾸지 않는다.
   v43 R4: 팔레트(hpcolor)가 .hpt마다 --ink · --bg를 다시 적어 .smr 변수를 덮었다 → .smr .hpt에 다크 값을 다시 주고, 표식 글자는 고정 밝은 색. */
(function () {
  if (typeof CSSStyleSheet !== 'function' || !('adoptedStyleSheets' in Document.prototype)) return;
  const V = '--bg:#151716;--bg2:#1C1F1E;--alt:#1C1F1E;--ink:#ECEDEA;--mu:#A9AEAA;--ln:rgba(255,255,255,.12);--hps-card:#1F2221;--hps-b:#151716;--hps-c:#ECEDEA;--hps-ln:rgba(255,255,255,.12);--hps-mu:#A9AEAA;--lt:color-mix(in srgb,var(--c,#00862D) 24%,#151716);--lt2:color-mix(in srgb,var(--c,#00862D) 34%,#151716);color:var(--ink)';
  const CARD = '.smr:not(.hps-on),.smr .cc,.smr .s2im figure,.smr .hp-card,.smr .hps-mb,.smr .hps-mf,.smr .hps .hps-bd,.smr .hps-card,.smr .hpx-lsf,.smr .hpt .hp-qa details,.smr .hpt .hp-dl div,.smr .hpt .hp-tll li:not(.on),.smr .hps-k-table .hps-tw,.smr footer.gf.hps-f';
  const R = s => `${s} .smr,${s} .hps-root{${V}}${s} :is(${CARD}){background-color:#1F2221!important;border-color:rgba(255,255,255,.12)!important}${s} .smr:not(.hps-on){background-color:#151716!important}${s} .smr :is(.hp-alt,.is-alt){background-color:#1C1F1E}${s} .smr :is(h1,h2,h3,h4,p,li,td,th,dt,dd,label,small,b,strong):not([style*="color"]){color:inherit}${s} .smr [data-dkw="1"]{background-color:#1F2221!important;color:var(--ink)}${s} .smr [data-dkw="2"]{background-color:#1C1F1E!important;color:var(--ink)}${s} .smr .hpt{--bg:#151716;--alt:#1C1F1E;--ink:#ECEDEA;--mu:#A9AEAA;--hps-c:#ECEDEA;--hps-mu:#A9AEAA}${s} .smr [data-dkt]{color:#ECEDEA!important}${s} .smr img{filter:brightness(.92)}`;
  const css = `:host-context(html[data-theme="dark"]) .smr{${V}}${R(':host-context(html[data-theme="dark"])')}@media (prefers-color-scheme:dark){${R(':host-context(html:not([data-theme="light"]):not([data-theme="dark"]))')}}`;
  let sh; try { sh = new CSSStyleSheet(); sh.replaceSync(css); } catch (e) { return; }
  /* 게시본이 흰색을 직접 적은 구역(변수를 쓰지 않는 섹션 · 카드)은 표식(data-dkw)을 달아 다크에서만 어둡게 */
  const mark = r => { r.querySelectorAll('.smr:not(.hps-on) *').forEach(e => { if (e.hasAttribute('data-dkw')) return; const b = getComputedStyle(e).backgroundColor; if (b === 'rgb(255, 255, 255)' || b === 'rgb(246, 247, 250)' || b === 'rgb(243, 245, 249)') e.setAttribute('data-dkw', b === 'rgb(255, 255, 255)' ? '1' : '2');
    /* 글자색을 짙은 무채색으로 직접 적은 제목 · 본문(브랜드 색 글자는 제외)도 다크에서 밝게 */ if (!e.hasAttribute('data-dkt') && [...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) { const m = getComputedStyle(e).color.match(/\d+/g); if (m) { const [r, g, bb] = m.map(Number); if (Math.max(r, g, bb) < 110 && Math.max(r, g, bb) - Math.min(r, g, bb) < 40) e.setAttribute('data-dkt', '1'); } } }); };
  const adopt = () => { document.querySelectorAll('.smhost, .lhs-head, #lm *').forEach(el => { const r = el.shadowRoot; if (!r) return; if (!r.adoptedStyleSheets.includes(sh)) r.adoptedStyleSheets = [...r.adoptedStyleSheets, sh]; try { mark(r); } catch (e) { } }); };
  new MutationObserver(() => kick()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  let t = 0; const kick = () => { clearTimeout(t); t = setTimeout(adopt, 30); };
  const go = () => { adopt(); new MutationObserver(kick).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
})();
