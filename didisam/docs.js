/* 디디쌤 스튜디오 v6 — 표준 문서함
   교육 담당자용 표준 문서(유형별 템플릿) 제공 · 기관 문서 업로드 · AI로 수정 · 과정 데이터 자동 채움 · 학습자/강사에게 제공 */
'use strict';

/* ── 문서 템플릿 ── 본문 형식: '# 제목' '## 절' '- 항목' '| 표 |' 빈 줄, {변수} */
const DCAT = ['계획', '운영', '평가', '결과 보고', '공문 · 행정', '안내 · 통신', '동의 · 규정'];
const ALLT = ['corp', 'univ', 'k12', 'adult', 'lifelong', 'voc'];
const DT = (id, name, cat, types, kw, body, desc) => ({ id, name, cat, types, kw, body: body.trim(), desc });
const DTPL = [
  DT('plan', '교육 운영 계획서', '계획', ALLT, /운영\s*계획서|교육\s*계획서/, `
# {과정명} 운영 계획서
{기관명} · 작성일 {작성일} · 작성자 {담당자}

## 1. 추진 배경 및 목적
- 배경: {과정명} 운영을 통해 {대상}의 직무 · 학습 역량을 높인다.
- 목적: 과정 이수 후 현장에서 바로 적용할 수 있는 실무 능력을 확보한다.

## 2. 교육 개요
| 항목 | 내용 |
| 과정명 | {과정명} |
| 교육 기간 | {시작일} ~ {종료일} |
| 교육 시간 | 총 {교육시간}시간 |
| 교육 대상 | {대상} {인원}명 |
| 교육 방법 | 온라인(디디쌤) + 실습 |
| 담당 강사 | {강사} |

## 3. 세부 운영 일정
{주차별일정}

## 4. 평가 및 이수 기준
- 진도율 80% 이상, 과제 · 평가 통과 시 이수 처리
- 이수자에게 수료증(또는 디지털 배지) 발급

## 5. 소요 예산
| 항목 | 산출 근거 | 금액(원) |
| 강사료 | 시간당 단가 × {교육시간}시간 | |
| 교재 · 콘텐츠 | 1인 × {인원}명 | |
| 운영비 | 플랫폼 · 다과 등 | |
| 합계 | | |

## 6. 기대 효과
- 정량: 이수율 90% 이상, 만족도 4.5점(5점 만점) 이상
- 정성: 학습 결과물을 실무에 적용한 사례 확보`, '목적 · 개요 · 일정 · 평가 · 예산 · 기대 효과'),
  DT('syllabus', '강의계획서', '계획', ALLT, /강의\s*계획서|실러버스/, `
# {과정명} 강의계획서
{기관명} · 담당 {강사} · {시작일} ~ {종료일}

## 1. 과정 소개
- {과정명}은 {대상}을 위한 과정으로, 핵심 개념과 실습을 함께 다룬다.

## 2. 학습 목표
- 핵심 개념을 설명할 수 있다.
- 실습 과제를 스스로 완성할 수 있다.
- 배운 내용을 자신의 업무 · 학습에 적용할 수 있다.

## 3. 주차별 계획
{주차별일정}

## 4. 평가 방법
| 평가 항목 | 비율 |
| 출석 · 진도 | 20% |
| 과제 | 40% |
| 시험 | 40% |

## 5. 교재 및 참고 자료
- 디디쌤 강의 영상 · 강의자료(주차별 제공)`, '과정 소개 · 학습 목표 · 주차 계획 · 평가 비율'),
  DT('budget', '교육 예산 계획서', '계획', ALLT, /예산\s*(계획|안)/, `
# {과정명} 예산 계획서
{기관명} · {작성일}

## 1. 예산 총괄
| 구분 | 금액(원) | 비고 |
| 인건비(강사료) | | {교육시간}시간 |
| 콘텐츠 · 교재비 | | {인원}명 |
| 운영비 | | 플랫폼 · 장소 |
| 합계 | | |

## 2. 산출 근거
- 강사료: 기관 강사료 지급 기준 적용
- 교재비: 1인 단가 × {인원}명

## 3. 집행 계획
- 개강 전: 콘텐츠 · 교재 구입
- 종료 후: 강사료 정산 및 결과 보고`, '총괄표 · 산출 근거 · 집행 계획'),
  DT('lecturer-req', '강사 섭외 요청 공문', '공문 · 행정', ALLT, /강사\s*(섭외|요청|초빙)/, `
# 강사 섭외 요청
수신: {강사} 님
발신: {기관명} {담당자}
제목: {과정명} 강사 섭외 요청

1. 귀하의 무궁한 발전을 기원합니다.
2. 우리 기관에서는 아래와 같이 {과정명}을 운영하고자 하오니, 강의를 맡아 주시기를 요청드립니다.

## 아래
| 항목 | 내용 |
| 과정명 | {과정명} |
| 일정 | {시작일} ~ {종료일} |
| 시간 | {교육시간}시간 |
| 대상 | {대상} {인원}명 |
| 장소 | {장소} |
| 강사료 | 기관 지급 기준에 따름 |

3. 회신은 {회신기한}까지 {연락처}로 부탁드립니다.

{기관명} {담당자}`, '수신 · 발신 · 제목 · 개요 표 · 회신 기한'),
  DT('lecturer-pay', '강사료 지급 품의서', '공문 · 행정', ALLT, /강사료|품의/, `
# 강사료 지급 품의
기안: {담당자} · 기안일 {작성일}

## 1. 품의 내용
{과정명} 강의를 진행한 강사에게 아래와 같이 강사료를 지급하고자 합니다.

## 2. 지급 내역
| 강사 | 강의 일자 | 시간 | 단가(원) | 금액(원) |
| {강사} | {시작일} ~ {종료일} | {교육시간} | | |

## 3. 첨부
- 출강 확인서 1부
- 강의 결과(출석부 · 만족도) 1부`, '지급 내역 · 첨부 목록'),
  DT('open-notice', '교육 개강 안내문', '안내 · 통신', ALLT, /개강\s*안내|안내문/, `
# {과정명} 개강 안내
안녕하세요, {기관명}입니다. {과정명}이 {시작일}에 시작합니다.

## 교육 안내
- 기간: {시작일} ~ {종료일}
- 방법: 디디쌤 온라인 강의실 + 과제 제출
- 이수 기준: 진도율 80% 이상 + 과제 · 평가 통과

## 처음 하실 일
- 로그인 후 '내 강의실'에서 {과정명}을 엽니다.
- 1주차 영상을 시청하고 확인 퀴즈를 풉니다.
- 캘린더 연결을 켜면 마감 전에 AI 튜터가 알려 드립니다.

문의: {담당자} · {연락처}`, '기간 · 방법 · 이수 기준 · 첫 할 일'),
  DT('attendance', '출석부', '운영', ALLT, /출석부|출결부/, `
# {과정명} 출석부
{기관명} · {시작일} ~ {종료일} · 담당 {강사}

{출석표}

- 표기: ○ 출석 · △ 지각/조퇴 · × 결석
- 출석률 80% 미만은 이수 불가`, '학습자 명단 × 회차 출결 표'),
  DT('journal', '교육 운영 일지', '운영', ALLT, /운영\s*일지|교육\s*일지/, `
# 교육 운영 일지
과정: {과정명} · 일자: {작성일} · 작성: {담당자}

| 항목 | 내용 |
| 교육 내용 | |
| 출석 | {인원}명 중 명 |
| 특이 사항 | |
| 다음 회차 준비 | |`, '일자별 내용 · 출석 · 특이 사항'),
  DT('survey', '교육 만족도 설문지', '평가', ALLT, /만족도\s*(설문|조사)/, `
# {과정명} 만족도 설문
응답은 익명으로 처리되며 교육 개선에만 활용합니다.

## 1. 전반적 만족도 (5점 척도)
| 문항 | 1 | 2 | 3 | 4 | 5 |
| 교육 내용이 목표에 맞았다 | | | | | |
| 강사의 설명이 이해하기 쉬웠다 | | | | | |
| 실습 · 과제가 도움이 되었다 | | | | | |
| 학습 플랫폼이 편리했다 | | | | | |
| 다른 사람에게 추천하겠다 | | | | | |

## 2. 서술 문항
- 가장 도움이 된 내용은 무엇입니까?
- 개선이 필요한 점을 적어 주십시오.`, '5점 척도 5문항 + 서술 2문항'),
  DT('score', '성취도 평가 결과표', '평가', ALLT, /성취도|평가\s*결과표|성적표/, `
# {과정명} 성취도 평가 결과
{기관명} · {작성일}

{성적표}

- 이수 기준: 진도 80% 이상 + 평가 60점 이상
- 개인정보 보호를 위해 학번(또는 ID)만 표기합니다.`, '학습자별 진도 · 점수 · 이수 여부'),
  DT('result', '교육 결과 보고서', '결과 보고', ALLT, /결과\s*보고/, `
# {과정명} 결과 보고서
{기관명} · 보고일 {작성일} · 작성 {담당자}

## 1. 교육 개요
| 항목 | 내용 |
| 과정명 | {과정명} |
| 기간 | {시작일} ~ {종료일} |
| 대상 · 인원 | {대상} {인원}명 |

## 2. 운영 결과
| 지표 | 결과 |
| 평균 진도율 | {평균진도}% |
| 이수 인원 | {이수인원}명 ({이수율}%) |
| 과제 제출 | {제출수}건 |

## 3. 성과 및 시사점
- 성과: 이수율 {이수율}% 달성
- 개선점: 진도 부진자 조기 독려 필요

## 4. 향후 계획
- 다음 기수 운영 시 만족도 조사 결과 반영

## 첨부
- 출석부 · 만족도 결과 · 수료자 명단`, '개요 · 운영 결과(실데이터) · 성과 · 향후 계획'),
  DT('cert-confirm', '이수(수료) 확인서', '운영', ALLT, /이수\s*확인서|수료\s*확인서/, `
# 이수 확인서
성명(ID): {학습자}
과정명: {과정명}
기간: {시작일} ~ {종료일} ({교육시간}시간)

위 사람은 {기관명}에서 실시한 위 교육을 이수하였음을 확인합니다.

{작성일}
{기관명} (인)`, '개인별 이수 확인'),
  DT('privacy', '개인정보 수집 · 이용 동의서', '동의 · 규정', ALLT, /개인정보|동의서/, `
# 개인정보 수집 · 이용 동의서
{기관명}은 교육 운영을 위해 아래와 같이 개인정보를 수집 · 이용합니다.

| 항목 | 내용 |
| 수집 항목 | {수집항목} |
| 이용 목적 | 수강 관리, 이수 확인, 교육 안내 |
| 보유 기간 | 교육 종료 후 3년(관계 법령에 따름) |

- 동의를 거부할 권리가 있으며, 거부 시 수강이 제한될 수 있습니다.

□ 동의함  □ 동의하지 않음
{작성일} · 성명(ID): ________ (서명)`, '수집 항목 · 목적 · 보유 기간 · 거부권'),
  DT('refund', '수강 환불 규정', '동의 · 규정', ['adult', 'k12', 'lifelong', 'voc'], /환불\s*규정|반환\s*규정/, `
# 수강료 환불 규정
{기관명}

| 환불 사유 발생 시점 | 환불 금액 |
| 수강 시작 전 | 이미 낸 수강료 전액 |
| 총 수강 기간의 1/3 경과 전 | 이미 낸 수강료의 2/3 |
| 총 수강 기간의 1/2 경과 전 | 이미 낸 수강료의 1/2 |
| 총 수강 기간의 1/2 경과 후 | 반환하지 않음 |

- 환불 신청 후 5영업일 이내 처리합니다.
- 온라인 강의는 실제 수강한 분량을 기준으로 산정합니다.`, '시점별 환불 금액 표(학원법 · 평생교육법 기준)'),
  DT('photo', '초상권 · 촬영 동의서', '동의 · 규정', ALLT, /초상권|촬영\s*동의/, `
# 초상권 · 촬영 동의서
{기관명}은 {과정명} 운영 기록과 홍보를 위해 사진 · 영상을 촬영합니다.

- 이용 범위: 기관 홈페이지 · 결과 보고서 · 홍보물
- 보유 기간: 촬영일로부터 3년

□ 동의함  □ 동의하지 않음
{작성일} · 성명: ________ (서명)`, '이용 범위 · 보유 기간'),
  /* 기업 */
  DT('corp-annual', '연간 사내교육 계획(품의)', '계획', ['corp'], /연간\s*(교육\s*)?계획|사내\s*교육\s*계획/, `
# {연도}년 사내교육 연간 계획
{기관명} 인재개발팀 · {작성일}

## 1. 교육 체계
| 구분 | 과정 | 대상 | 시기 |
| 법정의무교육 | 4대 법정교육 | 전 임직원 | 상반기 |
| 직무 교육 | {과정명} | {대상} | 분기별 |
| 리더십 | 리더 과정 | 팀장급 | 하반기 |

## 2. 예산
- 총 예산: 원 (고용보험 환급 과정 우선 활용)

## 3. 성과 지표
- 1인당 교육 시간 20시간 이상, 법정교육 이수율 100%`, '교육 체계 · 예산 · 성과 지표'),
  DT('corp-legal', '법정의무교육 이수 현황 보고', '결과 보고', ['corp'], /법정\s*(의무\s*)?교육.*(현황|보고)/, `
# 법정의무교육 이수 현황 보고
{기관명} · {작성일}

| 교육 | 대상 | 이수 | 이수율 | 마감 |
| 성희롱 예방 | {총인원} | | | |
| 개인정보 보호 | {총인원} | | | |
| 장애인 인식 개선 | {총인원} | | | |
| 직장 내 괴롭힘 예방 | {총인원} | | | |

- 미이수자는 마감 D-7부터 자동 독려합니다.`, '4종 이수율 표'),
  DT('corp-external', '외부 교육 참가 신청서', '공문 · 행정', ['corp'], /외부\s*교육/, `
# 외부 교육 참가 신청서
신청자: ________ · 부서: ________

| 항목 | 내용 |
| 교육명 | |
| 기관 | |
| 기간 | |
| 비용 | |
| 업무 적용 계획 | |

팀장 확인: ________ · 인재개발팀 확인: ________`, '교육명 · 비용 · 업무 적용 계획'),
  DT('corp-onboard', '신규 입사자 교육 체크리스트', '운영', ['corp'], /입사자|온보딩/, `
# 신규 입사자 교육 체크리스트
입사자: ________ · 입사일: ________ · 멘토: ________

| 주차 | 내용 | 완료 |
| 1주차 | 회사 소개 · 조직 문화 | □ |
| 1주차 | 법정의무교육 4종 | □ |
| 2주차 | 업무 도구 · 보안 교육 | □ |
| 3~4주차 | 직무 기초 · 멘토 미팅 | □ |`, '주차별 온보딩 항목 체크'),
  /* 대학 */
  DT('univ-extra-plan', '비교과 프로그램 운영계획서', '계획', ['univ'], /비교과.*계획서?/, `
# 비교과 프로그램 운영계획서
프로그램명: {과정명} · 주관: {기관명} · 작성 {작성일}

## 1. 프로그램 개요
| 항목 | 내용 |
| 목적 | 핵심 역량 함양 |
| 대상 | {대상} {인원}명 |
| 기간 | {시작일} ~ {종료일} |
| 연계 핵심역량 | 디지털 · 문제해결 |

## 2. 운영 내용
{주차별일정}

## 3. 성과 측정
- 사전 · 사후 역량 진단(AI 진단) 비교
- 이수 시 디지털 배지 · 비교과 마일리지 부여`, '개요 · 핵심역량 · 사전/사후 진단'),
  DT('univ-extra-result', '비교과 프로그램 결과보고서', '결과 보고', ['univ'], /비교과.*결과(\s*보고서?)?/, `
# 비교과 프로그램 결과보고서
{과정명} · {기관명} · {작성일}

| 지표 | 결과 |
| 참여 인원 | {인원}명 |
| 이수 인원 | {이수인원}명 ({이수율}%) |
| 평균 진도 | {평균진도}% |
| 배지 발급 | {배지수}개 |

## 성과 분석
- 사전 대비 사후 역량 점수 향상
- 우수 결과물 사례`, '참여 · 이수 · 배지 · 역량 향상'),
  DT('univ-prof-req', '교수 협조 요청 공문', '공문 · 행정', ['univ'], /교수\s*협조|협조\s*요청/, `
# 협조 요청
수신: 각 학과(부) 교수님
발신: {기관명}
제목: {과정명} 운영 협조 요청

1. 귀 학과의 무궁한 발전을 기원합니다.
2. 본 센터에서 운영하는 {과정명}에 학생 참여를 안내해 주시기를 요청드립니다.
  - 기간: {시작일} ~ {종료일}
  - 신청: 학습 포털에서 AI 진단 후 신청
3. 문의: {담당자} ({연락처})`, '학과 대상 참여 안내 협조'),
  DT('univ-diag', 'AI 진단 결과 활용 보고', '결과 보고', ['univ'], /진단\s*결과\s*(활용\s*)?보고/, `
# AI 역량 진단 결과 활용 보고
{기관명} · {작성일}

{진단분포}

## 활용 계획
- 결과 유형별 러닝 저니 배정 완료
- 하위 수준 학생 대상 기초 과정 우선 안내`, '진단 응시 · 결과 분포 · 저니 배정'),
  /* 초중고 학원 */
  DT('k12-letter', '가정통신문', '안내 · 통신', ['k12'], /가정\s*통신문/, `
# 가정통신문
{기관명} · {작성일}

학부모님, 안녕하십니까.
{과정명} 관련하여 아래와 같이 안내드립니다.

## 안내 사항
- 일정: {시작일} ~ {종료일}
- 준비물: 필기구, 개인 태블릿(선택)
- 문의: {연락처}

자녀의 학습에 늘 관심 가져 주셔서 감사합니다.`, '학부모 대상 일정 · 준비물 안내'),
  DT('k12-consult', '학부모 상담일지', '운영', ['k12'], /상담\s*일지/, `
# 학부모 상담일지
원생: ________ · 반: ________ · 상담일: {작성일} · 상담자: {담당자}

| 항목 | 내용 |
| 상담 방법 | 전화 / 방문 / 온라인 |
| 상담 내용 | |
| 학습 현황 | 진도 % · 최근 테스트 점 |
| 후속 조치 | |
| 다음 상담 예정일 | |`, '상담 내용 · 학습 현황 · 후속 조치'),
  DT('k12-report', '월간 학습 리포트', '결과 보고', ['k12'], /학습\s*리포트|월간\s*리포트/, `
# {월}월 학습 리포트
원생: {학습자} · 반: {과정명}

| 항목 | 이번 달 |
| 출석 | % |
| 진도 | % |
| 테스트 평균 | 점 |
| 과제 제출 | 회 |

## 선생님 코멘트
- 잘한 점:
- 보완할 점:`, '출석 · 진도 · 테스트 · 코멘트'),
  DT('k12-makeup', '보강 안내문', '안내 · 통신', ['k12'], /보강/, `
# 보강 안내
{과정명} 결석 원생을 위한 보강 일정을 안내드립니다.

- 보강 방법: 온라인 강의 시청 + 확인 테스트
- 기한: 결석일로부터 7일 이내
- 문의: {연락처}`, '결석자 보강 방법 · 기한'),
  /* 성인 학원 */
  DT('adult-apply', '수강 신청서', '운영', ['adult', 'lifelong'], /수강\s*신청서/, `
# 수강 신청서
{기관명}

| 항목 | 내용 |
| 신청 과정 | {과정명} |
| 수강 기간 | {시작일} ~ {종료일} |
| 수강료 | {교육비} |
| 결제 방법 | 카드 / 계좌이체 |

- 환불은 수강 환불 규정에 따릅니다.
신청일: {작성일} · 신청자: ________ (서명)`, '과정 · 기간 · 수강료 · 결제'),
  DT('adult-review', '수강 후기 요청 안내', '안내 · 통신', ['adult'], /후기\s*요청/, `
# 수강 후기 요청
{과정명} 수강을 마치신 것을 축하드립니다.
솔직한 후기를 남겨 주시면 다음 수강생에게 큰 도움이 됩니다.

- 작성 위치: 홈페이지 › 수강후기
- 작성 혜택: 다음 강좌 할인 쿠폰`, '수료 후 후기 요청'),
  /* 평생교육원 */
  DT('life-report', '평생교육 강좌 개설 계획(신고)', '공문 · 행정', ['lifelong'], /강좌\s*개설|과정\s*신고/, `
# 평생교육 강좌 개설 계획
{기관명} · {작성일}

| 항목 | 내용 |
| 강좌명 | {과정명} |
| 교육 기간 | {시작일} ~ {종료일} |
| 총 교육 시간 | {교육시간}시간 (신고 기준 30시간 이상) |
| 모집 인원 | {인원}명 (10명 이상) |
| 학습비 | {교육비} |
| 강사 | {강사} |

- 학습비 반환 기준과 약관을 함께 게시합니다.`, '30시간 · 10명 요건 · 학습비'),
  DT('life-refund', '학습비 반환 신청서', '공문 · 행정', ['lifelong'], /학습비\s*반환/, `
# 학습비 반환 신청서
강좌명: {과정명} · 신청일: {작성일}

| 항목 | 내용 |
| 신청 사유 | |
| 수강 진행 정도 | |
| 반환 계좌 | (본인 명의, 별도 보관) |

- 신청일로부터 5일 이내 반환합니다(평생교육법 시행령 기준).`, '반환 사유 · 5일 이내 처리'),
  /* 직업훈련원 */
  DT('voc-journal', '훈련 일지(HRD)', '운영', ['voc'], /훈련\s*일지/, `
# 훈련 일지
훈련과정: {과정명} · 훈련일: {작성일} · 훈련교사: {강사}

| 교시 | 훈련 내용 | 방법 |
| 1~2 | | 이론 |
| 3~4 | | 실습 |

| 재적 | 출석 | 결석 | 지각 · 조퇴 |
| {인원} | | | |

특이 사항:`, '교시별 내용 · 출결 집계'),
  DT('voc-absence', '결석 사유서', '운영', ['voc'], /결석\s*사유/, `
# 결석 사유서
훈련생: ________ · 과정: {과정명}

| 결석일 | 사유 | 증빙 |
| | | |

- 출석률 80% 미만 시 수료 및 훈련장려금 지급이 제한됩니다.
제출일: {작성일} · 확인: {강사}`, '결석일 · 사유 · 증빙'),
  DT('voc-employer', '사업주 위탁훈련 결과 통보서', '결과 보고', ['voc', 'corp'], /위탁\s*훈련|결과\s*통보/, `
# 위탁훈련 결과 통보서
수신: 위탁 사업주 · 발신: {기관명} · {작성일}

| 항목 | 내용 |
| 훈련과정 | {과정명} |
| 훈련 기간 | {시작일} ~ {종료일} |
| 훈련 인원 | {인원}명 |
| 수료 인원 | {이수인원}명 |

- 고용보험 환급 서류를 함께 송부합니다.`, '훈련 인원 · 수료 인원 · 환급 서류')
];
const DOCS = () => S.docs || (S.docs = []);
const DVARS = ['기관명', '과정명', '시작일', '종료일', '교육시간', '대상', '인원', '담당자', '강사', '장소', '연락처', '작성일', '교육비', '연도', '월', '회신기한', '수집항목', '총인원', '평균진도', '이수인원', '이수율', '제출수', '배지수', '학습자'];

