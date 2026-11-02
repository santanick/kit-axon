/* 디디쌤 스튜디오 v16 — AI SAM 가이드 센터 · 따라하기
   역할(운영 · 강사) × 기관 유형별 단계형 가이드 21종. 단계마다 [왜 · 어떻게] 설명 + 화면 열기 + 대상 강조 + AI에게 맡기기 + 자동 완료 확인.
   진행은 기관 상태(S.guides)에 저장되어 새로고침 · 다른 기기에서도 이어진다. 완료 조건은 데이터 변화(늘어남 · 줄어듦) · 화면 방문 · 동작 신호로 판단한다. */
'use strict';
/* ── 측정값 · 신호 ── */
const gdM = () => { const C = S.classes || []; const P = C.flatMap(c => Object.values(c.prog || {}));
  return { classes: C.length, running: C.filter(c => c.status === '운영중').length, learnersIn: C.reduce((s, c) => s + (c.learners || []).length, 0), members: (S.members || []).length, codes: (S.codes || []).length,
    pub: (S.lsite && S.lsite.pubAt) || '', autosOn: (S.autos || []).filter(a => a.on).length, autos: (S.autos || []).length, docs: (S.docs || []).length,
    answered: (S.tq || []).filter(x => x && x.st === 'answered').length, notices: C.reduce((s, c) => s + (c.notices || []).length, 0) + (S.notices || []).length, msgs: (S.msgs || []).length,
    graded: P.filter(p => p.assign === 'graded' || p.assign === 'returned').length, submitted: P.filter(p => p.assign === 'submitted').length, badges: (S.badges || []).reduce((s, b) => s + (b.issued || []).length, 0), certs: (S.certs || []).length,
    billsSent: (S.bills || []).filter(b => b.sent || b.status === '발송').length, unpaid: (S.bills || []).filter(b => b.status === '미납').length, refundOpen: (S.pays || []).filter(p => p.status === '환불 신청').length,
    hrd: ((S.hrd || {}).reports || []).length, diagAssigned: (S.members || []).filter(m => m.journey || m.jn).length, items: C.reduce((s, c) => s + (c.curriculum || []).length, 0),
    legalUndone: typeof legalUndone === 'function' ? legalUndone().length : 0, sites: S.site && S.site.published ? 1 : 0, books: (S.dbooks || S.books || []).length, ...(S.gsig || {}) }; };
function gdSig(k) { S.gsig = S.gsig || {}; S.gsig[k] = (S.gsig[k] || 0) + 1; save(); setTimeout(gdCheck, 60); }
{ const b = ACT['seg-report']; if (b) ACT['seg-report'] = el => { b(el); gdSig('report'); }; }
{ const b = ACT['lp-open']; if (b) ACT['lp-open'] = el => { b(el); gdSig('portal'); }; }
{ const b = ACT['kpi-csv']; if (b) ACT['kpi-csv'] = el => { b(el); gdSig('csv'); }; }
{ const b = chatSend; chatSend = (q, ...r) => { gdSig('chat'); return b(q, ...r); }; }

/* ── 가이드 정의 ──
   step: { t 제목, d 설명(왜 · 어떻게), go 열 화면('class' · 'settings:integr' · 'home'), sel 강조할 요소, ask AI에게 맡길 지시, done 완료 조건 } */
