/* 디디쌤 스튜디오 v10.3 — 디지털북 빌더(학습 › 디지털북)
   단원 · 블록으로 인터랙티브 교재를 만든다. 과정 항목(영상 · 퀴즈 · 시험 · 과제)을 연결하면 학습자 기록이 과정 진도 · 평가와 같은 곳(LP.cls)에 쌓인다.
   운영자 채점(서술 블록)은 S.bkgrades[책][학번][블록] = {score, fb, at} — 게시본에는 넣지 않고 학습자 본인 mine.bk로만 내려간다. */
'use strict';
const BK_MAX_CH = 40, BK_MAX_BL = 60;
const bkL = () => LSV().dbooks;
const bkOf = id => bkL().find(x => x.id === id);
const bkClasses = () => S.classes.map(c => ({ id: c.id, name: c.name, items: (c.curriculum || []).map(it => ({ id: it.id, type: it.type, title: it.title, yt: (it.yt && it.yt.id) || (typeof ytId === 'function' ? ytId(it.url || '') : '') || '' })) }));
const bkQ = q => ({ t: q.t === 'ox' ? 'ox' : q.t === 'short' ? 'short' : 'mc', q: String(q.q || '').replace(/^\d+\.\s*/, '').slice(0, 400), opts: q.t === 'mc' || !q.t ? (q.opts || ['', '', '', '']).slice(0, 6).map(o => String(o || '').slice(0, 200)) : [], a: String(q.a ?? '0').slice(0, 200), exp: String(q.exp || '').slice(0, 400) });

/* ── 생성 ── */
function bkNew(title, o = {}) { const LV = (S.lsite && S.lsite.levels) || []; const lv = o.level || 0; return { id: uid('bk'), title: String(title || '새 디지털북').slice(0, 60), level: lv, color: (LV[lv] || {}).color || '#5C74F6', desc: '', cls: '', thr: 80, pass: 60, on: true, url: '', chs: [], units: [], at: today(), ...o }; }
const bkB = (type, o = {}) => ({ id: uid('b'), type, ...o });
/* AI 초안 — 단원 하나: 설명 → 핵심 박스 → 펼쳐보기 → 확인 문제 (+ 순서 · 체크 · 서술) */
function bkAIChapter(topic, title, k = 0, last = false, sec = null) {
  const tp = clean(topic) || '핵심 개념'; const M = AI.material(tp); const S1 = sec ? [sec] : M.secs.slice(0, 2); const nm = clean(title) || S1[0].h;
  const steps = String(M.act || '').split(/[①②③④⑤⑥]/).slice(1).map(s => s.trim()).filter(Boolean); const pts = S1.flatMap(s => s.pts).filter(Boolean);
  const bl = [bkB('text', { body: S1.map(s => `# ${s.h}\n${s.body}`).join('\n\n') }), bkB('key', { tone: 'key', title: '핵심 정리', body: pts.slice(0, 5).map(p => '- ' + p).join('\n') }),
    bkB('flip', { title: '펼쳐서 확인하기', cards: [...S1.map(s => ({ f: `「${s.h}」 한 문장 요약`, b: String(s.body).split(/(?<=[.!?다])\s/)[0].slice(0, 160) })), ...pts.slice(0, 2).map((p, i) => ({ f: `핵심 ${i + 1}`, b: p }))].slice(0, 4) }),
    bkB('quiz', { title: '확인 문제', pts: 10, qs: AI.questions(tp, 2, '보통', k % 2 ? ['ox', 'mc'] : ['mc', 'ox']).map(bkQ) })];
  if (k === 1 && steps.length >= 3) bl.push(bkB('order', { title: '실습 순서 맞추기', steps: steps.slice(0, 5), pts: 10 }));
  if (last) { if (steps.length) bl.push(bkB('check', { title: '따라 하기', steps: steps.slice(0, 5) })); bl.push(bkB('write', { prompt: `「${tp}」${AI.j(tp, '을')} 내 전공 · 업무에 적용하는 방법을 3문장으로 쓰세요.`, pts: 20, guide: '적용 대상 · 방법 · 기대 효과가 드러나면 좋습니다.' })); }
  return { id: uid('ch'), title: nm.slice(0, 60), blocks: bl };
}
function bkAIDraft(topic, n = 3, o = {}) {
  const tp = clean(topic) || '핵심 개념'; const M = AI.material(tp); const S = M.secs; const b = bkNew(`${tp} 디지털북`, { ...o, desc: `${tp}${AI.j(tp, '을')} 읽고 · 보고 · 풀고 · 쓰며 익히는 인터랙티브 교재입니다.` });
  b.chs = Array.from({ length: n }, (_, k) => { const sec = S[k % S.length]; return bkAIChapter(tp, `${sec.h}${k >= S.length ? ' 심화' : ''}`, k, k === n - 1, sec); });
  b.chs[0].blocks.unshift(bkB('key', { tone: 'tip', title: '학습 목표', body: M.goals.slice(0, 4).map(g => '- ' + g).join('\n') })); return bkNorm(b);
}
/* 과정 → 디지털북: '장' 항목(없으면 차시, 그것도 없으면 4개씩)으로 단원을 나누고, 강의자료는 본문으로 옮기고 영상 · 퀴즈 · 시험 · 과제 · 설문은 연결한다 */
function bkFromCourse(c, o = {}) {
  const items = c.curriculum || []; const hasCh = items.some(x => x.type === 'chapter'); const hasWk = !hasCh && items.some(x => x.week); const G = []; let cur = null;
  items.forEach((it, i) => {
    if (it.type === 'chapter') { cur = { title: clean(it.title) || `${G.length + 1}장`, items: [] }; G.push(cur); return; }
    if (!cur || (hasWk && (it.week || 0) !== cur.week) || (!hasCh && !hasWk && cur.items.length >= 4)) { const w = it.week || 0; cur = { week: w, title: hasWk ? `${w}${c.weekly === false ? '차시' : '차시'}${(c.weekPlan || [])[w - 1]?.title ? ' · ' + c.weekPlan[w - 1].title : ''}` : `${G.length + 1}장`, items: [] }; G.push(cur); }
    cur.items.push(it); void i; });
  const { fill, ...oo } = o; void fill; const b = bkNew(`${clean(c.name)} 디지털북`, { level: c.level || 0, cls: c.id, desc: String(c.goal || c.desc || `「${clean(c.name)}」 과정을 책으로 읽고, 영상 · 퀴즈 · 시험 · 과제까지 이 안에서 진행합니다.`).slice(0, 300), ...oo });
  b.chs = G.filter(g => g.items.length).slice(0, BK_MAX_CH).map(g => { const bl = [bkB('text', { body: `# ${g.title}\n이 단원에서는 아래 활동을 차례로 진행합니다.\n${g.items.map(x => '- ' + clean(x.title)).join('\n')}` })];
    if (o.fill !== false && !g.items.some(x => x.type === 'doc' && (x.doc?.secs || []).length)) { const tp = clean(g.title.replace(/^\d+(주차|차시|장)\s*·?\s*/, '')) || clean(c.name); const M = AI.material(tp); const S1 = M.secs.slice(0, 2); /* 강의자료가 없는 단원은 읽을거리 초안을 채움 */
      bl.push(bkB('text', { body: S1.map(s => `# ${s.h}\n${s.body}`).join('\n\n') }), bkB('key', { tone: 'key', title: '핵심 정리', body: S1.flatMap(s => s.pts).slice(0, 4).map(p => '- ' + p).join('\n') }), bkB('flip', { title: '펼쳐서 확인하기', cards: S1.map(s => ({ f: `「${s.h}」의 요점은?`, b: s.pts.slice(0, 2).join(' / ') || String(s.body).slice(0, 120) })) })); }
    g.items.forEach(it => {
      if (it.type === 'doc') { const D = it.doc || {}; if ((D.goals || []).length) bl.push(bkB('key', { tone: 'tip', title: '학습 목표', body: D.goals.map(x => '- ' + x).join('\n') }));
        (D.secs || []).forEach(s => bl.push(bkB('text', { body: `# ${s.h}\n${s.body || ''}${(s.pts || []).length ? '\n' + s.pts.map(p => '- ' + p).join('\n') : ''}` })));
        if ((D.secs || []).length) bl.push(bkB('flip', { title: '핵심 다시 보기', cards: D.secs.slice(0, 6).map(s => ({ f: s.h, b: (s.pts || []).slice(0, 2).join(' / ') || String(s.body || '').slice(0, 120) })) }));
        const st = String(D.act || '').split(/[①②③④⑤⑥]/).slice(1).map(s => s.trim()).filter(Boolean); if (st.length) bl.push(bkB('check', { title: '실습 따라 하기', steps: st.slice(0, 6) }));
        if (!(D.secs || []).length && it.desc) bl.push(bkB('text', { body: it.desc })); return; }
      if (['video', 'quiz', 'exam', 'assign', 'survey', 'live', 'offline'].includes(it.type)) bl.push(bkB('item', { cls: c.id, item: it.id, pts: it.type === 'exam' ? 30 : it.type === 'quiz' ? 10 : '' })); });
    return { id: uid('ch'), title: g.title.slice(0, 60), blocks: bl.slice(0, BK_MAX_BL) }; });
  if (!b.chs.length) b.chs = [bkAIChapter(c.name, '들어가며', 0, true)];
  else if (o.fill !== false) { /* 책에서만 하는 활동: 2단원 순서 맞추기 · 마지막 단원 따라 하기 + 적용 서술 */
    const M = AI.material(clean(c.name)); const st = String(M.act || '').split(/[①②③④⑤⑥]/).slice(1).map(s => s.trim()).filter(Boolean); const L2 = b.chs[b.chs.length - 1];
    if (b.chs.length > 1 && st.length >= 3) b.chs[1].blocks.splice(Math.min(4, b.chs[1].blocks.length), 0, bkB('order', { title: '실습 순서 맞추기', steps: st.slice(0, 5), pts: 10 }));
    if (!L2.blocks.some(x => x.type === 'check') && st.length) L2.blocks.push(bkB('check', { title: '따라 하기', steps: st.slice(0, 5) }));
    L2.blocks.push(bkB('write', { prompt: `「${clean(c.name)}」에서 배운 내용을 내 전공 · 업무에 어떻게 적용할지 3문장으로 쓰세요.`, pts: 20, guide: '적용 대상 · 방법 · 기대 효과가 드러나면 좋습니다.' })); }
  return bkNorm(b);
}
/* 정리 · 이전 형식(단원 이름만 있던 책) 변환 */
function bkNorm(b) {
  if (!Array.isArray(b.chs)) b.chs = (b.units || []).length ? b.units.slice(0, 12).map((u, k, a) => bkAIChapter(u, u, k, k === a.length - 1)) : [bkAIChapter(b.title, '들어가며', 0, true)];
  b.chs.forEach(ch => { ch.id = ch.id || uid('ch'); ch.blocks = (ch.blocks || []).filter(x => x && BK_NAME[x.type]); ch.blocks.forEach(x => { x.id = x.id || uid('b'); }); });
  if (b.thr == null) b.thr = 80; if (b.pass == null) b.pass = 60; if (b.on == null) b.on = true; if (b.desc == null) b.desc = ''; if (b.cls == null) b.cls = '';
  b.units = b.chs.map(c => c.title); return b;
}
function bkEnsureAll() { const L = S.lsite; if (!L) return; L.dbooks = (L.dbooks || []).map(bkNorm); S.bkgrades = S.bkgrades || {};
  const B = L.my && L.my.blocks; if (B && !B.some(([k]) => k === 'books')) { const i = B.findIndex(([k]) => k === 'courses'); B.splice(i < 0 ? B.length : i + 1, 0, ['books', true]); } }
{ const base = lsDefault; lsDefault = (...a) => { const D = base(...a); try { const CL = (S.classes || []).filter(c => c.status !== '종료' && (c.curriculum || []).length);
    D.dbooks = D.levels.map((l, i) => { const c = CL[i]; const b = c ? bkFromCourse(c) : bkAIDraft(`${l.name} ${(D.types[i] || D.types[0] || {}).name || ''}`.trim(), 3); return Object.assign(b, { level: i, color: l.color }); });
    const TU = (Array.isArray(S.tuts) ? S.tuts : lsSeedTuts(lsT())).filter(t => /^[\w-]{11}$/.test(t.yt || '')); /* 과정 영상이 YouTube가 아니면 같은 수준 튜토리얼 영상을 1단원에 넣어 바로 재생되게 */
    D.dbooks.forEach((b, i) => { const tu = TU.find(t => t.level === i) || TU[i]; const ch = b.chs[0]; if (!tu || !ch || bkAll(b).some(x => x.type === 'video')) return; ch.blocks.splice(1, 0, bkB('video', { yt: tu.yt, title: tu.title })); }); } catch (e) { console.error(e); } return D; }; }
const bkAll = b => b.chs.flatMap(c => c.blocks);
{ const base = lsEnsure; lsEnsure = (...a) => { base(...a); if (S && S.lsite) bkEnsureAll(); }; }
LS_MYB.splice(LS_MYB.findIndex(([k]) => k === 'courses') + 1, 0, ['books', '내 디지털북 · 완독 증명']);

