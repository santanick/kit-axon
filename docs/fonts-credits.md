# 웹폰트 출처 · 라이선스 (didisam/fonts/)

홈페이지(고객 사이트)에서 쓰는 한글 웹폰트입니다. 모두 SIL Open Font License 1.1(OFL)이며, 라이선스 원문을 같은 폴더에 함께 둡니다.

| 파일 | 글꼴 | 굵기 | 크기 | 저작권 | 원본 | 라이선스 파일 |
|---|---|---|---|---|---|---|
| `NotoSerifKR-400.woff2` | Noto Serif KR | 400(100~500에 대응) | 329KB | Google LLC / Adobe | [google/fonts ofl/notoserifkr](https://github.com/google/fonts/tree/main/ofl/notoserifkr) `NotoSerifKR[wght].ttf` | `OFL-notoserifkr.txt` |
| `NotoSerifKR-600.woff2` | Noto Serif KR | 600(600~900에 대응) | 314KB | 같음 | 같음(가변 글꼴을 600으로 고정) | 같음 |
| `GowunDodum-400.woff2` | Gowun Dodum(고운돋움) | 400 | 158KB | The Gowun Project Authors | [google/fonts ofl/gowundodum](https://github.com/google/fonts/tree/main/ofl/gowundodum) | `OFL-gowundodum.txt` |
| `Gaegu-400.woff2` | Gaegu(개구 · 손글씨) | 400(100~500) | 82KB | The Gaegu Project Authors | [google/fonts ofl/gaegu](https://github.com/google/fonts/tree/main/ofl/gaegu) `Gaegu-Regular.ttf` | `OFL-gaegu.txt` |
| `Gaegu-700.woff2` | Gaegu | 700(600~900) | 219KB | 같음 | 같음 `Gaegu-Bold.ttf` | 같음 |
| `BlackHanSans-400.woff2` | Black Han Sans(검은고딕) | 400 | 79KB | Zess Type | [google/fonts ofl/blackhansans](https://github.com/google/fonts/tree/main/ofl/blackhansans) | `OFL-blackhansans.txt` |

## 서브셋 기준
- 한글: KS X 1001 완성형 2,350자(EUC-KR 0xB0A1~0xC8FE). 그 밖의 한글 음절은 기기 글꼴로 대체되어 보입니다.
- 영문 · 숫자 · 라틴-1, 일반 문장부호(U+2010~203B), 화살표 4종, ★☆○●•, CJK 문장부호(U+3000~3011), 한글 자모(U+3131~318E), 전각 영숫자.
- 도구: `pip` fonttools 4.66(`pyftsubset` 옵션과 같은 `fontTools.subset`), woff2(brotli). 힌팅 제거, 레이아웃 기능은 kern · liga · calt · ccmp · locl · mark · mkmk · tnum · pnum · lnum만 유지.
- 서브셋 스크립트: 원본을 받은 뒤 `fontTools.varLib.instancer`로 Noto Serif KR 가변 글꼴을 400 · 600으로 고정하고 서브셋합니다(재생성 시 같은 기준 사용).

## OFL 준수 사항
- 글꼴 파일 자체를 판매하지 않습니다. 홈페이지에 넣어 쓰는 것(임베딩)은 허용됩니다.
- 서브셋은 OFL의 '수정본'에 해당합니다. 수정본은 예약 글꼴 이름(Reserved Font Name)을 쓸 수 없으므로, 예약 이름이 없는 글꼴만 골랐습니다(각 OFL 파일의 Copyright 줄 확인). 나눔 계열(나눔손글씨 · 나눔명조)은 'Nanum'이 예약 이름이라 서브셋을 원래 이름으로 쓸 수 없어 제외하고, 손글씨는 Gaegu로 대체했습니다.
- 라이선스 원문(`OFL-*.txt`)을 글꼴과 함께 배포합니다.

## 쓰는 곳
- `didisam/hpdir.js`가 그 글꼴을 실제로 쓰는 사이트에만 `@font-face`(font-display: swap)를 넣습니다. 쓰는 경우: 테마 제목 글꼴(프리미엄 · 캠퍼스 → 명조, 따뜻한 학원 → 고운돋움, 키즈 → 검은고딕), 바로 고치기에서 고른 사이트 · 요소 글꼴(`hpimg.js`의 글꼴 6종), 명조를 쓰는 레이아웃 계열(editorial 등).
- 게시된 학습자 홈은 Shadow DOM 안에서 그려지므로, `lmerge.js`가 `@font-face`만 문서 머리로 올립니다(Shadow DOM 안의 `@font-face`는 브라우저가 무시함).
- 고딕(Pretendard)은 기존대로 씁니다.
