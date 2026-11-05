package egovframework.didisam.lms.m.web;

import egovframework.didisam.lms.m.service.LmsMService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** 학사 LMS 묶음 M — Node service/server/lms/mod-m.js ROUTES와 같은 경로 · 메서드(test/genjava 생성). 업무 규칙은 SQL lms_m() */
@RestController
public class LmsMController {
    private final LmsMService svc;
    public LmsMController(LmsMService svc) { this.svc = svc; }
    @PostMapping("/api/lms/m/access/hit") public ResponseEntity<String> r0(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("access.hit", "POST", body, req); }
    @GetMapping("/api/lms/m/users/list") public ResponseEntity<String> r1(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("users.list", "GET", body, req); }
    @GetMapping("/api/lms/m/users/get") public ResponseEntity<String> r2(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("users.get", "GET", body, req); }
    @PostMapping("/api/lms/m/users/save") public ResponseEntity<String> r3(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("users.save", "POST", body, req); }
    @PostMapping("/api/lms/m/users/control") public ResponseEntity<String> r4(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("users.control", "POST", body, req); }
    @PostMapping("/api/lms/m/imp/start") public ResponseEntity<String> r5(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("imp.start", "POST", body, req); }
    @GetMapping("/api/lms/m/imp/current") public ResponseEntity<String> r6(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("imp.current", "GET", body, req); }
    @PostMapping("/api/lms/m/imp/end") public ResponseEntity<String> r7(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("imp.end", "POST", body, req); }
    @GetMapping("/api/lms/m/stats") public ResponseEntity<String> r8(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("stats", "GET", body, req); }
    @GetMapping("/api/lms/m/logs") public ResponseEntity<String> r9(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("logs", "GET", body, req); }
    @GetMapping("/api/lms/m/popup/list") public ResponseEntity<String> r10(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("popup.list", "GET", body, req); }
    @PostMapping("/api/lms/m/popup/save") public ResponseEntity<String> r11(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("popup.save", "POST", body, req); }
    @PostMapping("/api/lms/m/popup/del") public ResponseEntity<String> r12(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("popup.del", "POST", body, req); }
    @GetMapping("/api/lms/m/popup/preview") public ResponseEntity<String> r13(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("popup.preview", "GET", body, req); }
    @GetMapping("/api/lms/m/mon/th") public ResponseEntity<String> r14(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("mon.th", "GET", body, req); }
    @PostMapping("/api/lms/m/mon/th_save") public ResponseEntity<String> r15(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("mon.th_save", "POST", body, req); }
    @PostMapping("/api/lms/m/mon/sample") public ResponseEntity<String> r16(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("mon.sample", "POST", body, req); }
    @GetMapping("/api/lms/m/mon/history") public ResponseEntity<String> r17(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("mon.history", "GET", body, req); }
}
