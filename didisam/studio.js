/* 디디쌤 스튜디오 v4
   ① AI 강의 영상(대본 · 슬라이드 → 재생 · WebM 파일) · AI 강의자료(교안)
   ② 진단 결과 → 단계별 러닝 저니 설계 · 개인 맞춤 추천 · 배정
   ③ AI SAM 상시 사이드 패널 + 대화 한 줄로 여러 메뉴를 채우는 '흐름' 자동화
   데모 AI는 브라우저 규칙 생성기. 운영 모드에서는 서버 함수(Claude · TTS)로 바꾼다. */
'use strict';

/* ═════════ ① AI 강의 영상 · 강의자료 ═════════ */
const LEC = [
  ['학습 목표', t => [`${t}${AI.j(t, '이')} 무엇인지 설명할 수 있다`, '핵심 원리를 실제 사례에 적용할 수 있다', '배운 내용을 스스로 점검할 수 있다'], t => `안녕하세요. 이번 시간에는 ${t}${AI.j(t, '을')} 함께 살펴보겠습니다. 먼저 오늘의 학습 목표 세 가지를 확인하겠습니다.`],
  ['왜 필요할까요?', t => ['현장에서 자주 마주치는 문제', '기존 방식의 한계', `${t}${AI.j(t, '이')} 만드는 변화`], t => `${t}${AI.j(t, '을')} 배우는 이유부터 짚어 보겠습니다. 현장에서 반복되는 문제와 기존 방식의 한계를 보면 왜 지금 이 내용이 필요한지 알 수 있습니다.`],
  ['핵심 개념', t => ['정의 — 한 문장으로 말하기', '구성 요소 세 가지', '꼭 알아야 할 용어'], t => `${t}의 핵심 개념입니다. 정의를 한 문장으로 말할 수 있어야 하고, 이를 이루는 구성 요소와 자주 쓰는 용어를 함께 기억해 두세요.`],
  ['원리 이해', () => ['입력 → 처리 → 결과의 흐름', '조건이 바뀌면 결과도 바뀐다', '점검하고 고치는 과정을 반복한다'], t => `${t}${AI.j(t, '은')} 입력, 처리, 결과의 흐름으로 이해하면 쉽습니다. 조건을 바꾸면 결과가 달라지고, 결과를 점검해 다시 고치는 과정이 품질을 만듭니다.`],
  ['사례로 보기', () => ['상황: 무엇이 문제였나', '적용: 어떤 방법을 썼나', '결과: 무엇이 달라졌나'], t => `실제 사례로 보겠습니다. 어떤 상황에서 ${t}${AI.j(t, '을')} 적용했고, 그 결과 무엇이 달라졌는지 순서대로 따라가 보세요.`],
  ['따라 해 보기 ①', () => ['목표를 한 줄로 정한다', '필요한 조건과 자료를 준비한다', '첫 결과를 만들어 본다'], () => '이제 직접 해 보겠습니다. 목표를 한 줄로 정하고, 필요한 조건과 자료를 준비한 뒤 첫 결과를 만들어 보세요.'],
  ['따라 해 보기 ②', () => ['기준에 비추어 결과를 점검한다', '부족한 부분을 고친다', '최종본을 정리해 저장한다'], () => '만든 결과를 기준에 비추어 점검합니다. 부족한 부분을 고치고, 최종본을 정리해 저장하면 실습이 끝납니다.'],
  ['자주 하는 실수', () => ['맥락과 조건을 빠뜨린다', '검증 없이 그대로 쓴다', '기준 없이 느낌으로 판단한다'], () => '많이 하는 실수 세 가지입니다. 맥락과 조건을 빠뜨리는 것, 결과를 검증하지 않고 쓰는 것, 기준 없이 판단하는 것을 주의하세요.'],
  ['심화 팁', () => ['단계를 나눠 진행한다', '예시를 함께 제시한다', '결과를 기록하고 비교한다'], () => '한 단계 더 나아가는 팁입니다. 작업을 단계로 나누고, 예시를 함께 주고, 결과를 기록해 비교하면 품질이 안정됩니다.'],
  ['내 전공 · 업무에 적용', () => ['적용할 장면 하나 고르기', '기대 효과 적어 보기', '다음 주까지 한 번 실행하기'], t => `배운 ${t}${AI.j(t, '을')} 자신의 전공이나 업무에 적용해 보세요. 장면 하나를 고르고, 기대 효과를 적고, 다음 시간 전까지 한 번 실행해 보는 것이 목표입니다.`],
  ['생각해 볼 질문', () => ['어디에 가장 먼저 쓸 수 있을까?', '주의해야 할 점은 무엇일까?', '어떻게 결과를 평가할까?'], () => '마지막으로 생각해 볼 질문입니다. 어디에 가장 먼저 쓸 수 있을지, 무엇을 주의해야 할지, 결과를 어떻게 평가할지 정리해 보세요.'],
  ['정리', t => [`${t}의 개념과 원리`, '실습 순서: 목표 → 조건 → 결과 → 점검', '다음 시간 예고'], t => `오늘은 ${t}의 개념과 원리, 그리고 실습 순서를 배웠습니다. 확인 퀴즈로 이해도를 점검하고 다음 시간에 뵙겠습니다.`]
];
const lecTopic = s => clean(String(s || '').replace(/^\d+(주차|주|회차|차시)\s*(강의자료)?\s*—?\s*/, '').replace(/^[^:]*:\s*/, m => m.length > 24 ? '' : m).replace(/:/g, ' ')).replace(/\s+/g, ' ').trim() || '핵심 개념';
Object.assign(AI, {
  /* v36 1-④-3: 고른 길이에 맞춘다 — 장면 수(1분에 약 1.8장면)와 장면마다 읽을 말의 양(1초에 약 7글자)을 길이에서 거꾸로 계산한다.
     예전에는 장면이 최대 ${LEC.length}개 · 장면당 22초로 막혀 '5분'을 골라도 약 2분이었다 */
  lecture(title, mins = 5, o) {
    const tp = lecTopic(title); const M = clamp(+mins || 5, 1, 30); const n = o && o.short ? clamp(Math.round(M * 1.6), 4, LEC.length) : clamp(Math.round(M * 1.8), 4, 40);
    const mid = LEC.slice(1, -1); const pickN = n - 2; const used = {};
    const sel = Array.from({ length: pickN }, (_, i) => { const x = mid[Math.floor(i * mid.length / pickN) % mid.length]; used[x[0]] = (used[x[0]] || 0) + 1; return [used[x[0]] > 1 ? `${x[0]} (${used[x[0]]})` : x[0], x[1], x[2], used[x[0]]]; });
    const per = M * 60 / n * 7; /* 장면 하나에 읽을 글자 수 */
    const J = (w, p) => w + AI.j(w, p);
    const MORE = [p => `첫째, ${p[0]}. 이 부분을 먼저 분명히 해 두어야 다음 내용이 쉽게 이어집니다.`, p => `둘째, ${p[1] || p[0]}. 여러분의 수업이나 업무에서 비슷한 장면을 하나 떠올려 보세요.`, p => `셋째, ${p[2] || p[0]}. 화면의 요점을 보며 잠시 생각해 볼 시간을 갖겠습니다.`,
      () => `예를 들어 처음 ${J(tp, '을')} 시도하는 사람은 목표를 너무 넓게 잡는 경우가 많습니다. 범위를 좁히면 결과가 훨씬 좋아집니다.`, () => `여기서 잠깐, 지금까지 들은 내용을 한 문장으로 정리해 보세요. 스스로 말할 수 있다면 잘 따라오고 있는 것입니다.`,
      () => `${J(tp, '은')} 한 번에 완성되지 않습니다. 작게 시작해서 결과를 확인하고, 고치고, 다시 해 보는 과정이 중요합니다.`, () => `이 내용은 뒤에 나오는 실습과 확인 퀴즈에서 다시 다룹니다. 헷갈리는 부분은 표시해 두었다가 그때 확인해 보세요.`,
      () => `실제로 해 보면 생각보다 시간이 걸릴 수 있습니다. 그래도 순서를 지키면 같은 실수를 줄일 수 있습니다.`];
    const ORD = k => [0, 1, 2, ...Array.from({ length: MORE.length - 3 }, (_, i) => 3 + (i + k) % (MORE.length - 3))]; /* 첫째 · 둘째 · 셋째는 순서대로, 나머지 덧붙임 말은 장면마다 다르게 */
    const grow = (say, pts, k) => { if (o && o.short) return say; let t = say; const L = ORD(k); let j = 0; while (t.length < per * 0.92 && j < L.length) { t += ' ' + MORE[L[j]](pts); j++; } return t; };
    return [LEC[0], ...sel, LEC[LEC.length - 1]].map(([h, p, s, rep], k) => { const pts = p(tp); const say0 = s(tp) + (rep > 1 ? ` 앞에서 본 내용을 다른 각도에서 한 번 더 짚어 보겠습니다.` : ''); return { h, pts, say: grow(say0, pts, k) }; });
  },
  material(topic, c, scenes) {
    const tp = lecTopic(topic); const sc = scenes && scenes.length ? scenes : AI.lecture(tp, 6, { short: 1 }); /* 교안 · 디지털북 본문은 영상 길이용 덧붙임 말 없이 */
    return { title: tp, goals: sc[0].pts.slice(), secs: sc.slice(1, -1).map(s => ({ h: s.h, body: s.say, pts: s.pts.slice() })),
      act: `「${tp}」 실습: ① 목표 한 줄 쓰기 ② 조건 · 자료 준비 ③ 결과 만들기 ④ 기준으로 점검 · 수정 ⑤ 최종본과 느낀 점 제출`,
      check: AI.questions(tp, 3, '보통', ['mc', 'ox', 'short']).map(q => q.q.replace(/^\d+\.\s*/, '')), course: c?.name || '' };
  }
});
const secsFor = s => window.__REC_FAST ? 0.35 : clamp(String(s || '').length / 7, 3, 180); /* v36: 장면당 22초 상한을 없애 고른 길이와 맞춘다 */

