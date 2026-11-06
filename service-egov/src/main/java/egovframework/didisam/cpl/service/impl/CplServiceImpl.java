package egovframework.didisam.cpl.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.cmm.DdProps;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.cpl.service.CplService;
import jakarta.servlet.http.HttpServletRequest;
import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** Node compliance.js 이식. 본인확인 제공사는 계약 · 규격 확정 뒤 연결한다(미연동이면 501 provider_missing). */
@Service("cplService")
public class CplServiceImpl extends EgovAbstractServiceImpl implements CplService {
    private static final Pattern KEY_RE = Pattern.compile("[\\w-]{1,60}");
    private final CplMapper mapper; private final TenantTx tx; private final DdWeb web; private final DdRateLimiter rl; private final DdProps p;
    private final Map<String, Object[]> pending = new ConcurrentHashMap<>(); private final SecureRandom rnd = new SecureRandom();
    public CplServiceImpl(CplMapper mapper, TenantTx tx, DdWeb web, DdRateLimiter rl, DdProps p) { this.mapper = mapper; this.tx = tx; this.web = web; this.rl = rl; this.p = p; }

    private JsonNode policy(String tid) { Map<String, Object> r = mapper.selectPolicy(tid); return r == null || r.get("p") == null ? null : parse((String) r.get("p")); }
    private static boolean on(JsonNode P) { return truthy(P) && truthy(get(P, "on")); }
    private static long dayMax(JsonNode P) { if (!on(P)) return 0; double h = num(get(P, "dayMax")); return h > 0 ? (long) (Math.min(24, h) * 3600) : 0; }
    private static String ua(HttpServletRequest req) { String u = req.getHeader("user-agent"); return u == null ? null : u.length() > 160 ? u.substring(0, 160) : u; }

    @Override public void afterLogin(HttpServletRequest req, String tid, String sid, String keepHash) throws Exception {
        JsonNode P = tx.inTenant(tid, () -> { JsonNode x = policy(tid); if (on(x)) mapper.insertLog(tid, sid, "login", null, null, 0, web.ip(req), ua(req)); return x; });
        if (on(P) && truthy(get(P, "single"))) mapper.deleteOtherSessions(tid, sid, keepHash);
    }

    @Override public Map<String, Object> route(HttpServletRequest req, byte[] body, String tid, String sid) throws Exception {
        JsonNode b = DdWeb.readBody(body, 2048); String kind = S(get(b, "kind"));
        if ("beat".equals(kind)) {
            rl.limit("cplb:" + tid + ":" + sid, 40, 60_000L);
            double d = Math.floor(num(get(b, "secs"))); if (!(d >= 1 && d <= 60)) throw processException("dd.400.secs");
            int secs = (int) d; String cls = S(get(b, "cls")), item = S(get(b, "item"));
            if (!KEY_RE.matcher(cls).matches() || !KEY_RE.matcher(item).matches()) throw processException("dd.400.item");
            return tx.inTenant(tid, () -> {
                JsonNode P = policy(tid); long max = dayMax(P), s = mapper.selectToday(tid, sid); boolean over = max > 0 && s >= max;
                if (on(P) && !over) { int add = max > 0 ? (int) Math.min(secs, max - s) : secs; mapper.insertLog(tid, sid, "beat", cls, item, add, web.ip(req), null); s += add; }
                Map<String, Object> o = new LinkedHashMap<>(); o.put("today", s); o.put("max", max); o.put("over", max > 0 && s >= max); return o;
            });
        }
        if ("verify-start".equals(kind) || "verify-confirm".equals(kind)) {
            String method = S(get(b, "method")); if (!List.of("phone", "motp").contains(method)) throw processException("dd.400.method");
            rl.limit("cplv:" + tid + ":" + sid, 10, 600_000L);
            if (!p.devIdv) throw processException("dd.501.provider_missing");
            String k = tid + "|" + sid + "|" + method; Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true);
            if ("verify-start".equals(kind)) { String code = String.valueOf(100000 + rnd.nextInt(900000)); pending.put(k, new Object[] { code, System.currentTimeMillis() + 300_000L }); o.put("ttl", 300); o.put("dev_code", code); return o; }
            Object[] x = pending.get(k); if (x == null || (long) x[1] < System.currentTimeMillis() || !x[0].equals(S(get(b, "code")))) throw processException("dd.400.code");
            pending.remove(k); tx.inTenant(tid, () -> { mapper.insertLog(tid, sid, "verify-" + method, null, null, 0, web.ip(req), ua(req)); return null; }); return o;
        }
        if ("attend".equals(kind)) {
            rl.limit("cpla:" + tid + ":" + sid, 10, 600_000L);
            String cls = S(get(b, "cls")), code = S(get(b, "code"));
            return tx.inTenant(tid, () -> { JsonNode P = policy(tid); JsonNode A = on(P) ? get(P, "attend") : null;
                if (!truthy(A) || !cls.equals(S(get(A, "cls"))) || !code.equals(S(get(A, "code"))) || !(num(get(A, "exp")) > System.currentTimeMillis())) throw processException("dd.400.attend");
                if (mapper.countAttendToday(tid, sid, cls) == 0) mapper.insertLog(tid, sid, "attend", cls, null, 0, web.ip(req), ua(req)); Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); return o; });
        }
        throw processException("dd.400.kind");
    }

    @Override public Map<String, Object> summary(Map<String, Object> a) throws Exception { String tid = (String) a.get("tid"); Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", tx.inTenant(tid, () -> mapper.selectSummary(tid))); return o; }
    @Override public Map<String, Object> logs(Map<String, Object> a, String sid, String limit) throws Exception {
        String tid = (String) a.get("tid"); double l = limit == null ? 0 : num(limit); int n = (int) Math.min(2000, Math.max(1, l > 0 ? l : 200)); String s = sid == null ? "" : sid;
        Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", tx.inTenant(tid, () -> mapper.selectLogs(tid, s, n))); return o;
    }
}
