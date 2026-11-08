/* v34.3 tpl-c — 홈페이지 템플릿 확장(T3): corp(기업 교육) · voc(직업훈련)
   대표님(2026-11-08): "각 유형별로 15개씩 고를 수 있도록 확장 · 빌더 · 유형별 교육기관 홈페이지를 벤치마크해 디자인 완성도 가장 높게."
   벤치마크(구조 · 패턴만, 문구 · 로고 · 상호 미사용): 기업교육 포털의 2단 분류 바로가기 · 법정교육 포털의 빠른 처리 띠 ·
   사업주훈련 안내의 번호 배지 절차 · 모집형 코스의 선발 일정 타임라인 · 고객 교육의 역할별 러닝 패스 · 공공 직업훈련의 대상별 분기.
   - 템플릿 객체: { id, name, types, scene, color, tone, look, ref, build, theme, hero, langs, deco }
     theme = HPT 테마 id, hero = 'center' | 'split' | 'bg' | 'band'(= 공식 · 캠퍼스 테마 기본 띠 배너), deco = 이 파일의 장식 CSS 키.
   - 사실 원칙: 숫자는 실제 데이터 섹션(hpt: 'facts')만, 후기 · 공지는 실제 글만(없으면 게시본에서 숨김),
     주소 · 연락처는 설정값만, 운영 시간 · 강사 이름 · 실적 · 지원 금액 · 취업률은 넣지 않는다.
   - 장식: 템플릿 전용 CSS를 siteHTML의 <style> 끝에 덧붙인다(게시본 Shadow DOM도 같은 <style>을 쓴다). 테마 CSS 변수(--a 등)만 쓰므로 대비는 테마가 보장. */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const T = (variant, data) => S2('text', { variant, ...data });
  const FACTS = () => T('stats', { hpt: 'facts', title: '', cols: [] });
  const org = () => (typeof spOrg === 'function' ? spOrg() : '') || (S.org && S.org.name) || '';
  const ft = () => (S.settings && S.settings.footer) || {};
  const MAP = title => S2('map', { title, addr: ft().addr || '', tel: ft().tel || '', hours: '' });
  const CTA = (title, body, cta, eyebrow) => T('cta', { eyebrow: eyebrow || 'CONTACT', title, body, cta, cols: [] });
  const CLS = (eyebrow, title, sub, n) => S2('classes', { eyebrow, title, sub, ids: pubCls(n || 4), layout: 'grid' });
  const NT = (title, n) => S2('notices', { eyebrow: 'NOTICE', title, n: n || 4 });
  const RV = (title, sub) => S2('reviews', { eyebrow: 'REVIEWS', title, sub: sub || '', note: '실제 후기만 표시' });
  const HERO = d => S2('banner', d);

  const L = [];
  const add = (id, name, types, scene, color, theme, hero, look, ref, deco, build, langs) =>
    L.push({ id: 't3-' + id, name, types, scene, color, tone: '신뢰', look, ref, theme, hero, deco, build, langs });

  /* ═════════ corp — 기업 교육 ═════════ */
  add('c-leader', '리더십 · 승진자 아카데미', ['corp'], '직급별 리더 과정 · 승진 필수 이수 관리', '#8A6A2F', 'premium', 'bg', 'navyGlow', '기업 아카데미의 직급별 리더십 로드맵형', 'lux', () => [
    HERO({ eyebrow: 'LEADERSHIP ACADEMY', title: `${org()}\n리더가 성장하는 곳`, sub: '신임 리더부터 조직 책임자까지, 직급마다 필요한 리더십 과정을 순서대로 이수하고 기록합니다.', cta: '내 리더 과정 보기', cta2: '직급별 로드맵' }),
    FACTS(),
    T('timeline', { eyebrow: 'ROADMAP', title: '직급별 리더십 로드맵', sub: '승진 시점에 맞춰 다음 단계 과정이 자동으로 배정됩니다.', cols: [['예비 리더', '셀프 리더십 · 협업 커뮤니케이션'], ['신임 리더', '업무 위임 · 피드백 · 1:1 면담'], ['중간 관리자', '성과 관리 · 갈등 조정 · 코칭'], ['조직 책임자', '전략 실행 · 변화 관리 · 인재 육성']] }),
    T('features', { eyebrow: 'METHOD', title: '이렇게 배웁니다', sub: '이론 강의로 끝내지 않고, 내 팀의 실제 상황에 적용해 봅니다.', cols: [['사전 진단', '리더십 행동 자기 진단으로 출발점 확인'], ['사례 토론', '실제 조직 상황을 다룬 사례로 토의'], ['현업 적용 과제', '배운 내용을 팀에 적용하고 결과 공유'], ['코칭 피드백', '과제마다 코멘트와 다음 행동 제안']] }),
    CLS('PROGRAMS', '이번 분기 리더십 과정', '직급과 승진 예정 시기에 맞는 과정을 신청하세요.'),
    RV('수료한 리더들의 이야기'),
    NT('리더십 과정 안내'),
    CTA('리더 과정 배정이 궁금하신가요?', '승진 예정자 과정 배정 · 이수 인정 · 일정 변경은 교육 담당 부서에서 안내합니다.', '교육 문의하기')]);

  add('c-ax', '사내 AX · 생성형 AI 아카데미', ['corp'], '전 직원 AI 활용 단계별 전환 교육', '#0E7490', 'tech', 'bg', 'corpPortal', 'AI 전환(AX) 사내 교육 포털형', 'mono', () => [
    HERO({ eyebrow: 'AX ACADEMY', title: '업무에 바로 쓰는\n생성형 AI 역량', sub: '문서 · 데이터 · 보고 업무를 AI와 함께 처리하는 방법을 직무별 실습으로 익힙니다. 사내 보안 기준도 함께 배웁니다.', cta: 'AI 과정 시작하기', cta2: '단계별 안내' }),
    T('steps', { eyebrow: 'LEVEL', title: '세 단계로 전환합니다', cols: [['AI 리터러시', '생성형 AI의 원리 · 한계 · 사내 사용 기준'], ['업무 적용', '문서 작성 · 요약 · 데이터 정리 실습'], ['업무 자동화', '반복 업무를 AI 도구로 자동화'], ['사내 확산', '부서 사례를 공유하고 동료에게 전파']] }),
    T('tiles', { eyebrow: 'BY ROLE', title: '직무별 활용 트랙', sub: '내 직무에 맞는 실습부터 시작하세요.', cols: [['경영지원', '보고서 · 규정 문서'], ['영업 · 마케팅', '제안서 · 고객 분석'], ['생산 · 품질', '점검 기록 · 이상 분석'], ['연구 · 개발', '자료 조사 · 코드 보조']] }),
    FACTS(),
    CLS('COURSES', '지금 열린 AI 과정', '입문부터 자동화까지 단계별로 신청할 수 있습니다.'),
    T('info', { eyebrow: 'GUIDE', title: 'AI 사용 전에 꼭 확인하세요', cols: [['입력 금지 정보', '개인정보 · 고객 정보 · 영업 비밀은 외부 AI에 입력하지 않습니다'], ['결과 확인', 'AI가 만든 내용은 사실과 출처를 사람이 다시 확인합니다'], ['사내 기준', '회사가 허용한 도구와 계정으로만 사용합니다']] }),
    NT('AX 소식'),
    CTA('우리 부서 맞춤 실습이 필요하신가요?', '부서 업무에 맞춘 실습 과제와 사내 사례 공유회를 함께 설계합니다.', '맞춤 과정 요청')]);

  add('c-safety', '산업안전보건교육 센터', ['corp'], '정기 · 채용 시 · 관리감독자 안전보건교육', '#B45309', 'official', 'split', 'publicTiles', '안전보건교육 기관의 대상별 교육 안내형', 'hazard', () => [
    HERO({ eyebrow: 'SAFETY & HEALTH', title: '안전보건교육,\n대상별로 빠짐없이', sub: '근로자 정기교육 · 채용 시 교육 · 작업내용 변경 시 교육 · 관리감독자 교육을 대상에 맞게 배정하고 이수 기록을 남깁니다.', cta: '내 안전교육 보기', cta2: '교육 대상 확인' }),
    T('tiles', { eyebrow: 'QUICK', title: '바로가기', cols: [['수강 신청', '배정된 과정 바로 학습'], ['이수증 확인', '이수 내역 · 증빙 출력'], ['교육 일정', '집체 · 현장 교육 일정'], ['문의 게시판', '수강 · 증빙 문의']] }),
    T('info', { eyebrow: 'WHO', title: '교육 대상과 종류', sub: '세부 시간과 주기는 사업장 업종 · 규모에 따라 법령 기준을 따릅니다.', cols: [['근로자 정기교육', '모든 근로자 · 정해진 주기마다'], ['채용 시 교육', '신규 채용자 · 업무 배치 전'], ['작업내용 변경 시', '작업이 바뀐 근로자 · 변경 시점'], ['관리감독자 교육', '현장 관리감독자 · 연간'], ['특별교육', '유해 · 위험 작업 종사자']] }),
    CLS('COURSES', '올해 안전보건 과정', '배정된 과정을 기한 안에 이수하세요.'),
    T('steps', { eyebrow: 'PROCESS', title: '이수까지 네 단계', cols: [['대상 확인', '내 교육 종류와 기한 확인'], ['학습', '영상 · 사례 학습'], ['평가', '이해도 확인 문항'], ['이수 기록', '이수증과 부서 현황 보고']] }),
    NT('안전교육 공지'),
    CTA('사업장 안전교육 운영이 궁금하신가요?', '대상자 명단 등록 · 집체 교육 일정 · 증빙 자료는 안전보건 담당 부서에서 안내합니다.', '안전교육 문의')]);

  add('c-sales', '영업 · 매장 서비스 아카데미', ['corp'], '현장 직원용 짧은 영상 · 응대 역량 교육', '#BE185D', 'clean', 'split', 'mintSoft', '현장 직원 마이크로러닝 포털형', 'rail', () => [
    HERO({ eyebrow: 'FIELD ACADEMY', title: '현장에서 꺼내 보는\n응대 · 영업 교육', sub: '짧은 영상과 체크 문항으로 상품 지식 · 고객 응대 · 판매 화법을 휴대폰에서 바로 익힙니다.', cta: '오늘의 학습 시작', cta2: '과정 둘러보기' }),
    T('features', { eyebrow: 'WHY', title: '바쁜 현장에 맞췄습니다', cols: [['짧은 영상', '쉬는 시간에 끝내는 분량'], ['휴대폰 학습', '매장 · 이동 중 어디서나'], ['상황 연습', '실제 응대 상황으로 연습'], ['진도 기록', '매장 · 팀별 이수 현황 확인']] }),
    FACTS(),
    T('tiles', { eyebrow: 'TRACKS', title: '역할별 학습 트랙', cols: [['신규 판매 직원', '상품 기초 · 매장 규칙'], ['고객 응대', '응대 화법 · 불만 처리'], ['영업 실무', '상담 · 제안 · 계약'], ['매장 관리자', '팀 코칭 · 성과 관리']] }),
    CLS('COURSES', '추천 과정', '내 역할에 맞는 과정부터 시작하세요.'),
    RV('현장 직원 후기'),
    NT('신상품 · 교육 공지'),
    CTA('매장 단위 교육이 필요하신가요?', '신상품 출시 교육이나 매장 순회 교육 일정은 교육 담당자와 함께 정합니다.', '교육 요청하기')]);

  add('c-franchise', '가맹점 · 매장 오픈 교육 포털', ['corp'], '가맹점주 · 매장 직원 표준 매뉴얼 교육', '#C2410C', 'warm', 'center', 'brandBold', '프랜차이즈 본부의 가맹점 교육 포털형', 'soft', () => [
    HERO({ eyebrow: 'STORE ACADEMY', title: '매장 문을 열기 전\n꼭 배워야 할 것들', sub: '가맹점주와 매장 직원이 같은 기준으로 운영할 수 있도록 표준 매뉴얼 · 위생 · 응대 교육을 한 곳에서 제공합니다.', cta: '오픈 교육 시작', cta2: '교육 일정 보기' }),
    T('steps', { eyebrow: 'OPEN ROADMAP', title: '오픈까지의 교육 순서', cols: [['브랜드 이해', '브랜드 기준과 운영 원칙'], ['표준 매뉴얼', '메뉴 · 상품 · 진열 기준'], ['위생 · 안전', '매장 위생과 안전 수칙'], ['현장 실습', '교육 매장 실습과 점검'], ['오픈 점검', '오픈 전 최종 확인']] }),
    T('features', { eyebrow: 'AFTER OPEN', title: '오픈 후에도 계속', cols: [['신메뉴 교육', '출시 전 레시피 · 응대 영상'], ['직원 교육', '새 직원 기초 교육 배정'], ['운영 점검', '정기 점검 항목 학습'], ['우수 사례', '다른 매장의 운영 사례 공유']] }),
    CLS('COURSES', '가맹점 교육 과정', '점주용 · 직원용 과정을 구분해 신청하세요.'),
    FACTS(),
    NT('본부 공지'),
    RV('점주 · 직원 후기'),
    CTA('교육 일정 조율이 필요하신가요?', '오픈 일정에 맞춘 교육 일정은 담당 슈퍼바이저와 함께 정합니다.', '교육 문의')]);

  add('c-customer', '고객 교육 · 제품 러닝 패스', ['corp'], '역할별 러닝 패스 · 제품 인증 단계', '#6D28D9', 'clean', 'center', 'mintSoft', '고객 교육 아카데미의 역할별 러닝 패스형', 'path', () => [
    HERO({ eyebrow: 'CUSTOMER ACADEMY', title: '제품을 더 잘 쓰는\n가장 빠른 길', sub: '처음 쓰는 분부터 관리자까지, 역할에 맞는 러닝 패스를 따라가면 필요한 기능을 순서대로 익힐 수 있습니다.', cta: '러닝 패스 시작', cta2: '역할별 경로 보기' }),
    T('tiles', { eyebrow: 'LEARNING PATHS', title: '내 역할에 맞는 경로', sub: '기능 목록이 아니라 하는 일 기준으로 묶었습니다.', cols: [['처음 쓰는 사용자', '가입부터 첫 결과까지'], ['실무 담당자', '자주 쓰는 기능 · 작업 흐름'], ['관리자', '권한 · 설정 · 연동'], ['파트너', '고객 도입 지원 · 인증']] }),
    T('timeline', { eyebrow: 'CERTIFICATION', title: '인증 단계', cols: [['기초', '핵심 개념 · 기본 사용'], ['실무', '업무 시나리오 실습'], ['전문가', '설계 · 문제 해결 평가'], ['인증', '수료증 발급 · 갱신 안내']] }),
    CLS('COURSES', '인기 러닝 패스', '어디서 시작할지 모르겠다면 이 과정부터.'),
    FACTS(),
    T('features', { eyebrow: 'SUPPORT', title: '막히면 이렇게', cols: [['따라 하기 영상', '화면을 보며 그대로 실습'], ['질문 게시판', '운영팀 · 사용자끼리 묻고 답하기'], ['업데이트 교육', '새 기능 출시 때 짧은 영상 추가']] }),
    RV('수강 후기'),
    CTA('팀 단위 도입 교육이 필요하신가요?', '팀 규모와 사용 목적에 맞춰 도입 교육 일정을 함께 정합니다.', '도입 교육 문의')]);

  add('c-supplier', '협력사 상생 교육 포털', ['corp'], '협력사 품질 · 안전 · 윤리 교육 제공', '#1E3A8A', 'official', 'band', 'publicTiles', '원청사의 협력사 교육 지원 포털형', 'line', () => [
    HERO({ eyebrow: 'PARTNER COMPANY ACADEMY', title: '협력사와 함께 키우는\n품질 · 안전 역량', sub: '협력사 임직원이 품질 · 안전 · 윤리 기준을 같은 눈높이로 익힐 수 있도록 교육과 이수 기록을 제공합니다.', cta: '협력사 과정 보기', cta2: '참여 방법' }),
    T('features', { eyebrow: 'AREAS', title: '지원 분야', cols: [['품질', '품질 기준 · 불량 예방'], ['안전', '현장 안전 수칙 · 위험성 평가'], ['윤리 · 공정거래', '거래 원칙 · 신고 절차'], ['ESG', '환경 · 인권 · 공급망 기준']] }),
    T('steps', { eyebrow: 'HOW TO JOIN', title: '참여 방법', cols: [['협력사 등록', '담당 부서에 참여 신청'], ['계정 발급', '임직원 계정 일괄 등록'], ['과정 배정', '분야별 과정 배정'], ['이수 보고', '협력사별 이수 현황 공유']] }),
    CLS('COURSES', '협력사 공개 과정', '협력사 임직원 누구나 신청할 수 있는 과정입니다.'),
    FACTS(),
    NT('협력사 공지'),
    CTA('협력사 교육 참여를 원하시나요?', '참여 대상 · 계정 등록 · 이수 보고 방식은 협력사 지원 부서에서 안내합니다.', '참여 문의')]);

  add('c-job', '직무 전문가 트랙(사내 직무 학교)', ['corp'], '직무별 전문가 트랙 · 역량 레벨 인증', '#0F766E', 'official', 'center', 'corpPortal', '기업교육 포털의 직무 대분류 → 과정 2단 분류형', 'num', () => [
    HERO({ eyebrow: 'JOB SCHOOL', title: '우리 회사 직무 전문가는\n여기서 자랍니다', sub: '직무마다 필요한 역량을 레벨로 나누고, 레벨별 과정과 평가로 전문가 성장 경로를 안내합니다.', cta: '내 직무 트랙 보기', cta2: '레벨 기준 보기' }),
    T('tiles', { eyebrow: 'SCHOOLS', title: '직무 스쿨', cols: [['경영 · 기획', '전략 · 재무 · 인사'], ['영업 · 마케팅', '고객 · 시장 · 브랜드'], ['생산 · 품질', '공정 · 품질 · 설비'], ['연구 · 개발', '기술 · 데이터 · 특허'], ['IT · 디지털', '시스템 · 보안 · 데이터'], ['고객 지원', '서비스 · 상담 · 운영']] }),
    T('steps', { eyebrow: 'LEVEL', title: '역량 레벨', cols: [['기본', '직무 용어와 기본 업무'], ['실무', '혼자 업무를 끝까지 수행'], ['심화', '문제 해결과 개선 주도'], ['전문가', '사내 강의 · 후배 지도']] }),
    CLS('COURSES', '레벨별 추천 과정', '내 직무와 현재 레벨에 맞는 과정을 확인하세요.'),
    FACTS(),
    NT('직무 스쿨 공지'),
    CTA('레벨 인정 기준이 궁금하신가요?', '레벨 평가 일정과 경력 인정 기준은 인재개발 담당 부서에서 안내합니다.', '교육 문의')]);

  add('c-share', '사내 강사 · 지식 나눔', ['corp'], '사내 강사 양성 · 직원이 만드는 강의', '#A16207', 'warm', 'split', 'storyNumbered', '사내 지식 공유 플랫폼형', 'soft', () => [
    HERO({ eyebrow: 'KNOWLEDGE SHARING', title: '동료의 노하우를\n강의로 나눕니다', sub: '현장에서 쌓은 경험을 사내 강사가 직접 짧은 강의로 만들고, 동료는 필요한 순간에 찾아 배웁니다.', cta: '사내 강의 둘러보기', cta2: '사내 강사 신청' }),
    T('features', { eyebrow: 'HOW', title: '이렇게 운영합니다', cols: [['주제 제안', '현장에서 필요한 주제를 누구나 제안'], ['강의 제작', '사내 강사가 짧은 영상 · 자료로 제작'], ['검토 · 공개', '담당 부서 검토 후 공개'], ['피드백', '수강 후 질문과 개선 의견 반영']] }),
    T('steps', { eyebrow: 'INSTRUCTOR', title: '사내 강사가 되는 과정', cols: [['지원', '나눌 주제와 경험 작성'], ['강사 교육', '강의 설계 · 전달 기법 학습'], ['시범 강의', '동료 앞에서 시범 강의'], ['정식 활동', '사내 강사로 강의 공개']] }),
    CLS('CLASSES', '새로 올라온 사내 강의', '동료가 만든 강의를 먼저 들어 보세요.'),
    FACTS(),
    RV('수강한 동료의 한마디'),
    CTA('나누고 싶은 노하우가 있나요?', '사내 강사 지원과 강의 제작 지원은 교육 담당 부서에서 안내합니다.', '사내 강사 문의')]);

  add('c-global', '글로벌 법인 교육(국 · 영)', ['corp'], '본사 · 해외 법인 공통 교육 · 다국어', '#1D4ED8', 'clean', 'bg', 'navyGlow', '다국적 기업의 글로벌 러닝 포털형', 'rail', () => [
    HERO({ eyebrow: 'GLOBAL LEARNING', title: '본사와 해외 법인이\n같은 기준으로 배웁니다', sub: '공통 가치 · 규정 · 직무 교육을 국문과 영문으로 제공하고, 법인별 이수 현황을 한 곳에서 관리합니다.', cta: '내 교육 보기', cta2: '교육 문의' }),
    T('features', { eyebrow: 'COMMON CORE', title: '전 법인 공통 과정', cols: [['회사 가치 · 행동 규범', 'Code of Conduct'], ['정보 보안', 'Information Security'], ['공정 거래 · 반부패', 'Anti-Corruption'], ['직무 기본', 'Job Fundamentals']] }),
    T('tiles', { eyebrow: 'REGIONS', title: '법인별 교육 안내', cols: [['본사', '국문 과정 · 법정교육'], ['해외 법인', '영문 과정 · 현지 규정'], ['파견 · 주재원', '부임 전 교육 · 현지 이해']] }),
    CLS('COURSES', '공통 · 직무 과정', '언어를 바꾸면 같은 과정의 다른 언어판을 볼 수 있습니다.'),
    FACTS(),
    NT('글로벌 교육 공지'),
    CTA('법인별 과정 배정이 궁금하신가요?', '법인 · 언어별 과정 배정과 이수 보고 일정은 글로벌 교육 담당 부서에서 안내합니다.', '교육 문의')], ['ko', 'en']);

  add('c-esg', 'ESG · 윤리경영 교육', ['corp'], '윤리 · 준법 · 환경 · 인권 교육과 서약', '#166534', 'campus', 'band', 'campus', '준법 · ESG 교육 센터형', 'line', () => [
    HERO({ eyebrow: 'ETHICS & ESG', title: '바르게 일하는 기준,\n함께 배우고 지킵니다', sub: '윤리경영 · 준법 · 환경 · 인권 교육을 임직원 모두가 이수하고, 연간 윤리 서약까지 한 흐름으로 진행합니다.', cta: '필수 과정 보기', cta2: '윤리 서약 안내' }),
    T('features', { eyebrow: 'PILLARS', title: '네 가지 교육 영역', cols: [['윤리경영', '이해 상충 · 선물 · 접대 기준'], ['준법', '공정거래 · 개인정보 · 하도급'], ['환경', '탄소 · 자원 · 환경 법규'], ['인권 · 다양성', '존중하는 일터 · 차별 금지']] }),
    T('steps', { eyebrow: 'ANNUAL CYCLE', title: '연간 진행 순서', cols: [['필수 교육', '영역별 온라인 과정 이수'], ['사례 학습', '실제 판단이 어려운 상황 토론'], ['윤리 서약', '연간 서약 제출'], ['결과 공유', '부서별 이수 · 서약 현황']] }),
    CLS('COURSES', '올해 필수 과정', '기한 안에 이수해 주세요.'),
    FACTS(),
    NT('윤리 · ESG 공지'),
    CTA('판단이 어려운 상황이 있나요?', '윤리 · 준법 상담과 제보는 담당 부서가 비밀을 지켜 처리합니다.', '상담 · 제보 안내')]);

  /* ═════════ voc — 직업훈련 ═════════ */
  add('v-kdt', '디지털 신기술 부트캠프(국비)', ['voc', 'adult'], '선발 · 프로젝트 · 취업 연계 집중 과정', '#4338CA', 'tech', 'bg', 'navyGlow', '국비 디지털 부트캠프 모집 페이지형', 'mono', () => [
    HERO({ eyebrow: 'DIGITAL BOOTCAMP', title: '처음부터 현업 수준까지,\n프로젝트로 배웁니다', sub: '국민내일배움카드로 참여하는 디지털 신기술 집중 훈련. 기초 학습부터 팀 프로젝트와 취업 준비까지 한 기수가 함께 달립니다.', cta: '모집 과정 보기', cta2: '선발 일정' }),
    T('timeline', { eyebrow: 'SCHEDULE', title: '지원부터 수료까지', sub: '기수마다 날짜는 모집 공지에서 확인하세요.', cols: [['지원 접수', '온라인 지원서 · 카드 확인'], ['설명회', '과정 · 학습 방식 안내'], ['선발', '사전 과제 · 인터뷰'], ['훈련', '기초 → 심화 → 팀 프로젝트'], ['수료 · 취업 준비', '포트폴리오 · 이력서 · 면접 준비']] }),
    T('features', { eyebrow: 'HOW WE LEARN', title: '학습 방식', cols: [['라이브 수업', '정해진 시간에 함께 수업'], ['코드 리뷰', '과제마다 리뷰와 피드백'], ['팀 프로젝트', '기획부터 배포까지 팀으로'], ['학습 기록', '출결 · 과제 · 프로젝트 기록']] }),
    CLS('RECRUITING', '모집 중인 과정', '과정별 훈련 기간과 일정을 확인하세요.'),
    FACTS(),
    T('info', { eyebrow: 'BEFORE YOU APPLY', title: '지원 전 확인하세요', cols: [['참여 조건', '국민내일배움카드 발급 · 과정별 자격 확인'], ['출결', '훈련 일정에 맞춰 출석 · 출결 기록 필수'], ['수료', '과정이 정한 출석 · 평가 기준 충족'], ['비용 · 지원', '자부담 · 훈련장려금은 모집 공지와 고용24에서 확인']] }),
    RV('수료생 후기'),
    CTA('나에게 맞는 과정인지 궁금하다면', '전공 · 경력 · 일정에 맞는 과정인지 상담으로 확인해 드립니다.', '수강 상담 신청')]);

  add('v-trade', '기계 · 용접 · 전기 기술훈련원', ['voc'], '실습장 중심 기술 직종 훈련 · 자격 연계', '#9A3412', 'official', 'split', 'publicTiles', '공공 직업훈련 기관의 직종별 훈련 안내형', 'hazard', () => [
    HERO({ eyebrow: 'TECHNICAL TRAINING', title: '손으로 익히는 기술,\n현장에서 통하는 실력', sub: '기계 가공 · 용접 · 전기 직종을 실습장 중심으로 훈련하고, 관련 국가기술자격 준비까지 함께합니다.', cta: '훈련 직종 보기', cta2: '수강 절차' }),
    T('tiles', { eyebrow: 'TRADES', title: '훈련 직종', cols: [['기계 가공', '선반 · 밀링 · CNC'], ['용접', '피복 아크 · 특수 용접'], ['전기', '내선 공사 · 전기 설비'], ['설비 보전', '공조 · 배관 · 설비']] }),
    T('features', { eyebrow: 'WORKSHOP', title: '실습 중심 훈련', cols: [['실습장 훈련', '장비를 직접 다루며 반복 실습'], ['안전 교육', '실습 전 안전 수칙 이수'], ['자격 연계', '직종별 국가기술자격 준비'], ['취업 상담', '현장 직무 · 진로 상담']] }),
    T('steps', { eyebrow: 'PROCESS', title: '수강 절차', cols: [['상담', '직종 · 일정 상담'], ['카드 확인', '국민내일배움카드 확인'], ['수강 신청', '고용24에서 신청 · 기관 승인'], ['훈련 · 수료', '출석 · 실습 평가로 수료']] }),
    CLS('RECRUITING', '모집 중인 훈련과정', '직종별 개강 일정을 확인하세요.'),
    FACTS(),
    NT('모집 공지'),
    MAP('훈련원 오시는 길')]);

  add('v-beauty', '미용 · 조리 · 제과제빵 직업학교', ['voc'], '자격 취득 · 실기 실습 · 창업 준비', '#A21CAF', 'warm', 'split', 'brandBold', '서비스 직종 직업학교의 자격 과정 안내형', 'soft', () => [
    HERO({ eyebrow: 'VOCATIONAL SCHOOL', title: '자격증 너머,\n현장에서 쓰는 실기', sub: '미용 · 조리 · 제과제빵 과정을 실습실에서 직접 배우고, 자격 시험과 취업 · 창업 준비까지 이어 갑니다.', cta: '과정 둘러보기', cta2: '상담 신청' }),
    T('tiles', { eyebrow: 'DEPARTMENTS', title: '훈련 분야', cols: [['헤어 · 메이크업', '커트 · 펌 · 메이크업'], ['피부 · 네일', '피부 관리 · 네일 아트'], ['한식 · 양식 조리', '조리 기능 · 메뉴 구성'], ['제과 · 제빵', '반죽 · 성형 · 굽기']] }),
    T('timeline', { eyebrow: 'CERTIFICATE ROUTE', title: '자격 취득 흐름', cols: [['기초 이론', '재료 · 위생 · 도구 이해'], ['필기 준비', '필기 시험 대비 학습'], ['실기 반복', '시험 과제 반복 실습'], ['시험 · 취업 준비', '실기 응시 · 포트폴리오']] }),
    CLS('COURSES', '모집 중인 과정', '주간 · 야간 과정을 확인하고 상담을 신청하세요.'),
    FACTS(),
    RV('수료생 후기'),
    NT('개강 · 시험 안내'),
    CTA('어떤 과정이 맞을지 고민되나요?', '희망 분야 · 수강 일정 · 국비 지원 가능 여부를 상담으로 확인해 드립니다.', '상담 신청하기')]);

  add('v-license', '국가기술자격 취득반', ['voc', 'adult'], '기능사 · 산업기사 필기 → 실기 단계 과정', '#0369A1', 'clean', 'split', 'corpPortal', '자격 취득 과정의 단계별 로드맵형', 'num', () => [
    HERO({ eyebrow: 'NATIONAL LICENSE', title: '필기부터 실기까지\n단계별로 준비합니다', sub: '기능사 · 산업기사 자격을 목표로 이론 · 기출 · 실기 과제를 순서대로 학습하고, 단계마다 이해도를 확인합니다.', cta: '자격 과정 보기', cta2: '학습 단계' }),
    T('steps', { eyebrow: 'ROADMAP', title: '합격까지의 학습 단계', cols: [['핵심 이론', '과목별 필수 개념'], ['기출 분석', '출제 경향과 반복 문제'], ['필기 모의평가', '실전 형식 점검'], ['실기 과제', '시험 과제 반복 실습'], ['최종 점검', '취약 부분 보완']] }),
    FACTS(),
    T('features', { eyebrow: 'SUPPORT', title: '학습을 돕는 장치', cols: [['차시별 확인 문항', '배운 내용을 바로 점검'], ['질문 게시판', '막히는 문제를 훈련교사에게 질문'], ['실기 피드백', '과제 결과에 대한 개선점 안내'], ['학습 기록', '진도 · 평가 결과 한눈에']] }),
    CLS('COURSES', '개설 자격 과정', '목표 자격과 시험 일정에 맞는 과정을 고르세요.'),
    RV('수강생 후기'),
    T('info', { eyebrow: 'CHECK', title: '수강 전 확인할 것', cols: [['응시 자격', '자격 종목별 응시 자격은 시행 기관 공고에서 확인'], ['시험 일정', '연간 시험 일정은 시행 기관 공고 기준'], ['국비 지원', '과정별 국민내일배움카드 사용 가능 여부 확인']] }),
    CTA('나에게 맞는 자격 과정이 궁금하다면', '현재 경력과 목표 시험 일정에 맞춰 과정을 안내해 드립니다.', '상담 신청')]);

  add('v-midlife', '신중년 재취업 훈련', ['voc', 'lifelong'], '큰 글씨 · 상담 중심 재취업 · 전직 훈련', '#1D4ED8', 'senior', 'split', 'senior', '신중년 대상 직업훈련 · 전직 지원 안내형', 'big', () => [
    HERO({ eyebrow: '신중년 재취업 훈련', title: '경험에 기술을 더해\n다시 일터로', sub: '그동안의 경력을 살려 새 일을 준비하는 분을 위해, 상담부터 기술 훈련 · 취업 준비까지 천천히 함께합니다.', cta: '훈련과정 보기', cta2: '상담 신청' }),
    T('features', { eyebrow: '이런 분께', title: '이런 분께 맞습니다', cols: [['퇴직 · 전직 준비', '새 직종으로 옮기려는 분'], ['경력 단절 후 복귀', '다시 일을 시작하려는 분'], ['기술 자격 준비', '현장 기술을 배우려는 분']] }),
    T('steps', { eyebrow: '진행 순서', title: '이렇게 진행합니다', cols: [['상담', '경력 · 희망 직종 상담'], ['과정 선택', '맞는 훈련과정 안내'], ['훈련', '실습 위주 수업'], ['취업 준비', '이력서 · 면접 준비']] }),
    CLS('모집 과정', '지금 모집 중인 과정', '과정을 눌러 일정과 내용을 확인하세요.', 3),
    FACTS(),
    NT('모집 안내', 3),
    MAP('방문 · 전화 상담')]);

  add('v-youth', '청년 취업 집중 훈련', ['voc'], '청년 구직자 직무 훈련 · 취업 준비 일체형', '#047857', 'clean', 'center', 'mintSoft', '청년 대상 무료 취업 훈련 모집형', 'path', () => [
    HERO({ eyebrow: 'YOUTH CAREER TRAINING', title: '첫 직장을 준비하는\n가장 확실한 루틴', sub: '직무 훈련 · 프로젝트 · 취업 준비를 한 과정 안에서. 청년 구직자를 위해 일정과 학습량을 설계했습니다.', cta: '모집 과정 보기', cta2: '참여 자격' }),
    T('tiles', { eyebrow: 'TRACKS', title: '직무 트랙', cols: [['사무 · 데이터', '문서 · 엑셀 · 데이터'], ['디지털 마케팅', '콘텐츠 · 광고 · 분석'], ['IT 개발', '웹 · 앱 기초 개발'], ['디자인', '그래픽 · UI 기초']] }),
    T('features', { eyebrow: 'ROUTINE', title: '훈련 루틴', cols: [['오전 직무 수업', '직무 기초와 실습'], ['오후 프로젝트', '팀 과제 · 결과물 제작'], ['주간 회고', '진도 · 출결 점검'], ['취업 준비', '이력서 · 자기소개서 · 면접']] }),
    CLS('RECRUITING', '모집 중인 과정', '과정별 참여 자격과 일정을 확인하세요.'),
    FACTS(),
    T('info', { eyebrow: 'ELIGIBILITY', title: '참여 전 확인하세요', cols: [['참여 대상', '과정별 연령 · 거주 · 취업 상태 조건 확인'], ['비용', '과정별 지원 방식은 모집 공지 기준'], ['출결', '훈련 시간에 맞춘 출석 필수']] }),
    RV('수료생 후기'),
    CTA('참여할 수 있는지 궁금하다면', '참여 조건과 과정 선택을 상담으로 안내해 드립니다.', '상담 신청')]);

  add('v-remote', '재직자 원격훈련 과정몰', ['voc', 'corp'], '사업주 · 재직자 원격훈련(이러닝) 과정 신청', '#2563EB', 'clean', 'split', 'corpPortal', '원격훈련기관 과정몰 · 기업 단체 수강형', 'rail', () => [
    HERO({ eyebrow: 'ONLINE TRAINING', title: '일하면서 듣는\n직무 원격훈련', sub: '재직자 개인 수강과 기업 단체 수강을 모두 지원합니다. 과정마다 학습 기간 · 평가 · 수료 기준을 안내합니다.', cta: '과정 둘러보기', cta2: '단체 수강 안내' }),
    T('tiles', { eyebrow: 'CATEGORY', title: '분야별 과정', cols: [['직무 공통', '문서 · 보고 · 협업'], ['디지털 · AI', '데이터 · 생성형 AI'], ['리더십 · 관리', '팀 관리 · 성과 관리'], ['법정 · 안전', '법정의무 · 안전보건']] }),
    T('steps', { eyebrow: 'GROUP ENROLL', title: '기업 단체 수강 절차', cols: [['과정 상담', '대상 · 과정 선정'], ['명단 등록', '수강자 명단 접수'], ['학습 · 평가', '기간 내 진도 · 평가'], ['수료 · 증빙', '수료 결과 · 서류 안내']] }),
    CLS('COURSES', '추천 원격훈련 과정', '학습 기간과 수료 기준을 확인하고 신청하세요.'),
    FACTS(),
    T('info', { eyebrow: 'RULES', title: '원격훈련 수강 기준', cols: [['본인 학습', '본인 인증 후 직접 학습해야 인정'], ['진도 · 평가', '과정이 정한 진도율과 평가 기준 충족'], ['학습 기간', '정해진 기간 안에 학습 완료'], ['비용 지원', '사업주 · 개인 지원 여부는 과정 안내에서 확인']] }),
    NT('수강 공지'),
    CTA('기업 단체 수강을 검토 중이신가요?', '대상 인원과 과정에 맞춰 단체 수강 방법과 일정을 안내해 드립니다.', '단체 수강 문의')]);

  add('v-factory', '스마트공장 · 제조 혁신 훈련', ['voc', 'corp'], '제조 현장 자동화 · 데이터 실무 훈련', '#155E75', 'tech', 'split', 'corpPortal', '제조 혁신 훈련센터형', 'mono', () => [
    HERO({ eyebrow: 'SMART FACTORY', title: '현장 설비와 데이터를\n함께 다루는 기술자', sub: '설비 자동화 · 제어 · 생산 데이터 활용을 실습 장비로 훈련합니다. 구직자 양성 과정과 재직자 향상 과정을 운영합니다.', cta: '훈련과정 보기', cta2: '재직자 과정' }),
    T('features', { eyebrow: 'SKILLS', title: '훈련 분야', cols: [['PLC · 제어', '설비 제어 프로그램 실습'], ['로봇 · 자동화', '산업용 로봇 운용'], ['생산 데이터', '설비 데이터 수집 · 분석'], ['설비 보전', '예방 보전 · 고장 진단']] }),
    T('tiles', { eyebrow: 'FOR WHOM', title: '대상별 과정', cols: [['구직자 양성', '기초부터 현장 투입까지'], ['재직자 향상', '현장 직원 기술 고도화'], ['기업 맞춤', '사업장 설비 기준 맞춤']] }),
    CLS('COURSES', '모집 중인 과정', '과정별 실습 장비와 일정을 확인하세요.'),
    FACTS(),
    T('steps', { eyebrow: 'PROCESS', title: '참여 절차', cols: [['상담', '경력 · 목표 상담'], ['수강 신청', '과정 신청 · 승인'], ['실습 훈련', '장비 실습 · 프로젝트'], ['수료', '평가 · 수료']] }),
    NT('모집 · 장비 안내'),
    CTA('우리 공장에 맞는 교육이 필요하신가요?', '사업장 설비와 인원에 맞춘 재직자 맞춤 과정을 상담합니다.', '맞춤 과정 상담')]);

  add('v-care', '요양보호사 · 돌봄 교육원', ['voc', 'lifelong'], '돌봄 직무 이론 · 실기 · 현장실습 안내', '#BE123C', 'warm', 'center', 'mintSoft', '돌봄 직무 교육기관의 과정 · 실습 안내형', 'soft', () => [
    HERO({ eyebrow: 'CARE TRAINING', title: '따뜻한 돌봄도\n배워야 잘할 수 있습니다', sub: '이론 · 실기 · 현장실습을 순서대로 이수하고 자격 시험을 준비합니다. 주간 · 야간 반을 확인하고 상담을 신청하세요.', cta: '과정 · 반 보기', cta2: '상담 신청' }),
    T('timeline', { eyebrow: 'COURSE FLOW', title: '교육 과정 흐름', cols: [['이론', '돌봄의 이해 · 기본 지식'], ['실기', '일상생활 지원 · 안전한 돌봄 기술'], ['현장실습', '협약 기관에서 실습'], ['시험 준비', '자격 시험 대비 학습']] }),
    T('features', { eyebrow: 'WHY US', title: '수업 방식', cols: [['실습실 수업', '돌봄 기술을 직접 연습'], ['소규모 반', '질문하기 쉬운 수업'], ['실습 연계', '현장실습 기관 안내'], ['시험 대비', '문제 풀이 · 모의 평가']] }),
    CLS('CLASSES', '모집 중인 반', '주간 · 야간 · 주말 반 일정을 확인하세요.'),
    FACTS(),
    RV('수료생 후기'),
    NT('개강 · 시험 안내'),
    MAP('교육원 오시는 길')]);

  add('v-consort', '지역 · 산업 공동훈련센터', ['voc', 'corp'], '중소기업 재직자 공동훈련 · 참여 기업 모집', '#3730A3', 'official', 'band', 'publicTiles', '중소기업 공동훈련(컨소시엄) 센터형', 'line', () => [
    HERO({ eyebrow: 'JOINT TRAINING CENTER', title: '중소기업이 함께 쓰는\n재직자 훈련센터', sub: '여러 참여 기업이 함께 훈련과정을 기획하고 재직자 훈련을 운영합니다. 참여 기업 등록부터 수료 보고까지 안내합니다.', cta: '훈련과정 보기', cta2: '참여 기업 신청' }),
    T('steps', { eyebrow: 'FOR COMPANIES', title: '참여 기업 절차', cols: [['참여 신청', '협약 · 참여 기업 등록'], ['수요 조사', '필요 직무 · 인원 파악'], ['과정 개설', '공동 과정 기획 · 개설'], ['훈련 · 보고', '재직자 훈련 · 결과 보고']] }),
    T('features', { eyebrow: 'FIELDS', title: '훈련 분야', cols: [['생산 · 품질', '공정 개선 · 품질 관리'], ['디지털 전환', '데이터 · 자동화 · AI'], ['경영 · 관리', '리더십 · 노무 · 회계'], ['안전 · 환경', '안전보건 · 환경 관리']] }),
    CLS('COURSES', '이번 분기 공동훈련 과정', '참여 기업 재직자는 과정을 골라 신청할 수 있습니다.'),
    FACTS(),
    T('info', { eyebrow: 'FOR TRAINEES', title: '재직자 수강 안내', cols: [['대상', '참여 기업 소속 재직자'], ['신청', '소속 기업 담당자를 통해 신청'], ['수료', '과정별 출석 · 평가 기준 충족'], ['비용', '과정별 지원 방식은 개설 공지 기준']] }),
    NT('센터 공지'),
    CTA('참여 기업이 되고 싶으신가요?', '참여 조건과 협약 절차, 필요한 서류를 안내해 드립니다.', '참여 문의')]);

  add('v-jobcenter', '구직자 직업훈련 · 취업 상담', ['voc'], '상담 → 훈련 → 취업 지원 일관 안내', '#134E4A', 'campus', 'band', 'campus', '공공 직업훈련 기관의 대상별 과정 · 상담 안내형', 'line', () => [
    HERO({ eyebrow: 'JOB TRAINING', title: '상담부터 취업까지\n한 곳에서', sub: '직업 상담으로 나에게 맞는 직종을 찾고, 훈련과정 수료 후 취업 준비까지 단계마다 안내합니다.', cta: '훈련과정 찾기', cta2: '상담 예약' }),
    T('info', { eyebrow: 'WHO', title: '대상별 훈련 안내', cols: [['구직자', '취업을 준비하는 미취업자 과정'], ['재직자', '일하면서 듣는 야간 · 주말 과정'], ['신중년', '전직 · 재취업 준비 과정'], ['청년', '첫 취업 준비 과정']] }),
    T('steps', { eyebrow: 'JOURNEY', title: '취업까지의 여정', cols: [['직업 상담', '흥미 · 경력 · 희망 직종'], ['과정 선택', '훈련과정 · 일정 안내'], ['훈련 참여', '출석 · 실습 · 평가'], ['취업 지원', '이력서 · 면접 · 구인 정보']] }),
    CLS('RECRUITING', '모집 중인 훈련과정', '상담 후 신청하면 더 잘 맞는 과정을 고를 수 있습니다.'),
    FACTS(),
    NT('모집 · 채용 소식'),
    RV('수료생 후기'),
    MAP('상담 · 방문 안내')]);

  add('v-design', '디자인 · 영상 포트폴리오 과정', ['voc', 'adult'], '실무 툴 · 프로젝트 · 포트폴리오 완성형', '#9D174D', 'premium', 'bg', 'navyGlow', '크리에이티브 실무 훈련의 포트폴리오 쇼케이스형', 'lux', () => [
    HERO({ eyebrow: 'CREATIVE TRAINING', title: '툴을 배우는 것을 넘어\n포트폴리오를 완성합니다', sub: '그래픽 · 영상 · UI 디자인을 실무 과제로 훈련하고, 수료할 때 나만의 포트폴리오를 들고 나갑니다.', cta: '모집 과정 보기', cta2: '커리큘럼' }),
    T('tiles', { eyebrow: 'MAJORS', title: '훈련 분야', cols: [['그래픽 디자인', '편집 · 브랜딩 · 패키지'], ['영상 편집 · 모션', '편집 · 자막 · 모션'], ['UI · UX 디자인', '화면 설계 · 프로토타입']] }),
    T('timeline', { eyebrow: 'CURRICULUM', title: '포트폴리오 완성 흐름', cols: [['툴 기초', '실무 툴 사용법'], ['과제 실습', '분야별 실무 과제'], ['개인 프로젝트', '주제 기획 · 제작'], ['포트폴리오 리뷰', '훈련교사 피드백 · 보완']] }),
    T('features', { eyebrow: 'STUDIO', title: '작업 방식', cols: [['과제 피드백', '결과물마다 개선 코멘트'], ['작업물 기록', '과정별 작업물 한곳에 정리'], ['발표 · 리뷰', '동료 앞 발표와 리뷰'], ['취업 준비', '포트폴리오 · 지원서 정리']] }),
    CLS('RECRUITING', '모집 중인 과정', '분야별 훈련 일정과 수강 조건을 확인하세요.'),
    FACTS(),
    RV('수료생 후기'),
    CTA('내 실력에 맞는 과정이 궁금하다면', '경험 수준과 목표 직무에 맞는 과정을 상담으로 안내해 드립니다.', '상담 신청')]);

  /* ── 등록: 같은 id가 있으면 건너뜀(재실행 안전) ── */
  L.forEach(tp => { if (!TPL.some(t => t.id === tp.id)) TPL.push(tp); });

  /* ── 템플릿 전용 장식 CSS(테마 변수만 사용 · 글자 대비에 영향 없음) ── */
  const DECO = {
    lux: '.hp-hero h1{letter-spacing:-.035em}.hp-hey{letter-spacing:.24em}.hp-s .hp-ey{letter-spacing:.22em}.hp-s h2{position:relative;padding-bottom:16px}.hp-s .hp-sh h2::after{content:"";position:absolute;left:0;bottom:0;width:44px;height:2px;background:var(--a)}.hp-l-c .hp-sh h2::after{left:50%;margin-left:-22px}.hp-tll li{border-left:3px solid var(--a)}',
    mono: '.hp-hey,.hp-s .hp-ey{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em}.hp-hey::before{content:">_";margin-right:2px}.hp-s .hp-ey::before{content:"// "}.hp-card{border-radius:10px}.hp-tile .hp-ic,.hp-feat .hp-ic{border-radius:8px}',
    hazard: '.hp-hero{border-top:10px solid transparent;border-image:repeating-linear-gradient(-45deg,var(--a) 0 16px,#1F2937 16px 32px) 10}.hp-card{border-top:3px solid var(--a)}.hp-dl div{border-left:4px solid var(--a)}',
    rail: '.hp-card{border-left:4px solid var(--a)}.hp-cc{border-bottom:3px solid var(--a)}',
    soft: '.hp-card{border-radius:calc(var(--r) + 6px)}.hp-ic{border-radius:50%}.hp-st .hp-no{border-radius:40%}',
    path: '.hp-tiles .hp-g{counter-reset:pth}.hp-tiles .hp-tile{position:relative}.hp-tiles .hp-tile::after{counter-increment:pth;content:"PATH " counter(pth);position:absolute;right:16px;top:14px;font-size:11.5px;font-weight:800;letter-spacing:.12em;color:var(--at)}',
    line: '.hp-card{box-shadow:none;border:1px solid #D5DAE3}.hp-s .hp-sh h2{border-left:5px solid var(--a);padding-left:14px}.hp-l-c .hp-sh h2{border-left:0;padding-left:0}',
    num: '.hp-tiles .hp-g{counter-reset:tn}.hp-tiles .hp-tile{position:relative}.hp-tiles .hp-tile::before{counter-increment:tn;content:counter(tn,decimal-leading-zero);position:absolute;right:16px;top:12px;font-size:22px;font-weight:850;color:var(--at);opacity:.9}',
    big: '.hp-card{border:2px solid #C9D3E6}.hp-btn{min-height:56px}'
  };
  const decoOf = s => { const tp = s && s.tpl && /^t3-/.test(s.tpl) ? TPL.find(t => t.id === s.tpl) : null; return tp && DECO[tp.deco] && s.theme ? DECO[tp.deco] : ''; };
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); try { const c = decoOf(s); if (c) { const k = h.lastIndexOf('</style>', h.indexOf('</head>') > 0 ? h.indexOf('</head>') : h.length); if (k > 0) return h.slice(0, k) + `/* t3 ${s.tpl} */` + c + h.slice(k); } } catch (e) { console.error('tpl-c deco', e); } return h; }; }
  window.TPL_C = { ids: L.map(t => t.id), deco: DECO };
})();
