/* v37 캘린더 강화(대표님 2026-11-10 '캘린더 기능들을 강화해줘. 현재 캘린더를 클릭해도 반응이 없어').
   - 일정 · 코칭(calendar) 화면: 월 · 주 · 목록 보기. 날짜를 누르면 그날 일정 + [일정 추가], 일정을 누르면 상세 · 수정 · 삭제.
   - 과정 일정 자동 표시: 개강 · 종강 · 회차 · 시험 · 과제 마감 · 라이브 · 진단 마감(과정 데이터에서 바로 읽음 — 과정을 고치면 같이 바뀜).
   - 직접 넣는 일정: 기관 유형별 일정 종류(대학 학사 일정 · 학원 보강 · 기업 집합 교육 · 직업훈련 HRD-Net 보고 기한 등).
   - PC에서는 일정을 끌어서 다른 날짜에 놓으면 날짜가 바뀐다(직접 넣은 일정 · 회차). 휴대폰은 일정 상세의 날짜 칸으로 바꾼다.
   - 홈 › 현황의 작은 달력(dash26 d26Cal)도 같은 일정 · 같은 상세 창을 쓴다.
   연동 설정 · AI 코칭 탭은 기존 화면(global.js) 그대로. 데이터: S.calx.ev(직접 넣은 일정)만 새로 저장한다. */
