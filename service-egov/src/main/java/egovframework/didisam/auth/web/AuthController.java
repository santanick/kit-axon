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
    @PostMapping("/logout") public Map<String, Object> logout(HttpServletRequest req, HttpServletResponse res) throws Exception { return authService.logout(req, res); }
    @GetMapping("/me") public Map<String, Object> me(HttpServletRequest req) throws Exception { return authService.meOut(authService.need(req)); }
}
