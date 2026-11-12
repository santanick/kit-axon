/* v34.3 tpl-a — 홈페이지 템플릿 확장(T1): k12(학원 · 초중고) 13종 + adult(성인 교육) 10종
   대표님(2026-11-08): "각 유형별로 15개씩 고를 수 있도록 확장 … 카페24 · 아임웹 · 교육기관 홈페이지를 벤치마크해 디자인 완성도 높게"
   - 기존 20종(global.js TPL)에 더해 k12 18종 · adult 16종을 고를 수 있다.
   - 각 템플릿은 HPT 테마(tp.theme) + 첫 화면 배치(tp.hero) + 6~9개 섹션 + 템플릿 전용 장식(DECO)을 가진다.
   - 사실 원칙: 숫자는 실제 데이터 숫자 띠(hpt:'facts')로만, 강사는 등록된 강사(강좌 소개)만, 후기는 실제 후기만,
     연락처 · 운영 시간은 설정값만 쓴다(없으면 문의 게시판으로). 문구 안에 실적 · 합격률 같은 숫자 약속을 넣지 않는다.
   - 장식 CSS는 이 템플릿을 고르고 테마를 바꾸지 않았을 때만 게시본 · 미리보기 <style>에 덧붙인다(학습자 홈 Shadow DOM에도 그대로 들어감). */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const T2a = (variant, data) => S2('text', { variant, ...data });
  const LOOK = { clean: 'mintSoft', premium: 'navyGlow', warm: 'brandBold', official: 'publicTiles', tech: 'corpPortal', kids: 'brandBold', campus: 'campus', senior: 'senior' };
  const cls = (title, eyebrow, sub) => S2('classes', { eyebrow: eyebrow || 'CLASSES', title, sub: sub || '', ids: pubCls(4), layout: 'grid' });
  const facts = () => T2a('stats', { hpt: 'facts', title: '', cols: [] });
  /* 등록된 강사만: 공개 강좌의 강사 소개(이름 + 소개글)에서 가져온다 */
  const ppl = () => { const seen = new Set(); const L = [];
    (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료').forEach(c => (c.intro || []).forEach(x => { const n = String(x.name || '').trim(); const b = String(x.bio || '').trim(); if (!n || seen.has(n)) return; seen.add(n); L.push([n, (b || `${c.name} 담당`).slice(0, 120)]); })); /* 소개글이 없으면 실제 담당 강좌로 */
    return L.slice(0, 4); };
  const people = (title, eyebrow) => T2a('profiles', { hpt: 'people', eyebrow: eyebrow || 'TEACHERS', title, cols: ppl() });
  const reviews = title => S2('reviews', { eyebrow: 'REVIEWS', title, note: '' });
  const faq = (title, cols) => T2a('info', { eyebrow: 'FAQ', title: title || '자주 묻는 질문', cols });
  const cta = (title, body, btn) => T2a('cta', { eyebrow: 'CONTACT', title, body, cta: btn || '문의하기', cols: [] });
  const ban = (hero, d) => S2('banner', { ...d, hero });

  /* [id, 이름, 유형, 장면, 색, 테마, 첫 화면, 참고(일반 설명), 섹션] */
  const L = [
    /* ───────── k12 ───────── */
    ['t1-k12-math', '수학 전문 학원', ['k12'], '진단 → 개념 → 유형 → 클리닉으로 단원을 끝내는 수학 관리', '#1E40AF', 'clean', 'split', '수학 전문 학원 랜딩(진단 · 단계 · 학년 로드맵 · 상담)', h => [
      ban(h, { eyebrow: 'MATH LAB', title: '개념이 보이면\n수학이 쉬워집니다', sub: '진단 테스트로 약한 단원을 찾고, 개념 수업과 오답 클리닉으로 빈틈을 차근차근 메웁니다.', cta: '레벨 테스트 신청', cta2: '상담 문의' }),
      facts(),
      T2a('steps', { eyebrow: 'HOW WE TEACH', title: '한 단원을 끝내는 4단계', cols: [['진단', '단원별 테스트로 약한 부분 확인'], ['개념', '풀이 과정을 말로 설명하는 수업'], ['유형', '자주 나오는 유형을 반복 연습'], ['클리닉', '틀린 문제만 다시 잡는 보충 수업']] }),
      T2a('timeline', { eyebrow: 'ROADMAP', title: '학년별 수학 로드맵', sub: '학년마다 목표가 다릅니다. 지금 단계에 맞는 반에서 시작하세요.', cols: [['초등', '연산 정확도 · 사고력 기초'], ['중등', '내신 개념 완성 · 서술형 대비'], ['고등', '수능 유형 · 심화 문제 풀이']] }),
      cls('지금 모집 중인 반', 'CLASSES', '학년과 수준에 맞는 반을 확인하세요.'),
      people('수업을 맡은 선생님'),
      reviews('학생 · 학부모 후기'),
      faq('', [['레벨 테스트는 어떻게 하나요?', '상담 신청을 남겨 주시면 학년과 목표를 확인한 뒤 테스트 일정을 안내해 드립니다.'], ['선행과 내신 중 무엇을 먼저 하나요?', '진단 결과를 보고 지금 학기 내신을 먼저 챙길지, 다음 학기 선행을 함께 할지 상담으로 정합니다.'], ['수업 내용은 어떻게 알 수 있나요?', '수업 · 과제 · 테스트 기록을 학습자 앱에서 보호자와 함께 확인할 수 있습니다.']]),
      cta('우리 아이 수학,\n어디서부터 시작할까요?', '지금 실력과 목표를 알려 주시면 맞는 반과 시작 단원을 안내해 드립니다.', '상담 신청')]],
    ['t1-k12-english', '영어 전문 어학원', ['k12'], '리딩 · 스피킹 · 라이팅을 레벨별로 잇는 초중등 영어', '#0F766E', 'warm', 'split', '초중등 어학원(영역별 과정 · 레벨 테스트 → 반 배정)', h => [
      ban(h, { eyebrow: 'ENGLISH ACADEMY', title: '읽고, 말하고, 쓰는\n진짜 영어 실력', sub: '리딩 · 스피킹 · 라이팅을 레벨별로 연결해 시험 점수와 말하기 자신감을 함께 키웁니다.', cta: '레벨 테스트 예약', cta2: '상담 문의' }),
      T2a('features', { eyebrow: 'FOUR SKILLS', title: '네 영역을 고르게', cols: [['Reading', '수준에 맞는 원서와 지문 읽기'], ['Speaking', '매 수업 말하기 · 발표 시간'], ['Writing', '문장에서 에세이까지 단계별 쓰기'], ['Grammar', '읽고 쓰는 데 필요한 문법 정리']] }),
      T2a('steps', { eyebrow: 'PROCESS', title: '처음 오셨다면', cols: [['레벨 테스트', '영역별 현재 실력 확인'], ['반 배정', '레벨과 학년에 맞는 반'], ['수업 · 과제', '수업 후 온라인 과제로 복습'], ['정기 피드백', '성취와 다음 목표를 보호자와 공유']] }),
      cls('레벨별 수업', 'CLASSES'),
      facts(),
      reviews('학부모 후기'),
      faq('', [['레벨 테스트는 무엇을 보나요?', '읽기 · 듣기 · 말하기를 함께 보고, 결과를 바탕으로 반을 안내해 드립니다.'], ['학교 시험 대비도 하나요?', '중등 반은 학교 진도에 맞춘 내신 대비 수업을 함께 운영합니다.']]),
      cta('영어, 지금 레벨부터\n확인해 보세요', '아이의 학년과 학습 경험을 알려 주시면 테스트 일정을 안내해 드립니다.', '테스트 문의')]],
    ['t1-k12-coding', '코딩 · AI 학원', ['k12'], '블록 코딩에서 파이썬 · AI까지 프로젝트로 배우는 코딩', '#0E7490', 'tech', 'bg', '초중등 코딩 학원(단계 로드맵 · 체험 수업 · 프로젝트 발표)', h => [
      ban(h, { eyebrow: 'CODING & AI', title: '만들면서 배우는\n코딩과 AI', sub: '블록 코딩에서 파이썬, 피지컬 컴퓨팅까지 — 매 수업이 작은 프로젝트 하나로 끝납니다.', cta: '체험 수업 신청', cta2: '상담 문의' }),
      T2a('timeline', { eyebrow: 'ROADMAP', title: '단계별 코딩 로드맵', sub: '처음이어도 괜찮습니다. 지금 수준에 맞는 단계부터 시작합니다.', cols: [['입문', '블록 코딩으로 순서 · 반복 · 조건 익히기'], ['기초', '파이썬으로 내 손으로 프로그램 만들기'], ['응용', '데이터 · AI 도구로 문제 해결하기'], ['심화', '팀 프로젝트 · 대회 · 자격 준비']] }),
      T2a('features', { eyebrow: 'HOW WE TEACH', title: '수업은 이렇게 진행합니다', cols: [['프로젝트 수업', '배운 개념으로 매번 결과물 완성'], ['발표', '만든 것을 친구들 앞에서 설명'], ['포트폴리오', '작품이 기록으로 쌓입니다'], ['보호자 공유', '수업 결과물을 앱으로 확인']] }),
      cls('지금 모집 중인 과정', 'COURSES'),
      people('코딩 선생님'),
      facts(),
      reviews('학생 · 학부모 후기'),
      cta('체험 수업으로\n먼저 만나 보세요', '학년과 코딩 경험을 알려 주시면 맞는 단계의 체험 수업을 안내해 드립니다.', '체험 문의')]],
    ['t1-k12-art', '어린이 미술 학원', ['k12'], '드로잉 · 수채화 · 조형으로 표현력을 키우는 미술', '#BE185D', 'warm', 'center', '어린이 · 청소년 미술 학원(과정 소개 · 작업 순서 · 체험)', h => [
      ban(h, { eyebrow: 'ART STUDIO', title: '보고, 느끼고,\n마음껏 그리는 시간', sub: '드로잉 · 수채화 · 입체 조형까지, 아이의 표현력을 단계별로 키웁니다.', cta: '체험 수업 신청', cta2: '상담 문의' }),
      T2a('features', { eyebrow: 'PROGRAM', title: '이런 수업을 합니다', cols: [['드로잉 기초', '관찰하고 선으로 표현하기'], ['색채 · 수채화', '색을 섞고 번지게 하며 느끼기'], ['입체 · 공예', '찰흙 · 종이 · 재활용 재료로 만들기'], ['포트폴리오', '작품을 모아 성장 기록으로']] }),
      T2a('steps', { eyebrow: 'ONE CLASS', title: '한 작품이 완성되기까지', cols: [['관찰', '대상을 오래 들여다보기'], ['스케치', '떠오른 생각을 밑그림으로'], ['채색 · 만들기', '재료를 골라 표현하기'], ['작품 이야기', '내 작품을 말로 소개하기']] }),
      cls('반 안내', 'CLASSES'),
      people('함께하는 선생님'),
      reviews('학부모 후기'),
      faq('', [['그림을 처음 그려도 되나요?', '처음이라면 관찰 · 선 긋기부터 시작합니다. 아이 속도에 맞춰 진행합니다.'], ['재료는 준비해야 하나요?', '수업별 준비물은 반 안내와 공지사항에서 미리 알려 드립니다.']]),
      cta('아이의 첫 작품,\n함께 시작해요', '체험 수업 일정이 궁금하시면 편하게 문의해 주세요.', '체험 문의')]],
    ['t1-k12-music', '음악 학원(피아노 · 악기)', ['k12'], '개인 레슨과 앙상블로 음악과 오래 친해지는 학원', '#8A6A2F', 'premium', 'center', '음악 학원(악기별 레슨 · 단계 · 연주 준비)', h => [
      ban(h, { eyebrow: 'MUSIC ACADEMY', title: '한 곡을 완성하는\n기쁨을 알려 줍니다', sub: '피아노 · 현악 · 기타 개인 레슨과 앙상블 수업으로, 음악과 오래 친해지게 합니다.', cta: '레슨 상담 신청', cta2: '문의하기' }),
      T2a('features', { eyebrow: 'LESSONS', title: '레슨 구성', cols: [['개인 레슨', '학생 수준에 맞춘 1:1 지도'], ['이론 · 청음', '악보 읽기와 듣는 귀 기르기'], ['앙상블', '친구들과 함께 맞춰 보는 합주'], ['연주 준비', '발표회 · 콩쿠르 곡 준비']] }),
      T2a('timeline', { eyebrow: 'LEVEL', title: '단계별 과정', cols: [['입문', '자세 · 박자 · 기본 주법'], ['초급', '쉬운 곡 완주와 악보 읽기'], ['중급', '표현과 셈여림, 레퍼토리 넓히기'], ['연주 과정', '무대 연주 · 입시 준비']] }),
      cls('레슨 · 클래스', 'CLASSES'),
      people('레슨 선생님'),
      reviews('학부모 후기'),
      cta('악기 선택부터\n함께 고민해 드립니다', '처음 배우는 악기라면 상담으로 아이에게 맞는 악기와 레슨을 안내해 드립니다.', '레슨 문의')]],
    ['t1-k12-reading', '독서 · 논술 학원', ['k12'], '읽기 → 토론 → 글쓰기로 생각을 키우는 독서 논술', '#166534', 'campus', 'split', '독서 논술 학원(수업 순서 · 학년별 과정 · 첨삭)', h => [
      ban(h, { eyebrow: 'READING & WRITING', title: '읽는 힘이\n생각하는 힘이 됩니다', sub: '책 한 권을 깊이 읽고, 토론하고, 내 생각을 글로 정리하는 수업입니다.', cta: '수업 상담 신청', cta2: '문의하기' }),
      T2a('steps', { eyebrow: 'ONE BOOK', title: '책 한 권을 읽는 방법', cols: [['읽기', '천천히, 질문하며 읽기'], ['질문 만들기', '궁금한 점을 내 말로'], ['토론', '친구들과 생각 나누기'], ['글쓰기', '내 주장을 글로 정리'], ['첨삭', '선생님 피드백으로 고쳐 쓰기']] }),
      T2a('features', { eyebrow: 'BY GRADE', title: '학년별 과정', cols: [['초등 저학년', '그림책 · 동화로 읽기 습관'], ['초등 고학년', '주제 독서와 짧은 글쓰기'], ['중등', '비문학 독해 · 토론 · 논술 기초'], ['고등', '논증하는 글쓰기 · 서술형 대비']] }),
      cls('지금 모집 중인 반', 'CLASSES'),
      reviews('학부모 후기'),
      faq('', [['책은 어떻게 고르나요?', '학년과 독서 수준을 보고 반별 도서 목록을 정해 미리 안내합니다.'], ['글쓰기를 싫어하는 아이도 괜찮을까요?', '말로 먼저 생각을 나눈 뒤 짧은 글부터 시작해 부담을 줄입니다.']]),
      cta('아이의 독서 습관,\n상담으로 시작하세요', '지금 읽고 있는 책과 학년을 알려 주시면 맞는 반을 안내해 드립니다.', '상담 신청')]],
    ['t1-k12-science', '과학 실험 · 탐구 교실', ['k12'], '직접 만들고 관찰하는 실험으로 배우는 과학', '#0369A1', 'kids', 'center', '과학 실험 교실(영역 · 탐구 순서 · 체험)', h => [
      ban(h, { eyebrow: 'SCIENCE LAB', title: '“왜?”라는 질문이\n실험이 되는 곳', sub: '직접 만들고 관찰하는 실험 수업으로 과학 개념을 몸으로 이해합니다.', cta: '체험 수업 신청', cta2: '상담 문의' }),
      T2a('features', { eyebrow: 'FIELDS', title: '네 가지 탐구 영역', cols: [['물리', '힘 · 빛 · 소리 실험'], ['화학', '섞고 녹이고 바꿔 보기'], ['생명', '관찰 일지와 생물 탐구'], ['지구 · 우주', '날씨 · 암석 · 별자리']] }),
      T2a('steps', { eyebrow: 'INQUIRY', title: '탐구는 이렇게', cols: [['질문', '궁금한 현상 고르기'], ['예상', '결과를 미리 생각해 보기'], ['실험', '직접 해 보고 관찰하기'], ['기록 · 발표', '결과를 정리해 설명하기']] }),
      cls('실험 수업', 'CLASSES'),
      facts(),
      reviews('학부모 후기'),
      faq('', [['실험은 안전한가요?', '학년에 맞는 재료와 도구만 쓰고, 선생님 안내에 따라 보호 장비를 갖추고 진행합니다.'], ['결과물은 볼 수 있나요?', '실험 기록과 사진을 수업 후 학습자 앱에서 확인할 수 있습니다.']]),
      cta('실험 한 번으로\n과학이 좋아집니다', '체험 수업 일정이 궁금하시면 편하게 문의해 주세요.', '체험 문의')]],
    ['t1-k12-tutor', '1:1 과외 · 소수정예', ['k12'], '학생 한 명의 목표와 속도에 맞춘 수업 설계', '#4338CA', 'official', 'split', '1:1 · 소수정예 과외(맞춤 상담 → 플랜 → 기록 공유)', h => [
      ban(h, { eyebrow: 'PRIVATE TUTORING', title: '한 명을 위한\n수업 설계', sub: '학생의 목표와 속도에 맞춰 수업 계획을 짜고, 매 수업 기록을 보호자와 공유합니다.', cta: '맞춤 상담 신청', cta2: '문의하기' }),
      T2a('steps', { eyebrow: 'PROCESS', title: '맞춤 수업이 시작되는 과정', cols: [['상담', '목표 · 고민 · 일정 확인'], ['진단', '현재 실력과 학습 습관 점검'], ['맞춤 플랜', '과목 · 진도 · 과제 계획'], ['수업 · 기록', '매 수업 내용과 과제 기록'], ['점검', '정기적으로 계획 다시 조정']] }),
      T2a('features', { eyebrow: 'FORMAT', title: '수업 방식', cols: [['1:1 수업', '한 학생에게 온전히 집중'], ['소수정예', '비슷한 목표의 소그룹'], ['온라인 병행', '보강 · 복습은 온라인으로'], ['기록 공유', '보호자가 앱에서 바로 확인']] }),
      people('담당 선생님'),
      cls('수업 안내', 'CLASSES'),
      reviews('학생 · 학부모 후기'),
      faq('', [['과목을 여러 개 들을 수 있나요?', '상담에서 과목별 목표를 확인한 뒤 함께 계획을 세웁니다.'], ['수업 시간은 어떻게 정하나요?', '학생 일정에 맞춰 상담에서 정하고, 변경은 미리 알려 주시면 조정합니다.']]),
      cta('우리 아이에게 맞는\n수업을 설계해 드립니다', '고민과 목표를 남겨 주시면 맞춤 상담을 도와드립니다.', '상담 신청')]],
    ['t1-k12-studycare', '관리형 독서실 · 자습 관리', ['k12'], '출결 · 플래너 · 정기 상담으로 자습 시간을 관리', '#92400E', 'premium', 'bg', '관리형 독서실(관리 요소 · 이용 흐름 · 이용 안내)', h => [
      ban(h, { eyebrow: 'STUDY CARE', title: '혼자 하는 공부를\n끝까지 지켜봅니다', sub: '입실 · 퇴실 기록, 학습 플래너 점검, 정기 상담으로 자습 시간을 실력으로 바꿉니다.', cta: '이용 상담 신청', cta2: '문의하기' }),
      T2a('features', { eyebrow: 'CARE', title: '이렇게 관리합니다', cols: [['출결 기록', '입실 · 퇴실을 보호자와 공유'], ['플래너 점검', '하루 계획과 실천을 함께 확인'], ['집중 환경', '조용하고 정돈된 자습 공간'], ['정기 상담', '학습 습관과 목표 점검']] }),
      T2a('steps', { eyebrow: 'FLOW', title: '이용 흐름', cols: [['상담', '목표와 생활 패턴 확인'], ['목표 설정', '기간별 학습 목표 정하기'], ['플래너', '매일 계획 · 실천 기록'], ['점검', '정기 상담으로 계획 조정']] }),
      T2a('info', { eyebrow: 'GUIDE', title: '이용 안내', cols: [['이용 대상', '중 · 고등학생, 수험생'], ['관리 방식', '출결 · 플래너 · 상담 기록을 학습자 앱으로 공유'], ['상담', '이용 전 방문 또는 전화 상담']] }),
      cls('관리 프로그램', 'PROGRAM'),
      reviews('이용 후기'),
      cta('자습 습관,\n상담으로 시작하세요', '이용 방법과 관리 방식이 궁금하시면 문의해 주세요.', '이용 문의')]],
    ['t1-k12-sports', '예체능 · 체육 교실', ['k12'], '태권도 · 줄넘기 · 체육으로 체력과 자신감을 키우는 교실', '#B91C1C', 'kids', 'bg', '어린이 체육 · 무도 교실(가치 · 단계 · 체험)', h => [
      ban(h, { eyebrow: 'SPORTS CLUB', title: '튼튼한 몸,\n당당한 마음', sub: '태권도 · 줄넘기 · 체육 활동으로 체력과 자신감, 함께하는 법을 배웁니다.', cta: '체험 수업 신청', cta2: '상담 문의' }),
      T2a('features', { eyebrow: 'VALUES', title: '운동으로 배우는 네 가지', cols: [['체력', '바른 자세와 기초 체력'], ['협동', '친구와 함께하는 팀 활동'], ['예절', '인사 · 순서 · 규칙 지키기'], ['안전', '다치지 않게 배우는 습관']] }),
      T2a('timeline', { eyebrow: 'LEVEL', title: '단계별 과정', cols: [['기초', '기본 동작과 몸 쓰는 법'], ['중급', '응용 동작 · 줄넘기 기술'], ['심화', '시범 · 대회 준비'], ['승급', '단계별 심사로 성장 확인']] }),
      cls('반 안내', 'CLASSES'),
      reviews('학부모 후기'),
      faq('', [['운동을 처음 하는 아이도 괜찮나요?', '기초 반에서 기본 동작부터 시작합니다. 체험 수업으로 먼저 분위기를 보셔도 좋습니다.'], ['준비물이 있나요?', '편한 복장으로 오시면 됩니다. 반별 준비물은 공지사항으로 안내합니다.']]),
      cta('체험 수업으로\n먼저 뛰어 보세요', '아이의 나이와 운동 경험을 알려 주시면 맞는 반을 안내해 드립니다.', '체험 문의')]],
    ['t1-k12-kinder', '유아 · 놀이 교실', ['k12'], '노래 · 그림책 · 오감 놀이로 자라는 유아 수업', '#A21CAF', 'kids', 'split', '유아 놀이 교실(놀이 영역 · 하루 수업 · 선생님)', h => [
      ban(h, { eyebrow: 'PLAY & LEARN', title: '놀이로 시작하는\n첫 배움', sub: '노래 · 그림책 · 오감 놀이로 말과 생각이 자라는 유아 수업입니다.', cta: '체험 수업 예약', cta2: '상담 문의' }),
      T2a('features', { eyebrow: 'PLAY', title: '놀이 영역', cols: [['언어 놀이', '그림책 · 말놀이로 표현하기'], ['오감 놀이', '만지고 듣고 느끼기'], ['음악 · 율동', '노래와 몸으로 리듬 익히기'], ['만들기', '손으로 꼼지락 작품 만들기']] }),
      T2a('steps', { eyebrow: 'ONE DAY', title: '한 번의 수업은 이렇게', cols: [['인사 · 노래', '마음을 여는 시작'], ['주제 놀이', '오늘의 주제로 함께 놀기'], ['활동', '만들기 · 표현 활동'], ['오늘의 이야기', '활동 내용을 보호자와 공유']] }),
      cls('연령별 수업', 'CLASSES'),
      people('아이들과 함께하는 선생님'),
      reviews('보호자 후기'),
      cta('우리 아이 첫 수업,\n편하게 문의하세요', '아이의 나이와 관심사를 알려 주시면 맞는 수업을 안내해 드립니다.', '체험 문의')]],
    ['t1-k12-retake', '재수 종합 · 집중 관리', ['k12'], '시기별 계획 · 모의고사 분석 · 담임 상담의 재수 관리', '#1E3A8A', 'official', '', '재수 종합 학원(시기별 로드맵 · 관리 체계 · 입학 상담)', h => [
      ban(h, { eyebrow: 'NEXT CHALLENGE', title: '다시 도전하는 한 해,\n매일을 관리합니다', sub: '시기별 학습 계획, 정기 모의고사 분석, 담임 상담으로 수험 생활 전체를 함께 설계합니다.', cta: '입학 상담 신청', cta2: '문의하기' }),
      T2a('timeline', { eyebrow: 'SCHEDULE', title: '시기별 학습 로드맵', cols: [['기초 정비기', '약한 과목 진단과 기본 개념 복구'], ['개념 완성기', '과목별 개념 완성과 기출 분석'], ['실전 훈련기', '실전 모의고사와 시간 관리 훈련'], ['최종 점검기', '취약 유형 집중 보완과 컨디션 관리']] }),
      T2a('features', { eyebrow: 'SYSTEM', title: '관리 체계', cols: [['담임 관리', '정기 상담으로 계획 점검'], ['모의고사 분석', '성적 추이와 약점 리포트'], ['자습 관리', '출결 · 자습 시간 기록'], ['진학 상담', '성적에 맞춘 지원 전략']] }),
      cls('개설 과정', 'COURSES'),
      facts(),
      reviews('수강생 후기'),
      faq('', [['언제 등록하는 것이 좋을까요?', '시기별 과정이 이어지므로 상담에서 지금 성적과 목표를 보고 시작 시점을 안내해 드립니다.'], ['보호자도 상담할 수 있나요?', '담임 상담 결과와 성적 리포트를 보호자와 함께 공유합니다.']]),
      cta('다시 시작하는 수험 생활,\n상담으로 계획하세요', '지난 시험 결과와 목표를 알려 주시면 맞는 과정을 안내해 드립니다.', '입학 상담')]],
    ['t1-k12-online', '중고등 온라인 인강', ['k12'], '과목별 강의 영상 · 확인 문제 · 질문 게시판', '#2563EB', 'clean', 'bg', '중고등 인강(과목 바로가기 · 강좌 카드 · 수강 방법)', h => [
      ban(h, { eyebrow: 'ONLINE LECTURE', title: '언제 어디서나\n내 속도로 듣는 강의', sub: '과목별 강의 영상 · 확인 문제 · 질문 게시판으로 학교 진도와 시험을 혼자서도 준비합니다.', cta: '강좌 둘러보기', cta2: '질문하기' }),
      facts(),
      T2a('tiles', { eyebrow: 'SUBJECTS', title: '과목별로 찾기', cols: [['국어', '독해 · 문학 · 문법'], ['영어', '독해 · 어법 · 듣기'], ['수학', '개념 · 유형 · 심화'], ['과학 · 사회', '탐구 과목 개념 정리']] }),
      cls('지금 열린 강좌', 'COURSES', '강좌를 눌러 차시 구성과 수강 기간을 확인하세요.'),
      T2a('steps', { eyebrow: 'HOW TO', title: '수강 방법', cols: [['강좌 선택', '과목 · 학년으로 찾기'], ['영상 수강', 'PC · 휴대폰 어디서나'], ['확인 문제', '차시마다 이해도 점검'], ['질문 · 복습', '게시판 질문과 다시 보기']] }),
      reviews('수강 후기'),
      faq('', [['휴대폰으로도 들을 수 있나요?', 'PC와 휴대폰 모두에서 수강할 수 있고, 이어 보기 위치가 저장됩니다.'], ['모르는 문제는 어떻게 묻나요?', '강좌의 질문 게시판에 남기면 답변을 받을 수 있습니다.']]),
      cta('어떤 강좌부터\n들어야 할지 고민이라면', '학년과 목표를 남겨 주시면 맞는 강좌를 안내해 드립니다.', '문의하기')]],
    /* ───────── adult ───────── */
    ['t1-ad-license', '국가자격증 합격 아카데미', ['adult'], '이론 · 기출 · 모의고사를 시험 일정에 맞춘 자격증 과정', '#1D4ED8', 'official', '', '자격증 학원(합격 로드맵 · 학습 지원 · 과정 카드)', h => [
      ban(h, { eyebrow: 'LICENSE ACADEMY', title: '자격증 합격,\n계획부터 함께', sub: '이론 · 기출 · 모의고사를 시험 일정에 맞춰 배치하고, 진도와 성적을 기록으로 확인합니다.', cta: '과정 둘러보기', cta2: '수강 상담' }),
      T2a('timeline', { eyebrow: 'ROADMAP', title: '합격 로드맵', cols: [['기본 이론', '출제 범위 핵심 개념 정리'], ['기출 분석', '자주 나오는 유형과 함정 파악'], ['실전 모의고사', '시간 안에 푸는 연습'], ['최종 점검', '오답 노트로 약점 보완']] }),
      T2a('features', { eyebrow: 'SUPPORT', title: '학습 지원', cols: [['온라인 강의', 'PC · 휴대폰으로 반복 수강'], ['기출 해설', '문제별 풀이 영상과 해설'], ['질문 답변', '강좌 게시판에서 바로 질문'], ['수료증', '수료 기준 충족 시 발급']] }),
      cls('개설 과정', 'COURSES'),
      facts(),
      reviews('수강 후기'),
      faq('', [['비전공자도 들을 수 있나요?', '기본 이론 과정부터 시작하므로 처음 공부하는 분도 따라올 수 있습니다.'], ['시험 일정은 어디서 보나요?', '시험 일정과 접수 안내는 공지사항에서 확인할 수 있습니다.']]),
      cta('어떤 자격증부터\n시작할지 고민이라면', '목표와 일정을 알려 주시면 맞는 과정을 안내해 드립니다.', '수강 상담')]],
    ['t1-ad-civil', '공무원 · 고시 수험', ['adult'], '과목별 강의 · 주간 점검 · 실전 모의고사의 수험 루틴', '#9F1239', 'campus', '', '공무원 수험 학원(학습 단계 · 관리 · 강사진)', h => [
      ban(h, { eyebrow: 'EXAM PREP', title: '흔들리지 않는\n수험 루틴', sub: '과목별 기본 강의, 주간 학습 점검, 실전 모의고사로 긴 수험 기간을 꾸준히 이어 갑니다.', cta: '강좌 둘러보기', cta2: '학습 상담' }),
      T2a('steps', { eyebrow: 'STAGES', title: '학습 단계', cols: [['기본', '과목별 기본 개념 강의'], ['심화', '빈출 주제 깊이 있게'], ['문제 풀이', '단원별 문제와 해설'], ['실전 모의', '시험과 같은 환경에서 점검']] }),
      T2a('features', { eyebrow: 'CARE', title: '꾸준함을 돕는 장치', cols: [['주간 점검', '이번 주 진도와 복습 확인'], ['질문 답변', '강의별 질문 게시판'], ['모의고사 분석', '과목별 취약 영역 확인'], ['학습 기록', '수강 · 시험 기록 한눈에']] }),
      cls('개설 강좌', 'COURSES'),
      people('강사진'),
      reviews('수강 후기'),
      cta('수험 계획,\n혼자 세우지 마세요', '준비 기간과 직렬을 알려 주시면 맞는 강좌 순서를 안내해 드립니다.', '학습 상담')]],
    ['t1-ad-office', '직장인 실무 스킬', ['adult'], '엑셀 · 문서 · AI 도구를 업무 예제로 배우는 실무 강의', '#047857', 'clean', 'split', '성인 실무 강의 플랫폼(분야 카드 · 강좌 · 수료)', h => [
      ban(h, { eyebrow: 'WORK SKILLS', title: '퇴근 후 한 시간,\n내일 바로 쓰는 실무', sub: '엑셀 · 문서 작성 · AI 도구 활용을 실제 업무 예제로 배워 바로 적용합니다.', cta: '강의 둘러보기', cta2: '단체 수강 문의' }),
      T2a('features', { eyebrow: 'SKILLS', title: '배울 수 있는 실무', cols: [['엑셀 · 데이터', '함수 · 피벗 · 보고서 자동화'], ['문서 · 보고서', '읽히는 기획서와 보고서 쓰기'], ['발표 자료', '한 장에 핵심을 담는 슬라이드'], ['AI 도구', '업무에 바로 쓰는 생성형 AI']] }),
      facts(),
      cls('지금 수강할 수 있는 강의', 'COURSES'),
      T2a('steps', { eyebrow: 'HOW IT WORKS', title: '이렇게 배웁니다', cols: [['강의 선택', '필요한 업무 기술 고르기'], ['예제 실습', '실제 업무 파일로 따라 하기'], ['과제', '내 업무에 적용해 보기'], ['수료', '기준을 채우면 수료증 발급']] }),
      reviews('수강 후기'),
      faq('', [['팀 단위로 신청할 수 있나요?', '단체 수강은 문의해 주시면 인원과 일정에 맞춰 안내해 드립니다.'], ['실습 파일은 받을 수 있나요?', '강의 자료실에서 차시별 실습 파일을 내려받을 수 있습니다.']]),
      cta('우리 팀에 맞는\n실무 교육이 필요하다면', '업무 분야와 인원을 알려 주시면 맞는 강의를 안내해 드립니다.', '단체 문의')]],
    ['t1-ad-talk', '성인 영어회화 · 화상 수업', ['adult'], '레벨 진단 후 소규모 회화 · 화상 수업으로 말하는 시간 확보', '#C2410C', 'warm', 'split', '성인 회화 학원(레벨 진단 · 주제별 과정 · 화상 수업)', h => [
      ban(h, { eyebrow: 'SPEAKING CLUB', title: '머릿속 영어를\n입 밖으로', sub: '레벨 진단 후 소규모 회화 수업과 화상 수업으로 매주 말하는 시간을 확보합니다.', cta: '레벨 진단 신청', cta2: '수업 문의' }),
      T2a('steps', { eyebrow: 'START', title: '시작하는 방법', cols: [['레벨 진단', '말하기 수준 확인'], ['반 배정', '비슷한 레벨끼리 소규모'], ['회화 수업', '주제별 말하기 · 롤플레이'], ['피드백', '표현 · 발음 교정 기록']] }),
      T2a('features', { eyebrow: 'TOPICS', title: '목적별 과정', cols: [['일상 회화', '자연스러운 대화 표현'], ['비즈니스', '회의 · 이메일 · 발표'], ['여행', '상황별 필수 표현'], ['발음 교정', '억양과 발음 집중 연습']] }),
      cls('개강 수업', 'CLASSES'),
      reviews('수강 후기'),
      faq('', [['초보도 들을 수 있나요?', '레벨 진단 결과에 맞는 반을 안내하므로 처음 시작하는 분도 편하게 참여할 수 있습니다.'], ['화상 수업은 어떻게 참여하나요?', '수업 시간에 학습자 앱의 수업 화면에서 바로 입장합니다.']]),
      cta('내 영어 레벨,\n먼저 확인해 보세요', '목표와 가능한 시간대를 알려 주시면 맞는 수업을 안내해 드립니다.', '진단 문의')]],
    ['t1-ad-wellness', '요가 · 필라테스 지도자 과정', ['adult'], '해부학 · 동작 원리 · 티칭 실습의 지도자 양성', '#3F6212', 'warm', 'center', '요가 · 필라테스 지도자 과정(이론 → 실습 → 평가 · 강사진)', h => [
      ban(h, { eyebrow: 'INSTRUCTOR COURSE', title: '몸을 이해하고\n가르치는 사람으로', sub: '해부학 기초, 동작 원리, 티칭 실습으로 수업을 이끄는 지도자를 준비합니다.', cta: '과정 상담 신청', cta2: '문의하기' }),
      T2a('timeline', { eyebrow: 'CURRICULUM', title: '과정 구성', cols: [['이론', '해부학 · 호흡 · 동작 원리'], ['동작 실습', '기본 동작과 변형 익히기'], ['티칭 실습', '구령 · 시범 · 핸즈온 연습'], ['평가 · 수료', '시연 평가 후 수료']] }),
      T2a('features', { eyebrow: 'WHY US', title: '과정의 특징', cols: [['소규모 실습', '한 명 한 명 자세를 확인'], ['피드백', '티칭 실습마다 개별 피드백'], ['복습 영상', '배운 동작을 영상으로 다시'], ['수료증', '수료 기준 충족 시 발급']] }),
      cls('모집 중인 과정', 'COURSES'),
      people('지도 강사'),
      reviews('수료생 후기'),
      faq('', [['운동 경력이 없어도 되나요?', '과정마다 권장 경험이 다릅니다. 상담에서 지금 수련 경험을 듣고 맞는 과정을 안내합니다.'], ['수업을 빠지면 어떻게 하나요?', '복습 영상으로 다시 보고, 실습은 보강 일정을 안내해 드립니다.']]),
      cta('지도자의 길,\n상담으로 시작하세요', '수련 경험과 목표를 알려 주시면 맞는 과정을 안내해 드립니다.', '과정 상담')]],
    ['t1-ad-craft', '바리스타 · 제과제빵 실습', ['adult'], '이론 · 시연 · 실습 · 평가로 익히는 손기술', '#7C2D12', 'premium', 'split', '실습형 직업 · 취미 클래스(실습 순서 · 과정 · 후기)', h => [
      ban(h, { eyebrow: 'HANDS-ON CLASS', title: '손으로 익히는\n실전 기술', sub: '기초 이론부터 실습, 자격 시험 준비까지 — 현장에서 쓰는 기술을 직접 해 보며 배웁니다.', cta: '실습 과정 보기', cta2: '수강 상담' }),
      T2a('steps', { eyebrow: 'PRACTICE', title: '실습은 이렇게', cols: [['이론', '재료와 원리 이해'], ['시연', '강사의 시연 관찰'], ['실습', '직접 만들고 반복하기'], ['평가', '완성품 피드백']] }),
      T2a('features', { eyebrow: 'COURSES', title: '목적에 맞게 고르세요', cols: [['취미 클래스', '처음 배우는 분을 위한 기초'], ['자격 대비', '실기 시험 과제 집중 연습'], ['창업 기초', '메뉴 구성과 운영 기초'], ['수료증', '수료 기준 충족 시 발급']] }),
      cls('개설 과정', 'CLASSES'),
      reviews('수강 후기'),
      faq('', [['처음 배워도 따라갈 수 있나요?', '취미 · 기초 과정은 처음 배우는 분을 기준으로 진행합니다.'], ['실습 준비물이 있나요?', '과정별 준비물은 과정 안내와 공지사항에서 미리 알려 드립니다.']]),
      cta('나에게 맞는 과정,\n상담으로 찾으세요', '배우려는 목적을 알려 주시면 맞는 과정을 안내해 드립니다.', '수강 상담')]],
    ['t1-ad-creative', '디자인 · 영상 크리에이티브', ['adult'], '디자인 툴 · 영상 편집 · 브랜딩을 과제로 배우는 포트폴리오 과정', '#C026D3', 'premium', 'bg', '크리에이티브 스쿨(분야 · 과제 흐름 · 강사진)', h => [
      ban(h, { eyebrow: 'CREATIVE SCHOOL', title: '내 작업을\n포트폴리오로', sub: '디자인 툴 · 영상 편집 · 브랜딩을 과제 중심으로 배우고 결과물을 포트폴리오로 남깁니다.', cta: '과정 둘러보기', cta2: '상담 문의' }),
      T2a('features', { eyebrow: 'FIELDS', title: '배우는 분야', cols: [['그래픽 디자인', '레이아웃 · 타이포그래피'], ['영상 편집', '컷 편집 · 자막 · 색 보정'], ['브랜딩', '로고 · 브랜드 가이드'], ['UI 디자인', '화면 설계와 프로토타입']] }),
      T2a('steps', { eyebrow: 'WORKFLOW', title: '과제가 작품이 되기까지', cols: [['툴 기초', '필수 기능 익히기'], ['과제', '실제 의뢰처럼 작업'], ['피드백', '강사 코멘트로 다듬기'], ['포트폴리오', '완성작 정리 · 리뷰']] }),
      cls('모집 중인 과정', 'COURSES'),
      people('강사진'),
      reviews('수강 후기'),
      cta('어떤 분야부터\n시작할지 고민이라면', '관심 분야와 경험을 알려 주시면 맞는 과정을 안내해 드립니다.', '상담 문의')]],
    ['t1-ad-coach', '1인 코치 · 컨설턴트', ['adult'], '강의로 기본을 익히고 1:1 코칭으로 적용하는 프로그램', '#6D28D9', 'clean', 'center', '코치 · 컨설턴트 개인 사이트(프로그램 유형 · 진행 단계 · 소개)', h => [
      ban(h, { eyebrow: 'COACHING PROGRAM', title: '혼자 고민하던 문제,\n함께 풀어 갑니다', sub: '강의로 기본을 익히고 1:1 코칭으로 내 상황에 맞게 적용하는 프로그램입니다.', cta: '프로그램 보기', cta2: '코칭 문의' }),
      T2a('features', { eyebrow: 'PROGRAM', title: '프로그램 구성', cols: [['온라인 강의', '핵심 개념을 영상으로'], ['1:1 코칭', '내 상황에 맞춘 적용'], ['워크북', '실행을 돕는 과제와 양식'], ['커뮤니티', '함께하는 사람들과 나누기']] }),
      T2a('steps', { eyebrow: 'JOURNEY', title: '진행 단계', cols: [['사전 진단', '지금 상황과 목표 정리'], ['강의', '기본 개념과 도구 익히기'], ['코칭 세션', '내 사례로 함께 풀기'], ['실행 점검', '실천 결과 돌아보기']] }),
      people('코치 소개', 'COACH'),
      cls('프로그램', 'PROGRAMS'),
      reviews('참여 후기'),
      faq('', [['코칭은 어떻게 진행되나요?', '일정을 정해 화상 또는 대면으로 진행합니다. 방식은 프로그램 안내에서 확인할 수 있습니다.'], ['강의만 들을 수도 있나요?', '프로그램마다 구성이 다릅니다. 각 프로그램 안내를 확인하거나 문의해 주세요.']]),
      cta('내 상황에 맞는\n프로그램이 궁금하다면', '고민을 짧게 남겨 주시면 맞는 프로그램을 안내해 드립니다.', '코칭 문의')]],
    ['t1-ad-money', '재테크 · 금융 교양', ['adult'], '가계 · 금융 상품 · 세금 기초를 쉬운 말로 배우는 교양 강좌', '#0F5E7A', 'official', 'split', '성인 금융 교양 강좌(주제 · 수강 안내 · 유의 사항)', h => [
      ban(h, { eyebrow: 'MONEY CLASS', title: '돈 공부,\n기초부터 차근차근', sub: '가계 관리 · 금융 상품 이해 · 세금 기초를 쉬운 말로 배우는 성인 금융 교양 강좌입니다.', cta: '강좌 둘러보기', cta2: '문의하기' }),
      T2a('features', { eyebrow: 'TOPICS', title: '배우는 주제', cols: [['가계 관리', '수입 · 지출 정리와 예산'], ['금융 상품', '예금 · 펀드 · 보험의 기본 구조'], ['세금 기초', '연말정산과 생활 세금'], ['노후 준비', '연금의 종류와 준비 방법']] }),
      T2a('info', { eyebrow: 'GUIDE', title: '수강 안내', cols: [['수강 대상', '금융 기초를 배우고 싶은 성인 누구나'], ['강의 방식', '온라인 영상 강의 + 질문 게시판'], ['유의 사항', '특정 상품 가입을 권유하지 않는 교양 강좌입니다']] }),
      cls('개설 강좌', 'COURSES'),
      T2a('steps', { eyebrow: 'HOW TO', title: '수강 방법', cols: [['강좌 선택', '관심 주제 고르기'], ['영상 수강', 'PC · 휴대폰으로'], ['질문', '궁금한 점은 게시판에']] }),
      reviews('수강 후기'),
      cta('어떤 강좌부터\n들으면 좋을까요?', '관심 주제를 알려 주시면 맞는 강좌를 안내해 드립니다.', '문의하기')]],
    ['t1-ad-testprep', '어학 시험 대비', ['adult'], '유형별 강의 · 실전 모의고사 · 오답 분석의 시험 대비', '#DC2626', 'clean', 'bg', '어학 시험 대비 학원(시험별 바로가기 · 단계 · 강좌)', h => [
      ban(h, { eyebrow: 'TEST PREP', title: '목표 점수까지\n전략적으로', sub: '유형별 강의, 실전 모의고사, 오답 분석으로 시험 날짜에 맞춰 준비합니다.', cta: '강좌 둘러보기', cta2: '학습 상담' }),
      T2a('tiles', { eyebrow: 'TESTS', title: '시험별로 찾기', cols: [['읽기 · 듣기 시험', '유형별 문제 풀이'], ['말하기 시험', '답변 구조와 표현'], ['쓰기 시험', '논리 구조와 첨삭'], ['단기 완성', '시험 직전 집중 정리']] }),
      T2a('steps', { eyebrow: 'STRATEGY', title: '점수를 올리는 순서', cols: [['진단', '현재 점수와 약한 유형'], ['유형 학습', '유형별 풀이 전략'], ['실전 모의고사', '시간 관리 연습'], ['오답 분석', '틀린 이유 정리']] }),
      cls('지금 열린 강좌', 'COURSES'),
      facts(),
      reviews('수강 후기'),
      faq('', [['어떤 강좌부터 들어야 하나요?', '현재 점수와 목표 점수, 시험 날짜를 알려 주시면 순서를 안내해 드립니다.'], ['모의고사는 어떻게 보나요?', '강좌 안의 시험 메뉴에서 실전처럼 시간을 재고 풀 수 있습니다.']]),
      cta('시험 날짜에 맞춘\n학습 계획이 필요하다면', '목표 점수와 일정을 남겨 주시면 맞는 강좌를 안내해 드립니다.', '학습 상담')]]
  ];
  L.forEach(([id, name, types, scene, color, theme, hero, ref, mk]) => {
    if (TPL.some(t => t.id === id)) return;
    TPL.push({ id, name, types, scene, color, tone: { warm: '따뜻', kids: '친근', official: '신뢰', campus: '신뢰', premium: '모던', tech: '모던', clean: '모던', senior: '친근' }[theme] || '모던', look: LOOK[theme], ref, theme, hero, build: () => mk(hero), by: 't1' });
  });

  /* ── 템플릿 전용 장식: 테마 위에 얹는 짧은 CSS(대비에 영향 없는 배경 무늬 · 제목 장식) ── */
  const A = (T, a) => rgba(T.a, a);
  const DECO = {
    't1-k12-math': T => `.hp-hero.hp-b-light{background-image:linear-gradient(${A(T, .07)} 1px,transparent 1px),linear-gradient(90deg,${A(T, .07)} 1px,transparent 1px);background-size:28px 28px}.hp-sh h2{padding-left:16px;border-left:5px solid var(--a)}.hp-steps .hp-no{border-radius:8px}`,
    't1-k12-english': T => `.hp-hero .hp-hey{border-radius:16px 16px 16px 4px}.hp-feat .hp-card{border-top:4px solid var(--a)}.hp-feat .hp-card h3{letter-spacing:.01em}`,
    't1-k12-coding': T => `.hp-hero .hp-hey{font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em}.hp-hero .hp-hey::before{content:'>_';opacity:.8}.hp-sh .hp-ey{font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em}.hp-sh .hp-ey::before{content:'// '}`,
    't1-k12-art': T => `.hp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 12% 30%,rgba(250,204,21,.22) 0 70px,transparent 72px),radial-gradient(circle at 88% 22%,rgba(56,189,248,.2) 0 90px,transparent 92px),radial-gradient(circle at 80% 85%,${A(T, .14)} 0 60px,transparent 62px),radial-gradient(circle at 20% 88%,rgba(52,211,153,.18) 0 50px,transparent 52px);pointer-events:none}.hp-feat .hp-card{border:2px dashed ${A(T, .28)};box-shadow:none}`,
    't1-k12-music': T => `.hp-hero::before{content:'';position:absolute;left:0;right:0;top:34%;height:96px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.09) 0 1px,transparent 1px 24px);pointer-events:none}.hp-hero h1,.hp-sh h2{font-family:'Noto Serif KR','Nanum Myeongjo','Apple SD Gothic Neo',serif;font-weight:700}`,
    't1-k12-reading': T => `.hp-hero.hp-b-light{background-image:repeating-linear-gradient(180deg,transparent 0 35px,${A(T, .08)} 35px 36px)}.hp-sh h2{display:inline;background:linear-gradient(transparent 62%,${A(T, .14)} 62%)}`,
    't1-k12-science': T => `.hp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 8% 70%,${A(T, .14)} 0 26px,transparent 28px),radial-gradient(circle at 14% 40%,${A(T, .1)} 0 14px,transparent 16px),radial-gradient(circle at 92% 30%,rgba(16,185,129,.16) 0 34px,transparent 36px),radial-gradient(circle at 86% 62%,rgba(245,158,11,.16) 0 18px,transparent 20px);pointer-events:none}.hp-feat .hp-ic{border-radius:50%}`,
    't1-k12-tutor': T => `.hp-card{border-left:4px solid var(--a)}.hp-steps .hp-no{background:var(--a);color:var(--on)}`,
    't1-k12-studycare': T => `.hp-hero::before{content:'';position:absolute;left:50%;top:-40px;width:520px;height:340px;transform:translateX(-50%);background:radial-gradient(ellipse at top,rgba(251,191,36,.18),transparent 70%);pointer-events:none}.hp-info .hp-dl>div{border-left:3px solid var(--a)}`,
    't1-k12-sports': T => `.hp-hero::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 18px,transparent 18px 46px);pointer-events:none}.hp-hero h1{font-weight:900;letter-spacing:-.045em}.hp-sh h2{font-weight:900}`,
    't1-k12-kinder': T => `.hp-hero::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:26px;background:radial-gradient(circle at 18px 26px,var(--bg) 17px,transparent 18px) repeat-x;background-size:36px 26px;pointer-events:none}.hp-feat .hp-card{border-radius:28px 28px 28px 8px}`,
    't1-k12-retake': T => `.hp-hero::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 1px,transparent 1px 120px);pointer-events:none}.hp-tl .hp-tll li.on{box-shadow:inset 4px 0 0 var(--a)}`,
    't1-k12-online': T => `.hp-hero::before{content:'';position:absolute;right:6%;bottom:24px;width:280px;height:8px;border-radius:8px;background:linear-gradient(90deg,var(--a) 0 62%,rgba(255,255,255,.14) 62%);pointer-events:none}.hp-tiles .hp-tile{border-bottom:3px solid var(--a)}`,
    't1-ad-license': T => `.hp-hero::before{content:'';position:absolute;right:-60px;bottom:-80px;width:300px;height:300px;border-radius:50%;box-shadow:inset 0 0 0 14px rgba(255,255,255,.07),inset 0 0 0 34px rgba(255,255,255,.04);pointer-events:none}.hp-tll li.on{box-shadow:inset 4px 0 0 var(--a)}`,
    't1-ad-civil': T => `.hp-hero::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 60px,transparent 60px 120px);pointer-events:none}.hp-sh h2{letter-spacing:-.04em}`,
    't1-ad-office': T => `.hp-hero.hp-b-light{background-image:linear-gradient(${A(T, .06)} 1px,transparent 1px),linear-gradient(90deg,${A(T, .06)} 1px,transparent 1px);background-size:96px 32px}.hp-feat .hp-card{border-radius:6px}`,
    't1-ad-talk': T => `.hp-hero .hp-hey{border-radius:18px 18px 4px 18px}.hp-steps .hp-no{border-radius:14px 14px 4px 14px}`,
    't1-ad-wellness': T => `.hp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 380px 260px at 10% 20%,${A(T, .1)},transparent 70%),radial-gradient(ellipse 420px 300px at 92% 90%,rgba(234,179,8,.12),transparent 70%);pointer-events:none}.hp-sh h2{font-weight:700;letter-spacing:-.02em}`,
    't1-ad-craft': T => `.hp-hero.hp-b-light{background-image:repeating-linear-gradient(45deg,${A(T, .035)} 0 2px,transparent 2px 14px)}.hp-sh h2,.hp-hero h1{font-family:'Noto Serif KR','Nanum Myeongjo','Apple SD Gothic Neo',serif;font-weight:700}`,
    't1-ad-creative': T => `.hp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 18% 20%,${A(T, .3)},transparent 40%),radial-gradient(circle at 85% 80%,rgba(59,130,246,.22),transparent 45%);pointer-events:none}.hp-feat .hp-card{border-radius:4px}`,
    't1-ad-coach': T => `.hp-hero::before{content:'\\201C';position:absolute;left:50%;top:10px;transform:translateX(-50%);font-size:260px;line-height:1;font-family:Georgia,serif;color:${A(T, .08)};pointer-events:none}.hp-ppl .hp-av{border-radius:50%}`,
    't1-ad-money': T => `.hp-info .hp-dl>div{border-left:3px solid var(--a)}.hp-feat .hp-card{border-radius:10px}`,
    't1-ad-testprep': T => `.hp-hero::before{content:'';position:absolute;right:-90px;top:-90px;width:360px;height:360px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.1),inset 0 0 0 46px transparent,0 0 0 46px rgba(255,255,255,.04);pointer-events:none}.hp-tiles .hp-tile{border-top:3px solid var(--a)}`
  };
  /* ── 템플릿 전용 첫 화면 일러스트(테마 기본 일러스트 대신, 외부 이미지 없이 SVG) ── */
  const FONT = `font-family="Pretendard,'Apple SD Gothic Neo',sans-serif" font-weight="800"`;
  const ILLU = {
    't1-k12-art': (a, a2, a3, Y, M, P) => `<ellipse cx="240" cy="300" rx="210" ry="14" fill="${rgba(a, .1)}"/><g stroke="#3B2F2A" stroke-width="7" stroke-linecap="round"><path d="M282 236l-26 64M392 236l26 64M337 236v64"/></g><rect x="252" y="36" width="170" height="204" rx="10" fill="#fff" stroke="${a}" stroke-width="6"/><circle cx="300" cy="96" r="24" fill="${Y}"/><path d="M262 226c26-60 58-74 84-40 18-30 44-34 70 6v34H262z" fill="${M}"/><path d="M262 226c30-26 70-30 160-8v22H262z" fill="${a2}"/><path d="M50 214c-4-62 62-104 132-94 62 9 84 52 62 82-13 18-42 6-50 24-8 19 22 31 0 48-32 25-140 18-144-60z" fill="#F7E8D4" stroke="${a}" stroke-width="6" stroke-linejoin="round"/><circle cx="156" cy="246" r="15" fill="#fff" stroke="${a}" stroke-width="5"/><circle cx="96" cy="196" r="15" fill="${P}"/><circle cx="130" cy="162" r="15" fill="${Y}"/><circle cx="172" cy="150" r="14" fill="${M}"/><circle cx="206" cy="176" r="14" fill="${a}"/><g transform="rotate(32 214 110)"><rect x="207" y="26" width="15" height="112" rx="7" fill="#8B5E3C"/><rect x="205" y="136" width="19" height="16" fill="#CBD5E1"/><path d="M205 152h19l-9 34z" fill="${P}"/></g><path d="M440 60l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="${Y}"/><circle cx="40" cy="110" r="9" fill="${a2}"/>`,
    't1-k12-science': (a, a2, a3, Y, M, P) => `<ellipse cx="240" cy="300" rx="210" ry="14" fill="${rgba(a, .12)}"/><path d="M206 40h68v14h-8v70l62 118c9 18-4 38-24 38H176c-20 0-33-20-24-38l62-118V54h-8z" fill="#fff" stroke="${a}" stroke-width="7" stroke-linejoin="round"/><path d="M178 206h124l22 42c6 12-2 26-16 26H172c-14 0-22-14-16-26z" fill="${M}"/><circle cx="214" cy="236" r="9" fill="#fff" opacity=".8"/><circle cx="252" cy="250" r="6" fill="#fff" opacity=".8"/><circle cx="238" cy="178" r="8" fill="${a2}"/><circle cx="252" cy="148" r="5" fill="${a2}"/><g fill="none" stroke="${a}" stroke-width="5"><ellipse cx="388" cy="112" rx="62" ry="22"/><ellipse cx="388" cy="112" rx="62" ry="22" transform="rotate(60 388 112)"/><ellipse cx="388" cy="112" rx="62" ry="22" transform="rotate(-60 388 112)"/></g><circle cx="388" cy="112" r="11" fill="${P}"/><g><rect x="66" y="120" width="30" height="140" rx="15" fill="#fff" stroke="${a}" stroke-width="5"/><path d="M71 200h20v45a10 10 0 01-20 0z" fill="${Y}"/><rect x="112" y="150" width="30" height="110" rx="15" fill="#fff" stroke="${a}" stroke-width="5"/><path d="M117 214h20v31a10 10 0 01-20 0z" fill="${P}"/></g><path d="M420 230l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" fill="${Y}"/>`,
    't1-k12-sports': (a, a2, a3, Y, M, P) => `<ellipse cx="240" cy="300" rx="200" ry="12" fill="rgba(0,0,0,.25)"/><path d="M60 250c40-170 320-170 360 0" fill="none" stroke="${Y}" stroke-width="7" stroke-dasharray="2 14" stroke-linecap="round"/><path d="M190 40l40 90M290 40l-40 90" stroke="${P}" stroke-width="26"/><path d="M190 40l40 90" stroke="${a2}" stroke-width="10"/><circle cx="240" cy="168" r="58" fill="${Y}" stroke="#fff" stroke-width="6"/><path d="M240 132l10 22 24 3-18 16 5 24-21-12-21 12 5-24-18-16 24-3z" fill="#fff"/><circle cx="380" cy="236" r="46" fill="#fff"/><path d="M380 206l18 13-7 21h-22l-7-21z" fill="#1F2937"/><path d="M380 190v16M398 219l24-6M391 240l14 22M369 240l-14 22M362 219l-24-6" stroke="#1F2937" stroke-width="4"/><rect x="72" y="200" width="70" height="70" rx="18" fill="${M}"/><path d="M92 236l12 12 22-24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    't1-k12-reading': (a, a2, a3, Y, M, P) => `<ellipse cx="230" cy="300" rx="210" ry="14" fill="${rgba(a, .12)}"/><path d="M40 120c60-26 130-26 190 6v170c-60-30-130-30-190-6z" fill="#fff" stroke="${a}" stroke-width="6" stroke-linejoin="round"/><path d="M420 120c-60-26-130-26-190 6v170c60-30 130-30 190-6z" fill="${a3}" stroke="${a}" stroke-width="6" stroke-linejoin="round"/><path d="M70 160h120M70 186h120M70 212h96M268 160h120M268 186h120M268 212h90" stroke="${a2}" stroke-width="7" stroke-linecap="round"/><rect x="250" y="20" width="150" height="70" rx="20" fill="${Y}"/><path d="M290 88l-6 26 30-26z" fill="${Y}"/><circle cx="296" cy="56" r="7" fill="#5A4300"/><circle cx="325" cy="56" r="7" fill="#5A4300"/><circle cx="354" cy="56" r="7" fill="#5A4300"/><rect x="70" y="36" width="110" height="56" rx="18" fill="${M}"/><path d="M150 90l8 22-28-22z" fill="${M}"/><text x="125" y="72" text-anchor="middle" font-size="26" fill="#0B3B2E" ${FONT}>왜?</text><g transform="rotate(-28 440 230)"><rect x="432" y="150" width="16" height="110" rx="4" fill="${P}"/><path d="M432 260h16l-8 22z" fill="#2B1D14"/></g>`,
    't1-ad-talk': (a, a2, a3, Y, M, P) => `<ellipse cx="240" cy="300" rx="200" ry="14" fill="${rgba(a, .12)}"/><rect x="40" y="50" width="230" height="120" rx="34" fill="${a}"/><path d="M90 168l-14 42 52-42z" fill="${a}"/><text x="155" y="125" text-anchor="middle" font-size="46" fill="#fff" ${FONT}>Hello!</text><rect x="210" y="150" width="230" height="110" rx="34" fill="${Y}"/><path d="M390 258l16 36-54-36z" fill="${Y}"/><text x="325" y="218" text-anchor="middle" font-size="40" fill="#3D2A00" ${FONT}>Nice to…</text><g fill="none" stroke="${M}" stroke-width="7" stroke-linecap="round"><path d="M410 70a30 30 0 010 50"/><path d="M432 52a56 56 0 010 86"/></g><circle cx="60" cy="250" r="12" fill="${P}"/><circle cx="96" cy="270" r="7" fill="${a2}"/>`,
    't1-ad-wellness': (a, a2, a3, Y, M, P) => `<ellipse cx="240" cy="296" rx="210" ry="14" fill="${rgba(a, .12)}"/><circle cx="380" cy="80" r="40" fill="${Y}" opacity=".85"/><rect x="70" y="250" width="340" height="26" rx="13" fill="${a2}"/><g transform="translate(240 226)"><path d="M0 0c-30-20-40-70 0-110 40 40 30 90 0 110z" fill="${a}"/><path d="M0 0c-40-6-82-40-78-92 50 4 76 52 78 92z" fill="${mixc(a, '#ffffff', .3)}"/><path d="M0 0c40-6 82-40 78-92-50 4-76 52-78 92z" fill="${mixc(a, '#ffffff', .3)}"/><path d="M0 0c-56 6-110-14-122-58 52-14 98 16 122 58z" fill="${a2}"/><path d="M0 0c56 6 110-14 122-58-52-14-98 16-122 58z" fill="${a2}"/></g><path d="M90 120c20-30 50-30 60 0-20 6-40 6-60 0zM330 170c16-24 40-24 48 0-16 5-32 5-48 0z" fill="${M}"/>`,
    't1-k12-retake': (a, a2, a3, Y, M, P) => `<ellipse cx="240" cy="300" rx="200" ry="14" fill="rgba(0,0,0,.22)"/><rect x="70" y="50" width="250" height="230" rx="16" fill="#fff"/><rect x="70" y="50" width="250" height="52" rx="16" fill="${a3}"/><rect x="110" y="34" width="12" height="34" rx="6" fill="#1F2937"/><rect x="268" y="34" width="12" height="34" rx="6" fill="#1F2937"/>${[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => { const x = 90 + c * 46, y = 118 + r * 38, k = r * 5 + c; return k < 13 ? `<rect x="${x}" y="${y}" width="34" height="28" rx="6" fill="${M}"/><path d="M${x + 9} ${y + 14}l6 6 11-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : `<rect x="${x}" y="${y}" width="34" height="28" rx="6" fill="#EEF0F4"/>`; }).join('')).join('')}<circle cx="372" cy="180" r="74" fill="#fff"/><circle cx="372" cy="180" r="56" fill="${P}"/><circle cx="372" cy="180" r="38" fill="#fff"/><circle cx="372" cy="180" r="20" fill="${P}"/><path d="M372 180l70-70" stroke="#1F2937" stroke-width="6" stroke-linecap="round"/><path d="M430 104l22-6-6 22z" fill="#1F2937"/>`,
    't1-ad-money': (a, a2, a3, Y, M, P) => `<ellipse cx="240" cy="300" rx="210" ry="14" fill="${rgba(a, .12)}"/>${[0, 1, 2, 3].map(k => `<rect x="${250 + k * 48}" y="${220 - k * 44}" width="34" height="${70 + k * 44}" rx="6" fill="${k === 3 ? a : mixc(a, '#ffffff', .7 - k * .18)}"/>`).join('')}<path d="M240 190l70-40 50 20 80-90" stroke="${Y}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M420 70l28-6-8 28z" fill="${Y}"/>${[0, 1, 2, 3, 4].map(k => `<ellipse cx="130" cy="${262 - k * 24}" rx="70" ry="20" fill="${mixc(Y, '#B7791F', .45)}"/><ellipse cx="130" cy="${256 - k * 24}" rx="70" ry="20" fill="${Y}"/>`).join('')}<text x="130" y="168" text-anchor="middle" font-size="26" fill="#6B4A00" ${FONT}>₩</text>`
  };
  const decoOf = s => { const tp = s && s.tpl && TPL.find(t => t.id === s.tpl); if (!tp || !DECO[tp.id] || !s.theme || s.theme !== tp.theme || !window.HPT || !HPT.tokens) return ''; const T = HPT.tokens(s); return T ? DECO[tp.id](T) : ''; };
  const illuOf = s => { const f = ILLU[s.tpl]; const T = HPT.tokens(s); if (!f || !T) return ''; const a = T.a; return `<div class="hp-vis hp-illu hp-i-t1" aria-hidden="true"><svg viewBox="0 0 480 320" role="presentation">${f(a, mixc(a, '#ffffff', .55), mixc(a, '#ffffff', .85), '#FFC94D', '#4FD1B0', '#FF8A7A')}</svg></div>`; };
  const HERO_ILLU = /<div class="hp-vis hp-illu hp-i-\w+" aria-hidden="true"><svg viewBox="0 0 480 320" role="presentation">[\s\S]*?<\/svg><\/div>/;
  { const base = siteHTML; siteHTML = (s, full, lang) => { let h = base(s, full, lang); let c = '';
    try { c = decoOf(s); if (c && ILLU[s.tpl]) { const iv = illuOf(s); if (iv) h = h.replace(HERO_ILLU, () => iv); } } catch (e) { console.error('tpl-a deco', e); }
    return c ? h.replace('</style>', `/* tpl-a */${c}</style>`) : h; }; window.siteHTML = siteHTML; }
  window.TPLA = { ids: L.map(r => r[0]), deco: decoOf };
})();
