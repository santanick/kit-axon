/* 디디쌤 학습자 v26 — 마이페이지 홈 보강(피그마 '마이페이지 > 홈(수강생)' 대조)
   피그마에 있고 비어 있던 것: ① 상태 요약 줄(수강 전 · 수강 중 · 수료 · 기간 만료 · 교재/교구) ② 최근 구매한 교재/교구 ③ 최근 나의 학습 노트 · 질문 & 답변.
   기존 블록(다음 할 일 · 내 과정)에 붙여 그린다 — 운영자가 마이페이지 블록을 꺼 두면 함께 숨는다. */
'use strict';
(() => {
  if (typeof MYR === 'undefined') return;
  const td = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const E = s => (typeof esc === 'function' ? esc(s) : String(s || ''));
  const shop = () => { try { return (typeof shMine === 'function' && shMine()) || null; } catch (e) { return null; } };
  const books = () => { try { const R = shop(); const I = (typeof shInfo === 'function' && shInfo()) || {}; return Object.entries((R && R.books) || {}).map(([id, g]) => ({ id, g, b: (I.books || []).find(x => x.id === id) })).filter(x => x.b).sort((a, b) => String(b.g.at || '').localeCompare(String(a.g.at || ''))); } catch (e) { return []; } };
  function counts(st) { const R = shop(); const enr = (R && R.enr) || {}; const t = td(); const k = { pre: 0, on: 0, done: 0, exp: 0 };
    (st.courses || []).forEach(x => { const e = enr[x.c.id] || {}; const end = e.end || x.c.end || ''; if (x.done) k.done++; else if ((end && end < t) || e.status === 'ended') k.exp++; else if (!x.p && ((e.at || x.c.start || '') > t || !x.doneN)) k.pre++; else k.on++; });
    return { ...k, bk: books().length }; }
  function statusBar(st) { const k = counts(st); const cls = (typeof lcTerm === 'function' ? lcTerm('cls') : '') || '클래스';
    const it = [['수강 전', k.pre, 'm-courses'], ['수강 중', k.on, 'm-courses'], ['수료', k.done, 'm-courses'], ['기간 만료', k.exp, 'm-courses'], ...(typeof lPayOff === 'function' && lPayOff() && !k.bk ? [] : [['교재/교구', k.bk, 'm-books']])]; /* v38 F5 결제 꺼진 기관은 교재/교구 칸을 감춘다 */
    return `<div class="mycard wide my26-stat" role="list" aria-label="내 ${E(cls)} 현황">${it.map(([l, n, j]) => `<a role="listitem" href="#" data-lact="myjump" data-v="${j}"><span>${E(l)}${l === '교재/교구' ? '' : ' ' + E(cls)}</span><b>${n}</b></a>`).join('')}</div>`; }
  function booksCard() { const L = books().slice(0, 3); if (!L.length) return '';
    return `<div class="mycard wide my26-list" id="m-books"><div class="mh"><h3>최근 구매한 교재/교구</h3><a class="my26-more" href="#mybooks">내 교재/교구 전체보기 ›</a></div><ul>${L.map(x => `<li><a href="#tb/${E(x.id)}">${E(x.b.name)}</a><small>${E(x.b.kind || '')}${x.g.until && x.b.kind === '전자책' ? ` · ${E(x.g.until)}까지` : ''}</small></li>`).join('')}</ul></div>`; }
  function notesCard(st) { if (typeof lcStore !== 'function' || typeof COMM !== 'function') return ''; const me = typeof lcMe === 'function' ? lcMe() : ''; const s = lcStore();
    const map = new Map(); (COMM().notes || []).filter(n => n.au === me).forEach(n => map.set(n.id, n)); (s.notes || []).forEach(n => map.set(n.id, { ...(map.get(n.id) || {}), ...n }));
    const L = [...map.values()].filter(n => !(s.del || {})[n.id] && n.body).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))); if (!L.length) return '';
    const cn = id => { const c = (SITE().classes || []).find(x => x.id === id); return c ? c.name : ''; }; const inm = (cid, iid) => { const c = (SITE().classes || []).find(x => x.id === cid); const i = c && (c.items || []).find(x => x.id === iid); return i ? i.title || i.name || '' : ''; };
    const tm = t => { t = +t || 0; return t ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} ` : ''; };
    const row = n => `<li><a href="#c/${E(n.cls)}${n.item ? '/' + E(n.item) : ''}">${n.q ? '<em class="my26-q">질문</em>' : '<em>노트</em>'}<span class="my26-path">${E(cn(n.cls))}${inm(n.cls, n.item) ? ' › ' + E(inm(n.cls, n.item)) : ''}</span><span class="my26-body">${E(tm(n.t))}${E(String(n.body).slice(0, 80))}</span></a>${(n.cmts || []).length ? `<small>답변 ${(n.cmts || []).length}</small>` : ''}</li>`;
    const Q = L.filter(n => n.q).slice(0, 3), N = L.filter(n => !n.q).slice(0, 3);
    return `<div class="mycard wide my26-list" id="m-notes"><div class="mh"><h3>최근 나의 학습 노트</h3><small class="mini">영상 지점에 남긴 메모 · 질문 ${L.length}개</small></div>${N.length ? `<ul>${N.map(row).join('')}</ul>` : '<p class="mini">아직 남긴 노트가 없습니다.</p>'}${Q.length ? `<div class="mh sub"><h3>최근 나의 질문 &amp; 답변</h3></div><ul>${Q.map(row).join('')}</ul>` : ''}</div>`; }
  const bn = MYR.next; if (bn) MYR.next = st => statusBar(st) + bn.call(MYR, st);
  const bc = MYR.courses; if (bc) MYR.courses = st => bc.call(MYR, st) + booksCard() + notesCard(st);
})();
