# Dockerfile · service/gcp 점검 메모 (2026-11-24, 보안전문가)

Checkov 3.2.469(`security/checkov/.checkov.yaml`) 결과: dockerfile 165건 통과 · github_actions 112건 통과 · 실패 0건.
Checkov는 gcloud 셸 스크립트를 읽지 못하므로 아래는 직접 점검한 결과입니다. 수정은 가디언 원장 finding → 수정 PR → 사람 승인 순서로 진행합니다(이번 회차는 기록만).

| ID | 대상 | 내용 | 등급 | 권고 |
|---|---|---|---|---|
| IAC-01 | `.github/workflows/*.yml` | Action이 태그(`@v4`, `@v2`)로만 고정됨. 2026-03 Trivy 태그 변조 사례(보고서 1213줄)와 같은 공급망 위험 | 높음 | 모든 `uses:`를 커밋 SHA로 고정(주석에 태그 표기). 워크플로 수정은 가디언 금지 범위이므로 통합 채팅방이 직접 처리 |
| IAC-02 | `service/Dockerfile` · `gcp/Dockerfile.lite` | 기반 이미지 `node:22-alpine` · `alpine:3.20`이 다이제스트 미고정 | 보통 | `@sha256:` 고정 + Dependabot docker 생태계로 갱신(`.github/dependabot.yml` 포함) |
| IAC-03 | `service/Dockerfile` whisper 단계 | `git clone --branch v1.7.4`와 모델 `curl` 내려받기에 무결성 검증 없음 | 보통 | 커밋 SHA 체크아웃 · 모델 `sha256sum -c` 검증 |
| IAC-04 | `gcp/setup.sh` · `setup-gcp.sh` Cloud SQL | `--no-assign-ip` · `--ssl-mode` 미지정 → 공인 IP가 붙고 SSL 강제가 없음(커넥터 경유라 허용 네트워크는 비어 있음) | 보통 | **스크립트 수정(가디언 2차)**: 생성 · 기존 인스턴스 모두 `--ssl-mode=ENCRYPTED_ONLY`, 승인 네트워크 비어 있음 확인. 사설 IP는 다음 단계. 운영 반영은 대표님이 setup.sh 재실행 |
| IAC-05 | `gcp/github-deploy-setup.sh` | 배포 계정에 프로젝트 전체 `roles/storage.admin` · `roles/run.admin` | 보통 | **스크립트 수정(가디언 2차)**: 프로젝트 run.admin · storage.admin · artifactregistry.writer 회수 → 서비스 `run.developer` · `_cloudbuild` 버킷 `objectAdmin` · 저장소 `artifactregistry.writer`. 운영 반영은 재실행 |
| IAC-06 | `gcp/deploy.sh` | 비밀값을 `:latest`로 참조 → 재배포 시 롤백 버전 불명확 | 낮음 | **스크립트 수정(가디언 2차)**: deploy.sh가 ENABLED 최신 숫자 버전으로 고정, 교체 절차 `docs/security/secrets.md` |
| IAC-07 | `gcp/deploy.sh` | `--allow-unauthenticated` + `--ingress $ING` | 정보 | 공개 웹 서비스라 필요. 앱 로그인 · RLS가 경계이며, 관리 API(`/api/security/*`)는 owner 전용 확인 유지 |

확인된 양호 항목: 실행 사용자 `USER node`, 빌드 비밀은 BuildKit `--mount=type=secret`(이미지에 남지 않음), 운영 비밀은 Secret Manager(`--set-secrets`), Cloud SQL 삭제 보호 · PITR · 백업 30개, WIF 조건이 저장소 + `main` 브랜치로 제한, 이미지 태그는 커밋 해시.

`CKV_DOCKER_2`(HEALTHCHECK) 제외 근거: Cloud Run은 컨테이너 HEALTHCHECK를 쓰지 않고 자체 시작 프로브로 `/api/health`를 확인합니다.

## 가디언 5차 스캔 도구 로컬 실행 결과(2026-11-25, 보안전문가 g3)
도커 데몬이 없어 이미지 스캔은 CI에서 처음 실행합니다. 아래는 같은 고정 버전을 저장소에 직접 실행한 결과이며, 원장 반영은 통합 담당이 finding으로 넣습니다.

| 도구 | 대상 | 결과 | 조치(권고) |
|---|---|---|---|
| Checkov 3.2.469 | service · service-egov · .github | dockerfile 192 · github_actions 313 통과, 실패 0(CKV_GHA_7은 근거 주석 후 제외) | - |
| Trivy 0.76.2 fs | service-egov/pom.xml(전이 의존성) | CRITICAL 10 · HIGH 18 — tomcat-embed-core 10.1.54(C8 · H4, 수정 10.1.59), spring-webmvc 6.2.18(C2 · H2, 수정 6.2.19), jackson-databind/core 2.21.2(H8, 수정 2.21.7), postgresql 42.7.10(H2, 수정 42.7.12), spring-expression(H1) | Spring Boot 3.5.x 최신 패치로 올리고 tomcat · jackson 속성 고정. **이 상태로는 `trivy`(egov) · `osv` 잡이 실패 기준에 걸립니다** |
| Trivy 0.76.2 config | didisam/deploy/terraform/gcp/main.tf:74 | HIGH GCP-0015 Cloud SQL SSL 강제 없음 | `ssl_mode = "ENCRYPTED_ONLY"`(IAC-04와 같은 조치) |
| OSV-Scanner 2.7.1 | package-lock · pom.xml | npm 0건, Maven 53건(C10 · H17 · M21 · L5) | 위와 같음 |
| 교차(OSV-Scanner × 가디언 SBOM×OSV) | 같은 파일 | 가디언 scan 0건 · 스캐너에만 11개 구성요소, 그중 10개는 SBOM 미포함(Maven 전이 의존성) | `service/security/sbom.js`가 pom 직접 의존성만 담음 — 전이 의존성(또는 OSV-Scanner 결과 합류) 보완 필요 |
| Semgrep 공개 규칙 p/java · p/owasp-top-ten | service/server · service-egov/src · didisam | 89건(ERROR 6 · WARNING 83). ERROR 6은 `gcm-no-tag-length` — aigw · ledger · lms/aria · mfa · pii · statecrypt의 AES-GCM 복호화에 태그 길이 미지정 | `createDecipheriv(..., { authTagLength: 16 })` 지정(짧은 태그 위조 방지). WARNING은 innerHTML 기준선과 같은 계열 |
| 외부 노출면 | example.com(기능 확인용 중립 도메인) | TLS 1.3 · 구버전 거부 · HSTS 없음 P2, crt.sh 시간 초과 → '미연결' 처리 확인 | 실제 대상은 `vars.SURFACE_DOMAINS` 설정 후 CI에서 실행 |
