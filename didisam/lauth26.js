/* 디디쌤 학습자 v26.1 — 로그인 · 간편가입 · 계정 찾기 화면을 기존 디디쌤(피그마 My Page › 회원가입 & 로그인) UI/UX로
   - 가운데 한 열(최대 420px) · 기관 로고 · 큰 제목 + 한 줄 안내 · SNS는 흰 바탕 둥근 버튼 + 브랜드 아이콘 · '또는' 구분선 · 진회색 주 버튼(모서리 4)
   - 로그인 왼쪽 소개 패널은 숨긴다(디디쌤 원래 화면처럼 한 열). 기능 · 동작은 그대로. */
'use strict';
(() => {
  const SVG = {
    kakao: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#3A1D1D" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/></svg>',
    naver: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#03C75A" d="M15.6 12.6 8.1 2H2v20h6.4V11.4L15.9 22H22V2h-6.4z"/></svg>',
    google: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>',
    apple: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#111" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.4 1-4.3 2.6-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.2 2.6 1.3 0 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.7-4.2zM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>'
  };
  const sub = { login: '다시 만나 반갑습니다. 이어서 학습해 보세요.', join: '나만의 학습 여정을 시작해 보세요!', find: (typeof laCfg === 'function' && laCfg().mode === 'code') ? '기관에 등록된 아이디와 접근코드를 확인합니다.' : '가입한 이메일로 계정을 찾을 수 있습니다.' };
  function enhance() {
    const sec = document.querySelector('section.login, section.la'); if (!sec) { document.body.classList.remove('la26'); return; }
    document.body.classList.add('la26');
    document.querySelectorAll('.la-sb:not([data-l26])').forEach(b => { b.dataset.l26 = 1; const k = [...b.classList].find(c => SVG[c]); if (k) b.insertAdjacentHTML('afterbegin', `<span class="l26i">${SVG[k]}</span>`); });
    const h = location.hash.replace(/^#/, '').split('/')[0]; const kind = h === 'login' ? 'login' : h === 'join' ? 'join' : h === 'find' ? 'find' : '';
    const head = sec.querySelector('.lgr > h2, .in.narrow > h1'); if (!head || head.dataset.l26) return; head.dataset.l26 = 1;
    let org = ''; try { org = (SITE().org.short || SITE().org.name || '').slice(0, 2); } catch (e) { }
    head.insertAdjacentHTML('beforebegin', `<span class="l26logo" aria-hidden="true">${typeof esc === 'function' ? esc(org) : org}</span>`);
    const lf = sec.querySelector('#laLogin'); const back = decodeURIComponent((lf && lf.dataset.back) || (location.hash.match(/^#login\/(.+)/) || [])[1] || ''); const isCls = /^(class|pay|tb)\//.test(back);
    const txt = kind === 'login' && isCls ? '로그인하면 수강 신청을 이어서 진행합니다.' : sub[kind];
    if (kind && txt && !head.nextElementSibling?.classList.contains('l26sub')) head.insertAdjacentHTML('afterend', `<p class="l26sub">${txt}</p>`);
    /* v26.9 처음 온 사람: 로그인 화면 위쪽에 간편가입 길을 바로 보여 준다(수강 신청 → 로그인에서 막히지 않게) */
    if (kind === 'login' && sec.querySelector('a[href="#join"]') && !sec.querySelector('.l26new')) { const s2 = sec.querySelector('.l26sub'); (s2 || head).insertAdjacentHTML('afterend', `<p class="l26new">처음이신가요? <a href="#join">30초 간편가입</a> — 가입이 끝나면 ${isCls ? '보던 클래스로 이어집니다' : '바로 학습을 시작할 수 있습니다'}.</p>`); }
  }
  const mo = new MutationObserver(() => { try { enhance(); } catch (e) { } });
  const start = () => { const app = document.getElementById('lapp') || document.body; mo.observe(app, { childList: true, subtree: true }); enhance(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
  addEventListener('hashchange', () => setTimeout(enhance, 30));
})();
/* 결제하기(v26.2): 동의 체크하면 빨간 안내를 숨긴다 */
document.addEventListener('change', e => { if (e.target.name === 'agree' && e.target.closest('#shpPay')) { const er = e.target.closest('#shpPay').querySelector('.p26err'); if (er && e.target.checked) er.hidden = true; } });
/* 클래스 상세(피그마 User Page › 클래스 상세): 공유하기 · 안내 탭 이동 */
document.addEventListener('click', e => {
  const sh = e.target.closest('[data-l26share]'); if (sh) { e.preventDefault(); const u = location.href.split('#')[0] + '#class/' + sh.dataset.l26share;
    const done = () => { if (typeof toast === 'function') toast('클래스 주소를 복사했습니다.', 'ok'); };
    try { if (navigator.share && matchMedia('(max-width:640px)').matches) { navigator.share({ url: u, title: document.title }).catch(() => { }); return; } navigator.clipboard.writeText(u).then(done, done); } catch (x) { done(); } return; }
  const j = e.target.closest('[data-l26jump]'); if (j) { e.preventDefault(); const t = document.getElementById(j.dataset.l26jump); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - 90, behavior: 'smooth' }); j.parentElement.querySelectorAll('a').forEach(a => a.classList.toggle('on', a === j)); }
});
