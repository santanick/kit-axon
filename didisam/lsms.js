/* v43 K2 — 공단 · 평생교육원 회원 휴대폰 선택 수집(대표님 결정 11-16 ③): 「나 › 연결 · 알림」(#connect)의 「문자 알림」 카드
   - 대상: 기관 유형 public(공단 · 공공) · lifelong(평생교육원)만. 대학 · 기업 · 학원 · 직업훈련에는 카드 자체가 없다.
   - 「예약 · 노쇼 알림을 문자로 받기」를 켤 때만 번호를 받는다. 목적 · 보관 기간(알림을 끄거나 탈퇴하면 파기) · 동의 시각을 보여 주고 기록한다.
   - 화면에는 번호를 가려(010-****-1234) 보여 준다. 저장 후 원래 번호는 다시 보여 주지 않는다.
   - 운영: PUT /api/pub/<tid>/pii { field:'phone', purpose:'sms_noti', value } — 서버가 암호화해 pii.identity에 두고 consent.phone { purpose, keep:'withdraw', at }을 남긴다(pii.js · PiiServiceImpl).
     끄기 = value '' → 번호와 동의 기록을 함께 지운다. 탈퇴(POST withdraw)는 identity 행째 파기.
   - 시연판: 이 기기(localStorage didisam.room.<tid>.sms)에 가린 번호 · 동의 시각만 둔다(원래 번호는 저장하지 않음). */
