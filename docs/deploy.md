# 운영 배포 (v38.4~)

## 기본: main 병합 = 자동 배포
- `main`에 PR이 병합되면 GitHub Actions `deploy-studio`가 테스트 → `service/gcp/deploy.sh didisam-studio`를 실행합니다.
- 끝나면 운영 `sw.js` 캐시 이름이 저장소 값과 같은지 확인하고, 다르면 실패로 표시합니다.
- 다시 배포: Actions › deploy-studio › Run workflow(main).
- 배포 승인 원칙은 그대로입니다. 대표님 「배포해」 → 통합 채팅방이 PR을 main에 병합합니다.

## 한 번만 준비 (대표님)
1. Cloud Shell(nick@didicast.com): `cd ~/kit-axon && git pull && bash service/gcp/github-deploy-setup.sh didisam-studio`
2. 출력된 `GCP_PROJECT` · `WIF_PROVIDER` · `DEPLOY_SA`를 GitHub 저장소 Settings › Secrets and variables › Actions › **Variables**에 넣습니다. 키 파일은 만들지 않습니다(Workload Identity, main 브랜치만 허용).

## 비상: GitHub Actions가 안 될 때
Cloud Shell에서 번들 업로드 없이 GitHub에서 바로 받습니다.
`cd ~/kit-axon && git fetch origin && git checkout -B main origin/main && bash service/gcp/deploy.sh didisam-studio`