/* 영상 편집기(소스 'ai') */
function aivEditor(it) {
  const A = it.ai || {}; const sc = A.scenes || []; const tot = sc.reduce((a, s) => a + secsFor(s.say), 0);
  return `<div class="aiv"><div class="form2"><label>강의 주제<input data-ed="aiTopic" value="${esc(it.aiTopic ?? lecTopic(it.title))}"></label><label>길이<select data-ed="aiMins">${[3, 5, 10, 15].map(m => `<option value="${m}" ${(+(it.aiMins || A.mins || 5)) === m ? 'selected' : ''}>${m}분 내외</option>`).join('')}</select></label><label>내레이션 목소리<select data-ed="aiVoice"><option value="f" ${(it.aiVoice || A.voice) !== 'm' ? 'selected' : ''}>여성</option><option value="m" ${(it.aiVoice || A.voice) === 'm' ? 'selected' : ''}>남성</option></select></label><label>화면 구성<select data-ed="aiStyle"><option value="slide">슬라이드 + 자막</option><option value="host" ${it.aiStyle === 'host' ? 'selected' : ''}>AI 진행자 + 슬라이드(운영 모드)</option></select></label></div>
    <div class="bar2"><button type="button" class="btn sm ink" data-act="aiv-gen">${ic('spark', 14)} ${sc.length ? 'AI 대본 · 슬라이드 다시 만들기' : 'AI 대본 · 슬라이드 만들기'}</button>${sc.length ? `<button type="button" class="btn sm" data-act="aiv-play">재생 · 미리 보기</button><button type="button" class="btn sm" data-act="aiv-rec">영상 파일 만들기(WebM)</button><button type="button" class="btn sm" data-act="aiv-doc">이 대본으로 강의자료 만들기</button><span class="mini">${sc.length}장면 · 약 ${Math.max(1, Math.round(tot / 60))}분</span>` : ''}</div>
    ${sc.length ? `<div class="scns">${sc.map((s, k) => `<div class="scn"><div class="qh"><b>${k + 1}</b><input data-sc="${k}" data-f="h" value="${esc(s.h)}" aria-label="${k + 1}장면 제목"><span class="sp"></span><button type="button" class="btn sm ghost" data-act="aiv-del" data-v="${k}" aria-label="장면 삭제">${ic('x', 14)}</button></div><div class="scg"><label>슬라이드 요점(줄마다 1개)<textarea rows="3" data-sc="${k}" data-f="pts">${esc(s.pts.join('\n'))}</textarea></label><label>내레이션 대본<textarea rows="3" data-sc="${k}" data-f="say">${esc(s.say)}</textarea></label></div></div>`).join('')}</div>` : '<div class="empty">주제와 길이를 정하고 \'AI 대본 · 슬라이드 만들기\'를 누르세요. 장면마다 슬라이드 요점과 내레이션 대본이 만들어집니다.</div>'}
    <p class="mini">데모는 브라우저 음성으로 내레이션을 재생하고, 파일은 자막이 들어간 무음 WebM으로 만듭니다. 운영 모드에서는 서버 TTS로 음성이 입혀진 MP4가 생성되고 'AI 진행자'를 고를 수 있습니다.</p></div>`;
}
document.addEventListener('input', e => { const el = e.target; if (!ED || el.dataset.sc == null) return; const s = ED.it.ai.scenes[+el.dataset.sc]; if (el.dataset.f === 'pts') s.pts = el.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 6); else s[el.dataset.f] = el.value; });
ACT['aiv-gen'] = () => { const it = ED.it; const mins = +(it.aiMins || 5); it.ai = { scenes: AI.lecture(it.aiTopic || it.title, mins), mins, voice: it.aiVoice || 'f', style: it.aiStyle || 'slide' }; S.ai.usage++; edRender(); toast(`${it.ai.scenes.length}장면 대본과 슬라이드를 만들었습니다.`, 'ok'); };
ACT['aiv-del'] = el => { ED.it.ai.scenes.splice(+el.dataset.v, 1); edRender(); };
ACT['aiv-play'] = () => aiPlayer(ED.it.title, ED.it.ai.scenes, ED.it.aiVoice || ED.it.ai.voice, ED.it.subs?.tracks);
ACT['aiv-rec'] = () => { const l = ED.it.subs?.burn; aiRecord(ED.it.title, ED.it.ai.scenes, l ? ED.it.subs.tracks[l] : null); };
ACT['aiv-doc'] = () => { const c = ED.c, it = ED.it; c.curriculum.push({ id: uid('it'), type: 'doc', title: `${lecTopic(it.title)} 강의자료`, week: it.week, topic: lecTopic(it.title), doc: AI.material(it.title, c, it.ai.scenes) }); save(); toast('같은 대본으로 강의자료를 만들어 커리큘럼에 추가했습니다.', 'ok'); };

/* 강의자료 편집기 */
function docEditor(it) {
  const D = it.doc; const v = ED.c.curriculum.find(x => x.type === 'video' && x.src === 'ai' && x.week === it.week && (x.ai?.scenes || []).length);
  let h = `<div class="form2"><label>주제<input data-ed="topic" value="${esc(it.topic || lecTopic(it.title))}"></label><label>형식<select data-ed="fmt">${[['hand', '핸드아웃(교안)'], ['work', '워크시트(실습지)'], ['slide', '슬라이드']].map(([k, l]) => `<option value="${k}" ${(it.fmt || 'hand') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <div class="bar2"><button type="button" class="btn sm ink" data-act="doc-gen">${ic('spark', 14)} ${D ? 'AI로 다시 만들기' : 'AI 강의자료 생성'}</button>${v ? `<button type="button" class="btn sm" data-act="doc-fromv">같은 차시 AI 영상 대본으로 만들기</button>` : ''}${D ? `<button type="button" class="btn sm" data-act="doc-view">미리 보기(새 창 · 인쇄)</button><button type="button" class="btn sm" data-act="doc-dl">HTML 내려받기</button><button type="button" class="btn sm" data-act="doc-play">슬라이드로 재생</button>` : ''}</div>`;
  if (!D) return h + '<div class="empty">주제를 확인하고 \'AI 강의자료 생성\'을 누르세요. 학습 목표 · 본문 · 실습 활동 · 확인 문제로 구성됩니다.</div>';
  return h + `<label class="fl">학습 목표(줄마다 1개)<textarea rows="3" data-dc="goals">${esc(D.goals.join('\n'))}</textarea></label>
    <div class="scns">${D.secs.map((s, k) => `<div class="scn"><div class="qh"><b>${k + 1}</b><input data-ds="${k}" data-f="h" value="${esc(s.h)}" aria-label="${k + 1}절 제목"><span class="sp"></span><button type="button" class="btn sm ghost" data-act="doc-del" data-v="${k}" aria-label="절 삭제">${ic('x', 14)}</button></div><div class="scg"><label>본문<textarea rows="3" data-ds="${k}" data-f="body">${esc(s.body)}</textarea></label><label>요점(줄마다 1개)<textarea rows="3" data-ds="${k}" data-f="pts">${esc(s.pts.join('\n'))}</textarea></label></div></div>`).join('')}</div>
    <div class="bar2"><button type="button" class="btn sm" data-act="doc-add">+ 절 추가</button></div>
    <label class="fl">실습 활동<textarea rows="2" data-dc="act">${esc(D.act)}</textarea></label><label class="fl">확인 문제(줄마다 1개)<textarea rows="3" data-dc="check">${esc(D.check.join('\n'))}</textarea></label>`;
}
document.addEventListener('input', e => { const el = e.target; if (!ED || !ED.it.doc) return;
  if (el.dataset.dc) { const k = el.dataset.dc; ED.it.doc[k] = k === 'act' ? el.value : el.value.split('\n').map(x => x.trim()).filter(Boolean); }
  if (el.dataset.ds != null) { const s = ED.it.doc.secs[+el.dataset.ds]; s[el.dataset.f] = el.dataset.f === 'pts' ? el.value.split('\n').map(x => x.trim()).filter(Boolean) : el.value; } });
ACT['doc-gen'] = () => { const it = ED.it; it.doc = AI.material(it.topic || it.title, ED.c); S.ai.usage++; edRender(); toast(`강의자료 ${it.doc.secs.length}절을 만들었습니다.`, 'ok'); };
ACT['doc-fromv'] = () => { const it = ED.it; const v = ED.c.curriculum.find(x => x.type === 'video' && x.src === 'ai' && x.week === it.week && (x.ai?.scenes || []).length); it.doc = AI.material(v.title, ED.c, v.ai.scenes); edRender(); toast('영상 대본과 같은 흐름으로 강의자료를 만들었습니다.', 'ok'); };
ACT['doc-del'] = el => { ED.it.doc.secs.splice(+el.dataset.v, 1); edRender(); };
ACT['doc-add'] = () => { ED.it.doc.secs.push({ h: '새 절', body: '', pts: [] }); edRender(); };
function materialHTML(it, cname) {
  const D = it.doc, e = esc; const fmt = it.fmt || 'hand';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(it.title)}</title><style>
body{font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#2A2B2B;max-width:820px;margin:0 auto;padding:40px 28px;line-height:1.7;word-break:keep-all}
header{border-bottom:3px solid #2A2B2B;padding-bottom:14px;margin-bottom:24px}header small{color:#6C6C6C}h1{font-size:28px;margin:6px 0 0}
h2{font-size:19px;margin:28px 0 8px;padding-left:10px;border-left:5px solid #5C74F6}.box{background:#F6F7F7;border-radius:14px;padding:14px 18px}
ul{padding-left:20px}.lines{border-bottom:1px solid #ccc;height:28px}footer{margin-top:40px;color:#6C6C6C;font-size:12px}@media print{body{padding:0}}</style></head><body>
<header><small>${e(S.org.name)} · ${e(cname || D.course || '')} · ${{ hand: '강의 교안', work: '실습 워크시트', slide: '슬라이드 자료' }[fmt]}</small><h1>${e(it.title)}</h1></header>
<section class="box"><b>학습 목표</b><ul>${D.goals.map(g => `<li>${e(g)}</li>`).join('')}</ul></section>
${D.secs.map((s, i) => `<h2>${i + 1}. ${e(s.h)}</h2>${fmt === 'slide' ? '' : `<p>${e(s.body)}</p>`}<ul>${s.pts.map(p => `<li>${e(p)}</li>`).join('')}</ul>${fmt === 'work' ? '<div class="lines"></div><div class="lines"></div>' : ''}`).join('')}
<h2>실습 활동</h2><p>${e(D.act)}</p><h2>확인 문제</h2><ol>${D.check.map(q => `<li>${e(q)}${fmt === 'work' ? '<div class="lines"></div>' : ''}</li>`).join('')}</ol>
<footer>AI 초안을 바탕으로 담당자가 검토한 자료입니다. · ${e(today())}</footer></body></html>`;
}
const docBlob = it => new Blob([materialHTML(it, ED?.c?.name)], { type: 'text/html' });
ACT['doc-view'] = () => { const u = URL.createObjectURL(docBlob(ED.it)); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000); };
ACT['doc-dl'] = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(docBlob(ED.it)); a.download = `${ED.it.title.replace(/[\\/:*?"<>|]/g, '_')}.html`; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 15000); toast('강의자료를 내려받았습니다. 브라우저에서 열어 PDF로 인쇄할 수 있습니다.', 'ok'); };
ACT['doc-play'] = () => { const D = ED.it.doc; aiPlayer(ED.it.title, [{ h: '학습 목표', pts: D.goals, say: D.goals.join('. ') }, ...D.secs.map(s => ({ h: s.h, pts: s.pts, say: s.body })), { h: '실습 활동', pts: [D.act.slice(0, 60)], say: D.act }], 'f'); };

