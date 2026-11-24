# 백업 · 복구 리허설 절차 (#21, GS 신뢰성 · 회복성)

대상: 운영 SaaS(Cloud Run `didisam-studio` + Cloud SQL PostgreSQL 16 `didisam-pg`, 리전 asia-northeast3), 기관 전용(Terraform `didisam/deploy/terraform/gcp`).
리허설은 **복제 인스턴스로만** 합니다. 운영 인스턴스 덮어쓰기(`restore-backup`을 운영에 실행)는 실제 사고 때 대표님 · 개발 총괄 승인 후에만 합니다.

## 1. 현재 백업 설정(코드 근거)
| 항목 | 운영 SaaS (`service/setup-gcp.sh`) | 기관 전용 (`didisam/deploy/terraform/gcp/main.tf`) |
|---|---|---|
| 자동 백업 | 매일 18:00 UTC(한국 03:00) 시작 | 사용 |
| 보관 | 30개(30일) | 90개(90일) |
| 시점 복구(PITR) | 사용(트랜잭션 로그 7일) | 사용 |
| 가용성 | 단일 영역(ZONAL) | 리전 이중화(REGIONAL) |
| 삭제 보호 | 사용 | 사용 |
| 앱 이미지 | Artifact Registry `didisam` 저장소, 배포마다 새 리비전 | 같음 |

## 2. RTO · RPO(현실값)
| 장애 유형 | 복구 방법 | RPO(데이터 손실 한도) | RTO(복구 시간 목표) |
|---|---|---|---|
| 잘못된 배포 · 화면 오류 | Cloud Run 이전 리비전으로 트래픽 전환 | 0 | 10분 |
| 데이터 오삭제 · 손상 | PITR로 사고 직전 시점 복제 → 검증 → 연결 전환 | 5분 이내 | 2시간 |
| DB 인스턴스 장애(ZONAL) | 최신 자동 백업 · PITR로 새 인스턴스 | 5분 이내 | 2시간 |
| 리전 장애 | 백업으로 다른 리전 인스턴스 생성 · 재배포 | 24시간(마지막 일일 백업) | 8시간 |

복제 인스턴스 생성 시간은 데이터 크기에 따라 달라집니다. 리허설에서 실측한 시간을 아래 기록표에 남기고, 2시간을 넘으면 RTO를 고칩니다.

## 3. 리허설 A — 앱 이미지 롤백(분기 1회, 약 15분)
1. 현재 리비전 확인: `gcloud run revisions list --service didisam-studio --region asia-northeast3 --limit 5`
2. 직전 리비전으로 전환: `gcloud run services update-traffic didisam-studio --region asia-northeast3 --to-revisions <이전 리비전>=100`
3. 확인: `curl -fsS <서비스 주소>/api/health`, 운영자 로그인 · 학습자 사이트 열기
4. 원복: `--to-latest`로 최신 리비전에 다시 100%
5. 기록: 시작 · 전환 완료 · 확인 완료 시각, 확인자

## 4. 리허설 B — DB 시점 복구(PITR, 반기 1회, 약 1~2시간)
1. 복구 시점 정하기(예: 30분 전). 그 시점 뒤에 만든 시험용 표식(시험 기관의 공지 1건)을 미리 만들어 둡니다.
2. 복제 인스턴스 생성:
   `gcloud sql instances clone didisam-pg didisam-pg-drill --point-in-time '<UTC 시각, 예 2026-11-25T05:30:00Z>'`
3. 검증(복제본에만 접속, Cloud SQL Auth Proxy):
   - 기관 수 · 사용자 수 · 접속기록 건수가 운영과 같은 범위인지
   - 표식 공지가 **없어야** 정상(복구 시점 이후 데이터)
   - 개인정보 열은 암호문 그대로인지(`PII_KEY` 없이 평문이 보이면 안 됨)
4. 앱 연결 시험: 복제본 연결 문자열로 Cloud Run **별도 서비스**(`didisam-drill`, 내부 전용)를 띄워 로그인 · 학습자 사이트 확인. 운영 Secret `didisam-db-url`은 바꾸지 않습니다.
5. 정리: `gcloud run services delete didisam-drill`, `gcloud sql instances delete didisam-pg-drill`(삭제 보호 해제 후)
6. 기록: 복제 시작 → 사용 가능까지 걸린 시간(= RTO 실측), 복구 시점과 마지막 데이터 차이(= RPO 실측)

## 5. 리허설 C — 일일 백업 복원(연 1회)
1. 백업 목록: `gcloud sql backups list --instance didisam-pg`
2. 새 인스턴스 생성 후 복원: `gcloud sql backups restore <BACKUP_ID> --restore-instance didisam-pg-drill --backup-instance didisam-pg`
3. 리허설 B의 3~6과 같이 검증 · 정리 · 기록

## 6. 실제 사고 때 전환 순서
1. 가디언 긴급 차단(쓰기 중단) 또는 Cloud Run 트래픽 0% → 점검 안내
2. PITR 복제본 생성 · 검증
3. Secret `didisam-db-url` 새 버전을 복제본으로 → `service/gcp/deploy.sh` 재배포
4. 운영자 · 학습자 확인 후 트래픽 복구, 사고 보고서와 audit 기록
5. 원래 인스턴스는 원인 분석이 끝날 때까지 지우지 않습니다.

## 7. 기록표
| 일자 | 리허설 | 수행자 | 시작 | 사용 가능 | RTO 실측 | RPO 실측 | 결과 · 조치 |
|---|---|---|---|---|---|---|---|
| | A 이미지 롤백 | | | | | 0 | |
| | B PITR | | | | | | |

## 8. 남은 보완(후속)
- 운영 SaaS 인스턴스 가용성을 REGIONAL로 올리면 영역 장애 RTO가 수 분으로 줄어듭니다(비용 약 2배) — 공공 · 대학 운영 계약 시 결정.
- 리전 장애 대비 교차 리전 백업 위치(`--backup-location`) 지정은 아직 없습니다.
- 리허설은 실제 GCP 권한이 필요해 이번 회차에는 절차만 작성했습니다(실행 기록 없음).
