package egovframework.didisam.lms.e.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.e.service.LmsEService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** v30 묶음 E — 과제(SFR-035 · 046 · 079 · 081). 경로 · JSON은 Node service/server/lms/mod-e.js와 같다(DdLmsRoutes가 경로를 자동 수집). */
@RestController
@RequestMapping("/api/lms/e")
public class LmsEController {
    private final LmsEService svc;
    public LmsEController(LmsEService svc) { this.svc = svc; }
    @GetMapping("/sections") public JsonNode getSections(HttpServletRequest req) throws Exception { return svc.call("GET sections", req, null); }
    @GetMapping("/list") public JsonNode getList(HttpServletRequest req) throws Exception { return svc.call("GET list", req, null); }
    @PostMapping("/save") public JsonNode postSave(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST save", req, body); }
    @PostMapping("/delete") public JsonNode postDelete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST delete", req, body); }
    @GetMapping("/status") public JsonNode getStatus(HttpServletRequest req) throws Exception { return svc.call("GET status", req, null); }
    @GetMapping("/sub") public JsonNode getSub(HttpServletRequest req) throws Exception { return svc.call("GET sub", req, null); }
    @PostMapping("/grade") public JsonNode postGrade(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST grade", req, body); }
    @PostMapping("/bulk-feedback") public JsonNode postBulkFeedback(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST bulk-feedback", req, body); }
    @GetMapping("/bundle") public JsonNode getBundle(HttpServletRequest req) throws Exception { return svc.call("GET bundle", req, null); }
    @GetMapping("/rubrics") public JsonNode getRubrics(HttpServletRequest req) throws Exception { return svc.call("GET rubrics", req, null); }
    @PostMapping("/rubric-save") public JsonNode postRubricSave(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST rubric-save", req, body); }
    @PostMapping("/teams") public JsonNode postTeams(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST teams", req, body); }
    @PostMapping("/plag-run") public JsonNode postPlagRun(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST plag-run", req, body); }
    @GetMapping("/plag") public JsonNode getPlag(HttpServletRequest req) throws Exception { return svc.call("GET plag", req, null); }
    @PostMapping("/file") public JsonNode postFile(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST file", req, body); }
    @GetMapping("/file") public JsonNode getFile(HttpServletRequest req) throws Exception { return svc.call("GET file", req, null); }
    @GetMapping("/my") public JsonNode getMy(HttpServletRequest req) throws Exception { return svc.call("GET my", req, null); }
    @PostMapping("/draft") public JsonNode postDraft(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST draft", req, body); }
    @PostMapping("/submit") public JsonNode postSubmit(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST submit", req, body); }
    @GetMapping("/versions") public JsonNode getVersions(HttpServletRequest req) throws Exception { return svc.call("GET versions", req, null); }
    @PostMapping("/restore") public JsonNode postRestore(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST restore", req, body); }
}
