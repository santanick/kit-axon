/* KIT AX ON 운영 설정
 * firebase 값이 비어 있으면 '시연 모드'(브라우저 저장)로 동작합니다.
 * 운영 전환: Firebase 콘솔 > 프로젝트 설정 > 웹 앱 구성 값을 아래에 넣으면 됩니다. (server/README.md 참고)
 */
window.KIT_CONFIG = {
  firebase: null, // 예: { apiKey: '...', authDomain: '...firebaseapp.com', projectId: '...', appId: '...' }
  region: 'asia-northeast3', // Cloud Functions 리전(서울)
  adminDomain: '', // 관리자 Google 계정 도메인 제한(선택), 예: 'kit.ac.kr'
  vodBase: '' // 자체 VOD 전송망(CDN) 주소(선택), 예: 'https://dxxxx.cloudfront.net/' — 비우면 Firebase Storage에서 직접 재생
};
