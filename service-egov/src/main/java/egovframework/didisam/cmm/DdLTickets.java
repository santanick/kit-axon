package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * QA7 학습자 소셜 가입 · 승인 대기 서명 쿠키 — Node loauth.js sealer · createTickets와 같은 형식(base64url(JSON).HMAC(pepper, 태그|본문)).
 *  - 가입 보류 dd_lsns(15분, 기관 · 제공자 · sub 해시) · 승인 대기 표 dd_lpend(30일, 기관 · 가명 learner_id) · 상태 논스 dd_lnonce(10분)
 *  내용은 비밀이 아닌 값만 담는다. 운영(COOKIE_SECURE)은 __Host- 접두어.
 */
@Component
public class DdLTickets {
    private final DdProps p;
    public DdLTickets(DdProps p) { this.p = p; }

    private String sign(String tag, String s) {
        try { Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(p.pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal((tag + "|" + s).getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    public String seal(String tag, ObjectNode o) {
        try { String s = Base64.getUrlEncoder().withoutPadding().encodeToString(DdWeb.JSON.writeValueAsBytes(o)); return s + "." + sign(tag, s); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    public JsonNode open(String tag, String v) {
        try {
            String[] a = String.valueOf(v == null ? "" : v).split("\\.", -1); if (a.length < 2 || a[0].isEmpty() || a[1].isEmpty() || !DdCrypto.safeEq(a[1], sign(tag, a[0]))) return null;
            JsonNode o = DdWeb.JSON.readTree(Base64.getUrlDecoder().decode(a[0]));
            return o != null && o.isObject() && o.path("x").asLong(0) > System.currentTimeMillis() ? o : null;
        } catch (Exception e) { return null; }
    }
    public static String cookie(HttpServletRequest req, String n) { Cookie[] cs = req.getCookies(); if (cs == null) return ""; for (Cookie c : cs) if (n.equals(c.getName())) return c.getValue(); return ""; }
    public String ck(String n, String v, int age) { return n + "=" + v + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + age + (p.secure ? "; Secure" : ""); }
    public String sn() { return p.secure ? "__Host-dd_lsns" : "dd_lsns"; }
    public String pn() { return p.secure ? "__Host-dd_lpend" : "dd_lpend"; }
    public String nn() { return p.secure ? "__Host-dd_lnonce" : "dd_lnonce"; }

    /** 소셜 가입 보류(15분) */
    public void snsSet(HttpServletResponse res, String tid, String prov, String h) { ObjectNode o = DdWeb.JSON.createObjectNode().put("t", tid).put("p", prov).put("h", h).put("x", System.currentTimeMillis() + 15 * 60_000L); res.addHeader("set-cookie", ck(sn(), seal("lsns", o), 900)); }
    public JsonNode snsGet(HttpServletRequest req, String tid) { JsonNode o = open("lsns", cookie(req, sn())); return o != null && tid.equals(o.path("t").asText()) ? o : null; }
    public void snsClear(HttpServletResponse res) { res.addHeader("set-cookie", ck(sn(), "", 0)); }
    /** 승인 대기 표(30일) */
    public void pendSet(HttpServletResponse res, String tid, String lid) { ObjectNode o = DdWeb.JSON.createObjectNode().put("t", tid).put("l", lid).put("x", System.currentTimeMillis() + 30L * 86_400_000L); res.addHeader("set-cookie", ck(pn(), seal("lpend", o), 30 * 86400)); }
    public JsonNode pendGet(HttpServletRequest req, String tid) { JsonNode o = open("lpend", cookie(req, pn())); return o != null && tid.equals(o.path("t").asText()) ? o : null; }
    public void pendClear(HttpServletResponse res) { res.addHeader("set-cookie", ck(pn(), "", 0)); }
}
