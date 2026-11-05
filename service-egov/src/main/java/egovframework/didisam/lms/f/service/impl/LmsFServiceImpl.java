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
    }
    private final LmsEfhGateway gw; private final LmsFMapper mapper;
    public LmsFServiceImpl(LmsEfhGateway gw, LmsFMapper mapper) { this.gw = gw; this.mapper = mapper; }

    @Override public JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception {
        LmsEfhGateway.Route r = R.get(key);
        return gw.run(r, req, body, (fn, ctx, a) -> mapper.call(fn, ctx, a));
    }
}
