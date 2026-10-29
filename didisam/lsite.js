/* 디디쌤 스튜디오 v10 — 학습자 사이트 빌더(어드민 쪽)
   KIT AX ON(https://santanick.github.io/kit-axon/) 같은 학습자 사이트를 어드민에서 페이지 · 섹션 단위로 조립한다.
   - 데이터: S.lsite(페이지 · 섹션 · 룩 · 수준 · 유형 · 트랙 · 디지털북 · 거점) + S.tuts(튜토리얼)
   - 섹션은 어드민 데이터(과정 · 진단 · 배지 · 공지 · 튜토리얼)와 연결되어 자동으로 채워진다
   - 게시: lsSnapshot() → S.lsite.pub (학습자 화면 learner.html은 게시본만 읽는다, 미리보기는 초안)
   - 학습자 활동(LP): 학번별 진도 · 진단 · 튜토리얼 → lpApply()로 어드민 데이터(회원 · 과정 진도 · 진단 결과)에 반영 */
'use strict';

/* ── 유형별 프리셋 ── */
const LS_LEVELS = {
  univ: [['Explorer', '입문', '#D6246E', 'ChatGPT · Claude · Gemini로 내 유형의 첫 결과물을 만듭니다.'], ['Builder', '활용', '#3E63B8', '툴을 연결해 내 일을 대신해 주는 AI 비서를 만듭니다.'], ['Master', '심화', '#15173B', 'AI Agent와 전공 실무 툴로 기업 과제를 해결합니다.']],
  corp: [['입문', '기초', '#2563EB', '직무에 필요한 기본기를 익힙니다.'], ['실무', '활용', '#7C3AED', '실제 업무에 바로 적용합니다.'], ['리더', '심화', '#0F172A', '팀의 일하는 방식을 바꿉니다.']],
  k12: [['기초', '기초', '#16A34A', '개념을 탄탄하게 다집니다.'], ['심화', '심화', '#2563EB', '응용 문제로 실력을 키웁니다.'], ['최상위', '최상위', '#7C3AED', '고난도 문제로 완성합니다.']],
  adult: [['입문', '입문', '#E11D48', '처음 배우는 분도 따라옵니다.'], ['실무', '실무', '#2563EB', '현업 결과물을 만듭니다.'], ['전문가', '전문가', '#0F172A', '포트폴리오 · 자격으로 증명합니다.']],
  lifelong: [['입문', '입문', '#0EA5E9', '부담 없이 시작합니다.'], ['심화', '심화', '#16A34A', '조금 더 깊이 배웁니다.'], ['수료', '수료', '#7C3AED', '수료와 다음 배움을 잇습니다.']],
  voc: [['기초', '기초', '#0EA5E9', '훈련 기본 과정을 이수합니다.'], ['실무', '실무', '#2563EB', '현장 과제를 수행합니다.'], ['프로젝트', '프로젝트', '#0F172A', '취업 포트폴리오를 완성합니다.']]
};
const LS_TYPES = {
  univ: [['EYE', '관찰형', '#E63295', '이미지 · 디자인'], ['STORY', '표현형', '#7D5CB5', '영상 · 발표'], ['PEN', '기록형', '#4C77C5', '글 · 문서'], ['MAP', '설계형', '#3BA875', '기획 · 자동화'], ['LENS', '분석형', '#E8622A', '데이터 · 리서치']],
  corp: [['DATA', '데이터 분석', '#2563EB', '엑셀 · BI'], ['DOC', '문서 · 보고', '#0EA5E9', '보고서 · PPT'], ['PLAN', '기획 · 전략', '#7C3AED', '기획서 · 리서치'], ['MKT', '마케팅 · 영업', '#E11D48', '콘텐츠 · 제안'], ['AUTO', '업무 자동화', '#16A34A', 'AI 비서 · RPA']],
  k12: [['KOR', '국어', '#E11D48', '독해 · 문법'], ['ENG', '영어', '#2563EB', '어휘 · 독해'], ['MATH', '수학', '#7C3AED', '개념 · 문제풀이'], ['SCI', '과학', '#16A34A', '실험 · 탐구'], ['SOC', '사회', '#F59E0B', '시사 · 개념']],
  adult: [['OA', '오피스', '#16A34A', '엑셀 · 문서'], ['AI', '생성형 AI', '#7C3AED', '프롬프트 · 자동화'], ['DES', '디자인 · 영상', '#E11D48', '이미지 · 숏폼'], ['DEV', '코딩', '#2563EB', '웹 · 데이터'], ['CERT', '자격증', '#F59E0B', '필기 · 실기']],
  lifelong: [['DIG', '디지털 생활', '#0EA5E9', '스마트폰 · 키오스크'], ['HUM', '인문 · 교양', '#7C3AED', '역사 · 문학'], ['CARE', '복지 · 돌봄', '#16A34A', '사회복지 · 돌봄'], ['JOB', '창업 · 재취업', '#E11D48', '1인 창업 · 자격'], ['ART', '취미 · 예술', '#F59E0B', '음악 · 미술']],
  voc: [['WEB', '웹개발', '#2563EB', '프런트 · 백엔드'], ['FAC', '스마트공장', '#16A34A', '설비 · MES'], ['ELEC', '전기', '#F59E0B', '전기기능사'], ['DATA', '데이터', '#7C3AED', '분석 · 시각화'], ['AI', '직무 AI', '#E11D48', '현장 AI 활용']]
};
const LS_TRACKS = {
  univ: [['취업 코스', 'CAREER TRACK', '#2563EB', '희망 직무의 AI 활용 역량을 단계별로 쌓고, 포트폴리오와 배지로 증명합니다.', ['Explorer · 내 유형 첫 결과물', 'Builder · 직무 AI 비서', 'Master · 기업 과제 Agent'], '취업 코스 시작하기'], ['창업 코스', 'STARTUP TRACK', '#E11D48', '아이디어 검증부터 MVP · 피칭까지 AI로 빠르게 실행합니다.', ['Explorer · 아이디어 시각화', 'Builder · MVP 자동화', 'Master · 투자 피칭 Agent'], '창업 코스 시작하기']],
  corp: [['직무 역량 트랙', 'SKILL TRACK', '#2563EB', '부서 직무에 맞춘 AI · 데이터 활용 역량을 단계별로 키웁니다.', ['입문 · 업무 기본기', '실무 · 내 업무 자동화', '리더 · 팀 프로세스 혁신'], '직무 트랙 보기'], ['리더십 트랙', 'LEADERSHIP', '#7C3AED', '신임 팀장부터 조직 리더까지 단계별 리더십 과정입니다.', ['입문 · 셀프 리더십', '실무 · 팀 운영', '리더 · 조직 변화'], '리더십 트랙 보기']],
  k12: [['내신 대비', 'SCHOOL', '#16A34A', '학교 진도에 맞춰 개념 · 문제 · 오답을 관리합니다.', ['기초 · 개념 정리', '심화 · 유형 문제', '최상위 · 서술형'], '내신반 보기'], ['수능 대비', 'CSAT', '#2563EB', '수능 유형별 훈련과 실전 모의고사로 완성합니다.', ['기초 · 유형 이해', '심화 · 기출 분석', '최상위 · 실전 모의'], '수능반 보기']],
  adult: [['자격증 취득', 'LICENSE', '#F59E0B', '필기부터 실기까지 합격 일정에 맞춰 학습합니다.', ['입문 · 필기 개념', '실무 · 실기 연습', '전문가 · 모의 시험'], '자격증 과정 보기'], ['실무 포트폴리오', 'PORTFOLIO', '#7C3AED', '현업 결과물을 만들고 포트폴리오로 정리합니다.', ['입문 · 도구 익히기', '실무 · 프로젝트', '전문가 · 포트폴리오'], '실무 과정 보기']],
  lifelong: [['교양 · 취미', 'CULTURE', '#0EA5E9', '삶을 풍요롭게 하는 교양 · 취미 강좌입니다.', ['입문 · 첫 강좌', '심화 · 동아리', '수료 · 발표회'], '교양 강좌 보기'], ['재취업 · 창업', 'SECOND CAREER', '#E11D48', '자격 · 창업 준비로 새로운 일을 시작합니다.', ['입문 · 진로 탐색', '심화 · 자격 취득', '수료 · 창업 · 취업 연계'], '재취업 과정 보기']],
  voc: [['취업 트랙', 'JOB', '#2563EB', '국비 훈련과 현장 프로젝트로 취업까지 연결합니다.', ['기초 · 훈련 기본', '실무 · 현장 과제', '프로젝트 · 취업 포트폴리오'], '취업 트랙 보기'], ['자격증 트랙', 'LICENSE', '#F59E0B', '국가기술자격 필기 · 실기를 단계별로 준비합니다.', ['기초 · 필기 이론', '실무 · 실기 실습', '프로젝트 · 모의 시험'], '자격증 트랙 보기']]
};
const LS_STEPS = {
  univ: [['AI 진단', '5분 진단으로 내 AI 유형(관찰 · 표현 · 기록 · 설계 · 분석)을 확인합니다.', '5분'], ['내 코스 받기', '진단 결과에 맞는 Explorer 코스가 바로 열립니다.', '1분'], ['영상 보고 따라 하기', '15분 영상을 보며 오른쪽 3단계를 그대로 따라 합니다.', '15분'], ['제출 · 배지', '결과물을 제출하면 검수 후 디지털 배지가 발급됩니다.', '1주']],
  _: [['레벨 진단', '간단한 진단으로 지금 수준과 맞는 과정을 찾습니다.', '5분'], ['과정 선택', '추천 과정을 고르고 바로 시작합니다.', '1분'], ['영상 · 실습', '영상을 보며 3단계 실습을 따라 합니다.', '15분'], ['수료 · 배지', '과제를 제출하면 검수 후 수료 · 배지가 발급됩니다.', '1주']]
};
const LS_SEC = {
  hero: { n: '메인 배너', d: '큰 제목 · 버튼 · 숫자 · 대표 튜토리얼 영상' },
  progress: { n: '내 진행 현황', d: '로그인한 학습자의 수준 · 배지 · 다음 할 일(자동)' },
  steps: { n: '진행 순서', d: '처음 온 학습자에게 4단계로 안내' },
  tracks: { n: '코스 갈래(트랙)', d: '취업 · 창업 등 트랙 카드(콘텐츠 › 트랙)' },
  tutorials: { n: '튜토리얼', d: '왼쪽 영상 + 따라 할 3단계(학습 › 튜토리얼)' },
  diagtypes: { n: '진단 유형', d: '진단 결과 유형 카드 + 진단 시작(학습 › AI 진단)' },
  badges: { n: '배지', d: '수준별 디지털 배지(학습 › 배지)' },
  courseware: { n: '코스웨어 표', d: '수준 × 유형 과정 표(콘텐츠 › 코스웨어 표)' },
  books: { n: '디지털북', d: '수준별 교재 · 뷰어 링크(콘텐츠 › 디지털북)' },
  campus: { n: '캠퍼스 거점', d: '오프라인 라운지 · 진단 장소 안내' },
  notices: { n: '공지', d: '소통 › 공지의 최근 글(자동)' },
  cta: { n: '하단 행동 유도', d: '마지막 한 줄 + 버튼' },
  text: { n: '텍스트', d: '제목 + 본문' },
  faq: { n: '자주 묻는 질문', d: '질문 | 답 목록' }
};
const LS_MYB = [['profile', '프로필 · 유형'], ['next', '다음 할 일'], ['roadmap', '수준 로드맵'], ['badges', '배지 지갑'], ['courses', '내 과정 · 피드백 · 수료증'], ['tuts', '튜토리얼 기록'], ['diag', '진단 기록'], ['streak', '학습 달력'], ['notices', '내 과정 공지'], ['data', '내 기록 내려받기']];
const LS_PAGES = [['home', '홈', '공개'], ['diag', '진단', '공개'], ['tutorials', '튜토리얼', '공개'], ['courses', '코스웨어', '공개'], ['badges', '배지', '공개'], ['books', '디지털북', '공개'], ['notice', '공지사항', '공개'], ['my', '마이페이지', '로그인']];
const lsT = () => S.org.type;
const lsSec = (type, data = {}) => ({ id: uid('ls'), type, on: true, data });

