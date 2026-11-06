package egovframework.didisam.lms.j.web;

import egovframework.didisam.lms.j.service.LmsJService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** v30 학사 LMS 묶음 J API — Node service/server/lms/mod-j.js와 같은 경로 · 같은 JSON */
@RestController
public class LmsJController {
    private final LmsJService svc;
    public LmsJController(LmsJService svc) { this.svc = svc; }
    @GetMapping("/api/lms/j/risk") public Object getRisk(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/j/risk", req, null); }
    @PostMapping("/api/lms/j/snapshot") public Object postSnapshot(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/j/snapshot", req, body); }
    @GetMapping("/api/lms/j/rules") public Object getRules(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/j/rules", req, null); }
    @PostMapping("/api/lms/j/rule") public Object postRule(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/j/rule", req, body); }
    @PostMapping("/api/lms/j/rule/delete") public Object postRuleDelete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/j/rule/delete", req, body); }
    @GetMapping("/api/lms/j/targets") public Object getTargets(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/j/targets", req, null); }
    @GetMapping("/api/lms/j/insights") public Object getInsights(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/j/insights", req, null); }
    @PostMapping("/api/lms/j/feedback") public Object postFeedback(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/j/feedback", req, body); }
    @PostMapping("/api/lms/j/feedback/save") public Object postFeedbackSave(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/j/feedback/save", req, body); }
    @GetMapping("/api/lms/j/feedbacks") public Object getFeedbacks(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/j/feedbacks", req, null); }
    @PostMapping("/api/lms/j/reflection") public Object postReflection(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/j/reflection", req, body); }
    @GetMapping("/api/lms/j/reflections") public Object getReflections(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/j/reflections", req, null); }
    @PostMapping("/api/lms/j/reflection/comment") public Object postReflectionComment(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/j/reflection/comment", req, body); }
    @GetMapping("/api/lms/j/report") public Object getReport(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/j/report", req, null); }
}
