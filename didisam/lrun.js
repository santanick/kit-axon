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
const LR = { mode: 'demo', tid: Q.get('t') || '', site: null, me: null, lp: { tut: {}, cls: {}, diag: {} }, mine: { badges: [], cls: {} }, timer: 0, err: '' };

function toast(msg, kind = '') { const t = document.createElement('div'); t.className = 'ltoast ' + kind; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100); }
const api = async (method, url, body) => { const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; throw e; } return j; };

/* ── 데이터 포트 ── */
const demoRoom = () => { try { const reg = JSON.parse(localStorage.getItem('didisam.rooms') || 'null'); const tid = LR.tid || (reg && reg.cur) || ''; LR.tid = tid; return tid ? JSON.parse(localStorage.getItem('didisam.room.' + tid) || 'null') : null; } catch (e) { return null; } };
const demoLPKey = () => 'didisam.room.' + LR.tid + '.lp';
const demoMine = st => { if (!st || !LR.me) return { badges: [], cls: {} }; const m = (st.members || []).find(x => x.sid === LR.me.sid || x.name === LR.me.sid); if (!m) return { badges: [], cls: {} }; return { badges: (st.badges || []).flatMap(b => (b.issued || []).filter(i => i.who === m.id && i.st === '유효').map(i => ({ id: b.id, name: b.name, at: i.at, no: i.no }))), cls: Object.fromEntries((st.classes || []).filter(c => c.prog && c.prog[m.id]).map(c => [c.id, c.prog[m.id].p || 0])) }; };
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
      const st = demoRoom(); if (!st) { LR.err = '이 브라우저에 기관 데이터가 없습니다. 어드민에서 기관을 만든 뒤 학습자 사이트를 게시하세요.'; return; }
      LR.site = st.lsite && st.lsite.pub; LR._codes = st.codes || []; if (!LR.site) { LR.err = '아직 게시되지 않았습니다. 어드민 › 운영 › 학습자 사이트에서 [게시]를 누르세요.'; return; }
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
    LR.timer = setTimeout(async () => {
      if (LR.mode === 'live') { try { await api('PUT', `/api/pub/${encodeURIComponent(LR.tid)}/progress`, { lp: LR.lp }); } catch (e) { toast('저장하지 못했습니다 — ' + e.message, 'bad'); } return; }
      if (LR.mode === 'preview') return;
      try { const k = demoLPKey(); const all = JSON.parse(localStorage.getItem(k) || '{}'); all[LR.me.sid] = LR.lp; localStorage.setItem(k, JSON.stringify(all)); } catch (e) { toast('브라우저 저장 공간에 저장하지 못했습니다.', 'bad'); }
    }, 500);
  }
};

/* ── 공통 조각 ── */
const SITE = () => LR.site; const lvOf = i => SITE().levels[i] || { name: '', color: '#666' }; const tyOf = k => SITE().types.find(x => x.k === k) || { name: k || '', color: '#666' };
const thumb = (yt, cls = '') => ytOK(yt) ? `<span class="th ${cls}"><img src="https://i.ytimg.com/vi/${esc(yt)}/hqdefault.jpg" alt="" loading="lazy"><i class="play"></i></span>` : `<span class="th none ${cls}"><i class="play"></i></span>`;
const secHead = (d, dark) => `${d.eyebrow ? `<p class="eb">${esc(d.eyebrow)}</p>` : ''}${d.title ? `<h2>${nl(d.title)}</h2>` : ''}${d.sub ? `<p class="lead">${nl(d.sub)}</p>` : ''}`;
const btn = (label, href, kind = 'pri') => `<a class="lbtn ${kind}" href="${esc(href)}">${esc(label)}</a>`;
const diagFirst = id => (SITE().diags || []).find(d => !id || d.id === id) || (SITE().diags || [])[0];
const tutDone = t => { const r = LR.lp.tut[t.id]; return r && (r.steps || []).filter(Boolean).length >= 3; };

