package egovframework.didisam.lms.c.web;

import egovframework.didisam.lms.c.service.LmsCService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** 학사 LMS 묶음 C — 학습활동(토론 · 위키 · 팀 프로젝트 · 자기/동료 평가 · 대화방 · 설문 · 사전 과제/질문 · 수업 평가). Node lms/mod-c.js와 같은 경로 · 같은 JSON. */
@RestController
public class LmsCController {
    private final LmsCService service;
    public LmsCController(LmsCService service) { this.service = service; }
    static String op(HttpServletRequest req) { String u = req.getRequestURI(); return u.substring(u.lastIndexOf('/') + 1); }

    @GetMapping({"/api/lms/c/forums", "/api/lms/c/forum", "/api/lms/c/wiki", "/api/lms/c/wiki-page", "/api/lms/c/teams", "/api/lms/c/progress", "/api/lms/c/reviews", "/api/lms/c/review", "/api/lms/c/chat", "/api/lms/c/polls", "/api/lms/c/pretasks"})
    public Object get(HttpServletRequest req) throws Exception { return service.call(op(req), req, null); }

    @PostMapping({"/api/lms/c/forum-save", "/api/lms/c/forum-del", "/api/lms/c/post", "/api/lms/c/post-edit", "/api/lms/c/post-del", "/api/lms/c/wiki-save", "/api/lms/c/wiki-revert", "/api/lms/c/team-save", "/api/lms/c/team-del", "/api/lms/c/team-member", "/api/lms/c/team-auto", "/api/lms/c/task-save", "/api/lms/c/task-del", "/api/lms/c/task-status", "/api/lms/c/review-save", "/api/lms/c/review-del", "/api/lms/c/review-submit", "/api/lms/c/review-alloc", "/api/lms/c/review-score", "/api/lms/c/chat-send", "/api/lms/c/poll-save", "/api/lms/c/poll-vote", "/api/lms/c/poll-close", "/api/lms/c/poll-del", "/api/lms/c/pretask-save", "/api/lms/c/pretask-del", "/api/lms/c/pretask-submit", "/api/lms/c/pretask-grade", "/api/lms/c/pretask-publish"})
    public Object post(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return service.call(op(req), req, body); }
}
