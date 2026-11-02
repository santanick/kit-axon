/* 디디쌤 스튜디오 v14.1 — 학습자 활동 자동 연동
   ① 퀴즈 · 시험 점수 → 어드민 '시험' 칸(과정별 평균) — 성적 · 이수 판정에 사용
   ② 학습 기록(진도 · 제출 · 진단 · 튜토리얼 · 튜터 질문)을 새로고침 없이 반영
      운영: 30초마다 + 창으로 돌아올 때 /api/learners/progress
      데모: 같은 브라우저의 학습자 창이 기록하면 storage 이벤트로 즉시
   입력 중이거나 모달이 열려 있으면 화면은 다시 그리지 않고, 다음 기회에 반영한다. */
'use strict';
/* ① 퀴즈 점수 → 시험 칸 */
{ const base = lpApply; lpApply = (...a) => { const n = base(...a); try { const LP = lpRead(); const univ = lsT() === 'univ';
  Object.entries(LP).forEach(([sid, p]) => { if (!p || !p.cls) return; const m = S.members.find(x => x.sid === sid || (univ && x.name === sid)); if (!m) return;
    Object.entries(p.cls).forEach(([cid, r]) => { const c = C(cid); if (!c || !r || !c.prog[m.id]) return; const qs = (c.curriculum || []).filter(it => ['quiz', 'exam'].includes(it.type));
      const sc = qs.map(it => (r.items || {})[it.id]).filter(x => x && x.score != null && Number.isFinite(+x.score)).map(x => +x.score);
      if (sc.length) { c.prog[m.id].exam = Math.round(sc.reduce((s, v) => s + v, 0) / sc.length); c.prog[m.id].quizN = sc.length; } }); }); } catch (e) { console.error(e); } return n; }; }

/* ② 자동 연동 */
const SYNC = { fp: '', at: '', busy: false, pend: false };
const lpFp = LP => { try { return JSON.stringify(LP).length + ':' + Object.values(LP).map(p => (p && p.at) || '').sort().pop(); } catch (e) { return ''; } };
const syncSafe = () => !$('#modal') && !$('.mwrap') && !(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && document.activeElement.value);
async function syncLP(force) {
  if (!S || !S.org || SYNC.busy || document.hidden && !force) return; SYNC.busy = true;
  try {
    if (typeof LIVE !== 'undefined' && LIVE.user) { try { window.__LP = (await api('GET', '/api/learners/progress')).lp || {}; } catch (e) { return; } }
    const LP = lpRead(); const fp = lpFp(LP); if (fp === SYNC.fp && !SYNC.pend) return;
    const first = !SYNC.fp; SYNC.fp = fp; const qn = Array.isArray(S.tq) ? S.tq.length : (typeof tqEnsure === 'function' ? tqEnsure().length : 0);
    lpApply(); if (typeof tqEnsure === 'function') tqEnsure(); SYNC.at = nowStr(); save();
    const nq = (typeof tqEnsure === 'function' ? tqEnsure().length : 0) - qn;
    if (!syncSafe()) { SYNC.pend = true; return; } SYNC.pend = false; render();
    if (!first) toast(nq > 0 ? `학습자 질문 ${nq}건이 새로 도착했습니다.` : '학습자 활동을 반영했습니다.', nq > 0 ? 'ok' : '');
  } catch (e) { console.error(e); } finally { SYNC.busy = false; }
}
setInterval(() => syncLP(), 30000);
window.addEventListener('focus', () => syncLP(true));
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncLP(true); });
window.addEventListener('storage', e => { if (e.key && /\.lp$/.test(e.key)) syncLP(true); });
document.addEventListener('focusout', () => { if (SYNC.pend) setTimeout(() => syncLP(true), 400); });
setTimeout(() => syncLP(true), 1500);
/* 학습 기록 불러오기 버튼도 같은 경로로 */
{ const base = ACT['ls-lpsync']; ACT['ls-lpsync'] = async el => { SYNC.fp = ''; if (base) await base(el); await syncLP(true); }; }
