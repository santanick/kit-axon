/* v47 AI 사용량 · 추가 충전(설정 → 「AI 사용량」, AI 사용 정책 카드 옆)
   상태: S.aiplan = { monthTokens, overage: 'block'|'pack' } — 없으면(기존 기관) 월 한도 없음(동작 불변). 새로 가입한 기관만 기본 포함량으로 켠다.
   운영(live.js 있음): GET /api/ai/usage(month · used · included · credit · creditLeft · remaining · pct · state · monthFeature · packs · payOnline)
     추가 충전: POST /api/ai/topup → 토스 결제 창(successUrl ?aitopup=1) → 돌아오면 POST /api/ai/topup/confirm(서버가 토스 승인 확인 뒤 적립) → 즉시 반영
   시연판: 사용량은 이 기기에서 만든 예시 값, 충전은 가짜 승인(S.aicredit)으로 흐름만 보여 준다.
   요금표 원천: service/server/aiprice.js(원가 단가 × 2.5, 부가세 별도) — 아래 DEMO_PRICE는 시연판 표시용 사본입니다. */
(() => {
  const TIERS = [1000000, 2000000, 5000000, 10000000, 20000000, 50000000];
  const MONTH_DEFAULT = 2000000;
  const COST = 7500, MARKUP = 2.5; /* 확인 필요: aiprice.js COST_KRW_PER_M과 같은 자리값 */
  const price = t => { const supply = Math.round(t / 1e6 * COST * MARKUP / 100) * 100; const vat = Math.round(supply * 0.1); return { supply, vat, total: supply + vat }; };
  const DEMO_PACKS = [{ id: 'p1m', tokens: 1e6, name: '100만 토큰' }, { id: 'p5m', tokens: 5e6, name: '500만 토큰' }, { id: 'p20m', tokens: 2e7, name: '2,000만 토큰' }].map(p => ({ ...p, ...price(p.tokens) }));
  const FEAT = { tutor: '학습자 AI 튜터', studio: 'AI SAM', grade: '채점 초안', vision: '비전 대화', lmsqa: '학사 질의' };
  const live = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const role = () => (S && S.me && S.me.role) || '';
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const nf = n => Math.round(+n || 0).toLocaleString('ko-KR');
  const tk = n => { n = +n || 0; return n >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만` : nf(n); }; /* 30만 · 170만 · 2,000만 */
  const planOf = () => { const p = S && S.aiplan; const on = !!p && +p.monthTokens > 0; return { on, monthTokens: on && TIERS.includes(+p.monthTokens) ? +p.monthTokens : MONTH_DEFAULT, overage: p && p.overage === 'block' ? 'block' : 'pack' }; };
  const stateOf = (plan, month, used, credit) => { const limit = plan.monthTokens + credit; const pct = limit > 0 ? Math.floor(used * 100 / limit) : 0;
    return { month, used, included: plan.monthTokens, credit, creditLeft: Math.max(0, Math.min(credit, limit - Math.max(used, plan.monthTokens))), remaining: Math.max(0, limit - used), pct, state: !plan.on ? 'off' : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok' }; };
  const U = { d: null, at: 0, busy: false };

  /* 시연판 예시 사용량: 이달 1일~오늘, 포함량의 약 55%(S.aidemoUsed가 있으면 그 합계로 맞춤) */
  function demo() {
    const today = kst(), month = today.slice(0, 7), n = +today.slice(8, 10); const plan = planOf();
    const target = S.aidemoUsed != null ? +S.aidemoUsed : Math.round(plan.monthTokens * 0.55 * n / 30);
    const W = { tutor: 0.52, studio: 0.3, grade: 0.12, vision: 0.06 }; const days = []; let sum = 0; const raw = [];
    for (let i = 1; i <= n; i++) { const wd = new Date(`${month}-${String(i).padStart(2, '0')}T00:00:00Z`).getUTCDay(); raw.push(wd === 0 || wd === 6 ? 0.35 : 1 + ((i * 37) % 7) / 10); }
    const tot = raw.reduce((a, b) => a + b, 0) || 1;
    raw.forEach((w, i) => { const t = i === raw.length - 1 ? target - sum : Math.round(target * w / tot); sum += t; days.unshift({ day: `${month}-${String(i + 1).padStart(2, '0')}`, calls: Math.round(t / 1800), tin: Math.round(t * 0.7), tout: t - Math.round(t * 0.7) }); });
    const credits = (S.aicredit || []).filter(c => c.month === month); const credit = credits.reduce((a, c) => a + c.tokens, 0);
    const monthFeature = Object.fromEntries(Object.entries(W).map(([k, w]) => [k, { calls: Math.round(target * w / 1800), tin: Math.round(target * w * 0.7), tout: Math.round(target * w * 0.3) }]));
    return { ...stateOf(plan, month, target, credit), plan, days, monthFeature, credits, packs: DEMO_PACKS, payOnline: true, demo: true, tiers: TIERS };
  }
  const data = () => live() ? U.d : demo();
  function load(force) { if (!live() || U.busy || (!force && U.d && Date.now() - U.at < 300e3)) return; U.busy = true;
    api('GET', '/api/ai/usage').then(r => { U.d = { tiers: TIERS, ...r }; U.at = Date.now(); U.busy = false; render(); }).catch(() => { U.busy = false; U.at = Date.now(); }); }

  /* 스타일(공통 app.css는 건드리지 않음) */
  const CSS = `.aiu{display:grid;gap:14px}.aiu .card{padding:18px}.aiu h3{margin:0 0 10px;font-size:15px}.aiu-meter{height:14px;border-radius:8px;background:var(--soft);position:relative;overflow:hidden}
.aiu-meter i{position:absolute;inset:0 auto 0 0;background:var(--ok);border-radius:8px}.aiu-meter.warn i{background:var(--warn)}.aiu-meter.over i{background:var(--bad)}.aiu-meter b{position:absolute;top:0;bottom:0;left:80%;width:2px;background:var(--ink);opacity:.35}
.aiu-big{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin:0 0 10px}.aiu-big strong{font-size:26px}.aiu-big span{color:var(--muted)}
.aiu-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:12px}.aiu-k div{background:var(--soft);border-radius:10px;padding:10px 12px}.aiu-k small{display:block;color:var(--muted);font-size:12px}.aiu-k b{font-size:16px}
.aiu-ch{width:100%;height:150px;display:block}.aiu-ch rect{fill:var(--mag)}.aiu-ch text{font-size:10px;fill:var(--muted)}
.aiu table{width:100%;border-collapse:collapse;font-size:14px}.aiu th,.aiu td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:right}.aiu th:first-child,.aiu td:first-child{text-align:left}
.aiu-packs{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.aiu-pack{border:1px solid var(--line);border-radius:12px;padding:14px;display:grid;gap:6px}.aiu-pack b{font-size:16px}.aiu-pack small{color:var(--muted)}
.aiu-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}.aiu-row select{min-height:36px}
.aiu-alert{display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-radius:10px;padding:10px 14px;margin:0 0 12px;font-size:14px;background:var(--warnl);color:#5f3e00}.aiu-alert.over{background:#fdecec;color:#8a1c1c}.aiu-alert .btn{margin-left:auto}
@media (max-width:640px){.aiu-big strong{font-size:22px}.aiu-alert .btn{margin-left:0}}`;
  const style = () => { if (!document.getElementById('aiuCss')) { const s = document.createElement('style'); s.id = 'aiuCss'; s.textContent = CSS; document.head.appendChild(s); } };

  function chart(d) {
    const days = (d.days || []).filter(x => String(x.day).startsWith(d.month)).slice().reverse(); if (!days.length) return '<p class="mini">이번 달 사용 기록이 아직 없습니다.</p>';
    const n = +kst().slice(8, 10), W = 600, H = 150, bw = W / Math.max(n, days.length); const mx = Math.max(1, ...days.map(x => (+x.tin || 0) + (+x.tout || 0)));
    const bars = days.map(x => { const i = +String(x.day).slice(8, 10) - 1; const v = (+x.tin || 0) + (+x.tout || 0); const h = Math.round(v / mx * (H - 24)); return `<rect x="${(i * bw + 1).toFixed(1)}" y="${H - 14 - h}" width="${Math.max(2, bw - 3).toFixed(1)}" height="${h}" rx="2"><title>${x.day} · ${nf(v)} 토큰 · ${nf(x.calls)}회</title></rect>`; }).join('');
    return `<svg class="aiu-ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="이번 달 일별 사용 토큰(가장 많은 날 ${nf(mx)} 토큰)">${bars}<text x="0" y="${H - 2}">1일</text><text x="${W}" y="${H - 2}" text-anchor="end">${n}일</text></svg>`;
  }
  function view() {
    style(); const d = data();
    if (!d) { load(); return '<div class="aiu"><section class="card"><p class="mini">AI 사용량을 불러오는 중입니다…</p></section></div>'; }
    const own = role() === 'owner'; const P = d.plan || planOf(); const tiers = d.tiers || TIERS; const cls = d.state === 'over' ? 'over' : d.state === 'warn' ? 'warn' : '';
    const limit = d.included + d.credit; const w = P.on ? Math.min(100, d.pct) : 0;
    const head = P.on ? `<div class="aiu-big"><strong>${nf(d.used)}</strong><span>/ ${nf(limit)} 토큰 (${d.pct}%)</span>${d.state === 'over' ? '<span class="tag r">초과 · AI 호출 멈춤</span>' : d.state === 'warn' ? '<span class="tag y">주의 80% 넘음</span>' : '<span class="tag g">정상</span>'}</div>
      <div class="aiu-meter ${cls}" role="meter" aria-label="이번 달 AI 사용량" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, d.pct)}"><i style="width:${w}%"></i><b title="80% 주의선"></b></div>`
      : `<div class="aiu-big"><strong>${nf(d.used)}</strong><span>토큰 사용 · 월 포함량 미설정(한도 없음)</span></div>`;
    const feats = Object.keys(FEAT).filter(k => d.monthFeature && d.monthFeature[k]).concat(Object.keys(d.monthFeature || {}).filter(k => !FEAT[k]));
    const ftab = feats.length ? `<table><thead><tr><th>기능</th><th>호출</th><th>입력 토큰</th><th>출력 토큰</th><th>합계</th></tr></thead><tbody>${feats.map(k => { const f = d.monthFeature[k]; return `<tr><td>${esc(FEAT[k] || k)}</td><td>${nf(f.calls)}</td><td>${nf(f.tin)}</td><td>${nf(f.tout)}</td><td><b>${nf(f.tin + f.tout)}</b></td></tr>`; }).join('')}</tbody></table>` : '<p class="mini">이번 달 기능별 기록이 아직 없습니다.</p>';
    const packs = (d.packs || DEMO_PACKS).map(p => `<div class="aiu-pack"><b>${esc(p.name)}</b><span>${nf(p.total)}원 <small>(공급가 ${nf(p.supply)}원 + 부가세 ${nf(p.vat)}원)</small></span><button class="btn ${own ? 'ink' : ''} sm" data-act="aiu-buy" data-v="${esc(p.id)}" ${own && P.overage !== 'block' ? '' : 'disabled aria-disabled="true"'}>추가 충전</button></div>`).join('');
    const payNote = !own ? '<p class="mini">추가 충전은 정운영자만 할 수 있습니다.</p>' : P.on && P.overage === 'block' ? '<p class="mini">초과 처리가 「차단」입니다. 충전하려면 위에서 「추가 충전 허용」을 고르십시오.</p>' : !d.payOnline ? '<p class="warn" id="aiuPayOff">결제 연결 준비 중 — 산타에 문의하십시오. 충전이 급하면 산타 고객센터로 연락 주십시오.</p>' : `<p class="mini">${d.demo ? '시연판: 결제 창 대신 가짜 승인으로 흐름만 보여 줍니다.' : '토스 결제 창에서 카드로 결제합니다. 결제가 승인되면 바로 한도에 더해집니다.'} 충전량은 결제한 달 말일까지 쓸 수 있습니다.</p>`;
    const hist = (d.credits || []).length ? `<ul class="mini">${d.credits.map(c => `<li>${esc(c.at || '')} · ${tk(c.tokens)} 토큰 · ${nf(c.amount)}원${c.demo ? ' (데모)' : ''}</li>`).join('')}</ul>` : '';
    return `<div class="aiu">
      <section class="card"><h3>이번 달 AI 사용량 <small class="mini">${esc(d.month)} · 매월 1일 초기화</small></h3>${head}
        <div class="aiu-k"><div><small>이번 달 사용</small><b>${nf(d.used)}</b></div><div><small>월 포함량</small><b>${P.on ? nf(d.included) : '미설정'}</b></div><div><small>남은 추가 충전량</small><b>${nf(d.creditLeft)}</b></div><div><small>남은 사용량</small><b>${P.on ? nf(d.remaining) : '한도 없음'}</b></div></div>
        <p class="mini">AI는 구독료와 별도로 쓴 만큼 계산합니다. 포함량과 추가 충전량을 모두 쓰면 학습자 AI 튜터 · AI SAM · 채점 초안이 멈추고, 학습자에게는 선생님께 질문을 넘기도록 안내합니다.</p></section>
      <section class="card"><h3>일별 사용 토큰</h3>${chart(d)}</section>
      <section class="card"><h3>기능별 사용(이번 달)</h3>${ftab}</section>
      <section class="card"><h3>월 포함량 · 초과 처리</h3>
        <div class="aiu-row"><label for="aiuTier">월 포함량</label><select id="aiuTier" ${own ? '' : 'disabled'}>${(P.on ? [] : ['<option value="0" selected>미설정(한도 없음)</option>']).concat(tiers.map(t => `<option value="${t}" ${P.on && t === P.monthTokens ? 'selected' : ''}>${nf(t)} 토큰</option>`)).join('')}</select></div>
        <div class="aiu-row" role="radiogroup" aria-label="초과 처리"><button type="button" role="radio" class="btn sm ${P.overage === 'pack' ? 'ink' : ''}" aria-checked="${P.overage === 'pack'}" data-act="aiu-ov" data-v="pack" ${own ? '' : 'disabled'}>추가 충전 허용</button><button type="button" role="radio" class="btn sm ${P.overage === 'block' ? 'ink' : ''}" aria-checked="${P.overage === 'block'}" data-act="aiu-ov" data-v="block" ${own ? '' : 'disabled'}>초과 시 차단만</button></div>
        <p class="mini">${own ? '월 포함량은 계약한 요금제에 맞춰 고릅니다.' : '정운영자만 바꿀 수 있습니다.'}</p></section>
      <section class="card" id="aiuPacks"><h3>추가 충전</h3><div class="aiu-packs">${packs}</div>${payNote}${hist}</section>
    </div>`;
  }

  /* 설정 카드(aipol.js의 SXC_X 훅 뒤에 덧붙임) · 본문 */
  { const base = window.SXC_X; window.SXC_X = SXN => { const r = typeof base === 'function' ? base(SXN) : []; if (!S || !S.me || role() === 'teacher') return r; SXN.aiuse = 'AI 사용량';
    const d = data(); const P = planOf();
    return r.concat([{ k: 'aiuse', n: 'AI 사용량', i: 'chart', subs: ['aiuse'], kw: 'ai 사용량 토큰 한도 포함량 추가 충전 결제 토스 요금 초과',
      sum: !d ? '불러오는 중' : P.on || (d.plan && d.plan.on) ? `이번 달 ${d.pct}% · 남은 ${tk(d.remaining)} 토큰` : `이번 달 ${tk(d.used)} 토큰 · 한도 없음`,
      q: () => d ? `<div class="sx-kv"><span>이번 달 사용</span><b>${nf(d.used)} 토큰</b></div><div class="sx-kv"><span>월 포함량</span><b>${(d.plan || P).on ? nf(d.included) : '미설정'}</b></div><div class="sx-kv"><span>남은 추가 충전량</span><b>${nf(d.creditLeft)}</b></div>` : '' }]); }; }
  { const base = VIEWS.settings; VIEWS.settings = (...a) => { if (UI.settings === 'aiuse') { if (role() === 'teacher') return '<div class="empty">AI 사용량은 운영자만 볼 수 있습니다.</div>'; return view(); } return base(...a); }; }
  ACT['aiu-open'] = () => { if (typeof slSetOpen === 'function') slSetOpen('aiuse'); UI.settings = 'aiuse'; go('settings'); };

  /* 포함량 · 초과 처리(정운영자) */
  const putPlan = (patch, what) => { if (role() !== 'owner') { toast('AI 월 포함량은 정운영자만 바꿀 수 있습니다.', 'warn'); return; }
    const P = planOf(); S.aiplan = { monthTokens: P.monthTokens, overage: P.overage, ...patch }; if (!(+S.aiplan.monthTokens > 0)) delete S.aiplan; logAudit('AI 사용량 — ' + what); save(); if (U.d) U.d = null, U.at = 0; render(); toast('저장했습니다.', 'ok'); };
  document.addEventListener('change', e => { if (e.target && e.target.id === 'aiuTier') { const v = +e.target.value; putPlan({ monthTokens: v }, v ? `월 포함량 ${nf(v)} 토큰` : '월 포함량 해제'); } });
  ACT['aiu-ov'] = el => { const v = el.dataset.v === 'block' ? 'block' : 'pack'; if (!planOf().on) { toast('먼저 월 포함량을 고르십시오.', 'warn'); return; } putPlan({ overage: v }, v === 'block' ? '초과 시 차단만' : '추가 충전 허용'); };

  /* 추가 충전 */
  const tossSDK = () => window.TossPayments ? Promise.resolve(window.TossPayments) : (U.sdk || (U.sdk = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://js.tosspayments.com/v1/payment'; s.onload = () => window.TossPayments ? ok(window.TossPayments) : no(new Error('sdk')); s.onerror = () => { U.sdk = null; no(new Error('sdk')); }; document.head.appendChild(s); })));
  ACT['aiu-buy'] = async el => {
    if (role() !== 'owner') { toast('추가 충전은 정운영자만 할 수 있습니다.', 'warn'); return; }
    const d = data(); const p = ((d && d.packs) || DEMO_PACKS).find(x => x.id === el.dataset.v); if (!p) return;
    if (!live()) { modal('AI 추가 충전(데모)', `<p><b>${esc(p.name)}</b>을 충전합니다.</p><p>결제 금액 <b>${nf(p.total)}원</b> <span class="mini">(공급가 ${nf(p.supply)}원 + 부가세 ${nf(p.vat)}원)</span></p><p class="mini">시연판에서는 결제 창 대신 가짜 승인으로 처리합니다. 실제 결제는 일어나지 않습니다.</p>`,
      [{ id: 'no', label: '취소' }, { id: 'ok', label: '결제(데모 승인)', kind: 'ink', run: () => { S.aicredit = (S.aicredit || []).concat([{ month: kst().slice(0, 7), pack: p.id, tokens: p.tokens, amount: p.total, at: nowStr(), demo: true }]).slice(-50); logAudit(`AI 사용량 — 추가 충전 ${p.name}(데모)`); save(); render(); toast(`${p.name}을 충전했습니다(데모 승인).`, 'ok'); } }]); return; }
    if (!d.payOnline) { toast('결제 연결 준비 중 — 산타에 문의하십시오.', 'warn'); return; }
    try { const o = await api('POST', '/api/ai/topup', { pack: p.id }); const TP = await tossSDK(); const back = location.origin + location.pathname;
      await TP(o.clientKey).requestPayment('카드', { amount: o.amount, orderId: o.orderId, orderName: String(o.orderName || 'AI 추가 충전').slice(0, 90), successUrl: back + '?aitopup=ok#settings', failUrl: back + '?aitopup=fail#settings' }); }
    catch (e) { if (e && e.code === 'USER_CANCEL') toast('결제를 취소했습니다.', 'warn'); else if (e && e.code === 'pay_off') { if (U.d) U.d.payOnline = false; render(); toast(e.message, 'warn'); } else toast((e && e.message === 'sdk') ? '결제 창을 열 수 없습니다. 잠시 후 다시 시도하십시오.' : (e && e.message) || '결제를 시작하지 못했습니다.', 'bad'); }
  };
  /* 토스 결제 창에서 돌아옴: 서버 승인 확인 → 즉시 반영 */
  let back = false;
  function returned() { if (back || !live()) return; back = true; const q = new URLSearchParams(location.search); const st = q.get('aitopup'); if (!st) return;
    const clean = () => { try { history.replaceState(null, '', location.pathname + '#settings'); } catch (e) { } };
    UI.settings = 'aiuse'; if (typeof slSetOpen === 'function') slSetOpen('aiuse');
    if (st !== 'ok') { clean(); toast('결제가 끝나지 않았습니다. 다시 시도하십시오.', 'warn'); go('settings'); return; }
    api('POST', '/api/ai/topup/confirm', { paymentKey: q.get('paymentKey'), orderId: q.get('orderId'), amount: +q.get('amount') })
      .then(r => { U.d = { ...(U.d || {}), tiers: TIERS, ...r }; U.at = Date.now(); clean(); go('settings'); toast('추가 충전이 반영되었습니다.', 'ok'); })
      .catch(e => { clean(); go('settings'); toast(e.message || '결제 승인을 확인하지 못했습니다.', 'bad'); }); }

  /* 홈 · 머리 알림 한 줄(80% 주의 · 100% 초과) */
  AFTER.push(cur => {
    if (!S || !S.me || role() === 'teacher') return; returned(); load();
    const d = data(); const main = document.getElementById('main'); if (!d || !main || !(d.state === 'warn' || d.state === 'over') || main.querySelector('.aiu-alert')) return;
    style(); const over = d.state === 'over'; const el = document.createElement('div'); el.className = 'aiu-alert' + (over ? ' over' : ''); el.setAttribute('role', over ? 'alert' : 'status');
    el.innerHTML = over ? `<span><b>이번 달 AI 사용량을 모두 썼습니다.</b> 학습자 AI 튜터 · AI SAM이 멈췄습니다.</span><button class="btn sm ink" data-act="aiu-open">${role() === 'owner' ? '추가 충전' : '사용량 보기'}</button>`
      : `<span><b>이번 달 AI 사용량 ${d.pct}%</b> — 포함량을 넘으면 AI 호출이 멈춥니다.</span><button class="btn sm" data-act="aiu-open">사용량 보기</button>`;
    main.insertBefore(el, main.firstChild);
  });

  /* 새로 가입한 기관만 기본 포함량으로 켠다(기존 기관은 aiplan 없음 → 동작 불변) */
  { const base = createOrg; createOrg = (...a) => { const set = () => { try { if (S && S.org) { S.aiplan = { monthTokens: MONTH_DEFAULT, overage: 'pack' }; save(); } } catch (e) { console.error(e); } };
    const r = base(...a); if (r && typeof r.then === 'function') return r.then(ok => { if (ok) set(); return ok; }); set(); return r; }; } /* 운영 모드 createOrg는 Promise(성공 true) */ /* eslint-disable-line no-global-assign */
  window.AIUSE = { data, planOf, price, reload: () => { U.d = null; U.at = 0; load(true); } };
})();
