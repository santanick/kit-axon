/* 콘텐츠 마켓 v1.1 — A7 CP 파트너 포털(mkcp, 운영 공간). CP 테넌트(org.mk.cp === true)만, 운영 서버는 시범 기관만.
   하위 탭(UI.mkcp): home 파트너 홈 · catalog 일괄 업로드 · price 단가표 · optin 참여 설정 · inbox 개별 임대 승인 요청함 · settle 월 소진 정산서(+ 마진 화면이 promo 탭을 더함).
   시연판: S.mkcpD. 운영: /api/market/cp/*(spec 8-3). 공용 도구 window.MKX(mksell.js). 학습자 식별정보는 보이지 않습니다(가명 집계). */
(function () {
  'use strict';
  if (typeof MENU === 'undefined' || typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;
  const X = () => window.MKX;
  const ym = d => String(d).slice(0, 7);
  const prevYm = (m, n) => { const [y, mm] = m.split('-').map(Number); const t = new Date(y, mm - 1 - (n || 1), 1); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };

  function seed() { const M = X(), td = today(), pm = prevYm(ym(td));
    const P = (id, title, listPrice, fromN, offBp, floor, lic, mode, start, active, release) => ({ id, title, listPrice, vol: fromN ? { fromN, offBp } : null, floor, lic, licAdd: 2000, mode, release: release || start, creditFrom: mode === 'single_until' ? M.calc('creditFrom', release, 6) : mode === 'credit' ? start : '', minUntil: mode === 'credit' ? M.calc('optinMinUntil', start) : '', active, history: [{ from: start, listPrice }], lastRaise: '', pending: null });
    return { v: 2, products: [
      P('cp_p1', '생성형 AI 실무 활용', 50000, 500, 1000, 38000, ['view', 'lms', 'adapt'], 'credit', M.addMonths(td, -9).slice(0, 8) + '01', 3),
      P('cp_p2', '업무 보고서 글쓰기', 42500, 500, 1000, 30000, ['view', 'lms'], 'credit', M.addMonths(td, -14).slice(0, 8) + '01', 5),
      P('cp_p3', '엑셀 실무 데이터 정리', 49900, 0, 0, 36000, ['view', 'lms'], 'single', M.addMonths(td, -5).slice(0, 8) + '01', 0),
      P('cp_p4', '신입사원 비즈니스 매너', 30000, 0, 0, 24000, ['view'], 'single_until', '', 0, M.addMonths(td, -1).slice(0, 8) + '01')],
      upload: { file: '러닝웍스_카탈로그_v7.xlsx', at: td, total: 128, ok: 121, review: 5, err: 2, errs: ['「엑셀 실무 7 · 8차시」 자막 파일 누락'] },
      requests: [
        { id: 'rq_1', buyer: '한빛대학교', what: '예산 맞춤 · 업무 보고서 글쓰기 · 300명', note: '제안 단가 27,600원 · 최저가 30,000원 대비 −8%', santa: '산타 몫 30.0% 유지', due: M.addDays(td, 2), status: 'open' },
        { id: 'rq_2', buyer: '세진전자', what: '기관 LMS 탑재 · 엑셀 실무 · 120명', note: '견적 4,147,200원 · 최저가 대비 −4%', santa: '산타 몫 31.5% 유지', due: M.addDays(td, 4), status: 'open' },
        { id: 'rq_3', buyer: '남해군 평생학습관', what: '열람 · 신입사원 비즈니스 매너 · 60명', note: '60명은 수량 할인 최소 인원 미만', santa: '정가 적용 요청', due: M.addDays(td, 6), status: 'open' }],
      stmts: [{ id: 'st_' + pm, ym: pm, status: 'issued', lines: [
        { buyer: '한빛대학교', product: '생성형 AI 실무 활용', enroll: 20, used: 1000, restored: 50 },
        { buyer: '한빛대학교', product: '업무 보고서 글쓰기', enroll: 12, used: 516, restored: 0 },
        { buyer: '동남보건대학교', product: '업무 보고서 글쓰기', enroll: 4, used: 172, restored: 10 },
        { buyer: '부산평생교육진흥원', product: '생성형 AI 실무 활용', enroll: 2, used: 112, restored: 0 }] }],
      quarter: [{ ym: prevYm(pm, 2), cp: 1560000 }, { ym: prevYm(pm, 1), cp: 1820000 }, { ym: pm, cp: 975000 }] }; }
  const D = () => { if (!S) return null; if (!S.mkcpD || !Array.isArray(S.mkcpD.products) || S.mkcpD.v !== 2) S.mkcpD = seed(); return S.mkcpD; };
  window.mkcpData = D;

  const TABS = () => { const T = [['home', '파트너 홈'], ['catalog', '카탈로그'], ['price', '단가표'], ['optin', '참여 설정'], ['inbox', '승인 요청함'], ['settle', '월 소진 정산서'], ['promo', '추천 슬롯']]; (window.MKCP_TABS || []).forEach(t => T.push([t.id, t.label])); return T; };
  const curTab = () => { const T = TABS(); return T.some(t => t[0] === UI.mkcp) ? UI.mkcp : 'home'; };
  const isCp = () => !X().LIVEON() || !!(S.org.mk && S.org.mk.cp);
  const stmtBp = st => st && st.cpBp != null ? +st.cpBp : X().rateRow((demoRate() || {}).rows || [], (st ? st.ym : '') + '-01').cpBp;
  const stmtTot = st => { const M = X(); let used = 0, restored = 0; (st.lines || []).forEach(l => { used += +l.used || 0; restored += +l.restored || 0; }); const bp = stmtBp(st); const net = used - restored; return { used, restored, net, cpBp: bp, cp: st.cpAmount != null ? +st.cpAmount : M.calc('settleLine', net, bp).cp }; };
  /* 운영 응답 → 화면 행 */
  const mProd = p => ({ id: p.id, title: p.title, listPrice: +(p.listPrice ?? p.list_price ?? 0), vol: p.vol || (Array.isArray(p.volRules) && p.volRules[0] ? { fromN: +p.volRules[0].fromN, offBp: +p.volRules[0].offBp } : null), floor: +(p.floorPrice ?? p.floor ?? 0), lic: p.lic || [], licAdd: +(p.licAdd || 0), mode: p.mode || (p.optin && p.optin.mode) || 'single', creditFrom: p.creditFrom || '', minUntil: p.minUntil || '', active: +(p.activeContracts ?? p.active ?? 0), pending: p.pending || null, history: p.history || [] });

  VIEWS.mkcp = () => { const M = X(); if (!M) return '<div class="empty">화면을 불러오지 못했습니다.</div>';
    if (!M.pilot()) return M.offPilot(); if (!M.staff()) return '<div class="empty">교수자 권한으로는 열 수 없는 화면입니다.</div>';
    if (!isCp()) return `<div class="mk"><div class="card"><div class="ch"><b>CP 파트너 기관만 쓰는 화면입니다</b></div><p class="mk-sub">콘텐츠 공급사(CP)로 등록된 기관에서만 열립니다. CP 등록은 산타 운영 담당자에게 요청하십시오.</p></div></div>`;
    const cur = curTab(); let C = null, data = D();
    if (M.LIVEON()) { const need = { prods: '/api/market/cp/optin' }; if (cur === 'settle' || cur === 'home') need.stmts = '/api/market/cp/statements'; if (cur === 'inbox' || cur === 'home') need.req = '/api/market/cp/requests'; if (cur === 'price' || cur === 'settle') need.rate = '/api/market/cp/rate'; if (cur === 'promo') { need.slots = '/api/market/cp/promo-slots?ym=' + X().calc('nextMonth1', today()).slice(0, 7); need.promos = '/api/market/cp/promos'; } C = M.pull('mkcp', need);
      data = { products: M.rows(C.d.prods, 'products').map(mProd), requests: M.rows(C.d.req, 'requests'), stmts: M.rows(C.d.stmts, 'statements'), upload: null, quarter: (C.d.stmts && C.d.stmts.quarter) || [], rate: C.d.rate || null, slots: M.rows(C.d.slots, 'slots'), promos: M.rows(C.d.promos, 'promos') }; }
    else { const LQ = window.mkopsLastQ && window.mkopsMonthLines ? window.mkopsLastQ() : null; data = { ...data, rate: demoRate(), promos: demoPromos(), slots: null, quarter: LQ ? LQ.months.map(m => ({ ym: m, cp: window.mkopsMonthLines([m]).filter(l => l.cpTid === CP_TID).reduce((s0, l) => s0 + l.cp, 0) })) : data.quarter }; }
    const ext = (window.MKCP_TABS || []).find(t => t.id === cur);
    let body = ''; try { body = ext ? ext.view(data) : ({ home: vHome, catalog: vCatalog, price: vPrice, optin: vOptin, inbox: vInbox, settle: vSettle, promo: vPromo })[cur](data); } catch (e) { console.error('mkcp', e); body = `<div class="empty">화면을 그리지 못했습니다: ${esc(e.message || e)}</div>`; }
    return `<div class="mk mk-cp">${M.pageHead('카탈로그 탑재 · 단가표 · 참여 설정 · 승인 요청 · 월 소진 정산을 한곳에서 관리합니다', `<button class="btn ghost" data-act="tab" data-key="mkcp" data-v="price">단가표 수정</button><button class="btn pri" data-act="mk-cp-upload">카탈로그 올리기</button>`)}${M.liveErrBox(C)}${M.subTabs('mkcp', TABS(), cur)}${body}</div>`; };

  function vHome(d) { const M = X(); const st = d.stmts[0]; const t = st ? stmtTot(st) : { net: 0, cp: 0 }; const open = d.requests.filter(r => (r.status || 'open') === 'open').length; const credit = d.products.filter(p => p.mode === 'credit').length;
    return `<div class="kpis">${M.kp('크레딧 참여 상품', M.nf(credit), `/ ${M.nf(d.products.length)}종`, `개별 판매 전용 ${d.products.filter(p => p.mode !== 'credit').length}종`)}${M.kp('이용 기관', M.nf(d.products.reduce((s, p) => s + (+p.active || 0), 0)), '곳', '크레딧 참여 상품 기준')}${M.kp(`${st ? st.ym.slice(5) + '월' : '지난달'} 순소진`, M.nf(t.net), '크레딧', '차감 − 복원')}${M.kp(`${st ? st.ym.slice(5) + '월' : '지난달'} 지급 예정액`, M.nf(t.cp), '원', '순소진 × 650원 · 분기 지급')}</div>
      <div class="mk-g2">${vCatalog(d, true)}<div class="card"><div class="ch"><b>승인 요청함</b><small>개별 임대 최저가 미만 · 예외 조건 견적 ${open}건 · 7일 안에 답하지 않으면 자동 거절</small></div>${reqRows(d.requests.slice(0, 3))}</div></div>`; }
  function vCatalog(d, mini) { const U = d.upload || { total: 0, ok: 0, review: 0, err: 0, errs: [] }; const w = n => U.total ? (n * 100 / U.total).toFixed(1) : 0;
    return `<div class="card" style="display:flex;flex-direction:column;gap:14px"><div class="ch" style="padding:0;border:0"><b>카탈로그 일괄 업로드</b><small>${U.file ? esc(U.at + ' · ' + U.file) : '아직 올린 파일이 없습니다'}</small></div>
      <div class="mk-drop"><div style="flex:1"><b>엑셀 목록과 mp4 · SCORM 파일을 올리십시오</b><p class="mk-sub" style="font-size:13px">한 번에 500종 · 파일당 4GB까지 · 양식에 없는 칸은 AI가 채웁니다</p></div><button class="btn ghost sm" data-act="mk-cp-upload">파일 고르기</button></div>
      ${U.total ? `<div><div class="mk-bar"><i style="width:${w(U.ok)}%"></i><i class="b2" style="width:${w(U.review)}%"></i><i class="wr" style="width:${w(U.err)}%"></i></div><div class="mk-leg" style="margin-top:8px"><span><i style="background:var(--c-data)"></i>탑재 ${U.ok}</span><span><i style="background:var(--c-data2)"></i>검수 중 ${U.review}</span><span><i style="background:var(--c-warn)"></i>오류 ${U.err}</span></div></div>` : ''}
      ${U.err ? X().guard(`오류 ${U.err}건: ${U.errs[0] || ''}`, '파일을 고쳐 다시 올리면 다시 검수합니다. 고칠 때까지 해당 차시는 판매되지 않습니다.', true) : ''}${mini ? '' : ''}</div>`; }
  function vPrice(d) { const M = X(); const nm = M.calc('nextMonth1', today());
    return `<div class="card"><div class="ch"><b>단가표</b><small>정가(1인) ÷ 1,000원 = 과정 크레딧(올림) · 최저가는 개별 임대에만 씁니다 · 부가세 별도</small></div>
      ${M.tw(['상품', '정가(1인)', '과정 크레딧', '수량 할인', '최저가(개별 임대)', '라이선스 · 가산', ''], d.products.map(p => { const c = M.calc('creditsOf', p.listPrice); const v = p.vol ? `같은 과정 ${M.nf(p.vol.fromN)}명째 수강부터 −${p.vol.offBp / 100}% → ${M.nf(M.STUB.volCredits(p.listPrice, p.vol.offBp))}크레딧` : '없음';
        return [`<b>${esc(p.title)}</b>${p.pending ? `<br><small class="mk-sub">${esc(p.pending.from)}부터 ${M.nf(p.pending.listPrice)}원(= ${M.nf(M.calc('creditsOf', p.pending.listPrice))}크레딧)</small>` : ''}`, M.nf(p.listPrice) + '원', `= ${M.nf(c)}크레딧`, esc(v), p.floor ? M.nf(p.floor) + '원' : '—', esc((p.lic || []).map(k => M.LIC[k] || k).join(' · ')) + (p.licAdd ? ` · 변형 +${p.licAdd / 100}%` : ''), `<button class="btn sm ghost" data-act="mk-cp-price" data-v="${esc(p.id)}">수정</button>`]; }), '등록한 상품이 없습니다.', [1, 2])}
      <p class="mk-sub">변경한 단가는 ${esc(nm)}(다음 달 1일)부터 적용됩니다. 이미 차감된 수강에는 소급하지 않습니다.</p>${rateLine(d.rate)}</div>`; }
  function vOptin(d) { const M = X(); const own = M.owner();
    return `<div class="card"><div class="ch"><b>참여 설정</b><small>상품별로 크레딧 참여 · 개별 판매 전용 · 출시 후 N개월 개별 전용을 고릅니다. 크레딧 참여는 최소 1년입니다.${own ? '' : ' 변경은 정운영자만 할 수 있습니다.'}</small></div>
      ${M.tw(['상품', '참여 방식', '참여 시작일', '최소 참여 종료일', '이용 중 기관'], d.products.map(p => { const o = M.OPT[p.mode] || [p.mode, ''];
        const radios = own ? `<div class="chips" role="radiogroup" aria-label="${esc(p.title)} 참여 방식">${Object.entries(M.OPT).map(([k, v]) => `<button class="chip ${p.mode === k ? 'on' : ''}" role="radio" aria-checked="${p.mode === k}" data-act="mk-cp-optin" data-v="${esc(p.id)}" data-m="${k}">${esc(k === 'single_until' ? '출시 후 6개월 개별 전용' : v[0])}</button>`).join('')}</div>` : M.tg(o[0], o[1]);
        return [`<b>${esc(p.title)}</b>`, radios, esc(p.creditFrom || '—'), esc(p.minUntil || '—'), M.nf(p.active) + '곳']; }), '등록한 상품이 없습니다.', [4])}</div>`; }
  const reqRows = L => L.length ? `<div class="mk-rows">${L.map(r => { const done = (r.status || 'open') !== 'open'; return `<div class="mk-row" style="align-items:flex-start"><span class="mk-av">${esc(String(r.buyer || '?').slice(0, 1))}</span><div class="mk-rt"><b>${esc(r.buyer)} ${done ? X().tg(r.status === 'ok' ? '승인' : '거절', r.status === 'ok' ? 'g' : 'r') : `<span class="tag y" style="margin-left:4px">응답 D-${Math.max(0, Math.round((Date.parse(r.due) - Date.parse(today())) / 864e5))}</span>`}</b><small>${esc(r.what || '')}</small><small style="color:var(--t-warn);font-weight:700">${esc(r.note || '')}</small><small>${esc(r.santa || '')}</small></div>${done || !X().owner() ? '' : `<div class="mk-acts"><button class="btn sm ghost" data-act="mk-cp-decide" data-v="${esc(r.id)}" data-ok="0">거절</button><button class="btn sm pri" data-act="mk-cp-decide" data-v="${esc(r.id)}" data-ok="1">승인</button></div>`}</div>`; }).join('')}</div>` : '<div class="empty">답할 승인 요청이 없습니다.</div>';
  function vInbox(d) { return `<div class="card"><div class="ch"><b>개별 임대 승인 요청함</b><small>최저가 미만 · 예외 조건 견적은 CP 승인 후 발송됩니다. 7일 안에 답하지 않으면 자동 거절됩니다.</small></div>${reqRows(d.requests)}</div>`; }
  function vSettle(d) { const M = X(); const st = d.stmts.find(s => s.id === UI.mkcpSt) || d.stmts[0];
    if (!st) return '<div class="card"><div class="ch"><b>월 소진 정산서</b></div><div class="empty">아직 발행된 정산서가 없습니다. 매월 1일에 지난달 정산서가 발행됩니다.</div></div>';
    const t = stmtTot(st); const Q = d.quarter || []; const promoDue = (d.promos || []).filter(p => p.status === 'ok' && !p.stmtId).reduce((a, p) => a + (+p.fee || 0), 0); const qmax = Math.max(1, ...Q.map(q => +q.cp || 0)); const qsum = Q.reduce((s, q) => s + (+q.cp || 0), 0);
    return `<div class="mk-side" style="grid-template-columns:minmax(0,1fr) 340px"><div class="card"><div class="ch"><b>${esc(st.ym.replace('-', '년 '))}월 소진 정산서</b><small>지급액 = 순소진(차감 − 복원) × ${M.nf(t.cpBp / 10)}원(CP ${t.cpBp / 100}%) · 기관 · 과정 단위 가명 집계 ${st.status === 'disputed' ? '· ' + M.tg('이의 접수', 'y') : ''}</small></div>
      ${M.tw(['기관', '과정', '수강 건수', '차감', '복원', '순소진', '지급액'], (st.lines || []).map(l => { const n = (+l.used || 0) - (+l.restored || 0); return [`<b>${esc(l.buyer)}</b>`, esc(l.product), (+l.enroll || 0) < 5 ? '5건 미만' : M.nf(l.enroll) + '건', M.nf(l.used), M.nf(l.restored), M.nf(n), `<b>${M.nf(M.calc('settleLine', n, t.cpBp).cp)}원</b>`]; }), '', [2, 3, 4, 5, 6])}
      <p class="mk-sub" style="color:var(--n900);font-weight:700">합계 — 순소진 ${M.nf(t.net)}크레딧 · 지급 ${M.nf(t.cp)}원</p>
      <div class="mk-acts" style="justify-content:flex-end"><button class="btn ghost" data-act="mk-cp-stmt" data-v="${esc(st.id)}">정산서 CSV</button>${st.status !== 'disputed' ? `<button class="btn ghost" data-act="mk-cp-dispute" data-v="${esc(st.id)}">이의 신청</button>` : ''}</div></div>
      <div class="card"><div class="ch"><b>분기 지급</b><small>월 집계 · 분기 지급(분기 다음 달 15일)</small></div><div class="mk-bars">${Q.map(q => `<div class="mk-bq"><span>${esc(q.ym.slice(5))}월</span><i style="width:${(q.cp * 100 / qmax).toFixed(1)}%"></i><b class="mk-num">${M.nf(q.cp)}원</b></div>`).join('')}</div><p class="mk-sub" style="font-weight:700;color:var(--n900)">분기 지급 예정 ${M.nf(qsum)}원</p>${promoDue ? `<p class="mk-sub">추천 슬롯 수수료 ${M.nf(promoDue)}원은 분기 지급액에서 공제됩니다(지급 ${M.nf(M.calc('promoDeduct', qsum, promoDue, 0).pay)}원).</p>` : ''}</div></div>`; }

  /* ── 동작 ── */
  ACT['mk-cp-upload'] = () => { const M = X(); if (M.LIVEON()) { const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.csv'; f.onchange = () => { const file = f.files && f.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => M.send('POST', '/api/market/cp/catalog/import', { fileName: file.name, data: String(r.result).split(',')[1] || '' }, () => toast('업로드했습니다. 검수가 끝나면 알려 드립니다.')); r.readAsDataURL(file); }; f.click(); return; }
    const U = D().upload; U.at = today(); U.file = '러닝웍스_카탈로그_v8.xlsx'; toast('시연판: 업로드를 접수했습니다. 검수 결과는 카탈로그 탭에 쌓입니다.'); render(); };
  ACT['mk-cp-price'] = el => { const M = X(); const list = (M.LIVEON() ? CURP() : D().products) || []; const p = list.find(x => x.id === el.dataset.v); if (!p) return;
    modal(`단가 수정 — ${p.title}`, `<div class="mk mk-m"><label class="lg-fl"><span>정가(1인, 원, 부가세 별도)</span><input name="lp" type="number" min="1000" step="100" value="${p.listPrice}"></label><p class="mk-sub" id="mkCr">= ${M.nf(M.calc('creditsOf', p.listPrice))}크레딧</p>
      <div class="mk-g2"><label class="lg-fl"><span>수량 할인 시작(명째)</span><input name="fn" type="number" min="0" value="${p.vol ? p.vol.fromN : 0}"></label><label class="lg-fl"><span>할인율(%)</span><input name="off" type="number" min="0" max="50" value="${p.vol ? p.vol.offBp / 100 : 0}"></label></div>
      <label class="lg-fl"><span>최저가(개별 임대에만 씁니다, 원)</span><input name="fl" type="number" min="0" step="100" value="${p.floor || 0}"></label>
      <p class="mk-sub">변경한 단가는 ${esc(M.calc('nextMonth1', today()))}(다음 달 1일)부터 적용됩니다. 이미 차감된 수강에는 소급하지 않습니다. 정가는 분기에 한 번, 30% 이내로만 올릴 수 있습니다.</p></div>`,
      [{ id: 'c', label: '취소', kind: 'ghost' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const lp = Math.round(+fv(w, 'lp') || 0), fn = Math.round(+fv(w, 'fn') || 0), off = Math.round((+fv(w, 'off') || 0) * 100), fl = Math.round(+fv(w, 'fl') || 0);
        if (lp < 1000) { toast('정가를 1,000원 이상으로 입력하십시오.', 'warn'); return false; } if (fl > lp) { toast(M.ERR.mk_floor, 'warn'); return false; }
        const step = M.STUB.priceStep(p.listPrice, lp, p.lastRaise || '', today()); if (step) { toast(M.ERR.mk_price_step, 'warn'); return false; }
        const body = { listPrice: lp, volRules: fn && off ? [{ fromN: fn, offBp: off }] : [], floorPrice: fl, lic: p.lic, licAdd: p.licAdd };
        if (M.LIVEON()) { M.send('PUT', `/api/market/cp/products/${encodeURIComponent(p.id)}/price`, body, r => toast(`저장했습니다. ${(r.price && r.price.effectiveFrom) || ''}부터 적용됩니다.`)); return true; }
        const from = M.calc('nextMonth1', today()); if (lp > p.listPrice) p.lastRaise = today(); p.pending = lp !== p.listPrice ? { from, listPrice: lp } : null; p.vol = body.volRules[0] || null; p.floor = fl; p.history.push({ from, listPrice: lp });
        toast(`저장했습니다. ${from}부터 ${M.nf(M.calc('creditsOf', lp))}크레딧으로 바뀝니다.`); render(); return true; } }]);
    const w = document.getElementById('modal'); const i = w && w.querySelector('[name=lp]'); if (i) i.addEventListener('input', () => { const o = w.querySelector('#mkCr'); if (o) o.textContent = `= ${M.nf(M.calc('creditsOf', +i.value || 0))}크레딧`; }); };
  const CURP = () => { const M = X(); const c = (M && M.LIVEON()) ? M.cache('mkcp') : null; return c && c.d && c.d.prods ? M.rows(c.d.prods, 'products').map(mProd) : null; };
  ACT['mk-cp-optin'] = el => { const M = X(); if (!M.owner()) return toast('참여 설정은 정운영자만 바꿀 수 있습니다.', 'warn'); const list = (M.LIVEON() ? CURP() : D().products) || []; const p = list.find(x => x.id === el.dataset.v); const mode = el.dataset.m; if (!p || p.mode === mode) return;
    const within = p.mode === 'credit' && p.minUntil && today() < p.minUntil;
    const body = within ? `<p>최소 참여 기간(${esc(p.minUntil)}까지) 안의 철회입니다. 새 기관에는 바로 보이지 않고, 이미 이용 중인 ${M.nf(p.active)}곳은 계약 기간 끝까지 계속 이용합니다.</p>` : mode === 'credit' ? `<p>「${esc(p.title)}」을(를) 크레딧 참여로 바꿉니다. 오늘부터 최소 1년(${esc(M.calc('optinMinUntil', today()))}까지) 참여합니다. 산타 심사 후 컬렉션에 편입됩니다.</p>` : mode === 'single_until' ? `<p>출시 후 6개월은 개별 판매 전용으로 두고, ${esc(M.calc('creditFrom', p.release || today(), 6))}부터 크레딧으로 이용할 수 있게 합니다.</p>` : `<p>「${esc(p.title)}」을(를) 개별 판매 전용으로 둡니다. 크레딧 패스 기관에는 보이지 않고 개별 임대 견적으로만 판매됩니다.</p>`;
    M.confirmCard('참여 설정 변경', body, within ? '철회하기' : '바꾸기', () => {
      if (M.LIVEON()) { M.send('PUT', `/api/market/cp/products/${encodeURIComponent(p.id)}/optin`, { mode, singleMonths: mode === 'single_until' ? 6 : undefined }, () => toast('참여 설정을 바꿨습니다.')).catch(() => { }); return; }
      p.mode = mode; if (mode === 'credit') { p.creditFrom = today(); p.minUntil = M.calc('optinMinUntil', today()); } else if (mode === 'single_until') { p.creditFrom = M.calc('creditFrom', p.release || today(), 6); p.minUntil = ''; } else { p.creditFrom = ''; if (!within) p.minUntil = ''; }
      toast('참여 설정을 바꿨습니다.'); render(); }); };
  ACT['mk-cp-decide'] = el => { const M = X(); const okd = el.dataset.ok === '1'; const L = M.LIVEON() ? M.rows(M.cache('mkcp').d.req, 'requests') : D().requests; const r = L.find(x => x.id === el.dataset.v); if (!r) return;
    M.confirmCard(okd ? '승인 요청 수락' : '승인 요청 거절', `<p><b>${esc(r.buyer)}</b> · ${esc(r.what || '')}</p><p>${okd ? '승인하면 산타가 이 조건으로 견적을 발송합니다. 발송 후에는 취소할 수 없습니다.' : '거절하면 산타가 기관에 다른 대안(예산 조정 · 크레딧 패스)을 안내합니다.'}</p>`, okd ? '승인' : '거절', () => {
      if (M.LIVEON()) { M.send('POST', `/api/market/cp/requests/${encodeURIComponent(r.id)}/decide`, { accept: okd }, () => toast(okd ? '승인했습니다.' : '거절했습니다.')).catch(() => { }); return; }
      r.status = okd ? 'ok' : 'no'; toast(okd ? '승인했습니다.' : '거절했습니다.'); render(); }); };
  ACT['mk-cp-stmt'] = el => { const M = X(); if (M.LIVEON()) { const a = document.createElement('a'); a.href = `/api/market/cp/statements/${encodeURIComponent(el.dataset.v)}/pdf`; a.click(); return; } const st = D().stmts.find(s => s.id === el.dataset.v); if (!st || typeof downloadCSV !== 'function') return;
    downloadCSV(`월소진정산서_${st.ym}.csv`, ['기관', '과정', '수강 건수', '차감', '복원', '순소진', '지급액'], st.lines.map(l => { const n = l.used - l.restored; return [l.buyer, l.product, l.enroll < 5 ? '5건 미만' : l.enroll, l.used, l.restored, n, M.calc('monthCp', n, 0).cp]; })); };
  ACT['mk-cp-dispute'] = el => { const M = X(); modal('정산서 이의 신청', `<label class="lg-fl"><span>이의 내용(필수)</span><input name="r" maxlength="200"></label>`, [{ id: 'c', label: '취소', kind: 'ghost' }, { id: 'ok', label: '신청', kind: 'pri', run: w => { const reason = fv(w, 'r'); if (!reason) { toast('이의 내용을 입력하십시오.', 'warn'); return false; }
    if (M.LIVEON()) { M.send('POST', `/api/market/cp/statements/${encodeURIComponent(el.dataset.v)}/dispute`, { reason }, () => toast('이의를 접수했습니다. 산타 운영 담당자가 분기 지급 마감 전에 답합니다.')).catch(() => { }); return true; }
    const st = D().stmts.find(s => s.id === el.dataset.v); if (st) { st.status = 'disputed'; st.dispute = reason; } if (window.mkopsData) { const O = window.mkopsData(); O.disputes.unshift({ id: 'dp_' + Date.now().toString(36), kind: 'stmt', from: 'CP 러닝웍스', what: `${st ? st.ym : ''} 월 소진 정산서`, reason, status: 'open', at: today() }); }
    toast('이의를 접수했습니다. 산타 운영 담당자가 분기 지급 마감 전에 답합니다.'); render(); return true; } }]); };
  /* ── dev-addendum M3 · M2: 적용 요율(읽기 전용) · 추천 슬롯 신청(A7-P) ── */
  const CP_TID = 'cp_lw'; /* 시연판 CP = 러닝웍스 */
  const OPS = () => window.mkopsData ? window.mkopsData() : null;
  function demoRate() { const O = OPS(); if (!O) return null; const rows = (O.rates || []).filter(r => r.cpTid === CP_TID); const td = today(); const cur = X().rateRow(rows, td); const next = rows.filter(r => r.effectiveFrom > td).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0] || null; return { current: cur, next, rows }; }
  function demoPromos() { const O = OPS(); return O ? (O.promos || []).filter(p => p.cpTid === CP_TID) : []; }
  const rateLine = r => { if (!r || !r.current) return ''; const M = X(); const nm = k => M.RATEN[k] || k; return `<p class="mk-note mk-rate" data-rate="${r.current.cpBp}">적용 요율 <b>${r.current.cpBp / 100}%(${esc(nm(r.current.rateKind))})</b>${r.next ? ` · ${esc(r.next.effectiveFrom)}부터 ${r.next.cpBp / 100}%(${esc(nm(r.next.rateKind))})` : ''} — 요율은 CP 단위로 정하고 매월 1일에만 바뀝니다. 변경은 서면 동의 후 산타가 등록합니다.</p>`; };
  const PST = { asked: ['승인 대기', 'y'], ok: ['승인', 'g'], no: ['반려', 'r'], cancelled: ['취소', ''], done: ['노출 끝', 'b'] };
  const qOf = ymv => { const [y, m] = ymv.split('-').map(Number); const q = Math.floor((m - 1) / 3) + 1; return `${y}년 ${q}분기`; };
  function slotsOf(d, ymv) { const M = X(); if (d.slots && d.slots.length) return d.slots; const O = OPS(); const all = O ? O.promos : [];
    return Object.entries(M.SLOT).map(([k, v]) => ({ slot: k, label: v.label, fee: v.fee, cap: v.cap, left: v.cap - all.filter(p => p.slot === k && p.ym === ymv && ['asked', 'ok'].includes(p.status)).length })); }
  function vPromo(d) { const M = X(); const nm = M.calc('nextMonth1', today()).slice(0, 7); const S0 = slotsOf(d, nm); const own = M.owner(); const F = UI.mkPromo || (UI.mkPromo = { slot: 'home_top', product: '', months: [nm] });
    const months = [0, 1, 2].map(i => ym(M.addMonths(nm + '-01', i))); const elig = d.products.filter(p => p.mode === 'credit'); const fee = M.calc('promoFee', F.slot, F.months.length);
    const cards = `<div class="mk-g3">${S0.map(s => `<button type="button" class="mk-tier mk-slot ${F.slot === s.slot ? 'on' : ''}" data-act="mk-promo-f" data-k="slot" data-v="${esc(s.slot)}" aria-pressed="${F.slot === s.slot}">${F.slot === s.slot ? '<span class="mk-rec">선택함</span>' : ''}<b>${esc(s.label)}</b><span class="mk-fee">${M.nf(s.fee)}<small>원/월</small></span><div class="mk-cap">${Array.from({ length: Math.min(s.cap, 10) }, (_, i) => `<i class="${i < s.cap - Math.max(0, s.left) ? 'on' : ''}"></i>`).join('')}</div><p class="mk-sub" style="font-size:12.5px">${esc(nm.replace('-', '년 '))}월 남은 자리 ${Math.max(0, s.left)} / ${s.cap} · 부가세 별도${s.slot === 'new_launch' ? ' · 출시 90일 이내 상품 · 1개월만' : ''}</p></button>`).join('')}</div>`;
    const form = X().guard('추천 슬롯은 유료 노출입니다. 슬롯 상품에는 「광고」 표시가 붙고, 검색 · 정렬 순위에는 영향을 주지 않습니다.', '', true) + rateLine(d.rate) + (own ? `<div class="card"><div class="ch"><b>추천 슬롯 신청</b><small>크레딧 참여 상품만 신청할 수 있습니다. 슬롯 상품에는 「광고」 표시가 붙고, 검색 · 정렬 순위에는 영향을 주지 않습니다.</small></div>${cards}
      <div class="mk-g2" style="margin-top:12px"><label class="lg-fl"><span>상품</span><select data-chg="mk-promo-p" aria-label="슬롯에 올릴 상품"><option value="">상품을 고르십시오</option>${elig.map(p => `<option value="${esc(p.id)}" ${F.product === p.id ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>
      <div class="lg-fl"><span>노출 달(최대 ${F.slot === 'new_launch' ? 1 : M.PROMO_MAX_MONTHS}개월, 다음 달부터)</span><div class="chips">${months.map(m => `<button type="button" class="chip ${F.months.includes(m) ? 'on' : ''}" data-act="mk-promo-f" data-k="m" data-v="${m}" aria-pressed="${F.months.includes(m)}">${esc(m.replace('-', '년 '))}월</button>`).join('')}</div></div></div>
      <p class="mk-sub" style="font-weight:700;color:var(--n900)">합계 ${M.nf(fee)}원 · 승인되면 ${esc(qOf(F.months[0] || nm))} 지급액에서 공제됩니다(모자라면 다음 분기로 이월).</p><div class="mk-acts" style="justify-content:flex-end"><button class="btn pri" data-act="mk-promo-ask" ${F.product && F.months.length ? '' : 'disabled aria-disabled="true"'}>신청하기</button></div></div>` : `<div class="card"><p class="mk-sub">추천 슬롯 신청은 정운영자만 할 수 있습니다.</p></div>`);
    const L = d.promos || []; const title = id => (d.products.find(p => p.id === id) || {}).title || id;
    return `${form}<div class="card"><div class="ch"><b>내 신청</b><small>승인 대기 건만 취소할 수 있습니다</small></div>${M.tw(['상품', '슬롯', '달', '수수료', '상태', '공제 예정', ''], L.map(p => [`<b>${esc(p.title || title(p.productId))}</b>`, esc((M.SLOT[p.slot] || {}).label || p.slot), esc(p.ym), M.nf(p.fee) + '원', M.tg(...(PST[p.status] || [p.status, ''])), esc(p.status === 'ok' || p.status === 'asked' ? qOf(p.ym) : '—'), p.status === 'asked' && own ? `<button class="btn sm ghost" data-act="mk-promo-cancel" data-v="${esc(p.id)}">취소</button>` : '']), '아직 신청한 슬롯이 없습니다.', [3])}</div>`; }
  ACT['mk-promo-f'] = el => { const F = UI.mkPromo || (UI.mkPromo = { slot: 'home_top', product: '', months: [] }); if (el.dataset.k === 'slot') { F.slot = el.dataset.v; if (F.slot === 'new_launch') F.months = F.months.slice(0, 1); } else { const m = el.dataset.v; const max = F.slot === 'new_launch' ? 1 : X().PROMO_MAX_MONTHS; F.months = F.months.includes(m) ? F.months.filter(x => x !== m) : (max === 1 ? [m] : [...F.months, m].slice(-max)).sort(); } render(); };
  ACT['mk-promo-p'] = el => { const F = UI.mkPromo || (UI.mkPromo = { slot: 'home_top', product: '', months: [] }); F.product = el.value; render(); };
  ACT['mk-promo-ask'] = () => { const M = X(); const F = UI.mkPromo; if (!F || !F.product || !F.months.length) return; const nm = M.calc('nextMonth1', today()).slice(0, 7);
    if (F.months.length > (F.slot === 'new_launch' ? 1 : M.PROMO_MAX_MONTHS) || F.months.some(m => m < nm)) return toast(M.ERR.mk_promo_months, 'warn');
    const prods = (M.LIVEON() ? CURP() : D().products) || []; const p = prods.find(x => x.id === F.product); if (!p || p.mode !== 'credit') return toast(M.ERR.mk_promo_target, 'warn');
    if (F.slot === 'new_launch' && p.release && M.addDays(p.release, 90) < F.months[0] + '-01') return toast(M.ERR.mk_promo_target, 'warn');
    const fee = M.calc('promoFee', F.slot, F.months.length); const sl = M.SLOT[F.slot];
    M.confirmCard('추천 슬롯 신청', `<p>「${esc(p.title)}」 · ${esc(sl.label)} · ${esc(F.months.join(', '))}</p><p>수수료 <b>${M.nf(fee)}원</b>(부가세 별도)은 산타가 승인하면 분기 지급액에서 공제됩니다. 별도로 청구하지 않습니다.</p>`, '신청하기', () => {
      if (M.LIVEON()) { M.send('POST', '/api/market/cp/promos', { productId: p.id, slot: F.slot, months: F.months }, () => { toast('신청했습니다. 산타 승인 후 노출됩니다.'); F.product = ''; }).catch(() => { }); return; }
      const O = OPS(); if (!O) return; const full = F.months.find(m => O.promos.filter(x => x.slot === F.slot && x.ym === m && ['asked', 'ok'].includes(x.status)).length >= sl.cap); if (full) return toast(M.ERR.mk_promo_full, 'warn');
      F.months.forEach(m => O.promos.unshift({ id: 'mpr_' + Math.random().toString(36).slice(2, 9), cpTid: CP_TID, cpName: 'CP 러닝웍스', productId: p.id, title: p.title, slot: F.slot, ym: m, fee: sl.fee, status: 'asked', at: today(), rating: 4.6, release: p.release }));
      F.product = ''; toast('신청했습니다. 산타 승인 후 노출됩니다.'); render(); }); };
  ACT['mk-promo-cancel'] = el => { const M = X(); if (M.LIVEON()) { M.send('DELETE', `/api/market/cp/promos/${encodeURIComponent(el.dataset.v)}`, {}, () => toast('신청을 취소했습니다.')).catch(() => { }); return; }
    const O = OPS(); const p = O && O.promos.find(x => x.id === el.dataset.v); if (!p) return; if (p.status !== 'asked') return toast(M.ERR.mk_promo_state, 'warn'); p.status = 'cancelled'; toast('신청을 취소했습니다.'); render(); };
})();
