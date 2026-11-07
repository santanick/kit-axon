/* v34.3 tpl-d — 템플릿 확장(요원 T4): ① siteFromTpl이 tp.theme · tp.hero · tp.deco를 반영 ② public(공공기관) 템플릿 18종 ③ 갤러리(v34 공통 틀)
   대표님(2026-11-08): "각 유형별로 15개씩 고를 수 있도록 확장해서 만들어 … 디자인 완성도 가장 높게"
   - 다른 요원(tpl-a~c)은 TPL.push({ …, theme, hero, deco })로 값만 넣는다. 적용은 이 파일이 한 곳에서 한다.
     theme: HPT 테마 id(clean · premium · warm · official · tech · kids · campus · senior) — 템플릿의 대표 색(tp.color)은 유지(hpColorLock)
     hero: 첫 화면 배치 center | split | bg → 첫 배너 data.hero
     deco: 템플릿 전용 짧은 CSS(테마가 그대로일 때만 미리보기 · 게시본 <style>에 덧붙임)
   - 템플릿을 고르면(tpl-use) 실제 데이터 보강(HPT.enrich: 숫자 · 강사 · FAQ) + 품질 자동 보정(hpwFix: 빈 섹션 숨김 · 자리 문구 · SEO)을 거친다.
   - 공공기관 템플릿 벤치마크: scratchpad/fix5/bench_public.md(지자체 교육원 · 직원 사이버 연수원 · 시민대학 · 디지털 배움터 · KRDS · 빌더 템플릿 — 구조만 참고)
   사실 원칙: 숫자는 HPT.facts만, 후기는 실제 후기만, 강사는 등록 강사만, 주소 · 전화는 설정값만(없으면 섹션이 숨겨짐), 운영 시간 · 기한 · 정원 같은 숫자 약속은 쓰지 않는다. */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function') return;
  const HOK = /^(center|split|bg)$/;
  const A = v => Array.isArray(v) ? v : [];
  const hasHPT = id => !!(window.HPT && typeof HPT.apply === 'function' && (typeof HPT.has === 'function' ? HPT.has(id) : true));

  /* ═════════ ① siteFromTpl 감싸기: 테마 · 첫 화면 배치 ═════════ */
  { const base = siteFromTpl; siteFromTpl = tp => { const s = base(tp);
    try {
      if (tp && tp.theme && hasHPT(tp.theme)) HPT.apply(s, tp.theme, { color: /^#[0-9a-f]{6}$/i.test(tp.color || '') ? tp.color : undefined });
      if (tp && tp.hero && HOK.test(tp.hero)) { const b = A(s.sections).find(x => x && x.type === 'banner'); if (b) { b.data = b.data || {}; b.data.hero = tp.hero; } }
    } catch (e) { console.error('tpl-d siteFromTpl', e); }
    return s; }; window.siteFromTpl = siteFromTpl; }
  /* 템플릿 전용 장식 CSS: 템플릿 테마가 그대로일 때만 */
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
    try { const tp = s && s.tpl ? TPL.find(t => t.id === s.tpl) : null; if (tp && tp.deco && (!tp.theme || s.theme === tp.theme)) return h.replace('</style>', String(tp.deco).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('tpl-d deco', e); }
    return h; }; window.siteHTML = siteHTML; }
  /* 시작할 때 실제 데이터 보강 + 품질 자동 보정 */
  function prep(s) { if (!s) return s; try { if (window.HPT && s.theme && typeof HPT.enrich === 'function') HPT.enrich(s); } catch (e) { console.error('tpl-d enrich', e); }
    try { if (typeof window.hpwFix === 'function') { const fx = window.hpwFix(s); if (fx && fx.site) { s = fx.site; s.tplFix = A(fx.log); } } } catch (e) { console.error('tpl-d fix', e); }
    return s; }
  const fromTpl = tp => prep(siteFromTpl(tp));

  /* ═════════ ② public(공공기관) 템플릿 ═════════ */
  const ft = () => (S.settings && S.settings.footer) || {};
  const org = () => (typeof spOrg === 'function' ? spOrg() : '') || S.org.name;
  const BN = d => S2('banner', d);
  const FEAT = (ey, title, cols, body) => T2('features', { eyebrow: ey, title, cols, ...(body ? { body } : {}) });
  const STEP = (ey, title, cols, body) => T2('steps', { eyebrow: ey, title, cols, ...(body ? { body } : {}) });
  const INFO = (ey, title, cols) => T2('info', { eyebrow: ey, title, cols });
  const TL = (ey, title, cols) => T2('timeline', { eyebrow: ey, title, cols });
  const FACTS = () => T2('stats', { hpt: 'facts', title: '', cols: [] });
  const CLS = (ey, title, sub) => S2('classes', { eyebrow: ey, title, ...(sub ? { sub } : {}), ids: pubCls(4), layout: 'grid' });
  const NT = (title, n) => S2('notices', { eyebrow: 'NOTICE', title, n: n || 4 });
  const RV = title => S2('reviews', { eyebrow: 'REVIEWS', title, note: '' });
  const MAP = title => S2('map', { eyebrow: 'CONTACT', title, addr: ft().addr || '', tel: ft().tel || '' });
  const CTA = (title, body, cta) => T2('cta', { eyebrow: 'CONTACT', title, body, cta, cols: [] });
  const P = (id, name, scene, theme, hero, color, ref, purpose, build, extra) => TPL.push(Object.assign({ id, name, types: ['public'], scene, color, tone: '신뢰', look: { official: 'publicTiles', campus: 'campus', tech: 'corpPortal', premium: 'navyGlow', senior: 'senior', warm: 'brandBold', kids: 'brandBold', clean: 'mintSoft' }[theme] || 'publicTiles', ref, theme, hero, purpose, build }, extra || {}));

  P('t4-hrd-inst', '공무원 인재개발원', '집합 · 이러닝 교육을 한 포털에서 신청 · 이수', 'official', '', '#1D4ED8', '지자체 공무원 교육원형 — 띠 배너 + 메뉴 바로가기, 교육 방식 갈래', ['apply', 'learn'], () => [
    BN({ eyebrow: 'HUMAN RESOURCES DEVELOPMENT', title: `${org()}\n인재개발 교육포털`, sub: '집합교육과 이러닝을 한곳에서 확인하고 신청합니다. 이수 실적은 교육이력에 바로 남습니다.', cta: '교육과정 보기', cta2: '교육 문의' }),
    FACTS(),
    FEAT('PROGRAMS', '교육 방식을 먼저 고르세요', [['집합교육', '기수별로 모여 배우는 실무 · 리더십 과정'], ['이러닝', '언제든 수강하는 직무 · 소양 과정'], ['법정의무교육', '해마다 이수해야 하는 필수 과정'], ['특별 과정', '현안 · 정책 과제 중심의 단기 과정']]),
    CLS('COURSES', '지금 신청할 수 있는 과정', '교육 대상과 기간을 확인하고 신청하세요.'),
    STEP('PROCESS', '교육 신청부터 이수까지', [['과정 확인', '교육 대상 · 기간 · 방식을 확인합니다'], ['신청', '로그인 후 과정을 신청합니다'], ['학습', '집합 · 온라인으로 수강합니다'], ['이수 확인', '교육이력에서 이수 실적을 확인합니다']]),
    NT('교육 공지'),
    CTA('교육 운영 문의', '과정 신청 · 이수 실적 · 수료증 관련 문의는 교육 담당 부서로 연락해 주세요.', '문의하기')], { deco: '.hp-hero h1{letter-spacing:-.04em}.hp-feat .hp-card{border-top:3px solid var(--a)}' });

  P('t4-cyber', '공공기관 사이버 연수원', '로그인 → 나의 강의실 → 이수 확인의 일직선 흐름', 'clean', 'split', '#3056D3', '직원 사이버 연수원형 — 나의 강의실 중심, 배정 과정 · 교육이력', ['learn'], () => [
    BN({ eyebrow: 'CYBER TRAINING CENTER', title: '배정된 교육,\n나의 강의실에서 바로', sub: '로그인하면 나에게 배정된 과정이 먼저 보입니다. 학습 진도와 이수 여부를 한 화면에서 확인하세요.', cta: '나의 강의실', cta2: '학습 지원' }),
    STEP('HOW IT WORKS', '이렇게 학습합니다', [['로그인', '기관 계정으로 로그인합니다'], ['배정 과정 확인', '나의 강의실에서 과정을 엽니다'], ['학습 · 평가', '영상 · 퀴즈 · 설문을 마칩니다'], ['교육이력', '이수 여부를 확인합니다']]),
    CLS('COURSES', '수강할 수 있는 과정'),
    FACTS(),
    FEAT('SUPPORT', '학습 지원', [['학습 환경', 'PC · 휴대폰 어디서나 수강'], ['이어 보기', '멈춘 곳부터 다시 재생'], ['수료증', '이수하면 바로 출력'], ['문의 게시판', '학습 중 막히면 질문']]),
    NT('학습 공지'),
    CTA('학습이 막히면 알려 주세요', '로그인 · 재생 · 이수 처리 문제는 학습 지원 창구에서 도와드립니다.', '학습 지원 문의')], { deco: '.hp-steps .hp-no{box-shadow:0 0 0 6px var(--as)}' });

  P('t4-legal', '법정의무교육 이수센터', '청렴 · 폭력예방 · 개인정보 등 필수 교육을 기한 안에', 'official', 'bg', '#334155', '공공기관 필수 교육 이수형 — 어두운 첫 화면, 이수 기준 안내표', ['learn'], () => [
    BN({ eyebrow: 'MANDATORY TRAINING', title: '올해 법정의무교육,\n기한 안에 마치세요', sub: '해마다 이수해야 하는 필수 교육을 온라인으로 수강하고, 이수 실적은 자동으로 기록됩니다.', cta: '미이수 과정 보기', cta2: '이수 기준' }),
    FEAT('REQUIRED', '이수해야 하는 교육', [['폭력예방 교육', '성희롱 · 성폭력 · 가정폭력 예방'], ['청렴 교육', '공직윤리 · 이해충돌 방지'], ['개인정보 보호', '개인정보 처리 · 유출 예방'], ['장애인 인식 개선', '함께 일하는 직장 만들기'], ['직장 내 괴롭힘 예방', '존중하는 조직 문화'], ['안전 교육', '재난 · 산업 안전 기본']]),
    INFO('GUIDE', '이수 기준', [['대상', '기관 소속 전 직원'], ['이수 인정', '과정별 수료 기준을 채우면 자동 인정'], ['증빙', '수료증 발급 · 교육이력 기록'], ['기한', '기관 공지에서 확인']]),
    CLS('COURSES', '올해 법정의무교육'),
    NT('마감 안내'),
    CTA('이수 실적 문의', '이수 처리 · 증빙 발급 문의는 교육 담당 부서로 연락해 주세요.', '문의하기')]);

  P('t4-newhire', '신규 임용자 기본교육', '첫 출근 전후 꼭 알아야 할 공직 기본기', 'campus', 'split', '#1F6F5C', '신규 임용자 입문 과정형 — 단계 로드맵, 선배 · 담당자 연결', ['learn'], () => [
    BN({ eyebrow: 'NEW EMPLOYEE', title: '공직의 첫걸음,\n기본기부터 차근차근', sub: '신규 임용자가 처음 맡는 업무와 공직 기본 소양을 순서대로 안내합니다.', cta: '기본교육 시작', cta2: '교육 안내' }),
    T2('roadmap', { eyebrow: 'ROADMAP', title: '두 단계로 익히는 기본교육', cols: [['공직 기본 소양', '공직 가치 · 복무 · 청렴 · 문서 작성 기초'], ['직무 기본', '소속 업무 이해 · 민원 응대 · 업무 시스템 실습']] }),
    FEAT('WHAT YOU LEARN', '배우는 내용', [['공직 가치', '공무원으로서의 책임과 자세'], ['복무 · 규정', '근무 · 휴가 · 보안 기본'], ['행정 문서', '보고서 · 공문 작성 실습'], ['업무 시스템', '전자결재 · 협업 도구']]),
    CLS('COURSES', '기본교육 과정'),
    NT('신규 임용자 안내'),
    CTA('처음이라 궁금한 점은', '교육 일정 · 수강 방법은 교육 담당자에게 문의하세요.', '문의하기')], { deco: '.hp-ey{letter-spacing:.24em}' });

  P('t4-ai-gov', 'AI 행정 · 디지털 전환 교육', '생성형 AI로 문서 · 민원 · 데이터 업무를 바꾸는 실습', 'tech', 'bg', '#0E7490', '공공 AI · 디지털 역량 과정형 — 어두운 격자 첫 화면, 수준 단계', ['learn', 'apply'], () => [
    BN({ eyebrow: 'AI FOR GOVERNMENT', title: '행정 업무에\n바로 쓰는 AI', sub: '보고서 초안 · 민원 답변 · 데이터 정리를 생성형 AI로 실습합니다. 기관 보안 기준을 지키는 사용법부터 배웁니다.', cta: 'AI 과정 보기', cta2: '수준 안내' }),
    TL('LEVELS', '수준별로 이어지는 과정', [['기초', 'AI 도구 이해 · 안전한 사용 원칙'], ['활용', '문서 · 보고서 · 민원 답변 실습'], ['심화', '데이터 분석 · 업무 자동화'], ['확산', '부서 업무 개선 과제']]),
    FEAT('PRACTICE', '실습으로 배우는 업무', [['문서 작성', '보고서 · 보도자료 초안'], ['민원 응대', '답변 초안 · 안내문 정리'], ['데이터 정리', '표 · 통계 요약'], ['보안 · 윤리', '개인정보 · 기밀 보호 원칙']]),
    CLS('COURSES', '모집 중인 AI 과정'),
    FACTS(),
    NT('AI 교육 소식'),
    CTA('부서 단위 교육이 필요하면', '부서 맞춤 실습 과정 개설은 교육 담당 부서에 문의해 주세요.', '교육 요청')]);

  P('t4-civic', '시민 교육 · 시민대학', '목적별 강좌 묶음과 온라인 수강 신청', 'campus', '', '#8A3B12', '지자체 시민대학형 — 목적별 강좌 묶음, 신청 창구 한 곳', ['apply'], () => [
    BN({ eyebrow: 'CITIZEN UNIVERSITY', title: `${org()}\n시민 누구나 배우는 학교`, sub: '교양 · 직무 · 지역 · 디지털 강좌를 목적에 맞게 골라 온라인으로 신청하세요.', cta: '강좌 신청하기', cta2: '수강 안내' }),
    FEAT('CATEGORY', '무엇을 배우고 싶으세요?', [['교양 · 인문', '역사 · 철학 · 문화'], ['직무 · 재도약', '새 일을 준비하는 실무'], ['우리 지역', '지역의 역사와 도시 이야기'], ['디지털 · AI', '생활 속 디지털 활용']]),
    CLS('COURSES', '이번 학기 강좌'),
    INFO('GUIDE', '수강 안내', [['대상', '시민 누구나(강좌별 자격 확인)'], ['신청', '온라인 신청 후 안내 문자 확인'], ['수강', '강의실 · 온라인 병행'], ['수료', '수료 기준을 채우면 수료증 발급']]),
    RV('수강생 이야기'),
    NT('공지사항'),
    MAP('오시는 길 · 문의')], { deco: '.hp-feat .hp-card{border-left:4px solid var(--a)}' });

  P('t4-digital', '시민 디지털 배움터', '큰 글씨 · 전화 신청 · 가까운 배움터', 'senior', 'split', '#B45309', '시민 디지털 역량 교육형 — 수준 단계, 전화 · 방문 · 온라인 신청', ['apply'], () => [
    BN({ eyebrow: '누구나 무료로 배우는', title: '스마트폰 · AI,\n가까운 곳에서 배워요', sub: '처음이어도 괜찮습니다. 큰 화면과 쉬운 설명으로 하나씩 따라 해 봅니다.', cta: '배울 강좌 고르기', cta2: '전화로 묻기' }),
    STEP('LEVELS', '내 수준에 맞게 시작해요', [['기초', '전원 켜기 · 글자 크게 · 전화 · 문자'], ['생활', '메신저 · 사진 · 지도 · 예약'], ['심화', '은행 앱 · 민원 서류 · 키오스크'], ['AI 체험', '말로 묻고 답 듣기']]),
    CLS('COURSES', '신청할 수 있는 강좌'),
    FEAT('HOW TO APPLY', '신청은 편한 방법으로', [['전화 신청', '안내 전화로 접수'], ['방문 신청', '가까운 배움터에서 접수'], ['온라인 신청', '홈페이지에서 바로 신청']]),
    NT('배움터 소식'),
    MAP('전화 · 방문 신청')]);

  P('t4-outreach', '찾아가는 교육 · 출장 강의', '기관 · 단체가 신청하면 교육이 찾아갑니다', 'warm', 'center', '#E0582E', '찾아가는 교육 신청형 — 가운데 첫 화면, 신청 4단계', ['apply'], () => [
    BN({ eyebrow: 'ON-SITE EDUCATION', title: '교육이 필요한 곳으로\n찾아갑니다', sub: '학교 · 복지관 · 마을 모임 등 단체가 신청하면 일정에 맞춰 강사가 방문합니다.', cta: '출장 교육 신청', cta2: '교육 주제 보기' }),
    STEP('PROCESS', '신청부터 교육까지', [['신청', '주제 · 희망 일정 · 인원 입력'], ['일정 조율', '담당자가 연락해 확정'], ['방문 교육', '강사가 현장에서 진행'], ['결과 안내', '참여 기록 · 만족도 공유']]),
    FEAT('TOPICS', '신청할 수 있는 주제', [['디지털 생활', '스마트폰 · 키오스크 · 앱 활용'], ['안전 · 건강', '생활 안전 · 응급 대응'], ['시민 역량', '소통 · 마을 활동'], ['맞춤 주제', '단체 요청에 맞춰 구성']]),
    CLS('COURSES', '운영 중인 교육'),
    RV('참여 기관 후기'),
    CTA('단체 교육을 계획 중이라면', '희망 주제와 일정을 남겨 주시면 담당자가 연락드립니다.', '신청 문의')], { deco: '.hp-hero{border-bottom:1px solid var(--as2)}' });

  P('t4-leader', '관리자 리더십 · 정책 역량', '관리자 · 간부 대상 정책 기획 · 조직 운영 과정', 'premium', 'bg', '#C8A15A', '간부 리더십 과정형 — 짙은 첫 화면 · 금빛 포인트, 모듈 구성', ['learn', 'brand'], () => [
    BN({ eyebrow: 'LEADERSHIP PROGRAM', title: '조직을 이끄는 힘,\n정책을 여는 생각', sub: '관리자 · 간부를 위한 정책 기획 · 조직 운영 · 소통 과정입니다. 사례 토의와 과제로 배웁니다.', cta: '과정 안내', cta2: '교육 문의' }),
    FEAT('MODULES', '과정 구성', [['정책 기획', '문제 정의 · 대안 설계'], ['조직 운영', '성과 관리 · 갈등 조정'], ['소통 · 협상', '이해관계자 설득'], ['데이터 의사결정', '근거 기반 판단']]),
    TL('FLOW', '진행 방식', [['사전 학습', '온라인 사례 읽기'], ['집합 토의', '사례 분석 · 그룹 토의'], ['현업 과제', '소속 기관 과제 수행'], ['성과 공유', '과제 발표 · 피드백']]),
    CLS('COURSES', '모집 중인 리더십 과정'),
    NT('과정 공지'),
    CTA('과정 추천이 필요하면', '직급 · 직무에 맞는 과정은 교육 담당 부서에서 안내해 드립니다.', '문의하기')]);

  P('t4-service', '민원 응대 · 친절 서비스 교육', '현장 민원 응대 · 갈등 대응 · 쉬운 안내문', 'clean', 'center', '#0F766E', '민원 서비스 역량 과정형 — 가운데 첫 화면, 상황별 카드', ['learn'], () => [
    BN({ eyebrow: 'PUBLIC SERVICE', title: '시민이 다시 찾고 싶은\n친절한 응대', sub: '전화 · 방문 · 온라인 민원 상황별로 응대 방법을 익히고, 어려운 상황에 대처하는 법을 연습합니다.', cta: '서비스 교육 보기', cta2: '상황별 안내' }),
    FEAT('SITUATIONS', '상황별로 배웁니다', [['전화 민원', '첫마디 · 확인 · 마무리'], ['방문 민원', '안내 · 대기 · 서류 확인'], ['온라인 민원', '답변 작성 · 쉬운 말'], ['갈등 상황', '감정 조절 · 보호 조치']]),
    CLS('COURSES', '민원 서비스 과정'),
    STEP('PRACTICE', '실습 흐름', [['사례 보기', '실제와 같은 상황 영상'], ['따라 하기', '응대 문장 연습'], ['피드백', '평가 · 개선점 확인']]),
    RV('교육 참여 후기'),
    NT('교육 공지'),
    CTA('부서 맞춤 교육 문의', '민원 부서 단위 교육은 교육 담당 부서로 신청해 주세요.', '문의하기')], { deco: '.hp-hero h1 em{text-decoration:underline;text-decoration-thickness:4px;text-underline-offset:8px;text-decoration-color:var(--as2)}' });

  P('t4-safety', '안전 · 재난 대응 교육', '재난 유형별 대응 · 현장 안전 · 훈련 기록', 'official', 'split', '#B91C1C', '공공 안전 교육형 — 밝은 좌우 첫 화면, 유형별 카드 · 행동 단계', ['learn'], () => [
    BN({ eyebrow: 'SAFETY & DISASTER', title: '위기 앞에서\n흔들리지 않도록', sub: '재난 유형별 대응 요령과 현장 안전 수칙을 배우고, 훈련 참여 기록을 남깁니다.', cta: '안전 교육 보기', cta2: '대응 요령' }),
    FEAT('TYPES', '유형별 대응 교육', [['자연 재난', '호우 · 태풍 · 지진'], ['사회 재난', '화재 · 감염병 · 정전'], ['현장 안전', '작업 · 시설 안전 수칙'], ['응급 처치', '심폐소생술 · 응급 대응']]),
    STEP('ACTION', '상황 발생 시 행동 순서', [['상황 인지', '위험 신호 확인'], ['전파 · 신고', '보고 체계에 따라 알림'], ['초기 대응', '대피 · 응급 조치'], ['복구 · 기록', '피해 확인 · 기록']]),
    CLS('COURSES', '안전 교육 과정'),
    NT('훈련 · 교육 공지'),
    CTA('안전 교육 문의', '부서 · 시설 단위 안전 교육 일정은 담당 부서와 협의합니다.', '문의하기')], { deco: '.hp-steps .hp-no{border-radius:8px}' });

  P('t4-integrity', '청렴 · 공직윤리 교육', '이해충돌 방지 · 청탁금지 · 사례 중심 학습', 'campus', 'center', '#1E3A8A', '공직윤리 과정형 — 가운데 첫 화면, 질문형 안내', ['learn'], () => [
    BN({ eyebrow: 'INTEGRITY', title: '신뢰받는 공직,\n작은 판단에서 시작합니다', sub: '이해충돌 · 청탁 · 선물처럼 헷갈리는 상황을 사례로 판단해 보고, 기준을 익힙니다.', cta: '청렴 교육 시작', cta2: '사례 보기' }),
    FEAT('THEMES', '다루는 주제', [['이해충돌 방지', '사적 이해관계 신고 · 회피'], ['청탁 · 금품', '받아도 되는 것과 안 되는 것'], ['공정한 업무', '정보 · 권한의 바른 사용'], ['신고 · 보호', '신고 방법과 신고자 보호']]),
    T2('info', { eyebrow: 'CHECK', title: '이런 상황, 어떻게 할까요?', cols: [['지인이 민원을 들고 오면?', '이해관계를 신고하고 다른 담당자에게 맡기는 기준을 배웁니다.'], ['감사 선물을 받았다면?', '받을 수 있는 범위와 돌려보내는 절차를 확인합니다.'], ['내부 정보를 물어 오면?', '공개 범위와 정보 보호 원칙을 사례로 익힙니다.']] }),
    CLS('COURSES', '청렴 교육 과정'),
    NT('청렴 소식'),
    CTA('청렴 상담 · 문의', '판단이 어려운 상황은 담당 부서와 먼저 상의하세요.', '문의하기')]);

  P('t4-youth', '청소년 · 청년 진로 교육', '지자체가 여는 진로 탐색 · 체험 프로그램', 'kids', 'center', '#7C3AED', '지자체 청소년 프로그램형 — 컬러풀 가운데 첫 화면, 체험 카드', ['apply'], () => [
    BN({ eyebrow: 'YOUTH PROGRAM', title: '하고 싶은 일,\n직접 해 보며 찾기', sub: '직업 체험 · 진로 상담 · 프로젝트 수업으로 나에게 맞는 길을 찾아봅니다.', cta: '프로그램 신청', cta2: '보호자 안내' }),
    FEAT('PROGRAMS', '이런 프로그램이 있어요', [['직업 체험', '현장 일을 직접 해 보기'], ['진로 상담', '관심사 · 강점 찾기'], ['프로젝트 수업', '팀으로 만들고 발표하기'], ['디지털 · AI', '코딩 · 영상 · AI 체험']]),
    CLS('COURSES', '모집 중인 프로그램'),
    STEP('HOW TO JOIN', '참여 방법', [['프로그램 고르기', '관심 분야 선택'], ['신청', '보호자 동의 후 신청'], ['참여', '정해진 날 참여'], ['기록', '활동 기록 · 수료']]),
    RV('참여 후기'),
    NT('모집 공지'),
    CTA('보호자 문의', '참여 대상 · 준비물은 담당자에게 문의해 주세요.', '문의하기')]);

  P('t4-family', '가족 · 부모 교육', '가족센터 · 지자체 부모 교육과 소모임', 'warm', 'split', '#BE185D', '가족 · 부모 교육형 — 따뜻한 좌우 첫 화면, 대상별 카드', ['apply'], () => [
    BN({ eyebrow: 'FAMILY EDUCATION', title: '함께 자라는 가족,\n함께 배우는 부모', sub: '자녀 시기별 부모 교육과 가족 프로그램을 온라인 · 현장에서 만나 보세요.', cta: '프로그램 보기', cta2: '신청 안내' }),
    FEAT('FOR WHOM', '대상별 프로그램', [['예비 · 초보 부모', '임신 · 영유아 돌봄'], ['학령기 부모', '학교생활 · 대화법'], ['청소년 자녀 부모', '진로 · 디지털 습관'], ['온 가족', '가족 소통 · 나들이 활동']]),
    CLS('COURSES', '신청할 수 있는 프로그램'),
    INFO('GUIDE', '참여 안내', [['대상', '지역 주민 가족(프로그램별 확인)'], ['신청', '온라인 신청 또는 방문 접수'], ['돌봄', '프로그램별 안내 확인'], ['문의', '담당자 안내']]),
    RV('참여 가족 이야기'),
    NT('가족 프로그램 소식'),
    MAP('찾아오시는 길')]);

  P('t4-green', '환경 · 탄소중립 시민 교육', '생활 실천 · 기후 이해 · 마을 활동가 양성', 'campus', 'split', '#15803D', '시민 환경 교육형 — 밝은 좌우 첫 화면, 실천 단계', ['apply', 'learn'], () => [
    BN({ eyebrow: 'GREEN CITIZEN', title: '오늘의 작은 실천이\n내일의 기후를 바꿉니다', sub: '기후 위기를 쉽게 이해하고 집 · 일터 · 마을에서 할 수 있는 실천을 배웁니다.', cta: '환경 교육 신청', cta2: '실천 안내' }),
    FEAT('LEARN', '배우는 내용', [['기후 이해', '탄소중립이 무엇인지'], ['생활 실천', '에너지 · 자원순환 · 식생활'], ['일터 실천', '사무실 · 현장 절약'], ['마을 활동', '실천 모임 · 활동가 과정']]),
    STEP('ACTION', '실천은 이렇게', [['배우기', '온라인 · 현장 강의'], ['실천하기', '생활 속 과제 수행'], ['나누기', '활동 기록 · 공유']]),
    CLS('COURSES', '모집 중인 교육'),
    NT('환경 교육 소식'),
    CTA('단체 환경 교육 문의', '학교 · 기관 · 마을 단위 교육을 신청할 수 있습니다.', '문의하기')], { deco: '.hp-feat .hp-ic{border-radius:50%}' });

  P('t4-data', '공공데이터 · 데이터 리터러시', '데이터 읽기 · 시각화 · 근거 기반 행정', 'tech', 'split', '#4F46E5', '데이터 역량 과정형 — 코드 창 일러스트, 수준별 트랙', ['learn'], () => [
    BN({ eyebrow: 'DATA LITERACY', title: '숫자로 말하는 행정,\n데이터로 시작하기', sub: '공공데이터를 찾고, 읽고, 표와 그림으로 정리해 보고서에 쓰는 법을 실습합니다.', cta: '데이터 과정 보기', cta2: '트랙 안내' }),
    TL('TRACKS', '수준별 트랙', [['읽기', '표 · 통계 바르게 읽기'], ['정리', '스프레드시트 · 정제'], ['시각화', '그래프 · 대시보드'], ['활용', '정책 보고서 · 근거 제시']]),
    FEAT('PRACTICE', '실습 과제', [['데이터 찾기', '개방 데이터 검색 · 내려받기'], ['데이터 정제', '빈칸 · 중복 정리'], ['보고서 작성', '숫자 근거로 쓰기'], ['개인정보 보호', '가명 처리 원칙']]),
    CLS('COURSES', '데이터 과정'),
    FACTS(),
    NT('과정 공지'),
    CTA('데이터 과제 상담', '부서 데이터 과제를 교육 과제로 가져오고 싶다면 문의해 주세요.', '문의하기')]);

  P('t4-newcomer', '외국인 주민 한국어 · 생활 교육', '한국어 · 생활 정보 · 정착 교육(다국어)', 'clean', 'split', '#0891B2', '외국인 주민 정착 교육형 — 다국어 페이지, 수준 단계', ['apply'], () => [
    BN({ eyebrow: 'WELCOME', title: '우리 동네에서\n한국어와 생활을 배워요', sub: '한국어 수업과 생활 정보 교육을 함께 운영합니다. 여러 언어로 안내를 볼 수 있습니다.', cta: '수업 신청', cta2: '수업 안내' }),
    STEP('LEVELS', '한국어 수준별 수업', [['입문', '한글 · 인사 · 숫자'], ['기초', '생활 표현 · 장보기'], ['중급', '병원 · 은행 · 관공서'], ['생활 정착', '일자리 · 자녀 학교']]),
    FEAT('LIFE', '생활 정보 교육', [['행정 서비스', '주민 등록 · 서류 발급'], ['건강 · 안전', '병원 이용 · 응급 연락'], ['일과 생활', '근로 · 주거 기본 정보'], ['이웃과 함께', '지역 행사 · 모임']]),
    CLS('COURSES', '신청할 수 있는 수업'),
    NT('공지사항'),
    MAP('찾아오시는 길')], { langs: ['ko', 'en', 'zh-CN', 'vi'] });

  P('t4-agency', '공공기관 직원 역량 포털', '공사 · 공단 직원의 직무 · 필수 · 자기계발 학습', 'official', 'center', '#2B4C9B', '공공기관 직원 학습 포털형 — 가운데 첫 화면, 학습 영역 · 이수 흐름', ['learn'], () => [
    BN({ eyebrow: 'EMPLOYEE LEARNING', title: `${org()}\n직원 역량 포털`, sub: '직무 · 필수 · 자기계발 교육을 한 곳에서 수강하고, 교육이력과 수료증을 바로 확인합니다.', cta: '나의 교육 보기', cta2: '교육 체계' }),
    FACTS(),
    FEAT('AREAS', '학습 영역', [['직무 교육', '부서 · 직무별 전문 과정'], ['필수 교육', '법정의무 · 기관 지정 과정'], ['리더십', '직급별 리더 과정'], ['자기계발', '외국어 · 디지털 · 교양']]),
    CLS('COURSES', '추천 과정'),
    STEP('FLOW', '교육 이수 흐름', [['과정 확인', '배정 · 추천 과정 확인'], ['수강', 'PC · 휴대폰 학습'], ['평가', '퀴즈 · 설문'], ['이력 반영', '교육이력 · 수료증']]),
    NT('교육 공지'),
    CTA('교육 운영 문의', '교육 배정 · 이수 처리 문의는 교육 담당 부서로 연락해 주세요.', '문의하기')], { deco: '.hp-cls .hp-cc{border-top:3px solid var(--a)}' });

  /* ═════════ ③ 갤러리(v34 공통 틀): 칩 · 검색 · 실제 축소 썸네일 · 오른쪽 시트 ═════════ */
  const PUR = [['apply', '모집 · 신청', /모집|신청|지원|체험|상담|예약|입학|등록|원서/], ['learn', '수강 · 이수', /이수|수강|강의실|학습|법정|필수|온보딩|연수|교과|과정/], ['info', '안내 · 소식', /안내|공지|소식|일정|센터|포털/], ['brand', '소개 · 브랜드', /브랜드|소개|아카데미|강사|스튜디오|크리에이터/]];
  const HERO_L = { center: '가운데 배치', split: '좌우 분할', bg: '어두운 배경' };
  const SEC_L = { banner: '첫 화면', classes: '강좌', books: '교재', reviews: '후기', notices: '공지', map: '오시는 길', video: '영상', image: '사진', slideImage: '사진', slideBanner: '소식', code: 'HTML' };
  const VAR_L = { features: '특징', steps: '절차', stats: '숫자', info: '안내', cta: '문의', timeline: '일정', tiles: '바로가기', profiles: '사람', roadmap: '로드맵', modules: '구성', story: '이야기', logos: '로고' };
  const secL = x => x.type === 'text' ? (x.data && x.data.hpt === 'facts' ? '숫자' : x.data && x.data.hpt === 'faq' ? 'FAQ' : VAR_L[x.data && x.data.variant] || '글') : SEC_L[x.type] || x.type;
  const thName = id => { const L = window.HPT && A(HPT.list); const x = L && L.find(t => t.id === id); return x ? x.name : ''; };
  const moodOf = tp => tp.theme && thName(tp.theme) ? tp.theme : 'base';
  const moodName = k => k === 'base' ? '기본 디자인' : thName(k);
  const META = new Map();
  function meta(tp) { let m = META.get(tp.id); if (m) return m; let secs = []; try { secs = A(tp.build()); } catch (e) { secs = []; }
    const bn = secs.find(x => x.type === 'banner'); const cta = bn && bn.data ? [bn.data.cta, bn.data.cta2].join(' ') : '';
    const pur = tp.purpose ? A([].concat(tp.purpose)) : PUR.filter(([, , re]) => re.test(`${tp.name} ${tp.scene || ''} ${cta}`)).map(x => x[0]);
    const tys = A(tp.types).map(k => (TYPES[k] || {}).name || k);
    m = { n: secs.length, secs: secs.map(secL), pur: pur.length ? pur : ['info'], q: [tp.name, tp.scene, tp.ref, tys.join(' '), moodName(moodOf(tp)), A(tp.langs).length > 1 ? '다국어' : ''].join(' ').toLowerCase(), tys };
    META.set(tp.id, m); return m; }
  const SITE = new Map();
  const siteOf = tp => { let s = SITE.get(tp.id); if (!s) { s = fromTpl(tp); SITE.set(tp.id, s); } return s; };
  const htmlOf = tp => { try { return siteHTML(siteOf(tp), false, 'ko'); } catch (e) { console.error('tpl-d thumb', e); return ''; } };
  const tyKey = () => S.org.type;
  function listOf() { const f = UI.tplF || 'mine'; const md = UI.tpdM || 'all', pu = UI.tpdP || 'all';
    const L0 = f === 'mine' ? tplFor(tyKey()) : f === 'all' ? TPL : TPL.filter(t => A(t.types).includes(f));
    return { L0, L: L0.filter(t => (md === 'all' || moodOf(t) === md) && (pu === 'all' || meta(t).pur.includes(pu))) }; }
  function gallery() {
    const f = UI.tplF || 'mine'; const { L0, L } = listOf(); const q = String(UI.tpdQ || '').trim().toLowerCase();
    const moods = [...new Set(L0.map(moodOf))]; const pc = k => L0.filter(t => meta(t).pur.includes(k)).length;
    const right = S.site && S.site.tpl ? `<button type="button" class="btn ghost" data-act="tpl-back">편집으로 돌아가기</button>` : '';
    const card = tp => { const m = meta(tp); const hide = q && !m.q.includes(q);
      return `<article class="tpd-c" role="button" tabindex="0" data-act="tpd-open" data-v="${esc(tp.id)}" data-q="${esc(m.q)}"${hide ? ' hidden' : ''} aria-label="${esc(tp.name)} 미리 보기">
        <div class="tpd-th" data-tp="${esc(tp.id)}" style="--c:${esc(tp.color || '#5C74F6')}"><iframe tabindex="-1" aria-hidden="true" title="" sandbox=""></iframe>${S.site && S.site.tpl === tp.id ? '<span class="tpd-now">사용 중</span>' : ''}</div>
        <div class="tpd-cb"><b>${esc(tp.name)}</b><small>${esc(tp.scene || '')}</small>
        <span class="tpd-tg"><i style="background:${esc(tp.color || '#5C74F6')}"></i>${esc(moodName(moodOf(tp)))}${tp.hero ? ` · ${esc(HERO_L[tp.hero] || '')}` : ''} · 섹션 ${m.n}${A(tp.langs).length > 1 ? ' · 다국어' : ''}</span></div></article>`; };
    return SL.page('홈페이지 템플릿', right,
      SL.note(ic('grid', 18), `${(TYPES[tyKey()] || {}).name || ''}에 맞는 템플릿 ${tplFor(tyKey()).length}종 · 전체 ${TPL.length}종`, '카드를 누르면 크게 보고 바로 시작합니다. 시작한 뒤 화면에서 바로 고치거나 말로 고칠 수 있습니다.') +
      SL.chips('tplF', [['mine', `내 유형 추천 ${tplFor(tyKey()).length}`], ['all', `전체 ${TPL.length}`], ...Object.entries(TYPES).filter(([k]) => k !== tyKey()).map(([k, v]) => [k, `${v.name} ${TPL.filter(t => A(t.types).includes(k)).length}`])], f) +
      `<div class="tpd-f">${SL.chips('tpdM', [['all', '분위기 전체'], ...moods.map(k => [k, `${moodName(k)} ${L0.filter(t => moodOf(t) === k).length}`])], UI.tpdM && moods.includes(UI.tpdM) ? UI.tpdM : 'all')}
      ${SL.chips('tpdP', [['all', '목적 전체'], ...PUR.filter(([k]) => pc(k)).map(([k, l]) => [k, `${l} ${pc(k)}`])], UI.tpdP || 'all')}</div>` +
      `<div class="sl-search tpd-q">${ic('search' in IC ? 'search' : 'spark', 16)}<input id="tpdQ" type="search" value="${esc(UI.tpdQ || '')}" placeholder="템플릿 이름 · 업종 · 분위기 검색" aria-label="템플릿 검색"></div>` +
      `<p class="tpd-cnt mini" aria-live="polite">${L.length}종</p><div class="tpd-g">${L.map(card).join('') || '<div class="sl-empty">조건에 맞는 템플릿이 없습니다.</div>'}</div>`);
  }
  /* 사이트 화면: 갤러리 모드면 공통 틀 갤러리(학습 페이지 탭은 그대로) */
  { const base = VIEWS.site; VIEWS.site = (...a) => { try { if (S && S.org && UI.smT !== 'learn' && (UI.siteGallery || !(S.site && S.site.tpl))) return gallery(); } catch (e) { console.error('tpl-d gallery', e); } return base(...a); }; }
  ACT['tpl-gallery'] = () => { UI.siteGallery = true; UI.smT = 'home'; SITE.clear(); if (typeof CUR !== 'undefined' && CUR.tab !== 'site') go('site'); else render(); scrollTo(0, 0); };
  { const base = ACT['sl-chip']; ACT['sl-chip'] = el => { if (el && /^(tplF|tpdM|tpdP)$/.test(el.dataset.k)) { if (el.dataset.k === 'tplF') { delete UI.tpdM; delete UI.tpdP; } } return base(el); }; }
  /* 검색: 다시 그리지 않고 카드만 거른다(썸네일 유지) */
  document.addEventListener('input', e => { const t = e.target; if (!t || t.id !== 'tpdQ') return; UI.tpdQ = t.value; const q = t.value.trim().toLowerCase(); let n = 0;
    document.querySelectorAll('.tpd-c').forEach(c => { const on = !q || String(c.dataset.q || '').includes(q); c.hidden = !on; if (on) n++; }); const cn = document.querySelector('.tpd-cnt'); if (cn) cn.textContent = `${n}종`; lazy(); });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('.tpd-c')) { e.preventDefault(); e.target.click(); } });
  /* 썸네일: 보이는 것만 그린다(지연 로딩) · 카드 폭에 맞춰 축소 */
  let IO = null;
  const fitTh = el => { const f = el.querySelector('iframe'); const w = el.clientWidth; if (f && w) f.style.transform = `scale(${w / 1280})`; };
  const load = el => { if (el.dataset.ok) return; const tp = TPL.find(t => t.id === el.dataset.tp); const f = el.querySelector('iframe'); if (!tp || !f) return; el.dataset.ok = 1; fitTh(el); f.srcdoc = htmlOf(tp); };
  function lazy() { const L = [...document.querySelectorAll('.tpd-th:not([data-ok])')]; if (!L.length) return;
    if (!('IntersectionObserver' in window)) { L.slice(0, 12).forEach(load); return; }
    if (!IO) IO = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { IO.unobserve(x.target); load(x.target); } }), { rootMargin: '320px 0px' });
    L.forEach(el => IO.observe(el)); }
  if (typeof AFTER !== 'undefined') AFTER.push(() => { if (!document.querySelector('.tpd-g')) return; document.querySelectorAll('.tpd-th[data-ok]').forEach(fitTh); lazy(); });
  addEventListener('resize', () => { document.querySelectorAll('.tpd-th[data-ok]').forEach(fitTh); fitPv(); });
  /* 오른쪽 시트: 큰 미리보기(PC · 휴대폰) + [이 템플릿으로 시작] */
  function fitPv() { const b = document.querySelector('#slSheet .tpd-pv'); if (!b) return; const f = b.querySelector('iframe'); const m = b.classList.contains('m'); const W = m ? 390 : 1280; const w = b.clientWidth; if (!f || !w) return;
    const k = Math.min(1, w / W); f.style.width = W + 'px'; f.style.height = (m ? 780 : 1500) + 'px'; f.style.transform = `scale(${k})`; b.style.height = Math.round((m ? 780 : 1500) * k) + 'px'; }
  ACT['tpd-open'] = el => { const tp = TPL.find(t => t.id === el.dataset.v); if (!tp) return; const m = meta(tp); const s = siteOf(tp);
    const live = A(s.sections).filter(x => !x.hide).map(secL);
    const w = SL.sheet(tp.name, `<div class="tpd-sh"><div class="sl-chips tpd-dev" role="tablist"><button type="button" role="tab" class="on" aria-selected="true" data-act="tpd-dev" data-v="pc">PC</button><button type="button" role="tab" aria-selected="false" data-act="tpd-dev" data-v="m">휴대폰</button></div>
      <div class="tpd-pv"><iframe title="${esc(tp.name)} 미리 보기" sandbox=""></iframe></div>
      <p class="tpd-sc">${esc(tp.scene || '')}</p>
      <dl class="tpd-dl"><div><dt>맞는 유형</dt><dd>${esc(m.tys.join(' · '))}</dd></div><div><dt>분위기</dt><dd><i style="background:${esc(tp.color || '#5C74F6')}"></i>${esc(moodName(moodOf(tp)))}${tp.hero ? ` · ${esc(HERO_L[tp.hero] || '')}` : ''}</dd></div>
      <div><dt>섹션 순서</dt><dd>${esc(live.join(' → '))}</dd></div>${tp.ref ? `<div><dt>구성 참고</dt><dd>${esc(tp.ref)}</dd></div>` : ''}${A(tp.langs).length > 1 ? `<div><dt>언어</dt><dd>${esc(tp.langs.map(l => (typeof langName === 'function' ? langName(l) : l)).join(' · '))}</dd></div>` : ''}</dl>
      <p class="mini">숫자 · 후기 · 강사 · 연락처는 우리 기관의 실제 데이터로만 채웁니다. 없는 섹션은 게시본에서 숨겨집니다.</p></div>`,
      `<button type="button" class="btn ghost" data-act="sl-close">닫기</button><button type="button" class="btn pri" data-act="tpd-use" data-v="${esc(tp.id)}">이 템플릿으로 시작</button>`);
    w.classList.add('tpd-sw'); const f = w.querySelector('.tpd-pv iframe'); f.srcdoc = htmlOf(tp); requestAnimationFrame(fitPv); setTimeout(fitPv, 260); };
  ACT['tpd-dev'] = el => { const b = document.querySelector('#slSheet .tpd-pv'); if (!b) return; b.classList.toggle('m', el.dataset.v === 'm'); el.parentElement.querySelectorAll('button').forEach(x => { const on = x === el; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); }); fitPv(); };
  /* 템플릿 적용(기존 tpl-use · 미리보기 창 포함): 실제 데이터 보강 + 품질 보정 */
  { const base = ACT['tpl-use']; ACT['tpl-use'] = el => { base(el); try { if (S.site && S.site.tpl === el.dataset.v) { const pub = S.site.published, at = S.site.at; S.site = prep(S.site); S.site.published = pub; S.site.at = at; save(); render(); } } catch (e) { console.error('tpl-d use', e); } }; }
  ACT['tpd-use'] = el => { if (typeof slClose === 'function') slClose(); UI.tpdQ = ''; ACT['tpl-use'](el); SITE.clear();
    setTimeout(() => { try { if (ACT['hpe-open'] && S.site && S.site.tpl) ACT['hpe-open']({ dataset: { v: 'home' } }); } catch (e) { console.error('tpl-d hpe', e); } }, 60); };

  /* ── AI 마법사 ① 테마 단계: '업종 템플릿에서 고르기' ── */
  function hookWiz() { const b = document.querySelector('#hpwBox'); if (!b || b.dataset.tpd) return; b.dataset.tpd = 1;
    const put = () => { const g = b.querySelector('.hpw-tg'); if (!g || b.querySelector('.tpd-wz')) return;
      g.insertAdjacentHTML('beforebegin', `<p class="tpd-wz"><span>업종에 맞춘 섹션 구성으로 시작하고 싶다면</span><button type="button" class="btn sm" data-act="tpd-wiz">${ic('grid', 14)} 업종 템플릿에서 고르기 · ${tplFor(tyKey()).length}종</button></p>`); };
    put(); new MutationObserver(put).observe(b, { childList: true }); }
  ACT['tpd-wiz'] = () => { if (window.HPW) HPW.st = null; closeModal(); UI.siteGallery = true; UI.smT = 'home'; SITE.clear(); go('site'); scrollTo(0, 0); };
  { const base = ACT['hpai-open']; if (base) ACT['hpai-open'] = (...a) => { const r = base(...a); hookWiz(); return r; }; }
  ['hpwOpen', 'hpOpen'].forEach(k => { const base = window[k]; if (typeof base === 'function') window[k] = (...a) => { const r = base(...a); hookWiz(); return r; }; });
  window.TPD = { prep, fromTpl, meta, gallery, purposes: PUR.map(([k, l]) => [k, l]) };
})();
