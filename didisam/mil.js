/* v42 학습 마일리지 — 스튜디오(운영자, 합니다체) 「마일리지」 화면. 메뉴 id 'mileage'(공간 people).
   제도 기본 끔(D2) → 켜기 마법사(① 쓸지 · 목적 · 예산 → ② 권장 정책안 · 모의 계산 · 확인할 점 → ③ 보상 고르기 · ④ 학습자 안내문 · ⑤ 확인하고 켜기).
   켠 뒤 탭: 한눈에 · 적립 규칙 · 내역 · 설정 · 변경 이력(+ 보상 요원 milrw.js가 window.MIL_TABS.push로 끼우는 탭).
   시연판: 브라우저 문서 S.mileage. 운영: /api/mileage/*(docs/mileage/04-data-api.md §5.1)가 주인.
   계산은 milecalc.js(window.mileCalc) — 없거나 함수가 빠지면 아래 SHIM(같은 함수 이름)으로 대신한다.
   제품 고정(국비 과정 금전성 차단 · 원장 불변 · 본인 지급 금지 · 본사 통합 잠금)은 화면 표시만 하고, 강제는 서버(SQL mil_*)가 한다.
   지급 · 취소 · 제도 켜고 끄기 · 순위 · 감점 켜기는 확인 카드 후 실행하고 변경 이력에 남긴다.

   탭 끼우기(보상 요원 등):
     window.MIL_TABS = window.MIL_TABS || [];
     MIL_TABS.push({ id: 'rewards', label: '보상', order: 30,        // render 또는 view(같은 뜻) · order: 10 한눈에 · 20 적립 규칙 · 50 내역 · 80 설정 · 90 변경 이력
       roles: ['owner', 'sub'],                                       // 생략하면 모든 역할
       show: () => true,                                              // 생략 가능. false면 탭 숨김
       view: () => '<div>…</div>',                                    // 탭 본문 HTML(합니다체)
       badge: () => 3,                                                // 생략 가능. 탭 옆 숫자
       todo: () => [{ n: 3, text: '보상 신청 3건을 확인하십시오', tab: 'approve' }] }); // 생략 가능. 「한눈에 › 지금 할 일」
     공용 도구는 window.MIL(아래 맨 끝) — 상태 · 계산 · 운영 서버 호출 · 확인 카드 · 변경 이력 기록. */
