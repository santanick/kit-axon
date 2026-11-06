package egovframework.didisam.lms.p.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdCrypto;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.postgresql.util.PSQLException;
import org.springframework.stereotype.Service;

/**
 * 묶음 L · M · P 공용 실행기 — Node lms/lmp-core.js build()와 같은 순서:
 *  ① 세션 필수(401) ② 본문(64KB · 객체만) ③ 쿼리 문자열 + 본문 병합 ④ 앱 계층 보강(pre) ⑤ 기관 범위 트랜잭션에서 SQL 디스패처(lms_l · lms_m · lms_p) 호출.
 * SQL 오류 detail 'lms:상태:코드' → DdException(같은 {error, message}).
 */
@Service("lmsDispatch")
public class LmsDispatch extends EgovAbstractServiceImpl {
    public static final int BODY_MAX = 64 * 1024;
    static final Pattern DET = Pattern.compile("^lms:(\\d{3}):([a-z_]+)$");
    @FunctionalInterface public interface Caller { String call(String op, String me, String q); }
    @FunctionalInterface public interface Pre { void run(ObjectNode q, Map<String, Object> a, ObjectNode me) throws Exception; }
    private final AuthService auth; private final DdWeb web; private final TenantTx tx; private final LmsPMapper pm;
    public LmsDispatch(AuthService auth, DdWeb web, TenantTx tx, LmsPMapper pm) { this.auth = auth; this.web = web; this.tx = tx; this.pm = pm; }

    public String run(Caller c, String op, String method, byte[] body, HttpServletRequest req, Pre pre, int max) throws Exception { return run(c, op, method, body, req, pre, max, false); }
    /** learner=true: 학습자 앱 세션(learner_sessions 쿠키)으로 인증 — Node lmp-core learner()와 같음 */
    public String run(Caller c, String op, String method, byte[] body, HttpServletRequest req, Pre pre, int max, boolean learner) throws Exception { return run(c, op, method, body, req, pre, max, learner ? 1 : 0); }
    /** mode: 0 운영자 · 교수자 세션, 1 학습자 세션만, 2 둘 중 하나(운영자 세션 우선 — Node learner: 'any') */
    public String run(Caller c, String op, String method, byte[] body, HttpServletRequest req, Pre pre, int max, int mode) throws Exception {
        Map<String, Object> a = mode == 2 ? auth.auth(req) : null;
        boolean learner = mode == 1 || (mode == 2 && a == null);
        if (learner) {
            String t = web.lsidToken(req);
            Map<String, Object> r = t == null || t.length() > 100 ? null : tx.plain(() -> pm.selectLearner(DdCrypto.sha(t)));
            if (r == null) throw new DdException(401, "로그인이 필요합니다.", "auth");
            a = r;
        } else if (a == null) a = auth.need(req);
        ObjectNode q = DdWeb.JSON.createObjectNode();
        req.getParameterMap().forEach((k, v) -> { if (v.length > 0) q.put(k, v[v.length - 1]); });
        if (!"GET".equals(method)) {
            JsonNode b = DdWeb.readBody(body, max);
            if (!b.isObject()) throw new DdException(400, "형식이 올바르지 않습니다.", "bad_json");
            q.setAll((ObjectNode) b);
        }
        ObjectNode me = DdWeb.JSON.createObjectNode();
        if (learner) { me.put("learner", String.valueOf(a.get("sid"))); me.put("role", "learner"); }
        else { me.put("uid", String.valueOf(a.get("uid"))); me.put("email", String.valueOf(a.get("email"))); me.put("role", String.valueOf(a.get("role"))); }
        me.put("ip", web.ip(req)); String ua = req.getHeader("user-agent"); ua = ua == null ? "" : ua; me.put("ua", ua.length() > 300 ? ua.substring(0, 300) : ua);
        if (pre != null) pre.run(q, a, me);
        String tid = (String) a.get("tid"); String ms = me.toString(), qs = q.toString();
        String out;
        try { out = tx.inTenant(tid, () -> c.call(op, ms, qs)); }
        catch (Exception e) { throw map(e); }
        /* _status: SQL이 기록을 남기고 커밋한 뒤 돌려주는 오류(Node와 같음) */
        if (out != null && out.contains("\"_status\"")) {
            JsonNode j = DdWeb.JSON.readTree(out);
            if (j.isObject() && j.has("_status") && j.get("_status").asInt() > 0) throw new DdException(j.get("_status").asInt(), j.path("message").asText(), j.path("error").asText());
        }
        return out;
    }
    /** 학습자 포털 세션(dd_lsid) → {tid, sid}. 없으면 401 */
    public Map<String, Object> learnerOf(HttpServletRequest req) throws Exception {
        String t = web.lsidToken(req);
        Map<String, Object> r = t == null || t.length() > 100 ? null : tx.plain(() -> pm.selectLearner(DdCrypto.sha(t)));
        if (r == null) throw new DdException(401, "로그인이 필요합니다.", "auth");
        return r;
    }
    public static Exception map(Exception e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof PSQLException p) {
                String d = p.getServerErrorMessage() == null ? null : p.getServerErrorMessage().getDetail();
                Matcher m = d == null ? null : DET.matcher(d);
                if (m != null && m.matches()) return new DdException(Integer.parseInt(m.group(1)), p.getServerErrorMessage().getMessage(), m.group(2));
                if (p.getSQLState() != null && p.getSQLState().startsWith("22")) return new DdException(400, "입력 값이 올바르지 않습니다.", "bad_input");
            }
        }
        return e;
    }
}
