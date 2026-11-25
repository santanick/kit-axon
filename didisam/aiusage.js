/* v47 AI 사용량 · 추가 충전 · 산타 관리(설정 → 「AI 사용량」, AI 사용 정책 카드 옆 / 「산타 관리」는 산타 관리자만)
   요금(대표님 확정 2026-11-24): 100만 토큰당 2만 원 고정(부가세 별도 — 화면은 부가세 포함 병기), 충전은 10만 원 단위 · 많이 살수록 할인(최대 30%),
   충전량은 충전일부터 1년 동안 사용(남은 양은 다음 달로 이어짐). 월 포함량을 먼저 쓰고, 넘으면 오래된 충전부터 뺀다.
   상태: S.plan = { code, tier, contract, aiMonthTokens, since }(산타만) · S.aiplan = { monthTokens(산타), overage(정운영자) } — aiplan 없으면(기존 기관) 한도 없음(동작 불변).
   운영(live.js 있음): GET /api/ai/usage(… · contractPlan · price · credits[충전일 · 만료일 · 남은 양]) · POST /api/ai/topup { won } → 토스 → /api/ai/topup/confirm
     산타 관리: GET /api/santa/orgs?q= · PUT /api/santa/orgs/:tid/plan(LIVE.user.santa — 서버 SANTA_ADMIN_EMAILS)
   시연판: 사용량은 이 기기 예시 값, 충전은 가짜 승인(S.aicredit), 산타 관리는 데모 기관 목록(S.santaDemo)으로 흐름만 보여 준다.
   요금표 원천: service/server/aiprice.js — 아래 PRICE는 시연판 · 서버 응답이 없을 때 쓰는 표시용 사본입니다. */
