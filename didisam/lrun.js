/* 디디쌤 스튜디오 v10 — 학습자 화면 런타임(learner.html)
   데이터 출처 3가지: ① 미리보기(?preview=1, 어드민 창의 초안 lsSnapshot) ② 데모(이 브라우저의 기관 데이터룸 게시본)
   ③ 운영(서버 /api/pub/<tid>/…). 화면 코드는 LR.api 하나만 부른다. 학습자는 학번(번호) + 접근코드로 로그인한다. */
'use strict';
const $ = (s, r = document) => r.querySelector(s); const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const ytOK = id => /^[\w-]{11}$/.test(id || '');
const nowISO = () => new Date().toISOString();
const Q = new URLSearchParams(location.search);
const LR = { mode: 'demo', tid: Q.get('t') || '', site: null, me: null, lp: { tut: {}, cls: {}, diag: {}, book: {} }, mine: { badges: [], cls: {}, bk: {} }, timer: 0, err: '' };

function toast(msg, kind = '') { const t = document.createElement('div'); t.className = 'ltoast ' + kind; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100); }
const api = async (method, url, body) => { const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; throw e; } return j; };

/* ── 데이터 포트 ── */
const demoRoom = () => { try { const reg = JSON.parse(localStorage.getItem('didisam.rooms') || 'null'); const tid = LR.tid || (reg && reg.cur) || ''; LR.tid = tid; return tid ? JSON.parse(localStorage.getItem('didisam.room.' + tid) || 'null') : null; } catch (e) { return null; } };
const demoLPKey = () => 'didisam.room.' + LR.tid + '.lp';
const mineFrom = (doc, sid) => { const own = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
  const bk = Object.fromEntries(Object.entries(doc.bkgrades || {}).filter(([, M]) => own(M, sid)).slice(0, 200).map(([id, M]) => [id, Object.fromEntries(Object.entries(M[sid] || {}).slice(0, 200).map(([k, g]) => [k, { score: g && g.score != null && g.score !== '' ? +g.score : null, fb: String((g && g.fb) || '').slice(0, 500) }]))]));
  const m = (doc.members || []).find(x => x && (x.sid === sid || x.name === sid)); if (!m) return { badges: [], cls: {}, bk };
  return { bk, badges: (doc.badges || []).flatMap(b => (b.issued || []).filter(i => i.who === m.id && i.st === '유효').map(i => ({ id: b.id, name: b.name, at: i.at, no: i.no }))),
    cls: Object.fromEntries((doc.classes || []).filter(c => c.prog && c.prog[m.id]).map(c => { const g = c.prog[m.id]; const thr = (c.criteria && c.criteria.threshold) || 80; return [c.id, { p: Math.round(+g.p || 0), st: g.assign || 'none', fb: String(g.fb || '').slice(0, 1000), score: g.score ?? null, done: (+g.p || 0) >= thr }]; })) }; };
