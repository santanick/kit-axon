/* v48 디디쌤 콘텐츠 마켓 — 구매 기관 화면(spec v1.1 A1 마켓 홈 · A2 상품 상세 · A3 크레딧 패스 구성 · A4 이용 한도 · 사용 현황 · 기관 통제 · 승인 · 복원, 장바구니 · 견적).
   메뉴 id 'market'(공간 learn). 하위 탭 UI.market: home · item(UI.mkItem) · build · credit · ctrl · approve · cart.
   시범 게이트: 운영은 S.org.mk.pilot === true(산타 관리자가 켬)일 때만, 시연판은 항상 보입니다(MENU.market.gate → core.js wsTabs · go가 거름).
   시연판: 브라우저 문서 S.market(v:2). 운영(LIVE): /api/market/* 가 주인(spec 8장), 화면 문서에는 on만 둡니다.
   계산은 marketcalc.js(window.marketCalc, 개발자 1) — 없거나 함수가 빠지면 아래 FALLBACK(spec 10장과 같은 규칙)을 씁니다.
   교수자(C5): 크레딧 · 금액 · 계약 블록을 그리지 않습니다. 돈 · 계약 동작(구매 확정 · 기관 통제 · 추가 구매)은 정운영자만, 확인 카드 후 실행.
   실제 돈은 움직이지 않습니다: 구매 확정은 「세금계산서 발행 대기」까지입니다. */
