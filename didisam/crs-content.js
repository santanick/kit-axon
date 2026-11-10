/* 디디쌤 스튜디오 v35 — 콘텐츠 도구 CT (C3)
   '차시 채우기' 단계 화면과, 과정 만들기 흐름 · 콘텐츠 라이브러리가 함께 쓰는 쉬운 콘텐츠 만들기 창.
   종류 카드 → 쉬운 입력(주제는 차시 제목으로 미리 채움) → 결과 미리보기 → [이 차시에 넣기] (3번 클릭 안에)
   기존 AI.material · AI.lecture · AI.questions · AI.assignment · AI.rubric · bkAIDraft · aiPlayer · aiRecord · materialHTML을 감싸 쓴다.
   AI: Claude가 연결돼 있으면(CL.on('docs')) Claude로 만들고, 아니면 브라우저 규칙 생성(데모)으로 만든다. 주제 글만 보낸다(개인정보 없음).
   업로드: C6 업로드 함수(window.crsUpload 또는 NOTES에 적힌 이름)가 있으면 실제로 저장하고, 없으면 파일 이름 · 크기 기록 + 이 창 안 미리보기만. */
(function () {
  'use strict';
  const W = window;
  /* ── 작은 도구 ── */
  const $1 = (s, r) => (r || document).querySelector(s);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const nid = p => (typeof uid === 'function' ? uid(p) : p + Math.random().toString(36).slice(2, 9));
  const say = (m, k) => { try { toast(m, k || ''); } catch (e) { } };
  const keep = () => { try { save(); } catch (e) { } };
  const cl = s => (typeof clean === 'function' ? clean(s) : String(s || '').trim());
  const topicOf = s => { const x = typeof lecTopic === 'function' ? lecTopic(s) : cl(s); return x === '핵심 개념' && !cl(s) ? '' : x; };
  const unit = () => { try { if (W.CF && typeof CF.unit === 'function') { const u = CF.unit((F && F.d) || CF.draft || {}); if (u) return u; } const c = W.CF && CF.cfg && CF.cfg[S.org.type]; if (c && c.terms && (c.terms.sess || c.terms.unit)) return c.terms.sess || c.terms.unit; } catch (e) { } return S && S.org && S.org.type === 'univ' ? '주차' : '차시'; };
  /* 받침에 맞는 조사: jo('강좌', '을') → '강좌를' · jo('훈련과정', '이') → '훈련과정이' */
  const jo = (w, a) => { try { if (W.CF && typeof CF.josa === 'function') return CF.josa(w, a); } catch (e) { } return jo0(w, a); }; /* 조사는 CF.josa(=AI.j)로 통일 */
  const jo0 = (w, a) => { const s = String(w ?? ''); const t = s.replace(/[」』"')\]\s]+$/, ''); const ch = t.charCodeAt(t.length - 1); const jong = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : /[0-9]$/.test(t) ? ([0, 1, 3, 6, 7, 8].includes(+t.slice(-1)) ? 1 : 0) : /[lmnr]$/i.test(t) ? 1 : 0; const P = { '을': ['을', '를'], '이': ['이', '가'], '은': ['은', '는'], '과': ['과', '와'], '으로': ['으로', '로'] }[a]; return s + (P ? (jong && !(a === '으로' && jong === 8) ? P[0] : P[1]) : a); };
  try { if (typeof ITEMX === 'object' && ITEMX && !ITEMX.audio) ITEMX.audio = '음성'; } catch (e) { } /* 운영자 목차 라벨: 올린 음성(type 'audio') */
  const HPMx = () => (typeof HPM === 'object' && HPM) || W.HPM || null;
  const clibL = () => (S.clib = Array.isArray(S.clib) ? S.clib : []);
  const P = { /* 선 굵기가 같은 아이콘(24 격자) */
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    aivideo: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 10l4-2v8l-4-2"/><path d="M9 9l.8 1.7L11.5 11l-1.7.8L9 13.5l-.8-1.7L6.5 11l1.7-.3z"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1V14M12 17h.01"/>',
    exam: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12l1.5 1.5L13 11M9 17h6"/>',
    survey: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    assign: '<path d="M9 4h6v3H9z"/><path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 13l2 2 4-4"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 1h13v-3M9 7h6"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="3.5"/><path d="M10 9.5v5l4.5-2.5z"/>',
    audio: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    lib: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>', back: '<path d="M15 5l-7 7 7 7"/>', check: '<path d="M5 12l5 5 9-10"/>', spark: '<path d="M12 3l2.1 6.4L20.5 12l-6.4 2.1L12 20.5l-2.1-6.4L3.5 12l6.4-2.6z"/>',
    play: '<path d="M7 5v14l11-7z"/>', down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', print: '<path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/>', chev: '<path d="M9 6l6 6-6 6"/>', undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
  };
  const svg = (k, n) => `<svg class="ct-ic" viewBox="0 0 24 24" width="${n || 22}" height="${n || 22}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || ''}</svg>`;

  /* ── 종류 카드 ── */
  const KINDS = [
    { k: 'upload', name: '영상 · 자료 올리기', one: '가지고 있는 영상 · 음성 · PDF · PPT · 한글 파일을 올립니다', time: '1분' },
    { k: 'aivideo', name: 'AI 강의 영상 만들기', one: '주제만 적으면 대본 · 슬라이드 · 음성 설명을 한 번에 만듭니다', time: '약 1분' },
    { k: 'doc', name: '교안 만들기', one: '학습 목표 · 본문 · 실습 · 확인 문제가 담긴 A4 교안', time: '30초' },
    { k: 'quiz', name: '퀴즈 만들기', one: '정답과 해설이 있는 확인 문제', time: '30초' },
    { k: 'exam', name: '시험 만들기', one: '중간 · 기말 · 과정 테스트 — 문제 은행에서 랜덤으로 냅니다', time: '1분' },
    { k: 'survey', name: '설문 만들기', one: '객관식 · 척도 · 주관식 문항의 만족도 · 의견 설문', time: '30초' },
    { k: 'assign', name: '과제 만들기', one: '과제 안내와 채점 기준을 함께 만듭니다', time: '30초' },
    { k: 'book', name: '디지털북 만들기', one: '읽고 · 풀고 · 쓰며 익히는 교재', time: '1분' },
    { k: 'youtube', name: 'YouTube 영상 넣기', one: 'YouTube 주소를 붙여 넣습니다', time: '1분' },
    { k: 'lib', name: '라이브러리에서 가져오기', one: '이미 만들어 둔 콘텐츠를 고릅니다', time: '30초' }
  ];
  const KN = Object.fromEntries(KINDS.map(x => [x.k, x]));
  const icOf = it => (it && it.type === 'audio') || /^audio/.test((it && it.mime) || '') ? 'audio' : (KN[TYPE_KIND(it || {})] ? TYPE_KIND(it) : 'doc');
  const STEPS = { upload: ['파일 고르기', '확인하고 넣기'], aivideo: ['주제 확인', '만들기', '미리보기'], doc: ['주제 확인', '미리보기'], quiz: ['주제 확인', '미리보기'], exam: ['시험 설정', '문항 고치기'], survey: ['주제 확인', '문항 고치기'], assign: ['주제 확인', '미리보기'], book: ['주제 확인', '미리보기'], youtube: ['주소 붙여 넣기', '확인하고 넣기'], lib: ['고르기', '확인하고 넣기'] };
  const TYPE_KIND = it => it.type === 'audio' ? 'upload' : it.type === 'video' ? (it.src === 'ai' ? 'aivideo' : it.src === 'upload' ? 'upload' : 'youtube') : it.type === 'doc' ? (it.src === 'book' ? 'book' : it.src === 'upload' ? 'upload' : 'doc') : it.type;
  const TYPE_LABEL = it => ({ aivideo: 'AI 영상', upload: it.type === 'video' ? '영상' : it.type === 'audio' ? '음성' : '자료', youtube: 'YouTube', doc: '교안', book: '디지털북', quiz: '퀴즈', exam: '시험', survey: '설문', assign: '과제' }[TYPE_KIND(it)] || (typeof ITEMX === 'object' && ITEMX[it.type]) || it.type);

  /* ── AI 생성(Claude 있으면 Claude, 없으면 규칙) ── */
  const claudeOn = () => { try { return typeof CL === 'object' && !!CL.on('docs'); } catch (e) { return false; } };
  async function claudeJSON(prompt, max) {
    const r = await Promise.race([CL.call({ system: '당신은 교육 콘텐츠 작성자입니다. 한국어로, 요청한 JSON 하나만 출력합니다. 설명 문장이나 코드 블록 표시는 쓰지 않습니다.', messages: [{ role: 'user', content: prompt }], max: max || 2000 }), new Promise((_, no) => setTimeout(() => no(new Error('시간 초과')), 30000))]);
    const m = String(r.text || '').match(/[[{][\s\S]*[\]}]/); if (!m) throw new Error('형식 오류'); return JSON.parse(m[0]);
  }
  const GEN = {
    async doc(tp, o) {
      if (claudeOn()) try { const j = await claudeJSON(`주제 「${tp}」의 강의 교안을 JSON으로: {"goals":[학습 목표 3개],"secs":[{"h":"절 제목","body":"본문 3~4문장","pts":["요점",...3개]} 4개],"act":"실습 활동 한 문단(①②③ 단계)","check":["확인 문제" 3개]}. 대상: ${o.target || '일반 학습자'}.`, 2400);
        if (Array.isArray(j.goals) && Array.isArray(j.secs) && j.secs.length) return { v: { title: tp, goals: j.goals.map(String).slice(0, 6), secs: j.secs.slice(0, 8).map(s => ({ h: String(s.h || ''), body: String(s.body || ''), pts: (s.pts || []).map(String).slice(0, 6) })), act: String(j.act || ''), check: (j.check || []).map(String).slice(0, 6), course: o.cname || '' }, by: 'claude' }; } catch (e) { }
      return { v: AI.material(tp, { name: o.cname || '' }), by: 'rule' };
    },
    async aivideo(tp, o) {
      if (claudeOn()) try { const j = await claudeJSON(`주제 「${tp}」의 ${o.mins}분짜리 강의 영상 대본을 JSON 배열로: [{"h":"장면 제목","pts":["슬라이드 요점" 3개],"say":"내레이션 2~3문장"}] 장면 ${Math.max(4, Math.round(o.mins * 1.6))}개, 첫 장면은 학습 목표, 마지막은 정리.`, 3000);
        if (Array.isArray(j) && j.length >= 3) return { v: j.slice(0, 14).map(s => ({ h: String(s.h || ''), pts: (s.pts || []).map(String).slice(0, 5), say: String(s.say || '') })), by: 'claude' }; } catch (e) { }
      return { v: AI.lecture(tp, o.mins), by: 'rule' };
    },
    async quiz(tp, o) {
      if (claudeOn()) try { const j = await claudeJSON(`주제 「${tp}」의 ${o.lv} 난이도 확인 문제 ${o.n}개를 JSON 배열로: 객관식은 {"t":"mc","q":"문제","opts":[보기 4개],"a":"정답 보기 번호(0부터)","exp":"해설"}, OX는 {"t":"ox","q":"문장","a":"O 또는 X","exp":"해설"}. 객관식과 OX를 섞습니다.`, 2400);
        if (Array.isArray(j) && j.length) { const per = Math.floor(100 / j.length); return { v: j.slice(0, 20).map((q, i) => ({ t: q.t === 'ox' ? 'ox' : 'mc', q: `${i + 1}. ${String(q.q || '').replace(/^\d+\.\s*/, '')}`, opts: q.t === 'ox' ? undefined : (q.opts || []).map(String).slice(0, 6), a: String(q.a ?? '0'), exp: String(q.exp || ''), pts: per + (i < 100 - per * j.length ? 1 : 0), lv: o.lv })), by: 'claude' }; } } catch (e) { }
      return { v: AI.questions(tp, o.n, o.lv, ['mc', 'ox', 'mc', 'mc', 'ox']), by: 'rule' };
    },
    async assign(tp) { return { v: { ...AI.assignment(tp), rb: AI.rubric(tp) }, by: 'rule' }; },
    async exam(tp, o) { const need = Math.min(60, o.need || 30);
      if (claudeOn()) try { const j = await claudeJSON(`주제 「${tp}」의 ${o.lv} 난이도 시험 문제 ${Math.min(need, 40)}개를 JSON 배열로(문제 은행, 서로 겹치지 않게): 객관식 {"t":"mc","q":"문제","opts":[보기 4개],"a":"정답 보기 번호(0부터)","exp":"해설"}, OX {"t":"ox","q":"문장","a":"O 또는 X","exp":"해설"}, 단답 {"t":"short","q":"문제","a":"정답","exp":"해설"}. 객관식 60% · OX 25% · 단답 15%.`, 6000);
        if (Array.isArray(j) && j.length) { const L = j.map(q => ({ t: ['mc', 'ox', 'short'].includes(q.t) ? q.t : 'mc', q: strip(String(q.q || '')), opts: q.t === 'mc' || !q.t ? (q.opts || []).map(String).slice(0, 6) : undefined, a: String(q.a ?? '0'), exp: String(q.exp || ''), lv: o.lv })).filter(q => q.q); return { v: L.length < need ? L.concat(examBank(tp, need - L.length, o.lv, L)) : L.slice(0, need), by: 'claude' }; } } catch (e) { }
      return { v: examBank(tp, need, o.lv), by: 'rule' }; },
    async survey(tp, o) {
      if (claudeOn()) try { const j = await claudeJSON(`주제 「${tp}」 교육의 만족도 · 의견 설문 ${o.n}문항을 JSON 배열로: 객관식 {"t":"single","q":"질문","opts":[항목 3~5개]}, 척도 {"t":"scale","q":"질문(그렇다/아니다로 답할 수 있게)"}, 주관식 {"t":"text","q":"질문"}. 넣을 유형: ${Object.keys(o.mix).filter(k => o.mix[k]).join(', ')}. 주관식은 마지막에.`, 2400);
        if (Array.isArray(j) && j.length) return { v: j.slice(0, 12).map(q => q.t === 'scale' ? { id: nid('sq'), q: String(q.q || ''), t: 'single', opts: [...A5L], scale: true, req: true, etc: false, max: 0 } : q.t === 'text' ? { id: nid('sq'), q: String(q.q || ''), t: 'text', opts: [], req: false, etc: false, max: 0 } : { id: nid('sq'), q: String(q.q || ''), t: q.t === 'multi' ? 'multi' : 'single', opts: (q.opts || []).map(String).slice(0, 8), req: true, etc: false, max: 0 }).filter(q => q.q), by: 'claude' }; } catch (e) { }
      return { v: svDraft(tp, o.n, o.mix), by: 'rule' }; },
    async book(tp, o) { const b = bkAIDraft(tp, o.n || 3, {}); return { v: b, by: 'rule' }; }
  };
  const byNote = by => by === 'claude' ? '<span class="ct-by c">Claude로 만들었습니다 · 내용을 한 번 확인하세요</span>' : '<span class="ct-by">기본 AI(브라우저 데모)로 만든 초안입니다 · 내용을 한 번 확인하세요</span>';

  /* ── 업로드 저장(C6 연결 지점) ── */
  const BLOBS = {}; /* 이 창 안 미리보기용 object URL(새로고침하면 사라짐) */
  const upFn = () => (HPMx() && typeof HPM.upload === 'function') ? ((f, o) => HPM.upload(f, { kind: 'course', name: f.name, onProgress: o && o.onProgress })) : (W.crsUpload || null);
  const FKIND = f => { const n = (f.name || '').toLowerCase(); const ty = f.type || ''; if (ty.startsWith('video') || /\.(mp4|webm|mov|m4v)$/.test(n)) return 'video'; if (ty.startsWith('audio') || /\.(mp3|m4a|wav|ogg)$/.test(n)) return 'audio'; if (ty.startsWith('image')) return 'image'; if (ty === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf'; return 'file'; };
  const LIMIT0 = { video: 1024 ** 3, audio: 200 * 1024 ** 2, image: 2 * 1024 ** 2, pdf: 100 * 1024 ** 2, file: 100 * 1024 ** 2 };
  const LIMIT = new Proxy(LIMIT0, { get: (o, k) => { try { const M = HPMx() && HPM.FMAX; if (M) { const v = M[k === 'pdf' || k === 'file' ? 'doc' : k]; if (+v > 0) return +v; } } catch (e) { } return o[k]; } }); /* 상한은 hpmedia.js HPM.FMAX(= 서버 mediafile.js limits)를 그대로 쓴다 */
  const limText = () => `영상 ${mb(LIMIT.video).replace('.0', '')} · 음성 ${mb(LIMIT.audio)} · 문서 ${mb(LIMIT.file)}까지`;
  const ACCEPT0 = 'video/*,audio/*,image/*,.pdf,.ppt,.pptx,.doc,.docx,.hwp,.hwpx,.xls,.xlsx';
  const accept = () => { try { if (HPMx() && HPM.accept) return HPM.accept('course') || ACCEPT0; } catch (e) { } return ACCEPT0; };
  const mb = n => n >= 1024 ** 3 ? (n / 1024 ** 3).toFixed(1) + 'GB' : n < 102400 ? Math.max(1, Math.round(n / 1024)) + 'KB' : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + 'MB';

  /* ── 창 상태 ── */
  let X = null; /* { kind, ctx, step, topic, mins, n, lv, fmt, res, by, busy, file, url, pick, done } */
  const sessTitle = ctx => cl((ctx && (ctx.title || (ctx.sess && ctx.sess.title))) || '');
  const courseName = ctx => cl((ctx && ctx.course && ctx.course.name) || '');
  const seedTopic = ctx => { const st = sessTitle(ctx); const cn = courseName(ctx); const g = /^\d+\s*(차시|주차|주|회차)$/.test(st) || !st; return topicOf(g ? cn || st : st) || cn || ''; };
  const where = () => { const c = X.ctx; if (X.ctx.from === 'lib' && !c.course) return '콘텐츠 라이브러리에 저장합니다'; const w = c.week ? `${c.week}${unit()}` : ''; const st = sessTitle(c); const tt = st && !/^\d+\s*(차시|주차|주|회차)$/.test(st) ? `「${st}」` : ''; if (w) return `${w}${tt ? ' ' + tt : ''}에 넣습니다`; return `${tt || (courseName(c) ? `「${courseName(c)}」` : '')}에 넣습니다`.replace(/^에 넣습니다$/, `이 ${unit()}에 넣습니다`); }; /* 어느 차시에 들어가는지 크게(평가 1회차 6번) */
  const doneLabel = () => X.ctx.from === 'lib' && !X.ctx.course ? '라이브러리에 저장' : (X.ctx.item ? '이 콘텐츠로 바꾸기' : `이 ${unit()}에 넣기`);

  /* ── v36 만들기 화면: 왼쪽(휴대폰은 위) 설정 + 오른쪽 실시간 미리보기, 미리보기 글자를 누르면 그 자리에서 고친다 ── */
  const MK = new Set(['doc', 'quiz', 'exam', 'survey', 'assign', 'aivideo', 'book']);
  const EXK = [['mid', '중간고사'], ['final', '기말고사'], ['test', '과정 테스트']];
  const exName = k => (EXK.find(x => x[0] === k) || EXK[2])[1];
  const guessEk = ctx => { const s = sessTitle(ctx) + ' ' + cl((ctx && ctx.title) || ''); if (/중간/.test(s)) return 'mid'; if (/기말|최종|종합/.test(s)) return 'final'; return 'test'; };
  const SVT = [['single', '객관식(하나 고르기)'], ['multi', '객관식(여러 개 고르기)'], ['scale', '척도(5점)'], ['text', '주관식(자유롭게 쓰기)']];
  const A5L = ['매우 그렇다', '그렇다', '보통', '그렇지 않다', '전혀 그렇지 않다'];
  const svKind = q => q.t === 'text' ? 'text' : q.scale || (q.t === 'single' && JSON.stringify(q.opts) === JSON.stringify(A5L)) ? 'scale' : q.t === 'multi' || q.t === 'multiN' ? 'multi' : 'single';
  const clone = o => JSON.parse(JSON.stringify(o));
  const strip = q => String(q || '').replace(/^\d+\.\s*/, '');

  function open(kind, ctx) {
    if (!S) return; ctx = ctx || {}; if (!KN[kind]) kind = 'doc'; if (kind === 'lib' && ctx.from === 'lib' && !ctx.course) kind = 'doc';
    const pre = ctx.preset || {};
    X = { kind, ctx, step: 0, topic: seedTopic(ctx), mins: 5, n: 5, lv: '보통', fmt: 'hand', units: 3, res: null, by: '', busy: false, dirty: false, ttl: '',
      ek: pre.examKind || guessEk(ctx), en: +pre.n || 10, mult: +pre.mult || 3, time: +pre.time || (pre.examKind === 'test' ? 30 : 60), retake: pre.retake != null ? +pre.retake : 1, pass: +pre.pass || 60, passOn: pre.passOn !== false && pre.pass !== 0, rand: pre.random !== false, pvx: 'bank',
      sn: kind === 'survey' ? (+pre.n || 6) : 6, mix: { single: 1, scale: 1, text: 1 },
      tpl: 'slide', avatar: 'none', vg: 'f', rate: 1, vname: '', vlang: 'ko', slang: 'ko', tr: {}, scene: 0, due: 7 };
    if (ctx.item) prefill(ctx.item);
    mount(); draw();
    if (MK.has(kind) && !X.res && (X.topic || '').trim() && !claudeOn()) A['ct-make']();
    return true;
  }
  function prefill(it) { const k = TYPE_KIND(it); if (k !== X.kind) return;
    if (k === 'aivideo' && it.ai?.scenes?.length) { const a = it.ai; X.res = clone(a.scenes); X.mins = a.mins || 5; X.step = 2; Object.assign(X, { tpl: a.tpl || a.style || 'slide', avatar: a.avatar || 'none', vg: a.voice || 'f', rate: +a.rate || 1, vname: a.vname || '', vlang: a.vlang || 'ko', slang: a.slang || 'ko', tr: clone(a.tr || {}) }); }
    if (k === 'doc' && it.doc?.secs?.length) { X.res = clone(it.doc); X.fmt = it.fmt || 'hand'; X.step = 1; }
    if (k === 'quiz' && it.qs?.length) { X.res = clone(it.qs); X.step = 1; }
    if (k === 'exam' && it.qs?.length) { const R = it.rules || {}; X.res = clone(it.qs); X.step = 1; X.ek = it.ek || guessEk({ title: it.title }); X.en = +R.draw || +(it.pool && it.pool.n) || it.qs.length; X.mult = +(it.pool && it.pool.mult) || Math.max(1, Math.round(it.qs.length / X.en)); X.time = +it.time || 60; X.retake = it.retake != null ? +it.retake : 1; X.passOn = !!(R.pass ? R.pass.on : true); X.pass = +(R.pass && R.pass.v) || 60; X.rand = R.shuffle !== false; }
    if (k === 'survey' && it.qs?.length) { X.res = clone(it.qs).map(q => typeof q === 'object' ? { id: q.id || nid('sq'), q: q.q || '', t: q.t === 'likert' ? 'single' : (q.t || 'single'), opts: q.t === 'likert' ? [...A5L] : (q.opts || []), req: q.req !== false, scale: q.t === 'likert' || q.scale, etc: !!q.etc, max: +q.max || 0 } : { id: nid('sq'), q: String(q), t: 'single', opts: [...A5L], req: true, scale: true }); X.sn = X.res.length; X.step = 1; }
    if (k === 'assign' && (it.desc || it.deliv)) { const rb = (S.rubrics || []).find(r => r.id === it.rubric) || it._rb || AI.rubric(it.title || ''); X.res = { desc: it.desc || '', deliv: it.deliv || '', due: +it.due || 7, rb: clone(rb) }; X.due = +it.due || 7; X.step = 1; }
    if (k === 'book') { let b = it._book || null; try { if (!b && it.book && typeof bkOf === 'function') b = bkOf(it.book); } catch (e) { } if (b && (b.chs || []).length) { X.res = clone(b); X.units = b.chs.length; X.step = 1; X.bookRef = it.book || ''; } }
    if (k === 'youtube' && it.url) X.url = it.url; if (it.topic) X.topic = topicOf(it.topic); if (it.title && MK.has(k)) X.ttl = it.title; }
  function mount() {
    close(true); injectCSS();
    const w = document.createElement('div'); w.className = 'ct-wrap'; w.id = 'ctSheet';
    w.innerHTML = `<div class="ct-sh" role="dialog" aria-modal="true" aria-labelledby="ctTitle"><div class="ct-hd"><button type="button" class="ct-icb" data-act="ct-back" aria-label="이전">${svg('back', 22)}</button><div class="ct-ht"><b id="ctTitle"></b><small id="ctWhere"></small></div><button type="button" class="ct-icb" data-act="ct-close" aria-label="닫기">${svg('x', 22)}</button></div><ol class="ct-steps" id="ctSteps"></ol><p class="ct-now" id="ctNow"></p><div class="ct-bd" id="ctBody"></div><div class="ct-ft" id="ctFoot"></div></div>`;
    document.body.appendChild(w);
    w.addEventListener('click', e => { if (e.target === w) close(); });
    w.addEventListener('keydown', e => { if (e.key === 'Escape' && !(e.target && e.target.isContentEditable)) { e.stopPropagation(); close(); } });
    setTimeout(() => { const f = w.querySelector('.ct-bd input, .ct-bd textarea, .ct-ft .ct-pri'); f && f.focus({ preventScroll: true }); }, 30);
  }
  function close(silent) { const w = $1('#ctSheet'); if (w) w.remove(); try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } if (!silent) { X = null; } }

  /* ── 화면 그리기 ── */
  function draw() {
    const w = $1('#ctSheet'); if (!w || !X) return; const K = KN[X.kind]; const ST = STEPS[X.kind]; const mk = MK.has(X.kind) && !X.done;
    const sh = w.querySelector('.ct-sh'); if (sh) sh.classList.toggle('wide', mk);
    $1('#ctTitle').textContent = X.done ? '저장했습니다' : K.name; $1('#ctWhere').textContent = X.done ? '' : where(); $1('#ctWhere').className = !X.done && X.ctx.week ? 'ct-dest' : '';
    $1('#ctSteps').innerHTML = X.done || mk ? '' : ST.map((s, i) => `<li class="${i < X.step ? 'ok' : i === X.step ? 'on' : ''}" ${i === X.step ? 'aria-current="step"' : ''}><i>${i < X.step ? svg('check', 14) : i + 1}</i><span>${E(s)}</span></li>`).join('');
    $1('#ctSteps').hidden = X.done || mk;
    w.querySelector('[data-act=ct-back]').style.visibility = !mk && X.step > 0 && !X.done && !X.busy ? 'visible' : 'hidden';
    const R = X.done ? vDone() : (VIEW[X.kind] || VIEW.doc)();
    $1('#ctNow').innerHTML = R.now ? `<b>지금 할 일</b> ${E(R.now)}` : ''; $1('#ctNow').hidden = !R.now;
    const ae = document.activeElement; const keep = ae && ae.id && w.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) ? [ae.id, ae.selectionStart, ae.selectionEnd] : null;
    const pv0 = $1('#ctPv'), st0 = $1('.ct-set'); const sc = [pv0 ? pv0.scrollTop : 0, st0 ? st0.scrollTop : 0];
    $1('#ctBody').innerHTML = mk ? `<div class="ct-mk ct-mk-${X.kind}"><div class="ct-set" role="region" aria-label="만들기 설정">${R.set}</div><section class="ct-pv" aria-label="실시간 미리보기"><div class="ct-pvh"><b>실시간 미리보기</b><small>${E(R.hint || (X.res ? '글자를 누르면 그 자리에서 바로 고칠 수 있습니다' : '설정을 바꾸면 여기에 바로 보입니다'))}</small></div><div class="ct-pvb" id="ctPv">${R.pv}</div></section></div>` : R.body;
    $1('#ctFoot').innerHTML = R.foot || '';
    if (mk) { const pv = $1('#ctPv'), st = $1('.ct-set'); if (pv) pv.scrollTop = sc[0]; if (st) st.scrollTop = sc[1]; }
    if (keep) { const n = document.getElementById(keep[0]); if (n) { n.focus({ preventScroll: true }); try { if (keep[1] != null) n.setSelectionRange(keep[1], keep[2]); } catch (e) { } } }
    if (R.after) R.after($1('#ctBody'));
  }
  const pri = (label, act, dis, extra) => `<button type="button" class="ct-btn ct-pri" data-act="${act}" ${dis ? 'disabled aria-disabled="true"' : ''} ${extra || ''}>${label}</button>`;
  const sec = (label, act, extra) => `<button type="button" class="ct-btn" data-act="${act}" ${extra || ''}>${label}</button>`;
  /* 주제가 비면 만들기 버튼 옆에 이유를 적는다(평가 2회차 5번 — 버튼만 흐려 보여 막힌 느낌) */
  const foot = (main, left) => { const need = !left && X && X.step === 0 && /data-act="ct-make"/.test(main) && !String(X.topic || '').trim(); return `<div class="ct-fl">${left || (need ? `<span class="ct-need" data-ctneed="1">주제를 적으면 만들 수 있습니다</span>` : '')}</div>${main}`; };
  const busyBox = m => `<div class="ct-busy" role="status"><span class="ct-spin" aria-hidden="true"></span>${E(m)}</div>`;
  const topicField = (lab, ex) => `<label class="ct-f"><span class="ct-l">${E(lab)}</span><input id="ctTopic" value="${E(X.topic)}" maxlength="80" autocomplete="off"></label><p class="ct-ex">예: ${E(ex)}</p><button type="button" class="ct-btn ct-ai" data-act="ct-aifill">${svg('spark', 18)} AI SAM이 채워 주기</button>`;
  const chips = (key, opts, lab, sub) => `<div class="ct-f"><span class="ct-l">${E(lab)}${sub ? ` <small class="ct-sub">${E(sub)}</small>` : ''}</span><div class="ct-chips" role="radiogroup" aria-label="${E(lab)}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${String(X[key]) === String(v)}" class="ct-chip ${String(X[key]) === String(v) ? 'on' : ''}" data-act="ct-opt" data-k="${key}" data-v="${E(v)}">${E(l)}</button>`).join('')}</div></div>`;
  const ce = (path, txt, tag, cls, ph) => `<${tag || 'span'} class="ct-ce ${cls || ''}" data-ce="${E(path)}" tabindex="0" role="textbox" aria-label="눌러서 고치기"${ph ? ` data-ph="${E(ph)}"` : ''}>${E(txt)}</${tag || 'span'}>`;
  const makeBtn = (lab) => `<button type="button" class="ct-btn ct-ai ct-mkb" data-act="ct-make" ${X.busy ? 'disabled' : ''}>${svg('spark', 18)} ${E(X.res ? 'AI로 다시 만들기' : lab)}</button>${X.res && X.dirty ? '<p class="ct-mini">다시 만들면 미리보기에서 고친 내용은 새 초안으로 바뀝니다.</p>' : ''}`;
  const setHead = (lab, ex) => topicField(lab, ex);
  const pvEmpty = (m) => X.busy ? busyBox(m) : `<div class="ct-pvempty">${svg('spark', 34)}<b>${E(String(X.topic || '').trim() ? '[만들기]를 누르면 여기에 바로 만들어집니다' : '주제를 적으면 여기에 바로 만들어집니다')}</b><span>만든 뒤에는 미리보기의 글자를 눌러 그 자리에서 고칩니다.</span></div>`;
  const mkFoot = (lab) => X.res && !X.busy ? foot(pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done')) : foot(pri(`${svg('spark', 18)} ${E(lab)}`, 'ct-make', X.busy));
  const titleOf = () => X.ttl || ({ doc: docTitle(), quiz: `${X.topic || sessTitle(X.ctx) || ''} 확인 퀴즈`, exam: `${X.topic || sessTitle(X.ctx) || courseName(X.ctx) || ''} ${exName(X.ek)}`, survey: `${X.topic || courseName(X.ctx) || ''} 설문`, assign: `${X.topic || sessTitle(X.ctx) || ''} 과제`, aivideo: `${vTitle()} 강의 영상`, book: (X.res && X.res.title) || `${X.topic} 디지털북` }[X.kind] || '').replace(/\s+/g, ' ').trim();
  const ttlRow = () => `<div class="ct-ttl">${ce('@title', titleOf(), 'h3', 'ct-ttlh')}</div>`;
  const byRow = () => X.res ? byNote(X.by) : '';

  const VIEW = {};
  /* 교안 */
  const fmtName = { hand: '강의 교안', work: '실습 워크시트', slide: '슬라이드 요약' };
  VIEW.doc = () => ({ now: X.res ? '미리보기의 글자를 눌러 바로 고치고, 다 되면 아래 버튼을 누르세요.' : '주제를 확인하고 [교안 만들기]를 누르세요.',
    set: setHead('교안 주제', '엑셀 함수로 매출 합계 구하기') + chips('fmt', [['hand', '교안'], ['work', '실습지'], ['slide', '슬라이드 요약']], '모양', '바로 바뀝니다') + makeBtn('교안 만들기') + (X.res ? `<div class="ct-tools">${sec(`${svg('down', 18)} 내려받기`, 'ct-doc-dl')}${sec(`${svg('print', 18)} 인쇄 · PDF`, 'ct-doc-print')}</div>` : ''),
    pv: X.res && !X.busy ? byRow() + a4(X.res) : pvEmpty('교안을 만들고 있습니다…'), foot: mkFoot('교안 만들기') });
  function a4(D) {
    const f = X.fmt; return `<article class="ct-a4" aria-label="교안 미리보기"><header><small>${E(S.org.name)}${courseName(X.ctx) ? ' · ' + E(courseName(X.ctx)) : ''} · ${fmtName[f]}</small>${ce('@title', docTitle(), 'h1')}</header>
      <section class="ct-a4box"><b>학습 목표</b><ul>${D.goals.map((g, i) => `<li>${ce(`goals.${i}`, g)}${xdel(`goals.${i}`, '목표')}</li>`).join('')}</ul>${xadd('goals', '목표 추가')}</section>
      ${D.secs.map((s, i) => `<div class="ct-blk"><h2>${i + 1}. ${ce(`secs.${i}.h`, s.h)}${xdel(`secs.${i}`, `${i + 1}절`)}</h2>${f === 'slide' ? '' : ce(`secs.${i}.body`, s.body, 'p', 'ml')}<ul>${(s.pts || []).map((p, j) => `<li>${ce(`secs.${i}.pts.${j}`, p)}</li>`).join('')}</ul>${f === 'work' ? '<div class="ct-ln"></div><div class="ct-ln"></div>' : ''}</div>`).join('')}
      ${xadd('secs', '+ 절 추가', 'sec')}
      <h2>실습 활동</h2>${ce('act', D.act, 'p', 'ml')}<h2>확인 문제</h2><ol>${D.check.map((q, i) => `<li>${ce(`check.${i}`, q)}${xdel(`check.${i}`, '문제')}${f === 'work' ? '<div class="ct-ln"></div>' : ''}</li>`).join('')}</ol>${xadd('check', '확인 문제 추가')}<footer>AI 초안을 바탕으로 담당자가 검토한 자료입니다 · ${E(today())}</footer></article>`;
  }
  const xdel = (p, what) => `<button type="button" class="ct-x" data-act="ct-x-del" data-p="${E(p)}" aria-label="${E(what)} 빼기" title="빼기">${svg('x', 14)}</button>`;
  const xadd = (p, lab, t) => `<button type="button" class="ct-xadd" data-act="ct-x-add" data-p="${E(p)}" ${t ? `data-t="${t}"` : ''}>${E(lab.startsWith('+') ? lab : '+ ' + lab)}</button>`;
  const docTitle = () => { if (X.ttl && X.kind === 'doc') return X.ttl; const st = sessTitle(X.ctx); return `${X.topic || st || '강의'} ${X.fmt === 'work' ? '실습지' : '교안'}`.replace(/\s+/g, ' ').trim(); };
  const docItem = () => ({ title: docTitle(), topic: X.topic, fmt: X.fmt, doc: X.res });

  /* 퀴즈 · 시험 문항(같은 편집 모양) */
  const qRows = (L, o) => `<ol class="ct-qs">${L.map((q, k) => `<li id="ctq${k}"><div class="ct-q"><span class="ct-qn">${k + 1}</span><div class="ct-qt">${ce(`${k}.q`, strip(q.q), 'p', 'ml')}<small class="ct-qty">${E({ mc: '객관식', ox: 'OX', short: '단답', essay: '서술' }[q.t] || '')}</small></div><button type="button" class="ct-icb sm" data-act="ct-x-del" data-p="${k}" aria-label="${k + 1}번 문제 빼기" ${L.length <= 1 ? 'disabled' : ''}>${svg('trash', 18)}</button></div>
      ${q.t === 'mc' ? `<ul class="ct-op">${(q.opts || []).map((op, j) => `<li class="${String(q.a) === String(j) ? 'a' : ''}"><button type="button" class="ct-ansb" data-act="ct-x-ans" data-k="${k}" data-v="${j}" aria-pressed="${String(q.a) === String(j)}" aria-label="${j + 1}번 보기를 정답으로">${String(q.a) === String(j) ? svg('check', 14) : ''}</button>${ce(`${k}.opts.${j}`, op)}</li>`).join('')}</ul>`
        : q.t === 'ox' ? `<div class="ct-oxr">정답 ${['O', 'X'].map(v => `<button type="button" class="ct-chip sm ${q.a === v ? 'on' : ''}" data-act="ct-x-ans" data-k="${k}" data-v="${v}" aria-pressed="${q.a === v}">${v}</button>`).join('')}</div>`
        : `<p class="ct-ansr">${q.t === 'essay' ? '채점 기준' : '정답'}: ${ce(`${k}.a`, q.a || '', 'b')}</p>`}
      <p class="ct-mini">해설: ${ce(`${k}.exp`, q.exp || '', 'span', '', '해설을 적으려면 누르세요')}</p></li>`).join('')}</ol>${o && o.add === false ? '' : `<div class="ct-row">${[['mc', '객관식'], ['ox', 'OX'], ['short', '단답']].map(([t, l]) => `<button type="button" class="ct-xadd" data-act="ct-x-add" data-p="" data-t="q-${t}">+ ${l} 문제</button>`).join('')}</div>`}`;
  VIEW.quiz = () => ({ now: X.res ? '문제 · 보기 · 해설 글자를 눌러 바로 고치세요. 동그라미를 누르면 정답이 바뀝니다.' : '주제를 확인하고 [퀴즈 만들기]를 누르세요.',
    set: setHead('퀴즈 주제', '엑셀 SUM · AVERAGE 함수') + chips('n', [[3, '3문제'], [5, '5문제'], [10, '10문제']], '문제 수', '바로 바뀝니다') + chips('lv', [['쉬움', '쉬움'], ['보통', '보통'], ['어려움', '어려움']], '난이도') + makeBtn('퀴즈 만들기') + (X.res && typeof W.qsEdit === 'function' ? `<div class="ct-tools">${sec('자세히 고치기(배점 · 이미지)', 'ct-q-edit')}</div>` : ''),
    pv: X.res && !X.busy ? byRow() + ttlRow() + qRows(X.res) : pvEmpty('문제를 만들고 있습니다…'), foot: mkFoot('퀴즈 만들기') });
  const qItem = () => { const Q = X.res.map((q, i) => ({ ...q, q: `${i + 1}. ${strip(q.q)}` })); const per = Math.floor(100 / Q.length); Q.forEach((q, i) => q.pts = per + (i < 100 - per * Q.length ? 1 : 0)); return { title: titleOf(), qs: Q, time: 10, retake: 3 }; };

  /* 시험: 시험 종류 · 출제 문항 수 · 문제 은행 배수 · 랜덤 출제 · 시험 시간 · 재응시 · 통과 점수 */
  const need = () => Math.min(60, Math.max(1, +X.en || 10) * (X.rand ? Math.max(1, +X.mult || 1) : 1));
  const seeded = (n, seed) => { const o = Array.from({ length: n }, (_, i) => i); let z = seed || 7; for (let i = n - 1; i > 0; i--) { z = (z * 9301 + 49297) % 233280; const j = Math.floor(z / 233280 * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
  VIEW.exam = () => { const P = X.res || []; const n = Math.min(+X.en || 10, P.length || +X.en || 10);
    const sum = `<div class="ct-exs"><b>${E(exName(X.ek))}</b><span>${n}문항 출제</span><span>${X.rand ? `문제 은행 ${P.length || need()}문항에서 랜덤` : '모두 같은 순서'}</span><span>${X.time}분</span><span>${X.retake ? `재응시 ${X.retake}회` : '재응시 없음'}</span><span>${X.passOn ? `통과 ${X.pass}점` : '통과 점수 없음'}</span></div>`;
    const tabs = `<div class="ct-chips one" role="tablist" aria-label="미리보기 종류">${[['bank', `문제 은행 ${P.length}문항(고치기)`], ['paper', '학습자 시험지 예시']].map(([v, l]) => `<button type="button" role="tab" aria-selected="${X.pvx === v}" class="ct-chip ${X.pvx === v ? 'on' : ''}" data-act="ct-pvx" data-v="${v}">${E(l)}</button>`).join('')}</div>`;
    const paper = () => { const ord = X.rand ? seeded(P.length, (X.seed || 7)).slice(0, n) : P.map((_, i) => i).slice(0, n); return `<div class="ct-paper"><div class="ct-ptop"><b>${E(titleOf())}</b><span class="ct-timer">남은 시간 ${X.time}:00</span></div><p class="ct-mini">학습자마다 문제 은행에서 ${n}문항을 랜덤으로 뽑아 순서를 섞어 보여 줍니다. 아래는 한 학습자의 예시입니다.</p>${X.rand ? sec('다른 학습자 예시 보기', 'ct-x-seed') : ''}<ol class="ct-qs ro">${ord.map((k, i) => { const q = P[k]; return `<li><div class="ct-q"><span class="ct-qn">${i + 1}</span><p class="ct-qt">${E(strip(q.q))}</p></div>${q.t === 'mc' ? `<ul class="ct-op">${(q.opts || []).map(o => `<li><i class="ct-rad"></i>${E(o)}</li>`).join('')}</ul>` : q.t === 'ox' ? '<div class="ct-oxr"><span class="ct-chip sm">O</span><span class="ct-chip sm">X</span></div>' : '<div class="ct-ansbox">답을 쓰는 칸</div>'}</li>`; }).join('')}</ol></div>`; };
    return { now: X.res ? (X.pvx === 'bank' ? '문제 · 보기 · 정답을 눌러 바로 고치세요. 왼쪽 설정은 바로 반영됩니다.' : '학습자에게 보이는 시험지입니다. 고치려면 [문제 은행]을 누르세요.') : '시험 종류와 문항 수를 고르고 [문제 은행 만들기]를 누르세요.',
      set: setHead('시험 범위 · 주제', '엑셀 함수와 피벗 테이블') + chips('ek', EXK, '시험 종류') + chips('en', [[5, '5문항'], [10, '10문항'], [20, '20문항']], '출제 문항 수', '학습자 한 명이 푸는 수') +
        `<div class="ct-f"><span class="ct-l">랜덤 출제</span><button type="button" class="ct-sw ${X.rand ? 'on' : ''}" role="switch" aria-checked="${X.rand}" data-act="ct-tog" data-k="rand"><i></i>${X.rand ? '켜짐 — 문제 은행에서 학습자마다 다르게 뽑습니다' : '꺼짐 — 모두 같은 문제를 같은 순서로'}</button></div>` +
        (X.rand ? chips('mult', [[2, '2배수'], [3, '3배수'], [5, '5배수']], '문제 은행 크기', `${+X.en || 10}문항 × 배수 = ${need()}문항 · 최대 60`) : '') +
        `<div class="ct-two"><label class="ct-f"><span class="ct-l">시험 시간(분)</span><input type="number" id="ctTime" data-ctset="time" min="5" max="600" step="5" value="${E(X.time)}" inputmode="numeric"></label><label class="ct-f"><span class="ct-l">재응시 횟수</span><select id="ctRetake" data-ctset="retake">${[0, 1, 2, 3, 5].map(v => `<option value="${v}" ${+X.retake === v ? 'selected' : ''}>${v ? v + '회' : '재응시 없음'}</option>`).join('')}</select></label></div>` +
        `<div class="ct-f"><span class="ct-l">통과 점수</span><div class="ct-chips" role="radiogroup" aria-label="통과 점수">${[[0, '정하지 않음'], [60, '60점'], [70, '70점'], [80, '80점']].map(([v, l]) => { const on = v ? X.passOn && +X.pass === v : !X.passOn; return `<button type="button" role="radio" aria-checked="${on}" class="ct-chip ${on ? 'on' : ''}" data-act="ct-pass" data-v="${v}">${l}</button>`; }).join('')}</div><p class="ct-ex">통과 점수는 수료 기준(이수 기준)에도 쓰입니다.</p></div>` +
        chips('lv', [['쉬움', '쉬움'], ['보통', '보통'], ['어려움', '어려움']], '난이도') + makeBtn('문제 은행 만들기'),
      pv: X.res && !X.busy ? byRow() + ttlRow() + sum + tabs + (X.pvx === 'paper' ? paper() : qRows(P)) : X.busy ? busyBox(`문제 은행 ${need()}문항을 만들고 있습니다…`) : sum + pvEmpty(''), foot: mkFoot('문제 은행 만들기') }; };
  const exItem = () => { const P = X.res.map((q, i) => ({ ...q, q: `${i + 1}. ${strip(q.q)}` })); const per = Math.floor(100 / P.length); P.forEach((q, i) => q.pts = per + (i < 100 - per * P.length ? 1 : 0));
    const n = Math.min(+X.en || 10, P.length); const R = +X.retake || 0;
    return { title: titleOf(), ek: X.ek, qs: P, time: +X.time || 60, retake: R, pool: { n, mult: X.rand ? +X.mult || 1 : 1 }, rules: { from: '', to: '', retry: R > 0 ? { mode: 'count', v: R + 1 } : { mode: 'none', v: 2 }, pass: { on: !!X.passOn, v: +X.pass || 60 }, show: 'after', shuffle: !!X.rand, draw: X.rand && n < P.length ? n : 0 } }; };
  const nq = q => strip(q.q).replace(/\s+/g, '');
  /* 규칙 문제 은행: 주제 문항(AI.questions) + 교안 요점에서 객관식 · OX · 단답을 만들어 겹치지 않게 모은다 */
  function examBank(tp, cnt, lv, have) {
    const out = []; const seen = new Set((have || []).map(nq)); const push = q => { const k = nq(q); if (!k || seen.has(k)) return false; seen.add(k); out.push({ ...q, lv }); return true; };
    try { AI.questions(tp, Math.min(cnt, 10), lv, ['mc', 'ox', 'mc', 'short', 'mc', 'ox']).forEach(push); } catch (e) { }
    const secs = []; [tp, `${tp} 활용`].forEach(t => { try { AI.material(t).secs.forEach(s => { if (!secs.some(x => x.h === s.h)) secs.push(s); }); } catch (e) { } });
    const all = secs.flatMap(s => (s.pts || []).map(p => ({ h: s.h, p }))); const MC = [], OX = [], SH = [];
    secs.forEach((s, si) => (s.pts || []).forEach((p, pi) => { const others = all.filter(x => x.h !== s.h).map(x => x.p).filter(x => x !== p); if (others.length >= 3) { const d = [0, 1, 2].map(k => others[(si * 3 + pi * 5 + k * 7) % others.length]); const opts = [...new Set([p, ...d])].slice(0, 4); if (opts.length === 4) { const rot = (si + pi) % 4; const o2 = opts.slice(rot).concat(opts.slice(0, rot)); MC.push({ t: 'mc', q: `「${s.h}」에 해당하는 설명으로 가장 알맞은 것은?`, opts: o2, a: String(o2.indexOf(p)), exp: `「${s.h}」의 요점: ${p}` }); } }
      OX.push({ t: 'ox', q: `「${s.h}」의 요점이다: ${p}`, a: 'O', exp: `${p} — 「${s.h}」에서 다룬 내용입니다.` }); if (others.length) { const w2 = others[(si + pi * 3) % others.length]; OX.push({ t: 'ox', q: `「${s.h}」의 요점이다: ${w2}`, a: 'X', exp: `이 문장은 다른 내용(「${(all.find(x => x.p === w2) || {}).h || ''}」)의 요점입니다.` }); } }));
    secs.forEach(s => SH.push({ t: 'short', q: `「${s.h}」에서 꼭 기억할 점을 한 가지 쓰시오.`, a: (s.pts || []).join(', '), exp: `요점: ${(s.pts || []).join(' · ')}` }));
    const L = [MC, OX, MC, SH, MC, OX]; let guard = 0; while (out.length < cnt && guard++ < 400) { const A2 = L[guard % L.length]; if (!A2.length) { if (!MC.length && !OX.length && !SH.length) break; continue; } push(A2.shift()); }
    let k = 0; while (out.length < cnt && k < secs.length * 2) { const s = secs[k % secs.length]; push({ t: 'essay', q: `${jo(`「${s.h}」`, '을')} ${k < secs.length ? '실제 사례에 적용하는 방법을 서술하시오.' : '지키지 않았을 때 생길 수 있는 문제를 서술하시오.'}`, a: '루브릭 기준으로 채점', exp: '적용 대상 · 방법 · 기대 효과가 드러나야 합니다.' }); k++; }
    return out.slice(0, cnt);
  }

  /* 설문 */
  function svDraft(tp, n, mix) {
    const T = tp ? `「${tp}」` : `이 ${t('cls')}`; const S1 = (q, opts, extra) => ({ id: nid('sq'), q, t: 'single', opts, req: true, etc: false, max: 0, ...(extra || {}) });
    const scale = [`${T}에 전반적으로 만족하십니까?`, `${T}의 내용이 학습 목표를 이루는 데 도움이 되었습니까?`, '강사의 설명은 이해하기 쉬웠습니까?', `${T}의 자료 · 영상 품질은 적절했습니까?`, '학습 분량과 기간은 적절했습니까?', '배운 내용을 실제로 활용할 수 있다고 생각하십니까?', `${jo(T, '을')} 다른 사람에게 추천하시겠습니까?`].map(q => S1(q, [...A5L], { scale: true }));
    const single = [S1(`${T}에서 가장 도움이 된 부분은 무엇입니까?`, ['강의 영상', '강의 자료', '실습 · 과제', '퀴즈 · 시험']), { ...S1('도움이 된 학습 방법을 모두 고르세요.', ['혼자 영상 보기', '자료 읽기', '직접 실습하기', '질문 · 토론'], { t: 'multi', etc: true }) }, S1('학습에 주로 쓴 기기는 무엇입니까?', ['컴퓨터', '휴대폰', '태블릿']), S1('다음에 듣고 싶은 내용의 수준은 무엇입니까?', ['기초', '중급', '심화'])];
    const text = [`${T}에서 좋았던 점을 자유롭게 적어 주세요.`, '고쳤으면 하는 점이나 바라는 점을 적어 주세요.', '더 배우고 싶은 주제가 있다면 적어 주세요.', '가장 기억에 남는 내용은 무엇입니까?', '공부하면서 어려웠던 점을 적어 주세요.', '강사에게 하고 싶은 말을 적어 주세요.'].map(q => ({ id: nid('sq'), q, t: 'text', opts: [], req: false, etc: false, max: 0 }));
    const pat = ['scale', 'scale', 'single', 'scale', 'scale', 'single', 'scale', 'single', 'scale', 'single'].filter(k => mix[k]); const src = { scale, single, text }; const out = []; const on = Object.keys(mix).filter(k => mix[k]); if (!on.length) return [];
    const tn = mix.text ? Math.max(1, Math.round(n / 5)) : 0; const body = n - tn; let i = 0; const pool = pat.length ? pat : on.filter(k => k !== 'text');
    while (out.length < body && i < 40) { const k = pool[i % Math.max(1, pool.length)]; const L = src[k] || []; if (L.length) out.push(L.shift()); else if (!on.some(x => x !== 'text' && (src[x] || []).length)) break; i++; }
    for (let j = 0; j < tn && text.length; j++) out.push(text.shift()); while (out.length < n && text.length && mix.text) out.push(text.shift());
    return out.slice(0, n);
  }
  const svRow = (q, k, L) => { const kd = svKind(q); return `<li class="ct-svq"><div class="ct-q"><span class="ct-qn">${k + 1}</span><div class="ct-qt">${ce(`${k}.q`, q.q, 'p', 'ml')}</div><button type="button" class="ct-icb sm" data-act="ct-x-del" data-p="${k}" aria-label="${k + 1}번 문항 빼기" ${L.length <= 1 ? 'disabled' : ''}>${svg('trash', 18)}</button></div>
    <div class="ct-svm"><label class="ct-svsel"><span class="ct-vh">문항 유형</span><select data-svt="${k}" aria-label="${k + 1}번 문항 유형">${SVT.map(([v, l]) => `<option value="${v}" ${kd === v ? 'selected' : ''}>${E(l)}</option>`).join('')}</select></label><button type="button" class="ct-chip sm ${q.req ? 'on' : ''}" data-act="ct-x-req" data-k="${k}" aria-pressed="${!!q.req}">${q.req ? '꼭 답하기' : '답하지 않아도 됨'}</button></div>
    ${kd === 'text' ? '<div class="ct-ansbox">학습자가 자유롭게 쓰는 칸</div>' : kd === 'scale' ? `<div class="ct-scale">${q.opts.map((o, j) => `<span><i>${5 - j}</i>${ce(`${k}.opts.${j}`, o)}</span>`).join('')}</div>` : `<ul class="ct-op">${q.opts.map((o, j) => `<li><i class="${kd === 'multi' ? 'ct-box' : 'ct-rad'}"></i>${ce(`${k}.opts.${j}`, o)}${q.opts.length > 2 ? xdel(`${k}.opts.${j}`, '항목') : ''}</li>`).join('')}${q.etc ? '<li class="ct-mini"><i class="ct-rad"></i>기타(직접 입력)</li>' : ''}</ul>${xadd(`${k}.opts`, '항목 추가')}`}</li>`; };
  VIEW.survey = () => ({ now: X.res ? '문항 글자를 눌러 바로 고치고, 문항 유형은 각 문항의 고르기 칸에서 바꾸세요.' : '설문 주제를 확인하고 [설문 초안 만들기]를 누르세요.',
    set: setHead('설문 주제', '엑셀 실무 과정 만족도') + chips('sn', [[4, '4문항'], [6, '6문항'], [8, '8문항'], [10, '10문항']], '문항 수') +
      `<div class="ct-f"><span class="ct-l">넣을 문항 유형</span><div class="ct-chips">${[['single', '객관식'], ['scale', '척도(5점)'], ['text', '주관식']].map(([k, l]) => `<button type="button" class="ct-chip ${X.mix[k] ? 'on' : ''}" aria-pressed="${!!X.mix[k]}" data-act="ct-mix" data-v="${k}">${E(l)}</button>`).join('')}</div></div>` + makeBtn('설문 초안 만들기'),
    pv: X.res && !X.busy ? byRow() + ttlRow() + `<p class="ct-mini">학습자에게 이렇게 보여요. 응답은 [평가] › 설문 통계에서 봅니다.</p><ol class="ct-qs ct-sv">${X.res.map((q, k) => svRow(q, k, X.res)).join('')}</ol><div class="ct-row">${[['single', '객관식'], ['scale', '척도'], ['text', '주관식']].map(([t2, l]) => `<button type="button" class="ct-xadd" data-act="ct-x-add" data-p="" data-t="s-${t2}">+ ${l} 문항</button>`).join('')}</div>` : pvEmpty('설문 문항을 만들고 있습니다…'), foot: mkFoot('설문 초안 만들기') });
  const svItem = () => ({ title: titleOf(), qs: X.res.map(q => { const o = { id: q.id || nid('sq'), q: String(q.q || '').trim(), t: q.t === 'multi' ? 'multi' : q.t === 'text' ? 'text' : 'single', opts: q.t === 'text' ? [] : (q.opts || []).map(x => String(x).trim()).filter(Boolean), req: !!q.req, etc: !!q.etc, max: 0 }; if (q.scale) o.scale = true; return o; }).filter(q => q.q), mins: Math.max(2, Math.round(X.res.length / 2)), doneMsg: '설문에 참여해 주셔서 감사합니다. 더 나은 수업으로 보답하겠습니다.', rules: { from: '', to: '' } });

  /* 과제 */
  VIEW.assign = () => { const A2 = X.res; return { now: A2 ? '안내 글 · 제출물 · 채점 기준을 눌러 바로 고치세요.' : '주제를 확인하고 [과제 만들기]를 누르세요.',
    set: setHead('과제 주제', '우리 회사 매출표를 피벗으로 정리하기') + (A2 ? `<label class="ct-f"><span class="ct-l">제출 기한(공개 후 며칠)</span><select id="ctDue" data-ctset="due">${[3, 5, 7, 10, 14, 21].map(v => `<option value="${v}" ${+A2.due === v ? 'selected' : ''}>${v}일</option>`).join('')}</select></label>` : '') + makeBtn('과제 만들기'),
    pv: A2 && !X.busy ? byRow() + `<article class="ct-asg">${ttlRow()}<p class="ct-due">공개 후 ${E(A2.due)}일 안에 제출</p><h4>과제 안내</h4>${ce('desc', A2.desc, 'div', 'ml pre')}<h4>제출물</h4>${ce('deliv', A2.deliv, 'p')}<h4>채점 기준</h4><table class="ct-rbt"><thead><tr><th>기준</th><th>배점</th><th>잘한 경우</th></tr></thead><tbody>${A2.rb.criteria.map((c, i) => `<tr><td>${ce(`rb.criteria.${i}.n`, c.n)}</td><td>${ce(`rb.criteria.${i}.pts`, c.pts)}점</td><td>${ce(`rb.criteria.${i}.lv.0`, c.lv[0])}</td></tr>`).join('')}</tbody></table><div class="ct-ansbox">학습자 제출 칸(글 · 파일)</div></article>` : pvEmpty('과제를 만들고 있습니다…'), foot: mkFoot('과제 만들기') }; };
  const aItem = () => ({ title: titleOf(), desc: X.res.desc, deliv: X.res.deliv, due: +X.res.due || 7 });

  /* 디지털북: 실시간 책 화면(BKW) — 더블클릭 바로 고치기 · 섹션 추가 · 한 줄 지시 */
  const BKWx = () => W.BKW || null;
  VIEW.book = () => { const b = X.res; const bw = BKWx();
    return { now: b ? '책 화면에서 글자를 두 번 눌러 고치고, [+ 섹션 추가]로 필요한 부분을 넣으세요. 한 줄 지시로도 고칠 수 있습니다.' : '주제를 확인하고 [디지털북 만들기]를 누르세요.', hint: b ? '두 번 누르면 바로 고칩니다 · 섹션 사이 [+]로 추가' : '',
      set: setHead('디지털북 주제', '생성형 AI로 보고서 쓰기') + chips('units', [[2, '2단원'], [3, '3단원'], [4, '4단원']], '분량') + makeBtn('디지털북 만들기') + (b && bw ? bw.cmdBox('ct') : ''),
      pv: b && !X.busy ? byRow() + (bw ? bw.html(b, { all: true, edit: true }) : '') : pvEmpty('디지털북을 만들고 있습니다…'), foot: mkFoot('디지털북 만들기'),
      after: el => { const box = el.querySelector('.bkw'); if (box && bw) bw.bind(box, b, { onChange: () => { X.dirty = true; draw(); } }); } }; };

  /* AI 강의 영상: 템플릿 · 목소리 · 번역 언어 · 아바타 선생님 + 큰 화면 미리보기 + 대본 바로 고치기 */
  const LANGx = () => (typeof LANGS !== 'undefined' ? LANGS : [['ko', '한국어'], ['en', 'English']]);
  const lName = l => { try { return langName(l); } catch (e) { return l; } };
  const VTx = () => (typeof VTPL !== 'undefined' ? VTPL : [['slide', '슬라이드 강의형', '']]); const VAx = () => (typeof VAV !== 'undefined' ? VAV : [['none', '넣지 않음']]);
  const capScenes = () => (X.slang !== 'ko' && X.tr[X.slang]) || X.res; const sayScenes = () => (X.vlang !== 'ko' && X.tr[X.vlang]) || X.res;
  VIEW.aivideo = () => { const sc = X.res || []; const vs = typeof vidVoices === 'function' ? vidVoices(X.vlang) : []; const vsg = vs.filter(v => !v.g || v.g === X.vg);
    const tot = sc.reduce((a, s) => a + (typeof secsFor === 'function' ? secsFor(s.say) : 6), 0);
    const trNote = l => X.trBusy === l ? `<p class="ct-mini" role="status">${E(lName(l))}로 번역하고 있습니다…</p>` : X.trMiss && X.trMiss === l ? `<p class="ct-err" role="status">이 브라우저는 번역 기능이 없어 ${E(lName(l))} 번역을 만들지 못했습니다. 지금은 한국어로 보입니다. 운영 서버의 번역(또는 Chrome 최신 버전)에서 다시 시도하세요.</p>` : '';
    const set = setHead('영상 주제', 'AI에게 일을 잘 시키는 세 가지 방법') + chips('mins', [[3, '3분'], [5, '5분'], [10, '10분']], '길이') +
      `<div class="ct-f"><span class="ct-l">영상 모양 <small class="ct-sub">바로 바뀝니다</small></span><div class="ct-tpls" role="radiogroup" aria-label="영상 모양">${VTx().map(([k, n, d]) => `<button type="button" role="radio" aria-checked="${X.tpl === k}" class="ct-tpl ${X.tpl === k ? 'on' : ''}" data-act="ct-opt" data-k="tpl" data-v="${k}"><canvas width="320" height="180" data-tplc="${k}" aria-hidden="true"></canvas><b>${E(n)}</b><small>${E(d)}</small></button>`).join('')}</div></div>` +
      `<div class="ct-f"><span class="ct-l">아바타 선생님</span><div class="ct-avs" role="radiogroup" aria-label="아바타 선생님">${VAx().map(([k, n]) => `<button type="button" role="radio" aria-checked="${X.avatar === k}" class="ct-av ${X.avatar === k ? 'on' : ''}" data-act="ct-opt" data-k="avatar" data-v="${k}">${k === 'none' ? `<span class="ct-avn">${svg('x', 22)}</span>` : `<canvas width="120" height="120" data-avc="${k}" aria-hidden="true"></canvas>`}<small>${E(n)}</small></button>`).join('')}</div><p class="ct-ex">말할 때 입이 움직입니다.</p></div>` +
      `<div class="ct-f"><span class="ct-l">목소리</span>${chips('vg', [['f', '여성'], ['m', '남성']], '성별').replace('<div class="ct-f"><span class="ct-l">성별</span>', '<div class="ct-f ct-in">')}<label class="ct-f ct-in"><span class="ct-vh">목소리 고르기</span><select id="ctVname" data-ctset="vname" aria-label="목소리 고르기"><option value="">자동으로 고르기${vs.length ? '' : ' (이 브라우저 목소리 없음)'}</option>${vsg.map(v => `<option value="${E(v.name)}" ${X.vname === v.name ? 'selected' : ''}>${E(v.name.replace(/^(Microsoft|Google)\s*/, ''))}${v.local ? '' : ' · 온라인'}</option>`).join('')}</select></label>${chips('rate', [[0.85, '천천히'], [1, '보통'], [1.2, '빠르게']], '속도').replace('<div class="ct-f"><span class="ct-l">속도</span>', '<div class="ct-f ct-in">')}<button type="button" class="ct-btn sm" data-act="ct-v-try">${svg('play', 16)} 목소리 들어 보기</button><p class="ct-ex">목소리는 이 컴퓨터 · 휴대폰에 설치된 브라우저 목소리 ${vs.length}개 중에서 고릅니다.</p></div>` +
      `<div class="ct-f"><span class="ct-l">언어(번역)</span><div class="ct-two"><label class="ct-f"><span class="ct-vh">자막 · 화면 글</span><select id="ctSlang" data-ctset="slang">${LANGx().map(([k, n]) => `<option value="${k}" ${X.slang === k ? 'selected' : ''}>${E(n)}</option>`).join('')}</select></label><label class="ct-f"><span class="ct-vh">읽어 주는 음성</span><select id="ctVlang" data-ctset="vlang">${LANGx().map(([k, n]) => `<option value="${k}" ${X.vlang === k ? 'selected' : ''}>${E(n)}</option>`).join('')}</select></label></div>${trNote(X.slang)}${X.slang !== X.vlang ? trNote(X.vlang) : ''}</div>` + makeBtn('AI 강의 영상 만들기');
    const k0 = Math.min(X.scene || 0, Math.max(0, sc.length - 1));
    const pv = sc.length && !X.busy ? `${byNote(X.by)}<div class="ct-note"><b>미리보기 품질</b> 브라우저 목소리로 읽어 주는 슬라이드 영상입니다. 사람 목소리에 가까운 음성과 MP4 파일은 운영 서버 연결 후 제공됩니다.</div>${ttlRow()}<div class="ct-player"><canvas id="ctCv" width="1280" height="720" aria-label="AI 강의 장면 미리보기"></canvas><button type="button" class="ct-playb" data-act="ct-v-play" aria-label="소리와 함께 재생">${svg('play', 34)}</button></div>
      <div class="ct-tools">${sec(`${svg('play', 18)} 소리와 함께 재생`, 'ct-v-play')}${sec(`${svg('down', 18)} 영상 파일로 저장(WebM)`, 'ct-v-rec')}<span class="ct-mini">${sc.length}장면 · 약 ${Math.max(1, Math.round(tot / 60))}분</span></div><div class="ct-thumbs" id="ctThumbs"></div>
      <h4 class="ct-h4">대본 — 글자를 눌러 바로 고치세요</h4><ol class="ct-scn">${sc.map((s, k) => `<li class="${k === k0 ? 'on' : ''}"><div class="ct-sh2"><b>${k + 1}</b>${ce(`${k}.h`, s.h, 'span', 'ct-scnh')}<button type="button" class="ct-icb sm" data-act="ct-x-del" data-p="${k}" aria-label="${k + 1}장면 빼기" ${sc.length <= 2 ? 'disabled' : ''}>${svg('trash', 18)}</button></div><p class="ct-mini">화면 글: ${(s.pts || []).map((p, j) => ce(`${k}.pts.${j}`, p)).join(' · ')}</p><p class="ct-say"><span class="ct-vh">읽어 줄 말 </span>${ce(`${k}.say`, s.say, 'span', 'ml')}</p></li>`).join('')}</ol>${xadd('', '장면 추가', 'scene')}` : X.busy ? busyBox('대본을 쓰고 슬라이드를 그리고 있습니다…') : pvEmpty('');
    return { now: sc.length ? '영상 모양 · 아바타 · 목소리를 고르면 미리보기가 바로 바뀝니다. 대본 글자는 눌러서 고치세요.' : '주제를 확인하고 [AI 강의 영상 만들기]를 누르세요.', set, pv, foot: mkFoot('AI 강의 영상 만들기'),
      after: el => { paintOpts(el); if (sc.length && !X.busy) { thumbs(el, true); drawBig(k0); } } }; };
  const vOpt = (mouth) => ({ tpl: X.tpl, avatar: X.avatar, mouth: mouth || 0 });
  const vTitle = () => `${X.topic || sessTitle(X.ctx) || '강의'}`.trim();
  function paintOpts(el) { const demo = { h: '핵심 개념', pts: ['정의 한 문장', '구성 요소 세 가지'], say: '' };
    el.querySelectorAll('canvas[data-tplc]').forEach(c => { try { const g = c.getContext('2d'); g.setTransform(320 / 1280, 0, 0, 180 / 720, 0, 0); drawSlide(g, (X.res && X.res[1]) || demo, 1, 6, vTitle(), '', 0.3, { tpl: c.dataset.tplc, avatar: X.avatar }); } catch (e) { } });
    el.querySelectorAll('canvas[data-avc]').forEach(c => { try { const g = c.getContext('2d'); g.clearRect(0, 0, 120, 120); g.fillStyle = '#EAEDFF'; g.beginPath(); g.arc(60, 60, 58, 0, 7); g.fill(); drawAvatar(g, 10, 14, 100, 112, c.dataset.avc, 0.2); } catch (e) { } }); }
  function slideTo(cv, i, mouth) { const g = cv.getContext('2d'); const C2 = capScenes(); const s = C2[i] || X.res[i]; try { drawSlide(g, s, i, X.res.length, vTitle(), sentences(s.say)[0] || '', (i + 1) / X.res.length, vOpt(mouth)); } catch (e) { } }
  function drawBig(i) { X.scene = i; const cv = $1('#ctCv'); if (cv) slideTo(cv, i, 0.35); document.querySelectorAll('#ctThumbs button').forEach((b, k) => b.classList.toggle('on', k === i)); document.querySelectorAll('.ct-scn>li').forEach((b, k) => b.classList.toggle('on', k === i)); }
  function thumbs(el, clickable) { const box = $1('#ctThumbs', el); if (!box) return; box.innerHTML = X.res.map((s, k) => `<button type="button" ${clickable ? `data-act="ct-v-show" data-v="${k}"` : 'tabindex="-1"'} aria-label="${k + 1}장면 ${E(s.h)}"><canvas width="1280" height="720"></canvas><small>${k + 1}. ${E(s.h)}</small></button>`).join(''); box.querySelectorAll('canvas').forEach((c, k) => slideTo(c, k)); }
  const vItem = () => { const tr = {}; [X.slang, X.vlang].forEach(l => { if (l !== 'ko' && X.tr[l]) tr[l] = X.tr[l]; }); return { title: titleOf(), topic: X.topic, ai: { scenes: X.res, mins: +X.mins || 5, voice: X.vg, style: X.tpl, tpl: X.tpl, avatar: X.avatar, rate: +X.rate || 1, vname: X.vname, vlang: X.vlang, slang: X.slang, tr } }; };
  async function trScenes(lang) { if (!X || lang === 'ko' || !X.res) return X && X.res; if (X.tr[lang]) return X.tr[lang]; const src = X.res.map(s => ({ h: s.h, pts: s.pts || [], say: s.say })); const keep = X;
    if (claudeOn()) try { const j = await claudeJSON(`다음 강의 장면 JSON 배열을 ${lName(lang)}(${lang})로 번역해 같은 모양의 JSON 배열 하나만 출력하세요: ${JSON.stringify(src)}`, 4000); if (Array.isArray(j) && j.length === src.length) { const out = j.map((s, i) => ({ h: String(s.h || src[i].h), pts: (s.pts || []).map(String).slice(0, 5), say: String(s.say || src[i].say) })); keep.tr[lang] = out; return out; } } catch (e) { }
    if (typeof trText === 'function') { try { const out = []; for (const s of src) { const h = await trText(s.h, lang); if (!h) return null; const pts = []; for (const p of s.pts) { const r = await trText(p, lang); if (!r) return null; pts.push(r.t); } const say = await trText(s.say, lang); if (!say) return null; out.push({ h: h.t, pts, say: say.t }); } keep.tr[lang] = out; return out; } catch (e) { return null; } }
    return null; }
  async function langPick(key, lang) { if (!X) return; X[key] = lang; if (lang === 'ko' || !X.res || X.tr[lang]) { if (X.trMiss === lang) X.trMiss = ''; draw(); return; } X.trBusy = lang; draw(); const r = await trScenes(lang); if (!X) return; X.trBusy = ''; X.trMiss = r ? '' : lang; draw(); }
  try { if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', () => { if (X && X.kind === 'aivideo' && !document.querySelector('#ctSheet .ct-ce[contenteditable]')) draw(); }); } catch (e) { }

  /* 미리보기에서 바로 고치기: 경로(예: secs.1.body · 3.opts.2 · @title)로 X.res를 고친다 */
  const pathGet = (o, p) => p.split('.').filter(x => x !== '').reduce((a, k) => a == null ? a : a[k], o);
  const pathSet = (o, p, v) => { const k = p.split('.').filter(x => x !== ''); const last = k.pop(); const t2 = k.reduce((a, x) => a == null ? a : a[x], o); if (t2 == null) return false; t2[last] = typeof t2[last] === 'number' ? (Number.isFinite(+v) ? +v : t2[last]) : v; return true; };
  function ceStart(el) { if (!X || el.isContentEditable) return; el.dataset.orig = el.innerText; try { el.contentEditable = 'plaintext-only'; } catch (e) { el.contentEditable = 'true'; } if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true'; el.classList.add('on'); el.focus();
    try { const r = document.createRange(); r.selectNodeContents(el); const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(r); } catch (e) { } }
  function ceEnd(el, cancel) { if (!el.isContentEditable) return; el.contentEditable = 'false'; el.removeAttribute('contenteditable'); el.classList.remove('on'); if (!X) return; const p = el.dataset.ce; const v = String(el.innerText || '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (cancel) { el.innerText = el.dataset.orig || ''; return; } if (v === String(el.dataset.orig || '').trim()) return;
    if (p === '@title') { X.ttl = v.slice(0, 80); } else if (X.res) { if (!v && /\.(q|h)$/.test(p)) { el.innerText = el.dataset.orig || ''; say('비워 둘 수 없는 칸입니다.', 'warn'); return; } pathSet(X.res, p, v); }
    X.dirty = true; if (X.kind === 'aivideo') { X.tr = {}; const k = +p.split('.')[0]; if (Number.isFinite(k)) { const b = $1(`#ctThumbs button:nth-child(${k + 1}) canvas`); if (b) slideTo(b, k); drawBig(k); } } }
  document.addEventListener('click', e => { const el = e.target && e.target.closest && e.target.closest('#ctSheet .ct-ce'); if (el && !el.isContentEditable) ceStart(el); });
  document.addEventListener('keydown', e => { const el = e.target; if (!el || !el.classList || !el.classList.contains('ct-ce') || !el.closest('#ctSheet')) return;
    if (!el.isContentEditable) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ceStart(el); } return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ceEnd(el, true); el.focus(); return; }
    if (e.key === 'Enter' && !e.isComposing && (!el.classList.contains('ml') || !e.shiftKey && !el.classList.contains('pre'))) { if (!el.classList.contains('ml') || !e.shiftKey) { e.preventDefault(); el.blur(); } } }, true);
  document.addEventListener('focusout', e => { const el = e.target; if (el && el.classList && el.classList.contains('ct-ce') && el.isContentEditable) ceEnd(el); });
  /* 문항 · 절 · 장면 추가 기본값 */
  const NEWX = { sec: () => ({ h: '새 절 제목', body: '내용을 누르고 고쳐 쓰세요.', pts: ['요점 하나'] }), 'q-mc': () => ({ t: 'mc', q: '새 문제를 누르고 고쳐 쓰세요.', opts: ['보기 1', '보기 2', '보기 3', '보기 4'], a: '0', exp: '' }), 'q-ox': () => ({ t: 'ox', q: '새 OX 문장을 누르고 고쳐 쓰세요.', a: 'O', exp: '' }), 'q-short': () => ({ t: 'short', q: '새 단답 문제를 누르고 고쳐 쓰세요.', a: '정답', exp: '' }),
    's-single': () => ({ id: nid('sq'), q: '새 질문을 누르고 고쳐 쓰세요.', t: 'single', opts: ['항목 1', '항목 2', '항목 3'], req: true, etc: false, max: 0 }), 's-scale': () => ({ id: nid('sq'), q: '새 척도 질문을 누르고 고쳐 쓰세요.', t: 'single', opts: [...A5L], req: true, scale: true, etc: false, max: 0 }), 's-text': () => ({ id: nid('sq'), q: '자유롭게 적어 주세요.', t: 'text', opts: [], req: false, etc: false, max: 0 }),
    scene: () => ({ h: '새 장면', pts: ['요점 하나', '요점 둘'], say: '읽어 줄 말을 누르고 고쳐 쓰세요.' }) };

  /* YouTube */
  VIEW.youtube = () => {
    const id = typeof ytId === 'function' ? ytId(X.url || '') : ''; X.step = id ? 1 : 0; const q = X.topic || sessTitle(X.ctx) || courseName(X.ctx);
    const key = !!(S.settings && S.settings.yt && S.settings.yt.key);
    return { now: id ? '영상이 맞는지 확인하고 넣으세요.' : 'YouTube에서 영상 주소를 복사해 아래 칸에 붙여 넣으세요.', body: `<label class="ct-f"><span class="ct-l">YouTube 주소</span><input id="ctUrl" value="${E(X.url || '')}" inputmode="url" autocomplete="off" aria-describedby="ctUrlEx"></label><p class="ct-ex" id="ctUrlEx">예: https://youtu.be/abcdEFGhijk · 영상 아래 [공유] → [복사]로 얻습니다.</p>${X.url && !id ? '<p class="ct-err" role="alert">YouTube 주소 형식이 아닙니다. 주소 전체를 붙여 넣었는지 확인하세요.</p>' : ''}
      <div class="ct-row">${key ? sec(`${svg('spark', 18)} 「${E(q.slice(0, 20))}」 영상 찾아 주기`, 'ct-yt-find') : `<a class="ct-btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}">YouTube에서 「${E(q.slice(0, 20))}」 찾기</a>`}</div>
      ${(X.cands || []).length ? `<div class="ct-ytc">${X.cands.map(v => `<button type="button" class="${id === v.id ? 'on' : ''}" data-act="ct-yt-pick" data-v="${E(v.id)}"><img alt="" src="https://i.ytimg.com/vi/${E(v.id)}/mqdefault.jpg"><b>${E(v.title)}</b><small>${E(v.ch || '')}</small></button>`).join('')}</div>` : ''}
      ${id ? `<div class="ct-ytp"><img alt="선택한 영상 미리보기" src="https://i.ytimg.com/vi/${E(id)}/hqdefault.jpg"><span>${svg('youtube', 22)} ${E((X.yt && X.yt.title) || '선택한 YouTube 영상')}</span></div><p class="ct-mini">저작권 · 이용 조건은 운영 기관이 확인합니다.</p>` : ''}`, foot: foot(pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done', !id)) };
  };
  const ytItem = () => { const id = ytId(X.url); return { title: (X.yt && X.yt.title) || `${sessTitle(X.ctx) || X.topic || 'YouTube'} 영상`, url: 'https://youtu.be/' + id, yt: X.yt || { id, title: '' }, q: X.topic }; };

  /* 올리기 */
  VIEW.upload = () => {
    const f = X.file; const upOn = !!upFn();
    if (!f) return { now: '올릴 파일을 고르세요. 휴대폰 사진첩 · 컴퓨터 폴더에서 고를 수 있습니다.', body: `<label class="ct-drop" id="ctDrop">${svg('upload', 40)}<b>파일 고르기</b><span>또는 이곳에 끌어다 놓기</span><input type="file" id="ctFile" accept="${accept()}"></label><p class="ct-ex">올릴 수 있는 파일: 영상(MP4 · WebM) · 음성(MP3 · M4A) · PDF · PPT · 한글 · 워드 · 사진</p><p class="ct-mini">파일 하나에 ${E(limText())} 올릴 수 있습니다.</p>`, foot: '', after: el => { const d = $1('#ctDrop', el); ['dragover', 'dragenter'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.add('over'); })); d.addEventListener('dragleave', () => d.classList.remove('over')); d.addEventListener('drop', e => { e.preventDefault(); d.classList.remove('over'); const x = e.dataTransfer.files[0]; if (x) takeFile(x); }); } };
    const u0 = BLOBS[f.bid]; const k = f.k; const srcA = u0 ? `src="${u0}"` : `data-hpm-src="${E(f.url || '')}"`;
    const pv = k === 'video' ? `<video controls preload="metadata" ${srcA} class="ct-media"></video>` : k === 'audio' ? `<audio controls ${srcA} class="ct-media"></audio>` : k === 'image' ? `<img ${srcA} alt="올린 사진 미리보기" class="ct-media">` : k === 'pdf' ? `<iframe ${srcA} title="PDF 미리보기" class="ct-pdf"></iframe>` : `<div class="ct-filec">${svg('doc', 40)}<b>${E(f.name)}</b><span>이 형식은 화면 미리보기가 없습니다. 학습자는 내려받아 봅니다.</span></div>`;
    return { now: '제목을 확인하고 넣으세요.', body: `<label class="ct-f"><span class="ct-l">제목</span><input id="ctUpT" value="${E(X.upTitle)}" maxlength="80"></label><p class="ct-ex">예: ${E(unit() === '주차' ? '3주차 강의 영상' : '1차시 강의 영상')}</p>${pv}<p class="ct-mini">${E(f.name)} · ${E(mb(f.size))}${f.dur ? ` · ${Math.floor(f.dur / 60)}분 ${f.dur % 60}초` : ''}</p>${X.upErr ? `<p class="ct-err" role="alert">${E(X.upErr)}</p>` : ''}${upOn ? (f.url ? '' : '<p class="ct-mini">[넣기]를 누르면 파일을 저장합니다.</p>') : '<div class="ct-note"><b>데모</b> 지금은 파일 이름과 크기만 저장하고, 미리보기는 이 창에서만 보입니다. 서버에 연결하면 파일이 실제로 저장됩니다.</div>'}<div class="ct-row">${sec('다른 파일 고르기', 'ct-up-again')}</div>`, foot: X.view ? foot(pri('닫기', 'ct-close')) : foot(X.busy ? `<span class="ct-busy sm" role="status"><span class="ct-spin" aria-hidden="true"></span>올리는 중 <b id="ctUpP">0%</b></span>` : pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done')), after: el => { try { HPMx() && HPM.hydrate && HPM.hydrate(el); } catch (e) { } } };
  };
  function takeFile(f) {
    const k = FKIND(f); if (HPMx() && typeof HPM.check === 'function') { try { const c = HPM.check(f); if (c && c.ok === false) { say(c.msg || '올릴 수 없는 파일입니다.', 'warn'); return; } } catch (e) { } } else if (f.size > LIMIT[k]) { say(`${f.name}: ${k === 'video' ? '영상은' : k === 'audio' ? '음성은' : '파일은'} ${mb(LIMIT[k]).replace('.0GB', 'GB')}까지 올릴 수 있습니다.`, 'warn'); return; }
    const bid = nid('b'); try { BLOBS[bid] = URL.createObjectURL(f); } catch (e) { }
    X.file = { name: String(f.name).slice(0, 120), size: f.size, mime: f.type || '', k, bid, raw: f }; X.step = 1; X.upErr = '';
    X.upTitle = sessTitle(X.ctx) && !/^\d+\s*(차시|주차|주)$/.test(sessTitle(X.ctx)) ? `${sessTitle(X.ctx)} ${k === 'video' ? '영상' : k === 'audio' ? '음성' : '자료'}` : String(f.name).replace(/\.[^.]+$/, '').slice(0, 60);
    if (k === 'video') try { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { if (X && X.file && X.file.bid === bid && Number.isFinite(v.duration)) { if (v.duration > 7200) { X.upErr = '영상은 2시간까지 올릴 수 있습니다.'; } X.file.dur = Math.round(v.duration); draw(); } }; v.src = BLOBS[bid]; } catch (e) { }
    draw();
  }
  async function upItem() {
    const f = X.file; const fn = upFn(); let meta = {};
    if (fn) { X.busy = true; draw(); try { meta = (await fn(f.raw, { kind: f.k, course: X.ctx.course && X.ctx.course.id, onProgress: p => { const b = $1('#ctUpP'); if (b) b.textContent = Math.round(p * 100) + '%'; } })) || {}; } catch (e) { X.busy = false; X.upErr = `올리지 못했습니다: ${e.message || e}`; draw(); return null; } X.busy = false; }
    return upMake(f, meta, X.upTitle);
  }
  /* 올린 파일(f: {name,size,mime,k,dur,bid}) + 저장 결과(meta) → 과정 항목. 영상 · 자료 S.lib에도 기록(하나 올리기 · 여러 개 올리기 공용) */
  function upMake(f, meta, title) {
    meta = meta || {}; const name = meta.name || f.name; const url = meta.url || (meta.fileId ? 'media:' + meta.fileId : 'upload:' + name);
    const isV = f.k === 'video' || f.k === 'audio';
    const lib = { id: nid('l'), name: name.slice(0, 80), kind: f.k === 'video' ? '동영상' : f.k === 'audio' ? '음성' : f.k === 'image' ? '사진' : '문서', size: mb(f.size), bytes: f.size, used: 0, cls: [], at: today(), views: 0, drop: 0, conv: isV ? '대기' : '', fileId: meta.fileId || '', url: meta.url || '' };
    if (f.dur) lib.dur = f.dur; if (Array.isArray(S.lib)) S.lib.unshift(lib);
    return { type: f.k === 'audio' ? 'audio' : isV ? 'video' : 'doc', src: 'upload', title: title || name, file: name.slice(0, 80), url, fileId: meta.fileId || '', mime: f.mime, size: f.size, lib: lib.id, dur: f.dur || 0, prev: f.bid };
  }

  /* 라이브러리에서 */
  const libAll = () => {
    const out = []; try { if (typeof CLIB === 'object' && typeof CLIB.all === 'function') { (CLIB.all() || []).forEach(r => out.push(normLib(r))); return out.filter(Boolean); } } catch (e) { }
    clibL().forEach(r => out.push({ id: 'c:' + r.id, rec: r, kind: r.kind, title: r.title, sub: '라이브러리 콘텐츠', at: r.at }));
    (S.lib || []).forEach(l => out.push({ id: 'l:' + l.id, asset: l, kind: l.kind === '동영상' ? 'upload' : l.kind === 'YouTube' ? 'youtube' : 'upload', title: l.name, sub: `${l.kind}${l.size ? ' · ' + l.size : ''}`, at: l.at }));
    S.classes.forEach(c => (c.curriculum || []).forEach(it => { if (['chapter', 'live', 'offline', 'survey'].includes(it.type)) return; if (X && X.ctx.course && X.ctx.course.id === c.id) return; out.push({ id: 'i:' + c.id + ':' + it.id, item: it, kind: TYPE_KIND(it), title: it.title, sub: `${c.name}에서 사용 중`, at: '' }); }));
    return out;
  };
  const normLib = r => { if (!r) return null; if (r.type && r.week != null && !r.kind) return { id: 'i:' + r.id, item: r, kind: TYPE_KIND(r), title: r.title, sub: '' }; return { id: 'c:' + r.id, rec: r, kind: r.kind || TYPE_KIND(r), title: r.title || r.name, sub: (r.usedIn || []).length ? `${r.usedIn.length}곳에서 사용 중` : '라이브러리 콘텐츠' }; };
  const LF = [['all', '전체'], ['video', '영상 · 음성'], ['doc', '교안 · 자료'], ['quiz', '퀴즈 · 시험 · 설문 · 과제'], ['book', '디지털북']];
  const lfOk = (f, k, x) => (f === 'video' && x && ((x.item || x.rec || {}).type === 'audio')) || f === 'all' || (f === 'video' && ['aivideo', 'youtube', 'upload'].includes(k)) || (f === 'doc' && ['doc', 'upload'].includes(k)) || (f === 'quiz' && ['quiz', 'exam', 'survey', 'assign'].includes(k)) || (f === 'book' && k === 'book');
  VIEW.lib = () => {
    const L = libAll(); const f = X.lf || 'all'; const q = (X.lq || '').trim(); const R = L.filter(x => lfOk(f, x.kind, x) && (!q || String(x.title).includes(q))).slice(0, 80);
    if (!L.length) return { now: '', body: `<div class="ct-empty">${svg('lib', 40)}<b>아직 라이브러리에 콘텐츠가 없습니다</b><span>여기서 바로 만들어 넣을 수 있습니다.</span><div class="ct-row">${sec('교안 만들기', 'ct-switch', 'data-v="doc"')}${sec('AI 강의 영상 만들기', 'ct-switch', 'data-v="aivideo"')}</div></div>`, foot: '' };
    X.step = X.pick ? 1 : 0;
    return { now: '넣을 콘텐츠를 하나 고르세요.', body: `<div class="ct-chips one" role="tablist" aria-label="종류">${LF.map(([k, l]) => `<button type="button" role="tab" aria-selected="${f === k}" class="ct-chip ${f === k ? 'on' : ''}" data-act="ct-lf" data-v="${k}">${E(l)}</button>`).join('')}</div><label class="ct-f ct-srch"><span class="ct-l">찾기</span><input id="ctLq" value="${E(X.lq || '')}" autocomplete="off"></label><ul class="ct-ll" role="listbox" aria-label="라이브러리 콘텐츠">${R.map(x => `<li><button type="button" role="option" aria-selected="${X.pick === x.id}" class="${X.pick === x.id ? 'on' : ''}" data-act="ct-lpick" data-v="${E(x.id)}"><span class="ct-kic k-${E(x.kind)}">${svg(KN[x.kind] ? x.kind : 'doc', 20)}</span><span class="ct-lt"><b>${E(x.title)}</b><small>${E([x.asset ? '' : TYPE_LABEL(x.item || recToItem(x.rec) || {}), x.sub].filter(Boolean).join(' · '))}</small></span>${X.pick === x.id ? svg('check', 20) : ''}</button></li>`).join('') || '<li class="ct-mini">찾는 콘텐츠가 없습니다.</li>'}</ul>`, foot: foot(pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done', !X.pick)) };
  };
  function libItem() {
    const x = libAll().find(y => y.id === X.pick); if (!x) return null;
    if (x.item) { const it = JSON.parse(JSON.stringify(x.item)); delete it.id; delete it.week; return it; }
    if (x.rec) { const it = recToItem(x.rec); it.clib = x.rec.id; X.fromRec = x.rec; return it; }
    if (x.asset) { const l = x.asset; if (l.kind === 'YouTube' && l.url) return { type: 'video', src: 'youtube', title: l.name, url: l.url }; return { type: l.kind === '동영상' ? 'video' : l.kind === '음성' ? 'audio' : 'doc', src: 'library', title: l.name, lib: l.id, url: 'lib:' + l.id }; }
    return null;
  }

  /* 저장 완료(라이브러리 단독) */
  function vDone() { const r = X.done; const cls = t('cls'); const none = !S.classes.some(c => c.kind !== 'pack');
    if (none) return { now: '', body: `<div class="ct-ok">${svg('check', 40)}<b>${E(jo(`「${r.title}」`, '을'))} 라이브러리에 저장했습니다</b><span>${E(jo(cls, '을'))} 먼저 만들면 이 콘텐츠를 ${unit()}에 넣을 수 있습니다.</span></div>`, foot: foot(pri(`${E(cls)} 만들기`, 'ct-new-course'), sec('닫기', 'ct-close')) };
    return { now: '', body: `<div class="ct-ok">${svg('check', 40)}<b>${E(jo(`「${r.title}」`, '을'))} 라이브러리에 저장했습니다</b><span>${E(cls)}의 ${unit()}에 넣으면 ${E(t('learner'))}에게 보입니다. 지금 넣지 않아도 라이브러리에서 언제든 넣을 수 있습니다.</span></div>`, foot: foot(pri(`${E(cls)}에 넣기`, 'ct-to-course'), sec('닫기', 'ct-close')) }; }

  /* ── 결과 → 과정 항목 · 라이브러리 레코드 ── */
  async function buildItem() {
    const k = X.kind; let it = null;
    if (k === 'doc') it = { type: 'doc', ...docItem() };
    if (k === 'aivideo') it = { type: 'video', src: 'ai', ...vItem() };
    if (k === 'quiz') it = { type: 'quiz', ...qItem() };
    if (k === 'exam') it = { type: 'exam', ...exItem() };
    if (k === 'survey') { it = { type: 'survey', ...svItem() }; if (!it.qs.length) { say('설문 문항을 하나 이상 넣으세요.', 'warn'); return null; } }
    if (k === 'assign') it = { type: 'assign', ...aItem(), _rb: X.res.rb };
    if (k === 'book') { const b = X.res; if (X.ttl) b.title = X.ttl; if (X.bookRef) { try { const ex = bkOf(X.bookRef); if (ex) { Object.assign(ex, clone(b), { id: ex.id }); try { bkNorm(ex); } catch (e) { } it = { type: 'doc', src: 'book', title: ex.title, topic: X.topic, book: ex.id, doc: AI.material(X.topic || ex.title, { name: courseName(X.ctx) }) }; } } catch (e) { } }
      if (!it) it = { type: 'doc', src: 'book', title: b.title, topic: X.topic, doc: AI.material(X.topic || b.title, { name: courseName(X.ctx) }), _book: b }; }
    if (k === 'youtube') it = { type: 'video', src: 'youtube', ...ytItem() };
    if (k === 'upload') it = await upItem();
    if (k === 'lib') it = libItem();
    if (!it) return null; it.id = nid('it'); if (it.type === 'video' && it.src === 'ai') it.url = 'ai:' + it.id; return it;
  }
  /* 실제 과정(S.classes)에 넣을 때 마무리: 루브릭 · 디지털북 · 라이브러리 사용처 */
  function settle(it, c) {
    if (it._rb) { if (!Array.isArray(S.rubrics)) S.rubrics = []; if (!(c && c.id)) it._rb.crsDraft = 1; S.rubrics.push(it._rb); it.rubric = it._rb.id; delete it._rb; }
    if (it._book) { try { lsEnsure(); const b = it._book; if (c && c.id) b.cls = c.id; else b.crsDraft = 1; bkL().push(b); it.book = b.id; } catch (e) { } delete it._book; }
    if (c && c.id && it.lib && Array.isArray(S.lib)) { const l = S.lib.find(x => x.id === it.lib); if (l) { l.cls = [...new Set([...(l.cls || []), c.id])]; l.used = l.cls.length; } }
    if (c && c.id && X && X.fromRec) { const r = X.fromRec; r.usedIn = [...new Set([...(r.usedIn || []), c.id])]; }
    delete it.prev; return it;
  }
  function itemToRec(it) {
    const r = { id: nid('cl'), kind: TYPE_KIND(it), type: it.type, title: it.title, src: it.src || '', at: today(), usedIn: [] };
    ['url', 'fileId', 'file', 'mime', 'size', 'dur', 'topic', 'fmt', 'desc', 'deliv', 'due', 'time', 'retake', 'yt', 'q', 'lib', 'book', 'ek', 'pool', 'rules', 'mins', 'doneMsg'].forEach(k => { if (it[k] != null && it[k] !== '') r[k] = it[k]; });
    if (it.ai) r.ai = it.ai; if (it.doc) r.doc = it.doc; if (it.qs) r.qs = it.qs; if (it._rb) r.rb = it._rb; if (it._book) r.bookObj = it._book; return r;
  }
  function recToItem(r) {
    if (!r) return null; const it = { type: r.type || (/^audio/.test(r.mime || '') ? 'audio' : null) || ({ aivideo: 'video', youtube: 'video', upload: 'video', doc: 'doc', book: 'doc', quiz: 'quiz', exam: 'exam', survey: 'survey', assign: 'assign' }[r.kind] || 'doc'), title: r.title || '콘텐츠' };
    ['src', 'url', 'fileId', 'file', 'mime', 'size', 'dur', 'topic', 'fmt', 'desc', 'deliv', 'due', 'time', 'retake', 'yt', 'q', 'lib', 'book', 'ek', 'pool', 'rules', 'mins', 'doneMsg'].forEach(k => { if (r[k] != null && r[k] !== '') it[k] = JSON.parse(JSON.stringify(r[k])); });
    if (r.ai) it.ai = JSON.parse(JSON.stringify(r.ai)); if (r.doc) it.doc = JSON.parse(JSON.stringify(r.doc)); if (r.qs) it.qs = JSON.parse(JSON.stringify(r.qs));
    if (r.kind === 'book' && !it.src) it.src = 'book'; if (r.kind === 'upload' && !it.src) it.src = 'upload'; if (r.kind === 'aivideo' && !it.src) it.src = 'ai';
    if (r.rb && !it.rubric) { const ex = (S.rubrics || []).find(x => x.id === r.rb.id); if (ex) it.rubric = ex.id; else it._rb = JSON.parse(JSON.stringify(r.rb)); }
    if (r.bookObj && !r.book) it._book = JSON.parse(JSON.stringify(r.bookObj));
    return it;
  }

  /* [이 차시에 넣기] */
  async function done() {
    if (!X || X.busy) return; const ctx = X.ctx; const it = await buildItem(); if (!it) return;
    if (ctx.week != null) it.week = +ctx.week || ctx.week;
    if (ctx.from === 'lib' && !ctx.course) { /* 단독 콘텐츠 */
      const r = itemToRec(it); delete r.bookObj; if (it._book) { try { lsEnsure(); bkL().push(it._book); r.book = it._book.id; } catch (e) { } } if (it._rb) { if (!Array.isArray(S.rubrics)) S.rubrics = []; S.rubrics.push(it._rb); r.rb = it._rb; }
      let added = null; try { if (typeof CLIB === 'object' && typeof CLIB.add === 'function') added = CLIB.add(r); } catch (e) { } if (!added) clibL().unshift(r);
      const fin = (added && added.id) ? added : r;
      try { logAudit(`콘텐츠 라이브러리 추가 — ${r.title}`); } catch (e) { } keep(); X.done = fin; X.fromRec = fin;
      try { ctx.onDone && ctx.onDone(fin); } catch (e) { }
      if (ctx.stay === false) { close(); return; } draw(); return;
    }
    if (typeof ctx.onDone === 'function') { /* 흐름(초안) 또는 호출한 쪽이 넣는다 */
      const c = ctx.course && S.classes.includes(ctx.course) ? ctx.course : null; if (c) settle(it, c);
      try { if (S.ai) S.ai.usage = (S.ai.usage || 0) + (['doc', 'aivideo', 'quiz', 'exam', 'survey', 'assign', 'book'].includes(X.kind) ? 1 : 0); } catch (e) { }
      const k = X.kind; close(); ctx.onDone(it, k); keep(); return;
    }
    const c = ctx.course && (S.classes.includes(ctx.course) ? ctx.course : (typeof C === 'function' ? C(ctx.course.id || ctx.course) : null));
    if (!c) { say(`넣을 ${jo(t('cls'), '을')} 찾지 못했습니다.`, 'warn'); return; }
    settle(it, c); c.curriculum = c.curriculum || [];
    if (ctx.item) { const i = c.curriculum.findIndex(x => x.id === ctx.item.id); if (i >= 0) { it.id = ctx.item.id; it.week = ctx.item.week; c.curriculum[i] = it; } else c.curriculum.push(it); } else c.curriculum.push(it);
    try { logAudit(`${c.name} 콘텐츠 추가 — ${it.title}`); } catch (e) { } keep(); close(); say(`${jo(`「${it.title}」`, '을')} 넣었습니다.`, 'ok'); try { render(); } catch (e) { }
  }

  const newCourse = () => { setTimeout(() => { try { if (W.CF && typeof CF.open === 'function') CF.open({ from: 'lib' }); else if (ACT['cls-new']) ACT['cls-new'](); } catch (e) { } }, 0); };
  /* [과정에 넣기] — 라이브러리 레코드를 과정 · 차시에 */
  function toCourse(rec, opt) {
    rec = rec || (X && X.done); if (!rec || !S) return; opt = opt || {}; injectCSS();
    const L = S.classes.filter(c => c.kind !== 'pack'); close(true); const st = { cid: (L[0] || {}).id || '', w: 0 };
    const w = document.createElement('div'); w.className = 'ct-wrap'; w.id = 'ctSheet';
    const body = () => { const c = L.find(x => x.id === st.cid); const WP = c ? (c.weekPlan || []) : []; return `<div class="ct-sh" role="dialog" aria-modal="true" aria-label="${E(t('cls'))}에 넣기"><div class="ct-hd"><span class="ct-icb" aria-hidden="true"></span><div class="ct-ht"><b>${E(t('cls'))}에 넣기</b><small>「${E(rec.title)}」</small></div><button type="button" class="ct-icb" data-ctc="x" aria-label="닫기">${svg('x', 22)}</button></div><p class="ct-now"><b>지금 할 일</b> 넣을 ${E(jo(t('cls'), '과'))} ${E(jo(unit(), '을'))} 고르세요.</p><div class="ct-bd">${L.length ? `<div class="ct-f"><span class="ct-l">${E(t('cls'))}</span><ul class="ct-ll">${L.map(x => `<li><button type="button" data-ctc="c" data-v="${E(x.id)}" class="${st.cid === x.id ? 'on' : ''}" aria-pressed="${st.cid === x.id}"><span class="ct-lt"><b>${E(x.name)}</b><small>${(x.curriculum || []).length}개 콘텐츠</small></span>${st.cid === x.id ? svg('check', 20) : ''}</button></li>`).join('')}</ul></div>${WP.length ? `<div class="ct-f"><span class="ct-l">${unit()}</span><div class="ct-chips">${WP.map(p => `<button type="button" class="ct-chip ${st.w === p.w ? 'on' : ''}" data-ctc="w" data-v="${p.w}" aria-pressed="${st.w === p.w}">${p.w}${unit() === '주차' ? '주' : ''} · ${E(String(p.title).slice(0, 14))}</button>`).join('')}</div><p class="ct-ex">고르지 않으면 맨 뒤에 넣습니다. 나중에 옮길 수 있습니다.</p></div>` : ''}` : `<div class="ct-empty"><b>아직 ${E(jo(t('cls'), '이'))} 없습니다</b><span>${E(jo(t('cls'), '을'))} 먼저 만들면 넣을 수 있습니다.</span></div>`}</div><div class="ct-ft"><div class="ct-fl"><button type="button" class="ct-btn" data-ctc="x">나중에</button></div>${L.length ? `<button type="button" class="ct-btn ct-pri" data-ctc="ok" ${st.cid ? '' : 'disabled'}>${svg('check', 18)} 넣기</button>` : `<button type="button" class="ct-btn ct-pri" data-ctc="new">${E(t('cls'))} 만들기</button>`}</div></div>`; };
    w.innerHTML = body(); document.body.appendChild(w);
    w.addEventListener('click', e => { const b = e.target.closest('[data-ctc]'); if (e.target === w) { w.remove(); return; } if (!b) return; const a = b.dataset.ctc;
      if (a === 'x') { w.remove(); X = null; return; } if (a === 'new') { w.remove(); X = null; newCourse(); return; } if (a === 'c') { st.cid = b.dataset.v; st.w = 0; } if (a === 'w') st.w = st.w === +b.dataset.v ? 0 : +b.dataset.v;
      if (a === 'ok') { const c = L.find(x => x.id === st.cid); if (!c) return; const it = recToItem(rec); it.clib = rec.id; it.id = nid('it'); if (it.type === 'video' && it.src === 'ai') it.url = 'ai:' + it.id; if (st.w) it.week = st.w; X = X || { ctx: {} }; X.fromRec = rec; settle(it, c); rec.usedIn = [...new Set([...(rec.usedIn || []), c.id])]; if (rec.book) { try { const bk = bkOf(rec.book); if (bk && !bk.cls) bk.cls = c.id; } catch (er) { } }
        c.curriculum = c.curriculum || []; c.curriculum.push(it); try { logAudit(`${c.name} 콘텐츠 추가(라이브러리) — ${it.title}`); } catch (er) { } keep(); w.remove(); X = null; say(`「${c.name}」에 넣었습니다.`, 'ok'); try { opt.onDone && opt.onDone(it, c); } catch (er) { } try { render(); } catch (er) { } return; }
      w.innerHTML = body(); });
  }

  /* ── 버튼 동작 ── */
  const A = {
    'ct-close': () => close(), 'ct-back': () => { if (!X) return; if (MK.has(X.kind)) return; else if (X.kind === 'upload' && X.step === 1) { X.file = null; X.step = 0; } else if (X.kind === 'lib') X.pick = ''; else if (X.kind === 'youtube') X.url = ''; else X.step = Math.max(0, X.step - 1); X.edit = false; draw(); },
    'ct-aifill': () => { const st = sessTitle(X.ctx), cn = courseName(X.ctx); const g = /^\d+\s*(차시|주차|주|회차)$/.test(st); const ok = v => { v = topicOf(v || ''); return v && v !== '핵심 개념' ? v : ''; };
      const ex = (document.querySelector('#ctSheet .ct-ex') || {}).textContent || ''; const exT = ex.replace(/^예:\s*/, '').trim();
      X.topic = ok(cn && st && !g && !st.includes(cn) ? `${cn} ${st}` : '') || ok(!g ? st : '') || ok(cn) || ok((X.topic || '').trim()) || ok(((X.ctx.course && X.ctx.course.topic) || '')) || ok(cl((S.classes.find(c => c.status !== '종료') || S.classes[0] || {}).name)) || exT || X.topic; draw(); say('주제를 채웠습니다. 그대로 두거나 고쳐 쓰세요.', 'ok'); },
    'ct-opt': el => { const k = el.dataset.k; const v = isNaN(+el.dataset.v) ? el.dataset.v : +el.dataset.v; if (X[k] === v) return; X[k] = v; optChanged(k); },
    'ct-tog': el => { const k = el.dataset.k; X[k] = !X[k]; optChanged(k); },
    'ct-pass': el => { const v = +el.dataset.v; X.passOn = v > 0; if (v) X.pass = v; draw(); },
    'ct-mix': el => { const k = el.dataset.v; const n = Object.keys(X.mix).filter(x => X.mix[x]).length; if (X.mix[k] && n <= 1) { say('문항 유형은 하나 이상 골라야 합니다.', 'warn'); return; } X.mix[k] = X.mix[k] ? 0 : 1; optChanged('mix'); },
    'ct-pvx': el => { X.pvx = el.dataset.v; draw(); }, 'ct-x-seed': () => { X.seed = (X.seed || 7) + 13; draw(); },
    'ct-x-del': el => { if (!X || !X.res) return; const p = el.dataset.p; const k = p.split('.').filter(x => x !== ''); const i = +k.pop(); const arr = k.length ? pathGet(X.res, k.join('.')) : X.res; if (!Array.isArray(arr) || arr.length <= 1) return; arr.splice(i, 1); X.dirty = true; if (X.kind === 'aivideo') { X.tr = {}; X.scene = Math.max(0, Math.min(X.scene, X.res.length - 1)); } draw(); },
    'ct-x-add': el => { if (!X || !X.res) return; const p = el.dataset.p || ''; const arr = p ? pathGet(X.res, p) : X.res; if (!Array.isArray(arr)) return; const tp = el.dataset.t; const v = tp && NEWX[tp] ? NEWX[tp]() : (/opts$/.test(p) ? `항목 ${arr.length + 1}` : p === 'goals' ? '새 학습 목표' : p === 'check' ? '새 확인 문제' : '새 항목'); arr.push(v); X.dirty = true; if (X.kind === 'aivideo') { X.tr = {}; X.scene = X.res.length - 1; } draw(); setTimeout(() => { const L = [...document.querySelectorAll(`#ctPv [data-ce^="${p ? p + '.' : ''}${arr.length - 1}"]`)]; const t2 = L[0]; if (t2) { t2.scrollIntoView({ block: 'center' }); ceStart(t2); } }, 30); },
    'ct-x-ans': el => { const q = X && X.res && X.res[+el.dataset.k]; if (!q) return; q.a = q.t === 'ox' ? el.dataset.v : String(el.dataset.v); X.dirty = true; draw(); },
    'ct-x-req': el => { const q = X && X.res && X.res[+el.dataset.k]; if (!q) return; q.req = !q.req; X.dirty = true; draw(); },
    'ct-v-try': () => { try { const s0 = (sayScenes() || [])[X.scene || 0]; const txt = (s0 && sentences(s0.say)[0]) || (X.vlang === 'ko' ? '안녕하세요. 오늘 함께 공부할 내용을 소개합니다.' : 'Hello. Let me introduce what we will learn today.'); const u = vidSpeak(txt, { lang: X.vlang, voice: X.vg, vname: X.vname, rate: X.rate }); if (!u) { say('이 브라우저는 목소리 읽기를 지원하지 않습니다.', 'warn'); return; } speechSynthesis.cancel(); const cv = $1('#ctCv'); let tk = 0; if (cv && X.avatar !== 'none') { tk = setInterval(() => { if (!X || !$1('#ctCv')) return clearInterval(tk); slideTo($1('#ctCv'), X.scene || 0, 0.15 + 0.85 * Math.abs(Math.sin(performance.now() / 95))); }, 90); } u.onend = u.onerror = () => { clearInterval(tk); if (X && $1('#ctCv')) slideTo($1('#ctCv'), X.scene || 0, 0); }; speechSynthesis.speak(u); } catch (e) { say('이 브라우저는 목소리 읽기를 지원하지 않습니다.', 'warn'); } },
    'ct-make': async () => { if (!X || X.busy) return; const tp = (X.topic || '').trim() || seedTopic(X.ctx); if (!tp) { const n = $1('#ctTopic'); if (n) { n.setAttribute('aria-invalid', 'true'); n.focus(); } say('주제를 한 줄 적어 주세요. 예처럼 짧게 써도 됩니다.', 'warn'); return; } X.topic = tp; X.busy = true; X.edit = false; X.step = MK.has(X.kind) ? 0 : 1; const keep = X; draw();
      const r = await GEN[X.kind](tp, { mins: +X.mins || 5, n: X.kind === 'survey' ? +X.sn || 6 : +X.n || 5, lv: X.lv, need: need(), mix: X.mix, cname: courseName(X.ctx), target: (X.ctx.target || ''), ...(X.kind === 'book' ? { n: +X.units || 3 } : {}) }); if (X !== keep) return; X.res = r.v; X.by = r.by; X.busy = false; X.dirty = false; X.tr = {}; X.scene = 0; X.trMiss = ''; X.step = 1;
      if (X.kind === 'aivideo') { X.step = 2; [X.slang, X.vlang].filter(l => l !== 'ko').forEach(l => langPick(l === X.slang ? 'slang' : 'vlang', l)); } draw(); },
    'ct-done': () => done(),
    'ct-doc-edit': () => { X.edit = !X.edit; draw(); },
    'ct-doc-dl': () => { const it = { ...docItem(), title: docTitle() }; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([materialHTML(it, courseName(X.ctx))], { type: 'text/html' })); a.download = `${it.title.replace(/[\\/:*?"<>|]/g, '_')}.html`; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 15000); say('교안을 내려받았습니다. 파일을 열어 [인쇄] → [PDF로 저장]할 수 있습니다.', 'ok'); },
    'ct-doc-print': () => { const it = { ...docItem(), title: docTitle() }; const u = URL.createObjectURL(new Blob([materialHTML(it, courseName(X.ctx))], { type: 'text/html' })); const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; f.src = u; document.body.appendChild(f); f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(u, '_blank', 'noopener'); } setTimeout(() => { f.remove(); URL.revokeObjectURL(u); }, 60000); }; },
    'ct-v-show': el => drawBig(+el.dataset.v),
    'ct-v-play': () => { try { aiPlayer(titleOf(), X.res, X.vg, null, { tpl: X.tpl, avatar: X.avatar, rate: X.rate, vname: X.vname, vlang: X.slang !== 'ko' && X.tr[X.slang] ? X.slang : X.vlang, capScenes: capScenes(), sayScenes: sayScenes() }); } catch (e) { say('이 브라우저에서는 재생할 수 없습니다.', 'warn'); } },
    'ct-v-rec': () => { try { aiRecord(titleOf(), X.res, null, { tpl: X.tpl, avatar: X.avatar, capScenes: capScenes() }); } catch (e) { say('이 브라우저에서는 영상 파일을 만들 수 없습니다. Chrome · Edge에서 시도하세요.', 'warn'); } },
    /* 문항 고치기: build.js qsEdit(z65, CT 창 위) — 고친 문항으로 다시 그림 */
    'ct-q-edit': () => { if (!X || !Array.isArray(X.res) || typeof W.qsEdit !== 'function') return; const keep = X; W.qsEdit(X.res, { title: titleOf(), onSave: qs => { if (X !== keep) return; if (Array.isArray(qs) && qs.length) { X.res = qs.map(q => ({ ...q, q: String(q.q || '').replace(/^\d+\.\s*/, '') })); X.dirty = true; } draw(); } }); },
    'ct-yt-find': async () => { const q = X.topic || sessTitle(X.ctx) || courseName(X.ctx); try { const r = await ytSearch(q); X.cands = r || []; if (r && r[0] && !X.url) { X.url = 'https://youtu.be/' + r[0].id; X.yt = r[0]; } } catch (e) { say('YouTube에서 찾지 못했습니다.', 'warn'); } draw(); },
    'ct-yt-pick': el => { X.url = 'https://youtu.be/' + el.dataset.v; X.yt = (X.cands || []).find(v => v.id === el.dataset.v) || null; draw(); },
    'ct-up-again': () => { X.file = null; X.step = 0; draw(); setTimeout(() => { const f = $1('#ctFile'); f && f.click(); }, 30); },
    'ct-lf': el => { X.lf = el.dataset.v; draw(); }, 'ct-lpick': el => { X.pick = X.pick === el.dataset.v ? '' : el.dataset.v; draw(); },
    'ct-switch': el => { const ctx = X.ctx; open(el.dataset.v, ctx); },
    'ct-to-course': () => toCourse(X.done),
    'ct-new-course': () => { close(); newCourse(); }
  };
  Object.keys(A).forEach(k => { ACT[k] = A[k]; });
  /* 입력 → 상태(다시 그리지 않음) */
  document.addEventListener('input', e => { const el = e.target; if (!X || !el.closest || !el.closest('#ctSheet')) return;
    if (el.id === 'ctTopic') { X.topic = el.value; el.removeAttribute('aria-invalid'); const nd = $1('[data-ctneed]'); if (nd) nd.hidden = !!el.value.trim(); if (MK.has(X.kind) && !claudeOn() && !X.dirty && el.value.trim().length >= 2) { clearTimeout(X.tt); const keep = X; X.tt = setTimeout(() => { if (X === keep && !X.busy && document.activeElement && document.activeElement.id === 'ctTopic') A['ct-make'](); }, 900); } } if (el.id === 'ctUpT') X.upTitle = el.value;
    if (el.id === 'ctUrl') { X.url = el.value.trim(); X.yt = null; clearTimeout(X.ut); X.ut = setTimeout(() => { if (!X) return; const pos = el.selectionStart; draw(); const n = $1('#ctUrl'); if (n && !ytId(X.url)) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { } } }, 350); }
    if (el.id === 'ctLq') { X.lq = el.value; clearTimeout(X.lt); X.lt = setTimeout(() => { if (!X) return; draw(); const n = $1('#ctLq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); }
  });
  document.addEventListener('change', e => { const el = e.target; if (el && el.id === 'ctFile' && el.files && el.files[0] && X) takeFile(el.files[0]);
    if (!X || !el || !el.closest || !el.closest('#ctSheet')) return;
    if (el.dataset.ctset) { const k = el.dataset.ctset; const v = el.tagName === 'SELECT' && isNaN(+el.value) || el.value === '' ? el.value : +el.value;
      if (k === 'slang' || k === 'vlang') { langPick(k, el.value); return; } if (k === 'time') X.time = Math.max(5, Math.min(600, +el.value || 60)); else if (k === 'due') { X.due = +el.value || 7; if (X.res) X.res.due = X.due; } else X[k] = v; draw(); }
    if (el.dataset.svt != null && X.res) { const q = X.res[+el.dataset.svt]; const v = el.value; if (!q) return; if (v === 'text') { q.t = 'text'; q.opts = []; q.scale = false; } else if (v === 'scale') { q.t = 'single'; q.opts = [...A5L]; q.scale = true; } else { if (q.scale || !(q.opts || []).length) q.opts = ['항목 1', '항목 2', '항목 3']; q.t = v; q.scale = false; } X.dirty = true; draw(); } });
  /* 설정이 바뀌면 미리보기를 바로 바꾼다: 규칙 생성은 즉시 다시 만들고, 고친 내용이 있으면 문항 수만 늘리거나 줄인다 */
  function optChanged(k) { if (!X) return; const CONTENT = { quiz: ['n', 'lv'], exam: ['en', 'mult', 'rand', 'lv'], survey: ['sn', 'mix'], book: ['units'], aivideo: ['mins'] }[X.kind] || [];
    if (!X.res || !CONTENT.includes(k) || X.busy) { draw(); return; }
    if (X.kind === 'exam' && k !== 'lv') { const n = need(); if (X.res.length > n) X.res = X.res.slice(0, n); else if (X.res.length < n) X.res = X.res.concat(examBank(X.topic, n - X.res.length, X.lv, X.res)); draw(); return; }
    if (X.kind === 'quiz' && k === 'n' && X.dirty) { const n = +X.n; if (X.res.length > n) X.res = X.res.slice(0, n); else X.res = X.res.concat(AI.questions(X.topic, n - X.res.length, X.lv).filter(q => !X.res.some(y => nq(y) === nq(q)))); draw(); return; }
    if (X.kind === 'survey' && k === 'sn' && X.dirty) { const n = +X.sn; if (X.res.length > n) X.res = X.res.slice(0, n); else X.res = X.res.concat(svDraft(X.topic, n, X.mix).filter(q => !X.res.some(y => y.q === q.q)).slice(0, n - X.res.length)); draw(); return; }
    if (X.dirty || claudeOn()) { X.stale = true; draw(); say('설정을 바꿨습니다. 새로 만들려면 [AI로 다시 만들기]를 누르세요.', ''); return; }
    A['ct-make'](); }
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'ctTopic' && X && X.step === 0 && !e.isComposing) { e.preventDefault(); if (X.kind === 'aivideo') A['ct-make'](); else A['ct-make'](); } });

  /* ═════════ '차시 채우기' 단계(CF fill) ═════════ */
  let F = null; /* { el, d, open, undo } */
  const sessOf = d => { const L = d.weekPlan || d.outline || d.sessions || []; return (Array.isArray(L) ? L : []).map((x, i) => typeof x === 'string' ? { w: i + 1, title: x } : { w: +x.w || i + 1, title: x.title || x.name || `${i + 1}${unit()}`, goal: x.goal || '' }); };
  const itemsOf = d => (d.curriculum = Array.isArray(d.curriculum) ? d.curriculum : (Array.isArray(d.items) ? d.items : []));
  const saveDraft = () => { try { if (W.CF && typeof CF.saveDraft === 'function') CF.saveDraft(); else keep(); } catch (e) { } };
  const draftCourse = d => { const real = d.classId && typeof C === 'function' ? C(d.classId) : null; return real || { name: d.name || d.topic || '', curriculum: itemsOf(d), weekPlan: d.weekPlan, _draft: true }; };
  function renderFill(el, d) {
    if (!el || !d || !S) return; injectCSS(); F = F && F.d === d ? Object.assign(F, { el }) : { el, d, open: null, undo: null };
    const SS = sessOf(d); const IT = itemsOf(d); const U = unit();
    if (!SS.length) { el.innerHTML = `<div class="ctf"><div class="ct-empty">${svg('doc', 40)}<b>${U} 목록이 아직 없습니다</b><span>[이전]으로 돌아가 ${U} 목록을 먼저 만드세요. 비워 두고 나중에 넣어도 됩니다.</span></div></div>`; return; }
    const has = w => IT.filter(x => +x.week === w);
    if (F.open == null || !SS.some(s => s.w === F.open)) { const e1 = SS.find(s => !has(s.w).length); F.open = e1 ? e1.w : (F.open === 0 ? 0 : SS[0].w); }
    const filled = SS.filter(s => has(s.w).length).length; const inFlow = !!el.closest('#crsFlow');
    let lgl = ''; try { if (el.closest('#crsFlow') && W.CF && typeof CF.legalBox === 'function') lgl = CF.legalBox(d); } catch (e) { }
    const bulk = SS.length > 1 ? `<div class="ctf-bulk" role="group" aria-label="모든 ${E(U)}에 한 번에 넣기"><p class="ctf-bq"><b>모든 ${E(U)}에 한 번에 넣기</b><small>${E(U)}마다 같은 구성(영상 · 자료 문서 하나 + 퀴즈 하나 등)이면 여기서 한 번에 넣습니다.</small></p><div class="ctf-bb"><button type="button" class="ct-btn" data-act="ctf-bulkv">${svg('upload', 18)} 파일 여러 개 한 번에 올리기</button><button type="button" class="ct-btn" data-act="ctf-same" data-k="quiz">${svg('quiz', 18)} 모든 ${E(U)}에 퀴즈 넣기</button><button type="button" class="ct-btn" data-act="ctf-same" data-k="doc">${svg('doc', 18)} 모든 ${E(U)}에 교안 넣기</button></div></div>` : '';
    el.innerHTML = `${lgl}<div class="ctf">${bulk}<div class="ctf-top"><div class="ctf-sum"><b>${filled} / ${SS.length}</b><span>${U} 채움</span><span class="ctf-later">나중에 해도 됩니다</span></div>${inFlow && !W.CT_FILLBTN ? '' : `<button type="button" class="ct-btn ct-ai" data-act="ctf-all" ${filled === SS.length ? 'disabled' : ''}>`}${inFlow && !W.CT_FILLBTN ? '' : `${svg('spark', 18)} AI SAM이 빈 ${U} 모두 채우기</button>`}</div>
      ${F.undo && !(F.undo.w && SS.some(s => s.w === F.undo.w && F.open === s.w)) ? undoBand() : ''}
      <ol class="ctf-list">${SS.map(s => { const its = has(s.w); const on = F.open === s.w; return `<li class="ctf-s ${on ? 'on' : ''} ${its.length ? 'has' : ''}" data-w="${s.w}"><button type="button" class="ctf-sh" data-act="ctf-open" data-v="${s.w}" aria-expanded="${on}"><span class="ctf-n">${its.length ? svg('check', 18) : s.w}</span><span class="ctf-tt"><b>${s.w}${U === '주차' ? '주차' : U} · ${E(s.title)}</b><small>${its.length ? its.map(x => E(TYPE_LABEL(x))).join(' · ') : '비어 있음'}</small></span>${svg('chev', 20)}</button>
        ${on ? `<div class="ctf-body">${F.undo && F.undo.w === s.w ? undoBand() : ''}${its.length ? `<ul class="ctf-its">${its.map(x => `<li><span class="ct-kic k-${E(icOf(x) === 'audio' ? 'audio' : TYPE_KIND(x))}">${svg(icOf(x), 18)}</span><span class="ct-lt"><b>${E(x.title)}</b><small>${E(TYPE_LABEL(x))}</small></span><button type="button" class="ct-btn sm" data-act="ctf-view" data-v="${E(x.id)}">보기</button><button type="button" class="ct-icb sm" data-act="ctf-del" data-v="${E(x.id)}" aria-label="「${E(x.title)}」 빼기">${svg('trash', 18)}</button></li>`).join('')}</ul>` : ''}
          ${its.length && SS.some(x => x.w === s.w + 1) ? (() => { const nx = SS.find(x => x.w === s.w + 1); return `<div class="ctf-nextb"><span>${s.w}${U}에 더 넣으려면 아래에서 고르세요. 다음으로 넘어가려면</span><button type="button" class="ct-btn sm pri" data-act="ctf-open" data-v="${nx.w}" data-next="1">${nx.w}${U}(${E(String(nx.title || '').slice(0, 14))})에 넣기 →</button></div>`; })() : ''}
          <p class="ctf-q">${its.length ? `<b>${s.w}${U}</b>에 더 넣을 콘텐츠` : `<b>${s.w}${U}</b>에 넣을 콘텐츠를 고르세요`}</p><div class="ct-kinds ${its.length ? 'cmp' : ''}">${kindCards(s.w)}</div></div>` : ''}</li>`; }).join('')}</ol></div>`;
  }
  const undoBand = () => `<div class="ctf-undo" role="status" aria-live="polite"><span>${E(F.undo.msg)}</span><button type="button" class="ct-btn sm" data-act="ctf-undo">${svg('undo', 16)} 되돌리기</button></div>`;
  const kindCards = (w, lib) => KINDS.filter(k => !(lib && k.k === 'lib')).map(k => `<button type="button" class="ct-kind" data-act="ct-kind" data-ct="${k.k}" data-k="${k.k}" ${w != null ? `data-w="${w}"` : ''}><span class="ct-kic k-${k.k}">${svg(k.k, 24)}</span><b>${E(k.name)}</b><small>${E(k.one)}</small><em>${E(k.time)}</em></button>`).join('');
  const refill = () => { if (F && F.el && F.el.isConnected) renderFill(F.el, F.d); };
  function openFromFill(kind, w) { const d = F.d; const s = sessOf(d).find(x => x.w === w) || { w, title: '' };
    open(kind, { from: 'flow', course: draftCourse(d), week: w, title: s.title, sess: s, target: d.target || '', onDone: it => { if (d.classId && typeof C === 'function' && C(d.classId)) { /* 이미 생성된 과정이면 settle 끝 */ } else settle(it, null); it.week = w; itemsOf(d).push(it); F.open = w; /* 넣은 뒤에도 같은 차시를 펼쳐 둔다(다음 차시 자동 펼침 끔 — 평가 1회차 6번) */
      /* 넣은 직후 8초 동안 그 차시 안에 '넣었습니다 [되돌리기]' 띠를 남긴다 */
      const tok = {}; F.undo = { tok, w, msg: `${jo(`「${it.title}」`, '을')} ${w}${unit()}에 넣었습니다.`, run: () => { const L = itemsOf(d); const i = L.findIndex(x => x.id === it.id); if (i >= 0) L.splice(i, 1); sweep(); F.open = w; } };
      clearTimeout(F.ut); F.ut = setTimeout(() => { if (!F || !F.undo || F.undo.tok !== tok) return; F.undo = null; const b = F.el && F.el.querySelector('.ctf-undo'); if (b) b.remove(); }, W.__CT_UNDO_MS || 8000);
      saveDraft(); refill(); try { toTop(F.el && F.el.querySelector(`.ctf-s[data-w="${w}"]`)); } catch (e) { } try { W.CF && CF.emit && CF.emit('ct-add', it); } catch (e) { } } }); }
  ACT['ct-kind'] = el => { const k = el.dataset.k; const w = el.dataset.w != null ? +el.dataset.w : null; if (F && w != null && F.el && F.el.contains(el)) return openFromFill(k, w); if (PK) { const ctx = PK; PK = null; closePick(); return open(k, ctx); } open(k, {}); };
  ACT['ctf-open'] = el => { const w = +el.dataset.v; F.open = el.dataset.next ? w : (F.open === w ? 0 : w); if (el.dataset.next) { clearTimeout(F.ut); F.undo = null; } refill(); const li = F.el.querySelector(`.ctf-s[data-w="${w}"]`); if (li && F.open) { if (el.dataset.next) toTop(li); else li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
  /* 펼친 차시의 머리글(차시 이름)이 스크롤 상자 맨 위에 오게 — 넣을 차시가 늘 보이도록(평가 2회차 2번) */
  const toTop = li => { if (!li) return; const b = li.closest('.cf-body') || li.closest('[class*="body"]'); if (!b) { li.scrollIntoView({ block: 'start' }); return; } b.scrollTop += li.getBoundingClientRect().top - b.getBoundingClientRect().top - 8; };
  ACT['ctf-del'] = el => { const L = itemsOf(F.d); const i = L.findIndex(x => x.id === el.dataset.v); if (i < 0) return; const [it] = L.splice(i, 1); saveDraft(); const gone = sweep(); clearTimeout(F.ut); F.undo = { msg: `${jo(`「${it.title}」`, '을')} 뺐습니다.`, run: () => { L.splice(i, 0, it); if (gone.rbs.length) S.rubrics.push(...gone.rbs); if (gone.bks.length) try { bkL().push(...gone.bks); } catch (e) { } } }; saveDraft(); refill(); };
  ACT['ctf-undo'] = () => { if (F.undo) { clearTimeout(F.ut); const m = F.undo.tok ? '넣은 것을 되돌렸습니다.' : '되돌렸습니다.'; F.undo.run(); F.undo = null; saveDraft(); refill(); say(m, 'ok'); } };
  ACT['ctf-view'] = el => { const it = itemsOf(F.d).find(x => x.id === el.dataset.v); if (it) preview(it, draftCourse(F.d)); };
  ACT['ctf-all'] = () => { const n = fillAll(F.d); if (n) { const d = F.d; const before = n.ids; F.undo = { msg: `빈 ${unit()} ${n.s}곳에 교안 · 퀴즈를 넣었습니다.`, run: () => { d.curriculum = itemsOf(d).filter(x => !before.includes(x.id)); } }; saveDraft(); refill(); say(`빈 ${unit()} ${n.s}곳을 채웠습니다. 내용을 확인해 보세요.`, 'ok'); } };
  /* 빈 차시 모두: 교안 + 확인 퀴즈 3문제(규칙 생성, 즉시) */
  function fillAll(d) { const L = itemsOf(d); const ids = []; let s = 0; const cn = cl(d.name || d.topic || '');
    sessOf(d).forEach(x => { if (L.some(y => +y.week === x.w)) return; const g = /^\d+\s*(차시|주차|주)$/.test(x.title); const tp = topicOf(g ? cn : (cn && !x.title.includes(cn) ? `${cn} ${x.title}` : x.title)) || cn || x.title; const sh = topicOf(g ? cn : x.title) || tp;
      if (/고사|최종 평가|시험/.test(x.title)) { const it = { id: nid('it'), type: 'exam', title: `${sh} 시험`, week: x.w, qs: AI.questions(cn || sh, 10, '보통'), time: 60, retake: 1 }; L.push(it); ids.push(it.id); s++; return; }
      const a = { id: nid('it'), type: 'doc', title: `${sh} 교안`, week: x.w, topic: tp, fmt: 'hand', doc: AI.material(tp, { name: cn }) }; const b = { id: nid('it'), type: 'quiz', title: `${sh} 확인 퀴즈`, week: x.w, qs: AI.questions(tp, 3, '보통', ['mc', 'ox', 'mc']), time: 10, retake: 3 }; L.push(a, b); ids.push(a.id, b.id); s++; });
    try { if (S.ai) S.ai.usage = (S.ai.usage || 0) + (s ? 1 : 0); } catch (e) { } return s ? { s, ids } : 0; }

  /* ═════ 모든 차시에 한 번에 넣기(F4) ═════
     ① 파일 여러 개 한 번에 올리기(F5: 영상 + 문서): 파일 이름 순(숫자는 숫자 순: lec2 < lec10)으로 영상은 영상이 없는 차시에, 문서(PDF · PPTX · DOCX · HWP · HWPX)는 문서가 없는 차시에 차례로 넣는다.
        같은 번호의 영상 · 문서(1강.mp4 · 1강.pdf)는 같은 차시로 짝짓는다. 넣기 전에 '몇 차시 ← 어떤 파일'을 보여 준다. 크기 한도(HPM.FMAX) · 위장 파일 검사(HPM.upload headOk)는 그대로.
     ② 모든 차시에 퀴즈 · 교안 넣기: 그 종류가 없는 차시마다 차시 제목을 주제로 만든다(Claude 연결 시 Claude, 아니면 규칙 생성). */
  let BX = null; /* { k:'v'|'quiz'|'doc', files:[], n, busy, at, tot } */
  const natCmp = (a, b) => String(a).localeCompare(String(b), 'ko', { numeric: true, sensitivity: 'base' });
  const genericT = t2 => /^\s*\d+\s*(차시|주차|주|회차)?\s*(수업)?\s*$/.test(String(t2 || ''));
  const bxTargets = (d, k) => { const IT = itemsOf(d); const want = k === 'v' ? (x => x.type === 'video' || x.type === 'audio') : k === 'quiz' ? (x => x.type === 'quiz' || x.type === 'exam') : (x => x.type === 'doc'); return sessOf(d).filter(s => !IT.some(x => +x.week === s.w && want(x))); };
  const numOf = n => { const m = /(\d+)/.exec(String(n || '').replace(/\.[^.]+$/, '')); return m ? +m[1] : null; };
  const isDocF = f => f.k === 'pdf' || f.k === 'file';
  /* 파일 → 차시 짝짓기: 영상은 영상 없는 차시에 차례로, 문서는 같은 번호 영상이 들어간 차시(문서 없음)에 먼저, 나머지는 문서 없는 차시에 차례로 */
  function bxPlan(d) { const ok = BX.files.filter(f => !f.err); const TV = bxTargets(d, 'v'); const TD = bxTargets(d, 'doc'); const rows = new Map(); const extra = [];
    const put = (s, f) => { const r = rows.get(s.w) || { s, v: null, d: null }; if (isDocF(f)) r.d = f; else r.v = f; rows.set(s.w, r); };
    const V = ok.filter(f => !isDocF(f)); const D = ok.filter(isDocF); const vAt = new Map();
    V.forEach((f, i) => { const s = TV[i]; if (!s) { extra.push(f); return; } put(s, f); const n = numOf(f.name); if (n != null && !vAt.has(n)) vAt.set(n, s); });
    const takenD = new Set(); const rest = [];
    D.forEach(f => { const n = numOf(f.name); const s = n != null ? vAt.get(n) : null; if (s && TD.some(x => x.w === s.w) && !takenD.has(s.w)) { takenD.add(s.w); put(s, f); } else rest.push(f); });
    rest.forEach(f => { const s = TD.find(x => !takenD.has(x.w)); if (!s) { extra.push(f); return; } takenD.add(s.w); put(s, f); });
    return { rows: [...rows.values()].sort((a, b) => a.s.w - b.s.w), extra, nv: V.length - extra.filter(f => !isDocF(f)).length, nd: D.length - extra.filter(isDocF).length }; }
  const bxN = P => P.rows.reduce((a, r) => a + (r.v ? 1 : 0) + (r.d ? 1 : 0), 0);
  const bxTopic = (d, s) => { const cn = cl(d.name || d.topic || ''); return (genericT(s.title) ? topicOf(cn) : topicOf(s.title)) || cn || s.title; };
  function bxOpen(k) { if (!F || !F.d) return; X = null; const tw = document.getElementById('toasts'); if (tw) tw.innerHTML = ''; /* 앞 알림이 창 제목을 가리지 않게 */ mount(); BX = { k, files: [], n: 5, busy: false, at: 0, tot: 0 }; bxDraw(); }
  function bxClose() { BX = null; const w = $1('#ctSheet'); if (w) w.remove(); }
  function bxDraw() {
    const w = $1('#ctSheet'); if (!w || !BX || !F) return; const d = F.d; const U = unit(); const TG = BX.k === 'v' ? [...new Map([...bxTargets(d, 'v'), ...bxTargets(d, 'doc')].map(s => [s.w, s])).values()] : bxTargets(d, BX.k); const nm = { v: '파일 여러 개 한 번에 올리기', quiz: `모든 ${U}에 퀴즈 넣기`, doc: `모든 ${U}에 교안 넣기` }[BX.k];
    $1('#ctTitle').textContent = nm; $1('#ctWhere').textContent = `${jo(cl(d.name || '') ? `「${cl(d.name)}」` : `이 ${t('cls')}`, '의')} ${U} ${sessOf(d).length}개`.replace('의의', '의'); $1('#ctSteps').innerHTML = ''; w.querySelector('[data-act=ct-back]').style.visibility = 'hidden';
    const nowE = $1('#ctNow'); let now = '', body = '', foot2 = '';
    if (BX.busy) { now = ''; body = busyBox(`${BX.k === 'v' ? '올리는 중' : '만드는 중'}… ${BX.at} / ${BX.tot}`); }
    else if (!TG.length) { body = `<div class="ct-ok">${svg('check', 40)}<b>모든 ${E(U)}에 이미 ${BX.k === 'v' ? '영상 · 문서가' : BX.k === 'quiz' ? '퀴즈가' : '교안이'} 있습니다</b><span>더 넣으려면 ${E(U)}를 펼쳐 하나씩 넣으십시오.</span></div>`; foot2 = foot(pri('닫기', 'ctb-x')); }
    else if (BX.k === 'v' && !BX.files.length) {
      now = '올릴 영상 · 문서 파일을 한꺼번에 고르십시오. 여러 개를 고를 수 있습니다.'; const nV = bxTargets(d, 'v').length; const nD = bxTargets(d, 'doc').length;
      body = `<label class="ct-drop" id="ctDrop">${svg('upload', 40)}<b>파일 여러 개 고르기</b><span>영상(MP4 · WEBM) · 문서(PDF · PPTX · DOCX · HWP · HWPX)</span><span>또는 이곳에 끌어다 놓기</span><input type="file" id="ctFiles" multiple accept="${E(BXACC)}"></label><p class="ct-ex">예: 1강.mp4 · 1강.pdf · 2강.mp4 · 2강.pdf … 처럼 파일 이름에 번호가 있으면 그 순서대로 ${E(U)}에 들어갑니다. 같은 번호의 영상과 문서는 같은 ${E(U)}에 넣습니다.</p><p class="ct-mini">영상은 영상이 없는 ${E(U)} ${nV}곳에, 문서는 문서가 없는 ${E(U)} ${nD}곳에 차례로 넣습니다. 파일 하나에 ${E(limText())} 올릴 수 있습니다.</p>`;
    } else if (BX.k === 'v') {
      const P = bxPlan(d); const n = bxN(P); const L = BX.files;
      now = `순서가 맞는지 확인하고 [파일 ${n}개 넣기]를 누르십시오.`;
      const fl = (f, ic) => `<span class="ctb-f">${svg(ic, 16)} ${E(f.name)} <small>${E(mb(f.size))}</small></span>`;
      body = `<ol class="ctb-map">${P.rows.map(r => `<li><b>${r.s.w}${E(U)}</b><span class="ctb-t">${E(r.s.title)}</span>${r.v ? fl(r.v, 'upload') : ''}${r.d ? fl(r.d, 'doc') : ''}</li>`).join('')}</ol>${P.extra.length ? `<p class="ct-err" role="status">남는 파일 ${P.extra.length}개(${E(P.extra.map(f => f.name).slice(0, 3).join(', '))}${P.extra.length > 3 ? ' …' : ''})는 넣을 ${E(U)}가 없어 넣지 않습니다. ${E(U)}를 늘리려면 [이전]에서 ${E(U)} 목록을 고치십시오.</p>` : ''}${L.filter(f => f.err).map(f => `<p class="ct-err" role="alert">${E(f.name)}: ${E(f.err)}</p>`).join('')}<p class="ct-mini">영상 ${P.nv}개 · 문서 ${P.nd}개. 영상 제목은 ${E(U)} 제목, 문서 제목은 '${E(U)} 제목 + 자료'로 넣습니다. 순서가 틀리면 파일 이름 앞에 번호(01, 02 …)를 붙여 다시 고르십시오.</p><div class="ct-row">${sec('다른 파일 고르기', 'ctb-again')}</div>`;
      foot2 = foot(pri(`${svg('check', 18)} 파일 ${n}개 넣기`, 'ctb-go', !n));
    } else {
      now = `${BX.k === 'quiz' ? '퀴즈' : '교안'}가 없는 ${U} ${TG.length}곳에 ${U} 제목을 주제로 만들어 넣습니다.`;
      body = `${BX.k === 'quiz' ? `<div class="ct-f"><span class="ct-l">${E(U)}마다 문제 수</span><div class="ct-chips" role="radiogroup" aria-label="문제 수">${[[3, '3문제'], [5, '5문제'], [10, '10문제']].map(([v, l]) => `<button type="button" role="radio" aria-checked="${BX.n === v}" class="ct-chip ${BX.n === v ? 'on' : ''}" data-act="ctb-n" data-v="${v}">${l}</button>`).join('')}</div></div>` : ''}<ol class="ctb-map">${TG.map(s => `<li><b>${s.w}${E(U)}</b><span class="ctb-t">${E(s.title)}</span><span class="ctb-f">${svg(BX.k, 16)} ${E(bxTopic(d, s))} ${BX.k === 'quiz' ? '확인 퀴즈' : '교안'}</span></li>`).join('')}</ol><p class="ct-mini">${claudeOn() ? 'Claude로 만듭니다.' : '기본 AI(브라우저 데모)로 만든 초안입니다.'} 넣은 뒤 ${E(U)}를 펼쳐 [보기]로 확인하고 고칠 수 있습니다.</p>`;
      foot2 = foot(pri(`${svg('check', 18)} ${TG.length}개 ${E(U)}에 ${BX.k === 'quiz' ? '퀴즈' : '교안'} 넣기`, 'ctb-go'));
    }
    nowE.innerHTML = now ? `<b>지금 할 일</b> ${E(now)}` : ''; nowE.hidden = !now; $1('#ctBody').innerHTML = body; $1('#ctFoot').innerHTML = foot2;
    const dz = $1('#ctDrop'); if (dz) { ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); })); dz.addEventListener('dragleave', () => dz.classList.remove('over')); dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); bxTake([...(e.dataTransfer.files || [])]); }); }
  }
  const BXACC = 'video/*,audio/*,.mp4,.webm,.m4v,.mov,.mp3,.m4a,.pdf,.pptx,.docx,.hwp,.hwpx';
  function bxTake(list) { if (!BX) return; BX.files = [...list].sort((a, b) => natCmp(a.name, b.name)).map(f => { let err = ''; const k = FKIND(f); const docOk = k === 'pdf' || (k === 'file' && /\.(pdf|pptx|docx|hwp|hwpx)$/i.test(f.name || '')); if (k !== 'video' && k !== 'audio' && !docOk) err = '영상 · 문서(PDF · PPTX · DOCX · HWP · HWPX) 파일이 아닙니다.'; else if (HPMx() && typeof HPM.check === 'function') { try { const c = HPM.check(f); if (c && c.ok === false) err = c.msg || '올릴 수 없는 파일입니다.'; } catch (e) { } } else if (f.size > LIMIT[k]) err = `${mb(LIMIT[k])}까지 올릴 수 있습니다.`; const x = { raw: f, name: String(f.name).slice(0, 120), size: f.size, mime: f.type || '', k, err, bid: nid('b'), dur: 0 }; if (!err) { try { BLOBS[x.bid] = URL.createObjectURL(f); if (k === 'video' || k === 'audio') { const v = document.createElement(k === 'audio' ? 'audio' : 'video'); v.preload = 'metadata'; v.onloadedmetadata = () => { if (Number.isFinite(v.duration)) x.dur = Math.round(v.duration); }; v.src = BLOBS[x.bid]; } } catch (e) { } } return x; }); bxDraw(); } /* 영상 길이(학습자 화면 '총 영상 시간')는 고를 때 미리 읽어 둔다 */
  async function bxGo() {
    if (!BX || BX.busy || !F) return; const d = F.d; const U = unit(); const TG = bxTargets(d, BX.k === 'v' ? 'quiz' : BX.k); const L = itemsOf(d); const ids = [];
    if (BX.k === 'v') { const P = bxPlan(d); const jobs = []; P.rows.forEach(r => { if (r.v) jobs.push([r.s, r.v]); if (r.d) jobs.push([r.s, r.d]); }); if (!jobs.length) return; BX.busy = true; BX.tot = jobs.length; BX.at = 0; bxDraw(); const fn = upFn(); let fail = 0;
      for (const [s, f] of jobs) { BX.at++; bxDraw(); let meta = {}; if (fn) { try { meta = (await fn(f.raw, { kind: f.k, onProgress: () => { } })) || {}; } catch (e) { fail++; if (e && e.message) BX.lastErr = `${f.name}: ${String(e.message).split(/\.\s/)[0].replace(/\.$/, '')}`; continue; } }
        const base = String(f.name).replace(/\.[^.]+$/, '').slice(0, 60); const it = upMake(f, meta, isDocF(f) ? (genericT(s.title) ? base : `${s.title} 자료`) : (genericT(s.title) ? base : s.title)); it.id = nid('it'); it.week = s.w; settle(it, null); L.push(it); ids.push(it.id); }
      BX.busy = false; if (fail) BX.failMsg = `${fail}개는 올리지 못했습니다${BX.lastErr ? `(${BX.lastErr})` : ''}. 그 ${jo(U, '은')} 하나씩 다시 올려 주십시오.`; }
    else { BX.busy = true; BX.tot = TG.length; BX.at = 0; bxDraw();
      for (const s of TG) { BX.at++; bxDraw(); const tp = bxTopic(d, s); let it;
        try { if (BX.k === 'quiz') { const r = await GEN.quiz(tp, { n: BX.n, lv: '보통' }); const Q = (r.v || []).map((q, i) => ({ ...q, q: `${i + 1}. ${String(q.q).replace(/^\d+\.\s*/, '')}` })); const per = Math.floor(100 / Math.max(1, Q.length)); Q.forEach((q, i) => { q.pts = per + (i < 100 - per * Q.length ? 1 : 0); }); it = { type: 'quiz', title: `${tp} 확인 퀴즈`, qs: Q, time: 10, retake: 3 }; }
          else { const r = await GEN.doc(tp, { cname: cl(d.name || ''), target: d.target || '' }); it = { type: 'doc', title: `${tp} 교안`, topic: tp, fmt: 'hand', doc: r.v }; } } catch (e) { continue; }
        it.id = nid('it'); it.week = s.w; L.push(it); ids.push(it.id); }
      BX.busy = false; try { if (S.ai && ids.length) S.ai.usage = (S.ai.usage || 0) + 1; } catch (e) { } }
    if (!BX) return; const what = BX.k === 'v' ? '파일' : BX.k === 'quiz' ? '퀴즈' : '교안'; const failMsg = BX.failMsg || ''; bxClose(); if (!ids.length) { refill(); if (failMsg) say(failMsg, 'warn'); return; }
    L.sort((a, b) => (+a.week || 0) - (+b.week || 0)); /* 같은 차시 안에서는 넣은 순서 유지(sort는 안정 정렬) */
    clearTimeout(F.ut); const d0 = d; F.undo = { msg: `${what} ${ids.length}개를 ${U} 순서대로 넣었습니다.`, run: () => { d0.curriculum = itemsOf(d0).filter(x => !ids.includes(x.id)); } }; F.open = 0;
    saveDraft(); refill(); if (failMsg) say(`${what} ${ids.length}개를 넣었습니다. ${failMsg}`, 'warn'); else say(`${what} ${ids.length}개를 ${U}마다 넣었습니다.`, 'ok'); try { W.CF && CF.emit && CF.emit('ct-add', { bulk: what, n: ids.length }); } catch (e) { } }
  ACT['ctf-bulkv'] = () => bxOpen('v'); ACT['ctf-same'] = el => bxOpen(el.dataset.k === 'doc' ? 'doc' : 'quiz');
  ACT['ctb-go'] = () => { bxGo(); }; ACT['ctb-x'] = () => bxClose(); ACT['ctb-n'] = el => { if (BX) { BX.n = +el.dataset.v || 5; bxDraw(); } };
  ACT['ctb-again'] = () => { if (!BX) return; BX.files = []; bxDraw(); setTimeout(() => { const f = $1('#ctFiles'); f && f.click(); }, 30); };
  document.addEventListener('change', e => { const el = e.target; if (el && el.id === 'ctFiles' && el.files && el.files.length && BX) bxTake([...el.files]); });

  /* 넣은 콘텐츠 보기(읽기 전용) */
  function preview(it, c) { const k = TYPE_KIND(it);
    if (k === 'aivideo' && it.ai?.scenes?.length) { try { aiPlayer(it.title, it.ai.scenes, it.ai.voice || 'f'); } catch (e) { } return; }
    const repl = n => { const L = c.curriculum || []; const i = L.findIndex(x => x.id === it.id); if (i >= 0) { n.id = it.id; n.week = it.week; L[i] = n; saveDraft(); refill(); } };
    if (k === 'upload') { open('upload', { from: 'flow', course: c, week: it.week, title: it.title, item: it, onDone: repl }); const ext = String(it.file || '').toLowerCase(); X.file = { name: it.file || it.title, size: +it.size || 0, mime: it.mime || '', k: it.type === 'audio' || /^audio/.test(it.mime || '') ? 'audio' : it.type === 'video' ? 'video' : /pdf$/.test(ext) || it.mime === 'application/pdf' ? 'pdf' : /^image/.test(it.mime || '') ? 'image' : 'file', bid: it.prev || '', url: /^upload:/.test(it.url || '') ? '' : it.url, dur: it.dur || 0 }; X.upTitle = it.title; X.step = 1; X.view = true; draw(); return; }
    open(k, { from: 'flow', course: c, week: it.week, title: it.title, item: it, onDone: repl }); if (k === 'youtube') { X.url = it.url; X.yt = it.yt || null; draw(); } }

  /* 종류 고르기 시트(라이브러리 · 과정 상세에서 '새 콘텐츠') */
  let PK = null;
  function pick(ctx) { if (!S) return; injectCSS(); ctx = ctx || {}; PK = ctx; close(true); const w = document.createElement('div'); w.className = 'ct-wrap'; w.id = 'ctSheet'; const lib = ctx.from === 'lib' && !ctx.course;
    w.innerHTML = `<div class="ct-sh" role="dialog" aria-modal="true" aria-label="무엇을 만들까요"><div class="ct-hd"><span class="ct-icb" aria-hidden="true"></span><div class="ct-ht"><b>무엇을 넣을까요?</b><small>${lib ? '콘텐츠 라이브러리에 저장합니다' : ''}</small></div><button type="button" class="ct-icb" data-act="ct-pk-x" aria-label="닫기">${svg('x', 22)}</button></div><p class="ct-now"><b>지금 할 일</b> 만들 콘텐츠 종류를 하나 고르세요.</p><div class="ct-bd"><div class="ct-kinds">${kindCards(null, lib)}</div></div></div>`;
    document.body.appendChild(w); w.addEventListener('click', e => { if (e.target === w) closePick(); }); }
  const closePick = () => { PK = null; const w = $1('#ctSheet'); if (w) w.remove(); };
  ACT['ct-pk-x'] = () => closePick();

  /* 과정 생성 뒤: 디지털북 · 라이브러리 사용처를 새 과정에 연결 */
  function linkCreated(c) { if (!c || !c.id) return; (c.curriculum || []).forEach(it => {
    if (it._rb) { if (!Array.isArray(S.rubrics)) S.rubrics = []; S.rubrics.push(it._rb); it.rubric = it._rb.id; delete it._rb; }
    if (it._book) { try { lsEnsure(); it._book.cls = c.id; bkL().push(it._book); it.book = it._book.id; } catch (e) { } delete it._book; }
    if (it.book) { try { const b = bkOf(it.book); if (b) { if (!b.cls) b.cls = c.id; delete b.crsDraft; } } catch (e) { } }
    if (it.rubric) { const rb = (S.rubrics || []).find(x => x.id === it.rubric); if (rb) delete rb.crsDraft; }
    if (it.lib && Array.isArray(S.lib)) { const l = S.lib.find(x => x.id === it.lib); if (l) { l.cls = [...new Set([...(l.cls || []), c.id])]; l.used = l.cls.length; } }
    delete it.prev; }); keep(); }
  /* 초안이 만든 루브릭 · 디지털북 중 어느 과정 · 초안에도 연결되지 않은 것을 정리(통합 결정 ③) */
  function sweep(keepItems) {
    if (!S) return { rbs: [], bks: [] }; const rbRef = new Set(), bkRef = new Set(); const add = L => (L || []).forEach(it => { if (it && it.rubric) rbRef.add(it.rubric); if (it && it.book) bkRef.add(it.book); });
    (S.classes || []).forEach(c => add(c.curriculum)); try { if (S.crsDraft && S.crsDraft.d) add(S.crsDraft.d.curriculum); } catch (e) { } try { if (W.CF && CF.isOpen && CF.isOpen() && CF.draft) add(CF.draft.curriculum); } catch (e) { } add(keepItems);
    const rbs = (S.rubrics || []).filter(r => r.crsDraft && !rbRef.has(r.id)); if (rbs.length) S.rubrics = S.rubrics.filter(r => !rbs.includes(r));
    let bks = []; try { lsEnsure(); const L = bkL(); bks = L.filter(b => b.crsDraft && !b.cls && !bkRef.has(b.id)); bks.forEach(b => L.splice(L.indexOf(b), 1)); } catch (e) { }
    if (rbs.length || bks.length) keep(); return { rbs, bks };
  }
  /* CF 연결(C1 흐름 엔진): fill 단계 render · aiFill, 생성 이벤트 */
  let hooked = false;
  function hookCF() { if (hooked || !W.CF) return; try {
    const st = Array.isArray(CF.steps) ? CF.steps.find(s => s.id === 'fill') : null;
    if (st) { st.render = (el, d) => renderFill(el, d); if (!st.aiFill) st.aiFill = d => Promise.resolve(fillAll(d)); if (!st.valid) st.valid = () => []; }
    if (typeof CF.on === 'function') { CF.on('create', x => { linkCreated(x && x.course ? x.course : x); sweep(); }); CF.on('close', () => setTimeout(() => sweep(), 0)); CF.on('open', x => { if (!(x && x.resume)) setTimeout(() => sweep(), 0); }); } hooked = true; } catch (e) { } }
  hookCF(); document.addEventListener('DOMContentLoaded', hookCF); setTimeout(hookCF, 0);

  /* 저장 데이터 */
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); if (S && !Array.isArray(S.clib)) S.clib = []; return r; }; } /* eslint-disable-line no-global-assign */

  /* 학습자 게시본: AI 교안 본문 · AI 강의 장면 · 올린 파일 주소를 항목에 싣는다(학습자 화면 표시는 별도) */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { (r.classes || []).forEach(x => { const c = typeof C === 'function' ? C(x.id) : null; if (!c) return;
    (x.items || []).forEach(y => { const it = (c.curriculum || []).find(z => z.id === y.id); if (!it) return; if (it.src) y.src = it.src;
      if (it.src === 'upload' || it.src === 'library') { ['url', 'fileId', 'mime', 'file'].forEach(k => { if (it[k] && !/^upload:/.test(String(it[k])) || k === 'file') if (it[k]) y[k] = String(it[k]).slice(0, 300); }); }
      if (it.doc && (it.doc.secs || []).length) { const D = it.doc; y.doc = { goals: (D.goals || []).slice(0, 8).map(g => String(g).slice(0, 200)), secs: D.secs.slice(0, 12).map(q => ({ h: String(q.h || '').slice(0, 120), body: String(q.body || '').slice(0, 1500), pts: (q.pts || []).slice(0, 8).map(p => String(p).slice(0, 200)) })), act: String(D.act || '').slice(0, 1500), check: (D.check || []).slice(0, 8).map(q => String(q).slice(0, 300)) }; if (it.fmt) y.fmt = it.fmt; }
      if (it.src === 'ai' && it.ai && (it.ai.scenes || []).length) { const A0 = it.ai; const vl = A0.vlang && A0.vlang !== 'ko' && A0.tr && (A0.tr[A0.vlang] || []).length ? A0.vlang : ''; const SC = vl ? A0.tr[vl] : A0.scenes; /* v36 번역 언어 · 목소리 · 속도 */
        y.ai = { scenes: SC.slice(0, 16).map(q => ({ h: String(q.h || '').slice(0, 120), pts: (q.pts || []).slice(0, 6).map(p => String(p).slice(0, 160)), say: String(q.say || '').slice(0, 800) })), voice: A0.voice || 'f', ...(vl ? { lang: (typeof LANG_TTS === 'object' && LANG_TTS[vl]) || vl } : {}), ...(+A0.rate && +A0.rate !== 1 ? { rate: +A0.rate } : {}), ...(A0.vname ? { vname: String(A0.vname).slice(0, 80) } : {}), ...(A0.tpl && A0.tpl !== 'slide' ? { tpl: A0.tpl } : {}), ...(A0.avatar && A0.avatar !== 'none' ? { avatar: A0.avatar } : {})  };
          /* v37 L1: 자막 언어가 목소리 언어와 다르면 자막 장면(cap)과 언어 이름(clang)을 함께 싣는다 — 학습자 화면이 자막 · 슬라이드를 그 언어로 보여 준다 */
          const cl = A0.slang && A0.slang !== (vl || 'ko') && (A0.slang === 'ko' ? (A0.scenes || []).length : A0.tr && (A0.tr[A0.slang] || []).length) ? A0.slang : ''; if (cl) { const CS = cl === 'ko' ? A0.scenes : A0.tr[cl]; y.ai.cap = CS.slice(0, 16).map(q => ({ h: String(q.h || '').slice(0, 120), pts: (q.pts || []).slice(0, 6).map(p => String(p).slice(0, 160)), say: String(q.say || '').slice(0, 800) })); y.ai.clang = ((typeof LANGS !== 'undefined' ? LANGS : []).find(x => x[0] === cl) || [cl, cl])[1]; } }
      if (it.book) y.book = it.book; }); }); } catch (e) { console.error('crs-content snap', e); } return r; }; }

  /* ── 스타일(이 파일 안에서 주입: 디자인 토큰 dds.css 값을 따른다) ── */
  function injectCSS() { if (document.getElementById('ctCss')) return; const s = document.createElement('style'); s.id = 'ctCss'; s.textContent = CSS; document.head.appendChild(s); }
  const CSS = `
.ct-wrap{position:fixed;inset:0;z-index:62;background:rgba(31,32,32,.5);display:flex;align-items:center;justify-content:center;padding:16px}
body:has(#slSheet) .ct-wrap{z-index:97}
.ct-sh{background:#fff;border-radius:16px;width:min(760px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;box-shadow:0 24px 48px rgba(0,0,0,.18);font-size:16px;color:#2A2B2B;overflow:hidden}
.ct-hd{display:flex;align-items:center;gap:8px;padding:12px 12px 4px}.ct-ht{flex:1;min-width:0;text-align:center}.ct-ht b{display:block;font-size:19px;font-weight:700;line-height:1.35}.ct-ht small{display:block;color:#6C6C6C;font-size:14px;line-height:1.4;margin-top:2px;overflow-wrap:anywhere}.ct-ht small.ct-dest{display:inline-block;margin-top:6px;padding:4px 14px;border-radius:999px;background:#EAEDFF;color:#3B48B5;font-size:17px;font-weight:800}
.ct-icb{width:48px;height:48px;flex:none;border:0;background:transparent;border-radius:12px;display:grid;place-items:center;color:#4C4D4D;cursor:pointer}.ct-icb:hover{background:#F1F2F2}.ct-icb.sm{width:44px;height:44px}.ct-icb:disabled{opacity:.35;cursor:default}
.ct-steps{list-style:none;margin:6px 20px 0;padding:0;display:flex;gap:6px;justify-content:center;flex-wrap:wrap}.ct-steps li{display:flex;align-items:center;gap:6px;font-size:14px;color:#808181;padding:4px 10px 4px 4px;border-radius:999px;background:#F6F7F7}
.ct-steps li i{font-style:normal;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#EAEBEB;font-weight:700;font-size:13px}.ct-steps li.on{color:#2A2B2B;background:#EAEDFF;font-weight:700}.ct-steps li.on i{background:#5C74F6;color:#fff}.ct-steps li.ok i{background:#00C53B;color:#fff}
.ct-now{margin:12px 20px 0;padding:10px 14px;background:#F6F7F7;border-radius:10px;font-size:16px;line-height:1.5}.ct-now b{color:#5C74F6;margin-right:6px}
.ct-bd{flex:1;overflow:auto;padding:14px 20px 20px;overscroll-behavior:contain}
.ct-ft{display:flex;align-items:center;gap:10px;padding:12px 20px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #EAEBEB;background:#fff}.ct-fl{flex:1;display:flex;gap:8px}
.ct-btn{min-height:48px;padding:0 18px;border-radius:10px;border:1px solid #C8C9C9;background:#fff;color:#2A2B2B;font:inherit;font-size:16px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;text-decoration:none;line-height:1.25;text-align:center}
.ct-btn:hover{background:#F6F7F7}.ct-btn.sm{min-height:44px;padding:0 12px;font-size:15px}.ct-btn:disabled{opacity:.45;cursor:default}
.ct-pri{background:#2A2B2B;border-color:#2A2B2B;color:#fff;min-width:180px}.ct-pri:hover{background:#4C4D4D}.ct-pri:disabled{background:#C8C9C9;border-color:#C8C9C9;color:#fff}
.ct-ai{border-color:#5C74F6;color:#3B4FD0;background:#fff}.ct-ai:hover{background:#EAEDFF}
.ct-f{display:block;margin:0 0 6px}.ct-l{display:block;font-size:15px;font-weight:700;margin:0 0 6px;color:#2A2B2B}
.ct-f input,.ct-f textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;line-height:1.5;padding:12px 14px;border:1px solid #C8C9C9;border-radius:10px;background:#fff;color:#2A2B2B}.ct-f input{min-height:52px}
.ct-f input:focus,.ct-f textarea:focus{outline:2px solid #5C74F6;outline-offset:1px;border-color:#5C74F6}
.ct-ex{margin:0 0 12px;color:#6C6C6C;font-size:15px;line-height:1.5}.ct-mini{color:#6C6C6C;font-size:14px;line-height:1.5;margin:4px 0}.ct-err{color:#DE0027;font-size:15px;margin:0 0 10px}
.ct-bd>.ct-ai{margin:0 0 16px}
.ct-chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.ct-chips.one{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px}
.ct-chip{min-height:48px;padding:0 18px;border-radius:999px;border:1px solid #C8C9C9;background:#fff;font:inherit;font-size:16px;color:#2A2B2B;cursor:pointer;white-space:nowrap}.ct-chip.on{background:#2A2B2B;border-color:#2A2B2B;color:#fff;font-weight:700}
.ct-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 12px}.ct-tools{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}
.ct-by{display:inline-block;font-size:14px;color:#6C6C6C;background:#F6F7F7;border-radius:6px;padding:4px 10px;margin:0 0 4px}.ct-by.c{color:#006ABF;background:#E3F3FC}
.ct-note{background:#FFF3E0;border-radius:10px;padding:10px 14px;font-size:15px;line-height:1.55;margin:0 0 12px}.ct-note b{margin-right:6px;color:#EF6D00}
.ct-busy{display:flex;align-items:center;justify-content:center;gap:12px;padding:40px 10px;font-size:17px;color:#4C4D4D;flex-wrap:wrap}.ct-spin{width:26px;height:26px;border-radius:50%;border:3px solid #EAEDFF;border-top-color:#5C74F6;animation:ctspin .8s linear infinite}@keyframes ctspin{to{transform:rotate(360deg)}}
.ct-busy.sm{padding:0;font-size:16px;flex:1;justify-content:flex-end}
@media (prefers-reduced-motion:reduce){.ct-spin{animation:none}}
.ct-a4{background:#fff;border:1px solid #EAEBEB;box-shadow:0 2px 10px rgba(0,0,0,.06);border-radius:4px;padding:36px 40px;max-width:640px;margin:0 auto;min-height:420px;line-height:1.7;word-break:keep-all;font-size:15px}
.ct-a4 header{border-bottom:3px solid #2A2B2B;padding-bottom:10px;margin-bottom:16px}.ct-a4 header small{color:#6C6C6C;font-size:13px}.ct-a4 h1{font-size:23px;margin:4px 0 0;line-height:1.35}
.ct-a4 h2{font-size:17px;margin:20px 0 6px;padding-left:10px;border-left:5px solid #5C74F6}.ct-a4 p{margin:0 0 6px}.ct-a4 ul,.ct-a4 ol{padding-left:20px;margin:4px 0}.ct-a4box{background:#F6F7F7;border-radius:10px;padding:10px 16px}.ct-ln{border-bottom:1px solid #ccc;height:26px}.ct-a4 footer{margin-top:24px;color:#808181;font-size:12px}
.ct-card{background:#F6F7F7;border-radius:12px;padding:12px;margin:0 0 10px}.ct-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ct-scn{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:10px}.ct-scn>li{background:#F6F7F7;border-radius:12px;padding:10px 12px}.ct-sh2{display:flex;align-items:center;gap:8px;margin-bottom:6px}.ct-sh2 b{width:28px;height:28px;flex:none;border-radius:50%;background:#2A2B2B;color:#fff;display:grid;place-items:center;font-size:14px}
.ct-sh2 input{flex:1;min-width:0;font:inherit;font-size:16px;font-weight:700;padding:8px 10px;border:1px solid transparent;border-radius:8px;background:transparent;min-height:44px}.ct-sh2 input:hover,.ct-sh2 input:focus{border-color:#C8C9C9;background:#fff}
.ct-player{position:relative;border-radius:12px;overflow:hidden;background:#1F2020}.ct-player canvas{display:block;width:100%;height:auto}.ct-playb{position:absolute;right:14px;bottom:14px;width:60px;height:60px;border-radius:50%;border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 10px rgba(0,0,0,.25);background:rgba(31,32,32,.8);color:#fff;display:grid;place-items:center;cursor:pointer}.ct-playb:hover{background:#5C74F6}
.ct-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;margin:12px 0}.ct-thumbs button{border:2px solid transparent;border-radius:8px;padding:0;background:#F6F7F7;cursor:pointer;text-align:left;overflow:hidden;font:inherit}.ct-thumbs button.on{border-color:#5C74F6}.ct-thumbs canvas{display:block;width:100%;height:auto}.ct-thumbs small{display:block;padding:4px 6px;font-size:13px;line-height:1.35;color:#4C4D4D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ct-qs{padding-left:0;list-style:none;margin:0;display:grid;gap:10px;counter-reset:q}.ct-qs>li{background:#F6F7F7;border-radius:12px;padding:12px 14px;counter-increment:q}.ct-q{display:flex;gap:8px;align-items:flex-start}.ct-q p{flex:1;margin:10px 0 6px;font-weight:700;line-height:1.5}.ct-q p::before{content:counter(q) ". "}
.ct-op{list-style:none;padding:0;margin:0;display:grid;gap:4px}.ct-op li{display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;line-height:1.45}.ct-op li i{width:16px;flex:none}.ct-op li.a{background:#E7F8E8;font-weight:700;color:#009116}.ct-ans{margin:0}.ct-ans b{color:#009116}
.ct-rb{list-style:none;padding:0;margin:0;display:grid;gap:6px}.ct-rb li{display:grid;grid-template-columns:1fr auto;gap:2px 10px;background:#F6F7F7;border-radius:10px;padding:10px 12px}.ct-rb em{font-style:normal;font-weight:700}.ct-rb small{grid-column:1/-1;color:#6C6C6C;font-size:14px}
.ct-book{display:grid;gap:12px}.ct-bcov{border-radius:12px;padding:18px;background:var(--bk);color:#fff}.ct-bcov b{display:block;font-size:20px}.ct-bcov small{display:block;opacity:.9;font-size:14px;margin-top:4px;line-height:1.5}.ct-book ol{list-style:none;padding:0;margin:0;display:grid;gap:8px}.ct-book li{background:#F6F7F7;border-radius:12px;padding:12px 14px}.ct-book li p{margin:4px 0;color:#4C4D4D;font-size:15px;line-height:1.5}.ct-book li small{color:#6C6C6C;font-size:14px}
.ct-ytp{display:flex;flex-direction:column;gap:8px;margin:6px 0}.ct-ytp img{width:100%;max-width:520px;border-radius:12px;aspect-ratio:16/9;object-fit:cover;background:#F1F2F2}.ct-ytp span{display:flex;gap:6px;align-items:center;font-weight:700}
.ct-ytc{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin:0 0 12px}.ct-ytc button{border:2px solid transparent;border-radius:10px;background:#F6F7F7;padding:0 0 6px;text-align:left;font:inherit;cursor:pointer;overflow:hidden}.ct-ytc button.on{border-color:#5C74F6}.ct-ytc img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.ct-ytc b{display:block;font-size:14px;padding:4px 8px 0;line-height:1.35}.ct-ytc small{padding:0 8px;color:#6C6C6C;font-size:13px}
.ct-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:2px dashed #AAABAB;border-radius:16px;padding:40px 16px;background:#FBFCFC;cursor:pointer;text-align:center;margin:0 0 12px;color:#4C4D4D;min-height:200px;position:relative}.ct-drop.over,.ct-drop:hover{border-color:#5C74F6;background:#EAEDFF}.ct-drop b{font-size:19px;color:#2A2B2B}.ct-drop span{font-size:15px}
.ct-drop input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}.ct-drop:focus-within{outline:2px solid #5C74F6;outline-offset:2px}
.ct-media{display:block;width:100%;max-height:52vh;border-radius:12px;background:#1F2020;margin:0 0 6px}img.ct-media{object-fit:contain;background:#F6F7F7}audio.ct-media{background:transparent}.ct-pdf{display:block;width:100%;height:52vh;border:1px solid #EAEBEB;border-radius:12px;margin:0 0 6px}
.ct-filec,.ct-empty,.ct-ok{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:28px 14px;background:#F6F7F7;border-radius:16px;color:#4C4D4D;margin:0 0 10px}.ct-filec b,.ct-empty b,.ct-ok b{font-size:17px;color:#2A2B2B;overflow-wrap:anywhere}.ct-ok .ct-ic{color:#00C53B}
.ct-ll{list-style:none;padding:0;margin:0 0 6px;display:grid;gap:6px}.ct-ll button{width:100%;display:flex;align-items:center;gap:12px;min-height:60px;padding:8px 14px;border-radius:12px;border:1px solid transparent;background:#F6F7F7;font:inherit;text-align:left;cursor:pointer;color:#2A2B2B}.ct-ll button.on{border-color:#5C74F6;background:#EAEDFF}.ct-ll button>.ct-ic{color:#5C74F6;flex:none}
.ct-lt{flex:1;min-width:0}.ct-lt b{display:block;font-size:16px;line-height:1.4;overflow-wrap:anywhere}.ct-lt small{display:block;color:#6C6C6C;font-size:14px;line-height:1.4}
.ct-srch input{min-height:48px}
.ct-kic{width:44px;height:44px;flex:none;border-radius:12px;display:grid;place-items:center;background:#EAEDFF;color:#3B4FD0}.k-aivideo{background:#F3E8FF;color:#7A3BD0}.k-doc{background:#E3F3FC;color:#006ABF}.k-quiz,.k-assign{background:#E7F8E8;color:#009116}.k-book{background:#FFF3E0;color:#EF6D00}.k-youtube{background:#FFE8EA;color:#DE0027}.k-lib{background:#F1F2F2;color:#4C4D4D}
.ct-need{font-size:15px;color:#6C6C6C}.ct-need[hidden]{display:none}
.ct-kinds{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.ct-kind{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;min-height:156px;padding:14px;border-radius:14px;border:1px solid #EAEBEB;background:#fff;font:inherit;color:#2A2B2B;cursor:pointer;position:relative}.ct-kind:hover,.ct-kind:focus-visible{border-color:#5C74F6;box-shadow:0 0 0 3px #EAEDFF}
.ct-kind b{font-size:16px;line-height:1.35}.ct-kind small{font-size:14px;color:#6C6C6C;line-height:1.45}.ct-kind em{margin-top:auto;font-style:normal;font-size:13px;color:#808181}
.ctf{font-size:16px;color:#2A2B2B}.ctf-bulk{border:1px solid #D5DBFF;background:#F5F7FF;border-radius:14px;padding:12px 14px;margin:0 0 14px}.ctf-bq{margin:0 0 10px;display:flex;flex-direction:column;gap:2px}.ctf-bq b{font-size:16px}.ctf-bq small{font-size:14px;color:#5B5C5C}.ctf-bb{display:flex;flex-wrap:wrap;gap:8px}.ctf-bb .ct-btn{background:#fff}.ctb-map{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:6px}.ctb-map li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 10px;align-items:baseline;background:#F6F7F7;border-radius:10px;padding:8px 12px}.ctb-map b{grid-row:1 / span 3;grid-column:1;color:#3B55E6;font-size:15px;min-width:3.6em}.ctb-map .ctb-t,.ctb-map .ctb-f{grid-column:2}.ctb-t{font-weight:600;overflow-wrap:anywhere}.ctb-f{font-size:14px;color:#5B5C5C;display:flex;gap:6px;align-items:center;overflow-wrap:anywhere;min-width:0}.ctb-f small{color:#8A8B8B}.ctf-top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:0 0 12px}.ctf-sum{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}.ctf-sum b{font-size:22px}.ctf-later{font-size:14px;color:#009116;background:#E7F8E8;border-radius:999px;padding:3px 10px;margin-left:4px}
.ctf-undo{position:static;display:flex;align-items:center;gap:10px;justify-content:space-between;background:#2A2B2B;color:#fff;border-radius:12px;padding:6px 6px 6px 14px;margin:0 0 10px;flex-wrap:wrap}.ctf-undo .ct-btn{background:#fff}
.ctf-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.ctf-s{border-radius:14px;background:#F6F7F7;overflow:hidden}.ctf-s.on{background:#fff;border:1px solid #C8C9C9;overflow:visible}
.ctf-s.on>.ctf-body{padding-top:10px}.ctf-s.on>.ctf-sh{position:sticky;top:0;z-index:2;background:#fff;border-radius:14px 14px 0 0;box-shadow:0 1px 0 #EAEBEB}
.ctf-nextb{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;background:#EAEDFF;border-radius:12px;padding:8px 8px 8px 14px;margin:0 0 10px;font-size:15px}.ctf-nextb .ct-btn{min-height:44px}.ctf-nextb .ct-btn.pri{background:#2A2B2B;color:#fff;border-color:#2A2B2B}
.ct-kinds.cmp .ct-kind{min-height:56px;flex-direction:row;align-items:center;padding:8px 12px}.ct-kinds.cmp .ct-kind small,.ct-kinds.cmp .ct-kind em{display:none}.ct-kinds.cmp .ct-kic{width:32px;height:32px}.ct-kinds.cmp .ct-kind b{font-size:15px}
.ctf-sh{width:100%;display:flex;align-items:center;gap:12px;min-height:64px;padding:8px 14px;border:0;background:transparent;font:inherit;text-align:left;cursor:pointer;color:inherit}.ctf-sh>.ct-ic{flex:none;color:#808181;transition:transform .15s}.ctf-s.on .ctf-sh>.ct-ic{transform:rotate(90deg)}
.ctf-n{width:36px;height:36px;flex:none;border-radius:50%;background:#fff;border:1px solid #C8C9C9;display:grid;place-items:center;font-weight:700;font-size:15px}.ctf-s.has .ctf-n{background:#00C53B;border-color:#00C53B;color:#fff}
.ctf-tt{flex:1;min-width:0}.ctf-tt b{display:block;font-size:16px;line-height:1.4;overflow-wrap:anywhere}.ctf-tt small{display:block;color:#6C6C6C;font-size:14px}
.ctf-body{padding:0 14px 14px}.ctf-q{font-weight:700;margin:10px 0 10px}.ctf-its{list-style:none;padding:0;margin:0;display:grid;gap:6px}.ctf-its li{display:flex;align-items:center;gap:10px;background:#F6F7F7;border-radius:12px;padding:6px 6px 6px 8px}
@media (max-width:860px){.ct-kinds{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.ctf-bb .ct-btn{flex:1 1 100%;justify-content:flex-start}}
@media (max-width:600px){.ct-wrap{padding:0;align-items:flex-end}.ct-sh{border-radius:16px 16px 0 0;max-height:94dvh;width:100%}.ct-bd{padding:12px 16px 16px}.ct-now{margin:10px 16px 0}.ct-ft{padding:10px 16px calc(10px + env(safe-area-inset-bottom))}.ct-pri{flex:1;min-width:0}.ct-fl:empty{display:none}
 .ct-a4{padding:20px 18px;font-size:14px}.ct-a4 h1{font-size:20px}.ct-two{grid-template-columns:1fr}.ct-kind{min-height:140px;padding:12px}.ct-steps{margin:6px 12px 0}.ct-steps li{font-size:13px}.ct-thumbs{grid-template-columns:repeat(3,minmax(0,1fr))}.ctf-top .ct-ai{width:100%}}
/* v36 만들기: 설정 + 실시간 미리보기 */
.ct-sh.wide{width:min(1240px,100%);height:calc(100dvh - 32px)}
.ct-sh.wide .ct-bd{padding:0;overflow:hidden;display:flex}
.ct-mk{display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);flex:1;min-height:0;width:100%}
.ct-set{overflow:auto;padding:16px 18px 24px;border-right:1px solid #EAEBEB;overscroll-behavior:contain}
.ct-set .ct-f{margin:0 0 14px}.ct-set .ct-ex{margin:-8px 0 12px}.ct-set>.ct-ai{margin:0 0 16px}.ct-mkb{width:100%;margin:6px 0 8px}
.ct-pv{display:flex;flex-direction:column;min-width:0;min-height:0;background:#F1F2F2}
.ct-pvh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:10px 18px;border-bottom:1px solid #EAEBEB;background:#fff}.ct-pvh b{font-size:15px}.ct-pvh small{color:#5B5C5C;font-size:14px}
.ct-pvb{flex:1;overflow:auto;padding:18px;overscroll-behavior:contain}
.ct-pvempty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;min-height:300px;border:2px dashed #C8C9C9;border-radius:16px;color:#4C4D4D;padding:24px;background:#fff}.ct-pvempty b{font-size:17px;color:#2A2B2B}.ct-pvempty .ct-ic{color:#5C74F6}
.ct-sub{font-weight:500;color:#6C6C6C;font-size:13px}.ct-vh{display:block;font-size:14px;color:#4C4D4D;margin:0 0 4px}.ct-in{margin:8px 0 0 !important}
.ct-set select,.ct-f select{width:100%;min-height:48px;font:inherit;font-size:16px;padding:0 12px;border:1px solid #C8C9C9;border-radius:10px;background:#fff;color:#2A2B2B}
.ct-chip.sm{min-height:40px;padding:0 14px;font-size:15px}
.ct-ce{cursor:text;border-radius:6px;outline:1px dashed transparent;outline-offset:2px;transition:outline-color .12s,background .12s;white-space:pre-wrap;overflow-wrap:anywhere}
.ct-ce:hover,.ct-ce:focus-visible{outline-color:#8EA0FA;background:rgba(92,116,246,.06)}
.ct-ce.on{outline:2px solid #5C74F6;background:#fff;box-shadow:0 0 0 4px rgba(92,116,246,.15)}
.ct-ce:empty::before{content:attr(data-ph);color:#9A9B9B}
.ct-x{width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:#808181;display:inline-grid;place-items:center;cursor:pointer;vertical-align:middle;margin-left:4px;opacity:.55}.ct-x:hover{background:#FFE8EA;color:#DE0027;opacity:1}
.ct-xadd{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;margin:6px 6px 6px 0;border:1px dashed #8EA0FA;border-radius:999px;background:#fff;color:#3B4FD0;font:inherit;font-size:15px;font-weight:600;cursor:pointer}.ct-xadd:hover{background:#EAEDFF}
.ct-ttl{margin:0 0 10px}.ct-ttlh{font-size:20px;margin:0;display:inline-block;padding:2px 4px}
.ct-a4 h1.ct-ce{display:block}.ct-a4 h2 .ct-x{opacity:0}.ct-a4 h2:hover .ct-x,.ct-a4 li:hover .ct-x{opacity:.7}.ct-a4 li .ct-x{opacity:0}
.ct-qs .ct-q p::before{content:none}.ct-qn{width:28px;height:28px;flex:none;border-radius:50%;background:#2A2B2B;color:#fff;display:grid;place-items:center;font-size:14px;font-weight:700;margin-top:6px}
.ct-qt{flex:1;min-width:0}.ct-qt p{margin:6px 0 2px;font-weight:700;line-height:1.5}.ct-qty{font-size:13px;color:#808181}
.ct-ansb{width:26px;height:26px;flex:none;border-radius:50%;border:2px solid #AAABAB;background:#fff;display:grid;place-items:center;cursor:pointer;color:#fff;padding:0}.ct-op li.a .ct-ansb{background:#00C53B;border-color:#00C53B}
.ct-oxr{display:flex;gap:8px;align-items:center;margin:4px 0}.ct-ansr{margin:4px 0}.ct-ansr b{color:#009116}
.ct-qs.ro .ct-op li{color:#2A2B2B}.ct-rad,.ct-box{width:18px;height:18px;flex:none;border:2px solid #AAABAB;border-radius:50%;display:inline-block}.ct-box{border-radius:4px}
.ct-ansbox{border:1px dashed #C8C9C9;border-radius:10px;padding:14px;color:#808181;font-size:14px;background:#fff;margin:6px 0}
.ct-exs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.ct-exs>*{background:#fff;border:1px solid #EAEBEB;border-radius:999px;padding:4px 12px;font-size:14px}.ct-exs b{background:#2A2B2B;color:#fff;border-color:#2A2B2B}
.ct-sw{display:flex;align-items:center;gap:10px;min-height:48px;width:100%;text-align:left;border:1px solid #C8C9C9;border-radius:10px;background:#fff;padding:6px 12px;font:inherit;font-size:15px;cursor:pointer;color:#2A2B2B}.ct-sw i{width:40px;height:24px;border-radius:999px;background:#C8C9C9;position:relative;flex:none}.ct-sw i::after{content:'';position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s}.ct-sw.on{border-color:#5C74F6;background:#F5F7FF}.ct-sw.on i{background:#5C74F6}.ct-sw.on i::after{left:19px}
.ct-paper{background:#fff;border-radius:12px;padding:16px;border:1px solid #EAEBEB}.ct-ptop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:2px solid #2A2B2B;padding-bottom:8px;margin-bottom:8px}.ct-timer{background:#FFE8EA;color:#DE0027;font-weight:700;border-radius:999px;padding:4px 12px;font-size:14px}
.ct-svm{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 8px 36px}.ct-svsel{flex:1 1 220px}.ct-svsel .ct-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.ct-svm select{min-height:40px;font:inherit;font-size:15px;border:1px solid #C8C9C9;border-radius:8px;padding:0 10px;background:#fff;width:100%}
.ct-sv .ct-op,.ct-sv .ct-scale,.ct-sv .ct-ansbox,.ct-sv .ct-xadd{margin-left:36px}.ct-scale{display:flex;gap:6px;flex-wrap:wrap}.ct-scale span{display:flex;flex-direction:column;align-items:center;gap:4px;background:#fff;border:1px solid #EAEBEB;border-radius:10px;padding:6px 8px;min-width:76px;font-size:14px;text-align:center}.ct-scale i{font-style:normal;font-weight:800;color:#5C74F6}
.ct-asg{background:#fff;border-radius:12px;padding:18px;border:1px solid #EAEBEB}.ct-asg h4{margin:16px 0 6px;font-size:16px}.ct-asg .pre{white-space:pre-wrap;line-height:1.6}.ct-due{display:inline-block;background:#FFF3E0;color:#A84A00;border-radius:999px;padding:3px 12px;font-size:14px;font-weight:700;margin:0}
.ct-rbt{width:100%;border-collapse:collapse;font-size:15px}.ct-rbt th,.ct-rbt td{border:1px solid #EAEBEB;padding:8px;text-align:left;vertical-align:top}.ct-rbt th{background:#F6F7F7}
.ct-tpls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ct-tpl{display:flex;flex-direction:column;gap:2px;text-align:left;padding:6px 6px 8px;border:2px solid #EAEBEB;border-radius:12px;background:#fff;font:inherit;cursor:pointer;color:#2A2B2B}.ct-tpl canvas{width:100%;height:auto;border-radius:6px;display:block;background:#F1F2F2}.ct-tpl b{font-size:14px;margin-top:4px}.ct-tpl small{font-size:12px;color:#6C6C6C;line-height:1.35}.ct-tpl.on{border-color:#5C74F6;box-shadow:0 0 0 3px #EAEDFF}
.ct-avs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.ct-av{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 2px;border:2px solid #EAEBEB;border-radius:12px;background:#fff;font:inherit;cursor:pointer;color:#2A2B2B;min-height:96px}.ct-av canvas{width:56px;height:56px}.ct-av small{font-size:12px;line-height:1.25;text-align:center}.ct-av.on{border-color:#5C74F6;box-shadow:0 0 0 3px #EAEDFF}.ct-avn{width:56px;height:56px;border-radius:50%;background:#F1F2F2;display:grid;place-items:center;color:#808181}
.ct-h4{margin:14px 0 8px;font-size:16px}.ct-scn>li.on{outline:2px solid #5C74F6}.ct-scnh{flex:1;font-weight:700;font-size:16px;padding:6px}.ct-say{margin:4px 0 0;line-height:1.55}
.ct-pvb .ct-a4{max-width:720px}.ct-pvb .ct-qs>li{background:#fff}.ct-pvb .ct-scn>li{background:#fff}.ct-pvb .ct-book li{background:#fff}
@media (max-width:860px){.ct-sh.wide{height:auto;max-height:94dvh}.ct-sh.wide .ct-bd{overflow:auto;display:block}.ct-mk{display:block}.ct-set{border-right:0;border-bottom:1px solid #EAEBEB;overflow:visible;padding:12px 16px}.ct-pvb{overflow:visible;padding:12px}.ct-pvh{position:sticky;top:0;z-index:3}.ct-avs{grid-template-columns:repeat(5,minmax(0,1fr))}.ct-svm,.ct-sv .ct-op,.ct-sv .ct-scale,.ct-sv .ct-ansbox,.ct-sv .ct-xadd{margin-left:0}}
`;

  /* ── 내보내기 ── */
  /* v36 인터페이스(B 과정 만들기 흐름이 부름):
     CT.open('exam', { course, week, title, from:'flow', preset:{ examKind:'mid'|'final'|'test', n:출제 문항 수, mult:배수, time:분, retake:재응시 횟수, pass:통과 점수(0=없음), random:true }, onDone(item, 'exam') })
       → item = { type:'exam', title, ek, qs:[문제 은행 n×mult], time, retake, pool:{n, mult}, rules:{ shuffle, draw:n(랜덤 출제 수, 0=전부), pass:{on,v}, retry:{mode,v}, from, to, show } }
     CT.open('survey', { …, preset:{ n:문항 수 }, onDone(item, 'survey') }) → item = { type:'survey', title, qs:[{id,q,t:'single'|'multi'|'text',opts,req,scale?}], mins, doneMsg, rules }
     CT.makers: 실시간 미리보기 만들기 종류 */
  W.CT = { makers: [...MK], examBank, svDraft, open, pick, close: () => close(), kinds: KINDS.map(k => ({ ...k, icon: svg(k.k, 24) })), renderFill, fillAll, aiFill: d => { try { W.CF && CF.snap && CF.snap('AI SAM이 채우기 전'); } catch (e) { } const r = fillAll(d); refill(); return r; }, toCourse, sweep, toItem: recToItem, toRec: itemToRec, preview, link: linkCreated, hook: hookCF, steps: STEPS, gen: GEN };
})();
