package egovframework.didisam.lms.v.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdCrypto;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdProps;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.lms.h.service.impl.LmsEfhGateway;
import egovframework.didisam.lms.h.service.impl.LmsHMapper;
import egovframework.didisam.lms.v.service.LmsVService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.postgresql.util.PSQLException;
import org.springframework.stereotype.Service;

/** v32 미디어 — 업무 규칙은 SQL 함수(sql/a1_media.sql)가 갖고, 여기서는 권한 · 본문 한도 · 기관 범위 트랜잭션 · 감사 · 스트리밍 응답만 한다(Node mod-v.js와 같은 표). */
@Service("lmsVService")
public class LmsVServiceImpl extends EgovAbstractServiceImpl implements LmsVService {
    static final Map<String, LmsEfhGateway.Route> R = new LinkedHashMap<>();
    static {
        R.put("GET settings", new LmsEfhGateway.Route("lms_v_settings", "staff", 65536));
        R.put("POST settings", new LmsEfhGateway.Route("lms_v_settings_save", "staff", 16384));
        R.put("POST create", new LmsEfhGateway.Route("lms_v_create", "staff", 16384));
        R.put("POST chunk", new LmsEfhGateway.Route("lms_v_chunk", "staff", 1500000));
        R.put("POST finish", new LmsEfhGateway.Route("lms_v_finish", "staff", 4096));
        R.put("GET list", new LmsEfhGateway.Route("lms_v_list", "staff", 65536));
        R.put("GET get", new LmsEfhGateway.Route("lms_v_get", "staff", 65536));
        R.put("POST place", new LmsEfhGateway.Route("lms_v_place", "staff", 4096));
        R.put("POST access", new LmsEfhGateway.Route("lms_v_access", "staff", 16384));
        R.put("POST rotate", new LmsEfhGateway.Route("lms_v_rotate", "staff", 4096));
        R.put("POST delete", new LmsEfhGateway.Route("lms_v_delete", "staff", 4096));
        R.put("GET log", new LmsEfhGateway.Route("lms_v_log", "staff", 65536));
        R.put("GET url", new LmsEfhGateway.Route("lms_v_url", "any", 65536));
        R.put("POST stt", new LmsEfhGateway.Route("lms_v_stt", "staff", 4096));
        R.put("GET captions", new LmsEfhGateway.Route("lms_v_caps", "staff", 65536));
        R.put("POST caption", new LmsEfhGateway.Route("lms_v_cap_save", "staff", 400000));
        R.put("POST caption-publish", new LmsEfhGateway.Route("lms_v_cap_publish", "staff", 4096));
    }
    static final Pattern TID = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    static final Pattern DD = Pattern.compile("^dd:(\\d{3}):([a-z_]+)$");
    private final LmsEfhGateway gw; private final LmsVMapper mapper; private final LmsHMapper hm; private final AuthService auth; private final TenantTx tx;
    private final DdWeb web; private final DdProps p; private final DdRateLimiter rl; private final LmsVStore store; private final LmsVWorker worker;
    public LmsVServiceImpl(LmsEfhGateway gw, LmsVMapper mapper, LmsHMapper hm, AuthService auth, TenantTx tx, DdWeb web, DdProps p, DdRateLimiter rl, LmsVStore store, LmsVWorker worker) {
        this.gw = gw; this.mapper = mapper; this.hm = hm; this.auth = auth; this.tx = tx; this.web = web; this.p = p; this.rl = rl; this.store = store; this.worker = worker;
    }

    @Override public JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception {
        LmsEfhGateway.Route r = R.get(key);
        JsonNode out = gw.run(r, req, body, (fn, ctx, a) -> mapper.call(fn, ctx, a));
        if ("POST delete".equals(key) && out != null && !"db".equals(out.path("store").asText("db"))) { Map<String, Object> a = auth.auth(req); if (a != null) store.drop((String) a.get("tid"), out.path("media_id").asText()); }
        if ("POST finish".equals(key) || "POST stt".equals(key)) worker.kick();
        return out;
    }

    @Override public void hls(HttpServletRequest req, HttpServletResponse res) throws Exception {
        String t = req.getParameter("t"); if (t == null || !TID.matcher(t).matches()) throw new DdException(403, "재생 주소가 올바르지 않습니다.", "bad_sig");
        String ipRaw = web.ip(req); String ip = ipRaw.startsWith("::ffff:") ? ipRaw.substring(7) : ipRaw;
        rl.limit("lmsv-hls:" + ip, 6000, 60000);
        ObjectNode c = DdWeb.JSON.createObjectNode(); c.put("kind", "none");
        Map<String, Object> a = auth.auth(req);
        if (a != null && t.equals(a.get("tid"))) { c.put("kind", "staff"); c.put("uid", String.valueOf(a.get("uid"))); c.put("email", (String) a.get("email")); c.put("role", (String) a.get("role")); }
        if ("none".equals(c.path("kind").asText())) {
            String tk = null; Cookie[] cs = req.getCookies(); if (cs != null) for (Cookie k : cs) if (p.lcookieName.equals(k.getName())) tk = k.getValue();
            if (tk != null && !tk.isEmpty() && tk.length() <= 100) { final String id = DdCrypto.sha(tk); Map<String, Object> s = tx.plain(() -> hm.selectLearnerSession(id)); if (s != null && t.equals(s.get("tenant_id"))) { c.put("kind", "learner"); c.put("sid", (String) s.get("sid")); } }
        }
        c.put("ip", ip); String ref = refHost(req); if (ref == null) c.putNull("ref"); else c.put("ref", ref);
        ObjectNode q = DdWeb.JSON.createObjectNode(); q.put("t", t);
        for (String k : new String[] { "m", "e", "s", "f" }) { String v = req.getParameter(k); q.put(k, v == null ? "" : v); }
        final String cS = c.toString(), qS = q.toString();
        Object[] out = tx.inTenant(t, () -> {
            String s; try { s = mapper.call("lms_v_hls", cS, qS); } catch (RuntimeException e) { throw map(e); }
            JsonNode x = DdWeb.JSON.readTree(s); byte[] b = null;
            if ("obj".equals(x.path("kind").asText())) b = store.get(t, x.path("media_id").asText(), x.path("path").asText(), x.path("store").asText());
            return new Object[] { x, b };
        });
        JsonNode x = (JsonNode) out[0]; byte[] b = out[1] != null ? (byte[]) out[1] : x.path("body").asText("").getBytes(StandardCharsets.UTF_8);
        res.setStatus(200); res.setHeader("content-type", x.path("mime").asText()); res.setHeader("cache-control", x.path("cache").asText());
        res.setHeader("x-content-type-options", "nosniff"); res.setHeader("access-control-allow-origin", "*"); res.setHeader("cross-origin-resource-policy", "cross-origin"); res.setHeader("x-media-origin", "didisam");
        res.setContentLength(b.length); res.getOutputStream().write(b);
    }
    static String refHost(HttpServletRequest req) {
        for (String h : new String[] { req.getHeader("origin"), req.getHeader("referer") }) {
            if (h == null || h.isEmpty()) continue;
            try { URI u = URI.create(h); if (u.getHost() == null) continue; return (u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : "")).toLowerCase(); } catch (Exception ignore) { }
        }
        return null;
    }
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
