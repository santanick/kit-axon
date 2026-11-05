package egovframework.didisam.lms.i.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.Js;
import egovframework.didisam.lms.g.service.impl.LmsEngine;
import egovframework.didisam.lms.i.service.LmsIService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.function.Function;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 묶음 I 서비스 구현 — 경로 선언(SPEC, Node mod-i.js와 같음)과 매퍼 문장을 LmsEngine으로 실행 */
@Service("lmsIService")
public class LmsIServiceImpl extends EgovAbstractServiceImpl implements LmsIService {
    static final JsonNode SPEC = Js.parse(String.join("",
        "{\"err\":{\"bad_input\":[400,\"입력값이 올바르지 않습니다.\"],\"required\":[400,\"필수 입력값이 없습니다.\"],\"not_found\":[404,\"대상을 찾을 수 없습니다.\"],\"role\":[403,\"이 작업을 할 권한이 없습니다.\"],\"holiday\":[409,\"휴강 차시입니다.\"],\"not_enrolled\":[403,\"이 분반 수강생이 아닙니다.\"],\"audit\":[403,\"청강생은 출석 대상이 아닙니다.\"],\"method_off\":[403,\"이 분반에서 허용하지 않은 출석 방식입니다.\"],\"no_time\":[409,\"차시 시작 시각이 정해지지 않았습니다.\"],\"not_open\":[409,\"아직 출석 시간이 아닙니다.\"],\"closed\":[409,\"출석 인정 시간이 지났습니다. 교수자에게 문의하세요.\"],\"dup\":[409,\"이미 이 차시에 출석했습니다.\"],\"idv_required\":[428,\"출석 전 본인 재인증이 필요합니다(SSO 재인증 연동 후 동작).\"],\"no_code\":[409,\"발급된 인증번호가 없습니다.\"],\"expired\":[410,\"인증번호 · QR이 만료되었습니다.\"],\"bad_code\":[400,\"인증번호가 맞지 않습니다.\"],\"bad_qr\":[400,\"QR이 맞지 않거나 바뀌었습니다. 다시 촬영하세요.\"],\"bad_tag\":[400,\"등록되지 않은 NFC 태그 · 비콘입니다.\"],\"room_mismatch\":[403,\"이 차시 강의실의 태그 · 비콘이 아닙니다.\"],\"need_geo\":[400,\"촬영 위치(위도 · 경도)가 필요합니다.\"],\"need_reason\":[400,\"공결 · 조정에는 사유가 필요합니다.\"],\"no_next\":[404,\"이어지는 연강 차시가 없습니다.\"],\"concurrent\":[409,\"다른 기기 · 창에서 재생 중입니다. 동시 재생은 허용되지 않습니다.\"],\"play_over\":[409,\"끝났거나 다른 재생으로 바뀐 재생입니다.\"],\"bad_rate\":[400,\"배속은 1.0~2.0배만 허용됩니다.\"],\"bad_sub\":[400,\"자막 파일 형식이 올바르지 않습니다(VTT · SRT).\"],\"answered\":[409,\"이미 응답한 퀴즈입니다.\"],\"bad_choice\":[400,\"보기 번호가 올바르지 않습니다.\"]},\"routes\":[{\"m\":\"POST\",\"p\":\"/api/lms/i/seed\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"seed\"],\"audit\":\"lms.i.seed\"},{\"m\":\"GET\",\"p\":\"/api/lms/i/contents\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"contents\"]},{\"m\":\"POST\",\"p\":\"/api/lms/i/content\",\"params\":[[\"session_id\",\"uuid\",1],[\"title\",\"text\",1,120],[\"duration_sec\",\"int\",1,1,36000],[\"src\",\"text\",0,500],[\"che",
        "ck_at_sec\",\"int\",0,0,36000]],\"stmts\":[\"contentAdd\"],\"audit\":\"lms.i.content\"},{\"m\":\"POST\",\"p\":\"/api/lms/i/play/start\",\"limit\":[\"lmsi-ps\",120,60000],\"params\":[[\"content_id\",\"uuid\",1],[\"member_no\",\"mno\",1]],\"stmts\":[\"playStart\"]},{\"m\":\"POST\",\"p\":\"/api/lms/i/play/beat\",\"limit\":[\"lmsi-pb\",600,60000],\"params\":[[\"play_id\",\"uuid\",1],[\"from\",\"int\",1,0,36000],[\"pos\",\"int\",1,0,36000],[\"rate\",\"num\",1,0.0625,16]],\"stmts\":[\"beatCheck\",\"beatEvents\",\"beatSave\"]},{\"m\":\"POST\",\"p\":\"/api/lms/i/play/end\",\"params\":[[\"play_id\",\"uuid\",1],[\"pos\",\"int\",0,0,36000]],\"stmts\":[\"playEnd\"]},{\"m\":\"GET\",\"p\":\"/api/lms/i/progress\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"progress\"]},{\"m\":\"POST\",\"p\":\"/api/lms/i/subtitle\",\"max\":400000,\"params\":[[\"content_id\",\"uuid\",1],[\"lang\",\"enum\",1,[\"ko\",\"en\",\"ja\",\"zh\",\"vi\",\"uz\",\"mn\",\"ru\",\"es\",\"fr\",\"de\",\"id\",\"th\",\"ne\"]],[\"format\",\"enum\",1,[\"vtt\",\"srt\"]],[\"text\",\"text\",1,300000]],\"stmts\":[\"subParse\"],\"audit\":\"lms.i.subtitle\"},{\"m\":\"POST\",\"p\":\"/api/lms/i/subtitle/cues\",\"max\":400000,\"params\":[[\"content_id\",\"uuid\",1],[\"lang\",\"enum\",1,[\"ko\",\"en\",\"ja\",\"zh\",\"vi\",\"uz\",\"mn\",\"ru\",\"es\",\"fr\",\"de\",\"id\",\"th\",\"ne\"]],[\"cues\",\"json\",1,350000]],\"stmts\":[\"subCues\"],\"audit\":\"lms.i.subtitle\"},{\"m\":\"GET\",\"p\":\"/api/lms/i/subtitles\",\"params\":[[\"content_id\",\"uuid\",1]],\"stmts\":[\"subs\"]},{\"m\":\"POST\",\"p\":\"/api/lms/i/quiz\",\"params\":[[\"content_id\",\"uuid\",1],[\"at_sec\",\"int\",1,0,36000],[\"question\",\"text\",1,300],[\"options\",\"json\",1,2000],[\"answer\",\"int\",1,0,5],[\"points\",\"int\",0,1,10,1]],\"stmts\":[\"quizAdd\"",
        "],\"audit\":\"lms.i.quiz\"},{\"m\":\"GET\",\"p\":\"/api/lms/i/quizzes\",\"params\":[[\"content_id\",\"uuid\",1],[\"member_no\",\"mno\"]],\"stmts\":[\"quizzes\"]},{\"m\":\"POST\",\"p\":\"/api/lms/i/quiz/answer\",\"params\":[[\"quiz_id\",\"uuid\",1],[\"member_no\",\"mno\",1],[\"choice\",\"int\",1,0,5]],\"stmts\":[\"quizAnswer\"]},{\"m\":\"GET\",\"p\":\"/api/lms/i/workload\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"workload\"]},{\"m\":\"GET\",\"p\":\"/api/lms/i/history\",\"params\":[[\"section_id\",\"uuid\",1],[\"member_no\",\"mno\"]],\"stmts\":[\"history\"]},{\"m\":\"POST\",\"p\":\"/api/lms/i/activity\",\"limit\":[\"lmsi-ac\",300,60000],\"params\":[[\"section_id\",\"uuid\",1],[\"member_no\",\"mno\",1],[\"kind\",\"enum\",1,[\"view_notice\",\"view_material\",\"download\",\"submit_assignment\",\"post\",\"comment\",\"quiz\",\"exam\",\"live_join\",\"page\"]],[\"ref\",\"text\",0,200]],\"stmts\":[\"activity\"]}]}"));
    static final Map<String, JsonNode> ROUTES = LmsEngine.routes(SPEC);

