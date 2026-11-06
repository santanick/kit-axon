package egovframework.didisam.lms.n.service.impl;

import static egovframework.didisam.lms.k.service.impl.LmsCall.r;
import static egovframework.didisam.lms.k.service.impl.LmsCall.w;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.lms.k.service.impl.LmsCall;
import egovframework.didisam.lms.n.service.LmsNService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 묶음 N — MOOC · 비학위(검색 · 찜 · 기수 · 수료 · 수료증 · 승인 · 정규 전환 · 진단 기반 학습경로). 업무 규칙은 DB 함수 lms_n_*(Node mod-n.js와 같은 함수) */
@Service("lmsNService")
public class LmsNServiceImpl extends EgovAbstractServiceImpl implements LmsNService {
    /** Node service/server/lms/mod-n.js ROUTES와 같은 표(scratchpad genjava.py로 생성) */
    public static final List<LmsCall.Route> ROUTES = List.of(
        r("GET", "search", "search", "ostL"),
        r("GET", "suggest", "suggest", "ostL"),
        r("GET", "course", "course_get", "ostL"),
        w("POST", "course/save", "course_save", "ost"),
        w("POST", "course/submit", "course_submit", "ost"),
        w("POST", "course/decide", "course_decide", "os"),
        w("POST", "course/close", "course_close", "os"),
        w("POST", "convert", "convert", "ost"),
        w("POST", "cohort/save", "cohort_save", "ost"),
        w("POST", "enroll", "enroll", "ostL"),
        w("POST", "enroll/cancel", "enroll_cancel", "ostL"),
        w("POST", "pay/confirm", "pay_confirm", "os"),
        w("POST", "enroll/decide", "enroll_decide", "os"),
        r("GET", "enrolls", "enrolls", "ost"),
        w("POST", "progress", "progress", "ost"),
        w("POST", "complete", "complete", "os"),
        r("GET", "certificate", "certificate", "ostL"),
        w("POST", "wish", "wish", "ostL"),
        r("GET", "mypage", "mypage", "ostL"),
        w("POST", "diag/save", "diag_save", "os"),
        r("GET", "diags", "diags", "ostL"),
        w("POST", "diag/take", "diag_take", "ostL"),
        r("GET", "recommend", "recommend", "ostL"));
    private final AuthService auth; private final LmsCall call;
    public LmsNServiceImpl(AuthService auth, LmsCall call) { this.auth = auth; this.call = call; }
    @Override public JsonNode handle(String method, String name, HttpServletRequest req, byte[] body) throws Exception {
        LmsCall.Route rt = LmsCall.find(ROUTES, method, name);
        if (rt == null) throw new DdException(404, "없는 주소입니다.", "not_found");
        return call.run("n", rt, auth.auth(req), req, body);
    }
}