/* 슬라이드 그리기 · 재생 · 녹화 */
function wrapLines(g, text, maxW, maxLines) { const out = []; let line = ''; for (const ch of String(text || '')) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch.trim() ? ch : ''; if (out.length === maxLines) break; } else line += ch; } if (out.length < maxLines && line) out.push(line); else if (out.length === maxLines && line) out[maxLines - 1] = out[maxLines - 1].replace(/.$/, '…'); return out; }
/* v36 영상 템플릿 · 아바타 선생님: drawSlide(g, s, i, n, title, cap, prog, opt) — opt = { tpl, avatar, mouth(0~1), blink } (없으면 예전 슬라이드 그대로) */
const VTPL = [['slide', '슬라이드 강의형', '제목 · 요점 슬라이드(기본)'], ['board', '화이트보드형', '마커로 쓴 듯한 판서'], ['news', '뉴스 앵커형', '앵커와 하단 자막 띠'], ['card', '카드뉴스형', '큰 번호 카드 한 장씩'], ['chalk', '칠판형', '초록 칠판에 분필 글씨']];
const VAV = [['none', '넣지 않음'], ['f', '여자 선생님'], ['m', '남자 선생님'], ['robot', '로봇 쌤'], ['bear', '곰돌이 쌤']];
function drawAvatar(g, x, y, w, h, k, mouth, blink) {
  if (!k || k === 'none') return; const cx = x + w / 2; const r = Math.min(w * 0.36, h * 0.27); const hy = y + h * 0.36; mouth = clamp(+mouth || 0, 0, 1);
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  const body = { f: '#5C74F6', m: '#2A2B2B', robot: '#8A94A6', bear: '#EF6D00' }[k] || '#5C74F6';
  g.fillStyle = body; g.beginPath(); g.moveTo(cx - w * 0.46, y + h); g.quadraticCurveTo(cx - w * 0.46, hy + r * 1.05, cx, hy + r * 1.05); g.quadraticCurveTo(cx + w * 0.46, hy + r * 1.05, cx + w * 0.46, y + h); g.closePath(); g.fill();
  if (k === 'm') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - r * .38, hy + r * 1.05); g.lineTo(cx, hy + r * 1.6); g.lineTo(cx + r * .38, hy + r * 1.05); g.fill(); g.fillStyle = '#DE0027'; g.beginPath(); g.moveTo(cx - r * .1, hy + r * 1.12); g.lineTo(cx + r * .1, hy + r * 1.12); g.lineTo(cx + r * .14, hy + r * 1.75); g.lineTo(cx, hy + r * 1.9); g.lineTo(cx - r * .14, hy + r * 1.75); g.fill(); }
  if (k === 'f') { g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, hy + r * 1.05, r * .32, 0, Math.PI); g.fill(); }
  const skin = k === 'robot' ? '#D7DCE4' : k === 'bear' ? '#B7743A' : '#F6D2B5';
  if (k === 'f') { g.fillStyle = '#4A2E1F'; g.beginPath(); g.ellipse(cx, hy + r * .25, r * 1.12, r * 1.25, 0, 0, Math.PI * 2); g.fill(); }
  if (k === 'bear') { g.fillStyle = '#8A5226'; [-1, 1].forEach(d => { g.beginPath(); g.arc(cx + d * r * .78, hy - r * .78, r * .36, 0, 7); g.fill(); }); g.fillStyle = '#E3A66B'; [-1, 1].forEach(d => { g.beginPath(); g.arc(cx + d * r * .78, hy - r * .78, r * .18, 0, 7); g.fill(); }); }
  if (k === 'robot') { g.strokeStyle = '#8A94A6'; g.lineWidth = r * .08; g.beginPath(); g.moveTo(cx, hy - r); g.lineTo(cx, hy - r * 1.35); g.stroke(); g.fillStyle = '#5C74F6'; g.beginPath(); g.arc(cx, hy - r * 1.4, r * .12, 0, 7); g.fill();
    g.fillStyle = skin; const q = r * .95; g.beginPath(); g.roundRect ? g.roundRect(cx - q, hy - q, q * 2, q * 1.95, r * .3) : g.rect(cx - q, hy - q, q * 2, q * 1.95); g.fill(); }
  else { g.fillStyle = skin; g.beginPath(); g.arc(cx, hy, r, 0, Math.PI * 2); g.fill(); }
  if (k === 'f') { g.fillStyle = '#4A2E1F'; g.beginPath(); g.ellipse(cx - r * .2, hy - r * .62, r * .9, r * .45, -0.3, 0, Math.PI * 2); g.fill(); }
  if (k === 'm') { g.fillStyle = '#1F2020'; g.beginPath(); g.ellipse(cx, hy - r * .62, r * 1.02, r * .52, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(cx - r * 1.0, hy - r * .66, r * 2.0, r * .22); }
  if (k === 'bear') { g.fillStyle = '#E3A66B'; g.beginPath(); g.ellipse(cx, hy + r * .38, r * .48, r * .36, 0, 0, 7); g.fill(); g.fillStyle = '#3B2414'; g.beginPath(); g.ellipse(cx, hy + r * .2, r * .14, r * .1, 0, 0, 7); g.fill(); }
  const ey = hy - r * .05, ex = r * .38; const eyeC = k === 'robot' ? '#00C2FF' : '#2A2B2B';
  [-1, 1].forEach(d => { g.fillStyle = eyeC; g.beginPath(); if (blink) g.fillRect(cx + d * ex - r * .12, ey, r * .24, r * .04); else if (k === 'robot') g.fillRect(cx + d * ex - r * .13, ey - r * .1, r * .26, r * .2); else { g.arc(cx + d * ex, ey, r * .09, 0, 7); g.fill(); } if (!blink && k !== 'robot') { g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + d * ex + r * .03, ey - r * .03, r * .03, 0, 7); g.fill(); } });
  if (k === 'f') { g.strokeStyle = '#2A2B2B'; g.lineWidth = r * .04; [-1, 1].forEach(d => { g.beginPath(); g.arc(cx + d * ex, ey, r * .2, 0, 7); g.stroke(); }); g.beginPath(); g.moveTo(cx - ex + r * .2, ey); g.lineTo(cx + ex - r * .2, ey); g.stroke(); }
  if (k !== 'robot') { g.fillStyle = 'rgba(239,109,0,.18)'; [-1, 1].forEach(d => { g.beginPath(); g.ellipse(cx + d * r * .55, hy + r * .3, r * .16, r * .09, 0, 0, 7); g.fill(); }); }
  const my = k === 'bear' ? hy + r * .55 : hy + r * .45; const mw = r * (k === 'robot' ? .5 : .34); const mh = r * (0.04 + 0.3 * mouth);
  if (k === 'robot') { g.fillStyle = '#2A2B2B'; g.fillRect(cx - mw, my - mh / 2 - r * .04, mw * 2, mh + r * .08); g.fillStyle = '#00C2FF'; for (let b = 0; b < 5; b++) { const bh = (mh + r * .04) * (0.4 + 0.6 * Math.abs(Math.sin(b * 1.7 + mouth * 6))); g.fillRect(cx - mw + b * mw * .4 + mw * .06, my - bh / 2, mw * .28, bh); } }
  else { g.fillStyle = mouth > .08 ? '#8B2E2E' : '#B5534A'; g.beginPath(); g.ellipse(cx, my, mw, Math.max(r * .035, mh), 0, 0, Math.PI * 2); g.fill(); if (mouth > .3) { g.fillStyle = '#fff'; g.fillRect(cx - mw * .55, my - mh + r * .01, mw * 1.1, r * .05); } }
  g.restore();
}
function drawSlide(g, s, i, n, title, cap, prog, opt) {
  opt = opt || {}; const tpl = opt.tpl || 'slide'; const av = opt.avatar && opt.avatar !== 'none' ? opt.avatar : '';
  const W = 1280, H = 720, F = 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'; const pts = (s.pts || []).slice(0, 5); g.save(); g.textAlign = 'left'; g.textBaseline = 'middle';
  const AW = av ? 300 : 0; /* 아바타 자리 */
  if (tpl === 'board') {
    g.fillStyle = '#FDFDFB'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(92,116,246,.08)'; g.lineWidth = 1; for (let x = 40; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 40; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = '#6C6C6C'; g.font = `500 22px ${F}`; g.fillText(`${S.org.name} · ${wrapLines(g, title, 700, 1)[0] || ''}`, 56, 46); g.textAlign = 'right'; g.fillText(`${i + 1} / ${n}`, W - 56, 46); g.textAlign = 'left';
    g.fillStyle = '#DC2626'; g.font = `800 54px ${F}`; const hl = wrapLines(g, s.h, W - 160 - AW, 1)[0] || ''; g.fillText(hl, 72, 130); const hw = Math.min(W - 160 - AW, g.measureText(hl).width);
    g.strokeStyle = '#DC2626'; g.lineWidth = 6; g.beginPath(); for (let x = 0; x <= hw; x += 12) g[x ? 'lineTo' : 'moveTo'](72 + x, 172 + Math.sin(x / 18) * 4); g.stroke();
    let y = 250; g.font = `600 34px ${F}`; pts.forEach(p => { g.strokeStyle = '#1E3A8A'; g.lineWidth = 4; g.strokeRect(78, y - 16, 30, 30); g.beginPath(); g.moveTo(84, y); g.lineTo(92, y + 9); g.lineTo(106, y - 12); g.stroke(); g.fillStyle = '#1E3A8A'; wrapLines(g, p, W - 220 - AW, 2).forEach((l, j) => g.fillText(l, 128, y + j * 44)); y += 82; });
  } else if (tpl === 'news') {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0B1F44'); gr.addColorStop(1, '#173A73'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.06)'; for (let k = 0; k < 6; k++) g.fillRect(0, 100 + k * 90, W, 2);
    g.fillStyle = '#fff'; g.font = `700 22px ${F}`; g.fillText(S.org.name, 48, 44); g.fillStyle = '#DE0027'; g.fillRect(W - 170, 26, 122, 36); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('강의 LIVE', W - 109, 44); g.textAlign = 'left';
    const px = av ? 420 : 64, pw = W - px - 64; g.fillStyle = 'rgba(255,255,255,.96)'; g.fillRect(px, 96, pw, 380); g.fillStyle = '#0B1F44'; g.fillRect(px, 96, 10, 380);
    g.fillStyle = '#0B1F44'; g.font = `800 40px ${F}`; g.fillText(wrapLines(g, s.h, pw - 60, 1)[0] || '', px + 36, 146); let y = 214; g.font = `500 28px ${F}`; pts.forEach(p => { g.fillStyle = '#DE0027'; g.fillRect(px + 38, y - 5, 12, 12); g.fillStyle = '#1F2937'; wrapLines(g, p, pw - 110, 1).forEach(l => g.fillText(l, px + 66, y)); y += 54; });
    g.fillStyle = '#DE0027'; g.fillRect(0, 498, 210, 64); g.fillStyle = '#fff'; g.font = `800 28px ${F}`; g.fillText(`${i + 1} / ${n}`, 28, 530); g.fillStyle = 'rgba(255,255,255,.97)'; g.fillRect(210, 498, W - 210, 64); g.fillStyle = '#0B1F44'; g.font = `800 30px ${F}`; g.fillText(wrapLines(g, title, W - 280, 1)[0] || '', 236, 530);
  } else if (tpl === 'card') {
    const PAL = ['#FFE8EA', '#E3F3FC', '#E7F8E8', '#FFF3E0', '#F3E8FF', '#EAEDFF']; const AC = ['#DE0027', '#006ABF', '#009116', '#EF6D00', '#7A3BD0', '#3B48B5']; const ac = AC[i % AC.length];
    g.fillStyle = PAL[i % PAL.length]; g.fillRect(0, 0, W, H); const cx0 = 80, cw = W - 160 - AW; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.12)'; g.shadowBlur = 30; g.beginPath(); g.roundRect ? g.roundRect(cx0, 56, cw, 560, 28) : g.rect(cx0, 56, cw, 560); g.fill(); g.shadowBlur = 0;
    g.fillStyle = ac; g.font = `900 92px ${F}`; g.fillText(String(i + 1).padStart(2, '0'), cx0 + 48, 140); g.fillStyle = '#2A2B2B'; g.font = `800 46px ${F}`; wrapLines(g, s.h, cw - 96, 2).forEach((l, j) => g.fillText(l, cx0 + 48, 236 + j * 56));
    let y = 360; g.font = `500 30px ${F}`; pts.slice(0, 4).forEach((p, k) => { g.fillStyle = ac; g.beginPath(); g.arc(cx0 + 66, y, 18, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `800 20px ${F}`; g.textAlign = 'center'; g.fillText(String(k + 1), cx0 + 66, y + 1); g.textAlign = 'left'; g.font = `500 30px ${F}`; g.fillStyle = '#2A2B2B'; g.fillText(wrapLines(g, p, cw - 150, 1)[0] || '', cx0 + 100, y); y += 58; });
    for (let k = 0; k < n; k++) { g.fillStyle = k === i ? ac : 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(W / 2 - (n - 1) * 12 + k * 24 - AW / 2, 660, k === i ? 7 : 5, 0, 7); g.fill(); }
    g.fillStyle = '#6C6C6C'; g.font = `600 20px ${F}`; g.textAlign = 'right'; g.fillText(S.org.name, cx0 + cw - 32, 90); g.textAlign = 'left';
  } else if (tpl === 'chalk') {
    g.fillStyle = '#7A4A22'; g.fillRect(0, 0, W, H); g.fillStyle = '#24452F'; g.fillRect(24, 24, W - 48, H - 48); g.fillStyle = 'rgba(255,255,255,.04)'; for (let k = 0; k < 40; k++) g.fillRect((k * 97) % W, (k * 53) % H, 160, 3);
    g.fillStyle = 'rgba(255,255,255,.72)'; g.font = `500 22px ${F}`; g.fillText(`${S.org.name} · ${i + 1} / ${n}`, 64, 66);
    g.fillStyle = '#FDE68A'; g.font = `800 52px ${F}`; g.fillText(wrapLines(g, s.h, W - 180 - AW, 1)[0] || '', 64, 140); g.strokeStyle = 'rgba(253,230,138,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 178); g.lineTo(Math.min(W - 120 - AW, 64 + g.measureText(s.h || '').width), 176); g.stroke();
    let y = 252; g.font = `500 34px ${F}`; pts.forEach(p => { g.fillStyle = '#fff'; g.fillText('·', 72, y); g.fillStyle = 'rgba(255,255,255,.94)'; wrapLines(g, p, W - 220 - AW, 2).forEach((l, j) => g.fillText(l, 104, y + j * 44)); y += 78; });
  } else {
    g.fillStyle = '#F6F7F7'; g.fillRect(0, 0, W, H); g.fillStyle = '#2A2B2B'; g.fillRect(0, 0, W, 76);
    g.fillStyle = '#fff'; g.font = `600 24px ${F}`; g.fillText(S.org.name, 48, 38); g.textAlign = 'right'; g.fillText(`${i + 1} / ${n}`, W - 48, 38); g.textAlign = 'left';
    g.fillStyle = '#6C6C6C'; g.font = `500 24px ${F}`; g.fillText(wrapLines(g, title, W - 160 - AW, 1)[0] || '', 80, 128);
    g.fillStyle = '#5C74F6'; g.fillRect(48, 160, 8, 62); g.fillStyle = '#2A2B2B'; g.font = `800 52px ${F}`; g.fillText(wrapLines(g, s.h, W - 160 - AW, 1)[0] || '', 80, 192);
    let y = 290; g.font = `500 34px ${F}`; pts.forEach(p => { g.fillStyle = '#5C74F6'; g.beginPath(); g.arc(92, y, 7, 0, 7); g.fill(); g.fillStyle = '#2A2B2B'; wrapLines(g, p, W - 220 - AW, 2).forEach((l, j) => g.fillText(l, 116, y + j * 44)); y += 74; });
  }
  if (av) { const bx = tpl === 'news' ? 40 : W - AW - 10, by = tpl === 'news' ? 110 : 250, bw = tpl === 'news' ? 340 : AW, bh = tpl === 'news' ? 388 : H - 250 - (cap ? 128 : 6); if (tpl !== 'news') { g.fillStyle = tpl === 'chalk' ? 'rgba(255,255,255,.06)' : 'rgba(92,116,246,.08)'; g.beginPath(); g.arc(bx + bw / 2, by + bh * .4, bw * .42, 0, 7); g.fill(); } drawAvatar(g, bx, by, bw, bh, av, opt.mouth, opt.blink); }
  if (cap) { g.fillStyle = 'rgba(31,32,32,.86)'; g.fillRect(0, H - 128, W, 128); g.fillStyle = '#fff'; g.font = `500 28px ${F}`; wrapLines(g, cap, W - 120, 2).forEach((l, j) => g.fillText(l, 60, H - 86 + j * 40)); }
  g.fillStyle = '#EAEBEB'; g.fillRect(0, H - 6, W, 6); g.fillStyle = tpl === 'news' ? '#DE0027' : '#5C74F6'; g.fillRect(0, H - 6, W * clamp(prog || 0, 0, 1), 6); g.restore();
}
/* 목소리: 브라우저에 있는 목소리 목록(speechSynthesis) — 언어 · 성별(이름으로 추정) · 이름으로 고른다 */
const VF = /female|여성|여자|Yuna|SunHi|Heami|Sora|Seoyeon|Jimin|Samantha|Victoria|Karen|Kyoko|Ting|Mei|Linh|Kanya|Damayanti|Monica|Amelie|Zira|Aria|Jenny|Nanami|Xiaoxiao|HoaiMy|Premwadee|Gadis|Elvira|Denise/i;
const VM = /\bmale\b|남성|남자|InJoon|Minsu|Hyunsu|Daniel|Alex|Fred|David|Mark|Guy|Otoya|Keita|Kangkang|Yunxi|NamMinh|Niwat|Ardi|Alvaro|Henri|Thomas|Jorge/i;
const vGender = v => VM.test(v.name) && !/female/i.test(v.name) ? 'm' : VF.test(v.name) ? 'f' : '';
function vidVoices(lang) { try { const L = (LANG_TTS[lang] || lang || 'ko-KR').slice(0, 2).toLowerCase(); return (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(L)).map(v => ({ name: v.name, lang: v.lang, g: vGender(v), local: v.localService })); } catch (e) { return []; } }
function vidVoice(lang, gender, name) { try { const L = (LANG_TTS[lang] || lang || 'ko-KR').slice(0, 2).toLowerCase(); const vs = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(L)); return (name && vs.find(v => v.name === name)) || vs.find(v => vGender(v) === (gender === 'm' ? 'm' : 'f')) || vs[0] || null; } catch (e) { return null; } }
function vidSpeak(text, o) { o = o || {}; const syn = window.speechSynthesis; if (!syn || !text) return null; const u = new SpeechSynthesisUtterance(text); u.lang = LANG_TTS[o.lang] || 'ko-KR'; u.rate = clamp(+o.rate || 1, 0.5, 2); const v = vidVoice(o.lang || 'ko', o.voice, o.vname); if (v) u.voice = v; return u; }
const sentences = s => String(s || '').split(/(?<=[.!?。])\s+/).filter(Boolean);
function overlay(title, body) { const w = document.createElement('div'); w.className = 'mwrap top2'; w.innerHTML = `<div class="modal wide" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><b>${esc(title)}</b><button class="x" data-x="1" aria-label="닫기">${ic('x', 18)}</button></div><div class="mb">${body}</div></div>`; document.body.appendChild(w); return w; }
const sentIndex = (scenes, i, k) => scenes.slice(0, i).reduce((a, s) => a + Math.max(1, sentences(s.say).length), 0) + k;
function aiPlayer(title, scenes, voice, tracks, opt) {
  if (!scenes?.length) return; tracks = tracks || {}; opt = opt || {}; const TL = Object.keys(tracks).filter(l => (tracks[l] || []).length);
  const capS = opt.capScenes || scenes, sayS = opt.sayScenes || scenes; /* 번역: 자막 · 화면 글은 capScenes, 읽는 말은 sayScenes */
  const w = overlay(`재생 — ${title}`, `<canvas class="aicv" width="1280" height="720" aria-label="AI 강의 슬라이드"></canvas><div class="bar2 pctl"><button class="btn sm" data-p="prev">이전</button><button class="btn sm ink" data-p="play">일시정지</button><button class="btn sm" data-p="next">다음</button><label class="ckl"><input type="checkbox" data-p="mute" ${'speechSynthesis' in window ? '' : 'checked disabled'}> 소리 끔</label>${TL.length ? `<select data-p="lang" aria-label="자막 언어"><option value="">자막: 원문</option>${TL.map(l => `<option value="${l}">자막: ${esc(langName(l))}</option>`).join('')}</select>` : ''}<span class="mini" data-p="st"></span></div><p class="mini">미리보기 품질 — 브라우저 목소리로 읽어 줍니다.</p>`);
  const capLang = () => w.querySelector('[data-p=lang]')?.value || '';
  const g = w.querySelector('canvas').getContext('2d'); let i = 0, k = 0, on = true, tm = null, alive = true, talk = 0, anim = 0, cur = ''; const syn = window.speechSynthesis;
  const muted = () => w.querySelector('[data-p=mute]').checked;
  const paint = () => { const ss = sentences(capS[i].say); drawSlide(g, capS[i], i, scenes.length, title, cur, (i + (k + 1) / Math.max(1, ss.length)) / scenes.length, { tpl: opt.tpl, avatar: opt.avatar, mouth: talk ? 0.15 + 0.85 * Math.abs(Math.sin(performance.now() / 95)) * (0.6 + 0.4 * Math.random()) : 0, blink: performance.now() % 3200 < 140 }); };
  const talking = v => { talk = v; clearInterval(anim); if (v && opt.avatar && opt.avatar !== 'none') anim = setInterval(() => alive ? paint() : clearInterval(anim), 90); paint(); };
  const stop = () => { clearTimeout(tm); talking(0); try { syn && syn.cancel(); } catch (e) { } };
  let tok = 0; const step = () => { if (!alive) return; stop(); const my = ++tok; const ss = sentences(capS[i].say); const say = sentences(sayS[i].say); const cl = capLang(); cur = (cl && tracks[cl]?.[sentIndex(scenes, i, k)]?.t) || ss[k] || ''; paint(); w.querySelector('[data-p=st]').textContent = `${i + 1} / ${scenes.length} 장면`;
    if (!on) return; const nx = () => { talking(0); if (++k >= ss.length) { k = 0; i++; } if (i >= scenes.length) { on = false; i = scenes.length - 1; w.querySelector('[data-p=play]').textContent = '처음부터'; return; } step(); };
    const line = cl ? cur : (say[k] || cur);
    if (syn && !muted() && line) { const u = opt.vlang || opt.vname || opt.rate ? vidSpeak(line, { lang: cl || opt.vlang || 'ko', voice, vname: cl ? '' : opt.vname, rate: opt.rate || 1.05 }) : null; const uu = u || new SpeechSynthesisUtterance(line); if (!u) { uu.lang = (LANG_TTS[cl] || 'ko-KR'); uu.rate = 1.05; const vs = syn.getVoices().filter(v => v.lang.toLowerCase().startsWith((LANG_TTS[cl] || 'ko-KR').slice(0, 2).toLowerCase())); const pv = vs.find(v => voice === 'm' ? /male|남|Minsu|InJoon/i.test(v.name) && !/female/i.test(v.name) : /female|여|Yuna|SunHi|Heami/i.test(v.name)) || vs[0]; if (pv) uu.voice = pv; }
      let fired = false; const once = () => { if (fired || !alive || !on || my !== tok) return; fired = true; nx(); }; uu.onstart = () => { if (my === tok) talking(1); }; uu.onend = once; uu.onerror = once; syn.speak(uu); talking(1); tm = setTimeout(() => { try { syn.cancel(); } catch (e) { } once(); }, secsFor(line) * 1000 / (opt.rate || 1) + 6000); }
    else { talking(1); tm = setTimeout(nx, Math.max(1.6, secsFor(cur)) * 1000); } };
  w.addEventListener('click', e => { const p = e.target.closest('[data-p]')?.dataset.p; if (e.target.closest('[data-x]') || e.target === w) { alive = false; stop(); clearInterval(anim); w.remove(); return; }
    if (p === 'prev') { i = Math.max(0, i - 1); k = 0; step(); } if (p === 'next') { i = Math.min(scenes.length - 1, i + 1); k = 0; step(); }
    if (p === 'play') { if (!on && i === scenes.length - 1) { i = 0; k = 0; } on = !on; e.target.textContent = on ? '일시정지' : '재생'; step(); } });
  w.querySelector('[data-p=mute]').addEventListener('change', step); w.querySelector('[data-p=lang]')?.addEventListener('change', step); step();
}
function aiRecord(title, scenes, track, opt) {
  opt = opt || {};
  const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720;
  if (!cv.captureStream || !window.MediaRecorder) { toast('이 브라우저는 영상 파일 만들기를 지원하지 않습니다. Chrome · Edge에서 시도하세요.', 'warn'); return; }
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const plan = (opt.capScenes || scenes).flatMap((s, i) => { const ss = sentences(s.say); return (ss.length ? ss : ['']).map((c, k) => ({ i, c: (track && track[sentIndex(scenes, i, k)]?.t) || c, d: secsFor(c), f: (i + (k + 1) / Math.max(1, ss.length)) / scenes.length })); });
  const total = plan.reduce((a, p) => a + p.d, 0);
  const w = overlay(`영상 파일 만들기 — ${title}`, `<p class="mini">장면을 실제 재생 시간대로 그리며 녹화합니다(약 ${Math.ceil(total / 60)}분). 창을 닫으면 취소됩니다.</p>${bar(0)}<p class="mini" data-r="st">준비 중…</p><div data-r="out"></div>`);
  const g = cv.getContext('2d'); const rec = new MediaRecorder(cv.captureStream(30), mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : undefined); const chunks = []; let cancel = false, el = 0, j = 0, tick;
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => { clearInterval(tick); if (cancel) return; const blob = new Blob(chunks, { type: 'video/webm' }); const u = URL.createObjectURL(blob); const name = `${title.replace(/[\\/:*?"<>|]/g, '_')}.webm`;
    w.querySelector('[data-r=st]').textContent = `완료 — ${(blob.size / 1048576).toFixed(1)}MB`; w.querySelector('[data-r=out]').innerHTML = `<video class="aicv" controls src="${u}"></video><div class="bar2"><a class="btn ink" href="${u}" download="${esc(name)}">영상 내려받기</a><span class="mini">내려받은 파일을 라이브러리 › 업로드로 올리면 학습자 플레이어에서 재생됩니다.</span></div>`; window.__lastRec = blob.size; };
  w.addEventListener('click', e => { if (e.target.closest('[data-x]') || e.target === w) { cancel = true; try { rec.state !== 'inactive' && rec.stop(); } catch (x) { } w.remove(); } });
  rec.start(500); let t0 = performance.now(), segStart = t0;
  tick = setInterval(() => { if (cancel) return clearInterval(tick); const now = performance.now(); const p = plan[j];
    if ((now - segStart) / 1000 >= p.d) { j++; segStart = now; if (j >= plan.length) { clearInterval(tick); rec.stop(); return; } }
    const q = plan[j]; const capS = opt.capScenes || scenes; drawSlide(g, capS[q.i] || scenes[q.i], q.i, scenes.length, title, q.c, q.f, { tpl: opt.tpl, avatar: opt.avatar, mouth: 0.15 + 0.85 * Math.abs(Math.sin(now / 95)), blink: now % 3200 < 140 }); el = (now - t0) / 1000;
    const b = w.querySelector('.bar i'); if (b) b.style.width = Math.min(100, el / total * 100) + '%'; w.querySelector('[data-r=st]').textContent = `녹화 중 ${q.i + 1}/${scenes.length} 장면 · ${Math.round(el)}초 / ${Math.round(total)}초`; }, 100);
}

