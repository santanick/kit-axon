# 외부 서비스 로고(실제 서비스 로고) — 출처 · 사용 규칙

v37(대표님 2026-11-10 「외부 연결 등은 로고를 실제 해당 서비스 로고로」). 화면 코드: `didisam/brand.js`(`brandLogo(id, px)`), 원본 SVG: `didisam/img/brand/`.

## 출처
- [Simple Icons](https://simpleicons.org) 저장소의 SVG 경로와 공식 색(hex)을 그대로 씁니다. Simple Icons 자체는 CC0 1.0이지만,
  로고는 각 회사의 **상표**입니다(저작권 포기와 상표 사용 허락은 별개). 연결 상대를 가리키는 용도(지명적 사용)로만 쓰고, 디디쌤 제품 로고처럼 쓰지 않습니다.
- Slack · Microsoft는 simple-icons@10.4.0에서 가져왔습니다. 이후 버전에서 상표권자 요청으로 빠졌으므로, 정식 출시 전 각 사 브랜드 센터의 공식 파일로 바꾸는 것을 권장합니다(아래 '공식 자료').

| id | 서비스 | 파일(img/brand/) | simple-icons 버전 | 공식 색 | 브랜드 가이드 · 공식 자료 |
|---|---|---|---|---|---|
| claude | Claude | claude.svg | 16.37.0 | #D97757 | https://claude.ai |
| mcp | Model Context Protocol | modelcontextprotocol.svg | 16.37.0 | #000000 | https://github.com/modelcontextprotocol/docs/blob/573dc60c2e7aab2605b29d0bf27194aa7b02e4fb/logo/light.svg |
| slack | Slack | slack.svg | 10.4.0 | #4A154B | https://slack.com/brand-guidelines |
| google | Google | google.svg | 16.37.0 | #4285F4 | https://about.google/brand-resource-center/brand-elements/ |
| gcal | Google Calendar | googlecalendar.svg | 16.37.0 | #4285F4 | https://fonts.gstatic.com/s/i/productlogos/calendar_2020q4/v8/192px.svg |
| gdrive | Google Drive | googledrive.svg | 16.37.0 | #4285F4 | https://developers.google.com/drive/web/branding |
| gmail | Gmail | gmail.svg | 16.37.0 | #EA4335 | https://fonts.gstatic.com/s/i/productlogos/gmail_2020q4/v8/192px.svg |
| kakao | KakaoTalk | kakaotalk.svg | 16.37.0 | #FFCD00 | https://commons.wikimedia.org/wiki/File:KakaoTalk_logo.svg |
| naver | NAVER | naver.svg | 16.37.0 | #03C75A | https://developers.naver.com/docs/login/bi/bi.md |
| zoom | Zoom | zoom.svg | 16.37.0 | #0B5CFF | https://brand.zoom.us/usage-legal/ |
| youtube | YouTube | youtube.svg | 16.37.0 | #FF0000 | https://www.youtube.com/howyoutubeworks/resources/brand-resources/#logos-icons-and-colors |
| notion | Notion | notion.svg | 16.37.0 | #000000 | https://www.notion.so |
| microsoft | Microsoft | microsoft.svg | 10.4.0 | #5E5E5E | https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks |

## 사용 규칙(변형 금지)
- 모양 · 비율 · 색을 바꾸지 않습니다(늘이기 · 기울이기 · 그림자 · 다른 색 금지). 한 가지 공식 색으로만 그립니다.
- 흰 바탕 정사각 타일 안에 그리고, 둘레 여백은 타일 한 변의 20%입니다(가이드의 최소 여백 이상). 최소 크기 20px.
- 카카오: 카카오 로그인 디자인 가이드의 조합(바탕 #FEE500 + 심볼 검정 #000000). 네이버: 네이버 로그인 BI 조합(바탕 #03C75A + 흰색 N).
- 공식 로고 파일을 확보하지 못한 서비스(토스페이먼츠 · 채널톡 · HRD-Net)는 로고를 흉내 낸 그림을 만들지 않고 글자 타일(서비스 색 글자)로 둡니다.
  각 사 공식 자료(토스페이먼츠 브랜드 리소스, 채널톡 브랜드 키트, 고용24 · HRD-Net 이용 안내)를 받으면 img/brand/에 넣고 brand.js의 BR에 추가합니다.

## 쓰는 곳
설정 › 외부 연결 카드 · 연결(conn) 목록과 시트 · 홈 AI 비서 Connect(운영자 · 교수자) · 캘린더 연동(Google · 네이버).
