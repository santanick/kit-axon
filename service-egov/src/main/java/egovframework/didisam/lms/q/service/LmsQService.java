package egovframework.didisam.lms.q.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** 묶음 Q — 비교과(성장마루 내재화: 상태 흐름 · 신청 승인 4종 · 팀 · 양식 · 역량 · 이수 · 설문 · 예산 · CQI · 학생 화면) */
public interface LmsQService {
    JsonNode handle(String method, String name, HttpServletRequest req, byte[] body) throws Exception;
}
