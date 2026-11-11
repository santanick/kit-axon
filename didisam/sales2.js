/* v22 sales2 — 레거시 디디쌤 가이드 기능 보완(W4 판매 · 결제 · 교재, 운영자 화면)
   - ACT.pg 충돌 수정: kit.js의 진도 규칙(data-chg="pg" + data-k)과 매출 PG 선택(data-v)을 데이터 속성으로 나눠 처리
   - 매출 관리: PG(토스페이먼츠 단일, v23에서 디디쌤 연결 PG 제외) · 토스 가입(신청 → 상점 ID → 심사중/승인/반려) · 결제/환불/청구서 납부 내역 · 월별/연도별 통계 · 환불 승인/거절/부분 환불
   - 청구서: 4단계(청구서명 → 청구항목 → 청구 대상 → 발송 설정), 개별 대상 · 대상별 항목 · 보호자 동시 발송 · 클래스/교재 연결(납부 시 수강 권한) · 알림톡 [납부하러 가기]
   - 교재/교구: PDF 메타 · 수정 · 다운로드 횟수/기간 · 권한(수강생 관리) · 실물 전달 체크 · 결제 요청사항
   - 학습자 → 운영자: LPX[type] 처리기(enroll · pay · vacct-paid · pay-cancel · refund-req · refund-cancel · bill-pay · sub-cancel · book-dl · book-ship · book-free)
   - 학습자 게시본: lsSnapshot 감싸기(r.shop) + 게시본이 있으면 판매 데이터만 화면이 바뀔 때마다 갱신 */
