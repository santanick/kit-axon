package egovframework.didisam.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** v32.4 운영자 소셜 로그인(구글 · 카카오) — Node oauth.js와 같은 규격 */
public interface OAuthService {
    void start(String prov, HttpServletRequest req, HttpServletResponse res) throws Exception;
    void callback(String prov, HttpServletRequest req, HttpServletResponse res) throws Exception;
    Map<String, Object> pending(HttpServletRequest req) throws Exception;
    Map<String, Object> cancel(HttpServletResponse res) throws Exception;
    Map<String, Object> signup(byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception;
}
