package egovframework.didisam.auth.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service("authService")
public class AuthServiceImpl extends EgovAbstractServiceImpl implements AuthService {
    static final List<String> TYPES = List.of("corp", "univ", "public", "k12", "adult", "lifelong", "voc");
    static final List<String> MODELS = List.of("claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5");
    static final Pattern EMAIL = Pattern.compile("^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]{2,}$");
    static final Pattern HAS_ALPHA = Pattern.compile("[a-zA-Z]"), HAS_DIGIT = Pattern.compile("\\d");

    @Resource(name = "propertiesService") private EgovPropertyService props;
    private final AuthMapper mapper; private final TenantTx tx; private final DdProps p; private final DdWeb web; private final DdRateLimiter rl;
    public AuthServiceImpl(AuthMapper mapper, TenantTx tx, DdProps p, DdWeb web, DdRateLimiter rl) { this.mapper = mapper; this.tx = tx; this.p = p; this.web = web; this.rl = rl; }

    static boolean emailOk(String e) { return e.length() <= 120 && EMAIL.matcher(e).matches(); }
    static boolean pwOk(JsonNode v) {
        if (v == null || !v.isTextual()) return false; String s = v.asText();
        return s.length() >= 10 && s.length() <= 200 && HAS_ALPHA.matcher(s).find() && HAS_DIGIT.matcher(s).find();
    }

    @Override public Map<String, Object> config() throws Exception {
        mapper.ping();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("live", true); if (!p.module.isEmpty()) m.put("module", p.module); m.put("signup", p.allowSignup && (p.module.isEmpty() || "admin".equals(p.module))); m.put("signupCode", !p.signupCode.isEmpty());
        m.put("ai", p.ai); m.put("models", MODELS); m.put("aiDaily", p.aiDaily);
        return m;
    }

    private void newSession(HttpServletResponse res, String uid, String tid) throws Exception {
        String token = DdCrypto.newToken();
        mapper.insertSession(DdCrypto.sha(token), uid, tid, Math.min(p.idleH, props.getInt("session.days") * 24));
        web.setSid(res, token);
    }

    @Override public Map<String, Object> signup(byte[] body, HttpServletRequest req, HttpServletResponse res) throws Exception {
        if (!p.allowSignup) throw processException("dd.403.signup_off");
        rl.limit("su:" + web.ip(req), props.getInt("rate.signup.max"), props.getLong("rate.signup.winMs"));
        JsonNode b = DdWeb.readBody(body, props.getInt("body.signupMax")); /* Node와 같은 순서: 시도 제한 → 본문 해석 */
        String email = DdWeb.str(b, "email").trim().toLowerCase(); String name = DdWeb.str(b, "orgName").trim();
        if (!p.signupCode.isEmpty() && !DdCrypto.safeEq(DdWeb.str(b, "code"), p.signupCode)) throw processException("dd.403.code");
        if (!emailOk(email)) throw processException("dd.400.email");
        if (!pwOk(b.get("password"))) throw processException("dd.400.password");
        if (name.isEmpty() || name.length() > 30) throw processException("dd.400.name");
        JsonNode t = b.get("type"); String type = t != null && t.isTextual() ? t.asText() : "";
        if (!TYPES.contains(type)) throw processException("dd.400.type");
        String pw = DdCrypto.hashPw(b.get("password").asText()); String tid = DdCrypto.newTid();
        String uid;
        try {
            uid = tx.plain(() -> {
                if (mapper.countEmail(email) > 0) throw processException("dd.409.exists");
                mapper.insertTenant(tid, name, type);
                return mapper.insertUser(tid, email, pw, "owner");
            });
        } catch (DuplicateKeyException e) { throw processException("dd.409.exists", e); }
        tx.audit(tid, email, "tenant.create", "{\"type\":\"" + type + "\"}");
        newSession(res, uid, tid);
        Map<String, Object> u = new LinkedHashMap<>(); u.put("email", email); u.put("role", "owner");
        Map<String, Object> tn = new LinkedHashMap<>(); tn.put("tid", tid); tn.put("name", name); tn.put("type", type); tn.put("mode", "saas");
        Map<String, Object> out = new LinkedHashMap<>(); out.put("user", u); out.put("tenant", tn);
        return out;
    }

    @Override public Map<String, Object> login(JsonNode b, HttpServletRequest req, HttpServletResponse res) throws Exception {
        String email = DdWeb.str(b, "email").trim().toLowerCase();
        long win = props.getLong("rate.login.winMs");
        rl.limit("li:" + web.ip(req), props.getInt("rate.loginIp.max"), win); rl.limit("le:" + email, props.getInt("rate.loginEmail.max"), win);
        Map<String, Object> u = mapper.selectUserByEmail(email);
        boolean ok = DdCrypto.checkPw(DdWeb.str(b, "password"), u != null ? (String) u.get("pw") : DdCrypto.DUMMY);
        if (u == null || !ok) {
            if (u != null) {
                String masked = web.ip(req).replaceAll("\\d+$", "x");
                try { tx.audit((String) u.get("tenant_id"), email, "login.fail", DdWeb.JSON.createObjectNode().put("ip", masked).toString()); } catch (Exception ignore) {}
            }
            throw processException("dd.401.login");
        }
        String uid = (String) u.get("id"), tid = (String) u.get("tenant_id");
        if (!p.module.isEmpty() && !DdModule.roleAllowed(p.module, u.get("role"))) throw processException("dd.403.module");
        mapper.updateLastLogin(uid); mapper.deleteExpiredSessions(uid);
        newSession(res, uid, tid);
        tx.audit(tid, email, "login", null);
        return meOut(mapper.selectMe(uid, email));
    }

