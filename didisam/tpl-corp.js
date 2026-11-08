/* v34.5 tpl-corp — 유형 디자이너 TC: corp(기업 아카데미 · HRD 포털 · 온보딩 · 법정교육 · 리더십 · 고객 · 협력사 교육) 템플릿 재배치 (fix6/BRIEF5.md)
   뼈대: RULES_B2 '기업 HRD' — 진한 단색 또는 사진 첫 화면 + 서비스 패널 → 서비스 큰 카드 → 교육 테마 → 문의. 국내 기본 4요소(공지 · 문의 · 신청 · 신뢰)를 업종마다 다른 순서로.
   - types[0]이 corp인 템플릿 15종(global.js 4 + tpl-c.js 11)을 id로 찾아 덮어쓰고, IT 보안 교육 1종을 새로 넣는다(tc-security). 원본 파일은 고치지 않는다.
     공유 템플릿(voc-employer · t3-v-remote · t3-v-factory · t3-v-consort = TV, solo-creator = TA)은 손대지 않는다.
   - 업종 16가지: 그룹 아카데미 · 신입 온보딩 · 법정의무교육 · 파트너 인증 · 리더십 · AI 전환 · 제조 안전 · 영업 · 프랜차이즈 · 고객사 제품 교육 · 협력사 ·
     직무 학교 · 사내 강사 · 글로벌 · ESG · IT 보안. BRIEF7: 기업 주력 계열 6개(bulletin · story · portal · sidebar · editorial · splitscreen, 공유 템플릿과 합쳐 같은 계열 최대 2)와 S3 첫 화면(box · split · scrim · grid)만 쓴다. 어두운 첫 화면 2종(리더십 · 제조 안전), eyebrow 한글, 단계 · 타임라인 섹션은 16종 중 6종만.
   - 템플릿마다: layout · theme · palette(HPC, 서로 다름 · 공유 템플릿 팔레트와도 다름) · photos(HPSTOCK, 첫 화면 사진 서로 다름) · hps · 섹션 구성(업종별로 다시 씀)
   - 사실 원칙: 숫자는 실제 숫자 띠(hpt:'facts')만, 강사는 등록된 강사만, 후기는 실제 후기만, 연락처는 설정값만.
     법정교육 문구는 실제 기능에 연결된 것만 쓴다 — 과정의 법정 표시(c.legal) · 과정별 기준 진도와 평가(criteria) · 수료증 · 학습자 앱의 '필수교육 미이수' 알림(lLegal) ·
     운영자의 '마감 전 미이수자 안내 + 부서장 리포트' 자동화(ai.js legal-d7). 이수 기준 수치를 숫자 칸으로 만들지 않는다(과정마다 운영자가 정함).
   - 원 · 링 · 줄무늬 장식 CSS(tpl-c의 deco)는 걷어낸다. */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function' || typeof S2 !== 'function') return;
  const A = v => Array.isArray(v) ? v : [];
  const T = (variant, data) => S2('text', { variant, ...data });
  const ids = n => { try { return pubCls(n); } catch (e) { return []; } };
  const ft = () => (S.settings && S.settings.footer) || {};
  const org = () => (typeof spOrg === 'function' ? spOrg() : '') || (S.org && S.org.name) || '';
  const ban = d => S2('banner', d);
  const cls = (title, sub, o) => S2('classes', { eyebrow: '', title, sub: sub || '', ids: ids(o && o.n || 4), layout: (o && o.layout) || 'grid', ...(o && o.price ? { price: true } : {}) });
  const facts = (title) => T('stats', { hpt: 'facts', title: title || '', cols: [] });
  const people = (title) => T('profiles', { hpt: 'people', eyebrow: '', title, cols: [] });
  const reviews = (title) => S2('reviews', { eyebrow: '', title, note: '' });
  const notices = (title, o) => S2('notices', { eyebrow: '', title: title || '교육 공지', n: (o && o.n) || 4, ...(o && o.board ? { variant: 'board' } : {}) });
  const faq = (title, cols) => T('info', { hpt: 'faq', eyebrow: '', title: title || '자주 묻는 질문', cols });
  const cta = (title, body, btn, ck) => T('cta', { eyebrow: '', title, body, cta: btn || '문의하기', cols: [], ...(ck ? { ck } : {}) });
  const map = title => S2('map', { title: title || '교육 문의', addr: ft().addr || '', tel: ft().tel || '' });
  /* 사진 띠: 샘플 사진 2~3장(분위기 사진 · 캡션 없음). 바로 고치기에서 '갤러리' 자리로 교체된다 */
  const gal = (P, alt) => { const H = window.HPSTOCK; const L = (H && Array.isArray(H.list)) ? P.map(id => H.list.find(x => x.id === id)).filter(Boolean) : [];
    return L.length >= 2 ? S2('image', { title: '', alt: alt || '교육 공간 분위기 사진', imgs: L.map(x => ({ src: x.src800 || x.src, title: '' })), dstyle: 2, hpiSlot: 'gallery' }) : null; };

  /* ── 템플릿별 설정 ──
     cd: 강좌 카드(S2) · L: 계열(없으면 S3 첫 화면 hk) · th: 테마 · pal: 팔레트 · ph: { hero, about, space, cta, gallery } · hd: [머리글, 바닥글, 휴대폰 메뉴] · ck: 신청 띠 */
  const CFG = {
    /* 그룹 아카데미: S3 사진 + 겹친 글자 상자(행사장 마이크) — corp 기본 시작 템플릿(마법사 시안의 바탕이라 계열 없이 둔다) */
    'corp-academy': { cd: 'table', name: '그룹 인재개발 아카데미', hk: 'box', th: 'official', pal: 'harbor', ph: { hero: 'hum-11', about: 'lec-03', space: 'lec-02', cta: 'off-06' }, hd: ['solid', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '인재개발 아카데미', title: `${org()}\n인재개발 아카데미`, sub: '직무 · 리더십 · 필수교육을 한 포털에서 신청하고, 이수 기록과 수료증까지 한 번에 확인합니다.', cta: '내 교육 보기', cta2: '연간 교육체계' }),
        notices('교육 공지', { board: 1, n: 5 }),
        T('tiles', { eyebrow: '', title: '교육 체계', sub: '직급 · 직무에 따라 필수 과정과 선택 과정이 나뉩니다.', cols: [['공통 역량', '회사 이해 · 협업 · 문서'], ['직무 역량', '부서별 전문 과정'], ['리더십', '직급별 리더 과정'], ['필수교육', '법정 · 사내 필수 과정']] }),
        cls('이번 분기 개설 과정', '과정을 눌러 대상 · 일정 · 신청 기간을 확인하세요.', { n: 6 }),
        T('steps', { eyebrow: '', title: '교육 신청에서 이수까지', cols: [['과정 신청', '포털에서 신청 · 부서장 승인'], ['학습', '온라인 · 집합 교육 참여'], ['평가 · 설문', '과정별 평가와 만족도 설문'], ['이수 기록', '수료증 발급과 이력 저장']] }),
        gal(['sem-01', 'lec-02', 'off-06'], '세미나실과 강당 분위기 사진'),
        reviews('수강 후기'),
        cta('부서 맞춤 교육이 필요하신가요?', '부서 과제에 맞춘 과정 개설과 사내 강사 연결은 인재개발 담당 부서에서 안내합니다.', '교육 문의'),
        map('교육 문의')] },
    /* 신입 온보딩: 이야기형(입사 첫날 → 첫 주 → 첫 달 세로 줄기 · 밝은 창가 책상) — 순서가 곧 내용 */
    'corp-onboard': { cd: 'list', name: '신입 입사자 온보딩', L: 'story', th: 'clean', pal: 'tealcorp', ph: { hero: 'hum-36', about: 'off-02', space: 'off-04', cta: 'lap-10' }, hd: ['float', 'min', 'drawer'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '입사 첫 30일', title: '입사 첫 달을\n함께 걷습니다', sub: '첫날 준비물부터 업무 도구, 직무 기초, 멘토 미팅까지 알아야 할 것만 순서대로 안내합니다.', cta: '온보딩 시작', cta2: '첫날 안내' }),
        T('timeline', { eyebrow: '', title: '첫 달은 이렇게 흘러갑니다', cols: [['입사 첫날', '계정 발급 · 자리 · 팀 소개'], ['첫 주', '회사 이해 · 업무 도구 익히기'], ['둘째 · 셋째 주', '직무 기초 과정과 실습 과제'], ['첫 달 마무리', '멘토 미팅 · 회고 · 다음 목표']] }),
        cls('온보딩 필수 과정', '배정된 과정을 순서대로 들으면 됩니다.'),
        T('features', { eyebrow: '', title: '혼자 헤매지 않게', cols: [['멘토 배정', '같은 팀 선배가 첫 달을 함께'], ['체크리스트', '할 일을 하나씩 확인'], ['질문 게시판', '사소한 것도 편하게 질문'], ['회고', '첫 달 경험을 정리하고 공유']] }),
        gal(['off-03', 'off-04', 'lap-10'], '사무실 라운지와 회의 공간 사진'),
        notices('입사자 안내'),
        faq('', [['입사 전에 미리 들을 수 있나요?', '계정이 발급되면 회사 이해 과정부터 먼저 들을 수 있습니다.'], ['온보딩 과정이 끝나면 어떻게 되나요?', '직무별 과정이 이어서 배정되고, 이수 기록은 내 강의에 남습니다.']]),
        cta('궁금한 점은 담당자에게', '입사 서류 · 계정 · 교육 일정 문의는 인사 담당 부서에서 안내합니다.', '온보딩 문의')] },
    /* 법정의무교육: 알림판형(마감 공지 · 이수 인정 방식 표 · FAQ) — 실제 기능만 문구로, 단계 섹션 없음 */
    'corp-legal': { cd: 'table', name: '법정의무교육 센터', L: 'bulletin', th: 'official', pal: 'oxford', ph: { hero: 'hum-01', about: 'lap-04', space: 'lap-09', cta: 'dsk-05' }, hd: ['notice', 'biz', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '법정의무교육', title: '법정의무교육,\n마감 전에 끝내세요', sub: '직장 내 성희롱 예방 · 개인정보 보호 · 장애인 인식 개선 · 직장 내 괴롭힘 예방 교육을 온라인으로 이수합니다.', cta: '내 필수교육 보기', cta2: '이수 방법' }),
        notices('마감 · 일정 공지', { n: 5 }),
        T('info', { eyebrow: '', title: '이수는 이렇게 인정됩니다', cols: [['이수 기준', '과정마다 정한 기준 진도와 평가를 마치면 이수로 기록됩니다'], ['수료증', '이수한 과정의 수료증은 내 강의에서 바로 받을 수 있습니다'], ['마감 알림', '마감이 다가오면 미이수 과정을 학습자 앱에서 먼저 알려 드립니다'], ['부서 현황', '교육 담당자가 마감 전 미이수자 안내와 부서장 이수 리포트를 보냅니다']] }),
        cls('올해 법정교육 과정', '배정된 과정을 마감 전에 이수해 주세요.', { n: 4 }),
        faq('', [['휴대폰으로 들어도 이수가 되나요?', 'PC와 휴대폰 어디서 들어도 같은 진도로 기록됩니다.'], ['수료증은 어디서 받나요?', '학습자 앱의 내 강의 → 수료증에서 내려받을 수 있습니다.']]),
        cta('이수 기록에 문제가 있나요?', '진도 · 수료증 · 마감 연장 문의는 교육 담당 부서에서 확인해 드립니다.', '이수 문의', 'contact')] },
    /* 파트너 인증: S3 좌우 분할(마주 앉은 상담 테이블) — 리셀러 · 대리점 인증 프로그램. adult의 첫 템플릿(tplFor('adult')[0])이기도 해서 마법사 시안 바탕이 되므로 계열 없이 둔다 */
    'corp-partner': { cd: 'big', name: '파트너 · 대리점 인증 아카데미', hk: 'split', th: 'tech', pal: 'denim', ph: { hero: 'hum-10', about: 'lap-01', space: 'sem-01', cta: 'lap-03' }, hd: ['solid', 'cols', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '파트너 인증 프로그램', title: '인증 파트너가\n되는 길', sub: '판매 · 구축 · 기술 지원 파트너를 위한 단계별 제품 교육과 인증 평가를 제공합니다.', cta: '인증 과정 시작', cta2: '인증 단계 보기' }),
        cls('인증 과정', '역할에 맞는 인증부터 시작하세요.', { n: 4 }),
        gal(['lap-01', 'sem-01', 'lap-03'], '노트북과 세미나실 사진'),
        T('timeline', { eyebrow: '', title: '인증 단계', sub: '단계마다 실습 과제와 평가가 있습니다.', cols: [['기초', '제품 개념 · 기본 시연'], ['판매', '고객 상담 · 제안 시나리오'], ['구축', '설치 · 설정 · 연동 실습'], ['기술 지원', '장애 진단과 문제 해결']] }),
        T('features', { eyebrow: '', title: '파트너에게 드리는 것', cols: [['인증 수료증', '단계별 수료증 발급'], ['업데이트 교육', '새 기능 출시 때 짧은 영상'], ['영업 자료실', '제안 · 시연 자료 내려받기'], ['질문 게시판', '운영팀이 직접 답변']] }),
        facts(),
        reviews('파트너 후기'),
        cta('파트너 교육 등록을 원하시나요?', '파트너 계정 발급과 인증 일정은 파트너 지원 담당자가 안내합니다.', '파트너 등록 문의')] },
    /* 리더십: S3 전면 사진 + 스크림(대강당 무대 · 먹색 · 금색) — 어두운 첫 화면 1 */
    't3-c-leader': { cd: 'list', hk: 'scrim', th: 'premium', pal: 'noirgold', ph: { hero: 'lec-02', about: 'sem-01', space: 'lec-02', cta: 'dsk-05' }, hd: ['overlay', 'mega', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '리더십 아카데미', title: '사람을 이끄는 일도\n배워서 잘할 수 있습니다', sub: '신임 리더부터 조직 책임자까지, 직급마다 필요한 리더십 과정을 순서대로 이수하고 기록합니다.', cta: '내 리더 과정 보기', cta2: '직급별 로드맵' }),
        T('timeline', { eyebrow: '', title: '직급별 리더십 로드맵', sub: '승진 시점에 맞춰 다음 단계 과정이 배정됩니다.', cols: [['예비 리더', '셀프 리더십 · 협업 커뮤니케이션'], ['신임 리더', '업무 위임 · 피드백 · 1:1 면담'], ['중간 관리자', '성과 관리 · 갈등 조정 · 코칭'], ['조직 책임자', '전략 실행 · 변화 관리 · 인재 육성']] }),
        T('features', { eyebrow: '', title: '이론으로 끝내지 않습니다', cols: [['사전 진단', '리더십 행동 자기 진단으로 출발점 확인'], ['사례 토론', '실제 조직 상황을 다룬 사례로 토의'], ['현업 적용 과제', '배운 내용을 팀에 적용하고 결과 공유'], ['코칭 피드백', '과제마다 코멘트와 다음 행동 제안']] }),
        cls('이번 분기 리더십 과정', '직급과 승진 예정 시기에 맞는 과정을 신청하세요.'),
        people('과정을 이끄는 강사'),
        reviews('수료한 리더의 이야기'),
        cta('리더 과정 배정이 궁금하신가요?', '승진 예정자 과정 배정 · 이수 인정 · 일정 변경은 교육 담당 부서에서 안내합니다.', '교육 문의')] },
    /* AI 전환: S3 사진 + 겹친 글자 상자(밝은 서재 책상 위 노트북) — 단계 대신 직무 트랙 · 사용 수칙 표 */
    't3-c-ax': { cd: 'schedule', hk: 'box', th: 'clean', pal: 'volt', ph: { hero: 'lap-02', about: 'cod-02', space: 'stu-01', cta: 'cod-04' }, hd: ['solid', 'mega', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: 'AI 전환 아카데미', title: '업무에 바로 쓰는\n생성형 AI', sub: '문서 · 데이터 · 보고 업무를 AI와 함께 처리하는 방법을 직무별 실습으로 익힙니다. 사내 보안 기준도 함께 배웁니다.', cta: 'AI 과정 시작', cta2: '직무별 트랙' }),
        T('tiles', { eyebrow: '', title: '직무별 실습 트랙', sub: '내 직무에 맞는 실습부터 시작하세요.', cols: [['경영지원', '보고서 · 규정 문서'], ['영업 · 마케팅', '제안서 · 고객 분석'], ['생산 · 품질', '점검 기록 · 이상 분석'], ['연구 · 개발', '자료 조사 · 코드 보조']] }),
        cls('지금 열린 AI 과정', '입문부터 자동화까지 단계별로 신청할 수 있습니다.'),
        T('info', { eyebrow: '', title: 'AI 쓰기 전에 꼭 확인하세요', cols: [['입력 금지 정보', '개인정보 · 고객 정보 · 영업 비밀은 외부 AI에 넣지 않습니다'], ['결과 확인', 'AI가 만든 내용은 사실과 출처를 사람이 다시 확인합니다'], ['사내 기준', '회사가 허용한 도구와 계정으로만 사용합니다']] }),
        notices('AX 소식'),
        cta('우리 부서 맞춤 실습이 필요하신가요?', '부서 업무에 맞춘 실습 과제와 사례 공유회를 함께 설계합니다.', '맞춤 과정 요청')] },
    /* 제조 안전: S3 전면 사진 + 스크림(어두운 공구 가방) — 어두운 첫 화면 2, 대상별 교육 표 */
    't3-c-safety': { cd: 'table', hk: 'scrim', th: 'official', pal: 'safety', ph: { hero: 'wrk-01', about: 'voc-01', space: 'wrk-05', cta: 'wrk-04' }, hd: ['overlay', 'biz', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '산업안전보건교육', title: '현장 안전교육,\n대상별로 빠짐없이', sub: '근로자 정기교육 · 채용 시 교육 · 작업내용 변경 시 교육 · 관리감독자 교육을 대상에 맞게 배정하고 이수 기록을 남깁니다.', cta: '내 안전교육 보기', cta2: '교육 대상 확인' }),
        T('info', { eyebrow: '', title: '교육 대상과 종류', sub: '세부 시간과 주기는 사업장 업종 · 규모에 따라 법령 기준을 따릅니다.', cols: [['근로자 정기교육', '모든 근로자 · 정해진 주기마다'], ['채용 시 교육', '신규 채용자 · 업무 배치 전'], ['작업내용 변경 시', '작업이 바뀐 근로자 · 변경 시점'], ['관리감독자 교육', '현장 관리감독자'], ['특별교육', '유해 · 위험 작업 종사자']] }),
        cls('올해 안전보건 과정', '배정된 과정을 기한 안에 이수하세요.', { n: 4 }),
        gal(['wrk-07', 'wrk-05', 'wrk-04'], '작업대와 공구 사진'),
        notices('안전 공지'),
        cta('사업장 안전교육 운영 문의', '대상자 명단 등록 · 집체 교육 일정 · 증빙 자료는 안전보건 담당 부서에서 안내합니다.', '안전교육 문의', 'contact')] },
    /* 영업: 좌우 분할(산호색 글 판 + 노트북 위 손) — 현장 직원 마이크로러닝 */
    't3-c-sales': { cd: 'photo', L: 'splitscreen', th: 'clean', pal: 'coral', ph: { hero: 'lap-03', about: 'off-04', space: 'lap-03', cta: 'dsk-02' }, hd: ['contact', 'cols', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '영업 · 서비스 아카데미', title: '꺼내 보는\n영업 · 응대 교육', sub: '짧은 영상과 확인 문항으로 상품 지식 · 고객 응대 · 상담 화법을 휴대폰에서 바로 익힙니다.', cta: '오늘의 학습 시작', cta2: '역할별 트랙' }),
        T('tiles', { eyebrow: '', title: '역할별 학습 트랙', cols: [['신규 영업 사원', '상품 기초 · 영업 규칙'], ['고객 응대', '응대 화법 · 불만 처리'], ['제안 · 계약', '상담 · 제안서 · 계약 실무'], ['팀장', '팀 코칭 · 성과 관리']] }),
        cls('추천 과정', '내 역할에 맞는 과정부터 시작하세요.'),
        T('features', { eyebrow: '', title: '바쁜 현장에 맞췄습니다', cols: [['짧은 영상', '이동 중에 끝내는 분량'], ['상황 연습', '실제 상담 상황으로 연습'], ['확인 문항', '영상마다 핵심만 점검'], ['진도 기록', '팀별 이수 현황 확인']] }),
        reviews('현장 직원 후기'),
        notices('신상품 · 교육 공지'),
        cta('신상품 출시 교육이 필요하신가요?', '팀 단위 출시 교육과 순회 교육 일정은 교육 담당자와 함께 정합니다.', '교육 요청')] },
    /* 프랜차이즈: S3 사진 + 겹친 글자 상자(밝은 원목 테이블) — 오픈 준비 순서를 표로 */
    't3-c-franchise': { cd: 'list', hk: 'box', th: 'warm', pal: 'tangerine', ph: { hero: 'off-02', gallery1: 'wrk-02', gallery2: 'wrk-06', about: 'dsk-04', cta: 'lib-05' }, hd: ['float', 'cta', 'drawer'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '가맹점 · 매장 교육', title: '매장 문을 열기 전\n꼭 배워야 할 것들', sub: '가맹점주와 매장 직원이 같은 기준으로 운영할 수 있도록 표준 매뉴얼 · 위생 · 응대 교육을 한 곳에서 제공합니다.', cta: '오픈 교육 시작', cta2: '교육 일정' }),
        T('info', { eyebrow: '', title: '오픈까지의 교육 순서', cols: [['브랜드 이해', '브랜드 기준과 운영 원칙'], ['표준 매뉴얼', '메뉴 · 상품 · 진열 기준'], ['매장 위생 · 안전', '위생 기준과 안전 수칙'], ['현장 실습', '교육 매장 실습과 점검'], ['오픈 점검', '오픈 전 최종 확인']] }),
        cls('점주 · 직원 과정', '점주용 · 직원용 과정을 나눠 신청하세요.'),
        T('features', { eyebrow: '', title: '오픈 뒤에도 계속', cols: [['신메뉴 교육', '출시 전 레시피 · 응대 영상'], ['새 직원 교육', '기초 과정 바로 배정'], ['운영 점검', '정기 점검 항목 학습'], ['매장 사례', '다른 매장의 운영 사례']] }),
        notices('본부 공지', { board: 1 }),
        reviews('점주 · 직원 후기'),
        cta('오픈 일정에 맞춘 교육 상담', '오픈 예정일을 알려 주시면 담당 슈퍼바이저가 교육 일정을 함께 정합니다.', '교육 문의'),
        map('본부 교육장')] },
    /* 고객사 제품 교육: 이야기형(밝은 책상 위 노트북) — 역할별 러닝 패스 · 도움말 */
    't3-c-customer': { cd: 'price', L: 'story', th: 'campus', pal: 'glacier', ph: { hero: 'hum-09', about: 'lap-02', space: 'off-06', cta: 'lap-09' }, hd: ['overlay', 'cols', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '고객 아카데미', title: '제품을 더 잘 쓰는\n가장 빠른 길', sub: '처음 쓰는 분부터 관리자까지, 역할에 맞는 러닝 패스를 따라가면 필요한 기능을 순서대로 익힐 수 있습니다.', cta: '러닝 패스 시작', cta2: '도입 교육 문의' }),
        T('tiles', { eyebrow: '', title: '내 역할에 맞는 경로', sub: '기능 목록이 아니라 하는 일 기준으로 묶었습니다.', cols: [['처음 쓰는 사용자', '가입부터 첫 결과까지'], ['실무 담당자', '자주 쓰는 기능 · 작업 흐름'], ['관리자', '권한 · 설정 · 연동'], ['개발자', 'API · 데이터 연동']] }),
        cls('인기 러닝 패스', '어디서 시작할지 모르겠다면 이 과정부터.', { n: 6, price: 1 }),
        T('features', { eyebrow: '', title: '막히면 이렇게', cols: [['따라 하기 영상', '화면을 보며 그대로 실습'], ['질문 게시판', '운영팀 · 사용자끼리 묻고 답하기'], ['업데이트 교육', '새 기능 출시 때 짧은 영상 추가']] }),
        gal(['lap-05', 'off-06', 'lap-09'], '노트북과 책상 사진'),
        notices('업데이트 소식', { board: 1 }),
        faq('', [['팀원 계정으로도 들을 수 있나요?', '관리자가 팀원을 초대하면 각자 계정으로 러닝 패스를 들을 수 있습니다.'], ['수료증이 나오나요?', '러닝 패스를 마치면 내 강의에서 수료증을 받을 수 있습니다.']])] },
    /* 협력사: 포털형(재료를 다루는 손 사진 위 찾기 상자 · 공지 패널) — 참여 방법이 먼저 */
    't3-c-supplier': { cd: 'schedule', L: 'portal', th: 'official', pal: 'workbench', ph: { hero: 'hum-17', about: 'wrk-03', space: 'wrk-02', gallery: 'cls-03', cta: 'wrk-07' }, hd: ['notice', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '협력사 상생 교육', title: '함께 지키는\n품질 · 안전 기준', sub: '협력사 임직원이 품질 · 안전 · 윤리 기준을 같은 눈높이로 익힐 수 있도록 교육과 이수 기록을 제공합니다.', cta: '협력사 과정 보기', cta2: '참여 방법' }),
        T('features', { eyebrow: '', title: '지원 분야', cols: [['품질', '품질 기준 · 불량 예방'], ['안전', '현장 안전 수칙 · 위험성 평가'], ['윤리 · 공정거래', '거래 원칙 · 신고 절차'], ['ESG', '환경 · 인권 · 공급망 기준']] }),
        cls('협력사 공개 과정', '협력사 임직원 누구나 신청할 수 있습니다.'),
        T('steps', { eyebrow: '', title: '참여 방법', cols: [['협력사 등록', '담당 부서에 참여 신청'], ['계정 발급', '임직원 계정 일괄 등록'], ['과정 배정', '분야별 과정 배정'], ['이수 보고', '협력사별 이수 현황 공유']] }),
        notices('협력사 공지'),
        faq('', [['비용이 드나요?', '참여 조건과 비용은 협력사 지원 부서에서 과정별로 안내합니다.'], ['이수 결과를 받을 수 있나요?', '협력사 담당자에게 임직원 이수 현황을 공유합니다.']]),
        cta('협력사 교육 참여 문의', '참여 대상 · 계정 등록 · 이수 보고 방식은 협력사 지원 부서에서 안내합니다.', '참여 문의')] },
    /* 직무 학교: 사이드 메뉴형(왼쪽 고정 직무 스쿨 · 서가 책상 사진) — 레벨 표 */
    't3-c-job': { cd: 'table', L: 'sidebar', th: 'clean', pal: 'midnight', ph: { hero: 'hum-13', about: 'lec-01', space: 'cls-02', cta: 'lap-08' }, hd: ['solid', 'mega', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '사내 직무 학교', title: '우리 회사 직무 전문가는\n여기서 자랍니다', sub: '직무마다 필요한 역량을 레벨로 나누고, 레벨별 과정과 평가로 전문가 성장 경로를 안내합니다.', cta: '내 직무 트랙', cta2: '레벨 기준' }),
        notices('직무 스쿨 공지'),
        T('tiles', { eyebrow: '', title: '직무 스쿨', cols: [['경영 · 기획', '전략 · 재무 · 인사'], ['영업 · 마케팅', '고객 · 시장 · 브랜드'], ['생산 · 품질', '공정 · 품질 · 설비'], ['연구 · 개발', '기술 · 데이터 · 특허'], ['IT · 디지털', '시스템 · 보안 · 데이터'], ['고객 지원', '서비스 · 상담 · 운영']] }),
        T('timeline', { eyebrow: '', title: '역량 레벨', cols: [['기본', '직무 용어와 기본 업무'], ['실무', '혼자 업무를 끝까지 수행'], ['심화', '문제 해결과 개선 주도'], ['전문가', '사내 강의 · 후배 지도']] }),
        cls('레벨별 추천 과정', '내 직무와 현재 레벨에 맞는 과정을 확인하세요.', { n: 6 }),
        facts(),
        cta('레벨 인정 기준이 궁금하신가요?', '레벨 평가 일정과 경력 인정 기준은 인재개발 담당 부서에서 안내합니다.', '교육 문의')] },
    /* 사내 강사 · 지식 나눔: 매거진형(명조 제목 · 필기하는 손) — 사내 강사 · 운영 방식 표 */
    't3-c-share': { cd: 'big', L: 'editorial', th: 'warm', pal: 'ochre', ph: { hero: 'hum-03', about: 'sem-01', space: 'off-03', cta: 'dsk-01' }, hd: ['solid', 'min', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '지식 나눔', title: '동료의 노하우를\n강의로 나눕니다', sub: '현장에서 쌓은 경험을 사내 강사가 짧은 강의로 만들고, 동료는 필요한 순간에 찾아 배웁니다.', cta: '사내 강의 둘러보기', cta2: '사내 강사 지원' }),
        cls('새로 올라온 사내 강의', '동료가 만든 강의를 먼저 들어 보세요.'),
        people('사내 강사'),
        T('info', { eyebrow: '', title: '사내 강사가 되는 길', cols: [['지원', '나눌 주제와 경험 작성'], ['강사 교육', '강의 설계 · 전달 기법'], ['시범 강의', '동료 앞에서 시범 강의'], ['정식 활동', '사내 강의 공개']] }),
        T('features', { eyebrow: '', title: '이렇게 운영합니다', cols: [['주제 제안', '필요한 주제를 누구나 제안'], ['강의 제작', '짧은 영상 · 자료로 제작 지원'], ['검토 · 공개', '담당 부서 검토 후 공개'], ['피드백', '수강 후 질문과 개선 의견']] }),
        reviews('수강한 동료의 한마디'),
        cta('나누고 싶은 노하우가 있나요?', '사내 강사 지원과 강의 제작 지원은 교육 담당 부서에서 안내합니다.', '사내 강사 지원')] },
    /* 글로벌: S3 큰 제목 + 사진 격자(곡선 강의실) — 국문 · 영문 과정 */
    't3-c-global': { cd: 'photo', hk: 'grid', th: 'clean', pal: 'granite', ph: { hero: 'lec-03', about: 'arc-03', space: 'arc-01', cta: 'off-07' }, hd: ['overlay', 'cols', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '글로벌 러닝', title: '본사와 해외 법인이\n같은 기준으로 배웁니다', sub: '공통 가치 · 규정 · 직무 교육을 국문과 영문으로 제공하고, 법인별 이수 현황을 한 곳에서 관리합니다.', cta: '내 교육 보기', cta2: '법인별 안내' }),
        T('features', { eyebrow: '', title: '전 법인 공통 과정', cols: [['행동 규범', 'Code of Conduct'], ['정보 보안', 'Information Security'], ['공정 거래 · 반부패', 'Anti-Corruption'], ['직무 기본', 'Job Fundamentals']] }),
        gal(['arc-02', 'arc-01', 'off-07'], '도시와 사무 공간 사진'),
        cls('공통 · 직무 과정', '언어를 바꾸면 같은 과정의 다른 언어판을 볼 수 있습니다.'),
        T('tiles', { eyebrow: '', title: '법인별 교육 안내', cols: [['본사', '국문 과정 · 법정교육'], ['해외 법인', '영문 과정 · 현지 규정'], ['파견 · 주재원', '부임 전 교육 · 현지 이해']] }),
        notices('글로벌 교육 공지'),
        cta('법인별 과정 배정 문의', '법인 · 언어별 과정 배정과 이수 보고 일정은 글로벌 교육 담당 부서에서 안내합니다.', '교육 문의')] },
    /* ESG: S3 좌우 분할(잔디와 건물) — 영역 · 연간 순서 표 */
    't3-c-esg': { cd: 'list', hk: 'split', th: 'campus', pal: 'olive', ph: { hero: 'cam-03', about: 'nat-03', space: 'nat-01', cta: 'cam-05' }, hd: ['solid', 'cta', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '윤리 · 지속가능경영', title: '바르게 일하는 기준,\n함께 지킵니다', sub: '윤리경영 · 준법 · 환경 · 인권 교육을 임직원 모두가 이수하고, 연간 윤리 서약까지 한 흐름으로 진행합니다.', cta: '필수 과정 보기', cta2: '윤리 서약 안내' }),
        T('features', { eyebrow: '', title: '네 가지 교육 영역', cols: [['윤리경영', '이해 상충 · 선물 · 접대 기준'], ['준법', '공정거래 · 개인정보 · 하도급'], ['환경', '탄소 · 자원 · 환경 법규'], ['인권 · 다양성', '존중하는 일터 · 차별 금지']] }),
        T('info', { eyebrow: '', title: '한 해의 진행 순서', cols: [['필수 교육', '영역별 온라인 과정 이수'], ['사례 학습', '판단이 어려운 상황 토론'], ['윤리 서약', '연간 서약 제출'], ['결과 공유', '부서별 이수 · 서약 현황']] }),
        cls('올해 필수 과정', '기한 안에 이수해 주세요.'),
        gal(['nat-03', 'nat-01', 'cam-05'], '정원과 녹지 사진'),
        notices('윤리 · ESG 공지'),
        cta('판단이 어려운 상황이 있나요?', '윤리 · 준법 상담과 제보는 담당 부서가 비밀을 지켜 처리합니다.', '상담 · 제보 안내')] },
    /* IT 보안(새 템플릿): S3 큰 제목 + 사진 격자(코드 화면) — 보안 수칙 · 사고 대응 표 */
    'tc-security': { cd: 'schedule', hk: 'grid', th: 'tech', pal: 'circuit', ph: { hero: 'cod-01', about: 'cod-01', space: 'lap-08', cta: 'off-07' }, hd: ['notice', 'cols', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '정보보호 교육', title: '보안은 습관입니다', sub: '피싱 메일 구별부터 계정 · 문서 관리, 사고 신고까지 모든 임직원이 알아야 할 보안 수칙을 짧은 과정으로 익힙니다.', cta: '보안 과정 시작', cta2: '사고 신고 방법' }),
        T('tiles', { eyebrow: '', title: '이번에 꼭 볼 것', cols: [['피싱 메일 구별', '링크 · 첨부를 열기 전에'], ['계정 보호', '비밀번호 · 2단계 인증'], ['문서 반출', '외부 공유 · 저장 매체 기준'], ['사고 신고', '이상 징후를 알리는 방법']] }),
        cls('보안 필수 과정', '역할에 따라 배정된 과정을 이수하세요.'),
        T('info', { eyebrow: '', title: '보안 사고가 의심되면', cols: [['멈추기', '링크 · 첨부를 더 열지 않기'], ['알리기', '보안 담당 부서에 바로 신고'], ['격리', '안내에 따라 기기 · 계정 조치'], ['돌아보기', '사례를 교육으로 공유']] }),
        notices('보안 공지', { board: 1 }),
        faq('', [['개발자용 과정도 있나요?', '시스템 · 개발 직무는 보안 코딩과 접근 권한 관리 과정이 추가로 배정됩니다.'], ['모의 훈련 결과는 어떻게 쓰이나요?', '개인 평가가 아니라 교육 주제를 정하는 데 씁니다.']]),
        cta('보안 교육 운영 문의', '부서별 보안 교육 일정과 과정 배정은 정보보호 담당 부서에서 안내합니다.', '보안 교육 문의', 'contact')] }
  };

  /* ── 새 템플릿: IT 보안 교육 ── */
  if (!TPL.some(t => t && t.id === 'tc-security'))
    TPL.push({ id: 'tc-security', name: 'IT 보안 · 정보보호 교육', types: ['corp'], scene: '피싱 · 계정 · 문서 보안 수칙과 사고 신고 교육', color: '#0F766E', tone: '신뢰', look: 'corpPortal', ref: '기업 정보보호 교육 포털형', theme: 'tech', hero: '', build: () => [] });

  /* ── 템플릿 덮어쓰기 ── */
  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'corp') return;
    const c = CFG[id];
    tp.tpC = 1; tp.theme = c.th; tp.palette = c.pal; if (c.name) tp.name = c.name;
    if (c.L) { tp.layout = c.L; tp.hero = ''; } else { delete tp.layout; tp.hero = { split: 'split', box: 'center', scrim: 'bg', grid: 'center' }[c.hk] || ''; }
    tp.photos = Object.assign({}, c.ph);
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    delete tp.deco; /* 원 · 링 · 줄무늬 장식 CSS 걷어냄 */
    tp.build = () => { const L = A(c.build()).filter(Boolean);
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner' && c.hk) d.hk = c.hk;
        if (x.type === 'text' && d.variant === 'cta' && c.ck && !d.ck) d.ck = c.ck;
        if (x.type === 'classes' && c.cd && !d.card) d.card = c.cd; });
      return L; };
  });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpC && A(tp.types)[0] === 'corp') {
          if (tp.layout && window.HPL && HPL.fam && HPL.fam[tp.layout]) { if (typeof HPL.apply === 'function') HPL.apply(s, tp.layout); else s.layout = tp.layout; } else delete s.layout;
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const v = HPSTOCK.slotImg(tp.photos[sl], sl); if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-corp siteFromTpl', e); }
      return s; };
    if (base.hpc) f.hpc = base.hpc;
    siteFromTpl = f; window.siteFromTpl = f; }
})();
