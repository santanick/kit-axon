/* v38 A-17 쿠폰 · 할인 코드(성인 학원 등 결제를 쓰는 기관)
   - 운영자: 매출 화면 위 '쿠폰 · 할인 코드' 카드 — 코드 · 정률(%)/정액(원) · 사용 기한 · 사용 횟수(0 = 제한 없음) · 대상 강좌(비우면 모든 강좌). S.coupons
   - 학습자: 결제 화면에서 코드 입력 → [적용] → 할인된 최종 금액으로 결제(lshop.js). 데모는 이 브라우저의 기관 데이터, 운영은 POST /api/pub/<tid>/coupon
   - 금액 검증: 운영 서버가 결제 요청(pay 이벤트)의 쿠폰 · 금액을 다시 계산해 맞지 않으면 거절(service/server/coupon.js · Java DdCoupon). 운영자 화면도 기록할 때 다시 계산한다.
   - 결제를 쓰지 않는 기관(mbPayOn() false · 게시본 pay:false)은 운영자 카드 · 학습자 입력칸 모두 숨긴다.
   계산 규칙은 서버(Node · Java)와 같다: 코드는 대문자 · 공백 제거, 정률은 10원 단위 내림, 정액은 결제 금액까지만. */
(function () {
  'use strict';
  const W = window;
  const norm = s => String(s || '').toUpperCase().replace(/\s+/g, '').slice(0, 20);
  /* list: 쿠폰 목록, used: 이 코드로 이미 결제한 횟수, day: 'YYYY-MM-DD'(오늘) */
  function calc(list, code, cls, price, used, day) {
    const k = norm(code); if (!k) return { ok: false, msg: '쿠폰 코드를 입력해 주세요.' };
    const c = (Array.isArray(list) ? list : []).find(x => x && norm(x.code) === k && x.on !== false);
    if (!c) return { ok: false, msg: '없는 쿠폰 코드예요. 코드를 다시 확인해 주세요.' };
    if (c.from && day && day < c.from) return { ok: false, msg: `${c.from}부터 쓸 수 있는 쿠폰이에요.` };
    if (c.until && day && day > c.until) return { ok: false, msg: '사용 기한이 지난 쿠폰이에요.' };
    if (Array.isArray(c.cls) && c.cls.length && !c.cls.includes(cls)) return { ok: false, msg: '이 강좌에는 쓸 수 없는 쿠폰이에요.' };
    if (+c.max > 0 && (+used || 0) >= +c.max) return { ok: false, msg: '사용 횟수가 모두 끝난 쿠폰이에요.' };
    const p = Math.max(0, Math.round(+price || 0)); if (!p) return { ok: false, msg: '결제 금액이 없는 강좌에는 쓸 수 없어요.' };
    const v = Math.max(0, +c.v || 0); const off = c.type === 'amount' ? Math.min(p, Math.round(v)) : Math.min(p, Math.floor(p * Math.min(100, v) / 100 / 10) * 10);
    if (!off) return { ok: false, msg: '할인 금액이 0원인 쿠폰이에요.' };
    return { ok: true, code: k, off, final: p - off, label: c.type === 'amount' ? `${off.toLocaleString('ko-KR')}원 할인` : `${Math.min(100, v)}% 할인` };
  }
  W.cpnCalc = calc; W.cpnNorm = norm;

  /* ═════════ 운영자(스튜디오)에서만 ═════════ */
  if (typeof ACT !== 'object' || typeof AFTER === 'undefined' || typeof VIEWS === 'undefined') return; /* 학습자 화면(learner.html)에서는 계산 함수만 */
  const payOn = () => { try { return typeof mbPayOn !== 'function' || mbPayOn(); } catch (e) { return true; } };
  const L = () => (S.coupons = Array.isArray(S.coupons) ? S.coupons : []);
  const usedOf = code => (S.pays || []).filter(p => p && norm(p.cpn) === norm(code) && !/취소/.test(p.status || '')).length;
  const won2 = n => (typeof won === 'function' ? won(n) : `${(+n || 0).toLocaleString('ko-KR')}원`);
  const gen = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 8; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
  const card = () => { const C0 = L(); const nm = id => ((S.classes || []).find(c => c.id === id) || {}).name || '(지운 강좌)';
    return `<div class="card cpn-card"><div class="ch"><b>쿠폰 · 할인 코드</b><small>학습자가 결제 화면에서 코드를 넣으면 할인됩니다</small><span class="sp"></span><button type="button" class="btn sm pri" data-act="cpn-new">+ 쿠폰 만들기</button></div>
      ${C0.length ? `<div class="tw"><table class="cpn-t"><thead><tr><th>코드</th><th>할인</th><th>기한</th><th>사용</th><th>대상</th><th></th></tr></thead><tbody>${C0.map(c => `<tr><td><b>${esc(c.code)}</b>${c.on === false ? ' <span class="tag">중지</span>' : ''}</td><td>${c.type === 'amount' ? esc(won2(c.v)) : `${+c.v}%`}</td><td>${esc(c.until || '기한 없음')}</td><td>${usedOf(c.code)}${+c.max > 0 ? ` / ${+c.max}회` : '회 · 제한 없음'}</td><td>${(c.cls || []).length ? esc(c.cls.map(nm).join(', ')) : '모든 강좌'}</td><td><button type="button" class="btn sm ghost" data-act="cpn-tog" data-v="${esc(c.id)}">${c.on === false ? '다시 쓰기' : '중지'}</button><button type="button" class="btn sm ghost" data-act="cpn-del" data-v="${esc(c.id)}">지우기</button></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="mini">아직 만든 쿠폰이 없습니다. [+ 쿠폰 만들기]로 코드 · 할인 · 기한 · 사용 횟수 · 대상 강좌를 정합니다.</p>'}</div>`; };
  AFTER.push(() => { try { if (!S || !CUR || CUR.tab !== 'sales' || !payOn()) return; const v = document.querySelector('#main .bview') || document.querySelector('#main'); if (!v || v.querySelector('.cpn-card')) return; v.insertAdjacentHTML('beforeend', card()); } catch (e) { console.error('coupon', e); } });
  ACT['cpn-new'] = () => { const P = (S.classes || []).filter(c => +c.price > 0 && c.status !== '종료');
    modal('쿠폰 만들기', `<label class="fl">쿠폰 코드(영문 · 숫자 4~20자)<span class="cpn-row"><input name="code" maxlength="20" value="${gen()}" autocomplete="off" style="text-transform:uppercase"><button type="button" class="btn sm" data-act="cpn-gen">새 코드</button></span></label>
      <div class="form2"><label class="fl">할인 방식<select name="type"><option value="rate">정률(%)</option><option value="amount">정액(원)</option></select></label><label class="fl">할인 값<input name="v" type="number" min="1" value="10" inputmode="numeric"></label></div>
      <div class="form2"><label class="fl">사용 기한(마지막 날 · 비우면 기한 없음)<input name="until" type="date" min="${today()}"></label><label class="fl">사용 횟수(0 = 제한 없음)<input name="max" type="number" min="0" value="0" inputmode="numeric"></label></div>
      <fieldset class="fl"><legend>쓸 수 있는 강좌(고르지 않으면 모든 유료 강좌)</legend>${P.length ? P.map(c => `<label class="ckl"><input type="checkbox" name="cls" value="${esc(c.id)}"> ${esc(c.name)} · ${esc(won2(c.price))}</label>`).join('') : '<p class="mini">유료 강좌가 아직 없습니다. 만들어 두면 모든 유료 강좌에 쓸 수 있습니다.</p>'}</fieldset>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '쿠폰 만들기', kind: 'pri', run: w => { const g = n => w.querySelector(`[name=${n}]`); const code = norm(g('code').value); const type = g('type').value === 'amount' ? 'amount' : 'rate'; const v = Math.round(+g('v').value || 0);
        if (!/^[A-Z0-9-]{4,20}$/.test(code)) { toast('쿠폰 코드는 영문 · 숫자 4~20자로 적어 주세요.', 'warn'); return false; }
        if (L().some(c => norm(c.code) === code)) { toast('같은 코드의 쿠폰이 이미 있습니다. 다른 코드를 쓰세요.', 'warn'); return false; }
        if (!(v > 0) || (type === 'rate' && v > 100)) { toast(type === 'rate' ? '정률은 1~100%로 적어 주세요.' : '할인 금액을 1원 이상으로 적어 주세요.', 'warn'); return false; }
        const cls = [...w.querySelectorAll('[name=cls]:checked')].map(x => x.value); const x = { id: uid('cp'), code, type, v, until: g('until').value || '', max: Math.max(0, Math.round(+g('max').value || 0)), cls, on: true, at: today() };
        L().unshift(x); logAudit(`쿠폰 만들기 — ${code} (${type === 'rate' ? v + '%' : won2(v)})`); save(); render(); toast(`쿠폰 ${code}를 만들었습니다. 학습자가 결제 화면에서 이 코드를 넣으면 할인됩니다.`, 'ok'); } }]); };
  ACT['cpn-gen'] = () => { const i = document.querySelector('#modal [name=code]'); if (i) i.value = gen(); };
  ACT['cpn-tog'] = el => { const c = L().find(x => x.id === el.dataset.v); if (!c) return; c.on = c.on === false; logAudit(`쿠폰 ${c.on ? '다시 쓰기' : '중지'} — ${c.code}`); save(); render(); };
  ACT['cpn-del'] = el => { const c = L().find(x => x.id === el.dataset.v); if (!c) return; modal('쿠폰 지우기', `<p>쿠폰 <b>${esc(c.code)}</b>를 지웁니다. 이미 쓴 결제 내역은 그대로 남습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '지우기', kind: 'pri', run: () => { S.coupons = L().filter(x => x !== c); logAudit(`쿠폰 지우기 — ${c.code}`); save(); render(); } }]); };
  /* 결제 기록: 쿠폰 할인은 운영자 쪽에서도 다시 계산한다(학습자 값 무시) */
  if (typeof LPX === 'object' && LPX && typeof LPX.pay === 'function') { const base = LPX.pay; LPX.pay = x => { const d = (x && x.data) || {}; const before = (S.pays || []).length; const r = base(x); try { if (d.cpn && (S.pays || []).length > before) { const p = S.pays.find(y => y.id === d.payId) || S.pays[0];
        const R = calc(L(), d.cpn, p.ref, +p.amount || 0, usedOf(d.cpn), (x.at ? String(x.at).slice(0, 10) : today())); if (R.ok) { p.cpn = R.code; p.cpnOff = R.off; p.listAmount = p.amount; p.amount = R.final; logAudit(`쿠폰 사용 — ${R.code} · ${won2(R.off)} 할인`); } else { p.cpnBad = norm(d.cpn); logAudit(`쿠폰 확인 실패 — ${norm(d.cpn)}: ${R.msg}`); } } } catch (e) { console.error('coupon pay', e); } return r; }; }
})();
