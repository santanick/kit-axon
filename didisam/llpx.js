/* 디디쌤 학습자 화면 v22 — 학습자 → 운영자 이벤트 큐(lpx.js 짝). 데모: localStorage, 운영: 서버 API로 교체 지점 */
'use strict';
function lpxPush(type, data) { const x = { id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, at: new Date().toISOString(), who: (LR.me && (LR.me.sid || LR.me.id)) || '', data: data || {} };
  /* v33 운영: 서버 요청함으로 보낸다(본문은 서버가 개인정보를 가려 저장). 신원을 바꾸는 종류(가입 · 비밀번호 · 본인확인)는 서버가 직접 만든다 */
  if (LR.mode === 'live') { if (!LR.tid || LR.tid === 'sample' || /^acct-(join|pw|verify|idv)$/.test(type)) return x;
    api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/events`, { type, id: x.id, data: x.data }).catch(e => toast(e.status === 401 ? '로그인이 끝나 요청을 보내지 못했어요. 다시 로그인한 뒤 보내 주세요.' : e.status === 429 ? '요청이 많아 잠시 후 다시 보내 주세요.' : '요청을 보내지 못했어요 — ' + e.message, 'bad')); return x; }
  try { const k = 'didisam.room.' + (LR.tid || '') + '.lpx'; const Q = JSON.parse(localStorage.getItem(k) || '[]'); Q.push(x); localStorage.setItem(k, JSON.stringify(Q.slice(-500))); } catch (e) { } return x; }
