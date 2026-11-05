package egovframework.didisam.lms.k.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** 묶음 K — 설문(단위별 · 다국어 · 템플릿 · 통계 · 내보내기 · 강의평가 · 게이트) */
public interface LmsKService {
    JsonNode handle(String method, String name, HttpServletRequest req, byte[] body) throws Exception;
}
