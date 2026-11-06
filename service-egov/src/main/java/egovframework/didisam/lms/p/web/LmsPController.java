package egovframework.didisam.lms.p.web;

import egovframework.didisam.lms.p.service.LmsPService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** 학사 LMS 묶음 P — Node service/server/lms/mod-p.js ROUTES와 같은 경로 · 메서드(test/genjava 생성). 업무 규칙은 SQL lms_p() */
@RestController
public class LmsPController {
    private final LmsPService svc;
    public LmsPController(LmsPService svc) { this.svc = svc; }
    @GetMapping("/api/lms/p/pref/get") public ResponseEntity<String> r0(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("pref.get", "GET", body, req); }
    @PostMapping("/api/lms/p/pref/save") public ResponseEntity<String> r1(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("pref.save", "POST", body, req); }
    @GetMapping("/api/lms/p/cls/langs") public ResponseEntity<String> r2(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("cls.langs", "GET", body, req); }
    @PostMapping("/api/lms/p/cls/lang") public ResponseEntity<String> r3(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("cls.lang", "POST", body, req); }
    @PostMapping("/api/lms/p/upload/add") public ResponseEntity<String> r4(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("upload.add", "POST", body, req); }
    @GetMapping("/api/lms/p/upload/recent") public ResponseEntity<String> r5(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("upload.recent", "GET", body, req); }
    @GetMapping("/api/lms/p/upload/get") public ResponseEntity<String> r6(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("upload.get", "GET", body, req); }
    @PostMapping("/api/lms/p/draft/save") public ResponseEntity<String> r7(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("draft.save", "POST", body, req); }
    @GetMapping("/api/lms/p/draft/get") public ResponseEntity<String> r8(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("draft.get", "GET", body, req); }
    @PostMapping("/api/lms/p/widget/save") public ResponseEntity<String> r9(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("widget.save", "POST", body, req); }
    @GetMapping("/api/lms/p/portal") public ResponseEntity<String> r10(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("portal", "GET", body, req); }
    @GetMapping("/api/lms/p/kocw") public ResponseEntity<String> r11(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("kocw", "GET", body, req); }
    @PostMapping("/api/lms/p/admin/login") public ResponseEntity<String> r12(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("admin.login", "POST", body, req); }
    @GetMapping("/api/lms/p/admin/status") public ResponseEntity<String> r13(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("admin.status", "GET", body, req); }
    @PostMapping("/api/lms/p/admin/logout") public ResponseEntity<String> r14(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("admin.logout", "POST", body, req); }
    @PostMapping("/api/lms/p/pii/view") public ResponseEntity<String> r15(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("pii.view", "POST", body, req); }
    @GetMapping("/api/lms/p/pii/stats") public ResponseEntity<String> r16(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("pii.stats", "GET", body, req); }
    @GetMapping("/api/lms/p/crypto/status") public ResponseEntity<String> r17(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("crypto.status", "GET", body, req); }
    @PostMapping("/api/lms/p/crypto/class_save") public ResponseEntity<String> r18(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("crypto.class_save", "POST", body, req); }
    @PostMapping("/api/lms/p/perf/save") public ResponseEntity<String> r19(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("perf.save", "POST", body, req); }
    @GetMapping("/api/lms/p/perf/list") public ResponseEntity<String> r20(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("perf.list", "GET", body, req); }
    @PostMapping("/api/lms/p/mig/import") public ResponseEntity<String> r21(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("mig.import", "POST", body, req); }
    @GetMapping("/api/lms/p/mig/runs") public ResponseEntity<String> r22(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("mig.runs", "GET", body, req); }
    @GetMapping("/api/lms/p/mig/videos") public ResponseEntity<String> r23(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("mig.videos", "GET", body, req); }
    @PostMapping("/api/lms/p/demo/seed") public ResponseEntity<String> r24(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.run("demo.seed", "POST", body, req); }
}
