package egovframework.didisam.lms.j.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.Js;
import egovframework.didisam.lms.g.service.impl.LmsEngine;
import egovframework.didisam.lms.j.service.LmsJService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.function.Function;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 묶음 J 서비스 구현 — 경로 선언(SPEC, Node mod-j.js와 같음)과 매퍼 문장을 LmsEngine으로 실행 */
@Service("lmsJService")
public class LmsJServiceImpl extends EgovAbstractServiceImpl implements LmsJService {
    static final JsonNode SPEC = Js.parse(String.join("",
        "{\"err\":{\"bad_input\":[400,\"입력값이 올바르지 않습니다.\"],\"required\":[400,\"필수 입력값이 없습니다.\"],\"not_found\":[404,\"대상을 찾을 수 없습니다.\"],\"role\":[403,\"이 작업을 할 권한이 없습니다.\"],\"holiday\":[409,\"휴강 차시입니다.\"],\"not_enrolled\":[403,\"이 분반 수강생이 아닙니다.\"],\"audit\":[403,\"청강생은 출석 대상이 아닙니다.\"],\"method_off\":[403,\"이 분반에서 허용하지 않은 출석 방식입니다.\"],\"no_time\":[409,\"차시 시작 시각이 정해지지 않았습니다.\"],\"not_open\":[409,\"아직 출석 시간이 아닙니다.\"],\"closed\":[409,\"출석 인정 시간이 지났습니다. 교수자에게 문의하세요.\"],\"dup\":[409,\"이미 이 차시에 출석했습니다.\"],\"idv_required\":[428,\"출석 전 본인 재인증이 필요합니다(SSO 재인증 연동 후 동작).\"],\"no_code\":[409,\"발급된 인증번호가 없습니다.\"],\"expired\":[410,\"인증번호 · QR이 만료되었습니다.\"],\"bad_code\":[400,\"인증번호가 맞지 않습니다.\"],\"bad_qr\":[400,\"QR이 맞지 않거나 바뀌었습니다. 다시 촬영하세요.\"],\"bad_tag\":[400,\"등록되지 않은 NFC 태그 · 비콘입니다.\"],\"room_mismatch\":[403,\"이 차시 강의실의 태그 · 비콘이 아닙니다.\"],\"need_geo\":[400,\"촬영 위치(위도 · 경도)가 필요합니다.\"],\"need_reason\":[400,\"공결 · 조정에는 사유가 필요합니다.\"],\"no_next\":[404,\"이어지는 연강 차시가 없습니다.\"],\"concurrent\":[409,\"다른 기기 · 창에서 재생 중입니다. 동시 재생은 허용되지 않습니다.\"],\"play_over\":[409,\"끝났거나 다른 재생으로 바뀐 재생입니다.\"],\"bad_rate\":[400,\"배속은 1.0~2.0배만 허용됩니다.\"],\"bad_sub\":[400,\"자막 파일 형식이 올바르지 않습니다(VTT · SRT).\"],\"answered\":[409,\"이미 응답한 퀴즈입니다.\"],\"bad_choice\":[400,\"보기 번호가 올바르지 않습니다.\"]},\"routes\":[{\"m\":\"GET\",\"p\":\"/api/lms/j/risk\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"risk\"]},{\"m\":\"POST\",\"p\":\"/api/lms/j/snapshot\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"snapshot\"],\"audit\":\"lms.j.snapshot\"},{\"m\":\"GET\",\"p\":\"/api/lms/j/rules\",\"stmts\":[\"rules\"]},{\"m\":\"POST\",\"p\":\"/api/lms/j/rule\",\"roles\":\"staff\",\"params\":[[\"rule_id\",\"uuid\"],[\"name\",\"text\",1,",
        "60],[\"metric\",\"enum\",1,[\"risk\",\"grade\",\"attendance\",\"participation\",\"extra\",\"dropout\"]],[\"op\",\"enum\",1,[\"gte\",\"lte\"]],[\"threshold\",\"int\",1,0,100],[\"level\",\"enum\",1,[\"warn\",\"danger\"]],[\"active\",\"bool\",0,0,0,\"true\"]],\"stmts\":[\"ruleSet\"],\"audit\":\"lms.j.rule\"},{\"m\":\"POST\",\"p\":\"/api/lms/j/rule/delete\",\"roles\":\"staff\",\"params\":[[\"rule_id\",\"uuid\",1]],\"stmts\":[\"ruleDel\"],\"audit\":\"lms.j.rule.delete\"},{\"m\":\"GET\",\"p\":\"/api/lms/j/targets\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"targets\"]},{\"m\":\"GET\",\"p\":\"/api/lms/j/insights\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"insights\"]},{\"m\":\"POST\",\"p\":\"/api/lms/j/feedback\",\"params\":[[\"section_id\",\"uuid\",1],[\"member_no\",\"mno\"],[\"audience\",\"enum\",1,[\"professor\",\"student\"]]],\"stmts\":[\"feedback\"],\"audit\":\"lms.j.feedback\"},{\"m\":\"POST\",\"p\":\"/api/lms/j/feedback/save\",\"params\":[[\"section_id\",\"uuid\",1],[\"member_no\",\"mno\"],[\"audience\",\"enum\",1,[\"professor\",\"student\"]],[\"body\",\"text\",1,4000],[\"source\",\"enum\",1,[\"ai\",\"edited\"]]],\"stmts\":[\"feedbackSave\"],\"audit\":\"lms.j.feedback\"},{\"m\":\"GET\",\"p\":\"/api/lms/j/feedbacks\",\"params\":[[\"section_id\",\"uuid\",1],[\"member_no\",\"mno\"]],\"stmts\":[\"feedbacks\"]},{\"m\":\"POST\",\"p\":\"/api/lms/j/reflection\",\"params\":[[\"section_id\",\"uuid\",1],[\"member_no\",\"mno\",1],[\"week_no\",\"int\",1,1,20],[\"body\",\"text\",1,4000],[\"mood\",\"int\",0,1,5]],\"stmts\":[\"reflAdd\"],\"audit\":\"lms.j.reflection\"},{\"m\":\"GET\",\"p\":\"/api/lms/j/reflections\",\"params\":[[\"section_id\",\"uuid\",1],[\"member_no\",\"mno\"]],\"stmts\":[\"reflList\"]},{\"m\":\"POST\",\"p\":\"/api/lms/j/refl",
        "ection/comment\",\"params\":[[\"id\",\"uuid\",1],[\"comment\",\"text\",1,1000]],\"stmts\":[\"reflComment\"],\"audit\":\"lms.j.reflection.comment\"},{\"m\":\"GET\",\"p\":\"/api/lms/j/report\",\"params\":[[\"section_id\",\"uuid\",1],[\"member_no\",\"mno\",1],[\"view\",\"enum\",0,[\"professor\",\"student\"],0,\"professor\"]],\"stmts\":[\"report\"]}]}"));
    static final Map<String, JsonNode> ROUTES = LmsEngine.routes(SPEC);