/* ── 게시본: 학습자에게 필요한 필드만(채점 · 내부 메모 제외) ── */
const bkPubBlock = x => { const s = v => String(v ?? '');
  switch (x.type) {
    case 'text': return { id: x.id, type: x.type, body: s(x.body).slice(0, 8000) };
    case 'key': return { id: x.id, type: x.type, tone: ['key', 'tip', 'warn'].includes(x.tone) ? x.tone : 'key', title: s(x.title).slice(0, 80), body: s(x.body).slice(0, 3000) };
    case 'image': return bkImgOK(x.src) ? { id: x.id, type: x.type, src: x.src, alt: s(x.alt).slice(0, 200), cap: s(x.cap).slice(0, 200) } : null;
    case 'video': return { id: x.id, type: x.type, yt: /^[\w-]{11}$/.test(x.yt || '') ? x.yt : '', title: s(x.title).slice(0, 120) };
    case 'quiz': return { id: x.id, type: x.type, title: s(x.title).slice(0, 80), pts: x.pts, tries: +x.tries || 0, qs: (x.qs || []).slice(0, 20).map(bkQ) };
    case 'flip': return { id: x.id, type: x.type, title: s(x.title).slice(0, 80), cards: (x.cards || []).slice(0, 12).map(c => ({ f: s(c.f).slice(0, 200), b: s(c.b).slice(0, 400) })) };
    case 'order': case 'check': return { id: x.id, type: x.type, title: s(x.title).slice(0, 80), steps: (x.steps || []).slice(0, 10).map(t => s(t).slice(0, 200)), ...(x.type === 'order' ? { pts: x.pts } : {}) };
    case 'write': return { id: x.id, type: x.type, prompt: s(x.prompt).slice(0, 600), pts: +x.pts || 0, guide: s(x.guide).slice(0, 600) };
    case 'item': return { id: x.id, type: x.type, cls: s(x.cls), item: s(x.item), pts: x.pts };
  } return null; };
const bkPub = b => ({ id: b.id, title: b.title, level: b.level, color: b.color, desc: String(b.desc || '').slice(0, 400), cls: b.cls || '', thr: +b.thr || 80, pass: b.pass == null ? 60 : +b.pass, on: b.on !== false, url: b.url || '', units: b.chs.map(c => c.title),
  chs: b.chs.map(ch => ({ id: ch.id, title: ch.title, blocks: ch.blocks.map(bkPubBlock).filter(Boolean) })) });
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); r.dbooks = (S.lsite.dbooks || []).map(bkPub); return r; }; }

/* ── 집계(어드민) ── */
function bkRows(bk) { const C = bkClasses(); const LP = lpRead(); const G = (S.bkgrades || {})[bk.id] || {};
  return Object.entries(LP).map(([sid, lp]) => { const st = (lp.book || {})[bk.id]; const c = bkCalc(bk, st, lp.cls, G[sid], C); return { sid, st: st || {}, c, at: (st && st.at) || '' }; }).filter(r => r.c.started || r.c.done); }
const bkAvg = (a, f) => a.length ? Math.round(a.reduce((s, x) => s + f(x), 0) / a.length) : 0;

