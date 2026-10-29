# 디디쌤 스튜디오 — 전용 클라우드 / 고객 클라우드(GCP) 데이터룸 참조 구성
# 기관 GCP 프로젝트 안에 기관 전용 KMS 키 · DB · 버킷 · 서비스 계정을 만든다.
# terraform apply -var project_id=<기관 프로젝트> -var tenant_id=tn_8k2m4q1z
terraform {
  required_version = ">= 1.6"
  required_providers {
    google      = { source = "hashicorp/google", version = "~> 6.0" }
    google-beta = { source = "hashicorp/google-beta", version = "~> 6.0" }
  }
}

variable "project_id" { type = string }
variable "tenant_id" { type = string }
variable "region" {
  type    = string
  default = "asia-northeast3" # 서울
}
variable "delegate_operator" {
  type        = string
  default     = ""
  description = "디디쌤 위임 운영 그룹(예: group:ops@didisam.com). 기관 직접 운영이면 비워 둔다."
}

provider "google" {
  project = var.project_id
  region  = var.region
}
provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals { name = replace(var.tenant_id, "_", "-") }

data "google_project" "this" {}

# 고객 관리 키(CMEK) — 이 키를 폐기하면 데이터와 백업을 복구할 수 없다(암호화 삭제).
resource "google_kms_key_ring" "room" {
  name     = "didisam-${local.name}"
  location = var.region
}
resource "google_kms_crypto_key" "room" {
  name            = "dataroom"
  key_ring        = google_kms_key_ring.room.id
  rotation_period = "7776000s" # 90일
  lifecycle { prevent_destroy = true }
}

resource "google_project_service_identity" "sql" {
  provider = google-beta
  service  = "sqladmin.googleapis.com"
}
resource "google_kms_crypto_key_iam_member" "sql" {
  crypto_key_id = google_kms_crypto_key.room.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_project_service_identity.sql.email}"
}
resource "google_kms_crypto_key_iam_member" "gcs" {
  crypto_key_id = google_kms_crypto_key.room.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${data.google_project.this.number}@gs-project-accounts.iam.gserviceaccount.com"
}

# 기관 전용 DB(외부 IP 없음)
resource "google_sql_database_instance" "room" {
  name                = "didisam-${local.name}"
  database_version    = "POSTGRES_16"
  region              = var.region
  encryption_key_name = google_kms_crypto_key.room.id
  deletion_protection = true
  settings {
    tier              = "db-custom-2-7680"
    availability_type = "REGIONAL"
    ip_configuration { ipv4_enabled = false }
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings { retained_backups = 90 }
    }
  }
  depends_on = [google_kms_crypto_key_iam_member.sql]
}
resource "google_sql_database" "room" {
  name     = "didisam_${var.tenant_id}"
  instance = google_sql_database_instance.room.name
}

# 기관 전용 파일 저장소
resource "google_storage_bucket" "room" {
  name                        = "didisam-${local.name}-${var.project_id}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  encryption { default_kms_key_name = google_kms_crypto_key.room.id }
  versioning { enabled = true }
  depends_on = [google_kms_crypto_key_iam_member.gcs]
}

# 앱이 쓰는 서비스 계정(이 버킷 · DB만)
resource "google_service_account" "app" {
  account_id   = "didisam-${local.name}"
  display_name = "디디쌤 스튜디오 ${var.tenant_id}"
}
resource "google_storage_bucket_iam_member" "app" {
  bucket = google_storage_bucket.room.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.app.email}"
}
resource "google_project_iam_member" "app_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app.email}"
}
resource "google_project_iam_member" "app_vertex" { # AI 경로가 vertex일 때
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# 디디쌤 위임 운영(선택) — 배포 · 모니터링 권한만, 데이터 열람 권한 없음
resource "google_project_iam_member" "delegate" {
  count   = var.delegate_operator == "" ? 0 : 1
  project = var.project_id
  role    = "roles/run.developer"
  member  = var.delegate_operator
}

output "dataroom" {
  value = {
    tenant   = var.tenant_id
    database = google_sql_database_instance.room.connection_name
    bucket   = google_storage_bucket.room.name
    kms_key  = google_kms_crypto_key.room.id
    app_sa   = google_service_account.app.email
  }
}
