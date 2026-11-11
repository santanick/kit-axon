package egovframework.didisam.cmm;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.springframework.stereotype.Component;

/** 요청 도우미: 클라이언트 IP(신뢰 프록시 수만큼 오른쪽에서), 세션 쿠키 */
@Component
public class DdWeb {
    public static final int SESSION_DAYS = 14;
    private final DdProps p;
    public DdWeb(DdProps p) { this.p = p; }

    public String ip(HttpServletRequest req) {
        String xf = req.getHeader("x-forwarded-for");
        List<String> L = xf == null ? List.of() : Arrays.stream(xf.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        String v = p.hops > 0 && L.size() >= p.hops ? L.get(L.size() - p.hops) : "";
        return !v.isEmpty() ? v : String.valueOf(req.getRemoteAddr());
    }
    public String sidToken(HttpServletRequest req) {
        Cookie[] cs = req.getCookies(); if (cs == null) return null;
        for (Cookie c : cs) if (p.cookieName.equals(c.getName())) return c.getValue();
        return null;
    }
    public void setSid(HttpServletResponse res, String token) {
        res.setHeader("set-cookie", p.cookieName + "=" + token + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + (SESSION_DAYS * 86400) + (p.secure ? "; Secure" : ""));
    }
    public void clearSid(HttpServletResponse res) {
        res.setHeader("set-cookie", p.cookieName + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" + (p.secure ? "; Secure" : ""));
    }

    /* ── 학습자 포털 세션(30일) ── */
    public static final int LSESSION_DAYS = 30;
    public String lsidToken(HttpServletRequest req) {
        Cookie[] cs = req.getCookies(); if (cs == null) return null;
        for (Cookie c : cs) if (p.lcookieName.equals(c.getName())) return c.getValue();
        return null;
    }
    public void setLsid(HttpServletResponse res, String token) { setLsid(res, token, true); }
    /** v38 keep=false(공용 PC · '이 기기에서 로그인 유지' 끔): 브라우저를 닫으면 끝나는 쿠키(Node app.js와 같음) */
    public void setLsid(HttpServletResponse res, String token, boolean keep) {
        res.setHeader("set-cookie", p.lcookieName + "=" + token + "; Path=/; HttpOnly; SameSite=Strict" + (keep ? "; Max-Age=" + (LSESSION_DAYS * 86400) : "") + (p.secure ? "; Secure" : ""));
    }
    public void clearLsid(HttpServletResponse res) {
        res.setHeader("set-cookie", p.lcookieName + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" + (p.secure ? "; Secure" : ""));
    }

    public static final ObjectMapper JSON = new ObjectMapper();
    /** Node readBody와 같음: 크기 초과 413, 빈 본문 {}, 깨진 JSON 400 */
    public static JsonNode readBody(byte[] body, int max) {
        if (body == null || body.length == 0) return JsonNodeFactory.instance.objectNode();
        if (body.length > max) throw new DdException(413, "요청이 너무 큽니다.", "too_large");
        try { JsonNode n = JSON.readTree(body); return n == null ? JsonNodeFactory.instance.objectNode() : n; }
        catch (Exception e) { throw new DdException(400, "형식이 올바르지 않습니다.", "bad_json"); }
    }
    /** JS String(v || '') 와 같은 변환 */
    public static String str(JsonNode b, String k) {
        JsonNode v = b == null ? null : b.get(k);
        if (v == null || v.isNull() || (v.isTextual() && v.asText().isEmpty()) || (v.isBoolean() && !v.asBoolean()) || (v.isNumber() && v.asDouble() == 0)) return "";
        return v.isValueNode() ? v.asText() : v.toString();
    }
}
