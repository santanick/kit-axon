# kit-axon — 디디쌤 Ver2(디디쌤 스튜디오) 작업 규칙

이 저장소는 여러 채팅방에서 동시에 개발합니다. 작업 전에 이 문서를 먼저 읽고, 범위 판단이 어려우면 코드를 고치기 전에 통합 채팅방에 요청합니다.

## 원칙
- 코드는 하나입니다. 기관별로 저장소·폴더를 복제하지 않고, 공통 코어 위에 시나리오를 얹습니다.
- `main`에 직접 push하지 않습니다. `main`에 들어가면 운영 서버(Cloud Run)와 데모 사이트(GitHub Pages)에 곧바로 반영됩니다.
- 채팅방끼리는 서로의 작업을 볼 수 없습니다. 공유할 내용은 이 문서와 `docs/parallel/`, PR 설명에 남깁니다.

## 채팅방 역할
| 채팅방 | 브랜치 | 수정 가능 범위 |
|---|---|---|
| 통합 | `core/<주제>` | 저장소 전체. PR 병합은 통합 채팅방만 합니다. |
| 시나리오 | `scenario/<id>` | `scripts/scenarios.json`에 등록된 파일만. PR 점검이 자동으로 확인합니다. |

## 시나리오 작성 방법
- 어드민은 `didisam/scn-<id>.js`, 학습자 앱은 `didisam/lscn-<id>.js`에 작성합니다.
- 파일 전체를 IIFE로 감쌉니다. 여러 스크립트가 전역 범위를 공유하므로, 최상위 `const`가 겹치면 파일 전체가 동작하지 않습니다.
- 로드 시점에는 `S`가 null입니다. `S`는 함수 안에서만 읽고, 모든 동작은 해당 기관 조건(`S.org.type`, `S.org.ed`)일 때만 실행합니다.
- 기존 동작은 감싸서 확장합니다: `{ const base = fn; fn = (...a) => { /* 조건 확인 */ return base(...a); }; }` `const`로 선언된 값은 감쌀 수 없으므로 통합 채팅방에 요청합니다.
- 학습자 앱의 시나리오는 `window.LSCN_PICK.push((type, ed) => 조건 ? 시나리오 객체 : null)`로 등록합니다. 객체 형식은 `didisam/lapp.js`의 `SCN`을 따릅니다.
- 새 탭은 `MENU`, `PRESET`, `VIEWS`, `ACT`에 시나리오 파일에서 등록합니다. 기존 저장 사용자를 위해 `upgradeState`도 함께 처리합니다.

## 통합 채팅방에 요청할 변경
다음은 시나리오 채팅방에서 수정하지 않습니다.
- 로그인·권한, DB 스키마, `/api` 규격, 개인정보·AI 가드
- 디자인 토큰·공통 컴포넌트(`dds.css`, `app.css`)
- `index.html`, `learner.html`, `sw.js`와 스크립트 버전(`?v=`) — 병합 시 통합 채팅방이 올립니다.
- 새 시나리오 등록(`scripts/scenarios.json`, 빈 시나리오 파일, 스크립트 태그)

`/api`를 바꾸면 `service/server`(Node)와 `service-egov`(Java)를 함께 수정합니다. 두 서버는 같은 `/api`와 같은 화면을 씁니다.

요청은 PR 설명의 「코어 변경 요청」 항목에 적거나, 대표님을 통해 통합 채팅방에 전달합니다. 내용은 필요한 이유, 원하는 함수·API 형태, 없을 때의 임시 처리를 포함합니다.

## 작업 순서
1. `git fetch origin && git merge origin/main`으로 최신 코어를 반영합니다. 작업 시작 전과 PR 전에 수행합니다.
2. 시나리오 파일에서 개발합니다.
3. 점검합니다: `node scripts/check-scope.js origin/main`, `node tests/ui/smoke.js`, 시나리오 테스트 `node tests/ui/scn-<id>.js`(있는 경우).
4. PR을 엽니다. 설명에 변경 내용, 테스트 결과, 코어 변경 요청을 적습니다.
5. 통합 채팅방이 PR을 하나씩 병합하고, 공통 회귀를 확인합니다.

## 새 시나리오 추가(통합 채팅방)
1. `scripts/scenarios.json`에 id와 범위를 등록합니다.
2. `scn-<id>.js`, `lscn-<id>.js` 빈 파일을 만들고 `index.html`(`boot.js` 앞), `learner.html`(`lapp.js` 앞)에 태그를 추가합니다.
3. `docs/parallel/rooms.md`의 시작 지시문을 복사해 새 채팅방을 시작합니다.

빈 파일과 태그를 먼저 `main`에 넣어 두면, 시나리오 채팅방끼리 `index.html`에서 충돌하지 않습니다.
