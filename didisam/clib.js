/* v35 C4 콘텐츠 라이브러리(clib) — 과정 만들기 개편(BRIEF_CRS.md)
   대표님(2026-11-09): '콘텐츠 라이브러리를 별도로 두고, 거기서도 업로드 · 교안 · AI 강의 영상 · 디지털북 만들기를 자연스럽게'.
   - 새 메뉴 '콘텐츠 라이브러리'(학습 › clib): 모든 과정의 콘텐츠 + 단독 콘텐츠(S.clib) + 예전 보관함(S.lib) + 디지털북(LSV().dbooks)을 한곳에서.
   - 위에 [만들기] 하나 → 종류 카드(올리기 · AI 강의 영상 · 교안 · 퀴즈 · 디지털북 · YouTube) → CT.open(kind, {from:'lib'}) (C3, 없으면 아래 임시 함수).
   - 카드마다 '사용 중: ○○ 2차시' + [과정에 넣기](과정 → 차시 고르기 → curriculum에 항목 추가) [미리보기] [고치기].
   - 예전 '영상 · 자료'(library) · '디지털북'(dbook) 메뉴는 숨기고(한 번만), go('library' | 'dbook')는 이 화면 안으로 연결한다. 데이터는 그대로.
   - 학사 LMS(univ_lms)의 강의 영상(녹화 · 자막 · 학사 전송)은 '강의 영상 관리'(lmsv)가 맡는다 — 여기서는 안내 줄로 연결만 한다.
   window.CLIB: all() · add(item) · use(item) · put(item, classId, {week|after}) */
