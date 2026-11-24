package egovframework.didisam.auth.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.auth.service.impl.SessionPolicy;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdModule;
import egovframework.didisam.cmm.DdProps;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** 가디언 4차: 세션 남은 시간 · 계속 사용 · 작업 모드 · 로그인 기기(세션) 목록 · 기관 보안 설정 — Node session.js routes와 같은 규격 */
@RestController
@RequestMapping("/api")
public class SessionController {
    private final AuthService auth; private final SessionPolicy sp; private final DdRateLimiter rl; private final DdProps p;
    public SessionController(AuthService auth, SessionPolicy sp, DdRateLimiter rl, DdProps p) { this.auth = auth; this.sp = sp; this.rl = rl; this.p = p; }

    @GetMapping("/session") public Map<String, Object> session(HttpServletRequest req) throws Exception {
        Map<String, Object> a = sp.check(req, true); if (a == null || (!p.module.isEmpty() && !DdModule.roleAllowed(p.module, a.get("role")))) throw new DdException(401, "로그인이 필요합니다.", "auth"); return sp.info(a);
    }
    @PostMapping("/session/touch") public Map<String, Object> touch(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); sp.touch(a); return sp.info(a); }
    @PostMapping("/session/work") public Map<String, Object> work(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception {
        Map<String, Object> a = auth.need(req); rl.limit("sw:" + a.get("uid"), 20, 3600_000L); return sp.work(a, DdWeb.readBody(body, 4096));
    }
    @GetMapping("/me/sessions") public Map<String, Object> list(HttpServletRequest req) throws Exception { return sp.list(auth.need(req)); }
    @PostMapping("/me/sessions/logout-others") public Map<String, Object> logoutOthers(HttpServletRequest req) throws Exception { return sp.logoutOthers(auth.need(req)); }
    @GetMapping("/org/security") public Map<String, Object> org(HttpServletRequest req) throws Exception { return sp.orgOut((String) auth.needStaff(req).get("tid")); }
    @PostMapping("/org/security") public Map<String, Object> orgSet(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception {
        Map<String, Object> a = auth.needOwner(req); rl.limit("osec:" + a.get("tid"), 30, 3600_000L); return sp.orgSet(a, DdWeb.readBody(body, 4096));
    }
}
