package egovframework.didisam.lms.i.web;

import egovframework.didisam.lms.i.service.LmsIService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** v30 학사 LMS 묶음 I API — Node service/server/lms/mod-i.js와 같은 경로 · 같은 JSON */
@RestController
public class LmsIController {
    private final LmsIService svc;
    public LmsIController(LmsIService svc) { this.svc = svc; }
    @PostMapping("/api/lms/i/seed") public Object postSeed(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/seed", req, body); }
    @GetMapping("/api/lms/i/contents") public Object getContents(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/i/contents", req, null); }
    @PostMapping("/api/lms/i/content") public Object postContent(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/content", req, body); }
    @PostMapping("/api/lms/i/play/start") public Object postPlayStart(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/play/start", req, body); }
    @PostMapping("/api/lms/i/play/beat") public Object postPlayBeat(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/play/beat", req, body); }
    @PostMapping("/api/lms/i/play/end") public Object postPlayEnd(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/play/end", req, body); }
    @GetMapping("/api/lms/i/progress") public Object getProgress(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/i/progress", req, null); }
    @PostMapping("/api/lms/i/subtitle") public Object postSubtitle(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/subtitle", req, body); }
    @PostMapping("/api/lms/i/subtitle/cues") public Object postSubtitleCues(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/subtitle/cues", req, body); }
    @GetMapping("/api/lms/i/subtitles") public Object getSubtitles(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/i/subtitles", req, null); }
    @PostMapping("/api/lms/i/quiz") public Object postQuiz(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/quiz", req, body); }
    @GetMapping("/api/lms/i/quizzes") public Object getQuizzes(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/i/quizzes", req, null); }
    @PostMapping("/api/lms/i/quiz/answer") public Object postQuizAnswer(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/quiz/answer", req, body); }
    @GetMapping("/api/lms/i/workload") public Object getWorkload(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/i/workload", req, null); }
    @GetMapping("/api/lms/i/history") public Object getHistory(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/i/history", req, null); }
    @GetMapping("/api/lms/i/my") public Object getMy(HttpServletRequest req) throws Exception { return svc.call("GET /api/lms/i/my", req, null); }
    @PostMapping("/api/lms/i/activity") public Object postActivity(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST /api/lms/i/activity", req, body); }
}
