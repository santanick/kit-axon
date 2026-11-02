/* v22 lassess — 학습자 화면: 평가 · 수료(W3)
   시험 · 퀴즈 규칙(응시 기간 · 시간 제한 · 재응시 · 통과 점수 · 점수/풀이 공개 · 문항 섞기 · 1:1 질문) · 과제(마감 · 재제출 · 첨부 · 제출 이력)
   설문(4유형 · 필수 · 직접 입력 · 기한 · 완료 문구) · 강의 공통 필드 · 영상 구간 퀴즈(자동 정지 · 즉시 채점) · 항목별 수료 기준 · 수료증 양식
   학습자 활동은 LR.lp(학습 기록)에 저장하고, 운영자 반영은 lpxPush(a2-try · a2-sub · a2-sv · a2-vq · a2-q · a2-certdl)로 보낸다. */
'use strict';
const A2L = { run: null, vp: null, cue: null, last: null };
const a2lT = v => { if (!v) return null; const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00' : v); return Number.isFinite(t) ? t : null; };
const a2lEnd = v => { if (!v) return null; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? a2lT(v + 'T23:59:59') : a2lT(v); };
const a2lDT = v => String(v || '').replace('T', ' ');
const a2lmmss = s => { s = Math.max(0, Math.floor(+s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const a2lSize = b => !b ? '' : b >= 1024 ** 2 ? (b / 1024 ** 2).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB';
const a2lRoom = () => { try { return LR.mode === 'demo' && LR.tid ? JSON.parse(localStorage.getItem('didisam.room.' + LR.tid) || 'null') : null; } catch (e) { return null; } };
const a2lRec = (cid, iid) => { const c = LR.lp.cls[cid] = LR.lp.cls[cid] || { items: {} }; c.items = c.items || {}; return (c.items[iid] = c.items[iid] || {}); };
const a2lPeek = (cid, iid) => (((LR.lp.cls || {})[cid] || {}).items || {})[iid] || {};
const a2lPush = (type, data) => { try { if (typeof lpxPush === 'function' && LR.mode !== 'preview') lpxPush(type, data); } catch (e) { } };
const a2lQ = q => String(q || '').replace(/^\d+\.\s*/, '');
function a2lRight(q, v) { if (v == null || v === '') return false; if (q.t === 'mc') return String(v) === String(q.a); if (q.t === 'ox') return String(v).toUpperCase() === String(q.a).toUpperCase(); if (q.t === 'essay') return !!String(v).trim(); const n = s => String(s || '').toLowerCase().replace(/\s+/g, ''); if (n(v) && n(v) === n(q.a)) return true; const parts = String(q.a || '').split(/[,/·]/).map(n).filter(Boolean); return parts.length > 1 && parts.every(x => n(v).includes(x)); }
function a2lScore(it, ans) { let sc = 0, tot = 0; const ok = (it.qs || []).map((q, k) => { const p = +q.pts || 1; tot += p; const r = a2lRight(q, ans[k]); if (r) sc += p; return r; }); return { score: Math.round(sc / Math.max(1, tot) * 100), ok }; }
const a2lFiles = (F, label) => (F || []).length ? `<div class="a2lfiles"><b>${esc(label)}</b>${F.map(f => `<span class="a2lchip">${ico('book', 13)} ${esc(f.name)} <small>${esc(a2lSize(f.size))}</small></span>`).join('')}<small class="mini">파일은 운영 서버에서 내려받습니다(데모: 이름만 표시).</small></div>` : '';
const a2lMe = () => { const st = a2lRoom(); if (!st || !LR.me) return null; const sid = LR.me.sid || LR.me.id; return (st.members || []).find(m => m && (m.sid === sid || m.id === sid || (m.extra && m.extra.학번 === sid) || m.name === sid)) || null; };

/* ── 시험 · 퀴즈 ── */
function a2lCan(it, rec) {
  const R = it.rules; const T = rec.tries || []; if (!R) return { ok: true };
  const now = Date.now(), f = a2lT(R.from), to = a2lEnd(R.to);
  if (f && now < f) return { ok: false, why: `응시 기간 전입니다. ${a2lDT(R.from)}부터 응시할 수 있습니다.` };
  if (to && now > to) return { ok: false, why: '응시 기간이 끝났습니다.' };
  const best = T.length ? Math.max(...T.map(t => +t.score || 0)) : null; const passed = R.pass && R.pass.on && best != null && best >= R.pass.v; const m = (R.retry || {}).mode || 'none', v = +(R.retry || {}).v || 0;
  if (m === 'none' && T.length >= 1) return { ok: false, why: '재응시할 수 없는 시험입니다.' };
  if (m === 'count') { if (passed) return { ok: false, why: '통과했으므로 더 응시할 수 없습니다.' }; if (T.length >= v) return { ok: false, why: `응시 횟수(${v}회)를 모두 사용했습니다.` }; }
  if (m === 'score' && best != null && best >= v) return { ok: false, why: `도달 점수(${v}점)에 이르러 응시를 마쳤습니다.` };
  return { ok: true, left: m === 'count' ? v - T.length : m === 'none' ? 1 - T.length : null };
}
function a2lShow(it) { const R = it.rules; if (!R) return 'now'; if (R.show === 'never') return 'never'; if (R.show === 'end') { const to = a2lEnd(R.to); return to && Date.now() > to ? 'now' : 'later'; } return 'now'; }
function a2lInfo(rows) { return `<dl class="a2linfo">${rows.filter(r => r && r[1]).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`; }
function a2lExamInfo(it, rec) { const R = it.rules || {}; const T = rec.tries || []; const rt = R.retry || {};
  return a2lInfo([['응시 기간', R.from || R.to ? esc(`${a2lDT(R.from) || '지금'} ~ ${a2lDT(R.to) || '제한 없음'}`) : '제한 없음'], ['시험 시간', it.time ? `${it.time}분 · 지나면 자동 제출` : ''], ['재응시', !it.rules ? '제한 없음' : rt.mode === 'count' ? `최대 ${rt.v}회(통과하면 종료)` : rt.mode === 'score' ? `${rt.v}점에 도달할 때까지` : '불가(1회 응시)'], ['통과 점수', R.pass ? (R.pass.on ? `${R.pass.v}점` : '없음 — 점수만 알려 드립니다') : ''], ['점수 · 풀이', R.show ? esc({ after: '제출 직후 공개', end: '응시 기간 종료 후 공개', never: '공개하지 않음' }[R.show] || '') : ''], ['내 응시', T.length ? `${T.length}회` : '아직 없음']]); }
function a2lResult(it, rec) { const T = rec.tries || []; if (!T.length) return ''; const last = T[T.length - 1]; const R = it.rules || {}; const sh = a2lShow(it);
  if (sh === 'never') return `<div class="a2lres"><b>제출했습니다.</b><small>${esc(a2lDT(last.at).slice(0, 16))} · 점수와 풀이는 공개하지 않습니다.</small></div>`;
  if (sh === 'later') return `<div class="a2lres"><b>제출했습니다.</b><small>점수와 풀이는 응시 기간 종료(${esc(a2lDT(R.to))}) 후 공개됩니다.</small></div>`;
  const best = Math.max(...T.map(t => +t.score || 0)); const pass = R.pass && R.pass.on ? (last.score >= R.pass.v ? '<span class="a2ok">통과</span>' : '<span class="a2no">미통과</span>') : '';
  return `<div class="a2lres"><div class="qres"><b>${last.score}</b><small>점 · ${T.length}회차${T.length > 1 ? ` · 최고 ${best}점` : ''}</small></div>${pass}
    <ol class="a2lsol">${(it.qs || []).map((q, k) => { const v = (last.ans || [])[k]; const ok = a2lRight(q, v); const disp = x => q.t === 'mc' ? ((q.opts || [])[+x] ?? '') : x; return `<li class="${ok ? 'ok' : 'ng'}"><b>${ok ? '✓ 정답' : '✗ 오답'} · ${esc(a2lQ(q.q))}</b><small>내 답: ${esc(disp(v) || '미응답')}${q.t !== 'essay' ? ` · 정답: ${esc(disp(q.a))}` : ' · 서술형은 운영자가 확인합니다'}</small>${q.exp ? `<small class="exp">해설: ${esc(q.exp)}</small>` : ''}</li>`; }).join('')}</ol></div>`; }
function a2lExamForm(c, it) { const run = A2L.run && A2L.run.item === it.id ? A2L.run : null; const ord = run && run.order ? run.order : (it.qs || []).map((_, k) => k); const ans = (run && run.ans) || {};
  return `<form id="a2qz" class="a2lqz" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${run && run.end ? `<div class="a2tm" id="a2tm" data-end="${run.end}" role="timer" aria-live="off">남은 시간 <b>--:--</b></div>` : ''}${ord.map((k, n) => { const q = it.qs[k]; return `<fieldset class="q" data-k="${k}"><legend><span>${n + 1}</span>${esc(a2lQ(q.q))}${q.pts ? ` <small class="mini">${q.pts}점</small>` : ''}</legend>${q.img ? `<img class="a2lqimg" src="${esc(q.img)}" alt="문항 첨부 이미지">` : ''}${a2lFiles(q.files, '첨부')}
    ${q.t === 'mc' || q.t === 'ox' ? `<div class="opts">${(q.t === 'ox' ? ['O', 'X'] : q.opts).map((o, j) => { const v = q.t === 'ox' ? o : String(j); return `<label><input type="radio" name="q${k}" value="${esc(v)}" ${String(ans[k]) === v ? 'checked' : ''}><span>${esc(o)}</span></label>`; }).join('')}</div>` : `<textarea name="q${k}" rows="${q.t === 'essay' ? 5 : 2}" maxlength="2000" placeholder="답을 입력하세요">${esc(ans[k] || '')}</textarea>`}</fieldset>`; }).join('') || '<p>문항이 없습니다.</p>'}<button class="lbtn pri" type="submit">제출하고 채점</button></form>`; }
function a2lQna(c, it) { const mine = (LR.lp.a2q || []).filter(x => x.cls === c.id && x.item === it.id); const st = a2lRoom(); const A = st && Array.isArray(st.examQs) ? st.examQs : (LR.mine && LR.mine.a2qa) || [];
  return `<details class="a2lqa" ${A2L.qaOpen ? 'open' : ''}><summary>${ico('bell', 15)} 시험 질문하기(1:1) ${mine.length ? `<b>${mine.length}</b>` : ''}</summary>${mine.map(x => { const r = A.find(y => y.id === x.id); return `<div class="a2lqi"><p><b>Q.</b> ${esc(x.q)}</p><small class="mini">${esc(a2lDT(x.at).slice(0, 16))}</small>${r && r.a ? `<p class="a2la"><b>A.</b> ${esc(r.a)}</p>` : '<p class="mini">답변을 기다리고 있습니다.</p>'}</div>`; }).join('')}
    <textarea id="a2qq" rows="2" maxlength="2000" placeholder="시험 내용 · 채점에 대해 운영자에게 1:1로 질문합니다."></textarea><button type="button" class="lbtn sm" data-a2="ask" data-c="${esc(c.id)}" data-i="${esc(it.id)}">질문 보내기</button></details>`; }
function a2lExam(c, it) {
  const rec = a2lPeek(c.id, it.id); const can = a2lCan(it, rec); const running = A2L.run && A2L.run.item === it.id;
  let h = a2lExamInfo(it, rec) + a2lResult(it, rec);
  if (running) h += a2lExamForm(c, it);
  else if (can.ok) h += (it.type === 'exam' || it.time) && (it.qs || []).length ? `<div class="a2lgo"><p class="mini">${(it.qs || []).length}문항${it.time ? ` · ${it.time}분` : ''}${can.left != null ? ` · 남은 응시 ${can.left}회` : ''}. 시작하면 ${it.time ? '시간이 흐르고, 시간이 끝나면 자동으로 제출됩니다.' : '바로 풀 수 있습니다.'}</p><button type="button" class="lbtn pri" data-a2="start" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${(rec.tries || []).length ? '다시 응시하기' : '응시 시작'}</button></div>` : a2lExamForm(c, it);
  else h += `<p class="a2lwhy">${esc(can.why)}</p>`;
  return h + a2lQna(c, it);
}

/* ── 과제 ── */
function a2lAsg(c, it) {
  const rec = a2lPeek(c.id, it.id); const r = (LR.lp.cls[c.id] || {}); const R = it.rules || {}; const m = (LR.mine.cls || {})[c.id] || {}; const H = rec.subs || (r.sub ? [{ at: r.sub.at, text: r.sub.text, files: [] }] : []);
  const due = a2lT(R.due); const closed = due && Date.now() > due; const st = m.st && m.st !== 'none' ? m.st : (H.length ? 'submitted' : 'none'); const rt = R.retry || {};
  let why = ''; if (closed) why = '제출 기한이 지났습니다.'; else if (H.length && st === 'graded') why = '통과한 과제입니다.'; else if (H.length && st !== 'returned' && R.resubmit === false) why = '다시 제출할 수 없는 과제입니다.'; else if (H.length && st !== 'returned' && rt.mode === 'count' && H.length >= rt.v) why = `제출 횟수(${rt.v}회)를 모두 사용했습니다.`; else if (H.length && st === 'failed' && rt.mode === 'none') why = '재응시할 수 없는 과제입니다.';
  const stTxt = { submitted: '검수 대기', graded: '통과', returned: '재제출 요청', failed: '미통과' }[st] || '';
  return a2lInfo([['제출 마감', R.due ? esc(a2lDT(R.due)) : it.due ? `공개 후 ${it.due}일` : ''], ['제출물', esc(it.deliv || '')], ['다시 제출', it.rules ? (R.resubmit === false ? '불가' : '기한 내 제한 없이') : ''], ['통과 점수', R.pass ? (R.pass.on ? `${R.pass.v}점` : '없음 — 점수만 알려 드립니다') : '']]) +
    `<div class="body">${nl(it.desc || '과제 안내를 확인하고 제출하세요.')}</div>${a2lFiles(it.files, '과제 자료')}
    ${stTxt ? `<p class="fbk ${esc(st)}"><b>${esc(stTxt)}</b>${m.score != null ? ` · ${esc(m.score)}점${R.pass && R.pass.on ? (m.score >= R.pass.v ? ' (통과)' : ' (미통과)') : ''}` : ''}${m.fb ? ' — ' + esc(m.fb) : ''}</p>` : ''}
    ${why ? `<p class="a2lwhy">${esc(why)}</p>` : `<form id="a2as" class="a2las" data-c="${esc(c.id)}" data-i="${esc(it.id)}"><textarea name="t" rows="6" maxlength="4000" placeholder="제출 내용 · 결과물 링크">${esc(H.length ? H[H.length - 1].text || '' : '')}</textarea><label class="a2lfile">첨부 파일(최대 5개 · 파일당 100MB)<input type="file" name="f" multiple></label><button class="lbtn pri" type="submit">${H.length ? '다시 제출' : '과제 제출'}</button></form>`}
    ${H.length ? `<details class="a2lhist" open><summary>제출 이력 ${H.length}건</summary><ol>${[...H].reverse().map((s, i) => `<li><small>${H.length - i}차 · ${esc(a2lDT(s.at).slice(0, 16))}</small><p>${nl(String(s.text || '').slice(0, 600))}</p>${(s.files || []).length ? `<small class="mini">첨부: ${s.files.map(f => esc(f.name)).join(', ')}</small>` : ''}</li>`).join('')}</ol></details>` : ''}`;
}

/* ── 설문 ── */
function a2lSurvey(c, it) {
  const rec = a2lPeek(c.id, it.id); const R = it.rules || {}; const Q = it.qs || [];
  if (rec.sv) return `<div class="a2ldone">${ico('check', 22)}<b>${esc(it.doneMsg || '설문에 참여해 주셔서 감사합니다.')}</b><small>${esc(a2lDT(rec.sv.at).slice(0, 16))} 응답 완료</small></div>`;
  const f = a2lT(R.from), to = a2lEnd(R.to); const now = Date.now();
  const info = a2lInfo([['응시 기간', R.from || R.to ? esc(`${R.from || '지금'} ~ ${R.to || '제한 없음'}`) : ''], ['예상 소요 시간', it.mins ? `약 ${it.mins}분` : ''], ['문항', Q.length ? `${Q.length}문항 · <span class="a2req">*</span> 필수` : '']]);
  if (f && now < f) return info + `<p class="a2lwhy">설문 기간 전입니다. ${esc(R.from)}부터 참여할 수 있습니다.</p>`;
  if (to && now > to) return info + '<p class="a2lwhy">설문 기간이 끝났습니다.</p>';
  if (!Q.length || !Q[0].t) return null;
  return info + `<form id="a2sv" class="a2lsv" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${Q.map((q, k) => `<fieldset class="q" data-k="${k}" data-t="${esc(q.t)}" data-max="${+q.max || 0}"><legend><span>${k + 1}</span>${esc(q.q)}${q.req ? ' <b class="a2req" aria-label="필수">*</b>' : ''}${q.t === 'multiN' ? ` <small class="mini">최대 ${q.max}개</small>` : q.t === 'multi' ? ' <small class="mini">여러 개 선택</small>' : ''}</legend>
    ${q.t === 'text' ? `<textarea name="s${k}" rows="3" maxlength="2000" placeholder="자유롭게 적어 주세요"></textarea>` : `<div class="opts">${q.opts.map((o, j) => `<label><input type="${q.t === 'single' ? 'radio' : 'checkbox'}" name="s${k}" value="${j}"><span>${esc(o)}</span></label>`).join('')}${q.etc ? `<label class="a2etc"><input type="${q.t === 'single' ? 'radio' : 'checkbox'}" name="s${k}" value="etc"><span>기타(직접 입력)</span><input type="text" name="e${k}" maxlength="200" aria-label="기타 직접 입력"></label>` : ''}</div>`}</fieldset>`).join('')}<button class="lbtn pri" type="submit">설문 제출</button></form>`;
}

/* ── 강의(라이브 · 오프라인) 공통 ── */
function a2lLec(c, it) { const st = a2lPeek(c.id, it.id); const live = it.type === 'live';
  return a2lInfo([['일시', it.from || it.to ? esc(`${a2lDT(it.from) || ''}${it.to ? ' ~ ' + a2lDT(it.to) : ''}`) : ''], ['장소', esc(it.place || '')], ['찾아오는 방법', it.way ? nl(it.way) : ''], ['강의실', live && it.link ? `<a class="lbtn sm" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">강의실 입장 ↗</a>` : ''], ['준비물', esc(it.prep || '')]]) +
    `<div class="body">${nl(it.desc || `${live ? '라이브' : '오프라인'} 강의 안내를 확인하세요.`)}</div>${a2lFiles(it.files, '강의 자료')}${live ? '<p class="mini">라이브 일정 3일 전에 참석 안내 알림이 발송됩니다.</p>' : '<p class="mini">출석은 현장에서 운영자가 확인합니다.</p>'}<button class="lbtn ${st.done ? 'ghost' : 'pri'}" data-lact="done" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${st.done ? '완료됨' : '완료로 표시'}</button>`; }
const a2lExtras = it => (it.desc || it.prep || (it.files || []).length) ? `<div class="a2lex">${it.desc ? `<div class="body">${nl(it.desc)}</div>` : ''}${it.prep ? a2lInfo([['준비물', esc(it.prep)]]) : ''}${a2lFiles(it.files, '강의 자료')}</div>` : '';

/* ── 영상 구간 퀴즈 ── */
const a2lCueDone = (rec, cu, ci) => cu.qs.every((_, qi) => (rec.vq || {})[`${ci}.${qi}`]);
function a2lCues(c, it) { const rec = a2lPeek(c.id, it.id); const V = it.vq || []; if (!V.length) return '';
  return `<div class="a2cues"><b>구간 퀴즈 ${V.length}개</b><small class="mini">재생하다가 퀴즈 구간에서 자동으로 멈춥니다. 풀면 바로 정답을 확인하고 이어서 봅니다.</small><div>${V.map((cu, ci) => `<button type="button" class="a2cue ${a2lCueDone(rec, cu, ci) ? 'on' : ''}" data-a2="cue" data-ci="${ci}">${a2lCueDone(rec, cu, ci) ? ico('check', 12) : ''} ${a2lmmss(cu.at)} · ${cu.qs.length}문항</button>`).join('')}</div></div><div class="a2ov" id="a2ov" hidden></div>`; }
function a2lCueOpen(ci, resume) { const ctx = A2L.cueCtx; if (!ctx) return; const it = ctx.it, cu = (it.vq || [])[ci]; const ov = $('#a2ov'); if (!cu || !ov) return; const rec = a2lRec(ctx.c.id, it.id); A2L.cue = { ci, resume };
  ov.hidden = false; ov.innerHTML = `<div class="a2ovb" role="dialog" aria-label="구간 퀴즈"><b class="a2ovh">${ico('edit', 16)} 구간 퀴즈 · ${a2lmmss(cu.at)}</b><form id="a2vqf" data-ci="${ci}">${cu.qs.map((q, qi) => { const k = `${ci}.${qi}`, done = (rec.vq || {})[k]; const disp = x => q.t === 'mc' ? ((q.opts || [])[+x] ?? '') : x;
    return `<fieldset class="q"><legend><span>${qi + 1}</span>${esc(q.q)}</legend>${q.t === 'mc' || q.t === 'ox' ? `<div class="opts">${(q.t === 'ox' ? ['O', 'X'] : q.opts).map((o, j) => { const v = q.t === 'ox' ? o : String(j); return `<label><input type="radio" name="v${qi}" value="${esc(v)}" ${done && String(done.ans) === v ? 'checked' : ''} ${done ? 'disabled' : ''}><span>${esc(o)}</span></label>`; }).join('')}</div>` : `<input name="v${qi}" maxlength="200" value="${esc(done ? done.ans : '')}" ${done ? 'disabled' : ''} placeholder="답 입력" aria-label="답">`}${done ? `<p class="a2fb ${done.ok ? 'ok' : 'ng'}">${done.ok ? '정답입니다!' : `오답입니다. 정답: ${esc(disp(q.a))}`}</p>` : ''}</fieldset>`; }).join('')}
    ${a2lCueDone(rec, cu, ci) ? `<button type="button" class="lbtn pri" data-a2="vqgo">계속 보기 ▶</button>` : `<button class="lbtn pri" type="submit">제출하고 정답 확인</button>`}</form></div>`; const f = ov.querySelector('input:not([disabled]),button'); f && f.focus(); }
function a2lPlayer(c, it) { const dur = +it.dur || 180; const rec = a2lPeek(c.id, it.id); if (!A2L.vp || A2L.vp.iid !== it.id) A2L.vp = { cid: c.id, iid: it.id, t: Math.min(+rec.pos || 0, dur), dur, play: false, rate: 1 };
  return `<div class="a2vp" id="a2vp"><div class="a2vps"><button type="button" class="a2play" data-a2="vp" aria-label="재생 · 일시정지">${A2L.vp.play ? '❚❚' : '▶'}</button><span><b id="a2vpt">${a2lmmss(A2L.vp.t)}</b> / ${a2lmmss(dur)}</span><small>${it.src === 'library' || it.src === 'upload' ? '업로드 영상' : '영상'} · 데모 플레이어</small></div>
    <div class="a2vpb" aria-hidden="true"><i id="a2vpi" style="width:${A2L.vp.t / dur * 100}%"></i>${(it.vq || []).map(cu => `<em style="left:${Math.min(100, cu.at / dur * 100)}%"></em>`).join('')}</div>
    <div class="a2vpc"><button type="button" class="lbtn sm ghost" data-a2="vpre">처음부터</button><button type="button" class="lbtn sm ghost" data-a2="vpfast">${A2L.vp.rate > 1 ? '보통 속도' : '빠르게 ×8(데모)'}</button></div></div>
    <div class="wbar"><i style="width:${Math.round((rec.w || 0) * 100)}%"></i></div><small class="mini" id="a2vpw">시청 ${Math.round((rec.w || 0) * 100)}% · 끝까지 보면 완료</small>`; }
function a2lVpTick() { const V = A2L.vp; if (!V || !V.play) return; const box = $('#a2vp'); if (!box) { V.play = false; return; } const ctx = A2L.cueCtx; const it = ctx && ctx.it; if (!it || it.id !== V.iid) { V.play = false; return; }
  const prev = V.t; V.t = Math.min(V.dur, V.t + 0.25 * V.rate); const rec = a2lRec(V.cid, V.iid);
  const ci = (it.vq || []).findIndex((cu, i) => !a2lCueDone(rec, cu, i) && cu.at <= V.t && cu.at >= Math.min(prev, cu.at));
  if (ci >= 0) { V.t = it.vq[ci].at; V.play = false; a2lVpPaint(); a2lCueOpen(ci, () => { V.play = true; a2lVpPaint(); }); return; }
  rec.pos = Math.floor(V.t); const w = Math.round(V.t / V.dur * 100) / 100; if (w > (rec.w || 0)) rec.w = w;
  if (V.t >= V.dur) { V.play = false; rec.w = 1; if (!rec.done) { rec.done = true; toast('시청 완료로 기록했습니다.', 'ok'); } LR.api.save(); a2lVpPaint(); return; }
  if (Math.floor(V.t) % 5 === 0 && Math.floor(prev) % 5 !== 0) LR.api.save(); a2lVpPaint(); }
function a2lVpPaint() { const V = A2L.vp; if (!V) return; const t = $('#a2vpt'), i = $('#a2vpi'), p = $('#a2vp .a2play'), w = $('#a2vpw'); if (t) t.textContent = a2lmmss(V.t); if (i) i.style.width = (V.t / V.dur * 100) + '%'; if (p) p.textContent = V.play ? '❚❚' : '▶'; const rec = a2lPeek(V.cid, V.iid); if (w) w.textContent = `시청 ${Math.round((rec.w || 0) * 100)}%${rec.done ? ' · 완료' : ' · 끝까지 보면 완료'}`; const b = $('.a2vp ~ .wbar i'); if (b) b.style.width = Math.round((rec.w || 0) * 100) + '%'; }
/* YouTube 재생 중 구간 감시(재생바 자동 정지) */
{ const base = ytMount; ytMount = function (el) { const P = base(el); try { a2lYtWatch(el); } catch (e) { } return P; }; }
function a2lYtWatch(el) { const ctx = A2L.cueCtx; if (!ctx || el.dataset.kind !== 'cls' || el.dataset.item !== ctx.it.id || !(ctx.it.vq || []).length) return; const it = ctx.it;
  const iv = setInterval(() => { if (!document.getElementById('yt') || !A2L.cueCtx || A2L.cueCtx.it !== it) { clearInterval(iv); return; } if (A2L.cue) return; let p = null; try { p = window.YT && YT.get ? YT.get('yt') : null; } catch (e) { } if (!p || !p.getCurrentTime) return;
    const t = p.getCurrentTime(); const rec = a2lPeek(ctx.c.id, it.id); const ci = (it.vq || []).findIndex((cu, i) => !a2lCueDone(rec, cu, i) && t >= cu.at); if (ci < 0) return;
    try { p.pauseVideo(); if (t > it.vq[ci].at + 2) p.seekTo(it.vq[ci].at, true); } catch (e) { } a2lCueOpen(ci, () => { try { p.playVideo(); } catch (e) { } }); }, 500); }
function a2lVideo(c, it) { const st = a2lPeek(c.id, it.id);
  if (it.conv && it.conv !== '완료') return `<div class="novid a2lconv">${ico('video', 28)}<span>${it.conv === '최적화 실패' ? '영상을 준비하고 있습니다. 잠시 후 다시 확인하세요.' : '영상을 최적화(변환)하고 있습니다. 완료되면 시청할 수 있습니다.'}</span></div>`;
  if (it.src === 'link' && it.link) return `<div class="novid a2llink">${ico('video', 28)}<span>${/vimeo\.com/i.test(it.link) ? 'Vimeo' : '외부'} 영상은 새 창에서 재생됩니다.</span><a class="lbtn sm" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">영상 보기 ↗</a></div><button class="lbtn ${st.done ? 'ghost' : 'pri'}" data-lact="done" data-c="${esc(c.id)}" data-i="${esc(it.id)}">${st.done ? '완료됨' : '다 봤어요'}</button>`;
  if ((it.vq || []).length || ['upload', 'library'].includes(it.src)) return a2lPlayer(c, it);
  return null; }

/* ── 코스 화면 감싸기 ── */
function a2lSlice(h, a, startMk, endMk) { const s = h.indexOf(startMk, a); if (s < 0) return null; const e0 = h.indexOf(endMk, s); if (e0 < 0) return null; const e = endMk === '</form>' ? e0 + 7 : h.indexOf('</button>', e0) + 9; return e > s ? [s, e] : null; }
{ const base = viewCourse; viewCourse = function (id, itemId) {
  let h = base(id, itemId); try {
    if (!LR.me || !SITE()) return h; const c = SITE().classes.find(x => x.id === id); if (!c) return h; const r = LR.lp.cls[c.id] || { items: {} }; const RI = r.items || {};
    const it = c.items.find(x => x.id === itemId) || c.items.find(x => !(RI[x.id] || {}).done) || c.items[0]; A2L.cueCtx = it ? { c, it } : null; if (!it || !it.vq) A2L.cue = null; if (A2L.vp && (!it || A2L.vp.iid !== it.id)) A2L.vp = null; if (A2L.run && (!it || A2L.run.item !== it.id) && !A2L.run.end) A2L.run = null;
    const K = c.crit || []; if (K.length || c.thr) { h = h.replace(`수료 기준 진도 ${c.thr || 80}%`, `수료 기준 ${c.thr || 80}%${K.length ? ' · 항목별 비율' : ''}`); if (K.length) { const rate = a2lRate(c); h = h.replace(new RegExp(`<a class="lbtn sm wht" href="#cert/${c.id.replace(/[^\w-]/g, '')}">[\\s\\S]*?</a>`), ''); if (rate >= (c.thr || 80) || a2lMyCert(c.id)) h = h.replace('</div></section>\n    <section class="crsb">', `<a class="lbtn sm wht" href="#cert/${esc(c.id)}">${ico('award', 15)} 수료증 보기</a></div></section>\n    <section class="crsb">`); } }
    if (!it) return h; const a = h.indexOf('</h2>', h.indexOf('<div class="imain">')); if (a < 0) return h;
    let seg = null, mine = null;
    if (it.type === 'quiz' || it.type === 'exam') { const fs = h.indexOf('<form id="qz"', a); if (fs > 0) { const st = Math.max(h.lastIndexOf('<div class="qres">', fs), h.lastIndexOf('<p class="mini">', fs)); const e = h.indexOf('</form>', fs); if (st >= a && e > st) seg = [st, e + 7]; } mine = a2lExam(c, it); }
    else if (it.type === 'assign') { seg = a2lSlice(h, a, '<div class="body">', 'data-lact="asg"'); mine = a2lAsg(c, it); }
    else if (it.type === 'survey') { seg = a2lSlice(h, a, '<div class="body">', 'data-lact="done"'); mine = a2lSurvey(c, it); }
    else if (it.type === 'live' || it.type === 'offline') { seg = a2lSlice(h, a, '<div class="body">', 'data-lact="done"'); mine = a2lLec(c, it); }
    else if (it.type === 'video') { const v = a2lVideo(c, it); if (v) { seg = a2lSlice(h, a, '<div class="novid">', 'data-lact="done"'); mine = v; } const ex = a2lExtras(it) + a2lCues(c, it); if (ex) { const n = h.indexOf('<div class="inav">', a); if (n > 0) h = h.slice(0, n) + ex + h.slice(n); } }
    if (seg && mine != null) h = h.slice(0, seg[0]) + `<div class="a2lmain">${mine}</div>` + h.slice(seg[1]);
  } catch (e) { console.error(e); } return h; }; }

/* ── 항목별 수료 기준 · 수료증 ── */
function a2lItemDone(c, it, rec) { const R = it.rules || {}; const m = (LR.mine.cls || {})[c.id] || {};
  if (it.type === 'quiz' || it.type === 'exam') { const T = rec.tries || []; const best = T.length ? Math.max(...T.map(t => +t.score || 0)) : rec.score; if (best == null) return false; return !(R.pass && R.pass.on) || best >= R.pass.v; }
  if (it.type === 'assign') { if (!rec.done && !(rec.subs || []).length) return false; if (!(R.pass && R.pass.on)) return true; return m.st === 'graded' && (m.score == null || m.score >= R.pass.v); }
  return !!rec.done; }
function a2lRate(c) { const K = c.crit || []; if (!K.length) return null; const r = (LR.lp.cls || {})[c.id] || { items: {} }; const tot = K.reduce((a, x) => a + (+x.w || 0), 0) || 1; let s = 0; K.forEach(k => { const it = c.items.find(x => x.id === k.id); if (it && a2lItemDone(c, it, (r.items || {})[it.id] || {})) s += +k.w || 0; }); return Math.round(s / tot * 100); }
function a2lMyCert(cid) { const st = a2lRoom(); const m = a2lMe(); if (!st || !m) return null; return (st.certs || []).find(x => x && x.cls === cid && x.who === m.id) || null; }
{ const base = myStats; myStats = function () { const st = base(); try { st.courses.forEach(x => { const rate = a2lRate(x.c); const k = a2lMyCert(x.c.id); if (rate != null) { x.rate = rate; x.done = rate >= (x.c.thr || 80); } if (k) x.done = true; }); } catch (e) { console.error(e); } return st; }; }
function a2lCertHTML(T, d) { const fill = s => String(s || '').replace(/\{(이름|과정명|교육기간|교육시간|발급일|발급번호)\}/g, (_, k) => String({ 이름: d.name, 과정명: d.cls, 교육기간: d.period, 교육시간: d.hours, 발급일: d.at, 발급번호: d.no }[k] ?? '')); const F = T.fields || {}; const row = (on, k, v) => on && v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
  return `<div class="certp a2lcert ${T.design === 'b' ? 'b' : ''}">${T.logo ? `<img class="a2llogo" src="${esc(T.logo)}" alt="기관 로고">` : ''}<small>CERTIFICATE OF COMPLETION</small>${T.showNo !== false && d.no ? `<p class="a2lno">제 ${esc(d.no)} 호</p>` : ''}<h1>${esc(T.title || '수료증')}</h1><dl class="a2lf">${row(F.name !== false, '성명', d.name)}${row(F.cls !== false, '과정명', d.cls)}${row(F.period !== false, '교육기간', d.period)}${row(F.hours !== false, '교육시간', d.hours ? d.hours + '시간' : '')}</dl><p>${esc(fill(T.body || '위 사람은 「{과정명}」 과정을 성실히 이수하였기에 이 증서를 드립니다.')).replace(/\n/g, '<br>')}</p>${T.showDate !== false ? `<p class="cd">${esc(d.at)}</p>` : ''}<b class="co">${esc(T.org || SITE().org.name)}${T.rep ? ` 대표 ${esc(T.rep)}` : ''} ${T.seal ? `<img class="a2lseal" src="${esc(T.seal)}" alt="직인">` : ''}</b></div>`; }
function a2lCertData(cid) { const st = myStats(); const x = st.courses.find(y => y.c.id === cid); if (!x || !x.done) return null; const c = x.c; const k = a2lMyCert(cid) || {}; const nm = LR.me.name || [LR.me.sid, LR.me.dept].filter(Boolean).join(' · ');
  return { x, c, T: { ...(c.certTpl || {}), ...(k.design ? { design: k.design } : {}) }, d: { name: nm, cls: c.name, period: k.from && k.to ? `${k.from} ~ ${k.to}` : `${c.start || ''} ~ ${c.end || ''}`, hours: k.hours || c.hours || '', no: k.no || '', at: k.at || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) } }; }
{ const base = viewCert; viewCert = function (cid) { if (!LR.me) return base(cid); try { const st0 = myStats(); const x0 = st0.courses.find(y => y.c.id === cid); const D = x0 && x0.c.cert === 'manual' && !a2lMyCert(cid) ? null : a2lCertData(cid); if (!D) { const x = x0; if (x && x.c.cert === 'manual') return `<section class="sec"><div class="in narrow"><h1>수료증</h1><p class="lead">이 과정의 수료증은 운영자가 직접 발급합니다. 발급되면 여기에서 내려받을 수 있습니다.</p>${btn('내 과정으로', '#my', 'ghost')}</div></section>`; if (x && x.rate != null) return `<section class="sec"><div class="in narrow"><h1>수료증</h1><p class="lead">항목별 수료 기준(${x.c.thr || 80}%)을 채우면 수료증이 발급됩니다. 지금 이수율 ${x.rate}%입니다.</p>${btn('과정으로', '#c/' + cid, 'ghost')}</div></section>`; return base(cid); }
    return `<section class="sec"><div class="in narrow">${a2lCertHTML(D.T, D.d)}<div class="cta noprint"><button class="lbtn" data-a2="certprint" data-c="${esc(cid)}">인쇄 · PDF 저장</button><button class="lbtn ghost" data-a2="certfile" data-c="${esc(cid)}">파일로 내려받기</button>${btn('내 과정으로', '#my', 'ghost')}</div></div></section>`; } catch (e) { console.error(e); return base(cid); } }; }

/* ── 이벤트 ── */
document.addEventListener('click', e => { const el = e.target.closest('[data-a2]'); if (!el) return; const k = el.dataset.a2; e.preventDefault(); if (!LR.me) return;
  const c = el.dataset.c && SITE().classes.find(x => x.id === el.dataset.c); const it = c && c.items.find(x => x.id === el.dataset.i);
  if (k === 'start' && it) { const can = a2lCan(it, a2lPeek(c.id, it.id)); if (!can.ok) { toast(can.why, 'warn'); return; } const order = (it.qs || []).map((_, i) => i); if (it.rules && it.rules.shuffle) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } A2L.run = { item: it.id, cls: c.id, start: Date.now(), end: it.time ? Date.now() + it.time * 60000 : 0, order, ans: {} }; lrender(); }
  if (k === 'ask' && it) { const v = ($('#a2qq') || {}).value || ''; if (!v.trim()) { toast('질문을 입력하세요.', 'warn'); return; } const x = { id: 'eq' + Date.now().toString(36), cls: c.id, item: it.id, q: v.trim().slice(0, 2000), at: new Date().toISOString() }; (LR.lp.a2q = LR.lp.a2q || []).push(x); LR.lp.a2q = LR.lp.a2q.slice(-50); LR.api.save(); a2lPush('a2-q', { cls: c.id, item: it.id, q: x.q, qid: x.id }); toast('질문을 보냈습니다. 답변이 오면 여기에 표시됩니다.', 'ok'); lrender(); }
  if (k === 'cue') { const ci = +el.dataset.ci; if (A2L.vp) { A2L.vp.play = false; a2lVpPaint(); } a2lCueOpen(ci, A2L.vp ? () => { } : null); }
  if (k === 'vqgo') { const ov = $('#a2ov'); if (ov) { ov.hidden = true; ov.innerHTML = ''; } const r = A2L.cue && A2L.cue.resume; A2L.cue = null; if (r) r(); if (A2L.cueCtx) { const s = $(`.a2cue[data-ci]`); void s; } }
  if (k === 'vp' && A2L.vp) { if (A2L.cue) return; A2L.vp.play = !A2L.vp.play; if (A2L.vp.t >= A2L.vp.dur) A2L.vp.t = 0; a2lVpPaint(); }
  if (k === 'vpre' && A2L.vp) { A2L.vp.t = 0; a2lVpPaint(); }
  if (k === 'vpfast' && A2L.vp) { A2L.vp.rate = A2L.vp.rate > 1 ? 1 : 8; el.textContent = A2L.vp.rate > 1 ? '보통 속도' : '빠르게 ×8(데모)'; }
  if ((k === 'certprint' || k === 'certfile') && el.dataset.c) { const D = a2lCertData(el.dataset.c); if (!D) return; a2lPush('a2-certdl', { cls: el.dataset.c }); (LR.lp.a2cert = LR.lp.a2cert || {})[el.dataset.c] = new Date().toISOString(); LR.api.save();
    if (k === 'certprint') window.print(); else { const css = 'body{font-family:Pretendard,"Malgun Gothic",serif;background:#f4f2ec;margin:0}.certp{max-width:720px;margin:24px auto;background:#fff;border:10px double #B08D3C;padding:44px;text-align:center}.certp.b{border:0;border-top:14px solid #15173B;border-bottom:14px solid #D6246E}h1{letter-spacing:.3em;font-size:40px}.a2lf{display:grid;grid-template-columns:100px 1fr;gap:6px 14px;text-align:left;max-width:440px;margin:0 auto 18px}.a2lf dd{margin:0;font-weight:600}.a2llogo{max-height:52px}.a2lseal{height:56px;vertical-align:middle}.a2lno{text-align:left;color:#666;font-size:13px}p{line-height:1.8}';
      const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>수료증</title><style>${css}</style></head><body>${a2lCertHTML(D.T, D.d)}</body></html>`; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `수료증_${D.c.name}.html`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); toast('수료증 파일을 내려받았습니다.', 'ok'); } }
});
document.addEventListener('change', e => { const el = e.target;
  const f = el.closest('#a2qz'); if (f && A2L.run) { const fs = el.closest('fieldset'); if (fs) A2L.run.ans[+fs.dataset.k] = el.value; }
  const sv = el.closest('#a2sv fieldset'); if (sv && sv.dataset.t === 'multiN' && el.type === 'checkbox' && el.checked) { const mx = +sv.dataset.max || 0; if (mx && $$('input[type=checkbox]:checked', sv).length > mx) { el.checked = false; toast(`최대 ${mx}개까지 고를 수 있습니다.`, 'warn'); } }
  if (sv && el.name && /^e\d+$/.test(el.name) && el.value.trim()) { const o = sv.querySelector('input[value="etc"]'); if (o) o.checked = true; } });
document.addEventListener('input', e => { const f = e.target.closest('#a2qz'); if (f && A2L.run && e.target.tagName === 'TEXTAREA') { const fs = e.target.closest('fieldset'); if (fs) A2L.run.ans[+fs.dataset.k] = e.target.value; } });
document.addEventListener('submit', e => { const f = e.target; if (!['a2qz', 'a2as', 'a2sv', 'a2vqf'].includes(f.id)) return; e.preventDefault(); if (!LR.me) return; try {
  if (f.id === 'a2vqf') { const ctx = A2L.cueCtx; if (!ctx) return; const ci = +f.dataset.ci; const cu = ctx.it.vq[ci]; const rec = a2lRec(ctx.c.id, ctx.it.id); rec.vq = rec.vq || {}; const res = [];
    for (const [qi, q] of cu.qs.entries()) { const k = `${ci}.${qi}`; if (rec.vq[k]) continue; const inp = f.querySelector(`[name="v${qi}"]:checked`) || f.querySelector(`input[name="v${qi}"]:not([type=radio])`); const v = inp ? inp.value : ''; if (!String(v).trim()) { toast(`${qi + 1}번 문항에 답하세요.`, 'warn'); return; } res.push({ k, ok: a2lRight(q, v), ans: v }); }
    res.forEach(r => { rec.vq[r.k] = { ok: r.ok, ans: r.ans }; }); LR.api.save(); a2lPush('a2-vq', { cls: ctx.c.id, item: ctx.it.id, res }); const n = res.filter(r => r.ok).length; toast(n === res.length ? '모두 정답입니다!' : `${res.length}문항 중 ${n}개 정답`, n === res.length ? 'ok' : 'warn'); a2lCueOpen(ci, A2L.cue && A2L.cue.resume);
    const chip = $(`.a2cue[data-ci="${ci}"]`); if (chip) { chip.classList.add('on'); } return; }
  const c = SITE().classes.find(x => x.id === f.dataset.c); const it = c && c.items.find(x => x.id === f.dataset.i); if (!it) return;
  if (f.id === 'a2qz') { const rec = a2lRec(c.id, it.id); const can = a2lCan(it, rec); if (!can.ok) { toast(can.why, 'warn'); A2L.run = null; lrender(); return; }
    const ans = (it.qs || []).map((q, k) => { const x = f.querySelector(`[name="q${k}"]:checked`) || f.querySelector(`textarea[name="q${k}"]`); return x ? String(x.value || '').slice(0, 2000) : ''; }); const miss = ans.filter(v => !String(v).trim()).length;
    const r = a2lScore(it, ans); const R = it.rules || {}; const pass = R.pass && R.pass.on ? r.score >= R.pass.v : null; const sec = A2L.run && A2L.run.item === it.id ? Math.round((Date.now() - A2L.run.start) / 1000) : 0;
    rec.tries = [...(rec.tries || []), { at: new Date().toISOString(), score: r.score, pass, ans }].slice(-99); rec.score = Math.max(...rec.tries.map(t => t.score)); rec.done = true; LR.api.save();
    a2lPush('a2-try', { cls: c.id, item: it.id, ans, sec }); A2L.run = null; const sh = a2lShow(it); toast(sh === 'now' ? `${r.score}점입니다.${pass == null ? '' : pass ? ' 통과했습니다.' : ' 통과 점수에 못 미쳤습니다.'}` : `제출했습니다.${miss ? ` (미응답 ${miss}문항)` : ''}`, sh === 'now' && pass === false ? 'warn' : 'ok'); lrender(); return; }
  if (f.id === 'a2as') { const text = (f.t.value || '').trim(); const F = [...((f.f && f.f.files) || [])]; const bad = F.filter(x => x.size > 100 * 1024 ** 2); if (bad.length) { toast('파일당 100MB 이하만 올릴 수 있습니다.', 'warn'); return; } if (F.length > 5) { toast('첨부 파일은 최대 5개입니다.', 'warn'); return; } if (!text && !F.length) { toast('제출 내용을 입력하거나 파일을 첨부하세요.', 'warn'); return; }
    const files = F.map(x => ({ name: x.name.slice(0, 80), size: x.size })); /* 운영: 파일 서버 업로드 — 데모는 이름 · 크기만 */ const rc = LR.lp.cls[c.id] = LR.lp.cls[c.id] || { items: {} }; const rec = a2lRec(c.id, it.id); const at = new Date().toISOString();
    rec.subs = [...(rec.subs || []), { at, text: text.slice(0, 4000), files }].slice(-50); rec.done = true; rc.sub = { text: (text || `(첨부 ${files.length}개)`).slice(0, 4000), at }; LR.api.save(); a2lPush('a2-sub', { cls: c.id, item: it.id, text, files });
    if (LR.mine.cls && LR.mine.cls[c.id]) LR.mine.cls[c.id].st = 'submitted'; toast(rec.subs.length > 1 ? '다시 제출했습니다.' : '과제를 제출했습니다.', 'ok'); lrender(); return; }
  if (f.id === 'a2sv') { const Q = it.qs || []; const ans = []; for (const [k, q] of Q.entries()) { const fs = f.querySelector(`fieldset[data-k="${k}"]`); let a;
      if (q.t === 'text') a = { text: ((fs.querySelector('textarea') || {}).value || '').trim().slice(0, 2000) }; else { const sel = $$(`[name="s${k}"]:checked`, fs).map(x => x.value); const etc = sel.includes('etc') ? ((fs.querySelector(`[name="e${k}"]`) || {}).value || '').trim() : ''; if (sel.includes('etc') && !etc) { toast(`${k + 1}번 문항의 직접 입력 내용을 적어 주세요.`, 'warn'); return; } a = { v: sel.filter(v => v !== 'etc').map(Number), etc }; if (q.t === 'multiN' && q.max && a.v.length + (etc ? 1 : 0) > q.max) { toast(`${k + 1}번 문항은 최대 ${q.max}개까지 고를 수 있습니다.`, 'warn'); return; } }
      const empty = q.t === 'text' ? !a.text : !(a.v.length || a.etc); if (q.req && empty) { toast(`${k + 1}번은 필수 문항입니다.`, 'warn'); fs.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } ans.push(a); }
    const rec = a2lRec(c.id, it.id); rec.sv = { at: new Date().toISOString(), ans }; rec.done = true; LR.api.save(); a2lPush('a2-sv', { cls: c.id, item: it.id, ans }); toast('설문을 제출했습니다.', 'ok'); lrender(); return; }
} catch (x) { console.error(x); toast('처리하지 못했습니다. 다시 시도하세요.', 'bad'); } });
document.addEventListener('toggle', e => { if (e.target && e.target.classList && e.target.classList.contains('a2lqa')) A2L.qaOpen = e.target.open; }, true);
/* 시험 남은 시간 · 데모 플레이어 시계 */
setInterval(() => { const tm = $('#a2tm'); if (tm && A2L.run && A2L.run.end) { const left = Math.max(0, A2L.run.end - Date.now()); const b = tm.querySelector('b'); if (b) b.textContent = a2lmmss(left / 1000); tm.classList.toggle('low', left < 60000); if (left <= 0 && !A2L.run.fired) { A2L.run.fired = true; const f = $('#a2qz'); toast('시험 시간이 끝나 자동으로 제출합니다.', 'warn'); if (f) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); } } }, 1000);
setInterval(a2lVpTick, 250);
