# v39 작업 지시서 — 학습자 앱을 「디디쌤 튜브」 디자인으로 교체

새 대화에서 「v39 시작」이라고 하면 이 문서부터 읽고 진행합니다. (작성 2026-11-13, 대표님 승인)

## 결정
- 대표님(2026-11-13): 「이걸로 디자인 바꾸자. 원래 앱은 너무 구렸어.」 → 학습자 앱(body.lapp) 기준 화면 = 「디디쌤 튜브」 시안.
- 시안: Design 캔버스 https://claude.ai/artifact/9BQuDutXVxyUDeK6kaHV1w (4화면 390×844, 디디쌤 Design System 토큰 · Pretendard).
- 모양은 모든 기관 유형에 적용. **직업훈련(voc) · 대학 학사 LMS(univ_lms)** 는 쇼츠 · 건너뛰기 · 배속을 끄고 진도 규정을 지킨다(docs/compliance).
- 개인정보 원칙 유지(대학은 학번 · 학과만), 학습자 문구는 해요체, 버튼 44px 이상, 글자 12px 이상.

## 화면 (시안 그대로)
1. **홈 피드**: 흰 머리(디디쌤 워드마크 · 기관명 · 알림 · 검색) + 칩 줄(전체 · 이어 보기 · 내 과정 · 라이브 · 자격증, 유형별로 없는 칩은 숨김) → 오늘 목표 막대(분) → 이어 보기 큰 썸네일 카드(차시 · 시각 · 진도 막대 · 남은 시간) → AI 튜터 제안 줄(틀린 퀴즈 · 멈춘 차시 기반, 근거 없으면 숨김) → 이번 주 새 차시 2열.
2. **하단 탭 5칸**: 홈 · 쇼츠 · AI 튜터(가운데 그린 알약) · 내 과정 · 나. 보호자 · 방문자는 기존 규칙대로 탭 구성 다름.
3. **영상 화면**: 플레이어 + 챕터 칩(강사가 넣은 구간, 없으면 AI 제안 표시는 2차) + 아래 AI 튜터 패널. 튜터는 **현재 재생 시각**을 함께 받아 답하고 근거 구간을 보여 준다 → `/api` 튜터 요청에 `t`(초) 추가: service/server + service-egov 함께, 테스트 함께.
4. **쇼츠 1차**: 차시 영상의 챕터 구간을 세로 화면으로 재생(시작 · 끝 시각) + 끝에 그 차시 퀴즈 1문제. AI 자동 컷은 2차(영상 처리 비용 → 요금제 반영 후).
5. **오늘 목표 완료**: 학습자가 하루 목표(분) 설정, 채우면 완료 화면(주간 연속 · 내일 시작 지점) — 끝없는 스크롤 금지.

## 작업 공간 · 순서
- 브랜치 `core/v39`(origin/main f574240 = v38.5 운영 배포본에서 시작), 작업 폴더 `/home/claude/wt/v39`.
- 주요 파일: didisam/lapp.js · lapp.css(앱 머리 · 탭), lslim.js · lslim.css(앱 단순화 · 접기), ltutor.js · ltutor.css(튜터), lcls.js · lseg.js(차시 · 영상), lrun.js(라우팅 · 데모).
- 순서: ① 앱 머리 · 탭 · 홈 피드 → ② 영상 + 튜터 패널(서버 t) → ③ 쇼츠 → ④ 오늘 목표 → ⑤ 유형별 끄기 → ⑥ 테스트 · 회귀 → PR.
- 체험 확인: 운영 서버 `learner.html?demo=adult&app=1` 과 같은 화면을 로컬에서 PC · 390으로 캡처해 시안과 나란히 비교, 대표님께는 PDF로 보여 드린다.

## 테스트 · 배포
- 화면 구조가 바뀌어 qa_app 등 기존 앱 테스트가 옛 버튼에 묶여 실패하면 지우지 말고 「기존 보기는 기존 테스트 · 새 보기는 새 테스트(tests/ui/tube39.js)」로 나눈다.
- 회귀: smoke · acct38 · live-head · compliance · scn-k12 · qa_app(QA_APP=1) · multi · cap327 · qa_learner(QA_APP=0) + PR 점검과 같은 운영 모드 3종(compliance-live · module-live · scn-k12-live, 로컬 Postgres 5544).
- 버전: 바뀐 파일 ?v=39.0, sw 캐시 didisam-app-v39.0.
- 배포: PR을 main에 병합하면 GitHub Actions가 자동 배포(docs/deploy.md). 병합은 대표님 「배포해」 뒤에만, 버전이 바뀌면 다시 승인.
- 토큰: didisam-dev-token-diet 규칙(요원 최소, 스크린샷 대신 텍스트, 보고 20줄).