    private final AuthService authService; private final LmsEngine engine; private final Map<String, Function<Map<String, Object>, String>> stmts = new HashMap<>();
    public LmsIServiceImpl(AuthService authService, LmsEngine engine, LmsIMapper m) {
        this.authService = authService; this.engine = engine;
        stmts.put("seed", p -> first(m.seed(p)));
        stmts.put("contents", p -> first(m.contents(p)));
        stmts.put("contentAdd", p -> first(m.contentAdd(p)));
        stmts.put("playStart", p -> first(m.playStart(p)));
        stmts.put("beatCheck", p -> first(m.beatCheck(p)));
        stmts.put("beatEvents", p -> first(m.beatEvents(p)));
        stmts.put("beatSave", p -> first(m.beatSave(p)));
        stmts.put("playEnd", p -> first(m.playEnd(p)));
        stmts.put("progress", p -> first(m.progress(p)));
        stmts.put("subParse", p -> first(m.subParse(p)));
        stmts.put("subCues", p -> first(m.subCues(p)));
        stmts.put("subs", p -> first(m.subs(p)));
        stmts.put("quizAdd", p -> first(m.quizAdd(p)));
        stmts.put("quizzes", p -> first(m.quizzes(p)));
        stmts.put("quizAnswer", p -> first(m.quizAnswer(p)));
        stmts.put("workload", p -> first(m.workload(p)));
        stmts.put("history", p -> first(m.history(p)));
        stmts.put("activity", p -> first(m.activity(p)));
    }

    static String first(List<String> l) { return l == null || l.isEmpty() ? null : l.get(0); }

    @Override public Object call(String route, HttpServletRequest req, byte[] body) throws Exception {
        JsonNode r = ROUTES.get(route); if (r == null) throw new DdException(404, "없는 주소입니다.", "not_found");
        return engine.run(SPEC, r, authService.need(req), req, body, stmts);
    }
}
