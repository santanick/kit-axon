/* 디디쌤 스튜디오 v3 — 콘텐츠 제작 · AI 과정 설계 · 주차 편성 · 루브릭 · AI 평가 · AI 진단
   데모 AI는 브라우저 규칙 생성기. YouTube 자동 추천은 설정 › 연동에 YouTube Data API 키를 넣으면 실제 검색 결과를 불러온다. */
'use strict';
const ITEMX = { video: '영상', doc: '강의자료', live: '라이브', offline: '오프라인', quiz: '퀴즈', exam: '시험', assign: '과제', survey: '설문', chapter: '챕터' };
const ytId = u => (String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/) || [])[1] || '';
const clean = s => String(s || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();

/* ═════════ AI 생성기(데모 규칙) ═════════ */
const WEEK15 = ['오리엔테이션 · 과목 소개', '기본 개념과 용어', '핵심 원리 Ⅰ', '핵심 원리 Ⅱ', '도구와 실습 환경', '실습 Ⅰ: 따라 하기', '사례 분석', '중간고사', '심화 Ⅰ', '심화 Ⅱ', '프로젝트 기획', '프로젝트 실습', '프로젝트 피드백', '결과 발표 · 공유', '기말고사'];
const MOD = ['시작하기', '핵심 개념', '원리 이해', '실습 따라 하기', '사례로 배우기', '응용하기', '심화', '정리 · 평가'];
Object.assign(AI, {
  design(o) {
    const topic = clean(o.topic) || '새 과정', n = clamp(+o.weeks || (o.univ ? 15 : 6), 1, 30); const W = [];
    for (let w = 1; w <= n; w++) {
      const base = o.univ && n === 15 ? WEEK15[w - 1] : (w === n ? '정리 · 최종 평가' : MOD[(w - 1) % MOD.length] + (w > MOD.length ? ' ' + Math.ceil(w / MOD.length) : ''));
      const exam = /고사|최종 평가/.test(base); const items = [];
      if (!exam) {
        items.push({ type: 'video', title: `${topic}: ${base}`, q: `${topic} ${base.replace(/[ⅠⅡ:·]/g, ' ')} 강의`.replace(/\s+/g, ' ') });
        if (o.vids > 1) items.push({ type: 'video', title: `${base} 실습 영상`, q: `${topic} 실습 튜토리얼` });
        if (o.quiz) items.push({ type: 'quiz', title: `${w}주차 확인 퀴즈`, gen: { n: 5, lv: o.level } });
        if (o.assign && (w % 3 === 0 || /프로젝트|실습/.test(base))) items.push({ type: 'assign', title: `${base} 과제`, gen: true });
      } else if (o.exam) items.push({ type: 'exam', title: `${topic} ${base}`, gen: { n: base.includes('중간') ? 15 : 20, lv: o.level } });
      W.push({ w, title: base, goal: exam ? `${w > n / 2 ? '전체' : '전반부'} 학습 내용을 평가한다.` : `${topic}의 ${base.replace(/[ⅠⅡ]/g, '').trim()}을(를) 이해하고 적용한다.`, items });
    }
    return W;
  },
  questions(topic, n = 5, lv = '보통', mix = ['mc', 'mc', 'ox', 'short', 'mc', 'essay']) {
    topic = clean(topic) || '핵심 개념'; const per = Math.floor(100 / n), rest = 100 - per * n;
    const MC = [[`「${topic}」의 목적을 가장 잘 설명한 것은?`, ['문제를 정의하고 근거를 바탕으로 해결 방법을 찾는 것', '절차 없이 결과만 빠르게 얻는 것', '용어를 외우는 데 집중하는 것', '다른 사람의 결과물을 그대로 쓰는 것'], 0],
      [`「${topic}」을(를) 실무에 적용할 때 가장 먼저 할 일은?`, ['목표와 조건을 명확히 정한다', '도구부터 구매한다', '결과를 먼저 발표한다', '평가 기준을 나중에 정한다'], 0],
      [`다음 중 「${topic}」 학습 결과를 점검하는 방법으로 알맞지 않은 것은?`, ['기준 없이 느낌으로 판단한다', '루브릭으로 스스로 점검한다', '동료 피드백을 받는다', '사례와 비교한다'], 0],
      [`「${topic}」에서 흔히 하는 실수로 가장 알맞은 것은?`, ['맥락과 조건을 빠뜨리고 진행한다', '단계별로 확인하며 진행한다', '근거 자료를 기록한다', '결과를 다시 검토한다'], 0]];
    return Array.from({ length: n }, (_, i) => {
      const t = mix[i % mix.length], pts = per + (i < rest ? 1 : 0);
      if (t === 'mc') { const [q, o, a] = MC[i % MC.length]; const sh = [...o]; const rot = i % 4; const opts = sh.slice(rot).concat(sh.slice(0, rot)); return { t, q: `${i + 1}. ${q}`, opts, a: String(opts.indexOf(o[a])), pts, exp: `「${topic}」은(는) 목표 · 조건 · 근거를 바탕으로 진행해야 합니다.`, lv }; }
      if (t === 'ox') return { t, q: `${i + 1}. 「${topic}」은(는) 결과를 확인하고 개선하는 과정을 반복한다.`, a: 'O', pts, exp: '점검과 개선의 반복이 핵심입니다.', lv };
      if (t === 'short') return { t, q: `${i + 1}. 「${topic}」을(를) 시작할 때 정해야 하는 세 가지를 쓰시오.`, a: '목표, 조건, 평가 기준', pts, exp: '목표 · 조건 · 평가 기준을 정해야 결과를 판단할 수 있습니다.', lv };
      return { t: 'essay', q: `${i + 1}. 「${topic}」을(를) 자신의 전공 또는 업무에 적용하는 방법을 사례와 함께 서술하시오.`, a: '루브릭 기준으로 채점', pts, exp: '적용 대상 · 방법 · 기대 효과가 드러나야 합니다.', lv };
    });
  },
  assignment(topic) { topic = clean(topic) || '실습'; return { desc: `「${topic}」 내용을 바탕으로 자신의 전공 또는 업무에서 실제로 쓸 수 있는 결과물을 만드세요.\n① 해결하려는 문제와 목표 ② 사용한 방법과 과정 ③ 결과물 ④ 느낀 점과 개선할 점을 포함합니다.`, deliv: '결과물 파일(PDF · 이미지 · 링크) + 1쪽 설명서', due: 7 }; },
  rubric(name) { name = clean(name) || '과제'; return { id: uid('rb'), name: `${name} 루브릭`, criteria: [
    { n: '요구사항 충족', pts: 40, lv: ['문제 · 목표 · 과정 · 결과 · 성찰 다섯 요소가 모두 분명하다', '요소가 대부분 있으나 일부가 모호하다', '핵심 요소가 빠져 있다'] },
    { n: '내용의 정확성', pts: 30, lv: ['개념을 정확히 쓰고 근거가 충분하다', '대체로 정확하나 근거가 부족하다', '개념 오류가 있다'] },
    { n: '완성도 · 실용성', pts: 20, lv: ['바로 쓸 수 있을 만큼 완성도가 높다', '보완하면 쓸 수 있다', '실제로 쓰기 어렵다'] },
    { n: '표현 · 형식', pts: 10, lv: ['구성과 형식이 깔끔하다', '읽을 수 있으나 정리가 부족하다', '형식 요건을 지키지 않았다'] }] }; },
  evaluate(text, rb) {
    const tx = String(text || ''); const len = tx.length; const hits = ['문제', '목표', '방법', '과정', '결과', '개선', '근거', '사례'].filter(k => tx.includes(k)).length;
    return rb.criteria.map((c, i) => { const s = clamp((len > 260 ? 2 : len > 120 ? 1 : 0) + (hits >= 5 ? 1 : 0) - (i === 3 && len < 80 ? 1 : 0), 0, 2); const li = 2 - s; const score = Math.round(c.pts * [1, .7, .4][li]);
      return { li, score, why: li === 0 ? `「${c.n}」 — ${c.lv[0]}. 제출물에 ${hits}개 핵심 요소가 드러납니다.` : li === 1 ? `「${c.n}」 — ${c.lv[1]}. 보완하면 좋은 부분이 있습니다.` : `「${c.n}」 — ${c.lv[2]}. 분량 · 요소가 부족합니다.` }; });
  },
  /* 자료 텍스트에서 문항 만들기: 문장 분리 → 핵심어 추출 → 맞는 설명 1 + 핵심어를 바꾼 틀린 설명 3 */
  fromText(text, n = 8) {
    const sents = String(text).replace(/\s+/g, ' ').split(/(?<=[.!?。]|다\.|요\.)\s+/).map(s => s.trim()).filter(s => s.length >= 18 && s.length <= 160);
    const stop = new Set(['그리고', '하지만', '때문에', '있습니다', '합니다', '것이다', '있다', '이다', '또한', '그러나', '경우', '대한', '통해', '위해', '따라', '이러한', '그것', '우리', '여러']);
    const freq = {}; sents.forEach(s => (s.match(/[가-힣A-Za-z]{2,}/g) || []).map(w => w.replace(/(은|는|이|가|을|를|의|에|에서|으로|로|와|과|도|만)$/, '')).filter(w => w.length >= 2 && !stop.has(w)).forEach(w => freq[w] = (freq[w] || 0) + 1));
    const kws = Object.entries(freq).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 24);
    const out = []; const used = new Set();
    for (const kw of kws) { if (out.length >= n) break; const s = sents.find(x => x.includes(kw) && !used.has(x)); if (!s) continue; used.add(s);
      const others = kws.filter(k => k !== kw && !s.includes(k)).slice(0, 3); if (others.length < 3) continue;
      const opts = [s, ...others.map(o => s.split(kw).join(o))]; const rot = out.length % 4; const ro = opts.slice(rot).concat(opts.slice(0, rot));
      out.push({ t: 'mc', q: `${out.length + 1}. 다음 중 「${kw}」에 대한 설명으로 자료와 일치하는 것은?`, opts: ro.map(x => x.length > 90 ? x.slice(0, 88) + '…' : x), a: String(ro.indexOf(s)), pts: 0, exp: `자료 원문: ${s.slice(0, 120)}`, src: '자료' }); }
    const per = out.length ? Math.floor(100 / out.length) : 0; out.forEach((q, i) => q.pts = per + (i < 100 - per * out.length ? 1 : 0));
    return { qs: out, kws: kws.slice(0, 10), sents: sents.length };
  },
  likert(topic, dims) { const T = { EYE: '새로운 정보를 찾아 관찰하는 것', PEN: '배운 내용을 글로 정리하는 것', LENS: '자료를 비교 · 분석하는 것', STORY: '아이디어를 말이나 영상으로 표현하는 것', MAP: '전체 흐름을 설계하고 계획하는 것' };
    return dims.flatMap((d, i) => [{ t: 'likert', q: `${topic ? topic + ' 활동에서 ' : ''}나는 ${T[d] || d + ' 활동'}이 즐겁다.`, dim: d }, { t: 'likert', q: `과제를 할 때 ${T[d] || d + ' 활동'}부터 시작하는 편이다.`, dim: d }]); }
});
function itemsFromDesign(W, o) {
  const items = []; let crb = o.rubric || null; W.forEach(wk => wk.items.forEach(x => { const it = { id: uid('it'), type: x.type, title: x.title, week: wk.w };
    if (x.type === 'video') { if (o.vsrc === 'ai') { it.src = 'ai'; it.ai = { scenes: AI.lecture(x.title, 5, o.level), mins: 5, voice: 'f' }; it.url = 'ai:' + it.id; } else { it.src = 'youtube'; it.q = x.q; it.url = ''; } }
    if (x.gen && ['quiz', 'exam'].includes(x.type)) { it.qs = AI.questions(o.topic, x.gen.n, x.gen.lv || '보통'); it.time = x.type === 'exam' ? 60 : 10; it.retake = x.type === 'exam' ? 1 : 3; }
    if (x.type === 'assign') { Object.assign(it, AI.assignment(x.title)); if (!crb) { const rb = AI.rubric(clean(o.topic) + ' 과제'); S.rubrics.push(rb); crb = rb.id; } it.rubric = crb; }
    items.push(it); if (o.docs && x.type === 'video' && !wk.items.slice(0, wk.items.indexOf(x)).some(y => y.type === 'video')) items.push({ id: uid('it'), type: 'doc', title: `${wk.w}${o.univ ? '주' : '차시'} 강의자료 — ${wk.title}`, week: wk.w, topic: `${clean(o.topic)} ${wk.title}`, doc: AI.material(`${clean(o.topic)} ${wk.title}`, { name: o.topic, goal: wk.goal }) }); })); return items;
}

