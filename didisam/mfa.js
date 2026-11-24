/* 보안 4차 #1 관리자 추가 인증 화면 — 운영자 합니다체.
   - window.mfaPrompt(r, done): 로그인 응답 { mfa, ticket, to?, devCode?, totpSetup? }로 인증번호 입력 · 재발송. 성공하면 done()
   - 소셜 로그인 뒤(#oauth=mfa-…): live.js가 LIVE.mfa를 두면 여기서 띄운다(티켓은 서버 쿠키)
   - window.mfaSettingsHTML(): 계정 설정 「2단계 인증」 카드(d2 session.js가 설정 화면에 끼운다). 인증 앱 등록은 QR 대신 키 문자열 + 복사 */
(() => {
  const E = s => String(s ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
  const msg = (e, fb) => window.errMsg ? window.errMsg(e, fb) : ((e && e.message) || fb || '요청을 처리하지 못했습니다. 잠시 후 다시 시도하십시오.');
  const call = (m, p, b) => api(m, p, b);
  function box(title, body, btns) {
    const old = document.getElementById('mfaBox'); if (old) old.remove();
    const w = document.createElement('div'); w.className = 'mwrap top2'; w.id = 'mfaBox';
    w.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${E(title)}"><div class="mh"><b>${E(title)}</b></div><div class="mb">${body}<p class="lverr" data-mfa="err" role="alert"></p></div><div class="mf">${btns.map(b => `<button class="btn ${b.kind || ''}" type="button" data-mfa-b="${b.id}">${E(b.label)}</button>`).join('')}</div></div>`;
    document.body.appendChild(w);
    const q = s => w.querySelector(s); const err = t => { q('[data-mfa=err]').textContent = t || ''; };
    w.addEventListener('click', ev => { const b = ev.target.closest('[data-mfa-b]'); if (!b) return; const f = btns.find(x => x.id === b.dataset.mfaB); if (f && f.run) f.run({ w, q, err, btn: b, close: () => w.remove() }); });
    const inp = q('input'); if (inp) { inp.focus(); inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); const p = btns.find(x => x.kind === 'pri'); if (p) p.run({ w, q, err, btn: q(`[data-mfa-b=${p.id}]`), close: () => w.remove() }); } }); }
    return { w, q, err };
  }
  const codeField = `<label class="fl">인증번호 6자리<input name="mfacode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" placeholder="000000"></label>`;

  window.mfaPrompt = (r, done) => {
    const totp = r.mfa === 'totp';
    const lead = totp ? '인증 앱에 표시된 6자리 번호를 입력하십시오.' : `등록된 이메일${r.to ? `(${E(r.to)})` : ''}로 보낸 인증번호 6자리를 입력하십시오. 10분 동안 유효합니다.`;
    const devLine = c => c ? `<p class="note" data-mfa="dev">개발 환경 인증번호: <b>${E(c)}</b></p>` : '';
    const b = box('2단계 인증', `<p>${lead}</p>${codeField}${devLine(r.devCode)}`, [
      { id: 'c', label: '취소', run: x => x.close() },
      ...(totp ? [] : [{ id: 'rs', label: '인증번호 다시 받기', run: async x => { x.btn.disabled = true; try { const o = await call('POST', '/api/login/mfa/resend', { ticket: r.ticket || undefined }); x.err(''); const d = x.q('[data-mfa=dev]'); if (d) d.remove(); if (o.devCode) x.q('.mb').insertAdjacentHTML('beforeend', devLine(o.devCode)); if (typeof toast === 'function') toast('인증번호를 다시 보냈습니다.'); } catch (e) { x.err(msg(e)); } finally { setTimeout(() => { x.btn.disabled = false; }, 30000); } } }]),
      { id: 'ok', label: '확인', kind: 'pri', run: async x => {
        const code = String(x.q('[name=mfacode]').value || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(code)) return x.err('6자리 숫자를 입력하십시오.');
        x.btn.disabled = true;
        try { const o = await call('POST', '/api/login/mfa', { ticket: r.ticket || undefined, code }); x.close(); if (o && o.totpSetup) { try { sessionStorage.setItem('dd.mfa.setup', '1'); } catch (e) { } } done(o); }
        catch (e) { x.btn.disabled = false; x.err(msg(e)); const i = x.q('[name=mfacode]'); i.value = ''; i.focus(); if (e && e.code === 'mfa_expired') { x.q('[data-mfa-b=ok]').disabled = true; } }
      } }]);
    return b;
  };

  /* ── 인증 앱 등록 · 해제 ── */
  async function enroll() {
    box('인증 앱 등록', `<p>본인 확인을 위해 비밀번호를 입력하십시오.</p><label class="fl">비밀번호<input name="mfapw" type="password" autocomplete="current-password"></label>`, [
      { id: 'c', label: '취소', run: x => x.close() },
      { id: 'ok', label: '다음', kind: 'pri', run: async x => { x.btn.disabled = true; try { const o = await call('POST', '/api/me/mfa', { password: x.q('[name=mfapw]').value }); x.close(); step2(o); } catch (e) { x.btn.disabled = false; x.err(msg(e)); } } }]);
  }
  function step2(o) {
    const key = String(o.secret).replace(/(.{4})/g, '$1 ').trim();
    box('인증 앱 등록', `<p>Google Authenticator · Microsoft Authenticator 등 인증 앱에서 <b>설정 키 입력</b>을 고르고 아래 키를 넣으십시오(시간 기준, 6자리).</p>
      <p class="note"><code data-mfa="key" style="font-size:15px;letter-spacing:1px;word-break:break-all">${E(key)}</code></p>
      <p><button class="btn sm" type="button" data-mfa-copy="key">키 복사</button> <button class="btn sm" type="button" data-mfa-copy="uri">otpauth 주소 복사</button></p>
      <p>앱에 표시된 6자리 번호를 입력해 등록을 마치십시오.</p>${codeField}`, [
      { id: 'c', label: '취소', run: x => x.close() },
      { id: 'ok', label: '등록', kind: 'pri', run: async x => { const code = String(x.q('[name=mfacode]').value || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(code)) return x.err('6자리 숫자를 입력하십시오.'); x.btn.disabled = true; try { await call('POST', '/api/me/mfa', { code }); x.close(); if (typeof toast === 'function') toast('인증 앱을 등록했습니다. 다음 로그인부터 인증 앱 번호를 입력합니다.'); refresh(); } catch (e) { x.btn.disabled = false; x.err(msg(e)); } } }]);
    const w = document.getElementById('mfaBox');
    w.addEventListener('click', ev => { const c = ev.target.closest('[data-mfa-copy]'); if (!c) return; const t = c.dataset.mfaCopy === 'key' ? o.secret : o.uri; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => typeof toast === 'function' && toast('복사했습니다.')).catch(() => typeof toast === 'function' && toast('복사하지 못했습니다. 직접 선택해 복사하십시오.', 'warn')); });
  }
  function disable() {
    box('인증 앱 해제', `<p>해제하면 로그인할 때 이메일 인증번호를 받습니다. 비밀번호를 입력하십시오.</p><label class="fl">비밀번호<input name="mfapw" type="password" autocomplete="current-password"></label>`, [
      { id: 'c', label: '취소', run: x => x.close() },
      { id: 'ok', label: '해제', kind: 'pri', run: async x => { x.btn.disabled = true; try { await call('DELETE', '/api/me/mfa', { password: x.q('[name=mfapw]').value }); x.close(); if (typeof toast === 'function') toast('인증 앱을 해제했습니다.'); refresh(); } catch (e) { x.btn.disabled = false; x.err(msg(e)); } } }]);
  }
  async function refresh() {
    const el = document.getElementById('mfaSet'); if (!el) return;
    try {
      const s = await call('GET', '/api/me/mfa');
      const how = s.method === 'totp' ? '인증 앱(6자리 번호)' : '이메일 인증번호';
      el.innerHTML = `<p>로그인할 때마다 비밀번호 다음에 <b>${how}</b>로 한 번 더 확인합니다.${s.policy === 'totp' ? ' 기관 정책상 인증 앱을 써야 합니다.' : ''}${s.off ? ' <span class="note bad">현재 서버는 시험 모드(2단계 생략)입니다.</span>' : ''}</p>
        <p>${s.method === 'totp' ? `<button class="btn sm" type="button" data-mfa-act="enroll">인증 앱 다시 등록</button>${s.policy === 'totp' ? '' : ' <button class="btn sm" type="button" data-mfa-act="off">인증 앱 해제</button>'}` : `<button class="btn sm pri" type="button" data-mfa-act="enroll">인증 앱 등록</button>`}</p>`;
    } catch (e) { el.textContent = msg(e); }
  }
  window.mfaSettingsHTML = () => { setTimeout(refresh, 0); return `<section class="card" data-mfa="card"><h3>2단계 인증</h3><div id="mfaSet">불러오는 중…</div></section>`; };
  document.addEventListener('click', ev => { const b = ev.target.closest('[data-mfa-act]'); if (!b) return; if (b.dataset.mfaAct === 'enroll') enroll(); else if (b.dataset.mfaAct === 'off') disable(); });

  /* 소셜 로그인 뒤 2단계 · 정책상 인증 앱 등록 안내 */
  addEventListener('load', () => (window.__preboot || Promise.resolve()).then(() => setTimeout(() => {
    if (typeof LIVE === 'undefined' || !LIVE) return;
    if (LIVE.mfa && !LIVE.user) { const r = LIVE.mfa; LIVE.mfa = null; window.mfaPrompt(r, () => location.replace(location.pathname)); return; }
    let need = false; try { need = sessionStorage.getItem('dd.mfa.setup') === '1'; sessionStorage.removeItem('dd.mfa.setup'); } catch (e) { }
    if (need && LIVE.user) box('인증 앱 등록 필요', '<p>기관 정책에 따라 인증 앱으로 2단계 인증을 해야 합니다. 지금 등록하십시오.</p>', [{ id: 'c', label: '나중에', run: x => x.close() }, { id: 'ok', label: '지금 등록', kind: 'pri', run: x => { x.close(); enroll(); } }]);
  }, 0)).catch(() => {}));
})();
