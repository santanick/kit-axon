/* v43.6 셀프러닝 노트 — 대표님(2026-11-17) 「스스로 셀프러닝처럼 자기 노트 만들어가지고 관리하는 쪽으로 강화」
   이 파일 = 노트 코어(window.LNOTE API · 데이터 계약) + 학습자 화면(#notes 허브 · #notes/<id> 보기 · 편집 · 레슨 「노트」 미니 패널 · #review 오늘 복습).
   데이터: LR.lp.notes = { v:1, items[≤120], cards[≤300], goal, sync } — 서버 정리 규칙은 service/server/lpnotes.js · PubServiceImpl.cleanNotes(같은 기준값 tests/lpnotes-vectors.json).
   다른 파일(lnote-ai.js · lnote-sync.js)은 LNOTE API만 쓰고 LR.lp.notes를 직접 고치지 않는다.
   개인정보: 노트 · 내보내기에 이름 · 연락처 · 학번을 넣지 않는다. 스튜디오는 개수만 본다(내용은 보지 않음).
   learner.html에서 lconn.js 다음. */
'use strict';
(() => {
  if (typeof window === 'undefined') return;
  /* ── 계약 ── */
  const LIM = { items: 120, cards: 300, t: 80, b: 1500, tags: 5, tag: 20, f: 120, k: 240, exam: 40, page: 60, bytes: 360 * 1024 };
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
  function norm(N) { const o = { v: 1, items: [], cards: [], goal: null, sync: {} }; if (!isObj(N)) return o; const seen = new Set();
    for (const x of Array.isArray(N.items) ? N.items : []) { const y = cleanNote(x); if (y && !seen.has(y.id)) { seen.add(y.id); o.items.push(y); } if (o.items.length >= LIM.items) break; }
    const ks = new Set(); for (const x of Array.isArray(N.cards) ? N.cards : []) { const y = cleanCard(x); if (y && !ks.has(y.id)) { ks.add(y.id); if (y.nid && !seen.has(y.nid)) y.nid = ''; o.cards.push(y); } if (o.cards.length >= LIM.cards) break; }
    if (isObj(N.goal)) { const exam = line(N.goal.exam, LIM.exam), date = String(N.goal.date || ''); if (exam && DAY.test(date)) o.goal = { exam, date }; }
    const S = isObj(N.sync) ? N.sync : {}; if (isObj(S.notion)) o.sync.notion = { on: S.notion.on === true, at: line(S.notion.at, 30), page: line(S.notion.page, LIM.page) }; if (isObj(S.gdocs)) o.sync.gdocs = { on: S.gdocs.on === true, at: line(S.gdocs.at, 30) };
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
    grade(id, q) { const N = store(); const c = N.cards.find(x => x.id === id); if (!c) return null; q = int(q, 0, 2, 0);
      let { iv, ef, n } = c;
      if (q === 0) { iv = 1; ef -= 0.2; } else if (q === 1) { iv = n === 0 ? 1 : Math.max(iv + 1, Math.round(iv * 1.2)); ef -= 0.15; } else { iv = iv < 3 ? (n === 0 ? 1 : 3) : Math.round(iv * ef); ef += 0.1; }
      c.iv = Math.min(180, Math.max(1, iv)); c.ef = Math.round(Math.min(2.8, Math.max(1.3, ef)) * 100) / 100; c.n = Math.min(9999, n + 1); c.due = addD(today(), c.iv);
      persist('grade', { id, q, card: c }); return c; },
    goal(g) { const N = store(); if (g === undefined) return N.goal; if (g === null) N.goal = null; else { const exam = line(g && g.exam, LIM.exam), date = String((g && g.date) || ''); if (!exam || !DAY.test(date)) return null; N.goal = { exam, date }; } persist('goal', N.goal); return N.goal; },
    /* sync는 lnote-sync.js가 쓴다(비밀값은 여기 두지 않는다 — 키는 그 파일이 이 기기 저장소에) */
    sync(k, v) { const N = store(); if (k === undefined) return N.sync; if (!['notion', 'gdocs'].includes(k)) return null; if (v === null) delete N.sync[k]; else { const o = { on: !!(v && v.on === true), at: line(v && v.at, 30) }; if (k === 'notion') o.page = line(v && v.page, LIM.page); N.sync[k] = o; } persist('sync', { k }); return N.sync[k] || null; },
    on(fn) { if (typeof fn === 'function') L.add(fn); return () => L.delete(fn); },
    open(id) { location.hash = id ? '#notes/' + encodeURIComponent(id) : '#notes'; },
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
