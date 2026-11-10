/* v22 comm2 — 레거시 디디쌤 가이드 기능 보완: 소통 · 상담(W7)
   가이드: features/community.md · features/message.md · features/consulting(how-to · dashboard · contents · tips).md · app/community · message · notice.md
   ① 메시지: 개별(검색 · 다중 선택) · 팀 · 클래스 · 전체, 연결된 보호자에게도(미연결은 본인만), 이미지 여러 장 · 이미지만, APP/이메일 미리보기,
      플랜별 월 한도 표시 · 초과 차단, 발송 내역 내용 보기 · 검색, 회원 목록(선택) · 회원 상세 · 팀 · 클래스 수강생 탭에서 바로 발송 → 학습자 수신함 S.inbox
   ② 커뮤니티: 게시판 만들기(이름 · 접근 대상, 개수 무제한) · 게시글 댓글/대댓글 · 좋아요 · 첨부 · 정렬 · 미답변 필터 · 숨김/삭제,
      공지(홈페이지/클래스/강의 대상 · 본문 · 첨부 · 조회수 · 강사는 담당 클래스만), 학습노트(강의 · 재생 위치 · 미답변), 수강후기(클래스 상세검색)
   ③ 상담: 채널톡 Access Key/Secret 등록 · 검증, 상담 내역 자동/수동 동기화(데모), 카테고리 2단, 대면 상담(녹음 업로드 2GB · 6개 확장자 / 바로 녹음),
      상담 통계(기간 6개월 · 2단 카테고리 · 요일×시간 · 일/월 · STT/AI 사용량 · 최근 내역 · 카테고리 인사이트), 상담 목록 필터 · 즐겨찾기, 상세(타임라인 · 화자 · 점유율 · 검색 · 인사이트 3카드 편집)
   ④ 학습자 연동: lsSnapshot 감싸기(게시판 · 게시글 · 노트 · 후기 — 닉네임만, 개인정보 없음), LPX 처리기(학습자 글 · 댓글 · 좋아요 · 노트 · 후기 · 공지 조회 · 메시지 읽음) */
'use strict';

/* ───────── 공용 ───────── */
const cmH = s => { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const cmTid = () => (typeof DREG !== 'undefined' && DREG.cur && DREG.cur()) || '';
const cmAu = m => m ? cmH(cmTid() + ':' + (m.sid || m.id)) : '';
const cmTeams = () => (Array.isArray(S.teams) && S.teams.length ? S.teams : (S.groups || []));
const cmTeamOf = m => (m && (m.team || m.group)) || '';
const cmNick = m => { if (!m) return '회원'; if (m.nick) return m.nick; if (S.org.type === 'univ' || !m.name) return '학습자'; return m.name[0] + '○○'; };
const cmSec = s => { s = Math.max(0, Math.round(+s || 0)); const h = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0'); };
const cmSize = n => { n = +n || 0; return n >= 1073741824 ? (n / 1073741824).toFixed(2) + 'GB' : n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : n >= 1024 ? Math.round(n / 1024) + 'KB' : n + 'B'; };
const cmDate = v => { v = atL(v); if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10); /* v38 학습자 UTC 시각 → 현지 날짜 */ const m = v.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : v.slice(0, 10); };
/* 아이콘 보강(없을 때만) */
[['plus', '<path d="M12 5v14M5 12h14"/>'], ['refresh', '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>'], ['upload', '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'], ['mic', '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'], ['edit', '<path d="M4 20h4L19 9l-4-4L4 16z"/>'], ['doc', '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>']].forEach(([k, v]) => { if (typeof IC !== 'undefined' && !IC[k]) IC[k] = v; });
const cmAdminLabel = () => S.me.role === 'teacher' ? (S.me.name || t('teacher')) : '운영자';
const cmMyClasses = () => S.me.role === 'teacher' && typeof tCls === 'function' ? tCls() : S.classes;
const cmItems = c => (c && c.curriculum || []).filter(it => it.type !== 'chapter');
const cmItemName = (cid, iid) => { const c = C(cid); const it = c && (c.curriculum || []).find(x => x.id === iid); return it ? it.title : ''; };
/* 작은 파일 읽기: 이미지 200KB 이하만 dataURL, 그 외는 이름 · 크기 · 형식 메타데이터만 */
const cmReadFiles = (files, o = {}) => Promise.all([...(files || [])].map(f => new Promise(ok => {
  const meta = { name: f.name, size: f.size, type: f.type || '' };
  if (o.max && f.size > o.max) { ok({ ...meta, err: `${cmSize(o.max)} 초과` }); return; }
  if (/^image\//.test(f.type) && f.size <= 200 * 1024) { const r = new FileReader(); r.onload = () => ok({ ...meta, data: String(r.result) }); r.onerror = () => ok(meta); r.readAsDataURL(f); } else ok(meta);
})));
const cmImgOK = d => /^data:image\/(png|jpe?g|gif|webp);base64,/.test(String(d || ''));
/* v36 공지 본문 서식(최소): **굵게** · '- ' 목록 · [글](https://주소) · ![](img:id | https://주소) — 화면에 그릴 때는 모두 이스케이프 후 이 표기만 바꾼다 */
const cmImgSafe = d => /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(String(d || ''));
const cmMdHas = s => /\*\*[^*\n]+\*\*|^\s*[-•]\s+\S|\[[^\]\n]+\]\(https?:\/\/|!\[[^\]\n]*\]\((img:|https:\/\/)/m.test(String(s || ''));
const cmMdImgIds = s => [...String(s || '').matchAll(/!\[[^\]\n]*\]\(img:([\w-]+)\)/g)].map(m => m[1]);
const cmMdText = s => String(s || '').replace(/!\[[^\]\n]*\]\([^)\s]+\)/g, '').replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1').replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/^\s*[-•]\s+/gm, '· ');
const cmMdInl = (s, imgs) => esc(s).replace(/!\[([^\]\n]*)\]\((img:[\w-]+|https:\/\/[^\s)]+)\)/g, (m, a, u) => { const id = u.startsWith('img:') ? u.slice(4) : ''; const v = id ? (imgs || {})[id] : u; return id ? (cmImgSafe(v) ? `<img src="${v}" alt="${a}" data-img="${esc(id)}">` : '') : `<img src="${u}" alt="${a}">`; })
  .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