## 1차 구현 기록(2026-11-13, core/v39)
- 학습자: `didisam/ltube.js` · `ltube.css`(learner.html, lkeep.js 다음 · 모든 lrender 감싸기의 가장 바깥). 로그인한 학습자(보호자 · 방문자 · 미리보기 제외)에만 `body.tube`.
  - `#home` 피드 · `#shorts` 쇼츠 · `#done` 오늘 목표 완료 · `#ai` 선생님과의 대화(기존 lapp 첫 화면을 AI 튜터 탭으로 옮김, lapp.js `hm`).
  - 영상 레슨 `#c/과정/항목`: 플레이어 아래 챕터 칩 + AI 튜터 패널. 챕터 이동은 과정 재생 규칙(`c.skip`: free 어디든 · watched 본 구간까지)을 따르고, 규정 대상(voc · univ/lms · moel 프로필)은 이동 없음 · 쇼츠 탭 없음.
  - 기록 `LR.lp.tube = { goal, sec, sh, qr, qn }` — 서버 `cleanTube`(Node app.js · Java PubServiceImpl) 같은 규칙. 재생 중(YouTube LW.yp 상태 1 · 업로드 video · 쇼츠)일 때만 5초마다 학습 초를 센다.
  - 학습 캘린더(lcal.js) 카드는 피드 끝에 그대로, 캘린더 탭은 튜브 탭으로 대체.
- 튜터 장면: 요청 본문 `t`(초, 숫자만) → 서버 `sceneLine`(Node · Java 동일 문장) — 「지금 재생 위치 mm:ss (챕터 …)」 + 근거 구간 지시. 체험(브라우저 키)도 `ltSceneLine`으로 같은 문장. 클라이언트 `ltSceneT()`.
- 스튜디오: `didisam/tube-admin.js`(index.html, boot.js 앞) — 영상 편집 창 「챕터(구간)」 칸(분:초 제목), 게시본 `chaps [{t, n}]`.
- 테스트: `tests/ui/tube39.js`(새 보기), `service/test/tutor.test.js` · `learner.test.js`에 t · lp.tube 추가. 기존 보기 테스트 조정: `f5-38.js`(추천 칩은 #ai), `lcal.js`(튜브면 탭 · 캘린더 카드 기준).
- 회귀(로컬): smoke · acct38 · live-head · compliance · scn-k12 · lcal · f5-38 · done38 · scroll-keep · comm-board · mem36 · calendar-x · clib · crs-* · home-persona · hp-* · lms38 · sam-intent · thumb 통과, API 6종 · 운영 모드 3종(compliance-live · module-live · scn-k12-live, 로컬 Postgres 5544) 통과. `dashx`의 teacher 현황 위젯 8건은 main(v38.5)에서도 같은 실패(이번 변경과 무관).
- 남은 일(2차): 시안처럼 영상 화면에서 플레이어를 맨 위로(기존 강의 머리 정리), 「노트에 저장」 · 「많이 멈춘 구간」, AI 자동 챕터 · 자동 컷(요금제 반영 후), 쇼츠 업로드 영상 구간 재생, 운영 서버 체험(`learner.html?demo=adult&app=1`) 샘플에 챕터 데이터 넣기.

## 대표님 조정(2026-11-13 04:08~04:10)
- 「쇼츠가 디디쌤 시나리오에 맞아?」 → 쇼츠 탭 제외. 기관 수강은 진도 · 출결 · 수료 중심이므로, 틀린 퀴즈가 있는 과정의 챕터 구간만 AI 튜터 제안 카드에서 「짧게 복습」(#review)으로 연다(하루 5개 · 진도 미반영 안내 · 규정 대상은 끔).
- 「AI 튜터는 아이콘 누르면 활성화, 앱에 상시로 떠 있어야」 → 하단 탭 4칸(홈 · 일정 · 내 과정 · 나) + 모든 화면 오른쪽 아래 AI 튜터 아이콘(#tbFab). 영상 레슨에서는 「이 장면 질문」 → 장면 튜터 시트, 그 밖에서는 선생님 대화 창(ltOpen). #ai(선생님 대화 화면)는 주소로만 남김.
