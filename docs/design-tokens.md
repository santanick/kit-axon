# 홈페이지 디자인 토큰 (v34.5 · 아트 디렉터 G1)

고객 홈페이지(HPT 테마 8종)의 글자 단계 · 여백 리듬 · 모서리 · 그림자 · 버튼 · 링크 · 호버 기준입니다.
레이아웃 계열(HPL) · 섹션 부품(S1~S4) · 유형 템플릿(TA~TP) 디자이너는 이 값을 따릅니다. 숫자를 새로 정하지 말고 아래 CSS 변수를 씁니다.

- 원본: `didisam/hpdir.js`(`window.HPD`). hpth의 테마 값은 const이므로, siteHTML이 만든 `<style>`에 토큰 CSS를 덧붙여 덮어씁니다.
- 순서: hpth(색 · 기본 렌더러) → **hpdir(토큰)** → S1~S4 · hplay(계열) → hpimg(사용자 글꼴 · 요소 스타일). 뒤에 오는 것이 이깁니다. 사용자가 고른 글꼴 · 요소 스타일은 언제나 최우선입니다.
- 근거: `scratchpad/fix6/bench2/` 실측(국내외 교육 사이트). 제목 40~77px, 본문 15~17px · 줄간 1.6~1.75, 섹션 여백 120~160px, 카드 모서리 6~16px(테두리 위주, 그림자는 드묾), 버튼 높이 48~60px · 모서리 8px 전후.

## 1. CSS 변수 (`.hpt` 에 선언 · 모든 섹션이 상속)

| 변수 | 뜻 | 쓰는 법 |
|---|---|---|
| `--hd-ff` `--hd-fw` `--hd-ls` | 제목 글꼴 · 굵기 · 자간(hpfont 조합표) | `h1, h2` 와 큰 숫자. 본문에는 쓰지 않음 |
| `--bd-ff` | 본문 글꼴(Pretendard) | 본문 · 작은 제목 |
| `--t-h1` `--t-h2` `--t-h3` | 제목 크기(PC) | `clamp(휴대폰값, 5vw, var(--t-h1))` |
| `--t-lead` `--t-body` `--t-sm` `--t-xs` | 소개글 · 본문 · 작은 글(14) · 라벨(13) | 본문 14px 미만 금지(라벨만 13) |
| `--lh-body` | 본문 줄간 | 제목 줄간은 1.08~1.3(아래 표) |
| `--sec` `--sec-m` | 섹션 위아래 여백(PC · 휴대폰) | `padding: var(--sec) 0` |
| `--wmax` `--gut` | 최대 폭 · 좌우 여백 | 휴대폰 좌우 여백은 20px 고정 |
| `--r` `--rs` `--br` | 카드 · 작은 칸(아이콘 · 태그) · 버튼 모서리 | 카드 안의 칸은 `--rs` (바깥보다 작게) |
| `--btn-h` `--btn-px` | 버튼 높이 · 좌우 안쪽 여백 | 휴대폰 최소 48px |
| `--bd` `--sh` `--sh-h` | 카드 테두리 · 평소 그림자 · 호버 그림자 | 그림자보다 테두리를 먼저 |
| `--ring` | 키보드 초점 테두리 색(바탕 대비 3:1 이상) | `outline: 3px solid var(--ring); outline-offset: 3px` |
| `--ease` `--dur` | 움직임 곡선 · 시간(.18s) | 호버 · 펼치기만. 자동 재생 애니메이션 금지 |

## 2. 테마별 값

> v34.5 F1: 제목 글꼴 · 굵기 · 자간 · 줄간은 `didisam/hpfont.js`가 테마 × 계열 조합표로 덮어씁니다. 아래는 계열이 없을 때(기본 렌더러) 값이고, 계열별 값은 `docs/typography.md` 3절을 따릅니다.


