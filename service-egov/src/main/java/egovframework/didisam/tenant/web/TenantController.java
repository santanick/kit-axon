package egovframework.didisam.tenant.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.pii.service.PiiService;
import egovframework.didisam.tenant.service.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** 기관 운영(감사 기록 · 파기) · 학습자 관리(진도 · 계정 목록 · 목적이 있는 개인정보 열람 · 열람 기록) */
@RestController
@RequestMapping("/api")
public class TenantController {
    private final AuthService authService; private final TenantService tenantService; private final PiiService piiService; private final egovframework.didisam.state.service.StateService stateService;
    public TenantController(AuthService authService, TenantService tenantService, PiiService piiService, egovframework.didisam.state.service.StateService stateService) { this.authService = authService; this.tenantService = tenantService; this.piiService = piiService; this.stateService = stateService; }

    @GetMapping("/audit") public Map<String, Object> audit(HttpServletRequest req) throws Exception { return tenantService.audit(authService.needStaff(req)); }
    @PostMapping("/tenant/delete") public Map<String, Object> delete(@RequestBody(required = false) byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception {
        return tenantService.delete(authService.need(req), body, res);
    }
    @GetMapping("/learners/progress") public Map<String, Object> progress(HttpServletRequest req) throws Exception {
        Map<String, Object> a = authService.need(req); Map<String, Object> o = tenantService.progress(a);
        if ("teacher".equals(a.get("role")) && o.get("lp") instanceof Map<?, ?> lp) { var s = stateService.scope(a); Map<Object, Object> f = new java.util.LinkedHashMap<>(); lp.forEach((k, v) -> { if (s.sids.contains(String.valueOf(k))) f.put(k, v); }); Map<String, Object> r = new java.util.LinkedHashMap<>(o); r.put("lp", f); return r; }
        return o;
    }
    @GetMapping("/learners/accounts") public Map<String, Object> accounts(HttpServletRequest req) throws Exception { return piiService.adminList(authService.needStaff(req)); }
    @PostMapping("/learners/pii") public Map<String, Object> pii(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception {
        return piiService.adminPii(authService.needStaff(req), body);
    }
    @GetMapping("/learners/pii-log") public Map<String, Object> piiLog(HttpServletRequest req) throws Exception { return piiService.adminLog(authService.needStaff(req)); }
}
