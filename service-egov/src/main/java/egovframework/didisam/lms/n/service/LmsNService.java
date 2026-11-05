package egovframework.didisam.lms.n.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** 묶음 N — MOOC · 비학위(검색 · 찜 · 기수 · 수료 · 수료증 · 승인 · 정규 전환 · 진단 기반 학습경로) */
public interface LmsNService {
    JsonNode handle(String method, String name, HttpServletRequest req, byte[] body) throws Exception;
}
