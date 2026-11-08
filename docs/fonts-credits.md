# 웹폰트 출처 · 라이선스 (didisam/fonts/)

홈페이지(고객 사이트)에서 쓰는 한글 웹폰트입니다. 모두 SIL Open Font License 1.1(OFL)입니다.

## 1. 저장소 분할본 (v34.5 F2 · `tools/fonts/build.py`)
한글 11,172자 + 라틴 + 기호를 약 95개 조각(woff2)으로 나누고, `unicode-range`로 쓰는 글자의 조각만 내려받습니다. 예약 글꼴 이름(RFN)이 없는 글꼴만 분할하므로 원래 family 이름을 그대로 씁니다.

| id(폴더) | 글꼴 | 굵기 | 한글 음절 | 저작권 | 원본(google/fonts) | 라이선스 |
|---|---|---|---|---|---|---|
| `noto-serif-kr` | Noto Serif KR | 400 · 700 (600 요청은 700) | 11,172 | Google LLC / Adobe | `ofl/notoserifkr/NotoSerifKR[wght].ttf` | `noto-serif-kr/OFL.txt` |
| `gowun-dodum` | Gowun Dodum(고운돋움) | 400 | 11,172 | The Gowun Dodum Project Authors | `ofl/gowundodum/GowunDodum-Regular.ttf` | `gowun-dodum/OFL.txt` |
| `gowun-batang` | Gowun Batang(고운바탕) | 400 · 700 | 11,172 | The Gowun Batang Project Authors | `ofl/gowunbatang/GowunBatang-{Regular,Bold}.ttf` | `gowun-batang/OFL.txt` |
| `hahmlet` | Hahmlet(함렛) | 600 · 800 | 2,788(원본 한계) | The Hahmlet Project Authors | `ofl/hahmlet/Hahmlet[wght].ttf` | `hahmlet/OFL.txt` |
| `do-hyeon` | Do Hyeon(도현) | 400 | 2,437(원본 한계) | The Do Hyeon Project Authors | `ofl/dohyeon/DoHyeon-Regular.ttf` | `do-hyeon/OFL.txt` |

- 원본 파일은 저장소에 넣지 않습니다. 받는 주소와 SHA-256은 `tools/fonts/build.py`의 `FAMILIES`에 있습니다.
- 조각 순서: `tools/fonts/slices-ko.json` — Google Fonts의 한국어 unicode-range 분할(빈도 순, 자주 쓰는 글자가 앞 조각)에서 한자를 뺀 것. 2026-11-08 받음.
- 원본 한계: 함렛 · 도현은 원본에 한글이 2,788 · 2,437자만 있습니다. 그 밖의 음절은 `HPF.css()`의 폴백 순서(함렛 → Noto Serif KR, 도현 → Pretendard)로 그립니다. 제목용으로 씁니다.
- 처리: 굵기 고정(`fontTools.varLib.instancer`) → 힌팅 제거 · 레이아웃 기능(kern · liga · calt · ccmp · locl · mark · mkmk · tnum · pnum · lnum · ljmo · vjmo · tjmo) 유지 → 조각별 woff2. 조각 주소에 내용 해시(`?h=`)를 붙여 다시 빌드해도 서비스 워커 저장본이 섞이지 않습니다.
- 크기 보정 폴백: 글꼴마다 `'<이름> Fallback'`(기기 한글 글꼴 + `size-adjust` · `ascent/descent/line-gap-override`)을 함께 선언해, 웹폰트가 오기 전후의 줄 높이 · 글자 폭 차이(CLS)를 줄입니다.

## 2. 원저작자 배포본 그대로 (CDN · jsdelivr)
RFN이 있는 글꼴은 분할 = 수정본이 되어 원래 이름을 쓸 수 없으므로, 원저작자가 배포한 분할본을 수정 없이 씁니다.

| id | 글꼴 | 주소 | 라이선스 |
|---|---|---|---|
| `pretendard` | Pretendard Variable | `cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/…/pretendardvariable-dynamic-subset.min.css` | OFL 1.1, RFN 'Pretendard' |
| `wanted-sans` | Wanted Sans (정적 500 · 700 · 800) | `cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/static/split/WantedSans-{Medium,Bold,ExtraBold}.min.css` (조각 평균 13KB, 가변 split 24KB보다 가벼움) | OFL 1.1, RFN 'Wanted Sans' |

## 3. 기존 저장 데이터 호환(legacy · KS X 1001 2,350자 서브셋, G1)
| 파일 | 글꼴 | 라이선스 |
|---|---|---|
| `Gaegu-400.woff2` · `Gaegu-700.woff2` | Gaegu(손글씨) | `OFL-gaegu.txt` |
| `BlackHanSans-400.woff2` | Black Han Sans(검은고딕) | `OFL-blackhansans.txt` |

새 조합에서는 쓰지 않습니다(F1 결정). 예전에 고른 사이트(`S.site.font`의 `hand` · `display`, `sty.ff`)만 받습니다. Noto Serif KR · Gowun Dodum의 2,350자 파일은 분할본으로 대체해 지웠습니다.

## 쓰는 곳
- `didisam/hpfontpick.js`의 `window.HPF`가 사이트 HTML에 나온 글꼴 이름을 찾아, 미리보기 문서 머리에 `fonts/<id>/font.css` link와 첫 화면 제목 조각 preload(1~2개)를 넣고, 게시 CSS에는 표식 `:root{--hpf:"…";--hpf-pre:"…"}`만 남깁니다(분할 @font-face는 safeCSS 200,000자 한도 때문에 사이트 CSS에 넣지 않음).
- 게시된 학습자 홈은 Shadow DOM 안에서 그려지므로 `lmerge.js`가 표식을 읽어 문서 머리에 같은 link · preload를 붙입니다(같은 출처 `fonts/`와 jsdelivr만).
- legacy 2종의 `@font-face`는 `hpdir.js`가 그대로 냅니다.

## OFL 준수 사항
- 글꼴 파일 자체를 판매하지 않습니다. 홈페이지에 넣어 쓰는 것(임베딩)은 허용됩니다.
- 라이선스 원문을 글꼴 폴더에 함께 배포합니다(`<id>/OFL.txt`, `OFL-*.txt`).
- 다시 만들기: `pip install --break-system-packages fonttools brotli && python3 tools/fonts/build.py` → 마지막 줄의 `V` 값을 `hpfontpick.js`의 `V`에 적습니다.