(function () {
  'use strict';
  const KINDS = {
    univ: ['학사 일정', '특강 · 행사', '휴강 · 보강', '상담', '회의'], k12: ['보강', '시험 대비', '상담', '설명회', '휴원'], adult: ['특강', '모집 마감', '상담', '휴강'],
    corp: ['집합 교육', '워크숍', '법정교육 마감', '회의'], public: ['집합 교육', '모집 마감', '평가', '회의'], lifelong: ['특강', '모집 마감', '학습비 반환 기한', '회의'],
    voc: ['훈련', 'HRD-Net 보고 기한', '평가', '상담']
  };
  const COL = { 개강: '#00A224', 종강: '#B3121B', 회차: '#4C77C5', 시험: '#B3121B', 과제: '#5C74F6', 라이브: '#7D5CB5', 진단: '#E8622A', 수업: '#4C77C5' };
  const UCOL = ['#E5487A', '#14A3A3', '#FF9800', '#6447F5', '#109BF1'];
  const kinds = () => KINDS[(S && S.org && S.org.type) || 'adult'] || KINDS.adult;
  /* v37.4 학습자 캘린더(lcal.js): 직접 넣은 일정 중 '학습자에게 보이기'가 켜진 것만 게시본(lsSnapshot.calx)에 싣는다. 내부 일정 종류는 기본 꺼짐. */
  const INNER = ['회의', '상담', 'HRD-Net 보고 기한', '학습비 반환 기한'];
  const pubOf = e => (e && typeof e.pub === 'boolean') ? e.pub : !INNER.includes(e && e.kind);
  window.cxPub = () => { try { if (!S) return []; return store().ev.filter(pubOf).slice(0, 300).map(e => ({ id: e.id, title: String(e.title || '').slice(0, 60), date: e.date, time: e.time || '', end: e.end || '', kind: e.kind || '', cls: e.cls || '' })).filter(e => okD(e.date)); } catch (x) { return []; } };
  const kcol = k => COL[k] || UCOL[Math.max(0, kinds().indexOf(k)) % UCOL.length];
  const store = () => { S.calx = S.calx && typeof S.calx === 'object' ? S.calx : {}; S.calx.ev = Array.isArray(S.calx.ev) ? S.calx.ev : []; return S.calx; };
  const pad = n => String(n).padStart(2, '0');
  const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addD = (s, n) => { const d = dd(s); d.setDate(d.getDate() + n); return ds(d); };
  const okD = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  const WD = '일월화수목금토';
  const fmt = s => `${+s.slice(5, 7)}월 ${+s.slice(8)}일(${WD[dd(s).getDay()]})`;
  const clsOf = id => (S.classes || []).find(c => c.id === id);

  /* ── 모든 일정(자동 + 직접) ── */
  function cxEvents() {
    const E = []; const seen = new Set(); const add = e => { const k = e.date + '|' + e.title; if (!okD(e.date) || seen.has(k)) return; seen.add(k); E.push(e); };
    (S.classes || []).filter(c => c.status !== '삭제').forEach(c => {
      if (okD(c.start)) add({ id: `a:개강:${c.id}`, date: c.start, title: `개강 — ${c.name}`, kind: '개강', cls: c.id, auto: 1 });
      if (okD(c.end)) add({ id: `a:종강:${c.id}`, date: c.end, title: `종강 — ${c.name}`, kind: '종강', cls: c.id, auto: 1 });
      (Array.isArray(c.sessions) ? c.sessions : []).forEach(s => { if (s && okD(s.date)) add({ id: `s:${c.id}:${s.id}`, date: s.date, time: s.from || '', end: s.to || '', title: `${(s.n || '') + '회차'}${s.title && !/^\s*\d+\s*회차\s*$/.test(s.title) && s.title !== c.name ? ' ' + s.title : ''} · ${c.name}`, kind: '회차', cls: c.id, sid: s.id, place: s.place || '', drag: 1 }); });
    });
    try { if (typeof calEvents === 'function') calEvents('teacher', null).filter(e => ['과제', '시험', '라이브', '진단'].includes(e.kind)).forEach((e, i) => add({ id: `a:${e.kind}:${e.cls || ''}:${e.date}:${i}`, date: e.date, time: e.time && e.time !== '23:59' ? e.time : '', title: e.title, kind: e.kind, cls: e.cls, auto: 1 })); } catch (x) { }
    store().ev.forEach(u => add({ ...u, id: 'u:' + u.id, uid: u.id, drag: 1, user: 1 }));
    return E.sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
  }
  window.cxEvents = cxEvents;
  const byDate = E => { const m = {}; E.forEach(e => (m[e.date] = m[e.date] || []).push(e)); return m; };
  const chip = e => `<button type="button" class="cx-ev ${e.drag ? 'dr' : ''}" style="--k:${kcol(e.kind)}" data-act="cx-ev" data-v="${esc(e.id)}" ${e.drag ? `draggable="true" data-cxdrag="${esc(e.id)}"` : ''} title="${esc(e.title)}${e.drag ? ' — 끌어서 날짜 바꾸기' : ''}">${e.time ? `<i>${esc(e.time)}</i>` : ''}${esc(e.title)}</button>`;

  /* ── 보기 ── */
  function monthHTML(E) { const cur = UI.cxD || today(); const ym = cur.slice(0, 7); const first = dd(ym + '-01'); const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(); const B = byDate(E);
    let h = WD.split('').map(w => `<div class="cx-wd">${w}</div>`).join('') + Array(first.getDay()).fill('<div class="cx-day x"></div>').join('');
    for (let i = 1; i <= days; i++) { const d = `${ym}-${pad(i)}`; const L = B[d] || [];
      h += `<div class="cx-day ${d === today() ? 'td' : ''} ${d === UI.cxSel ? 'sel' : ''}" data-cxday="${d}"><button type="button" class="cx-dn" data-act="cx-day" data-v="${d}" aria-label="${fmt(d)} 일정 ${L.length}개 — 보기 · 추가">${i}</button>${L.slice(0, 3).map(chip).join('')}${L.length > 3 ? `<button type="button" class="cx-more" data-act="cx-day" data-v="${d}">+${L.length - 3}개</button>` : ''}</div>`; }
    const tail = (7 - (first.getDay() + days) % 7) % 7; h += Array(tail).fill('<div class="cx-day x"></div>').join('');
    return `<div class="cx-month" role="grid" aria-label="${+ym.slice(0, 4)}년 ${+ym.slice(5)}월">${h}</div>`; }
  function weekHTML(E) { const cur = UI.cxD || today(); const s0 = addD(cur, -dd(cur).getDay()); const B = byDate(E);
    return `<div class="cx-week">${Array.from({ length: 7 }, (_, i) => { const d = addD(s0, i); const L = B[d] || [];
      return `<div class="cx-wcol ${d === today() ? 'td' : ''}" data-cxday="${d}"><button type="button" class="cx-wh" data-act="cx-day" data-v="${d}"><b>${WD[i]}</b><span>${+d.slice(5, 7)}/${+d.slice(8)}</span></button>${L.map(chip).join('') || '<small class="cx-none">일정 없음</small>'}<button type="button" class="cx-add1" data-act="cx-add" data-v="${d}" aria-label="${fmt(d)} 일정 추가">+</button></div>`; }).join('')}</div>`; }
  function listHTML(E) { const from = UI.cxD && UI.cxD < today() ? UI.cxD : today(); const L = E.filter(e => e.date >= from && e.date <= addD(from, 60)); const B = byDate(L);
    return Object.keys(B).length ? `<div class="cx-list">${Object.keys(B).sort().map(d => `<div class="cx-lg" data-cxday="${d}"><button type="button" class="cx-lh ${d === today() ? 'td' : ''}" data-act="cx-day" data-v="${d}">${fmt(d)}${d === today() ? ' · 오늘' : ''}</button>${B[d].map(e => `<button type="button" class="cx-lr" data-act="cx-ev" data-v="${esc(e.id)}"><i style="background:${kcol(e.kind)}"></i><span class="cx-lk">${esc(e.kind)}</span><b>${esc(e.title)}</b><small>${esc([e.time && (e.time + (e.end ? '~' + e.end : '')), e.cls && clsOf(e.cls) ? clsOf(e.cls).name : ''].filter(Boolean).join(' · '))}</small></button>`).join('')}</div>`).join('')}</div>`
      : `<div class="sl-empty">앞으로 60일 동안 일정이 없습니다. <button type="button" class="btn sm pri" data-act="cx-add" data-v="${today()}">+ 일정 추가</button></div>`; }
  function calHTML() { const v = UI.cxV || (innerWidth <= 640 ? 'list' : 'month'); const cur = UI.cxD || today(); const E = cxEvents();
    const title = v === 'week' ? (() => { const s0 = addD(cur, -dd(cur).getDay()); return `${+s0.slice(5, 7)}/${+s0.slice(8)} ~ ${+addD(s0, 6).slice(5, 7)}/${+addD(s0, 6).slice(8)}`; })() : v === 'list' ? '앞으로 60일' : `${cur.slice(0, 4)}년 ${+cur.slice(5, 7)}월`;
    const legend = ['개강', '종강', '회차', '시험', '과제', '라이브', ...kinds()].map(k => `<span><i style="background:${kcol(k)}"></i>${esc(k)}</span>`).join('');
    return `<div class="cx">
      <div class="cx-bar"><div class="seg2 cx-v" role="tablist" aria-label="보기">${[['month', '월'], ['week', '주'], ['list', '목록']].map(([k, l]) => `<button type="button" role="tab" aria-selected="${v === k}" class="${v === k ? 'on' : ''}" data-act="cx-view" data-v="${k}">${l}</button>`).join('')}</div>
        ${v === 'list' ? '' : `<button type="button" class="btn sm ghost" data-act="cx-mv" data-v="-1" aria-label="이전">‹</button>`}<b class="cx-ttl">${title}</b>${v === 'list' ? '' : `<button type="button" class="btn sm ghost" data-act="cx-mv" data-v="1" aria-label="다음">›</button>`}<button type="button" class="btn sm ghost" data-act="cx-mv" data-v="0">오늘</button><span class="sp"></span><button type="button" class="btn sm pri" data-act="cx-add" data-v="${UI.cxSel || today()}">+ 일정 추가</button></div>
      ${v === 'month' ? monthHTML(E) : v === 'week' ? weekHTML(E) : listHTML(E)}
      <div class="cx-leg">${legend}</div>
      <p class="mini cx-help">날짜를 누르면 그날 일정을 보고 추가합니다. 일정을 누르면 상세 · 수정 · 삭제. ${innerWidth > 860 ? 'PC에서는 직접 넣은 일정과 회차를 끌어서 다른 날짜에 놓으면 날짜가 바뀝니다. ' : ''}과정의 개강 · 종강 · 시험 · 과제 마감 · 라이브는 과정에서 자동으로 들어옵니다.</p></div>`; }

  /* 일정 · 코칭 화면: [캘린더] 탭은 새 캘린더, [연동 설정] · [AI 코칭]은 기존 화면 */
  if (typeof VIEWS.calendar === 'function') { const old = VIEWS.calendar;
    VIEWS.calendar = (...a) => { const tb = UI.calT || 'month'; if (tb !== 'month') return old(...a);
      return `<div class="cx-head">${tabs('calT', [['month', '캘린더'], ['conn', '연동 설정'], ['coach', 'AI 코칭']], 'month')}</div>` + calHTML(); }; }
  window.cxCalHTML = calHTML;

  /* ── 상세 · 추가 · 수정(시트) ── */
  const find = id => cxEvents().find(e => e.id === id);
  function form(e, date) { const K = [...kinds()]; const k0 = e ? e.kind : K[0];
    return `<div class="cx-form"><label class="fl">제목<input name="cxT" maxlength="60" value="${esc(e ? e.title : '')}" placeholder="예: ${esc(K[0])}"></label>
      <div class="form2"><label>날짜<input type="date" name="cxD" value="${esc(e ? e.date : date)}"></label><label>시작<input type="time" name="cxS" value="${esc(e ? e.time || '' : '')}"></label><label>종료<input type="time" name="cxE" value="${esc(e ? e.end || '' : '')}"></label></div>
      <label class="fl">일정 종류<select name="cxK">${K.map(k => `<option ${k === k0 ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
      <label class="fl">연결 ${esc(t('cls'))}(선택)<select name="cxC"><option value="">없음</option>${(S.classes || []).slice(0, 200).map(c => `<option value="${esc(c.id)}" ${e && e.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="fl">메모<input name="cxM" maxlength="120" value="${esc(e ? e.memo || '' : '')}"></label>
      <label class="cx-pub"><input type="checkbox" name="cxP" ${pubOf(e || { kind: k0 }) ? 'checked' : ''}> ${esc(t('learner'))} 캘린더에도 보이기 <small>(${esc(t('cls'))}을 연결하면 그 수강생에게만 · 게시하면 반영)</small></label></div>`; }
  const fv2 = (w, n) => { const x = w.querySelector(`[name="${n}"]`); return x ? x.value.trim() : ''; };
  function dayOpen(d) { UI.cxSel = d; const L = cxEvents().filter(e => e.date === d);
    SL.sheet(fmt(d), `${L.length ? `<div class="cx-list">${L.map(e => `<button type="button" class="cx-lr" data-act="cx-ev" data-v="${esc(e.id)}"><i style="background:${kcol(e.kind)}"></i><span class="cx-lk">${esc(e.kind)}</span><b>${esc(e.title)}</b><small>${esc(e.time || '')}</small></button>`).join('')}</div>` : '<p class="mini">이 날은 일정이 없습니다.</p>'}`,
      `<button type="button" class="btn pri" data-act="cx-add" data-v="${d}">+ 이 날 일정 추가</button>`); }
  function evOpen(id) { const e = find(id); if (!e) { toast('일정을 찾지 못했습니다.', 'warn'); return; } const c = e.cls && clsOf(e.cls);
    if (e.user) { const w = SL.sheet('일정 수정', form(e), `<button type="button" class="btn ghost red" data-act="cx-del" data-v="${esc(e.uid)}">삭제</button><button type="button" class="btn pri" data-act="cx-save" data-v="${esc(e.uid)}">저장</button>`); return w; }
    const rows = [['종류', e.kind], ['날짜', fmt(e.date) + (e.time ? ' ' + e.time + (e.end ? '~' + e.end : '') : '')], ...(c ? [[t('cls'), c.name]] : []), ...(e.place ? [['장소', e.place]] : [])];
    SL.sheet(e.title, `<div class="cx-det">${rows.map(([a, b]) => `<div class="sx-kv"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('')}</div>${e.sid ? `<label class="fl">날짜 바꾸기<input type="date" name="cxMv" value="${esc(e.date)}" data-chg="cx-smv" data-v="${esc(e.id)}"></label><p class="mini">회차 날짜를 바꾸면 ${esc(t('learner'))}에게 일정 변경 알림이 갑니다.</p>` : `<p class="mini">${esc(t('cls'))}에서 자동으로 들어온 일정입니다. 날짜는 ${esc(t('cls'))} 설정에서 바꿉니다.</p>`}`,
      `${c ? `<button type="button" class="btn" data-act="cx-cls" data-v="${esc(c.id)}">${esc(t('cls'))} 열기</button>` : ''}${e.sid ? `<button type="button" class="btn pri" data-act="cx-sedit" data-v="${esc(e.id)}">회차 편집</button>` : ''}`); }
  ACT['cx-view'] = el => { UI.cxV = el.dataset.v; render(); };
  ACT['cx-mv'] = el => { const v = +el.dataset.v; const mode = UI.cxV || (innerWidth <= 640 ? 'list' : 'month'); const cur = UI.cxD || today();
    if (!v) UI.cxD = today(); else if (mode === 'week') UI.cxD = addD(cur, 7 * v); else { const d = dd(cur.slice(0, 7) + '-01'); d.setMonth(d.getMonth() + v); UI.cxD = ds(d); } render(); };
  ACT['cx-day'] = el => dayOpen(el.dataset.v);
  ACT['cx-ev'] = el => evOpen(el.dataset.v);
  ACT['cx-add'] = el => { const d = okD(el.dataset.v) ? el.dataset.v : today(); SL.sheet('일정 추가', form(null, d), `<button type="button" class="btn pri" data-act="cx-save" data-v="">추가</button>`); };
  ACT['cx-save'] = el => { const w = $('#slSheet'); if (!w) return; const T = fv2(w, 'cxT'), D = fv2(w, 'cxD');
    if (!T) { toast('제목을 입력하세요.', 'warn'); return; } if (!okD(D)) { toast('날짜를 입력하세요.', 'warn'); return; }
    const S1 = fv2(w, 'cxS'), E1 = fv2(w, 'cxE'); if (S1 && E1 && E1 <= S1) { toast('종료 시간이 시작 시간보다 빠릅니다.', 'warn'); return; }
    const o = { title: T.slice(0, 60), date: D, time: S1, end: E1, kind: fv2(w, 'cxK') || kinds()[0], cls: fv2(w, 'cxC'), memo: fv2(w, 'cxM').slice(0, 120), pub: !!(w.querySelector('[name="cxP"]') || {}).checked };
    const L = store().ev; const id = el.dataset.v; if (id) { const u = L.find(x => x.id === id); if (!u) return; Object.assign(u, o); logAudit(`일정 수정 — ${o.title}`); } else { L.push({ id: uid('cx'), ...o }); logAudit(`일정 추가 — ${o.title}`); }
    UI.cxSel = D; save(); slClose(); render(); toast(id ? '일정을 저장했습니다.' : `${fmt(D)}에 일정을 추가했습니다.`, 'ok'); };
  ACT['cx-del'] = el => { const L = store().ev; const i = L.findIndex(x => x.id === el.dataset.v); if (i < 0) return; const u = L[i];
    modal('일정 삭제', `<p>「${esc(u.title)}」(${esc(fmt(u.date))}) 일정을 삭제할까요?</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { L.splice(i, 1); logAudit(`일정 삭제 — ${u.title}`); save(); slClose(); render(); toast('일정을 삭제했습니다.', 'ok'); } }]); };
  ACT['cx-cls'] = el => { slClose(); if (ACT['cls-open']) ACT['cls-open']({ dataset: { v: el.dataset.v } }); else go('class'); };
  ACT['cx-sedit'] = el => { const [, cid, sid] = String(el.dataset.v).split(':'); slClose(); if (ACT['w2-sedit']) ACT['w2-sedit']({ dataset: { c: cid, s: sid } }); };
  ACT['cx-smv'] = el => { if (!cxMove(el.dataset.v, el.value)) el.value = (find(el.dataset.v) || {}).date || ''; else slClose(); };

  /* ── 날짜 옮기기(끌어 놓기 · 날짜 칸) ── */
  function cxMove(id, d) { if (!okD(d)) { toast('날짜를 확인하세요.', 'warn'); return false; } const e = find(id); if (!e) return false; if (e.date === d) return false;
    if (e.user) { const u = store().ev.find(x => x.id === e.uid); if (!u) return false; u.date = d; logAudit(`일정 날짜 변경 — ${u.title} → ${d}`); save(); render(); toast(`「${u.title}」을(를) ${fmt(d)}로 옮겼습니다.`, 'ok'); return true; }
    if (e.sid) { const c = clsOf(e.cls); const s = c && (c.sessions || []).find(x => x.id === e.sid); if (!s) return false;
      if ((c.sessions || []).some(x => x.date === d && x.id !== s.id)) { toast('이미 회차가 있는 날짜입니다. 다른 날짜를 고르세요.', 'warn'); return false; }
      const old = s.date; s.date = d; try { if (typeof W2 !== 'undefined') { W2.renum && W2.renum(c); W2.period && W2.period(c); W2.dateChanged && W2.dateChanged(c, s, old); W2.sync && W2.sync(c); } } catch (x) { console.error(x); }
      logAudit(`${c.name} 회차 날짜 변경 ${old} → ${d}`); save(); render(); toast(`회차를 ${fmt(d)}로 옮겼습니다.${(c.learners || []).length ? ` ${t('learner')}에게 일정 변경 알림을 보냈습니다.` : ''}`, 'ok'); return true; }
    toast(`${t('cls')}에서 들어온 일정은 ${t('cls')} 설정에서 날짜를 바꿉니다.`, 'warn'); return false; }
  window.cxMove = cxMove;
  document.addEventListener('dragstart', e => { const x = e.target.closest && e.target.closest('[data-cxdrag]'); if (!x) return; e.dataTransfer.setData('text/plain', 'cx:' + x.dataset.cxdrag); e.dataTransfer.effectAllowed = 'move'; x.classList.add('drag'); });
  document.addEventListener('dragend', e => { document.querySelectorAll('.cx-ev.drag, [data-cxday].over').forEach(x => x.classList.remove('drag', 'over')); });
  document.addEventListener('dragover', e => { const c = e.target.closest && e.target.closest('[data-cxday]'); if (!c) return; e.preventDefault(); document.querySelectorAll('[data-cxday].over').forEach(x => x !== c && x.classList.remove('over')); c.classList.add('over'); });
  document.addEventListener('drop', e => { const c = e.target.closest && e.target.closest('[data-cxday]'); if (!c) return; const v = e.dataTransfer.getData('text/plain'); if (!v.startsWith('cx:')) return; e.preventDefault(); c.classList.remove('over'); cxMove(v.slice(3), c.dataset.cxday); });

  /* ── 홈 › 현황의 작은 달력: 같은 일정 · 같은 상세 창 ── */
  if (typeof d26Cal === 'function') {
    d26Cal = () => { const cur = UI.d26m || today(); const ym = cur.slice(0, 7); const first = dd(ym + '-01'); const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(); const B = byDate(cxEvents()); const sel = UI.d26d || today(); const L = B[sel] || [];
      const cells = Array(first.getDay()).fill('<span></span>').concat(Array.from({ length: days }, (_, i) => { const d = `${ym}-${pad(i + 1)}`; return `<button type="button" class="${d === sel ? 'on' : ''} ${d === today() ? 'td' : ''}" data-act="d26-day" data-v="${d}" aria-label="${fmt(d)} 일정 ${(B[d] || []).length}개">${i + 1}${(B[d] || []).length ? '<i></i>' : ''}</button>`; }));
      return `<div class="d26-cal"><div class="d26-calh"><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="-1" aria-label="이전 달">‹</button><b>${ym.replace('-', '.')}</b><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="1" aria-label="다음 달">›</button><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="0">오늘</button></div>
        <div class="d26-calg">${WD.split('').map(w => `<small>${w}</small>`).join('')}${cells.join('')}</div></div>
        <div class="d26-evl"><b>${esc(fmt(sel))}</b>${L.map(e => `<button type="button" class="cx-lr" data-act="cx-ev" data-v="${esc(e.id)}"><i style="background:${kcol(e.kind)}"></i><span class="cx-lk">${esc(e.kind)}</span><b>${esc(e.title)}</b></button>`).join('') || '<p class="mini">이 날 일정이 없습니다.</p>'}
        <div class="bar2"><button type="button" class="btn sm" data-act="cx-add" data-v="${sel}">+ 일정 추가</button><button type="button" class="btn sm ghost" data-act="cx-full" data-v="${sel}">캘린더 크게 보기</button></div></div>`; };
  }
  /* 칸의 빈 곳을 눌러도 그날 일정이 열린다(날짜 숫자 · 일정 칩은 각자 동작) */
  document.addEventListener('click', e => { const c = e.target.closest && e.target.closest('.cx-day[data-cxday], .cx-wcol[data-cxday]'); if (!c || e.target.closest('[data-act]')) return; dayOpen(c.dataset.cxday); });
  ACT['cx-full'] = el => { UI.cxD = el.dataset.v || today(); UI.calT = 'month'; go('calendar'); };

  const st = document.createElement('style'); st.id = 'cxCss';
  st.textContent = `.cx{display:flex;flex-direction:column;gap:12px;min-width:0}
.cx-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cx-bar .btn{min-height:44px}.cx-ttl{font-size:17px;min-width:90px;text-align:center}.cx-bar .sp{flex:1}
.cx-v button{min-height:44px;min-width:52px}
.cx-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:1px solid #EAEBEB;border-radius:14px;overflow:hidden;background:#fff}
.cx-wd{padding:8px;font-size:13px;font-weight:700;color:#6C6C6C;background:#F6F7F7;text-align:center}
.cx-day{min-height:112px;border-top:1px solid #EAEBEB;border-left:1px solid #F1F2F2;padding:4px;display:flex;flex-direction:column;gap:3px;min-width:0;cursor:pointer}
.cx-day.x{background:#FBFCFC;cursor:default}.cx-day:hover:not(.x){background:#F7F8FF}.cx-day.td .cx-dn{background:#5C74F6;color:#fff}.cx-day.sel{outline:2px solid #A5B0FA;outline-offset:-2px}.cx-day.over,.cx-wcol.over,.cx-lg.over{background:#EAEDFF;outline:2px dashed #5C74F6;outline-offset:-3px}
.cx-dn{align-self:flex-start;min-width:32px;height:32px;border:0;border-radius:50%;background:none;font:inherit;font-size:14px;font-weight:700;cursor:pointer;color:inherit}
.cx-ev{display:block;width:100%;text-align:left;border:0;border-left:3px solid var(--k);background:color-mix(in srgb,var(--k) 12%,#fff);color:#2A2B2B;border-radius:6px;padding:3px 6px;font:inherit;font-size:12.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;min-height:24px}
.cx-ev.dr{cursor:grab}.cx-ev.drag{opacity:.45}.cx-ev i{font-style:normal;font-weight:700;margin-right:4px}
.cx-more{border:0;background:none;font:inherit;font-size:12px;color:#4257D7;text-align:left;cursor:pointer;padding:2px 4px}
.cx-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.cx-wcol{background:#fff;border:1px solid #EAEBEB;border-radius:12px;padding:6px;display:flex;flex-direction:column;gap:4px;min-height:260px;min-width:0}.cx-wcol.td{border-color:#5C74F6}
.cx-wh{display:flex;justify-content:space-between;border:0;background:#F6F7F7;border-radius:8px;padding:8px;font:inherit;cursor:pointer;min-height:44px;align-items:center}
.cx-none{color:#AAABAB;font-size:12px;padding:4px}.cx-add1{margin-top:auto;border:1px dashed #C8C9C9;background:none;border-radius:8px;min-height:40px;font-size:18px;color:#6C6C6C;cursor:pointer}
.cx-list{display:flex;flex-direction:column;gap:10px}.cx-lg{display:flex;flex-direction:column;gap:4px}
.cx-lh{align-self:flex-start;border:0;background:none;font:inherit;font-weight:800;font-size:15px;padding:6px 0;cursor:pointer;min-height:40px}.cx-lh.td{color:#4257D7}
.cx-lr{display:grid;grid-template-columns:10px auto minmax(0,1fr);grid-template-rows:auto auto;column-gap:10px;align-items:center;text-align:left;width:100%;border:1px solid #EAEBEB;background:#fff;border-radius:12px;padding:10px 12px;font:inherit;cursor:pointer;min-height:52px}
.cx-lr:hover{border-color:#A5B0FA}.cx-lr>i{width:10px;height:10px;border-radius:50%;grid-row:1/3}.cx-lk{font-size:12px;font-weight:700;color:#6C6C6C;background:#F6F7F7;border-radius:6px;padding:2px 6px}.cx-lr b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.cx-lr small{grid-column:2/4;color:#808181;font-size:13px}
.cx-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:#4C4D4D}.cx-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.cx-pub{display:flex;align-items:center;gap:8px;min-height:44px;font-weight:600}.cx-pub input{width:20px;height:20px}.cx-pub small{color:#808181;font-weight:400}
.cx-form .form2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.d26-evl .cx-lr{margin-top:6px;grid-template-columns:10px minmax(0,1fr)}.d26-evl .cx-lk{display:none}.d26-evl .cx-lr b{white-space:normal;font-size:13.5px}
@media (max-width:640px){.cx-day{min-height:64px;padding:2px}.cx-ev{font-size:0;height:8px;min-height:8px;padding:0;border-left-width:0;background:var(--k);border-radius:4px}.cx-ev i{display:none}.cx-week{grid-template-columns:1fr}.cx-wcol{min-height:0}.cx-form .form2{grid-template-columns:1fr 1fr}.cx-bar .sp{display:none}}`;
  (document.head || document.documentElement).appendChild(st);
})();
