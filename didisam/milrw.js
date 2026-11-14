/* v42 학습 마일리지 — 스튜디오 「보상」 쪽(요원 R). 03-plan §3 · §7.1, 04-data-api §2 · §5 · §6, 시안 a1(06~08) · a3(03 · 04 · 06 · 06b).
   탭 3개를 마일리지 메뉴(mil.js, 요원 S)의 탭 목록에 끼운다: window.MIL_TABS.push({ id, label, render, badge, order }).
     rewards   보상 카탈로그(학원비 차감 · 쿠폰 · 굿즈 · 배지 · 인증서 · 리워드 숍, 교환 규칙 + 권장값, 국비 과정 자물쇠)
               기업(corp)은 「리워드 숍」 켜기(과세 안내 G 확인 시트) · 「지급 내역」(1인별 지급액 내보내기)
     approvals 신청 · 승인(AI 확인할 점, 확인 카드, 1인 월 한도 중복은 경고만, 보호자 확인 전 승인 불가, 붙일 청구서 미리보기)
     fraud     부정 의심(보류 → 운영자 확정, 자동 취소 없음)
   시연판: 브라우저 문서 S.milrw(아래 ensure). 운영: /api/mileage/*(04 §5)가 주인이고 문서에는 아무것도 싣지 않는다.
   학원비 차감 이행 = v41 원장(S.ledger.charges)에 「마일리지 차감」 음수 줄(itemType 'etc', srcType 'mileage', srcId = 신청 번호). 정가 줄은 건드리지 않는다.
   지급 · 차감 · 반려 · 회수 · 켜기 · 보내기는 모두 확인 카드 뒤 실행. 운영자 합니다체. 주 버튼 바탕 #00862D는 이 화면 안(.mrw · .mrw-m)에서만. */
