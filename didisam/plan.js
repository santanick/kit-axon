/* v47 요금제 기능 묶음(Standard · Pro · Enterprise) — 대표님 확정 2026-11-24(10/29 「기능 차등 없음」 원칙 변경)
   상태: S.plan = { code, tier, contract, aiMonthTokens, since } — 산타 관리(PUT /api/santa/orgs/:tid/plan)가 정한다(core/v47-ai와 같은 모양).
   - plan 없는 기존 기관 = Enterprise로 간주(지금 쓰는 기능이 잠기지 않음, 화면 표시는 「기존 계약 · 전체 기능」).
   - 새로 가입한 기관 = TRIAL(Pro 기능 14일). 기간이 지나면 Standard 기능만.
   - 기능 묶음 표는 PLAN_TABLE 하나(산타가 조정). 서버 판정 사본: service/server/planfeat.js · service-egov cmm/DdPlanFeature.java
   - 어드민: 메뉴 자물쇠 · 화면 잠금 카드 · AI 레벨 비활성 · 설정 › 요금제 카드 · 머리 요금제 표시.
   - 공개 데이터(학습자 게시본)에는 plan을 넣지 않는다.
   도우미: window.PLAN = { info(), tier(), can(k), menuMin(id), locked(id), maxLevel(), lvOk(l), need(k) } */
