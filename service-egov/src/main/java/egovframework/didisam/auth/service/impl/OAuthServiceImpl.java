package egovframework.didisam.auth.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.OAuthService;
import egovframework.didisam.cmm.*;
import jakarta.annotation.Resource;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.StringJoiner;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

/**
 * v32.4 운영자 소셜 로그인(구글 · 카카오) — Node oauth.js와 같은 흐름 · 쿠키 · 해시(#oauth=…).
 * 제공자에게서 받는 것은 회원 번호(sub)와 제공자가 확인한 이메일뿐이다. user_oauth(provider, sub, user_id)에 저장한다.
 */
@Service("oauthService")
public class OAuthServiceImpl extends EgovAbstractServiceImpl implements OAuthService {
    static final int PEND_MIN = 15;
    @Resource(name = "propertiesService") private EgovPropertyService props;
    private final AuthMapper mapper; private final TenantTx tx; private final DdProps p; private final DdWeb web; private final DdRateLimiter rl; private final DdOAuth oa;
    private final HttpClient http = HttpClient.newBuilder().proxy(HttpClient.Builder.NO_PROXY).version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(10)).build();
    public OAuthServiceImpl(AuthMapper mapper, TenantTx tx, DdProps p, DdWeb web, DdRateLimiter rl, DdOAuth oa) { this.mapper = mapper; this.tx = tx; this.p = p; this.web = web; this.rl = rl; this.oa = oa; }

    private String sc() { return p.secure ? "__Host-dd_oauth" : "dd_oauth"; }
    private String pc() { return p.secure ? "__Host-dd_oauthp" : "dd_oauthp"; }
    private String ck(String n, String v, int age, String same) { return n + "=" + v + "; Path=/; HttpOnly; SameSite=" + same + "; Max-Age=" + age + (p.secure ? "; Secure" : ""); }
    private String cb(HttpServletRequest req, String prov) {
        String base = !oa.publicUrl.isEmpty() ? oa.publicUrl : (p.secure ? "https" : "http") + "://" + req.getHeader("host");
        return base + "/api/oauth/" + prov + "/callback";
    }
    private static String cookie(HttpServletRequest req, String n) { Cookie[] cs = req.getCookies(); if (cs == null) return ""; for (Cookie c : cs) if (n.equals(c.getName())) return c.getValue(); return ""; }
    private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }
    private static String form(Map<String, String> m) { StringJoiner j = new StringJoiner("&"); m.forEach((k, v) -> j.add(enc(k) + "=" + enc(v))); return j.toString(); }
    private static void go(HttpServletResponse res, String hash) { res.setStatus(302); res.setHeader("location", "/#oauth=" + hash); res.setHeader("cache-control", "no-store"); res.setHeader("referrer-policy", "no-referrer"); }
    private DdOAuth.Prov prov(String n) throws Exception { DdOAuth.Prov c = oa.get(n); if (c == null) throw processException("dd.404.oauth_prov"); return c; }

    private String sign(String s) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(p.pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(("oauthp|" + s).getBytes(StandardCharsets.UTF_8)));
    }
    private String seal(String prov, String sub, String email) throws Exception {
        ObjectNode o = DdWeb.JSON.createObjectNode().put("p", prov).put("s", sub).put("e", email).put("x", System.currentTimeMillis() + PEND_MIN * 60_000L);
        String s = Base64.getUrlEncoder().withoutPadding().encodeToString(DdWeb.JSON.writeValueAsBytes(o)); return s + "." + sign(s);
    }
    private JsonNode unseal(String v) {
        try {
            String[] a = String.valueOf(v).split("\\.", -1); if (a.length != 2 || a[0].isEmpty() || !DdCrypto.safeEq(a[1], sign(a[0]))) return null;
            JsonNode o = DdWeb.JSON.readTree(Base64.getUrlDecoder().decode(a[0]));
            return o != null && o.path("x").asLong(0) > System.currentTimeMillis() ? o : null;
        } catch (Exception e) { return null; }
    }
    /** 제공자 응답 → [sub, 확인된 이메일 또는 ""] (Node profileOf) */
    static String[] profileOf(String prov, JsonNode j) {
        if ("google".equals(prov)) {
            JsonNode v = j.path("email_verified"); boolean ok = (v.isBoolean() && v.asBoolean()) || (v.isTextual() && "true".equals(v.asText()));
            return new String[] { j.path("sub").isMissingNode() || j.path("sub").isNull() ? "" : j.path("sub").asText(), ok ? j.path("email").asText("").toLowerCase() : "" };
        }
        JsonNode a = j.path("kakao_account"); JsonNode valid = a.path("is_email_valid"), ver = a.path("is_email_verified");
        boolean ok = !(valid.isBoolean() && !valid.asBoolean()) && ver.isBoolean() && ver.asBoolean();
        return new String[] { j.path("id").isMissingNode() || j.path("id").isNull() ? "" : j.path("id").asText(), ok ? a.path("email").asText("").toLowerCase() : "" };
    }

    @Override public void start(String n, HttpServletRequest req, HttpServletResponse res) throws Exception {
        DdOAuth.Prov c = prov(n); rl.limit("oa:" + web.ip(req), 30, 600_000L);
        byte[] b = new byte[24]; DdCrypto.RND.nextBytes(b); String state = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        Map<String, String> q = new LinkedHashMap<>(); q.put("response_type", "code"); q.put("client_id", c.id()); q.put("redirect_uri", cb(req, n)); q.put("scope", c.scope()); q.put("state", state);
        if ("google".equals(n)) q.put("prompt", "select_account");
        res.setHeader("set-cookie", ck(sc(), state + "." + n, 600, "Lax"));
        res.setStatus(302); res.setHeader("location", c.auth() + "?" + form(q)); res.setHeader("cache-control", "no-store"); res.setHeader("referrer-policy", "no-referrer");
    }

    @Override public void callback(String n, HttpServletRequest req, HttpServletResponse res) throws Exception {
        DdOAuth.Prov c = prov(n); rl.limit("oa:" + web.ip(req), 30, 600_000L);
        String clear = ck(sc(), "", 0, "Lax");
        String[] sv = cookie(req, sc()).split("\\.", 2); String st = sv[0], sp = sv.length > 1 ? sv[1] : "";
        String state = String.valueOf(req.getParameter("state") == null ? "" : req.getParameter("state")), code = req.getParameter("code") == null ? "" : req.getParameter("code");
        if (st.isEmpty() || !n.equals(sp) || state.isEmpty() || !DdCrypto.safeEq(st, state)) { res.setHeader("set-cookie", clear); go(res, "err:state"); return; }
        if (req.getParameter("error") != null && !req.getParameter("error").isEmpty() || code.isEmpty()) { res.setHeader("set-cookie", clear); go(res, "err:denied"); return; }
        String[] pf;
        try {
            Map<String, String> f = new LinkedHashMap<>(); f.put("grant_type", "authorization_code"); f.put("client_id", c.id()); f.put("redirect_uri", cb(req, n)); f.put("code", code); if (!c.secret().isEmpty()) f.put("client_secret", c.secret());
            HttpResponse<byte[]> tr = http.send(HttpRequest.newBuilder(URI.create(c.token())).timeout(Duration.ofSeconds(10)).header("content-type", "application/x-www-form-urlencoded;charset=utf-8").header("accept", "application/json").POST(HttpRequest.BodyPublishers.ofString(form(f))).build(), HttpResponse.BodyHandlers.ofByteArray());
            JsonNode tj = DdWeb.JSON.readTree(tr.body()); String at = tj == null ? "" : tj.path("access_token").asText("");
            if (tr.statusCode() < 200 || tr.statusCode() >= 300 || at.isEmpty()) throw new IllegalStateException("token");
            HttpResponse<byte[]> mr = http.send(HttpRequest.newBuilder(URI.create(c.me())).timeout(Duration.ofSeconds(10)).header("authorization", "Bearer " + at).header("accept", "application/json").GET().build(), HttpResponse.BodyHandlers.ofByteArray());
            if (mr.statusCode() < 200 || mr.statusCode() >= 300) throw new IllegalStateException("me");
            pf = profileOf(n, DdWeb.JSON.readTree(mr.body()));
        } catch (Exception e) { res.setHeader("set-cookie", clear); go(res, "err:provider"); return; }
        String sub = pf[0], email = pf[1];
        if (sub.isEmpty() || sub.length() > 200) { res.setHeader("set-cookie", clear); go(res, "err:provider"); return; }
        Map<String, Object> u = mapper.selectOAuthUser(n, sub);
        if (u == null) {
            if (email.isEmpty() || !AuthServiceImpl.emailOk(email)) { res.setHeader("set-cookie", clear); go(res, "err:email"); return; }
            u = mapper.selectUserByEmailFull(email);
            if (u != null) {
                mapper.insertOAuth(n, sub, (String) u.get("id"));
                try { tx.audit((String) u.get("tenant_id"), (String) u.get("email"), "oauth.link", DdWeb.JSON.createObjectNode().put("provider", n).toString()); } catch (Exception ignore) { }
            }
        }
        if (u == null) {
            if (!p.allowSignup) { res.setHeader("set-cookie", clear); go(res, "err:signup_off"); return; }
            res.setHeader("set-cookie", clear); res.addHeader("set-cookie", ck(pc(), seal(n, sub, email), PEND_MIN * 60, "Strict"));
            go(res, "signup"); return;
        }
        if (!p.module.isEmpty() && !DdModule.roleAllowed(p.module, u.get("role"))) { res.setHeader("set-cookie", clear); go(res, "err:module"); return; }
        String uid = (String) u.get("id"), tid = (String) u.get("tenant_id");
        mapper.updateLastLogin(uid); mapper.deleteExpiredSessions(uid);
        newSession(res, uid, tid); res.addHeader("set-cookie", clear);
        try { tx.audit(tid, (String) u.get("email"), "login", DdWeb.JSON.createObjectNode().put("via", n).toString()); } catch (Exception ignore) { }
        go(res, "ok");
    }

    private void newSession(HttpServletResponse res, String uid, String tid) throws Exception {
        String token = DdCrypto.newToken();
        mapper.insertSession(DdCrypto.sha(token), uid, tid, Math.min(p.idleH, props.getInt("session.days") * 24));
        web.setSid(res, token);
    }

    @Override public Map<String, Object> pending(HttpServletRequest req) throws Exception {
        JsonNode o = unseal(cookie(req, pc())); if (o == null) throw processException("dd.404.oauth_pending");
        Map<String, Object> m = new LinkedHashMap<>(); m.put("provider", o.path("p").asText()); m.put("email", o.path("e").asText()); return m;
    }
    @Override public Map<String, Object> cancel(HttpServletResponse res) throws Exception { res.setHeader("set-cookie", ck(pc(), "", 0, "Strict")); return Map.of("ok", true); }

    @Override public Map<String, Object> signup(byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception {
        if (!p.allowSignup) throw processException("dd.403.signup_off");
        rl.limit("su:" + web.ip(req), props.getInt("rate.signup.max"), props.getLong("rate.signup.winMs"));
        JsonNode b = DdWeb.readBody(body, props.getInt("body.signupMax")); JsonNode o = unseal(cookie(req, pc()));
        if (o == null) throw processException("dd.404.oauth_pending");
        String name = DdWeb.str(b, "orgName").trim(), email = o.path("e").asText(), prov = o.path("p").asText(), sub = o.path("s").asText();
        if (!p.signupCode.isEmpty() && !DdCrypto.safeEq(DdWeb.str(b, "code"), p.signupCode)) throw processException("dd.403.code");
        if (name.isEmpty() || name.length() > 30) throw processException("dd.400.name");
        JsonNode t = b.get("type"); String type = t != null && t.isTextual() ? t.asText() : "";
        if (!AuthServiceImpl.TYPES.contains(type)) throw processException("dd.400.type");
        byte[] rnd = new byte[32]; DdCrypto.RND.nextBytes(rnd); String pw = DdCrypto.hashPw(Base64.getUrlEncoder().withoutPadding().encodeToString(rnd) + "a1"); String tid = DdCrypto.newTid();
        String uid;
        try {
            uid = tx.plain(() -> {
                if (mapper.countEmail(email) > 0) throw processException("dd.409.exists");
                mapper.insertTenant(tid, name, type);
                String id = mapper.insertUser(tid, email, pw, "owner");
                mapper.insertOAuthStrict(prov, sub, id);
                return id;
            });
        } catch (DuplicateKeyException e) { throw processException("dd.409.exists.oauth", e); }
        tx.audit(tid, email, "tenant.create", DdWeb.JSON.createObjectNode().put("type", type).put("via", prov).toString());
        newSession(res, uid, tid); res.addHeader("set-cookie", ck(pc(), "", 0, "Strict"));
        Map<String, Object> u = new LinkedHashMap<>(); u.put("email", email); u.put("role", "owner");
        Map<String, Object> tn = new LinkedHashMap<>(); tn.put("tid", tid); tn.put("name", name); tn.put("type", type); tn.put("mode", "saas");
        Map<String, Object> out = new LinkedHashMap<>(); out.put("user", u); out.put("tenant", tn); return out;
    }
}
