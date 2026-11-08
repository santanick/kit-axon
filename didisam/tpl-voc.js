/* v34.5 tpl-voc — 유형 디자이너 TV: voc(직업훈련 · 내일배움카드 · 부트캠프 · 사업주 훈련 · 기술 실습) 템플릿 재배치 (fix6/BRIEF5.md)
   뼈대: RULES_B2 '직업훈련 · 부트캠프' — 첫 화면(모집 · [수강신청] [상담]) → 과정 카드(일정 · 지원 제도는 실제 해당 시만) → 훈련 방식 · 절차 → 공지 → 대표번호
   - types[0]이 voc인 템플릿 14종(global.js 2 + tpl-c.js 12)을 id로 찾아 덮어쓰고, 업종 2종(자동차 정비 · 전산회계 사무)을 새로 더한다(id 접두어 tv-).
     원본 파일은 고치지 않는다. 공유 템플릿(adult-bootcamp · solo-creator)은 types[0]이 adult라 TA 몫이므로 손대지 않는다.
   - BRIEF7: 직업훈련 주력 계열 6종(fullbleed · editorial · portal · bulletin · story · typo, 계열마다 최대 2)과 S3 사진 첫 화면(grid · split · box · scrim)으로 짠다.
     어두운 첫 화면은 2종(용접 fullbleed · 정비 scrim)까지만, eyebrow는 한글. 첫 화면 사진은 FC 재배정표(FC_hero_map.json)가 나오면 그에 맞춘다.
   - 템플릿마다: layout · theme · palette(HPC, 모두 다름) · photos(HPSTOCK, 첫 화면 사진 모두 다름) · hps(머리글 · 바닥글 · 휴대폰 메뉴) · 강좌 카드(S2) · 섹션 구성(업종별로 다시 씀)
   - 사실 원칙: 숫자는 실제 숫자 띠(hpt:'facts')만, 후기는 실제 후기만, 연락처는 설정값만. 문구에 기간 · 인원 · 취업률 · 지원 금액 · 출석 기준 숫자를 쓰지 않는다.
     직업훈련 규정(수료 출석률 · 진도율)은 규정 준수 기능(compliance.js · attcalc.js)이 학습자 앱 「나의 출결」 · 강좌 화면 수료 기준에 보여 주는 것과 연결된 문구로만 안내한다(숫자 칸 금지).
   - 원 · 링 · 줄무늬 장식 CSS(tpl-c의 deco: hazard · mono · rail …)는 걷어낸다. */
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
  const cta = (title, body, btn, ck) => T('cta', { eyebrow: '', title, body, cta: btn || '상담 신청', cols: [], ...(ck ? { ck } : {}) });
  const map = title => S2('map', { title: title || '오시는 길', addr: ft().addr || '', tel: ft().tel || '' });
  /* 사진 띠: 샘플 사진 2~3장(분위기 사진 · 캡션 없음). 바로 고치기에서 '갤러리' 자리로 교체된다 */
  const gal = (P, alt) => { const H = window.HPSTOCK; const L = (H && Array.isArray(H.list)) ? P.map(id => H.list.find(x => x.id === id)).filter(Boolean) : [];
    return L.length >= 2 ? S2('image', { title: '', alt: alt || '실습 공간 분위기 사진', imgs: L.map(x => ({ src: x.src800 || x.src, title: '' })), dstyle: 2, hpiSlot: 'gallery' }) : null; };
  /* 규정 연결 문구: 숫자는 규정 준수 설정이 학습자 앱에 보여 준다(여기서는 숫자를 쓰지 않음) */
  const RULE_ATT = ['출결 · 수료 기준', '훈련기관 규정의 출석률 · 평가 기준을 채우면 수료합니다. 내 출석률은 학습자 앱 클래스 화면의 「나의 출결」에서 확인합니다.'];
  const RULE_PROG = ['진도 · 수료 기준', '원격훈련은 과정이 정한 진도율과 평가 기준을 채워야 수료합니다. 내 진도와 수료 기준은 학습자 앱 강좌 화면에서 확인합니다.'];

  /* ── 템플릿별 설정 ──
     cd: 강좌 카드(S2) · L: 계열(없으면 S3 첫 화면 hk) · th: 테마 · pal: 팔레트 · ph: 사진(HPSTOCK) · hd: [머리글, 바닥글, 휴대폰 메뉴] · ck: 신청 띠 */
  const CFG = {
    /* 국비 IT 부트캠프: S3 큰 제목 + 사진 격자(어깨 너머 코드 화면) — 기수 일정이 먼저 보이는 모집 페이지(벤토는 adult-bootcamp가 씀) */
    't3-v-kdt': { cd: 'schedule', th: 'tech', pal: 'circuit', hk: 'grid', ph: { hero: 'hum-07', about: 'cod-01', space: 'lec-01', cta: 'cod-04' }, hd: ['contact', 'cols', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '국비 디지털 부트캠프', title: '코드로 배우고\n리뷰로 자랍니다', sub: '국민내일배움카드로 참여하는 집중 훈련. 기초 수업부터 팀 프로젝트, 포트폴리오 정리까지 한 기수가 함께 갑니다.', cta: '이번 기수 지원', cta2: '선발 일정' }),
        cls('모집 중인 기수', '기수마다 모집 마감과 개강일이 다릅니다. 일정을 확인하고 지원하세요.'),
        T('timeline', { eyebrow: '', title: '지원부터 수료까지', cols: [['지원서 접수', '온라인 지원 · 카드 발급 확인'], ['사전 과제', '기초 학습 과제 제출'], ['인터뷰', '학습 목표와 일정 확인'], ['훈련', '기초 → 심화 → 팀 프로젝트'], ['수료 · 취업 준비', '포트폴리오 · 이력서 · 모의 면접']] }),
        gal(['cod-03', 'stu-01', 'lec-01'], '노트북 코딩과 강의실 사진'),
        T('features', { eyebrow: '', title: '하루의 학습', cols: [['라이브 수업', '정해진 시간에 함께 듣는 수업'], ['코드 리뷰', '과제마다 리뷰와 수정 제안'], ['팀 프로젝트', '기획부터 배포까지 팀으로'], ['학습 기록', '출결 · 과제 · 프로젝트가 앱에 쌓입니다']] }),
        facts(),
        T('info', { eyebrow: '', title: '지원 전 확인하세요', cols: [['참여 조건', '국민내일배움카드 발급과 과정별 자격'], RULE_ATT, ['비용 · 장려금', '자부담 · 훈련장려금은 모집 공지와 고용24 기준']] }),
        reviews('수료생 후기'),
        faq('', [['비전공자도 지원할 수 있나요?', '기초 과정부터 시작합니다. 사전 과제와 인터뷰로 학습 준비 정도를 함께 확인합니다.'], ['수업은 온라인인가요?', '과정마다 다릅니다. 과정 카드에서 훈련 방식(집체 · 원격 · 혼합)을 확인하세요.']]),
        cta('나에게 맞는 기수인지\n상담으로 확인하세요', '전공 · 경력 · 가능한 일정을 알려 주시면 맞는 과정을 안내해 드립니다.', '수강 상담 신청')] },

    /* 디자인 · 영상: 매거진형(명조 제목 · 레터링 작업 사진) — 작업물이 먼저 말하는 포트폴리오 과정 */
    't3-v-design': { cd: 'big', L: 'editorial', th: 'warm', pal: 'press', ph: { hero: 'hum-28', gallery1: 'dsk-04', gallery2: 'lap-02', gallery3: 'dsk-02', about: 'stu-02', cta: 'dsk-05' }, hd: ['float', 'min', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '디자인 · 영상 실무', title: '작업으로 증명하는\n포트폴리오', sub: 'UI · 편집 · 영상 편집 도구를 과제마다 직접 쓰고, 훈련교사 피드백으로 작업물을 다듬어 포트폴리오로 묶습니다.', cta: '과정 둘러보기', cta2: '수강 상담' }),
        T('features', { eyebrow: '', title: '과정에서 만드는 것', cols: [['UI · 웹 디자인', '화면 설계부터 시안까지'], ['편집 디자인', '포스터 · 브로슈어 · 상세 페이지'], ['영상 편집', '촬영본 편집 · 자막 · 모션'], ['포트폴리오', '작업 과정을 설명하는 한 권']] }),
        cls('모집 중인 과정', '작업 도구와 훈련 기간을 확인하세요.'),
        T('steps', { eyebrow: '', title: '한 과제가 완성되는 과정', cols: [['브리프', '과제 목표와 조건 읽기'], ['스케치', '아이디어를 손으로 먼저'], ['제작', '도구로 시안 만들기'], ['크리틱', '훈련교사 · 동료 피드백'], ['정리', '과정까지 포트폴리오에 기록']] }),
        reviews('수료생 후기'),
        notices('개강 · 특강 안내'),
        cta('지금 작업물로\n어디서 시작할지 상담하세요', '그동안 만든 작업이나 관심 분야를 알려 주시면 맞는 과정을 안내해 드립니다.', '포트폴리오 상담')] },

    /* 용접 · 전기 · 기계: 전체 화면 사진(용접 불꽃) — 실습장의 열기가 그대로 보이는 첫인상 */
    't3-v-trade': { cd: 'table', L: 'fullbleed', th: 'official', pal: 'safety', ph: { hero: 'voc-01', about: 'wrk-07', space: 'wrk-02', cta: 'wrk-04' }, hd: ['overlay', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '기계 · 용접 · 전기 기술훈련', title: '손으로 익힌 기술,\n현장에서 씁니다', sub: '실습장에서 장비를 직접 다루며 반복 훈련하고, 직종별 국가기술자격 준비까지 이어 갑니다.', cta: '훈련 직종 보기', cta2: '수강 상담' }),
        T('tiles', { eyebrow: '', title: '훈련 직종', cols: [['용접', '피복 아크 · CO₂ · TIG'], ['기계 가공', '선반 · 밀링 · CNC'], ['전기', '내선 공사 · 전기 설비'], ['설비 보전', '공조 · 배관 · 설비 점검']] }),
        cls('모집 중인 훈련과정', '직종별 개강일과 훈련 시간을 표로 확인하세요.', { n: 6 }),
        gal(['wrk-07', 'hum-20', 'hum-17'], '공구와 실습 작업대 사진'),
        T('steps', { eyebrow: '', title: '수강 절차', cols: [['상담', '직종 · 일정 상담'], ['카드 확인', '국민내일배움카드 발급 확인'], ['수강 신청', '고용24 신청 · 기관 승인'], ['안전 교육', '실습 전 안전 수칙 이수'], ['훈련 · 수료', '출결 · 실기 평가로 수료']] }),
        notices('모집 공지', { board: 1, n: 5 }),
        facts(),
        map('훈련원 오시는 길')] },

    /* 미용 · 조리 · 제과제빵: 이야기형(반죽하는 손 · 자격 취득 흐름을 세로 줄기로) — 손으로 만드는 서비스 직종 */
    't3-v-beauty': { cd: 'photo', L: 'story', th: 'warm', pal: 'coral', ph: { hero: 'hum-24', gallery1: 'wrk-06', gallery2: 'hum-23', about: 'off-02', cta: 'off-04' }, hd: ['contact', 'cta', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '미용 · 조리 · 제과제빵', title: '실습실에서 익혀\n내 가게까지', sub: '헤어 · 메이크업, 한식 · 양식 조리, 제과 · 제빵을 실습 위주로 배우고 자격 시험과 취업 · 창업을 함께 준비합니다.', cta: '과정 둘러보기', cta2: '상담 신청' }),
        T('tiles', { eyebrow: '', title: '훈련 분야', cols: [['헤어 · 메이크업', '커트 · 펌 · 메이크업'], ['피부 · 네일', '피부 관리 · 네일 아트'], ['조리', '한식 · 양식 조리 기능'], ['제과 · 제빵', '반죽 · 성형 · 굽기']] }),
        cls('주간 · 야간 과정', '일하면서 다닐 수 있는 야간 · 주말 반도 확인하세요.'),
        gal(['hum-23', 'wrk-06', 'hum-17'], '손으로 빚고 다듬는 실습 사진'),
        T('timeline', { eyebrow: '', title: '자격 취득 흐름', cols: [['위생 · 재료', '도구와 재료 다루기'], ['필기 준비', '필기 시험 대비 학습'], ['실기 반복', '시험 과제 반복 실습'], ['응시 · 진로', '실기 응시와 취업 · 창업 상담']] }),
        reviews('수료생 후기'),
        faq('', [['처음 배워도 되나요?', '기초 과정은 도구 잡는 법부터 시작합니다. 경력이 있으면 상담에서 시작 단계를 정합니다.'], ['재료비는 따로 드나요?', '과정마다 다릅니다. 모집 공지와 상담에서 미리 안내해 드립니다.']]),
        cta('어떤 분야가 맞을지\n상담으로 정해요', '희망 분야와 가능한 시간, 국비 지원 여부를 함께 확인해 드립니다.', '상담 신청하기')] },

    /* 국가기술자격: 큰 글자(필기 → 실기 단계가 제목처럼) — 시험 준비의 단단한 인상 */
    't3-v-license': { cd: 'list', L: 'typo', th: 'clean', pal: 'workbench', ph: { hero: 'hum-18', about: 'wrk-03', space: 'cls-03', cta: 'wrk-05' }, hd: ['solid', 'cols', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '기능사 · 산업기사 취득반', title: '필기 다음은 실기,\n순서대로 합격합니다', sub: '핵심 이론과 기출, 실기 과제를 단계별로 나누고, 단계마다 확인 문항으로 이해도를 점검합니다.', cta: '자격 과정 보기', cta2: '시험 일정 문의' }),
        T('steps', { eyebrow: '', title: '합격까지의 다섯 단계', cols: [['핵심 이론', '과목별 필수 개념'], ['기출 분석', '출제 경향과 반복 문제'], ['필기 모의평가', '실전 형식으로 점검'], ['실기 과제', '시험 과제를 반복 실습'], ['최종 점검', '약한 과제만 다시']] }),
        cls('개설 자격 과정', '목표 자격과 시험 회차에 맞는 과정을 고르세요.', { n: 6 }),
        gal(['wrk-03', 'dsk-02', 'cls-03'], '도면 · 필기 · 강의실 사진'),
        T('features', { eyebrow: '', title: '학습을 돕는 장치', cols: [['차시별 확인 문항', '배운 내용을 바로 점검'], ['질문 게시판', '막히는 문제를 훈련교사에게'], ['실기 피드백', '과제 결과의 개선점 안내'], ['학습 기록', '진도와 평가 결과를 한 화면에']] }),
        T('info', { eyebrow: '', title: '수강 전 확인할 것', cols: [['응시 자격', '종목별 응시 자격은 시행 기관 공고 기준'], ['시험 일정', '연간 시험 일정은 시행 기관 공고 기준'], ['국비 지원', '과정별 국민내일배움카드 사용 가능 여부']] }),
        reviews('수강생 후기'),
        cta('목표 자격과 시험 회차,\n같이 정해 드립니다', '현재 경력과 준비 기간을 알려 주시면 맞는 과정을 안내해 드립니다.', '상담 신청')] },

    /* 신중년 재취업: S3 좌우 분할(밝은 창가 책상의 뒷모습 · 아랫목 팔레트 큰 글씨) — 상담 먼저 */
    't3-v-midlife': { cd: 'big', th: 'warm', pal: 'hearth', hk: 'split', ph: { hero: 'hum-36', about: 'off-03', space: 'sem-01', cta: 'lib-05' }, hd: ['contact', 'biz', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '신중년 재취업 · 전직 훈련', title: '쌓아 온 경력에\n새 기술을 더합니다', sub: '경력 상담으로 맞는 직종을 찾고, 실습 위주 훈련과 이력서 · 면접 준비까지 천천히 함께합니다.', cta: '전화 · 방문 상담', cta2: '훈련과정 보기' }),
        T('features', { eyebrow: '', title: '이런 분께 맞습니다', cols: [['퇴직 · 전직 준비', '새 직종으로 옮기려는 분'], ['경력 단절 후 복귀', '다시 일을 시작하려는 분'], ['현장 기술 배우기', '자격과 기술을 갖추려는 분']] }),
        T('steps', { eyebrow: '', title: '이렇게 진행합니다', cols: [['경력 상담', '해 온 일과 희망 직종'], ['과정 선택', '맞는 훈련과정 안내'], ['실습 훈련', '손에 익을 때까지 반복'], ['취업 준비', '이력서 · 면접 · 구인 정보']] }),
        gal(['off-03', 'sem-01', 'lib-05'], '조용한 라운지와 세미나실 사진'),
        cls('지금 모집 중인 과정', '과정을 누르면 일정과 장소를 크게 볼 수 있습니다.', { n: 3 }),
        notices('모집 안내', { n: 3 }),
        facts(),
        map('방문 · 전화 상담')] },

    /* 청년 취업: 이야기형(첫 출근까지의 여정을 세로 줄기로) */
    't3-v-youth': { cd: 'photo', L: 'story', th: 'clean', pal: 'cobalt', ph: { hero: 'hum-15', about: 'stu-02', space: 'cls-01', cta: 'stu-01' }, hd: ['notice', 'cta', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '청년 취업 집중 훈련', title: '첫 출근 전까지,\n같이 준비하는 동기들', sub: '직무 훈련과 팀 프로젝트, 이력서 · 면접 준비를 한 과정 안에서. 같은 목표의 동기들과 일정을 맞춰 달립니다.', cta: '모집 과정 보기', cta2: '참여 자격 확인' }),
        gal(['lap-03', 'stu-01', 'cls-01'], '노트북 학습과 강의실 사진'),
        T('steps', { eyebrow: '', title: '입과에서 첫 출근까지', cols: [['직무 탐색', '관심 직무와 강점 찾기'], ['직무 훈련', '오전 수업 · 오후 실습'], ['팀 프로젝트', '실제 같은 과제로 결과물'], ['지원 서류', '이력서 · 자기소개서 첨삭'], ['면접 준비', '모의 면접과 피드백']] }),
        T('tiles', { eyebrow: '', title: '직무 트랙', cols: [['사무 · 데이터', '문서 · 엑셀 · 데이터 정리'], ['디지털 마케팅', '콘텐츠 · 광고 · 분석'], ['IT 개발', '웹 · 앱 기초 개발'], ['디자인', '그래픽 · UI 기초']] }),
        cls('모집 중인 과정', '과정별 참여 자격과 일정을 확인하세요.'),
        reviews('수료생 후기'),
        T('info', { eyebrow: '', title: '참여 전 확인하세요', cols: [['참여 대상', '과정별 연령 · 거주 · 취업 상태 조건'], ['비용', '과정별 지원 방식은 모집 공지 기준'], RULE_ATT] }),
        cta('참여할 수 있는지\n먼저 확인해 보세요', '참여 조건과 트랙 선택을 상담으로 안내해 드립니다.', '상담 신청')] },

    /* 재직자 원격훈련: 포털형(찾기 상자 · 빠른 메뉴로 분야별 과정몰) — 개인 · 단체 수강을 바로 찾는 학습 포털 */
    't3-v-remote': { cd: 'price', L: 'portal', th: 'clean', pal: 'graphite', ph: { hero: 'hum-09', about: 'lap-08', space: 'off-06', cta: 'dsk-05' }, hd: ['solid', 'cols', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '사업주 · 재직자 원격훈련', title: '일하면서 듣는\n직무 원격훈련', sub: '재직자 개인 수강과 기업 단체 수강을 모두 지원합니다. 과정마다 학습 기간과 평가 · 수료 기준을 안내합니다.', cta: '과정 둘러보기', cta2: '단체 수강 안내' }),
        T('tiles', { eyebrow: '', title: '분야별 과정', cols: [['직무 공통', '문서 · 보고 · 협업'], ['디지털 · AI', '데이터 · 생성형 AI'], ['리더십 · 관리', '팀 관리 · 성과 관리'], ['법정 · 안전', '법정의무 · 안전보건']] }),
        cls('지금 신청할 수 있는 과정', '학습 기간과 수강료를 확인하고 신청하세요.', { n: 6, price: 1 }),
        gal(['lap-10', 'off-06', 'lap-01'], '노트북과 사무 공간 사진'),
        T('steps', { eyebrow: '', title: '기업 단체 수강 절차', cols: [['과정 상담', '대상 · 과정 선정'], ['수강자 등록', '수강자 목록 접수'], ['학습 · 평가', '기간 안에 진도 · 평가'], ['수료 · 증빙', '수료 결과와 서류 안내']] }),
        T('info', { eyebrow: '', title: '원격훈련 수강 기준', cols: [['본인 학습', '본인 인증 후 직접 학습한 시간만 인정'], RULE_PROG, ['비용 지원', '사업주 · 개인 지원 여부는 과정 안내 기준']] }),
        notices('수강 공지', { board: 1 }),
        faq('', [['휴대폰으로도 들을 수 있나요?', 'PC와 휴대폰 모두에서 수강할 수 있고, 이어 보기 위치가 저장됩니다.'], ['단체 수강은 몇 명부터 되나요?', '과정과 지원 방식에 따라 다릅니다. 단체 수강 문의로 알려 주시면 안내해 드립니다.']])] },

    /* 스마트공장 · 제조: 큰 글자(밝은 바탕 초대형 제목 + 드릴 프레스 사진 띠) — 설비 기술자의 단단함 */
    't3-v-factory': { cd: 'schedule', L: 'typo', th: 'tech', pal: 'steel', ph: { hero: 'hum-19', about: 'wrk-01', space: 'cls-03', cta: 'wrk-07' }, hd: ['overlay', 'mega', 'full'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '스마트공장 · 제조 혁신', title: '설비와 데이터를\n함께 다루는 기술자', sub: '설비 자동화 · PLC 제어 · 생산 데이터 활용을 실습 장비로 훈련합니다. 구직자 양성과 재직자 향상 과정을 운영합니다.', cta: '훈련과정 보기', cta2: '기업 맞춤 상담' }),
        T('features', { eyebrow: '', title: '훈련 분야', cols: [['PLC · 제어', '설비 제어 프로그램 실습'], ['로봇 · 자동화', '산업용 로봇 운용'], ['생산 데이터', '설비 데이터 수집 · 분석'], ['설비 보전', '예방 보전 · 고장 진단']] }),
        cls('개강 예정 과정', '과정별 실습 장비와 개강일을 확인하세요.'),
        gal(['wrk-01', 'wrk-05', 'cls-03'], '공구와 실습실 사진'),
        T('tiles', { eyebrow: '', title: '대상별 과정', cols: [['구직자 양성', '기초부터 현장 투입까지'], ['재직자 향상', '현장 직원 기술 고도화'], ['기업 맞춤', '사업장 설비에 맞춘 과정']] }),
        T('timeline', { eyebrow: '', title: '실습이 이어지는 순서', cols: [['안전 · 기초', '장비 안전과 전기 기초'], ['제어 실습', 'PLC 프로그램 작성'], ['자동화 라인', '로봇 · 센서 연동'], ['데이터 과제', '설비 데이터로 개선안 만들기']] }),
        notices('모집 · 장비 안내'),
        cta('우리 공장 설비에 맞춘\n교육이 필요하신가요', '사업장 설비와 인원에 맞춘 재직자 맞춤 과정을 상담합니다.', '맞춤 과정 상담')] },

    /* 요양보호사 · 돌봄: S3 겹친 글자 상자(함께 만드는 손) — 따뜻하고 차분한 교육원 */
    't3-v-care': { cd: 'schedule', th: 'warm', pal: 'wellness', hk: 'box', ph: { hero: 'sen-04', about: 'sen-01', space: 'sem-01', cta: 'nat-01' }, hd: ['notice', 'biz', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '요양보호사 · 돌봄 교육', title: '따뜻한 돌봄도\n배워야 잘합니다', sub: '이론 · 실기 · 현장실습을 순서대로 이수하고 자격 시험을 준비합니다. 주간 · 야간 · 주말 반을 확인하세요.', cta: '반 일정 보기', cta2: '상담 신청' }),
        cls('개강 예정 반', '주간 · 야간 · 주말 반의 개강일을 확인하세요.'),
        T('timeline', { eyebrow: '', title: '교육 과정 흐름', cols: [['이론', '돌봄의 이해 · 기본 지식'], ['실기', '일상생활 지원 · 안전한 이동'], ['현장실습', '협약 기관에서 실습'], ['시험 준비', '문제 풀이 · 모의 평가']] }),
        T('features', { eyebrow: '', title: '수업 방식', cols: [['실습실 수업', '돌봄 기술을 직접 연습'], ['소규모 반', '질문하기 쉬운 수업'], ['실습 연계', '현장실습 기관 안내'], ['출결 관리', '학습자 앱 「나의 출결」로 매일 확인']] }),
        notices('개강 · 시험 안내', { n: 5 }),
        gal(['sen-01', 'sem-01', 'nat-01'], '함께 걷고 배우는 분위기 사진'),
        reviews('수료생 후기'),
        map('교육원 오시는 길')] },

    /* 지역 · 산업 공동훈련: 포털형(넓은 회의실 사진 위 찾기 · 공지 패널) — 참여 기업이 먼저 찾는 센터 */
    't3-v-consort': { cd: 'table', L: 'portal', th: 'official', pal: 'slate', ph: { hero: 'off-05', about: 'off-01', space: 'sem-01', cta: 'arc-02' }, hd: ['notice', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '중소기업 공동훈련센터', title: '여러 기업이 함께 여는\n재직자 훈련', sub: '참여 기업이 함께 과정을 기획하고 재직자 훈련을 운영합니다. 기업 등록부터 수료 보고까지 안내합니다.', cta: '참여 기업 신청', cta2: '이번 분기 과정' }),
        notices('센터 공지', { n: 5 }),
        cls('이번 분기 공동훈련 과정', '참여 기업 재직자는 소속 담당자를 통해 신청합니다.', { n: 6 }),
        T('steps', { eyebrow: '', title: '참여 기업 절차', cols: [['참여 신청', '협약 · 참여 기업 등록'], ['수요 조사', '필요 직무 · 인원 파악'], ['과정 개설', '공동 과정 기획 · 개설'], ['훈련 · 보고', '재직자 훈련과 결과 보고']] }),
        gal(['off-01', 'sem-01', 'off-05'], '회의실과 세미나실 사진'),
        T('features', { eyebrow: '', title: '훈련 분야', cols: [['생산 · 품질', '공정 개선 · 품질 관리'], ['디지털 전환', '데이터 · 자동화 · AI'], ['경영 · 관리', '리더십 · 노무 · 회계'], ['안전 · 환경', '안전보건 · 환경 관리']] }),
        facts(),
        cta('참여 기업이 되려면\n무엇이 필요할까요', '참여 조건과 협약 절차, 준비 서류를 안내해 드립니다.', '참여 문의')] },

    /* 구직자 직업훈련 · 상담: 알림판형(공지 · 대상별 안내 · 표) — 공공 고용센터처럼 정보가 먼저 */
    't3-v-jobcenter': { cd: 'list', L: 'bulletin', th: 'campus', pal: 'civic', ph: { hero: 'hum-10', about: 'hum-04', space: 'cls-01', cta: 'lib-03' }, hd: ['notice', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '', /* FD2: bulletin a 사진 위 eyebrow 대비 3.15 → 뺌 */ title: '상담에서 시작해\n취업까지 한 곳에서', sub: '직업 상담으로 맞는 직종을 찾고, 훈련 수료 뒤 이력서 · 면접 · 구인 정보까지 단계마다 안내합니다.', cta: '상담 예약', cta2: '훈련과정 찾기' }),
        notices('모집 · 채용 소식', { board: 1, n: 5 }),
        T('info', { eyebrow: '', title: '대상별 훈련 안내', cols: [['구직자', '취업을 준비하는 분의 주간 과정'], ['재직자', '일하면서 듣는 야간 · 주말 과정'], ['신중년', '전직 · 재취업 준비 과정'], ['청년', '첫 취업 준비 과정']] }),
        cls('모집 중인 훈련과정', '상담 뒤 신청하면 더 잘 맞는 과정을 고를 수 있습니다.', { n: 5 }),
        gal(['sem-01', 'cls-01', 'lib-03'], '상담실 · 강의실 · 자료실 사진'),
        T('steps', { eyebrow: '', title: '취업까지의 여정', cols: [['직업 상담', '흥미 · 경력 · 희망 직종'], ['과정 선택', '훈련과정 · 일정 안내'], ['훈련 참여', '출석 · 실습 · 평가'], ['취업 지원', '이력서 · 면접 · 구인 정보']] }),
        facts(),
        reviews('수료생 후기'),
        map('방문 상담 오시는 길')] },

    /* 국민내일배움카드 훈련기관: 알림판형(공지 · 수강 절차 · 일정 표) — 카드 발급 → 수강 신청 흐름 */
    'voc-card': { cd: 'schedule', name: '국민내일배움카드 훈련기관', L: 'bulletin', th: 'official', pal: 'harbor', ph: { hero: 'hum-01', about: 'cls-01', space: 'lec-02', cta: 'off-02' }, hd: ['contact', 'cols', 'full'], ck: 'contact',
      build: () => [
        ban({ eyebrow: '국민내일배움카드 훈련과정', title: '카드 한 장으로\n배우고 취업까지', sub: '카드 발급부터 고용24 수강 신청, 개강과 수료까지 순서대로 안내합니다. 처음이라면 상담부터 시작하세요.', cta: '수강신청 안내', cta2: '상담 신청' }),
        cls('모집 중인 과정', '개강일과 모집 마감을 확인하고 고용24에서 신청하세요.', { n: 6 }),
        gal(['cls-01', 'lap-01', 'lec-02'], '강의실과 학습 도구 사진'),
        T('steps', { eyebrow: '', title: '수강 절차', cols: [['카드 발급', '고용24 또는 고용센터에서 신청'], ['과정 상담', '희망 직종 · 일정 상담'], ['수강 신청', '고용24에서 과정 신청'], ['개강 · 훈련', '출결 · 평가 기록'], ['수료 · 취업 지원', '이력서 · 면접 준비']] }),
        T('info', { eyebrow: '', title: '훈련 전 알아 두세요', cols: [['자부담', '과정 · 대상별 자부담은 고용24 과정 정보 기준'], RULE_ATT, ['훈련장려금', '지급 대상 · 방식은 고용24 안내 기준']] }),
        notices('모집 공지', { n: 5 }),
        reviews('수료생 후기'),
        cta('카드 발급부터\n같이 확인해 드립니다', '카드 발급 여부와 희망 직종을 알려 주시면 맞는 과정을 안내해 드립니다.', '상담 신청', 'contact')] },

    /* 사업주 위탁: 매거진형(명조 제목 · 회의실 사진 · 운영 절차를 기사처럼) — 기업 담당자를 위한 차분한 제안서 톤 */
    'voc-employer': { cd: 'big', name: '사업주 위탁 훈련', L: 'editorial', th: 'premium', pal: 'boardroom', ph: { hero: 'off-01', about: 'off-04', space: 'lec-01', cta: 'off-07' }, hd: ['solid', 'biz', 'full'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '사업주 위탁 훈련', title: '직무에 맞춘\n위탁 훈련 설계', sub: '요구 분석부터 과정 설계, 운영 · 출결, 수료와 환급 서류까지 교육 담당자의 일을 줄여 드립니다.', cta: '도입 문의', cta2: '운영 절차' }),
        T('steps', { eyebrow: '', title: '운영 절차', cols: [['요구 분석', '직무 · 대상 · 일정 확인'], ['과정 설계', '직무에 맞춘 커리큘럼'], ['운영 · 출결', '훈련 운영과 출결 기록'], ['수료 · 환급 서류', '결과 보고와 서류 안내']] }),
        T('features', { eyebrow: '', title: '담당자가 덜어 내는 일', cols: [['환급 과정 운영', '고용보험 환급 과정 요건 안내'], ['맞춤 설계', '직무 분석 기반 과정 구성'], ['출결 · 진도 관리', '규정 준수 기능으로 기록'], ['결과 리포트', '수료 · 만족도 결과 공유']] }),
        cls('대표 과정', '사내 일정에 맞춰 집체 · 원격 · 혼합으로 운영합니다.', { n: 4 }),
        reviews('도입 기업 담당자 후기'),
        cta('사내 교육 계획이\n있으신가요', '대상 인원과 직무, 희망 일정을 알려 주시면 운영안을 제안해 드립니다.', '도입 문의')] },

    /* 자동차 정비 (새 템플릿): S3 전면 사진 + 스크림(정비 소켓 세트) — 정비소의 단단한 질감 */
    'tv-auto': { cd: 'photo', th: 'tech', pal: 'tomato', hk: 'scrim', ph: { hero: 'wrk-05', about: 'wrk-04', space: 'wrk-02', cta: 'wrk-01' }, hd: ['overlay', 'mega', 'drawer'], ck: 'photo',
      build: () => [
        ban({ eyebrow: '자동차 정비 · 검사', title: '엔진룸을 여는 순간\n자신 있게', sub: '엔진 · 섀시 · 전기 장치를 실습 차량과 공구로 익히고, 자동차정비 자격과 정비소 취업을 함께 준비합니다.', cta: '정비 과정 보기', cta2: '수강 상담' }),
        T('features', { eyebrow: '', title: '배우는 정비 영역', cols: [['엔진', '구조 이해와 점검 · 분해 조립'], ['섀시', '제동 · 조향 · 현가 장치'], ['전기 · 전자', '배선 · 센서 · 진단기 사용'], ['친환경차', '하이브리드 · 전기차 안전 기초']] }),
        cls('모집 중인 정비 과정', '주간 · 야간 과정과 개강일을 확인하세요.'),
        T('steps', { eyebrow: '', title: '실습은 이렇게', cols: [['안전 교육', '리프트 · 공구 안전 수칙'], ['증상 확인', '소리 · 경고등으로 원인 좁히기'], ['정비', '부품 교환 · 조정'], ['기록', '정비 내용을 작업지시서로']] }),
        gal(['wrk-04', 'wrk-02', 'wrk-01'], '정비 공구 사진'),
        notices('개강 · 자격 시험 안내'),
        cta('정비 경험이 없어도\n괜찮습니다', '희망 진로와 가능한 일정을 알려 주시면 맞는 과정을 안내해 드립니다.', '상담 신청')] },

    /* 전산회계 · 사무 (새 템플릿): S3 좌우 분할(밝은 책상 · 쓰는 손) — 차분한 사무 직무 과정 */
    'tv-office': { cd: 'price', th: 'clean', hk: 'split', pal: 'denim', ph: { hero: 'hum-06', about: 'lap-09', space: 'off-06', cta: 'lap-04' }, hd: ['solid', 'cols', 'drawer'], ck: 'panel',
      build: () => [
        ban({ eyebrow: '전산회계 · 사무 행정', title: '사무 실무,\n장부부터 배웁니다', sub: '회계 원리와 전산회계 프로그램, 엑셀 · 문서 작성을 실무 예제로 익히고 관련 자격 시험을 준비합니다.', cta: '과정 보기', cta2: '상담 신청' }),
        T('timeline', { eyebrow: '', title: '배우는 순서', cols: [['회계 원리', '분개 · 계정 · 결산 기초'], ['전산회계', '프로그램으로 장부 처리'], ['세무 기초', '부가세 · 원천세 신고 흐름'], ['사무 도구', '엑셀 함수 · 보고 문서']] }),
        cls('모집 중인 과정', '수강료와 국비 지원 여부를 확인하고 신청하세요.', { n: 4, price: 1 }),
        gal(['lap-09', 'dsk-02', 'off-06'], '책상 · 노트 · 사무 공간 사진'),
        T('features', { eyebrow: '', title: '수업 방식', cols: [['실무 예제', '실제 장부 형식으로 연습'], ['자격 대비', '시험 유형별 모의 문제'], ['질문 게시판', '막히는 분개를 바로 질문'], ['진도 기록', '학습자 앱에서 이어 듣기']] }),
        reviews('수강생 후기'),
        faq('', [['회계를 처음 배워도 되나요?', '회계 원리부터 시작합니다. 상담에서 경력과 목표 자격을 보고 시작 과정을 정합니다.'], ['국비로 들을 수 있나요?', '과정별로 다릅니다. 과정 카드와 고용24 과정 정보에서 확인하세요.']]),
        cta('사무직 취업 준비,\n과정부터 같이 고릅니다', '경력과 목표 직무를 알려 주시면 맞는 과정을 안내해 드립니다.', '상담 신청')] }
  };

  /* ── 새 템플릿 등록(업종 보강) ── */
  const NEW = {
    'tv-auto': { name: '자동차 정비 훈련원', scene: '엔진 · 섀시 · 전기 실습 · 정비 자격 · 취업', color: '#C81E1E', look: 'publicTiles', ref: '정비 실습 훈련기관의 직종 안내형' },
    'tv-office': { name: '전산회계 · 사무 행정 과정', scene: '회계 원리 · 전산회계 · 세무 기초 · 사무 자격', color: '#3B5B92', look: 'corpPortal', ref: '사무 직무 훈련 과정 안내형' }
  };
  Object.keys(NEW).forEach(id => { if (TPL.some(t => t && t.id === id)) return; const n = NEW[id];
    TPL.push({ id, name: n.name, types: ['voc'], scene: n.scene, color: n.color, tone: '신뢰', look: n.look, ref: n.ref, theme: CFG[id].th, hero: '', build: () => [], langs: ['ko', 'en'] }); });

  /* ── 템플릿 덮어쓰기 ── */
  /* FD2(유형 간 재배치 · BRIEF7): 계열 변형(layoutVar, FD1 HPL.vars). 같은 계열을 쓰는 다른 유형과 다른 변형을 고르고,
     portal · bulletin 4종(consort · remote · jobcenter · voc-card)의 '사진 + 찾기 상자 + 아이콘 줄'이 겹치지 않게 서로 다른 변형을 준다 */
  const FD2V = { 't3-v-design': 'c', 'voc-employer': 'b', 't3-v-trade': 'c', 't3-v-beauty': 'b', 't3-v-youth': 'c', 't3-v-license': 'b', 't3-v-factory': 'a',
    't3-v-remote': 'b', 't3-v-consort': 'c', 't3-v-jobcenter': 'a', 'voc-card': 'b' /* card a면 public t4-civic(bulletin a)와 닮음 */ };
  /* 머리글 · 바닥글: FA의 직업훈련 유형 목록(contact · util · left / cta · biz · split) 안에서 고르게 나눈다 */
  const FD2H = { 't3-v-kdt': ['contact', 'cta'], 't3-v-design': ['util', 'biz'], 't3-v-trade': ['left', 'split'], 't3-v-beauty': ['contact', 'biz'], 't3-v-license': ['util', 'split'], 't3-v-midlife': ['left', 'cta'], 't3-v-youth': ['contact', 'split'], 't3-v-remote': ['util', 'cta'], 't3-v-factory': ['left', 'biz'], 't3-v-care': ['contact', 'cta'], 't3-v-consort': ['util', 'biz'], 't3-v-jobcenter': ['left', 'split'], 'voc-card': ['contact', 'biz'], 'voc-employer': ['util', 'split'], 'tv-auto': ['left', 'cta'], 'tv-office': ['contact', 'split'] };
  Object.keys(FD2H).forEach(id => { const c = CFG[id]; if (c) c.hd = [FD2H[id][0], FD2H[id][1], A(c.hd)[2] || 'full']; });
  /* H3(R2 H1 · BRIEF8): 주력 계열 4개(bulletin · typo · story · portal) + editorial · fullbleed 1종씩으로 모은다.
     [계열 또는 'hk:<S3 첫 화면>', 변형] */
  const H3L = { 'voc-employer': ['portal', 'a'], 'voc-card': ['hk:box', ''], 't3-v-jobcenter': ['hk:split', ''] }; /* jobcenter bulletin a면 public t4-civic, b면 t4-legal · lifelong t2-life-credit과 닮음(거리 8) */ /* design은 story a면 corp customer · lifelong health와 닮음(②) → editorial c 그대로 · voc-card bulletin b는 lifelong t2-life-credit과 닮음(거리 6) */
  Object.keys(H3L).forEach(id => { const c = CFG[id], v = H3L[id]; if (!c) return;
    if (v[0].indexOf('hk:') === 0) { delete c.L; c.hk = v[0].slice(3); delete FD2V[id]; } else { c.L = v[0]; delete c.hk; FD2V[id] = v[1]; } });
  /* FD2: FC 첫 화면 사진 재배정표(fix6/FC_hero_map.json — 전체 템플릿에서 첫 화면 사진 중복 0, hero 슬롯 · 긴 변 1200 이상) */
  const FCH = { 't3-v-kdt': 'lap-01', 't3-v-design': 'vid-01', 't3-v-trade': 'voc-01', 't3-v-beauty': 'bea-02', 't3-v-license': 'hum-18', 't3-v-midlife': 'wrk-01', 't3-v-youth': 'hum-15', 't3-v-remote': 'cor-11', 't3-v-factory': 'hum-19', 't3-v-care': 'fam-05', 't3-v-consort': 'cor-03', 't3-v-jobcenter': 'cor-04', 'voc-card': 'hum-17', 'voc-employer': 'off-01', 'tv-auto': 'aut-01', 'tv-office': 'off-08' };
  Object.keys(FCH).forEach(id => { const c = CFG[id]; if (!c) return; const v = typeof FCH[id] === 'string' ? { hero: FCH[id] } : FCH[id];
    if (Array.isArray(c.ph)) { const ix = { hero: 0, about: 1, space: 2, cta: 3, gallery: 4 }; c.ph = c.ph.slice(); Object.keys(v).forEach(k => { if (ix[k] != null) c.ph[ix[k]] = v[k]; }); }
    else c.ph = Object.assign({}, c.ph, v); });
  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'voc') return;
    const c = CFG[id];
    tp.tpV = 1; tp.theme = c.th; tp.palette = c.pal; if (c.name) tp.name = c.name;
    if (c.L) { tp.layout = c.L; tp.hero = ''; } else { delete tp.layout; tp.hero = { split: 'split', box: 'center', scrim: 'bg', grid: 'center' }[c.hk] || ''; }
    tp.photos = Object.assign({}, c.ph);
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    if (c.L && FD2V[id]) tp.layoutVar = FD2V[id]; else delete tp.layoutVar;
    delete tp.deco; /* 원 · 링 · 줄무늬 장식 CSS 걷어냄 */
    tp.build = () => { const L = A(c.build()).filter(Boolean);
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner' && c.hk) d.hk = c.hk;
        if (x.type === 'text' && d.variant === 'cta' && c.ck && !d.ck) d.ck = c.ck;
        if (x.type === 'classes' && c.cd && !d.card) d.card = c.cd; /* S2 강좌 카드: photo · list · price · schedule · big · table */ });
      return L; };
  });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpV && A(tp.types)[0] === 'voc') {
          if (tp.layout && window.HPL && HPL.fam && HPL.fam[tp.layout]) { if (typeof HPL.apply === 'function') HPL.apply(s, tp.layout); else s.layout = tp.layout; } else delete s.layout;
          if (s.layout && tp.layoutVar) s.layoutVar = tp.layoutVar; else delete s.layoutVar; /* FD2: 계열 변형 */
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const v = HPSTOCK.slotImg(tp.photos[sl], sl); if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-voc siteFromTpl', e); }
      return s; };
    if (base.hpc) f.hpc = base.hpc;
    siteFromTpl = f; window.siteFromTpl = f; }
  /* H3(R2 N10): 점검용 업종별 강좌 이름 6개 — hp-visual 채운 기관이 템플릿마다 이 이름으로 강좌를 바꿔 찍는다(게시 화면에는 쓰지 않는다) */
  { const QA = {
    't3-v-beauty': ['미용사 일반 실기', '네일 아트 기초', '한식 조리 기능사', '제과 기능사 실기', '제빵 기능사 실기', '뷰티 창업 준비'],
    't3-v-care': ['요양보호사 이론', '요양보호사 실기', '현장 실습 안내', '치매 돌봄 이해', '장애인 활동 지원', '돌봄 의사소통'],
    't3-v-consort': ['재직자 생산 관리', '품질 관리 실무', '설비 보전 기초', '현장 리더십', '산업 안전 실무', '스마트 제조 이해'],
    't3-v-design': ['포토샵 실무', '일러스트 실무', '영상 편집 실무', '모션 그래픽', 'UI 디자인 프로젝트', '포트폴리오 리뷰'],
    't3-v-factory': ['PLC 제어 기초', '스마트공장 MES', '산업용 로봇 운용', '제조 데이터 분석', '설비 예지 보전', '공정 자동화 실습'],
    't3-v-jobcenter': ['직업 상담', '구직자 기초 훈련', '이력서 · 면접 준비', '취업 정보 설명회', '직무 탐색 워크숍', '취업 후 적응 지원'],
    't3-v-kdt': ['웹 개발 부트캠프', '데이터 엔지니어링', '클라우드 인프라', 'AI 서비스 개발', '팀 프로젝트', '취업 연계 특강'],
    't3-v-license': ['전기기능사 필기', '전기기능사 실기', '용접기능사 실기', '산업안전기사 필기', '공조냉동 기능사', '기출 문제 풀이'],
    't3-v-midlife': ['신중년 전직 상담', '시설 관리 실무', '경비 · 안전 관리', '사무 행정 재취업', '택배 · 물류 직무', '재취업 이력서 작성'],
    't3-v-remote': ['재직자 엑셀 실무', '비즈니스 커뮤니케이션', '직무 리더십 이러닝', '정보보안 이러닝', '회계 기초 이러닝', '고객 응대 이러닝'],
    't3-v-trade': ['용접 기초 실습', '특수 용접', '전기 내선 공사', '기계 가공 선반', 'CNC 밀링', '배관 기능 실습'],
    't3-v-youth': ['청년 직무 훈련', 'IT 사무 실무', '마케팅 직무 입문', '면접 · 자기소개서', '취업 캠프', '직장 적응 교육'],
    'tv-auto': ['엔진 정비 실습', '섀시 정비', '자동차 전기 · 전자', '전기차 정비 기초', '자동차 정비 기능사', '정비소 취업 준비'],
    'tv-office': ['회계 원리', '전산회계 2급', '전산세무 2급', '급여 · 4대 보험 실무', '사무 행정 문서', 'ERP 실무'],
    'voc-card': ['컴퓨터활용능력 2급', '바리스타 자격 과정', '회계 실무(전산회계)', '웹 디자인 기능사', '한식 조리 실무', '물류 관리사 준비'],
    'voc-employer': ['신입 직무 위탁 교육', '현장 관리자 과정', '품질 관리 위탁 과정', '영업 역량 강화', '재직자 환급 과정', '안전 보건 위탁 교육']
  };
  Object.keys(QA).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (tp && A(tp.types)[0] === 'voc') tp.qaCls = QA[id]; }); }
  /* H3(R2 H3 · BRIEF8): 번호 단계 섹션을 쓰는 템플릿을 유형마다 40% 미만으로 — 아래 템플릿의 '단계(steps)'를 번호 없는 칸(tiles)으로 바꾼다(내용은 그대로) */
  ['t3-v-remote', 't3-v-consort', 't3-v-midlife', 't3-v-beauty', 't3-v-trade', 'voc-employer'].forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || typeof tp.build !== 'function') return; const b0 = tp.build;
    /* editorial · fullbleed 계열은 '특징(features)'도 번호 목록으로 그리므로 함께 바꾼다. 바꿀 칸이 둘이면 두 번째는 정보 목록(info) */
    tp.build = () => { const L = A(b0()); let hasT = L.some(x => x && x.data && x.data.variant === 'tiles'); const numF = /^(editorial|fullbleed)$/.test(tp.layout || '');
      L.forEach(x => { if (!x || x.type !== 'text' || !x.data) return; const v = x.data.variant; if (v === 'steps' || (numF && v === 'features')) { x.data.variant = hasT ? 'info' : 'tiles'; hasT = true; } }); return L; }; });
  /* H3: 아래 블록 변형 지정(H1 HPS.blockVar 규약 — site.blocks가 유형 · 계열 기본값보다 우선). t3-v-beauty는 story 계열 corp-onboard와 첫 화면 아래 숫자 표가 같아 한 줄 숫자로 */
  { const B = { 't3-v-beauty': { facts: 'one' } }; Object.keys(B).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (tp) tp.blocks = Object.assign({}, tp.blocks || {}, B[id]); }); }
  /* H2 사진 재배정표(fix6/h2/w/H2_change.json · H2_photo_map.md): 첫 화면 사무실 · 노트북 유형당 2장 이하, 첫 화면 중복 0.
     슬롯 사진(photos)을 덮어쓰고, gal: { 이전 id: 새 id }는 사진 띠(image 섹션) 안의 사진을 바꾼다 */
  { const H2P = {
    'voc-employer': {'hero': 'log-01', 'cta': 'hum-07'},
    't3-v-remote': {'hero': 'hum-50', 'cta': 'hum-42', 'space': 'hum-07', 'gal': {'lap-10': 'grp-02'}},
    't3-v-consort': {'hero': 'wrk-08'},
    't3-v-jobcenter': {'hero': 'hum-51'},
    't3-v-design': {'cta': 'grp-02', 'gallery2': 'hum-50'},
    'tv-office': {'cta': 'hum-41', 'space': 'grp-06', 'about': 'hum-42', 'gal': {'lap-09': 'hum-49'}}
  };
  const H2S = id => { const H = window.HPSTOCK; const x = H && typeof H.get === 'function' ? H.get(id) : null; return x ? (x.src800 || x.src) : ''; };
  Object.keys(H2P).forEach(id => { const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'voc') return; const v = H2P[id];
    const ph = Object.assign({}, v); delete ph.gal; tp.photos = Object.assign({}, tp.photos || {}, ph);
    if (v.gal && typeof tp.build === 'function') { const b0 = tp.build; tp.build = () => { const L = A(b0());
      L.forEach(x => { if (!x || x.type !== 'image' || !x.data || !Array.isArray(x.data.imgs)) return;
        x.data.imgs = x.data.imgs.map(im => { const m = String(im && im.src || '').match(/([a-z]{3}-\d{2})(?:-800)?\.webp/); const nw = m && v.gal[m[1]] ? H2S(v.gal[m[1]]) : '';
          return nw ? Object.assign({}, im, { src: nw }) : im; }); }); return L; }; } }); }
})();
