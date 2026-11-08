/* v34.5 tpl-k12 — 유형 디자이너 TK: k12(학원 · 초중고) 템플릿 재배치 (fix6/BRIEF5.md)
   뼈대: RULES_B2 '학원 · 초중고' — 공지 띠 → 머리글 → 사진 첫 화면 + [상담 신청] [수강신청] → 바로가기 → 과목 · 강좌 → 공지 · 일정 → 실제 후기 → 상담 띠 → 바닥글
   - types[0]이 k12인 템플릿 16종(global.js 3 + tpl-a.js 13)을 id로 찾아 덮어쓴다. 원본 파일은 고치지 않는다. 공유 템플릿(adult-lang · solo-creator)은 TA 몫이라 손대지 않는다.
   - 업종 16가지가 서로 다른 구조를 갖도록 레이아웃 계열(HPL) 12종을 한 번씩 쓰고, 나머지 4종은 S3 사진 첫 화면(scrim · box · split · grid)으로 둔다.
   - 템플릿마다: layout · theme · palette(HPC, 서로 다름) · photos(HPSTOCK, 첫 화면 사진 서로 다름) · hps(머리글 · 바닥글 · 휴대폰 메뉴) · 섹션 구성(업종별로 다시 씀)
   - 사실 원칙: 숫자는 실제 숫자 띠(hpt:'facts')만, 강사는 등록된 강사만, 후기는 실제 후기만, 연락처는 설정값만. 문구 안에 실적 · 합격률 · 횟수 약속을 넣지 않는다.
     단계 이름이 '숫자 + 점 · 명 · 위 · 배 · 건'으로 읽히지 않게 한다('4 점검' → 지어낸 점수로 오인).
   - 원 · 링 · 줄무늬 장식 CSS(tpl-a의 deco)는 걷어낸다. */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function' || typeof S2 !== 'function') return;
  const A = v => Array.isArray(v) ? v : [];
  const T = (variant, data) => S2('text', { variant, ...data });
  const ids = n => { try { return pubCls(n); } catch (e) { return []; } };
  const ft = () => (S.settings && S.settings.footer) || {};
  const ban = d => S2('banner', d);
  const cls = (title, eyebrow, sub, o) => S2('classes', { eyebrow: eyebrow || '', title, sub: sub || '', ids: ids(o && o.n || 4), layout: (o && o.layout) || 'grid', ...(o && o.price ? { price: true } : {}) });
  const facts = (title) => T('stats', { hpt: 'facts', title: title || '', cols: [] });
  const people = (title, eyebrow) => T('profiles', { hpt: 'people', eyebrow: eyebrow || '', title, cols: [] });
  const reviews = (title, eyebrow) => S2('reviews', { eyebrow: eyebrow || '', title, note: '' });
  const notices = (title, o) => S2('notices', { eyebrow: (o && o.eyebrow) || '', title: title || '공지사항', n: (o && o.n) || 4, ...(o && o.board ? { variant: 'board' } : {}) });
  const faq = (title, cols) => T('info', { hpt: 'faq', eyebrow: '', title: title || '자주 묻는 질문', cols });
  const cta = (title, body, btn, ck) => T('cta', { eyebrow: '', title, body, cta: btn || '상담 신청', cols: [], ...(ck ? { ck } : {}) });
  const map = title => S2('map', { title: title || '오시는 길', addr: ft().addr || '', tel: ft().tel || '' });
  /* 사진 띠: 샘플 사진 2~3장(분위기 사진 · 캡션 없음). 바로 고치기에서 '갤러리' 자리로 교체된다(hpimg hpiSlot) */
  const gal = (P, alt) => { const H = window.HPSTOCK; const L = (H && Array.isArray(H.list)) ? P.map(id => H.list.find(x => x.id === id)).filter(Boolean) : [];
    return L.length >= 2 ? S2('image', { title: '', alt: alt || '학습 공간 분위기 사진', imgs: L.map(x => ({ src: x.src800 || x.src, title: '' })), dstyle: 2, hpiSlot: 'gallery' }) : null; };

  /* ── 템플릿별 설정 ──
     cd: 강좌 카드(S2) · L: 계열(없으면 S3 첫 화면 hk) · th: 테마 · pal: 팔레트 · ph: { hero, about, space, cta, gallery } · hd: [머리글, 바닥글, 휴대폰 메뉴] · ck: 신청 띠
     build: 섹션(업종별로 다시 씀) */
  const CFG = {
    /* 종합학원: S3 사진 + 겹친 글자 상자 + 바로가기 목록(밝은 교실) — 학원 기본 시작 템플릿(마법사 시안의 바탕이라 계열 없이 둔다) */
    'k12-total': { cd: 'table', name: '초중고 종합학원', hk: 'box', th: 'official', pal: 'tangerine', ph: { hero: 'cls-04', about: 'stu-02', space: 'cls-03', cta: 'lib-05' }, hd: ['contact', 'biz', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '초 · 중 · 고 전 과목', title: '과목마다 담임처럼,\n한 학기를 함께 갑니다', sub: '반별 수업과 단원 테스트, 보호자 리포트로 성적의 변화를 같이 확인합니다.', cta: '상담 신청', cta2: '반 안내 보기' }),
        notices('학원 소식', { board: 1, n: 5 }),
        T('tiles', { eyebrow: '', title: '처음 오셨다면', cols: [['레벨 테스트', '학년 · 과목별 진단'], ['반 안내', '학년 · 수준별 반 구성'], ['시간표', '요일 · 시간 확인'], ['보호자 상담', '방문 · 전화 상담']] }),
        gal(['stu-02', 'cls-03', 'dsk-03']),
        cls('학년별 반 안내', '', '학년과 수준에 맞는 반을 확인하세요.', { n: 6 }),
        T('steps', { eyebrow: '', title: '한 주의 관리 순서', cols: [['단원 테스트', '약한 부분을 먼저 확인'], ['반별 수업', '진도에 맞춘 핵심 수업'], ['오답 클리닉', '틀린 문제를 다시 풀기'], ['보호자 리포트', '출결 · 성취를 앱으로 공유']] }),
        reviews('학생 · 학부모 후기'),
        cta('우리 아이 반 배정,\n상담으로 시작하세요', '학년과 과목, 지금 고민을 알려 주시면 맞는 반과 시작 시기를 안내해 드립니다.', '상담 신청'),
        map('오시는 길 · 상담')] },
    /* 입시: 노와르(먹색 · 명조 · 아치 사진) — 브랜드형 입시 학원의 절제된 고급감 */
    'k12-exam': { cd: 'list', name: '입시 · 관리형 학원', L: 'noir', th: 'premium', pal: 'inkpaper', ph: { hero: 'cls-01', about: 'dsk-03', space: 'lib-03', cta: 'dsk-05' }, hd: ['overlay', 'mega', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '대입 수능 · 내신', title: '목표 대학까지\n흔들림 없이', sub: '개인별 학습 계획, 모의고사 분석, 담임 상담으로 수험 생활의 하루하루를 관리합니다.', cta: '입학 상담', cta2: '과정 보기' }),
        facts(),
        T('features', { eyebrow: '', title: '관리의 네 축', cols: [['개인 학습 계획', '과목별 목표와 주간 분량을 함께 설계'], ['모의고사 분석', '성적 추이와 약한 유형을 리포트로'], ['담임 상담', '계획과 실천을 정기적으로 점검'], ['자습 관리', '출결 · 자습 시간을 기록으로']] }),
        cls('개설 과정', '', '', { n: 4 }),
        gal(['dsk-03', 'lib-03', 'brd-02'], '공부하는 책상과 서가 사진'),
        T('timeline', { eyebrow: '', title: '한 해의 흐름', cols: [['겨울 · 기초', '약한 과목 진단과 개념 복구'], ['봄 · 완성', '과목별 개념 완성과 기출 분석'], ['여름 · 실전', '실전 모의고사와 시간 관리'], ['가을 · 마무리', '취약 유형 보완과 컨디션 관리']] }),
        notices('입시 공지'),
        reviews('수강생 후기'),
        cta('지금 성적에서\n어디까지 갈 수 있을까요', '최근 성적과 목표를 알려 주시면 과정과 시작 시기를 상담해 드립니다.', '입학 상담')] },
    /* 수학: 큰 글자(초대형 제목 + 칠판 사진 띠) — 단계가 분명한 과목의 단단한 인상 */
    't1-k12-math': { cd: 'schedule', L: 'typo', th: 'clean', pal: 'cobalt', ph: { hero: 'brd-01', about: 'dsk-01', space: 'cls-02', cta: 'kid-04' }, hd: ['solid', 'mega', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '수학 전문', title: '개념이 보이면\n수학이 쉬워집니다', sub: '진단 테스트로 약한 단원을 찾고, 개념 수업과 오답 클리닉으로 빈틈을 메웁니다.', cta: '레벨 테스트 신청', cta2: '상담 문의' }),
        T('steps', { eyebrow: '', title: '한 단원을 끝내는 순서', cols: [['진단', '단원별 테스트로 약한 부분 확인'], ['개념', '풀이 과정을 말로 설명하는 수업'], ['유형', '자주 나오는 유형을 반복 연습'], ['클리닉', '틀린 문제만 다시 잡는 보충 수업']] }),
        cls('지금 모집 중인 반', '', '학년과 수준에 맞는 반을 확인하세요.'),
        gal(['dsk-01', 'cls-02', 'kid-04'], '노트 · 교실 · 퍼즐 사진'),
        T('timeline', { eyebrow: '', title: '학년별 로드맵', cols: [['초등', '연산 정확도와 사고력 기초'], ['중등', '내신 개념 완성과 서술형 대비'], ['고등', '수능 유형과 심화 문제 풀이']] }),
        people('수업을 맡은 선생님'),
        reviews('학생 · 학부모 후기'),
        faq('', [['레벨 테스트는 어떻게 하나요?', '상담 신청을 남겨 주시면 학년과 목표를 확인한 뒤 테스트 일정을 안내해 드립니다.'], ['선행과 내신 중 무엇을 먼저 하나요?', '진단 결과를 보고 이번 학기 내신을 먼저 챙길지, 다음 학기 선행을 함께 할지 상담으로 정합니다.']]),
        cta('우리 아이 수학,\n어디서부터 시작할까요?', '지금 실력과 목표를 알려 주시면 맞는 반과 시작 단원을 안내해 드립니다.', '상담 신청')] },
    /* 영어: 좌우 분할(어두운 글 판 + 밝은 서재 사진) — 레벨 테스트 → 반 배정 흐름 */
    't1-k12-english': { cd: 'photo', L: 'splitscreen', th: 'warm', pal: 'lagoon', ph: { hero: 'lap-05', about: 'lap-07', space: 'cls-02', cta: 'lib-05' }, hd: ['solid', 'cols', 'drawer'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '초중등 영어', title: '읽고, 말하고, 쓰는\n진짜 영어 실력', sub: '리딩 · 스피킹 · 라이팅을 레벨별로 이어 시험 점수와 말하기 자신감을 함께 키웁니다.', cta: '레벨 테스트 예약', cta2: '상담 문의' }),
        T('features', { eyebrow: '', title: '네 영역을 고르게', cols: [['Reading', '수준에 맞는 원서와 지문 읽기'], ['Speaking', '매 수업 말하기 · 발표 시간'], ['Writing', '문장에서 에세이까지 단계별 쓰기'], ['Grammar', '읽고 쓰는 데 필요한 문법 정리']] }),
        cls('레벨별 수업'),
        T('steps', { eyebrow: '', title: '처음 오셨다면', cols: [['레벨 테스트', '영역별 지금 실력 확인'], ['반 배정', '레벨과 학년에 맞는 반'], ['수업 · 과제', '수업 뒤 온라인 과제로 복습'], ['정기 피드백', '성취와 다음 목표를 보호자와 공유']] }),
        reviews('학부모 후기'),
        notices('공지사항'),
        faq('', [['레벨 테스트는 무엇을 보나요?', '읽기 · 듣기 · 말하기를 함께 보고, 결과를 바탕으로 반을 안내해 드립니다.'], ['학교 시험 대비도 하나요?', '중등 반은 학교 진도에 맞춘 내신 대비 수업을 함께 운영합니다.']]),
        cta('영어, 지금 레벨부터\n확인해 보세요', '아이의 학년과 학습 경험을 알려 주시면 테스트 일정을 안내해 드립니다.', '테스트 예약')] },
    /* 코딩: 벤토 격자(코드 화면 · 강좌 칸 · 숫자 칸) — 결과물 중심 수업 */
    't1-k12-coding': { cd: 'big', L: 'bento', th: 'tech', pal: 'circuit', ph: { hero: 'cod-02', about: 'cod-03', space: 'cls-03', cta: 'cod-04' }, hd: ['float', 'cols', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '코딩 · AI', title: '만들면서 배우는\n코딩과 AI', sub: '블록 코딩에서 파이썬, 피지컬 컴퓨팅까지 — 수업마다 작은 프로젝트 하나를 완성합니다.', cta: '체험 수업 신청', cta2: '과정 보기' }),
        cls('지금 모집 중인 과정'),
        T('timeline', { eyebrow: '', title: '단계별 로드맵', sub: '처음이어도 괜찮습니다. 지금 수준에 맞는 단계부터 시작합니다.', cols: [['입문', '블록 코딩으로 순서 · 반복 · 조건'], ['기초', '파이썬으로 내 프로그램 만들기'], ['응용', '데이터 · AI 도구로 문제 해결'], ['심화', '팀 프로젝트와 대회 준비']] }),
        T('features', { eyebrow: '', title: '수업은 이렇게', cols: [['프로젝트 수업', '배운 개념으로 결과물 완성'], ['발표', '만든 것을 친구들 앞에서 설명'], ['포트폴리오', '작품이 기록으로 쌓입니다'], ['보호자 공유', '결과물을 앱으로 확인']] }),
        facts(),
        reviews('학생 · 학부모 후기'),
        cta('체험 수업으로\n먼저 만나 보세요', '학년과 코딩 경험을 알려 주시면 맞는 단계의 체험 수업을 안내해 드립니다.', '체험 신청')] },
    /* 미술: 모자이크(작품 · 재료 사진 격자) — 사진이 먼저 말하는 화실 */
    't1-k12-art': { cd: 'photo', L: 'mosaic', th: 'warm', pal: 'magenta', ph: { hero: 'art-01', about: 'art-03', space: 'art-06', gallery: 'art-04', cta: 'art-02' }, hd: ['float', 'cta', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '어린이 · 청소년 미술', title: '보고, 느끼고,\n마음껏 그리는 시간', sub: '드로잉 · 수채화 · 입체 조형까지, 아이의 표현력을 단계별로 키웁니다.', cta: '체험 수업 신청', cta2: '상담 문의' }),
        cls('반 안내'),
        T('features', { eyebrow: '', title: '이런 수업을 합니다', cols: [['드로잉', '관찰하고 선으로 표현하기'], ['색채 · 수채화', '색을 섞고 번지게 하며 느끼기'], ['입체 · 공예', '찰흙 · 종이 · 재활용 재료로 만들기'], ['포트폴리오', '작품을 모아 성장 기록으로']] }),
        T('steps', { eyebrow: '', title: '한 작품이 완성되기까지', cols: [['관찰', '대상을 오래 들여다보기'], ['스케치', '떠오른 생각을 밑그림으로'], ['채색 · 만들기', '재료를 골라 표현하기'], ['작품 이야기', '내 작품을 말로 소개하기']] }),
        reviews('학부모 후기'),
        faq('', [['그림을 처음 그려도 되나요?', '처음이라면 관찰 · 선 긋기부터 시작합니다. 아이 속도에 맞춰 진행합니다.'], ['재료는 준비해야 하나요?', '수업별 준비물은 반 안내와 공지사항에서 미리 알려 드립니다.']]),
        cta('아이의 첫 작품,\n함께 시작해요', '체험 수업 일정이 궁금하시면 편하게 문의해 주세요.', '체험 문의')] },
    /* 음악: 전체 화면 사진(어두운 건반) — 공연장 같은 첫인상 */
    't1-k12-music': { cd: 'list', L: 'fullbleed', th: 'premium', pal: 'plum', ph: { hero: 'mus-01', about: 'mus-08', space: 'mus-06', cta: 'mus-07' }, hd: ['overlay', 'cta', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '피아노 · 현악 · 기타', title: '한 곡을 완성하는\n기쁨을 알려 줍니다', sub: '개인 레슨과 앙상블 수업으로 음악과 오래 친해지게 합니다.', cta: '레슨 상담 신청', cta2: '레슨 안내' }),
        T('features', { eyebrow: '', title: '레슨 구성', cols: [['개인 레슨', '학생 수준에 맞춘 1:1 지도'], ['이론 · 청음', '악보 읽기와 듣는 귀 기르기'], ['앙상블', '친구들과 맞춰 보는 합주'], ['연주 준비', '발표회 · 콩쿠르 곡 준비']] }),
        T('timeline', { eyebrow: '', title: '단계별 과정', cols: [['입문', '자세 · 박자 · 기본 주법'], ['초급', '쉬운 곡 완주와 악보 읽기'], ['중급', '표현과 셈여림, 레퍼토리 넓히기'], ['연주 과정', '무대 연주와 입시 준비']] }),
        cls('레슨 · 클래스'),
        gal(['mus-02', 'mus-05', 'mus-08'], '피아노 건반과 기타 사진'),
        people('레슨 선생님'),
        reviews('학부모 후기'),
        map('레슨실 오시는 길')] },
    /* 독서 · 논술: 매거진형(명조 제목 · 도서관 사진 · 목차형 과정) */
    't1-k12-reading': { cd: 'big', L: 'editorial', th: 'campus', pal: 'ivy', ph: { hero: 'lib-01', about: 'lib-03', space: 'lib-02', cta: 'lib-06' }, hd: ['solid', 'min', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '독서 · 논술', title: '읽는 힘이\n생각하는 힘이 됩니다', sub: '책 한 권을 깊이 읽고, 토론하고, 내 생각을 글로 정리하는 수업입니다.', cta: '수업 상담 신청', cta2: '반 안내' }),
        T('steps', { eyebrow: '', title: '책 한 권을 읽는 방법', cols: [['읽기', '천천히, 질문하며 읽기'], ['질문 만들기', '궁금한 점을 내 말로'], ['토론', '친구들과 생각 나누기'], ['글쓰기', '내 주장을 글로 정리'], ['첨삭', '선생님 피드백으로 고쳐 쓰기']] }),
        T('features', { eyebrow: '', title: '학년별 과정', cols: [['초등 저학년', '그림책 · 동화로 읽기 습관'], ['초등 고학년', '주제 독서와 짧은 글쓰기'], ['중등', '비문학 독해 · 토론 · 논술 기초'], ['고등', '논증하는 글쓰기와 서술형 대비']] }),
        reviews('학부모 후기'),
        cls('지금 모집 중인 반'),
        notices('이달의 도서 · 공지'),
        cta('아이의 독서 습관,\n상담으로 시작하세요', '지금 읽고 있는 책과 학년을 알려 주시면 맞는 반을 안내해 드립니다.', '상담 신청')] },
    /* 과학: 이야기형(질문 → 예상 → 실험 → 기록을 세로 줄기로) */
    't1-k12-science': { cd: 'photo', L: 'story', th: 'clean', pal: 'sky', ph: { hero: 'nat-02', about: 'nat-03', space: 'kid-04', cta: 'lib-05' }, hd: ['notice', 'cta', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '과학 실험 · 탐구', title: '“왜?”라는 질문이\n실험이 되는 곳', sub: '직접 만들고 관찰하는 실험 수업으로 과학 개념을 몸으로 이해합니다.', cta: '체험 수업 신청', cta2: '상담 문의' }),
        T('steps', { eyebrow: '', title: '탐구는 이렇게 이어집니다', cols: [['질문', '궁금한 현상 하나 고르기'], ['예상', '결과를 미리 생각해 보기'], ['실험', '직접 해 보고 관찰하기'], ['기록 · 발표', '결과를 정리해 설명하기']] }),
        T('features', { eyebrow: '', title: '네 가지 탐구 영역', cols: [['물리', '힘 · 빛 · 소리 실험'], ['화학', '섞고 녹이고 바꿔 보기'], ['생명', '관찰 일지와 생물 탐구'], ['지구 · 우주', '날씨 · 암석 · 별자리']] }),
        cls('실험 수업'),
        facts(),
        reviews('학부모 후기'),
        faq('', [['실험은 안전한가요?', '학년에 맞는 재료와 도구만 쓰고, 선생님 안내에 따라 보호 장비를 갖추고 진행합니다.'], ['결과물은 볼 수 있나요?', '실험 기록과 사진을 수업 뒤 학습자 앱에서 확인할 수 있습니다.']]),
        cta('실험 한 번으로\n과학이 좋아집니다', '체험 수업 일정이 궁금하시면 편하게 문의해 주세요.', '체험 문의')] },
    /* 1:1 과외: S3 좌우 분할(흰 책상 · 노트) — 상담에서 시작하는 차분한 구성 */
    't1-k12-tutor': { cd: 'price', th: 'clean', pal: 'violet', hk: 'split', ph: { hero: 'lap-04', about: 'dsk-01', space: 'cls-02', cta: 'dsk-05' }, hd: ['contact', 'cols', 'drawer'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '1:1 · 소수정예', title: '한 명을 위한\n수업 설계', sub: '학생의 목표와 속도에 맞춰 계획을 짜고, 수업 기록을 보호자와 공유합니다.', cta: '맞춤 상담 신청', cta2: '수업 방식 보기' }),
        T('steps', { eyebrow: '', title: '맞춤 수업이 시작되는 과정', cols: [['상담', '목표 · 고민 · 일정 확인'], ['진단', '지금 실력과 학습 습관 확인'], ['맞춤 플랜', '과목 · 진도 · 과제 계획'], ['수업 · 기록', '수업 내용과 과제를 기록'], ['계획 조정', '정기적으로 계획을 다시 맞춤']] }),
        reviews('학생 · 학부모 후기'),
        T('features', { eyebrow: '', title: '수업 방식', cols: [['1:1 수업', '한 학생에게 온전히 집중'], ['소수정예', '비슷한 목표의 소그룹'], ['온라인 병행', '보강 · 복습은 온라인으로'], ['기록 공유', '보호자가 앱에서 바로 확인']] }),
        gal(['dsk-01', 'dsk-03', 'lap-07'], '노트 필기와 공부 책상 사진'),
        cls('수업 안내'),
        faq('', [['과목을 여러 개 들을 수 있나요?', '상담에서 과목별 목표를 확인한 뒤 함께 계획을 세웁니다.'], ['수업 시간은 어떻게 정하나요?', '학생 일정에 맞춰 상담에서 정하고, 변경은 미리 알려 주시면 조정합니다.']]),
        cta('우리 아이에게 맞는\n수업을 설계해 드립니다', '고민과 목표를 남겨 주시면 맞춤 상담을 도와드립니다.', '상담 신청', 'contact')] },
    /* 관리형 독서실: 포털형(곡선 서가 사진 위 공지 패널 · 빠른 메뉴) — 이용 공지와 상담이 먼저 */
    't1-k12-studycare': { cd: 'schedule', L: 'portal', th: 'warm', pal: 'honey', ph: { hero: 'lib-02', about: 'lap-06', space: 'dsk-03', cta: 'dsk-05' }, hd: ['notice', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '관리형 자습', title: '혼자 하는 공부를\n끝까지 지켜봅니다', sub: '입실 · 퇴실 기록, 플래너 확인, 정기 상담으로 자습 시간을 실력으로 바꿉니다.', cta: '이용 상담 신청', cta2: '이용 안내' }),
        notices('이용 공지'),
        T('features', { eyebrow: '', title: '이렇게 관리합니다', cols: [['출결 기록', '입실 · 퇴실을 보호자와 공유'], ['플래너 확인', '하루 계획과 실천을 함께 확인'], ['집중 환경', '조용하고 정돈된 자습 공간'], ['정기 상담', '학습 습관과 목표 확인']] }),
        T('steps', { eyebrow: '', title: '이용 흐름', cols: [['상담', '목표와 생활 패턴 확인'], ['목표 설정', '기간별 학습 목표 정하기'], ['플래너', '매일 계획과 실천 기록'], ['주간 리뷰', '상담으로 계획 다시 맞추기']] }),
        gal(['lib-03', 'dsk-03', 'dsk-01'], '서가와 공부 책상 사진'),
        T('info', { eyebrow: '', title: '이용 안내', cols: [['이용 대상', '중 · 고등학생, 수험생'], ['관리 방식', '출결 · 플래너 · 상담 기록을 학습자 앱으로 공유'], ['상담', '이용 전 방문 또는 전화 상담']] }),
        cls('관리 프로그램'),
        cta('자습 습관,\n상담으로 시작하세요', '이용 방법과 관리 방식이 궁금하시면 문의해 주세요.', '이용 문의'),
        map('오시는 길')] },
    /* 예체능: S3 전면 사진 + 스크림(함께 뛰노는 아이들 뒷모습) — 힘 있는 큰 제목 */
    't1-k12-sports': { cd: 'schedule', th: 'kids', pal: 'tomato', hk: 'scrim', ph: { hero: 'kid-05', about: 'cam-03', space: 'cls-04', cta: 'kid-04' }, hd: ['overlay', 'mega', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '태권도 · 줄넘기 · 체육', title: '튼튼한 몸,\n당당한 마음', sub: '운동으로 체력과 자신감, 함께하는 법을 배웁니다.', cta: '체험 수업 신청', cta2: '반 안내' }),
        T('features', { eyebrow: '', title: '운동으로 배우는 네 가지', cols: [['체력', '바른 자세와 기초 체력'], ['협동', '친구와 함께하는 팀 활동'], ['예절', '인사 · 순서 · 규칙 지키기'], ['안전', '다치지 않게 배우는 습관']] }),
        cls('반 안내'),
        gal(['kid-05', 'kid-02', 'cls-04'], '아이들 활동 분위기 사진'),
        T('timeline', { eyebrow: '', title: '단계별 과정', cols: [['기초', '기본 동작과 몸 쓰는 법'], ['중급', '응용 동작 · 줄넘기 기술'], ['심화', '시범과 대회 준비'], ['승급', '단계별 심사로 성장 확인']] }),
        notices('차량 · 일정 공지'),
        reviews('학부모 후기'),
        cta('체험 수업으로\n먼저 뛰어 보세요', '아이의 나이와 운동 경험을 알려 주시면 맞는 반을 안내해 드립니다.', '체험 신청')] },
    /* 유아: S3 큰 제목 + 사진 격자(어린이 도서관 · 원목 블록) — 부드럽고 밝은 첫인상 */
    't1-k12-kinder': { cd: 'big', th: 'kids', pal: 'crayon', hk: 'grid', ph: { hero: 'lib-04', about: 'kid-01', space: 'kid-03', cta: 'art-02' }, hd: ['float', 'cta', 'drawer'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '4~7세 놀이 수업', title: '놀이로 시작하는\n첫 배움', sub: '노래 · 그림책 · 오감 놀이로 말과 생각이 자라는 유아 수업입니다.', cta: '체험 수업 예약', cta2: '상담 문의' }),
        T('features', { eyebrow: '', title: '놀이 영역', cols: [['언어 놀이', '그림책 · 말놀이로 표현하기'], ['오감 놀이', '만지고 듣고 느끼기'], ['음악 · 율동', '노래와 몸으로 리듬 익히기'], ['만들기', '손으로 꼼지락 작품 만들기']] }),
        T('steps', { eyebrow: '', title: '한 번의 수업은 이렇게', cols: [['인사 · 노래', '마음을 여는 시작'], ['주제 놀이', '오늘의 주제로 함께 놀기'], ['활동', '만들기 · 표현 활동'], ['오늘의 이야기', '활동 내용을 보호자와 공유']] }),
        gal(['kid-01', 'kid-03', 'kid-02'], '나무 블록과 만들기 사진'),
        cls('연령별 수업'),
        notices('보호자 안내'),
        cta('우리 아이 첫 수업,\n편하게 문의하세요', '아이의 나이와 관심사를 알려 주시면 맞는 수업을 안내해 드립니다.', '체험 문의'),
        map('오시는 길')] },
    /* 재수: 알림판형(공지 · 일정 · 표로 정리한 과정) — 입학 일정이 먼저 */
    't1-k12-retake': { cd: 'table', L: 'bulletin', th: 'official', pal: 'oxford', ph: { hero: 'lec-01', about: 'dsk-01', space: 'cls-01', cta: 'brd-01' }, hd: ['notice', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '재수 종합반', title: '다시 도전하는 한 해,\n매일을 관리합니다', sub: '시기별 학습 계획, 모의고사 분석, 담임 상담으로 수험 생활 전체를 함께 설계합니다.', cta: '입학 상담 신청', cta2: '입학 일정' }),
        notices('입학 · 모집 공지', { n: 5 }),
        T('timeline', { eyebrow: '', title: '시기별 학습 로드맵', cols: [['기초 정비기', '약한 과목 진단과 기본 개념 복구'], ['개념 완성기', '과목별 개념 완성과 기출 분석'], ['실전 훈련기', '실전 모의고사와 시간 관리 훈련'], ['최종 마무리기', '취약 유형 보완과 컨디션 관리']] }),
        gal(['dsk-01', 'brd-01', 'lib-03'], '노트 · 칠판 · 서가 사진'),
        cls('개설 과정', '', '', { n: 5 }),
        T('features', { eyebrow: '', title: '관리 체계', cols: [['담임 관리', '정기 상담으로 계획 확인'], ['모의고사 분석', '성적 추이와 약점 리포트'], ['자습 관리', '출결 · 자습 시간 기록'], ['진학 상담', '성적에 맞춘 지원 전략']] }),
        facts(),
        reviews('수강생 후기'),
        faq('', [['언제 등록하는 것이 좋을까요?', '시기별 과정이 이어지므로 상담에서 지금 성적과 목표를 보고 시작 시점을 안내해 드립니다.'], ['보호자도 상담할 수 있나요?', '담임 상담 결과와 성적 리포트를 보호자와 함께 공유합니다.']]),
        cta('다시 시작하는 수험 생활,\n상담으로 계획하세요', '지난 시험 결과와 목표를 알려 주시면 맞는 과정을 안내해 드립니다.', '입학 상담')] },
    /* 인강: 사이드 메뉴형(왼쪽 고정 학습 메뉴) — 과목으로 바로 찾는 학습 포털 */
    't1-k12-online': { cd: 'price', L: 'sidebar', th: 'clean', pal: 'graphite', ph: { hero: 'lap-01', about: 'lap-07', space: 'stu-01', cta: 'lap-03' }, hd: ['solid', 'cols', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '중고등 온라인 강의', title: '언제 어디서나\n내 속도로 듣는 강의', sub: '과목별 강의 영상, 확인 문제, 질문 게시판으로 학교 진도와 시험을 혼자서도 준비합니다.', cta: '강좌 둘러보기', cta2: '질문하기' }),
        T('tiles', { eyebrow: '', title: '과목별로 찾기', cols: [['국어', '독해 · 문학 · 문법'], ['영어', '독해 · 어법 · 듣기'], ['수학', '개념 · 유형 · 심화'], ['과학 · 사회', '탐구 과목 개념 정리']] }),
        cls('지금 열린 강좌', '', '강좌를 눌러 차시 구성과 수강 기간을 확인하세요.', { n: 6, price: 1 }),
        gal(['stu-01', 'cod-03', 'lap-07'], '노트북으로 공부하는 사진'),
        T('steps', { eyebrow: '', title: '수강 방법', cols: [['강좌 선택', '과목 · 학년으로 찾기'], ['영상 수강', 'PC · 휴대폰 어디서나'], ['확인 문제', '차시마다 이해도 확인'], ['질문 · 복습', '게시판 질문과 다시 보기']] }),
        facts(),
        notices('수강 공지', { board: 1 }),
        faq('', [['휴대폰으로도 들을 수 있나요?', 'PC와 휴대폰 모두에서 수강할 수 있고, 이어 보기 위치가 저장됩니다.'], ['모르는 문제는 어떻게 묻나요?', '강좌의 질문 게시판에 남기면 답변을 받을 수 있습니다.']])] },
    /* 영어 · 코딩 키즈: 콜라주(기울어진 사진 카드 · 메모지) — 경쾌한 키즈 학원 */
    'k12-kids': { cd: 'list', name: '영어 · 코딩 키즈 학원', L: 'collage', th: 'kids', pal: 'block', ph: { hero: 'kid-02', gallery1: 'kid-01', gallery2: 'art-04', about: 'kid-03', cta: 'art-02' }, hd: ['float', 'cta', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '6~12세 프로젝트 수업', title: '영어로 말하고,\n코딩으로 만들어요', sub: '아이 눈높이 프로젝트 수업에서 배운 것을 직접 만들고 발표합니다.', cta: '무료 체험 신청', cta2: '반 안내' }),
        T('tiles', { eyebrow: '', title: '바로가기', cols: [['체험 신청', '첫 수업을 먼저 경험해요'], ['반 안내', '나이 · 수준별 반'], ['보호자 문의', '궁금한 점을 남겨요']] }),
        cls('반 안내'),
        T('features', { eyebrow: '', title: '수업 방식', body: '개념을 짧게 익히고, 프로젝트로 만들고, 친구들 앞에서 발표합니다.', cols: [['영어', '파닉스에서 리딩까지'], ['코딩', '블록에서 파이썬까지'], ['발표', '만든 것을 말로 소개하기']] }),
        reviews('학부모 후기'),
        cta('체험 수업에서\n먼저 만나요', '아이의 나이와 관심사를 알려 주시면 맞는 반을 안내해 드립니다.', '체험 신청'),
        map('오시는 길')] }
  };

  /* ── 템플릿 덮어쓰기 ── */
  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'k12') return;
    const c = CFG[id];
    tp.tpK = 1; tp.theme = c.th; tp.palette = c.pal; if (c.name) tp.name = c.name;
    if (c.L) { tp.layout = c.L; tp.hero = ''; } else { delete tp.layout; tp.hero = { split: 'split', box: 'center', scrim: 'bg', grid: 'center' }[c.hk] || ''; }
    tp.photos = Object.assign({}, c.ph);
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    delete tp.deco; /* 원 · 링 · 줄무늬 장식 CSS 걷어냄 */
    tp.build = () => { const L = A(c.build()).filter(Boolean);
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner' && c.hk) d.hk = c.hk;
        if (x.type === 'text' && d.variant === 'cta' && c.ck && !d.ck) d.ck = c.ck;
        if (x.type === 'classes' && c.cd && !d.card) d.card = c.cd; /* S2 강좌 카드 6종: photo · list · price · schedule · big · table */ });
      return L; };
  });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpK && A(tp.types)[0] === 'k12') {
          if (tp.layout && window.HPL && HPL.fam && HPL.fam[tp.layout]) { if (typeof HPL.apply === 'function') HPL.apply(s, tp.layout); else s.layout = tp.layout; } else delete s.layout;
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const v = HPSTOCK.slotImg(tp.photos[sl], sl); if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-k12 siteFromTpl', e); }
      return s; };
    if (base.hpc) f.hpc = base.hpc;
    siteFromTpl = f; window.siteFromTpl = f; }
})();
