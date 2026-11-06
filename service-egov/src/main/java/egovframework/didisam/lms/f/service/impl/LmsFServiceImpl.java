package egovframework.didisam.lms.f.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.h.service.impl.LmsEfhGateway;
import egovframework.didisam.lms.f.service.LmsFService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** v30 묶음 F — 업무 규칙은 SQL 함수(service/server/lms/sql)가 갖고, 여기서는 권한 · 본문 한도 · 기관 범위 트랜잭션 · 감사만 한다(Node mod-f.js와 같은 표). */
@Service("lmsFService")
public class LmsFServiceImpl extends EgovAbstractServiceImpl implements LmsFService {
    static final Map<String, LmsEfhGateway.Route> R = new LinkedHashMap<>();
    static {
        R.put("GET banks", new LmsEfhGateway.Route("lms_f_banks", "staff", 65536));
        R.put("POST bank-save", new LmsEfhGateway.Route("lms_f_bank_save", "staff", 8192));
        R.put("GET questions", new LmsEfhGateway.Route("lms_f_questions", "staff", 65536));
        R.put("POST q-save", new LmsEfhGateway.Route("lms_f_q_save", "staff", 65536));
        R.put("POST q-delete", new LmsEfhGateway.Route("lms_f_q_delete", "staff", 4096));
        R.put("POST q-copy", new LmsEfhGateway.Route("lms_f_q_copy", "staff", 65536));
        R.put("POST classify", new LmsEfhGateway.Route("lms_f_classify", "staff", 4096));
        R.put("GET exams", new LmsEfhGateway.Route("lms_f_exams", "staff", 65536));
        R.put("POST exam-save", new LmsEfhGateway.Route("lms_f_exam_save", "staff", 65536));
        R.put("GET attempts", new LmsEfhGateway.Route("lms_f_attempts", "staff", 65536));
        R.put("GET attempt", new LmsEfhGateway.Route("lms_f_attempt", "staff", 65536));
        R.put("POST mark", new LmsEfhGateway.Route("lms_f_mark", "staff", 16384));
        R.put("GET stats", new LmsEfhGateway.Route("lms_f_stats", "staff", 65536));
        R.put("GET my", new LmsEfhGateway.Route("lms_f_my", "learner", 65536));
        R.put("POST precheck", new LmsEfhGateway.Route("lms_f_precheck", "learner", 4096));
        R.put("POST start", new LmsEfhGateway.Route("lms_f_start", "learner", 4096));
        R.put("POST answer", new LmsEfhGateway.Route("lms_f_answer", "learner", 262144));
        R.put("POST submit", new LmsEfhGateway.Route("lms_f_submit", "learner", 262144));
        R.put("GET result", new LmsEfhGateway.Route("lms_f_result", "learner", 65536));
        R.put("POST retry", new LmsEfhGateway.Route("lms_f_retry", "learner", 65536));
        R.put("GET settings", new LmsEfhGateway.Route("lms_f_settings", "staff", 65536));
        R.put("POST settings", new LmsEfhGateway.Route("lms_f_settings_save", "staff", 4096));
        R.put("POST ip-mask", new LmsEfhGateway.Route("lms_f_ip_mask", "staff", 4096));
        /* x3 · SFR-089 웹 시험 감독(sql/a3_integrity.sql) — Node mod-f.js와 같은 표 */
        R.put("GET proctor", new LmsEfhGateway.Route("lms_f_proctor", "learner", 65536));
        R.put("POST proctor-begin", new LmsEfhGateway.Route("lms_f_proctor_begin", "learner", 8192));
        R.put("POST proctor-event", new LmsEfhGateway.Route("lms_f_proctor_event", "learner", 65536));
        R.put("POST proctor-snap", new LmsEfhGateway.Route("lms_f_proctor_snap", "learner", 300000));
        R.put("GET proctor-cfg", new LmsEfhGateway.Route("lms_f_proctor_cfg", "staff", 65536));
        R.put("POST proctor-cfg", new LmsEfhGateway.Route("lms_f_proctor_cfg_save", "staff", 4096));
        R.put("GET proctor-review", new LmsEfhGateway.Route("lms_f_proctor_review", "staff", 65536));
        R.put("GET proctor-timeline", new LmsEfhGateway.Route("lms_f_proctor_timeline", "staff", 65536));
        R.put("GET proctor-photo", new LmsEfhGateway.Route("lms_f_proctor_photo", "staff", 65536));
        R.put("POST proctor-decide", new LmsEfhGateway.Route("lms_f_proctor_decide", "staff", 4096));
        R.put("GET proctor-views", new LmsEfhGateway.Route("lms_f_proctor_views", "staff", 65536));
        R.put("GET proctor-settings", new LmsEfhGateway.Route("lms_f_proctor_settings", "staff", 65536));
        R.put("POST proctor-settings", new LmsEfhGateway.Route("lms_f_proctor_settings_save", "staff", 4096));
        R.put("POST proctor-purge", new LmsEfhGateway.Route("lms_f_proctor_purge", "staff", 4096));
    }
    private final LmsEfhGateway gw; private final LmsFMapper mapper;
    public LmsFServiceImpl(LmsEfhGateway gw, LmsFMapper mapper) { this.gw = gw; this.mapper = mapper; }

    @Override public JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception {
        LmsEfhGateway.Route r = R.get(key);
        return gw.run(r, req, body, (fn, ctx, a) -> mapper.call(fn, ctx, a));
    }
}
