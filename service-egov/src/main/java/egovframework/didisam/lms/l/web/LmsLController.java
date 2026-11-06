package egovframework.didisam.lms.l.web;

import egovframework.didisam.lms.l.service.LmsLService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** 학사 LMS 묶음 L — Node service/server/lms/mod-l.js ROUTES와 같은 경로 · 메서드(test/genjava 생성). 업무 규칙은 SQL lms_l() */
@RestController
public class LmsLController {
    private final LmsLService svc;
    public LmsLController(LmsLService svc) { this.svc = svc; }
    @GetMapping("/api/lms/l/cal/list") public ResponseEntity<String> r0(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("cal.list", "GET", body, req); }
    @PostMapping("/api/lms/l/cal/add") public ResponseEntity<String> r1(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("cal.add", "POST", body, req); }
    @PostMapping("/api/lms/l/cal/done") public ResponseEntity<String> r2(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("cal.done", "POST", body, req); }
    @PostMapping("/api/lms/l/cal/del") public ResponseEntity<String> r3(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("cal.del", "POST", body, req); }
    @PostMapping("/api/lms/l/cal/d1") public ResponseEntity<String> r4(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("cal.d1", "POST", body, req); }
    @GetMapping("/api/lms/l/cal/ics") public ResponseEntity<String> r5(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("cal.ics", "GET", body, req); }
    @GetMapping("/api/lms/l/dm/rooms") public ResponseEntity<String> r6(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("dm.rooms", "GET", body, req); }
    @PostMapping("/api/lms/l/dm/open") public ResponseEntity<String> r7(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("dm.open", "POST", body, req); }
    @PostMapping("/api/lms/l/dm/send") public ResponseEntity<String> r8(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("dm.send", "POST", body, req); }
    @GetMapping("/api/lms/l/dm/msgs") public ResponseEntity<String> r9(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("dm.msgs", "GET", body, req); }
    @GetMapping("/api/lms/l/dm/file") public ResponseEntity<String> r10(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("dm.file", "GET", body, req); }
    @PostMapping("/api/lms/l/dm/read") public ResponseEntity<String> r11(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("dm.read", "POST", body, req); }
    @PostMapping("/api/lms/l/dm/broadcast") public ResponseEntity<String> r12(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("dm.broadcast", "POST", body, req); }
    @GetMapping("/api/lms/l/noti/rules") public ResponseEntity<String> r13(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.rules", "GET", body, req); }
    @PostMapping("/api/lms/l/noti/rule_save") public ResponseEntity<String> r14(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.rule_save", "POST", body, req); }
    @PostMapping("/api/lms/l/noti/rule_del") public ResponseEntity<String> r15(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.rule_del", "POST", body, req); }
    @PostMapping("/api/lms/l/noti/quiet") public ResponseEntity<String> r16(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.quiet", "POST", body, req); }
    @PostMapping("/api/lms/l/noti/fire") public ResponseEntity<String> r17(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.fire", "POST", body, req); }
    @PostMapping("/api/lms/l/noti/scan") public ResponseEntity<String> r18(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.scan", "POST", body, req); }
    @GetMapping("/api/lms/l/noti/inbox") public ResponseEntity<String> r19(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.inbox", "GET", body, req); }
    @GetMapping("/api/lms/l/noti/outbox") public ResponseEntity<String> r20(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.outbox", "GET", body, req); }
    @PostMapping("/api/lms/l/noti/ack") public ResponseEntity<String> r21(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("noti.ack", "POST", body, req); }
}
