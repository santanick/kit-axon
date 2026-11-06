package egovframework.didisam.lms.e.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** v30 묶음 E — 과제(SFR-035 · 046 · 079 · 081) */
public interface LmsEService {
    /** key = "{메서드} {이름}" (예: "GET list"). body는 POST 본문(GET은 null) */
    JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception;
}
