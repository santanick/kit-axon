package egovframework.didisam.lms.k.service.impl;

import static egovframework.didisam.lms.k.service.impl.LmsCall.r;
import static egovframework.didisam.lms.k.service.impl.LmsCall.w;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.lms.k.service.impl.LmsCall;
import egovframework.didisam.lms.k.service.LmsKService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 묶음 K — 설문(단위별 · 다국어 · 템플릿 · 통계 · 내보내기 · 강의평가 · 게이트). 업무 규칙은 DB 함수 lms_k_*(Node mod-k.js와 같은 함수) */
@Service("lmsKService")
public class LmsKServiceImpl extends EgovAbstractServiceImpl implements LmsKService {
    /** Node service/server/lms/mod-k.js ROUTES와 같은 표(scratchpad genjava.py로 생성) */
    public static final List<LmsCall.Route> ROUTES = List.of(
        r("GET", "surveys", "survey_list", "ost"),
        r("GET", "survey", "survey_get", "ostL"),
        w("POST", "survey/save", "survey_save", "ost"),
        w("POST", "survey/open", "survey_open", "ost"),
        w("POST", "survey/close", "survey_close", "ost"),
        w("POST", "survey/delete", "survey_delete", "os"),
        w("POST", "survey/copy", "survey_copy", "ost"),
        w("POST", "respond", "respond", "ostL"),
        w("POST", "import", "import", "os"),
        r("GET", "pending", "pending", "ostL"),
        r("GET", "gate", "gate", "ostL"),
        r("GET", "stats", "stats", "ost"),
        r("GET", "export", "export", "ost"),
        w("POST", "remind", "remind_run", "os"),
        w("POST", "course-eval", "course_eval", "ost"),
        w("POST", "eval/public", "eval_public", "os"));
    private final AuthService auth; private final LmsCall call;
    public LmsKServiceImpl(AuthService auth, LmsCall call) { this.auth = auth; this.call = call; }
    @Override public JsonNode handle(String method, String name, HttpServletRequest req, byte[] body) throws Exception {
        LmsCall.Route rt = LmsCall.find(ROUTES, method, name);
        if (rt == null) throw new DdException(404, "없는 주소입니다.", "not_found");
        return call.run("k", rt, auth.auth(req), req, body);
    }
}