/* ── 화면 ── */
MENU.dbook = { label: '디지털북', ws: 'learn' };
Object.keys(PRESET).forEach(ty => { const P = PRESET[ty]; if (!P.on.includes('dbook')) P.on.push('dbook'); });
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); if (S) { lsEnsure(); navAdd('dbook', true); } return r; }; }
VIEWS.dbook = () => { lsEnsure(); const bk = UI.bkId && bkOf(UI.bkId); return bk ? bkEditor(bk) : bkList(); };
function bkList() {
  const L = LSV(); const B = L.dbooks;
  return head('', '읽고 · 보고 · 풀고 · 쓰는 인터랙티브 교재를 단원 · 블록으로 만듭니다. 과정의 영상 · 퀴즈 · 시험 · 과제를 연결하면 진도 · 점수가 과정 평가에도 함께 쌓입니다.',
    `<button class="btn" data-act="bk-ai">${ic('spark', 14)} AI 초안</button><button class="btn" data-act="bk-fromcls">과정으로 만들기</button><button class="btn ink" data-act="bk-new">+ 빈 디지털북</button>`) +
    (B.length ? `<div class="bkgrid">${B.map(b => { const R = bkRows(b); const acts = b.chs.reduce((a, ch) => a + ch.blocks.filter(x => BK_TRACK.has(x.type)).length, 0); const c = b.cls && C(b.cls);
      return `<div class="card bkc ${b.on === false ? 'off' : ''}"><button class="bkcov" style="--c:${esc(b.color)}" data-act="bk-open" data-v="${b.id}"><small>${esc((L.levels[b.level] || {}).name || '')}</small><b>${esc(b.title)}</b><span>${b.chs.length}단원 · 활동 ${acts}개</span></button>
        <div class="bkci"><small class="mini">${c ? `연결 과정 · ${esc(c.name)}` : '연결 과정 없음'}${b.on === false ? ' · 숨김' : ''}</small>
        <div class="bkst">${bar(bkAvg(R, r => r.c.p))}<small>학습자 ${R.length}명 · 평균 진도 ${bkAvg(R, r => r.c.p)}% · 완독 ${R.filter(r => r.c.complete).length}명</small></div>
        <div class="bar2"><button class="btn sm pri" data-act="bk-open" data-v="${b.id}">편집</button><button class="btn sm" data-act="bk-open" data-v="${b.id}" data-k="stat">진도 · 평가</button><a class="btn sm ghost" href="${esc(lsLearnerURL())}#bk/${esc(b.id)}" target="_blank" rel="noopener">학습자 화면</a><button class="btn sm ghost redl" data-act="bk-del" data-v="${b.id}" aria-label="삭제">${ic('x', 14)}</button></div></div></div>`; }).join('')}</div>`
      : `<div class="card"><div class="empty">디지털북이 없습니다. [과정으로 만들기]를 누르면 과정의 영상 · 퀴즈 · 시험 · 과제가 단원별로 정리된 책이 바로 만들어집니다.</div></div>`) +
    `<p class="mini">학습자 화면 › 디지털북 페이지와 마이페이지에 실립니다. 바꾼 뒤 [게시]해야 학습자에게 보입니다.</p>`;
}
const bkSum = (b, CL) => { const s = v => String(v || '').replace(/[#*\-\n]+/g, ' ').trim();
  switch (b.type) { case 'text': return s(b.body).slice(0, 60); case 'key': return `${b.title || ''} — ${s(b.body).slice(0, 40)}`; case 'image': return b.cap || b.alt || (String(b.src || '').startsWith('data:') ? '올린 이미지' : b.src || '이미지 없음');
    case 'video': return b.yt ? `YouTube ${b.yt}${b.title ? ' · ' + b.title : ''}` : '영상 주소 없음'; case 'quiz': return `${(b.qs || []).length}문항 · ${bkPts(b)}점`; case 'flip': return `${(b.cards || []).length}장`;
    case 'order': return `${(b.steps || []).length}단계 · ${bkPts(b)}점`; case 'check': return `${(b.steps || []).length}단계`; case 'write': return `${s(b.prompt).slice(0, 40)} · ${+b.pts ? b.pts + '점 채점' : '제출만'}`;
    case 'item': { const c = CL.find(x => x.id === b.cls); const it = c && c.items.find(x => x.id === b.item); return it ? `${c.name} › ${it.title} (${ITEMX[it.type] || it.type})${bkPts(b, CL) ? ' · ' + bkPts(b, CL) + '점' : ''}` : '⚠ 연결된 항목을 찾을 수 없습니다'; } } return ''; };
function bkEditor(bk) {
  const n = clamp(UI.bkCh || 0, 0, Math.max(0, bk.chs.length - 1)); UI.bkCh = n; const ch = bk.chs[n]; const tb = UI.bkT || 'edit'; const CL = bkClasses(); const dev = UI.lsDev || 'pc';
  const acts = bk.chs.reduce((a, c) => a + c.blocks.filter(x => BK_TRACK.has(x.type)).length, 0); const pts = bk.chs.reduce((a, c) => a + c.blocks.reduce((s, x) => s + bkPts(x, CL), 0), 0);
  let body = '';
  if (tb === 'edit' && UI.bkView !== 'list') body = `<section class="bkw-wrap"><div class="card lspg bkw-side"><div class="ch"><b>단원</b><small>${bk.chs.length}개</small></div>
      ${bk.chs.map((c, i) => `<div class="lsrow ${i === n ? 'on' : ''}"><span class="lsnum">${i + 1}</span><button class="lsname" data-act="bk-ch" data-v="${i}">${esc(c.title)}<small>${c.blocks.length}블록 · 활동 ${c.blocks.filter(x => BK_TRACK.has(x.type)).length}</small></button><button class="btn sm ghost" data-act="bk-chmv" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="bk-chmv" data-v="${i}" data-d="1" aria-label="아래로">↓</button></div>`).join('') || '<div class="empty">단원이 없습니다.</div>'}
      <div class="bar2"><input id="bkChNew" placeholder="새 단원 제목" maxlength="60" aria-label="새 단원 제목"><button class="btn sm ink" data-act="bk-chadd">+ 단원</button></div>
      <button class="btn sm" data-act="bk-chai">${ic('spark', 14)} 제목으로 AI 단원 추가</button></div>
<div class="bkw-page"><div class="bkw-top"><b>실시간 책 화면</b><small class="mini">글자를 두 번 눌러 바로 고치고, 섹션 사이 [+ 섹션 추가]로 넣습니다. 바꾼 내용은 바로 저장됩니다.</small><span class="sp"></span><button class="btn sm" data-act="bk-view" data-v="list">블록 목록으로 보기</button><a class="btn sm" href="${esc(lsLearnerURL())}#bk/${esc(bk.id)}/${n + 1}" target="_blank" rel="noopener">학습자 화면</a></div>${BKW.cmdBox('db')}${ch ? BKW.html(bk, { ch: n }) : '<div class="empty">왼쪽에서 단원을 추가하세요.</div>'}</div></section>`;
  else if (tb === 'edit') body = `<section class="lsb bkb"><div class="card lspg"><div class="ch"><b>단원</b><small>${bk.chs.length}개</small></div>
      ${bk.chs.map((c, i) => `<div class="lsrow ${i === n ? 'on' : ''}"><span class="lsnum">${i + 1}</span><button class="lsname" data-act="bk-ch" data-v="${i}">${esc(c.title)}<small>${c.blocks.length}블록 · 활동 ${c.blocks.filter(x => BK_TRACK.has(x.type)).length}</small></button><button class="btn sm ghost" data-act="bk-chmv" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="bk-chmv" data-v="${i}" data-d="1" aria-label="아래로">↓</button></div>`).join('') || '<div class="empty">단원이 없습니다.</div>'}
      <div class="bar2"><input id="bkChNew" placeholder="새 단원 제목" maxlength="60" aria-label="새 단원 제목"><button class="btn sm ink" data-act="bk-chadd">+ 단원</button></div>
      <button class="btn sm" data-act="bk-chai">${ic('spark', 14)} 제목으로 AI 단원 추가</button></div>
    <div class="card lssec">${ch ? `<div class="ch"><input class="bkchn" data-chg="bk-chname" value="${esc(ch.title)}" maxlength="60" aria-label="단원 제목"><button class="btn sm ghost redl" data-act="bk-chdel" data-v="${n}">단원 삭제</button></div>
      ${ch.blocks.map((x, j) => `<div class="lsrow sec"><span class="lsnum">${j + 1}</span><div class="lsname"><b>${esc(BK_NAME[x.type])}${BK_TRACK.has(x.type) ? ' <em class="bkact">활동</em>' : ''}</b><small>${esc(bkSum(x, CL))}</small></div>
        <button class="btn sm ghost" data-act="bk-bmv" data-v="${j}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="bk-bmv" data-v="${j}" data-d="1" aria-label="아래로">↓</button><button class="btn sm" data-act="bk-bed" data-v="${j}">편집</button><button class="btn sm ghost redl" data-act="bk-bdel" data-v="${j}" aria-label="삭제">${ic('x', 14)}</button></div>`).join('') || '<div class="empty">블록이 없습니다. 아래에서 추가하세요.</div>'}
      <div class="bkpal">${BK_TYPES.map(([k, nm, d]) => `<button class="${k === 'item' ? 'hl' : ''}" data-act="bk-badd" data-v="${k}" title="${esc(d)}"><b>+ ${esc(nm)}</b><small>${esc(d)}</small></button>`).join('')}</div>` : '<div class="empty">왼쪽에서 단원을 추가하세요.</div>'}</div>
    <div class="card lspv"><div class="ch"><b>미리보기</b><small>${n + 1}단원</small><span class="sp"></span><button class="btn sm" data-act="bk-view" data-v="live">실시간 책 화면</button><div class="seg2">${[['pc', 'PC'], ['mo', '모바일']].map(([k, l]) => `<button class="${dev === k ? 'on' : ''}" data-act="ls-dev" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="lsframe ${dev}"><iframe id="lsPv" title="디지털북 미리보기" src="learner.html?preview=1&r=${Date.now() % 1e6}#bk/${esc(bk.id)}/${n + 1}"></iframe></div><small class="mini">초안 미리보기 · 문제를 풀어 봐도 기록되지 않습니다.</small></div></section>`;
  else body = bkStatView(bk, CL);
  return head('', `<b>${esc(bk.title)}</b> · ${bk.chs.length}단원 · 활동 ${acts}개 · 배점 ${pts}점 · 완독 기준 진도 ${bk.thr}%${pts ? ` + ${bk.pass}점` : ''} ${bk.on === false ? tag('숨김', 'y') : ''}`,
    `<button class="btn" data-act="bk-back">← 목록</button><button class="btn" data-act="bk-set" data-v="${bk.id}">책 설정</button><a class="btn" href="${esc(lsLearnerURL())}#bk/${esc(bk.id)}" target="_blank" rel="noopener">학습자 화면</a><button class="btn pri" data-act="ls-pub">게시</button>`) +
    tabs('bkT', [['edit', '단원 · 블록'], ['stat', '진도 · 평가']], tb) + body;
}
function bkStatView(bk, CL) {
  const R = bkRows(bk); const G = (S.bkgrades || {})[bk.id] || {}; const lab = S.org.type === 'univ' ? '학번' : '번호';
  const writes = []; R.forEach(r => bk.chs.forEach((ch, ci) => ch.blocks.filter(x => x.type === 'write').forEach(x => { const s = (r.st.b || {})[x.id]; if (s && s.ans) writes.push({ r, ch, ci, x, s, g: (G[r.sid] || {})[x.id] }); })));
  writes.sort((a, b) => (!!a.g - !!b.g) || String(b.s.at || '').localeCompare(String(a.s.at || '')));
  const qstat = []; bk.chs.forEach((ch, ci) => ch.blocks.filter(x => x.type === 'quiz' || x.type === 'order').forEach(x => { const A = R.map(r => (r.st.b || {})[x.id]).filter(s => s && s.score != null); if (!A.length) return;
    const wrong = x.type === 'quiz' ? (x.qs || []).map((q, k) => ({ q: q.q, rate: Math.round(A.filter(s => s.ok && s.ok[k] === false).length / A.length * 100) })).sort((a, b) => b.rate - a.rate)[0] : null;
    qstat.push([`${ci + 1}. ${esc(ch.title)}`, esc(BK_NAME[x.type] + (x.title && x.title !== BK_NAME[x.type] ? ' · ' + x.title : '')), A.length + '명', bkAvg(A, s => s.score) + '점', wrong && wrong.rate ? `<small>${esc(wrong.q.slice(0, 40))} — 오답 ${wrong.rate}%</small>` : '—']); }));
  return `<div class="kpis bkkpis">${kpi('학습자', R.length, '책을 연 학습자')}${kpi('평균 진도', bkAvg(R, r => r.c.p), '', '', '%')}${kpi('완독', R.filter(r => r.c.complete).length, `기준 진도 ${bk.thr}%${R[0] && R[0].c.pts ? ` + ${bk.pass}점` : ''}`, 'ok')}${kpi('평균 점수', R.filter(r => r.c.tried).length ? bkAvg(R.filter(r => r.c.tried), r => r.c.score) : '—')}${kpi('채점 대기', writes.filter(w => !w.g && +w.x.pts).length, '서술 블록', writes.some(w => !w.g && +w.x.pts) ? 'warn' : '')}</div>
    <section class="g2c"><div class="card"><div class="ch"><b>단원별 완료율</b><span class="sp"></span><button class="btn sm" data-act="ls-lpsync">활동 새로 고침</button></div>${bk.chs.map((ch, i) => { const v = bkAvg(R, r => (r.c.chs[i] || {}).p || 0); return `<div class="bkfun"><span>${i + 1}. ${esc(ch.title)}</span>${bar(v)}<b>${v}%</b></div>`; }).join('') || '<div class="empty">단원이 없습니다.</div>'}</div>
      <div class="card"><div class="ch"><b>문제 분석</b><small>확인 문제 · 순서 맞추기</small></div>${table(['단원', '활동', '응답', '평균', '오답 많은 문항'], qstat, '아직 응답이 없습니다.')}</div></section>
    <div class="card"><div class="ch"><b>학습자별 진도 · 점수</b><small>${lab}만 저장합니다</small></div>${table([lab, '진도', '점수', '상태', '최근'], R.sort((a, b) => b.c.p - a.c.p).slice(0, 200).map(r => [esc(r.sid), `${bar(r.c.p)} <small>${r.c.p}% · ${r.c.done}/${r.c.tot}</small>`, r.c.score == null || !r.c.tried ? '—' : r.c.score + '점', r.c.complete ? tag('완독', 'g') : r.c.pend ? tag('채점 대기', 'y') : tag('진행 중'), esc(String(r.at).slice(0, 16).replace('T', ' '))]), '아직 이 책을 연 학습자가 없습니다.')}</div>
    <div class="card"><div class="ch"><b>서술 · 생각 쓰기 채점</b><small>배점이 있는 블록은 점수를 넣어야 완독 판정에 반영됩니다</small></div>${writes.length ? writes.slice(0, 60).map(w => `<div class="bkgr" data-bk="${esc(bk.id)}" data-sid="${esc(w.r.sid)}" data-blk="${esc(w.x.id)}"><div class="bkgh"><b>${esc(w.r.sid)}</b><small>${w.ci + 1}단원 · ${esc(w.ch.title)} · ${esc(String(w.s.at || '').slice(0, 16).replace('T', ' '))}</small>${w.g ? tag(`채점 ${w.g.score}/${w.x.pts}`, 'g') : +w.x.pts ? tag('채점 대기', 'y') : tag('제출만')}</div>
        <p class="bkq">${esc(w.x.prompt)}</p><blockquote>${esc(w.s.ans)}</blockquote>${+w.x.pts ? `<div class="bar2"><label class="fl">점수(0~${w.x.pts})<input type="number" name="score" min="0" max="${w.x.pts}" value="${w.g ? esc(String(w.g.score)) : ''}"></label><label class="fl grow">피드백<input name="fb" maxlength="500" value="${esc(w.g ? w.g.fb || '' : '')}" placeholder="학습자에게 보이는 피드백"></label><button class="btn sm pri" data-act="bk-grade">저장</button></div>` : ''}</div>`).join('') : '<div class="empty">제출된 서술이 없습니다.</div>'}</div>`;
}

/* ── 동작 ── */
const bkCur = () => bkOf(UI.bkId); const bkCh = () => { const b = bkCur(); return b && b.chs[UI.bkCh || 0]; };
const bkOpen = (id, tb) => { UI.bkId = id; UI.bkCh = 0; UI.bkT = tb || 'edit'; if (typeof CUR === 'undefined' || CUR.tab !== 'dbook') go('dbook'); else render(); };
ACT['bk-open'] = el => bkOpen(el.dataset.v, el.dataset.k);
ACT['bk-back'] = () => { UI.bkId = null; render(); };
ACT['bk-ch'] = el => { UI.bkCh = +el.dataset.v; render(); };
ACT['bk-new'] = () => { const b = bkNorm(bkNew('새 디지털북')); b.chs = [{ id: uid('ch'), title: '1단원', blocks: [bkB('text', { body: '# 1단원\n여기에 내용을 입력하세요.' })] }]; bkNorm(b); bkL().push(b); logAudit(`디지털북 추가 — ${b.title}`); save(); bkOpen(b.id); ACT['bk-set']({ dataset: { v: b.id } }); };
ACT['bk-fromcls'] = () => { const CS = S.classes.filter(c => (c.curriculum || []).length); if (!CS.length) { toast(`먼저 ${t('cls')}${AI.j(t('cls'), '을')} 만들어 주세요.`, 'warn'); return; }
  modal('과정으로 디지털북 만들기', `<p class="mini">과정의 '장'(없으면 차시)으로 단원을 나눕니다. 강의자료는 본문 · 핵심 카드 · 실습 체크로 옮기고, 영상 · 퀴즈 · 시험 · 과제 · 설문은 연결합니다 — 학습자가 책에서 풀면 과정 진도 · 점수에도 그대로 기록됩니다.</p>
    <div class="chk one">${CS.map((c, i) => `<label><input type="radio" name="c" value="${c.id}" ${i ? '' : 'checked'}> <b>${esc(c.name)}</b> <small class="mini">${c.curriculum.length}항목 · ${c.curriculum.filter(x => ['video', 'quiz', 'exam', 'assign'].includes(x.type)).length}개 연결</small></label>`).join('')}</div>`,
    [{ id: 'x', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const c = C(fv(w, 'c') || (w.querySelector('[name=c]:checked') || {}).value); if (!c) return false; const b = bkFromCourse(c); bkL().push(b); logAudit(`디지털북 생성(과정) — ${b.title}`); save(); bkOpen(b.id); toast(`「${b.title}」 ${b.chs.length}단원을 만들었습니다. 미리보기로 확인한 뒤 게시하세요.`, 'ok'); } }], true); };
ACT['bk-ai'] = () => modal('AI 초안으로 디지털북 만들기', `<label class="fl">주제<input name="t" maxlength="60" placeholder="예: 생성형 AI로 보고서 쓰기" required></label><div class="form2"><label class="fl">단원 수<input name="n" type="number" min="1" max="8" value="3"></label><label class="fl">수준<select name="lv">${LSV().levels.map((l, i) => `<option value="${i}">${esc(l.name)}</option>`).join('')}</select></label></div><p class="mini">단원마다 설명 · 핵심 박스 · 펼쳐보기 카드 · 확인 문제를 넣고, 순서 맞추기 · 따라 하기 · 서술을 섞습니다. 만든 뒤 블록을 고치세요.</p>`,
  [{ id: 'x', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const tp = fv(w, 't'); if (!tp) { toast('주제를 입력하세요.', 'warn'); return false; } const lv = +fv(w, 'lv') || 0; const b = bkAIDraft(tp, clamp(+fv(w, 'n') || 3, 1, 8), { level: lv, color: (LSV().levels[lv] || {}).color || '#5C74F6' }); bkL().push(b); S.ai.usage++; logAudit(`디지털북 생성(AI) — ${b.title}`); save(); bkOpen(b.id); toast('AI 초안을 만들었습니다. 내용을 확인 · 수정하세요.', 'ok'); } }]);
ACT['bk-del'] = el => { const b = bkOf(el.dataset.v); modal('디지털북 삭제', `<p>「${esc(b.title)}」을(를) 삭제합니다. 학습자 기록은 남지만 책은 학습자 화면에서 사라집니다(게시 후).</p>`, [{ id: 'x', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { LSV().dbooks = bkL().filter(x => x !== b); logAudit(`디지털북 삭제 — ${b.title}`); save(); render(); } }]); };
ACT['bk-set'] = el => { const b = bkOf(el.dataset.v); const L = LSV();
  modal('책 설정', `<label class="fl">제목<input name="title" value="${esc(b.title)}" maxlength="60"></label><label class="fl">소개<textarea name="desc" rows="3" maxlength="400">${esc(b.desc || '')}</textarea></label>
    <div class="form2"><label class="fl">수준<select name="level">${L.levels.map((l, i) => `<option value="${i}" ${b.level === i ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label><label class="fl">표지 색<input name="color" type="color" value="${esc(b.color)}"></label></div>
    <label class="fl">연결 과정(선택 · 마이페이지 · 수료 흐름에 함께 표시)<select name="cls"><option value="">없음</option>${S.classes.map(c => `<option value="${c.id}" ${b.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <div class="form2"><label class="fl">완독 기준 진도(%)<input name="thr" type="number" min="10" max="100" value="${+b.thr || 80}"></label><label class="fl">통과 점수(배점이 있을 때)<input name="pass" type="number" min="0" max="100" value="${b.pass == null ? 60 : b.pass}"></label></div>
    <label class="fl">외부 뷰어 주소(선택 · 단원이 비어 있을 때만 사용, https://)<input name="url" value="${esc(b.url || '')}"></label><label class="ckl"><input type="checkbox" name="on" ${b.on !== false ? 'checked' : ''}> 학습자 화면에 표시</label>`,
    [{ id: 'x', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const url = fv(w, 'url'); if (url && !/^https:\/\//.test(url)) { toast('뷰어 주소는 https://로 시작해야 합니다.', 'warn'); return false; }
      Object.assign(b, { title: fv(w, 'title').slice(0, 60) || b.title, desc: fv(w, 'desc').slice(0, 400), level: +fv(w, 'level') || 0, color: fv(w, 'color') || b.color, cls: fv(w, 'cls'), thr: clamp(+fv(w, 'thr') || 80, 10, 100), pass: clamp(+fv(w, 'pass') || 0, 0, 100), url, on: fv(w, 'on') }); save(); render(); toast('책 설정을 저장했습니다.', 'ok'); } }], true); };
ACT['bk-chadd'] = () => { const b = bkCur(); if (b.chs.length >= BK_MAX_CH) { toast(`단원은 ${BK_MAX_CH}개까지입니다.`, 'warn'); return; } const tl = ($('#bkChNew').value || '').trim() || `${b.chs.length + 1}단원`; b.chs.push({ id: uid('ch'), title: tl.slice(0, 60), blocks: [bkB('text', { body: `# ${tl}\n여기에 내용을 입력하세요.` })] }); bkNorm(b); UI.bkCh = b.chs.length - 1; save(); render(); };
ACT['bk-chai'] = () => { const b = bkCur(); if (b.chs.length >= BK_MAX_CH) return; const tl = ($('#bkChNew').value || '').trim(); if (!tl) { toast('새 단원 제목을 입력하면 그 제목으로 내용을 만듭니다.', 'warn'); $('#bkChNew').focus(); return; } b.chs.push(bkAIChapter(tl, tl, b.chs.length, false)); bkNorm(b); S.ai.usage++; UI.bkCh = b.chs.length - 1; save(); render(); toast(`「${tl}」 단원을 만들었습니다.`, 'ok'); };
ACT['bk-chmv'] = el => { const L = bkCur().chs; const i = +el.dataset.v, j = i + +el.dataset.d; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; UI.bkCh = j; bkNorm(bkCur()); save(); render(); };
ACT['bk-chname'] = el => { const ch = bkCh(); ch.title = el.value.trim().slice(0, 60) || ch.title; bkNorm(bkCur()); save(); render(); };
ACT['bk-chdel'] = () => { const b = bkCur(); const ch = bkCh(); modal('단원 삭제', `<p>「${esc(ch.title)}」 단원과 블록 ${ch.blocks.length}개를 삭제합니다.</p>`, [{ id: 'x', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { b.chs = b.chs.filter(x => x !== ch); UI.bkCh = Math.max(0, (UI.bkCh || 0) - 1); bkNorm(b); save(); render(); } }]); };
ACT['bk-bmv'] = el => { const L = bkCh().blocks; const i = +el.dataset.v, j = i + +el.dataset.d; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; save(); render(); };
ACT['bk-bdel'] = el => { bkCh().blocks.splice(+el.dataset.v, 1); save(); render(); };
ACT['bk-badd'] = el => { const ch = bkCh(); if (!ch) return; if (ch.blocks.length >= BK_MAX_BL) { toast(`블록은 단원마다 ${BK_MAX_BL}개까지입니다.`, 'warn'); return; } const ty = el.dataset.v;
  const D = { text: { body: '# 소제목\n내용을 입력하세요.\n- 목록 항목' }, key: { tone: 'key', title: '핵심', body: '' }, image: { src: '', alt: '', cap: '' }, video: { yt: '', title: '' }, quiz: { title: '확인 문제', pts: 10, qs: AI.questions(clean(ch.title), 2, '보통', ['mc', 'ox']).map(bkQ) },
    flip: { title: '펼쳐서 확인하기', cards: [{ f: '질문 · 용어', b: '답 · 설명' }] }, order: { title: '순서 맞추기', steps: ['첫 단계', '두 번째 단계', '세 번째 단계'], pts: 10 }, check: { title: '따라 하기', steps: ['첫 단계', '두 번째 단계', '세 번째 단계'] }, write: { prompt: '배운 내용을 내 말로 정리해 보세요.', pts: 0, guide: '' }, item: { cls: '', item: '', pts: '' } }[ty];
  bkEdit(bkB(ty, JSON.parse(JSON.stringify(D))), true); };
ACT['bk-bed'] = el => bkEdit(bkCh().blocks[+el.dataset.v], false);

/* 블록 편집 창 */
let BKE = null;
function bkEdit(b, isNew) {
  BKE = { b: JSON.parse(JSON.stringify(b)), isNew, ref: b }; const x = BKE.b; const F = (k, l, v, o = '') => `<label class="fl">${l}<input name="${k}" value="${esc(v ?? '')}" ${o}></label>`; const TA = (k, l, v, r = 5, max = 8000) => `<label class="fl">${l}<textarea name="${k}" rows="${r}" maxlength="${max}">${esc(v ?? '')}</textarea></label>`;
  let h = '';
  if (x.type === 'text') h = TA('body', '본문 — # 소제목 · - 목록 · **굵게** · 빈 줄로 문단 구분', x.body, 12);
  if (x.type === 'key') h = `<div class="form2"><label class="fl">종류<select name="tone">${[['key', '핵심'], ['tip', '팁 · 목표'], ['warn', '주의']].map(([k, l]) => `<option value="${k}" ${x.tone === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>${F('title', '제목', x.title, 'maxlength="80"')}</div>${TA('body', '내용', x.body, 6, 3000)}`;
  if (x.type === 'image') h = `${F('src', '이미지 주소(https://) — 또는 아래에서 올리기', String(x.src || '').startsWith('data:') ? '' : x.src)}<label class="fl">이미지 올리기(자동으로 1200px · 약 300KB 이하로 줄임)<input type="file" accept="image/png,image/jpeg,image/webp" data-chg="bk-img"></label><input type="hidden" name="data" value="${String(x.src || '').startsWith('data:') ? esc(x.src) : ''}"><div id="bkImgPv">${bkImgOK(x.src) && String(x.src).startsWith('data:') ? `<img src="${esc(x.src)}" alt="" class="bkimgpv">` : x.src ? '<small class="mini">외부 이미지는 미리보기 창에서 확인하세요.</small>' : ''}</div>${F('alt', '대체 텍스트(화면 낭독용)', x.alt, 'maxlength="200"')}${F('cap', '캡션', x.cap, 'maxlength="200"')}`;
  if (x.type === 'video') h = `${F('yt', 'YouTube 주소 또는 ID', x.yt, 'placeholder="https://youtu.be/…"')}${F('title', '영상 제목(선택)', x.title, 'maxlength="120"')}<p class="mini">학습자가 실제로 재생한 구간만 누적해 80% 이상이면 완료로 기록합니다(배속 2배 이하).</p>`;
  if (x.type === 'quiz') h = `<div class="form2">${F('title', '제목', x.title, 'maxlength="80"')}${F('pts', '배점', x.pts ?? 10, 'type="number" min="0" max="100"')}${F('tries', '응시 횟수(0 = 무제한)', x.tries || 0, 'type="number" min="0" max="10"')}</div><div id="bkqz"></div><div class="bar2"><button type="button" class="btn sm" data-act="bk-qadd">+ 문항</button><button type="button" class="btn sm" data-act="bk-qai">${ic('spark', 14)} AI 문항 2개</button><button type="button" class="btn sm" data-act="bk-qbank">문항 은행</button></div>`;
  if (x.type === 'flip') h = `${F('title', '제목', x.title, 'maxlength="80"')}${TA('cards', "카드(줄마다 '앞면 | 뒷면')", (x.cards || []).map(c => `${c.f} | ${c.b}`).join('\n'), 6, 6000)}`;
  if (x.type === 'order') h = `<div class="form2">${F('title', '제목', x.title, 'maxlength="80"')}${F('pts', '배점', x.pts ?? 10, 'type="number" min="0" max="100"')}</div>${TA('steps', '바른 순서대로 한 줄에 한 단계(학습자에게는 섞여서 보입니다)', (x.steps || []).join('\n'), 6, 2000)}`;
  if (x.type === 'check') h = `${F('title', '제목', x.title, 'maxlength="80"')}${TA('steps', '단계(줄마다)', (x.steps || []).join('\n'), 6, 2000)}`;
  if (x.type === 'write') h = `${TA('prompt', '질문 · 과제 안내', x.prompt, 3, 600)}<div class="form2">${F('pts', '배점(0 = 제출만, 채점 없음)', x.pts || 0, 'type="number" min="0" max="100"')}</div>${TA('guide', '제출 후 보여 줄 안내 · 예시 답안(선택)', x.guide, 3, 600)}`;
  if (x.type === 'item') h = bkItemForm(x);
  modal(`${isNew ? '블록 추가' : '블록 편집'} — ${BK_NAME[x.type]}`, h, [{ id: 'x', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => bkEditSave(w) }], true);
  if (x.type === 'quiz') bkQzDraw();
}
function bkItemForm(x) { const CL = bkClasses().filter(c => c.items.some(i => i.type !== 'chapter')); const c = CL.find(y => y.id === x.cls) || CL[0];
  return `<label class="fl">${esc(t('cls'))}<select name="cls" data-chg="bk-icls">${CL.map(y => `<option value="${y.id}" ${c && y.id === c.id ? 'selected' : ''}>${esc(y.name)}</option>`).join('')}</select></label><div id="bkits">${bkItemList(c, x)}</div>
    <label class="fl">배점(퀴즈 · 시험만, 비우면 퀴즈 10 · 시험 20)<input name="pts" type="number" min="0" max="100" value="${esc(x.pts ?? '')}"></label><p class="mini">학습자가 책에서 보고 · 풀고 · 제출하면 그 과정의 진도 · 점수 · 과제 검수 흐름에 그대로 기록됩니다.</p>`; }
const bkItemList = (c, x) => !c ? '<div class="empty">연결할 과정 항목이 없습니다.</div>' : `<div class="chk one">${c.items.filter(i => i.type !== 'chapter').map(i => `<label><input type="${BKE && BKE.isNew ? 'checkbox' : 'radio'}" name="item" value="${i.id}" ${x.item === i.id ? 'checked' : ''}> <em class="bkact">${esc(ITEMX[i.type] || i.type)}</em> ${esc(i.title)}${i.type === 'video' && !i.yt ? ' <small class="mini">(YouTube 아님 · 확인 버튼으로 완료)</small>' : ''}</label>`).join('')}</div>${BKE && BKE.isNew ? '<p class="mini">여러 개를 고르면 순서대로 블록이 추가됩니다.</p>' : ''}`;
ACT['bk-icls'] = el => { const c = bkClasses().find(y => y.id === el.value); $('#bkits').innerHTML = bkItemList(c, BKE.b); };
function bkQzDraw() { const Q = BKE.b.qs = BKE.b.qs || []; const box = $('#bkqz'); if (!box) return;
  box.innerHTML = Q.map((q, k) => `<div class="bkqe" data-k="${k}"><div class="qh"><b>${k + 1}</b><select data-bq="${k}" data-f="t" aria-label="유형">${[['mc', '객관식'], ['ox', 'OX'], ['short', '단답']].map(([v, l]) => `<option value="${v}" ${q.t === v ? 'selected' : ''}>${l}</option>`).join('')}</select><input data-bq="${k}" data-f="q" value="${esc(q.q)}" placeholder="문제" aria-label="문제"><button type="button" class="btn sm ghost redl" data-act="bk-qdel" data-v="${k}" aria-label="문항 삭제">${ic('x', 14)}</button></div>
    ${q.t === 'mc' ? `<div class="bkopts">${(q.opts || []).map((o, j) => `<label><input type="radio" name="ans${k}" data-bq="${k}" data-f="a" value="${j}" ${String(q.a) === String(j) ? 'checked' : ''} aria-label="정답"><input data-bq="${k}" data-f="o${j}" value="${esc(o)}" placeholder="보기 ${j + 1}"></label>`).join('')}</div>` : q.t === 'ox' ? `<div class="bkopts">${['O', 'X'].map(v => `<label><input type="radio" name="ans${k}" data-bq="${k}" data-f="a" value="${v}" ${String(q.a).toUpperCase() === v ? 'checked' : ''}> ${v}</label>`).join('')}</div>` : `<input data-bq="${k}" data-f="a" value="${esc(q.a)}" placeholder="정답(쉼표로 여러 개 허용)">`}
    <input data-bq="${k}" data-f="exp" value="${esc(q.exp || '')}" placeholder="해설(채점 후 보임)"></div>`).join('') || '<div class="empty">문항이 없습니다.</div>'; }
document.addEventListener('input', e => { const el = e.target.closest('[data-bq]'); if (!el || !BKE) return; const q = BKE.b.qs[+el.dataset.bq]; const f = el.dataset.f; if (/^o\d$/.test(f)) q.opts[+f[1]] = el.value; else q[f] = el.value; });
document.addEventListener('change', e => { const el = e.target.closest('[data-bq]'); if (!el || !BKE) return; const q = BKE.b.qs[+el.dataset.bq]; if (el.dataset.f === 't') { q.t = el.value; q.opts = q.t === 'mc' ? (q.opts && q.opts.length ? q.opts : ['', '', '', '']) : []; q.a = q.t === 'ox' ? 'O' : q.t === 'mc' ? '0' : ''; bkQzDraw(); } else if (el.dataset.f === 'a') q.a = el.value; });
ACT['bk-qadd'] = () => { BKE.b.qs.push({ t: 'mc', q: '', opts: ['', '', '', ''], a: '0', exp: '' }); bkQzDraw(); };
ACT['bk-qdel'] = el => { BKE.b.qs.splice(+el.dataset.v, 1); bkQzDraw(); };
ACT['bk-qai'] = () => { const ch = bkCh(); BKE.b.qs.push(...AI.questions(clean(ch ? ch.title : bkCur().title), 2, '보통', ['mc', 'ox']).map(bkQ)); S.ai.usage++; bkQzDraw(); };
ACT['bk-qbank'] = () => { const B = (S.bank || []).filter(q => ['mc', 'ox', 'short'].includes(q.t)); if (!B.length) { toast('문항 은행에 객관식 · OX · 단답 문항이 없습니다.', 'warn'); return; } const box = $('#bkqz');
  box.insertAdjacentHTML('beforebegin', `<div class="bkbank card in2"><div class="ch"><b>문항 은행</b><span class="sp"></span><button type="button" class="btn sm pri" data-act="bk-qbankok">선택 추가</button></div><div class="chk one">${B.slice(0, 80).map((q, k) => `<label><input type="checkbox" class="bkbq" value="${k}"> ${esc(String(q.q).slice(0, 70))}</label>`).join('')}</div></div>`); };
ACT['bk-qbankok'] = () => { const B = (S.bank || []).filter(q => ['mc', 'ox', 'short'].includes(q.t)); $$('.bkbq:checked').forEach(c => BKE.b.qs.push(bkQ(B[+c.value]))); const p = $('.bkbank'); p && p.remove(); bkQzDraw(); };
ACT['bk-img'] = el => { const f = el.files && el.files[0]; if (!f) return; if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast('PNG · JPG · WEBP만 올릴 수 있습니다.', 'warn'); return; }
  const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { let s = Math.min(1, 1200 / Math.max(im.width, im.height)), q = 0.82, out = '';
    for (let k = 0; k < 5; k++) { const cv = document.createElement('canvas'); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); out = cv.toDataURL('image/jpeg', q); if (out.length < 400000) break; s *= 0.8; q = Math.max(0.5, q - 0.1); }
    if (out.length >= 400000) { toast('이미지가 너무 큽니다. 더 작은 이미지를 올려 주세요.', 'warn'); return; }
    const w = $('#modal'); w.querySelector('[name=data]').value = out; w.querySelector('[name=src]').value = ''; $('#bkImgPv').innerHTML = `<img src="${out}" alt="" class="bkimgpv"><small class="mini">${Math.round(out.length / 1024)}KB로 줄였습니다.</small>`; }; im.src = rd.result; }; rd.readAsDataURL(f); };
function bkEditSave(w) {
  const x = BKE.b; const g = n => fv(w, n); const lines = n => g(n).split('\n').map(s => s.trim()).filter(Boolean);
  if (x.type === 'text') x.body = g('body');
  if (x.type === 'key') Object.assign(x, { tone: g('tone'), title: g('title'), body: g('body') });
  if (x.type === 'image') { const src = g('data') || g('src'); if (!bkImgOK(src)) { toast('https:// 주소를 넣거나 이미지를 올려 주세요.', 'warn'); return false; } Object.assign(x, { src, alt: g('alt'), cap: g('cap') }); }
  if (x.type === 'video') { const yt = ytOf(g('yt')); if (!yt) { toast('YouTube 주소를 확인하세요.', 'warn'); return false; } Object.assign(x, { yt, title: g('title') }); }
  if (x.type === 'quiz') { const Q = (x.qs || []).filter(q => String(q.q).trim()); if (!Q.length) { toast('문항을 1개 이상 입력하세요.', 'warn'); return false; } const bad = Q.findIndex(q => q.t === 'mc' && q.opts.filter(o => String(o).trim()).length < 2); if (bad >= 0) { toast(`${bad + 1}번 객관식 보기를 2개 이상 입력하세요.`, 'warn'); return false; }
    Object.assign(x, { title: g('title'), pts: clamp(+g('pts') || 0, 0, 100), tries: clamp(+g('tries') || 0, 0, 10), qs: Q.map(bkQ) }); }
  if (x.type === 'flip') { x.title = g('title'); x.cards = lines('cards').slice(0, 12).map(l => { const [f, ...b] = l.split('|'); return { f: f.trim(), b: b.join('|').trim() }; }).filter(c => c.f); if (!x.cards.length) { toast('카드를 1장 이상 입력하세요.', 'warn'); return false; } }
  if (x.type === 'order' || x.type === 'check') { x.title = g('title'); x.steps = lines('steps').slice(0, 10); if (x.steps.length < (x.type === 'order' ? 3 : 1)) { toast(x.type === 'order' ? '순서 맞추기는 3단계 이상 필요합니다.' : '단계를 입력하세요.', 'warn'); return false; } if (x.type === 'order') x.pts = clamp(+g('pts') || 0, 0, 100); }
  if (x.type === 'write') { if (!g('prompt')) { toast('질문을 입력하세요.', 'warn'); return false; } Object.assign(x, { prompt: g('prompt'), pts: clamp(+g('pts') || 0, 0, 100), guide: g('guide') }); }
  const ch = bkCh();
  if (x.type === 'item') { const ids = $$('[name=item]:checked', w).map(i => i.value); if (!ids.length) { toast('연결할 항목을 고르세요.', 'warn'); return false; } const pts = g('pts') === '' ? '' : clamp(+g('pts') || 0, 0, 100); const cls = g('cls');
    if (BKE.isNew) { ids.forEach(id => ch.blocks.push(bkB('item', { cls, item: id, pts }))); save(); render(); toast(`과정 항목 ${ids.length}개를 연결했습니다.`, 'ok'); return; }
    Object.assign(x, { cls, item: ids[0], pts }); }
  if (BKE.isNew) ch.blocks.push(x); else Object.assign(BKE.ref, x);
  save(); render(); toast('블록을 저장했습니다. 학습자에게는 [게시] 후 반영됩니다.', 'ok');
}
ACT['bk-grade'] = el => { const box = el.closest('.bkgr'); const bk = bkOf(box.dataset.bk); const blk = bk.chs.flatMap(c => c.blocks).find(x => x.id === box.dataset.blk); const v = box.querySelector('[name=score]').value;
  if (v === '') { toast('점수를 입력하세요.', 'warn'); return; } const G = S.bkgrades = S.bkgrades || {}; const A = G[bk.id] = G[bk.id] || {}; const M = A[box.dataset.sid] = A[box.dataset.sid] || {};
  M[blk.id] = { score: clamp(+v || 0, 0, +blk.pts || 0), fb: box.querySelector('[name=fb]').value.trim().slice(0, 500), at: today() }; logAudit(`디지털북 채점 — ${bk.title} · ${box.dataset.sid}`); save(); render(); toast('채점을 저장했습니다. 학습자 마이페이지 · 책에 점수와 피드백이 보입니다.', 'ok'); };

/* 학습자 사이트 › 콘텐츠 구성의 디지털북 카드는 이 빌더로 연결 */
ACT['ls-bk'] = el => { if (el.dataset.v === 'new') { ACT['bk-new'](); return; } const b = bkL()[+el.dataset.v]; if (b) bkOpen(b.id); };

/* ── 대화 · 기능 맵 · 언어팩 ── */
{ const base = answer; answer = q => { const s = String(q || '');
    if (/(디지털\s*북|전자\s*교재|인터랙티브\s*교재)/.test(s)) { lsEnsure(); const c = S.classes.find(x => s.includes(clean(x.name)) && clean(x.name).length >= 2);
      if (/(만들|생성|제작|변환|바꿔)/.test(s) && c) { const b = bkFromCourse(c); bkL().push(b); save(); UI.bkId = b.id; UI.bkCh = 0; UI.bkT = 'edit'; return { text: `「${c.name}」 과정으로 디지털북 「${b.title}」(${b.chs.length}단원)을 만들었습니다. 영상 · 퀴즈 · 시험 · 과제가 연결되어 학습자가 책에서 풀면 과정 진도 · 점수에도 기록됩니다. 확인 후 [게시]하세요.`, go: 'dbook' }; }
      if (/(만들|생성|제작)/.test(s)) { const tp = s.replace(/디지털\s*북|전자\s*교재|인터랙티브\s*교재|(으)?로|을|를|만들어\s*줘|만들|생성|제작|해\s*줘|주세요|좀/g, ' ').replace(/\s+/g, ' ').trim(); if (tp.length >= 2) { const b = bkAIDraft(tp, 3); bkL().push(b); save(); UI.bkId = b.id; UI.bkCh = 0; UI.bkT = 'edit'; return { text: `「${b.title}」 AI 초안(3단원)을 만들었습니다. 블록을 확인 · 수정한 뒤 [게시]하세요.`, go: 'dbook' }; } }
      UI.bkId = null; return { text: '학습 › 디지털북에서 단원 · 블록(본문 · 영상 · 확인 문제 · 펼쳐보기 · 순서 맞추기 · 체크 · 서술 · 과정 항목)으로 인터랙티브 교재를 만들고, 진도 · 평가 탭에서 학습자 진도와 서술 채점을 관리합니다.', go: 'dbook' }; }
    return base(q); }; }
COVER.push(['[신규] 디지털북 빌더: 단원 · 인터랙티브 블록 · 과정 항목 연결 · 진도 · 평가', 'dbook', '']);
Object.assign(DICT, { '디지털북': 'Digital books|デジタルブック|数字教材|數位教材|Sách số|หนังสือดิจิทัล|Buku digital|Libros digitales|Livres numériques', '단원 · 블록': 'Chapters · Blocks|単元 · ブロック|单元 · 区块|單元 · 區塊|Chương · Khối|บท · บล็อก|Bab · Blok|Capítulos · Bloques|Chapitres · Blocs', '진도 · 평가': 'Progress · Grading|進度 · 評価|进度 · 评价|進度 · 評價|Tiến độ · Chấm điểm|ความคืบหน้า · ประเมิน|Kemajuan · Penilaian|Progreso · Evaluación|Progression · Évaluation' });

/* ═════════ v36 디지털북 실시간 편집(BKW) ═════════
   대표님 지시: 디지털북이 만들어지는 화면을 실시간으로 보여 주고, 그 화면에서 두 번 눌러 바로 고치거나 섹션 사이 [+ 섹션 추가]로 필요한 부분을 넣고,
   AI SAM(편집기 안 한 줄 입력)에 지시하면 책이 바로 고쳐진다. 규칙 기반 + Claude 연결 시 Claude.
   BKW.html(book, {all|ch, edit}) · BKW.bind(root, book, {onChange, ch}) · BKW.cmd(book, text, ch) → {msg, ok} · BKW.cmdBox(prefix) · BKW.img(topic) */
const BKW = (() => {
  const E = s => esc(s);
  const jj = (w, a) => { try { const t2 = String(w).replace(/[」』"')\]\s]+$/, ''); return w + AI.j(t2, a); } catch (e) { return w; } };
  const ADD = [['h', '제목'], ['text', '본문'], ['key', '핵심 박스'], ['image', '이미지'], ['table', '표'], ['quiz', '확인 문제'], ['flip', '펼쳐보기 카드'], ['check', '따라 하기'], ['order', '순서 맞추기'], ['write', '생각 쓰기'], ['video', '영상']];
  let ST = { add: '', focus: '', undo: [], book: null, onChange: null, ch: 0, last: '' };
  const f = (path, txt, tag, ml, ph) => `<${tag || 'span'} class="bkw-f${ml ? ' ml' : ''}" data-bkf="${E(path)}" tabindex="0" title="두 번 눌러 고치기"${ph ? ` data-ph="${E(ph)}"` : ''}>${ml === 'md' ? bkMd(txt, esc) || `<p class="bkw-ph">${E(ph || '두 번 눌러 내용을 쓰세요')}</p>` : E(txt)}</${tag || 'span'}>`;
  const tools = (ci, bi) => `<div class="bkw-tl" role="group" aria-label="${bi + 1}번째 섹션 도구"><button type="button" data-bkw-mv="${ci}:${bi}:-1" aria-label="위로">↑</button><button type="button" data-bkw-mv="${ci}:${bi}:1" aria-label="아래로">↓</button><button type="button" data-bkw-del="${ci}:${bi}" aria-label="섹션 빼기">×</button></div>`;
  function blockHTML(b, ci, bi) { const k = `${ci}.${bi}`; let h = '';
    switch (b.type) {
      case 'text': h = f(`${k}.body`, b.body, 'div', 'md', '두 번 눌러 본문을 쓰세요'); break;
      case 'key': h = `<aside class="bkw-key ${E(b.tone || 'key')}">${f(`${k}.title`, b.title || '핵심', 'b')}${f(`${k}.body`, b.body, 'div', 'md', '두 번 눌러 내용을 쓰세요')}</aside>`; break;
      case 'image': h = `<figure class="bkw-img">${bkImgOK(b.src) ? `<img src="${E(b.src)}" alt="${E(b.alt || b.cap || '')}" data-bkw-img="${k}">` : `<button type="button" class="bkw-imgph" data-bkw-img="${k}">이미지 넣기 — 두 번 누르세요</button>`}<figcaption>${f(`${k}.cap`, b.cap || '', 'span', '', '설명을 쓰려면 두 번 누르세요')}</figcaption><div class="bkw-imgbar"><button type="button" data-bkw-imgup="${k}">내 사진 올리기</button><button type="button" data-bkw-imgai="${k}">AI 그림 다시 만들기</button></div></figure>`; break;
      case 'video': { const id = /^[\w-]{11}$/.test(b.yt || '') ? b.yt : ''; h = `<div class="bkw-vid">${id ? `<img src="https://i.ytimg.com/vi/${E(id)}/hqdefault.jpg" alt="">` : '<span class="bkw-vph">YouTube 영상</span>'}<div>${f(`${k}.title`, b.title || '', 'b', '', '영상 제목')}<p class="bkw-mini">${id ? 'YouTube ' + E(id) : '주소가 없습니다'} · <button type="button" class="bkw-lnk" data-bkw-yt="${k}">주소 넣기</button></p></div></div>`; break; }
      case 'quiz': h = `<div class="bkw-act"><b class="bkw-tag">확인 문제</b>${f(`${k}.title`, b.title || '확인 문제', 'b')}<ol>${(b.qs || []).map((q, j) => `<li>${f(`${k}.qs.${j}.q`, String(q.q || '').replace(/^\d+\.\s*/, ''), 'p')}${q.t === 'mc' ? `<ul class="bkw-op">${(q.opts || []).map((o, m) => `<li class="${String(q.a) === String(m) ? 'a' : ''}"><button type="button" data-bkw-ans="${k}.${j}:${m}" aria-label="정답으로" aria-pressed="${String(q.a) === String(m)}">${String(q.a) === String(m) ? '✓' : ''}</button>${f(`${k}.qs.${j}.opts.${m}`, o)}</li>`).join('')}</ul>` : q.t === 'ox' ? `<p class="bkw-mini">정답 ${['O', 'X'].map(v => `<button type="button" class="bkw-ox ${q.a === v ? 'on' : ''}" data-bkw-ans="${k}.${j}:${v}">${v}</button>`).join('')}</p>` : `<p class="bkw-mini">정답: ${f(`${k}.qs.${j}.a`, q.a || '')}</p>`}</li>`).join('')}</ol></div>`; break;
      case 'flip': h = `<div class="bkw-act"><b class="bkw-tag">펼쳐보기</b>${f(`${k}.title`, b.title || '', 'b')}<div class="bkw-flip">${(b.cards || []).map((c, j) => `<div><span>${f(`${k}.cards.${j}.f`, c.f)}</span><small>${f(`${k}.cards.${j}.b`, c.b)}</small></div>`).join('')}</div></div>`; break;
      case 'order': case 'check': h = `<div class="bkw-act"><b class="bkw-tag">${b.type === 'order' ? '순서 맞추기' : '따라 하기'}</b>${f(`${k}.title`, b.title || '', 'b')}<ol class="bkw-steps">${(b.steps || []).map((x, j) => `<li>${f(`${k}.steps.${j}`, x)}</li>`).join('')}</ol></div>`; break;
      case 'write': h = `<div class="bkw-act"><b class="bkw-tag">생각 쓰기</b>${f(`${k}.prompt`, b.prompt || '', 'p')}<div class="bkw-ans">학습자가 쓰는 칸${+b.pts ? ` · ${b.pts}점` : ''}</div></div>`; break;
      case 'item': { let t2 = ''; try { t2 = bkSum(b, bkClasses()); } catch (e) { } h = `<div class="bkw-act"><b class="bkw-tag">과정 항목 연결</b><p>${E(t2 || '연결된 항목')}</p></div>`; break; }
      default: h = '';
    }
    return `<div class="bkw-b t-${E(b.type)}" data-bid="${E(b.id)}">${h}${tools(ci, bi)}</div>`; }
  const gap = (ci, bi) => `<div class="bkw-gap${ST.add === `${ci}:${bi}` ? ' on' : ''}"><button type="button" class="bkw-addb" data-bkw-add="${ci}:${bi}" aria-expanded="${ST.add === `${ci}:${bi}`}">+ 섹션 추가</button>${ST.add === `${ci}:${bi}` ? `<div class="bkw-menu" role="menu">${ADD.map(([t2, l]) => `<button type="button" role="menuitem" data-bkw-new="${ci}:${bi}:${t2}">${E(l)}</button>`).join('')}</div>` : ''}</div>`;
  function html(b, o) { o = o || {}; const L = o.all ? b.chs.map((c, i) => [c, i]) : [[b.chs[o.ch || 0], o.ch || 0]].filter(x => x[0]);
    return `<div class="bkw" data-bkw="1"><header class="bkw-cov" style="--c:${E(b.color || '#5C74F6')}">${f('@title', b.title, 'h1')}${f('@desc', b.desc || '', 'p', '', '책 소개를 쓰려면 두 번 누르세요')}</header>
      ${L.map(([ch, ci]) => `<section class="bkw-ch" data-ci="${ci}"><h2><small>${ci + 1}단원</small>${f(`${ci}.@t`, ch.title, 'span')}</h2>${gap(ci, 0)}${ch.blocks.map((x, bi) => blockHTML(x, ci, bi) + gap(ci, bi + 1)).join('')}</section>`).join('')}
      ${o.all ? `<div class="bkw-gap"><button type="button" class="bkw-addb" data-bkw-addch="1">+ 단원 추가</button></div>` : ''}</div>`; }
  /* 경로: '@title' · '@desc' · '0.@t'(단원 제목) · '0.2.body'(0단원 2번째 섹션 body) */
  const at = (b, p) => { const k = p.split('.'); if (k[0] === '@title' || k[0] === '@desc') return { o: b, key: k[0] === '@title' ? 'title' : 'desc' }; const ch = b.chs[+k[0]]; if (!ch) return null; if (k[1] === '@t') return { o: ch, key: 'title' }; let o = ch.blocks[+k[1]]; const rest = k.slice(2); const key = rest.pop(); for (const x of rest) { if (o == null) return null; o = o[x]; } return o == null ? null : { o, key }; };
  const get = (b, p) => { const r = at(b, p); return r ? r.o[r.key] : ''; };
  const set = (b, p, v) => { const r = at(b, p); if (!r) return false; r.o[r.key] = v; return true; };
  const snap = b => { ST.undo.push(JSON.stringify(b.chs ? { title: b.title, desc: b.desc, color: b.color, chs: b.chs } : b)); if (ST.undo.length > 20) ST.undo.shift(); };
  const changed = () => { try { ST.onChange && ST.onChange(); } catch (e) { console.error(e); } };
  /* 두 번 눌러 고치기 */
  function edit(el) { const b = ST.book; if (!b || el.isContentEditable || el.querySelector('textarea')) return; const p = el.dataset.bkf; const v = String(get(b, p) ?? '');
    if (el.classList.contains('ml')) { const ta = document.createElement('textarea'); ta.className = 'bkw-ta'; ta.value = v; ta.rows = Math.min(16, Math.max(3, v.split('\n').length + 1)); ta.setAttribute('aria-label', '내용 고치기 — # 제목 · - 목록 · | 표 | 칸 |');
      el.innerHTML = ''; el.appendChild(ta); const hint = document.createElement('small'); hint.className = 'bkw-mini'; hint.textContent = '# 제목 · - 목록 · **굵게** · | 표 | 칸 | · 다 쓰면 바깥을 누르세요(Esc 취소)'; el.appendChild(hint); ta.focus();
      let done = false; const fin = ok => { if (done) return; done = true; if (ok && ta.value !== v) { snap(b); set(b, p, ta.value.slice(0, 8000)); } changed(); };
      ta.addEventListener('blur', () => fin(true)); ta.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(false); } }); return; }
    try { el.contentEditable = 'plaintext-only'; } catch (e) { } if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true'; el.classList.add('on'); el.focus(); try { const r = document.createRange(); r.selectNodeContents(el); const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(r); } catch (e) { }
    let done = false; const fin = ok => { if (done) return; done = true; el.removeAttribute('contenteditable'); el.classList.remove('on'); const nv = String(el.innerText || '').replace(/ /g, ' ').trim(); if (ok && nv !== v.trim()) { if (!nv && /(@title|@t|\.q)$/.test(p)) { el.textContent = v; return; } snap(b); set(b, p, nv.slice(0, 600)); changed(); } else if (!ok) el.textContent = v; };
    el.addEventListener('blur', () => fin(true), { once: true }); el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); el.blur(); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(false); el.blur(); } }); }
  /* 새 섹션 기본 내용(그 단원 주제로 바로 채움) */
  const chTopic = (b, ci) => clean(String((b.chs[ci] || {}).title || b.title || '').replace(/^\d+(단원|차시|주차|장)\s*·?\s*/, '').replace(/디지털북$/, '')) || clean(b.title) || '핵심 개념';
  function newBlock(b, ci, t2) { const tp = chTopic(b, ci); let M = null; try { M = AI.material(tp); } catch (e) { } const sec = (M && M.secs[0]) || { h: tp, body: '', pts: ['요점'] }; const pts = M ? M.secs.flatMap(s => s.pts).slice(0, 6) : ['요점 하나', '요점 둘'];
    if (t2 === 'h') return bkB('text', { body: `# 새 제목` });
    if (t2 === 'text') return bkB('text', { body: `${sec.body || '여기에 내용을 쓰세요.'}` });
    if (t2 === 'key') return bkB('key', { tone: 'key', title: '핵심 정리', body: pts.slice(0, 3).map(x => '- ' + x).join('\n') });
    if (t2 === 'image') return bkB('image', { src: img(tp, ci), alt: `${tp} 그림`, cap: `${tp}` });
    if (t2 === 'table') return bkB('text', { body: `# ${tp} 한눈에 보기\n| 항목 | 설명 |\n|---|---|\n${(M ? M.secs.slice(0, 4) : [sec]).map(s => `| ${s.h} | ${(s.pts || [])[0] || ''} |`).join('\n')}` });
    if (t2 === 'quiz') return bkB('quiz', { title: '확인 문제', pts: 10, qs: AI.questions(tp, 2, '보통', ['mc', 'ox']).map(bkQ) });
    if (t2 === 'flip') return bkB('flip', { title: '펼쳐서 확인하기', cards: (M ? M.secs.slice(0, 3) : [sec]).map(s => ({ f: s.h, b: (s.pts || []).slice(0, 2).join(' / ') })) });
    if (t2 === 'check') return bkB('check', { title: '따라 하기', steps: ['목표를 한 줄로 정합니다', '필요한 자료를 준비합니다', '직접 만들어 봅니다'] });
    if (t2 === 'order') return bkB('order', { title: '순서 맞추기', steps: ['목표 정하기', '자료 준비하기', '만들어 보기', '점검하고 고치기'], pts: 10 });
    if (t2 === 'write') return bkB('write', { prompt: `「${tp}」${AI.j(tp, '을')} 내 전공 · 업무에 어떻게 쓸지 3문장으로 쓰세요.`, pts: 0, guide: '' });
    if (t2 === 'video') return bkB('video', { yt: '', title: `${tp} 영상` });
    return bkB('text', { body: '여기에 내용을 쓰세요.' }); }
  /* AI 그림: 서버 이미지 모델이 없으므로 주제 글자 · 색으로 캔버스 그림을 만든다(정직하게 'AI 그림(디자인 생성)') */
  function img(topic, seed) { try { const c = document.createElement('canvas'); c.width = 960; c.height = 540; const g = c.getContext('2d'); const P = [['#5C74F6', '#9AA9FA'], ['#00A3A3', '#7FD8D0'], ['#EF6D00', '#FFC48A'], ['#7A3BD0', '#C7A6F5'], ['#009116', '#9BE3A5']]; const [a, b2] = P[Math.abs((String(topic).length + (seed || 0)) % P.length)];
      const gr = g.createLinearGradient(0, 0, 960, 540); gr.addColorStop(0, a); gr.addColorStop(1, b2); g.fillStyle = gr; g.fillRect(0, 0, 960, 540); g.globalAlpha = .18; g.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc((i * 173 + 80) % 960, (i * 97 + 60) % 540, 60 + (i * 37) % 120, 0, 7); g.fill(); } g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect ? g.roundRect(120, 150, 720, 240, 28) : g.rect(120, 150, 720, 240); g.fill(); g.fillStyle = a; g.font = '800 46px Pretendard, "Malgun Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const t2 = String(topic || '').slice(0, 22); g.fillText(t2, 480, 250); g.fillStyle = '#4C4D4D'; g.font = '500 26px Pretendard, "Malgun Gothic", sans-serif'; g.fillText('한눈에 보는 핵심', 480, 318);
      return c.toDataURL('image/jpeg', 0.82); } catch (e) { return ''; } }
  /* 한 줄 지시 → 바로 고치기(규칙). 반환 { ok, msg } */
  const TONE = { 파란: '#3B55E6', 파랑: '#3B55E6', 빨간: '#DE0027', 빨강: '#DE0027', 초록: '#009116', 녹색: '#009116', 주황: '#EF6D00', 보라: '#7A3BD0', 검정: '#2A2B2B', 남색: '#1E3A8A', 분홍: '#E1468C' };
  const EASY = [[/활용하/g, '쓰'], [/활용/g, '쓰기'], [/적용하/g, '써 보'], [/구성 요소/g, '이루는 것'], [/프로세스/g, '과정'], [/효율적으로/g, '빠르고 쉽게'], [/검증/g, '확인'], [/도출/g, '찾아내기'], [/수립/g, '세우기'], [/점검/g, '확인']];
  function rule(b, q, cur) {
    const s = String(q || '').trim(); if (!s) return { ok: false, msg: '고칠 내용을 한 줄로 적어 주세요.' };
    const m1 = s.match(/(\d+)\s*단원/); let ci = m1 ? +m1[1] - 1 : /마지막/.test(s) ? b.chs.length - 1 : /처음|첫/.test(s) && !/처음에|맨 앞/.test(s) ? 0 : (cur || 0); if (ci < 0 || ci >= b.chs.length) { if (m1 && !/추가|늘려|만들/.test(s)) return { ok: false, msg: `${m1[1]}단원이 없습니다. 지금 ${b.chs.length}단원까지 있습니다.` }; ci = Math.max(0, Math.min(b.chs.length - 1, ci)); }
    const ch = b.chs[ci]; const front = /맨 앞|처음에|앞에|위에/.test(s); const put = x => { if (!ch) return; if (front) ch.blocks.splice(0, 0, x); else ch.blocks.push(x); ST.focus = x.id; };
    const qt = (s.match(/[「"'“‘]([^」"'”’]+)[」"'”’]/) || [])[1];
    if (/되돌려|취소|원래대로/.test(s)) { return undo(b) ? { ok: true, msg: '바로 앞 상태로 되돌렸습니다.' } : { ok: false, msg: '되돌릴 것이 없습니다.' }; }
    snap(b);
    if (/제목/.test(s) && qt && /바꿔|바꾸|으로|로/.test(s)) { if (m1 && ch) { ch.title = qt.slice(0, 60); return { ok: true, msg: `${ci + 1}단원 제목을 ${jj(`「${qt}」`, '으로')} 바꿨습니다.` }; } b.title = qt.slice(0, 60); return { ok: true, msg: `책 제목을 ${jj(`「${qt}」`, '으로')} 바꿨습니다.` }; }
    const col = Object.keys(TONE).find(k => s.includes(k)); if (col && /색|표지|컬러/.test(s)) { b.color = TONE[col]; return { ok: true, msg: `표지 색을 ${col}색으로 바꿨습니다.` }; }
    if (/단원/.test(s) && /(삭제|지워|빼)/.test(s) && m1) { if (b.chs.length <= 1) return { ok: false, msg: '단원은 하나 이상 있어야 합니다.' }; b.chs.splice(ci, 1); return { ok: true, msg: `${ci + 1}단원을 뺐습니다.` }; }
    const TY = [['table', /표/], ['quiz', /문제|퀴즈/], ['image', /이미지|그림|사진/], ['video', /영상|동영상/], ['key', /요약|정리|핵심/], ['order', /순서/], ['check', /따라|체크|실습 단계/], ['write', /생각|서술|글쓰기/], ['flip', /펼쳐|카드/], ['h', /소제목/]];
    if (/(삭제|지워|빼)/.test(s)) { const hit = TY.find(([, re]) => re.test(s)); if (hit && ch) { const tt = hit[0] === 'table' ? (x => x.type === 'text' && /\|/.test(x.body || '')) : hit[0] === 'h' ? (x => x.type === 'text' && /^#/.test(x.body || '')) : (x => x.type === hit[0]); const i = ch.blocks.map((x, j) => tt(x) ? j : -1).filter(j => j >= 0).pop(); if (i == null) return { ok: false, msg: `${ci + 1}단원에 뺄 ${jj(hit[0] === 'table' ? '표' : BK_NAME[hit[0]] || '섹션', '이')} 없습니다.` }; ch.blocks.splice(i, 1); return { ok: true, msg: `${ci + 1}단원에서 ${hit[0] === 'table' ? '표' : BK_NAME[hit[0]] || '섹션'} 하나를 뺐습니다.` }; } }
    const tyHit = TY.find(([, re]) => re.test(s));
    if (!tyHit && /단원/.test(s) && /(추가|늘려|만들|더)/.test(s)) { if (b.chs.length >= BK_MAX_CH) return { ok: false, msg: `단원은 ${BK_MAX_CH}개까지입니다.` }; const tp = qt || clean(s.replace(/\d+\s*단원|단원|추가|해\s*줘|해줘|주세요|만들어|늘려|더|하나|에|을|를|로|으로/g, ' ')) || chTopic(b, b.chs.length - 1); const nc = bkAIChapter(tp, qt || `${tp} 더 알아보기`, b.chs.length, false); b.chs.push(nc); ST.focus = (nc.blocks[0] || {}).id; return { ok: true, msg: `${b.chs.length}단원 ${jj(`「${nc.title}」`, '을')} 추가했습니다.` }; }
    if (/쉽게|쉬운 말|짧게|간단히/.test(s) && ch) { let n = 0; ch.blocks.forEach(x => { if (x.type !== 'text' && x.type !== 'key') return; const before = x.body || ''; let t2 = before.split('\n').map(l => { if (/^\s*(#|-|\|)/.test(l)) return l; const ss = l.split(/(?<=[.!?다요])\s+/).filter(Boolean); return ss.slice(0, 2).join(' '); }).join('\n'); EASY.forEach(([re, to]) => { t2 = t2.replace(re, to); }); if (t2 !== before) { x.body = t2; n++; } }); return n ? { ok: true, msg: `${ci + 1}단원 본문 ${n}곳을 짧고 쉬운 말로 바꿨습니다(규칙 기반 — Claude 연결 시 더 자연스럽게 고칩니다).` } : { ok: false, msg: '더 줄일 문장이 없습니다.' }; }
    const hit = TY.find(([, re]) => re.test(s)); if (hit && ch) { const n = +((s.match(/(\d+)\s*(개|문제|문항)/) || [])[1] || 0); const x = newBlock(b, ci, hit[0]); if (hit[0] === 'quiz' && n > 0) x.qs = AI.questions(chTopic(b, ci), Math.min(10, n), '보통', ['mc', 'ox', 'mc']).map(bkQ); if (qt && x.type === 'text') x.body = hit[0] === 'h' ? `# ${qt}` : x.body; put(x);
      const nm = `${hit[0] === 'table' ? '표' : hit[0] === 'h' ? '소제목' : BK_NAME[hit[0]]}${hit[0] === 'quiz' && n ? ` ${n}문항` : ''}`; return { ok: true, msg: `${ci + 1}단원 ${front ? '맨 앞' : '끝'}에 ${jj(nm, '을')} 넣었습니다.${hit[0] === 'video' ? ' 두 번 눌러 YouTube 주소를 넣으세요.' : ''}` }; }
    if (qt && /(추가|넣어|써)/.test(s) && ch) { put(bkB('text', { body: qt })); return { ok: true, msg: `${ci + 1}단원에 문단을 넣었습니다.` }; }
    ST.undo.pop(); return { ok: false, msg: '이해하지 못했습니다. 예: "2단원에 표 추가해 줘", "확인 문제 3개 더", "본문을 쉽게", "제목을 「…」로 바꿔 줘"' };
  }
  function undo(b) { const x = ST.undo.pop(); if (!x) return false; const o = JSON.parse(x); Object.assign(b, o); try { bkNorm(b); } catch (e) { } return true; }
  const claudeOn = () => { try { return typeof CL === 'object' && !!CL.on('docs'); } catch (e) { return false; } };
  async function cmd(b, q, cur) {
    if (claudeOn() && !/되돌려|취소/.test(q)) { try { const ci = Math.max(0, Math.min(b.chs.length - 1, cur || 0)); const lite = { title: b.title, chs: b.chs.map(c => ({ title: c.title, blocks: c.blocks.filter(x => x.type !== 'item').map(x => { const y = { ...x }; delete y.id; if (y.type === 'image') y.src = y.src && y.src.startsWith('data:') ? '(그림 유지)' : y.src; return y; }) })) };
        const r = await Promise.race([CL.call({ system: '당신은 디지털 교재 편집자입니다. 사용자의 한 줄 지시대로 책 JSON을 고쳐, 같은 모양의 JSON 하나만 출력합니다. 블록 type은 text(body는 # 제목, - 목록, | 표 | 형식) · key(tone,title,body) · image(src,alt,cap) · video(yt,title) · quiz(title,pts,qs[{t:mc|ox|short,q,opts,a,exp}]) · flip(title,cards[{f,b}]) · order(title,steps,pts) · check(title,steps) · write(prompt,pts,guide)만 씁니다. 지시와 관계없는 부분은 그대로 둡니다.', messages: [{ role: 'user', content: `지금 보고 있는 단원: ${ci + 1}단원\n지시: ${q}\n책 JSON: ${JSON.stringify(lite)}` }], max: 6000 }), new Promise((_, no) => setTimeout(() => no(new Error('시간 초과')), 40000))]);
        const m = String(r.text || '').match(/\{[\s\S]*\}/); const j = m && JSON.parse(m[0]);
        if (j && Array.isArray(j.chs) && j.chs.length) { snap(b); const imgs = b.chs.flatMap(c => c.blocks.filter(x => x.type === 'image')); b.title = String(j.title || b.title).slice(0, 60); b.chs = j.chs.slice(0, BK_MAX_CH).map((c, i) => ({ id: (b.chs[i] || {}).id || uid('ch'), title: String(c.title || `${i + 1}단원`).slice(0, 60), blocks: (c.blocks || []).filter(x => x && BK_NAME[x.type] && x.type !== 'item').slice(0, BK_MAX_BL).map(x => { if (x.type === 'image' && !bkImgOK(x.src)) { const old = imgs.shift(); x.src = old ? old.src : img(x.cap || b.title, i); } if (x.type === 'quiz') x.qs = (x.qs || []).map(bkQ); return bkB(x.type, { ...x, id: undefined }); }) })); bkNorm(b); return { ok: true, msg: 'Claude가 지시대로 고쳤습니다. 마음에 들지 않으면 [되돌리기]를 누르세요.', by: 'claude' }; } } catch (e) { console.warn('bkw claude', e && e.message); } }
    return rule(b, q, cur);
  }
  const EXQ = ['2단원에 표 추가해 줘', '확인 문제 3개 더', '본문을 쉽게 바꿔 줘', '요약 박스 넣어 줘', '이미지 넣어 줘', '표지 색을 초록으로'];
  const cmdBox = pre => `<div class="bkw-cmd" data-bkcmd="${E(pre)}"><label class="bkw-cl" for="${E(pre)}BkCmd">AI SAM에게 한 줄로 고칠 점 말하기</label><div class="bkw-cr"><input id="${E(pre)}BkCmd" class="bkw-ci" maxlength="200" autocomplete="off" placeholder="예: 2단원에 표 추가해 줘"><button type="button" class="bkw-go" data-act="bkw-cmd" data-v="${E(pre)}">고치기</button></div><div class="bkw-ex">${EXQ.map(x => `<button type="button" data-act="bkw-ex" data-v="${E(x)}">${E(x)}</button>`).join('')}</div>${ST.last ? `<p class="bkw-msg" role="status">${E(ST.last)}</p>` : ''}${ST.undo.length ? `<button type="button" class="bkw-undo" data-act="bkw-undo">↶ 되돌리기</button>` : ''}<p class="bkw-mini">${claudeOn() ? 'Claude가 고칩니다.' : '기본 AI(규칙)로 고칩니다 — 표 · 문제 · 요약 · 이미지 · 단원 추가 · 제목 바꾸기 · 쉬운 말 · 되돌리기를 알아듣습니다.'}</p></div>`;
  ACT['bkw-ex'] = el => { const i = document.querySelector('#ctSheet .bkw-ci') || document.querySelector('.bkw-ci'); if (i) { i.value = el.dataset.v; i.focus(); } };
  ACT['bkw-cmd'] = async () => { const i = document.querySelector('#ctSheet .bkw-ci') || document.querySelector('.bkw-ci'); const b = ST.book; if (!i || !b) return; const q = i.value.trim(); if (!q) { toast('고칠 내용을 한 줄로 적어 주세요.', 'warn'); i.focus(); return; } const btn = i.parentElement && i.parentElement.querySelector('.bkw-go'); if (btn) { btn.disabled = true; btn.textContent = '고치는 중…'; }
    const r = await cmd(b, q, ST.ch); ST.last = r.msg; try { S.ai && (S.ai.usage = (S.ai.usage || 0) + 1); } catch (e) { } toast(r.msg, r.ok ? 'ok' : 'warn'); changed(); if (r.ok) { setTimeout(() => { const el = ST.focus && document.querySelector(`.bkw [data-bid="${CSS.escape(ST.focus)}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); } ST.focus = ''; }, 40); } };
  ACT['bkw-undo'] = () => { if (ST.book && undo(ST.book)) { ST.last = '되돌렸습니다.'; changed(); } };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && e.target && e.target.classList && e.target.classList.contains('bkw-ci')) { e.preventDefault(); ACT['bkw-cmd'](); } });
  function bind(root, b, o) { if (!root || !b) return; o = o || {}; if (ST.book !== b) { ST.undo = []; ST.last = ''; } ST.book = b; ST.onChange = o.onChange; ST.ch = o.ch || 0; if (root.__bkw) return; root.__bkw = 1;
    root.addEventListener('dblclick', e => { const el = e.target.closest('[data-bkf]'); if (el && root.contains(el)) { e.preventDefault(); edit(el); return; } const im = e.target.closest('[data-bkw-img]'); if (im) { pickImg(im.dataset.bkwImg); return; } const sec = e.target.closest('.bkw-ch'); if (sec) ST.ch = +sec.dataset.ci; });
    root.addEventListener('keydown', e => { const el = e.target.closest && e.target.closest('[data-bkf]'); if (el && !el.isContentEditable && !el.querySelector('textarea') && (e.key === 'Enter' || e.key === 'F2')) { e.preventDefault(); edit(el); } });
    root.addEventListener('click', e => { const t2 = e.target.closest('button'); if (!t2 || !root.contains(t2)) { const sec = e.target.closest('.bkw-ch'); if (sec) ST.ch = +sec.dataset.ci; return; } const d = t2.dataset; const B = ST.book;
      if (d.bkwAdd) { ST.add = ST.add === d.bkwAdd ? '' : d.bkwAdd; ST.ch = +d.bkwAdd.split(':')[0]; changed(); return; }
      if (d.bkwNew) { const [ci, bi, t3] = d.bkwNew.split(':'); const ch = B.chs[+ci]; if (!ch) return; if (ch.blocks.length >= BK_MAX_BL) { toast(`섹션은 단원마다 ${BK_MAX_BL}개까지입니다.`, 'warn'); return; } snap(B); const x = newBlock(B, +ci, t3); ch.blocks.splice(+bi, 0, x); ST.add = ''; ST.focus = x.id; ST.ch = +ci; changed();
        setTimeout(() => { const el = document.querySelector(`.bkw [data-bid="${CSS.escape(x.id)}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); const ff = el.querySelector('[data-bkf]'); if (ff && (t3 === 'h' || t3 === 'text')) edit(ff); } }, 40); return; }
      if (d.bkwAddch) { snap(B); const nc = bkAIChapter(chTopic(B, B.chs.length - 1), `${B.chs.length + 1}단원`, B.chs.length, false); B.chs.push(nc); changed(); return; }
      if (d.bkwDel) { const [ci, bi] = d.bkwDel.split(':').map(Number); snap(B); B.chs[ci].blocks.splice(bi, 1); ST.last = '섹션을 뺐습니다. [되돌리기]로 되살릴 수 있습니다.'; changed(); return; }
      if (d.bkwMv) { const [ci, bi, dd] = d.bkwMv.split(':').map(Number); const L = B.chs[ci].blocks; const j = bi + dd; if (j < 0 || j >= L.length) return; snap(B); [L[bi], L[j]] = [L[j], L[bi]]; changed(); return; }
      if (d.bkwAns) { const [p, v] = d.bkwAns.split(':'); const q = at(B, p + '.a'); if (q) { snap(B); q.o.a = v; changed(); } return; }
      if (d.bkwImgup) { pickImg(d.bkwImgup, 'up'); return; } if (d.bkwImgai) { const r = at(B, d.bkwImgai + '.src'); if (r) { snap(B); r.o.src = img(r.o.cap || chTopic(B, +d.bkwImgai.split('.')[0]), Date.now() % 9); changed(); } return; }
      if (d.bkwImg) { pickImg(d.bkwImg); return; }
      if (d.bkwYt) { const r = at(B, d.bkwYt + '.yt'); if (!r) return; const u = prompt('YouTube 주소를 붙여 넣으세요.', r.o.yt ? 'https://youtu.be/' + r.o.yt : ''); if (u == null) return; const id = typeof ytOf === 'function' ? ytOf(u) : (typeof ytId === 'function' ? ytId(u) : ''); if (!id) { toast('YouTube 주소를 확인하세요.', 'warn'); return; } snap(B); r.o.yt = id; changed(); return; } }); }
  function pickImg(k, how) { const B = ST.book; const r = at(B, k + '.src'); if (!r) return; if (how !== 'up') { if (!bkImgOK(r.o.src)) { snap(B); r.o.src = img(r.o.cap || B.title, 1); changed(); return; } }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp'; inp.onchange = () => { const fl = inp.files && inp.files[0]; if (!fl) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const sc = Math.min(1, 1200 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); let q = .82, out = c.toDataURL('image/jpeg', q); while (out.length > 400000 && q > .4) { q -= .12; out = c.toDataURL('image/jpeg', q); } if (out.length > 400000) { toast('이미지가 너무 큽니다.', 'warn'); return; } snap(B); r.o.src = out; changed(); }; im.src = rd.result; }; rd.readAsDataURL(fl); }; inp.click(); }
  /* 화면 모양 */
  if (!document.getElementById('bkwCss')) { const st = document.createElement('style'); st.id = 'bkwCss'; st.textContent = `
.bkw{background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.06);max-width:820px;margin:0 auto 24px;font-size:16px;line-height:1.7;color:#2A2B2B;word-break:keep-all;overflow-wrap:anywhere}
.bkw-cov{background:var(--c);color:#fff;border-radius:14px 14px 0 0;padding:28px 28px 22px}.bkw-cov h1{margin:0 0 6px;font-size:26px;line-height:1.35}.bkw-cov p{margin:0;opacity:.92}
.bkw-ch{padding:8px 28px 18px;border-top:1px solid #EAEBEB}.bkw-ch h2{font-size:21px;margin:14px 0 4px;display:flex;align-items:baseline;gap:10px}.bkw-ch h2 small{font-size:14px;color:#5C74F6;font-weight:800}
.bkw-f{border-radius:6px;outline:1px dashed transparent;outline-offset:3px;cursor:text;transition:outline-color .12s,background .12s;display:inline}.bkw-f.ml,div.bkw-f,p.bkw-f,h1.bkw-f{display:block}
.bkw-f:hover,.bkw-f:focus-visible{outline-color:#8EA0FA;background:rgba(92,116,246,.06)}.bkw-cov .bkw-f:hover{background:rgba(255,255,255,.15);outline-color:#fff}.bkw-f.on{outline:2px solid #5C74F6;background:#fff;color:#2A2B2B}
.bkw-f:empty::before,.bkw-ph{content:attr(data-ph);color:#9A9B9B}.bkw-f h3{font-size:18px;margin:12px 0 4px}.bkw-f p{margin:0 0 8px}.bkw-f ul{margin:4px 0 8px;padding-left:22px}
.bkw-b{position:relative;padding:6px 8px;margin:2px -8px;border-radius:10px}.bkw-b:hover{background:#FAFAFB}.bkw-b.flash{animation:bkwf 1.6s}@keyframes bkwf{0%{background:#EAEDFF}100%{background:transparent}}
.bkw-tl{position:absolute;right:6px;top:6px;display:none;gap:4px}.bkw-b:hover .bkw-tl,.bkw-b:focus-within .bkw-tl{display:flex}.bkw-tl button{width:32px;height:32px;border:1px solid #D9DADA;border-radius:8px;background:#fff;cursor:pointer;font-size:15px}.bkw-tl button:hover{border-color:#DE0027;color:#DE0027}
.bkw-gap{display:flex;flex-direction:column;align-items:center;margin:2px 0;min-height:14px}.bkw-addb{opacity:.35;border:1px dashed #8EA0FA;background:#fff;color:#3B4FD0;border-radius:999px;min-height:32px;padding:0 14px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .12s}.bkw-gap:hover .bkw-addb,.bkw-gap.on .bkw-addb,.bkw-addb:focus-visible{opacity:1}
.bkw-menu{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;background:#F5F7FF;border:1px solid #D5DBFF;border-radius:12px;padding:10px;margin:6px 0;max-width:100%}.bkw-menu button{min-height:44px;padding:0 14px;border:1px solid #C8C9C9;border-radius:999px;background:#fff;font:inherit;font-size:15px;cursor:pointer}.bkw-menu button:hover{border-color:#5C74F6;color:#3B4FD0}
.bkw-key{border-left:5px solid #5C74F6;background:#F5F7FF;border-radius:10px;padding:10px 14px}.bkw-key.tip{border-color:#00A3A3;background:#E9F8F7}.bkw-key.warn{border-color:#EF6D00;background:#FFF3E0}.bkw-key>b{display:block;margin-bottom:2px}
.bkw-img{margin:6px 0}.bkw-img img{width:100%;border-radius:10px;display:block;cursor:pointer}.bkw-img figcaption{font-size:14px;color:#6C6C6C;margin-top:4px}.bkw-imgph{width:100%;min-height:160px;border:2px dashed #C8C9C9;border-radius:10px;background:#F6F7F7;font:inherit;color:#4C4D4D;cursor:pointer}.bkw-imgbar{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.bkw-imgbar button,.bkw-lnk{min-height:36px;border:1px solid #C8C9C9;border-radius:8px;background:#fff;font:inherit;font-size:14px;padding:0 10px;cursor:pointer}
.bkw-vid{display:flex;gap:12px;align-items:center;background:#F6F7F7;border-radius:10px;padding:10px}.bkw-vid img,.bkw-vph{width:160px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;flex:none;background:#1F2020;color:#fff;display:grid;place-items:center;font-size:13px}
.bkw-act{background:#F6F7F7;border-radius:12px;padding:12px 14px}.bkw-tag{display:inline-block;font-size:12px;background:#2A2B2B;color:#fff;border-radius:999px;padding:1px 10px;margin-right:6px}.bkw-act ol{margin:6px 0 0;padding-left:20px}.bkw-act p{margin:4px 0}
.bkw-op{list-style:none;padding:0;margin:4px 0}.bkw-op li{display:flex;gap:8px;align-items:center;padding:2px 0}.bkw-op li button{width:26px;height:26px;border-radius:50%;border:2px solid #AAABAB;background:#fff;cursor:pointer;color:#fff;font-size:13px;padding:0;flex:none}.bkw-op li.a button{background:#00C53B;border-color:#00C53B}.bkw-op li.a{font-weight:700;color:#009116}
.bkw-ox{min-width:40px;min-height:32px;border:1px solid #C8C9C9;border-radius:999px;background:#fff;margin-left:4px;cursor:pointer}.bkw-ox.on{background:#2A2B2B;color:#fff}
.bkw-flip{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-top:6px}.bkw-flip>div{background:#fff;border:1px solid #EAEBEB;border-radius:10px;padding:10px}.bkw-flip small{display:block;color:#4C4D4D;margin-top:4px}
.bkw-ans{border:1px dashed #C8C9C9;border-radius:8px;padding:10px;color:#808181;font-size:14px;background:#fff}.bkw-mini{font-size:13px;color:#6C6C6C;display:block}
.bkw-ta{width:100%;box-sizing:border-box;font:inherit;font-size:15px;line-height:1.6;padding:10px 12px;border:2px solid #5C74F6;border-radius:10px;resize:vertical}
.bkw-cmd{background:#F5F7FF;border:1px solid #D5DBFF;border-radius:14px;padding:12px 14px;margin:0 0 14px}.bkw-cl{display:block;font-weight:700;margin:0 0 6px;font-size:15px}.bkw-cr{display:flex;gap:8px}.bkw-ci{flex:1;min-width:0;min-height:48px;font:inherit;font-size:16px;padding:0 12px;border:1px solid #C8C9C9;border-radius:10px}.bkw-go{min-height:48px;padding:0 18px;border:0;border-radius:10px;background:#2A2B2B;color:#fff;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}
.bkw-ex{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px}.bkw-ex button{min-height:36px;padding:0 12px;border:1px solid #C8C9C9;border-radius:999px;background:#fff;font:inherit;font-size:14px;cursor:pointer}.bkw-msg{margin:6px 0;font-weight:600;color:#3B4FD0}.bkw-undo{min-height:40px;padding:0 14px;border:1px solid #C8C9C9;border-radius:10px;background:#fff;font:inherit;cursor:pointer}
.bkw-wrap{display:grid;grid-template-columns:260px minmax(0,1fr);gap:16px;align-items:start}.bkw-side .bar2{flex-wrap:wrap}.bkw-side .bar2 input{flex:1 1 100%;min-width:0;width:100%;box-sizing:border-box;min-height:44px}.bkw-side .lsrow{gap:4px}.bkw-side .lsrow .lsname{font-size:15px}.bkw-page{min-width:0}.bkw-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px}.bkw-top .sp{flex:1}
@media (max-width:860px){.bkw-wrap{grid-template-columns:1fr}.bkw-ch{padding:6px 14px 14px}.bkw-cov{padding:20px 16px}.bkw-tl{display:flex;position:static;justify-content:flex-end;margin-top:4px}.bkw-addb{opacity:.8}.bkw-vid{flex-direction:column;align-items:flex-start}}`; document.head.appendChild(st); }
  return { html, bind, cmd, rule, cmdBox, img, undo, newBlock, state: () => ST };
})();
window.BKW = BKW;

ACT['bk-view'] = el => { UI.bkView = el.dataset.v; render(); };
/* 디지털북 편집 화면: 그린 뒤 실시간 책 화면에 바로 고치기를 붙인다 */
AFTER.push(() => { try { const r = document.querySelector('#main .bkw'); const b = UI.bkId && bkOf(UI.bkId); if (r && b) BKW.bind(r, b, { ch: UI.bkCh || 0, onChange: () => { bkNorm(b); save(); render(); } }); } catch (e) { console.error(e); } });
/* AI SAM: 디지털북 편집 화면을 연 채로 "2단원에 표 추가해 줘"처럼 말하면 그 책을 바로 고친다(규칙) */
{ const base = answer; answer = q => { const s = String(q || ''); try { const b = UI.bkId && (UI.bkT || 'edit') === 'edit' && typeof CUR === 'object' && ['dbook', 'clib'].includes(CUR.tab) && bkOf(UI.bkId);
    if (b && /(고쳐|바꿔|추가|넣어|빼 ?줘|삭제|쉽게|줄여|되돌려|더 넣|늘려)/.test(s) && !/(과정|교육과정|강좌|수업|홈페이지|공지|학습자|교육생|학생)\s*(을|를)?\s*(만들|추가)/.test(s)) { BKW.state().book = b; const r = BKW.rule(b, s, UI.bkCh || 0); if (r.ok) { bkNorm(b); save(); setTimeout(() => render(), 0); } return { text: `디지털북 「${b.title}」 — ${r.msg}` }; } } catch (e) { console.error(e); } return base(q); }; }