function cmMd(src, imgs) { let h = '', ul = false; String(src || '').split('\n').forEach(l => { const m = l.match(/^\s*[-•]\s+(.*)$/); if (m) { if (!ul) { h += '<ul>'; ul = true; } h += `<li>${cmMdInl(m[1], imgs)}</li>`; return; } if (ul) { h += '</ul>'; ul = false; } h += l.trim() ? `<div>${cmMdInl(l, imgs)}</div>` : '<div><br></div>'; }); return h + (ul ? '</ul>' : ''); }
/* 편집 칸(contenteditable) → 짧은 표기. imgs에 본문 이미지(dataURL)를 모은다 */
function cmDomMd(root, imgs) { const out = []; let line = ''; const flush = () => { out.push(line.replace(/\s+$/, '')); line = ''; };
  const kids = n => [...n.childNodes].forEach(walk);
  function walk(n) { if (n.nodeType === 3) { line += n.nodeValue.replace(/ /g, ' ').replace(/\n/g, ' '); return; } if (n.nodeType !== 1) return; const tg = n.tagName;
    if (tg === 'BR') { flush(); return; }
    if (tg === 'IMG') { const src = n.getAttribute('src') || ''; const alt = String(n.getAttribute('alt') || '').replace(/[\[\]\n]/g, '').slice(0, 60); if (cmImgSafe(src)) { const id = /^[\w-]+$/.test(n.dataset.img || '') ? n.dataset.img : uid('im'); imgs[id] = src; line += `![${alt}](img:${id})`; } else if (/^https:\/\/[^\s)]+$/.test(src)) line += `![${alt}](${src})`; return; }
    if (tg === 'UL' || tg === 'OL') { if (line.trim()) flush(); else line = ''; [...n.children].forEach(li => { line = '- '; kids(li); flush(); }); return; }
    if (tg === 'B' || tg === 'STRONG') { const sv = line; line = ''; kids(n); const t2 = line; const mm = t2.replace(/\*\*/g, '').match(/^(\s*)([\s\S]*?)(\s*)$/); line = sv + (mm[2] ? `${mm[1]}**${mm[2]}**${mm[3]}` : t2); return; }
    if (tg === 'A') { const sv = line; line = ''; kids(n); const t2 = line.trim(); const h = n.getAttribute('href') || ''; line = sv + (t2 && /^https?:\/\/[^\s)]+$/.test(h) ? `[${t2.replace(/[\[\]]/g, '')}](${h})` : t2); return; }
    const blk = /^(DIV|P|H\d|LI|BLOCKQUOTE|SECTION)$/.test(tg); if (blk && line.trim()) flush(); kids(n); if (blk && line.trim()) flush(); }
  kids(root); if (line.trim()) flush();
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim(); }
/* 이미지 줄이기: 긴 변 960px · JPEG — 본문 이미지 1장 300KB 안쪽 */
const cmShrink = f => new Promise(ok => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const go = mx => { const k = Math.min(1, mx / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', .8); }; let d = go(960); if (d.length > 290000) d = go(640); if (d.length > 290000) d = go(420); ok(d); }; im.onerror = () => ok(''); im.src = String(r.result); }; r.onerror = () => ok(''); r.readAsDataURL(f); });

/* ───────── 데이터 보정(기존 상태 · 빈 스튜디오 모두) ───────── */
function cmEnsure() {
  if (!S || !S.org) return;
  S.posts = Array.isArray(S.posts) ? S.posts : []; S.msgs = Array.isArray(S.msgs) ? S.msgs : []; S.consults = Array.isArray(S.consults) ? S.consults : [];
  S.notes = Array.isArray(S.notes) ? S.notes : []; S.reviews = Array.isArray(S.reviews) ? S.reviews : []; S.inbox = S.inbox && typeof S.inbox === 'object' ? S.inbox : {};
  S.notices = Array.isArray(S.notices) ? S.notices : [];
  S.settings = S.settings || {}; const st = S.settings;
  st.cs = st.cs || { ck: '', skMask: '', status: '미연동', at: '', lastSync: '', bill: null };
  if (!st.commLayout) st.commLayout = 'list';
  if (!Array.isArray(S.boards) || !S.boards.length) S.boards = [{ id: '커뮤니티', name: '커뮤니티', perm: { type: 'all', ids: [] }, sys: true }, { id: '게시판', name: '게시판', perm: { type: 'all', ids: [] }, sys: true }];
  cmBoardsUp(); cmNoticeOrd();
  if (S.cmV === 1) return;
  /* 1회 이전: 학습노트 · 수강후기 게시글 → S.notes · S.reviews, 답변 수(숫자) → 댓글 배열 */
  const firstCls = m => S.classes.find(c => (c.learners || []).includes(m)) || S.classes[0];
  S.posts.forEach(p => {
    if (p.board === '학습노트' && !S.notes.some(n => n.id === p.id)) { const c = firstCls(p.who); const it = cmItems(c).find(x => x.type === 'video') || cmItems(c)[0];
      S.notes.push({ id: p.id, who: p.who, cls: c ? c.id : '', item: it ? it.id : '', at: (cmH(p.id).charCodeAt(0) % 40) * 17 + 30, body: p.title, q: p.kind === '질문', pub: true, created: p.at, comments: +p.replies > 0 ? [{ id: uid('cm'), who: 'admin', by: '운영자', body: '답변을 남겼습니다. 강의 자료의 해당 부분을 함께 확인해 주세요.', at: p.at, replies: [] }] : [] }); p._mv = 1; }
    if (p.board === '수강후기' && !S.reviews.some(r => r.id === p.id)) { const c = firstCls(p.who); S.reviews.push({ id: p.id, who: p.who, cls: c ? c.id : '', stars: 4 + (cmH(p.id).length % 2), body: p.title, at: p.at, hidden: !!p.hidden }); p.rv = p.id; }
  });
  S.posts = S.posts.filter(p => !p._mv);
  S.posts.forEach(p => {
    if (typeof p.replies === 'number') p.replies = p.replies > 0 ? [{ id: uid('cm'), who: 'admin', by: '운영자', body: '답변을 등록했습니다.', at: p.at, replies: [] }] : 0;
    if (Array.isArray(p.replies) && !p.replies.length) p.replies = 0;
    if (!Array.isArray(p.likes)) p.likes = []; if (!Array.isArray(p.files)) p.files = []; if (p.views == null) p.views = 0; if (p.body == null) p.body = p.title || '';
  });
  S.msgs.forEach(m => { if (m.body == null) m.body = ''; if (!Array.isArray(m.imgs)) m.imgs = []; if (!Array.isArray(m.toIds)) m.toIds = []; });
  S.notices.forEach(n => { if (!n.id) n.id = uid('n'); if (n.body == null) n.body = ''; if (n.views == null) n.views = 0; });
  S.classes.forEach(c => (c.notices || []).forEach(n => { if (!n.id) n.id = uid('n'); if (n.body == null) n.body = ''; if (n.views == null) n.views = 0; }));
  /* 상담 카테고리 2단: 기존 자유 텍스트 → 상위 카테고리 */
  if (!Array.isArray(S.cscats)) { S.cscats = []; [...new Set(S.consults.map(c => c.cat).filter(x => x && x !== '미지정'))].forEach(n => S.cscats.push({ id: uid('cc'), name: n, parent: null })); }
  S.consults.forEach(c => cmCsNorm(c));
  S.cmV = 1;
}
/* ───────── v36 다중 게시판 · 공지 순서(반복 실행해도 같은 결과) ─────────
   게시판: { id, name, desc, type(talk|qa|notice|file|free), write('all'|'admin'), cmt, file, perm{type,ids} } · 배열 순서 = 학습자 화면 순서 */
const CM_BT = {
  talk: { l: '질문 · 이야기', ic: 'chat', write: 'all', cmt: true, file: true, d: '강의 · 과제에 대해 질문하고 이야기를 나눕니다.' },
  qa: { l: 'Q&A', ic: 'chat', write: 'all', cmt: true, file: true, d: '궁금한 점을 남기면 운영자가 답합니다.' },
  notice: { l: '공지형', ic: 'send', write: 'admin', cmt: false, file: true, d: '운영자가 소식을 올립니다.' },
  file: { l: '자료실', ic: 'doc', write: 'admin', cmt: false, file: true, d: '자료 · 서식을 내려받습니다.' },
  free: { l: '자유', ic: 'grid', write: 'all', cmt: true, file: true, d: '자유롭게 글을 남깁니다.' }
};
/* 기관 유형별 기본 게시판 세트(공지사항은 소통 › 공지에서 따로 관리) */
function cmPresetBoards() { const ty = S.org.type, cl = t('cls'); const lms = ty === 'univ' && S.org.ed === 'lms';
  const P = {
    univ: [[lms ? '학과 공지' : '프로그램 공지', 'notice', lms ? '학과 · 전공 소식을 올립니다.' : '사업단 · 센터 프로그램 소식을 올립니다.'], ['Q&A', 'qa', `${cl} · 학사 질문을 남기면 답해 드립니다.`], ['자료실', 'file', '강의 자료 · 서식을 내려받습니다.']],
    k12: [['가정통신문', 'notice', '학원 소식 · 일정을 보호자와 함께 봅니다.'], ['질문 게시판', 'qa', '수업 · 숙제 질문을 남깁니다.'], ['자료실', 'file', '수업 자료 · 시험 대비 자료를 내려받습니다.']],
    adult: [['수강 Q&A', 'qa', `${cl} · 수강 질문을 남기면 답해 드립니다.`], ['자료실', 'file', '강의 자료를 내려받습니다.']],
    corp: [['교육 Q&A', 'qa', '사내 교육 질문을 남기면 담당자가 답합니다.'], ['자료실', 'file', '교육 자료 · 양식을 내려받습니다.']],
    lifelong: [['강좌 문의', 'qa', '강좌 · 수강 신청 문의를 남깁니다.'], ['자료실', 'file', '강의 자료를 내려받습니다.']],
    voc: [['훈련 Q&A', 'qa', '훈련 과정 · 출결 질문을 남깁니다.'], ['자료실', 'file', '훈련 자료 · 서식을 내려받습니다.'], ['취업 정보', 'notice', '채용 · 취업 지원 소식을 올립니다.']]
  };
  return (P[ty] || P.adult).map(([name, type, desc]) => ({ name, type, desc })); }
const cmMkBoard = (o = {}) => { const T = CM_BT[o.type] || CM_BT.free; return { id: o.id || uid('bd'), name: o.name || '', desc: o.desc != null ? o.desc : T.d, type: CM_BT[o.type] ? o.type : 'free', write: o.write || T.write, cmt: o.cmt != null ? !!o.cmt : T.cmt, file: o.file != null ? !!o.file : T.file, perm: o.perm || { type: 'all', ids: [] } }; };
function cmBoardsUp() {
  S.boards.forEach(b => { if (!b || typeof b !== 'object') return; if (!b.type) b.type = b.id === '커뮤니티' ? 'talk' : 'free'; const T = CM_BT[b.type] || CM_BT.free;
    if (b.desc == null) b.desc = b.id === '커뮤니티' ? T.d : b.id === '게시판' ? CM_BT.free.d : ''; if (b.write !== 'admin' && b.write !== 'all') b.write = T.write; if (typeof b.cmt !== 'boolean') b.cmt = T.cmt; if (typeof b.file !== 'boolean') b.file = T.file;
    if (!b.perm || typeof b.perm !== 'object') b.perm = { type: 'all', ids: [] }; if (!Array.isArray(b.perm.ids)) b.perm.ids = []; });
  S.boards = S.boards.filter(b => b && b.id);
  if (S.bdV === 1) return;
  /* 1회: 이름이 '게시판'인 기본 게시판은 '자유게시판'으로(주소 id는 그대로), 유형별 기본 세트 추가 */
  const g = S.boards.find(b => b.id === '게시판' && b.name === '게시판'); if (g) g.name = '자유게시판';
  cmPresetBoards().forEach(p => { if (!S.boards.some(b => b.name === p.name)) S.boards.push(cmMkBoard(p)); });
  S.bdV = 1;
}
/* 공지 순서: ord 오름차순(고정이 먼저) */
function cmNoticeOrd() { const L = [...S.notices, ...S.classes.flatMap(c => c.notices || [])]; if (!L.some(n => n && typeof n.ord !== 'number')) return;
  /* 순서가 없는 공지(처음 이전 · AI SAM 등 다른 화면에서 새로 쓴 공지)는 맨 위로 — 그들끼리는 고정 → 최신 순 */
  const has = L.filter(n => typeof n.ord === 'number'); let low = has.length ? Math.min(...has.map(n => n.ord)) : 0;
  L.filter(n => n && typeof n.ord !== 'number').sort((a, b) => (!!b.pin - !!a.pin) || String(b.at || '').localeCompare(String(a.at || ''))).reverse().forEach(n => { low -= 10; n.ord = low; }); }
const cmNOrd = (a, b) => (!!b.pin - !!a.pin) || ((typeof a.ord === 'number' ? a.ord : 1e9) - (typeof b.ord === 'number' ? b.ord : 1e9)) || String(b.at || '').localeCompare(String(a.at || ''));
function cmCsNorm(c) {
  if (!c.catId && c.cat) { const k = S.cscats.find(x => x.name === c.cat && !x.parent); if (k) c.catId = k.id; }
  if (!c.time) c.time = String(9 + (parseInt(cmH(c.id), 36) % 11)).padStart(2, '0') + ':' + (parseInt(cmH(c.id + 'm'), 36) % 2 ? '30' : '00');
  if (!Array.isArray(c.targets)) c.targets = c.who ? [c.who] : [];
  if (!Array.isArray(c.staff)) c.staff = ['운영 담당'];
  if (c.status === undefined) c.status = '완료';
  if (!c.dur) c.dur = c.ch === '채널톡 채팅' ? 0 : 300 + parseInt(cmH(c.id + 'd'), 36) % 900;
}

/* ───────── 학습자 공개본(닉네임만 · 개인정보 없음) ───────── */
function cmCommSnap() {
  cmEnsure(); const tid = cmTid(); const au = id => { const m = M(id); return m ? cmAu(m) : ''; };
  const cm = (x, admin) => ({ id: x.id, nick: x.who === 'admin' ? (x.by || '운영자') : cmNick(M(x.who)), au: x.who === 'admin' ? '' : au(x.who), admin: x.who === 'admin', body: String(x.body || '').slice(0, 2000), at: x.at, replies: (x.replies || []).filter(r => !r.hidden).slice(0, 50).map(r => cm(r)) });
  const files = f => (f || []).slice(0, 10).map(x => ({ name: x.name, size: x.size, type: x.type || '', data: cmImgOK(x.data) && String(x.data).length < 280000 ? x.data : '' }));
  const boards = S.boards.map(b => ({ id: b.id, name: b.name, desc: String(b.desc || '').slice(0, 120), type: b.type || 'free', write: b.write === 'admin' ? 'admin' : 'all', cmt: b.cmt !== false, file: b.file !== false, perm: { type: (b.perm || {}).type || 'all', cls: (b.perm || {}).type === 'cls' ? (b.perm.ids || []) : [], who: ['team', 'members'].includes((b.perm || {}).type) ? cmPermMembers(b).map(id => au(id)).filter(Boolean) : [] } }));
  const posts = S.posts.filter(p => !p.hidden && !p.rv && S.boards.some(b => b.id === p.board)).slice(0, 300).map(p => { const lock = !!(p.tonly || p.priv);
    const adm = p.who === 'admin'; return { id: p.id, board: p.board, kind: p.kind || '이야기', nick: adm ? (p.by || '운영자') : cmNick(M(p.who)), au: adm ? '' : au(p.who), admin: adm, pin: !!p.pin, title: lock ? '' : String(p.title || '').slice(0, 120), body: lock ? '' : String(p.body || '').slice(0, 4000), lock, tonly: !!p.tonly, priv: !!p.priv, cls: p.cls || '', item: p.item || '', files: lock ? [] : files(p.files), likes: (p.likes || []).length, likedBy: (p.likes || []).map(id => au(id)), cmts: lock ? [] : (Array.isArray(p.replies) ? p.replies : []).filter(r => !r.hidden).slice(0, 100).map(r => cm(r)), ncmt: Array.isArray(p.replies) ? p.replies.length : 0, at: p.at, ua: p.ua || '', views: p.views || 0 }; });
  const notes = S.notes.filter(n => !n.hidden && (n.pub || (n.comments || []).length)).slice(0, 400).map(n => ({ id: n.id, cls: n.cls, item: n.item, t: n.at || 0, q: !!n.q, lock: !n.pub, body: n.pub ? String(n.body || '').slice(0, 2000) : '', nick: cmNick(M(n.who)), au: au(n.who), at: n.created || '', ua: n.ua || '', cmts: (n.comments || []).slice(0, 50).map(r => cm(r)) }));
  const reviews = S.reviews.filter(r => !r.hidden).slice(0, 400).map(r => ({ id: r.id, cls: r.cls, stars: r.stars, body: String(r.body || '').slice(0, 2000), nick: cmNick(M(r.who)), au: au(r.who), at: r.at, ua: r.ua || '' }));
  const enr = Object.fromEntries(S.classes.map(c => [c.id, (c.learners || []).map(id => au(id)).filter(Boolean)]));
  const cfg = Object.fromEntries(S.classes.map(c => [c.id, { community: c.community || 'class', kind: c.kind || 'period' }]));
  return { v: 1, at: nowStr(), tid, boards, posts, notes, reviews, enr, cfg, layout: S.settings.commLayout || 'list', reviewCond: S.settings.reviewCond || '누구나' };
}
function cmNoticeSnap() {
  /* v36 서식(굵게 · 목록 · 링크 · 이미지)은 body에 짧은 표기로 저장 → 학습자 화면이 lcMd로 안전하게 그린다(fmt). txt는 미리보기용 일반 글 */
  const base = (n, c) => { const body = String(n.body || '').slice(0, 5000); const fmt = cmMdHas(body); const used = fmt ? cmMdImgIds(body) : [];
    return { id: n.id, title: n.title, at: n.at, pin: !!n.pin, ord: typeof n.ord === 'number' ? n.ord : null, cls: c ? c.name : '', clsId: c ? c.id : '', item: n.item || '', itemName: c && n.item ? cmItemName(c.id, n.item) : '', body, ...(fmt ? { fmt: 1, txt: cmMdText(body).slice(0, 2000), imgs: Object.fromEntries(Object.entries(n.imgs || {}).filter(([k, v]) => used.includes(k) && cmImgOK(v) && String(v).length < 300000).slice(0, 4)) } : {}), files: (n.files || []).map(f => ({ name: f.name, size: f.size })), views: n.views || 0 }; };
  return [...(S.notices || []).map(n => [n, base(n, null)]), ...S.classes.flatMap(c => (c.notices || []).map(n => [n, base(n, c)]))].sort((a, b) => cmNOrd(a[0], b[0])).map(x => x[1]).slice(0, 200);
}
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { r.comm = cmCommSnap(); r.notices = cmNoticeSnap(); } catch (e) { console.error('comm2 snap', e); } return r; }; }
/* 커뮤니티 · 공지는 실시간 소식이므로 게시본에 바로 반영(학습자 사이트 디자인 초안은 그대로) */
function cmPub() { try { if (S && S.lsite && S.lsite.pub) { S.lsite.pub.comm = cmCommSnap(); S.lsite.pub.notices = cmNoticeSnap(); } } catch (e) { console.error(e); } /* 운영: PUT /api/pub/<tid>/comm */ }
const cmSave = () => { cmPub(); save(); };
function cmPermMembers(b) { const p = b.perm || {}; if (p.type === 'team') return S.members.filter(m => (p.ids || []).includes(cmTeamOf(m))).map(m => m.id); if (p.type === 'members') return (p.ids || []).filter(id => M(id)); if (p.type === 'cls') return [...new Set((p.ids || []).flatMap(id => (C(id) || {}).learners || []))]; return S.members.map(m => m.id); }
const cmPermLabel = b => { const p = b.perm || {}; const n = (p.ids || []).length; return p.type === 'cls' ? `${t('cls')} 수강생 · ${n}개` : p.type === 'team' ? `${t('group')} · ${n}개` : p.type === 'members' ? `지정 회원 ${n}명` : '전체 회원'; };

/* ═════════ ① 메시지 ═════════ */
const CM_LIMIT = { standard: 1000, premium: 10000, enterprise: 0 };
const cmLimit = () => { const v = S.settings.msgLimit; return v != null && v !== '' ? +v : (CM_LIMIT[S.org.plan] ?? 10000); };
const cmMonthUsed = () => { const ym = today().slice(0, 7); return S.msgs.filter(m => cmDate(m.at).slice(0, 7) === ym || String(m.at).startsWith(ym.replace('-', '. '))).reduce((s, m) => s + (+m.n || 0), 0); };
const cmMC = () => { UI.mc = UI.mc || { mode: 'all', ids: [], par: false, imgs: [] }; if (UI.msgTo) { const v = UI.msgTo; UI.msgTo = ''; const [k, id] = String(v).split(':');
    UI.mc = { ...UI.mc, mode: v === 'all' ? 'all' : v === 'par' ? 'all' : k === 'grp' || k === 'team' ? 'team' : k === 'cls' ? 'cls' : k === 'mem' ? 'ind' : 'all', ids: id ? id.split(',').filter(Boolean) : [], par: v === 'par' ? true : UI.mc.par }; }
  return UI.mc; };
function cmRecipients(mc) {
  const okM = m => m && !['승인 대기', '거절'].includes(m.grade);
  let ids = mc.mode === 'all' ? S.members.filter(okM).map(m => m.id) : mc.mode === 'team' ? S.members.filter(m => okM(m) && mc.ids.includes(cmTeamOf(m))).map(m => m.id) : mc.mode === 'cls' ? [...new Set(mc.ids.flatMap(id => (C(id) || {}).learners || []))] : mc.ids.filter(id => M(id));
  ids = [...new Set(ids)];
  const pars = mc.par ? (S.parents || []).filter(p => ids.includes(p.child) && /연결 완료/.test(p.status || '')) : [];
  return { ids, pars, noPar: mc.par ? ids.filter(id => !pars.some(p => p.child === id)).length : 0 };
}
const cmToLabel = mc => { const n = mc.ids.length; if (mc.mode === 'all') return '전체 ' + t('learner'); if (mc.mode === 'team') return mc.ids.map(id => (cmTeams().find(g => g.id === id) || {}).name).filter(Boolean).join(', ') || t('group'); if (mc.mode === 'cls') return mc.ids.map(id => (C(id) || {}).name).filter(Boolean).join(', ') || t('cls'); return n === 1 ? (M(mc.ids[0]) || {}).name || '개별' : `개별 ${n}명`; };
function cmPickMembers(title, sel, cb) {
  if (typeof pickTargets === 'function') { try { return pickTargets(title, sel, r => { const L = (r || []).flatMap(x => M(x) ? [x] : S.members.filter(m => cmTeamOf(m) === x).map(m => m.id)); setTimeout(() => cb([...new Set(L)]), 0); }); } catch (e) { console.error(e); } }
  const cur = new Set(sel || []);
  const rows = q => S.members.filter(m => !q || (m.name + (m.nick || '') + (m.email || '') + (m.phone || '') + (m.sid || '') + JSON.stringify(m.extra || {})).toLowerCase().includes(q)).slice(0, 300).map(m => `<label class="ckl cmpk"><input type="checkbox" value="${esc(m.id)}" ${cur.has(m.id) ? 'checked' : ''}> <b>${esc(m.name)}</b> <small class="mini">${esc((cmTeams().find(g => g.id === cmTeamOf(m)) || {}).name || '')} ${esc(S.org.type === 'univ' ? (m.sid || (m.extra || {}).학번 || '') : (m.email || ''))}</small></label>`).join('') || '<p class="mini">검색 결과가 없습니다.</p>';
  const w = modal(title, `<div class="bar2"><input type="search" id="cmPkQ" placeholder="이름 · ${S.org.type === 'univ' ? '학번' : '이메일 · 연락처'} 검색" aria-label="회원 검색"><button type="button" class="btn sm ghost" id="cmPkAll">보이는 회원 모두 선택</button></div><div class="cmpkl" id="cmPkL">${rows('')}</div><p class="mini" id="cmPkN">${cur.size}명 선택</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '선택 완료', kind: 'pri', run: () => { const r = [...cur]; setTimeout(() => cb(r), 0); } }], true);
  const L = w.querySelector('#cmPkL'); const N = () => { w.querySelector('#cmPkN').textContent = cur.size + '명 선택'; };
  L.addEventListener('change', e => { const x = e.target; if (x.type !== 'checkbox') return; x.checked ? cur.add(x.value) : cur.delete(x.value); N(); });
  w.querySelector('#cmPkQ').addEventListener('input', e => { L.innerHTML = rows(e.target.value.trim().toLowerCase()); });
  w.querySelector('#cmPkAll').addEventListener('click', () => { L.querySelectorAll('input[type=checkbox]').forEach(x => { x.checked = true; cur.add(x.value); }); N(); });
}
VIEWS.message = () => { cmEnsure(); const mc = cmMC(); const R = cmRecipients(mc); const lim = cmLimit(), used = cmMonthUsed(); const k12 = S.org.type === 'k12' || (S.parents || []).length;
  const modes = [['ind', '개별 ' + t('learner')], ['team', t('group')], ['cls', t('cls')], ['all', '전체']];
  const pickList = mc.mode === 'team' ? cmTeams().map(g => [g.id, g.name, S.members.filter(m => cmTeamOf(m) === g.id).length]) : mc.mode === 'cls' ? S.classes.map(c => [c.id, c.name, (c.learners || []).length]) : [];
  const target = mc.mode === 'ind' ? `<div class="cmchips">${mc.ids.map(id => `<span class="tag">${esc((M(id) || {}).name || id)} <button type="button" class="cmx" data-act="cm-mc-rm" data-v="${esc(id)}" aria-label="빼기">×</button></span>`).join('') || '<span class="mini">받는 사람을 선택하세요.</span>'}</div><button type="button" class="btn sm" data-act="cm-mc-pick">${ic('plus', 14)} ${esc(t('learner'))} 검색 · 선택</button>`
    : mc.mode === 'all' ? `<p class="mini">가입 승인 대기 · 거절 회원을 뺀 전체 ${esc(t('learner'))}에게 보냅니다.</p>`
      : `<input type="search" id="cmMcQ" placeholder="${esc(mc.mode === 'team' ? t('group') : t('cls'))} 검색" aria-label="검색" class="cmq"><div class="cmpkl sm" id="cmMcL">${pickList.map(([id, n, k]) => `<label class="ckl cmpk" data-n="${esc(n.toLowerCase())}"><input type="checkbox" data-chg="cm-mc-ids" value="${esc(id)}" ${mc.ids.includes(id) ? 'checked' : ''}> ${esc(n)} <small class="mini">${k}명</small></label>`).join('') || `<p class="mini">${esc(mc.mode === 'team' ? tj('group', '이') : tj('cls', '이'))} 없습니다.</p>`}</div>`;
  const imgs = (mc.imgs || []).map((f, i) => `<span class="cmimg">${f.data ? `<img src="${esc(f.data)}" alt="">` : ic('doc', 18)}<small>${esc(f.name)} · ${cmSize(f.size)}</small><button type="button" class="cmx" data-act="cm-mc-img-rm" data-v="${i}" aria-label="이미지 빼기">×</button></span>`).join('');
  const usage = `<div class="cmuse"><span>이번 달 발송</span><b>${num(used)}${lim ? ' / ' + num(lim) : ''}건</b>${lim ? bar(used / lim * 100, used >= lim ? 'r' : '') : '<small class="mini">무제한</small>'}<small class="mini">${esc({ standard: '스탠다드', premium: '프리미엄', enterprise: '엔터프라이즈' }[S.org.plan] || S.org.plan || '')} 플랜 · 1명${(typeof mbGuardOn === 'function' ? mbGuardOn() : S.org.type === 'k12') ? '(보호자 포함)' : ''}당 1건</small></div>`;
  const qq = (UI.mhQ || '').toLowerCase(); const mhA = UI.mhA || {}; const H = S.msgs.filter(m => (!qq || (m.title + ' ' + m.body + ' ' + m.to).toLowerCase().includes(qq)) && (!mhA.ch || cmChKind(m) === mhA.ch) && (!mhA.f || cmYmd(m.at) >= mhA.f) && (!mhA.t || cmYmd(m.at) <= mhA.t));
  return head('메시지', `앱 푸시 + 가입 이메일 동시 발송 · 개별 / ${esc(t('group'))} / ${esc(t('cls'))} / 전체${(typeof mbGuardOn === 'function' ? mbGuardOn() : S.org.type === 'k12') ? ' · 보호자 포함' : ''} · 이미지 여러 장 ${guideRef('features/message.md')}`) +
  `<div class="cm26"><div class="card cm26w"><div class="ch"><b>메시지</b><button type="button" class="btn sm ai" data-act="ai-msg">✦ AI SAM 작성</button></div>
    <label class="fl">제목 <small class="mini">(이미지만 보낼 때는 비워도 됩니다)</small><input id="msgT" maxlength="60" value="${esc(UI.msgDraftT || '')}" placeholder="제목을 입력해 주세요."></label>
    <label class="fl cm26ta">내용<textarea id="msgB" rows="9" maxlength="2000" placeholder="메시지를 입력해 주세요.">${esc(UI.msgDraft || '')}</textarea><small class="cm26n" id="msgBc">${String(UI.msgDraft || '').length}/2000</small></label>
    <div class="fl">이미지 <small class="mini">(${(mc.imgs || []).length}/10장 · 장당 10MB)</small><label class="cm26drop">${ic('plus', 15)} 이미지 추가<input type="file" accept="image/*" id="cmMsgImg" multiple></label><div class="cmimgs">${imgs}</div></div>
    ${usage}
    <button class="btn pri cm26send" data-act="msg-send" ${lim && used >= lim ? 'disabled' : ''}>보내기</button><p class="mini">${lim && used >= lim ? '<b class="r">이번 달 발송 한도를 모두 사용했습니다. 플랜을 올리거나 다음 달에 보내세요.</b> ' : ''}${esc(t('teacher'))}${(c => (c.charCodeAt(0) - 0xAC00) % 28 ? '은' : '는')(String(t('teacher')).slice(-1))} 발송할 수 있지만 발송 내역은 볼 수 없습니다. 앱이 없는 회원은 가입 이메일로 받습니다.</p></div>
    <div class="card cm26t"><div class="ch"><b>발송 대상</b>${mc.mode === 'ind' ? `<button type="button" class="btn sm pri" data-act="cm-mc-mode" data-v="all">${esc(t('learner'))} 전체 선택</button>` : ''}</div>
    <div class="fl"><span class="sr">받는 사람</span><div class="seg2 cmseg cm26r" role="radiogroup" aria-label="받는 사람 범위">${modes.map(([k, l]) => `<button type="button" role="radio" aria-checked="${mc.mode === k}" class="${mc.mode === k ? 'on' : ''}" data-act="cm-mc-mode" data-v="${k}">${esc(l)}</button>`).join('')}</div>${target}</div>
    <p class="cm26cnt" id="cmRcp">받는 사람 <b>${R.ids.length}명</b>${mc.par ? ` + 보호자 ${R.pars.length}명${R.noPar ? ` · 보호자 미연결 ${R.noPar}명은 본인에게만 보냅니다` : ''}` : ''}</p>
    ${R.ids.length ? '' : `<p class="cm26empty">${ic('info', 15)} 메시지를 보낼 대상을 추가해 주세요.</p>`}
    <div class="cm26who"><b>발송 대상 지정</b><label class="ckl"><input type="checkbox" checked disabled> ${esc(t('learner'))}</label>${(typeof mbGuardOn === 'function' ? mbGuardOn() : (k12 || S.parents)) ? `<label class="ckl"><input type="checkbox" data-chg="cm-mc-par" ${mc.par ? 'checked' : ''}> 연결된 보호자</label>` : ''}</div></div></div>
  <div class="cm26b">    <div class="card"><div class="ch"><b>알림톡 자동 발송</b><small>고정 템플릿 · 수정/수동 발송 불가</small></div>${(typeof AUTO_TALK !== 'undefined' ? AUTO_TALK : []).map(([a, b]) => { const pay = typeof mbPayOn !== 'function' || mbPayOn(); if (!pay && /결제/.test(a)) return ['수강신청 완료', '신청 직후']; return [a, b]; }).filter(([a]) => !/청구서/.test(a) || S.org.type === 'k12').filter(([a]) => !/배지/.test(a) || (typeof menuOn === 'function' && menuOn('badge'))).map(([a, b]) => `<div class="row"><span>${esc(a)}</span><small>${esc(b)}</small></div>`).join('')}<p class="mini">개별 알림톡 · SMS 수동 발송은 지원하지 않습니다. 운영자가 직접 만든 계정(국내 번호 없음)은 알림톡을 받지 못합니다. 반복 안내는 업무 자동화에서 조건별로 자동 발송하세요.</p><button class="btn sm" data-act="go" data-v="auto">업무 자동화 열기</button>
    ${cmNudgeCard()}</div></div>` +
  (S.me.role === 'teacher' ? '' : cmHistCard(H, qq, mhA));
};
/* v26.7 메시지 발송 내역(피그마 Studio › 메시지 › 메시지 발송 내역): 총 N개 · 상세검색(유형 · 발송 일시) · 검색 · 발송 방식 칩 · 발송 건수 · 읽음 · 발송자 · 상세 › */
const cmYmd = at => { const m = String(at || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : ''; };
const cmChKind = m => /이메일|메일/.test(m.ch || '') && !/앱|푸시/.test(m.ch || '') ? 'mail' : 'app';
const cmChLbl = m => cmChKind(m) === 'mail' ? '이메일' : '앱 메시지';
const cmHistCard = (H, qq, a) => `<div class="card cm26h"><div class="cm26hh"><b>메시지 발송 내역</b><small>지금까지 발송한 앱 메시지 · 이메일 내역을 확인할 수 있어요.</small></div>
  <div class="cm26hb"><b>총 ${H.length}개${!UI.mhAdv && (a.ch || a.f || a.t) ? ` <button type="button" class="btn sm ghost" data-act="cm-mh-reset">상세검색 조건 해제</button>` : ''}</b><span class="cm26hs"><button type="button" class="cm26adv ${UI.mhAdv ? 'on' : ''}" data-act="cm-mh-adv" aria-expanded="${!!UI.mhAdv}">상세검색 ${UI.mhAdv ? '▲' : '▼'}</button><span class="bar2"><input type="search" id="cmMhQ" placeholder="메시지 내용 검색" value="${esc(UI.mhQ || '')}" aria-label="발송 내역 검색"></span></span></div>
  ${UI.mhAdv ? `<div class="cm26ap" role="group" aria-label="상세검색"><div class="cm26ar"><span>유형</span>${[['', '전체'], ['app', '앱 메시지'], ['mail', '이메일']].map(([k, l]) => `<label class="ckl"><input type="radio" name="cmMhCh" data-chg="cm-mh-f" data-k="ch" value="${k}" ${(a.ch || '') === k ? 'checked' : ''}> ${l}</label>`).join('')}</div><div class="cm26ar"><span>발송 일시</span><input type="date" data-chg="cm-mh-f" data-k="f" value="${esc(a.f || '')}" aria-label="시작일"> ~ <input type="date" data-chg="cm-mh-f" data-k="t" value="${esc(a.t || '')}" aria-label="종료일"><button type="button" class="btn sm ghost" data-act="cm-mh-reset">초기화</button></div></div>` : ''}
  ${table(['발송 방식', '내용', '발송 일시', '받는 사람', '발송 건수', '읽음', '발송자', '메시지 상세'], H.map(m => { const rd = cmReadN(m); return [`<span class="cm26chip">${cmChLbl(m)}</span>`, `<b>${esc(m.title || '(제목 없음)')}</b>${(m.imgs || []).length ? ` <small class="mini">이미지 ${m.imgs.length}</small>` : ''}<br><small class="mini">${esc(String(m.body || '').slice(0, 50))}</small>`, esc(m.at), esc(m.to) + (m.parents ? ' ' + tag('보호자 포함', 'mg') : ''), m.n + '건', rd == null ? '—' : rd + '명', esc(m.by || '—'), `<button class="cm26go2" data-act="cm-msg-view" data-v="${esc(m.id)}" aria-label="메시지 상세">›</button>`]; }), qq || a.ch || a.f || a.t ? '검색 결과가 없습니다.' : '발송한 메시지가 없습니다.')}</div>`;
ACT['cm-mh-adv'] = () => { UI.mhAdv = !UI.mhAdv; render(); };
ACT['cm-mh-reset'] = () => { UI.mhA = {}; render(); };
ACT['cm-mh-f'] = el => { UI.mhA = { ...(UI.mhA || {}), [el.dataset.k]: el.value }; render(); };
const cmReadN = m => { if (!m.toIds || !m.toIds.length) return null; let n = 0; Object.values(S.inbox).forEach(L => (L || []).forEach(x => { if (x.msg === m.id && x.read) n++; })); return n; };
function cmNudgeCard() { const r = S.settings.nudgeRule || { base: 'period', v: 50, rate: 30, when: '09:00', on: !!S.settings.nudge };
  return `<div class="cmnudge"><div class="ch"><b>수강 독려 메시지</b><small>설정 › 서비스 설정과 같은 값</small></div><label class="ckl"><input type="checkbox" data-chg="cm-nudge" data-k="on" ${r.on ? 'checked' : ''}> 수강 독려 메시지 사용</label>
    <div class="form2"><label>기준<select data-chg="cm-nudge" data-k="base"><option value="period" ${r.base === 'period' ? 'selected' : ''}>수강 기간 경과율</option><option value="left" ${r.base === 'left' ? 'selected' : ''}>잔여 수강 기간(일)</option></select></label><label>${r.base === 'left' ? '잔여 일수' : '경과율(%)'}<input type="number" min="1" max="${r.base === 'left' ? 365 : 100}" value="${esc(r.v)}" data-chg="cm-nudge" data-k="v"></label><label>수강률(%) 이하<input type="number" min="0" max="100" value="${esc(r.rate)}" data-chg="cm-nudge" data-k="rate"></label><label>발송 시각<input type="time" value="${esc(r.when)}" data-chg="cm-nudge" data-k="when"></label></div>
    <p class="mini">예: 수강 기간 ${r.base === 'left' ? `종료 ${esc(r.v)}일 전` : `${esc(r.v)}% 경과`} 시점에 수강률 ${esc(r.rate)}% 이하인 ${esc(t('learner'))}에게 ${esc(r.when)}에 앱 푸시 + 이메일로 보냅니다(데모: 조건만 저장).</p></div>`; }
ACT['cm-nudge'] = el => { const r = S.settings.nudgeRule = S.settings.nudgeRule || { base: 'period', v: 50, rate: 30, when: '09:00', on: !!S.settings.nudge }; const k = el.dataset.k; r[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? clamp(+el.value || 0, 0, k === 'v' && r.base === 'left' ? 365 : 100) : el.value; if (k === 'on') S.settings.nudge = r.on; save(); render(); };
ACT['cm-mc-mode'] = el => { const mc = cmMC(); cmKeepDraft(); mc.mode = el.dataset.v; mc.ids = []; render(); };
ACT['cm-mc-ids'] = el => { const mc = cmMC(); cmKeepDraft(); mc.ids = el.checked ? [...new Set([...mc.ids, el.value])] : mc.ids.filter(x => x !== el.value); render(); };
ACT['cm-mc-par'] = el => { cmKeepDraft(); cmMC().par = el.checked; render(); };
ACT['cm-mc-rm'] = el => { cmKeepDraft(); const mc = cmMC(); mc.ids = mc.ids.filter(x => x !== el.dataset.v); render(); };
ACT['cm-mc-img-rm'] = el => { cmKeepDraft(); const mc = cmMC(); mc.imgs.splice(+el.dataset.v, 1); render(); };
ACT['cm-mc-pick'] = () => { cmKeepDraft(); const mc = cmMC(); cmPickMembers(`받는 ${t('learner')} 선택`, mc.ids, ids => { mc.ids = ids; mc.mode = 'ind'; render(); }); };
const cmKeepDraft = () => { const a = $('#msgT'), b = $('#msgB'); if (a) UI.msgDraftT = a.value; if (b) UI.msgDraft = b.value; };
document.addEventListener('input', e => { const x = e.target;
  if (x.id === 'cmMcQ') { const q = x.value.trim().toLowerCase(); $$('#cmMcL .cmpk').forEach(l => { l.style.display = !q || l.dataset.n.includes(q) ? '' : 'none'; }); }
  if (x.id === 'cmMhQ') { UI.mhQ = x.value; const pos = x.selectionStart; render(); const y = $('#cmMhQ'); if (y) { y.focus(); try { y.setSelectionRange(pos, pos); } catch (er) { } } }
});
document.addEventListener('change', e => { if (e.target.id !== 'cmMsgImg') return; const mc = cmMC(); cmKeepDraft(); const F = [...e.target.files];
  const bad = F.filter(f => !/^image\//.test(f.type)); if (bad.length) toast('이미지 파일만 첨부할 수 있습니다.', 'warn');
  cmReadFiles(F.filter(f => /^image\//.test(f.type)), { max: 10 * 1048576 }).then(L => { const ok = L.filter(f => !f.err); if (L.length - ok.length) toast('10MB를 넘는 이미지는 뺐습니다.', 'warn'); mc.imgs = [...(mc.imgs || []), ...ok].slice(0, 10); if ((mc.imgs || []).length >= 10 && ok.length) toast('이미지는 최대 10장입니다.'); render(); }); });
ACT['msg-send'] = () => { cmEnsure(); cmKeepDraft(); const mc = cmMC(); const tt = (UI.msgDraftT || '').trim(), b = (UI.msgDraft || '').trim(); const imgs = mc.imgs || [];
  if (!tt && !b && !imgs.length) { toast('내용을 입력하거나 이미지를 첨부하세요.', 'warn'); return; }
  if (!imgs.length && !b) { toast('내용을 입력하세요.', 'warn'); return; }
  const R = cmRecipients(mc); if (!R.ids.length) { toast('받는 사람을 선택하세요.', 'warn'); return; }
  const n = R.ids.length + R.pars.length; const lim = cmLimit(), used = cmMonthUsed(); if (lim && used + n > lim) { toast(`이번 달 남은 발송 건수(${num(Math.max(0, lim - used))}건)를 넘습니다.`, 'bad'); return; }
  const title = tt || (b ? b.slice(0, 30) : `이미지 ${imgs.length}장`); const imH = imgs.map(f => f.data ? `<img src="${esc(f.data)}" alt="">` : `<span class="tag">${esc(f.name)}</span>`).join('');
  const w = modal('발송 확인', `<p><b>${esc(cmToLabel(mc))}</b> ${R.ids.length}명${R.pars.length ? ` + 보호자 ${R.pars.length}명` : ''}에게 앱 푸시 + 이메일로 발송합니다.${R.noPar ? ` 보호자 미연결 ${R.noPar}명은 본인에게만 갑니다.` : ''}</p>
    <div class="seg2" role="tablist"><button type="button" class="on" data-pv="app">APP 미리보기</button><button type="button" data-pv="mail">이메일 미리보기</button></div>
    <div class="cmpv" data-pvb="app"><div class="cmapp"><small>${esc(S.org.name)} · 지금</small><b>${esc(tt)}</b><p>${esc(b).replace(/\n/g, '<br>')}</p><div class="cmpvimg">${imH}</div></div></div>
    <div class="cmpv" data-pvb="mail" hidden><div class="cmmail"><small>보낸 사람: ${esc(S.org.name)} &lt;no-reply@${esc(S.org.domain)}&gt;</small><b>[${esc(S.org.name)}] ${esc(title)}</b><p>${esc(b).replace(/\n/g, '<br>')}</p><div class="cmpvimg">${imH}</div><small class="mini">이 메일은 발신 전용입니다.</small></div></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '발송', kind: 'pri', run: () => cmSend(mc, title, b, imgs, R) }]);
  w.addEventListener('click', e => { const x = e.target.closest('[data-pv]'); if (!x) return; w.querySelectorAll('[data-pv]').forEach(y => y.classList.toggle('on', y === x)); w.querySelectorAll('[data-pvb]').forEach(y => { y.hidden = y.dataset.pvb !== x.dataset.pv; }); });
};
function cmSend(mc, title, body, imgs, R) {
  const id = uid('ms'), at = nowStr(), n = R.ids.length + R.pars.length;
  S.msgs.unshift({ id, at, to: cmToLabel(mc), mode: mc.mode, toIds: R.ids, parents: !!mc.par, pIds: R.pars.map(p => p.id), title, body, imgs: imgs.map(f => ({ name: f.name, size: f.size, type: f.type, data: f.data || '' })), ch: '앱 푸시 + 이메일', n, by: S.me.name });
  const entry = extra => ({ id: uid('ib'), msg: id, at, title, body, imgs: imgs.length, read: false, from: S.org.name, ...extra });
  R.ids.forEach(mid => { (S.inbox[mid] = S.inbox[mid] || []).unshift(entry({})); S.inbox[mid] = S.inbox[mid].slice(0, 200); });
  R.pars.forEach(p => { const k = 'par:' + (p.acct || p.id); /* v38 보호자 계정 id(학습자 메시지함이 읽는 키) — 계정 전이면 행 id(가입 연결 시 옮김) */ (S.inbox[k] = S.inbox[k] || []).unshift(entry({ child: (M(p.child) || {}).name || '' })); S.inbox[k] = S.inbox[k].slice(0, 200); });
  /* 운영: POST /api/messages { toIds, parents, title, body, imgs } → 앱 푸시(FCM) + 가입 이메일 발송 */
  UI.msgDraft = UI.msgDraftT = ''; mc.imgs = []; logAudit(`메시지 발송 — ${title} (${n}명)`); save(); render(); toast(`${n}명에게 발송했습니다(데모).`, 'ok');
}
ACT['cm-msg-view'] = el => { const m = S.msgs.find(x => x.id === el.dataset.v); if (!m) return; const ids = m.toIds || [];
  const row = (k, v) => `<div class="cm26dr"><span>${k}</span><div>${v}</div></div>`;
  modal('메시지 발송 내역 상세', `<div class="cm26d"><b class="cm26dt">메시지 정보</b>${row('발송자', esc(m.by || '—'))}${row('발송 결과', '<span class="tag g">발송 완료</span>')}${row('발송 건수', `${m.n}건${cmReadN(m) != null ? ` · 읽음 ${cmReadN(m)}명` : ''}`)}${row('발송 일시', esc(m.at))}<hr>${row('유형', `${cmChLbl(m)} <small class="mini">${esc(m.ch || '')}</small>`)}${row('제목', esc(m.title || '(제목 없음)'))}${row('내용', m.body ? esc(m.body).replace(/\n/g, '<br>') : '<span class="mini">(내용 없음)</span>')}
    ${(m.imgs || []).length ? row('이미지', `<div class="cmpvimg">${m.imgs.map(f => f.data && cmImgOK(f.data) ? `<a href="${esc(f.data)}" download="${esc(f.name)}" title="내려받기"><img src="${esc(f.data)}" alt="${esc(f.name)}"></a>` : `<span class="tag">${esc(f.name)} · ${cmSize(f.size)}</span>`).join('')}</div><p class="mini">이미지를 눌러 내려받습니다(데모: 200KB 넘는 이미지는 이름만 보관).</p>`) : ''}<hr>
    <div class="cm26rc"><b>수신자 <em>(${ids.length || m.n}명)</em></b><div>${ids.length ? ids.slice(0, 80).map(id => `<span class="chip">${esc((M(id) || {}).name || '—')}</span>`).join('') + (ids.length > 80 ? `<span class="mini">외 ${ids.length - 80}명</span>` : '') : `<span class="mini">${esc(m.to || '')}</span>`}</div></div></div>`, [{ id: 'c', label: '닫기' }], true); };
