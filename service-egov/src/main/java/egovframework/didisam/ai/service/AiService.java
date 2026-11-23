package egovframework.didisam.ai.service;

import java.util.Map;

/** AI 게이트웨이(스튜디오 운영자) — Node app.js /api/ai/messages · /api/ai/usage 와 같은 규격 */
public interface AiService {
    Object messages(Map<String, Object> a, byte[] body) throws Exception;
    Map<String, Object> usage(Map<String, Object> a) throws Exception;
    /** v47 AI 추가 충전(정운영자) — Node POST /api/ai/topup · /api/ai/topup/confirm */
    Map<String, Object> topup(Map<String, Object> a, byte[] body) throws Exception;
    Map<String, Object> topupConfirm(Map<String, Object> a, byte[] body) throws Exception;
    /** v47 산타 관리자(SANTA_ADMIN_EMAILS) — Node GET /api/santa/orgs · PUT /api/santa/orgs/:tid/plan */
    boolean isSanta(Map<String, Object> a);
    Map<String, Object> santaOrgs(Map<String, Object> a, String q) throws Exception;
    Map<String, Object> santaPlan(Map<String, Object> a, String tid, byte[] body) throws Exception;
}