'use strict';
(() => {
  const ST = () => S.settings;
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return ymdL(x); };
  const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  const sum = (a, f) => a.reduce((s, x) => s + (+f(x) || 0), 0);
  const BANKS = ['KB국민', '신한', '우리', '하나', 'NH농협', 'IBK기업', 'SC제일', '카카오뱅크', '토스뱅크', '케이뱅크', '부산', '대구', '경남', '광주', '전북', '제주', '새마을금고', '신협', '우체국', '수협'];
  const TOSS_STAGES = ['토스페이먼츠 리스크팀 검토', '전자계약 · 제출 서류 검토', '홈페이지 정보 · 결제 환경 확인', '국내 카드사 심사(영업일 7~10일)', '디디쌤 최종 승인'];
  const BILL_KINDS = [['class', '수업료(클래스)'], ['book', '재료비(교재/교구)'], ['car', '차량비'], ['meal', '급식비'], ['dorm', '기숙사비'], ['mock', '모의고사비'], ['uniform', '피복비(교복)'], ['etc', '기타']];
  const BKN = Object.fromEntries(BILL_KINDS);
  const NOTIFY = ['마감 3일 전 + 당일', '마감 1일 전', '마감 당일', '보내지 않음'];
  const actOK = m => m && !['승인 대기', '거절'].includes(m.grade);
  const hashStr = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h).toString(36); };

  /* ── 상태 보정(샘플 · 빈 스튜디오 · 예전 형식 모두) ── */
  function sl2Ensure() {
    if (!S || !S.org || !S.settings) return;
    ['pays', 'bills', 'books', 'subs', 'msgs', 'parents'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
    const st = ST(); const demo = !S.org.empty;
    if (!st.pg) st.pg = 'none';
    if (!st.pgInfo) { st.pgInfo = { kind: 'biz', name: '', bizNo: '', ceo: '', addr: '', rrn: '', bank: '', account: '', holder: '', docs: [], status: '미등록', reason: '', tossMid: '' };
      if (demo && st.pg === 'nice') Object.assign(st.pgInfo, { name: S.org.name, bizNo: '123-45-67890', ceo: '홍길동', addr: '부산광역시 해운대구', bank: '신한', account: '110000000000', holder: S.org.name, docs: [{ name: '사업자등록증.pdf', size: 120000, k: 'biz' }, { name: '통장사본.jpg', size: 80000, k: 'bank' }], status: '승인', at: addDays(today(), -60) }); }
    if (!st.toss) { st.toss = { status: '미가입', stage: 0, bizNo: '', ceo: '', store: '', phone: '', email: '', mid: '', at: '', reason: '', weeks: 4, checks: {} };
      if (demo && st.pg === 'toss') Object.assign(st.toss, { status: '승인', stage: TOSS_STAGES.length, mid: 'didisam_demo01', at: addDays(today(), -40), done: addDays(today(), -12) }); }
    st.pgInfo.tossMid = st.toss.mid || st.pgInfo.tossMid || '';
    /* v23 대표님(2026-11-03): '매출 부분에는 디디쌤 연결 PG(나이스페이먼츠) 부분은 빼줘' — 토스페이먼츠만 사용. 예전 nice 상태는 토스로 옮기거나 미연결로 둔다. */
    if (st.pg === 'nice') { if (demo && st.toss.status === '미가입') Object.assign(st.toss, { status: '승인', stage: TOSS_STAGES.length, mid: 'didisam_demo01', at: addDays(today(), -40), done: addDays(today(), -12) }); st.pg = st.toss.status === '미가입' ? 'none' : 'toss'; }
    if (S.org.empty && st.pg !== 'none' && st.toss.status === '미가입' && st.pgInfo.status === '미등록') st.pg = 'none';
    S.pays.forEach(p => {
      if (!p.itemType) p.itemType = 'class';
      if (!p.ref && p.itemType === 'class') { const c = S.classes.find(x => x.name === p.item); if (c) p.ref = c.id; }
      if (typeof p.refund === 'number') p.refund = { at: p.at, reason: '', amount: p.refund, state: '승인' };
      if (p.status === '환불 신청' && !p.refund) p.refund = { at: [addDays(p.at, 2), today()].sort()[0], reason: '개인 일정 변경', amount: p.amount, state: '신청' };
      if (p.status === '환불 완료' && !p.refund) p.refund = { at: [addDays(p.at, 3), today()].sort()[0], reason: '단순 변심', amount: p.amount, state: '승인', done: [addDays(p.at, 4), today()].sort()[0] };
      if (p.status === '환불 거절') { p.status = '결제 완료'; p.refund = { ...(p.refund || { at: p.at, amount: p.amount }), state: '거절', note: p.reason || '' }; }
    });
    S.bills.forEach(b => {
      if (!b.batch) b.batch = 'bt' + hashStr(b.title + '|' + (b.sentAt || b.due));
      if (!Array.isArray(b.to)) b.to = [{ who: b.who, parent: false }, ...S.parents.filter(p => p.child === b.who && /완료/.test(p.status || '')).map(p => ({ who: p.id, parent: true }))];
      if (!b.notify) b.notify = NOTIFY[0]; if (b.sent === undefined) b.sent = true;
      b.items = (b.items || []).map(i => Array.isArray(i) ? i : [i.name, i.amount, i.ref]);
    });
    S.books.forEach((b, bi) => {
      if (!b.dl) b.dl = { on: true, limit: 0, days: 30 };
      if (!b.discount) b.discount = { on: false, type: 'rate', v: 0 };
      if (!Array.isArray(b.authors)) b.authors = b.author ? [{ name: b.author, bio: '' }] : [];
      if (b.intro === undefined) b.intro = '';
      if (!b.req) b.req = { on: b.kind !== '전자책', q: '배송지 주소와 요청사항을 적어 주세요.', must: b.kind !== '전자책' };
      if (!Array.isArray(b.ship)) b.ship = [];
      if (!Array.isArray(b.openTo)) b.openTo = [];
      if (!Array.isArray(b.grants)) { const ms = S.members.filter(actOK).slice(bi * 3, bi * 3 + Math.min(b.sold || 0, 10));
        b.grants = ms.map((m, j) => ({ who: m.id, at: addDays(today(), -(j * 3 + 2)), pay: '', dl: b.kind === '전자책' ? (j % 3 === 0 ? 0 : 1 + j % 2) : 0, last: '' }));
        if (b.kind !== '전자책') b.ship = b.grants.map((g, j) => ({ who: g.who, done: j < Math.round((b.delivered || 0) / Math.max(1, b.sold || 1) * b.grants.length), memo: j % 2 ? '부산광역시 해운대구 ○○로 12, 문 앞에 놓아 주세요' : '수업 시간에 직접 받겠습니다' }));
        b.sold = Math.max(b.grants.length, 0); b.delivered = b.ship.filter(x => x.done).length; }
    });
    S.classes.forEach(c => {
      if (!c.enr || typeof c.enr !== 'object') c.enr = {};
      (c.learners || []).forEach(id => { if (!c.enr[id]) { const p = S.pays.find(x => x.who === id && x.ref === c.id); c.enr[id] = { at: p ? p.at : (c.start || today()), end: c.end || null, src: p ? 'pay' : 'admin', status: 'active', paid: p ? p.id : null }; } });
    });
  }
  window.sl2Ensure = sl2Ensure;

  /* ── PG 상태 ── */
  const tossOK = () => ST().pg === 'toss' && ST().toss.status === '승인';
  const tossPend = () => ['신청', '심사중'].includes(ST().toss.status);
  const niceOK = () => ST().pgInfo.status === '승인';
  /* 학습자 결제에 쓰이는 PG: 토스 승인 → 토스, 그 외 → 결제 준비 중(v23) */
  const payPG = () => tossOK() ? 'toss' : 'none'; /* v23: 토스 승인 전에는 '결제 준비 중' */
  window.sl2PayPG = payPG; window.sl2TossOK = tossOK;
  const PGN = { toss: '토스페이먼츠', nice: '디디쌤 연결 PG(나이스페이먼츠)', none: '미연결' };

  /* ── 가격(할인 · 얼리버드) — 학습자 화면도 같은 규칙 ── */
  const finalPrice = x => { let p = +x.price || 0; const d = x.discount; if (d && d.on && (!d.until || today() <= d.until)) p -= d.type === 'amount' ? (+d.v || 0) : Math.round(p * (+d.v || 0) / 100); const e = x.recruit && x.recruit.early; if (e && e.on && (!e.until || today() <= e.until)) p -= Math.round(p * (+e.rate || 0) / 100); return Math.max(0, Math.round(p)); };

  /* ── 수강 권한 · 교재 권한 ── */
  function clsEnd(c, from) { const P = c.period; if (P && P.mode === 'days') return addDays(from, +P.days || 90); if (P && P.mode === 'range') return P.end || c.end || null; return c.end || null; }
  function enrollGrant(c, mid, src, payId, end) {
    if (!c || !mid) return; c.learners = c.learners || []; c.prog = c.prog || {}; c.enr = c.enr || {};
    if (!c.learners.includes(mid)) c.learners.push(mid);
    if (!c.prog[mid]) c.prog[mid] = { p: 0, exam: null, assign: 'none', att: 0 };
    c.enr[mid] = { ...(c.enr[mid] || {}), at: today(), end: end || clsEnd(c, today()), src, status: 'active', paid: payId || null }; delete c.enr[mid].hold;
  }
  function enrollHold(c, mid, on) { if (!c || !c.enr || !c.enr[mid]) return; const e = c.enr[mid]; if (on) { e.status = 'excluded'; e.hold = true; c.learners = (c.learners || []).filter(x => x !== mid); } else { e.status = 'active'; delete e.hold; if (!c.learners.includes(mid)) c.learners.push(mid); } }
  function enrollRevoke(c, mid) { if (!c) return; c.learners = (c.learners || []).filter(x => x !== mid); if (c.enr && c.enr[mid]) { c.enr[mid].status = 'excluded'; delete c.enr[mid].hold; } }
  function bookGrant(b, mid, payId, ship) {
    if (!b || !mid) return; b.grants = b.grants || []; let g = b.grants.find(x => x.who === mid);
    if (!g) { g = { who: mid, at: today(), pay: payId || '', dl: 0, last: '' }; b.grants.push(g); } else { g.at = today(); g.pay = payId || g.pay; g.off = false; }
    if (b.kind !== '전자책') { b.ship = b.ship || []; const s = b.ship.find(x => x.who === mid); if (s) { if (ship) s.memo = ship; } else b.ship.push({ who: mid, done: false, memo: ship || '' }); }
    b.sold = b.grants.filter(x => !x.off).length; b.delivered = (b.ship || []).filter(x => x.done).length;
  }
  function bookRevoke(b, mid) { if (!b) return; const g = (b.grants || []).find(x => x.who === mid); if (g) g.off = true; b.ship = (b.ship || []).filter(x => x.who !== mid || x.done); b.sold = (b.grants || []).filter(x => !x.off).length; }
  const dlUntil = (b, g) => addDays(g.at, (b.dl && +b.dl.days) || 30);
  window.sl2EnrollGrant = enrollGrant; window.sl2BookGrant = bookGrant;

  function grantFor(p, on) { /* on: true 부여 · 'hold' 보류 · 'restore' 복구 · false 회수 */
    const c = p.itemType === 'class' || p.itemType === 'sub' ? C(p.ref) : null; const b = p.itemType === 'book' ? S.books.find(x => x.id === p.ref) : null;
    if (on === true) { if (c && p.itemType === 'class') enrollGrant(c, p.who, 'pay', p.id); if (b) bookGrant(b, p.who, p.id, p.ship); }
    else if (on === 'hold') { if (c) enrollHold(c, p.who, true); if (b) { const g = (b.grants || []).find(x => x.who === p.who); if (g) g.hold = true; } }
    else if (on === 'restore') { if (c) enrollHold(c, p.who, false); if (b) { const g = (b.grants || []).find(x => x.who === p.who); if (g) delete g.hold; } }
    else { if (c) enrollRevoke(c, p.who); if (b) bookRevoke(b, p.who); if (p.itemType === 'sub') { const s = S.subs.find(x => x.pay === p.id || (x.cls === p.ref && x.who === p.who)); if (s) { s.status = '해지'; s.end = today(); } } }
  }

  /* ── 공용 표시 ── */
  const ITN = { class: 'Class', book: '교재', bill: '청구서', sub: '구독' };
  const itTag = p => tag(p.itemType === 'class' ? t('cls') : ITN[p.itemType] || '기타', p.itemType === 'book' ? 'b' : p.itemType === 'sub' ? 'y' : '');
  const stTone = s => s === '결제 완료' || s === '납부 완료' ? 'g' : s === '환불 신청' || s === '결제 대기' ? 'y' : s === '미납' ? 'r' : '';
  const rfState = p => p.refund ? (p.refund.state === '신청' ? '환불 요청' : p.refund.state === '승인' ? (p.status === '부분 환불' ? '부분 환불' : '환불 완료') : p.refund.state === '거절' ? '환불 거절' : p.refund.state) : '';

  /* ── ACT.pg 충돌 수정 ──
     kit.js(진도 규칙 화면)가 ACT.pg를 진도 설정 처리기로 다시 정의해 mods.js의 PG 선택이 막혀 있었다.
     data-chg="pg" + data-k(진도 규칙)는 kit.js 처리기로, data-v(토스 · 나이스 카드)는 PG 선택으로 보낸다. */
  const kitPg = ACT.pg;
  ACT.pg = (el, e) => { if (el && el.dataset && el.dataset.k !== undefined && kitPg) return kitPg(el, e); return pgSelect(el); };
  ACT['pg-sel'] = el => pgSelect(el);
  function pgSelect(el) { sl2Ensure(); const v = el.dataset.v;
    if (v === 'toss') { if (ST().toss.status === '승인') { ST().pg = 'toss'; logAudit('PG 변경 — 토스페이먼츠'); save(); render(); toast('토스페이먼츠 PG를 사용합니다.', 'ok'); } else tossFlow(); return; }
    if (v === 'nice') { tossFlow(); return; }
    if (v === 'none') { ST().pg = 'none'; save(); render(); }
  }

  /* ── 디디쌤 연결 PG: 정산정보 입력/설정 ── */
  function pgInfoForm(join) { sl2Ensure(); const I = ST().pgInfo; const k = I.kind || 'biz';
    const doc = (kk, label, acc) => { const d = (I.docs || []).find(x => x.k === kk); return `<label class="fl">${label}${d ? ` <small class="mini">등록됨: ${esc(d.name)}</small>` : ''}<input type="file" name="f_${kk}" accept="${acc}"></label>`; };
    const w = modal(join ? '디디쌤 연결 PG 가입 — 정산정보 입력' : '정산정보 설정', `<p class="mini">수익이 생기면 디디쌤이 아래 계좌로 정산합니다(최대 1개월). 디디쌤 연결 PG는 청구서 · 구독 · 부분 환불을 쓸 수 없습니다.</p>
      <div class="seg2" role="tablist"><button type="button" class="${k === 'biz' ? 'on' : ''}" data-pik="biz">사업자</button><button type="button" class="${k === 'person' ? 'on' : ''}" data-pik="person">개인(사업자등록번호 없음)</button></div><input type="hidden" name="kind" value="${k}">
      <div class="sl2-pik" data-k="biz" ${k === 'biz' ? '' : 'hidden'}><div class="form2"><label>사업자등록번호<input name="bizNo" inputmode="numeric" maxlength="12" placeholder="000-00-00000" value="${esc(I.bizNo)}"></label><label>회사명<input name="name" maxlength="40" value="${esc(I.kind === 'biz' ? I.name : '')}"></label><label>대표자명<input name="ceo" maxlength="20" value="${esc(I.ceo)}"></label><label>사업장 소재지<input name="addr" maxlength="80" value="${esc(I.kind === 'biz' ? I.addr : '')}"></label></div>${doc('biz', '사업자등록증(PDF · 이미지, 10MB 이하)', '.pdf,image/*')}<p class="mini">법인사업자는 예금주가 사업자등록증의 법인 명의와 같아야 합니다.</p></div>
      <div class="sl2-pik" data-k="person" ${k === 'person' ? '' : 'hidden'}><div class="form2"><label>실명<input name="pname" maxlength="20" value="${esc(I.kind === 'person' ? I.name : '')}"></label><label>주민등록번호<input name="rrn" inputmode="numeric" maxlength="14" placeholder="000000-0000000" autocomplete="off"></label><label style="grid-column:1/-1">사업 주소지<input name="paddr" maxlength="80" value="${esc(I.kind === 'person' ? I.addr : '')}"></label></div><p class="mini">휴대폰 번호와 이메일은 가입 정보로 자동 등록됩니다. 주민등록번호는 화면에 다시 보여 주지 않습니다${I.rrn ? `(등록됨: ${esc(I.rrn)})` : ''}. <!-- 운영: 서버에서 암호화 저장, 데모는 앞 6자리만 --></p></div>
      <h4 class="sl2-h">정산 계좌</h4><div class="form2"><label>은행<select name="bank"><option value="">선택</option>${BANKS.map(b => `<option ${I.bank === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label><label>예금주<input name="holder" maxlength="30" value="${esc(I.holder)}"></label><label style="grid-column:1/-1">계좌번호(- 없이 숫자만)<input name="account" inputmode="numeric" maxlength="20" value="${esc(I.account)}"></label></div>${doc('bank', '통장 사본(PDF · 이미지, 10MB 이하)', '.pdf,image/*')}
      ${I.status === '반려' ? `<div class="warn">반려 사유: ${esc(I.reason || '')}</div>` : ''}`, [{ id: 'c', label: '취소' }, { id: 'ok', label: join ? '가입 신청' : '저장', kind: 'pri', run: w2 => {
      const kind = fv(w2, 'kind'); const g = n => fv(w2, n); const err = m => { toast(m, 'warn'); return false; };
      const acc = g('account'); if (!g('bank')) return err('은행을 선택하세요.'); if (!g('holder')) return err('예금주를 입력하세요.'); if (!/^\d{8,16}$/.test(acc)) return err('계좌번호는 - 없이 숫자 8~16자리로 입력하세요.');
      const files = {}; for (const kk of ['biz', 'bank']) { const f = w2.querySelector(`[name=f_${kk}]`); const x = f && f.files && f.files[0]; if (x) { if (x.size > 10 * 1024 * 1024) return err('파일은 10MB 이하만 올릴 수 있습니다.'); if (!/(\.pdf|\.png|\.jpe?g|\.gif|\.webp)$/i.test(x.name)) return err('PDF 또는 이미지 파일만 올릴 수 있습니다.'); files[kk] = { name: x.name, size: x.size, k: kk, at: today() }; } }
      const has = kk => files[kk] || (I.docs || []).some(d => d.k === kk);
      if (!has('bank')) return err('통장 사본을 등록하세요.');
      const nx = { kind };
      if (kind === 'biz') { const bn = g('bizNo').replace(/\D/g, ''); if (bn.length !== 10) return err('사업자등록번호 10자리를 입력하세요.'); if (!g('name') || !g('ceo') || !g('addr')) return err('회사명 · 대표자명 · 사업장 소재지를 입력하세요.'); if (!has('biz')) return err('사업자등록증을 올리세요.');
        if (/(주식회사|\(주\)|㈜|법인)/.test(g('name')) && g('holder').replace(/\s|\(주\)|㈜|주식회사/g, '') !== g('name').replace(/\s|\(주\)|㈜|주식회사/g, '')) return err('법인사업자는 예금주가 사업자등록증의 법인 명의와 같아야 합니다.');
        Object.assign(nx, { bizNo: bn.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3'), name: g('name'), ceo: g('ceo'), addr: g('addr') }); }
      else { const r = g('rrn').replace(/\D/g, ''); if (!g('pname') || !g('paddr')) return err('실명과 사업 주소지를 입력하세요.'); if (r.length !== 13 && !I.rrn) return err('주민등록번호 13자리를 입력하세요.'); Object.assign(nx, { name: g('pname'), addr: g('paddr'), rrn: r.length === 13 ? r.slice(0, 6) + '-*******' : I.rrn }); }
      const docs = [...(I.docs || []).filter(d => !files[d.k]), ...Object.values(files)];
      Object.assign(I, nx, { bank: g('bank'), holder: g('holder'), account: acc, docs, status: '승인', reason: '', at: today() });
      /* 운영: POST /api/pg/nice/settlement — 디디쌤 정산 담당 확인 후 상태 갱신 */
      if (join || ST().pg === 'none') ST().pg = ST().toss.status === '승인' && ST().pg === 'toss' ? 'toss' : 'nice';
      logAudit(join ? '디디쌤 연결 PG 가입(정산정보 입력)' : '정산정보 수정'); save(); render(); toast(join ? '정산정보를 등록했습니다. 이제 유료 클래스 · 교재를 판매할 수 있습니다.' : '정산 계좌 정보를 수정했습니다.', 'ok'); } }], true);
    w.querySelectorAll('[data-pik]').forEach(b => b.addEventListener('click', () => { w.querySelector('[name=kind]').value = b.dataset.pik; w.querySelectorAll('[data-pik]').forEach(x => x.classList.toggle('on', x === b)); w.querySelectorAll('.sl2-pik').forEach(p => { p.hidden = p.dataset.k !== b.dataset.pik; }); }));
  }
  ACT['sl2-pginfo'] = () => tossFlow(); /* v23: 디디쌤 연결 PG 정산정보 입력 폐지 */

  /* ── 토스페이먼츠 PG 가입 흐름 ── */
  const footOK = () => { const f = ST().footer || {}; const miss = [['company', '상호명'], ['ceo', '대표자명'], ['biz', '사업자등록번호'], ['addr', '사업장 주소'], ['tel', '유선번호'], ['reg', '통신판매업 신고번호']].filter(([k]) => !String(f[k] || '').trim()).map(x => x[1]);
    const tel = String(f.tel || '').replace(/\D/g, ''); const telOK = !tel || /^(070|0505|080|01[016789]|15\d{2}|16\d{2}|18\d{2}|02|0[3-6]\d)\d{3,8}$/.test(tel); return { miss, telOK }; };
  function tossFlow() { sl2Ensure(); const T2 = ST().toss;
    if (T2.status === '미가입' || T2.status === '반려') return tossIntro();
    if (T2.status === '신청') return tossMid();
    go('sales');
  }
  function tossIntro() { const T2 = ST().toss; const fo = footOK();
    modal('토스페이먼츠 PG 가입', `<p>토스페이먼츠에 가입하면 수익일 기준 2~3일 안에 직접 정산받고, 청구서 · 구독 클래스 · 부분 환불을 쓸 수 있습니다. 온보딩은 최대 ${T2.weeks || 4}주 걸립니다. 심사 기간에도 유료 ${esc(t('cls'))} · 교재를 미리 만들어 둘 수 있으며, 승인 즉시 결제가 열립니다.</p>
      ${T2.status === '반려' ? `<div class="warn">이전 신청이 반려되었습니다: ${esc(T2.reason || '사유 미기재')}. 내용을 고쳐 다시 신청하세요.</div>` : ''}
      <h4 class="sl2-h">신청에 필요한 것</h4><div class="chk one">${['사업자등록번호(없으면 토스 화면에서 [바로신청])', '대표자명 · 상호명', '휴대폰 번호 · 이메일 주소', '신청자 추가 정보(영문 이름 · 거주지 주소 · 직무)', '위임장(대리인이 신청하는 경우)', '기타 추가 서류(별도 요청 시)'].map(x => `<label><input type="checkbox"> ${esc(x)}</label>`).join('')}</div>
      <h4 class="sl2-h">홈페이지 푸터 필수 정보 ${fo.miss.length ? tag(fo.miss.length + '개 누락', 'r') : tag('완료', 'g')}</h4><p class="mini">${fo.miss.length ? `누락: ${esc(fo.miss.join(' · '))} — 누락되면 카드사 심사가 거절될 수 있습니다. ` : ''}${fo.telOK ? '' : '유선번호 형식(070 · 0505 · 대표번호 · 080 · 휴대폰)을 확인하세요. '}통신판매업 신고번호가 없으면 국민카드 심사가 제외됩니다(간이과세자 · 비영리 · 공공기관 · 직전연도 거래 50건 미만은 신고 면제). 신고가 필요하면 토스페이먼츠의 '통신판매업 바로 신청'(구매안전서비스 확인증 → 정부24, 등록면허세 12,000~45,000원)을 이용하세요. <a href="#" data-act="go" data-v="settings">설정 › 푸터 입력</a></p>`,
      [{ id: 'c', label: '닫기' }, { id: 'ok', label: '가입하기', kind: 'pri', run: () => { setTimeout(tossForm, 0); } }]);
  }
  function tossForm() { const T2 = ST().toss; const I = ST().pgInfo;
    modal('토스페이먼츠 PG 가입 — 기본 정보', `<div class="form2"><label>사업자등록번호<input name="bizNo" inputmode="numeric" maxlength="12" value="${esc(T2.bizNo || I.bizNo || ST().footer?.biz || '')}"></label><label>대표자명<input name="ceo" maxlength="20" value="${esc(T2.ceo || I.ceo || ST().footer?.ceo || '')}"></label><label>상호명<input name="store" maxlength="40" value="${esc(T2.store || ST().footer?.company || S.org.name)}"></label><label>휴대폰 번호<input name="phone" inputmode="tel" maxlength="13" value="${esc(T2.phone || '')}"></label><label style="grid-column:1/-1">이메일(토스 담당자가 서류를 안내합니다)<input name="email" type="email" maxlength="60" value="${esc(T2.email || '')}"></label></div>
      <label class="ckl"><input type="checkbox" name="noBiz"> 사업자등록번호가 아직 없습니다(토스 화면에서 [바로신청]으로 함께 신청)</label>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가 정보 입력(토스 화면)', kind: 'pri', run: w => { const g = n => fv(w, n); const bn = g('bizNo').replace(/\D/g, '');
        if (!g('noBiz') && bn.length !== 10) { toast('사업자등록번호 10자리를 입력하세요.', 'warn'); return false; }
        if (!g('ceo') || !g('store')) { toast('대표자명과 상호명을 입력하세요.', 'warn'); return false; }
        if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(g('phone'))) { toast('휴대폰 번호를 확인하세요.', 'warn'); return false; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g('email'))) { toast('이메일을 확인하세요.', 'warn'); return false; }
        Object.assign(T2, { bizNo: bn ? bn.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : '', noBiz: !!g('noBiz'), ceo: g('ceo'), store: g('store'), phone: g('phone'), email: g('email') });
        save(); setTimeout(tossOutside, 0); } }]);
  }
  function tossOutside() { const T2 = ST().toss; const home = (S.org.domain ? 'https://' + S.org.domain : location.origin);
    const steps = ['본인인증(연락처로 받은 인증번호 입력)', '신청자의 대표자 여부 선택(대리인은 위임장 양식 내려받아 작성)', `홈페이지 구축 방법 '호스팅사 이용' → 다른 업체 검색 → '주식회사 산타' 선택`, '홈페이지 주소 입력', '결제 서비스 선택(신용카드 · 계좌이체 · 간편결제 · 가상계좌)', '입금받을 계좌 입력', "온라인 플랫폼 사업자 여부 '아니오'", '판매 유형(클래스 · 교재 등) 내용 입력', '위임장 · 추가 서류 첨부 후 [신청서 작성완료] → 상점 ID 발급'];
    const w = modal('토스페이먼츠 화면에서 할 일', `<p class="mini">실제 운영에서는 토스페이먼츠 가입 화면이 새 창으로 열립니다. <!-- 운영: window.open(토스 온보딩 URL + 호스팅사 코드) --> 데모에서는 아래 순서를 확인하고 체크합니다.</p>
      <div class="sl2-copy"><span>내 홈페이지 주소</span><code>${esc(home)}</code><button class="btn sm" type="button" data-cp="${esc(home)}">복사</button></div><div class="sl2-copy"><span>호스팅사</span><code>주식회사 산타</code><button class="btn sm" type="button" data-cp="주식회사 산타">복사</button></div>
      <ol class="sl2-ol">${steps.map((s, i) => `<li><label class="ckl"><input type="checkbox" name="s${i}" ${T2.checks && T2.checks['s' + i] ? 'checked' : ''}> ${esc(s)}</label></li>`).join('')}</ol>`,
      [{ id: 'c', label: '나중에' }, { id: 'ok', label: '신청 완료 — 상점 ID 입력', kind: 'pri', run: w2 => { T2.checks = Object.fromEntries(steps.map((_, i) => ['s' + i, !!fv(w2, 's' + i)])); const n = Object.values(T2.checks).filter(Boolean).length; if (n < steps.length) { toast(`토스 화면 ${steps.length - n}단계가 남았습니다. 모두 마친 뒤 진행하세요.`, 'warn'); save(); return false; }
        T2.status = '신청'; T2.at = today(); T2.reason = ''; if (ST().pg === 'none') ST().pg = 'toss'; tossTempClass(); logAudit('토스페이먼츠 PG 가입 신청'); save(); render(); setTimeout(tossMid, 0); } }], true);
    w.querySelectorAll('[data-cp]').forEach(b => b.addEventListener('click', () => { try { navigator.clipboard.writeText(b.dataset.cp); } catch (e) { } toast('복사했습니다.', 'ok'); }));
  }
  function tossMid() { const T2 = ST().toss;
    modal('토스 상점 ID 등록', `<p class="mini">토스페이먼츠 신청이 끝나면 발급되는 상점 ID(MID)를 입력하세요. 등록하면 심사(2~${T2.weeks || 4}주)가 시작되며, 승인되면 학습자 결제가 바로 열립니다.</p><label class="fl">토스 상점 ID<input name="mid" maxlength="40" placeholder="예: didisam_abc123" value="${esc(T2.mid || '')}"></label>`,
      [{ id: 'c', label: '나중에' }, { id: 'ok', label: '등록하기', kind: 'pri', run: w => { const mid = fv(w, 'mid'); if (!/^[A-Za-z0-9_-]{4,40}$/.test(mid)) { toast('상점 ID는 영문 · 숫자 · _ · - 4~40자입니다.', 'warn'); return false; }
        Object.assign(T2, { mid, status: '심사중', stage: 0, reqAt: today() }); ST().pgInfo.tossMid = mid; ST().pg = 'toss'; logAudit('토스 상점 ID 등록 — 심사 시작'); save(); render(); toast('상점 ID를 등록했습니다. 심사 결과는 담당자가 연락드립니다.', 'ok'); } }]);
  }
  function tossTempClass() { if (S.classes.some(c => c.tossTemp)) return;
    S.classes.push({ id: uid('c'), name: '[토스 심사용] 결제 확인 클래스', kind: 'period', sub: '', legal: false, level: 0, status: '운영중', price: 1000, open: '전체', openTo: [], start: today(), end: addDays(today(), 60), teacher: '', group: '', learners: [], prog: {}, enr: {}, curriculum: [], criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, cert: 'manual', skip: false, speed: true, early: false, community: 'class', hours: 1, notices: [], desc: '토스페이먼츠 심사에서 결제 환경을 확인하는 임시 클래스입니다. 심사가 끝날 때까지 수정 · 삭제하지 마세요.', tossTemp: true });
  }
  ACT['sl2-toss'] = () => tossFlow();
  ACT['sl2-toss-mid'] = () => tossMid();
  ACT['sl2-toss-check'] = () => { const T2 = ST().toss; /* 운영: GET /api/pg/toss/status?mid= */ if (T2.status !== '심사중') return; T2.stage = Math.min(TOSS_STAGES.length - 1, (T2.stage || 0) + 1); T2.checkAt = today(); save(); render(); toast(`진행 상황: ${TOSS_STAGES[T2.stage]} 단계입니다.`, 'ok'); };
  ACT['sl2-toss-ok'] = () => { const T2 = ST().toss; Object.assign(T2, { status: '승인', stage: TOSS_STAGES.length, done: today() }); ST().pg = 'toss'; S.classes.forEach(c => { if (c.tossTemp) { c.tossTemp = false; c.status = '종료'; } }); logAudit('토스페이먼츠 온보딩 완료(디디쌤 승인)'); save(); render(); toast('토스 온보딩이 완료되었습니다. 청구서 · 구독 · 부분 환불을 쓸 수 있습니다.', 'ok'); };
  ACT['sl2-toss-no'] = () => modal('토스 심사 반려(데모)', `<label class="fl">반려 사유<textarea name="r" rows="3">푸터에 통신판매업 신고번호가 없습니다.</textarea></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '반려 처리', kind: 'red', run: w => { const T2 = ST().toss; T2.status = '반려'; T2.reason = fv(w, 'r') || '사유 미기재'; logAudit('토스 심사 반려'); save(); render(); } }]);
  ACT['sl2-toss-back'] = () => { if (!confirm('PG 선택 화면으로 돌아갑니다. 토스 신청 정보는 남겨 둡니다.')) return; ST().pg = 'none'; save(); render(); };

  /* 심사 중: 임시 클래스 수정 · 삭제 금지, 푸터 변경 금지 */
  const lockMsg = '토스페이먼츠 심사 중에는 심사용 임시 클래스와 푸터 사업자 정보를 바꿀 수 없습니다.';
  { const b = ACT['cls-del']; if (b) ACT['cls-del'] = (el, e) => { const c = C(el.dataset.v || el.dataset.c); if (c && c.tossTemp && tossPend()) { toast(lockMsg, 'warn'); return; } return b(el, e); }; }
  { const b = ACT['cls-set']; if (b) ACT['cls-set'] = (el, e) => { const c = C(el.dataset.c); if (c && c.tossTemp && tossPend()) { toast(lockMsg, 'warn'); if (el.type === 'checkbox') el.checked = !el.checked; else if (c[el.dataset.k] !== undefined) el.value = c[el.dataset.k]; return; } return b(el, e); }; }
  { const b = ACT.footer; if (b) ACT.footer = (el, e) => { if (tossPend()) { toast(lockMsg, 'warn'); el.value = (ST().footer || {})[el.dataset.k] || ''; return; } return b(el, e); }; }

  /* ── 매출 관리 화면 ── */
  const revenue = () => { const P = S.pays.filter(p => ['결제 완료', '부분 환불', '환불 완료', '환불 신청'].includes(p.status)); const R = S.pays.filter(p => p.refund && p.refund.state === '승인');
    const billsOff = S.bills.filter(b => b.status === '현장 납부'); return { gross: sum(P, p => p.amount) + sum(billsOff, b => sum(b.items, i => i[1])), refund: sum(R, p => p.refund.amount), P, R }; };
  function pgPanel() { const st = ST(); const T2 = st.toss; const I = st.pgInfo; const pg = st.pg;
    const card = (k, n, a, b, stt) => `<button class="card pgc ${pg === k ? 'on' : ''}" data-act="pg-sel" data-v="${k}" aria-pressed="${pg === k}"><b>${n}</b><span>${a}</span><small>${b}</small><span class="sl2-st">${stt}</span></button>`;
    const tSt = T2.status === '승인' ? tag('승인 · 사용 가능', 'g') : T2.status === '심사중' ? tag('심사중', 'y') : T2.status === '신청' ? tag('신청 · 상점 ID 대기', 'y') : T2.status === '반려' ? tag('반려', 'r') : tag('미가입');
    const nSt = I.status === '승인' ? tag('정산정보 등록', 'g') : I.status === '반려' ? tag('반려', 'r') : tag('정산정보 미등록');
    let out = `<div class="grid">${card('toss', '토스페이먼츠', '직접 계약 · 수익일 기준 2~3일 정산 · 청구서 · 구독 · 부분 환불', `온보딩 최대 ${T2.weeks || 4}주 · 상점 ID 등록 · 푸터 사업자 정보 6종 필수`, tSt + (pg === 'toss' && T2.status === '승인' ? ' ' + tag('사용 중', 'g') : ''))}</div>`;
    if (pg === 'toss' && tossPend()) {
      const eta = T2.reqAt ? addDays(T2.reqAt, (T2.weeks || 4) * 7) : '';
      out += `<div class="card sl2-tst"><div class="ch"><b>토스페이먼츠 심사 진행</b>${tSt}${T2.mid ? `<small>상점 ID ${esc(T2.mid)}</small>` : ''}</div>
        <ol class="sl2-step">${TOSS_STAGES.map((s, i) => `<li class="${T2.status === '심사중' && i < (T2.stage || 0) ? 'done' : T2.status === '심사중' && i === (T2.stage || 0) ? 'cur' : ''}">${esc(s)}</li>`).join('')}</ol>
        <div class="warn">심사 중 제한: 유료 ${esc(t('cls'))} · 교재는 만들 수 있지만 결제는 <b>승인 후 열립니다</b>(학습자 화면에는 '결제 준비 중'으로 표시). 청구서 발송 · 구독 판매 · 부분 환불은 승인 후 쓸 수 있습니다. 심사용 임시 ${esc(tj('cls', '과'))} 홈페이지 푸터 사업자 정보는 수정 · 삭제하지 마세요.${eta ? ` 예상 완료: ${eta} 이전.` : ''}</div>
        <div class="sl2-row">${T2.status === '신청' ? '<button class="btn pri" data-act="sl2-toss-mid">상점 ID 등록하기</button>' : '<button class="btn" data-act="sl2-toss-check">조회하기</button>'}<button class="btn ghost" data-act="sl2-toss-back">PG 선택 화면으로</button><span class="sl2-demo">데모: <button class="btn sm" data-act="sl2-toss-ok">승인 처리</button><button class="btn sm ghost" data-act="sl2-toss-no">반려 처리</button></span></div></div>`;
    } else if (T2.status === '반려') out += `<div class="warn">토스 심사 반려: ${esc(T2.reason || '')} <button class="btn sm" data-act="sl2-toss">다시 신청</button></div>`;
    if (payPG() === 'none') out += `<div class="warn">아직 결제를 받을 PG가 없습니다. 유료 ${esc(t('cls'))} · 교재는 학습자 화면에서 '결제 준비 중'으로 보입니다.</div>`;
    out += `<p class="mini sl2-fee">결제 수수료: PG사 수수료만 부과되며 디디쌤 수수료는 없습니다. PG 수수료는 매출 구간 등에 따라 차등될 수 있습니다 — 채널톡으로 문의하세요. 결제 수단: 신용카드 · 계좌이체 · 간편결제 · 가상계좌${tossOK() ? ' · 해외카드(VISA · Master)' : ''}.</p>`;
    return out;
  }
  function statsView() { const { R } = revenue(); const P = S.pays.filter(p => p.status !== '취소' && p.status !== '결제 대기'); const B = S.bills.filter(b => b.status !== '미납');
    const now = new Date(); const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); });
    const mon = k => ({ k, s: sum(P.filter(p => String(p.at).slice(0, 7) === k && p.itemType !== 'bill'), p => p.amount) + sum(B.filter(b => String(b.payAt || b.due).slice(0, 7) === k), b => sum(b.items, i => i[1])), r: sum(R.filter(p => String(p.refund.done || p.refund.at).slice(0, 7) === k), p => p.refund.amount) });
    const M2 = months.map(mon); const mx = Math.max(1, ...M2.map(x => x.s));
    const years = [...new Set([...P.map(p => String(p.at).slice(0, 4)), ...B.map(b => String(b.payAt || b.due).slice(0, 4))])].filter(Boolean).sort().reverse();
    const Y = years.map(y => ({ y, s: sum(P.filter(p => String(p.at).startsWith(y) && p.itemType !== 'bill'), p => p.amount) + sum(B.filter(b => String(b.payAt || b.due).startsWith(y)), b => sum(b.items, i => i[1])), r: sum(R.filter(p => String(p.refund.done || p.refund.at).startsWith(y)), p => p.refund.amount) }));
    return `<div class="card"><div class="ch"><b>월별 매출 · 환불(최근 12개월)</b><small>막대 = 매출, 붉은 선 = 환불</small></div><div class="sl2-bars" role="img" aria-label="월별 매출 막대 그래프">${M2.map(x => `<div title="${x.k} 매출 ${won(x.s)} · 환불 ${won(x.r)}"><i style="height:${Math.round(x.s / mx * 100)}%"></i>${x.r ? `<em style="height:${Math.max(2, Math.round(x.r / mx * 100))}%"></em>` : ''}<small>${x.k.slice(5)}월</small></div>`).join('')}</div></div>` +
      table(['월', '매출', '환불', '순매출'], M2.slice().reverse().filter(x => x.s || x.r).map(x => [x.k, won(x.s), won(x.r), `<b>${won(x.s - x.r)}</b>`]), '최근 12개월 매출이 없습니다.') +
      `<h4 class="sl2-h">연도별</h4>` + table(['연도', '매출', '환불', '순매출'], Y.map(x => [x.y + '년', won(x.s), won(x.r), `<b>${won(x.s - x.r)}</b>`]), '매출이 없습니다.');
  }
  VIEWS.sales = () => { sl2Ensure(); const tb = UI.slTab || 'pay'; const { gross, refund } = revenue(); const q = (UI.slQ || '').trim(); const ty = UI.slTy || '';
    const reqs = S.pays.filter(p => p.refund && p.refund.state === '신청');
    const filt = L => L.filter(p => (!ty || p.itemType === ty) && (!q || [p.item, M(p.who)?.name, p.method, p.status].join(' ').includes(q)));
    let body = '';
    if (tb === 'pay') { const L = filt(S.pays.filter(p => p.itemType !== 'bill'));
      body = `<div class="sl2-bar"><input type="search" placeholder="결제자 · 항목 · 상태 검색" value="${esc(q)}" data-chg="sl2-q" aria-label="결제 내역 검색"><select data-chg="sl2-ty" aria-label="유형"><option value="">전체 유형</option>${[['class', t('cls')], ['book', '교재/교구'], ['sub', '구독']].map(([k, l]) => `<option value="${k}" ${ty === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${S.subs.length ? `<button class="btn sm" data-act="sl2-subrun" title="정기 결제일이 된 구독을 결제합니다">정기 결제 실행(데모)</button>` : ''}</div>` +
        table(['결제일', '결제자', '유형', '항목', '금액', '수단', '상태', ''], L.slice(0, 80).map(p => [p.at + (p.refund && p.refund.at ? `<br><small class="mini">환불 신청 ${esc(p.refund.at)}</small>` : ''), mn(p.who), itTag(p), esc(p.item), won(p.amount), esc(p.method || ''), tag(p.refund ? rfState(p) : p.status, p.refund && p.refund.state === '신청' ? 'y' : stTone(p.status)), (p.refund && p.refund.state === '신청' ? `<button class="btn sm" data-act="rf" data-v="${p.id}" data-ok="1">승인</button><button class="btn sm ghost" data-act="rf" data-v="${p.id}">거절</button>` : '') + `<button class="btn sm ghost" data-act="sl2-payd" data-v="${p.id}">상세</button>`]), '결제 내역이 없습니다.');
    } else if (tb === 'refund') { const L = filt(S.pays.filter(p => p.refund)).sort((a, b) => (b.refund.state === '신청') - (a.refund.state === '신청') || String(b.refund.at).localeCompare(String(a.refund.at)));
      body = table(['신청일', '결제자', '항목', '결제액', '환불액', '사유', '상태', ''], L.map(p => [esc(p.refund.at), mn(p.who), esc(p.item), won(p.amount), p.refund.state === '승인' ? won(p.refund.amount) : '—', esc(p.refund.reason || '') + (p.refund.note ? `<br><small class="mini">거절 사유: ${esc(p.refund.note)}</small>` : ''), tag(rfState(p), p.refund.state === '신청' ? 'y' : p.refund.state === '거절' ? 'r' : 'g'), p.refund.state === '신청' ? `<button class="btn sm" data-act="rf" data-v="${p.id}" data-ok="1">승인</button><button class="btn sm ghost" data-act="rf" data-v="${p.id}">거절</button>` : '']), '환불 내역이 없습니다.') + `<p class="mini">환불은 ${esc(t('learner'))}의 신청 후 운영자가 승인해야 완료됩니다. 거절할 때는 사유를 꼭 입력하세요. 거절한 건은 다시 환불하기 어렵습니다. 토스페이먼츠는 부분 환불이 가능합니다.</p>`;
    } else if (tb === 'bill') body = billBody(true);
    else body = statsView();
    return head('매출 관리', `PG 선택 · 결제/환불 내역 · 청구서 납부 내역 · 월별/연도별 통계 ${guideRef('features/sales.md')}`, `<button class="btn" data-act="sales-xls">내려받기</button>`) + pgPanel() +
      `<section class="grid g3">${kpi('총 매출', won(gross), '결제 + 청구서 현장 납부', 'g')}${kpi('환불액', won(refund), S.pays.filter(p => p.refund && p.refund.state === '승인').length + '건', 'r')}${kpi('환불 요청', reqs.length + '건', reqs.length ? '승인 또는 거절이 필요합니다' : '', reqs.length ? 'y' : '')}</section>` +
      tabs('slTab', [['pay', '결제 내역'], ['refund', `환불 내역${reqs.length ? ` (${reqs.length})` : ''}`], ['bill', '청구서 납부 내역'], ['stat', '월별 · 연도별 통계']], tb) + body +
      `<div class="card sl2-tj"><div><b>토스페이먼츠 PG 가입</b><small>${ST().toss.status === '승인' ? `가입 완료 · 상점 ID ${esc(ST().toss.mid)}` : `온보딩 최대 ${ST().toss.weeks || 4}주 · 청구서 · 구독 · 부분 환불을 쓰려면 필요합니다.`}</small></div>${ST().toss.status === '승인' ? tag('승인', 'g') : `<button class="btn" data-act="sl2-toss">토스페이먼츠 PG 가입</button>`}</div>`;
  };
  ACT['sl2-q'] = el => { UI.slQ = el.value; render(); };
  ACT['sl2-ty'] = el => { UI.slTy = el.value; render(); };
  ACT['sales-xls'] = () => { sl2Ensure(); downloadCSV(`매출_${today()}.csv`, ['결제일', '결제자', '유형', '항목', '금액', '수단', '상태', '환불 신청일', '환불액', '환불 사유'], S.pays.map(p => [p.at, M(p.who)?.name, ITN[p.itemType] || '', p.item, p.amount, p.method, p.refund ? rfState(p) : p.status, p.refund?.at || '', p.refund?.state === '승인' ? p.refund.amount : '', p.refund?.reason || ''])); };
  ACT['sl2-payd'] = el => { const p = S.pays.find(x => x.id === el.dataset.v); if (!p) return;
    modal('결제 상세', `<dl class="sl2-dl"><dt>결제자</dt><dd>${mn(p.who)}</dd><dt>항목</dt><dd>${itTag(p)} ${esc(p.item)}</dd><dt>금액</dt><dd>${won(p.amount)}</dd><dt>결제 일시</dt><dd>${esc(p.at)}</dd><dt>결제 수단</dt><dd>${esc(p.method || '')}${p.pg ? ` · ${esc(PGN[p.pg] || p.pg)}` : ''}</dd><dt>상태</dt><dd>${tag(p.refund ? rfState(p) : p.status, stTone(p.status))}</dd>${p.vacct ? `<dt>가상계좌</dt><dd>${esc(p.vacct.bank)} ${esc(p.vacct.no)} · 입금 기한 ${esc(p.vacct.until)}</dd>` : ''}${p.ship ? `<dt>요청사항</dt><dd>${esc(p.ship)}</dd>` : ''}${p.refund ? `<dt>환불 신청일</dt><dd>${esc(p.refund.at)} · ${esc(p.refund.reason || '')}</dd>${p.refund.state === '승인' ? `<dt>환불액</dt><dd>${won(p.refund.amount)}</dd>` : ''}${p.refund.note ? `<dt>거절 사유</dt><dd>${esc(p.refund.note)}</dd>` : ''}` : ''}</dl>`, [{ id: 'c', label: '닫기' }]); };

  /* ── 환불 승인 · 거절 · 부분 환불 ── */
  function refundWarn(p) { const W = []; const b = p.itemType === 'book' ? S.books.find(x => x.id === p.ref) : null;
    if (b) { if (dayDiff(p.at, p.refund ? p.refund.at : today()) > 7) W.push('결제일로부터 7일이 지나 신청되었습니다.'); const g = (b.grants || []).find(x => x.who === p.who); if (b.kind === '전자책' && g && g.dl > 0) W.push(`전자책 다운로드 이력이 있습니다(${g.dl}회) — 규정상 환불 불가 건입니다.`); const s = (b.ship || []).find(x => x.who === p.who); if (b.kind !== '전자책' && s && s.done) W.push('이미 전달 완료 처리된 실물 교재입니다 — 규정상 환불 불가 건입니다.'); }
    if (p.itemType === 'sub') W.push('구독은 현재 회차만 환불되며 승인 시 구독이 해지됩니다.');
    return W; }
  ACT.rf = el => { sl2Ensure(); const p = S.pays.find(x => x.id === el.dataset.v); if (!p) return; if (!p.refund) p.refund = { at: today(), reason: '', amount: p.amount, state: '신청' };
    const W = refundWarn(p);
    if (el.dataset.ok) { const part = tossOK();
      modal('환불 승인', `<p class="mini">${mn(p.who)} · ${esc(p.item)} · 결제 ${won(p.amount)} · 신청 ${esc(p.refund.at)}<br>사유: ${esc(p.refund.reason || '—')}</p>${W.map(x => `<div class="warn">${esc(x)}</div>`).join('')}
        <label class="fl">환불 금액${part ? '(토스페이먼츠 — 부분 환불 가능)' : '(전액 환불)'}<input name="a" type="number" min="1" max="${p.amount}" value="${p.amount}" ${part ? '' : 'readonly'}></label>${part ? `<label class="ckl"><input type="checkbox" name="keep"> 부분 환불 후에도 수강 · 이용 권한 유지</label>` : ''}<p class="mini">승인하면 카드 결제 취소 · 금액 반환이 진행됩니다(영업일 기준 며칠 걸릴 수 있음).</p>`,
        [{ id: 'c', label: '취소' }, { id: 'ok', label: '승인', kind: 'pri', run: w => { const a = Math.round(+fv(w, 'a')); if (!(a >= 1 && a <= p.amount)) { toast(`1원 ~ ${won(p.amount)} 사이로 입력하세요.`, 'warn'); return false; } if (!part && a !== p.amount) { toast('디디쌤 연결 PG는 전액 환불만 가능합니다.', 'warn'); return false; }
          /* 운영: POST /api/pg/<pg>/cancel { paymentKey, cancelAmount } */
          p.refund = { ...p.refund, amount: a, state: '승인', done: today() }; p.status = a < p.amount ? '부분 환불' : '환불 완료';
          grantFor(p, a < p.amount && fv(w, 'keep') ? 'restore' : false); logAudit(`환불 승인 — ${p.item} ${won(a)}${a < p.amount ? '(부분)' : ''}`); save(); render(); toast(`${won(a)} 환불을 승인했습니다.`, 'ok'); } }]);
    } else modal('환불 거절', `<p class="mini">${mn(p.who)} · ${esc(p.item)} · 사유: ${esc(p.refund.reason || '—')}</p><label class="fl">거절 사유(필수 · ${esc(t('learner'))}에게 안내됩니다)<textarea name="r" rows="3" maxlength="300"></textarea></label><p class="mini">거절 후에는 다시 환불하기 어렵습니다. 거절하면 수강 · 이용 권한이 다시 열립니다.</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '거절', kind: 'red', run: w => { const r = fv(w, 'r'); if (!r) { toast('거절 사유를 입력하세요.', 'warn'); return false; } p.refund = { ...p.refund, state: '거절', note: r, done: today() }; p.status = '결제 완료'; grantFor(p, 'restore'); logAudit(`환불 거절 — ${p.item}`); save(); render(); } }]);
  };

  /* ── 구독 정기 결제(데모 실행) — 상태 모델은 W2(S.subs) ── */
  ACT['sl2-subrun'] = () => { sl2Ensure(); let n = 0, e = 0;
    S.subs.forEach(s => { const c = C(s.cls); if (!c) return; const cnt = +((c.subsc || {}).count) || 0;
      if (s.status === '해지 예약' && s.next && s.next <= today()) { s.status = '해지'; s.end = s.next; enrollRevoke(c, s.who); e++; return; }
      if (s.status !== '구독중' || !s.next || s.next > today()) return;
      if ((c.subsc && c.subsc.saleEnd && c.subsc.saleEnd <= today()) || c.saleEnd || (cnt && s.n >= cnt)) { s.status = '해지'; s.end = s.next; enrollRevoke(c, s.who); e++; return; }
      const p = { id: uid('pay'), at: s.next, who: s.who, item: `${c.name} (${s.n + 1}회차)`, itemType: 'sub', ref: c.id, amount: finalPrice(c), method: s.method || '신용카드(정기)', status: '결제 완료', pg: payPG() };
      /* 운영: 토스 빌링키로 자동 결제(POST /v1/billing/{billingKey}) */
      S.pays.unshift(p); s.n++; s.next = addMonths(s.next, 1); s.pay = p.id; enrollGrant(c, s.who, 'pay', p.id, s.next); n++; });
    save(); render(); toast(`정기 결제 ${n}건 · 만료 ${e}건을 처리했습니다.`, 'ok'); };

  /* ── 청구서 ── */
  const billTotal = b => sum(b.items, i => i[1]);
  const batches = () => { const G = {}; S.bills.forEach(b => { (G[b.batch] = G[b.batch] || []).push(b); }); return Object.values(G).sort((a, b) => String(b[0].sentAt || b[0].due).localeCompare(String(a[0].sentAt || a[0].due))); };
  function billBody(inSales) { sl2Ensure(); const B = batches();
    const lock = !tossOK() ? `<div class="warn">${ST().pg === 'toss' && tossPend() ? '토스페이먼츠 심사 중에는 청구서를 발송할 수 없습니다. 승인 후 이용하세요.' : '청구서는 토스페이먼츠 PG 승인 후 쓸 수 있습니다.'} ${inSales ? '' : '<a href="#" data-act="go" data-v="sales">매출 관리에서 PG 설정</a>'}</div>` : '';
    return lock + (inSales ? `<div class="sl2-row" style="margin-bottom:12px"><button class="btn pri" data-act="bill-new" ${tossOK() ? '' : 'disabled title="토스페이먼츠 승인 필요"'}>+ 청구서 만들기</button></div>` : '') + `<section class="grid g3">${kpi('수납액', won(sum(S.bills.filter(b => b.status !== '미납'), billTotal)), S.bills.filter(b => b.status !== '미납').length + '건', 'g')}${kpi('현장 납부', S.bills.filter(b => b.status === '현장 납부').length + '건')}${kpi('미납', S.bills.filter(b => b.status === '미납').length + '건', won(sum(S.bills.filter(b => b.status === '미납'), billTotal)), 'r')}</section>` +
      table(['청구서명', '청구 항목', '대상', '발송 상태', '납부 마감', '수납 / 미납', ''], B.map(L => { const b = L[0]; const paid = L.filter(x => x.status !== '미납').length; const its = [...new Set(L.flatMap(x => x.items.map(i => i[0])))];
        return [`<b>${esc(b.title)}</b>`, esc(its.join(', ')), L.length + '명' + (L.some(x => (x.to || []).some(y => y.parent)) ? ' ' + tag('보호자 포함', 'b') : ''), tag(b.sent ? '발송 완료' : '미발송', b.sent ? 'g' : '') + `<br><small class="mini">${esc(b.notify || '')}</small>`, esc(b.due), `${paid} / <b class="${L.length - paid ? 'sl2-r' : ''}">${L.length - paid}</b>`, `<button class="btn sm" data-act="sl2-bill" data-v="${esc(b.batch)}">상세</button>`]; }), '청구서가 없습니다.');
  }
  VIEWS.billing = () => { sl2Ensure(); return head('청구서', `청구서명 → 청구 항목(8종) → 청구 대상 → 발송 설정 · 미납 자동 알림 · 현장 납부처리 ${guideRef('features/sales.md')}`, `<button class="btn pri" data-act="bill-new" ${tossOK() ? '' : 'disabled title="토스페이먼츠 승인 필요"'}>+ 청구서 만들기</button>`) + billBody(false); };
  const learnerURL = () => (typeof lsLearnerURL === 'function' ? lsLearnerURL() : location.href.replace(/[^/]*$/, '') + 'learner.html');
  const kakaoMsg = b => `[${S.org.name}] ${b.title}\n${M(b.who)?.name || ''}님의 청구서가 도착했습니다.\n청구 금액: ${won(billTotal(b))}\n납부 마감: ${b.due}\n\n[납부하러 가기] ${learnerURL()}#bill/${b.id}`;
  ACT['sl2-bill'] = el => { const L = S.bills.filter(b => b.batch === el.dataset.v); if (!L.length) return; const b0 = L[0];
    modal(`청구서 — ${b0.title}`, `<p class="mini">마감 ${esc(b0.due)} · 미납 알림 ${esc(b0.notify || '')} · 발송 ${esc(b0.sentAt || '')}</p>` + table(['대상', '보호자 발송', '청구 항목', '금액', '상태', ''], L.map(b => [mn(b.who), (b.to || []).filter(x => x.parent).length ? (b.to || []).filter(x => x.parent).map(x => esc((S.parents.find(p => p.id === x.who) || {}).name || '보호자')).join(', ') : '—', esc(b.items.map(i => i[0] + (i[2] ? '·연결' : '')).join(', ')), won(billTotal(b)), tag(b.status, b.status === '미납' ? 'r' : 'g') + (b.payAt ? `<br><small class="mini">${esc(b.payAt)} ${esc(b.method || '')}</small>` : ''),
      (b.status === '미납' ? `<button class="btn sm" data-act="bill-paid" data-v="${b.id}">현장 납부처리</button><button class="btn sm ghost" data-act="sl2-remind" data-v="${b.id}">재알림</button>` : '') + `<button class="btn sm ghost" data-act="sl2-kakao" data-v="${b.id}">알림톡 보기</button>`])), [{ id: 'c', label: '닫기' }], true); };
  ACT['sl2-kakao'] = el => { const b = S.bills.find(x => x.id === el.dataset.v); if (!b) return; const url = `${learnerURL()}#bill/${b.id}`;
    modal('알림톡 미리보기(데모)', `<div class="sl2-kakao"><pre>${esc(kakaoMsg(b).replace(/\n\n\[납부하러 가기\].*$/, ''))}</pre><a class="btn pri" href="${esc(url)}" target="_blank" rel="noopener">납부하러 가기</a></div><p class="mini">수강생 · 보호자는 로그인 없이 링크로 바로 납부합니다. <!-- 운영: 알림톡 템플릿 + 1회용 납부 토큰 --></p>`, [{ id: 'c', label: '닫기' }]); };
  ACT['sl2-remind'] = el => { const b = S.bills.find(x => x.id === el.dataset.v); if (!b) return; b.remind = (b.remind || 0) + 1; b.remindAt = today(); logAudit(`미납 재알림 — ${M(b.who)?.name}`); save(); toast('미납 알림톡을 다시 보냈습니다(데모).', 'ok'); };
  function billPaid(b, how, method) { if (!b || b.status !== '미납') return false;
    b.status = how === 'site' ? '현장 납부' : '납부 완료'; b.payAt = today(); b.method = method || (how === 'site' ? '현장' : '');
    let payId = null; if (how !== 'site') { const p = { id: uid('pay'), at: today(), who: b.who, item: b.title, itemType: 'bill', ref: b.id, amount: billTotal(b), method: method || '신용카드', status: '결제 완료', pg: 'toss' }; S.pays.unshift(p); payId = p.id; }
    b.items.forEach(i => { if (!i[2]) return; const c = C(i[2]); if (c) enrollGrant(c, b.who, 'pay', payId); const bk = S.books.find(x => x.id === i[2]); if (bk) bookGrant(bk, b.who, payId, ''); });
    return true; }
  window.sl2BillPaid = billPaid;
  ACT['bill-paid'] = el => { sl2Ensure(); const b = S.bills.find(x => x.id === el.dataset.v); if (!billPaid(b, 'site')) return; logAudit(`현장 납부처리 — ${M(b.who)?.name} ${b.title}`); save(); closeModal(); render(); toast('현장 납부로 처리했습니다. 연결된 수강 권한을 부여했습니다.', 'ok'); };

  /* 청구서 만들기 4단계 */
  let BW = null;
  ACT['bill-new'] = () => { sl2Ensure(); if (!tossOK()) { toast('청구서는 토스페이먼츠 승인 후 쓸 수 있습니다.', 'warn'); return; }
    const pre = []; if (!S.members.filter(actOK).length) pre.push(`청구할 ${tj('learner', '이')} 가입되어 있어야 합니다.`); if (!S.classes.length) pre.push(`수업료 항목으로 쓸 ${tj('cls', '을')} 먼저 만드세요(차량비 등만 청구할 때는 없어도 됩니다).`);
    BW = { step: 1, title: `${new Date().getFullYear()}년 ${new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2}월 청구서`, items: [{ k: 'class', ref: S.classes.find(c => c.price)?.id || S.classes[0]?.id || '', amt: S.classes.find(c => c.price)?.price || 0, name: '' }], to: [], mode: 'same', each: {}, due: addDays(today(), 10), notify: NOTIFY[0], pre }; billWiz(); };
  function billWiz() { const st = BW.step; const steps = ['청구서명', '청구 항목', '청구 대상', '발송 설정'];
    const sh = `<ol class="sl2-wz">${steps.map((s, i) => `<li class="${i + 1 === st ? 'cur' : i + 1 < st ? 'done' : ''}">${i + 1}. ${s}</li>`).join('')}</ol>`;
    let body = '';
    if (st === 1) body = `${BW.pre.map(x => `<div class="warn">${esc(x)}</div>`).join('')}<label class="fl">청구서명(학생 · 학부모에게 보입니다)<input name="title" maxlength="30" value="${esc(BW.title)}" placeholder="예: 2026년 12월 청구서"></label>`;
    if (st === 2) body = `<p class="mini">유료 청구 항목이 1개 이상 있어야 발송할 수 있습니다. 수업료 · 재료비 항목은 내 ${esc(t('cls'))} · 교재를 골라 청구하면 납부 후 수강 권한이 자동으로 생깁니다.</p><div class="sl2-its">${BW.items.map((it, i) => `<div class="sl2-it" data-i="${i}"><select name="k${i}" data-bwk="${i}">${BILL_KINDS.map(([k, l]) => `<option value="${k}" ${it.k === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${it.k === 'class' ? `<select name="r${i}">${S.classes.filter(c => c.status !== '종료').map(c => `<option value="${c.id}" ${it.ref === c.id ? 'selected' : ''}>${esc(c.name)} · ${won(c.price)}</option>`).join('') || '<option value="">클래스 없음</option>'}</select>` : it.k === 'book' ? `<select name="r${i}">${S.books.map(b => `<option value="${b.id}" ${it.ref === b.id ? 'selected' : ''}>${esc(b.name)} · ${won(b.price)}</option>`).join('') || '<option value="">교재 없음</option>'}</select>` : `<input name="n${i}" maxlength="30" placeholder="${esc(BKN[it.k].replace(/\(.*\)/, ''))} 내용(선택)" value="${esc(it.name || '')}">`}<input name="a${i}" type="number" min="0" step="1000" value="${+it.amt || 0}" aria-label="금액"><button type="button" class="btn sm ghost" data-bwdel="${i}" aria-label="항목 삭제">삭제</button></div>`).join('')}</div><button type="button" class="btn sm" data-bwadd="1">+ 청구 항목 추가</button>`;
    if (st === 3) { const ms = S.members.filter(actOK); const grp = S.groups || [];
      body = `<div class="sl2-bar"><input type="search" placeholder="이름 검색" data-bwq="1" aria-label="대상 검색"><select data-bwg="1" aria-label="${esc(t('group'))}"><option value="">전체 ${esc(t('group'))}</option>${grp.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select><select data-bwc="1" aria-label="${esc(t('cls'))}"><option value="">전체 ${esc(t('cls'))}</option>${S.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button type="button" class="btn sm" data-bwall="1">보이는 대상 모두 선택</button></div>
        <div class="chk sl2-tg">${ms.map(m => { const np = S.parents.filter(p => p.child === m.id && /완료/.test(p.status || '')).length; return `<label data-s="${esc(m.name)}" data-g="${esc(m.group || '')}" data-c="${esc(S.classes.filter(c => (c.learners || []).includes(m.id)).map(c => c.id).join(' '))}"><input type="checkbox" name="to" value="${m.id}" ${BW.to.includes(m.id) ? 'checked' : ''}> ${esc(m.name)}${np ? ` <small class="mini">+보호자</small>` : ''}</label>`; }).join('') || '대상이 없습니다.'}</div>
        <p class="mini">보호자가 연결된 ${esc(tj('learner', '은'))} 보호자에게도 청구서가 발송됩니다.</p>
        <div class="seg2"><button type="button" data-bwm="same" class="${BW.mode === 'same' ? 'on' : ''}">모든 대상에게 같은 항목</button><button type="button" data-bwm="each" class="${BW.mode === 'each' ? 'on' : ''}">대상마다 항목 다르게</button></div>
        ${BW.mode === 'each' && BW.to.length ? `<div class="tw"><table class="sl2-grid"><thead><tr><th>대상</th>${BW.items.map(it => `<th>${esc(it.k === 'class' ? (C(it.ref)?.name || '수업료') : it.k === 'book' ? (S.books.find(b => b.id === it.ref)?.name || '재료비') : (it.name || BKN[it.k]))}</th>`).join('')}</tr></thead><tbody>${BW.to.map(id => `<tr><td>${mn(id)}</td>${BW.items.map((_, i) => `<td><input type="checkbox" name="x_${id}_${i}" ${(BW.each[id] || BW.items.map(() => true))[i] ? 'checked' : ''} aria-label="항목 포함"></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="mini">선택을 바꾼 뒤 [다음]을 누르면 반영됩니다. 대상 선택을 바꾸면 표가 다시 그려집니다.</p>` : BW.mode === 'each' ? '<p class="mini">대상을 먼저 고르세요.</p>' : ''}`; }
    if (st === 4) { const tot = BW.to.reduce((s, id) => s + BW.items.reduce((a, it, i) => a + ((BW.mode === 'same' || (BW.each[id] || [])[i] !== false) ? (+it.amt || 0) : 0), 0), 0); const np = BW.to.reduce((s, id) => s + S.parents.filter(p => p.child === id && /완료/.test(p.status || '')).length, 0);
      body = `<div class="form2"><label>납부 마감일<input type="date" name="due" value="${esc(BW.due)}" min="${today()}"></label><label>미납 알림 발송 시점<select name="notify">${NOTIFY.map(n => `<option ${BW.notify === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <div class="okbox">「${esc(BW.title)}」 · ${esc(t('learner'))} ${BW.to.length}명${np ? ` + 보호자 ${np}명` : ''} · 청구 합계 ${won(tot)}<br>알림톡 [납부하러 가기] 링크로 로그인 없이 납부합니다. 앱 사용자는 앱 알림으로도 받습니다.</div>`; }
    const read = w => { if (st === 1) BW.title = fv(w, 'title');
      if (st === 2) BW.items = BW.items.map((it, i) => ({ k: fv(w, 'k' + i) || it.k, ref: fv(w, 'r' + i) || '', name: fv(w, 'n' + i) || '', amt: Math.max(0, +fv(w, 'a' + i) || 0) }));
      if (st === 3) { BW.to = $$('[name=to]:checked', w).map(x => x.value); if (BW.mode === 'each') BW.to.forEach(id => { const r = BW.items.map((_, i) => { const x = w.querySelector(`[name="x_${id}_${i}"]`); return x ? x.checked : true; }); BW.each[id] = r; }); }
      if (st === 4) { BW.due = fv(w, 'due'); BW.notify = fv(w, 'notify'); } };
    const check = () => { if (st === 1 && !BW.title) return '청구서명을 입력하세요.';
      if (st === 2) { if (!BW.items.some(it => it.amt > 0)) return '유료 청구 항목을 1개 이상 추가하세요.'; if (BW.items.some(it => ['class', 'book'].includes(it.k) && !it.ref)) return '수업료 · 재료비 항목은 연결할 클래스 · 교재를 고르세요.'; }
      if (st === 3) { if (!BW.to.length) return '청구 대상을 1명 이상 고르세요.'; if (BW.mode === 'each' && BW.to.some(id => !BW.items.some((it, i) => (BW.each[id] || [])[i] !== false && it.amt > 0))) return '대상마다 유료 항목이 1개 이상 있어야 합니다.'; }
      if (st === 4 && (!BW.due || BW.due < today())) return '납부 마감일은 오늘 이후로 정하세요.'; return ''; };
    const w = modal(`청구서 만들기 — ${st}/4`, sh + body, [{ id: 'c', label: '취소' }, ...(st > 1 ? [{ id: 'prev', label: '이전', run: w2 => { read(w2); BW.step--; setTimeout(billWiz, 0); } }] : []),
      { id: 'ok', label: st < 4 ? '다음' : '발송', kind: 'pri', run: w2 => { read(w2); const e = check(); if (e) { toast(e, 'warn'); return false; } if (st < 4) { BW.step++; setTimeout(billWiz, 0); return; } billSend(); } }], true);
    w.querySelectorAll('[data-bwk]').forEach(s => s.addEventListener('change', () => { read(w); const it = BW.items[+s.dataset.bwk]; it.ref = ''; if (it.k === 'class') { const c = S.classes.find(x => x.price) || S.classes[0]; it.ref = c?.id || ''; it.amt = c?.price || 0; } else if (it.k === 'book') { const b = S.books[0]; it.ref = b?.id || ''; it.amt = b?.price || 0; } billWiz(); }));
    w.querySelectorAll('select[name^=r]').forEach(s => s.addEventListener('change', () => { const i = +s.name.slice(1); const it = BW.items[i]; const x = it.k === 'class' ? C(s.value) : S.books.find(b => b.id === s.value); const a = w.querySelector(`[name=a${i}]`); if (x && a) a.value = finalPrice(x); }));
    w.querySelectorAll('[data-bwdel]').forEach(b => b.addEventListener('click', () => { read(w); BW.items.splice(+b.dataset.bwdel, 1); if (!BW.items.length) BW.items.push({ k: 'etc', ref: '', name: '', amt: 0 }); billWiz(); }));
    w.querySelectorAll('[data-bwadd]').forEach(b => b.addEventListener('click', () => { read(w); BW.items.push({ k: 'car', ref: '', name: '', amt: 0 }); billWiz(); }));
    w.querySelectorAll('[data-bwm]').forEach(b => b.addEventListener('click', () => { read(w); BW.mode = b.dataset.bwm; billWiz(); }));
    const flt = () => { const q = (w.querySelector('[data-bwq]') || {}).value || ''; const g = (w.querySelector('[data-bwg]') || {}).value || ''; const c = (w.querySelector('[data-bwc]') || {}).value || ''; w.querySelectorAll('.sl2-tg label').forEach(l => { l.hidden = !((!q || l.dataset.s.includes(q)) && (!g || l.dataset.g === g) && (!c || l.dataset.c.split(' ').includes(c))); }); };
    w.querySelectorAll('[data-bwq],[data-bwg],[data-bwc]').forEach(x => x.addEventListener('input', flt));
    w.querySelectorAll('[data-bwall]').forEach(b => b.addEventListener('click', () => { w.querySelectorAll('.sl2-tg label:not([hidden]) input').forEach(x => { x.checked = true; }); if (BW.mode === 'each') { read(w); billWiz(); } }));
    if (BW.mode === 'each') w.querySelectorAll('[name=to]').forEach(x => x.addEventListener('change', () => { read(w); billWiz(); }));
  }
  function billSend() { const batch = uid('bt'); let n = 0, np = 0;
    BW.to.forEach(id => { const m = M(id); if (!m) return; const items = BW.items.filter((it, i) => BW.mode === 'same' || (BW.each[id] || [])[i] !== false).filter(it => it.amt > 0 || ['class', 'book'].includes(it.k)).map(it => {
        const nm = it.k === 'class' ? `수업료 · ${C(it.ref)?.name || ''}` : it.k === 'book' ? `재료비 · ${S.books.find(b => b.id === it.ref)?.name || ''}` : (BKN[it.k].replace(/\(.*\)/, '') + (it.name ? ` · ${it.name}` : '')); return [nm, +it.amt || 0, it.ref || '', it.k]; });
      if (!items.some(i => i[1] > 0)) return;
      const par = S.parents.filter(p => p.child === id && /완료/.test(p.status || '')); np += par.length;
      const b = { id: uid('b'), batch, who: id, to: [{ who: id, parent: false }, ...par.map(p => ({ who: p.id, parent: true }))], title: BW.title, items, due: BW.due, notify: BW.notify, status: '미납', sent: true, sentAt: today() };
      S.bills.unshift(b); n++; });
    /* 운영: 알림톡 발송 API(청구서 템플릿, 버튼 [납부하러 가기] = 1회용 납부 링크) */
    S.msgs.unshift({ id: uid('ms'), at: today(), to: '청구서', toIds: BW.to.slice(), parents: np > 0, title: BW.title, body: `청구서가 도착했습니다. [납부하러 가기] 링크로 납부하세요. 마감 ${BW.due}`, imgs: [], ch: '알림톡', n: n + np });
    logAudit(`청구서 발송 — ${BW.title} ${n}명(보호자 ${np}명)`); BW = null; save(); render(); toast(`${n}명${np ? ` · 보호자 ${np}명` : ''}에게 청구서를 보냈습니다(알림톡).`, 'ok'); }

  /* ── 교재 · 교구 ── */
  const bkTh = b => b.thumb ? `<img class="sl2-th" src="${esc(b.thumb)}" alt="">` : `<span class="sl2-th sl2-th0" aria-hidden="true">${esc((b.name || '교재').slice(0, 2))}</span>`;
  VIEWS.book = () => { sl2Ensure(); const v = UI.bkView || 'list';
    const pr = b => b.price ? (finalPrice(b) < b.price ? `<s class="mini">${won(b.price)}</s> ${won(finalPrice(b))}` : won(b.price)) : tag('무료', 'g');
    const stat = b => b.kind === '전자책' ? `${(b.grants || []).filter(g => !g.off && g.dl > 0).length}/${(b.grants || []).filter(g => !g.off).length}명 다운로드` : `${(b.ship || []).filter(s => s.done).length}/${(b.ship || []).length} 전달`;
    const acts = b => `<button class="btn sm" data-act="sl2-bkd" data-v="${b.id}">상세</button><button class="btn sm ghost" data-act="sl2-bked" data-v="${b.id}">수정</button>`;
    return head('교재 · 교구', `전자책(PDF 1개 · 최대 200MB) · 실물 교재/교구 · 다운로드 기간 · 전달 관리 ${guideRef('features/book.md')}`, `<div class="seg2" role="tablist"><button data-act="tab" data-key="bkView" data-v="gallery" class="${v === 'gallery' ? 'on' : ''}">갤러리뷰</button><button data-act="tab" data-key="bkView" data-v="list" class="${v === 'list' ? 'on' : ''}">리스트뷰</button></div><button class="btn ai" data-act="ai-bookthumb">✦ 썸네일 추천</button><button class="btn pri" data-act="book-new">+ 교재 만들기</button>`) +
      `<p class="mini">환불: 결제일로부터 7일 이내. 전자책은 다운로드 이력이 없어야, 실물은 전달 완료 전이어야 합니다. 전자책은 결제 후 ${S.books[0]?.dl?.days || 30}일(교재별 설정) 안에 여러 번 받을 수 있습니다.</p>` +
      (v === 'gallery' ? (S.books.length ? `<div class="sl2-gal">${S.books.map(b => `<article class="card">${bkTh(b)}<b>${esc(b.name)}</b><small>${esc(b.kind)} · ${pr(b)} · ${esc(b.open)}</small><small>${stat(b)}</small><div class="sl2-row">${acts(b)}</div></article>`).join('')}</div>` : '<div class="empty">등록된 교재가 없습니다.</div>')
        : table(['', '이름', '유형', '판매가', '판매', '다운로드 / 전달', '공개', ''], S.books.map(b => [bkTh(b), `<b>${esc(b.name)}</b>${b.file ? `<br><small class="mini">${esc(b.file.name)}</small>` : ''}`, esc(b.kind), pr(b), (b.grants || []).filter(g => !g.off).length + '명', stat(b), esc(b.open), acts(b)]), '등록된 교재가 없습니다.'));
  };
  function bookForm(b) { const isNew = !b; b = b || { name: '', kind: '전자책', price: 10000, discount: { on: false, type: 'rate', v: 0 }, file: null, dl: { on: true, limit: 0, days: 30 }, intro: '', thumb: '', authors: [{ name: '', bio: '' }], open: '전체', openTo: [], req: { on: true, q: '배송지 주소와 요청사항을 적어 주세요.', must: true } };
    const live = (b.grants || []).filter(g => !g.off); const undelivered = (b.ship || []).some(s => !s.done); const kindLock = !isNew && ((b.kind === '전자책' && live.length) || (b.kind !== '전자책' && undelivered)); const fileLock = !isNew && b.kind === '전자책' && live.length > 0;
    let A = (b.authors && b.authors.length ? b.authors : [{ name: '', bio: '' }]).map(a => ({ ...a })); let thumb = b.thumb || ''; let openTo = (b.openTo || []).slice();
    const aHTML = () => A.map((a, i) => `<div class="sl2-au"><input name="an${i}" maxlength="20" placeholder="저자 이름" value="${esc(a.name)}"><input name="ab${i}" maxlength="120" placeholder="이력 · 소개" value="${esc(a.bio)}"><button type="button" class="btn sm ghost" data-audel="${i}">삭제</button></div>`).join('');
    const w = modal(isNew ? '교재 · 교구 만들기' : '교재 · 교구 수정', `<label class="fl">교재/교구명(최대 50자)<input name="n" maxlength="50" value="${esc(b.name)}"></label>
      <div class="form2"><label>유형<select name="k" ${kindLock ? 'disabled' : ''}><option ${b.kind === '전자책' ? 'selected' : ''}>전자책</option><option value="실물" ${b.kind !== '전자책' ? 'selected' : ''}>실물 교재/교구</option></select>${kindLock ? '<small class="mini">전달되지 않은 수강생이 있거나 전자책 권한 보유자가 있어 유형을 바꿀 수 없습니다.</small>' : ''}</label><label>판매 금액(0원이면 무료)<input name="p" type="number" min="0" step="100" value="${+b.price || 0}"></label></div>
      <div class="form2"><label class="ckl"><input type="checkbox" name="don" ${b.discount?.on ? 'checked' : ''}> 할인 적용</label><label>할인<span class="sl2-in2"><input name="dv" type="number" min="0" value="${+b.discount?.v || 0}"><select name="dt"><option value="rate" ${b.discount?.type !== 'amount' ? 'selected' : ''}>%</option><option value="amount" ${b.discount?.type === 'amount' ? 'selected' : ''}>원</option></select></span></label></div>
      <div class="sl2-ebook" ${b.kind === '전자책' ? '' : 'hidden'}><label class="fl">PDF 파일(1개 · 최대 200MB)${b.file ? ` <small class="mini">현재: ${esc(b.file.name)} · ${(b.file.size / 1048576).toFixed(1)}MB</small>` : ''}<input type="file" name="f" accept="application/pdf,.pdf" ${fileLock ? 'disabled' : ''}></label>${fileLock ? '<p class="mini">권한을 가진 수강생이 있어 전자책 파일을 바꿀 수 없습니다.</p>' : ''}
        <div class="form2"><label>다운로드 가능 기간(결제 후 일수)<input name="dd" type="number" min="1" max="365" value="${+b.dl?.days || 30}"></label><label>1인 다운로드 횟수(0 = 기간 내 무제한)<input name="dlim" type="number" min="0" max="99" value="${+b.dl?.limit || 0}"></label></div></div>
      <div class="sl2-phys" ${b.kind !== '전자책' ? '' : 'hidden'}><label class="ckl"><input type="checkbox" name="ron" ${b.req?.on ? 'checked' : ''}> 결제 요청사항 작성란 사용</label><label class="fl">요청사항 안내 문구<input name="rq" maxlength="60" value="${esc(b.req?.q || '')}"></label><label class="ckl"><input type="checkbox" name="rm" ${b.req?.must ? 'checked' : ''}> 필수 입력</label></div>
      <label class="fl">교재/교구 소개(주요 목차 · 특징 · 사용법)<textarea name="i" rows="4" maxlength="3000">${esc(b.intro || '')}</textarea></label>
      <div class="form2"><label>썸네일(이미지 200KB 이하)<input type="file" name="th" accept="image/*"></label><label>기본 이미지<span class="sl2-thp">${thumb ? `<img src="${esc(thumb)}" alt="" class="sl2-th">` : '<span class="sl2-th sl2-th0">기본</span>'}<button type="button" class="btn sm ghost" data-thclr="1">기본 이미지 사용</button></span></label></div>
      <div class="fl"><span>저자 소개(여러 명 가능)</span><div class="sl2-aus">${aHTML()}</div><button type="button" class="btn sm" data-auadd="1">+ 저자 추가</button></div>
      <div class="form2"><label>공개 대상<select name="o"><option ${b.open === '전체' ? 'selected' : ''}>전체</option><option ${b.open === '지정 회원' ? 'selected' : ''}>지정 회원</option><option ${b.open === '비공개' ? 'selected' : ''}>비공개</option></select></label><label>지정 회원<button type="button" class="btn sm" data-otpick="1">선택(<span class="sl2-otn">${openTo.length}</span>명)</button></label></div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w2 => { const name = fv(w2, 'n'); if (!name) { toast('교재/교구명을 입력하세요.', 'warn'); return false; }
        const kind = kindLock ? b.kind : (fv(w2, 'k') === '전자책' ? '전자책' : '실물');
        const f = w2.querySelector('[name=f]'); const x = f && f.files && f.files[0]; let file = b.file || null;
        if (x) { if (!/\.pdf$/i.test(x.name) && x.type !== 'application/pdf') { toast('전자책은 PDF 파일만 올릴 수 있습니다.', 'warn'); return false; } if (x.size > 200 * 1024 * 1024) { toast('PDF는 200MB 이하만 올릴 수 있습니다.', 'warn'); return false; } file = { name: x.name, size: x.size, at: today() }; /* 운영: 파일 서버 업로드 후 키 저장 */ }
        if (kind !== '전자책' && b.kind === '전자책' && b.file && !isNew && !confirm('실물로 바꾸면 등록한 PDF 파일이 지워집니다. 계속할까요?')) return false;
        if (kind !== '전자책') file = null;
        if (kind === '전자책' && !file && +fv(w2, 'p') > 0 && !confirm('PDF 파일 없이 저장합니다. 판매 전에 파일을 올려 주세요.')) return false;
        A = A.map((a, i) => ({ name: fv(w2, 'an' + i), bio: fv(w2, 'ab' + i) })).filter(a => a.name);
        const o = { name, kind, price: Math.max(0, +fv(w2, 'p') || 0), discount: { on: !!fv(w2, 'don'), type: fv(w2, 'dt') || 'rate', v: Math.max(0, +fv(w2, 'dv') || 0) }, file, dl: { on: true, days: clampN(+fv(w2, 'dd') || 30, 1, 365), limit: clampN(+fv(w2, 'dlim') || 0, 0, 99) }, intro: fv(w2, 'i'), thumb, authors: A, author: A[0]?.name || '', open: fv(w2, 'o'), openTo, req: { on: !!fv(w2, 'ron'), q: fv(w2, 'rq') || '배송지 주소와 요청사항을 적어 주세요.', must: !!fv(w2, 'rm') } };
        if (o.discount.type === 'rate' && o.discount.v > 100) { toast('할인율은 100% 이하입니다.', 'warn'); return false; }
        if (o.open === '지정 회원' && !openTo.length) { toast('지정 회원을 1명 이상 고르세요.', 'warn'); return false; }
        if (isNew) S.books.push({ id: uid('bk'), sold: 0, delivered: 0, grants: [], ship: [], ...o }); else Object.assign(b, o);
        logAudit(`교재 ${isNew ? '등록' : '수정'} — ${name}`); save(); render(); toast(isNew ? '교재를 만들었습니다.' : '교재를 수정했습니다.', 'ok'); } }], true);
    const ks = w.querySelector('[name=k]'); ks && ks.addEventListener('change', () => { const e = ks.value === '전자책'; w.querySelector('.sl2-ebook').hidden = !e; w.querySelector('.sl2-phys').hidden = e; if (!e && b.file && !isNew) toast('실물로 바꾸면 등록한 PDF 파일이 지워집니다.', 'warn'); });
    const th = w.querySelector('[name=th]'); th.addEventListener('change', () => { const x = th.files[0]; if (!x) return; if (!/^image\//.test(x.type)) { toast('이미지 파일만 올릴 수 있습니다.', 'warn'); th.value = ''; return; } if (x.size > 200 * 1024) { toast('썸네일은 200KB 이하만 올릴 수 있습니다.', 'warn'); th.value = ''; return; } const r = new FileReader(); r.onload = () => { thumb = String(r.result); w.querySelector('.sl2-thp').firstElementChild.outerHTML = `<img src="${esc(thumb)}" alt="" class="sl2-th">`; }; r.readAsDataURL(x); });
    w.querySelector('[data-thclr]').addEventListener('click', () => { thumb = ''; w.querySelector('.sl2-thp').firstElementChild.outerHTML = '<span class="sl2-th sl2-th0">기본</span>'; });
    const bindA = () => w.querySelectorAll('[data-audel]').forEach(x => x.addEventListener('click', () => { A = A.map((a, i) => ({ name: fv(w, 'an' + i), bio: fv(w, 'ab' + i) })); A.splice(+x.dataset.audel, 1); if (!A.length) A.push({ name: '', bio: '' }); w.querySelector('.sl2-aus').innerHTML = aHTML(); bindA(); }));
    bindA(); w.querySelector('[data-auadd]').addEventListener('click', () => { A = A.map((a, i) => ({ name: fv(w, 'an' + i), bio: fv(w, 'ab' + i) })); A.push({ name: '', bio: '' }); w.querySelector('.sl2-aus').innerHTML = aHTML(); bindA(); });
    w.querySelector('[data-otpick]').addEventListener('click', () => { const done = sel => { openTo = sel; const n = w.querySelector('.sl2-otn'); if (n) n.textContent = sel.length; };
      const box = w.querySelector('.sl2-otbox') || (() => { const d = document.createElement('div'); d.className = 'chk sl2-otbox'; w.querySelector('[data-otpick]').closest('.form2').after(d); return d; })();
      box.innerHTML = S.members.filter(actOK).map(m => `<label><input type="checkbox" value="${m.id}" ${openTo.includes(m.id) ? 'checked' : ''}> ${esc(m.name)}</label>`).join('') || '회원이 없습니다.';
      box.addEventListener('change', () => done($$('input:checked', box).map(x => x.value))); });
  }
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  ACT['book-new'] = () => { sl2Ensure(); bookForm(null); };
  ACT['sl2-bked'] = el => { sl2Ensure(); bookForm(S.books.find(x => x.id === el.dataset.v)); };
  ACT['book-del'] = el => { const b = S.books.find(x => x.id === el.dataset.v); const s = (b?.ship || []).find(x => !x.done); if (s) { s.done = true; s.at = today(); b.delivered = b.ship.filter(x => x.done).length; save(); render(); } };
  ACT['sl2-bkd'] = el => { sl2Ensure(); const b = S.books.find(x => x.id === el.dataset.v); if (!b) return; const eb = b.kind === '전자책'; const L = (b.grants || []).filter(g => !g.off);
    modal(`${b.name} — ${eb ? '전자책' : '실물 교재/교구'}`, `<p class="mini">${eb ? `다운로드 기간: 결제 후 ${b.dl.days}일 · 1인 ${b.dl.limit ? b.dl.limit + '회' : '무제한'}${b.file ? ` · 파일 ${esc(b.file.name)}` : ' · 파일 없음'}` : `요청사항: ${b.req?.on ? esc(b.req.q) + (b.req.must ? ' (필수)' : '') : '받지 않음'}`}</p>` +
      table(eb ? ['수강생', '취득일', '다운로드', '횟수', '다운로드 가능 일자'] : ['수강생', '취득일', '요청사항(배송지 등)', '전달 여부'], L.map(g => eb ? [mn(g.who), esc(g.at), g.dl ? tag('다운로드함', 'g') : tag('안 받음'), `${g.dl || 0}회`, `${esc(dlUntil(b, g))}까지${dlUntil(b, g) < today() ? ' ' + tag('만료', 'r') : ''}`]
        : (() => { const s = (b.ship || []).find(x => x.who === g.who) || {}; return [mn(g.who), esc(g.at), esc(s.memo || '—'), `<label class="ckl"><input type="checkbox" data-shp="${esc(g.who)}" ${s.done ? 'checked' : ''}> 전달 완료</label>`]; })()), '권한을 가진 수강생이 없습니다.'),
      [{ id: 'c', label: '닫기' }, { id: 'mg', label: '수강생 관리', run: () => { setTimeout(() => bookMembers(b), 0); } }], true);
    $$('#modal [data-shp]').forEach(x => x.addEventListener('change', () => { b.ship = b.ship || []; let s = b.ship.find(y => y.who === x.dataset.shp); if (!s) { s = { who: x.dataset.shp, done: false, memo: '' }; b.ship.push(s); } s.done = x.checked; s.at = x.checked ? today() : ''; b.delivered = b.ship.filter(y => y.done).length; logAudit(`교재 전달 ${x.checked ? '완료' : '취소'} — ${M(s.who)?.name}`); save(); toast(x.checked ? '전달 완료로 표시했습니다.' : '전달 완료를 취소했습니다.', 'ok'); }));
  };
  function bookMembers(b) { const cur = new Set((b.grants || []).filter(g => !g.off).map(g => g.who));
    modal(`${b.name} — 수강생 관리`, `<p class="mini">체크하면 결제 없이 권한을 주고, 해제하면 권한을 삭제합니다.</p><div class="chk">${S.members.filter(actOK).map(m => `<label><input type="checkbox" name="g" value="${m.id}" ${cur.has(m.id) ? 'checked' : ''}> ${esc(m.name)}</label>`).join('') || '회원이 없습니다.'}</div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const sel = new Set($$('[name=g]:checked', w).map(x => x.value)); let a = 0, d = 0; sel.forEach(id => { if (!cur.has(id)) { bookGrant(b, id, '', ''); a++; } }); cur.forEach(id => { if (!sel.has(id)) { bookRevoke(b, id); d++; } }); logAudit(`교재 권한 — ${b.name} 추가 ${a} · 삭제 ${d}`); save(); render(); toast(`권한 추가 ${a}명 · 삭제 ${d}명`, 'ok'); } }]); }

  /* ── 학습자 → 운영자 큐 처리기 ── */
  function who(x) { const k = String(x.who || (x.data && x.data.who) || ''); if (!k) return null;
    let m = S.members.find(m => [m.id, m.sid, m.email, m.extra && m.extra.학번, m.acct && m.acct.email].includes(k));
    if (!m) { m = { id: uid('m'), name: S.org.type === 'univ' ? k : `학습자 ${k}`, nick: '', email: /@/.test(k) ? k : '', phone: '', sid: k, group: S.groups?.[0]?.id || '', grade: '정회원', joined: today(), last: today(), extra: S.org.type === 'univ' ? { 학번: k, 학과: '' } : {} }; S.members.push(m); }
    m.last = today(); return m; }
  const pid = x => (x.data && x.data.payId) || '';
  LPX.enroll = x => { sl2Ensure(); const m = who(x); const c = C(x.data.cls); if (!m || !c) return; if (finalPrice(c) > 0) return; const R = c.recruit; if (R && R.on && R.cap && (c.learners || []).length >= +R.cap && !(c.learners || []).includes(m.id)) return; enrollGrant(c, m.id, 'self', null); logAudit(`수강 신청(무료) — ${m.name} · ${c.name}`); };
  LPX.pay = x => { sl2Ensure(); const m = who(x); const d = x.data || {}; if (!m || S.pays.some(p => p.id === d.payId)) return;
    const it = d.itemType === 'book' ? S.books.find(b => b.id === d.ref) : C(d.ref); if (!it) return;
    const p = { id: d.payId || uid('pay'), at: atL(x.at || today()).slice(0, 10), who: m.id, item: it.name, itemType: d.itemType || 'class', ref: d.ref, amount: finalPrice(it), /* 금액은 운영 측 가격 기준(학습자 값 무시) */ method: d.method || '신용카드', status: d.status === '결제 대기' ? '결제 대기' : '결제 완료', pg: payPG(), ship: d.ship || '', vacct: d.vacct || null };
    /* 운영: PG 승인 결과(paymentKey)를 서버가 검증한 뒤 기록 — 금액은 서버 가격과 대조 */
    S.pays.unshift(p);
    if (p.status === '결제 완료') { if (p.itemType === 'sub') subStart(p, d); else grantFor(p, true); }
    logAudit(`결제 ${p.status} — ${m.name} · ${p.item} ${won(p.amount)}`); };
  function subStart(p, d) { const c = C(p.ref); if (!c) return; const start = d.start && d.start > today() ? d.start : today();
    let s = S.subs.find(x => x.cls === c.id && x.who === p.who && x.status !== '해지'); if (!s) s = S.subs.find(x => x.cls === c.id && x.who === p.who);
    if (s) { Object.assign(s, { status: '구독중', n: (s.n || 0) + 1, next: addMonths(start, 1), end: null, pay: p.id, method: p.method }); }
    else { s = { id: d.subId || uid('sb'), cls: c.id, who: p.who, status: '구독중', n: 1, start, next: addMonths(start, 1), end: null, pay: p.id, method: p.method }; S.subs.push(s); }
    p.item = `${c.name} (${s.n}회차)`; enrollGrant(c, p.who, 'pay', p.id, s.next); }
  LPX['vacct-paid'] = x => { sl2Ensure(); const p = S.pays.find(y => y.id === pid(x)); if (!p || p.status !== '결제 대기') return; p.status = '결제 완료'; p.at = today(); if (p.itemType === 'sub') subStart(p, x.data); else grantFor(p, true); logAudit(`가상계좌 입금 확인 — ${p.item}`); };
  LPX['pay-cancel'] = x => { sl2Ensure(); const p = S.pays.find(y => y.id === pid(x)); if (!p || p.status !== '결제 대기') return; p.status = '취소'; p.cancel = { at: today(), reason: x.data.reason || '' }; };
  LPX['refund-req'] = x => { sl2Ensure(); const p = S.pays.find(y => y.id === pid(x)); if (!p || p.status !== '결제 완료' || (p.refund && p.refund.state === '거절')) return;
    p.status = '환불 신청'; p.refund = { at: today(), reason: String(x.data.reason || '').slice(0, 200), amount: p.amount, state: '신청' }; grantFor(p, 'hold'); logAudit(`환불 신청 — ${M(p.who)?.name} · ${p.item}`); };
  LPX['refund-cancel'] = x => { sl2Ensure(); const p = S.pays.find(y => y.id === pid(x)); if (!p || !p.refund || p.refund.state !== '신청') return; p.status = '결제 완료'; delete p.refund; grantFor(p, 'restore'); logAudit(`환불 신청 취소 — ${p.item}`); };
  LPX['bill-pay'] = x => { sl2Ensure(); const b = S.bills.find(y => y.id === x.data.billId); if (billPaid(b, 'online', x.data.method)) logAudit(`청구서 납부 — ${M(b.who)?.name} · ${b.title}`); };
  LPX['sub-cancel'] = x => { sl2Ensure(); const s = S.subs.find(y => y.id === x.data.subId) || S.subs.find(y => y.cls === x.data.cls && y.who === who(x)?.id && y.status === '구독중'); if (!s || s.status !== '구독중') return; s.status = '해지 예약'; s.end = s.next; logAudit(`구독 취소(해지 예약) — ${C(s.cls)?.name}`); };
  LPX['book-dl'] = x => { sl2Ensure(); const m = who(x); const b = S.books.find(y => y.id === x.data.bookId); if (!m || !b) return; const g = (b.grants || []).find(y => y.who === m.id && !y.off); if (!g) return; g.dl = (g.dl || 0) + 1; g.last = today(); };
  LPX['book-ship'] = x => { sl2Ensure(); const m = who(x); const b = S.books.find(y => y.id === x.data.bookId); if (!m || !b) return; b.ship = b.ship || []; const s = b.ship.find(y => y.who === m.id); if (s && !s.done) s.memo = String(x.data.memo || '').slice(0, 300); else if (!s) b.ship.push({ who: m.id, done: false, memo: String(x.data.memo || '').slice(0, 300) }); };
  LPX['book-free'] = x => { sl2Ensure(); const m = who(x); const b = S.books.find(y => y.id === x.data.bookId); if (!m || !b || finalPrice(b) > 0) return; bookGrant(b, m.id, '', String(x.data.memo || '').slice(0, 300)); logAudit(`교재 신청(무료) — ${m.name} · ${b.name}`); };

  /* ── 학습자 게시본(판매 데이터) ── */
  /* v38 영상 길이(분): 시간 칸이 여러 이름으로 저장돼 '총 영상 시간 —'이던 것 — time · mins · cplMin · dur(초) · 유튜브 길이 */
function sl2VMin(i) { if (!i) return 0; if (+i.time > 0) return +i.time; if (+i.mins > 0) return +i.mins; if (+i.cplMin > 0) return +i.cplMin; const d = i.yt && i.yt.dur; if (typeof d === 'number' && d > 0) return Math.round(d / 60); if (typeof d === 'string' && /^\d+:\d{2}(:\d{2})?$/.test(d)) return Math.round(d.split(':').map(Number).reduce((a, x) => a * 60 + x, 0) / 60); if (+i.dur > 0) return Math.round(+i.dur / 60); return 0; }
function sl2Snap() { sl2Ensure(); const st = ST();
    const adm = id => (S.admins || []).find(a => a.id === id)?.name;
    const cls = S.classes.filter(c => c.status !== '종료' && (c.open || '전체') !== '비공개').map(c => { const its = c.curriculum || []; const vmin = its.filter(i => i.type === 'video').reduce((a, i) => a + sl2VMin(i), 0);
      return { id: c.id, name: c.name, kind: c.kind || 'period', sub: c.sub || '', price: +c.price || 0, final: finalPrice(c), discount: c.discount || null, recruit: c.recruit || null, early: !!c.early, period: c.period || (c.start ? { mode: 'range', start: c.start, end: c.end } : null), cat: c.cat || '', thumb: c.thumb && String(c.thumb).length < 280000 ? c.thumb : '', intro: (c.intro || []).slice(0, 6).map(i => ({ name: i.name, bio: String(i.bio || '').slice(0, 300), photo: i.photo && String(i.photo).length < 280000 ? i.photo : '' })), teachers: (c.teachers || []).map(adm).filter(Boolean).concat(c.teachers && c.teachers.length ? [] : [c.teacher].filter(Boolean)), legal: !!c.legal, open: c.open || '전체', openTo: (c.openTo || []).slice(0, 500), n: (c.learners || []).length, desc: String(c.desc || '').slice(0, 1200), items: its.filter(i => i.type !== 'chapter' && i.type !== 'offline').length, off: its.filter(i => i.type === 'offline').length, /* v38 오프라인 수업 수도 따로(강의 수 3개 ↔ 배우는 내용 8개, QA V14) */ /* v35.3: 강의 수는 내용이 있는 항목만(단원 · 회차 일정 제외) */ vmin, thr: (c.criteria && c.criteria.threshold) || 80, subsc: c.subsc || null, saleEnd: c.saleEnd || (c.subsc && c.subsc.saleEnd) || '', sessions: (c.sessions || []).length, tossTemp: !!c.tossTemp, status: c.status }; });
    const books = S.books.filter(b => (b.open || '전체') !== '비공개').map(b => ({ id: b.id, name: b.name, kind: b.kind, price: +b.price || 0, final: finalPrice(b), discount: b.discount, intro: String(b.intro || '').slice(0, 3000), authors: (b.authors || []).slice(0, 6), thumb: b.thumb && String(b.thumb).length < 280000 ? b.thumb : '', open: b.open || '전체', openTo: (b.openTo || []).slice(0, 500), file: b.file ? { name: b.file.name, size: b.file.size } : null, dl: b.dl, req: b.req }));
    return { v: 1, at: nowStr(), pg: { use: payPG(), toss: tossOK(), pending: st.pg === 'toss' && tossPend(), intl: tossOK(), name: PGN[payPG()] }, policy: { refundDays: 7, text: String((st.terms && st.terms.tos) || '').slice(0, 2000) }, cats: (S.cats || []).map(x => ({ id: x.id, name: x.name, parent: x.parent || null, order: x.order || 0 })), classes: cls, books };
  }
  window.sl2Snap = sl2Snap;
  { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { r.shop = sl2Snap(); } catch (e) { console.error(e); } return r; }; }
  let last = '';
  AFTER.push(() => { try { if (!S || !S.org || !S.lsite || !S.lsite.pub) return; const s = sl2Snap(); const j = JSON.stringify({ ...s, at: '' }); if (j !== last) { last = j; S.lsite.pub.shop = s; save(); } } catch (e) { console.error(e); } });
  AFTER.unshift(() => { try { if (S && S.org) sl2Ensure(); } catch (e) { console.error(e); } });
})();