function lsHeroText(ty) {
  const n = S.org.name;
  return {
    univ: ['AI 온라인 센터', '영상 한 편,\n15분이면\n내 첫 AI 작품', `${n} 학생이면 누구나 무료. 진단 → 영상 따라 하기 → 제출 → 디지털 배지까지 한 곳에서 이어집니다.`],
    corp: ['임직원 러닝 센터', '일하는 방식이\n달라지는\n15분 학습', `${n} 임직원을 위한 직무 · 법정 · 리더십 교육. 진단으로 시작해 수료증까지 한 곳에서 관리합니다.`],
    k12: ['온라인 학습관', '오늘 배운 것,\n오늘 끝내는\n복습 루틴', `${n} 수강생 전용. 영상 복습 · 과제 · 테스트 결과를 보호자와 함께 확인합니다.`],
    adult: ['온라인 캠퍼스', '퇴근 후 30분,\n결과물로 남는\n실무 강의', `${n}의 실무 강좌. 영상과 실습을 따라 하면 포트폴리오와 수료증이 쌓입니다.`],
    lifelong: ['평생학습 포털', '배움은\n언제나\n지금부터', `${n}의 강좌를 온라인으로 이어서 듣고, 수료 기록을 한 곳에서 확인합니다.`],
    voc: ['훈련생 학습관', '훈련부터\n취업까지\n한 번에', `${n} 훈련생 전용. 출결 · 실습 · 과제 · 자격 준비를 한 곳에서 이어갑니다.`]
  }[ty];
}
function lsDefault(ty) {
  const [eb, title, sub] = lsHeroText(ty); const univ = ty === 'univ';
  const steps = (LS_STEPS[ty] || LS_STEPS._).map(([h, d, tg]) => ({ h, d, tag: tg }));
  const P = {
    home: [lsSec('hero', { eyebrow: eb, title, sub, cta1: univ ? 'AI 진단 시작' : '레벨 진단 시작', cta2: '튜토리얼 먼저 둘러보기' }), lsSec('progress', { title: '나의 배지 여정' }),
      lsSec('steps', { eyebrow: 'HOW IT WORKS', title: '뭘 할지 고민하지 마세요.\n이 순서대로 하면 됩니다.', items: steps }),
      lsSec('tracks', { eyebrow: 'TWO TRACKS', title: univ ? '취업할까, 창업할까.\n코스는 두 갈래입니다.' : '목표에 맞는 두 갈래 트랙' }),
      lsSec('tutorials', { eyebrow: 'TUTORIALS', title: '왼쪽은 영상, 오른쪽은 따라 할 3단계.', n: 5 }),
      lsSec('diagtypes', { eyebrow: univ ? 'PRISM 5 TYPES' : 'DIAGNOSIS', title: univ ? '나는 어떤 AI 인재일까?' : '나에게 맞는 과정 찾기' }),
      lsSec('badges', { eyebrow: 'DIGITAL BADGES', title: '배지 하나가 ‘해 봤다’는 증거가 됩니다' }),
      lsSec('courseware', { eyebrow: 'COURSEWARE', title: univ ? '3단계 × 5유형, 15개 코스웨어' : '수준 × 분야별 과정' }),
      lsSec('books', { eyebrow: 'DIGITAL BOOK', title: '코스를 책으로도.' }),
      lsSec('campus', { eyebrow: 'ON CAMPUS', title: univ ? '캠퍼스 어디서든 진단하고, 온라인으로 이어서' : '오프라인에서도 이어서', items: [{ h: univ ? 'AI 라운지' : '학습 라운지', d: '상시 개방 · 진단 · 실습 지원' }, { h: '진단 키오스크', d: '로그인 없이 5분 진단' }, { h: '실습실', d: '노트북 · 태블릿 대여' }, { h: '상담 데스크', d: '코스 · 진로 상담' }] }),
      lsSec('notices', { eyebrow: 'NOTICE', title: '놓치면 안 되는 소식', n: 4 }),
      lsSec('cta', { title: univ ? '학과 맞춤 8문항 진단부터,\n오늘 만들 첫 결과물이 정해집니다.' : '5분 진단으로 오늘 시작할 과정을 찾으세요.', cta: univ ? 'AI 진단 시작하기' : '진단 시작하기' })],
    diag: [lsSec('diagtypes', { eyebrow: 'DIAGNOSIS', title: univ ? '5분이면 내 AI 유형이 나옵니다' : '5분 진단', sub: '진단 결과에 맞는 코스가 바로 열립니다.' }), lsSec('steps', { title: '진단 후에는', items: steps.slice(1) })],
    tutorials: [lsSec('tutorials', { eyebrow: 'TUTORIALS', title: '전체 튜토리얼', sub: '수준 · 유형으로 골라 보세요.', n: 99, filter: true })],
    courses: [lsSec('tracks', { eyebrow: 'TRACKS', title: '트랙' }), lsSec('courseware', { eyebrow: 'COURSEWARE', title: '전체 코스웨어' })],
    badges: [lsSec('badges', { eyebrow: 'DIGITAL BADGES', title: '디지털 배지', sub: 'Open Badge 형식으로 발급되어 링크로 공유할 수 있습니다.' }), lsSec('faq', { title: '배지 FAQ', items: [{ q: '배지는 어떻게 받나요?', a: '코스 과제를 제출하면 운영자 검수 후 자동 발급됩니다.' }, { q: '어디에 쓸 수 있나요?', a: '이력서 · 포트폴리오에 링크로 첨부할 수 있습니다.' }] })],
    books: [lsSec('books', { eyebrow: 'DIGITAL BOOK', title: '읽고, 따라 하고, 평가까지.', sub: '디지털북은 코스와 배지를 잇는 교재입니다.' })],
    notice: [lsSec('notices', { title: '공지사항', n: 30 })],
    my: []
  };
  const levels = (LS_LEVELS[ty] || LS_LEVELS.corp).map(([name, diff, color, goal], i) => ({ k: i, name: univ ? `${S.org.name.replace(/(대학교|대학)$/, '')} AI ${name}`.trim() : name, short: name.toUpperCase(), diff, color, goal }));
  const types = (LS_TYPES[ty] || LS_TYPES.corp).map(([k, name, color, d]) => ({ k, name, color, d }));
  const tracks = (LS_TRACKS[ty] || LS_TRACKS.corp).map(([name, eyebrow, color, desc, steps, cta]) => ({ id: uid('tr'), name, eyebrow, color, desc, steps, cta }));
  const dbooks = levels.map((l, i) => ({ id: uid('bk'), title: `${l.name} 디지털북`, level: i, units: types.map(x => `${x.name} 실습`), url: '', color: l.color }));
  return { v: 1, look: univ ? 'kit' : 'clean', brand: { short: (S.org.name.match(/[A-Za-z]+/) || [''])[0].slice(0, 6) || S.org.name.slice(0, 4) }, pages: LS_PAGES.map(([id, name, access]) => ({ id, name, on: !(id === 'books' && !univ), access, sections: P[id] })), levels, types, tracks, dbooks, grid: {}, my: { blocks: LS_MYB.map(([k]) => [k, true]) }, pub: null, pubAt: '' };
}
function lsSeedTuts(ty) {
  if (ty === 'univ' && typeof LSEED_UNIV_TUTS !== 'undefined') return LSEED_UNIV_TUTS.map(t => ({ id: 'tu' + t.id, title: t.title, ch: t.ch, tool: t.tool, level: t.lv - 1, type: t.type, yt: t.vid, steps: t.steps.slice(0, 3), mission: t.mission, badge: '', on: true, at: today() }));
  const T = (LS_TYPES[ty] || LS_TYPES.corp);
  return T.slice(0, 3).map(([k, name], i) => ({ id: uid('tu'), title: `${name} 첫 실습`, ch: '', tool: '', level: 0, type: k, yt: '', steps: ['영상을 보며 준비물을 확인합니다', '영상 속 예시를 그대로 따라 합니다', '내 주제로 바꿔 결과물을 저장합니다'], mission: `${name} 결과물 1건 완성`, badge: '', on: true, at: today() }));
}
/* 코스웨어 표 기본: 과정의 level(0~2) × 유형을 순서대로 채움 */
function lsGridAuto() { const L = S.lsite; const g = {}; S.classes.forEach((c, i) => { const lv = Math.min(L.levels.length - 1, c.level || 0); const ty = c.ctype || L.types[i % L.types.length].k; const key = lv + ':' + ty; if (!g[key]) g[key] = c.id; }); return g; }
function lsEnsure() {
  if (!S) return;
  if (!S.lsite || !S.lsite.pages) { S.lsite = lsDefault(lsT()); S.lsite.grid = lsGridAuto(); }
  if (!Array.isArray(S.tuts)) S.tuts = lsSeedTuts(lsT());
  if (!S.lsite.my) S.lsite.my = { blocks: LS_MYB.map(([k]) => [k, true]) };
}
/* 메뉴: 학습 › 튜토리얼, 운영 › 학습자 사이트, AI 진단은 모든 유형에서 켤 수 있게 */
MENU.tutorial = { label: '튜토리얼', ws: 'learn' };
MENU.lsite = { label: '학습자 사이트', ws: 'ops' };
delete MENU.diag.only;
Object.keys(PRESET).forEach(ty => { const P = PRESET[ty]; ['tutorial', 'lsite'].forEach(id => { if (!P.on.includes(id)) P.on.push(id); }); if (!P.on.includes('diag') && !P.off.includes('diag')) P.off.push('diag'); });
function navAdd(id, on) { const w = MENU[id].ws; S.nav.tabs[w] = S.nav.tabs[w] || []; if (!S.nav.tabs[w].some(t => t.id === id)) S.nav.tabs[w].push({ id, on }); }
{ const base = postSeed; postSeed = (...a) => { const r = base(...a); S.lsite = null; S.tuts = null; lsEnsure(); return r; }; }
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); if (S) { lsEnsure(); navAdd('tutorial', true); navAdd('lsite', true); navAdd('diag', lsT() === 'univ'); lpApply(); } return r; }; }

