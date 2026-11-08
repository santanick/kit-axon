/* v34.5 tpl-univ — 유형 디자이너 TU: univ(대학 · 교수학습센터 · 비교과 · 학과 LMS) 템플릿 재배치
   지시: fix6/BRIEF5.md · RULES_B2 '대학 · 학과' 뼈대(사진 첫 화면 → 공지 · 학사일정 → 소식 · 프로그램 → 일정 → 바닥글) · RULES_P(해외 대학 실측)
   - 대상: types[0]이 'univ'인 템플릿 16종(global.js univ-* 4 · tpl-b t2-univ-* 12). 원본 파일은 고치지 않고 id로 찾아 덮어쓴다.
     solo-creator(types[0] adult)는 TA 몫이라 손대지 않는다.
   - 템플릿마다 계열(HPL 12종을 한 번씩) 또는 S3 첫 화면(scrim · box · split · grid 한 번씩)을 써서 16종의 첫 화면 구조가 모두 다르다.
     팔레트 16개 · 첫 화면 사진 16장이 모두 다르고, 테마 8종을 고르게 나눴다.
   - 학과 LMS(S.org.ed === 'lms') 기관도 같은 'univ' 묶음에서 고른다(tplFor(S.org.type)). LMS에 맞는 템플릿은 tp.eds에 'lms'를 넣고
     검색어(장면)에 '학과 LMS'를 붙여 검색으로도 찾게 한다.
   - 사실 원칙: 숫자는 hpt:'facts'(실제 공개 강좌로 셈)만 쓴다. univ-extra의 '운영 프로그램 3'(최소 3으로 올려 잡은 숫자)은 실제 숫자 띠로 바꾼다.
     단계 이름이 '숫자 + 배…'로 읽혀 지어낸 숫자로 오인되는 것('3 배치 시험')은 이름을 바꾼다.
   - tpl-b의 템플릿 장식 CSS(원 · 띠 · 물결 밑줄 등)는 내 템플릿에서 걷어낸다(siteHTML 출력에서 해당 주석 블록만 제거). */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function') return;
  const A = v => Array.isArray(v) ? v : [];
  const ft = () => (S && S.settings && S.settings.footer) || {};
  /* 섹션 열쇠: banner · classes · notices · reviews · map · slideImage · slideBanner · stats(실제 숫자) · <text variant> */
  const keyOf = x => !x ? '' : x.type === 'text' ? (x.data && (x.data.hpt === 'facts' || x.data.variant === 'stats') ? 'stats' : (x.data && x.data.variant) || 'plain') : x.type;
  const T = (variant, data) => ({ type: 'text', data: Object.assign({ variant }, data) });
  const FACTS = () => T('stats', { hpt: 'facts', title: '', cols: [] });
  const NOTICE = (title, eyebrow) => ({ type: 'notices', data: { title, n: 4, eyebrow: eyebrow || 'NOTICE' } });
  const MAP = title => ({ type: 'map', data: { title, eyebrow: 'LOCATION', addr: ft().addr || '', tel: ft().tel || '', hours: '' } });

  /* 템플릿별 설정
     L: 계열(없으면 S3 첫 화면 hk) · th: 테마 · pal: 팔레트 · ph: 사진 [hero, about, space, cta, gallery] · hd: [머리글, 바닥글, 휴대폰 메뉴]
     ck: 신청 띠 · pic: 사진 띠(공간 · 장면 2장)를 넣을 위치(이 열쇠 앞) · cd: 강좌 카드(S2: photo · list · price · schedule · big · table) · ord: 섹션 순서(열쇠) · add: [[이 열쇠 앞에(없으면 끝), 섹션 함수]] · drop: 뺄 열쇠 · ren: [옛 글, 새 글] · eds: 맞는 대학 도입 형태 */
  const CFG = {
    /* 교수학습개발센터: 기관 포털(찾기 · 공지 패널 · 빠른 메뉴) — 국내 대학 센터 표준 */
    't2-univ-ctl': { cd: 'list', L: 'portal', th: 'campus', pal: 'nuri', ph: ['lec-01', 'dsk-03', 'lib-03', 'lib-05', 'lec-02'], hd: ['notice', 'cols', 'full'], ck: 'contact',
      ord: ['banner', 'notices', 'tiles', 'features', 'classes', 'steps', 'cta'] },
    /* 학과 온라인 강의실(LMS): 왼쪽 고정 내비게이션 — 강의실 · 과제 · 출석으로 바로 */
    'univ-lms': { pic: 'timeline', cd: 'table', L: 'sidebar', th: 'official', pal: 'slate', ph: ['lap-05', 'dsk-01', 'cls-01', 'lib-02', 'stu-01'], hd: ['solid', 'min', 'drawer'], ck: 'panel', eds: ['lms'],
      ord: ['banner', 'notices', 'modules', 'classes', 'timeline', 'info', 'cta'],
      add: [['classes', () => NOTICE('수업 공지')], ['cta', () => T('info', { eyebrow: 'FAQ', title: '수강 전에 확인하세요', cols: [['출석 인정', '차시 영상을 끝까지 보고 확인 퀴즈를 풀면 출석으로 기록됩니다'], ['과제 제출', '마감 시각 전까지 강의실에서 파일로 냅니다'], ['시험 응시', '공지된 시간에 강의실 시험 메뉴에서 응시합니다'], ['질문', '교과목 게시판에 남기면 담당 교수 · 조교가 답합니다']] })]] },
    /* 학과 홈페이지: 게시판형 신문 배치(학과 공지 · 학사 일정 우선 · 칠판 교실) */
    't2-univ-dept': { pic: 'timeline', cd: 'schedule', L: 'bulletin', th: 'official', pal: 'oxford', ph: ['cls-04', 'dsk-02', 'lec-03', 'lib-06', 'lib-03'], hd: ['notice', 'biz', 'full'], ck: 'contact', eds: ['lms', 'lite'],
      ord: ['banner', 'notices', 'tiles', 'timeline', 'classes', 'info', 'cta'] },
    /* 교원 교수법 아카데미: 매거진(명조 큰 제목 · 대강당) */
    't2-univ-faculty': { cd: 'big', L: 'editorial', th: 'premium', pal: 'bordeaux', ph: ['lec-02', 'lib-06', 'sem-01', 'mus-07', 'lib-02'], hd: ['solid', 'mega', 'full'], ck: 'panel',
      ord: ['banner', 'features', 'timeline', 'classes', 'info', 'notices', 'cta'] },
    /* 학습지원 · 튜터링: 사진 모자이크(함께 공부하는 손 · 노트) */
    't2-univ-tutor': { cd: 'photo', L: 'mosaic', th: 'warm', pal: 'maple', ph: ['lib-03', 'stu-02', 'dsk-01', 'lib-05', 'dsk-03'], hd: ['float', 'cta', 'drawer'], ck: 'photo',
      ord: ['banner', 'features', 'classes', 'steps', 'reviews', 'notices', 'cta'] },
    /* 글쓰기 · 발표 클리닉: 큰 글자(먹과 종이 · 노트 사진 띠) */
    't2-univ-writing': { pic: 'steps', cd: 'list', L: 'typo', th: 'clean', pal: 'inkpaper', ph: ['lap-04', 'dsk-02', 'lib-01', 'dsk-05', 'dsk-03'], hd: ['solid', 'min', 'full'], ck: 'panel',
      ord: ['banner', 'features', 'info', 'steps', 'classes', 'reviews', 'notices', 'cta'], add: [['cta', () => NOTICE('클리닉 공지')]] },
    /* 진로 · 취업: 좌우 분할(진한 판 + 회의 테이블 사진) */
    't2-univ-career': { cd: 'schedule', L: 'splitscreen', th: 'clean', pal: 'glacier', ph: ['off-02', 'off-04', 'off-05', 'off-07', 'dsk-04'], hd: ['contact', 'cols', 'drawer'], ck: 'contact',
      ord: ['banner', 'timeline', 'stats', 'features', 'classes', 'reviews', 'notices', 'cta'] },
    /* 창업교육센터: 어두운 프리미엄(코드 화면) */
    't2-univ-startup': { pic: 'timeline', cd: 'big', L: 'noir', th: 'tech', pal: 'midnight', ph: ['cod-01', 'dsk-04', 'cod-03', 'cod-04', 'off-06'], hd: ['overlay', 'mega', 'full'], ck: 'photo',
      ord: ['banner', 'steps', 'features', 'classes', 'timeline', 'notices', 'cta'] },
    /* 공개강좌: S3 큰 제목 + 사진 3장 격자 */
    't2-univ-mooc': { cd: 'photo', th: 'clean', pal: 'cobalt', hk: 'grid', ph: ['lec-03', 'lap-02', 'lib-01', 'lib-06', 'stu-01'], hd: ['solid', 'cols', 'full'], ck: 'panel', eds: ['lms', 'lite'],
      ord: ['banner', 'stats', 'classes', 'features', 'steps', 'reviews', 'cta'], add: [['cta', () => NOTICE('강좌 소식', 'NEWS')]] },
    /* 교양 AI · SW: 벤토 격자(강좌 · 숫자 · 사진 칸) */
    't2-univ-ai': { cd: 'table', L: 'bento', th: 'tech', pal: 'graphite', ph: ['cod-02', 'cod-03', 'lap-10', 'cod-04', 'dsk-04'], hd: ['float', 'mega', 'drawer'], ck: 'contact', eds: ['lms', 'lite'],
      ord: ['banner', 'stats', 'steps', 'classes', 'features', 'notices', 'cta'] },
    /* 한국어 교육원 · 국제교류: 이야기 · 단계형(입학 절차가 주인공) */
    't2-univ-intl': { cd: 'schedule', L: 'story', th: 'campus', pal: 'sky', ph: ['cam-03', 'stu-02', 'lib-01', 'lib-05', 'nat-02'], hd: ['solid', 'cta', 'full'], ck: 'photo',
      ord: ['banner', 'steps', 'features', 'classes', 'timeline', 'reviews', 'notices', 'cta'], add: [['cta', () => NOTICE('입학 · 학사 공지')]],
      ren: [['배치 시험', '수준 진단']] },
    /* 지역혁신 사업단: 전체 화면 사진(캠퍼스 항공) */
    't2-univ-rise': { cd: 'big', L: 'fullbleed', th: 'campus', pal: 'ivy', ph: ['cam-05', 'nat-02', 'lec-02', 'lib-06', 'arc-03'], hd: ['overlay', 'cols', 'full'], ck: 'photo',
      ord: ['banner', 'features', 'tiles', 'classes', 'timeline', 'notices', 'cta'] },
    /* 대학 부설 평생교육원 · 학점은행: S3 사진 + 겹친 글자 상자 */
    't2-univ-cll': { pic: 'info', cd: 'list', th: 'campus', pal: 'crimson', hk: 'box', ph: ['lib-01', 'lib-06', 'lec-01', 'mus-07', 'lib-04'], hd: ['notice', 'biz', 'full'], ck: 'contact',
      ord: ['banner', 'notices', 'features', 'classes', 'info', 'reviews', 'map'] },
    /* 대학 AI 교육센터: S3 전면 사진 + 스크림(수식 칠판) */
    'univ-aicenter': { pic: 'notices', cd: 'price', th: 'premium', pal: 'harbor', hk: 'scrim', ph: ['brd-01', 'cod-03', 'lec-03', 'cod-04', 'lap-04'], hd: ['overlay', 'cta', 'drawer'], ck: 'photo',
      ord: ['banner', 'steps', 'features', 'notices', 'classes', 'map'],
      add: [['features', () => T('steps', { eyebrow: 'LEARNING JOURNEY', title: '진단에서 배지까지', cols: [['AI 진단', '내 활용 유형을 확인합니다'], ['맞춤 코스', '유형에 맞는 튜토리얼을 듣습니다'], ['실습 과제', '배운 도구로 과제를 냅니다'], ['디지털 배지', '이수 기록이 배지로 남습니다']] })]] },
    /* 비교과 · 역량 포털: 콜라주(모집 중 프로그램 스티커 카드) */
    'univ-extra': { cd: 'photo', L: 'collage', th: 'kids', pal: 'coral', ph: ['lap-02', 'stu-02', 'cls-02', 'lib-05', 'dsk-03'], hd: ['float', 'cta', 'drawer'], ck: 'photo',
      ord: ['banner', 'slideBanner', 'classes', 'stats', 'features', 'timeline', 'notices'],
      rep: { stats: () => FACTS() } },
    /* 대학 시민 강좌: S3 좌우 분할(정원 산책로 · 큰 글씨) */
    'univ-lifelong': { pic: 'classes', cd: 'price', th: 'senior', pal: 'sage', hk: 'split', ph: ['nat-02', 'lib-01', 'lec-01', 'lib-02', 'cam-03'], hd: ['contact', 'cols', 'full'], ck: 'contact',
      ord: ['banner', 'features', 'classes', 'notices', 'reviews', 'map'], add: [['reviews', () => NOTICE('수강 안내 · 공지')]] }
  };

  const SLOT = ['hero', 'about', 'space', 'cta', 'gallery'];
  const MINE = new Set();
  /* ── FD2 eyebrow 한글화(R1 M2 · RULES_B2 5 '영어만 있는 eyebrow 금지'): 영문만 있는 작은 머리말을 한글 라벨로 바꾼다.
     대학은 한영 병기(한글 · ENGLISH)를 허용한다. 사전에 없는 영문 문구는 지운다(빈 eyebrow = 표시 안 함). 한글이 들어 있으면 그대로 둔다. */
  const EB_P = { 'WRITING & PRESENTATION': '글쓰기 · 발표', 'KOREAN LANGUAGE & EXCHANGE': '한국어 · 국제 교류', 'CONTINUING EDUCATION': '평생교육', 'SAFETY & HEALTH': '안전 · 보건', 'NOTICE': '공지', 'NEWS': '소식', 'REVIEWS': '수강 후기', 'COURSES': '강좌', 'CLASSES': '강좌', 'CLASS': '강좌', 'COURSE': '과정', 'GUIDE': '안내', 'ROADMAP': '로드맵',
    'PROGRAMS': '프로그램', 'PROGRAM': '프로그램', 'PROCESS': '진행 순서', 'SCHEDULE': '일정', 'CALENDAR': '일정', 'TIMETABLE': '시간표', 'LOCATION': '오시는 길', 'SUPPORT': '지원',
    'SUBJECTS': '과목', 'LEVEL': '수준별', 'LEVELS': '수준별', 'FIELDS': '분야', 'FIELD': '분야', 'TRACKS': '트랙', 'JOURNEY': '배움의 흐름', 'HOW WE TEACH': '수업 방식',
    'HOW TO': '이용 방법', 'HOW TO JOIN': '참여 방법', 'HOW IT WORKS': '이용 방법', 'FAQ': '자주 묻는 질문', 'CONTACT': '문의', 'CERTIFICATION': '자격', 'CERTIFICATE': '수료',
    'WHY': '특징', 'WHY US': '특징', 'WHO': '대상', 'FOR WHOM': '대상', 'WHAT WE DO': '하는 일', 'TOPICS': '주제', 'THEMES': '주제', 'THIS MONTH': '이달의 일정', 'THIS WEEK': '이번 주',
    'THIS TERM': '이번 학기', 'THIS SEMESTER': '이번 학기', 'THIS SEASON': '이번 시즌', 'STORIES': '이야기', 'SKILLS': '역량', 'SHORTCUT': '바로가기', 'QUICK MENU': '바로가기',
    'POPULAR': '인기 강좌', 'NOW OPEN': '모집 중', 'OPEN': '모집 중', 'RECRUITING': '모집 중', 'MODULES': '구성', 'FLOW': '진행 순서', 'STEPS': '단계', 'STAGES': '단계', 'CURRICULUM': '커리큘럼',
    'CHECK': '확인', 'CATEGORY': '분야', 'CARE': '관리', 'ABOUT': '소개', 'WELCOME': '환영합니다', 'APPLY': '신청', 'ENROLL': '수강신청', 'REGISTRATION': '신청', 'INQUIRY': '문의',
    'DRILL': '훈련 기록', 'WORKSHOP': '워크숍', 'WORKSHOPS': '워크숍', 'VALUES': '가치', 'STRATEGY': '전략', 'RESOURCES': '자료실', 'TESTS': '평가', 'TEST PREP': '시험 준비',
    'ELIGIBILITY': '신청 자격', 'WHAT TO BRING': '준비물', 'RULES': '이용 규칙', 'TERMS': '이용 안내', 'FEATURED': '추천', 'PARTNER': '협력', 'COMMUNITY': '커뮤니티', 'STUDIO': '스튜디오',
    'START': '시작하기', 'NEXT': '다음 단계', 'METHOD': '수업 방식', 'FORMAT': '운영 방식', 'SYSTEM': '운영 방식', 'ROUTINE': '학습 루틴', 'PATH': '경로', 'PATHS': '경로', 'ROUTE': '경로',
    'PILLARS': '핵심 축', 'CORE': '핵심', 'FOCUS': '중점', 'HELP': '도움말', 'MENU': '메뉴', 'DEPARTMENTS': '학과', 'MAJORS': '전공', 'SCHOOLS': '학교', 'CHALLENGE': '도전 과제', 'SHARING': '나눔' };
  const EB_W = { 'YOUTH': '청소년', 'CAREER': '진로', 'TRAINING': '교육', 'EDUCATION': '교육', 'PROGRAM': '프로그램', 'PROGRAMS': '프로그램', 'ACADEMY': '아카데미', 'CENTER': '센터', 'SCHOOL': '학교',
    'CLUB': '동아리', 'SPORTS': '스포츠', 'SPEAKING': '말하기', 'WRITING': '글쓰기', 'READING': '독서', 'MATH': '수학', 'SCIENCE': '과학', 'MUSIC': '음악', 'ART': '미술', 'CODING': '코딩',
    'DIGITAL': '디지털', 'DATA': '데이터', 'AI': 'AI', 'AX': 'AX', 'IT': 'IT', 'ESG': 'ESG', 'ONLINE': '온라인', 'CYBER': '사이버', 'SAFETY': '안전', 'DISASTER': '재난', 'ETHICS': '윤리', 'INTEGRITY': '청렴',
    'GREEN': '녹색', 'CIVIC': '시민', 'CITIZEN': '시민', 'PUBLIC': '공공', 'SERVICE': '서비스', 'LEADERSHIP': '리더십', 'FACULTY': '교원', 'TEACHING': '교수', 'LEARNING': '학습', 'STUDY': '학습',
    'LIFELONG': '평생', 'FAMILY': '가족', 'HEALTH': '건강', 'LANGUAGE': '외국어', 'ENGLISH': '영어', 'KOREAN': '한국어', 'GLOBAL': '글로벌', 'STARTUP': '창업', 'JOB': '취업', 'CERTIFICATE': '자격',
    'LICENSE': '자격', 'EXAM': '시험', 'TEST': '시험', 'PREP': '준비', 'COACHING': '코칭', 'TUTORING': '튜터링', 'WORK': '직무', 'SKILLS': '역량', 'CORPORATE': '기업', 'COMPANY': '기업', 'EMPLOYEE': '임직원',
    'ONBOARDING': '온보딩', 'MANDATORY': '법정', 'CREDIT': '학점', 'BANK': '은행제', 'DEGREE': '학위', 'HUMANITIES': '인문', 'CULTURE': '문화', 'CREATIVE': '창작', 'BOOK': '독서', 'MONEY': '재테크',
    'SMART': '스마트', 'FACTORY': '공장', 'TECHNICAL': '기술', 'VOCATIONAL': '직업', 'REGIONAL': '지역', 'NATIONAL': '국가', 'GOVERNMENT': '행정', 'INNOVATION': '혁신', 'COMMUNITY': '공동체',
    'EXTRACURRICULAR': '비교과', 'EXCHANGE': '교류', 'DEPARTMENT': '학과', 'UNIVERSITY': '대학', 'CAMPUS': '캠퍼스', 'CONTINUING': '평생', 'HANDS-ON': '실습', 'PRACTICE': '실습', 'LAB': '랩',
    'STORE': '매장', 'BRAND': '브랜드', 'CUSTOMER': '고객', 'COHORT': '기수', 'BOOTCAMP': '부트캠프', 'STUDY CARE': '관리형 학습', 'COURSEWARE': '교재', 'CLASSROOM': '강의실', 'LECTURE': '강의',
    'NEW': '새', 'ONE-DAY': '원데이', 'PRIVATE': '1:1', 'GROUP': '그룹', 'COMPETENCY': '역량', 'HUMAN': '인재', 'DEVELOPMENT': '개발', 'ADMISSION': '입시', 'GRADE': '학년', 'PRESENTATION': '발표' };
  const EB = (v, uni) => { const s = String(v == null ? '' : v).trim(); if (!s || /[가-힣]/.test(s) || !/[A-Za-z]/.test(s)) return v;
    const U = s.toUpperCase().replace(/\s+/g, ' '); let ko = EB_P[U];
    if (!ko) { const W = U.split(/\s*(?:&|\/|·|,)\s*|\s+/).filter(Boolean); if (W.length <= 3 && W.every(w => EB_W[w])) ko = W.map(w => EB_W[w]).join(' ').replace(/(교육|학습) \1/g, '$1'); }
    if (!ko) return '';
    return uni ? ko + ' · ' + s : ko; };

  /* ── FD2 유형 간 재배치(R1 H1 · M1, fix6/BRIEF7): 유형마다 주력 계열 5~6개만 쓴다 — 대학 = editorial · portal · story · fullbleed + noir 1(창업) · sidebar 1(학과 LMS) + S3. collage · mosaic · typo · bento · splitscreen · bulletin은 뺀다.
     같은 계열을 다른 유형도 쓰면 변형(layoutVar, FD1 HPL.vars)을 서로 다르게 고른다. 머리글 · 바닥글은 FA의 유형별 허용 목록 안에서 2~3종으로 나눈다.
     [계열 또는 'hk:<S3 첫 화면>', 변형, 머리글, 바닥글] — 휴대폰 메뉴(hd[2])는 그대로 둔다 */
  const FD2 = {
    't2-univ-ctl': ['portal', 'c', 'util', 'campus'],
    'univ-lms': ['sidebar', 'a', 'center', 'min'],
    't2-univ-dept': ['portal', 'a', 'util', 'biz'] /* 어두운 첫 화면: dept · startup 2종 */,
    't2-univ-faculty': ['editorial', 'a', 'center', 'campus'],
    't2-univ-tutor': ['hk:grid', '', 'center', 'min'],
    't2-univ-writing': ['editorial', 'c', 'util', 'min'],
    't2-univ-career': ['hk:split', '', 'center', 'biz'],
    't2-univ-startup': ['noir', 'a', 'overlay', 'min'],
    't2-univ-mooc': ['hk:grid', '', 'util', 'biz'],
    't2-univ-ai': ['sidebar', 'b', 'center', 'biz'],
    't2-univ-intl': ['story', 'a', 'util', 'campus'],
    't2-univ-rise': ['fullbleed', 'c', 'center', 'campus'],
    't2-univ-cll': ['hk:box', '', 'center', 'campus'],
    'univ-aicenter': ['hk:box', '', 'util', 'biz'],
    'univ-extra': ['story', 'b', 'center', 'min'],
    'univ-lifelong': ['hk:split', '', 'util', 'campus']
  };
  Object.keys(FD2).forEach(id => { const c = CFG[id], v = FD2[id]; if (!c) return;
    if (v[0].indexOf('hk:') === 0) { delete c.L; c.hk = v[0].slice(3); } else { c.L = v[0]; delete c.hk; }
    c.lv = v[1] || ''; c.hd = [v[2], v[3], A(c.hd)[2] || 'full']; });

  /* FD2: FC 첫 화면 사진 재배정표(fix6/FC_hero_map.json — 전체 템플릿에서 첫 화면 사진 중복 0, hero 슬롯 · 긴 변 1200 이상) */
  const FCH = { 't2-univ-ctl': 'lec-01', 'univ-lms': 'lap-05', 't2-univ-dept': 'cls-03', 't2-univ-faculty': 'lec-02', 't2-univ-tutor': 'cam-07', 't2-univ-writing': 'hum-05', 't2-univ-career': 'hum-10', 't2-univ-startup': 'cor-16', 't2-univ-mooc': 'lec-03', 't2-univ-ai': 'hum-07', 't2-univ-intl': 'lan-02', 't2-univ-rise': 'cam-05', 't2-univ-cll': 'lib-03', 'univ-aicenter': 'cod-01', 'univ-extra': 'cam-08', 'univ-lifelong': { hero: 'lib-01', about: 'lib-06' } };
  Object.keys(FCH).forEach(id => { const c = CFG[id]; if (!c) return; const v = typeof FCH[id] === 'string' ? { hero: FCH[id] } : FCH[id];
    if (Array.isArray(c.ph)) { const ix = { hero: 0, about: 1, space: 2, cta: 3, gallery: 4 }; c.ph = c.ph.slice(); Object.keys(v).forEach(k => { if (ix[k] != null) c.ph[ix[k]] = v[k]; }); }
    else c.ph = Object.assign({}, c.ph, v); });
  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'univ') return;
    const c = CFG[id]; const build0 = tp.build; MINE.add(id);
    tp.tpU = 1; tp.theme = c.th; tp.palette = c.pal; tp.eds = c.eds || ['lite'];
    if (c.hk) tp.hero = ({ scrim: 'bg', box: 'band', split: 'split', grid: 'center' })[c.hk] || tp.hero;
    if (c.L) tp.layout = c.L; else delete tp.layout;
    tp.photos = {}; c.ph.forEach((p, i) => { if (p) tp.photos[SLOT[i]] = p; });
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    if (c.L && c.lv) tp.layoutVar = c.lv; else delete tp.layoutVar;
    if (tp.eds.includes('lms') && !/학과 LMS/.test(tp.scene || '')) tp.scene = (tp.scene ? tp.scene + ' · ' : '') + '학과 LMS';
    delete tp.deco;
    tp.build = () => {
      let L = A(build0());
      if (c.rep) L = L.map(x => { const f = c.rep[keyOf(x)]; if (!f) return x; const y = f(); y.id = x.id; return y; });
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner') { if (c.hk) d.hk = c.hk; else delete d.hk; }
        if (keyOf(x) === 'cta' && c.ck) d.ck = c.ck;
        if (x.type === 'classes' && c.cd) d.card = c.cd;
        if (c.ren && Array.isArray(d.cols)) d.cols = d.cols.map(r => Array.isArray(r) ? r.map(v => { let s = v; c.ren.forEach(([a, b]) => { if (s === a) s = b; }); return s; }) : r); });
      A(c.add).forEach(([at, mk]) => { const y = mk(); y.id = typeof uid === 'function' ? uid('s') : 'tpu' + Math.random().toString(36).slice(2, 8);
        const j = L.findIndex(x => keyOf(x) === at); if (j < 0) L.push(y); else L.splice(j, 0, y); });
      if (c.pic && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { /* 사진이 첫 화면뿐인 배치: 공간 · 장면 사진 2장 띠를 한 곳에 넣는다(캡션 없음, 바로 고치기에서 교체) */
        const imgs = [c.ph[2], c.ph[4]].map(id => HPSTOCK.slotImg(id, 'gallery')).filter(Boolean).map(v => ({ src: v.src, alt: v.alt, title: '', body: '', fit: 'cover', pos: v.pos, stock: v.stock }));
        if (imgs.length) { const y = { type: 'image', id: typeof uid === 'function' ? uid('s') : 'tpu' + Math.random().toString(36).slice(2, 8), data: { title: '', alt: imgs[0].alt, imgs, dstyle: 2, hpiSlot: 'space' } };
          const j = L.findIndex(x => keyOf(x) === c.pic); if (j < 0) L.push(y); else L.splice(j, 0, y); } }
      if (c.ord) { const rank = k => { const i = c.ord.indexOf(k === 'image' && c.pic ? c.pic : k); return i < 0 ? 99 : i - (k === 'image' ? 0.5 : 0); };
        L = L.map((x, i) => [x, i]).sort((p, q) => (rank(keyOf(p[0])) - rank(keyOf(q[0]))) || (p[1] - q[1])).map(p => p[0]); }
      return L; };
  });

  /* FD2: 내 템플릿의 모든 섹션 eyebrow를 마지막에 한글화(덧붙인 섹션 포함) */
  Object.keys(CFG).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || !tp.tpU || A(tp.types)[0] !== 'univ') return; const b0 = tp.build;
    tp.build = () => { const L = A(b0()); L.forEach(x => { if (x && x.type === 'banner' && x.data && ['t2-univ-startup'].includes(id)) x.data.eyebrow = ''; /* 사진 위 eyebrow 대비 미달 → 뺌 */ if (x && x.data && x.data.eyebrow) x.data.eyebrow = EB(x.data.eyebrow, true); }); return L; }; });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos(→ site.img[slot]) · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpU && MINE.has(tp.id)) {
          if (tp.layout && window.HPL && typeof HPL.apply === 'function' && HPL.fam && HPL.fam[tp.layout]) HPL.apply(s, tp.layout); else delete s.layout;
          if (s.layout && tp.layoutVar) s.layoutVar = tp.layoutVar; else delete s.layoutVar; /* FD2: 계열 변형(FD1 HPL.vars) */
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            /* 계열 B(story · mosaic · collage · noir)의 번호 붙은 자리도 템플릿 사진으로(자동 선택이 다른 템플릿의 첫 화면 사진을 고르지 않게) */
            const P = tp.photos; Object.assign(s.photos, { about1: P.about, about2: P.space, about3: P.gallery, gallery1: P.about, gallery2: P.space, gallery3: P.gallery, gallery4: P.cta });
            Object.keys(s.photos).forEach(k => { if (!s.photos[k]) delete s.photos[k]; });
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const it = (HPSTOCK.get && HPSTOCK.get(tp.photos[sl])) || A(HPSTOCK.list).find(y => y.id === tp.photos[sl]); const v = it ? HPSTOCK.slotImg(it, sl) : null; if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-univ siteFromTpl', e); }
      return s; };
    if (base.hpc) f.hpc = base.hpc;
    siteFromTpl = f; window.siteFromTpl = f; }

  /* ── tpl-b 장식 CSS 걷어내기(내 템플릿만): tpl-b는 '/ * tpl-b <id> * /<css></style>' 형태로 붙인다 ── */
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
      try { if (s && MINE.has(s.tpl) && /^t2-/.test(s.tpl) && window.TPL_B && typeof TPL_B.css === 'function') { const c = TPL_B.css(s.tpl); if (c) return h.split(`/* tpl-b ${s.tpl} */${c}`).join(''); } } catch (e) { console.error('tpl-univ css', e); }
      return h; }; window.siteHTML = siteHTML; }

  window.TPL_UNIV = { ids: [...MINE], cfg: CFG };
})();