/* 과정 데이터로 변수 채우기(이름 대신 ID · 학번만) */
function docVals(c) {
  const v = { 기관명: S.org.name, 작성일: today(), 담당자: S.me.name || '교육 담당자', 연락처: S.settings.footer?.tel || '', 장소: S.settings.footer?.addr || '온라인(디디쌤)', 연도: today().slice(0, 4), 월: String(+today().slice(5, 7)), 회신기한: addDays(today(), 7), 수집항목: S.org.type === 'univ' ? '학번, 학과' : '이름, 연락처(ID)', 총인원: String(S.members.length), 대상: t('learner') };
  if (c) { const P = Object.values(c.prog || {}); const done = P.filter(p => p.p >= (c.criteria?.threshold || 80)).length; const tch = S.admins.find(a => a.role === 'teacher' && (a.classes || []).includes(c.id));
    Object.assign(v, { 과정명: c.name, 시작일: c.start || '', 종료일: c.end || '', 교육시간: String(c.hours || ''), 인원: String(c.learners?.length || P.length), 강사: tch?.name || t('teacher'), 교육비: c.price ? Number(c.price).toLocaleString() + '원' : '무료', 평균진도: String(Math.round(P.reduce((a, p) => a + (p.p || 0), 0) / Math.max(1, P.length))), 이수인원: String(done), 이수율: String(Math.round(done / Math.max(1, P.length) * 100)), 제출수: String(P.filter(p => p.assign && p.assign !== 'none').length), 배지수: String((S.badges || []).reduce((a, b) => a + (b.issued || []).filter(x => c.learners?.includes(x.who)).length, 0)) }); }
  return v;
}
const mid = id => { const m = M(id); return m?.extra?.['학번'] || m?.sid || id; };
function docBlocks(c) {
  if (!c) return {};
  const W = c.weekly && c.weekPlan?.length ? c.weekPlan.map(w => [`${w.w}주`, w.title, c.curriculum.filter(i => i.week === w.w).map(i => ITEMX[i.type]).join(' · ')]) : c.curriculum.filter(i => i.type !== 'chapter').slice(0, 15).map((i, k) => [`${k + 1}차시`, i.title, ITEMX[i.type]]);
  const L = (c.learners || []).slice(0, 30); const n = Math.min(8, c.weekly ? (c.weekPlan || []).length : 8) || 8;
  return {
    주차별일정: ['| 주차 | 주제 | 학습 활동 |', ...W.map(r => `| ${r.join(' | ')} |`)].join('\n'),
    출석표: [`| ID | ${Array.from({ length: n }, (_, i) => `${i + 1}회`).join(' | ')} | 출석률 |`, ...L.map(id => { const a = c.prog[id]?.att ?? 90; return `| ${mid(id)} | ${Array.from({ length: n }, (_, i) => (i * 13 + a) % 10 < a / 10 ? '○' : '×').join(' | ')} | ${a}% |`; })].join('\n'),
    성적표: ['| ID | 진도 | 과제 | 시험 | 이수 |', ...L.map(id => { const p = c.prog[id] || {}; return `| ${mid(id)} | ${p.p ?? 0}% | ${p.score ?? '-'} | ${p.exam ?? '-'} | ${(p.p || 0) >= (c.criteria?.threshold || 80) ? '이수' : '미이수'} |`; })].join('\n'),
    진단분포: (() => { const d = (S.diags || [])[0]; if (!d) return '- 진행한 진단이 없습니다.'; const R = Object.values(d.res || {}); return [`- 진단: ${d.name} · 응시 ${R.length}명`, '| 결과 | 인원 |', ...(d.outs || []).map(o => `| ${o.l} | ${R.filter(r => r.out === o.k).length} |`)].join('\n'); })()
  };
}
function fillDoc(body, c) { const v = { ...docVals(c), ...docBlocks(c) }; let n = 0; const out = body.replace(/\{([가-힣A-Za-z0-9]+)\}/g, (m, k) => (v[k] !== undefined && v[k] !== '') ? (n++, v[k]) : m); return { body: out, n }; }
const unfilled = b => [...new Set((b.match(/\{([가-힣A-Za-z0-9]+)\}/g) || []))];

