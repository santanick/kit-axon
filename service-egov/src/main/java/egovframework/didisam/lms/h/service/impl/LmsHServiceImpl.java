package egovframework.didisam.lms.h.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.h.service.impl.LmsEfhGateway;
import egovframework.didisam.lms.h.service.LmsHService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** v30 묶음 H — 업무 규칙은 SQL 함수(service/server/lms/sql)가 갖고, 여기서는 권한 · 본문 한도 · 기관 범위 트랜잭션 · 감사만 한다(Node mod-h.js와 같은 표). */
@Service("lmsHService")
public class LmsHServiceImpl extends EgovAbstractServiceImpl implements LmsHService {
    static final Map<String, LmsEfhGateway.Route> R = new LinkedHashMap<>();
    static {
        R.put("GET board", new LmsEfhGateway.Route("lms_h_board", "staff", 65536));
        R.put("POST item-save", new LmsEfhGateway.Route("lms_h_item_save", "staff", 8192));
        R.put("POST item-delete", new LmsEfhGateway.Route("lms_h_item_delete", "staff", 4096));
        R.put("POST from-syllabus", new LmsEfhGateway.Route("lms_h_from_syllabus", "staff", 4096));
        R.put("POST scores", new LmsEfhGateway.Route("lms_h_scores", "staff", 1048576));
        R.put("POST policy", new LmsEfhGateway.Route("lms_h_policy", "staff", 16384));
        R.put("POST confirm", new LmsEfhGateway.Route("lms_h_confirm", "staff", 4096));
        R.put("POST change", new LmsEfhGateway.Route("lms_h_change", "staff", 4096));
        R.put("GET history", new LmsEfhGateway.Route("lms_h_history", "staff", 65536));
        R.put("GET queue", new LmsEfhGateway.Route("lms_h_queue", "staff", 65536));
        R.put("POST queue-ack", new LmsEfhGateway.Route("lms_h_queue_ack", "staff", 65536));
        R.put("POST select", new LmsEfhGateway.Route("lms_h_select", "staff", 8192));
        R.put("POST message", new LmsEfhGateway.Route("lms_h_message", "staff", 262144));
        R.put("GET my", new LmsEfhGateway.Route("lms_h_my", "learner", 65536));
    }
    private final LmsEfhGateway gw; private final LmsHMapper mapper;
    public LmsHServiceImpl(LmsEfhGateway gw, LmsHMapper mapper) { this.gw = gw; this.mapper = mapper; }

    @Override public JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception {
        LmsEfhGateway.Route r = R.get(key);
        return gw.run(r, req, body, (fn, ctx, a) -> mapper.call(fn, ctx, a));
    }
}
