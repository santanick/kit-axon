package egovframework.didisam.lms.g.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** x3 · SFR-016 원격수업 대리출석 방지 — 패스키(WebAuthn) · 인증 앱(TOTP) · 이메일 인증번호(어댑터) · 분반별 확인 규칙 */
public interface LmsGIdvService {
    /** key = "{메서드} {경로}" (예: "POST /api/lms/g/wa-verify"). body는 POST 본문(GET은 null) */
    JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception;
}