(function () {
  'use strict';
  if (typeof MENU === 'undefined' || typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;
  window.MIL_TABS = window.MIL_TABS || [];
  [['mile', '<circle cx="12" cy="12" r="9"/><path d="M7 16h3v-3h3v-3h3"/>'], ['lock', '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'], ['unlock', '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'],
    ['info', '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'], ['warn', '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h.01"/>'], ['clock', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    ['history', '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'], ['shield', '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'], ['rules', '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'],
    ['wallet', '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/>'], ['gift', '<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/>'],
    ['pause', '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>'], ['play', '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>'], ['plus', '<path d="M12 5v14M5 12h14"/>'], ['minus', '<path d="M5 12h14"/>'],
    ['chev', '<path d="M9 6l6 6-6 6"/>'], ['back', '<path d="M15 6l-6 6 6 6"/>'], ['download', '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>'], ['eye', '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'],
    ['bell', '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>'], ['flag', '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'], ['store', '<path d="M4 9l2-5h12l2 5M4 9h16v11H4zM9 20v-6h6v6"/>'], ['stop', '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6"/>'],
    ['edit', '<path d="M4 20h4L19 9l-4-4L4 16z"/>'], ['refresh', '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>'], ['inbox', '<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5"/>'], ['user', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
    ['league', '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>'], ['receipt', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>'], ['medal', '<circle cx="12" cy="15" r="5"/><path d="M8 3l4 7 4-7"/>'], ['ticket', '<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3z"/>'], ['ai', '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>']
  ].forEach(([k, v]) => { if (typeof IC !== 'undefined' && !IC[k]) IC[k] = v; });

  /* ── 도우미 ── */
  const LIVEON = () => typeof LIVE !== 'undefined' && LIVE && LIVE.tenant && typeof api === 'function';
  const n = v => (Math.round(+v || 0)).toLocaleString('ko-KR');
  const tail = s => String(s || '').slice(-4);
  const who = sid => `학습자 ···${tail(sid) || '----'}`;
  const idem = () => 'ui_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ('0000000' + (h >>> 0).toString(16)).slice(-8); };
  const clone = o => JSON.parse(JSON.stringify(o == null ? null : o));
  const addM = (d, m) => { const t = new Date(String(d).slice(0, 10) + 'T12:00:00'); t.setMonth(t.getMonth() + m); return ymdL(t); };
  const addD = (d, k) => { const t = new Date(String(d).slice(0, 10) + 'T12:00:00'); t.setDate(t.getDate() + k); return ymdL(t); };
  const ym = d => String(d || '').slice(0, 7);
  const owner = () => S.me && S.me.role === 'owner';
  const teacher = () => S.me && S.me.role === 'teacher';
  const minor = () => S.org.type === 'k12' || !!(P().minorOrg);
  const NAT = { achievement: '성취형', participation: '참여형' };
  const TRN = { A: '서버 확인', B: '운영자 확정', C: '기기 보고' };
  const KIND = { earn: '적립', use: '사용', hold: '사용 대기', release: '대기 해제', expire: '소멸', cancel: '취소', adjust: '조정', restore: '복원', penalty: '감점' };
  const ONCE = { none: '제한 없음', ever: '평생 1회', per_src: '대상마다 1회', per_day: '하루 1회' };
  const APPR = { auto: '자동', manual: '운영자 확인', over: '기준 넘으면 확인', evidence: '증빙 → 담당자 확인', two_step: '2단계(담당 → 기관)' };
  const AREA = { policy: '설정 · 예산', rule: '적립 규칙', reward: '보상', rank_penalty: '순위 · 감점', funded: '국비 지원 과정', onoff: '제도 켜고 끄기' };

  /* 트리거(03 §2.2): [이름, 기본 1회성, 기본 신뢰, 성격, 학습자 문장] */
  const TRIG = {
    signup: ['가입', 'ever', 'A', 'participation', '가입하면 {P}'], first_login: ['첫 로그인', 'ever', 'A', 'participation', '처음 로그인하면 {P}'],
    attend_day: ['출석(하루 학습)', 'per_day', 'A', 'participation', '하루 20분 이상 학습하면 {P}'], streak: ['연속 학습 마일스톤', 'per_src', 'A', 'participation', '7 · 30 · 100일 연속 학습하면 {P}'],
    lesson_done: ['차시 완료', 'per_src', 'A', 'achievement', '차시를 마치면 {P}'], course_done: ['과정 이수', 'per_src', 'B', 'achievement', '과정을 이수하면 {P}'],
    exam_score: ['시험 점수', 'per_src', 'A', 'achievement', '시험에서 기준 점수를 넘으면 {P}'], assign_submit: ['과제 제출', 'per_src', 'A', 'achievement', '과제를 기한 안에 내면 {P}'],
    survey_done: ['설문 응답', 'per_src', 'A', 'achievement', '설문에 답하면 {P}'], noncredit_done: ['비교과 이수', 'per_src', 'A', 'achievement', '비교과 프로그램을 이수하면 프로그램 마일리지만큼'],
    review_ok: ['후기 작성', 'per_src', 'B', 'achievement', '수료 후 후기를 남기면 {P}'], referral_ok: ['추천', 'per_src', 'A', 'achievement', '추천한 친구가 첫 결제 후 14일이 지나면 {P}'],
    tube_goal: ['오늘 목표 달성', 'per_day', 'C', 'participation', '오늘 목표를 채우면 {P}'], evidence: ['증빙 실적', 'per_src', 'B', 'achievement', '자격증 · 어학 점수를 증빙하면 {P}'],
    manual: ['운영자 · 강사 지급', 'none', 'B', 'achievement', '선생님 칭찬으로 {P}']
  };
  const FIXED_PAR = ['signup', 'first_login', 'attend_day', 'tube_goal'];

  /* ── 기관 유형별 권장 정책안 8종(03 §5). 숫자는 모두 「권장값」(D2) ── */
  const R = (k, trigger, v, o = {}) => { const T = TRIG[trigger]; return { id: 'mru_' + k, ver: 1, trigger, nature: FIXED_PAR.includes(trigger) ? 'participation' : (o.nat || T[3]), label: o.label || T[0], say: o.say || T[4],
    cond: o.cond || {}, score: o.bands ? { mode: 'band', bands: o.bands } : o.src ? { mode: 'source' } : o.range ? { mode: 'fixed', v: o.range[1], range: o.range } : o.per ? { mode: 'per_unit', v, unit: o.per } : { mode: 'fixed', v },
    caps: o.caps || {}, once: o.once || T[1], groupKey: o.group || null, trustMin: o.trust || T[2], approval: o.ok || 'auto', approveOver: o.over || null, expiry: o.ex || null, record: o.record || null, active: o.on !== false, startsOn: null, endsOn: null }; };
  const W = (k, kind, title, o = {}) => ({ id: 'mrw_' + k, kind, title, cost: o.cost || { fixedP: o.p || 0 }, minUse: o.min || 0, maxUse: o.max || {}, step: o.step || 0, threshold: o.th || 0, stock: o.stock == null ? null : o.stock, perSid: o.perSid || {},
    approval: o.ok || 'manual', cash: ['tuition', 'coupon', 'goods', 'scholar', 'shop'].includes(kind), audience: { excludeFunded: true }, link: o.link || {}, active: true, soft: o.soft || '', note: o.note || '', pick: o.pick !== false });
  const TPL = {
    adult: { name: '① 성인 학원 · 온라인', unit: '포인트', ab: 'P', won: true, dayCap: 500, tCap: 0, league: false, expiry: 12, rules: [R('a1', 'lesson_done', 2, { caps: { day: 20 } }), R('a2', 'course_done', 1000), R('a3', 'exam_score', 300, { cond: { minScore: 80 }, say: '시험에서 80점 이상이면 {P}' }), R('a4', 'review_ok', 300), R('a5', 'referral_ok', 1000, { caps: { month: 3000 }, say: '추천한 친구가 첫 결제 후 14일이 지나면 {P}(월 3명까지)' }), R('a6', 'streak', 100), R('a7', 'tube_goal', 10)],
      rewards: [W('a1', 'coupon', '다음 결제 할인 쿠폰', { p: 3000, cost: { fixedP: 3000, wonPerP: 1 } }), W('a2', 'tuition', '학원비 차감', { cost: { perUnitP: 1, wonPerP: 1 }, min: 1000, step: 100, max: { billPct: 30 } }), W('a3', 'goods', '굿즈 교환', { p: 2000, stock: 30, perSid: { month: 1 } }), W('a4', 'badge', '과정 완주 배지', { ok: 'auto' })] },
    k12: { name: '② 초중고 학원', unit: '포인트', ab: 'P', won: true, dayCap: 500, tCap: 5000, league: false, guardian: true, expiry: 12, rules: [R('k1', 'assign_submit', 100, { caps: { day: 300 } }), R('k2', 'exam_score', 300, { cond: { target: true }, label: '테스트 목표 점수', say: '단원평가 목표 점수를 넘으면 {P}' }), R('k3', 'exam_score', 300, { cond: { improve: 10 }, label: '점수 향상', say: '지난 시험보다 10점 오르면 {P}', caps: { month: 1000 } }), R('k4', 'streak', 300, { label: '연속 출석 마일스톤', say: '4주 연속 출석하면 {P}' }), R('k5', 'manual', 200, { range: [50, 200], label: '강사 칭찬 지급', ok: 'manual' })],
      rewards: [W('k1', 'tuition', '학원비 차감', { cost: { perUnitP: 1, wonPerP: 1 }, min: 1000, step: 100, max: { billPct: 30 }, note: 'guardian' }), W('k2', 'goods', '문제집 교환', { p: 3000, stock: 20, perSid: { month: 1 } }), W('k3', 'goods', '필통 · 노트 세트', { p: 1500, stock: 10, perSid: { month: 1 } }), W('k4', 'badge', '4주 연속 출석 배지', { ok: 'auto' })] },
    univ_lite: { name: '③ 대학 라이트(사업단 · ATC)', unit: '마일리지', ab: '점', won: false, dayCap: 200, tCap: 0, league: false, expiry: 'term_end', rules: [R('u1', 'noncredit_done', 0, { src: true }), R('u2', 'course_done', 30, { label: '특강 출석', say: '특강에 출석하면 {P}', caps: { term: 120 } }), R('u3', 'survey_done', 10, { nat: 'participation', caps: { term: 30 }, say: '설문에 답하면 {P}(장학 정산 제외)' }), R('u4', 'exam_score', 50, { label: 'AI 역량진단 완료', cond: { diag: true }, say: 'AI 역량진단을 마치면 {P}' }), R('u5', 'course_done', 200, { label: '과정 이수' }), R('u6', 'evidence', 40, { range: [20, 40], group: 'cert_lang', caps: { term: 100 }, ok: 'evidence', ex: { mode: 'months', months: 24 } })],
      rewards: [W('u1', 'badge', 'AI 역량 디지털 배지', { ok: 'auto' }), W('u2', 'cert', '역량우수 인증서', { ok: 'auto', th: 300 }), W('u3', 'goods', '학생식당 식권', { p: 50, stock: 100, perSid: { month: 2 }, pick: false })] },
    univ_lms: { name: '④ 대학 학사 LMS', unit: '마일리지', ab: '점', won: false, dayCap: 200, tCap: 0, league: false, expiry: 'term_end', rules: [R('l1', 'noncredit_done', 0, { src: true }), R('l2', 'assign_submit', 5, { caps: { term: 50 } }), R('l3', 'survey_done', 10, { nat: 'participation', label: '강의평가 응답', say: '강의평가에 답하면 {P}' }), R('l4', 'evidence', 40, { range: [20, 40], group: 'cert_lang', caps: { term: 100 }, ok: 'evidence', ex: { mode: 'months', months: 24 } })],
      rewards: [W('l1', 'badge', '역량 인증 디지털 배지', { ok: 'auto' }), W('l2', 'cert', '역량우수 기록', { ok: 'auto', th: 300 })] },
    corp: { name: '⑤ 기업', unit: '러닝 포인트', ab: 'LP', won: false, dayCap: 600, tCap: 0, league: true, expiry: 12, rules: [R('c1', 'course_done', 300, { label: '필수교육 기한 내 이수', cond: { required: true }, say: '필수교육을 기한 안에 마치면 {P}' }), R('c2', 'course_done', 200), R('c3', 'exam_score', 100, { label: '평가 기준 점수 이상', say: '평가를 통과하면 {P}' }), R('c4', 'review_ok', 50, { label: '지식 공유(후기)', say: '배운 점을 남기면 {P}', caps: { month: 200 } }), R('c5', 'lesson_done', 1, { per: 60, label: '학습 시간 인정', say: '1시간 학습할 때마다 {P}(지표용)' })],
      rewards: [W('c1', 'badge', '데이터 리터러시 인증 배지', { ok: 'auto' }), W('c2', 'cert', '학습 우수 인증서', { ok: 'auto', th: 1000 }), W('c3', 'shop', '리워드 숍(복지몰 · 기프티콘)', { p: 300, pick: false, note: 'tax' })] },
    public: { name: '⑥ 공공', unit: '학습 마일리지', ab: '점', won: false, dayCap: 200, tCap: 0, league: false, expiry: 'year', rules: [R('p1', 'course_done', 100, { caps: { year: 600 } }), R('p2', 'exam_score', 50, { label: '시험 통과', say: '시험을 통과하면 {P}' }), R('p3', 'evidence', 30, { label: '학습동아리 · 봉사 기록', say: '학습동아리 활동을 기록하면 {P}', caps: { month: 60 }, ok: 'manual' })],
      rewards: [W('p1', 'cert', '우수 학습자 인증서', { ok: 'auto', th: 300 }), W('p2', 'badge', '학습 마일리지 배지', { ok: 'auto' }), W('p3', 'goods', '지역 서점 교환권', { p: 300, soft: 'C', pick: false })] },
    lifelong: { name: '⑦ 평생교육원', unit: '포인트', ab: 'P', won: true, dayCap: 300, tCap: 0, league: false, expiry: 12, rules: [R('f1', 'attend_day', 10), R('f2', 'course_done', 500, { label: '과정 수료' }), R('f3', 'review_ok', 200), R('f4', 'referral_ok', 500, { caps: { month: 1500 } })],
      rewards: [W('f1', 'coupon', '차기 강좌 쿠폰', { p: 5000, cost: { fixedP: 5000, wonPerP: 1 } }), W('f2', 'tuition', '수강료 일부 감면', { cost: { perUnitP: 1, wonPerP: 1 }, min: 1000, step: 100, max: { billPct: 30 }, note: 'voucher' }), W('f3', 'goods', '도서 교환권', { p: 3000, stock: 20 }), W('f4', 'cert', '이수 기록', { ok: 'auto' })] },
    voc: { name: '⑧ 직업훈련', unit: '훈련 마일리지', ab: '점', won: false, dayCap: 200, tCap: 0, league: false, expiry: 'course', rules: [R('v1', 'attend_day', 10), R('v2', 'lesson_done', 5, { caps: { day: 40 }, say: '차시를 마치면 {P}(하루 8차시까지)' }), R('v3', 'exam_score', 50, { label: '단위 평가 기준 점수', say: '단위 평가 기준 점수를 넘으면 {P}' }), R('v4', 'course_done', 300, { label: '수료' })],
      rewards: [W('v1', 'badge', '훈련 성실 배지', { ok: 'auto' }), W('v2', 'cert', '수료 우수 기록', { ok: 'auto' })] }
  };
  const tplKey = () => S.org.type === 'univ' ? (S.org.ed === 'lms' ? 'univ_lms' : 'univ_lite') : (TPL[S.org.type] ? S.org.type : 'adult');
  const tpl = () => TPL[tplKey()];
  const EXPIRY_OF = e => e === 'term_end' ? { mode: 'term_end' } : e === 'year' ? { mode: 'year' } : e === 'course' ? { mode: 'months', months: 6, after: 'course' } : { mode: 'months', months: +e || 12 };
  function policyDefault() { const T = tpl(); const p = { on: false, ver: 0, template: tplKey(), unitName: T.unit, ab: T.ab, won: !!T.won, expiry: EXPIRY_OF(T.expiry), afterLeave: 'keep',
    notice: { monthsBefore: 6, daysBefore: [30, 3] }, budget: { monthP: 0 }, dailyCapTotal: T.dayCap, teacherCap: T.tCap, manualOver: 1000,
    league: { on: !!T.league, size: 10, reset: 'week' }, streak: { minMin: 20, freezePerWeek: 1, repair: { withinH: 48, factor: 2, perMonth: 1 }, breakNotice: false },
    scope: { mode: 'unit', hqPool: false }, tiers: [{ name: '시작', min: 0 }, { name: '성장', min: 1500 }, { name: '도약', min: 4000 }, { name: '으뜸', min: 8000 }], tierWindow: S.org.type === 'univ' ? 'term' : S.org.type === 'corp' ? 'year' : 'm12',
    cashLock: { needTrust: 'B', achievementOnly: true }, sunset: null, guardian: !!T.guardian, nightBatch: true, minorOrg: S.org.type === 'k12',
    rank: { on: false, scope: 'near10', name: 'nick', ack: null, checks: [] }, penalty: { on: false, reasons: [], maxOnce: 0, dayCap: 0, ack: null } };
    p.recommended = { expiry: clone(p.expiry), notice: clone(p.notice), dailyCapTotal: p.dailyCapTotal, teacherCap: p.teacherCap, manualOver: p.manualOver, cashLock: clone(p.cashLock), billPct: 30, rank: false, penalty: false, league: !!T.league, rules: {} };
    T.rules.forEach(r => { p.recommended.rules[r.id] = { score: clone(r.score), caps: clone(r.caps), once: r.once, trustMin: r.trustMin, approval: r.approval, active: r.active, nature: r.nature }; });
    return p; }

  /* ── 계산(milecalc.js가 주인, 없으면 SHIM) ── */
  const trustN = t => ({ A: 3, B: 2, C: 1 }[t] || 1);
  const scoreOf = (r, ev) => { const s = r.score || {}; if (s.mode === 'source') return Math.max(0, Math.round(+ev.value || 0)); if (s.mode === 'band') { let p = 0; (s.bands || []).forEach(([m, v]) => { if (+ev.value >= m) p = Math.max(p, v); }); return p; }
    if (s.mode === 'per_unit') return Math.floor((+ev.value || 0) / (s.unit || 1)) * (+s.v || 0); if (s.range && ev.value) return Math.max(s.range[0], Math.min(s.range[1], Math.round(+ev.value))); return +s.v || 0; };
  const condOk = (r, ev) => { const c = r.cond || {}; if (c.minScore && !(+ev.value >= c.minScore)) return false; if (c.improve && !((+ev.value || 0) - (+ev.prev || 0) >= c.improve)) return false; if (c.target && !(+ev.value >= (+ev.target || 80))) return false;
    if (c.diag && !ev.diag) return false; if (!c.diag && ev.diag) return false; if (c.required && !ev.required) return false; if (c.cls && c.cls !== '*' && ev.clsId !== c.cls) return false; return true; };
  const expOf = (pol, r, at) => { const e = (r && r.expiry) || pol.expiry || {}; const d = String(at).slice(0, 10); if (e.mode === 'none') return null; if (e.mode === 'term_end') { const y = +d.slice(0, 4), m = +d.slice(5, 7); return m <= 2 ? `${y}-02-28` : m <= 8 ? `${y}-08-31` : `${y + 1}-02-28`; }
    if (e.mode === 'year') return d.slice(0, 4) + '-12-31'; return addM(d, +e.months || 12); };
  const capKey = (k, d) => k === 'day' ? d : k === 'week' ? addD(d, -((new Date(d + 'T12:00:00').getDay() + 6) % 7)) : k === 'month' ? ym(d) : k === 'year' ? d.slice(0, 4) : k === 'term' ? d.slice(0, 4) + (+d.slice(5, 7) <= 8 ? 'a' : 'b') : 'all';
  /* milecalc.js(N 요원, window.MileCalc) 엔진으로 사건을 돌린다. 엔진에 없는 조건(점수 향상 · 목표 점수 · 진단 · 필수교육)은 사건마다 규칙을 먼저 걸러 넘긴다 */
  const toMs = v => v == null || v === '' ? null : typeof v === 'number' ? v : Date.parse(String(v).length <= 10 ? v + 'T12:00:00+09:00' : String(v).replace(' ', 'T') + (String(v).length <= 16 ? ':00+09:00' : ''));
  const fromMs = (v, dateOnly) => { if (v == null) return null; const d = new Date(+v + 9 * 3600e3).toISOString(); return dateOnly ? d.slice(0, 10) : d.slice(0, 10) + ' ' + d.slice(11, 16); };
  function engApply(ENG, pol, rules, events, prior) { const engRules = rules.map(r => { const c = Object.assign({}, r); delete c.cond; c.cond = (r.cond && r.cond.minScore != null) ? { minScore: r.cond.minScore } : {}; if (r.score && r.score.range) c.score = { mode: 'source' }; return c; });
    const fund = {}; (pol.fundedCls || []).forEach(id => { fund[id] = true; });
    const E0 = prior.filter(e => e.status !== 'void').map(e => Object.assign({}, e, { unit: e.scopeUnit || 'lu_root', at: toMs(e.at), expiresAt: e.expiresAt ? toMs(e.expiresAt) : null, postedAt: e.postedAt ? toMs(e.postedAt) : null }));
    const eng = ENG.create({ policy: { isOn: true, ver: pol.ver || 1, expiry: pol.expiry && pol.expiry.mode === 'year' ? { mode: 'months', months: 12 } : pol.expiry, dailyCapTotal: pol.dailyCapTotal || null, cashLock: pol.cashLock, budget: (pol.budget && +pol.budget.monthP) ? { monthP: +pol.budget.monthP } : {}, streak: { freezePerWeek: 1, milestones: [] }, sunset: pol.sunset || null }, rules: engRules, entries: E0, funded: fund });
    const n0 = eng.S.entries.length; const skipped = [];
    events.slice().sort((a, b) => String(a.at).localeCompare(String(b.at))).forEach(ev => { eng.S.rules = engRules.filter((r, i) => condOk(rules[i], ev)); const R0 = rules.find(r => r.score && r.score.range && r.trigger === ev.trigger);
      const v = R0 && ev.value != null ? Math.max(R0.score.range[0], Math.min(R0.score.range[1], +ev.value)) : ev.value;
      const res = eng.emit({ sid: ev.sid, trigger: ev.trigger, srcType: ev.srcType || 'x', srcId: ev.srcId, value: v, trust: ev.trust || 'B', cls: ev.clsId || null, at: toMs(String(ev.at || today()).length <= 10 ? String(ev.at || today()) : ev.at), unit: ev.unit || 'lu_root' });
      if (res && res.status !== 'done') skipped.push({ ev, reason: res.reason }); });
    const RN = {}; rules.forEach(r => { RN[r.id] = r.label; });
    const entries = eng.S.entries.slice(n0).map(e => ({ id: e.id + Math.random().toString(36).slice(2, 5), sid: e.sid, scopeUnit: e.unit, kind: e.kind, points: e.points, status: e.status, nature: e.nature, trust: e.trust, convertible: !!e.convertible, funded: !!e.funded, clsId: e.cls || null, ruleId: e.ruleId, ruleVer: e.ruleVer, eventId: e.eventId, expiresAt: fromMs(e.expiresAt, true), reason: RN[e.ruleId] || e.trigger || '', idemKey: e.idemKey, at: fromMs(e.at), postedAt: fromMs(e.postedAt, true) }));
    return { entries, skipped, flags: eng.S.flags }; }
  const SHIM = {
    /* 사건 묶음 → 적립 줄(멱등 · 1회성 · 규칙 기간 상한 · 1인 하루 총 상한 · 국비 · 현금성 전환 잠금). prior = 이미 있는 원장 줄 */
    applyEvents(pol, rules, events, prior = []) { const ENG = window.MileCalc; if (ENG && typeof ENG.create === 'function') return engApply(ENG, pol, rules, events, prior);
      const out = [], skipped = []; const seen = new Set(prior.map(e => e.idemKey)); const used = {}; const add = (k, v) => { used[k] = (used[k] || 0) + v; };
      prior.filter(e => e.kind === 'earn' && e.status !== 'void').forEach(e => { const d = String(e.at).slice(0, 10); add('tot|' + e.sid + '|' + d, e.points); ['day', 'week', 'month', 'term', 'year', 'all'].forEach(k => add(`r|${e.ruleId}|${e.sid}|${k}|${capKey(k, d)}`, e.points)); });
      const lock = pol.cashLock || {}; const funded = new Set((pol.fundedCls || []));
      events.forEach(ev => { const d = String(ev.at || ev.day || today()).slice(0, 10); rules.filter(r => r.active && r.trigger === ev.trigger && condOk(r, ev)).forEach(r => {
        if (trustN(ev.trust || 'C') < trustN(r.trustMin || 'C')) return skipped.push({ ev, rule: r.id, reason: 'trust' });
        const key = r.once === 'ever' ? `e:${r.id}:${ev.sid}` : r.once === 'per_day' ? `e:${r.id}:${ev.sid}:d:${d}` : r.once === 'per_src' ? `e:${r.id}:${ev.sid}:${ev.srcType || 'x'}:${ev.srcId}` : `e:${r.id}:${ev.sid}:${ev.srcId || idem()}`;
        if (seen.has(key)) return skipped.push({ ev, rule: r.id, reason: 'already' }); let pts = scoreOf(r, ev); if (pts <= 0) return;
        for (const k of ['day', 'week', 'month', 'term', 'year', 'total']) { const cap = +(r.caps || {})[k]; if (!cap) continue; const u = used[`r|${r.id}|${ev.sid}|${k === 'total' ? 'all' : k}|${capKey(k === 'total' ? 'all' : k, d)}`] || 0; pts = Math.min(pts, cap - u); }
        if (pol.dailyCapTotal) pts = Math.min(pts, pol.dailyCapTotal - (used['tot|' + ev.sid + '|' + d] || 0));
        if (pts <= 0) return skipped.push({ ev, rule: r.id, reason: 'cap' }); seen.add(key);
        const fd = !!(ev.clsId && funded.has(ev.clsId)); const conv = !fd && (!lock.achievementOnly || r.nature === 'achievement') && trustN(ev.trust || 'C') >= trustN(lock.needTrust || 'B');
        const manual = r.approval === 'manual' || r.approval === 'evidence' || r.approval === 'two_step' || (r.approval === 'over' && pts > (+r.approveOver || 0));
        const e = { id: 'me_' + hash(key + d).slice(0, 8) + Math.random().toString(36).slice(2, 5), sid: ev.sid, scopeUnit: ev.unit || 'lu_root', kind: 'earn', points: pts, status: manual ? 'pending' : 'posted', nature: r.nature, trust: ev.trust || 'C', convertible: conv, funded: fd, clsId: ev.clsId || null,
          ruleId: r.id, ruleVer: r.ver || 1, eventId: ev.id || null, expiresAt: manual ? null : expOf(pol, r, d), reason: r.label, idemKey: key, at: d + ' ' + (ev.time || '12:00'), postedAt: manual ? null : d };
        out.push(e); add('tot|' + ev.sid + '|' + d, pts); ['day', 'week', 'month', 'term', 'year', 'all'].forEach(k => add(`r|${r.id}|${ev.sid}|${k}|${capKey(k, d)}`, pts)); }); });
      return { entries: out, skipped }; },
    /* 지난 n일 사건에 규칙을 적용했을 때(03 §2.3 ②): 총 P · 1인 평균 · 상위 10% 1인 · 규칙별 · 환산 추정 */
    simulate(pol, rules, events) { const { entries } = SHIM.applyEvents(pol, rules, events, []); const by = {}, per = {}; let tot = 0, conv = 0;
      entries.forEach(e => { tot += e.points; if (e.convertible) conv += e.points; by[e.ruleId] = (by[e.ruleId] || 0) + e.points; per[e.sid] = (per[e.sid] || 0) + e.points; });
      const v = Object.values(per).sort((a, b) => b - a); const k = Math.max(1, Math.ceil(v.length * 0.1)); const top = v.length ? Math.round(v.slice(0, k).reduce((s, x) => s + x, 0) / k) : 0;
      return { totalP: tot, convertibleP: conv, wonEstimate: pol.won ? conv : 0, perSidAvg: v.length ? Math.round(tot / v.length) : 0, p90: top, byRule: by, sids: v.length, events: events.length }; },
    /* 잔액 = 합계(04 §2.2). 전환 가능 = 전환 가능 적립 − 음수 줄(대략, 선입선출 상세는 서버) */
    wallet(entries, sid) { const L = entries.filter(e => (!sid || e.sid === sid)); const posted = L.filter(e => e.status === 'posted'); const bal = posted.reduce((s, e) => s + e.points, 0);
      const pend = L.filter(e => e.kind === 'earn' && e.status === 'pending').reduce((s, e) => s + e.points, 0); const neg = posted.filter(e => e.points < 0).reduce((s, e) => s + e.points, 0);
      const cv = Math.max(0, posted.filter(e => e.points > 0 && e.convertible).reduce((s, e) => s + e.points, 0) + neg); return { balance: bal, pending: pend, convertible: Math.min(Math.max(0, bal), cv) }; },
    /* 권장값과 다른 값(막지 않음, D2) */
    warnings(pol, rules, rewards) { const out = []; const rc = pol.recommended || {}; const W0 = (k, title, text) => out.push({ k, title, text });
      const e = pol.expiry || {}, re = rc.expiry || {}; if (e.mode === 'months' && re.mode === 'months' && +e.months !== +re.months) W0('expiry', `유효기간 ${e.months}개월 · 권장 ${re.months}개월`, +e.months < +re.months ? '유효기간이 짧으면 소멸 분쟁이 늘 수 있습니다.' : '유효기간이 길면 미사용 잔액 추정액이 커집니다.');
      if (e.mode === 'none' && rewards.some(w => w.active && w.cash)) W0('expiry', '소멸 없음 · 현금성 보상 사용', '소멸이 없으면 미사용 잔액 추정액이 계속 쌓입니다. 기관 회계와 함께 판단하십시오.');
      const nt = pol.notice || {}; if (+nt.monthsBefore < 6 || !(nt.daysBefore || []).length) W0('notice', '소멸 고지를 줄였습니다', '권장값은 소멸 6개월 전부터 매월 + 30일 · 3일 전입니다. 고지가 줄면 분쟁 위험이 커집니다.');
      if (rc.dailyCapTotal && +pol.dailyCapTotal > rc.dailyCapTotal) W0('dayCap', `1인 하루 상한 ${n(pol.dailyCapTotal)} · 권장 ${n(rc.dailyCapTotal)}`, '하루 상한이 높으면 몰아 쌓기 위험이 커집니다.');
      if (rc.teacherCap && +pol.teacherCap > rc.teacherCap) W0('tCap', `강사별 월 지급 ${n(pol.teacherCap)} · 권장 ${n(rc.teacherCap)}`, '강사 지급이 많아지면 예산 소진이 빨라집니다.');
      const cl = pol.cashLock || {}; if (!cl.achievementOnly || trustN(cl.needTrust) < 2) W0('cashLock', '현금성 전환 잠금을 풀었습니다', '참여만으로 쌓인 적립 · 기기 보고(C) 적립이 금전성 보상에 쓰입니다. 예상된 물질 보상은 내재 동기를 낮출 수 있습니다.');
      rewards.filter(w => w.active && w.kind === 'tuition' && +((w.maxUse || {}).billPct) > 30).forEach(w => W0('billPct', `${w.title} 청구서 ${w.maxUse.billPct}% · 권장 30%`, '청구서의 30%를 넘는 차감은 매출 변동이 커질 수 있습니다.'));
      if (rewards.some(w => w.active && w.cash) && !(+(pol.budget || {}).monthP)) W0('budget', '현금성 보상에 예산이 없습니다', '예산을 넣으면 80%에 닿을 때 알려 드립니다. 넣지 않아도 저장은 됩니다.');
      rules.forEach(r => { const x = (rc.rules || {})[r.id]; if (!x || !r.active) return; const a = (r.score || {}).v, b = (x.score || {}).v; if (a != null && b != null && +a !== +b) W0('rule:' + r.id, `${r.label} ${n(a)}${pol.ab} · 권장 ${n(b)}${pol.ab}`, +a > +b ? `권장 ${n(b)}${pol.ab}보다 높습니다. 보상이 커지면 월 예산 소진이 빨라질 수 있습니다.` : `권장 ${n(b)}${pol.ab}보다 낮습니다. 학습자가 적립을 체감하기 어려울 수 있습니다.`);
        if (x.trustMin && trustN(r.trustMin) < trustN(x.trustMin)) W0('trust:' + r.id, `${r.label} 신뢰 ${r.trustMin} 허용`, '기기가 보고한 사건까지 적립합니다. 현금성 보상과 연결되지 않게 두십시오.'); });
      return out; }
  };
  const MC = name => SHIM[name]; /* 화면 계산 묶음. 적립 규칙은 SHIM.applyEvents → window.MileCalc.create().emit(N 요원 엔진)을 그대로 쓴다 */

  /* ── 시연 데이터: 지난 30일 학습 사건(모의 계산 재료, 개인정보 없음) ── */
  function rng(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
  function demoEvents(days = 30) { const r = rng(42 + (S.org.type || '').length); const td = today(); const M = (S.members || []).length ? S.members.slice(0, 48) : Array.from({ length: 40 }, (_, i) => ({ sid: String(7100000 + i * 17 + 10) })); /* 빈 스튜디오: 학습자 번호만 있는 시연 학습자 40명 */ const C = (S.classes || []).map(c => c.id); const ev = []; let k = 0;
    const push = (sid, trigger, o = {}) => ev.push({ id: 'ev' + (++k), sid, trigger, srcType: o.st || 'x', srcId: o.src || ('s' + k), value: o.v, prev: o.prev, target: o.target, diag: o.diag, required: o.req, clsId: o.cls || C[Math.floor(r() * C.length)] || null, trust: o.tr || 'A', at: addD(td, -Math.floor(r() * days)) });
    M.forEach((m, i) => { if (r() < 0.25) return; const sid = String(m.sid || m.id || ('m' + i)); const act = 0.4 + r();
      for (let j = 0, L = Math.floor(18 * act); j < L; j++) push(sid, 'lesson_done', { src: 'l' + i + '_' + j, tr: r() < 0.7 ? 'A' : 'C', v: 30 + Math.floor(r() * 50) });
      for (let j = 0, L = Math.floor(12 * act); j < L; j++) push(sid, 'attend_day', { src: 'd' + j }); for (let j = 0, L = Math.floor(10 * act); j < L; j++) push(sid, 'tube_goal', { src: 't' + j, tr: 'C' });
      for (let j = 0, L = Math.floor(5 * act); j < L; j++) push(sid, 'assign_submit', { src: 'as' + i + '_' + j });
      for (let j = 0, L = Math.floor(2.5 * act); j < L; j++) { const v = 55 + Math.floor(r() * 45); push(sid, 'exam_score', { src: 'ex' + i + '_' + j, v, prev: v - Math.floor(r() * 25), target: 80 }); }
      if (r() < 0.5) push(sid, 'exam_score', { src: 'dg' + i, v: 1, diag: true }); if (r() < 0.25) push(sid, 'course_done', { src: 'c' + i, tr: 'B' }); if (r() < 0.2) push(sid, 'course_done', { src: 'rq' + i, req: true, tr: 'A' });
      if (r() < 0.4) push(sid, 'survey_done', { src: 'sv' + i }); if (r() < 0.12) push(sid, 'review_ok', { src: 'rv' + i, tr: 'B' }); if (r() < 0.04) push(sid, 'referral_ok', { src: 'rf' + i });
      if (r() < 0.3) push(sid, 'streak', { src: 'st7' }); if (r() < 0.35) push(sid, 'noncredit_done', { src: 'q' + i, v: 10 + Math.floor(r() * 40) }); if (r() < 0.15) push(sid, 'evidence', { src: 'pf' + i, v: 20 + Math.floor(r() * 21), tr: 'B' });
      for (let j = 0, L = Math.floor(r() * 3); j < L; j++) push(sid, 'manual', { src: 'mg' + i + '_' + j, v: 50 + Math.floor(r() * 4) * 50, tr: 'B' }); });
    return ev; }

  /* ── 상태 ── */
  function blank() { return { v: 42, policy: policyDefault(), rules: [], rewards: [], entries: [], log: [], funded: {}, declined: null }; }
  function ensure() { if (!S || !S.org) return null; if (!S.mileage || !S.mileage.policy) S.mileage = blank(); const D = S.mileage; ['rules', 'rewards', 'entries', 'log'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; }); if (!D.funded || typeof D.funded !== 'object') D.funded = {};
    if (LIVEON() && !D.live) { D.entries = []; D.log = []; D.live = 1; } return D; }
  const D = () => ensure();
  const LV = { key: '', d: {}, busy: false, err: '', errAt: 0 };
  const P = () => { if (!(LIVEON() && LV.d.cfg && LV.d.cfg.policy)) return D().policy; const sp = LV.d.cfg.policy; const g = sp.grantCfg || {}; const b = policyDefault(); const nn = Object.fromEntries(Object.entries(sp).filter(([, v]) => v != null));
    return Object.assign(b, nn, { recommended: LV.d.cfg.recommended && LV.d.cfg.recommended.expiry ? LV.d.cfg.recommended : (sp.recommended && sp.recommended.expiry ? sp.recommended : b.recommended), manualOver: g.approveOver != null ? +g.approveOver : b.manualOver, teacherCap: g.staffMonthCap != null ? +g.staffMonthCap : b.teacherCap, rank: Object.assign({}, b.rank, sp.rank || {}), penalty: Object.assign({}, b.penalty, sp.penalty || {}) }); };
  /* 운영 서버 POST /api/mileage/config 본문: 서버 정책 칸만(카멜), null 제외. 강사 한도 · 수동 지급 기준은 grantCfg로(04 §8). on · rank · penalty · sunset · shop은 전용 경로 */
  const PKEYS = ['unitName', 'expiry', 'notice', 'budget', 'dailyCapTotal', 'league', 'streak', 'scope', 'tiers', 'tierWindow', 'cashLock'];
  const polBody = p => { const o = {}; PKEYS.forEach(k => { const v = p[k]; if (v == null) return; if (k === 'tiers' ? Array.isArray(v) : ['unitName', 'tierWindow', 'dailyCapTotal'].includes(k) || (typeof v === 'object' && !Array.isArray(v))) o[k] = v; });
    const g = Object.assign({}, p.grantCfg || {}); if (p.manualOver != null) g.approveOver = +p.manualOver; if (p.teacherCap != null) g.staffMonthCap = +p.teacherCap; if (Object.keys(g).length) o.grantCfg = g; return o; };
  const rules = () => LIVEON() && LV.d.cfg ? (LV.d.cfg.rules || []) : D().rules;
  const rewards = () => LIVEON() && LV.d.cfg ? (LV.d.cfg.rewards || []) : D().rewards;
  /* 시연판: S.mileage.entries가 원장. 보상 요원이 따로 둔 S.milrw.entries(hold · release · use)는 통합 전까지 읽기만 합쳐 보인다(같은 id는 한 번) */
  const entries = () => { if (LIVEON()) return ((LV.d.ent && (LV.d.ent.entries || LV.d.ent.rows)) || []).map(mEnt); const A = D().entries; const X = (S.milrw && Array.isArray(S.milrw.entries)) ? S.milrw.entries.filter(e => e && !A.some(a => a.id === e.id)).map(mEnt) : []; return X.length ? A.concat(X) : A; };
  const isOn = () => !!(P().on || P().isOn);
  const fmtP = v => `${n(v)}${P().ab || 'P'}`;
  const sgn = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n(Math.abs(v))}${P().ab || 'P'}`;
  const mEnt = x => ({ id: x.id, sid: x.sid || '', scopeUnit: x.scopeUnit || x.scope_unit || x.unit || 'lu_root', kind: x.kind, points: +x.points || 0, status: x.status || 'posted', nature: x.nature, trust: x.trust, convertible: !!x.convertible, funded: !!x.funded, clsId: x.clsId || x.cls_id || x.cls || null, ruleId: x.ruleId || x.rule_id, ruleVer: x.ruleVer || x.rule_ver, expiresAt: x.expiresAt || x.expires_at || null, reason: x.reason || '', byStaff: x.byStaff || x.by_staff || '', at: String(x.at || '').replace('T', ' ').slice(0, 16), refEntry: x.refEntry || x.ref_entry || null });
  const logRows = () => LIVEON() ? ((LV.d.log && (LV.d.log.rows || LV.d.log.log || LV.d.log.items)) || []).map(x => ({ at: String(x.at || '').replace('T', ' ').slice(0, 16), by: x.by || x.byStaff || x.by_staff || '', area: x.area, what: x.what || AREA[x.area] || x.area, before: x.before, after: x.after, reason: x.reason || '', note: x.note || '' })) : D().log;

  /* 국비 지원 과정(D1): 결제 원천 · 이름으로 자동 판정(끌 수 없음), voc 새 과정은 기본 켬(소유자가 끌 수 있음), 그 밖은 수동 */
  const AUTO_RX = /내일배움|사업주\s*훈련|국비|국민내일배움/;
  function fundedOf(c) { if (!c) return { funded: false }; const src = c.fundSrc || c.paySrc || ''; const cfg = LIVEON() && LV.d.cfg && Array.isArray(LV.d.cfg.funded) ? LV.d.cfg.funded.find(x => (x.clsId || x.cls_id) === c.id) : null;
    if (src === 'naeil' || src === 'moel' || AUTO_RX.test(c.name || '')) return { funded: true, auto: true, source: src || (/사업주/.test(c.name) ? 'moel' : 'naeil') };
    const m = cfg ? { funded: !!cfg.funded, source: cfg.source } : D().funded[c.id] || (c.funded != null ? { funded: !!c.funded } : null); if (m) return { funded: !!m.funded, auto: false, source: m.source || 'etc', by: m.by, at: m.at };
    return { funded: S.org.type === 'voc', auto: false, source: 'etc', dflt: S.org.type === 'voc' }; }
  const fundedIds = () => (S.classes || []).filter(c => fundedOf(c).funded).map(c => c.id);
  const polCalc = () => Object.assign({}, P(), { fundedCls: fundedIds() });

  /* 변경 이력(시연판). 운영은 서버가 mil_policy_log에 남긴다 */
  function log(area, what, before, after, reason, note) { const L = D(); L.log.unshift({ at: nowStr(), by: S.me ? S.me.name : '', area, what, before: before == null ? '' : before, after: after == null ? '' : after, reason: reason || '', note: note || '' }); L.log = L.log.slice(0, 500);
    if (typeof logAudit === 'function') logAudit(`마일리지 — ${what}${reason ? ' · ' + reason : ''}`); }

  /* ── 운영 서버 ── */
  const ERRN = { mile_off: '마일리지 모듈이 꺼져 있습니다.', funded_blocked: '국비 지원 과정에는 금전성 보상을 쓸 수 없습니다(제품 고정).', ack_required: '영향 안내 확인과 사유가 필요합니다.', bad_rule: '규칙 형식이 맞지 않습니다.', hq_pool_locked: '본사 통합 마일리지는 켤 수 없습니다(제품 고정).', need_sunset: '이미 적립이 있어 제도 종료 절차로 진행해야 합니다.', staff_cap: '강사별 월 지급 한도를 넘습니다.', self_grant: '운영자 본인 · 가족 계정에는 지급할 수 없습니다(제품 고정).', insufficient: '잔액이 부족합니다.', negative_balance: '잔액이 음수인 학습자입니다.', already: '이미 처리되었습니다.', rate: '요청이 너무 많습니다. 잠시 뒤 다시 시도해 주십시오.', amount_mismatch: '서버 계산과 다릅니다. 화면을 새로 고쳐 주십시오.', forbidden: '권한이 없습니다.' };
  const ecode = e => e && (e.code || e.error || (e.body && e.body.error));
  const liveErr = e => `운영 서버의 마일리지 기능에 연결하지 못했습니다${e && e.status ? `(${e.status}${ecode(e) ? ' ' + ecode(e) : ''})` : ''}. ${ecode(e) === 'mile_off' ? '기관 설정에서 마일리지 모듈이 꺼져 있습니다. ' : ''}잠시 뒤 다시 시도하고, 계속되면 관리자에게 알려 주십시오.`;
  const qs = o => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  function livePull() { const tab = curTab(); const td = today(); const need = { cfg: ['GET', '/api/mileage/config'] };
    if (tab === 'home') need.sum = ['GET', '/api/mileage/summary?' + qs({ from: ym(td) + '-01', to: td })];
    if (tab === 'home' || tab === 'ledger') need.ent = ['GET', '/api/mileage/entries?' + qs({ sid: UI.milQ || '', kind: tab === 'ledger' && UI.milK && UI.milK !== 'funded' && UI.milK !== 'pending' ? UI.milK : '', from: tab === 'home' ? ym(td) + '-01' : '', limit: 200 })];
    if (tab === 'log' || tab === 'set') need.log = ['GET', '/api/mileage/log?' + qs({ area: UI.milA || '' })];
    const key = JSON.stringify(need); if (LV.busy || (LV.key === key && (!LV.err || Date.now() - LV.errAt < 5000))) return; LV.busy = true; LV.key = key; const K = Object.keys(need);
    Promise.all(K.map(k => api(need[k][0], need[k][1]).catch(e => { if (k === 'cfg') throw e; return null; }))).then(Rr => { const d = {}; K.forEach((k, i) => { d[k] = Rr[i]; }); LV.d = Object.assign({}, LV.d, d); LV.err = ''; })
      .catch(e => { LV.err = liveErr(e); LV.errAt = Date.now(); }).finally(() => { LV.busy = false; if (CUR.tab === 'mileage') render(); }); }
  const liveDo = (method, url, body, ok) => api(method, url, body).then(r => { LV.key = ''; if (ok) ok(r); render(); return r; }).catch(e => { toast(ERRN[ecode(e)] || liveErr(e), 'warn'); throw e; });
  const invalidate = () => { LV.key = ''; };

  /* ── 공용 조각(mil.css) ── */
  const rec = (recV, cur, why) => { const same = cur == null || String(cur) === String(recV); return `<span class="mil-rec ${same ? 'same' : 'off'}">${ic(same ? 'mile' : 'warn', 14)}${same ? `권장값 ${esc(recV)}` : `권장 ${esc(recV)} · 현재 ${esc(cur)}`}</span>${!same && why ? `<span class="mil-why">${ic('info', 14)}${esc(why)}</span>` : ''}`; };
  const note = (tone, title, body, src) => `<div class="mil-note ${tone}" role="${tone === 'err' ? 'alert' : 'note'}">${ic(tone === 'warn' ? 'warn' : tone === 'ok' ? 'check' : tone === 'err' ? 'x' : 'info', 20)}<div><b>${esc(title)}</b>${body}${src ? `<span class="src">${esc(src)}</span>` : ''}</div></div>`;
  const lock = (title, body, soft) => `<div class="mil-lock ${soft ? 'soft' : ''}"><span class="li">${ic(soft ? 'unlock' : 'lock', 18)}</span><div><b>${esc(title)}</b><p>${esc(body)}</p><span class="fx">${ic(soft ? 'unlock' : 'lock', 14)}${soft ? '권장 잠금 · 안내를 확인하면 풀 수 있습니다' : '제품 고정 · 기관 설정으로 풀 수 없습니다'}</span></div></div>`;
  const locktag = t => `<span class="mil-locktag">${ic('lock', 14)}${esc(t)}</span>`;
  const trTag = t => `<span class="mil-tr" title="${esc(TRN[t] || '')}"><i>${esc(t || '-')}</i>${esc(TRN[t] || '')}</span>`;
  const barH = (v, o = {}) => `<div class="mil-bar ${o.thin ? 'thin' : ''}" role="img" aria-label="${esc(o.aria || Math.round(v) + '%')}"><i style="--p:${Math.max(0, Math.min(100, +v || 0))}"></i>${o.pend ? `<i class="pend" style="left:${Math.min(100, v)}%;--p:${Math.max(0, Math.min(100 - v, o.pend))}"></i>` : ''}${(o.ticks || []).map(t => `<span class="tk" style="left:${t}%"></span>`).join('')}</div>${o.l || o.r ? `<div class="mil-barlab"><span>${esc(o.l || '')}</span><span>${esc(o.r || '')}</span></div>` : ''}`;
  const kp = (icn, k, v, s, extra = '') => `<div class="mil-kpi"><span class="k">${ic(icn, 16)}${esc(k)}</span><span class="v">${v}</span>${s ? `<span class="s">${s}</span>` : ''}${extra}</div>`;
  const ch = (icn, t, r = '') => `<div class="mil-ch">${ic(icn, 20)}<b>${esc(t)}</b>${r ? `<span class="r">${r}</span>` : ''}</div>`;
  const sw = (on, act, v, label, dis) => `<label class="sw"><input type="checkbox" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''} data-chg="${act}" data-v="${esc(v)}" aria-label="${esc(label)}"><span></span></label>`;
  function confirmCard(title, body, okLabel, run, wide) { return modal(title, `<div class="mil mil-m">${body}</div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: okLabel || '확인', kind: 'pri', run }], wide); }
  const scoreTxt = r => { const s = r.score || {}; if (s.mode === 'source') return '프로그램 값'; if (s.mode === 'band') return (s.bands || []).map(([m, v]) => `${m}↑ ${n(v)}`).join(' · '); if (s.mode === 'per_unit') return `${s.unit}분당 ${fmtP(s.v)}`; if (s.range) return `${n(s.range[0])}~${fmtP(s.range[1])}`; return fmtP(s.v); };
  const capTxt = r => { const c = r.caps || {}; const L = [['day', '하루'], ['week', '주'], ['month', '월'], ['term', '학기'], ['year', '연'], ['total', '전체']].filter(([k]) => +c[k]).map(([k, l]) => `${l} ${fmtP(c[k])}`); return L.join(' · ') || '상한 없음'; };
  const sayTxt = r => String(r.say || '').replace('{P}', scoreTxt(r));
  const expTxt = (r, pol) => { const e = (r && r.expiry) || (pol || P()).expiry || {}; return e.mode === 'none' ? '소멸 없음' : e.mode === 'term_end' ? '학기 말' : e.mode === 'year' ? '연 단위' : e.after === 'course' ? `과정 종료 후 ${e.months}개월` : `${e.months || 12}개월`; };

  /* ── 탭 ── */
  const OWN_TABS = [{ id: 'home', label: '한눈에', order: 10, view: () => vHome() }, { id: 'rules', label: '적립 규칙', order: 20, view: () => vRules() }, { id: 'ledger', label: '내역', order: 50, view: () => vLedger() },
    { id: 'set', label: '설정', order: 80, roles: ['owner', 'sub'], view: () => vSet() }, { id: 'log', label: '변경 이력', order: 90, roles: ['owner', 'sub'], view: () => vLog() }];
  const tabList = () => [...OWN_TABS, ...(window.MIL_TABS || [])].filter((t, i, A) => t && t.id && A.findIndex(x => x.id === t.id) === i && (!t.roles || t.roles.includes(S.me.role)) && (!t.show || safe(t.show, true))).sort((a, b) => (a.order || 50) - (b.order || 50));
  const curTab = () => { const T = tabList(); return T.some(t => t.id === UI.mil) ? UI.mil : 'home'; };
  function safe(f, dflt) { try { return f(); } catch (e) { console.error('mileage tab', e); return dflt; } }

  /* ── 메뉴 · 프리셋 · 기존 저장 사용자 ── */
  MENU.mileage = { label: '마일리지', ws: 'people' };
  Object.keys(PRESET).forEach(k => { const Pp = PRESET[k]; if (!Pp.on.includes('mileage') && !Pp.off.includes('mileage')) Pp.on.push('mileage'); });
  /* 필수 메뉴(slimEss)에 마일리지 포함. 학사 LMS 시나리오(scn-univ-lms)가 DOMContentLoaded에 slimEss를 바꾸므로 그 뒤에도 한 번 더 감싼다(메뉴 기본 보임 · 제도는 기본 끔, D2) */
  const essWrap = () => { if (typeof window.slimEss !== 'function' || window.slimEss.mil42) return; const base = window.slimEss; window.slimEss = (...a) => { const E = base(...a) || []; try { if (S && S.org && MENU.mileage && !E.includes('mileage')) return [...E, 'mileage']; } catch (e) { } return E; }; window.slimEss.mil42 = 1; };
  essWrap(); document.addEventListener('DOMContentLoaded', essWrap);
  if (typeof DICT !== 'undefined') Object.assign(DICT, { '마일리지': 'Mileage|マイレージ|学习积分|Millas|Points|Meilen|Điểm tích lũy|ไมล์สะสม|Баллы' });
  if (typeof postSeed === 'function') { const base = postSeed; postSeed = (...a) => { const r = base(...a); try { ensure(); } catch (e) { console.error('mileage', e); } return r; }; } /* eslint-disable-line no-global-assign */
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org) { ensure(); if (typeof navAdd === 'function' && MENU.mileage && !Object.values(S.nav.tabs).some(T => (T || []).some(x => x.id === 'mileage'))) navAdd('mileage', true); } } catch (e) { console.error('mileage', e); } return r; }; } /* eslint-disable-line no-global-assign */
  /* 학습자 게시본: 켜짐 · 단위 · 모으는 방법 · 소멸 · 국비 과정 번호만(원장 줄은 싣지 않음 — 학습자 앱은 /api/pub/<tid>/mile-* 또는 시연판 S.mileage) */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const pub = base(...a); try { if (pub && S && S.mileage) { const p = P(); pub.mileage = { on: !!p.on, ver: p.ver, unitName: p.unitName, ab: p.ab, won: !!p.won, expiry: p.expiry, notice: p.notice, league: { on: !!(p.league || {}).on }, rank: { on: !!(p.rank || {}).on, scope: (p.rank || {}).scope, name: (p.rank || {}).name }, sunset: p.sunset || null, ways: rules().filter(r => r.active).map(r => ({ trigger: r.trigger, say: sayTxt(r), nature: r.nature })), funded: fundedIds() }; } } catch (e) { console.error('mileage pub', e); } return pub; }; } /* eslint-disable-line no-global-assign */

  /* ═════════ 화면 ═════════ */
  VIEWS.mileage = () => { ensure(); if (LIVEON()) livePull(); const p = P();
    if (LIVEON() && LV.err && !LV.d.cfg) return `<div class="mil">${note('err', '운영 서버 연결', esc(LV.err))}</div>`;
    if (LIVEON() && !LV.d.cfg) return `<div class="mil"><div class="empty">마일리지 설정을 불러오고 있습니다.</div></div>`;
    if (!(p.on || p.isOn)) return `<div class="mil mil-wiz">${vWizard()}</div>`;
    const T = tabList(); const cur = curTab(); const t = T.find(x => x.id === cur) || T[0];
    const status = p.sunset ? `<span class="pill p-wait">${ic('clock', 14)}제도 종료 예약 · ${esc(p.sunset.endAt || '')}</span>` : `<span class="pill p-ok">${ic('check', 14)}제도 켜짐 · 정책 버전 ${n(p.ver || 1)}</span>`;
    const bar = `<div class="mil-top"><div class="mil-tabs" role="tablist" aria-label="마일리지 화면">${T.map(x => { const b = x.badge ? safe(x.badge, 0) : 0; return `<button role="tab" aria-selected="${x.id === t.id}" class="${x.id === t.id ? 'on' : ''}" data-act="tab" data-key="mil" data-v="${esc(x.id)}">${esc(x.label)}${b ? `<em>${n(b)}</em>` : ''}</button>`; }).join('')}</div><div class="mil-st">${status}</div></div>`;
    return `<div class="mil">${bar}${LV.err ? note('warn', '운영 서버 연결', esc(LV.err)) : ''}<div class="mil-body" data-tab="${esc(t.id)}">${safe(t.view || t.render, '<div class="empty">이 화면을 표시하지 못했습니다.</div>')}</div></div>`; };

  /* ── 켜기 마법사 ── */
  const STEPS = ['쓸지 · 목적', '권장 정책안 확인', '보상 고르기', '학습자 안내문 미리보기', '확인하고 켜기'];
  const stepBar = st => `<ol class="mil-steps" aria-label="켜기 단계">${STEPS.map((w, i) => `<li class="${st[i]}" ${st[i] === 'on' ? 'aria-current="step"' : ''}><span class="n">${st[i] === 'done' ? ic('check', 16) : i + 1}</span><div>${esc(w)}${st[i] === 'done' ? '<small>완료</small>' : st[i] === 'on' ? '<small>진행 중</small>' : ''}</div></li>`).join('')}</ol>`;
  function wiz() { if (!UI.milW) { const T = tpl(); UI.milW = { step: 1, use: true, purpose: T.won || S.org.type === 'public' ? 'cash' : 'motive', budget: '', noBudget: false, draft: null, checks: {} }; if (S.org.type === 'corp' || S.org.type === 'voc' || S.org.type === 'univ') UI.milW.purpose = 'motive'; } return UI.milW; }
  function makeDraft() { const T = tpl(); const w = wiz(); const pol = policyDefault(); const bud = +String(w.budget).replace(/[^\d]/g, '') || 0; pol.budget = { monthP: w.noBudget ? 0 : bud, monthWon: w.noBudget ? 0 : bud };
    const RW = clone(T.rewards).map(x => Object.assign(x, { active: w.purpose === 'cash' ? x.pick !== false && !x.soft : !x.cash }));
    if (!pol.won || w.purpose !== 'cash') RW.forEach(x => { if (x.kind === 'tuition') x.active = false; });
    if (S.org.type === 'adult' || S.org.type === 'k12') { /* 학원비 차감은 수납 원장이 있을 때만 권장 */ }
    const d = { policy: pol, rules: clone(T.rules), rewards: RW }; d.hash = hash(JSON.stringify(d)); return d; }
  function draft() { const w = wiz(); if (!w.draft) w.draft = makeDraft(); return w.draft; }
  function simOf(pol, R0) { if (LIVEON() && UI.milSimLive) return UI.milSimLive; return MC('simulate')(Object.assign({}, pol, { fundedCls: fundedIds() }), R0, UI.milEv || (UI.milEv = demoEvents(30))); }
  function vWizard() { const p = P(); const D0 = D(); const w = wiz(); const T = tpl();
    if (teacher()) return note('info', '마일리지 제도가 꺼져 있습니다', '정운영자가 켜면 이 화면에서 적립 현황을 볼 수 있습니다.');
    if (D0.declined && !UI.milRestart) return `<div class="card mil-hero">${ic('pause', 40)}<div class="f1"><h2>마일리지 제도를 사용하지 않습니다</h2><p>${esc(D0.declined.at)} · ${esc(D0.declined.by)} 결정. 학습자 화면에도 마일리지가 보이지 않습니다.</p></div>${owner() ? `<button class="btn pri" data-act="mil-restart">${ic('play', 18)}다시 시작하기</button>` : ''}</div>`;
    const ro = !owner() ? note('info', '정운영자만 켤 수 있습니다', '부운영자는 권장 정책안을 미리 볼 수 있습니다. 켜기 · 끄기 · 순위 설정은 정운영자 권한입니다.') : '';
    const learners = (S.members || []).length; const ev = UI.milEv || (UI.milEv = demoEvents(30)); const act = new Set(ev.map(e => e.sid)).size;
    const head0 = `<div class="card mil-hero"><span class="mil-mk">${ic('mile', 40)}</span><div class="f1"><div class="eyebrow">처음 한 번만 설정합니다 · 5단계</div><h2>마일리지 제도 시작하기</h2><p>디디쌤이 기관 유형과 최근 학습 기록으로 권장 정책안을 만들어 드립니다. 모든 값은 기관이 정하고, 언제든 바꾸거나 끌 수 있습니다.</p></div>
      <ul class="mil-facts"><li>${ic('check', 16)}기관 유형 · 템플릿 <b>${esc(T.name)}</b></li><li>${ic('check', 16)}등록 학습자 <b>${n(learners)}명</b> · 최근 30일 학습 <b>${n(act)}명</b></li><li>${ic('check', 16)}${T.won ? '수납 원장과 연결 가능 · 1' + esc(T.ab) + ' = 1원' : '비현금 보상 중심(배지 · 인증서 · 등급)'}</li></ul></div>`;
    if (w.step === 1) { const opt = (on, act2, v, icn, t, d, tg) => `<button type="button" class="mil-opt ${on ? 'on' : ''}" data-act="${act2}" data-v="${v}" aria-pressed="${on}"><span class="rd">${on ? ic('check', 14) : ''}</span><span class="f1"><span class="t">${ic(icn, 20)}${esc(t)}${on ? '<span class="pill p-ok">선택됨</span>' : tg || ''}</span><span class="d">${esc(d)}</span></span></button>`;
      return head0 + ro + stepBar(['on', 'todo', 'todo', 'todo', 'todo']) + `<div class="mil-g21"><div class="card mil-col">
        <div><div class="eyebrow">1단계 · ${STEPS[0]}</div><h3>마일리지 제도를 사용하시겠습니까?</h3></div>
        <div class="mil-g2">${opt(w.use, 'mil-w-use', '1', 'play', '사용합니다', '권장 정책안을 확인한 뒤 마지막 단계에서 켭니다.')}${opt(!w.use, 'mil-w-use', '0', 'pause', '사용하지 않음', '마일리지는 꺼진 상태로 둡니다. 나중에 여기서 다시 시작할 수 있습니다.')}</div>
        ${w.use ? `<hr><div><h4>무엇을 위해 쓰십니까?</h4><p class="mut">목적에 따라 2단계 권장 정책안과 3단계 보상 목록이 달라집니다.</p></div>
        <div class="mil-g2">${opt(w.purpose === 'motive', 'mil-w-pur', 'motive', 'chart', '동기부여만', '적립 · 등급 · 배지로 학습의 흔적을 보여 줍니다. 돈과 바꾸는 보상은 쓰지 않습니다.', '<span class="pill p-off">비현금형</span>')}${opt(w.purpose === 'cash', 'mil-w-pur', 'cash', 'receipt', '할인 · 장학과 연계', T.won ? `${p.unitName}를 학원비 차감 · 쿠폰 · 굿즈로 바꿀 수 있게 합니다. 수납 원장과 연결됩니다.` : '교환권 · 굿즈 등 금전 가치가 있는 보상을 씁니다. 예산을 함께 정합니다.')}</div>
        <hr><div><h4>한 달 보상 예산이 있습니까?</h4><p class="mut">디디쌤이 묻는 질문은 이것 하나입니다. 예산이 없으면 비현금형으로 안내합니다.</p></div>
        <div class="mil-row"><label class="mil-fld f1"><span>월 보상 예산(원)</span><input name="milBud" inputmode="numeric" value="${esc(w.budget)}" placeholder="예: 300000" data-chg="mil-w-bud" ${w.noBudget ? 'disabled' : ''}></label>
        <label class="mil-ck"><input type="checkbox" data-chg="mil-w-nob" ${w.noBudget ? 'checked' : ''}> 예산 없음 — 배지 · 등급만 사용</label></div>` : ''}
        <div class="mil-acts"><button class="btn" data-act="mil-w-later">${ic('pause', 18)}나중에 하기</button><button class="btn pri" data-act="mil-w-next" data-v="2" ${owner() || w.use ? '' : 'disabled'}>${w.use ? '다음 · 권장 정책안 보기' : '사용하지 않기로 저장'}${ic('chev', 18)}</button></div></div>
        <div class="mil-col"><div class="card mil-col">${ch('rules', '기관이 정하는 것')}<p>적립 조건 · 배점 · 한도 · 유효기간 · 보상 종류 · 교환 비율 · 학원비 차감 상한 · 알림 · 예산 — <b>모든 값</b>을 바꿀 수 있습니다.</p><div class="mil-row">${rec('청구서 30%')}${rec('12개월')}</div><p class="mut">디디쌤 값은 「권장값」 배지로만 보입니다. 권장값을 벗어나면 이유를 안내하고, 저장은 막지 않습니다.</p></div>
        <div class="card mil-col">${ch('lock', '디디쌤이 고정한 것')}${lock('본사 통합 마일리지', `다른 가맹점과 함께 쓰는 통합 지갑은 쓸 수 없습니다. ${p.unitName}는 이 기관(단위) 안에서만 쌓이고 쓰입니다.`)}
        <ul class="mil-x"><li>${ic('x', 16)}유상 충전 · 현금 환급 · 학습자 간 선물</li><li>${ic('x', 16)}운영자 본인 · 가족 계정 지급</li><li>${ic('x', 16)}국비 지원 과정 적립분의 금전성 보상</li></ul></div>
        ${minor() ? note('info', '미성년 학습자 기관 기본값', '공개 순위와 감점은 꺼진 상태로 시작합니다. 켜려면 설정에서 영향 안내를 확인하십시오.') : ''}</div></div>`; }
    const d = draft(); const pol = d.policy;
    if (w.step === 2) { const sim = simOf(pol, d.rules); const bud = +(pol.budget || {}).monthP || 0; const rate = bud ? Math.round(sim.convertibleP / bud * 100) : 0; const warn = MC('warnings')(pol, d.rules, d.rewards); const fc = fundedIds().length;
      const rows = d.rules.map((r, i) => `<tr><td>${sw(r.active, 'mil-d-on', i, r.label + ' 켜기')}</td><td><b>${esc(r.label)}</b><small>${esc(sayTxt(r))}</small></td><td class="num">${r.score.mode === 'fixed' && !r.score.range ? `<input class="mil-num" type="number" min="0" value="${+r.score.v}" data-chg="mil-d-v" data-v="${i}" aria-label="${esc(r.label)} 배점">` : esc(scoreTxt(r))}<div>${rec(scoreTxt(Object.assign({}, r, { score: pol.recommended.rules[r.id].score })), scoreTxt(r))}</div></td><td>${esc(capTxt(r))}<small>${esc(ONCE[r.once] || r.once)}</small></td><td>${esc(APPR[r.approval] || r.approval)}<small>${trTag(r.trustMin)} · ${esc(NAT[r.nature])}</small></td><td>${esc(expTxt(r, pol))}</td></tr>`).join('');
      const pen = `<tr class="mil-lockrow"><td>${sw(false, 'mil-noop', '', '감점 규칙', true)}</td><td><b>감점(결석 · 지각)</b><small>${minor() ? '미성년 학습자 기관 기본 끔' : '권장값 끔'}</small></td><td colspan="4">${lock('감점 규칙은 권장값으로 잠겨 있습니다', '실수 · 결석은 「적립 없음」으로만 처리하는 것을 권장합니다. 켜려면 설정 › 순위 · 감점에서 영향 안내를 확인하십시오.', true)}</td></tr>`;
      return stepBar(['done', 'on', 'todo', 'todo', 'todo']) + ro + `<div class="mil-g21"><div class="card mil-col"><div class="mil-row"><div class="f1"><div class="eyebrow">2단계 · ${STEPS[1]}</div><h3>적립 규칙 초안</h3></div><span class="pill p-info">${ic('book', 14)}템플릿 ${esc(T.name)}</span><span class="mil-ai">${ic('ai', 14)}${LIVEON() ? 'AI 초안' : '규칙 기반 추천'}</span></div>
        <p class="mut">고칠 칸만 누르십시오. 바꾼 값은 「기관 설정」으로 표시되고, 권장값과 다르면 이유가 함께 보입니다.</p>
        <div class="tw"><table class="mil-tbl"><thead><tr><th>켜기</th><th>규칙 · 학습자 안내</th><th>배점</th><th>한도 · 1회성</th><th>승인 · 신뢰 · 성격</th><th>유효기간</th></tr></thead><tbody>${rows}${pen}</tbody></table></div></div>
        <div class="mil-col"><div class="card mil-col">${ch('chart', '모의 계산', `<span class="pill p-off">지난 30일 학습 기록</span>`)}<p>이 초안을 지난 30일 학습 기록에 적용하면</p>
        <div><div class="mut">월 예상 적립</div><div class="mil-big num">${fmtP(sim.totalP)}</div><div class="mut">${pol.won ? `금전성 보상에 쓸 수 있는 양 ${fmtP(sim.convertibleP)} = ${won(sim.convertibleP)}(1${esc(pol.ab)} = 1원)` : '비현금형 · 원 환산 없음'}</div></div>
        ${bud ? `<div><div class="mil-row sb"><span>예산 대비</span><b class="num">${rate}%</b></div>${barH(rate, { ticks: [80], l: '0', r: '월 예산 ' + won(bud), aria: `예산 대비 ${rate}%` })}</div>` : ''}
        <div class="mil-g2">${kp('user', '1인 평균', fmtP(sim.perSidAvg))}${kp('chart', '상위 10% 1인', fmtP(sim.p90))}</div><p class="mut sm">${bud ? '눈금은 예산 80% 알림 기준입니다. ' : ''}실제 적립은 학습량에 따라 달라집니다.</p></div>
        <div class="card mil-col">${ch('search', '확인할 점', `<span class="pill p-info">${warn.length + 2 + (bud ? 1 : 0)}건</span>`)}
        ${bud ? note(rate > 80 ? 'warn' : 'info', rate > 100 ? '예산을 넘을 수 있습니다' : '예산 안에 들어옵니다', `예상 금전성 적립이 월 예산의 ${rate}%입니다. 80%에 닿으면 「한눈에」에서 알려 드립니다.`) : ''}
        ${note('info', '참여형 적립은 금전성 보상에 쓰지 않습니다', '가입 · 출석 · 오늘 목표처럼 참여만으로 쌓인 적립은 권장값으로 금전성 보상에서 제외됩니다(배지 · 등급 · 연속 학습에는 반영).')}
        ${note('info', '국비 지원 과정', fc ? `국비 지원 과정 ${fc}개는 적립이 배지 · 학습 기록에만 쓰이고 금전성 보상에서 자동으로 빠집니다(제품 고정).` : '이 기관에는 국비 지원 과정 표시가 없습니다. 생기면 자동으로 금전성 보상에서 제외됩니다.')}
        ${warn.map(x => note('warn', x.title, esc(x.text))).join('')}</div></div></div>
        <div class="mil-acts"><button class="btn" data-act="mil-w-next" data-v="1">${ic('back', 18)}이전</button><button class="btn" data-act="mil-w-redraft">${ic('ai', 18)}${LIVEON() ? 'AI 초안 다시 받기' : '권장값으로 되돌리기'}</button><button class="btn pri" data-act="mil-w-next" data-v="3">다음 · 보상 고르기${ic('chev', 18)}</button></div>`; }
    /* 3 · 4 · 5단계 */
    const RW = d.rewards; const tu = RW.find(x => x.kind === 'tuition'); const ck = w.checks || {}; const on = d.rules.filter(r => r.active);
    const card = (x, i) => { const dis = x.soft && !ck['soft' + i]; const ex = x.kind === 'tuition' && x.active ? `<div class="mil-g3 mt">${[['billPct', '청구서 1건당 상한', '%', (x.maxUse || {}).billPct, 30], ['minUse', '최소 사용', pol.ab, x.minUse, 1000], ['step', '사용 단위', pol.ab, x.step, 100]].map(([k, l, u, v, r0]) => `<label class="mil-fld"><span>${l}</span><span class="mil-inp"><input type="number" min="0" value="${+v || 0}" data-chg="mil-d-rw" data-v="${i}" data-k="${k}" aria-label="${l}"><em>${esc(u)}</em></span>${rec(r0 + (u === '%' ? '%' : u), (+v || 0) + (u === '%' ? '%' : u), k === 'billPct' ? '청구서의 30%를 넘는 차감은 매출 변동이 커질 수 있습니다.' : '')}</label>`).join('')}</div>
        <div class="mil-col mt">${note('info', '안내 A · 학원비 차감', '차감은 청구서에 정가와 「마일리지 차감」 줄로 따로 표시됩니다. 환불은 실제로 낸 금액을 기준으로 계산하고, 차감에 쓴 마일리지는 환불 비율만큼 마일리지로 돌려드립니다. 차감 상한과 유효기간은 기관에서 정해 주세요(권장: 청구서 1건의 30%, 12개월).')}${x.note === 'guardian' || minor() ? note('info', '안내 B · 미성년 학습자', '학습자가 미성년이므로 차감은 보호자 확인 후 적용하고, 적립 · 소멸 알림을 보호자에게도 보내는 것을 권장합니다.') : ''}${x.note === 'voucher' ? note('info', '안내 D · 이용권 · 국비', '평생교육이용권 · 국비 지원금으로 낸 수강료는 차감 대상에서 제외됩니다.') : ''}</div>` : '';
      const soft = x.soft ? `<div class="mt">${lock(x.title + ' · 권장 잠금', '공공 예산 금품 지급은 근거 규정이 필요할 수 있어 권장값으로 잠겨 있습니다.', true)}${note('info', '안내 C · 공공 예산 금품', '공공 예산으로 금품을 지급하려면 조례나 내규 등 지급 근거가 필요할 수 있습니다. 근거 규정 이름과 1인 연간 상한, 총예산을 적어 두시면 보고서에 함께 표시됩니다.')}<label class="mil-ck"><input type="checkbox" data-chg="mil-w-ck" data-v="soft${i}" ${ck['soft' + i] ? 'checked' : ''}> 안내 C를 확인했고 기관 책임으로 잠금을 풉니다</label></div>` : '';
      const tax = x.note === 'tax' ? note('info', '안내 G · 과세', '학습 보상으로 지급한 상품권 · 포인트는 근로소득으로 과세될 수 있습니다. 1인별 지급액을 급여 담당자에게 보내 주세요(내보내기 제공).') : '';
      return `<div class="mil-opt as-card ${x.active ? 'on' : ''}"><label class="mil-optl"><input type="checkbox" class="bx" data-chg="mil-d-rwon" data-v="${i}" ${x.active ? 'checked' : ''} ${dis ? 'disabled' : ''} aria-label="${esc(x.title)} 쓰기"><span class="f1"><span class="t">${ic(x.kind === 'tuition' ? 'receipt' : x.kind === 'coupon' ? 'ticket' : x.kind === 'badge' ? 'medal' : x.kind === 'cert' ? 'flag' : 'gift', 20)}${esc(x.title)}${x.cash ? '<span class="pill p-wait">금전성</span>' : '<span class="pill p-off">비현금</span>'}</span><span class="d">${x.kind === 'tuition' ? `다음 청구서에 정가 줄과 「마일리지 차감」 줄로 따로 붙습니다. 1${esc(pol.ab)} = 1원.` : x.cost && x.cost.fixedP ? `${fmtP(x.cost.fixedP)} · ${esc(APPR[x.approval] || x.approval)}${x.stock != null ? ` · 재고 ${n(x.stock)}` : ''}` : `${esc(APPR[x.approval] || '자동')} 수여${x.threshold ? ` · 기준점 ${fmtP(x.threshold)}` : ''}`}</span></span></label>${ex}${soft}${tax}</div>`; };
    const none = !RW.some(x => x.active);
    const say = on.map(r => `<li>${ic('plus', 16)}${esc(sayTxt(r))}</li>`).join('');
    const use = RW.filter(x => x.active).map(x => `<li>${ic(x.kind === 'tuition' ? 'receipt' : 'gift', 16)}${esc(x.title)}${x.kind === 'tuition' ? ` · 1${esc(pol.ab)} = 1원, 청구서의 ${n((x.maxUse || {}).billPct)}%까지` : x.cost && x.cost.fixedP ? ` · ${fmtP(x.cost.fixedP)}` : ''}</li>`).join('');
    const phone = `<div class="mil-phone" aria-label="학습자 안내문 미리보기"><div class="ph-top"><b>${esc(p.unitName)} 안내</b></div><div class="ph-b">
      <div class="ph-c"><b>${ic('mile', 20)}${esc(S.org.name)} ${esc(p.unitName)}가 시작돼요</b><p>공부한 만큼 ${esc(p.unitName)}가 쌓여요.${use ? ' 쌓인 것은 아래 보상으로 바꿀 수 있어요.' : ' 배지와 등급으로 학습의 흔적을 볼 수 있어요.'}</p></div>
      <div class="ph-c"><b>이렇게 모을 수 있어요</b><ul>${say || '<li>켜진 적립 규칙이 없어요.</li>'}</ul></div>${use ? `<div class="ph-c"><b>이렇게 쓸 수 있어요</b><ul>${use}</ul></div>` : ''}
      <div class="ph-c"><ul><li>${ic('clock', 16)}${pol.expiry.mode === 'none' ? '쌓인 마일리지는 소멸되지 않아요.' : `쌓인 날부터 ${esc(expTxt(null, pol))} 뒤에 소멸돼요. ${n(pol.notice.monthsBefore)}개월 전부터 미리 알려 드려요.`}</li>${fundedIds().length ? `<li>${ic('lock', 16)}국비 지원 과정에서 쌓은 마일리지는 배지와 학습 기록으로 남아요. 할인 · 장학에는 쓸 수 없어요.</li>` : ''}${minor() && use ? `<li>${ic('user', 16)}보상 신청은 보호자 확인 후 적용돼요.</li>` : ''}</ul></div></div><div class="ph-cta"><span class="btn pri">확인했어요</span></div></div>`;
    const ready = ck.a && ck.b && owner();
    return stepBar(['done', 'done', 'on', 'on', 'on']) + ro + `<div class="mil-g31"><div class="mil-col"><div class="card mil-col"><div><div class="eyebrow">3단계 · ${STEPS[2]}</div><h3>학습자가 무엇으로 바꿀 수 있게 하시겠습니까?</h3></div>
      ${RW.map(card).join('')}<label class="mil-opt as-card ${none ? 'on' : ''}"><input type="checkbox" class="bx" data-chg="mil-d-none" ${none ? 'checked' : ''} aria-label="보상 쓰지 않음"><span class="f1"><span class="t">${ic('x', 20)}보상 쓰지 않음</span><span class="d">적립 · 등급 · 배지만 사용합니다.</span></span></label>
      ${fundedIds().length ? lock('국비 지원 과정 적립분', '국비 지원 과정(내일배움카드 · 사업주훈련 지원)은 금전성 보상을 쓸 수 없습니다. 기관 설정으로 풀 수 없는 제품 고정 항목입니다.') : ''}</div>
      <div class="card mil-col"><div><div class="eyebrow">5단계 · ${STEPS[4]}</div><h3>이렇게 켜집니다</h3></div>
      <div class="mil-g3">${kp('rules', '적립 규칙', `${on.length}개 켬`, '감점 규칙은 끔 · 규칙 버전 1')}${kp('gift', '보상', `${RW.filter(x => x.active).length}종`, tu && tu.active ? `학원비 차감 상한 청구서 ${n(tu.maxUse.billPct)}%` : '금전성 보상 ' + RW.filter(x => x.active && x.cash).length + '종')}${kp('clock', '유효기간', esc(expTxt(null, pol)), '적립 건별' + (pol.guardian ? ' · 보호자 알림 포함' : ''))}</div>
      <label class="mil-check"><input type="checkbox" data-chg="mil-w-ck" data-v="a" ${ck.a ? 'checked' : ''}><span>${tu && tu.active ? '안내 A · B를 읽었고, 학원비 차감 상한과 유효기간을 기관이 정했습니다.' : '권장 정책안을 확인했고, 배점 · 한도 · 유효기간을 기관이 정했습니다.'}</span></label>
      <label class="mil-check"><input type="checkbox" data-chg="mil-w-ck" data-v="b" ${ck.b ? 'checked' : ''}><span>학습자 안내문을 확인했습니다. 켜면 학습자${pol.guardian ? ' · 보호자' : ''}에게 이 안내가 보입니다.</span></label>
      <div class="mil-acts"><span class="mut f1">${ic('history', 16)} 켠 사람 · 시각 · 확인한 안내는 설정 › 변경 이력에 남습니다.</span><button class="btn" data-act="mil-w-next" data-v="2">${ic('back', 18)}이전</button><button class="btn pri" data-act="mil-enable" ${ready ? '' : 'disabled'} aria-disabled="${!ready}">${ic('check', 18)}확인하고 켜기</button></div></div></div>
      <div class="mil-col mil-prev"><div class="mil-row"><span class="eyebrow">4단계 · ${STEPS[3]}</span><span class="mil-ai">${ic('ai', 14)}규칙에서 자동 생성</span></div>${phone}</div></div>`; }

  ACT['mil-restart'] = () => { UI.milRestart = 1; UI.milW = null; render(); };
  ACT['mil-w-use'] = el => { wiz().use = el.dataset.v === '1'; render(); };
  ACT['mil-w-pur'] = el => { const w = wiz(); w.purpose = el.dataset.v; w.draft = null; render(); };
  ACT['mil-w-bud'] = el => { const w = wiz(); w.budget = el.value.replace(/[^\d]/g, ''); w.draft = null; };
  ACT['mil-w-nob'] = el => { const w = wiz(); w.noBudget = el.checked; if (el.checked) w.purpose = 'motive'; w.draft = null; render(); };
  ACT['mil-w-later'] = () => { toast('나중에 마일리지 › 시작하기에서 이어서 설정할 수 있습니다.'); go('home'); };
  ACT['mil-w-ck'] = el => { const w = wiz(); w.checks = w.checks || {}; w.checks[el.dataset.v] = el.checked; render(); };
  ACT['mil-noop'] = () => {};
  ACT['mil-w-next'] = el => { const w = wiz(); const to = +el.dataset.v;
    if (w.step === 1 && to === 2 && !w.use) { if (!owner()) return toast('정운영자만 결정할 수 있습니다.', 'warn'); return confirmCard('마일리지 제도를 사용하지 않습니다', `<p>마일리지 메뉴는 「사용하지 않음」 화면으로 남고, 학습자 화면에는 보이지 않습니다. 언제든 다시 시작할 수 있습니다.</p>`, '사용하지 않기로 저장', () => { const D0 = D(); D0.declined = { at: nowStr(), by: S.me.name }; UI.milRestart = 0; log('onoff', '제도 사용 안 함 선택', '끔', '사용 안 함', ''); save(); toast('사용하지 않기로 저장했습니다.'); render(); }); }
    if (w.step === 1 && to === 2) { const bud = +String(w.budget || '').replace(/[^\d]/g, ''); if (w.purpose === 'cash' && !bud && !w.noBudget) toast('예산이 없으면 금전성 보상마다 경고합니다. 예산 없이 계속합니다.', 'warn'); if (LIVEON() && !w.draft) return pullDraft(() => { w.step = 2; render(); }); }
    w.step = to; render(); };
  function pullDraft(done) { const w = wiz(); const bud = +String(w.budget || '').replace(/[^\d]/g, ''); api('POST', '/api/mileage/draft', { budget: w.noBudget || !bud ? { none: true } : { monthWon: bud }, purpose: w.purpose })
    .then(r => { const base = makeDraft(); const d = { policy: Object.assign(base.policy, (r && r.policy) || {}), rules: (r && r.rules && r.rules.length ? r.rules : base.rules), rewards: (r && r.rewards && r.rewards.length ? r.rewards : base.rewards) }; if (!d.policy.recommended) d.policy.recommended = base.policy.recommended;
      d.hash = (r && r.draftHash) || hash(JSON.stringify(d)); UI.milSimLive = r && r.simulate ? Object.assign({ totalP: 0, convertibleP: 0, perSidAvg: 0, p90: 0 }, r.simulate, { convertibleP: r.simulate.convertibleP != null ? r.simulate.convertibleP : (r.simulate.wonEstimate || 0) }) : null; w.draft = d; done(); })
    .catch(e => { toast(ERRN[ecode(e)] || '권장 정책안을 받지 못해 템플릿으로 보여 드립니다.', 'warn'); w.draft = makeDraft(); done(); }); }
  ACT['mil-w-redraft'] = () => { const w = wiz(); w.draft = null; UI.milSimLive = null; if (LIVEON()) return pullDraft(() => render()); toast('권장 정책안으로 되돌렸습니다.'); render(); };
  ACT['mil-d-on'] = el => { const r = draft().rules[+el.dataset.v]; if (r) r.active = el.checked; UI.milSimLive = null; render(); };
  ACT['mil-d-v'] = el => { const r = draft().rules[+el.dataset.v]; if (r) r.score.v = Math.max(0, Math.round(+el.value || 0)); UI.milSimLive = null; render(); };
  ACT['mil-d-rwon'] = el => { const x = draft().rewards[+el.dataset.v]; if (x) x.active = el.checked; render(); };
  ACT['mil-d-none'] = el => { if (el.checked) draft().rewards.forEach(x => { x.active = false; }); render(); };
  ACT['mil-d-rw'] = el => { const x = draft().rewards[+el.dataset.v]; if (!x) return; const v = Math.max(0, Math.round(+el.value || 0)); if (el.dataset.k === 'billPct') x.maxUse = Object.assign({}, x.maxUse, { billPct: Math.min(100, v) }); else x[el.dataset.k] = v; render(); };
  ACT['mil-enable'] = () => { if (!owner()) return toast('정운영자만 켤 수 있습니다.', 'warn'); const w = wiz(); const ck = w.checks || {}; if (!ck.a || !ck.b) return toast('확인 두 가지를 체크해 주십시오.', 'warn');
    const d = draft(); const pol = Object.assign(clone(d.policy), { on: true, ver: 1, since: today() }); const RU = d.rules.map(r => Object.assign(clone(r), { ver: 1, createdBy: S.me.name, at: nowStr() })); const RW = d.rewards.map(x => clone(x));
    const ackTxt = [RW.some(x => x.active && x.kind === 'tuition') ? '안내 A' : '', RW.some(x => x.active && x.kind === 'tuition') && minor() ? '안내 B' : '', RW.some((x, i) => x.soft && x.active) ? '안내 C' : ''].filter(Boolean).join(' · ');
    if (LIVEON()) { const seq = [['POST', '/api/mileage/config', { policy: polBody(pol), reason: '켜기 마법사' }], ...RU.map(r => ['POST', '/api/mileage/rules', r]), ...RW.map(x => ['POST', '/api/mileage/rewards', x]), ['POST', '/api/mileage/enable', { draftHash: d.hash, ack: ackTxt }]];
      return seq.reduce((pr, c) => pr.then(() => api(c[0], c[1], c[2])), Promise.resolve()).then(() => { UI.milW = null; UI.mil = 'home'; invalidate(); toast('마일리지 제도를 켰습니다. 변경 이력에 기록했습니다.', 'ok'); render(); }).catch(e => { toast(ERRN[ecode(e)] || liveErr(e), 'warn'); }); }
    const D0 = D(); D0.policy = pol; D0.rules = RU; D0.rewards = RW.map(x => Object.assign(x, { createdBy: S.me.name })); D0.declined = null; D0.draftHash = d.hash;
    log('onoff', '마일리지 제도 켜기', '끔', '켬 · 규칙 버전 1', `템플릿 ${tpl().name}`, ackTxt ? `확인한 안내 ${ackTxt}` : ''); log('rule', `적립 규칙 ${RU.filter(r => r.active).length}개 저장(버전 1)`, '', RU.filter(r => r.active).map(r => `${r.label} ${scoreTxt(r)}`).join(', '), '');
    if (RW.some(x => x.active)) log('reward', `보상 ${RW.filter(x => x.active).length}종 저장`, '', RW.filter(x => x.active).map(x => x.title).join(', '), '');
    MC('warnings')(pol, RU, RW).forEach(x => log('policy', x.title, '', '', '', '권장값 벗어남 · 확인함'));
    UI.milW = null; UI.mil = 'home'; save(); toast('마일리지 제도를 켰습니다. 변경 이력에 기록했습니다.', 'ok'); render(); };

  /* ── 한눈에 ── */
  function monthStats() { const td = today(), m = ym(td); const E = entries(); const M = E.filter(e => ym(e.at) === m && e.status !== 'void');
    const sum = k => M.filter(e => e.kind === k && e.status === 'posted').reduce((s, e) => s + e.points, 0);
    const earnConv = M.filter(e => e.kind === 'earn' && e.status === 'posted' && e.convertible).reduce((s, e) => s + e.points, 0);
    const by = {}; M.filter(e => e.kind === 'earn').forEach(e => { by[e.ruleId || 'manual'] = (by[e.ruleId || 'manual'] || 0) + e.points; });
    const W0 = MC('wallet')(E.filter(e => e.status !== 'void')); const sids = new Set(E.filter(e => e.kind === 'earn').map(e => e.sid)).size;
    const tch = {}; M.filter(e => e.byStaff && e.kind !== 'cancel').forEach(e => { tch[e.byStaff] = (tch[e.byStaff] || 0) + e.points; });
    return { earn: sum('earn'), use: -sum('use'), expire: -sum('expire'), hold: -(sum('hold') + sum('release')), earnConv, by, wallet: W0, sids, tch, pend: E.filter(e => e.kind === 'earn' && e.status === 'pending').length }; }
  function vHome() { const p = P(); const live = LIVEON(); const s0 = monthStats(); const sm = live && LV.d.sum ? LV.d.sum : null;
    const byR = sm && Array.isArray(sm.byRule) ? Object.fromEntries(sm.byRule.map(x => [x.ruleId || (x.trigger === 'manual' ? 'manual' : x.trigger), +x.points || 0])) : sm && sm.byRule || {};
    const st = sm ? { earn: +sm.earned || +sm.earn || 0, use: +sm.used || +sm.use || 0, expire: +sm.expired || +sm.expire || 0, hold: +sm.hold || 0, earnConv: sm.budget ? +sm.budget.used || 0 : +sm.earned || 0, by: byR, wallet: { balance: +sm.outstanding || 0, convertible: +sm.outstandingConvertible || 0 }, sids: +sm.wallets || 0, tch: sm.byStaff || {}, pend: +((sm.pending || {}).earn) || 0 } : s0;
    const bud = +(p.budget || {}).monthP || 0; const rate = bud ? Math.round(st.earnConv / bud * 100) : 0; const learners = (S.members || []).length;
    const todo = []; if (st.pend) todo.push({ n: st.pend, text: `확인이 필요한 적립 ${st.pend}건을 확인하십시오`, tab: 'ledger', k: 'pending' });
    (window.MIL_TABS || []).forEach(t => { if (t.todo && (!t.roles || t.roles.includes(S.me.role))) (safe(t.todo, []) || []).forEach(x => { if (x && x.n) todo.push(x); }); });
    if (bud && rate >= 80) todo.push({ n: 1, text: `이번 달 금전성 적립이 예산의 ${rate}%입니다. 상한을 점검하십시오`, tab: 'rules' });
    if (p.sunset) todo.push({ n: 1, text: `제도 종료 예약 — 신규 적립 중단 ${p.sunset.stopEarnAt} · 종료 ${p.sunset.endAt}`, tab: 'set' });
    const RU = rules(); const ruleName = id => (RU.find(r => r.id === id) || {}).label || (id === 'manual' ? '수동 지급 · 조정' : id);
    const by = Object.entries(st.by).sort((a, b) => b[1] - a[1]); const max = by.length ? by[0][1] : 1; const tot = by.reduce((s, x) => s + x[1], 0) || 1;
    const ruleBars = by.length ? by.slice(0, 8).map(([id, v]) => `<div class="mil-hb"><span class="l">${esc(ruleName(id))}</span>${barH(v / max * 100, { aria: `${ruleName(id)} ${fmtP(v)}` })}<span class="v">${fmtP(v)}<small>지급의 ${Math.round(v / tot * 100)}%</small></span></div>`).join('') : `<div class="mil-empty">${ic('inbox', 28)}<p>이번 달 적립이 아직 없습니다. 학습자가 켜진 규칙의 학습을 하면 여기에 쌓입니다.</p>${!live ? `<button class="btn" data-act="mil-demo-ev">${ic('play', 18)}시연: 오늘 학습 사건 보내기</button>` : ''}</div>`;
    const tc = +p.teacherCap || 0; const tBars = tc ? `<div class="card">${ch('users', '강사별 지급 한도', `<span class="mut">강사별 월 ${fmtP(tc)}</span>`)}${Object.keys(st.tch).length ? Object.entries(st.tch).map(([k, v]) => `<div class="mil-hb ${v >= tc ? 'warn' : ''}"><span class="l">${esc(k)}</span>${barH(v / tc * 100)}<span class="v">${n(v)} / ${fmtP(tc)}<small>${v >= tc ? '한도 도달 · 이번 달 지급 멈춤' : '남은 ' + fmtP(tc - v)}</small></span></div>`).join('') : '<p class="mut">이번 달 강사 지급이 없습니다.</p>'}<p class="mut sm">한도에 닿으면 그달 지급은 멈추고, 정운영자 확인으로만 늘릴 수 있습니다.</p></div>` : '';
    const top = by[0]; const share = top ? Math.round(top[1] / tot * 100) : 0;
    const ai = top && share >= 40 && !UI.milAiX ? `<div class="card mil-airow"><span class="mil-ai">${ic('ai', 14)}AI 주간 정책 점검</span><p class="f1">「${esc(ruleName(top[0]))}」 규칙이 이번 달 지급의 <b>${share}%</b>를 차지합니다. 하루 상한을 낮추면 예산 소진이 완만해집니다. 권장값과 같다면 그대로 두셔도 됩니다.</p><button class="btn" data-act="mil-ai-x">무시</button><button class="btn" data-act="tab" data-key="mil" data-v="rules">변경안 보기</button></div>` : '';
    const tabs2 = tabList().map(t => t.id);
    return `${note('info', '지금 할 일', todo.length ? `<ul class="mil-todo">${todo.map(x => `<li>${esc(x.text)}${x.tab && tabs2.includes(x.tab) ? ` <button class="btn sm" data-act="mil-go" data-v="${esc(x.tab)}" data-k="${esc(x.k || '')}">보기</button>` : ''}</li>`).join('')}</ul>` : '확인할 일이 없습니다. 적립은 규칙대로 자동으로 쌓입니다.')}
      <div class="mil-g4">${kp('plus', '이번 달 적립', fmtP(st.earn), `${ym(today())} · 학습자 ${n(st.sids)}명${learners ? ` / ${n(learners)}명` : ''}`)}${kp('gift', '이번 달 사용', fmtP(st.use), `사용 대기 ${fmtP(st.hold)} · 소멸 ${fmtP(st.expire)}`)}
      ${kp('wallet', p.won ? '미사용 잔액(추정액)' : '미사용 잔액', p.won ? won(st.wallet.convertible) : fmtP(st.wallet.balance), p.won ? `1${esc(p.ab)} = 1원 · 금전성 보상에 쓸 수 있는 양 기준 · 충당 판단은 기관 회계` : '비현금형 · 원 환산 없음')}
      ${kp('chart', '월 예산 소진', bud ? rate + '%' : '예산 없음', bud ? '' : '설정 › 예산에서 넣을 수 있습니다', bud ? barH(rate, { thin: 1, ticks: [80], l: '80% 알림', r: '월 ' + won(bud) }) : '')}</div>
      <div class="mil-g2"><div class="card">${ch('rules', '규칙별 지급', `<span class="mut">${ym(today())}</span>`)}${ruleBars}</div>${tBars || `<div class="card">${ch('shield', '안전 장치')}<ul class="mil-x ok"><li>${ic('check', 16)}1인 하루 총 상한 ${fmtP(p.dailyCapTotal)}</li><li>${ic('check', 16)}참여형 적립은 금전성 보상에서 제외${p.cashLock && p.cashLock.achievementOnly ? '' : ' — <b>잠금을 풀었습니다</b>'}</li><li>${ic('check', 16)}국비 지원 과정 ${n(fundedIds().length)}개 금전성 보상 차단(제품 고정)</li><li>${ic('check', 16)}공개 순위 ${p.rank && p.rank.on ? '켬' : '끔'} · 감점 ${p.penalty && p.penalty.on ? '켬' : '끔'}</li></ul></div>`}</div>${ai}`; }
  ACT['mil-go'] = el => { UI.mil = el.dataset.v; if (el.dataset.k) UI.milK = el.dataset.k; invalidate(); render(); };
  ACT['mil-ai-x'] = () => { UI.milAiX = 1; render(); };
  ACT['mil-demo-ev'] = () => { if (LIVEON()) return; const D0 = D(); const td = today(); const ev = demoEvents(1).slice(0, 60).map(e => Object.assign(e, { at: td, id: 'live' + idem() }));
    const r = MC('applyEvents')(polCalc(), D0.rules, ev, D0.entries); D0.entries.push(...r.entries); save(); toast(`학습 사건 ${ev.length}건 중 ${r.entries.length}건이 규칙대로 적립되었습니다(상한 · 1회성으로 ${r.skipped.length}건 제외).`, 'ok'); render(); };

  /* ── 적립 규칙 ── */
  function vRules() { const p = P(); const RU0 = rules(); const RU = UI.milNew && !RU0.some(r => r.id === UI.milNew.id) ? [...RU0, UI.milNew] : RU0; const rc = p.recommended || {}; const sel = RU.find(r => r.id === UI.milR) || RU[0]; const ro = teacher() || S.me.role === 'teacher';
    const f = UI.milRF || 'all'; const offRec = r => { const x = (rc.rules || {})[r.id]; return x && (r.score || {}).v != null && (x.score || {}).v != null && +r.score.v !== +x.score.v; };
    const L = RU.filter(r => f === 'all' || (f === 'on' && r.active) || (f === 'off' && !r.active) || (f === 'rec' && offRec(r)));
    const rows = L.map(r => { const x = (rc.rules || {})[r.id]; return `<tr class="${sel && r.id === sel.id ? 'sel' : ''}"><td>${sw(r.active, 'mil-r-on', r.id, r.label + ' 켜기', ro)}</td><td><button class="mil-lnk" data-act="mil-r-sel" data-v="${esc(r.id)}"><b>${esc(r.label)}</b></button><small>${esc(sayTxt(r))}</small></td><td class="num">${esc(scoreTxt(r))}${x && offRec(r) ? `<div>${rec(scoreTxt(Object.assign({}, r, { score: x.score })), scoreTxt(r))}</div>` : ''}</td><td>${esc(capTxt(r))}<small>${esc(ONCE[r.once] || r.once)}</small></td><td>${esc(APPR[r.approval] || r.approval)}<small>${trTag(r.trustMin)} · ${esc(NAT[r.nature] || '')}</small></td><td class="nw">${esc(expTxt(r))}</td></tr>`; }).join('');
    const pen = p.penalty && p.penalty.on ? `<tr><td>${sw(true, 'mil-noop', '', '감점', true)}</td><td><b>감점</b><small>사유 ${esc((p.penalty.reasons || []).join(', ') || '-')}</small></td><td colspan="4">1회 최대 ${fmtP(p.penalty.maxOnce)} · 하루 ${fmtP(p.penalty.dayCap)} · 학습자에게 사유가 보입니다</td></tr>`
      : `<tr class="mil-lockrow"><td>${sw(false, 'mil-noop', '', '감점 규칙', true)}</td><td><b>감점(결석 · 지각)</b><small>${ic('lock', 14)} ${minor() ? '미성년 학습자 기관 · ' : ''}권장값으로 끔</small></td><td colspan="4"><span class="mil-row">${ic('info', 16)}실수 · 결석은 「적립 없음」으로 처리합니다.${owner() ? `<button class="btn sm" data-act="mil-go" data-v="set">켜려면 설정 › 순위 · 감점${ic('chev', 16)}</button>` : ''}</span></td></tr>`;
    const panel = sel ? rulePanel(sel, ro) : '';
    const ev = UI.milEv || (UI.milEv = demoEvents(30)); const pol = polCalc(); const sim = MC('simulate')(pol, RU, ev); const recR = RU.map(r => { const x = (rc.rules || {})[r.id]; return x ? Object.assign({}, r, { score: x.score }) : r; }); const simR = MC('simulate')(pol, recR, ev);
    const bud = +(p.budget || {}).monthP || 0; const rC = bud ? Math.round(sim.convertibleP / bud * 100) : 0, rR = bud ? Math.round(simR.convertibleP / bud * 100) : 0; const diff = sim.totalP - simR.totalP;
    const simCard = `<div class="card mil-col">${ch('chart', '모의 계산 · 지난 30일 학습 기록에 적용', `<span class="mut">${LIVEON() ? '운영 서버 사건' : '시연 사건'} ${n(sim.events)}건</span>`)}
      <div class="mil-sim"><div><span class="k">현재 값으로 월 적립</span><span class="v">${fmtP(sim.totalP)}</span><span class="s">${bud ? '예산 대비 ' + rC + '%' : '예산 없음'}</span></div><div><span class="k">권장값이면</span><span class="v">${fmtP(simR.totalP)}</span><span class="s">${bud ? '예산 대비 ' + rR + '%' : '—'}</span></div>
      <div><span class="k">차이</span><span class="v ${diff > 0 ? 'wtx' : ''}">${sgn(diff)}</span><span class="s">${p.won ? '금전성 ' + won(sim.convertibleP - simR.convertibleP) : '비현금형'}</span></div><div><span class="k">1인 평균 · 상위 10% 1인</span><span class="v">${fmtP(sim.perSidAvg)}</span><span class="s">상위 10% ${fmtP(sim.p90)}(권장값이면 ${fmtP(simR.p90)})</span></div></div>
      ${bud ? `<div><div class="mil-row sb"><span>현재 값 기준 예산 소진 예상</span><b class="num">${rC}%</b></div>${barH(Math.min(rC, rR), { pend: Math.max(0, rC - rR), ticks: [80], l: `권장값 ${rR}% · 빗금 = 현재 값으로 늘어나는 양`, r: '월 예산 ' + won(bud) })}</div>` : ''}
      ${diff > 0 ? note('warn', '권장값을 벗어난 값이 있습니다 — 저장은 막지 않습니다', '보상이 커지면 월 예산 소진이 빨라질 수 있습니다. 예산 80%에 닿으면 「한눈에」와 AI SAM 브리핑으로 알려 드립니다.') : ''}</div>`;
    const fc = fundedIds().length;
    return `<div class="mil-row wrap">${[['all', `전체 ${RU.length}`], ['on', `켜짐 ${RU.filter(r => r.active).length}`], ['rec', `권장값과 다름 ${RU.filter(offRec).length}`], ['off', `꺼짐 ${RU.filter(r => !r.active).length}`]].map(([k, l]) => `<button class="mil-chip ${f === k ? 'on' : ''}" data-act="mil-rf" data-v="${k}" aria-pressed="${f === k}">${esc(l)}</button>`).join('')}
      <span class="mut f1 ar">템플릿 ${esc((TPL[p.template] || tpl()).name)} · 기관이 모든 값을 정합니다</span>${ro ? '' : `<button class="btn" data-act="mil-go" data-v="log">${ic('history', 18)}변경 이력</button><button class="btn" data-act="mil-r-add">${ic('plus', 18)}규칙 추가</button>`}</div>
      ${fc ? `<div class="mil-row">${locktag('국비 지원 과정 ' + fc + '개')}<span class="mut">이 과정들의 적립은 배지 · 학습 기록 · 등급에만 쓰이고 금전성 보상에서 빠집니다(제품 고정).</span></div>` : ''}
      <div class="mil-split"><div class="f1 tw"><table class="mil-tbl"><thead><tr><th>켜기</th><th>규칙 · 학습자 안내</th><th>배점</th><th>한도 · 1회성</th><th>승인 · 신뢰 · 성격</th><th>유효</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="mut">해당 규칙이 없습니다.</td></tr>'}${pen}</tbody></table></div>${panel}</div>${simCard}`; }
  function rulePanel(r0, ro) { const p = P(); const x = ((p.recommended || {}).rules || {})[r0.id]; const r = (UI.milRE && UI.milRE.id === r0.id) ? UI.milRE : (UI.milRE = clone(r0)); const changed = JSON.stringify(r) !== JSON.stringify(r0) || !r0.ver;
    const inp = (k, v, lab, o = {}) => `<input class="mil-num" type="number" min="${o.min == null ? 0 : o.min}" value="${v == null ? '' : v}" data-chg="mil-re" data-k="${k}" aria-label="${esc(lab)}" ${ro ? 'disabled' : ''} placeholder="${esc(o.ph || '')}">`;
    const sel = (k, v, M0, lab, dis) => `<select data-chg="mil-re" data-k="${k}" aria-label="${esc(lab)}" ${ro || dis ? 'disabled' : ''}>${Object.entries(M0).map(([a, b]) => `<option value="${a}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
    const sc = r.score || {}; const recS = x ? scoreTxt(Object.assign({}, r, { score: x.score })) : '';
    return `<aside class="card mil-panel" aria-label="규칙 편집"><div class="mil-row ph"><div class="f1"><div class="eyebrow">${esc(r.id)} · 버전 ${n(r0.ver || 1)}</div><b class="t">${esc(r.label)}</b></div>${changed ? `<span class="pill p-wait">${ic('edit', 14)}고치는 중</span>` : x && JSON.stringify(x.score) !== JSON.stringify(r0.score) ? `<span class="pill p-wait">${ic('edit', 14)}기관 설정</span>` : `<span class="pill p-ok">권장값</span>`}</div>
      <div class="mil-kv"><span class="k">트리거</span><span class="v">${esc((TRIG[r.trigger] || [r.trigger])[0])}</span></div>
      <div class="mil-kv"><span class="k">이름</span><input value="${esc(r.label)}" maxlength="30" data-chg="mil-re" data-k="label" aria-label="규칙 이름" ${ro ? 'disabled' : ''}></div>
      <div class="mil-kv"><span class="k">배점</span>${sc.mode === 'source' ? '<span class="v">비교과 프로그램 값 그대로</span>' : sc.mode === 'band' ? `<span class="v">${esc(scoreTxt(r))}</span>` : `<span class="mil-inp ${x && (x.score || {}).v != null && +sc.v !== +x.score.v ? 'warn' : ''}">${inp('score.v', sc.v, '배점')}<em>${esc(p.ab)}</em></span>${x ? rec(recS, scoreTxt(r), +sc.v > +((x.score || {}).v) ? `권장 ${recS}보다 높습니다. 보상이 커지면 월 예산 소진이 빨라질 수 있습니다.` : `권장 ${recS}보다 낮습니다. 학습자가 체감하기 어려울 수 있습니다.`) : ''}`}</div>
      <div class="mil-kv"><span class="k">하루 · 월 상한</span><span class="mil-row">${inp('caps.day', (r.caps || {}).day, '하루 상한', { ph: '없음' })}${inp('caps.month', (r.caps || {}).month, '월 상한', { ph: '없음' })}</span></div>
      <div class="mil-kv"><span class="k">1회성</span>${sel('once', r.once, ONCE, '1회성')}</div>
      <div class="mil-kv"><span class="k">승인</span>${sel('approval', r.approval, APPR, '승인')}</div>
      <div class="mil-kv"><span class="k">신뢰 최소</span>${sel('trustMin', r.trustMin, { A: 'A 서버 확인만', B: 'B 운영자 확정 이상', C: 'C 기기 보고 허용' }, '신뢰 최소')}${x && trustN(r.trustMin) < trustN(x.trustMin) ? rec(x.trustMin, r.trustMin, '기기가 보고한 사건까지 적립합니다. 현금성 보상과 연결되지 않게 두십시오.') : ''}</div>
      <div class="mil-kv"><span class="k">성격</span>${sel('nature', r.nature, NAT, '성격', FIXED_PAR.includes(r.trigger))}<small class="mut">${r.nature === 'achievement' ? '금전성 보상에 쓸 수 있는 적립' : '배지 · 등급 · 연속 학습에만 쓰이는 적립'}</small></div>
      <div class="mil-kv"><span class="k">유효기간</span><span class="mil-row">${inp('expiry.months', r.expiry && r.expiry.months, '유효기간 개월', { ph: '정책 따름' })}<em class="mut">개월</em></span>${rec(expTxt(null), r.expiry && r.expiry.months ? r.expiry.months + '개월' : expTxt(null))}</div>
      <div class="mil-kv"><span class="k">학습자에게 보이는 문장</span><input value="${esc(r.say)}" maxlength="60" data-chg="mil-re" data-k="say" aria-label="학습자 문장" ${ro ? 'disabled' : ''}><small class="mut">「${esc(sayTxt(r))}」 · {P}는 배점으로 바뀝니다</small></div>
      ${ro ? '' : `<div class="mil-col"><button class="btn" data-act="mil-r-reset" data-v="${esc(r.id)}" ${x ? '' : 'disabled'}>${ic('refresh', 18)}권장값으로 되돌리기</button><button class="btn pri" data-act="mil-r-save" ${changed ? '' : 'disabled'}>${ic('check', 18)}변경 내용 확인하고 저장</button><span class="mut sm">저장하면 규칙 버전이 올라가고 설정 › 변경 이력에 남습니다. 이미 쌓인 적립은 바뀌지 않습니다.</span></div>`}</aside>`; }
  ACT['mil-rf'] = el => { UI.milRF = el.dataset.v; render(); };
  ACT['mil-r-sel'] = el => { UI.milR = el.dataset.v; UI.milRE = null; render(); };
  ACT['mil-re'] = el => { const r = UI.milRE; if (!r) return; const k = el.dataset.k; let v = el.value; if (el.type === 'number') v = el.value === '' ? null : Math.max(0, Math.round(+el.value));
    if (k.includes('.')) { const [a, b] = k.split('.'); r[a] = Object.assign({}, r[a] || {}); if (a === 'expiry') { if (v == null) r.expiry = null; else r.expiry = { mode: 'months', months: v }; } else if (v == null) delete r[a][b]; else r[a][b] = v; } else r[k] = v; render(); };
  ACT['mil-r-reset'] = el => { const p = P(); const x = ((p.recommended || {}).rules || {})[el.dataset.v]; if (!x || !UI.milRE) return; Object.assign(UI.milRE, clone({ score: x.score, caps: x.caps, once: x.once, trustMin: x.trustMin, approval: x.approval, nature: x.nature })); render(); };
  ACT['mil-r-on'] = el => { const r = rules().find(x => x.id === el.dataset.v); if (!r) return; const nr = Object.assign(clone(r), { active: el.checked }); saveRule(r, nr, el); };
  ACT['mil-r-save'] = () => { const nr = UI.milRE; const r = rules().find(x => x.id === (nr || {}).id); if (!nr) return; saveRule(r, Object.assign(clone(nr), { trigger: nr.trigger })); };
  function saveRule(r, nr, el) { if (teacher()) return; const p = P(); const warn = MC('warnings')(p, [nr], []).concat(); const ev = UI.milEv || (UI.milEv = demoEvents(30));
    const RU = rules().map(x => x.id === nr.id ? nr : x); const a = MC('simulate')(polCalc(), rules(), ev), b = MC('simulate')(polCalc(), RU, ev); const diffs = [];
    const fmt = x => x ? `${x.active ? '켬' : '끔'} · ${scoreTxt(x)} · ${capTxt(x)} · ${ONCE[x.once] || x.once} · ${APPR[x.approval] || x.approval} · 신뢰 ${x.trustMin} · ${NAT[x.nature]}` : '새 규칙';
    confirmCard('적립 규칙 저장', `<div class="mil-kv"><span class="k">규칙</span><b>${esc(nr.label)}</b></div><div class="mil-kv"><span class="k">전</span><span class="mut">${esc(fmt(r))}</span></div><div class="mil-kv"><span class="k">후</span><b>${esc(fmt(nr))}</b></div>
      <div class="mil-kv"><span class="k">모의 계산(30일)</span><span>${fmtP(a.totalP)} → <b>${fmtP(b.totalP)}</b></span></div>${warn.map(x => note('warn', x.title, esc(x.text))).join('')}
      <p class="mut">저장 이후 사건부터 적용합니다. 이미 쌓인 적립은 바뀌지 않고, 규칙 버전이 올라갑니다.</p>${diffs.join('')}`, '확인하고 저장', () => {
      const ver = (+(r && r.ver) || 0) + 1; const body = Object.assign(clone(nr), { ver });
      if (LIVEON()) { liveDo('POST', '/api/mileage/rules', body, res => { UI.milRE = null; UI.milNew = null; toast(`규칙을 저장했습니다(버전 ${ver}).${res && res.warnings && res.warnings.length ? ' 권장값과 다른 값이 있습니다.' : ''}`, 'ok'); }).catch(() => {}); return; }
      const D0 = D(); const i = D0.rules.findIndex(x => x.id === nr.id); if (i >= 0) D0.rules[i] = body; else D0.rules.push(body);
      log('rule', `${nr.label}${r ? '' : ' 추가'}`, r ? `${r.active ? '' : '끔 · '}${scoreTxt(r)}` : '', `${nr.active ? '' : '끔 · '}${scoreTxt(body)} (버전 ${ver})`, '', warn.length ? '권장값 벗어남 · 확인함' : '');
      UI.milRE = null; UI.milNew = null; save(); toast(`규칙을 저장했습니다(버전 ${ver}).`, 'ok'); render(); });
    if (el) el.checked = !el.checked; /* 확인 전에는 스위치를 되돌려 둔다 */ }
  ACT['mil-r-add'] = () => { const used = new Set(rules().map(r => r.trigger)); modal('규칙 추가', `<div class="mil mil-m"><p>어떤 학습 행동에 적립할지 고르십시오. 고른 뒤 오른쪽 편집 칸에서 배점 · 상한을 정하고 저장합니다.</p><div class="mil-g2">${Object.entries(TRIG).map(([k, v]) => `<button type="button" class="mil-opt" data-mact="t:${k}"><span class="f1"><span class="t">${esc(v[0])}${used.has(k) ? '<span class="pill p-off">사용 중</span>' : ''}</span><span class="d">${esc(v[4].replace('{P}', '…'))} · ${esc(NAT[FIXED_PAR.includes(k) ? 'participation' : v[3]])} · 신뢰 ${v[2]}</span></span></button>`).join('')}</div></div>`,
    [{ id: 'c', label: '취소' }, ...Object.keys(TRIG).map(k => ({ id: 't:' + k, label: '', run: () => { const r = R('x' + Date.now().toString(36).slice(-5), k, 10); r.ver = 0; r.active = true; UI.milR = r.id; UI.milNew = r; UI.milRE = clone(r); render(); } }))], true); setTimeout(() => { document.querySelectorAll('#modal .mf [data-mact^="t:"]').forEach(b => b.remove()); }, 0); };

  /* ── 내역 ── */
  function vLedger() { const p = P(); const E = entries(); const k = UI.milK || 'all'; const q = (UI.milQ || '').trim();
    const L = E.filter(e => (!q || String(e.sid).includes(q)) && (k === 'all' || (k === 'funded' ? e.funded : k === 'pending' ? e.status === 'pending' : k === 'fix' ? ['cancel', 'adjust', 'restore', 'penalty'].includes(e.kind) : e.kind === k))).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const pg = Math.max(1, +UI.milPg || 1); const per = 50; const V = L.slice((pg - 1) * per, pg * per); const RU = rules(); const rn = id => (RU.find(r => r.id === id) || {}).label || '';
    const sumF = L.reduce((s, e) => s + (e.status === 'void' ? 0 : e.points), 0);
    const rows = V.map(e => [`<span class="nw num">${esc(String(e.at).slice(0, 16))}</span>`, `<button class="mil-lnk" data-act="mil-sid" data-v="${esc(e.sid)}">${esc(who(e.sid))}</button>`, `${e.status === 'pending' ? '<span class="pill p-wait">확인 대기</span> ' : e.status === 'void' ? '<span class="pill p-bad">무효</span> ' : ''}${esc(KIND[e.kind] || e.kind)}`,
      `${esc(e.reason || rn(e.ruleId) || '')}${e.byStaff ? `<small>${esc(e.byStaff)}</small>` : ''}${e.refEntry ? `<small>원 줄 ${esc(e.refEntry)}</small>` : ''}`, trTag(e.trust), e.funded ? locktag('국비 과정 · 기록만') : e.kind === 'earn' ? (e.convertible ? '<span class="pill p-ok">전환 가능</span>' : `<span class="pill p-off">${e.nature === 'participation' ? '참여형 · 배지 · 등급만' : '전환 안 됨'}</span>`) : '',
      `<span class="nw">${esc(e.expiresAt ? String(e.expiresAt).slice(0, 10) : '—')}</span>`, `<b class="num ${e.points > 0 ? 'gtx' : e.kind === 'cancel' || e.kind === 'penalty' ? 'btx' : ''}">${sgn(e.points)}</b>`,
      !teacher() && e.kind === 'earn' && e.status !== 'void' && !E.some(x => x.refEntry === e.id && x.kind === 'cancel') ? (e.status === 'pending' ? `<button class="btn sm" data-act="mil-ok-earn" data-v="${esc(e.id)}">확인</button>` : '') + `<button class="btn sm ghost" data-act="mil-cancel" data-v="${esc(e.id)}">취소</button>` : '']);
    const W0 = q ? MC('wallet')(E.filter(e => e.status !== 'void'), q) : null;
    return `<div class="mil-row wrap">${[['all', '전체'], ['earn', '적립'], ['use', '사용'], ['expire', '소멸'], ['fix', '취소 · 조정'], ['pending', '확인 대기'], ['funded', '국비 과정 적립분']].map(([a, b]) => `<button class="mil-chip ${k === a ? 'on' : ''}" data-act="mil-k" data-v="${a}" aria-pressed="${k === a}">${a === 'funded' ? ic('lock', 14) : ''}${esc(b)}</button>`).join('')}
      <label class="mil-srch f1"><span class="sr">학습자 번호 검색</span><input type="search" value="${esc(q)}" placeholder="학습자 번호(뒤 4자리 이상)" data-chg="mil-q" inputmode="numeric"></label>
      <button class="btn" data-act="mil-csv">${ic('download', 18)}CSV</button>${!LIVEON() ? `<button class="btn" data-act="mil-demo-ev">${ic('play', 18)}시연 사건</button>` : ''}<button class="btn pri" data-act="mil-grant">${ic('plus', 18)}수동 지급 · 조정</button></div>
      ${W0 ? `<div class="mil-g3">${kp('wallet', who(q) + ' 잔액', fmtP(W0.balance))}${kp('clock', '적립 예정(확인 대기)', fmtP(W0.pending))}${kp('gift', '금전성 보상에 쓸 수 있는 양', fmtP(W0.convertible))}</div>` : ''}
      ${k === 'funded' ? `<p class="mut">이 필터의 합계 ${sgn(sumF)} · 등급 · 배지 · 연속 학습에는 반영되고, 금전성 보상 소진 순서에서는 건너뜁니다.</p>` : ''}
      ${table(['일시', '학습자', '종류', '내용', '신뢰', '금전성 보상', '유효기간', '포인트', ''], rows, E.length ? '조건에 맞는 줄이 없습니다.' : '아직 원장 줄이 없습니다. 학습자가 켜진 규칙의 학습을 하면 여기에 쌓입니다.')}
      ${L.length > per ? `<div class="mil-row">${pg > 1 ? `<button class="btn sm" data-act="mil-pg" data-v="${pg - 1}">이전</button>` : ''}<span class="mut">${pg} / ${Math.ceil(L.length / per)}쪽 · ${n(L.length)}줄</span>${pg * per < L.length ? `<button class="btn sm" data-act="mil-pg" data-v="${pg + 1}">다음</button>` : ''}</div>` : ''}
      <p class="mut sm">원장 줄은 지우거나 고치지 않습니다. 취소 · 정정은 반대 줄로 남고, 이미 쓴 적립을 취소하면 잔액이 음수가 되어 다음 적립에서 상계됩니다. 학습자 번호만 보이고 이름 · 연락처는 싣지 않습니다.</p>`; }
  ACT['mil-k'] = el => { UI.milK = el.dataset.v; UI.milPg = 1; invalidate(); render(); };
  ACT['mil-q'] = el => { UI.milQ = el.value.replace(/[^\w-]/g, '').slice(0, 20); UI.milPg = 1; invalidate(); render(); };
  ACT['mil-sid'] = el => { UI.milQ = el.dataset.v; UI.milPg = 1; invalidate(); render(); };
  ACT['mil-pg'] = el => { UI.milPg = +el.dataset.v; render(); };
  ACT['mil-csv'] = () => { if (LIVEON()) { const a = document.createElement('a'); a.href = (LIVE.base || '') + '/api/mileage/entries?' + qs({ sid: UI.milQ || '', format: 'csv' }); a.download = `마일리지내역_${today()}.csv`; a.click(); return; }
    const RU = rules(); downloadCSV(`마일리지내역_${today()}.csv`, ['일시', '학습자 번호', '종류', '상태', '내용', '신뢰', '국비 과정', '금전성 전환', '유효기간', '포인트'], entries().map(e => [e.at, e.sid, KIND[e.kind] || e.kind, e.status, e.reason || (RU.find(r => r.id === e.ruleId) || {}).label || '', e.trust || '', e.funded ? '예' : '', e.convertible ? '가능' : '', e.expiresAt || '', e.points])); };
  ACT['mil-ok-earn'] = el => { const e = D().entries.find(x => x.id === el.dataset.v); if (!e && !LIVEON()) return;
    confirmCard('적립 확인', `<p>${esc(who(e ? e.sid : ''))}의 「${esc(e ? e.reason : '')}」 적립 ${e ? sgn(e.points) : ''}를 확정합니다. 확정일부터 유효기간이 계산됩니다.</p>`, '확정', () => {
      if (LIVEON()) { liveDo('POST', '/api/mileage/approvals/decide', { ids: [el.dataset.v], decision: 'approve' }, () => toast('확정했습니다.', 'ok')).catch(() => {}); return; }
      const r = rules().find(x => x.id === e.ruleId); e.status = 'posted'; e.postedAt = today(); e.expiresAt = expOf(P(), r, today()); if (typeof logAudit === 'function') logAudit(`마일리지 적립 확정 — ${who(e.sid)} ${sgn(e.points)}`); save(); toast('확정했습니다.', 'ok'); render(); }); };
  ACT['mil-cancel'] = el => { const id = el.dataset.v; const e = entries().find(x => x.id === id); if (!e) return;
    modal('적립 취소', `<div class="mil mil-m"><p>${esc(who(e.sid))}의 적립 ${sgn(e.points)}(${esc(e.reason || '')})을 반대 줄로 취소합니다. 원래 줄은 지우지 않고 남습니다. 이미 쓴 적립이면 잔액이 음수가 되어 다음 적립에서 상계됩니다.</p><label class="mil-fld"><span>취소 사유(필수, 학습자에게 보입니다)</span><input name="r" maxlength="80"></label></div>`,
      [{ id: 'c', label: '닫기' }, { id: 'ok', label: '취소 줄 남기기', kind: 'pri', run: w => { const why = fv(w, 'r'); if (!why) { toast('사유를 적어 주십시오.', 'warn'); return false; }
        if (LIVEON()) { liveDo('POST', '/api/mileage/cancel', { entryId: id, reason: why }, () => toast('취소 줄을 남겼습니다.', 'ok')).catch(() => {}); return; }
        if (e.status === 'pending') { e.status = 'void'; } else D().entries.push({ id: 'me_' + idem(), sid: e.sid, scopeUnit: e.scopeUnit, kind: 'cancel', points: -e.points, status: 'posted', nature: e.nature, trust: e.trust, convertible: e.convertible, funded: e.funded, clsId: e.clsId, ruleId: e.ruleId, refEntry: e.id, reason: why, byStaff: S.me.name, idemKey: 'c:' + e.id, at: nowStr() });
        if (typeof logAudit === 'function') logAudit(`마일리지 적립 취소 — ${who(e.sid)} ${sgn(-e.points)} · ${why}`); save(); toast('취소 줄을 남겼습니다.', 'ok'); render(); } }]); };
  /* 수동 지급 · 조정: 입력 → 확인 카드 → 실행. 본인 지급 금지(제품 고정) · 강사별 월 한도 · 기준 넘으면 정운영자 승인 대기 */
  ACT['mil-grant'] = () => { const p = P(); const tc = +p.teacherCap || 0; const mine = entries().filter(e => e.byStaff === S.me.name && ym(e.at) === ym(today()) && e.kind !== 'cancel').reduce((s, e) => s + e.points, 0);
    modal('수동 지급 · 조정', `<div class="mil mil-m"><label class="mil-fld"><span>학습자 번호(쉼표로 여러 명, 최대 50명)</span><input name="sids" placeholder="예: 7100010, 7100023" maxlength="600"></label>
      <div class="mil-g2"><label class="mil-fld"><span>포인트(음수 = 차감 조정)</span><input name="pts" type="number" step="10" value="100"></label><label class="mil-fld"><span>사유(필수, 학습자에게 보입니다)</span><input name="why" maxlength="60" placeholder="예: 발표 우수"></label></div>
      ${tc ? `<p class="mut">강사별 월 지급 한도 ${fmtP(tc)} · 이번 달 ${esc(S.me.name)} 지급 ${fmtP(mine)}</p>` : ''}<p class="mut">1회 ${fmtP(p.manualOver || 1000)}을 넘으면 정운영자 승인 대기로 들어갑니다. 수동 지급은 순위 · 리그 집계에서 빠집니다.</p>
      ${lock('운영자 본인 · 가족 계정 지급 금지', '직원 계정과 같은 연락처를 쓰는 학습자에게는 지급할 수 없습니다. 서버가 매번 다시 확인합니다.')}</div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '다음 · 확인', kind: 'pri', run: w => { const sids = [...new Set(fv(w, 'sids').split(/[,\s]+/).map(x => x.trim()).filter(Boolean))].slice(0, 50); const pts = Math.round(+fv(w, 'pts') || 0); const why = fv(w, 'why');
        if (!sids.length || sids.some(x => !/^[\w-]{3,20}$/.test(x))) { toast('학습자 번호를 확인해 주십시오. 이름 · 연락처는 넣지 않습니다.', 'warn'); return false; } if (!pts) { toast('포인트를 넣어 주십시오.', 'warn'); return false; } if (!why) { toast('사유를 적어 주십시오.', 'warn'); return false; }
        if (tc && pts > 0 && mine + pts * sids.length > tc && !owner()) { toast(`강사별 월 지급 한도(${fmtP(tc)})를 넘습니다.`, 'warn'); return false; }
        const self = S.me && S.me.sid && sids.includes(String(S.me.sid)); if (self) { toast('운영자 본인 계정에는 지급할 수 없습니다(제품 고정).', 'warn'); return false; }
        const over = Math.abs(pts) > (+p.manualOver || 1000) && !owner(); const key = idem();
        setTimeout(() => confirmCard('지급 확인', `<div class="mil-kv"><span class="k">대상</span><b>${sids.length}명</b><span class="mut">${esc(sids.slice(0, 5).map(who).join(', '))}${sids.length > 5 ? ' 외' : ''}</span></div><div class="mil-kv"><span class="k">1인</span><b>${sgn(pts)}</b></div><div class="mil-kv"><span class="k">합계</span><b>${sgn(pts * sids.length)}</b></div><div class="mil-kv"><span class="k">사유</span>${esc(why)}</div>${over ? note('warn', '정운영자 승인 대기', '기준을 넘는 지급이라 정운영자가 확인한 뒤 적립됩니다.') : ''}`, over ? '승인 요청' : '지급', () => {
          if (LIVEON()) { liveDo('POST', '/api/mileage/grant', { sids, points: pts, reason: why, idem: key }, r => { const L = (r && r.results) || []; toast(L.some(x => x.status === 'pending') ? '정운영자 승인 대기로 넣었습니다.' : L.some(x => x.status === 'skipped') ? `지급하지 못한 학습자가 있습니다(${String((L.find(x => x.status === 'skipped') || {}).reason || '한도')}).` : `${L.length || sids.length}명에게 ${pts > 0 ? '지급' : '조정'}했습니다.`, L.some(x => x.status === 'skipped') ? 'warn' : 'ok'); }).catch(() => {}); return; }
          const D0 = D(); sids.forEach(sid => { if (D0.entries.some(e => e.idemKey === `m:${S.me.name}:${key}:${sid}`)) return; D0.entries.push({ id: 'me_' + idem(), sid, scopeUnit: 'lu_root', kind: pts > 0 ? 'earn' : 'adjust', points: pts, status: over ? 'pending' : 'posted', nature: 'achievement', trust: 'B', convertible: pts > 0, funded: false, clsId: null, ruleId: 'manual', ruleVer: 0, expiresAt: pts > 0 && !over ? expOf(P(), null, today()) : null, reason: why, byStaff: S.me.name, idemKey: `m:${S.me.name}:${key}:${sid}`, at: nowStr(), manual: true }); });
          if (typeof logAudit === 'function') logAudit(`마일리지 수동 ${pts > 0 ? '지급' : '조정'} — ${sids.length}명 × ${sgn(pts)} · ${why}`); save(); toast(over ? '정운영자 승인 대기로 넣었습니다.' : `${sids.length}명에게 ${pts > 0 ? '지급' : '조정'}했습니다.`, 'ok'); render(); }), 0); } }]); };

  /* ── 설정 ── */
  const SETK = () => UI.milSD || (UI.milSD = clone(P()));
  function vSet() { const p0 = P(); const p = SETK(); const ro = !owner(); const changed = JSON.stringify(p) !== JSON.stringify(p0); const rc = p.recommended || {};
    const row = (k, sub, v) => `<div class="mil-set"><span class="k">${esc(k)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><div class="v">${v}</div></div>`;
    const sec = (icn, t, body, r = '') => `<section class="card">${ch(icn, t, r)}${body}</section>`;
    const inp = (k, v, lab, u, w) => `<span class="mil-inp" style="${w ? 'max-width:' + w + 'px' : ''}"><input ${typeof v === 'number' || v === '' || v == null ? 'type="number" min="0"' : ''} value="${esc(v == null ? '' : v)}" data-chg="mil-s" data-k="${k}" aria-label="${esc(lab)}" ${ro ? 'disabled' : ''}>${u ? `<em>${esc(u)}</em>` : ''}</span>`;
    const e = p.expiry || {}; const nt = p.notice || {}; const RW = rewards();
    const cls = (S.classes || []).map(c => { const f = fundedOf(c); return [`<b>${esc(c.name)}</b>`, f.auto ? `${f.source === 'moel' ? '사업주훈련 지원금' : '내일배움카드'}` : '기관 결제 · 자체', f.auto ? `<span class="mil-row">${sw(true, 'mil-noop', '', c.name + ' 국비 지원 과정 · 잠김', true)}${locktag('국비 지원 과정 · 자동')}</span>` : `<span class="mil-row">${sw(f.funded, 'mil-fund', c.id, c.name + ' 국비 지원 과정 표시', ro)}<span class="mut sm">${f.funded ? (f.dflt ? '켬 · 직업훈련 기본' : '켬 · 수동') : '끔 · 수동으로 켤 수 있음'}</span></span>`, f.funded ? `<span class="pill p-lock">${ic('lock', 14)}금전성 보상 쓸 수 없음</span>` : `<span class="pill p-ok">${ic('check', 14)}기관 정책</span>`]; });
    const rk = p0.rank || {}, pn = p0.penalty || {}, lg = p0.league || {};
    const hist = logRows().slice(0, 1)[0];
    return `<div class="mil-row wrap ar"><button class="btn" data-act="mil-go" data-v="log">${ic('history', 18)}변경 이력</button><button class="btn" data-act="mil-preview">${ic('eye', 18)}학습자 안내문 미리보기</button>${ro ? '' : `<button class="btn" data-act="mil-s-undo" ${changed ? '' : 'disabled'}>되돌리기</button><button class="btn pri" data-act="mil-s-save" ${changed ? '' : 'disabled'}>${ic('check', 18)}변경 내용 확인하고 저장</button>`}</div>
      ${ro ? note('info', '정운영자만 바꿀 수 있습니다', '부운영자는 설정을 볼 수 있습니다.') : ''}
      <div class="mil-g21"><div class="mil-col">
      ${sec('mile', '단위 · 표기', row('단위 이름', '학습자 화면에 보이는 이름', inp('unitName', p.unitName, '단위 이름', '', 220)) + row('기호', '숫자 뒤에 붙는 글자', inp('ab', p.ab, '기호', '', 120)) + row('교환 가치', '원 환산 표시', p.won ? `<b>1${esc(p.ab)} = 1원</b><span class="mut">원 환산은 학원비 차감 화면에만 보입니다</span>` : '<span class="mut">점수형 표기 · 원 환산을 보이지 않습니다</span>'))}
      ${sec('clock', '소멸', row('방식', '', `<select data-chg="mil-s" data-k="expiry.mode" aria-label="소멸 방식" ${ro ? 'disabled' : ''}>${[['months', '적립 건별(적립일 + n개월)'], ['term_end', '학기 · 학년 말'], ['year', '연 단위'], ['none', '소멸 없음']].map(([a, b]) => `<option value="${a}" ${e.mode === a ? 'selected' : ''}>${b}</option>`).join('')}</select>`)
        + (e.mode === 'months' ? row('유효기간', '적립일부터', inp('expiry.months', +e.months || 12, '유효기간', '개월', 160) + rec((rc.expiry || {}).months ? rc.expiry.months + '개월' : '12개월', (+e.months || 12) + '개월', +e.months < 12 ? '유효기간이 짧으면 소멸 분쟁이 늘 수 있습니다.' : '유효기간이 길면 미사용 잔액 추정액이 커집니다.')) : '')
        + row('퇴원 · 수료 후', '', `<select data-chg="mil-s" data-k="afterLeave" aria-label="퇴원 후 처리" ${ro ? 'disabled' : ''}><option value="keep" ${p.afterLeave !== 'settle' ? 'selected' : ''}>만료일까지 그대로 유효</option><option value="settle" ${p.afterLeave === 'settle' ? 'selected' : ''}>정해진 날 정리(예고 고지 후)</option></select>`)
        + '<p class="mut sm">유효기간을 바꿔도 이미 쌓인 적립의 만료일은 바뀌지 않습니다.</p>')}
      ${sec('flag', '등급 4단계', `<div class="mil-lv">${(p.tiers || []).map((t, i) => `<div><input value="${esc(t.name)}" maxlength="8" data-chg="mil-s" data-k="tiers.${i}.name" aria-label="${i + 1}단계 이름" ${ro ? 'disabled' : ''}>${i ? `<span class="mil-inp"><input type="number" min="0" value="${+t.min}" data-chg="mil-s" data-k="tiers.${i}.min" aria-label="${i + 1}단계 기준" ${ro ? 'disabled' : ''}><em>${esc(p.ab)} 이상</em></span>` : '<span class="mut">시작</span>'}</div>`).join('')}</div>
        <p class="mut sm">기준 기간 ${p.tierWindow === 'term' ? '이번 학기' : p.tierWindow === 'year' ? '올해' : '최근 12개월'} 적립 합계(사용 · 소멸과 무관). 올라가는 것은 즉시, 내려가는 것은 기간 경계에 한 단계씩입니다. 다른 학습자의 등급은 보이지 않습니다.</p>`)}
      ${sec('bell', '알림', row('소멸 예정', '학습자 알림함', `<span class="mil-row">${inp('notice.monthsBefore', +nt.monthsBefore, '몇 개월 전부터', '개월 전부터 매월', 230)}${inp('notice.daysBefore', (nt.daysBefore || []).join(','), '며칠 전', '일 전', 160)}</span>${rec('6개월 전부터 매월 + 30 · 3일 전', `${n(nt.monthsBefore)}개월 전부터 매월${(nt.daysBefore || []).length ? ' + ' + nt.daysBefore.join(' · ') + '일 전' : ''}`, '고지가 줄면 분쟁 위험이 커집니다(소비자원 권고).')}`)
        + row('보호자에게도', '미성년 학습자', `<span class="mil-row">${sw(p.guardian, 'mil-sb', 'guardian', '보호자 알림', ro)}<span>적립 · 소멸 · 보상 신청 알림을 보호자에게도 보냅니다</span></span>`)
        + row('야간 발송', '21시~08시', `<span class="mil-row">${sw(true, 'mil-noop', '', '야간 묶음', true)}<span>묶어서 다음 날 08시에 보냅니다</span></span>`) + row('연속 학습 끊김 알림', '', `<span class="mil-row">${sw(false, 'mil-noop', '', '끊김 알림', true)}<span class="mut">보내지 않습니다. 다음 접속 때 「다시 시작해요」 안내만 보입니다</span></span>`) + row('운영자 알림', '', '<span>승인 대기 · 부정 의심 · 예산 80% 도달</span>'))}
      ${sec('wallet', '예산 · 상한', row('월 예산', '금전성 적립 기준', `${inp('budget.monthP', +(p.budget || {}).monthP || 0, '월 예산', p.won ? '원(=' + p.ab + ') / 월' : p.ab + ' / 월', 220)}${!+(p.budget || {}).monthP && RW.some(x => x.active && x.cash) ? '<span class="mil-why">' + ic('info', 14) + '현금성 보상에 예산이 없습니다. 넣지 않아도 저장은 됩니다.</span>' : ''}`)
        + row('1인 하루 총 상한', '', inp('dailyCapTotal', +p.dailyCapTotal || 0, '1인 하루 총 상한', p.ab, 180) + rec(fmtP(rc.dailyCapTotal), fmtP(p.dailyCapTotal), '하루 상한이 높으면 몰아 쌓기 위험이 커집니다.'))
        + row('강사별 월 지급 한도', '0 = 강사 지급 없음', inp('teacherCap', +p.teacherCap || 0, '강사별 월 지급 한도', p.ab, 180) + (rc.teacherCap ? rec(fmtP(rc.teacherCap), fmtP(p.teacherCap), '강사 지급이 많아지면 예산 소진이 빨라집니다.') : ''))
        + row('정운영자 승인 기준', '수동 지급 1회', inp('manualOver', +p.manualOver || 1000, '정운영자 승인 기준', p.ab, 180) + rec(fmtP(rc.manualOver || 1000), fmtP(p.manualOver)))
        + row('현금성 전환 잠금', '권장 잠금', `<span class="mil-col"><label class="mil-ck"><input type="checkbox" data-chg="mil-sb" data-v="cashLock.achievementOnly" ${(p.cashLock || {}).achievementOnly ? 'checked' : ''} ${ro ? 'disabled' : ''}> 참여형 적립(가입 · 출석 · 오늘 목표)은 금전성 보상에 쓰지 않음</label><label class="mil-ck"><input type="checkbox" data-chg="mil-sb" data-v="cashLock.needB" ${(p.cashLock || {}).needTrust !== 'C' ? 'checked' : ''} ${ro ? 'disabled' : ''}> 기기 보고(C) 적립은 금전성 보상에 쓰지 않음</label></span>`))}
      </div><div class="mil-col">
      ${sec('league', '순위 · 감점', row('공개 순위', rk.on ? `${rk.scope === 'all' ? '기관 전체' : rk.scope === 'group' ? '반 · 기수' : '근접 10명'} · ${rk.name === 'real' ? '실명' : rk.name === 'initial' ? '이니셜' : '별명'}` : '', `<span class="mil-row">${sw(!!rk.on, 'mil-rank', 'rank', '공개 순위', ro)}<span class="pill ${rk.on ? 'p-wait' : 'p-off'}">${rk.on ? '켬 · 기관 책임' : minor() ? '끔 · 미성년 기관 기본' : '끔 · 권장'}</span></span>`)
        + row('주간 근접 리그', '내 앞뒤 10명 · 월요일 리셋', `<span class="mil-row">${sw(!!lg.on, 'mil-rank', 'league', '주간 근접 리그', ro)}<span class="pill ${lg.on ? 'p-ok' : 'p-off'}">${lg.on ? '켬' : '끔'}</span></span>`)
        + row('감점', pn.on ? `1회 최대 ${fmtP(pn.maxOnce)} · 하루 ${fmtP(pn.dayCap)}` : '', `<span class="mil-row">${sw(!!pn.on, 'mil-rank', 'penalty', '감점', ro)}<span class="pill ${pn.on ? 'p-wait' : 'p-off'}">${pn.on ? '켬 · 기관 책임' : '끔 · 「적립 없음」으로 처리'}</span></span>`)
        + `<p class="sm">스위치를 켜면 바로 적용되지 않고 영향 안내를 먼저 보여 드립니다. 확인 · 사유 입력 후 변경 이력에 남습니다.</p>${(rk.checks || []).length ? `<p class="mut sm">사후 점검 예약: ${rk.checks.map(c => `${esc(c[0])} ${esc(c[1])}`).join(' · ')}</p>` : ''}`)}
      ${sec('store', '사용 범위', lock('본사 통합 마일리지', `다른 가맹점(별개 사업자)과 함께 쓰는 통합 지갑은 켤 수 없습니다. ${p0.unitName}는 이 기관(단위) 안에서만 쌓이고 쓰입니다.`) + '<p class="mut sm">학습자가 다른 가맹점도 다니면 지갑이 단위별로 따로 보입니다. 같은 사업자의 직영 지점은 통합 지갑을 쓸 수 있습니다.</p>')}
      ${sec('lock', '디디쌤이 고정한 것', `<ul class="mil-x"><li>${ic('lock', 16)}국비 지원 과정 적립분의 금전성 보상</li><li>${ic('lock', 16)}유상 충전 · 현금 환급 · 학습자 간 양도 · 기관 밖 사용</li><li>${ic('lock', 16)}운영자 본인 · 가족 계정 지급</li><li>${ic('lock', 16)}원장 줄 삭제(정정은 반대 줄)</li><li>${ic('lock', 16)}등록 교습비를 넘는 정가 줄</li></ul>`)}
      ${hist ? sec('history', '최근 변경', `<p><b>${esc(hist.what)}</b> ${esc(String(hist.before || ''))}${hist.before !== '' && hist.after !== '' ? ' → ' : ''}${esc(String(hist.after || ''))}</p><p class="mut sm">${esc(hist.at)} · ${esc(hist.by)}</p><button class="btn sm" data-act="mil-go" data-v="log">전체 이력 보기${ic('chev', 16)}</button>`) : ''}
      ${sec('stop', '제도 종료 · 변경', p0.sunset ? `${note('warn', '제도 종료가 예약되어 있습니다', `예고 ${esc(p0.sunset.noticeAt)} · 신규 적립 중단 ${esc(p0.sunset.stopEarnAt)} · 종료 ${esc(p0.sunset.endAt)} · 잔액 정리 ${p0.sunset.mode === 'convert' ? '교환 기간 후 기록 보존' : '종료일에 소멸'}. 종료일까지 매월 학습자에게 고지합니다.`)}` : `<p class="sm">제도를 끝내거나 보상을 줄일 때 쓰는 절차입니다.${entries().length ? ` 이미 쌓인 ${esc(p0.unitName)}가 있으므로 바로 꺼지지 않습니다.` : ' 아직 적립이 없으면 바로 끌 수 있습니다.'}</p><ol class="mil-ol">${['종료 예고(6개월 이상 권장)', '신규 적립 중단', '교환 기간', '잔액 정리', '기록 보존'].map(t => `<li>${t}</li>`).join('')}</ol>${ro ? '' : `<button class="btn wide" data-act="mil-off">${ic('stop', 18)}제도 종료 · 끄기 시작</button>`}`)}
      </div></div>
      ${sec('lock', '국비 지원 과정', `<p class="sm">결제 원천이 내일배움카드 · 사업주훈련 지원금인 과정은 자동으로 표시되고 끌 수 없습니다. 그 밖의 과정은 정운영자가 표시를 켜고 끌 수 있으며 변경 이력에 남습니다.</p>${table(['과정', '결제 원천', '국비 지원 과정 표시', '금전성 보상'], cls, '과정이 없습니다.')}<p class="mut sm">배지 · 인증서는 국비 지원 과정에도 그대로 쓸 수 있습니다. 화면 설정 · AI 초안 · 수동 지급 모두 서버가 같은 검사를 다시 합니다.</p>`)}`; }
  const setPath = (o, k, v) => { const ks = k.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) { if (x[ks[i]] == null || typeof x[ks[i]] !== 'object') x[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; x = x[ks[i]]; } x[ks[ks.length - 1]] = v; };
  ACT['mil-s'] = el => { const p = SETK(); const k = el.dataset.k; let v = el.value; if (k === 'notice.daysBefore') v = v.split(/[,\s]+/).map(x => Math.round(+x)).filter(x => x > 0).slice(0, 4); else if (el.type === 'number') v = Math.max(0, Math.round(+el.value || 0)); else v = String(v).slice(0, 30);
    if (k === 'ab' && !v) v = 'P'; if (k === 'expiry.mode' && v === 'months' && !(p.expiry || {}).months) p.expiry = { mode: 'months', months: 12 }; setPath(p, k, v); if (k === 'budget.monthP') p.budget.monthWon = v; render(); };
  ACT['mil-sb'] = el => { const p = SETK(); const k = el.dataset.v; if (k === 'cashLock.needB') p.cashLock = Object.assign({}, p.cashLock, { needTrust: el.checked ? 'B' : 'C' }); else setPath(p, k, el.checked); render(); };
  ACT['mil-s-undo'] = () => { UI.milSD = null; render(); };
  const DIFFK = [['unitName', '단위 이름'], ['ab', '기호'], ['expiry', '소멸'], ['afterLeave', '퇴원 후'], ['tiers', '등급'], ['notice', '소멸 고지'], ['guardian', '보호자 알림'], ['budget', '월 예산'], ['dailyCapTotal', '1인 하루 총 상한'], ['teacherCap', '강사별 월 지급 한도'], ['manualOver', '정운영자 승인 기준'], ['cashLock', '현금성 전환 잠금']];
  const valTxt = (k, v) => k === 'expiry' ? expTxt(null, { expiry: v }) : k === 'notice' ? `${v.monthsBefore}개월 전부터 매월${(v.daysBefore || []).length ? ' + ' + v.daysBefore.join(' · ') + '일 전' : ''}` : k === 'tiers' ? (v || []).map(t => `${t.name} ${n(t.min)}`).join(' · ') : k === 'budget' ? n((v || {}).monthP) : k === 'cashLock' ? `${v.achievementOnly ? '참여형 제외' : '참여형 포함'} · 신뢰 ${v.needTrust} 이상` : typeof v === 'boolean' ? (v ? '켬' : '끔') : String(v);
  ACT['mil-s-save'] = () => { if (!owner()) return; const p0 = P(); const p = SETK(); const ch2 = DIFFK.filter(([k]) => JSON.stringify(p[k]) !== JSON.stringify(p0[k])); if (!ch2.length) return; const warn = MC('warnings')(p, rules(), rewards());
    const shorter = p.expiry && p0.expiry && p.expiry.mode === 'months' && p0.expiry.mode === 'months' && +p.expiry.months < +p0.expiry.months;
    confirmCard('설정 저장', `${table(['항목', '전', '후'], ch2.map(([k, l]) => [esc(l), `<span class="mut">${esc(valTxt(k, p0[k]))}</span>`, `<b>${esc(valTxt(k, p[k]))}</b>`]))}${warn.map(x => note('warn', x.title, esc(x.text))).join('')}
      ${shorter ? note('warn', '유효기간을 줄입니다', '이미 쌓인 적립의 만료일은 바뀌지 않고, 저장 이후 적립부터 새 유효기간이 적용됩니다.') : ''}<p class="mut">변경은 정책 버전 ${n((p0.ver || 1) + 1)}로 저장되고 변경 이력에 남습니다. 학습자 안내문이 자동으로 바뀝니다.</p>`, '확인하고 저장', () => {
      const np = Object.assign(clone(p), { ver: (+p0.ver || 1) + 1 });
      if (LIVEON()) { liveDo('POST', '/api/mileage/config', { policy: polBody(np) }, () => { UI.milSD = null; toast('설정을 저장했습니다.', 'ok'); }).catch(() => {}); return; }
      ch2.forEach(([k, l]) => log('policy', l, valTxt(k, p0[k]), valTxt(k, np[k]), '', warn.some(x => (x.k === 'expiry' && k === 'expiry') || (x.k === 'notice' && k === 'notice') || (x.k === 'dayCap' && k === 'dailyCapTotal') || (x.k === 'tCap' && k === 'teacherCap') || (x.k === 'cashLock' && k === 'cashLock') || (x.k === 'budget' && k === 'budget')) ? '권장값 벗어남 · 확인함' : ''));
      D().policy = np; UI.milSD = null; save(); toast('설정을 저장했습니다.', 'ok'); render(); }, true); };

  /* 국비 지원 과정 표시(수동): 정운영자만, 사유 · 이력 */
  ACT['mil-fund'] = el => { const c = (S.classes || []).find(x => x.id === el.dataset.v); const on = el.checked; el.checked = !on; if (!c || !owner()) return toast('정운영자만 바꿀 수 있습니다.', 'warn');
    modal(on ? '국비 지원 과정으로 표시' : '국비 지원 과정 표시 끄기', `<div class="mil mil-m"><p>「${esc(c.name)}」을 ${on ? '국비 지원 과정으로 표시합니다. 이후 이 과정의 적립은 배지 · 학습 기록에만 쓰이고 금전성 보상에서 빠집니다.' : '국비 지원 과정에서 뺍니다(오표시 정정). 이미 생긴 국비 과정 적립 줄은 그대로 금전성 보상에 쓸 수 없습니다.'}</p><label class="mil-fld"><span>사유(필수)</span><input name="r" maxlength="80"></label></div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '확인하고 기록', kind: 'pri', run: w => { const why = fv(w, 'r'); if (!why) { toast('사유를 적어 주십시오.', 'warn'); return false; }
        if (LIVEON()) { liveDo('POST', '/api/mileage/funded', { clsId: c.id, funded: on, source: 'etc', reason: why }, () => { c.funded = on; save(); toast('국비 지원 과정 표시를 바꿨습니다.', 'ok'); }).catch(() => {}); return; }
        D().funded[c.id] = { funded: on, source: 'etc', by: S.me.name, at: nowStr() }; c.funded = on; log('funded', `국비 지원 과정 표시 — ${c.name}`, on ? '끔' : '켬', on ? '켬' : '끔', why); save(); toast('국비 지원 과정 표시를 바꿨습니다.', 'ok'); render(); } }]); };

  /* 학습자 안내문 미리보기 */
  ACT['mil-preview'] = () => { const p = P(); const RW = rewards().filter(x => x.active); modal('학습자 안내문 미리보기', `<div class="mil mil-m"><div class="mil-phone"><div class="ph-top"><b>${esc(p.unitName)} 안내</b></div><div class="ph-b"><div class="ph-c"><b>이렇게 모을 수 있어요</b><ul>${rules().filter(r => r.active).map(r => `<li>${ic('plus', 16)}${esc(sayTxt(r))}</li>`).join('') || '<li>켜진 규칙이 없어요.</li>'}</ul></div>${RW.length ? `<div class="ph-c"><b>이렇게 쓸 수 있어요</b><ul>${RW.map(x => `<li>${ic('gift', 16)}${esc(x.title)}</li>`).join('')}</ul></div>` : ''}<div class="ph-c"><ul><li>${ic('clock', 16)}${p.expiry.mode === 'none' ? '쌓인 마일리지는 소멸되지 않아요.' : `쌓인 날부터 ${esc(expTxt(null, p))} 뒤에 소멸돼요. ${n(p.notice.monthsBefore)}개월 전부터 미리 알려 드려요.`}</li>${fundedIds().length ? `<li>${ic('lock', 16)}국비 지원 과정에서 쌓은 마일리지는 배지와 학습 기록으로 남아요. 할인 · 장학에는 쓸 수 없어요.</li>` : ''}</ul></div></div></div></div>`, [{ id: 'c', label: '닫기' }]); };

  /* 제도 끄기 · 종료(03 §3.6, 04 onoff · sunset): 적립이 없으면 바로 끔, 있으면 종료 절차 */
  ACT['mil-off'] = () => { if (!owner()) return; const has = entries().some(e => e.kind === 'earn');
    if (!has) return modal('마일리지 제도 끄기', `<div class="mil mil-m"><p>아직 적립이 없으므로 바로 끕니다. 학습자 화면에서 마일리지가 사라지고, 규칙 · 보상 설정은 남아 다시 켤 때 쓸 수 있습니다.</p><label class="mil-fld"><span>사유(필수)</span><input name="r" maxlength="80"></label></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '확인하고 끄기', kind: 'pri', run: w => { const why = fv(w, 'r'); if (!why) { toast('사유를 적어 주십시오.', 'warn'); return false; }
      if (LIVEON()) { api('POST', '/api/mileage/onoff', { on: false, reason: why }).then(() => { invalidate(); UI.milW = null; toast('마일리지 제도를 껐습니다.', 'ok'); render(); }).catch(e => { if (ecode(e) === 'need_sunset') { toast(ERRN.need_sunset, 'warn'); sunsetModal(); } else toast(ERRN[ecode(e)] || liveErr(e), 'warn'); }); return; }
      D().policy.on = false; UI.milW = null; log('onoff', '마일리지 제도 끄기', '켬', '끔', why); save(); toast('마일리지 제도를 껐습니다.', 'ok'); render(); } }]);
    sunsetModal(); };
  function sunsetModal() { const td = today(); modal('제도 종료 절차', `<div class="mil mil-m"><p>이미 쌓인 마일리지가 있어 바로 끄지 않고 아래 순서로 진행합니다. 종료일까지 매월 학습자에게 고지합니다.</p>
    <div class="mil-g3"><label class="mil-fld"><span>종료 예고일</span><input type="date" name="na" value="${td}"></label><label class="mil-fld"><span>신규 적립 중단일</span><input type="date" name="se" value="${addM(td, 1)}"></label><label class="mil-fld"><span>종료일(예고 6개월 이상 권장)</span><input type="date" name="ea" value="${addM(td, 6)}"></label></div>
    <label class="mil-fld"><span>종료일의 잔액 처리</span><select name="md"><option value="convert">교환 기간 동안 보상으로 바꾸고, 남은 잔액은 기록으로 보존</option><option value="expire">종료일에 남은 잔액 소멸(고지 후)</option></select></label>
    <label class="mil-fld"><span>사유(필수, 학습자 고지에 함께 표시)</span><input name="r" maxlength="80"></label>${note('warn', '고지 없는 소멸 · 종료는 하지 않습니다', '이미 쌓인 적립의 가치를 줄이는 변경은 학습자 분쟁이 될 수 있습니다. 예고 기간을 충분히 두십시오.')}</div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '확인하고 종료 예약', kind: 'pri', run: w => { const s = { noticeAt: fv(w, 'na'), stopEarnAt: fv(w, 'se'), endAt: fv(w, 'ea'), mode: fv(w, 'md') }; const why = fv(w, 'r'); if (!why) { toast('사유를 적어 주십시오.', 'warn'); return false; }
      if (!(s.noticeAt <= s.stopEarnAt && s.stopEarnAt <= s.endAt)) { toast('예고일 ≤ 적립 중단일 ≤ 종료일 순서로 넣어 주십시오.', 'warn'); return false; } const short = addM(s.noticeAt, 6) > s.endAt;
      if (LIVEON()) { liveDo('POST', '/api/mileage/sunset', Object.assign({ reason: why }, s), () => toast('제도 종료를 예약했습니다.', 'ok')).catch(() => {}); return; }
      D().policy.sunset = s; log('onoff', '제도 종료 예약', '켬', `종료 ${s.endAt} · ${s.mode === 'convert' ? '교환 후 보존' : '종료일 소멸'}`, why, short ? '권장값 벗어남 · 예고 6개월 미만 · 확인함' : ''); save(); toast('제도 종료를 예약했습니다. 학습자에게 매월 고지합니다.', 'ok'); render(); } }], true); }

  /* ── 공개 순위 · 감점 · 리그 켜기(D3, 03 §7.3): ① 켜기 시도 → ② 영향 안내 → ③ 범위 → ④ 운영자 확인(사유 필수 · k12 학부모 공지 초안) → ⑤ 변경 이력 → ⑥ 30 · 90일 사후 점검 ── */
  const RSTEPS = ['켜기 시도', '영향 안내', '범위 고르기', '운영자 확인', '변경 이력 기록'];
  const REFS = [['미성년 공개 점수 · 감점 노출', '학급 전체에 점수와 감점을 공개하는 방식은 수치심과 순응 중심 행동, 하위권 고착 우려가 지적되었습니다.', 'ClassDojo 공개 점수판 비판 사례(01-benchmark §11-2)'],
    ['예상된 보상과 내재 동기', '미리 약속된 물질 보상은 스스로 하려는 동기를 낮출 수 있습니다(효과 크기 d = −0.40).', 'Deci · Koestner · Ryan 1999 메타분석'],
    ['전체 상위 리더보드', '상위 10명만 보이는 전사 순위는 중하위권의 참여를 떨어뜨려, 본인 앞뒤 10명만 보이는 근접 순위로 바꾼 사례가 있습니다.', 'Deloitte 리더십 아카데미 사례(01-benchmark §5)']];
  const ALT = [['league', '근접 10명만', '전체 순위 대신 내 앞뒤 10명'], ['refresh', '주간 리셋', '매주 월요일 0시에 새로 시작'], ['user', '별명 표시', '실명 · 학년 대신 별명'], ['minus', '감점 대신 적립 없음', '결석 · 지각은 그날 적립만 없음']];
  const rStepBar = cur => `<ol class="mil-steps sm">${RSTEPS.map((s, i) => `<li class="${i < cur ? 'done' : i === cur ? 'on' : 'todo'}"><span class="n">${i < cur ? ic('check', 14) : i + 1}</span><div>${esc(s)}</div></li>`).join('')}</ol>`;
  ACT['mil-rank'] = el => { const what = el.dataset.v; const on = el.checked; el.checked = !on; if (!owner()) return toast('정운영자만 바꿀 수 있습니다.', 'warn'); const p = P();
    const label = { rank: '공개 순위', league: '주간 근접 리그', penalty: '감점' }[what];
    if (!on) return modal(`${label} 끄기`, `<div class="mil mil-m"><p>${esc(label)}를 끕니다. 학습자 화면에서 바로 사라지고 변경 이력에 남습니다.</p><label class="mil-fld"><span>사유(필수)</span><input name="r" maxlength="80"></label></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '확인하고 끄기', kind: 'pri', run: w => { const why = fv(w, 'r'); if (!why) { toast('사유를 적어 주십시오.', 'warn'); return false; } applyRank(what, false, null, why); } }]);
    if (what === 'league' && !minor()) { return confirmCard('주간 근접 리그 켜기', `<p>매주 월요일에 새로 시작하고, 학습자에게는 본인 앞뒤 10명만 별명으로 보입니다. 수동 지급 · 증빙 점수는 집계에서 빠집니다.</p>${note('info', '권장', '전체 공개 순위 대신 근접 10명 · 주간 리셋 방식을 권장합니다(Deloitte 사례).')}`, '확인하고 켜기', () => applyRank('league', true, { scope: 'near10', name: 'nick' }, '주간 근접 리그 켜기')); }
    UI.milRK = { what, step: 1, scope: 'near10', name: 'nick', reasons: '결석, 지각', maxOnce: 50, dayCap: 100, ack: false, reason: '', notice: '' }; rankSheet(); };
  function rankSheet() { const k = UI.milRK; if (!k) return; const p = P(); const label = { rank: '공개 순위', league: '주간 근접 리그', penalty: '감점' }[k.what];
    if (k.step === 1) return modal(`${label}를 켜기 전에 영향을 확인해 주십시오`, `<div class="mil mil-m mil-sheet">${rStepBar(1)}<p class="mut">${minor() ? `${esc(S.org.name)}은 미성년 학습자 기관입니다. ` : ''}켜기 전에 아래 연구 요약과 대안을 읽어 주십시오. 다음 단계에서 범위를 고르고, 확인한 뒤에만 적용됩니다.</p>
      <div><b>연구 요약</b>${REFS.map((r, i) => `<div class="mil-ref"><span class="no">${i + 1}</span><div><b>${esc(r[0])}</b> — ${esc(r[1])}<span class="s">출처: ${esc(r[2])}</span></div></div>`).join('')}</div>
      ${note('info', '안내 H · 미성년 학습자 공개 범위', '미성년 학습자에게는 공개 경쟁과 감점이 동기를 낮출 수 있다는 연구가 있습니다. 순위는 이름 대신 별칭으로 보이고, 만 14세 미만의 정보 공개는 보호자 동의 범위 안에서만 해 주세요.')}
      <div><b>${k.what === 'penalty' ? '감점' : '순위'} 대신 이렇게 해 볼 수 있습니다(권장)</b><div class="mil-g4 mt">${ALT.map(a => `<div class="mil-alt">${ic(a[0], 20)}<b>${esc(a[1])}</b><span>${esc(a[2])}</span></div>`).join('')}</div></div></div>`,
      [{ id: 'c', label: '켜지 않고 닫기', run: () => { UI.milRK = null; } }, { id: 'ok', label: '다음 · 범위 고르기', kind: 'pri', run: () => { k.step = 2; setTimeout(rankSheet, 0); } }], true);
    const opt = (v, t, d) => `<label class="mil-opt ${k.scope === v ? 'on' : ''}"><input type="radio" name="sc" value="${v}" ${k.scope === v ? 'checked' : ''}><span class="f1"><span class="t">${esc(t)}</span><span class="d">${esc(d)}</span></span></label>`;
    if (k.step === 2) return modal(`${label} · 범위 고르기`, `<div class="mil mil-m mil-sheet">${rStepBar(2)}${k.what === 'penalty' ? `<label class="mil-fld"><span>감점 사유 목록(쉼표로 구분)</span><input name="rs" value="${esc(k.reasons)}" maxlength="80"></label><div class="mil-g2"><label class="mil-fld"><span>1회 최대 감점(${esc(p.ab)})</span><input type="number" min="1" name="mo" value="${k.maxOnce}"></label><label class="mil-fld"><span>하루 상한(${esc(p.ab)})</span><input type="number" min="1" name="dc" value="${k.dayCap}"></label></div>${note('info', '학습자에게 사유가 보입니다', '감점은 원장에 사유와 함께 음수 줄로 남고, 학습자는 요청함으로 이의를 신청할 수 있습니다.')}`
      : `<b>공개 범위</b><div class="mil-col">${opt('near10', '근접 10명 · 주간', '내 앞뒤 10명만, 매주 월요일 리셋(권장)')}${opt('group', '반 · 기수 전체', '같은 반 학습자 전체 순위')}${opt('all', '기관 전체', '권장하지 않습니다')}</div>
      <div class="mil-row sb"><b>표시 이름</b>${rec('별명')}</div><div class="mil-row">${[['nick', '별명'], ['initial', '이니셜'], ['real', '실명']].map(([v, t]) => `<label class="mil-chip ${k.name === v ? 'on' : ''}"><input type="radio" name="nm" value="${v}" ${k.name === v ? 'checked' : ''}> ${t}</label>`).join('')}</div>`}</div>`,
      [{ id: 'c', label: '켜지 않고 닫기', run: () => { UI.milRK = null; } }, { id: 'ok', label: '다음 · 운영자 확인', kind: 'pri', run: w => { if (k.what === 'penalty') { k.reasons = fv(w, 'rs'); k.maxOnce = Math.max(1, Math.round(+fv(w, 'mo') || 0)); k.dayCap = Math.max(k.maxOnce, Math.round(+fv(w, 'dc') || 0)); if (!k.reasons) { toast('감점 사유를 적어 주십시오.', 'warn'); return false; } }
        else { const sc = w.querySelector('[name=sc]:checked'), nm = w.querySelector('[name=nm]:checked'); k.scope = sc ? sc.value : 'near10'; k.name = nm ? nm.value : 'nick'; }
        k.notice = minor() ? `안녕하세요, ${S.org.name}입니다. ${addD(today(), 3).slice(5).replace('-', '월 ')}일부터 ${k.what === 'penalty' ? `감점(${k.reasons})을 시작합니다. 1회 최대 ${k.maxOnce}${p.ab}, 하루 ${k.dayCap}${p.ab}까지이며 자녀 화면에 사유가 함께 보입니다.` : `주간 학습 순위를 시작합니다. 순위는 ${k.name === 'nick' ? '별명으로만' : k.name === 'initial' ? '이니셜로' : '실명으로'}, ${k.scope === 'near10' ? '내 앞뒤 10명까지만' : k.scope === 'group' ? '같은 반 안에서' : '기관 전체에'} 보이며 매주 월요일에 새로 시작합니다.`} 원하지 않으시면 학원으로 알려 주세요.` : '';
        k.step = 3; setTimeout(rankSheet, 0); } }], true);
    return modal(`${label} · 운영자 확인`, `<div class="mil mil-m mil-sheet">${rStepBar(3)}<div class="mil-kv"><span class="k">켜는 것</span><b>${esc(label)}</b><span>${k.what === 'penalty' ? `사유 ${esc(k.reasons)} · 1회 최대 ${fmtP(k.maxOnce)} · 하루 ${fmtP(k.dayCap)}` : `${k.scope === 'near10' ? '근접 10명 · 주간' : k.scope === 'group' ? '반 · 기수 전체' : '기관 전체'} · ${k.name === 'nick' ? '별명' : k.name === 'initial' ? '이니셜' : '실명'}`}</span></div>
      ${k.scope === 'all' || k.name === 'real' ? note('warn', '권장값을 벗어난 범위입니다', '전체 공개 · 실명 표시는 중하위권 학습자의 이탈과 수치심 우려가 큽니다. 저장은 막지 않습니다.') : ''}
      <label class="mil-check"><input type="checkbox" name="ack"><span>위 안내를 읽었고 기관 책임으로 켭니다</span></label><label class="mil-fld"><span>사유(필수)</span><textarea name="r" rows="2" maxlength="200" placeholder="예: 중등부 주간 학습 습관 캠페인. 학부모 설명회에서 별명 · 근접 순위 방식에 동의받음."></textarea></label>
      ${k.notice ? `<label class="mil-fld"><span>학부모 공지 초안 <span class="mil-ai">${ic('ai', 14)}자동 초안</span></span><textarea name="nt" rows="4" maxlength="500">${esc(k.notice)}</textarea><small class="mut">공지는 자동으로 보내지 않습니다. 확인 후 공지 · 알림함에서 보내십시오.</small></label>` : ''}
      ${note('info', '사후 점검 예약', `켠 뒤 30일(${addD(today(), 30)}) · 90일(${addD(today(), 90)})에 AI 정책 점검이 하위 구간 학습자의 참여 변화를 집계로 보여 드리고 유지 · 끄기를 제안합니다(개인 단위 노출 없음).`)}</div>`,
      [{ id: 'c', label: '켜지 않고 닫기', run: () => { UI.milRK = null; } }, { id: 'ok', label: '켜고 변경 이력에 기록', kind: 'pri', run: w => { if (!fv(w, 'ack')) { toast('안내 확인에 체크해 주십시오.', 'warn'); return false; } const why = fv(w, 'r'); if (!why) { toast('사유를 적어 주십시오.', 'warn'); return false; }
        const nt = fv(w, 'nt'); const val = k.what === 'penalty' ? { reasons: k.reasons.split(/[,\s]+/).filter(Boolean), maxOnce: k.maxOnce, dayCap: k.dayCap } : { scope: k.scope, name: k.name }; UI.milRK = null; applyRank(k.what, true, val, why, nt); } }], true); }
  function applyRank(what, on, val, why, parentNotice) { const p = P(); const cur = what === 'rank' ? p.rank : what === 'penalty' ? p.penalty : p.league; const ack = on ? { by: S.me.name, at: nowStr(), reason: why, read: true, notice: 'H-2026-11' } : null;
    const nv = Object.assign({}, cur, val || {}, { on, ack }); if (on && what !== 'league') nv.checks = [['30일 점검', addD(today(), 30)], ['90일 점검', addD(today(), 90)]];
    const label = { rank: '공개 순위', league: '주간 근접 리그', penalty: '감점' }[what]; const desc = on ? (what === 'penalty' ? `켬 · 1회 ${fmtP(nv.maxOnce)} · 하루 ${fmtP(nv.dayCap)}` : `켬 · ${nv.scope === 'near10' ? '근접 10명' : nv.scope === 'group' ? '반 · 기수' : '전체'} · ${nv.name === 'nick' ? '별명' : nv.name === 'initial' ? '이니셜' : '실명'}`) : '끔';
    const offRec = on && (what !== 'league' || minor()) ? '권장값 벗어남 · 영향 안내 확인함' : '';
    if (LIVEON()) { const body = { ack: { read: true, reason: why } }; body[what === 'league' ? 'rank' : what] = what === 'league' ? Object.assign({}, p.rank, { league: nv }) : nv; if (what === 'league') { liveDo('POST', '/api/mileage/config', { policy: { league: { on: !!nv.on, size: nv.size || 10, reset: nv.reset || 'week' } }, reason: why }, () => toast(`${label}를 ${on ? '켰' : '껐'}습니다.`, 'ok')).catch(() => {}); return; }
      liveDo('POST', '/api/mileage/rank-penalty', body, () => toast(`${label}를 ${on ? '켰' : '껐'}습니다. 변경 이력에 기록했습니다.`, 'ok')).catch(() => {}); return; }
    const D0 = D(); D0.policy[what] = nv; D0.policy.ver = (+D0.policy.ver || 1) + 1; log(what === 'league' ? 'policy' : 'rank_penalty', label, cur && cur.on ? '켬' : '끔', desc, why, offRec);
    if (parentNotice) D0.parentNotice = { at: nowStr(), text: parentNotice, sent: false }; UI.milSD = null; save(); toast(`${label}를 ${on ? '켰' : '껐'}습니다. 변경 이력에 기록했습니다.`, 'ok'); render(); }

  /* ── 변경 이력 ── */
  function vLog() { const a = UI.milA || ''; const L = logRows().filter(h => !a || (a === 'warn' ? /벗어남/.test(h.note) : h.area === a)); const all = logRows(); const sel = UI.milH != null ? L[UI.milH] : null;
    const rows = L.map((h, i) => [`<span class="num nw">${esc(h.at)}</span>`, h.by ? esc(h.by) : `${ic('gear', 16)}시스템`, `<button class="mil-lnk" data-act="mil-h" data-v="${i}"><b>${esc(h.what)}</b></button><small>${esc(AREA[h.area] || h.area || '')}</small>`, `<span class="nw"><span class="mut">${esc(typeof h.before === 'object' ? JSON.stringify(h.before) : String(h.before == null ? '' : h.before))}</span>${h.before !== '' || h.after !== '' ? ` ${ic('chev', 14)} ` : ''}<b>${esc(typeof h.after === 'object' ? JSON.stringify(h.after) : String(h.after == null ? '' : h.after))}</b></span>`,
      `${/벗어남/.test(h.note) ? `<span class="pill p-wait">${ic('warn', 14)}${esc(h.note)}</span>` : h.note ? `<span class="pill p-info">${ic('info', 14)}${esc(h.note)}</span>` : ''}${h.reason ? `<small>사유 ${esc(h.reason)}</small>` : ''}`]);
    return `<div class="mil-row wrap">${[['', `전체 ${all.length}`], ['rule', '적립 규칙'], ['reward', '보상'], ['policy', '설정 · 예산'], ['onoff', '제도 켜고 끄기'], ['rank_penalty', '순위 · 감점'], ['funded', '국비 과정'], ['warn', `권장값 벗어남 ${all.filter(h => /벗어남/.test(h.note)).length}`]].map(([k, l]) => `<button class="mil-chip ${a === k ? 'on' : ''}" data-act="mil-a" data-v="${k}" aria-pressed="${a === k}">${k === 'warn' ? ic('warn', 14) : ''}${esc(l)}</button>`).join('')}<span class="f1"></span><button class="btn" data-act="mil-log-csv">${ic('download', 18)}이력 내려받기(CSV)</button></div>
      <div class="mil-tblw">${table(['시각', '변경자', '항목', '전 → 후', '비고'], rows, LIVEON() && !LV.d.log ? '운영 서버에서 변경 이력을 불러오지 못했습니다(GET /api/mileage/log).' : '아직 변경 이력이 없습니다.')}</div>
      ${sel ? `<div class="card mil-col">${ch(/벗어남/.test(sel.note) ? 'warn' : 'history', `${sel.at} · ${sel.what}`)}<div class="mil-kv"><span class="k">변경</span><span>${esc(String(sel.before || '—'))} → <b>${esc(String(sel.after || '—'))}</b></span></div><div class="mil-kv"><span class="k">변경자</span><span>${esc(sel.by || '시스템')}</span></div>${sel.reason ? `<div class="mil-kv"><span class="k">사유</span><span>${esc(sel.reason)}</span></div>` : ''}${sel.note ? `<div class="mil-kv"><span class="k">확인한 경고 · 안내</span><span>${esc(sel.note)}</span></div>` : ''}<div class="mil-kv"><span class="k">영향</span><span>저장 이후 사건부터 적용 · 이미 쌓인 적립은 그대로</span></div></div>` : ''}
      <div class="mil-g2">${note('info', '변경 이력은 지우거나 고칠 수 없습니다', '정책 변경 · 제도 켜고 끄기 · 순위 · 감점 변경은 모두 변경자 · 시각 · 전후 값으로 남습니다. 되돌리기도 새 줄로 기록됩니다.')}${note('warn', '권장값을 벗어난 변경은 황색으로 표시합니다', '저장은 막지 않았고, 운영자가 경고를 확인한 기록이 함께 남습니다.')}</div>`; }
  ACT['mil-a'] = el => { UI.milA = el.dataset.v; UI.milH = null; invalidate(); render(); };
  ACT['mil-h'] = el => { UI.milH = +el.dataset.v; render(); };
  ACT['mil-log-csv'] = () => downloadCSV(`마일리지_변경이력_${today()}.csv`, ['시각', '변경자', '구분', '항목', '전', '후', '사유', '비고'], logRows().map(h => [h.at, h.by, AREA[h.area] || h.area, h.what, typeof h.before === 'object' ? JSON.stringify(h.before) : h.before, typeof h.after === 'object' ? JSON.stringify(h.after) : h.after, h.reason, h.note]));

  /* ── 다른 화면 · 요원이 쓰는 공용 도구 ── */
  window.MIL = { ensure, data: D, live: LIVEON, policy: P, rules, rewards, entries, isOn, fmtP, sgn, who, funded: fundedOf, fundedIds, calc: MC, shim: SHIM, log, invalidate, liveDo, livePull, cache: LV,
    ui: { rec, note, lock, locktag, trTag, bar: barH, kpi: kp, head: ch, sw, confirm: confirmCard }, templates: TPL, tplKey, policyDefault, demoEvents, trigName: k => (TRIG[k] || [k])[0], minor };
  /* 탭 이동(보상 요원 milrw.js가 씀) */
  window.milGo = (id, k) => { UI.mil = id; if (k) UI.milK = k; invalidate(); if (CUR.tab !== 'mileage' && typeof go === 'function') go('mileage'); render(); };
  /* 시연판 원장 줄 추가(하나의 원장 S.mileage.entries). 멱등키 중복이면 기존 줄을 돌려준다. 삭제 · 수정 함수는 두지 않는다(반대 줄로 정정) */
  window.milLedgerAdd = entry => { if (LIVEON()) return null; const D0 = D(); const e = Object.assign({ id: 'me_' + idem(), scopeUnit: 'lu_root', status: 'posted', trust: 'B', convertible: false, funded: false, at: nowStr() }, entry); e.points = Math.round(+e.points || 0);
    if (!KIND[e.kind]) throw new Error('mil kind ' + e.kind); if (e.idemKey) { const old = D0.entries.find(x => x.idemKey === e.idemKey); if (old) return old; } D0.entries.push(e); return e; };
  window.milView = { vHome, vRules, vLedger, vSet, vLog, monthStats, makeDraft };
  /* 운영 모드: 스튜디오가 반영한 학습자 사건(시험 응시 a2-try · 수료증 자동 발급)을 운영자 확정 사건(신뢰 B)으로 서버에 보낸다(04 §3.1 ② POST /api/mileage/events).
     서버가 규칙 · 한도 · 국비 과정 · 멱등(mil_event 유일키)을 다시 확인하므로 여러 번 보내도 한 번만 적립된다. 제도가 꺼져 있거나 시연판이면 보내지 않는다. */
  const EVQ = []; let evT = 0;
  const evPush = ev => { if (!LIVEON() || !(LV.d.cfg ? isOn() : true) || !ev.sid) return; if (EVQ.length < 200) EVQ.push(ev); clearTimeout(evT); evT = setTimeout(evFlush, 400); };
  function evFlush() { if (!EVQ.length || typeof api !== 'function') return; const B = EVQ.splice(0, 200); api('POST', '/api/mileage/events', { events: B }).then(() => { LV.key = ''; }).catch(e => { if (e && (e.status >= 500 || !e.status)) EVQ.unshift(...B.slice(0, 200 - EVQ.length)); }); }
  const memSid = id => { try { const m = (S.members || []).find(x => x.id === id); return m && m.sid ? String(m.sid) : ''; } catch (e) { return ''; } };
  if (typeof a2AutoCert === 'function') { const base = a2AutoCert; a2AutoCert = (c, id, ...r) => { const ok = base(c, id, ...r); try { if (ok && c) evPush({ trigger: 'course_done', sid: memSid(id), srcType: 'cls', srcId: String(c.id), cls: String(c.id) }); } catch (e) { console.error('mileage ev', e); } return ok; }; } /* eslint-disable-line no-global-assign */
  if (typeof LPX !== 'undefined' && typeof LPX['a2-try'] === 'function') { const base = LPX['a2-try']; LPX['a2-try'] = x => { base(x); try { const d = x.data || {}; const c = (S.classes || []).find(k => k.id === d.cls); const L = c && c.tries && c.tries[d.item]; const t = L && L[L.length - 1];
      if (t && t.score != null) evPush({ trigger: 'exam_score', sid: memSid(t.who), srcType: 'exam', srcId: `${c.id}/${d.item}#${t.n || 1}`, value: +t.score, cls: String(c.id) }); } catch (e) { console.error('mileage ev', e); } }; }
  window.milEvents = { push: evPush, flush: evFlush, q: EVQ };
  /* 시연판: 학습자 앱 연속 학습 복구(lmil lpxPush 'mile-streak-repair' {days}) → 문서 S.mileage.repairs에 남긴다(학습자 앱이 같은 문서를 읽어 다른 기기에서도 이어짐).
     운영 모드는 서버 POST mile-streak-repair가 처리하므로 여기서는 받지 않는다. 한 달 perMonth번(기본 1) · 끊긴 날 최대 3일 · 마일리지는 주지 않음(연속 기록만) */
  if (typeof LPX !== 'undefined') LPX['mile-streak-repair'] = x => { if (LIVEON()) return; const D0 = D(); if (!D0) return; const sid = String((x.data || {}).sid || x.who || ''); if (!sid) return;
    const days = [...new Set(((x.data || {}).days || []).map(String).filter(d => /^\d{4}-\d\d-\d\d$/.test(d)))].sort().slice(-3); if (!days.length) return;
    const at = String(x.at || nowStr()); const ym0 = at.slice(0, 7); const per = +(((P().streak || {}).repair || {}).perMonth) || 1; D0.repairs = Array.isArray(D0.repairs) ? D0.repairs : [];
    if (D0.repairs.filter(r => r.sid === sid && r.ym === ym0).length >= per) return; if (D0.repairs.some(r => r.sid === sid && r.days.join() === days.join())) return;
    D0.repairs.push({ sid, days, ym: ym0, at }); D0.repairs = D0.repairs.slice(-500); if (typeof logAudit === 'function') logAudit(`마일리지 연속 학습 복구 — 학습자 ${sid} · ${days.join(', ')}`); };
})();