    @Override public Map<String, Object> logout(HttpServletRequest req, HttpServletResponse res) throws Exception {
        String t = web.sidToken(req); if (t != null) mapper.deleteSession(DdCrypto.sha(t));
        web.clearSid(res); return Map.of("ok", true);
    }

    @Override public Map<String, Object> auth(HttpServletRequest req) throws Exception {
        String t = web.sidToken(req); if (t == null || t.isEmpty() || t.length() > 100) return null;
        Map<String, Object> a = mapper.selectAuth(DdCrypto.sha(t), Math.max(0, p.idleH - 1), props.getInt("session.days"));
        if (a != null && !p.module.isEmpty() && !DdModule.roleAllowed(p.module, a.get("role"))) return null;
        if (a != null && Boolean.TRUE.equals(a.get("slide"))) mapper.slideSession((String) a.get("sid"), props.getInt("session.days"), p.idleH);
        return a;
    }
    @Override public Map<String, Object> need(HttpServletRequest req) throws Exception {
        Map<String, Object> a = auth(req); if (a == null) throw processException("dd.401.auth"); return a;
    }
    @Override public Map<String, Object> needStaff(HttpServletRequest req) throws Exception { Map<String, Object> a = need(req); if ("teacher".equals(a.get("role"))) throw processException("dd.403.teacher"); return a; }
    @Override public Map<String, Object> needOwner(HttpServletRequest req) throws Exception { Map<String, Object> a = need(req); if (!"owner".equals(a.get("role"))) throw processException("dd.403.role"); return a; }
    @Override public Map<String, Object> password(Map<String, Object> a, JsonNode b) throws Exception {
        String uid = (String) a.get("uid"), tid = (String) a.get("tid"); rl.limit("pw:" + uid, 8, 600_000L);
        String cur = mapper.selectPw(uid);
        if (cur == null || !DdCrypto.checkPw(DdWeb.str(b, "current"), cur)) throw processException("dd.401.login.pw");
        if (!pwOk(b.get("next"))) throw processException("dd.400.password");
        mapper.updatePw(uid, DdCrypto.hashPw(b.get("next").asText())); mapper.deleteOtherSessions(uid, (String) a.get("sid"));
        tx.audit(tid, (String) a.get("email"), "password.change", null); return Map.of("ok", true);
    }
    @Override public Map<String, Object> staffList(Map<String, Object> a) throws Exception { Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", mapper.selectStaff((String) a.get("tid"))); return o; }
    @Override public Map<String, Object> staffCreate(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = (String) a.get("tid"); rl.limit("staff:" + tid, 30, 3600_000L);
        String email = DdWeb.str(b, "email").trim().toLowerCase(), role = DdWeb.str(b, "role");
        if (!emailOk(email)) throw processException("dd.400.email");
        if (!List.of("teacher", "sub").contains(role)) throw processException("dd.400.staff_role");
        byte[] rnd = new byte[12]; new java.security.SecureRandom().nextBytes(rnd);
        String pass = "Dd" + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(rnd).replaceAll("[-_]", "x") + "7"; String pw = DdCrypto.hashPw(pass);
        try { tx.plain(() -> { if (mapper.countEmail(email) > 0) throw processException("dd.409.exists"); return mapper.insertUser(tid, email, pw, role); }); }
        catch (DuplicateKeyException e) { throw processException("dd.409.exists", e); }
        tx.audit(tid, (String) a.get("email"), "staff.create", DdWeb.JSON.createObjectNode().put("email", email).put("role", role).toString());
        Map<String, Object> o = new LinkedHashMap<>(); o.put("email", email); o.put("role", role); o.put("password", pass); return o;
    }
    @Override public Map<String, Object> staffRemove(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = (String) a.get("tid"), email = DdWeb.str(b, "email").trim().toLowerCase();
        if (mapper.deleteStaff(tid, email) == 0) throw processException("dd.404.staff_missing");
        tx.audit(tid, (String) a.get("email"), "staff.remove", DdWeb.JSON.createObjectNode().put("email", email).toString()); return Map.of("ok", true);
    }
    @Override public Map<String, Object> meOut(Map<String, Object> a) {
        Map<String, Object> u = new LinkedHashMap<>(); u.put("email", a.get("email")); u.put("role", a.get("role"));
        Map<String, Object> t = new LinkedHashMap<>(); t.put("tid", a.get("tid")); t.put("name", a.get("name")); t.put("type", a.get("type")); t.put("mode", a.get("mode"));
        Map<String, Object> o = new LinkedHashMap<>(); o.put("user", u); o.put("tenant", t); return o;
    }
}