    private final AuthService authService; private final LmsEngine engine; private final Map<String, Function<Map<String, Object>, String>> stmts = new HashMap<>();
    public LmsJServiceImpl(AuthService authService, LmsEngine engine, LmsJMapper m) {
        this.authService = authService; this.engine = engine;
        stmts.put("risk", p -> first(m.risk(p)));
        stmts.put("snapshot", p -> first(m.snapshot(p)));
        stmts.put("rules", p -> first(m.rules(p)));
        stmts.put("ruleSet", p -> first(m.ruleSet(p)));
        stmts.put("ruleDel", p -> first(m.ruleDel(p)));
        stmts.put("targets", p -> first(m.targets(p)));
        stmts.put("insights", p -> first(m.insights(p)));
        stmts.put("feedback", p -> first(m.feedback(p)));
        stmts.put("feedbackSave", p -> first(m.feedbackSave(p)));
        stmts.put("feedbacks", p -> first(m.feedbacks(p)));
        stmts.put("reflAdd", p -> first(m.reflAdd(p)));
        stmts.put("reflList", p -> first(m.reflList(p)));
        stmts.put("reflComment", p -> first(m.reflComment(p)));
        stmts.put("report", p -> first(m.report(p)));
    }

    static String first(List<String> l) { return l == null || l.isEmpty() ? null : l.get(0); }

    @Override public Object call(String route, HttpServletRequest req, byte[] body) throws Exception {
        JsonNode r = ROUTES.get(route); if (r == null) throw new DdException(404, "없는 주소입니다.", "not_found");
        return engine.run(SPEC, r, authService.need(req), req, body, stmts);
    }
}
