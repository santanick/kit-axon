package egovframework.didisam.lms.h.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdCrypto;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdProps;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.cmm.TenantTxMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.postgresql.util.PSQLException;
import org.springframework.stereotype.Component;

/**
 * v30 묶음 E · F · H 공용 — Node service/server/lms/efh_lib.js와 같은 순서로 처리한다.
 *  ① 주체 확인(staff: 운영자 세션 · learner: 학습자 포털 세션 · any: 운영자 우선) ② 본문(크기 제한) · 쿼리 ③ 기관 범위 트랜잭션에서 SQL 함수 호출
 *  ④ SQL 오류 detail 'dd:상태:코드' → {error, message} ⑤ 결과의 _audit을 audit_log에 같은 트랜잭션으로 기록
 */
@Component
public class LmsEfhGateway {
    public record Route(String fn, String who, int max) {}
    @FunctionalInterface public interface Caller { String call(String fn, String ctx, String a); }
    static final Pattern DD = Pattern.compile("^dd:(\\d{3}):([a-z_]+)$");

    private final AuthService auth; private final TenantTx tx; private final TenantTxMapper txm; private final DdWeb web; private final DdProps p; private final LmsHMapper hm;
    public LmsEfhGateway(AuthService auth, TenantTx tx, TenantTxMapper txm, DdWeb web, DdProps p, LmsHMapper hm) {
        this.auth = auth; this.tx = tx; this.txm = txm; this.web = web; this.p = p; this.hm = hm;
    }

    public JsonNode run(Route r, HttpServletRequest req, byte[] body, Caller c) throws Exception {
        if (r == null) throw new DdException(404, "없는 주소입니다.", "not_found");
        ObjectNode ctx = DdWeb.JSON.createObjectNode(); String tid; String by;
        Map<String, Object> a = null;
        if (!"learner".equals(r.who())) {
            a = auth.auth(req);
            if (a == null && "staff".equals(r.who())) throw new DdException(401, "로그인이 필요합니다.", "auth");
        }
        if (a != null) {
            tid = (String) a.get("tid"); by = (String) a.get("email");
            ctx.put("kind", "staff"); ctx.put("uid", String.valueOf(a.get("uid"))); ctx.put("email", by); ctx.put("role", (String) a.get("role")); ctx.put("ip", web.ip(req));
        } else {
            Map<String, Object> s = learner(req);
            if (s == null) throw new DdException(401, "로그인이 필요합니다.", "auth");
            tid = (String) s.get("tenant_id"); by = "learner:" + s.get("sid");
            ctx.put("kind", "learner"); ctx.put("sid", (String) s.get("sid")); ctx.put("ip", web.ip(req));
        }
        JsonNode args;
        if ("GET".equals(req.getMethod())) {
            ObjectNode q = DdWeb.JSON.createObjectNode();
            for (Map.Entry<String, String[]> e : req.getParameterMap().entrySet()) { String[] v = e.getValue(); q.put(e.getKey(), v.length == 0 ? "" : v[v.length - 1]); }
            args = q;
        } else args = DdWeb.readBody(body, r.max());
        final String ctxS = ctx.toString(), aS = args.toString(), fTid = tid, fBy = by;
        return tx.inTenant(tid, () -> {
            String out;
            try { out = c.call(r.fn(), ctxS, aS); }
            catch (RuntimeException e) { throw map(e); }
            JsonNode n = DdWeb.JSON.readTree(out);
            if (n != null && n.isObject() && n.has("_audit")) {
                JsonNode au = ((ObjectNode) n).remove("_audit");
                txm.insertAudit(fTid, fBy, au.path("a").asText(), au.get("d") == null || au.get("d").isNull() ? null : au.get("d").toString());
            }
            return n;
        });
    }

    private Map<String, Object> learner(HttpServletRequest req) throws Exception {
        String t = null; Cookie[] cs = req.getCookies();
        if (cs != null) for (Cookie k : cs) if (p.lcookieName.equals(k.getName())) t = k.getValue();
        if (t == null || t.isEmpty() || t.length() > 100) return null;
        final String id = DdCrypto.sha(t);
        return tx.plain(() -> hm.selectLearnerSession(id));
    }

    /** PostgreSQL 업무 오류(raise … detail 'dd:상태:코드') → DdException. 그 밖의 오류는 그대로(500) */
    static RuntimeException map(RuntimeException e) {
        for (Throwable x = e; x != null; x = x.getCause()) {
            if (x instanceof PSQLException pe && pe.getServerErrorMessage() != null) {
                String d = pe.getServerErrorMessage().getDetail(); Matcher m = d == null ? null : DD.matcher(d);
                if (m != null && m.matches()) return new DdException(Integer.parseInt(m.group(1)), pe.getServerErrorMessage().getMessage(), m.group(2));
                break;
            }
        }
        return e;
    }
}
