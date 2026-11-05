package egovframework.didisam.lms.f.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** v30 묶음 F — 시험 · 문제은행(SFR-004 · 023 · 045 · 060 · 085) */
public interface LmsFService {
    /** key = "{메서드} {이름}" (예: "GET list"). body는 POST 본문(GET은 null) */
    JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception;
}
