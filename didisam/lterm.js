/* 디디쌤 학습자 웹 v33 — 앱 ↔ 기존 화면 용어 · 이름 맞춤(QA #69). 겉글자만 바꾸고 구조 · 링크 · 동작은 그대로 둔다.
   ① 기존 화면 아래 탭 '강좌 · 내 학습'을 앱 아래 탭과 같은 기관 유형별 이름(SCN.find · SCN.learn, 예: 성인 학원 '둘러보기 · 내 강의')으로
   ② 기존 화면 홈의 앱 복귀 버튼 'AI 선생님 앱 화면으로 보기'를 앱 위 줄과 같은 선생님 이름으로
   용어 원본은 lapp.js의 SCN이다. lapp.js가 window.lappScn()을 내보내면 그것을, 아니면 시나리오 확장(LSCN_PICK)을, 그것도 없으면 아래 사본을 쓴다(SCN과 같은 값). */
(function () {
  const SCN_COPY = { univ: ['내 교과목', '비교과'], univ_lms: ['이번 학기 강의', '비교과'], corp: ['내 교육', '교육과정'], public: ['내 교육', '교육과정'], k12: ['내 수업', '수업 찾기'], adult: ['내 강의', '둘러보기'], lifelong: ['내 강좌', '강좌 신청'], voc: ['내 훈련', '훈련과정'] };
  const org = () => { try { return (typeof SITE === 'function' && SITE() && SITE().org) || {}; } catch (e) { return {}; } };
  const labels = () => { const ty = org().type || 'adult', ed = org().ed || '';
    try { if (typeof window.lappScn === 'function') { const x = window.lappScn(); if (x && x.learn) return [x.learn, x.find]; } } catch (e) { }
    for (const f of window.LSCN_PICK || []) { try { const x = f(ty, ed); if (x && x.learn) return [x.learn, x.find]; } catch (e) { } }
    return SCN_COPY[ty === 'univ' && ed === 'lms' ? 'univ_lms' : ty] || SCN_COPY.adult; };
  const tutor = () => { try { const p = typeof window.ltPersona === 'function' ? window.ltPersona() : null; if (p && p.n) return p.n; return typeof TCFG === 'function' && TCFG().name ? TCFG().name : ''; } catch (e) { return ''; } };
  const setTxt = (el, t) => { if (el && t && el.textContent !== t) el.textContent = t; };
  function apply() { if (!document.body || document.body.classList.contains('lapp')) return; if (typeof LR === 'undefined' || !LR || !LR.site) return;
    const [learn, find] = labels(); const tb = document.querySelector('nav.tabbar'); if (tb) { const A = [...tb.querySelectorAll('a')]; const my = A.find(a => /^#(login\/)?my$/.test(a.getAttribute('href') || '')); if (my) setTxt(my.querySelector('span'), learn); const fi = A[1] && A[1] !== my ? A[1] : null; if (fi) setTxt(fi.querySelector('span'), find); }
    const back = document.querySelector('.ap-back [data-ap="modern"]'); const n = tutor(); if (back && n) { const tn = [...back.childNodes].filter(x => x.nodeType === 3).pop(); const t = ` ${n} 앱 화면으로 보기`; if (tn && tn.nodeValue !== t) tn.nodeValue = t; } }
  let q = false; const kick = () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; apply(); }); };
  const start = () => { new MutationObserver(kick).observe(document.body, { childList: true, subtree: true }); kick(); };
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
  addEventListener('hashchange', kick);
})();
