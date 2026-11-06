package egovframework.didisam.lms.g.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.g.service.LmsGIdvService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** x3 · SFR-016 원격수업 대리출석 방지(패스키 · 인증 앱 · 이메일 어댑터 · 분반 규칙) — Node service/server/lms/mod-g_idv.js와 같은 경로 · 같은 JSON */
@RestController
public class LmsGIdvController {
    private final LmsGIdvService svc;
    public LmsGIdvController(LmsGIdvService svc) { this.svc = svc; }
    @GetMapping("/api/lms/g/idv") public JsonNode getIdv(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/idv", req, null); }
    @PostMapping("/api/lms/g/wa-options") public JsonNode postWaOptions(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/wa-options", req, body); }
    @PostMapping("/api/lms/g/wa-register") public JsonNode postWaRegister(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/wa-register", req, body); }
    @PostMapping("/api/lms/g/wa-verify") public JsonNode postWaVerify(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/wa-verify", req, body); }
    @PostMapping("/api/lms/g/wa-delete") public JsonNode postWaDelete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/wa-delete", req, body); }
    @PostMapping("/api/lms/g/totp-new") public JsonNode postTotpNew(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/totp-new", req, body); }
    @PostMapping("/api/lms/g/totp-verify") public JsonNode postTotpVerify(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/totp-verify", req, body); }
    @PostMapping("/api/lms/g/email-code") public JsonNode postEmailCode(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/email-code", req, body); }
    @PostMapping("/api/lms/g/email-verify") public JsonNode postEmailVerify(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/email-verify", req, body); }
    @GetMapping("/api/lms/g/idv-rule") public JsonNode getIdvRule(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/idv-rule", req, null); }
    @PostMapping("/api/lms/g/idv-rule") public JsonNode postIdvRule(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/idv-rule", req, body); }
    @GetMapping("/api/lms/g/idv-report") public JsonNode getIdvReport(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/idv-report", req, null); }
    @PostMapping("/api/lms/g/idv-mail-pull") public JsonNode postIdvMailPull(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/idv-mail-pull", req, body); }
}
