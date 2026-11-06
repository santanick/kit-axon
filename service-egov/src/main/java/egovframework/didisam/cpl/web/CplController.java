package egovframework.didisam.cpl.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cpl.service.CplService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cpl")
public class CplController {
    private final AuthService authService; private final CplService cplService; private final egovframework.didisam.state.service.StateService stateService;
    public CplController(AuthService authService, CplService cplService, egovframework.didisam.state.service.StateService stateService) { this.authService = authService; this.cplService = cplService; this.stateService = stateService; }
    @SuppressWarnings("unchecked") private Map<String, Object> keep(Map<String, Object> a, Map<String, Object> o, boolean byCls) throws Exception {
        if (!"teacher".equals(a.get("role"))) return o; var s = stateService.scope(a);
        var rows = ((java.util.List<Map<String, Object>>) o.get("rows")).stream().filter(r -> s.sids.contains(String.valueOf(r.get("sid"))) && (!byCls || s.classes.contains(String.valueOf(r.get("cls"))))).toList();
        Map<String, Object> out = new java.util.LinkedHashMap<>(o); out.put("rows", rows); return out;
    }
    @GetMapping("/summary") public Map<String, Object> summary(HttpServletRequest req) throws Exception { Map<String, Object> a = authService.need(req); return keep(a, cplService.summary(a), false); }
    @GetMapping("/exams") public Map<String, Object> exams(HttpServletRequest req) throws Exception { Map<String, Object> a = authService.need(req); return keep(a, cplService.exams(a), true); }
    @SuppressWarnings("unchecked") @GetMapping("/exam-copy") public Map<String, Object> examCopy(HttpServletRequest req) throws Exception {
        Map<String, Object> a = authService.need(req); Map<String, Object> o = cplService.examCopy(a); if (!"teacher".equals(a.get("role"))) return o; var s = stateService.scope(a);
        var rows = ((java.util.List<Map<String, Object>>) o.get("rows")).stream().filter(r -> s.classes.contains(String.valueOf(r.get("cls"))) && s.sids.contains(String.valueOf(r.get("a"))) && s.sids.contains(String.valueOf(r.get("b")))).toList(); Map<String, Object> out = new java.util.LinkedHashMap<>(o); out.put("rows", rows); return out;
    }
    @GetMapping("/logs") public Map<String, Object> logs(HttpServletRequest req, @RequestParam(required = false) String sid, @RequestParam(required = false) String limit) throws Exception { Map<String, Object> a = authService.need(req); return keep(a, cplService.logs(a, sid, limit), false); }
}