/* ── 게시본(학습자 화면이 읽는 공개 데이터) — 개인정보 · 접근코드 · 내부 메모 제외 ── */
function lsSnapshot() {
  lsEnsure(); const L = S.lsite;
  const items = c => (c.curriculum || []).slice(0, 60).map(it => ({ id: it.id, type: it.type, title: it.title, week: it.week || 0, yt: (it.yt && it.yt.id) || (typeof ytId === 'function' ? ytId(it.url || '') : '') || '', time: it.time || 0, desc: (it.desc || '').slice(0, 600), qs: (it.qs || []).slice(0, 30).map(q => ({ t: q.t, q: q.q, opts: q.opts || [], a: q.a, pts: q.pts })) }));
  const cls = S.classes.filter(c => c.status !== '종료').map(c => ({ id: c.id, name: c.name, level: c.level || 0, ctype: c.ctype || '', start: c.start, end: c.end, hours: c.hours || 0, thr: (c.criteria && c.criteria.threshold) || 80, desc: (c.desc || '').slice(0, 400), items: items(c) }));
  const notices = [...(S.notices || []).map(n => ({ title: n.title, at: n.at, pin: !!n.pin, body: (n.body || '').slice(0, 2000) })), ...S.classes.flatMap(c => (c.notices || []).map(n => ({ title: n.title, at: n.at, pin: !!n.pin, cls: c.name, body: (n.body || '').slice(0, 2000) })))].sort((a, b) => (b.pin - a.pin) || String(b.at).localeCompare(String(a.at))).slice(0, 40);
  const diags = (S.diags || []).filter(d => d.status !== '종료' && d.items && d.items.length).map(d => ({ id: d.id, name: d.name, mode: d.mode, items: d.items.map(q => ({ q: q.q, dim: q.dim, opts: q.opts || [], a: q.a, pts: q.pts, t: q.t })), outs: d.outs.map(o => ({ k: o.k, l: o.l, min: o.min || 0, rec: o.rec || '' })) }));
  const badges = (S.badges || []).filter(b => !b.special).map(b => ({ id: b.id || b.key, key: b.key, name: b.name, level: b.level ?? Math.max(0, (+b.key || 1) - 1), desc: b.desc || b.crit || '', fill: b.fill || '#4b3cff', ring: b.ring || '#ddd', cls: b.cls || '' }));
  return { v: 1, at: nowStr(), org: { name: S.org.name, type: S.org.type, short: L.brand.short || '' }, look: L.look, pages: L.pages.filter(p => p.on).map(p => ({ id: p.id, name: p.name, access: p.access, sections: p.sections.filter(s => s.on).map(s => ({ type: s.type, data: s.data })) })), levels: L.levels, types: L.types, tracks: L.tracks, dbooks: L.dbooks, grid: L.grid, tuts: (S.tuts || []).filter(t => t.on), my: L.my || null, classes: cls, diags, badges, notices, terms: { learner: t('learner'), cls: t('cls') } };
}