(function () {
  'use strict';
  if (typeof MENU === 'undefined' || typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;
  const LIVEON = () => typeof LIVE !== 'undefined' && LIVE && LIVE.tenant && typeof api === 'function';
  const TABS = window.MIL_TABS = window.MIL_TABS || [];
  const idem = () => 'ui_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const id8 = p => p + Math.random().toString(36).slice(2, 10);
  const n0 = v => (Number(v) || 0).toLocaleString('ko-KR');
  const ym0 = () => today().slice(0, 7);
  const ymAdd = (ym, k) => { const [y, m] = ym.split('-').map(Number); const t = new Date(y, m - 1 + k, 1); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };
  const ymTxt = ym => `${ym.slice(0, 4)}년 ${+ym.slice(5, 7)}월`;
  const md = d => { const s = String(d || ''); return s.length >= 10 ? `${+s.slice(5, 7)}월 ${+s.slice(8, 10)}일` : s; };
  const hashS = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ('0000000' + (h >>> 0).toString(16)).slice(-8); };
  const role = () => (S && S.me && S.me.role) || 'owner';
  const canDecide = () => role() === 'owner' || role() === 'sub';
  const isOwner = () => role() === 'owner';
  const orgType = () => (S && S.org && S.org.type) || 'adult';
  const minorOrg = () => orgType() === 'k12';

  Object.assign(IC, {
    mrwReceipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    mrwTicket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12"/>',
    mrwBox: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    mrwMedal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 10.5 6 3h4l2 5 2-5h4l-2.5 7.5"/>',
    mrwSeal: '<path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z"/><path d="m9 11 2 2 4-4"/>',
    mrwShop: '<path d="M4 9h16l-1 11H5z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>',
    mrwLock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    mrwLockOpen: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    mrwWarn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    mrwPause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    mrwShield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/>',
    mrwParent: '<circle cx="9" cy="7" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="10" r="2"/><path d="M15 20a4 4 0 0 1 6-3.5"/>',
    mrwWand: '<path d="m4 20 12-12M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.6 1.2 1.2.6-1.2.6L19 14.6l-.6-1.2-1.2-.6 1.2-.6z"/>',
    mrwTax: '<path d="M5 3h14v18H5z"/><path d="M9 8h6M9 12l6 4M15 12l-6 4"/>',
    mrwPlus: '<path d="M12 5v14M5 12h14"/>'
  });

  /* ── 용어 · 권장값(03 §3.2, 결정: 점수형 표기 · 원 환산은 학원비 차감만) ── */
  const KIND = { tuition: ['학원비 차감', 'mrwReceipt'], coupon: ['수강권 · 쿠폰', 'mrwTicket'], goods: ['굿즈 · 사은품', 'mrwBox'], badge: ['배지', 'mrwMedal'], cert: ['인증서', 'mrwSeal'], shop: ['리워드 숍', 'mrwShop'] };
  const KIND_DESC = { tuition: '수납 원장에 「마일리지 차감」 음수 줄로 연결됩니다.', coupon: '쿠폰 계산 규칙(정액 · 정률 · 기한)이 자동으로 채워집니다.', goods: '재고 · 수령 기록만 남깁니다. 배송 주소는 받지 않습니다.', badge: '배지 수여와 연결됩니다. 금전 가치가 없습니다.', cert: '수료증 키트(인증서 번호)와 연결됩니다. 금전 가치가 없습니다.', shop: '상품권 · 이용권 지급 기록과 1인별 지급액 내보내기가 연결됩니다.' };
  const CASH = { tuition: true, coupon: true, goods: true, shop: true, badge: false, cert: false };
  const REC = { minUse: 1000, step: 100, billPct: 30, perMonth: 1, trust: 'A · B' };
  const APPR = { auto: '자동', manual: '운영자 확인', guardian: '보호자 확인 → 운영자 확인', two_step: '담당 → 기관 2단계' };
  const kindsFor = t => t === 'corp' ? ['badge', 'cert', 'shop'] : t === 'voc' ? ['badge', 'cert', 'goods'] : t === 'univ' ? ['goods', 'badge', 'cert'] : t === 'public' ? ['goods', 'badge', 'cert'] : ['tuition', 'coupon', 'goods', 'badge', 'cert'];
  const unitAb = () => { const p = S && S.mileage && (S.mileage.policy || S.mileage); return (p && (p.unitAb || p.unit_ab || p.ab)) || 'P'; };
  const P = v => `${n0(v)}${unitAb()}`;
  const NOTICE = {
    A: '차감은 청구서에 정가와 ‘마일리지 차감’ 줄로 따로 표시됩니다. 환불은 실제로 낸 금액을 기준으로 계산하고, 차감에 쓴 마일리지는 환불 비율만큼 마일리지로 돌려드립니다. 차감 상한과 유효기간은 기관에서 정해 주세요(권장: 청구서 1건의 30%, 12개월).',
    B: '학습자가 미성년이므로 차감은 보호자 확인 후 적용하고, 적립 · 소멸 알림을 보호자에게도 보내는 것을 권장합니다.',
    C: '공공 예산으로 금품을 지급하려면 조례나 내규 등 지급 근거가 필요할 수 있습니다. 근거 규정 이름과 1인 연간 상한, 총예산을 적어 두시면 보고서에 함께 표시됩니다.',
    D: '평생교육이용권 · 국비 지원금으로 낸 수강료는 차감 대상에서 제외됩니다.',
    G: '학습 보상으로 지급한 상품권 · 포인트는 근로소득으로 과세될 수 있습니다. 1인별 지급액을 급여 담당자에게 보내 주세요(내보내기 제공).',
    FUND_OP: '국비 지원 과정(내일배움카드 · 사업주훈련 지원)은 금전성 보상을 쓸 수 없습니다. 기관 설정으로 풀 수 없는 제품 고정 항목입니다.',
    NOT_KPI: '러닝 포인트는 학습 참여 기록입니다. 인사 · 성과 평가 지표로 쓰지 않으며, 리포트와 학습자 화면에 같은 고지를 표시합니다.'
  };
  const ERRN = { funded_blocked: '국비 지원 과정에는 금전성 보상을 연결할 수 없습니다(제품 고정).', over_tuition: '정가 줄이 등록 교습비를 넘습니다. 청구서를 확인해 주십시오.', insufficient: '쓸 수 있는 마일리지가 부족합니다.', out_of_stock: '재고가 없습니다.', negative_balance: '마일리지 잔액이 음수인 학습자입니다. 다음 적립으로 채운 뒤 처리할 수 있습니다.', already: '이미 처리된 신청입니다.', ack_required: '안내 확인과 사유가 필요합니다.', self_grant: '운영자 본인 계정에는 지급할 수 없습니다.', mile_off: '마일리지 제도가 꺼져 있습니다.', bill_pct: '청구서 차감 상한을 넘습니다.', bill_paid: '이미 수납이 시작된 청구서에는 차감 줄을 붙일 수 없습니다.', forbidden: '권한이 없습니다.' };
  const liveErr = e => { const c = e && (e.code || e.error); return ERRN[c] || `운영 서버의 마일리지 보상 기능에 연결하지 못했습니다${e && e.status ? `(${e.status}${c ? ' ' + c : ''})` : ''}. 잠시 뒤 다시 시도하고, 계속되면 관리자에게 알려 주십시오.`; };

  /* ── 공용 조각(시안 kit의 mx-* → mrw-*) ── */
  const pill = (txt, tone, icn) => `<span class="mrw-pill ${tone || ''}">${icn ? ic(icn, 14) : ''}${esc(txt)}</span>`;
  const rec = (recTxt, cur, why) => cur == null || String(cur) === String(recTxt) ? `<span class="mrw-rec same">${ic('check', 14)}권장값 ${esc(recTxt)}</span>` : `<span class="mrw-rec off" title="${esc(why || '')}">${ic('mrwWarn', 14)}권장 ${esc(recTxt)} · 현재 ${esc(cur)}</span>`;
  const note = (tone, title, body, foot) => `<div class="mrw-note n-${tone}" role="note">${ic(tone === 'warn' ? 'mrwWarn' : tone === 'ok' ? 'check' : 'info', 20)}<div><b>${esc(title)}</b><p>${esc(body)}</p>${foot ? `<small>${esc(foot)}</small>` : ''}</div></div>`;
  const lock = (title, body, soft) => `<div class="mrw-lock ${soft ? 'soft' : ''}" role="note">${ic(soft ? 'mrwLockOpen' : 'mrwLock', 22)}<div><b>${esc(title)}</b><p>${esc(body)}</p><small>${soft ? '권장 잠금 · 안내를 확인하면 풀 수 있습니다' : '제품 고정 · 기관 설정으로 풀 수 없습니다'}</small></div></div>`;
  const locktag = t => `<span class="mrw-locktag">${ic('mrwLock', 14)}${esc(t)}</span>`;
  const kv = (k, v, extra) => `<div class="mrw-kv"><span class="k">${esc(k)}</span><span class="v">${v}${extra || ''}</span></div>`;
  const mm = w => { if (w) w.classList.add('mrw-m'); return w; };
  const ask = (title, body, label, run, kind) => mm(modal(title, body, [{ id: 'c', label: '취소' }, { id: 'ok', label, kind: kind || 'pri', run }], true));

  /* ── 기관 · 학습자 ── */
  const mem = sid => ((S && S.members) || []).find(m => m.id === sid);
  const mask = s => { s = String(s || ''); return s.length <= 1 ? s : s.length === 2 ? s[0] + '*' : s[0] + '*'.repeat(s.length - 2) + s.slice(-1); };
  const who = r => { const m = mem(r.sid); const g = r.grade || (m && m.crm && m.crm.gy) || ''; return (m ? mask(m.name) : `학습자 ···${String(r.sid || '').slice(-4)}`) + (g ? ' · ' + g : ''); };
  const fundedCls = () => { const F = (S && S.mileage && S.mileage.funded) || {}; return ((S && S.classes) || []).filter(c => c.funded === true || F[c.id] === true || (F[c.id] && F[c.id].funded)); };
  const isFunded = id => fundedCls().some(c => c.id === id);

  /* ── 시연판 문서 ── */
  function seedRewards(t) {
    const R = [];
    const add = o => R.push({ id: id8('mrw_'), active: true, audience: { all: true, cls: [] }, threshold: 0, stock: null, perSid: {}, maxUse: {}, link: {}, ...o, cash: CASH[o.kind] });
    if (['k12', 'adult', 'lifelong'].includes(t)) add({ kind: 'tuition', title: '학원비 차감', cost: { wonPerP: 1 }, minUse: 1000, step: 100, maxUse: { billPct: 30 }, approval: t === 'k12' ? 'guardian' : 'manual', trust: 'AB' });
    if (['adult', 'lifelong'].includes(t)) add({ kind: 'coupon', title: '수강권 1만 원 할인 쿠폰', cost: { fixedP: 10000 }, approval: 'auto', perSid: { month: 1 }, link: { couponType: 'amount', couponVal: 10000, validDays: 30 }, trust: 'AB' });
    if (t === 'k12') { add({ kind: 'goods', title: '문제집 교환(지정 3종)', cost: { fixedP: 3000 }, stock: 18, perSid: { month: 1 }, approval: 'manual', link: { priceWon: 15000 } }); add({ kind: 'goods', title: '필통 · 노트 세트', cost: { fixedP: 1500 }, stock: 6, perSid: { month: 1 }, approval: 'manual', link: { priceWon: 8000 } }); }
    if (['adult', 'lifelong', 'univ', 'voc'].includes(t)) add({ kind: 'goods', title: t === 'univ' ? '학생식당 식권 1매' : '교재 교환권', cost: { fixedP: t === 'univ' ? 50 : 2000 }, stock: t === 'univ' ? 140 : 30, perSid: { month: t === 'univ' ? 2 : 1 }, approval: t === 'univ' ? 'auto' : 'manual', link: { priceWon: t === 'univ' ? 5000 : 12000 } });
    if (t === 'public') add({ kind: 'goods', title: '지역 서점 교환권', cost: { fixedP: 300 }, approval: 'manual', active: false, softLock: 'C', link: { priceWon: 10000 } });
    if (t === 'corp') { add({ kind: 'shop', title: '도서 교환권', cost: { fixedP: 300 }, perSid: { month: 2 }, approval: 'auto', link: { priceWon: 15000 } }); add({ kind: 'shop', title: '사내 카페 이용권', cost: { fixedP: 100 }, approval: 'auto', link: { priceWon: 4500 } }); }
    add({ kind: 'badge', title: t === 'k12' ? '4주 연속 출석 배지' : '학습 습관 배지', cost: { fixedP: 0 }, approval: 'auto', tier: 2, auto: true });
    add({ kind: 'cert', title: t === 'corp' ? '데이터 리터러시 인증' : '우수 학습자 인증서', cost: { fixedP: 0 }, approval: 'auto', tier: 3, auto: true });
    return R;
  }
  function seed(D) {
    const t = orgType(), ym = ym0(), td = today(), M = (S.members || []);
    D.rewards = seedRewards(t);
    if (!M.length) return; /* 빈 스튜디오: 권장 카탈로그만, 신청 · 의심 예시 없음 */
    const rw = k => D.rewards.find(r => r.kind === k);
    const hold = (r, at) => { const e = { id: id8('me_'), sid: r.sid, kind: 'hold', points: -r.points, status: 'posted', redeemId: r.id, at }; D.entries.push(e); r.holdEntry = e.id; };
    const mk = (o, ago) => { const at = (ago ? ymdL(new Date(Date.now() - ago * 864e5)) : td) + ' 10:' + String(10 + (D.redeems.length * 7) % 50); const r = { id: 'mrd_' + String(118 + D.redeems.length * 3), status: 'requested', guardian: 'na', at, idem: idem(), ...o }; D.redeems.push(r); if (r.status === 'requested') hold(r, at); else { hold(r, at); D.entries.push({ id: id8('me_'), sid: r.sid, kind: 'release', points: r.points, status: 'posted', redeemId: r.id, at }, { id: id8('me_'), sid: r.sid, kind: 'use', points: -r.points, status: 'posted', redeemId: r.id, at }); } return r; };
    const tu = rw('tuition');
    if (tu) {
      const L = S.ledger && Array.isArray(S.ledger.charges) ? S.ledger : null; const unit = L ? ((L.units || []).find(u => u.parentId) || (L.units || [])[0] || {}).id : '';
      const nym = ymAdd(ym, 1);
      const bill = (sid, a, b) => { if (!L) return ''; const id = 'b_mrw_' + sid; if (!L.charges.some(c => c.bill === id)) [[minorOrg() ? '수학 정규반 교습비(등록 교습비)' : '정규 과정 수강료(등록 수강료)', a], [minorOrg() ? '영어 정규반 교습비(등록 교습비)' : '교재비', b]].filter(x => x[1]).forEach(([title, amount]) => L.charges.push({ id: id8('lc_'), unitId: unit, sid, itemType: 'tuition', title, amount, periodYm: nym, dueDate: nym + '-10', srcType: 'class', srcId: 'demo', status: 'open', createdAt: td + ' 09:00', bill: id })); return id; };
      const g = minorOrg();
      mk({ sid: '7100118', grade: g ? '중2' : '', rewardId: tu.id, points: 1000, won: 1000, billId: bill('7100118', 220000, 100000), guardian: g ? 'ok' : 'na' }, 4);
      mk({ sid: '7100121', grade: g ? '초6' : '', rewardId: tu.id, points: 3000, won: 3000, billId: bill('7100121', 280000, 0), guardian: g ? 'ok' : 'na' }, 3);
      mk({ sid: '7100124', grade: g ? '중1' : '', rewardId: tu.id, points: 90000, won: 90000, billId: bill('7100124', 280000, 0), guardian: g ? 'ok' : 'na' }, 2);
      if (g) mk({ sid: '7100126', grade: '중3', rewardId: tu.id, points: 5000, won: 5000, billId: bill('7100126', 240000, 100000), guardian: 'wait' }, 2);
    }
    const gd = D.rewards.filter(r => r.kind === 'goods');
    if (gd[0] && M[3]) mk({ sid: M[3].id, rewardId: gd[0].id, points: gd[0].cost.fixedP }, 1);
    const g2 = gd[1] || gd[0];
    if (g2 && M[5]) { mk({ sid: M[5].id, rewardId: g2.id, points: g2.cost.fixedP, status: 'fulfilled', fulfil: { handedAt: td }, decidedBy: '시연 데이터' }, 6); mk({ sid: M[5].id, rewardId: g2.id, points: g2.cost.fixedP }, 1); }
    const sh = D.rewards.filter(r => r.kind === 'shop');
    if (sh.length) {
      D.shop = { on: true, ack: { by: '시연 데이터', at: td + ' 09:00', read: true, payroll: true, notKpi: true } };
      const pay = [[0, 0, 1, 2], [1, 1, 4, 8], [2, 0, 2, 5], [3, 1, 2, 4], [4, 0, 1, 1], [5, 0, 1, 40], [6, 1, 3, 45]];
      pay.forEach(([mi, ri, q, ago]) => { const m = M[mi * 3]; if (!m) return; const r = sh[ri] || sh[0]; const day = ago >= 30 ? ymAdd(ym, -1) + '-' + String(70 - ago).padStart(2, '0') : ym + '-' + String(Math.max(1, +td.slice(8) - ago)).padStart(2, '0'); const r0 = mk({ sid: m.id, rewardId: r.id, points: r.cost.fixedP * q, qty: q, status: 'fulfilled', fulfil: { handedAt: day }, decidedBy: '자동' }, 0); r0.at = day + ' 09:00'; });
      D.sent.push({ ym: ymAdd(ym, -1), at: ymAdd(ym, 0) + '-03 09:10', to: '급여 담당' });
    }
    /* 부정 의심(7.1) — 근거는 해시 · 사건 ID만, 보류된 적립은 pending */
    const fl = (o, held) => { const f = { id: 'mfl_' + (31 + D.flags.length), status: 'open', at: td, ...o, held: [] }; held.forEach(([sid, p]) => { const e = { id: id8('me_'), sid, kind: 'earn', points: p, status: 'pending', flag: f.id, at: td }; D.entries.push(e); f.held.push(e.id); }); D.flags.push(f); };
    if (M.length > 9) {
      fl({ kind: 'staff_grant', sid: M[7].id, title: '운영자 지급 이상', whoTxt: `${t === 'corp' ? '팀장' : '강사'} 1명 → 학습자 3명`, evidence: ['하루 칭찬 지급 2,400P(기준 1,000P)', `같은 보호자 연락처 해시 2명(h:${hashS('demo-a')})`, '사건 ID man:ui_3f2 · man:ui_3f3 · man:ui_3f4'] }, [[M[7].id, 800], [M[8].id, 800], [M[9].id, 800]]);
      fl({ kind: 'velocity', sid: M[2].id, title: '몰아 쌓기(속도)', whoTxt: '학습자 1명', evidence: ['1시간 안 과제 완료 9건', '제출 간격 평균 40초(C 사건, 기기 보고)', `기기 지문 해시 h:${hashS('demo-b')}`] }, [[M[2].id, 900]]);
    }
  }
  function ensure() {
    if (!S || !S.org) return null;
    if (!S.milrw || !Array.isArray(S.milrw.rewards)) { S.milrw = { v: 42, rewards: [], redeems: [], entries: [], flags: [], shop: { on: false, ack: null }, sent: [], log: [] }; if (LIVEON()) S.milrw.live = 1; else seed(S.milrw); }
    const D = S.milrw; ['rewards', 'redeems', 'entries', 'flags', 'sent', 'log'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; }); if (!D.shop) D.shop = { on: false, ack: null };
    if (LIVEON() && !D.live) { ['rewards', 'redeems', 'entries', 'flags', 'sent', 'log'].forEach(k => { D[k] = []; }); D.live = 1; }
    return D;
  }
  const RW = () => ensure();
  const rwOf = id => (LIVEON() ? liveRewards() : RW().rewards).find(r => r.id === id) || { kind: 'goods', title: '(삭제된 보상)', cost: {} };
  const policyLog = (what, before, after, reason) => { const D = RW(); D.log.unshift({ area: 'reward', what, before, after, reason: reason || '', by: S.me.name, at: nowStr() }); logAudit(`마일리지 보상 — ${what}`); };

  /* ── 운영 모드 ── */
  const LV = { key: '', d: {}, busy: false, err: '', errAt: 0 };
  const qs = o => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  function livePull(tab) {
    const need = { cfg: ['GET', '/api/mileage/config'] };
    if (tab === 'approvals') { need.ap = ['GET', '/api/mileage/approvals?type=redeem']; need.done = ['GET', '/api/mileage/redeems']; }
    if (tab === 'fraud') need.fl = ['GET', '/api/mileage/flags'];
    if (tab === 'rewards' && orgType() === 'corp') need.pay = ['GET', '/api/mileage/shop/payouts?' + qs({ ym: UI.mrwYm || ym0() })];
    const key = JSON.stringify(need); if (LV.busy || (LV.key === key && (!LV.err || Date.now() - LV.errAt < 5000))) return; LV.busy = true; LV.key = key;
    const K = Object.keys(need);
    Promise.all(K.map(k => api(need[k][0], need[k][1]).catch(e => { if (k === 'cfg' || k === 'ap' || k === 'fl') throw e; return null; })))
      .then(R => { const d = {}; K.forEach((k, i) => { d[k] = R[i]; }); LV.d = d; LV.err = ''; })
      .catch(e => { LV.err = liveErr(e); LV.errAt = Date.now(); })
      .finally(() => { LV.busy = false; render(); });
  }
  const liveDo = (method, url, body, ok) => api(method, url, body).then(r => { LV.key = ''; const bad = r && Array.isArray(r.results) ? r.results.filter(x => x && x.ok === false) : []; if (bad.length) toast(`처리하지 못한 신청 ${bad.length}건: ${bad.map(x => ERRN[x.error] || x.message || x.error).filter((v, i, A) => A.indexOf(v) === i).join(' · ')}`, 'warn'); else if (ok) ok(r); render(); return r; }).catch(e => { toast(liveErr(e), 'warn'); LV.key = ''; render(); });
  const mRw = x => ({ id: x.id, kind: x.kind, title: x.title, cost: x.cost || {}, minUse: x.minUse != null ? x.minUse : x.min_use, step: x.step, maxUse: x.maxUse || x.max_use || {}, threshold: x.threshold || 0, stock: x.stock, perSid: x.perSid || x.per_sid || {}, approval: x.approval, cash: x.cash != null ? !!x.cash : CASH[x.kind], audience: x.audience || { all: true }, active: x.active !== false, link: x.link || {}, trust: x.trust || 'AB' });
  const liveRewards = () => ((LV.d.cfg && LV.d.cfg.rewards) || []).map(mRw);
  const mRd = x => ({ id: x.id, sid: x.sid, grade: x.grade || '', rewardId: x.rewardId || x.reward_id, points: +x.points || 0, won: +x.won || 0, status: x.status || 'requested', guardian: x.guardian || ({ pending: 'wait', ok: 'ok', no: 'no' }[(x.fulfil || {}).guardian]) || 'na', billId: x.billId || (x.bill && x.bill.id) || '', bill: x.bill || null, checks: x.checks || null, at: x.at || '', fulfil: x.fulfil || {}, qty: x.qty || 1, dept: x.dept || '' });

  /* ── 신청 확인할 점(서버 approvals의 checks와 같은 규칙, 시연판 계산) ── */
  const charges = () => (S.ledger && Array.isArray(S.ledger.charges)) ? S.ledger.charges : [];
  function billOf(r) {
    if (r.bill && Array.isArray(r.bill.lines)) return { id: r.bill.id || r.billId, lines: r.bill.lines.map(l => ({ title: l.title, amount: +l.amount || 0, srcType: l.srcType || l.src_type || '', srcId: l.srcId || l.src_id || '' })), paid: !!r.bill.paid, funded: !!r.bill.funded, cap: r.bill.billPct };
    if (!r.billId) return null; const C = charges().filter(c => c.bill === r.billId && c.status !== 'void'); if (!C.length) return null;
    const ids = new Set(C.map(c => c.id)); const paid = ((S.ledger && S.ledger.allocs) || []).some(a => ids.has(a.chargeId));
    return { id: r.billId, lines: C.map(c => ({ id: c.id, title: c.title, amount: c.amount, srcType: c.srcType, srcId: c.srcId })), paid, funded: C.some(c => c.srcType === 'class' && isFunded(c.srcId)), ym: C[0].periodYm };
  }
  const base = B => B.lines.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const net = B => B.lines.reduce((s, l) => s + l.amount, 0);
  function checks(r) {
    if (r.checks) return r.checks.map(c => ({ code: c.code, tone: c.block ? 'block' : 'warn', text: c.text || ERRN[c.code] || c.code, fix: c.fixPoints || c.fix }));
    const out = [], w = rwOf(r.rewardId), D = LIVEON() ? null : RW();
    if (r.guardian === 'wait') out.push({ code: 'guardian', tone: 'block', text: '보호자 확인 전 — 보호자가 확인하면 승인할 수 있습니다.' });
    if (w.kind === 'tuition') {
      const B = billOf(r);
      if (!B) out.push({ code: 'no_bill', tone: 'block', text: '붙일 열린 청구서가 없습니다. 다음 청구를 만든 뒤 승인합니다.' });
      else {
        const pct = (w.maxUse && w.maxUse.billPct) || REC.billPct; const capW = Math.floor(base(B) * pct / 100); const already = -B.lines.filter(l => l.srcType === 'mileage').reduce((s, l) => s + l.amount, 0);
        if (B.funded) out.push({ code: 'funded_blocked', tone: 'block', text: '국비 지원 과정 청구서입니다. 차감 줄을 붙일 수 없습니다(제품 고정).' });
        if (B.paid) out.push({ code: 'bill_paid', tone: 'block', text: ERRN.bill_paid });
        if (r.won + already > capW) { const step = w.step || REC.step, rate = (w.cost && w.cost.wonPerP) || 1; const fix = Math.max(0, Math.floor((capW - already) / rate / step) * step); out.push({ code: 'bill_pct', tone: 'block', text: `청구서의 ${Math.round((r.won + already) / base(B) * 100)}% — 상한 ${pct}% 초과`, fix }); }
      }
    }
    if (w.stock != null && w.stock <= 0 && r.status === 'requested') out.push({ code: 'out_of_stock', tone: 'block', text: '재고가 없습니다. 반려하거나 재고를 채운 뒤 승인합니다.' });
    const lim = w.perSid && w.perSid.month;
    if (lim && D) { const same = D.redeems.filter(x => x.id !== r.id && x.sid === r.sid && x.rewardId === r.rewardId && String(x.at).slice(0, 7) === String(r.at).slice(0, 7) && ['requested', 'approved', 'fulfilled'].includes(x.status)).length; if (same >= lim) out.push({ code: 'per_month', tone: 'warn', text: `이번 달 같은 보상 ${same}회 이미 신청(1인 월 ${lim}개) · 경고만 표시하며 승인할 수 있습니다.` }); }
    if (D && D.flags.some(f => f.status === 'open' && (f.sid === r.sid || D.entries.some(e => e.flag === f.id && e.sid === r.sid)))) out.push({ code: 'flag', tone: 'warn', text: '부정 의심 보류 중인 학습자입니다. 부정 의심 탭을 먼저 확인하십시오.' });
    return out;
  }
  const blocked = r => checks(r).some(c => c.tone === 'block');

  /* ── 탭 1: 보상 카탈로그 ── */
  function rewardCard(w) {
    const k = KIND[w.kind] || ['보상', 'mrwBox']; const own = isOwner();
    let body = '';
    if (w.kind === 'tuition') {
      const pct = (w.maxUse && w.maxUse.billPct) || REC.billPct;
      body = kv('교환 비율', `1${unitAb()} = ${n0((w.cost && w.cost.wonPerP) || 1)}원`) + kv('청구서 1건당 상한', `${pct}%`, rec(`청구서 ${REC.billPct}%`, `청구서 ${pct}%`, '청구서 금액 대부분을 마일리지로 메우면 학원 수입 구조가 흔들릴 수 있습니다.'))
        + kv('최소 사용 · 단위', `${P(w.minUse || 0)} · ${P(w.step || 0)} 단위`, rec(`${P(REC.minUse)} · ${P(REC.step)}`, `${P(w.minUse || 0)} · ${P(w.step || 0)}`, '소액 반복 신청을 막습니다.'))
        + kv('쓸 수 있는 적립', w.trust === 'ABC' ? '모든 적립(기기 보고 C 포함)' : '서버 확인(A) · 운영자 확정(B) 성취형 적립만', rec('A · B만', w.trust === 'ABC' ? 'A · B · C' : 'A · B만', '기기가 보고한 사건은 위조가 쉬워 현금성 보상에서 뺍니다.'))
        + kv('차감 대상 제외', '평생교육이용권 · 국비 지원금 결제분');
    } else if (w.kind === 'coupon') {
      body = kv('필요 ' + unitAb(), P(w.cost.fixedP)) + kv('쿠폰', `${(w.link || {}).couponType === 'rate' ? (w.link.couponVal || 0) + '% 할인' : won((w.link || {}).couponVal || 0) + ' 할인'} · 발급 후 ${(w.link || {}).validDays || 30}일 · 본인만 1회`) + kv('1인 월 한도', `${(w.perSid || {}).month || '제한 없음'}${(w.perSid || {}).month ? '개' : ''}`, (w.perSid || {}).month ? rec(`월 ${REC.perMonth}개`, `월 ${w.perSid.month}개`) : '');
    } else if (w.kind === 'goods' || w.kind === 'shop') {
      body = kv('필요 ' + unitAb(), P(w.cost.fixedP)) + (w.kind === 'shop' ? kv('지급 시가(과세 내보내기용)', won((w.link || {}).priceWon || 0)) : '') + (w.stock != null ? kv('재고', `${w.stock}개`, w.stock <= 6 ? pill('재고 적음', 'wait', 'mrwWarn') : '') : '')
        + kv('1인 월 한도', (w.perSid || {}).month ? `${w.perSid.month}개` : '제한 없음', (w.perSid || {}).month ? rec(`월 ${REC.perMonth}개`, `월 ${w.perSid.month}개`, '같은 사람이 한 달에 여러 번 받으면 재고가 빨리 줄어듭니다.') : '')
        + kv('수령', w.kind === 'shop' ? '사내 지급 기록 · 배송 주소는 받지 않습니다' : '현장 수령 · 배송 주소는 받지 않습니다');
    } else body = kv('수여 조건', w.auto ? '기준 도달 시 자동 수여' : P(w.cost.fixedP)) + kv('단계', w.kind === 'cert' ? '인증(육각 · 검증 번호)' : '성취(방패)') + `<p class="mrw-mut">금전 가치가 없어 국비 지원 과정 적립분으로도 받을 수 있습니다.</p>`;
    const aud = w.audience && !w.audience.all && (w.audience.cls || []).length ? (w.audience.cls || []).map(id => ((S.classes || []).find(c => c.id === id) || { name: id }).name).join(', ') : '전체 학습자';
    const soft = w.softLock && !w.active;
    return `<article class="mrw-rw ${w.active ? '' : 'off'}" data-rw="${esc(w.id)}"><div class="hd"><span class="mrw-ic">${ic(k[1], 24)}</span><div class="f1"><small>${esc(k[0])}</small><b>${esc(w.title)}</b></div>
      ${w.cash ? pill('금전성', 'info', 'mrwReceipt') : pill('비금전', 'off', 'mrwMedal')}
      <button class="mrw-tg ${w.active ? 'on' : ''}" role="switch" aria-checked="${!!w.active}" aria-label="${esc(w.title)} ${w.active ? '켜짐' : '꺼짐'}" data-act="mrw-rw-on" data-v="${esc(w.id)}" ${own ? '' : 'disabled'}><i></i><span>${w.active ? '켬' : '끔'}</span></button></div>
      <div class="bd">${body}${kv('대상', esc(aud))}${kv('승인', esc(APPR[w.approval] || w.approval || '자동'))}</div>
      ${w.cash && fundedCls().length ? `<div class="mrw-ft">${locktag('국비 지원 과정 적립분 사용 불가')}</div>` : ''}
      ${soft ? lock('공공 예산 금품 지급 — 권장 잠금', NOTICE.C, true) : ''}
      ${own ? `<div class="mrw-ft"><button class="btn sm" data-act="mrw-rw-edit" data-v="${esc(w.id)}">교환 규칙 고치기</button></div>` : ''}</article>`;
  }
  function viewRewards() {
    const D = LIVEON() ? null : RW(); const t = orgType(); const own = isOwner();
    const list = LIVEON() ? liveRewards() : D.rewards;
    const sub = t === 'corp' ? (UI.mrwSub || 'cat') : 'cat';
    const subTabs = t === 'corp' ? `<div class="mrw-seg" role="tablist">${[['cat', '카탈로그'], ['shop', '리워드 숍(선택 모듈)'], ['pay', '지급 내역 · 1인별 지급액']].map(([k, l]) => `<button role="tab" aria-selected="${sub === k}" class="${sub === k ? 'on' : ''}" data-act="mrw-sub" data-v="${k}">${esc(l)}</button>`).join('')}</div>` : '';
    if (sub === 'shop') return wrap(subTabs + viewShop(list));
    if (sub === 'pay') return wrap(subTabs + viewPay(list));
    const fc = fundedCls();
    const fundNote = t === 'voc' || fc.length ? lock('국비 지원 과정 적립분은 금전성 보상에 쓸 수 없습니다', NOTICE.FUND_OP + (fc.length ? ` 해당 과정: ${fc.map(c => c.name).join(', ')}.` : ' 국비 지원 과정으로 표시된 과정의 적립은 배지 · 인정 기록만 받습니다.'))
      : note('info', '국비 지원 과정 적립분은 금전성 보상에서 자동으로 빠집니다', '학원비 차감 · 쿠폰 · 굿즈처럼 금전 가치가 있는 보상은 국비 지원 과정에서 쌓인 적립으로 쓸 수 없습니다. 배지 · 인정 기록은 그대로 받습니다. 지금 이 기관에는 해당 과정이 없습니다.');
    const top = `<div class="mrw-head"><div><h2>보상</h2><p>디디쌤 값은 권장값입니다. 모든 값은 기관이 정하고, 권장값을 벗어나도 저장은 막지 않습니다.</p></div><div class="mrw-acts">${own ? `<button class="btn pri" data-act="mrw-rw-new">${ic('mrwPlus', 18)}보상 추가</button>` : ''}</div></div>`;
    const list2 = list.filter(w => kindsFor(t).includes(w.kind) || w.kind === 'tuition');
    const foot = `<div class="mrw-card mrw-row">${ic('info', 20)}<span class="f1">학습자가 신청하면 마일리지를 「사용 대기」로 잡아 두고, 반려하면 바로 돌려줍니다.${list2.some(w => w.kind === 'tuition') ? (minorOrg() ? ' 학원비 차감은 보호자 확인 → 운영자 확인 순서입니다.' : ' 학원비 차감은 운영자 확인 후 다음 청구서에 붙습니다.') : ''}</span><button class="btn sm" data-act="mrw-go" data-v="approvals">신청 · 승인으로 이동</button></div>`;
    return wrap(subTabs + top + (LV.err && LIVEON() ? `<p class="mrw-err" role="alert">${esc(LV.err)}</p>` : '') + fundNote + (list2.length ? `<div class="mrw-g2">${list2.map(rewardCard).join('')}</div>` : `<div class="mrw-empty">${ic('mrwBox', 28)}<b>아직 보상이 없습니다</b><p>[보상 추가]에서 종류부터 고르십시오. 학습자 앱 「내 마일리지 › 보상」에 바로 보입니다.</p></div>`) + foot);
  }
  const wrap = h => `<div class="mrw">${h}</div>`;

  /* 보상 추가 · 고치기: 종류 고르기 → 교환 규칙(권장값 미리 채움) → 확인 */
  ACT['mrw-rw-new'] = () => { if (!isOwner()) return toast('정운영자만 보상을 추가할 수 있습니다.', 'warn');
    const K = kindsFor(orgType());
    mm(modal('어떤 보상을 추가하시겠습니까?', `<p class="mrw-mut">종류부터 고릅니다. 연결 설정(원장 · 쿠폰 · 인증서)이 자동으로 채워집니다.</p><div class="mrw-pick">${K.map(k => `<button class="mrw-pi" data-act="mrw-rw-kind" data-v="${k}">${ic(KIND[k][1], 22)}<span><b>${esc(KIND[k][0])}</b><small>${esc(KIND_DESC[k])}</small></span>${CASH[k] ? pill('금전성', 'info') : pill('비금전', 'off')}</button>`).join('')}</div>`, [{ id: 'c', label: '닫기' }])); };
  ACT['mrw-rw-kind'] = el => editForm({ kind: el.dataset.v });
  ACT['mrw-rw-edit'] = el => { const w = (LIVEON() ? liveRewards() : RW().rewards).find(x => x.id === el.dataset.v); if (w) editForm(w); };
  function editForm(w0) {
    const k = w0.kind, isNew = !w0.id; const w = { cost: {}, maxUse: {}, perSid: {}, link: {}, audience: { all: true, cls: [] }, approval: k === 'tuition' && minorOrg() ? 'guardian' : CASH[k] ? 'manual' : 'auto', minUse: REC.minUse, step: REC.step, trust: 'AB', ...w0 };
    const cls = (S.classes || []).map(c => `<label class="mrw-ck"><input type="checkbox" name="cls" value="${esc(c.id)}" ${(w.audience.cls || []).includes(c.id) ? 'checked' : ''}><span>${esc(c.name)}${isFunded(c.id) ? ' ' + locktag('국비 지원 과정') : ''}</span></label>`).join('');
    const f = (n, l, v, extra, type) => `<label class="mrw-fl"><span>${esc(l)}</span><input name="${n}" value="${esc(v == null ? '' : v)}" inputmode="${type || 'numeric'}">${extra || ''}</label>`;
    let body = f('title', '이름', w.title || KIND[k][0], '', 'text');
    if (k === 'tuition') body += `<div class="mrw-g2f">${f('rate', '1' + unitAb() + '당 원', (w.cost.wonPerP || 1))}${f('pct', '청구서 1건당 상한(%)', w.maxUse.billPct || REC.billPct, rec(`${REC.billPct}%`))}${f('min', '최소 사용', w.minUse, rec(P(REC.minUse)))}${f('step', '사용 단위', w.step, rec(P(REC.step)))}</div><label class="mrw-fl"><span>쓸 수 있는 적립</span><select name="trust"><option value="AB" ${w.trust !== 'ABC' ? 'selected' : ''}>서버 확인(A) · 운영자 확정(B) 성취형만(권장)</option><option value="ABC" ${w.trust === 'ABC' ? 'selected' : ''}>기기 보고(C) 포함 — 경고 확인 필요</option></select></label>`;
    else if (k === 'coupon') body += `<div class="mrw-g2f">${f('fixedP', '필요 ' + unitAb(), w.cost.fixedP || 10000)}${f('cval', '할인 금액(원)', w.link.couponVal || 10000)}${f('days', '유효 일수', w.link.validDays || 30)}${f('pm', '1인 월 한도(개)', w.perSid.month || REC.perMonth, rec(`월 ${REC.perMonth}개`))}</div>`;
    else if (k === 'goods' || k === 'shop') body += `<div class="mrw-g2f">${f('fixedP', '필요 ' + unitAb(), w.cost.fixedP || 1000)}${f('price', k === 'shop' ? '지급 시가(원, 과세 내보내기용)' : '상품 시가(원, 기록용)', w.link.priceWon || '')}${f('stock', '재고(비우면 제한 없음)', w.stock == null ? '' : w.stock)}${f('pm', '1인 월 한도(개)', w.perSid.month || REC.perMonth, rec(`월 ${REC.perMonth}개`))}</div>`;
    else body += `<p class="mrw-mut">기준에 도달하면 자동으로 수여합니다. 기준(적립 누적 · 등급)은 「적립 규칙」에서 정합니다.</p>`;
    if (CASH[k]) body += `<label class="mrw-fl"><span>승인</span><select name="appr">${(k === 'tuition' && minorOrg() ? ['guardian', 'manual'] : ['manual', 'auto']).map(a => `<option value="${a}" ${w.approval === a ? 'selected' : ''}>${esc(APPR[a])}</option>`).join('')}</select></label>`;
    body += `<fieldset class="mrw-fs"><legend>대상</legend><label class="mrw-ck"><input type="radio" name="aud" value="all" ${w.audience.all !== false ? 'checked' : ''}><span>전체 학습자${CASH[k] ? ' — 국비 지원 과정 적립분은 자동으로 빠집니다' : ''}</span></label><label class="mrw-ck"><input type="radio" name="aud" value="cls" ${w.audience.all === false ? 'checked' : ''}><span>고른 과정만</span></label><div class="mrw-cls">${cls || '<p class="mrw-mut">과정이 없습니다.</p>'}</div></fieldset>`;
    if (CASH[k]) body += lock('국비 지원 과정은 대상에 넣을 수 없습니다', NOTICE.FUND_OP);
    if (k === 'tuition') body += note('info', '안내 A · 학원비 차감', NOTICE.A) + note('info', '안내 D', NOTICE.D) + (minorOrg() ? note('info', '안내 B · 미성년 학습자', NOTICE.B) : '');
    if (k === 'shop') body += note('info', '안내 G · 근로소득 과세 가능성', NOTICE.G);
    ask(isNew ? `${KIND[k][0]} 추가` : `${w.title} 고치기`, body, isNew ? '확인하고 추가' : '변경 내용 확인하고 저장', m => {
      const num = n => { const v = fv(m, n); return v === '' ? null : Math.max(0, Math.round(+String(v).replace(/[^\d]/g, '') || 0)); };
      const out = { ...w, title: fv(m, 'title') || KIND[k][0], kind: k, cash: CASH[k] };
      if (k === 'tuition') { out.cost = { wonPerP: num('rate') || 1 }; out.maxUse = { ...out.maxUse, billPct: Math.min(100, num('pct') || REC.billPct) }; out.minUse = num('min') || 0; out.step = num('step') || 1; out.trust = fv(m, 'trust') || 'AB'; }
      if (k === 'coupon') { out.cost = { fixedP: num('fixedP') || 0 }; out.link = { couponType: 'amount', couponVal: num('cval') || 0, validDays: num('days') || 30 }; out.perSid = { month: num('pm') || 0 }; }
      if (k === 'goods' || k === 'shop') { out.cost = { fixedP: num('fixedP') || 0 }; out.link = { ...out.link, priceWon: num('price') || 0 }; out.stock = num('stock'); out.perSid = { month: num('pm') || 0 }; }
      if (CASH[k]) out.approval = fv(m, 'appr') || out.approval;
      const pickCls = [...m.querySelectorAll('[name="cls"]:checked')].map(x => x.value); const audAll = (m.querySelector('[name="aud"]:checked') || {}).value !== 'cls';
      out.audience = { all: audAll, cls: audAll ? [] : pickCls };
      if (!audAll && !pickCls.length) { toast('대상 과정을 하나 이상 고르십시오.', 'warn'); return false; }
      if (CASH[k] && !audAll && pickCls.some(isFunded)) { toast(ERRN.funded_blocked, 'warn'); return false; } /* D1: 서버도 400 funded_blocked */
      if ((k === 'goods' || k === 'shop' || k === 'coupon') && !(out.cost.fixedP > 0)) { toast(`필요 ${unitAb()}를 입력하십시오.`, 'warn'); return false; }
      const warns = []; if (k === 'tuition') { if (out.maxUse.billPct !== REC.billPct) warns.push(`차감 상한 ${out.maxUse.billPct}%(권장 ${REC.billPct}%)`); if (out.minUse !== REC.minUse) warns.push(`최소 사용 ${P(out.minUse)}(권장 ${P(REC.minUse)})`); if (out.trust === 'ABC') warns.push('기기 보고(C) 적립 사용(권장 A · B만)'); }
      if (out.perSid && out.perSid.month > REC.perMonth && k !== 'shop') warns.push(`1인 월 ${out.perSid.month}개(권장 ${REC.perMonth}개)`);
      const body2 = { id: out.id, kind: k, title: out.title, cost: out.cost, minUse: out.minUse, maxUse: out.maxUse, step: out.step, threshold: out.threshold || 0, stock: out.stock, perSid: out.perSid, approval: out.approval, audience: out.audience, link: out.link, active: out.active !== false, trust: out.trust };
      if (LIVEON()) { liveDo('POST', '/api/mileage/rewards', body2, r => toast((r && r.warnings && r.warnings.length ? `저장했습니다. 권장값과 다른 값: ${r.warnings.map(w => (w && (w.msg || w.text || w.title)) || String(w)).join(', ')}` : '저장했습니다.'), r && r.warnings && r.warnings.length ? 'warn' : 'ok')); return; }
      const D = RW(); if (isNew) { out.id = id8('mrw_'); out.active = true; D.rewards.push(out); } else { const i = D.rewards.findIndex(x => x.id === out.id); if (i >= 0) D.rewards[i] = out; }
      policyLog(`${isNew ? '보상 추가' : '보상 변경'} — ${out.title}`, isNew ? null : w0, out, warns.length ? '권장값 벗어남 경고 확인' : ''); save(); render();
      toast(warns.length ? `저장했습니다. 권장값과 다른 값: ${warns.join(', ')}` : '저장했습니다.', warns.length ? 'warn' : 'ok');
    });
  }
  ACT['mrw-rw-on'] = el => { if (!isOwner()) return; const id = el.dataset.v; const list = LIVEON() ? liveRewards() : RW().rewards; const w = list.find(x => x.id === id); if (!w) return; const on = !w.active;
    const doIt = () => { if (LIVEON()) { liveDo('POST', '/api/mileage/rewards', { ...w, active: on }, () => toast(on ? '보상을 켰습니다.' : '보상을 껐습니다.', 'ok')); return; } w.active = on; policyLog(`보상 ${on ? '켬' : '끔'} — ${w.title}`, { active: !on }, { active: on }); save(); render(); toast(on ? '보상을 켰습니다. 학습자 화면에 보입니다.' : '보상을 껐습니다. 이미 받은 신청은 그대로 처리합니다.', 'ok'); };
    if (on && w.softLock === 'C') return ask('공공 예산 금품 지급 — 안내 확인', note('info', '안내 C', NOTICE.C) + `<label class="mrw-fl"><span>지급 근거 규정 이름(필수)</span><input name="basis" maxlength="80"></label><label class="mrw-ck"><input type="checkbox" name="ack"><span>위 안내를 읽었고 기관 책임으로 켭니다.</span></label>`, '확인하고 켜기 · 변경 이력에 기록', m => { if (!fv(m, 'ack') || !fv(m, 'basis')) { toast('근거 규정과 확인 체크가 필요합니다.', 'warn'); return false; } w.basis = fv(m, 'basis'); doIt(); });
    if (!on) return ask('보상 끄기', `<p><b>${esc(w.title)}</b>을(를) 끕니다. 학습자 보상 목록에서 사라지고, 이미 들어온 신청은 그대로 처리합니다.</p>`, '끄기', () => doIt());
    doIt(); };
  ACT['mrw-sub'] = el => { UI.mrwSub = el.dataset.v; LV.key = ''; render(); };
  ACT['mrw-go'] = el => { UI.mil = el.dataset.v; UI.mileage = el.dataset.v; if (typeof window.milGo === 'function') window.milGo(el.dataset.v); render(); };

  /* ── 기업 리워드 숍 켜기(안내 G) · 1인별 지급액 ── */
  function viewShop(list) {
    const D = LIVEON() ? null : RW(); const cfgShop = LIVEON() ? ((LV.d.cfg && LV.d.cfg.policy && LV.d.cfg.policy.shop) || { on: false }) : D.shop;
    const sh = list.filter(w => w.kind === 'shop');
    const card = w => `<div class="mrw-card"><div class="mrw-row"><span class="mrw-ic">${ic('mrwShop', 22)}</span><div class="f1"><b>${esc(w.title)}</b><p class="mrw-mut">${P(w.cost.fixedP)} · ${esc(APPR[w.approval] || '자동')} · 시가 ${won((w.link || {}).priceWon || 0)}</p></div></div><div class="mrw-row wrap">${pill('과세 대상 가능', 'wait', 'mrwTax')}${locktag('국비 과정 적립분 사용 불가')}</div></div>`;
    return `<div class="mrw-head"><div><h2>리워드 숍</h2><p>러닝 포인트로 도서 교환권 · 사내 카페 이용권 등을 받게 합니다. 포인트를 현금으로 바꾸거나 다른 사람에게 넘기는 기능은 없습니다.</p></div></div>
      <div class="mrw-card mrw-row"><div class="f1"><b>리워드 숍</b><p class="mrw-mut">${cfgShop.on ? `켜짐 · ${esc((cfgShop.ack && cfgShop.ack.by) || '')} ${esc((cfgShop.ack && cfgShop.ack.at) || '')} 과세 안내 확인` : '꺼짐 · 켜면 과세 안내 확인 시트가 먼저 열립니다'}</p></div>
      <button class="mrw-tg ${cfgShop.on ? 'on' : ''}" role="switch" aria-checked="${!!cfgShop.on}" aria-label="리워드 숍 ${cfgShop.on ? '켜짐' : '꺼짐'}" data-act="mrw-shop" ${isOwner() ? '' : 'disabled'}><i></i><span>${cfgShop.on ? '켬' : '끔'}</span></button></div>
      ${note('info', '포인트는 성과 평가 지표가 아닙니다', NOTICE.NOT_KPI)}
      <div class="mrw-g3">${sh.map(card).join('') || '<p class="mrw-mut">리워드 숍 상품이 없습니다. 카탈로그에서 [보상 추가 › 리워드 숍]으로 만드십시오.</p>'}</div>`;
  }
  ACT['mrw-shop'] = () => { if (!isOwner()) return; const D = LIVEON() ? null : RW(); const cur = LIVEON() ? !!(LV.d.cfg && LV.d.cfg.policy && LV.d.cfg.policy.shop && LV.d.cfg.policy.shop.on) : D.shop.on;
    if (cur) return ask('리워드 숍 끄기', '<p>리워드 숍을 끕니다. 새 교환은 받지 않고, 이미 지급한 내역과 1인별 지급액 내보내기는 그대로 남습니다.</p>', '끄기 · 변경 이력에 기록', () => {
      if (LIVEON()) { liveDo('POST', '/api/mileage/config', { policy: { shop: { on: false } } }, () => toast('리워드 숍을 껐습니다.', 'ok')); return; }
      D.shop = { on: false, ack: D.shop.ack }; policyLog('리워드 숍 끔', { on: true }, { on: false }); save(); render(); toast('리워드 숍을 껐습니다.', 'ok'); });
    mm(modal('리워드 숍을 켜기 전에 확인해 주십시오', `<div class="mrw-sheet">${note('info', '근로소득 과세 가능성', NOTICE.G, '안내 G · 1인별 지급액 내보내기는 보상 › 지급 내역에서 제공합니다')}${note('info', '포인트는 성과 평가 지표가 아닙니다', NOTICE.NOT_KPI)}${lock('국비 지원 과정 적립분은 리워드 숍에 쓸 수 없습니다', NOTICE.FUND_OP)}
      <label class="mrw-ck"><input type="checkbox" name="a1"><span>위 과세 안내를 읽었고, 1인별 지급액을 급여 담당자에게 매월 보냅니다.</span></label><label class="mrw-ck"><input type="checkbox" name="a2"><span>러닝 포인트를 인사 · 성과 평가에 쓰지 않습니다.</span></label></div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '확인하고 켜기 · 변경 이력에 기록', kind: 'pri', run: m => { if (!fv(m, 'a1') || !fv(m, 'a2')) { toast('두 항목을 모두 확인해 주십시오.', 'warn'); return false; }
        const ack = { read: true, payroll: true, notKpi: true, by: S.me.name, at: nowStr() };
        if (LIVEON()) { liveDo('POST', '/api/mileage/config', { policy: { shop: { on: true, ack } } }, () => toast('리워드 숍을 켰습니다.', 'ok')); return; }
        D.shop = { on: true, ack }; policyLog('리워드 숍 켬(안내 G 확인)', { on: false }, { on: true, ack }, '과세 안내 · 성과 평가 미사용 확인'); save(); render(); toast('리워드 숍을 켰습니다. 변경 이력에 기록했습니다.', 'ok'); } }], true)); };
  function payRows(ym) {
    if (LIVEON()) { const r = LV.d.pay; return ((r && (r.rows || r.payouts)) || []).map(x => ({ emp: x.empNo || x.emp || x.sid, dept: x.dept || '', item: x.item || x.title || '', qty: +x.qty || 1, day: x.day || x.at || '', amount: x.amount != null ? +x.amount || 0 : (+x.priceWon || 0) * (+x.qty || 1) })); }
    const D = RW(); const rows = [];
    D.redeems.filter(r => ['fulfilled', 'reclaimed'].includes(r.status) && rwOf(r.rewardId).kind === 'shop').forEach(r => { const w = rwOf(r.rewardId), m = mem(r.sid) || {}; const day = (r.fulfil && r.fulfil.handedAt) || String(r.at).slice(0, 10); const emp = (m.extra && (m.extra.사번 || m.extra.empNo)) || ('D-' + (20000 + (+String(r.sid).replace(/\D/g, '') || 0) * 37)); const qty = r.qty || Math.max(1, Math.round(r.points / (w.cost.fixedP || 1)));
      const row = { emp, dept: (m.extra && m.extra.부서) || '', item: w.title, qty, day, amount: ((w.link || {}).priceWon || 0) * qty, rid: r.id };
      if (day.slice(0, 7) === ym) rows.push(row);
      if (r.status === 'reclaimed' && String(r.reclaimedAt || '').slice(0, 7) === ym) rows.push({ ...row, day: String(r.reclaimedAt).slice(0, 10), qty: -qty, amount: -row.amount, item: row.item + '(회수)' }); });
    return rows.sort((a, b) => a.day < b.day ? -1 : 1);
  }
  function viewPay() {
    const ym = UI.mrwYm || ym0(); const rows = payRows(ym); const tot = rows.reduce((s, r) => s + r.amount, 0); const D = LIVEON() ? null : RW();
    const sent = LIVEON() ? ((LV.d.pay && LV.d.pay.sent) || []) : D.sent;
    return `<div class="mrw-head"><div><h2>리워드 숍 · 1인별 지급액</h2><p>급여 담당자에게 보내는 월별 지급 내역입니다.</p></div><div class="mrw-acts"><button class="btn" data-act="mrw-pay-csv">${ic('download', 18)}CSV 내려받기</button><button class="btn pri" data-act="mrw-pay-send" ${isOwner() || role() === 'sub' ? '' : 'disabled'}>급여 담당자에게 보내기</button></div></div>
      ${note('info', '근로소득 과세 가능성', NOTICE.G, '안내 G')}
      <div class="mrw-split"><div class="mrw-card"><div class="mrw-row wrap"><b class="f1">${esc(ymTxt(ym))} 지급분 1인별 내역</b>${[ym0(), ymAdd(ym0(), -1)].map(m => `<button class="mrw-chip ${m === ym ? 'on' : ''}" aria-pressed="${m === ym}" data-act="mrw-ym" data-v="${m}">${esc(ymTxt(m))}</button>`).join('')}</div>
      <div class="mrw-tw"><table class="mrw-tbl"><thead><tr><th>사번</th><th>소속</th><th>지급 품목</th><th>수량</th><th>지급일</th><th class="mrw-ar">지급 시가</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.amount < 0 ? 'neg' : ''}"><td>${esc(r.emp)}</td><td>${esc(r.dept)}</td><td>${esc(r.item)}</td><td>${r.qty}매</td><td>${esc(md(r.day))}</td><td class="mrw-ar"><b>${r.amount < 0 ? '−' + won(-r.amount) : won(r.amount)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="mrw-mut">이 달 지급 내역이 없습니다.</td></tr>'}
      <tr class="tot"><td colspan="5">합계 · ${new Set(rows.map(r => r.emp)).size}명</td><td class="mrw-ar"><b>${won(tot)}</b></td></tr></tbody></table></div>
      <p class="mrw-mut">${ic('info', 16)} 러닝 포인트를 원으로 바꾸지 않습니다. 실제 지급한 상품의 시가만 적습니다. 이름 · 연락처는 담지 않습니다. 회수한 지급은 음수 행으로 표시합니다.</p></div>
      <div class="mrw-card"><b>보낸 기록</b>${sent.map(s => `<div class="mrw-row">${pill('보냄', 'ok', 'check')}<div class="f1"><b>${esc(ymTxt(s.ym))} 지급분</b><p class="mrw-mut">${esc(s.at)} · ${esc(s.to || '급여 담당')}</p></div></div>`).join('')}
      ${sent.some(s => s.ym === ym) ? '' : `<div class="mrw-row">${pill('보낼 차례', 'wait', 'mrwPause')}<div class="f1"><b>${esc(ymTxt(ym))} 지급분</b><p class="mrw-mut">급여 마감 전에 보내 주십시오.</p></div></div>`}
      ${note('info', '포인트는 성과 평가 지표가 아닙니다', '이 내역은 과세 처리용입니다. 인사 · 성과 평가 자료로 쓰지 않습니다.')}</div></div>`;
  }
  ACT['mrw-ym'] = el => { UI.mrwYm = el.dataset.v; LV.key = ''; render(); };
  const payCols = ['사번', '소속', '지급 품목', '수량', '지급일', '지급 시가(원)'];
  ACT['mrw-pay-csv'] = () => { const ym = UI.mrwYm || ym0(); const rows = payRows(ym); downloadCSV(`리워드숍_1인별지급액_${ym}.csv`, payCols, rows.map(r => [r.emp, r.dept, r.item, r.qty, r.day, r.amount])); logAudit(`리워드 숍 1인별 지급액 내려받기 — ${ym} ${rows.length}행`); save(); };
  ACT['mrw-pay-send'] = () => { const ym = UI.mrwYm || ym0(); const rows = payRows(ym); const tot = rows.reduce((s, r) => s + r.amount, 0);
    ask('급여 담당자에게 보내기', `<p><b>${esc(ymTxt(ym))} 지급분 ${new Set(rows.map(r => r.emp)).size}명 · ${won(tot)}</b>을 급여 담당자에게 보냅니다. 사번 · 소속 · 품목 · 수량 · 지급일 · 시가만 담습니다.</p><label class="mrw-fl"><span>받는 사람(급여 담당 계정)</span><input name="to" value="급여 담당" maxlength="40"></label><p class="mrw-mut">보낸 기록은 감사 기록에 남습니다.</p>`, '확인하고 보내기', m => {
      const to = fv(m, 'to') || '급여 담당';
      if (LIVEON()) { liveDo('POST', '/api/mileage/shop/payouts/send', { ym, to, idem: idem() }, () => toast('보냈습니다.', 'ok')); return; }
      const D = RW(); D.sent = D.sent.filter(s => s.ym !== ym); D.sent.unshift({ ym, at: nowStr(), to }); logAudit(`리워드 숍 1인별 지급액 전달 — ${ym} ${rows.length}행 ${won(tot)} → ${to}`); save(); render(); toast('급여 담당자에게 보냈습니다.', 'ok'); }); };

  /* ── 탭 2: 신청 · 승인 ── */
  const ST = { requested: ['대기', 'wait'], approved: ['승인 · 수령 대기', 'info'], fulfilled: ['이행 완료', 'ok'], rejected: ['반려', 'bad'], cancelled: ['취소', 'off'], reclaimed: ['회수', 'bad'] };
  function apList() { if (LIVEON()) { const a = LV.d.ap; return ((a && (a.items || a.list || a.approvals)) || []).map(mRd); } return RW().redeems.filter(r => r.status === 'requested').sort((a, b) => a.at < b.at ? -1 : 1); }
  function doneList() { if (LIVEON()) { const a = LV.d.done; return ((a && (a.redeems || a.items || a.list)) || []).map(mRd).filter(r => r.status !== 'requested').slice(0, 40); } return RW().redeems.filter(r => r.status !== 'requested').sort((a, b) => a.at < b.at ? 1 : -1).slice(0, 40); }
  function chkCell(r) {
    const C = checks(r); if (!C.length) return pill('확인할 점 없음', 'ok', 'check');
    return C.map(c => `<div class="mrw-chk c-${c.tone}">${c.code === 'guardian' ? pill('보호자 확인 전', 'off', 'mrwParent') : c.tone === 'block' ? pill(c.code === 'bill_pct' ? '상한 초과' : '승인 불가', 'bad', 'mrwLock') : pill('경고', 'wait', 'mrwWarn')}<small>${esc(c.text)}</small>${c.fix != null && c.fix > 0 && canDecide() ? `<button class="btn sm" data-act="mrw-fit" data-v="${esc(r.id)}" data-p="${c.fix}">${ic('mrwWand', 16)}${P(c.fix)}로 맞춤</button>` : ''}</div>`).join('');
  }
  function billCard(r) {
    const w = rwOf(r.rewardId); if (w.kind !== 'tuition') return '';
    const B = billOf(r);
    if (!B) return `<div class="mrw-card"><b>붙일 청구서 · ${esc(r.id)}</b><p class="mrw-mut">열린 청구서가 없습니다. 「매출 · 수납 › 청구」에서 다음 청구를 만들면 자동으로 제안합니다.</p></div>`;
    const attached = B.lines.some(l => l.srcType === 'mileage' && l.srcId === r.id);
    const lines = [...B.lines]; if (!attached && r.status === 'requested') lines.push({ title: `마일리지 차감 · ${P(r.points)}`, amount: -r.won, srcType: 'mileage', srcId: r.id, preview: true });
    const pct = (w.maxUse && w.maxUse.billPct) || REC.billPct; const capW = Math.floor(base(B) * pct / 100); const used = -lines.filter(l => l.srcType === 'mileage').reduce((s, l) => s + l.amount, 0);
    const total = lines.reduce((s, l) => s + l.amount, 0);
    return `<div class="mrw-card mrw-bill" aria-label="청구서 미리보기"><div class="mrw-row wrap"><span class="mrw-ic">${ic('mrwReceipt', 20)}</span><b class="f1">붙일 청구서 · ${esc(r.id)}</b>${attached ? pill('원장에 붙음', 'ok', 'check') : pill('승인하면 이렇게 붙습니다', 'ai')}</div>
      <p class="mrw-mut">${esc(B.id)} · ${esc(who(r))}${B.ym ? ' · ' + esc(ymTxt(B.ym)) : ''}</p>
      <table class="mrw-tbl"><tbody>${lines.map(l => `<tr class="${l.srcType === 'mileage' ? 'mil' + (l.preview ? ' mrw-pv' : '') : ''}"><td>${l.srcType === 'mileage' ? `<b>${esc(l.title)}</b><small>마일리지 차감 줄 · 원천 ${esc(l.srcId)}${l.preview ? ' · 미리보기' : ''}</small>` : `${esc(l.title)}<small>정가 줄</small>`}</td><td class="mrw-ar">${l.amount < 0 ? '−' + won(-l.amount) : won(l.amount)}</td></tr>`).join('')}
      <tr class="tot"><td><b>청구 합계</b></td><td class="mrw-ar"><b>${won(total)}</b></td></tr></tbody></table>
      <div class="mrw-capbar" role="img" aria-label="차감 ${won(used)} / 상한 ${won(capW)}"><i style="width:${Math.min(100, capW ? used / capW * 100 : 0)}%" class="${used > capW ? 'over' : ''}"></i></div>
      <p class="mrw-mut">차감 ${won(used)} · 상한 청구서 ${pct}% = ${won(capW)}${used > capW ? ' — 상한 초과' : ''}. 차감은 정가 줄과 따로 「마일리지 차감」 음수 줄로 붙고, 정가 줄은 바꾸지 않습니다.${B.paid ? ' 이 청구서는 수납이 시작되어 붙일 수 없습니다.' : ''}</p></div>`;
  }
  function viewApprovals() {
    if (LIVEON() && LV.err) return wrap(`<p class="mrw-err" role="alert">${esc(LV.err)}</p>`);
    const f = UI.mrwApF || 'wait'; const A = apList(); const done = f === 'done';
    const rows = done ? doneList() : A.filter(r => f === 'wait' || (f === 'tuition' ? rwOf(r.rewardId).kind === 'tuition' : rwOf(r.rewardId).kind !== 'tuition'));
    const clean = A.filter(r => !checks(r).length);
    const sel = rows.find(r => r.id === UI.mrwSel) || rows.find(r => rwOf(r.rewardId).kind === 'tuition') || null;
    const nT = A.filter(r => rwOf(r.rewardId).kind === 'tuition').length;
    const chips = [['wait', `대기 ${A.length}`], ['tuition', `학원비 차감 ${nT}`], ['goods', `교환 · 쿠폰 ${A.length - nT}`], ['done', '처리 완료']].filter(c => c[0] !== 'tuition' || nT || f === 'tuition');
    const tr = r => { const w = rwOf(r.rewardId); const C = done ? [] : checks(r); const ok = !C.length; const blk = C.some(c => c.tone === 'block'); const s = ST[r.status] || [r.status, ''];
      return `<tr class="${sel && sel.id === r.id ? 'sel' : ''}" data-rd="${esc(r.id)}"><td>${done ? '' : `<label class="mrw-sel"><input type="checkbox" data-chg="mrw-pick" data-v="${esc(r.id)}" ${(UI.mrwPick || []).includes(r.id) ? 'checked' : ''} ${ok ? '' : 'disabled'} aria-label="${esc(r.id)} 선택"></label>`}</td>
        <td><button class="mrw-link" data-act="mrw-sel" data-v="${esc(r.id)}"><b>${esc(who(r))}</b></button><small>${esc(r.id)} · ${esc(md(r.at))} 신청</small></td>
        <td><b>${esc(w.title)}</b><small>${P(r.points)}${w.kind === 'tuition' ? ' = ' + won(r.won) : ''}${r.status === 'requested' ? ' · 사용 대기로 잡아 둠' : ''}</small></td>
        <td>${w.kind === 'tuition' ? (billOf(r) ? `${esc(billOf(r).id)}<small>정가 ${won(base(billOf(r)))}</small>` : '<span class="mrw-mut">청구서 없음</span>') + (r.guardian !== 'na' ? `<small>보호자 ${r.guardian === 'ok' ? '확인 완료' : '확인 대기'}</small>` : '') : `<span class="mrw-mut">${w.kind === 'coupon' ? '개인 쿠폰 발급' : w.kind === 'shop' ? '사내 지급' : '현장 수령'}</span>`}</td>
        <td class="mrw-cc">${done ? pill(s[0], s[1]) + (r.reason ? `<small>${esc(r.reason)}</small>` : '') + (r.fulfil && r.fulfil.couponCode ? `<small>쿠폰 ${esc(r.fulfil.couponCode)}</small>` : '') : chkCell(r)}</td>
        <td class="nw">${done ? doneBtns(r, w) : canDecide() ? `<span class="mrw-row">${blk ? `<button class="btn sm" disabled aria-disabled="true">${ic('mrwLock', 16)}승인</button>` : `<button class="btn sm pri" data-act="mrw-ok" data-v="${esc(r.id)}">승인</button>`}<button class="btn sm redl" data-act="mrw-no" data-v="${esc(r.id)}">반려</button></span>` : '<span class="mrw-mut">조회만</span>'}</td></tr>`; };
    const pick = (UI.mrwPick || []).filter(id => clean.some(r => r.id === id));
    const tbl = `<div class="mrw-tw"><table class="mrw-tbl mrw-ap"><thead><tr><th>선택</th><th>학습자 · 신청</th><th>보상 · 쓸 양</th><th>청구서 · 보호자</th><th>${done ? '결과' : 'AI 확인할 점'}</th><th>처리</th></tr></thead><tbody>${rows.map(tr).join('') || `<tr><td colspan="6"><div class="mrw-empty">${ic('check', 24)}<b>${done ? '처리한 신청이 없습니다' : '승인 대기 신청이 없습니다'}</b><p>학습자가 앱 「내 마일리지 › 보상」에서 신청하면 여기에 쌓입니다.</p></div></td></tr>`}</tbody></table></div>`;
    const side = `<div class="mrw-col">${sel ? billCard(sel) : ''}${A.some(r => rwOf(r.rewardId).kind === 'tuition') || nT ? note('info', '안내 A · 학원비 차감', NOTICE.A) : ''}${minorOrg() ? note('info', '안내 B · 미성년 학습자', NOTICE.B) : ''}<div class="mrw-card mrw-row">${ic('mrwPause', 20)}<span class="f1">반려하면 잡아 둔 마일리지를 바로 돌려주고, 사유를 학습자${minorOrg() ? ' · 보호자' : ''}에게 알립니다.</span></div></div>`;
    return wrap(`<div class="mrw-head"><div><h2>신청 · 승인</h2><p>오래된 순입니다. 승인 · 반려 · 회수는 확인 카드 뒤에 실행합니다.</p></div><div class="mrw-acts">${canDecide() && !done ? `<button class="btn pri" data-act="mrw-bulk" ${clean.length ? '' : 'disabled'}>${ic('check', 18)}확인할 점 없음 ${clean.length}건만 골라 일괄 승인</button>` : ''}</div></div>
      <div class="mrw-row wrap">${chips.map(([k, l]) => `<button class="mrw-chip ${f === k ? 'on' : ''}" aria-pressed="${f === k}" data-act="mrw-apf" data-v="${k}">${esc(l)}</button>`).join('')}${pick.length ? `<button class="btn sm pri" data-act="mrw-bulk" data-v="pick">고른 ${pick.length}건 승인</button>` : ''}</div>
      <div class="mrw-split">${tbl}${side}</div>`);
  }
  function doneBtns(r, w) {
    if (!canDecide()) return '';
    if (r.status === 'approved' && (w.kind === 'goods' || w.kind === 'shop')) return `<span class="mrw-row"><button class="btn sm pri" data-act="mrw-hand" data-v="${esc(r.id)}">수령 확인</button><button class="btn sm redl" data-act="mrw-back" data-v="${esc(r.id)}">취소 · 복원</button></span>`;
    if (r.status === 'fulfilled' && w.cash) return `<button class="btn sm redl" data-act="mrw-back" data-v="${esc(r.id)}">회수</button>`;
    return '';
  }
  ACT['mrw-apf'] = el => { UI.mrwApF = el.dataset.v; UI.mrwSel = ''; render(); };
  ACT['mrw-sel'] = el => { UI.mrwSel = el.dataset.v; render(); };
  ACT['mrw-pick'] = el => { const s = new Set(UI.mrwPick || []); if (el.checked) s.add(el.dataset.v); else s.delete(el.dataset.v); UI.mrwPick = [...s]; render(); };
  const findRd = id => (LIVEON() ? [...apList(), ...doneList()] : RW().redeems).find(r => r.id === id);
  const entry = (D, r, kind, points, extra) => { const e = { id: id8('me_'), sid: r.sid, kind, points, status: 'posted', redeemId: r.id, at: nowStr(), ...(extra || {}) }; D.entries.push(e); return e; };
  /* 시연판 승인 = 서버 mil_redeem_decide와 같은 순서: 다시 검사 → hold 풀기(release) + use → 이행(청구 줄 · 쿠폰 · 재고) */
  function approveDemo(r) {
    const D = RW(), w = rwOf(r.rewardId); const C = checks(r).filter(c => c.tone === 'block'); if (C.length) return { error: C[0].code, text: C[0].text };
    if (r.status !== 'requested') return { error: 'already' };
    const rel = entry(D, r, 'release', r.points); const use = entry(D, r, 'use', -r.points); r.useEntry = use.id; void rel;
    r.decidedBy = S.me.name; r.decidedAt = nowStr(); r.fulfil = r.fulfil || {};
    if (w.kind === 'tuition') { const B = billOf(r); const c0 = charges().find(c => c.bill === B.id); const ch = { id: id8('lc_'), unitId: c0.unitId, sid: c0.sid, itemType: 'etc', title: '마일리지 차감', amount: -r.won, periodYm: c0.periodYm, dueDate: c0.dueDate, srcType: 'mileage', srcId: r.id, status: 'open', createdAt: nowStr(), bill: B.id };
      S.ledger.charges.push(ch); r.fulfil = { chargeId: ch.id, billId: B.id }; r.status = 'fulfilled'; }
    else if (w.kind === 'coupon') { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 8; i++) c += A[Math.floor(Math.random() * A.length)]; r.fulfil = { couponCode: c, validTo: ymdL(new Date(Date.now() + ((w.link || {}).validDays || 30) * 864e5)) }; r.status = 'fulfilled'; }
    else if (w.kind === 'goods' || w.kind === 'shop') { if (w.stock != null) w.stock = Math.max(0, w.stock - (r.qty || 1)); r.status = w.kind === 'shop' ? 'fulfilled' : 'approved'; if (w.kind === 'shop') r.fulfil = { handedAt: today() }; }
    else r.status = 'fulfilled';
    return { ok: true };
  }
  ACT['mrw-fit'] = el => { const r = findRd(el.dataset.v); const p = +el.dataset.p; if (!r || !(p > 0)) return; const w = rwOf(r.rewardId);
    ask('쓸 양 맞추기', `<p><b>${esc(who(r))}</b>의 학원비 차감 신청을 <b>${P(r.points)} → ${P(p)}</b>로 줄입니다. 남는 ${P(r.points - p)}는 바로 돌려줍니다. 신청자에게 바뀐 양을 알립니다.</p>`, '확인하고 맞추기', () => {
      if (LIVEON()) { liveDo('POST', '/api/mileage/approvals/decide', { ids: [r.id], decision: 'adjust', points: p, idem: idem() }, () => toast('쓸 양을 맞췄습니다.', 'ok')); return; }
      const D = RW(); entry(D, r, 'release', r.points - p, { reason: '상한 맞춤' }); r.points = p; r.won = p * ((w.cost && w.cost.wonPerP) || 1); logAudit(`마일리지 신청 맞춤 — ${r.id} ${P(p)}`); save(); render(); toast(`${P(p)}로 맞췄습니다. 이제 승인할 수 있습니다.`, 'ok'); }); };
  ACT['mrw-ok'] = el => { const r = findRd(el.dataset.v); if (!r || !canDecide()) return; const w = rwOf(r.rewardId); const C = checks(r);
    if (C.some(c => c.tone === 'block')) return toast(C.find(c => c.tone === 'block').text, 'warn');
    const warn = C.filter(c => c.tone === 'warn');
    const what = w.kind === 'tuition' ? `청구서 ${esc((billOf(r) || {}).id || '')}에 「마일리지 차감 −${won(r.won)}」 줄을 붙입니다.` : w.kind === 'coupon' ? '본인만 1회 쓸 수 있는 쿠폰 코드를 발급합니다.' : w.kind === 'goods' ? '재고에서 빼고, 현장에서 건넬 때 [수령 확인]을 누릅니다.' : '지급 기록을 남깁니다.';
    ask('승인 확인', `<p><b>${esc(who(r))}</b> · ${esc(w.title)} · <b>${P(r.points)}</b></p><p>${what} 잡아 둔 마일리지는 사용으로 바뀝니다.</p>${warn.map(c => note('warn', '확인할 점', c.text)).join('')}${w.kind === 'tuition' ? billCard(r) : ''}`, warn.length ? '경고를 확인하고 승인' : '승인', () => {
      if (LIVEON()) { liveDo('POST', '/api/mileage/approvals/decide', { ids: [r.id], decision: 'approve', billId: r.billId || undefined, idem: idem() }, () => toast('승인했습니다.', 'ok')); return; }
      const R = approveDemo(r); if (R.error) { toast(R.text || ERRN[R.error] || R.error, 'warn'); return false; }
      logAudit(`마일리지 보상 승인 — ${r.id} ${w.title} ${P(r.points)}${warn.length ? ' (경고 확인: ' + warn.map(c => c.code).join(',') + ')' : ''}`); UI.mrwPick = (UI.mrwPick || []).filter(x => x !== r.id); save(); render(); toast(w.kind === 'coupon' ? `승인했습니다. 쿠폰 ${r.fulfil.couponCode}를 학습자에게 보냈습니다.` : '승인했습니다.', 'ok'); }); };
  ACT['mrw-bulk'] = el => { if (!canDecide()) return; const clean = apList().filter(r => !checks(r).length); const T = el.dataset.v === 'pick' ? clean.filter(r => (UI.mrwPick || []).includes(r.id)) : clean; if (!T.length) return toast('확인할 점 없는 신청이 없습니다.', 'warn');
    ask('일괄 승인', `<p>확인할 점이 없는 <b>${T.length}건 · ${P(T.reduce((s, r) => s + r.points, 0))}</b>을 승인합니다. 확인할 점이 있는 신청은 빠집니다.</p><ul class="mrw-mini">${T.map(r => `<li>${esc(r.id)} · ${esc(who(r))} · ${esc(rwOf(r.rewardId).title)} · ${P(r.points)}</li>`).join('')}</ul>`, `${T.length}건 승인`, () => {
      if (LIVEON()) { liveDo('POST', '/api/mileage/approvals/decide', { ids: T.map(r => r.id), decision: 'approve', idem: idem() }, x => toast(`${(x && Array.isArray(x.results) ? x.results.filter(y => y.ok !== false).length : T.length)}건을 승인했습니다.`, 'ok')); return; }
      let n = 0; T.forEach(r => { if (!approveDemo(r).error) n++; }); logAudit(`마일리지 보상 일괄 승인 — ${n}건`); UI.mrwPick = []; save(); render(); toast(`${n}건을 승인했습니다.`, 'ok'); }); };
  ACT['mrw-no'] = el => { const r = findRd(el.dataset.v); if (!r || !canDecide()) return;
    ask('반려', `<p><b>${esc(who(r))}</b> · ${esc(rwOf(r.rewardId).title)} · ${P(r.points)}을 반려합니다. 잡아 둔 마일리지는 바로 돌려줍니다.</p><label class="mrw-fl"><span>반려 사유(필수 · 학습자${minorOrg() ? ' · 보호자' : ''}에게 보입니다)</span><input name="why" maxlength="120"></label>`, '반려하고 돌려주기', m => { const why = fv(m, 'why'); if (!why) { toast('반려 사유를 입력해 주십시오.', 'warn'); return false; }
      if (LIVEON()) { liveDo('POST', '/api/mileage/approvals/decide', { ids: [r.id], decision: 'reject', reason: why, idem: idem() }, () => toast('반려했습니다.', 'ok')); return; }
      const D = RW(); entry(D, r, 'release', r.points, { reason: why }); r.status = 'rejected'; r.reason = why; r.decidedBy = S.me.name; r.decidedAt = nowStr(); logAudit(`마일리지 보상 반려 — ${r.id} (사유: ${why})`); save(); render(); toast('반려했습니다. 잡아 둔 마일리지를 돌려줬습니다.', 'ok'); }, 'red'); };
  ACT['mrw-hand'] = el => { const r = findRd(el.dataset.v); if (!r) return; ask('수령 확인', `<p>${esc(who(r))}에게 <b>${esc(rwOf(r.rewardId).title)}</b>을 건넸습니다.</p>`, '수령 확인', () => {
    if (LIVEON()) { liveDo('POST', '/api/mileage/redeems/handed', { id: r.id, idem: idem() }, () => toast('수령을 기록했습니다.', 'ok')); return; }
    r.status = 'fulfilled'; r.fulfil = { ...(r.fulfil || {}), handedAt: today() }; logAudit(`마일리지 보상 수령 — ${r.id}`); save(); render(); toast('수령을 기록했습니다.', 'ok'); }); };
  ACT['mrw-back'] = el => { const r = findRd(el.dataset.v); if (!r) return; const w = rwOf(r.rewardId); const before = r.status === 'approved';
    const what = w.kind === 'tuition' ? '청구서의 마일리지 차감 줄을 취소(void)하고' : w.kind === 'coupon' ? '쿠폰을 무효로 하고' : before ? '재고를 되돌리고' : '지급을 회수 처리하고';
    ask(before ? '이행 전 취소' : '회수', `<p><b>${esc(r.id)}</b> · ${esc(w.title)} · ${P(r.points)} — ${what} 마일리지를 복원합니다. 원래 기록은 지우지 않고 반대 줄을 남깁니다.</p><label class="mrw-fl"><span>사유(필수)</span><input name="why" maxlength="120"></label>`, before ? '취소하고 복원' : '회수하고 복원', m => { const why = fv(m, 'why'); if (!why) { toast('사유를 입력해 주십시오.', 'warn'); return false; }
      if (LIVEON()) { liveDo('POST', '/api/mileage/redeems/cancel', { id: r.id, reason: why, mode: before ? 'release' : 'reclaim', idem: idem() }, () => toast('처리했습니다.', 'ok')); return; }
      const D = RW();
      if (w.kind === 'tuition' && r.fulfil && r.fulfil.chargeId) { const ch = charges().find(c => c.id === r.fulfil.chargeId); const paid = ((S.ledger && S.ledger.allocs) || []).some(a => charges().some(c => c.bill === (ch || {}).bill && c.id === a.chargeId)); if (paid) { toast('수납이 시작된 청구서입니다. 환불 절차(매출 · 수납 › 환불)로 처리하면 환불 비율만큼 복원됩니다.', 'warn'); return false; } if (ch) ch.status = 'void'; }
      if (before && w.stock != null) w.stock += (r.qty || 1);
      entry(D, r, 'restore', r.points, { reason: why }); r.status = before ? 'cancelled' : 'reclaimed'; r.reason = why; r.reclaimedAt = nowStr(); if (r.fulfil && r.fulfil.couponCode) r.fulfil.couponVoid = true;
      logAudit(`마일리지 보상 ${before ? '취소' : '회수'} — ${r.id} (사유: ${why})`); save(); render(); toast('처리했습니다. 마일리지를 복원했습니다.', 'ok'); }, 'red'); };

  /* ── 탭 3: 부정 의심 ── */
  const FK = { staff_grant: ['운영자 지급 이상', 'users'], self_grant: ['운영자 본인 · 가족 계정', 'users'], velocity: ['몰아 쌓기(속도)', 'chart'], cap_streak: ['상한 반복 도달', 'chart'], device: ['다계정 · 같은 기기', 'mrwShield'], referral: ['추천 남용', 'users'], retake: ['재응시 반복', 'chart'], progress_jump: ['진도 급상승', 'chart'] };
  function flagList() { if (LIVEON()) { const a = LV.d.fl; return ((a && (a.flags || a.items || a.list)) || []).map(x => ({ id: x.id, kind: x.kind, sid: x.sid, title: x.title || (FK[x.kind] || [x.kind])[0], whoTxt: x.whoTxt || '', evidence: Array.isArray(x.evidence) ? x.evidence : Object.entries(x.evidence || {}).map(([k, v]) => `${k}: ${v}`), heldP: +x.heldPoints || +x.held || 0, status: x.status || 'open', at: x.at || '' })); }
    const D = RW(); return D.flags.map(f => ({ ...f, heldP: D.entries.filter(e => f.held.includes(e.id) && e.status === 'pending').reduce((s, e) => s + e.points, 0) })); }
  function viewFraud() {
    if (LIVEON() && LV.err) return wrap(`<p class="mrw-err" role="alert">${esc(LV.err)}</p>`);
    const F = flagList(); const open = F.filter(f => f.status === 'open'); const held = open.reduce((s, f) => s + f.heldP, 0); const own = isOwner();
    const card = f => { const k = FK[f.kind] || [f.title, 'mrwShield']; const op = f.status === 'open';
      return `<article class="mrw-fr" data-fl="${esc(f.id)}"><div class="mrw-row"><span class="mrw-ic wait">${ic(k[1], 22)}</span><div class="f1"><small>${esc(f.id)} · ${esc(md(f.at))} 탐지</small><b>${esc(f.title || k[0])}</b><p class="mrw-mut">${esc(f.whoTxt || '')}</p></div>
        <div class="mrw-ar">${op ? pill('보류 중', 'wait', 'mrwPause') : f.status === 'cleared' ? pill('문제없음 · 보류 풀림', 'ok', 'check') : pill('취소 확정', 'bad', 'x')}<b class="big">${P(f.heldP || 0)}</b><small>${op ? '적립 보류 · 아직 취소 안 됨' : esc(f.reason || '')}</small></div></div>
        <div><small class="mrw-k">탐지 근거 · 개인정보 없이 기록</small>${(f.evidence || []).map(t => `<div class="mrw-ev">${ic(/해시/.test(t) ? 'mrwShield' : 'chart', 18)}<span>${esc(t)}</span></div>`).join('')}</div>
        ${f.kind === 'staff_grant' || f.kind === 'self_grant' ? lock('운영자 본인 · 가족 계정 지급 금지', '강사 · 운영자 본인이나 가족(같은 연락처 해시) 계정에는 마일리지를 줄 수 없습니다. 해시가 일치한 계정이 가족 계정으로 확인되면 해당 지급은 취소 확정 대상입니다.') : note('info', '이후 적립은 보류로 쌓입니다', '확인 전까지 이 학습자의 새 적립은 「적립 예정」으로 보이고, 학습자에게는 문의 경로가 안내됩니다.')}
        ${op ? `<div class="mrw-row wrap"><span class="mrw-mut f1">처리 사유는 변경 이력과 감사 기록에 남습니다.</span>${own ? `<button class="btn" data-act="mrw-fl" data-v="${esc(f.id)}" data-d="clear">${ic('check', 18)}문제없음 · 보류 풀기</button><button class="btn red" data-act="mrw-fl" data-v="${esc(f.id)}" data-d="confirm">${ic('x', 18)}취소 확정</button>` : '<span class="mrw-mut">정운영자가 처리합니다.</span>'}</div>` : ''}</article>`; };
    const RULES = [['몰아 쌓기(속도)', '1시간 안 적립 건수 초과 · 제출 간격이 지나치게 짧음(C 사건)', '이후 적립 보류 + 알림'], ['상한 반복 도달', '하루 상한을 7일 연속 채움', '표시만'], ['다계정 · 추천 남용', '같은 기기 · IP에서 여러 계정, 지급 직후 탈퇴', '추천 적립 보류'], ['재응시 반복', '같은 시험 반복 응시', '시험마다 1회라 지급 안 됨 · 시도 수만 표시'], ['운영자 지급 이상', '직원 1명의 하루 지급이 기준 초과', '정운영자 확인 필요'], ['운영자 본인 · 가족 계정', '같은 연락처 해시', '지급 차단(제품 고정)']];
    return wrap(`<div class="mrw-head"><div><h2>부정 의심</h2><p>${orgType() === 'voc' ? 'HRD-Net 부정훈련 의심(여러 IP 접속 · 하루 학습시간 초과)과 함께 확인하십시오. ' : ''}자동으로 취소하지 않습니다. 보류 → 운영자 확정 → 취소 순서입니다.</p></div></div>
      <div class="mrw-row wrap stretch">${note('info', '자동으로 취소하지 않습니다', `의심 적립은 먼저 보류하고, 운영자가 근거를 확인한 뒤 「취소 확정」해야 취소됩니다. 지금 보류 ${open.length}건 · ${P(held)}입니다.`)}<div class="mrw-kpi"><span>${ic('mrwPause', 16)}보류 중인 적립</span><b>${P(held)}</b><small>${open.length}건 · 금전성 보상에 쓸 수 없음</small></div></div>
      ${F.length ? `<div class="mrw-g2">${F.map(card).join('')}</div>` : `<div class="mrw-empty">${ic('mrwShield', 28)}<b>부정 의심이 없습니다</b><p>탐지되면 여기에 보류 카드로 쌓입니다.</p></div>`}
      <div class="mrw-card"><div class="mrw-row wrap"><b class="f1">이 기관의 탐지 기준</b><span class="mrw-mut">기록: 연락처 해시 · 기기 지문 해시 · IP 앞자리 · 사건 ID</span></div><div class="mrw-tw"><table class="mrw-tbl"><thead><tr><th>의심 유형</th><th>탐지</th><th>기본 처리</th></tr></thead><tbody>${RULES.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${/고정/.test(c) ? locktag(c) : esc(c)}</td></tr>`).join('')}</tbody></table></div></div>`);
  }
  ACT['mrw-fl'] = el => { if (!isOwner()) return; const id = el.dataset.v, dec = el.dataset.d; const f = flagList().find(x => x.id === id); if (!f) return; const conf = dec === 'confirm';
    ask(conf ? '취소 확정' : '문제없음 · 보류 풀기', `<p><b>${esc(f.title)}</b> · 보류 ${P(f.heldP)}</p><p>${conf ? '보류된 적립을 취소(void)하고, 이 적립으로 받은 보상이 있으면 회수합니다. 학습자에게 사유가 보입니다.' : '보류된 적립을 확정합니다. 학습자 잔액에 들어갑니다.'}</p><label class="mrw-fl"><span>처리 사유(필수)</span><input name="why" maxlength="120"></label>`, conf ? '취소 확정' : '보류 풀기', m => { const why = fv(m, 'why'); if (!why) { toast('처리 사유를 입력해 주십시오.', 'warn'); return false; }
      if (LIVEON()) { liveDo('POST', '/api/mileage/flags/resolve', { id, decision: conf ? 'confirm' : 'clear', reason: why, idem: idem() }, () => toast('처리했습니다.', 'ok')); return; }
      const D = RW(); const F0 = D.flags.find(x => x.id === id); D.entries.forEach(e => { if (F0.held.includes(e.id) && e.status === 'pending') e.status = conf ? 'void' : 'posted'; });
      if (conf) { const sids = new Set(D.entries.filter(e => F0.held.includes(e.id)).map(e => e.sid)); D.redeems.filter(r => sids.has(r.sid) && r.status === 'requested').forEach(r => { entry(D, r, 'release', r.points, { reason: '부정 확정' }); r.status = 'cancelled'; r.reason = '부정 의심 확정으로 취소'; }); }
      F0.status = conf ? 'confirmed' : 'cleared'; F0.reason = why; F0.resolvedBy = S.me.name; F0.resolvedAt = nowStr(); logAudit(`마일리지 부정 의심 ${conf ? '취소 확정' : '문제없음'} — ${id} (사유: ${why})`); save(); render(); toast(conf ? '취소를 확정했습니다.' : '보류를 풀었습니다.', 'ok'); }, conf ? 'red' : 'pri'); };

  /* ── 시연판 학습자 · 보호자 앱 이벤트(lmil.js가 lpxPush) ── */
  if (typeof LPX !== 'undefined') {
    LPX['mile-redeem'] = x => { const D = RW(); if (!D || D.live) return; const d = x.data || {}; const w = D.rewards.find(r => r.id === d.rewardId); if (!w || !w.active) return; const k = String(d.idem || x.at || ''); if (D.redeems.some(r => r.idem === k)) return;
      const p = Math.max(0, Math.round(+d.points || w.cost.fixedP || 0)); const r = { id: d.id || 'mrd_' + id8(''), sid: x.who || d.sid, rewardId: w.id, points: p, won: w.kind === 'tuition' ? p * ((w.cost && w.cost.wonPerP) || 1) : 0, status: 'requested', guardian: w.kind === 'tuition' && minorOrg() ? 'wait' : 'na', billId: d.billId || '', at: nowStr(), idem: k };
      D.redeems.push(r); r.holdEntry = entry(D, r, 'hold', -p).id; if (w.approval === 'auto' && !checks(r).length) approveDemo(r); };
    LPX['mile-redeem-cancel'] = x => { const D = RW(); if (!D || D.live) return; const r = D.redeems.find(z => z.id === (x.data || {}).id && z.status === 'requested'); if (!r) return; entry(D, r, 'release', r.points, { reason: '학습자 취소' }); r.status = 'cancelled'; r.reason = '학습자 취소'; };
    LPX['mile-guardian'] = x => { const D = RW(); if (!D || D.live) return; const d = x.data || {}; const r = D.redeems.find(z => z.id === d.id && z.status === 'requested'); if (!r) return; if (d.ok === false) { entry(D, r, 'release', r.points, { reason: '보호자 거절' }); r.status = 'rejected'; r.reason = '보호자가 거절했습니다.'; } else r.guardian = 'ok'; };
  }

  /* ── 탭 등록(mil.js의 MIL_TABS) ── */
  const pull = tab => { ensure(); if (LIVEON()) livePull(tab); };
  const nAp = () => { try { ensure(); return apList().length; } catch (e) { return 0; } };
  const nFl = () => { try { ensure(); return flagList().filter(f => f.status === 'open').length; } catch (e) { return 0; } };
  const push = t => { const i = TABS.findIndex(x => x.id === t.id); if (i >= 0) TABS.splice(i, 1, t); else TABS.push(t); };
  push({ id: 'rewards', label: '보상', order: 30, render: () => { pull('rewards'); return viewRewards(); } });
  push({ id: 'approvals', label: '신청 · 승인', order: 40, badge: nAp, render: () => { pull('approvals'); return viewApprovals(); } });
  push({ id: 'fraud', label: '부정 의심', order: 60, badge: nFl, render: () => { pull('fraud'); return viewFraud(); } });

  window.milrw = { ensure, checks: id => { const r = findRd(id); return r ? checks(r) : []; }, billOf: id => { const r = findRd(id); return r ? billOf(r) : null; }, payRows, approveDemo: id => approveDemo(findRd(id)), live: LV };
})();
