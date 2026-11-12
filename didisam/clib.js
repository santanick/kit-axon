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
    clsearch: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    clexam: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12l1.5 1.5L13 11M9 17h6"/>',
    clsv: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  });

  /* ── 종류 ── */
  const KIND = { video: ['영상', 'clplay', 'v'], doc: ['교안', 'cldoc', 'd'], quiz: ['퀴즈', 'clquiz', 'q'], exam: ['시험', 'clexam', 'q'], survey: ['설문', 'clsv', 'q'], assign: ['과제', 'cldoc', 'q'], book: ['디지털북', 'book', 'b'], file: ['파일', 'clfile', 'f'] };
  const TABS = [['all', '전체'], ['video', '영상'], ['doc', '문서'], ['quiz', '퀴즈 · 시험 · 설문'], ['book', '디지털북'], ['link', '링크']];
  /* [만들기] 종류 카드 — C3 CT.kinds가 있으면 이름 · 설명을 그쪽 것으로 맞춘다 */
  const MAKE = [
    ['upload', '올리기', 'clup', '가진 영상 · 문서 파일을 올립니다', '1분'],
    ['aivideo', 'AI 강의 영상', 'clplay', '주제만 쓰면 AI가 슬라이드 강의를 만듭니다', '약 1분'],
    ['doc', '교안', 'cldoc', '주제만 쓰면 AI가 수업 자료를 씁니다', '약 1분'],
    ['quiz', '퀴즈', 'clquiz', '주제만 쓰면 AI가 문제 5개를 냅니다', '30초'],
    ['exam', '시험', 'clexam', '중간 · 기말 · 과정 테스트 — 문제 은행에서 랜덤 출제', '1분'],
    ['survey', '설문', 'clsv', '객관식 · 척도 · 주관식 만족도 설문', '30초'],
    ['assign', '과제', 'cldoc', '과제 안내와 채점 기준을 함께 만듭니다', '30초'],
    ['book', '디지털북', 'book', '읽고 풀며 배우는 교재를 AI가 엮습니다', '약 2분'],
    ['youtube', 'YouTube', 'clyt', '유튜브 주소를 붙여 넣습니다', '30초']
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
  /* 저장 종류(C3 CT와 같은 말): aivideo · youtube · upload · doc · book · quiz · assign → 화면 종류(KIND): video · doc · quiz · assign · book · file */
  const C3K = ['aivideo', 'youtube', 'upload', 'doc', 'book', 'quiz', 'exam', 'survey', 'assign'];
  const isAud = r => r.type === 'audio' || /^audio\//.test(r.mime || '') || /\.(mp3|m4a|wav)$/i.test(r.file || '');
  const isVid = r => r.type === 'video' || r.type === 'audio' || /^(video|audio)\//.test(r.mime || '') || /\.(mp4|webm|mov|m4v|mp3|m4a|wav)$/i.test(r.file || '');
  const dk = r => { const k = r.kind; if (k === 'aivideo' || k === 'youtube') return 'video'; if (k === 'upload') return isVid(r) ? 'video' : 'file';
    if (k === 'doc') return r.src === 'book' ? 'book' : r.src === 'upload' || (r.files && !r.doc) ? 'file' : 'doc'; if (KIND[k]) return k;
    return r.type === 'video' || r.type === 'audio' ? 'video' : r.type === 'quiz' ? 'quiz' : r.type === 'exam' ? 'exam' : r.type === 'survey' ? 'survey' : r.type === 'assign' ? 'assign' : r.type === 'doc' ? (r.src === 'book' ? 'book' : r.src === 'upload' || ((r.files || r.fileId) && !r.doc) ? 'file' : 'doc') : 'file'; };
  const c3k = r => { if (C3K.includes(r.kind)) return r.kind; if (r.type === 'audio') return 'upload'; const v = r.kind === 'video' || r.type === 'video';
    if (v) return r.src === 'ai' || r.ai ? 'aivideo' : r.src === 'youtube' || /youtu/.test(r.url || '') ? 'youtube' : 'upload';
    if (r.kind === 'file') return 'upload'; if (r.kind === 'book' || r.src === 'book') return 'book'; if (r.type === 'exam') return 'exam'; if (r.type === 'survey') return 'survey'; if (r.type === 'quiz' || r.kind === 'quiz') return 'quiz'; if (r.type === 'assign' || r.kind === 'assign') return 'assign';
    return r.src === 'upload' || ((r.files || r.fileId) && !r.doc) ? 'upload' : 'doc'; };
  const kindOfItem = it => ['video', 'audio', 'doc', 'quiz', 'exam', 'survey', 'assign'].includes(it.type) ? dk(it) : '';
  const libKind = l => ['동영상', '음성', 'YouTube'].includes(l.kind) ? 'video' : l.kind === '평가' ? (l.item && l.item.type === 'assign' ? 'assign' : 'quiz') : 'file';
  const books = () => { try { return typeof LSV === 'function' ? (LSV().dbooks || []) : []; } catch (e) { return []; } };

  /* ── 목록: 단독(S.clib) · 디지털북 · 예전 보관함(S.lib) · 과정 항목 ── */
  /* 단독 콘텐츠를 넣은 과정 항목: it.clib(이 화면) 또는 usedIn + 같은 제목 · 종류(C3 '라이브러리에서 가져오기') */
  const fromRec = (r, c, it) => it.clib === r.id || (!it.clib && (r.usedIn || []).includes(c.id) && it.title === r.title && (it.type === (r.type || it.type)));
  function usesOf(e) {
    if (e.origin === 'course') return [{ c: e.c, it: e.it }];
    if (e.origin === 'book') { const id = e.ref.id; const U = (S.classes || []).flatMap(c => (c.curriculum || []).filter(it => it.src === 'book' && it.book === id).map(it => ({ c, it })));
      const c = e.ref.cls && C(e.ref.cls); if (c && !U.some(u => u.c === c)) U.push({ c, it: null }); return U; }
    if (e.origin === 'lib') { try { if (typeof a2LibUse === 'function') return a2LibUse(e.ref).map(x => ({ c: x.c, it: x.it })); } catch (er) { } return (e.ref.cls || []).map(id => C(id)).filter(Boolean).map(c => ({ c, it: null })); }
    const r = e.ref; const U = (S.classes || []).flatMap(c => (c.curriculum || []).filter(it => fromRec(r, c, it)).map(it => ({ c, it })));
    (r.usedIn || []).forEach(id => { const c = C(id); if (c && !U.some(u => u.c === c)) U.push({ c, it: null }); }); return U;
  }
  const useLabel = u => `${u.c.name}${u.it ? ' ' + posLabel(u.c, u.it) : ''}`;
  function entries() {
    if (!S) return [];
    const out = []; const R = (S.clib || []).filter(x => x && x.id); const B = books(); const libIn = new Set(R.map(x => x.lib).filter(Boolean));
    R.forEach(x => { if (dk(x) === 'book' && B.some(b => b.id === (x.book && x.book.id || x.book))) return; out.push({ key: 'cl:' + x.id, origin: 'clib', kind: dk(x), title: x.title || x.name || '이름 없는 콘텐츠', at: x.at || '', ref: x }); });
    B.filter(b => (b.chs || []).length || b.url).forEach(b => out.push({ key: 'bk:' + b.id, origin: 'book', kind: 'book', title: b.title, at: b.at || '', ref: b }));
    (S.lib || []).forEach(l => { if (libIn.has(l.id)) return; out.push({ key: 'lb:' + l.id, origin: 'lib', kind: libKind(l), title: String(l.name || '').replace(/\.(mp4|webm|mov)$/i, ''), at: l.at || '', ref: l }); });
    (S.classes || []).forEach(c => (c.curriculum || []).forEach(it => { if (it.clib || it.lib || it.src === 'book' || R.some(r => fromRec(r, c, it))) return; const k = kindOfItem(it); if (!k) return; out.push({ key: 'it:' + c.id + ':' + it.id, origin: 'course', kind: k, title: it.title || ITEMX[it.type] || '항목', at: '', ref: it, it, c }); }));
    out.forEach(e => { e.uses = usesOf(e); e.title = niceTitle(e); });
    return out;
  }
  /* v36 평가 12: 주소(URL)가 그대로 제목이면 사람이 읽는 제목으로 — 파일은 파일 이름, YouTube는 영상 제목(oEmbed로 한 번 받아 기록에 저장, 못 받으면 'YouTube 영상') */
  const YTT = {}; const ytOfU = u => (String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/) || [])[1] || '';
  function niceTitle(e) { const t = String(e.title || '').trim(); if (!/^(https?:\/\/|www\.)\S+$/i.test(t) && !(t === 'YouTube 영상' && ytOfU(e.ref && (e.ref.url || e.ref.yt && e.ref.yt.id && 'https://youtu.be/' + e.ref.yt.id)))) return t;
    const r = e.ref || {}; const id = ytOfU(t) || ytOfU(r.url) || (r.yt && r.yt.id) || '';
    if (id) { const k = YTT[id]; if (k && k !== 1) return k; if (r.yt && r.yt.title && !/^https?:/.test(r.yt.title)) return r.yt.title; ytFetch(id, e); return 'YouTube 영상'; }
    try { const u = new URL(/^www\./i.test(t) ? 'https://' + t : t); const seg = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || ''); if (seg && /\.[a-z0-9]{2,5}$/i.test(seg)) return seg.slice(0, 80); return `${u.hostname.replace(/^www\./, '')} 링크`; } catch (er) { return t; } }
  function ytFetch(id, e) { if (YTT[id]) return; YTT[id] = 1; if (typeof fetch !== 'function' || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id)).then(r => r.ok ? r.json() : null).then(j => { const tt = j && String(j.title || '').trim(); if (!tt) return; YTT[id] = tt.slice(0, 80);
      try { const r = e.ref; if (e.origin === 'clib' || e.origin === 'course') { if (/^(https?:\/\/|www\.)|^YouTube 영상$/.test(String(r.title || ''))) r.title = YTT[id]; } else if (e.origin === 'lib' && /^(https?:\/\/|www\.)/.test(String(r.name || ''))) r.name = YTT[id]; save(); if (typeof CUR !== 'undefined' && document.querySelector('#main .clb')) render(); } catch (er) { } }).catch(() => { }); }
  const byKey = k => entries().find(e => e.key === k);
  /* CLIB.all(): C3 CT('라이브러리에서 가져오기')가 그대로 쓰는 기록 모양 { id, kind(C3 말), type, title, src, … , usedIn }.
     단독 콘텐츠는 저장된 기록 그 자체를 준다(usedIn을 바꾸면 저장된다). 화면용 정보 key · origin · view · uses는 저장되지 않게(열거 안 됨) 붙인다. */
  const meta = (o, e) => { const M = { key: e.key, origin: e.origin, view: e.kind, uses: e.uses.map(useLabel) }; Object.keys(M).forEach(k => Object.defineProperty(o, k, { value: M[k], enumerable: false, configurable: true, writable: true })); return o; };
  function recOf(e) {
    if (e.origin === 'clib') return meta(e.ref, e);
    if (e.origin === 'book') return meta({ id: e.ref.id, kind: 'book', type: 'doc', src: 'book', book: e.ref.id, title: e.title, at: e.at, usedIn: [...new Set(e.uses.map(u => u.c.id))] }, e);
    if (e.origin === 'lib') { const l = e.ref; let r;
      if (l.kind === '평가') { const it = JSON.parse(JSON.stringify(l.item || { type: 'quiz' })); delete it.id; delete it.week; r = { ...it, kind: it.type === 'assign' ? 'assign' : 'quiz', title: l.name }; }
      else if (l.kind === 'YouTube') r = { kind: 'youtube', type: 'video', src: 'youtube', url: l.url || (/^https:/.test(l.name) ? l.name : ''), title: l.name };
      else if (l.kind === '동영상') r = { kind: 'upload', type: 'video', src: 'upload', file: l.name, url: l.url || 'lib:' + l.id, fileId: l.fileId || '', lib: l.id, title: e.title };
      else r = { kind: 'upload', type: 'doc', src: 'upload', file: l.name, url: l.url || '', fileId: l.fileId || '', lib: l.id, title: String(l.name).replace(/\.\w+$/, '') };
      return meta({ ...r, id: l.id, at: l.at || '', usedIn: [...new Set(e.uses.map(u => u.c.id))] }, e); }
    const it = JSON.parse(JSON.stringify(e.it)); delete it.week; return meta({ ...it, kind: c3k(it), usedIn: [e.c.id] }, e);
  }
  const all = () => entries().map(recOf);
  const subOf = e => {
    const r = e.ref;
    if (e.origin === 'book') return `${(r.chs || []).length}단원`;
    if (e.origin === 'lib') return [r.kind === '평가' ? r.sub || '평가' : r.kind === '동영상' ? '올린 영상' : r.kind, r.size && r.size !== '—' ? r.size : ''].filter(Boolean).join(' · ');
    const src = r.src === 'ai' || r.kind === 'aivideo' ? 'AI로 만든 영상' : r.src === 'youtube' || r.kind === 'youtube' ? 'YouTube' : r.src === 'upload' || r.src === 'library' || r.kind === 'upload' ? (isAud(r) ? '올린 음성' : '올린 영상') : '';
    if (e.kind === 'video') return [src || '영상', r.ai && r.ai.mins ? `${r.ai.mins}분` : ''].filter(Boolean).join(' · ');
    if (e.kind === 'doc') return `교안${r.doc && (r.doc.secs || []).length ? ` · ${(r.doc.secs || []).length}절` : ''}`;
    if (e.kind === 'quiz') return `퀴즈 · ${(r.qs || []).length}문항`;
    if (e.kind === 'exam') { const R = r.rules || {}; return R.draw ? `시험 · ${R.draw}문항 랜덤 출제(문제 은행 ${(r.qs || []).length})` : `시험 · ${(r.qs || []).length}문항`; }
    if (e.kind === 'survey') return `설문 · ${(r.qs || []).length}문항`;
    if (e.kind === 'assign') return '과제';
    const sz = typeof r.size === 'number' ? (typeof a2Size === 'function' ? a2Size(r.size) : '') : r.size;
    return ['파일', sz || r.file || (r.files && r.files[0] && r.files[0].name) || ''].filter(Boolean).join(' · ');
  };

  /* ── 추가: CT.open의 onDone(item) 결과(과정 항목 모양이든 기록 모양이든)를 S.clib에 C3와 같은 기록 모양으로 넣는다 ── */
  function add(x) {
    if (!S || !x) return null; S.clib = Array.isArray(S.clib) ? S.clib : [];
    const o = JSON.parse(JSON.stringify(x)); delete o.week; ['key', 'origin', 'view', 'uses'].forEach(k => delete o[k]);
    const kind = c3k(o);
    if (kind === 'book') { /* 디지털북은 학습자 화면이 읽는 곳(LSV().dbooks)에 둔다 — S.clib에 겹쳐 두지 않는다 */
      const id = o.bookId || (o.book && typeof o.book === 'object' ? o.book.id : o.book) || (o.bookObj && o.bookObj.id) || o.id; let b = id && books().find(y => y.id === id);
      const obj = o.book && typeof o.book === 'object' ? o.book : o.bookObj;
      if (!b && obj && Array.isArray(obj.chs) && typeof LSV === 'function') { b = typeof bkNorm === 'function' ? bkNorm(obj) : obj; LSV().dbooks.push(b); }
      save(); return b ? { id: b.id, kind: 'book', type: 'doc', src: 'book', book: b.id, title: b.title } : null; }
    const it = { ...o, id: o.id && /^cl/.test(o.id) ? o.id : uid('cl'), kind, title: String(o.title || o.name || '콘텐츠').slice(0, 80), at: o.at || today(), usedIn: Array.isArray(o.usedIn) ? o.usedIn : [] };
    if (!it.type) it.type = ({ aivideo: 'video', youtube: 'video', upload: isAud(it) ? 'audio' : isVid(it) ? 'video' : 'doc', quiz: 'quiz', exam: 'exam', survey: 'survey', assign: 'assign' })[kind] || 'doc';
    if (kind === 'aivideo' && !it.src) it.src = 'ai'; if (kind === 'youtube' && !it.src) it.src = 'youtube'; if (kind === 'upload' && !it.src) it.src = 'upload';
    const at = S.clib.findIndex(y => y.id === it.id); if (at >= 0) S.clib[at] = it; else S.clib.unshift(it);
    save(); return it;
  }

  /* ── 과정 항목으로 바꾸기(학습자 게시본 lsSnapshot이 읽는 기존 필드 + C3 항목 모양) ── */
  const KEEP = ['src', 'url', 'fileId', 'file', 'mime', 'size', 'dur', 'topic', 'fmt', 'desc', 'deliv', 'due', 'time', 'retake', 'yt', 'q', 'lib', 'book', 'files', 'subs', 'rubric', 'ek', 'pool', 'rules', 'mins', 'doneMsg'];
  function toItem(e) {
    const r = recOf(e); const it = { id: uid('it'), type: r.type || ({ aivideo: 'video', youtube: 'video', upload: 'video', quiz: 'quiz', exam: 'exam', survey: 'survey', assign: 'assign' })[r.kind] || 'doc', title: r.title || '콘텐츠' };
    KEEP.forEach(k => { if (r[k] != null && r[k] !== '') it[k] = JSON.parse(JSON.stringify(r[k])); });
    ['ai', 'doc', 'qs', 'rubrics'].forEach(k => { if (r[k]) it[k] = JSON.parse(JSON.stringify(r[k])); });
    if (r.kind === 'aivideo') { it.src = 'ai'; if (!it.url || /^ai:/.test(it.url)) it.url = 'ai:' + it.id; }
    if (r.kind === 'book') it.src = 'book';
    if (r.rb && !it.rubric) { S.rubrics = Array.isArray(S.rubrics) ? S.rubrics : []; if (!S.rubrics.some(x => x.id === r.rb.id)) S.rubrics.push(JSON.parse(JSON.stringify(r.rb))); it.rubric = r.rb.id; }
    if (['quiz', 'exam'].includes(it.type)) { it.qs = it.qs || []; it.time = it.time || 10; it.retake = it.retake || 3; }
    if (it.type === 'video' && it.src === 'upload' && it.lib && !it.url) it.url = 'lib:' + it.lib;
    if (it.type === 'doc' && it.src === 'upload' && !it.files && it.file) it.files = [{ name: it.file, size: +r.bytes || (typeof r.size === 'number' ? r.size : 0) }];
    if (e.origin === 'clib') it.clib = e.ref.id;
    return it;
  }
  /* 과정에 넣기: pos = { week } (차시 목록이 있는 과정) | { after: 항목 index } | 없으면 맨 끝 */
  function put(e, classId, pos = {}) {
    if (typeof e === 'string') e = byKey(e) || byKey('cl:' + e) || byKey('bk:' + e) || byKey('lb:' + e);
    else if (e && !e.ref) e = byKey(e.key || ('cl:' + e.id)) || byKey('bk:' + e.id) || byKey('lb:' + e.id);
    const c = C(classId); if (!e || !c) return null;
    const it = toItem(e); const L = c.curriculum = c.curriculum || [];
    if (pos.week && (c.weekly || L.some(x => x.week))) { it.week = +pos.week; let at = -1; L.forEach((x, i) => { if (x.week === it.week) at = i; }); if (at < 0) { L.forEach((x, i) => { if ((x.week || 0) < it.week) at = i; }); } L.splice(at + 1, 0, it); }
    else if (pos.after != null && pos.after >= -1 && pos.after < L.length) { if (c.weekly && L[pos.after]) it.week = L[pos.after].week; L.splice(pos.after + 1, 0, it); }
    else { if (c.weekly) it.week = Math.max(1, ...L.map(x => x.week || 0)); L.push(it); }
    if (e.origin === 'clib') e.ref.usedIn = [...new Set([...(e.ref.usedIn || []), c.id])];
    if (e.origin === 'book' && !e.ref.cls) e.ref.cls = c.id;
    if (e.origin === 'lib') { e.ref.cls = [...new Set([...(e.ref.cls || []), c.id])]; e.ref.used = (e.ref.used || 0) + 1; try { if (it.type === 'video' && typeof a2ConvOf === 'function') a2ConvOf(e.ref); } catch (er) { } }
    try { logAudit(`콘텐츠 라이브러리 → ${c.name} — ${it.title}`); } catch (er) { }
    save(); return { it, c };
  }
  const useOf = x => { if (!x) return []; const e = x.ref && x.origin ? x : byKey(x.key || ('cl:' + x.id)) || byKey('bk:' + x.id) || byKey('lb:' + x.id); return e ? e.uses.map(u => ({ c: u.c, it: u.it, label: useLabel(u) })) : []; };
  window.CLIB = { all, add, use: useOf, put, kinds: KIND };

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
      inp.addEventListener('change', () => { const F = [...inp.files]; F.forEach(f => { const vid = /^video\//.test(f.type); if (vid && f.size > ((window.HPM && HPM.FMAX && HPM.FMAX.video) || 1024 ** 3)) { toast(`${f.name}: 영상은 ${(window.HPM && HPM.sizeText && HPM.FMAX) ? HPM.sizeText(HPM.FMAX.video) : '1GB'}까지 올릴 수 있습니다.`, 'warn'); return; }
        done({ kind: vid ? 'video' : 'file', src: 'upload', title: f.name.replace(/\.\w+$/, '').slice(0, 80), file: f.name, bytes: f.size, size: typeof a2Size === 'function' ? a2Size(f.size) : `${Math.round(f.size / 1024)}KB`, mime: f.type }); });
        inp.remove(); if (F.length) toast(`${F.length}개를 올렸습니다. (데모: 파일 이름 · 크기만 기록합니다)`, 'ok'); }); inp.click(); return; }
    if (kind === 'youtube') { const w = modal('YouTube 영상 넣기', `<div class="clb-ask"><label class="fl clb-fl">YouTube 주소<input name="u" inputmode="url" autocomplete="off" value="${esc(ed && ed.url || '')}"></label><p class="clb-ex">예: https://youtu.be/abcdefghijk</p><label class="fl clb-fl">제목 <small class="clb-later">나중에 해도 됩니다</small><input name="t" maxlength="80" value="${esc(ed && ed.title || '')}"></label></div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '넣기', kind: 'pri', run: w => { const u = fv(w, 'u'); if (!/^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/.test(u)) { toast('YouTube 주소를 확인해 주세요. 예: https://youtu.be/abcdefghijk', 'warn'); return false; } done({ ...(ed || {}), kind: 'video', src: 'youtube', url: u, title: fv(w, 't') || 'YouTube 영상' }); toast('YouTube 영상을 넣었습니다.', 'ok'); } }]); return w; }
    if (kind === 'aivideo') return preset(ask(ed ? 'AI 강의 영상 고치기' : 'AI 강의 영상 만들기', '무엇을 설명하는 영상인가요?', exTopic(), v => { const sc = AI.lecture(v, 5); S.ai && S.ai.usage++; done({ ...(ed || {}), kind: 'video', src: 'ai', title: `${v} AI 강의 영상`, ai: { scenes: sc, mins: 5, voice: 'f' } }); toast(`AI 강의 영상(장면 ${sc.length}개)을 만들었습니다. [미리보기]로 확인하세요.`, 'ok'); }, '<p class="mini clb-honest">미리보기 품질입니다 — 브라우저 음성 · 슬라이드로 재생합니다.</p>'));
    if (kind === 'doc') return preset(ask(ed ? '교안 고치기' : '교안 만들기', '어떤 내용의 교안인가요?', exTopic(), v => { const d = AI.material(v); S.ai && S.ai.usage++; done({ ...(ed || {}), kind: 'doc', title: `${v} 교안`, topic: v, doc: d }); toast(`교안 ${d.secs.length}절을 만들었습니다.`, 'ok'); }));
    if (kind === 'quiz') return preset(ask(ed ? '퀴즈 고치기' : '퀴즈 만들기', '무엇을 확인하는 퀴즈인가요?', exTopic(), v => { const qs = AI.questions(v, 5); S.ai && S.ai.usage++; done({ ...(ed || {}), kind: 'quiz', type: 'quiz', title: `${v} 퀴즈`, qs, time: 10 }); toast(`퀴즈 ${qs.length}문항을 만들었습니다.`, 'ok'); }));
    if (kind === 'assign') return preset(ask(ed ? '과제 고치기' : '과제 만들기', '어떤 과제인가요?', exTopic(), v => { const a = AI.assignment(v); done({ ...(ed || {}), kind: 'assign', type: 'assign', title: `${v} 과제`, desc: a.desc }); toast('과제를 만들었습니다.', 'ok'); }));
    if (kind === 'book') { if (ed && ed.id && typeof bkOpen === 'function' && books().some(b => b.id === ed.id)) { bkOpen(ed.id); return; }
      return ask('디지털북 만들기', '어떤 주제의 교재인가요?', exTopic(), v => { if (typeof bkAIDraft !== 'function') { toast('디지털북 도구를 불러오지 못했습니다.', 'warn'); return; } const b = bkAIDraft(v, 3); S.ai && S.ai.usage++; done({ kind: 'book', book: b }); toast(`디지털북 「${b.title}」 ${b.chs.length}단원을 만들었습니다.`, 'ok'); }); }
    toast('준비 중인 도구입니다.', 'warn');
  }
  const ctKind = e => c3k(e.ref);

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
    if (!S.clib35) { placeTab(); S.clib35 = 1; }
    /* v37 P3: '영상 · 자료' · '디지털북' 메뉴는 콘텐츠 라이브러리 하나로 합쳤다 — 메뉴 구성 · 메뉴 추가에서 다시 켜져 두 곳이 되지 않게 탭에서 뺀다(데이터 S.lib · 디지털북은 그대로) */
    stripOld(S.nav); }
  function stripOld(N) { if (!N || !N.tabs) return N; Object.keys(N.tabs).forEach(w => { if (Array.isArray(N.tabs[w])) N.tabs[w] = N.tabs[w].filter(y => y.id !== 'library' && y.id !== 'dbook'); }); return N; }
  if (typeof presetNav === 'function') { const base = presetNav; presetNav = (...a) => stripOld(base(...a)); }
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { ensure(); } catch (e) { console.error(e); } return r; }; }
  if (typeof createOrg === 'function') { const base = createOrg; createOrg = (...a) => { const r = base(...a); try { if (S && S.org) { S.clib35 = 0; ensure(); save(); } } catch (e) { console.error(e); } return r; }; }
  /* 예전 주소: 꺼진 '영상 · 자료' · '디지털북'으로 가면 라이브러리 안에서 연다(기능 · 데이터 그대로) */
  { const g0 = go; go = function (id, keep) { try { if (S && S.org && S.nav && typeof id === 'string') { if (id === 'clib') UI.clibSub = '';
    else if ((id === 'library' || id === 'dbook') && MENU.clib) { UI.clibSel = ''; if (id === 'library') { UI.clibSub = ''; UI.clibT = 'video'; } else if (UI.bkId && typeof bkOf === 'function' && bkOf(UI.bkId)) UI.clibSub = 'dbook'; else { UI.clibSub = ''; UI.clibT = 'book'; } return g0('clib', keep); }
    if (id !== 'clib') document.body.classList.remove('clb-sheet'); } } catch (e) { console.warn(e); } return g0(id, keep); }; }
  /* AI SAM 칩: 합친 화면에서 예전 두 화면('영상 · 자료' · '디지털북')의 칩을 함께 쓴다 */
  if (typeof scxDefs === 'function') { const base = scxDefs; scxDefs = k => { const r = base(k); if (k !== 'clib' || (r && r.length >= 3)) return r; let L = (r || []).slice();
    try { const V = base('library') || [], B = base('dbook') || []; L = L.concat([V[0], B[0], V.find(x => x[0] === 'l-unused'), V.find(x => x[0] === 'l-conv'), B.find(x => x[0] === 'db-list')].filter(Boolean)); } catch (e) { } return L; }; }

  /* ── 화면(v37 P3) — '영상 · 자료'와 하나로 합친 콘텐츠 라이브러리 ──
     대표님(2026-11-10): '영상자료 / 콘텐츠 라이브러리가 겹치는 기능 같은데 하나로 합쳐줘. UI/UX도 좀 더 깔끔하게'.
     위 [만들기] 하나 + 옆 [튜토리얼 영상 추천] · 종류 칩(전체 · 영상 · 문서 · 퀴즈/시험/설문 · 디지털북 · 링크) · 찾기 · 카드/목록 전환
     · 카드(썸네일 · 종류 · 길이 · 사용처) 클릭 → 오른쪽 미리보기 패널(바로 고치기 · 과정에 넣기 · 복제 · 삭제). 휴대폰은 패널이 아래에서 올라온다.
     예전 '영상 · 자료 보관함'의 기능(이름 바꾸기 · 변환 상태 · 저장 공간 · 사용 중 삭제 막기)은 이 화면의 패널 · 아래 줄로 옮겼다. */
  const PAGE = 36;
  const kName = k => (KIND[k] || KIND.file)[0];
  const icoBox = k => `<span class="clb-ic k-${(KIND[k] || KIND.file)[2]}" aria-hidden="true">${ic((KIND[k] || KIND.file)[1], 22)}</span>`;
  const ytOfE = e => { const r = e.ref || {}; return (r.yt && r.yt.id) || ytOfU(r.url) || ytOfU(e.origin === 'lib' ? r.name : '') || ''; };
  /* 링크 = 바깥 주소로 연결한 것(YouTube · 웹 주소 · 'YouTube에서 찾아볼 영상') */
  const isLink = e => { const r = e.ref || {}; if (e.origin === 'lib') return r.kind === 'YouTube' || /^https?:/.test(String(r.url || ''));
    return r.kind === 'youtube' || r.src === 'youtube' || r.tut === 1 || /^https?:\/\//.test(String(r.url || '')); };
  const inTab = (e, tb) => tb === 'all' || (tb === 'video' && e.kind === 'video') || (tb === 'doc' && ['doc', 'file'].includes(e.kind)) || (tb === 'quiz' && ['quiz', 'exam', 'survey', 'assign'].includes(e.kind)) || (tb === 'book' && e.kind === 'book') || (tb === 'link' && isLink(e));
  function lenOf(e) { const r = e.ref || {};
    if (e.origin === 'book') return `${(r.chs || []).length}단원`;
    if (e.origin === 'lib') return r.kind === '평가' ? `${((r.item || {}).qs || []).length || ''}${((r.item || {}).qs || []).length ? '문항' : ''}` : (r.size && r.size !== '—' ? String(r.size) : '');
    if (e.kind === 'video') return r.ai && r.ai.mins ? `${r.ai.mins}분` : (r.yt && r.yt.dur) || r.dur || (typeof r.size === 'string' ? r.size : '');
    if (['quiz', 'survey'].includes(e.kind)) return `${(r.qs || []).length}문항`;
    if (e.kind === 'exam') { const R = r.rules || {}; return R.draw ? `${R.draw}문항 출제` : `${(r.qs || []).length}문항`; }
    if (e.kind === 'doc') return r.doc && (r.doc.secs || []).length ? `${r.doc.secs.length}절` : '';
    if (e.kind === 'file') return typeof r.size === 'number' ? (typeof a2Size === 'function' ? a2Size(r.size) : '') : (r.size || (r.bytes && typeof a2Size === 'function' ? a2Size(+r.bytes) : ''));
    return ''; }
  const extOf = e => { const r = e.ref || {}; const n = String((r.files && r.files[0] && r.files[0].name) || r.file || r.name || ''); const m = n.match(/\.(\w{2,5})$/); return m ? m[1].toUpperCase() : ''; };
  function thumb(e) { const k = (KIND[e.kind] || KIND.file)[2]; const id = ytOfE(e); const r = e.ref || {}; const L = lenOf(e);
    const st = e.origin === 'book' && r.color ? ` style="--bk:${esc(String(r.color).replace(/[^#\w(),.% ]/g, ''))}"` : '';
    const inner = id ? `<img class="clb-thimg" src="https://i.ytimg.com/vi/${esc(id)}/mqdefault.jpg" alt="" loading="lazy">` : '';
    const cap = e.origin === 'book' ? `<b class="clb-thb">${esc(e.title)}</b>` : e.kind === 'file' && extOf(e) ? `<b class="clb-thx">${esc(extOf(e))}</b>` : '';
    return `<span class="clb-th k-${k}${id ? ' yt' : ''}"${st} aria-hidden="true"><span class="clb-thi">${ic((KIND[e.kind] || KIND.file)[1], 30)}${cap}</span>${inner}<em class="clb-thk">${esc(isLink(e) && e.kind === 'video' ? 'YouTube' : kName(e.kind))}</em>${L ? `<em class="clb-thl">${esc(L)}</em>` : ''}</span>`; }
  const useLine = e => { const U = e.uses; return U.length ? `<span class="clb-use on">${ic('check', 14)} ${esc(useLabel(U[0]))}${U.length > 1 ? ` 외 ${U.length - 1}곳` : ''}</span>` : `<span class="clb-use">아직 사용 안 함</span>`; };
  const qOf = e => `${e.title} ${kName(e.kind)} ${subOf(e)} ${e.uses.map(useLabel).join(' ')}`.toLowerCase();
  function card(e) { const on = UI.clibSel === e.key;
    return `<article class="clb-card${on ? ' on' : ''}" data-act="clb-sel" data-v="${esc(e.key)}" data-q="${esc(qOf(e))}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${esc(e.title)} 미리보기">${thumb(e)}<div class="clb-tx"><b title="${esc(e.title)}">${esc(e.title)}</b><small>${esc(subOf(e))}</small>${useLine(e)}</div></article>`; }
  function row(e) { const on = UI.clibSel === e.key; const L = lenOf(e);
    return `<article class="clb-lrow${on ? ' on' : ''}" data-act="clb-sel" data-v="${esc(e.key)}" data-q="${esc(qOf(e))}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${esc(e.title)} 미리보기">${thumb(e)}<div class="clb-tx"><b title="${esc(e.title)}">${esc(e.title)}</b>${useLine(e)}</div><span class="clb-lk">${esc(kName(e.kind))}</span><span class="clb-ll">${esc(L || '—')}</span><span class="clb-chev" aria-hidden="true">›</span></article>`; }
  const START = () => [
    ['upload', '1', '가진 파일 올리기', '쓰던 영상 · PPT · PDF가 있다면 그대로 올립니다.', '파일 올리기'],
    ['aivideo', '2', '주제만 쓰고 AI 강의 영상 만들기', '한 줄만 쓰면 슬라이드와 목소리로 된 강의가 나옵니다.', 'AI 영상 만들기'],
    ['doc', '3', `교안 · 퀴즈를 만들고 ${cname()}에 넣기`, `만든 콘텐츠는 [${cname()}에 넣기]로 원하는 차시에 붙입니다.`, '교안 만들기']];
  function emptyHTML() {
    return `<section class="clb-start" aria-label="처음 시작하기"><h3>처음이세요? 이렇게 시작해 보세요</h3><div class="clb-st">${START().map(([k, n, h, d, b]) => `<div class="clb-sc"><span class="clb-n" aria-hidden="true">${n}</span><b>${esc(h)}</b><p>${esc(d)}</p><button type="button" class="btn ${n === '1' ? 'pri' : ''}" data-act="clb-mk" data-v="${k}">${esc(b)}</button></div>`).join('')}</div>
      <p class="clb-help">어려우면 오른쪽 아래 <b>AI SAM</b>에게 "콘텐츠 만들어줘"라고 말해 보세요.</p></section>`;
  }
  function subBar(name) { return `<div class="clb-subbar"><button type="button" class="btn" data-act="clb-home">← 콘텐츠 라이브러리</button><span>${esc(name)}</span></div>`; }
  const viewMode = () => { if (UI.clibV) return UI.clibV; try { UI.clibV = localStorage.getItem('didisam.clibV') === 'list' ? 'list' : 'card'; } catch (e) { UI.clibV = 'card'; } return UI.clibV; };
  function storageLine() { try { const LB = (S.lib || []).filter(l => l.kind !== '평가' && l.kind !== 'YouTube'); if (!LB.length || typeof a2Bytes !== 'function') return '';
    const used = LB.reduce((a, l) => a + (a2Bytes(l) || 0), 0); const capG = (typeof A2 !== 'undefined' && A2.plan && A2.plan[S.org.plan]) || 1000;
    return `<p class="clb-store">${ic('clfile', 16)} 올린 파일 저장 공간 ${esc((typeof a2Size === 'function' && a2Size(used)) || '0KB')} / ${capG}GB · 영상 1개 최대 2시간</p>`; } catch (e) { return ''; } }

  /* 오른쪽 미리보기 패널 */
  function pvBody(e) { const r = e.ref; const T = e.title; const id = ytOfE(e);
    if (e.origin === 'book') { const ch = r.chs || []; return `<div class="clb-pbk" style="--bk:${esc(String(r.color || '#5C74F6').replace(/[^#\w(),.% ]/g, ''))}"><b>${esc(T)}</b><small>${ch.length}단원</small></div>${ch.length ? `<ol class="clb-pch">${ch.slice(0, 8).map(c => `<li>${esc(c.title || '')}</li>`).join('')}${ch.length > 8 ? `<li class="mini">외 ${ch.length - 8}단원</li>` : ''}</ol>` : ''}`; }
    if (id) return `<a class="clb-yt" href="https://www.youtube.com/watch?v=${esc(id)}" target="_blank" rel="noopener"><span class="clb-pth">${thumb(e)}</span><span>YouTube에서 보기 ›</span></a>`;
    if (e.origin === 'lib' && r.kind !== '평가') { const cv = r.kind === '동영상' && typeof a2ConvOf === 'function' ? a2ConvOf(r) : ''; return `<span class="clb-pth">${thumb(e)}</span>${cv ? `<p class="clb-conv">재생 준비 상태: <b>${esc(cv)}</b>${cv === '최적화 실패' ? ' — Handbrake로 다시 인코딩한 뒤 올려 주세요.' : ''}</p>` : ''}<p class="mini">데모에서는 파일 이름 · 크기만 기록합니다. 실제 운영에서는 여기서 바로 재생 · 열기가 됩니다.</p>`; }
    const it = e.origin === 'lib' ? (r.item || {}) : r;
    if (it.ai && (it.ai.scenes || []).length) return `<span class="clb-pth">${thumb(e)}</span><button type="button" class="btn clb-play" data-act="clb-pv" data-v="${esc(e.key)}">${ic('clplay', 18)} 재생해 보기 (장면 ${it.ai.scenes.length}개)</button>`;
    if (it.doc && (it.doc.secs || []).length) { const D = it.doc; return `<div class="clb-docpv">${(D.goals || []).length ? `<b>학습 목표</b><ul>${D.goals.slice(0, 3).map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}${D.secs.slice(0, 3).map((s, i) => `<h4>${i + 1}. ${esc(s.h)}</h4><p>${esc(String(s.body || '').slice(0, 160))}${String(s.body || '').length > 160 ? '…' : ''}</p>`).join('')}${D.secs.length > 3 ? `<p class="mini">외 ${D.secs.length - 3}절</p>` : ''}</div>`; }
    if ((it.qs || []).length) return `<ol class="clb-qs">${it.qs.slice(0, 5).map(x => `<li>${esc(String(x.q || '').replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>${it.qs.length > 5 ? `<p class="mini">외 ${it.qs.length - 5}문항</p>` : ''}`;
    if (it.desc) return `<p class="clb-pre">${esc(String(it.desc).slice(0, 400))}</p>`;
    if (it.q && !it.url) return `<p>아직 영상을 고르지 않았습니다. <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(it.q)}" target="_blank" rel="noopener">YouTube에서 「${esc(it.q)}」 찾기 ›</a></p>`;
    if ((it.files || []).length || it.file) return `<span class="clb-pth">${thumb(e)}</span><p>파일: ${esc((it.files && it.files[0] && it.files[0].name) || it.file)}</p>`;
    return `<p class="mini">아직 내용이 비어 있습니다. [바로 고치기]로 채워 주세요.</p>`; }
  function canDel(e) { if (e.origin === 'course') return `「${e.c.name}」 안에 있는 항목입니다. ${cname()} 화면에서 지울 수 있습니다.`; if (e.uses.length) return `${e.uses.length}곳에서 쓰고 있어 지울 수 없습니다. 먼저 ${cname()}에서 빼 주세요.`; return ''; }
  function panelHTML() { const e = UI.clibSel && byKey(UI.clibSel); if (!e) return '';
    const no = canDel(e); const U = e.uses;
    return `<div class="clb-ph"><span class="clb-pk">${esc(kName(e.kind))}</span><b>${esc(e.title)}</b><button type="button" class="clb-px" data-act="clb-close" aria-label="미리보기 닫기">${ic('x', 20)}</button></div>
      <div class="clb-pa"><button type="button" class="btn pri" data-act="clb-edit" data-v="${esc(e.key)}">${ic('spark', 16)} 바로 고치기</button><button type="button" class="btn" data-act="clb-put" data-v="${esc(e.key)}">${esc(cname())}에 넣기</button>
      <button type="button" class="btn" data-act="clb-dup" data-v="${esc(e.key)}">복제</button><button type="button" class="btn clb-del" data-act="clb-del" data-v="${esc(e.key)}" ${no ? 'aria-disabled="true"' : ''} title="${esc(no)}">삭제</button>${no ? `<p class="clb-pno">${esc(no)}</p>` : ''}</div>
      <div class="clb-pb">${pvBody(e)}
      <dl class="clb-dl"><dt>종류</dt><dd>${esc(subOf(e) || kName(e.kind))}</dd>${lenOf(e) ? `<dt>길이</dt><dd>${esc(lenOf(e))}</dd>` : ''}${e.at ? `<dt>만든 날</dt><dd>${esc(String(e.at).slice(0, 10))}</dd>` : ''}<dt>사용처</dt><dd>${U.length ? `<ul class="clb-ul">${U.map(u => `<li><button type="button" class="link" data-act="clb-goc" data-v="${esc(u.c.id)}">${esc(useLabel(u))}</button></li>`).join('')}</ul>` : '아직 없음'}</dd></dl></div>`; }
  function panelDraw() { const P = document.getElementById('clbPanel'); if (!P) return render(); const h = panelHTML(); P.innerHTML = h; P.hidden = !h;
    const W = document.querySelector('#main .clb-wrap'); if (W) W.classList.toggle('has-p', !!h); document.body.classList.toggle('clb-sheet', !!h && innerWidth <= 860);
    document.querySelectorAll('#main [data-act=clb-sel]').forEach(c => { const on = c.dataset.v === UI.clibSel; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    if (h) { const x = P.querySelector('.clb-px'); if (innerWidth <= 860 && x) x.focus({ preventScroll: true }); } }

  VIEWS.clib = () => {
    ensure();
    if (UI.clibSub === 'dbook' && VIEWS.dbook) { if (UI.bkId && typeof bkOf === 'function' && bkOf(UI.bkId)) return subBar('디지털북 고치기') + VIEWS.dbook(); UI.clibSub = ''; }
    if (UI.clibSub === 'library') { UI.clibSub = ''; UI.clibT = 'video'; } /* 예전 '영상 · 자료' → 같은 화면의 '영상' */
    const A = entries(); const tb = TABS.some(x => x[0] === UI.clibT) ? UI.clibT : 'all'; const L = A.filter(e => inTab(e, tb)); const q = String(UI.clibQ || '').trim().toLowerCase();
    if (UI.clibSel && !A.some(e => e.key === UI.clibSel)) UI.clibSel = '';
    const n = k => A.filter(e => inTab(e, k)).length; const lim = UI.clibN || PAGE; const vm = viewMode();
    const top = `<div class="clb-top"><p class="clb-lead">모든 ${esc(cname())}의 영상 · 문서 · 퀴즈 · 디지털북을 한곳에서 보고, 여기서 바로 만들어 ${esc(cname())}에 넣습니다.</p><div class="clb-topb"><button type="button" class="btn pri clb-make" data-act="clb-make">${ic('clplus', 20)} 만들기</button><button type="button" class="btn clb-tutb" data-act="clb-tut">${ic('clyt', 20)} 튜토리얼 영상 추천</button></div></div>`;
    const lmsNote = ULMS_() && MENU.lmsv && ['all', 'video'].includes(tb) ? `<div class="clb-note">${ic('clplay', 18)}<span>학사 수업의 강의 영상(녹화 · 자막 · 학사 전송)은 <b>강의 영상 관리</b>에서 올리고 관리합니다. 여기에는 교안 · 퀴즈 · 디지털북과 따로 만든 영상이 모입니다.</span><button type="button" class="btn" data-act="go" data-v="lmsv">강의 영상 관리 열기</button></div>` : '';
    if (!A.length) return `<div class="clb">${top}${lmsNote}${emptyHTML()}</div>`;
    const bar = `<div class="clb-bar"><div class="clb-tabs" role="tablist" aria-label="종류">${TABS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === tb}" class="${k === tb ? 'on' : ''}" data-act="clb-tab" data-v="${k}">${esc(l)} <em>${n(k)}</em></button>`).join('')}</div>
      <div class="clb-tools"><label class="clb-search">${ic('clsearch', 18)}<input type="search" id="clbQ" value="${esc(UI.clibQ || '')}" placeholder="콘텐츠 찾기" aria-label="콘텐츠 이름 · ${esc(cname())} 이름으로 찾기"></label>
      <div class="clb-vw" role="group" aria-label="보기 방식"><button type="button" data-act="clb-view" data-v="card" aria-pressed="${vm === 'card'}" class="${vm === 'card' ? 'on' : ''}">카드</button><button type="button" data-act="clb-view" data-v="list" aria-pressed="${vm === 'list'}" class="${vm === 'list' ? 'on' : ''}">목록</button></div></div></div>`;
    const shown = L.filter(e => !q || qOf(e).includes(q));
    const make1 = MAKE.find(m => (tb === 'video' && m[0] === 'aivideo') || (tb === 'doc' && m[0] === 'doc') || (tb === 'quiz' && m[0] === 'quiz') || (tb === 'book' && m[0] === 'book') || (tb === 'link' && m[0] === 'youtube'));
    const body = L.length ? `<div class="${vm === 'list' ? 'clb-list' : 'clb-grid'}" id="clbGrid">${L.slice(0, lim).map(vm === 'list' ? row : card).join('')}</div><div class="clb-none" id="clbNone" ${shown.length ? 'hidden' : ''}>찾는 콘텐츠가 없습니다. 다른 말로 찾아보거나 [만들기]를 눌러 새로 만드세요.</div>${L.length > lim ? `<div class="clb-more"><button type="button" class="btn" data-act="clb-more">더 보기 (${L.length - lim}개 더)</button></div>` : ''}`
      : `<div class="clb-empty1"><p>아직 ${esc(TABS.find(x => x[0] === tb)[1])} 콘텐츠가 없습니다.</p>${make1 ? `<button type="button" class="btn pri" data-act="clb-mk" data-v="${make1[0]}">${esc(make1[1])} ${['upload', 'youtube'].includes(make1[0]) ? '넣기' : '만들기'}</button>` : ''}</div>`;
    const fresh = !A.some(x => x.origin !== 'book'); /* 기본으로 들어 있는 디지털북만 있을 때도 처음 안내를 먼저 보여 준다 */
    const ph = panelHTML(); setTimeout(() => document.body.classList.toggle('clb-sheet', !!ph && innerWidth <= 860), 0);
    return `<div class="clb">${top}${lmsNote}${fresh ? emptyHTML() : ''}${bar}<div class="clb-wrap${ph ? ' has-p' : ''}"><div class="clb-main">${body}${storageLine()}</div><aside class="clb-panel" id="clbPanel" aria-label="미리보기" ${ph ? '' : 'hidden'}>${ph}</aside></div></div>`;
  };

  /* 검색은 다시 그리지 않고 카드만 거른다(입력 중 초점 유지) */
  document.addEventListener('input', ev => { if (ev.target.id !== 'clbQ') return; UI.clibQ = ev.target.value; const q = ev.target.value.trim().toLowerCase(); let k = 0;
    document.querySelectorAll('#clbGrid [data-q]').forEach(c => { const on = !q || c.dataset.q.includes(q); c.hidden = !on; if (on) k++; }); const no = document.getElementById('clbNone'); if (no) no.hidden = !!k; });
  /* 썸네일을 못 받으면(오프라인 등) 아이콘 그림으로 둔다 — 인라인 onerror는 CSP로 막혀 있어 여기서 */
  document.addEventListener('error', ev => { const t = ev.target; if (t && t.classList && t.classList.contains('clb-thimg')) { const p = t.parentElement; t.remove(); if (p) p.classList.remove('yt'); } }, true);
  document.addEventListener('keydown', ev => { const t = ev.target; if ((ev.key === 'Enter' || ev.key === ' ') && t && t.matches && t.matches('#main article[data-act=clb-sel]')) { ev.preventDefault(); ACT['clb-sel'](t); }
    if (ev.key === 'Escape' && UI.clibSel && document.getElementById('clbPanel') && !document.getElementById('modal')) ACT['clb-close'](); });

  ACT['clb-tab'] = el => { UI.clibT = el.dataset.v; UI.clibN = 0; render(); };
  ACT['clb-more'] = () => { UI.clibN = (UI.clibN || PAGE) + PAGE; render(); };
  ACT['clb-home'] = () => { UI.clibSub = ''; UI.bkId = null; render(); };
  ACT['clb-sub'] = el => { UI.clibSub = el.dataset.v; render(); };
  ACT['clb-view'] = el => { UI.clibV = el.dataset.v === 'list' ? 'list' : 'card'; try { localStorage.setItem('didisam.clibV', UI.clibV); } catch (e) { } render(); };
  ACT['clb-sel'] = el => { const k = el.dataset.v; UI.clibSel = UI.clibSel === k && innerWidth > 860 ? '' : k; panelDraw(); };
  ACT['clb-close'] = () => { const k = UI.clibSel; UI.clibSel = ''; panelDraw(); const c = k && document.querySelector(`#main [data-act=clb-sel][data-v="${CSS.escape(k)}"]`); if (c) c.focus({ preventScroll: true }); };
  ACT['clb-goc'] = el => { UI.cls = el.dataset.v; UI.clibSel = ''; document.body.classList.remove('clb-sheet'); go('class'); };
  /* 복제: 단독 콘텐츠 · 과정 항목 · 예전 보관함 → 새 단독 콘텐츠(S.clib), 디지털북 → 새 디지털북 */
  ACT['clb-dup'] = el => { const e = byKey(el.dataset.v); if (!e) return; let nk = '';
    if (e.origin === 'book') { if (typeof LSV !== 'function') return; const b = JSON.parse(JSON.stringify(e.ref)); b.id = uid('bk'); b.title = `${b.title} (사본)`.slice(0, 60); delete b.cls; b.at = today(); LSV().dbooks.push(typeof bkNorm === 'function' ? bkNorm(b) : b); save(); nk = 'bk:' + b.id; }
    else { const r = JSON.parse(JSON.stringify(recOf(e))); delete r.id; if (e.origin !== 'lib') delete r.lib; delete r.clib; r.usedIn = []; r.at = today(); r.title = `${r.title || e.title} (사본)`.slice(0, 80); const x = add(r); if (x) nk = 'cl:' + x.id; }
    if (!nk) { toast('복제하지 못했습니다.', 'warn'); return; } try { logAudit(`콘텐츠 라이브러리 복제 — ${e.title}`); } catch (er) { }
    UI.clibSel = nk; UI.clibT = 'all'; UI.clibQ = ''; render(); toast(`「${e.title}」${josa(e.title, '을', '를')} 복제했습니다. 사본은 아직 어느 ${cname()}에도 넣지 않았습니다.`, 'ok'); };
  ACT['clb-del'] = el => { const e = byKey(el.dataset.v); if (!e) return; const no = canDel(e); if (no) { toast(no, 'warn'); return; }
    modal('콘텐츠 삭제', `<p>「${esc(e.title)}」${josa(e.title, '을', '를')} 라이브러리에서 지울까요? 지우면 되돌릴 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'pri', run: () => {
      if (e.origin === 'clib') S.clib = (S.clib || []).filter(x => x !== e.ref);
      else if (e.origin === 'lib') S.lib = (S.lib || []).filter(x => x !== e.ref);
      else if (e.origin === 'book' && typeof LSV === 'function') { const L = LSV(); L.dbooks = (L.dbooks || []).filter(x => x !== e.ref); }
      try { logAudit(`콘텐츠 라이브러리 삭제 — ${e.title}`); } catch (er) { } UI.clibSel = ''; document.body.classList.remove('clb-sheet'); save(); render(); toast('지웠습니다.', 'ok'); } }]); };
  /* 예전 보관함 자료 고치기: 이름(YouTube는 주소도) — 예전 '영상 · 자료' 화면의 이름 바꾸기를 여기로 */
  function libEdit(e) { const l = e.ref; const yt = l.kind === 'YouTube';
    modal('바로 고치기', `<div class="clb-ask"><label class="fl clb-fl">이름<input name="t" maxlength="80" value="${esc(e.title)}"></label>${yt ? `<label class="fl clb-fl">YouTube 주소<input name="u" inputmode="url" value="${esc(l.url || (/^https:/.test(l.name) ? l.name : ''))}"></label>` : ''}</div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const v = fv(w, 't'); if (!v) { toast('이름을 적어 주세요.', 'warn'); return false; }
        if (yt) { const u = fv(w, 'u'); if (u && !/^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/.test(u)) { toast('YouTube 주소를 확인해 주세요.', 'warn'); return false; } if (u) l.url = u; }
        const ext = (String(l.name).match(/\.(mp4|webm|mov|m4v|pdf|pptx?|docx?|xlsx?|hwpx?)$/i) || [''])[0]; l.name = v + (ext && !v.toLowerCase().endsWith(ext.toLowerCase()) ? ext : ''); save(); render(); toast('저장했습니다.', 'ok'); } }]); }
  /* 만들기: 종류 카드 하나 고르기 */
  ACT['clb-make'] = () => {
    const K = (CTX().kinds || []).length ? CTX().kinds : TMP.kinds; const nm = k => { const x = K.find(y => (y.k || y.id || y.kind) === k); return x ? [x.n || x.name || '', x.d || x.one || x.desc || '', x.time || ''] : null; };
    modal('무엇을 만들까요?', `<p class="clb-now">지금 할 일: 만들 콘텐츠의 종류를 하나 고르세요.</p><div class="clb-kinds">${MAKE.map(([k, n, icon, d, time]) => { const o = nm(k); return `<button type="button" class="clb-kind" data-act="clb-mk" data-v="${k}">${`<span class="clb-ic k-${k === 'book' ? 'b' : ['quiz', 'exam', 'survey', 'assign'].includes(k) ? 'q' : k === 'doc' ? 'd' : k === 'upload' ? 'f' : 'v'}" aria-hidden="true">${ic(icon, 24)}</span>`}<b>${esc(o && o[0] || n)}</b><small>${esc(o && o[1] || d)}</small><em>${esc(o && o[2] || time)}</em></button>`; }).join('')}</div>`, [{ id: 'c', label: '닫기' }], true);
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
    if (e.origin === 'lib' && e.ref.kind !== '평가') { libEdit(e); return; }
    const ref = e.ref; CTX().open(ctKind(e), { item: ref, from: 'lib', title: ref.title, onDone: x => { if (!x) return;
      /* C3 도구는 라이브러리에서 연 결과를 새 기록으로 저장한다 → 고친 내용을 원래 기록에 옮기고 새 기록은 지운다(사용처 · id 유지) */
      if (x.id && x.id !== ref.id) S.clib = (S.clib || []).filter(y => y.id !== x.id);
      const nx = { ...ref, ...JSON.parse(JSON.stringify(x)), id: ref.id, usedIn: ref.usedIn || [], at: today() }; add(nx); render(); } }); };
  /* 과정에 넣기: ① 과정 고르기 → ② 차시 고르기 */
  ACT['clb-put'] = el => { const e = byKey(el.dataset.v); if (!e) return; const CS = (S.classes || []).filter(c => c.status !== '종료');
    if (!CS.length) { modal(`${cname()}에 넣기`, `<p>아직 ${esc(cname())}${josa(cname(), '이', '가')} 없습니다. 먼저 ${esc(cname())}${josa(cname(), '을', '를')} 만들면 이 콘텐츠를 차시에 넣을 수 있습니다.</p>`, [{ id: 'c', label: '닫기' }, { id: 'n', label: `${cname()} 만들기`, kind: 'pri', run: () => { setTimeout(() => { if (window.CF && typeof CF.open === 'function') CF.open({ from: 'lib' }); else if (ACT['cls-new']) ACT['cls-new'](); }, 0); } }]); return; }
    const st = { c: CS.length === 1 ? CS[0].id : '', pos: null };
    const steps = () => `<ol class="clb-steps" aria-label="진행"><li class="${st.c ? 'done' : 'on'}">① ${esc(cname())} 고르기</li><li class="${st.c ? 'on' : ''}">② 차시 고르기</li></ol>`;
    const draw = w => { const mb = w.querySelector('.mb'); const ok = w.querySelector('[data-mact=ok]'); const bk = w.querySelector('[data-mact=back]');
      if (!st.c) { mb.innerHTML = steps() + `<p class="clb-now">지금 할 일: 「${esc(e.title)}」${josa(e.title, '을', '를')} 넣을 ${esc(cname())}${josa(cname(), '을', '를')} 고르세요.</p><div class="clb-pick">${CS.map(c => `<button type="button" class="clb-row" data-clbc="${c.id}"><b>${esc(c.name)}</b><small>${(c.curriculum || []).filter(x => x.type !== 'chapter').length}개 항목 · ${esc(c.status || '')}</small><span aria-hidden="true">›</span></button>`).join('')}</div>`; ok.hidden = true; bk.hidden = true; return; }
      const c = C(st.c); ok.hidden = false; bk.hidden = CS.length === 1;
      const W = c.weekly && (c.weekPlan || []).length ? c.weekPlan.map(wk => ({ v: 'w' + wk.w, h: `${wk.w}${S.org.type === 'univ' ? '주차' : '차시'}`, s: wk.title && !/^\d+(차시|주)$/.test(wk.title) ? wk.title : '', n: (c.curriculum || []).filter(x => x.week === wk.w).length }))
        : (c.curriculum || []).map((x, i) => [x, i]).filter(([x]) => x.type !== 'chapter').map(([x, i], k) => ({ v: 'a' + i, h: `${k + 1}차시 다음`, s: x.title, n: -1 }));
      if (st.pos == null) st.pos = 'end';
      mb.innerHTML = steps() + `<p class="clb-now">지금 할 일: 「${esc(c.name)}」의 어느 차시에 넣을지 고르세요.</p><div class="clb-pick">${W.map(x => `<button type="button" class="clb-row ${st.pos === x.v ? 'on' : ''}" data-clbp="${x.v}" aria-pressed="${st.pos === x.v}"><b>${esc(x.h)}</b><small>${esc(x.s)}${x.n >= 0 ? ` · 지금 ${x.n}개` : ''}</small></button>`).join('')}<button type="button" class="clb-row ${st.pos === 'end' ? 'on' : ''}" data-clbp="end" aria-pressed="${st.pos === 'end'}"><b>맨 끝에 넣기</b><small>${c.weekly ? '마지막 차시에 붙입니다' : '새 차시로 맨 뒤에 붙입니다'}</small></button></div>`;
      ok.textContent = '넣기'; };
    const w = modal(`${cname()}에 넣기 — ${e.title}`, '', [{ id: 'back', label: '이전', run: w => { st.c = ''; st.pos = null; draw(w); return false; } }, { id: 'c', label: '취소' }, { id: 'ok', label: '넣기', kind: 'pri', run: () => {
      const c = C(st.c); if (!c) return false; const p = st.pos || 'end'; const pos = p[0] === 'w' ? { week: +p.slice(1) } : p[0] === 'a' ? { after: +p.slice(1) } : {};
      const r = put(e, c.id, pos); if (!r) { toast('넣지 못했습니다. 다시 시도해 주세요.', 'warn'); return false; }
      render(); toast(`「${r.it.title}」${josa(r.it.title, '을', '를')} 「${c.name}」 ${posLabel(c, r.it)}에 넣었습니다.`, 'ok'); } }], true);
    w.addEventListener('click', ev => { const b = ev.target.closest('[data-clbc],[data-clbp]'); if (!b) return; if (b.dataset.clbc) { st.c = b.dataset.clbc; st.pos = null; } else st.pos = b.dataset.clbp; draw(w); });
    draw(w); };


  /* ── 튜토리얼 영상 추천(v36): 프롬프트 → 필요한 영상 20개 → 하나씩 저장 · 모두 저장 · 더 보기(다음 20개) ──
     YouTube API 키(설정 › 연동)가 있으면 실제 YouTube 검색 결과 20개씩(다음 페이지 토큰). 키가 없으면 정직하게 알리고,
     ① 디디쌤 데모 목록(실제 YouTube 영상 15개) 중 관련 있는 것 + ② 'YouTube에서 찾아볼 검색어' 후보로 채운다. 저장은 S.clib(youtube). */
  const TUTV = ['', ' 기초', ' 강의', ' 사용법', ' 따라하기', ' 입문', ' 실습', ' 예제', ' 꿀팁', ' 총정리', ' 초보자', ' 쉽게 배우기', ' 10분 정리', ' 실무 활용', ' 핵심 정리', ' 자주 하는 실수', ' 단계별', ' 완벽 가이드', ' 업무 자동화', ' 시작하기', ' 중급', ' 고급 기능', ' 문제 풀이', ' 사례', ' 템플릿 활용', ' 무료 강의', ' 한 번에 끝내기', ' 비교', ' 최신', ' Q&A', ' 교육용', ' 수업 활용', ' 과제', ' 연습 문제', ' 프로젝트', ' 노하우', ' 실전', ' 원리', ' 설명', ' 데모'];
  const tutBase = q => String(q || '').replace(/(튜토리얼|추천|영상|동영상|유튜브|YouTube|찾아\s*줘|해\s*줘|주세요|보여\s*줘|필요한|관련|에\s*대한|20개|개)/gi, ' ').replace(/\s+/g, ' ').trim();
  const ytKey = () => !!(S.settings && S.settings.yt && S.settings.yt.key);
  const demoTuts = () => { try { return typeof LSEED_UNIV_TUTS !== 'undefined' ? LSEED_UNIV_TUTS : []; } catch (e) { return []; } };
  /* v36 1-5: 키가 없을 때 쓰는 분야별 데모 목록 — 실제 공개 YouTube 영상만(2026-11-10 oEmbed로 제목 · 채널 확인). [영상 id, 제목, 채널] */
  const TUT_DEMO = [
    { re: /엑셀|excel|피벗|스프레드시트|컴활|vlookup|함수/i, v: [["R7q0r_YD0a4", "엑셀 초보도 한 방에 이해하는 피벗테이블 기초!", "방과후도우미"], ["k2FsYHMtXMY", "[엑셀이뭐니]12강 피벗테이블(상) / 기초부터 디자인까지/ PIVOT TABLE/ 엑셀강좌", "엑셀런투데이"], ["GnTsrcNIyxg", "엑셀 13강] 피벗 테이블을 잘 만드는 방법 👍 | 02-7", "짤막한 강좌"], ["0L36b0GJ24g", "엑셀 피벗테이블 만들기 방법 |초보자", "쉬운엑셀"], ["zJyd2o2g7wQ", "직장인 엑셀 피벗테이블 너무 쉽다! 복잡한 데이터 10분만에 정리하기!", "배우공"], ["Wk5dFhLsp6U", "엑셀 피벗테이블: 실무자가 꼭 알아야 할 핵심 기능 총정리 | 이 영상으로 마스터하세요!", "오빠두엑셀 l 엑셀 강의 대표채널"]] },
    { re: /파이썬|python|코딩|프로그래밍/i, v: [["yytWGELNeOI", "파이썬 무료 기초 강의 - 1강 파이썬이란 무엇인가?", "조코딩 JoCoding"], ["KL1MIuBfWe0", "파이썬 코딩 무료 강의 - 5시간만 투자하면 개발자가 됩니다", "조코딩 JoCoding"], ["3R6vFdb7YI4", "파이썬 왕초보 기초 강의 - 파이썬 프로그래밍의 기초, 자료형(1)", "조코딩 JoCoding"], ["ns61Ol2OIuo", "파이썬 기초 무료 강의 - [한양대 ERICA 소프트웨어학부 도경구 교수] - 우리학교 명강의", "메타코드M"]] },
    { re: /파워포인트|ppt|powerpoint|발표\s*자료|슬라이드/i, v: [["WW7eHCbyyYo", "[파워포인트 기초강좌1] PPT 왕초보를 위한 열기 글자변경 슬라이드 삽입 저장까지", "스마일정쌤"], ["gF_SvivXzWQ", "파워포인트 처음부터 시작하기 1. 메뉴 및 화면구성/ #powerpoint", "지식나눔터"], ["aWTtIaCJ3cg", "파워포인트 기초 강좌 1 - 화면 구성과 저장 방법", "방컴TV (방과후 컴퓨터)"]] },
    { re: /노션|notion/i, v: [["XzU81FfDXLs", "[템플릿 제공] 2026 노션 사용법, 기초부터 데이터베이스·자동화·AI까지 이 영상 하나로 끝! (노션 기초 강의 풀버전)", "시간기획자 최민정"], ["7TCdvnlbdSk", "노션 사용법 입문 총정리: 왕초보도 이 영상 하나면 기초부터 데이터베이스까지 끝!", "1000쌤 | 교사·선생님을 위한 노션, AI 가이드"], ["mebSi7p85_4", "노션(notion) 초보자를 위한 설치부터 기본 사용법까지!｜경기도 지식(GSEEK)", "경기도 지식 GSEEK"], ["dTSMrPsiSCg", "[노션 기초 강의] 노션 데이터베이스 사용법 1편 I 표, 칸반 보드, 갤러리", "러닝스푼즈 | 커리어 성공의 비밀"]] },
    { re: /데이터|통계|분석|시각화/i, v: [["HNlRYQnLkek", "[데이터 분석 기초 강의] 7강. 통계로 요약하기", "한빛미디어"], ["R3E4m8fqUSg", "[데이터 분석 기초 강의] 13강. 통계적으로 추론하기", "한빛미디어"], ["r7jTwciTdXo", "통계 기초의 모든것을 5시간만에 끝내드립니다ㅣ고려대 통계학과 출신 데이터분석가ㅣ표본, 기대값, 정규분포, 모평균, t분포, 포아송분포, 조건부 확률 등", "메타코드M"], ["Zqq-HvKhlW8", "[Full 버전] 데이터 분석 8시간 무료강의 - 미국 빅테크 Data Scientist 현직자가 알려드려요", "메타코드M"]] },
    { re: /취업|면접|자기소개|자소서|이력서|진로/i, v: [["QUvvGKKrbNU", "자기소개서, 면접 준비 방법", "면이괜(면접이대로괜찮은가)"], ["5-sbXv0KK2o", "취업 준비를 위한 자기소개서 작성, 완벽한 구조와 예시!🔍", "내일부터 출근"], ["EKYxExHE0B0", "면접관이 알려주는 1분 자기소개의 모든 것", "면접왕 이형"], ["XZ6N70UW2n4", "서류 40번 떨어지고 깨달은 합격 자기소개서 쓰는 법", "취업갤러리"]] },
    { re: /분수|수학|덧셈|뺄셈|초등/i, v: [["FGIfZ3YDz3k", "분수의 덧셈과 뺄셈 1 : 기초 (초등수학)", "청개구리유여사"], ["avX_LvT3bpE", "분수의 덧셈 : 개념 (초등수학)", "청개구리유여사"], ["quOnh5g5qT4", "분모가 같은 분수의 덧셈과 뺄셈(4학년 1학기 1단원)", "재미있는수학이야기"], ["giF_f0AEgb8", "초등 수학 개념잡기 - 27강 분수의 덧셈과 뺄셈   _#001", "EBS Learning"]] },
    { re: /챗\s*gpt|chatgpt|프롬프트|생성형|gpt/i, v: [["pPJ7Pr7SYtI", "챗GPT의 프롬프트 작성의 기초! | 챗GPT 사용법, Chat GPT", "감자나라ai"], ["qd6w-IbfLlA", "챗GPT 초보를 위한 프롬프트 작성법 5가지 / 프롬프트, 잘 쓴 것 같은데 왜 답이 이상할까?", "TASoL"], ["rZE9f9CPPxw", "[챗GPT] 프롬프트 전문적 작성방법 - 7가지 방법과 사례 심층 정리", "promptStrategies"], ["ELZ7rYyKA4w", "입문자, 초보자가 알아야 할 ChatGPT 사용 방법 Top 3 - 프롬프트 잘 쓰는 법, PDF 파일 대화, 유튜브 추출", "버프TV (한국GPT협회)"]] },
    { re: /성희롱|폭력\s*예방|법정|의무\s*교육|직장\s*내/i, v: [["xaqQ7j7gHcM", "(고용노동부 제작, 성희롱 예방교육)  뭉쳤다! 국내 최고의 소통전문가와 공인노무사 with 레이디제인", "고용노동부"], ["qT3C4G9HCDE", "(사업장교육용) 매년 실시하는 직장내 성희롱 예방교육 이 영상을 확인하세요!", "고용노동부"], ["dM7qPxoRMYU", "[동영상 강의]노동법률_직장 내 성희롱 예방", "제주특별자치도노동권익센터"]] },
    { re: /영어|회화|english/i, v: [["OGHo7apPWIY", "왕초보를 위한 영어회화 강의 - Lesson 001 [기본적인 문장 구성하기]", "라이브 아카데미 토들러"], ["iMDR9wAj0k8", "왕초보 기초 영어회화 100문장 | 생활영어 첫걸음 이것부터 외우세요(흘려듣기)", "말트영어(기초&여행&생활영어)"], ["-Iqytaj8oxI", "영어회화 왕초보라면 제발 꼭 보세요🔥매일 쓰는 기초 생활영어 200개 완벽 정리", "해커스톡 기초영어회화 공식 유튜브"]] }
  ];
  /* 주제와 상관없는 넓은 말(기초 · 강의 · 사용법 …)로는 맞췄다고 치지 않는다 — '엑셀 피벗 기초'에 n8n '기초부터' 영상이 1번으로 오던 문제 */
  const TUT_GEN = /^(기초|기본|입문|강의|강좌|사용법|방법|초보|초보자|왕초보|활용|실무|따라하기|따라|하기|완벽|정리|총정리|가이드|배우기|만들기|쉽게|무료|최신|핵심|실습|예제|신입|사원|신입사원|직장인|학생|교사|교수|대학생|위한|위해|용|쉬운|처음|시작|시작하기|과정|교육|수업)$/;
  const tutWords = base => base.split(/[\s·,/—\-]+/).map(w => w.replace(/(을|를|이|가|은|는|의|로|으로|에서|에|과|와|용)$/, '')).filter(w => w.length >= 2 && !TUT_GEN.test(w));
  function tutDemo(base) { const words = tutWords(base); const out = []; const seen = new Set(); const push = (id, title, ch, sc) => { if (seen.has(id)) return; seen.add(id); out.push({ id, title, ch, dur: '', how: 'demo', sc }); };
    TUT_DEMO.forEach(g => { if (!g.re.test(base)) return; g.v.forEach(([id, t, ch]) => push(id, t, ch, 1 + tutScore({ title: t, ch }, words))); });
    demoTuts().forEach(t => { const sc = tutScore(t, words); if (sc > 0) push(t.vid, t.title, t.ch, sc); });
    return out.sort((a, b) => b.sc - a.sc).slice(0, 20); }
  const TUT = () => (UI.tut = UI.tut || { q: '', list: [], page: 0, token: '', saved: {}, busy: false, mode: '', err: '' });
  async function tutApi(q, token) { const y = S.settings.yt || {}; const p = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '20', relevanceLanguage: 'ko', safeSearch: 'strict', q, key: y.key }); if (token) p.set('pageToken', token); if (y.cc) p.set('videoLicense', 'creativeCommon');
    const r = await fetch('https://www.googleapis.com/youtube/v3/search?' + p); if (!r.ok) throw new Error('YouTube 검색 실패(' + r.status + ')'); const j = await r.json(); const ids = (j.items || []).map(x => x.id && x.id.videoId).filter(Boolean); let dur = {};
    try { if (ids.length) { const r2 = await fetch('https://www.googleapis.com/youtube/v3/videos?' + new URLSearchParams({ part: 'contentDetails', id: ids.join(','), key: y.key })); const j2 = await r2.json(); (j2.items || []).forEach(v => { dur[v.id] = String(v.contentDetails.duration || '').replace(/^PT/, '').replace('H', '시간 ').replace('M', '분 ').replace('S', '초').trim(); }); } } catch (e) { }
    return { list: (j.items || []).filter(x => x.id && x.id.videoId).map(x => ({ id: x.id.videoId, title: x.snippet.title, ch: x.snippet.channelTitle, dur: dur[x.id.videoId] || '', how: 'api' })), next: j.nextPageToken || '' }; }
  async function tutQueries(base, page) { /* 검색어 후보: Claude가 연결돼 있으면 Claude가 20개, 아니면 규칙 */
    try { if (typeof CL === 'object' && CL.on('docs')) { const r = await Promise.race([CL.call({ system: '교육 담당자를 돕습니다. 요청한 JSON 배열 하나만 출력합니다.', messages: [{ role: 'user', content: `「${base}」을(를) 배우는 학습자에게 필요한 YouTube 튜토리얼 검색어 20개를 기초부터 심화 순서로, 서로 겹치지 않게 JSON 문자열 배열로 주세요.${page ? ` (이미 ${page * 20}개를 보여 줬으니 다른 관점으로)` : ''}` }], max: 1200 }), new Promise((_, no) => setTimeout(() => no(new Error('t')), 20000))]); const m = String(r.text || '').match(/\[[\s\S]*\]/); const a = m && JSON.parse(m[0]); if (Array.isArray(a) && a.length) return { list: a.map(String).slice(0, 20), by: 'claude' }; } } catch (e) { }
    const V = TUTV.filter(v => !v.trim() || !base.includes(v.trim())); /* '기초'가 이미 있으면 '기초 기초'를 만들지 않는다 */ return { list: V.slice(page * 20, page * 20 + 20).map(v => `${base}${v}`), by: 'rule' }; }
  const tutScore = (t, words) => { const s = `${t.title} ${t.tool || ''} ${t.ch || ''}`.toLowerCase(); return words.reduce((a, w) => a + (w.length >= 2 && s.includes(w.toLowerCase()) ? 1 : 0), 0); };
  async function tutLoad(more) { const T = TUT(); const base = tutBase(T.q); if (!base) { toast('어떤 영상이 필요한지 한 줄로 적어 주세요. 예: 엑셀 피벗 테이블 기초', 'warn'); return; }
    if (!more) { T.list = []; T.page = 0; T.token = ''; T.err = ''; } T.busy = true; tutDraw();
    try { if (ytKey()) { const r = await tutApi(base, more ? T.token : ''); T.mode = 'api'; T.token = r.next; T.list = T.list.concat(r.list.filter(v => !T.list.some(x => x.id === v.id))); T.end = !r.next; }
      else { T.mode = 'demo'; /* v36 1-5: 키가 없으면 주제에 맞는 데모 영상만 카드로 보이고, 모자라는 만큼은 'YouTube에서 찾기' 한 줄(검색어 링크)로 묶는다 */
        T.list = tutDemo(base); const qs = await tutQueries(base, 0); T.qby = qs.by; T.finds = qs.list.slice(0, 8); T.end = true; }
      T.page++; } catch (e) { T.err = e.message || String(e); }
    T.busy = false; tutDraw(); try { S.ai && (S.ai.usage = (S.ai.usage || 0) + 1); } catch (e) { } }
  const tutKey = v => v.id ? 'y:' + v.id : 'q:' + v.q;
  function tutSave(v) { const T = TUT(); const k = tutKey(v); if (T.saved[k]) return null;
    const rec = v.id ? { kind: 'youtube', type: 'video', src: 'youtube', url: 'https://youtu.be/' + v.id, yt: { id: v.id, title: v.title, ch: v.ch || '', dur: v.dur || '' }, title: String(v.title).slice(0, 80), topic: tutBase(T.q), tut: 1 }
      : { kind: 'youtube', type: 'video', src: 'youtube', url: '', q: v.q, topic: v.q, title: `찾아볼 영상: ${v.q}`.slice(0, 80), tut: 1 };
    const r = add(rec); if (r) T.saved[k] = r.id; return r; }
  function tutCard(v, i) { const T = TUT(); const on = !!T.saved[tutKey(v)]; const link = v.id ? `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(v.q)}`;
    return `<li class="clb-tc ${v.how}"><a class="clb-tth" href="${esc(link)}" target="_blank" rel="noopener" aria-label="${esc(v.title)} YouTube에서 보기">${v.id ? `<img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" loading="lazy">` : `<span class="clb-tq">${ic('clsearch', 26)}<b>YouTube 검색</b></span>`}</a><div class="clb-tt"><b>${i + 1}. ${esc(v.title)}</b><small>${v.how === 'api' ? esc([v.ch, v.dur].filter(Boolean).join(' · ')) : v.how === 'demo' ? `데모 목록 · ${esc(v.ch || '')}` : '검색어 후보 — 눌러서 YouTube에서 고르세요'}</small></div><button type="button" class="btn ${on ? '' : 'pri'} clb-ts" data-act="clb-tut-save" data-v="${i}" ${on ? 'disabled' : ''}>${on ? ic('check', 16) + ' 저장됨' : '저장'}</button></li>`; }
  function tutBody() { const T = TUT(); const key = ytKey(); const left = T.list.filter(v => !T.saved[tutKey(v)]).length;
    return `<div class="clb-tut"><p class="clb-now">지금 할 일: 필요한 영상을 한 줄로 적고 [추천 받기]를 누르세요. 마음에 드는 영상을 [저장]하면 라이브러리에 들어갑니다.</p>
      <div class="clb-tqr"><label class="clb-fl"><span class="clb-vh">어떤 영상이 필요한가요?</span><input id="clbTutQ" maxlength="120" autocomplete="off" value="${esc(T.q)}" placeholder="예: 엑셀 피벗 테이블 기초 — 신입 사원용"></label><button type="button" class="btn pri" data-act="clb-tut-go" ${T.busy ? 'disabled' : ''}>${ic('spark', 16)} 추천 받기</button></div>
      <p class="clb-ex">예: 엑셀 피벗 테이블 기초 · 챗GPT로 보고서 쓰기 · 초등 분수 덧셈 설명</p>
      ${key ? `<p class="clb-src ok">${ic('check', 16)} YouTube에서 실제 영상을 20개씩 찾습니다(설정 › 연동의 API 키 사용).</p>` : `<div class="clb-src no"><b>키 없이는 데모 영상만 보여 드립니다(${T.mode === 'demo' && !T.busy ? `이 주제 최대 ${T.list.length}개` : `주제에 맞는 것만 · 전체 ${TUT_DEMO.reduce((a, g) => a + g.v.length, 0) + demoTuts().length}개 중`}) · 키를 넣으면 20개씩 추천합니다.</b><span>YouTube API 키(설정 › 연동)가 없어 실제 YouTube 검색은 하지 못합니다. 모자라는 영상은 아래 'YouTube에서 찾기' 검색어로 찾을 수 있습니다.</span><button type="button" class="btn" data-act="clb-tut-key">API 키 넣으러 가기</button></div>`}
      ${T.err ? `<p class="clb-err" role="alert">${esc(T.err)}</p>` : ''}
      ${!key && T.mode === 'demo' && !T.busy && !T.list.length ? `<p class="clb-none1">「${esc(tutBase(T.q))}」에 맞는 데모 영상이 아직 없습니다. 아래 검색어로 YouTube에서 찾거나 API 키를 넣어 주세요.</p>` : ''}
      ${T.list.length ? `<div class="clb-tbar"><b>${T.mode === 'demo' ? '주제에 맞는 데모 영상' : '추천'} ${T.list.length}개</b>${T.qby === 'claude' ? '<small>검색어: Claude</small>' : ''}<span class="sp"></span><button type="button" class="btn" data-act="clb-tut-all" ${left ? '' : 'disabled'}>모두 저장 (${left}개)</button></div><ol class="clb-tl">${T.list.map(tutCard).join('')}</ol>${T.end ? (T.mode === 'demo' ? '' : '<p class="clb-ex">더 보여 드릴 추천이 없습니다. 다른 말로 다시 찾아보세요.</p>') : `<div class="clb-more"><button type="button" class="btn" data-act="clb-tut-more" ${T.busy ? 'disabled' : ''}>더 보기 (다음 20개)</button></div>`}` : ''}
      ${!key && T.mode === 'demo' && (T.finds || []).length && !T.busy ? `<div class="clb-tfind" role="group" aria-label="YouTube에서 찾기"><b>${ic('clsearch', 16)} YouTube에서 찾기</b>${T.list.length ? `<small>데모 영상 ${T.list.length}개 말고 더 필요하면</small>` : ''}<span class="clb-tfl">${T.finds.map(q => `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener">${esc(q)}</a>`).join('')}</span></div>` : ''}
      ${T.busy ? `<p class="clb-ex" role="status">영상을 찾고 있습니다…</p>` : ''}</div>`; }
  function tutDraw() { const w = document.querySelector('#modal .clb-tutw'); if (!w) return; const sc = w.closest('.mb') ? w.closest('.mb').scrollTop : 0; w.innerHTML = tutBody(); const mb = w.closest('.mb'); if (mb) mb.scrollTop = sc; }
  ACT['clb-tut'] = () => { TUT(); const w = modal('튜토리얼 영상 추천', `<div class="clb-tutw">${tutBody()}</div>`, [{ id: 'c', label: '닫기', run: () => { render(); } }], true); try { w.classList.add('clb-tutm'); } catch (e) { } setTimeout(() => { const i = document.getElementById('clbTutQ'); i && i.focus(); }, 30); };
  ACT['clb-tut-go'] = () => { const i = document.getElementById('clbTutQ'); TUT().q = i ? i.value : TUT().q; tutLoad(false); };
  ACT['clb-tut-more'] = () => tutLoad(true);
  ACT['clb-tut-save'] = el => { const v = TUT().list[+el.dataset.v]; if (!v) return; const r = tutSave(v); if (r) toast(`「${r.title}」을(를) 라이브러리에 저장했습니다.`.replace('」을(를)', `」${josa(r.title, '을', '를')}`), 'ok'); tutDraw(); };
  ACT['clb-tut-all'] = () => { const T = TUT(); let n = 0; T.list.forEach(v => { if (tutSave(v)) n++; }); toast(n ? `영상 ${n}개를 라이브러리에 저장했습니다.` : '이미 모두 저장했습니다.', n ? 'ok' : ''); tutDraw(); };
  ACT['clb-tut-key'] = () => { closeModal(); UI.settings = 'integr'; go('settings'); };
  document.addEventListener('input', ev => { if (ev.target && ev.target.id === 'clbTutQ') TUT().q = ev.target.value; });
  document.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.isComposing && ev.target && ev.target.id === 'clbTutQ') { ev.preventDefault(); ACT['clb-tut-go'](); } });

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
  .clb-tabs{flex-wrap:nowrap;overflow-x:auto;width:100%;padding-bottom:2px;scrollbar-width:none}.clb-tabs button{flex:0 0 auto}.clb-kinds{grid-template-columns:1fr 1fr}.clb-kind{min-height:130px;padding:12px}.clb-start{padding:16px}}
