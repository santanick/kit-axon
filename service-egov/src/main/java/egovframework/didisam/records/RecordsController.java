package egovframework.didisam.records;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdWeb;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** 가디언 4차: GET/POST /api/access-review(정운영자), GET/POST /api/org/sec/geo, POST /api/export/log(d6 화면 CSV 기록) — Node records.js routes와 같은 규격 */
@RestController
@RequestMapping("/api")
public class RecordsController {
    private final AuthService auth; private final RecordsService svc;
    public RecordsController(AuthService auth, RecordsService svc) { this.auth = auth; this.svc = svc; }
    @GetMapping("/access-review") public Map<String, Object> review(HttpServletRequest req) throws Exception { return svc.reviewGet(auth.needOwner(req)); }
    @PostMapping("/access-review") public Map<String, Object> reviewPost(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { Map<String, Object> a = auth.needOwner(req); return svc.reviewPost(a, DdWeb.readBody(body, 4096)); }
    @GetMapping("/org/sec/geo") public Map<String, Object> geo(HttpServletRequest req) throws Exception { return svc.geoGet(auth.need(req)); }
    @PostMapping("/export/log") public Map<String, Object> exportLog(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); return svc.exportLog(a, DdWeb.readBody(body, 4096)); }
    @PostMapping("/org/sec/geo") public Map<String, Object> geoPost(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { Map<String, Object> a = auth.needOwner(req); return svc.geoPost(a, DdWeb.readBody(body, 1024)); }
}