'use strict';
(() => {
  if (typeof viewPage !== 'function' || typeof LR !== 'object') return;
  const TYPES = ['public', 'lifelong'];
  const on = () => { try { return !!(LR.me && LR.me.kind !== 'parent' && TYPES.includes(((SITE() || {}).org || {}).type)); } catch (e) { return false; } };
  const ST = { live: null, busy: false, form: false, err: '' };
  const K = () => 'didisam.room.' + (LR.tid || 'x') + '.sms';
  const mask = v => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 10 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : ''; };
  const okPhone = v => /^01[016789]\d{7,8}$/.test(String(v || '').replace(/\D/g, ''));
  const fmtAt = s => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : ''; };
  const sid = () => String((LR.me && (LR.me.sid || LR.me.id)) || '');
  function cur() { if (LR.mode === 'live') return ST.live; try { const m = (JSON.parse(localStorage.getItem(K()) || '{}') || {})[sid()]; return m && m.mask ? m : null; } catch (e) { return null; } }
  async function loadLive() { if (LR.mode !== 'live' || ST.busy || ST.live !== null || !LR.me || !LR.me.acct) return; ST.busy = true;
    try { const r = await api('GET', `/api/pub/${encodeURIComponent(LR.tid)}/pii`); const c = (r.consent || {}).phone; ST.live = r.phone && c ? { mask: mask(r.phone), at: c.at } : false; } catch (e) { ST.live = false; } ST.busy = false; if (typeof lrender === 'function') lrender(); }
  const KEEP = '알림을 끄거나 탈퇴하면 바로 파기해요';
  function card() { if (!on()) return ''; loadLive(); const c = cur(); const org = esc(((SITE() || {}).org || {}).name || '기관');
    const sw = `<label class="sm43-sw"><input type="checkbox" data-sms="tog"${c || ST.form ? ' checked' : ''} aria-describedby="sm43d"><span class="sm43-tr" aria-hidden="true"></span><span><b>예약 · 노쇼 알림을 문자로 받기</b><small id="sm43d">선택 · 켜면 휴대폰 번호를 받아요</small></span></label>`;
    let body = '';
    if (c) body = `<div class="sm43-now"><p><span class="sm43-no">${esc(c.mask)}</span><small>${c.at ? `${esc(fmtAt(c.at))} 동의 · ` : ''}${KEEP}</small></p><div class="sm43-b"><button type="button" class="lbtn ghost sm" data-sms="edit">번호 바꾸기</button><button type="button" class="lbtn ghost sm" data-sms="off">알림 끄고 번호 지우기</button></div></div>`;
    if (ST.form) body = `<form class="sm43-f" id="sm43F" novalidate><label class="fl">휴대폰 번호<input name="ph" type="tel" inputmode="numeric" autocomplete="tel" maxlength="13" placeholder="010-0000-0000" required></label>
      <table class="la-pol sm43-pol"><tbody><tr><td class="k">받는 항목</td><td>휴대폰 번호</td></tr><tr><td class="k">목적</td><td>시설 예약 · 강습 확정 · 변경 · 노쇼 안내 문자</td></tr><tr><td class="k">보관 기간</td><td>${KEEP}</td></tr><tr><td class="k">동의 시각</td><td>저장하는 순간을 기록해요</td></tr></tbody></table>
      <label class="ckl sm43-ag"><input type="checkbox" name="ag" required> 위 내용에 동의해요(선택 — 동의하지 않아도 앱 알림은 받을 수 있어요)</label>
      <p class="err" id="sm43E" role="alert">${esc(ST.err)}</p><div class="sm43-b"><button type="submit" class="lbtn pri sm">동의하고 저장</button><button type="button" class="lbtn ghost sm" data-sms="cancel">취소</button></div></form>`;
    return `<section class="sm43" aria-labelledby="sm43h"><h2 id="sm43h">문자 알림</h2><p class="mini">${org}의 시설 예약 · 강습 알림은 앱 알림으로 먼저 보내요. 문자로도 받고 싶을 때만 켜세요.</p>${sw}${body}</section>`; }
  async function put(v) { if (LR.mode === 'live') { const r = await api('PUT', `/api/pub/${encodeURIComponent(LR.tid)}/pii`, { field: 'phone', purpose: 'sms_noti', value: v }); ST.live = v ? { mask: r.mask || mask(v), at: r.at || new Date().toISOString() } : false; return; }
    const all = (() => { try { return JSON.parse(localStorage.getItem(K()) || '{}') || {}; } catch (e) { return {}; } })(); if (v) all[sid()] = { mask: mask(v), at: new Date().toISOString(), purpose: 'sms_noti', keep: 'withdraw' }; else delete all[sid()]; localStorage.setItem(K(), JSON.stringify(all)); }
  window.lSmsMask = mask;

  /* #connect는 화면마다 그리는 모듈이 달라(웹 lcal · 앱 lai-home) 그린 뒤 가장 바깥에서 붙인다 */
  function deco() { try { if (route().a !== 'connect' || !on()) return; const lm = document.getElementById('lm'); if (!lm) return; const old = lm.querySelector('.sm43'); const html = card(); if (!html) return;
    if (old) { old.outerHTML = html; return; } const ins = [...lm.querySelectorAll('.in, .lc, .ap-conn')].pop() || lm; ins.insertAdjacentHTML('beforeend', html); } catch (e) { console.error('lsms', e); } }
  { const base = lrender; lrender = function (...a) { const r = base.apply(this, a); deco(); return r; }; }
  addEventListener('hashchange', () => setTimeout(deco, 0));
  document.addEventListener('change', e => { const t = e.target; if (!t || t.dataset.sms !== 'tog') return; const c = cur();
    if (t.checked && !c) { ST.form = true; ST.err = ''; lrender(); setTimeout(() => { const i = document.querySelector('#sm43F [name=ph]'); if (i) i.focus(); }, 0); return; }
    if (!t.checked && ST.form && !c) { ST.form = false; lrender(); return; }
    if (!t.checked && c) { t.checked = true; document.querySelector('[data-sms="off"]')?.click(); } });
  document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-sms]'); if (!b || b.dataset.sms === 'tog') return; const k = b.dataset.sms;
    if (k === 'edit') { ST.form = true; ST.err = ''; lrender(); return; } if (k === 'cancel') { ST.form = false; ST.err = ''; lrender(); return; }
    if (k === 'off') { b.disabled = true; try { await put(''); ST.form = false; toast('문자 알림을 끄고 휴대폰 번호를 지웠어요.', 'ok'); } catch (x) { toast(errMsg(x, '지우지 못했어요. 다시 시도해 주세요.'), 'bad'); } lrender(); } });
  document.addEventListener('submit', async e => { const f = e.target; if (!f || f.id !== 'sm43F') return; e.preventDefault(); const v = String(f.ph.value || '').replace(/\D/g, ''); const say = m => { ST.err = m; const el = document.getElementById('sm43E'); if (el) el.textContent = m; };
    if (!okPhone(v)) { say('휴대폰 번호를 확인해 주세요. 예: 010-1234-5678'); f.ph.focus(); return; } if (!f.ag.checked) { say('문자를 받으려면 수집 · 이용에 동의해 주세요.'); return; }
    const btn = f.querySelector('[type=submit]'); btn.disabled = true; try { await put(v); ST.form = false; ST.err = ''; toast(`문자 알림을 켰어요. ${mask(v)}로 보내 드려요.`, 'ok'); } catch (x) { btn.disabled = false; say(errMsg(x, '저장하지 못했어요. 다시 시도해 주세요.')); return; } lrender(); });
})();
