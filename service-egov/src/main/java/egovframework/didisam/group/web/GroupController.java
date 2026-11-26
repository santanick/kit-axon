package egovframework.didisam.group.web;

import egovframework.didisam.group.service.GroupService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

/** 통합 센터(기관 묶음) /api/group/* — Node service/server/group/routes.js처럼 경로 표 · 권한 · 오류 코드는 서비스가 판정한다. 등록 경로는 DdApiFilter.GROUP */
@RestController
@RequestMapping("/api/group")
public class GroupController {
    private final GroupService grp;
    public GroupController(GroupService grp) { this.grp = grp; }
    @RequestMapping(value = { "", "/**" }, method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE })
    public Object any(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return grp.route(q, r, b); }
}
