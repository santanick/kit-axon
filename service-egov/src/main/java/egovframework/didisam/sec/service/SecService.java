package egovframework.didisam.sec.service;

import jakarta.servlet.http.HttpServletRequest;

/** 가디언(보안봇) Phase 0 — Node security.js와 같은 /api/security/* 규격 · 긴급 차단 실행 지점 */
public interface SecService {
    /** 긴급 차단 상태(실제 적용 중인 live 기록만, 5초 캐시) */
    record Kill(boolean key, boolean feature, boolean egress) { }
    Object route(String method, String path, HttpServletRequest req, byte[] body) throws Exception;
    Kill gate(String tid);
    /** AI 호출 전: 키 비활성 403 sec_key_off · egress 차단 403 sec_egress */
    void preAi(Kill k);
    /** 호출 수 증가 뒤: 기능 끄기면 SECURITY_FEATURE_MIN(기본 0)회 초과 시 429 sec_feature_off */
    void postAi(Kill k, long calls);
    boolean keyBlocked(String tid);
    boolean egressBlocked(String tid);
    int tick() throws Exception;
}
