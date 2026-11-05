package egovframework.didisam.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** 운영자 인증 · 기관 가입 서비스 (Node app.js /api/signup · login · logout · me 와 같은 규격) */
public interface AuthService {
    Map<String, Object> config();
    Map<String, Object> signup(JsonNode b, HttpServletRequest req, HttpServletResponse res);
    Map<String, Object> login(JsonNode b, HttpServletRequest req, HttpServletResponse res);
    Map<String, Object> logout(HttpServletRequest req, HttpServletResponse res);
    /** 세션 확인(유휴 연장 포함). 없으면 null */
    Map<String, Object> auth(HttpServletRequest req);
    /** 세션 필수. 없으면 401 */
    Map<String, Object> need(HttpServletRequest req);
    Map<String, Object> meOut(Map<String, Object> a);
}
