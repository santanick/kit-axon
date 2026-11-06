package egovframework.didisam.lms.q.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.q.service.LmsQService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** /api/lms/q/** — 비교과(성장마루 내재화: 상태 흐름 · 신청 승인 4종 · 팀 · 양식 · 역량 · 이수 · 설문 · 예산 · CQI · 파일 · 학생 화면) */
@RestController
@RequestMapping("/api/lms/q")
public class LmsQController {
    private final LmsQService svc;
    public LmsQController(LmsQService svc) { this.svc = svc; }
    @GetMapping("/groups") public JsonNode get_groups(HttpServletRequest req) throws Exception { return svc.handle("GET", "groups", req, null); }
    @PostMapping("/group/save") public JsonNode post_group_save(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "group/save", req, body); }
    @GetMapping("/programs") public JsonNode get_programs(HttpServletRequest req) throws Exception { return svc.handle("GET", "programs", req, null); }
    @GetMapping("/program") public JsonNode get_program(HttpServletRequest req) throws Exception { return svc.handle("GET", "program", req, null); }
    @PostMapping("/program/save") public JsonNode post_program_save(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "program/save", req, body); }
    @PostMapping("/program/clone") public JsonNode post_program_clone(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "program/clone", req, body); }
    @PostMapping("/program/transition") public JsonNode post_program_transition(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "program/transition", req, body); }
    @GetMapping("/program/history") public JsonNode get_program_history(HttpServletRequest req) throws Exception { return svc.handle("GET", "program/history", req, null); }
    @PostMapping("/program/operator") public JsonNode post_program_operator(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "program/operator", req, body); }
    @PostMapping("/program/certify") public JsonNode post_program_certify(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "program/certify", req, body); }
    @PostMapping("/apply") public JsonNode post_apply(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "apply", req, body); }
    @PostMapping("/apply/edit") public JsonNode post_apply_edit(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "apply/edit", req, body); }
    @PostMapping("/apply/cancel") public JsonNode post_apply_cancel(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "apply/cancel", req, body); }
    @GetMapping("/applicants") public JsonNode get_applicants(HttpServletRequest req) throws Exception { return svc.handle("GET", "applicants", req, null); }
    @GetMapping("/applicant") public JsonNode get_applicant(HttpServletRequest req) throws Exception { return svc.handle("GET", "applicant", req, null); }
    @PostMapping("/applicants/add") public JsonNode post_applicants_add(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "applicants/add", req, body); }
    @PostMapping("/applicants/status") public JsonNode post_applicants_status(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "applicants/status", req, body); }
    @GetMapping("/applicants/export") public JsonNode get_applicants_export(HttpServletRequest req) throws Exception { return svc.handle("GET", "applicants/export", req, null); }
    @PostMapping("/notify") public JsonNode post_notify(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "notify", req, body); }
    @GetMapping("/attendance") public JsonNode get_attendance(HttpServletRequest req) throws Exception { return svc.handle("GET", "attendance", req, null); }
    @PostMapping("/attend") public JsonNode post_attend(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "attend", req, body); }
    @PostMapping("/completion/run") public JsonNode post_completion_run(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "completion/run", req, body); }
    @PostMapping("/completion/set") public JsonNode post_completion_set(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "completion/set", req, body); }
    @GetMapping("/certificate") public JsonNode get_certificate(HttpServletRequest req) throws Exception { return svc.handle("GET", "certificate", req, null); }
    @PostMapping("/survey/link") public JsonNode post_survey_link(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "survey/link", req, body); }
    @PostMapping("/survey/auto") public JsonNode post_survey_auto(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "survey/auto", req, body); }
    @GetMapping("/survey/results") public JsonNode get_survey_results(HttpServletRequest req) throws Exception { return svc.handle("GET", "survey/results", req, null); }
    @GetMapping("/budget") public JsonNode get_budget(HttpServletRequest req) throws Exception { return svc.handle("GET", "budget", req, null); }
    @PostMapping("/expense/save") public JsonNode post_expense_save(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "expense/save", req, body); }
    @PostMapping("/expense/delete") public JsonNode post_expense_delete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "expense/delete", req, body); }
    @GetMapping("/expense/doc") public JsonNode get_expense_doc(HttpServletRequest req) throws Exception { return svc.handle("GET", "expense/doc", req, null); }
    @GetMapping("/plan") public JsonNode get_plan(HttpServletRequest req) throws Exception { return svc.handle("GET", "plan", req, null); }
    @GetMapping("/cqi") public JsonNode get_cqi(HttpServletRequest req) throws Exception { return svc.handle("GET", "cqi", req, null); }
    @PostMapping("/cqi/save") public JsonNode post_cqi_save(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "cqi/save", req, body); }
    @PostMapping("/cqi/request") public JsonNode post_cqi_request(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "cqi/request", req, body); }
    @PostMapping("/cqi/decide") public JsonNode post_cqi_decide(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "cqi/decide", req, body); }
    @GetMapping("/cqi/doc") public JsonNode get_cqi_doc(HttpServletRequest req) throws Exception { return svc.handle("GET", "cqi/doc", req, null); }
    @GetMapping("/file") public JsonNode get_file(HttpServletRequest req) throws Exception { return svc.handle("GET", "file", req, null); }
    @GetMapping("/student/programs") public JsonNode get_student_programs(HttpServletRequest req) throws Exception { return svc.handle("GET", "student/programs", req, null); }
    @PostMapping("/wish") public JsonNode post_wish(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "wish", req, body); }
    @GetMapping("/student/me") public JsonNode get_student_me(HttpServletRequest req) throws Exception { return svc.handle("GET", "student/me", req, null); }
    @PostMapping("/review") public JsonNode post_review(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "review", req, body); }
    @GetMapping("/reviews") public JsonNode get_reviews(HttpServletRequest req) throws Exception { return svc.handle("GET", "reviews", req, null); }
    @GetMapping("/board") public JsonNode get_board(HttpServletRequest req) throws Exception { return svc.handle("GET", "board", req, null); }
    @PostMapping("/board/post") public JsonNode post_board_post(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.handle("POST", "board/post", req, body); }
}
