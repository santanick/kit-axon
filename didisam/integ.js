/* v22 통합 조정 — 영역별 모듈(W1~W7) 사이 겹치는 처리 정리 */
'use strict';
/* ① 학습자 구독 취소: W2(정기 결제 · 알림) 처리로 하나로. 학습자 쪽 필드 sub/subId 둘 다 받음 */
LPX['sub-cancel'] = x => { const d = x.data || {}; const sid = d.sub || d.subId; const m = typeof W2 !== 'undefined' && W2.who ? W2.who(x) : S.members.find(y => y.sid === x.who || y.id === x.who); if (!m) return;
  const s = (S.subs || []).find(y => y.id === sid) || (S.subs || []).find(y => y.cls === d.cls && y.who === m.id && y.status === '구독중'); if (!s || s.who !== m.id) return;
  if (typeof w2SubCancel === 'function') { if (w2SubCancel(s.id, 'learner')) { const c = C(s.cls); logAudit(`구독 취소(학습자) — ${m.name || m.sid} ${c ? c.name : ''}`); W2.notify && W2.notify([m.id], '구독 취소 완료', `[${S.org.name}] 「${c ? c.name : ''}」 구독이 취소되었습니다. ${s.end || s.next}까지 수강할 수 있으며 다음 결제는 진행되지 않습니다.`); } }
  else if (s.status === '구독중') { s.status = '해지 예약'; s.end = s.next; } };
/* ② 정기 결제 실행 버튼 하나로: 매출 화면 버튼도 W2 처리(결제 실패 재시도 포함)를 쓴다 */
if (ACT['w2-subrun']) ACT['sl2-subrun'] = el => ACT['w2-subrun'](el);
/* ③ 구독 클래스는 판매 종료 후 다시 판매중으로 되돌릴 수 없다(정기 결제가 다시 시작되지 않음) */
AFTER.push(() => { (S && S.classes || []).forEach(c => { if (c.kind === 'sub' && c.subsc && c.subsc.saleEnd && c.sale !== '판매 종료') c.sale = '판매 종료'; }); });
