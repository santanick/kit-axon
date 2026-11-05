package egovframework.didisam.ai.web;

import egovframework.didisam.ai.service.AiService;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.bench.service.BenchService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** AI 게이트웨이 · 홈페이지 벤치마크(운영자 세션) */
@RestController
@RequestMapping("/api")
public class AiController {
    private final AuthService authService; private final AiService aiService; private final BenchService benchService;
    public AiController(AuthService authService, AiService aiService, BenchService benchService) { this.authService = authService; this.aiService = aiService; this.benchService = benchService; }

    @PostMapping("/ai/messages") public Object messages(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception {
        return aiService.messages(authService.need(req), body);
    }
    @GetMapping("/ai/usage") public Map<String, Object> usage(HttpServletRequest req) throws Exception { return aiService.usage(authService.need(req)); }
    @PostMapping("/site/benchmark") public Map<String, Object> benchmark(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception {
        return benchService.benchmark(authService.need(req), body);
    }
}
