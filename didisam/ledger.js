/* v41 통합 수납 원장 — 스튜디오(운영자) 「매출 · 수납」 화면. 메뉴 id 'ledger'(공간 ops).
   상단: 단위 선택(본사 → 가맹점 · 부서 · 시설, 롤업) · AI 요약 한 줄 · 카드 4(순매출 · 수납률 · 미수 · 환불).
   탭: 오늘 할 일 · 원장 · 청구 · 미납 · 현장 수납 · 환불 · 마감 · 가져오기 · 쉐어 · 설정. 기관 성격별 기본 탭 순서(09 문서 5절).
   시연판: 브라우저 문서 S.ledger. 운영(live.js): /api/ledger/* 가 주인(09 문서 3절).
   계산은 ledgercalc.js(window.ledgerCalc) — 서버 · Java와 같은 규칙. index.html에서 ledgercalc.js → ledger.js 순, boot.js 앞.
   돈이 나가거나 연락이 가는 동작(환불 확정 · 청구 안내 · 청구서 링크 · 대사 확정 · 일괄 청구 확정)은 확인 카드 후 실행. */
(function () {
  'use strict';
  if (typeof MENU === 'undefined' || typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;
  const LC = () => window.ledgerCalc;
  const LIVEON = () => typeof LIVE !== 'undefined' && LIVE && LIVE.tenant && typeof api === 'function';
  const dPlus = (d, n) => { const t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() + n); return ymdL(t); };
  const dDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);
  const ymOf = d => String(d).slice(0, 7);
  const ymPlus = (ym, n) => { const [y, m] = ym.split('-').map(Number); const t = new Date(y, m - 1 + n, 1); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };
  const lastDay = ym => { const [y, m] = ym.split('-').map(Number); return ym + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0'); };
  const id8 = p => p + Math.random().toString(36).slice(2, 10);
  const idem = () => 'ui_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const tail = s => String(s || '').slice(-4);
  const who = sid => `학습자 ···${tail(sid) || '----'}`;
  const amt = v => Math.round(+String(v == null ? '' : v).replace(/[^\d-]/g, '') || 0);
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ('0000000' + (h >>> 0).toString(16)).slice(-8); };

  const UKIND = { hq: '본사', branch: '가맹점', dept: '부서', facility: '시설' };
  const ITEM = { tuition: '수강료', book: '교재비', facility: '시설 이용료', pass: '이용권', rental: '대여', program: '프로그램', event: '행사', etc: '기타' };
  const METH = { online_card: '온라인 카드', online_transfer: '온라인 계좌이체', desk_card: '카드(데스크)', cash: '현금', transfer: '계좌이체', vbank_ext: '가상계좌', voucher: '바우처' };
  const CH = { toss: '토스', desk: '데스크', import: '파일 가져오기', manual: '직원 입력' };
  const RULE = { hakwon_law: '학원법 반환 기준', lifelong_law: '평생교육법 반환 기준', session: '잔여 회차 비율', org_fault: '기관 사유(잔여분)', remote: '원격(수강분 공제)', book: '교재 · 재료비', full: '전액 환불', none: '환불 없음', manual: '직원 확인(원금)', facility: '시설 규정' };
  const IMPK = { vbank: '가상계좌 입금 내역', van: 'VAN 매입 내역', toss_settle: '토스 정산 내역' };
  const STG = [['s1', '1단계 안내', 1, 7], ['s2', '2단계 재안내', 8, 30], ['s3', '3단계 전화 · 상담', 31, 9999]]; /* 서버 today: d1 · d8 · d31 */
  const CST = { open: ['미납', 'bad'], partial: ['일부 수납', 'warn'], paid: ['수납 완료', 'ok'], void: ['취소', 'off'] };
  const RST = { paid: ['완료', 'ok'], ready: ['결제 대기', 'wait'], failed: ['실패', 'bad'], cancelled: ['정정 · 취소', 'off'] };
  const FST = { pending: ['확정 대기', 'warn'], done: ['환불 완료', 'ok'], cancelled: ['취소', 'off'] };
  const st = (M, s) => { const x = M[s] || [s, '']; return `<span class="lg-st ${x[1]}">${esc(x[0])}</span>`; };

  /* 기관 성격 → 기본 탭 순서(09 문서 5절) */
  const TABN = { today: '오늘 할 일', book: '원장', charge: '청구', unpaid: '미납', desk: '현장 수납', refund: '환불', close: '마감', import: '가져오기', share: '쉐어', set: '설정' };
  const FLAV = {
    franchise: { n: '프랜차이즈 본사', order: ['charge', 'unpaid', 'today', 'book', 'desk', 'refund', 'close', 'import', 'share', 'set'] },
    univ: { n: '대학(부서 정산)', order: ['book', 'import', 'today', 'charge', 'unpaid', 'desk', 'refund', 'close', 'share', 'set'] },
    sports: { n: '체육시설', order: ['today', 'close', 'desk', 'book', 'refund', 'charge', 'unpaid', 'import', 'share', 'set'] },
    welfare: { n: '복지관', order: ['desk', 'close', 'today', 'book', 'refund', 'charge', 'unpaid', 'import', 'share', 'set'] },
    std: { n: '일반', order: ['today', 'book', 'charge', 'unpaid', 'desk', 'refund', 'close', 'import', 'share', 'set'] }
  };
  const flavorFor = type => type === 'univ' ? 'univ' : type === 'public' ? 'sports' : (type === 'k12' || type === 'adult') ? 'franchise' : type === 'lifelong' ? 'welfare' : 'std';
  const UNIT_TPL = {
    franchise: ['hq', '본사', [['branch', '해운대점'], ['branch', '서면점'], ['branch', '동래점']]],
    univ: ['hq', '대학 본부', [['dept', '평생교육원'], ['dept', '국제교류처'], ['facility', '체육시설']]],
    sports: ['hq', '공단 본부', [['facility', '수영장'], ['facility', '헬스장']]],
    welfare: ['hq', '복지관', [['dept', '본관 데스크'], ['dept', '별관 데스크']]],
    std: ['hq', '본원', [['branch', '분원']]]
  };
  const ITEMS_BY = { franchise: [['tuition', '월 수강료', 280000], ['book', '교재비', 25000]], univ: [['program', '비교과 프로그램', 120000], ['facility', '시설 이용료', 30000]], sports: [['pass', '월이용권', 70000], ['program', '수영 강습', 90000]], welfare: [['program', '프로그램 이용료', 30000], ['etc', '재료비', 10000]], std: [['tuition', '수강료', 200000], ['book', '교재비', 20000]] };

  /* ── 시연 데이터 ── */
  function rng(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
  function seedDemo(D) {
    const R = rng(41), td = today(), ym = ymOf(td), pym = ymPlus(ym, -1), fl = D.flavor; const [rk, rn, kids] = UNIT_TPL[fl] || UNIT_TPL.std;
    const root = { id: 'lu_root', parentId: null, kind: rk, name: rn, tossMid: '', hasKey: false, shareRateBp: 40, active: true, sort: 0 };
    D.units = [root, ...kids.map(([k, n], i) => ({ id: 'lu_' + (i + 1), parentId: root.id, kind: k, name: n, tossMid: '', hasKey: false, shareRateBp: 40, active: true, sort: i + 1 }))];
    const leaf = D.units.filter(u => u.id !== root.id); const items = ITEMS_BY[fl] || ITEMS_BY.std; let n = 0;
    leaf.forEach((u, ui) => { for (let j = 0; j < 9; j++) { const sid = (fl === 'univ' ? '2025' : '7') + String(1000 + ui * 97 + j * 13).slice(-4) + String(j);
      [pym, ym].forEach((p, pi) => { const bill = id8('b'); const due = p + '-10'; const created = p + '-01 09:00';
        const L = [{ t: items[0], a: items[0][2] }]; if (R() < .4) L.push({ t: items[1], a: items[1][2] }); if (R() < .2) L.push({ t: ['etc', '형제 할인', 0], a: -Math.round(items[0][2] * .1) });
        const C = L.map(x => ({ id: 'lc_' + (++n) + id8(''), unitId: u.id, sid, itemType: x.t[0], title: x.t[1], amount: x.a, periodYm: p, dueDate: due, srcType: 'class', srcId: 'demo', status: 'open', createdAt: created, bill }));
        D.charges.push(...C); const tot = C.reduce((s, c) => s + c.amount, 0);
        const late = pi === 1 ? R() : R() * .3; if (late < .62) { const meth = fl === 'welfare' || fl === 'sports' ? (R() < .55 ? 'desk_card' : R() < .5 ? 'cash' : 'online_card') : (R() < .6 ? 'online_card' : R() < .5 ? 'vbank_ext' : 'desk_card');
          const day = pi === 1 ? dPlus(td, -Math.floor(R() * Math.max(1, +td.slice(8) - 1))) : dPlus(due, -Math.floor(R() * 8)); const part = pi === 1 && R() < .12; postReceipt(D, { unitId: u.id, sid, method: meth, amount: part ? Math.round(tot / 2) : tot, paidAt: day + ' ' + (9 + Math.floor(R() * 9)) + ':' + String(Math.floor(R() * 6) * 10).padStart(2, '0'), approvalNo: meth === 'desk_card' ? String(30000000 + Math.floor(R() * 9e6)) : '', cardIssuer: meth === 'desk_card' ? ['신한', '국민', '현대', '삼성'][Math.floor(R() * 4)] : '', recordedBy: meth.startsWith('online') ? '토스' : '데스크', chargeIds: C.map(c => c.id) }); } }); } });
    /* 환불 1건 확정 대기 · 1건 완료, 가져오기 미일치 2건, 어제 마감 안 함 */
    const pr = D.receipts.filter(r => r.status === 'paid' && r.method === 'online_card'); if (pr[0]) D.refunds.push({ id: 'lr_demo1', receiptId: pr[0].id, amount: LC().floor10(pr[0].amount * 2 / 3), ruleType: 'hakwon_law', calc: { lines: [{ label: '1개월 차 1/3 경과 전 2/3', amount: LC().floor10(pr[0].amount * 2 / 3) }], lawCheck: true }, autoAmount: LC().floor10(pr[0].amount * 2 / 3), editReason: '', status: 'pending', tossCancelOk: false, byStaff: '', at: td + ' 09:40' });
    if (pr[1]) D.refunds.push({ id: 'lr_demo2', receiptId: pr[1].id, amount: pr[1].amount, ruleType: 'full', calc: { lines: [{ label: '전액', amount: pr[1].amount }] }, autoAmount: pr[1].amount, editReason: '', status: 'done', tossCancelOk: true, byStaff: '데스크', at: dPlus(td, -2) + ' 15:10' });
    D.imports.push({ id: 'li_demo', kind: 'vbank', fileName: '가상계좌_' + dPlus(td, -1) + '.csv', rows: 6, matched: 4, unmatched: [{ day: dPlus(td, -1), amount: 305000, ref: '김*', reason: 'key' }, { day: dPlus(td, -1), amount: 140000, ref: leaf[0] ? '70' : '', reason: 'amount' }], byStaff: '데스크', at: dPlus(td, -1) + ' 17:00' });
    for (let d = 2; d <= 6; d++) { const day = dPlus(td, -d); leaf.forEach(u => { const s = sysCash(D, u.id, day); if (s.cash || s.card) D.closes.push({ id: id8('lk_'), unitId: u.id, day, cashSystem: s.cash, cashCounted: s.cash, cardSystem: s.card, cardCounted: s.card, diffReason: '', closedBy: '데스크', closedAt: day + ' 18:30' }); }); }
    D.devices.push({ id: 'ld_demo', unitId: (leaf[0] || root).id, label: '데스크 1번 단말(모의)', mode: 'mock', lastSeen: td + ' 08:55' });
  }
  function ledDefault(type) { const D = { v: 41, on: true, flavor: flavorFor(type), units: [], charges: [], receipts: [], allocs: [], refunds: [], closes: [], links: [], imports: [], devices: [], notes: [] }; if (LIVEON()) D.live = 1; else seedDemo(D); return D; }
  function ensure() { if (!S || !S.org) return null; if (!S.ledger || !Array.isArray(S.ledger.units)) S.ledger = ledDefault(S.org.type); const D = S.ledger;
    ['units', 'charges', 'receipts', 'allocs', 'refunds', 'closes', 'links', 'imports', 'devices', 'notes'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; });
    /* 운영 모드: 기관 문서에는 켜짐 · 기관 성격만 둔다(원장 기록은 서버 표가 주인, 시연 데이터를 문서에 싣지 않음) */
    if (LIVEON() && !D.live) { ['charges', 'receipts', 'allocs', 'refunds', 'closes', 'links', 'imports', 'devices', 'notes'].forEach(k => { D[k] = []; }); D.units = []; D.live = 1; } if (!FLAV[D.flavor]) D.flavor = flavorFor(S.org.type);
    if (!D.units.some(u => !u.parentId)) D.units.unshift({ id: 'lu_root', parentId: null, kind: 'hq', name: S.org.name || '본사', shareRateBp: 40, active: true, sort: 0 }); return D; }
  window.ledgerEnsure = ensure;
  const L = () => ensure();
  /* 시연판 학습자 이벤트(lledger.js lpxPush) → 원장. 수납 번호는 학습자 화면과 같게 두어 학습자 쪽에서 중복으로 보이지 않게 한다 */
  if (typeof LPX !== 'undefined') {
    const payIn = (x, link) => { const D = L(); if (!D || D.live) return; const d = x.data || {}; const rid = String(d.receiptId || ''); if (!rid || D.receipts.some(r => r.id === rid)) return;
      const ids = (d.chargeIds || []).map(String).filter(id => D.charges.some(c => c.id === id)); if (!ids.length) return; const c0 = D.charges.find(c => c.id === ids[0]);
      const R = postReceipt(D, { unitId: c0.unitId, sid: c0.sid, method: 'online_card', amount: Math.round(+d.amount || 0), chargeIds: ids, paidAt: String(x.at || '').replace('T', ' ').slice(0, 16) || nowStr(), recordedBy: link ? '청구서 링크' : '학습자 앱', idem: 'lpx_' + rid });
      if (R.receipt && !R.dup) { const old = R.receipt.id; R.receipt.id = rid; D.allocs.forEach(a => { if (a.receiptId === old) a.receiptId = rid; }); }
      if (link && d.tokenHash) D.links.forEach(l => { if (l.tokenHash === d.tokenHash && !l.usedAt) l.usedAt = nowStr(); }); };
    LPX['ledger-pay'] = x => payIn(x, false); LPX['ledger-bill-pay'] = x => payIn(x, true);
    LPX['ledger-refund-req'] = x => { const D = L(); if (!D || D.live) return; const d = x.data || {}; const r = D.receipts.find(z => z.id === String(d.receiptId || '')); if (!r) return; D.notes.unshift({ at: nowStr(), sid: r.sid || x.who || '', stage: 'refund_req', text: `학습자 환불 요청 — 수납 ${r.id} · ${won(r.amount)}${d.reason ? ` · 사유: ${String(d.reason).slice(0, 300)}` : ''} (환불 탭에서 계산 후 확정)` }); };
  }

  /* 시연판 기록(서버 mod-admin과 같은 규칙: 잔액 초과 거절 · 오래된 청구부터 배분 · 상태 갱신) */
  /* ledgercalc 입력 형식(09 문서 4절 · ledgercalc.js 머리말)으로 바꾸는 곳은 여기 한 곳 */
  const cIn = c => ({ id: c.id, bill: c.bill || c.id, amount: c.amount, due: c.dueDate || '', at: c.createdAt || '', status: c.status });
  const aIn = a => ({ charge: a.chargeId, amount: a.amount });
  const calcUnits = () => units().map(u => ({ id: u.id, parent: u.parentId || null, shareRateBp: u.shareRateBp == null ? 40 : u.shareRateBp }));
  const lineTxt = L0 => (L0 || []).map(l => typeof l === 'string' ? l : `${l.label} ${l.amount < 0 ? '−' : ''}${won(Math.abs(l.amount || 0))}`);
  function balMap(D, charges) { const bills = new Set(charges.map(c => c.bill || c.id)); const C = D.charges.filter(c => bills.has(c.bill || c.id)); const ids = new Set(C.map(c => c.id));
    const b = LC().balance(C.map(cIn), D.allocs.filter(a => ids.has(a.chargeId)).map(aIn)); const byCharge = {}, st = {}; b.lines.forEach(l => { byCharge[l.id] = l.balance; st[l.id] = l.status; });
    const want = new Set(charges.map(c => c.id)); return { total: b.lines.filter(l => want.has(l.id)).reduce((s0, l) => s0 + l.balance, 0), byCharge, st, lines: b.lines }; }
  function balOf(D, ids) { return balMap(D, D.charges.filter(c => ids.includes(c.id) && c.status !== 'void')); }
  function refreshStatus(D, ids) { const m = balOf(D, ids); D.charges.forEach(c => { if (c.status !== 'void' && m.st[c.id]) c.status = m.st[c.id]; }); }
  function openOf(D, sid, unitId) { return D.charges.filter(c => c.sid === sid && (!unitId || c.unitId === unitId) && c.status !== 'void' && c.status !== 'paid'); }
  function postReceipt(D, b) { const ids = b.chargeIds && b.chargeIds.length ? b.chargeIds : openOf(D, b.sid, b.unitId).map(c => c.id); const B = balOf(D, ids); if (b.amount > B.total) return { error: 'over_balance', balance: B.total };
    const open = B.lines.filter(l => l.balance > 0).map(l => ({ id: l.id, due: (D.charges.find(c => c.id === l.id) || {}).dueDate || '', at: (D.charges.find(c => c.id === l.id) || {}).createdAt || '', balance: l.balance }));
    const r = { id: id8('lp_'), unitId: b.unitId, sid: b.sid || null, method: b.method, channel: b.method.startsWith('online') ? 'toss' : b.method === 'vbank_ext' ? 'import' : 'desk', amount: b.amount, paidAt: b.paidAt || nowStr(), status: 'paid', approvalNo: b.approvalNo || '', cardIssuer: b.cardIssuer || '', installment: b.installment || 0, shareEligible: b.method.startsWith('online'), recordedBy: b.recordedBy || (S && S.me ? S.me.name : ''), diffReason: b.diffReason || '', idem: b.idem || idem() };
    if (D.receipts.some(x => x.idem === r.idem)) return { receipt: D.receipts.find(x => x.idem === r.idem), dup: true };
    D.receipts.push(r); LC().allocate(b.amount, open).allocs.forEach(a => D.allocs.push({ receiptId: r.id, chargeId: a.charge, amount: a.amount })); refreshStatus(D, ids); return { receipt: r }; }
  function sysCash(D, unitId, day) { const R = D.receipts.filter(r => r.unitId === unitId && r.status === 'paid' && String(r.paidAt).slice(0, 10) === day); return { cash: R.filter(r => r.method === 'cash').reduce((s, r) => s + r.amount, 0), card: R.filter(r => r.method === 'desk_card').reduce((s, r) => s + r.amount, 0) }; }

  /* ── 메뉴 · 프리셋 · 기존 저장 사용자 ── */
  MENU.ledger = { label: '매출 · 수납', ws: 'ops' };
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; if (!P.on.includes('ledger') && !P.off.includes('ledger')) P.on.push('ledger'); });
  if (typeof window.slimEss === 'function') { const base = window.slimEss; window.slimEss = (...a) => { const E = base(...a) || []; try { if (S && S.org && !(S.org.type === 'univ' && S.org.ed === 'lms') && MENU.ledger && !E.includes('ledger')) return [...E, 'ledger']; } catch (e) { } return E; }; }
  if (typeof DICT !== 'undefined') Object.assign(DICT, { '매출 · 수납': 'Revenue · Collections|売上・収納|营收 · 收款|Ingresos · Cobros|Revenus · Encaissements|Umsatz · Inkasso|Doanh thu · Thu tiền|รายได้ · การรับชำระ|Выручка · Оплаты' });
  if (typeof postSeed === 'function') { const base = postSeed; postSeed = (...a) => { const r = base(...a); try { ensure(); } catch (e) { console.error('ledger', e); } return r; }; } /* eslint-disable-line no-global-assign */
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org) { ensure(); if (typeof navAdd === 'function' && !Object.values(S.nav.tabs).some(T => (T || []).some(x => x.id === 'ledger'))) navAdd('ledger', true); } } catch (e) { console.error('ledger', e); } return r; }; } /* eslint-disable-line no-global-assign */
  /* 학습자 게시본에는 원장을 싣지 않는다(개인 청구는 /api/pub/<tid>/ledger-my 또는 시연판 학습자 화면이 S.ledger에서 직접 읽음) */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const pub = base(...a); try { if (pub && S && S.ledger) pub.ledger = { on: S.ledger.on !== false, payOnline: L().units.some(u => u.hasKey) }; } catch (e) { console.error('ledger pub', e); } return pub; }; } /* eslint-disable-line no-global-assign */

  /* ── 운영 서버(/api/ledger/*) ── */
  const LV = { key: '', d: {}, busy: false, err: '', errAt: 0 };
  const liveErr = e => `운영 서버의 매출 · 수납 기능에 연결하지 못했습니다${e && e.status ? `(${e.status}${e.code || e.error ? ' ' + (e.code || e.error) : ''})` : ''}. ${e && (e.code === 'ledger_off' || e.error === 'ledger_off') ? '기관 설정에서 매출 · 수납 모듈이 꺼져 있습니다. ' : ''}잠시 뒤 다시 시도하고, 계속되면 관리자에게 알려 주십시오.`;
  const ERRN = { over_balance: '남은 청구 금액보다 많이 받을 수 없습니다.', amount_mismatch: '금액이 서버 계산과 다릅니다. 화면을 새로 고쳐 주십시오.', ledger_off: '매출 · 수납 모듈이 꺼져 있습니다.', forbidden: '권한이 없습니다.' };
  const qs = o => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  function livePull() { const P = per(), u = curUnit(), tab = curTab(); const base = { from: P.from, to: P.to, unit: u, rollup: rollup() ? 1 : '' };
    const need = { units: ['GET', '/api/ledger/units'], sum: ['GET', '/api/ledger/summary?' + qs(base)], today: ['GET', '/api/ledger/today?' + qs({ unit: u })] };
    if (tab === 'book') need.ent = ['GET', '/api/ledger/entries?' + qs({ ...base, type: UI.ledT || '', q: UI.ledQ || '', page: UI.ledPg || 1 })];
    if (tab === 'charge') need.ent = ['GET', '/api/ledger/entries?' + qs({ ...base, type: 'charge' })];
    if (tab === 'unpaid' || tab === 'desk') need.ent = ['GET', '/api/ledger/entries?' + qs({ ...base, from: dPlus(today(), -365), type: 'charge' })];
    if (tab === 'refund') { need.ent = ['GET', '/api/ledger/entries?' + qs({ ...base, type: 'receipt', q: UI.ledRq || '' })]; need.ref = ['GET', '/api/ledger/refunds?status=pending']; need.refd = ['GET', '/api/ledger/entries?' + qs({ ...base, type: 'refund' })]; }
    if (tab === 'close') closeUnits().forEach(x => { need['close:' + x.id] = ['GET', '/api/ledger/close?' + qs({ unit: x.id, day: UI.ledDay || today() })]; });
    if (tab === 'share') need.share = ['GET', '/api/ledger/share?' + qs({ ym: P.ym, unit: u })];
    if (tab === 'set' || tab === 'desk') need.dev = ['GET', '/api/ledger/devices'];
    const key = JSON.stringify(need); if (LV.busy || (LV.key === key && (!LV.err || Date.now() - LV.errAt < 5000))) return; LV.busy = true; LV.key = key;
    const K = Object.keys(need); Promise.all(K.map(k => api(need[k][0], need[k][1]).catch(e => { if (k === 'units' || k === 'sum') throw e; return null; })))
      .then(R => { const d = {}; K.forEach((k, i) => { d[k] = R[i]; }); LV.d = d; LV.err = ''; }).catch(e => { LV.err = liveErr(e); LV.errAt = Date.now(); clearTimeout(LV.t); LV.t = setTimeout(() => { if (CUR.tab === 'ledger' && LV.err) render(); }, 5200); })
      .finally(() => { LV.busy = false; if (CUR.tab === 'ledger') render(); }); }
  const liveDo = (method, url, body, ok) => api(method, url, body).then(r => { LV.key = ''; if (ok) ok(r); render(); return r; }).catch(e => { const c = e && (e.code || e.error || (e.body && e.body.error)); toast(ERRN[c] || liveErr(e), 'warn'); throw e; });
  /* 서버 응답 → 화면 행(필드 이름 차이는 여기서만 흡수) */
  const mUnit = x => ({ id: x.id, parentId: x.parentId || x.parent_id || null, kind: x.kind, name: x.name, tossMid: x.tossMid || x.toss_mid || '', hasKey: !!(x.hasKey || x.has_key), shareRateBp: x.shareRateBp != null ? x.shareRateBp : x.share_rate_bp, active: x.active !== false, sort: +x.sort || 0 });
  const flatUnits = (A, F) => { if (Array.isArray(F) && F.length) return F.map(mUnit); const out = []; const walk = (L, p) => (L || []).forEach(x => { out.push(mUnit({ ...x, parentId: x.parentId || x.parent_id || p })); if (x.children) walk(x.children, x.id); }); walk(A, null); return out; };
  const mEnt = x => ({ id: x.id, kind: x.kind || x.type || (String(x.id).startsWith('lc_') ? 'charge' : String(x.id).startsWith('lr_') ? 'refund' : 'receipt'), unitId: x.unitId || x.unit || x.unit_id, bill: x.bill, paid: x.paid != null ? +x.paid : null, sid: x.sid || x.sidTail || '', title: x.title || '', itemType: x.itemType || x.item_type, method: x.method, amount: +x.amount || 0, balance: x.balance != null ? +x.balance : null, at: x.at || x.paidAt || x.paid_at || x.createdAt || x.created_at || '', dueDate: x.dueDate || x.due_date || '', periodYm: x.periodYm || x.period_ym || '', status: x.status, approvalNo: x.approvalNo || '', receiptId: x.receiptId || x.receipt || x.receipt_id, autoAmount: x.autoAmount != null ? +x.autoAmount : x.auto != null ? +x.auto : null, editReason: x.editReason || '', ruleType: x.ruleType || x.rule_type, calc: x.calc || null, channel: x.channel });
  const entL = k => { const r = LV.d[k]; return ((r && (r.entries || r.refunds || r.rows || r.list)) || []).map(mEnt); };

  /* ── 상태 · 범위 ── */
  const teacher = () => S.me && S.me.role === 'teacher';
  const owner = () => S.me && S.me.role === 'owner';
  const units = () => LIVEON() ? flatUnits((LV.d.units && LV.d.units.units) || [], LV.d.units && LV.d.units.flat) : L().units;
  const rootU = () => units().find(u => !u.parentId) || units()[0] || { id: '', name: '' };
  const unitById = id => units().find(u => u.id === id);
  const uname = id => (unitById(id) || { name: id || '-' }).name;
  const curUnit = () => (UI.ledU && unitById(UI.ledU)) ? UI.ledU : rootU().id;
  const rollup = () => UI.ledRoll !== false;
  const descend = (U, id) => { const D0 = new Set([id]); let g = true; while (g) { g = false; U.forEach(u => { if (u.parentId && D0.has(u.parentId) && !D0.has(u.id)) { D0.add(u.id); g = true; } }); } return D0; };
  const scope = () => rollup() ? descend(units(), curUnit()) : new Set([curUnit()]);
  const inScope = id => scope().has(id);
  const flavor = () => LIVEON() && LIVE.cfg && LIVE.cfg.ledgerFlavor ? LIVE.cfg.ledgerFlavor : L().flavor;
  const tabList = () => { const O = (FLAV[flavor()] || FLAV.std).order; return O.filter(t => !(teacher() && t === 'set') && !(t === 'share' && !owner())).map(t => [t, TABN[t]]); };
  const curTab = () => { const T = tabList(); return T.some(x => x[0] === UI.ledger) ? UI.ledger : T[0][0]; };
  function per() { const td = today(), ym = ymOf(td), p = UI.ledP || 'this';
    if (p === 'prev') { const m = ymPlus(ym, -1); return { p, ym: m, from: m + '-01', to: lastDay(m), label: '지난달' }; }
    if (p === 'q') { const m = ymPlus(ym, -2); return { p, ym, from: m + '-01', to: td, label: '최근 3개월' }; }
    return { p, ym, from: ym + '-01', to: td, label: '이번 달' }; }
  /* 시연판 요약 재료(행) */
  function demoRows() { const D = L(), rcp = {}; D.receipts.forEach(r => { rcp[r.id] = r; }); const B = balMap(D, D.charges.filter(c => c.status !== 'void')).byCharge;
    return [...D.charges.map(c => ({ kind: 'charge', id: c.id, unit: c.unitId, day: String(c.createdAt).slice(0, 10), amount: c.amount, itemType: c.itemType, balance: B[c.id] || 0, status: c.status })),
      ...D.receipts.map(r => ({ kind: 'receipt', id: r.id, unit: r.unitId, day: String(r.paidAt).slice(0, 10), amount: r.amount, method: r.method, status: r.status, shareEligible: r.shareEligible })),
      ...D.refunds.map(f => ({ kind: 'refund', id: f.id, unit: (rcp[f.receiptId] || {}).unitId, day: String(f.at).slice(0, 10), amount: f.amount, status: f.status, receipt: f.receiptId, shareEligible: !!(rcp[f.receiptId] || {}).shareEligible }))]; }
  function demoSum(unit, roll) { const P = per(); return LC().summary(demoRows(), { from: P.from, to: P.to, unit, rollup: roll, units: calcUnits() }); }
  function summary() { if (LIVEON()) { const s = LV.d.sum || {}; return { net: +s.net || 0, paid: +s.paid || 0, refund: +s.refund || 0, unpaid: +s.unpaid || 0, collectRate: +s.collectRate || 0, byMethod: s.byMethod || {}, byItem: s.byItem || {}, byUnit: s.byUnit || {}, daily: s.daily || [], share: s.share || { eligible: 0, estimate: 0 }, charged: +s.charged || 0, byUnitDetail: s.byUnitDetail || [] }; }
    return demoSum(curUnit(), rollup()); }
  /* 미납자(학습자별, 납기 지난 잔액) */
  function unpaidList() { const td = today(); let C;
    if (LIVEON()) C = entL('ent').filter(c => c.kind === 'charge' && inScope(c.unitId) && c.status !== 'void' && +c.balance > 0).map(c => ({ ...c, bal: +c.balance }));
    else { const D = L(); const B = balMap(D, D.charges.filter(c => c.status !== 'void')).byCharge; C = D.charges.filter(c => inScope(c.unitId) && c.status !== 'paid' && c.status !== 'void').map(c => ({ ...c, bal: B[c.id] })); }
    const by = {}; C.forEach(c => { const k = c.unitId + '|' + c.sid; const x = by[k] = by[k] || { sid: c.sid, unitId: c.unitId, bal: 0, due: '9999', ids: [] }; x.bal += c.bal; x.ids.push(c.id); if (c.amount > 0 && c.dueDate && c.dueDate < x.due) x.due = c.dueDate; });
    return Object.values(by).filter(x => x.bal > 0).map(x => { const days = x.due < '9999' ? dDiff(x.due, td) : 0; const s = STG.find(g => days >= g[2] && days <= g[3]); return { ...x, days, stage: days > 0 && s ? s[0] : '' }; }).sort((a, b) => b.days - a.days || b.bal - a.bal); }
  function todo() { if (LIVEON()) { const t = LV.d.today || {}; const u = t.unpaid || {}; const pp = u.people || {}, am = u.amount || {}; return { s1: +pp.d1 || 0, s2: +pp.d8 || 0, s3: +pp.d31 || 0, unpaidAmt: (+am.d1 || 0) + (+am.d8 || 0) + (+am.d31 || 0), unmatched: +(t.unmatched || 0), refunds: +(t.refundsPending || 0), unclosed: (Array.isArray(t.unclosed) ? t.unclosed : []).filter(x => !x.unit || inScope(x.unit)) }; }
    const D = L(), U = unpaidList(), td = today(); const cnt = s => U.filter(x => x.stage === s).length;
    const unm = D.imports.reduce((s, i) => s + (i.unmatched || []).filter(x => !x.done).length, 0);
    const rf = D.refunds.filter(f => f.status === 'pending' && inScope((D.receipts.find(r => r.id === f.receiptId) || {}).unitId)).length;
    const unc = []; for (let d = 1; d <= 6; d++) { const day = dPlus(td, -d); [...scope()].forEach(uid => { const s = sysCash(D, uid, day); if ((s.cash || s.card) && !D.closes.some(c => c.unitId === uid && c.day === day)) unc.push({ day, unitId: uid }); }); }
    return { s1: cnt('s1'), s2: cnt('s2'), s3: cnt('s3'), unpaidAmt: U.reduce((s, x) => s + x.bal, 0), unmatched: unm, refunds: rf, unclosed: unc }; }

  /* ── 화면 ── */
  VIEWS.ledger = () => { ensure(); if (LIVEON()) livePull(); const tab = curTab(); const P = per(); const sm = summary(); const t = todo(); const U = units();
    const opt = (u, dep) => `<option value="${esc(u.id)}" ${u.id === curUnit() ? 'selected' : ''}>${'　'.repeat(dep)}${esc(u.name)} (${esc(UKIND[u.kind] || u.kind)})</option>`;
    const tree = []; const walk = (p, dep) => U.filter(u => (u.parentId || null) === p).sort((a, b) => (a.sort || 0) - (b.sort || 0)).forEach(u => { tree.push(opt(u, dep)); walk(u.id, dep + 1); }); walk(null, 0);
    const hasKids = U.some(u => u.parentId === curUnit());
    const bar = `<div class="lg-top"><label class="lg-unit"><span>단위</span><select data-chg="led-unit" aria-label="단위 선택">${tree.join('')}</select></label>
      <div class="lg-seg" role="group" aria-label="합산 범위"><button class="${rollup() ? 'on' : ''}" data-act="led-roll" data-v="1" aria-pressed="${rollup()}" ${hasKids ? '' : 'disabled'}>하위 합산</button><button class="${rollup() ? '' : 'on'}" data-act="led-roll" data-v="0" aria-pressed="${!rollup()}" ${hasKids ? '' : 'disabled'}>이 단위만</button></div>
      <div class="lg-per" role="group" aria-label="기간">${[['this', '이번 달'], ['prev', '지난달'], ['q', '최근 3개월']].map(([k, l]) => `<button class="lg-chip ${P.p === k ? 'on' : ''}" data-act="led-per" data-v="${k}" aria-pressed="${P.p === k}">${l}</button>`).join('')}</div></div>`;
    const totU = t.s1 + t.s2 + t.s3; const urgent = t.refunds ? 'refund' : t.s3 || t.s2 ? 'unpaid' : t.unclosed.length ? 'close' : t.unmatched ? 'import' : 'today';
    const ai = `<div class="lg-ai" role="status"><span class="lg-ai-b">AI 요약</span><p>${esc(P.label)} 순매출 ${won(sm.net)}, 수납률 ${sm.collectRate}%입니다. ${totU ? `미납 ${totU}명 ${won(t.unpaidAmt)} 중 2단계 이상 ${t.s2 + t.s3}명입니다.` : '납기 지난 미납은 없습니다.'}${t.refunds ? ` 확정 대기 환불 ${t.refunds}건이 있습니다.` : ''}${t.unclosed.length ? ` 마감하지 않은 날이 ${new Set(t.unclosed.map(x => x.day || x)).size}일 있습니다.` : ''}</p>${urgent !== 'today' ? `<button class="btn sm" data-act="tab" data-key="ledger" data-v="${urgent}">${esc(TABN[urgent])} 보기</button>` : ''}</div>`;
    const card = (l, v, sub, tone) => `<div class="lg-kpi ${tone || ''}"><span>${esc(l)}</span><b>${v}</b><small>${sub}</small></div>`;
    const kp = `<div class="lg-kpis">${card('순매출', won(sm.net), `수납 ${won(sm.paid)} − 환불 ${won(sm.refund)}`)}${card('수납률', sm.collectRate + '%', `청구 ${won(sm.charged || (sm.paid + sm.unpaid))} 기준`, sm.collectRate < 80 ? 'warn' : '')}${card('미수', won(sm.unpaid), `${esc(P.label)} 청구 중 미수납`, sm.unpaid ? 'bad' : '')}${card('환불', won(sm.refund), `환불 완료 기준`)}</div>`;
    const warn = LIVEON() && LV.err ? `<div class="lg-err" role="alert">${esc(LV.err)}</div>` : ''; const ro = teacher() ? '<p class="lg-ro">교강사 권한은 조회만 할 수 있습니다.</p>' : '';
    let body = ''; try { body = ({ today: vToday, book: vBook, charge: vCharge, unpaid: vUnpaid, desk: vDesk, refund: vRefund, close: vClose, import: vImport, share: vShare, set: vSet })[tab](sm, t); } catch (e) { console.error('ledger view', e); body = `<div class="empty">화면을 그리지 못했습니다: ${esc(e.message)}</div>`; }
    return `<div class="lg">${bar}${warn}${ai}${kp}${ro}${tabs('ledger', tabList(), tab)}<div class="lg-body" data-tab="${tab}">${body}</div><p class="lg-foot">숫자 기준: ${esc(P.from)} ~ ${esc(P.to)} · ${esc(uname(curUnit()))}${rollup() ? ' 및 하위 단위' : ''} · 원장 요약 함수 하나로 계산${LIVEON() ? ' · 운영 서버' : ' · 시연판'}</p></div>`; };
  ACT['led-unit'] = el => { UI.ledU = el.value; LV.key = ''; render(); };
  ACT['led-roll'] = el => { UI.ledRoll = el.dataset.v === '1'; LV.key = ''; render(); };
  ACT['led-per'] = el => { UI.ledP = el.dataset.v; LV.key = ''; render(); };
  const ro = () => teacher();
  const B = (act, label, v, kind) => ro() ? '' : `<button class="btn sm ${kind || ''}" data-act="${act}"${v != null ? ` data-v="${esc(v)}"` : ''}>${esc(label)}</button>`;

  /* 단위 비교(본사 → 가맹점 · 부서): 시안 1 「가맹점 비교」 */
  function unitCompare(sm) { const kids = units().filter(u => u.parentId === curUnit()); if (!kids.length) return ''; const y = dPlus(today(), -1); const srt = UI.ledCmp || 'rate';
    const R = kids.map(u => { if (LIVEON()) { const x = (sm.byUnitDetail || []).find(d => d.unitId === u.id) || {}; return { u, charged: +x.charged || 0, paid: +x.paid || 0, rate: +x.charged > 0 ? +x.collectRate : null, unpaid: +x.unpaid || 0, net: +x.net || 0, online: null, closed: null }; } const x = demoSum(u.id, true); const on = (x.byMethod.online_card || 0) + (x.byMethod.online_transfer || 0); const D = L(); const lf = [...descend(units(), u.id)];
      const need = lf.filter(id => { const c = sysCash(D, id, y); return c.cash || c.card; }); const closed = need.every(id => D.closes.some(k => k.unitId === id && k.day === y));
      return { u, charged: x.charged, paid: x.paid, rate: x.charged > 0 ? x.collectRate : null, unpaid: x.unpaid, net: x.net, online: x.paid ? Math.round(on * 100 / x.paid) : 0, closed: need.length ? closed : null }; });
    R.sort((a, b) => srt === 'name' ? a.u.name.localeCompare(b.u.name) : srt === 'net' ? b.net - a.net : (a.rate == null ? 0 : a.rate) - (b.rate == null ? 0 : b.rate));
    const f = v => v == null ? '—' : won(v); const nm = flavor() === 'univ' ? '부서' : flavor() === 'sports' || flavor() === 'welfare' ? '시설 · 데스크' : '가맹점';
    const chip = (k, l) => `<button class="${srt === k ? 'on' : ''}" data-act="led-cmp" data-v="${k}" aria-pressed="${srt === k}">${l}</button>`;
    return `<div class="lg-card"><div class="lg-ch"><b>${nm}별 수납</b>${LIVEON() ? '' : `<div class="lg-seg sm" role="group" aria-label="정렬">${chip('rate', '수납률 낮은 순')}${chip('net', '매출 순')}${chip('name', '이름 순')}</div>`}</div>`
      + table([nm, '청구', '수납', '수납률', '미수', '온라인 비중', '어제 마감'], R.map(x => [`<b>${esc(x.u.name)}</b>`, f(x.charged), f(x.paid), x.rate == null ? '—' : `<span class="lg-rate ${x.rate < 90 ? 'low' : ''}"><i style="width:${Math.max(0, Math.min(100, x.rate))}%"></i></span>${x.rate}%${x.rate < 90 ? ' <span class="lg-st warn">낮음</span>' : ''}`, x.unpaid ? `<span class="lg-amt ${x.rate < 90 ? 'warnc' : ''}">${won(x.unpaid)}</span>` : f(x.unpaid), x.online == null ? '—' : x.online + '%', x.closed == null ? (LIVEON() ? '—' : '<small>현장 수납 없음</small>') : x.closed ? '<span class="lg-st ok">마감</span>' : '<span class="lg-st warn">미마감</span>']), '하위 단위가 없습니다.') + '</div>'; }
  ACT['led-cmp'] = el => { UI.ledCmp = el.dataset.v; render(); };
  /* 1. 오늘 할 일 */
  function vToday(sm, t) { sm = sm || summary(); const td = today(); const row = (n, l, sub, tab, tone, act) => `<div class="lg-do ${n ? tone : ''}"><b>${n}</b><div><strong>${esc(l)}</strong><small>${sub}</small></div>${act || `<button class="btn sm" data-act="tab" data-key="ledger" data-v="${tab}">열기</button>`}</div>`;
    const days = [...new Set(t.unclosed.map(x => x.day || x))];
    return headD('오늘 할 일', 'AI가 미납 단계 · 대사 · 환불 · 마감을 모아 보여 줍니다. 안내 발송과 환불은 확인 카드를 거쳐 실행합니다.', '')
      + (rollup() ? unitCompare(sm) : '') + `<div class="lg-dos">${STG.map(([k, l, a, b]) => row(t[k], `미납 ${l}`, `납기 후 ${a}${b < 9999 ? '~' + b : '일 이상'}${b < 9999 ? '일' : ''}`, 'unpaid', k === 's1' ? 'warn' : 'bad', t[k] && !ro() ? `<button class="btn sm pri" data-act="led-dun" data-v="${k}">안내 보내기</button>` : '')).join('')}
      ${row(t.unmatched, '대사 미일치', '가져온 입금 · 매입 내역 중 수납과 맞지 않은 줄', 'import', 'warn')}${row(t.refunds, '환불 확정 대기', '규정 계산이 끝나 직원 확인을 기다리는 환불', 'refund', 'warn')}${row(days.length, '미마감', days.length ? days.slice(0, 3).join(', ') + (days.length > 3 ? ' 외' : '') : `최근 6일 모두 마감(${td} 오늘 마감은 영업 종료 후)`, 'close', 'warn')}</div>`; }
  /* 미납 안내(연락) — 확인 카드 */
  ACT['led-dun'] = el => { const k = el.dataset.v; const T = unpaidList().filter(x => !k || x.stage === k || (k === 'sel' && (UI.ledSel || []).includes(x.unitId + '|' + x.sid))); if (!T.length) return toast('안내할 대상이 없습니다.', 'warn'); const g = STG.find(x => x[0] === k);
    const msg = `[${S.org.name}] 납부 기한이 지난 청구가 있어 안내드려요. 아래 링크에서 청구서를 확인하고 결제할 수 있어요.`;
    modal('미납 안내 보내기', `<p><b>${T.length}명</b>에게 ${g ? esc(g[1]) + ' ' : ''}안내를 보냅니다. 합계 ${won(T.reduce((s, x) => s + x.bal, 0))}.</p><div class="lg-msg">${esc(msg)}<br><small>청구서 링크(72시간 유효)가 함께 갑니다.</small></div><ul class="lg-mini">${T.slice(0, 6).map(x => `<li>${esc(who(x.sid))} · ${esc(uname(x.unitId))} · ${won(x.bal)} · 납기 후 ${x.days}일</li>`).join('')}${T.length > 6 ? `<li>외 ${T.length - 6}명</li>` : ''}</ul><p class="lg-note">보내기 전 대상과 금액을 확인해 주십시오. 보낸 기록은 감사 기록에 남습니다.</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: `${T.length}명에게 보내기`, kind: 'pri', run: () => {
        if (LIVEON()) { Promise.all(T.map(x => api('POST', '/api/ledger/links', { chargeIds: x.ids, sid: x.sid, ttlHours: 72 }).catch(() => null))).then(R => { const n = R.filter(Boolean).length; logAudit(`미납 안내 — ${n}명 청구서 링크 발급`); toast(`${n}명의 청구서 링크를 만들었습니다. 알림 발송은 기관 알림 채널로 전달됩니다.`, 'ok'); LV.key = ''; render(); }); return; }
        const D = L(); T.forEach(x => { D.links.push({ tokenHash: hash(id8('t')), chargeIds: x.ids, sid: x.sid, expiresAt: dPlus(today(), 3), usedAt: '' }); D.notes.unshift({ at: nowStr(), sid: x.sid, stage: x.stage, text: msg }); });
        logAudit(`미납 안내 — ${T.length}명${g ? ' ' + g[1] : ''}`); save(); render(); toast(`${T.length}명에게 안내를 보냈습니다.`, 'ok'); } }]); };

  /* 2. 원장 */
  function bookRows() { const q = String(UI.ledQ || '').trim(), ty = UI.ledT || '', P = per();
    if (LIVEON()) return entL('ent');
    const D = L(); const rc = {}; D.receipts.forEach(r => { rc[r.id] = r; });
    const R = [...D.charges.map(c => ({ id: c.id, kind: 'charge', unitId: c.unitId, sid: c.sid, title: c.title, itemType: c.itemType, amount: c.amount, at: c.createdAt, status: c.status, periodYm: c.periodYm })),
      ...D.receipts.map(r => ({ id: r.id, kind: 'receipt', unitId: r.unitId, sid: r.sid, method: r.method, amount: r.amount, at: r.paidAt, status: r.status, approvalNo: r.approvalNo, channel: r.channel })),
      ...D.refunds.map(f => ({ id: f.id, kind: 'refund', unitId: (rc[f.receiptId] || {}).unitId, sid: (rc[f.receiptId] || {}).sid, method: (rc[f.receiptId] || {}).method, amount: f.amount, at: f.at, status: f.status, receiptId: f.receiptId }))];
    return R.filter(x => inScope(x.unitId) && String(x.at).slice(0, 10) >= P.from && String(x.at).slice(0, 10) <= P.to && (!ty || x.kind === ty) && (!q || String(x.sid).includes(q) || String(x.title || '').includes(q))).sort((a, b) => a.at < b.at ? 1 : -1); }
  const KN = { charge: '청구', receipt: '수납', refund: '환불' };
  function vBook(sm) { const R = bookRows(); const ty = UI.ledT || ''; const pg = Math.max(1, +UI.ledPg || 1), N = 40; const V = LIVEON() ? R : R.slice((pg - 1) * N, pg * N);
    const kidU = units().filter(u => scope().has(u.id) && u.id !== curUnit() || (!rollup() && u.id === curUnit()));
    const byU = flavor() === 'univ' || rollup() ? `<div class="lg-card"><div class="lg-ch"><b>${flavor() === 'univ' ? '부서별 정산' : '단위별 합계'}</b><small>${esc(per().label)}</small></div>${table(['단위', '청구', '수납', '환불', '순매출', '미수'], kidU.map(u => { const x = LIVEON() ? ((sm.byUnitDetail || []).find(d => d.unitId === u.id) || { net: +((sm.byUnit || {})[u.id]) || 0 }) : demoSum(u.id, true); const f = v => v == null ? '—' : won(v); return [esc(u.name) + ` <small>${esc(UKIND[u.kind] || '')}</small>`, f(x.charged), f(x.paid), f(x.refund), `<b>${won(x.net)}</b>`, f(x.unpaid)]; }), '하위 단위가 없습니다.')}</div>` : '';
    const chip = (k, l) => `<button class="lg-chip ${ty === k ? 'on' : ''}" data-act="led-ty" data-v="${k}" aria-pressed="${ty === k}">${l}</button>`;
    const rows = V.map(x => [esc(String(x.at).slice(0, 16)), esc(uname(x.unitId)), `<span class="lg-k ${x.kind}">${KN[x.kind] || x.kind}</span>`, esc(who(x.sid)), esc(x.kind === 'charge' ? (x.title || ITEM[x.itemType] || '') + (x.periodYm ? ` · ${x.periodYm}` : '') : (METH[x.method] || x.method || '') + (x.approvalNo ? ` · 승인 ${x.approvalNo}` : '')), `<span class="lg-amt ${x.kind === 'refund' || x.amount < 0 ? 'neg' : ''}">${x.kind === 'refund' ? '−' : ''}${won(Math.abs(x.amount))}</span>`, st(x.kind === 'charge' ? CST : x.kind === 'refund' ? FST : RST, x.status),
      x.kind === 'receipt' && x.status === 'paid' && !ro() ? `${B('led-ref-new', '환불', x.id)}${B('led-correct', '정정', x.id)}` : '']);
    return headD('원장', '청구 · 수납 · 환불을 시간순으로 한 줄씩 기록합니다. 기록은 지우지 않고 정정(반대 기록)으로 바로잡습니다.', `${B('led-export', 'CSV 내보내기')}`)
      + byU + `<div class="lg-bar">${chip('', '전체')}${chip('charge', '청구')}${chip('receipt', '수납')}${chip('refund', '환불')}<input class="lg-q" type="search" placeholder="학습자 번호 · 항목 검색" aria-label="학습자 번호 · 항목 검색" value="${esc(UI.ledQ || '')}" data-chg="led-q"></div>`
      + table(['일시', '단위', '구분', '학습자', '내용', '금액', '상태', ''], rows, '이 기간 · 단위에 기록이 없습니다.')
      + (!LIVEON() && R.length > N ? `<div class="lg-pg">${pg > 1 ? `<button class="btn sm" data-act="led-pg" data-v="${pg - 1}">이전</button>` : ''}<span>${pg} / ${Math.ceil(R.length / N)}쪽 · ${R.length}건</span>${pg * N < R.length ? `<button class="btn sm" data-act="led-pg" data-v="${pg + 1}">다음</button>` : ''}</div>` : ''); }
  ACT['led-ty'] = el => { UI.ledT = el.dataset.v; UI.ledPg = 1; LV.key = ''; render(); };
  ACT['led-q'] = el => { UI.ledQ = el.value; UI.ledPg = 1; LV.key = ''; render(); };
  ACT['led-pg'] = el => { UI.ledPg = +el.dataset.v; render(); };
  ACT['led-export'] = () => { const P = per(); if (LIVEON()) { const a = document.createElement('a'); a.href = (LIVE.base || '') + '/api/ledger/export?' + qs({ from: P.from, to: P.to, unit: curUnit() }); a.download = `매출수납_${P.from}_${P.to}.csv`; a.click(); return; }
    downloadCSV(`매출수납_${P.from}_${P.to}.csv`, ['일시', '단위', '구분', '학습자(끝 4자리)', '항목 · 수단', '금액', '상태'], bookRows().map(x => [String(x.at).slice(0, 16), uname(x.unitId), KN[x.kind], tail(x.sid), x.kind === 'charge' ? x.title : METH[x.method] || '', (x.kind === 'refund' ? -1 : 1) * x.amount, x.status])); logAudit(`매출 · 수납 CSV 내보내기 — ${P.from}~${P.to}`); };
  /* 수납 정정(반대 기록) */
  ACT['led-correct'] = el => { const id = el.dataset.v; modal('수납 정정', `<p>이 수납을 반대 기록으로 정정합니다. 원래 기록은 지우지 않고 남습니다. 카드 · 토스 결제를 실제로 취소하려면 [환불]을 쓰십시오.</p><label class="lg-fl"><span>정정 사유(필수)</span><input name="r" maxlength="80"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '정정 기록', kind: 'red', run: w => { const r = fv(w, 'r'); if (!r) { toast('정정 사유를 입력해 주십시오.', 'warn'); return false; }
      if (LIVEON()) { liveDo('POST', `/api/ledger/receipts/${encodeURIComponent(id)}/correct`, { reason: r, idem: idem() }, () => toast('정정했습니다.', 'ok')).catch(() => { }); return; }
      const D = L(); const x = D.receipts.find(y => y.id === id); if (!x) return; x.status = 'cancelled'; x.diffReason = r; const ids = D.allocs.filter(a => a.receiptId === id).map(a => a.chargeId); D.allocs.push(...D.allocs.filter(a => a.receiptId === id).map(a => ({ receiptId: id, chargeId: a.chargeId, amount: -a.amount, correct: 1 }))); refreshStatus(D, ids);
      logAudit(`수납 정정 — ${id} ${won(x.amount)} (사유: ${r})`); save(); render(); toast('정정했습니다.', 'ok'); } }]); };

  /* 3. 청구 */
  function vCharge() { const P = per(); let C;
    if (LIVEON()) C = entL('ent').filter(c => c.kind === 'charge' && inScope(c.unitId));
    else C = L().charges.filter(c => inScope(c.unitId) && (UI.ledCym ? c.periodYm === UI.ledCym : c.periodYm >= ymOf(P.from) && c.periodYm <= ymOf(P.to)));
    const by = {}; C.forEach(c => { const k = (c.bill || c.unitId + c.sid + c.periodYm); const x = by[k] = by[k] || { sid: c.sid, unitId: c.unitId, ym: c.periodYm, due: c.dueDate, lines: [], status: c.status }; x.lines.push(c); if (c.amount > 0) x.status = c.status; });
    const G = Object.values(by).sort((a, b) => a.ym < b.ym ? 1 : a.ym > b.ym ? -1 : a.sid < b.sid ? -1 : 1);
    const tot = G.reduce((s, g) => s + g.lines.reduce((a, c) => a + c.amount, 0), 0);
    return headD('청구', `${esc(P.label)} 청구 ${G.length}건 · ${won(tot)}. 할인은 음수 줄로 함께 기록합니다. 청구서 링크는 로그인 없이 결제할 수 있는 1회용 주소입니다.`, `${B('led-gen', '월 청구 일괄 생성')}${B('led-chg-new', '+ 청구 만들기', null, 'pri')}`)
      + table(['기간', '단위', '학습자', '항목', '금액', '납기', '상태', ''], G.map(g => { const s = g.lines.reduce((a, c) => a + c.amount, 0); return [esc(g.ym || ''), esc(uname(g.unitId)), esc(who(g.sid)), g.lines.map(c => `<span class="lg-li ${c.amount < 0 ? 'neg' : ''}">${esc(c.title || ITEM[c.itemType])} ${c.amount < 0 ? '−' : ''}${won(Math.abs(c.amount))}</span>`).join(''), `<b>${won(s)}</b>`, esc(g.due || ''), st(CST, g.status), g.status !== 'paid' && g.status !== 'void' ? B('led-link', '청구서 링크', JSON.stringify({ ids: g.lines.map(c => c.id), sid: g.sid })) : '']; }), '이 기간 청구가 없습니다. [월 청구 일괄 생성]으로 반 · 수강 등록 기준 청구를 만들 수 있습니다.'); }
  const unitOpts = (sel, leafOnly) => units().filter(u => scope().has(u.id) && u.active !== false && (!leafOnly || !units().some(k => k.parentId === u.id) || units().length === 1)).map(u => `<option value="${esc(u.id)}" ${u.id === sel ? 'selected' : ''}>${esc(u.name)}</option>`).join('') || `<option value="${esc(curUnit())}">${esc(uname(curUnit()))}</option>`;
  ACT['led-chg-new'] = () => { const ym = ymOf(today()); const it = Object.entries(ITEM).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    const line = i => `<div class="lg-g3"><label class="lg-fl"><span>항목 ${i + 1}</span><select name="t${i}">${it}</select></label><label class="lg-fl"><span>이름</span><input name="n${i}" maxlength="40" ${i === 2 ? 'placeholder="예: 형제 할인"' : ''}></label><label class="lg-fl"><span>금액(원, 할인은 −)</span><input name="a${i}" inputmode="numeric" ${i === 2 ? 'placeholder="-28000"' : ''}></label></div>`;
    modal('청구 만들기', `<div class="lg-g2"><label class="lg-fl"><span>단위</span><select name="u">${unitOpts(curUnit(), true)}</select></label><label class="lg-fl"><span>학습자 번호(학번 · 내부 번호, 이름 · 연락처 입력 금지)</span><input name="sid" maxlength="20" inputmode="numeric"></label><label class="lg-fl"><span>청구 월</span><input name="ym" type="month" value="${ym}"></label><label class="lg-fl"><span>납기</span><input name="due" type="date" value="${dPlus(today(), 7)}"></label></div>${[0, 1, 2].map(line).join('')}`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '청구 만들기', kind: 'pri', run: w => { const sid = fv(w, 'sid').replace(/\s/g, ''); if (!/^[0-9A-Za-z_-]{3,20}$/.test(sid)) { toast('학습자 번호를 확인해 주십시오(이름 · 연락처는 넣지 않습니다).', 'warn'); return false; }
        const items = [0, 1, 2].map(i => ({ itemType: fv(w, 't' + i), title: fv(w, 'n' + i) || ITEM[fv(w, 't' + i)], amount: amt(fv(w, 'a' + i)) })).filter(x => x.amount); if (!items.length || items.reduce((s, x) => s + x.amount, 0) <= 0) { toast('청구 금액을 입력해 주십시오. 합계는 0원보다 커야 합니다.', 'warn'); return false; }
        const body = { unitId: fv(w, 'u'), sid, items, periodYm: fv(w, 'ym'), dueDate: fv(w, 'due'), idem: idem() };
        if (LIVEON()) { liveDo('POST', '/api/ledger/charges', body, () => toast('청구를 만들었습니다.', 'ok')).catch(() => { }); return; }
        const D = L(); const bill = id8('b'); items.forEach(x => D.charges.push({ id: id8('lc_'), unitId: body.unitId, sid, itemType: x.itemType, title: x.title, amount: x.amount, periodYm: body.periodYm, dueDate: body.dueDate, srcType: 'manual', srcId: '', status: 'open', createdAt: nowStr(), bill }));
        logAudit(`청구 생성 — ${who(sid)} ${won(items.reduce((s, x) => s + x.amount, 0))}`); save(); render(); toast('청구를 만들었습니다.', 'ok'); } }], true); };
  /* 월 청구 일괄 생성: 미리보기(dryRun) → 확인 카드 → 확정 */
  ACT['led-gen'] = () => { const ym = ymPlus(ymOf(today()), 1); const u = curUnit();
    const show = pv => modal('월 청구 일괄 생성', `<p><b>${esc(pv.ym)}</b> 청구 <b>${pv.count}건 · ${won(pv.total)}</b>을 만듭니다. 같은 원천 · 같은 달 청구는 다시 만들지 않습니다${pv.skip ? `(이미 있음 ${pv.skip}건 제외)` : ''}.</p>${pv.rows && pv.rows.length ? table(['단위', '학습자', '항목', '금액'], pv.rows.slice(0, 8).map(r => [esc(uname(r.unitId)), esc(who(r.sid)), esc(r.title), won(r.amount)])) + (pv.rows.length > 8 ? `<p class="lg-mut">외 ${pv.rows.length - 8}줄</p>` : '') : ''}<p class="lg-note">확정해도 학습자에게 바로 알리지 않습니다. 안내는 [미납] 또는 청구서 링크로 보냅니다.</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: `${pv.count}건 확정`, kind: 'pri', run: () => { if (!pv.count) return;
        if (LIVEON()) { liveDo('POST', '/api/ledger/charges/generate', { unitId: u, periodYm: ym, dryRun: false }, r => toast(`${(r && r.created) || pv.count}건을 만들었습니다.`, 'ok')).catch(() => { }); return; }
        const D = L(); pv.rows.forEach(r => D.charges.push({ ...r, id: id8('lc_'), status: 'open', createdAt: nowStr() })); logAudit(`월 청구 일괄 생성 — ${ym} ${pv.count}건 ${won(pv.total)}`); save(); render(); toast(`${pv.count}건을 만들었습니다.`, 'ok'); } }], true);
    if (LIVEON()) { api('POST', '/api/ledger/charges/generate', { unitId: u, periodYm: ym, dryRun: true }).then(r => show({ ym, count: +r.count || 0, total: +r.total || 0, skip: +r.skipped || 0, rows: (r.items || []).map(mEnt) })).catch(e => toast(liveErr(e), 'warn')); return; }
    const D = L(); const prev = ymPlus(ym, -1); const base = D.charges.filter(c => inScope(c.unitId) && c.periodYm === prev && c.srcType === 'class' && c.itemType === (ITEMS_BY[D.flavor] || ITEMS_BY.std)[0][0]);
    const have = new Set(D.charges.filter(c => c.periodYm === ym).map(c => c.unitId + '|' + c.sid + '|' + c.itemType)); const rows = []; let skip = 0;
    base.forEach(c => { if (have.has(c.unitId + '|' + c.sid + '|' + c.itemType)) { skip++; return; } rows.push({ unitId: c.unitId, sid: c.sid, itemType: c.itemType, title: c.title, amount: c.amount, periodYm: ym, dueDate: ym + '-10', srcType: 'class', srcId: c.srcId, bill: id8('b') }); });
    show({ ym, count: rows.length, total: rows.reduce((s, r) => s + r.amount, 0), skip, rows }); };
  /* 청구서 링크(학습자에게 전달할 주소) — 확인 카드, 토큰은 한 번만 표시 */
  ACT['led-link'] = el => { let v; try { v = JSON.parse(el.dataset.v); } catch (e) { return; }
    modal('청구서 링크 만들기', `<p>${esc(who(v.sid))}의 청구 ${v.ids.length}줄로 결제 링크를 만듭니다. 링크는 72시간 동안 한 번 결제에 쓸 수 있고, 로그인 없이 열립니다.</p><p class="lg-note">링크 주소는 지금 한 번만 보입니다. 서버에는 확인용 값만 저장합니다.</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '링크 만들기', kind: 'pri', run: () => { const shown = url => { modal('청구서 링크', `<p>아래 주소를 복사해 학습자 · 보호자에게 보내 주십시오. 창을 닫으면 다시 볼 수 없습니다.</p><input class="lg-url" readonly value="${esc(url)}" aria-label="청구서 링크">`, [{ id: 'cp', label: '복사', kind: 'pri', run: w => { const i = w.querySelector('.lg-url'); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { } toast('복사했습니다.', 'ok'); return false; } }, { id: 'c', label: '닫기' }]); };
        if (LIVEON()) { api('POST', '/api/ledger/links', { chargeIds: v.ids, sid: v.sid, ttlHours: 72 }).then(r => { logAudit(`청구서 링크 발급 — ${who(v.sid)}`); shown(location.origin + (r.url || '')); }).catch(e => toast(liveErr(e), 'warn')); return; }
        const tok = id8('') + id8(''); const D = L(); D.links.push({ tokenHash: hash(tok), chargeIds: v.ids, sid: v.sid, expiresAt: dPlus(today(), 3), usedAt: '' }); logAudit(`청구서 링크 발급 — ${who(v.sid)}`); save(); setTimeout(() => shown(location.origin + location.pathname.replace(/[^/]*$/, '') + 'learner.html?bill=' + tok)); } }]); };

  /* 4. 미납 */
  function vUnpaid() { const U = unpaidList(); const sel = UI.ledSel || []; const s = UI.ledStg || '';
    const V = U.filter(x => !s || x.stage === s); const cnt = k => U.filter(x => x.stage === k).length;
    const chip = (k, l, n) => `<button class="lg-chip ${s === k ? 'on' : ''}" data-act="led-stg" data-v="${k}" aria-pressed="${s === k}">${l} ${n}</button>`;
    return headD('미납', `납기가 지난 잔액을 학습자별로 모았습니다. 단계는 납기 후 경과일로 정합니다(1단계 1~7일 · 2단계 8~30일 · 3단계 31일 이상).`, `${!ro() && sel.length ? `<button class="btn pri" data-act="led-dun" data-v="sel">선택 ${sel.length}명 안내</button>` : ''}`)
      + `<div class="lg-bar">${chip('', '전체', U.length)}${STG.map(g => chip(g[0], g[1], cnt(g[0]))).join('')}${chip('none', '납기 전', U.filter(x => !x.stage).length)}</div>`
      + table(['', '학습자', '단위', '미납액', '경과', '단계', ''], V.filter(x => s !== 'none' || !x.stage).map(x => { const k = x.unitId + '|' + x.sid; const g = STG.find(y => y[0] === x.stage); return [ro() ? '' : `<input type="checkbox" data-chg="led-sel" data-v="${esc(k)}" ${sel.includes(k) ? 'checked' : ''} aria-label="${esc(who(x.sid))} 선택">`, esc(who(x.sid)), esc(uname(x.unitId)), `<b>${won(x.bal)}</b>`, x.days > 0 ? `납기 후 ${x.days}일` : '납기 전', g ? `<span class="lg-st ${x.stage === 's1' ? 'warn' : 'bad'}">${esc(g[1])}</span>` : '<span class="lg-st">납기 전</span>', `${B('led-link', '청구서 링크', JSON.stringify({ ids: x.ids, sid: x.sid }))}${B('led-desk-go', '현장 수납', JSON.stringify({ sid: x.sid, u: x.unitId }))}`]; }), '미납이 없습니다.'); }
  ACT['led-stg'] = el => { UI.ledStg = el.dataset.v === 'none' ? 'none' : el.dataset.v; render(); };
  ACT['led-sel'] = el => { const S0 = new Set(UI.ledSel || []); if (el.checked) S0.add(el.dataset.v); else S0.delete(el.dataset.v); UI.ledSel = [...S0]; render(); };
  ACT['led-desk-go'] = el => { let v; try { v = JSON.parse(el.dataset.v); } catch (e) { return; } UI.ledDeskSid = v.sid; UI.ledDeskU = v.u; UI.ledger = 'desk'; render(); };

  /* 5. 현장 수납(Lv0 수기 + 승인번호 · Lv2 모의 단말) */
  function vDesk() { const sid = UI.ledDeskSid || ''; const u = UI.ledDeskU && inScope(UI.ledDeskU) ? UI.ledDeskU : curUnit();
    let open = [], bal = 0; if (sid) { if (LIVEON()) { open = entL('ent').filter(c => c.kind === 'charge' && inScope(c.unitId) && String(c.sid) === sid && c.status !== 'void' && +c.balance > 0); bal = open.reduce((s, c) => s + +c.balance, 0); } else { const D = L(); open = openOf(D, sid).filter(c => inScope(c.unitId)); const Bm = balMap(D, open); open = open.map(c => ({ ...c, balance: Bm.byCharge[c.id] })).filter(c => c.balance > 0); bal = Bm.total; } }
    const u2 = open.length ? (open.find(c => c.amount > 0) || open[0]).unitId : u; UI.ledDeskIds = open.map(c => c.id);
    const m = UI.ledDeskM || 'desk_card'; const dev = (LIVEON() ? ((LV.d.dev && LV.d.dev.devices) || []) : L().devices).find(d => d.mode === 'mock' || d.mode === 'ksnet' || d.mode === 'nice');
    const meth = ['desk_card', 'cash', 'transfer', 'voucher'].map(k => `<button class="lg-chip ${m === k ? 'on' : ''}" data-act="led-dm" data-v="${k}" aria-pressed="${m === k}">${esc(METH[k])}</button>`).join('');
    return headD('현장 수납', '학습자 번호로 미납 청구를 찾아 받은 금액을 기록합니다. 받은 금액은 오래된 청구부터 채워집니다. 카드 단말 승인번호를 함께 적으면 매입 대사가 자동으로 맞춰집니다.', '')
      + `<div class="lg-split"><div class="lg-card"><div class="lg-ch"><b>1. 학습자 찾기</b></div><div class="lg-bar"><input class="lg-q" type="search" inputmode="numeric" placeholder="학습자 번호(학번 · 내부 번호)" aria-label="학습자 번호" value="${esc(sid)}" data-chg="led-dsid"></div>
        ${sid ? (open.length ? table(['청구', '기간', '남은 금액'], open.map(c => [esc(c.title || ITEM[c.itemType]), esc(c.periodYm || ''), won(c.balance != null ? c.balance : c.amount)])) + `<p class="lg-bal">받을 금액 <b>${won(bal)}</b></p>` : '<p class="lg-mut">이 번호의 미납 청구가 없습니다. 청구 없이 받는 돈은 [청구] 탭에서 청구를 먼저 만듭니다.</p>') : '<p class="lg-mut">번호를 입력하면 미납 청구가 나옵니다.</p>'}</div>
      <div class="lg-card"><div class="lg-ch"><b>2. 받은 돈 기록</b>${dev ? `<small>단말: ${esc(dev.label)}${dev.mode === 'mock' ? '(모의)' : ''}</small>` : ''}</div>
        <form class="lg-form" data-sub="led-desk"><label class="lg-fl"><span>단위</span><select name="u">${unitOpts(u2, true)}</select></label><div class="lg-bar" role="group" aria-label="결제 수단">${meth}</div>
        <label class="lg-fl"><span>받은 금액(원)</span><input name="a" inputmode="numeric" value="${bal || ''}" ${ro() || !sid ? 'disabled' : ''}></label>
        ${m === 'desk_card' ? `<div class="lg-g3"><label class="lg-fl"><span>승인번호</span><input name="ap" inputmode="numeric" maxlength="12"></label><label class="lg-fl"><span>카드사</span><select name="ci">${['', '신한', '국민', '현대', '삼성', '롯데', '하나', '우리', 'BC', 'NH'].map(x => `<option>${x}</option>`).join('')}</select></label><label class="lg-fl"><span>할부(개월)</span><select name="in">${[0, 2, 3, 6, 12].map(x => `<option value="${x}">${x ? x + '개월' : '일시불'}</option>`).join('')}</select></label></div>` : ''}
        <label class="lg-fl"><span>일부만 받을 때 사유</span><input name="why" maxlength="80" placeholder="예: 나머지는 다음 주 납부"></label>
        <div class="lg-acts">${!ro() && sid && bal > 0 ? `${m === 'desk_card' && dev ? `<button type="button" class="btn" data-act="led-term">단말로 결제 요청</button>` : ''}<button type="button" class="btn pri" data-act="led-desk">수납 기록</button>` : ''}</div></form></div></div>`
      + deskToday(); }
  function deskToday() { const td = today(); const R = (LIVEON() ? [] : L().receipts).filter(r => inScope(r.unitId) && String(r.paidAt).slice(0, 10) === td && r.channel === 'desk').slice(-8).reverse();
    return R.length ? `<div class="lg-card"><div class="lg-ch"><b>오늘 데스크 수납</b><small>${R.length}건</small></div>${table(['시각', '학습자', '수단', '금액', ''], R.map(r => [esc(String(r.paidAt).slice(11, 16)), esc(who(r.sid)), esc(METH[r.method]), won(r.amount), st(RST, r.status)]))}</div>` : ''; }
  ACT['led-dsid'] = el => { UI.ledDeskSid = el.value.trim(); LV.key = ''; render(); };
  ACT['led-dm'] = el => { UI.ledDeskM = el.dataset.v; render(); };
  function deskSubmit(w, extra) { const sid = UI.ledDeskSid; const a = amt(fv(w, 'a')); const m = UI.ledDeskM || 'desk_card'; if (!sid || a <= 0) { toast('학습자와 받은 금액을 확인해 주십시오.', 'warn'); return; }
    const D = LIVEON() ? null : L(); const bal = D ? balMap(D, openOf(D, sid).filter(c => inScope(c.unitId))).total : null;
    if (bal != null && a > bal) { toast(ERRN.over_balance, 'warn'); return; } if (bal != null && a < bal && !fv(w, 'why')) { toast('일부만 받을 때는 사유를 입력해 주십시오.', 'warn'); return; }
    const body = { unitId: fv(w, 'u'), chargeIds: (UI.ledDeskIds || []).length ? UI.ledDeskIds : undefined, sid, method: m, amount: a, paidAt: nowStr(), approvalNo: (extra && extra.approvalNo) || fv(w, 'ap') || undefined, cardIssuer: fv(w, 'ci') || undefined, installment: +fv(w, 'in') || 0, diffReason: fv(w, 'why') || undefined, idem: idem() };
    if (LIVEON()) { liveDo('POST', '/api/ledger/receipts', body, () => { toast(`${won(a)} 수납을 기록했습니다.`, 'ok'); UI.ledDeskSid = ''; }).catch(() => { }); return; }
    const r = postReceipt(D, { ...body, recordedBy: S.me.name }); if (r.error) { toast(ERRN[r.error], 'warn'); return; } logAudit(`현장 수납 — ${who(sid)} ${METH[m]} ${won(a)}`); UI.ledDeskSid = ''; save(); render(); toast(`${won(a)} 수납을 기록했습니다.`, 'ok'); }
  ACT['led-desk'] = el => deskSubmit(el.closest('form'));
  /* Lv2 단말(모의): 단말 승인 결과가 에이전트로 돌아오면 desk_card 수납 확정 — 시연판은 1.2초 뒤 승인 */
  ACT['led-term'] = el => { const f = el.closest('form'); const a = amt(fv(f, 'a')); if (a <= 0) return toast('금액을 확인해 주십시오.', 'warn'); const w = modal('단말 결제 요청', `<div class="lg-term"><small>단말에 표시할 금액</small><b>${won(a)}</b><p>단말에서 결제해 주세요.</p><p class="lg-mut">승인되면 자동으로 수납이 기록됩니다.</p></div>`, [{ id: 'c', label: '요청 취소' }]);
    if (LIVEON()) { toast('단말 에이전트가 승인 결과를 보내면 자동으로 기록됩니다.', 'ok'); return; }
    setTimeout(() => { if (!document.body.contains(w)) return; closeModal(); deskSubmit(f, { approvalNo: String(40000000 + Math.floor(Math.random() * 9e6)) }); }, 1200); };

  /* 6. 환불 */
  function vRefund() { const P = per(); let rec, refs;
    if (LIVEON()) { rec = entL('ent').filter(r => r.kind === 'receipt' && r.status === 'paid'); refs = [...entL('ref').map(f => ({ ...f, kind: 'refund', status: f.status || 'pending' })), ...entL('refd').filter(f => f.status !== 'pending')]; }
    else { const D = L(); rec = D.receipts.filter(r => inScope(r.unitId) && r.status === 'paid' && String(r.paidAt).slice(0, 10) >= P.from).slice().reverse(); refs = D.refunds.filter(f => inScope((D.receipts.find(r => r.id === f.receiptId) || {}).unitId)).slice().reverse(); }
    const rOf = id => LIVEON() ? rec.find(r => r.id === id) || (refs.find(f => f.receiptId === id && f.paid != null) ? (f => ({ sid: f.sid, method: f.method, amount: f.paid }))(refs.find(f => f.receiptId === id && f.paid != null)) : {}) : L().receipts.find(r => r.id === id) || {};
    const pend = refs.filter(f => f.status === 'pending'), done = refs.filter(f => f.status !== 'pending');
    return headD('환불', '규정으로 환불액을 자동 계산해 「확정 대기」로 둡니다. 직원이 확인하고 확정하면 토스 결제는 부분 취소가 요청되고, 단말 · 현금은 기록만 남습니다.', '')
      + `<div class="lg-card"><div class="lg-ch"><b>확정 대기</b><small>${pend.length}건</small></div>${table(['신청', '학습자', '원 수납', '규정', '자동 계산', ''], pend.map(f => { const r = rOf(f.receiptId); return [esc(String(f.at).slice(0, 16)), esc(who(r.sid || f.sid)), `${esc(METH[r.method] || r.method || '')} ${won(r.amount)}`, esc(RULE[f.ruleType] || f.ruleType || '') + (f.calc && f.calc.lawCheck ? ' <small class="lg-law">법령 원문 확인 필요</small>' : ''), `<b>${won(f.autoAmount != null ? f.autoAmount : f.amount)}</b>`, B('led-ref-ok', '확인 · 확정', f.id, 'pri')]; }), '확정을 기다리는 환불이 없습니다.')}</div>`
      + `<div class="lg-card"><div class="lg-ch"><b>환불 신청 · 계산</b><small>수납 완료 건에서 시작합니다</small></div><div class="lg-bar"><input class="lg-q" type="search" inputmode="numeric" placeholder="학습자 번호로 찾기" aria-label="학습자 번호로 찾기" value="${esc(UI.ledRq || '')}" data-chg="led-rq"></div>${table(['수납일', '학습자', '수단', '금액', ''], rec.filter(r => !UI.ledRq || String(r.sid || '').includes(UI.ledRq)).slice(0, 20).map(r => [esc(String(r.paidAt || r.at).slice(0, 10)), esc(who(r.sid)), esc(METH[r.method] || r.method || ''), won(r.amount), B('led-ref-new', '환불 계산', r.id)]), '이 기간 수납이 없습니다.')}</div>`
      + `<div class="lg-card"><div class="lg-ch"><b>처리 내역</b></div>${table(['일시', '학습자', '금액', '규정', '상태'], done.slice(0, 15).map(f => [esc(String(f.at).slice(0, 16)), esc(who((rOf(f.receiptId) || {}).sid)), won(f.amount), esc(RULE[f.ruleType] || f.ruleType || ''), st(FST, f.status) + (f.editReason ? ` <small>수정: ${esc(f.editReason)}</small>` : '')]), '처리한 환불이 없습니다.')}</div>`; }
  ACT['led-rq'] = el => { UI.ledRq = el.value.trim(); render(); };
  const refundDefault = () => ({ franchise: 'hakwon_law', welfare: 'lifelong_law', univ: 'lifelong_law' })[flavor()] || 'full';
  ACT['led-ref-new'] = el => { const id = el.dataset.v; const D = LIVEON() ? null : L(); const r = D ? D.receipts.find(x => x.id === id) : entL('ent').find(x => x.id === id); if (!r) return;
    const already = D ? D.refunds.filter(f => f.receiptId === id && f.status !== 'cancelled').reduce((s, f) => s + f.amount, 0) : 0; const paid = r.amount - already;
    const calcH = w => { const c = LC().refund({ rule: fv(w, 'rule'), paid: r.amount, refunded: already, used: +fv(w, 'used') || 0, total: +fv(w, 'tot') || 0, months: +fv(w, 'mo') || 1, month: fv(w, 'mn') === '' ? 1 : +fv(w, 'mn') }); c.rule = fv(w, 'rule'); w.querySelector('#lgCalc').innerHTML = `<b>${esc(RULE[c.rule])}</b>${lineTxt(c.lines).map(l => `<span>${esc(l)}</span>`).join('')}<strong>자동 계산 ${won(c.auto)}</strong>${c.lawCheck ? '<small class="lg-law">법령 원문 확인 전 수치입니다. 확정 전 기관 규정과 대조해 주십시오.</small>' : ''}`; return c; };
    const w = modal('환불 계산', `<p>${esc(who(r.sid))} · ${esc(METH[r.method] || '')} ${won(r.amount)}${already ? ` (이미 환불 ${won(already)})` : ''}</p><div class="lg-g3"><label class="lg-fl"><span>규정</span><select name="rule">${Object.entries(RULE).filter(([k]) => k !== 'facility').map(([k, v]) => `<option value="${k}" ${k === refundDefault() ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label><label class="lg-fl"><span>경과 회차 · 시간</span><input name="used" inputmode="numeric" value="0"></label><label class="lg-fl"><span>총 회차 · 시간</span><input name="tot" inputmode="numeric" value="8"></label></div><div class="lg-g2"><label class="lg-fl"><span>총 개월</span><input name="mo" inputmode="numeric" value="1"></label><label class="lg-fl"><span>사유 발생 달(시작 전 0)</span><input name="mn" inputmode="numeric" value="1"></label></div><div class="lg-calc" id="lgCalc"></div><label class="lg-fl"><span>환불 사유</span><input name="why" maxlength="80"></label>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '계산 저장(확정 대기)', kind: 'pri', run: w2 => { const c = calcH(w2); if (c.auto > paid) { toast('원 수납보다 많이 환불할 수 없습니다.', 'warn'); return false; }
        if (LIVEON()) { liveDo('POST', '/api/ledger/refunds', { receiptId: id, ruleType: c.rule, used: +fv(w2, 'used') || 0, total: +fv(w2, 'tot') || 0, months: +fv(w2, 'mo') || 1, month: fv(w2, 'mn') === '' ? 1 : +fv(w2, 'mn'), reason: fv(w2, 'why'), idem: idem() }, () => { UI.ledger = 'refund'; toast('환불 계산을 저장했습니다. 확인 후 확정해 주십시오.', 'ok'); }).catch(() => { }); return; }
        D.refunds.push({ id: id8('lr_'), receiptId: id, amount: c.auto, ruleType: c.rule, calc: { lines: c.lines, lawCheck: !!c.lawCheck, reason: fv(w2, 'why') }, autoAmount: c.auto, editReason: '', status: 'pending', tossCancelOk: false, byStaff: '', at: nowStr() });
        logAudit(`환불 계산 — ${id} ${won(c.auto)} (${RULE[c.rule]})`); UI.ledger = 'refund'; save(); render(); toast('환불 계산을 저장했습니다. 확인 후 확정해 주십시오.', 'ok'); } }], true);
    calcH(w); w.addEventListener('input', () => calcH(w)); w.addEventListener('change', () => calcH(w)); };
  /* 환불 확정 — 돈이 나가는 동작: 확인 카드 */
  ACT['led-ref-ok'] = el => { const id = el.dataset.v; const D = LIVEON() ? null : L(); const f = D ? D.refunds.find(x => x.id === id) : entL('ref').find(x => x.id === id); if (!f) return; const r = D ? D.receipts.find(x => x.id === f.receiptId) || {} : { sid: f.sid, method: f.method, amount: f.paid || 0 };
    const auto = f.autoAmount != null ? f.autoAmount : f.amount; const toss = String(r.method || '').startsWith('online');
    modal('환불 확정', `<p>${esc(who(r.sid))} · ${esc(METH[r.method] || r.method || '')} ${won(r.amount || 0)}</p><div class="lg-calc"><b>${esc(RULE[f.ruleType] || f.ruleType || '')}</b>${lineTxt((f.calc && f.calc.lines) || []).map(l => `<span>${esc(l)}</span>`).join('')}<strong>자동 계산 ${won(auto)}</strong></div><div class="lg-g2"><label class="lg-fl"><span>환불 금액(원)</span><input name="a" inputmode="numeric" value="${auto}"></label><label class="lg-fl"><span>수정 사유(금액을 바꾸면 필수)</span><input name="why" maxlength="80"></label></div><p class="lg-note">${toss ? '확정하면 토스에 부분 취소를 요청합니다. 되돌릴 수 없습니다.' : '단말 · 현금 결제는 환불 기록만 남깁니다. 돈은 데스크에서 돌려 드립니다(단말 취소 승인번호를 메모해 두십시오).'}</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: `${toss ? '토스 취소 요청 · ' : ''}환불 확정`, kind: 'red', run: w => { const a = amt(fv(w, 'a')); const why = fv(w, 'why'); const lim = (r.amount || 0) - (D ? D.refunds.filter(x => x.receiptId === f.receiptId && x.status === 'done').reduce((s, x) => s + x.amount, 0) : 0);
        if (a <= 0 || a > lim) { toast('환불 금액은 0원보다 크고 원 수납 잔액 이하여야 합니다.', 'warn'); return false; } if (a !== auto && !why) { toast('자동 계산과 다른 금액입니다. 수정 사유를 입력해 주십시오.', 'warn'); return false; }
        if (LIVEON()) { liveDo('POST', `/api/ledger/refunds/${encodeURIComponent(id)}/confirm`, { amount: a, ...(a !== auto ? { editReason: why } : {}) }, x => toast(x && x.refund && x.refund.status === 'pending' ? '토스 취소 결과를 기다리고 있습니다.' : '환불을 확정했습니다.', 'ok')).catch(() => { }); return; }
        f.amount = a; f.editReason = a !== auto ? why : ''; f.status = 'done'; f.tossCancelOk = toss; f.byStaff = S.me.name; f.at = nowStr();
        logAudit(`환불 확정 — ${f.id} ${won(a)}${a !== auto ? ` (자동 ${won(auto)}, 사유: ${why})` : ''}`); save(); render(); toast(`${won(a)} 환불을 확정했습니다.`, 'ok'); } }]); };

  /* 7. 마감 */
  function closeUnits() { const leaf = units().filter(u => scope().has(u.id) && !units().some(k => k.parentId === u.id)); return leaf.length ? leaf : [unitById(curUnit()) || rootU()]; }
  function vClose() { const day = UI.ledDay || today(); const lst = closeUnits();
    let R; if (LIVEON()) { R = lst.map(u => { const c = LV.d['close:' + u.id] || {}; return { u, cash: +c.cashSystem || 0, card: +c.cardSystem || 0, k: c.close || null }; }); }
    else { const D = L(); R = lst.map(u => ({ u, ...sysCash(D, u.id, day), k: D.closes.find(c => c.unitId === u.id && c.day === day) })); }
    return headD('일 마감', '데스크 현금 · 카드 수납을 하루 단위로 맞춰 봅니다. 센 금액이 시스템과 다르면 차이 사유를 남깁니다.', `<label class="lg-fl inl"><span>날짜</span><input type="date" value="${esc(day)}" max="${today()}" data-chg="led-day"></label>`)
      + `<div class="lg-closes">${R.map(x => `<div class="lg-card lg-close ${x.k ? 'done' : ''}"><div class="lg-ch"><b>${esc(x.u.name)}</b>${x.k ? `<span class="lg-st ok">마감 완료</span>` : '<span class="lg-st warn">미마감</span>'}</div>
        <form data-u="${esc(x.u.id)}"><div class="lg-g2"><div class="lg-sys"><small>시스템 현금</small><b>${won(x.cash)}</b></div><label class="lg-fl"><span>센 현금(원)</span><input name="cc" inputmode="numeric" value="${x.k ? (x.k.cashCounted != null ? x.k.cashCounted : x.k.cash_counted) : x.cash}" ${x.k || ro() ? 'disabled' : ''}></label><div class="lg-sys"><small>시스템 카드</small><b>${won(x.card)}</b></div><label class="lg-fl"><span>단말 카드 합계(원)</span><input name="kc" inputmode="numeric" value="${x.k ? (x.k.cardCounted != null ? x.k.cardCounted : x.k.card_counted) : x.card}" ${x.k || ro() ? 'disabled' : ''}></label></div>
        ${x.k ? `<p class="lg-mut">${esc(x.k.closedBy || x.k.closed_by || '')} · ${esc(String(x.k.closedAt || x.k.closed_at || '').slice(0, 16))}${x.k.diffReason ? ` · 차이 사유: ${esc(x.k.diffReason)}` : ''}</p>` : ro() ? '' : `<label class="lg-fl"><span>차이 사유(차이가 있으면 필수)</span><input name="why" maxlength="80"></label><div class="lg-acts"><button type="button" class="btn pri" data-act="led-close">마감</button></div>`}</form></div>`).join('')}</div>`; }
  ACT['led-day'] = el => { UI.ledDay = el.value; LV.key = ''; render(); };
  ACT['led-close'] = el => { const f = el.closest('form'); const u = f.dataset.u; const day = UI.ledDay || today(); const cc = amt(fv(f, 'cc')), kc = amt(fv(f, 'kc')), why = fv(f, 'why');
    const s = LIVEON() ? null : sysCash(L(), u, day); if (s && (cc !== s.cash || kc !== s.card) && !why) return toast(`시스템과 ${won(Math.abs(cc - s.cash) + Math.abs(kc - s.card))} 차이가 있습니다. 차이 사유를 입력해 주십시오.`, 'warn');
    if (LIVEON()) { liveDo('POST', '/api/ledger/close', { unitId: u, day, cashCounted: cc, cardCounted: kc, diffReason: why || undefined }, () => toast('마감했습니다.', 'ok')).catch(() => { }); return; }
    const D = L(); if (D.closes.some(c => c.unitId === u && c.day === day)) return toast('이미 마감한 날입니다.', 'warn'); D.closes.push({ id: id8('lk_'), unitId: u, day, cashSystem: s.cash, cashCounted: cc, cardSystem: s.card, cardCounted: kc, diffReason: why, closedBy: S.me.name, closedAt: nowStr() });
    logAudit(`일 마감 — ${uname(u)} ${day}${why ? ' (차이 사유: ' + why + ')' : ''}`); save(); render(); toast('마감했습니다.', 'ok'); };

  /* 8. 가져오기(가상계좌 · VAN 매입 · 토스 정산 CSV → 자동 대사) */
  function vImport() { const D = LIVEON() ? null : L(); const I = D ? D.imports.slice().reverse() : ((LV.d.imp && LV.d.imp.imports) || []); const res = UI.ledImpRes;
    return headD('가져오기 · 대사', '입금 · 매입 · 정산 파일(CSV)을 올리면 금액 + 날짜 + 학습자 번호 · 주문번호 · 승인번호로 수납과 자동으로 맞춥니다. 맞지 않은 줄만 직원이 확인합니다.', '')
      + `<div class="lg-card"><form class="lg-form"><div class="lg-g2"><label class="lg-fl"><span>파일 종류</span><select name="k">${Object.entries(IMPK).map(([k, v]) => `<option value="${k}" ${UI.ledImpK === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label><label class="lg-fl"><span>CSV 파일</span><input type="file" accept=".csv,text/csv" data-chg="led-impf"></label></div>
        <label class="lg-fl"><span>또는 붙여넣기(날짜,금액,학습자 번호/주문번호/승인번호)</span><textarea name="csv" rows="4" placeholder="2026-11-13,305000,70004">${esc(UI.ledImpCsv || '')}</textarea></label>
        <div class="lg-acts">${!LIVEON() ? '<button type="button" class="btn" data-act="led-imp-sample">예시 채우기</button>' : ''}${ro() ? '' : '<button type="button" class="btn pri" data-act="led-imp">대사 미리보기</button>'}</div></form></div>`
      + (res ? `<div class="lg-card"><div class="lg-ch"><b>대사 결과</b><small>${esc(IMPK[res.kind])}</small></div><p>일치 <b>${res.matched.length}</b>줄 · 미일치 <b>${res.unmatched.length}</b>줄</p>${table(['날짜', '금액', '키', '결과'], [...res.matched.map(m => [esc(m.row.day), won(m.row.amount), esc(m.row.ref), '<span class="lg-st ok">일치</span>']), ...res.unmatched.map(m => [esc(m.row.day), won(m.row.amount), esc(m.row.ref), `<span class="lg-st bad">미일치 · ${({ amount: '금액 다름', day: '날짜 다름' })[m.reason] || '대상 없음'}</span>`])])}${res.matched.length && !res.applied && !ro() ? `<div class="lg-acts"><button class="btn pri" data-act="led-imp-ok">일치 ${res.matched.length}줄 확정</button></div>` : res.applied ? '<p class="lg-mut">확정했습니다.</p>' : ''}</div>` : '')
      + `<div class="lg-card"><div class="lg-ch"><b>가져온 내역</b></div>${table(['일시', '종류', '파일', '줄', '일치', '미일치'], I.slice(0, 10).map(i => [esc(String(i.at || '').slice(0, 16)), esc(IMPK[i.kind] || i.kind), esc(i.fileName || i.file_name || ''), i.rows, i.matched, `${(i.unmatched || []).length}${(i.unmatched || []).length ? ` <small>${(i.unmatched || []).map(u => won(u.amount)).join(', ')}</small>` : ''}`]), '가져온 파일이 없습니다.')}</div>`; }
  const parseCsv = t => LC().csvRows(t).filter(c => !/^(날짜|date)/i.test(String(c[0] || '').trim())).map(c => ({ day: String(c[0] || '').trim(), amount: amt(c[1]), ref: String(c[2] || '').trim() })).filter(r => r.amount);
  ACT['led-impf'] = el => { const f = el.files && el.files[0]; if (!f) return; if (f.size > 2e6) return toast('2MB 이하 CSV만 올릴 수 있습니다.', 'warn'); const rd = new FileReader(); rd.onload = () => { UI.ledImpCsv = String(rd.result); UI.ledImpName = f.name; render(); }; rd.readAsText(f, 'utf-8'); };
  ACT['led-imp-sample'] = () => { const D = L(); const U = unpaidList().slice(0, 2); const R = D.receipts.filter(r => r.method === 'desk_card' && r.approvalNo).slice(-1); const k = (document.querySelector('.lg-body [name=k]') || {}).value || 'vbank'; UI.ledImpK = k;
    UI.ledImpCsv = (k === 'van' ? R.map(r => `${String(r.paidAt).slice(0, 10)},${r.amount},${r.approvalNo}`) : U.map(x => `${dPlus(today(), -1)},${x.bal},${x.sid}`)).concat([`${dPlus(today(), -1)},99000,0000`]).join('\n'); UI.ledImpName = '예시.csv'; render(); };
  ACT['led-imp'] = el => { const f = el.closest('form'); const k = fv(f, 'k'); const csv = fv(f, 'csv'); UI.ledImpK = k; UI.ledImpCsv = csv; const rows = parseCsv(csv); if (!rows.length) return toast('CSV 내용이 없습니다.', 'warn');
    if (LIVEON()) { modal('대사 확정', `<p>${esc(IMPK[k])} ${rows.length}줄을 운영 서버에 올립니다. 서버가 자동 대사하고, 일치한 가상계좌 입금은 수납으로 기록됩니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '올리고 확정', kind: 'pri', run: () => { liveDo('POST', '/api/ledger/import', { kind: k, csv }, r => { const I = (r && r.import) || {}; UI.ledImpRes = { kind: k, matched: Array.from({ length: +I.matched || 0 }, () => ({ row: { day: '', amount: 0, ref: '서버 대사' } })), unmatched: (I.unmatched || []).map(u => ({ row: u, reason: u.reason })), applied: true }; toast(`일치 ${+I.matched || 0}줄을 확정했습니다.`, 'ok'); }).catch(() => { }); } }]); return; }
    const D = L(); let cands;
    if (k === 'vbank') { cands = unpaidList().map(x => ({ id: x.unitId + '|' + x.sid, amount: x.bal, keys: [x.sid], day: '' })); }
    else cands = D.receipts.filter(r => r.status === 'paid' && (k === 'van' ? r.method === 'desk_card' : r.channel === 'toss')).map(r => ({ id: r.id, amount: r.amount, day: String(r.paidAt).slice(0, 10), keys: [r.approvalNo, r.orderId, r.sid].filter(Boolean) }));
    const m = LC().match(rows, cands, { dayTol: 3 }); UI.ledImpRes = { kind: k, matched: m.matched.map(x => ({ row: rows[x.row], id: x.id })), unmatched: m.unmatched.map(x => ({ row: rows[x.row], reason: x.reason })), applied: false }; render(); };
  ACT['led-imp-ok'] = () => { const res = UI.ledImpRes; if (!res) return; modal('대사 확정', `<p>일치한 ${res.matched.length}줄을 확정합니다.${res.kind === 'vbank' ? ' 가상계좌 입금은 해당 학습자의 미납 청구에 수납(가상계좌)으로 기록됩니다.' : ' 매입 · 정산 내역은 수납과 짝지어 대사 완료로 표시합니다.'} 미일치 ${res.unmatched.length}줄은 목록에 남습니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '확정', kind: 'pri', run: () => { const D = L();
      if (res.kind === 'vbank') res.matched.forEach(mm => { const [u, sid] = mm.id.split('|'); postReceipt(D, { unitId: u, sid, method: 'vbank_ext', amount: mm.row.amount, paidAt: mm.row.day + ' 00:00', recordedBy: '가져오기' }); });
      D.imports.push({ id: id8('li_'), kind: res.kind, fileName: UI.ledImpName || '붙여넣기.csv', rows: res.matched.length + res.unmatched.length, matched: res.matched.length, unmatched: res.unmatched.map(u => ({ day: u.row.day, amount: u.row.amount, ref: tail(u.row.ref), reason: u.reason })), byStaff: S.me.name, at: nowStr() });
      res.applied = true; logAudit(`대사 확정 — ${IMPK[res.kind]} 일치 ${res.matched.length}줄 · 미일치 ${res.unmatched.length}줄`); save(); render(); toast(`일치 ${res.matched.length}줄을 확정했습니다.`, 'ok'); } }]); };

  /* 9. 쉐어(토스 경유 온라인 결제만 대상) */
  function vShare() { const P = per(); let list, tot;
    if (LIVEON()) { const s = LV.d.share || {}; list = (s.units || []).map(x => ({ unitId: x.unit, eligible: +x.eligible || 0, rateBp: +x.rateBp || 0, estimate: +x.estimate || 0, actual: null })); tot = { eligible: +s.eligible || 0, estimate: +s.estimate || 0, actual: s.actual != null ? +s.actual : null, diff: s.diff != null ? +s.diff : null }; }
    else { const R = demoRows().filter(r => inScope(r.unit) && r.day >= P.from && r.day <= P.to); const s = LC().share(R, calcUnits()); list = s.units.map(x => ({ unitId: x.unit, eligible: x.eligible, rateBp: x.rateBp, estimate: x.estimate, actual: null })); tot = s; }
    return headD('쉐어', `토스를 거친 온라인 결제만 쉐어 대상입니다. 데스크 단말 · 현금 · 가상계좌 · 바우처는 대상이 아닙니다. 쉐어율은 단위별(bp, 1bp = 0.01%)이며 원 단위 미만은 내립니다.`, '')
      + `<div class="lg-kpis two"><div class="lg-kpi"><span>쉐어 대상 결제액</span><b>${won(tot.eligible)}</b><small>${esc(P.label)}</small></div><div class="lg-kpi"><span>예상 쉐어</span><b>${won(tot.estimate)}</b><small>${tot.actual != null ? `토스 정산 실제 ${won(tot.actual)} · 차이 ${won(tot.diff)}` : '토스 정산을 가져오면 실제와 비교합니다'}</small></div></div>`
      + table(['단위', '대상 결제액', '쉐어율', '예상 쉐어', '실제(정산)', '차이'], list.map(x => [esc(uname(x.unitId)), won(x.eligible), (x.rateBp / 100).toFixed(2) + '%', won(x.estimate), x.actual != null ? won(x.actual) : '—', x.actual != null ? won(x.actual - x.estimate) : '—']), '이 기간 쉐어 대상 결제가 없습니다.'); }

  /* 10. 설정: 단위 · 토스 키 · 단말 · 기관 성격 */
  function vSet() { const U = units(); const dev = LIVEON() ? ((LV.d.dev && LV.d.dev.devices) || []) : L().devices;
    const rows = []; const walk = (p, dep) => U.filter(u => (u.parentId || null) === p).forEach(u => { rows.push([`<span style="padding-left:${dep * 18}px">${esc(u.name)}</span>`, esc(UKIND[u.kind] || u.kind), u.hasKey ? '<span class="lg-st ok">토스 키 등록됨</span>' : '<span class="lg-st">상위 키 사용</span>', ((u.shareRateBp == null ? 40 : u.shareRateBp) / 100).toFixed(2) + '%', u.active !== false ? '사용' : '<span class="lg-st off">중지</span>', owner() ? `${B('led-u-edit', '편집', u.id)}${B('led-u-add', '+ 하위', u.id)}` : '']); walk(u.id, dep + 1); }); walk(null, 0);
    return headD('설정', '단위(본사 → 가맹점 · 부서 · 시설), 단위별 토스 키, 데스크 단말을 관리합니다. 토스 비밀키는 암호화해 저장하며 화면에 다시 보이지 않습니다. 단위 · 키 변경은 기관 소유자만 할 수 있습니다.', `${B('led-export', 'CSV 내보내기')}`)
      + `<div class="lg-card"><div class="lg-ch"><b>단위</b><small>${U.length}개</small></div>${table(['이름', '종류', '토스 키', '쉐어율', '상태', ''], rows)}</div>`
      + `<div class="lg-card"><div class="lg-ch"><b>데스크 단말(Lv2 에이전트)</b><small>모의 단말로 연동을 미리 확인할 수 있습니다</small></div>${table(['단위', '이름', '방식', '마지막 연결'], dev.map(d => [esc(uname(d.unitId || d.unit || d.unit_id)), esc(d.label), esc(({ mock: '모의', ksnet: 'KSNET', nice: 'NICE' })[d.mode] || d.mode), esc(String(d.lastSeen || d.last_seen || '-').slice(0, 16))]), '등록한 단말이 없습니다.')}<div class="lg-acts">${B('led-dev-add', '+ 단말 등록')}</div></div>`
      + (LIVEON() ? '' : `<div class="lg-card"><div class="lg-ch"><b>기관 성격(탭 순서)</b></div><div class="lg-bar">${Object.entries(FLAV).map(([k, v]) => `<button class="lg-chip ${flavor() === k ? 'on' : ''}" data-act="led-flav" data-v="${k}" aria-pressed="${flavor() === k}" ${owner() ? '' : 'disabled'}>${esc(v.n)}</button>`).join('')}</div><p class="lg-mut">프랜차이즈는 청구 · 미납, 대학은 부서 정산 · 가져오기, 체육시설은 오늘 · 마감, 복지관은 현장 수납 · 마감을 앞에 둡니다.</p></div>`); }
  ACT['led-flav'] = el => { if (!owner()) return; L().flavor = el.dataset.v; UI.ledger = ''; logAudit(`매출 · 수납 기관 성격 — ${FLAV[el.dataset.v].n}`); save(); render(); };
  function unitModal(u, parentId) { const isNew = !u; u = u || { kind: 'branch', name: '', shareRateBp: 40, active: true, hasKey: false, tossMid: '' };
    modal(isNew ? '하위 단위 추가' : '단위 편집', `<div class="lg-g2"><label class="lg-fl"><span>이름</span><input name="n" maxlength="40" value="${esc(u.name)}"></label><label class="lg-fl"><span>종류</span><select name="k">${Object.entries(UKIND).map(([k, v]) => `<option value="${k}" ${u.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><div class="lg-sys"><small>쉐어율(계약값, 읽기 전용)</small><b>${((u.shareRateBp == null ? 40 : u.shareRateBp) / 100).toFixed(2)}%</b></div><label class="lg-fl"><span>토스 상점 ID(MID)</span><input name="mid" maxlength="40" value="${esc(u.tossMid || '')}" autocomplete="off"></label></div>
      <label class="lg-fl"><span>토스 비밀키 ${u.hasKey ? '(등록됨 — 바꿀 때만 입력)' : '(없으면 상위 단위 · 기관 기본 키 사용)'}</span><input name="sk" type="password" autocomplete="new-password" placeholder="test_sk_… 또는 live_sk_…"></label><label class="lg-chk"><input type="checkbox" name="on" ${u.active !== false ? 'checked' : ''}> 사용</label><p class="lg-note">비밀키는 서버에서 암호화해 저장하고 화면 · 기록에 남기지 않습니다.</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const name = fv(w, 'n'); if (!name) { toast('이름을 입력해 주십시오.', 'warn'); return false; } const sk = fv(w, 'sk'); if (sk && !/^(test|live)_(g?sk)_[A-Za-z0-9_]{6,}$/.test(sk)) { toast('토스 비밀키 형식이 아닙니다.', 'warn'); return false; }
        const body = { id: isNew ? undefined : u.id, parentId: isNew ? parentId : u.parentId, kind: fv(w, 'k'), name, tossMid: fv(w, 'mid') || undefined, tossSecret: sk || undefined, active: fv(w, 'on') };
        if (LIVEON()) { liveDo('POST', '/api/ledger/units', body, () => toast('저장했습니다.', 'ok')).catch(() => { }); return; }
        const D = L(); const x = isNew ? { id: id8('lu_'), parentId, sort: D.units.length } : D.units.find(y => y.id === u.id); Object.assign(x, { kind: body.kind, name, tossMid: body.tossMid || '', shareRateBp: x.shareRateBp != null ? x.shareRateBp : 40, active: body.active, hasKey: x.hasKey || !!sk }); if (isNew) D.units.push(x);
        logAudit(`단위 ${isNew ? '추가' : '편집'} — ${name}${sk ? ' · 토스 키 등록' : ''}`); save(); render(); toast('저장했습니다.', 'ok'); } }], true); }
  ACT['led-u-add'] = el => { if (owner()) unitModal(null, el.dataset.v); };
  ACT['led-u-edit'] = el => { if (owner()) unitModal(unitById(el.dataset.v)); };
  ACT['led-dev-add'] = () => modal('단말 등록', `<div class="lg-g2"><label class="lg-fl"><span>단위</span><select name="u">${unitOpts(curUnit(), true)}</select></label><label class="lg-fl"><span>이름</span><input name="l" maxlength="40" placeholder="예: 데스크 1번 단말"></label><label class="lg-fl"><span>방식</span><select name="m"><option value="mock">모의 단말(시험)</option><option value="ksnet">KSNET</option><option value="nice">NICE</option></select></label></div><p class="lg-note">등록하면 에이전트 키가 한 번만 표시됩니다. 데스크 PC의 에이전트에 입력해 주십시오.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '등록', kind: 'pri', run: w => { const b = { unitId: fv(w, 'u'), label: fv(w, 'l') || '데스크 단말', mode: fv(w, 'm') }; const shown = k => setTimeout(() => modal('에이전트 키', `<p>이 키는 지금 한 번만 보입니다.</p><input class="lg-url" readonly value="${esc(k)}" aria-label="에이전트 키">`, [{ id: 'c', label: '닫기' }]));
      if (LIVEON()) { liveDo('POST', '/api/ledger/devices', b, r => shown((r && (r.agentKey || r.key)) || '')).catch(() => { }); return; }
      const k = 'agk_' + id8('') + id8(''); L().devices.push({ id: id8('ld_'), ...b, agentKeyHash: hash(k), lastSeen: '' }); logAudit(`단말 등록 — ${b.label}`); save(); render(); shown(k); } }]);
  /* 화면 안 양식은 Enter로 페이지가 새로 고쳐지지 않게 */
  document.addEventListener('submit', e => { if (e.target && e.target.closest && e.target.closest('.lg, #modal')) e.preventDefault(); }, true);
  window.ledgerView = { summary, unpaidList, todo, tabList, flavorFor };
})();
