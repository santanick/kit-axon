package egovframework.didisam.cpl.service;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/** 규정 준수(Node compliance.js와 같은 규격): 활동 로그 · 1일 학습시간 · 동시접속 방지 · 본인확인 어댑터 */
public interface CplService {
    void afterLogin(HttpServletRequest req, String tid, String sid, String keepHash) throws Exception;
    Map<String, Object> route(HttpServletRequest req, byte[] body, String tid, String sid) throws Exception;
    Map<String, Object> summary(Map<String, Object> a) throws Exception;
    Map<String, Object> logs(Map<String, Object> a, String sid, String limit) throws Exception;
}
