/* v34 slim-g — 화면 가이드: '가이드가 비어 있는 화면 0'.
   대표님(2026-11-07): '가이드가 비어 있는 화면 모두 채우기 · 워딩이 많으면 혼란만 가중 — 필요하면 클릭 시 설명이 나오거나 가이드로'.
   - 모든 화면(MENU 탭 · 설정 하위 · 현황 · 메뉴 추가)에 같은 형식: 하는 일 한 줄 + 첫 할 일 버튼 하나 + AI SAM 추천 명령 2~3개.
   - 위치: 화면 제목 옆 ⓘ(누르면 가이드) + 데이터가 0이면 빈 표 대신 빈 상태 카드.
   - 기존 「가이드 보기」(guide26) · 문서 링크(guideRef) · slim의 ⓘ 설명은 이 ⓘ 하나로 모은다(가이드 버튼이 여러 개 생기지 않게).
   - 데이터는 표 하나(GUIDE). 기관 유형별 문구는 표의 x 열, 시나리오 파일은 window.SLG_PICK에 등록해 덮어쓴다:
       (window.SLG_PICK = window.SLG_PICK || []).push((type, ed) => 조건 ? { 탭id: { d, f: [이름, act, v], a: [명령…] } } : null);
   기능은 지우지 않는다 — 기존 버튼은 숨기기만 하고, 같은 동작을 가이드 안에서 그대로 부른다. */
