package egovframework.didisam.lms.v.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.v.service.LmsVService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

/** v32 미디어 파이프라인. 경로 · JSON은 Node service/server/lms/mod-v.js와 같다(DdLmsRoutes가 경로를 자동 수집). */
@RestController
@RequestMapping("/api/lms/v")
public class LmsVController {
    private final LmsVService svc;
    public LmsVController(LmsVService svc) { this.svc = svc; }
    @GetMapping("/settings") public JsonNode getSettings(HttpServletRequest req) throws Exception { return svc.call("GET settings", req, null); }
    @PostMapping("/settings") public JsonNode postSettings(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST settings", req, body); }
    @PostMapping("/create") public JsonNode postCreate(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST create", req, body); }
    @PostMapping("/chunk") public JsonNode postChunk(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST chunk", req, body); }
    @PostMapping("/finish") public JsonNode postFinish(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST finish", req, body); }
    @GetMapping("/list") public JsonNode getList(HttpServletRequest req) throws Exception { return svc.call("GET list", req, null); }
    @GetMapping("/get") public JsonNode getGet(HttpServletRequest req) throws Exception { return svc.call("GET get", req, null); }
    @PostMapping("/place") public JsonNode postPlace(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST place", req, body); }
    @PostMapping("/access") public JsonNode postAccess(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST access", req, body); }
    @PostMapping("/rotate") public JsonNode postRotate(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST rotate", req, body); }
    @PostMapping("/delete") public JsonNode postDelete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST delete", req, body); }
    @GetMapping("/log") public JsonNode getLog(HttpServletRequest req) throws Exception { return svc.call("GET log", req, null); }
    @GetMapping("/url") public JsonNode getUrl(HttpServletRequest req) throws Exception { return svc.call("GET url", req, null); }
    @PostMapping("/stt") public JsonNode postStt(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST stt", req, body); }
    @GetMapping("/captions") public JsonNode getCaptions(HttpServletRequest req) throws Exception { return svc.call("GET captions", req, null); }
    @PostMapping("/caption") public JsonNode postCaption(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST caption", req, body); }
    @PostMapping("/caption-publish") public JsonNode postCaptionPublish(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST caption-publish", req, body); }
    @GetMapping("/hls") public void getHls(HttpServletRequest req, HttpServletResponse res) throws Exception { svc.hls(req, res); }
}
