/* 디디쌤 학습자 화면 v22 — 학습자 → 운영자 이벤트 큐(lpx.js 짝). 데모: localStorage, 운영: 서버 API로 교체 지점 */
'use strict';
function lpxPush(type, data) { const x = { id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, at: new Date().toISOString(), who: (LR.me && (LR.me.sid || LR.me.id)) || '', data: data || {} };
  /* 운영: api('POST', `/api/pub/${LR.tid}/events`, x) */
  try { const k = 'didisam.room.' + (LR.tid || '') + '.lpx'; const Q = JSON.parse(localStorage.getItem(k) || '[]'); Q.push(x); localStorage.setItem(k, JSON.stringify(Q.slice(-500))); } catch (e) { } return x; }
