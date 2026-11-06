package egovframework.didisam.lms.b.web;

import egovframework.didisam.lms.b.service.LmsBService;
import egovframework.didisam.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** 학사 LMS 묶음 B — 강의실 구성(주차 · 차시 · 자원 · SCORM · 조건부/순차/수준별/적응형 · 템플릿 · 복사 · 백업 · 휴지통 · 버전 · 공유 · 역할/메뉴). Node lms/mod-b.js와 같은 경로 · 같은 JSON. */
@RestController
public class LmsBController {
    private final AuthService authService; private final LmsBService service;
    public LmsBController(AuthService authService, LmsBService service) { this.authService = authService; this.service = service; }
    static String op(HttpServletRequest req) { String u = req.getRequestURI(); return u.substring(u.lastIndexOf('/') + 1); }

    @GetMapping({"/api/lms/b/sections", "/api/lms/b/templates", "/api/lms/b/library", "/api/lms/b/perms", "/api/lms/b/file", "/api/lms/b/overview", "/api/lms/b/timeline", "/api/lms/b/progress", "/api/lms/b/next", "/api/lms/b/backups", "/api/lms/b/backup-get", "/api/lms/b/trash", "/api/lms/b/res-versions", "/api/lms/b/menu", "/api/lms/b/scorm", "/api/lms/b/scorm-file", "/api/lms/b/scorm-report"})
    public Object get(HttpServletRequest req) throws Exception { return service.call(authService.need(req), op(req), req, null); }

    @PostMapping({"/api/lms/b/perm-set", "/api/lms/b/week-save", "/api/lms/b/week-del", "/api/lms/b/session-save", "/api/lms/b/session-del", "/api/lms/b/res-save", "/api/lms/b/res-del", "/api/lms/b/res-restore", "/api/lms/b/res-purge", "/api/lms/b/res-revert", "/api/lms/b/res-reuse", "/api/lms/b/progress-mark", "/api/lms/b/level-set", "/api/lms/b/level-auto", "/api/lms/b/opt-set", "/api/lms/b/syllabus-import", "/api/lms/b/template-apply", "/api/lms/b/template-save", "/api/lms/b/template-del", "/api/lms/b/copy", "/api/lms/b/shift", "/api/lms/b/backup", "/api/lms/b/backup-import", "/api/lms/b/backup-del", "/api/lms/b/restore", "/api/lms/b/file-put", "/api/lms/b/scorm-pkg", "/api/lms/b/scorm-file-put", "/api/lms/b/scorm-commit", "/api/lms/b/menu-set", "/api/lms/b/menu-pref"})
    public Object post(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return service.call(authService.need(req), op(req), req, body); }
}
