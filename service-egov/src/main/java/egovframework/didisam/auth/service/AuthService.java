package egovframework.didisam.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** 운영자 인증 · 기관 가입 서비스 (Node app.js /api/signup · login · logout · me 와 같은 규격) */
public interface AuthService {
    Map<String, Object> config() throws Exception;
    Map<String, Object> signup(byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception;
    Map<String, Object> login(JsonNode b, HttpServletRequest req, HttpServletResponse res) throws Exception;
    Map<String, Object> logout(HttpServletRequest req, HttpServletResponse res) throws Exception;
    /** 세션 확인(유휴 연장 포함). 없으면 null */
    Map<String, Object> auth(HttpServletRequest req) throws Exception;
    /** 세션 필수. 없으면 401 */
    Map<String, Object> need(HttpServletRequest req) throws Exception;
    Map<String, Object> meOut(Map<String, Object> a);
    /** 교강사 제외 */
    Map<String, Object> needStaff(HttpServletRequest req) throws Exception;
    /** 정운영자만 */
    Map<String, Object> needOwner(HttpServletRequest req) throws Exception;
    Map<String, Object> password(Map<String, Object> a, JsonNode b) throws Exception;
    Map<String, Object> staffList(Map<String, Object> a) throws Exception;
    Map<String, Object> staffCreate(Map<String, Object> a, JsonNode b) throws Exception;
    Map<String, Object> staffRemove(Map<String, Object> a, JsonNode b) throws Exception;
}
