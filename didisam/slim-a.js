/* v34 slim-a — '학습(learn)' · '사람(people)' 공간 화면을 공통 틀(SL)로 단순화한다.
   원칙: 기존 VIEWS.x를 감싸 '목록 화면'을 앞에 두고, [표로 보기] · [자세히]로 기존 화면을 그대로 연다(기능 동등).
   상세 · 입력은 SL.sheet 또는 기존 상세 화면으로. 데이터 0이면 '하는 일 한 줄 + 첫 할 일 버튼 + AI SAM 추천 명령'. */
(function () {
  'use strict';
  if (typeof SL === 'undefined' || typeof VIEWS === 'undefined') return;
  const OLD = {};
  const I = (n, s = 20) => ic(n in IC ? n : 'grid', s);
  const T = () => (UI.slaT = UI.slaT || {});
  const nm = id => (M(id) || {}).name || '—';
  const tch = () => (S.me.role === 'teacher' && typeof tMe === 'function' && tMe() ? tMe().classes || [] : null);
  /* 기존 화면 열기 · 돌아오기 */
  const tblBtn = (id, l = '표로 보기') => `<button type="button" class="btn ghost" data-act="sla-t" data-v="${id}:1">${esc(l)}</button>`;
  const back = (id, l = '간단히 보기') => `<div class="sl-back"><button type="button" class="btn ghost" data-act="sla-t" data-v="${id}:0">‹ ${esc(l)}</button></div>`;
  const backAct = (act, l, v = '') => `<div class="sl-back"><button type="button" class="btn ghost" data-act="${act}" data-v="${esc(v)}">‹ ${esc(l)}</button></div>`;
  ACT['sla-t'] = el => { const [id, on] = String(el.dataset.v).split(':'); T()[id] = on === '1'; if (on !== '1') UI.slaSub = ''; render(); window.scrollTo(0, 0); };
  /* 기존 화면의 특정 탭으로 바로(목록 → 기존 화면) */
  ACT['sla-tab'] = el => { const [id, k, v] = String(el.dataset.v).split('|'); if (k) UI[k] = v; T()[id] = true; render(); window.scrollTo(0, 0); };
  const pri = (act, l, v = '', attr = '') => `<button type="button" class="btn pri" data-act="${act}" data-v="${esc(v)}" ${attr}>${esc(l)}</button>`;
  /* 빈 화면: 하는 일 한 줄 + 첫 할 일 버튼 하나 + AI SAM 추천 명령 2~3개 */
  const empty = (icon, line, btn, ai = [], links = '') => `<div class="sla-empty"><span class="sla-ei">${I(icon, 26)}</span><b>${esc(line)}</b>${btn || ''}${links ? `<div class="sla-links">${links}</div>` : ''}${ai.length ? `<div class="sla-ai" aria-label="AI SAM 추천 명령">${ai.map(q => `<button type="button" class="sla-q" data-act="chat-q" data-v="${esc(q)}">${I('spark', 14)}<span>${esc(q)}</span></button>`).join('')}</div>` : ''}</div>`;
  const none = l => `<div class="sl-empty">${esc(l)}</div>`;
  /* 칩(임의 동작) */
  const chipsA = (act, L, cur) => `<div class="sl-chips" role="tablist">${L.map(([v, l]) => `<button type="button" role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
  const q = k => String(UI[k] || '').trim().toLowerCase();
  const has = (k, ...s) => !q(k) || s.join(' ').toLowerCase().includes(q(k));
  const cap = (L, n = 200) => L.length > n ? `<p class="sl-more">${L.length - n}개 더 있음 — 검색하거나 표로 보세요.</p>` : '';
  /* 「⋯」 일괄 · 부가 작업 — 시트 목록. 항목: [이름, 동작, 값, 한 줄, 아이콘, 추가 속성] */
  const MORE = {};
  const more = (id, items) => { const L = items.filter(Boolean); if (!L.length) return ''; MORE[id] = L; return `<button type="button" class="btn ghost sla-dots" data-act="sla-more" data-v="${id}" aria-label="더 보기">⋯</button>`; };
  const autoClose = w => { w.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a || a.dataset.act === 'sl-close' || a.tagName === 'SUMMARY') return; setTimeout(() => { if (w.isConnected) w.remove(); }, 0); }); };
  ACT['sla-more'] = el => { const L = MORE[el.dataset.v] || []; const w = SL.sheet('더 보기', SL.list(L.map(([n, act, v, sub, icon, attr]) => SL.row({ act, v, name: n, sub, icon: I(icon || 'grid', 20), col: 'var(--g700)', attr })))); autoClose(w); };
  /* 기존 화면의 한 부분을 시트로(입력은 기존 동작 그대로). 다시 그릴 때 시트도 새로 그린다 */
  const part = (view, sel) => { const d = document.createElement('div'); try { d.innerHTML = OLD[view] ? OLD[view]() : ''; } catch (e) { console.error(e); } const n = d.querySelector(sel); return n ? n.outerHTML : ''; };
  const partSheet = (title, view, sel, foot) => { UI.slaPart = { view, sel }; const h = part(view, sel); if (!h) { T()[view] = true; render(); return; } const w = SL.sheet(title, `<div class="sla-part">${h}</div>`, foot); w.dataset.part = view; return w; };
  AFTER.push(() => { try { const w = $('#slSheet'); const P = UI.slaPart; if (!w || !P || w.dataset.part !== P.view) return; const b = w.querySelector('.sla-part'); if (!b) return; const h = part(P.view, P.sel); if (h) b.innerHTML = h; } catch (e) { console.error(e); } });
  /* 기존 탭 이름을 그대로 읽어 온다(유형마다 탭이 다르다) */
  const tabsOf = (h, key) => { const d = document.createElement('div'); d.innerHTML = h; return [...d.querySelectorAll(`[data-key="${key}"]`)].map(b => [b.dataset.v, b.textContent.trim()]); };
  /* 기존 화면의 머리(.ph)와 지정한 탭 줄을 빼고 본문만 */
  const strip = (h, keys = []) => { const d = document.createElement('div'); d.innerHTML = h; d.querySelectorAll(':scope > .ph').forEach(e => e.remove()); keys.forEach(k => { const b = d.querySelector(`[data-key="${k}"]`); const s = b && b.closest('.seg2'); if (s) s.remove(); }); return d.innerHTML; };
  /* 감싸기: build가 문자열이면 새 화면, {pre}면 pre + 기존 화면, null이면 기존 화면 */
  function wrap(id, build) {
    const old = VIEWS[id]; if (typeof old !== 'function') return; OLD[id] = old;
    VIEWS[id] = (...a) => {
      if (!S || !S.org) return old(...a);
      /* v36: '간단히 보기' 폐지(대표님 2026-11-09) — 처음부터 전체 화면. 요약 첫 화면은 SLIM_FRONT에 남긴 화면만 */
      if (!slimFront(id)) return old(...a);
      if (T()[id]) return back(id) + old(...a);
      let r = null; try { r = build(old, ...a); } catch (e) { console.error(e); r = null; }
      if (r && typeof r === 'object') return (r.pre || '') + old(...a);
      return r == null ? old(...a) : r;
    };
  }
  window.SLA = { wrap, empty, more, partSheet, tblBtn, OLD };
  const page = (title, right, body) => SL.page(title, right, body);
  const row = SL.row, list = SL.list;
  const clsIc = c => c.thumb ? `<img src="${esc(c.thumb)}" alt="">` : esc([...String(c.name || '?').replace(/^\[[^\]]*\]\s*/, '')][0] || '?');

  /* ═══════════ 1. 과정(class) — 목록 · 상세 첫 화면 ═══════════ */
  const kindL = c => c.kind === 'pack' ? '과정' : (KIND[c.kind] || '기간') + (c.sub ? ' · ' + c.sub : '');
  const clsSub = c => [kindL(c), c.status, `${(c.learners || []).length}명`, c.price ? won(c.price) : '무료'].filter(Boolean).join(' · ');
  const clsHomeOn = () => { const h = UI.slaClsHome; return h && h.id === UI.cls && h.t === (UI.clsT || 'learners'); };
  function clsHome(c, old) {
    const ep = c.kind === 'episode'; let tb = [];
    try { tb = tabsOf(old(), 'clsT'); } catch (e) { }
    if (!tb.length) tb = [['learners', t('learner')], [ep ? 'episodes' : 'curriculum', ep ? '회차' : '커리큘럼'], ...(ep ? [] : [['eval', '평가']]), ['notice', '공지사항'], ['set', '설정']];
    const ap = typeof avgP === 'function' ? Math.round(avgP(c)) : 0;
    const SUB = { learners: `${(c.learners || []).length}명 · 평균 진도 ${ap}%`, curriculum: `${(c.curriculum || []).length}개 강의`, episodes: `${(c.sessions || c.curriculum || []).length}개 회차`,
      eval: `${t('done')} 기준 ${(c.criteria && c.criteria.threshold) != null ? c.criteria.threshold + '%' : '설정'}`, notice: `${(c.notices || []).length}개`, set: [c.open, typeof c2SaleLabel === 'function' ? c2SaleLabel(c) : c.sale, c.price ? won(c.price) : '무료'].filter(Boolean).join(' · ') };
    const ICN = { learners: 'users', curriculum: 'book', episodes: 'book', eval: 'check', notice: 'chat', set: 'gear' };
    return backAct('cls-back', `${t('cls')} 목록`) + page(c.name, `${typeof ACT['d26-view'] === 'function' ? pri('d26-view', `${t('learner')} 화면`, c.id) : ''}${more('cls1', [
      typeof ACT['d26-share'] === 'function' && ['주소 공유', 'd26-share', c.id, '메시지 · 홈페이지에 붙여 넣기', 'send'], ['복사본 만들기', 'cls-copy', c.id, '같은 구성으로 새로 만들기', 'grid'], c.price && typeof ACT['c2-paylink'] === 'function' && ['결제 링크 복사', 'c2-paylink', c.id, '지정 회원에게 보낼 링크', 'chart']])}`,
      SL.sum(`<span>${esc([kindL(c), c.status].filter(Boolean).join(' · '))}</span><span class="sl-n">${esc(c.start ? `${c.start.slice(2).replace(/-/g, '.')} ~ ${String(c.end || '').slice(2).replace(/-/g, '.')}` : '')}</span>`) +
      list(tb.map(([v, l]) => row({ act: 'sla-clstab', v, name: l, sub: SUB[v] || '', icon: I(ICN[v] || 'grid'), col: 'var(--s400)' }))));
  }
  wrap('class', old => {
    if (UI.cls && C(UI.cls)) { const c = C(UI.cls); if (clsHomeOn()) return clsHome(c, old); return { pre: backAct('sla-clshome', c.name) }; }
    if (UI.clsView === 'cats') return null;
    const TC = tch(); const all = S.classes.filter(c => !TC || TC.includes(c.id)); const f = UI.clsF || 'all';
    const mk = `<button type="button" class="btn pri" data-act="sla-clsnew">+ 만들기</button>`;
    if (!all.length) return page(t('cls'), mk, empty('book', `${tj('cls', '을')} 만들면 ${tj('learner', '이')} 바로 신청할 수 있습니다`, `<button type="button" class="btn pri" data-act="ai-design">${I('spark', 16)} AI로 만들기</button>`, ({ k12: ['중2 수학 주 2회 반 만들어줘', '고1 영어 내신반 만들어줘'], univ: ['생성형 AI 활용 15주 교과목 설계해줘', '교양 강의 계획서 만들어줘'] }[S.org.type] || ['업무 자동화 6차시 과정 만들어줘', '엑셀 실무 4주 과정 설계해줘']), `<button type="button" class="linkb" data-act="cls-new">직접 만들기</button>`));
    const K = [['all', '전체'], ...['period', 'pack', 'episode', 'sub'].filter(k => all.some(c => c.kind === k)).map(k => [k, k === 'pack' ? '과정' : KIND[k] || k])];
    const L = all.filter(c => (f === 'all' || c.kind === f) && has('slClsQ', c.name, c.teacher || ''));
    const recruit = all.filter(c => c.recruit && c.recruit.on).length;
    return page(`${t('cls')} ${all.length}개`, tblBtn('class', '자세히') + mk + more('cls', [['카테고리 관리', 'c2-cats', '', '분류 묶기 · 순서', 'grid'], ['출결패드 실행', 'cls-pad', '', '휴대폰 끝 4자리로 출석', 'check']]),
      (K.length > 2 ? SL.chips('clsF', K, f) : '') +
      (recruit ? SL.sum(`<span>수강 신청 받는 중</span><span class="sl-n">${recruit}개</span>`) : '') +
      list(L.slice(0, 200).map(c => row({ act: 'cls-open', v: c.id, name: c.name, sub: clsSub(c), icon: clsIc(c), col: c.status === '운영중' ? 'var(--s400)' : 'var(--g500)' }))) + cap(L) +
      SL.search('slClsQ', `${t('cls')} 이름 · 강사 검색`));
  });
  { const b = ACT['cls-open']; if (b) ACT['cls-open'] = (el, ...r) => { UI.slaClsHome = { id: el.dataset.v, t: 'learners' }; return b(el, ...r); }; }
  { const b = ACT['cls-back']; if (b) ACT['cls-back'] = (...r) => { UI.slaClsHome = null; return b(...r); }; }
  ACT['sla-clstab'] = el => { UI.clsT = el.dataset.v; UI.slaClsHome = null; render(); window.scrollTo(0, 0); };
  ACT['sla-clshome'] = () => { UI.slaClsHome = { id: UI.cls, t: UI.clsT || 'learners' }; render(); window.scrollTo(0, 0); };
  ACT['sla-clsnew'] = () => { const w = SL.sheet(`${t('cls')} 만들기`, list([
    row({ act: 'ai-design', name: 'AI로 만들기', sub: '목표만 말하면 차시 · 퀴즈까지', icon: I('spark'), col: 'var(--s400)' }),
    row({ act: 'cls-new', name: '직접 만들기', sub: '이름 · 유형부터 하나씩', icon: I('book'), col: 'var(--g700)' })])); autoClose(w); };

  /* ═══════════ 2. 등록 · 초대(enroll) ═══════════ */
  wrap('enroll', () => {
    const U = S.org.type === 'univ'; const wait = S.members.filter(m => m.grade === '승인 대기');
    const R = [U ? row({ act: 'sla-codes', name: '학번으로 접근코드 발급', sub: `학번 · 학과만 받습니다 · 발급 ${S.codes.length}건`, icon: I('users'), col: 'var(--s400)' })
      : row({ act: 'mem-bulk', name: '엑셀(CSV)로 일괄 등록', sub: '한 번에 100명까지', icon: I('doc'), col: 'var(--s400)' }),
      row({ act: 'mem-invite', name: '초대 보내기', sub: '알림톡 · 링크 · 이메일', icon: I('send'), col: '#00A224' }),
      row({ act: 'mem-q', name: '가입 추가 질문', sub: '가입할 때 받을 항목', icon: I('chat'), col: '#FF9800' }),
      U ? (S.codes.length ? row({ act: 'en-csv', name: '접근코드 내려받기', sub: 'CSV로 학과에 배포', icon: I('download'), col: 'var(--g700)' }) : '')
        : row({ act: 'bulk-tpl', name: '등록 양식 받기', sub: 'CSV 양식 내려받기', icon: I('download'), col: 'var(--g700)' })];
    return page('등록 · 초대', tblBtn('enroll', '자세히') + pri('mem-invite', '+ 초대'),
      (wait.length ? SL.sum(`<span>가입 승인 대기</span><span class="sl-n sl-w">${wait.length}명</span>`, 'sla-wait') : '') + list(R));
  });
  ACT['sla-wait'] = () => { UI.memF = '승인 대기'; UI.slMemTable = false; go('members'); };
  ACT['sla-codes'] = () => { const w = SL.sheet('학번으로 접근코드 발급', `<label class="fl">학번, 학과(줄마다 1명)<textarea id="enL" rows="7" placeholder="20262001, 컴퓨터공학과&#10;20262002, 경영학과"></textarea></label>` +
    (S.codes.length ? `<h3 class="sl-gh">최근 발급</h3>` + list(S.codes.slice(0, 8).map(c => row({ name: c.sid, sub: `${c.dept || '학과 미입력'} · ${c.at}`, right: `<code>${esc(c.code)}</code>`, icon: I('users', 18), col: 'var(--g500)' }))) : ''),
    `${S.codes.length ? '<button type="button" class="btn ghost" data-act="en-copy">안내 문구 복사</button>' : ''}<button type="button" class="btn pri" data-act="en-codes">접근코드 발급</button>`); return w; };
  { const b = ACT['en-codes']; if (b) ACT['en-codes'] = (...a) => { const r = b(...a); const w = $('#slSheet'); if (w && !$('#enL')) w.remove(); else if (w && S.codes.length && /접근코드/.test(w.textContent)) { slClose(); } return r; }; }

  /* ═══════════ 3. 출결(attend) ═══════════ */
  wrap('attend', () => {
    W2.all(); const eps = S.classes.filter(c => W2.hasUnits(c) || S.org.type === 'voc'); const TC = tch(); const E = eps.filter(c => !TC || TC.includes(c.id));
    const padB = pri('cls-pad', '출결패드');
    if (!E.length) return page('출결', '', empty('check', '오프라인 · 라이브 회차가 있는 수업의 출결을 받습니다', `<button type="button" class="btn pri" data-act="go" data-v="class">${esc(t('cls'))} 열기</button>`, ['회차반 수업 만들어줘', '오늘 출결 요약해줘']));
    const tdOf = c => { try { return W2.units(c).filter(u => u.date === today()); } catch (e) { return []; } };
    const f = UI.slAttF || (E.some(c => tdOf(c).length) ? 'today' : 'all');
    const L = E.filter(c => (f === 'all' || tdOf(c).length) && has('slAttQ', c.name));
    const low = typeof lowAtt === 'function' ? lowAtt() : [];
    return page('출결', tblBtn('attend') + padB + more('att', [typeof ACT['w2-kiolink'] === 'function' && ['키오스크 주소 복사', 'w2-kiolink', '', '태블릿 전용 출결 화면', 'grid']]),
      SL.chips('slAttF', [['today', `오늘 수업 ${E.filter(c => tdOf(c).length).length}`], ['all', '전체']], f) +
      (low.length ? SL.sum(`<span>출석률 80% 미만</span><span class="sl-n sl-w">${low.length}명</span>`, 'sla-t', 'attend:1') : '') +
      (L.length ? list(L.map(c => { const td = tdOf(c); const u = td[0];
        return row({ act: 'sla-att', v: c.id, name: c.name, icon: clsIc(c), col: td.length ? 'var(--s400)' : 'var(--g500)',
          sub: [kindL(c), td.length ? `오늘 ${c.kind === 'episode' ? u.n + '회차' : u.title || '수업'}${u.from ? ' ' + u.from : ''}` : '오늘 수업 없음', `${(c.learners || []).length}명`].join(' · '),
          right: u ? `<button type="button" class="btn sm pri" data-act="w2-satt" data-c="${esc(c.id)}" data-s="${esc(u.id)}">출결</button>` : undefined }); })) : none(f === 'today' ? '오늘 출결을 받을 수업이 없습니다.' : '검색 결과가 없습니다.')) +
      SL.search('slAttQ', '수업 검색'));
  });
  ACT['sla-att'] = el => { UI.attC = el.dataset.v; T().attend = true; render(); window.scrollTo(0, 0); };

  /* ═══════════ 4. 수료증(cert) ═══════════ */
  wrap('cert', () => {
    if (typeof a2Ens === 'function') a2Ens();
    const f = UI.slCertF || 'all'; const all = S.certs || [];
    const warn = typeof a2Crit === 'function' ? S.classes.filter(c => c.cert === 'auto' && c.kind !== 'sub' && a2Crit(c).length && a2Crit(c).reduce((a, x) => a + (+x.w || 0), 0) !== 100).length : 0;
    const right = tblBtn('cert', '양식 · 설정') + pri('cert-manual', '+ 발급') + more('cert', [typeof ACT['cert-preview'] === 'function' && ['미리보기', 'cert-preview', '', '지금 양식으로 보기', 'doc']]);
    if (!all.length) return page(`${t('done')} · 수료증`, right, (warn ? SL.sum(`<span>수료 기준 합계 확인</span><span class="sl-n sl-w">${warn}개</span>`, 'sla-t', 'cert:1') : '') +
      empty('check', `${t('done')} 기준을 채우면 수료증이 자동으로 발급됩니다`, pri('cert-manual', '수동 발급'), ['수료 대상자 보여줘', '수료증 양식 바꿔줘']));
    const L = all.filter(x => (f === 'all' || (f === 'manual' ? x.manual : !x.manual)) && has('slCertQ', nm(x.who), (C(x.cls) || {}).name || '', x.no || ''));
    const nd = all.filter(x => !x.dl).length;
    return page(`수료증 ${all.length}건`, right,
      SL.chips('slCertF', [['all', '전체'], ['auto', '자동'], ['manual', '수동']], f) +
      (warn ? SL.sum(`<span>수료 기준 합계 확인</span><span class="sl-n sl-w">${warn}개</span>`, 'sla-t', 'cert:1') : '') +
      SL.sum(`<span>${tj('learner', '이')} 아직 안 받음</span><span class="sl-n">${nd}건</span>`) +
      list(L.slice(0, 200).map(x => row({ act: 'a2-cert-view', v: x.id, name: nm(x.who), sub: [(C(x.cls) || {}).name || '—', x.at, x.dl ? '받음' : '안 받음'].join(' · '), icon: I('check'), col: x.dl ? '#00A224' : 'var(--g500)' }))) + cap(L) +
      SL.search('slCertQ', '이름 · 과정 · 발급번호 검색'));
  });

  /* ═══════════ 5. 학원(k12) — 원생 · 출석부 · 성적 · 상담 ═══════════ */
  const stOf = m => (m && m.crm && m.crm.st) || '재원';
  const clsOfM = id => S.classes.filter(c => c.status !== '종료' && (c.learners || []).includes(id));
  wrap('crmstu', () => {
    if (UI.crmId && M(UI.crmId)) return { pre: backAct('crm-close', '원생 목록') };
    if (UI.crmSel && UI.crmSel.size) return null; /* 여러 명 골라 처리하는 중 = 기존 화면 */
    const ST = (S.members || []).filter(m => !m.withdrawn);
    const F = UI.crmF = UI.crmF && typeof UI.crmF === 'object' ? UI.crmF : { st: '재원', q: '', cls: '', gy: '', flag: '' };
    if (!ST.length) return page(t('learner'), '', empty('users', '원생을 등록하면 출결 · 성적 · 수납을 한곳에서 봅니다', pri('crm-new', '+ 원생 등록'), ['원생 등록해줘', '반 시간표 만들어줘'],
      `<button type="button" class="linkb" data-act="crm-csv-in">CSV로 일괄 등록</button><button type="button" class="linkb" data-act="crm-sample">샘플로 둘러보기</button>`));
    const cnt = s => ST.filter(m => stOf(m) === s).length;
    const L = ST.filter(m => (!F.st || stOf(m) === F.st) && has('slaStuQ', m.name, (m.crm || {}).school || '', (m.crm || {}).gy || '', clsOfM(m.id).map(c => c.name).join(' ')));
    const sample = ST.some(m => m.crm && m.crm.sample);
    const tdIds = new Set(); try { S.classes.forEach(c => { if (W2.hasUnits(c) && W2.units(c).some(u => u.date === today())) (c.learners || []).forEach(id => tdIds.add(id)); }); } catch (e) { }
    return page(`${t('learner')} ${cnt('재원')}명`, tblBtn('crmstu') + pri('crm-new', '+ 원생 등록') + more('crmstu', [['CSV로 일괄 등록', 'crm-csv-in', '', '양식에 맞춰 한 번에', 'doc'], ['목록 내려받기', 'crm-csv-out', '', '지금 조건의 원생 CSV', 'download'], sample && ['샘플 삭제', 'crm-sample-del', '', '샘플 원생 · 수업 지우기', 'x']]),
      chipsA('sla-crmst', [['재원', `재원 ${cnt('재원')}`], ['대기', `대기 ${cnt('대기')}`], ['휴원', `휴원 ${cnt('휴원')}`], ['퇴원', '퇴원'], ['', '전체']], F.st || '') +
      (tdIds.size ? SL.sum(`<span>오늘 수업 있는 원생</span><span class="sl-n">${tdIds.size}명</span>`, 'go', 'crmatt') : '') +
      (L.length ? list(L.slice(0, 200).map(m => row({ act: 'crm-open', v: m.id, name: m.name, sub: [(m.crm || {}).gy, (m.crm || {}).school, clsOfM(m.id).map(c => c.name).slice(0, 2).join(', ')].filter(Boolean).join(' · ') || stOf(m), col: stOf(m) === '재원' ? undefined : 'var(--g500)' }))) : none('조건에 맞는 원생이 없습니다.')) + cap(L) +
      SL.search('slaStuQ', '이름 · 학교 · 수업 검색'));
  });
  ACT['sla-crmst'] = el => { UI.crmF = UI.crmF && typeof UI.crmF === 'object' ? UI.crmF : { st: '재원', q: '', cls: '', gy: '', flag: '' }; UI.crmF.st = el.dataset.v; render(); };
  /* 출석부: 날짜 · 수업 카드(출결 입력)는 그대로 쓰고, 머리 · 탭만 공통 틀로 */
  wrap('crmatt', old => {
    const tb = UI.crmAT || 'day';
    if (tb === 'day' && !S.classes.some(c => c.status !== '종료' && W2.hasUnits(c))) return page('출석부', '', empty('check', '수업 요일 · 시간을 정하면 날짜별 출석부가 열립니다', `<button type="button" class="btn pri" data-act="go" data-v="class">${esc(t('cls'))} 만들기</button>`, ['중2 수학 월수 4시 반 만들어줘', '오늘 미등원 보여줘'], `<button type="button" class="linkb" data-act="crm-sample">샘플로 둘러보기</button>`));
    return page('출석부', tblBtn('crmatt', '자세히'), SL.chips('crmAT', [['day', '오늘 출결'], ['stat', '출석 통계'], ['tt', '시간표']], tb) + `<div class="sla-old sla-att">${strip(old(), ['crmAT'])}</div>`);
  });
  /* 성적: 수업 칩 → 시험 목록 → 시험을 누르면 점수 입력(기존 화면) */
  wrap('crmex', () => {
    const TC = tch(); const L = S.classes.filter(c => c.status !== '종료' && (!TC || TC.includes(c.id)));
    if (!L.length) return page('성적', '', empty('chart', '수업을 만들면 시험 성적을 기록할 수 있습니다', `<button type="button" class="btn pri" data-act="go" data-v="class">${esc(t('cls'))} 열기</button>`, ['반 만들어줘', '성적 알림 보내는 법 알려줘']));
    if (!UI.crmEC || !L.some(c => c.id === UI.crmEC)) UI.crmEC = L[0].id;
    const c = C(UI.crmEC); const E = (c.k12Exams || []).slice().sort((a, b) => a.date < b.date ? 1 : -1);
    if (UI.crmE && E.some(e => e.id === UI.crmE)) return { pre: backAct('sla-crmexback', '시험 목록') };
    const stat = e => { const V = Object.values(e.scores || {}).filter(s => !s.absent && s.v != null).map(s => +s.v); return { n: V.length, avg: V.length ? Math.round(V.reduce((a, b) => a + b, 0) / V.length * 10) / 10 : null }; };
    return page('성적', pri('crm-ex-new', '+ 시험 등록'),
      chipsA('sla-crmec', L.map(x => [x.id, x.name.replace(/^\[샘플\]\s*/, '')]), c.id) +
      (E.length ? list(E.map(e => { const s = stat(e); return row({ act: 'sla-crmexo', v: e.id, name: e.name, sub: [e.date, e.kind, `응시 ${s.n}명`, s.avg != null ? `평균 ${s.avg}` : ''].filter(Boolean).join(' · '), icon: I('chart'), col: e.sent ? '#00A224' : 'var(--s400)', right: e.sent ? '<span class="sl-ok" aria-label="알림 보냄">✓</span>' : undefined }); }))
        : empty('chart', '시험을 등록하고 점수를 넣으면 평균 · 석차를 계산합니다', pri('crm-ex-new', '+ 시험 등록'), ['이번 달 시험 등록해줘', '성적 알림 보내줘'])));
  });
  ACT['sla-crmec'] = el => { UI.crmEC = el.dataset.v; UI.crmE = null; render(); };
  ACT['sla-crmexo'] = el => { UI.crmE = el.dataset.v; render(); window.scrollTo(0, 0); };
  ACT['sla-crmexback'] = () => { UI.crmE = null; render(); };
  /* 상담: 신규 문의 · 재원 상담 · 미상담자 */
  wrap('crmcs', () => {
    const tb = UI.crmCT || 'lead'; const LD = Array.isArray(S.crmLeads) ? S.crmLeads : []; const CS = S.consults || [];
    const open = LD.filter(l => !['등록', '보류'].includes(l.st)).length;
    const days = +((S.crmCfg || {}).csDays) || 30; const lim = addDays(today(), -days); const last = {}; CS.forEach(c => { const a = String(c.at).slice(0, 10); if (!last[c.who] || last[c.who] < a) last[c.who] = a; });
    const todo = (S.members || []).filter(m => !m.withdrawn && stOf(m) === '재원' && (!last[m.id] || last[m.id] < lim));
    const P = { lead: pri('crm-lead-new', '+ 신규 문의'), list: pri('crm-cs-new', '+ 상담 기록') }[tb] || '';
    let body = '';
    if (tb === 'lead') { const R = LD.slice().sort((a, b) => a.at < b.at ? 1 : -1).filter(l => has('slaCsQ', l.name, l.school || '', l.memo || ''));
      body = R.length ? list(R.map(l => row({ act: 'crm-lead-edit', v: l.id, name: l.name, sub: [l.at, l.gy, l.route, l.st].filter(Boolean).join(' · '), col: l.st === '등록' ? '#00A224' : l.st === '보류' ? 'var(--g500)' : '#FF9800' })))
        : empty('chat', '전화 · 방문 문의를 기록하고 원생으로 전환합니다', pri('crm-lead-new', '+ 신규 문의'), ['상담 필요한 원생 보여줘', '문의 응대 문구 써줘']); }
    else if (tb === 'list') { const R = CS.slice().sort((a, b) => a.at < b.at ? 1 : -1).filter(c => has('slaCsQ', nm(c.who), c.text || '', c.summary || '', c.cat || ''));
      body = R.length ? list(R.slice(0, 200).map(c => row({ act: 'sla-cs', v: c.id, name: nm(c.who), sub: [String(c.at).slice(0, 10), c.cat, String(c.summary || c.title || '').slice(0, 40)].filter(Boolean).join(' · ') }))) + cap(R)
        : empty('chat', '상담 내용을 남기면 원생 카드에 함께 쌓입니다', pri('crm-cs-new', '+ 상담 기록'), ['상담 요약해줘', '상담 필요한 원생']); }
    else { const R = todo.filter(m => has('slaCsQ', m.name)).sort((a, b) => String(last[a.id] || '') < String(last[b.id] || '') ? -1 : 1);
      body = R.length ? list(R.slice(0, 200).map(m => row({ act: 'crm-goto', v: m.id, name: m.name, sub: `마지막 상담 ${last[m.id] || '없음'}`, right: `<button type="button" class="btn sm" data-act="crm-cs-new" data-v="${esc(m.id)}">기록</button>` }))) + cap(R) : none(`${days}일 넘게 상담이 없는 원생이 없습니다.`); }
    return page('상담', tblBtn('crmcs') + P + more('crmcs', [typeof ACT['crm-cs-cfg'] === 'function' && ['분류 설정', 'crm-cs-cfg', '', '상담 분류 · 시험 종류', 'gear']]),
      SL.chips('crmCT', [['lead', `신규 문의${open ? ' ' + open : ''}`], ['list', '재원 상담'], ['todo', `미상담자 ${todo.length}`]], tb) + body + SL.search('slaCsQ', '원생 · 내용 검색'));
  });
  ACT['sla-cs'] = el => { const c = (S.consults || []).find(x => x.id === el.dataset.v); if (!c) return;
    SL.sheet(`상담 — ${nm(c.who)}`, list([row({ name: String(c.at).slice(0, 10), sub: [c.cat, c.staff, c.ch].filter(Boolean).join(' · '), icon: I('chat'), col: 'var(--g700)', right: c.share ? '<span class="sl-sub">보호자 공유</span>' : '' })]) + `<p class="sla-text">${esc(c.text || c.summary || '')}</p>`,
      `<button type="button" class="btn ghost" data-act="crm-goto" data-v="${esc(c.who)}">원생 카드</button>`); };
  { const b = ACT['crm-goto']; if (b) ACT['crm-goto'] = (...a) => { slClose(); return b(...a); }; }

  /* ═══════════ 6. 평가(assess) ═══════════ */
  wrap('assess', old => {
    if (UI.slaSub === 'assess') return null;
    const P = typeof pend === 'function' ? pend() : []; const qn = (S.examQs || []).filter(x => !x.a).length;
    let tb = []; try { const k = UI.asF; UI.asF = 'wait'; tb = tabsOf(old(), 'asF'); UI.asF = k; } catch (e) { }
    const sec = tb.filter(([v]) => v !== 'wait').map(([v, l]) => row({ act: 'sla-tab', v: `assess|asF|${v}`, name: l.replace(/\s\d+$/, ''), sub: v === 'qna' && qn ? `답변 대기 ${qn}건` : '', icon: I(v === 'qna' ? 'chat' : v === 'stats' || v === 'survey' ? 'chart' : 'check'), col: 'var(--g700)', right: v === 'qna' && qn ? `<span class="sl-dot">${qn}</span>` : undefined }));
    const rows = P.sort((a, b) => String(a.c.prog[a.id].subAt).localeCompare(String(b.c.prog[b.id].subAt))).map(({ c, id }) => { const p = c.prog[id]; const w = daysAgo(p.subAt);
      return row({ name: nm(id), sub: [c.name, `${w}일 대기`, p.ai ? `AI ${p.ai.total}점` : ''].filter(Boolean).join(' · '), col: w >= 5 ? '#E5487A' : undefined, right: `<button type="button" class="btn sm pri" data-act="grade" data-a2="1" data-c="${esc(c.id)}" data-v="${esc(id)}">채점</button>` }); });
    return page('평가', tblBtn('assess'), (P.length ? SL.sum(`<span>채점 대기</span><span class="sl-n sl-w">${P.length}건</span>`) + list(rows.slice(0, 200))
      : empty('check', '제출된 과제 · 시험을 여기서 채점합니다', `<button type="button" class="btn pri" data-act="go" data-v="class">${esc(t('cls'))}에 과제 넣기</button>`, ['보고서 과제 루브릭 만들어줘', '검수 대기 과제 보여줘'])) +
      (sec.length ? `<h3 class="sl-gh">더 보기</h3>` + list(sec) : ''));
  });

  /* ═══════════ 7. 콘텐츠(library) ═══════════ */
  wrap('library', () => {
    if (typeof a2Ens === 'function') a2Ens(); const LB = S.lib || [];
    const KF = (l, k) => k === 'all' || (k === 'video' ? ['동영상', 'YouTube'].includes(l.kind) : k === 'eval' ? l.kind === '평가' : !['동영상', 'YouTube', '평가'].includes(l.kind));
    const f = UI.a2lf || 'all'; const up = `<label class="btn pri sla-up">업로드<input type="file" multiple hidden data-chg="lib-up" accept="video/*,.pdf,.hwp,.hwpx,.xlsx,.xls,.ppt,.pptx,image/*"></label>`;
    const R = up + more('lib', [typeof ACT['yt-add'] === 'function' && ['YouTube 등록', 'yt-add', '', '주소만 붙여 넣기', 'play']]);
    if (!LB.length) return page('콘텐츠', R, empty('play', '영상 · 문서를 올려 두고 과정에 편성합니다', up, ['AI 활용 기초 강의 영상 만들어줘', '자료 올리는 법 알려줘']));
    const used = LB.reduce((a, l) => a + (typeof a2Bytes === 'function' ? a2Bytes(l) : 0), 0); const capG = (typeof A2 !== 'undefined' && A2.plan && A2.plan[S.org.plan]) || 1000;
    const use = l => { try { const U = typeof a2LibUse === 'function' ? a2LibUse(l) : []; return U.length ? new Set(U.map(x => x.c.id)).size : (l.cls || []).length; } catch (e) { return 0; } };
    const N = k => LB.filter(l => KF(l, k)).length; const L = LB.filter(l => KF(l, f) && has('a2lq', l.name));
    const kic = l => l.kind === '평가' ? 'check' : ['동영상', 'YouTube'].includes(l.kind) ? 'play' : 'doc';
    return page(`콘텐츠 ${LB.length}개`, tblBtn('library') + R,
      SL.chips('a2lf', [['all', '전체'], ['video', `영상 ${N('video')}`], ['eval', `평가 ${N('eval')}`], ['doc', `자료 ${N('doc')}`]], f) +
      SL.sum(`<span>저장 공간</span><span class="sl-n">${esc((typeof a2Size === 'function' && a2Size(used)) || '0KB')} / ${capG}GB</span>`) +
      (L.length ? list(L.slice(0, 200).map(l => { const u = use(l); return row({ act: l.kind === '평가' ? 'a2-libpv' : 'lib-pl', v: l.id, name: l.name, sub: [l.kind === '평가' ? `평가 · ${l.sub || ''}` : l.kind, l.size, u ? `${u}개 ${t('cls')}에 사용` : '미사용', l.conv && l.conv !== '완료' ? l.conv : ''].filter(Boolean).join(' · '), icon: I(kic(l)), col: u ? 'var(--s400)' : 'var(--g500)' }); })) : none('검색 결과가 없습니다.')) + cap(L) +
      SL.search('a2lq', '콘텐츠 이름 검색'));
  });

  /* ═══════════ 8. 교재 · 교구(book) ═══════════ */
  wrap('book', () => {
    const B = S.books || []; if (!Array.isArray(B)) return null; const f = UI.slBkF || 'all';
    const R = pri('book-new', '+ 교재') + more('book', [typeof ACT['ai-bookthumb'] === 'function' && ['AI 썸네일 추천', 'ai-bookthumb', '', '표지 이미지 만들기', 'spark']]);
    if (!B.length) return page('교재 · 교구', R, empty('book', '전자책 · 실물 교재를 등록해 함께 팝니다', pri('book-new', '+ 교재 만들기'), ['교재 등록해줘', '전자책 다운로드 기간 알려줘']));
    const st = b => b.kind === '전자책' ? `${(b.grants || []).filter(g => !g.off && g.dl > 0).length}/${(b.grants || []).filter(g => !g.off).length}명 다운로드` : `${(b.ship || []).filter(s => s.done).length}/${(b.ship || []).length} 전달`;
    const L = B.filter(b => (f === 'all' || (f === 'ebook' ? b.kind === '전자책' : b.kind !== '전자책')) && has('slBkQ', b.name));
    const ship = B.filter(b => b.kind !== '전자책').reduce((a, b) => a + (b.ship || []).filter(s => !s.done).length, 0);
    return page(`교재 ${B.length}개`, tblBtn('book') + R,
      SL.chips('slBkF', [['all', '전체'], ['ebook', '전자책'], ['real', '실물']], f) +
      (ship ? SL.sum(`<span>전달할 실물 교재</span><span class="sl-n sl-w">${ship}건</span>`) : '') +
      (L.length ? list(L.map(b => row({ act: typeof ACT['sl2-bkd'] === 'function' ? 'sl2-bkd' : 'sla-t', v: typeof ACT['sl2-bkd'] === 'function' ? b.id : 'book:1', name: b.name, sub: [b.kind, b.price ? won(b.price) : '무료', st(b)].join(' · '), icon: b.thumb ? `<img src="${esc(b.thumb)}" alt="">` : I('book'), col: 'var(--s400)' }))) : none('검색 결과가 없습니다.')) +
      SL.search('slBkQ', '교재 이름 검색'));
  });

  /* ═══════════ 9. 배지(badge) ═══════════ */
  wrap('badge', () => {
    const B = S.badges || [];
    const R = pri('badge-new', '+ 배지') + more('badge', [['수동 발급', 'sla-tab', 'badge|bdT|manual', '골라서 배지 주기', 'check'], ['배지 정책 · 설정', 'sla-tab', 'badge|bdT|set', '유효기간 · 취소 정책', 'gear']]);
    if (!B.length) return page('디지털 배지', R, empty('check', '과정을 마치면 줄 배지를 만듭니다', pri('badge-new', '+ 배지 만들기'), ['수료 배지 만들어줘', '배지 발급 기준 알려줘']));
    const L = B.filter(b => has('slBdQ', b.name));
    return page(`배지 ${B.length}개`, tblBtn('badge') + R,
      list(L.map(b => { const n = (b.issued || []).filter(i => i.st === '유효').length; const c = b.cls && C(b.cls);
        return row({ act: 'sla-bd', v: b.id, name: b.name, sub: [c ? c.name : '', `${n}명 보유`, b.special ? '특별 배지' : ''].filter(Boolean).join(' · '), icon: I('check'), col: b.color || 'var(--s400)' }); })) +
      SL.search('slBdQ', '배지 검색'));
  });
  ACT['sla-bd'] = el => { UI.bdB = el.dataset.v; UI.bdT = 'ledger'; T().badge = true; render(); window.scrollTo(0, 0); };

  /* ═══════════ 10. 러닝 저니(journey) ═══════════ */
  wrap('journey', () => {
    const J = S.journey || []; const D = (S.diags || []).filter(d => d.status !== '초안');
    if (!J.length) return page('러닝 저니', '', empty('arrow', '과정을 단계로 묶어 다음 단계가 열리게 합니다', pri('jn-add', '+ 단계 추가'), ['러닝 저니 만들어줘', '진단 결과별 러닝 저니 설계해줘']));
    return page('러닝 저니', tblBtn('journey', '편집') + pri('jn-add', '+ 단계'),
      list(J.map((j, i) => row({ act: 'sla-t', v: 'journey:1', name: `${i + 1}단계 · ${j.name}`, sub: [j.unlock, `${t('cls')} ${(j.cls || []).length}개`].filter(Boolean).join(' · '), icon: String(i + 1), col: 'var(--s400)' }))) +
      SL.sum(`<span>진단 결과별 맞춤 저니</span><span class="sl-n">${D.length}개</span>`, 'go', 'diag'));
  });

  /* ═══════════ 11. AI 진단(diag) ═══════════ */
  wrap('diag', old => {
    if ((UI.dgT || 'list') !== 'list') return null;
    const D = S.diags || []; let tb = []; try { tb = tabsOf(old(), 'dgT'); } catch (e) { }
    const R = `<button type="button" class="btn pri" data-act="dg-new">+ 새 진단</button>`;
    if (!D.length) return page('AI 진단', R, empty('spark', '진단으로 수준 · 성향을 보고 맞춤 경로를 추천합니다', `<button type="button" class="btn pri" data-act="dg-new">${I('spark', 16)} 진단 만들기</button>`, ['AI 활용 수준 진단 만들어줘', '진단 결과 요약해줘']));
    const tgt = d => d.to === 'all' ? S.members.length : S.members.filter(m => m.group === d.to).length;
    return page(`AI 진단 ${D.length}개`, tblBtn('diag', '자세히') + R,
      list(D.map(d => row({ act: 'dg-edit', v: d.id, name: d.name, sub: [d.status, d.mode === 'type' ? '유형 진단' : '수준 진단', `${(d.items || []).length}문항`, `응시 ${Object.keys(d.res || {}).length}/${tgt(d)}명`].join(' · '), icon: I('spark'), col: d.status === '진행 중' ? 'var(--s400)' : 'var(--g500)' }))) +
      (tb.length > 1 ? `<h3 class="sl-gh">더 보기</h3>` + list(tb.filter(([v]) => v !== 'list').map(([v, l]) => row({ act: 'sla-tab', v: `diag|dgT|${v}`, name: l, icon: I('chart'), col: 'var(--g700)' }))) : ''));
  });
  { const b = VIEWS.diag; VIEWS.diag = (...a) => { const h = b(...a); return (UI.dgT || 'list') !== 'list' && !T().diag ? backAct('sla-dglist', '진단 목록') + h : h; }; }
  ACT['sla-dglist'] = () => { UI.dgT = 'list'; render(); };

  /* ═══════════ 12. 캘린더(calendar) — 다가오는 일정 목록 ═══════════ */
  wrap('calendar', () => {
    let A = []; try { A = calEvents(UI.calRole || 'learner', null).slice().sort((a, b) => (a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1); } catch (e) { return null; }
    const R = tblBtn('calendar', '달력으로 보기');
    if (!A.length) return page('캘린더', R, empty('book', `${t('cls')} 일정 · 마감이 여기 모입니다`, `<button type="button" class="btn pri" data-act="go" data-v="class">${esc(t('cls'))} 열기</button>`, ['이번 달 일정 보여줘', '구글 캘린더로 보내줘']));
    const up = A.filter(e => e.date >= today() && e.date <= addDays(today(), 30)); const E = up.length ? up : A.filter(e => e.date < today()).slice(-20).reverse();
    const wd = d => '일월화수목금토'[new Date(d).getDay()];
    return page('캘린더', R, SL.sum(`<span>${up.length ? '앞으로 30일' : '다가오는 일정이 없습니다 · 최근 일정'}</span><span class="sl-n">${E.length}개</span>`) +
      list(E.slice(0, 120).map(e => row({ name: e.title, sub: [`${+e.date.slice(5, 7)}/${+e.date.slice(8)}(${wd(e.date)})`, e.time, e.clsName].filter(Boolean).join(' · '), icon: String(+e.date.slice(8)), col: e.date === today() ? 'var(--s400)' : up.length ? 'var(--s300)' : 'var(--g500)', right: '' }))) + cap(E, 120));
  });

  /* ═══════════ 13. 디지털북(dbook) ═══════════ */
  wrap('dbook', () => {
    if (UI.bkId) return null;
    const B = (typeof LSV === 'function' && LSV() && LSV().dbooks) || [];
    const R = pri('bk-new', '+ 디지털북') + more('dbook', [['AI 초안', 'bk-ai', '', '주제만 말하면 단원 · 블록까지', 'spark'], ['과정으로 만들기', 'bk-fromcls', '', '과정의 영상 · 퀴즈를 단원으로', 'book']]);
    if (!B.length) return page('디지털북', R, empty('book', '읽고 · 풀고 · 쓰는 교재를 단원별로 만듭니다', `<button type="button" class="btn pri" data-act="bk-fromcls">과정으로 만들기</button>`, ['디지털북 만들어줘', 'AI 활용 입문 디지털북 초안 써줘']));
    return page(`디지털북 ${B.length}권`, tblBtn('dbook', '자세히') + R,
      list(B.map(b => { const c = b.cls && C(b.cls); return row({ act: 'bk-open', v: b.id, name: b.title, sub: [`${(b.chs || []).length}단원`, c ? c.name : '연결 과정 없음', b.on === false ? '숨김' : ''].filter(Boolean).join(' · '), icon: I('book'), col: b.color || 'var(--s400)' }); })));
  });

  /* ═══════════ 14. 튜토리얼(tutorial) ═══════════ */
  wrap('tutorial', () => {
    const TU = S.tuts || []; const L0 = typeof LSV === 'function' && LSV() ? LSV() : { levels: [], types: [] };
    const R = `<button type="button" class="btn pri" data-act="tu-edit" data-v="new">+ 튜토리얼</button>`;
    if (!TU.length) return page('튜토리얼', R, empty('play', '영상 + 따라 할 3단계로 기능을 알려 줍니다', `<button type="button" class="btn pri" data-act="tu-edit" data-v="new">+ 튜토리얼 만들기</button>`, ['튜토리얼 만들어줘', 'ChatGPT 사용법 튜토리얼 써줘']));
    const L = TU.filter(x => has('slTuQ', x.title, x.tool || ''));
    return page(`튜토리얼 ${TU.length}개`, tblBtn('tutorial') + R,
      SL.sum(`<span>게시 중</span><span class="sl-n">${TU.filter(x => x.on).length}개</span>`) +
      list(L.map(x => row({ act: 'tu-edit', v: x.id, name: x.title, sub: [(L0.levels[x.level] || {}).name, ((L0.types || []).find(y => y.k === x.type) || {}).name, x.tool, x.on ? '게시' : '숨김'].filter(Boolean).join(' · '), icon: I('play'), col: x.on ? 'var(--s400)' : 'var(--g500)' }))) +
      SL.search('slTuQ', '튜토리얼 검색'));
  });

  /* ═══════════ 15. 성적(grade, 대학) — 머리 · 탭만 공통 틀로 ═══════════ */
  wrap('grade', old => { const h = old(); return page('성적', '', `<div class="sla-old">${strip(h)}</div>`); });

  /* ═══════════ 16. 반 · 팀(groups) ═══════════ */
  wrap('groups', () => {
    if (UI.mbGrp && S.groups.find(x => x.id === UI.mbGrp)) return null;
    const G = S.groups || []; const g = t('group');
    const R = pri('grp-new', `+ ${g}`);
    if (!G.length) return page(g, R, empty('users', `${g}${AI.j(g, '으로')} 묶어 수강 권한 · 메시지를 한 번에 보냅니다`, pri('grp-new', `+ ${g} 만들기`), ['반 나눠줘', `${g}별 진도 보여줘`]));
    const L = G.filter(x => has('slGrpQ', x.name, x.lead || ''));
    return page(`${g} ${G.length}개`, tblBtn('groups') + R,
      list(L.map(x => { const n = S.members.filter(m => m.group === x.id).length; return row({ act: 'mb-grp', v: x.id, name: x.name, sub: [`${n}명`, x.lead ? `담당 ${x.lead}` : ''].filter(Boolean).join(' · '), icon: I('users'), col: 'var(--s400)' }); })) +
      SL.search('slGrpQ', `${g} 검색`));
  });

  /* ═══════════ 17. 보호자(parents) ═══════════ */
  wrap('parents', () => {
    const P = S.parents || []; const f = UI.parF || 'all'; const wait = P.filter(p => p.status === '연결 요청').length;
    const R = pri('par-req', '+ 보호자 연결');
    if (!P.length) return page('보호자', R, empty('users', '보호자를 연결하면 출결 · 청구서 알림이 함께 갑니다', pri('par-req', '+ 보호자 연결'), ['보호자 연결 안 된 학생', '보호자 앱 안내 문구 써줘']));
    const L = P.filter(p => (f === 'all' || p.status === f) && has('slParQ', p.name, nm(p.child)));
    return page(`보호자 ${P.length}명`, tblBtn('parents') + R,
      SL.chips('parF', [['all', '전체'], ['연결 완료', '연결 완료'], ['연결 요청', `대기${wait ? ' ' + wait : ''}`], ['거절', '거절']], f) +
      ((S.pacct || []).length ? SL.sum(`<span>보호자 계정</span><span class="sl-n">${S.pacct.length}명</span>`, 'sla-t', 'parents:1') : '') +
      (L.length ? list(L.map(p => row({ act: 'mb-parchip', v: p.id, name: p.name, sub: [`${nm(p.child)} ${p.rel || '보호자'}`, p.status === '연결 요청' ? '연결 대기 중' : p.status].join(' · '), col: p.status === '연결 완료' ? '#00A224' : p.status === '거절' ? 'var(--g500)' : '#FF9800',
        right: p.status === '연결 요청' ? `<button type="button" class="btn sm" data-act="par-resend" data-v="${esc(p.id)}">재발송</button>` : undefined }))) : none('조건에 맞는 보호자가 없습니다.')) +
      SL.search('slParQ', '보호자 · 자녀 이름 검색'));
  });

  /* ═══════════ 18. 운영자 · 권한(admins) ═══════════ */
  const RL = r => r === 'orgmgr' ? '기관 담당자' : roleName(r);
  wrap('admins', () => {
    const A = S.admins || []; const own = S.me.role === 'owner';
    const scope = a => a.role === 'teacher' ? ((a.classes || []).map(id => (C(id) || {}).name).filter(Boolean).join(', ') || `담당 ${t('cls')} 미지정`) : a.role === 'orgmgr' ? ((S.orgs || []).filter(o => o.mgrId === a.id).map(o => o.name).join(', ') || '담당 기관 미지정') : '전체';
    return page('운영자 · 권한', tblBtn('admins', '권한표') + (own ? pri('adm-new', '+ 운영자') : ''),
      list(A.map(a => row({ act: 'sla-adm', v: a.id, name: a.name, sub: `${RL(a.role)} · ${scope(a)}`, icon: I(a.role === 'owner' ? 'gear' : 'users'), col: a.role === 'owner' ? 'var(--s400)' : a.role === 'teacher' ? '#00A224' : 'var(--g700)' }))) +
      SL.sum(`<span>기록 · 메뉴별 권한</span>`, 'sla-t', 'admins:1'));
  });
  ACT['sla-adm'] = el => { const a = (S.admins || []).find(x => x.id === el.dataset.v); if (!a) return; const own = S.me.role === 'owner'; const v = esc(a.id);
    const items = [own && a.role !== 'owner' ? `<label class="fl">권한<select data-chg="adm-role" data-v="${v}">${['sub', 'teacher', 'orgmgr'].map(r => `<option value="${r}" ${a.role === r ? 'selected' : ''}>${esc(RL(r))}</option>`).join('')}</select></label>` : '',
      list([a.email || a.phone ? row({ name: '연락처', sub: [a.email, a.phone].filter(Boolean).join(' · '), icon: I('send', 18), col: 'var(--g500)', right: '' }) : '',
        own && a.role === 'teacher' ? row({ act: 'mb-tcls', v: a.id, name: `담당 ${t('cls')} 설정`, sub: (a.classes || []).map(id => (C(id) || {}).name).filter(Boolean).join(', ') || '미지정', icon: I('book', 18), col: 'var(--s400)' }) : '',
        own && a.role === 'teacher' ? row({ act: 'as-teacher', v: a.id, name: `이 ${t('teacher')} 화면으로 보기`, sub: '권한 범위 확인', icon: I('users', 18), col: 'var(--g700)' }) : '',
        own && a.role !== 'owner' ? row({ act: 'adm-owner', v: a.id, name: '정운영자 위임', sub: '기관 소유권을 넘깁니다', icon: I('gear', 18), col: '#FF9800' }) : '',
        own && a.role !== 'owner' ? row({ act: 'adm-del', v: a.id, name: '권한 삭제', sub: '정회원으로 바뀝니다', icon: I('x', 18), col: '#E5487A' }) : ''])].join('');
    const w = SL.sheet(`${a.name} · ${RL(a.role)}`, items || none('바꿀 수 있는 항목이 없습니다.')); autoClose(w); };
  { const b = ACT['adm-role']; if (b) ACT['adm-role'] = (...x) => { const r = b(...x); const w = $('#slSheet'); if (w) w.remove(); return r; }; }

  /* 모달이 시트 위에 뜨게(시트 안에서 기존 동작이 모달을 열 때) — CSS는 slim-a.css */
})();
