package egovframework.didisam.lms.g.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.Js;
import egovframework.didisam.lms.g.service.impl.LmsEngine;
import egovframework.didisam.lms.g.service.LmsGService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.function.Function;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 묶음 G 서비스 구현 — 경로 선언(SPEC, Node mod-g.js와 같음)과 매퍼 문장을 LmsEngine으로 실행 */
@Service("lmsGService")
public class LmsGServiceImpl extends EgovAbstractServiceImpl implements LmsGService {
    static final JsonNode SPEC = Js.parse(String.join("",
        "{\"err\":{\"bad_input\":[400,\"입력값이 올바르지 않습니다.\"],\"required\":[400,\"필수 입력값이 없습니다.\"],\"not_found\":[404,\"대상을 찾을 수 없습니다.\"],\"role\":[403,\"이 작업을 할 권한이 없습니다.\"],\"holiday\":[409,\"휴강 차시입니다.\"],\"not_enrolled\":[403,\"이 분반 수강생이 아닙니다.\"],\"audit\":[403,\"청강생은 출석 대상이 아닙니다.\"],\"method_off\":[403,\"이 분반에서 허용하지 않은 출석 방식입니다.\"],\"no_time\":[409,\"차시 시작 시각이 정해지지 않았습니다.\"],\"not_open\":[409,\"아직 출석 시간이 아닙니다.\"],\"closed\":[409,\"출석 인정 시간이 지났습니다. 교수자에게 문의하세요.\"],\"dup\":[409,\"이미 이 차시에 출석했습니다.\"],\"idv_required\":[428,\"출석 전 본인 재인증이 필요합니다(SSO 재인증 연동 후 동작).\"],\"no_code\":[409,\"발급된 인증번호가 없습니다.\"],\"expired\":[410,\"인증번호 · QR이 만료되었습니다.\"],\"bad_code\":[400,\"인증번호가 맞지 않습니다.\"],\"bad_qr\":[400,\"QR이 맞지 않거나 바뀌었습니다. 다시 촬영하세요.\"],\"bad_tag\":[400,\"등록되지 않은 NFC 태그 · 비콘입니다.\"],\"room_mismatch\":[403,\"이 차시 강의실의 태그 · 비콘이 아닙니다.\"],\"need_geo\":[400,\"촬영 위치(위도 · 경도)가 필요합니다.\"],\"need_reason\":[400,\"공결 · 조정에는 사유가 필요합니다.\"],\"no_next\":[404,\"이어지는 연강 차시가 없습니다.\"],\"concurrent\":[409,\"다른 기기 · 창에서 재생 중입니다. 동시 재생은 허용되지 않습니다.\"],\"play_over\":[409,\"끝났거나 다른 재생으로 바뀐 재생입니다.\"],\"bad_rate\":[400,\"배속은 1.0~2.0배만 허용됩니다.\"],\"bad_sub\":[400,\"자막 파일 형식이 올바르지 않습니다(VTT · SRT).\"],\"answered\":[409,\"이미 응답한 퀴즈입니다.\"],\"bad_choice\":[400,\"보기 번호가 올바르지 않습니다.\"]},\"routes\":[{\"m\":\"POST\",\"p\":\"/api/lms/g/seed\",\"roles\":\"staff\",\"stmts\":[\"seedTerm\",\"seedCourse\",\"seedPersons\",\"seedSection\",\"seedSessions\",\"seedEnroll\",\"seedRule\"],\"audit\":\"lms.g.seed\"},{\"m\":\"GET\",\"p\":\"/api/lms/g/sections\",\"stmts\":[\"sections\"]},{\"m\":\"GET\",\"p\":\"/api/lms/g/sessions\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"sessions\"]},{\"m\":\"POST\",\"p\":\"/api/lms/g/s",
        "ession\",\"params\":[[\"session_id\",\"uuid\",1],[\"starts_at\",\"ts\"],[\"ends_at\",\"ts\"],[\"open_at\",\"ts\"],[\"close_at\",\"ts\"],[\"room\",\"text\",0,60],[\"kind\",\"enum\",0,[\"class\",\"online\",\"live\",\"exam\",\"holiday\"]],[\"note\",\"text\",0,200],[\"required_sec\",\"int\",0,0,36000],[\"extra_study_sec\",\"int\",0,0,36000]],\"stmts\":[\"sessionSet\"],\"audit\":\"lms.g.session\"},{\"m\":\"POST\",\"p\":\"/api/lms/g/makeup\",\"params\":[[\"session_id\",\"uuid\",1],[\"starts_at\",\"ts\",1],[\"room\",\"text\",0,60]],\"stmts\":[\"makeup\"],\"audit\":\"lms.g.makeup\"},{\"m\":\"GET\",\"p\":\"/api/lms/g/rule\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"ruleGet\"]},{\"m\":\"POST\",\"p\":\"/api/lms/g/rule\",\"params\":[[\"section_id\",\"uuid\",1],[\"methods\",\"json\",0,400],[\"late_after_min\",\"int\",0,0,120],[\"absent_after_min\",\"int\",0,0,240],[\"online_min_pct\",\"int\",0,10,100],[\"require_identity\",\"bool\"],[\"block_concurrent\",\"bool\"],[\"hyflex_online\",\"bool\"]],\"stmts\":[\"ruleCheck\",\"ruleSet\"],\"audit\":\"lms.g.rule\"},{\"m\":\"POST\",\"p\":\"/api/lms/g/code\",\"params\":[[\"session_id\",\"uuid\",1],[\"ttl_sec\",\"int\",0,30,900,180],[\"rotate_sec\",\"int\",0,10,60,15]],\"stmts\":[\"codeIssue\"],\"audit\":\"lms.g.code\"},{\"m\":\"GET\",\"p\":\"/api/lms/g/qr\",\"params\":[[\"session_id\",\"uuid\",1]],\"stmts\":[\"qr\"]},{\"m\":\"POST\",\"p\":\"/api/lms/g/checkin\",\"limit\":[\"lmsg-ck\",60,60000],\"params\":[[\"session_id\",\"uuid\",1],[\"member_no\",\"mno\",1],[\"method\",\"enum\",1,[\"code\",\"qr\",\"nfc\",\"ble\",\"photo\"]],[\"code\",\"text\",0,12],[\"qr\",\"text\",0,200],[\"tag_id\",\"text\",0,64],[\"lat\",\"num\",0,-90,90],[\"lng\",\"num\",0,-180,180],[\"taken_at\",\"ts\"],[\"idv\",\"text\",0,200]],\"st",
        "mts\":[\"checkin\"],\"audit\":\"lms.g.checkin\"},{\"m\":\"POST\",\"p\":\"/api/lms/g/mark\",\"params\":[[\"session_id\",\"uuid\",1],[\"member_no\",\"mno\",1],[\"status\",\"enum\",1,[\"present\",\"late\",\"absent\",\"excused\"]],[\"reason\",\"text\",0,300],[\"evidence_ref\",\"text\",0,200]],\"stmts\":[\"mark\"],\"audit\":\"lms.g.mark\"},{\"m\":\"POST\",\"p\":\"/api/lms/g/adjust\",\"params\":[[\"session_id\",\"uuid\",1],[\"from\",\"enum\",1,[\"absent\",\"late\"]],[\"to\",\"enum\",1,[\"present\",\"late\",\"excused\"]],[\"reason\",\"text\",1,300]],\"stmts\":[\"adjust\"],\"audit\":\"lms.g.adjust\"},{\"m\":\"POST\",\"p\":\"/api/lms/g/copy\",\"params\":[[\"session_id\",\"uuid\",1]],\"stmts\":[\"copy\"],\"audit\":\"lms.g.copy\"},{\"m\":\"POST\",\"p\":\"/api/lms/g/online\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"online\"],\"audit\":\"lms.g.online\"},{\"m\":\"GET\",\"p\":\"/api/lms/g/roster\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"roster\"]},{\"m\":\"GET\",\"p\":\"/api/lms/g/export\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"export\"]},{\"m\":\"GET\",\"p\":\"/api/lms/g/beacons\",\"stmts\":[\"beacons\"]},{\"m\":\"POST\",\"p\":\"/api/lms/g/beacon\",\"roles\":\"staff\",\"params\":[[\"beacon_id\",\"text\",1,64],[\"kind\",\"enum\",1,[\"nfc\",\"ble\"]],[\"room\",\"text\",1,60],[\"active\",\"bool\",0,0,0,\"true\"]],\"stmts\":[\"beaconSet\"],\"audit\":\"lms.g.beacon\"},{\"m\":\"GET\",\"p\":\"/api/lms/g/anomalies\",\"params\":[[\"section_id\",\"uuid\",1]],\"stmts\":[\"anomalies\"]},{\"m\":\"GET\",\"p\":\"/api/lms/g/log\",\"params\":[[\"session_id\",\"uuid\",1]],\"stmts\":[\"log\"]}]}"));
    static final Map<String, JsonNode> ROUTES = LmsEngine.routes(SPEC);