| 테마 | 제목 글꼴 · 굵기 · 자간 | h1 / h2 / h3 (PC) | h1 휴대폰 · 줄간 | 본문 / 줄간 | 섹션 PC / 휴대폰 | 카드 r · 버튼 r · 버튼 높이 | 테두리 · 그림자 | 호버 |
|---|---|---|---|---|---|---|---|---|
| clean 모던 클린 | Pretendard 800 · -0.03em | 64 / 44 / 20 | 36 · 1.16 | 16.5 / 1.7 | 128 / 72 | 16 · 12 · 52 | 1px 8% 잉크 · 아주 옅은 1겹 | 3px 들림 + 그림자 |
| premium 프리미엄 | **Hahmlet(함렛)** 600 · -0.02em | 60 / 42 / 20 | 34 · 1.2 | 16.5 / 1.75 | 144 / 80 | 2 · 0 · 54 | 1px 머리카락 선 · 없음 | 선이 짙어짐 |
| warm 따뜻한 학원 | **Gowun Dodum** 400 · -0.01em | 58 / 40 / 20 | 34 · 1.28 | 16.5 / 1.75 | 120 / 72 | 22 · 알약 · 54 | 1px 따뜻한 잉크 · 옅은 주황 그림자 | 들림 |
| official 공식 기관 | Pretendard 700 · -0.022em | 48 / 34 / 19 | 30 · 1.26 | 16 / 1.7 | 96 / 64 | 4 · 4 · 48 | 1px #D5DAE2 · 없음 | 테두리 포인트색 |
| tech 테크 | **Wanted Sans** 800 · -0.028em | 66 / 44 / 19 | 36 · 1.15 | 16 / 1.7 | 136 / 76 | 12 · 10 · 50 | 1px 10% · 없음 | 테두리 포인트색 + 옅은 빛 |
| kids 키즈 | **Do Hyeon(도현)** 400 · -0.01em | 60 / 42 / 20 | 36 · 1.2 | 17 / 1.7 | 112 / 68 | 28 · 알약 · 58 | 2px 8% · 아래 6px 단단한 그림자 | 눌림(아래 그림자 커짐) |
| campus 캠퍼스 | **Noto Serif KR** 600 · -0.02em | 56 / 40 / 19 | 32 · 1.26 | 16.5 / 1.75 | 128 / 72 | 6 · 4 · 50 | 1px 14% · 없음 | 선이 짙어짐 |
| senior 큰 글씨 | Pretendard 700 · -0.01em | 52 / 38 / 22 | 32 · 1.3 | **19 / 1.75** | 104 / 72 | 14 · 14 · **62** | 2px #D5DBE7 · 없음 | 테두리 포인트색 · 초점 4px |

- 영문 라벨(eyebrow): clean 13px · 0.08em 대문자, premium 12px · 0.22em, tech 13px · 0.12em, campus 13px · 0.16em. warm · official · kids · senior는 한국어 라벨(대문자 변환 없음, 자간 0)을 권장합니다.
- 첫 화면 마지막 줄 강조: clean · warm · tech는 포인트색만(형광펜 배경 없음), kids는 형광펜 1겹, premium · official · campus · senior는 강조 없음.
- 숫자: 모든 숫자 칸(수치 · 날짜 · 가격)은 `font-variant-numeric: tabular-nums`.

## 3. 공통 규칙 (해야 할 것)
- **8pt 리듬**: 간격은 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 중에서만 고릅니다(`HPD.scale.sp`). 제목 → 설명 16, 설명 → 버튼 40(휴대폰 28), 섹션 제목 묶음 → 내용 56(섹션 여백 120 미만 테마는 40).
- **글자 대비**: 제목은 굵기 대비를 크게(제목 600~800 / 본문 400). 한 화면에 글자 크기는 4단계 이상(h1 · h2 · 본문 · 라벨).
- **줄 길이**: 본문 · 소개글은 34~42em 이하(`max-width`).
- **카드**: 테두리 1px를 기본으로 하고 그림자는 호버 때만 씁니다. 모서리 6 이하 테마(premium · official · campus)는 카드 사이 간격 없이 선을 맞붙인 표 모양으로 둡니다.
- **버튼**: 주 버튼 1개 + 보조 버튼 1개까지. 주 버튼 호버는 포인트색을 14% 어둡게, 화살표가 있으면 3px 오른쪽으로. 보조 버튼은 1.5px 안쪽 선.
- **링크**: premium · official · campus · senior는 본문 링크에 항상 밑줄(밑줄 간격 3~4px, 1px). 나머지는 호버 때 밑줄.
- **초점**: 모든 링크 · 버튼 · 펼치기에 `:focus-visible` 3px 테두리(senior 4px).
- **휴대폰(≤640)**: 좌우 20px, 섹션 여백 `--sec-m`, 카드 안쪽 20px, 버튼 최소 48px, 가로 넘침 0.
- **움직임**: `prefers-reduced-motion: reduce` 이면 전환을 끕니다.

