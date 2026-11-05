package egovframework.didisam.state.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.state.service.StateService;
import egovframework.didisam.state.service.impl.StateServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/state")
public class StateController {
    private final AuthService authService; private final StateService stateService;
    public StateController(AuthService authService, StateService stateService) { this.authService = authService; this.stateService = stateService; }

    @GetMapping public Map<String, Object> get(HttpServletRequest req) throws Exception { return stateService.get(authService.need(req)); }
    @PutMapping public Map<String, Object> put(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception {
        Map<String, Object> a = authService.need(req);
        return stateService.put(a, DdWeb.readBody(body, StateServiceImpl.STATE_MAX + 4096));
    }
}