    private final AuthService authService; private final LmsEngine engine; private final Map<String, Function<Map<String, Object>, String>> stmts = new HashMap<>();
    public LmsGServiceImpl(AuthService authService, LmsEngine engine, LmsGMapper m) {
        this.authService = authService; this.engine = engine;
        stmts.put("seedTerm", p -> first(m.seedTerm(p)));
        stmts.put("seedCourse", p -> first(m.seedCourse(p)));
        stmts.put("seedPersons", p -> first(m.seedPersons(p)));
        stmts.put("seedSection", p -> first(m.seedSection(p)));
        stmts.put("seedSessions", p -> first(m.seedSessions(p)));
        stmts.put("seedEnroll", p -> first(m.seedEnroll(p)));
        stmts.put("seedRule", p -> first(m.seedRule(p)));
        stmts.put("sections", p -> first(m.sections(p)));
        stmts.put("sessions", p -> first(m.sessions(p)));
        stmts.put("sessionSet", p -> first(m.sessionSet(p)));
        stmts.put("makeup", p -> first(m.makeup(p)));
        stmts.put("ruleGet", p -> first(m.ruleGet(p)));
        stmts.put("ruleSet", p -> first(m.ruleSet(p)));
        stmts.put("ruleCheck", p -> first(m.ruleCheck(p)));
        stmts.put("codeIssue", p -> first(m.codeIssue(p)));
        stmts.put("qr", p -> first(m.qr(p)));
        stmts.put("checkin", p -> first(m.checkin(p)));
        stmts.put("mark", p -> first(m.mark(p)));
        stmts.put("adjust", p -> first(m.adjust(p)));
        stmts.put("copy", p -> first(m.copy(p)));
        stmts.put("online", p -> first(m.online(p)));
        stmts.put("roster", p -> first(m.roster(p)));
        stmts.put("export", p -> first(m.export(p)));
        stmts.put("beacons", p -> first(m.beacons(p)));
        stmts.put("beaconSet", p -> first(m.beaconSet(p)));
        stmts.put("anomalies", p -> first(m.anomalies(p)));
        stmts.put("log", p -> first(m.log(p)));
    }

    static String first(List<String> l) { return l == null || l.isEmpty() ? null : l.get(0); }

    @Override public Object call(String route, HttpServletRequest req, byte[] body) throws Exception {
        JsonNode r = ROUTES.get(route); if (r == null) throw new DdException(404, "없는 주소입니다.", "not_found");
        return engine.run(SPEC, r, authService.need(req), req, body, stmts);
    }
}