(function () {
  'use strict';
  if (typeof MENU === 'undefined' || typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;

  /* ── 기능 묶음 표(기본값 · 산타가 조정하는 상수 하나) ── */
  const PLAN_TABLE = {
    tiers: ['standard', 'pro', 'enterprise'],
    name: { standard: 'Standard', pro: 'Pro', enterprise: 'Enterprise' },
    maxLevel: { standard: 'L1', pro: 'L2', enterprise: 'L3' },
    trialDays: 14,
    contact: 'support@didisam.com', channel: 'https://newdidisam.channel.io/home', /* 산타 문의: 채널톡 상담(어카운트 매니저) + 메일 — 대표님 확정 2026-11-24 */
    codes: { E1: 'standard', A1: 'standard', U0: 'standard', G1: 'standard', E2: 'pro', A2: 'pro', U1: 'pro', U2: 'pro', G2: 'pro', E3: 'enterprise', E4: 'enterprise', A3: 'enterprise', A4: 'enterprise', U3: 'enterprise', U4: 'enterprise', G3: 'enterprise', G4: 'enterprise', TRIAL: 'pro' },
    /* min: 이 단계부터 포함 · menus: 잠그는 메뉴 · conns: 잠그는 외부 연결 */
    features: [
      { k: 'base', n: '기본 학습 운영', d: '과정 · 학습자 · 출결 · 평가 · 수료 · 메시지', min: 'standard' },
      { k: 'site', n: '홈페이지 1개', min: 'standard' },
      { k: 'ai1', n: 'AI 튜터 L1(코치)', min: 'standard' },
      { k: 'sam', n: 'AI SAM 기본', min: 'standard' },
      { k: 'cpl', n: '직업훈련 규정 준수', d: '인가 필수 기능이라 모든 단계 포함', min: 'standard' },
      { k: 'loop', n: 'Ver2 학습 루프 · 숙달 · 러닝 저니', min: 'pro', menus: ['journey', 'diag'] },
      { k: 'grade', n: 'AI 채점 초안', min: 'pro' },
      { k: 'ai2', n: 'AI 레벨 L2(파트너)', min: 'pro' },
      { k: 'reward', n: '마일리지 · 배지 · 디지털 배지', min: 'pro', menus: ['mileage', 'badge'] },
      { k: 'pay', n: '결제 연동(수납)', min: 'pro', menus: ['ledger', 'crmbill', 'billing', 'sales'] },
      { k: 'report', n: '성과 리포트', min: 'pro' },
      { k: 'ai3', n: 'AI 레벨 L3(에이전트)', min: 'enterprise' },
      { k: 'conn', n: 'SSO · API · MCP 외부 연결', min: 'enterprise', conns: ['mcp', 'claude'] },
      { k: 'multi', n: '멀티사이트(기관 관리)', min: 'enterprise', menus: ['org'] },
      { k: 'mgr', n: '전담 매니저', d: 'U2 · G2 이상 포함', min: 'enterprise' },
      { k: 'quota', n: 'AI 포함량 산타 지정', min: 'enterprise' }
    ],
    /* 2절 고객군별 단가 v1.0: [고객군, 인원 상한, 단가(원·인), 'month'|'year', 협의 하한] — 단가 null이면 협의 */
    price: {
      E1: ['기업', 500, 2000, 'month'], E2: ['기업', 1500, 1700, 'month'], E3: ['기업', 5000, 1400, 'month'], E4: ['기업', 0, null, 'month', 1200],
      A1: ['학원', 500, 1500, 'month'], A2: ['학원', 2000, 1200, 'month'], A3: ['학원', 10000, 800, 'month'], A4: ['학원', 0, null, 'month', 600],
      U0: ['대학 사업단', 1000, 15000, 'year'], U1: ['대학', 5000, 5000, 'year'], U2: ['대학', 12000, 4000, 'year'], U3: ['대학', 25000, 3200, 'year'], U4: ['대학', 0, null, 'year', 2500],
      G1: ['공공', 1000, 1500, 'month'], G2: ['공공', 5000, 800, 'month'], G3: ['공공', 20000, 400, 'month'], G4: ['공공', 0, null, 'month']
    },
    mgrCodes: ['E3', 'E4', 'U2', 'U3', 'U4', 'G2', 'G3', 'G4'],
    /* ── 요금 안내 화면 · 홈 요금제 카드의 금액 상수(한 곳) — 원천: didisam-pricing 스킬 v1.5 · service/server/aiprice.js(AI 충전).
       운영에서는 AI 단가를 서버 응답(GET /api/ai/usage price)으로 덮어쓴다. 스킬에 금액이 없는 항목은 null → 「계약 시 견적」 */
    target: { standard: '기본 학습 운영 · 직업훈련 인가 대응이 필요한 기관', pro: '학습 루프 · AI 채점 초안 · 결제 연동 · 성과 리포트까지 쓰는 기관', enterprise: 'SSO · API · 멀티사이트 · 전담 매니저가 필요한 대규모 기관' },
    ai: { perM: 20000, perMVat: 22000, step: 100000, min: 100000, max: 100000000, discounts: [[100000, 0], [500000, 5], [1000000, 10], [3000000, 15], [5000000, 20], [10000000, 25], [20000000, 30]], creditDays: 365, trialTokens: 2000000 },
    aiBase: '학습자 1인 월 30회 + 운영자 AI SAM 월 3,000회 기준으로 계약 시 산정',
    multi: [[2, 10], [3, 15]], /* 다년 약정 할인(구독료에만 · AI 사용료 제외) */
    buildUpkeep: 15, /* 구축형(설치형) 연 유지보수 % */
    addons: [
      ['온보딩', 1500000, '1회'], ['데이터 마이그레이션', 1000000, '1회 · 규모에 따라 추가'], ['POC', 3000000, '1회 · 본계약 시 차감'],
      ['쌤페이지 맞춤 구성 · 디자인 패키지', 1500000, '1회'], ['홈페이지 리디자인', 2500000, '1회'], ['SSO 연동', 6000000, '1회'], ['API 연동', 4000000, '건당'],
      ['기관 전용 서버', 1000000, '월'], ['도메인 · SSL', 300000, '연'], ['본인인증', 500000, '연'], ['성과 리포트 맞춤', 2000000, '1회'], ['Open Badge 발급', 1000, '개당'],
      ['VOD 저장', 50000, '100GB · 월'], ['VOD 전송', 300000, 'TB · 월'], ['디지털북 제작', 3000000, '권당'], ['전담 매니저(포함 요금제 외)', 1500000, '월'], ['콘텐츠 · 영상 · 강사 · PM · ATC', null, '']
    ]
  };
  window.PLAN_TABLE = PLAN_TABLE;
  const TB = () => window.PLAN_TABLE || PLAN_TABLE;
  const LV = ['L0', 'L1', 'L2', 'L3'];
  const CONTRACT = { trial: '무료 체험', annual: '연간 구독', yearly: '연간 구독', monthly: '월 구독', multi: '다년 계약', custom: '별도 계약', procure: '조달 계약', voucher: '바우처' };

  /* ── 판정 ── */
  const rank = t => Math.max(0, TB().tiers.indexOf(t));
  const nm = t => TB().name[t] || t;
  const ymd = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const day = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const now0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  function info() {
    const P = typeof S !== 'undefined' && S && S.plan && typeof S.plan === 'object' ? S.plan : null;
    if (!P) return { legacy: true, tier: 'enterprise', name: nm('enterprise'), code: '', contract: '', since: '', aiMonthTokens: 0 };
    const code = String(P.code || '').toUpperCase(); const T = TB(); const since = day(P.since);
    const tIn = String(P.tier || '').toLowerCase(); let tier = T.tiers.includes(tIn) ? tIn : T.codes[code] || 'enterprise'; /* 모르는 코드는 잠그지 않는다 */
    const o = { legacy: false, code, contract: String(P.contract || (code === 'TRIAL' ? 'trial' : '')), since: since ? ymd(since) : '', aiMonthTokens: Math.max(0, Math.round(+P.aiMonthTokens || 0)) };
    if (code === 'TRIAL') { const s = since || now0(); const end = new Date(s.getFullYear(), s.getMonth(), s.getDate() + T.trialDays); const left = Math.ceil((end - now0()) / 864e5);
      o.trial = true; o.end = ymd(end); o.daysLeft = Math.max(0, left); o.expired = left <= 0; tier = o.expired ? 'standard' : 'pro'; }
    else if (since) { const r = new Date(since.getFullYear() + 1, since.getMonth(), since.getDate()); while (r <= now0()) r.setFullYear(r.getFullYear() + 1); o.renew = ymd(r); }
    o.tier = tier; o.name = nm(tier); return o;
  }
  const tier = () => info().tier;
  const featOf = k => TB().features.find(f => f.k === k);
  const can = k => { const f = featOf(k); return !f || rank(tier()) >= rank(f.min); };
  const menuMin = id => { const f = TB().features.find(x => (x.menus || []).includes(id)); return f ? f.min : 'standard'; };
  const locked = id => rank(tier()) < rank(menuMin(id));
  const connMin = id => { const f = TB().features.find(x => (x.conns || []).includes(id)); return f ? f.min : 'standard'; };
  const connLocked = id => rank(tier()) < rank(connMin(id));
  const maxLevel = () => TB().maxLevel[tier()] || 'L3';
  const lvOk = l => LV.indexOf(l) <= LV.indexOf(maxLevel());
  const lvNeed = l => TB().tiers.find(t => LV.indexOf(TB().maxLevel[t]) >= LV.indexOf(l)) || 'enterprise';
  const need = k => (featOf(k) || {}).min || 'standard';
  function fee(code) { const p = TB().price[code]; if (!p) return null; const [seg, cap, unit, per, floor] = p;
    if (unit == null) return { seg, nego: true, floor: floor || 0, per };
    const supply = unit * cap * (per === 'month' ? 12 : 1); return { seg, cap, unit, per, supply, vat: Math.round(supply * 0.1), total: Math.round(supply * 1.1) }; }
  const nf = n => Math.round(+n || 0).toLocaleString('ko-KR');
  const man = n => n % 10000 === 0 ? `${nf(n / 10000)}만원` : `${nf(n)}원`;
  const role = () => (S && S.me && S.me.role) || '';
  const staff = () => ['owner', 'sub'].includes(role());
  const live = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));
  const LOCK = (n = 14) => `<svg class="pl-lk" viewBox="0 0 24 24" width="${n}" height="${n}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
  const chipTxt = () => { const I = info(); if (I.legacy) return '기존 계약 · 전체 기능'; if (I.trial) return I.expired ? '체험 종료 · Standard' : `${nm('pro')} 체험 D-${I.daysLeft}`; return `${I.name}${I.code ? ' · ' + I.code : ''}`; };
  window.PLAN = { info, tier, can, menuMin, locked, connLocked, maxLevel, lvOk, need, name: nm, fee, chip: chipTxt };

  const CSS = `.pl-lockc{max-width:560px;margin:24px auto;padding:28px 24px;text-align:center;display:grid;gap:10px;justify-items:center}.pl-lockc .pl-ic{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:var(--soft);color:var(--ink)}
.pl-lockc h3{margin:0;font-size:17px}.pl-lockc p{margin:0;color:var(--muted)}.pl-lockc .pl-acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:6px}
.pl-tabl{display:inline-flex;margin-left:4px;vertical-align:-2px;opacity:.75}[data-pl-lock] .pl-lk{flex:none}
.pl-chip{display:inline-flex;align-items:center;gap:4px;margin-left:8px;padding:2px 9px;border-radius:999px;border:1px solid var(--line);background:var(--card,#fff);color:var(--ink);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;min-height:28px}
.pl-chip.trial{border-color:var(--mag);color:var(--mag)}.pl-chip.exp{border-color:var(--warn)}
.pl{display:grid;gap:14px}.pl .card{padding:18px}.pl h3{margin:0 0 10px;font-size:15px}
.pl-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.pl-k div{background:var(--soft);border-radius:10px;padding:10px 12px;min-width:0}.pl-k small{display:block;color:var(--muted);font-size:12px}.pl-k b{font-size:15px;word-break:keep-all}.pl-k em{display:block;font-style:normal;color:var(--muted);font-size:12px}
.pl-tw{overflow-x:auto}.pl table{width:100%;border-collapse:collapse;font-size:14px;min-width:460px}.pl th,.pl td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:center}.pl th:first-child,.pl td:first-child{text-align:left}
.pl td small{display:block;color:var(--muted);font-size:12px}.pl .cur{background:var(--soft)}.pl .y{color:var(--ok);font-weight:700}.pl .n{color:var(--muted)}
.pl-lvtag{display:inline-flex;align-items:center;gap:2px;margin-left:4px;font-size:11px;font-weight:600;color:var(--muted)}
.pl-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.pl-ol{margin:0;padding-left:20px;display:grid;gap:6px;line-height:1.6}.pl-faq details{border-bottom:1px solid var(--line);padding:10px 0}.pl-faq summary{cursor:pointer;font-weight:600}.pl-faq p{margin:8px 0 0;color:var(--muted);line-height:1.6}.pl table.pl-sub td:first-child{min-width:150px}.pl td,.pl th{word-break:keep-all}
@media (max-width:640px){.pl-chip{margin-left:4px}.pl-lockc{margin:12px 0}}`;
  const style = () => { if (!document.getElementById('plCss')) { const s = document.createElement('style'); s.id = 'plCss'; s.textContent = CSS; document.head.appendChild(s); } };

  /* ── 화면 잠금 카드(운영자 합니다체) ── */
  function lockCard(min, what) {
    style(); const I = info(); const own = staff();
    return `<section class="card pl-lockc" data-pl-lockcard="${E(min)}"><span class="pl-ic">${LOCK(24)}</span><h3>${what ? `「${E(what)}」 — ` : ''}이 기능은 ${E(nm(min))} 요금제부터 이용할 수 있습니다</h3>
      <p>지금 요금제는 ${E(chipTxt())}입니다. 요금제는 산타가 계약에 맞춰 바꿉니다.</p>
      <div class="pl-acts">${own ? '<button type="button" class="btn pri" data-act="pl-open">요금제 안내</button>' : ''}<button type="button" class="btn" data-act="pl-ask" data-v="${E(what || '')}" data-min="${E(min)}">산타에 문의</button></div>
      ${own ? '' : '<p class="mini">요금제 안내는 정운영자 · 부운영자가 볼 수 있습니다.</p>'}</section>`;
  }
  const lockToast = (k, what) => { if (typeof toast === 'function') toast(`「${what || (featOf(k) || {}).n || '이 기능'}」 기능은 ${nm(need(k))} 요금제부터 이용할 수 있습니다. 설정 › 요금제에서 확인하십시오.`, 'warn'); };
  window.PLAN.lockCard = lockCard; window.PLAN.lockToast = lockToast;

  /* 화면 진입: 잠긴 메뉴는 본문 대신 잠금 카드 */
  { const base = safeView; safeView = (...a) => { try { if (typeof CUR !== 'undefined' && CUR.tab && MENU[CUR.tab] && locked(CUR.tab)) return lockCard(menuMin(CUR.tab), typeof mlabel === 'function' ? mlabel(CUR.tab) : CUR.tab); } catch (e) { console.error(e); } return base(...a); }; } /* eslint-disable-line no-global-assign */

  /* ── 설정 › 요금제(현재 요금제 · 단계 · 계약 · 연 구독료 · 월 AI 포함 토큰 · 다음 갱신일 · 단계별 기능 비교표) ── */
  function feeTxt(I) {
    if (I.legacy) return ['기존 계약 기준', '계약서에 따릅니다'];
    if (I.trial) return ['무료 체험', `${TB().trialDays}일 · ${E(I.end || '')} 종료`];
    const f = fee(I.code); if (!f) return ['계약서 기준', ''];
    if (f.nego) return ['협의', f.floor ? `하한 ${nf(f.floor)}원·인·${f.per === 'month' ? '월' : '년'}` : '별도 협의'];
    return [`${man(f.supply)} <small class="mini">(VAT 별도)</small>`, `VAT 포함 ${man(f.total)} · ${nf(f.unit)}원·인·${f.per === 'month' ? '월' : '년'} × ${nf(f.cap)}명${f.per === 'month' ? ' × 12개월' : ''}`];
  }
  function view() {
    style(); const I = info(); const T = TB(); const own = role() === 'owner';
    const tierTxt = I.legacy ? '전체 기능(Enterprise 기준)' : I.trial ? (I.expired ? `${nm('standard')} — 체험 종료` : `${nm('pro')} 기능 체험 · ${I.daysLeft}일 남음`) : I.name;
    const codeTxt = I.legacy ? '기존 계약' : I.trial ? '체험(TRIAL)' : `${I.code}${fee(I.code) ? ' · ' + fee(I.code).seg : ''}`;
    const [fv1, fv2] = feeTxt(I);
    const ai = I.legacy ? '기존 설정' : I.aiMonthTokens ? `${nf(I.aiMonthTokens)} 토큰` : I.tier === 'enterprise' ? '산타 지정' : '미설정';
    const renew = I.legacy ? '계약서 기준' : I.trial ? `${I.end} (체험 종료)` : I.renew || '계약서 기준';
    const mgr = I.legacy || I.tier === 'enterprise' || T.mgrCodes.includes(I.code) ? '포함' : '미포함';
    const kv = [['현재 요금제', codeTxt], ['단계', tierTxt], ['계약 유형', I.legacy ? '기존 계약' : CONTRACT[I.contract] || I.contract || '—'], ['연 구독료', fv1, fv2], ['월 AI 포함 토큰', ai], ['다음 갱신일', renew], ['전담 매니저', mgr]]
      .map(([a, b, c]) => `<div><small>${a}</small><b>${b.includes('<small') ? b : E(b)}</b>${c ? `<em>${c}</em>` : ''}</div>`).join('');
    const cur = I.tier; const rows = T.features.map(f => `<tr><td>${E(f.n)}${f.d ? `<small>${E(f.d)}</small>` : ''}</td>${T.tiers.map(t => `<td class="${t === cur ? 'cur' : ''}">${rank(t) >= rank(f.min) ? '<span class="y" aria-label="포함">포함</span>' : '<span class="n" aria-label="미포함">—</span>'}</td>`).join('')}</tr>`).join('');
    const lvRow = `<tr><td>AI 레벨 상한</td>${T.tiers.map(t => `<td class="${t === cur ? 'cur' : ''}">${E(T.maxLevel[t])}</td>`).join('')}</tr>`;
    const demo = !live() && own ? `<section class="card"><h3>시연판 · 요금제 바꿔 보기</h3><div class="pl-acts"><label class="mini" for="plDemo">요금제 코드</label><select id="plDemo">${['', 'TRIAL', ...Object.keys(T.price)].map(c => `<option value="${c}" ${(c || '') === (I.legacy ? '' : I.code) ? 'selected' : ''}>${c ? `${c} · ${nm(T.codes[c])}` : '기존 계약(plan 없음)'}</option>`).join('')}</select></div><p class="mini">시연판에서만 보입니다. 운영 기관의 요금제는 산타 관리 화면에서 바꿉니다.</p></section>` : '';
    return `<div class="pl">
      <section class="card"><h3>요금제</h3><div class="pl-k">${kv}</div>
        <p class="mini">${I.legacy ? '요금제 도입 전에 계약한 기관이라 지금 쓰는 기능을 모두 그대로 씁니다.' : I.trial ? `체험 기간에는 ${nm('pro')} 기능을 모두 씁니다. 체험이 끝나면 ${nm('standard')} 기능만 남습니다.` : '요금제 변경 · 인원 구간 조정은 산타가 계약에 맞춰 반영합니다.'} 단가는 VAT 별도이며, 인원은 계약 기간 중 활성 학습자 최대치로 산정합니다.</p>
        <div class="pl-acts"><button type="button" class="btn" data-act="pl-ask" data-v="요금제 변경" data-min="${E(cur === 'enterprise' ? 'enterprise' : T.tiers[rank(cur) + 1])}">산타에 문의</button></div></section>
      <section class="card"><h3>단계별 기능 비교</h3><div class="pl-tw"><table><thead><tr><th>기능</th>${T.tiers.map(t => `<th class="${t === cur ? 'cur' : ''}">${E(nm(t))}${t === cur ? ' <small class="mini">(지금)</small>' : ''}</th>`).join('')}</tr></thead><tbody>${rows}${lvRow}</tbody></table></div>
        <p class="mini">요금제에 없는 메뉴는 자물쇠로 표시하고, 열면 업그레이드 안내가 나옵니다. 직업훈련 기관의 규정 준수 기능은 인가 필수라 모든 단계에 포함합니다.</p></section>${guide()}${demo}
    </div>`;
  }
  /* ── 요금 안내(정운영자 · 부운영자 열람 · 공개 정가 기준) — 대표님 지시 2026-11-25 「요금제 부분에는 요금 안내에 대한 부분도 자세히」 ── */
  const won = n => `${nf(n)}원`;
  const aiPrice = () => { let d = null; try { d = window.AIUSE && AIUSE.data && AIUSE.data(); } catch (e) { } const P = d && d.price && d.price.perM ? d.price : null; const B = TB().ai; return P ? { ...B, ...P } : B; };
  const aiTokens = (w, P) => { let d = 0; for (const [x, p] of P.discounts) if (w >= x) d = p; return { d, unit: P.perM * (100 - d) / 100, tokens: Math.floor(w * 1e6 / (P.perM * (100 - d) / 100)) }; };
  const seats = (cap, per) => cap ? `${nf(cap)}명 이하` : '초과 구간';
  function guide() {
    const T = TB(); const P = aiPrice(); const cur = info().tier;
    const byTier = t => Object.keys(T.price).filter(c => T.codes[c] === t);
    const subRows = T.tiers.map(t => byTier(t).map((c, i, a) => { const f = fee(c); const per = f.per === 'month' ? '월' : '년';
      const amt = f.nego ? `<td colspan="2">계약 시 견적${f.floor ? `<small>하한 ${nf(f.floor)}원·인·${per}</small>` : ''}</td>` : `<td>${man(f.supply)}<small>${nf(f.unit)}원·인·${per}</small></td><td>${man(f.total)}</td>`;
      return `<tr class="${t === cur ? 'cur' : ''}">${i === 0 ? `<td rowspan="${a.length}"><b>${E(nm(t))}</b><small>${E(T.target[t])}</small></td>` : ''}<td>${E(c)} · ${E(f.seg)}</td><td>${seats(f.cap)}</td>${amt}</tr>`; }).join('')).join('');
    const disc = P.discounts.map(([w, d], i) => { const q = aiTokens(w, P); const nx = P.discounts[i + 1]; return `<tr><td>${man(w)} 이상${nx ? `<small>${man(nx[0])} 미만</small>` : ''}</td><td>${d ? d + '%' : '—'}</td><td>${won(q.unit)}<small>VAT 포함 ${won(Math.round(q.unit * 1.1))}</small></td><td>${nf(q.tokens)}</td></tr>`; }).join('');
    const aiInc = { standard: T.aiBase, pro: T.aiBase, enterprise: '계약에 따라 산타가 넣습니다' };
    const multi = T.multi.map(([y, p]) => `${y}년 ${p}%`).join(' · ');
    const add = T.addons.map(([n, w, u]) => `<tr><td>${E(n)}</td><td>${w == null ? '계약 시 견적' : won(w)}${w == null ? '' : `<small>VAT 포함 ${won(Math.round(w * 1.1))}</small>`}</td><td>${E(u)}</td></tr>`).join('');
    const faq = [
      ['AI 포함량을 다 쓰면 어떻게 됩니까?', `충전분이 있으면 만료일이 빠른 충전분부터 자동으로 차감하고 AI 기능은 그대로 씁니다. 충전분도 모두 쓰면 그달 남은 기간 동안 AI 기능이 멈춥니다. 사용량이 80% · 100%에 이르면 홈과 설정 › AI 사용량에서 알려 드립니다.`],
      ['남은 충전분은 다음 달로 이어집니까?', `네. 충전분은 충전일부터 ${nf(P.creditDays || T.ai.creditDays)}일 동안 쓰고, 달이 바뀌어도 남습니다. 요금제의 월 포함량은 다음 달로 이어지지 않습니다.`],
      ['충전 금액은 어떻게 정합니까?', `${man(P.step)} 단위로 ${man(P.min)}부터 충전합니다. 많이 충전할수록 단가가 내려가며, 할인은 최대 ${Math.max(...P.discounts.map(x => x[1]))}%입니다. 충전은 정운영자가 설정 › AI 사용량에서 결제합니다.`],
      ['다년 약정 할인은 AI 사용료에도 적용됩니까?', `아닙니다. 다년 약정 할인(${multi})은 구독료에만 적용합니다. AI 사용료(충전)는 원가와 연동되어 약정 할인이 없습니다.`],
      ['학습자 수는 어떻게 셉니까?', '계약 기간 중 활성 학습자(한 번 이상 로그인)의 최대치로 셉니다. 구간을 넘으면 100명 단위로 더하거나 상위 구간으로 바꿉니다.'],
      ['요금제를 바꾸려면 어떻게 합니까?', '요금제 변경 · 인원 구간 조정은 산타 어카운트 매니저가 계약에 맞춰 반영합니다. 아래 채널톡 상담이나 메일로 문의해 주십시오.'],
      ['Enterprise의 월 AI 포함량은 누가 정합니까?', '계약 내용에 따라 산타가 넣습니다. 기관 운영자는 바꿀 수 없고, 변경 이력은 감사 기록으로 남습니다.']
    ].map(([q, a]) => `<details><summary>${E(q)}</summary><p>${E(a)}</p></details>`).join('');
    return `<section class="card" id="plGuide" data-pl-guide><h3>요금 안내 · 요금제별 연 구독료</h3><p class="mini">공개 정가 기준이며 VAT 별도 금액입니다(VAT 포함 금액을 함께 적습니다). 실제 계약 금액은 견적서를 따릅니다.</p>
        <div class="pl-tw"><table class="pl-sub"><thead><tr><th>요금제 · 대상</th><th>코드 · 고객군</th><th>학습자 구간</th><th>연 구독료(VAT 별도)</th><th>VAT 포함</th></tr></thead><tbody>${subRows}</tbody></table></div>
        <p class="mini">대학은 재학생 전체 기준 인·년 단가, 대학 사업단(RISE · ATC)은 참여 인원 기준입니다. 전담 매니저는 E3 · U2 · G2 이상에 포함합니다.</p></section>
      <section class="card" data-pl-ai><h3>월 AI 포함 토큰</h3><div class="pl-k">${T.tiers.map(t => `<div><small>${E(nm(t))}</small><b>${E(aiInc[t])}</b></div>`).join('')}<div><small>무료 체험(${T.trialDays}일)</small><b>${nf(T.ai.trialTokens)} 토큰</b></div></div>
        <p class="mini">요금제의 월 포함량을 먼저 쓰고, 넘으면 충전분에서 차감합니다.</p></section>
      <section class="card" data-pl-topup><h3>AI 충전 단가 · 할인 구간</h3><div class="pl-k"><div><small>기본 단가</small><b>100만 토큰당 ${won(P.perM)}</b><em>VAT 포함 ${won(P.perMVat || Math.round(P.perM * 1.1))}</em></div><div><small>충전 단위</small><b>${man(P.step)} 단위</b><em>${man(P.min)} ~ ${man(P.max)} · VAT 별도</em></div><div><small>사용 기간</small><b>충전일부터 ${nf(P.creditDays || T.ai.creditDays)}일</b><em>남은 양은 다음 달로 이어집니다</em></div></div>
        <div class="pl-tw"><table><thead><tr><th>충전 금액(VAT 별도)</th><th>할인</th><th>100만 토큰당 단가</th><th>받는 토큰(구간 시작 금액 기준)</th></tr></thead><tbody>${disc}</tbody></table></div></section>
      <section class="card" data-pl-order><h3>이월과 차감 순서</h3><ol class="pl-ol"><li>매달 요금제의 <b>월 포함량</b>을 먼저 씁니다. 월 포함량은 다음 달로 이어지지 않습니다.</li><li>포함량을 넘으면 <b>만료일이 빠른 충전분</b>부터 차감합니다.</li><li>충전분은 충전일부터 ${nf(P.creditDays || T.ai.creditDays)}일 동안 쓰며, 달이 바뀌어도 남습니다(연간 사용).</li><li>포함량과 충전분을 모두 쓰면 AI 기능이 멈춥니다. 80% · 100%에 이르면 미리 알려 드립니다.</li></ol></section>
      <section class="card" data-pl-contract><h3>계약 · 결제 방식</h3><ul class="pl-ol"><li><b>연 단위 계약</b>이며, 구독료는 세금계산서로 청구합니다. 금액은 VAT 별도로 적고 VAT 포함 금액을 함께 적습니다.</li><li><b>다년 약정 할인</b>: ${multi}(구독료에만 적용). <b>AI 사용료(충전)는 약정 할인이 없습니다.</b></li><li>계약 유형: 구독형 · 다년 약정형 · 구축형. 구축형(설치형)은 계약 시 견적이며 연 유지보수 ${T.buildUpkeep}%가 붙습니다.</li><li>AI 충전은 정운영자가 설정 › AI 사용량에서 온라인으로 결제합니다.</li></ul></section>
      <section class="card" data-pl-addon><h3>부가서비스 주요 단가</h3><div class="pl-tw"><table><thead><tr><th>항목</th><th>단가(VAT 별도)</th><th>기준</th></tr></thead><tbody>${add}</tbody></table></div><p class="mini">일부 단가는 최초 계약 2~3건 적용 후 조정될 수 있습니다. 표에 없는 항목은 계약 시 견적으로 안내합니다.</p></section>
      <section class="card pl-faq" data-pl-faq><h3>자주 묻는 질문</h3>${faq}</section>
      <section class="card" data-pl-contact><h3>문의</h3><p>요금제 · 충전 · 견적은 산타 어카운트 매니저가 안내합니다.</p><div class="pl-acts"><a class="btn pri" href="${E(T.channel)}" target="_blank" rel="noopener">채널톡 상담</a><a class="btn" href="mailto:${E(T.contact)}?subject=${encodeURIComponent('디디쌤 요금 문의')}">${E(T.contact)}</a></div></section>`;
  }
  window.PLAN.guide = guide; window.PLAN.aiPrice = aiPrice;
  /* 기존 「플랜 · 결제」(dds26 탭: 요금제 안내 · 결제 내역) — 요금제 안내 탭을 이 화면으로 */
  if (typeof VIEWS.plan === 'function') { const base = VIEWS.plan; VIEWS.plan = (...a) => { if ((UI.plT || 'info') !== 'info') return base(...a);
    return (typeof head === 'function' ? head('요금제', '현재 요금제 · 단계별 기능 · 요금 안내를 봅니다. 요금제는 산타가 계약에 맞춰 바꿉니다.') : '') + (typeof tabs === 'function' ? tabs('plT', [['info', '요금제 안내'], ['bill', '결제 내역']], 'info') : '') + view(); }; }
  ACT['pl-open'] = el => { if (!staff()) { if (typeof toast === 'function') toast('요금제 안내는 정운영자 · 부운영자가 볼 수 있습니다.', 'warn'); return; } UI.plGuide = !!(el && el.dataset && el.dataset.v === 'guide'); UI.plT = 'info'; if (typeof slSetOpen === 'function') slSetOpen('plan'); UI.settings = 'plan'; go('settings'); };
  ACT['pl-ask'] = el => { const I = info(); const what = (el && el.dataset && el.dataset.v) || ''; const min = (el && el.dataset && el.dataset.min) || 'pro'; const c = TB().contact;
    const txt = `[디디쌤 요금제 문의] 기관: ${(S.org && S.org.name) || ''} · 지금 요금제: ${chipTxt()} · 필요한 기능: ${what || '요금제 변경'}(${nm(min)} 요금제부터)`;
    if (typeof modal !== 'function') return;
    const ch = TB().channel; const cp = () => { try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch (e) { } if (typeof logAudit === 'function') { logAudit(`요금제 문의 — ${what || '요금제 변경'}`); if (typeof save === 'function') save(); } };
    modal('산타에 문의', `<p>요금제 변경은 산타 어카운트 매니저가 계약에 맞춰 반영합니다. <b>채널톡 상담</b>으로 바로 연결하거나 ${c ? `<b>${E(c)}</b>로 메일을` : '메일을'} 보내 주십시오. 아래 내용은 자동으로 복사됩니다.</p><textarea name="pl" rows="3" readonly style="width:100%">${E(txt)}</textarea>`,
      [{ id: 'c', label: '닫기' }, ...(ch ? [{ id: 'ch', label: '채널톡 상담', kind: 'pri', run: () => { cp(); try { window.open(ch, '_blank', 'noopener'); } catch (e) { } if (typeof toast === 'function') toast('문의 내용을 복사했습니다. 채널톡 창에 붙여 넣어 주십시오.', 'ok'); } }] : []), { id: 'cp', label: c ? '메일 보내기' : '내용 복사', kind: ch ? '' : 'pri', run: () => { try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch (e) { } if (typeof logAudit === 'function') { logAudit(`요금제 문의 — ${what || '요금제 변경'}`); if (typeof save === 'function') save(); } if (typeof toast === 'function') toast('문의 내용을 복사했습니다.', 'ok'); if (c) try { location.href = `mailto:${c}?subject=${encodeURIComponent('디디쌤 요금제 문의')}&body=${encodeURIComponent(txt)}`; } catch (e) { } } }]); };
  document.addEventListener('change', e => { if (!e.target || e.target.id !== 'plDemo' || live() || role() !== 'owner') return; const c = e.target.value;
    if (!c) delete S.plan; else S.plan = { code: c, tier: TB().codes[c], contract: c === 'TRIAL' ? 'trial' : 'annual', aiMonthTokens: (S.plan && S.plan.aiMonthTokens) || (S.aiplan && +S.aiplan.monthTokens) || 0, since: today() };
    if (typeof logAudit === 'function') logAudit(`요금제(시연) — ${c || '기존 계약'}`); save(); render(); });

  /* ── AI 레벨: 요금제 밖 레벨 비활성(정책 센터 · 과제 편집기) · Ver2 학습 루프(Pro) ── */
  const guardAct = (name, fn) => { const b = ACT[name]; if (typeof b !== 'function' || b.__pl) return; const w = (...a) => fn(a[0]) === false ? undefined : b(...a); w.__pl = 1; ACT[name] = w; };
  const lvGuard = el => { const l = el && el.dataset && el.dataset.v; if (LV.includes(l) && !lvOk(l)) { if (typeof toast === 'function') toast(`AI 레벨 ${l}(${l === 'L3' ? '에이전트' : '파트너'})은 ${nm(lvNeed(l))} 요금제부터 이용할 수 있습니다. 설정 › 요금제에서 확인하십시오.`, 'warn'); return false; } };
  const wrapAll = () => {
    guardAct('ap-lv', lvGuard); guardAct('ap-set', lvGuard);
    guardAct('ap-on', () => { if (!(S.aipol && S.aipol.on) && !can('loop')) { lockToast('loop'); return false; } });
    const cnG = el => { const id = el && el.dataset && el.dataset.v; if (id && connLocked(id)) { lockToast('conn'); return false; } };
    guardAct('sl-cn', cnG); guardAct('cn-open', cnG); guardAct('cn-mcp', () => { if (connLocked('mcp')) { lockToast('conn'); return false; } });
  };
  wrapAll();
  const lockLv = root => { root.querySelectorAll('[data-act="ap-lv"],[data-act="ap-set"]').forEach(b => { const l = b.dataset.v; if (!LV.includes(l) || lvOk(l)) return;
    b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.setAttribute('data-pl-lock', lvNeed(l)); b.title = `${nm(lvNeed(l))} 요금제부터 이용할 수 있습니다`;
    if (!b.querySelector('.pl-lvtag')) { const host = b.querySelector('h3') || b.querySelector('b') || b; host.insertAdjacentHTML('beforeend', `<span class="pl-lvtag">${LOCK(11)}${E(nm(lvNeed(l)))}</span>`); } });
    const sw = root.querySelector('[data-act="ap-on"]'); if (sw && !can('loop') && !(S.aipol && S.aipol.on)) { sw.disabled = true; sw.setAttribute('data-pl-lock', 'pro'); sw.title = `${nm('pro')} 요금제부터 이용할 수 있습니다`;
      const t = sw.closest('.ap-row'); if (t && !t.querySelector('.pl-lvtag')) { const b = t.querySelector('.ap-t b'); if (b) b.insertAdjacentHTML('beforeend', `<span class="pl-lvtag">${LOCK(11)}${E(nm('pro'))} 요금제부터</span>`); } } };
  /* 편집기는 모달 안이라 AFTER가 아닐 때도 다시 그린다 → 짧게 관찰 */
  try { new MutationObserver(() => { const b = document.getElementById('apEd') || document.querySelector('.ap-wrap'); if (b) lockLv(b.closest('#modal') || document); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }

  /* ── 메뉴 자물쇠 · 외부 연결 자물쇠 · 머리 요금제 표시 ── */
  AFTER.push(() => {
    if (!S || !S.org || !S.me) return; style(); wrapAll();
    document.querySelectorAll('[data-act="go"][data-v]').forEach(b => { const id = b.dataset.v; if (!MENU[id]) return; const L = locked(id); const has = b.querySelector('.pl-tabl');
      if (L && !has) { const m = menuMin(id); b.setAttribute('data-pl-lock', m); b.insertAdjacentHTML('beforeend', `<span class="pl-tabl" title="${E(nm(m))} 요금제부터">${LOCK(12)}</span>`); const al = b.getAttribute('aria-label'); b.setAttribute('aria-label', `${al || b.textContent.trim()} — ${nm(m)} 요금제부터`); }
      else if (!L && has) { has.remove(); b.removeAttribute('data-pl-lock'); } });
    document.querySelectorAll('[data-act="sl-cn"][data-v],[data-act="cn-open"][data-v]').forEach(b => { if (!connLocked(b.dataset.v) || b.querySelector('.pl-tabl')) return; b.setAttribute('data-pl-lock', connMin(b.dataset.v)); const em = b.querySelector('em'); if (em) em.textContent = `${nm(connMin(b.dataset.v))} 요금제부터`; b.insertAdjacentHTML('beforeend', `<span class="pl-tabl">${LOCK(12)}</span>`); });
    lockLv(document);
    if (UI.plGuide) { const g = document.getElementById('plGuide'); if (g) { UI.plGuide = false; try { g.scrollIntoView({ block: 'start' }); } catch (e) { } } }
    if (role() !== 'teacher' && !document.querySelector('.pl-chip')) { const host = document.querySelector('.top .brand') || document.querySelector('.orgcard div'); const I = info();
      if (host) host.insertAdjacentHTML('beforeend', `<button type="button" class="pl-chip ${I.trial ? (I.expired ? 'exp' : 'trial') : ''}" data-act="pl-open" aria-label="요금제: ${E(chipTxt())}">${E(chipTxt())}</button>`); }
  });

  /* ── 새로 가입한 기관 = TRIAL(Pro 14일). 기존 기관(plan 없음)은 그대로 ── */
  { const base = createOrg; createOrg = (...a) => { const set = () => { try { if (S && S.org && !S.plan) { S.plan = { code: 'TRIAL', tier: 'pro', contract: 'trial', aiMonthTokens: (S.aiplan && +S.aiplan.monthTokens) || 0, since: today() }; save(); } } catch (e) { console.error(e); } };
    const r = base(...a); if (r && typeof r.then === 'function') return r.then(ok => { if (ok) set(); return ok; }); set(); return r; }; } /* eslint-disable-line no-global-assign */
})();
