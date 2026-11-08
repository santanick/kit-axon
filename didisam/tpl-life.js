/* v34.5 tpl-life — 유형 디자이너 TL: lifelong(평생교육원 · 평생학습관 · 시니어 · 문화센터 · 주민 학습) 템플릿 재배치 (fix6/BRIEF5.md)
   뼈대: RULES_B2 '평생교육 · 시니어' — 첫 화면(강좌 찾기 · 신청) → 분야 → 모집 중 강좌(접수 · 시간 · 장소) → 공지 · 소식 → 대표번호 · 신청 띠.
         시니어는 senior 테마(본문 18 · 버튼 56) + 큰 글자 팔레트(bigblue · bigforest).
   - types[0]이 lifelong인 템플릿 12종(global.js 2 + tpl-b.js 10)을 id로 찾아 덮어쓰고, 업종이 비어 있던 4종(건강 · 외국어 · 대학 평생교육원 비학위 · 자격)을 새로 더한다(id 접두어 tl-).
     원본 파일은 고치지 않는다. 공유 템플릿(univ-lifelong · t2-univ-cll · adult-hobby · solo-creator · t3-v-care · t3-v-midlife)은 각 유형 디자이너 몫이라 손대지 않는다.
   - 16종이 서로 다른 구조를 갖도록 레이아웃 계열(HPL) 11종을 쓰고(collage는 adult-hobby와 겹쳐 비워 둠 · fullbleed 2), 나머지 4종은 S3 사진 첫 화면(box · split · scrim · grid)으로 둔다.
   - 템플릿마다: layout · theme · palette(HPC, 서로 다름) · photos(HPSTOCK, 첫 화면 사진 서로 다름) · hps(머리글 · 바닥글 · 휴대폰 메뉴) · 강좌 카드 · 섹션 구성(업종별로 다시 씀)
   - 사실 원칙: 숫자는 실제 숫자 띠(hpt:'facts')만, 강사는 등록된 강사만, 후기는 실제 후기만, 연락처는 설정값만. 문구에 실적 · 횟수 · 인원 약속을 넣지 않는다.
   - tpl-b가 덧붙이던 템플릿 전용 장식 CSS(점선 카드 · 비정형 번호 원 등)는 내 템플릿에서 걷어낸다. */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function' || typeof S2 !== 'function') return;
  const A = v => Array.isArray(v) ? v : [];
  const T = (variant, data) => S2('text', { variant, ...data });
  const ids = n => { try { return pubCls(n); } catch (e) { return []; } };
  const ft = () => (S.settings && S.settings.footer) || {};
  const ban = d => S2('banner', d);
  const cls = (title, sub, o) => S2('classes', { eyebrow: '', title, sub: sub || '', ids: ids(o && o.n || 4), layout: 'grid', ...(o && o.price ? { price: true } : {}) });
  const facts = (title) => T('stats', { hpt: 'facts', title: title || '', cols: [] });
  const people = (title) => T('profiles', { hpt: 'people', eyebrow: '', title, cols: [] });
  const reviews = (title) => S2('reviews', { eyebrow: '', title, note: '' });
  const notices = (title, o) => S2('notices', { eyebrow: '', title: title || '공지사항', n: (o && o.n) || 4, ...(o && o.board ? { variant: 'board' } : {}) });
  const faq = (title, cols) => T('info', { hpt: 'faq', eyebrow: '', title: title || '자주 묻는 질문', cols });
  const cta = (title, body, btn, ck) => T('cta', { eyebrow: '', title, body, cta: btn || '신청하기', cols: [], ...(ck ? { ck } : {}) });
  const map = title => S2('map', { title: title || '오시는 길', addr: ft().addr || '', tel: ft().tel || '' });
  /* 사진 띠: 샘플 사진 2~3장(분위기 사진 · 캡션 없음). 바로 고치기에서 '갤러리' 자리로 교체된다 */
  const gal = (P, alt) => { const H = window.HPSTOCK; const L = (H && Array.isArray(H.list)) ? P.map(id => H.list.find(x => x.id === id)).filter(Boolean) : [];
    return L.length >= 2 ? S2('image', { title: '', alt: alt || '배움 공간 분위기 사진', imgs: L.map(x => ({ src: x.src800 || x.src, title: '' })), dstyle: 2, hpiSlot: 'gallery' }) : null; };

  /* ── 템플릿별 설정 ──
     cd: 강좌 카드(S2: photo · list · price · schedule · big · table) · L: 계열(없으면 S3 첫 화면 hk) · th: 테마 · pal: 팔레트
     ph: { hero, about, space, cta, gallery } · hd: [머리글, 바닥글, 휴대폰 메뉴] · ck: 신청 띠 · build: 섹션 */
  const CFG = {
    /* 시민 평생학습관: 포털형(강좌 찾기 · 빠른 메뉴 · 공지가 첫 화면에) — 지자체 학습관의 기본 시작점 */
    'life-city': { cd: 'schedule', name: '시민 평생학습관', L: 'portal', th: 'official', pal: 'civic', ph: { hero: 'hum-11', about: 'cls-02', space: 'lib-03', cta: 'sem-01' }, hd: ['notice', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '시민 평생학습관', title: '배우고 싶은 강좌를\n가까운 곳에서', sub: '인문 · 문화예술 · 건강 · 직업 강좌를 분기마다 열고, 온라인과 방문으로 신청을 받습니다.', cta: '강좌 찾기', cta2: '수강 안내' }),
        notices('공지사항', { n: 5 }),
        T('tiles', { eyebrow: '', title: '분야별 강좌', cols: [['인문 · 교양', '역사 · 문학 · 철학'], ['문화 · 예술', '음악 · 미술 · 공예'], ['건강 · 생활', '운동 · 요리 · 생활 기술'], ['직업 · 디지털', '자격 준비 · 디지털 실무']] }),
        cls('이번 분기 모집 강좌', '접수 기간과 수업 시간, 장소를 확인하고 신청하세요.', { n: 6 }),
        T('info', { eyebrow: '', title: '수강 안내', cols: [['대상', '지역 주민 누구나'], ['신청', '온라인 · 방문 접수'], ['개강', '강좌별 최소 인원이 모이면 개강'], ['학습비 반환', '평생교육 관련 법령의 반환 기준을 따릅니다']] }),
        gal(['cls-02', 'lib-03', 'sem-01'], '강의실과 서가 사진'),
        cta('어떤 강좌가 맞을지\n고민된다면', '학습 상담을 남겨 주시면 담당자가 분야와 일정을 안내해 드립니다.', '학습 상담 신청'),
        map('오시는 길')] },
    /* 평생학습 도시: 알림판형(공지 · 소식 · 일정 2단) — 축제 · 사업 공모 · 동아리 지원 안내가 많은 도시 단위 학습센터 */
    't2-life-hub': { cd: 'table', name: '평생학습 도시 · 학습센터', L: 'bulletin', th: 'official', pal: 'dancheong', ph: { hero: 'cam-05', about: 'arc-03', space: 'lec-01', cta: 'stu-02' }, hd: ['notice', 'biz', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '평생학습 도시', title: '도시 전체가\n배움터가 됩니다', sub: '읍 · 면 · 동 학습 공간과 동아리, 시민 강사를 이어 누구나 가까운 곳에서 배우도록 돕습니다.', cta: '이달의 강좌', cta2: '사업 공모 안내' }),
        notices('알림 · 공모', { n: 5, board: 1 }),
        T('features', { eyebrow: '', title: '학습센터가 하는 일', cols: [['동네 배움터', '가까운 공간에서 열리는 강좌'], ['학습 동아리 지원', '모임 공간과 활동을 지원'], ['시민 강사 양성', '배운 것을 이웃에게 가르치기'], ['평생학습 축제', '한 해의 배움을 나누는 자리']] }),
        cls('이달의 강좌', '', { n: 5 }),
        gal(['arc-03', 'lec-01', 'stu-02'], '도시 전경과 강의실, 모임 사진'),
        T('timeline', { eyebrow: '', title: '한 해의 평생학습 일정', cols: [['봄', '상반기 강좌 개강 · 동아리 모집'], ['여름', '방학 가족 프로그램'], ['가을', '하반기 강좌 · 평생학습 축제'], ['겨울', '성과 공유회 · 다음 해 수요 조사']] }),
        facts(),
        cta('우리 동네에도\n배움터가 필요하다면', '모임 공간이나 강좌 개설을 원하시면 담당 부서로 문의해 주세요.', '학습 공간 문의')] },
    /* 시니어 디지털 배움터: S3 사진 + 글자 상자(큰 글씨) — 따라 하기 쉬운 단계와 전화 신청이 먼저 */
    'life-senior': { cd: 'big', name: '시니어 디지털 배움터', th: 'senior', pal: 'bigblue', hk: 'box', ph: { hero: 'hum-09', about: 'lap-10', space: 'cls-02', cta: 'sen-03' }, hd: ['contact', 'biz', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '어르신 디지털 교실', title: '스마트폰,\n천천히 함께 배워요', sub: '큰 글씨 교재와 전화 상담으로 처음이어도 쉽게 시작합니다.', cta: '전화로 신청하기', cta2: '배우는 내용' }),
        T('steps', { eyebrow: '', title: '신청은 이렇게 해요', cols: [['교실 고르기', '아래에서 배우고 싶은 교실을 골라요'], ['신청하기', '버튼을 누르거나 전화로 말씀해 주세요'], ['문자 확인', '수업 날짜를 문자로 알려 드려요'], ['수업 참여', '평소 쓰는 휴대폰을 가져오세요']] }),
        cls('신청할 수 있는 교실', '글씨가 크고 천천히 진행하는 교실입니다.', { n: 4 }),
        T('features', { eyebrow: '', title: '배우는 내용', cols: [['스마트폰 기초', '전화 · 문자 · 사진 보내기'], ['영상 통화', '가족 얼굴 보며 통화하기'], ['키오스크', '식당 · 병원 무인 주문기'], ['안전한 금융', '송금 · 사기 문자 구별하기']] }),
        gal(['lap-10', 'sen-03', 'cls-02'], '노트북과 창가 카페, 교실 사진'),
        reviews('배우신 분들의 이야기'),
        faq('', [['휴대폰을 잘 몰라도 되나요?', '처음 쓰시는 분을 기준으로 한 단계씩 천천히 진행합니다.'], ['신청이 어려우면 어떻게 하나요?', '전화나 방문으로 말씀해 주시면 직원이 대신 신청해 드립니다.']]),
        map('전화 · 방문 신청')] },
    /* 복지관 배움교실: S3 좌우 분할(큰 글씨 · 큰 버튼) — 산책 · 여가 사진, 교실 안내표와 오시는 길 */
    't2-life-silver': { cd: 'list', name: '어르신 복지관 배움교실', th: 'senior', pal: 'bigforest', hk: 'split', ph: { hero: 'sen-01', about: 'sen-02', space: 'sen-04', cta: 'mus-03' }, hd: ['contact', 'cols', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '복지관 배움교실', title: '배우는 즐거움,\n복지관에서 함께해요', sub: '건강 체조 · 노래 · 서예 · 스마트폰 교실을 엽니다. 전화나 방문으로도 신청하실 수 있어요.', cta: '교실 신청하기', cta2: '이용 안내' }),
        cls('지금 신청할 수 있는 교실', '', { n: 4 }),
        T('info', { eyebrow: '', title: '이용 안내', cols: [['누가', '지역 어르신 누구나'], ['어떻게', '온라인 · 전화 · 방문 신청'], ['준비물', '교실마다 미리 알려 드려요'], ['도움', '신청이 어려우면 직원이 도와드려요']] }),
        gal(['sen-02', 'sen-04', 'sen-03'], '여가를 즐기는 어르신들의 뒷모습과 손 사진'),
        notices('알림'),
        cta('신청이 어려우세요?', '전화나 방문으로 말씀해 주시면 직원이 대신 신청해 드립니다.', '도움 요청하기'),
        map('찾아오시는 길')] },
    /* 50+ 인생 2막: 전체 화면 사진(정원 · 석탑) — 차분한 고급감, 세 갈래 프로그램과 인생 설계 상담 */
    't2-life-50plus': { cd: 'big', name: '50+ 인생 2막 캠퍼스', L: 'fullbleed', th: 'premium', pal: 'bordeaux', ph: { hero: 'nat-01', about: 'sen-03', space: 'off-03', cta: 'dsk-05' }, hd: ['overlay', 'mega', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '중장년 인생 설계', title: '오십 이후의 시간,\n새롭게 설계합니다', sub: '인생 설계 상담부터 일과 사회 참여, 취미와 건강까지 다음 시간을 준비하는 강좌를 엽니다.', cta: '인생 설계 상담', cta2: '강좌 둘러보기' }),
        T('features', { eyebrow: '', title: '세 갈래 프로그램', cols: [['인생 설계', '재무 · 건강 · 관계를 함께 점검'], ['일 · 사회 참여', '새 일 준비와 지역 활동 연결'], ['취미 · 문화', '배우고 나누는 여가 생활']] }),
        cls('지금 모집 중인 강좌', '', { n: 4 }),
        gal(['sen-03', 'off-03', 'nat-02'], '창가 카페와 라운지, 산책로 사진'),
        T('steps', { eyebrow: '', title: '처음 오셨다면', cols: [['상담', '관심 분야와 계획을 나눠요'], ['강좌 선택', '맞는 강좌를 함께 골라요'], ['참여', '온 · 오프라인으로 배워요'], ['연결', '동아리 · 지역 활동으로 이어가요']] }),
        reviews('먼저 시작한 분들의 이야기'),
        cta('다음 십 년을\n함께 그려 보세요', '지금 고민을 남겨 주시면 상담 일정을 안내해 드립니다.', '상담 신청')] },
    /* 디지털 · AI 생활 배움터: 벤토 격자(코드 화면 · 강좌 칸 · 숫자 칸) — 전 세대 생활 디지털 · AI 활용 */
    't2-life-digital': { cd: 'photo', name: '디지털 · AI 생활 배움터', L: 'bento', th: 'tech', pal: 'sky', ph: { hero: 'hum-07', about: 'cod-03', space: 'cls-03', cta: 'lap-03' }, hd: ['float', 'cols', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '생활 디지털 · AI', title: '생활에 쓰는\n디지털과 AI', sub: '스마트폰 활용부터 생성형 AI로 글 쓰고 사진 다듬기까지, 생활과 일에 바로 쓰는 것을 배웁니다.', cta: '수업 신청하기', cta2: '배우는 내용' }),
        cls('모집 중인 수업', '', { n: 4 }),
        T('features', { eyebrow: '', title: '네 갈래 과정', cols: [['생활 디지털', '모바일 민원 · 예약 · 결제'], ['AI 활용', '대화형 AI로 글 · 요약 · 번역'], ['사진 · 영상', '찍고 고르고 짧게 편집하기'], ['정보 보호', '개인정보와 사기 예방']] }),
        T('timeline', { eyebrow: '', title: '단계별로 배워요', cols: [['입문', '기기와 앱 기본 익히기'], ['활용', '생활 업무를 디지털로'], ['응용', 'AI 도구로 문제 해결'], ['나눔', '배운 것을 이웃에게 알려 주기']] }),
        facts(),
        reviews('수강 후기'),
        cta('지금 수준에 맞는\n수업을 찾아 드려요', '쓰는 기기와 배우고 싶은 것을 남겨 주시면 맞는 수업을 안내해 드립니다.', '수업 상담')] },
    /* 시민 인문학: 매거진형(명조 제목 · 강연장 사진 · 목차형 강좌) */
    't2-life-humanities': { cd: 'list', name: '시민 인문학 아카데미', L: 'editorial', th: 'campus', pal: 'maple', ph: { hero: 'hum-13', about: 'lib-06', space: 'lib-02', cta: 'lib-05' }, hd: ['solid', 'min', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '시민 인문학 연속 강좌', title: '생각을 넓히는\n저녁의 인문학', sub: '철학 · 역사 · 문학 · 예술을 한 주제씩 깊이 읽고, 함께 이야기 나누는 연속 강좌입니다.', cta: '이번 분기 강좌', cta2: '수강 안내' }),
        T('features', { eyebrow: '', title: '네 개의 서가', cols: [['철학', '오래된 질문을 오늘의 말로'], ['역사', '사건 너머의 사람을 읽기'], ['문학', '한 권을 천천히 함께 읽기'], ['예술', '작품을 보는 눈 기르기']] }),
        cls('이번 분기 강좌', '', { n: 4 }),
        T('steps', { eyebrow: '', title: '한 강좌의 흐름', cols: [['읽기', '미리 나눠 드린 자료 읽기'], ['강의', '주제 강의와 질문'], ['토론', '소모임으로 생각 나누기'], ['정리', '한 줄 소감과 다음 주제']] }),
        people('강좌를 여는 강사'),
        reviews('수강생 후기'),
        notices('강좌 공지'),
        cta('듣고 싶은 주제가\n있나요?', '다음 분기 강좌로 다뤘으면 하는 주제를 남겨 주세요.', '주제 제안하기')] },
    /* 생활문화 공방: 모자이크(도예 · 공구 · 물감 사진 격자) — 사진이 먼저 말하는 공방 */
    't2-life-craft': { cd: 'photo', name: '생활문화 · 공예 공방', L: 'mosaic', th: 'warm', pal: 'clay', ph: { hero: 'hum-23', about: 'wrk-02', space: 'art-06', gallery: 'art-03', cta: 'sen-04' }, hd: ['float', 'cta', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '생활문화 · 공예', title: '손으로 만들고\n함께 즐기는 시간', sub: '도자 · 목공 · 가죽 · 그림 강좌를 처음 오시는 분도 부담 없이 시작할 수 있게 엽니다.', cta: '강좌 예약하기', cta2: '이번 달 일정' }),
        cls('이번 달 강좌', '', { n: 4 }),
        T('features', { eyebrow: '', title: '공방에서 배우는 것', cols: [['도자', '흙을 빚고 굽는 생활 그릇'], ['목공', '손 공구로 만드는 작은 가구'], ['가죽', '바느질로 완성하는 소품'], ['그림', '수채화 · 드로잉']] }),
        T('steps', { eyebrow: '', title: '예약은 이렇게', cols: [['강좌 고르기', '날짜와 분야를 확인해요'], ['신청', '온라인으로 신청해요'], ['재료 안내', '준비물을 문자로 받아요'], ['참여', '작품을 완성해 가져가요']] }),
        reviews('수강 후기'),
        cta('모임 · 단체 수업을\n원하시나요?', '인원과 희망 날짜를 남겨 주시면 가능한 일정을 안내해 드립니다.', '단체 수업 문의'),
        map('공방 오시는 길')] },
    /* 원격평생교육원(학점은행): 사이드 메뉴형(왼쪽 고정 학습 메뉴) — 학위 과정 · 수강 신청 · 학습 지원 포털 */
    't2-life-credit': { cd: 'price', name: '원격평생교육원(학점은행)', L: 'sidebar', th: 'clean', pal: 'slate', ph: { hero: 'hum-36', about: 'lap-09', space: 'stu-01', cta: 'lap-01' }, hd: ['solid', 'cols', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '원격평생교육원 · 학점은행', title: '일하면서 채우는\n학위 학점', sub: '온라인 학점 과목을 학기마다 열고, 학습 설계부터 학점 인정 신청까지 안내합니다.', cta: '개설 과목 보기', cta2: '학습 설계 상담' }),
        T('tiles', { eyebrow: '', title: '학위 과정 찾기', cols: [['사회복지', '전공 · 교양 과목'], ['경영 · 회계', '전공 · 교양 과목'], ['아동 · 보육', '전공 · 교양 과목'], ['심리 · 상담', '전공 · 교양 과목']] }),
        cls('이번 학기 개설 과목', '과목을 눌러 학점과 수강 기간을 확인하세요.', { n: 6, price: 1 }),
        T('steps', { eyebrow: '', title: '학위까지의 흐름', cols: [['학습 설계', '전공과 필요 학점 확인'], ['수강 신청', '학기별 과목 선택'], ['온라인 수강', '강의 · 과제 · 시험'], ['학점 인정 신청', '정해진 기간에 신청']] }),
        gal(['lap-09', 'stu-01', 'lap-01'], '노트와 노트북으로 공부하는 책상 사진'),
        notices('학사 공지', { board: 1 }),
        faq('', [['학점은 어떻게 인정받나요?', '과목을 이수한 뒤 정해진 기간에 학점 인정 신청을 하면 됩니다. 절차는 학사 공지에서 안내합니다.'], ['휴대폰으로도 들을 수 있나요?', 'PC와 휴대폰 모두에서 수강할 수 있고 이어 보기 위치가 저장됩니다.']])] },
    /* 가족 · 부모 교육센터: 전체 화면 사진(아이와 어른이 함께 흙을 빚는 손) — 함께하는 장면이 먼저 말하는 센터 */
    't2-life-family': { cd: 'big', name: '가족 · 부모 교육센터', L: 'fullbleed', th: 'kids', pal: 'hearth', ph: { hero: 'hum-25', about: 'kid-03', space: 'lib-04', gallery: 'kid-01', cta: 'art-02' }, hd: ['overlay', 'cta', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '부모 교육 · 가족 프로그램', title: '아이와 함께\n자라는 부모 교실', sub: '부모 교육, 가족 소통, 아이와 함께하는 주말 프로그램을 계절마다 엽니다.', cta: '프로그램 신청', cta2: '이번 계절 일정' }),
        T('tiles', { eyebrow: '', title: '누구와 함께 오시나요?', cols: [['예비 · 초보 부모', '첫 육아 준비'], ['영유아 가족', '놀이와 발달 이해'], ['초등 가족', '대화 · 습관 · 진로'], ['조부모', '손주와 함께하는 시간']] }),
        cls('이번 계절 프로그램', '', { n: 4 }),
        T('features', { eyebrow: '', title: '프로그램 갈래', cols: [['부모 교육', '발달 · 대화 · 훈육 이해'], ['가족 놀이', '주말에 함께 만들고 놀기'], ['소모임', '비슷한 고민의 부모 모임']] }),
        reviews('참여 가족 이야기'),
        notices('센터 알림'),
        cta('우리 가족에게 맞는\n프로그램이 궁금하다면', '아이 나이와 관심사를 남겨 주시면 맞는 프로그램을 안내해 드립니다.', '상담 신청')] },
    /* 재취업 · 경력 이음: 좌우 분할(어두운 글 판 + 밝은 회의실 사진) — 상담 → 준비 → 연결 */
    't2-life-career': { cd: 'schedule', name: '중장년 재취업 · 경력 이음', L: 'splitscreen', th: 'clean', pal: 'ochre', ph: { hero: 'hum-10', about: 'off-04', space: 'off-05', cta: 'dsk-02' }, hd: ['solid', 'cols', 'drawer'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '경력 이음 · 재취업', title: '쉬었던 경력,\n다시 이어 갑니다', sub: '경력 상담, 직무 교육, 자격 준비를 단계별로 이어 새 일을 준비하도록 돕습니다.', cta: '취업 상담 신청', cta2: '과정 일정' }),
        T('steps', { eyebrow: '', title: '준비는 이렇게 이어집니다', cols: [['경력 상담', '지금 상황과 희망 직무 확인'], ['직무 교육', '필요한 실무 다시 익히기'], ['자격 준비', '직무에 맞는 자격 과정'], ['구직 연결', '이력서 · 면접 준비']] }),
        cls('모집 중인 과정', '접수 기간과 수업 시간을 확인하세요.', { n: 4 }),
        T('features', { eyebrow: '', title: '함께 준비하는 것', cols: [['이력서 · 자기소개', '공백 기간을 강점으로 정리'], ['디지털 실무', '문서 · 협업 도구 다시 익히기'], ['모의 면접', '실전처럼 연습하고 피드백']] }),
        facts(),
        reviews('수료생 이야기'),
        cta('경력이 끊긴 기간이\n길어도 괜찮습니다', '지금 상황을 남겨 주시면 상담 일정을 안내해 드립니다.', '취업 상담 신청')] },
    /* 마을 학습공동체: 이야기형(모임 제안 → 회원 → 활동 → 나눔을 세로 줄기로) */
    't2-life-village': { cd: 'list', name: '마을 학습공동체 · 학습 동아리', L: 'story', th: 'warm', pal: 'sage', ph: { hero: 'hum-04', about: 'nat-03', space: 'off-03', cta: 'off-04' }, hd: ['notice', 'cta', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '마을 학습공동체', title: '이웃이 선생님이 되는\n마을 배움터', sub: '주민이 직접 여는 강좌와 학습 동아리로, 배운 것을 이웃과 나누는 마을 학습공동체입니다.', cta: '동아리 둘러보기', cta2: '동아리 만들기' }),
        T('steps', { eyebrow: '', title: '동아리는 이렇게 시작해요', cols: [['모임 제안', '주제와 모임 방식을 정해요'], ['회원 모으기', '게시판으로 이웃을 모아요'], ['활동 기록', '모임 일지를 남겨요'], ['나눔', '발표회 · 나눔 강좌로 이어가요']] }),
        T('features', { eyebrow: '', title: '마을에서 함께하는 배움', cols: [['학습 동아리', '관심사가 같은 이웃과 모임'], ['배움 나눔', '내가 아는 것을 이웃에게'], ['마을 강좌', '주민이 기획하는 생활 강좌'], ['발표회', '배운 것을 함께 보여 주는 날']] }),
        cls('참여할 수 있는 강좌', '', { n: 4 }),
        reviews('함께한 이웃 이야기'),
        notices('마을 소식'),
        cta('우리 동네 동아리를\n시작해 보세요', '모임 주제를 남겨 주시면 공간과 홍보를 함께 도와드립니다.', '동아리 제안하기'),
        map('배움터 오시는 길')] }
  };

  /* ── 새 템플릿: 업종이 비어 있던 곳(건강 · 외국어 · 대학 평생교육원 비학위 · 자격) ── */
  const NEW = {
    /* 건강 · 마음 돌봄: 큰 글자(초대형 제목 + 흙 · 정원 사진 띠) — 몸과 마음을 돌보는 생활 건강 강좌 */
    'tl-life-health': { cd: 'schedule', name: '건강 · 마음 돌봄 교실', scene: '걷기 · 체조 · 명상 · 식생활 생활 건강 강좌', ref: '생활 건강 강좌형 — 큰 타이포 첫 화면 · 하루 루틴 · 요일별 강좌', color: '#3F7D5A',
      L: 'typo', th: 'clean', pal: 'wellness', ph: { hero: 'nat-03', about: 'sen-04', space: 'nat-02', cta: 'lap-09' }, hd: ['solid', 'min', 'drawer'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '생활 건강 · 마음 돌봄', title: '몸과 마음을\n돌보는 한 시간', sub: '걷기 · 체조 · 명상 · 식생활 강좌로 매일 이어 갈 수 있는 건강 습관을 만듭니다.', cta: '강좌 신청하기', cta2: '요일별 일정' }),
        T('features', { eyebrow: '', title: '네 가지 돌봄', cols: [['몸', '걷기 · 스트레칭 · 체조'], ['호흡 · 명상', '쉬어 가는 법 익히기'], ['식생활', '제철 재료로 차리는 한 끼'], ['마음', '감정 일기와 대화 모임']] }),
        cls('요일별 강좌', '수업 시간과 장소를 확인하고 신청하세요.', { n: 5 }),
        gal(['sen-04', 'nat-02', 'lap-09'], '정원과 손, 차분한 책상 사진'),
        T('steps', { eyebrow: '', title: '처음 오셨다면', cols: [['몸 상태 알리기', '신청할 때 불편한 곳을 적어 주세요'], ['강좌 고르기', '강도와 요일을 확인해요'], ['참여', '편한 옷과 물을 준비해요']] }),
        reviews('참여하신 분들의 이야기'),
        faq('', [['운동을 오래 쉬었는데 괜찮을까요?', '강좌마다 강도를 안내합니다. 불편한 곳이 있으면 신청할 때 알려 주시면 맞춰 진행합니다.'], ['준비물이 있나요?', '편한 옷과 물이면 충분합니다. 강좌별 준비물은 공지에서 안내합니다.']]),
        cta('나에게 맞는 강도부터\n시작하세요', '궁금한 점을 남겨 주시면 맞는 강좌를 안내해 드립니다.', '강좌 상담')] },
    /* 시민 외국어 교실: S3 전면 사진 + 스크림(캠퍼스 잔디) — 레벨 확인 → 반 배정 */
    'tl-life-lang': { cd: 'table', name: '시민 외국어 교실', scene: '영어 · 일본어 · 중국어 회화와 여행 외국어', ref: '시민 외국어형 — 전면 사진 첫 화면 · 언어별 반 표 · 레벨 확인', color: '#2F5E8C',
      th: 'warm', pal: 'dusk', hk: 'scrim', ph: { hero: 'hum-03', about: 'dsk-02', space: 'cls-04', cta: 'lib-05' }, hd: ['overlay', 'mega', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '시민 외국어 교실', title: '여행에서, 일에서\n한마디 더 말하기', sub: '영어 · 일본어 · 중국어 회화를 수준별 소규모 반으로 열고, 처음 배우는 분을 위한 입문반도 함께 운영합니다.', cta: '반 배정 상담', cta2: '언어별 반 보기' }),
        T('tiles', { eyebrow: '', title: '언어별 반', cols: [['영어', '입문 · 생활 회화 · 여행'], ['일본어', '입문 · 생활 회화'], ['중국어', '입문 · 생활 회화'], ['한국어', '이주민 생활 한국어']] }),
        cls('이번 학기 반 안내', '', { n: 6 }),
        T('steps', { eyebrow: '', title: '처음 오셨다면', cols: [['수준 확인', '간단한 대화로 지금 수준 확인'], ['반 배정', '수준과 요일에 맞는 반'], ['수업', '말하기 중심 소규모 수업'], ['다음 반', '학기마다 다음 단계로']] }),
        gal(['dsk-02', 'cls-04', 'lib-05'], '필기 노트와 교실, 서가 사진'),
        reviews('수강생 후기'),
        notices('교실 알림'),
        cta('어느 반이 맞을지\n함께 정해요', '배운 경험과 원하는 요일을 남겨 주시면 반을 안내해 드립니다.', '반 배정 상담')] },
    /* 대학 평생교육원(비학위 · 교양): 노와르(먹색 · 강의실 사진) — 대학 강의실에서 듣는 교양 · 전문 과정 */
    'tl-life-univext': { cd: 'list', name: '대학 평생교육원 · 교양 전문 과정', scene: '대학 강의실에서 여는 성인 교양 · 전문 · 최고위 과정', ref: '대학 평생교육원형 — 어두운 프리미엄 첫 화면 · 과정 목록 · 학기 일정', color: '#1F2A44',
      L: 'noir', th: 'premium', pal: 'midnight', ph: { hero: 'hum-12', about: 'lib-01', space: 'cam-03', cta: 'off-07' }, hd: ['overlay', 'mega', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '대학 평생교육원', title: '대학 강의실에서\n다시 듣는 수업', sub: '교양 · 전문 · 최고위 과정을 학기마다 열고, 대학의 강의실과 도서관을 함께 이용합니다.', cta: '개설 과정 보기', cta2: '등록 안내' }),
        T('features', { eyebrow: '', title: '과정 안내', cols: [['교양 과정', '인문 · 예술 · 외국어'], ['전문 과정', '직무 · 자격 연계 실무'], ['최고위 과정', '리더를 위한 연속 강연'], ['맞춤 과정', '기관 · 단체 위탁 교육']] }),
        cls('이번 학기 개설 과정', '', { n: 5 }),
        gal(['lib-01', 'cam-03', 'lib-03'], '도서관 라운지와 캠퍼스 사진'),
        people('과정을 맡은 교수진'),
        T('info', { eyebrow: '', title: '등록 안내', cols: [['수강 신청', '과정 카드에서 온라인으로 신청'], ['수강료', '과정별 안내를 확인한 뒤 납부'], ['환불', '평생교육 관련 법령의 반환 기준을 따릅니다'], ['수료', '출석 기준을 채우면 수료증 발급']] }),
        reviews('수강생 이야기'),
        cta('다음 학기 과정을\n먼저 안내받으세요', '관심 분야를 남겨 주시면 개설 소식을 알려 드립니다.', '과정 안내 신청')] },
    /* 자격 · 실무 과정 교육원: S3 큰 제목 + 사진 격자(필기 · 회의) — 시험 일정과 과정표가 먼저 */
    'tl-life-cert': { cd: 'price', name: '자격 · 실무 과정 교육원', scene: '요양 · 보육 · 사무 · 바리스타 등 자격 준비 과정', ref: '자격 과정형 — 사진 격자 첫 화면 · 과정표 · 준비 단계', color: '#0E5E6F',
      th: 'official', pal: 'harbor', hk: 'grid', ph: { hero: 'hum-05', about: 'dsk-01', space: 'off-06', cta: 'dsk-03' }, hd: ['contact', 'biz', 'drawer'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '자격 · 실무 과정', title: '필요한 자격을\n차근차근 준비합니다', sub: '이론 수업, 실습, 모의 시험을 묶은 자격 준비 과정을 열고 시험 일정에 맞춰 안내합니다.', cta: '과정 신청하기', cta2: '시험 일정' }),
        notices('시험 · 모집 공지', { n: 4 }),
        cls('모집 중인 자격 과정', '수강료와 교육 기간을 확인하세요.', { n: 6, price: 1 }),
        T('steps', { eyebrow: '', title: '자격 준비 순서', cols: [['과정 상담', '응시 자격과 일정 확인'], ['이론 수업', '시험 범위 핵심 정리'], ['실습 · 모의 시험', '실전처럼 연습'], ['시험 접수 안내', '접수 기간에 맞춰 안내']] }),
        T('info', { eyebrow: '', title: '수강 안내', cols: [['대상', '자격 취득을 준비하는 성인'], ['신청', '온라인 · 전화 접수'], ['수강료', '과정별 안내'], ['학습비 반환', '평생교육 관련 법령의 반환 기준을 따릅니다']] }),
        reviews('수료생 후기'),
        cta('어떤 자격부터\n준비할지 고민된다면', '경력과 목표를 남겨 주시면 맞는 과정을 안내해 드립니다.', '과정 상담', 'contact')] }
  };
  Object.keys(NEW).forEach(id => { if (TPL.some(t => t && t.id === id)) return; const n = NEW[id];
    TPL.push({ id, name: n.name, types: ['lifelong'], scene: n.scene, color: n.color, tone: '신뢰', look: 'campus', ref: n.ref, build: () => [], theme: n.th, hero: '', langs: ['ko'] });
    CFG[id] = n; });

  /* ── 템플릿 덮어쓰기 ── */
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

  /* ── FD2 유형 간 재배치(R1 H1 · M1, fix6/BRIEF7): 유형마다 주력 계열 5~6개만 쓴다 — 평생 = portal · bulletin · story · mosaic · editorial + S3. collage · noir · fullbleed · bento · typo · splitscreen · sidebar는 뺀다.
     같은 계열을 다른 유형도 쓰면 변형(layoutVar, FD1 HPL.vars)을 서로 다르게 고른다. 머리글 · 바닥글은 FA의 유형별 허용 목록 안에서 2~3종으로 나눈다.
     [계열 또는 'hk:<S3 첫 화면>', 변형, 머리글, 바닥글] — 휴대폰 메뉴(hd[2])는 그대로 둔다 */
  const FD2 = {
    'life-city': ['portal', 'c', 'util', 'gov'],
    't2-life-hub': ['bulletin', 'a', 'util', 'gov'],
    'life-senior': ['hk:box', '', 'contact', 'split'],
    't2-life-silver': ['hk:split', '', 'contact', 'cols'],
    't2-life-50plus': ['editorial', 'b', 'center', 'cols'],
    't2-life-digital': ['story', 'b', 'center', 'split'], /* H3: 주력 story a · b · c */
    't2-life-humanities': ['editorial', 'c', 'center', 'gov'],
    't2-life-craft': ['mosaic', 'c', 'contact', 'cols'],
    't2-life-credit': ['bulletin', 'b', 'util', 'split'], /* a면 corp-legal과 닮음 · 사진 판 위 eyebrow 대비 3.14 */
    't2-life-family': ['mosaic', 'a', 'contact', 'split'], /* H3: b는 adult-hobby(lifelong 공유)와 겹침 */
    't2-life-career': ['portal', 'b', 'center', 'cols'],
    't2-life-village': ['story', 'c', 'contact', 'gov'],
    'tl-life-health': ['story', 'a', 'center', 'split'],
    'tl-life-lang': ['hk:scrim', '', 'center', 'cols'],
    'tl-life-univext': ['editorial', 'a', 'util', 'gov'], /* H3: 상자형 줄임 · 주력 editorial */
    'tl-life-cert': ['portal', 'a', 'contact', 'gov'] /* H3: 상자형 줄임 · 주력 portal(b면 사진 위 글 대비 4.14) */
  };
  Object.keys(FD2).forEach(id => { const c = CFG[id], v = FD2[id]; if (!c) return;
    if (v[0].indexOf('hk:') === 0) { delete c.L; c.hk = v[0].slice(3); } else { c.L = v[0]; delete c.hk; }
    c.lv = v[1] || ''; c.hd = [v[2], v[3], A(c.hd)[2] || 'full']; });

  /* FD2: FC 첫 화면 사진 재배정표(fix6/FC_hero_map.json — 전체 템플릿에서 첫 화면 사진 중복 0, hero 슬롯 · 긴 변 1200 이상) */
  const FCH = { 'life-city': 'off-12', 't2-life-hub': 'hum-13', 'life-senior': 'hum-34', 't2-life-silver': 'kni-03', 't2-life-50plus': 'sen-01', 't2-life-digital': 'hum-08', 't2-life-humanities': 'lib-07', 't2-life-craft': 'hum-23', 't2-life-credit': 'lap-02', 't2-life-family': 'fam-01', 't2-life-career': 'cor-06', 't2-life-village': 'sem-01', 'tl-life-health': 'yog-01', 'tl-life-lang': 'lan-01', 'tl-life-univext': 'hum-12', 'tl-life-cert': 'hum-38' };
  Object.keys(FCH).forEach(id => { const c = CFG[id]; if (!c) return; const v = typeof FCH[id] === 'string' ? { hero: FCH[id] } : FCH[id];
    if (Array.isArray(c.ph)) { const ix = { hero: 0, about: 1, space: 2, cta: 3, gallery: 4 }; c.ph = c.ph.slice(); Object.keys(v).forEach(k => { if (ix[k] != null) c.ph[ix[k]] = v[k]; }); }
    else c.ph = Object.assign({}, c.ph, v); });
  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'lifelong') return;
    const c = CFG[id]; MINE.add(id);
    tp.tpL = 1; tp.theme = c.th; tp.palette = c.pal; if (c.name) tp.name = c.name;
    if (c.L) { tp.layout = c.L; tp.hero = ''; } else { delete tp.layout; tp.hero = { split: 'split', box: 'center', scrim: 'bg', grid: 'center' }[c.hk] || ''; }
    tp.photos = Object.assign({}, c.ph);
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    if (c.L && c.lv) tp.layoutVar = c.lv; else delete tp.layoutVar;
    delete tp.deco; /* 원 · 링 장식 CSS 걷어냄 */
    tp.build = () => { const L = A(c.build()).filter(Boolean);
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner' && c.hk) d.hk = c.hk;
        if (x.type === 'text' && d.variant === 'cta' && c.ck && !d.ck) d.ck = c.ck;
        if (x.type === 'classes' && c.cd && !d.card) d.card = c.cd; });
      return L; };
  });

  /* FD2: 내 템플릿의 모든 섹션 eyebrow를 마지막에 한글화(덧붙인 섹션 포함) */
  Object.keys(CFG).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || !tp.tpL || A(tp.types)[0] !== 'lifelong') return; const b0 = tp.build;
    tp.build = () => { const L = A(b0()); L.forEach(x => { if (x && x.data && x.data.eyebrow) x.data.eyebrow = EB(x.data.eyebrow, false); }); return L; }; });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpL && A(tp.types)[0] === 'lifelong') {
          if (tp.layout && window.HPL && HPL.fam && HPL.fam[tp.layout]) { if (typeof HPL.apply === 'function') HPL.apply(s, tp.layout); else s.layout = tp.layout; } else delete s.layout;
          if (s.layout && tp.layoutVar) s.layoutVar = tp.layoutVar; else delete s.layoutVar; /* FD2: 계열 변형(FD1 HPL.vars) */
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const v = HPSTOCK.slotImg(tp.photos[sl], sl); if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-life siteFromTpl', e); }
      return s; };
    if (base.hpc) f.hpc = base.hpc;
    siteFromTpl = f; window.siteFromTpl = f; }

  /* ── tpl-b 템플릿 전용 장식 CSS 걷어내기(내 템플릿만): tpl-b가 넣은 그 조각만 정확히 지운다(뒤에 붙는 계열 CSS는 그대로) ── */
  if (typeof siteHTML === 'function') { const base = siteHTML; const g = (s, full, lang) => { const h = base(s, full, lang);
      try { if (s && MINE.has(s.tpl) && typeof h === 'string' && window.TPL_B && typeof TPL_B.css === 'function') { const c = TPL_B.css(s.tpl); if (c) return h.split(`/* tpl-b ${s.tpl} */${c}`).join(''); } } catch (e) { console.error('tpl-life css', e); }
      return h; };
    Object.keys(base).forEach(k => { g[k] = base[k]; });
    siteHTML = g; window.siteHTML = g; }
  window.TPL_LIFE = { ids: [...MINE] };
  /* H3(R2 N10): 점검용 업종별 강좌 이름 6개 — hp-visual 채운 기관이 템플릿마다 이 이름으로 강좌를 바꿔 찍는다(게시 화면에는 쓰지 않는다) */
  { const QA = {
    'life-city': ['스마트폰 활용 교실', '수채화 입문', '생활 영어 회화', '우리 동네 역사 탐방', '건강 요가', '디지털 사진 기초'],
    'life-senior': ['스마트폰 기초', '카카오톡 배우기', '키오스크 주문하기', '유튜브 즐기기', '사진 정리하기', '온라인 장보기'],
    't2-life-50plus': ['인생 2막 설계', '사회 공헌 활동가', '은퇴 재무 설계', '시니어 모델 워킹', '자서전 쓰기', '중장년 창업 기초'],
    't2-life-career': ['경력 이음 상담', '직업 상담사 준비', '중장년 재취업 이력서', '바리스타 자격', '공인중개사 기초', '소자본 창업 입문'],
    't2-life-craft': ['가죽 공예', '도자기 생활 소품', '홈베이킹', '민화 그리기', '우쿨렐레 합주', '천연 비누 만들기'],
    't2-life-credit': ['사회복지학 개론', '아동학 원론', '심리학 개론', '경영학 원론', '보육학 개론', '학위 설계 상담'],
    't2-life-digital': ['스마트폰 금융 생활', '키오스크 연습', 'AI 비서 활용', '온라인 예약하기', '디지털 사진 앨범', '스미싱 예방 교실'],
    't2-life-family': ['부모 교육 특강', '아이와 함께 그림책', '가족 요리 교실', '청소년 대화법', '조부모 손주 돌봄', '가족 캠프'],
    't2-life-hub': ['시민 교양 강좌', '학습 동아리 지원', '외국어 회화', '생활 체육', '문화 예술 강좌', '평생학습 축제'],
    't2-life-humanities': ['서양 철학사', '한국사 깊이 읽기', '세계 문학 산책', '미술사 강의', '클래식 음악 감상', '고전 읽기 모임'],
    't2-life-silver': ['한글 교실', '건강 체조', '노래 교실', '서예 교실', '스마트폰 교실', '치매 예방 놀이'],
    't2-life-village': ['마을 강사 양성', '반찬 나눔 요리', '마을 텃밭 가꾸기', '동네 책 모임', '공방 나눔 교실', '마을 기록 사진'],
    'tl-life-cert': ['요양보호사 준비', '보육교사 과정', '전산 사무 자격', '바리스타 2급', '한식 조리 기능사', '심리상담사 준비'],
    'tl-life-health': ['걷기 교실', '바른 자세 체조', '마음 명상', '건강 식생활', '근력 운동 기초', '수면 건강 강좌'],
    'tl-life-lang': ['생활 영어 회화', '일본어 첫걸음', '중국어 여행 회화', '스페인어 기초', '영어 원서 읽기', '여행 외국어 특강'],
    'tl-life-univext': ['인문 교양 과정', '최고경영자 과정', '심리 상담 전문 과정', '와인 문화 강좌', '미술 감상 과정', 'AI 이해 교양']
  };
  Object.keys(QA).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (tp && A(tp.types)[0] === 'lifelong') tp.qaCls = QA[id]; }); }
  /* H3(R2 H3 · BRIEF8): 번호 단계 섹션을 쓰는 템플릿을 유형마다 40% 미만으로 — 아래 템플릿의 '단계(steps)'를 번호 없는 칸(tiles)으로 바꾼다(내용은 그대로) */
  ['life-senior', 'tl-life-cert', 't2-life-career', 'tl-life-univext'].forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || typeof tp.build !== 'function') return; const b0 = tp.build;
    /* editorial · fullbleed 계열은 '특징(features)'도 번호 목록으로 그리므로 함께 바꾼다. 바꿀 칸이 둘이면 두 번째는 정보 목록(info) */
    tp.build = () => { const L = A(b0()); let hasT = L.some(x => x && x.data && x.data.variant === 'tiles'); const numF = /^(editorial|fullbleed)$/.test(tp.layout || '');
      L.forEach(x => { if (!x || x.type !== 'text' || !x.data) return; const v = x.data.variant; if (v === 'steps' || (numF && v === 'features')) { x.data.variant = hasT ? 'info' : 'tiles'; hasT = true; } }); return L; }; });
})();
