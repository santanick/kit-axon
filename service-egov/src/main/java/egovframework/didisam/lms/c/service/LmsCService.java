package egovframework.didisam.lms.c.service;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/** 학사 LMS 묶음 C 서비스 — 학습활동(토론 · 위키 · 팀 프로젝트 · 자기/동료 평가 · 대화방 · 설문 · 사전 과제/질문 · 수업 평가) */
public interface LmsCService {
    Object call(Map<String, Object> a, String op, HttpServletRequest req, byte[] body) throws Exception;
}