ACT['msg-to'] = el => { UI.msgTo = el.dataset.v; go('message'); };
/* 회원 목록(선택) · 회원 상세 · 클래스 수강생 탭에서 바로 발송 */
AFTER.push(cur => { if (!S || !S.org) return;
  if (cur.tab === 'members' && !UI.mem) { const tb = $('main .tw table') || $('.tw table'); if (tb && !tb.querySelector('.mchk') && !tb.querySelector('[data-chg=mb-sel]')) /* v25.2: 회원 목록(mem2)이 자체 선택 체크박스를 가지면 중복 주입하지 않는다 */ { tb.querySelectorAll('tbody tr').forEach(tr => { const a = tr.querySelector('[data-act=mem-open][data-v]'); if (a) tr.cells[0].insertAdjacentHTML('afterbegin', `<input type="checkbox" class="mchk cmck" data-id="${esc(a.dataset.v)}" aria-label="선택"> `); }); const th = tb.querySelector('thead th'); if (th) th.insertAdjacentHTML('afterbegin', '<input type="checkbox" class="cmck" id="cmMAll" aria-label="모두 선택"> '); }
    const ph = $('.ph .phr'); if (ph && !ph.querySelector('[data-act=cm-mem-msg]')) ph.insertAdjacentHTML('afterbegin', `<button class="btn" data-act="cm-mem-msg">${ic('send', 15)} 선택 회원 메시지</button>`); }
  if (cur.tab === 'members' && UI.mem) { const ph = $('.ph .phr'); if (ph && !ph.querySelector('[data-act=msg-to]')) ph.insertAdjacentHTML('afterbegin', `<button class="btn" data-act="msg-to" data-v="mem:${esc(UI.mem)}">${ic('send', 15)} 메시지</button>`); }
  if (cur.tab === 'class' && UI.cls && (UI.clsT || 'learners') === 'learners') { const b = $('.bar2'); const c = C(UI.cls); if (b && c && !b.querySelector('[data-act=cm-cls-msg]')) b.insertAdjacentHTML('beforeend', `<button class="btn sm" data-act="cm-cls-msg" data-v="${esc(c.id)}">${ic('send', 14)} 메시지 발송</button>`); }
});
document.addEventListener('change', e => { if (e.target.id === 'cmMAll') $$('.mchk').forEach(x => { x.checked = e.target.checked; }); });
ACT['cm-mem-msg'] = () => { let ids = $$('.mchk:checked').map(x => x.dataset.id).filter(Boolean); if (!ids.length && (UI.mbSel || []).length) ids = UI.mbSel.slice(); UI.mc = { ...(UI.mc || {}), mode: 'ind', ids, par: false, imgs: (UI.mc || {}).imgs || [] }; if (!ids.length) toast('받는 사람을 선택하세요. 메시지 화면에서 검색해 고를 수도 있습니다.'); go('message'); };
ACT['cm-cls-msg'] = el => { const c = C(el.dataset.v); const sel = $$('.mchk:checked, input[name=lsel]:checked, input.lchk:checked').map(x => x.dataset.id || x.value).filter(id => M(id));
  const go2 = (par, only) => { UI.mc = { mode: only.length ? 'ind' : 'cls', ids: only.length ? only : [c.id], par, imgs: [] }; go('message'); };
  modal('수강생에게 메시지', `<p>${esc(c.name)} — ${sel.length ? `선택한 ${sel.length}명` : `수강생 전체 ${(c.learners || []).length}명`}에게 보냅니다.</p>${(typeof mbGuardOn === 'function' ? mbGuardOn() : S.org.type === 'k12') ? '<label class="ckl"><input type="checkbox" name="par"> 연결된 보호자에게도(미연결 수강생은 본인에게만)</label>' : ''}`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '메시지 작성', kind: 'pri', run: w => go2(fv(w, 'par'), sel) }]); };

/* ═════════ ② 커뮤니티 ═════════ */
const CM_TABS = [['커뮤니티', '게시판'], ['공지사항', '공지사항'], ['학습노트', '학습노트'], ['수강후기', '수강후기'], ['boards', '게시판 관리']];
const cmUnans = p => p.kind === '질문' && !(Array.isArray(p.replies) && p.replies.some(r => r.who === 'admin'));
const cmSortF = k => k === 'views' ? (a, b) => (b.views || 0) - (a.views || 0) : k === 'likes' ? (a, b) => (b.likes || []).length - (a.likes || []).length : k === 'cmts' ? (a, b) => (Array.isArray(b.replies) ? b.replies.length : 0) - (Array.isArray(a.replies) ? a.replies.length : 0) : (a, b) => String(b.at).localeCompare(String(a.at));
const cmClsSel = (key, val, all = '전체 ' + t('cls')) => `<select data-chg="cm-f" data-k="${key}" aria-label="${esc(t('cls'))} 선택"><option value="">${esc(all)}</option>${S.classes.map(c => `<option value="${esc(c.id)}" ${val === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
ACT['cm-f'] = el => { UI['cm_' + el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; render(); };
/* v36 게시판 화면(전체 화면): 위 줄에 게시판 칩(순서 = 학습자 화면 순서) → 고른 게시판의 설명 · 설정 요약 · 글쓰기 → 글 목록 */
const cmBoardOn = () => typeof menuOn === 'function' && menuOn('board');
const cmByName = p => p.who === 'admin' ? `${esc(p.by || '운영자')} ${tag('운영', 'mg')}` : mn(p.who);
const cmScope = b => { const p = b.perm || {}; return p.type === 'all' || !p.type ? '전체 공개' : cmPermLabel(b); };
const cmBTags = b => [b.write === 'admin' ? tag('운영자만 쓰기', 'mg') : tag(t('learner') + '도 쓰기', 'g'), tag(b.cmt === false ? '댓글 끔' : '댓글 켬'), tag(b.file === false ? '첨부 끔' : '첨부 켬'), tag(cmScope(b))].join(' ');
VIEWS.community = () => { cmEnsure(); let b = UI.comB || '커뮤니티'; if (b === '게시판') { b = '커뮤니티'; if (!UI.cm_board || UI.cm_board === '커뮤니티') UI.cm_board = (S.boards.find(x => x.id !== '커뮤니티') || {}).id; } if (!CM_TABS.some(x => x[0] === b)) b = '커뮤니티';
  const TB = CM_TABS.filter(([k]) => k !== '공지사항' || !cmBoardOn() || b === '공지사항');
  const nUn = S.posts.filter(p => S.boards.some(x => x.id === p.board) && cmUnans(p)).length;
  const H = head('커뮤니티', `게시판 · 학습노트 · 수강후기를 관리합니다. 게시판은 목적별로 여러 개 만들 수 있습니다. ${guideRef('features/community.md')}`, nUn ? `<button class="btn ai" data-act="ai-reply-all">✦ 미답변 질문 ${nUn}건 답변 초안</button>` : '') + tabs('comB', TB.map(([k, l]) => [k, l]), b);
  if (b === '공지사항') return H + cmNoticeView();
  if (b === '학습노트') return H + cmNoteView();
  if (b === '수강후기') return H + cmReviewView();
  if (b === 'boards') return H + cmBoardView();
  const bid = S.boards.some(x => x.id === UI.cm_board) ? UI.cm_board : (S.boards[0] || {}).id; const B = S.boards.find(x => x.id === bid);
  const chips = `<div class="cmb-chips" role="tablist" aria-label="게시판">${S.boards.map(x => { const n = S.posts.filter(p => p.board === x.id).length, u = S.posts.filter(p => p.board === x.id && cmUnans(p)).length; return `<button type="button" role="tab" aria-selected="${x.id === bid}" class="${x.id === bid ? 'on' : ''}" data-act="cm-board-go" data-v="${esc(x.id)}">${esc(x.name)} <small>${n}</small>${u ? `<em title="미답변 질문">${u}</em>` : ''}</button>`; }).join('')}<button type="button" class="cmb-add" data-act="cm-board-new">+ 게시판</button></div>`;
  if (!B) return H + chips + '<div class="empty">게시판이 없습니다. [+ 게시판]으로 추가하세요.</div>';
  const talk = B.type === 'talk' || B.type === 'qa';
  const bh = `<div class="cmb-h"><div class="cmb-hl"><b>${esc(B.name)}</b>${B.desc ? `<p>${esc(B.desc)}</p>` : ''}<div class="cmb-tags">${cmBTags(B)}</div></div><div class="cmb-hr"><button class="btn" data-act="cm-board-edit" data-v="${esc(B.id)}">게시판 설정</button><button class="btn pri" data-act="cm-apost" data-b="${esc(B.id)}">+ 글쓰기</button></div></div>`;
  const q = (UI.cm_q || '').toLowerCase();
  const L = S.posts.filter(p => p.board === bid && (!UI.cm_kind || p.kind === UI.cm_kind) && (!UI.cm_cls || p.cls === UI.cm_cls) && (!UI.cm_un || cmUnans(p)) && (!UI.cm_fav || p.fav) && (!UI.cm_priv || p.priv || p.tonly) && (!q || ((p.title || '') + (p.body || '')).toLowerCase().includes(q))).sort((a, c) => (!!c.pin - !!a.pin) || cmSortF(UI.cm_sort)(a, c));
  const bar2 = `<div class="bar2">${talk ? `<select data-chg="cm-f" data-k="kind" aria-label="유형"><option value="">질문 · 이야기</option>${['질문', '이야기'].map(v => `<option ${UI.cm_kind === v ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ''}${cmClsSel('cls', UI.cm_cls)}<select data-chg="cm-f" data-k="sort" aria-label="정렬">${[['', '최신순'], ['views', '조회순'], ['likes', '좋아요순'], ['cmts', '댓글순']].map(([v, l]) => `<option value="${v}" ${(UI.cm_sort || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>${talk ? `<label class="ckl"><input type="checkbox" data-chg="cm-f" data-k="un" ${UI.cm_un ? 'checked' : ''}> 미답변 질문만</label>` : ''}<label class="ckl"><input type="checkbox" data-chg="cm-f" data-k="priv" ${UI.cm_priv ? 'checked' : ''}> 비공개 글만</label><input type="search" placeholder="제목 · 내용 검색" value="${esc(UI.cm_q || '')}" data-chg="cm-f" data-k="q" aria-label="검색"></div>`;
  const AP = S.posts.filter(p => p.board === bid); const qs = talk ? `<div class="cm26q"><button type="button" class="cm26k ${UI.cm_un ? 'on' : ''}" data-act="cm26-qf" data-v="un">${ic('chat', 14)} 미댓글 질문 <b>${AP.filter(p => cmUnans(p)).length}</b></button><button type="button" class="cm26k ${UI.cm_fav && UI.cm_kind === '질문' ? 'on' : ''}" data-act="cm26-qf" data-v="fq">★ 즐겨찾기 질문 <b>${AP.filter(p => p.fav && p.kind === '질문').length}</b></button><button type="button" class="cm26k ${UI.cm_fav && UI.cm_kind === '이야기' ? 'on' : ''}" data-act="cm26-qf" data-v="fs">★ 즐겨찾기 이야기 <b>${AP.filter(p => p.fav && p.kind === '이야기').length}</b></button><span class="grow"></span><b class="cm26t">총 ${L.length}개</b></div>` : `<p class="cmb-n">총 ${L.length}개</p>`;
  return H + chips + bh + qs + bar2 + table(['', '유형', '제목', `${t('cls')} · 강의`, '작성자', '작성일', '조회', '좋아요', '댓글', ''], L.map(p => [`<button class="link cmfav ${p.fav ? 'on' : ''}" data-act="cm26-fav" data-v="${esc(p.id)}" aria-label="즐겨찾기" aria-pressed="${!!p.fav}">${p.fav ? '★' : '☆'}</button>`, p.pin ? tag('고정', 'mg') : p.who === 'admin' ? tag('운영') : p.kind === '질문' ? tag('질문', 'y') : tag('이야기'),
    `<a href="#" data-act="cm-post" data-v="${esc(p.id)}">${esc(p.title || String(p.body || '').slice(0, 30) || '(제목 없음)')}</a>${p.tonly ? ' ' + tag('쌤에게만', 'mg') : ''}${p.priv ? ' ' + tag('비공개') : ''}${p.hidden ? ' ' + tag('숨김', 'r') : ''}${(p.files || []).length ? ' ' + tag('첨부 ' + p.files.length) : ''}${p.draft ? `<br><small class="mini">✦ 초안: ${esc(p.draft.slice(0, 30))}…</small>` : ''}`,
    p.cls ? esc((C(p.cls) || {}).name || '') + (p.item ? `<br><small class="mini">${esc(cmItemName(p.cls, p.item))}</small>` : '') : '—', cmByName(p), esc(cmDate(p.at)), p.views || 0, (p.likes || []).length, Array.isArray(p.replies) ? p.replies.length + (cmUnans(p) ? ' ' + tag('미답변', 'y') : '') : (p.kind === '질문' ? tag('미답변', 'y') : '0'),
    `${p.who === 'admin' ? `<button class="btn sm" data-act="cm-apost" data-b="${esc(bid)}" data-v="${esc(p.id)}">수정</button>` : `<button class="btn sm" data-act="post-reply" data-v="${esc(p.id)}">답변</button>`}<button class="btn sm ghost" data-act="post-hide" data-v="${esc(p.id)}">${p.hidden ? '보이기' : '숨김'}</button>`]), B.write === 'admin' ? '글이 없습니다. [+ 글쓰기]로 첫 글을 올리세요.' : '글이 없습니다.') + `<p class="mini">학습자 화면 레이아웃: ${S.settings.commLayout === 'sns' ? 'SNS형' : '리스트형'} · ${esc(t('cls'))} 수강생 전용 커뮤니티로 설정한 ${esc(t('cls'))}의 글은 해당 수강생과 ${esc(t('teacher'))}만 봅니다.</p>`;
};
/* 운영자 글쓰기 · 수정(공지형 · 자료실 게시판 등) */
function cmAdminPost(bid, pid) { const b = S.boards.find(x => x.id === bid); if (!b) return; const p0 = pid ? S.posts.find(x => x.id === pid && x.who === 'admin') : null; const v = p0 || { title: '', body: '', pin: false, kind: b.type === 'qa' ? '질문' : '이야기', files: [] }; let files = [...(v.files || [])];
  const fl = () => files.map((x, i) => `<span class="tag">${esc(x.name)} · ${cmSize(x.size)} <button type="button" class="cmx" data-fx="${i}" aria-label="첨부 빼기">×</button></span>`).join('');
  const w = modal(p0 ? '글 수정' : `${b.name} · 글쓰기`, `<label class="fl">제목<input name="t" maxlength="120" value="${esc(v.title)}"></label><label class="fl">내용<textarea name="b" rows="8" maxlength="4000">${esc(v.body || '')}</textarea></label>
    ${b.file === false ? '<p class="mini">이 게시판은 첨부를 받지 않습니다(게시판 설정에서 바꿀 수 있습니다).</p>' : `<label class="fl">첨부(최대 10개 · 파일당 20MB · 이미지 200KB 이하는 미리보기)<input type="file" multiple id="cmAPF"></label><div id="cmAPL" class="cmfiles">${fl()}</div>`}
    <label class="ckl"><input type="checkbox" name="pin" ${v.pin ? 'checked' : ''}> 목록 맨 위에 고정</label>`,
  [{ id: 'c', label: '취소' }, { id: 'ok', label: p0 ? '저장' : '올리기', kind: 'pri', run: w2 => { const body = fv(w2, 'b'), tt = fv(w2, 't') || body.slice(0, 30); if (!tt) { toast('제목이나 내용을 입력하세요.', 'warn'); return false; }
    if (p0) Object.assign(p0, { title: tt, body, files: b.file === false ? [] : files, pin: fv(w2, 'pin') }); else S.posts.unshift({ id: uid('po'), board: b.id, kind: '이야기', who: 'admin', by: cmAdminLabel(), title: tt, body, files: b.file === false ? [] : files, pin: fv(w2, 'pin'), cls: '', item: '', likes: [], replies: 0, views: 0, at: today(), hidden: false });
    logAudit(`게시글 ${p0 ? '수정' : '작성'}(${b.name}) — ${tt}`); cmSave(); render(); toast(p0 ? '저장했습니다.' : '글을 올렸습니다. 학습자 사이트에 바로 보입니다.', 'ok'); } }], true);
  const inp = w.querySelector('#cmAPF'); if (inp) { inp.addEventListener('change', e => { cmReadFiles(e.target.files, { max: 20 * 1048576 }).then(L => { L.forEach(x => { if (x.err) toast(`${x.name}: ${x.err}`, 'warn'); else files.push(x); }); files = files.slice(0, 10); w.querySelector('#cmAPL').innerHTML = fl(); e.target.value = ''; }); });
    w.querySelector('#cmAPL').addEventListener('click', e => { const x = e.target.closest('[data-fx]'); if (!x) return; files.splice(+x.dataset.fx, 1); w.querySelector('#cmAPL').innerHTML = fl(); }); } }
ACT['cm-apost'] = el => { cmEnsure(); cmAdminPost(el.dataset.b, el.dataset.v); };
ACT['cm-board-go'] = el => { UI.cm_board = el.dataset.v; render(); };
ACT['post-hide'] = el => { const p = S.posts.find(x => x.id === el.dataset.v); if (!p) return; p.hidden = !p.hidden; logAudit(`게시글 ${p.hidden ? '숨김' : '보이기'} — ${p.title || ''}`); cmSave(); render(); };
const cmThread = (L, pid, depth = 0) => (L || []).map(r => `<div class="cmc ${r.who === 'admin' ? 'adm' : ''}" style="margin-left:${depth * 18}px"><div class="cmch"><b>${r.who === 'admin' ? esc(r.by || '운영자') + ' ' + tag('운영', 'mg') : mn(r.who)}</b><small class="mini">${esc(r.at || '')}</small>${r.hidden ? tag('숨김', 'r') : ''}<span class="cmca"><button class="link mini" data-act="cm-cmt-re" data-p="${esc(pid)}" data-v="${esc(r.id)}">답글</button><button class="link mini r" data-act="cm-cmt-del" data-p="${esc(pid)}" data-v="${esc(r.id)}">삭제</button></span></div><p>${esc(r.body).replace(/\n/g, '<br>')}</p>${cmThread(r.replies, pid, depth + 1)}</div>`).join('');
const cmFindCmt = (L, id) => { for (const r of L || []) { if (r.id === id) return { r, L }; const x = cmFindCmt(r.replies, id); if (x) return x; } return null; };
const cmFiles = F => (F || []).length ? `<div class="cmfiles">${F.map(f => f.data && cmImgOK(f.data) ? `<a href="${esc(f.data)}" download="${esc(f.name)}"><img src="${esc(f.data)}" alt="${esc(f.name)}"></a>` : `<span class="tag">${ic('doc', 12)} ${esc(f.name)} · ${cmSize(f.size)}</span>`).join('')}</div>` : '';
function cmPostModal(p, reTo) { const d = p.draft || (typeof AI !== 'undefined' && AI.reply && p.kind === '질문' && cmUnans(p) ? AI.reply(p) : '');
  const tgt = reTo ? cmFindCmt(p.replies, reTo) : null;
  modal(p.title || '게시글', `<p class="mini">${p.kind === '질문' ? tag('질문', 'y') : tag('이야기')} ${mn(p.who)} · ${esc(p.at)} · 조회 ${p.views || 0} · 좋아요 ${(p.likes || []).length}${p.cls ? ' · ' + esc((C(p.cls) || {}).name || '') : ''}${p.item ? ' › ' + esc(cmItemName(p.cls, p.item)) : ''}${p.tonly ? ' · ' + tag('쌤에게만 공개', 'mg') : ''}${p.priv ? ' · ' + tag('작성자 비공개') : ''}</p>
    <div class="pvmsg"><p>${esc(p.body || p.title || '').replace(/\n/g, '<br>')}</p>${cmFiles(p.files)}</div>
    <div class="ch"><b>댓글 ${Array.isArray(p.replies) ? p.replies.length : 0}</b></div><div class="cmthread">${cmThread(Array.isArray(p.replies) ? p.replies : [], p.id) || '<p class="mini">댓글이 없습니다.</p>'}</div>
    <label class="fl">${tgt ? `「${esc(String(tgt.r.body).slice(0, 20))}」에 답글` : '댓글로 답변'} ${d && !tgt ? '<small>✦ AI 초안 — 확인 후 등록</small>' : ''}<textarea name="r" rows="4" maxlength="2000">${tgt ? '' : esc(d)}</textarea></label>`,
  [{ id: 'del', label: '게시글 삭제', kind: 'redl', run: () => { modal('게시글 삭제', `<p>「${esc(p.title || '')}」을(를) 삭제합니다. 되돌릴 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { S.posts = S.posts.filter(x => x !== p); logAudit('게시글 삭제 — ' + (p.title || '')); cmSave(); render(); } }]); return false; } },
   { id: 'c', label: '닫기' }, { id: 'ok', label: tgt ? '답글 등록' : '댓글 등록', kind: 'pri', run: w => { const v = fv(w, 'r'); if (!v) { toast('내용을 입력하세요.', 'warn'); return false; } const r = { id: uid('cm'), who: 'admin', by: cmAdminLabel(), body: v.slice(0, 2000), at: nowStr(), replies: [] };
     if (tgt) tgt.r.replies = [...(tgt.r.replies || []), r]; else p.replies = [...(Array.isArray(p.replies) ? p.replies : []), r]; delete p.draft; logAudit(`게시글 ${tgt ? '답글' : '답변'} — ${p.title || ''}`); cmSave(); render(); toast('등록했습니다.', 'ok'); } }], true); }
