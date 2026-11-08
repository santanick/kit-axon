/* v34.5 tpl-adult — 유형 디자이너 TA: adult(성인 교육 · 자격증 · 취미 · 1인 강사 · 어학) 템플릿 재배치 (fix6/BRIEF5.md)
   뼈대: RULES_B2 '1인 강사 · 성인' — 사진 첫 화면 + 버튼 1~2개 → 실제 숫자 → 인기 강좌 → 후기 → 상담 · 수강신청
   - types[0]이 adult인 템플릿 15종(global.js 5 + tpl-a.js 10)을 id로 찾아 덮어쓰고, 업종 5종(음악 · 북클럽 · 글쓰기 · 사진 · 마케팅)을 새로 더한다(id 접두어 ta-).
     원본 파일은 고치지 않는다. 공유 템플릿 중 types[0]이 다른 유형인 것(corp-partner · v-kdt · v-license · v-design)은 손대지 않는다.
   - 업종 20가지: 레이아웃 계열(HPL) 12종을 모두 쓰되 같은 계열은 최대 2개(fullbleed · story · editorial · mosaic), 나머지 4종은 S3 사진 첫 화면(grid · box · scrim · split).
     템플릿마다 layout · theme · palette(HPC, 20종 모두 다름) · photos(HPSTOCK, 첫 화면 사진 20장 모두 다름) · hps(머리글 · 바닥글 · 휴대폰 메뉴) · 강좌 카드(S2) · 신청 띠(S3) · 섹션 구성(업종별로 다시 씀)
   - 사실 원칙: 숫자는 실제 숫자 띠(hpt:'facts')만, 강사는 등록된 강사만, 후기는 실제 후기만, 연락처는 설정값만. 문구 안에 실적 · 합격률 · 기간 숫자를 넣지 않는다.
   - 원 · 링 · 줄무늬 장식 CSS(tpl-a의 deco)는 걷어낸다. */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function' || typeof S2 !== 'function') return;
  const A = v => Array.isArray(v) ? v : [];
  const T = (variant, data) => S2('text', { variant, ...data });
  const ids = n => { try { return pubCls(n); } catch (e) { return []; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const ban = d => S2('banner', d);
  const cls = (title, sub, o) => S2('classes', { eyebrow: '', title, sub: sub || '', ids: ids(o && o.n || 4), layout: (o && o.layout) || 'grid', ...(o && o.price ? { price: true } : {}) });
  const facts = (title) => T('stats', { hpt: 'facts', title: title || '', cols: [] });
  const people = (title) => T('profiles', { hpt: 'people', eyebrow: '', title, cols: [] });
  const reviews = (title) => S2('reviews', { eyebrow: '', title, note: '' });
  const notices = (title, o) => S2('notices', { eyebrow: '', title: title || '공지사항', n: (o && o.n) || 4, ...(o && o.board ? { variant: 'board' } : {}) });
  const faq = (cols, title) => T('info', { hpt: 'faq', eyebrow: '', title: title || '자주 묻는 질문', cols });
  const cta = (title, body, btn) => T('cta', { eyebrow: '', title, body, cta: btn || '수강 상담', cols: [] });
  const map = title => S2('map', { title: title || '오시는 길', addr: ft().addr || '', tel: ft().tel || '' });
  /* 사진 띠: 샘플 사진 2~3장(분위기 사진 · 캡션 없음). 바로 고치기에서 '갤러리' 자리로 교체된다 */
  const gal = (P, alt) => { const H = window.HPSTOCK; const L = (H && Array.isArray(H.list)) ? P.map(id => H.list.find(x => x.id === id)).filter(Boolean) : [];
    return L.length >= 2 ? S2('image', { title: '', alt: alt || '수업 분위기 사진', imgs: L.map(x => ({ src: x.src800 || x.src, title: '' })), dstyle: 2, hpiSlot: 'gallery' }) : null; };

  /* ── 템플릿별 설정 ──
     name: 업종 이름 · L: 계열(없으면 S3 첫 화면 hk) · th: 테마 · pal: 팔레트 · ph: { hero, about, space, cta, gallery }
     hd: [머리글, 바닥글, 휴대폰 메뉴] · cd: 강좌 카드(photo · list · price · schedule · big · table) · ck: 신청 띠(photo · panel · contact) · build: 섹션 */
  const CFG = {
    /* 코딩 부트캠프: 벤토(제목 · 큰 사진 · 숫자 · 강좌 칸이 맞물린 첫 화면) — 기수 · 커리큘럼 · 프로젝트가 한눈에 */
    'adult-bootcamp': { name: '코딩 부트캠프', L: 'bento', th: 'tech', pal: 'volt', cd: 'schedule', ck: 'panel', hd: ['float', 'mega', 'drawer'],
      ph: { hero: 'cod-02', about: 'cod-03', space: 'cls-03', cta: 'cod-04' },
      build: () => [
        ban({ eyebrow: '개발자 전환 집중 과정', title: '코드로 만드는\n첫 번째 서비스', sub: '기초 문법부터 팀 프로젝트 배포까지, 매일 코드 리뷰를 받으며 실무 방식으로 배웁니다.', cta: '지원하기', cta2: '커리큘럼 보기' }),
        facts(),
        T('timeline', { eyebrow: '', title: '과정의 흐름', cols: [['기초', '프로그래밍 언어와 개발 도구 익히기'], ['웹 개발', '화면 · 서버 · 데이터베이스 연결'], ['팀 프로젝트', '기획부터 배포까지 팀으로 완성'], ['회고 · 포트폴리오', '만든 서비스를 정리하고 발표']] }),
        cls('모집 중인 기수', '기수별 개강일과 수업 시간을 확인하세요.', { n: 4 }),
        T('features', { eyebrow: '', title: '배우는 방식', cols: [['코드 리뷰', '제출한 코드에 매일 피드백'], ['페어 프로그래밍', '둘이 함께 문제 풀기'], ['현업 방식', '이슈 · 브랜치 · 배포 흐름 그대로'], ['질문 채널', '막히면 바로 묻는 학습 채널']] }),
        gal(['cod-03', 'cls-03', 'stu-02'], '코딩 수업 분위기 사진'),
        reviews('수료생 후기'),
        faq([['비전공자도 지원할 수 있나요?', '기초 과정부터 시작하므로 처음 코드를 배우는 분도 지원할 수 있습니다. 지원서와 상담으로 준비 정도를 함께 확인합니다.'], ['수업은 어떻게 진행되나요?', '실시간 강의와 실습, 팀 프로젝트로 진행되며 일정은 기수별 모집 공지에서 확인할 수 있습니다.']]),
        cta('다음 기수에\n함께하세요', '지금 준비 상태와 목표를 알려 주시면 맞는 과정을 안내해 드립니다.', '지원 상담')] },
    /* IT · 사무 자격증: 알림판형(시험 일정 · 공지 · 표로 정리한 과정) — 시험 일정이 먼저 */
    'adult-cert': { name: 'IT · 사무 자격증', L: 'bulletin', th: 'official', pal: 'tealcorp', cd: 'table', ck: 'contact', hd: ['notice', 'biz', 'full'],
      ph: { hero: 'lap-08', about: 'dsk-01', space: 'cls-02', cta: 'lap-03' },
      build: () => [
        ban({ eyebrow: '컴활 · 정보처리 · 사무 자격', title: '필기부터 실기까지\n시험 일정에 맞춰', sub: '시험 회차에 맞춘 기출 강의와 실기 실습, 모의고사로 한 번에 준비합니다.', cta: '수강신청', cta2: '시험 일정' }),
        notices('시험 · 접수 안내', { n: 5 }),
        gal(['dsk-01', 'cls-02', 'lap-10'], '필기 노트와 실습실 사진'),
        cls('과정 안내', '필기 · 실기 과정을 표로 비교해 보세요.', { n: 6 }),
        T('steps', { eyebrow: '', title: '합격까지의 순서', cols: [['필기 이론', '출제 범위 핵심 정리'], ['기출 풀이', '회차별 기출과 해설'], ['실기 실습', '프로그램을 직접 다루며 연습'], ['모의시험', '시간 안에 푸는 실전 점검']] }),
        facts(),
        reviews('수강 후기'),
        faq([['필기와 실기를 함께 들을 수 있나요?', '필기 · 실기 과정을 따로 또는 묶어서 수강할 수 있습니다. 시험 일정에 맞춰 상담해 드립니다.'], ['실습 프로그램이 필요한가요?', '실기 과정은 실습용 프로그램이 필요하며, 설치 방법은 수강 안내에서 확인할 수 있습니다.']]),
        cta('어떤 자격증부터\n준비할지 고민이라면', '목표 시험과 일정을 알려 주시면 맞는 과정을 안내해 드립니다.', '수강 상담')] },
    /* 취미 원데이: 콜라주(기울어진 사진 카드 · 메모지) — 가볍고 즐거운 첫인상 */
    'adult-hobby': { name: '드로잉 · 원데이 클래스', L: 'collage', th: 'warm', pal: 'coral', cd: 'big', ck: 'photo', hd: ['float', 'cta', 'drawer'],
      ph: { hero: 'art-01', gallery1: 'art-02', gallery2: 'art-06', about: 'art-04', cta: 'art-02' },
      build: () => [
        ban({ eyebrow: '수채화 · 드로잉 · 캘리그라피', title: '오늘, 나를 위한\n한 장의 그림', sub: '재료는 모두 준비되어 있습니다. 처음 붓을 드는 분도 한 번의 수업으로 작품 하나를 완성합니다.', cta: '클래스 예약', cta2: '일정 보기' }),
        cls('이번 달 클래스', '날짜와 남은 자리를 확인하고 예약하세요.', { n: 6 }),
        T('features', { eyebrow: '', title: '처음이어도 괜찮아요', cols: [['재료 준비', '붓 · 물감 · 종이 모두 제공'], ['소규모 수업', '옆에서 바로 봐 드리는 수업'], ['완성작 가져가기', '오늘 그린 작품은 내 것'], ['정규 과정', '더 배우고 싶다면 이어서']] }),
        gal(['art-02', 'art-06', 'art-03'], '물감과 붓 사진'),
        reviews('수강 후기'),
        faq([['혼자 가도 괜찮을까요?', '혼자 오시는 분이 많습니다. 수업은 개인 작업으로 진행됩니다.'], ['예약 변경은 어떻게 하나요?', '예약 안내에 적힌 기한 안에 문의 게시판이나 전화로 알려 주세요.']]),
        cta('원하는 날짜에\n자리를 잡아 두세요', '단체 · 기업 클래스도 문의해 주세요.', '클래스 예약'),
        map('오시는 길')] },
    /* 외국어 학원(다국어): S3 격자(큰 제목 + 사진 3장) — 언어 선택이 먼저 */
    'adult-lang': { name: '외국어 학원(다국어)', hk: 'grid', th: 'clean', pal: 'sky', cd: 'list', ck: 'contact', hd: ['solid', 'cols', 'full'],
      ph: { hero: 'cls-02', about: 'stu-02', space: 'cls-03', cta: 'lib-05', gallery: 'dsk-02' },
      build: () => [
        ban({ eyebrow: '영어 · 일본어 · 중국어 · 스페인어', title: '언어마다 레벨별로,\n말이 트일 때까지', sub: '레벨 테스트로 시작해 소규모 회화와 문법 수업을 함께 듣습니다.', cta: '레벨 테스트', cta2: '반 안내' }),
        T('tiles', { eyebrow: '', title: '언어 고르기', cols: [['영어', '회화 · 비즈니스 · 시험'], ['일본어', '기초 문자부터 회화까지'], ['중국어', '발음 · 성조 · 회화'], ['스페인어', '여행 · 생활 회화']] }),
        cls('레벨별 개설 반', '언어와 레벨로 반을 찾아보세요.', { n: 6 }),
        T('steps', { eyebrow: '', title: '수강 순서', cols: [['레벨 테스트', '말하기 · 듣기 진단'], ['반 배정', '레벨과 시간대로 배정'], ['정규 수업', '회화 · 문법 병행'], ['레벨 점검', '정기 점검 후 다음 반']] }),
        facts(),
        reviews('수강생 후기'),
        notices('학원 소식'),
        cta('지금 내 레벨이\n궁금하다면', '레벨 테스트 후 맞는 반과 시간을 안내해 드립니다.', '레벨 테스트 신청')] },
    /* 1인 강사 브랜드: 좌우 분할(어두운 글 판 + 사진) — 강사 이름이 곧 브랜드 */
    'solo-creator': { name: '1인 강사 브랜드', L: 'splitscreen', th: 'premium', pal: 'plum', cd: 'big', ck: 'panel', hd: ['solid', 'min', 'drawer'],
      ph: { hero: 'lap-06', about: 'dsk-05', space: 'lap-07', cta: 'lap-03' },
      build: () => [
        ban({ eyebrow: '온라인 강의 · 1:1 코칭', title: '현장에서 쌓은 노하우를\n강의로 나눕니다', sub: '녹화 강의로 기본을 익히고, 라이브와 1:1 피드백으로 내 일에 적용합니다.', cta: '강의 둘러보기', cta2: '코칭 문의' }),
        people('강사 소개'),
        cls('지금 들을 수 있는 강의', '', { n: 3 }),
        T('features', { eyebrow: '', title: '배우는 방법', cols: [['녹화 강의', '원하는 시간에 반복 수강'], ['라이브 클래스', '정해진 날 함께 질문하고 답하기'], ['1:1 피드백', '내 과제에 직접 의견 받기']] }),
        reviews('수강생 이야기'),
        facts(),
        faq([['강의는 언제까지 볼 수 있나요?', '수강 기간은 강의마다 다르며 강의 소개에서 확인할 수 있습니다.'], ['1:1 코칭은 어떻게 신청하나요?', '코칭 문의를 남겨 주시면 가능한 일정과 방식을 안내해 드립니다.']]),
        cta('나에게 맞는 강의가\n궁금하다면', '지금 하고 있는 일과 목표를 알려 주세요.', '코칭 문의')] },
    /* 전문 자격증: 포털(사진 배경 찾기 상자 · 공지 패널 · 빠른 메뉴) — 대형 자격증 학원의 표준 구성 */
    't1-ad-license': { name: '전문 자격증 아카데미', L: 'portal', th: 'official', pal: 'denim', cd: 'table', ck: 'contact', hd: ['contact', 'biz', 'full'],
      ph: { hero: 'lec-03', about: 'dsk-03', space: 'cls-01', cta: 'lib-06' },
      build: () => [
        ban({ eyebrow: '공인중개사 · 사회복지사 · 주택관리사', title: '자격증 합격,\n계획부터 함께', sub: '이론 · 기출 · 모의고사를 시험 일정에 맞춰 배치하고, 진도와 성적을 기록으로 확인합니다.', cta: '수강신청', cta2: '상담 신청' }),
        notices('시험 · 모집 공지', { board: 1, n: 5 }),
        T('tiles', { eyebrow: '', title: '자격증별로 찾기', cols: [['공인중개사', '부동산 법 · 실무'], ['사회복지사', '이론 · 실습 과목'], ['주택관리사', '관리 실무 · 법령'], ['전산세무', '세무 · 회계 실무']] }),
        cls('과정 · 수강료', '과정별 기간과 구성을 비교해 보세요.', { n: 6, price: 1 }),
        T('timeline', { eyebrow: '', title: '합격 로드맵', cols: [['기본 이론', '출제 범위 핵심 개념'], ['기출 분석', '유형과 함정 파악'], ['실전 모의고사', '시간 안에 푸는 연습'], ['최종 점검', '오답 노트로 약점 보완']] }),
        gal(['dsk-03', 'cls-01', 'lib-06'], '책과 강의실 사진'),
        people('강사진'),
        reviews('수강 후기'),
        cta('어떤 자격증이\n나에게 맞을까요', '목표와 공부할 수 있는 시간을 알려 주시면 과정을 안내해 드립니다.', '상담 신청')] },
    /* 공무원 수험: 스토리(단계형 흐름) — 긴 수험 기간을 시기별로 */
    't1-ad-civil': { name: '공무원 수험', L: 'story', th: 'campus', pal: 'oxford', cd: 'list', ck: 'panel', hd: ['solid', 'cta', 'full'],
      ph: { hero: 'lib-03', about: 'dsk-03', space: 'lib-02', cta: 'lib-06' },
      build: () => [
        ban({ eyebrow: '9급 · 7급 · 경찰 · 소방', title: '흔들리지 않는\n수험 루틴', sub: '과목별 기본 강의, 주간 학습 점검, 실전 모의고사로 긴 수험 기간을 꾸준히 이어 갑니다.', cta: '강좌 둘러보기', cta2: '학습 상담' }),
        T('steps', { eyebrow: '', title: '시기별 학습 단계', cols: [['기본', '과목별 기본 개념 강의'], ['심화', '빈출 주제를 깊이 있게'], ['문제 풀이', '단원별 문제와 해설'], ['실전 모의', '시험과 같은 환경에서 점검']] }),
        cls('직렬별 개설 강좌', '', { n: 5 }),
        T('features', { eyebrow: '', title: '꾸준함을 돕는 관리', cols: [['주간 점검', '이번 주 진도와 복습 확인'], ['질문 답변', '강의별 질문 게시판'], ['모의고사 분석', '과목별 취약 영역 확인'], ['학습 기록', '수강 · 시험 기록 한눈에']] }),
        people('강사진'),
        notices('수험 공지'),
        reviews('수강 후기'),
        cta('수험 계획,\n혼자 세우지 마세요', '준비 기간과 직렬을 알려 주시면 맞는 강좌 순서를 안내해 드립니다.', '학습 상담')] },
    /* 직장인 실무(엑셀 · 문서 · AI 도구): 사이드 메뉴형 학습 포털 — 분야로 바로 찾기 */
    't1-ad-office': { name: '직장인 실무 스킬', L: 'sidebar', th: 'clean', pal: 'circuit', cd: 'price', ck: 'contact', hd: ['solid', 'cols', 'full'],
      ph: { hero: 'lap-01', about: 'lap-10', space: 'off-06', cta: 'lap-03' },
      build: () => [
        ban({ eyebrow: '엑셀 · 문서 · AI 도구', title: '퇴근 후 한 시간,\n내일 바로 쓰는 실무', sub: '실제 업무 예제 파일로 따라 하며 배우고, 내 업무에 바로 적용합니다.', cta: '강의 둘러보기', cta2: '단체 수강 문의' }),
        T('tiles', { eyebrow: '', title: '분야별로 찾기', cols: [['엑셀', '함수 · 피벗 · 자동화'], ['문서 · 보고서', '기획서 · 보고서 구성'], ['AI 도구', '생성형 AI 업무 활용'], ['데이터', '시각화 · 대시보드']] }),
        cls('인기 강의', '예제 파일과 함께 바로 시작하세요.', { n: 6, price: 1 }),
        gal(['lap-10', 'off-06', 'cod-03'], '노트북과 작은 회의실 사진'),
        T('steps', { eyebrow: '', title: '수강 방법', cols: [['강의 선택', '분야 · 수준으로 찾기'], ['예제 실습', '업무 파일로 따라 하기'], ['과제 제출', '내 업무에 적용해 보기'], ['수료', '수료 기준 충족 시 수료증']] }),
        facts(),
        faq([['회사에서 단체로 들을 수 있나요?', '단체 수강 문의를 남겨 주시면 인원과 일정에 맞춰 안내해 드립니다.'], ['예제 파일은 어디서 받나요?', '강의마다 자료실에서 예제 파일을 내려받을 수 있습니다.']]),
        reviews('수강 후기')] },
    /* 성인 영어회화 · 화상: 모자이크(사진 격자) — 레벨 진단 → 소규모 회화 */
    't1-ad-talk': { name: '성인 영어회화 · 화상', L: 'mosaic', th: 'warm', pal: 'tangerine', cd: 'schedule', ck: 'photo', hd: ['float', 'mega', 'drawer'],
      ph: { hero: 'dsk-02', gallery1: 'stu-01', gallery2: 'lap-07', about: 'lap-02', cta: 'lap-06' },
      build: () => [
        ban({ eyebrow: '소규모 회화 · 화상 수업', title: '머릿속 영어를\n입 밖으로', sub: '레벨 진단 후 소규모 회화와 화상 수업으로 매일 말하는 시간을 만듭니다.', cta: '레벨 진단 신청', cta2: '수업 시간표' }),
        T('features', { eyebrow: '', title: '말하는 시간이 많은 수업', cols: [['소규모 회화', '모두가 말하는 인원 구성'], ['화상 수업', '집과 회사 어디서나'], ['표현 노트', '수업에서 고친 문장 정리'], ['레벨 점검', '정기적으로 말하기 점검']] }),
        cls('시간대별 수업', '아침 · 점심 · 저녁 시간대를 골라 보세요.', { n: 4 }),
        reviews('수강생 후기'),
        facts(),
        faq([['화상 수업은 무엇이 필요한가요?', '카메라와 마이크가 있는 PC나 휴대폰이면 됩니다. 접속 방법은 수강 안내에서 확인할 수 있습니다.'], ['수업 시간을 바꿀 수 있나요?', '정해진 기한 안에 신청하면 다른 시간대로 옮길 수 있습니다.']]),
        cta('내 영어 레벨부터\n확인해 보세요', '레벨 진단 후 맞는 반과 시간대를 안내해 드립니다.', '레벨 진단 신청')] },
    /* 요가 · 필라테스 지도자(운동): 전체 화면 정원 사진 + 아래 정렬 제목 — 조용하고 넓은 여백 */
    't1-ad-wellness': { name: '요가 · 필라테스 지도자 과정', L: 'fullbleed', th: 'warm', pal: 'wellness', cd: 'photo', ck: 'panel', hd: ['overlay', 'cta', 'full'],
      ph: { hero: 'nat-01', about: 'off-03', space: 'sem-01', cta: 'nat-02' },
      build: () => [
        ban({ eyebrow: '지도자 과정 · 원데이 워크숍', title: '몸을 이해하고\n가르치는 사람으로', sub: '해부학과 동작 원리를 배우고, 티칭 실습으로 직접 수업을 이끌어 봅니다.', cta: '과정 상담', cta2: '과정 안내' }),
        T('timeline', { eyebrow: '', title: '지도자 과정의 흐름', cols: [['기초 해부학', '근육과 관절의 움직임'], ['동작 원리', '자세 정렬과 호흡'], ['티칭 실습', '동료 수업으로 지도 연습'], ['평가 · 수료', '시연과 필기 평가']] }),
        cls('개설 과정', '', { n: 3 }),
        people('지도 강사'),
        gal(['nat-02', 'sem-01', 'nat-03'], '정원과 수업 공간 사진'),
        reviews('수료생 후기'),
        faq([['운동 경력이 없어도 되나요?', '과정마다 권장 경험이 다르니 상담에서 지금 상태를 알려 주세요.'], ['수료 후 무엇을 받나요?', '수료 기준을 충족하면 과정 수료증을 드립니다.']]),
        map('오시는 길')] },
    /* 도예 · 목공 공방: 큰 글자(초대형 제목 + 손작업 사진 띠) */
    't1-ad-craft': { name: '도예 · 목공 공방', L: 'typo', th: 'premium', pal: 'clay', cd: 'big', ck: 'photo', hd: ['solid', 'mega', 'full'],
      ph: { hero: 'wrk-06', about: 'wrk-02', space: 'wrk-07', cta: 'wrk-04' },
      build: () => [
        ban({ eyebrow: '도예 · 목공 · 가죽 공예', title: '손으로 만드는\n오래 쓸 물건', sub: '공방 도구를 직접 다루며 그릇 · 가구 · 소품을 처음부터 끝까지 만듭니다.', cta: '클래스 예약', cta2: '정규 과정' }),
        gal(['wrk-02', 'wrk-04', 'sen-04'], '공방 도구와 작업 사진'),
        cls('공방 클래스', '원데이 · 정규 과정을 골라 보세요.', { n: 4 }),
        T('steps', { eyebrow: '', title: '한 작품이 나오기까지', cols: [['도구 익히기', '안전한 사용법부터'], ['형태 잡기', '흙 · 나무로 모양 만들기'], ['다듬기', '표면과 마감 손질'], ['완성', '굽기 · 칠하기 후 가져가기']] }),
        reviews('수강 후기'),
        faq([['완성품은 언제 받나요?', '도예는 건조와 굽기 과정이 있어 완성까지 시간이 걸립니다. 수령 방법은 예약 안내에서 확인하세요.'], ['작업복이 필요한가요?', '앞치마는 준비되어 있고, 편한 옷차림을 권합니다.']]),
        cta('공방에서\n만나요', '단체 · 기업 클래스도 문의해 주세요.', '클래스 예약'),
        map('공방 오시는 길')] },
    /* 디자인 · 영상 툴: 매거진형(명조 큰 제목 + 가로 사진 띠) — 작업물 중심 */
    't1-ad-creative': { name: '디자인 · 영상 툴 클래스', L: 'editorial', th: 'clean', pal: 'magenta', cd: 'photo', ck: 'panel', hd: ['solid', 'min', 'full'],
      ph: { hero: 'art-03', about: 'dsk-04', space: 'lap-05', cta: 'cod-02' },
      build: () => [
        ban({ eyebrow: '디자인 툴 · 영상 편집 · 브랜딩', title: '툴을 배우는 것을 넘어\n내 작업을 완성합니다', sub: '디자인 · 영상 툴을 과제로 익히고, 피드백을 받아 포트폴리오에 넣을 작업으로 다듬습니다.', cta: '과정 둘러보기', cta2: '커리큘럼' }),
        cls('툴별 과정', '', { n: 4 }),
        T('features', { eyebrow: '', title: '과제로 배우는 방식', cols: [['툴 기초', '자주 쓰는 기능부터'], ['주간 과제', '배운 기능으로 작업 하나'], ['피드백', '강사 리뷰와 수정'], ['포트폴리오', '완성 작업 정리']] }),
        people('강사 소개'),
        gal(['dsk-04', 'art-02', 'lap-05'], '작업 책상과 스케치 사진'),
        reviews('수강 후기'),
        cta('어떤 툴부터\n배워야 할까요', '하고 싶은 작업을 알려 주시면 맞는 과정을 추천해 드립니다.', '수강 상담')] },
    /* 면접 · 커리어 코칭: 노와르(먹색 · 금색) — 절제된 고급감 */
    't1-ad-coach': { name: '면접 · 커리어 코칭', L: 'noir', th: 'premium', pal: 'noirgold', cd: 'list', ck: 'panel', hd: ['overlay', 'mega', 'full'],
      ph: { hero: 'off-07', about: 'off-05', space: 'sem-01', cta: 'dsk-05' },
      build: () => [
        ban({ eyebrow: '취업 · 이직 면접 코칭', title: '말하는 법이 바뀌면\n면접이 달라집니다', sub: '모의면접과 1:1 피드백으로 내 경험을 설득력 있게 전하는 법을 연습합니다.', cta: '코칭 신청', cta2: '프로그램 보기' }),
        T('steps', { eyebrow: '', title: '코칭은 이렇게 진행됩니다', cols: [['진단', '지원 직무와 경험 정리'], ['스토리', '답변의 뼈대 만들기'], ['모의면접', '실전과 같은 질문 연습'], ['피드백', '녹화 리뷰로 다듬기']] }),
        cls('코칭 프로그램', '', { n: 4 }),
        gal(['off-05', 'sem-01', 'dsk-05'], '코칭 공간과 책상 사진'),
        people('코치 소개'),
        reviews('코칭 후기'),
        faq([['온라인으로도 받을 수 있나요?', '대면과 화상 코칭 중 선택할 수 있습니다.'], ['어떤 직무를 다루나요?', '신청할 때 지원 직무를 알려 주시면 맞는 코치를 안내해 드립니다.']]),
        cta('다음 면접,\n준비를 시작하세요', '지원 일정과 직무를 알려 주시면 코칭 일정을 잡아 드립니다.', '코칭 신청')] },
    /* 재테크 교육: S3 사진 + 겹친 글자 상자 — 차분한 신뢰 */
    't1-ad-money': { name: '재테크 · 금융 교육', hk: 'box', th: 'official', pal: 'honey', cd: 'list', ck: 'contact', hd: ['solid', 'biz', 'full'],
      ph: { hero: 'lap-03', about: 'dsk-02', space: 'off-04', cta: 'dsk-05' },
      build: () => [
        ban({ eyebrow: '가계 · 금융 상품 · 세금 기초', title: '돈 공부,\n기초부터 차근차근', sub: '가계 관리와 금융 상품, 세금의 기본을 쉬운 말로 배우는 교양 강좌입니다.', cta: '강좌 보기', cta2: '문의하기' }),
        T('tiles', { eyebrow: '', title: '주제별 강좌', cols: [['가계 관리', '예산 · 지출 기록'], ['금융 상품', '예금 · 펀드 · 보험 이해'], ['세금 기초', '연말정산 · 신고 이해'], ['노후 준비', '연금 제도 알아보기']] }),
        cls('이번 달 강좌', '', { n: 4 }),
        T('info', { eyebrow: '', title: '수업 원칙', cols: [['특정 상품을 권하지 않습니다', '판단 기준을 배우는 교육입니다.'], ['쉬운 말로 설명합니다', '용어부터 차근차근 풀어 봅니다.']] }),
        gal(['dsk-02', 'off-04', 'lap-04'], '노트와 강의 공간 사진'),
        notices('강좌 공지', { board: 1 }),
        reviews('수강 후기'),
        cta('무엇부터 배워야\n할지 모르겠다면', '관심 주제를 알려 주시면 맞는 강좌를 안내해 드립니다.', '문의하기')] },
    /* 어학 시험 대비: S3 전면 사진 + 스크림 + 왼쪽 아래 큰 제목 — 목표 점수 */
    't1-ad-testprep': { name: '어학 시험 대비', hk: 'scrim', th: 'clean', pal: 'tomato', cd: 'table', ck: 'panel', hd: ['overlay', 'cta', 'full'],
      ph: { hero: 'lec-01', about: 'dsk-01', space: 'cls-01', cta: 'brd-02' },
      build: () => [
        ban({ eyebrow: '토익 · 토익스피킹 · 오픽', title: '목표 점수까지\n유형별로 전략적으로', sub: '유형별 강의와 실전 모의고사, 오답 분석으로 시험 일정에 맞춰 준비합니다.', cta: '수강신청', cta2: '레벨 상담' }),
        facts(),
        cls('시험별 개설 반', '시험과 목표에 맞는 반을 표로 비교해 보세요.', { n: 6 }),
        T('steps', { eyebrow: '', title: '점수를 올리는 순서', cols: [['진단', '첫 모의고사로 현재 위치 확인'], ['유형 강의', '파트별 풀이 전략'], ['실전 연습', '시간 안에 푸는 연습'], ['오답 분석', '틀린 유형만 다시']] }),
        gal(['dsk-01', 'cls-01', 'brd-02'], '필기 노트와 강의실 사진'),
        reviews('수강 후기'),
        notices('시험 일정 공지'),
        faq([['어느 반부터 들어야 하나요?', '레벨 상담에서 최근 점수와 목표를 확인하고 맞는 반을 안내해 드립니다.'], ['모의고사는 어떻게 보나요?', '반마다 정해진 일정에 실전 모의고사를 봅니다.']]),
        cta('목표 점수와\n시험 날짜를 알려 주세요', '남은 기간에 맞는 수강 계획을 함께 세웁니다.', '레벨 상담')] }
  };

  /* 새 업종 5종(음악 · 북클럽 · 글쓰기 · 사진 · 마케팅) */
  const NEW = {
    /* 성인 음악 레슨: 전체 화면 사진(어두운 건반) — 공연장 같은 첫인상 */
    'ta-music': { name: '성인 음악 레슨(피아노 · 기타)', scene: '취미로 시작하는 성인 피아노 · 기타 개인 · 그룹 레슨', L: 'fullbleed', th: 'premium', pal: 'midnight', cd: 'schedule', ck: 'photo', hd: ['overlay', 'mega', 'full'],
      ph: { hero: 'mus-01', about: 'mus-06', space: 'mus-04', cta: 'mus-07' },
      build: () => [
        ban({ eyebrow: '성인 피아노 · 기타 레슨', title: '좋아하던 그 곡,\n이제 직접 연주해요', sub: '악보를 몰라도 괜찮습니다. 한 곡을 정해 개인 레슨과 연습실로 끝까지 완성합니다.', cta: '체험 레슨 신청', cta2: '레슨 안내' }),
        T('features', { eyebrow: '', title: '레슨 방식', cols: [['개인 레슨', '내 속도에 맞춘 일대일 수업'], ['그룹 레슨', '함께 배우는 앙상블'], ['연습실', '레슨 전후 자유 연습'], ['작은 연주회', '배운 곡을 들려주는 자리']] }),
        cls('레슨 · 시간표', '악기와 요일로 골라 보세요.', { n: 4 }),
        gal(['mus-02', 'mus-05', 'mus-06'], '건반과 기타 사진'),
        people('레슨 선생님'),
        reviews('수강생 후기'),
        cta('첫 곡을\n같이 골라 볼까요', '좋아하는 곡과 연주 경험을 알려 주세요.', '체험 레슨 신청'),
        map('오시는 길')] },
    /* 북클럽 · 독서 모임: 매거진형(명조 큰 제목 · 세로 사진) — 이번 달 책이 주인공 */
    'ta-book': { name: '북클럽 · 독서 모임', scene: '함께 읽고 이야기하는 성인 독서 모임 · 인문학 강좌', L: 'editorial', th: 'campus', pal: 'bordeaux', cd: 'list', ck: 'contact', hd: ['solid', 'min', 'drawer'],
      ph: { hero: 'lib-01', about: 'lib-06', space: 'lib-02', cta: 'lib-05' },
      build: () => [
        ban({ eyebrow: '이달의 책 · 인문학 모임', title: '혼자 읽은 책을\n함께 이야기합니다', sub: '한 달에 한 권, 같은 책을 읽고 모여서 생각을 나눕니다. 진행자가 대화를 이끌어 드립니다.', cta: '모임 신청', cta2: '이달의 책' }),
        cls('모집 중인 모임', '요일과 주제로 모임을 골라 보세요.', { n: 4 }),
        T('steps', { eyebrow: '', title: '모임은 이렇게 열립니다', cols: [['책 공지', '이달의 책과 읽을 범위 안내'], ['혼자 읽기', '밑줄과 질문 남기기'], ['모임', '진행자와 함께 대화'], ['기록', '나눈 이야기를 글로 정리']] }),
        T('info', { eyebrow: '', title: '모임 약속', cols: [['다 읽지 못해도 괜찮습니다', '읽은 만큼 이야기해요.'], ['서로의 생각을 존중합니다', '정답 없는 대화를 나눕니다.']] }),
        gal(['lib-06', 'lib-02', 'dsk-03'], '서가와 책 사진'),
        reviews('참여 후기'),
        notices('모임 소식'),
        cta('다음 모임에서\n만나요', '처음 오시는 분은 모임 방식부터 안내해 드립니다.', '모임 문의')] },
    /* 글쓰기 클래스: 스토리(단계형 흐름) — 초고에서 고쳐 쓰기까지 */
    'ta-writing': { name: '글쓰기 클래스', scene: '에세이 · 기획서 · 콘텐츠 글쓰기 첨삭 클래스', L: 'story', th: 'clean', pal: 'inkpaper', cd: 'list', ck: 'contact', hd: ['solid', 'min', 'full'],
      ph: { hero: 'lap-09', about: 'lap-04', space: 'dsk-03', cta: 'dsk-05' },
      build: () => [
        ban({ eyebrow: '에세이 · 기획서 · 콘텐츠', title: '쓰는 만큼\n문장이 단단해집니다', sub: '매주 한 편을 쓰고, 첨삭을 받아 고쳐 씁니다. 읽히는 글의 구조를 손으로 익힙니다.', cta: '클래스 신청', cta2: '첨삭 방식' }),
        T('steps', { eyebrow: '', title: '한 편을 완성하는 순서', cols: [['주제 정하기', '쓸 거리를 한 문장으로'], ['초고', '마감에 맞춰 일단 쓰기'], ['첨삭', '강사의 문장별 의견'], ['고쳐 쓰기', '다시 쓰고 비교하기']] }),
        gal(['lap-04', 'dsk-03', 'dsk-05'], '노트와 펜이 놓인 책상 사진'),
        cls('개설 클래스', '', { n: 4 }),
        reviews('수강생 후기'),
        people('강사 소개'),
        faq([['글을 써 본 적이 없어도 되나요?', '짧은 글부터 시작하므로 처음 쓰는 분도 참여할 수 있습니다.'], ['첨삭은 어떻게 받나요?', '제출한 글에 문장별 의견을 달아 돌려드립니다.']]),
        cta('첫 문장을\n같이 써 봐요', '쓰고 싶은 글의 종류를 알려 주시면 맞는 클래스를 안내해 드립니다.', '클래스 신청')] },
    /* 사진 클래스: 모자이크(갤러리 우선) — 찍은 장면이 먼저 보이게 */
    'ta-photo': { name: '사진 · 카메라 클래스', scene: '카메라 기초 · 출사 · 보정을 배우는 성인 사진 클래스', L: 'mosaic', th: 'clean', pal: 'granite', cd: 'photo', ck: 'photo', hd: ['solid', 'cols', 'drawer'],
      ph: { hero: 'sen-02', gallery1: 'nat-02', gallery2: 'arc-02', about: 'nat-01', cta: 'off-07' },
      build: () => [
        ban({ eyebrow: '카메라 기초 · 출사 · 보정', title: '보이는 대로가 아니라\n보고 싶은 대로', sub: '노출과 구도를 배우고, 함께 출사를 나가 찍은 사진을 보정까지 마무리합니다.', cta: '클래스 신청', cta2: '출사 일정' }),
        gal(['nat-02', 'arc-02', 'nat-01'], '정원과 도시 풍경 사진'),
        T('timeline', { eyebrow: '', title: '배우는 순서', cols: [['카메라 기초', '노출 · 초점 · 셔터'], ['구도', '빛과 프레임 읽기'], ['출사', '함께 나가서 찍기'], ['보정 · 합평', '고르고 다듬고 이야기하기']] }),
        cls('클래스 · 출사 일정', '', { n: 4 }),
        reviews('수강생 후기'),
        faq([['어떤 카메라가 필요한가요?', '수동 조절이 되는 카메라를 권하며, 휴대폰 사진 클래스도 따로 있습니다.'], ['비가 오면 출사는 어떻게 되나요?', '일정 변경은 공지사항과 문자로 안내합니다.']]),
        notices('출사 공지'),
        cta('다음 출사에\n함께해요', '카메라 종류와 관심 있는 사진을 알려 주세요.', '클래스 신청')] },
    /* 마케팅 실무: S3 좌우 분할(글 + 끝까지 닿는 사진) — 숫자 · 후기를 먼저 */
    'ta-marketing': { name: '마케팅 실무 클래스', scene: '퍼포먼스 · 콘텐츠 · 데이터 마케팅 실무 강의', hk: 'split', th: 'clean', pal: 'violet', cd: 'price', ck: 'contact', hd: ['contact', 'cols', 'drawer'],
      ph: { hero: 'off-02', about: 'dsk-04', space: 'off-05', cta: 'off-07' },
      build: () => [
        ban({ eyebrow: '콘텐츠 · 광고 · 데이터', title: '감이 아니라\n데이터로 하는 마케팅', sub: '광고 집행, 콘텐츠 기획, 성과 분석을 실제 캠페인 과제로 연습합니다.', cta: '강의 보기', cta2: '기업 교육 문의' }),
        facts(),
        reviews('수강 후기'),
        cls('실무 강의', '', { n: 4, price: 1 }),
        gal(['dsk-04', 'off-05', 'lap-10'], '기획 회의와 작업 책상 사진'),
        T('tiles', { eyebrow: '', title: '분야별 강의', cols: [['콘텐츠 기획', '채널별 콘텐츠 설계'], ['광고 운영', '캠페인 구조와 예산'], ['데이터 분석', '지표 설계와 보고'], ['브랜딩', '메시지와 톤 정리']] }),
        T('steps', { eyebrow: '', title: '캠페인 과제로 배웁니다', cols: [['목표 설정', '지표와 대상 정하기'], ['기획', '메시지와 채널 고르기'], ['집행', '소액 캠페인 운영 연습'], ['분석', '결과 보고서 작성']] }),
        cta('팀 단위로\n배우고 싶다면', '인원과 목표를 알려 주시면 기업 교육 과정을 안내해 드립니다.', '기업 교육 문의')] }
  };

  const tone = { warm: '따뜻', kids: '친근', official: '신뢰', campus: '신뢰', premium: '모던', tech: '모던', clean: '모던', senior: '친근' };
  const palAcc = id => { try { const p = window.HPC && HPC.get(id); return p && p.acc; } catch (e) { return ''; } };
  Object.keys(NEW).forEach(id => { if (TPL.some(t => t && t.id === id)) return; const c = NEW[id];
    TPL.push({ id, name: c.name, types: ['adult'], scene: c.scene, color: palAcc(c.pal) || '#333333', tone: tone[c.th] || '모던', ref: c.scene, theme: c.th, hero: '', build: () => [], by: 'ta' });
    CFG[id] = c; });

  /* ── 템플릿 덮어쓰기 ── */
  const HK2HERO = { split: 'split', box: 'center', scrim: 'bg', grid: 'center' };
  /* ── FD2 eyebrow 한글화(R1 M2 · RULES_B2 5 '영어만 있는 eyebrow 금지'): 영문만 있는 작은 머리말을 한글 라벨로 바꾼다.
     대학은 한영 병기(한글 · ENGLISH)를 허용한다. 사전에 없는 영문 문구는 지운다(빈 eyebrow = 표시 안 함). 한글이 들어 있으면 그대로 둔다. */
  const EB_P = { 'NOTICE': '공지', 'NEWS': '소식', 'REVIEWS': '수강 후기', 'COURSES': '강좌', 'CLASSES': '강좌', 'CLASS': '강좌', 'COURSE': '과정', 'GUIDE': '안내', 'ROADMAP': '로드맵',
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

  /* ── FD2 유형 간 재배치(R1 H1 · M1, fix6/BRIEF7): 유형마다 주력 계열 5~6개만 쓴다 — 성인 = editorial · mosaic · bento · splitscreen · typo · fullbleed + S3. collage · noir · portal · bulletin · sidebar · story는 뺀다.
     같은 계열을 다른 유형도 쓰면 변형(layoutVar, FD1 HPL.vars)을 서로 다르게 고른다. 머리글 · 바닥글은 FA의 유형별 허용 목록 안에서 2~3종으로 나눈다.
     [계열 또는 'hk:<S3 첫 화면>', 변형, 머리글, 바닥글] — 휴대폰 메뉴(hd[2])는 그대로 둔다 */
  const FD2 = {
    'adult-bootcamp': ['bento', 'b', 'float', 'mega'],
    'adult-cert': ['hk:grid', '', 'left', 'split'],
    'adult-hobby': ['mosaic', 'b', 'float', 'min'],
    'adult-lang': ['hk:grid', '', 'center', 'mega'],
    'solo-creator': ['splitscreen', 'b', 'center', 'min'],
    't1-ad-license': ['hk:box', '', 'left', 'split'],
    't1-ad-civil': ['typo', 'a', 'left', 'mega'],
    't1-ad-office': ['bento', 'a', 'center', 'split'],
    't1-ad-talk': ['hk:split', '', 'float', 'min'],
    't1-ad-wellness': ['fullbleed', 'c', 'center', 'min'],
    't1-ad-craft': ['mosaic', 'c', 'left', 'mega'],
    't1-ad-creative': ['editorial', 'b', 'float', 'split'],
    't1-ad-coach': ['splitscreen', 'c', 'center', 'split'],
    't1-ad-money': ['hk:box', '', 'float', 'mega'],
    't1-ad-testprep': ['hk:scrim', '', 'left', 'split'],
    'ta-music': ['hk:scrim', '', 'overlay', 'min'],
    'ta-book': ['editorial', 'a', 'center', 'mega'],
    'ta-writing': ['typo', 'b', 'float', 'min'],
    'ta-photo': ['fullbleed', 'b', 'overlay', 'mega'],
    'ta-marketing': ['hk:split', '', 'left', 'mega']
  };
  Object.keys(FD2).forEach(id => { const c = CFG[id], v = FD2[id]; if (!c) return;
    if (v[0].indexOf('hk:') === 0) { delete c.L; c.hk = v[0].slice(3); } else { c.L = v[0]; delete c.hk; }
    c.lv = v[1] || ''; c.hd = [v[2], v[3], A(c.hd)[2] || 'full']; });

  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'adult') return;
    const c = CFG[id];
    tp.tpA = 1; tp.theme = c.th; tp.palette = c.pal; if (c.name) tp.name = c.name;
    const acc = palAcc(c.pal); if (acc) tp.color = acc;
    if (c.L) { tp.layout = c.L; tp.hero = ''; } else { delete tp.layout; tp.hero = HK2HERO[c.hk] || ''; }
    tp.photos = Object.assign({}, c.ph);
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    if (c.L && c.lv) tp.layoutVar = c.lv; else delete tp.layoutVar;
    delete tp.deco; /* 원 · 링 · 줄무늬 장식 CSS 걷어냄 */
    tp.build = () => { const L = A(c.build()).filter(Boolean);
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner' && c.hk) d.hk = c.hk;
        if (x.type === 'text' && d.variant === 'cta' && c.ck && !d.ck) d.ck = c.ck;
        if (x.type === 'classes' && c.cd && !d.card) d.card = c.cd; });
      return L; };
  });

  /* FD2: 내 템플릿의 모든 섹션 eyebrow를 마지막에 한글화(덧붙인 섹션 포함) */
  Object.keys(CFG).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || !tp.tpA || A(tp.types)[0] !== 'adult') return; const b0 = tp.build;
    tp.build = () => { const L = A(b0()); L.forEach(x => { if (x && x.data && x.data.eyebrow) x.data.eyebrow = EB(x.data.eyebrow, false); }); return L; }; });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpA && A(tp.types)[0] === 'adult') {
          /* 계열은 성인 기관에서만 건다: 다른 유형 기관(예: voc의 추천 1순위가 adult-bootcamp)에서는 AI 마법사 시안 3개가 이전 사이트의 계열을 물려받아 첫 화면이 같아진다(hpwiz 문제 · 코어 변경 요청) */
          const orgTy = (() => { try { return S.org.type; } catch (e) { return 'adult'; } })();
          if (tp.layout && orgTy === 'adult' && window.HPL && HPL.fam && HPL.fam[tp.layout]) { if (typeof HPL.apply === 'function') HPL.apply(s, tp.layout); else s.layout = tp.layout; } else delete s.layout;
          if (s.layout && tp.layoutVar) s.layoutVar = tp.layoutVar; else delete s.layoutVar; /* FD2: 계열 변형(FD1 HPL.vars) */
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const v = HPSTOCK.slotImg(tp.photos[sl], sl); if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-adult siteFromTpl', e); }
      return s; };
    Object.keys(base).forEach(k => { try { f[k] = base[k]; } catch (e) {} });
    siteFromTpl = f; window.siteFromTpl = f; }
})();
