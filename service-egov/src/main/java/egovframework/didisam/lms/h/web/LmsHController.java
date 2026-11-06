package egovframework.didisam.lms.h.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.h.service.LmsHService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** v30 묶음 H — 성적(SFR-032 · 050). 경로 · JSON은 Node service/server/lms/mod-h.js와 같다(DdLmsRoutes가 경로를 자동 수집). */
@RestController
@RequestMapping("/api/lms/h")
public class LmsHController {
    private final LmsHService svc;
    public LmsHController(LmsHService svc) { this.svc = svc; }
    @GetMapping("/board") public JsonNode getBoard(HttpServletRequest req) throws Exception { return svc.call("GET board", req, null); }
    @PostMapping("/item-save") public JsonNode postItemSave(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST item-save", req, body); }
    @PostMapping("/item-delete") public JsonNode postItemDelete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST item-delete", req, body); }
    @PostMapping("/from-syllabus") public JsonNode postFromSyllabus(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST from-syllabus", req, body); }
    @PostMapping("/scores") public JsonNode postScores(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST scores", req, body); }
    @PostMapping("/policy") public JsonNode postPolicy(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST policy", req, body); }
    @PostMapping("/confirm") public JsonNode postConfirm(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST confirm", req, body); }
    @PostMapping("/change") public JsonNode postChange(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST change", req, body); }
    @GetMapping("/history") public JsonNode getHistory(HttpServletRequest req) throws Exception { return svc.call("GET history", req, null); }
    @GetMapping("/queue") public JsonNode getQueue(HttpServletRequest req) throws Exception { return svc.call("GET queue", req, null); }
    @PostMapping("/queue-ack") public JsonNode postQueueAck(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST queue-ack", req, body); }
    @PostMapping("/select") public JsonNode postSelect(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST select", req, body); }
    @PostMapping("/message") public JsonNode postMessage(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST message", req, body); }
    @GetMapping("/my") public JsonNode getMy(HttpServletRequest req) throws Exception { return svc.call("GET my", req, null); }
}