/* ═════════ YouTube 자동 추천 ═════════ */
async function ytSearch(q) {
  const y = S.settings.yt || {}; if (!y.key) return null;
  const p = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '4', relevanceLanguage: 'ko', safeSearch: 'strict', q, key: y.key }); if (y.cc) p.set('videoLicense', 'creativeCommon'); if (y.maxMin <= 20) p.set('videoDuration', y.maxMin <= 4 ? 'short' : 'medium');
  try { const r = await fetch('https://www.googleapis.com/youtube/v3/search?' + p); if (!r.ok) throw new Error(r.status); const j = await r.json();
    const ids = (j.items || []).map(x => x.id.videoId).filter(Boolean); if (!ids.length) return [];
    let dur = {}; try { const r2 = await fetch('https://www.googleapis.com/youtube/v3/videos?' + new URLSearchParams({ part: 'contentDetails', id: ids.join(','), key: y.key })); const j2 = await r2.json(); (j2.items || []).forEach(v => dur[v.id] = v.contentDetails.duration.replace(/^PT/, '').toLowerCase()); } catch (e) { }
    return (j.items || []).filter(x => x.id.videoId).map(x => ({ id: x.id.videoId, title: x.snippet.title, ch: x.snippet.channelTitle, dur: dur[x.id.videoId] || '' }));
  } catch (e) { console.warn('yt', e); toast('YouTube 검색에 실패했습니다. API 키와 할당량을 확인하세요.', 'warn'); return []; }
}
async function ytAutofill(c) {
  const V = c.curriculum.filter(i => i.type === 'video' && !i.url && i.q); if (!V.length) return 0;
  if (!S.settings.yt?.key) return -1; let n = 0;
  for (const it of V) { const r = await ytSearch(it.q); if (r && r.length) { it.cands = r; it.url = 'https://youtu.be/' + r[0].id; it.yt = r[0]; it.auto = true; n++; } }
  save(); if (CUR.tab === 'class') render(); return n;
}
const ytLink = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q || '')}`;

/* ═════════ 과정 상세: 커리큘럼 · 주차 편성 ═════════ */
const itemBadge = it => {
  if (it.type === 'video' && it.src === 'ai') return (it.ai?.scenes || []).length ? tag(`AI 영상 ${it.ai.scenes.length}장면`, 'g') : tag('AI 영상 미생성', 'y');
  if (it.type === 'doc') return (it.doc?.secs || []).length ? tag(`자료 ${it.doc.secs.length}절`, 'g') : tag('자료 없음', 'y');
  if (it.type === 'video') return it.url ? tag(it.auto ? 'YouTube 자동' : it.src === 'upload' ? '업로드' : 'YouTube', 'g') : tag('영상 미연결', 'y');
  if (['quiz', 'exam'].includes(it.type)) return (it.qs || []).length ? tag((it.qs || []).length + '문항', 'g') : tag('문항 없음', 'y');
  if (it.type === 'assign') return it.rubric ? tag('루브릭', 'g') : tag('루브릭 없음', 'y');
  if (it.type === 'survey') return tag((it.qs || []).length + '문항'); return '';
};
function itemRow(c, it, i) { return `<li class="${it.type === 'chapter' ? 'chap' : ''}"><span class="ty">${esc(ITEMX[it.type])}</span><button class="link ib" data-act="item-edit" data-c="${c.id}" data-v="${i}">${esc(it.title)}</button>${itemBadge(it)}<span class="sp"></span>${it.type === 'video' ? `<button class="btn sm ghost ai" data-act="ai-script" data-c="${c.id}" data-v="${i}">스크립트</button>` : ''}<button class="btn sm ghost" data-act="cur-mv" data-c="${c.id}" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="cur-mv" data-c="${c.id}" data-v="${i}" data-d="1" aria-label="아래로">↓</button><button class="btn sm ghost" data-act="cur-del" data-c="${c.id}" data-v="${i}" aria-label="삭제">${ic('x', 14)}</button></li>`; }
function curriculumView(c) {
  const ep = c.kind === 'episode'; const miss = c.curriculum.filter(it => (it.type === 'video' && !it.url) || (it.type === 'doc' && !(it.doc?.secs || []).length) || (['quiz', 'exam'].includes(it.type) && !(it.qs || []).length) || (it.type === 'assign' && !it.rubric)).length;
  const bar = `<div class="bar2"><button class="btn sm" data-act="cur-add" data-v="${c.id}">+ 항목</button><button class="btn sm" data-act="cur-lib" data-v="${c.id}">라이브러리에서</button>${ep ? '' : `<button class="btn sm ink" data-act="ai-fill" data-v="${c.id}">${ic('spark', 14)} AI로 콘텐츠 채우기${miss ? ` (${miss})` : ''}</button>`}${c.weekly ? `<button class="btn sm" data-act="syl-csv" data-v="${c.id}">강의계획서 CSV</button>` : (ep ? '' : `<button class="btn sm" data-act="to-weekly" data-v="${c.id}">주차별로 편성</button>`)}<span class="mini">${ep ? '회차 클래스 최대 100회차' : '항목을 누르면 영상(YouTube · AI 생성) · 강의자료 · 문항 · 과제를 편집합니다'}</span></div>`;
  if (!c.weekly) return bar + `<ol class="cur">${c.curriculum.map((it, i) => itemRow(c, it, i)).join('')}</ol>`;
  const W = c.weekPlan || []; const un = c.curriculum.map((it, i) => [it, i]).filter(([it]) => !it.week);
  return bar + `<div class="weeks">${W.map(wk => { const its = c.curriculum.map((it, i) => [it, i]).filter(([it]) => it.week === wk.w); const ex = its.some(([it]) => it.type === 'exam');
    return `<div class="wk ${ex ? 'ex' : ''}"><div class="wkh"><span class="wn">${wk.w}주</span><input value="${esc(wk.title)}" data-chg="wk-title" data-c="${c.id}" data-v="${wk.w}" maxlength="40" aria-label="${wk.w}주차 주제"><select data-chg="wk-add" data-c="${c.id}" data-v="${wk.w}" aria-label="${wk.w}주차 항목 추가"><option value="">+</option>${['video', 'doc', 'quiz', 'assign', 'exam', 'live', 'offline', 'survey'].map(k => `<option value="${k}">${ITEMX[k]}</option>`).join('')}</select></div>
      <small class="wg">${esc(wk.goal || '')}</small><ul>${its.map(([it, i]) => `<li><span class="ty">${esc(ITEMX[it.type])}</span><button class="link ib" data-act="item-edit" data-c="${c.id}" data-v="${i}">${esc(it.title)}</button>${itemBadge(it)}</li>`).join('') || '<li class="mini">항목 없음</li>'}</ul></div>`; }).join('')}</div>` +
    (un.length ? `<div class="card"><div class="ch"><b>주차 미배정</b></div><ol class="cur">${un.map(([it, i]) => itemRow(c, it, i)).join('')}</ol></div>` : '');
}
ACT['wk-title'] = el => { const c = C(el.dataset.c); const wk = c.weekPlan.find(w => w.w === +el.dataset.v); wk.title = el.value.trim() || wk.title; save(); };
ACT['wk-add'] = el => { if (!el.value) return; const c = C(el.dataset.c), w = +el.dataset.v, ty = el.value; const it = { id: uid('it'), type: ty, title: `${w}주차 ${ITEMX[ty]}`, week: w }; if (ty === 'video') { it.src = 'youtube'; it.q = `${clean(c.name)} ${c.weekPlan[w - 1]?.title || ''}`; } if (ty === 'doc') it.topic = `${clean(c.name)} ${c.weekPlan[w - 1]?.title || ''}`; c.curriculum.push(it); save(); render(); openEditor(c, c.curriculum.length - 1); };
ACT['to-weekly'] = el => { const c = C(el.dataset.v); modal('주차별 편성으로 바꾸기', `<label class="fl">주차 수<input name="n" type="number" min="1" max="30" value="${S.org.type === 'univ' ? 15 : 8}"></label><p class="mini">기존 항목은 순서대로 주차에 나눠 배정합니다. 나중에 옮길 수 있습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '바꾸기', kind: 'pri', run: w => { const n = clamp(+fv(w, 'n') || 8, 1, 30); makeWeekly(c, n); save(); render(); } }]); };
function makeWeekly(c, n) { const L = c.curriculum.filter(i => i.type !== 'chapter'); c.curriculum = L; c.weekly = true; c.weekPlan = Array.from({ length: n }, (_, i) => ({ w: i + 1, title: n === 15 && S.org.type === 'univ' ? WEEK15[i] : `${i + 1}주차`, goal: '' })); const per = Math.max(1, Math.ceil(L.length / n)); L.forEach((it, i) => it.week = Math.min(n, Math.floor(i / per) + 1)); }
ACT['syl-csv'] = el => { const c = C(el.dataset.v); downloadCSV(`${c.name}_강의계획서.csv`, ['주차', '주제', '학습 목표', '학습 활동', '평가'], c.weekPlan.map(wk => { const its = c.curriculum.filter(i => i.week === wk.w); return [wk.w, wk.title, wk.goal, its.filter(i => ['video', 'live', 'offline'].includes(i.type)).map(i => i.title).join(' / '), its.filter(i => ['quiz', 'exam', 'assign'].includes(i.type)).map(i => `${ITEMX[i.type]}: ${i.title}`).join(' / ')]; })); };
ACT['ai-fill'] = el => { const c = C(el.dataset.v); let q = 0, a = 0, v = 0;
  c.curriculum.forEach(it => { if (['quiz', 'exam'].includes(it.type) && !(it.qs || []).length) { it.qs = AI.questions(it.title.replace(/퀴즈|시험|확인/g, '') || c.name, it.type === 'exam' ? 15 : 5); it.time = it.type === 'exam' ? 60 : 10; q++; }
    if (it.type === 'assign' && !it.rubric) { Object.assign(it, AI.assignment(it.title), { desc: it.desc || AI.assignment(it.title).desc }); const rb = AI.rubric(it.title); S.rubrics.push(rb); it.rubric = rb.id; a++; }
    if (it.type === 'video' && it.src === 'ai' && !(it.ai?.scenes || []).length) { it.ai = { scenes: AI.lecture(it.title, 5), mins: 5, voice: 'f' }; it.url = 'ai:' + it.id; v++; }
    if (it.type === 'video' && !it.url && !it.q) { it.q = `${clean(c.name)} ${it.title}`; }
    if (it.type === 'doc' && !(it.doc?.secs || []).length) { it.doc = AI.material(it.topic || it.title, c); v++; } });
  S.ai.usage++; save(); render(); toast(`문항 ${q}건 · 과제/루브릭 ${a}건 · AI 영상/강의자료 ${v}건을 만들었습니다.`, 'ok');
  ytAutofill(c).then(n => { if (n === -1) toast('영상은 검색어만 준비했습니다. 설정 › 연동에 YouTube API 키를 넣으면 자동으로 연결됩니다.'); else if (n) toast(`YouTube 영상 ${n}개를 자동으로 연결했습니다. 확인 후 바꿀 수 있습니다.`, 'ok'); }); };

