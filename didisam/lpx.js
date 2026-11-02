/* 디디쌤 스튜디오 v22 — 학습자 → 운영자 이벤트 큐(데모: localStorage 'didisam.room.<tid>.lpx', 운영: 서버 API)
   학습자 화면(가입 · 결제 · 환불 신청 · 게시글 · 노트 · 후기 · 출석 · 구독 취소 등)이 lpxPush로 쌓으면
   운영자 화면이 lpxPull로 읽어 각 모듈의 LPX[type] 처리기로 S에 반영한다. */
'use strict';
const LPX = {};
const lpxKey = () => 'didisam.room.' + (typeof DREG !== 'undefined' && DREG.cur ? DREG.cur() : '') + '.lpx';
function lpxPull() { if (typeof S === 'undefined' || !S || !S.org) return 0; let Q = []; try { Q = JSON.parse(localStorage.getItem(lpxKey()) || '[]'); } catch (e) { return 0; } if (!Q.length) return 0;
  let n = 0; const left = []; Q.forEach(x => { const f = LPX[x.type]; if (!f) { left.push(x); return; } try { f(x); n++; } catch (e) { console.error('lpx', x.type, e); } });
  try { localStorage.setItem(lpxKey(), JSON.stringify(left)); } catch (e) { } if (n) { save(); try { render(); } catch (e) { } } return n; }
addEventListener('storage', e => { if (e.key && e.key === lpxKey()) lpxPull(); });
addEventListener('focus', () => lpxPull());
AFTER.push(() => { if (!lpxPull.ran) { lpxPull.ran = 1; setTimeout(lpxPull, 300); } });
