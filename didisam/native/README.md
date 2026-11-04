# 디디쌤 학습자 앱 — iOS · Android 포장

학습자 앱 화면은 웹과 하나입니다(`learner.html?app=1`, lapp.js · lapp.css). 앱을 고치면 웹 배포만으로 iOS · Android 앱이 함께 바뀝니다.

## 1. 지금 바로 쓰는 방법(설치 없이 · 스토어 심사 없이)
- **안드로이드(Chrome · 삼성 인터넷)**: 학습자 사이트 → 앱 첫 화면의 [설치] 또는 브라우저 메뉴 「앱 설치 / 홈 화면에 추가」.
- **iPhone · iPad(Safari)**: 공유 버튼 → 「홈 화면에 추가」. iOS 16.4 이상은 홈 화면 앱에서 웹 푸시 알림도 받을 수 있습니다.
- 설치하면 주소창 없이 전체 화면으로 열리고, 마지막에 쓴 기관으로 바로 들어갑니다.

## 2. 앱스토어 · 플레이스토어에 올리는 방법(Capacitor)
준비물: Node 18+, iOS는 macOS + Xcode 15+ · Apple Developer 계정, Android는 Android Studio · Google Play Console 계정.

```bash
cd native
npm install
npm run add:ios        # ios/ 폴더 생성
npm run add:android    # android/ 폴더 생성
npm run sync
npm run open:ios       # Xcode에서 서명(Team) 설정 → Archive → App Store Connect 업로드
npm run open:android   # Android Studio에서 Build > Generate Signed Bundle(.aab) → Play Console 업로드
```

- 앱 아이콘: `../app-icon-512.png`(원본), `../app-icon-maskable.png`(안드로이드 적응형). `npx @capacitor/assets generate`로 크기별 생성.
- 기관 전용 앱으로 내려면 `capacitor.config.json`의 `server.url`에 `&t=<기관 번호>`를 붙이고 `appId` · `appName`을 기관 것으로 바꿉니다.
- 운영 도메인이 정해지면 `server.url`을 운영 주소로 바꿉니다(지금은 GitHub Pages 시연 주소).

## 3. 심사 전에 꼭 할 일
- Apple 심사 지침 4.2(웹사이트를 감싼 것만으로는 거절될 수 있음): 푸시 알림(@capacitor/push-notifications — 학습 리마인더 · 선생님 답변 도착)을 운영 서버와 연결해 '앱에서만 되는 기능'을 갖춘 뒤 제출합니다.
- 개인정보 처리방침 URL, 계정 삭제 경로(앱 안 「나 › 회원정보 › 탈퇴」)를 심사 정보에 적습니다.
- 마이크 권한 문구(음성으로 묻기): iOS `Info.plist`에 `NSMicrophoneUsageDescription` = "AI 선생님에게 말로 질문할 때 사용합니다", `NSSpeechRecognitionUsageDescription` = "말한 내용을 글자로 바꿀 때 사용합니다". Android는 `RECORD_AUDIO`.
