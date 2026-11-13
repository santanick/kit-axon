package egovframework.didisam.ledger.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** v41 통합 수납 원장 — Node service/server/ledger와 같은 /api(09 규격 3절) */
public interface LedgerService {
    @FunctionalInterface interface LAuth { Map<String, Object> get() throws Exception; }
    /** /api/pub/{tid}/ledger-* — key = "{메서드} {act}" */
    Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception;
    /** /api/ledger/* — op는 경로 이름(예: "POST refunds/confirm"), id는 경로의 :id */
    Object admin(HttpServletRequest req, HttpServletResponse res, String op, String id, byte[] body) throws Exception;
}