/* ── 학습자 활동(LP) → 어드민 데이터 반영 ── */
const lpKey = () => (typeof roomKey === 'function' && typeof DREG !== 'undefined' && DREG.cur() ? roomKey(DREG.cur()) : 'didisam.room.none') + '.lp';
function lpRead() { if (window.__LP) return window.__LP; try { return JSON.parse(localStorage.getItem(lpKey()) || '{}'); } catch (e) { return {}; } }
function lpApply() {
  if (!S) return 0; const LP = lpRead(); let n = 0; const univ = lsT() === 'univ';
  Object.entries(LP).forEach(([sid, p]) => {
    if (!/^[\w-]{4,20}$/.test(sid) || !p) return;
    let m = S.members.find(x => x.sid === sid || (univ && x.name === sid));
    if (!m) { const code = (S.codes || []).find(c => c.sid === sid); m = { id: uid('m'), name: univ ? sid : `학습자 ${sid}`, nick: '', email: '', phone: '', sid, group: S.groups[0]?.id || '', grade: '정회원', joined: today(), last: today(), extra: { 학번: sid, 학과: code?.dept || '' } }; S.members.push(m); }
    if (p.at) m.last = String(p.at).slice(0, 10);
    Object.entries(p.diag || {}).forEach(([dg, r]) => { const d = (S.diags || []).find(x => x.id === dg); if (d && r && r.out) { d.res = d.res || {}; d.res[m.id] = { out: r.out, score: r.score, at: r.at }; m.diag = r.out; n++; } });
    Object.entries(p.cls || {}).forEach(([cid, r]) => { const c = C(cid); if (!c || !r) return; if (!c.learners.includes(m.id)) c.learners.push(m.id); const tot = Math.max(1, (c.curriculum || []).length); const done = Object.values(r.items || {}).filter(x => x && x.done).length; c.prog[m.id] = { ...(c.prog[m.id] || { exam: null, assign: 'none', att: 0 }), p: Math.min(100, Math.round(done / tot * 100)) }; if (r.sub && r.sub.text && (c.prog[m.id].assign === 'none' || !c.prog[m.id].assign)) { c.prog[m.id].assign = 'submitted'; c.prog[m.id].sub = String(r.sub.text).slice(0, 4000); c.prog[m.id].subAt = String(r.sub.at || today()).slice(0, 10); } n++; });
    Object.entries(p.tut || {}).forEach(([tid, r]) => { const t = (S.tuts || []).find(x => x.id === tid); if (t && r) { t.stat = t.stat || {}; t.stat[m.id] = { w: r.w || 0, steps: (r.steps || []).filter(Boolean).length, mission: r.mission ? String(r.mission).slice(0, 2000) : '', at: r.at }; n++; } });
  });
  return n;
}
