package egovframework.didisam.lms.g.web;

import egovframework.didisam.lms.g.service.LmsGService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** v30 학사 LMS 묶음 G API — Node service/server/lms/mod-g.js와 같은 경로 · 같은 JSON */
@RestController
public class LmsGController {
    private final LmsGService svc;
    public LmsGController(LmsGService svc) { this.svc = svc; }
    @PostMapping("/api/lms/g/seed") public Object postSeed(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/seed", req, body); }
    @GetMapping("/api/lms/g/sections") public Object getSections(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/sections", req, null); }
    @GetMapping("/api/lms/g/sessions") public Object getSessions(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/sessions", req, null); }
    @PostMapping("/api/lms/g/session") public Object postSession(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/session", req, body); }
    @PostMapping("/api/lms/g/makeup") public Object postMakeup(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/makeup", req, body); }
    @GetMapping("/api/lms/g/rule") public Object getRule(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/rule", req, null); }
    @PostMapping("/api/lms/g/rule") public Object postRule(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/rule", req, body); }
    @PostMapping("/api/lms/g/code") public Object postCode(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/code", req, body); }
    @GetMapping("/api/lms/g/qr") public Object getQr(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/qr", req, null); }
    @PostMapping("/api/lms/g/checkin") public Object postCheckin(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/checkin", req, body); }
    @PostMapping("/api/lms/g/mark") public Object postMark(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/mark", req, body); }
    @PostMapping("/api/lms/g/adjust") public Object postAdjust(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/adjust", req, body); }
    @PostMapping("/api/lms/g/copy") public Object postCopy(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/copy", req, body); }
    @PostMapping("/api/lms/g/online") public Object postOnline(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/online", req, body); }
    @GetMapping("/api/lms/g/roster") public Object getRoster(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/roster", req, null); }
    @GetMapping("/api/lms/g/export") public Object getExport(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/export", req, null); }
    @GetMapping("/api/lms/g/beacons") public Object getBeacons(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/beacons", req, null); }
    @PostMapping("/api/lms/g/beacon") public Object postBeacon(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/g/beacon", req, body); }
    @GetMapping("/api/lms/g/anomalies") public Object getAnomalies(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/anomalies", req, null); }
    @GetMapping("/api/lms/g/log") public Object getLog(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/g/log", req, null); }
}
