/* v35 과정 만들기 — 기관 유형별 시나리오(C2)
   CF.cfg[type]: 단계 구성 · 질문 · 용어 · 필수 항목 · 기본값 · 예시 · 템플릿 · 규정 검사 · 생성 후 반영(apply).
   근거: 규정 수치는 compliance.js(DEF · e-hours · 심사코드 20자리 · HRD ID 17자리 · itemMin 50 · rate 80 · pass 60 · dayChasi 8 · bank 3)와
   mods.js 평생교육(유료 30시간) · docs/compliance/README.md를 따른다. 학원법 교습비 게시 · 고등교육법 1학점 15시간 · 남녀고용평등법 연 1회는 안내만 한다.
   질문은 단계마다 최대 3개, 나머지는 '나중에 해도 됩니다'(later). 로드 시 S는 null — S는 함수 안에서만 읽는다. */
(() => {
  const CF = window.CF = window.CF || {};
  CF.cfg = CF.cfg || {};
  const N = v => (v === '' || v == null || isNaN(+v)) ? 0 : +v;
  const td = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const plus = (d, n) => { try { if (typeof addDays === 'function') return addDays(d, n); } catch (e) { } const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const wn = n => (typeof won === 'function' ? won(n) : (+n || 0).toLocaleString('ko-KR') + '원');
  const hm = m => { m = Math.round(N(m)); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}시간${r ? ' ' + r + '분' : ''}` : `${r}분`; };
  /* 받침에 맞는 조사: josa('훈련과정', '이') → '훈련과정이' · josa('강좌', '이') → '강좌가' (이/가 · 을/를 · 은/는 · 과/와 · 으로/로, ㄹ 받침 + 으로 → 로) */
  const josa = (w, a) => { const s = String(w || ''); const ch = s.charCodeAt(s.length - 1); const jong = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : /[a-z]$/i.test(s) ? ('lmnr'.includes(s.slice(-1).toLowerCase()) ? 1 : 0) : /[0-9]$/.test(s) ? ([1, 3, 6, 7, 8, 0].includes(+s.slice(-1)) ? 1 : 0) : 0; const P = { '을': ['을', '를'], '이': ['이', '가'], '은': ['은', '는'], '과': ['과', '와'], '으로': ['으로', '로'] }[a]; return s + (P ? (jong && !(a === '으로' && jong === 8) ? P[0] : P[1]) : a); };
  /* 조사 하나로 통일(F2 통합 요청): ai.js AI.j(따옴표 · 괄호 뒤 · 영문 · 숫자 · ㄹ+으로)가 있으면 그것, 없으면 이 파일의 josa */
  CF.josa = (w, a) => { try { if (typeof AI !== 'undefined' && AI && typeof AI.j === 'function') return String(w == null ? '' : w) + AI.j(w, a); } catch (e) { } return josa(w, a); };
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const varM = d => d.minsMode === 'each' || d.minsMode === 'auto'; /* v36: 차시별 분(직접 · 자동 배분) */
  const totalMin = d => { if (varM(d) && Array.isArray(d.weekPlan) && d.weekPlan.length) return d.weekPlan.reduce((a, w) => a + (N(w.mins) || N(d.mins)), 0); return N(d.sessions) * N(d.mins); }; /* v36: 차시마다 다르게(직접 입력)면 차시별 분의 합 */
  const cplOn = () => { try { const P = window.cplPublic && cplPublic(); return P ? P : null; } catch (e) { return null; } };
  /* 공통 질문 조각 */
  const F = {
    name: (label, ex) => ({ k: 'name', label, kind: 'text', ex, maxLen: 50, ai: true }),
    target: (label, ex, later) => ({ k: 'target', label, kind: 'text', ex, maxLen: 60, later: !!later, ai: true }),
    sessions: (label, ex, def, max) => ({ k: 'sessions', label, kind: 'num', ex, def, min: 1, max: max || 60, unit: '개' }),
    mins: (label, ex, def) => ({ k: 'mins', label, kind: 'choice', ex, def, opts: [[25, '25분'], [30, '30분'], [50, '50분'], [60, '1시간'], [90, '1시간 30분'], [120, '2시간'], [180, '3시간']] }),
    price: (label, ex, def, later) => ({ k: 'price', label, kind: 'num', ex, def, min: 0, max: 99999999, unit: '원', later: later !== false }),
    cap: (ex) => ({ k: 'cap', label: '정원', kind: 'num', ex, def: 0, min: 0, max: 9999, unit: '명', later: true, hint: '0이면 제한 없음' }),
    start: (label) => ({ k: 'start', label: label || '시작일', kind: 'date', ex: '예: 다음 달 1일', later: true })
  };
  /* 차시 수 · 길이로 총 시간 한 줄 */
  const hoursLine = (d, unit) => varM(d) && (d.weekPlan || []).length ? `${unit || '차시'} ${d.weekPlan.length}개(차시마다 다름) = 총 ${hm(totalMin(d))}` : N(d.sessions) && N(d.mins) ? `${unit || '차시'} ${N(d.sessions)}개 × ${hm(d.mins)} = 총 ${hm(totalMin(d))}` : '';
  /* 공통 apply: 정원 · 모집 · 시간 */
  const baseApply = (c, d) => {
    if (N(d.cap) > 0) { c.recruit = c.recruit || { on: false, cap: 0, from: '', to: '', early: { on: false, until: '', rate: 0 } }; c.recruit.cap = N(d.cap); }
    if ((N(d.sessions) && N(d.mins)) || varM(d)) c.hours = Math.round(totalMin(d) / 60 * 10) / 10;
    if (d.target) c.sub = String(d.target).slice(0, 60);
    if (N(d.price) >= 0 && d.price !== '' && d.price != null) c.price = N(d.price);
    if (d.tpl) c.crsTpl = d.tpl;
    /* 차시 인정 시간: 영상 항목에 1차시 분량 기록(직업훈련 · 기업 환급의 '인정 학습시간' 기본값) */
    if (N(d.mins) || varM(d)) (c.curriculum || []).filter(i => i.type === 'video' && !(+i.cplMin > 0)).forEach(i => { const w = varM(d) && (d.weekPlan || [])[(+i.week || 1) - 1]; i.cplMin = (w && N(w.mins)) || N(d.mins); });
    c.crsScn = CF.cfgKey ? CF.cfgKey() : '';
    return c;
  };
  const crit = (c, x) => { c.criteria = Object.assign({ video: 50, exam: 30, assign: 20, threshold: 70 }, c.criteria || {}, x); };

  /* ───────── 학원(초중고): 반 · 요일 · 시간 · 월 수강료 → 회차 자동 ───────── */
  CF.cfg.k12 = {
    label: '학원(초중고) 수업', unit: () => '회차',
    terms: { cls: '수업', unit: '회차', fee: '월 수강료', target: '학년' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepNow: { basic: '수업 이름과 학년 · 과목을 고릅니다. 아래 예시를 누르면 칸이 채워집니다.', outline: '요일 · 시간 · 기간을 고르면 회차가 달력에 맞춰 자동으로 만들어집니다.', setup: '월 수강료와 한 반 정원을 적습니다. 나중에 적어도 됩니다.' },
    stepTitle: { basic: '수업 정보', outline: '수업 일정', fill: '수업 자료', setup: '수강료', open: '확인' },
    ask: {
      basic: [F.name('수업 이름', '예: 중2 수학 내신반'), { k: 'grade', label: '학년', kind: 'choice', ex: '예: 중2', def: 'm2', opts: [['e1', '초등 1~3'], ['e4', '초등 4~6'], ['m1', '중1'], ['m2', '중2'], ['m3', '중3'], ['h1', '고1'], ['h2', '고2'], ['h3', '고3']] }, { k: 'subject', label: '과목', kind: 'choice', ex: '예: 수학', def: '수학', opts: [['국어', '국어'], ['영어', '영어'], ['수학', '수학'], ['과학', '과학'], ['사회', '사회'], ['기타', '기타']] }],
      outline: [{ k: 'wdays', label: '수업 요일', kind: 'days', ex: '예: 월 · 수 · 금', def: [1, 3, 5] }, { k: 'slot', label: '수업 시간', kind: 'choice', ex: '예: 오후 4:00~5:30(다른 시간은 만든 뒤 회차마다 바꿀 수 있습니다)', def: '16:00-17:30', opts: [['14:00-15:30', '오후 2:00~3:30'], ['16:00-17:30', '오후 4:00~5:30'], ['17:30-19:00', '오후 5:30~7:00'], ['19:00-21:00', '저녁 7:00~9:00'], ['19:00-22:00', '저녁 7:00~10:00'], ['10:00-11:30', '오전 10:00~11:30'], ['13:00-15:00', '오후 1:00~3:00']] }, { k: 'months', label: '기간', kind: 'choice', ex: '예: 3개월(한 학기 내신 대비)', def: 3, opts: [[1, '1개월'], [2, '2개월'], [3, '3개월'], [6, '6개월'], [12, '1년']] }],
      setup: [F.price('월 수강료', '예: 280,000원(학원에 게시한 교습비와 같게)', 0, true), F.cap('예: 8명(한 반)')]
    },
    defaults: { kind: 'episode', auto: { video: 'none', docs: true, quiz: true, assign: false, exam: false }, grade: 'm2', subject: '수학', wdays: [1, 3, 5], slot: '16:00-17:30', months: 3, price: 0, cap: 0, mins: 90 },
    required: ['name', 'wdays'],
    examples: { name: '예: 중2 수학 내신반', wdays: '예: 월 · 수 · 금', price: '예: 월 280,000원' },
    templates: [
      { id: 'k12-math-mid', name: '수학 내신반', icon: 'chart', desc: '중2 · 월수금 · 3개월', prefill: { name: '중2 수학 내신반', grade: 'm2', subject: '수학', wdays: [1, 3, 5], slot: '16:00-17:30', months: 3, cap: 8 } },
      { id: 'k12-eng-read', name: '영어 독해반', icon: 'book', desc: '고1 · 화목 · 3개월', prefill: { name: '고1 영어 독해반', grade: 'h1', subject: '영어', wdays: [2, 4], slot: '19:00-21:00', months: 3, cap: 10 } },
      { id: 'k12-think', name: '초등 사고력 수학', icon: 'spark', desc: '초등 4~6 · 토 · 6개월', prefill: { name: '초등 사고력 수학', grade: 'e4', subject: '수학', wdays: [6], slot: '10:00-11:30', months: 6, cap: 6 } },
      { id: 'k12-phonics', name: '초등 영어 파닉스', icon: 'chat', desc: '초등 1~3 · 월수 · 3개월', prefill: { name: '초등 영어 파닉스반', grade: 'e1', subject: '영어', wdays: [1, 3], slot: '14:00-15:30', months: 3, cap: 8 } },
      { id: 'k12-sci', name: '중3 과학 내신', icon: 'doc', desc: '중3 · 화목 · 2개월', prefill: { name: '중3 과학 내신 대비반', grade: 'm3', subject: '과학', wdays: [2, 4], slot: '17:30-19:00', months: 2, cap: 10 } },
      { id: 'k12-calc', name: '고2 수학 미적분', icon: 'chart', desc: '고2 · 월수금 · 3개월', prefill: { name: '고2 수학 미적분반', grade: 'h2', subject: '수학', wdays: [1, 3, 5], slot: '19:00-21:00', months: 3, cap: 12 } },
      { id: 'k12-kor-mock', name: '수능 국어 실전반', icon: 'edit', desc: '고3 · 주 2회 · 2개월', prefill: { name: '고3 수능 국어 실전 모의고사반', grade: 'h3', subject: '국어', wdays: [2, 5], slot: '19:00-22:00', months: 2, cap: 15 } },
      { id: 'k12-vac', name: '방학 선행 특강', icon: 'k12', desc: '중1 · 평일 매일 · 1개월', prefill: { name: '여름방학 중1 수학 선행 특강', grade: 'm1', subject: '수학', wdays: [1, 2, 3, 4, 5], slot: '13:00-15:00', months: 1, cap: 12 } }
    ],
    plan: d => { const n = sessCount(d); return { weeks: Math.max(1, Math.min(60, n || 12)), per: (d.wdays || []).length || 1, mins: minsOf(d.from, d.to) || 90, hours: Math.round(n * (minsOf(d.from, d.to) || 90) / 60), count: n }; },
    check: d => {
      const R = [];
      if (!(d.wdays || []).length) R.push({ lv: 'stop', k: 'wdays', msg: '수업 요일을 하나 이상 고릅니다.' });
      if (d.from && d.to && minsOf(d.from, d.to) <= 0) R.push({ lv: 'stop', k: 'slot', msg: '끝나는 시간이 시작 시간보다 늦어야 합니다.', fix: { slot: `${d.from}-${addMin(d.from, 90)}` } });
      if (sessCount(d) > 100) R.push({ lv: 'warn', k: 'months', msg: `회차가 ${sessCount(d)}개라 100개까지만 만듭니다. 기간을 줄이는 것을 권합니다.` });
      if (N(d.price) > 0) R.push({ lv: 'info', k: 'price', msg: '월 수강료는 교육청에 등록하고 학원에 게시한 교습비와 같게 적습니다(학원법 교습비 게시 의무).', law: '학원의 설립 · 운영 및 과외교습에 관한 법률 제15조' });
      return R;
    },
    summary: d => [['학년 · 과목', `${gradeName(d.grade)} · ${d.subject || '—'}`], ['수업', `매주 ${(d.wdays || []).map(i => DAYS[i]).join(' · ') || '—'} ${d.from || ''}~${d.to || ''}`], ['기간', `${N(d.months) || 3}개월 · 수업 ${Math.min(100, sessCount(d))}회`], ['월 수강료', N(d.price) ? wn(d.price) : '나중에 입력'], ['정원', N(d.cap) ? N(d.cap) + '명' : '제한 없음']],
    apply: (c, d) => {
      baseApply(c, Object.assign({}, d, { sessions: 0 }));
      const start = d.start || td(); const end = plus(start, Math.round((N(d.months) || 3) * 30.4) - 1);
      c.kind = 'episode'; c.sub = '요일반'; c.days = (d.wdays || []).slice(); c.time = { from: d.from || '', to: d.to || '' }; c.start = start; c.end = end;
      c.grade = d.grade || ''; c.cat = d.subject || c.cat || ''; c.billing = { cycle: 'month', price: N(d.price) };
      try { if (typeof W2 !== 'undefined' && W2.genWeekly) { c.sessions = W2.genWeekly(start, end, c.days, c.time.from, c.time.to).slice(0, 100); const WP = (d.weekPlan || []).map(w => String(w.title || '').trim()).filter(Boolean); c.sessions.forEach((x, i) => { if (WP[i]) x.title = CF.sessTitle ? CF.sessTitle(i + 1, WP[i], '회차') : `${i + 1}회차 ${WP[i]}`.slice(0, 80); }); c.curriculum = (c.curriculum || []).filter(it => it.type !== 'offline'); c.att = c.att || {}; c.attT = c.attT || {}; if (W2.renum) W2.renum(c); if (W2.period) W2.period(c); if (W2.sync) W2.sync(c); } } catch (e) { console.error(e); }
      c.hours = Math.round(((c.sessions && c.sessions.length) || Math.min(100, sessCount(Object.assign({}, d, { start })))) * (minsOf(c.time.from, c.time.to) || 90) / 60);
      return c;
    }
  };
  const minsOf = (a, b) => { if (!/^\d{1,2}:\d{2}$/.test(a || '') || !/^\d{1,2}:\d{2}$/.test(b || '')) return 0; const f = s => s.split(':').map(Number).reduce((h, m) => h * 60 + m); return f(b) - f(a); };
  const addMin = (a, m) => { const [h, mm] = String(a || '16:00').split(':').map(Number); const t = Math.min(23 * 60 + 59, h * 60 + mm + m); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const sessCount = d => { const days = d.wdays || []; if (!days.length) return 0; const n = Math.round((N(d.months) || 3) * 30.4); const s = new Date((d.start || td()) + 'T00:00:00'); let k = 0; for (let i = 0; i < n; i++) { const x = new Date(s); x.setDate(s.getDate() + i); if (days.includes(x.getDay())) k++; } return k; };
  const gradeName = g => ({ e1: '초등 1~3', e4: '초등 4~6', m1: '중1', m2: '중2', m3: '중3', h1: '고1', h2: '고2', h3: '고3' }[g] || '—');

  /* ───────── 대학(라이트): 주차 · 차시 · 학점 ───────── */
  const uMin = d => d.umin === 'custom' ? Math.max(10, Math.min(300, N(d.uminN) || 50)) : (N(d.umin) || 50); /* 1차시 길이(분) */
  const uHrs = d => Math.round((N(d.sessions) || 15) * (N(d.per) || 3) * uMin(d) / 50 * 10) / 10; /* 인정 시간: 대학 1시간 = 50분 수업 */
  CF.cfg.univ = {
    label: '대학 교과목', unit: () => '주차',
    terms: { cls: '교과목', unit: '주차', fee: '수강료', target: '대상 학생' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepNow: { basic: '교과목 이름과 대상 학생을 적습니다. 아래 예시를 누르면 칸이 채워집니다.', outline: '주차 수와 학점을 고르면 주차 목록이 만들어집니다. 한 주 차시 · 1차시 길이는 학점에 맞춰 채워지고 바꿀 수 있습니다.', setup: '개강일과 공개 범위를 정합니다.' },
    stepTitle: { basic: '교과목 정보', outline: '주차 목록', fill: '주차 자료', setup: '개강 · 공개', open: '확인' },
    ask: {
      basic: [F.name('교과목 이름', '예: AI 리터러시와 글쓰기'), F.target('대상 학생', '예: 1학년 전체 · 간호학과 2학년', true)], /* v36: '구분(교양 · 전공 · 비교과 · 교원 연수)'은 학점 칸을 숨기는 데만 쓰여 목적이 불분명했다 → 없애고 학점 칸에 '학점 없음(비교과 · 연수)'로 */
      /* v36 1-③-3): 학점을 고르면 '한 주 차시'가 학점 기준(1학점 = 주 1시간)으로 맞춰지고, 1차시 길이(50분 기본 · 75분 · 100분 · 직접)도 정한다 */
      outline: [{ k: 'sessions', label: '주차 수', kind: 'choice', ex: '예: 15주(한 학기) · 비교과는 4주', def: 15, opts: [[4, '4주'], [8, '8주'], [15, '15주(한 학기)'], [16, '16주']] }, { k: 'credit', label: '학점', kind: 'choice', ex: '예: 3학점(전공 · 교양) · 비교과 프로그램과 교원 연수는 학점 없음', def: 3, opts: [[0, '학점 없음', '비교과 · 연수'], [1, '1학점'], [2, '2학점'], [3, '3학점']] }, { k: 'per', label: '한 주 차시', kind: 'choice', ex: '학점을 고르면 학점 기준(1학점 = 주 1차시)으로 맞춰집니다. 바꿔도 됩니다.', def: 3, opts: [[1, '1차시'], [2, '2차시'], [3, '3차시'], [4, '4차시']] }, { k: 'umin', label: '1차시 길이', kind: 'choice', ex: '예: 50분(대학 1시간 수업) · 75분 수업은 1.5시간으로 셉니다', def: 50, opts: [[50, '50분', '대학 1시간(기본)'], [75, '75분', '1시간 30분 수업'], [100, '100분', '2시간 연강'], ['custom', '직접 적기', '분 단위']] }, { k: 'uminN', label: '1차시 길이(분)', kind: 'num', min: 10, max: 300, unit: '분', def: 60, ex: '예: 90', show: d => d.umin === 'custom' }],
      setup: [F.start('수강 시작일(개강일)'), { k: 'uend', label: '수강 끝나는 날', kind: 'choice', def: 'auto', opts: [['auto', '주차 수에 맞춰', '개강일부터 주차 수만큼'], ['custom', '직접 정하기', '학기 종료일(종강일)']], ex: '예: 기말고사 주 금요일까지' }, { k: 'endD', sub: 'uend', label: '종강일(수강 끝나는 날)', kind: 'date', ex: '예: 2026-12-18 — 이 날 밤 12시까지 들을 수 있습니다', show: d => d.uend === 'custom' }, { k: 'openTo', label: '누가 볼 수 있나요', kind: 'choice', ex: '예: 우리 학교 학생만', def: 'member', opts: [['member', '우리 학교 학생만'], ['all', '누구나']], later: true }]
    },
    defaults: { sessions: 15, per: 3, credit: 3, mins: 50, umin: 50, price: 0, openTo: 'member', uend: 'auto' },
    onSet: (k, v, d) => { if (k === 'per') d._perSet = 1; if (k === 'sessions') d._sessSet = 1; if (k === 'credit') d._crSet = 1; if (k === 'credit' && !d._perSet) d.per = Math.max(1, Math.min(4, N(v) || 1)); },
    /* v38 U-2 · U-6: 이름에 비교과 · 특강 · 연수 · 클리닉 · 워크숍 · 캠프가 있으면 4주 · 학점 없음 · 주 1차시로 시작(15주 · 3학점 · 45시간으로 채우던 문제). 직접 고른 값 · 대화로 말한 주 수 · 템플릿은 그대로 */
    onNext: (id, d) => { if (id !== 'basic' || d._sessSet || d._crSet || d.tpl || (d.weekPlan || []).length) return; if (!/(비교과|특강|연수|클리닉|워크숍|워크샵|캠프|세미나|부트캠프)/.test(String(d.name || '') + ' ' + String(d.target || ''))) return; if (N(d.sessions) === 15) d.sessions = 4; d.credit = 0; if (!d._perSet) d.per = 1; },
    totLine: d => { const w = N(d.sessions) || 15, per = N(d.per) || 3, m = uMin(d); const cr = N(d.credit); return `주당 ${per}차시 × ${m}분 = <b>주 ${hm(per * m)}</b> · ${w}주 합계 <b>${uHrs(d)}시간</b>(대학 1시간 = 50분 수업 기준)${cr ? ` · ${cr}학점 기준 ${cr * 15}시간` : ''}`; },
    required: ['name', 'sessions'],
    examples: { name: '예: AI 리터러시와 글쓰기', sessions: '예: 15주' },
    templates: [
      { id: 'u-ai-lit', name: '교양 AI 리터러시', icon: 'spark', desc: '15주 · 주 2차시 · 2학점', prefill: { name: 'AI 리터러시와 글쓰기', sessions: 15, per: 2, credit: 2, target: '1학년 전체' } },
      { id: 'u-prog', name: '전공 기초 프로그래밍', icon: 'doc', desc: '15주 · 주 3차시 · 3학점', prefill: { name: '파이썬 프로그래밍 기초', sessions: 15, per: 3, credit: 3, target: '컴퓨터공학과 1학년' } },
      { id: 'u-capstone', name: '캡스톤디자인', icon: 'edit', desc: '15주 · 주 3차시 · 3학점', prefill: { name: '캡스톤디자인', sessions: 15, per: 3, credit: 3, target: '공과대학 4학년' } },
      { id: 'u-data', name: '데이터 분석 기초', icon: 'chart', desc: '16주 · 주 3차시 · 3학점', prefill: { name: '데이터 분석 기초', sessions: 16, per: 3, credit: 3, target: '경영학과 2학년' } },
      { id: 'u-md', name: '마이크로디그리 과목', icon: 'award', desc: '8주 · 주 2차시 · 1학점', prefill: { name: '스마트제조 데이터 분석(마이크로디그리)', sessions: 8, per: 2, credit: 1, target: '공유대학 참여 학생' } },
      { id: 'u-career', name: '비교과 취업 특강', icon: 'users', desc: '4주 · 학점 없음', prefill: { name: '취업 준비 — 자기소개서와 AI 모의면접', sessions: 4, per: 1, credit: 0, target: '3~4학년' } },
      { id: 'u-fresh', name: '신입생 대학 생활 적응', icon: 'univ', desc: '4주 · 학점 없음 · 비교과', prefill: { name: '신입생 대학 생활과 공부법', sessions: 4, per: 1, credit: 0, target: '신입생 전체' } },
      { id: 'u-faculty', name: '교원 AI 수업 연수', icon: 'book', desc: '4주 · 학점 없음 · 교수 대상', prefill: { name: '교수를 위한 생성형 AI 수업 설계', sessions: 4, per: 1, credit: 0, target: '전임 · 비전임 교원' } }
    ],
    plan: d => ({ weeks: N(d.sessions) || 15, per: N(d.per) || 3, mins: uMin(d), hours: uHrs(d), univ: true }),
    check: d => {
      const R = []; const h = uHrs(d); const cr = N(d.credit);
      if (cr && h < cr * 15) R.push({ lv: 'warn', k: 'per', msg: `${cr}학점은 보통 ${cr * 15}시간(1학점 15시간) 이상입니다. 지금은 ${h}시간입니다.`, law: '고등교육법 시행령 제14조', fix: { sessions: 15, per: Math.max(cr, N(d.per)) } });
      return R;
    },
    summary: d => [['구성', `${N(d.sessions) || 15}주 × 주 ${N(d.per) || 3}차시(1차시 ${uMin(d)}분) = ${uHrs(d)}시간`], ...(d.start || (d.uend === 'custom' && d.endD) ? [['수강 기간', `${d.start || '개설일'} ~ ${d.uend === 'custom' && d.endD ? d.endD : d.start ? plus(d.start, (N(d.sessions) || 15) * 7 - 1) : `${N(d.sessions) || 15}주 뒤`}`]] : []), ['학점', N(d.credit) ? N(d.credit) + '학점' : '학점 없음(비교과 · 연수)'], ['대상', d.target || '나중에 입력']],
    apply: (c, d) => { baseApply(c, Object.assign({}, d, { sessions: 0, mins: uMin(d) })); const w = N(d.sessions) || 15; c.credit = N(d.credit) || 0; c.hours = uHrs(d); c.perWeek = N(d.per) || 3; c.sessMin = uMin(d); { const st0 = d.start || c.start || td(); c.start = st0; c.end = plus(st0, w * 7 - 1); c.period = Object.assign({}, c.period || {}, { mode: 'range', start: st0, end: c.end, days: w * 7 }); } /* v38 U-6: 개강일을 비워도 수강 기간은 주차 수만큼(예전에는 '신청 후 90일'로 저장) */ if (d.uend === 'custom' && d.endD) { c.start = c.start || d.start || td(); c.end = d.endD; c.period = Object.assign({}, c.period || {}, { mode: 'range', start: c.start, end: d.endD }); } if (d.openTo === 'member') c.open = c.open === '전체' ? '회원' : c.open; return c; }
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
    stepNow: { setup: '수강료 · 수강 기간 · 수료 기준을 정합니다. 무료면 수강료를 0 그대로 둡니다.' },
    stepTitle: { basic: '강좌 정보', outline: '차시 목록', fill: '차시 채우기', setup: '수강 설정', open: '확인' },
    ask: {
      basic: [F.name('강좌 이름', '예: 컴활 1급 실기 한 달 완성'), F.target('누구에게', '예: 취업 준비생 · 엑셀 초보 직장인', true)],
      outline: [F.sessions('차시 수', '예: 12차시', 10, 60), F.mins('1차시 길이', '예: 30분(온라인 영상) · 2시간(교실 수업)', 30)],
      setup: [F.price('수강료', '예: 99,000원 · 무료면 0', 0, true), { k: 'days', label: '수강 기간', kind: 'choice', ex: '예: 결제 후 90일', def: 90, opts: [[30, '30일'], [60, '60일'], [90, '90일'], [180, '180일'], [365, '1년'], ['custom', '직접 정하기', '날짜 · 일수']] }, F.cap('예: 20명(교실 수업일 때)')]
    },
    defaults: { sessions: 10, mins: 30, price: 0, days: 90, cap: 0 },
    required: ['name', 'sessions'],
    examples: { name: '예: 컴활 1급 실기 한 달 완성', price: '예: 99,000원' },
    templates: [
      { id: 'a-comp', name: '컴활 1급 실기', icon: 'award', desc: '자격증 · 12차시 · 60일', prefill: { name: '컴퓨터활용능력 1급 실기 한 달 완성', target: '자격증 준비생', sessions: 12, mins: 50, days: 60 } },
      { id: 'a-realtor', name: '공인중개사 1차 이론', icon: 'book', desc: '자격증 · 40차시 · 180일', prefill: { name: '공인중개사 1차 기본 이론', target: '공인중개사 시험 준비생', sessions: 40, mins: 50, days: 180 } },
      { id: 'a-toeic', name: '토익 700 단기', icon: 'chat', desc: '어학 · 20차시 · 90일', prefill: { name: '토익 700 단기 완성', target: '토익 첫 응시자', sessions: 20, mins: 30, days: 90 } },
      { id: 'a-excel', name: '직장인 엑셀 실무', icon: 'chart', desc: '실무 · 8차시 · 30일', prefill: { name: '바로 쓰는 직장인 엑셀 실무', target: '사무직 직장인', sessions: 8, mins: 30, days: 30 } },
      { id: 'a-gpt', name: 'ChatGPT 업무 활용', icon: 'spark', desc: 'AI · 6차시 · 30일', prefill: { name: 'ChatGPT 업무 활용 입문', target: 'AI를 처음 쓰는 직장인', sessions: 6, mins: 30, days: 30 } },
      { id: 'a-py', name: '파이썬 입문', icon: 'doc', desc: '코딩 · 10차시 · 90일', prefill: { name: '비전공자를 위한 파이썬 입문', target: '코딩 처음인 성인', sessions: 10, mins: 50, days: 90 } },
      { id: 'a-hobby', name: '취미 원데이 클래스', icon: 'edit', desc: '취미 · 1차시 · 교실', prefill: { name: '캘리그라피 원데이 클래스', target: '취미로 배우고 싶은 분', sessions: 1, mins: 120, days: 30, cap: 10 } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 10), per: 1, mins: N(d.mins) || 30, hours: Math.round(totalMin(d) / 60) }),
    check: d => { const R = []; if (N(d.sessions) > 60) R.push({ lv: 'stop', k: 'sessions', msg: '차시는 60개까지 만들 수 있습니다.', fix: { sessions: 60 } }); return R; },
    summary: d => [['구성', hoursLine(d) || '—'], ['수강료', N(d.price) ? wn(d.price) : '무료'], ['수강 기간', `결제 후 ${N(d.days) || 90}일`]],
    apply: (c, d) => { baseApply(c, d); c.kind = 'period'; c.period = Object.assign({}, c.period || {}, { mode: 'days', days: N(d.days) || 90 }); return c; }
  };

  /* ───────── 공공기관: 모집 · 대상 · 정원 · 법정/직무 ───────── */
  CF.cfg.public = {
    label: '공공 교육과정', unit: () => '차시',
    terms: { cls: '교육과정', unit: '차시', fee: '교육비', target: '교육 대상' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepNow: { basic: '교육 이름을 적고 법정 의무교육인지 고릅니다.', setup: '신청 받는 기간 · 정원 · 이수 기준을 정합니다.' },
    stepTitle: { basic: '교육 정보', outline: '차시 목록', fill: '차시 채우기', setup: '모집 · 이수', open: '확인' },
    ask: {
      basic: [F.name('교육과정 이름', '예: 2026 하반기 4대 폭력예방 통합교육'), { k: 'cat', label: '법정 의무교육인가요', kind: 'choice', ex: '예: 4대 폭력예방 · 청렴교육은 법정 의무교육입니다', def: 'job', hint: "'예'를 고르면 이수 기준을 진도 100%로 두고, 법정의무교육 메뉴에서 미이수자를 따로 관리합니다.", opts: [['legal', '예, 법정 의무교육', '법으로 정해진 연간 필수 교육'], ['job', '아니요', '직무 · 신규 임용자 · 리더십 등']] }, F.target('교육 대상', '예: 전 직원 · 7급 이하 · 신규 임용자', true)],
      outline: [F.sessions('차시 수', '예: 4차시', 4, 40), F.mins('1차시 길이', '예: 30분 · 1시간', 60)],
      setup: [{ k: 'rdays', label: '신청 받는 기간', kind: 'choice', ex: '예: 오늘부터 2주(마감 뒤에는 신청이 닫혀요)', def: 0, opts: [[0, '바로 · 계속 받기'], [7, '1주'], [14, '2주'], [30, '한 달'], ['custom', '직접 정하기', '시작 · 마감 날짜']], later: true }, F.cap('예: 기수당 40명'), { k: 'rate', label: '이수 기준(진도)', kind: 'choice', ex: '예: 진도 80% 이상', def: 80, opts: [[60, '60% 이상'], [80, '80% 이상'], [100, '100%(모두 시청)']] }]
    },
    defaults: { cat: 'job', sessions: 4, mins: 60, rate: 80, cap: 0, price: 0 },
    required: ['name', 'cat'],
    examples: { name: '예: 2026 하반기 4대 폭력예방 통합교육', cap: '예: 기수당 40명' },
    templates: [
      { id: 'p-4v', name: '4대 폭력예방 통합교육', icon: 'lock', desc: '법정 · 4차시 · 연 1회', prefill: { name: '4대 폭력예방 통합교육', cat: 'legal', target: '전 직원', sessions: 4, mins: 60, rate: 100 } },
      { id: 'p-anti', name: '청렴 · 반부패 교육', icon: 'public', desc: '법정 · 2차시', prefill: { name: '청렴 · 반부패 교육', cat: 'legal', target: '전 직원', sessions: 2, mins: 60, rate: 100 } },
      { id: 'p-new', name: '신규 임용자 기본교육', icon: 'users', desc: '신규 · 10차시 · 기수 운영', prefill: { name: '신규 임용자 기본교육', cat: 'job', target: '올해 신규 임용자', sessions: 10, mins: 60, cap: 40, rate: 80 } },
      { id: 'p-ai', name: '생성형 AI 행정 활용', icon: 'spark', desc: '직무 · 6차시', prefill: { name: '생성형 AI 행정 업무 활용', cat: 'job', target: '행정직 전 직급', sessions: 6, mins: 50, rate: 80 } },
      { id: 'p-civil', name: '적극행정 · 민원응대', icon: 'chat', desc: '직무 · 4차시 · 정원 30명', prefill: { name: '적극행정 · 민원응대 실무', cat: 'job', target: '민원 담당 공무원', sessions: 4, mins: 60, cap: 30, rate: 80 } },
      { id: 'p-data', name: '공공데이터 분석 실무', icon: 'chart', desc: '직무 · 8차시', prefill: { name: '공공데이터 분석 실무', cat: 'job', target: '정책 · 기획 담당자', sessions: 8, mins: 50, rate: 80 } },
      { id: 'p-digital', name: '주민 디지털 배움터', icon: 'building', desc: '주민 · 6차시 · 정원 20명', prefill: { name: '주민 디지털 배움터 — 스마트폰 · 키오스크', cat: 'job', target: '디지털이 낯선 주민', sessions: 6, mins: 60, cap: 20, rate: 80 } },
      { id: 'p-lead', name: '신임 관리자 리더십', icon: 'award', desc: '리더십 · 5차시', prefill: { name: '신임 관리자 리더십 과정', cat: 'job', target: '신임 5급 · 팀장', sessions: 5, mins: 60, rate: 80 } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 4), per: 1, mins: N(d.mins) || 60, hours: Math.round(totalMin(d) / 60) }),
    check: d => {
      const R = [];
      if (d.cat === 'legal') { R.push({ lv: 'info', k: 'cat', msg: '법정 의무교육은 대상자 전원의 이수 기록이 필요합니다. 이수 기준을 진도 100%로 두는 것을 권합니다.' }); if (N(d.rate) < 80) R.push({ lv: 'warn', k: 'rate', msg: '법정 의무교육의 이수 기준이 낮습니다.', fix: { rate: 100 } }); }
      if (N(d.rdays) && !N(d.cap)) R.push({ lv: 'info', k: 'cap', msg: '기간을 정해 모집할 때는 정원도 적어 두면 마감 관리가 쉽습니다.' });
      return R;
    },
    summary: d => [['법정 의무교육', d.cat === 'legal' ? '예(진도 100% · 미이수자 관리)' : '아니요'], ['구성', hoursLine(d) || '—'], ['모집', N(d.rdays) ? `오늘부터 ${N(d.rdays)}일` : '바로 · 계속 받기'], ['정원', N(d.cap) ? N(d.cap) + '명' : '제한 없음'], ['이수 기준', `진도 ${N(d.rate) || 80}% 이상`]],
    apply: (c, d) => { baseApply(c, d); c.legal = d.cat === 'legal'; /* c.cat은 카테고리(S.cats) id 칸이라 이름을 넣지 않는다(v36) */ crit(c, d.cat === 'legal' ? { video: 100, exam: 0, assign: 0, threshold: N(d.rate) || 100 } : { threshold: N(d.rate) || 80 });
      if (N(d.rdays)) { c.recruit = c.recruit || { on: false, cap: 0, from: '', to: '', early: { on: false, until: '', rate: 0 } }; Object.assign(c.recruit, { on: true, from: td(), to: plus(td(), N(d.rdays) - 1) }); } return c; }
  };

  /* ───────── 평생교육원: 30시간 · 학점은행 · 학습비 ───────── */
  CF.cfg.lifelong = {
    label: '평생교육 강좌', unit: () => '차시',
    terms: { cls: '강좌', unit: '차시', fee: '학습비', target: '학습 대상' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepNow: { outline: '차시 수와 1차시 길이를 고릅니다. 학습비를 받으면 합계 30시간 이상이 필요합니다.', setup: '학습비 · 수강 기간 · 수료 기준을 정합니다. 무료면 학습비를 0 그대로 둡니다.' },
    stepTitle: { basic: '강좌 정보', outline: '차시 · 시간', fill: '차시 채우기', setup: '수강 설정', open: '확인' },
    ask: {
      basic: [F.name('강좌 이름', '예: 시니어를 위한 스마트폰 활용'), F.target('누구에게', '예: 60세 이상 지역 주민', true), { k: 'cb', label: '학점은행 과목인가요', kind: 'toggle', ex: '예: 사회복지학개론처럼 학점이 인정되는 과목이면 켭니다', def: false }],
      outline: [F.sessions('차시 수', '예: 15차시', 15, 60), F.mins('1차시 길이', '예: 2시간(교실) · 50분(온라인)', 120), { k: 'credit', label: '인정 학점', kind: 'choice', ex: '예: 3학점', def: 3, opts: [[1, '1학점'], [2, '2학점'], [3, '3학점']], show: d => !!d.cb }],
      setup: [F.price('학습비', '예: 120,000원 · 무료면 0', 0, true), F.cap('예: 20명'), F.start('개강일')]
    },
    defaults: { sessions: 15, mins: 120, price: 0, cap: 0, cb: false, credit: 3 },
    required: ['name', 'sessions', 'mins'],
    examples: { name: '예: 시니어를 위한 스마트폰 활용', price: '예: 120,000원' },
    templates: [
      { id: 'l-phone', name: '시니어 스마트폰 활용', icon: 'chat', desc: '무료 · 10차시 · 교실', prefill: { name: '시니어를 위한 스마트폰 활용', target: '60세 이상 지역 주민', sessions: 10, mins: 120, price: 0, cap: 20 } },
      /* v38 L-9: '유료' 템플릿은 학습비 예시를 채운다(0원 무료로 개설되던 문제) — 기관 기준에 맞게 고치면 된다 */
      { id: 'l-barista', name: '바리스타 자격 준비', icon: 'award', desc: '유료 · 15차시 · 30시간', prefill: { name: '바리스타 2급 자격 준비', target: '창업 · 취업 준비 성인', sessions: 15, mins: 120, cap: 12, price: 180000 } },
      { id: 'l-cb-sw', name: '사회복지학개론(학점은행)', icon: 'book', desc: '3학점 · 15차시 · 온라인', prefill: { name: '사회복지학개론', target: '학점은행제 학습자', cb: true, credit: 3, sessions: 15, mins: 180 } },
      { id: 'l-human', name: '인문학 교양 강좌', icon: 'doc', desc: '유료 · 10차시 · 30시간', prefill: { name: '고전으로 읽는 인문학', target: '지역 주민', sessions: 10, mins: 180, cap: 30, price: 90000 } },
      { id: 'l-paint', name: '수채화 취미반', icon: 'edit', desc: '유료 · 15차시 · 30시간', prefill: { name: '처음 배우는 수채화', target: '그림이 처음인 성인', sessions: 15, mins: 120, cap: 15, price: 150000 } },
      { id: 'l-eng', name: '생활 영어 회화', icon: 'chat', desc: '유료 · 15차시 · 30시간', prefill: { name: '여행에서 바로 쓰는 생활 영어 회화', target: '영어를 다시 시작하는 성인', sessions: 15, mins: 120, cap: 20, price: 120000 } },
      { id: 'l-town', name: '우리 동네 역사 탐방', icon: 'building', desc: '무료 · 6차시 · 현장 답사', prefill: { name: '우리 동네 역사 탐방', target: '지역 주민 · 가족', sessions: 6, mins: 120, price: 0, cap: 25 } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 15), per: 1, mins: N(d.mins) || 120, hours: Math.round(totalMin(d) / 60) }),
    check: d => {
      const R = []; const h = totalMin(d) / 60;
      if (N(d.price) > 0 && h < 30) R.push({ lv: 'warn', k: 'sessions', msg: `학습비를 받는 강좌는 30시간 이상이 원격 평생교육시설 신고 기준입니다. 지금은 ${hm(totalMin(d))}입니다.`, law: '평생교육법 시행령 제48조', fix: { sessions: Math.ceil(30 * 60 / Math.max(1, N(d.mins) || 120)) } });
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
    stepNow: { basic: '훈련과정 이름과 지원 방식 · 훈련 방식을 고릅니다.', outline: '총 훈련시간을 적거나, 차시 수와 차시 인정 시간을 고릅니다. 원격은 합계 4시간 이상이어야 합니다.', setup: '훈련 시작일을 정합니다. 심사과정코드 · 훈련과정 ID(고용24)는 받은 뒤 넣어도 됩니다.' },
    stepTitle: { basic: '훈련과정 정보', outline: '훈련시간', fill: '차시 채우기', setup: '심사 정보', open: '규정 확인' },
    ask: {
      basic: [F.name('훈련과정 이름', '예: 웹 개발 기초(내일배움카드)'), { k: 'emp', label: '누가 훈련비를 지원받나요', kind: 'choice', ex: '예: 내일배움카드 — 고용24(HRD-Net) 보고 서식이 이 값으로 정해집니다', def: '3', opts: [['3', '내일배움카드', '개인이 카드로 신청'], ['1', '사업주 훈련', '회사가 직원을 보내고 환급'], ['4', '둘 다', '카드 · 사업주 공통']] }, { k: 'mode', label: '훈련 방식', kind: 'choice', ex: '예: 원격(인터넷) — 집에서 영상으로', def: 'remote', opts: Object.entries(VMODE) }],
      /* 총 훈련시간(시간)을 적으면 차시 수 · 차시 인정 시간을 맞춘다(crs-flow applyFit). 차시는 60개까지라 집체 · 혼합은 1차시를 하루 단위까지 길게 고를 수 있다 — 평가 2회차 1번 */
      outline: [{ k: 'totalH', label: '총 훈련시간', kind: 'num', min: 1, max: 2000, unit: '시간', later: true, ex: '예: 114 — 적고 [다음]을 누르면 차시 수와 차시 인정 시간을 맞춰 드립니다', hint: '지금 차시 수 × 차시 인정 시간의 합계가 보입니다. 고쳐 쓰면 거꾸로 맞춥니다.' },
        F.sessions('차시 수', '예: 16차시(원격은 하루 8차시까지 수강) · 최대 60차시', 16, 60),
        { k: 'mins', label: '차시 인정 시간', kind: 'choice', ex: '예: 30분 — 심사 받은 차시별 학습시간과 같게', def: 30, opts: [[25, '25분'], [30, '30분'], [50, '50분'], [60, '1시간']], show: d => (d.mode || 'remote') === 'remote' },
        { k: 'mins', label: '1차시 시간', kind: 'choice', ex: '예: 3시간 — 실기 · 실습은 반나절(4시간)이나 하루(8시간)로 묶어도 됩니다', def: 30, opts: [[50, '50분'], [60, '1시간'], [120, '2시간'], [180, '3시간'], [240, '4시간'], [480, '8시간(하루)']], show: d => (d.mode || 'remote') !== 'remote' }],
      setup: [F.start('훈련 시작일'), { k: 'simsa', label: '심사과정코드', kind: 'code', len: 20, ex: '예: 심사 통과 후 받은 20자리 코드', hint: '훈련과정 심사를 통과하면 받는 번호입니다. 없으면 나중에 넣어도 됩니다.', later: true }, { k: 'tracse', label: '훈련과정 ID(고용24 · HRD-Net)', kind: 'code', len: 17, ex: '예: 고용24에 등록된 17자리 번호', hint: '고용24(HRD-Net)에 훈련과정을 등록하면 받는 번호입니다. 없으면 나중에 넣어도 됩니다.', later: true }]
    },
    defaults: { emp: '3', mode: 'remote', sessions: 16, mins: 30, price: 0, criteria: { threshold: 80 } },
    required: ['name', 'mode', 'sessions', 'mins'],
    examples: { name: '예: 웹 개발 기초(내일배움카드)', simsa: '예: 20자리', tracse: '예: 17자리' },
    templates: [
      { id: 'v-web', name: 'K-디지털 웹 개발 기초', icon: 'doc', desc: '원격 · 16차시 · 8시간', prefill: { name: '웹 개발 기초(HTML · CSS · JS)', emp: '3', mode: 'remote', sessions: 16, mins: 30, target: '내일배움카드 소지자' } },
      { id: 'v-bigdata', name: '빅데이터 분석 실무', icon: 'chart', desc: '원격 · 40차시 · 40시간', prefill: { name: '파이썬 빅데이터 분석 실무', emp: '3', mode: 'remote', sessions: 40, mins: 60, target: '데이터 직무 취업 준비생' } },
      { id: 'v-care', name: '요양보호사 실기', icon: 'users', desc: '집체 · 법정 114시간', prefill: { name: '요양보호사 실기', emp: '3', mode: 'group', sessions: 38, mins: 180, target: '요양보호사 교육생' } }, /* 법정 114시간(compliance.js LEGALH care-prac) = 38차시 × 3시간 */
      { id: 'v-weld', name: '용접기능사 실기', icon: 'bolt', desc: '집체 · 20차시 · 80시간', prefill: { name: '특수용접기능사 실기', emp: '3', mode: 'group', sessions: 20, mins: 240, target: '용접 직무 취업 희망자' } },
      { id: 'v-excel', name: '사업주 엑셀 데이터 분석', icon: 'chart', desc: '사업주 원격 · 10차시', prefill: { name: '엑셀 데이터 분석 실무', emp: '1', mode: 'remote', sessions: 10, mins: 30, target: '재직자(사업주 훈련)' } },
      { id: 'v-safe', name: '산업안전 관리감독자', icon: 'lock', desc: '혼합 · 법정 16시간', prefill: { name: '산업안전 관리감독자 교육', emp: '1', mode: 'mix', sessions: 16, mins: 60, target: '현장 관리감독자' } },
      { id: 'v-elec', name: '전기기능사 필기', icon: 'award', desc: '원격 · 24차시 · 12시간', prefill: { name: '전기기능사 필기 대비', emp: '3', mode: 'remote', sessions: 24, mins: 30, target: '자격 취득 희망자' } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 16), per: 1, mins: N(d.mins) || 30, hours: Math.round(totalMin(d) / 60) }),
    check: d => {
      const R = []; const P = cplOn() || {}; const online = d.mode !== 'group';
      if (online && totalMin(d) < 240) R.push({ lv: 'warn', k: 'sessions', msg: `원격 훈련과정 분량은 4시간 이상이어야 합니다. 지금은 ${hm(totalMin(d))}입니다.`, law: '사업주 직업능력개발훈련 지원규정 제6조', fix: { sessions: Math.ceil(240 / Math.max(1, N(d.mins) || 30)) } });
      if (online) R.push({ lv: 'info', k: 'sessions', msg: `훈련생은 하루 ${+P.dayChasi || 8}차시까지 수강합니다. 차시 진도는 인정 시간의 ${+P.itemMin || 50}% 이상 학습해야 인정됩니다.`, law: '원격훈련 과정인정요건 체크리스트 19 · 20번' });
      [['simsa', 20, '심사과정코드'], ['tracse', 17, '훈련과정 ID(고용24)']].forEach(([k, n, l]) => { const v = String(d[k] || '').trim(); if (v && v.length !== n) R.push({ lv: 'stop', k, msg: `${josa(l, '은')} ${n}자리입니다. 지금 ${v.length}자리입니다.` }); else if (!v) R.push({ lv: 'info', k, msg: `${josa(l, '은')} 심사 · 등록 뒤에 넣어도 됩니다. 공단 보고 전에는 꼭 넣습니다.` }); });
      R.push({ lv: 'info', k: 'fill', msg: `평가 문항은 출제 수의 ${+P.bank || 3}배 이상 준비합니다. 수료 기준은 진도 ${+P.rate || 80}% 이상 · 평가 ${+P.pass || 60}점 이상입니다.`, law: '별표 1 · 국민내일배움카드 운영규정' });
      return R;
    },
    summary: d => [['훈련비 지원', { 3: '내일배움카드', 1: '사업주 훈련', 4: '카드 · 사업주 공통' }[String(d.emp)] || '내일배움카드'], ['훈련 방식', VMODE[d.mode] || VMODE.remote], ['훈련시간', hoursLine(d) || '—'], ['심사과정코드', d.simsa || '나중에 입력(심사 통과 후 받는 번호)'], ['훈련과정 ID(고용24)', d.tracse || '나중에 입력(고용24 등록 후 받는 번호)']],
    apply: (c, d) => { baseApply(c, d); const P = cplOn() || {}; c.hrd = Object.assign({}, c.hrd || {}, { simsa: String(d.simsa || '').trim().slice(0, 20), tracse: String(d.tracse || '').trim().slice(0, 17), emp: String(d.emp || '3'), mix: d.mode === 'mix' ? '1' : '', goal: (String(c.goal || '').split('\n').map(x => x.replace(/^[-\s\[]*|\]$/g, '').trim()).filter(x => x && !/^교육 목표$/.test(x))[0] || '').slice(0, 100), target: String(d.target || '').slice(0, 100) }); c.trainMode = d.mode || 'remote'; if (d.start) { c.start = d.start; }
      crit(c, { threshold: +P.rate || 80 }); c.cplPass = +P.pass || 60; return c; }
  };

  /* ───────── 기업: 법정/직무 · 대상 부서 · 이수 기준 · 환급 ───────── */
  CF.cfg.corp = {
    label: '사내 교육과정', unit: () => '차시',
    terms: { cls: '교육과정', unit: '차시', fee: '교육비', target: '대상 부서' },
    steps: ['basic', 'outline', 'fill', 'setup', 'open'],
    stepNow: { basic: '교육 이름을 적고 법정 의무교육인지 고릅니다.', setup: '대상 부서와 이수 기간 · 기준을 정합니다.' },
    stepTitle: { basic: '교육 정보', outline: '차시 목록', fill: '차시 채우기', setup: '대상 · 이수', open: '확인' },
    ask: {
      basic: [F.name('교육과정 이름', '예: 2026 직장 내 성희롱 예방교육'), { k: 'cat', label: '법정 의무교육인가요', kind: 'choice', ex: '예: 성희롱 예방 · 개인정보보호 · 산업안전보건교육은 법정 의무교육입니다', def: 'job', hint: "'예'를 고르면 이수 기준을 진도 100%로 두고, 법정의무교육 메뉴에서 미이수자를 따로 관리합니다.", opts: [['legal', '예, 법정 의무교육', '법으로 정해진 연간 필수 교육'], ['job', '아니요', '직무 · 신입 · 리더십 등']] }],
      outline: [F.sessions('차시 수', '예: 3차시', 3, 40), F.mins('1차시 길이', '예: 20~30분(짧을수록 이수율이 높습니다)', 30), { k: 'refund', label: '고용보험 환급(사업주 훈련)', kind: 'toggle', ex: '예: 환급받는 직무교육이면 켭니다', def: false, later: true }],
      setup: [{ k: 'dept', label: '대상 부서', kind: 'text', ex: '예: 전 직원 · 영업본부 · 신입사원', later: true }, { k: 'dur', label: '교육 기간', kind: 'choice', ex: '예: 4주 안에 이수', def: 4, opts: [[1, '1주'], [2, '2주'], [4, '4주'], [8, '8주'], [12, '12주'], [13, '13주(약 90일)'], ['custom', '직접 정하기', '날짜 · 일수']] }, { k: 'rate', label: '이수 기준(진도)', kind: 'choice', ex: '예: 진도 100%', def: 80, opts: [[60, '60% 이상'], [80, '80% 이상'], [100, '100%(모두 시청)']] }]
    },
    defaults: { cat: 'job', sessions: 3, mins: 30, rate: 80, dur: 4, refund: false, price: 0 },
    required: ['name', 'cat'],
    examples: { name: '예: 2026 직장 내 성희롱 예방교육', dept: '예: 전 직원' },
    templates: [
      { id: 'c-harass', name: '직장 내 성희롱 예방', icon: 'lock', desc: '법정 · 연 1회 · 전 직원', prefill: { name: '직장 내 성희롱 예방교육', cat: 'legal', sessions: 2, mins: 30, dept: '전 직원', rate: 100, dur: 4 } },
      { id: 'c-privacy', name: '개인정보보호 교육', icon: 'eye', desc: '법정 · 2차시', prefill: { name: '개인정보보호 교육', cat: 'legal', sessions: 2, mins: 30, dept: '개인정보 취급자', rate: 100, dur: 4 } },
      { id: 'c-disab', name: '장애인 인식개선 교육', icon: 'users', desc: '법정 · 연 1회 · 1시간', prefill: { name: '직장 내 장애인 인식개선 교육', cat: 'legal', sessions: 2, mins: 30, dept: '전 직원', rate: 100, dur: 4 } },
      { id: 'c-safety', name: '산업안전보건 정기교육', icon: 'bolt', desc: '법정 · 분기 · 6차시', prefill: { name: '산업안전보건 정기교육(분기)', cat: 'legal', sessions: 6, mins: 30, dept: '사무직 전 직원', rate: 100, dur: 12 } },
      { id: 'c-ojt', name: '신입사원 OJT', icon: 'users', desc: '온보딩 · 8차시 · 2주', prefill: { name: '신입사원 OJT', cat: 'job', sessions: 8, mins: 30, dept: '신입사원', rate: 80, dur: 2 } },
      { id: 'c-ai', name: '생성형 AI 업무 활용', icon: 'spark', desc: '직무 · 6차시 · 4주', prefill: { name: '생성형 AI 업무 활용', cat: 'job', sessions: 6, mins: 30, dept: '전 직원', rate: 80, dur: 4 } },
      { id: 'c-lead', name: '팀장 리더십', icon: 'building', desc: '리더십 · 6차시', prefill: { name: '신임 팀장 리더십', cat: 'job', sessions: 6, mins: 50, dept: '팀장 · 파트장', rate: 80, dur: 8 } },
      { id: 'c-sales', name: '영업 직무 기본', icon: 'chart', desc: '직무 · 환급 · 8차시', prefill: { name: '영업 직무 기본 과정', cat: 'job', sessions: 8, mins: 30, dept: '영업본부', refund: true, rate: 80, dur: 4 } }
    ],
    plan: d => ({ weeks: Math.min(30, N(d.sessions) || 3), per: 1, mins: N(d.mins) || 30, hours: Math.round(totalMin(d) / 60) }),
    check: d => {
      const R = [];
      if (d.cat === 'legal') { R.push({ lv: 'info', k: 'cat', msg: '법정 의무교육은 해마다 대상자 전원이 이수해야 합니다(예: 성희롱 예방교육 연 1회 이상). 이수 기록은 \'법정\' 표시로 따로 모아 봅니다.', law: '남녀고용평등법 시행령 제3조 등' }); if (N(d.rate) < 100) R.push({ lv: 'warn', k: 'rate', msg: '법정 의무교육은 진도 100%를 권합니다.', fix: { rate: 100 } }); }
      /* v38 이름이 법정 의무교육인데 '아니요'면 묻는다 — 법정의무교육 메뉴 · 마감 안내에서 빠지던 것(QA C1) */
      if (d.cat !== 'legal' && /성희롱|개인정보\s*보호|장애인\s*인식|산업\s*안전|안전\s*보건|직장\s*내\s*괴롭힘|퇴직연금/.test(String(d.name || ''))) R.push({ lv: 'warn', k: 'cat', msg: `「${String(d.name).slice(0, 30)}」은(는) 법정 의무교육으로 보입니다. 법정 의무교육으로 표시하면 법정의무교육 메뉴에서 미이수자 · 마감을 관리할 수 있습니다.`, fix: { cat: 'legal', rate: 100 } });
      if (d.refund) { if (totalMin(d) < 240) R.push({ lv: 'warn', k: 'sessions', msg: `환급받는 원격 교육은 4시간 이상이어야 합니다. 지금은 ${hm(totalMin(d))}입니다.`, law: '사업주 직업능력개발훈련 지원규정 제6조', fix: { sessions: Math.ceil(240 / Math.max(1, N(d.mins) || 30)) } }); R.push({ lv: 'info', k: 'refund', msg: '환급 과정은 심사과정코드 · 훈련과정 ID(고용24에 등록하면 받는 번호)가 필요합니다. 개설 후 \'규정 준수\' 메뉴에서 넣습니다.' }); }
      return R;
    },
    summary: d => [['법정 의무교육', d.cat === 'legal' ? '예(진도 100% · 미이수자 관리)' : '아니요'], ['구성', hoursLine(d) || '—'], ['대상', d.dept || '나중에 배정'], ['기간', `${N(d.dur) || 4}주 안에 이수`], ['이수 기준', `진도 ${N(d.rate) || 80}% 이상`], ['환급', d.refund ? '사업주 훈련(환급)' : '해당 없음']],
    apply: (c, d) => { baseApply(c, d); c.legal = d.cat === 'legal'; if (d.dept) { c.sub = String(d.dept).slice(0, 60); try { const g = (S.groups || []).find(x => x.name === d.dept); if (g) c.group = g.id; } catch (e) { } }
      c.end = plus(c.start || td(), (N(d.dur) || 4) * 7 - 1); c.period = Object.assign({}, c.period || {}, { mode: 'days', days: (N(d.dur) || 4) * 7 }); crit(c, d.cat === 'legal' ? { video: 100, exam: 0, assign: 0, threshold: N(d.rate) || 100 } : { threshold: N(d.rate) || 80 }); if (d.refund) c.hrd = Object.assign({}, c.hrd || {}, { emp: '1' }); return c; }
  };

  /* C1은 cfg.check(d) · summary(d) · apply(c, d)를 바로 부른다 — 비운 칸은 기본값으로 보고 계산하도록 감싼다 */
  const fill = (k, d) => { const g = CF.cfg[k]; const x = JSON.parse(JSON.stringify(d || {})); Object.entries(g.defaults || {}).forEach(([q, v]) => { if (x[q] === undefined || x[q] === '') x[q] = Array.isArray(v) ? v.slice() : v; }); Object.values(g.ask || {}).flat().forEach(f => { if ((x[f.k] === undefined || x[f.k] === '') && f.def !== undefined) x[f.k] = Array.isArray(f.def) ? f.def.slice() : f.def; }); if (x.slot && /^\d\d:\d\d-\d\d:\d\d$/.test(x.slot)) { const [a, b] = x.slot.split('-'); x.from = a; x.to = b; } return x; };
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

  /* ───────── C1 흐름 엔진(crs-flow.js)과 연결 ───────── */
  const curD = () => { try { return CF.isOpen && CF.isOpen() ? CF.draft : null; } catch (e) { return null; } };
  const hasAsk = (g, k) => Object.values(g.ask || {}).flat().some(f => f.k === k);
  /* 학원: 요일 · 기간이 바뀌면 회차 수(최대 60)를 맞추고, 회차 목록이 있으면 길이를 맞춘다 */
  const k12Sync = d => { if (CF.cfgKey() !== 'k12' || !d) return false; if (!d.target || d._tgtAuto) { const t2 = `${gradeName(d.grade || 'm2')} 원생`; if (d.target !== t2) { d.target = t2; d._tgtAuto = 1; } } const x = fill('k12', d); const n = Math.max(1, Math.min(60, sessCount(x))); if (+d.sessions === n) return false; d.sessions = n; const L = d.weekPlan; if (Array.isArray(L) && L.length) { while (L.length > n) L.pop(); if (L.length < n) { let P = []; try { P = CF.planFrom ? CF.planFrom(Object.assign({}, d, { sessions: n })) : []; } catch (e) { } while (L.length < n) L.push({ w: L.length + 1, title: (P[L.length] && P[L.length].title) || `${L.length + 1}회차 수업`, goal: '' }); } } return true; };
  /* 차시 수와 목록 길이 맞추기(안내대로 고치기 · 템플릿으로 수가 바뀐 경우) */
  const planSync = d => { if (!d) return false; const L = d.weekPlan; const n = Math.max(1, Math.min(60, N(d.sessions))); if (!Array.isArray(L) || !L.length || L.length === n) return false; while (L.length > n) L.pop(); let P = []; try { P = CF.planFrom ? CF.planFrom(Object.assign({}, d, { sessions: n })) : []; } catch (e) { } const u = CF.unit ? CF.unit(d) : '차시'; while (L.length < n) L.push({ w: L.length + 1, title: (P[L.length] && P[L.length].title) || `${L.length + 1}${u}`, goal: '' }); return true; };
  /* 유료 여부: 질문이 price 하나인 유형은 금액으로 정한다(C1 기본 paid 선택지 대신) */
  /* 직업훈련: 훈련 방식이 바뀌면 1차시 시간이 그 방식의 선택지 안에 있게 맞춘다(원격 최대 1시간 · 집체 · 혼합은 50분 이상) */
  const vocSync = d => { if (!d || CF.cfgKey() !== 'voc') return false; const m = N(d.mins); const rem = (d.mode || 'remote') === 'remote'; if (rem && m > 60) { d.mins = 60; return true; } if (!rem && m && ![50, 60, 120, 180, 240, 480].includes(m)) { d.mins = 60; return true; } return false; };
  const paidSync = d => { const g = CF.cfgOf(); if (!d || !hasAsk(g, 'price') || hasAsk(g, 'paid')) return; d.paid = N(d.price) > 0; };
  const prep = (d, o) => { if (!d) return; const g = CF.cfgOf(); if (!g || !g.ask) return; const pre = (o && o.prefill) || {};
    if (!(o && o.resume)) { const ds = (g.defaults || {}).sessions; if (ds && pre.sessions == null && pre.weeks == null && !(d.weekPlan || []).length) d.sessions = ds; }
    CF.scnDefaults(d); k12Sync(d); paidSync(d); };
  const hook = () => { if (!CF.on || CF._scnHooked) return; CF._scnHooked = 1;
    CF.on('open', x => { const d = curD(); if (!d) return; prep(d, x); try { CF.saveDraft && CF.saveDraft(); CF.refresh && CF.refresh(); } catch (e) { } });
    CF.on('change', x => { const d = (x && x.d) || curD(); if (!d) return; paidSync(d); if (k12Sync(d)) { try { CF.saveDraft && CF.saveDraft(); CF.refresh && CF.refresh(); } catch (e) { } } });
    CF.on('step', () => { const d = curD(); if (!d) return; CF.scnDefaults(d); paidSync(d); if (k12Sync(d)) { try { CF.refresh && CF.refresh(); } catch (e) { } } });
    /* 단계 제목 · 지금 할 일: 유형 말로 */
    (CF.steps || []).forEach(st => { ['title', 'now'].forEach(m => { const b = st[m]; if (typeof b !== 'function') return; st[m] = d => { try { const g = CF.cfgOf(); const v = (g[m === 'title' ? 'stepTitle' : 'stepNow'] || {})[st.id]; if (v) return typeof v === 'function' ? v(d || {}) : v; } catch (e) { } return b(d); }; }); }); };
  hook(); if (!CF.on) setTimeout(hook, 0);
  /* 학원은 요일 버튼(data-cfday)이 change를 내지 않으므로 누른 뒤 한 번 맞춘다 */
  if (typeof document !== 'undefined') document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-cfday],[data-cftpl],[data-cffix],[data-cfset]'); if (!b) return; setTimeout(() => { const d = curD(); if (!d) return; CF.scnDefaults(d); paidSync(d); if (k12Sync(d) | planSync(d) | vocSync(d)) { try { CF.saveDraft && CF.saveDraft(); CF.refresh && CF.refresh(); } catch (er) { } } }, 0); }, true);
})();
