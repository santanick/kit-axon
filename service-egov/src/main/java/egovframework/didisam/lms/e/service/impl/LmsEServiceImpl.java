package egovframework.didisam.lms.e.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.h.service.impl.LmsEfhGateway;
import egovframework.didisam.lms.e.service.LmsEService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** v30 묶음 E — 업무 규칙은 SQL 함수(service/server/lms/sql)가 갖고, 여기서는 권한 · 본문 한도 · 기관 범위 트랜잭션 · 감사만 한다(Node mod-e.js와 같은 표). */
@Service("lmsEService")
public class LmsEServiceImpl extends EgovAbstractServiceImpl implements LmsEService {
    static final Map<String, LmsEfhGateway.Route> R = new LinkedHashMap<>();
    static {
        R.put("GET sections", new LmsEfhGateway.Route("lms_e_sections", "staff", 65536));
        R.put("GET list", new LmsEfhGateway.Route("lms_e_list", "staff", 65536));
        R.put("POST save", new LmsEfhGateway.Route("lms_e_save", "staff", 65536));
        R.put("POST delete", new LmsEfhGateway.Route("lms_e_delete", "staff", 4096));
        R.put("GET status", new LmsEfhGateway.Route("lms_e_status", "staff", 65536));
        R.put("GET sub", new LmsEfhGateway.Route("lms_e_sub", "staff", 65536));
        R.put("POST grade", new LmsEfhGateway.Route("lms_e_grade", "staff", 65536));
        R.put("POST bulk-feedback", new LmsEfhGateway.Route("lms_e_bulk_feedback", "staff", 65536));
        R.put("GET bundle", new LmsEfhGateway.Route("lms_e_bundle", "staff", 65536));
        R.put("GET rubrics", new LmsEfhGateway.Route("lms_e_rubrics", "staff", 65536));
        R.put("POST rubric-save", new LmsEfhGateway.Route("lms_e_rubric_save", "staff", 65536));
        R.put("POST teams", new LmsEfhGateway.Route("lms_e_teams", "staff", 65536));
        R.put("POST plag-run", new LmsEfhGateway.Route("lms_e_plag_run", "staff", 4096));
        R.put("GET plag", new LmsEfhGateway.Route("lms_e_plag", "staff", 65536));
        R.put("POST file", new LmsEfhGateway.Route("lms_e_file_put", "any", 3145728));
        R.put("GET file", new LmsEfhGateway.Route("lms_e_file_get", "any", 65536));
        R.put("GET my", new LmsEfhGateway.Route("lms_e_my", "learner", 65536));
        R.put("POST draft", new LmsEfhGateway.Route("lms_e_draft", "learner", 1048576));
        R.put("POST submit", new LmsEfhGateway.Route("lms_e_submit", "learner", 4096));
        R.put("GET versions", new LmsEfhGateway.Route("lms_e_versions", "any", 65536));
        R.put("POST restore", new LmsEfhGateway.Route("lms_e_restore", "learner", 4096));
    }
    private final LmsEfhGateway gw; private final LmsEMapper mapper;
    public LmsEServiceImpl(LmsEfhGateway gw, LmsEMapper mapper) { this.gw = gw; this.mapper = mapper; }

    @Override public JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception {
        LmsEfhGateway.Route r = R.get(key);
        return gw.run(r, req, body, (fn, ctx, a) -> mapper.call(fn, ctx, a));
    }
}