const L_ = () => t('learner'), C_ = () => t('cls'), G_ = () => t('group'), T_ = () => t('teacher');
const GUIDES = [
  { id: 'start', cat: '시작하기', role: 'admin', title: '첫날 세팅 15분', mins: 15, desc: () => `기관 정보부터 첫 ${C_()} 공개까지, 운영을 시작하는 최소 단계`, steps: [
    { t: '운영 현황 둘러보기', d: () => `현황 화면에서 ${L_()} · ${C_()} · 진도 지표가 어떻게 보이는지 확인합니다. 숫자는 데모 데이터이며 실제 운영에서는 자동 집계됩니다.`, go: 'dash', done: { visit: 'dash' } },
    { t: () => `${G_()} 구조 확인`, d: () => `${L_()}을 묶는 ${G_()}(예: ${S.groups && S.groups[0] ? S.groups[0].name : '1반'})이 맞는지 봅니다. 보고서 · 메시지 대상이 모두 이 묶음을 기준으로 나뉩니다.`, go: 'groups', done: { visit: 'groups' } },
    { t: () => `첫 ${C_()} 만들기`, d: () => `주제 · 대상 · 주차만 말하면 AI SAM이 커리큘럼 초안을 만듭니다. 계획 카드에서 '승인하고 실행'을 누르면 생성됩니다.`, go: 'class', ask: () => `${S.org.type === 'univ' ? '생성형 AI 활용 8주 교과목' : S.org.type === 'corp' || S.org.type === 'public' ? '생성형 AI 업무 활용 4주 과정' : '실무 엑셀 6회 강좌'} 설계해줘`, done: { inc: 'classes' } },
    { t: () => `${L_()} 등록 · 접근코드 발급`, d: () => `엑셀 일괄 등록 또는 초대로 ${L_()}을 넣고, 수강 관리에서 접근코드를 발급합니다. 학습자는 번호 + 접근코드로 포털에 로그인합니다(이름 · 연락처는 저장하지 않음).`, go: 'enroll', sel: '[data-act="en-codes"]', done: { inc: 'codes' } },
    { t: '학습자 포털 게시', d: '학습자 사이트 화면에서 메뉴 · 첫 화면을 확인하고 \'게시\'를 누르면 포털에 반영됩니다. 고칠 때마다 다시 게시합니다.', go: 'lsite', sel: '[data-act="ls-pub"]', done: { changed: 'pub' } },
    { t: '포털을 학습자 눈으로 확인', d: '오른쪽 위 계정 메뉴 › 학습자 — 학습자 포털을 누르면 새 창에서 체험 계정으로 로그인해 볼 수 있습니다.', sel: '.acm summary', done: { inc: 'portal' } },
    { t: '개강 공지 보내기', d: () => `${C_()} 화면의 공지에서 개강 안내를 등록합니다. AI SAM에게 맡기면 초안을 만들어 승인 후 등록합니다.`, ask: () => `첫 ${C_()} 개강 공지 써줘`, done: { inc: 'notices' } }] },
  { id: 'course', cat: '과정', role: 'admin', title: () => `AI로 ${C_()} 하나 완성하기`, mins: 20, desc: () => `설계 → 콘텐츠 채우기 → 평가 기준 → 공개 범위 · 수강생 배정까지`, steps: [
    { t: '주제와 대상 정하기', d: '좋은 지시 = 주제 + 대상 + 기간 + 결과물. 예: "신입사원 대상 생성형 AI 업무 활용 4주, 매주 실습 과제 포함".', ask: () => `신규 ${L_()} 대상 생성형 AI 활용 4주 ${C_()} 설계해줘`, done: { inc: 'classes' } },
    { t: '커리큘럼 확인 · 다듬기', d: '주차 격자에서 제목을 바로 고치고, 필요 없는 항목은 지웁니다. 항목을 누르면 편집기가 열립니다.', go: 'class', done: { visit: 'class' } },
    { t: '빈 항목 AI로 채우기', d: '영상 · 강의자료 · 퀴즈 · 과제 루브릭이 비어 있으면 \'AI로 콘텐츠 채우기\' 한 번으로 초안을 넣습니다. 영상은 후보 중에서 골라 확인하세요.', go: 'class', sel: '[data-act="ai-fill"]', ask: '빈 항목 AI로 채워줘', done: { inc: 'items' } },
    { t: '이수 기준 정하기', d: '설정 탭에서 동영상 · 시험 · 과제 비율과 이수 점수를 정합니다(합계 100%). 법정교육은 100% 수강이 기준입니다.', go: 'class', done: { visit: 'class' } },
    { t: () => `${L_()} 배정 · 공개`, d: () => `수강 권한을 ${G_()} 단위로 주고 상태를 운영중으로 바꿉니다. 공개하면 학습자 포털 '${C_()}' 메뉴에 나타납니다.`, go: 'class', sel: '[data-act="cls-grant"]', done: { inc: 'learnersIn' } }] },
  { id: 'learners', cat: '학습자', role: 'admin', title: () => `${L_()} 일괄 등록 · 로그인 안내`, mins: 10, desc: '엑셀 한 장으로 등록하고 접근코드 안내까지', steps: [
    { t: '엑셀 양식 내려받기', d: () => `${L_()} 화면의 '일괄 등록'에서 양식을 받습니다. 대학은 학번 · 학과, 기업은 사번 · 부서처럼 번호와 ${G_()}만 넣습니다.`, go: 'members', sel: '[data-act="mem-bulk"]', done: { visit: 'members' } },
    { t: '파일 올리기 · 확인', d: '이름 · 연락처 열이 있어도 저장하지 않고 번호 · 소속만 남깁니다. 업로드 결과 줄에서 몇 명이 들어왔는지 확인합니다.', go: 'members', done: { inc: 'members' } },
    { t: '접근코드 발급', d: '수강 관리에서 접근코드를 한 번에 발급합니다. 코드는 학습자별로 다르고, 서버에는 해시로만 저장됩니다.', go: 'enroll', sel: '[data-act="en-codes"]', done: { inc: 'codes' } },
    { t: '로그인 안내 보내기', d: '메시지에서 \'포털 주소 + 번호 + 접근코드\' 안내를 보냅니다. AI SAM이 문안을 만들고 승인 후 발송합니다.', ask: () => `${L_()}에게 학습자 포털 로그인 안내 메시지 보내줘`, done: { inc: 'msgs' } }] },
  { id: 'grade', cat: '평가', role: 'admin', title: '과제 · 퀴즈 채점 루틴', mins: 10, desc: 'AI 채점 초안 → 검수 → 피드백 · 재제출', steps: [
    { t: '채점 대기 확인', d: '평가 화면에서 제출 순으로 쌓인 과제를 봅니다. 오래된 것부터 처리합니다.', go: 'assess', done: { visit: 'assess' } },
    { t: 'AI 채점 초안 받기', d: '루브릭 기준별로 AI가 점수와 근거를 제안합니다. 점수는 확정 전까지 바뀌지 않습니다.', go: 'assess', sel: '[data-act="ai-grade-all"]', ask: '채점 대기 과제 AI로 1차 채점해줘', done: { inc: 'graded' } },
    { t: '피드백 · 재제출 요청', d: '부족한 기준은 구체적으로 적어 재제출을 요청합니다. 학습자 포털 · AI 튜터에 바로 나타나 해설까지 이어집니다.', go: 'assess', done: { inc: 'graded' } }] },
  { id: 'nudge', cat: '운영', role: 'admin', title: '진도 부진 독려 자동화', mins: 8, desc: '대상 찾기 → 메시지 → 매주 자동 실행', steps: [
    { t: '부진 대상 찾기', d: () => `"진도 30% 미만 ${L_()} 찾아줘"라고 하면 ${C_()}별 명단을 표로 보여 줍니다.`, ask: () => `진도 30% 미만 ${L_()} 찾아줘`, done: { inc: 'chat' } },
    { t: '독려 메시지 보내기', d: '문안을 확인하고 승인하면 발송됩니다. 너무 자주 보내지 않도록 주 1회를 권합니다.', ask: () => `진도 30% 미만 ${L_()}에게 독려 메시지 보내줘`, done: { inc: 'msgs' } },
    { t: '자동화 레시피 켜기', d: '같은 일을 매주 반복하려면 자동화 화면에서 \'진도 부진 독려\' 레시피를 켭니다. 승인 필요 여부도 정할 수 있습니다.', go: 'auto', done: { inc: 'autosOn' } }] },
  { id: 'report', cat: '운영', role: 'admin', title: '실적 보고서 내기', mins: 5, desc: () => ({ corp: '부서별 이수 현황', univ: '사업단 운영 실적', public: '결재용 교육 실적' })[S.org.type] || '교육 운영 현황 보고', steps: [
    { t: '현황 확인', d: '현황 화면의 지표와 목표선을 먼저 봅니다. 숫자가 이상하면 보고서 전에 데이터부터 바로잡습니다.', go: 'dash', done: { visit: 'dash' } },
    { t: '보고서 내려받기', d: '현황 머리의 보고서 버튼을 누르면 한글 · Word에서 열리는 문서가 내려받아집니다(요약 · 묶음별 · 과정별 · 특이사항).', go: 'dash', sel: '[data-act="seg-report"]', done: { inc: 'report' } },
    { t: '문서함에서 다듬기(선택)', d: '표준 문서함의 결과 보고 서식으로 옮겨 AI로 문장을 다듬고 PDF로 저장할 수 있습니다.', go: 'docs', done: { visit: 'docs' } }] },
  { id: 'mcp', cat: 'AI 연결', role: 'admin', title: '외부 AI 연결(MCP) · API 키', mins: 7, desc: 'Claude · ChatGPT · 사내 에이전트가 우리 데이터로 일하게', steps: [
    { t: '연동 화면 열기', d: '설정 › 연동 맨 위 \'AI 연결(MCP) · API 키\' 카드입니다. 정운영자만 발급할 수 있습니다.', go: 'settings:integr', sel: '#mcpCard', done: { visit: 'settings:integr' } },
    { t: '키 이름 · 권한 정하기', d: '어디에 쓰는지 이름을 붙입니다(예: 교학팀 Claude). 조회만 하면 읽기 전용, 질문 답변 · 공지 · 과정 초안까지 맡기려면 읽기 + 쓰기.', go: 'settings:integr', sel: '#mcpName', done: { inc: 'key' } },
    { t: '키 · 설정 복사', d: '발급 창에서 키는 한 번만 보입니다. 쓰는 AI 앱에 맞는 설정(Claude Code · 데스크톱 · 원격 MCP)을 복사합니다.', go: 'settings:integr', done: { inc: 'copy' } },
    { t: 'AI 앱에 등록 · 연결 시험', d: 'AI 앱 설정에 붙여 넣고 "디디쌤에서 운영 현황 요약해줘"라고 지시합니다. 연결 시험(curl)으로도 확인할 수 있습니다.', done: { manual: 1 } },
    { t: '정책 · 폐기 확인', d: '데이터룸 정책에서 외부 AI 연결을 끄면 모든 키가 즉시 막힙니다. 쓰지 않는 키는 목록에서 폐기합니다. 쓰기 호출은 감사 기록에 남습니다.', go: 'settings:integr', done: { manual: 1 } }] },
  { id: 'site', cat: '시작하기', role: 'admin', title: '학습자 포털 꾸미기 · 게시', mins: 10, desc: '메뉴 · 첫 화면 · 마이페이지 블록 → 게시 → 확인', steps: [
    { t: '학습자 사이트 열기', d: '유형에 맞게 메뉴 이름이 이미 정해져 있습니다. 쓰지 않는 메뉴는 끄고 순서를 바꿉니다.', go: 'lsite', done: { visit: 'lsite' } },
    { t: '첫 화면 문구 고치기', d: '섹션 편집에서 제목 · 설명 · 버튼을 바꿉니다. 기관 공식 로고는 설정 › 홈페이지에서 넣습니다.', go: 'lsite', done: { visit: 'lsite' } },
    { t: '게시', d: '게시해야 학습자 포털에 반영됩니다.', go: 'lsite', sel: '[data-act="ls-pub"]', done: { changed: 'pub' } },
    { t: '포털에서 확인', d: '계정 메뉴 › 학습자 포털로 새 창을 열어 PC · 휴대폰에서 봅니다.', sel: '.acm summary', done: { inc: 'portal' } }] },
  { id: 'docs', cat: '운영', role: 'admin', title: '표준 문서로 공문 만들기', mins: 6, desc: '서식 고르기 → 과정 데이터로 채우기 → AI 다듬기 → 내보내기', steps: [
    { t: '표준 문서함 열기', d: '내 유형 추천 서식부터 보여 줍니다(계획 · 운영 · 결과 보고 · 공문).', go: 'docs', done: { visit: 'docs' } },
    { t: '내 문서로 만들기', d: '서식 카드의 \'내 문서로 만들기\' 또는 "수료 결과 보고서 만들어줘"처럼 말합니다.', go: 'docs', ask: '교육 결과 보고서 문서 만들어줘', done: { inc: 'docs' } },
    { t: '빈 칸 채우기 · 내보내기', d: '노란 칸은 과정 데이터로 채우거나 직접 입력합니다. Word(.doc) · PDF로 내보냅니다.', go: 'docs', done: { manual: 1 } }] },
  { id: 'badge', cat: '평가', role: 'admin', types: ['univ'], title: '디지털 배지 발급 흐름', mins: 8, desc: '배지 만들기 → 발급 조건 → 수동 발급 · 대장', steps: [
    { t: '배지 화면 열기', d: '수준별 메달 카드에서 유효 발급 수와 발급 방식을 확인합니다.', go: 'badge', done: { visit: 'badge' } },
    { t: '발급 조건 확인', d: '과정 통과 시 자동 발급 / 운영자 검수 후 발급 중 고릅니다. 최상위 배지는 검수를 권합니다.', go: 'badge', done: { visit: 'badge' } },
    { t: '수동 발급 · 대장', d: '우수 학습자에게 수동 발급하고 발급 대장을 CSV로 받습니다. 학습자는 링크로 배지를 공유합니다.', go: 'badge', sel: '[data-act="bd-issue"]', done: { inc: 'badges' } }] },
  { id: 'diag', cat: '과정', role: 'admin', types: ['univ'], title: 'AI 진단 → 러닝 저니 배정', mins: 10, desc: '진단 결과별로 서로 다른 학습 경로를 자동 배정', steps: [
    { t: 'AI 진단 열기', d: '진단 문항 · 결과 유형을 확인합니다. 학과 맞춤 8문항 진단이 기본입니다.', go: 'diag', done: { visit: 'diag' } },
    { t: '결과별 러닝 저니 설계', d: '결과 설계 탭에서 유형마다 STEP 흐름을 정합니다. 비어 있으면 \'AI 러닝 저니 다시 설계\'를 누릅니다.', go: 'diag', done: { visit: 'diag' } },
    { t: '결과대로 배정', d: '결과 탭의 \'결과대로 러닝 저니 배정\'으로 응시자 전원에게 맞춤 경로를 엽니다.', go: 'diag', sel: '[data-act="dg-assign"]', done: { inc: 'diagAssigned' } }] },
  { id: 'legal', cat: '운영', role: 'admin', types: ['corp', 'public'], title: '법정의무교육 연간 운영', mins: 12, desc: '대상 배정 → 마감 독려 자동화 → 미이수 관리 → 이수 보고', steps: [
    { t: '법정의무교육 화면 열기', d: '연간 필수 과정(성희롱 · 개인정보 · 장애인 인식 · 안전 등)과 이수율을 봅니다.', go: 'compliance', done: { visit: 'compliance' } },
    { t: () => `대상 ${L_()} 배정 확인`, d: () => `전원 대상인지, 신규 ${L_()}이 빠지지 않았는지 확인합니다. 학습자 포털 마이페이지 맨 위에 '필수교육 이수 기한' 카드로 보입니다.`, go: 'compliance', done: { visit: 'compliance' } },
    { t: '마감 D-7 독려 자동화 켜기', d: '자동화에서 \'법정교육 마감 D-7 독려 + 부서장 리포트\'를 켭니다.', go: 'auto', done: { inc: 'autosOn' } },
    { t: '미이수자 마감 안내', d: '지금 미이수자에게 마감 안내를 보냅니다.', ask: '법정교육 미이수자에게 마감 안내 보내줘', done: { inc: 'msgs' } },
    { t: '이수 보고서 내기', d: () => S.org.type === 'public' ? '결재란이 있는 교육 실적 보고서를 내려받아 결재에 올립니다.' : '부서별 이수 현황 보고서를 내려받아 경영진 · 부서장에게 공유합니다.', go: 'dash', sel: '[data-act="seg-report"]', done: { inc: 'report' } }] },
  { id: 'billing', cat: '운영', role: 'admin', types: ['k12'], title: '월 수강료 청구 · 미납 관리', mins: 8, desc: '청구서 → 보호자 발송 → 미납 재안내', steps: [
    { t: '청구서 화면 열기', d: '반별 수강료 · 차량비 · 교재비 항목을 확인합니다.', go: 'billing', done: { visit: 'billing' } },
    { t: '미납 재안내', d: '미납 보호자에게 다시 알립니다. 문안은 정중하게, 납부 링크를 함께 보냅니다.', ask: '미납 보호자에게 청구서 다시 알려줘', done: { inc: 'msgs' } },
    { t: '보호자 연결 확인', d: '보호자 화면에서 연결 대기 중인 보호자에게 연결 요청을 다시 보냅니다. 보호자는 포털에서 \'보호자로 보기\'로 자녀 기록을 봅니다.', go: 'parents', done: { visit: 'parents' } }] },
  { id: 'refund', cat: '운영', role: 'admin', types: ['lifelong', 'adult'], title: () => S.org.type === 'lifelong' ? '학습비 반환 처리' : '환불 처리', mins: 6, desc: '신청 확인 → 기한 · 금액 계산 → 처리', steps: [
    { t: '신청 목록 열기', d: () => S.org.type === 'lifelong' ? '학습비 반환은 신청일로부터 5일 안에 처리해야 합니다(평생교육법 시행령).' : '환불 규정에 따라 수강 진도 · 경과일을 확인합니다.', go: () => S.org.type === 'lifelong' ? 'lifelong' : 'sales', done: { visit: () => S.org.type === 'lifelong' ? 'lifelong' : 'sales' } },
    { t: '기한 확인 · 처리', d: 'AI SAM에게 기한이 임박한 건부터 정리하게 하고, 확인 후 처리합니다.', ask: '환불 신청 기한 확인해줘', done: { dec: 'refundOpen' } }] },
  { id: 'hrd', cat: '운영', role: 'admin', types: ['voc'], title: 'HRD-Net 보고 · 출결 관리', mins: 8, desc: '출석률 경고 → 보고 자료 → 제출 확인', steps: [
    { t: '출결 확인', d: '출석률 80% 미만 훈련생은 수료가 어렵습니다. 출결 화면에서 경고 대상을 봅니다.', go: 'attend', done: { visit: 'attend' } },
    { t: '경고 보내기', d: '경고 문안을 확인하고 발송합니다.', ask: '출석률 80% 미만 훈련생에게 경고 보내줘', done: { inc: 'msgs' } },
    { t: 'HRD-Net 보고 자료', d: '보고 화면에서 이번 주 자료를 만들고 내려받아 HRD-Net에 올립니다.', go: 'hrd', sel: '[data-act="hrd-dl"]', done: { inc: 'hrd' } }] },
  /* 강사(교수) 스튜디오 */
  { id: 't-new', cat: '강의', role: 'teacher', title: '새 강의 설계부터 개설까지', mins: 20, desc: '5단계 강의 파이프라인을 AI 조교와 함께', steps: [
    { t: '주제를 담아 설계 지시', d: () => `"생성형 AI 활용 8주 ${C_()} 설계해줘"처럼 주제 · 기간을 함께 말합니다. 주제가 없으면 이름이 '신규 과정'으로 생깁니다.`, ask: () => `생성형 AI 활용 8주 ${C_()} 설계해줘`, done: { inc: 'classes' } },
    { t: '빈 항목 채우기', d: '콘텐츠 개발 단계에서 영상 · 자료 · 퀴즈 · 루브릭을 AI로 채우고, 영상 후보는 직접 골라 확인합니다.', ask: '빈 항목 AI로 채워줘', done: { inc: 'items' } },
    { t: '강의 개설', d: () => `공개 범위 · 기간 · ${L_()} · 개강 공지를 한 번에 처리합니다.`, ask: '강의 개설해줘', done: { inc: 'running' } },
    { t: '포털에서 확인', d: () => `계정 메뉴 › 학습자 포털에서 ${L_()} 화면으로 개설된 강의를 확인합니다.`, sel: '.acm summary', done: { inc: 'portal' } }] },
  { id: 't-run', cat: '강의', role: 'teacher', title: '주간 강의 운영 루틴', mins: 10, desc: '질문 답변 → 채점 → 독려 → 공지', steps: [
    { t: () => `${L_()} 질문 답변`, d: () => `AI 튜터 · 게시판에서 넘어온 질문에 AI 조교가 답변 초안을 만듭니다. 확인 후 보내면 ${L_()} 포털에 바로 표시됩니다.`, ask: () => `${L_()} 질문 답변 초안 만들어줘`, done: { inc: 'answered' } },
    { t: '채점 초안 확인', d: '채점 대기 과제를 AI로 1차 채점하고, 근거를 보고 확정합니다.', ask: '채점 대기 과제 AI로 1차 채점해줘', done: { inc: 'graded' } },
    { t: '진도 위험 독려', d: () => `진도가 늦은 ${L_()}에게 격려 메시지를 보냅니다.`, ask: '진도 늦은 학생에게 격려 메시지 보내줘', done: { inc: 'msgs' } },
    { t: '이번 주 공지', d: '다음 주 학습 안내 공지를 등록합니다.', ask: '이번 주 학습 안내 공지 써줘', done: { inc: 'notices' } }] },
  { id: 't-report', cat: '강의', role: 'teacher', title: () => S.org.type === 'univ' ? '학기 마무리 성과 리포트' : '과정 마무리 성과 리포트', mins: 6, desc: '이수 · 성적 · 질문 분석 → 다음 개선점', steps: [
    { t: '성과 리포트 만들기', d: '이수율 · 점수 분포 · 질문 유형을 묶어 개선점 3가지를 제안합니다.', ask: '성과 리포트와 개선점 정리해줘', done: { inc: 'chat' } },
    { t: '개선점 반영', d: '다음 개설 때 바꿀 주차 · 과제를 커리큘럼에 바로 고칩니다.', go: 'class', done: { visit: 'class' } }] }
];
const gdVal = (v, ...a) => typeof v === 'function' ? v(...a) : v;
const gdRole = () => (typeof scn === 'function' && scn() === 'teacher') ? 'teacher' : 'admin';
const gdList = () => GUIDES.filter(g => g.role === gdRole() && (!g.types || g.types.includes(S.org.type)) && (!g.types || true));
const gdG = id => GUIDES.find(g => g.id === id);
const GD = () => { S.guides = S.guides && typeof S.guides === 'object' ? S.guides : {}; const G = S.guides; G.done = G.done || {}; G.fin = G.fin || {}; return G; };
const gdDone = (g, i) => (GD().done[g.id] || []).includes(i);
const gdPct = g => Math.round((GD().done[g.id] || []).length / g.steps.length * 100);
function gdVisit(v) { v = gdVal(v); if (!v) return false; const [w, tb] = v.split(':'); if (w === 'settings') return CUR.ws === 'settings' && (!tb || UI.settings === tb); return CUR.tab === w || (CUR.ws === w && !CUR.tab) || (CUR.ws === w); }
function gdMet(st, base) { const c = st.done || {}; const M = gdM();
  if (c.visit) return gdVisit(c.visit);
  if (c.inc) return (M[c.inc] || 0) > (base[c.inc] || 0);
  if (c.dec) return (M[c.dec] || 0) < (base[c.dec] || 0);
  if (c.changed) return !!M[c.changed] && M[c.changed] !== base[c.changed];
  return false; }
