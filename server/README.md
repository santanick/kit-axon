# KIT AX ON — 운영 모드 서버 (Firebase)

학습자 사이트(`index.html`)와 관리자 페이지(`admin.html`)는 `config.js`에 Firebase 값이 없으면 **시연 모드**(브라우저 저장), 값을 넣으면 **운영 모드**로 동작합니다.

## 구성
| 항목 | 내용 |
|---|---|
| 학생 로그인 | 학번 + 접근코드 → 비밀번호 설정(최초 1회) → 학번 + 비밀번호. Cloud Functions가 확인 후 Firebase 커스텀 토큰 발급 |
| 관리자 로그인 | Google 로그인. Firestore `admins/{이메일}` 문서가 있는 계정만 허용. 권한 `owner` · `admin`(전체) / `dept`(담당 학과만) / `grader`(과제 평가만) — 관리자 페이지 [운영자]에서 추가하면 `admins`에 자동 반영 |
| 저장 데이터 | `students/{학번}`: 학과 · 상태 · 코드/비밀번호 해시(scrypt) / `progress/{학번}`: 학습 기록 · 시청 구간 / `approvals/{학번}`: 평가 · 배지 · 특별 배지(관리자 함수만 쓰기) / `catalog/main`: 코스웨어 · 공지 · 배지 정의 · 진도 기준(공개 읽기) / `catalogPrivate/main`: 운영자 · 그룹 / `messages`: 사이트 알림함 / `badgeLog` · `auditLog`: 발급 대장 · 활동 로그 / Storage `vod/`: 자체 VOD |
| 개인정보 | 이름 · 연락처 · 이메일 미저장(관리자 Google 이메일만 권한 확인용) |
| 배지 | 발급 방식: 자동(평가 통과 시) · 자동(제출 즉시, `onProgressWrite` 트리거) · 수동. 해제 시 사유와 함께 발급 대장에 기록. 디디쌤 기본 배지는 수동 발급 · 취소 불가라 이 서버에서 별도 처리 |
| AI 학습 튜터 | `studentTutor` 함수 → Claude API. 로그인 학생만 · 하루 질문 수 제한(`tutorQuota`, 관리자 설정) · 대화 내용 미저장, 날짜별 질문 수만 `tutorUsage`에 집계. 과제 대신 작성 금지 · 위기 상황 상담 안내를 시스템 지침으로 고정 |
| AI 행정 비서 | `adminAssistant` 함수 → Claude API. 집계 지표 · 학번 단위 기록만 전달 |
| 보안 | 접근코드 · 비밀번호 8회 실패 시 15분 잠금, 학생은 본인 진도만 읽기 · 쓰기, 배지는 서버만 기록 |

## 전환 순서 (약 30분)
1. Firebase 콘솔에서 프로젝트 생성 → **Blaze 요금제**(Cloud Functions 사용 조건, 이 규모에서는 무료 사용량 안팎 예상).
2. Authentication → 로그인 방법 → **Google** 사용 설정, 승인된 도메인에 `santanick.github.io`(이후 학교 · 산타 도메인) 추가.
3. Firestore 데이터베이스 생성(리전 `asia-northeast3` 서울) · Storage 버킷 생성(VOD 업로드용, 같은 리전).
4. 프로젝트 설정 → 웹 앱 추가 → 구성 값을 `config.js`의 `firebase`에 입력.
5. IAM에서 Cloud Functions 서비스 계정에 **서비스 계정 토큰 생성자** 역할 부여(커스텀 토큰 서명용).
6. 배포:
   ```bash
   npm i -g firebase-tools && firebase login
   cd server && firebase use <프로젝트ID>
   firebase functions:secrets:set ANTHROPIC_API_KEY
   (cd functions && npm i) && firebase deploy --only functions,firestore,storage
   ```
7. Firestore에 최초 관리자 1명만 직접 생성: `admins/{Google 이메일(소문자)}` = `{ role: "owner" }`. 이후 운영자는 관리자 페이지 [운영자 · 로그]에서 추가합니다.
8. 관리자 페이지 → 학번 등록 · 접근코드 → CSV 업로드 → 접근코드 CSV를 학과로 전달.

## 규모 기준
- AI 튜터 비용: 활성 1천 명 × 하루 평균 3회 가정 시 하루 약 3천 회 호출. 관리자 [진도 · AI 튜터]에서 하루 질문 수로 조절하고, Firestore TTL 정책을 `tutorQuota.exp` 필드에 걸어 지난 기록을 자동 삭제합니다.
- 등록 1만 명 · 활성 약 1천 명. 진도 저장은 변경 1.2초 후 1회(디바운스).
- `adminListStudents`는 관리자 화면 진입 시 1회 전체 조회(1만 명 ≈ 문서 2~3만 건 읽기). 관리자 접속이 잦아지면 일 단위 집계 문서(`stats/daily`)를 만드는 예약 함수로 바꿉니다.
- 학교 SSO 연동 시 `studentLogin` 대신 SSO 결과(학번)로 커스텀 토큰을 발급하면 나머지 구조는 그대로 사용합니다.
