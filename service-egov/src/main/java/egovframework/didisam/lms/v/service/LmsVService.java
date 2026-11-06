package egovframework.didisam.lms.v.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** v32 미디어 파이프라인(자체 CMS · 스트리밍 · 녹화 · 자동자막) — ECR-002 · SFR-062 · ECR-003 · SFR-073 */
public interface LmsVService {
    /** key = "{메서드} {이름}" (예: "GET list"). body는 POST 본문(GET은 null) */
    JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception;
    /** GET /api/lms/v/hls — 재생목록 · 세그먼트를 직접 응답한다(캐시 머리말 포함) */
    void hls(HttpServletRequest req, HttpServletResponse res) throws Exception;
}
