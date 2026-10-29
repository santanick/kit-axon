/* 디디쌤 스튜디오 v10.3 — 디지털북 공통(어드민 index.html · 학습자 learner.html 모두 로드)
   책 = { id, title, level, color, desc, cls(연결 과정), thr(완독 기준 %), pass(통과 점수), on, chs[{ id, title, blocks[] }] }
   블록 type: text · key · image · video · quiz · flip · order · check · write · item(과정 항목 연결)
   학습 기록(LP.book[책]) = { r{단원: 1}, b{블록: {done, score, w, n, ans, f[], o[], at}}, last, at } — item 블록은 LP.cls(과정 기록)를 그대로 쓴다. */
'use strict';
const BK_TYPES = [['text', '본문', '제목 · 문단 · 목록(# 제목, - 목록, **굵게**)'], ['key', '핵심 박스', '핵심 · 팁 · 주의 강조'], ['image', '이미지', 'https 주소 또는 올리기(자동 축소)'],
  ['video', '영상', 'YouTube · 실제 재생 구간으로 진도'], ['quiz', '확인 문제', '즉시 채점 · 해설 · 배점'], ['flip', '펼쳐보기 카드', '앞면 → 뒷면 뒤집기'], ['order', '순서 맞추기', '단계를 바른 순서로 배열 · 배점'],
  ['check', '따라 하기 체크', '실습 단계를 하나씩 체크'], ['write', '생각 쓰기 · 서술', '제출 → 운영자 채점(배점 시)'], ['item', '과정 항목 연결', '과정의 영상 · 퀴즈 · 시험 · 과제를 그대로']];
const BK_NAME = Object.fromEntries(BK_TYPES.map(([k, n]) => [k, n]));
const BK_TRACK = new Set(['video', 'quiz', 'flip', 'order', 'check', 'write', 'item']);
const bkItem = (b, classes) => { const c = (classes || []).find(x => x.id === b.cls); return (c && (c.items || []).find(x => x.id === b.item)) || null; };
/* 배점: 확인 문제 · 순서 맞추기 기본 10, 서술은 운영자가 정한 점수(0이면 제출만), 과정 퀴즈 · 시험 연결은 기본 20 */
function bkPts(b, classes) {
  if (b.type === 'quiz' || b.type === 'order') return b.pts == null || b.pts === '' ? 10 : Math.max(0, +b.pts || 0);
  if (b.type === 'write') return Math.max(0, +b.pts || 0);
  if (b.type === 'item') { const it = bkItem(b, classes); return it && (it.type === 'quiz' || it.type === 'exam') ? (b.pts == null || b.pts === '' ? 20 : Math.max(0, +b.pts || 0)) : 0; }
  return 0;
}
/* 진도 · 점수 · 완독 판정. st = LP.book[책], lpCls = LP.cls, grades = 운영자 채점 {블록: {score, fb}}, classes = 게시본 과정 */
function bkCalc(book, st, lpCls, grades, classes) {
  st = st || {}; const B = st.b || {}; const R = st.r || {}; let tot = 0, done = 0, pts = 0, got = 0, pend = 0, acts = 0, tried = 0;
  const chs = (book.chs || []).map(ch => { let t = 1, d = R[ch.id] ? 1 : 0;
    (ch.blocks || []).forEach(b => { if (!BK_TRACK.has(b.type)) return; if (b.type === 'item' && !bkItem(b, classes)) return; t++; acts++;
      const s = b.type === 'item' ? ((((lpCls || {})[b.cls] || {}).items || {})[b.item] || {}) : (B[b.id] || {}); if (s.done) d++;
      const p = bkPts(b, classes); if (!p) return; pts += p;
      if (b.type === 'write') { const g = (grades || {})[b.id]; if (g && g.score != null && g.score !== '') { got += Math.min(p, Math.max(0, +g.score || 0)); tried++; } else if (s.done) pend++; }
      else if (s.score != null) { got += p * Math.min(100, Math.max(0, +s.score || 0)) / 100; tried++; } });
    tot += t; done += d; return { id: ch.id, t, d, p: Math.round(d / t * 100) }; });
  const p = Math.round(done / Math.max(1, tot) * 100); const score = pts ? Math.round(got / pts * 100) : null; const thr = +book.thr || 80, pass = book.pass == null ? 60 : +book.pass;
  const complete = p >= thr && (score == null || score >= pass);
  return { p, done, tot, acts, chs, score, pts, pend, tried, thr, pass, complete, started: !!(Object.keys(B).length || Object.keys(R).length) };
}
/* 본문 표기: # 제목 · - 목록 · **굵게** · 빈 줄 = 문단. 반드시 esc 후 변환 */
function bkMd(s, escf) {
  const E = escf || (x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const inl = x => E(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const out = []; let ul = null; const flush = () => { if (ul) { out.push('<ul>' + ul.map(x => '<li>' + x + '</li>').join('') + '</ul>'); ul = null; } };
  String(s || '').split('\n').forEach(line => { const l = line.trim(); if (/^[-•·]\s+/.test(l)) { (ul = ul || []).push(inl(l.replace(/^[-•·]\s+/, ''))); return; } flush(); if (!l) return; if (/^#{1,3}\s/.test(l)) out.push('<h3>' + inl(l.replace(/^#+\s/, '')) + '</h3>'); else out.push('<p>' + inl(l) + '</p>'); });
  flush(); return out.join('');
}
const bkImgOK = s => /^https:\/\/[^\s"'<>]+$/.test(s || '') || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s || '');
