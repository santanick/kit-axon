package egovframework.didisam.lms.h.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** v30 묶음 H — 성적(SFR-032 · 050) */
public interface LmsHService {
    /** key = "{메서드} {이름}" (예: "GET list"). body는 POST 본문(GET은 null) */
    JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception;
}
