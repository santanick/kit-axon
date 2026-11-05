# 학사 LMS 도메인 스키마 (설계안 v1.0, 2026-11-05)

대학 학사 LMS 에디션용 강좌 · 분반 · 수강 · 출석 · 성적 테이블 17개. `001_lms_domain.sql` 한 파일.

- 적용: Node 마이그레이션(service/server/db.js) 이후 실행. 다음 단계에서 db.js 마이그레이션 7번으로 편입 예정.
- 원칙: 모든 표 tenant_id + RLS(tenant_iso, force), 앱은 didisam_tenant 역할로만 접근. 구성원은 학번 · 학과 · 학적만 저장(이름 · 연락처 저장 안 함).
- 학사(SIS)가 주인인 값은 `source` · `sis_key` · `synced_at`으로 출처를 남긴다.
- 2026-11-05 검증(별도 DB `ddlms`): 생성 · RLS 격리(A 기관 1건 / B 기관 0건) · 다른 기관 명의 저장 거부 · 출결 코드값 검사 통과.

| 영역 | 테이블 | 근거 요건 |
|---|---|---|
| 기준 | lms_term(학기) · lms_org_unit(조직) · lms_person(구성원) · lms_course(교과목) | SFR-003 · 050 · 005 |
| 분반 | lms_section(합반 대표분반 · 공유분반 숨김 · 수업계획서) · lms_section_staff · lms_section_sync(분반 동기화 이력) | SFR-018 · 019 · 025 |
| 수강 | lms_enrollment(정규 · 청강) | SFR-003 · 028 |
| 주차 | lms_session(주차 · 차시 · 원격수업 학습분량) | SFR-015 · 033 |
| 출석 | lms_attendance_rule · lms_attendance_code(해시) · lms_attendance(출석 · 지각 · 결석 · 공결, 증빙) | SFR-010 · 016 · 031 · 068 |
| 성적 | lms_grade_item(평가 비율) · lms_grade_score · lms_grade_final(확정 · 학사 전송) · lms_grade_history | SFR-032 |
| 연동 | lms_sis_sync_run(실행 기록 · 정합성 경고) | SFR-003 · 050 |
