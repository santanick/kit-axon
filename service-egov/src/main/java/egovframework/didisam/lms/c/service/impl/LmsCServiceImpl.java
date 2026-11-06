package egovframework.didisam.lms.c.service.impl;

import egovframework.didisam.lms.c.service.LmsCService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.lms.b.service.impl.LmsBcdCore;
import egovframework.didisam.lms.b.service.impl.LmsBcdCore.Route;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 학사 LMS 묶음 C — 학습활동(토론 · 위키 · 팀 프로젝트 · 자기/동료 평가 · 대화방 · 설문 · 사전 과제/질문 · 수업 평가). 경로 표는 Node lms/mod-c.js ROUTES와 같다. */
@Service("lmsCService")
public class LmsCServiceImpl extends EgovAbstractServiceImpl implements LmsCService {
    static final Map<String, Route> ROUTES = Map.ofEntries(
        Map.entry("forums", Route.get()),
        Map.entry("forum", Route.get()),
        Map.entry("wiki", Route.get()),
        Map.entry("wiki-page", Route.get()),
        Map.entry("teams", Route.get()),
        Map.entry("progress", Route.get()),
        Map.entry("reviews", Route.get()),
        Map.entry("review", Route.get()),
        Map.entry("chat", Route.get()),
        Map.entry("polls", Route.get()),
        Map.entry("pretasks", Route.get()),
        Map.entry("forum-save", Route.post(32768)),
        Map.entry("forum-del", Route.post()),
        Map.entry("post", Route.post(65536)),
        Map.entry("post-edit", Route.post(65536)),
        Map.entry("post-del", Route.post()),
        Map.entry("wiki-save", Route.post(524288)),
        Map.entry("wiki-revert", Route.post()),
        Map.entry("team-save", Route.post()),
        Map.entry("team-del", Route.post()),
        Map.entry("team-member", Route.post()),
        Map.entry("team-auto", Route.post()),
        Map.entry("task-save", Route.post(32768)),
        Map.entry("task-del", Route.post()),
        Map.entry("task-status", Route.post()),
        Map.entry("review-save", Route.post(32768)),
        Map.entry("review-del", Route.post()),
        Map.entry("review-submit", Route.post(65536)),
        Map.entry("review-alloc", Route.post(65536)),
        Map.entry("review-score", Route.post(16384)),
        Map.entry("chat-send", Route.post(8192)),
        Map.entry("poll-save", Route.post(16384)),
        Map.entry("poll-vote", Route.post()),
        Map.entry("poll-close", Route.post()),
        Map.entry("poll-del", Route.post()),
        Map.entry("pretask-save", Route.post(32768)),
        Map.entry("pretask-del", Route.post()),
        Map.entry("pretask-submit", Route.post(65536)),
        Map.entry("pretask-grade", Route.post(16384)),
        Map.entry("pretask-publish", Route.post()));
    private final LmsCMapper mapper; private final LmsBcdCore core;
    public LmsCServiceImpl(LmsCMapper mapper, LmsBcdCore core) { this.mapper = mapper; this.core = core; }

    @Override public Object call(String op, HttpServletRequest req, byte[] body) throws Exception {
        Route rt = ROUTES.get(op);
        if (rt == null || !rt.method().equals(req.getMethod())) throw new DdException(404, "없는 주소입니다.", "not_found");
        return core.handle(core.who(req), "c", op, rt, req, body, (o, x) -> mapper.api(o, x[0], x[1]));
    }
}