/* 본문 → HTML(이스케이프 후 최소 서식) */
function docHTML(body) {
  const L = String(body).split('\n'); let h = '', tb = null, ul = false;
  const flush = () => { if (tb) { h += `<table>${tb.map((r, i) => `<tr>${r.map(x => i === 0 ? `<th>${x}</th>` : `<td>${x}</td>`).join('')}</tr>`).join('')}</table>`; tb = null; } if (ul) { h += '</ul>'; ul = false; } };
  const inl = s => esc(s).replace(/\{([가-힣A-Za-z0-9]+)\}/g, '<mark>{$1}</mark>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  L.forEach(l => { const s = l.trim();
    if (/^\|.*\|$/.test(s)) { if (ul) { h += '</ul>'; ul = false; } (tb = tb || []).push(s.slice(1, -1).split('|').map(x => inl(x.trim()))); return; }
    if (/^- /.test(s)) { if (tb) flush(); if (!ul) { h += '<ul>'; ul = true; } h += `<li>${inl(s.slice(2))}</li>`; return; }
    flush(); if (!s) return; if (/^# /.test(s)) h += `<h1>${inl(s.slice(2))}</h1>`; else if (/^## /.test(s)) h += `<h2>${inl(s.slice(3))}</h2>`; else h += `<p>${inl(s)}</p>`; });
  flush(); return h;
}
const DOC_CSS = 'body{font:14px/1.7 "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;color:#15173B;max-width:760px;margin:32px auto;padding:0 24px}h1{font-size:24px;border-bottom:3px solid #15173B;padding-bottom:8px}h2{font-size:16px;border-left:4px solid #D6246E;padding-left:8px;margin-top:22px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #C9C6BE;padding:6px 8px;text-align:left;vertical-align:top}th{background:#F7F6F2}mark{background:#FFF3D6;color:#8A5A00}@page{size:A4;margin:18mm}';
const docFile = (d, word) => `<!doctype html><html lang="${d.lang || 'ko'}"><head><meta charset="utf-8"><title>${esc(d.name)}</title>${word ? '' : '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'}<style>${DOC_CSS}</style></head><body>${docHTML(d.body)}<p style="color:#5D6078;font-size:12px;margin-top:32px">${esc(S.org.name)} 표준 문서 · ${esc(d.at || today())}</p></body></html>`;

/* ── AI 수정(데모는 규칙 기반, 운영은 서버 Claude) ── */
const FORMAL = [[/한다\./g, '합니다.'], [/([가-힣])이다\./g, '$1입니다.'], [/된다\./g, '됩니다.'], [/해요\./g, '합니다.'], [/하세요\./g, '하시기 바랍니다.'], [/주세요\./g, '주시기 바랍니다.'], [/(이에요|예요)\./g, '입니다.'], [/있어요\./g, '있습니다.'], [/돼요\./g, '됩니다.'], [/드려요\./g, '드립니다.']];
const FRIENDLY = [[/한다\./g, '해요.'], [/된다\./g, '돼요.'], [/하시기 바랍니다\./g, '해 주세요.'], [/주시기 바랍니다\./g, '주세요.'], [/합니다\./g, '해요.'], [/입니다\./g, '이에요.'], [/있습니다\./g, '있어요.'], [/됩니다\./g, '돼요.'], [/드립니다\./g, '드려요.']];
async function docEdit(d, q, c) { let b = d.body; const ch = [];
  const rep = (P, label) => { let n = 0; P.forEach(([r, s]) => { const k = (b.match(r) || []).length; if (k) { n += k; b = b.replace(r, s); } }); if (n) ch.push(`${label} ${n}곳`); };
  if (/격식|공문체|정중|딱딱/.test(q)) rep(FORMAL, '격식체로');
  if (/친근|부드럽|쉽게/.test(q)) rep(FRIENDLY, '친근한 말투로');
  if (/짧게|간결|줄여/.test(q)) { let n = 0; b = b.split('\n').map(l => { if (/^(#|\||$)/.test(l.trim())) return l; const pre = l.match(/^\s*(- |\d+\.\s*)?/)[0]; const s = l.slice(pre.length); const p = s.split(/(?<=[.다요])\s+/); if (p.length > 1) { n++; return pre + p[0]; } return l; }).join('\n'); if (n) ch.push(`문장 ${n}곳 줄임`); }
  const RQ = /[「"“']([^」"”']{1,30})[」"”']\s*(을|를)\s*[「"“']([^」"”']{0,40})[」"”']\s*(으로|로)\s*(바꿔|변경|수정|고쳐)/g, RU = /([^\s,「"“']{1,20})\s*(을|를)\s*([^\s,]{1,30}?)\s*(으로|로)\s*(바꿔|변경|수정|고쳐)/g;
  for (const m of q.matchAll(/[「"“']/.test(q) ? RQ : RU)) { const [, a, , z] = m; if (b.includes(a)) { const n = b.split(a).length - 1; b = b.split(a).join(z); ch.push(`「${a}」→「${z}」 ${n}곳`); } }
  for (const m of q.matchAll(/([가-힣A-Za-z0-9 ·]{2,20}?)\s*(항목|섹션|절|란)\s*(을|를)?\s*(추가|넣어)/g)) { const name = m[1].trim(); const k = (b.match(/^## /gm) || []).length + 1; b += `\n\n## ${k}. ${name}\n- 내용을 입력하세요.`; ch.push(`「${name}」 절 추가`); }
  for (const m of q.matchAll(/([가-힣A-Za-z0-9 ·]{2,20}?)\s*(항목|섹션|절|란)?\s*(을|를)?\s*(빼|삭제|지워|없애)/g)) { const name = m[1].trim(); const L = b.split('\n'); const i = L.findIndex(l => /^## /.test(l) && l.includes(name)); if (i >= 0) { let j = i + 1; while (j < L.length && !/^## /.test(L[j])) j++; L.splice(i, j - i); b = L.join('\n'); ch.push(`「${name}」 절 삭제`); } }
  if (/표로/.test(q)) { const L = b.split('\n'); const out = []; let run = []; const fl = () => { if (run.length > 1) { out.push('| 항목 | 내용 |', ...run.map(r => `| ${r[0]} | ${r[1]} |`)); ch.push(`목록 ${run.length}줄을 표로`); } else run.forEach(r => out.push(`- ${r[0]}: ${r[1]}`)); run = []; };
    L.forEach(l => { const m = l.match(/^- ([^:：]{1,20})[:：]\s*(.+)$/); if (m) run.push([m[1], m[2]]); else { fl(); out.push(l); } }); fl(); b = out.join('\n'); }
  if (/번호/.test(q)) { let k = 0, n = 0; b = b.split('\n').map(l => { if (/^- /.test(l)) { n++; return `${++k}. ${l.slice(2)}`; } k = 0; return l; }).join('\n'); if (n) ch.push(`번호 목록 ${n}줄`); }
  if (/채워|채우|맞춰|맞춤|자동/.test(q) || c) { const r = fillDoc(b, c); if (r.n) { b = r.body; ch.push(`과정 데이터 ${r.n}칸 채움`); } }
  const LK = { 영어: 'en', 일본어: 'ja', 중국어: 'zh-CN', 베트남어: 'vi', 태국어: 'th', 인도네시아어: 'id', 스페인어: 'es', 프랑스어: 'fr' }; const tl = Object.entries(LK).find(([k]) => q.includes(k));
  if (tl && /번역|로\s*(바꿔|만들)/.test(q)) { const to = tl[1]; const L = b.split('\n'); const out = []; let ok = true;
    for (const l of L) { const pre = (l.match(/^(#{1,2} |- |\| )/) || [''])[0]; if (/^\|/.test(l)) { const cells = l.slice(1, -1).split('|'); const tc = []; for (const x of cells) { const r = x.trim() ? await trText(x.trim(), to) : { t: '' }; if (!r) { ok = false; break; } tc.push(r.t); } if (!ok) break; out.push(`| ${tc.join(' | ')} |`); continue; } const s = l.slice(pre.length).trim(); if (!s) { out.push(l); continue; } const r = await trText(s, to); if (!r) { ok = false; break; } out.push(pre + r.t); }
    if (ok) { b = out.join('\n'); d.lang = to; ch.push(`${langName(to)} 번역`); } else ch.push(`${langName(to)} 번역 대기(이 브라우저는 내장 번역 미지원 — 운영 모드 번역 API)`); }
  if (/검토|점검|확인해/.test(q)) ch.push(...docCheck({ ...d, body: b }).map(x => '검토: ' + x));
  d.body = b; return ch; }
function docCheck(d) { const R = []; const u = unfilled(d.body); if (u.length) R.push(`빈 칸 ${u.length}개(${u.slice(0, 5).join(' ')})`);
  if (/동의서|개인정보/.test(d.name) && !/거부/.test(d.body)) R.push('동의 거부권 안내가 없습니다');
  if (/공문|요청|품의/.test(d.name) && !/(수신|기안)/.test(d.body)) R.push('수신 · 기안 표시가 없습니다');
  if (/(주민등록번호|주민번호|계좌번호)\s*[:：]?\s*\d/.test(d.body)) R.push('민감 개인정보 숫자가 들어 있습니다 — 삭제하세요');
  const long = d.body.split('\n').filter(l => l.length > 140).length; if (long) R.push(`140자 넘는 긴 줄 ${long}개`);
  if (!R.length) R.push('문제를 찾지 못했습니다'); return R; }

/* ── 업로드: txt · md · html · csv · pdf · docx(브라우저에서 직접 읽음, 서버 전송 없음) ── */
async function unzipEntry(buf, name) { const v = new DataView(buf); let e = buf.byteLength - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('zip');
  let p = v.getUint32(e + 16, true); const cnt = v.getUint16(e + 10, true); const td = new TextDecoder();
  for (let i = 0; i < cnt; i++) { const meth = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true); const fn = td.decode(new Uint8Array(buf, p + 46, nl));
    if (fn === name) { const ln = v.getUint16(lo + 26, true), lx = v.getUint16(lo + 28, true); const data = new Uint8Array(buf, lo + 30 + ln + lx, csz); if (meth === 0) return td.decode(data); const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(s).text(); }
    p += 46 + nl + xl + cl; } throw new Error('no ' + name); }
function docxText(xml) { const doc = new DOMParser().parseFromString(xml, 'application/xml'); const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'; const out = [];
  const para = p => [...p.getElementsByTagNameNS(W, 't')].map(t => t.textContent).join('');
  const body = doc.getElementsByTagNameNS(W, 'body')[0]; if (!body) return '';
  [...body.children].forEach(n => { if (n.localName === 'p') { const s = para(n).trim(); const st = n.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttribute('w:val') || ''; out.push(/^Title$/i.test(st) ? '# ' + s : /Heading|^[123]$/i.test(st) ? '## ' + s : s); }
    else if (n.localName === 'tbl') { [...n.getElementsByTagNameNS(W, 'tr')].forEach(tr => out.push('| ' + [...tr.getElementsByTagNameNS(W, 'tc')].map(tc => para(tc).replace(/\|/g, '/').trim()).join(' | ') + ' |')); out.push(''); } });
  return out.join('\n').replace(/\n{3,}/g, '\n\n'); }
async function readDocFile(f) { if (f.size > 8e6) throw new Error('8MB 이하 파일만 올릴 수 있습니다.');
  if (/\.(hwp|hwpx)$/i.test(f.name)) throw new Error('한글(hwp) 파일은 PDF나 Word로 저장해 올려 주세요.');
  if (/\.docx$/i.test(f.name)) return docxText(await unzipEntry(await f.arrayBuffer(), 'word/document.xml'));
  if (/\.pdf$/i.test(f.name)) { await loadPdf(); const pdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; let t = ''; for (let i = 1; i <= Math.min(30, pdf.numPages); i++) { const pg = await pdf.getPage(i); t += (await pg.getTextContent()).items.map(x => x.str + (x.hasEOL ? '\n' : ' ')).join('') + '\n'; } return t; }
  const raw = await f.text(); if (/\.html?$/i.test(f.name)) { const d = new DOMParser().parseFromString(raw, 'text/html'); d.querySelectorAll('script,style').forEach(x => x.remove()); return [...d.body.querySelectorAll('h1,h2,h3,p,li,tr')].map(e => e.tagName === 'H1' ? '# ' + e.textContent.trim() : /H[23]/.test(e.tagName) ? '## ' + e.textContent.trim() : e.tagName === 'LI' ? '- ' + e.textContent.trim() : e.tagName === 'TR' ? '| ' + [...e.children].map(x => x.textContent.trim()).join(' | ') + ' |' : e.textContent.trim()).join('\n'); }
  if (/\.csv$/i.test(f.name)) return raw.split(/\r?\n/).filter(Boolean).slice(0, 300).map(l => '| ' + l.split(',').map(x => x.replace(/^"|"$/g, '')).join(' | ') + ' |').join('\n');
  return raw; }
/* 기관 고유값을 변수로 바꿔 '표준 문서'로 만들기 */
function standardize(body) { let b = body, n = 0; const sw = (a, k) => { if (a && a.length >= 2 && b.includes(a)) { n += b.split(a).length - 1; b = b.split(a).join(`{${k}}`); } };
  sw(S.org.name, '기관명'); S.classes.forEach(c => sw(c.name, '과정명')); b = b.replace(/20\d{2}[.\-/년]\s?\d{1,2}[.\-/월]\s?\d{1,2}일?/g, () => (n++, '{작성일}'));
  b = b.replace(/\d{6}-[1-4]\d{6}/g, () => (n++, '{주민번호 삭제됨}')); return { body: b, n }; }

/* ── 화면 ── */
MENU.docs = { label: '표준 문서', ws: 'ops' };
Object.values(PRESET).forEach(p => { if (!p.on.includes('docs')) p.on.push('docs'); });
const dtFor = ty => DTPL.filter(d => d.types.includes(ty));
VIEWS.docs = () => { const tb = UI.docT || 'tpl'; const ty = S.org.type; const mine = DOCS();
  let body = '';
  if (tb === 'tpl') { const f = UI.docF || '전체'; const scope = UI.docS || 'mine'; const q = (UI.docQ || '').trim();
    const L = (scope === 'mine' ? dtFor(ty) : DTPL).filter(d => (f === '전체' || d.cat === f) && (!q || (d.name + d.desc).includes(q)));
    body = `<div class="bar2"><div class="seg2"><button class="${scope === 'mine' ? 'on' : ''}" data-act="doc-scope" data-v="mine">${esc(TYPES[ty].name)} 추천 ${dtFor(ty).length}</button><button class="${scope === 'all' ? 'on' : ''}" data-act="doc-scope" data-v="all">전체 ${DTPL.length}</button></div><input id="docQ" class="dsearch" placeholder="문서 검색" value="${esc(q)}" aria-label="문서 검색"></div>
      <div class="lchips">${['전체', ...DCAT].map(c => `<button class="chip ${f === c ? 'on' : ''}" data-act="doc-f" data-v="${c}">${c}</button>`).join('')}</div>
      <div class="dgrid">${L.map(d => `<div class="card dcard"><span class="dcat">${esc(d.cat)}</span><b>${esc(d.name)}</b><small>${esc(d.desc)}</small><div class="mini">${d.types.length === 6 ? '모든 기관' : d.types.map(k => TYPES[k].name).join(' · ')} · 빈 칸 ${unfilled(d.body).length}개</div><div class="bar2"><button class="btn sm" data-act="doc-pv" data-v="${d.id}">미리 보기</button><button class="btn sm ink" data-act="doc-use" data-v="${d.id}">${ic('spark', 14)} 내 문서로 만들기</button></div></div>`).join('') || '<div class="empty">조건에 맞는 문서가 없습니다.</div>'}</div>`; }
  if (tb === 'mine') body = `<div class="bar2"><label class="btn ink">${'+'} 문서 올리기(.docx · .pdf · .txt · .md · .html · .csv)<input type="file" id="docUp" accept=".docx,.pdf,.txt,.md,.html,.htm,.csv" hidden></label><button class="btn" data-act="doc-blank">빈 문서</button><span class="mini">올린 파일은 이 브라우저에서 읽어 텍스트로 바꿉니다(서버로 보내지 않음). 한글(hwp)은 PDF · Word로 저장해 올려 주세요.</span></div>` +
    (mine.length ? `<div class="card">${table(['문서', '분류', '출처', '공개 범위', '수정', ''], mine.map(d => [`<button class="link" data-act="doc-open" data-v="${d.id}">${esc(d.name)}</button>${unfilled(d.body).length ? ' ' + tag(`빈 칸 ${unfilled(d.body).length}`, 'y') : ''}`, esc(d.cat), esc({ tpl: '표준 템플릿', upload: '업로드', ai: 'AI 생성', blank: '직접 작성' }[d.src] || d.src), tag(d.vis, d.vis === '내부' ? '' : 'g'), esc(d.at), `<button class="btn sm ghost" data-act="doc-open" data-v="${d.id}">편집</button><button class="btn sm ghost" data-act="doc-share" data-v="${d.id}">제공</button><button class="btn sm ghost" data-act="doc-del" data-v="${d.id}" aria-label="삭제">${ic('x', 14)}</button>`]))}</div>` : '<div class="empty">아직 문서가 없습니다. 표준 문서 템플릿에서 만들거나 기관 문서를 올리세요.</div>');
  if (tb === 'sent') { const R = mine.flatMap(d => (d.sent || []).map(s => [esc(s.at), esc(d.name), esc(s.to), esc(s.how), String(s.n)])); body = `<div class="card">${table(['일시', '문서', '대상', '방법', '인원'], R, '아직 제공한 문서가 없습니다.')}</div>`; }
  return head('', `교육 담당자에게 필요한 표준 문서를 고르고, 과정 데이터로 채운 뒤 AI에게 말로 고쳐 바로 씁니다. 완성한 문서는 ${t('teacher')} · ${t('learner')}에게 제공할 수 있습니다.`, `<button class="btn ink" data-act="doc-ai-new">${ic('spark', 14)} AI로 문서 만들기</button>`) + tabs('docT', [['tpl', '표준 문서'], ['mine', '우리 기관 문서'], ['sent', '제공 내역']], tb) + body; };
ACT['doc-scope'] = el => { UI.docS = el.dataset.v; render(); };
ACT['doc-f'] = el => { UI.docF = el.dataset.v; render(); };
document.addEventListener('input', e => { if (e.target.id === 'docQ') { UI.docQ = e.target.value; clearTimeout(UI._dq); UI._dq = setTimeout(() => { render(); const i = $('#docQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } });
ACT['doc-pv'] = el => { const d = DTPL.find(x => x.id === el.dataset.v); const w = overlay(`미리 보기 — ${d.name}`, `<div class="dpaper">${docHTML(d.body)}</div><p class="mini"><mark>{노란 칸}</mark>은 과정 데이터나 직접 입력으로 채우는 칸입니다.</p><div class="bar2"><button class="btn ink" data-act="doc-use" data-v="${d.id}">${ic('spark', 14)} 내 문서로 만들기</button></div>`); w.addEventListener('click', e => { if (e.target.closest('[data-x]') || e.target === w || e.target.closest('[data-act=doc-use]')) setTimeout(() => w.remove()); }); };
function newDoc(tp, c, src = 'tpl') { const r = fillDoc(tp.body, c); const d = { id: uid('dc'), tpl: tp.id, name: tp.name + (c ? ` — ${clean(c.name)}` : ''), cat: tp.cat, body: r.body, src, cls: c?.id || '', vis: '내부', at: nowStr(), vers: [], sent: [] }; DOCS().unshift(d); logAudit(`표준 문서 생성 — ${d.name}`); return d; }
const curCls = () => C(UI.cls) || S.classes.find(c => c.status === '운영중') || S.classes[0];
ACT['doc-use'] = el => { const tp = DTPL.find(x => x.id === el.dataset.v); const d = newDoc(tp, curCls()); save(); UI.docT = 'mine'; go('docs'); openDoc(d.id); toast(`「${d.name}」을 만들고 과정 데이터를 채웠습니다.`, 'ok'); };
ACT['doc-blank'] = () => { const d = { id: uid('dc'), name: '새 문서', cat: '운영', body: '# 새 문서\n{기관명} · {작성일}\n\n## 1. 내용\n- ', src: 'blank', vis: '내부', at: nowStr(), vers: [], sent: [] }; DOCS().unshift(d); save(); render(); openDoc(d.id); };
ACT['doc-del'] = el => { const d = DOCS().find(x => x.id === el.dataset.v); modal('문서 삭제', `<p>「${esc(d.name)}」을 삭제할까요? 제공 내역도 함께 지워집니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { S.docs = DOCS().filter(x => x !== d); save(); render(); } }]); };
ACT['doc-open'] = el => openDoc(el.dataset.v);
document.addEventListener('change', async e => { if (e.target.id !== 'docUp') return; const f = e.target.files[0]; if (!f) return;
  try { const raw = (await readDocFile(f)).replace(/\r/g, '').slice(0, 60000); if (!raw.trim()) throw new Error('글자를 찾지 못했습니다(스캔 이미지 PDF는 읽을 수 없습니다).');
    const st = standardize(raw); const d = { id: uid('dc'), name: f.name.replace(/\.[^.]+$/, ''), cat: DCAT.find(k => f.name.includes(k.split(' ')[0])) || '운영', body: st.body, src: 'upload', file: f.name, vis: '내부', at: nowStr(), vers: [], sent: [] };
    DOCS().unshift(d); logAudit(`문서 업로드 — ${f.name}`); save(); UI.docT = 'mine'; render(); toast(`${f.name}을 읽었습니다(${raw.length.toLocaleString()}자). 기관명 · 과정명 · 날짜 ${st.n}곳을 {변수}로 바꿔 표준 문서로 만들었습니다.`, 'ok'); openDoc(d.id);
  } catch (x) { toast(x.message === 'zip' || /^no /.test(x.message) ? 'Word 파일을 읽지 못했습니다. .docx 형식인지 확인하세요.' : x.message, 'warn'); } e.target.value = ''; });

/* ── 편집기: 왼쪽 원문 · 오른쪽 미리보기 · AI 수정 ── */
let DE = null;
function openDoc(id) { const d = DOCS().find(x => x.id === id); if (!d) return; DE = JSON.parse(JSON.stringify(d));
  const opts = S.classes.map(c => `<option value="${c.id}" ${DE.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  modal(`문서 편집`, `<div class="dtop"><input id="deName" value="${esc(DE.name)}" aria-label="문서 이름" maxlength="80"><select id="deCat" aria-label="분류">${DCAT.map(c => `<option ${DE.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select><select id="deCls" aria-label="채울 과정"><option value="">과정 선택 안 함</option>${opts}</select><button type="button" class="btn sm" data-dact="fill">과정 데이터로 채우기</button></div>
    <div class="dai"><input id="deQ" maxlength="200" placeholder="AI에게 수정 지시 — 예: 공문체로 바꾸고, 기대 효과 항목 추가, '디디쌤'을 'LMS'로 바꿔"><button type="button" class="btn sm ink" data-dact="ai">${ic('spark', 14)} AI로 수정</button></div>
    <div class="lchips">${['격식체로', '더 짧게', '목록을 표로', '번호 목록으로', '빈 칸 채워줘', '영어로 번역', 'AI 검토'].map(x => `<button type="button" class="chip" data-dq="${x}">${x}</button>`).join('')}</div>
    <div id="deLog" class="dlog"></div>
    <div class="dsplit"><textarea id="deBody" spellcheck="false" aria-label="문서 원문">${esc(DE.body)}</textarea><div class="dpaper" id="dePv"></div></div>
    <div class="bar2 dfoot"><span class="mini" id="deSt"></span><span class="sp"></span><button type="button" class="btn sm" data-dact="html">HTML</button><button type="button" class="btn sm" data-dact="word">Word(.doc)</button><button type="button" class="btn sm" data-dact="print">인쇄 · PDF</button><button type="button" class="btn sm" data-dact="vers">이전 버전 ${(DE.vers || []).length}</button></div>`,
    [{ id: 'c', label: '닫기' }, { id: 'ok', label: '저장', kind: 'pri', run: () => docSave() }], true);
  dePaint(); }
function dePaint() { $('#dePv').innerHTML = docHTML(DE.body); const u = unfilled(DE.body); $('#deSt').innerHTML = `${DE.body.length.toLocaleString()}자 · ${u.length ? `<b class="warn">빈 칸 ${u.length}</b> ${esc(u.slice(0, 4).join(' '))}` : '빈 칸 없음'}`; }
function deLog(ch) { $('#deLog').innerHTML = ch.length ? `<b>AI 수정</b> ${ch.map(x => `<span>${esc(x)}</span>`).join('')}` : '<b>AI 수정</b> 바꿀 부분을 찾지 못했습니다. 예: "격식체로", "○○ 항목 추가", "A를 B로 바꿔", "표로", "영어로 번역"'; }
function docSave() { DE.name = $('#deName').value.trim() || DE.name; DE.cat = $('#deCat').value; DE.body = $('#deBody').value.slice(0, 60000); const i = DOCS().findIndex(x => x.id === DE.id); const old = DOCS()[i];
  if (old.body !== DE.body) DE.vers = [{ at: old.at, body: old.body }, ...(old.vers || [])].slice(0, 5); DE.at = nowStr(); DOCS()[i] = DE; save(); render(); toast('문서를 저장했습니다.', 'ok'); }
document.addEventListener('input', e => { if (e.target.id === 'deBody' && DE) { DE.body = e.target.value; clearTimeout(UI._dp); UI._dp = setTimeout(dePaint, 120); } });
document.addEventListener('click', async e => { const b = e.target.closest('[data-dact],[data-dq]'); if (!b || !DE || !b.closest('#modal')) return;
  if (b.dataset.dq) { const q = b.dataset.dq === 'AI 검토' ? '검토해줘' : b.dataset.dq === '빈 칸 채워줘' ? '과정 데이터로 채워줘' : b.dataset.dq; $('#deQ').value = q; }
  const a = b.dataset.dact || 'ai'; DE.body = $('#deBody').value;
  if (a === 'fill') { const c = C($('#deCls').value); if (!c) { toast('채울 과정을 고르세요.', 'warn'); return; } DE.cls = c.id; const r = fillDoc(DE.body, c); DE.body = r.body; $('#deBody').value = DE.body; dePaint(); deLog([`과정 데이터 ${r.n}칸 채움`]); return; }
  if (a === 'ai') { const q = $('#deQ').value.trim(); if (!q) { $('#deQ').focus(); return; } b.disabled = true; const c = /채워|채우|맞춰|맞춤/.test(q) ? C($('#deCls').value) || curCls() : null; const ch = await docEdit(DE, q, c); b.disabled = false; S.ai.usage++; $('#deBody').value = DE.body; dePaint(); deLog(ch); return; }
  if (a === 'html' || a === 'word') { const x = document.createElement('a'); x.href = URL.createObjectURL(new Blob([docFile(DE, a === 'word')], { type: a === 'word' ? 'application/msword' : 'text/html' })); x.download = `${DE.name.replace(/[\\/:*?"<>|]/g, '_')}.${a === 'word' ? 'doc' : 'html'}`; document.body.appendChild(x); x.click(); setTimeout(() => x.remove(), 5000); return; }
  if (a === 'print') { const u = URL.createObjectURL(new Blob([docFile(DE)], { type: 'text/html' })); window.open(u, '_blank', 'noopener'); toast('새 창에서 인쇄(Ctrl+P) → PDF로 저장을 고르세요.'); return; }
  if (a === 'vers') { const V = DE.vers || []; if (!V.length) { toast('이전 버전이 없습니다.'); return; } modal2('이전 버전', V.map((v, i) => `<label class="ckl"><input type="radio" name="dv" value="${i}" ${i ? '' : 'checked'}> ${esc(v.at)} · ${v.body.length.toLocaleString()}자</label>`).join('') + '<p class="mini">확인을 누르면 고른 버전으로 되돌립니다(저장해야 반영).</p>', () => { const i = +document.querySelector('input[name=dv]:checked').value; DE.body = V[i].body; $('#deBody').value = DE.body; dePaint(); deLog(['이전 버전으로 되돌림']); }); } });
document.addEventListener('keydown', e => { if (e.target.id === 'deQ' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); document.querySelector('[data-dact=ai]')?.click(); } });

/* ── 제공: 강사 공유 · 학습자 공개 + 알림함 발송 ── */
ACT['doc-share'] = el => { const d = DOCS().find(x => x.id === el.dataset.v); const c = C(d.cls);
  modal(`문서 제공 — ${d.name}`, `<div class="form2"><label>공개 범위<select id="dsV">${['내부', `${t('teacher')} 공유`, `${t('learner')} 공개`].map(v => `<option ${d.vis === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>보낼 대상<select id="dsT"><option value="none">보내지 않음(공개 범위만 변경)</option>${c ? `<option value="cls">「${esc(c.name)}」 ${esc(t('learner'))} ${c.learners.length}명</option>` : ''}<option value="all">전체 ${esc(t('learner'))} ${S.members.length}명</option><option value="tch">${esc(t('teacher'))} ${S.admins.filter(a => a.role === 'teacher').length}명</option></select></label></div>
    ${unfilled(d.body).length ? `<p class="warn mini">빈 칸 ${unfilled(d.body).length}개가 남아 있습니다. 제공 전에 채우는 것을 권장합니다.</p>` : ''}<p class="mini">${esc(t('learner'))} 공개 문서는 학습자 사이트 '자료실'과 해당 과정 강의실에 표시되고, 보내기를 고르면 알림함으로 안내가 발송됩니다(데모).</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '적용', kind: 'pri', run: () => { d.vis = $('#dsV').value; const tg = $('#dsT').value; if (tg !== 'none') { const n = tg === 'cls' ? c.learners.length : tg === 'all' ? S.members.length : S.admins.filter(a => a.role === 'teacher').length; const to = tg === 'cls' ? `${c.name} ${t('learner')}` : tg === 'all' ? `전체 ${t('learner')}` : t('teacher'); S.msgs.unshift({ id: uid('ms'), at: nowStr(), to, title: `[문서] ${d.name}`, ch: '알림함', n }); d.sent = [{ at: nowStr(), to, how: '알림함', n }, ...(d.sent || [])]; logAudit(`문서 제공 — ${d.name} → ${to} ${n}명`); toast(`${to} ${n}명에게 「${d.name}」을 제공했습니다(데모).`, 'ok'); } else toast(`공개 범위를 '${d.vis}'로 바꿨습니다.`, 'ok'); save(); render(); } }]); };

/* ── AI로 문서 만들기(말로) ── */
function docMatch(q) { const H = DTPL.map(d => { const m = q.match(d.kw); return m ? { d, s: m.index, e: m.index + m[0].length } : null; }).filter(Boolean); return H.filter(h => !H.some(o => o !== h && o.s <= h.s && o.e >= h.e && o.e - o.s > h.e - h.s)).map(h => h.d).sort((a, b) => (b.types.includes(S.org.type) ? 1 : 0) - (a.types.includes(S.org.type) ? 1 : 0)); }
ACT['doc-ai-new'] = () => modal('AI로 문서 만들기', `<label class="fl">어떤 문서가 필요하신가요?<textarea id="dnQ" rows="3" placeholder="예: 생성형 AI 활용 과정 결과 보고서를 공문체로, 향후 계획 항목 추가"></textarea></label><div class="lchips">${dtFor(S.org.type).slice(0, 8).map(d => `<button type="button" class="chip" data-dn="${esc(d.name)}">${esc(d.name)}</button>`).join('')}</div><p class="mini">표준 문서를 골라 과정 데이터로 채운 뒤, 지시한 수정까지 한 번에 적용합니다.</p>`,
  [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: () => { const q = $('#dnQ').value.trim(); if (!q) return false; docFromText(q).then(r => { if (!r.docs.length) { toast('맞는 표준 문서를 찾지 못했습니다. 예: "출석부", "결과 보고서", "가정통신문"', 'warn'); return; } save(); UI.docT = 'mine'; go('docs'); openDoc(r.docs[0].id); }); } }]);
document.addEventListener('click', e => { const b = e.target.closest('[data-dn]'); if (b) { const t2 = $('#dnQ'); t2.value = (t2.value ? t2.value + ', ' : '') + b.dataset.dn; } });
async function docFromText(q, c) { const T = docMatch(q).slice(0, 4); const cls = c || S.classes.find(x => q.includes(clean(x.name)) && clean(x.name).length >= 2) || curCls(); const docs = [];
  for (const tp of T) { const d = newDoc(tp, cls, 'ai'); const rest = q.replace(tp.kw, ''); if (/격식|공문체|짧게|간결|추가|빼|삭제|바꿔|표로|번호|번역|친근/.test(rest)) await docEdit(d, rest, cls); docs.push(d); }
  S.ai.usage += docs.length; return { docs, cls }; }

/* ── 대화 흐름 연결 ── */
const DOCRE = /(공문|운영\s*계획서|교육\s*계획서|강의\s*계획서|결과\s*보고서|품의서?|동의서|가정\s*통신문|안내문|표준\s*문서|출석부|만족도\s*설문지|훈련\s*일지|상담\s*일지|이수\s*확인서|수료\s*확인서|신청서|환불\s*규정|사유서|체크리스트|결과\s*통보서|학습\s*리포트|예산\s*계획)/;
{ const f = FILL.find(x => x.id === 'survey'); if (f) f.re = /설문(?!지)/; const m = FILL.find(x => x.id === 'message'); if (m) m.re = /(안내(?!문)|알림|메시지|문자)\S*\s*(을|를|도|까지)?\s*(보내|발송|준비|작성|써)/; }
FILL.push({ id: 'docstd', go: 'docs', re: DOCRE, label: () => '표준 문서', line: x => { const T = docMatch(x.q); return `${T.length ? T.slice(0, 4).map(d => `「${d.name}」`).join(' · ') : '표준 문서'} 생성 → ${x.cls || x.willCourse ? `「${x.target()}」` : '현재 과정'} 데이터로 채움${/(보내|발송|제공)/.test(x.q) ? ` → ${t('learner')}에게 제공` : ''}`; },
  run: x => { const T = docMatch(x.q).slice(0, 4); const cls = x.cls || curCls(); const D = T.map(tp => newDoc(tp, cls, 'ai')); const rest = x.q.replace(DOCRE, ''); if (/격식|공문체|짧게|간결|추가|표로|번호|친근/.test(rest)) D.forEach(d => docEdit(d, rest.replace(/(영어|일본어|중국어)[^,]*번역/, ''), null));
    if (/(보내|발송|제공)/.test(x.q)) D.forEach(d => { d.vis = `${t('learner')} 공개`; const n = cls.learners.length; S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: `${cls.name} ${t('learner')}`, title: `[문서] ${d.name}`, ch: '알림함', n }); d.sent = [{ at: nowStr(), to: `${cls.name} ${t('learner')}`, how: '알림함', n }]; });
    UI.docT = 'mine'; return D.length ? `문서 ${D.length}건 — ${D.map(d => d.name).join(', ')}` : '맞는 표준 문서가 없습니다'; } });
{ const base = answer; answer = q => { if (DOCRE.test(q) && VERB.test(q) && !/(주간|이번\s*주)\s*(보고|리포트)/.test(q)) { const r = flowAnswer(q); if (r) return r; } return base(q); }; }
{ const base = BRIEF; BRIEF = () => { const B = base(); const n = DOCS().filter(d => unfilled(d.body).length).length; if (n && B.length) B[B.length - 1] = { k: 'docs', label: '빈 칸 남은 문서', n, q: '빈 칸 남은 문서를 과정 데이터로 채워줘', unit: '건' }; return B; }; }

/* 기능 맵 · 언어팩 · 상태 */
COVER.push(['[신규] 표준 문서함: 유형별 문서 템플릿 · 업로드(docx · pdf) · AI 수정 · 과정 데이터 채움 · 제공', 'docs', '']);
Object.assign(DICT, { '표준 문서': { en: 'Standard docs', ja: '標準文書', 'zh-CN': '标准文档', 'zh-TW': '標準文件', vi: 'Tài liệu mẫu', th: 'เอกสารมาตรฐาน', id: 'Dokumen standar', es: 'Documentos estándar', fr: 'Documents types' }, '우리 기관 문서': { en: 'Our documents', ja: '機関の文書', 'zh-CN': '本机构文档', 'zh-TW': '本機構文件', vi: 'Tài liệu của tổ chức', th: 'เอกสารของหน่วยงาน', id: 'Dokumen lembaga', es: 'Documentos propios', fr: 'Nos documents' }, '제공 내역': { en: 'Shared history', ja: '提供履歴', 'zh-CN': '发放记录', 'zh-TW': '提供紀錄', vi: 'Lịch sử chia sẻ', th: 'ประวัติการแชร์', id: 'Riwayat berbagi', es: 'Historial compartido', fr: 'Historique de partage' } });
{ const base = upgradeState; upgradeState = () => { base(); if (!S.docs) S.docs = []; if (!Object.values(S.nav.tabs).some(a => a.some(x => x.id === 'docs'))) { (S.nav.tabs.ops = S.nav.tabs.ops || []).push({ id: 'docs', on: true }); save(); } }; }
{ const base = postSeed; postSeed = type => { base(type); S.docs = []; const c = S.classes.find(x => x.status === '운영중') || S.classes[0]; const T = dtFor(type); [T.find(d => d.id === 'plan'), T.find(d => !['plan'].includes(d.id) && !ALLT.every(k => d.types.includes(k)))].filter(Boolean).forEach(tp => newDoc(tp, c)); }; }
