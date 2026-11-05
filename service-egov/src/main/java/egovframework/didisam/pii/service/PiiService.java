package egovframework.didisam.pii.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/**
 * 학습자 간편가입 · 개인정보 분리(Node pii.js와 같은 규격).
 * 학습 데이터는 가명 learner_id + 닉네임만, 신원(이메일 · SNS 식별자 · 휴대폰 · 이름 · 비밀번호 해시 · 동의)은 pii 스키마에 AES-256-GCM으로.
 */
public interface PiiService {
    /* 공개(세션 없음) */
    Map<String, Object> otp(HttpServletRequest req, byte[] body, String tid) throws Exception;
    Map<String, Object> signup(HttpServletRequest req, HttpServletResponse res, byte[] body, String tid) throws Exception;
    Map<String, Object> guardian(HttpServletRequest req, byte[] body, String tid) throws Exception;
    /** 간편 로그인(via = email · sns · univ) → learner_id, 세션 쿠키 발급 */
    String login(HttpServletRequest req, HttpServletResponse res, String tid, JsonNode b) throws Exception;
    /* 본인 세션 */
    Map<String, Object> myPii(HttpServletRequest req, byte[] body, String tid, String sid) throws Exception;
    Map<String, Object> withdraw(byte[] body, String tid, String sid) throws Exception;
    Map<String, Object> verify(byte[] body, String tid, String sid) throws Exception;
    /* 운영자 */
    Map<String, Object> adminList(Map<String, Object> a) throws Exception;
    Map<String, Object> adminPii(Map<String, Object> a, byte[] body) throws Exception;
    Map<String, Object> adminLog(Map<String, Object> a) throws Exception;
    /** 보존 기간 정리(만료 인증번호 · 7일 안에 보호자 동의 없는 미성년 가입) */
    int purge() throws Exception;
    /** 학습자 세션(30일) 발급 */
    void newLearnerSession(HttpServletResponse res, String tid, String sid) throws Exception;
}
