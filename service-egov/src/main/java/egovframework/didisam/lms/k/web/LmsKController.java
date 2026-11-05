package egovframework.didisam.lms.k.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.k.service.LmsKService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** /api/lms/k/** — 설문(단위별 · 다국어 · 템플릿 · 통계 · 내보내기 · 강의평가 · 게이트) */
@RestController
@RequestMapping("/api/lms/k")
public class LmsKController {
    private final LmsKService svc;
    public LmsKController(LmsKService svc) { this.svc = svc; }
    @GetMapping("/surveys") public JsonNode get_surveys(HttpServletRequest req) throws Exception { return svc.handle("GET", "surveys", req, null); }
    @GetMapping("/survey") public JsonNode get_survey(HttpServletRequest req) throws Exception { return svc.handle("GET", "survey", req, null); }
    @PostMapping("/survey/save") public JsonNode post_survey_save(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "survey/save", req, body); }
    @PostMapping("/survey/open") public JsonNode post_survey_open(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "survey/open", req, body); }
    @PostMapping("/survey/close") public JsonNode post_survey_close(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "survey/close", req, body); }
    @PostMapping("/survey/delete") public JsonNode post_survey_delete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "survey/delete", req, body); }
    @PostMapping("/survey/copy") public JsonNode post_survey_copy(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "survey/copy", req, body); }
    @PostMapping("/respond") public JsonNode post_respond(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "respond", req, body); }
    @PostMapping("/import") public JsonNode post_import(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "import", req, body); }
    @GetMapping("/pending") public JsonNode get_pending(HttpServletRequest req) throws Exception { return svc.handle("GET", "pending", req, null); }
    @GetMapping("/gate") public JsonNode get_gate(HttpServletRequest req) throws Exception { return svc.handle("GET", "gate", req, null); }
    @GetMapping("/stats") public JsonNode get_stats(HttpServletRequest req) throws Exception { return svc.handle("GET", "stats", req, null); }
    @GetMapping("/export") public JsonNode get_export(HttpServletRequest req) throws Exception { return svc.handle("GET", "export", req, null); }
    @PostMapping("/remind") public JsonNode post_remind(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "remind", req, body); }
    @PostMapping("/course-eval") public JsonNode post_course_eval(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "course-eval", req, body); }
    @PostMapping("/eval/public") public JsonNode post_eval_public(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "eval/public", req, body); }
}