(function () {
  'use strict';
  window.SLG_PICK = window.SLG_PICK || [];
  /* 받침에 맞는 조사: j('강좌', '을') → '강좌를' */
  const bat = w => { const c = String(w || '').trim().slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : 0; };
  const PAIR = { 을: ['을', '를'], 를: ['을', '를'], 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 과: ['과', '와'], 와: ['과', '와'], 으로: ['으로', '로'], 로: ['으로', '로'] };
  const j = (w, p) => { const P = PAIR[p]; if (!P) return w + p; const b = bat(w); return w + (b ? (p.startsWith('으') || p === '로' ? (b === 8 ? P[1] : P[0]) : P[0]) : P[1]); };
  window.slgJ = j;
  const TK = () => !S || !S.org ? '' : S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type;
  const N = v => (Array.isArray(v) ? v.length : 0);
  const SUBN = id => { try { return N(S[id]); } catch (e) { return 0; } };
  const LMSONLY = '대학 학사 LMS 에디션 전용 화면입니다';

  /* ───────── 표 하나: 화면 id → d(하는 일 한 줄) · f(첫 할 일 [이름, act, v]) · a(AI SAM 추천 명령) · n(데이터 수, 0이면 빈 상태 카드) · x(기관 유형별 추천 명령) ───────── */
  const GUIDE = () => { const L = t('learner'), C = t('cls'), G = t('group'), Te = t('teacher'), D = t('done'), F = t('fee'), SI = t('site');
    return {
      /* 학습 */
      class: { d: `${j(C, '을')} 만들고 수강 기간 · 가격을 정합니다`, f: [`+ ${C} 만들기`, 'cls-new'], a: [`${C} 3개 만들어줘`, `${j(L, '이')} 적은 ${C} 찾아줘`, `이번 달 수강 신청 현황 알려줘`], n: () => N(S.classes),
        x: { corp: ['임직원 AI 기초 교육과정 만들어줘', '법정의무교육 과정 만들어줘', '부서별 수강 현황 알려줘'], voc: ['국비 훈련과정 만들어줘', '출석률 80% 미만 훈련생 찾아줘', 'HRD-Net 보고할 과정 보여줘'], lifelong: ['평생교육 강좌 3개 만들어줘', '학습비 반환 대상 강좌 찾아줘', '이번 학기 수강 현황 알려줘'], public: ['주민 대상 교육과정 만들어줘', '정원이 남은 교육과정 보여줘', '이번 달 교육 현황 알려줘'], univ: ['비교과 프로그램 만들어줘', '참여가 적은 교과목 찾아줘', '이번 학기 수강 현황 알려줘'] } },
      journey: { d: '단계별 학습 경로를 묶습니다', f: ['+ 단계 추가', 'jn-add'], a: ['입문 → 심화 러닝 저니 만들어줘', `막힌 단계의 ${L} 보여줘`], n: () => N(S.journey) },
      diag: { d: '진단 검사로 수준을 보고 과정을 추천합니다', f: ['+ 진단 만들기', 'dg-new'], a: ['AI 역량 진단 문항 만들어줘', '진단 결과 요약해줘'], n: () => N(S.diags) },
      library: { d: `영상 · 자료를 모아 ${C}에 편성합니다`, f: ['YouTube 등록', 'yt-add'], a: ['자료 올리는 법 알려줘', '이탈률이 높은 영상 찾아줘', `안 쓰는 자료 정리해줘`], n: () => N(S.lib) },
      assess: { d: '시험 · 과제를 내고 채점합니다', f: [`시험 넣을 ${C} 고르기`, 'go', 'class'], a: ['채점 대기 과제 보여줘', '5문항 퀴즈 만들어줘', 'AI 채점 초안 만들어줘'] },
      badge: { d: `${L}에게 디지털 배지를 줍니다`, f: ['배지 만들기', 'bd26-go', 'set'], a: ['수료 배지 만들어줘', '배지 받을 대상 보여줘'], n: () => N(S.badges) },
      cert: { d: `${D}증을 발급하고 대장을 관리합니다`, f: ['수동 발급', 'cert-manual'], a: [`${D} 대상자 보여줘`, `${D}증 일괄 발급해줘`], n: () => N(S.certs) },
      attend: { d: '회차별 출결을 기록합니다', f: ['출석 체크 화면 열기', 'cls-pad'], a: ['오늘 출결 요약해줘', '결석한 사람에게 안내해줘'],
        x: { voc: ['출석률 80% 미만 훈련생 보여줘', '오늘 출결 요약해줘', '결석 훈련생에게 안내해줘'] } },
      book: { d: '교재 · 교구를 등록해 팝니다', f: ['+ 교재 만들기', 'book-new'], a: ['교재 등록해줘', '썸네일 추천해줘'], n: () => N(S.books) },
      calendar: { d: '일정을 보고 학습 알림을 정합니다', f: ['다른 캘린더 연결', 'cal-scope'], a: ['이번 달 일정 보여줘', '시험 일정 알림 보내줘'] },
      dbook: { d: '읽고 풀고 쓰는 디지털 교재를 만듭니다', f: ['AI 초안', 'bk-ai'], a: ['디지털북 만들어줘', `${j(C, '으로')} 디지털북 만들어줘`] },
      tutorial: { d: '짧은 따라 하기 영상을 만듭니다', f: ['+ 튜토리얼', 'tu-edit', 'new'], a: ['튜토리얼 만들어줘', '인기 튜토리얼 보여줘'] },
      /* 사람 */
      members: { d: `${L} 명단 · 가입 승인을 봅니다`, f: [`+ ${L} 추가`, 'mem-invite'], a: ['승인 대기 보여줘', '2주 미접속자 찾아줘', `${L} 30명 등록해줘`], n: () => (S.members || []).filter(m => !m.withdrawn).length,
        x: { univ_lms: ['학번으로 학생 등록하는 법 알려줘', '미접속 학생 찾아줘', '학과별 인원 알려줘'], corp: ['부서별 임직원 명단 보여줘', '미이수 임직원 찾아줘', '임직원 일괄 등록해줘'] } },
      enroll: { d: '초대 링크를 보내거나 명단을 한 번에 올립니다', f: ['명단 양식 받기', 'bulk-tpl'], a: ['초대 링크 만들어줘', `${L} 명단 일괄 등록해줘`] },
      groups: { d: `${j(L, '을')} ${j(G, '으로')} 묶습니다`, f: [`+ ${G} 만들기`, 'grp-new'], a: [`${G} 나눠줘`, `${G}별 진도 보여줘`], n: () => N(S.groups) },
      parents: { d: '보호자를 연결하고 알림을 보냅니다', f: ['+ 보호자 연결', 'par-req'], a: S.org && S.org.type === 'k12' ? ['보호자 연결 안 된 학생 보여줘', '보호자에게 안내 보내줘'] : ['보호자에게 안내 보내줘'], n: () => N(S.parents) },
      admins: { d: `운영자 · ${Te} 권한과 기록을 봅니다`, f: ['+ 운영자 추가', 'adm-new'], a: ['운영자 추가해줘', '최근 작업 기록 보여줘'] },
      /* 소통 */
      board: { d: '공지를 올리고 알림을 보냅니다', f: ['+ 공지', 'notice-new'], a: ['공지 써줘', '휴강 알림 보내줘'], n: () => N(S.notices) + (S.classes || []).reduce((a, c) => a + N(c.notices), 0) + N(S.alerts) }, /* v36: 강좌 공지 · 알림도 세어 빈 화면 카드가 목록 위에 겹치지 않게 */
      message: { d: '메시지 · 알림톡을 보냅니다', f: ['받는 사람 고르기', 'cm-mc-pick'], a: ['미접속자에게 안내해줘', '수업 일정 안내 보내줘', '보낸 메시지 요약해줘'], n: () => N(S.msgs),
        x: { k12: ['보호자에게 출결 알림 보내줘', '미납 안내 보내줘', '시험 일정 안내 보내줘'], corp: ['미이수 임직원에게 독려 메시지 보내줘', '교육 일정 안내 보내줘'], voc: ['결석 훈련생에게 안내해줘', '훈련 일정 안내 보내줘'] } },
      community: { d: '게시판 · 질문 · 후기를 운영합니다', f: ['미답변 답변 초안', 'ai-reply-all'], a: ['미답변 질문 보여줘', '게시판 만들어줘'], n: () => N(S.posts) },
      consult: { d: '상담을 기록하고 AI로 요약합니다', f: ['대면 상담 시작', 'cs-start'], a: ['상담 요약해줘', '후속 조치 필요한 상담 보여줘'], n: () => N(S.consults) },
      /* 운영 */
      auto: { d: '반복 업무를 자동으로 돌립니다', f: ['✦ 말로 만들기', 'auto-ai'], a: ['14일 미접속자 독려 자동화 만들어줘', '자동 운영 상태 보여줘'] },
      site: { d: `${j(SI, '을')} 만들고 게시합니다`, f: ['새 창 미리보기', 'site-open'], a: ['AI로 홈페이지 만들어줘', '첫 화면 문구 바꿔줘', '홈페이지 게시해줘'] },
      sales: { d: '결제 · 환불 · 매출을 봅니다', f: ['엑셀로 받기', 'sales-xls'], a: ['이번 달 매출 요약해줘', '환불 신청 보여줘'], n: () => N(S.pays) },
      billing: { d: '청구서를 보내고 납부를 확인합니다', f: ['+ 청구서 만들기', 'bill-new'], a: ['미납 청구서 보여줘', '다음 달 청구서 만들어줘'], n: () => N(S.bills) },
      compliance: { d: '법정의무교육 이수를 관리합니다', f: ['이수 보고서', 'comp-report'], a: ['미이수자 보여줘', '미이수자에게 독려 보내줘'] },
      academic: { d: '학사 · 비교과 운영을 관리합니다', f: ['성적 내보내기', 'acad-xls'], a: ['비교과 현황 보여줘', '위험군 학생 찾아줘'] },
      lifelong: { d: '학습비 반환 · 과정 신고를 챙깁니다', f: ['신고 점검', 'll-check'], a: ['신고 대상 보여줘', '학습비 반환 계산해줘'] },
      hrd: { d: 'HRD-Net에 보고할 자료를 만듭니다', f: ['이번 주 보고 자료 생성', 'auto-run-id', 'hrd-weekly'], a: ['HRD 보고 준비해줘', '출석률 미달 훈련생 보여줘'] },
      org: { d: '협력 기관과 담당자를 관리합니다', f: ['+ 기관 지정', 'mb-org'], a: ['협력 기관 추가해줘', '기관별 수강 현황 보여줘'], n: () => N(S.orgs) },
      docs: { d: '공문 · 안내문 · 보고서를 만듭니다', f: ['AI로 문서 만들기', 'doc-ai-new'], a: ['운영 결과 보고서 써줘', '수강 안내문 써줘'] },
      aigov: { d: 'AI 사용량과 안전 규칙을 관리합니다', f: ['AI SAM 연결', 'go', 'conn'], a: ['AI 사용량 보여줘', 'AI 사용 규칙 알려줘'] },
      cpl: { d: '인가 · 규정을 점검합니다', f: ['규정 점검 기록', 'cpl-log'], a: ['규정 점검해줘', '부족한 서류 알려줘'] },
      conn: { d: '외부 서비스를 연결합니다', f: ['Claude 연결', 'sl-cn', 'claude'], a: ['Slack 연결 도와줘', 'Google 캘린더 연결해줘'] },
      sis: { d: '학적 시스템과 명단을 맞춥니다', f: ['지금 동기화', 'sis-sync'], a: ['학적 연동 상태 보여줘', '동기화 오류 알려줘'] },
      grade: { d: '성적을 입력하고 확정합니다', f: [`${C} 보기`, 'go', 'class'], a: ['성적 입력 현황 보여줘', '성적 미입력 교과목 찾아줘'] },
      rfpmap: { d: '구축 요건별 대응 현황을 봅니다', f: ['CSV 내보내기', 'rf-xls'], a: ['미대응 요건 보여줘', '요건 대응표 요약해줘'] },
      /* 학원 CRM(k12) — 문구는 scn-k12.js에서 덮어쓸 수 있다 */
      crmstu: { d: '원생을 등록하고 한 명씩 관리합니다', f: ['+ 원생 등록', 'crm-new'], a: ['원생 등록해줘', '상담 필요한 원생 보여줘'], n: () => (S.members || []).filter(m => !m.withdrawn).length },
      crmatt: { d: '오늘 수업의 등원 · 출결을 체크합니다', f: ['모두 출석', 'crm-att-all'], a: ['오늘 미등원 보여줘', '보호자에게 출결 알림 보내줘'] },
      crmex: { d: '시험을 등록하고 성적을 기록합니다', f: ['+ 시험 등록', 'crm-ex-new'], a: ['성적 알림 보내줘', '성적이 떨어진 원생 보여줘'] },
      crmcs: { d: '신규 문의 · 상담을 기록합니다', f: ['+ 신규 문의', 'crm-lead-new'], a: ['상담 필요한 원생 보여줘', '신규 문의 요약해줘'] },
      crmbill: { d: '수강료를 청구하고 미납을 관리합니다', f: ['수납 설정', 'crm-bill-cfg'], a: ['다음 달 청구해줘', '미납 원생 보여줘'] },
      crmstat: { d: '원생 · 매출 통계를 봅니다', f: ['원생 엑셀 받기', 'crm-csv-out'], a: ['이번 달 통계 보여줘', '퇴원 사유 요약해줘'] },
      /* 대학 학사 LMS — 문구는 scn-univ-lms.js에서 덮어쓸 수 있다 */
      lmsa: { d: '학기 · 강좌 · 분반을 만듭니다', f: ['+ 학기', 'lmsa-term-new'], a: ['이번 학기 개설 강좌 보여줘', '분반 합치기 도와줘'] },
      lmsb: { d: '강의실 주차 · 메뉴를 구성합니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['15주 강의실 구성해줘', '지난 학기 강의실 복사해줘'] },
      lmsc: { d: '토론 · 팀 · 위키 활동을 엽니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['토론방 만들어줘', '팀 자동 편성해줘'] },
      lmsd: { d: '강의 게시판 · 질문을 관리합니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['미답변 질문 보여줘', '공지 써줘'] },
      lmse: { d: '과제를 내고 채점합니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['과제 만들어줘', '미제출 학생 보여줘'] },
      lmsf: { d: '시험 · 문제은행을 관리합니다', f: ['새 시험', 'lmsf-exam'], a: ['10문항 시험 만들어줘', '문제은행 정리해줘'] },
      lmsg: { d: '차시별 출결을 관리합니다', f: ['앱 출석 열기', 'go', 'lmsp-app'], a: ['결석이 많은 학생 보여줘', '출결 이의신청 보여줘'] },
      lmsi: { d: '동영상 진도를 확인합니다', f: ['강의 영상 관리', 'go', 'lmsv'], a: ['진도 미달 학생 보여줘', '영상 시청 현황 요약해줘'] },
      lmsj: { d: '학습 데이터를 분석합니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['위험군 학생 찾아줘', '학습 분석 요약해줘'] },
      lmsk: { d: '설문 · 강의평가를 엽니다', f: ['템플릿으로 새 설문', 'lmsk-start'], a: ['강의평가 설문 만들어줘', '응답률 낮은 설문 보여줘'] },
      'lmsl-cal': { d: '학사 · 강의 일정을 한 달력에서 봅니다', f: ['일정 추가', 'lmsl-add'], a: ['이번 주 일정 보여줘', '시험 일정 알림 보내줘'] },
      'lmsl-dm': { d: '학생 · 교수와 1:1로 대화합니다', f: ['새 대화', 'lmsl-new'], a: ['안 읽은 대화 보여줘', '공지 대화방 만들어줘'] },
      'lmsl-noti': { d: '알림 규칙을 정합니다', f: ['규칙 추가', 'lmsl-rule'], a: ['마감 하루 전 알림 규칙 만들어줘', '알림 규칙 보여줘'] },
      lmsm: { d: '사용자 · 권한 · 감사 기록을 관리합니다', f: ['사용자 · 권한 보기', 'go', 'admins'], a: ['권한 변경 기록 보여줘', '조교 권한 추가해줘'] },
      lmsn: { d: 'MOOC · 비학위 과정을 운영합니다', f: ['새 과정', 'lmsn-edit'], a: ['MOOC 과정 만들어줘', '수료 대상 보여줘'] },
      lmso: { d: 'AI 학습 지원을 관리합니다', f: ['AI 사용량 보기', 'go', 'aigov'], a: ['AI 튜터 설정 알려줘', 'AI 사용량 보여줘'] },
      lmsp: { d: '포털 공통 설정을 관리합니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['접근성 점검해줘', '포털 설정 알려줘'] },
      'lmsp-portal': { d: '포털 첫 화면 위젯을 꾸밉니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['포털 위젯 구성해줘', '학생 포털 미리 보여줘'] },
      'lmsp-app': { d: '앱으로 출석을 받습니다', f: ['출결 관리', 'go', 'lmsg'], a: ['오늘 출석 현황 보여줘', '출석 코드 만들어줘'] },
      lmsq: { d: '비교과 프로그램을 운영합니다', f: ['새 프로그램', 'lmsq-new'], a: ['비교과 프로그램 만들어줘', '신청 현황 보여줘'] },
      lmslive: { d: '실시간 수업을 엽니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['실시간 수업 만들어줘', '출석 인정 시간 정해줘'] },
      lmsv: { d: '강의 영상을 올리고 변환합니다', f: ['강좌 · 분반 보기', 'go', 'lmsa'], a: ['영상 자막 만들어줘', '변환 실패 영상 보여줘'] },
      /* 공간 · 설정 */
      dash: { d: '목표 대비 성과와 참여 추이를 봅니다', f: ['엑셀로 받기', 'd26-xls'], a: ['이번 주 운영 현황 요약해줘', `${D}율 낮은 ${C} 찾아줘`, '지난달과 비교해줘'] },
      more: { d: '필요한 메뉴만 켜서 씁니다', f: ['기본 메뉴로', 'sl-reset-menu'], a: ['출결 메뉴 켜줘', '안 쓰는 메뉴 정리해줘'] },
      settings: { d: '메뉴 · 기관 정보 · 연결을 설정합니다', f: ['메뉴 고르기', 'go', 'more'], a: ['Claude 연결 도와줘', '메뉴 켜고 끄는 법 알려줘'] },
      'set:menu': { d: '메뉴 순서와 켜고 끄기를 정합니다', f: ['메뉴 켜고 끄기', 'go', 'more'], a: ['안 쓰는 메뉴 꺼줘', '메뉴 순서 바꿔줘'] },
      'set:type': { d: '기관 유형 · 이름을 바꿉니다', f: ['설정 목록', 'sl-setback'], a: ['기관 유형 바꾸면 뭐가 달라져?', '기관 이름 바꿔줘'] },
      'set:rules': { d: `진도 · ${D} 기준과 AI 튜터를 정합니다`, f: ['설정 목록', 'sl-setback'], a: [`${D} 기준 80%로 바꿔줘`, 'AI 튜터 말투 정해줘'] },
      'set:integr': { d: 'API · MCP로 외부 시스템과 연동합니다', f: ['연결 화면', 'sl-goconn'], a: ['MCP 연결 방법 알려줘', 'API 키 만들어줘'] },
      'set:lang': { d: '화면 · 사이트 언어를 정합니다', f: ['설정 목록', 'sl-setback'], a: ['영어 사이트 만들어줘', '번역 상태 보여줘'] },
      'set:plan': { d: '요금제와 부가 옵션을 봅니다', f: ['요금제 보기', 'plan'], a: ['지금 요금제 알려줘', '필요한 부가 옵션 추천해줘'] },
      'set:service': { d: '가입 방식 · 승인을 정합니다', f: ['설정 목록', 'sl-setback'], a: ['가입 승인제로 바꿔줘', '가입 질문 추가해줘'] },
      'set:home': { d: `${SI} 주소 · 기본 정보를 정합니다`, f: ['홈페이지 열기', 'go', 'site'], a: ['홈페이지 주소 바꿔줘', '푸터 정보 채워줘'] },
      'set:popup': { d: '공지 팝업을 띄웁니다', f: ['+ 팝업', 'popup-new'], a: ['방학 공지 팝업 만들어줘'] },
      'set:consult': { d: '상담 버튼과 시간을 정합니다', f: ['상담 화면', 'go', 'consult'], a: ['상담 가능 시간 정해줘', '채널톡 연결해줘'] },
      'set:terms': { d: '이용약관 · 개인정보 처리방침을 관리합니다', f: ['AI 약관 초안', 'ai-terms'], a: ['개인정보 처리방침 점검해줘', '이용약관 초안 써줘'] },
      'set:cover': { d: '전체 기능을 한눈에 봅니다', f: ['메뉴 켜고 끄기', 'go', 'more'], a: ['우리 기관에 필요한 기능 추천해줘'] },
      'set:room': { d: '배포 · 백업 공간을 관리합니다', f: ['설정 목록', 'sl-setback'], a: ['백업 만들어줘', '배포 상태 알려줘'] },
      'set:data': { d: '데이터를 내보내거나 지웁니다', f: ['데이터 내보내기', 'data-export'], a: ['전체 데이터 내보내줘', '개인정보 보관 기간 알려줘'] }
    }; };

  /* 시나리오 · 유형별 덮어쓰기를 합친 최종 한 칸 */
  function slgGuide(id) { if (!S || !S.org || !id) return null; const k = TK();
    const B = GUIDE(); let g = B[id] ? { ...B[id] } : null; if (g && g.x && g.x[k]) g.a = g.x[k];
    (window.SLG_PICK || []).forEach(fn => { try { const o = fn(S.org.type, S.org.ed); if (o && o[id]) g = { ...(g || {}), ...o[id] }; } catch (e) { console.error(e); } });
    if (!g) { const md = typeof slimMD === 'function' ? slimMD(id) : null; const nm = MENU[id] ? mlabel(id) : id; g = { d: (typeof UX_DESC === 'function' && UX_DESC()[id]) || (md ? md[0] : `${nm} 화면입니다`), a: md ? [md[1]] : [`${nm} 화면 사용법 알려줘`] }; }
    if (/^lms/.test(id) && k !== 'univ_lms' && k !== 'univ' && !(window.SLG_PICK || []).some(fn => { try { const o = fn(S.org.type, S.org.ed); return o && o[id]; } catch (e) { return false; } })) g.d = g.d + ' · ' + LMSONLY;
    g.a = (g.a || []).slice(0, 3); return g; }
  window.slgGuide = slgGuide;
  window.SLG_TABLE = GUIDE;
  const slgKey = () => { if (!S || !S.org) return ''; if (CUR.ws === 'more') return 'more'; if (CUR.ws === 'dash') return 'dash'; if (CUR.ws === 'home') return '';
    if (CUR.ws === 'settings') return UI.slSetIn ? 'set:' + (UI.settings || 'menu') : 'settings'; return CUR.tab || ''; };
  window.slgKey = slgKey;
  const SETN = { menu: '메뉴 구성', type: '기관 정보', rules: '학습 규칙 · AI 튜터', integr: 'API · MCP', lang: '언어', plan: '요금제 · 결제', service: '가입 · 회원', home: '홈페이지 설정', popup: '팝업', consult: '상담 설정', terms: '약관', cover: '기능 맵', room: '데이터룸 · 배포', data: '데이터' };
  const nameOf = id => id === 'more' ? '설정 › 메뉴' : id === 'dash' ? '현황' : id === 'settings' ? '설정' : id.startsWith('set:') ? '설정 › ' + (SETN[id.slice(4)] || id.slice(4)) : mlabel(id);

  /* 첫 할 일: 표의 act가 없으면 화면의 주 버튼 → AI SAM 순서로 대신한다(버튼이 죽지 않게) */
  function firstOf(g) { const f = g.f || []; if (f[1] && (ACT[f[1]] || f[1] === 'go')) return { l: f[0], act: f[1], v: f[2] || '' };
    const m = $('#main'); const b = m && [...m.querySelectorAll('.phr .uxkeep, .phr .btn.pri, .phr .btn.ink, .sl-hr .btn.pri')].find(x => x.dataset.act && ACT[x.dataset.act]);
    if (b) return { l: b.textContent.trim(), act: b.dataset.act, v: b.dataset.v || '' };
    return { l: 'AI SAM에게 맡기기', act: 'chat-q', v: (g.a || [])[0] || '이 화면 사용법 알려줘' }; }
  window.slgFirst = id => { const g = slgGuide(id); return g ? firstOf(g) : null; };
  const askBtns = g => (g.a || []).map(q => `<button type="button" class="slg-ask" data-act="slg-ask" data-v="${esc(q)}">${ic('spark', 14)}<span>${esc(q)}</span></button>`).join('');

  /* 화면 설명(slim이 숨긴 설명 문단 · 긴 안내 문단) — 가이드 안 '이 화면 설명'에서만 보인다 */
  const descOf = () => { const m = $('#main'); if (!m) return []; const T = new Set();
    m.querySelectorAll('p[data-sl][hidden], [data-slg-long]').forEach(p => { const x = p.textContent.replace(/\s*가이드\s*$/, '').replace(/\s+/g, ' ').trim(); if (x) T.add(x.slice(0, 220)); });
    return [...T].slice(0, 4); };
  const docOf = () => { const a = $('#main a.gref'); return a ? a.href : ''; };

  function slgHTML(id) { const g = slgGuide(id); if (!g) return ''; const f = firstOf(g); const D = descOf(); const doc = docOf();
    return `<div class="slg-ph"><small>화면 가이드</small><b>${esc(nameOf(id))}</b><button type="button" class="slg-x" data-act="slg-close" aria-label="가이드 닫기">${ic('x', 16)}</button></div>
      <p class="slg-line">${esc(g.d)}</p>
      <button type="button" class="btn pri slg-first" data-act="${esc(f.act)}" data-v="${esc(f.v)}" data-slg="first">${esc(f.l)}</button>
      ${g.a && g.a.length ? `<div class="slg-asks"><small>AI SAM에게 이렇게 말해 보세요</small>${askBtns(g)}</div>` : ''}
      ${D.length ? `<details class="slg-desc"><summary>이 화면 설명</summary>${D.map(x => `<p>${esc(x)}</p>`).join('')}</details>` : ''}
      <div class="slg-links"><button type="button" class="slg-lk" data-act="slg-more">${ic('book', 14)} 따라 하기 · 용어</button>${doc ? `<a class="slg-lk" href="${esc(doc)}" target="_blank" rel="noopener">가이드 문서 ↗</a>` : ''}</div>`; }
  window.slgHTML = slgHTML;

  const close = () => { const p = $('#slgPop'); if (p) p.remove(); document.querySelectorAll('.slg-i[aria-expanded=true]').forEach(b => b.setAttribute('aria-expanded', 'false')); };
  function open(btn) { const id = slgKey(); if ($('#slgPop')) { const same = $('#slgPop').dataset.id === id; close(); if (same) return; }
    const html = slgHTML(id); if (!html) return; const p = document.createElement('div'); p.id = 'slgPop'; p.className = 'slg-pop'; p.dataset.id = id; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', '화면 가이드'); p.innerHTML = html;
    document.body.appendChild(p); if (btn) btn.setAttribute('aria-expanded', 'true');
    if (innerWidth > 700 && btn) { const r = btn.getBoundingClientRect(); const w = Math.min(360, innerWidth - 24); p.style.width = w + 'px'; p.style.left = Math.max(12, Math.min(r.left - 12, innerWidth - w - 12)) + 'px'; p.style.top = (r.bottom + 10 + scrollY) + 'px'; }
    else p.classList.add('sheet');
    const f = p.querySelector('.slg-first'); f && f.focus({ preventScroll: true });
    setTimeout(() => addEventListener('click', function x(e) { const q = $('#slgPop'); if (!q) { removeEventListener('click', x, true); return; } if (!e.target.closest('#slgPop') || e.target.closest('#slgPop [data-act]:not(summary)')) { setTimeout(close, 0); removeEventListener('click', x, true); } }, true), 0); }
  window.slgOpen = open;
  ACT['slg-open'] = el => open(el);
  ACT['slg-close'] = () => close();
  ACT['slg-ask'] = el => { close(); try { typeof fabOpen === 'function' && fabOpen(); } catch (e) { } ACT['chat-q'] ? ACT['chat-q'](el) : chatSend(el.dataset.v); };
  ACT['slg-more'] = () => { close(); if (ACT['g26-open']) ACT['g26-open'](); };
  addEventListener('keydown', e => { if (e.key === 'Escape' && $('#slgPop')) { close(); const b = $('#main .slg-i'); b && b.focus(); } });
  /* slim의 ⓘ(sl-tip)이 화면 제목에 붙은 경우도 같은 가이드를 연다 */
  if (ACT['sl-tip']) { const base = ACT['sl-tip']; ACT['sl-tip'] = (el, ...r) => { if (el && el.closest && el.closest('.sl-h h2, .bhdl > b, .wh h1')) return open(el); return base(el, ...r); }; }

  /* ───────── 화면에 붙이기 ───────── */
  const vis = e => !!e && !e.hidden && e.getClientRects().length > 0;
  /* 글자가 실제로 차지한 줄 수(flex로 늘어난 상자 높이가 아니라 글줄 기준) */
  const txH = p => { const cs = getComputedStyle(p); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35; const r = document.createRange(); r.selectNodeContents(p); const h = Math.min(r.getBoundingClientRect().height, p.clientHeight || 1e9); return Math.round(h / lh * 10) / 10 - 0.15; };
  window.slgLines = txH;
  const titleEl = m => [...m.querySelectorAll('.sl-h h2, .bhdl > b, .wh h1')].find(vis);
  const LONG_SEL = '.ph .phl > p, p.mini, div.mini, p.hint, .bview > p, .sl-page > p, .card > p.mini, .card > p, .phl > small';
  function longParas(m) { /* 두 줄 넘는 안내 문단은 접어서 가이드의 '이 화면 설명'으로(입력 · 표 · 목록 · 시트 · 대화 안은 그대로) */
    m.querySelectorAll(LONG_SEL).forEach(p => { if (p.dataset.slgLong || p.hidden || p.closest('table, form, label, .sl-row, .sl-sheet, .modal, .chat, .aih, .fab, .slg-empty, .bkblk, .dpaper, [contenteditable], .cn-card, .post, .uxpop, details, .obd, .gdbar')) return;
      if (p.querySelector('button, input, select, textarea, a:not(.gref)')) return; const tx = p.textContent.trim(); if (tx.length < 50) return;
      if (txH(p) <= 2) return;
      p.dataset.slgLong = 1; p.dataset.slgHide = 1; });
    /* 목록 · 카드 안의 긴 설명은 두 줄까지만(전체 문장은 마우스를 올리거나 눌러서 연 상세에서) */
    /* v36: 두 줄 자르기는 목록 줄(.sl-row · ul/ol · .row)의 보조 설명에만 — 카드(결제 · 설정 등) 본문 설명은 자르지 않는다 */
    m.querySelectorAll('p, .mini, small, .desc').forEach(p => { if (p.dataset.slgLong || p.classList.contains('slg-clamp') || p.closest(CLAMP_NO) || !p.closest('.sl-row, .sl-list, ul, ol, .row')) return; if (!vis(p) || p.querySelector('button, input, select, textarea, a, p')) return;
      const tx = p.textContent.trim(); if (tx.length < 16) return; if (txH(p) <= 2) return;
      p.classList.add('slg-clamp'); if (!p.title) p.title = tx.slice(0, 300); }); }
  const CLAMP_NO = 'table, form, label, .sl-sheet, .modal, .mwrap, .chat, .aih, .fab, .slg-empty, #slgPop, .bkblk, .dpaper, [contenteditable], .cn-card, article, .obd, .gdbar, .g26, [class*="detail"], [class*="body"], [class*="paper"], [class*="preview"], [class*="pv"], .lp, iframe, pre, code';
  function emptyCard(m, id, g) { if (!g || typeof g.n !== 'function') return; let n = 1; try { n = g.n(); } catch (e) { return; } if (n > 0) return;
    if (m.querySelector('.slg-empty')) return; const f = firstOf(g);
    const card = document.createElement('div'); card.className = 'slg-empty'; card.setAttribute('role', 'status');
    card.innerHTML = `<span class="slg-eic">${ic('spark', 22)}</span><b>${esc(g.d)}</b><button type="button" class="btn pri" data-act="${esc(f.act)}" data-v="${esc(f.v)}" data-slg="first">${esc(f.l)}</button>${g.a && g.a.length ? `<div class="slg-asks">${askBtns(g)}</div>` : ''}`;
    const anchor = m.querySelector('.bview > .ph') || m.querySelector('.sl-page > .sl-h') || m.querySelector('.bview > .sl-page > .sl-h');
    if (anchor) anchor.after(card); else { const v = m.querySelector('.bview') || m; v.prepend(card); }
    /* 같은 뜻의 빈 표 · '없습니다' 문구는 숨긴다(카드 하나로) */
    m.querySelectorAll('.empty, .sl-empty').forEach(e => { if (!e.closest('.slg-empty') && !e.closest('.modal')) e.dataset.slgHide = 1; }); }
  function mount() { const m = $('#main'); if (!m || !S || !S.org) return; const id = slgKey(); if (!id) return; close();
    /* 1) 「가이드 보기」 · 문서 링크는 숨김(가이드 안으로) */
    m.querySelectorAll('.phr [data-act="g26-open"], .g26btn, a.gref').forEach(b => { b.dataset.slgHide = 1; });
    longParas(m);
    /* 2) 제목 옆 ⓘ 하나 */
    const h = titleEl(m); if (h) { h.querySelectorAll('.sl-i').forEach(b => b.remove()); if (!h.querySelector('.slg-i')) h.insertAdjacentHTML('beforeend', `<button type="button" class="slg-i" data-act="slg-open" aria-haspopup="dialog" aria-expanded="false" aria-label="화면 가이드">i</button>`); }
    /* 3) 데이터가 0이면 빈 상태 카드 */
    try { emptyCard(m, id, slgGuide(id)); } catch (e) { console.error(e); } }
  window.slgMount = mount;
  AFTER.push(() => { mount(); setTimeout(mount, 0); });
})();
