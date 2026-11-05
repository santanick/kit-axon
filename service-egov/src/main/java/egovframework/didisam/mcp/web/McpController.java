package egovframework.didisam.mcp.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.mcp.service.McpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** 기관 API 키(스튜디오 세션) · MCP 엔드포인트(키 인증) */
@RestController
public class McpController {
    private final AuthService authService; private final McpService mcpService;
    public McpController(AuthService authService, McpService mcpService) { this.authService = authService; this.mcpService = mcpService; }

    @GetMapping("/api/keys") public Map<String, Object> list(HttpServletRequest req) throws Exception { return mcpService.listKeys(authService.need(req)); }
    @PostMapping("/api/keys") public Map<String, Object> create(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception {
        return mcpService.createKey(authService.need(req), body);
    }
    @PostMapping("/api/keys/revoke") public Map<String, Object> revoke(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception {
        return mcpService.revokeKey(authService.need(req), body);
    }

    /** POST /mcp (MCP Streamable HTTP, JSON 응답). 다른 메서드는 Node와 같은 405 */
    @RequestMapping(value = "/mcp", method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH, RequestMethod.HEAD, RequestMethod.OPTIONS })
    public void mcp(@RequestBody(required = false) byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception {
        McpService.Out o = mcpService.handle(req, body);
        res.setStatus(o.status()); o.headers().forEach(res::setHeader);
        if (o.body() == null) return;
        if (o.body() instanceof String s) { res.getOutputStream().write(s.getBytes(StandardCharsets.UTF_8)); return; }
        res.setContentType("application/json; charset=utf-8");
        res.getOutputStream().write(DdWeb.JSON.writeValueAsBytes(o.body()));
    }
}