## 4. 하지 말 것
- 원 · 블롭 · 빛 번짐 장식, 점 무늬 배경(테크의 옅은 격자만 허용). hpdir가 `.hp-blob · .hp-dots · .hp-glow · .hp-band-d · .hp-ctab::after`를 숨깁니다.
- 같은 그림자 · 같은 모서리를 모든 칸에 똑같이 쓰기. 카드 · 안쪽 칸 · 버튼은 `--r` · `--rs` · `--br`로 구분합니다.
- 제목에 한 단어만 다른 색 · 굵게 강조, 모든 제목 위에 영문 대문자 라벨.
- 본문 14px 미만, 줄간 1.5 미만, 휴대폰 버튼 44px 미만.
- 테마 글꼴 외의 웹폰트를 새로 넣기(필요하면 통합 담당에게 요청 · `docs/fonts-credits.md` 기준).

## 5. 글꼴 (v34.5 F1 · 상세는 `docs/typography.md`)
| 성격 | 글꼴(HPF id) | 쓰는 테마 · 기능 |
|---|---|---|
| 본문(고정) | Pretendard Variable(`pretendard`) | 모든 테마의 본문 · 고딕 제목(clean · official · senior) |
| 선명한 고딕 | Wanted Sans(`wanted-sans`) | tech 제목, 벤토 · 큰 글자 · 모자이크 계열 |
| 명조 | Noto Serif KR(`noto-serif-kr`) | campus 제목, 매거진 계열, 함렛의 빠진 음절 |
| 디스플레이 명조 | Hahmlet(`hahmlet`) | premium 제목, 캠퍼스의 매거진 · 전체 화면 · 큰 글자 · 누아르 |
| 부드러운 명조 | Gowun Batang(`gowun-batang`) | warm 테마의 매거진 · 큰 글자 · 이야기 · 누아르 |
| 둥근 | Gowun Dodum(`gowun-dodum`) | warm 제목, 키즈의 기관 · 게시판형 계열 |
| 굵은 제목 | Do Hyeon(`do-hyeon`) | kids 제목, 콜라주 계열 |
| (호환만) | Gaegu · Black Han Sans | 예전에 '손글씨' · '굵은 제목'을 저장한 사이트 |

- 글꼴 파일 · `@font-face`는 F2(`hpfontpick.js` · `HPF`)가 최종 HTML의 font-family 이름을 보고 붙입니다. 계열 · 부품 CSS에서는 글꼴 이름을 직접 쓰지 말고 `var(--hd-ff)` · `var(--bd-ff)` · `var(--hpl-serif)`를 씁니다.
- 단일 굵기 글꼴(Gowun Dodum · Do Hyeon)은 `font-weight: 100 900` 범위로 선언되고 hpfont가 `font-synthesis: none`을 겁니다.
- 한글 조판 규칙(keep-all · 자간 · 줄간 · 숫자 tabular · 기울임 금지)은 `docs/typography.md` 4절.

## 6. 계열 · 부품 디자이너용 예시
```css
.hpl-mine .title{font-family:var(--hd-ff);font-weight:var(--hd-fw);letter-spacing:var(--hd-ls);font-size:clamp(32px,5vw,var(--t-h1))}
.hpl-mine.hpl-s{padding:var(--sec) 0}
@media(max-width:640px){.hpl-mine.hpl-s{padding:var(--sec-m) 0}}
.hpl-mine .card{border:var(--bd);border-radius:var(--r);box-shadow:var(--sh);transition:box-shadow var(--dur) var(--ease)}
.hpl-mine .card:hover{box-shadow:var(--sh-h)}
.hpl-mine .btn{min-height:var(--btn-h);padding:0 var(--btn-px);border-radius:var(--br)}
```