/* ── 진행 ── */
function gdStart(id, at) { const g = gdG(id); if (!g) return; const G = GD(); G.act = id; G.i = at != null ? at : Math.max(0, g.steps.findIndex((s, i) => !gdDone(g, i))); if (G.i < 0) G.i = 0; G.base = gdM(); G.open = true; save(); closeModal(); gdOpenStep(); }
function gdOpenStep() { const G = GD(); const g = gdG(G.act); if (!g) return; const st = g.steps[G.i]; if (st && st.go) { const [w, tb] = gdVal(st.go).split(':'); if (w === 'settings') { UI.settings = tb || UI.settings; go('settings'); } else go(w); } else render(); setTimeout(gdSpot, 160); }
function gdMark(g, i) { const G = GD(); const L = G.done[g.id] = G.done[g.id] || []; if (!L.includes(i)) L.push(i); if (L.length >= g.steps.length && !G.fin[g.id]) { G.fin[g.id] = today(); logAudit(`가이드 완료 — ${gdVal(g.title)}`); } }
function gdCheck() { const G = GD(); const g = gdG(G.act); if (!g || !G.open) return; const st = g.steps[G.i]; if (!st || gdDone(g, G.i)) return gdBar();
  if (gdMet(st, G.base || {})) { gdMark(g, G.i); save(); toast(`✓ ${gdVal(st.t)} — 완료했습니다.`, 'ok'); } gdBar(); }
