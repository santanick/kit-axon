/* v34.3 tpl-b — 대학(univ · univ_lms) · 평생교육(lifelong) 템플릿 확장(요원 T2)
   대표님(2026-11-08): "각 유형별로 15개씩 고를 수 있도록 확장 … 카페24 · 아임웹 · 유형별 교육기관 홈페이지를 벤치마크해 디자인 완성도 가장 높게."
   - 벤치마크(구조 · 패턴만): 빌더 갤러리(학교 · 평생교육원형) · 대학 교수학습센터 · 글쓰기 센터 · 대학 평생교육원 · 지자체 평생학습관 · 50+ 캠퍼스.
     정리: scratchpad/fix5/bench_univ_lifelong.md. 다른 사이트의 글 · 로고 · 이미지 · 상호는 쓰지 않았고, 이름 · ref에 기관 실명을 넣지 않았다.
   - 템플릿 21종 추가: 대학 전용 11 · 평생교육 전용 10 · 대학 부설 평생교육원 1(양쪽). 기존 포함 univ 17 · lifelong 16.
     univ_lms(학과 LMS)는 S.org.type === 'univ'라 types ['univ']로 함께 고를 수 있다.
   - 각 템플릿: tp.theme(HPT 8종 중 하나) + tp.hero('center' | 'split' | 'bg', 'band' = 테마 기본 띠 배너) + 6~9개 섹션.
     섹션은 HPT 렌더러가 그리는 것만 쓴다(text: features · steps · info · timeline · tiles · cta, hpt:'facts' 숫자 띠, classes · notices · reviews · map).
   - 사실 원칙: 숫자는 hpt:'facts'(실제 공개 강좌로 셈)만, 후기는 실제 후기만, 주소 · 전화는 설정값만(운영 시간은 넣지 않음),
     강사 · 멘토 실명 · 협력기관 · 실적 숫자 · 숫자 약속은 넣지 않는다.
   - 템플릿 전용 장식: siteHTML을 감싸 s.tpl이 이 파일의 템플릿이고 s.theme이 그 템플릿의 테마일 때만 짧은 CSS를 덧붙인다(게시본 Shadow DOM에도 함께 들어감).
   인터페이스: window.TPL_B = { ids, css(id) } */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const TX = (variant, data) => S2('text', { variant, ...data });
  const nm = () => (typeof spOrg === 'function' ? spOrg() : '') || (S.org && S.org.name) || '';
  const ft = () => (S.settings && S.settings.footer) || {};
  const bn = (hero, d) => S2('banner', { ...d, ...(/^(center|split|bg)$/.test(hero) ? { hero } : {}), link: 'learn:shop' });
  const cls = (title, d) => S2('classes', { title, ids: pubCls(4), layout: 'grid', ...(d || {}) });
  const facts = () => TX('stats', { hpt: 'facts', title: '', cols: [] });
  const notice = (title, d) => S2('notices', { title, n: 4, ...(d || {}) });
  const reviews = (title, d) => S2('reviews', { title, note: '', ...(d || {}) });
  const mapS = (title, d) => S2('map', { title, addr: ft().addr || '', tel: ft().tel || '', hours: '', ...(d || {}) });
  const cta = (title, body, btn, cols, d) => TX('cta', { title, body, cta: btn, cols: cols || [], link: 'learn:comm', ...(d || {}) });
  const LOOK = { clean: 'mintSoft', premium: 'navyGlow', warm: 'brandBold', official: 'publicTiles', tech: 'corpPortal', kids: 'brandBold', campus: 'campus', senior: 'senior' };
  const TONE = { clean: '모던', premium: '신뢰', warm: '친근', official: '신뢰', tech: '모던', kids: '친근', campus: '신뢰', senior: '따뜻' };

  /* [id, 이름, 유형, 한 줄 장면, 대표 색, 테마, 첫 화면 배치, ref(일반 설명), 섹션, 언어] */
  const L = [
    /* ───────── 대학 · 교수학습센터 · 비교과 · 학과 LMS ───────── */
    ['univ-ctl', '교수학습개발센터', ['univ'], '교수 지원 · 학습 지원 · 이러닝을 한 포털에서', '#1F4E79', 'campus', 'band', '대학 교수학습센터형 — 대상별 바로가기 · 지원 영역 4기둥 · 공지 2단', () => [
      bn('band', { eyebrow: 'CENTER FOR TEACHING & LEARNING', title: `가르치고 배우는 일,\n센터가 함께 설계합니다`, sub: '교수법 워크숍과 수업 컨설팅, 학생 학습 지원, 이러닝 제작 지원을 한곳에서 신청하고 기록합니다.', cta: '프로그램 신청', cta2: '센터 소개' }),
      TX('tiles', { eyebrow: 'QUICK MENU', title: '누구를 위한 프로그램인가요?', cols: [['교수자 프로그램', '워크숍 · 수업 컨설팅 신청'], ['학습자 프로그램', '튜터링 · 학습 전략 · 특강'], ['이러닝 지원', '강의 촬영 · 콘텐츠 제작'], ['자료실', '교수법 자료 · 양식 내려받기']] }),
      TX('features', { eyebrow: 'WHAT WE DO', title: '센터의 네 가지 지원 영역', sub: '수업을 준비하는 단계부터 성과를 나누는 단계까지 이어서 지원합니다.', cols: [['교수 지원', '교수법 워크숍 · 수업 설계 상담 · 수업 관찰 피드백'], ['학습 지원', '학습 유형 진단 · 튜터링 · 학습 전략 특강'], ['에듀테크', '이러닝 콘텐츠 제작 · 온라인 수업 도구 안내'], ['성과 공유', '우수 수업 사례 · 교수법 연구 모임 결과 공유']] }),
      cls('이번 학기 열린 프로그램', { eyebrow: 'PROGRAMS', sub: '참여할 프로그램을 고르고 바로 신청하세요.' }),
      TX('steps', { eyebrow: 'HOW TO JOIN', title: '프로그램 참여 방법', cols: [['프로그램 확인', '대상과 일정을 확인합니다'], ['온라인 신청', '로그인 후 신청서를 냅니다'], ['참여 · 기록', '참여 내역이 자동으로 남습니다'], ['결과 확인', '이수 현황을 내 페이지에서 봅니다']] }),
      notice('센터 공지', { eyebrow: 'NOTICE' }),
      cta('프로그램 운영 문의', '참여 대상 · 일정 · 이수 인정에 대해 궁금한 점을 남겨 주세요.', '문의 남기기', [['문의 방법', '커뮤니티 게시판'], ['안내', '학기별 프로그램 공지 참고']])]],
    ['univ-faculty', '교원 교수법 아카데미', ['univ'], '신임 · 재직 교원 교수법 연수 · 수업 컨설팅', '#846631', 'premium', 'bg', '교수법 연수 포털형 — 어두운 첫 화면 · 트랙 카드 · 학기 흐름', () => [
      bn('bg', { eyebrow: 'FACULTY ACADEMY', title: `좋은 수업은\n설계에서 시작됩니다`, sub: '신임 교원 연수부터 수업 컨설팅, 교수법 연구 모임까지 교원의 수업 역량을 단계별로 지원합니다.', cta: '연수 과정 보기', cta2: '수업 컨설팅 신청' }),
      TX('features', { eyebrow: 'TRACKS', title: '교원 성장 트랙', cols: [['신임 교원 연수', '학사 제도 · 수업 설계 · 평가 기초'], ['수업 컨설팅', '수업 관찰과 1:1 피드백'], ['수업 촬영 · 분석', '내 수업 영상을 보며 함께 점검'], ['교수법 연구 모임', '전공을 넘어 사례를 나누는 모임']] }),
      TX('timeline', { eyebrow: 'SEMESTER FLOW', title: '한 학기 운영 흐름', cols: [['학기 시작 전', '신임 교원 연수 · 강의계획서 점검'], ['학기 초', '수업 설계 워크숍 · 컨설팅 신청'], ['학기 중', '수업 관찰 · 중간 피드백'], ['학기 말', '수업 성찰 · 우수 사례 공유']] }),
      cls('지금 신청할 수 있는 연수', { eyebrow: 'COURSES' }),
      TX('info', { eyebrow: 'GUIDE', title: '참여 안내', cols: [['대상', '전임 · 비전임 교원 누구나'], ['방식', '대면 워크숍 · 온라인 연수 병행'], ['기록', '이수 내역을 학기별로 확인'], ['신청', '과정 카드에서 바로 신청']] }),
      notice('연수 공지', { eyebrow: 'NOTICE' }),
      cta('수업 컨설팅이 필요하신가요?', '원하는 날짜와 상담 주제를 남겨 주시면 담당자가 일정을 조율해 연락드립니다.', '컨설팅 문의', [['상담 주제', '수업 설계 · 평가 · 온라인 수업'], ['진행', '대면 또는 비대면']])]],
    ['univ-tutor', '학습지원 · 튜터링 센터', ['univ'], '1:1 튜터링 · 스터디 그룹 · 학습 컨설팅', '#C2410C', 'warm', 'split', '학습지원센터형 — 따뜻한 좌우 첫 화면 · 프로그램 카드 · 매칭 절차', () => [
      bn('split', { eyebrow: 'LEARNING SUPPORT', title: `혼자 막히는 공부,\n함께 풀어 갑니다`, sub: '선배 튜터와의 1:1 튜터링, 스터디 그룹, 학습 컨설팅으로 내 공부 방법을 찾아 보세요.', cta: '튜터링 신청', cta2: '학습 컨설팅' }),
      TX('features', { eyebrow: 'PROGRAMS', title: '이런 도움을 받을 수 있어요', cols: [['1:1 튜터링', '전공 · 교양 과목을 선배 튜터와'], ['스터디 그룹', '같은 과목 친구들과 함께 공부'], ['학습 컨설팅', '공부 습관 · 시간 관리 상담'], ['학습 전략 특강', '노트 정리 · 시험 준비 방법']] }),
      TX('steps', { eyebrow: 'HOW IT WORKS', title: '튜터링은 이렇게 진행됩니다', cols: [['신청', '과목과 원하는 시간을 적어요'], ['매칭', '튜터와 시간을 맞춰 연결해요'], ['활동 기록', '매 회차 활동을 기록해요'], ['결과 확인', '참여 내역을 내 페이지에서 봐요']] }),
      cls('이번 학기 학습 지원 프로그램', { eyebrow: 'THIS SEMESTER' }),
      reviews('참여 학생 후기', { eyebrow: 'REVIEWS' }),
      notice('튜터 모집 · 공지', { eyebrow: 'NOTICE' }),
      cta('어떤 프로그램이 맞을지 모르겠다면', '지금 고민을 남겨 주세요. 담당자가 맞는 프로그램을 안내해 드립니다.', '고민 남기기', [['상담 방식', '게시판 · 방문'], ['대상', '재학생']])]],
    ['univ-writing', '글쓰기 · 발표 클리닉', ['univ'], '리포트 · 자기소개서 첨삭과 발표 코칭', '#6D28D9', 'clean', 'split', '글쓰기 센터형 — 첨삭 방식 2갈래 · 신청 가능한 글 안내표', () => [
      bn('split', { eyebrow: 'WRITING & PRESENTATION', title: `초고여도 괜찮습니다,\n함께 다듬어요`, sub: '리포트 · 서평 · 자기소개서 · 발표 자료를 올리면 튜터가 구성부터 문장까지 함께 살펴봅니다.', cta: '첨삭 신청하기', cta2: '이용 안내' }),
      TX('features', { eyebrow: 'HOW WE HELP', title: '네 가지 방식으로 도와드립니다', cols: [['서면 첨삭', '글을 올리면 의견을 달아 돌려드려요'], ['실시간 상담', '대면 · 화상으로 함께 고쳐요'], ['발표 코칭', '발표 구성과 전달을 연습해요'], ['영문 글쓰기', '영어 리포트 · 이메일 표현 점검']] }),
      TX('info', { eyebrow: 'WHAT TO BRING', title: '이런 글을 신청할 수 있어요', cols: [['수업 과제', '리포트 · 서평 · 감상문 · 보고서'], ['진로 서류', '자기소개서 · 이력서'], ['발표 자료', '발표문 · 슬라이드 구성'], ['작성 단계', '개요 · 초고 · 완성본 모두 가능']] }),
      TX('steps', { eyebrow: 'PROCESS', title: '첨삭은 이렇게 진행됩니다', cols: [['글 올리기', '파일과 요청 사항을 남겨요'], ['튜터 배정', '글 종류에 맞는 튜터가 맡아요'], ['피드백', '구성 · 논리 · 문장을 짚어 드려요'], ['다시 상담', '고친 글로 한 번 더 볼 수 있어요']] }),
      cls('글쓰기 · 발표 강좌', { eyebrow: 'WORKSHOPS' }),
      reviews('이용 후기', { eyebrow: 'REVIEWS' }),
      cta('마감이 가까운 글이 있나요?', '제출 기한과 요청 사항을 함께 남겨 주시면 일정을 먼저 안내해 드립니다.', '첨삭 문의', [['신청', '게시판 · 온라인'], ['대상', '재학생 · 대학원생']])]],
    ['univ-career', '진로 · 취업 역량 포털', ['univ'], '학년별 진로 로드맵 · 직무 역량 · 면접 준비', '#0E7490', 'clean', 'bg', '대학 진로 · 비교과 포털형 — 학년별 로드맵 · 역량 카드 · 실제 숫자 띠', () => [
      bn('bg', { eyebrow: 'CAREER DEVELOPMENT', title: `1학년부터 준비하는\n나의 첫 커리어`, sub: '진로 탐색부터 직무 역량, 자기소개서와 면접까지 학년에 맞춰 필요한 프로그램을 안내합니다.', cta: '프로그램 둘러보기', cta2: '진로 상담 신청' }),
      facts(),
      TX('timeline', { eyebrow: 'ROADMAP', title: '학년별 진로 로드맵', cols: [['1학년', '진로 탐색 · 흥미 · 적성 알아보기'], ['2학년', '직무 탐색 · 전공 연계 활동'], ['3학년', '직무 역량 · 현장 실습 준비'], ['4학년', '자기소개서 · 면접 · 지원 전략']] }),
      TX('features', { eyebrow: 'COMPETENCY', title: '키울 수 있는 역량', cols: [['진로 설계', '나에게 맞는 진로 방향 찾기'], ['직무 역량', '직무별 필요한 지식과 도구'], ['서류 · 면접', '자기소개서 첨삭 · 모의 면접'], ['현장 경험', '현장 실습 · 기업 탐방 준비']] }),
      cls('지금 모집 중인 프로그램', { eyebrow: 'PROGRAMS' }),
      reviews('참여 후기', { eyebrow: 'REVIEWS' }),
      notice('채용 · 프로그램 소식', { eyebrow: 'NEWS' }),
      cta('진로가 고민될 때', '진로 상담을 신청하면 상담 선생님이 일정을 잡아 연락드립니다.', '진로 상담 신청', [['상담 방식', '대면 · 화상'], ['대상', '재학생 · 졸업 예정자']])]],
    ['univ-startup', '대학 창업교육센터', ['univ'], '아이디어 발굴 → 시제품 → 데모데이', '#0369A1', 'tech', 'bg', '창업 지원 포털형 — 테크 어두운 첫 화면 · 창업 여정 단계 · 학기 일정', () => [
      bn('bg', { eyebrow: 'STARTUP EDUCATION', title: `아이디어를\n실제 서비스로`, sub: '창업 강좌와 팀 프로젝트, 시제품 제작 실습을 거쳐 데모데이에서 결과를 발표합니다.', cta: '창업 강좌 보기', cta2: '창업 상담' }),
      TX('steps', { eyebrow: 'JOURNEY', title: '창업 여정 4단계', cols: [['아이디어', '문제를 찾고 해결 아이디어를 세워요'], ['검증', '고객 인터뷰로 아이디어를 확인해요'], ['시제품', '작게 만들어 보고 고쳐요'], ['발표', '데모데이에서 결과를 나눠요']] }),
      TX('features', { eyebrow: 'SUPPORT', title: '센터가 지원하는 것', cols: [['창업 강좌', '교과 · 비교과 창업 수업'], ['팀 빌딩', '전공을 넘어 팀을 꾸려요'], ['제작 실습', '시제품 제작 도구 안내'], ['전문가 상담', '사업 계획 · 지식재산 상담']] }),
      cls('지금 열린 창업 강좌', { eyebrow: 'COURSES' }),
      TX('timeline', { eyebrow: 'SCHEDULE', title: '학기 운영 일정', cols: [['학기 초', '창업 동아리 모집 · 팀 빌딩'], ['학기 중', '강좌 · 멘토링 · 시제품 실습'], ['학기 말', '데모데이 · 결과 발표'], ['방학', '집중 캠프 · 다음 단계 준비']] }),
      notice('창업 공지', { eyebrow: 'NOTICE' }),
      cta('창업, 어디서부터 시작할지 막막하다면', '아이디어 단계여도 괜찮습니다. 상담을 남기면 담당자가 연락드립니다.', '창업 상담 신청', [['대상', '재학생 · 졸업생'], ['방식', '게시판 접수 후 일정 안내']])]],
    ['univ-mooc', '대학 공개강좌(오픈 강의)', ['univ'], '교수진 강의를 누구나 온라인으로', '#2563EB', 'clean', 'center', '대학 공개강좌 포털형 — 가운데 첫 화면 · 실제 숫자 띠 · 강좌 격자', () => [
      bn('center', { eyebrow: 'OPEN COURSEWARE', title: `대학의 강의를\n누구에게나 열어 둡니다`, sub: '교수진이 만든 온라인 강의를 원하는 시간에 듣고, 확인 퀴즈로 이해한 내용을 점검하세요.', cta: '강좌 둘러보기', cta2: '수강 방법' }),
      facts(),
      cls('추천 공개강좌', { eyebrow: 'FEATURED', sub: '처음이라면 이 강좌부터 시작해 보세요.' }),
      TX('features', { eyebrow: 'WHY OPEN', title: '이렇게 배울 수 있어요', cols: [['교수진 강의', '전공 교수가 직접 만든 강의'], ['내 속도로', '멈추고 다시 보며 학습'], ['확인 퀴즈', '차시마다 이해도 점검'], ['학습 기록', '들은 강의와 진도를 한눈에']] }),
      TX('steps', { eyebrow: 'HOW TO', title: '수강 방법', cols: [['회원가입', '이메일로 간단히 가입해요'], ['강좌 선택', '관심 분야 강좌를 골라요'], ['학습', '영상과 퀴즈로 배워요'], ['내 기록', '학습 이력을 확인해요']] }),
      reviews('수강 후기', { eyebrow: 'REVIEWS' }),
      cta('강좌 개설을 제안하고 싶다면', '듣고 싶은 주제를 남겨 주시면 다음 학기 강좌 기획에 반영합니다.', '강좌 제안하기', [['제안 방법', '커뮤니티 게시판'], ['대상', '누구나']])]],
    ['univ-dept', '학과 홈페이지 · 강의실', ['univ'], '학과 공지 · 교과목 · 과제 제출(학과 LMS)', '#1E3A8A', 'official', 'band', '학과 LMS형 — 띠 배너 · 바로가기 · 수업 운영 안내표 · 학기 일정', () => [
      bn('band', { eyebrow: 'DEPARTMENT', title: `${nm()}\n학과 강의실`, sub: '이번 학기 교과목 강의 · 과제 · 시험 · 학과 공지를 한곳에서 확인하세요.', cta: '내 강의실', cta2: '학과 공지' }),
      TX('tiles', { eyebrow: 'SHORTCUT', title: '자주 찾는 메뉴', cols: [['강의실', '수강 중인 교과목'], ['과제 제출', '마감 전 온라인 제출'], ['출석 확인', '내 출결 바로 보기'], ['학과 공지', '학사 · 행사 안내']] }),
      cls('이번 학기 개설 교과목', { eyebrow: 'SUBJECTS' }),
      TX('info', { eyebrow: 'CLASS GUIDE', title: '수업 운영 안내', cols: [['출석', '차시 강의를 수강하면 출석이 기록됩니다'], ['과제', '평가 기준을 확인하고 기한 안에 제출합니다'], ['시험', '안내된 일정에 온라인으로 응시합니다'], ['문의', '교과목 게시판에 질문을 남깁니다']] }),
      TX('timeline', { eyebrow: 'CALENDAR', title: '학기 일정', cols: [['개강', '수강 확인 · 강의계획서 안내'], ['학기 중반', '중간 평가 · 과제 1차 제출'], ['학기 후반', '프로젝트 · 기말 평가'], ['종강', '성적 확인 · 강의 평가']] }),
      notice('학과 공지', { eyebrow: 'NOTICE' }),
      cta('수업 관련 문의', '교과목 게시판 또는 학과 사무실로 문의해 주세요.', '질문 남기기', [['질문', '교과목 게시판'], ['학사', '학과 사무실']])]],
    ['univ-ai', '교양 AI · SW 교육', ['univ'], 'AI 리터러시 → 활용 → 프로젝트(전교생 교양)', '#4F46E5', 'tech', 'split', 'AI · SW 교양 포털형 — 테크 좌우 첫 화면(밝은) · 수준별 단계 · 실제 숫자', () => [
      bn('split', { eyebrow: 'AI · SW LITERACY', title: `전공과 상관없이\n누구나 AI를 씁니다`, sub: 'AI 리터러시 기초부터 전공별 활용 실습, 팀 프로젝트까지 수준에 맞는 강좌를 골라 들으세요.', cta: '강좌 고르기', cta2: '수준 안내' }),
      facts(),
      TX('steps', { eyebrow: 'LEVELS', title: '수준별 학습 단계', cols: [['기초', 'AI가 무엇인지, 어떻게 쓰는지'], ['활용', '글 · 자료 · 이미지 작업에 적용'], ['응용', '전공 과제에 맞춰 도구 조합'], ['프로젝트', '팀으로 문제를 풀어 발표']] }),
      cls('이번 학기 AI · SW 강좌', { eyebrow: 'COURSES' }),
      TX('features', { eyebrow: 'GOOD TO KNOW', title: '수업 전에 알아 두세요', cols: [['바른 사용', '출처 표기 · 개인정보 지키기'], ['실습 중심', '매 차시 직접 해 보는 과제'], ['질문 게시판', '막히는 부분은 바로 질문'], ['학습 기록', '차시별 진도와 과제 확인']] }),
      notice('강좌 공지', { eyebrow: 'NOTICE' }),
      cta('어느 단계부터 들을지 고민된다면', '지금까지 써 본 도구를 남겨 주시면 맞는 강좌를 안내해 드립니다.', '수강 상담', [['대상', '전교생'], ['상담', '게시판 접수']])]],
    ['univ-intl', '국제교류 · 한국어 교육원', ['univ'], '외국인 유학생 한국어 과정 · 교류 프로그램', '#0F766E', 'clean', 'split', '대학 한국어 교육원형 — 다국어 · 과정 카드 · 입학 절차 · 학기 흐름', () => [
      bn('split', { eyebrow: 'KOREAN LANGUAGE & EXCHANGE', title: `한국어로 여는\n새로운 캠퍼스 생활`, sub: '수준별 한국어 과정과 문화 체험, 재학생 버디 프로그램으로 유학 생활의 첫걸음을 돕습니다.', cta: '과정 보기', cta2: '입학 안내' }),
      TX('features', { eyebrow: 'PROGRAMS', title: '운영 과정', cols: [['정규 한국어', '초급부터 고급까지 수준별 수업'], ['시험 대비', '한국어 능력 시험 준비반'], ['문화 체험', '지역 문화 · 생활 체험 활동'], ['버디 프로그램', '재학생과 함께하는 캠퍼스 적응']] }),
      TX('steps', { eyebrow: 'ADMISSION', title: '입학 절차', cols: [['과정 확인', '학기와 과정을 고릅니다'], ['지원서 제출', '온라인으로 서류를 냅니다'], ['배치 시험', '수준에 맞는 반을 정합니다'], ['수업 시작', '학기 오리엔테이션 후 수강']] }),
      cls('모집 중인 과정', { eyebrow: 'COURSES' }),
      TX('timeline', { eyebrow: 'TERMS', title: '학기 운영', cols: [['봄 학기', '정규 과정 · 문화 체험'], ['여름 학기', '단기 집중 과정'], ['가을 학기', '정규 과정 · 버디 활동'], ['겨울 학기', '단기 집중 과정']] }),
      reviews('수료생 후기', { eyebrow: 'REVIEWS' }),
      cta('입학 상담', '희망 학기와 현재 한국어 수준을 남겨 주시면 맞는 과정을 안내해 드립니다.', '상담 신청', [['상담 언어', '한국어 · 영어'], ['접수', '온라인 게시판']])], ['ko', 'en']],
    ['univ-rise', '지역혁신 사업단 포털', ['univ'], '지역 · 대학 협력 프로그램 신청과 성과 공유', '#166534', 'campus', 'center', '대학 지역혁신 사업단형 — 가운데 첫 화면 · 사업 영역 · 사업 일정', () => [
      bn('center', { eyebrow: 'REGIONAL INNOVATION', title: `지역과 대학이\n함께 성장합니다`, sub: '지역 주민 · 재학생 · 지역 기업이 함께 참여하는 교육과 협력 프로그램을 한곳에서 안내합니다.', cta: '참여 프로그램 보기', cta2: '사업 소개' }),
      TX('features', { eyebrow: 'FOCUS AREAS', title: '사업 영역', cols: [['지역 인재', '지역에서 배우고 일하는 인재 양성'], ['산학 협력', '지역 기업과 함께하는 현장 과제'], ['평생 직업', '재직자 · 주민 대상 직무 교육'], ['지역 문제 해결', '지역 현안을 함께 푸는 프로젝트']] }),
      TX('tiles', { eyebrow: 'SHORTCUT', title: '바로가기', cols: [['프로그램 신청', '모집 중인 교육 · 행사'], ['참여 안내', '대상 · 신청 방법'], ['성과 자료', '보고서 · 사례 모음'], ['문의', '사업단 문의 게시판']] }),
      cls('모집 중인 프로그램', { eyebrow: 'PROGRAMS' }),
      TX('timeline', { eyebrow: 'SCHEDULE', title: '연간 사업 흐름', cols: [['상반기', '프로그램 공모 · 참여자 모집'], ['여름', '집중 교육 · 현장 과제'], ['하반기', '성과 점검 · 확산 프로그램'], ['연말', '성과 공유회 · 다음 해 계획']] }),
      notice('사업단 소식', { eyebrow: 'NEWS' }),
      cta('함께할 기관을 찾습니다', '협력을 원하는 지역 기관 · 기업은 문의를 남겨 주세요.', '협력 문의', [['대상', '지역 기관 · 기업'], ['접수', '문의 게시판']])]],
    /* ───────── 대학 부설 평생교육원(대학 · 평생교육 공통) ───────── */
    ['univ-cll', '대학 부설 평생교육원 · 학점은행', ['univ', 'lifelong'], '일반 · 자격 · 학점은행 과정과 등록 안내', '#8B1E3F', 'campus', 'split', '대학 평생교육원형 — 과정 분류 4칸 · 등록 안내표 · 학기 흐름', () => [
      bn('split', { eyebrow: 'CONTINUING EDUCATION', title: `대학 캠퍼스에서\n다시 시작하는 배움`, sub: '교양 · 자격 · 학점은행 과정을 학기마다 열고, 등록부터 수료까지 온라인으로 안내합니다.', cta: '개설 과정 보기', cta2: '등록 안내' }),
      TX('features', { eyebrow: 'COURSES', title: '과정 안내', cols: [['일반 교양 과정', '인문 · 문화예술 · 외국어'], ['자격 과정', '자격 취득을 돕는 실무 과정'], ['학점은행 과정', '학위 취득을 위한 학점 과목'], ['특별 과정', '기관 · 단체 맞춤 과정']] }),
      cls('이번 학기 개설 과정', { eyebrow: 'THIS TERM' }),
      TX('info', { eyebrow: 'REGISTRATION', title: '등록 안내', cols: [['수강 신청', '과정 카드에서 온라인으로 신청'], ['수강료', '과정별 안내를 확인한 뒤 납부'], ['환불', '평생교육 관련 법령의 반환 기준을 따릅니다'], ['개강 안내', '개강 전 문자 · 공지로 안내']] }),
      reviews('수강생 이야기', { eyebrow: 'REVIEWS' }),
      notice('교육원 공지', { eyebrow: 'NOTICE' }),
      mapS('찾아오시는 길', { eyebrow: 'LOCATION' })]],
    /* ───────── 평생교육 · 평생학습관 · 50+ · 시니어 ───────── */
    ['life-hub', '시 · 구 평생학습관', ['lifelong'], '분야별 시민 강좌 신청 · 학습 동아리 · 오시는 길', '#15803D', 'official', 'band', '지자체 평생학습관형 — 띠 배너 · 바로가기 · 강좌 분야 · 신청 절차', () => [
      bn('band', { eyebrow: 'LIFELONG LEARNING CENTER', title: `우리 동네에서 만나는\n평생학습`, sub: '인문 · 문화예술 · 건강 · 직업 강좌를 분기마다 열고, 온라인과 방문으로 신청을 받습니다.', cta: '강좌 신청하기', cta2: '수강 안내' }),
      TX('features', { eyebrow: 'FIELDS', title: '강좌 분야', cols: [['인문 · 교양', '역사 · 문학 · 철학'], ['문화 · 예술', '음악 · 미술 · 공예'], ['건강 · 생활', '운동 · 요리 · 생활 기술'], ['직업 · 자격', '자격 준비 · 디지털 실무']] }),
      cls('이번 분기 모집 강좌', { eyebrow: 'NOW OPEN' }),
      TX('steps', { eyebrow: 'HOW TO APPLY', title: '수강 신청 방법', cols: [['회원가입', '이름과 연락처로 가입합니다'], ['강좌 선택', '분야와 일정을 확인합니다'], ['신청 확인', '신청 결과를 문자로 받습니다'], ['수강', '개강일에 강의실 · 온라인으로']] }),
      notice('공지사항', { eyebrow: 'NOTICE' }),
      mapS('오시는 길', { eyebrow: 'LOCATION' }),
      cta('어떤 강좌가 맞을지 고민된다면', '학습 상담을 남겨 주시면 담당자가 분야와 일정을 안내해 드립니다.', '학습 상담 신청', [['신청', '온라인 · 방문'], ['대상', '지역 주민']])]],
    ['life-50plus', '50+ 인생 2막 캠퍼스', ['lifelong'], '인생 설계 · 일과 사회 참여 · 취미 문화', '#7A5A22', 'premium', 'bg', '50+ 캠퍼스형 — 프리미엄 어두운 첫 화면 · 3갈래 프로그램 · 상담 CTA', () => [
      bn('bg', { eyebrow: '50+ CAMPUS', title: `오십 이후의 시간,\n새롭게 설계합니다`, sub: '인생 설계 상담부터 일과 사회 참여, 취미와 건강까지 다음 시간을 준비하는 강좌를 엽니다.', cta: '강좌 둘러보기', cta2: '인생 설계 상담' }),
      TX('features', { eyebrow: 'PROGRAMS', title: '세 갈래 프로그램', cols: [['인생 설계', '재무 · 건강 · 관계를 함께 점검'], ['일 · 사회 참여', '새 일 준비 · 지역 활동 연결'], ['취미 · 문화', '배우고 나누는 여가 생활']] }),
      cls('지금 모집 중인 강좌', { eyebrow: 'NOW OPEN' }),
      TX('steps', { eyebrow: 'HOW TO START', title: '처음 오셨다면', cols: [['상담', '관심 분야와 계획을 나눠요'], ['강좌 선택', '맞는 강좌를 함께 골라요'], ['참여', '온 · 오프라인으로 배워요'], ['연결', '동아리 · 활동으로 이어가요']] }),
      reviews('먼저 시작한 분들의 이야기', { eyebrow: 'STORIES' }),
      notice('캠퍼스 소식', { eyebrow: 'NEWS' }),
      cta('인생 설계 상담을 받아 보세요', '지금 고민을 남겨 주시면 상담 일정을 안내해 드립니다.', '상담 신청', [['상담', '대면 · 전화'], ['대상', '중장년 누구나']])]],
    ['life-silver', '어르신 복지관 배움교실', ['lifelong'], '큰 글씨 · 전화 · 방문 신청(복지관 평생교육)', '#9A3412', 'senior', 'split', '복지관 평생교육형 — 큰 글씨 · 큰 버튼 · 이용 안내표 · 오시는 길', () => [
      bn('split', { eyebrow: '배움교실', title: `배우는 즐거움,\n복지관에서 함께해요`, sub: '건강 체조 · 스마트폰 · 노래 · 서예 교실을 엽니다. 전화나 방문으로도 쉽게 신청하실 수 있어요.', cta: '교실 신청하기', cta2: '이용 안내' }),
      TX('features', { eyebrow: '교실 안내', title: '이런 교실이 있어요', cols: [['건강 체조', '몸을 깨우는 쉬운 운동'], ['스마트폰', '사진 · 영상통화 · 메시지'], ['노래 · 악기', '함께 부르고 연주해요'], ['서예 · 그림', '붓과 색으로 마음 담기']] }),
      cls('지금 신청할 수 있는 교실'),
      TX('info', { eyebrow: '이용 안내', title: '신청 방법', cols: [['누가', '지역 어르신 누구나'], ['어떻게', '온라인 · 전화 · 방문 신청'], ['준비물', '교실마다 안내해 드려요'], ['도움', '신청이 어려우면 직원이 도와드려요']] }),
      notice('알림', { eyebrow: '알림' }),
      mapS('찾아오시는 길', { eyebrow: '오시는 길' }),
      cta('신청이 어려우세요?', '전화나 방문으로 말씀해 주시면 직원이 대신 신청해 드립니다.', '도움 요청하기', [['신청', '전화 · 방문'], ['대상', '지역 어르신']])]],
    ['life-digital', '디지털 배움터(스마트폰 · 키오스크)', ['lifelong'], '스마트폰 · 키오스크 · 모바일 금융 생활 교육', '#1D6FA3', 'senior', 'center', '디지털 배움터형 — 큰 글씨 가운데 첫 화면 · 생활 디지털 4과목 · 쉬운 단계', () => [
      bn('center', { eyebrow: '디지털 배움터', title: `어려운 디지털,\n천천히 따라 해요`, sub: '스마트폰 사용법부터 키오스크 주문, 모바일 금융까지 생활에 꼭 필요한 것만 직접 해 보며 배웁니다.', cta: '수업 신청하기', cta2: '배우는 내용' }),
      TX('features', { eyebrow: '배우는 내용', title: '생활에 필요한 네 가지', cols: [['스마트폰 기초', '전화 · 문자 · 사진 정리'], ['키오스크', '식당 · 병원 무인 주문기'], ['모바일 금융', '안전한 송금 · 사기 예방'], ['온라인 민원', '서류 발급 · 예약하기']] }),
      TX('steps', { eyebrow: '이렇게 배워요', title: '수업은 이렇게 진행돼요', cols: [['따라 보기', '강사가 천천히 보여 드려요'], ['직접 해 보기', '내 휴대폰으로 해 봐요'], ['다시 보기', '집에서 영상으로 복습해요']] }),
      cls('모집 중인 수업'),
      reviews('배우신 분들의 이야기', { eyebrow: '후기' }),
      notice('알림', { eyebrow: '알림' }),
      cta('혼자 하기 어려우시면', '전화로 신청하시거나 게시판에 남겨 주시면 도와드립니다.', '도움 신청', [['신청', '전화 · 온라인'], ['준비물', '평소 쓰는 휴대폰']])]],
    ['life-humanities', '시민 인문학 아카데미', ['lifelong'], '철학 · 역사 · 문학 · 예술 연속 강좌', '#7C2D12', 'premium', 'center', '시민 인문학 강좌형 — 프리미엄 가운데 첫 화면 · 주제 카드 · 분기 흐름', () => [
      bn('center', { eyebrow: 'CIVIC HUMANITIES', title: `생각을 넓히는\n저녁의 인문학`, sub: '철학 · 역사 · 문학 · 예술을 한 주제씩 깊이 읽고, 함께 이야기 나누는 연속 강좌입니다.', cta: '강좌 보기', cta2: '수강 안내' }),
      TX('features', { eyebrow: 'THEMES', title: '강좌 주제', cols: [['철학', '오래된 질문을 오늘의 말로'], ['역사', '사건 너머의 사람을 읽기'], ['문학', '한 권을 천천히 함께 읽기'], ['예술', '작품을 보는 눈 기르기']] }),
      cls('이번 분기 강좌', { eyebrow: 'THIS SEASON' }),
      TX('timeline', { eyebrow: 'FLOW', title: '한 강좌의 흐름', cols: [['읽기', '미리 나눠 드린 자료 읽기'], ['강의', '주제 강의와 질문'], ['토론', '소모임으로 생각 나누기'], ['정리', '한 줄 소감 · 다음 주제 예고']] }),
      reviews('수강생 후기', { eyebrow: 'REVIEWS' }),
      notice('강좌 공지', { eyebrow: 'NOTICE' }),
      cta('듣고 싶은 주제가 있나요?', '다음 분기 강좌로 다뤘으면 하는 주제를 남겨 주세요.', '주제 제안하기', [['제안', '커뮤니티 게시판'], ['대상', '시민 누구나']])]],
    ['life-craft', '생활문화 · 취미 공방', ['lifelong'], '공예 · 음악 · 요리 · 미술 생활문화 강좌', '#BE185D', 'warm', 'center', '생활문화 강좌형 — 따뜻한 가운데 첫 화면 · 분야 카드 · 예약 단계', () => [
      bn('center', { eyebrow: 'LIFE & CULTURE', title: `손으로 만들고\n함께 즐기는 시간`, sub: '공예 · 음악 · 요리 · 미술 강좌를 처음 오시는 분도 부담 없이 시작할 수 있게 엽니다.', cta: '강좌 예약하기', cta2: '이번 달 일정' }),
      TX('features', { eyebrow: 'CLASSES', title: '이런 분야가 있어요', cols: [['공예', '가죽 · 도자 · 생활 소품'], ['음악', '우쿨렐레 · 합창 · 리듬'], ['요리', '집밥 · 제철 요리'], ['미술', '수채화 · 드로잉']] }),
      cls('이번 달 강좌', { eyebrow: 'THIS MONTH' }),
      TX('steps', { eyebrow: 'BOOKING', title: '예약은 이렇게', cols: [['강좌 고르기', '날짜와 분야를 확인해요'], ['신청', '온라인으로 신청해요'], ['참여', '재료 안내를 받고 참여해요']] }),
      reviews('수강 후기', { eyebrow: 'REVIEWS' }),
      mapS('오시는 길', { eyebrow: 'LOCATION' }),
      cta('단체 · 모임 수업을 원하시나요?', '인원과 희망 날짜를 남겨 주시면 가능한 일정을 안내해 드립니다.', '단체 수업 문의', [['대상', '모임 · 단체'], ['접수', '게시판']])]],
    ['life-credit', '원격평생교육원(학점은행)', ['lifelong'], '온라인 학점 과목 · 학위 · 자격 연계', '#3730A3', 'clean', 'split', '원격평생교육원형 — 좌우 첫 화면 · 학위 취득 흐름 · 수강 안내표', () => [
      bn('split', { eyebrow: 'ONLINE CREDIT BANK', title: `일하면서도\n학위를 준비합니다`, sub: '온라인 학점 과목을 수강하고, 학습 설계 상담으로 학위 · 자격 취득 계획을 함께 세웁니다.', cta: '개설 과목 보기', cta2: '학습 설계 상담' }),
      TX('steps', { eyebrow: 'DEGREE PATH', title: '학위 취득 흐름', cols: [['학습 설계', '목표 학위 · 전공을 정합니다'], ['과목 수강', '학기별 온라인 과목을 듣습니다'], ['학점 인정', '이수 학점을 인정 신청합니다'], ['학위 신청', '기준을 채우면 학위를 신청합니다']] }),
      TX('features', { eyebrow: 'WHY ONLINE', title: '온라인으로 배우는 장점', cols: [['원하는 시간', '출퇴근 · 주말에도 수강'], ['자격 연계', '전공과 이어지는 자격 과정'], ['학습 관리', '진도 · 시험 일정을 한눈에'], ['설계 상담', '내 상황에 맞는 이수 계획']] }),
      cls('이번 학기 개설 과목', { eyebrow: 'SUBJECTS' }),
      TX('info', { eyebrow: 'GUIDE', title: '수강 안내', cols: [['신청', '학기 시작 전 수강 신청 기간에'], ['수업', '주차별 온라인 강의 · 과제'], ['평가', '출석 · 과제 · 시험 합산'], ['문의', '학습 설계 상담 게시판']] }),
      notice('학사 공지', { eyebrow: 'NOTICE' }),
      cta('나에게 맞는 이수 계획이 궁금하다면', '최종 학력과 목표를 남겨 주시면 학습 설계 상담을 도와드립니다.', '학습 설계 상담', [['상담', '온라인 · 전화'], ['대상', '성인 학습자']])]],
    ['life-family', '가족 · 부모 교육센터', ['lifelong'], '부모 교육 · 가족 소통 · 아이와 함께하는 강좌', '#D03A1F', 'kids', 'center', '가족 · 부모 교육형 — 키즈 컬러 가운데 첫 화면 · 대상별 카드 · 후기', () => [
      bn('center', { eyebrow: 'FAMILY LEARNING', title: `함께 배우면\n가족이 가까워져요`, sub: '부모 교육, 가족 소통, 아이와 함께하는 체험 강좌를 주말과 저녁 시간에 엽니다.', cta: '강좌 신청하기', cta2: '프로그램 안내' }),
      TX('features', { eyebrow: 'PROGRAMS', title: '누구와 함께하나요?', cols: [['부모 교육', '자녀 시기별 대화 · 양육'], ['가족 소통', '부부 · 가족 대화 연습'], ['아이와 함께', '놀이 · 체험 · 만들기'], ['다문화 가족', '한국 생활 · 언어 지원']] }),
      cls('이번 달 가족 강좌', { eyebrow: 'THIS MONTH' }),
      TX('steps', { eyebrow: 'HOW TO JOIN', title: '참여 방법', cols: [['강좌 고르기', '대상과 일정을 확인해요'], ['가족 신청', '함께할 가족 수를 적어요'], ['참여', '안내 문자를 받고 와요']] }),
      reviews('참여 가족 후기', { eyebrow: 'REVIEWS' }),
      notice('센터 소식', { eyebrow: 'NEWS' }),
      cta('우리 가족에게 맞는 프로그램 찾기', '고민을 남겨 주시면 담당자가 맞는 강좌를 안내해 드립니다.', '상담 남기기', [['상담', '게시판 · 전화'], ['대상', '지역 가족 누구나']])]],
    ['life-career', '평생 직업 · 재취업 교육', ['lifelong'], '경력 이음 · 자격 준비 · 창업 기초', '#0F766E', 'official', 'split', '평생 직업교육형 — 단정한 좌우 첫 화면 · 실제 숫자 띠 · 준비 단계', () => [
      bn('split', { eyebrow: 'CAREER RESTART', title: `다시 일을 시작하는\n가장 든든한 준비`, sub: '직업 탐색과 자격 준비, 디지털 실무와 창업 기초까지 재취업 · 경력 이음을 위한 강좌를 엽니다.', cta: '과정 둘러보기', cta2: '취업 상담' }),
      facts(),
      TX('features', { eyebrow: 'PROGRAMS', title: '준비할 수 있는 것', cols: [['직업 탐색', '나에게 맞는 일 찾기'], ['자격 준비', '자격 취득 실무 과정'], ['디지털 실무', '문서 · 협업 도구 · AI 활용'], ['창업 기초', '작은 창업을 위한 첫 수업']] }),
      TX('steps', { eyebrow: 'STEPS', title: '이렇게 준비해요', cols: [['상담', '경력과 희망 분야를 나눠요'], ['과정 수강', '맞는 과정을 골라 배워요'], ['서류 · 면접', '이력서와 면접을 준비해요'], ['연결', '일자리 정보를 안내받아요']] }),
      cls('모집 중인 과정', { eyebrow: 'COURSES' }),
      reviews('수료생 이야기', { eyebrow: 'REVIEWS' }),
      cta('경력이 끊긴 기간이 길어도 괜찮습니다', '지금 상황을 남겨 주시면 상담 일정을 안내해 드립니다.', '취업 상담 신청', [['상담', '대면 · 전화'], ['대상', '재취업 희망 성인']])]],
    ['life-village', '마을 학습공동체 · 학습 동아리', ['lifelong'], '주민이 가르치고 배우는 동아리 · 배움 나눔', '#4D7C0F', 'warm', 'split', '마을 학습공동체형 — 따뜻한 좌우 첫 화면 · 동아리 만들기 단계 · 오시는 길', () => [
      bn('split', { eyebrow: 'COMMUNITY LEARNING', title: `이웃이 선생님이 되는\n마을 배움터`, sub: '주민이 직접 여는 강좌와 학습 동아리로, 배운 것을 이웃과 나누는 마을 학습공동체입니다.', cta: '동아리 · 강좌 보기', cta2: '동아리 만들기' }),
      TX('features', { eyebrow: 'WHAT WE DO', title: '마을에서 함께하는 배움', cols: [['학습 동아리', '관심사가 같은 이웃과 모임'], ['배움 나눔', '내가 아는 것을 이웃에게'], ['마을 강좌', '주민이 기획하는 생활 강좌'], ['발표회', '배운 것을 함께 보여 주는 날']] }),
      cls('참여할 수 있는 강좌', { eyebrow: 'JOIN' }),
      TX('steps', { eyebrow: 'START A CLUB', title: '동아리 만들기', cols: [['모임 제안', '주제와 모임 방식을 정해요'], ['회원 모으기', '게시판으로 이웃을 모아요'], ['활동 기록', '모임 일지를 남겨요'], ['나눔', '발표회 · 나눔 강좌로 이어가요']] }),
      reviews('함께한 이웃 이야기', { eyebrow: 'STORIES' }),
      mapS('배움터 오시는 길', { eyebrow: 'LOCATION' }),
      cta('우리 동네 동아리를 시작해 보세요', '모임 주제를 남겨 주시면 공간과 홍보를 함께 도와드립니다.', '동아리 제안하기', [['대상', '지역 주민'], ['접수', '게시판']])]]
  ];

  const ids = [];
  L.forEach(([id, name, types, scene, color, theme, hero, ref, build, langs]) => {
    const tid = 't2-' + id; if (TPL.some(t => t.id === tid)) return; ids.push(tid);
    TPL.push({ id: tid, name, types, scene, color, tone: TONE[theme] || '신뢰', look: LOOK[theme] || 'campus', ref, build, theme, hero, langs: langs || ['ko'] });
  });

  /* ── 템플릿 전용 장식(짧은 CSS) — 테마 토큰(--a · --at · --as)만 써서 색을 바꿔도 맞는다 ── */
  const X = {
    'univ-ctl': `.hp-b-band::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.045) 0 2px,transparent 2px 22px);pointer-events:none}.hp-tiles .hp-tile{border-top:3px solid var(--a)}.hp-feat .hp-card h3::after{content:'';display:block;width:28px;height:3px;border-radius:3px;background:var(--a);margin-top:10px}`,
    'univ-faculty': `.hp-sh h2::before{content:'';display:block;width:44px;height:2px;background:var(--a);margin-bottom:16px}.hp-feat .hp-card{border-left:3px solid var(--a)}.hp-tll li.on{box-shadow:0 12px 26px -16px rgba(0,0,0,.45)}`,
    'univ-tutor': `.hp-feat .hp-card{border-top:4px solid var(--a)}.hp-steps .hp-no{border-radius:30%}`,
    'univ-writing': `.hp-b-light h1 em{background:none;text-decoration:underline wavy;text-decoration-color:var(--a);text-decoration-thickness:2px;text-underline-offset:8px}.hp-info .hp-dl div{border-left:4px solid var(--a)}`,
    'univ-career': `.hp-tll{counter-reset:yr}.hp-tll li{border-left:4px solid var(--as2)}.hp-tll li.on{border-left-color:transparent}.hp-feat .hp-ic{border-radius:50%}`,
    'univ-startup': `.hp-steps .hp-no{border-radius:12px;font-family:ui-monospace,Menlo,monospace}.hp-feat .hp-card{background:linear-gradient(180deg,var(--as) 0,#fff 46%)}`,
    'univ-mooc': `.hp-l-c .hp-ht::before{content:'';position:absolute;left:50%;top:-40px;width:520px;height:520px;transform:translateX(-50%);border-radius:50%;box-shadow:0 0 0 1px rgba(37,99,235,.10),0 0 0 60px rgba(37,99,235,.025),0 0 0 120px rgba(37,99,235,.02);pointer-events:none;z-index:-1}.hp-l-c .hp-ht{position:relative}.hp-feat .hp-card{text-align:left}`,
    'univ-dept': `.hp-tiles .hp-tile{border-left:4px solid var(--a)}.hp-info .hp-dl{max-width:none;grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:640px){.hp-info .hp-dl{grid-template-columns:1fr}}`,
    'univ-ai': `.hp-b-light{background-image:linear-gradient(rgba(79,70,229,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,.05) 1px,transparent 1px);background-size:32px 32px}.hp-steps .hp-no{border-radius:10px}`,
    'univ-intl': `.hp-feat .hp-card{border-radius:calc(var(--r) + 10px) var(--r) var(--r) var(--r)}.hp-tll li{border-style:dashed}`,
    'univ-rise': `.hp-feat .hp-card{border-bottom:3px solid var(--a)}.hp-tiles .hp-tile{background:var(--as)}`,
    'univ-cll': `.hp-feat .hp-card .hp-ic{border-radius:50%}.hp-info .hp-dl div{border-left:4px solid var(--a)}.hp-sh h2::after{content:'';display:block;width:36px;height:3px;background:var(--a);margin-top:14px}`,
    'life-hub': `.hp-b-band::before{content:'';position:absolute;left:-60px;bottom:-120px;width:420px;height:260px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none}.hp-tiles .hp-tile{border-bottom:3px solid var(--a)}`,
    'life-50plus': `.hp-sh h2::before{content:'';display:block;width:44px;height:2px;background:var(--a);margin-bottom:16px}.hp-feat .hp-card{border-top:2px solid var(--a)}`,
    'life-silver': `.hp-feat .hp-card{border:2px solid var(--as2)}.hp-info .hp-dl div{border-left:6px solid var(--a)}`,
    'life-digital': `.hp-steps .hp-no{border-radius:16px}.hp-feat .hp-card{border:2px solid var(--as2)}`,
    'life-humanities': `.hp-sh h2{font-family:'Noto Serif KR','Nanum Myeongjo',serif;font-weight:700}.hp-hero h1{font-family:'Noto Serif KR','Nanum Myeongjo',serif;font-weight:700}.hp-feat .hp-card{border-left:2px solid var(--a);border-radius:0}`,
    'life-craft': `.hp-feat .hp-card{border-radius:calc(var(--r) + 6px)}.hp-feat .hp-card:nth-child(2n){transform:translateY(10px)}@media(max-width:640px){.hp-feat .hp-card:nth-child(2n){transform:none}}`,
    'life-credit': `.hp-steps .hp-no{border-radius:8px}.hp-info .hp-dl div{border-left:4px solid var(--a)}`,
    'life-family': `.hp-steps .hp-no{border-radius:40% 60% 55% 45%}`,
    'life-career': `.hp-feat .hp-card{border-top:3px solid var(--a)}.hp-steps .hp-no{border-radius:8px}`,
    'life-village': `.hp-feat .hp-card{border:1.5px dashed var(--as2);box-shadow:none}.hp-steps .hp-no{border-radius:45% 55% 50% 50%}`
  };
  const css = id => X[String(id || '').replace(/^t2-/, '')] || '';
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
    try { const id = s && s.tpl; if (!id || !/^t2-/.test(id) || !s.theme) return h; const tp = TPL.find(t => t.id === id); if (!tp || tp.theme !== s.theme) return h; const c = css(id); return c ? h.replace('</style>', `/* tpl-b ${id} */${c}</style>`) : h; } catch (e) { console.error('tpl-b css', e); return h; } }; window.siteHTML = siteHTML; }
  window.TPL_B = { ids, css };
})();
