package egovframework.didisam.auth.web;

import egovframework.didisam.auth.service.OAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** v32.4 운영자 소셜 로그인 — GET start · callback은 302로 직접 응답한다(Node oauth.handle) */
@RestController
@RequestMapping("/api/oauth")
public class OAuthController {
    private final OAuthService svc;
    public OAuthController(OAuthService svc) { this.svc = svc; }

    @GetMapping("/{prov}/start") public void start(@PathVariable String prov, HttpServletRequest req, HttpServletResponse res) throws Exception { svc.start(prov, req, res); }
    @GetMapping("/{prov}/callback") public void callback(@PathVariable String prov, HttpServletRequest req, HttpServletResponse res) throws Exception { svc.callback(prov, req, res); }
    @GetMapping("/pending") public Map<String, Object> pending(HttpServletRequest req) throws Exception { return svc.pending(req); }
    @PostMapping("/cancel") public Map<String, Object> cancel(HttpServletResponse res) throws Exception { return svc.cancel(res); }
    @PostMapping("/signup") public Map<String, Object> signup(@RequestBody(required = false) byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception { return svc.signup(body, req, res); }
}
