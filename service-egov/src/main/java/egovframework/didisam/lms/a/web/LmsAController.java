package egovframework.didisam.lms.a.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.lms.a.service.LmsAService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** v30 묶음 A 학사 LMS(강좌 · 분반) /api/lms/a/* — Node와 같이 본문을 먼저 읽고(크기 · 형식) 그다음 로그인을 확인한다 */
@RestController
@RequestMapping("/api/lms/a")
public class LmsAController {
    static final int B = 64 * 1024;
    private final LmsAService s;
    public LmsAController(LmsAService s) { this.s = s; }
    static JsonNode rb(byte[] body, int max) { return DdWeb.readBody(body, max); }

    @GetMapping("/overview") public Object overview(HttpServletRequest req) throws Exception { return s.overview(req); }
    @PostMapping("/term") public Object term(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.term(rb(b, B), req); }
    @PostMapping("/term-delete") public Object termDelete(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.termDelete(rb(b, B), req); }
    @PostMapping("/unit") public Object unit(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.unit(rb(b, B), req); }
    @PostMapping("/unit-delete") public Object unitDelete(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.unitDelete(rb(b, B), req); }
    @PostMapping("/course") public Object course(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.course(rb(b, B), req); }
    @PostMapping("/course-delete") public Object courseDelete(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.courseDelete(rb(b, B), req); }
    @PostMapping("/section") public Object section(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.section(rb(b, B), req); }
    @PostMapping("/section-delete") public Object sectionDelete(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.sectionDelete(rb(b, B), req); }
    @PostMapping("/staff") public Object staff(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.staff(rb(b, B), req); }
    @PostMapping("/staff-delete") public Object staffDelete(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.staffDelete(rb(b, B), req); }
    @GetMapping("/enrollments") public Object enrollments(@RequestParam(name = "section_id", required = false) String id, @RequestParam(name = "grading", required = false) String g, HttpServletRequest req) throws Exception { return s.enrollments(id, g, req); }
    @PostMapping("/enroll") public Object enroll(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.enroll(rb(b, 512 * 1024), req); }
    @PostMapping("/enroll-drop") public Object enrollDrop(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.enrollDrop(rb(b, B), req); }
    @GetMapping("/persons") public Object persons(@RequestParam(name = "q", required = false) String q, @RequestParam(name = "kind", required = false) String k, HttpServletRequest req) throws Exception { return s.persons(q, k, req); }
    @PostMapping("/person") public Object person(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.person(rb(b, B), req); }
    @PostMapping("/import") public Object importCsv(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.importCsv(rb(b, 3 * 1024 * 1024), req); }
    @PostMapping("/sync") public Object sync(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.sync(rb(b, B), req); }
    @GetMapping("/sync-history") public Object syncHistory(@RequestParam(name = "section_id", required = false) String id, HttpServletRequest req) throws Exception { return s.syncHistory(id, req); }
    @PostMapping("/merge") public Object merge(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.merge(rb(b, B), req); }
    @PostMapping("/unmerge") public Object unmerge(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.unmerge(rb(b, B), req); }
    @PostMapping("/request") public Object request(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.request(rb(b, B), req); }
    @PostMapping("/request-decide") public Object requestDecide(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.requestDecide(rb(b, B), req); }
    @PostMapping("/scope") public Object scope(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.scope(rb(b, B), req); }
    @GetMapping("/my") public Object my(HttpServletRequest req) throws Exception { return s.my(null, false, req); }
    @PostMapping("/my") public Object myPost(@RequestBody(required = false) byte[] b, HttpServletRequest req) throws Exception { return s.my(b, true, req); }
}
