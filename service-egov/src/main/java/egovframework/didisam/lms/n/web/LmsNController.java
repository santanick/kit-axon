package egovframework.didisam.lms.n.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.n.service.LmsNService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** /api/lms/n/** — MOOC · 비학위(검색 · 찜 · 기수 · 수료 · 수료증 · 승인 · 정규 전환 · 진단 기반 학습경로) */
@RestController
@RequestMapping("/api/lms/n")
public class LmsNController {
    private final LmsNService svc;
    public LmsNController(LmsNService svc) { this.svc = svc; }
    @GetMapping("/search") public JsonNode get_search(HttpServletRequest req) throws Exception { return svc.handle("GET", "search", req, null); }
    @GetMapping("/suggest") public JsonNode get_suggest(HttpServletRequest req) throws Exception { return svc.handle("GET", "suggest", req, null); }
    @GetMapping("/course") public JsonNode get_course(HttpServletRequest req) throws Exception { return svc.handle("GET", "course", req, null); }
    @PostMapping("/course/save") public JsonNode post_course_save(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "course/save", req, body); }
    @PostMapping("/course/submit") public JsonNode post_course_submit(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "course/submit", req, body); }
    @PostMapping("/course/decide") public JsonNode post_course_decide(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "course/decide", req, body); }
    @PostMapping("/course/close") public JsonNode post_course_close(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "course/close", req, body); }
    @PostMapping("/convert") public JsonNode post_convert(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "convert", req, body); }
    @PostMapping("/cohort/save") public JsonNode post_cohort_save(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "cohort/save", req, body); }
    @PostMapping("/enroll") public JsonNode post_enroll(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "enroll", req, body); }
    @PostMapping("/enroll/cancel") public JsonNode post_enroll_cancel(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "enroll/cancel", req, body); }
    @PostMapping("/pay/confirm") public JsonNode post_pay_confirm(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "pay/confirm", req, body); }
    @PostMapping("/enroll/decide") public JsonNode post_enroll_decide(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "enroll/decide", req, body); }
    @GetMapping("/enrolls") public JsonNode get_enrolls(HttpServletRequest req) throws Exception { return svc.handle("GET", "enrolls", req, null); }
    @PostMapping("/progress") public JsonNode post_progress(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "progress", req, body); }
    @PostMapping("/complete") public JsonNode post_complete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "complete", req, body); }
    @GetMapping("/certificate") public JsonNode get_certificate(HttpServletRequest req) throws Exception { return svc.handle("GET", "certificate", req, null); }
    @PostMapping("/wish") public JsonNode post_wish(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "wish", req, body); }
    @GetMapping("/mypage") public JsonNode get_mypage(HttpServletRequest req) throws Exception { return svc.handle("GET", "mypage", req, null); }
    @PostMapping("/diag/save") public JsonNode post_diag_save(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "diag/save", req, body); }
    @GetMapping("/diags") public JsonNode get_diags(HttpServletRequest req) throws Exception { return svc.handle("GET", "diags", req, null); }
    @PostMapping("/diag/take") public JsonNode post_diag_take(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "diag/take", req, body); }
    @GetMapping("/recommend") public JsonNode get_recommend(HttpServletRequest req) throws Exception { return svc.handle("GET", "recommend", req, null); }
}