const demoMine = st => (!st || !LR.me) ? { badges: [], cls: {} } : mineFrom(st, LR.me.sid);
const SESS = 'didisam.learner.' ;
LR.api = {
  async load() {
    if (Q.get('preview') === '1') {
      try { const P = window.parent; if (P !== window && P.lsSnapshot) { LR.mode = 'preview'; LR.tid = P.DREG && P.DREG.cur(); LR.site = P.lsSnapshot(); LR._codes = (P.S && P.S.codes) || []; } } catch (e) { }
    }
    if (!LR.site) { try { const c = await fetch('/api/config', { credentials: 'same-origin' }); const j = c.ok ? await c.json() : null; if (j && j.live) LR.mode = 'live'; } catch (e) { } }
    if (LR.mode === 'live') {
      if (!LR.tid) { LR.err = '학습자 사이트 주소에 기관 정보(t=)가 없습니다.'; return; }
      try { LR.site = (await api('GET', `/api/pub/${encodeURIComponent(LR.tid)}/site`)).site; } catch (e) { LR.err = e.status === 404 ? '아직 게시되지 않은 학습자 사이트입니다.' : e.message; return; }
      try { const me = await api('GET', `/api/pub/${encodeURIComponent(LR.tid)}/me`); LR.me = me.me; LR.lp = me.lp || LR.lp; LR.mine = me.mine || LR.mine; } catch (e) { }
    } else if (LR.mode === 'demo') {
      const st = demoRoom(); LR.site = st && st.lsite && st.lsite.pub; LR._codes = (st && st.codes) || [];
      if (!LR.site) { /* 이 브라우저에 게시본이 없으면(다른 기기 · 처음 방문) 체험용 샘플 사이트로 */
        try { const r = await fetch('learner-demo.json', { cache: 'no-cache' }); const j = r.ok ? await r.json() : null; if (j && j.pages) { LR.site = j; LR.sample = j.demo || null; LR.tid = 'sample'; LR._codes = j.demo ? [{ sid: j.demo.sid, code: j.demo.code, dept: j.demo.dept }] : []; } } catch (e) { }
        if (!LR.site) { LR.err = '아직 게시되지 않았습니다. 어드민 › 운영 › 학습자 사이트에서 [게시]를 누르세요.'; return; }
      }
    }
    try { const s = JSON.parse(sessionStorage.getItem(SESS + LR.tid) || 'null'); if (s && LR.mode !== 'live') LR.me = s; } catch (e) { }
    if (LR.me && LR.mode !== 'live') { try { LR.lp = { tut: {}, cls: {}, diag: {}, ...((JSON.parse(localStorage.getItem(demoLPKey()) || '{}'))[LR.me.sid] || {}) }; } catch (e) { } if (LR.mode === 'demo') LR.mine = demoMine(demoRoom()); }
  },
  async login(sid, code) {
    if (LR.mode === 'live') { const r = await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/login`, { sid, code }); LR.me = r.me; LR.lp = r.lp || LR.lp; LR.mine = r.mine || LR.mine; return; }
    const c = (LR._codes || []).find(x => x.sid === sid && String(x.code).toUpperCase() === String(code).toUpperCase());
    if (!c) throw new Error('번호 또는 접근코드가 올바르지 않습니다.');
    LR.me = { sid, dept: c.dept || '' }; try { sessionStorage.setItem(SESS + LR.tid, JSON.stringify(LR.me)); } catch (e) { }
    try { LR.lp = { tut: {}, cls: {}, diag: {}, ...((JSON.parse(localStorage.getItem(demoLPKey()) || '{}'))[sid] || {}) }; } catch (e) { }
    if (LR.mode === 'demo') LR.mine = demoMine(demoRoom());
  },
  async logout() { if (LR.mode === 'live') { try { await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/logout`); } catch (e) { } } try { sessionStorage.removeItem(SESS + LR.tid); } catch (e) { } LR.me = null; LR.lp = { tut: {}, cls: {}, diag: {} }; LR.mine = { badges: [], cls: {} }; },
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
const SITE = () => LR.site; const lvOf = i => SITE().levels[i] || { name: '', color: '#666' }; const tyOf = k => SITE().types.find(x => x.k === k) || { name: k || '', color: '#666' };
const ICP = { arrow: 'M5 12h14M13 6l6 6-6 6', play: 'M8 5v14l11-7z', check: 'M5 12l5 5L20 7', lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z', pin: 'M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13', star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z', link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', brief: 'M4 8h16v11H4zM9 8V5h6v3', award: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.5 14L7 22l5-3 5 3-1.5-8', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', home: 'M3 11l9-7 9 7v9h-6v-6H9v6H3z', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z', menu: 'M4 7h16M4 12h16M4 17h16', x: 'M6 6l12 12M18 6L6 18', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6', video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z', down: 'M6 9l6 6 6-6', out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11' };
const ico = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${n === 'play' || n === 'star' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICP[n] || ''}"/></svg>`;
/* 육각 메달(배지) — 수준 번호 · 리본 */
const medal = (n, c, r, off) => { c = c || '#4b3cff'; r = r || c; return `<svg class="medal ${off ? 'off' : ''}" viewBox="0 0 64 78" aria-hidden="true"><path d="M20 50l-5 26 10-6 7 7V56z" fill="${esc(r)}" opacity=".85"/><path d="M44 50l5 26-10-6-7 7V56z" fill="${esc(r)}"/><polygon points="32,2 59,17.5 59,48.5 32,64 5,48.5 5,17.5" fill="${esc(c)}"/><polygon points="32,9 53,21 53,45 32,57 11,45 11,21" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.6"/><text x="32" y="25" text-anchor="middle" font-size="5.5" font-weight="700" fill="#fff" letter-spacing=".6">LEVEL</text><text x="32" y="45" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">${esc(String(n))}</text></svg>`; };
const thumb = (yt, cls = '') => ytOK(yt) ? `<span class="th ${cls}"><img src="https://i.ytimg.com/vi/${esc(yt)}/hqdefault.jpg" alt="" loading="lazy"><i class="play">${ico('play', 18)}</i></span>` : `<span class="th none ${cls}"><i class="play">${ico('play', 18)}</i></span>`;
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
    if (!next) { const t = S2.tuts.find(t => !tutDone(t) && (!myType || t.type === myType) && t.level <= level) || S2.tuts.find(t => !tutDone(t)); if (t) next = { h: `추천 튜토리얼 · ${t.title}`, d: `${tyOf(t.type).name} · ${lvOf(t.level).name} · 영상 보고 3단계 따라 하기`, href: '#t/' + t.id, cta: '시작하기', yt: t.yt }; } }
  return { dg, dres, myType, step, level, earned, tStarted, tDone, cls, next };
}
const toolsOf = k => [...new Set(SITE().tuts.filter(t => t.type === k).map(t => t.tool).filter(Boolean))].slice(0, 4);