/* ═════════ 항목 편집기(영상 · 퀴즈/시험 · 과제 · 설문 · 라이브 · 오프라인) ═════════ */
let ED = null;
function openEditor(c, i) { ED = { c, i, it: JSON.parse(JSON.stringify(c.curriculum[i])) }; const w = modal(`${ITEMX[ED.it.type]} 편집`, '<div id="edBody"></div>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: () => edSave() }], true); edRender(); }
ACT['item-edit'] = el => openEditor(C(el.dataset.c), +el.dataset.v);
function edRender() {
  const it = ED.it, b = $('#edBody'); if (!b) return; let h = `<label class="fl">제목<input data-ed="title" value="${esc(it.title)}" maxlength="80"></label>`;
  if (ED.c.weekly) h += `<label class="fl">주차<select data-ed="week">${ED.c.weekPlan.map(w => `<option value="${w.w}" ${it.week === w.w ? 'selected' : ''}>${w.w}주 · ${esc(w.title)}</option>`).join('')}</select></label>`;
  if (it.type === 'video') {
    const id = ytId(it.url); const key = !!S.settings.yt?.key;
    h += `<div class="seg2">${[['youtube', 'YouTube'], ['ai', 'AI 강의 영상 생성'], ['upload', '파일 업로드'], ['library', '라이브러리']].map(([k, l]) => `<button type="button" class="${(it.src || 'youtube') === k ? 'on' : ''}" data-act="ed-src" data-v="${k}">${l}</button>`).join('')}</div>`;
    if ((it.src || 'youtube') === 'youtube') h += `<div class="fl"><span>자동 추천 검색어</span><div class="bar2"><input data-ed="q" value="${esc(it.q || '')}" placeholder="예: 프롬프트 엔지니어링 기초 강의" style="flex:1"><button type="button" class="btn sm ink" data-act="ed-yt">${ic('spark', 14)} 후보 찾기</button><a class="btn sm" target="_blank" rel="noopener" href="${esc(ytLink(it.q))}">YouTube에서 보기</a></div>${key ? '' : '<small class="mini">설정 › 연동에 YouTube API 키를 넣으면 후보 영상을 자동으로 불러옵니다. 지금은 검색 링크로 찾은 뒤 주소를 붙여 넣으세요.</small>'}</div>
      ${(it.cands || []).length ? `<div class="ytc">${it.cands.map(v => `<button type="button" class="yv ${ytId(it.url) === v.id ? 'on' : ''}" data-act="ed-pick" data-v="${esc(v.id)}"><img alt="" src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg"><b>${esc(v.title)}</b><small>${esc(v.ch)} ${esc(v.dur)}</small></button>`).join('')}</div>` : ''}
      <label class="fl">YouTube 주소<input data-ed="url" value="${esc(it.url || '')}" placeholder="https://youtu.be/…"></label>${id ? `<div class="ytp"><img alt="선택한 영상 미리보기" src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg"><span>${esc(it.yt?.title || '선택한 영상')}</span></div>` : (it.url ? '<p class="r mini">YouTube 주소 형식이 아닙니다.</p>' : '')}<p class="mini">저작권 · 이용 조건 확인은 운영자 책임입니다. 'CC 라이선스만' 옵션은 설정 › 연동에서 켭니다.</p>`;
    if (it.src === 'ai') h += aivEditor(it);
    if (it.src === 'upload') h += `<label class="fl">영상 파일(최대 2시간 · 4GB)<input type="file" accept="video/*" data-edfile="1"></label>${it.file ? `<p class="mini">선택됨: ${esc(it.file)}</p>` : ''}`;
    if (it.src === 'library') h += `<label class="fl">라이브러리 영상<select data-ed="lib">${S.lib.filter(l => ['동영상', 'YouTube'].includes(l.kind)).map(l => `<option value="${l.id}" ${it.lib === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>`;
    h += `<label class="ckl"><input type="checkbox" data-ed="skip" ${it.skip ? 'checked' : ''}> 건너뛰기 허용</label>`;
  }
  if (['quiz', 'exam'].includes(it.type)) {
    const Q = it.qs || (it.qs = []); const sum = Q.reduce((a, q) => a + (+q.pts || 0), 0);
    h += `<div class="form2"><label>제한 시간(분, 최대 600)<input type="number" min="0" max="600" data-ed="time" value="${it.time || (it.type === 'exam' ? 60 : 10)}"></label><label>재응시 횟수<input type="number" min="0" max="99" data-ed="retake" value="${it.retake ?? 1}"></label></div>
      <div class="bar2"><button type="button" class="btn sm ink" data-act="ed-aiq">${ic('spark', 14)} AI 문항 생성</button><button type="button" class="btn sm" data-act="ed-addq">+ 문항</button><button type="button" class="btn sm" data-act="ed-bank">문항 은행에서</button><button type="button" class="btn sm" data-act="ed-even">배점 고르게</button><span class="${sum === 100 ? 'okt' : 'wt'} mini">배점 합계 ${sum}점${sum === 100 ? '' : ' (100점으로 맞추세요)'}</span></div>
      <div class="qlist">${Q.map((q, k) => `<div class="qe"><div class="qh"><b>${k + 1}</b><select data-edq="${k}" data-f="t">${[['mc', '객관식'], ['ox', 'OX'], ['short', '단답'], ['essay', '서술']].map(([v, l]) => `<option value="${v}" ${q.t === v ? 'selected' : ''}>${l}</option>`).join('')}</select><input type="number" min="0" max="100" data-edq="${k}" data-f="pts" value="${q.pts || 0}" aria-label="배점" class="pts"><small>점</small><span class="sp"></span><button type="button" class="btn sm ghost" data-act="ed-delq" data-v="${k}" aria-label="삭제">${ic('x', 14)}</button></div>
        <textarea rows="2" data-edq="${k}" data-f="q" aria-label="문항">${esc(q.q)}</textarea>
        ${q.t === 'mc' ? `<div class="opts">${(q.opts || ['', '', '', '']).map((o, j) => `<label><input type="radio" name="a${k}" data-edq="${k}" data-f="a" value="${j}" ${String(q.a) === String(j) ? 'checked' : ''} aria-label="정답"><input data-edq="${k}" data-f="o${j}" value="${esc(o)}" aria-label="보기 ${j + 1}"></label>`).join('')}</div>` : q.t === 'ox' ? `<div class="opts">${['O', 'X'].map(v => `<label><input type="radio" name="a${k}" data-edq="${k}" data-f="a" value="${v}" ${q.a === v ? 'checked' : ''}> ${v}</label>`).join('')}</div>` : `<input data-edq="${k}" data-f="a" value="${esc(q.a || '')}" placeholder="${q.t === 'essay' ? '채점 기준(루브릭)' : '정답'}">`}
        ${q.exp ? `<small class="mini">해설: ${esc(q.exp)}</small>` : ''}</div>`).join('') || '<div class="empty">문항이 없습니다. AI 문항 생성을 눌러 보세요.</div>'}</div>`;
  }
  if (it.type === 'assign') h += `<div class="bar2"><button type="button" class="btn sm ink" data-act="ed-aia">${ic('spark', 14)} AI 과제 · 루브릭 생성</button></div>
    <label class="fl">과제 안내<textarea rows="5" data-ed="desc">${esc(it.desc || '')}</textarea></label><div class="form2"><label>제출물<input data-ed="deliv" value="${esc(it.deliv || '')}"></label><label>제출 기한(공개 후 일수)<input type="number" min="1" max="60" data-ed="due" value="${it.due || 7}"></label></div>
    <label class="fl">채점 루브릭<select data-ed="rubric"><option value="">— 선택 —</option>${S.rubrics.map(r => `<option value="${r.id}" ${it.rubric === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>${it.rubric ? rubricTable(S.rubrics.find(r => r.id === it.rubric)) : ''}`;
  if (it.type === 'doc') h += docEditor(it);
  if (it.type === 'survey') h += `<label class="fl">설문 문항(줄마다 1개)<textarea rows="5" data-ed="sv">${esc((it.qs || []).map(q => q.q).join('\n') || '과정에 전반적으로 만족한다.\n강의 내용이 업무 · 학습에 도움이 된다.\n개선할 점을 자유롭게 적어 주세요.')}</textarea></label>`;
  if (it.type === 'live') h += `<div class="form2"><label>라이브 주소(Zoom · Meet 등)<input data-ed="url" value="${esc(it.url || '')}"></label><label>일시<input type="datetime-local" data-ed="at" value="${esc(it.at || '')}"></label></div><p class="mini">시작 3일 전 · 당일 오전 9시 알림톡이 자동 발송됩니다. 출석 인정 시간을 설정할 수 있습니다.</p>`;
  if (it.type === 'offline') h += `<div class="form2"><label>장소<input data-ed="place" value="${esc(it.place || '')}"></label><label>일시<input type="datetime-local" data-ed="at" value="${esc(it.at || '')}"></label></div><p class="mini">출석은 출결패드(휴대폰 끝 4자리)로 받습니다.</p>`;
  b.innerHTML = h;
}
document.addEventListener('input', e => { if (!ED || !e.target.closest('#edBody')) return; const el = e.target;
  if (el.dataset.ed) { const k = el.dataset.ed; ED.it[k] = el.type === 'checkbox' ? el.checked : ['week', 'time', 'retake', 'due'].includes(k) ? +el.value : el.value; if (k === 'url' && ytId(el.value)) { ED.it.yt = (ED.it.cands || []).find(v => v.id === ytId(el.value)) || null; clearTimeout(ED.t); ED.t = setTimeout(edRender, 300); } }
  if (el.dataset.edq != null) { const q = ED.it.qs[+el.dataset.edq], f = el.dataset.f; if (f === 'pts') q.pts = +el.value || 0; else if (/^o\d$/.test(f)) { q.opts = q.opts || ['', '', '', '']; q.opts[+f[1]] = el.value; } else q[f] = el.value; } });
document.addEventListener('change', e => { if (!ED || !e.target.closest('#edBody')) return; const el = e.target;
  if (el.dataset.edq != null && (el.dataset.f === 't' || el.dataset.f === 'pts')) { const q = ED.it.qs[+el.dataset.edq]; if (el.dataset.f === 't') { q.t = el.value; if (q.t === 'mc' && !q.opts) q.opts = ['', '', '', '']; } edRender(); }
  if (el.dataset.ed === 'rubric' || el.dataset.ed === 'week') edRender();
  if (el.dataset.edfile) { const f = el.files[0]; if (f) { if (f.size > 4 * 1024 ** 3) { toast('4GB를 넘습니다.', 'warn'); return; } ED.it.file = f.name.slice(0, 80); ED.it.url = 'upload:' + ED.it.file; edRender(); } } });
ACT['ed-src'] = el => { ED.it.src = el.dataset.v; edRender(); };
ACT['ed-yt'] = async () => { const q = ED.it.q || ED.it.title; if (!S.settings.yt?.key) { window.open(ytLink(q), '_blank', 'noopener'); return; } $('#edBody').insertAdjacentHTML('afterbegin', '<p class="mini">YouTube에서 찾는 중…</p>'); const r = await ytSearch(q); ED.it.cands = r || []; if (r && r[0] && !ED.it.url) { ED.it.url = 'https://youtu.be/' + r[0].id; ED.it.yt = r[0]; } edRender(); };
ACT['ed-pick'] = el => { ED.it.url = 'https://youtu.be/' + el.dataset.v; ED.it.yt = ED.it.cands.find(v => v.id === el.dataset.v); edRender(); };
ACT['ed-aiq'] = () => modal2('AI 문항 생성', `<label class="fl">주제(비우면 제목)<input id="aqT" value="${esc(clean(ED.it.title.replace(/퀴즈|시험|확인/g, '')))}"></label><div class="form2"><label>문항 수<input id="aqN" type="number" min="1" max="30" value="${ED.it.type === 'exam' ? 10 : 5}"></label><label>난이도<select id="aqL"><option>쉬움</option><option selected>보통</option><option>어려움</option></select></label></div><div class="chk">${[['mc', '객관식'], ['ox', 'OX'], ['short', '단답'], ['essay', '서술']].map(([v, l]) => `<label><input type="checkbox" class="aqM" value="${v}" ${v !== 'essay' || ED.it.type === 'exam' ? 'checked' : ''}> ${l}</label>`).join('')}</div>`, () => { const mix = $$('.aqM:checked').map(x => x.value); const add = AI.questions($('#aqT').value, clamp(+$('#aqN').value || 5, 1, 30), $('#aqL').value, mix.length ? mix : ['mc']); ED.it.qs = [...(ED.it.qs || []), ...add]; evenPts(ED.it.qs); S.ai.usage++; edRender(); });
ACT['ed-addq'] = () => { (ED.it.qs = ED.it.qs || []).push({ t: 'mc', q: `${ED.it.qs.length + 1}. `, opts: ['', '', '', ''], a: '0', pts: 0 }); edRender(); };
ACT['ed-delq'] = el => { ED.it.qs.splice(+el.dataset.v, 1); edRender(); };
ACT['ed-even'] = () => { evenPts(ED.it.qs); edRender(); };
function evenPts(Q) { const n = Q.length; if (!n) return; const per = Math.floor(100 / n); Q.forEach((q, i) => q.pts = per + (i < 100 - per * n ? 1 : 0)); }
ACT['ed-bank'] = () => { const B = S.bank || []; if (!B.length) { toast('문항 은행이 비어 있습니다. 평가 › 문항 은행에서 추가하세요.', 'warn'); return; } modal2('문항 은행에서 가져오기', `<div class="chk one">${B.map((q, k) => `<label><input type="checkbox" class="bkq" value="${k}"> ${esc(q.q.slice(0, 70))} <small>${esc(q.topic || '')}</small></label>`).join('')}</div>`, () => { $$('.bkq:checked').forEach(x => ED.it.qs.push(JSON.parse(JSON.stringify(B[+x.value])))); evenPts(ED.it.qs); edRender(); }); };
ACT['ed-aia'] = () => { const a = AI.assignment(ED.it.title); Object.assign(ED.it, a); const rb = AI.rubric(ED.it.title); S.rubrics.push(rb); ED.it.rubric = rb.id; S.ai.usage++; save(); edRender(); toast('과제 안내와 루브릭을 만들었습니다.', 'ok'); };
/* 편집기 위에 겹치는 작은 대화상자(편집 중인 모달을 닫지 않음) */
function modal2(title, body, onOk) { const w = document.createElement('div'); w.className = 'mwrap top2'; w.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><b>${esc(title)}</b></div><div class="mb">${body}</div><div class="mf"><button class="btn" data-x="c">취소</button><button class="btn pri" data-x="ok">${ic('spark', 14)} 확인</button></div></div>`; document.body.appendChild(w); w.addEventListener('click', e => { const x = e.target.closest('[data-x]'); if (e.target === w || x) { if (x && x.dataset.x === 'ok') onOk(); w.remove(); } }); }
function edSave() {
  const it = ED.it; if (!it.title?.trim()) { toast('제목을 입력하세요.', 'warn'); return false; }
  if (it.type === 'exam') { const s = (it.qs || []).reduce((a, q) => a + (+q.pts || 0), 0); if (it.qs?.length && s !== 100) { toast(`시험 배점 합계가 ${s}점입니다. 100점으로 맞추세요.`, 'warn'); return false; } if ((it.qs || []).some(q => q.t === 'mc' && (q.opts || []).length > 10)) { toast('객관식 보기는 최대 10개입니다.', 'warn'); return false; } }
  if (it.type === 'survey' && it.sv != null) { it.qs = it.sv.split('\n').map(s => s.trim()).filter(Boolean).map(q => ({ q, t: 'likert' })); delete it.sv; }
  if (it.type === 'video' && it.url && !it.url.startsWith('upload:') && !ytId(it.url) && it.src === 'youtube') { toast('YouTube 주소 형식을 확인하세요.', 'warn'); return false; }
  if (it.type === 'video' && it.src === 'library' && it.lib) { const l = S.lib.find(x => x.id === it.lib); if (l) { l.cls = [...new Set([...(l.cls || []), ED.c.id])]; l.used = l.cls.length; it.url = 'lib:' + l.id; } }
  if (it.type === 'video' && it.src === 'ai') { if (!(it.ai?.scenes || []).length) { toast('AI 대본 · 슬라이드를 먼저 만드세요.', 'warn'); return false; } it.url = 'ai:' + it.id; }
  delete it.t; ED.c.curriculum[ED.i] = it; logAudit(`${ED.c.name} 항목 편집 — ${it.title}`); save(); ED = null; setTimeout(render); }
function rubricTable(rb) { if (!rb) return ''; return `<div class="rubt">${table(['기준', '배점', '우수', '보통', '미흡'], rb.criteria.map(c => [`<b>${esc(c.n)}</b>`, c.pts, esc(c.lv[0]), esc(c.lv[1]), esc(c.lv[2])]))}</div>`; }

/* ═════════ AI 과정 설계 마법사 ═════════ */
let DS = null;
ACT['ai-design'] = el => { const U = S.org.type === 'univ'; DS = { step: 1, topic: el?.dataset?.v || '', target: '', weeks: U ? 15 : 6, hours: U ? 3 : 1, level: '보통', vids: 1, quiz: true, assign: true, exam: true, yt: true, univ: U, vsrc: 'youtube', docs: true }; dsRender(); };
ACT['ds-vsrc'] = el => { Object.assign(DS, { topic: $('#dsT')?.value.trim() ?? DS.topic, target: $('#dsA')?.value.trim() ?? DS.target }); DS.vsrc = el.dataset.v; dsRender(); };
function dsRender() {
  const U = DS.univ; let b = `<div class="stepper"><span class="on">1 과정 정보</span><span class="${DS.step > 1 ? 'on' : ''}">2 설계 미리보기</span></div>`;
  if (DS.step === 1) b += `<label class="fl">${esc(t('cls'))}명 · 주제<input id="dsT" value="${esc(DS.topic)}" placeholder="예: 생성형 AI 실무 활용"></label><label class="fl">교육 대상<input id="dsA" value="${esc(DS.target)}" placeholder="예: 비전공 1학년 / 입사 1년 차"></label>
    <div class="form2"><label>${U ? '주차 수' : '차시 수'}<input id="dsW" type="number" min="1" max="30" value="${DS.weeks}"></label><label>${U ? '주당 시수' : '차시당 시간'}<input id="dsH" type="number" min="1" max="8" value="${DS.hours}"></label><label>난이도<select id="dsL">${['쉬움', '보통', '어려움'].map(v => `<option ${DS.level === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>주차당 영상<select id="dsV"><option value="1">1개</option><option value="2" ${DS.vids === 2 ? 'selected' : ''}>2개</option></select></label></div>
    <div class="chk one"><div class="seg2 full" role="group" aria-label="강의 영상 출처"><button type="button" class="${DS.vsrc !== 'ai' ? 'on' : ''}" data-act="ds-vsrc" data-v="youtube">YouTube에서 자동 추천</button><button type="button" class="${DS.vsrc === 'ai' ? 'on' : ''}" data-act="ds-vsrc" data-v="ai">AI로 강의 영상 생성</button></div><label><input type="checkbox" id="dsY" ${DS.yt ? 'checked' : ''} ${DS.vsrc === 'ai' ? 'disabled' : ''}> YouTube 후보 자동 연결 ${S.settings.yt?.key ? tag('API 연결됨', 'g') : tag('API 키 없음 — 검색어만 준비', 'y')}</label><label><input type="checkbox" id="dsD" ${DS.docs ? 'checked' : ''}> 주차별 강의자료(교안) 자동 생성</label><label><input type="checkbox" id="dsQ" ${DS.quiz ? 'checked' : ''}> 주차별 확인 퀴즈 자동 생성</label><label><input type="checkbox" id="dsS" ${DS.assign ? 'checked' : ''}> 과제 + 채점 루브릭 자동 생성</label><label><input type="checkbox" id="dsE" ${DS.exam ? 'checked' : ''}> ${U ? '중간 · 기말고사' : '최종 평가'} 자동 생성</label></div>`;
  if (DS.step === 2) { const W = DS.W; const cnt = k => W.reduce((a, w) => a + w.items.filter(i => i.type === k).length, 0);
    b += `<p class="mini">${esc(DS.topic)} · ${W.length}${U ? '주' : '차시'} · 영상 ${cnt('video')} · 퀴즈 ${cnt('quiz')} · 과제 ${cnt('assign')} · 시험 ${cnt('exam')}${DS.docs ? ` · 강의자료 ${W.filter(w => w.items.some(i => i.type === 'video')).length}` : ''} · 영상 출처 ${DS.vsrc === 'ai' ? 'AI 생성' : 'YouTube'}. 만든 뒤에도 모든 항목을 고칠 수 있습니다.</p><div class="dsw">${W.map(w => `<div class="dsr"><span class="wn">${w.w}${U ? '주' : '차시'}</span><b>${esc(w.title)}</b><span>${w.items.map(i => `<em class="ty">${ITEMX[i.type]}</em>`).join('')}</span></div>`).join('')}</div>`; }
  modal('AI 과정 설계', b, [{ id: 'c', label: '취소' }, ...(DS.step === 2 ? [{ id: 'p', label: '이전', run: () => { DS.step = 1; setTimeout(dsRender); } }] : []), DS.step === 1 ? { id: 'n', label: '설계하기', kind: 'pri', run: () => { DS.topic = $('#dsT').value.trim(); if (!DS.topic) { toast('주제를 입력하세요.', 'warn'); return false; } Object.assign(DS, { target: $('#dsA').value.trim(), weeks: clamp(+$('#dsW').value || 6, 1, 30), hours: +$('#dsH').value || 1, level: $('#dsL').value, vids: +$('#dsV').value, yt: $('#dsY').checked, quiz: $('#dsQ').checked, assign: $('#dsS').checked, exam: $('#dsE').checked, docs: $('#dsD').checked }); DS.W = AI.design(DS); DS.step = 2; S.ai.usage++; setTimeout(dsRender); } } : { id: 'ok', label: `이 설계로 ${t('cls')} 만들기`, kind: 'pri', run: () => dsCreate() }], true);
}
function dsCreate() {
  const c = { id: uid('c'), name: DS.topic, kind: 'period', sub: '', status: '준비중', price: 0, open: '비공개', start: today(), end: addDays(today(), DS.weeks * 7), teacher: S.me.name, group: '', learners: [], prog: {}, criteria: { video: 50, exam: 30, assign: 20, threshold: 70 }, cert: 'auto', skip: false, speed: true, early: false, community: 'class', hours: DS.weeks * DS.hours, goal: AI.goal(DS.topic, DS.target), notices: [], level: 0 };
  c.curriculum = itemsFromDesign(DS.W, DS); c.weekly = true; c.weekPlan = DS.W.map(w => ({ w: w.w, title: w.title, goal: w.goal }));
  S.classes.unshift(c); logAudit(`AI 과정 설계 — ${c.name} (${DS.weeks}${DS.univ ? '주' : '차시'})`); save(); UI.cls = c.id; UI.clsT = 'curriculum'; const yt = DS.yt && DS.vsrc !== 'ai'; DS = null;
  setTimeout(() => { go('class'); toast('과정을 만들었습니다. 항목을 눌러 확인 · 수정하세요.', 'ok'); if (yt) ytAutofill(c).then(n => { if (n === -1) toast('영상 검색어를 준비했습니다. 설정 › 연동에 YouTube API 키를 넣으면 자동 연결됩니다.'); else if (n) toast(`YouTube 영상 ${n}개를 자동 연결했습니다.`, 'ok'); }); });
}

/* ═════════ 평가: 채점(루브릭 · AI 평가) · 루브릭 · 문항 은행 ═════════ */
const asgItem = c => c.curriculum.find(i => i.type === 'assign');
const rubricOf = c => S.rubrics.find(r => r.id === asgItem(c)?.rubric) || S.rubrics[0];
VIEWS.assess = () => {
  const f = UI.asF || 'wait'; const P = pend().sort((a, b) => a.c.prog[a.id].subAt.localeCompare(b.c.prog[b.id].subAt));
  const D = S.classes.flatMap(c => Object.entries(c.prog).filter(([, p]) => ['graded', 'returned', 'failed'].includes(p.assign)).map(([id, p]) => ({ c, id, p })));
  const waits = P.map(x => daysAgo(x.c.prog[x.id].subAt)); const aiN = P.filter(x => x.c.prog[x.id].ai).length;
  let body = '';
  if (f === 'wait') body = table(['제출일', '대기', '이름', t('cls'), '루브릭', 'AI 평가', ''], P.map(({ c, id }) => { const p = c.prog[id], w = daysAgo(p.subAt); return [p.subAt.slice(5), w >= 5 ? tag(w + '일', 'r') : w + '일', mn(id), esc(c.name), esc(rubricOf(c)?.name || '—'), p.ai ? `<b>${p.ai.total}</b>점 ${p.ai.total >= 70 ? tag('통과 권장', 'g') : tag('보완 권장', 'y')}` : '—', `<button class="btn sm ink" data-act="grade" data-c="${c.id}" data-v="${id}">채점</button>`]; }), '검수할 제출물이 없습니다.');
  if (f === 'done') body = table(['이름', t('cls'), '점수', '결과', 'AI 대비', '피드백'], D.map(({ c, id, p }) => [mn(id), esc(c.name), p.score ?? '—', p.assign === 'graded' ? tag('통과', 'g') : p.assign === 'returned' ? tag('재제출', 'y') : tag('미통과', 'r'), p.aiTotal != null ? (Math.abs(p.aiTotal - p.score) <= 10 ? tag('일치', 'g') : tag(`차이 ${p.score - p.aiTotal}`, 'y')) : '—', esc((p.fb || '').slice(0, 40))]));
  if (f === 'rubric') body = `<div class="bar2"><button class="btn ink" data-act="rb-ai">${ic('spark', 16)} AI 루브릭 생성</button><button class="btn" data-act="rb-new">+ 직접 만들기</button><span class="mini">기준 · 배점(합계 100) · 수준별 설명을 정해 두면 AI 평가와 채점이 같은 기준으로 이뤄집니다.</span></div>` +
    S.rubrics.map(r => `<div class="card"><div class="ch"><b>${esc(r.name)}</b><small>${r.criteria.length}개 기준 · ${r.criteria.reduce((a, c) => a + c.pts, 0)}점 · 사용 ${S.classes.reduce((a, c) => a + c.curriculum.filter(i => i.rubric === r.id).length, 0)}곳</small><button class="btn sm" data-act="rb-edit" data-v="${r.id}">편집</button></div>${rubricTable(r)}</div>`).join('');
  if (f === 'bank') { const B = S.bank || []; body = `<div class="bar2"><button class="btn ink" data-act="bk-ai">${ic('spark', 16)} AI 문항 생성</button><button class="btn" data-act="bk-collect">과정 문항 모으기</button><span class="mini">${B.length}문항 · 시험 편집기에서 '문항 은행에서'로 가져옵니다.</span></div>` + table(['유형', '문항', '주제', '난이도', '배점', ''], B.map((q, k) => [tag({ mc: '객관식', ox: 'OX', short: '단답', essay: '서술' }[q.t] || q.t), esc(q.q.slice(0, 80)), esc(q.topic || ''), esc(q.lv || ''), q.pts, `<button class="btn sm ghost" data-act="bk-del" data-v="${k}">삭제</button>`]), '문항 은행이 비어 있습니다.'); }
  return head('', `루브릭으로 기준을 정하고, AI가 기준별 점수와 근거를 먼저 매기면 운영자가 확인해 확정합니다. 통과하면 연결된 배지가 자동 발급됩니다.`, P.length ? `<button class="btn ink" data-act="ai-eval-all">${ic('spark', 16)} 대기 ${P.length}건 AI 평가</button>` : '') +
    `<section class="kpis">${kpi('검수 대기', P.length, '', P.length ? 'mg' : '', '건')}${kpi('AI 평가 완료', aiN, '확정 대기', '', '건')}${kpi('가장 오래된 대기', waits.length ? Math.max(...waits) : 0, '제출 후 경과', '', '일')}${kpi('루브릭', S.rubrics.length, `문항 은행 ${(S.bank || []).length}`, '', '개')}</section>` +
    tabs('asF', [['wait', `채점 대기 ${P.length}`], ['done', `처리 완료 ${D.length}`], ['rubric', '루브릭'], ['bank', '문항 은행']], f) + body;
};
function aiEval(c, id) { const p = c.prog[id], rb = rubricOf(c); const r = AI.evaluate(p.sub, rb); const total = r.reduce((a, x) => a + x.score, 0); p.ai = { crit: r, total, rb: rb.id, fb: total >= 85 ? '요구사항을 충실히 반영했습니다. 실제 적용 사례를 하나 더 붙이면 완성도가 높아집니다.' : total >= 70 ? '핵심은 잘 담았습니다. 근거 자료와 결과 화면을 보완하세요.' : '필수 요소(문제 · 방법 · 결과 · 개선점)를 모두 포함해 다시 제출해 주세요.' }; return p.ai; }
ACT['ai-eval-all'] = () => { const P = pend(); P.forEach(({ c, id }) => aiEval(c, id)); S.ai.usage += P.length; save(); render(); toast(`${P.length}건 AI 평가를 마쳤습니다. 한 건씩 확인 후 확정하세요.`, 'ok'); };
ACT.grade = el => {
  const c = C(el.dataset.c), id = el.dataset.v, p = c.prog[id]; const rb = S.rubrics.find(r => r.id === p.ai?.rb) || rubricOf(c); const ai = p.ai;
  const w = modal(`채점 — ${M(id).name} · ${c.name}`, `<div class="subm"><small>제출물 · ${esc(p.subAt)}</small><p>${esc(p.sub || '(제출 파일 · 링크)').replace(/\n/g, '<br>')}</p></div>
    <div class="bar2"><b>${esc(rb.name)}</b><span class="sp"></span><button class="btn sm ink" data-act="g-ai" data-c="${c.id}" data-v="${id}">${ic('spark', 14)} ${ai ? 'AI 다시 평가' : 'AI 평가'}</button></div>
    <div class="rg">${rb.criteria.map((cr, k) => `<div class="rgr"><div><b>${esc(cr.n)}</b> <small>/${cr.pts}</small>${ai ? `<p class="why">${ic('spark', 12)} ${esc(ai.crit[k].why)}</p>` : ''}</div><div class="lvs">${cr.lv.map((d, j) => `<label title="${esc(d)}"><input type="radio" name="g${k}" value="${j}" ${ai && ai.crit[k].li === j ? 'checked' : ''} data-pts="${Math.round(cr.pts * [1, .7, .4][j])}"><span>${['우수', '보통', '미흡'][j]}<small>${Math.round(cr.pts * [1, .7, .4][j])}</small></span></label>`).join('')}</div></div>`).join('')}</div>
    <div class="gsum">합계 <b id="gTot">${ai ? ai.total : 0}</b>점 ${ai ? `<small class="mini">AI 제안 ${ai.total}점</small>` : ''}</div>
    <label class="fl">피드백<textarea name="f" rows="3">${esc(ai?.fb || '')}</textarea></label><p class="mini">AI 평가는 루브릭 기준의 초안입니다. 최종 판정은 운영자가 합니다. 통과 기준 70점.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'fail', label: '미통과', kind: 'red', run: w => fin(w, 'failed') }, { id: 'ret', label: '재제출 요청', run: w => fin(w, 'returned') }, { id: 'ok', label: '통과', kind: 'pri', run: w => fin(w, 'graded') }], true);
  const tot = () => { const s = $$('.rg input:checked', w).reduce((a, x) => a + +x.dataset.pts, 0); $('#gTot').textContent = s; return s; };
  w.addEventListener('change', e => { if (e.target.closest('.rg')) tot(); });
  function fin(w, st) {
    if ($$('.rg input:checked', w).length < rb.criteria.length) { toast('모든 기준의 수준을 고르세요(AI 평가로 채울 수 있습니다).', 'warn'); return false; }
    p.score = tot(); p.fb = fv(w, 'f'); if (st === 'returned' && !p.fb) { toast('재제출 요청에는 피드백이 필요합니다.', 'warn'); return false; }
    p.assign = st; p.aiTotal = p.ai?.total; p.crit = $$('.rg input:checked', w).map(x => +x.value); delete p.draft;
    let msg = `${M(id).name} — ${{ graded: '통과', returned: '재제출 요청', failed: '미통과' }[st]} (${p.score}점)`;
    if (st === 'graded') { const b = S.badges.find(b => b.cls === c.id && b.method === 'pass' && !b.special); if (b && !b.issued.some(i => i.who === id && i.st === '유효')) { b.issued.unshift({ who: id, at: today(), no: `${b.key}-${String(b.issued.length + 1).padStart(4, '0')}`, how: '자동', st: '유효', reason: '평가 통과' }); msg += ` · 「${b.name}」 배지 자동 발급`; } }
    logAudit('평가 — ' + msg); save(); setTimeout(render); toast(msg, 'ok');
  }
};
ACT['g-ai'] = el => { const c = C(el.dataset.c); aiEval(c, el.dataset.v); S.ai.usage++; save(); closeModal(); ACT.grade(el); };
ACT['ai-grade-all'] = ACT['ai-eval-all'];
/* 루브릭 편집 */
let RB = null;
ACT['rb-new'] = () => { RB = { id: uid('rb'), name: '새 루브릭', criteria: [{ n: '기준 1', pts: 50, lv: ['', '', ''] }, { n: '기준 2', pts: 50, lv: ['', '', ''] }], isNew: true }; rbRender(); };
ACT['rb-edit'] = el => { RB = JSON.parse(JSON.stringify(S.rubrics.find(r => r.id === el.dataset.v))); rbRender(); };
ACT['rb-ai'] = () => modal('AI 루브릭 생성', `<label class="fl">과제 이름 · 설명<textarea name="d" rows="3" placeholder="예: 생성형 AI로 업무 보고서 자동화하기"></textarea></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '생성', kind: 'pri', run: w => { RB = AI.rubric(fv(w, 'd').split('\n')[0] || '과제'); RB.isNew = true; S.ai.usage++; setTimeout(rbRender); } }]);
function rbRender() { const sum = RB.criteria.reduce((a, c) => a + (+c.pts || 0), 0);
  modal('루브릭 편집', `<label class="fl">이름<input id="rbN" value="${esc(RB.name)}" maxlength="40"></label><div class="rbe">${RB.criteria.map((c, k) => `<div class="qe"><div class="qh"><input data-rb="${k}" data-f="n" value="${esc(c.n)}" aria-label="기준 이름"><input type="number" class="pts" min="0" max="100" data-rb="${k}" data-f="pts" value="${c.pts}" aria-label="배점"><small>점</small><button type="button" class="btn sm ghost" data-act="rb-del" data-v="${k}" aria-label="삭제">${ic('x', 14)}</button></div><div class="lv3">${['우수', '보통', '미흡'].map((l, j) => `<label>${l}<textarea rows="2" data-rb="${k}" data-f="l${j}">${esc(c.lv[j])}</textarea></label>`).join('')}</div></div>`).join('')}</div><div class="bar2"><button type="button" class="btn sm" data-act="rb-add">+ 기준</button><span class="${sum === 100 ? 'okt' : 'wt'} mini">배점 합계 ${sum}점</span></div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: () => { RB.name = $('#rbN').value.trim() || RB.name; const s = RB.criteria.reduce((a, c) => a + (+c.pts || 0), 0); if (s !== 100) { toast('배점 합계를 100점으로 맞추세요.', 'warn'); return false; } const n = RB.isNew; delete RB.isNew; const i = S.rubrics.findIndex(r => r.id === RB.id); if (i >= 0) S.rubrics[i] = RB; else S.rubrics.push(RB); logAudit('루브릭 저장 — ' + RB.name); save(); RB = null; UI.asF = 'rubric'; setTimeout(() => go('assess')); } }], true);
  $('#modal').addEventListener('input', e => { const el = e.target; if (el.dataset.rb == null) return; const c = RB.criteria[+el.dataset.rb], f = el.dataset.f; if (f === 'pts') c.pts = +el.value || 0; else if (f === 'n') c.n = el.value; else c.lv[+f[1]] = el.value; }); }
ACT['rb-add'] = () => { RB.name = $('#rbN').value; RB.criteria.push({ n: '새 기준', pts: 0, lv: ['', '', ''] }); rbRender(); };
ACT['rb-del'] = el => { RB.name = $('#rbN').value; RB.criteria.splice(+el.dataset.v, 1); rbRender(); };
ACT['bk-ai'] = () => modal('문항 은행 — AI 생성', `<label class="fl">주제<input name="t" placeholder="예: 데이터 분석 기초"></label><div class="form2"><label>문항 수<input name="n" type="number" min="1" max="30" value="10"></label><label>난이도<select name="l"><option>쉬움</option><option selected>보통</option><option>어려움</option></select></label></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '생성', kind: 'pri', run: w => { const tp = fv(w, 't') || '핵심 개념'; const Q = AI.questions(tp, clamp(+fv(w, 'n') || 10, 1, 30), fv(w, 'l')); (S.bank = S.bank || []).push(...Q.map(q => ({ ...q, topic: tp }))); S.ai.usage++; save(); UI.asF = 'bank'; render(); } }]);
ACT['bk-collect'] = () => { const all = S.classes.flatMap(c => c.curriculum.flatMap(i => (i.qs || []).filter(q => q.t).map(q => ({ ...q, topic: c.name })))); const have = new Set((S.bank || []).map(q => q.q)); const add = all.filter(q => !have.has(q.q)); (S.bank = S.bank || []).push(...add); save(); render(); toast(`${add.length}문항을 모았습니다.`, 'ok'); };
ACT['bk-del'] = el => { S.bank.splice(+el.dataset.v, 1); save(); render(); };

/* ═════════ AI 진단: 만들기(AI · 자료 · 직접) → 결과 설계 → 배포 → 결과 ═════════ */
const DIMS = () => S.org.type === 'univ' ? Object.keys(PRISM) : ['입문', '중급', '고급'];
VIEWS.diag = () => {
  const tb = UI.dgT || 'list'; const D = S.diags || [];
  let body = '';
  if (tb === 'list') body = `<div class="bar2"><button class="btn ink" data-act="dg-new">${ic('spark', 16)} 새 진단 만들기</button><span class="mini">문항을 AI로 생성하거나, 자료(PDF · 텍스트)를 올려 진단을 만들 수 있습니다.</span></div>` +
    `<div class="dgl">${D.map(d => { const n = Object.keys(d.res || {}).length; const tgt = d.to === 'all' ? S.members.length : S.members.filter(m => m.group === d.to).length; return `<div class="card dgc"><div class="ch"><b>${esc(d.name)}</b>${tag(d.status, d.status === '진행 중' ? 'g' : d.status === '초안' ? 'y' : '')}</div><p class="mini">${d.mode === 'type' ? '유형(성향) 진단' : '수준(지식) 진단'} · ${d.items.length}문항 · 출처 ${esc({ ai: 'AI 생성', file: '자료 업로드', manual: '직접 작성' }[d.src])} · 대상 ${tgt}명</p>${bar(n / Math.max(1, tgt) * 100)} <small>${n}명 응시(${pct(n / Math.max(1, tgt) * 100)})</small><div class="bar2" style="margin-top:12px"><button class="btn sm" data-act="dg-edit" data-v="${d.id}">편집</button><button class="btn sm" data-act="dg-try" data-v="${d.id}">미리 응시</button>${d.status === '초안' ? `<button class="btn sm ink" data-act="dg-run" data-v="${d.id}">배포 · 실행</button>` : `<button class="btn sm" data-act="dg-res" data-v="${d.id}">결과 보기</button>`}</div></div>`; }).join('')}</div>`;
  if (tb === 'res') { const d = D.find(x => x.id === UI.dgId) || D.find(x => x.status !== '초안'); if (!d) body = '<div class="empty">실행 중인 진단이 없습니다.</div>'; else { const R = Object.entries(d.res || {}); const cnt = {}; R.forEach(([, r]) => cnt[r.out] = (cnt[r.out] || 0) + 1); const tot = R.length || 1;
    body = `<div class="bar2"><select data-chg="dgSel" aria-label="진단 선택">${D.filter(x => x.status !== '초안').map(x => `<option value="${x.id}" ${x === d ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button class="btn ink" data-act="dg-assign" data-v="${d.id}">${ic('spark', 14)} 결과대로 러닝 저니 배정</button><button class="btn" data-act="dg-csv" data-v="${d.id}">결과 CSV</button></div>
      <section class="g2c"><div class="card"><div class="ch"><b>결과 분포</b><small>${R.length}명</small></div><div class="funnel">${d.outs.map(o => `<div class="fr"><span>${esc(o.k)} <small>${esc(o.l || '')}</small></span><i><b style="width:${(cnt[o.k] || 0) / tot * 100}%;${PRISM[o.k] ? 'background:' + PRISM[o.k][0] : ''}"></b></i><em>${cnt[o.k] || 0}</em></div>`).join('')}</div></div>
      <div class="card"><div class="ch"><b>결과별 러닝 저니</b><small>${dgEnsurePaths(d), d.outs.filter(o => o.mode !== 'one').length}개 결과에 저니 설계됨</small></div>${d.outs.map(o => `<div class="pjrow"><b>${esc(o.k)}</b>${pathFlow(o, true)}</div>`).join('')}</div></section>` +
      table(['이름', t('group'), '결과', '점수', '맞춤 러닝 저니', '응시일'], R.slice(0, 40).map(([id, r]) => [mn(id), gn(M(id)?.group), tag(r.out, 'g'), r.score ?? '—', learnerPathCell(d, id, r), esc(r.at)])); } }
  return head('', '진단 문항을 AI로 만들거나 자료를 올려 만들고, 결과 유형에 따라 추천 과정을 자동 배정합니다.') + tabs('dgT', [['list', `진단 ${D.length}`], ['res', '결과']], tb) + body;
};
ACT.dgSel = el => { UI.dgId = el.value; render(); };
ACT['dg-res'] = el => { UI.dgT = 'res'; UI.dgId = el.dataset.v; render(); };
let DG = null;
ACT['dg-new'] = () => { DG = { id: uid('dg'), name: '', mode: S.org.type === 'univ' ? 'type' : 'level', src: 'ai', topic: '', n: 10, items: [], outs: [], to: 'all', days: 14, status: '초안', res: {}, step: 1, isNew: true }; dgRender(); };
ACT['dg-edit'] = el => { DG = JSON.parse(JSON.stringify(S.diags.find(d => d.id === el.dataset.v))); DG.step = 2; dgRender(); };
function dgDefaultOuts(mode) { return mode === 'type' && S.org.type === 'univ' ? Object.entries(PRISM).map(([k, [, l]], i) => ({ k, l, rec: S.classes[i % S.classes.length]?.id })) : mode === 'type' ? [['관찰형', '정보 탐색'], ['분석형', '비교 · 분석'], ['표현형', '말 · 글 · 영상']].map(([k, l], i) => ({ k, l, rec: S.classes[i]?.id })) : [{ k: '입문', l: '0~59점', min: 0, rec: S.classes[0]?.id }, { k: '중급', l: '60~84점', min: 60, rec: S.classes[1]?.id }, { k: '고급', l: '85점 이상', min: 85, rec: S.classes[2]?.id }]; }
function dgRender() {
  const d = DG; let b = `<div class="stepper">${['기본', '문항', '결과 설계', '배포'].map((l, i) => `<span class="${d.step > i ? 'on' : ''}">${i + 1} ${l}</span>`).join('')}</div>`;
  if (d.step === 1) b += `<label class="fl">진단 이름<input id="dgN" value="${esc(d.name)}" placeholder="예: AI 활용 역량 진단"></label><div class="fl"><span>진단 종류</span><div class="seg2 full"><button type="button" class="${d.mode === 'type' ? 'on' : ''}" data-act="dg-mode" data-v="type">유형(성향) 진단 — 5점 척도</button><button type="button" class="${d.mode === 'level' ? 'on' : ''}" data-act="dg-mode" data-v="level">수준(지식) 진단 — 정답형</button></div></div>
    <div class="fl"><span>문항 만드는 방법</span><div class="seg2 full">${[['ai', 'AI 생성'], ['file', '자료 업로드'], ['manual', '직접 작성']].map(([k, l]) => `<button type="button" class="${d.src === k ? 'on' : ''}" data-act="dg-src" data-v="${k}">${l}</button>`).join('')}</div></div>
    ${d.src === 'ai' ? `<div class="form2"><label>주제 · 역량<input id="dgT" value="${esc(d.topic)}" placeholder="예: 생성형 AI 활용"></label><label>문항 수<input id="dgC" type="number" min="4" max="40" value="${d.n}"></label></div>` : ''}
    ${d.src === 'file' ? `<div class="fl"><span>자료 올리기(PDF · TXT · MD, 최대 20쪽)</span><input type="file" id="dgF" accept=".pdf,.txt,.md,text/plain,application/pdf"></div><label class="fl">또는 텍스트 붙여 넣기<textarea id="dgX" rows="5" placeholder="교재 · 강의자료 · 직무 기술서 등 진단 기준이 될 내용">${esc(d.text || '')}</textarea></label><p class="mini">자료의 핵심어와 문장으로 '자료와 일치하는 설명 고르기' 문항을 만듭니다. 자료는 서버로 보내지 않고 이 브라우저에서만 읽습니다.</p><p id="dgFs" class="mini"></p>` : ''}
    ${d.src === 'manual' ? '<p class="mini">다음 단계에서 문항을 직접 추가합니다.</p>' : ''}`;
  if (d.step === 2) b += `<div class="bar2"><button type="button" class="btn sm" data-act="dg-addq">+ 문항</button><span class="mini">${d.items.length}문항 · ${d.mode === 'type' ? '각 문항은 결과 유형 하나에 연결됩니다' : '정답 문항 점수 합으로 수준을 정합니다'}</span></div>
    <div class="qlist">${d.items.map((q, k) => `<div class="qe"><div class="qh"><b>${k + 1}</b>${d.mode === 'type' ? `<select data-dg="${k}" data-f="dim">${DIMS().map(x => `<option ${q.dim === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : tag(q.src === '자료' ? '자료 기반' : '객관식')}<span class="sp"></span><button type="button" class="btn sm ghost" data-act="dg-delq" data-v="${k}" aria-label="삭제">${ic('x', 14)}</button></div><textarea rows="2" data-dg="${k}" data-f="q">${esc(q.q)}</textarea>${q.t === 'mc' ? `<div class="opts">${q.opts.map((o, j) => `<label><input type="radio" name="dq${k}" data-dg="${k}" data-f="a" value="${j}" ${String(q.a) === String(j) ? 'checked' : ''}><input data-dg="${k}" data-f="o${j}" value="${esc(o)}"></label>`).join('')}</div>` : '<small class="mini">1 전혀 아니다 ~ 5 매우 그렇다</small>'}</div>`).join('') || '<div class="empty">문항이 없습니다.</div>'}</div>`;
  if (d.step === 3) { if (!d.outs.length) d.outs = dgDefaultOuts(d.mode); dgEnsurePaths(d);
    b += `<p class="mini">${d.mode === 'type' ? '가장 높은 점수의 유형이 결과가 됩니다.' : '맞힌 문항 점수 합계(100점 환산)로 수준을 정합니다.'} 결과마다 단일 ${esc(t('cls'))} 대신 <b>단계별 러닝 저니</b>를 설계해 추천 · 배정할 수 있습니다.</p>` + dgOutsHTML(d); }
  if (d.step === 4) b += `<div class="form2"><label>대상<select id="dgTo"><option value="all">전체 ${esc(t('learner'))}</option>${S.groups.map(g => `<option value="${g.id}" ${d.to === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label><label>응시 기간(일)<input id="dgD" type="number" min="1" max="90" value="${d.days}"></label></div><label class="ckl"><input type="checkbox" id="dgM" checked> 대상에게 응시 안내 알림 보내기</label><p class="mini">배포하면 학습자 화면에 진단이 열리고, 결과는 '결과' 탭에 모입니다.</p>`;
  const nxt = d.step < 4 ? { id: 'n', label: d.step === 1 ? '문항 만들기' : '다음', kind: 'pri', run: () => dgNext() } : { id: 'ok', label: '배포 · 실행', kind: 'pri', run: () => dgSave(true) };
  modal(d.isNew ? '새 진단 만들기' : '진단 편집', b, [{ id: 'c', label: '취소' }, ...(d.step > 1 ? [{ id: 'p', label: '이전', run: () => { dgRead(); d.step--; setTimeout(dgRender); return true; } }] : []), ...(d.step >= 2 ? [{ id: 's', label: '초안 저장', run: () => dgSave(false) }] : []), nxt], true);
  const m = $('#modal'); m.addEventListener('input', e => { const el = e.target; if (el.dataset.dg != null) { const q = d.items[+el.dataset.dg], f = el.dataset.f; if (/^o\d$/.test(f)) q.opts[+f[1]] = el.value; else q[f] = el.value; } });
  m.addEventListener('change', e => { const el = e.target; if (el.dataset.dgo != null) d.outs[+el.dataset.dgo].rec = el.value; if (el.id === 'dgF') readMaterial(el.files[0]); });
}
function dgRead() { const d = DG; if ($('#dgN')) d.name = $('#dgN').value.trim(); if ($('#dgT')) { d.topic = $('#dgT').value.trim(); d.n = clamp(+$('#dgC').value || 10, 4, 40); } if ($('#dgX')) d.text = $('#dgX').value; if ($('#dgTo')) { d.to = $('#dgTo').value; d.days = +$('#dgD').value || 14; } }
ACT['dg-mode'] = el => { dgRead(); DG.mode = el.dataset.v; DG.outs = []; dgRender(); };
ACT['dg-src'] = el => { dgRead(); DG.src = el.dataset.v; dgRender(); };
ACT['dg-addq'] = () => { DG.items.push(DG.mode === 'type' ? { t: 'likert', q: '', dim: DIMS()[0] } : { t: 'mc', q: '', opts: ['', '', '', ''], a: '0' }); dgRender(); };
ACT['dg-delq'] = el => { DG.items.splice(+el.dataset.v, 1); dgRender(); };
async function readMaterial(f) { if (!f) return; const st = $('#dgFs'); st.textContent = '자료를 읽는 중…'; try {
  let text = ''; if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') { await loadPdf(); const doc = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; for (let i = 1; i <= Math.min(20, doc.numPages); i++) { const pg = await doc.getPage(i); const tc = await pg.getTextContent(); text += tc.items.map(x => x.str).join(' ') + '\n'; } } else text = await f.text();
  DG.text = text.slice(0, 60000); $('#dgX').value = DG.text; st.textContent = `${f.name} — ${DG.text.length.toLocaleString()}자를 읽었습니다.`; } catch (e) { console.error(e); st.textContent = '자료를 읽지 못했습니다. 텍스트를 붙여 넣어 주세요.'; } }
function loadPdf() { return window.pdfjsLib ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor/pdf.min.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; ok(); }; s.onerror = no; document.head.appendChild(s); }); }
function dgNext() { dgRead(); const d = DG;
  if (d.step === 1) { if (!d.name) { toast('진단 이름을 입력하세요.', 'warn'); return false; }
    if (d.src === 'ai') { d.items = d.mode === 'type' ? AI.likert(d.topic, DIMS()).slice(0, Math.max(d.n, DIMS().length)) : AI.questions(d.topic || d.name, d.n, '보통', ['mc']).map(q => ({ ...q, t: 'mc' })); S.ai.usage++; }
    if (d.src === 'file') { if ((d.text || '').length < 200) { toast('자료가 너무 짧습니다(200자 이상).', 'warn'); return false; } const r = AI.fromText(d.text, d.mode === 'level' ? d.n || 10 : 8); if (d.mode === 'type') { d.items = AI.likert(r.kws.slice(0, 3).join(' · '), DIMS()); toast('유형 진단은 자료 핵심어로 문항 주제를 잡았습니다.'); } else { if (!r.qs.length) { toast('자료에서 문항을 만들 핵심어를 찾지 못했습니다. 더 긴 자료를 넣어 주세요.', 'warn'); return false; } d.items = r.qs; toast(`자료 ${r.sents}문장에서 ${r.qs.length}문항을 만들었습니다.`, 'ok'); } S.ai.usage++; }
  }
  if (d.step === 2 && !d.items.length) { toast('문항을 하나 이상 넣으세요.', 'warn'); return false; }
  d.step++; setTimeout(dgRender); }
function dgSave(run) { dgRead(); const d = DG; if (run) { d.status = '진행 중'; d.start = today(); d.end = addDays(today(), d.days); if ($('#dgM')?.checked) S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: d.to === 'all' ? '전체' : S.groups.find(g => g.id === d.to)?.name, title: `${d.name} 응시 안내`, ch: '알림함 + 앱 푸시', n: d.to === 'all' ? S.members.length : S.members.filter(m => m.group === d.to).length }); }
  if (!d.outs.length) d.outs = dgDefaultOuts(d.mode); const isNew = d.isNew; delete d.isNew; delete d.step; const i = S.diags.findIndex(x => x.id === d.id); if (i >= 0) S.diags[i] = d; else S.diags.unshift(d); logAudit(`진단 ${run ? '배포' : '저장'} — ${d.name}`); save(); DG = null; setTimeout(() => go('diag')); toast(run ? '진단을 배포했습니다.' : '초안을 저장했습니다.', 'ok'); }
ACT['dg-run'] = el => { DG = JSON.parse(JSON.stringify(S.diags.find(d => d.id === el.dataset.v))); DG.step = 4; dgRender(); };
ACT['dg-try'] = el => { const d = S.diags.find(x => x.id === el.dataset.v);
  modal(`미리 응시 — ${d.name}`, `<div class="try">${d.items.map((q, k) => `<div class="tq"><b>${esc(q.q)}</b>${q.t === 'mc' ? q.opts.map((o, j) => `<label><input type="radio" name="t${k}" value="${j}"> ${esc(o)}</label>`).join('') : `<div class="lk">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="t${k}" value="${v}"><span>${v}</span></label>`).join('')}</div>`}</div>`).join('')}</div>`,
    [{ id: 'c', label: '닫기' }, { id: 'ok', label: '결과 보기', kind: 'pri', run: w => { const r = scoreDiag(d, k => w.querySelector(`[name=t${k}]:checked`)?.value); setTimeout(() => modal('진단 결과(미리 보기)', `<div class="aibox"><b>${esc(r.out)}</b>${r.score != null ? ` · ${r.score}점` : ''}</div>${pathFlow(d.outs.find(o => o.k === r.out))}`, [{ id: 'c', label: '확인' }])); } }], true); };
function scoreDiag(d, get) {
  if (d.mode === 'type') { const s = {}; d.items.forEach((q, k) => { const v = +get(k) || 0; s[q.dim] = (s[q.dim] || 0) + v; }); const out = Object.entries(s).sort((a, b) => b[1] - a[1])[0]?.[0] || d.outs[0].k; return { out }; }
  let sc = 0, tot = 0; d.items.forEach((q, k) => { const p = +q.pts || Math.round(100 / d.items.length); tot += p; if (String(get(k)) === String(q.a)) sc += p; }); const score = Math.round(sc / Math.max(1, tot) * 100);
  const out = [...d.outs].sort((a, b) => (b.min || 0) - (a.min || 0)).find(o => score >= (o.min || 0))?.k || d.outs[0].k; return { out, score };
}
ACT['dg-assign-one'] = el => { const d = S.diags.find(x => x.id === el.dataset.v); let n = 0; Object.entries(d.res || {}).forEach(([id, r]) => { const c = C(d.outs.find(o => o.k === r.out)?.rec); if (c && !c.learners.includes(id)) { c.learners.push(id); c.prog[id] = { p: 0, exam: null, assign: 'none', att: 100, subAt: today() }; n++; } }); logAudit(`진단 결과 배정 — ${d.name} ${n}명`); save(); render(); toast(`${n}명을 결과에 맞는 ${t('cls')}에 배정했습니다.`, 'ok'); };
ACT['dg-csv'] = el => { const d = S.diags.find(x => x.id === el.dataset.v); downloadCSV(`${d.name}_결과.csv`, [S.org.type === 'univ' ? '학번' : '이름', t('group'), '결과', '점수', '응시일'], Object.entries(d.res || {}).map(([id, r]) => [M(id)?.extra?.학번 || M(id)?.name, S.groups.find(g => g.id === M(id)?.group)?.name, r.out, r.score ?? '', r.at])); };

/* ═════════ 설정 › 연동(YouTube API) ═════════ */
function integrView() { const y = S.settings.yt || (S.settings.yt = { key: '', cc: false, maxMin: 30 });
  return `<div class="card form1"><div class="ch"><b>YouTube 자동 추천</b>${tag(y.key ? '연결됨' : '키 없음', y.key ? 'g' : 'y')}</div>
    <p class="mini">Google Cloud에서 YouTube Data API v3 키를 만들어 넣으면 과정 설계 · 콘텐츠 채우기 때 후보 영상을 자동으로 불러옵니다. 키는 이 브라우저에만 저장되며, 실제 운영에서는 서버에 보관하고 서버가 대신 검색합니다. 키는 HTTP 리퍼러 제한을 걸어 두세요.</p>
    <label class="fl">API 키<input type="password" autocomplete="off" value="${esc(y.key)}" data-chg="yt" data-k="key" placeholder="AIza…"></label>
    <label class="ckl"><input type="checkbox" ${y.cc ? 'checked' : ''} data-chg="yt" data-k="cc"> CC(크리에이티브 커먼즈) 라이선스 영상만</label>
    <label class="fl">최대 길이<select data-chg="yt" data-k="maxMin"><option value="4" ${y.maxMin == 4 ? 'selected' : ''}>4분 이하</option><option value="20" ${y.maxMin == 20 ? 'selected' : ''}>4~20분</option><option value="60" ${y.maxMin >= 30 ? 'selected' : ''}>제한 없음</option></select></label>
    <button class="btn sm" data-act="yt-test">연결 확인</button></div>`; }
ACT.yt = el => { const y = S.settings.yt; y[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.dataset.k === 'maxMin' ? +el.value : el.value.trim(); save(); toast('저장했습니다.', 'ok'); render(); };
ACT['yt-test'] = async () => { if (!S.settings.yt.key) { toast('API 키를 먼저 넣으세요.', 'warn'); return; } const r = await ytSearch('교육 강의'); if (r && r.length) toast(`연결됐습니다. 예: ${r[0].title}`, 'ok'); };

/* ═════════ 상태 보강(시드 후 · 이전 버전 데이터) ═════════ */
const SAMPLE_SUB = ['문제: 반복되는 주간 보고서 작성 시간이 길다.\n목표: 생성형 AI로 초안 작성 시간을 절반으로 줄인다.\n방법: 보고서 양식과 지난 자료를 정리하고 역할 · 조건 · 형식을 담은 프롬프트를 설계했다. 과정에서 결과를 3회 비교하며 개선했다.\n결과: 작성 시간이 90분에서 35분으로 줄었다. 근거로 작성 기록을 첨부한다.\n개선: 수치 검증 단계를 추가할 예정이다.', '수업 내용을 바탕으로 동아리 홍보 포스터를 만들었습니다. 이미지 생성 도구로 시안 3개를 만들고 친구들 의견을 받아 하나를 골랐습니다. 결과물은 첨부했습니다.', '과제 제출합니다. 실습한 내용 정리.'];
function postSeed(type) {
  S.rubrics = [AI.rubric('실습 결과물'), AI.rubric('프로젝트 보고서')]; S.bank = []; S.settings.yt = { key: '', cc: false, maxMin: 30 };
  S.classes.forEach((c, ci) => {
    c.curriculum.forEach(it => { if (it.type === 'video') { it.src = 'youtube'; it.q = `${clean(c.name)} ${it.title}`; } if (['quiz', 'exam'].includes(it.type)) { it.qs = AI.questions(clean(c.name), it.type === 'exam' ? 10 : 5); it.time = it.type === 'exam' ? 60 : 10; it.retake = 1; } if (it.type === 'assign') { Object.assign(it, AI.assignment(c.name)); it.rubric = S.rubrics[ci % 2].id; } });
    Object.entries(c.prog).forEach(([, p], j) => { if (p.assign !== 'none') p.sub = SAMPLE_SUB[j % 3]; });
    if (type === 'univ' && c.kind === 'period') { const W = AI.design({ topic: c.name, weeks: 15, univ: true, quiz: true, assign: true, exam: true, vids: 1, level: '보통' }); c.curriculum = itemsFromDesign(W, { topic: c.name, rubric: S.rubrics[0].id }); c.curriculum.forEach(it => { if (it.type === 'assign') it.rubric = it.rubric || S.rubrics[0].id; }); c.weekly = true; c.weekPlan = W.map(w => ({ w: w.w, title: w.title, goal: w.goal })); }
  });
  const dims = type === 'univ' ? Object.keys(PRISM) : null;
  S.diags = type === 'univ' ? [{ id: 'dg0', name: 'AI 활용 역량 진단(PRISM)', mode: 'type', src: 'ai', topic: 'AI 활용', n: 10, items: AI.likert('AI 활용', dims), outs: dgDefaultOuts('type'), to: 'all', days: 30, status: '진행 중', start: addDays(today(), -20), end: addDays(today(), 10), res: Object.fromEntries(S.members.filter(m => m.diag).map(m => [m.id, { out: m.diag, at: addDays(today(), -Math.floor(rnd() * 18)) }])) }] : [];
}
function upgradeState() { if (S.rubrics) return; postSeed(S.org.type); save(); }
