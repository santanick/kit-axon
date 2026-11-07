/* 디디쌤 학습자 v33 — 대학 첫 로그인 동의(학번 · 접근코드 로그인)
   - 대학은 접근코드 로그인을 유지하고 비밀번호는 만들지 않는다(추후 학교 SSO).
   - 첫 로그인 때 이용약관 · 개인정보(학번 · 학과만 수집) 동의 화면을 1회 보여 주고, 동의 여부와 일시만 저장한다.
     운영: POST /api/pub/<tid>/consent → learners.consent { tos, privacy, ver, at } · 응답 me.needConsent
     데모: 이 브라우저 localStorage 'didisam.room.<tid>.consent' { 학번: { at, ver } }
   - 동의 전에는 강의 · 내 학습 등 모든 학습 화면 진입을 막고(홈 · 처리방침 · 로그인만 허용), 동의하면 원래 가려던 화면으로 보낸다.
   - 다른 화면 모듈의 lrender 감싸기보다 바깥에서 막도록 lboot.js 바로 앞에 로드한다. */
'use strict';
(() => {
  const VER = 'v33';
  const K = () => 'didisam.room.' + (LR.tid || '') + '.consent';
  const store = () => { try { return JSON.parse(localStorage.getItem(K()) || '{}') || {}; } catch (e) { return {}; } };
  const isUniv = () => !!(SITE() && SITE().org && SITE().org.type === 'univ');
  /* 학번 가입(비밀번호) 계정은 가입 때 동의했으므로 제외, 체험용 공용 샘플(tid sample)도 제외 */
  const need = () => { if (!SITE() || !LR.me || LR.mode === 'preview' || LR.tid === 'sample' || !isUniv()) return false; if (LR.me.acct) return false;
    if (LR.mode === 'live') return !!LR.me.needConsent; return !store()[LR.me.sid]; };
  const FREE = ['home', 'privacy', 'login', 'consent'];
  const CN = { back: '' };
  window.lcNeedConsent = need;

  const rows = [['필수', '학번 · 학과', '학습자 식별 · 수강 · 학습 서비스 제공', '졸업 · 수강 종료 후 학교 요청 시 파기'], ['자동 생성', '학습 기록(진도 · 제출물 · 출결)', '학습 관리 · 이수 판정', '학교 학사 규정에 따름']];
  const view = () => { const org = SITE().org.name || ''; const pol = (SITE().acct && SITE().acct.policy) || {};
    if (!need()) return `<section class="sec la"><div class="in narrow"><div class="gate"><h2>동의를 마쳤어요</h2><div class="cta">${btn('내 학습으로', '#my', 'pri')}</div></div></div></section>`;
    return `<section class="sec la"><div class="in narrow"><h1>처음 오셨네요</h1><p class="lead">${esc(org)} 학습을 시작하기 전에 한 번만 확인해 주세요.</p>
    <form id="lcConsent" class="la-one"><fieldset class="la-terms"><legend class="sr">약관 동의</legend>
      <label class="ckl all"><input type="checkbox" data-cn="all"> <b>전체 동의</b></label>
      <label class="ckl"><input type="checkbox" name="tos"> [필수] 이용약관 동의</label><details><summary>전문 보기</summary><pre>${esc(pol.tos || '이용약관은 학교 홈페이지에서 확인할 수 있어요.')}</pre></details>
      <label class="ckl"><input type="checkbox" name="privacy"> [필수] 개인정보 수집 · 이용 동의</label>
      <details open><summary>받는 항목: 학번 · 학과</summary><table class="la-pol"><thead><tr><th>구분</th><th>수집 항목</th><th>목적</th><th>보유 기간</th></tr></thead><tbody>${rows.map(r => `<tr>${r.map((x, i) => `<td${i === 0 ? ' class="k"' : ''}>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <p class="mini">이름 · 연락처 · 이메일 · 생년월일은 받지 않아요. 비밀번호도 만들지 않고, 학교에서 받은 접근코드로 로그인해요(학교 SSO 연동 예정).</p></details></fieldset>
      <p class="err" id="lcCnErr" role="alert"></p><button class="lbtn pri blk" type="submit">동의하고 시작하기</button></form>
    <p class="la-links"><a href="#home" data-cn="out">동의하지 않고 로그아웃</a> · <a href="#privacy">개인정보 처리방침 요약</a></p></div></section>`; };
  if (typeof LA_R === 'object') LA_R.consent = view;

  { const base = lrender; lrender = (...a) => {
      try { if (need()) { const r = route(); if (!FREE.includes(r.a)) { CN.back = location.hash && location.hash !== '#consent' ? location.hash : '#my'; history.replaceState(null, '', location.pathname + location.search + '#consent'); } } } catch (e) { console.error(e); }
      return base(...a); }; }

  document.addEventListener('change', e => { const t = e.target; if (!t || t.dataset.cn !== 'all') return; const f = t.closest('form'); ['tos', 'privacy'].forEach(n => { if (f.elements[n]) f.elements[n].checked = t.checked; }); });
  document.addEventListener('click', async e => { const t = e.target.closest && e.target.closest('[data-cn="out"]'); if (!t) return; e.preventDefault(); await LR.api.logout(); CN.back = ''; location.hash = '#home'; lrender(); });
  document.addEventListener('submit', async e => { const f = e.target; if (!f || f.id !== 'lcConsent') return; e.preventDefault(); const er = $('#lcCnErr'); const say = m => { if (er) er.textContent = m; };
    if (!f.elements.tos.checked || !f.elements.privacy.checked) return say('필수 항목(이용약관 · 개인정보 수집 · 이용)에 동의해 주세요.');
    const b = f.querySelector('button[type=submit]'); b.disabled = true; const at = new Date().toISOString();
    try {
      if (LR.mode === 'live') { const r = await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/consent`, { tos: true, privacy: true, ver: VER }); LR.me.needConsent = false; LR.me.consentAt = r.consentAt || at; }
      else { const s = store(); s[LR.me.sid] = { at, ver: VER }; localStorage.setItem(K(), JSON.stringify(s)); }
    } catch (x) { b.disabled = false; return say(x.message || '저장하지 못했어요. 다시 시도해 주세요.'); }
    toast('동의를 마쳤어요. 학습을 시작해요.', 'ok'); const to = CN.back || '#my'; CN.back = ''; if (location.hash === to) lrender(); else location.hash = to; });

  /* 운영: 새로 고침 뒤에도 계정 회원의 닉네임 · 종류를 화면 상태에 둔다(lacct.js laLiveMe) */
  { const base = LR.api.load; LR.api.load = async (...a) => { const r = await base(...a); try { if (LR.mode === 'live' && LR.me && typeof laLiveMe === 'function') laLiveMe({ me: LR.me }); } catch (e) { console.error(e); } return r; }; }
})();
