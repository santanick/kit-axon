/* v43 숫자 일원화(P1-F03 · P2-H1 · D-A F03 · D-B) — 화면마다 다르게 세던 숫자를 이 함수 하나에서 낸다.
   쓰는 곳: 홈(AI 홈 · 위젯 · 브리핑), HRD-Net 보고, 인가 › 한눈에 · 모니터링, 출결, 수납(환불), 매출.
   기준(화면에 한 줄로 밝힌다)
   - 대상 과정: 종료되지 않은 과정. 출석률은 출결이 있는 과정(회차형 · 직업훈련 과정)만.
   - 사람 수: 같은 사람이 여러 과정에 있어도 1명(중복 제외).
   - 수료 기준 미달: 지금 듣는 과정 가운데 하나라도 clsDone(진도 · 평가 · 출석률 80%)을 못 채운 사람. 충족 = 대상 인원 − 미달.
   - 환불 건수: 처리 대기 환불 = 강좌 결제 환불 신청(S.pays) + 수납 원장 확정 대기(S.ledger.refunds). 처리는 「수납 › 환불」 한 곳.
   - 매출 합계: 수납 원장 요약(ledgerView.summary)의 이번 달 순매출. 원장이 없으면 강좌 결제(S.pays) 이번 달 합계 − 환불.
   의존: mods.js(clsAtt · clsDone), ledger.js(window.ledgerView) — 모두 호출 시점에만 읽는다. */
(function () {
  'use strict';
  const arr = v => Array.isArray(v) ? v : [];
  const ty = () => (S && S.org && S.org.type) || '';
  const liveCls = () => arr(S && S.classes).filter(c => c && c.status !== '종료');
  const attCls = () => liveCls().filter(c => c.kind === 'episode' || ty() === 'voc');
  const ATT_MIN = () => (typeof DDAtt !== 'undefined' && DDAtt.MIN) || 80;
  /* 법정 반환 기한(일): 평생교육법 시행령 · 학원법 시행령의 반환 사유 발생일부터 5일. 그 밖의 유형은 기관 규정 */
  const RF_DAYS = { lifelong: 5, k12: 5, adult: 5 };
  const rfLaw = () => ({ lifelong: '평생교육법 시행령(5일 이내)', k12: '학원법 시행령(5일 이내)', adult: '학원법 시행령(5일 이내)' })[ty()] || '기관 환불 규정';
  const dayN = d => Math.floor((Date.parse(today() + 'T12:00:00') - Date.parse(String(d || today()).slice(0, 10) + 'T12:00:00')) / 864e5);
  const DD = {
    ATT_MIN,
    basis: { att: '출결이 있는 과정의 학습자 · 중복 제외', done: '종료 전 과정 · 진도 · 평가 · 출석률 기준 · 중복 제외', refund: '처리 대기 환불(강좌 결제 신청 + 수납 원장 확정 대기)', rev: '수납 원장 순매출(수납 − 환불)' },
    /* 출석률 80% 미만 */
    lowAtt() { const m = ATT_MIN(); return attCls().flatMap(c => arr(c.learners).map(id => ({ c, id, att: clsAtt(c, id) })).filter(x => x.att != null && x.att < m)); },
    lowAttN() { return new Set(DD.lowAtt().map(x => x.id)).size; },
    /* 대상 인원 · 수료 기준 미달 · 충족 */
    learners() { const s = new Set(); liveCls().forEach(c => arr(c.learners).forEach(id => s.add(id))); return s; },
    learnerN() { return DD.learners().size; },
    undone() { return liveCls().flatMap(c => arr(c.learners).filter(id => !clsDone(c, id)).map(id => ({ c, id }))); },
    undoneN() { return new Set(DD.undone().map(x => x.id)).size; },
    doneN() { return Math.max(0, DD.learnerN() - DD.undoneN()); },
    /* 환불(처리 대기) */
    refunds() { const k = RF_DAYS[ty()]; const R = [];
      arr(S && S.pays).forEach(p => { const req = (p.refund && p.refund.state === '신청') || (!p.refund && p.status === '환불 신청'); if (!req) return; const at = (p.refund && p.refund.at) || p.at; R.push({ src: 'pay', id: p.id, at, who: p.who, item: p.item, amount: +p.amount || 0, left: k ? k - dayN(at) : null }); });
      try { const D = S && S.ledger; if (D && !D.live) arr(D.refunds).filter(f => f.status === 'pending').forEach(f => { const r = arr(D.receipts).find(x => x.id === f.receiptId) || {}; R.push({ src: 'ledger', id: f.id, at: f.at || r.paidAt, who: r.sid, item: '수납 원장 환불', amount: +f.amount || 0, left: k ? k - dayN(f.at || r.paidAt) : null }); });
        else if (D && D.live && window.ledgerView) { const n = +(ledgerView.todo() || {}).refunds || 0; for (let i = 0; i < n; i++) R.push({ src: 'ledger', id: 'live' + i, at: '', amount: 0, left: null }); } } catch (e) { }
      return R; },
    refundN() { return DD.refunds().length; },
    refundLate() { return DD.refunds().filter(x => x.left != null && x.left < 0).length; },
    refundDays: () => RF_DAYS[ty()] || null,
    refundLaw: rfLaw,
    /* 매출(이번 달 순매출) */
    revenue() { try { if (window.ledgerView && S && S.ledger) { const s = ledgerView.summary(); if (s) return { net: +s.net || 0, paid: +s.paid || 0, refund: +s.refund || 0, unpaid: +s.unpaid || 0, rate: +s.collectRate || 0, src: 'ledger' }; } } catch (e) { }
      const mo = today().slice(0, 7); const P = arr(S && S.pays).filter(p => String(p.at || '').startsWith(mo)); const paid = P.filter(p => /완료/.test(p.status || '')).reduce((a, p) => a + (+p.amount || 0), 0); const refund = P.filter(p => p.refund && p.refund.state === '승인').reduce((a, p) => a + (+p.refund.amount || 0), 0);
      return { net: paid - refund, paid, refund, unpaid: 0, rate: 0, src: 'pays' }; },
    unpaidN() { try { if (window.ledgerView && S && S.ledger) { const T = ledgerView.todo(); return (+T.s1 || 0) + (+T.s2 || 0) + (+T.s3 || 0); } } catch (e) { } return 0; }
  };
  window.DDStat = DD;
})();
