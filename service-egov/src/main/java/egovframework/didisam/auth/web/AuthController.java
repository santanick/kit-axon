package egovframework.didisam.auth.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdWeb;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final AuthService authService;
    public AuthController(AuthService authService) { this.authService = authService; }

    @GetMapping("/health") public Map<String, Object> health() throws Exception { authService.config(); return Map.of("ok", true); }
    @GetMapping("/config") public Map<String, Object> config() throws Exception { return authService.config(); }
    @PostMapping("/signup") public Map<String, Object> signup(@RequestBody(required = false) byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception {
        return authService.signup(body, req, res);
    }
    @PostMapping("/login") public Map<String, Object> login(@RequestBody(required = false) byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception {
        return authService.login(DdWeb.readBody(body, 4096), req, res);
    }
    /* 보안 4차 #1 관리자 추가 인증 */
    @PostMapping("/login/mfa") public Map<String, Object> loginMfa(@RequestBody(required = false) byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception { return authService.loginMfa(DdWeb.readBody(body, 4096), req, res); }
    @PostMapping("/login/mfa/resend") public Map<String, Object> loginMfaResend(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return authService.loginMfaResend(DdWeb.readBody(body, 4096), req); }
    @GetMapping("/me/mfa") public Map<String, Object> mfaGet(HttpServletRequest req) throws Exception { return authService.mfaGet(authService.need(req)); }
    @PostMapping("/me/mfa") public Map<String, Object> mfaPost(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { Map<String, Object> a = authService.need(req); return authService.mfaPost(a, DdWeb.readBody(body, 4096)); }
    @DeleteMapping("/me/mfa") public Map<String, Object> mfaDelete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { Map<String, Object> a = authService.need(req); return authService.mfaDelete(a, DdWeb.readBody(body, 4096)); }
    @PostMapping("/logout") public Map<String, Object> logout(HttpServletRequest req, HttpServletResponse res) throws Exception { return authService.logout(req, res); }
    @GetMapping("/me") public Map<String, Object> me(HttpServletRequest req) throws Exception { return authService.meOut(authService.need(req)); }
    @GetMapping("/me/devices") public Map<String, Object> devices(HttpServletRequest req) throws Exception { return authService.devices(authService.need(req), req); }
}
