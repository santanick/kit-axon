package egovframework.didisam.main.web;

import egovframework.didisam.auth.service.AuthService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 서버 렌더링(JSP) 진입 화면 — 기술적용계획표 「동적표현: JSP」 대응.
 * 업무 화면은 HTML5 + REST(/api)로 동작하고, 진입 · 기관 정보 · 오류 안내는 JSP로 서버에서 그린다.
 */
@Controller
public class EgovMainController {
    @Resource(name = "authService") private AuthService authService;
    @Resource(name = "propertiesService") private EgovPropertyService props;

    @GetMapping("/egov/main.do")
    public String main(HttpServletRequest req, ModelMap model) throws Exception {
        Map<String, Object> a = authService.auth(req);
        if (a != null) model.addAttribute("me", authService.meOut(a));
        model.addAttribute("sessionDays", props.getInt("session.days"));
        model.addAttribute("edition", "전자정부 표준프레임워크 5.0 에디션");
        return "egovframework/didisam/main/EgovMain";
    }
}
