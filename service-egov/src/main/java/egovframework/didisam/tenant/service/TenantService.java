package egovframework.didisam.tenant.service;

import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** 기관 운영(Node app.js /api/audit · /api/learners/progress · /api/tenant/delete 와 같은 규격) */
public interface TenantService {
    Map<String, Object> audit(Map<String, Object> a) throws Exception;
    Map<String, Object> progress(Map<String, Object> a) throws Exception;
    Map<String, Object> delete(Map<String, Object> a, byte[] body, HttpServletResponse res) throws Exception;
}
