package egovframework.didisam.lms.q.service.impl;

import static egovframework.didisam.lms.k.service.impl.LmsCall.r;
import static egovframework.didisam.lms.k.service.impl.LmsCall.w;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.lms.k.service.impl.LmsCall;
import egovframework.didisam.lms.q.service.LmsQService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 묶음 Q — 비교과(성장마루 내재화: 상태 흐름 · 신청 승인 4종 · 팀 · 양식 · 역량 · 이수 · 설문 · 예산 · CQI · 파일 · 학생 화면). 업무 규칙은 DB 함수 lms_q_*(Node mod-q.js와 같은 함수) */
@Service("lmsQService")
public class LmsQServiceImpl extends EgovAbstractServiceImpl implements LmsQService {
    /** Node service/server/lms/mod-q.js ROUTES와 같은 표(scratchpad genjava.py로 생성) */
    public static final List<LmsCall.Route> ROUTES = List.of(
        r("GET", "groups", "groups", "ost"),
        w("POST", "group/save", "group_save", "os"),
        r("GET", "programs", "programs", "ost"),
        r("GET", "program", "program", "ostL"),
        w("POST", "program/save", "program_save", "os"),
        w("POST", "program/clone", "program_clone", "os"),
        w("POST", "program/transition", "transition", "os"),
        r("GET", "program/history", "history", "ost"),
        w("POST", "program/operator", "operator", "o"),
        w("POST", "program/certify", "certify", "o"),
        w("POST", "apply", "apply", "ostL"),
        w("POST", "apply/edit", "apply_edit", "ostL"),
        w("POST", "apply/cancel", "apply_cancel", "ostL"),
        r("GET", "applicants", "applicants", "ost"),
        r("GET", "applicant", "applicant", "os"),
        w("POST", "applicants/add", "applicants_add", "os"),
        w("POST", "applicants/status", "applicants_status", "os"),
        r("GET", "applicants/export", "applicants_export", "os"),
        w("POST", "notify", "notify", "os"),
        r("GET", "attendance", "attendance", "ost"),
        w("POST", "attend", "attend", "os"),
        w("POST", "completion/run", "completion_run", "os"),
        w("POST", "completion/set", "completion_set", "os"),
        r("GET", "certificate", "certificate", "ostL"),
        w("POST", "survey/link", "survey_link", "os"),
        w("POST", "survey/auto", "survey_auto", "os"),
        r("GET", "survey/results", "survey_results", "os"),
        r("GET", "budget", "budget", "ost"),
        w("POST", "expense/save", "expense_save", "os"),
        w("POST", "expense/delete", "expense_delete", "os"),
        r("GET", "expense/doc", "expense_doc", "os"),
        r("GET", "plan", "plan", "ost"),
        r("GET", "cqi", "cqi", "ost"),
        w("POST", "cqi/save", "cqi_save", "os"),
        w("POST", "cqi/request", "cqi_request", "os"),
        w("POST", "cqi/decide", "cqi_decide", "o"),
        r("GET", "cqi/doc", "cqi_doc", "ost"),
        r("GET", "file", "file", "ostL"),
        r("GET", "student/programs", "student_programs", "ostL"),
        w("POST", "wish", "wish", "ostL"),
        r("GET", "student/me", "student_me", "ostL"),
        w("POST", "review", "review", "ostL"),
        r("GET", "reviews", "reviews", "ostL"),
        r("GET", "board", "board", "ostL"),
        w("POST", "board/post", "board_post", "ostL"));
    private final AuthService auth; private final LmsCall call;
    public LmsQServiceImpl(AuthService auth, LmsCall call) { this.auth = auth; this.call = call; }
    @Override public JsonNode handle(String method, String name, HttpServletRequest req, byte[] body) throws Exception {
        LmsCall.Route rt = LmsCall.find(ROUTES, method, name);
        if (rt == null) throw new DdException(404, "없는 주소입니다.", "not_found");
        return call.run("q", rt, auth.auth(req), req, body);
    }
}
