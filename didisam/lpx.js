/* 디디쌤 스튜디오 v22 — 학습자 → 운영자 이벤트 큐(데모: localStorage 'didisam.room.<tid>.lpx', 운영: 서버 API)
   학습자 화면(가입 · 결제 · 환불 신청 · 게시글 · 노트 · 후기 · 출석 · 구독 취소 등)이 lpxPush로 쌓으면
   운영자 화면이 lpxPull로 읽어 각 모듈의 LPX[type] 처리기로 S에 반영한다. */
'use strict';
const LPX = {};
const lpxKey = () => 'didisam.room.' + (typeof DREG !== 'undefined' && DREG.cur ? DREG.cur() : '') + '.lpx';
function lpxPull() { if (typeof S === 'undefined' || !S || !S.org) return 0; let Q = []; try { Q = JSON.parse(localStorage.getItem(lpxKey()) || '[]'); } catch (e) { return 0; } if (!Q.length) return 0;
  let n = 0; const used = new Set(); Q.forEach(x => { const f = LPX[x.type]; if (!f) return; used.add(x.id); try { f(x); n++; } catch (e) { console.error('lpx', x.type, e); } });
  /* v38 R2 처리한 항목만 지운다 — 처리하는 동안 학습자 창이 새로 넣은 항목(예: 이름 저장 직후 수료증 인쇄)이 덮어써져 사라지던 것 */
  try { const now = JSON.parse(localStorage.getItem(lpxKey()) || '[]'); localStorage.setItem(lpxKey(), JSON.stringify(now.filter(x => !used.has(x.id)))); } catch (e) { } if (n) { save(); try { render(); } catch (e) { } } return n; }
addEventListener('storage', e => { if (e.key && e.key === lpxKey()) lpxPull(); });
addEventListener('focus', () => lpxPull());
AFTER.push(() => { if (!lpxPull.ran) { lpxPull.ran = 1; setTimeout(lpxPull, 300); } });
/* v33 운영: 학습자 요청은 서버 요청함(/api/pub/<tid>/events)에 쌓인다 → 같은 처리기(LPX)로 S에 반영(요청함 · 알림 · 회원).
   어디까지 반영했는지는 S.lpxSeq에 두어 다른 창 · 기기에서도 이어서 가져온다. 30초마다(화면이 보일 때) + 창으로 돌아올 때 */
async function lpxPullLive() { if (typeof LIVE === 'undefined' || !LIVE.user || !LIVE.tenant || LIVE.user.role === 'teacher' || typeof S === 'undefined' || !S || !S.org || lpxPullLive.busy) return 0;
  lpxPullLive.busy = 1; let n = 0; const seq0 = +S.lpxSeq || 0;
  try { for (let i = 0; i < 5; i++) { const r = await api('GET', `/api/pub/${encodeURIComponent(LIVE.tenant.tid)}/events?after=${+S.lpxSeq || 0}`); const E = r.events || [];
      E.forEach(x => { const f = LPX[x.type]; if (!f) return; try { f(x); n++; } catch (e) { console.error('lpx', x.type, e); } }); if (r.last) S.lpxSeq = +r.last; if (E.length < 200) break; } }
  catch (e) { if (e.status !== 401) console.warn('lpx live', e.message); }
  finally { lpxPullLive.busy = 0; }
  if (n || (+S.lpxSeq || 0) !== seq0) { save(); try { render(); } catch (e) { } } return n; }
{ const base = lpxPull; lpxPull = (...a) => { const n = base(...a); lpxPullLive(); return n; }; }
setInterval(() => { if (typeof LIVE !== 'undefined' && LIVE.user && !document.hidden) lpxPullLive(); }, 30e3);
