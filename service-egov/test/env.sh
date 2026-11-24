# 대조 테스트용 환경변수(두 서버에 똑같이) — 운영 값 아님. 사용: . test/env.sh
export COOKIE_SECURE=0 TRUST_PROXY_HOPS=0
export PII_KEY="${PII_KEY:-$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")}"
export SESSION_PEPPER="${SESSION_PEPPER:-contract-test-pepper-not-for-production}"
export ANTHROPIC_API_KEY=sk-ant-test-contract-dummy ANTHROPIC_URL=http://127.0.0.1:8099/v1/messages
export PII_DEV_OTP=1 OAUTH_DEV=1 IDV_DEV=1
# 보안 4차 #1: 기존 대조 시험은 로그인 직후 세션을 기대한다 → 2단계 건너뜀(시험 · 데모 전용, 운영 기본 아님). 2단계 대조는 contract-mfa.js가 MFA_OFF=0으로 따로 띄운다
export MFA_OFF="${MFA_OFF:-1}"
