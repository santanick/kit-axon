package egovframework.didisam.ai.service;

import java.util.Map;

/** AI 게이트웨이(스튜디오 운영자) — Node app.js /api/ai/messages · /api/ai/usage 와 같은 규격 */
public interface AiService {
    Object messages(Map<String, Object> a, byte[] body) throws Exception;
    Map<String, Object> usage(Map<String, Object> a) throws Exception;
}