(() => {
  const PRICE = { perM: 20000, perMVat: 22000, step: 100000, min: 100000, max: 100000000, discounts: [[100000, 0], [500000, 5], [1000000, 10], [3000000, 15], [5000000, 20], [10000000, 25], [20000000, 30]] };
  const TRIAL = 2000000, CREDIT_DAYS = 365;
  const CHIPS = [100000, 500000, 1000000, 3000000, 5000000, 10000000, 20000000];
  const CONTRACT = { sub: '구독', multi: '다년 계약', build: '구축' };
  const CODES = ['TRIAL', 'E1', 'E2', 'E3', 'E4', 'U0', 'U1', 'U2', 'U3', 'U4', 'G1', 'G2', 'G3', 'G4'];
  const priceOf = () => (U.d && U.d.price) || (window.PLAN_TABLE && PLAN_TABLE.ai) || PRICE; /* 표시용 사본의 원천은 plan.js PLAN_TABLE.ai */
  const quote = won => { const P = priceOf(); won = +won; if (!Number.isInteger(won) || won % P.step || won < P.min || won > P.max) return null; let d = 0; for (const [w, x] of P.discounts) if (won >= w) d = x;
    const vat = Math.round(won * 0.1); return { won, supply: won, vat, total: won + vat, discount: d, unit: P.perM * (100 - d) / 100, base: won * 1e6 / P.perM, tokens: Math.floor(won * 5000 / (100 - d)) }; };
  const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  /* 서버 simCredits와 같은 규칙(시연판용 사본) */
  const simCredits = (credits, usage, included, today) => { const L = credits.map(c => ({ ...c, expires: c.expires || addDays(c.day, CREDIT_DAYS), left: +c.tokens })).sort((a, b) => a.day < b.day ? -1 : a.day > b.day ? 1 : 0); const month = today.slice(0, 7); const cum = {}; let thisMonth = 0;
    for (const u of usage.slice().sort((a, b) => a.day < b.day ? -1 : 1)) { if (u.day > today) continue; const m = u.day.slice(0, 7); const prev = cum[m] || 0; const cur = prev + (+u.n || 0); cum[m] = cur; let over = Math.max(0, cur - included) - Math.max(0, prev - included);
      for (const c of L) { if (over <= 0) break; if (c.left <= 0 || c.day > u.day || c.expires < u.day) continue; const t = Math.min(c.left, over); c.left -= t; over -= t; if (m === month) thisMonth += t; } }
    const live = L.filter(c => c.expires >= today && c.day <= today); const left = live.reduce((a, c) => a + c.left, 0); return { live, thisMonth, left, credit: thisMonth + left }; };
  const FEAT = { tutor: '학습자 AI 튜터', studio: 'AI SAM', grade: '채점 초안', vision: '비전 대화', lmsqa: '학사 질의' };
  const live = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const role = () => (S && S.me && S.me.role) || '';
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const nf = n => Math.round(+n || 0).toLocaleString('ko-KR');
  const tk = n => { n = +n || 0; return n >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만` : nf(n); }; /* 30만 · 170만 · 2,000만 */
  const planOf = () => { const p = S && S.aiplan; const on = !!p && Number.isInteger(+p.monthTokens) && +p.monthTokens > 0; return { on, monthTokens: on ? +p.monthTokens : TRIAL, overage: p && p.overage === 'block' ? 'block' : 'pack' }; };
  const isSanta = () => live() ? !!(LIVE.user && LIVE.user.santa) : !!(S && S.me && S.me.role === 'owner'); /* 시연판: 데모 정운영자에게 흐름 확인용으로 보임 */
  const stateOf = (plan, month, used, credit) => { const limit = plan.monthTokens + credit; const pct = limit > 0 ? Math.floor(used * 100 / limit) : 0;
    return { month, used, included: plan.monthTokens, credit, creditLeft: Math.max(0, Math.min(credit, limit - Math.max(used, plan.monthTokens))), remaining: Math.max(0, limit - used), pct, state: !plan.on ? 'off' : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok' }; };
  const U = { d: null, at: 0, busy: false, won: 1000000, sq: '', so: null, sel: '' };

  /* 시연판 예시 사용량: 이달 1일~오늘, 포함량의 약 55%(S.aidemoUsed가 있으면 그 합계로 맞춤) */
  function demo() {
    const today = kst(), month = today.slice(0, 7), n = +today.slice(8, 10); const plan = planOf();
    const target = S.aidemoUsed != null ? +S.aidemoUsed : Math.round(plan.monthTokens * 0.55 * n / 30);
    const W = { tutor: 0.52, studio: 0.3, grade: 0.12, vision: 0.06 }; const days = []; let sum = 0; const raw = [];
    for (let i = 1; i <= n; i++) { const wd = new Date(`${month}-${String(i).padStart(2, '0')}T00:00:00Z`).getUTCDay(); raw.push(wd === 0 || wd === 6 ? 0.35 : 1 + ((i * 37) % 7) / 10); }
    const tot = raw.reduce((a, b) => a + b, 0) || 1;
    raw.forEach((w, i) => { const t = i === raw.length - 1 ? target - sum : Math.round(target * w / tot); sum += t; days.unshift({ day: `${month}-${String(i + 1).padStart(2, '0')}`, calls: Math.round(t / 1800), tin: Math.round(t * 0.7), tout: t - Math.round(t * 0.7) }); });
    /* 충전(시연판): 충전일부터 1년. 오늘 충전한 것은 이달 사용 기록 전체에 대해 차감(서버와 같은 일 단위 규칙의 단순판 — 이달 사용을 오늘 하루로 모아 계산) */
    const cr = (S.aicredit || []).map(c => ({ ...c, day: c.day || String(c.at || today).slice(0, 10) })); const sim = simCredits(cr, cr.length ? [{ day: today, n: target }] : [], plan.monthTokens, today);
    const monthFeature = Object.fromEntries(Object.entries(W).map(([k, w]) => [k, { calls: Math.round(target * w / 1800), tin: Math.round(target * w * 0.7), tout: Math.round(target * w * 0.3) }]));
    return { ...stateOf(plan, month, target, sim.credit), plan, days, monthFeature, credits: sim.live, contractPlan: S.plan || null, price: (window.PLAN_TABLE && PLAN_TABLE.ai) || PRICE, payOnline: true, demo: true };
  }
  const data = () => live() ? U.d : demo();
  function load(force) { if (!live() || U.busy || (!force && U.d && Date.now() - U.at < 300e3)) return; U.busy = true;
    api('GET', '/api/ai/usage').then(r => { U.d = { ...r }; U.at = Date.now(); U.busy = false; render(); }).catch(() => { U.busy = false; U.at = Date.now(); }); }

  /* 스타일(공통 app.css는 건드리지 않음) */
  const CSS = `.aiu{display:grid;gap:14px}.aiu .card{padding:18px}.aiu h3{margin:0 0 10px;font-size:15px}.aiu-meter{height:14px;border-radius:8px;background:var(--soft);position:relative;overflow:hidden}
.aiu-meter i{position:absolute;inset:0 auto 0 0;background:var(--ok);border-radius:8px}.aiu-meter.warn i{background:var(--warn)}.aiu-meter.over i{background:var(--bad)}.aiu-meter b{position:absolute;top:0;bottom:0;left:80%;width:2px;background:var(--ink);opacity:.35}
.aiu-big{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin:0 0 10px}.aiu-big strong{font-size:26px}.aiu-big span{color:var(--muted)}
.aiu-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:12px}.aiu-k div{background:var(--soft);border-radius:10px;padding:10px 12px}.aiu-k small{display:block;color:var(--muted);font-size:12px}.aiu-k b{font-size:16px}
.aiu-ch{width:100%;height:150px;display:block}.aiu-ch rect{fill:var(--mag)}.aiu-ch text{font-size:10px;fill:var(--muted)}
.aiu table{width:100%;border-collapse:collapse;font-size:14px}.aiu th,.aiu td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:right}.aiu th:first-child,.aiu td:first-child{text-align:left}
.aiu-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}.aiu-chips .btn{min-height:36px}.aiu-won{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px}.aiu-won input{width:140px;min-height:38px;font-size:16px;text-align:right}
.aiu-q{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;border:1px solid var(--line);border-radius:12px;padding:14px;margin:0 0 10px}.aiu-q small{display:block;color:var(--muted);font-size:12px}.aiu-q b{font-size:18px}.aiu-q .aiu-pay b{color:var(--mag)}
.aiu-dc{font-size:12px;color:var(--muted);margin:6px 0 0}.aiu-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:10px 0}.aiu-form label{display:grid;gap:4px;font-size:13px}.aiu-form input,.aiu-form select,.aiu-form textarea{min-height:36px;width:100%;box-sizing:border-box}
.aiu-org{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:0 0 8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.aiu-org.on{border-color:var(--mag)}.aiu-org .btn{margin-left:auto}.aiu-ro{background:var(--soft);border-radius:10px;padding:10px 12px}
.aiu-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}.aiu-row select{min-height:36px}
.aiu-alert{display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-radius:10px;padding:10px 14px;margin:0 0 12px;font-size:14px;background:var(--warnl);color:#5f3e00}.aiu-alert.over{background:#fdecec;color:#8a1c1c}.aiu-alert .btn{margin-left:auto}
@media (max-width:640px){.aiu-big strong{font-size:22px}.aiu-alert .btn,.aiu-org .btn{margin-left:0}.aiu table{font-size:13px}}`;
  const style = () => { if (!document.getElementById('aiuCss')) { const s = document.createElement('style'); s.id = 'aiuCss'; s.textContent = CSS; document.head.appendChild(s); } };

  function chart(d) {
    const days = (d.days || []).filter(x => String(x.day).startsWith(d.month)).slice().reverse(); if (!days.length) return '<p class="mini">이번 달 사용 기록이 아직 없습니다.</p>';
    const n = +kst().slice(8, 10), W = 600, H = 150, bw = W / Math.max(n, days.length); const mx = Math.max(1, ...days.map(x => (+x.tin || 0) + (+x.tout || 0)));
    const bars = days.map(x => { const i = +String(x.day).slice(8, 10) - 1; const v = (+x.tin || 0) + (+x.tout || 0); const h = Math.round(v / mx * (H - 24)); return `<rect x="${(i * bw + 1).toFixed(1)}" y="${H - 14 - h}" width="${Math.max(2, bw - 3).toFixed(1)}" height="${h}" rx="2"><title>${x.day} · ${nf(v)} 토큰 · ${nf(x.calls)}회</title></rect>`; }).join('');
    return `<svg class="aiu-ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="이번 달 일별 사용 토큰(가장 많은 날 ${nf(mx)} 토큰)">${bars}<text x="0" y="${H - 2}">1일</text><text x="${W}" y="${H - 2}" text-anchor="end">${n}일</text></svg>`;
  }
  /* 충전 금액 선택 → 받는 토큰(할인 반영) · 결제 금액(부가세 포함) 바로 보기 */
  function quoteBox(won) { const q = quote(won); const P = priceOf();
    if (!q) return `<div class="aiu-q" id="aiuQuote" aria-live="polite"><div><small>충전 금액</small><b class="bad">10만 원 단위로 골라 주십시오</b><small>${nf(P.min / 1e4)}만 ~ ${nf(P.max / 1e4)}만 원</small></div></div>`;
    return `<div class="aiu-q" id="aiuQuote" aria-live="polite"><div><small>받는 토큰</small><b>${nf(q.tokens)}</b><small>${q.discount ? `할인 없이 ${nf(q.base)} → +${nf(q.tokens - q.base)}` : '기본 단가'}</small></div>
      <div><small>할인</small><b>${q.discount}%</b><small>100만 토큰당 ${nf(q.unit)}원(부가세 포함 ${nf(Math.round(q.unit * 1.1))}원)</small></div>
      <div class="aiu-pay"><small>결제 금액(부가세 포함)</small><b>${nf(q.total)}원</b><small>공급가 ${nf(q.supply)}원 + 부가세 ${nf(q.vat)}원</small></div></div>`; }
  function topupCard(d, P, own) {
    const pr = priceOf(); const can = own && P.overage !== 'block' && d.payOnline; const won = U.won;
    const chips = CHIPS.map(w => `<button type="button" class="btn sm ${w === won ? 'ink' : ''}" data-act="aiu-won" data-v="${w}" aria-pressed="${w === won}">${nf(w / 1e4)}만 원</button>`).join('');
    const dc = pr.discounts.filter(x => x[1]).map(([w, x]) => `${nf(w / 1e4)}만 원 이상 ${x}%`).join(' · ');
    const payNote = !own ? '<p class="mini">추가 충전은 정운영자만 할 수 있습니다.</p>' : P.on && P.overage === 'block' ? '<p class="mini">초과 처리가 「차단」입니다. 충전하려면 위에서 「추가 충전 허용」을 고르십시오.</p>' : !d.payOnline ? '<p class="warn" id="aiuPayOff">결제 연결 준비 중 — 산타에 문의하십시오. 충전이 급하면 산타 고객센터로 연락 주십시오.</p>' : `<p class="mini">${d.demo ? '시연판: 결제 창 대신 가짜 승인으로 흐름만 보여 줍니다.' : '토스 결제 창에서 카드로 결제합니다. 결제가 승인되면 바로 한도에 더해집니다.'}</p>`;
    const rows = (d.credits || []); const hist = rows.length ? `<h3 style="margin-top:14px">충전 내역(쓸 수 있는 것)</h3><table><thead><tr><th>충전일</th><th>만료일</th><th>충전량</th><th>남은 양</th><th>결제 금액</th></tr></thead><tbody>${rows.map(c => `<tr><td>${esc(c.day || String(c.at || '').slice(0, 10))}</td><td>${esc(c.expires || '')}</td><td>${nf(c.tokens)}</td><td><b>${nf(c.left)}</b></td><td>${nf(c.amount)}원${c.demo ? ' (데모)' : ''}</td></tr>`).join('')}</tbody></table>` : '';
    return `<section class="card" id="aiuPacks"><h3>추가 충전</h3>
      <p class="mini">100만 토큰당 <b>${nf(pr.perM)}원</b>(부가세 포함 ${nf(pr.perMVat)}원) · 10만 원 단위 · 많이 살수록 할인(최대 30%)</p>
      <p><b>충전량은 충전일부터 1년 동안 써요(남은 양은 다음 달로 이어져요)</b></p>
      <div class="aiu-chips" role="group" aria-label="충전 금액 빠른 선택">${chips}</div>
      <div class="aiu-won"><label for="aiuWon">직접 선택</label><input id="aiuWon" type="number" inputmode="numeric" min="${pr.min / 1e4}" max="${pr.max / 1e4}" step="${pr.step / 1e4}" value="${won / 1e4}" aria-describedby="aiuWonU"><span id="aiuWonU">만 원(10만 원 단위)</span></div>
      ${quoteBox(won)}
      <button class="btn ${can ? 'ink' : ''}" data-act="aiu-buy" ${can && quote(won) ? '' : 'disabled aria-disabled="true"'}>충전하기</button>
      <p class="aiu-dc">할인: ${dc}</p>${payNote}${hist}</section>`;
  }
  function view() {
    style(); const d = data();
    if (!d) { load(); return '<div class="aiu"><section class="card"><p class="mini">AI 사용량을 불러오는 중입니다…</p></section></div>'; }
    const own = role() === 'owner'; const P = d.plan || planOf(); const cls = d.state === 'over' ? 'over' : d.state === 'warn' ? 'warn' : '';
    const limit = d.included + d.credit; const w = P.on ? Math.min(100, d.pct) : 0; const cp = d.contractPlan;
    const head = P.on ? `<div class="aiu-big"><strong>${nf(d.used)}</strong><span>/ ${nf(limit)} 토큰 (${d.pct}%)</span>${d.state === 'over' ? '<span class="tag r">초과 · AI 호출 멈춤</span>' : d.state === 'warn' ? '<span class="tag y">주의 80% 넘음</span>' : '<span class="tag g">정상</span>'}</div>
      <div class="aiu-meter ${cls}" role="meter" aria-label="이번 달 AI 사용량" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, d.pct)}"><i style="width:${w}%"></i><b title="80% 주의선"></b></div>`
      : `<div class="aiu-big"><strong>${nf(d.used)}</strong><span>토큰 사용 · 월 포함량 미설정(한도 없음)</span></div>`;
    const feats = Object.keys(FEAT).filter(k => d.monthFeature && d.monthFeature[k]).concat(Object.keys(d.monthFeature || {}).filter(k => !FEAT[k]));
    const ftab = feats.length ? `<table><thead><tr><th>기능</th><th>호출</th><th>입력 토큰</th><th>출력 토큰</th><th>합계</th></tr></thead><tbody>${feats.map(k => { const f = d.monthFeature[k]; return `<tr><td>${esc(FEAT[k] || k)}</td><td>${nf(f.calls)}</td><td>${nf(f.tin)}</td><td>${nf(f.tout)}</td><td><b>${nf(f.tin + f.tout)}</b></td></tr>`; }).join('')}</tbody></table>` : '<p class="mini">이번 달 기능별 기록이 아직 없습니다.</p>';
    const planRo = `<div class="aiu-ro" id="aiuPlanRo"><div class="sx-kv"><span>요금제</span><b>${cp ? `${esc(cp.code)}${cp.tier ? ' · ' + esc(cp.tier) : ''} · ${esc(CONTRACT[cp.contract] || cp.contract || '')}` : '미지정'}</b></div><div class="sx-kv"><span>월 포함량</span><b>${P.on ? nf(d.included) + ' 토큰' : '미설정(한도 없음)'}</b></div>${cp && cp.since ? `<div class="sx-kv"><span>적용일</span><b>${esc(cp.since)}</b></div>` : ''}</div>`;
    return `<div class="aiu">
      <section class="card"><h3>이번 달 AI 사용량 <small class="mini">${esc(d.month)} · 매월 1일 초기화</small></h3>${head}
        <div class="aiu-k"><div><small>이번 달 사용</small><b>${nf(d.used)}</b></div><div><small>월 포함량</small><b>${P.on ? nf(d.included) : '미설정'}</b></div><div><small>남은 충전량</small><b>${nf(d.creditLeft)}</b></div><div><small>남은 사용량</small><b>${P.on ? nf(d.remaining) : '한도 없음'}</b></div></div>
        <p class="mini">AI는 구독료와 별도로 쓴 만큼 계산합니다. 매달 월 포함량을 먼저 쓰고, 넘으면 충전량에서 오래된 것부터 뺍니다. 모두 쓰면 학습자 AI 튜터 · AI SAM · 채점 초안이 멈추고, 학습자에게는 선생님께 질문을 넘기도록 안내합니다.</p></section>
      <section class="card"><h3>일별 사용 토큰</h3>${chart(d)}</section>
      <section class="card"><h3>기능별 사용(이번 달)</h3>${ftab}</section>
      <section class="card"><h3>요금제 · 월 포함량 · 초과 처리</h3>${planRo}
        <p class="mini">포함량 변경은 산타에 문의하십시오. 계약한 요금제에 맞춰 산타가 넣어 드립니다.</p>
        <div class="aiu-row" role="radiogroup" aria-label="초과 처리"><button type="button" role="radio" class="btn sm ${P.overage === 'pack' ? 'ink' : ''}" aria-checked="${P.overage === 'pack'}" data-act="aiu-ov" data-v="pack" ${own ? '' : 'disabled'}>추가 충전 허용</button><button type="button" role="radio" class="btn sm ${P.overage === 'block' ? 'ink' : ''}" aria-checked="${P.overage === 'block'}" data-act="aiu-ov" data-v="block" ${own ? '' : 'disabled'}>초과 시 차단만</button></div>
        <p class="mini">${own ? '초과 처리는 정운영자가 고릅니다.' : '초과 처리는 정운영자만 바꿀 수 있습니다.'}</p></section>
      ${topupCard(d, P, own)}
    </div>`;
  }

  /* 산타 관리(숨은 메뉴): 기관 검색 → 요금제 코드 · 월 포함 토큰 · 메모 저장, 변경 이력 */
  const demoOrgs = () => { if (!S.santaDemo) S.santaDemo = { orgs: [{ tid: 'tn_demohere01', name: (S.org && S.org.name) || '체험 기관', type: (S.org && S.org.type) || 'univ', here: true, log: [] }, { tid: 'tn_demokit001', name: '경남정보대학교(예시)', type: 'univ', plan: { code: 'U2', tier: 'University', contract: 'multi', aiMonthTokens: 30000000, since: '2026-09-01' }, aiplan: { monthTokens: 30000000, overage: 'pack' }, used: 12400000, log: [] }, { tid: 'tn_democorp01', name: '산타 고객사(예시)', type: 'corp', log: [] }] };
    const h = S.santaDemo.orgs.find(o => o.here); if (h) { h.plan = S.plan || null; h.aiplan = S.aiplan || null; h.used = data() ? data().used : 0; h.name = (S.org && S.org.name) || h.name; } return S.santaDemo.orgs; };
  function santaLoad() { if (!live()) { U.so = demoOrgs().filter(o => !U.sq || o.name.includes(U.sq) || o.tid === U.sq).map(o => ({ ...o, ready: true, memo: (o.log[0] || {}).memo || '' })); return Promise.resolve(); }
    return api('GET', '/api/santa/orgs?q=' + encodeURIComponent(U.sq)).then(r => { U.so = r.orgs || []; render(); }).catch(e => { U.so = []; toast(errMsg(e, '기관 목록을 불러오지 못했습니다.'), 'bad'); render(); }); }
  function santaView() {
    style(); if (!isSanta()) return '<div class="empty">산타 관리자만 쓸 수 있습니다.</div>';
    if (U.so === null) { santaLoad().then(() => render()); return '<div class="aiu"><section class="card"><p class="mini">기관 목록을 불러오는 중입니다…</p></section></div>'; }
    const list = U.so.length ? U.so.map(o => `<div class="aiu-org ${o.tid === U.sel ? 'on' : ''}"><b>${esc(o.name)}</b><span class="mini">${esc(o.tid)} · ${esc(o.type || '')}</span><span class="tag">${o.plan ? esc(o.plan.code) : '요금제 없음'}</span><span class="mini">월 포함 ${o.aiplan && o.aiplan.monthTokens ? nf(o.aiplan.monthTokens) : '한도 없음'} · 이달 ${nf(o.used)}</span><button class="btn sm" data-act="aiu-sorg" data-v="${esc(o.tid)}">${o.tid === U.sel ? '편집 중' : '편집'}</button></div>`).join('') : '<p class="mini">찾은 기관이 없습니다.</p>';
    const o = U.so.find(x => x.tid === U.sel); const p = (o && o.plan) || {};
    const form = !o ? '' : !o.ready ? '<p class="warn">이 기관은 아직 스튜디오를 연 적이 없어 저장할 데이터가 없습니다.</p>' : `<section class="card" id="aiuSantaForm"><h3>${esc(o.name)} — 요금제 · 월 포함 토큰</h3>
      <div class="aiu-form"><label>요금제 코드<input id="sCode" list="sCodes" value="${esc(p.code || '')}" placeholder="E1 · U0 · G4 · TRIAL" maxlength="5"></label><datalist id="sCodes">${CODES.map(c => `<option value="${c}">`).join('')}</datalist>
        <label>등급 이름<input id="sTier" value="${esc(p.tier || '')}" maxlength="30" placeholder="Enterprise"></label>
        <label>계약 형태<select id="sContract">${Object.entries(CONTRACT).map(([k, v]) => `<option value="${k}" ${p.contract === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>월 포함 토큰(0 = 한도 없음)<input id="sTokens" type="number" min="0" step="1000000" value="${p.aiMonthTokens != null ? p.aiMonthTokens : (o.aiplan && o.aiplan.monthTokens) || 0}"></label>
        <label>적용일<input id="sSince" type="date" value="${esc(p.since || kst())}"></label></div>
      <label class="mini" for="sMemo">메모(산타 내부용, 기관에는 보이지 않음)</label><textarea id="sMemo" rows="2" maxlength="500" style="width:100%;box-sizing:border-box">${esc(o.memo || '')}</textarea>
      <div class="aiu-row"><button class="btn ink" data-act="aiu-ssave">저장</button><span class="mini">저장하면 기관 화면에 바로 반영되고, 기관 정운영자는 포함량을 바꿀 수 없습니다.</span></div>
      <h3 style="margin-top:12px">변경 이력</h3>${(o.log || []).length ? `<table><thead><tr><th>일시</th><th>변경한 사람</th><th>변경</th><th>메모</th></tr></thead><tbody>${o.log.map(l => `<tr><td>${esc(l.at)}</td><td>${esc(l.actor)}</td><td>${l.before ? esc(l.before.code) + ' ' + nf(l.before.aiMonthTokens) : '없음'} → <b>${esc(l.after.code)} ${nf(l.after.aiMonthTokens)}</b></td><td>${esc(l.memo || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="mini">아직 변경 이력이 없습니다.</p>'}</section>`;
    return `<div class="aiu"><section class="card"><h3>산타 관리 <small class="mini">${live() ? '산타 관리자 계정' : '시연판: 데모 기관으로 흐름만 보여 줍니다'}</small></h3>
      <div class="aiu-row"><label for="sQ" class="sr-only">기관 검색</label><input id="sQ" type="search" value="${esc(U.sq)}" placeholder="기관 이름 또는 기관 ID" style="flex:1;min-width:180px;min-height:36px"><button class="btn sm" data-act="aiu-sfind">검색</button></div>${list}</section>${form}</div>`;
  }

  /* 설정 카드(aipol.js의 SXC_X 훅 뒤에 덧붙임) · 본문 */
  { const base = window.SXC_X; window.SXC_X = SXN => { const r = typeof base === 'function' ? base(SXN) : []; if (!S || !S.me || role() === 'teacher') return r; SXN.aiuse = 'AI 사용량';
    const d = data(); const P = planOf();
    return r.concat([{ k: 'aiuse', n: 'AI 사용량', i: 'chart', subs: ['aiuse'], kw: 'ai 사용량 토큰 한도 포함량 추가 충전 결제 토스 요금 초과',
      sum: !d ? '불러오는 중' : P.on || (d.plan && d.plan.on) ? `이번 달 ${d.pct}% · 남은 ${tk(d.remaining)} 토큰` : `이번 달 ${tk(d.used)} 토큰 · 한도 없음`,
      q: () => d ? `<div class="sx-kv"><span>이번 달 사용</span><b>${nf(d.used)} 토큰</b></div><div class="sx-kv"><span>월 포함량</span><b>${(d.plan || P).on ? nf(d.included) : '미설정'}</b></div><div class="sx-kv"><span>남은 추가 충전량</span><b>${nf(d.creditLeft)}</b></div>` : '' }]); }; }
  { const base = window.SXC_X; window.SXC_X = SXN => { const r = typeof base === 'function' ? base(SXN) : []; if (!S || !S.me || !isSanta()) return r; SXN.santa = '산타 관리';
    return r.concat([{ k: 'santa', n: '산타 관리', i: 'shield', subs: ['santa'], kw: '산타 관리 요금제 포함 토큰 계약 기관 검색', sum: '기관 요금제 · 월 포함 토큰', q: () => '<div class="sx-kv"><span>권한</span><b>산타 관리자</b></div>' }]); }; }
  { const base = VIEWS.settings; VIEWS.settings = (...a) => { if (UI.settings === 'santa') return santaView(); if (UI.settings === 'aiuse') { if (role() === 'teacher') return '<div class="empty">AI 사용량은 운영자만 볼 수 있습니다.</div>'; return view(); } return base(...a); }; }
  ACT['santa-open'] = () => { if (typeof slSetOpen === 'function') slSetOpen('santa'); UI.settings = 'santa'; U.so = null; go('settings'); };
  ACT['aiu-open'] = () => { if (typeof slSetOpen === 'function') slSetOpen('aiuse'); UI.settings = 'aiuse'; go('settings'); };

  /* 초과 처리(정운영자) — 포함량은 산타가 넣는다 */
  ACT['aiu-ov'] = el => { const v = el.dataset.v === 'block' ? 'block' : 'pack'; if (role() !== 'owner') { toast('초과 처리는 정운영자만 바꿀 수 있습니다.', 'warn'); return; } if (!planOf().on) { toast('월 포함량이 없습니다. 포함량은 산타에 문의하십시오.', 'warn'); return; }
    S.aiplan = { ...S.aiplan, overage: v }; logAudit('AI 사용량 — ' + (v === 'block' ? '초과 시 차단만' : '추가 충전 허용')); save(); if (U.d && U.d.plan) U.d.plan = { ...U.d.plan, overage: v }; render(); toast('저장했습니다.', 'ok'); };

  /* 충전 금액 선택 */
  const setWon = (won, keepInput) => { U.won = won; const q = document.getElementById('aiuQuote'); if (q) q.outerHTML = quoteBox(won);
    document.querySelectorAll('[data-act="aiu-won"]').forEach(b => { const on = +b.dataset.v === won; b.classList.toggle('ink', on); b.setAttribute('aria-pressed', on); });
    const i = document.getElementById('aiuWon'); if (i && !keepInput) i.value = won / 1e4; const bt = document.querySelector('[data-act="aiu-buy"]'); const d = data(); const P = (d && d.plan) || planOf();
    if (bt) { const can = role() === 'owner' && P.overage !== 'block' && d && d.payOnline && !!quote(won); bt.disabled = !can; bt.classList.toggle('ink', can); } };
  ACT['aiu-won'] = el => setWon(+el.dataset.v);
  document.addEventListener('input', e => { if (e.target && e.target.id === 'aiuWon') setWon(Math.round(+e.target.value * 1e4), true); });
  /* 추가 충전 */
  const tossSDK = () => window.TossPayments ? Promise.resolve(window.TossPayments) : (U.sdk || (U.sdk = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://js.tosspayments.com/v1/payment'; s.onload = () => window.TossPayments ? ok(window.TossPayments) : no(new Error('sdk')); s.onerror = () => { U.sdk = null; no(new Error('sdk')); }; document.head.appendChild(s); })));
  ACT['aiu-buy'] = async () => {
    if (role() !== 'owner') { toast('추가 충전은 정운영자만 할 수 있습니다.', 'warn'); return; }
    const d = data(); const q = quote(U.won); if (!q) { toast('충전 금액은 10만 원 단위로 골라 주십시오.', 'warn'); return; }
    const exp = addDays(kst(), CREDIT_DAYS); const won = `${nf(q.won / 1e4)}만 원`;
    if (!live()) { modal('AI 추가 충전(데모)', `<p><b>${won}</b> 충전 → <b>${nf(q.tokens)} 토큰</b>${q.discount ? ` (할인 ${q.discount}%)` : ''}</p><p>결제 금액 <b>${nf(q.total)}원</b> <span class="mini">(공급가 ${nf(q.supply)}원 + 부가세 ${nf(q.vat)}원)</span></p><p class="mini">충전량은 충전일부터 1년 동안 써요(만료일 ${exp}). 시연판에서는 결제 창 대신 가짜 승인으로 처리합니다. 실제 결제는 일어나지 않습니다.</p>`,
      [{ id: 'no', label: '취소' }, { id: 'ok', label: '결제(데모 승인)', kind: 'ink', run: () => { S.aicredit = (S.aicredit || []).concat([{ month: kst().slice(0, 7), day: kst(), expires: exp, pack: 'w' + q.won / 1e5, tokens: q.tokens, amount: q.total, at: nowStr(), demo: true }]).slice(-50); logAudit(`AI 사용량 — 추가 충전 ${won} · ${nf(q.tokens)} 토큰(데모)`); save(); render(); toast(`${nf(q.tokens)} 토큰을 충전했습니다(데모 승인).`, 'ok'); } }]); return; }
    if (!d.payOnline) { toast('결제 연결 준비 중 — 산타에 문의하십시오.', 'warn'); return; }
    try { const o = await api('POST', '/api/ai/topup', { won: q.won }); const TP = await tossSDK(); const back = location.origin + location.pathname;
      await TP(o.clientKey).requestPayment('카드', { amount: o.amount, orderId: o.orderId, orderName: String(o.orderName || 'AI 추가 충전').slice(0, 90), successUrl: back + '?aitopup=ok#settings', failUrl: back + '?aitopup=fail#settings' }); }
    catch (e) { if (e && e.code === 'USER_CANCEL') toast('결제를 취소했습니다.', 'warn'); else if (e && e.code === 'pay_off') { if (U.d) U.d.payOnline = false; render(); toast(errMsg(e), 'warn'); } else toast((e && e.message === 'sdk') ? '결제 창을 열 수 없습니다. 잠시 후 다시 시도하십시오.' : errMsg(e, '결제를 시작하지 못했습니다.'), 'bad'); }
  };
  /* 산타 관리 동작 */
  ACT['aiu-sfind'] = () => { const i = document.getElementById('sQ'); U.sq = i ? i.value.trim().slice(0, 60) : ''; U.sel = ''; if (live()) santaLoad(); else { santaLoad(); render(); } };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'sQ') { e.preventDefault(); ACT['aiu-sfind'](); } });
  ACT['aiu-sorg'] = el => { U.sel = el.dataset.v; render(); };
  ACT['aiu-ssave'] = async () => {
    const g = id => (document.getElementById(id) || {}).value || ''; const b = { code: g('sCode').trim().toUpperCase(), tier: g('sTier').trim(), contract: g('sContract'), aiMonthTokens: Math.round(+g('sTokens')), since: g('sSince'), memo: g('sMemo').trim() };
    if (!/^(TRIAL|[A-Z][0-9])$/.test(b.code)) { toast('요금제 코드는 TRIAL 또는 영문 대문자 1자 + 숫자 1자(E1 · U0 · G4 등)입니다.', 'warn'); return; }
    if (!(Number.isInteger(b.aiMonthTokens) && b.aiMonthTokens >= 0)) { toast('월 포함 토큰은 0 이상 정수입니다.', 'warn'); return; }
    if (live()) { try { await api('PUT', `/api/santa/orgs/${encodeURIComponent(U.sel)}/plan`, b); toast('저장했습니다. 기관 화면에 바로 반영됩니다.', 'ok'); if (LIVE.tenant && LIVE.tenant.tid === U.sel) { U.d = null; U.at = 0; } await santaLoad(); } catch (e) { toast(errMsg(e, '저장하지 못했습니다.'), 'bad'); } return; }
    const o = demoOrgs().find(x => x.tid === U.sel); if (!o) return; const plan = { code: b.code, tier: b.tier.slice(0, 30), contract: CONTRACT[b.contract] ? b.contract : 'sub', aiMonthTokens: b.aiMonthTokens, since: b.since || kst() };
    o.log = [{ at: nowStr(), actor: (S.me && S.me.name) || '산타', before: o.plan || null, after: plan, memo: b.memo.slice(0, 500) }].concat(o.log || []).slice(0, 10); o.plan = plan;
    o.aiplan = plan.aiMonthTokens > 0 ? { monthTokens: plan.aiMonthTokens, overage: o.aiplan && o.aiplan.overage === 'block' ? 'block' : 'pack' } : null;
    if (o.here) { S.plan = plan; if (o.aiplan) S.aiplan = o.aiplan; else delete S.aiplan; }
    logAudit(`산타 관리 — ${o.name} 요금제 ${plan.code} · 월 포함 ${nf(plan.aiMonthTokens)} 토큰(데모)`); save(); santaLoad(); render(); toast('저장했습니다(데모).', 'ok');
  };
  /* 토스 결제 창에서 돌아옴: 서버 승인 확인 → 즉시 반영 */
  let back = false;
  function returned() { if (back || !live()) return; back = true; const q = new URLSearchParams(location.search); const st = q.get('aitopup'); if (!st) return;
    const clean = () => { try { history.replaceState(null, '', location.pathname + '#settings'); } catch (e) { } };
    UI.settings = 'aiuse'; if (typeof slSetOpen === 'function') slSetOpen('aiuse');
    if (st !== 'ok') { clean(); toast('결제가 끝나지 않았습니다. 다시 시도하십시오.', 'warn'); go('settings'); return; }
    api('POST', '/api/ai/topup/confirm', { paymentKey: q.get('paymentKey'), orderId: q.get('orderId'), amount: +q.get('amount') })
      .then(r => { U.d = { ...(U.d || {}), ...r }; U.at = Date.now(); clean(); go('settings'); toast('추가 충전이 반영되었습니다.', 'ok'); })
      .catch(e => { clean(); go('settings'); toast(errMsg(e, '결제 승인을 확인하지 못했습니다.'), 'bad'); }); }

  /* 홈 · 머리 알림 한 줄(80% 주의 · 100% 초과) */
  AFTER.push(cur => {
    if (!S || !S.me || role() === 'teacher') return; returned(); load();
    const d = data(); const main = document.getElementById('main'); if (!d || !main || !(d.state === 'warn' || d.state === 'over') || main.querySelector('.aiu-alert')) return;
    style(); const over = d.state === 'over'; const el = document.createElement('div'); el.className = 'aiu-alert' + (over ? ' over' : ''); el.setAttribute('role', over ? 'alert' : 'status');
    el.innerHTML = over ? `<span><b>이번 달 AI 사용량을 모두 썼습니다.</b> 학습자 AI 튜터 · AI SAM이 멈췄습니다.</span><button class="btn sm ink" data-act="aiu-open">${role() === 'owner' ? '추가 충전' : '사용량 보기'}</button>`
      : `<span><b>이번 달 AI 사용량 ${d.pct}%</b> — 포함량을 넘으면 AI 호출이 멈춥니다.</span><button class="btn sm" data-act="aiu-open">사용량 보기</button>`;
    main.insertBefore(el, main.firstChild);
  });

  /* 새로 가입한 기관만 체험(TRIAL) 기본 포함량으로 켠다(기존 기관은 aiplan 없음 → 동작 불변). 서버는 aiplan 없는 기관의 체험 기본값만 받는다 */
  { const base = createOrg; createOrg = (...a) => { const set = () => { try { if (S && S.org) { S.aiplan = { monthTokens: TRIAL, overage: 'pack' }; S.plan = { code: 'TRIAL', tier: 'pro', contract: 'sub', aiMonthTokens: TRIAL, since: kst() }; save(); } } catch (e) { console.error(e); } };
    const r = base(...a); if (r && typeof r.then === 'function') return r.then(ok => { if (ok) set(); return ok; }); set(); return r; }; } /* 운영 모드 createOrg는 Promise(성공 true) */ /* eslint-disable-line no-global-assign */
  window.AIUSE = { data, planOf, quote, simCredits, reload: () => { U.d = null; U.at = 0; load(true); } };
})();
