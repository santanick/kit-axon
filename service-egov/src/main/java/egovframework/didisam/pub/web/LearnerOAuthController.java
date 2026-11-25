package egovframework.didisam.pub.web;

import egovframework.didisam.pii.service.impl.LearnerOAuthServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

/** QA7 학습자 소셜 가입 · 로그인 — Node loauth.handle과 같은 두 경로(GET만, 나머지 메서드는 404) */
@RestController
public class LearnerOAuthController {
    private final LearnerOAuthServiceImpl svc;
    public LearnerOAuthController(LearnerOAuthServiceImpl svc) { this.svc = svc; }
    @GetMapping("/api/pub/{tid}/loauth/{p:google|kakao|naver}/start")
    public void start(@PathVariable("tid") String tid, @PathVariable("p") String p, HttpServletRequest req, HttpServletResponse res) throws Exception { svc.start(req, res, tid, p); }
    @GetMapping("/api/pub/loauth/{p:google|kakao|naver}/callback")
    public void callback(@PathVariable("p") String p, HttpServletRequest req, HttpServletResponse res) throws Exception { svc.callback(req, res, p); }
}