(function () {
  'use strict';
  if (typeof MENU !== 'object' || typeof VIEWS !== 'object') return;

  /* ── 아이콘(이 화면 전용 이름 — 다른 화면의 빈 아이콘을 바꾸지 않는다) ── */
  Object.assign(IC, {
    clplay: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
    cldoc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    clquiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01"/>',
    clfile: '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    clup: '<path d="M12 16V5M7 10l5-5 5 5M5 19h14"/>',
    clyt: '<rect x="2.5" y="6" width="19" height="12" rx="4"/><path d="M10.5 9.5l4 2.5-4 2.5z"/>',
    clplus: '<path d="M12 5v14M5 12h14"/>',
    clsearch: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
  });

  /* ── 종류 ── */
  const KIND = { video: ['영상', 'clplay', 'v'], doc: ['교안', 'cldoc', 'd'], quiz: ['퀴즈', 'clquiz', 'q'], assign: ['과제', 'cldoc', 'q'], book: ['디지털북', 'book', 'b'], file: ['파일', 'clfile', 'f'] };
  const TABS = [['all', '전체'], ['video', '영상'], ['doc', '교안'], ['quiz', '퀴즈 · 과제'], ['book', '디지털북'], ['file', '파일']];
  const inTab = (e, tb) => tb === 'all' || e.kind === tb || (tb === 'quiz' && e.kind === 'assign');
  /* [만들기] 종류 카드 — C3 CT.kinds가 있으면 이름 · 설명을 그쪽 것으로 맞춘다 */
  const MAKE = [
    ['upload', '올리기', 'clup', '가진 영상 · 문서 파일을 올려요', '1분'],
    ['aivideo', 'AI 강의 영상', 'clplay', '주제만 쓰면 AI가 슬라이드 강의를 만들어요', '약 1분'],
    ['doc', '교안', 'cldoc', '주제만 쓰면 AI가 수업 자료를 써요', '약 1분'],
    ['quiz', '퀴즈', 'clquiz', '주제만 쓰면 AI가 문제 5개를 내요', '30초'],
    ['book', '디지털북', 'book', '읽고 풀며 배우는 교재를 AI가 엮어요', '약 2분'],
    ['youtube', 'YouTube', 'clyt', '유튜브 주소를 붙여 넣어요', '30초']
  ];
  const EX = { k12: '분수의 덧셈과 뺄셈', univ: '생성형 AI의 이해와 활용', corp: '개인정보 보호 기본 수칙', adult: '엑셀 피벗 테이블로 매출 정리하기', lifelong: '스마트폰으로 사진 정리하기', voc: '전기 작업 안전 수칙', public: '청렴 · 공정한 업무 처리' };
  const exTopic = () => { try { const c = (S.classes || []).find(x => (x.weekPlan || []).length) || (S.classes || [])[0]; const w = c && (c.weekPlan || []).find(x => x.title && !/^\d+(차시|주)$/.test(x.title)); if (w) return w.title; } catch (e) { } return EX[S && S.org && S.org.type] || EX.adult; };
  const ULMS_ = () => !!(S && S.org && S.org.type === 'univ' && S.org.ed === 'lms');
  const cname = () => (typeof t === 'function' ? t('cls') : '과정');
  const josa = (w, a, b) => { const c = String(w || '').slice(-1).charCodeAt(0) - 44032; return c >= 0 && c <= 11171 && c % 28 ? a : b; };

  /* ── 위치 이름: 'N차시' / 대학 주차는 'N주차' ── */
  function posLabel(c, it) {
    if (it.week) return `${it.week}${c.weekly && S.org.type === 'univ' ? '주차' : '차시'}`;
    const L = (c.curriculum || []).filter(x => x.type !== 'chapter'); const i = L.indexOf(it); return i >= 0 ? `${i + 1}차시` : '';
  }
  const kindOfItem = it => it.type === 'video' ? 'video' : it.type === 'doc' ? ((it.doc && (it.doc.secs || []).length) || !(it.files || it.fileId) ? 'doc' : 'file') : ['quiz', 'exam'].includes(it.type) ? 'quiz' : it.type === 'assign' ? 'assign' : '';
  const libKind = l => ['동영상', 'YouTube'].includes(l.kind) ? 'video' : l.kind === '평가' ? (l.item && l.item.type === 'assign' ? 'assign' : 'quiz') : 'file';
  const books = () => { try { return typeof LSV === 'function' ? (LSV().dbooks || []) : []; } catch (e) { return []; } };

  /* ── 목록: 단독(S.clib) · 디지털북 · 예전 보관함(S.lib) · 과정 항목 ── */
  function usesOf(e) {
    if (e.origin === 'course') return [{ c: e.c, it: e.it }];
    if (e.origin === 'book') { const c = e.ref.cls && C(e.ref.cls); return c ? [{ c, it: null }] : []; }
    if (e.origin === 'lib') { try { if (typeof a2LibUse === 'function') return a2LibUse(e.ref).map(x => ({ c: x.c, it: x.it })); } catch (er) { } return (e.ref.cls || []).map(id => C(id)).filter(Boolean).map(c => ({ c, it: null })); }
    const id = e.ref.id; return (S.classes || []).flatMap(c => (c.curriculum || []).filter(it => it.clib === id).map(it => ({ c, it })));
  }
  const useLabel = u => `${u.c.name}${u.it ? ' ' + posLabel(u.c, u.it) : ''}`;
  function all() {
    if (!S) return [];
    const out = [];
    (S.clib || []).forEach(x => out.push({ key: 'cl:' + x.id, origin: 'clib', kind: KIND[x.kind] ? x.kind : 'file', title: x.title || '이름 없는 콘텐츠', at: x.at || '', ref: x }));
    books().filter(b => (b.chs || []).length || b.url).forEach(b => out.push({ key: 'bk:' + b.id, origin: 'book', kind: 'book', title: b.title, at: b.at || '', ref: b }));
    (S.lib || []).forEach(l => out.push({ key: 'lb:' + l.id, origin: 'lib', kind: libKind(l), title: String(l.name || '').replace(/\.(mp4|webm|mov)$/i, ''), at: l.at || '', ref: l }));
    (S.classes || []).forEach(c => (c.curriculum || []).forEach(it => { if (it.clib || it.lib) return; const k = kindOfItem(it); if (!k) return; out.push({ key: 'it:' + c.id + ':' + it.id, origin: 'course', kind: k, title: it.title || ITEMX[it.type] || '항목', at: '', ref: it, it, c }); }));
    out.forEach(e => { e.uses = usesOf(e); });
    return out;
  }
  const byKey = k => all().find(e => e.key === k);
  const subOf = e => {
    const r = e.ref;
    if (e.origin === 'book') return `${(r.chs || []).length}단원`;
    if (e.origin === 'lib') return [r.kind === '평가' ? r.sub || '평가' : r.kind === '동영상' ? '올린 영상' : r.kind, r.size && r.size !== '—' ? r.size : ''].filter(Boolean).join(' · ');
    const src = r.src === 'ai' ? 'AI로 만든 영상' : r.src === 'youtube' ? 'YouTube' : r.src === 'upload' || r.src === 'library' ? '올린 영상' : '';
    if (e.kind === 'video') return [src || '영상', r.ai && r.ai.mins ? `${r.ai.mins}분` : ''].filter(Boolean).join(' · ');
    if (e.kind === 'doc') return `교안${r.doc && (r.doc.secs || []).length ? ` · ${(r.doc.secs || []).length}절` : ''}`;
    if (e.kind === 'quiz') return `퀴즈 · ${(r.qs || []).length}문항`;
    if (e.kind === 'assign') return '과제';
    return ['파일', r.size || (r.files && r.files[0] && r.files[0].name) || ''].filter(Boolean).join(' · ');
  };

  /* ── 추가: CT.open의 onDone(item) 결과(과정 항목 모양이든 clib 모양이든)를 S.clib에 넣는다 ── */
  function add(x) {
    if (!S || !x) return null; S.clib = Array.isArray(S.clib) ? S.clib : [];
    const o = JSON.parse(JSON.stringify(x)); delete o.week;
    let kind = KIND[o.kind] ? o.kind : (o.type ? kindOfItem(o) : '') || (o.book ? 'book' : o.src === 'youtube' || o.src === 'ai' ? 'video' : 'file');
    if (o.type === 'book') kind = 'book';
    if (kind === 'book') { /* 디지털북은 학습자 화면이 읽는 곳(LSV().dbooks)에 둔다 — S.clib에 겹쳐 두지 않는다 */
      const id = o.bookId || (o.book && o.book.id) || o.id; let b = id && books().find(y => y.id === id);
      if (!b && o.book && Array.isArray(o.book.chs) && typeof LSV === 'function') { b = typeof bkNorm === 'function' ? bkNorm(o.book) : o.book; LSV().dbooks.push(b); }
      save(); return b ? { kind: 'book', id: b.id, title: b.title, book: b } : null; }
    const it = { ...o, id: o.id && /^cl/.test(o.id) ? o.id : uid('cl'), kind, title: String(o.title || o.name || (KIND[kind] || KIND.file)[0]).slice(0, 80), at: o.at || today(), usedIn: Array.isArray(o.usedIn) ? o.usedIn : [] };
    if (!it.type) it.type = kind === 'video' ? 'video' : kind === 'quiz' ? 'quiz' : kind === 'assign' ? 'assign' : 'doc';
    const at = S.clib.findIndex(y => y.id === it.id); if (at >= 0) S.clib[at] = it; else S.clib.unshift(it);
    save(); return it;
  }

  /* ── 과정 항목으로 바꾸기(학습자 게시본 lsSnapshot이 읽는 기존 필드만) ── */
  function toItem(e) {
    const r = JSON.parse(JSON.stringify(e.ref));
    if (e.origin === 'course') { delete r.week; return { ...r, id: uid('it') }; }
    if (e.origin === 'lib') { const l = e.ref;
      if (l.kind === '평가') { const it = { ...JSON.parse(JSON.stringify(l.item || { type: 'quiz', title: l.name })), id: uid('it') }; delete it.week; return it; }
      if (l.kind === 'YouTube') return { id: uid('it'), type: 'video', title: l.name, src: 'youtube', url: /^https:/.test(l.name) ? l.name : (l.url || '') };
      if (l.kind === '동영상') return { id: uid('it'), type: 'video', title: e.title, src: 'library', lib: l.id, url: 'lib:' + l.id };
      return { id: uid('it'), type: 'doc', title: String(l.name).replace(/\.\w+$/, ''), files: [{ name: l.name, size: (typeof a2Bytes === 'function' ? a2Bytes(l) : l.bytes) || 0 }], lib: l.id }; }
    const x = r; const it = { id: uid('it'), title: x.title, clib: x.id };
    if (x.kind === 'video') Object.assign(it, { type: 'video', src: x.src || (x.ai ? 'ai' : x.url ? 'youtube' : 'upload') }, x.ai ? { ai: x.ai } : {}, x.url ? { url: x.url } : {}, x.src === 'ai' && !x.url ? { url: 'ai:' + it.id } : {}, x.q ? { q: x.q } : {}, x.subs ? { subs: x.subs } : {}, x.fileId ? { fileId: x.fileId } : {}, x.file || x.src === 'upload' ? { file: x.file || x.title, fsize: x.bytes || x.fsize || 0 } : {}, x.dur ? { dur: x.dur } : {});
    else if (x.kind === 'doc') Object.assign(it, { type: 'doc', topic: x.topic || x.title }, x.doc ? { doc: x.doc } : {}, x.fmt ? { fmt: x.fmt } : {}, x.files ? { files: x.files } : {});
    else if (x.kind === 'quiz') Object.assign(it, { type: x.type === 'exam' ? 'exam' : 'quiz', qs: x.qs || [], time: x.time || 10, retake: x.retake || 3 });
    else if (x.kind === 'assign') Object.assign(it, { type: 'assign', desc: x.desc || '' }, x.rubric ? { rubric: x.rubric } : {}, x.due ? { due: x.due } : {});
    else Object.assign(it, { type: 'doc', files: x.files || [{ name: x.file || x.title, size: x.bytes || 0 }] }, x.url ? { url: x.url } : {}, x.fileId ? { fileId: x.fileId } : {});
    return it;
  }
  /* 과정에 넣기: pos = { week } (차시 목록이 있는 과정) | { after: 항목 index } | 없으면 맨 끝 */
  function put(e, classId, pos = {}) {
    if (typeof e === 'string') e = byKey(e) || byKey('cl:' + e); const c = C(classId); if (!e || !c) return null;
    if (e.origin === 'book') { e.ref.cls = c.id; save(); return { book: e.ref, c }; }
    const it = toItem(e); const L = c.curriculum = c.curriculum || [];
    if (pos.week && (c.weekly || L.some(x => x.week))) { it.week = +pos.week; let at = -1; L.forEach((x, i) => { if (x.week === it.week) at = i; }); if (at < 0) { L.forEach((x, i) => { if ((x.week || 0) < it.week) at = i; }); } L.splice(at + 1, 0, it); }
    else if (pos.after != null && pos.after >= -1 && pos.after < L.length) { if (c.weekly && L[pos.after]) it.week = L[pos.after].week; L.splice(pos.after + 1, 0, it); }
    else { if (c.weekly) it.week = Math.max(1, ...L.map(x => x.week || 0)); L.push(it); }
    if (e.origin === 'clib') e.ref.usedIn = [...new Set([...(e.ref.usedIn || []), c.id])];
    if (e.origin === 'lib') { e.ref.cls = [...new Set([...(e.ref.cls || []), c.id])]; e.ref.used = (e.ref.used || 0) + 1; try { if (it.src === 'library' && typeof a2ConvOf === 'function') a2ConvOf(e.ref); } catch (er) { } }
    try { logAudit(`콘텐츠 라이브러리 → ${c.name} — ${it.title}`); } catch (er) { }
    save(); return { it, c };
  }
  window.CLIB = { all, add, use: x => usesOf(x && x.origin ? x : { origin: 'clib', ref: x || {} }), put, kinds: KIND };

  /* ── 임시 콘텐츠 도구(C3 CT가 오기 전) — 같은 이름 CT.open(kind, ctx) ── */
  const TMP = { __clibTmp: true, kinds: MAKE.map(([k, n, icon, d, time]) => ({ k, n, icon, d, time })), open: tmpOpen };
  if (!window.CT) window.CT = TMP;
  const CTX = () => (window.CT && typeof window.CT.open === 'function' ? window.CT : TMP);
  function ask(title, label, ex, run, more = '') {
    const w = modal(title, `<div class="clb-ask"><label class="fl clb-fl">${esc(label)}<input name="t" maxlength="80" autocomplete="off"></label><p class="clb-ex">예: ${esc(ex)}</p>
      <button type="button" class="btn ai clb-fillbtn" data-act="clb-fill" data-v="${esc(ex)}">${ic('spark', 16)} AI SAM이 채워 주기</button>${more}</div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const v = fv(w, 't'); if (!v) { toast('주제를 한 줄로 적어 주세요. [AI SAM이 채워 주기]를 눌러도 됩니다.', 'warn'); const i = w.querySelector('[name=t]'); i && i.focus(); return false; } return run(v, w); } }]);
    return w;
  }
  ACT['clb-fill'] = el => { const w = el.closest('.modal'); const i = w && w.querySelector('[name=t]'); if (i) { i.value = el.dataset.v; i.focus(); } };
  function tmpOpen(kind, ctx = {}) {
    const done = x => { try { (ctx.onDone || (y => add(y)))(x); } catch (e) { console.error(e); } };
    const ed = ctx.item; /* 고치기: 같은 종류 도구를 열고 제목 · 주제를 채워 둔다 */
    const topic = ed ? String(ed.title || '').replace(/ (AI 강의 영상|교안|퀴즈|디지털북)$/, '') : '';
    const preset = w => { if (topic) { const i = w.querySelector('[name=t]'); if (i) i.value = topic; } return w; };
    if (kind === 'upload') { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'video/*,audio/*,.pdf,.hwp,.hwpx,.ppt,.pptx,.doc,.docx,.xls,.xlsx,image/*'; inp.hidden = true; document.body.appendChild(inp);
      inp.addEventListener('change', () => { const F = [...inp.files]; F.forEach(f => { const vid = /^video\//.test(f.type); if (vid && f.size > 4 * 1024 ** 3) { toast(`${f.name}: 영상은 4GB까지 올릴 수 있습니다.`, 'warn'); return; }
        done({ kind: vid ? 'video' : 'file', src: 'upload', title: f.name.replace(/\.\w+$/, '').slice(0, 80), file: f.name, bytes: f.size, size: typeof a2Size === 'function' ? a2Size(f.size) : `${Math.round(f.size / 1024)}KB`, mime: f.type }); });
        inp.remove(); if (F.length) toast(`${F.length}개를 올렸습니다. (데모: 파일 이름 · 크기만 기록합니다)`, 'ok'); }); inp.click(); return; }
    if (kind === 'youtube') { const w = modal('YouTube 영상 넣기', `<div class="clb-ask"><label class="fl clb-fl">YouTube 주소<input name="u" inputmode="url" autocomplete="off" value="${esc(ed && ed.url || '')}"></label><p class="clb-ex">예: https://youtu.be/abcdefghijk</p><label class="fl clb-fl">제목 <small class="clb-later">나중에 해도 돼요</small><input name="t" maxlength="80" value="${esc(ed && ed.title || '')}"></label></div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '넣기', kind: 'pri', run: w => { const u = fv(w, 'u'); if (!/^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/.test(u)) { toast('YouTube 주소를 확인해 주세요. 예: https://youtu.be/abcdefghijk', 'warn'); return false; } done({ ...(ed || {}), kind: 'video', src: 'youtube', url: u, title: fv(w, 't') || 'YouTube 영상' }); toast('YouTube 영상을 넣었습니다.', 'ok'); } }]); return w; }
    if (kind === 'aivideo') return preset(ask(ed ? 'AI 강의 영상 고치기' : 'AI 강의 영상 만들기', '무엇을 설명하는 영상인가요?', exTopic(), v => { const sc = AI.lecture(v, 5); S.ai && S.ai.usage++; done({ ...(ed || {}), kind: 'video', src: 'ai', title: `${v} AI 강의 영상`, ai: { scenes: sc, mins: 5, voice: 'f' } }); toast(`AI 강의 영상(장면 ${sc.length}개)을 만들었습니다. [미리보기]로 확인하세요.`, 'ok'); }, '<p class="mini clb-honest">미리보기 품질입니다 — 브라우저 음성 · 슬라이드로 재생합니다.</p>'));
    if (kind === 'doc') return preset(ask(ed ? '교안 고치기' : '교안 만들기', '어떤 내용의 교안인가요?', exTopic(), v => { const d = AI.material(v); S.ai && S.ai.usage++; done({ ...(ed || {}), kind: 'doc', title: `${v} 교안`, topic: v, doc: d }); toast(`교안 ${d.secs.length}절을 만들었습니다.`, 'ok'); }));
    if (kind === 'quiz') return preset(ask(ed ? '퀴즈 고치기' : '퀴즈 만들기', '무엇을 확인하는 퀴즈인가요?', exTopic(), v => { const qs = AI.questions(v, 5); S.ai && S.ai.usage++; done({ ...(ed || {}), kind: 'quiz', type: 'quiz', title: `${v} 퀴즈`, qs, time: 10 }); toast(`퀴즈 ${qs.length}문항을 만들었습니다.`, 'ok'); }));
    if (kind === 'assign') return preset(ask(ed ? '과제 고치기' : '과제 만들기', '어떤 과제인가요?', exTopic(), v => { const a = AI.assignment(v); done({ ...(ed || {}), kind: 'assign', type: 'assign', title: `${v} 과제`, desc: a.desc }); toast('과제를 만들었습니다.', 'ok'); }));
    if (kind === 'book') { if (ed && ed.id && typeof bkOpen === 'function' && books().some(b => b.id === ed.id)) { bkOpen(ed.id); return; }
      return ask('디지털북 만들기', '어떤 주제의 교재인가요?', exTopic(), v => { if (typeof bkAIDraft !== 'function') { toast('디지털북 도구를 불러오지 못했습니다.', 'warn'); return; } const b = bkAIDraft(v, 3); S.ai && S.ai.usage++; done({ kind: 'book', book: b }); toast(`디지털북 「${b.title}」 ${b.chs.length}단원을 만들었습니다.`, 'ok'); }); }
    toast('준비 중인 도구입니다.', 'warn');
  }
  const ctKind = e => e.kind === 'video' ? (e.ref.src === 'ai' || e.ref.ai ? 'aivideo' : e.ref.src === 'youtube' ? 'youtube' : 'upload') : e.kind === 'file' ? 'upload' : e.kind;

  /* ── 메뉴 · 프리셋 ── */
  MENU.clib = { label: '콘텐츠 라이브러리', ws: 'learn' };
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; if (!P || !Array.isArray(P.on)) return;
    /* 학사 LMS는 '켜진 탭 앞 7개'가 필수 메뉴라, 예전 '영상 · 자료' 자리를 그대로 이어받아 나머지 순서를 흔들지 않는다 */
    if (!P.on.includes('clib')) { const lb = k === 'univ_lms' ? P.on.indexOf('library') : -1; const i = P.on.indexOf('class'); P.on.splice(lb >= 0 ? lb : i >= 0 ? i + 1 : P.on.length, 0, 'clib'); }
    ['library', 'dbook'].forEach(id => { const j = P.on.indexOf(id); if (j >= 0) { P.on.splice(j, 1); P.off = P.off || []; if (!P.off.includes(id)) P.off.push(id); } }); });
  try { const N = window.LMSNAV; if (N) { N.LBL.clib = '콘텐츠 라이브러리'; const room = N.G[0][3].find(h => h[0] === 'h-room'); if (room && !room[3].includes('clib')) { const i = room[3].indexOf('class'); room[3].splice(i >= 0 ? i + 1 : room[3].length, 0, 'clib'); } } } catch (e) { }
  /* 탭 순서: 같은 공간에서 '과정' 바로 뒤에 둔다. 예전 두 메뉴는 숨긴다(켜려면 메뉴 추가에서 다시 켤 수 있다) */
  function placeTab() { const A = S.nav.tabs[MENU.clib.ws] || []; const x = A.find(y => y.id === 'clib'); if (!x) return; x.on = true; A.splice(A.indexOf(x), 1); const lb = ULMS_() ? A.findIndex(y => y.id === 'library' && y.on) : -1; const i = A.findIndex(y => y.id === 'class'); A.splice(lb >= 0 ? lb : i >= 0 ? i + 1 : 0, 0, x);
    Object.values(S.nav.tabs).forEach(L => (L || []).forEach(y => { if (y.id === 'library' || y.id === 'dbook') y.on = false; })); }
  function ensure() { if (!S || !S.org || !S.nav || !S.nav.tabs) return; S.clib = Array.isArray(S.clib) ? S.clib : [];
    if (typeof navAdd === 'function') navAdd('clib', true); else if (!(S.nav.tabs.learn || []).some(x => x.id === 'clib')) (S.nav.tabs.learn = S.nav.tabs.learn || []).push({ id: 'clib', on: true });
    if (!S.clib35) { placeTab(); S.clib35 = 1; } }
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { ensure(); } catch (e) { console.error(e); } return r; }; }
  if (typeof createOrg === 'function') { const base = createOrg; createOrg = (...a) => { const r = base(...a); try { if (S && S.org) { S.clib35 = 0; ensure(); save(); } } catch (e) { console.error(e); } return r; }; }
  /* 예전 주소: 꺼진 '영상 · 자료' · '디지털북'으로 가면 라이브러리 안에서 연다(기능 · 데이터 그대로) */
  { const g0 = go; go = function (id, keep) { try { if (S && S.org && S.nav && typeof id === 'string') { if (id === 'clib') UI.clibSub = '';
    else if ((id === 'library' || id === 'dbook') && MENU.clib && !menuOn(id) && menuOn('clib')) { UI.clibSub = id; return g0('clib', keep); } } } catch (e) { console.warn(e); } return g0(id, keep); }; }

  /* ── 화면 ── */
  const PAGE = 36;
  const icoBox = k => `<span class="clb-ic k-${(KIND[k] || KIND.file)[2]}" aria-hidden="true">${ic((KIND[k] || KIND.file)[1], 22)}</span>`;
  function card(e) {
    const U = e.uses; const u = U[0];
    const use = U.length ? `<span class="clb-use on">${ic('check', 14)} 사용 중: ${esc(useLabel(u))}${U.length > 1 ? ` 외 ${U.length - 1}곳` : ''}</span>` : `<span class="clb-use">아직 어느 ${esc(cname())}에도 넣지 않았습니다</span>`;
    const q = `${e.title} ${subOf(e)} ${U.map(useLabel).join(' ')}`.toLowerCase();
    return `<article class="clb-card" data-q="${esc(q)}">${icoBox(e.kind)}<div class="clb-tx"><b title="${esc(e.title)}">${esc(e.title)}</b><small>${esc((KIND[e.kind] || KIND.file)[0])}${subOf(e) && subOf(e) !== (KIND[e.kind] || KIND.file)[0] ? ' · ' + esc(subOf(e).replace(/^(교안|파일|퀴즈|과제) · /, '')) : ''}</small>${use}</div>
      <div class="clb-acts"><button type="button" class="btn pri" data-act="clb-put" data-v="${esc(e.key)}">${e.kind === 'book' ? `${esc(cname())}에 연결` : `${esc(cname())}에 넣기`}</button><button type="button" class="btn" data-act="clb-pv" data-v="${esc(e.key)}">미리보기</button><button type="button" class="btn" data-act="clb-edit" data-v="${esc(e.key)}">고치기</button></div></article>`;
  }
  const START = () => [
    ['upload', '1', '가진 파일 올리기', '쓰던 영상 · PPT · PDF가 있다면 그대로 올립니다.', '파일 올리기'],
    ['aivideo', '2', '주제만 쓰고 AI 강의 영상 만들기', '한 줄만 쓰면 슬라이드와 목소리로 된 강의가 나옵니다.', 'AI 영상 만들기'],
    ['doc', '3', `교안 · 퀴즈를 만들고 ${cname()}에 넣기`, `만든 콘텐츠는 [${cname()}에 넣기]로 원하는 차시에 붙입니다.`, '교안 만들기']];
  function emptyHTML() {
    return `<section class="clb-start" aria-label="처음 시작하기"><h3>처음이세요? 이렇게 시작해 보세요</h3><div class="clb-st">${START().map(([k, n, h, d, b]) => `<div class="clb-sc"><span class="clb-n" aria-hidden="true">${n}</span><b>${esc(h)}</b><p>${esc(d)}</p><button type="button" class="btn ${n === '1' ? 'pri' : ''}" data-act="clb-mk" data-v="${k}">${esc(b)}</button></div>`).join('')}</div>
      <p class="clb-help">어려우면 오른쪽 아래 <b>AI SAM</b>에게 "콘텐츠 만들어줘"라고 말해 보세요.</p></section>`;
  }
  function subBar(name) { return `<div class="clb-subbar"><button type="button" class="btn" data-act="clb-home">← 콘텐츠 라이브러리</button><span>${esc(name)}</span></div>`; }
  VIEWS.clib = () => {
    ensure();
    if (UI.clibSub === 'dbook' && VIEWS.dbook) { if (UI.bkId && typeof bkOf === 'function' && bkOf(UI.bkId)) return subBar('디지털북 고치기') + VIEWS.dbook(); UI.clibSub = ''; UI.clibT = 'book'; }
    if (UI.clibSub === 'library' && VIEWS.library) return subBar('영상 · 자료 보관함(저장 공간 · 변환 상태 · 이름 바꾸기)') + VIEWS.library();
    const A = all(); const tb = TABS.some(x => x[0] === UI.clibT) ? UI.clibT : 'all'; const L = A.filter(e => inTab(e, tb)); const q = String(UI.clibQ || '').trim().toLowerCase();
    const n = k => A.filter(e => inTab(e, k)).length; const lim = UI.clibN || PAGE;
    const top = `<div class="clb-top"><div class="clb-lead"><p>모든 ${esc(cname())}의 영상 · 교안 · 퀴즈 · 디지털북을 한곳에서 보고, 여기서 바로 만들어 ${esc(cname())}에 넣습니다.</p></div><button type="button" class="btn pri clb-make" data-act="clb-make">${ic('clplus', 20)} 만들기</button></div>`;
    const lmsNote = ULMS_() && MENU.lmsv && tb !== 'book' && tb !== 'doc' && tb !== 'quiz' ? `<div class="clb-note">${ic('clplay', 18)}<span>학사 수업의 강의 영상(녹화 · 자막 · 학사 전송)은 <b>강의 영상 관리</b>에서 올리고 관리합니다. 여기에는 교안 · 퀴즈 · 디지털북과 따로 만든 영상이 모입니다.</span><button type="button" class="btn" data-act="go" data-v="lmsv">강의 영상 관리 열기</button></div>` : '';
    if (!A.length) return `<div class="clb">${top}${lmsNote}${emptyHTML()}${legacy()}</div>`;
    const bar = `<div class="clb-bar"><div class="clb-tabs" role="tablist" aria-label="종류">${TABS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === tb}" class="${k === tb ? 'on' : ''}" data-act="clb-tab" data-v="${k}">${esc(l)} <em>${n(k)}</em></button>`).join('')}</div>
      <label class="clb-search">${ic('clsearch', 18)}<input type="search" id="clbQ" value="${esc(UI.clibQ || '')}" placeholder="이름 · ${esc(cname())} 이름으로 찾기" aria-label="콘텐츠 찾기"></label></div>`;
    const shown = L.filter(e => !q || `${e.title} ${subOf(e)} ${e.uses.map(useLabel).join(' ')}`.toLowerCase().includes(q));
    const make1 = MAKE.find(m => (tb === 'video' && m[0] === 'aivideo') || (tb === 'doc' && m[0] === 'doc') || (tb === 'quiz' && m[0] === 'quiz') || (tb === 'book' && m[0] === 'book') || (tb === 'file' && m[0] === 'upload'));
    const body = L.length ? `<div class="clb-grid" id="clbGrid">${L.slice(0, lim).map(card).join('')}</div><div class="clb-none" id="clbNone" ${shown.length ? 'hidden' : ''}>찾는 콘텐츠가 없습니다. 다른 말로 찾아보거나 [만들기]를 눌러 새로 만드세요.</div>${L.length > lim ? `<div class="clb-more"><button type="button" class="btn" data-act="clb-more">더 보기 (${L.length - lim}개 더)</button></div>` : ''}`
      : `<div class="clb-empty1"><p>아직 ${esc(TABS.find(x => x[0] === tb)[1])} 콘텐츠가 없습니다.</p>${make1 ? `<button type="button" class="btn pri" data-act="clb-mk" data-v="${make1[0]}">${esc(make1[1])} ${make1[0] === 'upload' ? '' : '만들기'}</button>` : ''}</div>`;
    const fresh = !A.some(x => x.origin !== 'book'); /* 기본으로 들어 있는 디지털북만 있을 때도 처음 안내를 먼저 보여 준다 */
    return `<div class="clb">${top}${lmsNote}${fresh ? emptyHTML() : ''}${bar}${body}${legacy()}</div>`;
  };
  function legacy() { const L = [];
    if (VIEWS.library && (S.lib || []).length) L.push(`<button type="button" class="link" data-act="clb-sub" data-v="library">영상 · 자료 보관함(저장 공간 · 변환 상태)</button>`);
    return L.length ? `<p class="clb-legacy">예전 화면: ${L.join(' · ')}</p>` : ''; }

  /* 검색은 다시 그리지 않고 카드만 거른다(입력 중 초점 유지) */
  document.addEventListener('input', ev => { if (ev.target.id !== 'clbQ') return; UI.clibQ = ev.target.value; const q = ev.target.value.trim().toLowerCase(); let k = 0;
    document.querySelectorAll('#clbGrid .clb-card').forEach(c => { const on = !q || c.dataset.q.includes(q); c.hidden = !on; if (on) k++; }); const no = document.getElementById('clbNone'); if (no) no.hidden = !!k; });

  ACT['clb-tab'] = el => { UI.clibT = el.dataset.v; UI.clibN = 0; render(); };
  ACT['clb-more'] = () => { UI.clibN = (UI.clibN || PAGE) + PAGE; render(); };
  ACT['clb-home'] = () => { UI.clibSub = ''; UI.bkId = null; render(); };
  ACT['clb-sub'] = el => { UI.clibSub = el.dataset.v; render(); window.scrollTo(0, 0); };
  /* 만들기: 종류 카드 하나 고르기 */
  ACT['clb-make'] = () => {
    const K = (CTX().kinds || []).length ? CTX().kinds : TMP.kinds; const nm = k => { const x = K.find(y => (y.k || y.id || y.kind) === k); return x ? [x.n || x.name || '', x.d || x.desc || '', x.time || ''] : null; };
    modal('무엇을 만들까요?', `<p class="clb-now">지금 할 일: 만들 콘텐츠의 종류를 하나 고르세요.</p><div class="clb-kinds">${MAKE.map(([k, n, icon, d, time]) => { const o = nm(k); return `<button type="button" class="clb-kind" data-act="clb-mk" data-v="${k}">${`<span class="clb-ic k-${k === 'book' ? 'b' : k === 'quiz' ? 'q' : k === 'doc' ? 'd' : k === 'upload' ? 'f' : 'v'}" aria-hidden="true">${ic(icon, 24)}</span>`}<b>${esc(o && o[0] || n)}</b><small>${esc(o && o[1] || d)}</small><em>${esc(o && o[2] || time)}</em></button>`; }).join('')}</div>`, [{ id: 'c', label: '닫기' }], true);
  };
  ACT['clb-mk'] = el => { const k = el.dataset.v; closeModal(); CTX().open(k, { from: 'lib', onDone: x => { const r = add(x); if (r) { UI.clibT = 'all'; UI.clibQ = ''; render(); } } }); };
  /* 미리보기 */
  ACT['clb-pv'] = el => { const e = byKey(el.dataset.v); if (!e) return; const r = e.ref; const T = e.title;
    if (e.origin === 'book') { UI.clibSub = 'dbook'; if (typeof bkOpen === 'function') bkOpen(r.id); return; }
    if (e.origin === 'lib' && r.kind !== '평가' && r.kind !== 'YouTube') { modal(`미리보기 — ${T}`, `<dl class="clb-dl"><dt>종류</dt><dd>${esc(r.kind)}</dd><dt>크기 · 길이</dt><dd>${esc(r.size || '—')}</dd><dt>올린 날</dt><dd>${esc(String(r.at || '').slice(0, 10) || '—')}</dd></dl><p class="mini">데모에서는 파일 이름 · 크기만 기록합니다. 실제 운영에서는 여기서 바로 재생 · 열기가 됩니다.</p>`, [{ id: 'c', label: '닫기' }]); return; }
    const it = e.origin === 'lib' ? (r.kind === '평가' ? (r.item || {}) : { type: 'video', src: 'youtube', url: r.url || r.name }) : r;
    if (it.ai && (it.ai.scenes || []).length && typeof aiPlayer === 'function') { aiPlayer(T, it.ai.scenes, it.ai.voice || 'f', it.subs && it.subs.tracks); return; }
    let h = '';
    if (it.src === 'youtube' || /youtu/.test(it.url || '')) { const id = typeof ytId === 'function' ? ytId(it.url || '') : ''; h = id ? `<a class="clb-yt" href="https://www.youtube.com/watch?v=${esc(id)}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="${esc(T)} 영상 미리보기"><span>YouTube에서 보기 ›</span></a>` : `<p>${it.url ? esc(it.url) : 'YouTube 주소가 아직 없습니다. [고치기]에서 넣어 주세요.'}</p>`; }
    else if (it.doc && (it.doc.secs || []).length) { const D = it.doc; h = `<div class="clb-docpv"><b>학습 목표</b><ul>${(D.goals || []).map(g => `<li>${esc(g)}</li>`).join('')}</ul>${D.secs.map((s, i) => `<h4>${i + 1}. ${esc(s.h)}</h4><p>${esc(s.body || '')}</p>`).join('')}</div>`; }
    else if ((it.qs || []).length) h = `<ol class="clb-qs">${it.qs.map(x => `<li>${esc(String(x.q || '').replace(/^\d+\.\s*/, ''))}${(x.opts || []).length ? `<ul>${x.opts.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ol>`;
    else if (it.desc) h = `<p class="clb-pre">${esc(it.desc)}</p>`;
    else if ((it.files || []).length || it.file) h = `<p>파일: ${esc((it.files && it.files[0] && it.files[0].name) || it.file)}</p><p class="mini">데모에서는 파일 이름 · 크기만 기록합니다.</p>`;
    else h = `<p>아직 내용이 비어 있습니다. [고치기]를 눌러 채워 주세요.</p>`;
    modal(`미리보기 — ${T}`, h, [{ id: 'c', label: '닫기' }, { id: 'e', label: '고치기', run: () => { setTimeout(() => ACT['clb-edit']({ dataset: { v: e.key } }), 0); } }], true); };
  /* 고치기 */
  ACT['clb-edit'] = el => { const e = byKey(el.dataset.v); if (!e) return;
    if (e.origin === 'book') { UI.clibSub = 'dbook'; if (typeof bkOpen === 'function') bkOpen(e.ref.id); return; }
    if (e.origin === 'course') { const i = e.c.curriculum.indexOf(e.it); UI.cls = e.c.id; UI.clsT = 'curriculum'; go('class'); if (i >= 0 && typeof openEditor === 'function') setTimeout(() => openEditor(e.c, i), 0); return; }
    if (e.origin === 'lib') { UI.clibSub = 'library'; render(); window.scrollTo(0, 0); return; }
    const ref = e.ref; CTX().open(ctKind(e), { item: ref, from: 'lib', onDone: x => { const nx = { ...ref, ...JSON.parse(JSON.stringify(x || {})), id: ref.id, usedIn: ref.usedIn || [], at: today() }; add(nx); render(); } }); };
  /* 과정에 넣기: ① 과정 고르기 → ② 차시 고르기 */
  ACT['clb-put'] = el => { const e = byKey(el.dataset.v); if (!e) return; const CS = (S.classes || []).filter(c => c.status !== '종료');
    if (!CS.length) { modal(`${cname()}에 넣기`, `<p>아직 ${esc(cname())}${josa(cname(), '이', '가')} 없습니다. 먼저 ${esc(cname())}${josa(cname(), '을', '를')} 만들면 이 콘텐츠를 차시에 넣을 수 있습니다.</p>`, [{ id: 'c', label: '닫기' }, { id: 'n', label: `${cname()} 만들기`, kind: 'pri', run: () => { setTimeout(() => { if (window.CF && typeof CF.open === 'function') CF.open({ from: 'lib' }); else if (ACT['cls-new']) ACT['cls-new'](); }, 0); } }]); return; }
    const st = { c: CS.length === 1 ? CS[0].id : '', pos: null };
    const steps = () => `<ol class="clb-steps" aria-label="진행"><li class="${st.c ? 'done' : 'on'}">① ${esc(cname())} 고르기</li><li class="${st.c ? 'on' : ''}">② ${e.kind === 'book' ? '확인' : '차시 고르기'}</li></ol>`;
    const draw = w => { const mb = w.querySelector('.mb'); const ok = w.querySelector('[data-mact=ok]'); const bk = w.querySelector('[data-mact=back]');
      if (!st.c) { mb.innerHTML = steps() + `<p class="clb-now">지금 할 일: 「${esc(e.title)}」${josa(e.title, '을', '를')} 넣을 ${esc(cname())}${josa(cname(), '을', '를')} 고르세요.</p><div class="clb-pick">${CS.map(c => `<button type="button" class="clb-row" data-clbc="${c.id}"><b>${esc(c.name)}</b><small>${(c.curriculum || []).filter(x => x.type !== 'chapter').length}개 항목 · ${esc(c.status || '')}</small><span aria-hidden="true">›</span></button>`).join('')}</div>`; ok.hidden = true; bk.hidden = true; return; }
      const c = C(st.c); ok.hidden = false; bk.hidden = CS.length === 1;
      if (e.kind === 'book') { mb.innerHTML = steps() + `<p class="clb-now">「${esc(c.name)}」에 이 디지털북을 연결합니다. 학습자 마이페이지와 수료 흐름에 함께 보입니다.</p>`; ok.textContent = '연결하기'; return; }
      const W = c.weekly && (c.weekPlan || []).length ? c.weekPlan.map(wk => ({ v: 'w' + wk.w, h: `${wk.w}${S.org.type === 'univ' ? '주차' : '차시'}`, s: wk.title && !/^\d+(차시|주)$/.test(wk.title) ? wk.title : '', n: (c.curriculum || []).filter(x => x.week === wk.w).length }))
        : (c.curriculum || []).map((x, i) => [x, i]).filter(([x]) => x.type !== 'chapter').map(([x, i], k) => ({ v: 'a' + i, h: `${k + 1}차시 다음`, s: x.title, n: -1 }));
      if (st.pos == null) st.pos = 'end';
      mb.innerHTML = steps() + `<p class="clb-now">지금 할 일: 「${esc(c.name)}」의 어느 차시에 넣을지 고르세요.</p><div class="clb-pick">${W.map(x => `<button type="button" class="clb-row ${st.pos === x.v ? 'on' : ''}" data-clbp="${x.v}" aria-pressed="${st.pos === x.v}"><b>${esc(x.h)}</b><small>${esc(x.s)}${x.n >= 0 ? ` · 지금 ${x.n}개` : ''}</small></button>`).join('')}<button type="button" class="clb-row ${st.pos === 'end' ? 'on' : ''}" data-clbp="end" aria-pressed="${st.pos === 'end'}"><b>맨 끝에 넣기</b><small>${c.weekly ? '마지막 차시에 붙입니다' : '새 차시로 맨 뒤에 붙입니다'}</small></button></div>`;
      ok.textContent = '넣기'; };
    const w = modal(`${cname()}에 넣기 — ${e.title}`, '', [{ id: 'back', label: '이전', run: w => { st.c = ''; st.pos = null; draw(w); return false; } }, { id: 'c', label: '취소' }, { id: 'ok', label: '넣기', kind: 'pri', run: () => {
      const c = C(st.c); if (!c) return false; const p = st.pos || 'end'; const pos = p[0] === 'w' ? { week: +p.slice(1) } : p[0] === 'a' ? { after: +p.slice(1) } : {};
      const r = put(e, c.id, pos); if (!r) { toast('넣지 못했습니다. 다시 시도해 주세요.', 'warn'); return false; }
      render(); toast(r.it ? `「${r.it.title}」${josa(r.it.title, '을', '를')} 「${c.name}」 ${posLabel(c, r.it)}에 넣었습니다.` : `「${c.name}」에 디지털북을 연결했습니다.`, 'ok'); } }], true);
    w.addEventListener('click', ev => { const b = ev.target.closest('[data-clbc],[data-clbp]'); if (!b) return; if (b.dataset.clbc) { st.c = b.dataset.clbc; st.pos = null; } else st.pos = b.dataset.clbp; draw(w); });
    draw(w); };

  /* ── 모양(공통 토큰만 사용) ── */
  if (!document.querySelector('style[data-clib]')) { const st = document.createElement('style'); st.dataset.clib = '1'; st.textContent = `
.clb{font-size:16px}
.clb .btn{min-height:48px;padding:0 16px;font-size:16px}
.clb-top{display:flex;align-items:center;gap:16px;justify-content:space-between;margin:0 0 20px;flex-wrap:wrap}
.clb-lead p{margin:0;color:var(--t-sub);font-size:16px;line-height:1.5;max-width:640px}
.clb .btn.clb-make{min-height:56px;padding:0 28px;font-size:18px;font-weight:800;border-radius:8px;display:inline-flex;align-items:center;gap:8px}
.clb-bar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:0 0 16px}
.clb-tabs{display:flex;gap:6px;flex-wrap:wrap}
.clb-tabs button{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--g300);background:#fff;font:inherit;font-size:15px;font-weight:600;color:var(--g800);cursor:pointer}
.clb-tabs button em{font-style:normal;color:var(--t-sub);font-weight:500;margin-left:2px}
.clb-tabs button.on{background:var(--g900);border-color:var(--g900);color:#fff}.clb-tabs button.on em{color:#fff}
.clb-search{display:flex;align-items:center;gap:8px;min-height:48px;padding:0 14px;border:1px solid var(--g400);border-radius:8px;background:#fff;flex:0 1 320px;color:var(--g700)}
.clb-search input{border:0;outline:0;font:inherit;font-size:16px;flex:1;min-width:0;background:transparent;min-height:46px;padding:0;box-shadow:none}
.clb-search:focus-within{box-shadow:0 0 0 2px var(--s400)}
.clb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.clb-card{display:grid;grid-template-columns:48px 1fr;gap:12px 14px;align-items:start;background:#fff;border:1px solid var(--g300);border-radius:8px;padding:16px;box-shadow:var(--e1)}
.clb-card[hidden]{display:none}
.clb-ic{width:48px;height:48px;border-radius:10px;display:inline-grid;place-items:center;background:var(--s50);color:var(--s600)}
.clb-ic.k-d{background:#E3F3FC;color:#0B6FAE}.clb-ic.k-q{background:#FFF3E0;color:#A84A00}.clb-ic.k-b{background:var(--b50);color:var(--b900)}.clb-ic.k-f{background:var(--g200);color:var(--g800)}
.clb-tx{min-width:0;display:flex;flex-direction:column;gap:4px}
.clb-tx b{font-size:17px;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:keep-all;overflow-wrap:anywhere}
.clb-tx small{color:var(--t-sub);font-size:14px}
.clb-use{font-size:14px;color:var(--t-sub);display:inline-flex;gap:4px;align-items:center}.clb-use.on{color:var(--t-ok);font-weight:600}
.clb-acts{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}
.clb-acts .btn{flex:1 1 auto;min-height:48px;padding:0 12px;font-size:15px}
.clb-more{text-align:center;margin:18px 0}
.clb-none,.clb-empty1{padding:28px 16px;text-align:center;color:var(--t-sub);border:1px dashed var(--g400);border-radius:8px;background:#fff}
.clb-none[hidden]{display:none}.clb-empty1 p{margin:0 0 12px}
.clb-note{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--infol);border-radius:8px;padding:12px 14px;margin:0 0 16px;font-size:15px;line-height:1.5}
.clb-note>span{flex:1 1 300px}
.clb-start{margin:0 0 20px;background:#fff;border:1px solid var(--g300);border-radius:8px;padding:24px}
.clb-start h3{margin:0 0 16px;font-size:20px}
.clb-st{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.clb-sc{border:1px solid var(--g300);border-radius:8px;padding:18px;display:flex;flex-direction:column;gap:8px;background:var(--g50)}
.clb-sc b{font-size:17px}.clb-sc p{margin:0;color:var(--t-sub);line-height:1.5;flex:1}
.clb-n{width:32px;height:32px;border-radius:50%;background:var(--g900);color:#fff;display:inline-grid;place-items:center;font-weight:800}
.clb-help{margin:16px 0 0;color:var(--t-sub)}
.clb-legacy{margin:24px 0 0;color:var(--t-sub);font-size:14px}
.clb-legacy .link{font-size:14px}
.clb-subbar{display:flex;gap:12px;align-items:center;margin:0 0 16px;flex-wrap:wrap}.clb-subbar .btn{min-height:44px}.clb-subbar span{color:var(--t-sub)}
.clb-kinds{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.clb-kind{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;min-height:150px;padding:16px;border:1px solid var(--g300);border-radius:8px;background:#fff;font:inherit;cursor:pointer;color:var(--g900)}
.clb-kind:hover,.clb-kind:focus-visible{border-color:var(--s400);box-shadow:0 0 0 2px var(--s100)}
.clb-kind b{font-size:17px}.clb-kind small{font-size:14px;color:var(--t-sub);line-height:1.45}.clb-kind em{margin-top:auto;font-style:normal;font-size:13px;color:var(--t-mag);font-weight:600}
.clb-now{font-size:16px;font-weight:600;margin:0 0 14px}
.clb-steps{display:flex;gap:8px;list-style:none;padding:0;margin:0 0 14px;flex-wrap:wrap}
.clb-steps li{padding:6px 12px;border-radius:999px;background:var(--g200);color:var(--t-sub);font-size:14px;font-weight:600}
.clb-steps li.on{background:var(--g900);color:#fff}.clb-steps li.done{background:var(--b50);color:var(--t-ok)}
.clb-pick{display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow:auto}
.clb-row{display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;column-gap:10px;align-items:center;text-align:left;min-height:56px;padding:10px 14px;border:1px solid var(--g300);border-radius:8px;background:#fff;font:inherit;cursor:pointer;color:var(--g900)}
.clb-row b{font-size:16px}.clb-row small{grid-column:1;font-size:14px;color:var(--t-sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.clb-row>span{grid-row:1/3;grid-column:2;font-size:20px;color:var(--g600)}
.clb-row.on{border-color:var(--s400);box-shadow:0 0 0 2px var(--s100);background:var(--s50)}
.clb-ask .clb-fl{font-size:16px}.clb-ask input{min-height:48px;font-size:16px}
.clb-ex{margin:6px 0 10px;color:var(--t-sub);font-size:15px}.clb-fillbtn{min-height:48px}
.clb-later{font-weight:500;color:var(--t-sub);margin-left:4px}.clb-honest{margin-top:12px}
.clb-yt{display:block;text-decoration:none;color:inherit}.clb-yt img{width:100%;max-width:560px;border-radius:8px;display:block}.clb-yt span{display:inline-block;margin-top:8px;font-weight:700;color:var(--link)}
.clb-docpv h4{margin:16px 0 6px}.clb-docpv p,.clb-pre{line-height:1.6;white-space:pre-wrap}
.clb-qs li{margin:0 0 10px;line-height:1.5}.clb-qs ul{margin:4px 0 0;color:var(--t-sub)}
.clb-dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px}.clb-dl dt{color:var(--t-sub)}.clb-dl dd{margin:0}
@media (max-width:640px){.clb-top{gap:12px}.clb .btn.clb-make{width:100%;justify-content:center}.clb-search{flex:1 1 100%}.clb-grid{grid-template-columns:1fr}
  .clb-tabs{flex-wrap:nowrap;overflow-x:auto;width:100%;padding-bottom:2px;scrollbar-width:none}.clb-tabs button{flex:0 0 auto}.clb-kinds{grid-template-columns:1fr 1fr}.clb-kind{min-height:130px;padding:12px}.clb-start{padding:16px}}`; document.head.appendChild(st); }
})();
