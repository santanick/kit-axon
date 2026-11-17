/* v43.6 셀프러닝 노트 — 대표님(2026-11-17) 「스스로 셀프러닝처럼 자기 노트 만들어가지고 관리하는 쪽으로 강화」
   이 파일 = 노트 코어(window.LNOTE API · 데이터 계약) + 학습자 화면(#notes 허브 · #notes/<id> 보기 · 편집 · 레슨 「노트」 미니 패널 · #notes/review 오늘 복습(#review는 디디쌤 튜브 「짧게 복습」이 이미 써서 겹치지 않게)).
   데이터: LR.lp.notes = { v:1, items[≤120], cards[≤300], goal, sync } — 서버 정리 규칙은 service/server/lpnotes.js · PubServiceImpl.cleanNotes(같은 기준값 tests/lpnotes-vectors.json).
   다른 파일(lnote-ai.js · lnote-sync.js)은 LNOTE API만 쓰고 LR.lp.notes를 직접 고치지 않는다.
   개인정보: 노트 · 내보내기에 이름 · 연락처 · 학번을 넣지 않는다. 스튜디오는 개수만 본다(내용은 보지 않음).
   learner.html에서 lconn.js 다음. */
'use strict';
(() => {
  if (typeof window === 'undefined') return;
  /* ── 계약 ── */
  const LIM = { items: 120, cards: 300, marks: 300, t: 80, b: 1500, tags: 5, tag: 20, f: 120, k: 240, exam: 40, page: 60, bytes: 360 * 1024 };
  const SRC = ['me', 'tutor', 'quiz', 'yt', 'file', 'exam'], CSRC = ['note', 'quiz'];
  const NID = /^n[0-9a-z]{1,24}$/, KID = /^k[0-9a-z]{1,24}$/, LID = /^[\w-]{1,40}$/, DAY = /^\d{4}-\d{2}-\d{2}$/;
  const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const line = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
  const body = (v, n) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').slice(0, n);
  const int = (v, lo, hi, d) => { const x = Math.round(+v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const pad = n => String(n).padStart(2, '0');
  const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ds(new Date());
  const addD = (s, n) => { const [y, m, d] = String(s).split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return ds(x); };
  const now = () => new Date().toISOString();
  let SEQ = 0; const nid = p => p + (Date.now().toString(36) + (SEQ++ % 1296).toString(36).padStart(2, '0') + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')).slice(-20);
  const tagsOf = A => { const out = []; for (const g of Array.isArray(A) ? A.slice(0, 20) : typeof A === 'string' ? A.split(/[,\s]+/) : []) { const s = line(g, LIM.tag).replace(/^#/, ''); if (s && !out.includes(s)) out.push(s); if (out.length >= LIM.tags) break; } return out; };
  function cleanNote(x) { if (!isObj(x) || !NID.test(String(x.id || ''))) return null; const t = line(x.t, LIM.t), b = body(x.b, LIM.b); if (!t && !b.trim()) return null;
    return { id: String(x.id), t, b, cid: LID.test(String(x.cid || '')) ? String(x.cid) : '', lid: LID.test(String(x.lid || '')) ? String(x.lid) : '', tags: tagsOf(x.tags), src: SRC.includes(x.src) ? x.src : 'me', st: x.st === 'ok' ? 'ok' : 'draft', pin: x.pin === true, at: line(x.at, 30), up: line(x.up, 30) }; }
  function cleanCard(x) { if (!isObj(x) || !KID.test(String(x.id || ''))) return null; const f = line(x.f, LIM.f); if (!f) return null;
    const ef = Math.round(Math.min(2.8, Math.max(1.3, Number.isFinite(+x.ef) ? +x.ef : 2.5)) * 100) / 100;
    return { id: String(x.id), nid: NID.test(String(x.nid || '')) ? String(x.nid) : '', f, k: body(x.k, LIM.k), due: DAY.test(String(x.due || '')) ? String(x.due) : today(), iv: int(x.iv, 1, 180, 1), ef, n: int(x.n, 0, 9999, 0), src: CSRC.includes(x.src) ? x.src : 'note' }; }
  /* 저장된 값(이 기기 · 서버)을 계약 모양으로 — 잘못된 항목은 버린다 */
  const MKEY = /^(note|ask|cmt|post|log|eval|fb):[\w.-]{1,60}$/;
  function norm(N) { const o = { v: 1, items: [], cards: [], goal: null, sync: {}, marks: {} }; if (!isObj(N)) return o; const seen = new Set();
    for (const x of Array.isArray(N.items) ? N.items : []) { const y = cleanNote(x); if (y && !seen.has(y.id)) { seen.add(y.id); o.items.push(y); } if (o.items.length >= LIM.items) break; }
    const ks = new Set(); for (const x of Array.isArray(N.cards) ? N.cards : []) { const y = cleanCard(x); if (y && !ks.has(y.id)) { ks.add(y.id); if (y.nid && !seen.has(y.nid)) y.nid = ''; o.cards.push(y); } if (o.cards.length >= LIM.cards) break; }
    if (isObj(N.goal)) { const exam = line(N.goal.exam, LIM.exam), date = String(N.goal.date || ''); if (exam && DAY.test(date)) o.goal = { exam, date }; }
    const S = isObj(N.sync) ? N.sync : {}; if (isObj(S.notion)) o.sync.notion = { on: S.notion.on === true, at: line(S.notion.at, 30), page: line(S.notion.page, LIM.page) }; if (isObj(S.gdocs)) o.sync.gdocs = { on: S.gdocs.on === true, at: line(S.gdocs.at, 30) };
    if (isObj(N.marks)) { let n = 0; for (const [k, v] of Object.entries(N.marks)) { if (n >= LIM.marks) break; if (!MKEY.test(k) || !isObj(v) || !(v.pin === true || v.hide === true || v.seen === true)) continue; o.marks[k] = { pin: v.pin === true, hide: v.hide === true, seen: v.seen === true }; n++; } }
    return o; }
  const LRo = () => (typeof LR === 'object' && LR) || null;
  /* 원본: LR.lp.notes(로그인 · 학습 기록이 바뀌면 그 값을 다시 읽는다) */
  let LAST = null;
  function store() { const R = LRo(); if (!R) return norm(null); if (!R.lp || typeof R.lp !== 'object') R.lp = { tut: {}, cls: {}, diag: {} }; const N = R.lp.notes; if (N === LAST && N) return N; const o = norm(N); R.lp.notes = o; LAST = o; return o; }
  const L = new Set(); const emit = (k, x) => { L.forEach(fn => { try { fn(k, x); } catch (e) { console.error('LNOTE.on', e); } }); };
  const persist = (k, x) => { const R = LRo(); try { if (R && R.me && R.api && typeof R.api.save === 'function') R.api.save(); } catch (e) { console.error('LNOTE save', e); } emit(k, x); };
  const bytes = o => { try { return new Blob([JSON.stringify(o)]).size; } catch (e) { return JSON.stringify(o).length * 3; } };
  const warn = m => { try { if (typeof toast === 'function') toast(m, 'warn'); } catch (e) { } };

  const API = {
    LIM, SRC, today, addD,
    all() { return store().items.slice(); },
    get(id) { return store().items.find(x => x.id === id) || null; },
    /* 새 노트(id 없음 · 모르는 id) → 만들고, 있는 id → 고친다. 제한은 자르고, 저장 후 노트(복사본 아님)를 돌려준다. 가득 차면 null */
    save(p) { if (!isObj(p)) return null; const N = store(); const old = p.id ? N.items.find(x => x.id === p.id) : null; const t = now();
      const src = SRC.includes(p.src) ? p.src : old ? old.src : 'me';
      const draft = { ...(old || {}), ...p, id: old ? old.id : (NID.test(String(p.id || '')) ? p.id : nid('n')), src, st: p.st === 'ok' || p.st === 'draft' ? p.st : old ? old.st : (src === 'me' ? 'ok' : 'draft'), pin: p.pin === undefined ? !!(old && old.pin) : p.pin === true, at: old ? old.at : (line(p.at, 30) || t), up: t };
      const y = cleanNote(draft); if (!y) { warn('제목이나 내용을 적어 주세요.'); return null; }
      if (!old && N.items.length >= LIM.items) { warn(`노트는 ${LIM.items}개까지 둘 수 있어요. 오래된 노트를 정리해 주세요.`); return null; }
      const i = old ? N.items.indexOf(old) : -1; const prev = i >= 0 ? N.items[i] : null; if (i >= 0) N.items[i] = y; else N.items.unshift(y);
      if (bytes(N) > LIM.bytes) { if (i >= 0) N.items[i] = prev; else N.items.shift(); warn('노트 저장 공간이 가득 찼어요. 긴 노트를 줄이거나 정리해 주세요.'); return null; }
      persist(old ? 'up' : 'add', y); return y; },
    del(id) { const N = store(); const i = N.items.findIndex(x => x.id === id); if (i < 0) return false; N.items.splice(i, 1); N.cards.forEach(c => { if (c.nid === id) c.nid = ''; }); persist('del', { id }); return true; },
    cards() { return store().cards.slice(); },
    card(id) { return store().cards.find(x => x.id === id) || null; },
    saveCard(c) { if (!isObj(c)) return null; const N = store(); const old = c.id ? N.cards.find(x => x.id === c.id) : null;
      const y = cleanCard({ iv: 1, ef: 2.5, n: 0, due: today(), src: 'note', ...(old || {}), ...c, id: old ? old.id : (KID.test(String(c.id || '')) ? c.id : nid('k')) }); if (!y) { warn('카드 앞면을 적어 주세요.'); return null; }
      if (y.nid && !N.items.some(x => x.id === y.nid)) y.nid = '';
      if (!old && N.cards.length >= LIM.cards) { warn(`복습 카드는 ${LIM.cards}장까지 둘 수 있어요.`); return null; }
      if (old) N.cards[N.cards.indexOf(old)] = y; else N.cards.push(y); persist(old ? 'card-up' : 'card-add', y); return y; },
    delCard(id) { const N = store(); const i = N.cards.findIndex(x => x.id === id); if (i < 0) return false; N.cards.splice(i, 1); persist('card-del', { id }); return true; },
    /* 그날(기본 오늘) 복습할 카드 — 기한이 지난 것부터 */
    due(day) { const d = DAY.test(String(day || '')) ? day : today(); return store().cards.filter(c => c.due <= d).sort((a, b) => a.due < b.due ? -1 : a.due > b.due ? 1 : a.n - b.n); },
    /* 간단한 SM-2: 0 다시(1일 · 쉬움 -0.2) · 1 알쏭(조금 늘림 · -0.15) · 2 앎(1 → 3 → 간격×쉬움 · +0.1). 간격 1~180일, 쉬움 1.3~2.8 */
    next(c, q) { q = int(q, 0, 2, 0); let { iv, ef, n } = c;
      if (q === 0) { iv = 1; ef -= 0.2; } else if (q === 1) { iv = n === 0 ? 1 : Math.max(iv + 1, Math.round(iv * 1.2)); ef -= 0.15; } else { iv = iv < 3 ? (n === 0 ? 1 : 3) : Math.round(iv * ef); ef += 0.1; }
      iv = Math.min(180, Math.max(1, iv)); return { iv, ef: Math.round(Math.min(2.8, Math.max(1.3, ef)) * 100) / 100, n: Math.min(9999, n + 1), due: addD(today(), iv) }; },
    grade(id, q) { const N = store(); const c = N.cards.find(x => x.id === id); if (!c) return null; Object.assign(c, API.next(c, q)); persist('grade', { id, q: int(q, 0, 2, 0), card: c }); return c; },
    goal(g) { const N = store(); if (g === undefined) return N.goal; if (g === null) N.goal = null; else { const exam = line(g && g.exam, LIM.exam), date = String((g && g.date) || ''); if (!exam || !DAY.test(date)) return null; N.goal = { exam, date }; } persist('goal', N.goal); return N.goal; },
    /* sync는 lnote-sync.js가 쓴다(비밀값은 여기 두지 않는다 — 키는 그 파일이 이 기기 저장소에) */
    sync(k, v) { const N = store(); if (k === undefined) return N.sync; if (!['notion', 'gdocs'].includes(k)) return null; if (v === null) delete N.sync[k]; else { const o = { on: !!(v && v.on === true), at: line(v && v.at, 30) }; if (k === 'notion') o.page = line(v && v.page, LIM.page); N.sync[k] = o; } persist('sync', { k }); return N.sync[k] || null; },
    /* 모아보기 표시: key = '<출처>:<id>'(note · ask · cmt · post · log · eval · fb), v = { pin?, hide?, seen? } — 모두 끄면 지운다. 300개까지 */
    marks() { return { ...store().marks }; },
    mark(key, v) { const N = store(); if (!MKEY.test(String(key || ''))) return null; const p0 = N.marks[key] || {}; const o = { pin: !!(v && v.pin === true), hide: !!(v && v.hide === true), seen: !!(v && 'seen' in v ? v.seen === true : p0.seen) };
      if (!o.pin && !o.hide && !o.seen) delete N.marks[key]; else { if (!N.marks[key] && Object.keys(N.marks).length >= LIM.marks) { warn(`표시는 ${LIM.marks}개까지 둘 수 있어요.`); return null; } N.marks[key] = o; } persist('mark', { key }); return N.marks[key] || null; },
    on(fn) { if (typeof fn === 'function') L.add(fn); return () => L.delete(fn); },
    open(id) { location.hash = id ? '#notes/' + encodeURIComponent(id) : '#notes'; },
    /* 오늘 복습 화면(#notes/review). 노트 id를 주면 그 노트 카드만 */
    review(nid) { location.hash = '#notes/review' + (nid ? '?n=' + encodeURIComponent(nid) : ''); },
    /* 마크다운 한 편 — 이름 · 연락처 · 학번은 넣지 않는다 */
    md(x) { const n = typeof x === 'string' ? API.get(x) : x; if (!n) return ''; const c = cName(n.cid); const it = n.lid ? iName(n.cid, n.lid) : '';
      return [`# ${n.t || '제목 없음'}`, '', [c && `과정: ${c}${it ? ` › ${it}` : ''}`, n.tags.length ? n.tags.map(t => '#' + t).join(' ') : '', `${SRCN[n.src] || '내 노트'}${n.st === 'draft' ? ' · 초안' : ''} · ${String(n.up || n.at).slice(0, 10)}`].filter(Boolean).map(s => `> ${s}`).join('\n'), '', n.b || ''].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'; },
    /* 시험 · 점검용 */
    _norm: norm, _store: store
  };
  const SRCN = { me: '내 노트', tutor: 'AI 튜터', quiz: '오답노트', yt: '영상 노트', file: '내 자료', exam: '시험 계획' };
  const cls = () => { try { return (typeof SITE === 'function' && SITE() && SITE().classes) || []; } catch (e) { return []; } };
  const cName = cid => { const c = cid && cls().find(x => x.id === cid); return c ? c.name : ''; };
  const iName = (cid, lid) => { const c = cid && cls().find(x => x.id === cid); const it = c && (c.items || []).find(y => y.id === lid); return it ? it.title : ''; };
  API.SRCN = SRCN; API.cName = cName; API.iName = iName;
  window.LNOTE = API;
})();

/* ── 학습자 화면: #notes 허브 · #notes/<id> 보기 · 편집 · 레슨 「노트」 미니 패널 · #notes/review 오늘 복습(#review는 디디쌤 튜브 「짧게 복습」이 이미 써서 겹치지 않게) · 진입점 ── */
(() => {
  if (typeof viewPage !== 'function' || typeof lrender !== 'function' || typeof LR !== 'object' || !window.LNOTE) return;
  const N = window.LNOTE;
  { const cs = document.currentScript; const v = cs && cs.src && (cs.src.match(/\?v=[^&#]+/) || [''])[0]; if (!document.getElementById('lnCss')) { const l = document.createElement('link'); l.id = 'lnCss'; l.rel = 'stylesheet'; l.href = 'lnote.css' + (v || ''); (document.head || document.documentElement).appendChild(l); } }
  Object.assign(ICP, { plus: ICP.plus || 'M12 5v14M5 12h14', lnpen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', lnback: 'M9 14l-4-4 4-4M5 10h9a5 5 0 010 10h-2', lnplay: 'M4 5h16v14H4zM10 9l5 3-5 3z', lndoc: 'M6 3h9l4 4v14H6zM14 3v5h5', lnflag: 'M5 21V4M5 4h11l-2 4 2 4H5',
    lnnote: 'M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3', lncards: 'M8 4h12v13H8zM4 8v12h12', lnpin: 'M12 16v6M8 3h8l-1 6 3 3v2H6v-2l3-3z', lntrash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', lndl: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    more: 'M5 12h.01M12 12h.01M19 12h.01', lnfb: 'M4 5h16v11H9l-5 4zM14 8l2 2-4 4h-2v-2z', lnask: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01', lnpost: 'M5 4h9l5 5v11H5zM9 15l5-5 2 2-5 5H9z', lnlog: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 12l3 3 5-6', chat: ICP.chat || 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5', lntap: 'M9 11V5a2 2 0 014 0v6M13 10a2 2 0 014 0v3M17 12a2 2 0 014 0v3a7 7 0 01-7 7h-1a7 7 0 01-6-3.5L4 14a2 2 0 013-2.5l2 2', search: ICP.search || 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4', x: ICP.x || 'M6 6l12 12M18 6L6 18' });
  const SRCI = { me: 'lnpen', tutor: 'spark', quiz: 'lnback', yt: 'lnplay', file: 'lndoc', exam: 'lnflag' };
  const SRCL = { me: '내가', tutor: '튜터', quiz: '오답', yt: '영상', file: '파일', exam: '시험' };
  const appOn = () => document.body.classList.contains('lapp');
  const isPar = () => !!(LR.me && LR.me.kind === 'parent');
  const off = () => { try { const o = SITE() && SITE().lnote; return !!(o && o.off === true); } catch (e) { return false; } }; /* 기관이 노트 기능을 끔(스튜디오 설정, 개발자 3) */
  const okMe = () => !!(LR.me && !isPar() && LR.lp && !off());
  const td = N.today;
  const isRv = () => { try { return route().a === 'notes' && route().b === 'review'; } catch (e) { return false; } };
  const md2 = s => { const [, m, d] = String(s || '').slice(0, 10).split('-'); return m ? `${+m}월 ${+d}일` : ''; };
  const dayOf = s => { const d = new Date(s); return isNaN(d) ? String(s || '').slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const LN = { seg: 'note', hid: false, q: '', tag: '', cid: '', edit: false, view: false, del: '', pre: null, cardf: false };
  let RV = null;
  /* 내 과정(노트 연결 · 묶음 이름) */
  function myCourses() { let C = []; try { C = typeof myStats === 'function' ? myStats().courses.map(x => x.c).filter(Boolean) : []; } catch (e) { C = []; } if (!C.length) { try { C = (SITE().classes || []).filter(c => ((LR.lp || {}).cls || {})[c.id]); } catch (e) { C = []; } } return C; }
  /* 연속 학습일: 학습 기록 days(LR.api.save가 날마다 셈) — 오늘이나 어제까지 이어진 날 수 */
  function streak() { const D = (LR.lp && LR.lp.days) || {}; let d = td(); if (!D[d]) d = N.addD(d, -1); let n = 0; while (D[d] && n < 400) { n++; d = N.addD(d, -1); } return n; }
  const week = () => { const D = (LR.lp && LR.lp.days) || {}; return Array.from({ length: 7 }, (_, i) => { const d = N.addD(td(), i - 6); return { d, on: !!D[d], t: d === td() }; }); };
  /* 본문(마크다운 일부: 줄바꿈 · - 목록 · **굵게** · `코드`) → 안전한 HTML */
  function mdHTML(b, n) { const tc = t => t.replace(/\[(\d{1,3}):([0-5]\d)\]/g, (m, a, c) => n && n.cid && n.lid ? `<a class="ln-tc" href="#c/${esc(n.cid)}/${esc(n.lid)}?t=${+a * 60 + +c}" aria-label="레슨 ${a}분 ${c}초로 가기">${ico('play', 13)}${a}:${c}</a>` : `<span class="ln-tc">${a}:${c}</span>`); const inl = t => tc(esc(t)).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); const out = []; let ul = null;
    String(b || '').split('\n').forEach((l, i) => { const m = /^\s*[-*]\s+(.*)$/.exec(l); if (m) { const ck = /^\[( |x|X)\]\s*(.*)$/.exec(m[1]); if (ck && n && !ended(n.cid)) { const on = ck[1] !== ' '; (ul = ul || []).push(`<li class="ck${on ? ' on' : ''}"><button type="button" class="ln-ckb" data-ln="chk" data-i="${i}" role="checkbox" aria-checked="${on}" aria-label="${esc(ck[2] || '할 일')}">${on ? ico('check', 16) : ''}</button><span>${inl(ck[2])}</span></li>`); return; } (ul = ul || []).push(`<li>${inl(m[1])}</li>`); return; } if (ul) { out.push(`<ul>${ul.join('')}</ul>`); ul = null; } if (l.trim()) out.push(`<p>${inl(l)}</p>`); });
    if (ul) out.push(`<ul>${ul.join('')}</ul>`); return out.join(''); }
  const plain = b => String(b || '').replace(/`|\*\*/g, '').replace(/^\s*[-*]\s+/gm, '· ').replace(/\s*\n\s*/g, ' ').trim();
  const srcB = s => `<span class="ln-src" data-s="${esc(s)}">${ico(SRCI[s] || 'lnpen', 14)}${esc(SRCL[s] || '내가')}</span>`;
  const cardsOf = id => N.cards().filter(c => c.nid === id);
  const stamp = () => td().replace(/-/g, '');
  const dl = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };

  /* ── 시연 노트(체험판에서 허브를 처음 열 때 한 번 — 내 과정 · 레슨 · 퀴즈로 만든다. 이름 · 학번 없음) ── */
  const seedK = () => `didisam.lnote.seeded.${LR.tid || 'x'}.${(LR.me && (LR.me.sid || LR.me.id)) || ''}`;
  function seed() { if (LR.mode !== 'demo' || !okMe()) return; try { if (localStorage.getItem(seedK()) || localStorage.getItem('didisam.lnote.noseed')) return; } catch (e) { return; } if (N.all().length || N.cards().length) { try { localStorage.setItem(seedK(), '1'); } catch (e) { } return; }
    let C = myCourses(); if (!C.length) C = (SITE().classes || []).slice(0, 2); C = C.slice(0, 3); if (!C.length) return; const d0 = td(); let k = 0;
    C.forEach((c, ci) => { const L = (c.items || []).filter(x => x && x.type !== 'chapter'); const tag = String(c.name || '').split(/\s+/)[0].slice(0, 20);
      L.filter(x => ['video', 'doc', 'live', 'offline'].includes(x.type)).slice(0, ci ? 2 : 3).forEach((it, i) => { const tutor = ci === 0 && i === 1;
        const lead = String(it.desc || '').replace(/\s+/g, ' ').trim().slice(0, 160);
        N.save({ t: `${it.title} 정리`.slice(0, 80), b: `**핵심**\n- ${lead || `${it.title}에서 배운 개념을 내 말로 한 줄 정리해요`}\n- 예시를 하나 직접 만들어 봤어요\n\n**다시 볼 것**\n- 헷갈린 부분은 복습 카드로 만들어 두기`, cid: c.id, lid: it.id, tags: [tag, ITN && ITN[it.type] ? ITN[it.type] : '레슨'].filter(Boolean), src: tutor ? 'tutor' : 'me', st: tutor ? 'draft' : 'ok', pin: ci === 0 && i === 0 }); });
      const qs = L.filter(x => ['quiz', 'exam'].includes(x.type) && Array.isArray(x.qs)).flatMap(x => x.qs.map(q => ({ q, it: x }))).slice(0, 6);
      const wrong = [];
      qs.forEach(({ q, it }) => { const qq = String(q.q || '').replace(/^\s*\d+[.)]\s*/, '').trim(); const ans = q.t === 'ox' ? (q.a === 0 || q.a === 'O' || q.a === true ? 'O' : 'X') : Array.isArray(q.opts) && q.opts[q.a] != null ? String(q.opts[q.a]) : String(q.a != null ? q.a : ''); if (!qq || !ans) return;
        const off = [0, 0, 0, 1, 3, 6][k % 6]; k++; N.saveCard({ f: qq, k: ans, src: 'quiz', due: N.addD(d0, off), iv: off || 1, n: off ? 2 : 1 }); if (wrong.length < 2) wrong.push(`- ${qq.slice(0, 60)} → **${ans.slice(0, 40)}**`); });
      if (wrong.length) N.save({ t: `${c.name} 오답노트`.slice(0, 80), b: `틀린 문제를 모았어요. 정답 이유를 내 말로 적어 보세요.\n${wrong.join('\n')}`, cid: c.id, tags: [tag, '오답'], src: 'quiz', st: 'draft' }); });
    try { localStorage.setItem(seedK(), '1'); } catch (e) { } }

  /* ── 모아보기(추가 지시 1 · FINAL-SPEC S22~S26): LNOTE.feed()가 노트 · 질문 · 댓글 · 글 · 학습 기록을 그때그때 모아 한 형식으로.
     원본은 읽기만 하고 저장을 늘리지 않는다 — 고정 · 숨기기만 notes.marks('<출처>:<id>'). ── */
  const KN = { all: '전체', note: '노트', ask: '질문', cmt: '댓글', post: '글', eval: '평가', log: '기록' };
  const KL = { note: '노트', ask: '질문', cmt: '댓글', post: '글', eval: '평가 · 피드백', log: '학습 기록' };
  const KI = { ask: 'lnask', cmt: 'chat', post: 'lnpost', log: 'lnlog', eval: 'award', fb: 'lnfb', aifb: 'spark' };
  const kid = x => String(x || '').replace(/[^\w.-]/g, '').slice(0, 60);
  /* 수강 기간이 끝난 과정 = 읽기 전용(「기간 끝남」) */
  function ended(cid) { if (!cid) return false; const c = (SITE().classes || []).find(x => x.id === cid); if (!c) return false; const sid = LR.me && LR.me.sid; const e = (c.ends && sid && c.ends[sid]) || c.end; return /^\d{4}-\d{2}-\d{2}$/.test(String(e || '')) && e < td(); }
  const endB = cid => ended(cid) ? `<em class="ln-end">${ico('lock', 13)}기간 끝남</em>` : '';
  const seenQ = id => { try { return !!(typeof LT === 'object' && LT && LT.q && LT.q['seen' + id]); } catch (e) { return false; } };
  const markSeen = id => { try { if (typeof LT === 'object' && LT && LT.q) LT.q['seen' + id] = 1; } catch (e) { } };
  const noName = s => String(s || '').replace(/\d{8,10}/g, '').trim(); /* 학번 같은 숫자는 옮기지 않는다 */
  function feedAll() { const out = []; const T = (LR.lp && LR.lp.tutor) || {}; const QA = (LR.mine && Array.isArray(LR.mine.qa)) ? LR.mine.qa : [];
    N.all().forEach(n => out.push({ src: 'note', id: n.id, key: 'note:' + n.id, t: n.t || plain(n.b).slice(0, 60), body: [n.b, n.tags.join(' '), ...cardsOf(n.id).map(c => c.f + ' ' + c.k)].join(' '), cid: n.cid, at: n.up || n.at, st: n.st === 'draft' ? '확인 전' : '', ns: n.src, href: '#notes/' + n.id, pin: n.pin, note: n }));
    const seen = new Set();
    (Array.isArray(T.ask) ? T.ask : []).forEach(x => { if (!x || !x.id) return; const a = QA.find(y => y && y.id === x.id); seen.add(x.id); out.push({ src: 'ask', id: kid(x.id), t: String(x.q || '').slice(0, 120), body: String(x.q || '') + ' ' + (a ? String(a.a || a.fb || '') : ''), q: String(x.q || ''), ans: a ? String(a.a || a.fb || '') : '', from: 'AI 튜터', cid: x.cid || '', where: x.where || '', at: (a && a.at) || x.at || '', st: a ? (seenQ(x.id) ? '답변 옴' : '새 답변') : '답변 기다리는 중', href: x.cid ? `#c/${x.cid}` : '#ai' }); });
    QA.forEach(a => { if (!a || !a.id || seen.has(a.id)) return; out.push({ src: 'ask', id: kid(a.id), t: String(a.q || '').slice(0, 120), body: String(a.q || '') + ' ' + String(a.a || a.fb || ''), q: String(a.q || ''), ans: String(a.a || a.fb || ''), from: 'AI 튜터', cid: '', at: a.at || '', st: seenQ(a.id) ? '답변 옴' : '새 답변', href: '#ai' }); });
    try { if (typeof lcPosts === 'function') { const P = lcPosts(); const me = typeof lcMe === 'function' ? lcMe() : '';
      P.filter(x => x.own).forEach(x => { const isQ = /질문/.test(String(x.kind || '') + String(x.board || '')); const reply = isQ ? (x.cmts || []).find(c => c.au !== me) : null;
        out.push({ src: isQ ? 'ask' : 'post', id: kid(x.id), t: String(x.title || x.body || '').slice(0, 120), body: String(x.title || '') + ' ' + String(x.body || ''), q: String(x.body || x.title || ''), ans: reply ? String(reply.body || '') : '', ansBy: reply ? (reply.teacher || reply.staff ? '강사 답변' : '다른 학습자') : '', from: isQ ? '질문 게시판' : (x.board || '게시판'), cid: x.cls || '', at: x.at || '', st: isQ ? (reply ? '답변 옴' : '답변 기다리는 중') : x.pend ? '반영 대기' : (x.cmts || []).length ? `댓글 ${x.cmts.length}` : '', href: '#post/' + encodeURIComponent(x.id) }); });
      const walk = (L, post) => (L || []).forEach(c => { if (c && c.au === me) out.push({ src: 'cmt', id: kid(c.id), t: String(c.body || '').slice(0, 120), body: String(c.body || ''), from: `「${String(post.title || '').slice(0, 20)}」`, cid: post.cls || '', at: c.at || '', st: '', href: '#post/' + encodeURIComponent(post.id) }); walk(c.replies, post); });
      P.forEach(x => walk(x.cmts, x)); }
      if (typeof lcStore === 'function' && typeof COMM === 'function') { const st = lcStore(); const me = typeof lcMe === 'function' ? lcMe() : ''; const by = new Map(); [...(COMM().notes || []).filter(n => n.au === me), ...(st.notes || [])].forEach(n => { if (n && n.id) by.set(n.id, n); });
        by.forEach(n => out.push({ src: 'post', id: kid(n.id), t: String(n.body || '').slice(0, 80) || '학습노트', body: String(n.body || ''), from: '학습노트', cid: n.cls || '', at: n.at || '', st: n.pub ? '공개' : '나만 보기', href: n.cls ? `#c/${n.cls}${n.item ? '/' + n.item : ''}` : '#notes' })); } } catch (e) { console.error('lnote feed comm', e); }
    /* 학습 기록(날짜가 있는 것): 퀴즈 · 과제 · 레슨 완료(기록 시각이 있을 때) · 수료 · 배지 · 미션 */
    const C = (LR.lp && LR.lp.cls) || {}; Object.entries(C).forEach(([cid, r]) => { const c = (SITE().classes || []).find(x => x.id === cid); if (!c || !r) return;
      Object.entries(r.items || {}).forEach(([iid, it]) => { if (!it) return; const ti = ((c.items || []).find(y => y.id === iid) || {}).title || '레슨'; const href = `#c/${cid}/${iid}`;
        (Array.isArray(it.subs) ? it.subs : []).slice(-2).forEach((sb, i) => sb && sb.at && out.push({ src: 'log', lk: 'sub', id: `${kid(cid)}.${kid(iid)}.s${i}`, t: `${ti} 과제 제출`, body: ti, cid, at: sb.at, st: '제출함', href }));
        if (it.done && (it.at || it.doneAt)) out.push({ src: 'log', lk: 'done', id: `${kid(cid)}.${kid(iid)}.d`, t: `${ti} 완료`, body: ti, cid, at: it.at || it.doneAt, st: '', href }); });
      if (r.sub && r.sub.at) out.push({ src: 'log', lk: 'sub', id: `${kid(cid)}.sub`, t: `${c.name} 과제 제출`, body: c.name, cid, at: r.sub.at, st: '제출함', href: `#c/${cid}` }); });
    Object.entries((LR.lp && LR.lp.a2cert) || {}).forEach(([cid, at]) => out.push({ src: 'log', lk: 'cert', id: `${kid(cid)}.cert`, t: `${N.cName(cid) || '과정'} 수료`, body: '', cid, at: String(at || ''), st: '수료', href: `#cert/${cid}`, cert: 1 }));
    ((LR.mine && LR.mine.badges) || []).forEach(b => { const B = (SITE().badges || []).find(x => x.id === b.id); if (B && (b.at || b.date)) out.push({ src: 'log', lk: 'badge', id: `b.${kid(b.id)}`, t: `배지 「${B.name}」`, body: B.name, cid: '', at: b.at || b.date, st: '받음', href: `#badge/${b.id}` }); });
    Object.entries((LR.lp && LR.lp.tut) || {}).forEach(([id, r]) => { const t = (SITE().tuts || []).find(x => x.id === id); if (t && r && r.mission && r.at) out.push({ src: 'log', lk: 'sub', id: `t.${kid(id)}`, t: `미션 제출 · ${t.title}`, body: t.title, cid: '', at: r.at, st: '제출함', href: `#t/${id}` }); });
    /* 평가 · 피드백(추가 지시 2 · S27): 퀴즈 · 시험 점수 / 교수자 과제 피드백(mine.cls) · 성적부(mine.bk) / AI 피드백(aifb) / 진단(lp.diag) — 본인 것만, 남과 비교 없음 */
    const MC = (LR.mine && LR.mine.cls) || {};
    Object.entries(C).forEach(([cid, r]) => { const c = (SITE().classes || []).find(x => x.id === cid); if (!c || !r) return; Object.entries(r.items || {}).forEach(([iid, it]) => { if (!it) return; const I = (c.items || []).find(y => y.id === iid) || {};
      if (it.score != null && it.score !== '' && ['quiz', 'exam'].includes(I.type)) { const T2 = Array.isArray(it.tries) ? it.tries : []; const last = T2[T2.length - 1] || {}; const res = Array.isArray(last.res) ? last.res : null; const nq = Array.isArray(I.qs) ? I.qs.length : 0;
        const wrong = res ? res.filter(x => x && !x.ok).length : nq ? Math.round((100 - (+it.score || 0)) / 100 * nq) : 0; const pass = last.pass != null ? !!last.pass : (+it.score || 0) >= (+I.pass || 60);
        out.push({ src: 'eval', ek: 'score', kind: 'quiz', id: `${kid(cid)}.${kid(iid)}`, t: I.title || '퀴즈', body: I.title || '', cid, lid: iid, at: last.at || it.at || '', sc: +it.score || 0, max: 100, st: pass ? '통과' : '다시 도전', wrong, href: `#c/${cid}/${iid}` }); }
      if (it.aifb) out.push({ src: 'eval', ek: 'aifb', kind: 'ai', id: `${kid(cid)}.${kid(iid)}.ai`, t: `${I.title || '과제'} · AI 피드백`, body: String(it.aifb), fb: String(it.aifb), cid, lid: iid, at: it.at || (last => last && last.at)((it.subs || []).slice(-1)[0]) || '', sc: it.score != null ? +it.score : null, max: 100, st: '', href: `#c/${cid}/${iid}` }); }); });
    Object.entries(MC).forEach(([cid, g]) => { const c = (SITE().classes || []).find(x => x.id === cid); if (!c || !g) return; if (!g.fb && (g.score == null || g.score === '')) return; const sub = ((C[cid] || {}).sub || {});
      out.push({ src: 'eval', ek: g.fb ? 'fb' : 'score', kind: 'cls', id: `${kid(cid)}.cls`, t: `${c.name} 과제`, body: String(g.fb || ''), fb: String(g.fb || ''), cid, lid: '', at: sub.at || '', sc: g.score != null && g.score !== '' ? +g.score : null, max: 100, st: g.st === 'returned' ? '다시 도전' : g.st === 'submitted' ? '채점 중' : g.st === 'graded' ? '통과' : g.st === 'failed' ? '다시 도전' : '', href: `#c/${cid}` }); });
    Object.entries((LR.mine && LR.mine.bk) || {}).forEach(([bid, M]) => { const B = [...(SITE().dbooks || []), ...(SITE().books || [])].find(x => x && x.id === bid); Object.entries(M || {}).forEach(([blk, g]) => { if (!g || (!g.fb && g.score == null)) return;
      out.push({ src: 'eval', ek: g.fb ? 'fb' : 'score', kind: 'bk', bid, id: `${kid(bid)}.${kid(blk)}`, t: `${(B && (B.title || B.name)) || '디지털북'} 서술 채점`, body: String(g.fb || ''), fb: String(g.fb || ''), cid: '', at: g.at || '', sc: g.score != null ? +g.score : null, max: 100, st: '', href: `#bk/${bid}` }); }); });
    Object.entries((LR.lp && LR.lp.diag) || {}).forEach(([did, r]) => { const d = (SITE().diags || SITE().diag || []).find ? (SITE().diags || []).find(x => x.id === did) : null; if (!r) return; const o = d && (d.outs || []).find(x => x.k === r.out);
      out.push({ src: 'eval', ek: 'diag', kind: 'diag', id: `d.${kid(did)}`, t: `${(d && d.name) || '진단'} 결과`, body: (o && (o.l || o.name)) || r.out || '', cid: '', at: r.at || '', sc: r.score != null ? +r.score : null, max: 100, st: (o && (o.l || o.name)) || String(r.out || ''), href: `#dg/${did}` }); });
    const M = N.marks(); out.forEach(x => { if (!x.key) x.key = x.src === 'eval' && (x.ek === 'fb' || x.ek === 'aifb') ? `fb:${x.id}` : `${x.src}:${x.id}`; if (x.src === 'eval' && (x.ek === 'fb' || x.ek === 'aifb') && x.fb && !(M[x.key] || {}).seen) x.st = '새 피드백'; const m = M[x.key] || {}; x.pin = !!(x.pin || m.pin); x.hide = !!m.hide; x.cn = N.cName(x.cid); x.end = ended(x.cid);
      x.sub = [x.src === 'ask' ? x.from : '', x.cn, x.src === 'eval' && x.sc != null ? `점수 ${x.sc} / ${x.max}` : '', x.src === 'cmt' || x.src === 'post' ? x.from : '', x.src === 'note' ? '노트' : ''].filter(Boolean).join(' · ');
      x.act = ['open', ...(x.src !== 'note' && x.src !== 'log' && !(x.src === 'eval' && !x.fb) && !x.end ? ['tonote'] : []), 'pin', 'hide', ...(x.src === 'note' ? ['del'] : [])]; });
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at))); }
  /* 공개 API(계약 추가): LNOTE.feed({ src?: 'note'|'ask'|'cmt'|'post'|'log', q?, hidden? }) → [{ src, id, t, sub, cid, at, st, href, act }] */
  N.feed = (o = {}) => { const q = String(o.q || '').trim().toLowerCase(); return feedAll().filter(x => (!o.src || o.src === 'all' || x.src === o.src) && (o.hidden || !x.hide) && (!q || [x.t, x.body, x.sub, x.where].join(' ').toLowerCase().includes(q))); };
  const dayH = at => { const d = dayOf(at); if (!d) return '날짜 없음'; return d === td() ? '오늘' : d === N.addD(td(), -1) ? '어제' : md2(d); };
  const hm = at => { const d = new Date(at); return isNaN(d) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const mk = (s, q) => { const e = esc(s); if (!q) return e; const i = String(s).toLowerCase().indexOf(q); if (i < 0) return e; return esc(String(s).slice(0, i)) + `<mark>${esc(String(s).slice(i, i + q.length))}</mark>` + esc(String(s).slice(i + q.length)); };
  const excerpt = (s, q) => { const t = plain(s); const i = t.toLowerCase().indexOf(q); if (!q || i < 0) return ''; const a = Math.max(0, i - 40); return `${a ? '…' : ''}${mk(t.slice(a, i + q.length + 40), q)}${i + q.length + 40 < t.length ? '…' : ''}`; };
  const xBadge = x => x.src === 'note' ? srcB(x.ns) : x.src === 'eval' ? (x.ek === 'fb' ? `<span class="ln-src ln-ol" data-s="fb">${ico(KI.fb, 14)}피드백</span>` : x.ek === 'aifb' ? `<span class="ln-src ln-ol" data-s="aifb">${ico(KI.aifb, 14)}AI 피드백</span>` : `<span class="ln-src ln-ol" data-s="eval">${ico(KI.eval, 14)}${x.ek === 'diag' ? '진단' : '평가'}</span>`) : `<span class="ln-src ln-ol" data-s="${x.src}">${ico(KI[x.src], 14)}${KL[x.src]}</span>`;
  const stB = x => x.st === '새 피드백' ? '<em class="ln-new">새 피드백</em>' : x.st === '통과' ? '<em class="ln-pass">통과</em>' : x.st === '다시 도전' || x.st === '채점 중' ? `<em class="ln-wait">${x.st}</em>` : x.st === '새 답변' ? '<em class="ln-new">새 답변</em>' : x.st === '답변 기다리는 중' ? '<em class="ln-wait">답변 기다리는 중</em>' : x.st === '확인 전' ? '<em class="ln-dr st-draft">확인 전</em>' : '';
  function rowHTML(x, q) { const meta = [x.sub, x.src === 'log' && x.st ? x.st : '', x.src === 'ask' || x.src === 'cmt' || x.src === 'post' ? '' : '', dayH(x.at) === '오늘' && hm(x.at) ? hm(x.at) : dayH(x.at)].filter(Boolean).join(' · ');
    const href = x.src === 'ask' && !/^#post/.test(x.href) ? `#notes/q/${x.id}` : x.src === 'eval' && x.ek !== 'diag' ? `#notes/fb/${x.id}` : x.href;
    return `<div class="ln-row${x.hide ? ' hid' : ''}" data-s="${x.src}" data-key="${esc(x.key)}"><a class="ln-rm" href="${esc(href)}"><span class="r1">${xBadge(x)}${stB(x)}${x.end ? endB(x.cid) : ''}${x.hide ? '<em class="ln-hidb">숨김</em>' : ''}${x.pin ? `<span class="pinic">${ico('lnpin', 16)}<span class="sr">고정</span></span>` : ''}</span>
      <b class="t">${mk(x.t || '(내용 없음)', q)}</b>${q && !String(x.t).toLowerCase().includes(q) && excerpt(x.body, q) ? `<span class="ex">${excerpt(x.body, q)}</span>` : ''}<small class="m">${esc(meta)}</small></a>
      <button type="button" class="ln-ib ln-more" data-ln="act" data-key="${esc(x.key)}" aria-label="관리: ${esc(String(x.t).slice(0, 30))}">${ico('more', 20)}</button></div>`; }
  function segHTML() { const F = N.feed(); const cnt = { all: F.length }; ['note', 'ask', 'cmt', 'post', 'eval', 'log'].forEach(k => { cnt[k] = F.filter(x => x.src === k).length; }); const nw = F.some(x => x.st === '새 답변');
    return `<nav class="ln-seg" role="tablist" aria-label="모아보기">${Object.keys(KN).map(k => `<button type="button" role="tab" class="${LN.seg === k ? 'on' : ''}" aria-selected="${LN.seg === k}" data-ln="seg" data-v="${k}">${KN[k]}${cnt[k] ? `<sup>${cnt[k]}</sup>` : ''}${k === 'ask' && nw ? '<i class="ln-dot" aria-label="새 답변"></i>' : ''}${k === 'eval' && F.some(x => x.st === '새 피드백') ? '<i class="ln-dot" aria-label="새 피드백"></i>' : ''}</button>`).join('')}</nav>`; }
  const tabEmpty = { eval: '아직 평가 결과가 없어요. 레슨 끝의 확인 문제를 풀면 여기 모여요.', all: '레슨을 듣고 노트 버튼을 눌러 보세요.', ask: '튜터나 게시판에 남긴 질문이 여기 모여요.', cmt: '게시판에 남긴 댓글이 여기 모여요.', post: '학습노트 게시판에 쓴 글은 「글」에 모여요.', log: '레슨을 하나 끝내면 기록이 시작돼요.' };
  function hidMore(src) { const n = N.feed({ src, hidden: true }).filter(x => x.hide).length; return n ? `<button type="button" class="ln-lk c" data-ln="showhid">${LN.hid ? '숨긴 항목 감추기' : `숨긴 항목 ${n}개 보기`}</button>` : ''; }
  /* 노트 탭이 아닌 구분의 본문 */
  function segBody() { const src = LN.seg; const L = N.feed({ src, hidden: LN.hid });
    if (!L.length) { const nx = (() => { try { const st = typeof myStats === 'function' ? myStats() : null; return st && st.courses.find(y => y.c && y.next); } catch (e) { return null; } })();
      return `<div class="ln-none" role="status"><b>${src === 'all' ? '아직 모인 활동이 없어요' : `아직 ${KL[src]}이 없어요`}</b><p>${tabEmpty[src] || ''}</p>${(src === 'all' || src === 'eval') && nx ? `<a class="ln-b p" href="#c/${esc(nx.c.id)}${nx.next.id ? '/' + esc(nx.next.id) : ''}">${ico('play', 18)}이어 보던 레슨으로</a>` : ''}</div>${hidMore(src)}`; }
    const P = L.filter(x => x.pin), R = L.filter(x => !x.pin);
    const head = src === 'ask' ? (() => { const n = L.filter(x => x.st === '새 답변').length; return n ? `<p class="ln-thead"><i class="ln-dot"></i>새 답변 ${n}개</p>` : ''; })() : (src === 'cmt' || src === 'post') ? `<p class="ln-thead">${tabEmpty.post}</p>` : '';
    if (src === 'eval') return evalBody(L, P, R) + hidMore(src);
    if (src === 'log') return `<div id="lnWeek" class="ln-weekslot" data-ln-tab="log">${(() => { try { return window.LNOTE_AI && typeof LNOTE_AI.weeklyHTML === 'function' ? LNOTE_AI.weeklyHTML() : ''; } catch (e) { return ''; } })()}</div>${P.length ? `<div class="ln-sec"><h3 class="ln-h3">고정한 기록</h3><div class="ln-rows">${P.map(x => rowHTML(x)).join('')}</div></div>` : ''}${tlHTML(R)}${hidMore(src)}`;
    const G = new Map(); R.forEach(x => { const h = dayH(x.at); if (!G.has(h)) G.set(h, []); G.get(h).push(x); });
    return `${head}${P.length ? `<div class="ln-sec"><h3 class="ln-h3 sm">고정한 항목</h3><div class="ln-rows">${P.map(x => rowHTML(x)).join('')}</div></div>` : ''}${[...G.entries()].map(([h, A]) => `<div class="ln-sec"><h3 class="ln-h3 sm">${esc(h)}</h3><div class="ln-rows">${A.map(x => rowHTML(x)).join('')}</div></div>`).join('')}${hidMore(src)}`; }
  /* ── 평가 탭(S27-1): 보조 칩 · 내 점수 추이(내 지난 점수와만 비교 — 평균 · 순위 · 백분위 없음) · 약한 단원 ── */
  const ESUB = { all: '전체', score: '점수', fb: '피드백', diag: '진단' };
  const esubOf = x => x.ek === 'diag' ? 'diag' : (x.ek === 'fb' || x.ek === 'aifb') ? 'fb' : 'score';
  function trendOf(cid) { return N.feed({ src: 'eval', hidden: true }).filter(x => x.cid === cid && x.sc != null && x.ek !== 'diag').sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(-8); }
  const deltaTxt = T => { if (T.length < 2) return T.length ? '첫 점수예요. 다음 평가부터 내 지난 점수와 비교해 보여 드려요.' : ''; const d = T[T.length - 1].sc - T[T.length - 2].sc; return d > 0 ? `지난번보다 ${d}점 올랐어요` : d < 0 ? `지난번보다 ${-d}점 낮아요 · 약한 단원을 복습해 볼까요?` : '지난번과 같은 점수예요'; };
  function barsSVG(T, sm) { const W = sm ? 120 : Math.max(200, T.length * 40), H = sm ? 40 : 110, bw = sm ? 10 : 22, gap = T.length ? (W - T.length * bw) / (T.length + 1) : 0;
    return `<svg class="ln-bars2" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="내 점수 ${T.map(x => x.sc).join(', ')}">${T.map((x, i) => { const h = Math.max(4, Math.round((x.sc / (x.max || 100)) * (H - (sm ? 6 : 30)))); const X = gap + i * (bw + gap); const last = i === T.length - 1;
      return `<rect x="${X.toFixed(1)}" y="${H - (sm ? 0 : 0) - h}" width="${bw}" height="${h}" rx="4" class="${last ? 'on' : ''}"/>${sm ? '' : `<text x="${(X + bw / 2).toFixed(1)}" y="${H - h - 6}" text-anchor="middle">${x.sc}</text>`}`; }).join('')}</svg>`; }
  function trendHTML(L) { const C = [...new Set(L.filter(x => x.cid && x.sc != null).map(x => x.cid))]; if (!C.length) return ''; if (!C.includes(LN.ecid)) LN.ecid = C[0]; const T = trendOf(LN.ecid);
    let wk = null; try { const W = window.LNOTE_AI && typeof LNOTE_AI.weakLessons === 'function' ? LNOTE_AI.weakLessons(LN.ecid) : []; wk = W && W[0]; } catch (e) { wk = null; }
    return `<div class="ln-trend"><div class="th"><b>${esc(N.cName(LN.ecid))} · 내 점수</b>${C.length > 1 ? `<button type="button" class="ln-lk" data-ln="ecid">과정 바꾸기</button>` : ''}</div>${T.length ? barsSVG(T) : ''}<div class="tl">${T.map(x => `<span>${esc(x.t.replace(/ · AI 피드백$/, '').slice(0, 8))}</span>`).join('')}</div><p class="ln-msg">${esc(deltaTxt(T))}</p>
      ${wk ? `<div class="ln-weak"><span><small>틀린 문항이 많은 단원</small><b>${esc(wk.title)} · ${wk.wrong}문항</b></span><a class="ln-b s" href="${esc(String(wk.href).replace(/^#review/, '#notes/review'))}">${ico('lncards', 18)}이 단원 카드로 복습</a></div>` : ''}</div>`; }
  function evalBody(L, P, R) { const cnt = { all: L.length }; ['score', 'fb', 'diag'].forEach(k => { cnt[k] = L.filter(x => esubOf(x) === k).length; }); if (!LN.esub || (LN.esub !== 'all' && !cnt[LN.esub])) LN.esub = 'all';
    const chips = `<div class="ln-chips wrap" role="group" aria-label="평가 거르기">${Object.keys(ESUB).filter(k => k === 'all' || cnt[k]).map(k => `<button type="button" class="ln-tag${LN.esub === k ? ' on' : ''}" data-ln="esub" data-v="${k}" aria-pressed="${LN.esub === k}">${ESUB[k]} <em>${cnt[k]}</em></button>`).join('')}</div>`;
    const F = x => LN.esub === 'all' || esubOf(x) === LN.esub; const G = new Map(); R.filter(F).forEach(x => { const h = dayH(x.at); if (!G.has(h)) G.set(h, []); G.get(h).push(x); });
    return `${chips}${trendHTML(L)}${P.filter(F).length ? `<div class="ln-sec"><h3 class="ln-h3 sm">고정한 항목</h3><div class="ln-rows">${P.filter(F).map(x => rowHTML(x)).join('')}</div></div>` : ''}${[...G.entries()].map(([h, A]) => `<div class="ln-sec"><h3 class="ln-h3 sm">${esc(h)}</h3><div class="ln-rows">${A.map(x => rowHTML(x)).join('')}</div></div>`).join('')}`; }
  /* S27-2 피드백 상세 #notes/fb/<id> */
  const quizNote = x => x.lid ? N.all().find(n => n.src === 'quiz' && n.cid === x.cid && n.lid === x.lid) : null;
  const fbNoteOf = x => N.all().find(n => n.tags.includes('피드백') && x.fb && n.b.replace(/\s+/g, '').includes(String(x.fb).replace(/\s+/g, '').slice(0, 40)));
  function fbHTML(id) { const x = N.feed({ src: 'eval', hidden: true }).find(y => y.id === id); const back = `<a class="ln-ib s" href="#notes?t=eval" data-ln="seg" data-v="eval" aria-label="평가 목록으로">${ico('back', 22)}</a>`;
    const head = `<div class="ln-rvh">${back}<div class="ln-rvc"><h1>평가 · 피드백</h1></div>${x ? `<button type="button" class="ln-ib s ln-more" data-ln="act" data-key="${esc(x.key)}" aria-label="관리">${ico('more', 20)}</button>` : '<span class="ln-ib" aria-hidden="true"></span>'}</div>`;
    if (!x) return `<section class="sec lnz ln-q"><div class="in narrow">${head}<div class="ln-none"><b>평가 결과를 찾지 못했어요</b></div></div></section>`;
    if (x.fb && x.st === '새 피드백') N.mark(x.key, { ...(N.marks()[x.key] || {}), seen: true });
    const T = x.cid ? trendOf(x.cid) : []; const i = T.findIndex(y => y.key === x.key); const prev = i > 0 ? T[i - 1] : null; const qn = quizNote(x); const fn = fbNoteOf(x);
    const score = x.sc != null ? `<div class="ln-hero ln-score"><div class="ln-hr2"><div class="ln-hm"><p class="ln-hl">${esc([x.t, x.at ? `${md2(dayOf(x.at))} ${x.ek === 'score' ? '응시' : '채점'}` : ''].filter(Boolean).join(' · '))}</p><p class="ln-big"><b>${x.sc}</b> / ${x.max}</p>${x.st === '통과' ? '<em class="ln-pass">통과</em>' : x.st === '다시 도전' ? '<em class="ln-wait">다시 도전</em>' : ''}${prev ? `<p class="ln-hs">${x.sc - prev.sc > 0 ? `지난번보다 +${x.sc - prev.sc}점` : x.sc - prev.sc < 0 ? `지난번보다 ${x.sc - prev.sc}점` : '지난번과 같아요'}</p>` : ''}</div>${T.length > 1 ? `<div class="ln-mini-tr">${barsSVG(T, 1)}</div>` : ''}</div></div>` : `<div class="ln-qb r1">${xBadge(x)}${stB(x)}<time>${md2(dayOf(x.at))}</time></div><h2 class="ln-ft">${esc(x.t)}</h2>`;
    const fbc = x.fb ? `<div class="ln-ansc"><p class="ln-ansh">${ico(x.ek === 'aifb' ? 'spark' : 'lnfb', 18)}<b>${x.ek === 'aifb' ? 'AI 피드백' : '담당 강사 피드백'}</b>${x.ek === 'aifb' ? '<span class="ln-src ln-ol" data-s="aifb">AI 피드백</span>' : ''}</p><div class="ln-anst">${esc(x.fb).replace(/\n/g, '<br>')}</div>${x.ek === 'aifb' ? '<p class="ln-msg">AI가 남긴 의견이에요. 점수에는 들어가지 않아요.</p>' : ''}</div>` : '';
    const wrong = x.wrong ? `<a class="ln-orig" href="${qn ? `#notes/review?n=${esc(qn.id)}` : esc(x.href)}">${ico('lncards', 20)}<span><b>${qn ? '이 단원 카드로 복습' : '틀린 문항 다시 풀기'}</b><small>틀린 문항 ${x.wrong}개</small></span>${ico('arrow', 16)}</a>` : '';
    const ask = x.ek !== 'diag' ? `<a class="ln-orig" href="#ai" data-ln="askt" data-key="${esc(x.key)}">${ico('lnask', 20)}<span><b>선생님께 질문하기</b><small>질문은 「질문」 탭에 모여요</small></span>${ico('arrow', 16)}</a>` : '';
    const foot = x.fb ? (fn ? `<a class="ln-b p" href="#notes/${esc(fn.id)}">${ico('lnnote', 18)}고칠 점 노트 보기</a>` : x.end ? '' : `<button type="button" class="ln-b p" data-ln="fbnote" data-key="${esc(x.key)}">${ico('lnpen', 18)}다음에 고칠 점 노트로</button>`) : qn ? `<a class="ln-b p" href="#notes/${esc(qn.id)}">${ico('lnback', 18)}오답노트 보기</a>` : '';
    return `<section class="sec lnz ln-q ln-fbd"><div class="in narrow">${head}${score}${fbc}${wrong}${ask}<div class="ln-qf"><a class="ln-b s" href="${esc(x.href)}">원래 자리로</a>${foot}</div></div></section>`; }

  /* 학습 기록 타임라인(S24 D1 몫): 주 머리 + 요약 한 줄 + 세로 선 · 아이콘 점 */
  const wkOf = at => { const d = new Date(String(at).slice(0, 10) + 'T00:00:00'); if (isNaN(d)) return ''; d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayOf(d); };
  const wkName = w => { const d = new Date(w + 'T00:00:00'); return `${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주`; };
  const LKI = { quiz: 'edit', sub: 'lndoc', done: 'check', cert: 'star', badge: 'award' };
  function tlHTML(L) { const G = new Map(); L.forEach(x => { const w = wkOf(x.at) || '이전'; if (!G.has(w)) G.set(w, []); G.get(w).push(x); });
    return [...G.entries()].map(([w, A]) => { const Q = A.filter(x => x.lk === 'quiz'); const avg = Q.length ? Math.round(Q.reduce((s, x) => s + x.sc, 0) / Q.length) : 0; const done = A.filter(x => x.lk === 'done').length, sub = A.filter(x => x.lk === 'sub').length, cert = A.filter(x => x.lk === 'cert' || x.lk === 'badge').length;
      return `<div class="ln-sec ln-tl"><h3 class="ln-h3">${w === '이전' ? '이전 기록' : wkName(w)}<small>${[done && `레슨 ${done}`, Q.length && `퀴즈 평균 ${avg}점`, sub && `제출 ${sub}`, cert && `배지 · 수료 ${cert}`].filter(Boolean).join(' · ')}</small></h3><ol class="ln-tll">${A.map(x => `<li data-lk="${x.lk || ''}"><span class="ln-tld" aria-hidden="true">${ico(LKI[x.lk] || 'check', 15)}</span><div class="ln-tlx"><b>${esc(x.t)}</b><small>${esc([x.cn, x.st, dayH(x.at) + (hm(x.at) ? ' ' + hm(x.at) : '')].filter(Boolean).join(' · '))}</small>${x.end ? endB(x.cid) : ''}${x.cert ? `<a class="ln-lk" href="#notes" data-ln="seg" data-v="note">이 과정 노트 보기</a>` : ''}</div><a class="ln-lk" href="${esc(x.href)}">${x.lk === 'cert' ? '수료증 ›' : x.lk === 'badge' ? '배지 ›' : '레슨으로 ›'}</a><button type="button" class="ln-ib ln-more" data-ln="act" data-key="${esc(x.key)}" aria-label="관리">${ico('more', 20)}</button></li>`).join('')}</ol></div>`; }).join(''); }
  /* 노트 탭에서 검색하면 다른 활동도(통합) */
  function alsoHTML() { const q = LN.q.trim().toLowerCase(); if (!q) return ''; const L = N.feed({ q }).filter(x => x.src !== 'note'); if (!L.length) return '';
    return `<div class="ln-sec"><h3 class="ln-h3">다른 활동에서도 찾았어요<small>${L.length}개</small></h3><div class="ln-rows">${L.slice(0, 5).map(x => rowHTML(x, q)).join('')}</div><a class="ln-lk c" href="#notes/search?q=${encodeURIComponent(LN.q.trim())}">통합 검색에서 모두 보기 ›</a></div>`; }
  /* 관리 시트(⋯): 원래 자리로 · 노트로 옮기기 · 고정 · 숨기기 · 삭제(노트) */
  function actHTML(x) { const it = (k, ic, lab, extra = '') => `<button type="button" class="ln-ai" data-ln="${k}" data-key="${esc(x.key)}"${extra}>${ico(ic, 20)}<span>${lab}</span></button>`;
    return `<div id="lnAct" class="ln-ov sheet ln-actov"><a class="ln-dim" href="javascript:void 0" data-ln="actx" aria-hidden="true" tabindex="-1"></a><div class="ln-sheet ln-act" role="dialog" aria-modal="true" aria-labelledby="lnActT"><span class="ln-grab" aria-hidden="true"></span><header class="ln-sh"><h2 id="lnActT">${esc(String(x.t).slice(0, 40))}</h2><button type="button" class="ln-ib" data-ln="actx" aria-label="닫기">${ico('x', 20)}</button></header><div class="ln-sb">
      <a class="ln-ai" href="${esc(x.href)}" data-ln="actgo">${ico('arrow', 20)}<span>원래 자리로</span></a>${x.act.includes('tonote') ? it('tonote2', 'lnpen', '노트로 옮기기') : ''}${it('mkpin', 'lnpin', x.pin ? '고정 풀기' : '맨 위에 고정')}${it('mkhide', 'x', x.hide ? '다시 보이기' : '숨기기')}${x.act.includes('del') && !x.end ? it('actdel', 'lntrash', '노트 지우기', ' data-danger="1"') : ''}</div></div></div>`; }
  /* 노트로 옮기기 = 내 노트 초안(src 'me', 확인 전) → S04 초안 모드. lnote-ai.js가 LNOTE.toNote를 감싸 튜터 정리를 붙일 수 있다 */
  N.toNote = N.toNote || function (x) { const where = [x.cn, x.where].filter(Boolean).join(' › ') || x.from || '';
    const b = x.src === 'ask' ? `**질문** ${noName(x.q || x.t)}${x.ans ? `\n**답** ${noName(x.ans)}` : ''}${where ? `\n원래 자리: ${where}` : ''}` : `${noName(x.body)}${where ? `\n원래 자리: ${where}` : ''}`;
    return N.save({ t: noName(x.t).slice(0, 80) || KL[x.src], b: b.slice(0, N.LIM.b), cid: x.cid && N.cName(x.cid) ? x.cid : '', lid: '', tags: [KL[x.src] === '학습 기록' ? '기록' : KL[x.src]], src: 'me', st: 'draft' }); };
  const movedNote = x => N.all().find(n => n.b.includes(`**질문** ${noName(x.q || x.t)}`));
  /* S23 질문 상세 #notes/q/<id> */
  function qHTML(id) { const x = N.feed({ src: 'ask', hidden: true }).find(y => y.id === id); const back = `<a class="ln-ib s" href="#notes" data-ln="seg" data-v="ask" aria-label="내 질문 목록으로">${ico('back', 22)}</a>`;
    if (!x) return `<section class="sec lnz ln-q"><div class="in narrow"><div class="ln-rvh">${back}<div class="ln-rvc"><h1>내 질문</h1></div><span class="ln-ib" aria-hidden="true"></span></div><div class="ln-none"><b>질문을 찾지 못했어요</b><p>지워졌거나 다른 기기에서 정리한 질문이에요.</p></div></div></section>`;
    if (x.st === '새 답변') markSeen(x.id); const mv = (() => { try { if (window.LNOTE_AI && typeof LNOTE_AI.qaNote === 'function' && x.from === 'AI 튜터') { const r = LNOTE_AI.qaNote(x.id); if (r) return r; } } catch (e) { } return movedNote(x); })(); const L = String(x.ans || '').split('\n').length > 6 || String(x.ans || '').length > 240;
    return `<section class="sec lnz ln-q"><div class="in narrow"><div class="ln-rvh">${back}<div class="ln-rvc"><h1>내 질문</h1></div><button type="button" class="ln-ib s ln-more" data-ln="act" data-key="${esc(x.key)}" aria-label="관리">${ico('more', 20)}</button></div>
      <div class="r1 ln-qb">${xBadge(x)}<span class="ln-from">${esc(x.from)}</span>${stB(x)}${x.end ? endB(x.cid) : ''}<time>${md2(dayOf(x.at))}</time></div>
      <div class="ln-bub">${esc(x.q || x.t).replace(/\n/g, '<br>')}</div><p class="ln-bubm">${esc([x.cn, x.where].filter(Boolean).join(' › ') || x.from)}에서 물었어요</p>
      ${x.ans ? `<div class="ln-ansc${L ? ' fold' : ''}" id="lnAns"><p class="ln-ansh">${ico(x.from === 'AI 튜터' ? 'spark' : 'user', 18)}<b>${esc(x.ansBy || (x.from === 'AI 튜터' ? 'AI 튜터' : '답변'))}</b>${x.ansBy === '강사 답변' ? '<em class="ln-tch">강사 답변</em>' : ''}</p><div class="ln-anst">${esc(noName(x.ans)).replace(/\n/g, '<br>')}</div>${L ? '<button type="button" class="ln-lk" data-ln="ansmore">답 펼쳐 보기</button>' : ''}</div>`
        : '<div class="ln-ansc none"><p>아직 답이 없어요. 답이 오면 「새 답변」으로 알려 드려요.</p></div>'}
      <a class="ln-orig" href="${esc(x.href)}">${ico(x.from === 'AI 튜터' ? 'spark' : 'lndoc', 20)}<span><b>원래 자리로</b><small>${x.from === 'AI 튜터' ? '그 레슨의 튜터 대화' : '게시글'}</small></span>${ico('arrow', 16)}</a>
      <div class="ln-qf"><a class="ln-b s" href="${esc(x.href)}">원래 자리로</a>${mv ? `<a class="ln-b p" href="#notes/${esc(mv.id)}">${ico('lnnote', 18)}옮긴 노트 보기</a>` : x.end ? '' : `<button type="button" class="ln-b p" data-ln="tonote2" data-key="${esc(x.key)}">${ico('lnpen', 18)}노트로 옮기기</button>`}</div></div></section>`; }
  /* S26 통합 검색 #notes/search?q= */
  const RS = 'didisam.lnote.recent'; const recent = () => { try { return JSON.parse(sessionStorage.getItem(RS) || '[]').slice(0, 5); } catch (e) { return []; } };
  const addRecent = q => { try { const L = [q, ...recent().filter(x => x !== q)].slice(0, 5); sessionStorage.setItem(RS, JSON.stringify(L)); } catch (e) { } };
  const sq = () => { const m = /[?&]q=([^&]*)/.exec(location.hash); try { return m ? decodeURIComponent(m[1]) : ''; } catch (e) { return ''; } };
  const SS = { src: 'all' };
  function srchBody(q0) { const q = q0.trim().toLowerCase(); if (!q) { const R = recent(); return R.length ? `<div class="ln-sec"><h3 class="ln-h3 sm">최근 검색어<button type="button" class="ln-lk" data-ln="rsclr">지우기</button></h3><div class="ln-chips wrap">${R.map(r => `<button type="button" class="ln-tag" data-ln="rs" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>` : '<p class="ln-msg">노트 · 카드 · 질문 · 댓글 · 학습 기록을 한 번에 찾아요.</p>'; }
    const F = N.feed({ q }); const cnt = { all: F.length }; ['note', 'ask', 'cmt', 'post', 'eval', 'log'].forEach(k => { cnt[k] = F.filter(x => x.src === k).length; });
    const chips = `<div class="ln-chips wrap" role="group" aria-label="출처로 거르기">${['all', 'note', 'ask', 'cmt', 'post', 'eval', 'log'].map(k => `<button type="button" class="ln-tag${SS.src === k ? ' on' : ''}${cnt[k] ? '' : ' off'}" data-ln="ssrc" data-v="${k}" aria-pressed="${SS.src === k}"${cnt[k] ? '' : ' disabled'}>${KN[k]} <em>${cnt[k]}</em></button>`).join('')}</div>`;
    if (!F.length) return `${chips}<div class="ln-none" role="status"><b>‘${esc(q0.trim())}’로 찾은 게 없어요</b><p>다른 낱말로 찾아보거나 새 노트로 남겨 보세요.</p><div class="ln-btns c"><button type="button" class="ln-b p" data-ln="newq">이 내용으로 새 노트 쓰기</button>${appOn() ? '<a class="ln-b s" href="#ai">튜터에게 물어보기</a>' : ''}</div></div>`;
    const S = SS.src === 'all' ? ['note', 'ask', 'cmt', 'post', 'eval', 'log'] : [SS.src];
    return `${chips}${S.filter(k => cnt[k]).map(k => { const L = F.filter(x => x.src === k); const all = SS.src !== 'all'; return `<div class="ln-sec"><h3 class="ln-h3">${KL[k]}<small>${L.length}</small>${!all && L.length > 3 ? '' : L.length > 3 ? `<button type="button" class="ln-lk" data-ln="ssrc" data-v="${k}">모두 보기 ›</button>` : ''}</h3><div class="ln-rows">${(all ? L : L.slice(0, 3)).map(x => rowHTML(x, q)).join('')}</div></div>`; }).join('')}`; }
  function srchHTML() { const q = sq(); return `<section class="sec lnz ln-srch"><div class="in narrow"><div class="ln-sbar"><a class="ln-ib s" href="#notes" aria-label="내 노트로">${ico('back', 22)}</a><label class="ln-sfield">${ico('search', 18)}<span class="sr">노트 · 질문 · 댓글 · 기록 찾기</span><input id="lnSq" type="search" value="${esc(q)}" maxlength="40" autocomplete="off" placeholder="노트 · 질문 · 댓글 · 기록 찾기"><button type="button" class="ln-ib" data-ln="sqx" aria-label="검색어 지우기"${q ? '' : ' hidden'}>${ico('x', 18)}</button></label></div><div id="lnSr">${srchBody(q)}</div></div></section>`; }

  /* ── 노트 카드(수석 시안 .ln-card: spine · r1 출처 · 제목 · 미리보기 2줄 · r4 태그 · 카드 수) ── */
  function cardHTML(n, cls) { const kc = cardsOf(n.id).length; const pin = cls === 'pin';
    const r4 = pin ? `<span class="meta">${kc ? `${ico('lncards', 15)}카드 ${kc} · ` : ''}${md2(dayOf(n.up || n.at))}</span>` : (n.tags.length || kc ? `<span class="r4">${n.tags.slice(0, 3).map(t => `<i class="ln-tag sm">#${esc(t)}</i>`).join('')}${kc ? `<em>${ico('lncards', 15)}카드 ${kc}</em>` : ''}</span>` : '');
    return `<a class="ln-card${n.st === 'draft' ? ' draft' : ''}${cls && !pin ? ' ' + cls : ''}" href="#notes/${esc(n.id)}" data-s="${esc(n.src)}"><span class="sp" aria-hidden="true"></span><span class="r1">${srcB(n.src)}${n.st === 'draft' ? '<em class="ln-dr st-draft">확인 전</em>' : ''}${endB(n.cid)}${n.pin ? `<span class="pinic" title="고정">${ico('lnpin', 16)}<span class="sr">고정</span></span>` : ''}${pin ? '' : `<time>${md2(dayOf(n.up || n.at))}</time>`}</span>
      <b class="t">${esc(n.t || '제목 없음')}</b>${!pin && n.b ? `<p>${esc(plain(n.b).slice(0, 200))}</p>` : ''}${r4}</a>`; }
  function match(n) { if (LN.cid && n.cid !== LN.cid) return false; if (LN.tag === '__pin') { if (!n.pin) return false; } else if (LN.tag === '__draft') { if (n.st !== 'draft') return false; } else if (LN.tag === '__quiz') { if (n.src !== 'quiz') return false; } else if (LN.tag && !n.tags.includes(LN.tag)) return false; const q = LN.q.trim().toLowerCase(); if (!q) return true; return [n.t, n.b, n.tags.join(' '), N.cName(n.cid), ...cardsOf(n.id).map(c => c.f + ' ' + c.k)].join(' ').toLowerCase().includes(q); }
  function listHTML() { const A = N.all(); if (!A.length) return emptyHTML(); const F = A.filter(match); const on = LN.q.trim() || LN.tag || LN.cid;
    if (!F.length) return `<div class="ln-none" role="status"><b>찾는 노트가 없어요</b><p>${LN.q.trim() ? `「${esc(LN.q.trim())}」에 맞는 노트가 없어요.` : '이 조건에 맞는 노트가 없어요.'} 다른 낱말로 찾거나 조건을 지워 보세요.</p><div class="ln-btns c">${LN.q.trim() ? '<button type="button" class="ln-b p" data-ln="new">이 내용으로 새 노트 쓰기</button>' : ''}<button type="button" class="ln-b s" data-ln="clear">조건 지우기</button></div></div>`;
    const P = on ? [] : F.filter(n => n.pin); const rest = on ? F : F.filter(n => !n.pin);
    const G = new Map(); rest.forEach(n => { const k = N.cName(n.cid) ? n.cid : ''; if (!G.has(k)) G.set(k, []); G.get(k).push(n); });
    const order = [...G.keys()].sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1));
    return `${on ? `<p class="ln-cnt" role="status">${F.length}개 찾았어요</p>` : ''}${P.length ? `<div class="ln-sec"><h3 class="ln-h3">고정한 노트<small>${P.length}개</small></h3><div class="pins">${P.map(n => cardHTML(n, 'pin')).join('')}</div></div>` : ''}
      ${order.map(k => `<div class="ln-sec"><div class="grp"><h3 class="gh">${k ? esc(N.cName(k)) : '과정 밖 노트'}<small>${G.get(k).length}개</small></h3>${G.get(k).map(n => cardHTML(n)).join('')}</div></div>`).join('')}`; }
  function emptyHTML() { let nx = null; try { const st = typeof myStats === 'function' ? myStats() : null; nx = st && st.courses.find(y => y.c && y.next); } catch (e) { nx = null; }
    return `<div class="ln-empty"><div class="ph" style="background-image:url('img/stock/doc-01-800.webp')"><p class="ln-eyb">${ico('lnnote', 15)}셀프러닝 노트</p><h2>아직 노트가 없어요</h2><p>레슨을 듣고 「노트」 버튼을 눌러 보세요. 기억할 한 줄이면 충분해요.</p></div></div>
    <div class="ln-ea"><button type="button" class="ln-b p blk" data-ln="new">${ico('lnpen', 18)}첫 노트 쓰기</button>${nx ? `<a class="ln-lk c" href="#c/${esc(nx.c.id)}${nx.next.id ? '/' + esc(nx.next.id) : ''}">${ico('play', 18)}레슨 듣고 노트 남기기</a>` : ''}${appOn() ? `<a class="ln-lk c" href="#ai">${ico('spark', 18)}튜터에게 요약 부탁하기</a>` : ''}</div>`; }
  function chipsHTML() { const A = N.all(); if (!A.length) return ''; const cnt = {}; A.forEach(n => n.tags.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; })); const T = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 10); const dr = A.filter(n => n.st === 'draft').length, qz = A.filter(n => n.src === 'quiz').length;
    if (LN.tag && !LN.tag.startsWith('__') && !T.includes(LN.tag)) T.unshift(LN.tag);
    const chip = (v, lab, n) => `<button type="button" class="ln-tag${LN.tag === v && !(v === '' && LN.cid) ? ' on' : ''}" data-ln="tag" data-v="${esc(v)}" aria-pressed="${LN.tag === v}">${lab}${n != null ? ` <em>${n}</em>` : ''}</button>`;
    return `<div class="ln-chips" role="group" aria-label="노트 거르기">${LN.cid ? `<button type="button" class="ln-tag on" data-ln="cid" data-v="" aria-label="과정 조건 지우기">${esc(N.cName(LN.cid))} ✕</button>` : ''}${chip('', '전체', A.length)}${dr ? chip('__draft', '초안', dr) : ''}${qz ? chip('__quiz', '오답', qz) : ''}${T.map(t => chip(t, `#${esc(t)}`, null)).join('')}</div>`; }
  function heroHTML() { const A = N.all(), K = N.cards(), D = N.due(), s = streak(); const tm = N.due(N.addD(td(), 1)).length - D.length; const g = N.goal(); const dq = D.filter(c => c.src === 'quiz').length;
    const learned = K.length ? Math.round(K.filter(c => c.iv >= 3).length / K.length * 100) : 0; const R = 30, L = 2 * Math.PI * R;
    const dd = g ? Math.round((new Date(g.date) - new Date(td())) / 864e5) : null;
    const k3 = g && dd >= 0 ? [dd === 0 ? 'D-DAY' : `D-${dd}`, esc(g.exam)] : [s ? `${s}일` : '', '연속 학습', '오늘 시작해요'];
    const kpi = (v, l, z) => `<div class="ln-kpi">${v ? `<b>${v}</b>` : `<b class="z">${esc(z || '아직 없어요')}</b>`}<span>${l}</span></div>`;
    return `<div class="ln-hero"><div class="ln-hr1"><span class="ln-eb"><i aria-hidden="true"></i>${s ? `${s}일째 이어 가는 중` : '오늘 첫 기록을 남겨 보세요'}</span><span class="ln-streak" role="img" aria-label="최근 7일 중 ${week().filter(w => w.on).length}일 학습">${week().map(w => `<i class="${w.t ? 't' : w.on ? 'd' : ''}"></i>`).join('')}</span></div>
      <div class="ln-hr2"><div class="ln-hm">${D.length ? `<p class="ln-hl">오늘 복습할 카드</p><p class="ln-big"><b>${D.length}</b>장</p><p class="ln-hs">약 ${Math.max(1, Math.ceil(D.length / 2))}분이면 끝나요${dq ? ` · 오답 카드 ${dq}장 포함` : ''}</p>` : K.length ? `<p class="ln-hl">오늘의 복습</p><h2 class="ln-h2s">오늘 복습은 끝났어요</h2><p class="ln-hs">${tm > 0 ? `내일 ${tm}장이 기다려요` : '새 노트를 남기면 내일 복습 카드가 생겨요'}</p>` : `<p class="ln-hl">셀프러닝 노트</p><h2 class="ln-h2s">배운 것을 내 말로 남겨 볼까요?</h2><p class="ln-hs">노트에서 복습 카드를 만들면 매일 여기서 꺼내 봐요</p>`}</div>
        ${K.length ? `<div class="ln-ring" role="img" aria-label="익힌 카드 ${learned}%"><svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="${R}" fill="none" stroke-width="6" class="bg"/><circle cx="38" cy="38" r="${R}" fill="none" stroke-width="6" class="fg" stroke-dasharray="${(L * learned / 100).toFixed(1)} ${L.toFixed(1)}" stroke-linecap="round"/></svg><div><b>${learned}%</b><span>익힘</span></div></div>` : ''}</div>
      ${D.length ? `<a class="ln-b w" href="#notes/review">${ico('play', 18)}오늘 복습 시작</a>` : `<button type="button" class="ln-b w" data-ln="new">${ico('lnpen', 18)}새 노트 쓰기</button>`}
      <div class="ln-kpis">${kpi(A.length, '내 노트')}${kpi(K.length, '복습 카드')}${kpi(k3[0], k3[1], k3[2])}</div></div>`; }
  function draftsHTML() { const D = N.all().filter(n => n.st === 'draft'); if (!D.length) return ''; const by = {}; D.forEach(n => { by[n.src] = (by[n.src] || 0) + 1; });
    return `<div class="ln-drafts"><span class="ln-dic">${ico('spark', 22)}</span><span class="tx"><b>확인할 초안 ${D.length}개</b><span>${Object.entries(by).map(([k, v]) => `${({ tutor: '튜터 요약', quiz: '오답', yt: '영상', file: '내 자료', exam: '시험 계획', me: '내 노트' })[k]} ${v}`).join(' · ')}</span></span><button type="button" data-ln="tag" data-v="__draft">확인하기</button></div>`; }
  /* 웹 왼쪽 레일(시안 A1 §6): 거르기(모든 노트 · 고정 · 확인할 초안 · 오답) · 과정 · 자주 쓴 태그 — 0인 항목은 숨김 */
  const DOT = ['#00A832', '#E0A800', '#2849A8', '#FF6B2C', '#0F766E', '#736B5F'];
  function railHTML() { const A = N.all(); const ri = (v, ic, lab, n, cls) => n ? `<button type="button" class="ri${LN.tag === v && !LN.cid ? ' on' : ''}" data-ln="tag" data-v="${v}" aria-pressed="${LN.tag === v && !LN.cid}">${ic}<span>${lab}</span><em class="${cls || ''}">${n}</em></button>` : '';
    const cnt = {}; A.forEach(n => n.tags.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; })); const T = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 8);
    const C = []; A.forEach(n => { if (n.cid && N.cName(n.cid) && !C.includes(n.cid)) C.push(n.cid); });
    return `<aside class="ln-rail" aria-label="노트 거르기"><h1>내 노트</h1><p class="ln-rs">나만 보는 공부 기록이에요</p><button type="button" class="ln-b p blk" data-ln="new">${ico('plus', 20)}새 노트</button>
      ${A.length ? `<nav class="ln-ris">${ri('', ico('lnnote', 20), '모든 노트', A.length)}${ri('__pin', ico('lnpin', 20), '고정', A.filter(n => n.pin).length)}${ri('__draft', ico('spark', 20), '확인할 초안', A.filter(n => n.st === 'draft').length, 'co')}${ri('__quiz', ico('lnback', 20), '오답', A.filter(n => n.src === 'quiz').length)}</nav>
      ${C.length ? `<h2>과정</h2><nav class="ln-ris">${C.map((c, i) => `<button type="button" class="ri${LN.cid === c ? ' on' : ''}" data-ln="cid" data-v="${esc(c)}" aria-pressed="${LN.cid === c}"><i class="dot" style="background:${DOT[i % DOT.length]}"></i><span>${esc(N.cName(c))}</span><em>${A.filter(n => n.cid === c).length}</em></button>`).join('')}</nav>` : ''}
      ${T.length ? `<h2>자주 쓴 태그</h2><div class="ln-rtags">${T.map(t => `<button type="button" class="ln-tag${LN.tag === t ? ' on' : ''}" data-ln="tag" data-v="${esc(t)}" aria-pressed="${LN.tag === t}">#${esc(t)}</button>`).join('')}</div>` : ''}` : ''}
      <p class="ln-foot">${ico('lock', 15)}노트는 나만 봐요. 기관에는 개수만 보여요.</p></aside>`; }
  function nextRow() { let x = null; try { const st = typeof myStats === 'function' ? myStats() : null; x = st && st.courses.find(y => y.c && y.next); } catch (e) { x = null; } if (!x) return '';
    return `<h3 class="ln-h3">방금 본 차시에 남겨 볼까요</h3><div class="ln-box"><div class="ln-nx"><span class="ln-th" style="background-image:url('${esc(typeof lPhoto === 'function' ? lPhoto(x.c.name, x.c.id, true) : '')}')"></span><a class="tx" href="#c/${esc(x.c.id)}${x.next.id ? '/' + esc(x.next.id) : ''}"><b>${esc(x.next.title)}</b><small>${esc(x.c.name)}${x.p ? ` · 진도 ${x.p}%` : ''}</small></a><button type="button" class="ln-tag" data-ln="newat" data-c="${esc(x.c.id)}" data-i="${esc(x.next.id || '')}">${ico('lnpen', 16)}노트</button></div></div>`; }
  function flowBox() { return `<div class="ln-box"><b class="ln-bt">노트가 쌓이면 이렇게 돼요</b><div class="ln-nodes"><span class="ln-node t">노트 쓰기</span><i aria-hidden="true">→</i><span class="ln-node g">복습 카드</span><i aria-hidden="true">→</i><span class="ln-node">잊을 때쯤 복습</span></div><p class="ln-msg">복습 카드는 첫 노트를 쓰면 생겨요. 퀴즈를 틀리면 오답 노트도 저절로 모여요.</p></div>`; }
  const listBody = () => LN.seg === 'note' ? listHTML() + alsoHTML() : segBody();
  function hubHTML() { { const m = /[?&]t=(all|note|ask|cmt|post|eval|log)\b/.exec(location.hash); if (m) LN.seg = m[1]; if (/[?&]f=draft\b/.test(location.hash)) { LN.seg = 'note'; LN.tag = '__draft'; } } seed(); const A = N.all(); const W = !appOn(); const any = N.feed({ hidden: true }).length;
    const head = W ? '' : `<div class="ln-top"><div class="ln-tt"><h1>내 노트</h1>${A.length ? '' : '<p>나만 보는 공부 기록이에요</p>'}</div>${A.length ? `<button type="button" class="ln-ib s" data-ln="srch" aria-label="노트 찾기">${ico('search', 22)}</button>` : ''}<button type="button" class="ln-ib p" data-ln="new" aria-label="새 노트 쓰기">${ico('plus', 24)}</button></div>`;
    const main = `${head}${A.length ? heroHTML() : ''}${any ? `<div id="lnSeg">${segHTML()}</div>` : ''}${A.length ? `<div id="lnDr"${['note', 'all'].includes(LN.seg) ? '' : ' hidden'}>${draftsHTML()}</div>` : ''}
      ${any ? `<div class="ln-bar${LN.seg === 'note' ? '' : ' hide'}"><label class="ln-q">${ico('search', 18)}<span class="sr">노트 · 질문 · 댓글 · 학습 기록 찾기</span><input id="lnQ" type="search" placeholder="노트 · 질문 · 댓글 · 기록 찾기" value="${esc(LN.q)}" maxlength="40" autocomplete="off"></label></div><div id="lnChips">${LN.seg === 'note' ? chipsHTML() : ''}</div>` : ''}
      <div id="lnList">${listBody()}</div>${A.length ? '' : `${nextRow()}${flowBox()}`}
      ${W ? '' : `<p class="ln-foot">${ico('lock', 15)}노트는 나만 봐요. 기관에는 개수만 보여요. 이름 · 연락처 · 학번은 노트와 내보내기에 들어가지 않아요.</p>`}`;
    return `<section class="sec lnz ln-hub${W ? ' ln-web' : ''}"><div class="in"><i data-ln-weekly hidden></i>${W ? `<div class="ln-wrap">${railHTML()}<div class="ln-main">${main}</div></div>` : main}</div></section>`; }
  function paintList() { const L = document.getElementById('lnList'); if (L) L.innerHTML = listBody(); const C = document.getElementById('lnChips'); if (C) C.innerHTML = LN.seg === 'note' ? chipsHTML() : ''; const S = document.getElementById('lnSeg'); if (S) S.innerHTML = segHTML(); const B = document.querySelector('#lm .ln-bar'); if (B) B.classList.toggle('hide', LN.seg !== 'note'); const D = document.getElementById('lnDr'); if (D) D.hidden = !['note', 'all'].includes(LN.seg); const R = document.querySelector('#lm .ln-rail'); if (R) R.outerHTML = railHTML(); }

  /* ── 보기 · 편집(앱 = 하단 시트, 웹 = 오른쪽 패널) ── */
  /* 저장 상태(추가 지시 1-5): 운영 = PUT /progress 결과, 시연 = 이 기기, 오프라인 = 이 기기에 먼저 */
  const SV = { st: '', at: 0 };
  function stText() { if (!SV.at) return ''; if (typeof navigator !== 'undefined' && navigator.onLine === false) return `${ico('lock', 14)}오프라인이라 이 기기에 먼저 두었어요. 연결되면 보내요.`;
    if (SV.st === 'fail') return `<span class="bad">저장하지 못했어요. 이 기기에 임시로 두었어요.</span><button type="button" class="ln-lk" data-ln="retry">다시 시도</button>`; if (SV.st === 'busy') return '저장하는 중…';
    return `${ico('check', 14)}저장됨 · ${Date.now() - SV.at < 60000 ? '방금' : md2(dayOf(new Date(SV.at)))}${LR.mode === 'live' ? '' : ' · 이 기기'}`; }
  const paintSt = () => { const e = document.getElementById('lnSst'); if (e) e.innerHTML = stText(); };
  N.on(k => { if (['add', 'up', 'del', 'card-add', 'card-del', 'card-up'].includes(k)) { SV.at = Date.now(); SV.st = LR.mode === 'live' ? 'busy' : 'ok'; setTimeout(paintSt, 0); } });
  if (typeof window.fetch === 'function' && !window.fetch.__ln) { const of = window.fetch; const wf = function (u, o) { const r = of.apply(this, arguments); try { if (o && String(o.method).toUpperCase() === 'PUT' && /\/api\/pub\/[^/]+\/progress$/.test(String(u))) r.then(x => { SV.st = x.ok ? 'ok' : 'fail'; paintSt(); }, () => { SV.st = 'fail'; paintSt(); }); } catch (e) { } return r; }; wf.__ln = 1; window.fetch = wf; }
  addEventListener('online', paintSt); addEventListener('offline', paintSt);
  function ovHTML(id) { const isNew = id === 'new'; const n = isNew ? null : N.get(id);
    if (!isNew && !n) return shellOv('노트를 찾지 못했어요', '<p class="ln-msg">지워졌거나 다른 기기에서 정리한 노트예요.</p>', '<a class="ln-b p" href="#notes">내 노트로</a>');
    const ro = !isNew && ended(n.cid); /* 수강 기간이 끝난 과정의 노트 = 읽기 전용 */
    if (!ro && (isNew || LN.edit || (n.st === 'draft' && !LN.view))) return editOv(n);
    const C = myCourses(); void C; const cn = N.cName(n.cid), iname = n.lid ? N.iName(n.cid, n.lid) : ''; const K = cardsOf(n.id);
    const meta = `<div class="ln-meta">${srcB(n.src)}${n.st === 'draft' ? '<em class="ln-dr st-draft">확인 전</em>' : ''}${endB(n.cid)}${cn ? `<a class="ln-crs" href="#c/${esc(n.cid)}${n.lid ? '/' + esc(n.lid) : ''}">${ico('book', 15)}${esc(cn)}${iname ? ` › ${esc(iname)}` : ''}</a>` : ''}<time>${md2(dayOf(n.up || n.at))} 고침</time></div>`;
    const dr = n.st === 'draft' ? `<div class="ln-note-dr" role="note">${ico('spark', 18)}<p><b>${n.src === 'quiz' ? '틀린 문제로 만든 초안이에요.' : n.src === 'exam' ? '시험 계획 초안이에요.' : '튜터가 만든 초안이에요.'}</b> 내 말로 고쳐서 저장해 주세요. 확인하기 전에는 「확인 전」으로 보여요.</p></div>` : '';
    const kHTML = `<div class="ln-ks"><h3>${ico('lncards', 18)}이 노트의 복습 카드${K.length ? ` <small>${K.length}장</small>` : ''}${K.length ? `<a class="ln-lk" href="#notes/review?n=${esc(n.id)}">이 카드만 복습 ›</a>` : ''}</h3>${K.length ? `<ul>${K.map(c => `<li><span><b>${esc(c.f)}</b><small>${esc(c.k)}</small><em>${c.due <= td() ? '오늘 복습' : `${md2(c.due)} 복습`}</em></span><button type="button" class="ln-ib" data-ln="kdel" data-v="${esc(c.id)}" aria-label="카드 지우기: ${esc(c.f)}">${ico('lntrash', 18)}</button></li>`).join('')}</ul>` : '<p class="ln-msg">이 노트로 만든 카드가 아직 없어요. 질문 한 줄과 답 한 줄이면 충분해요.</p>'}
      ${LN.cardf ? `<form class="ln-kf" data-ln-f="card" novalidate><label>앞면(질문)<input name="f" maxlength="120" required placeholder="예: 피벗 테이블의 행 영역에는 무엇을 넣나요?"></label><label>뒷면(답)<textarea name="k" rows="2" maxlength="240" placeholder="답을 내 말로 적어요"></textarea></label><p class="ln-err" role="alert"></p><div class="ln-btns"><button type="submit" class="ln-b p">카드 만들기</button><button type="button" class="ln-b s" data-ln="cardf">닫기</button></div></form>` : `<button type="button" class="ln-b s blk" data-ln="cardf">${ico('lncards', 18)}복습 카드 만들기</button>`}</div>`;
    const acts = `<div class="ln-acts"><button type="button" class="ln-b s" data-ln="pin" aria-pressed="${n.pin}">${ico('lnpin', 18)}${n.pin ? '고정 풀기' : '맨 위에 고정'}</button><button type="button" class="ln-b s" data-ln="mdone">${ico('lndl', 18)}.md 내려받기</button>${LN.del === n.id ? `<div class="ln-delc" role="alert"><p>이 노트를 지울까요?${K.length ? ` 이 노트로 만든 카드 ${K.length}장은 어떻게 할까요?` : ''} 5초 안에 되돌릴 수 있어요.</p><div class="ln-btns">${K.length ? `<button type="button" class="ln-b s danger" data-ln="del">노트만 지우기</button><button type="button" class="ln-b s danger" data-ln="delall">카드도 지우기</button>` : '<button type="button" class="ln-b s danger" data-ln="del">지우기</button>'}<button type="button" class="ln-b s" data-ln="delno">그대로 두기</button></div></div>` : `<button type="button" class="ln-b s danger" data-ln="del">${ico('lntrash', 18)}노트 지우기</button>`}</div>`;
    const tags = n.tags.length ? `<div class="ln-c4 ln-lg">${n.tags.map(t => `<i class="ln-tag sm">#${esc(t)}</i>`).join('')}</div>` : '';
    const K1 = K.length; const foot = `${K1 ? `<a class="ln-ib s ln-lg" href="#notes/review?n=${esc(n.id)}" aria-label="이 노트 카드 ${K1}장만 복습">${ico('lncards', 22)}</a>` : ''}${ro ? '<p class="ln-msg ro">수강 기간이 끝난 과정이라 읽기만 할 수 있어요. 내보내기 · 복습은 그대로 돼요.</p>' : `<button type="button" class="ln-b p" data-ln="edit">${ico('lnpen', 18)}${n.st === 'draft' ? '확인 · 고치기' : '고치기'}</button>`}`;
    return shellOv(n.t || '제목 없음', `${meta}<p class="ln-sst" id="lnSst" aria-live="polite">${stText()}</p>${dr}<div class="ln-md">${mdHTML(n.b, n) || '<p class="ln-msg">내용이 없어요.</p>'}</div>${tags}${kHTML}${acts}`, foot); }
  /* 카드 제안(규칙): 「질문? 답」 줄 · 「용어: 설명」 목록 · **굵게** 용어 — 학습자가 고친 뒤 저장할 때만 생긴다. 운영: 튜터 제안은 lnote-ai.js가 LNOTE.suggest를 감싸 붙인다 */
  N.suggest = N.suggest || function (b) { const out = [], seen = new Set(); const add = (f, k) => { f = String(f).trim().slice(0, 120); k = String(k).trim().slice(0, 240); if (!f || !k || seen.has(f) || out.length >= 3) return; seen.add(f); out.push({ f, k }); };
    String(b || '').split('\n').forEach(l => { const x = l.replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').trim(); const m = /^(.{4,118}?\?)\s*(.+)$/.exec(x); if (m) add(m[1], m[2]); });
    String(b || '').split('\n').forEach(l => { const x = l.replace(/^\s*[-*]\s+/, '').trim(); const m = /\*\*([^*]{1,40})\*\*\s*[:：—–-]?\s*(.*)$/.exec(x); if (m && m[2] && !/\?\s*$/.test(m[1])) add(`${m[1].trim()}${/[가-힣]$/.test(m[1].trim()) ? '(이)란?' : '란?'}`, m[2].replace(/\*\*|`/g, '')); });
    String(b || '').split('\n').forEach(l => { const m = /^\s*[-*]\s+([^:：?]{2,40})[:：]\s*(.{2,})$/.exec(l); if (m) add(`${m[1].replace(/\*\*|`/g, '').trim()}란?`, m[2].replace(/\*\*|`/g, '')); });
    return out; };
  const KM = { key: '', on: false, list: [], auto: true };
  function kmInit(n, key) { if (KM.key === key) return; KM.key = key; KM.auto = true; const has = n && cardsOf(n.id).length; KM.on = !has && (!n || n.st === 'draft'); KM.list = KM.on ? N.suggest(n ? n.b : (LN.pre || {}).b || '') : []; }
  function kmHTML() { const full = N.cards().length >= N.LIM.cards; const left = N.LIM.cards - N.cards().length;
    const fc = (c, i) => `<div class="fc" data-i="${i}"><label><span>앞</span><input name="kf${i}" maxlength="120" value="${esc(c.f)}" aria-label="카드 ${i + 1} 앞면(질문)"></label><button type="button" class="ln-ib" data-ln="kmdel" data-v="${i}" aria-label="카드 ${i + 1} 빼기">${ico('lntrash', 18)}</button><label><span>뒤</span><textarea name="kk${i}" rows="1" maxlength="240" aria-label="카드 ${i + 1} 뒷면(답)">${esc(c.k)}</textarea></label></div>`;
    return `<div class="kmk"><div class="kh"><span class="ki">${ico('lncards', 20)}</span><span class="kt"><b>복습 카드로 만들기</b><small>${full ? '카드가 가득 찼어요' : KM.on ? (KM.list.length ? `질문 ${KM.list.length}개를 뽑았어요. 고칠 수 있어요.` : '본문에서 뽑을 질문이 없어요. 직접 추가해 보세요.') : '켜면 본문에서 질문을 뽑아 드려요'}</small></span><button type="button" class="ln-sw" role="switch" aria-checked="${KM.on}" data-ln="kmsw" aria-label="복습 카드로 만들기"${full ? ' disabled' : ''}><i></i></button></div>
      ${KM.on ? `${KM.list.map(fc).join('')}<div class="kf"><button type="button" class="ln-lk" data-ln="kmadd"${KM.list.length >= 3 || left <= KM.list.length ? ' disabled' : ''}>${ico('plus', 18)}카드 직접 추가</button><button type="button" class="ln-lk sub" data-ln="kmre">본문에서 다시 뽑기</button>${window.LNOTE_AI && typeof window.LNOTE_AI.suggestCards === 'function' ? `<button type="button" class="ln-lk sub" data-ln="kmai">${ico('spark', 16)}튜터에게 더 뽑아 달라기</button>` : ''}<small>첫 복습 내일 · ${md2(N.addD(td(), 1))}</small></div>` : ''}</div>
      <p class="ln-msg">${ico('lncards', 14)}${N.cards().length ? `지금 카드 ${N.cards().length}장 · ` : ''}최대 ${N.LIM.cards}장까지 만들 수 있어요</p>`; }
  const kmCount = () => KM.on ? KM.list.filter(c => c.f.trim()).length : 0;
  function kmRead() { const f = document.getElementById('lnF'); if (!f) return; KM.list = KM.list.map((c, i) => ({ f: (f.elements['kf' + i] || {}).value ?? c.f, k: (f.elements['kk' + i] || {}).value ?? c.k })); }
  function kmPaint() { const h = document.getElementById('lnKm'); if (h) h.innerHTML = kmHTML(); const sb = document.getElementById('lnSave'); if (sb) sb.innerHTML = saveLab(); }
  const saveLab = () => { const n = route().b && N.get(decodeURIComponent(route().b)); const k = kmCount(); return `${ico('check', 18)}${n && n.st === 'draft' ? '확인하고 저장' : '저장'}${k ? ` · 카드 ${k}장` : ''}`; };
  function lessonOpts(cid, lid) { const c = cid && (SITE().classes || []).find(x => x.id === cid); const L = c ? (c.items || []).filter(x => x && x.type !== 'chapter') : []; return [`<option value="">레슨 연결 안 함</option>`, ...L.map(x => `<option value="${esc(x.id)}"${x.id === lid ? ' selected' : ''}>${esc(x.title)}</option>`)].join(''); }
  /* 초안 모드 줄 표시: 튜터 문장 .ai(형광 밑줄) · 내가 쓴 줄 .mine(코랄 점 + 「내가 씀」) — LNOTE_AI.diffLines가 없으면 원문 비교 */
  function diffHTML(n, now) { let L; try { const A = window.LNOTE_AI; if (A && typeof A.diffLines === 'function') L = A.diffLines((typeof A.orig === 'function' && A.orig(n.id)) || n.b, now).lines; } catch (e) { L = null; }
    if (!L) { const O = new Set(String(n.b).split('\n').map(x => x.trim()).filter(Boolean)); L = String(now).split('\n').map(t => ({ t, k: t.trim() ? (O.has(t.trim()) ? 'ai' : 'mine') : '' })); }
    const mine = L.filter(x => x.k === 'mine').length; return `<p class="dh">${mine ? `내가 쓴 줄 ${mine}개` : '아직 내가 쓴 줄이 없어요'}</p>${L.filter(x => x.k).map(x => `<p class="${x.k}">${x.k === 'mine' ? '<i aria-hidden="true"></i>' : ''}<span>${esc(x.t.replace(/^\s*[-*]\s*/, ''))}</span>${x.k === 'mine' ? '<em>내가 씀</em>' : ''}</p>`).join('')}`; }
  function editOv(n) { const C = myCourses(); const pre = LN.pre || {}; const cid = n ? n.cid : pre.cid || ''; const lid = n ? n.lid : pre.lid || ''; kmInit(n, n ? n.id : 'new');
    const opts = [`<option value="">과정 밖 노트</option>`, ...C.map(c => `<option value="${esc(c.id)}"${c.id === cid ? ' selected' : ''}>${esc(c.name)}</option>`)]; if (cid && !C.some(c => c.id === cid) && N.cName(cid)) opts.push(`<option value="${esc(cid)}" selected>${esc(N.cName(cid))}</option>`);
    const t0 = n ? n.t : pre.t || '', b0 = n ? n.b : pre.b || '', g0 = n ? n.tags : pre.tags || [];
    const dm = !!(n && n.st === 'draft'); const who = n ? ({ quiz: '틀린 문제로 만든 초안이에요.', exam: '시험 계획 초안이에요.', tutor: '튜터가 만든 초안이에요.', yt: '영상 메모로 만든 초안이에요.', file: '내 자료로 만든 초안이에요.' })[n.src] || '확인 전 초안이에요.' : '';
    const f = `<form id="lnF" class="ln-form${dm ? ' draftmode' : ''}" data-ln-f="note" novalidate>${dm ? `<ol class="ln-steps" aria-label="초안 확인 단계"><li class="done">${ico('check', 14)}읽기</li><li class="now">내 말로 고치기</li><li>저장</li></ol><div class="ln-draftnote" role="note">${ico('spark', 18)}<p><b>${who}</b><br>내 말로 고쳐서 저장해 주세요.</p></div>` : ''}
      <label class="ln-fl"><span class="lh">제목<small><span id="lnTc">${t0.length}</span> / 80</small></span><input name="t" class="ln-lg" maxlength="80" required value="${esc(t0)}" placeholder="예: 피벗 테이블 한 줄 정리"></label>
      <div class="ln-fl"><label class="lh" for="lnB">내용<small><span id="lnCc">${b0.length}</span> / 1,500</small></label><textarea id="lnB" name="b" rows="8" maxlength="1500" placeholder="- 줄 앞에 - 를 쓰면 목록이 돼요&#10;질문? 답 처럼 쓰면 복습 카드로 뽑아 드려요">${esc(b0)}</textarea>
        <div class="ln-tb" role="toolbar" aria-label="글 꾸미기"><button type="button" data-ln="ins" data-v="b" aria-label="굵게"><b>B</b></button><button type="button" data-ln="ins" data-v="li" aria-label="목록">${ico('menu', 18)}</button><button type="button" data-ln="ins" data-v="code" aria-label="코드"><code>&lt;/&gt;</code></button></div>${dm && ['tutor', 'yt'].includes(n.src) ? `<div class="ln-diff" id="lnDiff" aria-label="튜터 문장과 내가 쓴 줄">${diffHTML(n, b0)}</div>` : ''}${dm && n.tags.includes('피드백') ? (() => { let C = []; try { C = window.LNOTE_AI && typeof LNOTE_AI.fbCands === 'function' ? LNOTE_AI.fbCands(n.id) || [] : []; } catch (e) { C = []; } return C.length ? `<div class="ln-cands"><p>${ico('spark', 15)}튜터 후보 — 누르면 「내가 고칠 점」에 넣어요. 내 말로 고쳐 써 주세요.</p><div class="ln-chips wrap">${C.map(c => `<button type="button" class="ln-tag" data-ln="cand" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` : ''; })() : ''}${dm && !n.tags.includes('피드백') && window.LNOTE_AI && typeof LNOTE_AI.hint === 'function' ? `<p class="hint" id="lnHint">${ico('spark', 15)}<span>${esc(LNOTE_AI.hint(n, b0) || '')}</span></p>` : ''}</div>
      <div class="ln-two"><label class="ln-fl">과정<select name="cid">${opts.join('')}</select></label><label class="ln-fl">레슨<select name="lid">${lessonOpts(cid, lid)}</select></label></div>
      <label class="ln-fl"><span class="lh">태그<small><span id="lnGc">${g0.length}</span> / 5</small></span><input name="tags" maxlength="120" value="${esc(g0.join(', '))}" placeholder="쉼표로 나눠요 · 최대 5개 · 각 20자"></label>
      <div id="lnKm">${kmHTML()}</div>
      ${dm && n.src === 'quiz' ? '<label class="ln-fl"><span class="lh">왜 틀렸을까요? 내가 써요<small>1자 이상</small></span><textarea name="why" rows="2" maxlength="300" placeholder="예: 3NF와 BCNF 조건을 헷갈렸어요"></textarea></label>' : ''}
      ${dm ? '<label class="ln-chk"><input type="checkbox" name="ok"><span>내용을 읽고 확인했어요</span></label>' : ''}
      <p class="ln-err" role="alert"></p><p class="ln-msg">${ico('lock', 14)}노트는 나만 봐요. 기관에는 개수만 보여요. 이름 · 연락처 · 학번은 적지 않아도 돼요.</p></form>`;
    const draft = n && n.st === 'draft';
    return shellOv(dm ? '초안 확인하기' : n ? '노트 고치기' : '새 노트', f, `${draft ? '<button type="button" class="ln-b s" data-ln="keepdraft">초안으로 두기</button>' : n ? '<button type="button" class="ln-b s" data-ln="view">취소</button>' : '<a class="ln-b s" href="#notes">취소</a>'}<button type="submit" form="lnF" id="lnSave" class="ln-b p wide">${saveLab()}</button>`); }
  function shellOv(title, body, foot) { const A = appOn();
    return `<div id="lnOv" class="ln-ov ${A ? 'sheet' : 'panel'}"><a class="ln-dim" href="#notes" tabindex="-1" aria-hidden="true"></a><div class="ln-sheet" role="dialog" aria-modal="true" aria-labelledby="lnSt">${A ? '<span class="ln-grab" aria-hidden="true"></span>' : ''}
      <header class="ln-sh"><h2 id="lnSt">${esc(title)}</h2><a class="ln-ib" href="#notes" aria-label="닫기">${ico('x', 20)}</a></header><div class="ln-sb">${body}</div><footer class="ln-sf">${foot}</footer></div></div>`; }
  function paintOv() { document.querySelectorAll('#lnOv').forEach(x => x.remove()); const { a, b } = route(); document.body.classList.remove('ln-ovon'); if (a !== 'notes' || !b || !(b === 'new' || /^n[0-9a-z]{1,24}$/.test(decodeURIComponent(b))) || !okMe()) return; /* #notes/out · #notes/goal 등 다른 파일(lnote-sync.js)의 화면은 건드리지 않는다 */
    document.body.insertAdjacentHTML('beforeend', ovHTML(decodeURIComponent(b))); document.body.classList.add('ln-ovon'); const o = document.getElementById('lnOv'); const f = o.querySelector('input[name=t]') || o.querySelector('.ln-sf .ln-b') || o.querySelector('.ln-ib'); if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { } }, 30); }

  /* ── 오늘 복습(#notes/review) — #review는 ltube.js 「짧게 복습」이 쓰므로 노트 아래 경로. LNOTE.review(노트 id?)로 연다 ── */
  /* #notes/review?n=<노트 id> = 그 노트 카드만(기한과 상관없이) */
  const rvNote = () => { const m = /[?&]n=([\w-]{1,40})/.exec(location.hash); return m && N.get(m[1]) ? m[1] : ''; };
  const rvQ = () => { const m = /[?&]q=([^&]{1,40})/.exec(location.hash); try { return m ? decodeURIComponent(m[1]).trim().toLowerCase() : ''; } catch (e) { return ''; } };
  /* 큐: ?n= 그 노트 카드 전부 · ?q= 검색 일치 카드 · 기본 = 오늘 기한(오답 먼저 켜면 오답 카드부터) */
  function rvInit() { const only = rvNote(), q = rvQ(); let D = only ? N.cards().filter(c => c.nid === only) : q ? N.cards().filter(c => (c.f + ' ' + c.k).toLowerCase().includes(q)) : N.due();
    if (RV && RV.wf) D = [...D.filter(c => c.src === 'quiz'), ...D.filter(c => c.src !== 'quiz')];
    RV = { day: td(), only, q, wf: !!(RV && RV.wf), list: D.map(c => c.id), i: 0, flip: false, n: [0, 0, 0], res: {}, again: [], round: 1, phase: D.length ? 'main' : 'zero', t0: Date.now(), total: D.length }; }
  const rvKey = () => `${td()}|${rvNote()}|${rvQ()}`;
  const fwd7 = () => Array.from({ length: 7 }, (_, i) => { const d = N.addD(td(), i + 1); return { d, n: N.cards().filter(c => c.due === d).length }; });
  function rvHTML() { if (!RV || RV.key !== rvKey()) { rvInit(); RV.key = rvKey(); } const K = N.cards(); const s = streak(); const tm = N.due(N.addD(td(), 1)).length - N.due().length;
    const sub = RV.only ? `${esc((N.get(RV.only) || {}).t || '')} 카드만` : RV.q ? `「${esc(RV.q)}」 카드만` : '';
    const close = `<a class="ln-ib s" href="#notes" aria-label="복습 닫고 내 노트로">${ico('x', 22)}</a>`;
    const head = (rest, mid) => `<div class="ln-rvh">${close}<div class="ln-rvc"><h1>오늘 복습</h1><small class="ln-rvs">${mid || sub || ''}</small></div><span class="ln-ib" aria-hidden="true"></span></div>${rest || ''}`;
    const wrap = h => `<section class="sec lnz ln-rv"><div class="in narrow">${h}</div></section>`;
    if (RV.phase === 'zero') { const nx = K.map(c => c.due).filter(d => d > td()).sort()[0];
      return wrap(`${head()}<div class="ln-empty rv"><div class="ph" style="background-image:url('img/stock/dsk-03-800.webp')"><p class="ln-eyb">${ico('lncards', 15)}오늘은 쉬어 가는 날</p><h2>${K.length ? '오늘 복습할 카드가 없어요' : '아직 복습 카드가 없어요'}</h2><p>${K.length ? (tm > 0 ? `내일 ${tm}장이 기다려요.` : nx ? `다음 복습은 ${md2(nx)}이에요.` : '새 노트로 카드를 만들어 보세요.') : '노트를 쓰면서 「복습 카드로 만들기」를 켜 보세요.'}</p></div></div>
        ${s ? `<div class="ln-box ln-stk"><span class="ln-streak lt">${week().map(w => `<i class="${w.t ? 't' : w.on ? 'd' : ''}"></i>`).join('')}</span><b>${s}일째 이어 가는 중</b></div>` : ''}
        <div class="ln-ea"><a class="ln-b p blk" href="#notes">${ico('lnnote', 18)}내 노트로</a><button type="button" class="ln-lk c" data-ln="new">${ico('lnpen', 18)}오늘 배운 것 한 줄 남기기</button></div>`); }
    if (RV.phase === 'ask') { const A = RV.again.map(id => N.card(id)).filter(Boolean);
      return wrap(`${head()}<div class="ln-again" role="status"><b>${RV.list.length}장 다 봤어요</b><p>「다시」 고른 ${A.length}장만 한 번 더 볼까요?</p><ul>${A.map(c => `<li>${esc(c.f)}</li>`).join('')}</ul></div><div class="ln-ea"><button type="button" class="ln-b p ln-lg" data-ln="again">${A.length}장 한 번 더</button><button type="button" class="ln-lk c" data-ln="rvend">오늘은 여기까지 — 내일 다시 나와요</button></div>`); }
    if (RV.phase === 'done') { const done = RV.n[0] + RV.n[1] + RV.n[2]; const R = 52, L = 2 * Math.PI * R; const min = Math.max(1, Math.round((Date.now() - RV.t0) / 60000)); const F = fwd7(); const mx = Math.max(1, ...F.map(x => x.n));
      return wrap(`${head()}<div class="ln-hero ln-rvdone" role="status"><div class="ln-hr2"><div class="ln-ring ln-xl"><svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" fill="none" stroke-width="10" class="bg"/><circle cx="60" cy="60" r="${R}" fill="none" stroke-width="10" class="fg" stroke-dasharray="${L.toFixed(1)} ${L.toFixed(1)}"/></svg><div><b>${RV.total}</b><span>장 끝</span></div></div>
        <div class="ln-hm"><h2 class="ln-h2s">오늘 복습 끝! ${min}분 만에 마쳤어요</h2><span class="ln-streak" role="img" aria-label="최근 7일 학습">${week().map(w => `<i class="${w.t ? 't' : w.on ? 'd' : ''}"></i>`).join('')}</span><p class="ln-hs">${s ? `${s}일째 이어 가는 중이에요` : '오늘부터 이어 가 봐요'}</p></div></div>
        <div class="ln-kpis"><div class="ln-kpi"><b>${RV.n[2]}</b><span>앎</span></div><div class="ln-kpi"><b>${RV.n[1]}</b><span>알쏭</span></div><div class="ln-kpi"><b>${RV.n[0]}</b><span>다시 · 내일</span></div></div></div>
        <div class="ln-box"><b class="ln-bt">앞으로 7일 복습</b><div class="ln-bars" role="img" aria-label="${F.map(x => `${md2(x.d)} ${x.n}장`).join(', ')}">${F.map((x, i) => `<span><i style="height:${Math.max(4, Math.round(x.n / mx * 64))}px" class="${i === 0 ? 'on' : ''}"></i><small>${i === 0 ? '내일' : `${+x.d.slice(8)}일`}</small></span>`).join('')}</div><p class="ln-msg">${tm > 0 ? `내일 ${tm}장이 기다려요.` : '내일은 쉬어 가도 돼요.'}</p></div>
        <div class="ln-ea"><a class="ln-b p blk" href="#notes">${ico('lnnote', 18)}내 노트로</a><a class="ln-lk c" href="#home">홈으로</a></div>`); }
    const Q = RV.round === 1 ? RV.list : RV.again; const c = N.card(Q[RV.i]); if (!c) { RV.i++; if (RV.i >= Q.length) { RV.phase = RV.round === 1 && RV.again.length ? 'ask' : 'done'; } return rvHTML(); }
    const n = c.nid ? N.get(c.nid) : null; const cn = n ? N.cName(n.cid) : ''; const left = Q.length - RV.i; const lab = q => { if (q === 0) return '오늘 한 번 더'; const x = N.next(c, q); return x.iv <= 1 ? '내일' : `${x.iv}일 뒤`; };
    const seg = Q.map((id, i) => `<i class="${RV.round === 1 && RV.res[id] != null ? 'r' + RV.res[id] : i === RV.i ? 'now' : ''}"></i>`).join('');
    const mins = Math.max(1, Math.ceil(left / 2));
    return wrap(`${head(`<div class="ln-prow"><div class="ln-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${Q.length}" aria-valuenow="${RV.i}" aria-label="복습 진행">${seg}</div><span class="ln-rvn" aria-live="polite">${RV.i + 1} / ${Q.length}</span></div>
      <div class="ln-pills">${s ? `<span class="ln-pill ok">${ico('spark', 16)}${s}일째</span>` : ''}${RV.round === 1 && RV.i === 0 && !RV.only && !RV.q && N.due().some(x => x.src === 'quiz') ? `<button type="button" class="ln-pill${RV.wf ? ' on' : ''}" data-ln="wf" aria-pressed="${RV.wf}">${ico('lnback', 16)}오답 먼저</button>` : ''}${RV.round > 1 ? '<span class="ln-pill co">다시 라운드</span>' : ''}</div>`, sub || `약 ${mins}분 남음`)}
      <div class="ln-stack${left > 1 ? ' s2' : ''}${left > 2 ? ' s3' : ''}"><div class="ln-flip${RV.flip ? ' back' : ''}" data-ln="flip" role="button" tabindex="0" aria-pressed="${RV.flip}" aria-label="${RV.flip ? '답을 보고 있어요. 아래에서 얼마나 기억났는지 골라 주세요' : `질문: ${esc(c.f)}. 눌러서 답 보기`}">
        <span class="top">${srcB(c.src === 'quiz' ? 'quiz' : (n ? n.src : 'me'))}${cn ? `<i class="ln-tag sm">${esc(cn)}</i>` : ''}<span class="n">${c.n ? `${c.n + 1}번째 복습` : '처음 보는 카드'}</span></span>
        ${RV.flip ? `<span class="qs">${esc(c.f)}</span><span class="ans">정답</span><b class="a">${esc(c.k || '(뒷면이 비어 있어요)')}</b>${n ? `<a class="lk" href="#notes/${esc(n.id)}" data-ln="tonote">${ico('lnnote', 18)}<b>노트 보기 · ${esc(n.t.slice(0, 24))}</b><span>›</span></a>` : ''}`
          : `<span class="ln-fq"><small>질문</small><b>${esc(c.f)}</b></span><span class="hint">${ico('lntap', 18)}카드를 눌러도 뒤집혀요</span>`}</div></div>
      <div class="ln-gbar">${RV.flip ? `<p class="ln-gq">얼마나 기억났나요? 솔직하게 골라야 간격이 맞아요</p><div class="ln-grade"><button type="button" class="g0" data-ln="grade" data-v="0"><b>다시</b><span>${lab(0)}</span></button><button type="button" class="g1" data-ln="grade" data-v="1"><b>알쏭</b><span>${lab(1)}</span></button><button type="button" class="g2" data-ln="grade" data-v="2"><b>앎</b><span>${lab(2)}</span></button></div>`
        : `<p class="ln-gq">답을 먼저 떠올려 본 뒤 눌러 보세요</p><button type="button" class="ln-b p ln-lg" data-ln="flip">답 보기</button><div class="ln-btns sp"><button type="button" class="ln-lk sub" data-ln="later">${ico('clock', 18)}나중에</button>${n ? `<a class="ln-lk sub" href="#notes/${esc(n.id)}">이 카드 고치기</a>` : ''}</div>`}${appOn() ? '' : '<p class="ln-msg c">키보드: 스페이스 = 뒤집기 · 1 다시 · 2 알쏭 · 3 앎</p>'}</div>`); }
  function paintRv() { const el = document.querySelector('#lm .ln-rv'); if (!el) return; el.outerHTML = rvHTML(); const f = document.querySelector('#lm .ln-rv .ln-flip') || document.querySelector('#lm .ln-rv .ln-rve a, #lm .ln-rv .ln-rvz a'); /* 채점 버튼에 바로 두면 스페이스 keyup이 그 버튼을 눌러 버린다 */ if (f) try { f.focus({ preventScroll: true }); } catch (e) { } }

  /* ── 레슨 화면 「노트」 버튼 · 미니 패널 ── */
  function lessonCtx() { const parts = decodeURIComponent(location.hash.slice(1)).split('?')[0].split('/'); const cid = parts[1]; const c = (SITE().classes || []).find(x => x.id === cid); if (!c) return null;
    const im = document.querySelector('#lm .imain'); if (!im) return null; let lid = parts[2] || ''; const h2 = im.querySelector(':scope > h2');
    if (!lid) { const d = im.querySelector('[data-item], [data-i]'); lid = d ? (d.dataset.item || d.dataset.i || '') : ''; } if (!lid && h2) { const it = (c.items || []).find(x => x.title === h2.textContent.trim()); lid = it ? it.id : ''; }
    const it = (c.items || []).find(x => x.id === lid); return { c, it, lid: it ? lid : '', im, h2 }; }
  function miniHTML(x) { const L = N.all().filter(n => n.cid === x.c.id && (!x.lid || n.lid === x.lid)).slice(0, 4);
    return `<div class="ln-mini" id="lnMini"><div class="ln-mh"><b>${ico('lnnote', 18)}이 레슨 노트</b><a class="ln-lk" href="#notes">내 노트 모두 보기 ›</a></div>${L.length ? `<div class="ln-mlist">${L.map(n => cardHTML(n, 'compact')).join('')}</div>` : '<p class="ln-msg">아직 이 레슨 노트가 없어요. 기억할 한 줄을 바로 적어 보세요.</p>'}
      ${ended(x.c.id) ? '<p class="ln-msg ro">수강 기간이 끝난 과정이라 노트를 읽기만 할 수 있어요.</p>' : `<form class="ln-mf" data-ln-f="quick" novalidate><label class="sr" for="lnMq">빠른 노트</label><textarea id="lnMq" name="b" rows="3" maxlength="1500" placeholder="${esc(x.it ? `「${x.it.title}」에서 기억할 것` : '기억할 것')}을 적어요"></textarea><p class="ln-err" role="alert"></p><div class="ln-btns"><button type="submit" class="ln-b p">${ico('check', 18)}노트에 저장</button><button type="button" class="ln-b s" data-ln="full">크게 쓰기</button></div></form>`}</div>`; }
  function lessonDeco() { const x = lessonCtx(); if (!x || x.im.querySelector('.ln-lbtn')) return; const n = N.all().filter(y => y.cid === x.c.id && (!x.lid || y.lid === x.lid)).length;
    const b = `<button type="button" class="ln-lbtn" data-ln="mini" aria-expanded="false" aria-controls="lnMini">${ico('lnnote', 18)}노트${n ? ` <b>${n}</b>` : ''}</button>`;
    if (x.h2) { x.h2.classList.add('ln-h2'); x.h2.insertAdjacentHTML('afterend', `<div class="ln-lrow">${b}</div>`); } else x.im.insertAdjacentHTML('afterbegin', `<div class="ln-lrow">${b}</div>`); }

  /* ── 진입점 ── */
  const tile = () => { const D = N.due().length, A = N.all().length; return { s: D ? `오늘 복습 ${D}장 · 노트 ${A}개` : A ? `노트 ${A}개 · 오늘 복습은 끝났어요` : '배운 것을 내 말로 남겨요', D }; };
  function entries() { if (!okMe()) return; const lm = document.getElementById('lm'); if (!lm) return; const a = route().a; const t = tile();
    if (appOn()) { if (a === 'acct' && !route().b && !lm.querySelector('.ls-list a[href="#notes"]')) { const ref = lm.querySelector('.ls-list a[href="#connect"]'); const list = lm.querySelector('.ls-list'); const row = `<a href="#notes" class="ls-row"><span class="ls-ic" style="--c:#00862D">${ico('lnnote', 20)}</span><span class="ls-tx"><b>내 노트 · 복습</b><small>${esc(t.s)}</small></span>${t.D ? `<i class="ls-bd">${t.D}</i>` : ''}<span class="ls-go" aria-hidden="true">›</span></a>`; if (ref) ref.insertAdjacentHTML('beforebegin', row); else if (list) list.insertAdjacentHTML('afterbegin', row); }
      if (a === 'my' && !lm.querySelector('.ln-hc')) { const anc = lm.querySelector('.lq-myw') || lm.querySelector('.ap-my'); if (anc) anc.insertAdjacentHTML('afterend', `<div class="ln-hcw">${hc()}</div>`); } return; }
    if (a === 'my' && !lm.querySelector('.ln-hc')) { const anc = lm.querySelector('.lq-hc') || lm.querySelector('.la-myl') || lm.querySelector('.mypage .in > h1'); const host = lm.querySelector('.mypage .in'); if (anc) anc.insertAdjacentHTML('afterend', hc()); else if (host) host.insertAdjacentHTML('afterbegin', hc()); } }
  const hc = () => { const t = tile(); return `<a class="ln-hc" href="#notes">${ico('lnnote', 22)}<span><b>내 노트 · 오늘 복습</b><small>${esc(t.s)}</small></span>${t.D ? `<em>${t.D}</em>` : ''}${ico('arrow', 16)}</a>`; };
  { const base = shell; shell = (inner, cur, ...a) => { let h = base(inner, cur, ...a); try { if (okMe() && !/href="#notes"/.test(h.split('</header>')[0])) { const on = route().a === 'notes'; const lk = `<a href="#notes" class="${on ? 'on' : ''}"${on ? ' aria-current="page"' : ''}>내 노트</a>`; const i = h.indexOf('<nav class="ln"'); if (i >= 0) { const j = h.indexOf('</nav>', i); if (j > 0) h = h.slice(0, j) + lk + h.slice(j); } } } catch (e) { console.error('lnote shell', e); } return h; }; }

  /* ── 라우팅 ── */
  { const base = viewPage; viewPage = (id, ...a) => {
    if (id === 'notes') { if (!LR.me) return needLogin(id); if (off()) return '<section class="sec lnz"><div class="in narrow"><div class="ln-none"><b>이 기관은 노트 기능을 쓰지 않아요</b><p>레슨 화면에서 학습을 이어 가 주세요.</p><a class="ln-b p" href="#home">홈으로</a></div></div></section>'; if (isPar()) return '<section class="sec lnz"><div class="in narrow"><p class="ln-msg">노트는 학습자 계정에서 써요. 보호자 계정에서는 자녀의 노트를 볼 수 없어요.</p></div></section>';
      try { if (isRv()) { seed(); return rvHTML(); } const b = route().b; if (b === 'fb') return fbHTML(decodeURIComponent(location.hash.split('?')[0].split('/')[2] || '')); if (b === 'q') return qHTML(decodeURIComponent(location.hash.split('?')[0].split('/')[2] || '')); if (b === 'search') return srchHTML(); return hubHTML(); } catch (e) { console.error('lnote', e); return '<section class="sec"><div class="in"><p class="empty">노트를 그리지 못했어요. 새로 고침해 주세요.</p></div></section>'; } }
    return base(id, ...a); }; }
  { const base = lrender; lrender = (...x) => { base(...x); try { if (!SITE() || !SITE().org) return; const a = route().a; document.body.classList.toggle('ln-hubon', route().a === 'notes' && (!route().b || route().b === 'new' || /^n[0-9a-z]{1,24}$/.test(route().b)) && okMe()); document.body.classList.toggle('ln-focus', okMe() && (isRv() || (route().a === 'notes' && ['q', 'search', 'fb'].includes(route().b))));
    if (a === 'notes') { document.title = `${SITE().org.name} · ${isRv() ? '오늘 복습' : '내 노트'}`; if (appOn()) { const nav = document.querySelector('#lapp .ap-nav'); if (nav) nav.querySelectorAll(':scope > a').forEach(y => { const k = y.getAttribute('href') === '#acct' || y.getAttribute('href') === '#my' && !nav.querySelector('a[href="#acct"]'); y.classList.toggle('on', k); if (k) y.setAttribute('aria-current', 'page'); else y.removeAttribute('aria-current'); }); } }
    entries(); if (a === 'c') lessonDeco(); paintOv(); } catch (e) { console.error('lnote deco', e); } }; }
  addEventListener('hashchange', () => { if (!isRv()) RV = null; LN.edit = false; LN.view = false; LN.cardf = false; LN.del = ''; KM.key = ''; });
  N.on(k => { if (['grade'].includes(k)) return; try { if (route().a === 'notes' && !route().b) paintList(); } catch (e) { } });

  let srchT = 0;
  /* ── 이벤트 ── */
  const reOv = () => { paintOv(); };
  const go = h => { if (location.hash === h) lrender(); else location.hash = h; };
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-ln]'); if (!el) return; const k = el.dataset.ln; const id = decodeURIComponent(route().b || '');
    if (k === 'tonote') return; e.preventDefault();
    if (k === 'new') { LN.edit = false; LN.pre = LN.q.trim() && !N.all().some(match) ? { t: LN.q.trim().slice(0, 80) } : null; go('#notes/new'); return; }
    if (k === 'retry') { SV.st = 'busy'; paintSt(); try { LR.api.save(); } catch (e) { } return; }
    if (k === 'esub') { LN.esub = el.dataset.v || 'all'; paintList(); return; }
    if (k === 'ecid') { const C = [...new Set(N.feed({ src: 'eval' }).filter(x => x.cid && x.sc != null).map(x => x.cid))]; LN.ecid = C[(C.indexOf(LN.ecid) + 1) % C.length]; paintList(); return; }
    if (k === 'fbnote') { const x = N.feed({ src: 'eval', hidden: true }).find(y => y.key === el.dataset.key); if (!x) return; let n = null; try { if (window.LNOTE_AI && typeof LNOTE_AI.fbToNote === 'function') n = LNOTE_AI.fbToNote(x.kind === 'bk' ? x.bid : x.cid, x.kind, x.kind === 'bk' ? x.id.split('.').slice(1).join('.') : x.kind === 'ai' ? x.lid : '', { open: true, text: x.fb }); } catch (e) { n = null; }
      if (!n) { n = N.save({ src: 'me', st: 'draft', t: `고칠 점 · ${x.t}`.slice(0, 80), b: `**받은 피드백**\n${noName(x.fb).slice(0, 600)}\n**내가 고칠 점**\n- [ ] \n**다음 과제에서 확인**\n- `, cid: x.cid && N.cName(x.cid) ? x.cid : '', lid: x.lid || '', tags: ['피드백'] }); if (n) location.hash = '#notes/' + n.id; } return; }
    if (k === 'askt') { location.hash = '#ai'; setTimeout(() => { try { if (typeof LT === 'object' && LT && typeof ltRender === 'function') { LT.open = true; document.body.classList.add('lt-on'); ltRender(); } } catch (e) { } }, 80); return; }
    if (k === 'chk') { const id = decodeURIComponent(route().b || ''); const n = N.get(id); if (!n) return; const i = +el.dataset.i; const L = n.b.split('\n'); if (!L[i]) return; L[i] = /\[x\]/i.test(L[i]) ? L[i].replace(/\[x\]/i, '[ ]') : L[i].replace('[ ]', '[x]'); N.save({ id, b: L.join('\n') }); reOv(); return; }
    if (k === 'cand') { const ta = document.getElementById('lnB'); if (!ta) return; const v = ta.value; const at = v.indexOf('**내가 고칠 점**'); const line = `- [ ] ${el.dataset.v}`; if (at < 0) ta.value = `${v.replace(/\s+$/, '')}\n${line}`; else { const end = v.indexOf('\n**', at + 4); const sec = v.slice(at, end < 0 ? v.length : end).replace(/\n- \[ \]\s*$/, ''); ta.value = v.slice(0, at) + sec.replace(/\s+$/, '') + '\n' + line + (end < 0 ? '' : v.slice(end)); }
      ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); el.disabled = true; toast('후보를 넣었어요. 내 말로 고쳐 써 주세요.', 'ok'); return; }
    if (k === 'seg') { LN.seg = el.dataset.v || 'note'; LN.tag = LN.seg === 'note' ? LN.tag : ''; if (route().a !== 'notes' || route().b) { location.hash = '#notes'; return; } history.replaceState(null, '', '#notes' + (LN.seg === 'note' ? '' : '?t=' + LN.seg)); paintList(); return; }
    if (k === 'showhid') { LN.hid = !LN.hid; paintList(); return; }
    if (k === 'act') { const x = N.feed({ hidden: true }).find(y => y.key === el.dataset.key); if (!x) return; document.querySelectorAll('#lnAct').forEach(z => z.remove()); document.body.insertAdjacentHTML('beforeend', actHTML(x)); const f = document.querySelector('#lnAct .ln-ai'); if (f) f.focus(); return; }
    if (k === 'actx') { document.querySelectorAll('#lnAct').forEach(z => z.remove()); return; }
    if (k === 'actgo') { document.querySelectorAll('#lnAct').forEach(z => z.remove()); location.hash = el.getAttribute('href'); return; }
    if (k === 'actdel') { const key = el.dataset.key; document.querySelectorAll('#lnAct').forEach(z => z.remove()); const id = key.slice(5); location.hash = '#notes/' + id; setTimeout(() => { LN.del = id; reOv(); }, 60); return; }
    if (k === 'ansmore') { const a = document.getElementById('lnAns'); if (a) { a.classList.remove('fold'); el.remove(); } return; }
    if (k === 'ssrc') { SS.src = el.dataset.v || 'all'; const r = document.getElementById('lnSr'); if (r) r.innerHTML = srchBody(sq()); return; }
    if (k === 'rs') { location.hash = '#notes/search?q=' + encodeURIComponent(el.dataset.v); return; }
    if (k === 'rsclr') { try { sessionStorage.removeItem(RS); } catch (e) { } const r = document.getElementById('lnSr'); if (r) r.innerHTML = srchBody(''); return; }
    if (k === 'sqx') { history.replaceState(null, '', '#notes/search'); const i = document.getElementById('lnSq'); if (i) { i.value = ''; i.focus(); } el.hidden = true; const r = document.getElementById('lnSr'); if (r) r.innerHTML = srchBody(''); return; }
    if (k === 'newq') { LN.pre = { t: sq().trim().slice(0, 80) }; go('#notes/new'); return; }
    if (k === 'mkpin' || k === 'mkhide') { const key = el.dataset.key; document.querySelectorAll('#lnAct').forEach(z => z.remove()); const x = N.feed({ hidden: true }).find(y => y.key === key); if (!x) return;
      if (x.src === 'note' && k === 'mkpin') { N.save({ id: x.id, pin: !x.note.pin }); toast(x.note.pin ? '고정을 풀었어요.' : '맨 위에 고정했어요.', 'ok'); }
      else { const m = N.marks()[key] || {}; const v = k === 'mkpin' ? { pin: !m.pin, hide: false } : { pin: false, hide: !m.hide }; if (!N.mark(key, v)) return; toast(k === 'mkpin' ? (v.pin ? '맨 위에 고정했어요.' : '고정을 풀었어요.') : (v.hide ? '숨겼어요. 원래 기록은 그대로예요.' : '다시 보이게 했어요.'), 'ok'); }
      if (route().b === 'search') { const r = document.getElementById('lnSr'); if (r) r.innerHTML = srchBody(sq()); } else if (route().b === 'q') lrender(); else paintList(); return; }
    if (k === 'tonote2') { document.querySelectorAll('#lnAct').forEach(z => z.remove()); const x = N.feed({ hidden: true }).find(y => y.key === el.dataset.key); if (!x) return; let n = null;
      if (x.src === 'ask' && window.LNOTE_AI && typeof LNOTE_AI.qaToNote === 'function' && !/^#post/.test(x.href)) { try { n = LNOTE_AI.qaToNote(x.id, { open: true }); if (n && n.id) return; } catch (e) { n = null; } }
      n = N.toNote(x); if (n) { toast(x.src === 'ask' ? '질문을 노트로 옮겼어요. 내 말로 정리해 주세요.' : '노트 초안으로 옮겼어요. 내 말로 정리해 주세요.', 'ok'); LN.seg = 'note'; location.hash = '#notes/' + n.id; } return; }
    if (k === 'cid') { LN.cid = el.dataset.v || ''; LN.tag = ''; paintList(); return; }
    if (k === 'newat') { LN.pre = { cid: el.dataset.c || '', lid: el.dataset.i || '' }; go('#notes/new'); return; }
    if (k === 'tag') { if (el.closest('.ln-rail') && !el.classList.contains('ln-tag')) LN.cid = ''; LN.tag = el.dataset.v || ''; if (route().a === 'notes' && !route().b) { paintList(); const s = document.getElementById('lnChips'); if (s && LN.tag === '__draft') s.scrollIntoView({ block: 'nearest' }); } return; }
    if (k === 'srch') { location.hash = '#notes/search'; setTimeout(() => { const i = document.getElementById('lnSq'); if (i) i.focus(); }, 80); return; }
    if (k === 'clear') { LN.q = ''; LN.tag = ''; LN.cid = ''; const q = document.getElementById('lnQ'); if (q) q.value = ''; paintList(); return; }
    if (k === 'edit') { LN.edit = true; LN.view = false; KM.key = ''; reOv(); return; }
    if (k === 'view') { LN.edit = false; LN.view = true; reOv(); return; }
    if (k === 'pin') { const n = N.get(id); if (n) { N.save({ id, pin: !n.pin }); toast(n.pin ? '고정을 풀었어요.' : '맨 위에 고정했어요.', 'ok'); reOv(); } return; }
    if (k === 'del' || k === 'delall') { if (LN.del !== id) { LN.del = id; reOv(); return; } const n = N.get(id); if (!n) return; const K = cardsOf(id); LN.del = ''; UNDO = { n: { ...n }, K: k === 'delall' ? K.map(c => ({ ...c })) : [], keep: k === 'delall' ? [] : K.map(c => c.id) };
      if (k === 'delall') K.forEach(c => N.delCard(c.id)); if (N.del(id)) { location.hash = '#notes'; setTimeout(() => undoBar(k === 'delall' ? `노트와 카드 ${K.length}장을 지웠어요.` : '노트를 지웠어요.'), 60); } return; }
    if (k === 'undo') { const u = UNDO; UNDO = null; document.querySelectorAll('.ln-undo').forEach(x => x.remove()); if (!u) return; const Nn = N._store(); if (!Nn.items.some(x => x.id === u.n.id)) { Nn.items.unshift(u.n); } u.K.forEach(c => { if (!Nn.cards.some(x => x.id === c.id)) Nn.cards.push(c); }); u.keep.forEach(cid => { const c = Nn.cards.find(x => x.id === cid); if (c) c.nid = u.n.id; }); N.save({ id: u.n.id }); toast('되돌렸어요.', 'ok'); if (route().a === 'notes') lrender(); return; }
    if (k === 'delno') { LN.del = ''; reOv(); return; }
    if (k === 'kmsw') { kmRead(); KM.on = !KM.on; if (KM.on && !KM.list.length) { const f = document.getElementById('lnF'); KM.list = N.suggest(f ? f.b.value : ''); } kmPaint(); return; }
    if (k === 'kmre') { const f = document.getElementById('lnF'); KM.auto = true; KM.list = N.suggest(f ? f.b.value : ''); kmPaint(); if (!KM.list.length) toast('본문에서 뽑을 질문이 없어요. 「질문? 답」처럼 써 보세요.', 'warn'); return; }
    if (k === 'kmai') { const f = document.getElementById('lnF'); if (!f || !window.LNOTE_AI) return; kmRead(); el.disabled = true; Promise.resolve().then(() => { const id = decodeURIComponent(route().b || ''); const n0 = (id && id !== 'new' && N.get(id)) || {}; return LNOTE_AI.suggestCards({ ...n0, id: n0.id || '', t: f.t.value, cid: f.cid.value, lid: f.lid.value }, f.b.value); }).then(r => { const seen = new Set(KM.list.map(c => c.f)); (Array.isArray(r) ? r : []).forEach(c => { if (c && c.f && !seen.has(c.f) && KM.list.length < 3) { KM.list.push({ f: String(c.f).slice(0, 120), k: String(c.k || '').slice(0, 240) }); seen.add(c.f); } }); KM.auto = false; kmPaint(); }).catch(() => { toast('튜터가 지금 카드를 뽑지 못했어요. 직접 추가해 주세요.', 'warn'); el.disabled = false; }); return; }
    if (k === 'kmadd') { kmRead(); KM.auto = false; if (KM.list.length < 3) KM.list.push({ f: '', k: '' }); kmPaint(); const f = document.getElementById('lnF'); const i = f && f.elements['kf' + (KM.list.length - 1)]; if (i) i.focus(); return; }
    if (k === 'kmdel') { kmRead(); KM.auto = false; KM.list.splice(+el.dataset.v, 1); kmPaint(); return; }
    if (k === 'keepdraft') { const f = document.getElementById('lnF'); if (f) saveNote(f, 'draft'); return; }
    if (k === 'ins') { const ta = document.getElementById('lnB'); if (!ta) return; const v = el.dataset.v; const a0 = ta.selectionStart, a1 = ta.selectionEnd, sel = ta.value.slice(a0, a1);
      const r = v === 'b' ? `**${sel || '굵게'}**` : v === 'code' ? `\`${sel || '코드'}\`` : `${a0 && ta.value[a0 - 1] !== '\n' ? '\n' : ''}- ${sel}`; if (ta.value.length - (a1 - a0) + r.length > 1500) return; ta.setRangeText(r, a0, a1, 'end'); ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true })); return; }
    if (k === 'mdone') { const n = N.get(id); if (n) { dl(`note-${stamp()}-${n.id}.md`, N.md(n)); toast('노트(.md)를 내려받았어요. 이름 · 학번은 들어가지 않아요.', 'ok'); } return; }
    if (k === 'cardf') { LN.cardf = !LN.cardf; reOv(); if (LN.cardf) setTimeout(() => { const i = document.querySelector('#lnOv .ln-kf input'); if (i) i.focus(); }, 40); return; }
    if (k === 'kdel') { if (N.delCard(el.dataset.v)) { toast('카드를 지웠어요.', 'ok'); reOv(); } return; }
    if (k === 'flip') { if (!RV) return; RV.flip = !RV.flip; paintRv(); return; }
    if (k === 'grade') { if (!RV) return; const q = +el.dataset.v; const Q = RV.round === 1 ? RV.list : RV.again; const cid = Q[RV.i]; if (!cid) return;
      if (RV.round === 1) { N.grade(cid, q); RV.n[q]++; RV.res[cid] = q; if (q === 0) RV.again.push(cid); } else if (q === 0 && RV.i < 30) RV.again.push(cid); /* 다시 라운드: 일정(due)은 첫 채점 그대로(내일) */
      RV.i++; RV.flip = false; if (RV.i >= Q.length) RV.phase = RV.round === 1 && RV.again.length ? 'ask' : 'done'; paintRv(); if (RV.phase === 'done') toast('오늘 복습을 마쳤어요.', 'ok'); return; }
    if (k === 'again') { if (!RV) return; RV.round = 2; RV.again = [...new Set(RV.again)]; RV.i = 0; RV.phase = 'main'; RV.flip = false; paintRv(); return; }
    if (k === 'rvend') { if (!RV) return; RV.phase = 'done'; paintRv(); return; }
    if (k === 'later') { if (!RV) return; const Q = RV.round === 1 ? RV.list : RV.again; if (Q.length - RV.i <= 1) { toast('남은 카드가 이것뿐이에요.', 'warn'); return; } Q.push(Q.splice(RV.i, 1)[0]); RV.flip = false; paintRv(); return; }
    if (k === 'wf') { if (!RV) return; RV.wf = !RV.wf; RV.key = ''; paintRv(); return; }
    if (k === 'mini') { const m = document.getElementById('lnMini'); if (m) { m.remove(); el.setAttribute('aria-expanded', 'false'); return; } const x = lessonCtx(); if (!x) return; el.closest('.ln-lrow').insertAdjacentHTML('afterend', miniHTML(x)); el.setAttribute('aria-expanded', 'true'); const t = document.getElementById('lnMq'); if (t) t.focus({ preventScroll: true }); return; }
    if (k === 'full') { const x = lessonCtx(); const t = document.getElementById('lnMq'); LN.pre = x ? { cid: x.c.id, lid: x.lid, t: x.it ? `${x.it.title} 정리`.slice(0, 80) : '', b: t ? t.value : '' } : null; LN.edit = false; location.hash = '#notes/new'; return; } });
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-ln="tonote"]'); if (t) { RV = RV; } });
  document.addEventListener('input', e => { const t = e.target; if (t && t.id === 'lnSq') { clearTimeout(srchT); srchT = setTimeout(() => { const v = t.value; history.replaceState(null, '', '#notes/search' + (v.trim() ? '?q=' + encodeURIComponent(v.trim()) : '')); const x = document.querySelector('[data-ln=sqx]'); if (x) x.hidden = !v; const r = document.getElementById('lnSr'); if (r) r.innerHTML = srchBody(v); if (v.trim().length > 1) addRecent(v.trim()); }, 300); return; } if (t && t.id === 'lnQ') { LN.q = t.value; paintList(); } if (t && t.form && t.form.id === 'lnF') { const m = { b: 'lnCc', t: 'lnTc' }[t.name]; if (m) { const c = document.getElementById(m); if (c) c.textContent = t.value.length; } if (t.name === 'tags') { const c = document.getElementById('lnGc'); if (c) c.textContent = t.value.split(/[,\n]+/).filter(x => x.trim()).length; } if (t.name === 'b') { const id = decodeURIComponent(route().b || ''); const n0 = id && N.get(id); if (n0 && n0.st === 'draft') { clearTimeout(diffHTML.t); diffHTML.t = setTimeout(() => { const d = document.getElementById('lnDiff'); if (d) d.innerHTML = diffHTML(n0, t.value); const h = document.querySelector('#lnHint span'); if (h && window.LNOTE_AI) h.textContent = LNOTE_AI.hint(n0, t.value) || ''; }, 250); } } if (t.name === 'b' && KM.on && KM.auto) { clearTimeout(kmPaint.t); kmPaint.t = setTimeout(() => { if (!KM.on || !KM.auto) return; const nl = N.suggest(t.value); if (JSON.stringify(nl) !== JSON.stringify(KM.list)) { KM.list = nl; kmPaint(); } }, 350); } if (/^k[fk]\d$/.test(t.name)) { KM.auto = false; kmRead(); const sb = document.getElementById('lnSave'); if (sb) sb.innerHTML = saveLab(); } } });
  document.addEventListener('change', e => { const t = e.target; if (t && t.form && t.form.id === 'lnF' && t.name === 'cid') t.form.lid.innerHTML = lessonOpts(t.value, ''); });
  function saveNote(f, st) { const er = f.querySelector('.ln-err'); const id = decodeURIComponent(route().b || ''); const t = f.t.value.trim(), b = f.b.value; er.textContent = ''; f.t.classList.remove('bad');
    if (!t) { er.textContent = '제목을 한 줄 적어 주세요.'; f.t.classList.add('bad'); f.t.focus(); return; }
    const tags = f.tags.value.split(/[,\n]+/).map(x => x.trim().replace(/^#/, '').replace(/\s+/g, '_')).filter(Boolean); if (tags.length > 5) { er.textContent = '태그는 5개까지 붙일 수 있어요.'; f.tags.focus(); return; } if (tags.some(x => x.length > 20)) { er.textContent = '태그 하나는 20자까지예요.'; f.tags.focus(); return; }
    const old0 = id && id !== 'new' ? N.get(id) : null; let body = b;
    if (st === 'ok' && old0 && old0.st === 'draft') { /* 대필 방지(FINAL 0-15): 튜터 · 영상 초안 = 고친 줄 1개 이상 + 확인 체크 · 오답 = 「왜 틀렸을까요?」 1자 이상 · 시험 · 파일 = 체크 */
      const lines = x => String(x || '').split('\n').map(l => l.trim()).filter(Boolean); let ch = -1; try { const A = window.LNOTE_AI; if (A && typeof A.diffLines === 'function') { const r = A.diffLines((typeof A.orig === 'function' && A.orig(old0.id)) || old0.b, b); ch = typeof r === 'number' ? r : r && typeof r.mine === 'number' ? r.mine + (lines(t).join() !== lines(old0.t).join() ? 1 : 0) : -1; } } catch (e) { ch = -1; }
      if (ch < 0) { const o = new Set(lines(old0.b)); ch = lines(b).filter(l => !o.has(l)).length + (lines(t).join() !== lines(old0.t).join() ? 1 : 0); }
      if (old0.tags.includes('피드백')) { let C = []; try { C = window.LNOTE_AI && typeof LNOTE_AI.fbCands === 'function' ? LNOTE_AI.fbCands(old0.id) || [] : []; } catch (e) { C = []; } const at = b.indexOf('**내가 고칠 점**'); const end = at < 0 ? -1 : b.indexOf('\n**', at + 4); const sec = at < 0 ? '' : b.slice(at, end < 0 ? b.length : end);
        const own = sec.split('\n').filter(l => !/^\s*\*\*/.test(l)).map(l => l.replace(/^\s*[-*]\s*(\[[ xX]\])?\s*/, '').trim()).filter(l => l && !C.includes(l)); if (!own.length) { er.textContent = '고칠 점을 한 줄 이상 직접 적어 주세요.'; f.b.focus(); return; } }
      else if (['tutor', 'yt'].includes(old0.src) && ch < 1) { er.textContent = '내 말로 한 줄 이상 고쳐 주세요.'; f.b.focus(); return; }
      if (old0.src === 'quiz') { const w = f.why ? f.why.value.trim() : ''; if (!w) { er.textContent = '「왜 틀렸을까요?」를 한 글자 이상 적어 주세요.'; if (f.why) f.why.focus(); return; } body = `${b.replace(/\s+$/, '')}\n\n**왜 틀렸나** ${w}`.slice(0, N.LIM.b); }
      if (f.ok && !f.ok.checked) { er.textContent = '「내용을 읽고 확인했어요」에 체크해 주세요.'; f.ok.focus(); return; } }
    kmRead(); const K = KM.on ? KM.list.map(c => ({ f: c.f.trim(), k: c.k.trim() })).filter(c => c.f) : []; if (K.some(c => !c.k)) { er.textContent = '카드 뒷면(답)을 적어 주세요. 필요 없는 카드는 휴지통으로 빼요.'; return; }
    if (K.length > N.LIM.cards - N.cards().length) { er.textContent = '카드가 가득 찼어요. 오래된 카드를 정리해 주세요.'; return; }
    const old = id && id !== 'new' ? N.get(id) : null; const n = N.save({ ...(old ? { id: old.id } : { src: 'me' }), t, b: body, tags, cid: f.cid.value, lid: f.cid.value ? f.lid.value : '', st });
    if (!n) { er.textContent = N.all().length >= N.LIM.items && !old ? `노트가 가득 찼어요(${N.LIM.items}개). 오래된 노트를 정리하면 새로 쓸 수 있어요.` : '저장하지 못했어요. 길이를 확인해 주세요.'; return; }
    const made = K.map(c => N.saveCard({ nid: n.id, f: c.f, k: c.k, src: 'note', due: N.addD(td(), 1), iv: 1, ef: 2.5, n: 0 })).filter(Boolean);
    LN.edit = false; LN.view = true; LN.pre = null; KM.key = ''; const A = window.LNOTE_AI; const msg = st === 'draft' ? '초안으로 두었어요.' : '노트에 저장했어요', sub = made.length ? `복습 카드 ${made.length}장도 만들었어요` : '';
    if (st === 'ok' && old0 && old0.st === 'draft' && A && typeof A.undoToast === 'function') A.undoToast(msg, sub, () => { made.forEach(c => N.delCard(c.id)); N.save({ id: n.id, st: 'draft', b: old0.b, t: old0.t }); if (route().a === 'notes') lrender(); });
    else toast(`${msg}${sub ? ' · ' + sub : ''}.`, 'ok');
    if (st === 'ok' && old0 && old0.st === 'draft' && LN.tag === '__draft') { const nx = N.all().find(x => x.st === 'draft'); LN.view = false; if (nx) { location.hash = '#notes/' + nx.id; return; } setTimeout(() => toast('초안을 모두 확인했어요.', 'ok'), 2500); }
    if (route().b === n.id) reOv(); else location.hash = '#notes/' + n.id; }
  let UNDO = null;
  function undoBar(msg) { document.querySelectorAll('.ln-undo').forEach(x => x.remove()); document.body.insertAdjacentHTML('beforeend', `<div class="ln-undo" role="status"><span>${esc(msg)}</span><button type="button" data-ln="undo">되돌리기</button></div>`); clearTimeout(undoBar.t); undoBar.t = setTimeout(() => { document.querySelectorAll('.ln-undo').forEach(x => x.remove()); UNDO = null; }, 5000); }
  document.addEventListener('submit', e => { const f = e.target; const k = f && f.dataset && f.dataset.lnF; if (!k) return; e.preventDefault(); const er = f.querySelector('.ln-err'); const id = decodeURIComponent(route().b || '');
    if (k === 'note') { saveNote(f, 'ok'); return; }
    if (k === 'card') { const fr = f.f.value.trim(); if (!fr) { er.textContent = '앞면(질문)을 적어 주세요.'; f.f.focus(); return; } const c = N.saveCard({ f: fr, k: f.k.value.trim(), nid: id, src: 'note' }); if (!c) { er.textContent = '카드를 만들지 못했어요.'; return; } toast('복습 카드를 만들었어요. 오늘 복습에 들어가요.', 'ok'); LN.cardf = true; reOv(); setTimeout(() => { const i = document.querySelector('#lnOv .ln-kf input'); if (i) i.focus(); }, 40); return; }
    if (k === 'quick') { const b = f.b.value.trim(); if (!b) { er.textContent = '기억할 것을 한 줄 적어 주세요.'; f.b.focus(); return; } const x = lessonCtx(); if (!x) return; const first = b.split('\n')[0].replace(/^[-*]\s*/, '').slice(0, 40);
      const n = N.save({ t: (x.it ? `${x.it.title} · ${first}` : first).slice(0, 80), b, cid: x.c.id, lid: x.lid, tags: [], src: 'me' }); if (!n) { er.textContent = '저장하지 못했어요.'; return; } toast('이 레슨 노트에 저장했어요.', 'ok');
      const m = document.getElementById('lnMini'); if (m) m.outerHTML = miniHTML(x); const bt = document.querySelector('.ln-lbtn'); if (bt) { const c = N.all().filter(y => y.cid === x.c.id && (!x.lid || y.lid === x.lid)).length; bt.innerHTML = `${ico('lnnote', 18)}노트 <b>${c}</b>`; } return; } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('lnAct')) { document.querySelectorAll('#lnAct').forEach(z => z.remove()); return; } if (e.key === 'Escape' && document.getElementById('lnOv')) { e.preventDefault(); location.hash = '#notes'; return; }
    if (!isRv() || !RV || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    if ((e.key === ' ' || e.key === 'Enter') && !(e.target && e.target.closest && e.target.closest('a, button'))) { e.preventDefault(); RV.flip = !RV.flip; paintRv(); return; }
    if (RV.flip && ['1', '2', '3'].includes(e.key)) { const b = document.querySelector(`.ln-grade button[data-v="${+e.key - 1}"]`); if (b) b.click(); } });
})();
