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
  const unit = () => { try { const c = W.CF && CF.cfg && CF.cfg[S.org.type]; if (c && c.terms && c.terms.sess) return c.terms.sess; } catch (e) { } return S && S.org && S.org.type === 'univ' ? '주차' : '차시'; };
  /* 받침에 맞는 조사: jo('강좌', '을') → '강좌를' · jo('훈련과정', '이') → '훈련과정이' */
  const jo = (w, a) => { const s = String(w ?? ''); const t = s.replace(/[」』"')\]\s]+$/, ''); const ch = t.charCodeAt(t.length - 1); const jong = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : /[0-9]$/.test(t) ? ([0, 1, 3, 6, 7, 8].includes(+t.slice(-1)) ? 1 : 0) : /[lmnr]$/i.test(t) ? 1 : 0; const P = { '을': ['을', '를'], '이': ['이', '가'], '은': ['은', '는'], '과': ['과', '와'], '으로': ['으로', '로'] }[a]; return s + (P ? (jong && !(a === '으로' && jong === 8) ? P[0] : P[1]) : a); };
  try { if (typeof ITEMX === 'object' && ITEMX && !ITEMX.audio) ITEMX.audio = '음성'; } catch (e) { } /* 운영자 목차 라벨: 올린 음성(type 'audio') */
  const HPMx = () => (typeof HPM === 'object' && HPM) || W.HPM || null;
  const clibL = () => (S.clib = Array.isArray(S.clib) ? S.clib : []);
  const P = { /* 선 굵기가 같은 아이콘(24 격자) */
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    aivideo: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 10l4-2v8l-4-2"/><path d="M9 9l.8 1.7L11.5 11l-1.7.8L9 13.5l-.8-1.7L6.5 11l1.7-.3z"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1V14M12 17h.01"/>',
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
    { k: 'assign', name: '과제 만들기', one: '과제 안내와 채점 기준을 함께 만듭니다', time: '30초' },
    { k: 'book', name: '디지털북 만들기', one: '읽고 · 풀고 · 쓰며 익히는 교재', time: '1분' },
    { k: 'youtube', name: 'YouTube 영상 넣기', one: 'YouTube 주소를 붙여 넣습니다', time: '1분' },
    { k: 'lib', name: '라이브러리에서 가져오기', one: '이미 만들어 둔 콘텐츠를 고릅니다', time: '30초' }
  ];
  const KN = Object.fromEntries(KINDS.map(x => [x.k, x]));
  const icOf = it => (it && it.type === 'audio') || /^audio/.test((it && it.mime) || '') ? 'audio' : (KN[TYPE_KIND(it || {})] ? TYPE_KIND(it) : 'doc');
  const STEPS = { upload: ['파일 고르기', '확인하고 넣기'], aivideo: ['주제 확인', '만들기', '미리보기'], doc: ['주제 확인', '미리보기'], quiz: ['주제 확인', '미리보기'], assign: ['주제 확인', '미리보기'], book: ['주제 확인', '미리보기'], youtube: ['주소 붙여 넣기', '확인하고 넣기'], lib: ['고르기', '확인하고 넣기'] };
  const TYPE_KIND = it => it.type === 'audio' ? 'upload' : it.type === 'video' ? (it.src === 'ai' ? 'aivideo' : it.src === 'upload' ? 'upload' : 'youtube') : it.type === 'doc' ? (it.src === 'book' ? 'book' : it.src === 'upload' ? 'upload' : 'doc') : it.type === 'exam' ? 'quiz' : it.type;
  const TYPE_LABEL = it => ({ aivideo: 'AI 영상', upload: it.type === 'video' ? '영상' : it.type === 'audio' ? '음성' : '자료', youtube: 'YouTube', doc: '교안', book: '디지털북', quiz: it.type === 'exam' ? '시험' : '퀴즈', assign: '과제' }[TYPE_KIND(it)] || (typeof ITEMX === 'object' && ITEMX[it.type]) || it.type);

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
  const mb = n => n >= 1024 ** 3 ? (n / 1024 ** 3).toFixed(1) + 'GB' : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + 'MB';

  /* ── 창 상태 ── */
  let X = null; /* { kind, ctx, step, topic, mins, n, lv, fmt, res, by, busy, file, url, pick, done } */
  const sessTitle = ctx => cl((ctx && (ctx.title || (ctx.sess && ctx.sess.title))) || '');
  const courseName = ctx => cl((ctx && ctx.course && ctx.course.name) || '');
  const seedTopic = ctx => { const st = sessTitle(ctx); const cn = courseName(ctx); const g = /^\d+\s*(차시|주차|주|회차)$/.test(st) || !st; return topicOf(g ? cn || st : st) || cn || ''; };
  const where = () => { const c = X.ctx; if (X.ctx.from === 'lib' && !c.course) return '콘텐츠 라이브러리에 저장합니다'; const w = c.week ? `${c.week}${unit()}` : ''; const st = sessTitle(c); return `${w ? w + ' · ' : ''}${st && !/^\d+\s*(차시|주차|주)$/.test(st) ? `「${st}」` : courseName(c) ? `「${courseName(c)}」` : ''}에 넣습니다`.replace(/^에 넣습니다$/, '이 차시에 넣습니다'); };
  const doneLabel = () => X.ctx.from === 'lib' && !X.ctx.course ? '라이브러리에 저장' : (X.ctx.item ? '이 콘텐츠로 바꾸기' : `이 ${unit()}에 넣기`);

  function open(kind, ctx) {
    if (!S) return; ctx = ctx || {}; if (!KN[kind]) kind = 'doc'; if (kind === 'lib' && ctx.from === 'lib' && !ctx.course) kind = 'doc';
    X = { kind, ctx, step: 0, topic: seedTopic(ctx), mins: 5, n: 5, lv: '보통', fmt: 'hand', units: 3, res: null, by: '', busy: false };
    if (ctx.item) prefill(ctx.item);
    mount(); draw(); return true;
  }
  function prefill(it) { const k = TYPE_KIND(it); if (k !== X.kind) return; if (k === 'aivideo' && it.ai?.scenes?.length) { X.res = JSON.parse(JSON.stringify(it.ai.scenes)); X.mins = it.ai.mins || 5; X.step = 2; }
    if (k === 'doc' && it.doc?.secs?.length) { X.res = JSON.parse(JSON.stringify(it.doc)); X.fmt = it.fmt || 'hand'; X.step = 1; } if (k === 'quiz' && it.qs?.length) { X.res = JSON.parse(JSON.stringify(it.qs)); X.step = 1; }
    if (k === 'youtube' && it.url) X.url = it.url; if (it.topic) X.topic = topicOf(it.topic); }
  function mount() {
    close(true); injectCSS();
    const w = document.createElement('div'); w.className = 'ct-wrap'; w.id = 'ctSheet';
    w.innerHTML = `<div class="ct-sh" role="dialog" aria-modal="true" aria-labelledby="ctTitle"><div class="ct-hd"><button type="button" class="ct-icb" data-act="ct-back" aria-label="이전">${svg('back', 22)}</button><div class="ct-ht"><b id="ctTitle"></b><small id="ctWhere"></small></div><button type="button" class="ct-icb" data-act="ct-close" aria-label="닫기">${svg('x', 22)}</button></div><ol class="ct-steps" id="ctSteps"></ol><p class="ct-now" id="ctNow"></p><div class="ct-bd" id="ctBody"></div><div class="ct-ft" id="ctFoot"></div></div>`;
    document.body.appendChild(w);
    w.addEventListener('click', e => { if (e.target === w) close(); });
    w.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    setTimeout(() => { const f = w.querySelector('.ct-bd input, .ct-bd textarea, .ct-ft .ct-pri'); f && f.focus({ preventScroll: true }); }, 30);
  }
  function close(silent) { const w = $1('#ctSheet'); if (w) w.remove(); if (!silent) { X = null; } }

  /* ── 화면 그리기 ── */
  function draw() {
    const w = $1('#ctSheet'); if (!w || !X) return; const K = KN[X.kind]; const ST = STEPS[X.kind];
    $1('#ctTitle').textContent = X.done ? '저장했습니다' : K.name; $1('#ctWhere').textContent = X.done ? '' : where();
    $1('#ctSteps').innerHTML = X.done ? '' : ST.map((s, i) => `<li class="${i < X.step ? 'ok' : i === X.step ? 'on' : ''}" ${i === X.step ? 'aria-current="step"' : ''}><i>${i < X.step ? svg('check', 14) : i + 1}</i><span>${E(s)}</span></li>`).join('');
    w.querySelector('[data-act=ct-back]').style.visibility = X.step > 0 && !X.done && !X.busy ? 'visible' : 'hidden';
    const R = X.done ? vDone() : (VIEW[X.kind] || VIEW.doc)();
    $1('#ctNow').innerHTML = R.now ? `<b>지금 할 일</b> ${E(R.now)}` : ''; $1('#ctNow').hidden = !R.now;
    $1('#ctBody').innerHTML = R.body; $1('#ctFoot').innerHTML = R.foot || '';
    if (R.after) R.after($1('#ctBody'));
  }
  const pri = (label, act, dis, extra) => `<button type="button" class="ct-btn ct-pri" data-act="${act}" ${dis ? 'disabled aria-disabled="true"' : ''} ${extra || ''}>${label}</button>`;
  const sec = (label, act, extra) => `<button type="button" class="ct-btn" data-act="${act}" ${extra || ''}>${label}</button>`;
  const foot = (main, left) => `<div class="ct-fl">${left || ''}</div>${main}`;
  const busyBox = m => `<div class="ct-busy" role="status"><span class="ct-spin" aria-hidden="true"></span>${E(m)}</div>`;
  const topicField = (lab, ex) => `<label class="ct-f"><span class="ct-l">${E(lab)}</span><input id="ctTopic" value="${E(X.topic)}" maxlength="80" autocomplete="off"></label><p class="ct-ex">예: ${E(ex)}</p><button type="button" class="ct-btn ct-ai" data-act="ct-aifill">${svg('spark', 18)} AI SAM이 채워 주기</button>`;
  const chips = (key, opts, lab) => `<div class="ct-f"><span class="ct-l">${E(lab)}</span><div class="ct-chips" role="radiogroup" aria-label="${E(lab)}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${String(X[key]) === String(v)}" class="ct-chip ${String(X[key]) === String(v) ? 'on' : ''}" data-act="ct-opt" data-k="${key}" data-v="${E(v)}">${E(l)}</button>`).join('')}</div></div>`;

  const VIEW = {};
  /* 교안 */
  VIEW.doc = () => {
    if (X.step === 0) return { now: '주제를 확인하고 [교안 만들기]를 누르세요.', body: topicField('교안 주제', '엑셀 함수로 매출 합계 구하기') + chips('fmt', [['hand', '교안'], ['work', '실습지'], ['slide', '슬라이드 요약']], '모양'), foot: foot(pri(`${svg('spark', 18)} 교안 만들기`, 'ct-make', !X.topic && false)) };
    if (X.busy || !X.res) return { now: '', body: busyBox('교안을 만들고 있습니다…'), foot: '' };
    return { now: '미리보기를 확인하고 넣으세요. 고칠 곳은 [글 고치기]에서 바꿀 수 있습니다.', body: `${byNote(X.by)}<div class="ct-tools">${sec(`${svg('down', 18)} 내려받기`, 'ct-doc-dl')}${sec(`${svg('print', 18)} 인쇄 · PDF`, 'ct-doc-print')}${sec(X.edit ? '미리보기로' : '글 고치기', 'ct-doc-edit')}${sec('다시 만들기', 'ct-make')}</div>${X.edit ? docEdit() : a4(X.res)}`, foot: foot(pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done')) };
  };
  const fmtName = { hand: '강의 교안', work: '실습 워크시트', slide: '슬라이드 요약' };
  function a4(D) {
    const f = X.fmt; return `<article class="ct-a4" aria-label="교안 미리보기"><header><small>${E(S.org.name)}${courseName(X.ctx) ? ' · ' + E(courseName(X.ctx)) : ''} · ${fmtName[f]}</small><h1>${E(docTitle())}</h1></header>
      <section class="ct-a4box"><b>학습 목표</b><ul>${D.goals.map(g => `<li>${E(g)}</li>`).join('')}</ul></section>
      ${D.secs.map((s, i) => `<h2>${i + 1}. ${E(s.h)}</h2>${f === 'slide' ? '' : `<p>${E(s.body)}</p>`}<ul>${(s.pts || []).map(p => `<li>${E(p)}</li>`).join('')}</ul>${f === 'work' ? '<div class="ct-ln"></div><div class="ct-ln"></div>' : ''}`).join('')}
      <h2>실습 활동</h2><p>${E(D.act)}</p><h2>확인 문제</h2><ol>${D.check.map(q => `<li>${E(q)}${f === 'work' ? '<div class="ct-ln"></div>' : ''}</li>`).join('')}</ol><footer>AI 초안을 바탕으로 담당자가 검토한 자료입니다 · ${E(today())}</footer></article>`;
  }
  function docEdit() { const D = X.res; return `<div class="ct-edit"><label class="ct-f"><span class="ct-l">학습 목표 (줄마다 하나)</span><textarea rows="3" data-ctd="goals">${E(D.goals.join('\n'))}</textarea></label>${D.secs.map((s, k) => `<div class="ct-card"><label class="ct-f"><span class="ct-l">${k + 1}절 제목</span><input data-cts="${k}" data-f="h" value="${E(s.h)}"></label><label class="ct-f"><span class="ct-l">본문</span><textarea rows="3" data-cts="${k}" data-f="body">${E(s.body)}</textarea></label></div>`).join('')}<label class="ct-f"><span class="ct-l">실습 활동</span><textarea rows="2" data-ctd="act">${E(D.act)}</textarea></label><label class="ct-f"><span class="ct-l">확인 문제 (줄마다 하나)</span><textarea rows="3" data-ctd="check">${E(D.check.join('\n'))}</textarea></label></div>`; }
  const docTitle = () => { const st = sessTitle(X.ctx); return `${X.topic || st || '강의'} ${X.fmt === 'work' ? '실습지' : '교안'}`.replace(/\s+/g, ' ').trim(); };
  const docItem = () => ({ title: docTitle(), topic: X.topic, fmt: X.fmt, doc: X.res });

  /* AI 강의 영상: 주제 확인 → [영상 만들기] 한 번(대본 + 슬라이드 자동) → 미리보기(대본 고치기는 여기서) */
  VIEW.aivideo = () => {
    const sc = X.res || [];
    if (X.step === 0) {
      if (X.busy) return { now: '', body: busyBox('대본을 쓰고 있습니다… 다 되면 슬라이드를 바로 그립니다.'), foot: '' };
      return { now: '주제를 확인하고 [AI 강의 영상 만들기]를 누르세요. 대본과 슬라이드를 한 번에 만듭니다.', body: topicField('영상 주제', 'AI에게 일을 잘 시키는 세 가지 방법') + chips('mins', [[3, '3분'], [5, '5분'], [10, '10분']], '길이'), foot: foot(pri(`${svg('spark', 18)} AI 강의 영상 만들기`, 'ct-make')) };
    }
    if (X.step === 1) return { now: '', body: `<div class="ct-busy" role="status"><span class="ct-spin" aria-hidden="true"></span>슬라이드를 그리고 있습니다… <b id="ctVn">0</b> / ${sc.length}</div><div class="ct-thumbs" id="ctThumbs"></div>`, foot: '', after: buildSlides };
    const tot = sc.reduce((a, s) => a + (typeof secsFor === 'function' ? secsFor(s.say) : 6), 0);
    const ed = X.edit ? `<div class="ct-row"><span class="ct-mini">${sc.length}장면 · 약 ${Math.max(1, Math.round(tot / 60))}분 · 고친 뒤 [고친 대본으로 다시 그리기]를 누르세요.</span></div><ol class="ct-scn">${sc.map((s, k) => `<li><div class="ct-sh2"><b>${k + 1}</b><input data-ctv="${k}" data-f="h" value="${E(s.h)}" aria-label="${k + 1}장면 제목"><button type="button" class="ct-icb sm" data-act="ct-v-del" data-v="${k}" aria-label="${k + 1}장면 빼기" ${sc.length <= 2 ? 'disabled' : ''}>${svg('trash', 18)}</button></div><label class="ct-f"><span class="ct-l">읽어 줄 말</span><textarea rows="2" data-ctv="${k}" data-f="say">${E(s.say)}</textarea></label><p class="ct-mini">화면 글: ${E((s.pts || []).join(' · '))}</p></li>`).join('')}</ol><div class="ct-row">${sec(`${svg('spark', 18)} 고친 대본으로 다시 그리기`, 'ct-v-make')}</div>` : '';
    return { now: X.edit ? '대본을 고치고 [고친 대본으로 다시 그리기]를 누르세요. 고치지 않아도 넣을 수 있습니다.' : '미리보기를 확인하고 넣으세요. 대본은 [대본 고치기]에서 바꿀 수 있습니다.', body: `${byNote(X.by)}<div class="ct-note"><b>미리보기 품질</b> 브라우저가 대본을 읽어 주는 슬라이드 영상입니다. 사람 목소리에 가까운 음성과 MP4 파일은 운영 서버 연결 후 제공됩니다.</div>${X.edit ? '' : `<div class="ct-player"><canvas id="ctCv" width="1280" height="720" aria-label="AI 강의 첫 장면"></canvas><button type="button" class="ct-playb" data-act="ct-v-play" aria-label="소리와 함께 재생">${svg('play', 34)}</button></div><div class="ct-thumbs" id="ctThumbs"></div>`}<div class="ct-tools">${X.edit ? '' : sec(`${svg('play', 18)} 소리와 함께 재생`, 'ct-v-play')}${sec(X.edit ? '미리보기로' : '대본 고치기', 'ct-doc-edit')}${X.edit ? '' : sec(`${svg('down', 18)} 영상 파일로 저장(WebM)`, 'ct-v-rec')}${sec('주제로 다시 만들기', 'ct-make')}</div>${ed}`, foot: foot(pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done')), after: el => { if (!X.edit) { thumbs(el, true); drawBig(0); } } };
  };
  const vTitle = () => `${X.topic || sessTitle(X.ctx) || '강의'}`.trim();
  function slideTo(cv, i) { const g = cv.getContext('2d'); const s = X.res[i]; try { drawSlide(g, s, i, X.res.length, vTitle(), sentences(s.say)[0] || '', (i + 1) / X.res.length); } catch (e) { } }
  function drawBig(i) { const cv = $1('#ctCv'); if (cv) slideTo(cv, i); document.querySelectorAll('#ctThumbs button').forEach((b, k) => b.classList.toggle('on', k === i)); }
  function thumbs(el, clickable) { const box = $1('#ctThumbs', el); if (!box) return; box.innerHTML = X.res.map((s, k) => `<button type="button" ${clickable ? `data-act="ct-v-show" data-v="${k}"` : 'tabindex="-1"'} aria-label="${k + 1}장면 ${E(s.h)}"><canvas width="1280" height="720"></canvas><small>${k + 1}. ${E(s.h)}</small></button>`).join(''); box.querySelectorAll('canvas').forEach((c, k) => slideTo(c, k)); }
  function buildSlides(el) { const box = $1('#ctThumbs', el); const n = X.res.length; let k = 0; box.innerHTML = '';
    const tick = () => { if (!X || X.kind !== 'aivideo' || X.step !== 1) return; if (k >= n) { X.step = 2; draw(); return; }
      box.insertAdjacentHTML('beforeend', `<button type="button" tabindex="-1"><canvas width="1280" height="720"></canvas><small>${k + 1}. ${E(X.res[k].h)}</small></button>`); slideTo(box.lastElementChild.querySelector('canvas'), k); const c = $1('#ctVn'); if (c) c.textContent = k + 1; k++; setTimeout(tick, W.__REC_FAST ? 10 : 180); };
    tick(); }
  const vItem = () => ({ title: `${vTitle()} 강의 영상`, topic: X.topic, ai: { scenes: X.res, mins: +X.mins || 5, voice: 'f', style: 'slide' } });

  /* 퀴즈 */
  VIEW.quiz = () => {
    if (X.step === 0) return { now: '주제를 확인하고 [퀴즈 만들기]를 누르세요.', body: topicField('퀴즈 주제', '엑셀 SUM · AVERAGE 함수') + chips('n', [[3, '3문제'], [5, '5문제'], [10, '10문제']], '문제 수') + chips('lv', [['쉬움', '쉬움'], ['보통', '보통'], ['어려움', '어려움']], '난이도'), foot: foot(pri(`${svg('spark', 18)} 퀴즈 만들기`, 'ct-make')) };
    if (X.busy || !X.res) return { now: '', body: busyBox('문제를 만들고 있습니다…'), foot: '' };
    return { now: '문제를 확인하고 넣으세요. 마음에 들지 않는 문제는 뺄 수 있습니다.', body: `${byNote(X.by)}<div class="ct-tools">${sec('다시 만들기', 'ct-make')}</div><ol class="ct-qs">${X.res.map((q, k) => `<li><div class="ct-q"><p>${E(String(q.q).replace(/^\d+\.\s*/, ''))}</p><button type="button" class="ct-icb sm" data-act="ct-q-del" data-v="${k}" aria-label="${k + 1}번 문제 빼기" ${X.res.length <= 1 ? 'disabled' : ''}>${svg('trash', 18)}</button></div>${q.t === 'mc' ? `<ul class="ct-op">${(q.opts || []).map((o, j) => `<li class="${String(q.a) === String(j) ? 'a' : ''}">${String(q.a) === String(j) ? svg('check', 16) : '<i></i>'}${E(o)}</li>`).join('')}</ul>` : `<p class="ct-ans">정답: <b>${E(q.a)}</b></p>`}${q.exp ? `<p class="ct-mini">해설: ${E(q.exp)}</p>` : ''}</li>`).join('')}</ol>`, foot: foot(pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done')) };
  };
  const qItem = () => { const Q = X.res.map((q, i) => ({ ...q, q: `${i + 1}. ${String(q.q).replace(/^\d+\.\s*/, '')}` })); const per = Math.floor(100 / Q.length); Q.forEach((q, i) => q.pts = per + (i < 100 - per * Q.length ? 1 : 0)); return { title: `${X.topic || sessTitle(X.ctx) || ''} 확인 퀴즈`.trim(), qs: Q, time: 10, retake: 3 }; };

  /* 과제 */
  VIEW.assign = () => {
    if (X.step === 0) return { now: '주제를 확인하고 [과제 만들기]를 누르세요.', body: topicField('과제 주제', '우리 회사 매출표를 피벗으로 정리하기'), foot: foot(pri(`${svg('spark', 18)} 과제 만들기`, 'ct-make')) };
    if (X.busy || !X.res) return { now: '', body: busyBox('과제를 만들고 있습니다…'), foot: '' };
    const A = X.res; return { now: '안내 글을 확인하고 넣으세요. 바로 고칠 수 있습니다.', body: `${byNote(X.by)}<label class="ct-f"><span class="ct-l">과제 안내</span><textarea rows="6" data-cta="desc">${E(A.desc)}</textarea></label><div class="ct-two"><label class="ct-f"><span class="ct-l">제출물</span><input data-cta="deliv" value="${E(A.deliv)}"></label><label class="ct-f"><span class="ct-l">제출 기한(공개 후 며칠)</span><input type="number" min="1" max="60" data-cta="due" value="${E(A.due)}"></label></div><div class="ct-f"><span class="ct-l">채점 기준</span><ul class="ct-rb">${A.rb.criteria.map(c => `<li><b>${E(c.n)}</b><em>${c.pts}점</em><small>${E(c.lv[0])}</small></li>`).join('')}</ul></div>`, foot: foot(pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done')) };
  };
  const aItem = () => ({ title: `${X.topic || sessTitle(X.ctx) || ''} 과제`.trim(), desc: X.res.desc, deliv: X.res.deliv, due: +X.res.due || 7 });

  /* 디지털북 */
  VIEW.book = () => {
    if (X.step === 0) return { now: '주제를 확인하고 [디지털북 만들기]를 누르세요.', body: topicField('디지털북 주제', '생성형 AI로 보고서 쓰기') + chips('units', [[2, '2단원'], [3, '3단원'], [4, '4단원']], '분량'), foot: foot(pri(`${svg('spark', 18)} 디지털북 만들기`, 'ct-make')) };
    if (X.busy || !X.res) return { now: '', body: busyBox('디지털북을 만들고 있습니다…'), foot: '' };
    const b = X.res; const nm = k => (typeof BK_NAME === 'object' && BK_NAME[k]) || k;
    return { now: '단원 구성을 확인하고 넣으세요. 블록은 나중에 디지털북 화면에서 고칠 수 있습니다.', body: `${byNote(X.by)}<div class="ct-tools">${sec('다시 만들기', 'ct-make')}</div><div class="ct-book"><div class="ct-bcov" style="--bk:${E(b.color || '#5C74F6')}"><b>${E(b.title)}</b><small>${E(b.desc || '')}</small></div><ol>${b.chs.map((ch, i) => { const cnt = {}; ch.blocks.forEach(x => cnt[x.type] = (cnt[x.type] || 0) + 1); const tx = (ch.blocks.find(x => x.type === 'text') || {}).body || ''; return `<li><b>${i + 1}단원 · ${E(ch.title)}</b><p>${E(String(tx).replace(/^#.*\n?/gm, '').slice(0, 110))}…</p><small>${Object.entries(cnt).map(([k, n]) => `${E(nm(k))} ${n}`).join(' · ')}</small></li>`; }).join('')}</ol></div>`, foot: foot(pri(`${svg('check', 18)} ${doneLabel()}`, 'ct-done')) };
  };

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
    const name = meta.name || f.name; const url = meta.url || (meta.fileId ? 'media:' + meta.fileId : 'upload:' + name);
    const isV = f.k === 'video' || f.k === 'audio';
    const lib = { id: nid('l'), name: name.slice(0, 80), kind: f.k === 'video' ? '동영상' : f.k === 'audio' ? '음성' : f.k === 'image' ? '사진' : '문서', size: mb(f.size), bytes: f.size, used: 0, cls: [], at: today(), views: 0, drop: 0, conv: isV ? '대기' : '', fileId: meta.fileId || '', url: meta.url || '' };
    if (f.dur) lib.dur = f.dur; if (Array.isArray(S.lib)) S.lib.unshift(lib);
    return { type: f.k === 'audio' ? 'audio' : isV ? 'video' : 'doc', src: 'upload', title: X.upTitle || name, file: name.slice(0, 80), url, fileId: meta.fileId || '', mime: f.mime, size: f.size, lib: lib.id, dur: f.dur || 0, prev: f.bid };
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
  const LF = [['all', '전체'], ['video', '영상 · 음성'], ['doc', '교안 · 자료'], ['quiz', '퀴즈 · 과제'], ['book', '디지털북']];
  const lfOk = (f, k, x) => (f === 'video' && x && ((x.item || x.rec || {}).type === 'audio')) || f === 'all' || (f === 'video' && ['aivideo', 'youtube', 'upload'].includes(k)) || (f === 'doc' && ['doc', 'upload'].includes(k)) || (f === 'quiz' && ['quiz', 'assign'].includes(k)) || (f === 'book' && k === 'book');
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
    if (k === 'assign') it = { type: 'assign', ...aItem(), _rb: X.res.rb };
    if (k === 'book') { const b = X.res; it = { type: 'doc', src: 'book', title: b.title, topic: X.topic, doc: AI.material(X.topic || b.title, { name: courseName(X.ctx) }), _book: b }; }
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
    ['url', 'fileId', 'file', 'mime', 'size', 'dur', 'topic', 'fmt', 'desc', 'deliv', 'due', 'time', 'retake', 'yt', 'q', 'lib', 'book'].forEach(k => { if (it[k] != null && it[k] !== '') r[k] = it[k]; });
    if (it.ai) r.ai = it.ai; if (it.doc) r.doc = it.doc; if (it.qs) r.qs = it.qs; if (it._rb) r.rb = it._rb; if (it._book) r.bookObj = it._book; return r;
  }
  function recToItem(r) {
    if (!r) return null; const it = { type: r.type || (/^audio/.test(r.mime || '') ? 'audio' : null) || ({ aivideo: 'video', youtube: 'video', upload: 'video', doc: 'doc', book: 'doc', quiz: 'quiz', assign: 'assign' }[r.kind] || 'doc'), title: r.title || '콘텐츠' };
    ['src', 'url', 'fileId', 'file', 'mime', 'size', 'dur', 'topic', 'fmt', 'desc', 'deliv', 'due', 'time', 'retake', 'yt', 'q', 'lib', 'book'].forEach(k => { if (r[k] != null && r[k] !== '') it[k] = JSON.parse(JSON.stringify(r[k])); });
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
      try { if (S.ai) S.ai.usage = (S.ai.usage || 0) + (['doc', 'aivideo', 'quiz', 'assign', 'book'].includes(X.kind) ? 1 : 0); } catch (e) { }
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
    'ct-close': () => close(), 'ct-back': () => { if (!X) return; if (X.kind === 'aivideo' && X.step === 2) { X.step = 0; X.res = null; } else if (X.kind === 'upload' && X.step === 1) { X.file = null; X.step = 0; } else if (X.kind === 'lib') X.pick = ''; else if (X.kind === 'youtube') X.url = ''; else X.step = Math.max(0, X.step - 1); X.edit = false; draw(); },
    'ct-aifill': () => { const st = sessTitle(X.ctx), cn = courseName(X.ctx); const g = /^\d+\s*(차시|주차|주|회차)$/.test(st); const ok = v => { v = topicOf(v || ''); return v && v !== '핵심 개념' ? v : ''; };
      const ex = (document.querySelector('#ctSheet .ct-ex') || {}).textContent || ''; const exT = ex.replace(/^예:\s*/, '').trim();
      X.topic = ok(cn && st && !g && !st.includes(cn) ? `${cn} ${st}` : '') || ok(!g ? st : '') || ok(cn) || ok((X.topic || '').trim()) || ok(((X.ctx.course && X.ctx.course.topic) || '')) || ok(cl((S.classes.find(c => c.status !== '종료') || S.classes[0] || {}).name)) || exT || X.topic; draw(); say('주제를 채웠습니다. 그대로 두거나 고쳐 쓰세요.', 'ok'); },
    'ct-opt': el => { const k = el.dataset.k; X[k] = isNaN(+el.dataset.v) ? el.dataset.v : +el.dataset.v;  draw(); },
    'ct-make': async () => { if (!X || X.busy) return; const tp = (X.topic || '').trim() || seedTopic(X.ctx); if (!tp) { const n = $1('#ctTopic'); if (n) { n.setAttribute('aria-invalid', 'true'); n.focus(); } say('주제를 한 줄 적어 주세요. 예처럼 짧게 써도 됩니다.', 'warn'); return; } X.topic = tp; X.busy = true; X.edit = false; X.step = X.kind === 'aivideo' ? 0 : 1; draw();
      const r = await GEN[X.kind](tp, { mins: +X.mins || 5, n: +X.n || 5, lv: X.lv, n2: X.units, cname: courseName(X.ctx), target: (X.ctx.target || '') , ...(X.kind === 'book' ? { n: +X.units || 3 } : {}) }); if (!X) return; X.res = r.v; X.by = r.by; X.busy = false; if (X.kind === 'aivideo') X.step = X.res && X.res.length ? 1 : 0; draw(); },
    'ct-done': () => done(),
    'ct-doc-edit': () => { X.edit = !X.edit; draw(); },
    'ct-doc-dl': () => { const it = { ...docItem(), title: docTitle() }; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([materialHTML(it, courseName(X.ctx))], { type: 'text/html' })); a.download = `${it.title.replace(/[\\/:*?"<>|]/g, '_')}.html`; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 15000); say('교안을 내려받았습니다. 파일을 열어 [인쇄] → [PDF로 저장]할 수 있습니다.', 'ok'); },
    'ct-doc-print': () => { const it = { ...docItem(), title: docTitle() }; const u = URL.createObjectURL(new Blob([materialHTML(it, courseName(X.ctx))], { type: 'text/html' })); const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; f.src = u; document.body.appendChild(f); f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(u, '_blank', 'noopener'); } setTimeout(() => { f.remove(); URL.revokeObjectURL(u); }, 60000); }; },
    'ct-v-make': () => { if (!X.res || !X.res.length) return; X.edit = false; X.step = 1; draw(); },
    'ct-v-del': el => { X.res.splice(+el.dataset.v, 1); draw(); },
    'ct-v-show': el => drawBig(+el.dataset.v),
    'ct-v-play': () => { try { aiPlayer(vTitle(), X.res, 'f'); } catch (e) { say('이 브라우저에서는 재생할 수 없습니다.', 'warn'); } },
    'ct-v-rec': () => { try { aiRecord(vTitle(), X.res, null); } catch (e) { say('이 브라우저에서는 영상 파일을 만들 수 없습니다. Chrome · Edge에서 시도하세요.', 'warn'); } },
    'ct-q-del': el => { X.res.splice(+el.dataset.v, 1); draw(); },
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
    if (el.id === 'ctTopic') X.topic = el.value; if (el.id === 'ctUpT') X.upTitle = el.value;
    if (el.id === 'ctUrl') { X.url = el.value.trim(); X.yt = null; clearTimeout(X.ut); X.ut = setTimeout(() => { if (!X) return; const pos = el.selectionStart; draw(); const n = $1('#ctUrl'); if (n && !ytId(X.url)) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { } } }, 350); }
    if (el.id === 'ctLq') { X.lq = el.value; clearTimeout(X.lt); X.lt = setTimeout(() => { if (!X) return; draw(); const n = $1('#ctLq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); }
    if (el.dataset.ctd && X.res) { const k = el.dataset.ctd; X.res[k] = k === 'act' ? el.value : el.value.split('\n').map(x => x.trim()).filter(Boolean); }
    if (el.dataset.cts != null && X.res) X.res.secs[+el.dataset.cts][el.dataset.f] = el.value;
    if (el.dataset.ctv != null && X.res) X.res[+el.dataset.ctv][el.dataset.f] = el.value;
    if (el.dataset.cta && X.res) X.res[el.dataset.cta] = el.value; });
  document.addEventListener('change', e => { const el = e.target; if (el && el.id === 'ctFile' && el.files && el.files[0] && X) takeFile(el.files[0]); });
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
    el.innerHTML = `<div class="ctf"><div class="ctf-top"><div class="ctf-sum"><b>${filled} / ${SS.length}</b><span>${U} 채움</span><span class="ctf-later">나중에 해도 돼요</span></div>${inFlow && !W.CT_FILLBTN ? '' : `<button type="button" class="ct-btn ct-ai" data-act="ctf-all" ${filled === SS.length ? 'disabled' : ''}>`}${inFlow && !W.CT_FILLBTN ? '' : `${svg('spark', 18)} AI SAM이 빈 ${U} 모두 채우기</button>`}</div>
      ${F.undo ? `<div class="ctf-undo" role="status" aria-live="polite"><span>${E(F.undo.msg)}</span><button type="button" class="ct-btn sm" data-act="ctf-undo">${svg('undo', 16)} 되돌리기</button></div>` : ''}
      <ol class="ctf-list">${SS.map(s => { const its = has(s.w); const on = F.open === s.w; return `<li class="ctf-s ${on ? 'on' : ''} ${its.length ? 'has' : ''}" data-w="${s.w}"><button type="button" class="ctf-sh" data-act="ctf-open" data-v="${s.w}" aria-expanded="${on}"><span class="ctf-n">${its.length ? svg('check', 18) : s.w}</span><span class="ctf-tt"><b>${s.w}${U === '주차' ? '주차' : U} · ${E(s.title)}</b><small>${its.length ? its.map(x => E(TYPE_LABEL(x))).join(' · ') : '비어 있음'}</small></span>${svg('chev', 20)}</button>
        ${on ? `<div class="ctf-body">${its.length ? `<ul class="ctf-its">${its.map(x => `<li><span class="ct-kic k-${E(icOf(x) === 'audio' ? 'audio' : TYPE_KIND(x))}">${svg(icOf(x), 18)}</span><span class="ct-lt"><b>${E(x.title)}</b><small>${E(TYPE_LABEL(x))}</small></span><button type="button" class="ct-btn sm" data-act="ctf-view" data-v="${E(x.id)}">보기</button><button type="button" class="ct-icb sm" data-act="ctf-del" data-v="${E(x.id)}" aria-label="「${E(x.title)}」 빼기">${svg('trash', 18)}</button></li>`).join('')}</ul>` : ''}
          <p class="ctf-q">${its.length ? '더 넣을 콘텐츠가 있으면 고르세요' : `이 ${U}에 넣을 콘텐츠를 고르세요`}</p><div class="ct-kinds">${kindCards(s.w)}</div></div>` : ''}</li>`; }).join('')}</ol></div>`;
  }
  const kindCards = (w, lib) => KINDS.filter(k => !(lib && k.k === 'lib')).map(k => `<button type="button" class="ct-kind" data-act="ct-kind" data-ct="${k.k}" data-k="${k.k}" ${w != null ? `data-w="${w}"` : ''}><span class="ct-kic k-${k.k}">${svg(k.k, 24)}</span><b>${E(k.name)}</b><small>${E(k.one)}</small><em>${E(k.time)}</em></button>`).join('');
  const refill = () => { if (F && F.el && F.el.isConnected) renderFill(F.el, F.d); };
  function openFromFill(kind, w) { const d = F.d; const s = sessOf(d).find(x => x.w === w) || { w, title: '' };
    open(kind, { from: 'flow', course: draftCourse(d), week: w, title: s.title, sess: s, target: d.target || '', onDone: it => { if (d.classId && typeof C === 'function' && C(d.classId)) { /* 이미 생성된 과정이면 settle 끝 */ } else settle(it, null); it.week = w; itemsOf(d).push(it); const nx = sessOf(d).find(x => x.w > w && !itemsOf(d).some(y => +y.week === x.w)); F.open = nx ? nx.w : w;
      /* 넣은 직후 다음 빈 차시가 펼쳐져 방금 넣은 항목의 [빼기]가 안 보이므로, 8초 동안 '넣었습니다 [되돌리기]' 띠를 남긴다 */
      const tok = {}; F.undo = { tok, msg: `${jo(`「${it.title}」`, '을')} ${w}${unit()}에 넣었습니다.`, run: () => { const L = itemsOf(d); const i = L.findIndex(x => x.id === it.id); if (i >= 0) L.splice(i, 1); sweep(); F.open = w; } };
      clearTimeout(F.ut); F.ut = setTimeout(() => { if (!F || !F.undo || F.undo.tok !== tok) return; F.undo = null; const b = F.el && F.el.querySelector('.ctf-undo'); if (b) b.remove(); }, W.__CT_UNDO_MS || 8000);
      saveDraft(); refill(); try { W.CF && CF.emit && CF.emit('ct-add', it); } catch (e) { } } }); }
  ACT['ct-kind'] = el => { const k = el.dataset.k; const w = el.dataset.w != null ? +el.dataset.w : null; if (F && w != null && F.el && F.el.contains(el)) return openFromFill(k, w); if (PK) { const ctx = PK; PK = null; closePick(); return open(k, ctx); } open(k, {}); };
  ACT['ctf-open'] = el => { const w = +el.dataset.v; F.open = F.open === w ? 0 : w; refill(); const li = F.el.querySelector(`.ctf-s[data-w="${w}"]`); if (li && F.open) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
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
      if (it.src === 'ai' && it.ai && (it.ai.scenes || []).length) y.ai = { scenes: it.ai.scenes.slice(0, 16).map(q => ({ h: String(q.h || '').slice(0, 120), pts: (q.pts || []).slice(0, 6).map(p => String(p).slice(0, 160)), say: String(q.say || '').slice(0, 800) })), voice: it.ai.voice || 'f' };
      if (it.book) y.book = it.book; }); }); } catch (e) { console.error('crs-content snap', e); } return r; }; }

  /* ── 스타일(이 파일 안에서 주입: 디자인 토큰 dds.css 값을 따른다) ── */
  function injectCSS() { if (document.getElementById('ctCss')) return; const s = document.createElement('style'); s.id = 'ctCss'; s.textContent = CSS; document.head.appendChild(s); }
  const CSS = `
.ct-wrap{position:fixed;inset:0;z-index:62;background:rgba(31,32,32,.5);display:flex;align-items:center;justify-content:center;padding:16px}
body:has(#slSheet) .ct-wrap{z-index:97}
.ct-sh{background:#fff;border-radius:16px;width:min(760px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;box-shadow:0 24px 48px rgba(0,0,0,.18);font-size:16px;color:#2A2B2B;overflow:hidden}
.ct-hd{display:flex;align-items:center;gap:8px;padding:12px 12px 4px}.ct-ht{flex:1;min-width:0;text-align:center}.ct-ht b{display:block;font-size:19px;font-weight:700;line-height:1.35}.ct-ht small{display:block;color:#6C6C6C;font-size:14px;line-height:1.4;margin-top:2px;overflow-wrap:anywhere}
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
.ct-player{position:relative;border-radius:12px;overflow:hidden;background:#1F2020}.ct-player canvas{display:block;width:100%;height:auto}.ct-playb{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:76px;height:76px;border-radius:50%;border:0;background:rgba(31,32,32,.75);color:#fff;display:grid;place-items:center;cursor:pointer}.ct-playb:hover{background:#5C74F6}
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
.ct-kinds{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.ct-kind{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;min-height:156px;padding:14px;border-radius:14px;border:1px solid #EAEBEB;background:#fff;font:inherit;color:#2A2B2B;cursor:pointer;position:relative}.ct-kind:hover,.ct-kind:focus-visible{border-color:#5C74F6;box-shadow:0 0 0 3px #EAEDFF}
.ct-kind b{font-size:16px;line-height:1.35}.ct-kind small{font-size:14px;color:#6C6C6C;line-height:1.45}.ct-kind em{margin-top:auto;font-style:normal;font-size:13px;color:#808181}
.ctf{font-size:16px;color:#2A2B2B}.ctf-top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:0 0 12px}.ctf-sum{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}.ctf-sum b{font-size:22px}.ctf-later{font-size:14px;color:#009116;background:#E7F8E8;border-radius:999px;padding:3px 10px;margin-left:4px}
.ctf-undo{position:sticky;top:0;z-index:3;box-shadow:0 4px 12px rgba(0,0,0,.15);display:flex;align-items:center;gap:10px;justify-content:space-between;background:#2A2B2B;color:#fff;border-radius:12px;padding:6px 6px 6px 14px;margin:0 0 10px;flex-wrap:wrap}.ctf-undo .ct-btn{background:#fff}
.ctf-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.ctf-s{border-radius:14px;background:#F6F7F7;overflow:hidden}.ctf-s.on{background:#fff;border:1px solid #C8C9C9}
.ctf-sh{width:100%;display:flex;align-items:center;gap:12px;min-height:64px;padding:8px 14px;border:0;background:transparent;font:inherit;text-align:left;cursor:pointer;color:inherit}.ctf-sh>.ct-ic{flex:none;color:#808181;transition:transform .15s}.ctf-s.on .ctf-sh>.ct-ic{transform:rotate(90deg)}
.ctf-n{width:36px;height:36px;flex:none;border-radius:50%;background:#fff;border:1px solid #C8C9C9;display:grid;place-items:center;font-weight:700;font-size:15px}.ctf-s.has .ctf-n{background:#00C53B;border-color:#00C53B;color:#fff}
.ctf-tt{flex:1;min-width:0}.ctf-tt b{display:block;font-size:16px;line-height:1.4;overflow-wrap:anywhere}.ctf-tt small{display:block;color:#6C6C6C;font-size:14px}
.ctf-body{padding:0 14px 14px}.ctf-q{font-weight:700;margin:10px 0 10px}.ctf-its{list-style:none;padding:0;margin:0;display:grid;gap:6px}.ctf-its li{display:flex;align-items:center;gap:10px;background:#F6F7F7;border-radius:12px;padding:6px 6px 6px 8px}
@media (max-width:860px){.ct-kinds{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.ct-wrap{padding:0;align-items:flex-end}.ct-sh{border-radius:16px 16px 0 0;max-height:94dvh;width:100%}.ct-bd{padding:12px 16px 16px}.ct-now{margin:10px 16px 0}.ct-ft{padding:10px 16px calc(10px + env(safe-area-inset-bottom))}.ct-pri{flex:1;min-width:0}.ct-fl:empty{display:none}
 .ct-a4{padding:20px 18px;font-size:14px}.ct-a4 h1{font-size:20px}.ct-two{grid-template-columns:1fr}.ct-kind{min-height:140px;padding:12px}.ct-steps{margin:6px 12px 0}.ct-steps li{font-size:13px}.ct-thumbs{grid-template-columns:repeat(3,minmax(0,1fr))}.ctf-top .ct-ai{width:100%}}
`;

  /* ── 내보내기 ── */
  W.CT = { open, pick, close: () => close(), kinds: KINDS.map(k => ({ ...k, icon: svg(k.k, 24) })), renderFill, fillAll, aiFill: d => { try { W.CF && CF.snap && CF.snap('AI SAM이 채우기 전'); } catch (e) { } const r = fillAll(d); refill(); return r; }, toCourse, sweep, toItem: recToItem, toRec: itemToRec, preview, link: linkCreated, hook: hookCF, steps: STEPS, gen: GEN };
})();
