package egovframework.didisam.sec.web;

import egovframework.didisam.sec.service.SecService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** /api/security/* — 경로 · 메서드 판정은 SecService.route(Node security.match와 같은 표). 없는 조합은 404 not_found */
@RestController
public class SecController {
    private final SecService sec;
    public SecController(SecService sec) { this.sec = sec; }
    @RequestMapping("/api/security/**")
    public Object any(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return sec.route(req.getMethod(), req.getRequestURI(), req, body); }
}
