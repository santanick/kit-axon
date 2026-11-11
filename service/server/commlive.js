'use strict';
/* v38 C#17 학습자 게시판 글 · 댓글을 운영자가 스튜디오를 열기 전에도 같은 기관 학습자에게 보이게 한다.
   - POST events(post-new · post-cmt)를 받을 때 게시본 comm의 게시판 권한으로 확인하고, 정화한 게시 모양을 이벤트 data._cm에 함께 둔다
   - GET site는 운영자 화면이 아직 반영하지 않은 이벤트(id > doc.lpxSeq)의 _cm만 게시본 comm에 id로 합쳐 돌려준다
     → 운영자 화면이 반영해 다시 게시하면 lpxSeq가 올라가 자연히 빠진다(중복 없음 · 운영자가 숨긴 글이 되살아나지 않음).
     tenant_state.doc · rev는 건드리지 않는다(스튜디오 저장 충돌 없음)
   - 승인 필요 게시판(appr) · 수강후기 · 운영자에게만 · 비밀글은 대기로 둔다(운영자 화면이 반영할 때 게시)
   Java: pub/service/impl/PubCommLive.java — 같은 규칙 */
const ID_RE = /^[\w-]{4,40}$/;
/* comm2.js cmH · lcomm.js lcH와 같은 해시(FNV-1a 32비트, UTF-16 단위) */
const H = s => { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
/* 태그 · 제어문자를 빼고 자른다(학습자 화면은 따로 이스케이프한다) */
const clean = (v, n) => String(v == null ? '' : v).replace(/<[^>]*>?/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString();
const nickOf = (m, type) => { if (!m) return '회원'; if (m.nick) return String(m.nick).slice(0, 20); if (type === 'univ' || !m.name) return '학습자'; return String(m.name)[0] + '○○'; };
const arr = v => Array.isArray(v) ? v : [];
const seeOK = (b, au, comm) => { const p = (b && b.perm) || {}; if (!p.type || p.type === 'all') return true; if (p.type === 'cls') return arr(p.cls).some(id => arr((comm.enr || {})[id]).includes(au)); return arr(p.who).includes(au); };
const findC = (L, id) => { for (const r of arr(L)) { if (r && r.id === id) return r; const x = findC(r && r.replies, id); if (x) return x; } return null; };

/* 받을 때: 게시할 모양(_cm) 또는 null(대기). ctx = { tid, sid, m(열린 회원 · 없으면 null), orgType, live(아직 반영 안 된 _cm 목록) } */
function accept(comm, ctx, type, d) {
  if (!comm || typeof comm !== 'object' || !d || typeof d !== 'object') return null;
  const au = H((comm.tid || ctx.tid) + ':' + ctx.sid); const nick = nickOf(ctx.m, ctx.orgType); const now = kst();
  const boards = arr(comm.boards); const posts = arr(comm.posts); const live = arr(ctx.live);
  if (type === 'post-new') {
    const id = String(d.id || ''); if (!ID_RE.test(id) || posts.some(p => p && p.id === id) || live.some(x => x.p && x.p.id === id)) return null;
    const b = boards.find(x => x && x.id === d.board); if (!b || b.write === 'admin' || b.appr || b.id === '수강후기' || !seeOK(b, au, comm)) return null;
    if (d.tonly || d.priv) return null;
    const body = clean(d.body, 4000); const title = clean(d.title, 120) || body.slice(0, 30); if (!body && !title) return null;
    const cls = typeof d.cls === 'string' && Object.prototype.hasOwnProperty.call(comm.cfg || {}, d.cls) ? d.cls : '';
    return { p: { id, board: b.id, kind: d.kind === '질문' ? '질문' : '이야기', nick, au, admin: false, pin: false, title, body, lock: false, tonly: false, priv: false, cls, item: clean(d.item, 40), files: [], likes: 0, likedBy: [], cmts: [], ncmt: 0, at: now.slice(0, 10), ua: now.slice(0, 16).replace('T', ' '), views: 0, live: 1 } };
  }
  if (type === 'post-cmt') {
    const id = String(d.id || ''); if (!ID_RE.test(id)) return null;
    const pid = String(d.post || ''); const p = posts.find(x => x && x.id === pid) || (live.find(x => x.p && x.p.id === pid) || {}).p; if (!p || p.lock) return null;
    const b = boards.find(x => x && x.id === p.board); if (!b || b.cmt === false || b.appr || (!seeOK(b, au, comm) && p.au !== au)) return null;
    if (findC(p.cmts, id) || live.some(x => x.c && x.c.id === id)) return null;
    const body = clean(d.body, 2000); if (!body) return null;
    const parent = ID_RE.test(String(d.parent || '')) ? String(d.parent) : '';
    return { post: pid, parent, c: { id, nick, au, admin: false, body, at: now.slice(0, 16).replace('T', ' '), replies: [], live: 1 } };
  }
  return null;
}

/* 돌려줄 때: 게시본에 아직 반영 안 된 글 · 댓글을 id로 합친다(원본 pub은 바꾸지 않는다) */
function merge(pub, list) {
  const L = arr(list).filter(x => x && typeof x === 'object'); if (!pub || !pub.comm || !L.length) return pub;
  const comm = pub.comm; const posts = arr(comm.posts).map(p => p); const touched = new Map();
  const own = p => { if (touched.has(p.id)) return touched.get(p.id); const q = { ...p, cmts: JSON.parse(JSON.stringify(arr(p.cmts))) }; touched.set(p.id, q); const i = posts.indexOf(p); if (i >= 0) posts[i] = q; return q; };
  for (const x of L) {
    if (x.p && x.p.id && !posts.some(p => p && p.id === x.p.id)) { const q = { ...x.p, cmts: [] }; posts.unshift(q); touched.set(q.id, q); }
    else if (x.c && x.post) { const p0 = posts.find(p => p && p.id === x.post); if (!p0 || p0.lock || findC(p0.cmts, x.c.id)) continue; const p = own(p0);
      const par = x.parent ? findC(p.cmts, x.parent) : null; if (par) par.replies = [...arr(par.replies), { ...x.c }]; else { p.cmts.push({ ...x.c }); p.ncmt = (+p.ncmt || 0) + 1; } }
  }
  return { ...pub, comm: { ...comm, posts } };
}

module.exports = { accept, merge, H, clean };