.clb-topb{display:flex;gap:10px;flex-wrap:wrap}.clb .btn.clb-tutb{min-height:56px;padding:0 20px;font-size:17px;font-weight:700;border-radius:8px;display:inline-flex;align-items:center;gap:8px}
.clb-tut{font-size:16px}.clb-tqr{display:flex;gap:8px;align-items:flex-end}.clb-tqr .clb-fl{flex:1;min-width:0}.clb-tqr input{width:100%;min-height:48px;font-size:16px;box-sizing:border-box}.clb-tqr .btn{min-height:48px;white-space:nowrap}.clb-vh{display:block;font-weight:700;margin:0 0 6px}
.clb-src{border-radius:8px;padding:10px 14px;margin:0 0 12px;font-size:15px;line-height:1.5}.clb-src.ok{background:var(--b50);color:var(--t-ok);display:flex;gap:6px;align-items:center}.clb-src.no{background:#FFF3E0;display:flex;flex-direction:column;gap:6px;align-items:flex-start}.clb-src.no .btn{min-height:44px}
.clb-err{color:var(--t-err,#DE0027)}.clb-tbar{display:flex;gap:10px;align-items:center;margin:4px 0 10px;flex-wrap:wrap}.clb-tbar .sp{flex:1}.clb-tbar .btn{min-height:44px}
.clb-tl{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.clb-tc{display:flex;flex-direction:column;border:1px solid var(--g300);border-radius:8px;overflow:hidden;background:#fff}.clb-tth{display:block;aspect-ratio:16/9;background:var(--g200)}.clb-tth,.clb-tth *{text-decoration:none !important}.clb-tqr input{padding:0 12px;border:1px solid var(--g400);border-radius:8px}.clb-tth img{width:100%;height:100%;object-fit:cover;display:block}
.clb-tq{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#C4302B;background:#FFF5F5}.clb-tt{padding:8px 10px;flex:1;display:flex;flex-direction:column;gap:2px}.clb-tt b{font-size:15px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.clb-tt small{font-size:13px;color:var(--t-sub)}
.clb-ts{margin:0 10px 10px;min-height:44px}.clb-tfind{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:12px 0;padding:10px 12px;border:1px dashed var(--g400,#BFC0C0);border-radius:8px;font-size:15px}.clb-tfind>b{display:inline-flex;align-items:center;gap:4px}.clb-tfind small{color:var(--t-sub,#666767)}.clb-tfl{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;flex:1 1 100%;scrollbar-width:thin;padding-bottom:2px}.clb-tfl a{flex:0 0 auto;padding:8px 12px;border-radius:999px;background:var(--g100,#F1F2F2);color:var(--g900,#2A2B2B);text-decoration:none;font-size:14px;white-space:nowrap}.clb-tfl a:hover{background:var(--s50,#EAEDFF)}.clb-none1{margin:0 0 10px;font-size:15px}.clb-tc.link{border-style:dashed}
@media (max-width:640px){.clb-topb{width:100%}.clb-topb .btn{flex:1 1 100%;justify-content:center}.clb-tqr{flex-direction:column;align-items:stretch}.clb-tl{grid-template-columns:1fr 1fr}.clb-tt b{font-size:14px}}
/* v37 P3: 하나로 합친 라이브러리 — 썸네일 카드 · 목록 · 오른쪽 미리보기 패널 */
.clb-top{align-items:flex-end}.clb-lead{margin:0;color:var(--t-sub);font-size:16px;line-height:1.5;max-width:620px;flex:1 1 320px}
.clb-topb .btn.clb-tutb{min-height:56px;font-size:16px;font-weight:600}
.clb-tools{display:flex;gap:8px;align-items:center;flex:0 1 460px;min-width:0}
.clb-tools .clb-search{flex:1 1 auto;min-width:0}
.clb-vw{display:inline-flex;border:1px solid var(--g400);border-radius:8px;overflow:hidden;flex:0 0 auto}
.clb-vw button{min-height:48px;min-width:56px;padding:0 12px;border:0;background:#fff;font:inherit;font-size:15px;font-weight:600;color:var(--g700);cursor:pointer}
.clb-vw button+button{border-left:1px solid var(--g300)}.clb-vw button.on{background:var(--g900);color:#fff}
.clb-wrap{display:block}.clb-wrap.has-p{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:20px;align-items:start}
.clb-main{min-width:0}
.clb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.clb-card{display:flex;flex-direction:column;align-items:stretch;gap:0;padding:0;overflow:hidden;cursor:pointer;background:#fff;border:1px solid var(--g300);border-radius:10px;box-shadow:var(--e1);transition:border-color .15s,box-shadow .15s}
.clb-card:hover,.clb-lrow:hover{border-color:var(--s400)}
.clb-card:focus-visible,.clb-lrow:focus-visible{outline:none;box-shadow:0 0 0 3px var(--s100);border-color:var(--s400)}
.clb-card.on,.clb-lrow.on{border-color:var(--s500,#5C74F6);box-shadow:0 0 0 2px var(--s100)}
.clb-card .clb-tx{padding:12px 14px 14px;gap:4px}
.clb-card .clb-tx b{font-size:16px}
.clb-th{position:relative;display:block;aspect-ratio:16/9;background:var(--s50);color:var(--s600);overflow:hidden}
.clb-th.k-d{background:#E3F3FC;color:#0B6FAE}.clb-th.k-q{background:#FFF3E0;color:#A84A00}.clb-th.k-f{background:var(--g200);color:var(--g800)}
.clb-th.k-b{background:var(--bk,#5C74F6);color:#fff}
.clb-thi{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px;text-align:center}
.clb-thb{font-size:15px;line-height:1.3;max-width:90%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-shadow:0 1px 2px rgba(0,0,0,.25)}
.clb-thx{font-size:13px;letter-spacing:.04em}
.clb-thimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.clb-thk,.clb-thl{position:absolute;font-style:normal;font-size:12px;font-weight:700;line-height:1;padding:5px 7px;border-radius:6px;background:rgba(31,32,32,.78);color:#fff}
.clb-thk{left:8px;top:8px}.clb-thl{right:8px;bottom:8px}
.clb-list{display:flex;flex-direction:column;gap:8px}
.clb-lrow{display:grid;grid-template-columns:96px minmax(0,1fr) 88px 80px 20px;gap:14px;align-items:center;padding:8px 14px 8px 8px;background:#fff;border:1px solid var(--g300);border-radius:10px;cursor:pointer;min-height:64px}
.clb-lrow[hidden],.clb-card[hidden]{display:none}
.clb-lrow .clb-th{width:96px;border-radius:6px}.clb-lrow .clb-thk,.clb-lrow .clb-thl,.clb-lrow .clb-thb,.clb-lrow .clb-thx{display:none}
.clb-lrow .clb-tx b{font-size:16px;-webkit-line-clamp:1}
.clb-lk{font-size:14px;font-weight:600;color:var(--g800)}.clb-ll{font-size:14px;color:var(--t-sub)}.clb-chev{font-size:20px;color:var(--g600)}
.clb-store{display:flex;gap:6px;align-items:center;margin:16px 0 0;color:var(--t-sub);font-size:14px}
.clb-panel{position:sticky;top:76px;background:#fff;border:1px solid var(--g300);border-radius:12px;box-shadow:var(--e2,0 4px 16px rgba(0,0,0,.08));display:flex;flex-direction:column;max-height:calc(100vh - 96px);overflow:hidden}
.clb-panel[hidden]{display:none}
.clb-ph{display:grid;grid-template-columns:1fr 48px;grid-template-rows:auto auto;column-gap:8px;padding:16px 8px 12px 18px;border-bottom:1px solid var(--g200)}
.clb-pk{grid-column:1;font-size:13px;font-weight:700;color:var(--t-sub)}
.clb-ph>b{grid-column:1;font-size:18px;line-height:1.35;word-break:keep-all;overflow-wrap:anywhere}
.clb-px{grid-column:2;grid-row:1/3;width:48px;height:48px;border:0;background:transparent;border-radius:8px;cursor:pointer;color:var(--g700);display:grid;place-items:center}
.clb-px:hover{background:var(--g100)}
.clb-pb{padding:16px 18px;overflow:auto;flex:1 1 auto;display:flex;flex-direction:column;gap:14px}
.clb-pth{display:block;border-radius:8px;overflow:hidden}.clb-pth .clb-th{border-radius:8px}
.clb-pb .clb-yt span:last-child{display:inline-block;margin-top:8px;font-weight:700;color:var(--link)}
.clb-pbk{background:var(--bk);color:#fff;border-radius:8px;padding:22px 18px;display:flex;flex-direction:column;gap:4px}.clb-pbk b{font-size:18px}
.clb-pch{margin:0;padding-left:20px;line-height:1.7}
.clb-conv{margin:0}.clb-play{min-height:48px}
.clb-pb .clb-dl{margin:0;font-size:15px}.clb-ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}.clb-ul .link{font-size:15px;text-align:left;min-height:32px}
.clb-pa{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px 18px;border-bottom:1px solid var(--g200)}
.clb-pa .btn{min-height:48px;padding:0 6px;font-size:15px;justify-content:center;white-space:nowrap}.clb-pa .btn.pri{grid-column:1/-1;display:inline-flex;align-items:center;gap:6px}
.clb-pa .clb-del{color:var(--t-err,#DE0027)}.clb-pa .clb-del[aria-disabled=true]{color:var(--g500,#9a9b9b);border-style:dashed}
.clb-pno{grid-column:1/-1;margin:0;font-size:13px;color:var(--t-sub);line-height:1.45}
@media (max-width:1100px){.clb-wrap.has-p{grid-template-columns:minmax(0,1fr) 330px}}
@media (max-width:860px){.clb-wrap.has-p{display:block}
  .clb-panel{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:90;max-height:88vh;border-radius:16px 16px 0 0;border:0;box-shadow:0 -8px 30px rgba(0,0,0,.18)}
  body.clb-sheet::before{content:'';position:fixed;inset:0;background:rgba(31,32,32,.45);z-index:89}
  body.clb-sheet .fab,body.clb-sheet #fab{visibility:hidden}
  .clb-lrow{grid-template-columns:80px minmax(0,1fr) 20px;gap:10px}.clb-lrow .clb-th{width:80px}.clb-lk,.clb-ll{display:none}}
@media (max-width:640px){.clb-bar{flex-direction:column;align-items:stretch}.clb-tools{flex:1 1 auto;width:100%}.clb-grid{grid-template-columns:1fr 1fr;gap:10px}
  .clb-card .clb-tx{padding:10px}.clb-card .clb-thb{display:none}.clb-card .clb-tx b{font-size:15px}.clb-card .clb-use{font-size:13px}.clb-card .clb-tx small{display:none}
  .clb-topb .btn.clb-make,.clb-topb .btn.clb-tutb{flex:1 1 100%}}`; document.head.appendChild(st); }
})();
