package egovframework.didisam.pub.web;

import egovframework.didisam.cmm.DdApiFilter;
import egovframework.didisam.pub.service.PubService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.regex.Matcher;
import org.springframework.web.bind.annotation.*;

/** 학습자 포털 /api/pub/{tid}/{act} — 메서드 구분은 서비스가 Node와 같이 "{메서드} {act}"로 한다(없는 조합은 404) */
@RestController
public class PubController {
    private final PubService pubService;
    public PubController(PubService pubService) { this.pubService = pubService; }

    @RequestMapping(value = "/api/pub/{tid}/{act}", method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH, RequestMethod.HEAD, RequestMethod.OPTIONS })
    public Object pub(@RequestBody(required = false) byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception {
        Matcher m = DdApiFilter.PUB.matcher(req.getRequestURI()); m.matches(); // Node와 같이 디코딩하지 않은 경로에서 tid · act를 읽는다
        return pubService.route(req, res, m.group(1), m.group(2), body);
    }
}
