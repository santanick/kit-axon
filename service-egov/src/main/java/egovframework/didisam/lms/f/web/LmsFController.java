package egovframework.didisam.lms.f.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.f.service.LmsFService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** v30 묶음 F — 시험 · 문제은행(SFR-004 · 023 · 045 · 060 · 085). 경로 · JSON은 Node service/server/lms/mod-f.js와 같다(DdLmsRoutes가 경로를 자동 수집). */
@RestController
@RequestMapping("/api/lms/f")
public class LmsFController {
    private final LmsFService svc;
    public LmsFController(LmsFService svc) { this.svc = svc; }
    @GetMapping("/banks") public JsonNode getBanks(HttpServletRequest req) throws Exception { return svc.call("GET banks", req, null); }
    @PostMapping("/bank-save") public JsonNode postBankSave(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST bank-save", req, body); }
    @GetMapping("/questions") public JsonNode getQuestions(HttpServletRequest req) throws Exception { return svc.call("GET questions", req, null); }
    @PostMapping("/q-save") public JsonNode postQSave(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST q-save", req, body); }
    @PostMapping("/q-delete") public JsonNode postQDelete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST q-delete", req, body); }
    @PostMapping("/q-copy") public JsonNode postQCopy(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST q-copy", req, body); }
    @PostMapping("/classify") public JsonNode postClassify(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST classify", req, body); }
    @GetMapping("/exams") public JsonNode getExams(HttpServletRequest req) throws Exception { return svc.call("GET exams", req, null); }
    @PostMapping("/exam-save") public JsonNode postExamSave(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST exam-save", req, body); }
    @GetMapping("/attempts") public JsonNode getAttempts(HttpServletRequest req) throws Exception { return svc.call("GET attempts", req, null); }
    @GetMapping("/attempt") public JsonNode getAttempt(HttpServletRequest req) throws Exception { return svc.call("GET attempt", req, null); }
    @PostMapping("/mark") public JsonNode postMark(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST mark", req, body); }
    @GetMapping("/stats") public JsonNode getStats(HttpServletRequest req) throws Exception { return svc.call("GET stats", req, null); }
    @GetMapping("/my") public JsonNode getMy(HttpServletRequest req) throws Exception { return svc.call("GET my", req, null); }
    @PostMapping("/precheck") public JsonNode postPrecheck(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST precheck", req, body); }
    @PostMapping("/start") public JsonNode postStart(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST start", req, body); }
    @PostMapping("/answer") public JsonNode postAnswer(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST answer", req, body); }
    @PostMapping("/submit") public JsonNode postSubmit(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST submit", req, body); }
    @GetMapping("/result") public JsonNode getResult(HttpServletRequest req) throws Exception { return svc.call("GET result", req, null); }
    @PostMapping("/retry") public JsonNode postRetry(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST retry", req, body); }
    @GetMapping("/settings") public JsonNode getSettings(HttpServletRequest req) throws Exception { return svc.call("GET settings", req, null); }
    @PostMapping("/settings") public JsonNode postSettings(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST settings", req, body); }
    @PostMapping("/ip-mask") public JsonNode postIpMask(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST ip-mask", req, body); }
    /* x3 · SFR-089 웹 시험 감독 */
    @GetMapping("/proctor") public JsonNode getProctor(HttpServletRequest req) throws Exception { return svc.call("GET proctor", req, null); }
    @PostMapping("/proctor-begin") public JsonNode postProctorBegin(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST proctor-begin", req, body); }
    @PostMapping("/proctor-event") public JsonNode postProctorEvent(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST proctor-event", req, body); }
    @PostMapping("/proctor-snap") public JsonNode postProctorSnap(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST proctor-snap", req, body); }
    @GetMapping("/proctor-cfg") public JsonNode getProctorCfg(HttpServletRequest req) throws Exception { return svc.call("GET proctor-cfg", req, null); }
    @PostMapping("/proctor-cfg") public JsonNode postProctorCfg(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST proctor-cfg", req, body); }
    @GetMapping("/proctor-review") public JsonNode getProctorReview(HttpServletRequest req) throws Exception { return svc.call("GET proctor-review", req, null); }
    @GetMapping("/proctor-timeline") public JsonNode getProctorTimeline(HttpServletRequest req) throws Exception { return svc.call("GET proctor-timeline", req, null); }
    @GetMapping("/proctor-photo") public JsonNode getProctorPhoto(HttpServletRequest req) throws Exception { return svc.call("GET proctor-photo", req, null); }
    @PostMapping("/proctor-decide") public JsonNode postProctorDecide(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST proctor-decide", req, body); }
    @GetMapping("/proctor-views") public JsonNode getProctorViews(HttpServletRequest req) throws Exception { return svc.call("GET proctor-views", req, null); }
    @GetMapping("/proctor-settings") public JsonNode getProctorSettings(HttpServletRequest req) throws Exception { return svc.call("GET proctor-settings", req, null); }
    @PostMapping("/proctor-settings") public JsonNode postProctorSettings(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST proctor-settings", req, body); }
    @PostMapping("/proctor-purge") public JsonNode postProctorPurge(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST proctor-purge", req, body); }
}
