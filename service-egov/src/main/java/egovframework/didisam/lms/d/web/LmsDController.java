package egovframework.didisam.lms.d.web;

import egovframework.didisam.lms.d.service.LmsDService;
import egovframework.didisam.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** 학사 LMS 묶음 D — 강의 게시판(공지 · Q&A · 자료실 · 1:1 상담 · 댓글 · 발송 대기). Node lms/mod-d.js와 같은 경로 · 같은 JSON. */
@RestController
public class LmsDController {
    private final AuthService authService; private final LmsDService service;
    public LmsDController(AuthService authService, LmsDService service) { this.authService = authService; this.service = service; }
    static String op(HttpServletRequest req) { String u = req.getRequestURI(); return u.substring(u.lastIndexOf('/') + 1); }

    @GetMapping({"/api/lms/d/boards", "/api/lms/d/posts", "/api/lms/d/post", "/api/lms/d/readers", "/api/lms/d/outbox"})
    public Object get(HttpServletRequest req) throws Exception { return service.call(authService.need(req), op(req), req, null); }

    @PostMapping({"/api/lms/d/board-save", "/api/lms/d/post-save", "/api/lms/d/post-del", "/api/lms/d/post-pin", "/api/lms/d/post-copy", "/api/lms/d/answer", "/api/lms/d/answer-del", "/api/lms/d/answer-accept", "/api/lms/d/comment", "/api/lms/d/comment-del", "/api/lms/d/counsel-status"})
    public Object post(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return service.call(authService.need(req), op(req), req, body); }
}
