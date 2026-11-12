/* v30 학사 LMS 묶음 D — 강의 게시판: 공지(열람자 확인 · 상단 고정 · 카테고리 · 복제) · Q&A(공개/비공개 · 멀티 답변 · 실명/익명 · 채택)
   · 자료실 · 1:1 상담(상태) · 댓글 · SMS/메일 발송 대기열(실발송은 연동 후 동작). 운영 /api/lms/d/*, 데모 S.lms.bcd.d. 공용 클라이언트는 lms/b.js(LMSX). */
(function () {
  'use strict';
  const X = window.LMSX; if (!X) return;
  const { fail, nid, nowIso } = X; const fmt = X.fmt; const pno = X.pno;
  const Dd = () => { const d = X.db(); d.d = d.d || {}; ['boards', 'posts', 'reads', 'answers', 'comments', 'outbox'].forEach(k => { d.d[k] = d.d[k] || []; }); return d.d; };
  const DEF = [['notice', '공지', ['일반', '학사', '시험', '과제']], ['qna', 'Q&A', ['강의', '과제', '시험', '기타']], ['archive', '자료실', ['강의자료', '참고자료']], ['counsel', '1:1 상담', ['학업', '진로', '기타']]];
  const ensure = sec => DEF.forEach(([kind, name, cats]) => { if (!Dd().boards.some(b => b.sec === sec && b.kind === kind)) Dd().boards.push({ id: nid(), sec, kind, name, categories: [...cats] }); });
  const boardOf = (sec, k) => Dd().boards.find(b => b.sec === sec && b.kind === k);
  const mine = (pid, a) => pid === a.pid && (!!a.pid || !pid);
  const canSee = (q, a) => !q.deleted_at && (!(q.private || q.kind === 'counsel') || X.mgr(a) || mine(q.pid, a));
  const nm = (pid, label, anon, a) => anon && !['admin', 'professor'].includes(a.role) && pid !== a.pid ? '익명' : pid ? pno(pid) : label;
  X.notice = (sec, title, body, cat, a) => { ensure(sec); const q = { id: nid(), board: boardOf(sec, 'notice').id, sec, kind: 'notice', category: cat || '', title: String(title).slice(0, 200), body, pid: a.pid, label: a.label, pinned: false, private: false, anonymous: false, files: [], status: 'open', at: nowIso(), upd: nowIso() }; Dd().posts.push(q); return q.id; };
  /* 데모 학기 2026-2 샘플 글(새 데모 저장소를 만들 때 한 번): 공지 · 답변 대기 Q&A · 자료실 · 1:1 상담 */
  X.seedHooks.push(db => {
    const pidOf = no => (db.persons.find(p => p.no === no) || {}).id || null; const at = (m, d, h) => new Date(Date.UTC(2026, m - 1, d, h - 9)).toISOString();
    db.sections.filter(s => s.term === '2026-2').forEach(s => { ensure(s.id); const B = k => boardOf(s.id, k).id;
      const P = (kind, cat, title, body, who, when, ex = {}) => { const q = { id: nid(), board: B(kind), sec: s.id, kind, category: cat, title, body, pid: who ? pidOf(who) : null, label: who || '교수자', pinned: false, private: false, anonymous: false, files: [], status: 'open', at: when, upd: when, ...ex }; Dd().posts.push(q); return q; };
      P('notice', '시험', '중간고사 성적 공개 및 이의 신청 안내', '중간고사 성적을 공개했습니다. 이의 신청은 11월 13일(금)까지 1:1 상담으로 해 주세요.', null, at(11, 3, 10), { pinned: true });
      P('notice', '과제', '과제 3 제출 안내(11월 12일 23:00 마감)', '코드와 보고서를 PDF 한 파일로 묶어 제출합니다. 늦은 제출은 하루 10% 감점입니다.', null, at(10, 29, 9));
      P('notice', '학사', '11월 17일 휴강 및 보강 안내', '학과 행사로 휴강하고, 11월 24일 7교시에 보강합니다.', null, at(10, 27, 14));
      const q1 = P('qna', '과제', '과제 3에서 외부 라이브러리를 써도 되나요?', '정렬 부분에 표준 라이브러리 말고 다른 것을 써도 되는지 궁금합니다.', '20261002', at(11, 5, 21));
      P('qna', '시험', '퀴즈 3 범위가 어디까지인가요?', '9차시까지인지 10차시까지인지 알려 주세요.', '20261003', at(11, 6, 8));
      const q3 = P('qna', '강의', '7차시 영상 소리가 끊깁니다', '12분 이후로 소리가 나오지 않습니다.', '20261001', at(10, 20, 19), { status: 'answered' });
      Dd().answers.push({ id: nid(), post: q3.id, pid: null, label: '교수자', body: '영상을 다시 올렸습니다. 새로 고침 후 확인해 주세요.', anonymous: false, accepted: true, at: at(10, 21, 9) });
      P('archive', '강의자료', '10차시 강의 슬라이드 — 트리와 탐색', '10차시 수업 자료입니다.', null, at(11, 2, 9)); P('archive', '참고자료', '중간고사 해설', '자주 틀린 문항 해설입니다.', null, at(11, 3, 11));
      P('counsel', '학업', '중간고사 점수 확인 요청', '3번 문항 채점 기준을 확인하고 싶습니다.', '20261004', at(11, 4, 17), { private: true });
      void q1; });
  });
  const ctx = (args, sec) => { const a = X.actor(sec, args); X.need(a, 'course.view'); return a; };
  const postOf = id => { const q = Dd().posts.find(x => x.id === id); if (!q || q.deleted_at) fail(404, 'post', '글을 찾을 수 없습니다.'); return q; };
  const seeOrFail = (q, a) => { if (!canSee(q, a)) fail(403, 'private', '작성자와 담당 교수자만 볼 수 있는 글입니다.'); };
  const D = X.demo.d = {};
  D.boards = args => { const sec = X.secOf(args.section).id; ensure(sec); const a = ctx(args, sec); const P = Dd().posts;
    return { me: { ...a, manage: X.can(a, 'board.manage'), write: X.can(a, 'board.write') }, boards: DEF.map(([k]) => boardOf(sec, k)).map(b => { const L = P.filter(q => q.board === b.id && canSee(q, a));
      return { id: b.id, kind: b.kind, name: b.name, categories: b.categories, posts: L.length, unread: a.pid ? L.filter(q => !Dd().reads.some(r => r.post === q.id && r.who === X.who(a))).length : 0, open: L.filter(q => ['qna', 'counsel'].includes(q.kind) && q.status === 'open').length }; }) }; };
  const bOf = id => { const b = Dd().boards.find(x => x.id === id); if (!b) fail(404, 'board', '게시판을 찾을 수 없습니다.'); return b; };
  D['board-save'] = args => { const b = bOf(args.board); X.need(ctx(args, b.sec), 'board.manage'); const c = args.categories; if (!Array.isArray(c) || c.length > 20 || c.some(x => typeof x !== 'string' || !x.trim() || x.length > 30)) fail(400, 'input', '카테고리는 30자 이내로 최대 20개입니다.'); b.categories = c.map(s => s.trim()); if (args.name) b.name = String(args.name).slice(0, 40); return { ok: true }; };
  const canWrite = (b, a) => b.kind === 'notice' || b.kind === 'archive' ? X.can(a, 'board.manage') : b.kind === 'counsel' ? X.can(a, 'board.write') && ['student', 'admin', 'professor'].includes(a.role) : X.can(a, 'board.write');
  D.posts = args => { const b = bOf(args.board); const a = ctx(args, b.sec); const cat = args.cat || null, k = args.q ? String(args.q).toLowerCase() : null; const pg = Math.max(1, +args.page || 1);
    const L = Dd().posts.filter(q => q.board === b.id && canSee(q, a) && (!cat || q.category === cat) && (!k || q.title.toLowerCase().includes(k) || q.body.toLowerCase().includes(k))).sort((x, y) => (y.pinned - x.pinned) || (x.at < y.at ? 1 : -1));
    return { board: { id: b.id, kind: b.kind, name: b.name, categories: b.categories }, can_write: canWrite(b, a), total: L.length, posts: L.slice((pg - 1) * 20, pg * 20).map(q => ({ id: q.id, category: q.category, title: q.title, author: nm(q.pid, q.label, q.anonymous, a), mine: mine(q.pid, a), pinned: q.pinned, private: q.private, anonymous: q.anonymous, status: q.status, files: q.files.length, created_at: q.at,
      reads: Dd().reads.filter(r => r.post === q.id && r.pid).length, read: Dd().reads.some(r => r.post === q.id && r.who === X.who(a)), answers: Dd().answers.filter(x => x.post === q.id && !x.deleted_at).length, comments: Dd().comments.filter(x => x.post === q.id && !x.deleted_at).length })) }; };
  D.post = args => { const q = postOf(args.id); const a = ctx(args, q.sec); seeOrFail(q, a); if (!Dd().reads.some(r => r.post === q.id && r.who === X.who(a))) Dd().reads.push({ post: q.id, who: X.who(a), pid: a.pid, at: nowIso() }); save();
    return { post: { id: q.id, board_id: q.board, kind: q.kind, category: q.category, title: q.title, body: q.body, author: nm(q.pid, q.label, q.anonymous, a), mine: mine(q.pid, a), pinned: q.pinned, private: q.private, anonymous: q.anonymous, status: q.status, files: q.files, copied_from: q.copied || null, created_at: q.at, updated_at: q.upd, reads: Dd().reads.filter(r => r.post === q.id && r.pid).length },
      can_answer: q.kind === 'qna' ? X.can(a, 'board.write') && (!q.private || X.mgr(a)) : q.kind === 'counsel' ? X.mgr(a) || mine(q.pid, a) : false, can_comment: ['notice', 'qna', 'archive'].includes(q.kind) && X.can(a, 'board.write'), manage: X.can(a, 'board.manage'),
      answers: Dd().answers.filter(x => x.post === q.id && !x.deleted_at).sort((x, y) => (y.accepted - x.accepted) || (x.at < y.at ? -1 : 1)).map(x => ({ id: x.id, author: nm(x.pid, x.label, x.anonymous, a), mine: mine(x.pid, a), body: x.body, accepted: x.accepted, anonymous: x.anonymous, created_at: x.at })),
      comments: Dd().comments.filter(x => x.post === q.id && !x.deleted_at).map(x => ({ id: x.id, author: nm(x.pid, x.label, x.anonymous, a), mine: mine(x.pid, a), body: x.body, created_at: x.at })) }; };
  X.gets('d', ['boards', 'posts', 'post', 'readers', 'outbox']);
  D.readers = args => { const q = postOf(args.id); const a = ctx(args, q.sec); seeOrFail(q, a); X.need(a, 'board.manage'); const en = X.secOf(q.sec).enroll.filter(e => e.status === 'enrolled'); const R = Dd().reads.filter(r => r.post === q.id && r.pid);
    return { read: R.map(r => ({ no: pno(r.pid), at: r.at })), unread: en.filter(e => !R.some(r => r.pid === e.pid)).map(e => pno(e.pid)).sort(), enrolled: en.length }; };
  D['post-save'] = args => { let q = args.id ? postOf(args.id) : null; const b = q ? bOf(q.board) : bOf(args.board); const a = ctx(args, b.sec); if (q) seeOrFail(q, a); const k = b.kind;
    if (!q) { X.need(a, ['notice', 'archive'].includes(k) ? 'board.manage' : 'board.write'); if (k === 'counsel' && !['student', 'admin', 'professor'].includes(a.role)) fail(403, 'role', '1:1 상담은 학생이 신청합니다.'); }
    else if (!(mine(q.pid, a) || (X.can(a, 'board.manage') && ['notice', 'archive'].includes(k)))) fail(403, 'owner', '내가 쓴 글만 고칠 수 있습니다.');
    const cat = X.str(args.category, 30); if (cat && !b.categories.includes(cat)) fail(400, 'input', '게시판에 없는 카테고리입니다.');
    const fl = Array.isArray(args.files) ? args.files : []; const F = X.db().files; if (fl.length > 10 || fl.some(f => !F.some(x => x.id === f.file_id && x.sec === b.sec))) fail(400, 'input', '첨부 파일을 확인하세요(이 강의실에 올린 파일 · 최대 10개).');
    const files = fl.map(f => { const x = F.find(y => y.id === f.file_id); return { file_id: x.id, name: x.name, size: x.size, mime: x.mime }; }); const title = X.str(args.title, 200, true, '제목'), body = X.str(args.body, 50000);
    if (!q) { q = { id: nid(), board: b.id, sec: b.sec, kind: k, category: cat, title, body, pid: a.pid, label: a.label, pinned: k === 'notice' && !!args.pinned, private: k === 'counsel' || (k === 'qna' && !!args.private), anonymous: k === 'qna' && !!args.anonymous, files, status: 'open', at: nowIso(), upd: nowIso() }; Dd().posts.push(q); }
    else Object.assign(q, { category: cat, title, body, files: 'files' in args ? files : q.files, private: k === 'qna' && args.private !== undefined ? !!args.private : q.private, anonymous: k === 'qna' && args.anonymous !== undefined ? !!args.anonymous : q.anonymous, upd: nowIso() });
    let n = 0; if (Array.isArray(args.notify) && k === 'notice') args.notify.filter(c => ['sms', 'mail'].includes(c)).forEach(c => { Dd().outbox.push({ id: Dd().outbox.length + 1, sec: b.sec, post: q.id, channel: c, targets: X.secOf(b.sec).enroll.filter(e => e.status === 'enrolled').length, title, status: 'queued', at: nowIso() }); n++; });
    return { ok: true, id: q.id, queued: n }; };
  D['post-del'] = args => { const q = postOf(args.id); const a = ctx(args, q.sec); seeOrFail(q, a); if (!(mine(q.pid, a) || X.can(a, 'board.manage'))) fail(403, 'owner', '내가 쓴 글만 지울 수 있습니다.'); q.deleted_at = nowIso(); return { ok: true }; };
  D['post-pin'] = args => { const q = postOf(args.id); const a = ctx(args, q.sec); X.need(a, 'board.manage'); if (q.kind !== 'notice') fail(400, 'input', '상단 고정은 공지에만 씁니다.'); q.pinned = args.pinned !== false; return { ok: true, pinned: q.pinned }; };
  D['post-copy'] = args => { const q = postOf(args.id); const a = ctx(args, q.sec); X.need(a, 'board.manage'); if (!['notice', 'archive'].includes(q.kind)) fail(400, 'input', '공지 · 자료실 글만 복제할 수 있습니다.'); const S2 = Array.isArray(args.sections) ? args.sections : []; if (!S2.length) fail(400, 'input', '복제할 강의실을 고르세요.');
    S2.forEach(sid => { if (sid === q.sec || !X.db().sections.some(s => s.id === sid)) fail(404, 'section', '복제할 강의실을 찾을 수 없습니다.'); X.need(X.actor(sid, args), 'board.manage'); ensure(sid); const b = boardOf(sid, q.kind);
      Dd().posts.push({ ...X.clone(q), id: nid(), board: b.id, sec: sid, category: b.categories.includes(q.category) ? q.category : '', pid: a.pid, label: a.label, files: [], copied: q.id, at: nowIso(), upd: nowIso() }); }); return { ok: true, copied: S2.length }; };
  D.answer = args => { const q = postOf(args.post); const a = ctx(args, q.sec); seeOrFail(q, a); if (!['qna', 'counsel'].includes(q.kind)) fail(400, 'input', 'Q&A · 상담 글에만 답변합니다.');
    if (q.kind === 'qna' && !(X.can(a, 'board.write') && (!q.private || X.mgr(a)))) fail(403, 'role', '비공개 질문은 담당 교수자만 답변합니다.'); if (q.kind === 'counsel' && !(X.mgr(a) || mine(q.pid, a))) fail(403, 'role', '상담 담당자만 답변합니다.'); if (q.status === 'closed') fail(409, 'closed', '종료된 상담입니다.');
    const x = { id: nid(), post: q.id, pid: a.pid, label: a.label, body: X.str(args.body, 20000, true, '답변'), anonymous: q.kind === 'qna' && !!args.anonymous, accepted: false, at: nowIso() }; Dd().answers.push(x); if (X.mgr(a) && q.status === 'open') q.status = 'answered'; return { ok: true, id: x.id }; };
  const ansOf = id => { const x = Dd().answers.find(y => y.id === id && !y.deleted_at); if (!x) fail(404, 'answer', '답변을 찾을 수 없습니다.'); return x; };
  D['answer-del'] = args => { const x = ansOf(args.id); const q = postOf(x.post); const a = ctx(args, q.sec); seeOrFail(q, a); if (!(mine(x.pid, a) || X.can(a, 'board.manage'))) fail(403, 'owner', '내가 쓴 답변만 지울 수 있습니다.'); x.deleted_at = nowIso(); return { ok: true }; };
  D['answer-accept'] = args => { const x = ansOf(args.id); const q = postOf(x.post); const a = ctx(args, q.sec); seeOrFail(q, a); if (!(mine(q.pid, a) || X.can(a, 'board.manage'))) fail(403, 'owner', '질문한 사람만 채택할 수 있습니다.'); Dd().answers.filter(y => y.post === q.id).forEach(y => { y.accepted = y === x; }); q.status = 'answered'; return { ok: true }; };
  D.comment = args => { const q = postOf(args.post); const a = ctx(args, q.sec); seeOrFail(q, a); if (q.kind === 'counsel') fail(400, 'input', '상담 글은 답변으로 이어 갑니다.'); X.need(a, 'board.write'); const x = { id: nid(), post: q.id, pid: a.pid, label: a.label, body: X.str(args.body, 4000, true, '댓글'), anonymous: !!args.anonymous, at: nowIso() }; Dd().comments.push(x); return { ok: true, id: x.id }; };
  D['comment-del'] = args => { const x = Dd().comments.find(y => y.id === args.id && !y.deleted_at); if (!x) fail(404, 'comment', '댓글을 찾을 수 없습니다.'); const q = postOf(x.post); const a = ctx(args, q.sec); seeOrFail(q, a); if (!(mine(x.pid, a) || X.can(a, 'board.manage'))) fail(403, 'owner', '내가 쓴 댓글만 지울 수 있습니다.'); x.deleted_at = nowIso(); return { ok: true }; };
  D['counsel-status'] = args => { const q = postOf(args.id); const a = ctx(args, q.sec); seeOrFail(q, a); if (!['open', 'answered', 'closed'].includes(args.status)) fail(400, 'input', '상태는 open · answered · closed입니다.'); if (!['counsel', 'qna'].includes(q.kind) || !(X.mgr(a) || mine(q.pid, a))) fail(403, 'role', '상담 담당자 또는 신청자만 바꿀 수 있습니다.'); q.status = args.status; return { ok: true, status: q.status }; };
  D.outbox = args => { const sec = X.secOf(args.section).id; const a = ctx(args, sec); X.need(a, 'board.manage'); return { items: Dd().outbox.filter(o => o.sec === sec).slice().reverse().map(o => ({ id: o.id, channel: o.channel, targets: o.targets, title: o.title, status: o.status, created_at: o.at })), note: 'SMS · 메일 실발송은 학교 문자 · 메일 시스템 연동 후 동작합니다. 지금은 발송 대기열에만 쌓입니다.' }; };
  X.exportHooks.d = sec => ({ posts: Dd().posts.filter(q => q.sec === sec && ['notice', 'archive'].includes(q.kind) && !q.deleted_at).map(q => ({ kind: q.kind, category: q.category, title: q.title, body: q.body, pinned: q.pinned, files: q.files })) });
  X.importHooks.d = (sec, d, repl, a) => { ensure(sec); if (repl) Dd().posts.filter(q => q.sec === sec && ['notice', 'archive'].includes(q.kind) && !q.deleted_at).forEach(q => { q.deleted_at = nowIso(); });
    (d.posts || []).filter(p => ['notice', 'archive'].includes(p.kind)).forEach(p => Dd().posts.push({ id: nid(), board: boardOf(sec, p.kind).id, sec, kind: p.kind, category: p.category || '', title: p.title, body: p.body || '', pid: null, label: a.label, pinned: !!p.pinned, private: false, anonymous: false, files: [], status: 'open', at: nowIso(), upd: nowIso() })); };

  /* ══════════ 화면 ══════════ */
  X.menu('lmsd', '강의 게시판', 'talk');
  const ST = { open: '접수', answered: '답변 완료', closed: '종료' };
  let CUR = {};
  async function viewD() {
    if (!X.sec) return X.head('강의 게시판', '강의실이 없습니다.', []) + '<div class="empty">강의실(분반)이 없습니다.</div>';
    const OV = await X.call('b', 'overview', { section: X.sec }); const Bs = await X.call('d', 'boards', { section: X.sec }); const me = Bs.me;
    const top = slimHead(X.head('강의 게시판', `공지 · Q&A · 자료실 · 1:1 상담 — 내 역할 <b>${esc(X.ROLE_N[me.role])}</b>`, [...OV.staff.map(s => ({ no: s.no, role: ({ co_professor: 'professor' })[s.role] || s.role })), ...OV.roster.map(r => ({ no: r.no, role: 'student' }))]));
    const tabsL = [...X.subTabs(Bs.boards.map(b => [b.kind, `${b.name}${b.unread ? ` (${b.unread})` : ''}`])), ...(me.manage ? [['outbox', '발송 대기열']] : [])];
    const tb = tabsL.some(t => t[0] === UI.lmsdT) ? UI.lmsdT : (tabsL[0] || ['none'])[0];
    /* 지금 할 일: 답하지 않은 Q&A · 1:1 상담, 새 글 */
    const openOf = async kind => { const bd = Bs.boards.find(x => x.kind === kind); if (!bd || X.hidden(kind)) return 0; try { const L = await X.call('d', 'posts', { board: bd.id, cat: '', q: '' }); return L.posts.filter(q => q.status === 'open').length; } catch (e) { return 0; } };
    const [nQ, nC] = me.manage || ['professor', 'ta'].includes(me.role) ? await Promise.all([openOf('qna'), openOf('counsel')]) : [0, 0]; const nNew = Bs.boards.reduce((a, b) => a + (b.unread || 0), 0);
    const todo = W().todo ? W().todo([{ n: nQ, t: '건 답변 대기 Q&A', btn: W().go('tab', '답하기', { key: 'lmsdT', v: 'qna' }) }, { n: nC, t: '건 1:1 상담 대기', btn: W().go('tab', '상담 열기', { key: 'lmsdT', v: 'counsel' }) }, { n: nNew, t: '건 안 읽은 글' }], '답할 질문 · 상담이 없습니다.') : '';
    let b = '';
    if (tb === 'outbox') { const O = await X.call('d', 'outbox', { section: X.sec }); b = `<div class="card"><div class="ch"><b>SMS · 메일 발송 대기열</b><small>${esc(O.note)}</small></div>${table(['때', '채널', '제목', '대상', '상태'], O.items.map(o => [fmt(o.created_at), o.channel === 'sms' ? 'SMS' : '메일', esc(o.title), o.targets + '명', tag(o.status === 'queued' ? '연동 후 발송' : o.status, 'y')]), '대기 중인 발송이 없습니다.')}</div>`; }
    else {
      const bd = Bs.boards.find(x => x.kind === tb) || Bs.boards[0]; const cat = CUR.cat && bd.categories.includes(CUR.cat) ? CUR.cat : ''; const L = await X.call('d', 'posts', { board: bd.id, cat, q: CUR.q || '' });
      b = `<div class="card"><div class="ch"><b>${esc(bd.name)}</b><small>${({ notice: '열람자 확인 · 상단 고정 · 카테고리 · 다른 분반에 복제', qna: '공개/비공개 · 여러 답변 · 실명/익명 · 채택', archive: '강의자료 · 참고자료 파일', counsel: '학생과 담당 교수자만 보는 1:1 상담' })[bd.kind]}</small>${L.can_write ? `<button class="btn sm pri" data-act="lmsd-new" data-b="${esc(bd.id)}" data-k="${bd.kind}">글쓰기</button>` : ''}${me.manage ? more(mi('lmsd-cats', '카테고리 관리', { b: bd.id, c: bd.categories.join(',') })) : ''}</div>
        <div class="bar2"><select data-chg="lmsd-cat"><option value="">전체 카테고리</option>${bd.categories.map(c => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><input data-lmsd-q placeholder="제목 · 내용 검색" value="${esc(CUR.q || '')}"><button class="btn sm" data-act="lmsd-search">검색</button><span class="mini">${L.total}건</span></div>
        ${table(['', '제목', '작성', '때', bd.kind === 'notice' ? '열람' : bd.kind === 'archive' ? '파일' : '답변'], L.posts.map(q => [`${q.pinned ? tag('고정', 'mg') : ''}${q.read ? '' : tag('새 글', 'g')}`, `<a href="#" data-act="lmsd-open" data-id="${esc(q.id)}">${q.category ? `[${esc(q.category)}] ` : ''}${esc(q.title)}</a>${q.private ? ' ' + tag('비공개') : ''}${['qna', 'counsel'].includes(bd.kind) ? ' ' + tag(ST[q.status], q.status === 'open' ? 'y' : 'g') : ''}${q.comments ? ` <small class="mini">댓글 ${q.comments}</small>` : ''}`, esc(q.author), fmt(q.created_at), bd.kind === 'notice' ? q.reads + '명' : bd.kind === 'archive' ? q.files : q.answers]), '글이 없습니다.')}</div>`;
      if (CUR.post) { try { const P = await X.call('d', 'post', { id: CUR.post }); const q = P.post; if (q.board_id === bd.id) {
        b += `<div class="card"><div class="ch"><b>${q.category ? `[${esc(q.category)}] ` : ''}${esc(q.title)}</b><small>${esc(q.author)} · ${fmt(q.created_at)} · 열람 ${q.reads}명${q.copied_from ? ' · 복제된 글' : ''}</small>
          ${more((P.manage && q.kind === 'notice' ? mi('lmsd-pin', q.pinned ? '고정 해제' : '상단 고정', { id: q.id, p: q.pinned ? 0 : 1 }) + mi('lmsd-readers', '열람자 보기', { id: q.id }) : '') + (P.manage && ['notice', 'archive'].includes(q.kind) ? mi('lmsd-copy', '다른 분반에 복제', { id: q.id }) : '') + (q.mine ? mi('lmsd-edit', '수정', { id: q.id }) : '') + (q.mine || P.manage ? mi('lmsd-del', '삭제', { id: q.id }) : ''))}
          ${['counsel', 'qna'].includes(q.kind) && (q.mine || ['admin', 'professor', 'ta', 'staff'].includes(me.role)) ? `<select data-chg="lmsd-status" data-id="${esc(q.id)}">${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${q.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}</div>
          <div class="lmsx-body">${esc(q.body)}</div>${q.files.map(f => `<button class="btn sm" data-act="lmsd-dl" data-f="${esc(f.file_id)}">${esc(f.name)} (${Math.ceil(f.size / 1024)}KB)</button>`).join(' ')}<div data-lmsd-readers></div>
          ${['qna', 'counsel'].includes(q.kind) ? `<div class="ch"><b>답변 ${P.answers.length}</b></div>${P.answers.map(x => `<div class="lmsx-post reply ${x.accepted ? 'pin' : ''}"><div class="lmsx-meta"><b>${esc(x.author)}</b><span>${fmt(x.created_at)}</span>${x.accepted ? tag('채택', 'g') : ''}${(q.mine || P.manage) && q.kind === 'qna' && !x.accepted ? `<button class="btn sm ghost" data-act="lmsd-accept" data-id="${esc(x.id)}">채택</button>` : ''}${x.mine || P.manage ? `<button class="btn sm ghost redl" data-act="lmsd-ans-del" data-id="${esc(x.id)}">삭제</button>` : ''}</div><div class="lmsx-body">${esc(x.body)}</div></div>`).join('')}
            ${P.can_answer && q.status !== 'closed' ? `<div class="lmsx-new"><textarea data-lmsd-ans rows="3" placeholder="답변"></textarea>${q.kind === 'qna' ? '<label class="ul-ck"><input type="checkbox" data-lmsd-ansanon> 익명</label>' : ''}<button class="btn sm pri" data-act="lmsd-answer" data-id="${esc(q.id)}">답변 올리기</button></div>` : ''}` : ''}
          ${q.kind !== 'counsel' ? `<div class="ch"><b>댓글 ${P.comments.length}</b></div>${P.comments.map(x => `<div class="lmsx-meta"><b>${esc(x.author)}</b> ${esc(x.body)} <span>${fmt(x.created_at)}</span>${x.mine || P.manage ? `<a href="#" data-act="lmsd-cm-del" data-id="${esc(x.id)}">삭제</a>` : ''}</div>`).join('')}
            ${P.can_comment ? `<div class="bar2"><input data-lmsd-cm placeholder="댓글" maxlength="4000" style="flex:1"><label class="ul-ck"><input type="checkbox" data-lmsd-cmanon> 익명</label><button class="btn sm" data-act="lmsd-comment" data-id="${esc(q.id)}">등록</button></div>` : ''}` : ''}</div>`; } } catch (e) { CUR.post = null; } }
    }
    return top + todo + `<div class="lmsb-tabs">${W().tabs ? W().tabs('lmsdT', tabsL, tb) : tabs('lmsdT', tabsL, tb)}</div>` + b;
  }
  /* 2단계 단순화(화면만): 공용 머리(X.head, b.js)의 신분 전환은 「다른 신분으로 보기」 접기로, 긴 연동 안내는 작은 데모 표시로 바꾼다 */
  function W() { return window.LW4 || {}; }
  function more(items) { return W().more ? W().more(items) : items; }
  function mi(act, label, data) { return W().mi ? W().mi(act, label, data) : `<button class="btn sm ghost" data-act="${act}"${Object.entries(data || {}).map(([k, v]) => ` data-${k}="${esc(String(v))}"`).join('')}>${esc(label)}</button>`; }
  function slimHead(h) {
    h = h.replace(/<p class="mini lmsx-note">[\s\S]*?<\/p>/, LIVE_ON2() ? '' : `<p class="mini lmsx-note">${W().demoTag ? W().demoTag(false) : '데모: 브라우저에만 저장'}</p>`);
    return h.replace(/(<div class="lmsx-pick">)(<label>강의실<select[\s\S]*?<\/select><\/label>)\s*([\s\S]*?<button class="btn sm" data-act="lmsx-asgo">전환<\/button>)<\/div>/, (m, a, sec, as) => `${a}${sec}</div><details class="lmsd-as"${X.as ? ' open' : ''}><summary>다른 신분으로 보기(교수 · 조교 · 학생 화면 확인)${X.as ? ' — 지금 ' + esc(X.as) : ''}</summary><div class="lmsx-pick">${as}</div></details>`);
  }
  function LIVE_ON2() { return typeof LIVE !== 'undefined' && !!(LIVE && (LIVE.user || LIVE.tenant)); }
  X.mount('lmsd', viewD);
  const R = (op, args, msg) => X.run('d', op, args, msg).then(r => { if (r) X.refresh(); return r; });
  const formFiles = async inp => { const out = []; for (const f of [...(inp && inp.files || [])]) { const r = await X.call('b', 'file-put', { section: X.sec, name: f.name, mime: f.type || 'application/octet-stream', b64: X.b64of(new Uint8Array(await f.arrayBuffer())) }); out.push({ file_id: r.id }); } return out; };
  async function postModal(bd, kind, q) {
    const B = (await X.call('d', 'boards', { section: X.sec })).boards.find(x => x.id === bd);
    modal(q ? '글 수정' : `${B.name} 글쓰기`, `<div class="form2"><label>카테고리<select name="c"><option value="">없음</option>${B.categories.map(c => `<option ${q && q.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label>제목<input name="t" maxlength="200" value="${esc(q ? q.title : '')}"></label></div><label>내용<textarea name="b" rows="6">${esc(q ? q.body : '')}</textarea></label>
      ${['notice', 'archive', 'qna'].includes(kind) && !q ? `<label>첨부(파일당 ${X.live() ? '3MB' : '300KB(데모)'})<input type="file" name="f" multiple></label>` : ''}
      ${kind === 'notice' && !q ? '<label class="ul-ck"><input type="checkbox" name="pin"> 상단 고정</label><label class="ul-ck"><input type="checkbox" name="sms"> SMS 알림</label><label class="ul-ck"><input type="checkbox" name="mail"> 메일 알림</label><p class="mini">SMS · 메일은 발송 대기열에 쌓이고, 학교 문자 · 메일 시스템 연동 후 실제로 보냅니다.</p>' : ''}
      ${kind === 'qna' ? `<label class="ul-ck"><input type="checkbox" name="pv" ${q && q.private ? 'checked' : ''}> 비공개(교수자만 보기)</label><label class="ul-ck"><input type="checkbox" name="an" ${q && q.anonymous ? 'checked' : ''}> 익명(교수에게는 실명)</label>` : ''}${kind === 'counsel' ? '<p class="mini">상담 글은 나와 담당 교수 · 조교만 봅니다.</p>' : ''}`,
      [{ id: 'ok', label: '저장', kind: 'pri', run: m => { (async () => { const files = q ? undefined : await formFiles(m.querySelector('[name=f]'));
        const r = await X.call('d', 'post-save', { ...(q ? { id: q.id } : { board: bd }), category: fv(m, 'c'), title: fv(m, 't'), body: m.querySelector('[name=b]').value, ...(files ? { files } : {}), pinned: fv(m, 'pin'), private: fv(m, 'pv'), anonymous: fv(m, 'an'), notify: [fv(m, 'sms') && 'sms', fv(m, 'mail') && 'mail'].filter(Boolean) });
        closeModal(); toast(r.queued ? `올렸습니다. 알림 ${r.queued}건은 발송 대기열에 넣었습니다.` : '올렸습니다.', 'ok'); CUR.post = r.id; X.refresh(); })().catch(X.err); return false; } }], true);
  }
  ACT['lmsd-new'] = el => postModal(el.dataset.b, el.dataset.k);
  ACT['lmsd-edit'] = async el => { const P = await X.run('d', 'post', { id: el.dataset.id }); if (P) postModal(P.post.board_id, P.post.kind, P.post); };
  ACT['lmsd-open'] = el => { CUR.post = el.dataset.id; X.refresh(); };
  ACT['lmsd-cat'] = el => { CUR.cat = el.value; X.refresh(); };
  ACT['lmsd-search'] = () => { CUR.q = ($('[data-lmsd-q]') || {}).value || ''; X.refresh(); };
  ACT['lmsd-cats'] = el => modal('카테고리', `<label>쉼표로 구분<input name="c" value="${esc(el.dataset.c)}"></label>`, [{ id: 'ok', label: '저장', kind: 'pri', run: m => { R('board-save', { board: el.dataset.b, categories: fv(m, 'c').split(',').map(s => s.trim()).filter(Boolean) }, '카테고리를 저장했습니다.'); } }]);
  ACT['lmsd-pin'] = el => R('post-pin', { id: el.dataset.id, pinned: el.dataset.p === '1' }, el.dataset.p === '1' ? '상단에 고정했습니다.' : '고정을 풀었습니다.');
  ACT['lmsd-readers'] = async el => { const r = await X.run('d', 'readers', { id: el.dataset.id }); if (!r) return; const box = $('[data-lmsd-readers]'); if (box) box.innerHTML = `<div class="ch"><b>열람 ${r.read.length}/${r.enrolled}명</b></div><p class="mini">읽음: ${r.read.map(x => `${esc(x.no)}(${fmt(x.at)})`).join(', ') || '없음'}</p><p class="mini">안 읽음: ${r.unread.map(esc).join(', ') || '없음'}</p>`; };
  ACT['lmsd-copy'] = el => { const ss = (X.sections || []).filter(s => s.id !== X.sec); modal('다른 분반에 복제', `<div class="lmsb-cks">${ss.map(s => `<label class="ul-ck"><input type="checkbox" name="s" value="${esc(s.id)}"> ${esc(s.term)} · ${esc(s.title)}</label>`).join('') || '<span class="mini">다른 강의실이 없습니다.</span>'}</div>`, [{ id: 'ok', label: '복제', kind: 'pri', run: m => { R('post-copy', { id: el.dataset.id, sections: $$('[name=s]:checked', m).map(i => i.value) }).then(r => r && toast(`${r.copied}개 분반에 복제했습니다.`, 'ok')); } }]); };
  ACT['lmsd-del'] = el => { if (confirm('글을 지울까요?')) R('post-del', { id: el.dataset.id }, '지웠습니다.').then(r => { if (r) CUR.post = null; }); };
  ACT['lmsd-status'] = el => R('counsel-status', { id: el.dataset.id, status: el.value }, '상태를 바꿨습니다.');
  ACT['lmsd-answer'] = el => R('answer', { post: el.dataset.id, body: ($('[data-lmsd-ans]') || {}).value || '', anonymous: !!($('[data-lmsd-ansanon]') || {}).checked }, '답변을 올렸습니다.');
  ACT['lmsd-accept'] = el => R('answer-accept', { id: el.dataset.id }, '채택했습니다.');
  ACT['lmsd-ans-del'] = el => R('answer-del', { id: el.dataset.id }, '지웠습니다.');
  ACT['lmsd-comment'] = el => R('comment', { post: el.dataset.id, body: ($('[data-lmsd-cm]') || {}).value || '', anonymous: !!($('[data-lmsd-cmanon]') || {}).checked }, '댓글을 달았습니다.');
  ACT['lmsd-cm-del'] = el => R('comment-del', { id: el.dataset.id }, '지웠습니다.');
  ACT['lmsd-dl'] = el => X.download(el.dataset.f);
})();
