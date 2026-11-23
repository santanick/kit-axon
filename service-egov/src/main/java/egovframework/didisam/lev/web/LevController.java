package egovframework.didisam.lev.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.lev.service.LevService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** v46 학습 이벤트 조회(운영자 · 교수자 세션) — GET /api/lev?cls=&sid=&verb=&after= */
@RestController
@RequestMapping("/api")
public class LevController {
    private final AuthService auth; private final LevService lev;
    public LevController(AuthService auth, LevService lev) { this.auth = auth; this.lev = lev; }
    @GetMapping("/lev") public Map<String, Object> list(HttpServletRequest req) throws Exception { return lev.list(auth.need(req), req); }
}