/* ── 섹션 렌더러 ── */
const SECR = {
  hero(d) {
    const T = SITE().tuts.filter(t => ytOK(t.yt)); const nT = SITE().tuts.length, nC = SITE().classes.length; const lines = String(d.title || SITE().org.name).split('\n'); const dg = diagFirst();
    const col = k => T.filter((_, i) => i % 3 === k).slice(0, 5).map(t => `<a class="mo" href="#t/${esc(t.id)}">${thumb(t.yt)}<span>${esc(t.title)}</span></a>`).join('');
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
    return `<section class="prog"><div class="in"><div class="pbox"><div class="pbh"><b>${LR.me ? `${esc(LR.me.sid)}님의 배지 로드맵` : esc(d.title || '나의 배지 로드맵')}</b><span class="mini">${ico('award', 16)} ${B.length}종 모두 받으면 ${esc(SITE().org.short || SITE().org.name)} 인증</span></div>
      <div class="rmts">${tiles}</div>${M.next ? `<a class="pnext ${M.next.warn ? 'warn' : ''}" href="${esc(M.next.href)}"><span class="pn">지금 할 일</span><span class="pt"><b>${esc(M.next.h)}</b><small>${esc(M.next.d)}</small></span><span class="lbtn pri sm">${esc(M.next.cta)}${ico('arrow', 14)}</span></a>` : ''}</div>
      ${N ? `<a class="ticker" href="#notice"><span class="tk">${ico('bell', 14)} 공지</span>${N.cls ? `<span class="tcat">${esc(N.cls)}</span>` : ''}<b>${esc(N.title)}</b><time>${esc(N.at)}</time><span class="more">전체 공지 ${ico('arrow', 14)}</span></a>` : ''}</div></section>`;
  },
  steps(d) { const M = meNow(); const I = d.items || [];
    return `<section class="sec"><div class="in">${secHead(d, `<p class="shr">아래 ${I.length}단계를 차례로 따라가면 됩니다. 모든 단계는 이 사이트 안에서 이어집니다.</p>`)}<div class="steps">${I.map((s, i) => { const now = i === M.step, done = LR.me && i < M.step;
      const href = i === 0 ? (M.dg ? '#dg/' + M.dg.id : '#diag') : i === 1 ? '#courses' : i === 2 ? '#tutorials' : '#badges';
      return `<a class="step ${now ? 'now' : ''} ${done ? 'done' : ''}" href="${href}"><div class="sth"><span class="no">${String(i + 1).padStart(2, '0')}</span><em>${done ? '완료 ✓' : now ? '지금 할 차례' : '다음'}</em></div><b>${esc(s.h)}</b><p>${esc(s.d)}</p>${s.tag ? `<div class="stf"><span>${ico('clock', 13)} ${esc(s.tag)}</span></div>` : ''}</a>`; }).join('')}</div></div></section>`; },
  tracks(d) { return `<section class="sec"><div class="in">${secHead(d)}<div class="tracks">${SITE().tracks.map(t => `<div class="track" style="--c:${esc(t.color)}"><div class="tkh"><p>${esc(t.eyebrow || 'TRACK')}</p><h3>${esc(t.name)}</h3></div><div class="tkb"><p>${esc(t.desc)}</p><ol>${(t.steps || []).map((s, i) => `<li><span>BADGE ${i + 1}</span>${esc(String(s).replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>${btn(t.cta || '시작하기', diagFirst() ? '#dg/' + diagFirst().id : '#courses', 'blk')}</div></div>`).join('')}</div></div></section>`; },
  tutorials(d) {
    const f = LR.tf || {}; const S2 = SITE(); let T = S2.tuts.filter(t => (f.lv == null || f.lv === '' || String(t.level) === String(f.lv)) && (!f.ty || t.type === f.ty)); const n = +d.n || 5; const all = T.length; T = T.slice(0, n); const main = T[0];
    const filt = `<div class="tfilt"><div class="seg">${['', ...S2.levels.map((_, i) => String(i))].map(v => `<button data-lact="tf" data-k="lv" data-v="${v}" class="${String(f.lv ?? '') === v ? 'on' : ''}">${v === '' ? '전체' : esc(lvOf(+v).name.split(' ').pop())}</button>`).join('')}</div><div class="chips">${S2.types.map(x => `<button data-lact="tf" data-k="ty" data-v="${(f.ty || '') === x.k ? '' : esc(x.k)}" class="${f.ty === x.k ? 'on' : ''}" style="--c:${esc(x.color)}"><i></i>${esc(x.k)} · ${esc(x.name)}</button>`).join('')}</div></div>`;
    const card = t => { const r = LR.lp.tut[t.id]; const n3 = r ? (r.steps || []).filter(Boolean).length : 0; return `<a class="tcard" href="#t/${esc(t.id)}">${thumb(t.yt)}<div class="tci"><span class="tg" style="--c:${esc(tyOf(t.type).color)}">${esc(tyOf(t.type).name)}</span><b>${esc(t.title)}</b><small>${esc(t.tool || t.ch || '')}</small><span class="go">${tutDone(t) ? `${ico('check', 14)} 완료` : n3 ? `${n3}/3 진행 중` : `3단계 따라 하기 ${ico('arrow', 13)}`}</span></div></a>`; };
    return `<section class="sec soft"><div class="in">${secHead(d, !d.filter && all > n ? btn(`전체 튜토리얼 라이브러리`, '#tutorials', 'dark', 'arrow') : '')}${filt}
      ${main && !d.filter ? `<div class="tmain"><a class="tmv" href="#t/${esc(main.id)}">${thumb(main.yt, 'big')}<span class="tml"><small>STEP 1 · 영상 보기</small>${esc(main.title)}<em>${esc(main.ch || main.tool || '')}</em></span></a><div class="tmi"><span class="tg" style="--c:${esc(tyOf(main.type).color)}">${esc(tyOf(main.type).name)} · ${esc(lvOf(main.level).name)}</span><h3>${esc(main.mission || main.title)}</h3><p class="mini">STEP 2 · 따라 하기</p><ol class="nsteps">${main.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="cta">${btn('이 튜토리얼 실행하기', '#t/' + main.id, 'pri')}${btn('영상만 보기', '#t/' + main.id, 'ghost')}</div></div></div>` : ''}
      <div class="tgrid">${(d.filter ? T : T.slice(1)).map(card).join('')}</div>${!all ? '<p class="empty">조건에 맞는 튜토리얼이 없습니다.</p>' : ''}</div></section>`;
  },
  diagtypes(d) { const dg = diagFirst(d.diag); const T = SITE().types; const mine = dg && LR.lp.diag[dg.id];
    const cards = (dg && dg.mode === 'type' ? dg.outs.map(o => { const x = T.find(y => y.k === o.k) || {}; return { k: o.k, name: x.name || o.l, l: o.l, color: x.color, d: x.d }; }) : T.map(x => ({ k: x.k, name: x.name, color: x.color, d: x.d })));
    return `<section class="sec"><div class="in">${secHead(d)}<div class="types">${cards.map(c => { const tu = SITE().tuts.find(t => t.type === c.k); const tools = toolsOf(c.k); const me = mine && mine.out === c.k;
      return `<div class="type ${me ? 'me' : ''}" style="--c:${esc(c.color || '#4b3cff')}"><div class="tyh"><b>${esc(c.k)}</b><span>${esc(c.name)}</span>${me ? '<em>나의 유형</em>' : ''}</div><div class="tyb"><h4>${esc(c.l && c.l !== c.name ? c.l : c.name)}</h4>${c.d ? `<p>${esc(c.d)}</p>` : ''}${tools.length ? `<div class="tools">${tools.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}${tu ? `<span class="first">첫 결과물 · ${esc(tu.mission || tu.title)}</span>` : ''}</div></div>`; }).join('')}</div>
      ${dg ? `<div class="secfoot">${btn(mine ? '다시 진단하기' : `${dg.name} 시작`, '#dg/' + dg.id, 'pri', 'arrow')}<span class="mini">${dg.items.length}문항 · 약 ${Math.max(3, Math.round(dg.items.length / 2))}분 · 결과에 맞는 코스가 바로 열립니다</span></div>` : '<p class="empty">진행 중인 진단이 없습니다.</p>'}</div></section>`; },
  badges(d) { const has = new Set(LR.mine.badges.map(b => b.id));
    return `<section class="sec dark"><div class="in">${secHead(d)}<div class="badges">${SITE().badges.map(b => { const l = lvOf(b.level); const on = has.has(b.id); return `<div class="badge ${on ? 'on' : ''}">${medal((b.level ?? 0) + 1, b.fill, b.ring)}<small>BADGE ${(b.level ?? 0) + 1}${l.diff ? ' · ' + esc(l.diff) : ''}</small><b>${esc(b.name)}</b><p>${esc(b.desc || l.goal || '')}</p><div class="crit">${SITE().tuts.filter(t => t.level === (b.level ?? 0)).length ? `<span>영상 튜토리얼 ${SITE().tuts.filter(t => t.level === (b.level ?? 0)).length}편</span>` : ''}<span>결과물 제출 · 검수</span></div>${on ? `<a class="lbtn sm" href="#badge/${esc(b.id)}">획득 · 증명 보기</a>` : ''}</div>`; }).join('') || '<p class="empty">배지가 없습니다.</p>'}</div>
      <div class="bfeat">${[['link', '증명 링크 · 인쇄', '획득한 배지는 증명 화면으로 인쇄 · PDF 저장할 수 있습니다.'], ['layers', '결과물이 쌓이는 기록', '튜토리얼 미션 · 과제가 마이페이지에 모입니다.'], ['brief', '다음 수준이 열림', '배지를 받으면 다음 수준 코스가 추천됩니다.'], ['star', `${SITE().org.short || '기관'} 인증`, `${SITE().badges.length}종을 모두 받으면 인증으로 이어집니다.`]].map(([i, h, p]) => `<div>${ico(i, 20)}<b>${esc(h)}</b><p>${esc(p)}</p></div>`).join('')}</div></div></section>`; },
  courseware(d) { const S2 = SITE(); return `<section class="sec"><div class="in">${secHead(d)}${S2.levels.map((l, i) => `<div class="cwrow"><p class="cwl"><span style="color:${esc(l.color)}">BADGE ${i + 1}</span><b>${esc(l.name)}</b><small>${esc(l.goal || l.diff || '')}</small></p><div class="cw">${S2.types.map(x => { const c = S2.classes.find(k => k.id === S2.grid[i + ':' + x.k]); const m = c && LR.mine.cls[c.id]; const lp = c && LR.lp.cls[c.id]; const dn = lp ? Object.values(lp.items || {}).filter(y => y && y.done).length : 0; const p = m ? m.p : c && dn ? Math.round(dn / Math.max(1, c.items.length) * 100) : null;
      return c ? `<a class="cwc" href="#c/${esc(c.id)}" style="--c:${esc(x.color)}"><div class="cwh"><i></i><span>${esc(x.name)}</span><b>${esc(l.name.split(' ').pop())} · ${esc(x.k)}</b><u>${esc(x.k)}</u></div><div class="cwb"><b>${esc(c.name)}</b><small>${c.items.length}개 항목${c.hours ? ` · ${c.hours}시간` : ''}</small>${p != null ? `<div class="wbar"><i style="width:${p}%"></i></div><small>진도 ${p}%</small>` : ''}</div></a>` : `<div class="cwc off" style="--c:${esc(x.color)}"><div class="cwh"><i></i><span>${esc(x.name)}</span><b>${esc(x.k)}</b><u>${esc(x.k)}</u></div><div class="cwb"><small>준비 중</small></div></div>`; }).join('')}</div></div>`).join('')}</div></section>`; },
  books(d) { return ''; },
  campus(d) { const I = d.items || []; return `<section class="sec"><div class="in">${secHead(d)}<div class="campus">${I.length ? `<div class="cp big"><span class="pill">${esc(SITE().org.short || '메인')}</span><b>${esc(I[0].h)}</b><p>${esc(I[0].d)}</p><div class="cpz">${['진단', '튜토리얼', '실습', '상담'].map(x => `<span>${x}</span>`).join('')}</div></div>` : ''}<div class="cps">${I.slice(1).map(p => `<div class="cp">${ico('pin', 18)}<b>${esc(p.h)}</b><p>${esc(p.d)}</p></div>`).join('')}</div></div></div></section>`; },
  notices(d) { const all = SITE().notices; const N = all.slice(0, +d.n || 4); const P = N.filter(n => n.pin).slice(0, 2); const R = (+d.n || 4) > 6 ? N : N.filter(n => !P.includes(n));
    const row = n => `<details class="nt"><summary>${n.cls ? `<span class="tcat">${esc(n.cls)}</span>` : n.pin ? '<span class="tcat">공지</span>' : ''}<b>${esc(n.title)}</b>${isNew(n.at) ? '<em class="new">NEW</em>' : ''}<time>${esc(n.at)}</time></summary>${n.body ? `<p>${nl(n.body)}</p>` : '<p class="mini">내용이 없습니다.</p>'}</details>`;
    return `<section class="sec"><div class="in">${secHead(d, (+d.n || 4) < all.length ? btn('공지사항 전체 보기', '#notice', 'dark', 'arrow') : '')}${N.length ? ((+d.n || 4) > 6 ? `<div class="nlist">${R.map(row).join('')}</div>` : `<div class="notices">${P.length ? `<div class="npin">${P.map(n => `<details class="ncard"><summary><span class="pin">${ico('pin', 12)} 고정</span>${n.cls ? `<span class="tcat">${esc(n.cls)}</span>` : ''}<b>${esc(n.title)}</b><p>${esc(String(n.body || '').slice(0, 90))}</p><time>${esc(n.at)}</time></summary>${n.body && n.body.length > 90 ? `<p>${nl(n.body)}</p>` : ''}</details>`).join('')}</div>` : ''}<div class="nlist">${R.map(row).join('') || '<p class="empty">새 공지가 없습니다.</p>'}</div></div>`) : '<p class="empty">공지가 없습니다.</p>'}</div></section>`; },
  cta(d) { const dg = diagFirst(); return `<section class="sec ctaw"><div class="in"><div class="ctab"><div><p>START IN ${dg ? Math.max(3, Math.round(dg.items.length / 2)) : 5} MINUTES</p><h2>${nl(d.title || '')}</h2></div>${d.cta ? btn(d.cta, dg ? '#dg/' + dg.id : '#courses', 'wht') : ''}</div></div></section>`; },
  text(d) { return `<section class="sec"><div class="in">${secHead(d)}${d.body ? `<div class="body">${nl(d.body)}</div>` : ''}</div></section>`; },
  faq(d) { return `<section class="sec"><div class="in">${secHead(d)}<div class="nlist faq">${(d.items || []).map(x => `<details class="nt"><summary><span class="tcat">Q</span><b>${esc(x.q)}</b></summary><p>${nl(x.a)}</p></details>`).join('')}</div></div></section>`; }
};
