package egovframework.didisam.mcp.service;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/** 외부 AI 연결(MCP) 서버 + 기관 API 키 (Node mcp.js와 같은 규격) */
public interface McpService {
    Map<String, Object> listKeys(Map<String, Object> a) throws Exception;
    Map<String, Object> createKey(Map<String, Object> a, byte[] body) throws Exception;
    Map<String, Object> revokeKey(Map<String, Object> a, byte[] body) throws Exception;

    /** /mcp 응답: 상태 · 추가 헤더 · 본문(JSON 객체, 문자열, 또는 없음) */
    record Out(int status, Map<String, String> headers, Object body) {}
    Out handle(HttpServletRequest req, byte[] body) throws Exception;
}
