package egovframework.didisam.lms.b.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.cmm.TenantTxMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.SQLException;
import java.util.Map;
import java.util.function.BiFunction;
import org.springframework.stereotype.Component;

/**
 * 묶음 B · C · D 공용 처리(Node lms/mod-b.js bundle()과 같은 순서):
 *  세션 확인 → 대학 기관 확인 → 운영자 전용 확인 → 인자(쿼리 + 본문, 본문 우선) → 기관 트랜잭션에서 lms_{묶음}_api 호출 → 변경 동작 감사 기록.
 *  업무 규칙 · 응답 JSON은 SQL 함수가 만든다(service/server/lms/sql/20_b · 25_c · 28_d.sql) → Node와 같은 JSON.
 *  SQL 업무 오류(SQLSTATE DDnnn, hint = 오류 코드)는 DdException으로 바꾼다.
 */
@Component
public class LmsBcdCore {
    /** 경로 정의: 메서드 · 본문 최대 바이트 · 운영자 전용 */
    public record Route(String method, int max, boolean adm) {
        public static Route get() { return new Route("GET", 65536, false); }
        public static Route post() { return new Route("POST", 65536, false); }
        public static Route post(int max) { return new Route("POST", max, false); }
        public static Route post(int max, boolean adm) { return new Route("POST", max, adm); }
    }
    private final TenantTx tx; private final TenantTxMapper txm;
    public LmsBcdCore(TenantTx tx, TenantTxMapper txm) { this.tx = tx; this.txm = txm; }

    public JsonNode handle(Map<String, Object> a, String bundle, String op, Route rt, HttpServletRequest req, byte[] body, BiFunction<String, String[], String> api) throws Exception {
        if (!"univ".equals(a.get("type"))) throw new DdException(403, "학사 LMS(대학) 기관에서만 쓸 수 있습니다.", "lms_edition");
        if (rt.adm() && !("owner".equals(a.get("role")) || "sub".equals(a.get("role")))) throw new DdException(403, "정 · 부운영자만 할 수 있습니다.", "role");
        ObjectNode args = JsonNodeFactory.instance.objectNode();
        req.getParameterMap().forEach((k, v) -> { if (v != null && v.length > 0) args.put(k, v[v.length - 1]); });
        if (!"GET".equals(rt.method())) {
            JsonNode b = DdWeb.readBody(body, rt.max());
            if (!b.isObject()) throw new DdException(400, "형식이 올바르지 않습니다.", "bad_json");
            args.setAll((ObjectNode) b);
        }
        ObjectNode actor = JsonNodeFactory.instance.objectNode();
        actor.put("uid", String.valueOf(a.get("uid"))); actor.put("email", String.valueOf(a.get("email"))); actor.put("role", String.valueOf(a.get("role")));
        String tid = (String) a.get("tid");
        try {
            return tx.inTenant(tid, () -> {
                String out = api.apply(op, new String[]{ args.toString(), actor.toString() });
                JsonNode r = out == null ? null : DdWeb.JSON.readTree(out);
                if (!"GET".equals(rt.method())) {
                    ObjectNode d = JsonNodeFactory.instance.objectNode();
                    JsonNode sec = args.get("section"); d.set("section", truthy(sec) ? sec : null);
                    JsonNode rid = r != null && r.isObject() ? r.get("id") : null; JsonNode aid = args.get("id");
                    d.set("id", truthy(rid) ? rid : truthy(aid) ? aid : null);
                    JsonNode as = args.get("as"); d.set("as", truthy(as) ? as : null);
                    txm.insertAudit(tid, String.valueOf(a.get("email")), "lms." + bundle + "." + op, d.toString());
                }
                return r;
            });
        } catch (Exception e) {
            for (Throwable t = e; t != null; t = t.getCause()) {
                if (t instanceof org.postgresql.util.PSQLException pe && pe.getSQLState() != null && pe.getSQLState().matches("DD\\d{3}")) {
                    var sm = pe.getServerErrorMessage();
                    throw new DdException(Integer.parseInt(pe.getSQLState().substring(2)), sm != null ? sm.getMessage() : pe.getMessage(), sm != null && sm.getHint() != null ? sm.getHint() : "error");
                }
                if (t instanceof SQLException && t.getCause() == t) break;
            }
            throw e;
        }
    }
    /** JS 참 값(null · "" · 0 · false가 아님) */
    static boolean truthy(JsonNode v) {
        if (v == null || v.isNull()) return false;
        if (v.isTextual()) return !v.asText().isEmpty();
        if (v.isNumber()) return v.asDouble() != 0;
        if (v.isBoolean()) return v.asBoolean();
        return true;
    }
}