ACT['post-reply'] = el => { cmEnsure(); const p = S.posts.find(x => x.id === el.dataset.v); if (p) cmPostModal(p); };
ACT['cm-post'] = el => { cmEnsure(); const p = S.posts.find(x => x.id === el.dataset.v); if (p) cmPostModal(p); };
ACT['cm-cmt-re'] = el => { const p = S.posts.find(x => x.id === el.dataset.p); if (p) cmPostModal(p, el.dataset.v); else { const n = S.notes.find(x => x.id === el.dataset.p); if (n) cmNoteModal(n, el.dataset.v); } };
ACT['cm-cmt-del'] = el => { const p = S.posts.find(x => x.id === el.dataset.p) || S.notes.find(x => x.id === el.dataset.p); if (!p) return; const L = p.replies !== undefined && !p.comments ? p.replies : p.comments; const f = cmFindCmt(Array.isArray(L) ? L : [], el.dataset.v); if (!f) return; f.L.splice(f.L.indexOf(f.r), 1); if (p.replies !== undefined && Array.isArray(p.replies) && !p.replies.length) p.replies = 0; cmSave(); closeModal(); render(); toast('댓글을 삭제했습니다.', 'ok'); };
ACT['ai-reply-all'] = () => { cmEnsure(); const L = S.posts.filter(cmUnans); L.forEach(p => p.draft = AI.reply(p)); S.ai.usage += L.length; save(); render(); toast(`${L.length}건 답변 초안을 만들었습니다.`, 'ok'); };
/* 게시판 관리(v36): 목적별 여러 개 · 순서(끌기 / ↑ ↓) · 이름 · 설명 · 쓰기 권한 · 댓글 · 첨부 · 공개 범위 · 유형별 기본 세트 */
function cmBoardView() { cmEnsure(); const miss = cmPresetBoards().filter(p => !S.boards.some(b => b.name === p.name));
  const row = (b, i) => { const T = CM_BT[b.type] || CM_BT.free; const n = S.posts.filter(p => p.board === b.id).length;
    return `<li class="cmb-r" draggable="true" data-bid="${esc(b.id)}"><span class="cmn-h" aria-hidden="true" title="끌어서 순서 바꾸기">⋮⋮</span><span class="cmb-ic">${ic(T.ic in IC ? T.ic : 'grid', 18)}</span>
      <span class="cmb-m"><b>${esc(b.name)}</b> <small class="mini">${esc(T.l)} · 글 ${n}개</small>${b.desc ? `<small class="cmb-d">${esc(b.desc)}</small>` : ''}<span class="cmb-tags">${cmBTags(b)}</span></span>
      <span class="cmn-o"><button type="button" class="cmn-mv" data-act="cmb-mv" data-v="${esc(b.id)}" data-d="-1" aria-label="위로" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="cmn-mv" data-act="cmb-mv" data-v="${esc(b.id)}" data-d="1" aria-label="아래로" ${i === S.boards.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="btn sm" data-act="cm-board-edit" data-v="${esc(b.id)}">설정</button>${b.id === '커뮤니티' ? '' : `<button type="button" class="btn sm ghost" data-act="cm-board-del" data-v="${esc(b.id)}">삭제</button>`}</span></li>`; };
  return `<div class="bar2"><button class="btn pri" data-act="cm-board-new">+ 게시판 만들기</button>${miss.length ? `<button class="btn" data-act="cm-board-preset">${esc(TYPES[S.org.type] ? TYPES[S.org.type].name : '')} 추천 게시판 넣기 (${miss.map(x => x.name).join(' · ')})</button>` : ''}<span class="mini">개수 제한 없음 · 이 순서대로 학습자 사이트 게시판 메뉴에 보입니다</span></div>
    <ol class="cmb-list" data-cmb="1"><li class="cmb-r fix"><span class="cmn-h" aria-hidden="true"></span><span class="cmb-ic">${ic('send', 18)}</span><span class="cmb-m"><b>공지사항</b> <small class="mini">항상 맨 앞</small><small class="cmb-d">운영자가 올리는 공지입니다. ${cmBoardOn() ? '소통 › 공지' : '게시판 › 공지사항 탭'}에서 고치고 순서를 바꿉니다.</small><span class="cmb-tags">${tag('운영자만 쓰기', 'mg')} ${tag('전체 공개')}</span></span><span class="cmn-o"><button type="button" class="btn sm" data-act="cm-go-notice">공지 관리</button></span></li>${S.boards.map(row).join('')}</ol>` +
  `<div class="card"><div class="ch"><b>학습자 화면 레이아웃</b><small>홈페이지 디자인 › 커뮤니티와 같은 값</small></div><div class="seg2">${[['list', '리스트형'], ['sns', 'SNS형']].map(([v, l]) => `<button class="${(S.settings.commLayout || 'list') === v ? 'on' : ''}" data-act="cm-layout" data-v="${v}">${l}</button>`).join('')}</div><p class="mini">${esc(t('cls'))}별 커뮤니티 입장 권한은 ${esc(t('cls'))} 설정 탭에서 바꿉니다(수강생만 / 전체 회원).</p></div>`; }
