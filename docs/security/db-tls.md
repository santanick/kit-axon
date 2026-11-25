# DB 전송 구간 암호화 · 서버 인증서 검증(가디언 4차 #13)

근거: 개인정보의 안전성 확보조치 기준 제7조④, KISA SN. 2026-11-25 이전에는 `DB_SSL=require`일 때 암호화만 하고 서버 인증서를 검증하지 않았습니다(`rejectUnauthorized: false`).

| 서버 | 설정 | 동작 |
|---|---|---|
| Node(`service/server/db.js`) | `DB_SSL_CA` = PEM 내용(비밀값) 또는 PEM 파일 경로, 선택 `DB_SSL_SERVERNAME` | `ssl: { ca, rejectUnauthorized: true }` — 인증서가 맞지 않으면 연결을 거부합니다 |
| Node | `DB_SSL=require`만 | 암호화만(검증 없음, 이전 동작 — 운영에서는 쓰지 않습니다) |
| Java(`service-egov`) | `JDBC_URL=jdbc:postgresql://<사설 IP>:5432/didisam?sslmode=verify-ca&sslrootcert=/secrets/db-ca.pem` | PostgreSQL JDBC가 서버 CA를 검증합니다. 호스트 이름까지 확인하려면 `sslmode=verify-full` |

운영 적용(대표님 콘솔 조치)
1. `gcloud sql instances describe didisam-pg --format='value(serverCaCert.cert)' | gcloud secrets create didisam-db-ca --data-file=-`
2. `bash service/gcp/deploy.sh <프로젝트ID>` — 비밀값이 있으면 `DB_SSL_CA`로 자동 연결합니다.
3. Cloud SQL 공인 IP를 끄고 사설 IP(VPC)로 전환합니다. Cloud SQL 커넥터(`--add-cloudsql-instances`, unix 소켓) 연결은 커넥터가 TLS로 암호화합니다.