function gdNext(d) { const G = GD(); const g = gdG(G.act); if (!g) return; const n = G.i + d; if (n >= g.steps.length) { gdMark(g, G.i); G.open = false; G.act = ''; save(); gdBar(); toast(`「${gdVal(g.title)}」 가이드를 마쳤습니다.`, 'ok'); return; } if (n < 0) return; G.i = n; G.base = gdM(); save(); gdOpenStep(); }
/* ── 따라하기 바(화면 아래) ── */
function gdBar() { let b = $('#gdBar'); if (!S || !S.org) { b && b.remove(); return; } const G = GD(); const g = gdG(G.act);
  if (!S || !S.org || !g || !G.open || document.body.classList.contains('mode-signup')) { b && b.remove(); document.body.classList.remove('gd-on'); return; }
  const st = g.steps[G.i]; const ok = gdDone(g, G.i); const last = G.i === g.steps.length - 1;
  const h = `<div class="gdh"><span class="orb sm" aria-hidden="true"></span><div class="gdt"><small>${esc(gdVal(g.title))} · STEP ${G.i + 1}/${g.steps.length}</small><b>${ok ? '✓ ' : ''}${esc(gdVal(st.t))}</b></div><ol class="gddots">${g.steps.map((s, i) => `<li class="${gdDone(g, i) ? 'ok' : ''} ${i === G.i ? 'on' : ''}"><button type="button" data-act="gd-jump" data-v="${i}" aria-label="STEP ${i + 1}"></button></li>`).join('')}</ol><button class="x" data-act="gd-close" aria-label="가이드 닫기">${ic('x', 16)}</button></div>
    <p class="gdd">${esc(gdVal(st.d))}</p>
    <div class="gda">${st.go ? `<button class="btn sm" data-act="gd-go">${ic('arrow', 14)} 이 화면 열기</button>` : ''}${st.ask ? `<button class="btn sm" data-act="gd-ask">${ic('spark', 14)} AI에게 맡기기</button>` : ''}<span class="gdst ${ok ? 'ok' : ''}">${ok ? '완료 확인됨' : st.done && st.done.manual ? '직접 확인 후 다음으로' : '하면 자동으로 확인됩니다'}</span><span class="sp"></span>${G.i ? '<button class="btn sm ghost" data-act="gd-prev">이전</button>' : ''}${ok || (st.done && st.done.manual) ? `<button class="btn sm ink" data-act="gd-next">${last ? '가이드 마치기' : '다음 단계 →'}</button>` : `<button class="btn sm ghost" data-act="gd-next">${last ? '마치기' : '건너뛰기'}</button>`}</div>`;
  if (!b) { b = document.createElement('div'); b.id = 'gdBar'; b.className = 'gdbar'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', '가이드 따라하기'); document.body.appendChild(b); }
  b.innerHTML = h; b.classList.toggle('ok', ok); document.body.classList.add('gd-on'); }
function gdSpot() { if (!S || !S.org) return; document.querySelectorAll('.gd-spot').forEach(e => e.classList.remove('gd-spot')); const G = GD(); const g = gdG(G.act); if (!g || !G.open) return; const st = g.steps[G.i]; if (!st || !st.sel || gdDone(g, G.i)) return;
  const el = [...document.querySelectorAll(st.sel)].find(e => e.offsetParent); if (!el) return; el.classList.add('gd-spot'); const r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 180) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
ACT['gd-go'] = () => gdOpenStep();
ACT['gd-ask'] = () => { const G = GD(); const g = gdG(G.act); const st = g && g.steps[G.i]; if (!st || !st.ask) return; if (innerWidth <= 860 && document.body.classList.contains('b-pv')) document.body.classList.remove('b-pv'); chatSend(gdVal(st.ask)); };
ACT['gd-next'] = () => { const G = GD(); const g = gdG(G.act); if (g) { const st = g.steps[G.i]; if (st.done && st.done.manual) gdMark(g, G.i); } gdNext(1); };
ACT['gd-prev'] = () => gdNext(-1);
ACT['gd-jump'] = el => { const G = GD(); G.i = +el.dataset.v; G.base = gdM(); save(); gdOpenStep(); };
ACT['gd-close'] = () => { const G = GD(); G.open = false; save(); gdBar(); toast('가이드를 닫았습니다. 가이드 센터에서 이어서 할 수 있습니다.'); };
ACT['gd-start'] = el => gdStart(el.dataset.v);
ACT['gd-reset'] = el => { const G = GD(); delete G.done[el.dataset.v]; delete G.fin[el.dataset.v]; save(); gdStart(el.dataset.v, 0); };
/* ── 가이드 센터 ── */
function gdCenter(cat) { const L = gdList(); const cats = ['전체', ...new Set(L.map(g => g.cat))]; const c = cat || '전체'; const G = GD();
  const rec = L.filter(g => !G.fin[g.id]).slice(0, 1)[0];
  const card = g => { const p = gdPct(g); const fin = G.fin[g.id]; return `<div class="gdc ${G.act === g.id && G.open ? 'cur' : ''}"><span class="tag ${fin ? 'g' : ''}">${esc(g.cat)}${g.types ? ' · 유형 맞춤' : ''}</span><b>${esc(gdVal(g.title))}</b><p>${esc(gdVal(g.desc))}</p><small>${g.steps.length}단계 · 약 ${g.mins}분${fin ? ' · 완료 ' + esc(fin) : p ? ` · 진행 ${p}%` : ''}</small><i class="gdp"><i style="width:${p}%"></i></i><div class="gdcb">${fin ? `<button class="btn sm ghost" data-act="gd-reset" data-v="${g.id}">다시 하기</button>` : `<button class="btn sm ink" data-act="gd-start" data-v="${g.id}">${p ? '이어서 하기' : '시작'}</button>`}</div></div>`; };
  modal('AI SAM 가이드 — 순서대로 따라 하면 끝납니다', `<div class="gdcen"><p class="mini">${gdRole() === 'teacher' ? `${T_()} 스튜디오` : `${TYPES[S.org.type].name} 운영`}에 맞춘 가이드 ${L.length}종입니다. 시작하면 화면 아래 따라하기 바가 단계마다 화면을 열고, 누를 곳을 표시하고, 다 하면 자동으로 확인합니다. 막히면 'AI에게 맡기기'를 누르세요.</p>
    ${rec ? `<div class="gdrec"><span class="orb sm" aria-hidden="true"></span><div><small>지금 추천</small><b>${esc(gdVal(rec.title))}</b></div><button class="btn sm ink" data-act="gd-start" data-v="${rec.id}">${gdPct(rec) ? '이어서 하기' : '시작'}</button></div>` : ''}
    <div class="chips gdcats">${cats.map(x => `<button type="button" class="chip ${x === c ? 'on' : ''}" data-act="gd-cat" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="gdgrid">${L.filter(g => c === '전체' || g.cat === c).map(card).join('')}</div></div>`, [{ id: 'c', label: '닫기' }], true); }
ACT['guides'] = () => gdCenter(); ACT['gd-cat'] = el => gdCenter(el.dataset.v);
/* ── 진입점: 홈 알약 · 계정 메뉴 · 대화 ── */
AFTER.push(() => { if (!S || !S.org) return; const hm = $('.hmeta'); if (hm && !hm.querySelector('[data-act="guides"]')) { const L = gdList(); const n = L.filter(g => !GD().fin[g.id]).length; hm.insertAdjacentHTML('beforeend', `<button class="pill gdpill" data-act="guides">${ic('book', 14)} 가이드 ${n}</button>`); }
  const ap = $('.acp'); if (ap && !ap.querySelector('[data-act="guides"]')) ap.insertAdjacentHTML('beforeend', `<hr><button type="button" role="menuitem" data-act="guides">${ic('book', 15)} 가이드 센터 — 따라 하기</button>`);
  const bh = $('.bch'); if (bh && !bh.querySelector('[data-act="guides"]')) { const nw = bh.querySelector('[data-act="chat-new"], [data-act="bld-clear"]'); const btn = `<button class="gdbtn" data-act="guides" title="가이드 센터">${ic('book', 14)} 가이드</button>`; nw ? nw.insertAdjacentHTML('beforebegin', btn) : bh.insertAdjacentHTML('beforeend', btn); }
  setTimeout(() => { gdCheck(); gdSpot(); }, 80); });
{ const base = answer; answer = (q, ...r) => { const s = String(q || '');
  if (/(가이드|따라\s*하|사용법|어떻게\s*(시작|해야|하면|써)|뭐부터|무엇부터|순서대로|튜토리얼\s*센터)/.test(s) && !/튜터/.test(s)) {
    const L = gdList(); const hit = L.find(g => { const k = (gdVal(g.title) + ' ' + g.cat + ' ' + g.id).replace(/[()·]/g, ' '); return k.split(/\s+/).filter(w => w.length >= 2).some(w => s.includes(w)) || (g.id === 'mcp' && /(mcp|MCP|API|키|외부\s*AI)/.test(s)); });
    const pick = hit || L.find(g => !GD().fin[g.id]) || L[0];
    if (/시작|따라|해줘|열어/.test(s) && pick) setTimeout(() => gdStart(pick.id), 60);
    const lines = L.slice(0, 8).map(g => `· ${gdVal(g.title)} — ${g.steps.length}단계 · 약 ${g.mins}분${GD().fin[g.id] ? ' (완료)' : gdPct(g) ? ` (진행 ${gdPct(g)}%)` : ''}`);
    return { text: `${/시작|따라|해줘|열어/.test(s) && pick ? `「${gdVal(pick.title)}」 가이드를 시작합니다. 화면 아래 따라하기 바를 보세요 — 단계마다 화면을 열고, 누를 곳을 표시하고, 다 하면 자동으로 확인합니다.\n\n` : ''}지금 쓸 수 있는 가이드입니다.\n${lines.join('\n')}\n\n"○○ 가이드 시작해줘"라고 말하거나 가이드 센터에서 고르세요.`, html: `<div class="bqs">${L.slice(0, 4).map(g => `<button type="button" class="chip" data-act="gd-start" data-v="${g.id}">✦ ${esc(gdVal(g.title))}</button>`).join('')}<button type="button" class="chip" data-act="guides">가이드 센터 열기</button></div>` }; }
  return base(q, ...r); }; }
/* 빌드 안내 · 교수 인사 아래에 가이드 안내 한 줄 */
setTimeout(() => { gdBar(); gdSpot(); }, 600);
