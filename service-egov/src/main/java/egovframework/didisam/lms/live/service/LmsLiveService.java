package egovframework.didisam.lms.live.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** x2 실시간 수업(SFR-024 · 049 · 072) · 실시간 자막 · 번역(SFR-077) */
public interface LmsLiveService {
    /** key = "{메서드} {이름}" (예: "POST join"). body는 POST 본문(GET은 null) */
    JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception;
}
