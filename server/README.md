# KIT AX ON — 운영 모드 서버 (Firebase)

학습자 사이트(`index.html`)와 관리자 페이지(`admin.html`)는 `config.js`에 Firebase 값이 없으면 **시연 모드**(브라우저 저장), 값을 넣으면 **운영 모드**로 동작합니다.

## 구성
| 항목 | 내용 |
|---|---|
| 학생 로그인 | 학번 + 접근코드 → 비밀번호 설정(최초 1회) → 학번 + 비밀번호. Cloud Functions가 확인 후 Firebase 커스텀 토큰 발급 |
| 관리자 로그인 | Google 로그인. Firestore `admins/{이메일}` 문서가 있는 계정만 허용 |
| 저장 데이터 | `students/{학번}`: 학과 · 상태 · 코드/비밀번호 해시(scrypt) / `progress/{학번}`: 학습 기록 / `approvals/{학번}`: 검수 · 배지(관리자만 쓰기) / `reviewLog`: 검수 이력 |
| 개인정보 | 이름 · 연락처 · 이메일 미저장(관리자 Google 이메일만 권한 확인용) |
| AI 행정 비서 | `adminAssistant` 함수 → Claude API. 집계 지표 · 학번 단위 기록만 전달 |
| 보안 | 접근코드 · 비밀번호 8회 실패 시 15분 잠금, 학생은 본인 진도만 읽기 · 쓰기, 배지는 서버만 기록 |

## 전환 순서 (약 30분)
1. Firebase 콘솔에서 프로젝트 생성 → **Blaze 요금제**(Cloud Functions 사용 조건, 이 규모에서는 무료 사용량 안팎 예상).
2. Authentication → 로그인 방법 → **Google** 사용 설정, 승인된 도메인에 `santanick.github.io`(이후 학교 · 산타 도메인) 추가.
3. Firestore 데이터베이스 생성(리전 `asia-northeast3` 서울).
4. 프로젝트 설정 → 웹 앱 추가 → 구성 값을 `config.js`의 `firebase`에 입력.
5. IAM에서 Cloud Functions 서비스 계정에 **서비스 계정 토큰 생성자** 역할 부여(커스텀 토큰 서명용).
6. 배포:
   ```bash
   npm i -g firebase-tools && firebase login
   cd server && firebase use <프로젝트ID>
   firebase functions:secrets:set ANTHROPIC_API_KEY
   (cd functions && npm i) && firebase deploy --only functions,firestore:rules
   ```
7. Firestore에 `admins/{담당 선생님 Google 이메일(소문자)}` 문서 생성(필드 아무거나, 예: `role: "teacher"`).
8. 관리자 페이지 → 학번 등록 · 접근코드 → CSV 업로드 → 접근코드 CSV를 학과로 전달.

## 규모 기준
- 등록 1만 명 · 활성 약 1천 명. 진도 저장은 변경 1.2초 후 1회(디바운스).
- `adminListStudents`는 관리자 화면 진입 시 1회 전체 조회(1만 명 ≈ 문서 2~3만 건 읽기). 관리자 접속이 잦아지면 일 단위 집계 문서(`stats/daily`)를 만드는 예약 함수로 바꿉니다.
- 학교 SSO 연동 시 `studentLogin` 대신 SSO 결과(학번)로 커스텀 토큰을 발급하면 나머지 구조는 그대로 사용합니다.
