/* v30 학사 LMS 묶음 O — AI(SFR-013 · 074 · 076 · 077 · 079 · 080 · 082~087). 규칙: didisam/lms/README.md
   운영(서버) 모드: /api/lms/o/* 호출(키는 서버에만). 데모(정적) 모드: S.lms.o 상태 + 같은 응답 모양의 데모 처리기(DEMO).
   화면: 「AI 학습 지원」(강의자료 / AI 질문 답변 / AI 자료 만들기 / 학습 분석 + 더보기: 번역 나란히 보기 · 수업 실시간 자막) + 「AI 관리」 탭 확장(LLM 플러그인 · 모니터링 · 할당량 · RAG 소스) */
(function () {
  'use strict';
  if (typeof MENU !== 'object' || typeof VIEWS !== 'object') return;
  const ULM = () => typeof ULMS === 'function' && ULMS();
  const LIVEM = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const LN = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어', vi: '베트남어', uz: '우즈베크어', mn: '몽골어', ru: '러시아어', es: '스페인어', fr: '프랑스어', de: '독일어', id: '인도네시아어' };
  const LANGS = Object.keys(LN);
  const FEAT = { qa: 'AI Q&A · 튜터', summary: '요약', translate: '번역 · 문서 뷰어', quiz: '퀴즈 생성', rubric: '루브릭 생성', discussion: '토론 요약', editor: '에디터 LLM', eval: 'AI 자동평가' };
  const ST = { review: ['검토 대기', 'y'], approved: ['승인', ''], published: ['배포됨', 'ok'], rejected: ['반려', 'bad'] };
  const KIND = { summary: '요약', translation: '번역', quiz: '퀴즈', rubric: '채점 기준', discussion: '토론 요약' };
  const DIFF = { easy: '쉬움', medium: '보통', hard: '어려움' };
  const RISK = { risk: ['주의', 'bad'], watch: ['관찰', 'y'], ok: ['양호', 'ok'] };
  const O = { c: {}, thread: null, room: null, gen: null, view: null, last: null };
  window.LMSO = O;
  (function css() { if (document.querySelector('link[data-lmso]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'lms/o.css?v=31.8'; l.dataset.lmso = '1'; document.head.appendChild(l); })();

  /* ── 메뉴 · 프리셋 ── */
  MENU.lmso = { label: 'AI 학습 지원', ws: 'learn', only: 'univ' };
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; if (k === 'univ_lms') { if (!P.on.includes('lmso')) P.on.push('lmso'); P.off = P.off.filter(x => x !== 'lmso'); } else if (!P.on.includes('lmso') && !P.off.includes('lmso')) P.off.push('lmso'); });

  /* ── 공용 ── */
  const ts = v => v ? new Date(v).toLocaleString('ko-KR', { hour12: false }) : '—';
  const short = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; };
  const val = id => { const e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : ''; };
  const editable = () => S.me && (S.me.role === 'owner' || S.me.role === 'admin' || S.me.role === 'sub');
  const reviewer = () => S.me && (S.me.role === 'owner' || S.me.role === 'teacher' || S.me.role === 'admin');
  const modeTag = () => LIVEM() ? tag('운영 서버') : tag('데모 동작', 'y');
  async function api(method, path, body) {
    if (!LIVEM()) return DEMO(method, path, body);
    const r = await fetch(path, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; throw e; } return j;
  }
  function load(k, p) {
    if (O.c[k] !== undefined) return O.c[k];
    O.c[k] = null; api('GET', p).then(j => { O.c[k] = j; render(); }).catch(e => { O.c[k] = { _err: e.message }; render(); });
    return null;
  }
  const busy = '<div class="empty">불러오는 중…</div>';
  const errBox = d => d && d._err ? `<div class="empty">${esc(d._err)}</div>` : '';
  const refresh = () => { O.c = {}; render(); };
  async function act(fn, okMsg) { try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); refresh(); return r; } catch (e) { toast(e.message || '처리하지 못했습니다.', 'warn'); return null; } }
  const secSel = (id, cur, all = true) => { const d = load('sections', '/api/lms/o/sections'); const L = d && d.sections || []; return `<select id="${id}">${all ? '<option value="">기관 공통(분반 없음)</option>' : ''}${L.map(s => `<option value="${esc(s.section_id)}" ${cur === s.section_id ? 'selected' : ''}>${esc(s.title)} · ${esc(s.term_id)}</option>`).join('')}</select>`; };
  const secName = id => { const d = O.c.sections; const s = d && d.sections && d.sections.find(x => x.section_id === id); return s ? s.title : id ? '분반' : '기관 공통'; };
  const aiNote = '<p class="mini">AI 생성 결과는 「AI 생성」으로 표시되며, 교수자가 검토 · 승인한 뒤에만 학생에게 배포됩니다. 개인정보는 서버에서 가린 뒤 AI로 보냅니다.</p>';

  /* ═════════ 화면: AI 학습 지원 ═════════
     탭 4개(강의자료 · AI 질문 답변 · AI 자료 만들기 · 학습 분석) + 더보기(번역 나란히 보기 · 수업 실시간 자막). 탭 값(UI.loT)은 예전 그대로 */
  const UXo = () => (window.LMP && LMP.ux) || null;
  const foldO = (k, t, body, sub) => { const U = UXo(); return U ? U.fold(k, t, body, sub) : `<div class="card"><div class="ch"><b>${esc(t)}</b></div>${body}</div>`; };
  VIEWS.lmso = () => {
    const tb = UI.loT || 'rag'; const U = UXo();
    const V = [['rag', '강의자료'], ['qa', 'AI 질문 답변'], ['gen', 'AI 자료 만들기'], ['an', '학습 분석']], M = [['view', '번역 나란히 보기'], ['cap', '수업 실시간 자막']];
    let h = head('AI 학습 지원', '강의자료를 올리면 AI가 그 자료로 학생 질문에 답하고, 요약 · 번역 · 퀴즈 · 채점 기준을 만듭니다. 학생에게는 교수자가 확인한 것만 보입니다.', modeTag()) +
      (U ? U.tabs('loT', V, M, tb) : tabs('loT', V.concat(M), tb));
    /* 지금 할 일: 검토 대기 · 자료 · 질문 · 위험 학생 */
    const d = load('docs', '/api/lms/o/rag/docs'), g = load('gens', '/api/lms/o/gen/list'), th = load('threads', '/api/lms/o/qa/threads'), secs = load('sections', '/api/lms/o/sections');
    const sid = UI.loAnSec || (secs && secs.sections && secs.sections[0] && secs.sections[0].section_id) || ''; const A = sid ? load('act:' + sid, '/api/lms/o/an/activity?section_id=' + sid) : null;
    const rev = ((g && g.items) || []).filter(x => x.status === 'review').length; const risk = A && A.activity ? A.activity.summary.risk : null;
    const open = tb === 'gen' && O.gen && ((g && g.items) || []).some(x => x.gen_id === O.gen);
    const btn = rev && !open ? `<button class="btn ${tb === 'qa' || tb === 'cap' ? '' : 'pri'} sm" data-act="lmso-revgo">검토 시작 (${rev}건)</button>` : tb === 'rag' && editable() ? '<label class="btn pri sm" for="loFile">강의자료 올리기</label>' : '';
    if (U) h += U.todo([[((d && d.docs) || []).length, '강의자료'], [rev, '검토 대기', rev ? 'y' : ''], [((th && th.threads) || []).length, '질문 대화'], risk == null ? null : [risk, '주의 학생', risk ? 'r' : '']], btn);
    try { h += ({ rag: vRag, qa: vQa, gen: vGen, an: vAn, view: vView, cap: vCap })[tb](); } catch (e) { h += `<div class="empty">${esc(e.message)}</div>`; }
    return h;
  };
  ACT['lmso-revgo'] = () => { const g = O.c.gens; const f = g && g.items.find(x => x.status === 'review'); UI.loT = 'gen'; UI.loGenF = 'review'; if (f) O.gen = f.gen_id; render(); };

  /* ── 강의자료 ── */
  function vRag() {
    const s = load('sources', '/api/lms/o/rag/sources'), d = load('docs', '/api/lms/o/rag/docs');
    if (!s || !d) return busy; if (s._err || d._err) return errBox(s) || errBox(d);
    const srcOpt = s.sources.filter(x => x.kind === 'file' || x.kind === 'manual').map(x => `<option value="${esc(x.source_id)}">${esc(x.name)}</option>`).join('');
    const r = O.c._search;
    return `<div class="card"><div class="ch"><b>강의자료 올리기</b><small>한글 문서는 txt · md · html로, 워드 · 엑셀 · 영상 자막(srt · vtt)은 그대로 올립니다 — AI가 문단을 나눠 답변 근거로 씁니다</small></div>
      <div class="lo-form"><label>자료 묶음<select id="loSrc"><option value="">(묶음 없음)</option>${srcOpt}</select></label><label>분반${secSel('loSec', '')}</label><label>파일<input type="file" id="loFile" accept=".txt,.md,.csv,.html,.htm,.docx,.xlsx,.srt,.vtt" data-chg="lmso-file"></label></div>
      <p class="mini">영상 강의는 자막 파일을 올리면 시간 구간별 퀴즈를 만들 수 있습니다.</p></div>
      <div class="card"><div class="ch"><b>올린 자료</b><small>${d.docs.length}건 · 이름을 누르면 문단 구조를 봅니다</small></div>${table(['자료', '분반', '문단', '올린 때', ''], d.docs.map(x => [`<a href="#" class="lmp-link" data-act="lmso-docview" data-id="${esc(x.doc_id)}">${esc(x.name)}</a>`, esc(secName(x.section_id)), x.paras_n, esc(ts(x.created_at)), `<button class="btn sm ghost" data-act="lmso-docdel" data-id="${esc(x.doc_id)}">삭제</button>`]), '아직 올린 자료가 없습니다. 위에서 강의자료 파일을 고르세요.')}</div>` +
      foldO('lo-search', 'AI가 찾는 근거 미리 보기', `<div class="lo-form"><label>질문<input id="loQ" maxlength="300" placeholder="예: 제2정규형은 무엇을 제거하나요?"></label><label>학번(그 학생 수강 자료만 · 선택)<input id="loMno" maxlength="20" placeholder="20261234"></label><label>찾을 문단 수<select id="loK">${[3, 4, 5, 8].map(n => `<option>${n}</option>`).join('')}</select></label><button class="btn" data-act="lmso-search">찾기</button></div>
      ${r ? (r._err ? `<p class="mini">${esc(r._err)}</p>` : `<p class="mini">관련도 높은 순 ${r.hits.length}개</p>` + table(['순위', '자료', '관련도', '내용'], r.hits.map((x, i) => [i + 1, `${esc(x.name)} <small class="mini">문단 ${x.seq + 1}</small>`, x.score.toFixed(2), esc(short(x.text, 120))]), '관련 자료가 없습니다.') + (r.scope ? `<p class="mini">그 학생 수강 분반 ${r.scope.length}개 + 기관 공통 자료에서만 찾았습니다</p>` : '')) : ''}`, '학생 질문에 어떤 문단을 근거로 쓰는지 확인');
  }
  ACT['lmso-file'] = el => {
    const f = el.files && el.files[0]; if (!f) return; if (f.size > 4 * 1024 * 1024) return toast('파일이 너무 큽니다(4MB 이하).', 'warn');
    const rd = new FileReader(); rd.onload = () => { const b64 = String(rd.result).split(',')[1] || ''; act(() => api('POST', '/api/lms/o/rag/upload', { name: f.name, b64, source_id: val('loSrc') || null, section_id: val('loSec') || null }), `「${f.name}」을 색인했습니다.`); }; rd.readAsDataURL(f);
  };
  ACT['lmso-docdel'] = el => act(() => api('DELETE', '/api/lms/o/rag/doc?id=' + el.dataset.id), '문서를 지웠습니다.');
  ACT['lmso-docview'] = async el => { try { const { doc } = await api('GET', '/api/lms/o/rag/doc?id=' + el.dataset.id); modal(doc.name, `<p class="mini">문단 ${doc.paras.length}개 · 청크 ${doc.chunks}개 · ${doc.chars.toLocaleString()}자</p><table class="lo-tv"><tbody>${doc.paras.slice(0, 200).map(p => `<tr><td style="width:56px">${tag(p.t)}</td><td class="${p.t}">${esc(p.x)}</td></tr>`).join('')}</tbody></table>`, [{ id: 'c', label: '닫기' }], true); } catch (e) { toast(e.message, 'warn'); } };
  ACT['lmso-search'] = async () => { const q = val('loQ').trim(); if (!q) return toast('질문을 넣어 주세요.', 'warn'); try { O.c._search = await api('POST', '/api/lms/o/rag/search', { q, top_k: +val('loK') || 4, member_no: val('loMno').trim() || null }); } catch (e) { O.c._search = { _err: e.message }; } render(); };

  /* ── AI Q&A ── */
  function vQa() {
    const L = load('threads', '/api/lms/o/qa/threads'); if (!L) return busy; if (L._err) return errBox(L);
    if (!O.thread && L.threads[0]) O.thread = L.threads[0].thread_id;
    const T = O.thread ? load('thr:' + O.thread, '/api/lms/o/qa/thread?id=' + O.thread) : null;
    const F = load('faq', '/api/lms/o/qa/faq');
    const left = `<div class="card"><div class="ch"><b>질문 대화</b><button class="btn sm" data-act="lmso-thrnew">새 대화</button></div><div class="lo-list">${L.threads.map(t => `<button class="lo-it ${t.thread_id === O.thread ? 'on' : ''}" data-act="lmso-thr" data-id="${esc(t.thread_id)}"><b>${esc(short(t.title, 30))}</b><small>${t.msgs}개 · ${t.shared ? '공유 · ' : ''}${esc(ts(t.updated_at))}${t.member_no ? ' · 학번 ' + esc(t.member_no) : ''}</small></button>`).join('') || '<p class="mini">아직 대화가 없습니다. 「새 대화」로 강의 내용을 물어보세요.</p>'}</div></div>`;
    let right = '<div class="card"><p class="mini">왼쪽에서 대화를 고르거나 「새 대화」를 만드세요. AI가 올린 강의자료에서 근거를 찾아 출처와 함께 답합니다.</p></div>';
    if (T && T._err) right = `<div class="card">${errBox(T)}</div>`; else if (O.thread && !T) right = `<div class="card">${busy}</div>`;
    else if (T) {
      const t = T.thread; const share = t.shared ? `${location.origin}${location.pathname}#lmso-share=${t.share_token}` : '';
      right = `<div class="card"><div class="ch"><b>${esc(t.title)}</b><small>참고 문단 ${t.top_k}개 · ${esc(secName(t.section_id))}${t.member_no ? ' · 학번 ' + esc(t.member_no) + ' 수강 범위' : ''}</small></div>
        <div class="lo-row"><button class="btn sm" data-act="lmso-thredit">대화 설정</button><button class="btn sm" data-act="lmso-share" data-v="${t.shared ? '0' : '1'}">${t.shared ? '공유 끄기' : '공유 켜기'}</button><button class="btn sm" data-act="lmso-thrdel">삭제</button>${share ? `<code class="mini">${esc(share)}</code>` : ''}</div>
        <div class="lo-msgs" id="loMsgs">${T.messages.map(m => `<div class="lo-msg ${m.role}">${esc(m.content)}${m.role === 'assistant' ? `<div class="lo-meta">${tag('AI 생성')}${m.faq_id ? tag('자주 묻는 질문 답변', 'ok') : ''}${m.edited ? tag('편집됨', 'y') : ''}${(m.cites || []).map(c => `<span class="lo-cite" title="${esc(c.snippet)}">[${c.n}] ${esc(c.name)} #${c.seq + 1} · ${(+c.score).toFixed(2)}</span>`).join('')}<button class="btn sm" data-act="lmso-msged" data-seq="${m.seq}">편집</button><button class="btn sm" data-act="lmso-tofaq" data-seq="${m.seq}">자주 묻는 질문에 등록</button></div>` : `<div class="lo-meta"><button class="btn sm" data-act="lmso-msged" data-seq="${m.seq}">편집</button></div>`}</div>`).join('') || '<p class="mini">질문을 입력해 보세요. 강의자료에서 근거를 찾아 출처와 함께 답합니다.</p>'}</div>
        <div class="lo-form" style="margin-top:8px"><label style="grid-column:1/-1">질문<textarea id="loAsk" class="lo-ta" maxlength="2000" placeholder="강의 내용에 대해 질문하세요"></textarea></label><button class="btn pri" data-act="lmso-ask">보내기</button></div>
        ${O.last && O.last.similar && O.last.similar.length ? `<p class="mini">비슷한 자주 묻는 질문: ${O.last.similar.map(s => esc(short(s.q, 30)) + ` (${s.score.toFixed(2)})`).join(' · ')}</p>` : ''}${aiNote}</div>`;
    }
    const faq = F && !F._err ? `<div class="card"><div class="ch"><b>자주 묻는 질문</b><small>비슷한 질문이 오면 AI 대신 여기 답으로 바로 답합니다</small><button class="btn sm" data-act="lmso-faqnew">질문 추가</button></div>${table(['질문', '답변', ''], F.faq.map(f => [`${esc(short(f.q, 40))}${f.tags ? ` <small class="mini">${esc(f.tags)}</small>` : ''}`, esc(short(f.a, 60)), `<button class="btn sm" data-act="lmso-faqdel" data-id="${esc(f.faq_id)}">삭제</button>`]), '등록한 질문이 없습니다.')}</div>` : '';
    return `<div class="lo-grid">${left}<div>${right}${faq}</div></div>`;
  }
  ACT['lmso-thr'] = el => { O.thread = el.dataset.id; O.last = null; render(); };
  const thrForm = t => `<label class="fl">제목<input name="title" maxlength="80" value="${esc(t ? t.title : '')}"></label>${t ? '' : `<label class="fl">분반(선택)${secSel('loThrSec', '')}</label><label class="fl">학번(그 학생 수강 자료만 · 선택)<input name="mno" maxlength="20" placeholder="20261234"></label>`}
    <label class="fl">답변 자유도(0 정확 ~ 1 자유)<input name="temp" type="number" min="0" max="1" step="0.1" value="${t ? t.temperature : 0.3}"></label><label class="fl">참고할 문단 수(1~10)<input name="topk" type="number" min="1" max="10" value="${t ? t.top_k : 4}"></label>`;
  ACT['lmso-thrnew'] = () => modal('새 질문 대화', thrForm(null), [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const b = { title: fv(w, 'title'), section_id: val('loThrSec') || null, member_no: fv(w, 'mno') || null, temperature: +fv(w, 'temp'), top_k: parseInt(fv(w, 'topk'), 10) }; act(async () => { const r = await api('POST', '/api/lms/o/qa/thread', b); O.thread = r.thread.thread_id; return r; }, '대화를 만들었습니다.'); } }]);
  ACT['lmso-thredit'] = () => { const t = O.c['thr:' + O.thread].thread; modal('대화 설정', thrForm(t), [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { act(() => api('PUT', '/api/lms/o/qa/thread', { thread_id: t.thread_id, title: fv(w, 'title'), temperature: +fv(w, 'temp'), top_k: parseInt(fv(w, 'topk'), 10) }), '저장했습니다.'); } }]); };
  ACT['lmso-share'] = el => act(() => api('PUT', '/api/lms/o/qa/thread', { thread_id: O.thread, shared: el.dataset.v === '1' }), el.dataset.v === '1' ? '공유 주소를 만들었습니다(같은 기관 구성원만 열람).' : '공유를 껐습니다.');
  ACT['lmso-thrdel'] = () => act(async () => { const r = await api('DELETE', '/api/lms/o/qa/thread?id=' + O.thread); O.thread = null; return r; }, '대화를 지웠습니다.');
  ACT['lmso-ask'] = async el => { const q = val('loAsk').trim(); if (!q) return toast('질문을 입력해 주세요.', 'warn'); el.disabled = true; try { O.last = await api('POST', '/api/lms/o/qa/ask', { thread_id: O.thread, q }); } catch (e) { toast(e.message, 'warn'); } el.disabled = false; refresh(); };
  const msgOf = seq => O.c['thr:' + O.thread].messages.find(m => m.seq === seq);
  ACT['lmso-msged'] = el => { const m = msgOf(+el.dataset.seq); modal('메시지 편집', `<textarea name="c" class="lo-ta" maxlength="8000">${esc(m.content)}</textarea>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { act(() => api('PUT', '/api/lms/o/qa/message', { thread_id: O.thread, seq: m.seq, content: fv(w, 'c') }), '편집했습니다.'); } }]); };
  ACT['lmso-tofaq'] = el => { const ms = O.c['thr:' + O.thread].messages; const i = ms.findIndex(m => m.seq === +el.dataset.seq); const q = (ms.slice(0, i).reverse().find(m => m.role === 'user') || {}).content || ''; faqModal(q, ms[i].content); };
  const faqModal = (q, a) => modal('자주 묻는 질문 추가', `<label class="fl">질문<input name="q" maxlength="1000" value="${esc(q)}"></label><label class="fl">답변<textarea name="a" class="lo-ta" maxlength="8000">${esc(a)}</textarea></label><label class="fl">분류<input name="t" maxlength="120" placeholder="과제 · 시험 · 출석"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { if (!fv(w, 'q') || !fv(w, 'a')) return false; act(() => api('POST', '/api/lms/o/qa/faq', { q: fv(w, 'q'), a: fv(w, 'a'), tags: fv(w, 't') }), '자주 묻는 질문에 넣었습니다.'); } }]);
  ACT['lmso-faqnew'] = () => faqModal('', '');
  ACT['lmso-faqdel'] = el => act(() => api('DELETE', '/api/lms/o/qa/faq?id=' + el.dataset.id), '질문을 지웠습니다.');

  /* ── 생성 · 검토 ── */
  function docOpts(id) { const d = load('docs', '/api/lms/o/rag/docs'); return `<select id="${id}">${(d && d.docs || []).map(x => `<option value="${esc(x.doc_id)}">${esc(x.name)}</option>`).join('') || '<option value="">(자료를 먼저 올리세요)</option>'}</select>`; }
  function vGen() {
    const f = UI.loGenF || 'all'; const L = load('gens', '/api/lms/o/gen/list'); if (!L) return busy; if (L._err) return errBox(L);
    const items = L.items.filter(g => f === 'all' || g.status === f);
    const g = O.gen && L.items.find(x => x.gen_id === O.gen);
    /* 검토함이 먼저, 새로 만들기는 접어 둔다(종류별 1칸) */
    return `<div class="card"><div class="ch"><b>검토함</b><small>AI가 만든 것은 「검토 대기」로 들어오고, 교수자가 승인 → 배포해야 학생에게 보입니다</small><select data-chg="lmso-genf" aria-label="상태로 거르기">${[['all', '전체'], ['review', '검토 대기'], ['approved', '승인'], ['published', '배포됨'], ['rejected', '반려']].map(([k, l]) => `<option value="${k}" ${k === f ? 'selected' : ''}>${l} ${k === 'all' ? L.items.length : L.items.filter(x => x.status === k).length}</option>`).join('')}</select></div>
      ${table(['종류', '분반', '상태', '만든 때'], items.map(x => [`<a href="#" class="lmp-link" data-act="lmso-genopen" data-id="${esc(x.gen_id)}">${esc(KIND[x.kind])}</a>${x.lang && x.lang !== 'ko' ? ` <small class="mini">${esc(LN[x.lang] || x.lang)}</small>` : ''}`, esc(secName(x.section_id)), tag(...ST[x.status]), esc(ts(x.created_at))]), f === 'all' ? '아직 만든 것이 없습니다. 아래 「AI로 새로 만들기」에서 시작하세요.' : '이 상태의 항목이 없습니다.')}</div>
      ${g ? genCard(g) : ''}
      <h3 class="lo-h3">AI로 새로 만들기</h3>
      ${foldO('lo-gen-sum', '요약 · 번역', `<div class="lo-form"><label>자료${docOpts('loGDoc')}</label><label>분반${secSel('loGSec', '')}</label><label>언어<select id="loGLang">${LANGS.map(l => `<option value="${l}">${LN[l]}</option>`).join('')}</select></label>
        <button class="btn" data-act="lmso-gen" data-k="summary">요약 만들기</button><button class="btn" data-act="lmso-gen" data-k="translate">번역(문단 유지)</button></div>`, '올린 강의자료를 요약하거나 다른 언어로')}
      ${foldO('lo-gen-quiz', '퀴즈', `<p class="mini">「요약 · 번역」에서 고른 자료로 만듭니다. 영상 자막이면 시간 구간을 고를 수 있습니다.</p><div class="lo-form"><label>구간 시작(초)<input id="loQs" type="number" min="0" value="0"></label><label>구간 끝(초)<input id="loQe" type="number" min="1" value="600"></label><label>난이도<select id="loQd">${Object.entries(DIFF).map(([k, v]) => `<option value="${k}" ${k === 'medium' ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>문항 수<input id="loQn" type="number" min="1" max="10" value="5"></label></div>
        <div class="lo-langs" style="margin-top:8px">${LANGS.map((l, i) => `<label><input type="checkbox" class="loQl" value="${l}" ${i < 2 ? 'checked' : ''}> ${LN[l]}</label>`).join('')}</div>
        <div class="lo-row" style="margin-top:8px"><button class="btn" data-act="lmso-gen" data-k="quiz">퀴즈 만들기</button><span class="mini">첫 번째로 고른 언어가 기본 언어입니다(최대 12개 언어).</span></div>`, '난이도 · 문항 수 · 여러 언어')}
      ${foldO('lo-gen-rub', '채점 기준 · 난이도 확인', `<div class="lo-form"><label style="grid-column:1/-1">과제 설명<textarea id="loRt" class="lo-ta" maxlength="4000" placeholder="예: ERD를 설계하고 3정규형으로 정규화한 보고서"></textarea></label><label>평가 항목 수<input id="loRn" type="number" min="2" max="8" value="4"></label><label>점수 단계<input id="loRs" type="number" min="3" max="5" value="4"></label><button class="btn" data-act="lmso-gen" data-k="rubric">채점 기준 만들기</button><button class="btn" data-act="lmso-cls">난이도 확인</button></div>${O.c._cls ? `<p class="mini">난이도: <b>${esc(DIFF[O.c._cls.level])}</b> (점수 ${O.c._cls.score} · 문장 평균 ${O.c._cls.features.avg_len}자 · 긴 낱말 ${O.c._cls.features.long_pct}% · 생각을 요구하는 말 ${O.c._cls.features.cues}개) — 규칙으로 판단</p>` : ''}`, '과제 설명으로 채점 기준표 만들기')}`;
  }
  function outHtml(g) {
    const o = g.output || {};
    if (g.kind === 'quiz') return (o.items || []).map((q, i) => `<div class="lo-out" style="margin-bottom:6px"><b>${i + 1}. ${esc(q.q)}</b> ${tag(DIFF[q.difficulty] || q.difficulty)}\n${q.options.map((op, k) => `${k === q.answer ? '●' : '○'} ${esc(op)}`).join('\n')}\n해설: ${esc(q.explain)}${Object.entries(q.tr || {}).map(([l, t]) => `\n[${esc(LN[l] || l)}] ${esc(t.q)}`).join('')}</div>`).join('') + `<p class="mini">요청 난이도와 일치 ${o.match || 0}/${(o.items || []).length}문항</p>` || '<div class="empty">문항을 만들지 못했습니다.</div>';
    if (g.kind === 'rubric') return table(['항목', '비중', '점수 단계'], (o.criteria || []).map(c => [esc(c.name), c.weight + '%', c.levels.map(l => `${l.score}점 ${esc(l.desc)}`).join('<br>')]), '기준이 없습니다.') + `<p class="mini">비중 합 ${o.total_weight || 0}%</p>`;
    if (g.kind === 'translation') return `<p class="mini">${o.complete ? '문단 구조 그대로 번역했습니다.' : '일부 문단을 번역하지 못했습니다 — 편집으로 채워 주세요.'} 「번역 나란히 보기」로 원문과 함께 볼 수 있습니다.</p>`;
    return `<div class="lo-out">${esc(o.text || '')}</div>` + (o.stats ? `<p class="mini">글 ${o.stats.posts}개 · 참여 ${o.stats.members}명 · 평균 ${o.stats.avg_len}자 · 핵심어 ${o.stats.keywords.map(k => esc(k.word) + '(' + k.n + ')').join(', ')}</p>` : '');
  }
  function genCard(g) {
    const r = reviewer(); const b = (a, l, k = '') => `<button class="btn sm ${k}" data-act="lmso-review" data-a="${a}">${l}</button>`;
    return `<div class="card"><div class="ch"><b>${esc(KIND[g.kind])} ${tag('AI 생성')} ${tag(...ST[g.status])}</b><small>${g.review_note ? '검토 의견: ' + esc(g.review_note) : ''}</small></div>${outHtml(g)}
      <div class="lo-row" style="margin-top:8px">${r && (g.status === 'review' || g.status === 'rejected') ? `<button class="btn sm" data-act="lmso-genedit">내용 수정</button>` : ''}${r && g.status === 'review' ? b('approve', '승인', 'pri') + b('reject', '반려') : ''}${r && g.status === 'approved' ? b('publish', '학생에게 배포', 'pri') : ''}${r && g.status !== 'review' ? b('revise', '다시 검토') : ''}${!r ? '<span class="mini">교수자 · 정운영자만 검토할 수 있습니다.</span>' : ''}${g.kind === 'translation' ? `<button class="btn sm" data-act="lmso-toview" data-id="${esc(g.gen_id)}">번역 나란히 보기</button>` : ''}</div></div>`;
  }
  ACT['lmso-genopen'] = el => { O.gen = el.dataset.id; render(); };
  ACT['lmso-genf'] = el => { UI.loGenF = el.value; render(); };
  ACT['lmso-gen'] = async el => {
    const k = el.dataset.k; const doc = val('loGDoc'); const sec = val('loGSec') || null; let p, b;
    if (k === 'summary' || k === 'translate') { if (!doc) return toast('자료를 먼저 올리세요.', 'warn'); p = '/api/lms/o/gen/' + k; b = { doc_id: doc, section_id: sec, lang: val('loGLang') }; if (k === 'summary' && b.lang === 'en') b.lang = 'en'; if (k === 'translate' && b.lang === 'ko') return toast('번역할 언어(한국어 외)를 고르세요.', 'warn'); }
    if (k === 'quiz') { const langs = [...document.querySelectorAll('.loQl:checked')].map(x => x.value); if (!doc) return toast('자료를 먼저 올리세요.', 'warn'); p = '/api/lms/o/gen/quiz'; b = { doc_id: doc, section_id: sec, seg_start: parseInt(val('loQs'), 10) || 0, seg_end: parseInt(val('loQe'), 10) || 600, difficulty: val('loQd'), count: parseInt(val('loQn'), 10) || 5, langs: langs.length ? langs : ['ko'] }; }
    if (k === 'rubric') { p = '/api/lms/o/gen/rubric'; b = { task: val('loRt').trim(), criteria_n: parseInt(val('loRn'), 10) || 4, scale: parseInt(val('loRs'), 10) || 4, section_id: sec }; if (!b.task) return toast('과제 설명을 넣어 주세요.', 'warn'); }
    el.disabled = true; const r = await act(() => api('POST', p, b), 'AI가 만들었습니다 — 검토 대기에 넣었습니다.'); el.disabled = false; if (r && r.gen) { O.gen = r.gen.gen_id; UI.loGenF = 'all'; render(); }
  };
  ACT['lmso-cls'] = async () => { const t = val('loRt').trim(); if (!t) return toast('분류할 글을 넣어 주세요.', 'warn'); try { O.c._cls = (await api('POST', '/api/lms/o/gen/classify', { text: t })).results[0]; render(); } catch (e) { toast(e.message, 'warn'); } };
  ACT['lmso-review'] = el => { const a = el.dataset.a; const run = note => act(() => api('POST', '/api/lms/o/gen/review', { gen_id: O.gen, action: a, note }), { approve: '승인했습니다.', reject: '반려했습니다.', publish: '학생에게 배포했습니다.', revise: '다시 검토 대기로 돌렸습니다.' }[a]);
    if (a === 'reject' || a === 'approve') modal(a === 'reject' ? '반려 의견' : '승인 의견', '<textarea name="n" class="lo-ta" maxlength="500" placeholder="(선택)"></textarea>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '확인', kind: 'pri', run: w => { run(fv(w, 'n') || null); } }]); else run(null); };
  ACT['lmso-genedit'] = () => { const g = O.c.gens.items.find(x => x.gen_id === O.gen); const isText = g.kind === 'summary' || g.kind === 'discussion';
    modal('내용 수정(교수자)', isText ? `<textarea name="t" class="lo-ta" style="min-height:220px">${esc(g.output.text || '')}</textarea>` : `<p class="mini">JSON 구조를 유지해 고쳐 주세요.</p><textarea name="t" class="lo-ta" style="min-height:300px;font-family:monospace">${esc(JSON.stringify(g.output, null, 2))}</textarea>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { let out; try { out = isText ? { ...g.output, text: w.querySelector('[name=t]').value } : JSON.parse(w.querySelector('[name=t]').value); } catch (e) { toast('JSON 형식이 올바르지 않습니다.', 'warn'); return false; } act(() => api('PUT', '/api/lms/o/gen/item', { gen_id: g.gen_id, output: out }), '수정했습니다(검토 대기).'); } }], true); };
  ACT['lmso-toview'] = el => { O.view = el.dataset.id; UI.loT = 'view'; render(); };

  /* ── 분석 · 평가 ── */
  function vAn() {
    const secs = load('sections', '/api/lms/o/sections'); if (!secs) return busy; if (secs._err) return errBox(secs);
    const sid = UI.loAnSec || (secs.sections[0] && secs.sections[0].section_id) || '';
    const A = sid ? load('act:' + sid, '/api/lms/o/an/activity?section_id=' + sid) : null; const ev = load('evals', '/api/lms/o/eval/list'); const gens = load('gens', '/api/lms/o/gen/list');
    const rubrics = (gens && gens.items || []).filter(g => g.kind === 'rubric');
    const RK = { risk: 0, watch: 1, ok: 2 };
    const act0 = !sid ? '<p class="mini">분반이 아직 없습니다. 학사 연동(분반 · 수강생)을 마치면 분반별 출석 · 성적으로 주의 학생을 찾아 줍니다.</p>' : !A ? busy : A._err ? errBox(A) :
      `<div class="kpis">${kpi('수강생', A.activity.summary.n + '명')}${kpi('주의', A.activity.summary.risk + '명', '', A.activity.summary.risk ? 'bad' : '')}${kpi('관찰', A.activity.summary.watch + '명')}${kpi('수업 차시', A.activity.sessions + '회')}</div>` +
      table(['학번', '출석률', '성적 평균', '상태'], A.activity.students.slice().sort((x, y) => RK[x.risk] - RK[y.risk]).map(s => [`${esc(s.member_no)} <small class="mini">${esc(s.unit_code || '')}</small>`, `${s.att_rate == null ? '—' : s.att_rate + '%'}<small class="mini lmp-sub">출석 ${s.present} · 지각 ${s.late} · 결석 ${s.absent} · 공결 ${s.excused}</small>`, s.avg_pct == null ? '—' : s.avg_pct + '%', tag(...RISK[s.risk])]), '수강생이 없습니다.') + '<p class="mini">출석률 75% 미만 또는 성적 60% 미만은 주의, 85% · 70% 미만은 관찰로 표시합니다(학번만 표시).</p>';
    return `<div class="card"><div class="ch"><b>분반별 학습 현황</b><select data-chg="lmso-ansec" aria-label="분반">${secs.sections.map(s => `<option value="${esc(s.section_id)}" ${s.section_id === sid ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></div>${act0}</div>
      ${foldO('lo-an-eval', 'AI 채점 도우미(참고용)', `<p class="mini">결과는 LMS에만 기록되고 성적 · 학사로 보내지 않습니다. 교수자가 확정합니다.</p><div class="lo-form"><label>학번<input id="loEvM" maxlength="20" placeholder="20261234"></label><label>만점<input id="loEvMax" type="number" min="1" max="1000" value="100"></label><label>채점 기준<select id="loEvR"><option value="">(직접 입력)</option>${rubrics.map(g => `<option value="${esc(g.gen_id)}">${esc(short(g.params.task || '채점 기준', 30))}</option>`).join('')}</select></label><label style="grid-column:1/-1">채점 기준(직접 입력)<textarea id="loEvRt" class="lo-ta" maxlength="4000" placeholder="항목별 점수 설명"></textarea></label><label style="grid-column:1/-1">답안<textarea id="loEvA" class="lo-ta" maxlength="8000"></textarea></label><button class="btn" data-act="lmso-eval">AI로 채점해 보기</button></div>
        ${ev && !ev._err ? table(['학번', 'AI 점수', '상태', ''], ev.evals.map(e => [esc(e.member_no), `${e.ai_score == null ? '—' : `${e.ai_score}/${e.max_score}`}${e.final_score == null ? '' : ` → <b>${e.final_score}</b>`}<small class="mini lmp-sub">${esc(short(e.rationale, 60))}</small>`, e.status === 'confirmed' ? tag('교수 확정', 'ok') : tag('AI 제안', 'y'), e.status === 'confirmed' || !reviewer() ? '' : `<button class="btn sm" data-act="lmso-evok" data-id="${esc(e.eval_id)}" data-s="${e.ai_score == null ? '' : e.ai_score}" data-m="${e.max_score}">확정</button>`]), '채점 기록이 없습니다.') : busy}`, `채점 ${ev && ev.evals ? ev.evals.length : 0}건 · 교수 확정 전 참고 점수`)}
      ${foldO('lo-an-disc', '토론 요약', `<p class="mini">한 줄에 「학번: 글」 형식으로 붙여 넣으세요(토론 게시판 연동 시 자동). 결과는 「AI 자료 만들기」 검토함에 들어갑니다.</p><textarea id="loDisc" class="lo-ta" placeholder="20261234: 정규화는 중복을 줄입니다.&#10;20261235: 반정규화도 필요합니다."></textarea><div class="lo-row" style="margin-top:6px"><button class="btn" data-act="lmso-disc">요약 · 통계</button></div>`, '토론 글의 주요 논점 · 참여 현황')}
      ${foldO('lo-an-ed', '글 다듬기 도우미', `<p class="mini">게시판 · 과제 글쓰기 칸에서 쓰는 맞춤법 교정 · 형식 정리 · 번역을 미리 해 봅니다.</p><textarea id="loEd" class="lo-ta" maxlength="8000" placeholder="글을 넣고 동작을 고르세요"></textarea>
        <div class="lo-row" style="margin-top:6px"><button class="btn" data-act="lmso-ed" data-a="proofread">맞춤법 교정</button><button class="btn" data-act="lmso-ed" data-a="format">형식 정리</button><select id="loEdL" aria-label="번역 언어">${LANGS.filter(l => l !== 'ko').map(l => `<option value="${l}">${LN[l]}</option>`).join('')}</select><button class="btn" data-act="lmso-ed" data-a="translate">번역</button></div>${O.c._ed ? `<div class="lo-out" style="margin-top:8px">${esc(O.c._ed.text)}</div><button class="btn sm" data-act="lmso-edcopy">본문에 반영</button>` : ''}`, '맞춤법 · 형식 · 번역')}`;
  }
  ACT['lmso-ansec'] = el => { UI.loAnSec = el.value; render(); };
  ACT['lmso-disc'] = el => { const posts = val('loDisc').split('\n').map(l => { const m = /^\s*([A-Za-z0-9-]{1,20})\s*[:：]\s*(.+)$/.exec(l); return m ? { member_no: m[1], text: m[2] } : l.trim() ? { member_no: 'anon', text: l.trim() } : null; }).filter(Boolean); if (!posts.length) return toast('토론 글을 넣어 주세요.', 'warn'); el.disabled = true; act(async () => { const r = await api('POST', '/api/lms/o/an/discussion', { posts, section_id: UI.loAnSec || null }); O.gen = r.gen.gen_id; return r; }, '토론을 요약했습니다 — 「AI 자료 만들기」 검토함에서 확인하세요.').then(() => { el.disabled = false; }); };
  ACT['lmso-ed'] = async el => { const t = val('loEd').trim(); if (!t) return toast('글을 넣어 주세요.', 'warn'); el.disabled = true; try { O.c._ed = await api('POST', '/api/lms/o/editor', { action: el.dataset.a, text: t, lang: val('loEdL') }); } catch (e) { toast(e.message, 'warn'); } el.disabled = false; render(); };
  ACT['lmso-edcopy'] = () => { const e = document.getElementById('loEd'); if (e && O.c._ed) e.value = O.c._ed.text; };
  ACT['lmso-eval'] = el => { const b = { member_no: val('loEvM').trim(), max_score: +val('loEvMax') || 100, rubric_gen_id: val('loEvR') || null, rubric: val('loEvRt').trim(), answer: val('loEvA').trim(), section_id: UI.loAnSec || null }; el.disabled = true; act(() => api('POST', '/api/lms/o/eval', b), 'AI 평가를 기록했습니다(교수 확정 전 참고용).').then(() => { el.disabled = false; }); };
  ACT['lmso-evok'] = el => modal('AI 평가 확정', `<label class="fl">확정 점수(0~${el.dataset.m})<input name="s" type="number" min="0" max="${el.dataset.m}" step="0.5" value="${esc(el.dataset.s)}"></label><p class="mini">확정해도 성적표 · 학사로 자동 전송하지 않습니다(LMS 기록).</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '확정', kind: 'pri', run: w => { act(() => api('POST', '/api/lms/o/eval/confirm', { eval_id: el.dataset.id, score: +fv(w, 's') }), '확정했습니다.'); } }]);

  /* ── 번역 뷰어(원본 구조 유지) ── */
  function vView() {
    const L = load('gensT', '/api/lms/o/gen/list?kind=translation'); if (!L) return busy; if (L._err) return errBox(L);
    const id = O.view || (L.items[0] && L.items[0].gen_id); const g = L.items.find(x => x.gen_id === id);
    return `<div class="card"><div class="ch"><b>번역 나란히 보기</b><select data-chg="lmso-viewsel">${L.items.map(x => `<option value="${esc(x.gen_id)}" ${x.gen_id === id ? 'selected' : ''}>${esc(LN[x.lang] || x.lang)} · ${esc(ts(x.created_at))} · ${esc(ST[x.status][0])}</option>`).join('') || '<option>번역한 자료 없음</option>'}</select></div>
      ${g ? `<p class="mini">${tag('AI 생성')} ${tag(...ST[g.status])} 원문의 제목 · 문단 · 목록 · 표 행 구조를 그대로 두고 문단 단위로 나란히 보여 줍니다.${g.status !== 'published' ? ' 학생에게는 배포 후 보입니다.' : ''}</p>
      <div class="tw"><table class="lo-tv"><thead><tr><th>원문(한국어)</th><th>${esc(LN[g.lang] || g.lang)}</th></tr></thead><tbody>${g.output.paras.map(p => `<tr><td class="${p.t}">${esc(p.src)}</td><td class="${p.t}">${p.dst ? esc(p.dst) : '<span class="mini">(번역 없음)</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mini">「AI 자료 만들기 › 요약 · 번역」에서 강의자료를 번역하면 원문과 나란히 여기에 나타납니다.</p>'}</div>`;
  }
  ACT['lmso-viewsel'] = el => { O.view = el.value; render(); };

  /* ── 실시간 자막 ── */
  const capUrl = (code, lang, fs) => `${location.origin}${location.pathname}#lmso-cap=${encodeURIComponent(code)}&lang=${lang}&fs=${fs}`;
  function vCap() {
    const R = load('rooms', '/api/lms/o/caption/rooms'); if (!R) return busy; if (R._err) return errBox(R);
    if (!O.room && R.rooms[0]) O.room = R.rooms[0].room_id; const r = R.rooms.find(x => x.room_id === O.room);
    const Ls = r ? load('lines:' + r.room_id, `/api/lms/o/caption/lines?room_id=${r.room_id}&since=0`) : null;
    const ql = UI.loQrL || (r && r.langs[1]) || 'ko', qf = UI.loQrF || 'm';
    const left = `<div class="card"><div class="ch"><b>자막방</b><button class="btn sm" data-act="lmso-roomnew">새 자막방</button></div><div class="lo-list">${R.rooms.map(x => `<button class="lo-it ${x.room_id === O.room ? 'on' : ''}" data-act="lmso-room" data-id="${esc(x.room_id)}"><b>${esc(x.title)}</b><small>${x.status === 'live' ? '진행 중' : '종료'} · ${x.langs.map(l => LN[l]).join(', ')} · ${x.lines}문장</small></button>`).join('') || '<p class="mini">아직 자막방이 없습니다.</p>'}</div></div>`;
    const right = !r ? '<div class="card"><p class="mini">대면 수업용 자막방을 만드세요(「새 자막방」). 학생은 QR로 접속해 언어를 고릅니다.</p></div>' :
      `<div class="card"><div class="ch"><b>${esc(r.title)}</b><small>${r.status === 'live' ? '진행 중' : '종료'}</small>${r.status === 'live' ? '<button class="btn sm" data-act="lmso-roomclose">종료</button>' : ''}</div>
        <div class="lo-qr">${qrSvg(capUrl(r.code, ql, qf))}<div><p class="mini">학생용 QR — 언어 · 글자 크기를 골라 띄우면 학생 화면이 그 설정으로 열립니다(로그인 없이 보기 전용).</p>
        <div class="lo-row"><select data-chg="lmso-qrl">${r.langs.map(l => `<option value="${l}" ${l === ql ? 'selected' : ''}>${LN[l]}</option>`).join('')}</select><select data-chg="lmso-qrf">${[['s', '작게'], ['m', '보통'], ['l', '크게']].map(([k, v]) => `<option value="${k}" ${k === qf ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn sm" data-act="lmso-capopen">학생 화면 열기</button></div><code>${esc(capUrl(r.code, ql, qf))}</code></div></div></div>
      <div class="card"><div class="ch"><b>자막 문장</b><small>지금은 교수자 · 조교가 입력하고 고칩니다 · 음성 자동 받아쓰기는 연동 후</small></div>
        ${r.status === 'live' ? `<div class="lo-row"><input id="loLine" maxlength="1000" style="flex:1;min-width:160px" placeholder="자막 문장 입력 후 Enter"><button class="btn pri" data-act="lmso-line">보내기</button></div>` : ''}
        ${!Ls ? busy : Ls._err ? errBox(Ls) : Ls.lines.map(l => `<div class="lo-line"><span class="mini">#${l.seq}</span><div>${esc(l.text)} ${l.edited ? tag('수정', 'y') : ''} ${l.source === 'stt' ? tag('자동 받아쓰기') : ''}${Object.entries(l.tr || {}).map(([k, v]) => `<br><small class="mini">[${esc(LN[k])}] ${esc(v)}</small>`).join('')}</div><button class="btn sm" data-act="lmso-lineed" data-seq="${l.seq}">수정 · 번역문</button></div>`).join('') || '<p class="mini">아직 자막이 없습니다. 위 칸에 문장을 입력하고 Enter를 누르세요.</p>'}
        <p class="mini">자동 번역은 연동 후 동작합니다. 그 전에는 「수정 · 번역문」에서 언어별 번역문을 직접 넣습니다.</p></div>`;
    return `<div class="lo-grid">${left}<div>${right}</div></div>`;
  }
  ACT['lmso-room'] = el => { O.room = el.dataset.id; render(); };
  ACT['lmso-qrl'] = el => { UI.loQrL = el.value; render(); };
  ACT['lmso-qrf'] = el => { UI.loQrF = el.value; render(); };
  ACT['lmso-roomnew'] = () => modal('새 자막방', `<label class="fl">제목<input name="t" maxlength="80" placeholder="데이터베이스 3차시"></label><label class="fl">분반${secSel('loRmSec', '')}</label><p class="mini">자막 언어(최대 4개, 첫 번째는 원문)</p><div class="lo-langs">${LANGS.map((l, i) => `<label><input type="checkbox" class="loRmL" value="${l}" ${i < 2 ? 'checked' : ''}> ${LN[l]}</label>`).join('')}</div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const langs = [...w.querySelectorAll('.loRmL:checked')].map(x => x.value); if (!fv(w, 't')) return false; if (langs.length > 4) { toast('자막 언어는 최대 4개입니다.', 'warn'); return false; } act(async () => { const r = await api('POST', '/api/lms/o/caption/room', { title: fv(w, 't'), section_id: val('loRmSec') || null, langs }); O.room = r.room.room_id; return r; }, '자막방을 열었습니다.'); } }]);
  ACT['lmso-roomclose'] = () => act(() => api('PUT', '/api/lms/o/caption/room', { room_id: O.room, status: 'closed' }), '자막방을 종료했습니다.');
  ACT['lmso-line'] = () => { const t = val('loLine').trim(); if (!t) return; act(() => api('POST', '/api/lms/o/caption/line', { room_id: O.room, text: t })).then(() => { const e = document.getElementById('loLine'); if (e) e.focus(); }); };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'loLine') { e.preventDefault(); ACT['lmso-line'](); } });
  ACT['lmso-lineed'] = el => { const L = O.c['lines:' + O.room].lines.find(x => x.seq === +el.dataset.seq); const r = O.c.rooms.rooms.find(x => x.room_id === O.room);
    modal(`자막 #${L.seq} 수정`, `<label class="fl">원문<input name="t" maxlength="1000" value="${esc(L.text)}"></label>${r.langs.filter(l => l !== 'ko').map(l => `<label class="fl">${LN[l]} 번역문<input name="tr_${l}" maxlength="1000" value="${esc((L.tr || {})[l] || '')}"></label>`).join('')}`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const tr = {}; r.langs.filter(l => l !== 'ko').forEach(l => { const v = fv(w, 'tr_' + l); if (v) tr[l] = v; }); act(() => api('PUT', '/api/lms/o/caption/line', { room_id: O.room, seq: L.seq, text: fv(w, 't'), tr: Object.keys(tr).length ? tr : null }), '수정했습니다.'); } }]); };
  ACT['lmso-capopen'] = () => { const r = O.c.rooms.rooms.find(x => x.room_id === O.room); capOverlay(r.code, UI.loQrL || r.langs[1] || 'ko', UI.loQrF || 'm'); };

  /* 학생 자막 화면(QR · 로그인 없음) */
  let capTimer = 0;
  function capOverlay(code, lang, fs) {
    clearInterval(capTimer); let w = document.getElementById('loCap'); if (!w) { w = document.createElement('div'); w.id = 'loCap'; w.className = 'lo-cap'; document.body.appendChild(w); }
    const size = { s: 18, m: 24, l: 34 }[fs] || 24; let lines = [], room = null, since = 0, err = '';
    const draw = () => { w.innerHTML = `<header><b>${esc(room ? room.title : '실시간 자막')}</b><select id="loCapL">${(room ? room.langs : [lang]).map(l => `<option value="${l}" ${l === lang ? 'selected' : ''}>${esc(LN[l] || l)}</option>`).join('')}</select><button id="loCapX">닫기</button></header>${err ? `<p>${esc(err)}</p>` : ''}${room && room.status === 'closed' ? '<p><small>수업 자막이 종료되었습니다.</small></p>' : ''}<div style="font-size:${size}px">${lines.slice(-40).map(l => `<p>${esc(l.text)}${l.tr ? `<small>${esc(l.tr)}</small>` : lang !== 'ko' ? '<small>(번역 엔진 연동 후 표시)</small>' : ''}</p>`).join('')}</div>`;
      w.querySelector('#loCapX').onclick = () => { clearInterval(capTimer); w.remove(); if (location.hash.startsWith('#lmso-cap=')) history.replaceState(null, '', location.pathname); };
      w.querySelector('#loCapL').onchange = e => { lang = e.target.value; since = 0; lines = []; tick(); }; w.scrollTop = w.scrollHeight; };
    const tick = async () => { try { const j = await api('GET', `/api/lms/o/caption/view?code=${encodeURIComponent(code)}&lang=${lang}&since=${since}`); room = j.room; err = ''; j.lines.forEach(l => { const i = lines.findIndex(x => x.seq === l.seq); if (i >= 0) lines[i] = l; else lines.push(l); }); if (j.lines.length) since = Math.max(since, ...j.lines.map(l => l.seq)); } catch (e) { err = e.message; } draw(); };
    draw(); tick(); capTimer = setInterval(() => { since = 0; tick(); }, 3000);
  }
  function capFromHash() { const m = /^#lmso-cap=([^&]+)&lang=([a-z]{2})(?:&fs=([sml]))?/.exec(location.hash || ''); if (m) capOverlay(decodeURIComponent(m[1]), m[2], m[3] || 'm'); }
  window.addEventListener('hashchange', capFromHash); setTimeout(capFromHash, 1200);

  /* QR 부호기(바이트 모드 · 오류정정 L · 버전 1~10 · 마스크 0) */
  function qrMatrix(text) {
    const data = Array.from(new TextEncoder().encode(text)); const ECC = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18], BLK = [1, 1, 1, 1, 1, 2, 2, 2, 2, 4];
    const rawMods = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
    let ver = 0, cap = 0; for (let v = 1; v <= 10; v++) { cap = Math.floor(rawMods(v) / 8) - ECC[v - 1] * BLK[v - 1]; if (4 + (v < 10 ? 8 : 16) + data.length * 8 <= cap * 8) { ver = v; break; } } if (!ver) return null;
    const bits = []; const put = (x, n) => { for (let i = n - 1; i >= 0; i--) bits.push((x >>> i) & 1); };
    put(4, 4); put(data.length, ver < 10 ? 8 : 16); data.forEach(b => put(b, 8)); put(0, Math.min(4, cap * 8 - bits.length)); put(0, (8 - bits.length % 8) % 8); for (let p = 0xec; bits.length < cap * 8; p ^= 0xec ^ 0x11) put(p, 8);
    const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 255; };
    const ec = ECC[ver - 1], nb = BLK[ver - 1]; const div = new Array(ec).fill(0); div[ec - 1] = 1; let root = 1;
    for (let i = 0; i < ec; i++) { for (let j = 0; j < ec; j++) { div[j] = mul(div[j], root); if (j + 1 < ec) div[j] ^= div[j + 1]; } root = mul(root, 2); }
    const rem = d => { const r = new Array(ec).fill(0); for (const b of d) { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < ec; i++) r[i] ^= mul(div[i], f); } return r; };
    const raw = Math.floor(rawMods(ver) / 8), nShort = nb - raw % nb, sLen = Math.floor(raw / nb); const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = cw.slice(k, k + sLen - ec + (i < nShort ? 0 : 1)); k += d.length; const e = rem(d); if (i < nShort) d.push(0); blocks.push(d.concat(e)); }
    const all = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== sLen - ec || j >= nShort) all.push(b[i]); });
    const N = ver * 4 + 17; const M = Array.from({ length: N }, () => new Array(N).fill(false)); const F = Array.from({ length: N }, () => new Array(N).fill(false)); const fn = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
    for (let i = 0; i < N; i++) { fn(6, i, i % 2 === 0); fn(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [N - 4, 3], [3, N - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < N && y >= 0 && y < N) fn(x, y, d !== 2 && d !== 4); }
    if (ver > 1) { const n = Math.floor(ver / 7) + 2; const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2; const pos = [6]; for (let p = N - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
      pos.forEach((a, i) => pos.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) fn(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); })); }
    const r0 = 1 << 3; let fb = r0; for (let i = 0; i < 10; i++) fb = (fb << 1) ^ ((fb >>> 9) * 0x537); fb = ((r0 << 10) | fb) ^ 0x5412; const bt = i => ((fb >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) fn(8, i, bt(i)); fn(8, 7, bt(6)); fn(8, 8, bt(7)); fn(7, 8, bt(8)); for (let i = 9; i < 15; i++) fn(14 - i, 8, bt(i));
    for (let i = 0; i < 8; i++) fn(N - 1 - i, 8, bt(i)); for (let i = 8; i < 15; i++) fn(8, N - 15 + i, bt(i)); fn(8, N - 8, true);
    if (ver >= 7) { let v = ver; for (let i = 0; i < 12; i++) v = (v << 1) ^ ((v >>> 11) * 0x1f25); const vb = (ver << 12) | v; for (let i = 0; i < 18; i++) { const d = ((vb >>> i) & 1) === 1, a = N - 11 + i % 3, b = Math.floor(i / 3); fn(a, b, d); fn(b, a, d); } }
    let i = 0; for (let right = N - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < N; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? N - 1 - vert : vert; if (!F[y][x] && i < all.length * 8) { M[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!F[y][x] && (x + y) % 2 === 0) M[y][x] = !M[y][x];
    return M;
  }
  function qrSvg(text) { const M = qrMatrix(text); if (!M) return '<div class="empty">주소가 길어 QR을 만들 수 없습니다.</div>'; const N = M.length + 8; let p = ''; M.forEach((row, y) => row.forEach((d, x) => { if (d) p += `M${x + 4} ${y + 4}h1v1h-1z`; })); return `<svg viewBox="0 0 ${N} ${N}" role="img" aria-label="자막 접속 QR" shape-rendering="crispEdges"><rect width="${N}" height="${N}" fill="#fff"/><path d="${p}" fill="#000"/></svg>`; }
  window.lmsoQr = qrMatrix;

  /* ═════════ AI 관리(aigov) 확장 ═════════ */
  const baseAigov = VIEWS.aigov;
  if (baseAigov) VIEWS.aigov = () => {
    let h = baseAigov(); const mine = [['lo-prov', 'LLM 플러그인'], ['lo-mon', '응답시간 · 토큰'], ['lo-quota', '토큰 할당량'], ['lo-rag', 'RAG 소스(동적)']];
    const cur = UI.aiT || 'model'; const at = h.indexOf('<div class="seg2" role="tablist">');
    if (at >= 0) { const end = h.indexOf('</div>', at); h = h.slice(0, end) + mine.map(([id, l]) => `<button role="tab" aria-selected="${id === cur}" class="${id === cur ? 'on' : ''}" data-act="tab" data-key="aiT" data-v="${id}">${esc(l)}</button>`).join('') + h.slice(end); }
    if (cur.startsWith('lo-')) { try { h += ({ 'lo-prov': vProv, 'lo-mon': vMon, 'lo-quota': vQuota, 'lo-rag': vSrc })[cur](); } catch (e) { h += `<div class="empty">${esc(e.message)}</div>`; } }
    return h;
  };
  function vProv() {
    const P = load('prov', '/api/lms/o/llm/providers'); if (!P) return busy; if (P._err) return errBox(P); const ed = editable();
    return `<div class="card"><div class="ch"><b>LLM 제공자 플러그인</b><small>상용 API ↔ 대학 자체 LLM(OpenAI 호환 엔드포인트) 교체 가능 ${modeTag()}</small>${ed ? '<button class="btn sm pri" data-act="lmso-provnew">제공자 추가</button>' : ''}</div>
      ${table(['이름', '종류', '모델', '엔드포인트', '상태', ''], P.providers.map(p => [esc(p.name), p.kind === 'anthropic' ? tag('상용 API') : tag('학내 자체 LLM', 'y'), esc(p.model), esc(p.endpoint_url || '서버 비밀 설정'), p.enabled ? tag('사용', 'ok') : tag('끔'), ed ? `<button class="btn sm" data-act="lmso-provtg" data-id="${esc(p.provider_id)}">${p.enabled ? '끄기' : '켜기'}</button> <button class="btn sm" data-act="lmso-provdel" data-id="${esc(p.provider_id)}">삭제</button>` : '']))}
      <p class="mini">학내 자체 LLM은 서버 허용 목록(LLM_SELFHOST_HOSTS)에 주소가 등록된 뒤 호출됩니다 — 그 전에는 「연동 후 동작」 안내로 응답합니다. API 키는 서버 비밀 저장소에만 둡니다.</p></div>
      <div class="card"><div class="ch"><b>기능별 제공자</b><small>지정하지 않으면 켜진 상용 제공자를 씁니다</small></div>${P.features.map(f => `<div class="row"><span>${esc(FEAT[f] || f)}</span><select data-chg="lmso-route" data-f="${f}" ${ed ? '' : 'disabled'}><option value="">(기본)</option>${P.providers.filter(p => p.enabled).map(p => `<option value="${esc(p.provider_id)}" ${P.routes[f] === p.provider_id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>`).join('')}</div>`;
  }
  ACT['lmso-provnew'] = () => { const P = O.c.prov; modal('LLM 제공자 추가', `<label class="fl">종류<select name="k"><option value="openai_compat">대학 자체 LLM(OpenAI 호환)</option><option value="anthropic">상용 API(Anthropic)</option></select></label><label class="fl">이름<input name="n" maxlength="40" placeholder="학내 LLM(GPU 서버)"></label><label class="fl">모델<input name="m" maxlength="80" placeholder="qwen2.5-72b-instruct 또는 ${esc(P.models[0])}"></label><label class="fl">엔드포인트(자체 LLM)<input name="u" maxlength="300" placeholder="https://llm.univ.ac.kr/v1/chat/completions"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { act(() => api('POST', '/api/lms/o/llm/provider', { kind: fv(w, 'k'), name: fv(w, 'n'), model: fv(w, 'm'), endpoint_url: fv(w, 'u') || null }), '제공자를 추가했습니다.'); } }]); };
  ACT['lmso-provtg'] = el => { const p = O.c.prov.providers.find(x => x.provider_id === el.dataset.id); act(() => api('POST', '/api/lms/o/llm/provider', { provider_id: p.provider_id, kind: p.kind, name: p.name, model: p.model, endpoint_url: p.endpoint_url, enabled: !p.enabled }), p.enabled ? '껐습니다.' : '켰습니다.'); };
  ACT['lmso-provdel'] = el => act(() => api('DELETE', '/api/lms/o/llm/provider?id=' + el.dataset.id), '제공자를 지웠습니다.');
  ACT['lmso-route'] = el => act(() => api('POST', '/api/lms/o/llm/route', { feature: el.dataset.f, provider_id: el.value || null }), '기능별 제공자를 바꿨습니다.');
  function vMon() {
    const d = +(UI.loMonD || 30); const M = load('mon:' + d, '/api/lms/o/llm/metrics?days=' + d); if (!M) return busy; if (M._err) return errBox(M);
    const tot = M.models.reduce((s, m) => ({ calls: s.calls + m.calls, tok: s.tok + m.tin + m.tout, err: s.err + m.errors }), { calls: 0, tok: 0, err: 0 });
    const mx = Math.max(1, ...M.daily.map(x => x.tokens));
    return `<div class="card"><div class="ch"><b>모델별 응답시간 · 토큰</b>${tabs('loMonD', [['7', '7일'], ['30', '30일'], ['90', '90일']], String(d))}</div>
      <div class="kpis">${kpi('호출', tot.calls.toLocaleString() + '건')}${kpi('토큰', tot.tok.toLocaleString())}${kpi('오류', tot.err + '건', '', tot.err ? 'bad' : '')}</div>
      ${table(['제공자', '모델', '호출', '오류', '평균 응답', 'P95', '입력 토큰', '출력 토큰'], M.models.map(m => [esc(m.provider_kind), esc(m.model), m.calls, m.errors, (m.avg_ms / 1000).toFixed(2) + '초', (m.p95_ms / 1000).toFixed(2) + '초', m.tin.toLocaleString(), m.tout.toLocaleString()]), '아직 호출 기록이 없습니다.')}</div>
      <div class="card"><div class="ch"><b>기능별</b></div>${table(['기능', '모델', '호출', '평균 응답', '토큰'], M.rows.map(r => [esc(FEAT[r.feature] || r.feature), esc(r.model), r.calls, (r.avg_ms / 1000).toFixed(2) + '초', (r.tin + r.tout).toLocaleString()]), '기록 없음')}
      ${M.daily.length ? `<div style="margin-top:10px">${M.daily.map(x => `<div class="row"><span style="width:96px">${esc(x.day)}</span><span class="lo-bar" style="flex:1"><i style="width:${Math.round(x.tokens * 100 / mx)}%"></i></span><span class="mini" style="width:120px;text-align:right">${x.tokens.toLocaleString()} · ${(x.avg_ms / 1000).toFixed(1)}초</span></div>`).join('')}</div>` : ''}</div>`;
  }
  function vQuota() {
    const Qd = load('quota', '/api/lms/o/llm/quota'); if (!Qd) return busy; if (Qd._err) return errBox(Qd); const ed = editable();
    const stN = { unlimited: ['무제한', ''], ok: ['정상', 'ok'], warn: ['경고', 'y'], over: ['초과', 'bad'] }[Qd.state];
    return `<div class="card"><div class="ch"><b>기관 월 토큰 할당량</b><small>${esc(Qd.month)} · KST 기준</small>${tag(...stN)}</div>
      <div class="kpis">${kpi('사용', Qd.used_tokens.toLocaleString())}${kpi('할당량', Qd.limit_tokens ? Qd.limit_tokens.toLocaleString() : '무제한')}${kpi('사용률', Qd.pct + '%')}</div>
      ${Qd.limit_tokens ? `<div class="lo-bar ${Qd.state}"><i style="width:${Math.min(100, Qd.pct)}%"></i></div>` : ''}
      <div class="lo-form" style="margin-top:10px"><label>월 할당량(토큰, 0 = 무제한)<input id="loQL" type="number" min="0" step="1000" value="${Qd.limit_tokens}" ${ed ? '' : 'disabled'}></label><label>경고 비율(%)<input id="loQA" type="number" min="1" max="100" value="${Qd.alert_pct}" ${ed ? '' : 'disabled'}></label><label><span>초과 시 차단</span><input id="loQB" type="checkbox" ${Qd.hard_block ? 'checked' : ''} ${ed ? '' : 'disabled'}></label>${ed ? '<button class="btn pri" data-act="lmso-quota">저장</button>' : ''}</div></div>
      <div class="card"><div class="ch"><b>초과 알림</b><small>경고 · 초과는 달마다 한 번씩 기록되고 감사 로그에 남습니다(메일 · 문자 알림은 연동 후 동작)</small></div>${table(['달', '단계', '사용', '할당량', '때'], Qd.alerts.map(a => [esc(a.month), a.level === 'over' ? tag('초과', 'bad') : tag('경고', 'y'), a.used.toLocaleString(), a.limit_tokens.toLocaleString(), esc(ts(a.at))]), '알림이 없습니다.')}</div>`;
  }
  ACT['lmso-quota'] = () => act(() => api('PUT', '/api/lms/o/llm/quota', { limit_tokens: Math.max(0, parseInt(val('loQL'), 10) || 0), alert_pct: Math.min(100, Math.max(1, parseInt(val('loQA'), 10) || 80)), hard_block: !!val('loQB') }), '할당량을 저장했습니다.');
  function vSrc() {
    const s = load('sources', '/api/lms/o/rag/sources'), P = load('prov', '/api/lms/o/llm/providers'); if (!s || !P) return busy; if (s._err) return errBox(s); const ed = editable();
    const K = { file: '파일', url: '웹 주소', board: '게시판(학사 공지)', manual: '직접 입력' };
    return `<div class="card"><div class="ch"><b>RAG 소스(동적 추가)</b><small>끄면 즉시 검색 · 답변 근거에서 빠집니다</small>${ed ? '<button class="btn sm pri" data-act="lmso-srcnew">소스 추가</button>' : ''}</div>
      ${table(['소스', '종류', '분반', '문서', '마지막 색인', '상태', ''], s.sources.map(x => [esc(x.name), esc(K[x.kind]), esc(secName(x.section_id)), x.docs, esc(ts(x.indexed_at)), x.state === 'pending' ? tag('연동 후 동작', 'y') : x.enabled ? tag('사용', 'ok') : tag('끔'), ed ? `<button class="btn sm" data-act="lmso-srctg" data-id="${esc(x.source_id)}" data-v="${x.enabled ? 0 : 1}">${x.enabled ? '끄기' : '켜기'}</button> <button class="btn sm" data-act="lmso-srcdel" data-id="${esc(x.source_id)}">삭제</button>` : '']), '소스가 없습니다.')}
      <p class="mini">파일 소스는 「AI 학습 지원 › 자료 · RAG」에서 올립니다. 웹 주소 수집 · 학사 공지 게시판 수집은 연동 후 동작합니다. 학생별 개인정보는 색인하지 않습니다.</p></div>
      <div class="card"><div class="ch"><b>임베딩</b><small>현재 ${esc(P._err ? '—' : P.embed.active)} · ${P._err ? '' : P.embed.dim}차원</small></div><div class="lo-form"><label>방식<select id="loEmK" ${ed ? '' : 'disabled'}><option value="local-hash" ${!P._err && P.embed.kind === 'local-hash' ? 'selected' : ''}>로컬 해시 벡터(외부 전송 없음)</option><option value="endpoint" ${!P._err && P.embed.kind === 'endpoint' ? 'selected' : ''}>외부 · 학내 임베딩 엔드포인트</option></select></label><label>엔드포인트<input id="loEmU" maxlength="300" value="${esc(!P._err && P.embed.endpoint || '')}" ${ed ? '' : 'disabled'}></label>${ed ? '<button class="btn" data-act="lmso-embed">저장</button>' : ''}</div>${!P._err && P.embed.note ? `<p class="mini">${esc(P.embed.note)}</p>` : ''}</div>`;
  }
  ACT['lmso-srcnew'] = () => modal('RAG 소스 추가', `<label class="fl">이름<input name="n" maxlength="60" placeholder="2026 학사 운영 규정"></label><label class="fl">종류<select name="k"><option value="file">파일</option><option value="manual">직접 입력</option><option value="url">웹 주소</option><option value="board">게시판(학사 공지)</option></select></label><label class="fl">주소(웹 주소일 때)<input name="u" maxlength="300" placeholder="https://"></label><label class="fl">분반(선택)${secSel('loSrcSec', '')}</label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { act(() => api('POST', '/api/lms/o/rag/source', { name: fv(w, 'n'), kind: fv(w, 'k'), url: fv(w, 'u') || null, section_id: val('loSrcSec') || null }), '소스를 추가했습니다.'); } }]);
  ACT['lmso-srctg'] = el => act(() => api('PUT', '/api/lms/o/rag/source', { source_id: el.dataset.id, enabled: el.dataset.v === '1' }), el.dataset.v === '1' ? '켰습니다.' : '껐습니다 — 검색 근거에서 빠집니다.');
  ACT['lmso-srcdel'] = el => act(() => api('DELETE', '/api/lms/o/rag/source?id=' + el.dataset.id), '소스와 문서를 지웠습니다.');
  ACT['lmso-embed'] = () => act(() => api('PUT', '/api/lms/o/llm/embed', { kind: val('loEmK'), endpoint: val('loEmU') }), '임베딩 설정을 저장했습니다.');

  /* ═════════ 데모 처리기(서버 없이 같은 응답 모양) ═════════ */
  const uid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
  const iso = () => new Date().toISOString();
  function D() {
    const L = S.lms = S.lms || {}; if (L.o) return L.o;
    const s1 = uid(), s2 = uid(), src = uid(), doc = uid();
    const paras = [{ t: 'h', x: '3차시 정규화' }, { t: 'p', x: '정규화는 데이터 중복을 줄이고 이상 현상을 막는 설계 기법입니다.' }, { t: 'li', x: '제1정규형: 모든 속성은 원자값' }, { t: 'li', x: '제2정규형: 부분 함수 종속 제거' }, { t: 'p', x: '00:01:10 함수 종속성을 분석하고 비교합니다.' }];
    L.o = { sections: [{ section_id: s1, title: '데이터베이스 01분반', course_code: 'CSE3001', term_id: '2026-2', section_no: '01', students: 3 }, { section_id: s2, title: '경영정보 02분반', course_code: 'BUS2002', term_id: '2026-2', section_no: '02', students: 2 }],
      sources: [{ source_id: src, name: '강의자료실(강의실별)', kind: 'file', section_id: null, url: null, enabled: true, indexed_at: iso(), created_at: iso() }, { source_id: uid(), name: '학사 공지 게시판', kind: 'board', section_id: null, url: null, enabled: true, indexed_at: null, created_at: iso() }],
      docs: [{ doc_id: doc, source_id: src, section_id: s1, name: '3차시 정규화.md', ext: 'md', bytes: 420, chars: 160, paras, created_by: '데모', created_at: iso() }],
      threads: [], msgs: {}, faq: [{ faq_id: uid(), section_id: null, q: '과제 제출 마감은 언제인가요?', a: '과제는 해당 주 금요일 23:59까지 제출합니다.', tags: '과제', created_at: iso() }], gens: [], evals: [], rooms: [], lines: {},
      providers: [{ provider_id: uid(), kind: 'anthropic', name: 'Anthropic Claude(상용)', endpoint_url: null, model: 'claude-haiku-5-5', enabled: true, created_at: iso() }], routes: {}, embed: { kind: 'local-hash' },
      setting: { limit_tokens: 2000000, alert_pct: 80, hard_block: true }, calls: [], alerts: [],
      people: [['20261234', 'CSE', 9, 1, 0, 0, 91.5], ['20261235', 'CSE', 6, 1, 3, 0, 58], ['20261236', 'CSE', 8, 0, 1, 1, 74]] };
    try { seedMore(L.o, s1, doc); } catch (e) { console.warn('lmso 데모 시드', e); }
    return L.o;
  }
  /* 데모 샘플(빈 화면 없애기): 묶음 A 학기 · 분반 · 수강생을 쓰고, 질문 대화 · 검토 대기 · 번역 · 자막방 · 채점 기록을 하나씩 둔다 */
  function seedMore(o, s1, doc) {
    const A = window.LMP && LMP.demoA ? LMP.demoA() : null; const hsh = t => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) % 9973; return h; };
    if (A && A.sections.length) {
      const t = (A.terms.find(x => x.is_operating) || A.terms[0] || {}).term_id; const SC = A.sections.filter(x => x.term_id === t && !x.hidden).slice(0, 6);
      if (SC.length) { const first = o.sections[0];
        o.sections = SC.map((x, i) => ({ section_id: i === 0 ? first.section_id : x.section_id, title: x.title, course_code: x.course_code, term_id: x.term_id, section_no: x.section_no, students: A.enr.filter(e => e.section_id === x.section_id && e.status === 'enrolled').length, _a: x.section_id }));
        o.roster = {}; o.sections.forEach(x => { const P = A.enr.filter(e => e.section_id === x._a && e.status === 'enrolled').map(e => A.persons.find(p => p.member_no === e.member_no)).filter(Boolean);
          o.roster[x.section_id] = P.slice(0, 40).map(p => { const h = hsh(p.member_no + x._a); const ab = h % 11 === 0 ? 3 : h % 5 === 0 ? 1 : 0, la = h % 3 === 0 ? 1 : 0, ex = h % 13 === 0 ? 1 : 0; return [p.member_no, p.unit_code || '', 10 - ab - la - ex, la, ab, ex, h % 17 === 0 ? 55 : 62 + h % 36]; }); }); }
    }
    const sx = o.sections[0].section_id; const at = d => new Date(Date.now() - d * 36e5).toISOString();
    const d0 = o.docs[0]; d0.section_id = sx;
    o.docs.push({ doc_id: uid(), source_id: d0.source_id, section_id: o.sections[1] ? o.sections[1].section_id : sx, name: '1차시 강의계획서.md', ext: 'md', bytes: 380, chars: 150, paras: [{ t: 'h', x: '강의계획서' }, { t: 'p', x: '과제는 매주 금요일 23:59까지 제출합니다. 중간고사는 8차시, 기말고사는 15차시입니다.' }, { t: 'li', x: '출석 20% · 과제 30% · 시험 50%' }], created_by: '데모', created_at: at(72) });
    const tid = uid(); o.threads.push({ thread_id: tid, title: '제2정규형은 무엇을 없애나요?', owner: '데모', section_id: sx, member_no: null, temperature: 0.3, top_k: 4, share_token: null, created_at: at(5), updated_at: at(5) });
    o.msgs[tid] = [{ seq: 1, role: 'user', content: '제2정규형은 무엇을 없애나요?', cites: [], faq_id: null, edited: false, at: at(5) },
      { seq: 2, role: 'assistant', content: '(데모 응답) 강의자료에 따르면 제2정규형은 부분 함수 종속을 제거합니다[1].', cites: [{ n: 1, doc_id: doc, name: d0.name, seq: 3, score: 0.82, snippet: '제2정규형: 부분 함수 종속 제거' }], faq_id: null, edited: false, at: at(5) }];
    o.gens.push({ gen_id: uid(), kind: 'summary', section_id: sx, doc_id: doc, lang: 'ko', params: {}, output: { text: '- 정규화는 데이터 중복을 줄이는 설계 기법\n- 제1정규형: 원자값\n- 제2정규형: 부분 함수 종속 제거\n한 줄 요약: (데모) 정규화로 이상 현상을 막습니다.' }, parsed: true, status: 'review', created_by: '데모', reviewer: null, review_note: null, created_at: at(3), reviewed_at: null, published_at: null, ai_generated: true },
      { gen_id: uid(), kind: 'quiz', section_id: sx, doc_id: doc, lang: 'ko', params: { difficulty: 'medium', langs: ['ko'], count: 2 }, output: { items: [{ q: '(데모) 제2정규형에서 제거하는 것은?', options: ['부분 함수 종속', '이행 함수 종속', '다치 종속', '조인 종속'], answer: 0, explain: '(데모 해설) 제2정규형은 부분 함수 종속을 제거합니다.', difficulty: 'medium', tr: {} }, { q: '(데모) 제1정규형의 조건은?', options: ['원자값', '기본키 없음', '중복 허용', '외래키 필수'], answer: 0, explain: '(데모 해설) 모든 속성이 원자값이어야 합니다.', difficulty: 'easy', tr: {} }], match: 1 }, parsed: true, status: 'review', created_by: '데모', reviewer: null, review_note: null, created_at: at(2), reviewed_at: null, published_at: null, ai_generated: true },
      { gen_id: uid(), kind: 'translation', section_id: sx, doc_id: doc, lang: 'en', params: { paras: d0.paras.length }, output: { paras: d0.paras.map(p => ({ t: p.t, src: p.x, dst: '[en] ' + p.x })), complete: true }, parsed: true, status: 'published', created_by: '데모', reviewer: '데모', review_note: null, created_at: at(30), reviewed_at: at(29), published_at: at(29), ai_generated: true });
    const rid = uid(); o.rooms.push({ room_id: rid, section_id: sx, title: (o.sections[0].title || '수업') + ' 3차시', langs: ['ko', 'en', 'vi'], code: 'demo.' + Math.random().toString(36).slice(2, 12), status: 'closed', created_at: at(26) });
    o.lines[rid] = [{ seq: 1, text: '오늘은 정규화를 배웁니다.', tr: { en: 'Today we learn normalization.' }, source: 'manual', edited: false, at: at(26) }, { seq: 2, text: '먼저 제1정규형부터 봅시다.', tr: {}, source: 'manual', edited: false, at: at(26) }];
    const r0 = (o.roster && o.roster[sx] && o.roster[sx][0]) ? o.roster[sx][0][0] : '20261234';
    o.evals.push({ eval_id: uid(), section_id: sx, member_no: r0, rubric_gen_id: null, answer_chars: 420, max_score: 100, ai_score: 78, rationale: '(데모) 정규화 단계는 맞게 설명했고, 예시 근거를 보완하면 좋습니다.', status: 'suggested', final_score: null, created_at: at(4) });
  }
  const dErr = (st, m, c) => { const e = new Error(m); e.status = st; e.code = c; throw e; };
  const words = s => String(s || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 2);
  const sim = (a, b) => { const A = new Set(words(a)), B = words(b); if (!A.size || !B.length) return 0; let n = 0; B.forEach(w => { if (A.has(w) || [...A].some(x => x.includes(w) || w.includes(x))) n++; }); return Math.round(n / Math.sqrt(A.size * B.length) * 10000) / 10000; };
  function dCall(feature, tin, tout) { const o = D(); const p = o.providers.find(x => x.provider_id === o.routes[feature] && x.enabled) || o.providers.find(x => x.enabled && x.kind === 'anthropic') || o.providers[0];
    if (p.kind !== 'anthropic') dErr(503, '학내 LLM 서버 연동 후 동작합니다(서버 허용 목록에 주소 등록 필요).', 'provider_pending');
    const used = o.calls.reduce((s, c) => s + c.tin + c.tout, 0); if (o.setting.limit_tokens > 0 && o.setting.hard_block && used >= o.setting.limit_tokens) dErr(429, '이번 달 기관 토큰 할당량을 모두 썼습니다.', 'token_quota');
    o.calls.push({ at: iso(), kind: p.kind, model: p.model, feature, ms: 600 + Math.round(Math.random() * 900), tin, tout, ok: true }); return { provider: p.kind, model: p.model, usage: { input_tokens: tin, output_tokens: tout } }; }
  const dChunks = () => D().docs.flatMap(d => { const src = D().sources.find(s => s.source_id === d.source_id); if (src && !src.enabled) return []; return d.paras.map((p, i) => ({ doc_id: d.doc_id, name: d.name, seq: i, text: p.x, section_id: d.section_id })); });
  function dSearch(q, k, secs) { return dChunks().filter(c => !secs || !c.section_id || secs.includes(c.section_id)).map(c => ({ doc_id: c.doc_id, name: c.name, seq: c.seq, score: sim(c.text, q), text: c.text })).filter(h => h.score > 0).sort((a, b) => b.score - a.score).slice(0, k); }
  const dGen = (kind, f) => { const g = { gen_id: uid(), kind, section_id: f.section_id || null, doc_id: f.doc_id || null, lang: f.lang || 'ko', params: f.params || {}, output: f.output, parsed: true, status: 'review', created_by: S.me.name, reviewer: null, review_note: null, created_at: iso(), reviewed_at: null, published_at: null, ai_generated: true }; D().gens.unshift(g); return g; };
  function dExtract(name, b64) { const ext = name.split('.').pop().toLowerCase(); if (['docx', 'xlsx'].includes(ext)) dErr(422, '데모에서는 txt · md · csv · html · srt만 추출합니다(docx · xlsx는 운영 서버에서 추출).', 'extract');
    if (!['txt', 'md', 'csv', 'html', 'htm', 'srt', 'vtt'].includes(ext)) dErr(400, '지원하지 않는 파일 형식입니다(txt · md · csv · html · docx · xlsx · srt · vtt).', 'ext');
    let s = new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))).replace(/\r\n?/g, '\n');
    if (ext === 'html' || ext === 'htm') { const d = new DOMParser().parseFromString(s, 'text/html'); d.querySelectorAll('script,style').forEach(x => x.remove()); return [...d.body.querySelectorAll('h1,h2,h3,h4,p,li,tr')].map(e => ({ t: /^H/.test(e.tagName) ? 'h' : e.tagName === 'LI' ? 'li' : e.tagName === 'TR' ? 'row' : 'p', x: e.textContent.trim() })).filter(p => p.x); }
    if (ext === 'csv') return s.split('\n').filter(l => l.trim()).map(l => ({ t: 'row', x: l.split(',').map(x => x.replace(/^"|"$/g, '').trim()).filter(Boolean).join(' | ') }));
    return s.split(/\n[ \t]*\n/).map(b => b.trim()).filter(Boolean).map(b => { const h = ext === 'md' && /^#{1,6}\s+(.*)/.exec(b); return h ? { t: 'h', x: h[1] } : ext === 'md' && /^[-*+]\s/.test(b) ? { t: 'li', x: b.replace(/^[-*+]\s+/, '') } : { t: 'p', x: b.replace(/\n/g, ' ').replace(/\*\*|`/g, '') }; }); }
  async function DEMO(method, path, b) {
    const o = D(); const u = new URL(path, 'http://x'); const q = u.searchParams; const k = method + ' ' + u.pathname.replace('/api/lms/o/', ''); const fin = r => { save(); return JSON.parse(JSON.stringify(r)); };
    const thr = id => { const t = o.threads.find(x => x.thread_id === id); if (!t) dErr(404, '대화를 찾을 수 없습니다.', 'thread'); return t; };
    const tOut = t => ({ ...t, shared: !!t.share_token, msgs: (o.msgs[t.thread_id] || []).length });
    const docOut = d => { const { paras, ...r } = d; return { ...r, paras_n: paras.length, chunks: paras.length }; };
    const gen = id => { const g = o.gens.find(x => x.gen_id === id); if (!g) dErr(404, '생성물을 찾을 수 없습니다.', 'gen'); return g; };
    const room = id => { const r = o.rooms.find(x => x.room_id === id); if (!r) dErr(404, '자막방을 찾을 수 없습니다.', 'room'); return r; };
    const roomOut = r => ({ ...r, lines: (o.lines[r.room_id] || []).length });
    const docSrc = () => { const d = o.docs.find(x => x.doc_id === b.doc_id); if (!d) dErr(404, '문서를 찾을 수 없습니다.', 'doc'); return d; };
    switch (k) {
      case 'GET sections': return fin({ sections: o.sections });
      case 'GET rag/sources': return fin({ sources: o.sources.map(s => ({ ...s, state: s.kind === 'url' || s.kind === 'board' ? 'pending' : 'ready', docs: o.docs.filter(d => d.source_id === s.source_id).length })) });
      case 'POST rag/source': { if (!b.name) dErr(400, '이름을 넣어 주세요.', 'name'); const s = { source_id: uid(), name: b.name, kind: b.kind, section_id: b.section_id, url: b.url, enabled: true, indexed_at: null, created_at: iso() }; o.sources.push(s); logAudit('RAG 소스 추가 — ' + b.name); return fin({ source: s }); }
      case 'PUT rag/source': { const s = o.sources.find(x => x.source_id === b.source_id); if (typeof b.enabled === 'boolean') s.enabled = b.enabled; return fin({ source: s }); }
      case 'DELETE rag/source': o.sources = o.sources.filter(x => x.source_id !== q.get('id')); o.docs = o.docs.filter(x => x.source_id !== q.get('id')); return fin({ ok: true });
      case 'POST rag/upload': { const paras = dExtract(b.name, b.b64); if (!paras.length) dErr(422, '본문이 비어 있습니다.', 'empty'); const d = { doc_id: uid(), source_id: b.source_id, section_id: b.section_id, name: b.name, ext: b.name.split('.').pop().toLowerCase(), bytes: b.b64.length * 3 / 4 | 0, chars: paras.reduce((n, p) => n + p.x.length, 0), paras: paras.slice(0, 300), created_by: S.me.name, created_at: iso() }; o.docs.unshift(d); const s = o.sources.find(x => x.source_id === b.source_id); if (s) s.indexed_at = iso(); logAudit('RAG 자료 색인 — ' + b.name); return fin({ doc: docOut(d) }); }
      case 'GET rag/docs': return fin({ docs: o.docs.map(docOut) });
      case 'GET rag/doc': { const d = o.docs.find(x => x.doc_id === q.get('id')); if (!d) dErr(404, '문서를 찾을 수 없습니다.', 'doc'); return fin({ doc: { ...docOut(d), paras: d.paras } }); }
      case 'DELETE rag/doc': o.docs = o.docs.filter(x => x.doc_id !== q.get('id')); return fin({ ok: true });
      case 'POST rag/search': { let secs = null; if (b.member_no) { if (!/^[A-Za-z0-9-]{4,20}$/.test(b.member_no)) dErr(400, '학번 형식이 올바르지 않습니다.', 'member_no'); secs = [o.sections[0].section_id]; } return fin({ hits: dSearch(b.q, b.top_k || 4, secs), scope: secs }); }
      case 'GET qa/threads': return fin({ threads: o.threads.slice().sort((a, c) => c.updated_at.localeCompare(a.updated_at)).map(tOut) });
      case 'POST qa/thread': { if (!(b.temperature >= 0 && b.temperature <= 1)) dErr(400, '온도는 0~1입니다.', 'temperature'); if (!(b.top_k >= 1 && b.top_k <= 10)) dErr(400, '유사답변 수는 1~10입니다.', 'top_k'); const t = { thread_id: uid(), title: b.title || '새 대화', owner: S.me.name, section_id: b.section_id, member_no: b.member_no, temperature: Math.round(b.temperature * 10) / 10, top_k: b.top_k, share_token: null, created_at: iso(), updated_at: iso() }; o.threads.push(t); o.msgs[t.thread_id] = []; return fin({ thread: tOut(t), messages: [] }); }
      case 'GET qa/thread': { const t = q.get('share') ? o.threads.find(x => x.share_token === q.get('share')) : thr(q.get('id')); if (!t) dErr(404, '대화를 찾을 수 없습니다.', 'thread'); return fin({ thread: tOut(t), messages: o.msgs[t.thread_id] || [] }); }
      case 'PUT qa/thread': { const t = thr(b.thread_id); if (b.title) t.title = b.title; if (b.temperature != null) t.temperature = Math.round(b.temperature * 10) / 10; if (b.top_k != null) t.top_k = b.top_k; if (typeof b.shared === 'boolean') t.share_token = b.shared ? (t.share_token || Math.random().toString(36).slice(2, 14).padEnd(12, 'a')) : null; t.updated_at = iso(); return fin({ thread: tOut(t) }); }
      case 'DELETE qa/thread': o.threads = o.threads.filter(x => x.thread_id !== q.get('id')); delete o.msgs[q.get('id')]; return fin({ ok: true });
      case 'PUT qa/message': { const m = (o.msgs[b.thread_id] || []).find(x => x.seq === b.seq); if (!m) dErr(404, '메시지를 찾을 수 없습니다.', 'message'); m.content = b.content; m.edited = true; return fin({ message: m }); }
      case 'POST qa/ask': { const t = thr(b.thread_id); const M = o.msgs[t.thread_id]; const add = (role, content, cites = [], faq_id = null) => { const m = { seq: M.length + 1, role, content, cites, faq_id, edited: false, at: iso() }; M.push(m); return m; };
        const similar = o.faq.map(f => ({ faq_id: f.faq_id, q: f.q, a: f.a, score: sim(f.q, b.q) })).filter(x => x.score > 0).sort((x, y) => y.score - x.score).slice(0, t.top_k);
        const um = add('user', b.q); if (similar[0] && similar[0].score >= 0.75) { const am = add('assistant', similar[0].a, [], similar[0].faq_id); t.updated_at = iso(); return fin({ thread_id: t.thread_id, user: um, answer: am, similar, faq: { faq_id: similar[0].faq_id, q: similar[0].q, score: similar[0].score }, scope: null, ai: null }); }
        const hits = dSearch(b.q, t.top_k, t.member_no ? [o.sections[0].section_id] : null); const ai = dCall('qa', 900, 180);
        const ans = hits.length ? `(데모 응답) 강의자료에 따르면 ${hits.slice(0, 2).map((h, i) => `「${short(h.text, 50)}」[${i + 1}]`).join(', ')} 입니다. 운영 서버에서는 선택한 LLM이 출처를 근거로 답합니다.` : '(데모 응답) 강의자료에서 찾지 못했습니다. 교수자께 문의해 주세요.';
        const am = add('assistant', ans, hits.map((h, i) => ({ n: i + 1, doc_id: h.doc_id, name: h.name, seq: h.seq, score: h.score, snippet: h.text.slice(0, 160) }))); if (t.title === '새 대화') t.title = b.q.slice(0, 40); t.updated_at = iso();
        return fin({ thread_id: t.thread_id, user: um, answer: am, similar, faq: null, scope: null, ai }); }
      case 'GET qa/faq': return fin({ faq: o.faq });
      case 'POST qa/faq': { if (!b.q || !b.a) dErr(400, '질문과 답변을 넣어 주세요.', 'faq'); const f = { faq_id: uid(), section_id: b.section_id || null, q: b.q, a: b.a, tags: b.tags || '', created_at: iso() }; o.faq.unshift(f); return fin({ faq: f }); }
      case 'DELETE qa/faq': o.faq = o.faq.filter(x => x.faq_id !== q.get('id')); return fin({ ok: true });
      case 'POST gen/summary': { const d = docSrc(); const ai = dCall('summary', 1400, 220); return fin({ gen: dGen('summary', { ...b, output: { text: d.paras.filter(p => p.t !== 'h').slice(0, 5).map(p => '- ' + short(p.x, 60)).join('\n') + '\n한 줄 요약: (데모) ' + short(d.paras[0].x, 40) } }), ai }); }
      case 'POST gen/translate': { const d = docSrc(); const ai = dCall('translate', 1600, 900); return fin({ gen: dGen('translation', { ...b, output: { paras: d.paras.map(p => ({ t: p.t, src: p.x, dst: `[${b.lang}] ` + p.x })), complete: true }, params: { paras: d.paras.length } }), ai }); }
      case 'POST gen/quiz': { const d = docSrc(); if ((b.langs || []).length > 12) dErr(400, '언어는 지원 목록에서 최대 12개입니다.', 'lang'); const ai = dCall('quiz', 1500, 1100); const src = d.paras.filter(p => p.t !== 'h'); const others = b.langs.slice(1);
        const items = Array.from({ length: b.count }, (_, i) => { const p = src[i % Math.max(1, src.length)] || { x: '강의 내용' }; const qq = `(데모) 다음 중 「${short(p.x, 30)}」에 대한 설명으로 옳은 것은?`; return { q: qq, options: ['설명 A', '설명 B', '설명 C', '설명 D'], answer: i % 4, explain: '(데모 해설) ' + short(p.x, 60), tr: Object.fromEntries(others.map(l => [l, { q: `[${LN[l]}] ` + qq, options: ['A', 'B', 'C', 'D'], explain: `[${LN[l]}] explain` }])), difficulty: b.difficulty, difficulty_score: 50 }; });
        return fin({ gen: dGen('quiz', { ...b, lang: b.langs[0], params: { difficulty: b.difficulty, langs: b.langs, count: b.count, seg_start: b.seg_start, seg_end: b.seg_end }, output: { items, match: items.length } }), ai }); }
      case 'POST gen/rubric': { const ai = dCall('rubric', 700, 600); const n = b.criteria_n, s = b.scale; const names = ['문제 이해', '설계 · 분석', '정확성', '표현 · 구성', '창의성', '협업', '근거 제시', '형식'];
        const criteria = Array.from({ length: n }, (_, i) => ({ name: names[i], weight: Math.floor(100 / n) + (i < 100 % n ? 1 : 0), levels: Array.from({ length: s }, (_, j) => ({ score: Math.round((s - j) * 100 / s), desc: `${s - j}단계: ${names[i]} 수준 ${['탁월', '우수', '보통', '미흡', '부족'][j]}` })) }));
        return fin({ gen: dGen('rubric', { ...b, params: { task: b.task.slice(0, 300), criteria_n: n, scale: s }, output: { criteria, total_weight: 100 } }), ai }); }
      case 'POST gen/classify': { const t = b.text || ''; const sents = t.split(/[.!?。？！\n]+/).filter(x => x.trim()); const avg = sents.length ? Math.floor(sents.reduce((n, x) => n + x.trim().length, 0) / sents.length) : 0; const cues = ['증명', '분석', '평가', '비교', '설계', '추론', '적용'].filter(c => t.includes(c)).length; const score = Math.min(100, Math.floor(avg * 6 / 5) + Math.min(30, cues * 15)); return fin({ results: [{ level: score < 40 ? 'easy' : score < 70 ? 'medium' : 'hard', score, features: { avg_len: avg, long_pct: 0, nums: 0, cues } }] }); }
      case 'GET gen/list': return fin({ items: o.gens.filter(g => !q.get('kind') || g.kind === q.get('kind')).filter(g => !q.get('status') || g.status === q.get('status')) });
      case 'PUT gen/item': { const g = gen(b.gen_id); if (!['review', 'rejected'].includes(g.status)) dErr(409, '현재 상태에서는 할 수 없습니다.', 'status'); g.output = b.output; g.status = 'review'; return fin({ gen: g }); }
      case 'POST gen/review': { const g = gen(b.gen_id); const F = { approve: ['approved', ['review']], reject: ['rejected', ['review']], publish: ['published', ['approved']], revise: ['review', ['approved', 'rejected', 'published']] }[b.action]; if (!F || !F[1].includes(g.status)) dErr(409, '현재 상태에서는 할 수 없습니다.', 'status'); g.status = F[0]; g.reviewer = S.me.name; if (b.note) g.review_note = b.note; if (F[0] === 'published') g.published_at = iso(); else if (F[0] !== 'review') g.reviewed_at = iso(); logAudit(`AI 생성물 ${b.action} — ${KIND[g.kind]}`); return fin({ gen: g }); }
      case 'POST an/discussion': { const ai = dCall('discussion', 800, 300); const per = {}; b.posts.forEach(p => per[p.member_no] = (per[p.member_no] || 0) + 1); const kw = {}; b.posts.forEach(p => words(p.text).forEach(w => kw[w] = (kw[w] || 0) + 1));
        const stats = { posts: b.posts.length, members: Object.keys(per).length, avg_len: Math.floor(b.posts.reduce((n, p) => n + p.text.length, 0) / b.posts.length), by_member: Object.entries(per).map(([m, n]) => ({ member_no: m, posts: n })).sort((x, y) => y.posts - x.posts), keywords: Object.entries(kw).map(([w, n]) => ({ word: w, n })).sort((x, y) => y.n - x.n).slice(0, 8) };
        return fin({ gen: dGen('discussion', { ...b, output: { text: `(데모 요약) 주요 논점 ${Math.min(3, b.posts.length)}가지가 나왔습니다. 참여 ${stats.members}명, 핵심어: ${stats.keywords.slice(0, 3).map(x => x.word).join(', ')}.`, stats } }), ai }); }
      case 'GET an/activity': { const s = o.sections.find(x => x.section_id === q.get('section_id')); if (!s) dErr(404, '분반을 찾을 수 없습니다.', 'section'); const ses = 10;
        const st = ((o.roster && o.roster[s.section_id]) || o.people).map(([no, unit, pr, la, ab, ex, avg]) => { const rate = Math.round((pr + la + ex) * 100 / ses); return { member_no: no, unit_code: unit, present: pr, late: la, absent: ab, excused: ex, avg_pct: avg, items: 2, att_rate: rate, risk: rate < 75 || avg < 60 ? 'risk' : rate < 85 || avg < 70 ? 'watch' : 'ok' }; });
        return fin({ activity: { section: s, sessions: ses, students: st, summary: { n: st.length, risk: st.filter(x => x.risk === 'risk').length, watch: st.filter(x => x.risk === 'watch').length, ok: st.filter(x => x.risk === 'ok').length } } }); }
      case 'POST editor': { if (!b.text) dErr(400, '글을 넣어 주세요(8,000자 이내).', 'text'); const ai = dCall('editor', 300, 300); const t = b.action === 'translate' ? `[${LN[b.lang]}] ${b.text}` : b.action === 'proofread' ? b.text.replace(/\s+/g, ' ').replace(/ ([은는이가을를의]) /g, '$1 ') : '## 정리\n\n' + b.text.split(/[.\n]+/).filter(x => x.trim()).map(x => '- ' + x.trim()).join('\n'); return fin({ action: b.action, lang: b.action === 'translate' ? b.lang : null, text: '(데모) ' + t, ai }); }
      case 'POST eval': { if (!/^[A-Za-z0-9-]{4,20}$/.test(b.member_no || '')) dErr(400, '학번 형식이 올바르지 않습니다.', 'member_no'); if (!b.answer) dErr(400, '답안을 넣어 주세요(8,000자 이내).', 'answer'); if (!b.rubric_gen_id && !b.rubric) dErr(400, '루브릭(rubric_gen_id 또는 rubric)을 넣어 주세요.', 'rubric'); const ai = dCall('eval', 600, 150);
        const sc = Math.round(Math.min(b.max_score, b.max_score * (0.55 + Math.min(0.4, b.answer.length / 2000))) * 10) / 10; const e = { eval_id: uid(), section_id: b.section_id, member_no: b.member_no, rubric_gen_id: b.rubric_gen_id, answer_chars: b.answer.length, max_score: b.max_score, ai_score: sc, rationale: '(데모) 루브릭 기준 대부분을 충족합니다. 근거 제시를 보완하면 좋습니다.', criteria: [], status: 'suggested', final_score: null, confirmed_by: null, created_at: iso(), confirmed_at: null, recorded: 'lms_only' }; o.evals.unshift(e); return fin({ eval: e, ai }); }
      case 'GET eval/list': return fin({ evals: o.evals });
      case 'POST eval/confirm': { const e = o.evals.find(x => x.eval_id === b.eval_id); if (!(b.score >= 0 && b.score <= e.max_score)) dErr(400, '점수가 올바르지 않습니다.', 'score'); e.status = 'confirmed'; e.final_score = b.score; e.confirmed_by = S.me.name; e.confirmed_at = iso(); return fin({ eval: e }); }
      case 'GET caption/rooms': return fin({ rooms: o.rooms.map(roomOut) });
      case 'POST caption/room': { if (!b.langs.length || b.langs.length > 4) dErr(400, '자막 언어는 지원 목록에서 1~4개입니다.', 'lang'); const r = { room_id: uid(), section_id: b.section_id, title: b.title, langs: b.langs, code: 'demo.' + Math.random().toString(36).slice(2, 12), status: 'live', created_at: iso() }; o.rooms.unshift(r); o.lines[r.room_id] = []; return fin({ room: roomOut(r) }); }
      case 'PUT caption/room': { const r = room(b.room_id); if (b.status) r.status = b.status; return fin({ room: roomOut(r) }); }
      case 'POST caption/line': { const r = room(b.room_id); if (r.status !== 'live') dErr(409, '종료된 자막방입니다.', 'closed'); const L = o.lines[r.room_id]; const l = { seq: L.length + 1, text: b.text, tr: {}, source: b.source || 'manual', edited: false, at: iso() }; L.push(l); return fin({ line: l }); }
      case 'PUT caption/line': { const l = (o.lines[b.room_id] || []).find(x => x.seq === b.seq); if (!l) dErr(404, '자막 문장을 찾을 수 없습니다.', 'line'); if (b.text) l.text = b.text; if (b.tr) Object.assign(l.tr, b.tr); l.edited = true; return fin({ line: l }); }
      case 'GET caption/lines': { const r = room(q.get('room_id')); return fin({ room: roomOut(r), lines: o.lines[r.room_id] }); }
      case 'GET caption/view': { const r = o.rooms.find(x => x.code === q.get('code')); if (!r) dErr(404, '자막방을 찾을 수 없습니다.', 'room'); const lang = q.get('lang'); return fin({ room: { title: r.title, langs: r.langs, status: r.status }, lang, lines: (o.lines[r.room_id] || []).map(l => ({ seq: l.seq, text: l.text, tr: lang && lang !== 'ko' ? (l.tr[lang] == null ? null : l.tr[lang]) : null, edited: l.edited })), engine: 'STT · 번역 엔진 연동 후 자동 생성(지금은 교수자 입력 · 수정 문장)' }); }
      case 'GET llm/providers': return fin({ providers: o.providers, routes: o.routes, features: Object.keys(FEAT), kinds: ['anthropic', 'openai_compat'], models: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'], embed: { ...o.embed, dim: 256, active: 'local-hash' } });
      case 'POST llm/provider': { if (!b.name) dErr(400, '이름을 넣어 주세요.', 'name'); if (b.kind === 'openai_compat' && !/^https?:\/\/[^\s/]+/.test(b.endpoint_url || '')) dErr(400, '엔드포인트 주소가 올바르지 않습니다.', 'endpoint'); if (!b.model) dErr(400, '모델 이름이 올바르지 않습니다.', 'model');
        let p = b.provider_id && o.providers.find(x => x.provider_id === b.provider_id); if (p) Object.assign(p, { kind: b.kind, name: b.name, model: b.model, endpoint_url: b.endpoint_url, enabled: b.enabled !== false }); else { p = { provider_id: uid(), kind: b.kind, name: b.name, endpoint_url: b.endpoint_url, model: b.model, enabled: true, created_at: iso() }; o.providers.push(p); } logAudit('LLM 제공자 — ' + b.name); return fin({ provider: p }); }
      case 'DELETE llm/provider': o.providers = o.providers.filter(x => x.provider_id !== q.get('id')); Object.keys(o.routes).forEach(f => { if (o.routes[f] === q.get('id')) delete o.routes[f]; }); return fin({ ok: true });
      case 'POST llm/route': if (b.provider_id) o.routes[b.feature] = b.provider_id; else delete o.routes[b.feature]; return fin({ routes: o.routes });
      case 'PUT llm/embed': o.embed = b.kind === 'endpoint' ? { kind: 'endpoint', endpoint: b.endpoint, note: '연동 후 동작 — 지금은 로컬 해시 임베딩으로 색인합니다.' } : { kind: 'local-hash' }; return fin({ embed: { ...o.embed, dim: 256, active: 'local-hash' } });
      case 'GET llm/metrics': { const days = +q.get('days') || 30; const C = o.calls.filter(c => Date.now() - new Date(c.at) < days * 864e5); const grp = key => { const m = {}; C.forEach(c => { const kk = key(c); const g = m[kk] = m[kk] || { provider_kind: c.kind, model: c.model, feature: c.feature, calls: 0, errors: 0, ms: [], tin: 0, tout: 0 }; g.calls++; g.ms.push(c.ms); g.tin += c.tin; g.tout += c.tout; }); return Object.values(m).map(g => { const s = g.ms.sort((a, c) => a - c); const { ms, ...r } = g; return { ...r, avg_ms: Math.round(s.reduce((a, c) => a + c, 0) / s.length), p95_ms: s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] }; }); };
        const daily = {}; C.forEach(c => { const d = c.at.slice(0, 10); const x = daily[d] = daily[d] || { day: d, calls: 0, tokens: 0, ms: 0 }; x.calls++; x.tokens += c.tin + c.tout; x.ms += c.ms; });
        return fin({ days, rows: grp(c => c.kind + c.model + c.feature), models: grp(c => c.kind + c.model).map(({ feature, ...r }) => r), daily: Object.values(daily).map(x => ({ day: x.day, calls: x.calls, tokens: x.tokens, avg_ms: Math.round(x.ms / x.calls) })) }); }
      case 'GET llm/quota': { const used = o.calls.reduce((s, c) => s + c.tin + c.tout, 0); const L = o.setting.limit_tokens; const pct = L > 0 ? Math.floor(used * 100 / L) : 0; return fin({ month: iso().slice(0, 7), limit_tokens: L, alert_pct: o.setting.alert_pct, hard_block: o.setting.hard_block, used_tokens: used, pct, state: L <= 0 ? 'unlimited' : pct >= 100 ? 'over' : pct >= o.setting.alert_pct ? 'warn' : 'ok', alerts: o.alerts }); }
      case 'PUT llm/quota': { o.setting = { limit_tokens: b.limit_tokens, alert_pct: b.alert_pct, hard_block: b.hard_block !== false }; const used = o.calls.reduce((s, c) => s + c.tin + c.tout, 0); const pct = b.limit_tokens > 0 ? Math.floor(used * 100 / b.limit_tokens) : 0; const lv = pct >= 100 ? 'over' : pct >= b.alert_pct ? 'warn' : null; const mo = iso().slice(0, 7); if (b.limit_tokens > 0 && lv && !o.alerts.some(a => a.month === mo && a.level === lv)) o.alerts.unshift({ month: mo, level: lv, used, limit_tokens: b.limit_tokens, at: iso() }); logAudit('AI 토큰 할당량 변경'); return fin({ setting: o.setting }); }
    }
    dErr(404, '없는 주소입니다.', 'not_found');
  }
})();
