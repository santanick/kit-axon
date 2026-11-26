package egovframework.didisam.conn.web;

import egovframework.didisam.conn.service.impl.TeamsServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

/** MS Teams 연동 /api/conn/teams/* · Entra SSO(microsoft) 리다이렉트 — Node teams.match · teams.handle과 같은 경로. 등록 경로는 DdApiFilter.TEAMS */
@RestController
public class TeamsController {
    private final TeamsServiceImpl svc;
    public TeamsController(TeamsServiceImpl svc) { this.svc = svc; }
    @GetMapping({ "/api/conn/teams/consent/start", "/api/conn/teams/consent/whoami", "/api/conn/teams/consent/callback", "/api/conn/teams/account/start", "/api/conn/teams/account/callback",
        "/api/oauth/microsoft/start", "/api/oauth/microsoft/callback", "/api/pub/loauth/microsoft/callback", "/api/pub/{tid}/loauth/microsoft/start" })
    public void redirect(HttpServletRequest q, HttpServletResponse r) throws Exception { svc.redirectRoute(q.getRequestURI(), q, r); }
    @PostMapping("/api/oauth/microsoft/link-start") public Object linkStart(HttpServletRequest q) throws Exception { return svc.opLinkStart(q); }
    @RequestMapping(value = { "/api/conn/teams", "/api/conn/teams/**" }, method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE })
    public Object any(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return svc.route(q, r, b); }
}