/* ── 섹션 렌더러 ── */
const SECR = {
  hero(d) {
    const T = SITE().tuts.filter(t => ytOK(t.yt)).slice(0, 4); const nT = SITE().tuts.length, nC = SITE().classes.length;
    return `<section class="hero"><div class="in"><div class="hl"><p class="eb">${esc(d.eyebrow || '')}</p><h1>${nl(d.title || SITE().org.name)}</h1><p class="lead">${nl(d.sub || '')}</p>
      <div class="cta">${d.cta1 ? btn(d.cta1, diagFirst() ? '#dg/' + diagFirst().id : '#courses') : ''}${d.cta2 ? btn(d.cta2, '#tutorials', 'ghost') : ''}</div>
      <div class="stats">${[[SITE().levels.length + '단계', '수준'], [nT + '개', '튜토리얼'], [nC + '개', SITE().terms.cls || '과정'], [SITE().badges.length + '종', '디지털 배지']].map(([n, l]) => `<div><b>${esc(n)}</b><small>${esc(l)}</small></div>`).join('')}</div></div>
      <div class="hr">${T.map((t, i) => `<a class="hv v${i}" href="#t/${esc(t.id)}">${thumb(t.yt)}<span>${esc(t.title)}</span></a>`).join('') || `<div class="hv none">${esc(SITE().org.name)}</div>`}</div></div></section>`;
  },
  progress(d) {
    if (!LR.me) return `<section class="sec prog"><div class="in"><div class="pbox"><div><b>${esc(d.title || '나의 학습')}</b><p>로그인하면 수준 · 배지 · 다음 할 일이 이어집니다.</p></div><div class="cta">${btn('로그인', '#login')}${diagFirst() ? btn('진단 먼저 하기', '#dg/' + diagFirst().id, 'ghost') : ''}</div></div></div></section>`;
    const has = new Set(LR.mine.badges.map(b => b.id)); const B = SITE().badges;
    const next = SITE().tuts.find(t => !tutDone(t));
    return `<section class="sec prog"><div class="in"><div class="pbox"><div><b>${esc(d.title || '나의 학습')}</b><p>${esc(LR.me.sid)}${LR.me.dept ? ' · ' + esc(LR.me.dept) : ''}</p></div>
      <div class="pl">${SITE().levels.map((l, i) => { const b = B.find(x => x.level === i); const on = b && has.has(b.id); return `<div class="pli ${on ? 'on' : ''}" style="--c:${esc(l.color)}"><span class="med">${i + 1}</span><div><small>BADGE ${i + 1}</small><b>${esc(l.name)}</b><em>${on ? '획득' : '진행 전'}</em></div></div>`; }).join('')}</div>
      ${next ? `<a class="pnext" href="#t/${esc(next.id)}">다음 할 일 · ${esc(next.title)}</a>` : ''}</div></div></section>`;
  },
  steps(d) { return `<section class="sec"><div class="in">${secHead(d)}<div class="steps">${(d.items || []).map((s, i) => `<div class="step"><span class="no">${String(i + 1).padStart(2, '0')}</span>${s.tag ? `<em>${esc(s.tag)}</em>` : ''}<b>${esc(s.h)}</b><p>${esc(s.d)}</p></div>`).join('')}</div></div></section>`; },
  tracks(d) { return `<section class="sec"><div class="in">${secHead(d)}<div class="tracks">${SITE().tracks.map(t => `<div class="track" style="--c:${esc(t.color)}"><p class="eb">${esc(t.eyebrow)}</p><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p><ol>${(t.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>${btn(t.cta || '시작하기', '#courses')}</div>`).join('')}</div></div></section>`; },
  tutorials(d) {
    const f = LR.tf || {}; let T = SITE().tuts.filter(t => (f.lv == null || f.lv === '' || String(t.level) === String(f.lv)) && (!f.ty || t.type === f.ty)); const n = +d.n || 5; const all = T.length; T = T.slice(0, n);
    const main = T[0];
    const filt = d.filter ? `<div class="chips">${['', ...SITE().levels.map((_, i) => String(i))].map(v => `<button data-lact="tf" data-k="lv" data-v="${v}" class="${String(f.lv ?? '') === v ? 'on' : ''}">${v === '' ? '전체 수준' : esc(lvOf(+v).name)}</button>`).join('')}${['', ...SITE().types.map(x => x.k)].map(v => `<button data-lact="tf" data-k="ty" data-v="${esc(v)}" class="${(f.ty || '') === v ? 'on' : ''}">${v === '' ? '전체 유형' : esc(tyOf(v).name)}</button>`).join('')}</div>` : '';
    return `<section class="sec"><div class="in">${secHead(d)}${filt}${main && !d.filter ? `<a class="tmain" href="#t/${esc(main.id)}">${thumb(main.yt, 'big')}<div><span class="tg" style="--c:${esc(tyOf(main.type).color)}">${esc(tyOf(main.type).name)} · ${esc(lvOf(main.level).name)}</span><h3>${esc(main.title)}</h3><ol>${main.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><b class="ms">미션 · ${esc(main.mission)}</b></div></a>` : ''}
      <div class="tgrid">${(d.filter ? T : T.slice(1)).map(t => `<a class="tcard" href="#t/${esc(t.id)}">${thumb(t.yt)}<span class="tg" style="--c:${esc(tyOf(t.type).color)}">${esc(tyOf(t.type).name)}</span><b>${esc(t.title)}</b><small>${esc(t.tool || '')}${tutDone(t) ? ' · 완료' : ''}</small></a>`).join('')}</div>
      ${!d.filter && all > n ? `<p class="more">${btn(`전체 튜토리얼 ${all}개 보기`, '#tutorials', 'ghost')}</p>` : ''}${!all ? '<p class="empty">준비 중입니다.</p>' : ''}</div></section>`;
  },
  diagtypes(d) { const dg = diagFirst(d.diag); const outs = dg ? dg.outs : []; const T = SITE().types;
    const cards = (dg && dg.mode === 'type' ? outs.map(o => ({ k: o.k, name: o.l, color: (T.find(x => x.k === o.k) || {}).color })) : T.map(x => ({ k: x.k, name: x.name, color: x.color, d: x.d })));
    const mine = dg && LR.lp.diag[dg.id];
    return `<section class="sec"><div class="in">${secHead(d)}<div class="types">${cards.map(c => `<div class="type ${mine && mine.out === c.k ? 'me' : ''}" style="--c:${esc(c.color || '#4b3cff')}"><b>${esc(c.k)}</b><span>${esc(c.name)}</span>${c.d ? `<small>${esc(c.d)}</small>` : ''}${mine && mine.out === c.k ? '<em>나의 유형</em>' : ''}</div>`).join('')}</div>
      ${dg ? `<p class="more">${btn(mine ? '다시 진단하기' : `${dg.name} 시작`, '#dg/' + dg.id)}</p>` : '<p class="empty">진행 중인 진단이 없습니다.</p>'}</div></section>`; },
  badges(d) { const has = new Set(LR.mine.badges.map(b => b.id)); return `<section class="sec dark"><div class="in">${secHead(d)}<div class="badges">${SITE().badges.map(b => `<div class="badge ${has.has(b.id) ? 'on' : ''}"><span class="med" style="--c:${esc(b.fill)};--r:${esc(b.ring)}">${esc(String((b.level ?? 0) + 1))}</span><small>BADGE ${(b.level ?? 0) + 1} · ${esc(lvOf(b.level).diff || '')}</small><b>${esc(b.name)}</b><p>${esc(b.desc || lvOf(b.level).goal || '')}</p>${has.has(b.id) ? '<em>획득</em>' : ''}</div>`).join('') || '<p class="empty">배지가 없습니다.</p>'}</div></div></section>`; },
  courseware(d) { const S2 = SITE(); return `<section class="sec"><div class="in">${secHead(d)}${S2.levels.map((l, i) => `<div class="cwrow"><p class="cwl" style="--c:${esc(l.color)}">LEVEL ${i + 1} · ${esc(l.name)} <small>${esc(l.diff || '')}</small></p><div class="cw">${S2.types.map(x => { const c = S2.classes.find(k => k.id === S2.grid[i + ':' + x.k]); const p = c ? (LR.mine.cls[c.id] ?? null) : null; return c ? `<a class="cwc" href="#c/${esc(c.id)}" style="--c:${esc(x.color)}"><span class="tg">${esc(x.name)}</span><b>${esc(c.name)}</b><small>${c.items.length}개 항목${p != null ? ` · 진도 ${p}%` : ''}</small></a>` : `<div class="cwc off" style="--c:${esc(x.color)}"><span class="tg">${esc(x.name)}</span><b>준비 중</b></div>`; }).join('')}</div></div>`).join('')}</div></section>`; },
  books(d) { return `<section class="sec dark"><div class="in">${secHead(d)}<div class="books">${SITE().dbooks.map((b, i) => `<div class="book" style="--c:${esc(b.color)}"><span class="cover"><small>BOOK ${i + 1}</small><b>${esc(b.title)}</b></span><div><b>${esc(b.title)}</b><small>${esc(lvOf(b.level).name)} · ${(b.units || []).length}단원</small><ul>${(b.units || []).slice(0, 5).map(u => `<li>${esc(u)}</li>`).join('')}</ul>${b.url ? `<a class="lbtn ghost" href="${esc(b.url)}" target="_blank" rel="noopener">뷰어로 읽기</a>` : '<small>뷰어 준비 중</small>'}</div></div>`).join('') || '<p class="empty">디지털북이 없습니다.</p>'}</div></div></section>`; },
  campus(d) { return `<section class="sec"><div class="in">${secHead(d)}<div class="campus">${(d.items || []).map((p, i) => `<div class="cp ${i === 0 ? 'big' : ''}"><b>${esc(p.h)}</b><p>${esc(p.d)}</p></div>`).join('')}</div></div></section>`; },
  notices(d) { const N = SITE().notices.slice(0, +d.n || 4); return `<section class="sec"><div class="in">${secHead(d)}<div class="notices">${N.map((n, i) => `<details class="nt"><summary>${n.pin ? '<em>고정</em>' : ''}<b>${esc(n.title)}</b>${n.cls ? `<small>${esc(n.cls)}</small>` : ''}<time>${esc(n.at)}</time></summary>${n.body ? `<p>${nl(n.body)}</p>` : ''}</details>`).join('') || '<p class="empty">공지가 없습니다.</p>'}</div></div></section>`; },
  cta(d) { const dg = diagFirst(); return `<section class="sec ctab"><div class="in"><h2>${nl(d.title || '')}</h2>${d.cta ? btn(d.cta, dg ? '#dg/' + dg.id : '#courses') : ''}</div></section>`; },
  text(d) { return `<section class="sec"><div class="in">${secHead(d)}${d.body ? `<div class="body">${nl(d.body)}</div>` : ''}</div></section>`; },
  faq(d) { return `<section class="sec"><div class="in">${secHead(d)}<div class="notices">${(d.items || []).map(x => `<details class="nt"><summary><b>${esc(x.q)}</b></summary><p>${nl(x.a)}</p></details>`).join('')}</div></div></section>`; }
};
