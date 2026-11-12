/* v34.5 tpl-public — 유형 디자이너 TP: public(공무원 교육원 · 지자체 시민 교육 · 공공기관 직원 포털 · 공공 디지털 배움터) 템플릿 재배치
   지시: fix6/BRIEF5.md · RULES_B2 '공공 교육원' 뼈대(기관 띠 → 첫 화면 → 공지 · 알림 → 바로가기 → 바닥글: 접근성 · 대표번호)
   - 원본(tpl-d.js)의 t4-* 18종을 id로 찾아 덮어쓴다(원본 파일은 고치지 않음). types[0]이 public인 것만 손댄다(공유 템플릿은 그 유형 디자이너 몫).
   - 첫 화면 사진은 사람이 나오는 학습 장면(hum-*, 손 · 뒷모습 · 원거리, P2)을 우선 쓰고, 같은 유형 안에서 겹치지 않게 한다.
   - 템플릿마다: layout(HPL 계열, 같은 계열 최대 2) · theme · palette(HPC, 서로 다름) · photos(HPSTOCK id, 첫 화면 사진 서로 다름) · hps(머리글 · 바닥글)
     · 계열 없는 템플릿은 S3 첫 화면 banner.data.hk(scrim · box · split · grid) · 신청 띠 data.ck(photo · panel · contact)
     · 섹션 순서(order): 업종에 맞게 다시 배치(공지를 위로 올리는 포털 · 게시판형, 신청 흐름이 먼저인 시민 교육형 등)
   - siteFromTpl 감싸기: 내 템플릿(types[0] === 'public' && tp.tpP)에만 layout · photos(→ site.img[slot], 샘플 표시 stock 유지) · hps를 넣는다.
   - 사실 원칙: 숫자 · 후기 · 연락처는 실제 데이터만(원본과 같음). 단계 이름이 '숫자 + 배…'로 읽혀 지어낸 숫자로 오인되는 것('1 배우기')은 이름을 바꾼다.
   - 원 · 링 장식 deco(t4-green의 원형 아이콘 등)는 걷어낸다. */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function') return;
  const A = v => Array.isArray(v) ? v : [];
  /* 섹션 열쇠: banner · classes · notices · reviews · map · stats(실제 숫자) · features · steps · info · timeline · roadmap · cta … */
  const keyOf = x => !x ? '' : x.type === 'text' ? (x.data && x.data.hpt === 'facts' ? 'stats' : (x.data && x.data.variant) || 'plain') : x.type;

  /* 템플릿별 설정
     card: 강좌 카드(S2: photo · list · schedule · big · table — 공공은 가격 강조형을 쓰지 않음) · L: 계열(없으면 S3 첫 화면) · th: 테마 · pal: 팔레트 · ph: 사진 [hero, about, space, cta] · hd: [머리글, 바닥글, 휴대폰 메뉴]
     hk: S3 첫 화면 · ck: 신청 띠 · vmap: 글 섹션 변형 바꾸기(계열과 맞지 않는 변형) · add: [[이 열쇠 앞에, 섹션]] 끼워 넣기 · ord: 섹션 순서(열쇠 목록, 빠진 섹션은 뒤에 원래 순서대로) · ren: 글 바꾸기 [옛 글, 새 글] */
  const CFG = {
    /* 공무원 교육원: 포털(찾기 상자 · 공지 패널 · 빠른 메뉴) — 국내 교육원 표준 */
    't4-hrd-inst': { card: 'table', L: 'portal', th: 'official', pal: 'harbor', ph: ['lec-02', 'stu-02', 'lec-01', 'lib-05'], hd: ['contact', 'biz', 'full'], ck: 'contact', ord: ['banner', 'notices', 'features', 'classes', 'stats', 'steps', 'cta'] },
    /* 공공기관 직원 포털: 왼쪽 고정 내비게이션 */
    't4-agency': { card: 'list', L: 'sidebar', th: 'clean', pal: 'slate', ph: ['hum-36', 'dsk-03', 'off-05', 'arc-02'], hd: ['solid', 'cols', 'drawer'], ck: 'photo', ord: ['banner', 'classes', 'features', 'notices', 'steps', 'stats', 'cta'] },
    /* (FD2: 팔레트 graphite → denim — 문의 띠 eyebrow 대비 4.44 → 4.5 이상) 사이버 연수원: 벤토(나의 강의실 · 배정 과정 · 숫자 칸) */
    't4-cyber': { card: 'photo', L: 'bento', th: 'tech', pal: 'denim', ph: ['hum-09', 'cod-03', 'off-06', 'dsk-05'], hd: ['float', 'mega', 'drawer'], ck: 'contact', ord: ['banner', 'classes', 'steps', 'notices', 'features', 'stats', 'cta'],
      ren: [['배정 과정 확인', '내 과정 열기']],
      add: [['notices', { type: 'text', data: { variant: 'info', eyebrow: 'FAQ', title: '학습 중 자주 묻는 질문', cols: [['배정된 과정이 보이지 않아요?', '기관 계정으로 로그인했는지 확인하고, 그래도 없으면 교육 담당 부서에 배정을 요청하세요.'], ['영상이 끝까지 재생됐는데 이수가 안 돼요?', '퀴즈 · 설문까지 마쳐야 이수로 처리됩니다. 나의 강의실에서 남은 항목을 확인하세요.'], ['수료증은 어디서 받나요?', '이수한 과정은 교육이력에서 수료증을 바로 내려받을 수 있습니다.']] } }]] },
    /* 법정의무교육: 게시판형(KRDS 분위기 · 마감 공지 우선) */
    't4-legal': { card: 'table', L: 'bulletin', th: 'official', pal: 'nuri', ph: ['hum-04', 'dsk-01', 'sem-01', 'lib-02'], hd: ['notice', 'biz', 'full'], ck: 'photo', ord: ['banner', 'notices', 'features', 'info', 'classes', 'cta'] },
    /* 신규 임용자: 이야기 · 단계형(로드맵이 주인공) */
    't4-newhire': { card: 'schedule', L: 'story', th: 'campus', pal: 'ivy', ph: ['hum-01', 'dsk-02', 'cls-04', 'lib-06'], hd: ['solid', 'cta', 'full'], ck: 'photo', ord: ['banner', 'roadmap', 'features', 'classes', 'notices', 'cta'] },
    /* AI 행정: 어두운 프리미엄(코드 화면) */
    't4-ai-gov': { card: 'big', L: 'noir', th: 'tech', pal: 'circuit', vmap: { timeline: 'steps' }, ph: ['hum-07', 'cod-04', 'lec-03', 'cod-02'], hd: ['overlay', 'mega', 'full'], ck: 'photo', ord: ['banner', 'features', 'steps', 'classes', 'stats', 'notices', 'cta'] },
    /* 시민대학: 매거진형(명조 큰 제목 · 도서관 라운지) */
    't4-civic': { card: 'photo', bt: '시민 누구나\n배우는 우리 학교', L: 'editorial', th: 'campus', pal: 'maple', ph: ['hum-13', 'lib-03', 'sem-01', 'lib-05'], hd: ['solid', 'min', 'full'], ck: 'panel', ord: ['banner', 'features', 'classes', 'reviews', 'info', 'notices', 'map'] },
    /* 시민 디지털 배움터: S3 좌우 분할 · 큰 글씨 · 어두운 책상 사진 */
    't4-digital': { card: 'big', th: 'senior', pal: 'bigblue', hk: 'split', ph: ['hum-34', 'lap-07', 'cls-02', 'lib-04'], hd: ['contact', 'cols', 'full'], ck: 'contact', ord: ['banner', 'features', 'steps', 'classes', 'notices', 'map'] },
    /* 찾아가는 교육: S3 전면 사진 + 스크림 */
    't4-outreach': { card: 'schedule', th: 'warm', pal: 'brick', hk: 'scrim', ph: ['hum-11', 'off-04', 'lec-03', 'mus-07'], hd: ['overlay', 'cta', 'drawer'], ck: 'photo', ord: ['banner', 'steps', 'features', 'reviews', 'classes', 'cta'] },
    /* 간부 리더십: 좌우 분할(어두운 판 + 사진) */
    't4-leader': { card: 'list', L: 'splitscreen', th: 'premium', pal: 'boardroom', ph: ['hum-10', 'lib-06', 'off-04', 'off-07'], hd: ['solid', 'cols', 'drawer'], ck: 'panel', ord: ['banner', 'features', 'classes', 'timeline', 'notices', 'cta'] },
    /* 민원 응대: 전체 화면 사진(도서관 서가) */
    't4-service': { card: 'photo', L: 'fullbleed', th: 'clean', pal: 'civic', ph: ['hum-06', 'off-05', 'lib-02', 'sen-03'], hd: ['overlay', 'cta', 'full'], ck: 'photo', ord: ['banner', 'features', 'steps', 'classes', 'reviews', 'notices', 'cta'] },
    /* 안전 · 재난: 좌우 분할(진한 판 + 항공 사진, 훈련 공지 우선) */
    't4-safety': { card: 'schedule', L: 'splitscreen', th: 'official', pal: 'crimson', ph: ['cam-05', 'wrk-03', 'lec-02', 'arc-03'], hd: ['notice', 'cols', 'full'], ck: 'contact', ord: ['banner', 'notices', 'steps', 'features', 'info', 'classes', 'cta'],
      add: [['classes', { type: 'text', data: { variant: 'info', eyebrow: 'DRILL', title: '훈련 참여 기록 남기기', cols: [['참여 확인', '훈련이 끝나면 출석과 참여 여부를 교육이력에 남깁니다'], ['결과 공유', '훈련에서 나온 개선점은 공지로 함께 봅니다'], ['다시 보기', '대응 요령 영상은 언제든 다시 볼 수 있습니다']] } }]] },
    /* 청렴 · 공직윤리: 큰 글자(사진 띠) */
    't4-integrity': { card: 'list', L: 'typo', th: 'campus', pal: 'press', ph: ['hum-38', 'lib-06', 'lib-03', 'mus-07'], hd: ['solid', 'mega', 'full'], ck: 'panel', ord: ['banner', 'info', 'features', 'classes', 'notices', 'cta'] },
    /* 청소년 진로: 콜라주(경쾌한 기울어진 카드) */
    't4-youth': { card: 'big', L: 'collage', th: 'kids', pal: 'berry', ph: ['hum-15', 'kid-02', 'cls-03', 'art-02'], hd: ['float', 'cta', 'drawer'], ck: 'photo', ord: ['banner', 'features', 'classes', 'steps', 'info', 'reviews', 'notices', 'cta'],
      add: [['reviews', { type: 'text', data: { variant: 'info', eyebrow: 'GUIDE', title: '참여 전에 확인해 주세요', cols: [['참여 대상', '프로그램마다 정해진 학년 · 나이를 신청 화면에서 확인합니다'], ['보호자 동의', '보호자 동의가 필요한 프로그램은 동의 후 신청이 완료됩니다'], ['준비물', '프로그램 안내문에 적힌 준비물을 챙겨 옵니다'], ['참여 기록', '활동 기록과 수료 여부는 나의 학습에서 봅니다']] } }]] },
    /* 가족 · 부모: 모자이크(사진 우선) */
    't4-family': { card: 'photo', L: 'mosaic', th: 'warm', pal: 'rose', ph: ['hum-25', 'kid-05', 'sen-02', 'kid-03'], hd: ['float', 'mega', 'drawer'], ck: 'panel', ord: ['banner', 'features', 'classes', 'reviews', 'info', 'notices', 'map'] },
    /* 환경 · 탄소중립: 전체 화면 사진(정원) */
    't4-green': { card: 'big', L: 'fullbleed', th: 'campus', pal: 'bigforest', ph: ['nat-01', 'nat-03', 'off-03', 'wrk-06'], hd: ['overlay', 'cols', 'full'], ck: 'contact', ord: ['banner', 'steps', 'features', 'classes', 'notices', 'cta'],
      ren: [['배우기', '강의 듣기']], noDeco: 1 },
    /* 데이터 리터러시: S3 큰 제목 + 사진 3장 격자 */
    't4-data': { card: 'table', th: 'tech', pal: 'glacier', hk: 'grid', ph: ['hum-14', 'dsk-04', 'off-06', 'cod-04'], hd: ['solid', 'biz', 'full'], ck: 'panel', ord: ['banner', 'stats', 'timeline', 'features', 'classes', 'notices', 'cta'] },
    /* 외국인 주민: S3 사진 + 겹친 글자 상자(다국어) */
    't4-newcomer': { card: 'list', th: 'clean', pal: 'lagoon', hk: 'box', ph: ['hum-03', 'brd-02', 'cls-02', 'lib-05'], hd: ['notice', 'min', 'full'], ck: 'photo', ord: ['banner', 'notices', 'steps', 'features', 'classes', 'map'] }
  };

  /* ── 템플릿 덮어쓰기 ── */
  const SLOT = ['hero', 'about', 'space', 'cta'];
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

  /* ── FD2 유형 간 재배치(R1 H1 · M1, fix6/BRIEF7): 유형마다 주력 계열 5~6개만 쓴다 — 공공 = bulletin · portal · splitscreen · sidebar · typo · story + S3. collage · noir · mosaic · editorial · fullbleed · bento는 뺀다.
     같은 계열을 다른 유형도 쓰면 변형(layoutVar, FD1 HPL.vars)을 서로 다르게 고른다. 머리글 · 바닥글은 FA의 유형별 허용 목록 안에서 2~3종으로 나눈다.
     [계열 또는 'hk:<S3 첫 화면>', 변형, 머리글, 바닥글] — 휴대폰 메뉴(hd[2])는 그대로 둔다 */
  const FD2 = {
    't4-hrd-inst': ['portal', 'b', 'util', 'gov'],
    't4-agency': ['sidebar', 'a', 'center', 'biz'], /* b면 corp t3-c-job과 엄격 유사 */
    't4-cyber': ['sidebar', 'b', 'util', 'biz'],
    't4-legal': ['bulletin', 'b', 'util', 'gov'], /* a(사진 판 위 제목)면 제목 대비 3.7 */
    't4-newhire': ['story', 'c', 'center', 'gov'],
    't4-ai-gov': ['portal', 'c', 'center', 'biz'],
    't4-civic': ['bulletin', 'a', 'center', 'gov'],
    't4-digital': ['hk:split', '', 'util', 'gov'],
    't4-outreach': ['hk:split', '', 'center', 'biz'],
    't4-leader': ['splitscreen', 'c', 'center', 'biz'] /* 어두운 첫 화면: leader · hrd-inst 2종 */,
    't4-service': ['hk:grid', '', 'util', 'biz'], /* split이면 voc tv-office와 첫 화면이 닮음(거리 6) */
    't4-safety': ['splitscreen', 'b', 'util', 'gov'],
    't4-integrity': ['typo', 'b', 'center', 'gov'],
    't4-youth': ['story', 'a', 'util', 'biz'], /* H3: b는 corp-onboard(public 공유)와 겹침 · c면 voc t3-v-youth와 닮음 */ /* c면 voc t3-v-youth와 첫 화면 거리 2 */
    't4-family': ['hk:scrim', '', 'center', 'gov'], /* H3: 상자형 첫 화면 유형당 3종 이하 */
    't4-green': ['typo', 'a', 'util', 'gov'],
    't4-data': ['splitscreen', 'a', 'center', 'biz'], /* H3: 주력 splitscreen a · b · c */
    't4-newcomer': ['hk:box', '', 'util', 'gov']
  };
  Object.keys(FD2).forEach(id => { const c = CFG[id], v = FD2[id]; if (!c) return;
    if (v[0].indexOf('hk:') === 0) { delete c.L; c.hk = v[0].slice(3); } else { c.L = v[0]; delete c.hk; }
    c.lv = v[1] || ''; c.hd = [v[2], v[3], A(c.hd)[2] || 'full']; });

  /* FD2: FC 첫 화면 사진 재배정표(fix6/FC_hero_map.json — 전체 템플릿에서 첫 화면 사진 중복 0, hero 슬롯 · 긴 변 1200 이상) */
  const FCH = { 't4-hrd-inst': 'cam-03', 't4-agency': 'off-11', 't4-cyber': 'off-13', 't4-legal': 'doc-01', 't4-newhire': 'dsk-08', 't4-ai-gov': 'rob-01', 't4-civic': 'cam-06', 't4-digital': 'hum-36', 't4-outreach': 'hum-11', 't4-leader': 'dsk-06', 't4-service': 'shk-01', 't4-safety': 'dro-01', 't4-integrity': 'dsk-09', 't4-youth': 'spo-08', 't4-family': 'fam-03', 't4-green': 'nat-01', 't4-data': 'dat-01', 't4-newcomer': 'cam-09' };
  Object.keys(FCH).forEach(id => { const c = CFG[id]; if (!c) return; const v = typeof FCH[id] === 'string' ? { hero: FCH[id] } : FCH[id];
    if (Array.isArray(c.ph)) { const ix = { hero: 0, about: 1, space: 2, cta: 3, gallery: 4 }; c.ph = c.ph.slice(); Object.keys(v).forEach(k => { if (ix[k] != null) c.ph[ix[k]] = v[k]; }); }
    else c.ph = Object.assign({}, c.ph, v); });
  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'public') return;
    const c = CFG[id]; const build0 = tp.build;
    tp.tpP = 1; tp.theme = c.th; tp.palette = c.pal;
    if (c.L) tp.layout = c.L; else delete tp.layout;
    tp.photos = {}; c.ph.forEach((p, i) => { if (p) tp.photos[SLOT[i]] = p; });
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    if (c.L && c.lv) tp.layoutVar = c.lv; else delete tp.layoutVar;
    if (c.noDeco || c.L) delete tp.deco; /* 계열이 있으면 템플릿 장식 CSS(원 · 테두리)는 걷어낸다 */
    tp.build = () => {
      let L = A(build0());
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner' && c.hk) d.hk = c.hk;
        if (x.type === 'banner' && c.bt) d.title = c.bt; /* 매거진형 큰 제목은 2줄 이내(기관명이 길면 3줄이 됨) */
        if (c.vmap && x.type === 'text' && c.vmap[d.variant]) d.variant = c.vmap[d.variant];
        if (keyOf(x) === 'cta' && c.ck) d.ck = c.ck;
        if (x.type === 'classes' && c.card) d.card = c.card; /* S2 강좌 카드 6종 중 하나(유형 안에서 고르게: 표 · 목록 · 사진 · 일정 · 큰 썸네일) */
        if (c.ren && Array.isArray(d.cols)) d.cols = d.cols.map(r => Array.isArray(r) ? r.map(v => { let s = v; c.ren.forEach(([a, b]) => { if (s === a) s = b; }); return s; }) : r); });
      A(c.add).forEach(([at, sec]) => { const j = L.findIndex(x => keyOf(x) === at); const y = JSON.parse(JSON.stringify(sec)); y.id = typeof uid === 'function' ? uid('s') : 'tpp' + Math.random().toString(36).slice(2, 8); if (j < 0) L.push(y); else L.splice(j, 0, y); });
      if (c.ord) { const rank = k => { const i = c.ord.indexOf(k); return i < 0 ? 99 : i; };
        L = L.map((x, i) => [x, i]).sort((p, q) => (rank(keyOf(p[0])) - rank(keyOf(q[0]))) || (p[1] - q[1])).map(p => p[0]); }
      return L; };
  });

  /* FD2: 내 템플릿의 모든 섹션 eyebrow를 마지막에 한글화(덧붙인 섹션 포함) */
  Object.keys(CFG).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || !tp.tpP || A(tp.types)[0] !== 'public') return; const b0 = tp.build;
    tp.build = () => { const L = A(b0()); L.forEach(x => { if (x && x.type === 'banner' && x.data && ['t4-legal'].includes(id)) x.data.eyebrow = ''; /* 사진 위 eyebrow 대비 미달 → 뺌 */ if (x && x.data && x.data.eyebrow) x.data.eyebrow = EB(x.data.eyebrow, false); }); return L; }; });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpP && A(tp.types)[0] === 'public') {
          if (tp.layout && window.HPL && typeof HPL.apply === 'function' && HPL.fam && HPL.fam[tp.layout]) HPL.apply(s, tp.layout); else delete s.layout;
          if (s.layout && tp.layoutVar) s.layoutVar = tp.layoutVar; else delete s.layoutVar; /* FD2: 계열 변형(FD1 HPL.vars) */
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const v = HPSTOCK.slotImg(tp.photos[sl], sl); if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-public siteFromTpl', e); }
      return s; };
    /* hpcolor의 가장 바깥 감싸기 표시(hpc)는 그대로 넘긴다 */
    if (base.hpc) f.hpc = base.hpc;
    siteFromTpl = f; window.siteFromTpl = f; }
  /* H3(R2 N10): 점검용 업종별 강좌 이름 6개 — hp-visual 채운 기관이 템플릿마다 이 이름으로 강좌를 바꿔 찍는다(게시 화면에는 쓰지 않는다) */
  { const QA = {
    't4-agency': ['직무 기본 과정', '공공기관 회계 실무', '보고서 작성 실무', '청렴 · 윤리 필수', '자기계발 외국어', '디지털 업무 역량'],
    't4-ai-gov': ['생성형 AI 행정 활용', 'AI 민원 응대 실습', '공문서 자동화', '데이터 기반 정책 기획', 'AI 윤리와 보안', '행정 업무 자동화'],
    't4-civic': ['시민 민주주의 강좌', '지역 인문학', '시민 리더 양성', '생활 법률', '기후 시민 강좌', '마을 기록가 과정'],
    't4-cyber': ['공직 가치 이러닝', '정보보안 기본', '개인정보 보호', '직장 내 성희롱 예방', '적극 행정', '디지털 행정 기초'],
    't4-data': ['공공 데이터 활용', '데이터 시각화 실습', '엑셀 데이터 분석', '통계 읽기 기초', '근거 기반 행정', '공공 빅데이터 사례'],
    't4-digital': ['스마트폰 첫걸음', '키오스크 이용하기', '모바일 뱅킹 안전', '영상 통화 배우기', '온라인 민원 신청', '디지털 사기 예방'],
    't4-family': ['부모 교육', '아빠와 함께하는 놀이', '가족 소통 대화법', '청소년 자녀 이해', '다문화 가족 교육', '부부 관계 교실'],
    't4-green': ['탄소중립 생활 실천', '기후 위기 이해', '자원 순환 교실', '마을 환경 활동가', '에너지 절약 실천', '녹색 소비 교육'],
    't4-hrd-inst': ['신임 공무원 기본', '중견 리더 과정', '정책 기획 실무', '민원 서비스', '청렴 교육', '정보화 교육'],
    't4-integrity': ['이해충돌 방지법', '청탁금지법 사례', '공직자 행동강령', '갑질 예방', '부패 신고 제도', '청렴 리더십'],
    't4-leader': ['관리자 리더십', '정책 기획 역량', '조직 갈등 관리', '성과 관리', '위기 소통', '간부 혁신 세미나'],
    't4-legal': ['폭력 예방 통합 교육', '개인정보 보호 교육', '장애인 인식 개선', '청렴 교육', '산업 안전 교육', '직장 내 괴롭힘 예방'],
    't4-newcomer': ['한국어 초급', '한국어 중급', '생활 정보 안내', '한국 생활 법률', '취업 준비 한국어', '지역 정착 교육'],
    't4-newhire': ['공직 기본 소양', '행정 실무 첫걸음', '공문서 작성법', '민원 응대 기본', '공직 윤리', '조직 적응 멘토링'],
    't4-outreach': ['찾아가는 안전 교육', '찾아가는 청렴 교육', '찾아가는 디지털 교육', '기관 맞춤 출장 강의', '학교 방문 교육', '단체 신청 특강'],
    't4-safety': ['재난 대응 기본', '심폐소생술 실습', '화재 대피 훈련', '지진 대응 교육', '현장 안전 관리', '안전 점검 실무'],
    't4-service': ['민원 응대 실무', '갈등 민원 대응', '친절 서비스 교육', '쉬운 안내문 쓰기', '전화 응대 매너', '감정 노동 관리'],
    't4-youth': ['청소년 진로 탐색', '직업 체험 캠프', '청년 취업 준비', '진로 멘토링', '창의 체험 활동', '청년 창업 입문']
  };
  Object.keys(QA).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (tp && A(tp.types)[0] === 'public') tp.qaCls = QA[id]; }); }
  /* H3(R2 H3 · BRIEF8): 번호 단계 섹션을 쓰는 템플릿을 유형마다 40% 미만으로 — 아래 템플릿의 '단계(steps)'를 번호 없는 칸(tiles)으로 바꾼다(내용은 그대로) */
  ['t4-outreach', 't4-safety', 't4-digital', 't4-service'].forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || typeof tp.build !== 'function') return; const b0 = tp.build;
    /* editorial · fullbleed 계열은 '특징(features)'도 번호 목록으로 그리므로 함께 바꾼다. 바꿀 칸이 둘이면 두 번째는 정보 목록(info) */
    tp.build = () => { const L = A(b0()); let hasT = L.some(x => x && x.data && x.data.variant === 'tiles'); const numF = /^(editorial|fullbleed)$/.test(tp.layout || '');
      L.forEach(x => { if (!x || x.type !== 'text' || !x.data) return; const v = x.data.variant; if (v === 'steps' || (numF && v === 'features')) { x.data.variant = hasT ? 'info' : 'tiles'; hasT = true; } }); return L; }; });
  /* H2 사진 재배정표(fix6/h2/w/H2_change.json · H2_photo_map.md): 첫 화면 사무실 · 노트북 유형당 2장 이하, 첫 화면 중복 0.
     슬롯 사진(photos)을 덮어쓰고, gal: { 이전 id: 새 id }는 사진 띠(image 섹션) 안의 사진을 바꾼다 */
  { const H2P = {
    't4-newhire': {'hero': 'civ-04'},
    't4-outreach': {'cta': 'lec-02'},
    't4-leader': {'hero': 'hum-46', 'cta': 'grp-01'},
    't4-integrity': {'hero': 'lib-08', 'cta': 'dsk-05'},
    't4-cyber': {'cta': 'arc-06', 'space': 'cor-06'},
    't4-data': {'space': 'hum-06'},
    't4-agency': {'space': 'hum-46', 'about': 'hum-51'}
  };
  const H2S = id => { const H = window.HPSTOCK; const x = H && typeof H.get === 'function' ? H.get(id) : null; return x ? (x.src800 || x.src) : ''; };
  Object.keys(H2P).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'public') return; const v = H2P[id];
    const ph = Object.assign({}, v); delete ph.gal; tp.photos = Object.assign({}, tp.photos || {}, ph);
    if (v.gal && typeof tp.build === 'function') { const b0 = tp.build; tp.build = () => { const L = A(b0());
      L.forEach(x => { if (!x || x.type !== 'image' || !x.data || !Array.isArray(x.data.imgs)) return;
        x.data.imgs = x.data.imgs.map(im => { const m = String(im && im.src || '').match(/([a-z]{3}-\d{2})(?:-800)?\.webp/); const nw = m && v.gal[m[1]] ? H2S(v.gal[m[1]]) : '';
          return nw ? Object.assign({}, im, { src: nw }) : im; }); }); return L; }; } }); }
})();
