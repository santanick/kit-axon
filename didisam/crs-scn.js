/* v35 과정 만들기 — 기관 유형별 시나리오(C2)
   CF.cfg[type]: 단계 구성 · 질문 · 용어 · 필수 항목 · 기본값 · 예시 · 템플릿 · 규정 검사 · 생성 후 반영(apply).
   근거: 규정 수치는 compliance.js(DEF · e-hours · 심사코드 20자리 · HRD ID 17자리 · itemMin 50 · rate 80 · pass 60 · dayChasi 8 · bank 3)와
   mods.js 평생교육(유료 30시간) · docs/compliance/README.md를 따른다. 학원법 교습비 게시 · 고등교육법 1학점 15시간 · 남녀고용평등법 연 1회는 안내만 한다.
   질문은 단계마다 최대 3개, 나머지는 '나중에 해도 돼요'(later). 로드 시 S는 null — S는 함수 안에서만 읽는다. */
(() => {
  const CF = window.CF = window.CF || {};
  CF.cfg = CF.cfg || {};
  const N = v => (v === '' || v == null || isNaN(+v)) ? 0 : +v;
  const td = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const plus = (d, n) => { try { if (typeof addDays === 'function') return addDays(d, n); } catch (e) { } const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const wn = n => (typeof won === 'function' ? won(n) : (+n || 0).toLocaleString('ko-KR') + '원');
  const hm = m => { m = Math.round(N(m)); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}시간${r ? ' ' + r + '분' : ''}` : `${r}분`; };
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const totalMin = d => N(d.sessions) * N(d.mins);
  const cplOn = () => { try { const P = window.cplPublic && cplPublic(); return P ? P : null; } catch (e) { return null; } };
  /* 공통 질문 조각 */
  const F = {
    name: (label, ex) => ({ k: 'name', label, kind: 'text', ex, max: 50 }),
    target: (label, ex, later) => ({ k: 'target', label, kind: 'text', ex, max: 60, later: !!later }),
    sessions: (label, ex, def, max) => ({ k: 'sessions', label, kind: 'num', ex, def, min: 1, max: max || 60, unit: '개' }),
    mins: (label, ex, def) => ({ k: 'mins', label, kind: 'choice', ex, def, opts: [[25, '25분'], [30, '30분'], [50, '50분'], [60, '1시간'], [90, '1시간 30분'], [120, '2시간'], [180, '3시간']] }),
    price: (label, ex, def, later) => ({ k: 'price', label, kind: 'num', ex, def, min: 0, max: 99999999, unit: '원', later: later !== false }),
    cap: (ex) => ({ k: 'cap', label: '정원', kind: 'num', ex, def: 0, min: 0, max: 9999, unit: '명', later: true, hint: '0이면 제한 없음' }),
    start: (label) => ({ k: 'start', label: label || '시작일', kind: 'date', ex: '예: 다음 달 1일', later: true })
  };
  /* 차시 수 · 길이로 총 시간 한 줄 */
  const hoursLine = (d, unit) => N(d.sessions) && N(d.mins) ? `${unit || '차시'} ${N(d.sessions)}개 × ${hm(d.mins)} = 총 ${hm(totalMin(d))}` : '';
  /* 공통 apply: 정원 · 모집 · 시간 */
  const baseApply = (c, d) => {
    if (N(d.cap) > 0) { c.recruit = c.recruit || { on: false, cap: 0, from: '', to: '', early: { on: false, until: '', rate: 0 } }; c.recruit.cap = N(d.cap); }
    if (N(d.sessions) && N(d.mins)) c.hours = Math.round(totalMin(d) / 60 * 10) / 10;
    if (d.target) c.sub = String(d.target).slice(0, 60);
    if (N(d.price) >= 0 && d.price !== '' && d.price != null) c.price = N(d.price);
    if (d.tpl) c.crsTpl = d.tpl;
    /* 차시 인정 시간: 영상 항목에 1차시 분량 기록(직업훈련 · 기업 환급의 '인정 학습시간' 기본값) */
    if (N(d.mins)) (c.curriculum || []).filter(i => i.type === 'video' && !(+i.cplMin > 0)).forEach(i => { i.cplMin = N(d.mins); });
    c.crsScn = CF.cfgKey ? CF.cfgKey() : '';
    return c;
  };
  const crit = (c, x) => { c.criteria = Object.assign({ video: 50, exam: 30, assign: 20, threshold: 70 }, c.criteria || {}, x); };

  /* ───────── 학원(초중고): 반 · 요일 · 시간 · 월 수강료 → 회차 자동 ───────── */
  CF.cfg.k12 = {
    label: '학원(초중고) 수업', unit: () => '회차',
    terms: { cls: '수업', unit: '회차', fee: '월 수강료', target: '학년' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepTitle: { basic: '어떤 수업인가요?', outline: '언제 수업하나요?', fill: '수업 자료 넣기', setup: '수강료 · 정원', open: '확인하고 열기' },
    ask: {
      basic: [F.name('수업 이름', '예: 중2 수학 내신반'), { k: 'grade', label: '학년', kind: 'choice', ex: '예: 중2', def: 'm2', opts: [['e1', '초등 1~3'], ['e4', '초등 4~6'], ['m1', '중1'], ['m2', '중2'], ['m3', '중3'], ['h1', '고1'], ['h2', '고2'], ['h3', '고3']] }, { k: 'subject', label: '과목', kind: 'choice', ex: '예: 수학', def: '수학', opts: [['국어', '국어'], ['영어', '영어'], ['수학', '수학'], ['과학', '과학'], ['사회', '사회'], ['기타', '기타']] }],
      outline: [{ k: 'wdays', label: '수업 요일', kind: 'days', ex: '예: 월 · 수 · 금', def: [1, 3, 5] }, { k: 'from', label: '수업 시간', kind: 'time', ex: '예: 오후 4시 ~ 5시 30분', def: '16:00', to: 'to', toDef: '17:30' }, { k: 'months', label: '기간', kind: 'choice', ex: '예: 3개월(한 학기 내신 대비)', def: 3, opts: [[1, '1개월'], [2, '2개월'], [3, '3개월'], [6, '6개월'], [12, '1년']] }],
      setup: [F.price('월 수강료', '예: 280,000원(학원에 게시한 교습비와 같게)', 0, true), F.cap('예: 8명(한 반)')]
    },
    defaults: { grade: 'm2', subject: '수학', wdays: [1, 3, 5], from: '16:00', to: '17:30', months: 3, price: 0, cap: 0, mins: 90 },
    required: ['name', 'wdays'],
    examples: { name: '예: 중2 수학 내신반', wdays: '예: 월 · 수 · 금', price: '예: 월 280,000원' },
    templates: [
      { id: 'k12-math-mid', name: '수학 내신반', icon: 'calc', desc: '중2 · 월수금 · 3개월', prefill: { name: '중2 수학 내신반', grade: 'm2', subject: '수학', wwdays: [1, 3, 5], from: '16:00', to: '17:30', months: 3, cap: 8 } },
      { id: 'k12-eng-read', name: '영어 독해반', icon: 'book', desc: '고1 · 화목 · 3개월', prefill: { name: '고1 영어 독해반', grade: 'h1', subject: '영어', wdays: [2, 4], from: '19:00', to: '21:00', months: 3, cap: 10 } },
      { id: 'k12-think', name: '초등 사고력 수학', icon: 'puzzle', desc: '초등 4~6 · 토 · 6개월', prefill: { name: '초등 사고력 수학', grade: 'e4', subject: '수학', wdays: [6], from: '10:00', to: '11:30', months: 6, cap: 6 } },
      { id: 'k12-kor-mock', name: '수능 국어 실전반', icon: 'pen', desc: '고3 · 주 2회 · 2개월', prefill: { name: '고3 수능 국어 실전 모의고사반', grade: 'h3', subject: '국어', wdays: [2, 5], from: '19:00', to: '22:00', months: 2, cap: 15 } },
      { id: 'k12-vac', name: '방학 특강', icon: 'sun', desc: '중1 · 평일 매일 · 1개월', prefill: { name: '여름방학 중1 선행 특강', grade: 'm1', subject: '수학', wdays: [1, 2, 3, 4, 5], from: '13:00', to: '15:00', months: 1, cap: 12 } }
    ],
    plan: d => { const n = sessCount(d); return { weeks: Math.min(30, Math.max(1, Math.ceil(n / Math.max(1, (d.wdays || []).length || 1)) || 4)), per: (d.wdays || []).length || 1, mins: minsOf(d.from, d.to) || 90, hours: Math.round(n * (minsOf(d.from, d.to) || 90) / 60), count: n }; },
    check: d => {
      const R = [];
      if (!(d.wdays || []).length) R.push({ lv: 'stop', k: 'wdays', msg: '수업 요일을 하나 이상 고릅니다.' });
      if (d.from && d.to && minsOf(d.from, d.to) <= 0) R.push({ lv: 'stop', k: 'from', msg: '끝나는 시간이 시작 시간보다 늦어야 합니다.', fix: { to: addMin(d.from, 90) } });
      if (sessCount(d) > 100) R.push({ lv: 'warn', k: 'months', msg: `회차가 ${sessCount(d)}개라 100개까지만 만듭니다. 기간을 줄이는 것을 권합니다.` });
      if (N(d.price) > 0) R.push({ lv: 'info', k: 'price', msg: '월 수강료는 교육청에 등록하고 학원에 게시한 교습비와 같게 적습니다(학원법 교습비 게시 의무).', law: '학원의 설립 · 운영 및 과외교습에 관한 법률 제15조' });
      return R;
    },
    summary: d => [['학년 · 과목', `${gradeName(d.grade)} · ${d.subject || '—'}`], ['수업', `매주 ${(d.wdays || []).map(i => DAYS[i]).join(' · ') || '—'} ${d.from || ''}~${d.to || ''}`], ['기간', `${N(d.months) || 3}개월 · 회차 ${Math.min(100, sessCount(d))}개`], ['월 수강료', N(d.price) ? wn(d.price) : '나중에 입력'], ['정원', N(d.cap) ? N(d.cap) + '명' : '제한 없음']],
    apply: (c, d) => {
      baseApply(c, Object.assign({}, d, { sessions: 0 }));
      const start = d.start || td(); const end = plus(start, Math.round((N(d.months) || 3) * 30.4) - 1);
      c.kind = 'episode'; c.sub = '요일반'; c.days = (d.wdays || []).slice(); c.time = { from: d.from || '', to: d.to || '' }; c.start = start; c.end = end;
      c.grade = d.grade || ''; c.cat = d.subject || c.cat || ''; c.billing = { cycle: 'month', price: N(d.price) };
      try { if (typeof W2 !== 'undefined' && W2.genWeekly) { c.sessions = W2.genWeekly(start, end, c.days, c.time.from, c.time.to).slice(0, 100); c.att = c.att || {}; c.attT = c.attT || {}; if (W2.renum) W2.renum(c); if (W2.period) W2.period(c); if (W2.sync) W2.sync(c); } } catch (e) { console.error(e); }
      c.hours = Math.round(((c.sessions && c.sessions.length) || Math.min(100, sessCount(Object.assign({}, d, { start })))) * (minsOf(c.time.from, c.time.to) || 90) / 60);
      return c;
    }
  };
  const minsOf = (a, b) => { if (!/^\d{1,2}:\d{2}$/.test(a || '') || !/^\d{1,2}:\d{2}$/.test(b || '')) return 0; const f = s => s.split(':').map(Number).reduce((h, m) => h * 60 + m); return f(b) - f(a); };
  const addMin = (a, m) => { const [h, mm] = String(a || '16:00').split(':').map(Number); const t = Math.min(23 * 60 + 59, h * 60 + mm + m); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const sessCount = d => { const days = d.wdays || []; if (!days.length) return 0; const n = Math.round((N(d.months) || 3) * 30.4); const s = new Date((d.start || td()) + 'T00:00:00'); let k = 0; for (let i = 0; i < n; i++) { const x = new Date(s); x.setDate(s.getDate() + i); if (days.includes(x.getDay())) k++; } return k; };
  const gradeName = g => ({ e1: '초등 1~3', e4: '초등 4~6', m1: '중1', m2: '중2', m3: '중3', h1: '고1', h2: '고2', h3: '고3' }[g] || '—');

  /* ───────── 대학(라이트): 주차 · 차시 · 학점 ───────── */
  CF.cfg.univ = {
    label: '대학 교과목', unit: () => '주차',
    terms: { cls: '교과목', unit: '주차', fee: '수강료', target: '대상 학생' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepTitle: { basic: '어떤 교과목인가요?', outline: '몇 주 동안 하나요?', fill: '주차별 자료 넣기', setup: '수강 기간 · 공개', open: '확인하고 열기' },
    ask: {
      basic: [F.name('교과목 이름', '예: AI 리터러시와 글쓰기'), F.target('대상 학생', '예: 1학년 전체 · 간호학과 2학년', true), { k: 'kindU', label: '구분', kind: 'choice', ex: '예: 교양', def: 'gen', opts: [['gen', '교양'], ['major', '전공'], ['extra', '비교과'], ['staff', '교원 연수']] }],
      outline: [{ k: 'weeks', label: '주차 수', kind: 'choice', ex: '예: 15주(한 학기) · 비교과는 4주', def: 15, opts: [[4, '4주'], [8, '8주'], [15, '15주(한 학기)'], [16, '16주']] }, { k: 'per', label: '한 주 차시', kind: 'choice', ex: '예: 3차시(3학점 강의)', def: 3, opts: [[1, '1차시'], [2, '2차시'], [3, '3차시']] }, { k: 'credit', label: '학점', kind: 'choice', ex: '예: 3학점', def: 3, opts: [[0, '학점 없음'], [1, '1학점'], [2, '2학점'], [3, '3학점']], show: d => d.kindU !== 'extra' && d.kindU !== 'staff' }],
      setup: [F.start('수강 시작일(개강일)'), { k: 'openTo', label: '누가 볼 수 있나요', kind: 'choice', ex: '예: 우리 학교 학생만', def: 'member', opts: [['member', '우리 학교 학생만'], ['all', '누구나']], later: true }]
    },
    defaults: { kindU: 'gen', weeks: 15, per: 3, credit: 3, mins: 50, price: 0, openTo: 'member' },
    required: ['name', 'weeks'],
    examples: { name: '예: AI 리터러시와 글쓰기', weeks: '예: 15주' },
    templates: [
      { id: 'u-ai-lit', name: '교양 AI 리터러시', icon: 'spark', desc: '15주 · 주 2차시 · 2학점', prefill: { name: 'AI 리터러시와 글쓰기', kindU: 'gen', weeks: 15, per: 2, credit: 2, target: '1학년 전체' } },
      { id: 'u-prog', name: '전공 기초 프로그래밍', icon: 'code', desc: '15주 · 주 3차시 · 3학점', prefill: { name: '파이썬 프로그래밍 기초', kindU: 'major', weeks: 15, per: 3, credit: 3, target: '컴퓨터공학과 1학년' } },
      { id: 'u-career', name: '비교과 취업 특강', icon: 'brief', desc: '4주 · 주 1차시', prefill: { name: '취업 준비 — 자기소개서와 AI 모의면접', kindU: 'extra', weeks: 4, per: 1, credit: 0, target: '3~4학년' } },
      { id: 'u-faculty', name: '교원 AI 수업 연수', icon: 'teach', desc: '4주 · 교수 대상', prefill: { name: '교수를 위한 생성형 AI 수업 설계', kindU: 'staff', weeks: 4, per: 1, credit: 0, target: '전임 · 비전임 교원' } },
      { id: 'u-md', name: '마이크로디그리 과목', icon: 'badge', desc: '8주 · 주 2차시 · 1학점', prefill: { name: '스마트제조 데이터 분석(마이크로디그리)', kindU: 'major', weeks: 8, per: 2, credit: 1, target: '공유대학 참여 학생' } }
    ],
    plan: d => ({ weeks: N(d.weeks) || 15, per: N(d.per) || 3, mins: 50, hours: (N(d.weeks) || 15) * (N(d.per) || 3), univ: true }),
    check: d => {
      const R = []; const h = (N(d.weeks) || 15) * (N(d.per) || 3); const cr = N(d.credit);
      if (cr && d.kindU !== 'extra' && d.kindU !== 'staff' && h < cr * 15) R.push({ lv: 'warn', k: 'per', msg: `${cr}학점은 보통 ${cr * 15}시간(1학점 15시간) 이상입니다. 지금은 ${h}시간입니다.`, law: '고등교육법 시행령 제14조', fix: { weeks: 15, per: Math.max(cr, N(d.per)) } });
      return R;
    },
    summary: d => [['구분', { gen: '교양', major: '전공', extra: '비교과', staff: '교원 연수' }[d.kindU] || '교양'], ['구성', `${N(d.weeks) || 15}주 × 주 ${N(d.per) || 3}차시 = ${(N(d.weeks) || 15) * (N(d.per) || 3)}시간`], ['학점', N(d.credit) ? N(d.credit) + '학점' : '없음'], ['대상', d.target || '나중에 입력']],
    apply: (c, d) => { baseApply(c, Object.assign({}, d, { sessions: 0 })); const w = N(d.weeks) || 15; c.credit = N(d.credit) || 0; c.uKind = d.kindU || 'gen'; c.hours = w * (N(d.per) || 3); if (d.start) { c.start = d.start; c.end = plus(d.start, w * 7 - 1); } if (d.openTo === 'member') c.open = c.open === '전체' ? '회원' : c.open; return c; }
  };
  /* 학사 LMS는 기존 lms/* 체계 — 진입만 연결 */
  CF.cfg.univ_lms = {
    label: '학사 LMS 교과목', unit: () => '주차', terms: { cls: '교과목', unit: '주차' }, steps: [], ask: {}, defaults: {}, required: [], templates: [], check: () => [],
    redirect: () => { try { if (typeof go === 'function') go('lmsa'); setTimeout(() => { if (typeof ACT !== 'undefined' && ACT['lmsa-course-new']) ACT['lmsa-course-new']({ dataset: {} }); }, 0); } catch (e) { console.error(e); } return true; }
  };

  /* ───────── 학원(성인): 강좌 판매 · 차시 · 수강 기간 ───────── */
  CF.cfg.adult = {
    label: '성인 강좌', unit: () => '차시',
    terms: { cls: '강좌', unit: '차시', fee: '수강료', target: '수강 대상' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepTitle: { basic: '어떤 강좌인가요?', outline: '몇 차시로 할까요?', fill: '차시 채우기', setup: '수강료 · 수강 기간', open: '확인하고 판매 시작' },
    ask: {
      basic: [F.name('강좌 이름', '예: 컴활 1급 실기 한 달 완성'), F.target('누구에게', '예: 취업 준비생 · 엑셀 초보 직장인', true)],
      outline: [F.sessions('차시 수', '예: 12차시', 10, 60), F.mins('1차시 길이', '예: 30분(온라인 영상) · 2시간(교실 수업)', 30)],
      setup: [F.price('수강료', '예: 99,000원 · 무료면 0', 0, true), { k: 'days', label: '수강 기간', kind: 'choice', ex: '예: 결제 후 90일', def: 90, opts: [[30, '30일'], [60, '60일'], [90, '90일'], [180, '180일'], [365, '1년']] }, F.cap('예: 20명(교실 수업일 때)')]
    },
    defaults: { sessions: 10, mins: 30, price: 0, days: 90, cap: 0 },
    required: ['name', 'sessions'],
    examples: { name: '예: 컴활 1급 실기 한 달 완성', price: '예: 99,000원' },
    templates: [
      { id: 'a-comp', name: '컴활 1급 실기', icon: 'cert', desc: '자격증 · 12차시 · 60일', prefill: { name: '컴퓨터활용능력 1급 실기 한 달 완성', target: '자격증 준비생', sessions: 12, mins: 50, days: 60 } },
      { id: 'a-toeic', name: '토익 700 단기', icon: 'lang', desc: '어학 · 20차시 · 90일', prefill: { name: '토익 700 단기 완성', target: '토익 첫 응시자', sessions: 20, mins: 30, days: 90 } },
      { id: 'a-excel', name: '직장인 엑셀 실무', icon: 'table', desc: '실무 · 8차시 · 30일', prefill: { name: '바로 쓰는 직장인 엑셀 실무', target: '사무직 직장인', sessions: 8, mins: 30, days: 30 } },
      { id: 'a-py', name: '파이썬 입문', icon: 'code', desc: '코딩 · 10차시 · 90일', prefill: { name: '비전공자를 위한 파이썬 입문', target: '코딩 처음인 성인', sessions: 10, mins: 50, days: 90 } },
      { id: 'a-hobby', name: '취미 원데이 클래스', icon: 'brush', desc: '취미 · 1차시 · 교실', prefill: { name: '캘리그라피 원데이 클래스', target: '취미로 배우고 싶은 분', sessions: 1, mins: 120, days: 30, cap: 10 } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 10), per: 1, mins: N(d.mins) || 30, hours: Math.round(totalMin(d) / 60) }),
    check: d => { const R = []; if (N(d.sessions) > 60) R.push({ lv: 'stop', k: 'sessions', msg: '차시는 60개까지 만들 수 있습니다.', fix: { sessions: 60 } }); return R; },
    summary: d => [['구성', hoursLine(d) || '—'], ['수강료', N(d.price) ? wn(d.price) : '무료 또는 나중에 입력'], ['수강 기간', `결제 후 ${N(d.days) || 90}일`]],
    apply: (c, d) => { baseApply(c, d); c.kind = 'period'; c.period = Object.assign({}, c.period || {}, { mode: 'days', days: N(d.days) || 90 }); return c; }
  };

  /* ───────── 공공기관: 모집 · 대상 · 정원 · 법정/직무 ───────── */
  CF.cfg.public = {
    label: '공공 교육과정', unit: () => '차시',
    terms: { cls: '교육과정', unit: '차시', fee: '교육비', target: '교육 대상' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepTitle: { basic: '어떤 교육인가요?', outline: '교육 시간', fill: '차시 채우기', setup: '모집 · 정원 · 이수 기준', open: '확인하고 모집 시작' },
    ask: {
      basic: [F.name('교육과정 이름', '예: 2026 하반기 4대 폭력예방 통합교육'), { k: 'cat', label: '구분', kind: 'choice', ex: '예: 법정 의무교육', def: 'job', opts: [['legal', '법정 의무교육'], ['job', '직무교육'], ['onboard', '신규 임용자'], ['lead', '리더십 · 관리자']] }, F.target('교육 대상', '예: 전 직원 · 7급 이하 · 신규 임용자', true)],
      outline: [F.sessions('차시 수', '예: 4차시', 4, 40), F.mins('1차시 길이', '예: 30분 · 1시간', 60)],
      setup: [{ k: 'recruit', label: '모집 기간', kind: 'date', range: true, ex: '예: 11월 10일 ~ 11월 21일', later: true }, F.cap('예: 기수당 40명'), { k: 'rate', label: '이수 기준(진도)', kind: 'choice', ex: '예: 진도 80% 이상', def: 80, opts: [[60, '60% 이상'], [80, '80% 이상'], [100, '100%(모두 시청)']] }]
    },
    defaults: { cat: 'job', sessions: 4, mins: 60, rate: 80, cap: 0, price: 0 },
    required: ['name', 'cat'],
    examples: { name: '예: 2026 하반기 4대 폭력예방 통합교육', cap: '예: 기수당 40명' },
    templates: [
      { id: 'p-4v', name: '4대 폭력예방 통합교육', icon: 'shield', desc: '법정 · 4차시 · 연 1회', prefill: { name: '4대 폭력예방 통합교육', cat: 'legal', target: '전 직원', sessions: 4, mins: 60, rate: 100 } },
      { id: 'p-anti', name: '청렴 · 반부패 교육', icon: 'scale', desc: '법정 · 2차시', prefill: { name: '청렴 · 반부패 교육', cat: 'legal', target: '전 직원', sessions: 2, mins: 60, rate: 100 } },
      { id: 'p-new', name: '신규 임용자 기본교육', icon: 'door', desc: '신규 · 10차시 · 기수 운영', prefill: { name: '신규 임용자 기본교육', cat: 'onboard', target: '올해 신규 임용자', sessions: 10, mins: 60, cap: 40, rate: 80 } },
      { id: 'p-ai', name: '생성형 AI 행정 활용', icon: 'spark', desc: '직무 · 6차시', prefill: { name: '생성형 AI 행정 업무 활용', cat: 'job', target: '행정직 전 직급', sessions: 6, mins: 50, rate: 80 } },
      { id: 'p-civil', name: '적극행정 · 민원응대', icon: 'talk', desc: '직무 · 4차시 · 정원 30명', prefill: { name: '적극행정 · 민원응대 실무', cat: 'job', target: '민원 담당 공무원', sessions: 4, mins: 60, cap: 30, rate: 80 } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 4), per: 1, mins: N(d.mins) || 60, hours: Math.round(totalMin(d) / 60) }),
    check: d => {
      const R = [];
      if (d.cat === 'legal') { R.push({ lv: 'info', k: 'cat', msg: '법정 의무교육은 대상자 전원의 이수 기록이 필요합니다. 이수 기준을 진도 100%로 두는 것을 권합니다.' }); if (N(d.rate) < 80) R.push({ lv: 'warn', k: 'rate', msg: '법정 의무교육의 이수 기준이 낮습니다.', fix: { rate: 100 } }); }
      if (d.recruit && d.recruit.from && d.recruit.to && d.recruit.to < d.recruit.from) R.push({ lv: 'stop', k: 'recruit', msg: '모집 마감일이 시작일보다 빠릅니다.' });
      return R;
    },
    summary: d => [['구분', { legal: '법정 의무교육', job: '직무교육', onboard: '신규 임용자', lead: '리더십 · 관리자' }[d.cat] || '직무교육'], ['구성', hoursLine(d) || '—'], ['모집', d.recruit && d.recruit.from ? `${d.recruit.from} ~ ${d.recruit.to || ''}` : '바로 신청 받기'], ['정원', N(d.cap) ? N(d.cap) + '명' : '제한 없음'], ['이수 기준', `진도 ${N(d.rate) || 80}% 이상`]],
    apply: (c, d) => { baseApply(c, d); c.legal = d.cat === 'legal'; c.cat = { legal: '법정 의무교육', job: '직무교육', onboard: '신규 임용자', lead: '리더십 · 관리자' }[d.cat] || c.cat || ''; crit(c, d.cat === 'legal' ? { video: 100, exam: 0, assign: 0, threshold: N(d.rate) || 100 } : { threshold: N(d.rate) || 80 });
      if (d.recruit && d.recruit.from) { c.recruit = c.recruit || { on: false, cap: 0, from: '', to: '', early: { on: false, until: '', rate: 0 } }; Object.assign(c.recruit, { on: true, from: d.recruit.from, to: d.recruit.to || '' }); } return c; }
  };

  /* ───────── 평생교육원: 30시간 · 학점은행 · 학습비 ───────── */
  CF.cfg.lifelong = {
    label: '평생교육 강좌', unit: () => '차시',
    terms: { cls: '강좌', unit: '차시', fee: '학습비', target: '학습 대상' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepTitle: { basic: '어떤 강좌인가요?', outline: '몇 시간 강좌인가요?', fill: '차시 채우기', setup: '학습비 · 정원', open: '확인하고 열기' },
    ask: {
      basic: [F.name('강좌 이름', '예: 시니어를 위한 스마트폰 활용'), F.target('누구에게', '예: 60세 이상 지역 주민', true), { k: 'cb', label: '학점은행 과목인가요', kind: 'toggle', ex: '예: 사회복지학개론처럼 학점이 인정되는 과목이면 켭니다', def: false }],
      outline: [F.sessions('차시 수', '예: 15차시', 15, 60), F.mins('1차시 길이', '예: 2시간(교실) · 50분(온라인)', 120), { k: 'credit', label: '인정 학점', kind: 'choice', ex: '예: 3학점', def: 3, opts: [[1, '1학점'], [2, '2학점'], [3, '3학점']], show: d => !!d.cb }],
      setup: [F.price('학습비', '예: 120,000원 · 무료면 0', 0, true), F.cap('예: 20명'), F.start('개강일')]
    },
    defaults: { sessions: 15, mins: 120, price: 0, cap: 0, cb: false, credit: 3 },
    required: ['name', 'sessions', 'mins'],
    examples: { name: '예: 시니어를 위한 스마트폰 활용', price: '예: 120,000원' },
    templates: [
      { id: 'l-phone', name: '시니어 스마트폰 활용', icon: 'phone', desc: '무료 · 10차시 · 교실', prefill: { name: '시니어를 위한 스마트폰 활용', target: '60세 이상 지역 주민', sessions: 10, mins: 120, price: 0, cap: 20 } },
      { id: 'l-barista', name: '바리스타 자격 준비', icon: 'cup', desc: '유료 · 15차시 · 30시간', prefill: { name: '바리스타 2급 자격 준비', target: '창업 · 취업 준비 성인', sessions: 15, mins: 120, cap: 12 } },
      { id: 'l-cb-sw', name: '사회복지학개론(학점은행)', icon: 'cert', desc: '3학점 · 15차시 · 온라인', prefill: { name: '사회복지학개론', target: '학점은행제 학습자', cb: true, credit: 3, sessions: 15, mins: 180 } },
      { id: 'l-human', name: '인문학 교양 강좌', icon: 'book', desc: '유료 · 10차시 · 30시간', prefill: { name: '고전으로 읽는 인문학', target: '지역 주민', sessions: 10, mins: 180, cap: 30 } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 15), per: 1, mins: N(d.mins) || 120, hours: Math.round(totalMin(d) / 60) }),
    check: d => {
      const R = []; const h = totalMin(d) / 60;
      if (N(d.price) > 0 && h < 30) R.push({ lv: 'warn', k: 'sessions', msg: `학습비를 받는 원격 강좌는 30시간 이상이 신고 기준입니다. 지금은 ${hm(totalMin(d))}입니다.`, law: '평생교육법 시행령 제48조', fix: { sessions: Math.ceil(30 * 60 / Math.max(1, N(d.mins) || 120)) } });
      if (d.cb) { const need = (N(d.credit) || 3) * 15; if (h < need) R.push({ lv: 'warn', k: 'sessions', msg: `학점은행 ${N(d.credit) || 3}학점은 ${need}시간(1학점 15시간) 이상이 필요합니다. 지금은 ${hm(totalMin(d))}입니다.`, law: '학점인정 등에 관한 법률 시행령', fix: { sessions: Math.ceil(need * 60 / Math.max(1, N(d.mins) || 180)) } }); R.push({ lv: 'info', k: 'cb', msg: '학점은행 과목은 평가인정을 받은 학습과목명 · 시간으로 운영합니다. 국가평생교육진흥원 인정 내용을 확인합니다.' }); }
      return R;
    },
    summary: d => [['구성', hoursLine(d) || '—'], ['학습비', N(d.price) ? wn(d.price) : '무료'], ['학점은행', d.cb ? `${N(d.credit) || 3}학점` : '해당 없음'], ['정원', N(d.cap) ? N(d.cap) + '명' : '제한 없음']],
    apply: (c, d) => { baseApply(c, d); c.cb = d.cb ? { on: true, credit: N(d.credit) || 3 } : null; if (d.start) c.start = d.start; return c; }
  };

  /* ───────── 직업훈련원: 훈련 방식 · 훈련시간 · 심사코드 · HRD-Net ───────── */
  const VMODE = { remote: '원격(인터넷)', mix: '혼합(원격 + 집체)', group: '집체(교실)' };
  CF.cfg.voc = {
    label: '훈련과정', unit: () => '차시',
    terms: { cls: '훈련과정', unit: '차시', fee: '훈련비', target: '훈련 대상' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepTitle: { basic: '어떤 훈련과정인가요?', outline: '훈련 방식 · 훈련시간', fill: '차시 채우기', setup: '훈련 기간 · 심사 정보', open: '규정 확인하고 열기' },
    ask: {
      basic: [F.name('훈련과정 이름', '예: 웹 개발 기초(내일배움카드)'), { k: 'emp', label: '훈련 구분', kind: 'choice', ex: '예: 내일배움카드', def: '3', opts: [['3', '내일배움카드'], ['1', '사업주 훈련'], ['4', '공통']] }, { k: 'mode', label: '훈련 방식', kind: 'choice', ex: '예: 원격(인터넷) — 집에서 영상으로', def: 'remote', opts: Object.entries(VMODE) }],
      outline: [F.sessions('차시 수', '예: 16차시(원격은 하루 8차시까지 수강)', 16, 60), { k: 'mins', label: '차시 인정 시간', kind: 'choice', ex: '예: 30분 — 심사 받은 차시별 학습시간과 같게', def: 30, opts: [[25, '25분'], [30, '30분'], [50, '50분'], [60, '1시간']] }],
      setup: [F.start('훈련 시작일'), { k: 'simsa', label: '심사과정코드', kind: 'code', len: 20, ex: '예: 심사 통과 후 받은 20자리 코드', later: true }, { k: 'tracse', label: 'HRD-Net 훈련과정 ID', kind: 'code', len: 17, ex: '예: HRD-Net에 등록된 17자리 ID', later: true }]
    },
    defaults: { emp: '3', mode: 'remote', sessions: 16, mins: 30, price: 0 },
    required: ['name', 'mode', 'sessions', 'mins'],
    examples: { name: '예: 웹 개발 기초(내일배움카드)', simsa: '예: 20자리', tracse: '예: 17자리' },
    templates: [
      { id: 'v-web', name: 'K-디지털 웹 개발 기초', icon: 'code', desc: '원격 · 16차시 · 8시간', prefill: { name: '웹 개발 기초(HTML · CSS · JS)', emp: '3', mode: 'remote', sessions: 16, mins: 30, target: '내일배움카드 소지자' } },
      { id: 'v-care', name: '요양보호사 실기', icon: 'care', desc: '집체 · 실습 중심', prefill: { name: '요양보호사 실기', emp: '3', mode: 'group', sessions: 20, mins: 60, target: '요양보호사 교육생' } },
      { id: 'v-excel', name: '사업주 엑셀 데이터 분석', icon: 'table', desc: '사업주 원격 · 10차시', prefill: { name: '엑셀 데이터 분석 실무', emp: '1', mode: 'remote', sessions: 10, mins: 30, target: '재직자(사업주 훈련)' } },
      { id: 'v-safe', name: '산업안전 관리감독자', icon: 'shield', desc: '혼합 · 16차시', prefill: { name: '산업안전 관리감독자 교육', emp: '1', mode: 'mix', sessions: 16, mins: 60, target: '현장 관리감독자' } },
      { id: 'v-elec', name: '전기기능사 필기', icon: 'bolt', desc: '원격 · 24차시 · 12시간', prefill: { name: '전기기능사 필기 대비', emp: '3', mode: 'remote', sessions: 24, mins: 30, target: '자격 취득 희망자' } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 16), per: 1, mins: N(d.mins) || 30, hours: Math.round(totalMin(d) / 60) }),
    check: d => {
      const R = []; const P = cplOn() || {}; const online = d.mode !== 'group';
      if (online && totalMin(d) < 240) R.push({ lv: 'warn', k: 'sessions', msg: `원격 훈련과정 분량은 4시간 이상이어야 합니다. 지금은 ${hm(totalMin(d))}입니다.`, law: '사업주 직업능력개발훈련 지원규정 제6조', fix: { sessions: Math.ceil(240 / Math.max(1, N(d.mins) || 30)) } });
      if (online) R.push({ lv: 'info', k: 'sessions', msg: `훈련생은 하루 ${+P.dayChasi || 8}차시까지 수강합니다. 차시 진도는 인정 시간의 ${+P.itemMin || 50}% 이상 학습해야 인정됩니다.`, law: '원격훈련 과정인정요건 체크리스트 19 · 20번' });
      [['simsa', 20, '심사과정코드'], ['tracse', 17, 'HRD-Net 훈련과정 ID']].forEach(([k, n, l]) => { const v = String(d[k] || '').trim(); if (v && v.length !== n) R.push({ lv: 'stop', k, msg: `${l}는 ${n}자리입니다. 지금 ${v.length}자리입니다.` }); else if (!v) R.push({ lv: 'info', k, msg: `${l}는 심사 · 등록 뒤에 넣어도 됩니다. 공단 보고 전에는 꼭 넣습니다.` }); });
      R.push({ lv: 'info', k: 'fill', msg: `평가 문항은 출제 수의 ${+P.bank || 3}배 이상 준비합니다. 수료 기준은 진도 ${+P.rate || 80}% 이상 · 평가 ${+P.pass || 60}점 이상입니다.`, law: '별표 1 · 국민내일배움카드 운영규정' });
      return R;
    },
    summary: d => [['훈련 구분', { 3: '내일배움카드', 1: '사업주 훈련', 4: '공통' }[d.emp] || '내일배움카드'], ['훈련 방식', VMODE[d.mode] || VMODE.remote], ['훈련시간', hoursLine(d) || '—'], ['심사과정코드', d.simsa || '나중에 입력'], ['HRD-Net ID', d.tracse || '나중에 입력']],
    apply: (c, d) => { baseApply(c, d); const P = cplOn() || {}; c.hrd = Object.assign({}, c.hrd || {}, { simsa: String(d.simsa || '').trim().slice(0, 20), tracse: String(d.tracse || '').trim().slice(0, 17), emp: d.emp || '3', mix: d.mode === 'mix' ? '1' : '', goal: String(c.goal || '').slice(0, 100), target: String(d.target || '').slice(0, 100) }); c.trainMode = d.mode || 'remote'; if (d.start) { c.start = d.start; }
      crit(c, { threshold: +P.rate || 80 }); c.cplPass = +P.pass || 60; return c; }
  };

  /* ───────── 기업: 법정/직무 · 대상 부서 · 이수 기준 · 환급 ───────── */
  CF.cfg.corp = {
    label: '사내 교육과정', unit: () => '차시',
    terms: { cls: '교육과정', unit: '차시', fee: '교육비', target: '대상 부서' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepTitle: { basic: '어떤 교육인가요?', outline: '교육 시간', fill: '차시 채우기', setup: '대상 · 기간 · 이수 기준', open: '확인하고 배정하기' },
    ask: {
      basic: [F.name('교육과정 이름', '예: 2026 직장 내 성희롱 예방교육'), { k: 'cat', label: '구분', kind: 'choice', ex: '예: 법정 의무교육', def: 'job', opts: [['legal', '법정 의무교육'], ['job', '직무교육'], ['onboard', '신입 · 온보딩'], ['lead', '리더십']] }],
      outline: [F.sessions('차시 수', '예: 3차시', 3, 40), F.mins('1차시 길이', '예: 20~30분(짧을수록 이수율이 높아요)', 30), { k: 'refund', label: '고용보험 환급(사업주 훈련)', kind: 'toggle', ex: '예: 환급받는 직무교육이면 켭니다', def: false, later: true }],
      setup: [{ k: 'dept', label: '대상 부서', kind: 'text', ex: '예: 전 직원 · 영업본부 · 신입사원', later: true }, { k: 'weeks', label: '교육 기간', kind: 'choice', ex: '예: 4주 안에 이수', def: 4, opts: [[1, '1주'], [2, '2주'], [4, '4주'], [8, '8주'], [12, '12주']] }, { k: 'rate', label: '이수 기준(진도)', kind: 'choice', ex: '예: 진도 100%', def: 80, opts: [[60, '60% 이상'], [80, '80% 이상'], [100, '100%(모두 시청)']] }]
    },
    defaults: { cat: 'job', sessions: 3, mins: 30, rate: 80, weeks: 4, refund: false, price: 0 },
    required: ['name', 'cat'],
    examples: { name: '예: 2026 직장 내 성희롱 예방교육', dept: '예: 전 직원' },
    templates: [
      { id: 'c-harass', name: '직장 내 성희롱 예방', icon: 'shield', desc: '법정 · 연 1회 · 전 직원', prefill: { name: '직장 내 성희롱 예방교육', cat: 'legal', sessions: 2, mins: 30, dept: '전 직원', rate: 100, weeks: 4 } },
      { id: 'c-privacy', name: '개인정보보호 교육', icon: 'lock', desc: '법정 · 2차시', prefill: { name: '개인정보보호 교육', cat: 'legal', sessions: 2, mins: 30, dept: '개인정보 취급자', rate: 100, weeks: 4 } },
      { id: 'c-ojt', name: '신입사원 OJT', icon: 'door', desc: '온보딩 · 8차시 · 2주', prefill: { name: '신입사원 OJT', cat: 'onboard', sessions: 8, mins: 30, dept: '신입사원', rate: 80, weeks: 2 } },
      { id: 'c-lead', name: '팀장 리더십', icon: 'team', desc: '리더십 · 6차시', prefill: { name: '신임 팀장 리더십', cat: 'lead', sessions: 6, mins: 50, dept: '팀장 · 파트장', rate: 80, weeks: 8 } },
      { id: 'c-sales', name: '영업 직무 기본', icon: 'brief', desc: '직무 · 환급 · 8차시', prefill: { name: '영업 직무 기본 과정', cat: 'job', sessions: 8, mins: 30, dept: '영업본부', refund: true, rate: 80, weeks: 4 } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 3), per: 1, mins: N(d.mins) || 30, hours: Math.round(totalMin(d) / 60) }),
    check: d => {
      const R = [];
      if (d.cat === 'legal') { R.push({ lv: 'info', k: 'cat', msg: '법정 의무교육은 해마다 대상자 전원이 이수해야 합니다(예: 성희롱 예방교육 연 1회 이상). 이수 기록은 \'법정\' 표시로 따로 모아 봅니다.', law: '남녀고용평등법 시행령 제3조 등' }); if (N(d.rate) < 100) R.push({ lv: 'warn', k: 'rate', msg: '법정 의무교육은 진도 100%를 권합니다.', fix: { rate: 100 } }); }
      if (d.refund) { if (totalMin(d) < 240) R.push({ lv: 'warn', k: 'sessions', msg: `환급받는 원격 교육은 4시간 이상이어야 합니다. 지금은 ${hm(totalMin(d))}입니다.`, law: '사업주 직업능력개발훈련 지원규정 제6조', fix: { sessions: Math.ceil(240 / Math.max(1, N(d.mins) || 30)) } }); R.push({ lv: 'info', k: 'refund', msg: '환급 과정은 심사과정코드 · HRD-Net ID가 필요합니다. 개설 후 \'규정 준수\' 메뉴에서 넣습니다.' }); }
      return R;
    },
    summary: d => [['구분', { legal: '법정 의무교육', job: '직무교육', onboard: '신입 · 온보딩', lead: '리더십' }[d.cat] || '직무교육'], ['구성', hoursLine(d) || '—'], ['대상', d.dept || '나중에 배정'], ['기간', `${N(d.weeks) || 4}주 안에 이수`], ['이수 기준', `진도 ${N(d.rate) || 80}% 이상`], ['환급', d.refund ? '사업주 훈련(환급)' : '해당 없음']],
    apply: (c, d) => { baseApply(c, d); c.legal = d.cat === 'legal'; c.cat = { legal: '법정 의무교육', job: '직무교육', onboard: '신입 · 온보딩', lead: '리더십' }[d.cat] || c.cat || ''; if (d.dept) { c.sub = String(d.dept).slice(0, 60); try { const g = (S.groups || []).find(x => x.name === d.dept); if (g) c.group = g.id; } catch (e) { } }
      c.end = plus(c.start || td(), (N(d.weeks) || 4) * 7 - 1); crit(c, d.cat === 'legal' ? { video: 100, exam: 0, assign: 0, threshold: N(d.rate) || 100 } : { threshold: N(d.rate) || 80 }); if (d.refund) c.hrd = Object.assign({}, c.hrd || {}, { emp: '1' }); return c; }
  };

  /* C1은 cfg.check(d) · summary(d) · apply(c, d)를 바로 부른다 — 비운 칸은 기본값으로 보고 계산하도록 감싼다 */
  const fill = (k, d) => { const g = CF.cfg[k]; const x = JSON.parse(JSON.stringify(d || {})); Object.entries(g.defaults || {}).forEach(([q, v]) => { if (x[q] === undefined || x[q] === '') x[q] = Array.isArray(v) ? v.slice() : v; }); Object.values(g.ask || {}).flat().forEach(f => { if ((x[f.k] === undefined || x[f.k] === '') && f.def !== undefined) x[f.k] = Array.isArray(f.def) ? f.def.slice() : f.def; if (f.to && !x[f.to]) x[f.to] = f.toDef; }); return x; };
  Object.keys(CF.cfg).forEach(k => { const g = CF.cfg[k]; ['check', 'summary', 'plan'].forEach(m => { const f = g[m]; if (typeof f === 'function') g[m] = d => f(fill(k, d)); }); if (typeof g.apply === 'function') { const f = g.apply; g.apply = (c, d) => f(c, fill(k, d)); } });

  /* ───────── 도우미: 키 · 현재 cfg · 기본값 · 검사 ───────── */
  CF.cfgKey = () => { try { const ty = S && S.org && S.org.type; if (ty === 'univ' && S.org.ed === 'lms') return 'univ_lms'; return CF.cfg[ty] ? ty : 'adult'; } catch (e) { return 'adult'; } };
  CF.cfgOf = k => CF.cfg[k || CF.cfgKey()] || CF.cfg.adult;
  /* 모든 질문의 def를 d에 채운다(이미 있는 값은 유지) */
  CF.scnDefaults = (d, k) => { const g = CF.cfgOf(k); d = d || {}; Object.entries(g.defaults || {}).forEach(([x, v]) => { if (d[x] === undefined) d[x] = Array.isArray(v) ? v.slice() : v; }); Object.values(g.ask || {}).flat().forEach(f => { if (d[f.k] === undefined && f.def !== undefined) d[f.k] = Array.isArray(f.def) ? f.def.slice() : f.def; if (f.to && d[f.to] === undefined) d[f.to] = f.toDef; }); return d; };
  CF.scnTemplate = (id, d, k) => { const g = CF.cfgOf(k); const T = (g.templates || []).find(x => x.id === id); if (!T) return d; d = Object.assign(d || {}, JSON.parse(JSON.stringify(T.prefill)), { tpl: id }); return CF.scnDefaults(d, k); };
  /* 단계 검사: 그 단계 질문의 필수 빈칸(stop) + cfg.check 중 그 단계 칸 */
  CF.scnCheck = (d0, step, k) => { const g = CF.cfgOf(k); const d = CF.scnDefaults(JSON.parse(JSON.stringify(d0 || {})), k); /* 비운 칸은 기본값으로 본다(비워도 개설까지) */ const ask = step ? (g.ask || {})[step] || [] : Object.values(g.ask || {}).flat(); const keys = new Set(ask.map(f => f.k)); const R = [];
    ask.forEach(f => { if (f.show && !f.show(d)) return; const v = d[f.k]; const empty = v == null || v === '' || (Array.isArray(v) && !v.length); if ((g.required || []).includes(f.k) && empty) R.push({ lv: 'stop', k: f.k, msg: `${f.label} 칸을 채웁니다. ${f.ex || ''}`.trim() }); if (!empty && f.kind === 'num' && ((f.min != null && N(v) < f.min) || (f.max != null && N(v) > f.max))) R.push({ lv: 'stop', k: f.k, msg: `${f.label}: ${f.min}~${f.max}${f.unit || ''} 사이로 넣습니다.` }); });
    try { (g.check ? g.check(d) : []).forEach(x => { if (!step || keys.has(x.k) || (step === 'open')) R.push(x); }); } catch (e) { console.error(e); }
    return R; };
  CF.scnSummary = (d, k) => { const g = CF.cfgOf(k); try { return g.summary ? g.summary(CF.scnDefaults(JSON.parse(JSON.stringify(d || {})), k)) : []; } catch (e) { return []; } };
  CF.scnApply = (c, d, k) => { const g = CF.cfgOf(k); try { if (g.apply && c) g.apply(c, CF.scnDefaults(JSON.parse(JSON.stringify(d || {})), k)); } catch (e) { console.error(e); } return c; };
})();
