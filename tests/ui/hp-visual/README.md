# hp-visual — 홈페이지 템플릿 시각 품질 자동 점검

템플릿마다 **게시본(학습자 홈)** 을 PC 1280 · 휴대폰 390으로 찍고 지표를 표로 만든다. 유사한 짝을 찾고, 유형별 모음 시트를 만든다.

## 실행
```bash
SP=<scratchpad>; OUT=$SP/fix6/tools/<내 폴더>
# 1) 촬영 · 지표 (실행기 안에서, 1회 280초 → 기본 예산 240초. 남으면 exit 3 → 같은 명령 다시 실행 = 이어서)
QA_APP=1 $SP/qa20/qa-run.sh tests/ui/hp-visual/run.js --out $OUT [--type k12] [--ids a,b] [--force] [--port 9830]
# 끝날 때까지 자동 반복 + 유사 · 시트까지 한 번에
QA_RUN=$SP/qa20/qa-run.sh tests/ui/hp-visual/run-all.sh $OUT --type k12
# 2) 유사 짝 (브라우저 불필요)
node tests/ui/hp-visual/similar.js --in $OUT [--th 12] [--type k12] [--near] [--cross]
# 3) 유형별 모음 시트 (브라우저 불필요)
node tests/ui/hp-visual/sheet.js --in $OUT [--type k12] [--full]
```
- 템플릿을 고친 뒤에는 `--force`(전부) 또는 `--ids`(고친 것만) + `--force`로 다시 찍는다. 다른 템플릿 결과는 그대로 남는다.
- 기본은 `hidden: true` 템플릿을 뺀다(`--all`이면 포함). 유형은 `types[0]`(대표 유형) 기준이다.
- 기관은 유형마다 하나 만들고(공개 강좌 · 결제 승인), 템플릿을 `siteFromTpl`로 적용 → `smPublish` → `learner.html?t=…#home`을 연다.

## 결과 (`--out` 폴더)
| 파일 | 내용 |
|---|---|
| `summary.json` · `summary.csv` | 템플릿별 지표(아래) |
| `rows/<id>.json` | 템플릿 1종 결과(이어서 실행 기준) |
| `shots/<id>_pc.jpg` · `_m.jpg` | 게시본 전체 화면 |
| `shots/<id>_hero.jpg` · `_hero_m.jpg` | 첫 화면(홈페이지 시작 위치부터 한 화면) |
| `similar/similar.json` · `.csv` · `heat_<유형>.png` · `pairs_<유형>_<n>.jpg` | 유사 짝 · 거리 행렬 · 나란히 보기 |
| `sheets/sheet_<유형>.jpg` | 유형별 모음 시트 |

## 지표
| 키 | 뜻 |
|---|---|
| `dh` · `dh_m` | 첫 화면 dHash(64비트, 16진). 첫 화면 = 첫 `.smhost` 위치부터 한 화면(PC 1280×800 · 휴대폰 390×844) |
| `sig` | 섹션 구조 서명 `계열|banner@첫화면>type:variant>…`(보이는 섹션만, 순서대로) |
| `cmin` · `cminTxt` · `cfail` · `cworst` | 글자 대비 최소값 · 그 글 · 4.5 미만 개수 · 하위 목록. 단색 바탕은 계산, 사진 · 그라데이션 위(`cfailPx`)는 화면 픽셀로 근사 |
| `auditMin` | `HPT.audit` 이론 대비 최소값 |
| `ov_pc` · `ov_m` · `wide_m` | 가로 넘침(px) · 넘치는 요소 |
| `emptyDom` · `ph` | 화면에서 빈 섹션 · 자리 문구/오류 흔적(입력하세요 · undefined 등) |
| `numSus` | 단위 붙은 숫자(%, 명, 점, 위, 배, 년 전통 …) 중 실제 데이터(HPT.facts · 가격)에 없는 것 — 지어낸 숫자 의심 |
| `q` · `qMiss` | `hpwQuality` 점수 · 못 채운 항목 |
| `photos` · `stock` · `stockRatio` · `art` | 사진 수(img + 배경 사진) · 그중 샘플 사진(img/stock) · 비율 · 아트 대체 자리 |

## 유사 판정 (통합 결정 12:00)
- **유형 묶음**: `types`에 그 유형이 포함된 템플릿은 모두 그 유형으로 센다(includes). 유형마다 15종 미만이면 경고한다.
- **① 엄격**: 같은 유형 안에서 첫 화면 dHash ≤ 12(`--th`) **이고** 섹션 종류 순서가 같음(variant · 첫 화면 배치는 보지 않음).
- **② 첫 화면 닮음**: 구조와 관계없이 dHash ≤ 8(`--look`).
- 시트 · 히트맵 테두리: 빨강 = ①, 주황 = ②만. 히트맵의 파란 점 = 섹션 종류 순서만 같음.
- **판정 요약 한 줄**(`similar/verdict.txt`, run-all.sh 마지막 줄): `판정 2/7 통과 | k12 OK ①0 ②0 대비0 숫자0 16종 | …`
  - 유형마다 ① · ② 짝 수, 대비 4.5 미만 템플릿 수, 지어낸 숫자 의심 템플릿 수가 모두 0이고 15종 이상이면 OK. run-all.sh는 NG가 있으면 exit 4.
- 촬영은 템플릿마다 한 번(대표 유형 `types[0]` 기관으로 게시)이고, 묶음만 includes로 센다.
