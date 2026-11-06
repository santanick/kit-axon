package egovframework.didisam.lms.live.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.live.service.LmsLiveService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** x2 실시간 수업 · 실시간 자막. 경로 · JSON은 Node service/server/lms/mod-live.js와 같다(DdLmsRoutes가 경로를 자동 수집). */
@RestController
@RequestMapping("/api/lms/live")
public class LmsLiveController {
    private final LmsLiveService svc;
    public LmsLiveController(LmsLiveService svc) { this.svc = svc; }
    @GetMapping("/setting") public JsonNode getSetting(HttpServletRequest req) throws Exception { return svc.call("GET setting", req, null); }
    @PostMapping("/setting") public JsonNode postSetting(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST setting", req, body); }
    @GetMapping("/rooms") public JsonNode getRooms(HttpServletRequest req) throws Exception { return svc.call("GET rooms", req, null); }
    @PostMapping("/room") public JsonNode postRoom(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST room", req, body); }
    @GetMapping("/room") public JsonNode getRoom(HttpServletRequest req) throws Exception { return svc.call("GET room", req, null); }
    @PostMapping("/room-state") public JsonNode postRoomState(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST room-state", req, body); }
    @GetMapping("/attendance") public JsonNode getAttendance(HttpServletRequest req) throws Exception { return svc.call("GET attendance", req, null); }
    @GetMapping("/summary") public JsonNode getSummary(HttpServletRequest req) throws Exception { return svc.call("GET summary", req, null); }
    @PostMapping("/join") public JsonNode postJoin(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST join", req, body); }
    @PostMapping("/leave") public JsonNode postLeave(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST leave", req, body); }
    @PostMapping("/signal") public JsonNode postSignal(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST signal", req, body); }
    @PostMapping("/poll") public JsonNode postPoll(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST poll", req, body); }
    @PostMapping("/event") public JsonNode postEvent(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST event", req, body); }
    @GetMapping("/my") public JsonNode getMy(HttpServletRequest req) throws Exception { return svc.call("GET my", req, null); }
    @PostMapping("/rec-start") public JsonNode postRecStart(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST rec-start", req, body); }
    @PostMapping("/rec-part") public JsonNode postRecPart(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST rec-part", req, body); }
    @PostMapping("/rec-finish") public JsonNode postRecFinish(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST rec-finish", req, body); }
    @PostMapping("/rec-delete") public JsonNode postRecDelete(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST rec-delete", req, body); }
    @GetMapping("/recs") public JsonNode getRecs(HttpServletRequest req) throws Exception { return svc.call("GET recs", req, null); }
    @GetMapping("/rec") public JsonNode getRec(HttpServletRequest req) throws Exception { return svc.call("GET rec", req, null); }
    @GetMapping("/rec-views") public JsonNode getRecViews(HttpServletRequest req) throws Exception { return svc.call("GET rec-views", req, null); }
    @GetMapping("/cap-setting") public JsonNode getCapSetting(HttpServletRequest req) throws Exception { return svc.call("GET cap-setting", req, null); }
    @PostMapping("/cap-setting") public JsonNode postCapSetting(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-setting", req, body); }
    @GetMapping("/cap-rooms") public JsonNode getCapRooms(HttpServletRequest req) throws Exception { return svc.call("GET cap-rooms", req, null); }
    @PostMapping("/cap-room") public JsonNode postCapRoom(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-room", req, body); }
    @PostMapping("/cap-seg") public JsonNode postCapSeg(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-seg", req, body); }
    @GetMapping("/cap-lines") public JsonNode getCapLines(HttpServletRequest req) throws Exception { return svc.call("GET cap-lines", req, null); }
    @PostMapping("/cap-edit") public JsonNode postCapEdit(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-edit", req, body); }
    @PostMapping("/cap-finish") public JsonNode postCapFinish(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-finish", req, body); }
    @GetMapping("/cap-transcript") public JsonNode getCapTranscript(HttpServletRequest req) throws Exception { return svc.call("GET cap-transcript", req, null); }
    @PostMapping("/cap-script") public JsonNode postCapScript(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-script", req, body); }
    @GetMapping("/cap-stats") public JsonNode getCapStats(HttpServletRequest req) throws Exception { return svc.call("GET cap-stats", req, null); }
    @PostMapping("/cap-audio") public JsonNode postCapAudio(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-audio", req, body); }
    @GetMapping("/cap-audio") public JsonNode getCapAudio(HttpServletRequest req) throws Exception { return svc.call("GET cap-audio", req, null); }
    @GetMapping("/cap-view") public JsonNode getCapView(HttpServletRequest req) throws Exception { return svc.call("GET cap-view", req, null); }
    @PostMapping("/cap-translate") public JsonNode postCapTranslate(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-translate", req, body); }
    @PostMapping("/cap-summary") public JsonNode postCapSummary(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return svc.call("POST cap-summary", req, body); }
}