(function () {
  'use strict';
  if (typeof MENU === 'undefined' || typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;

  try { if (typeof IC === 'object' && IC) { const add = { wallet: '<path d="M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H4zM4 7V6a2 2 0 012-2h10M16 13h2"/>', alert: '<path d="M12 4l9 16H3zM12 10v4M12 17v.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', play: '<path d="M8 5l11 7-11 7z"/>' }; Object.keys(add).forEach(k => { if (!IC[k]) IC[k] = add[k]; }); } } catch (e) { }
  /* ── 계산(marketcalc.js 우선, 없으면 같은 규칙의 임시 구현) ── */
  const W = 1000, CP_BP = 6500, MAX_BP = 700, GUARD_BP = 3000;
  const FALLBACK = {
    courseCredits: p => Math.ceil((+p || 0) / W),
    bonusBp: (amount, bundle) => Math.min(MAX_BP, (bundle || amount >= 50000000) ? 700 : amount >= 30000000 ? 300 : 0),
    santaBp: (amount, credits) => amount > 0 ? Math.floor((amount - credits * (W * CP_BP / 10000)) * 10000 / amount) : 0,
    plan: (x) => { const avg = Math.max(1, +x.avgCredits || 45); const cpp = Math.max(0.1, +x.coursesPerPerson || 1.5);
      let budget = Math.max(0, Math.floor(+x.budget || 0));
      if (!budget && +x.people > 0) budget = Math.ceil(Math.ceil(+x.people * cpp) * avg / 10) * 10 * W; /* 인원 → 필요한 크레딧(보너스 없이 보수적으로) */
      const credits = Math.floor(budget / W); const bonusBp = x.bonusBp != null && x.bonusBp !== '' ? Math.max(0, Math.round(+x.bonusBp)) : MC('bonusBp')(budget, !!x.bundle);
      const bonusCredits = Math.floor(credits * bonusBp / 10000); const total = credits + bonusCredits; const enrollments = Math.floor(total / avg);
      const people = Math.floor(enrollments * 10 / Math.round(cpp * 10)); const santaBp = MC('santaBp')(budget, total);
      return { budget, credits, bonusBp, bonusCredits, total, avgCredits: avg, enrollments, people, santaBp, cpMax: total * W * CP_BP / 10000, ok: bonusBp <= MAX_BP && santaBp >= GUARD_BP, err: bonusBp > MAX_BP ? 'mk_bonus_max' : santaBp < GUARD_BP ? 'mk_margin' : '' }; },
    restorable: (hours, prog) => hours <= 168 && prog < 10,
    alertLevel: (total, bal) => !total ? 0 : bal * 10000 <= total * 1000 ? 10 : bal * 10000 <= total * 2000 ? 20 : 0,
    capOk: (cap, used, credits) => !cap || used + credits <= cap,
    preNeeded: (preFrom, credits) => !!preFrom && credits >= preFrom,
    validity: start => { const d = new Date(start + 'T12:00:00'); const a = new Date(d); a.setFullYear(a.getFullYear() + 1); a.setDate(a.getDate() - 1); const b = new Date(d); b.setFullYear(b.getFullYear() + 2); b.setDate(b.getDate() - 1); return { validTo: ymdL(a), carryTo: ymdL(b) }; }
  };
  const MC = k => (window.marketCalc && typeof window.marketCalc[k] === 'function') ? window.marketCalc[k] : FALLBACK[k];
  window.mkFallbackCalc = FALLBACK; /* 시험 · 다른 화면(mksam)에서 같은 계산을 씁니다 */

  const LIVEON = () => typeof LIVE !== 'undefined' && LIVE && LIVE.tenant && typeof api === 'function';
  const santa = () => LIVEON() ? !!(LIVE.user && LIVE.user.santa) : !!(S && S.me && S.me.role === 'owner');
  /* 시범 기관 플래그: 운영은 산타 관리자가 켠 기관(org.mk.pilot)만, 시연판은 항상 */
  const pilot = () => { try { return !LIVEON() || !!(S && S.org && S.org.mk && S.org.mk.pilot === true); } catch (e) { return false; } };
  window.mkPilot = pilot; window.mkIsSanta = santa;
  const teacher = () => S.me && S.me.role === 'teacher';
  /* 산타 운영 대리 작성(보너스율 입력): 운영은 LIVE.user.santa, 시연판은 UI.mkSantaDemo(시험 · 산타 시연용)일 때만 — 구매 기관 화면에 산타 문구를 보이지 않게 */
  const proxyOk = () => LIVEON() ? santa() : !!UI.mkSantaDemo;
  const owner = () => S.me && S.me.role === 'owner';
  const nf = n => (Number(n) || 0).toLocaleString('ko-KR');
  const pct = bp => (Math.floor(+bp || 0) / 100).toFixed(2) + '%';
  const idem = () => 'mk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const id8 = p => p + Math.random().toString(36).slice(2, 10);
  const dPlus = (d, n) => { const t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() + n); return ymdL(t); };
  const dDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);
  const hoursSince = at => Math.max(0, (Date.now() - Date.parse(String(at).replace(' ', 'T'))) / 36e5);
  const IMG = s => `img/stock/${s}-800.webp`;
  const icx = (n, s) => typeof ic === 'function' ? ic(n, s || 16) : '';
  const tail = s => String(s || '').slice(-4);

  /* ── 시연 데이터(한빛대학교 · CP 러닝웍스 · CP 에듀온 · CP 한빛미디어, changes-v1.1 0장) ── */
  const COLS = [
    { id: 'univ', kind: 'univ', title: '대학 비교과', avgCredits: 45, count: 128, hours: 15, img: 'cls-01', note: '취업 · 진로 · AI 활용 · 글쓰기 · 외국어' },
    { id: 'basic', kind: 'basic', title: '베이직', avgCredits: 30, count: 300, hours: 8, img: 'lap-03', note: '산타 자체 · 공통 필수' },
    { id: 'ind', kind: 'ind', title: '산업', avgCredits: 55, count: 210, hours: 18, img: 'sci-01', note: '반도체 · 제조 · 보건' },
    { id: 'job', kind: 'job', title: '직무', avgCredits: 45, count: 164, hours: 14, img: 'grp-02', note: '기획 · 데이터 · 영업' }
  ];
  /* 「광고」 표시 확정 문구(M/l/code-changes.md C1 · policy v1.2) — 화면 · AI SAM 같은 문장 */
  const MK_AD = window.MK_AD = Object.freeze({ A1: '광고', A2: '이 상품은 CP가 비용을 내고 이 자리에 노출한 광고입니다. 가격 · 크레딧은 다른 상품과 같은 기준으로 정해집니다.', A3: '「광고」 표시가 있는 상품은 콘텐츠 공급사(CP)가 산타에 노출 비용을 내고 추천 칸에 올린 상품입니다. 광고는 추천 칸에만 표시되며, 검색 결과와 정렬 순서에는 영향을 주지 않습니다. 추천 칸의 나머지 상품은 우리 기관의 이용 실적 · 신규 여부 · 컬렉션 구성으로 정합니다.' });
  /* 콘텐츠 패스(연간 이용권) 이용 조건 — M/l/code-changes.md r3 C2 · C4 확정 문구(policy v1.3 제19 · 19조의2 · 40조). 「잔액 · 충전 · 적립 · 현금처럼」 표현 금지 */
  const MK_TERMS = window.MK_TERMS = Object.freeze({ ver: 'mk-pass-v2',
    title: { general: '콘텐츠 패스(연간 이용권) 이용 조건', public_license: '콘텐츠 패스(연간 이용권) 이용 조건 — 공공 기관', public_postpaid: '콘텐츠 이용 조건 — 공공 기관(후불 정산)' },
    general: ['콘텐츠 패스는 이용 기간 동안 산타(주)가 공급하는 콘텐츠를 이용 한도(크레딧) 안에서 이용할 수 있는 연간 이용권입니다. 이용권 가격은 이용 한도 1크레딧당 1,000원(부가세 별도)을 기준으로 정합니다. 크레딧은 현금 · 상품권이 아니며, 다른 기관에 넘기거나 다른 상품(기관 간 중개 상품 · 학습자 개별 구매 · AI 사용료) 결제에 쓸 수 없습니다.',
      '이용 기간은 계약 시작일부터 1년입니다. 이용 기간이 끝나면 쓰지 않은 이용 한도(보너스 포함)는 소멸하며 환불되지 않습니다. 만료 90일 · 30일 · 7일 전에 남은 한도를 알려 드립니다.',
      '이용 기간이 끝나기 전(또는 끝난 뒤 30일 안)에 갱신 계약을 맺으면, 쓰지 않은 유료 한도를 직전 계약 유료 한도의 20%까지 새 계약으로 옮겨 드립니다(갱신 구매액이 직전보다 적으면 갱신 구매액의 20%까지). 옮긴 한도는 새 계약 기간 안에만 쓸 수 있고 다시 옮기지 않습니다. 보너스 한도는 옮기지 않습니다.',
      '이용 한도는 유료 한도를 먼저 쓰고 보너스 한도를 나중에 씁니다. 보너스 한도는 무상 제공분으로 환불 · 이월 대상이 아닙니다.',
      '기관 사정으로 이용 기간 중 해지하면 「남은 유료 한도 − 사용한 보너스 한도」 × 1,000원의 90%를 돌려 드립니다(10%는 위약금). 계약 시작 14일 이내이고 사용한 한도가 없으면 전액 환불합니다. 산타(주)의 책임 있는 사유로 해지하면 남은 유료 한도 전액을 돌려 드립니다.',
      '세금계산서는 구매 확정 때 이용권 가격 전액(보너스 제외)으로 발행하며, 환불하면 수정세금계산서를 발행합니다.'],
    public_license: ['계약 목적물은 계약서에 정한 이용 기간(회계연도 안) 동안 산타(주)가 공급하는 콘텐츠를 이용 한도 안에서 이용할 수 있는 이용권입니다.',
      '산타(주)가 기관 계정을 개통하고 이용 한도를 부여하면 납품이 완료되며, 기관은 계약 조건에 따라 검사 · 검수 후 대가를 지급합니다.',
      '이용 기간이 끝나면 쓰지 않은 이용 한도는 소멸하며 반환 · 이월하지 않습니다. 다음 연도 이용은 새 계약으로 하며, 이때 미사용 유료 한도를 직전 계약 유료 한도의 20%까지 반영할 수 있습니다.',
      '선금을 지급한 경우 선금의 정산은 기관의 계약 조건과 관계 예규에 따릅니다.'],
    public_postpaid: ['기관은 계약 기간 동안 산타(주)가 공급하는 콘텐츠를 계약 한도 금액 안에서 이용하고, 산타(주)는 분기마다 실제 이용(차감) 실적으로 대가를 청구합니다.',
      '1크레딧은 1,000원(부가세 별도)이며, 청구액은 분기 중 차감한 크레딧 × 1,000원입니다. 계약 한도 금액을 넘는 이용은 기관의 사전 승인이 있어야 합니다.',
      '분기 청구서에는 과정별 · 월별 이용 실적을 붙이며, 기관의 검사 · 검수 후 대가를 지급합니다. 보너스는 제공하지 않습니다.'],
    T1: '구매를 확정하면 산타가 이용권 가격(부가세 별도, 보너스 제외)으로 세금계산서를 발행합니다. 입금이 확인되면 크레딧이 들어옵니다. 실제 결제는 이 화면에서 일어나지 않습니다.',
    agree: '위 이용 조건(이용 기간 · 기간 종료 시 미사용 한도 소멸 · 갱신 시 이월 · 중도 해지 위약금)을 확인했습니다',
    lapse: '기간이 끝나면 쓰지 않은 이용 한도는 환불되지 않고 소멸한다는 점을 확인했습니다' });
  const MODES = { general: '일반(연간 이용권)', public_license: '공공 기관 — 연간 이용권', public_postpaid: '공공 기관 — 분기 후불 정산' };
  const daysTo = d => Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(today() + 'T00:00:00Z')) / 864e5);
  /* 로트 상태(r3 C3-6): 이용 가능 · 소멸 예정(D-n, 30일 이내) · 소멸 · 이월분 */
  const lotState = l => { const to = l.validTo || l.carryTo; if (!to) return '이용 가능'; const n = daysTo(to); if (n < 0) return '소멸'; const base = l.lot === 'carry' ? '이월분' : '이용 가능'; return n <= 30 ? `${base} · 소멸 예정(D-${n})` : base; };
  const refundIn = c => ({ lots: (c.wallet || []).map(l => ({ lot: l.lot === 'buy' ? 'paid' : l.lot, credits: l.credits, remain: l.remain, validTo: l.validTo || l.carryTo })), o: { start: c.start, usedTotal: (c.wallet || []).reduce((s, l) => s + Math.max(0, l.credits - l.remain), 0), buyerMode: c.buyerMode || 'general', penaltyBp: c.terms && c.terms.penaltyBp } });
  const REFUND_MODE = { full: '전액 환불(시작 14일 이내 · 사용 없음)', terminate: '중도 해지(위약금 10%)', santa_fault: '산타 귀책 해지(전액)', contract: '공공 기관 계약 조건에 따라 정산(산타 확인 후 확정)', none: '환불 대상 없음(기간 종료 · 후불 계약)' };
  const carryPreview = c => { const paid = (c.wallet || []).filter(l => l.lot !== 'bonus'); const pc = paid.filter(l => l.lot !== 'carry').reduce((s, l) => s + l.credits, 0);
    return MC('carryOf')({ paidCredits: pc, paidUnused: paid.reduce((s, l) => s + l.remain, 0), validTo: c.validTo }, { paidCredits: pc, signedAt: today() }, { carryBp: c.terms && c.terms.carryBp }); };
  /* 공공 기관 판정: 통합 채팅방이 키를 정하기 전 임시 — org.public · gov 유형이면 공공 기본값, 확인 카드에서 구매 방식을 고릅니다 */
  const isPublicOrg = () => !!(S.org && (S.org.public === true || S.org.type === 'gov' || S.org.type === 'public'));
  const termsBox = mode => { mode = MK_TERMS[mode] ? mode : 'general'; return `<div class="mk-terms" data-terms><b>${MK_TERMS.title[mode]}</b><ol>${MK_TERMS[mode].map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>`; };
  /* 확인 카드: 이용 조건 · 구매 방식 · 필수 동의 2개(소멸 조항 별도). 둘 다 체크 전에는 [확정] 비활성 */
  const termsGate = w => { const ok = w.querySelector('[data-mact="ok"]'); const cks = [...w.querySelectorAll('[name=mkAgree],[name=mkLapse]')]; const md = w.querySelector('[name=mkMode]'); if (!ok || cks.length < 2) return;
    const sync = () => { ok.disabled = !cks.every(x => x.checked); }; cks.forEach(x => x.addEventListener('change', sync)); sync();
    if (md) md.addEventListener('change', () => { const box = w.querySelector('[data-terms]'); if (box) box.outerHTML = termsBox(md.value); cks.forEach(x => { x.checked = false; }); sync(); }); };
  const termsHTML = (mode, fixed) => `${termsBox(mode)}<label class="mk-field"><span>구매 방식</span><select class="mk-inp" name="mkMode"${fixed ? ' disabled' : ''}>${Object.entries(MODES).map(([k, v]) => `<option value="${k}"${k === mode ? ' selected' : ''}>${v}</option>`).join('')}</select></label><label class="mk-ckl req"><input type="checkbox" name="mkAgree"> ${MK_TERMS.agree}(필수)</label><label class="mk-ckl req"><input type="checkbox" name="mkLapse"> ${MK_TERMS.lapse}(필수)</label>`;
  const PRODS = [
    { id: 'mp_wr01', title: '보고서 글쓰기 기초', cp: 'CP 러닝웍스', lessons: 6, hours: 15, level: '초급', listPrice: 45000, optin: 'credit', creditFrom: '2027-03-01', minUntil: '2028-03-01', cols: ['univ'], img: 'lap-04', rating: 4.8, lic: ['stream', 'embed', 'adapt'], vol: { fromN: 500, offBp: 1000 } },
    { id: 'mp_ai01', ad: true, title: '생성형 AI 실무 활용 — 프롬프트부터 업무 자동화까지', cp: 'CP 러닝웍스', lessons: 12, hours: 16, level: '초급', listPrice: 50000, optin: 'credit', creditFrom: '2027-03-01', minUntil: '2028-03-01', cols: ['univ', 'job'], img: 'lap-05', rating: 4.8, lic: ['stream', 'embed', 'adapt'], vol: { fromN: 500, offBp: 1000 }, next: { listPrice: 60000, from: '2027-12-01' } },
    { id: 'mp_cv01', title: '첫 이력서, AI와 같이 고쳐 보기', cp: 'CP 에듀온', lessons: 5, hours: 12, level: '초급', listPrice: 42500, optin: 'credit', creditFrom: '2027-03-01', minUntil: '2028-03-01', cols: ['univ'], img: 'off-03', rating: 4.7, lic: ['stream', 'embed'], vol: { fromN: 500, offBp: 1000 } },
    { id: 'mp_iv01', title: '면접 답변 구조 STAR 연습', cp: 'CP 에듀온', lessons: 4, hours: 10, level: '중급', listPrice: 30000, optin: 'credit', creditFrom: '2027-03-01', minUntil: '2028-03-01', cols: ['univ', 'job'], img: 'grp-03', rating: 4.6, lic: ['stream'], vol: null },
    { id: 'mp_en01', title: '비즈니스 영어 이메일 30분', cp: 'CP 한빛미디어', lessons: 6, hours: 9, level: '중급', listPrice: 49900, optin: 'credit', creditFrom: '2027-03-01', minUntil: '2028-03-01', cols: ['univ'], img: 'lan-02', rating: 4.5, lic: ['stream', 'embed'], vol: null },
    { id: 'mp_dt01', title: '데이터 분석 실무 — 엑셀에서 파이썬까지', cp: 'CP 한빛미디어', lessons: 20, hours: 30, level: '중급', listPrice: 120000, optin: 'credit', creditFrom: '2027-03-01', minUntil: '2028-03-01', cols: ['job'], img: 'dsk-06', rating: 4.7, lic: ['stream', 'embed', 'adapt'], vol: null },
    { id: 'mp_ncs01', title: '공기업 NCS 직업기초능력 완성', cp: 'CP 에듀온', lessons: 20, hours: 11, level: '중급', listPrice: 90000, floorRule: true, optin: 'single', cols: ['job'], img: 'off-04', rating: 4.6, lic: ['stream', 'embed'], vol: { fromN: 300, offBp: 2000 } },
    { id: 'mp_sc01', title: '반도체 공정 기초', cp: 'CP 러닝웍스', lessons: 10, hours: 12, level: '초급', listPrice: 55000, optin: 'soon', creditFrom: '2027-11-01', launched: '2027-05-01', cols: ['ind'], img: 'sci-01', rating: 4.5, lic: ['stream'], vol: null },
    { id: 'mp_bs01', title: 'AI 리터러시 첫걸음(산타 베이직)', cp: '산타', lessons: 4, hours: 3, level: '입문', listPrice: 30000, optin: 'credit', creditFrom: '2027-03-01', minUntil: '2028-03-01', cols: ['basic'], img: 'dsk-03', rating: 4.4, lic: ['stream', 'embed', 'adapt'], vol: null }
  ];
  const DEPTS = ['경영학과', '컴퓨터공학과', '간호학과', '국어국문학과', '전자공학과'];
  function seedDemo(D) {
    const td = today(); const start = '2027-03-01'; const V = MC('validity')(start);
    const at = (h, m) => { const t = new Date(Date.now() - h * 36e5 - (m || 0) * 6e4); return ymdL(t) + ' ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); };
    const U = [[2, 'mp_wr01', 3], [5, 'mp_ai01', 4], [26, 'mp_cv01', 2], [50, 'mp_iv01', 8], [120, 'mp_wr01', 8], [150, 'mp_en01', 1], [170, 'mp_ai01', 3], [200, 'mp_iv01', 40], [260, 'mp_dt01', 22], [330, 'mp_bs01', 60]];
    const uses = U.map(([h, p, prog], i) => { const P = PRODS.find(x => x.id === p); return { id: 'mu_d' + i, at: at(h, i * 7), prod: p, title: P.title, cp: P.cp, credits: MC('courseCredits')(P.listPrice), sid: '2027' + String(1201 + i * 37).padStart(4, '0'), dept: DEPTS[i % DEPTS.length], prog, kind: 'use' }; });
    const listed = uses.reduce((s, u) => s + u.credits, 0);
    D.credit = [{ id: 'mc_demo', status: 'active', buyer: (S && S.org && S.org.name) || '한빛대학교', amount: 30000000, bundle: true, bonusBp: 700, start, validTo: V.validTo, carryTo: V.carryTo, total: 32100, cols: ['univ', 'basic'],
      wallet: [{ lot: 'buy', label: '구매분', credits: 30000, remain: 23580, validTo: V.validTo, carryTo: V.carryTo }, { lot: 'bonus', label: '보너스분(7%)', credits: 2100, remain: 2100, validTo: V.validTo, carryTo: V.carryTo }],
      base: { used: 6420 - listed, month: { credits: 2500 - uses.filter(u => u.at.slice(0, 7) === td.slice(0, 7)).reduce((s, u) => s + u.credits, 0), n: 83 - uses.filter(u => u.at.slice(0, 7) === td.slice(0, 7)).length } },
      uses, ctrl: { monthCap: 90, allowCols: ['univ', 'basic'], allowGroups: [], preFrom: 80, alert: [20, 10], alertTo: '정운영자 · 비교과지원센터' },
      pre: [{ id: 'pa_d1', sid: '20271403', dept: '컴퓨터공학과', prod: 'mp_dt01', title: '데이터 분석 실무 — 엑셀에서 파이썬까지', credits: 120, at: at(20), st: 'asked' }, { id: 'pa_d2', sid: '20271588', dept: '경영학과', prod: 'mp_dt01', title: '데이터 분석 실무 — 엑셀에서 파이썬까지', credits: 120, at: at(44), st: 'asked' }],
      restoreReq: [{ id: 'rq_d1', use: 'mu_d0', st: 'asked', reason: '수강 대상 착오', at: at(1) }, { id: 'rq_d2', use: 'mu_d1', st: 'asked', reason: '중복 신청', at: at(3) }] }];
    D.quotes = [{ id: 'Q-2611-014', kind: 'credit', title: '대학 비교과 크레딧 패스 3,000만 원(번들)', amount: 30000000, status: 'active', at: '2027-02-10' }];
  }
  function mkDefault() { const D = { v: 2, on: true, cart: [], quotes: [], credit: [], demo: true }; if (LIVEON()) { D.live = 1; delete D.demo; } else seedDemo(D); return D; }
  function ensure() { if (!S || !S.org) return null;
    if (!S.market || S.market.v !== 2) S.market = mkDefault(); /* v:1(좌석형 시연 데이터)이면 시연 데이터만 다시 만듭니다(운영 데이터 없음, spec 7장 끝) */
    const D = S.market; ['cart', 'quotes', 'credit'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; });
    if (LIVEON() && !D.live) { D.cart = []; D.quotes = []; D.credit = []; D.live = 1; delete D.demo; } return D; }
  window.marketEnsure = ensure;
  const M = () => ensure();
  const con = () => (M().credit || []).find(c => c.status === 'active') || null;

  /* ── 메뉴 · 프리셋 · 기존 저장 사용자(spec 4-2 · 4-3 · 4-4) ── */
  MENU.market = { label: '콘텐츠 마켓', ws: 'learn', gate: pilot };
  const ON_TYPES = ['univ', 'corp', 'public', 'voc', 'lifelong'];
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; if (P.on.includes('market') || P.off.includes('market')) return; const base = k.replace(/_.*/, '');
    if (ON_TYPES.includes(base)) { const at = P.on.indexOf('library'); if (at >= 0) P.on.splice(at + 1, 0, 'market'); else P.on.push('market'); } else P.off.push('market'); });
  Object.assign(MENU_ALIAS, { mkcredit: () => { UI.market = 'credit'; return 'market'; }, mkbuild: () => { UI.market = 'build'; return 'market'; }, mkapprove: () => { UI.market = 'approve'; return 'market'; } });
  function mk1Migrate() { if (!S || !S.org || !S.nav || !S.nav.tabs || S.nav.mk1) return; const T = S.nav.tabs.learn = S.nav.tabs.learn || [];
    if (!Object.values(S.nav.tabs).some(L => (L || []).some(x => x.id === 'market'))) { const on = ON_TYPES.includes(S.org.type); const at = T.findIndex(x => x.id === 'clib' || x.id === 'library'); const row = { id: 'market', on }; if (at >= 0) T.splice(at + 1, 0, row); else T.push(row); }
    S.nav.mk1 = 1; }
  /* 간편 메뉴(slimEss): 시범 기관 · 기본 켬 유형이면 「콘텐츠 마켓」을 보관함(clib) 바로 뒤에 둡니다(spec 4-3 · 4-4) */
  if (typeof window.slimEss === 'function') { const base = window.slimEss; window.slimEss = (...a) => { let E = base(...a) || []; try { if (S && S.org && pilot() && ON_TYPES.includes(S.org.type) && Array.isArray(E) && !E.includes('market')) { const at = E.findIndex(id => id === 'clib' || id === 'library'); E = [...E]; E.splice(at < 0 ? E.length : at + 1, 0, 'market'); } } catch (e) { console.error('market slim', e); } return E; }; }
  /* 보관함(clib)이 나중에 다시 붙으면(기존 저장 사용자 이전) 마켓 뒤로 밀려 탭 줄 끝에 가려지므로, 마켓을 늘 clib 바로 뒤에 둡니다 */
  function mkAfterClib() { const T = S && S.nav && S.nav.tabs && S.nav.tabs.learn; if (!T) return; const m = T.findIndex(x => x.id === 'market'), c = T.findIndex(x => x.id === 'clib'); if (m < 0 || c < 0 || m > c) return; const [row] = T.splice(m, 1); T.splice(T.findIndex(x => x.id === 'clib') + 1, 0, row); }
  if (typeof window.slimMD === 'function') { const base = window.slimMD; window.slimMD = id => id === 'market' ? ['콘텐츠 패스 · 마켓을 둘러봅니다', '예산 3,000만 원으로 비교과 패스 구성해 줘'] : base(id); }
  if (typeof DICT !== 'undefined') Object.assign(DICT, { '콘텐츠 마켓': 'Content Market|コンテンツマーケット|内容市场|Mercado de contenidos|Marché de contenus|Content-Markt|Chợ nội dung|ตลาดคอนเทนต์|Маркет контента', '콘텐츠 패스': 'Content Pass|コンテンツパス|内容通行证|Pase de contenidos|Pass contenus|Content-Pass|Gói nội dung|พาสคอนเทนต์|Контент-пасс' });
  if (typeof postSeed === 'function') { const base = postSeed; postSeed = (...a) => { const r = base(...a); try { ensure(); } catch (e) { console.error('market', e); } return r; }; } /* eslint-disable-line no-global-assign */
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org) { ensure(); mk1Migrate(); mkAfterClib(); } } catch (e) { console.error('market', e); } return r; }; } /* eslint-disable-line no-global-assign */
  /* 학습자 게시본: 진열대 · 기관 통제 규칙만(학습자 개인정보 · 금액 · 계약 정보 없음, spec 4-4) */
  const shelfOf = c => COLS.filter(x => (c.ctrl.allowCols || c.cols || []).includes(x.id)).map(x => ({ colId: x.id, title: x.title, items: PRODS.filter(p => p.optin === 'credit' && p.cols.includes(x.id)).map(p => ({ id: p.id, title: p.title, cp: p.cp, lessons: p.lessons, hours: p.hours, credits: MC('courseCredits')(p.listPrice), img: p.img })) }));
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const pub = base(...a); try { if (pub && S && S.market && pilot()) { const c = con(); pub.mk = c && !S.market.live ? { on: true, passName: `${S.org.name || ''} 패스`, validTo: c.validTo, chargeRule: 'first_play', shelf: shelfOf(c), rule: { monthCap: c.ctrl.monthCap || 0, allowGroups: c.ctrl.allowGroups || [], preFrom: c.ctrl.preFrom || 0, avg: 45 }, b2c: false } : { on: !!c || !!S.market.live }; } } catch (e) { console.error('market pub', e); } return pub; }; } /* eslint-disable-line no-global-assign */

  /* 시연판 학습자 이벤트(lmarket.js lpxPush) → 사용 내역 · 사전 승인 요청 */
  if (typeof LPX !== 'undefined') {
    LPX['mk-start'] = x => { const D = M(); const c = con(); if (!D || D.live || !c) return; const d = x.data || {}; const P = PRODS.find(p => p.id === d.productId); if (!P) return; const sid = String(x.who || d.sid || ''); if (c.uses.some(u => u.prod === P.id && u.sid === sid && u.kind === 'use' && !u.restored)) return;
      const cr = MC('courseCredits')(P.listPrice); const lot = c.wallet.find(l => l.remain >= cr); if (!lot) return; lot.remain -= cr; c.uses.unshift({ id: id8('mu_'), at: String(x.at || '').replace('T', ' ').slice(0, 16) || nowStr(), prod: P.id, title: P.title, cp: P.cp, credits: cr, sid, dept: d.dept || '', prog: 0, kind: 'use' }); };
    LPX['mk-pre'] = x => { const c = con(); if (!c || M().live) return; const d = x.data || {}; const P = PRODS.find(p => p.id === d.productId); if (!P) return; const sid = String(x.who || ''); if (c.pre.some(q => q.prod === P.id && q.sid === sid && q.st === 'asked')) return;
      c.pre.unshift({ id: id8('pa_'), sid, dept: d.dept || '', prod: P.id, title: P.title, credits: MC('courseCredits')(P.listPrice), at: nowStr(), st: 'asked' }); };
  }

  /* ── 운영 서버(/api/market/*) ── */
  const LV = { key: '', d: {}, busy: false, err: '', errAt: 0 };
  const ERRN = { mk_plan: '디디쌤 유료 구독 기관만 구매 · 판매할 수 있습니다.', mk_margin: '보너스를 포함한 산타 몫이 30% 미만이라 계약 · 견적을 만들 수 없습니다. 아래 대안 중 하나를 고르십시오.', mk_bonus_max: '보너스 크레딧은 구매 크레딧의 7%까지만 줄 수 있습니다.', mk_quote_state: '이 견적은 만료되었거나 CP 승인을 기다리고 있습니다.', mk_restore_window: '복원은 차감 후 7일 이내, 진도 10% 미만일 때만 할 수 있습니다. 그 밖의 경우 [이의 신청]으로 산타에 요청하십시오.', forbidden: '권한이 없습니다.', mk_off: '이 기관은 콘텐츠 마켓 시범 대상이 아닙니다.' };
  const errOf = e => { const c = e && (e.code || e.error || (e.body && e.body.error)); return ERRN[c] || errMsg(e, `운영 서버의 콘텐츠 마켓 기능에 연결하지 못했습니다${e && e.status ? `(${e.status})` : ''}. 잠시 뒤 다시 시도하십시오.`); };
  const qs = o => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  function livePull(tab) { const need = { home: ['GET', '/api/market/home'] };
    if (tab === 'home' || tab === 'build') need.prods = ['GET', '/api/market/products?' + qs({ q: UI.mkQ || '', optin: UI.mkSingle ? '' : 'credit', size: 12 })];
    if (tab === 'item' && UI.mkItem) need.item = ['GET', '/api/market/products/' + encodeURIComponent(UI.mkItem)];
    const cid = LV.d.home && LV.d.home.myCredit && LV.d.home.myCredit.contractId;
    if (cid && ['credit', 'ctrl', 'approve'].includes(tab)) { need.con = ['GET', '/api/market/contracts/' + encodeURIComponent(cid)]; need.uses = ['GET', `/api/market/contracts/${encodeURIComponent(cid)}/uses?size=50`]; need.pre = ['GET', `/api/market/contracts/${encodeURIComponent(cid)}/preapprovals`]; }
    if (tab === 'cart') { need.cart = ['GET', '/api/market/cart']; need.quotes = ['GET', '/api/market/quotes']; }
    const key = JSON.stringify(need); if (LV.busy || (LV.key === key && (!LV.err || Date.now() - LV.errAt < 5000))) return; LV.busy = true; LV.key = key;
    const K = Object.keys(need); Promise.all(K.map(k => api(need[k][0], need[k][1]).catch(e => { if (k === 'home') throw e; return null; })))
      .then(R => { const d = {}; K.forEach((k, i) => { d[k] = R[i]; }); const again = !LV.d.home && d.home && d.home.myCredit; LV.d = d; LV.err = ''; if (again) LV.key = ''; })
      .catch(e => { LV.err = errOf(e); LV.errAt = Date.now(); })
      .finally(() => { LV.busy = false; if (CUR.tab === 'market') render(); }); }
  const liveDo = (method, url, body, ok) => api(method, url, body).then(r => { LV.key = ''; if (ok) ok(r); render(); return r; }).catch(e => { toast(errOf(e), 'warn'); throw e; });

  /* 서버 응답 → 화면 모양(필드 이름 차이는 여기서만 흡수) */
  const mProd = x => ({ id: x.id || x.productId, title: x.title || '', cp: x.cp || x.cpName || '', lessons: +x.lessons || 0, hours: +x.hours || 0, level: x.level || '', listPrice: x.listPrice != null ? +x.listPrice : x.price && x.price.listPrice != null ? +x.price.listPrice : (+x.credits || 0) * W, optin: (x.optin && x.optin.mode) || x.optin || 'credit', creditFrom: (x.optin && x.optin.creditFrom) || x.optinFrom || '', minUntil: (x.optin && x.optin.minUntil) || '', cols: x.collections ? x.collections.map(c => c.id || c) : [], img: x.thumb || x.img || 'lap-04', rating: x.rating || null, lic: (x.price && x.price.lic) || x.lic || [], vol: x.price && x.price.volRules && x.price.volRules[0] ? { fromN: x.price.volRules[0].fromN, offBp: x.price.volRules[0].offBp } : null, next: x.price && x.price.nextPrice ? { credits: x.price.nextPrice.credits, from: x.price.nextPrice.effectiveFrom } : null, credits: x.credits != null ? +x.credits : (x.price && x.price.credits), ad: !!x.ad, hrdNo: x.hrdNo || '' });
  function liveCon() { const r = LV.d.con; if (!r || !r.contract) return null; const c = r.contract;
    const V = MC('validity')(c.start || c.startDate || today());
    return { id: c.id, status: c.status, amount: +c.amount || +c.supply || 0, bonusBp: +c.bonusBp || 0, start: c.start, buyerMode: c.buyerMode || 'general', terms: c.terms || null, validTo: c.validTo || V.validTo, carryTo: c.carryTo || V.carryTo, total: (r.wallet || []).reduce((s, l) => s + (+l.credits || 0), 0) || +c.total || 0,
      wallet: (r.wallet || []).map(l => ({ lot: l.lot, label: l.label || ({ buy: '구매분', bonus: '보너스분', topup: '추가 구매분', carry: '이월분' })[l.lot] || l.lot, credits: +l.credits || 0, remain: +l.remain || 0, validTo: l.validTo, carryTo: l.carryTo })),
      liveUsed: r.used || {}, uses: ((LV.d.uses && LV.d.uses.items) || []).map((u, i) => ({ id: u.id || 'u' + i, at: String(u.at || '').replace('T', ' ').slice(0, 16), prod: u.productId || '', title: (u.product && (u.product.title || u.product)) || u.title || '', cp: u.cp || (u.product && u.product.cp) || '', credits: +u.credits || 0, sid: (u.learner && (u.learner.sid || u.learner.학번)) || '', dept: (u.learner && (u.learner.dept || u.learner.학과)) || '', kind: u.kind || 'use', restorable: !!u.restorable, prog: u.prog })),
      ctrl: r.control || r.controls || c.controls || {}, pre: ((LV.d.pre && LV.d.pre.items) || []).map(p => ({ id: p.id, sid: p.sid || (p.learner && p.learner.sid) || '', dept: p.dept || (p.learner && p.learner.dept) || '', title: p.title || (p.product && p.product.title) || '', credits: +p.credits || 0, at: p.at || '', st: p.status || p.st || 'asked' })), restoreReq: [] }; }

  /* ── 상태 읽기(시연 · 운영 공통 모양) ── */
  const prods = () => LIVEON() ? ((LV.d.prods && LV.d.prods.items) || (LV.d.home && LV.d.home.recommended) || []).map(mProd) : PRODS;
  const cols = () => LIVEON() ? ((LV.d.home && LV.d.home.collections) || []).map(c => ({ id: c.id, kind: c.kind, title: c.title, avgCredits: +c.avgCredits || 45, count: +c.count || 0, img: c.cover || 'cls-01', note: '' })) : COLS;
  const contract = () => LIVEON() ? liveCon() : con();
  const credOf = p => p.credits != null && !isNaN(p.credits) ? +p.credits : MC('courseCredits')(p.listPrice);
  const balOf = c => (c.wallet || []).reduce((s, l) => s + (+l.remain || 0), 0);
  const usedMonth = c => { if (c.liveUsed && c.liveUsed.month != null) return { credits: +c.liveUsed.month || 0, n: +c.liveUsed.monthN || +c.liveUsed.n || 0 }; const ym = today().slice(0, 7); const U = (c.uses || []).filter(u => u.kind === 'use' && !u.restored && String(u.at).slice(0, 7) === ym); const b = (c.base && c.base.month) || { credits: 0, n: 0 }; return { credits: b.credits + U.reduce((s, u) => s + u.credits, 0), n: b.n + U.length }; };
  const canRestore = u => u.kind === 'use' && !u.restored && (u.restorable != null && LIVEON() ? u.restorable : MC('restorable')(hoursSince(u.at), +u.prog || 0));
  const defCpp = () => S.org.type === 'corp' ? 2 : 1.5;
  const defCols = () => S.org.type === 'univ' ? (S.org.ed === 'lms' ? ['univ', 'basic'] : ['univ']) : S.org.type === 'corp' || S.org.type === 'voc' ? ['ind', 'job'] : ['basic'];
  const calcIn = () => { const c = UI.mkCalc = UI.mkCalc || {}; if (!c.cols) c.cols = defCols(); if (c.cpp == null) c.cpp = defCpp(); if (c.budget == null && c.people == null) c.budget = 30000000; return c; };
  const avgOf = ids => { const L = cols().filter(x => ids.includes(x.id)); return L.length ? Math.round(L.reduce((s, x) => s + x.avgCredits, 0) / L.length) : 45; };
  const planOf = x => MC('plan')({ budget: x.budget, people: x.people, avgCredits: x.avg || avgOf(x.cols || []), coursesPerPerson: x.cpp, bundle: !!x.bundle, bonusBp: x.bonusBp });

  /* ── 공통 조각 ── */
  const bd = p => p.optin === 'credit' ? '<span class="mk-bd pass">크레딧</span>' : p.optin === 'soon' ? '<span class="mk-bd soon">곧 크레딧 참여</span>' : '<span class="mk-bd one">개별 임대</span>';
  const priceLine = p => teacher() ? '<div class="mk-price incl"><b>우리 기관 패스</b></div>' : p.optin === 'credit' ? `<div class="mk-price"><b>${nf(credOf(p))}크레딧</b><small>· 수강 시작 시</small></div>` : '<div class="mk-price"><b>개별 임대 · 견적</b></div>';
  const card = p => `<article class="mk-pc" data-act="mk-open" data-v="${esc(p.id)}" tabindex="0" role="button" aria-label="${p.ad ? '광고 상품, ' : ''}${esc(p.title)} 상세 보기"><div class="mk-im" style="background-image:url(${IMG(p.img)})">${p.ad ? '<span class="mk-ad" aria-label="광고 상품">광고</span>' : ''}<div class="mk-bds">${bd(p)}<span class="mk-bd cp">${esc(p.cp)}</span></div><span class="mk-dur">미리보기 90초</span></div><div class="mk-bo"><p class="mk-t">${esc(p.title)}</p><p class="mk-m">${p.lessons}차시 · ${p.hours}시간${p.level ? ' · ' + esc(p.level) : ''}</p><div class="mk-ft">${priceLine(p)}${p.rating ? `<span class="mk-star">★ ${p.rating}</span>` : ''}</div></div></article>`;
  const guard = (kind, title, body, btn) => `<div class="mk-guard ${kind || ''}" role="${kind === 'ok' ? 'status' : 'alert'}"><span class="ic">${icx(kind === 'ok' ? 'check' : 'alert', 18)}</span><div><b>${title}</b>${body ? `<p>${body}</p>` : ''}${btn || ''}</div></div>`;
  const alertBand = c => { const lv = MC('alertLevel')(c.total, balOf(c)); if (!lv) return '';
    return lv === 20 ? guard('warn', `남은 이용 한도가 20%(${nf(balOf(c))}크레딧)입니다.`, '', owner() ? '<button class="btn sm pri" data-act="mk-topup">추가 구매하기</button>' : '<small>정운영자에게 추가 구매를 요청하십시오.</small>')
      : guard('', '남은 이용 한도가 10%입니다. 한도를 다 쓰면 학습자가 새 과정을 시작할 수 없습니다.', '', owner() ? '<button class="btn sm pri" data-act="mk-topup">추가 구매하기</button>' : ''); };
  const kpi = (lab, val, foot) => `<div class="kpi"><div class="lab">${lab}</div><div class="val mk-num">${val}</div><div class="foot">${foot || ''}</div></div>`;
  const SUBT = [['home', '마켓 홈'], ['build', '크레딧 패스 구성'], ['credit', '이용 한도 · 사용 현황'], ['ctrl', '기관 통제'], ['approve', '승인 · 복원 요청'], ['cart', '장바구니 · 견적']];
  const subList = () => teacher() ? SUBT.filter(([k]) => k === 'home') : SUBT.filter(([k]) => k !== 'ctrl' || owner() || santa());
  const curTab = () => { const t = UI.market || 'home'; if (t === 'item') return UI.mkItem ? 'item' : 'home'; return subList().some(([k]) => k === t) ? t : 'home'; };
  const subtabs = t => `<div class="seg2 mk-subtabs" role="tablist" aria-label="콘텐츠 마켓 하위 화면">${subList().map(([k, l]) => `<button role="tab" aria-selected="${k === t}" class="${k === t ? 'on' : ''}" data-act="tab" data-key="market" data-v="${k}">${esc(l)}</button>`).join('')}</div>`;

  /* ── A1 마켓 홈 ── */
  function vHome() { const c = contract(); const P = prods().filter(p => UI.mkSingle ? true : p.optin === 'credit'); const q = String(UI.mkQ || '').trim(); const L = q ? P.filter(p => (p.title + p.cp).includes(q)).sort((a, b) => (b.title.includes(q) - a.title.includes(q)) || a.title.localeCompare(b.title, 'ko')) : P; /* 검색 결과에는 광고 가중치 없음(policy v1.2 · 표시광고법) */ const C = cols();
    const elig = LIVEON() && LV.d.home && LV.d.home.eligible && LV.d.home.eligible.ok === false ? guard('warn', '디디쌤 유료 구독 기관만 구매 · 판매할 수 있습니다.', '둘러보기는 계속할 수 있습니다.', '<button class="btn sm ghost" data-act="go" data-v="plan">요금제 보기</button>') : '';
    const bal = c ? balOf(c) : 0; const w = c && c.total ? Math.round(bal * 100 / c.total) : 0;
    const myCard = teacher() ? '' : c ? `<div class="mk-float"><span class="mk-av g">${icx('wallet', 18)}</span><div style="flex:1"><b style="font-size:14.5px">남은 이용 한도 <span class="mk-num">${nf(bal)} / ${nf(c.total)}</span> · 유효 ${esc(c.validTo)}</b><div class="mk-meter" role="img" aria-label="남은 이용 한도 ${w}%" style="margin:8px 0 0"><i style="width:${w}%"></i><b style="left:20%"></b><b style="left:10%"></b></div><div class="mk-meter-l"><span>10% · 20% 경보</span><span class="mk-num">${nf(bal)} / ${nf(c.total)}크레딧</span></div></div></div><button class="btn sm ghost" data-act="tab" data-key="market" data-v="credit">사용 현황</button></div>`
      : `<div class="mk-float"><span class="mk-av g">${icx('wallet', 18)}</span><div style="flex:1"><b style="font-size:14.5px">아직 크레딧 패스가 없습니다</b><small class="mk-sub">예산을 넣으면 크레딧과 예상 수강 건수를 계산합니다.</small></div><button class="btn sm pri" data-act="tab" data-key="market" data-v="build">크레딧 패스 구성하기</button></div>`;
    const hero = `<section class="mk-hero"><div class="mk-hl"><p class="mk-eye">${esc(S.org.name || '')} 맞춤 · 크레딧형 콘텐츠 패스</p><h2>${teacher() ? '우리 기관 패스 과정을<br><em>수업에 넣어</em> 보십시오' : '예산만 입력하시면<br><em>크레딧 패스</em>를 제안합니다'}</h2><p class="mk-sub">${teacher() ? '검수된 CP 과정을 우리 기관 패스로 이용합니다.' : '1크레딧 = 1,000원(부가세 별도). 학습자가 과정을 시작할 때 CP 정가대로 차감됩니다. AI 사용료는 별도입니다.'}</p>
      <label class="mk-search">${icx('search', 18)}<input type="search" value="${esc(UI.mkQ || '')}" data-chg="mk-q" placeholder="과정 · 공급사를 검색합니다 (예: 면접, 글쓰기, 반도체)" aria-label="마켓 검색"><button class="btn pri sm" data-act="mk-search">검색</button></label>
      <div class="chips" role="group" aria-label="참여 필터"><button class="chip ${UI.mkSingle ? '' : 'on'}" data-act="mk-filter" data-v="credit" aria-pressed="${!UI.mkSingle}">크레딧 참여만</button><button class="chip ${UI.mkSingle ? 'on' : ''}" data-act="mk-filter" data-v="single" aria-pressed="${!!UI.mkSingle}">개별 임대 포함</button></div></div>
      <div class="mk-hp" style="background-image:url(${IMG('lib-02')})">${myCard}</div></section>`;
    const colsH = `<div class="mk-sec"><div><h2 class="mk-h2">컬렉션</h2><p class="mk-sub">컬렉션은 노출 묶음입니다. 가격은 과정마다 CP 정가로 정해집니다.</p></div></div><div class="mk-g4">${C.map(x => `<a class="mk-col" style="background-image:url(${IMG(x.img)})" data-act="mk-col-go" data-v="${esc(x.id)}" href="#"><span class="mk-bd pass" style="align-self:flex-start;margin-bottom:auto">크레딧</span><b>${esc(x.title)}</b><small>${teacher() ? '' : `평균 ${x.avgCredits}크레딧(정가 ${nf(x.avgCredits * W)}원${x.hours ? ' · ' + x.hours + '시간' : ''}) · `}${nf(x.count)}개 과정</small></a>`).join('')}</div>`;
    const list = `<div class="mk-sec"><div><h2 class="mk-h2">${q ? `「${esc(q)}」 검색 결과 ${L.length}개` : '추천 과정'}${!q && L.slice(0, 12).some(p => p.ad) ? ' <button class="mk-adinfo" data-act="mk-adinfo" aria-label="광고 안내 보기">광고 안내</button>' : ''}</h2><p class="mk-sub">${UI.mkSingle ? '크레딧 참여 상품과 개별 임대 상품을 함께 보여 줍니다.' : '크레딧으로 바로 이용할 수 있는 상품만 보여 줍니다.'}</p></div></div>${L.length ? `<div class="mk-g4">${L.slice(0, 12).map(card).join('')}</div>` : `<div class="empty">찾는 과정이 없습니다. 검색어를 바꾸거나 [개별 임대 포함]을 눌러 보십시오.</div>`}`;
    const sam = teacher() ? '' : `<div class="card"><div class="ch"><b>AI SAM에게 맡기기</b><small>말로 지시하면 크레딧과 예상 수강 건수를 계산합니다</small></div><div class="mk-ai" style="display:flex;flex-direction:column;gap:10px"><p class="mk-sub" style="color:var(--n900);font-weight:700">「예산 3,000만 원으로 비교과 패스 구성해 줘」</p><p class="mk-sub">계산은 조회만 합니다. 견적 요청 · 구매 확정은 이 화면에서 정운영자가 합니다.</p><div><button class="btn ghost sm" data-act="chat-open">AI SAM 열기</button></div></div></div>`;
    return `${elig}${c ? alertBand(c) : ''}${hero}${colsH}${list}${sam}`; }

  /* ── A2 상품 상세 ── */
  function vItem() { const id = UI.mkItem; let p = prods().find(x => x.id === id); if (LIVEON() && LV.d.item && LV.d.item.product) p = mProd({ ...LV.d.item.product, price: LV.d.item.price, optin: LV.d.item.optin, collections: LV.d.item.collections });
    if (!p) return `<div class="empty">${LIVEON() && LV.busy ? '상품을 불러오는 중입니다.' : '상품을 찾지 못했습니다.'} <button class="btn sm ghost" data-act="tab" data-key="market" data-v="home">마켓 홈으로</button></div>`;
    const cr = credOf(p); const LIC = { stream: '스트리밍 시청', embed: '기관 과정에 넣기', adapt: 'AI 요약 · 번역 · 퀴즈 생성' };
    const st = p.optin === 'credit' ? `<p class="mk-note">${icx('check', 14)} 크레딧 참여 중${p.minUntil ? `(${esc(p.minUntil)}까지 최소 참여)` : ''}</p>` : p.optin === 'soon' ? `<p class="mk-note">${icx('clock', 14)} ${esc(p.creditFrom)}부터 크레딧으로 이용할 수 있습니다</p>` : `<p class="mk-note">${icx('info', 14)} 개별 판매 전용 상품입니다 — 개별 임대 견적으로 구매합니다</p>`;
    const volCr = p.vol ? Math.ceil(Math.floor(p.listPrice * (10000 - p.vol.offBp) / 10000) / W) : 0;
    const nextCr = p.next ? (p.next.credits || MC('courseCredits')(p.next.listPrice)) : 0;
    const box = teacher() ? `<div class="card mk-side"><div class="ch"><b>이 과정 이용</b></div><p class="mk-sub">우리 기관 패스로 이용하는 과정입니다. 크레딧 · 가격은 운영자 화면에서 확인합니다.</p><button class="btn pri" data-act="mk-put" data-v="${esc(p.id)}">과정에 넣기</button></div>`
      : p.optin === 'credit' ? `<div class="card mk-side"><div class="ch"><b>가격</b><small>1크레딧 = 1,000원(부가세 별도)</small></div><div class="mk-price"><b style="font-size:26px">${nf(cr)}크레딧</b><small>수강 시작 시(CP 정가 ${nf(p.listPrice)}원)</small></div>${p.vol ? `<p class="mk-sub">같은 과정 ${nf(p.vol.fromN)}명째 수강부터 ${nf(volCr)}크레딧(CP 수량 할인)</p>` : ''}${p.next ? `<p class="mk-note warn">${esc(p.next.from)}부터 ${nf(nextCr)}크레딧으로 바뀝니다. 이미 시작한 수강은 바뀌지 않습니다.</p>` : ''}${st}<div class="mk-acts"><button class="btn pri" data-act="mk-put" data-v="${esc(p.id)}">과정에 넣기</button><button class="btn ghost" data-act="mk-preview" data-v="${esc(p.id)}">미리보기 90초</button></div></div>`
      : `<div class="card mk-side"><div class="ch"><b>개별 임대</b><small>부가세 별도</small></div>${st}<p class="mk-sub">CP 정가 ${nf(p.listPrice)}원 기준으로 견적을 만듭니다${p.vol ? ` · ${nf(p.vol.fromN)}석 이상 ${p.vol.offBp / 100}% 할인` : ''}. 최저가 미만 요청은 CP 승인 후 견적이 발행됩니다.</p><p class="mk-sub">예산이 견적 금액보다 적으면 견적 화면에서 대안을 안내합니다.</p><div class="mk-acts"><button class="btn pri" data-act="mk-cart-add" data-v="${esc(p.id)}">장바구니에 담기</button><button class="btn ghost" data-act="mk-quote-pdf" data-v="${esc(p.id)}">견적 PDF</button></div></div>`;
    return `<p><button class="btn ghost sm" data-act="tab" data-key="market" data-v="home">← 마켓 홈</button></p><div class="mk-g2" style="grid-template-columns:2fr 1fr"><div><div class="mk-player" style="background-image:url(${IMG(p.img)})"><span class="mk-play">${icx('play', 22)}</span><span class="mk-dur">미리보기 90초 · 차감 없음</span></div>
      <div class="mk-bds" style="margin-top:14px">${bd(p)}<span class="mk-bd cp">${esc(p.cp)}</span></div><h2 class="mk-h2" style="margin:8px 0">${p.ad ? '<span class="mk-ad in">광고</span> ' : ''}${esc(p.title)}</h2>${p.ad ? `<p class="mk-adtx">${MK_AD.A2}</p>` : ''}<p class="mk-adtx">${p.hrdNo ? `원격훈련 인정 과정 · 인정 번호 ${esc(p.hrdNo)}` : '고용노동부 원격훈련 인정 과정이 아닙니다(직업훈련 기관은 별도 심사가 필요합니다).'}</p>
      <div class="kpis">${kpi('차시', p.lessons + '차시')}${kpi('학습 시간', p.hours + '시간')}${kpi('난이도', esc(p.level || '-'))}${kpi('만족도', p.rating ? '★ ' + p.rating : '-')}</div>
      <div class="card"><div class="ch"><b>라이선스</b><small>CP가 상품별로 허용 범위를 고릅니다</small></div><ul class="mk-dl">${Object.entries(LIC).map(([k, l]) => `<li>${(p.lic || []).includes(k) ? '<span class="tag g">허용</span>' : '<span class="tag">미허용</span>'} ${esc(l)}</li>`).join('')}</ul></div></div>${box}</div>`; }

  /* ── A3 크레딧 패스 구성 ── */
  function vBuild() { const x = calcIn(); const R = planOf(x); const C = cols(); const cpp = x.cpp; const avg = R.avgCredits; const colN = cols().filter(c => x.cols.includes(c.id)).map(c => c.title).join(' · ') || '선택한 컬렉션';
    const proxy = proxyOk() && UI.mkProxy; const byB = x.people == null;
    const inp = `<div class="card" style="display:flex;flex-direction:column;gap:16px"><div><p class="mk-eye">① 예산 또는 예상 인원</p><h2 class="mk-h2">하나만 넣으면 나머지를 계산합니다</h2></div>
      <div class="mk-calc"><div class="mk-in ${byB ? 'on' : ''}"><label for="mkB">연간 예산 <span class="tag ${byB ? 'g' : 'b'}">${byB ? '입력' : '계산됨'}</span></label><span class="mk-v"><input id="mkB" class="mk-inp" inputmode="numeric" data-chg="mk-calc-in" name="budget" value="${nf(R.budget)}" aria-label="연간 예산(원)"><small>원</small></span><span class="mk-h">부가세 별도 · 예상 인원을 넣으면 예산을 계산합니다</span></div>
      <div class="mk-in ${byB ? '' : 'on'}"><label for="mkP">예상 인원 <span class="tag ${byB ? 'b' : 'g'}">${byB ? '계산됨' : '입력'}</span></label><span class="mk-v"><input id="mkP" class="mk-inp" inputmode="numeric" data-chg="mk-calc-in" name="people" value="${nf(byB ? R.people : x.people)}" aria-label="예상 인원(명)"><small>명</small></span><span class="mk-h">둘 중 하나만 입력합니다</span></div>
      <div class="mk-in"><label for="mkA">1인 평균 과정 수 <span class="tag">가정</span></label><span class="mk-v"><input id="mkA" class="mk-inp" inputmode="decimal" data-chg="mk-assume" value="${cpp}" aria-label="1인 평균 과정 수"><small>과정</small></span><span class="mk-h">기본값 대학 1.5 · 기업 2.0</span></div></div>
      <div class="mk-field"><label>② 컬렉션 선택(복수)</label><div class="chips">${C.map(c => `<button class="chip ${x.cols.includes(c.id) ? 'on' : ''}" data-act="mk-col" data-v="${esc(c.id)}" aria-pressed="${x.cols.includes(c.id)}">${esc(c.title)} · 평균 ${c.avgCredits}크레딧</button>`).join('')}</div></div>
      <div class="mk-opt ${x.bundle ? 'on' : ''}" role="checkbox" tabindex="0" aria-checked="${!!x.bundle}" data-act="mk-bundle"><span class="mk-ck"></span><div><b style="font-size:14.5px">③ 플랫폼 구독과 함께 계약</b><p class="mk-sub" style="font-size:13px">체크하면 보너스가 7%(최대)로 올라갑니다.</p></div></div>
      ${proxyOk() ? `<div class="mk-opt ${UI.mkProxy ? 'on' : ''}" role="checkbox" tabindex="0" aria-checked="${!!UI.mkProxy}" data-act="mk-proxy"><span class="mk-ck"></span><div><b style="font-size:14.5px">산타 운영 대리 작성</b><p class="mk-sub" style="font-size:13px">보너스율을 직접 넣습니다(최대 7%).</p></div></div>` : ''}
      ${proxy ? `<div class="mk-in"><label for="mkX">보너스율 <span class="tag">최대 7%</span></label><span class="mk-v"><input id="mkX" class="mk-inp" inputmode="decimal" data-chg="mk-bonus" value="${x.bonusBp != null ? x.bonusBp / 100 : ''}" placeholder="기본 규칙" aria-label="보너스율(%)"><small>%</small></span></div>` : ''}</div>`;
    /* 구매 기관 화면에는 산타 몫 · 실효 % · CP 지급액을 보이지 않습니다(통합 담당 지시). 가드 문구는 산타 대리 작성 때만 */
    const err = !proxy ? '' : (R.bonusOver || R.bonusBp > MAX_BP) ? guard('', '보너스 크레딧은 구매 크레딧의 7%까지만 줄 수 있습니다.', '보너스를 포함한 산타 몫이 30% 미만이라 계약을 만들 수 없습니다. 보너스는 최대 7%까지 줄 수 있습니다.') : R.santaBp < GUARD_BP ? guard('', '보너스를 포함한 산타 몫이 30% 미만이라 계약 · 견적을 만들 수 없습니다.', '') : '';
    const can = R.ok && R.budget > 0;
    const res = `<aside class="mk-aside" style="position:sticky;top:16px;display:flex;flex-direction:column;gap:14px"><div class="mk-res" data-calc="result" aria-live="polite"><p class="mk-eye">계산 결과</p>
      <div class="mk-price"><b style="font-size:36px;letter-spacing:-.03em" class="mk-num">${nf(R.total)}</b><small style="font-size:16px;font-weight:700">크레딧</small></div>
      <p class="mk-sub mk-r1" style="color:var(--n900)">구매 ${nf(R.credits)}크레딧 + 보너스 ${nf(R.bonusCredits)}크레딧(${R.bonusBp / 100}%${R.bonusBp === MAX_BP ? ', 최대' : ''}) = <b>${nf(R.total)}크레딧</b></p>
      <p class="mk-sub mk-r2">${esc(colN)} 평균 ${avg}크레딧(정가 ${nf(avg * W)}원) 기준 <b style="color:var(--n900)">예상 수강 ${nf(R.enrollments)}건 · 약 ${nf(R.people)}명</b>(1인 ${cpp}과정 가정)</p>${err}</div>
      <div class="card mk-sticky" style="display:flex;flex-direction:column;gap:10px"><p class="mk-note">크레딧은 학습자가 과정을 시작할 때 CP 정가대로 차감됩니다. 무제한 이용권이 아닙니다.</p><p class="mk-note">예상 인원은 가정값이며, 실제 수강 과정에 따라 달라집니다.</p><p class="mk-note">AI 사용료는 별도입니다.</p>
      <button class="btn pri lg" style="justify-content:center" data-act="mk-req" ${can ? '' : 'disabled'}>견적 요청</button>${owner() ? `<button class="btn ghost" style="justify-content:center" data-act="mk-confirm" ${can ? '' : 'disabled'}>구매 확정</button>` : ''}
      <small class="mk-sub" style="font-size:12.5px">구매 확정은 정운영자만 할 수 있습니다. 확정하면 세금계산서 발행 대기로 넘어갑니다.</small></div></aside>`;
    const cmp = [10000000, 30000000, 50000000].map(b => [b, planOf({ budget: b, cols: x.cols, cpp, bundle: false, avg })]);
    const tbl = `<div class="card"><div class="ch"><b>예산별 비교</b><small>평균 ${avg}크레딧 과정 기준 · 번들 없음</small></div><div class="tw"><table><thead><tr><th>예산</th><th style="text-align:right">크레딧(+보너스)</th><th style="text-align:right">보너스율</th><th style="text-align:right">예상 수강 건수</th></tr></thead><tbody>${cmp.map(([b, r]) => `<tr${b === R.budget ? ' style="background:var(--gr50)"' : ''}><td><b>${nf(b / 10000)}만 원</b>${b === R.budget ? ' <span class="tag g">지금 입력</span>' : ''}</td><td class="mk-num" style="text-align:right">${nf(r.total)}</td><td class="mk-num" style="text-align:right">${r.bonusBp / 100}%</td><td class="mk-num" style="text-align:right">${nf(r.enrollments)}건</td></tr>`).join('')}</tbody></table></div><p class="mk-note" style="margin-top:10px">보너스: 3,000만 원 미만 0% · 3,000만 원 이상 3% · 플랫폼 번들 또는 5,000만 원 이상 7%(상한)</p></div>`;
    return `<div class="mk-side" style="grid-template-columns:minmax(0,1fr) 400px"><div class="mk">${inp}${tbl}</div>${res}</div>`; }

  /* ── A4 이용 한도 · 사용 현황 ── */
  const noCon = () => `<div class="empty">아직 활성 크레딧 계약이 없습니다. 예산을 넣어 크레딧 패스를 구성하십시오. <button class="btn sm pri" data-act="tab" data-key="market" data-v="build">크레딧 패스 구성하기</button></div>`;
  function vCredit() { const c = contract(); if (!c) return LIVEON() && LV.busy ? '<div class="empty">불러오는 중입니다.</div>' : noCon(); const bal = balOf(c); const um = usedMonth(c); const rq = (c.restoreReq || []).filter(r => r.st === 'asked').length + (c.pre || []).filter(p => p.st === 'asked').length * 0;
    const dleft = dDiff(today(), c.validTo); const renewOn = dleft <= 60;
    const top = `<div class="mk-acts" style="justify-content:flex-end">${owner() ? '<button class="btn pri" data-act="mk-topup">추가 구매하기</button>' : '<small class="mk-sub">추가 구매 · 갱신은 정운영자에게 요청합니다.</small>'}<button class="btn ghost" data-act="mk-renew" ${renewOn ? '' : 'disabled'} title="${renewOn ? '' : '만료 60일 전부터 볼 수 있습니다'}">갱신 견적 보기</button><button class="btn ghost" data-act="mk-use-csv">사용 내역 CSV</button></div>`;
    const dl = c.validTo ? daysTo(c.validTo) : 999; const x2 = dl >= 0 && dl <= 30 && (!UI.mkX2Closed || dl <= 7) ? `<div class="mk-guard warn" role="alert" data-mk="x2"><span class="ic">${icx('clock', 18)}</span><div><b>이용 기간이 ${dl}일 남았습니다. 남은 ${nf(bal)}크레딧은 만료일에 소멸합니다.</b><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${owner() ? '<button class="btn sm pri" data-act="mk-renew">갱신 견적 보기</button>' : ''}<button class="btn sm ghost" data-act="mk-x2-learn">학습자에게 과정 안내하기</button>${dl > 7 ? '<button class="btn sm ghost" data-act="mk-x2-close">닫기</button>' : ''}</div></div></div>` : '';
    const kp = `<div class="kpis">${kpi('남은 이용 한도', nf(bal) + '크레딧', `전체 ${nf(c.total)}크레딧`)}${kpi('이번 달 사용', nf(um.credits) + '크레딧', `수강 ${nf(um.n)}건`)}${kpi('이용 기간 · 갱신 이월 가능', esc(c.validTo), `갱신 시 최대 ${nf(carryPreview(c).credits)}크레딧 이월`)}${kpi('복원 대기', rq + '건', '7일 · 진도 10% 미만')}</div>`;
    const lots = `<div class="card"><div class="ch"><b>크레딧 묶음(로트)</b><small>유효기간이 빠른 묶음부터 씁니다</small></div><div class="tw"><table><thead><tr><th>묶음</th><th style="text-align:right">크레딧</th><th style="text-align:right">남음</th><th>이용 기간 끝</th><th>상태</th></tr></thead><tbody>${(c.wallet || []).map(l => `<tr><td>${esc(l.label)}</td><td class="mk-num" style="text-align:right">${nf(l.credits)}</td><td class="mk-num" style="text-align:right">${nf(l.remain)}</td><td class="mk-num">${esc(l.validTo || l.carryTo || '')}</td><td>${esc(lotState(l))}</td></tr>`).join('')}</tbody></table></div>${owner() ? '<div style="display:flex;justify-content:flex-end;padding:12px 16px 0"><button class="btn sm ghost" data-act="mk-refund">해지 · 환불 요청</button></div>' : ''}</div>`;
    const U = (c.uses || []).slice(0, 50);
    const act = u => u.kind === 'restore' || u.restored ? '<span class="tag b">복원됨</span>' : u.disputed ? '<span class="tag y">이의 신청 중</span>' : canRestore(u) ? `<button class="btn sm ghost" data-act="mk-restore" data-v="${esc(u.id)}">복원 요청</button>` : `<small class="mk-sub">복원 기한 지남 · </small><button class="btn sm ghost" data-act="mk-dispute" data-v="${esc(u.id)}">이의 신청</button>`;
    const uses = `<div class="card"><div class="ch"><b>사용 내역</b><small>학습자는 학번 · 학과만 표시합니다</small></div>${U.length ? `<div class="tw"><table><thead><tr><th>일시</th><th>과정</th><th>CP</th><th style="text-align:right">크레딧</th><th>학습자</th><th></th></tr></thead><tbody>${U.map(u => `<tr data-use="${esc(u.id)}"><td class="mk-num">${esc(u.at)}</td><td>${esc(u.title)}</td><td>${esc(u.cp)}</td><td class="mk-num" style="text-align:right">${u.kind === 'restore' ? '+' : '−'}${nf(u.credits)}</td><td>${esc(u.sid)}${u.dept ? ' · ' + esc(u.dept) : ''}</td><td>${act(u)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">아직 수강 시작 기록이 없습니다. 학습자가 1차시를 재생하면 여기에 쌓입니다.</div>'}</div>`;
    return `${x2}${alertBand(c)}${top}${kp}${lots}${uses}`; }

  /* ── A4 하위: 기관 통제 ── */
  function vCtrl() { const c = contract(); if (!c) return noCon(); const k = c.ctrl || {}; const ro = !(owner() || (santa() && LIVEON()));
    const avg = avgOf(c.cols || k.allowCols || []); const rec = avg * 2;
    const groups = (S.groups || []).map(g => g.name).filter(Boolean).slice(0, 20); const allowG = k.allowGroups || [];
    return `<div class="card"><div class="ch"><b>기관 통제</b><small>${ro ? '정운영자만 바꿀 수 있습니다' : '다음 차감부터 적용합니다. 이미 차감된 수강은 바뀌지 않습니다.'}</small></div><form class="mk-calc" id="mkCtrl">
      <label class="mk-field"><span>1인 월 상한(크레딧, 권장 ${rec} = 평균 ${avg} × 2)</span><input class="mk-inp" name="monthCap" inputmode="numeric" value="${k.monthCap || ''}" ${ro ? 'disabled' : ''}></label>
      <div class="mk-field"><span>허용 컬렉션</span><div class="chips">${cols().map(x => `<label class="chip ${(k.allowCols || []).includes(x.id) ? 'on' : ''}"><input type="checkbox" name="allowCols" value="${esc(x.id)}" ${(k.allowCols || []).includes(x.id) ? 'checked' : ''} ${ro ? 'disabled' : ''}> ${esc(x.title)}</label>`).join('')}</div></div>
      <div class="mk-field"><span>허용 학과 · 소속(비우면 전체)</span><div class="chips">${groups.length ? groups.map(g => `<label class="chip ${allowG.includes(g) ? 'on' : ''}"><input type="checkbox" name="allowGroups" value="${esc(g)}" ${allowG.includes(g) ? 'checked' : ''} ${ro ? 'disabled' : ''}> ${esc(g)}</label>`).join('') : '<small class="mk-sub">등록된 소속이 없습니다. 전체 학습자가 이용합니다.</small>'}</div></div>
      <label class="mk-field"><span>사전 승인 기준(크레딧 이상이면 승인 필요, 권장 80)</span><input class="mk-inp" name="preFrom" inputmode="numeric" value="${k.preFrom || ''}" ${ro ? 'disabled' : ''}></label>
      <label class="mk-field"><span>이용 한도 경보(20% · 10%) 수신자</span><input class="mk-inp" name="alertTo" value="${esc(k.alertTo || '')}" maxlength="60" ${ro ? 'disabled' : ''}></label>
      ${ro ? '' : '<div class="mk-acts"><button class="btn pri" data-act="mk-ctrl-save">저장</button></div>'}</form></div>`; }

  /* ── A4 하위: 사전 승인 · 복원 요청 ── */
  function vApprove() { const c = contract(); if (!c) return noCon(); const P = (c.pre || []).filter(p => p.st === 'asked'); const R = (c.restoreReq || []).filter(r => r.st === 'asked'); const useOf = id => (c.uses || []).find(u => u.id === id) || {};
    return `<div class="card"><div class="ch"><b>사전 승인 요청</b><small>사전 승인 기준 ${nf((c.ctrl || {}).preFrom || 0)}크레딧 이상 과정</small></div>${P.length ? `<div class="tw"><table><thead><tr><th>요청일</th><th>학습자</th><th>과정</th><th style="text-align:right">크레딧</th><th></th></tr></thead><tbody>${P.map(p => `<tr><td class="mk-num">${esc(String(p.at).slice(0, 16))}</td><td>${esc(p.sid)}${p.dept ? ' · ' + esc(p.dept) : ''}</td><td>${esc(p.title)}</td><td class="mk-num" style="text-align:right">${nf(p.credits)}</td><td><button class="btn sm pri" data-act="mk-ok" data-v="${esc(p.id)}" data-ok="1">승인</button> <button class="btn sm ghost" data-act="mk-ok" data-v="${esc(p.id)}" data-ok="0">거절</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">처리할 사전 승인 요청이 없습니다.</div>'}</div>
      <div class="card"><div class="ch"><b>복원 요청</b><small>차감 후 7일 이내 · 진도 10% 미만이면 복원합니다</small></div>${R.length ? `<div class="tw"><table><thead><tr><th>요청일</th><th>과정</th><th>학습자</th><th>사유</th><th></th></tr></thead><tbody>${R.map(r => { const u = useOf(r.use); return `<tr><td class="mk-num">${esc(String(r.at).slice(0, 16))}</td><td>${esc(u.title || '')}</td><td>${esc(u.sid || '')}${u.dept ? ' · ' + esc(u.dept) : ''}</td><td>${esc(r.reason || '')}</td><td>${u.id && canRestore(u) ? `<button class="btn sm pri" data-act="mk-restore" data-v="${esc(u.id)}" data-rq="${esc(r.id)}">복원하기</button>` : `<small class="mk-sub">복원 기한 지남 · </small><button class="btn sm ghost" data-act="mk-dispute" data-v="${esc(u.id || '')}" data-rq="${esc(r.id)}">이의 신청</button>`}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">처리할 복원 요청이 없습니다.</div>'}</div>`; }

  /* ── 장바구니 · 견적(개별 임대) ── */
  function vCart() { const D = M(); const cart = LIVEON() ? ((LV.d.cart && LV.d.cart.items) || []).map(x => ({ id: x.productId || x.id, title: x.title || '', seats: +x.seats || 0 })) : D.cart; const Q = LIVEON() ? ((LV.d.quotes && LV.d.quotes.items) || []) : D.quotes;
    const QST = { requested: ['요청됨', 'y'], draft: ['작성 중', 'y'], cp_wait: ['CP 확인 중', 'y'], sent: ['발행', 'g'], active: ['계약 중', 'g'], pending_pay: ['세금계산서 발행 대기', 'b'], expired: ['만료', ''] };
    return `<div class="card"><div class="ch"><b>장바구니(개별 임대)</b><small>개별 판매 전용 상품은 견적으로 구매합니다</small></div>${cart.length ? `<div class="tw"><table><thead><tr><th>상품</th><th style="text-align:right">좌석</th><th></th></tr></thead><tbody>${cart.map(x => `<tr><td>${esc(x.title)}</td><td style="text-align:right"><input class="mk-inp" style="width:90px" inputmode="numeric" data-chg="mk-seats" data-v="${esc(x.id)}" value="${x.seats || ''}" aria-label="${esc(x.title)} 좌석"></td><td><button class="btn sm ghost" data-act="mk-cart-del" data-v="${esc(x.id)}">빼기</button></td></tr>`).join('')}</tbody></table></div><div class="mk-acts"><button class="btn pri" data-act="mk-quote-pdf">견적 요청</button></div>` : '<div class="empty">담은 상품이 없습니다. 마켓 홈에서 [개별 임대 포함]을 누르면 개별 판매 상품을 볼 수 있습니다.</div>'}</div>
      <div class="card"><div class="ch"><b>견적 · 계약</b><small>견적서는 30일간 유효합니다 · 금액은 부가세 별도</small></div>${Q.length ? `<div class="tw"><table><thead><tr><th>견적</th><th style="text-align:right">금액</th><th>상태</th><th>요청일</th></tr></thead><tbody>${Q.map(q => { const s = QST[q.status] || [q.status, '']; return `<tr><td><b>${esc(q.id)}</b><br><small class="mk-sub">${esc(q.title || '')}</small></td><td class="mk-num" style="text-align:right">${q.amount ? won(q.amount) : '-'}</td><td><span class="tag ${s[1]}">${esc(s[0])}</span></td><td class="mk-num">${esc(String(q.at || q.createdAt || '').slice(0, 10))}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">아직 견적이 없습니다.</div>'}</div>`; }

  function viewMarket() { ensure(); const tab = curTab(); if (LIVEON()) { try { livePull(tab); } catch (e) { console.error('market live', e); } }
    if (!pilot()) return '<div class="empty">이 기관은 콘텐츠 마켓 시범 대상이 아닙니다.</div>';
    const warn = LIVEON() && LV.err ? `<div class="mk-guard" role="alert"><div><b>${esc(LV.err)}</b></div></div>` : '';
    const ro = teacher() ? '<p class="mk-sub">교수자 권한에서는 크레딧 · 가격 · 계약 정보를 보여 주지 않습니다.</p>' : '';
    let body = ''; try { body = ({ home: vHome, item: vItem, build: vBuild, credit: vCredit, ctrl: vCtrl, approve: vApprove, cart: vCart })[tab](); } catch (e) { console.error('market view', e); body = `<div class="empty">화면을 그리지 못했습니다: ${esc(errMsg(e, '잠시 뒤 다시 시도하십시오.'))}</div>`; }
    const right = teacher() ? '' : tab === 'build' ? '' : '<button class="btn pri" data-act="tab" data-key="market" data-v="build">크레딧 패스 구성하기</button>';
    return `${head('콘텐츠 마켓', teacher() ? '우리 기관 패스에 들어 있는 검수된 CP 과정을 둘러보고 과정에 넣습니다.' : '크레딧형 콘텐츠 패스로 검수된 CP 과정을 이용합니다. 1크레딧 = 1,000원(부가세 별도).', right)}${subtabs(tab === 'item' ? 'home' : tab)}<div class="mk" data-mk-tab="${tab}">${warn}${ro}${body}</div>`; }
  VIEWS.market = viewMarket;

  /* ── 동작(ACT, 모두 mk- 접두사) ── */
  const cur = () => contract();
  ACT['mk-tab'] = el => { UI.market = el.dataset.v; render(); };
  ACT['mk-adinfo'] = () => { modal('광고 안내', `<p class="mk-adtx" style="margin:0">${MK_AD.A3}</p>`, [{ id: 'ok', label: '확인', kind: 'pri' }]); };
  ACT['mk-open'] = el => { UI.mkItem = el.dataset.v; UI.market = 'item'; render(); window.scrollTo(0, 0); };
  ACT['mk-col-go'] = el => { const c = calcIn(); c.cols = [el.dataset.v]; UI.market = 'build'; render(); };
  ACT['mk-filter'] = el => { UI.mkSingle = el.dataset.v === 'single'; LV.key = ''; render(); };
  ACT['mk-q'] = el => { UI.mkQ = el.value; LV.key = ''; render(); };
  ACT['mk-search'] = () => { const i = document.querySelector('.mk-search input'); if (i) UI.mkQ = i.value; LV.key = ''; render(); };
  ACT['mk-preview'] = () => toast('미리보기(90초)는 크레딧을 차감하지 않습니다. 운영 서버의 CP 원본 서명 링크로 재생합니다.');
  ACT['mk-put'] = el => { const p = prods().find(x => x.id === el.dataset.v); if (!p) return; if (p.optin !== 'credit') return toast('개별 판매 전용 상품은 견적으로 구매한 뒤 넣을 수 있습니다.', 'warn');
    try { if (window.CLIB && typeof CLIB.add === 'function') { CLIB.add({ type: 'video', src: 'market', title: p.title, mk: { prod: p.id, lic: p.lic, pass: true, credits: credOf(p) } }); } } catch (e) { console.error(e); }
    if (typeof logAudit === 'function') logAudit(`콘텐츠 마켓: 「${p.title}」 과정에 넣기(크레딧 패스)`); save(); toast(`「${p.title}」을 콘텐츠 보관함에 넣었습니다. 과정 차시에 연결하십시오.`, 'ok'); };
  ACT['mk-cart-add'] = el => { const p = prods().find(x => x.id === el.dataset.v); if (!p) return; if (LIVEON()) return liveDo('POST', '/api/market/cart', { productId: p.id, seats: 0, idem: idem() }, () => toast('장바구니에 담았습니다.', 'ok')).catch(() => { });
    const D = M(); if (!D.cart.some(x => x.id === p.id)) D.cart.push({ id: p.id, title: p.title, seats: 0 }); save(); toast('장바구니에 담았습니다.', 'ok'); render(); };
  ACT['mk-cart-del'] = el => { if (LIVEON()) return liveDo('DELETE', '/api/market/cart/' + encodeURIComponent(el.dataset.v)).catch(() => { }); const D = M(); D.cart = D.cart.filter(x => x.id !== el.dataset.v); save(); render(); };
  ACT['mk-seats'] = el => { const D = M(); const x = D.cart.find(y => y.id === el.dataset.v); if (x) { x.seats = Math.max(0, parseInt(String(el.value).replace(/\D/g, ''), 10) || 0); save(); } };
  ACT['mk-quote-pdf'] = el => { const D = M(); const one = el.dataset.v && prods().find(x => x.id === el.dataset.v); const lines = one ? [{ productId: one.id, seats: 0 }] : D.cart.map(x => ({ productId: x.id, seats: x.seats }));
    if (!lines.length) return toast('견적을 만들 상품을 먼저 담으십시오.', 'warn');
    if (LIVEON()) return liveDo('POST', '/api/market/quotes', { kind: 'single', lines, idem: idem() }, r => { const q = r && r.quote; toast(q && q.status === 'cp_wait' ? '최저가 미만 요청이라 CP 승인을 기다립니다.' : '견적을 만들었습니다. [장바구니 · 견적]에서 PDF를 받을 수 있습니다.', 'ok'); UI.market = 'cart'; }).catch(() => { });
    D.quotes.unshift({ id: 'Q-' + today().slice(2, 4) + today().slice(5, 7) + '-' + String(D.quotes.length + 15).padStart(3, '0'), kind: 'single', title: (one ? one.title : D.cart.map(x => x.title).join(', ')).slice(0, 60), amount: 0, status: 'cp_wait', at: today() });
    if (typeof logAudit === 'function') logAudit('콘텐츠 마켓: 개별 임대 견적 요청'); save(); toast('개별 임대 견적을 요청했습니다. CP 확인 뒤 금액이 정해집니다.', 'ok'); UI.market = 'cart'; render(); };
  /* A3 계산 */
  const numIn = v => Math.max(0, Math.round(+String(v == null ? '' : v).replace(/[^\d.]/g, '') || 0));
  ACT['mk-calc'] = el => { const c = calcIn(); if (el.dataset.v === 'people') { c.people = c.people == null ? 457 : c.people; c.budget = null; } else { c.budget = c.budget || 30000000; c.people = null; } render(); };
  ACT['mk-calc-in'] = el => { const c = calcIn(); if (el.name === 'people') { c.people = numIn(el.value); c.budget = null; } else { c.budget = numIn(el.value); c.people = null; } render(); };
  ACT['mk-col'] = el => { const c = calcIn(); const v = el.dataset.v; c.cols = c.cols.includes(v) ? c.cols.filter(x => x !== v) : [...c.cols, v]; if (!c.cols.length) c.cols = [v]; render(); };
  ACT['mk-assume'] = el => { const c = calcIn(); const v = +String(el.value).replace(/[^\d.]/g, ''); c.cpp = v > 0 ? Math.min(10, Math.round(v * 10) / 10) : defCpp(); render(); };
  ACT['mk-bundle'] = () => { const c = calcIn(); c.bundle = !c.bundle; render(); };
  ACT['mk-proxy'] = () => { UI.mkProxy = !UI.mkProxy; if (!UI.mkProxy) calcIn().bonusBp = null; render(); };
  ACT['mk-bonus'] = el => { const s = String(el.value).trim(); calcIn().bonusBp = s === '' ? null : Math.round(+s.replace(/[^\d.]/g, '') * 100); render(); };
  const calcBody = () => { const x = calcIn(); const R = planOf(x); return { R, body: { budget: R.budget, people: x.people || undefined, collections: x.cols, coursesPerPerson: x.cpp, bundle: !!x.bundle } }; };
  ACT['mk-req'] = () => { const { R, body } = calcBody(); if (!R.ok) return toast(ERRN[R.err || (R.bonusOver ? 'mk_bonus_max' : 'mk_margin')] || '계산 결과를 확인하십시오.', 'warn');
    if (LIVEON()) return liveDo('POST', '/api/market/quotes', { kind: 'credit', input: body, bonusBp: UI.mkProxy ? R.bonusBp : undefined, idem: idem() }, () => { toast('크레딧 패스 견적을 요청했습니다.', 'ok'); UI.market = 'cart'; }).catch(() => { });
    const D = M(); D.quotes.unshift({ id: 'Q-' + today().slice(2, 4) + today().slice(5, 7) + '-' + String(D.quotes.length + 15).padStart(3, '0'), kind: 'credit', title: `크레딧 패스 ${nf(R.budget / 10000)}만 원 · ${nf(R.total)}크레딧`, amount: R.budget, status: 'requested', at: today(), plan: R });
    if (typeof logAudit === 'function') logAudit(`콘텐츠 마켓: 크레딧 패스 견적 요청 ${won(R.budget)}`); save(); toast('크레딧 패스 견적을 요청했습니다. [장바구니 · 견적]에서 볼 수 있습니다.', 'ok'); UI.market = 'cart'; render(); };
  ACT['mk-confirm'] = () => { if (!owner()) return toast('구매 확정은 정운영자만 할 수 있습니다.', 'warn'); const { R, body } = calcBody(); if (!R.ok) return toast(ERRN[R.err || (R.bonusOver ? 'mk_bonus_max' : 'mk_margin')] || '계산 결과를 확인하십시오.', 'warn');
    const start = ymdL(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)); const V = MC('validity')(start);
    const mode0 = (UI.mkCalc && UI.mkCalc.mode) || (isPublicOrg() ? 'public_license' : 'general');
    const mw = modal('콘텐츠 패스(연간 이용권) 구매 확정', `<p>아래 내용으로 계약을 만듭니다. ${MK_TERMS.T1}</p><ul class="mk-dl"><li>구매액 <b>${won(R.budget)}</b>(부가세 별도)</li><li>크레딧 <b>${nf(R.credits)} + 보너스 ${nf(R.bonusCredits)} = ${nf(R.total)}</b></li><li>연간 이용권 <b>${won(R.budget)}</b>(이용 한도 ${nf(R.total)}크레딧, 이용 기간 ${start.replace(/-/g, '.')}~${V.validTo.replace(/-/g, '.')} · 갱신 시 최대 20% 이월)</li><li>크레딧은 학습자가 과정을 시작할 때 CP 정가대로 차감됩니다. 무제한 이용권이 아닙니다.</li></ul>${termsHTML(mode0)}`,
      [{ id: 'no', label: '취소' }, { id: 'ok', label: '구매 확정', kind: 'pri', run: w => { if (!fv(w, 'mkAgree') || !fv(w, 'mkLapse')) { toast('이용 조건과 미사용 한도 소멸 조항에 동의해야 구매를 확정할 수 있습니다.', 'warn'); return false; } const mode = (w.querySelector('[name=mkMode]') || {}).value || 'general';
        if (LIVEON()) { api('POST', '/api/market/quotes', { kind: 'credit', input: body, idem: idem() }).then(r => api('POST', '/api/market/contracts', { quoteId: r.quote && r.quote.id, start, terms: MK_TERMS.ver, lapseAck: true, buyerMode: mode, idem: idem() })).then(() => { LV.key = ''; toast('구매를 확정했습니다. 세금계산서 발행 대기 상태입니다.', 'ok'); UI.market = 'cart'; render(); }).catch(e => toast(errOf(e), 'warn')); return; }
        const D = M(); D.quotes.unshift({ id: 'C-' + today().replace(/-/g, '').slice(2) + '-' + String(D.quotes.length + 1).padStart(2, '0'), kind: 'credit', title: `크레딧 패스 계약 ${nf(R.total)}크레딧`, amount: R.budget, status: 'pending_pay', at: today(), plan: R, start, terms: { ver: MK_TERMS.ver, at: new Date().toISOString(), by: (S.me && S.me.email) || '', lapseAck: true }, buyerMode: mode });
        if (typeof logAudit === 'function') logAudit(`콘텐츠 마켓: 크레딧 패스 구매 확정 ${won(R.budget)} — 세금계산서 발행 대기`); save(); toast('구매를 확정했습니다. 세금계산서 발행 대기 상태입니다.', 'ok'); UI.market = 'cart'; render(); } }]); termsGate(mw); };
  /* A4 동작 */
  ACT['mk-topup'] = () => { if (!owner()) return toast('추가 구매는 정운영자만 할 수 있습니다.', 'warn'); const c = cur(); if (!c) return;
    const tw = modal('크레딧 추가 구매', `<p>추가 구매분은 견적으로 만들어지며, 세금계산서 발행 · 입금 확인 뒤 들어옵니다.</p><label class="mk-field"><span>추가 구매액(원, 부가세 별도)</span><input class="mk-inp" name="amt" inputmode="numeric" value="5,000,000"></label>${termsHTML(c.buyerMode || 'general', true)}`,
      [{ id: 'no', label: '취소' }, { id: 'ok', label: '견적 만들기', kind: 'pri', run: w => { if (!fv(w, 'mkAgree') || !fv(w, 'mkLapse')) { toast('이용 조건과 미사용 한도 소멸 조항에 동의해야 구매를 확정할 수 있습니다.', 'warn'); return false; } const amount = numIn(w.querySelector('[name=amt]').value); if (amount < 1000000) { toast('추가 구매는 100만 원부터 할 수 있습니다.', 'warn'); return false; }
        if (LIVEON()) { liveDo('POST', `/api/market/contracts/${encodeURIComponent(c.id)}/topup`, { amount, terms: MK_TERMS.ver, lapseAck: true, idem: idem() }, () => { toast('추가 구매 견적을 만들었습니다.', 'ok'); UI.market = 'cart'; }).catch(() => { }); return; }
        const D = M(); D.quotes.unshift({ id: 'Q-' + today().slice(2, 4) + today().slice(5, 7) + '-' + String(D.quotes.length + 15).padStart(3, '0'), kind: 'credit', title: `추가 구매 ${nf(Math.floor(amount / W))}크레딧`, amount, status: 'requested', at: today() }); save(); toast('추가 구매 견적을 만들었습니다.', 'ok'); UI.market = 'cart'; render(); } }]); termsGate(tw); };
  ACT['mk-refund'] = () => { if (!owner()) return toast('해지 · 환불 요청은 정운영자만 할 수 있습니다.', 'warn'); const c = cur(); if (!c) return; const x = refundIn(c); const R = MC('refundOf')(x.lots, today(), x.o);
    const mw = modal('해지 · 환불 요청', `<p>요청하면 산타가 확인한 뒤 환불하고 수정세금계산서를 발행합니다. 아래 금액은 오늘 기준 예상입니다.</p><ul class="mk-dl"><li>계산 방식 <b>${esc(REFUND_MODE[R.mode] || R.mode)}</b></li><li>남은 유료 한도 <b>${nf(R.paidUnused)}크레딧</b> · 사용한 보너스 ${nf(R.bonusUsed)}크레딧</li><li>위약금 ${won(R.penalty)}</li><li>예상 환불액 <b>${won(R.amount)}</b>(부가세 별도)</li></ul>${termsBox(c.buyerMode || 'general')}<label class="mk-field"><span>사유(필수)</span><input class="mk-inp" name="r" maxlength="300"></label>`,
      [{ id: 'no', label: '취소' }, { id: 'ok', label: '요청하기', kind: 'pri', run: w => { const reason = fv(w, 'r'); if (!reason) { toast('사유를 입력하십시오.', 'warn'); return false; }
        if (LIVEON()) { liveDo('POST', `/api/market/contracts/${encodeURIComponent(c.id)}/refund`, { reason, idem: idem() }, () => toast('해지 · 환불을 요청했습니다.', 'ok')).catch(() => { }); return; }
        c.refund = { rule: 'mk-refund-v2', cause: 'buyer', ...R, reason, status: 'requested', at: new Date().toISOString() }; save(); toast('해지 · 환불을 요청했습니다.', 'ok'); render(); } }]); return mw; };
  ACT['mk-x2-close'] = () => { UI.mkX2Closed = 1; render(); };
  ACT['mk-x2-learn'] = () => { if (typeof go === 'function') { toast('학습자 공지 화면에서 패스 과정을 안내하십시오. 남은 이용 한도는 만료일에 소멸합니다.'); } };
  ACT['mk-renew'] = () => { const c = cur(); if (!c) return; const x = calcIn(); x.budget = c.amount || 30000000; x.people = null; x.bundle = (c.bonusBp || 0) >= 700; UI.market = 'build'; render(); toast('갱신 견적을 같은 조건으로 계산했습니다. 남은 크레딧은 1년 이월됩니다.'); };
  ACT['mk-use-csv'] = () => { const c = cur(); if (!c) return; downloadCSV(`크레딧_사용내역_${today()}.csv`, ['일시', '과정', 'CP', '크레딧', '학번', '학과', '구분'], (c.uses || []).map(u => [u.at, u.title, u.cp, (u.kind === 'restore' ? '' : '-') + u.credits, u.sid, u.dept, u.kind === 'restore' || u.restored ? '복원' : '차감'])); };
  ACT['mk-restore'] = el => { const c = cur(); if (!c) return; const u = (c.uses || []).find(x => x.id === el.dataset.v); if (!u) return; const rq = el.dataset.rq;
    modal('크레딧 복원', `<p>「${esc(u.title)}」 ${esc(u.sid)} 수강의 ${nf(u.credits)}크레딧을 되돌립니다. 학습자의 이 과정 이용은 끝납니다.</p><label class="mk-field"><span>사유(필수)</span><input class="mk-inp" name="r" maxlength="80" value="${esc(rq ? ((c.restoreReq || []).find(r => r.id === rq) || {}).reason || '' : '')}"></label>`,
      [{ id: 'no', label: '취소' }, { id: 'ok', label: '복원하기', kind: 'pri', run: w => { const reason = w.querySelector('[name=r]').value.trim(); if (!reason) { toast('사유를 입력하십시오.', 'warn'); return false; }
        if (LIVEON()) { liveDo('POST', `/api/market/contracts/${encodeURIComponent(c.id)}/restore`, { useId: u.id, reason, idem: idem() }, () => toast('크레딧을 복원했습니다.', 'ok')).catch(() => { }); return; }
        if (!canRestore(u)) { toast(ERRN.mk_restore_window, 'warn'); return; }
        const lot = (c.wallet || []).find(l => l.lot === 'buy') || c.wallet[0]; lot.remain += u.credits; u.restored = true; c.uses.unshift({ id: id8('mu_'), at: nowStr(), prod: u.prod, title: u.title, cp: u.cp, credits: u.credits, sid: u.sid, dept: u.dept, kind: 'restore', of: u.id, reason });
        (c.restoreReq || []).forEach(r => { if (r.use === u.id) r.st = 'done'; }); if (typeof logAudit === 'function') logAudit(`콘텐츠 마켓: 크레딧 복원 ${u.credits} — ${reason}`); save(); toast('크레딧을 복원했습니다.', 'ok'); render(); } }]); };
  ACT['mk-dispute'] = el => { const c = cur(); if (!c) return; const u = (c.uses || []).find(x => x.id === el.dataset.v);
    modal('이의 신청', `<p>복원 기한(차감 후 7일 · 진도 10% 미만)이 지난 건입니다. 산타 운영에 판정을 요청합니다.</p><label class="mk-field"><span>사유(필수)</span><input class="mk-inp" name="r" maxlength="120"></label>`,
      [{ id: 'no', label: '취소' }, { id: 'ok', label: '이의 신청', kind: 'pri', run: w => { const reason = w.querySelector('[name=r]').value.trim(); if (!reason) { toast('사유를 입력하십시오.', 'warn'); return false; }
        if (LIVEON()) { liveDo('POST', `/api/market/contracts/${encodeURIComponent(c.id)}/disputes`, { useId: u && u.id, reason, idem: idem() }, () => toast('이의 신청을 보냈습니다. 산타 운영이 판정합니다.', 'ok')).catch(() => { }); return; }
        if (u) u.disputed = true; (c.restoreReq || []).forEach(r => { if (u && r.use === u.id) r.st = 'disputed'; }); save(); toast('이의 신청을 보냈습니다. 산타 운영이 판정합니다.', 'ok'); render(); } }]); };
  ACT['mk-ok'] = el => { const c = cur(); if (!c) return; const ok = el.dataset.ok === '1'; const p = (c.pre || []).find(x => x.id === el.dataset.v); if (!p) return;
    if (LIVEON()) return liveDo('POST', `/api/market/contracts/${encodeURIComponent(c.id)}/preapprovals/${encodeURIComponent(p.id)}/decide`, { ok, memo: '' }, () => toast(ok ? '승인했습니다. 학습자에게 알림이 갑니다.' : '거절했습니다.', 'ok')).catch(() => { });
    p.st = ok ? 'ok' : 'no'; p.decidedAt = nowStr(); if (typeof logAudit === 'function') logAudit(`콘텐츠 마켓: 사전 승인 ${ok ? '승인' : '거절'} — ${p.title}`); save(); toast(ok ? '승인했습니다. 학습자에게 알림이 갑니다.' : '거절했습니다.', 'ok'); render(); };
  ACT['mk-ctrl-save'] = () => { if (!(owner() || santa())) return toast('기관 통제는 정운영자만 바꿀 수 있습니다.', 'warn'); const c = cur(); const f = document.getElementById('mkCtrl'); if (!c || !f) return;
    const v = { monthCap: numIn(f.monthCap.value), preFrom: numIn(f.preFrom.value), allowCols: [...f.querySelectorAll('[name=allowCols]:checked')].map(i => i.value), allowGroups: [...f.querySelectorAll('[name=allowGroups]:checked')].map(i => i.value), alertBp: [2000, 1000], alertTo: f.alertTo.value.trim().slice(0, 60) };
    if (!v.allowCols.length) return toast('허용 컬렉션을 하나 이상 고르십시오.', 'warn');
    modal('기관 통제 저장', '<p>다음 차감부터 적용합니다. 이미 차감된 수강은 바뀌지 않습니다.</p>', [{ id: 'no', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: () => {
      if (LIVEON()) { liveDo('PUT', `/api/market/contracts/${encodeURIComponent(c.id)}/controls`, v, () => toast('기관 통제를 저장했습니다.', 'ok')).catch(() => { }); return; }
      c.ctrl = { ...c.ctrl, ...v }; if (typeof logAudit === 'function') logAudit(`콘텐츠 마켓: 기관 통제 변경(월 상한 ${v.monthCap} · 사전 승인 ${v.preFrom})`); save(); toast('기관 통제를 저장했습니다.', 'ok'); render(); } }]); };
  /* A10에서 넘어오는 값(mksam.js) */
  window.mkOpenBuilder = x => { const c = calcIn(); Object.assign(c, { budget: x.budget != null ? x.budget : c.budget, people: x.budget != null ? null : (x.people != null ? x.people : c.people), cols: x.collections && x.collections.length ? x.collections : c.cols, cpp: x.coursesPerPerson || c.cpp, bundle: !!x.bundle }); UI.market = 'build'; go('market'); };
  window.mkPlan = x => planOf({ budget: x.budget, people: x.people, cols: x.collections && x.collections.length ? x.collections : defCols(), cpp: x.coursesPerPerson || defCpp(), bundle: !!x.bundle, avg: x.avgCredits });
  window.mkCols = () => cols();
})();
