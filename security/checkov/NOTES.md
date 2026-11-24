# Dockerfile · service/gcp 점검 메모 (2026-11-24, 보안전문가)

Checkov 3.2.469(`security/checkov/.checkov.yaml`) 결과: dockerfile 165건 통과 · github_actions 112건 통과 · 실패 0건.
Checkov는 gcloud 셸 스크립트를 읽지 못하므로 아래는 직접 점검한 결과입니다. 수정은 가디언 원장 finding → 수정 PR → 사람 승인 순서로 진행합니다(이번 회차는 기록만).

| ID | 대상 | 내용 | 등급 | 권고 |
|---|---|---|---|---|
| IAC-01 | `.github/workflows/*.yml` | Action이 태그(`@v4`, `@v2`)로만 고정됨. 2026-03 Trivy 태그 변조 사례(보고서 1213줄)와 같은 공급망 위험 | 높음 | 모든 `uses:`를 커밋 SHA로 고정(주석에 태그 표기). 워크플로 수정은 가디언 금지 범위이므로 통합 채팅방이 직접 처리 |
| IAC-02 | `service/Dockerfile` · `gcp/Dockerfile.lite` | 기반 이미지 `node:22-alpine` · `alpine:3.20`이 다이제스트 미고정 | 보통 | `@sha256:` 고정 + Dependabot docker 생태계로 갱신(`.github/dependabot.yml` 포함) |
| IAC-03 | `service/Dockerfile` whisper 단계 | `git clone --branch v1.7.4`와 모델 `curl` 내려받기에 무결성 검증 없음 | 보통 | 커밋 SHA 체크아웃 · 모델 `sha256sum -c` 검증 |
| IAC-04 | `gcp/setup.sh` · `setup-gcp.sh` Cloud SQL | `--no-assign-ip` · `--ssl-mode` 미지정 → 공인 IP가 붙고 SSL 강제가 없음(커넥터 경유라 허용 네트워크는 비어 있음) | 보통 | `--ssl-mode=ENCRYPTED_ONLY`, 가능하면 사설 IP(Serverless VPC) — 운영 변경이라 대표님 조치 |
| IAC-05 | `gcp/github-deploy-setup.sh` | 배포 계정에 프로젝트 전체 `roles/storage.admin` · `roles/run.admin` | 보통 | 버킷 단위 `storage.objectAdmin`, 서비스 단위 `run.developer`로 축소 |
| IAC-06 | `gcp/deploy.sh` | 비밀값을 `:latest`로 참조 → 재배포 시 롤백 버전 불명확 | 낮음 | 운영은 숫자 버전 고정, 교체 시 버전 올림 |
| IAC-07 | `gcp/deploy.sh` | `--allow-unauthenticated` + `--ingress $ING` | 정보 | 공개 웹 서비스라 필요. 앱 로그인 · RLS가 경계이며, 관리 API(`/api/security/*`)는 owner 전용 확인 유지 |

확인된 양호 항목: 실행 사용자 `USER node`, 빌드 비밀은 BuildKit `--mount=type=secret`(이미지에 남지 않음), 운영 비밀은 Secret Manager(`--set-secrets`), Cloud SQL 삭제 보호 · PITR · 백업 30개, WIF 조건이 저장소 + `main` 브랜치로 제한, 이미지 태그는 커밋 해시.

`CKV_DOCKER_2`(HEALTHCHECK) 제외 근거: Cloud Run은 컨테이너 HEALTHCHECK를 쓰지 않고 자체 시작 프로브로 `/api/health`를 확인합니다.
