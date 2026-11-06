package egovframework.didisam.lms.d.service.impl;

import egovframework.didisam.lms.d.service.LmsDService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.lms.b.service.impl.LmsBcdCore;
import egovframework.didisam.lms.b.service.impl.LmsBcdCore.Route;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 학사 LMS 묶음 D — 강의 게시판(공지 · Q&A · 자료실 · 1:1 상담 · 댓글 · 발송 대기). 경로 표는 Node lms/mod-d.js ROUTES와 같다. */
@Service("lmsDService")
public class LmsDServiceImpl extends EgovAbstractServiceImpl implements LmsDService {
    static final Map<String, Route> ROUTES = Map.ofEntries(
        Map.entry("boards", Route.get()),
        Map.entry("posts", Route.get()),
        Map.entry("post", Route.get()),
        Map.entry("readers", Route.get()),
        Map.entry("outbox", Route.get()),
        Map.entry("board-save", Route.post(8192)),
        Map.entry("post-save", Route.post(131072)),
        Map.entry("post-del", Route.post()),
        Map.entry("post-pin", Route.post()),
        Map.entry("post-copy", Route.post(16384)),
        Map.entry("answer", Route.post(65536)),
        Map.entry("answer-del", Route.post()),
        Map.entry("answer-accept", Route.post()),
        Map.entry("comment", Route.post(16384)),
        Map.entry("comment-del", Route.post()),
        Map.entry("counsel-status", Route.post()));
    private final LmsDMapper mapper; private final LmsBcdCore core;
    public LmsDServiceImpl(LmsDMapper mapper, LmsBcdCore core) { this.mapper = mapper; this.core = core; }

    @Override public Object call(String op, HttpServletRequest req, byte[] body) throws Exception {
        Route rt = ROUTES.get(op);
        if (rt == null || !rt.method().equals(req.getMethod())) throw new DdException(404, "없는 주소입니다.", "not_found");
        return core.handle(core.who(req), "d", op, rt, req, body, (o, x) -> mapper.api(o, x[0], x[1]));
    }
}