ACT['cm-layout'] = el => { S.settings.commLayout = el.dataset.v; cmSave(); render(); };
ACT['cm-go-notice'] = () => { if (cmBoardOn()) go('board'); else { UI.comB = '공지사항'; render(); } };
ACT['cm-board-preset'] = () => { const miss = cmPresetBoards().filter(p => !S.boards.some(b => b.name === p.name)); miss.forEach(p => S.boards.push(cmMkBoard(p))); logAudit('추천 게시판 추가 — ' + miss.map(x => x.name).join(', ')); cmSave(); render(); toast(`${miss.length}개 게시판을 추가했습니다.`, 'ok'); };
const cmBoardMove = (from, to) => { const a = S.boards; if (from < 0 || to < 0 || from >= a.length || to >= a.length || from === to) return; const [x] = a.splice(from, 1); a.splice(to, 0, x); cmSave(); render(); };
ACT['cmb-mv'] = el => { const i = S.boards.findIndex(b => b.id === el.dataset.v); cmBoardMove(i, i + +el.dataset.d); setTimeout(() => { const x = document.querySelector(`[data-act=cmb-mv][data-v="${CSS.escape(el.dataset.v)}"][data-d="${el.dataset.d}"]`); if (x && !x.disabled) x.focus(); }, 30); };
AFTER.push(() => { document.querySelectorAll('[data-cmb]:not([data-dnd])').forEach(ol => { ol.dataset.dnd = 1; let from = null;
  ol.addEventListener('dragstart', e => { const li = e.target.closest && e.target.closest('li[data-bid]'); if (!li) { e.preventDefault(); return; } from = li.dataset.bid; li.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', from); } catch (x) { } });
  ol.addEventListener('dragover', e => { if (!from) return; e.preventDefault(); const li = e.target.closest('li[data-bid]'); ol.querySelectorAll('li').forEach(x => x.classList.toggle('over', x === li && li.dataset.bid !== from)); });
  ol.addEventListener('drop', e => { if (!from) return; e.preventDefault(); const li = e.target.closest('li[data-bid]'); const src = from; from = null; if (!li) return; cmBoardMove(S.boards.findIndex(b => b.id === src), S.boards.findIndex(b => b.id === li.dataset.bid)); });
  ol.addEventListener('dragend', () => { from = null; ol.querySelectorAll('li').forEach(x => x.classList.remove('drag', 'over')); }); }); });
const CM_TPL = [['notice', '공지형', '운영자만 쓰기 · 댓글 끔'], ['qa', 'Q&A', '질문 · 답변'], ['file', '자료실', '운영자만 · 첨부'], ['free', '자유', `${'학습자'}도 쓰기`], ['cls', '과정별', '특정 과정 수강생만']];
function cmBoardModal(b, fresh) { const isNew = !b || !!fresh; b = b ? { ...cmMkBoard(b), ...b } : cmMkBoard({ type: 'free', desc: '' }); const ref = isNew ? null : S.boards.find(x => x.id === b.id);
  let st = { type: b.type, write: b.write, cmt: b.cmt !== false, file: b.file !== false, perm: { type: (b.perm || {}).type || 'all', ids: [...((b.perm || {}).ids || [])] }, name: b.name, desc: b.desc || '' };
  const opts = () => st.perm.type === 'cls' ? S.classes.map(c => [c.id, c.name]) : st.perm.type === 'team' ? cmTeams().map(g => [g.id, g.name]) : [];
  const seg = (k, L) => `<div class="seg2" role="radiogroup">${L.map(([v, l]) => `<button type="button" role="radio" aria-checked="${st[k] === v}" class="${st[k] === v ? 'on' : ''}" data-bs="${k}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
  const body = () => `${isNew ? `<div class="fl"><span class="cmb-l">어떤 게시판인가요?</span><div class="cmb-tpl">${CM_TPL.map(([k, l, d]) => `<button type="button" class="${(k === 'cls' ? st.perm.type === 'cls' && st.type === 'talk' : st.type === k) ? 'on' : ''}" aria-pressed="${k === 'cls' ? st.perm.type === 'cls' && st.type === 'talk' : st.type === k}" data-btpl="${k}"><b>${esc(l)}</b><small>${esc(d.replace('학습자', t('learner')).replace('과정', t('cls')))}</small></button>`).join('')}</div></div>` : ''}
    <label class="fl">게시판 이름<input name="n" maxlength="30" value="${esc(st.name)}" placeholder="예: 학과 공지 · Q&A · 자료실"></label>
    <label class="fl">설명(학습자 화면 게시판 이름 아래에 보입니다)<input name="d" maxlength="120" value="${esc(st.desc)}"></label>
    <div class="fl"><span class="cmb-l">글쓰기</span>${seg('write', [['admin', '운영자만'], ['all', t('learner') + '도']])}</div>
    <div class="cmb-sw"><label class="ckl"><input type="checkbox" data-bck="cmt" ${st.cmt ? 'checked' : ''}> 댓글 받기</label><label class="ckl"><input type="checkbox" data-bck="file" ${st.file ? 'checked' : ''}> 첨부 파일 받기</label></div>
    <div class="fl"><span class="cmb-l">공개 범위</span><div class="seg2">${[['all', '전체'], ['cls', '특정 ' + t('cls')], ['team', t('group')], ['members', '지정 회원']].map(([v, l]) => `<button type="button" class="${st.perm.type === v ? 'on' : ''}" data-bp="${v}">${esc(l)}</button>`).join('')}</div>
    ${st.perm.type === 'members' ? `<p class="mini">${st.perm.ids.length}명 지정</p><button type="button" class="btn sm" data-bpick="1">회원 선택</button>` : opts().length ? `<div class="cmpkl sm">${opts().map(([id, n]) => `<label class="ckl"><input type="checkbox" data-bid="${esc(id)}" ${st.perm.ids.includes(id) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div>` : st.perm.type === 'all' ? '<p class="mini">가입한 모든 회원이 봅니다.</p>' : '<p class="mini">선택할 항목이 없습니다.</p>'}</div>`;
  const w = modal(isNew ? '게시판 만들기' : '게시판 설정', `<div id="cmBd">${body()}</div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: isNew ? '만들기' : '저장', kind: 'pri', run: w2 => { keep(); const n = st.name.trim(); if (!n) { toast('게시판 이름을 입력하세요.', 'warn'); return false; } if (S.boards.some(x => x.id !== b.id && x.name === n) || ['공지사항', '학습노트', '수강후기'].includes(n)) { toast('같은 이름의 게시판이 있습니다.', 'warn'); return false; } if (st.perm.type !== 'all' && !st.perm.ids.length) { toast('공개 대상을 선택하세요.', 'warn'); return false; }
    const tgt = ref || b; Object.assign(tgt, { name: n, desc: st.desc.trim().slice(0, 120), type: st.type, write: st.write, cmt: st.cmt, file: st.file, perm: st.perm }); if (isNew) S.boards.push(tgt); logAudit(`게시판 ${isNew ? '생성' : '수정'} — ${n}`); cmSave(); if (UI.comB !== 'boards') { UI.comB = '커뮤니티'; UI.cm_board = tgt.id; } render(); toast(isNew ? '게시판을 만들었습니다. 학습자 사이트 게시판 메뉴에 바로 보입니다.' : '저장했습니다.', 'ok'); } }]);
  const box = w.querySelector('#cmBd'); function keep() { const i = box.querySelector('[name=n]'), d = box.querySelector('[name=d]'); if (i) st.name = i.value; if (d) st.desc = d.value; } const re = () => { keep(); box.innerHTML = body(); };
  box.addEventListener('click', e => { const tp = e.target.closest('[data-btpl]'); if (tp) { keep(); const k = tp.dataset.btpl; const T = CM_BT[k === 'cls' ? 'talk' : k]; const lab = (CM_TPL.find(x => x[0] === k) || [])[1]; const auto = !st.name || CM_TPL.some(x => x[1] === st.name || x[1] + ' 게시판' === st.name);
      Object.assign(st, { type: k === 'cls' ? 'talk' : k, write: T.write, cmt: T.cmt, file: T.file, desc: !st.desc || Object.values(CM_BT).some(x => x.d === st.desc) || /수강생 게시판/.test(st.desc) ? (k === 'cls' ? `${t('cls')} 수강생끼리 질문하고 이야기를 나눕니다.` : T.d) : st.desc, perm: k === 'cls' ? { type: 'cls', ids: st.perm.type === 'cls' ? st.perm.ids : [] } : st.perm.type === 'cls' ? { type: 'all', ids: [] } : st.perm }); if (auto) st.name = k === 'cls' ? `${t('cls')}별 게시판` : lab; box.innerHTML = body(); return; }
    const sg = e.target.closest('[data-bs]'); if (sg) { keep(); st[sg.dataset.bs] = sg.dataset.v; box.innerHTML = body(); return; }
    const x = e.target.closest('[data-bp]'); if (x) { keep(); st.perm = { type: x.dataset.bp, ids: [] }; re(); return; }
    if (e.target.closest('[data-bpick]')) { keep(); const keepSt = { ...st }; cmPickMembers('게시판 공개 회원', st.perm.ids, ids => { if (document.body.contains(box)) { st.perm = { type: 'members', ids }; box.innerHTML = body(); return; } const nb = { ...b, ...keepSt, name: keepSt.name, desc: keepSt.desc, perm: { type: 'members', ids } }; isNew ? cmBoardModal(nb, true) : (Object.assign(ref, { perm: nb.perm }), cmBoardModal(ref)); }); } });
  box.addEventListener('change', e => { const x = e.target; if (x.dataset.bck) { st[x.dataset.bck] = x.checked; return; } if (!x.dataset.bid) return; st.perm.ids = x.checked ? [...new Set([...st.perm.ids, x.dataset.bid])] : st.perm.ids.filter(y => y !== x.dataset.bid); });
}
ACT['cm-board-new'] = () => { cmEnsure(); cmBoardModal(null); };
ACT['cm-board-edit'] = el => { const b = S.boards.find(x => x.id === el.dataset.v); if (b) cmBoardModal(b); };
ACT['cm-board-del'] = el => { const b = S.boards.find(x => x.id === el.dataset.v); if (!b || b.id === '커뮤니티') return; const n = S.posts.filter(p => p.board === b.id).length; modal('게시판 삭제', `<p>「${esc(b.name)}」 게시판과 게시글 ${n}건을 삭제합니다. 되돌릴 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { S.boards = S.boards.filter(x => x !== b); S.posts = S.posts.filter(p => p.board !== b.id); if (UI.cm_board === b.id) UI.cm_board = ''; logAudit('게시판 삭제 — ' + b.name); cmSave(); render(); } }]); };
/* 공지사항: 홈페이지 / 클래스 / 강의, 본문 · 첨부 · 조회수, 강사는 담당 클래스만 */
const cmAllNotices = () => [...S.notices.map(n => ({ n, c: null })), ...S.classes.flatMap(c => (c.notices || []).map(n => ({ n, c })))].sort((a, b) => cmNOrd(a.n, b.n));
/* v36 공지: 목록에서 누르면 그 자리에서 고친다(제목 · 본문 서식 · 상단 고정 · 저장/취소), 끌어서 순서 변경(휴대폰은 ↑ ↓) */
function cmNoticeView() { cmEnsure(); const tch = S.me.role === 'teacher'; const mine = new Set(cmMyClasses().map(c => c.id)); const f = UI.cm_ncls || '';
  const L = cmAllNotices().filter(x => (!f || (f === 'home' ? !x.c : x.c && x.c.id === f)) && (!tch || (x.c && mine.has(x.c.id))));
  const open = UI.cmnOpen || ''; const nP = L.filter(x => x.n.pin).length;
  const row = ({ n, c }, i) => open === n.id ? cmNoticeEd(n, c) : `<li class="cmn-r ${n.pin ? 'pin' : ''}" draggable="true" data-nid="${esc(n.id)}"><span class="cmn-h" aria-hidden="true" title="끌어서 순서 바꾸기">⋮⋮</span>
    <button type="button" class="cmn-m" data-act="cmn-open" data-v="${esc(n.id)}" aria-label="${esc(n.title)} 고치기"><span class="cmn-t">${n.pin ? '<span class="cmn-pin">고정</span>' : ''}<span class="cmn-to">${esc(c ? c.name : '홈페이지')}</span><b>${esc(n.title || '(제목 없음)')}</b></span>${n.body ? `<small class="cmn-x">${esc(cmMdText(n.body).replace(/\s+/g, ' ').slice(0, 90))}</small>` : '<small class="cmn-x mini">본문이 없습니다. 눌러서 쓰세요.</small>'}<small class="cmn-meta">${esc(n.at || '')} · 조회 ${num(n.views || 0)}${(n.files || []).length ? ' · 첨부 ' + n.files.length : ''}</small></button>
    <span class="cmn-o"><button type="button" class="cmn-mv" data-act="cmn-mv" data-v="${esc(n.id)}" data-d="-1" aria-label="위로" ${i === 0 || i === nP ? 'disabled' : ''}>↑</button><button type="button" class="cmn-mv" data-act="cmn-mv" data-v="${esc(n.id)}" data-d="1" aria-label="아래로" ${i === L.length - 1 || i === nP - 1 ? 'disabled' : ''}>↓</button><button type="button" class="cmn-pb ${n.pin ? 'on' : ''}" data-act="cmn-pin" data-v="${esc(n.id)}" aria-pressed="${!!n.pin}">${n.pin ? '고정됨' : '상단 고정'}</button></span></li>`;
  return `<div class="bar2 cmn-bar"><button class="btn pri" data-act="notice-new">+ 공지 쓰기</button><select data-chg="cm-f" data-k="ncls" aria-label="대상"><option value="">전체 대상</option>${tch ? '' : `<option value="home" ${f === 'home' ? 'selected' : ''}>홈페이지 공지</option>`}${cmMyClasses().map(c => `<option value="${esc(c.id)}" ${f === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><span class="mini cmn-hint">제목을 누르면 바로 고칩니다 · 끌어서 순서를 바꿉니다</span></div>` +
    (open === 'new' ? `<ol class="cmn">${cmNoticeEd(null, null)}</ol>` : '') +
    (L.length ? `<ol class="cmn" data-cmn="1">${L.map(row).join('')}</ol>` : open === 'new' ? '' : `<div class="empty">공지가 없습니다. [+ 공지 쓰기]로 첫 공지를 올리세요.</div>`) +
    `<p class="mini">공지는 학습자 사이트 공지사항 · ${esc(t('cls'))} 화면에 이 순서대로 바로 반영됩니다. 고정 공지는 항상 위에 보입니다.</p>`; }
function cmNoticeEd(n, c) { const isNew = !n; const tch = S.me.role === 'teacher'; n = n || { title: '', body: '', pin: false }; const id = isNew ? 'new' : n.id;
  const tb = [['bold', '<b>B</b>', '굵게'], ['list', '•', '목록'], ['link', '🔗', '링크'], ['img', '🖼', '이미지']].map(([k, i2, l]) => `<button type="button" data-cmnf="${k}" aria-label="${l}"><span aria-hidden="true">${i2}</span> ${l}</button>`).join('');
  return `<li class="cmn-r ed" data-nid="${esc(id)}"><div class="cmn-e" data-cmne="${esc(id)}">
    <div class="cmn-eh"><input class="cmn-ti" name="cmnT" maxlength="60" placeholder="공지 제목" value="${esc(n.title)}" aria-label="공지 제목">${isNew ? `<select name="cmnC" aria-label="대상">${tch ? '' : '<option value="home">홈페이지 전체</option>'}${cmMyClasses().map(c2 => `<option value="${esc(c2.id)}">${esc(t('cls'))} · ${esc(c2.name)}</option>`).join('')}</select>` : `<span class="cmn-to">${esc(c ? c.name : '홈페이지')}</span>`}</div>
    <div class="cmn-tb" role="toolbar" aria-label="서식">${tb}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden data-cmnimg="1"></div>
    <div class="cmn-lk" hidden><input type="url" placeholder="https://주소" data-cmnurl="1" aria-label="링크 주소"><button type="button" class="btn sm" data-cmnf="linkok">넣기</button><button type="button" class="btn sm ghost" data-cmnf="linkx">닫기</button></div>
    <div class="cmn-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="공지 본문" data-ph="본문을 입력하세요. 글자를 고르고 [굵게] · [링크]를 누르면 서식이 붙습니다.">${cmMd(n.body, n.imgs)}</div>
    <div class="cmn-ft"><label class="ckl"><input type="checkbox" name="cmnP" ${n.pin ? 'checked' : ''}> 상단 고정</label>${isNew ? '' : `<button type="button" class="btn sm ghost" data-act="cm-notice-edit" data-v="${esc(n.id)}">대상 · 첨부</button><button type="button" class="btn sm ghost cmn-del" data-act="cm-notice-del" data-v="${esc(n.id)}">삭제</button>`}<span class="grow"></span><button type="button" class="btn" data-act="cmn-cancel">취소</button><button type="button" class="btn pri" data-act="cmn-save" data-v="${esc(id)}">저장</button></div></div></li>`; }
const cmNoticeHere = () => !!document.querySelector('.cmn-bar');
ACT['cmn-open'] = el => { UI.cmnOpen = el.dataset.v; render(); setTimeout(() => { const b = document.querySelector(`.cmn-e[data-cmne="${CSS.escape(el.dataset.v)}"] .cmn-body`); if (b) { b.focus(); try { const r = document.createRange(); r.selectNodeContents(b); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (e) { } } }, 30); };
ACT['cmn-cancel'] = () => { UI.cmnOpen = ''; render(); };
ACT['cmn-save'] = el => { cmEnsure(); const id = el.dataset.v; const w = document.querySelector(`.cmn-e[data-cmne="${CSS.escape(id)}"]`); if (!w) return; const tt = (w.querySelector('[name=cmnT]').value || '').trim(); if (!tt) { toast('제목을 입력하세요.', 'warn'); w.querySelector('[name=cmnT]').focus(); return; }
  const imgs = {}; const body = cmDomMd(w.querySelector('.cmn-body'), imgs).slice(0, 5000); if (Object.keys(imgs).length > 4) { toast('본문 이미지는 4장까지 넣을 수 있습니다.', 'warn'); return; } const pin = w.querySelector('[name=cmnP]').checked;
  const all = cmAllNotices(); const minOrd = all.length ? Math.min(...all.map(x => typeof x.n.ord === 'number' ? x.n.ord : 0)) : 10;
  if (id === 'new') { const tc = (w.querySelector('[name=cmnC]') || {}).value || 'home'; if (S.me.role === 'teacher' && (tc === 'home' || !cmMyClasses().some(c => c.id === tc))) { toast(`${t('teacher')}은 담당 ${t('cls')} 공지만 작성할 수 있습니다.`, 'warn'); return; }
    const rec = { id: uid('n'), title: tt, body, imgs, pin, item: '', files: [], at: today(), views: 0, by: S.me.name, ord: minOrd - 10 }; if (tc === 'home') S.notices.unshift(rec); else { const c = C(tc); c.notices = c.notices || []; c.notices.unshift(rec); }
    logAudit('공지 작성 — ' + tt); toast('공지를 올렸습니다. 학습자 사이트에 바로 보입니다.', 'ok'); }
  else { const f = cmFindNotice(id); if (!f) return; if (pin && !f.n.pin) f.n.ord = cmNTop(); Object.assign(f.n, { title: tt, body, imgs, pin }); logAudit('공지 수정 — ' + tt); toast('저장했습니다.', 'ok'); }
  UI.cmnOpen = ''; cmSave(); render(); };
const cmNTop = () => Math.min(0, ...cmAllNotices().map(x => typeof x.n.ord === 'number' ? x.n.ord : 0)) - 10;
ACT['cmn-pin'] = el => { const f = cmFindNotice(el.dataset.v); if (!f) return; f.n.pin = !f.n.pin; if (f.n.pin) f.n.ord = cmNTop(); logAudit(`공지 ${f.n.pin ? '고정' : '고정 해제'} — ${f.n.title}`); cmSave(); render(); };
/* 순서: 보이는 목록의 새 순서대로 그 공지들의 ord 값을 다시 나눠 준다(필터로 가린 공지의 자리는 그대로) */
function cmNoticeReord(ids) { const L = ids.map(id => (cmFindNotice(id) || {}).n).filter(Boolean); const P = L.filter(n => n.pin), U = L.filter(n => !n.pin); const seq = [...P, ...U];
  const ords = L.map(n => typeof n.ord === 'number' ? n.ord : 0).sort((a, b) => a - b); for (let i = 1; i < ords.length; i++) if (ords[i] <= ords[i - 1]) ords[i] = ords[i - 1] + 1;
  seq.forEach((n, i) => { n.ord = ords[i]; }); cmSave(); render(); }
const cmNoticeIds = () => [...document.querySelectorAll('[data-cmn] > li[data-nid]')].map(li => li.dataset.nid);
ACT['cmn-mv'] = el => { const ids = cmNoticeIds(); const i = ids.indexOf(el.dataset.v), k = i + +el.dataset.d; if (i < 0 || k < 0 || k >= ids.length) return; const a = (cmFindNotice(ids[i]) || {}).n, b = (cmFindNotice(ids[k]) || {}).n; if (!a || !b) return; if (!!a.pin !== !!b.pin) { toast('고정 공지는 고정 공지끼리 순서를 바꿉니다.', 'warn'); return; } [ids[i], ids[k]] = [ids[k], ids[i]]; cmNoticeReord(ids); setTimeout(() => { const x = document.querySelector(`[data-cmn] [data-act=cmn-mv][data-v="${CSS.escape(el.dataset.v)}"][data-d="${el.dataset.d}"]`); if (x && !x.disabled) x.focus(); }, 30); };
AFTER.push(() => { document.querySelectorAll('[data-cmn]:not([data-dnd])').forEach(ol => { ol.dataset.dnd = 1; let from = null;
  ol.addEventListener('dragstart', e => { const li = e.target.closest && e.target.closest('li[data-nid]'); if (!li || li.classList.contains('ed')) { e.preventDefault(); return; } from = li.dataset.nid; li.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', from); } catch (x) { } });
  ol.addEventListener('dragover', e => { if (!from) return; e.preventDefault(); const li = e.target.closest('li[data-nid]'); ol.querySelectorAll('li').forEach(x => x.classList.toggle('over', x === li && li.dataset.nid !== from)); });
  ol.addEventListener('drop', e => { if (!from) return; e.preventDefault(); const li = e.target.closest('li[data-nid]'); const src = from; from = null; if (!li || li.dataset.nid === src) return; const ids = cmNoticeIds(); const a = (cmFindNotice(src) || {}).n, b = (cmFindNotice(li.dataset.nid) || {}).n; if (!a || !b) return; if (!!a.pin !== !!b.pin) { toast('고정 공지는 고정 공지끼리 순서를 바꿉니다. 고정을 풀거나 켠 뒤 옮기세요.', 'warn'); render(); return; }
    const ti = ids.indexOf(li.dataset.nid); ids.splice(ids.indexOf(src), 1); ids.splice(ti, 0, src); cmNoticeReord(ids); toast('순서를 바꿨습니다.', 'ok'); });
  ol.addEventListener('dragend', () => { from = null; ol.querySelectorAll('li').forEach(x => x.classList.remove('drag', 'over')); }); }); });
/* 편집 칸: 서식 단추(선택 영역 유지) · 링크 · 이미지 · 붙여넣기는 글자만 */
{ let keep = null; const bodyOf = el => { const w = el.closest('.cmn-e'); return w ? w.querySelector('.cmn-body') : null; };
  const saveSel = b => { const s2 = getSelection(); if (s2.rangeCount && b.contains(s2.getRangeAt(0).commonAncestorContainer)) keep = s2.getRangeAt(0).cloneRange(); };
  const restore = b => { b.focus(); const s2 = getSelection(); s2.removeAllRanges(); if (keep && b.contains(keep.commonAncestorContainer)) s2.addRange(keep); else { const r = document.createRange(); r.selectNodeContents(b); r.collapse(false); s2.addRange(r); } };
  document.addEventListener('mousedown', e => { const x = e.target.closest && e.target.closest('[data-cmnf]'); if (x && ['bold', 'list', 'link', 'img'].includes(x.dataset.cmnf)) { e.preventDefault(); const b = bodyOf(x); if (b) saveSel(b); } });
  document.addEventListener('selectionchange', () => { const a = document.activeElement; if (a && a.classList && a.classList.contains('cmn-body')) saveSel(a); });
  document.addEventListener('click', e => { const x = e.target.closest && e.target.closest('[data-cmnf]'); if (!x) return; const w = x.closest('.cmn-e'); const b = bodyOf(x); if (!b) return; const k = x.dataset.cmnf; const lk = w.querySelector('.cmn-lk');
    if (k === 'bold') { restore(b); document.execCommand('bold'); }
    else if (k === 'list') { restore(b); document.execCommand('insertUnorderedList'); }
    else if (k === 'link') { lk.hidden = false; const u = lk.querySelector('input'); u.value = 'https://'; u.focus(); u.select(); }
    else if (k === 'linkx') { lk.hidden = true; restore(b); }
    else if (k === 'linkok') { const u = lk.querySelector('input').value.trim(); if (!/^https?:\/\/[^\s"'<>()]+\.[^\s"'<>()]+$/.test(u)) { toast('https://로 시작하는 주소를 입력하세요.', 'warn'); return; } lk.hidden = true; restore(b); const s2 = getSelection(); if (s2.rangeCount && !s2.getRangeAt(0).collapsed) document.execCommand('createLink', false, u); else document.execCommand('insertHTML', false, `<a href="${esc(u)}">${esc(u)}</a>&nbsp;`); }
    else if (k === 'img') { w.querySelector('[data-cmnimg]').click(); }
    saveSel(b); });
  document.addEventListener('keydown', e => { if (e.target && e.target.matches && e.target.matches('.cmn-lk input') && e.key === 'Enter') { e.preventDefault(); const ok = e.target.closest('.cmn-lk').querySelector('[data-cmnf=linkok]'); ok && ok.click(); } if (e.target && e.target.closest && e.target.closest('.cmn-e') && e.key === 'Escape') { const c = document.querySelector('[data-act=cmn-cancel]'); c && c.click(); } });
  document.addEventListener('change', e => { const x = e.target; if (!x.matches || !x.matches('[data-cmnimg]')) return; const f = x.files && x.files[0]; x.value = ''; if (!f) return; if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) { toast('PNG · JPG · GIF · WEBP 이미지만 넣을 수 있습니다.', 'warn'); return; } if (f.size > 10 * 1048576) { toast('10MB 이하 이미지를 고르세요.', 'warn'); return; }
    const b = bodyOf(x); cmShrink(f).then(d => { if (!cmImgSafe(d)) { toast('이미지를 읽지 못했습니다.', 'warn'); return; } if (b.querySelectorAll('img').length >= 4) { toast('본문 이미지는 4장까지 넣을 수 있습니다.', 'warn'); return; } restore(b); document.execCommand('insertHTML', false, `<img src="${d}" alt="${esc(f.name.replace(/\.[^.]+$/, '').slice(0, 40))}" data-img="${uid('im')}"><br>`); }); });
  document.addEventListener('paste', e => { const b = e.target.closest && e.target.closest('.cmn-body'); if (!b) return; e.preventDefault(); const txt = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, txt); }); }
const cmFindNotice = id => { const a = S.notices.find(n => n.id === id); if (a) return { n: a, c: null, L: S.notices }; for (const c of S.classes) { const n = (c.notices || []).find(x => x.id === id); if (n) return { n, c, L: c.notices }; } return null; };
function cmNoticeModal(id, preCls) { const tch = S.me.role === 'teacher'; const f = id ? cmFindNotice(id) : null; const n = f ? f.n : { title: '', body: '', pin: true, files: [] }; let files = [...(n.files || [])];
  const cls0 = f ? (f.c ? f.c.id : 'home') : preCls || (tch ? (cmMyClasses()[0] || {}).id || '' : 'home');
  const itemsOpt = cid => { const c = C(cid); return c ? `<option value="">${esc(t('cls'))} 전체</option>` + cmItems(c).map(it => `<option value="${esc(it.id)}" ${n.item === it.id ? 'selected' : ''}>${esc(it.title)}</option>`).join('') : '<option value="">—</option>'; };
  const w = modal(id ? '공지 수정' : '공지 작성', `<div class="form2"><label>대상<select name="cls">${tch ? '' : `<option value="home" ${cls0 === 'home' ? 'selected' : ''}>홈페이지 전체</option>`}${cmMyClasses().map(c => `<option value="${esc(c.id)}" ${cls0 === c.id ? 'selected' : ''}>${esc(t('cls'))} · ${esc(c.name)}</option>`).join('')}</select></label><label>강의(선택)<select name="item" ${cls0 === 'home' ? 'disabled' : ''}>${itemsOpt(cls0)}</select></label></div>
    <label class="fl">제목<input name="t" maxlength="60" value="${esc(n.title)}"></label><label class="fl">본문<textarea name="b" rows="7" maxlength="5000">${esc(n.body || '')}</textarea></label>
    <label class="fl">첨부(이름 · 크기만 저장, 파일당 20MB)<input type="file" multiple id="cmNF"></label><div id="cmNFL" class="cmfiles">${files.map(x => `<span class="tag">${esc(x.name)}</span>`).join('')}</div><label class="ckl"><input type="checkbox" name="pin" ${n.pin ? 'checked' : ''}> 상단 고정</label>`,
  [{ id: 'c', label: '취소' }, { id: 'ok', label: id ? '저장' : '등록', kind: 'pri', run: w2 => { const tt = fv(w2, 't'); if (!tt) { toast('제목을 입력하세요.', 'warn'); return false; } const tc = fv(w2, 'cls'); if (tch && (tc === 'home' || !cmMyClasses().some(c => c.id === tc))) { toast(`${t('teacher')}은 담당 ${t('cls')} 공지만 작성할 수 있습니다.`, 'warn'); return false; }
    const rec = { ...n, id: n.id || uid('n'), title: tt, body: fv(w2, 'b'), pin: fv(w2, 'pin'), item: tc === 'home' ? '' : fv(w2, 'item'), files, at: n.at || today(), views: n.views || 0, by: S.me.name, ord: typeof n.ord === 'number' ? n.ord : Math.min(0, ...cmAllNotices().map(x => typeof x.n.ord === 'number' ? x.n.ord : 0)) - 10 };
    if (f) f.L.splice(f.L.indexOf(f.n), 1); if (tc === 'home') S.notices.unshift(rec); else { const c = C(tc); c.notices = c.notices || []; c.notices.unshift(rec); }
    logAudit(`공지 ${id ? '수정' : '작성'} — ${tt}`); cmSave(); render(); toast(id ? '저장했습니다.' : '공지를 등록했습니다.', 'ok'); } }], true);
  w.querySelector('[name=cls]').addEventListener('change', e => { const s = w.querySelector('[name=item]'); s.disabled = e.target.value === 'home'; s.innerHTML = itemsOpt(e.target.value); });
  w.querySelector('#cmNF').addEventListener('change', e => { [...e.target.files].forEach(x => { if (x.size > 20 * 1048576) { toast(`${x.name}: 20MB를 넘습니다.`, 'warn'); return; } files.push({ name: x.name, size: x.size, type: x.type }); }); w.querySelector('#cmNFL').innerHTML = files.map(x => `<span class="tag">${esc(x.name)} · ${cmSize(x.size)}</span>`).join(''); });
}
/* v36 소통 › 공지 · 알림함: 공지 목록에서 바로 고치기 · 순서 · 고정(전체 화면) + 알림함 발송 내역 */
VIEWS.board = () => { cmEnsure(); const A = Array.isArray(S.alerts) ? S.alerts : [];
  return head('', `공지는 ${esc(t('site'))} 공지사항에 이 순서대로 바로 반영되고, 알림함 메시지는 대상의 알림함으로 전달됩니다.`, `<button class="btn" data-act="al-new">알림 보내기</button>`) +
    `<section class="cmn-wrap"><div class="card cmn-card"><div class="ch"><b>공지</b><small>${cmAllNotices().length}건</small></div>${cmNoticeView()}</div>
    <div class="card"><div class="ch"><b>알림함 발송 내역</b><small>${A.length}건</small></div>${table(['보낸 날', '대상', '제목', '읽음'], A.map(a => [esc(a.at), esc(a.to), esc(a.title), `${bar(a.read)} ${a.read}%`]), '보낸 알림이 없습니다.')}</div></section>`; };
ACT['notice-new'] = () => { cmEnsure(); if (cmNoticeHere()) { UI.cmnOpen = 'new'; render(); setTimeout(() => { const i = document.querySelector('.cmn-e[data-cmne=new] [name=cmnT]'); if (i) i.focus(); }, 30); return; } cmNoticeModal(null); };
ACT['cls-notice'] = el => { cmEnsure(); cmNoticeModal(null, el.dataset.v); };
ACT['cm-notice-edit'] = el => cmNoticeModal(el.dataset.v);
ACT['cm-notice-del'] = el => { const f = cmFindNotice(el.dataset.v); if (!f) return; if (S.me.role === 'teacher' && (!f.c || !cmMyClasses().some(c => c.id === f.c.id))) { toast('담당 클래스 공지만 삭제할 수 있습니다.', 'warn'); return; } modal('공지 삭제', `<p>「${esc(f.n.title)}」 공지를 삭제합니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { f.L.splice(f.L.indexOf(f.n), 1); logAudit('공지 삭제 — ' + f.n.title); cmSave(); render(); } }]); };
/* 학습노트 */
const cmNoteUnans = n => n.q && !(n.comments || []).some(r => r.who === 'admin');
function cmNoteView() { const L = S.notes.filter(n => (!UI.cm_ncl || n.cls === UI.cm_ncl) && (!UI.cm_nun || cmNoteUnans(n))).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
  return `<div class="bar2">${cmClsSel('ncl', UI.cm_ncl)}<label class="ckl"><input type="checkbox" data-chg="cm-f" data-k="nun" ${UI.cm_nun ? 'checked' : ''}> 미답변 질문만 (${S.notes.filter(cmNoteUnans).length})</label></div>` +
    table([t('cls'), '강의', '위치', '작성자', '내용', '공개', '댓글', ''], L.map(n => [esc((C(n.cls) || {}).name || '—'), esc(cmItemName(n.cls, n.item) || '—'), `<code>${cmSec(n.at)}</code>`, mn(n.who), (n.q ? tag('질문', 'y') + ' ' : '') + esc(String(n.body || '').slice(0, 60)), n.pub ? tag('공개', 'g') : tag('나만 보기'), (n.comments || []).length + (cmNoteUnans(n) ? ' ' + tag('미답변', 'y') : ''), `<button class="btn sm" data-act="cm-note" data-v="${esc(n.id)}">${cmNoteUnans(n) ? '답변' : '보기'}</button>`]), '학습노트가 없습니다. 학습자가 강의를 보며 남긴 메모 · 질문이 여기에 모입니다.'); }
function cmNoteModal(n, reTo) { const tgt = reTo ? cmFindCmt(n.comments, reTo) : null;
  modal('학습노트', `<p class="mini">${mn(n.who)} · ${esc((C(n.cls) || {}).name || '')} › ${esc(cmItemName(n.cls, n.item))} · 재생 위치 <code>${cmSec(n.at)}</code> · ${n.pub ? '공개' : '나만 보기'}</p><div class="pvmsg"><p>${esc(n.body).replace(/\n/g, '<br>')}</p></div><div class="cmthread">${cmThread(n.comments || [], n.id) || '<p class="mini">댓글이 없습니다.</p>'}</div><label class="fl">${tgt ? '답글' : '댓글로 답변'}<textarea name="r" rows="3" maxlength="2000"></textarea></label>`,
    [{ id: 'c', label: '닫기' }, { id: 'ok', label: '등록', kind: 'pri', run: w => { const v = fv(w, 'r'); if (!v) { toast('내용을 입력하세요.', 'warn'); return false; } const r = { id: uid('cm'), who: 'admin', by: cmAdminLabel(), body: v, at: nowStr(), replies: [] }; if (tgt) tgt.r.replies = [...(tgt.r.replies || []), r]; else n.comments = [...(n.comments || []), r]; cmSave(); render(); toast('답변을 등록했습니다.', 'ok'); } }], true); }
ACT['cm-note'] = el => { const n = S.notes.find(x => x.id === el.dataset.v); if (n) cmNoteModal(n); };
/* 수강후기 */
function cmReviewView() { const L = S.reviews.filter(r => !UI.cm_rcl || r.cls === UI.cm_rcl).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return `<div class="bar2">${cmClsSel('rcl', UI.cm_rcl)}<span class="mini">작성 조건: <b>${esc(S.settings.reviewCond || '누구나')}</b> (설정 › 서비스 설정) · 구독 ${esc(tj('cls', '은'))} 2회차 이상 진행 시 작성 · 1 ${esc(t('cls'))} 1후기</span></div>` +
    table([t('cls'), '별점', '내용', '작성자', '작성일', ''], L.map(r => [esc((C(r.cls) || {}).name || '—'), '★'.repeat(clamp(+r.stars || 0, 0, 5)) + '<span class="mini">' + '☆'.repeat(5 - clamp(+r.stars || 0, 0, 5)) + '</span>', esc(String(r.body || '').slice(0, 80)) + (r.hidden ? ' ' + tag('숨김', 'r') : ''), mn(r.who), esc(cmDate(r.at)), `<button class="btn sm ghost" data-act="cm-rv-hide" data-v="${esc(r.id)}">${r.hidden ? '보이기' : '숨김'}</button>`]), '수강후기가 없습니다.') + '<p class="mini">수강후기는 학습자 화면의 클래스 상세 하단과 홈페이지 수강후기 섹션에 노출됩니다.</p>'; }
ACT['cm-rv-hide'] = el => { const r = S.reviews.find(x => x.id === el.dataset.v); if (!r) return; r.hidden = !r.hidden; cmRvMirror(r); cmSave(); render(); };
/* 홈페이지 수강후기 섹션(site.js · sitepro.js)은 S.posts board '수강후기'를 읽으므로 거울 글을 함께 유지 */
function cmRvMirror(r, del) { let p = S.posts.find(x => x.rv === r.id); if (del) { if (p) S.posts = S.posts.filter(x => x !== p); return; } if (!p) { p = { id: r.id, rv: r.id, board: '수강후기', kind: '이야기', who: r.who, at: r.at, replies: 0, likes: [], files: [], views: 0 }; S.posts.push(p); } p.title = String(r.body || '').slice(0, 60); p.body = r.body; p.hidden = !!r.hidden; p.cls = r.cls; }

/* ═════════ ③ 상담 ═════════ */
const CS_EXT = ['mp4', 'm4a', 'mp3', 'amr', 'flac', 'wav']; const CS_MAX = 2 * 1073741824; const CS_STT = 1000; const CS_AI = 50;
const CMREC = {}; /* 이번 세션 녹음 파일(object URL) — 운영: 파일 서버 URL */
const csCat = id => S.cscats.find(x => x.id === id);
const csCatLabel = c => { const k = csCat(c.catId); if (!k) return '미지정'; const p = k.parent ? csCat(k.parent) : null; return p ? `${p.name} > ${k.name}` : k.name; };
const csTop = c => { const k = csCat(c.catId); return !k ? '' : k.parent ? k.parent : k.id; };
const csType = c => /전화/.test(c.ch) ? '전화' : /채팅/.test(c.ch) ? '채팅' : '대면';
const csInRange = (c, a, b) => { const d = cmDate(c.at); return (!a || d >= a) && (!b || d <= b); };
const csCatOpts = (sel, none = '미지정') => `<option value="">${esc(none)}</option>` + S.cscats.filter(k => !k.parent).map(k => `<option value="${esc(k.id)}" ${sel === k.id ? 'selected' : ''}>${esc(k.name)}</option>` + S.cscats.filter(x => x.parent === k.id).map(x => `<option value="${esc(x.id)}" ${sel === x.id ? 'selected' : ''}>　${esc(k.name)} &gt; ${esc(x.name)}</option>`).join('')).join('');
function csTurns(c) { if (Array.isArray(c.turns) && c.turns.length) return c.turns;
  const who = (M(c.who) || {}).name || '상담 대상', st = (c.staff || [])[0] || '상담자'; const topic = c.title || '상담';
  const L = [[st, `안녕하세요, ${topic} 건으로 연락 주셨죠. 어떤 점이 궁금하신가요?`], [who, `네, ${c.cat || '수강'} 관련해서 확인하고 싶은 게 있어서요. 일정이 맞을지 걱정입니다.`], [st, '현재 수강 현황을 먼저 확인해 보겠습니다. 진도는 절반 정도 진행하셨습니다.'], [who, '평일에는 시간이 부족해서 주말에 몰아서 들어도 괜찮을까요?'], [st, '가능합니다. 다만 수료 기준이 진도 80% 이상이라 종료일 2주 전까지 70%를 넘기시길 권합니다.'], [who, '알겠습니다. 과제 제출 기한도 같이 알려 주실 수 있나요?'], [st, '과제는 매주 일요일 자정까지입니다. 안내 메시지로 일정 정리해서 보내 드리겠습니다.'], [who, '감사합니다. 그렇게 해 주세요.']];
  let t0 = 0; return L.map(([sp, x]) => { const r = { t: t0, sp, x }; t0 += 12 + x.length % 25; return r; }); }
VIEWS.consult = () => { cmEnsure(); const tb = UI.csT || 'dash';
  if (UI.csId && S.consults.some(c => c.id === UI.csId)) return csDetail(S.consults.find(c => c.id === UI.csId));
  const cs = S.settings.cs; if (cs.status === '연동' && !UI.csSynced) { UI.csSynced = 1; setTimeout(() => csSync(true), 400); }
  return head('상담', `채널톡 전화 · 채팅 연동 · 대면 상담 녹음 → 텍스트 변환 · AI 요약 ${guideRef('features/consulting.md')}`, `<button class="btn" data-act="cs-sync">${ic('refresh', 15)} 상담 내역 불러오기</button><button class="btn pri" data-act="cs-start">대면 상담 시작</button>`) +
    `<p class="mini">${cs.status === '연동' ? `채널톡 연동됨 · 마지막 동기화 ${esc(cs.lastSync || '—')} · 메뉴에 들어올 때마다 자동 동기화합니다.` : '채널톡이 연동되지 않았습니다. [설정] 탭에서 클라이언트 키 · 시크릿 키를 등록하세요.'}</p>` +
    tabs('csT', [['dash', '상담 통계'], ['list', '상담 목록'], ['set', '설정']], tb) + (tb === 'list' ? csList() : tb === 'set' ? csSettings() : csDash()); };
ACT['cs-sync'] = () => csSync(false);
function csSync(silent) { const cs = S.settings.cs; if (cs.status !== '연동') { if (!silent) toast('채널톡 연동 후 불러올 수 있습니다. 상담 › 설정에서 키를 등록하세요.', 'warn'); return; }
  /* 운영: GET /api/consult/channeltalk/sync?since=<lastSync> → 채널톡 Open API(user-chats · 전화 기록) */
  const k = silent ? (Date.now() - Date.parse(cs.syncedAt || 0) > 300000 ? 1 : 0) : 1 + Math.floor(Math.random() * 2); let n = 0;
  for (let i = 0; i < k && S.members.length; i++) { const m = S.members[Math.floor(Math.random() * S.members.length)]; const top = S.cscats.filter(x => !x.parent); const kc = top.length ? top[Math.floor(Math.random() * top.length)] : null; const sub = kc ? S.cscats.filter(x => x.parent === kc.id) : [];
    const c = { id: uid('cs'), at: today(), time: new Date().toTimeString().slice(0, 5), who: m.id, targets: [m.id], staff: ['채널톡 상담원'], ch: Math.random() > .5 ? '채널톡 채팅' : '채널톡 전화', catId: (sub[0] || kc || {}).id || '', cat: kc ? kc.name : '미지정', title: ['수강 일정 문의', '결제 수단 문의', '진도 상담', '교재 배송 문의'][i % 4], summary: '', status: '완료', src: 'channeltalk' }; cmCsNorm(c); S.consults.unshift(c); n++; }
  cs.lastSync = nowStr(); cs.syncedAt = new Date().toISOString(); save(); if (!silent || n) { if (CUR.tab === 'consult' && !$('#modal')) render(); if (!silent) toast(n ? `채널톡 상담 ${n}건을 불러왔습니다(데모).` : '새 상담 내역이 없습니다.', 'ok'); } }
/* 통계 */
function csPeriod() { const p = UI.csP || {}; const to = p.to || today(); const from = p.from || addDays(to, -182); return { from, to }; }
function csDash() { const { from, to } = csPeriod(); const L = S.consults.filter(c => csInRange(c, from, to)); const N = L.length || 1; const unit = UI.csU || 'day';
  const top = S.cscats.filter(k => !k.parent); const open = UI.csOpen || {};
  const catRows = [...top.map(k => { const sub = S.cscats.filter(x => x.parent === k.id); const n = L.filter(c => csTop(c) === k.id).length;
    return `<div class="row"><button class="link" data-act="cs-open" data-v="${esc(k.id)}">${sub.length ? (open[k.id] ? '▾' : '▸') : '·'} ${esc(k.name)}</button>${bar(n / N * 100)}<b>${n}</b><small class="mini">${Math.round(n / N * 100)}%</small></div>` + (open[k.id] ? sub.map(x => { const m = L.filter(c => c.catId === x.id).length; return `<div class="row cmsub"><span>${esc(x.name)}</span>${bar(m / N * 100, 'g')}<b>${m}</b><small class="mini">${Math.round(m / N * 100)}%</small></div>`; }).join('') + (() => { const m = L.filter(c => c.catId === k.id).length; return m ? `<div class="row cmsub"><span>(하위 미지정)</span>${bar(m / N * 100)}<b>${m}</b><small class="mini">${Math.round(m / N * 100)}%</small></div>` : ''; })() : ''); }),
    (() => { const n = L.filter(c => !csCat(c.catId)).length; return `<div class="row"><span>미지정</span>${bar(n / N * 100, 'y')}<b>${n}</b><small class="mini">${Math.round(n / N * 100)}%</small></div>`; })()].join('');
  const days = ['일', '월', '화', '수', '목', '금', '토']; const HM = Array.from({ length: 7 }, () => Array(24).fill(0)); L.forEach(c => { const d = new Date(cmDate(c.at) + 'T00:00:00').getDay(); const h = parseInt(String(c.time || '10').slice(0, 2), 10) || 0; if (d >= 0) HM[d][h]++; }); const mx = Math.max(1, ...HM.flat());
  const heat = `<div class="cmheat" role="table" aria-label="요일 · 시간대별 상담 수"><span></span>${Array.from({ length: 24 }, (_, h) => `<small>${h % 3 ? '' : h}</small>`).join('')}${HM.map((r, d) => `<b>${days[d]}</b>${r.map((v, h) => `<i title="${days[d]}요일 ${h}시 · ${v}건" style="--a:${v ? .15 + v / mx * .85 : 0}"></i>`).join('')}`).join('')}</div>`;
  const keys = []; if (unit === 'month') { let d = from.slice(0, 7); while (d <= to.slice(0, 7) && keys.length < 13) { keys.push(d); const [y, m] = d.split('-').map(Number); d = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; } } else { let d = Math.max(Date.parse(from), Date.parse(to) - 29 * 864e5); for (; d <= Date.parse(to); d += 864e5) keys.push(new Date(d).toISOString().slice(0, 10)); }
  const cnt = k => L.filter(c => cmDate(c.at).startsWith(k)).length; const cm2 = Math.max(1, ...keys.map(cnt));
  const trend = `<div class="cmbars">${keys.map(k => `<span title="${k} · ${cnt(k)}건"><i style="height:${cnt(k) / cm2 * 100}%"></i><small>${unit === 'month' ? k.slice(2) : k.slice(8)}</small></span>`).join('')}</div>`;
  const ym = today().slice(0, 7); const F2F = S.consults.filter(c => csType(c) === '대면'); const sttM = c => (c.dur || 0) / 60; const sumMin = A => A.reduce((s, c) => s + sttM(c), 0);
  const thisM = sumMin(F2F.filter(c => cmDate(c.at).startsWith(ym))), allM = sumMin(F2F); const aiThis = S.consults.filter(c => c.summary && cmDate(c.sumAt || c.at).startsWith(ym)).length, aiAll = S.consults.filter(c => c.summary).length;
  const rc = UI.csRc || ''; const recent = S.consults.filter(c => !rc || csTop(c) === rc || c.catId === rc).slice(0, 8);
  const ic2 = UI.csIc || (top[0] || {}).id || ''; const inC = c => !ic2 || csTop(c) === ic2 || c.catId === ic2; const mAgo = n => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return ymdL(d).slice(0, 7); };
  const mc = k => S.consults.filter(c => inC(c) && cmDate(c.at).startsWith(k)).length; const cur = mc(mAgo(0)), prev = mc(mAgo(1)), ly = mc(mAgo(12)); const tr = UI.csTr || 3; const tk = Array.from({ length: tr }, (_, i) => mAgo(tr - 1 - i)); const tmx = Math.max(1, ...tk.map(mc));
  const diff = (a, b) => b ? `${a >= b ? '+' : ''}${Math.round((a - b) / b * 100)}%` : (a ? '신규' : '—');
  return `<div class="bar2"><label class="mini">기간 <input type="date" value="${esc(from)}" data-chg="cs-p" data-k="from" aria-label="시작일"></label><label class="mini">~ <input type="date" value="${esc(to)}" data-chg="cs-p" data-k="to" aria-label="종료일"></label>${[1, 3, 6].map(n => `<button class="btn sm ghost" data-act="cs-pq" data-v="${n}">최근 ${n}개월</button>`).join('')}<span class="mini">최대 6개월</span></div>
    <section class="grid g3">${kpi('총 상담', L.length + '건', `${esc(from)} ~ ${esc(to)}`)}${kpi('진행 · 변환 중', S.consults.filter(c => c.status !== '완료').length + '건')}${kpi('AI 요약 완료', S.consults.filter(c => c.summary).length + '건', '', 'g')}</section>
    <div class="grid g2"><div class="card"><div class="ch"><b>카테고리별 유입 수</b><button class="btn sm" data-act="cs-cat-add">+ 카테고리 추가</button></div>${top.length ? '' : '<p class="mini">등록한 카테고리가 없습니다. 카테고리를 추가하면 상위 › 하위로 나눠 볼 수 있습니다.</p>'}${catRows}</div>
      <div class="card"><div class="ch"><b>상담이 많은 요일과 시간</b><small>칸에 마우스를 올리면 건수</small></div>${heat}</div></div>
    <div class="card"><div class="ch"><b>총 상담 유입 수</b><div class="seg2">${[['day', '일'], ['month', '월']].map(([v, l]) => `<button class="${unit === v ? 'on' : ''}" data-act="cs-u" data-v="${v}">${l} 단위</button>`).join('')}</div></div>${trend}</div>
    <div class="grid g2"><div class="card"><div class="ch"><b>현재 STT 사용량</b><small>대면 상담 · 시간당 ${won(CS_STT)}+</small></div><div class="row"><span>이번 달</span><b>${Math.round(thisM)}분 · ${won(Math.round(thisM / 60 * CS_STT))}</b></div><div class="row"><span>누적</span><b>${Math.round(allM)}분 · ${won(Math.round(allM / 60 * CS_STT))}</b></div></div>
      <div class="card"><div class="ch"><b>AI 사용량</b><small>상담 요약 · 데모 단가 건당 ${won(CS_AI)}</small></div><div class="row"><span>이번 달</span><b>${aiThis}건 · ${won(aiThis * CS_AI)}</b></div><div class="row"><span>누적</span><b>${aiAll}건 · ${won(aiAll * CS_AI)}</b></div></div></div>
    <div class="grid g2"><div class="card"><div class="ch"><b>최근 상담 내역</b><select data-chg="cs-rc" aria-label="카테고리">${csCatOpts(rc, '전체 카테고리')}</select></div>${recent.map(c => `<div class="row"><a href="#" data-act="cs-open-d" data-v="${esc(c.id)}">${esc(c.title)}</a><small class="mini">${esc(csType(c))} · ${esc(csCatLabel(c))} · ${esc(cmDate(c.at))}</small></div>`).join('') || '<p class="mini">상담 내역이 없습니다.</p>'}</div>
      <div class="card"><div class="ch"><b>카테고리별 인사이트</b><select data-chg="cs-ic" aria-label="카테고리">${csCatOpts(ic2, '전체')}</select></div><div class="row"><span>이번 달</span><b>${cur}건</b></div><div class="row"><span>지난달 대비</span><b>${prev}건 · ${diff(cur, prev)}</b></div><div class="row"><span>작년 같은 달 대비</span><b>${ly}건 · ${diff(cur, ly)}</b></div><div class="seg2">${[3, 6].map(n => `<button class="${tr === n ? 'on' : ''}" data-act="cs-tr" data-v="${n}">최근 ${n}개월</button>`).join('')}</div><div class="cmbars sm">${tk.map(k => `<span title="${k} · ${mc(k)}건"><i style="height:${mc(k) / tmx * 100}%"></i><small>${k.slice(5)}월</small></span>`).join('')}</div></div></div>
    <div class="card"><div class="ch"><b>이용 요금 안내</b></div><p class="mini">전화 · 채팅 상담은 채널톡 유료 플랜이 필요합니다(상담 계정 5개 이상이면 그로스, 그 외 얼리 스테이지 추천). 대면 상담은 STT 요금이 시간당 ${won(CS_STT)}+ 발생하고, AI 요약은 사용량에 따라 별도 청구됩니다. 요금은 정산 정보의 이메일로 월 단위 안내합니다.</p></div>`; }
ACT['cs-open'] = el => { UI.csOpen = { ...(UI.csOpen || {}), [el.dataset.v]: !(UI.csOpen || {})[el.dataset.v] }; render(); };
ACT['cs-u'] = el => { UI.csU = el.dataset.v; render(); };
ACT['cs-tr'] = el => { UI.csTr = +el.dataset.v; render(); };
ACT['cs-rc'] = el => { UI.csRc = el.value; render(); };
ACT['cs-ic'] = el => { UI.csIc = el.value; render(); };
ACT['cs-pq'] = el => { const to = today(); UI.csP = { to, from: addDays(to, -Math.round(+el.dataset.v * 30.4)) }; render(); };
ACT['cs-p'] = el => { const p = { ...csPeriod(), [el.dataset.k]: el.value }; if (!p.from || !p.to) return; if (p.from > p.to) { toast('시작일이 종료일보다 늦습니다.', 'warn'); render(); return; } if ((Date.parse(p.to) - Date.parse(p.from)) / 864e5 > 184) { toast('기간은 최대 6개월까지 설정할 수 있습니다.', 'warn'); render(); return; } UI.csP = p; render(); };
/* 목록 */
function csList() { const f = UI.csF || {}; const q = (f.q || '').toLowerCase();
  const L = S.consults.filter(c => (!f.cat || csTop(c) === f.cat || c.catId === f.cat || (f.cat === 'none' && !csCat(c.catId))) && (!f.type || csType(c) === f.type) && csInRange(c, f.from, f.to) && (!f.fav || c.fav) && (!q || (c.title + ' ' + (c.text || '') + ' ' + (c.memo || '') + ' ' + c.targets.map(id => (M(id) || {}).name || '').join(' ')).toLowerCase().includes(q)));
  return `<div class="bar2"><select data-chg="cs-f" data-k="cat" aria-label="카테고리"><option value="">전체 카테고리</option><option value="none" ${f.cat === 'none' ? 'selected' : ''}>미지정</option>${csCatOpts(f.cat, '').replace(/^<option value="">[^<]*<\/option>/, '')}</select><select data-chg="cs-f" data-k="type" aria-label="유형"><option value="">전화 · 채팅 · 대면</option>${['전화', '채팅', '대면'].map(v => `<option ${f.type === v ? 'selected' : ''}>${v}</option>`).join('')}</select><input type="date" value="${esc(f.from || '')}" data-chg="cs-f" data-k="from" aria-label="시작일"><input type="date" value="${esc(f.to || '')}" data-chg="cs-f" data-k="to" aria-label="종료일"><label class="ckl"><input type="checkbox" data-chg="cs-f" data-k="fav" ${f.fav ? 'checked' : ''}> 즐겨찾기만</label><input type="search" placeholder="제목 · 내용 · 대상 검색" value="${esc(f.q || '')}" data-chg="cs-f" data-k="q" aria-label="검색"></div>` +
    `<div class="cs26h"><b>총 ${L.length}개</b></div>` + table(['', '번호', '상위 카테고리 › 하위 카테고리', '제목', '상담자', '상담 대상', '상담 일자', '요약 상태', '녹음파일', ''], L.map((c, k) => { const ty = csType(c); const cat = csCat(c.catId); const par = cat && cat.parent ? csCat(cat.parent) : null; const top = par || cat; const sub = par ? cat : null; const sst = c.status === '변환 중' || c.status === '진행 중' ? '진행 중' : c.sumSt === '요약 중' ? '요약 중' : c.summary ? '요약 완료' : '요약 전';
      return [`<button class="link cmfav ${c.fav ? 'on' : ''}" data-act="cs-fav" data-v="${esc(c.id)}" aria-label="즐겨찾기" aria-pressed="${!!c.fav}">${c.fav ? '★' : '☆'}</button>`, String(L.length - k), `<span class="cs26c"><span class="cs26t ${top ? '' : 'none'}">${esc(top ? top.name : '미지정')}</span><i aria-hidden="true">›</i><span class="cs26s">${esc(sub ? sub.name : top ? '—' : '미지정')}</span></span>`, `<span class="cs26ti"><span class="cs26ic" title="${esc(ty)}" aria-label="${esc(ty)}">${ty === '전화' ? '📞' : ty === '채팅' ? '💬' : '🗣'}</span>${esc(c.title)}</span>`, esc((c.staff || []).join(', ') || '—'), c.targets.map(id => mn(id)).join(', ') || '—', esc(cmDate(c.at)) + ' ' + esc(c.time || ''), sst === '요약 완료' ? tag('요약 완료', 'g') : sst === '요약 전' ? `<span class="mini">요약 전</span>` : tag(sst, 'y'),
        c.status === '변환 중' ? `<span class="cs26ing">··· 등록 중</span>` : c.file ? `<button class="btn sm ghost" data-act="cs-dl" data-v="${esc(c.id)}" aria-label="녹음 파일 내려받기">${ic('download', 14)}</button>` : '<span class="mini">—</span>', `<button class="btn sm" data-act="cs-open-d" data-v="${esc(c.id)}" ${c.status === '변환 중' ? 'disabled title="텍스트 변환이 끝나면 볼 수 있습니다"' : ''}>상세</button>`]; }), '조건에 맞는 상담이 없습니다.') + '<p class="mini">저장된 상담 내역은 삭제 · 공유할 수 없습니다.</p>'; }
ACT['cm26-fav'] = el => { const p = S.posts.find(x => x.id === el.dataset.v); if (!p) return; p.fav = !p.fav; save(); render(); };
ACT['cm26-qf'] = el => { const v = el.dataset.v; if (v === 'un') { UI.cm_un = !UI.cm_un; UI.cm_fav = false; } else { const k = v === 'fq' ? '질문' : '이야기'; const on = UI.cm_fav && UI.cm_kind === k; UI.cm_fav = !on; UI.cm_kind = on ? '' : k; UI.cm_un = false; } render(); };
ACT['cs-f'] = el => { UI.csF = { ...(UI.csF || {}), [el.dataset.k]: el.type === 'checkbox' ? el.checked : el.value }; render(); };
ACT['cs-fav'] = el => { const c = S.consults.find(x => x.id === el.dataset.v); if (!c) return; c.fav = !c.fav; save(); render(); };
ACT['cs-open-d'] = el => { const c = S.consults.find(x => x.id === el.dataset.v); if (!c) return; if (c.status === '변환 중') { toast('텍스트 변환 중입니다. 완료되면 상세를 볼 수 있습니다.', 'warn'); return; } UI.csId = c.id; UI.csQ = ''; if (CUR.tab !== 'consult') go('consult'); else render(); };
ACT['cs-back'] = () => { UI.csId = null; render(); };
/* 상세 */
function csDetail(c) { const T = csTurns(c); const q = (UI.csQ || '').trim(); const chat = csType(c) === '채팅';
  const tot = {}; T.forEach(x => { tot[x.sp] = (tot[x.sp] || 0) + String(x.x).length; }); const sum = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
  const hl = s => { const e = esc(s); if (!q) return e; const k = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return e.replace(new RegExp(k, 'gi'), m => `<mark>${m}</mark>`); };
  const hits = q ? T.filter(x => String(x.x).toLowerCase().includes(q.toLowerCase())).length : 0;
  const ins = (k, l, v) => `<div class="card cmins"><div class="ch"><b>${l}</b><button class="link" data-act="cs-ins" data-k="${k}" data-v="${esc(c.id)}" aria-label="${l} 수정">${ic('edit', 15)}</button></div>${v || '<p class="mini">[AI 요약받기]를 누르면 만들어집니다.</p>'}</div>`;
  const kw = (c.kw || []).map(x => tag(x, 'mg')).join(' '), todo = (c.todo || []).length ? `<ol>${c.todo.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '';
  const sumTxt = c.summary ? `<p>${esc(String(c.summary).split('\n')[0].replace(/^요약:\s*/, ''))}</p>` : '';
  const rec = CMREC[c.id]; const hasRec = !chat && (c.file || rec);
  return `<button class="link back" data-act="cs-back">← 상담 목록</button>` + headD(c.title, `${esc(csType(c))} 상담 · ${esc(cmDate(c.at))} ${esc(c.time || '')} · ${esc(csCatLabel(c))}`, `<button class="btn ghost" data-act="cs-fav" data-v="${esc(c.id)}">${c.fav ? '★ 즐겨찾기' : '☆ 즐겨찾기'}</button><button class="btn" data-act="cs-edit" data-v="${esc(c.id)}">정보 수정</button><button class="btn ai" data-act="cs-sum" data-v="${esc(c.id)}">${c.sumSt === '요약 중' ? '요약 중…' : '✦ AI 요약받기'}</button>`) +
    `<div class="grid g2"><div class="card"><div class="ch"><b>기본 정보</b></div><div class="row"><span>상담자</span><b>${esc((c.staff || []).join(', ') || '—')}</b></div><div class="row"><span>상담 대상</span><b>${c.targets.map(id => mn(id)).join(', ') || '—'}</b></div><div class="row"><span>일시</span><b>${esc(cmDate(c.at))} ${esc(c.time || '')}${c.dur ? ' · ' + cmSec(c.dur) : ''}</b></div><div class="row"><span>카테고리</span><b>${esc(csCatLabel(c))}</b></div>${c.memo ? `<div class="row"><span>메모</span><b>${esc(c.memo)}</b></div>` : ''}${hasRec ? `<div class="row"><span>녹음 파일</span>${rec ? `<a class="btn sm" href="${esc(rec.url)}" download="${esc(rec.name)}">내려받기 · ${esc(rec.name)}</a>` : `<button class="btn sm" data-act="cs-dl" data-v="${esc(c.id)}">내려받기 · ${esc((c.file || {}).name || '녹음')}</button>`}</div>` : ''}</div>
      <div class="card"><div class="ch"><b>발언 점유율</b></div>${Object.entries(tot).map(([k, v]) => `<div class="row"><span>${esc(k)}</span>${bar(v / sum * 100)}<b>${Math.round(v / sum * 100)}%</b></div>`).join('')}</div></div>
    <div class="grid g3">${ins('summary', '상담 요약', sumTxt)}${ins('kw', '키워드', kw ? `<p>${kw}</p>` : '')}${ins('todo', '다음 할 일', todo ? todo + `<button class="btn sm" data-act="cs-todo-auto" data-v="${esc(c.id)}">다음 할 일을 자동화로</button>` : '')}</div>
    <div class="card"><div class="ch"><b>상담 전체 내용</b><small>${chat ? '채팅' : '대화별 타임라인 · 화자 구분'}</small></div><div class="bar2"><input type="search" id="csQ" placeholder="검색어로 언급 위치 찾기" value="${esc(q)}" aria-label="상담 내용 검색">${q ? `<span class="mini">${hits}곳</span>` : ''}</div>
      <div class="${chat ? 'cmchat' : 'cmtl'}">${T.map((x, i) => chat ? `<div class="cmb ${i % 2 ? 'me' : ''}"><small>${esc(x.sp)}</small><p>${hl(x.x)}</p></div>` : `<div class="cmt"><code>${cmSec(x.t)}</code><b>${esc(x.sp)}</b><p>${hl(x.x)}</p></div>`).join('')}</div></div><p class="mini">저장된 상담 내역은 삭제 · 공유할 수 없습니다.</p>`; }
document.addEventListener('input', e => { if (e.target.id !== 'csQ') return; UI.csQ = e.target.value; const pos = e.target.selectionStart; render(); const y = $('#csQ'); if (y) { y.focus(); try { y.setSelectionRange(pos, pos); } catch (er) { } } });
ACT['cs-dl'] = el => { const c = S.consults.find(x => x.id === el.dataset.v); toast(`데모: 「${(c && c.file && c.file.name) || '녹음 파일'}」 원본은 운영 서버에서 내려받습니다.`); /* 운영: GET /api/consult/<id>/recording (서명 URL) */ };
ACT['cs-sum'] = el => { const c = S.consults.find(x => x.id === el.dataset.v); if (!c) return; if (c.status === '변환 중') { toast('텍스트 변환이 끝난 뒤 요약할 수 있습니다.', 'warn'); return; } c.sumSt = '요약 중'; save(); render(); toast('AI 요약을 만들고 있습니다. 목록에서 진행 상태를 볼 수 있습니다.');
  setTimeout(() => { const s = (typeof AI !== 'undefined' && AI.consultSum) ? AI.consultSum(c) : `요약: ${c.title} 상담`; c.summary = s; const ln = String(s).split('\n'); const kwL = ln.find(l => /^키워드/.test(l)); const tdL = ln.find(l => /^다음 할 일/.test(l));
    c.kw = kwL ? kwL.replace(/^키워드:\s*/, '').split(/[,·]/).map(x => x.trim()).filter(Boolean).slice(0, 6) : [csCatLabel(c), '일정']; c.todo = tdL ? tdL.replace(/^다음 할 일:\s*/, '').split(/[①②③④⑤]/).map(x => x.trim()).filter(Boolean).slice(0, 5) : ['안내 메시지 발송']; c.sumSt = '완료'; c.sumAt = today(); S.ai.usage = (S.ai.usage || 0) + 1; save(); if (CUR.tab === 'consult' && !$('#modal')) render(); toast('AI 요약 · 키워드 · 다음 할 일을 만들었습니다.', 'ok'); }, 700); };
ACT['cs-ins'] = el => { const c = S.consults.find(x => x.id === el.dataset.v); if (!c) return; const k = el.dataset.k; const cur = k === 'summary' ? String(c.summary || '').split('\n')[0].replace(/^요약:\s*/, '') : k === 'kw' ? (c.kw || []).join(', ') : (c.todo || []).join('\n');
  modal(k === 'summary' ? '상담 요약 수정' : k === 'kw' ? '키워드 수정' : '다음 할 일 수정', `<label class="fl">${k === 'kw' ? '쉼표로 구분' : k === 'todo' ? '줄마다 하나' : '요약'}<textarea name="v" rows="5" maxlength="2000">${esc(cur)}</textarea></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const v = fv(w, 'v'); if (k === 'summary') { const rest = String(c.summary || '').split('\n').slice(1); c.summary = ['요약: ' + v, ...rest].join('\n'); } else if (k === 'kw') c.kw = v.split(/[,\n]/).map(x => x.trim()).filter(Boolean).slice(0, 10); else c.todo = v.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 10); save(); render(); toast('저장했습니다.', 'ok'); } }]); };
ACT['cs-todo-auto'] = el => { const c = S.consults.find(x => x.id === el.dataset.v); if (!c) return; UI.autoPrefill = `${(M(c.who) || {}).name || ''} 상담 후속: ${(c.todo || [])[0] || c.title}`; go('auto'); };
/* 상담 정보 입력 폼(업로드 · 바로 시작 · 수정 공용) */
function csInfoForm(c) { c = c || {}; const staff = (c.staff || []).join(', ') || S.me.name; const tg = (c.targets || []);
  return `<label class="fl">상담 제목<input name="t" maxlength="60" value="${esc(c.title || '')}" placeholder="예: 2학기 진로 상담"></label><div class="form2"><label>상담자(쉼표로 여러 명)<input name="st" maxlength="200" value="${esc(staff)}" list="cmAdm"><datalist id="cmAdm">${(S.admins || []).map(a => `<option value="${esc(a.name)}">`).join('')}</datalist></label><label>카테고리<select name="cat">${csCatOpts(c.catId || '')}</select></label><label>날짜<input type="date" name="d" value="${esc(cmDate(c.at) || today())}"></label><label>시간<input type="time" name="tm" value="${esc(c.time || new Date().toTimeString().slice(0, 5))}"></label></div>
    <div class="fl">상담 대상(인원 제한 없음)<div class="cmchips" id="csTg">${tg.map(id => `<span class="tag" data-id="${esc(id)}">${esc((M(id) || {}).name || id)}</span>`).join('') || '<span class="mini">선택한 대상이 없습니다.</span>'}</div><button type="button" class="btn sm" data-cstg="1">${ic('plus', 14)} 대상 선택</button><input type="hidden" name="tg" value="${esc(tg.join(','))}"></div>`; }
function csBindTargets(w) { w.addEventListener('click', e => { if (!e.target.closest('[data-cstg]')) return; const hid = w.querySelector('[name=tg]'); const cur = hid.value.split(',').filter(Boolean);
  const snap = [...w.querySelectorAll('input,select,textarea')].map(x => [x.name, x.value]); const html = w.querySelector('.mb').innerHTML; const title = w.querySelector('.mh b').textContent; const acts = w._acts;
  cmPickMembers('상담 대상 선택', cur, ids => { if (document.body.contains(w)) { hid.value = ids.join(','); w.querySelector('#csTg').innerHTML = ids.map(id => `<span class="tag">${esc((M(id) || {}).name || id)}</span>`).join('') || '<span class="mini">선택한 대상이 없습니다.</span>'; return; } const w2 = modal(title, html, acts, true); w2._acts = acts; snap.forEach(([n, v]) => { const x = n && w2.querySelector(`[name="${n}"]`); if (x && x.type !== 'file') x.value = v; }); w2.querySelector('[name=tg]').value = ids.join(','); w2.querySelector('#csTg').innerHTML = ids.map(id => `<span class="tag">${esc((M(id) || {}).name || id)}</span>`).join('') || '<span class="mini">선택한 대상이 없습니다.</span>'; csBindTargets(w2); if (w._rebind) { w2._rebind = w._rebind; w._rebind(w2); } }); }); }
const csReadInfo = w => ({ title: fv(w, 't'), staff: fv(w, 'st').split(',').map(x => x.trim()).filter(Boolean), catId: fv(w, 'cat'), at: fv(w, 'd') || today(), time: fv(w, 'tm'), targets: fv(w, 'tg').split(',').filter(Boolean) });
const csApplyInfo = (c, f) => { Object.assign(c, f); c.who = f.targets[0] || ''; const k = csCat(f.catId); c.cat = k ? (k.parent ? (csCat(k.parent) || {}).name : k.name) : '미지정'; };
ACT['cs-start'] = () => { cmEnsure(); modal('대면 상담 시작', `<p class="mini">진행 방식을 고르세요.</p><div class="grid g2"><button class="card cmpick" data-act="cs-up">${ic('upload', 22)}<b>녹음 파일 업로드</b><small class="mini">mp4 · m4a · mp3 · amr · flac · wav · 2GB 이하</small></button><button class="card cmpick" data-act="cs-live">${ic('mic', 22)}<b>바로 시작하기</b><small class="mini">마이크로 녹음하며 메모 · 일시정지 · 종료 시 저장</small></button></div>`, [{ id: 'c', label: '닫기' }], true); };
ACT['cs-up'] = () => { let file = null; const acts = [{ id: 'c', label: '취소' }, { id: 'ok', label: '등록하기', kind: 'pri', run: w => { const f = csReadInfo(w); if (!f.title) { toast('상담 제목을 입력하세요.', 'warn'); return false; } if (!f.targets.length) { toast('상담 대상을 한 명 이상 선택하세요.', 'warn'); return false; } if (!file) { toast('녹음 파일을 선택하세요.', 'warn'); return false; }
    const c = { id: uid('cs'), ch: '대면 상담', status: '변환 중', summary: '', file: { name: file.name, size: file.size, type: file.type }, dur: Math.max(60, Math.round(file.size / 16000)), src: 'upload' }; csApplyInfo(c, f); cmCsNorm(c); S.consults.unshift(c); try { CMREC[c.id] = { url: URL.createObjectURL(file), name: file.name }; } catch (e) { }
    /* 운영: 파일 서버 업로드(분할 업로드) → STT 작업 큐 → 완료 웹훅 */ logAudit('대면 상담 녹음 업로드 — ' + f.title); save(); UI.csT = 'list'; render(); toast('업로드했습니다. 텍스트 변환이 끝나면 상세를 볼 수 있습니다(데모 약 3초).', 'ok');
    setTimeout(() => { c.status = '완료'; c.turns = csTurns(c); save(); if (CUR.tab === 'consult' && !$('#modal')) render(); toast(`「${c.title}」 텍스트 변환을 마쳤습니다.`, 'ok'); }, 3000); } }];
  const bind = w => { w.querySelector('#csFile').addEventListener('change', e => { const x = e.target.files[0]; const out = w.querySelector('#csFileOut'); file = null; if (!x) { out.textContent = ''; return; } const ext = (x.name.split('.').pop() || '').toLowerCase();
      if (!CS_EXT.includes(ext)) { out.innerHTML = `<b class="r">${esc(ext || '확장자 없음')} 파일은 올릴 수 없습니다. ${CS_EXT.join(' · ')}만 가능합니다.</b>`; e.target.value = ''; return; } if (x.size > CS_MAX) { out.innerHTML = `<b class="r">2GB를 넘는 파일(${cmSize(x.size)})은 올릴 수 없습니다.</b>`; e.target.value = ''; return; } file = x; out.textContent = `${x.name} · ${cmSize(x.size)}`; }); };
  const w = modal('녹음 파일 업로드', csInfoForm({}) + `<label class="fl">녹음 파일<input type="file" id="csFile" accept=".mp4,.m4a,.mp3,.amr,.flac,.wav,audio/*,video/mp4"></label><p class="mini" id="csFileOut"></p><p class="mini">2GB 이하 · ${CS_EXT.join(' · ')} · 등록하면 텍스트 변환이 시작되고, 변환이 끝나기 전에는 상세 내용을 볼 수 없습니다. 등록한 정보는 나중에 수정할 수 있습니다.</p>`, acts, true);
  w._acts = acts; w._rebind = bind; bind(w); csBindTargets(w); };
/* 바로 시작: MediaRecorder(지원 · 허용 시), 아니면 데모 타이머 */
const CMR = { rec: null, stream: null, chunks: [], acc: 0, t0: 0, iv: 0, paused: false, demo: false, on: false };
const cmrSec = () => Math.round((CMR.acc + (CMR.on && !CMR.paused ? Date.now() - CMR.t0 : 0)) / 1000);
const cmrTick = () => { const e = $('#csClock'); if (e) e.textContent = cmSec(cmrSec()); };
function cmrStop() { clearInterval(CMR.iv); try { CMR.rec && CMR.rec.state !== 'inactive' && CMR.rec.stop(); } catch (e) { } try { CMR.stream && CMR.stream.getTracks().forEach(t2 => t2.stop()); } catch (e) { } CMR.on = false; }
ACT['cs-live'] = () => { cmrStop(); Object.assign(CMR, { rec: null, stream: null, chunks: [], acc: 0, t0: 0, paused: false, demo: false, on: false });
  const acts = [{ id: 'c', label: '취소', run: () => { cmrStop(); } }, { id: 'ok', label: '종료 · 저장', kind: 'pri', run: w => { const f = csReadInfo(w); if (!f.title) { toast('상담 제목을 입력하세요.', 'warn'); return false; } if (!f.targets.length) { toast('상담 대상을 한 명 이상 선택하세요.', 'warn'); return false; } if (!CMR.on && !CMR.acc) { toast('[녹음 시작]을 눌러 상담을 녹음하세요.', 'warn'); return false; }
    const dur = Math.max(1, cmrSec()); const memo = fv(w, 'memo'); const c = { id: uid('cs'), ch: '대면 상담', status: '변환 중', summary: '', dur, memo, src: 'live' }; csApplyInfo(c, f); cmCsNorm(c); c.dur = dur;
    const fin = blob => { if (blob && blob.size) { const name = `상담녹음_${today().replace(/-/g, '')}.${/mp4/.test(blob.type) ? 'm4a' : 'webm'}`; c.file = { name, size: blob.size, type: blob.type }; try { CMREC[c.id] = { url: URL.createObjectURL(blob), name }; } catch (e) { } } else c.file = { name: `상담녹음_${today().replace(/-/g, '')}.webm`, size: dur * 16000, type: 'audio/webm', demo: true }; save(); };
    if (CMR.rec && !CMR.demo) { CMR.rec.onstop = () => fin(new Blob(CMR.chunks, { type: CMR.rec.mimeType || 'audio/webm' })); } else fin(null);
    cmrStop(); S.consults.unshift(c); logAudit('대면 상담 녹음 — ' + f.title); save(); UI.csT = 'list'; render(); toast('상담을 저장했습니다. 텍스트 변환 중입니다(데모 약 3초).', 'ok');
    setTimeout(() => { c.status = '완료'; const T = csTurns(c); if (memo) T.push({ t: dur, sp: '메모', x: memo }); c.turns = T; save(); if (CUR.tab === 'consult' && !$('#modal')) render(); toast(`「${c.title}」 텍스트 변환을 마쳤습니다.`, 'ok'); }, 3000); } }];
  const w = modal('대면 상담 — 바로 시작', csInfoForm({}) + `<div class="cmrec"><b id="csClock">0:00</b><span id="csRecSt" class="mini">대기 중</span><div class="bar2"><button type="button" class="btn pri" data-act="cs-rec-go">${ic('mic', 15)} 녹음 시작</button><button type="button" class="btn" data-act="cs-rec-pause" disabled>일시정지</button></div></div><label class="fl">메모(상담 중에도 입력)<textarea name="memo" rows="3" maxlength="2000"></textarea></label><p class="mini">마이크 권한이 필요합니다. 권한 요청 창이 뜨면 허용하세요. 상담 중에도 위 정보를 바꿀 수 있고, [종료 · 저장]을 눌러야 저장됩니다.</p>`, acts, true);
  w._acts = acts; w._rebind = cmrWatch; csBindTargets(w); cmrWatch(w); };
function cmrWatch(w) { const obs = new MutationObserver(() => { if (!document.body.contains(w)) { obs.disconnect(); setTimeout(() => { if (!$('#modal')) cmrStop(); }, 50); } }); obs.observe(document.body, { childList: true }); }
ACT['cs-rec-go'] = async el => { const st = $('#csRecSt'); const pb = $('[data-act=cs-rec-pause]');
  if (CMR.on) { return; }
  try { if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported'); CMR.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); CMR.rec = new MediaRecorder(CMR.stream); CMR.chunks = []; CMR.rec.ondataavailable = e => { if (e.data && e.data.size) CMR.chunks.push(e.data); }; CMR.rec.start(1000); CMR.demo = false; if (st) st.textContent = '녹음 중'; }
  catch (e) { CMR.demo = true; if (st) st.textContent = e && e.name === 'NotAllowedError' ? '마이크 권한이 거부되어 데모 녹음(시간만 기록)으로 진행합니다' : '이 브라우저에서는 녹음할 수 없어 데모 녹음(시간만 기록)으로 진행합니다'; }
  CMR.on = true; CMR.paused = false; CMR.t0 = Date.now(); clearInterval(CMR.iv); CMR.iv = setInterval(cmrTick, 500); if (el) { el.disabled = true; el.textContent = '녹음 중'; } if (pb) pb.disabled = false; };
ACT['cs-rec-pause'] = el => { if (!CMR.on) return; const st = $('#csRecSt');
  if (!CMR.paused) { CMR.acc += Date.now() - CMR.t0; CMR.paused = true; try { CMR.rec && CMR.rec.state === 'recording' && CMR.rec.pause(); } catch (e) { } el.textContent = '이어서 녹음'; if (st) st.textContent = '일시정지'; }
  else { CMR.t0 = Date.now(); CMR.paused = false; try { CMR.rec && CMR.rec.state === 'paused' && CMR.rec.resume(); } catch (e) { } el.textContent = '일시정지'; if (st) st.textContent = CMR.demo ? '데모 녹음 중' : '녹음 중'; } cmrTick(); };
ACT['cs-edit'] = el => { const c = S.consults.find(x => x.id === el.dataset.v); if (!c) return; const acts = [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const f = csReadInfo(w); if (!f.title) { toast('상담 제목을 입력하세요.', 'warn'); return false; } csApplyInfo(c, f); save(); render(); toast('상담 정보를 수정했습니다.', 'ok'); } }];
  const w = modal('상담 정보 수정', csInfoForm(c), acts, true); w._acts = acts; csBindTargets(w); };
/* 설정: 연동(키 검증) · 정산 정보 · 카테고리 2단 */
function csSettings() { const cs = S.settings.cs; const bill = cs.bill;
  return `<div class="grid g2"><div class="card" id="cmCsKeys"><div class="ch"><b>연동 설정 · 채널톡</b>${cs.status === '연동' ? tag('연동됨', 'g') : tag('미연동', 'y')}</div>
    <p class="mini">채널톡 › 채널 설정 › 보안 및 개발 › API › [새 인증 키 만들기]로 발급한 Access Key를 클라이언트 키에, Access Secret을 시크릿 키에 입력하세요. Access Secret은 발급 화면에서만 보이니 복사해 두세요.</p>
    <label class="fl">클라이언트 키(Access Key)<input id="csCk" maxlength="64" autocomplete="off" value="${esc(cs.ck || '')}" placeholder="예: 64f0c3a1b2c4d5e6f7a8b9c0"></label><label class="fl">시크릿 키(Access Secret)<input id="csSk" type="password" maxlength="128" autocomplete="new-password" placeholder="${cs.skMask ? esc(cs.skMask) + ' (등록됨)' : '시크릿 키'}"></label>
    <button class="btn pri" data-act="cs-key">등록</button><p class="mini" id="csKeyOut">${cs.status === '연동' ? `등록일 ${esc(cs.at)} · 연동 해제는 디디쌤 채널톡으로 요청하세요.` : '유효하지 않은 키(채널톡에서 직접 발급받은 키가 아닌 값)는 등록되지 않습니다.'}</p></div>
    <div class="card"><div class="ch"><b>정산 정보</b>${bill ? tag('등록됨', 'g') : tag('미등록', 'y')}</div><p class="mini">대면 상담(STT)과 AI 요약을 쓰려면 정산 정보가 필요합니다. 사용량에 따른 이용 요금을 입력한 이메일로 월 단위 안내하고, 사업자등록증으로 세금계산서를 발행합니다.</p>${bill ? `<div class="row"><span>사업자등록번호</span><b>${esc(bill.bizNo)}</b></div><div class="row"><span>이메일</span><b>${esc(bill.email)}</b></div><div class="row"><span>사업자등록증</span><b>${esc((bill.doc || {}).name || '')}</b></div>` : ''}<button class="btn" data-act="cs-bill">${bill ? '정산 정보 수정' : '정산 정보 등록하러 가기'}</button></div></div>
    <div class="card"><div class="ch"><b>카테고리 설정</b><small>상위 &gt; 하위 2단</small><button class="btn sm pri" data-act="cs-cat-add">+ 상위 카테고리</button></div>${S.cscats.filter(k => !k.parent).map(k => `<div class="cmcat"><div class="row"><b>${esc(k.name)}</b><span><button class="btn sm ghost" data-act="cs-cat-add" data-v="${esc(k.id)}">+ 하위</button><button class="btn sm ghost" data-act="cs-cat-ren" data-v="${esc(k.id)}">이름 변경</button><button class="btn sm ghost" data-act="cs-cat-del" data-v="${esc(k.id)}">삭제</button></span></div>${S.cscats.filter(x => x.parent === k.id).map(x => `<div class="row cmsub"><span>└ ${esc(x.name)}</span><span><button class="btn sm ghost" data-act="cs-cat-ren" data-v="${esc(x.id)}">이름 변경</button><button class="btn sm ghost" data-act="cs-cat-del" data-v="${esc(x.id)}">삭제</button></span></div>`).join('')}</div>`).join('') || '<p class="mini">카테고리가 없습니다.</p>'}<p class="mini">상위 카테고리를 삭제하면 하위 카테고리도 함께 삭제됩니다. 카테고리를 삭제해도 그 카테고리의 상담 내역은 사라지지 않고 '미지정'으로 표시됩니다.</p></div>
    <div class="card"><div class="ch"><b>이용 요금 안내</b></div><p class="mini">전화 · 채팅 상담은 채널톡 유료 플랜 결제가 필요합니다(상담 계정 5개 이상: 그로스 / 그 외: 얼리 스테이지 추천). 대면 상담 STT는 시간당 ${won(CS_STT)}+, AI 요약은 사용량에 따라 별도 청구됩니다. 설정이 어려우면 디디쌤 채널톡으로 문의하세요.</p></div>`; }
ACT['cs-key'] = () => { const ck = ($('#csCk') || {}).value.trim(), sk = ($('#csSk') || {}).value.trim(); const out = $('#csKeyOut'); const cs = S.settings.cs;
  if (!ck || (!sk && !cs.skMask)) { toast('클라이언트 키와 시크릿 키를 모두 입력하세요.', 'warn'); return; }
  /* 데모 검증: 채널톡 Access Key 24자 16진수, Access Secret 32자 16진수. 운영: POST /api/consult/channeltalk/keys → 서버가 채널톡 API(GET /open/v5/channel) 호출로 검증하고 시크릿은 서버에만 암호화 저장 */
  if (!/^[a-f0-9]{24}$/i.test(ck) || (sk && !/^[a-f0-9]{32}$/i.test(sk))) { cs.status = cs.status === '연동' ? '연동' : '미연동'; if (out) out.innerHTML = '<b class="r">유효하지 않은 키입니다. 채널톡에서 발급받은 Access Key(24자) · Access Secret(32자)을 그대로 붙여 넣으세요.</b>'; toast('유효하지 않은 키는 등록되지 않습니다.', 'bad'); return; }
  cs.ck = ck; if (sk) cs.skMask = '••••' + sk.slice(-4); cs.status = '연동'; cs.at = today(); UI.csSynced = 0; logAudit('채널톡 연동 키 등록'); save(); render(); toast('채널톡을 연동했습니다. 상담 내역을 불러옵니다.', 'ok'); setTimeout(() => csSync(false), 300); };
ACT['cs-bill'] = () => { const b = S.settings.cs.bill || {}; let doc = b.doc || null;
  const w = modal('정산 정보', `<label class="fl">사업자등록번호<input name="biz" maxlength="12" placeholder="000-00-00000" value="${esc(b.bizNo || '')}"></label><label class="fl">이메일(요금 안내 수신)<input name="em" type="email" maxlength="80" value="${esc(b.email || '')}"></label><label class="fl">사업자등록증(PDF · JPG · PNG, 10MB 이하)<input type="file" id="csDoc" accept=".pdf,.jpg,.jpeg,.png"></label><p class="mini" id="csDocOut">${doc ? esc(doc.name) : ''}</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w2 => { const biz = fv(w2, 'biz').replace(/\D/g, ''), em = fv(w2, 'em'); if (biz.length !== 10) { toast('사업자등록번호 10자리를 입력하세요.', 'warn'); return false; } if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('이메일 형식을 확인하세요.', 'warn'); return false; } if (!doc) { toast('사업자등록증을 올리세요.', 'warn'); return false; }
      S.settings.cs.bill = { bizNo: `${biz.slice(0, 3)}-${biz.slice(3, 5)}-${biz.slice(5)}`, email: em, doc, at: today() }; logAudit('상담 정산 정보 등록'); save(); render(); toast('정산 정보를 저장했습니다.', 'ok'); } }]);
  w.querySelector('#csDoc').addEventListener('change', e => { const x = e.target.files[0]; const o = w.querySelector('#csDocOut'); doc = null; if (!x) return; if (!/\.(pdf|jpe?g|png)$/i.test(x.name)) { o.innerHTML = '<b class="r">PDF · JPG · PNG만 올릴 수 있습니다.</b>'; return; } if (x.size > 10 * 1048576) { o.innerHTML = '<b class="r">10MB를 넘습니다.</b>'; return; } doc = { name: x.name, size: x.size, type: x.type }; o.textContent = `${x.name} · ${cmSize(x.size)}`; }); };
ACT['cs-cat-add'] = el => { cmEnsure(); const par = el.dataset.v || ''; const P = par ? csCat(par) : null;
  modal(P ? `「${P.name}」 하위 카테고리 추가` : '카테고리 추가', `${P ? '' : `<label class="fl">상위 카테고리<select name="p"><option value="">(새 상위 카테고리)</option>${S.cscats.filter(k => !k.parent).map(k => `<option value="${esc(k.id)}">${esc(k.name)}</option>`).join('')}</select></label>`}<label class="fl">이름<input name="n" maxlength="20"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { const n = fv(w, 'n'); const p = P ? P.id : fv(w, 'p'); if (!n) { toast('이름을 입력하세요.', 'warn'); return false; } if (S.cscats.some(x => x.name === n && (x.parent || '') === (p || ''))) { toast('같은 이름의 카테고리가 있습니다.', 'warn'); return false; } S.cscats.push({ id: uid('cc'), name: n, parent: p || null }); save(); render(); toast('카테고리를 추가했습니다.', 'ok'); } }]); };
ACT['cs-cat-ren'] = el => { const k = csCat(el.dataset.v); if (!k) return; modal('카테고리 이름 변경', `<label class="fl">이름<input name="n" maxlength="20" value="${esc(k.name)}"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const n = fv(w, 'n'); if (!n) return false; k.name = n; save(); render(); } }]); };
ACT['cs-cat-del'] = el => { const k = csCat(el.dataset.v); if (!k) return; const sub = S.cscats.filter(x => x.parent === k.id); const n = S.consults.filter(c => c.catId === k.id || sub.some(s => s.id === c.catId)).length;
  modal('카테고리 삭제', `<p>「${esc(k.name)}」${sub.length ? `와 하위 카테고리 ${sub.length}개` : ''}를 삭제합니다.</p><p class="mini">이 카테고리의 상담 ${n}건은 삭제되지 않고 '미지정'으로 표시됩니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { const ids = new Set([k.id, ...sub.map(s => s.id)]); S.cscats = S.cscats.filter(x => !ids.has(x.id)); logAudit('상담 카테고리 삭제 — ' + k.name); save(); render(); } }]); };
/* 설정 › 상담 설정 탭: 체크박스 대신 같은 연동 · 카테고리 화면 */
AFTER.push(cur => { if (!S || !S.org || cur.ws !== 'settings' || (UI.settings || 'menu') !== 'consult') return; const old = $('[data-k=consultKeys]'); const host = old ? old.closest('.form2') : null; if (!host || $('#cmCsSet')) return; cmEnsure();
  old.closest('label').remove(); host.insertAdjacentHTML('afterend', `<div id="cmCsSet">${csSettings()}</div>`); });

/* ═════════ ④ 학습자 → 운영자 반영(LPX) ═════════ */
function cmWho(who) { if (!who) return null; const univ = S.org.type === 'univ';
  let m = S.members.find(x => x.sid === who || x.id === who || (x.acct && x.acct.email === who) || (univ && x.name === who)); if (m) return m;
  const code = (S.codes || []).find(c => c.sid === who); m = { id: uid('m'), name: univ ? who : `학습자 ${who}`, nick: '', email: '', phone: '', sid: who, group: (S.groups[0] || {}).id || '', grade: '정회원', joined: today(), last: today(), extra: univ ? { 학번: who, 학과: (code && code.dept) || '' } : {} }; S.members.push(m); return m; }
const cmTxt = (v, n) => String(v == null ? '' : v).slice(0, n);
const cmFilesIn = F => (Array.isArray(F) ? F : []).slice(0, 10).map(f => ({ name: cmTxt(f.name, 120), size: +f.size || 0, type: cmTxt(f.type, 60), data: cmImgOK(f.data) && String(f.data).length < 280000 ? f.data : '' }));
const cmOwn = (o, m) => o && m && o.who === m.id;
/* v36 게시판 권한: 학습자 글은 '학습자도 쓰기' + 공개 범위 안의 게시판에만, 댓글 · 첨부는 게시판 설정대로 */
const cmCanWrite = (b, m) => !!b && b.write !== 'admin' && ((b.perm || {}).type === 'all' || !(b.perm || {}).type || cmPermMembers(b).includes(m.id));
const cmBoardOf = p => S.boards.find(b => b.id === (p && p.board));
LPX['post-new'] = x => { cmEnsure(); const d = x.data || {}; const m = cmWho(x.who); if (!m || S.posts.some(p => p.id === d.id)) return; let bd = S.boards.find(b => b.id === d.board); if (!cmCanWrite(bd, m)) { bd = S.boards.find(b => cmCanWrite(b, m)); if (!bd) return; } const board = bd.id; const body = cmTxt(d.body, 4000); if (bd.file === false) d.files = [];
  S.posts.unshift({ id: cmTxt(d.id, 40) || uid('po'), board, kind: d.kind === '질문' ? '질문' : '이야기', who: m.id, title: cmTxt(d.title, 120) || body.slice(0, 30), body, cls: C(d.cls) ? d.cls : '', item: cmTxt(d.item, 40), files: cmFilesIn(d.files), tonly: !!d.tonly, priv: !!d.priv, likes: [], replies: 0, views: 0, at: cmDate(x.at) || today(), ua: x.at, hidden: false }); m.last = today(); cmPub(); };
LPX['post-edit'] = x => { const d = x.data || {}; const m = cmWho(x.who); const p = S.posts.find(y => y.id === d.id); if (!cmOwn(p, m)) return; if ((cmBoardOf(p) || {}).file === false) delete d.files; if (d.title != null) p.title = cmTxt(d.title, 120) || cmTxt(d.body, 30); if (d.body != null) p.body = cmTxt(d.body, 4000); if (d.kind) p.kind = d.kind === '질문' ? '질문' : '이야기'; if (d.files) p.files = cmFilesIn(d.files); if (d.priv != null) p.priv = !!d.priv; if (d.tonly != null) p.tonly = !!d.tonly; if (d.cls !== undefined) p.cls = C(d.cls) ? d.cls : ''; if (d.item !== undefined) p.item = cmTxt(d.item, 40); p.ua = x.at; cmPub(); };
LPX['post-del'] = x => { const d = x.data || {}; const m = cmWho(x.who); const p = S.posts.find(y => y.id === d.id); if (!cmOwn(p, m)) return; S.posts = S.posts.filter(y => y !== p); cmPub(); };
LPX['post-like'] = x => { const d = x.data || {}; const m = cmWho(x.who); const p = S.posts.find(y => y.id === d.id); if (!p || !m) return; p.likes = (p.likes || []).filter(id => id !== m.id); if (d.on) p.likes.push(m.id); cmPub(); };
LPX['post-view'] = x => { const p = S.posts.find(y => y.id === (x.data || {}).id); if (p) { p.views = (p.views || 0) + 1; cmPub(); } };
LPX['post-cmt'] = x => { const d = x.data || {}; const m = cmWho(x.who); const p = S.posts.find(y => y.id === d.post); if (!p || !m) return; if ((cmBoardOf(p) || {}).cmt === false) return; const r = { id: cmTxt(d.id, 40) || uid('cm'), who: m.id, body: cmTxt(d.body, 2000), at: nowStr(), replies: [] }; if (!r.body) return; const L = Array.isArray(p.replies) ? p.replies : []; if (cmFindCmt(L, r.id)) return;
  const par = d.parent ? cmFindCmt(L, d.parent) : null; if (par) par.r.replies = [...(par.r.replies || []), r]; else L.push(r); p.replies = L.length ? L : 0; cmPub(); };
LPX['cmt-del'] = x => { const d = x.data || {}; const m = cmWho(x.who); const p = S.posts.find(y => y.id === d.post) || S.notes.find(y => y.id === d.post); if (!p || !m) return; const L = S.notes.includes(p) ? (p.comments || []) : (Array.isArray(p.replies) ? p.replies : []); const f = cmFindCmt(L, d.id); if (!f || f.r.who !== m.id) return; f.L.splice(f.L.indexOf(f.r), 1); if (!S.notes.includes(p) && !p.replies.length) p.replies = 0; cmPub(); };
LPX['note-new'] = x => { cmEnsure(); const d = x.data || {}; const m = cmWho(x.who); if (!m || S.notes.some(n => n.id === d.id)) return; S.notes.unshift({ id: cmTxt(d.id, 40) || uid('nt'), who: m.id, cls: C(d.cls) ? d.cls : '', item: cmTxt(d.item, 40), at: Math.max(0, Math.round(+d.t || 0)), body: cmTxt(d.body, 2000), q: !!d.q, pub: !!d.pub, created: nowStr(), ua: x.at, comments: [] }); cmPub(); };
LPX['note-edit'] = x => { const d = x.data || {}; const m = cmWho(x.who); const n = S.notes.find(y => y.id === d.id); if (!cmOwn(n, m)) return; if (d.body != null) n.body = cmTxt(d.body, 2000); if (d.pub != null) n.pub = !!d.pub; if (d.q != null) n.q = !!d.q; n.ua = x.at; cmPub(); };
LPX['note-del'] = x => { const d = x.data || {}; const m = cmWho(x.who); const n = S.notes.find(y => y.id === d.id); if (!cmOwn(n, m)) return; S.notes = S.notes.filter(y => y !== n); cmPub(); };
LPX['note-cmt'] = x => { const d = x.data || {}; const m = cmWho(x.who); const n = S.notes.find(y => y.id === d.note); if (!n || !m) return; const r = { id: cmTxt(d.id, 40) || uid('cm'), who: m.id, body: cmTxt(d.body, 2000), at: nowStr(), replies: [] }; if (!r.body || cmFindCmt(n.comments, r.id)) return; const par = d.parent ? cmFindCmt(n.comments, d.parent) : null; if (par) par.r.replies = [...(par.r.replies || []), r]; else n.comments = [...(n.comments || []), r]; cmPub(); };
LPX['review-new'] = x => { cmEnsure(); const d = x.data || {}; const m = cmWho(x.who); if (!m || !C(d.cls)) return; if (S.reviews.some(r => r.who === m.id && r.cls === d.cls)) { LPX['review-edit']({ ...x, data: { ...d, id: (S.reviews.find(r => r.who === m.id && r.cls === d.cls) || {}).id } }); return; }
  const r = { id: cmTxt(d.id, 40) || uid('rv'), who: m.id, cls: d.cls, stars: clamp(Math.round(+d.stars || 5), 1, 5), body: cmTxt(d.body, 2000), at: today(), ua: x.at }; S.reviews.unshift(r); cmRvMirror(r); cmPub(); };
LPX['review-edit'] = x => { const d = x.data || {}; const m = cmWho(x.who); const r = S.reviews.find(y => y.id === d.id); if (!cmOwn(r, m)) return; if (d.stars != null) r.stars = clamp(Math.round(+d.stars || 5), 1, 5); if (d.body != null) r.body = cmTxt(d.body, 2000); r.ua = x.at; cmRvMirror(r); cmPub(); };
LPX['review-del'] = x => { const d = x.data || {}; const m = cmWho(x.who); const r = S.reviews.find(y => y.id === d.id); if (!cmOwn(r, m)) return; S.reviews = S.reviews.filter(y => y !== r); cmRvMirror(r, true); cmPub(); };
LPX['notice-view'] = x => { const f = cmFindNotice((x.data || {}).id); if (f) { f.n.views = (f.n.views || 0) + 1; cmPub(); } };
LPX['msg-read'] = x => { const d = x.data || {}; const m = cmWho(x.who); if (!m) return; [m.id, ...(d.par ? ['par:' + d.par] : [])].forEach(k => (S.inbox[k] || []).forEach(e => { if (e.id === d.id || e.msg === d.msg) e.read = true; })); };

/* 데이터 보정 시점: 상태 업그레이드 · 기관 생성 · 화면 그리기 */
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { cmEnsure(); } catch (e) { console.error(e); } return r; }; }
AFTER.push(() => { try { if (S && S.org && S.cmV !== 1) { cmEnsure(); save(); } } catch (e) { console.error(e); } });
/* 커버리지 표 */
if (typeof COVER !== 'undefined') COVER.push(['[v22] 메시지: 개별 · 보호자 포함 · 이미지 여러 장 · 내역 검색 · 플랜 한도 · 회원 목록/상세에서 발송', 'message', 'features/message.md'], ['[v22] 커뮤니티: 게시판 만들기 · 댓글/답글 · 좋아요 · 공지 대상/본문/조회수 · 학습노트 위치 · 후기 상세검색', 'community', 'features/community.md'], ['[v22] 상담: 채널톡 키 검증 · 동기화 · 카테고리 2단 · 녹음 업로드/바로 녹음 · 통계 · 상세', 'consult', 'features/consulting.md']);
