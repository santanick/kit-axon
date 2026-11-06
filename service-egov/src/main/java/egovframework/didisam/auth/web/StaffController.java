package egovframework.didisam.auth.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdWeb;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** v31 교강사 · 부운영자 계정, 비밀번호 변경 — Node app.js와 같은 규격 */
@RestController
@RequestMapping("/api")
public class StaffController {
    private final AuthService authService;
    public StaffController(AuthService authService) { this.authService = authService; }
    @PostMapping("/password") public Map<String, Object> password(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return authService.password(authService.need(req), DdWeb.readBody(body, 4096)); }
    @GetMapping("/staff") public Map<String, Object> list(HttpServletRequest req) throws Exception { return authService.staffList(authService.needOwner(req)); }
    @PostMapping("/staff") public Map<String, Object> create(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return authService.staffCreate(authService.needOwner(req), DdWeb.readBody(body, 4096)); }
    @PostMapping("/staff/remove") public Map<String, Object> remove(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return authService.staffRemove(authService.needOwner(req), DdWeb.readBody(body, 4096)); }
}
