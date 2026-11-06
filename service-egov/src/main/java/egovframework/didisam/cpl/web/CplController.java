package egovframework.didisam.cpl.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cpl.service.CplService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cpl")
public class CplController {
    private final AuthService authService; private final CplService cplService;
    public CplController(AuthService authService, CplService cplService) { this.authService = authService; this.cplService = cplService; }
    @GetMapping("/summary") public Map<String, Object> summary(HttpServletRequest req) throws Exception { return cplService.summary(authService.need(req)); }
    @GetMapping("/logs") public Map<String, Object> logs(HttpServletRequest req, @RequestParam(required = false) String sid, @RequestParam(required = false) String limit) throws Exception { return cplService.logs(authService.need(req), sid, limit); }
}