/* ═════════ ② 진단 결과 → 러닝 저니 ═════════ */
const PJK = { EYE: ['리터러시', '기초', '교양', '탐색', '입문'], PEN: ['프롬프트', '글쓰기', '보고서', '작성', '문서'], LENS: ['데이터', '분석', '통계'], STORY: ['디자인', '영상', '콘텐츠', '표현', '발표'], MAP: ['기획', '프로젝트', '캡스톤', '챌린지', '창업'], 관찰형: ['기초', '리터러시', '탐색'], 분석형: ['데이터', '분석'], 표현형: ['디자인', '콘텐츠', '영상', '발표'] };
const isProj = c => /(프로젝트|캡스톤|챌린지|실전|창업|취업|특강|심화)/.test(c.name);
AI.path = (d, o) => {
  const L = S.classes.filter(c => c.status !== '종료'); const kws = PJK[o.k] || String(o.l || o.k).split(/[\s·,~]+/).filter(x => x.length > 1);
  const sc = c => kws.reduce((a, k) => a + (c.name.includes(k) ? 3 : 0) + (String(c.goal || '').includes(k) ? 1 : 0), 0); const lv = c => +c.level || 0;
  const used = new Set(); const take = arr => { const c = arr.find(x => !used.has(x.id)); if (c) used.add(c.id); return c; };
  const lvIdx = d.mode === 'level' ? clamp(d.outs.indexOf(o), 0, 2) : 0; const Ln = t('learner');
  const plan = [
    lvIdx === 0 && ['기초 다지기', `${Ln} 공통 기초 개념과 도구 사용법을 익힌다`, () => take([...L].filter(c => !isProj(c)).sort((a, b) => lv(a) - lv(b) || sc(b) - sc(a))), `${o.k} 기초`],
    [`${o.k} 맞춤 심화`, d.mode === 'type' ? `${o.k}(${o.l || ''}) 성향에 맞는 방식으로 핵심 역량을 키운다` : `${o.k} 수준에서 한 단계 높은 역량을 쌓는다`, () => take([...L].filter(c => !isProj(c)).sort((a, b) => sc(b) - sc(a) || (lv(b) - lv(a)) * (lvIdx ? 1 : -1))), `${o.k} 심화`],
    ['실전 프로젝트', '실제 문제를 해결하는 결과물을 만든다', () => take([...L].filter(isProj).sort((a, b) => sc(b) - sc(a))) || take([...L].sort((a, b) => lv(b) - lv(a))), `${o.k} 실전 프로젝트`],
    lvIdx === 2 && ['성과 공유 · 인증', '결과물을 공유하고 배지 · 인증을 받는다', () => take([...L].filter(isProj)), `${o.k} 성과 공유`]
  ].filter(Boolean);
  return plan.map(([name, goal, f, need], i, A) => { const c = f(); return { id: uid('ps'), name, goal, cls: c ? [c.id] : [], need: c ? '' : need, unlock: i ? `${A[i - 1][0]} ${t('done')}` : '진단 직후 바로 열림', badge: S.badges[i]?.id || '' }; });
};
function dgEnsurePaths(d) { (d.outs || []).forEach(o => { if (!o.path) { o.path = AI.path(d, o); o.mode = o.mode || 'path'; } if (o.mode !== 'one') o.rec = o.path.find(s => s.cls.length)?.cls[0] || o.rec; }); return d; }
function pathFlow(o, mini) {
  if (!o) return ''; if (o.mode === 'one') return `<div class="pjflow"><span class="pjst"><em>단일 ${esc(t('cls'))}</em><b>${esc(C(o.rec)?.name || '미지정')}</b></span></div>`;
  return `<div class="pjflow ${mini ? 'mini' : ''}">${(o.path || []).map((s, i) => `<span class="pjst"><em>STEP ${i + 1}</em><b>${esc(s.name)}</b><small>${esc(s.cls.map(id => C(id)?.name).filter(Boolean).join(' · ') || '과정 미정')}</small></span>`).join(`<i class="pja">${ic('arrow', 14)}</i>`)}</div>`;
}
function dgOutsHTML(d) {
  return `<div class="bar2"><button type="button" class="btn sm ink" data-act="dgp-all">${ic('spark', 14)} 모든 결과 AI 러닝 저니 다시 설계</button><span class="mini">단계마다 ${esc(tj('cls', '을'))} 넣거나 빼고, 없는 과정은 AI로 바로 만들 수 있습니다.</span></div>` +
    d.outs.map((o, k) => `<div class="card pjc"><div class="ch"><b>${esc(o.k)}</b><small>${esc(o.l || '')}</small><span class="sp"></span><div class="seg2"><button type="button" class="${o.mode === 'one' ? 'on' : ''}" data-act="dgp-mode" data-k="${k}" data-v="one">단일 ${esc(t('cls'))}</button><button type="button" class="${o.mode !== 'one' ? 'on' : ''}" data-act="dgp-mode" data-k="${k}" data-v="path">러닝 저니</button></div></div>
      ${o.mode === 'one' ? `<label class="fl">추천 ${esc(t('cls'))}<select data-dgo="${k}">${S.classes.map(c => `<option value="${c.id}" ${o.rec === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` :
      `<div class="pjsteps">${o.path.map((s, j) => `<div class="pjs"><div class="qh"><span class="jn">STEP ${j + 1}</span><input data-chg="dgp-name" data-k="${k}" data-s="${j}" value="${esc(s.name)}" maxlength="24" aria-label="단계 이름"><span class="sp"></span><button type="button" class="btn sm ghost" data-act="dgp-del" data-k="${k}" data-s="${j}" aria-label="단계 삭제">${ic('x', 14)}</button></div><small class="mini">${esc(s.goal)} · 열림: ${esc(s.unlock)}</small>
        <div class="chips2">${s.cls.map(id => `<span class="chip2">${esc(C(id)?.name || '')}<button type="button" data-act="dgp-rm" data-k="${k}" data-s="${j}" data-c="${id}" aria-label="빼기">${ic('x', 12)}</button></span>`).join('')}<select data-chg="dgp-add" data-k="${k}" data-s="${j}" aria-label="과정 추가"><option value="">+ ${esc(t('cls'))}</option>${S.classes.filter(c => !s.cls.includes(c.id)).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>${s.need && !s.cls.length ? `<button type="button" class="btn sm ink" data-act="dgp-mk" data-k="${k}" data-s="${j}">${ic('spark', 12)} 「${esc(s.need)}」 AI로 만들기</button>` : ''}</div></div>`).join(`<i class="pja">${ic('arrow', 14)}</i>`)}</div>
      <div class="bar2"><button type="button" class="btn sm" data-act="dgp-add-step" data-k="${k}">+ 단계</button><button type="button" class="btn sm" data-act="dgp-ai" data-k="${k}">${ic('spark', 12)} 이 결과 AI 재설계</button></div>`}</div>`).join('');
}
const dgRe = () => { setTimeout(dgRender); };
const PS = el => DG.outs[+el.dataset.k].path[+el.dataset.s];
ACT['dgp-all'] = () => { DG.outs.forEach(o => { o.path = AI.path(DG, o); o.mode = 'path'; }); dgEnsurePaths(DG); S.ai.usage++; dgRe(); toast('결과별 러닝 저니를 설계했습니다.', 'ok'); };
ACT['dgp-ai'] = el => { const o = DG.outs[+el.dataset.k]; o.path = AI.path(DG, o); dgEnsurePaths(DG); dgRe(); };
ACT['dgp-mode'] = el => { const o = DG.outs[+el.dataset.k]; o.mode = el.dataset.v; if (o.mode === 'path' && !o.path) o.path = AI.path(DG, o); dgEnsurePaths(DG); dgRe(); };
ACT['dgp-name'] = el => { PS(el).name = el.value.trim() || PS(el).name; };
ACT['dgp-add'] = el => { if (!el.value) return; PS(el).cls.push(el.value); PS(el).need = ''; dgEnsurePaths(DG); dgRe(); };
ACT['dgp-rm'] = el => { const s = PS(el); s.cls = s.cls.filter(x => x !== el.dataset.c); dgRe(); };
ACT['dgp-del'] = el => { const o = DG.outs[+el.dataset.k]; o.path.splice(+el.dataset.s, 1); o.path.forEach((s, i) => s.unlock = i ? `${o.path[i - 1].name} ${t('done')}` : '진단 직후 바로 열림'); dgRe(); };
ACT['dgp-add-step'] = el => { const o = DG.outs[+el.dataset.k]; const p = o.path.at(-1); o.path.push({ id: uid('ps'), name: '새 단계', goal: '단계 목표를 적어 주세요', cls: [], need: `${o.k} 추가 과정`, unlock: p ? `${p.name} ${t('done')}` : '진단 직후 바로 열림', badge: '' }); dgRe(); };
ACT['dgp-mk'] = el => { const s = PS(el); const c = makeCourse({ topic: s.need, weeks: S.org.type === 'univ' ? 8 : 6, docs: true }); s.cls.push(c.id); s.need = ''; dgEnsurePaths(DG); dgRe(); toast(`「${c.name}」 과정을 AI로 만들어 이 단계에 넣었습니다.`, 'ok'); };
function personalPath(d, o, id) {
  const done = cid => { const c = C(cid); if (!c) return false; return typeof clsDone === 'function' ? clsDone(c, id) : !!(c.prog && c.prog[id] && c.prog[id].p >= ((c.criteria || {}).threshold || 70)); }; /* v36: 이수 판정은 mods.js clsDone 한 곳 */
  return (o.path || []).filter(s => !s.cls.length || !s.cls.every(done));
}
function learnerPathCell(d, id, r) {
  const m = M(id); const o = d.outs.find(x => x.k === r.out); if (!o) return '—';
  if (m?.path?.dg === d.id) { const s = m.path.steps[m.path.cur]; return `${tag(`STEP ${m.path.cur + 1}/${m.path.steps.length}`, 'g')} <small>${esc(s?.name || '')}</small>`; }
  if (o.mode === 'one') return esc(C(o.rec)?.name || '—');
  const P = personalPath(d, o, id); const skip = (o.path || []).length - P.length;
  return `<small>${esc(P.map(s => s.name).join(' → ') || '모두 이수')}</small>${skip ? ' ' + tag(`이수 ${skip}단계 건너뜀`) : ''}`;
}
ACT['dg-assign'] = el => {
  const d = dgEnsurePaths(S.diags.find(x => x.id === el.dataset.v)); let n = 0, e = 0;
  const enroll = (c, id) => { if (c && !c.learners.includes(id)) { c.learners.push(id); c.prog[id] = { p: 0, exam: null, assign: 'none', att: 100, subAt: today() }; e++; } };
  Object.entries(d.res || {}).forEach(([id, r]) => { const o = d.outs.find(x => x.k === r.out); const m = M(id); if (!o || !m) return;
    if (o.mode === 'one') { enroll(C(o.rec), id); n++; return; }
    const P = personalPath(d, o, id); if (!P.length) return; m.path = { dg: d.id, out: o.k, steps: P.map(s => ({ name: s.name, cls: s.cls.slice(), unlock: s.unlock })), cur: 0, at: today() };
    P[0].cls.forEach(cid => enroll(C(cid), id)); n++; });
  S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: `${d.name} 응시자`, title: '나에게 맞춘 러닝 저니가 열렸습니다', ch: '알림함', n });
  logAudit(`진단 결과 러닝 저니 배정 — ${d.name} ${n}명`); save(); render(); toast(`${n}명에게 맞춤 러닝 저니를 배정하고 1단계 ${t('cls')} ${e}건을 열었습니다.`, 'ok');
};
/* 러닝 저니 탭: 진단 결과별 맞춤 저니 현황 추가 */
{ const base = VIEWS.journey; VIEWS.journey = () => { const D = (S.diags || []).filter(d => d.status !== '초안'); D.forEach(dgEnsurePaths);
  return base() + `<div class="card"><div class="ch"><b>진단 결과별 맞춤 러닝 저니</b><small>진단 결과에 따라 단계 · 과정을 다르게 추천합니다</small><span class="sp"></span><button class="btn sm" data-act="go" data-v="diag">진단에서 편집</button></div>${D.length ? D.map(d => `<p class="mini"><b>${esc(d.name)}</b> · 배정 ${S.members.filter(m => m.path?.dg === d.id).length}명</p>${d.outs.map(o => `<div class="pjrow"><b>${esc(o.k)}</b>${pathFlow(o, true)}<small>${S.members.filter(m => m.path?.dg === d.id && m.path.out === o.k).length}명</small></div>`).join('')}`).join('') : '<div class="empty">실행 중인 진단이 없습니다. AI 진단을 만들면 결과별 러닝 저니가 여기에 모입니다.</div>'}</div>`; }; }

/* ═════════ ③ AI SAM 상시 패널 + 대화로 메뉴 채우기(흐름) ═════════ */
const DOCK = { get: () => { try { return localStorage.getItem('didisam.dock') === '1'; } catch (e) { return false; } }, set: v => { try { localStorage.setItem('didisam.dock', v ? '1' : '0'); } catch (e) { } } };
/* v38 A-13 · C-14 · V-11 · P-5: 과정 상세에서는 그 과정에 맞는 일, 목록에서는 유형에 맞는 과정 만들기 예시(모든 유형에 '업무 자동화 기초'가 들어가던 문제 — '자동화'가 자동화 레시피로도 읽혔다) */
const FILLQ_CLS = { univ: '생성형 AI 활용 15주 교과목 설계하고 AI 강의 영상 · 강의자료까지 만들어줘', k12: '중2 수학 내신반 수업 만들어줘', corp: '신규 입사자 온보딩 4차시 과정 만들고 퀴즈 · 강의자료까지 채워줘', voc: '용접기능사 실기 20차시 훈련과정 만들어줘', public: '시민 디지털 역량 기초 6차시 교육과정 만들어줘', lifelong: '시니어 스마트폰 활용 8차시 강좌 만들어줘', adult: 'ITQ 엑셀 실무 입문 6차시 강좌 만들고 퀴즈 · 강의자료까지 채워줘' };
const fillqCls = () => { try { if (CUR && CUR.tab === 'class' && UI.cls) { const c = S.classes.find(x => x.id === UI.cls); if (c) { const has = new Set((c.curriculum || []).filter(x => x && x.type !== 'offline').map(x => +x.week || 0)); const empty = c.weekly && c.kind !== 'episode' && (c.weekPlan || []).some(w => !has.has(+w.w)); return empty ? `「${c.name}」 빈 ${S.org.type === 'univ' ? '주차' : '차시'} 채워줘` : `「${c.name}」 진도 30% 미만 ${t('learner')}에게 독려 메시지 보내줘`; } } } catch (e) { } return FILLQ_CLS[S.org.type] || FILLQ_CLS.adult; };
const FILLQ = () => { return { class: fillqCls(), diag: 'AI 활용 수준 진단 만들고 결과별 러닝 저니까지 설계해줘', journey: '진단 결과별 러닝 저니 설계해줘', assess: '보고서 과제 루브릭 만들어줘', board: '이번 달 운영 공지 써줘', badge: '수료 배지 만들어줘', auto: '매주 금요일 주간 보고서 보내는 자동화 만들어줘', site: '홈페이지 블루 톤에 신뢰감 있게, 후기 섹션 추가해줘', calendar: '모든 수업 · 마감 일정을 구글 캘린더로 보내고 AI 튜터 코칭 켜줘', library: 'AI 활용 기초 AI 강의 영상 만들어줘', book: 'AI 활용 기초 교재 만들어줘', message: `전체 ${t('learner')}에게 학습 안내 메시지 보내줘`, groups: `새 ${t('group')} 만들어줘` }; };
{ const open = ACT['chat-open'], close = ACT['chat-close'];
  ACT['chat-open'] = el => { const had = $('#drawer'); open(el); DOCK.set(1); const d = $('#drawer'); if (d && !had) { d.querySelector('.dh .x').insertAdjacentHTML('beforebegin', `<button class="btn sm" data-act="fill-here">${ic('spark', 12)} 이 화면 채우기</button>`); } };
  ACT['chat-close'] = el => { if (el) DOCK.set(0); close(el); };
  ACT['fill-here'] = () => { const q = FILLQ()[CUR.tab] || FILLQ()[CUR.ws]; if (!q) { toast('이 화면은 대화로 바로 채울 항목이 없습니다. 원하는 일을 입력해 주세요.'); $('#drawer textarea')?.focus(); return; } chatSend(q); };
  AFTER.push(cur => { if (cur.ws !== 'home' && DOCK.get() && !$('#drawer')) { ACT['chat-open'](); document.activeElement?.blur?.(); } });
}
['class', 'diag', 'journey', 'library'].forEach(k => Object.defineProperty(CTXQ, k, { get: () => FILLQ()[k], enumerable: true, configurable: true }));
EXQ.univ = ['AI 리터러시 15주 과정 만들고 진단 · 러닝 저니 · 공지까지 채워줘', '대기 과제 AI 평가해줘', 'AI 활용 수준 진단 만들고 결과별 러닝 저니 설계해줘', '가입률 낮은 학과 5곳'];
EXQ.corp[0] = '신규 입사자 온보딩 6차시 과정 만들고 AI 강의 영상 · 배지 · 안내 메시지까지 준비해줘';
EXQ.k12[2] = '겨울방학 특강 4차시 과정 만들고 공지까지 써줘';
EXQ.adult[1] = '엑셀 실무 마스터 8차시 과정 만들고 강의자료 · 퀴즈까지 채워줘';
EXQ.lifelong[1] = '바리스타 입문 과정 만들고 모집 공지 써줘';
EXQ.voc[1] = '웹개발 기초 과정에 퀴즈 5문항이랑 강의자료 만들어줘';

/* 과정 만들기(흐름 · 저니 공용) */
function makeCourse(x) {
  const U = S.org.type === 'univ'; const topic = clean(x.topic) || '새 과정'; const weeks = clamp(+x.weeks || (U ? 15 : 6), 1, 30);
  const o = { topic, weeks, univ: U, quiz: x.quiz !== false, assign: x.assign !== false, exam: x.exam !== false, vids: 1, level: '보통', vsrc: x.vsrc || 'youtube', docs: !!x.docs };
  const W = AI.design(o); const c = { id: uid('c'), name: topic, kind: 'period', sub: '', status: '준비중', price: 0, open: '비공개', start: today(), end: addDays(today(), weeks * 7), teacher: S.me.name, group: '', learners: [], prog: {}, criteria: { video: 50, exam: 30, assign: 20, threshold: 70 }, cert: 'auto', skip: false, speed: true, early: false, community: 'class', hours: weeks * (U ? 3 : 1), goal: AI.goal(topic, x.aud || ''), notices: [], level: +x.level || 0 };
  if (x.fee && x.fee.price != null && !x.fee.amb) c.price = x.fee.price; /* v33 요청한 수강료 반영(QA #48) */
  c.curriculum = itemsFromDesign(W, o); c.weekly = true; c.weekPlan = W.map(w => ({ w: w.w, title: w.title, goal: w.goal }));
  S.classes.unshift(c); logAudit(`AI 과정 생성 — ${c.name}`); if (o.vsrc !== 'ai' && S.settings.yt?.key) ytAutofill(c); return c;
}
const pushItem = (c, it) => { it.id = uid('it'); if (c.weekly && !it.week) it.week = Math.min(c.weekPlan.length, Math.max(1, ...c.curriculum.filter(x => x.week).map(x => x.week))); c.curriculum.push(it); return it; };

const feeLine = x => x.fee ? (x.fee.amb ? ' · 수강료 확인 필요' : ` · 수강료 ${x.fee.txt}`) : ' · 수강료는 만든 뒤 설정에서 입력';
/* 흐름 단계 정의: re(감지) · absorb(과정 생성에 흡수) · single(단독 요청 시 흐름으로 처리할지) */
const FILL = [
  { id: 'course', go: 'class', re: /(과정|교과목|강좌|교육과정|훈련과정|클래스|커리큘럼)\s*(을|를|도|하나)?\s*(새로\s*)?(만들|설계|개설|생성|짜|구성)|(15주|\d+\s*(주|차시|회차|강))\s*(과정|교과목|강좌)?\s*(설계|편성)/, label: () => `${t('cls')} 생성`,
    line: x => `「${x.topic}」 ${x.weeks}${x.univ ? '주' : '차시'} — 차시별 영상(${x.vsrc === 'ai' ? 'AI 생성' : 'YouTube 추천'}) · 퀴즈 · 과제+루브릭 · ${x.univ ? '중간/기말' : '최종 평가'}${x.docs ? ' · 강의자료' : ''}${feeLine(x)}`,
    run: x => { const c = makeCourse(x); x.cls = c; return `「${c.name}」 ${c.weekPlan.length}${x.univ ? '주' : '차시'} · 항목 ${c.curriculum.length}개 · 수강료 ${c.price ? won(c.price) : x.fee && x.fee.price === 0 ? '무료' : '0원(설정에서 입력)'} · ${c.status}(공개 전)`; }, open: x => ({ go: 'class', cls: x.cls?.id }) },
  { id: 'video', absorb: 1, re: /영상/, label: () => 'AI 강의 영상', line: x => `「${x.target()}」에 AI 강의 영상 ${x.n || 1}개(대본 · 슬라이드 · 내레이션)`,
    run: x => { const c = x.tc(); for (let i = 0; i < (x.n || 1); i++) { const title = `${x.topic || clean(c.name)} 강의${x.n > 1 ? ' ' + (i + 1) : ''}`; pushItem(c, { type: 'video', src: 'ai', title, ai: { scenes: AI.lecture(title, 5), mins: 5, voice: 'f' }, url: 'ai:' }); } c.curriculum.forEach(i => { if (i.url === 'ai:') i.url = 'ai:' + i.id; }); return `「${c.name}」에 AI 강의 영상 ${x.n || 1}개`; }, open: x => ({ go: 'class', cls: x.tc().id }) },
  { id: 'doc', absorb: 1, re: /강의\s*자료|교안|핸드아웃|학습\s*자료|수업\s*자료/, label: () => '강의자료', line: x => `「${x.target()}」 차시별 강의자료(교안) 생성`,
    run: x => { const c = x.tc(); let n = 0; if (c.weekly) c.weekPlan.forEach(w => { if (/고사|최종 평가/.test(w.title) || c.curriculum.some(i => i.type === 'doc' && i.week === w.w) || n >= 15) return; const v = c.curriculum.find(i => i.type === 'video' && i.week === w.w && i.ai?.scenes); pushItem(c, { type: 'doc', title: `${w.w}주 강의자료 — ${w.title}`, week: w.w, topic: `${clean(c.name)} ${w.title}`, doc: AI.material(`${clean(c.name)} ${w.title}`, c, v?.ai?.scenes) }); n++; });
      else { pushItem(c, { type: 'doc', title: `${clean(c.name)} 강의자료`, topic: clean(c.name), doc: AI.material(c.name, c) }); n = 1; } return `「${c.name}」 강의자료 ${n}건`; }, open: x => ({ go: 'class', cls: x.tc().id }) },
  { id: 'quiz', absorb: 1, re: /퀴즈/, label: () => '퀴즈', line: x => `「${x.target()}」 퀴즈 ${x.n || 5}문항`, run: x => { const c = x.tc(); pushItem(c, { type: 'quiz', title: `${String(x.topic || clean(c.name)).replace(/\s*확인$/, '')} 확인 퀴즈`, qs: AI.questions(x.topic || c.name, x.n || 5), time: 0, retake: 98 }); return `퀴즈 ${x.n || 5}문항`; }, open: x => ({ go: 'class', cls: x.tc().id }) },
  { id: 'exam', absorb: 1, re: /시험|고사/, label: () => '시험', line: x => `「${x.target()}」 시험 ${x.n || 10}문항(배점 100)`, run: x => { const c = x.tc(); pushItem(c, { type: 'exam', title: `${clean(c.name)} 평가 시험`, qs: AI.questions(x.topic || c.name, x.n || 10, '보통', ['mc', 'mc', 'ox', 'short', 'essay']), time: 60, retake: 1 }); return `시험 ${x.n || 10}문항`; }, open: x => ({ go: 'class', cls: x.tc().id }) },
  { id: 'assign', absorb: 1, re: /과제(?!\s*(채점\s*)?(루브릭|채점\s*기준))/, label: () => '과제 + 루브릭', line: x => `「${x.target()}」 과제 안내 + 채점 루브릭`, run: x => { const c = x.tc(); const rb = AI.rubric(`${clean(c.name)} 과제`); S.rubrics.push(rb); pushItem(c, { type: 'assign', title: `${clean(c.name)} 실습 과제`, ...AI.assignment(c.name), rubric: rb.id }); return '과제 1건 + 루브릭'; }, open: x => ({ go: 'class', cls: x.tc().id }) },
  { id: 'rubric', go: 'assess', re: /루브릭|채점\s*기준/, label: () => '루브릭', line: x => `「${x.topic || '과제'}」 루브릭(기준 4 · 배점 100 · 수준 3단계)`, run: x => { const rb = AI.rubric(x.topic || '과제'); S.rubrics.push(rb); UI.asF = 'rubric'; return `「${rb.name}」`; } },
  { id: 'bank', go: 'assess', re: /문항\s*은행/, label: () => '문항 은행', line: x => `「${x.topic || 'AI 활용'}」 문항 ${x.n || 10}개를 문항 은행에`, run: x => { (S.bank = S.bank || []).push(...AI.questions(x.topic || 'AI 활용', x.n || 10).map(q => ({ ...q, topic: x.topic || 'AI 활용' }))); UI.asF = 'bank'; return `문항 ${x.n || 10}개`; } },
  { id: 'diag', go: 'diag', re: /진단(?!\s*결과)/, label: () => 'AI 진단', line: x => `「${x.dtopic}」 ${x.dmode === 'type' ? '유형(성향)' : '수준(지식)'} 진단 10문항 + 결과별 러닝 저니 · ${x.deploy ? '바로 배포' : '초안 저장'}`,
    run: x => { const U = S.org.type === 'univ'; const d = { id: uid('dg'), name: `${x.dtopic} ${x.dmode === 'type' ? '유형' : '수준'} 진단`, mode: x.dmode, src: 'ai', topic: x.dtopic, n: 10, items: x.dmode === 'type' ? AI.likert(x.dtopic, U ? Object.keys(PRISM) : ['관찰형', '분석형', '표현형']) : AI.questions(x.dtopic, 10, '보통', ['mc']), outs: dgDefaultOuts(x.dmode), to: 'all', days: 14, status: x.deploy ? '진행 중' : '초안', res: {} };
      if (x.deploy) { d.start = today(); d.end = addDays(today(), 14); } dgEnsurePaths(d); if (x.cls) d.outs.forEach(o => { const s = o.path?.[o.path.length > 1 ? 1 : 0]; if (s && !s.cls.includes(x.cls.id)) s.cls.unshift(x.cls.id); }); S.diags.unshift(d); x.diag = d; return `「${d.name}」 ${d.items.length}문항 · 결과 ${d.outs.length}개 · ${d.status}`; } },
  { id: 'journey', go: 'journey', re: /러닝\s*저니|학습\s*경로|로드맵/, label: () => '러닝 저니', line: x => x.diag || x.willDiag ? '진단 결과별 맞춤 러닝 저니 연결(결과마다 3~4단계)' : `${(S.diags || []).length ? '최근 진단 결과별 러닝 저니 재설계 + ' : ''}공통 러닝 저니에 ${x.cls || x.willCourse ? '새 과정 배치' : '과정 재배치'}`,
    run: x => { let msg = []; const d = x.diag || (S.diags || [])[0]; if (d) { d.outs.forEach(o => { o.path = AI.path(d, o); o.mode = 'path'; if (x.cls && !o.path.some(s => s.cls.includes(x.cls.id))) o.path[Math.min(1, o.path.length - 1)].cls.unshift(x.cls.id); }); dgEnsurePaths(d); msg.push(`「${d.name}」 결과 ${d.outs.length}개에 저니 설계`); }
      if (S.journey?.length) { if (x.cls) { const st = S.journey[Math.min(+x.cls.level || 0, S.journey.length - 1)]; if (!st.cls.includes(x.cls.id)) st.cls.push(x.cls.id); msg.push(`공통 저니 「${st.name}」 단계에 「${x.cls.name}」 배치`); } else { S.journey.forEach((j, i) => { j.cls = S.classes.filter(c => (+c.level || 0) === i).map(c => c.id); }); msg.push('공통 저니 단계별 과정 재배치'); } }
      return msg.join(' · ') || '진단이 없어 공통 저니만 갱신'; } },
  { id: 'badge', go: 'badge', re: /배지/, label: () => '배지', line: x => `「${x.cls || x.willCourse ? x.target() : x.topic || '수료'}」 배지 — ${x.cls || x.willCourse ? '평가 통과 시 자동 발급' : '수동 발급'}`,
    run: x => { const c = x.cls; S.badges.push({ id: uid('bd'), name: `${c ? clean(c.name) : x.topic || '수료'} 배지`.slice(0, 20), key: '★', cls: c?.id || '', method: c ? 'pass' : 'manual', special: false, fill: '#4C77C5', ring: '#2E4F8F', rib: '#B9CCEB', issued: [] }); return `배지 「${S.badges.at(-1).name}」`; } },
  { id: 'notice', go: 'board', re: /공지/, label: () => '공지', line: x => `공지 「${x.ntitle()}」 작성 · 상단 고정`, run: x => { const tt = x.ntitle(); (S.notices = S.notices || []).unshift({ id: uid('n'), title: tt, at: today(), pin: true, body: AI.notice(tt) }); return `공지 「${tt}」`; } },
  { id: 'message', go: 'message', single: false, re: /(안내|알림|메시지|문자)\S*\s*(을|를|도|까지)?\s*(보내|발송|준비|작성|써)/, label: () => '안내 메시지', line: x => x.send ? `전체 ${t('learner')} ${S.members.length}명에게 「${x.mtitle()}」 알림함 발송` : `「${x.mtitle()}」 안내 메시지 초안(발송 전 확인)`, run: x => { const tt = x.mtitle(); S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: '전체', title: tt, ch: x.send ? '알림함 + 앱 푸시' : '초안 — 발송 전', n: x.send ? S.members.length : 0, body: AI.msg(tt).body }); return x.send ? `「${tt}」 ${S.members.length}명 발송(데모)` : `「${tt}」 초안 저장`; } },
  { id: 'auto', go: 'auto', single: false, re: /자동화/, label: () => '업무 자동화', line: x => `자동화 레시피 「${recipeFromText(x.q).name}」 저장(꺼진 상태)`, run: x => { const r = recipeFromText(x.q); r.on = false; S.autos.unshift(r); return `레시피 「${r.name}」`; } },
  { id: 'site', go: 'site', re: /홈페이지|사이트|랜딩/, label: () => '홈페이지', line: () => 'AI 웹 빌드로 섹션 초안 생성(게시는 직접)', run: x => { const pub = S.site?.published; S.site = SITEGEN(x.q); S.site.published = pub; return `섹션 ${S.site.sections.length}개`; } },
  { id: 'group', go: 'groups', re: /(학과|부서|훈련반|기수|그룹|(?<![가-힣])반)\S*\s*(을|를)?\s*(\d+\s*개\s*)?(만들|추가|생성|등록)/, label: () => t('group'), line: x => `${t('group')} ${x.gnames().join(' · ')} 추가`, run: x => { const A = x.gnames(); const L = A.filter(n => !S.groups.some(g => g.name === n)); L.forEach(n => S.groups.push({ id: uid('g'), name: n, lead: '' })); return `${t('group')} ${L.length}개 추가${A.length > L.length ? ` · 이미 있음: ${A.filter(n => !L.includes(n)).join(', ')}` : ''}`; } },
  { id: 'book', go: 'book', re: /교재|전자책/, label: () => '교재', line: x => `「${x.target()} 교재」 전자책 등록(강의자료 묶음)`, run: x => { S.books.push({ id: uid('bk'), name: `${x.target()} 교재`.slice(0, 40), kind: '전자책', price: 0, sold: 0, delivered: 0, open: '전체' }); return '교재 1건'; } },
  { id: 'survey', absorb: 1, re: /설문/, label: () => '만족도 설문', line: x => `「${x.target()}」 만족도 설문 5문항`, run: x => { const c = x.tc(); pushItem(c, { type: 'survey', title: '과정 만족도 설문', qs: ['과정에 전반적으로 만족한다.', '강의 내용이 학습 · 업무에 도움이 된다.', '강의 영상과 자료의 품질이 좋다.', '과제와 평가가 적절했다.', '개선할 점을 자유롭게 적어 주세요.'].map((q, i) => i === 4 ? { q, t: 'text', opts: [], req: false } : { q, t: 'likert' }) }); /* v38 P-2: 자유 의견은 글 응답(5점 척도로 '매우 그렇다 100%'가 집계되던 문제) */ return '설문 5문항'; }, open: x => ({ go: 'class', cls: x.tc().id }) },
  { id: 'live', absorb: 1, re: /라이브|실시간\s*강의|화상\s*강의/, label: () => '라이브 강의', line: x => `「${x.target()}」 라이브 강의 일정`, run: x => { const c = x.tc(); pushItem(c, { type: 'live', title: `${clean(c.name)} 라이브 Q&A`, url: '', at: `${addDays(today(), 7)}T19:00` }); return '라이브 1건'; }, open: x => ({ go: 'class', cls: x.tc().id }) }
];
const VERB = /(만들|생성|설계|작성|써|쓰|추가|등록|개설|짜|채워|채우|올려|보내|발송|준비|구성|연결|세팅|붙여)/;
function flowTopic(q, idx) {
  const m = q.match(/[「"“'](.+?)[」"”']/); if (m) return m[1].trim().slice(0, 40);
  let pre = feeStrip(q.slice(0, idx)).replace(/\S+\s*대상(으로|의|인)?(?=\s|$)/, ' ').replace(/\d+\s*(주|차시|회차|강|문항|개|명|분)\S*/g, ' ').replace(/(^|\s)(새로운|새로|새|우리|이번|다음|기존)(?=\s)/g, ' ').replace(/[,·+]/g, ' ').replace(/\s+/g, ' ').trim();
  pre = pre.replace(/(?<=[가-힣A-Za-z0-9)])(에다가?|에)\s+\S.*$/, '').replace(/(\s*(영상|교안|강의\s*자료|확인|랑|이랑|하고|및|그리고))+\s*$/, ''); /* v38 P-6: '시민 디지털 역량 기초에 영상 2개랑 확인 퀴즈' → '시민 디지털 역량 기초' */
  pre = pre.replace(/\s*(AI\s*로?)?\s*(강의)?\s*$/, '').replace(/(?<=[가-힣A-Za-z0-9)])\s*(에다가?|에서|에|을|를)$/, '').replace(/\s*(과정|교과목|강좌)$/, '').trim();
  return pre.length >= 2 && pre.length <= 40 ? pre : '';
}
function flowParse(q) {
  if (!VERB.test(q)) return null;
  let hits = FILL.map(f => { const m = q.match(f.re); return m ? { f, i: m.index } : null; }).filter(Boolean);
  if (!hits.length) return null; hits.sort((a, b) => a.i - b.i);
  const ids = new Set(hits.map(h => h.f.id)); const U = S.org.type === 'univ';
  const named = S.classes.find(c => q.includes(clean(c.name)) && clean(c.name).length >= 2);
  const topic = flowTopic(q, hits[0].i); const tcls = named || (topic && S.classes.find(c => clean(c.name).includes(topic) || topic.includes(clean(c.name))));
  if (!ids.has('course') && hits.some(h => h.f.absorb) && !tcls && topic && SESS_RE.test(q)) { hits.unshift({ f: FILL[0], i: -1 }); ids.add('course'); }
  const x = { q, univ: U, topic: topic || (tcls ? clean(tcls.name) : ''), weeks: +(q.match(SESS_RE) || [])[1] || (U ? 15 : 6), fee: aiFee(q), aud: ((q.match(/([가-힣A-Za-z0-9]+)\s*대상/) || [])[1] || '').slice(0, 20), n: +(q.match(/(\d+)\s*(문항|개)/) || [])[1] || 0,
    vsrc: /AI\s*(로\s*)?(강의\s*)?영상|영상\S*\s*(AI|생성|만들)/i.test(q) ? 'ai' : 'youtube', docs: ids.has('doc'), deploy: /(배포|실행|시작|열어)/.test(q), send: /(보내|발송)/.test(q), dmode: /(수준|레벨|지식|역량\s*수준)/.test(q) ? 'level' : (/(유형|성향)/.test(q) || (U && !/수준/.test(q))) ? 'type' : 'level', willCourse: ids.has('course'), willDiag: ids.has('diag') };
  x.cls = !ids.has('course') ? (tcls || (CUR.tab === 'class' && UI.cls && C(UI.cls)) || null) : null;
  x.tc = () => x.cls || S.classes[0]; x.target = () => x.cls?.name || (ids.has('course') ? x.topic || '새 과정' : (x.tc()?.name || ''));
  if (!x.topic && ids.has('course')) x.topic = `${TYPES[S.org.type].name} 신규 과정`;
  x.dtopic = (x.topic || 'AI 활용').replace(/\s*(진단|역량|수준|유형|성향)\s*/g, ' ').trim() || 'AI 활용';
  x.ntitle = () => x.cls ? `「${clean(x.cls.name)}」 개설 안내` : x.diag ? `${x.diag.name} 응시 안내` : `${x.topic || '이번 달 운영'} 안내`;
  x.mtitle = () => x.cls ? `${clean(x.cls.name)} 수강 안내` : x.diag ? `${x.diag.name} 참여 안내` : '학습 안내';
  x.gnames = () => { const qm = [...q.matchAll(/[「"“](.+?)[」"”]/g)].map(m => m[1]); if (qm.length) return qm; const L = (q.match(/[가-힣A-Za-z0-9]+(학과|부서|팀|반|기수)/g) || []).filter(n => !/^(새|신규|우리)/.test(n) && n.length > 2); return L.length ? [...new Set(L)] : [`새 ${t('group')}`]; };
  const PRI = { course: 0, diag: 1, journey: 2 }; hits.sort((a, b) => (PRI[a.f.id] ?? 3) - (PRI[b.f.id] ?? 3) || a.i - b.i);
  const steps = hits.filter(h => !(ids.has('course') && h.f.absorb && ['video', 'doc', 'quiz', 'exam', 'assign'].includes(h.f.id))).map(h => h.f);
  if (steps.length === 1 && steps[0].single === false) return null;
  return { x, steps };
}
function flowRun(F) { return F.steps.map(f => { try { const res = f.run(F.x); const o = f.open ? f.open(F.x) : { go: f.go }; return { label: f.label(), res, ok: true, ...o }; } catch (e) { console.error(e); return { label: f.label(), res: '처리하지 못했습니다 — 화면에서 직접 확인해 주세요.', ok: false, go: f.go || 'home' }; } }); }
function flowAnswer(q) {
  const F = flowParse(q); if (!F) return null;
  if (F.x.willCourse && F.x.fee && F.x.fee.amb) { const base = feeStrip(q); const O = F.x.fee.opts || [];
    return { text: `${F.x.fee.amb}\n「${F.x.topic}」 ${F.x.weeks}${F.x.univ ? '주' : '차시'} ${tj('cls', '은')} 수강료가 정해지면 바로 만들어 드립니다.${O.length ? '' : ' 금액을 함께 적어 다시 말씀해 주세요.'}`, html: `<div class="bqs">${O.map(v => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(`${base} 수강료 ${v ? won(v) : '무료'}`)}">${v ? esc(won(v)) : '무료'}로 만들기</button>`).join('')}${O.includes(0) ? '' : `<button type="button" class="chip" data-act="chat-q" data-v="${esc(base + ' 무료')}">무료로 만들기</button>`}</div>` }; }
  const pid = uid('p');
  PLANS[pid] = { flow: () => { const r = flowRun(F); S.ai.usage += F.steps.length; return r; }, q, go: F.steps[0].go || 'class' };
  const html = `<ol class="flow">${F.steps.map((f, i) => `<li><span class="fn">${i + 1}</span><div><b>${esc(f.label())}</b><small>${esc(f.line(F.x))}</small></div><em class="fm">${esc(mlabel(f.go || 'class'))}</em></li>`).join('')}</ol>`;
  const one = F.steps.length === 1;
  const how = F.x.willCourse ? `\n요청을 이렇게 이해했습니다: 「${F.x.topic}」 · ${F.x.weeks}${F.x.univ ? '주' : '차시'}${F.x.aud ? ` · 대상 ${F.x.aud}` : ''} · 수강료 ${F.x.fee ? F.x.fee.txt : '미정(만든 뒤 설정에서 입력)'}. 다르면 고쳐서 다시 말씀해 주세요.` : '';
  return { title: '흐름', text: (one ? `${F.steps[0].label()} — 아래 내용으로 진행할까요?` : `${F.steps.length}단계 흐름으로 처리하겠습니다. 앞 단계 결과(만든 ${t('cls')} · 진단)가 다음 단계에 자동으로 이어집니다.`) + how, html, plan: pid, state: 'pending', cta: one ? '승인하고 채우기' : `흐름 실행(${F.steps.length}단계)`, ...(F.x.willCourse ? { btn: { act: 'ai-design', v: F.x.topic, label: '마법사에서 직접 조정' } } : {}) };
}
{ const base = answer; answer = q => { const nav = /(열어|보여줘|가자|이동|화면)/.test(q) && q.length < 24; const status = /(현황|요약|몇|오래된|가입률|상황|어때)/.test(q) && !VERB.test(q.replace(/보고서?\s*만들/, ''));
  if (!nav && !status && !/(독려|미납|승인해|채점\s*초안|답변\s*초안|AI\s*평가|HRD|환불|반환|보고서|리포트|안\s*한|미완료)/i.test(q)) { const r = flowAnswer(q); if (r) return r; } return base(q); }; }
{ const ok = ACT['plan-ok']; ACT['plan-ok'] = el => { const pid = el.dataset.v, P = PLANS[pid]; if (!P || !P.flow) return ok(el); const m = S.chat.find(x => x.plan === pid);
  const R = P.flow(); m.state = 'done'; delete PLANS[pid]; logAudit(`AI SAM 흐름 실행 — ${P.q.slice(0, 40)} (${R.filter(r => r.ok).length}/${R.length})`);
  S.chat.push({ role: 'ai', text: `완료했습니다. ${R.filter(r => r.ok).length}/${R.length}단계를 채웠습니다. 각 화면에서 확인 · 수정하실 수 있습니다.`, flow: R, btn: { act: 'flow-save', v: P.q, label: '이 흐름을 자동화 레시피로 저장' } }); S.chat = S.chat.slice(-60); save(); render(); renderThreads(); }; }
{ const base = aiBody; aiBody = m => { let h = base(m); if (m.flow) { const L = `<ol class="flow done">${m.flow.map((r, i) => `<li><span class="fn ${r.ok ? '' : 'no'}">${r.ok ? '✓' : '!'}</span><div><b>${esc(r.label)}</b><small>${esc(r.res)}</small></div><button class="btn sm" data-act="flow-open" data-v="${esc(r.go || '')}" data-c="${esc(r.cls || '')}">열기 ${ic('arrow', 12)}</button></li>`).join('')}</ol>`; h = h.replace('<div class="mact">', L + '<div class="mact">'); if (!h.includes(L)) h += L; } return h; }; }
ACT['flow-open'] = el => { if (el.dataset.c && C(el.dataset.c)) { UI.cls = el.dataset.c; UI.clsT = 'curriculum'; } go(el.dataset.v || 'home'); };
ACT['flow-save'] = el => { const q = el.dataset.v; if (S.autos.some(a => a.flowQ === q)) { toast('이미 저장된 흐름입니다.'); return; } S.autos.unshift({ key: uid('flow'), name: `대화 흐름 — ${q.slice(0, 24)}`, trigger: 'sc:mon', cond: '대화로 만든 흐름(실행 전 승인)', actions: ['draft', 'task'], approve: true, on: false, runs: 0, last: '', flowQ: q }); save(); toast('업무 자동화에 꺼진 상태로 저장했습니다. 트리거를 정한 뒤 켜세요.', 'ok'); };
{ const base = runAuto; runAuto = (a, force) => { if (!a.flowQ) return base(a, force); const F = flowParse(a.flowQ); const R = F ? flowRun(F) : []; a.runs = (a.runs || 0) + 1; a.last = nowStr(); S.runs.unshift({ at: nowStr(), name: a.name, n: R.length, st: '완료', how: force ? '수동 실행' : trigLabel(a.trigger) }); logAudit(`자동화 흐름 실행 — ${a.name}`); save(); return `「${a.name}」 실행 — ${R.filter(r => r.ok).length}/${R.length}단계`; }; }
{ const base = targets; targets = a => a.flowQ ? [] : base(a); }

/* v4 상태 보강: 기존 진단에 러닝 저니 */
{ const base = upgradeState; upgradeState = () => { base(); if (!S.v4) { (S.diags || []).forEach(dgEnsurePaths); S.v4 = 1; save(); } }; }
{ const base = postSeed; postSeed = type => { base(type); (S.diags || []).forEach(dgEnsurePaths); S.v4 = 1; }; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#drawer') && !$('.mwrap')) DOCK.set(0); }, true);
