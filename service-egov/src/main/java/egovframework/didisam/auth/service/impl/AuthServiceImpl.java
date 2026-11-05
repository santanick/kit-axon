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
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service("authService")
public class AuthServiceImpl extends EgovAbstractServiceImpl implements AuthService {
    static final List<String> TYPES = List.of("corp", "univ", "public", "k12", "adult", "lifelong", "voc");
    static final List<String> MODELS = List.of("claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5");
    static final Pattern EMAIL = Pattern.compile("^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]{2,}$");
    static final Pattern HAS_ALPHA = Pattern.compile("[a-zA-Z]"), HAS_DIGIT = Pattern.compile("\\d");

    private final AuthMapper mapper; private final TenantTx tx; private final DdProps p; private final DdWeb web; private final DdRateLimiter rl;
    public AuthServiceImpl(AuthMapper mapper, TenantTx tx, DdProps p, DdWeb web, DdRateLimiter rl) { this.mapper = mapper; this.tx = tx; this.p = p; this.web = web; this.rl = rl; }

    static boolean emailOk(String e) { return e.length() <= 120 && EMAIL.matcher(e).matches(); }
    static boolean pwOk(JsonNode v) {
        if (v == null || !v.isTextual()) return false; String s = v.asText();
        return s.length() >= 10 && s.length() <= 200 && HAS_ALPHA.matcher(s).find() && HAS_DIGIT.matcher(s).find();
    }

    @Override public Map<String, Object> config() {
        mapper.ping();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("live", true); m.put("signup", p.allowSignup); m.put("signupCode", !p.signupCode.isEmpty());
        m.put("ai", p.ai); m.put("models", MODELS); m.put("aiDaily", p.aiDaily);
        return m;
    }

    private void newSession(HttpServletResponse res, String uid, String tid) {
        String token = DdCrypto.newToken();
        mapper.insertSession(DdCrypto.sha(token), uid, tid, Math.min(p.idleH, DdWeb.SESSION_DAYS * 24));
        web.setSid(res, token);
    }

    @Override public Map<String, Object> signup(JsonNode b, HttpServletRequest req, HttpServletResponse res) {
        if (!p.allowSignup) throw new DdException(403, "지금은 새 기관 가입을 받지 않습니다.", "signup_off");
        rl.limit("su:" + web.ip(req), 10, 3600_000);
        String email = DdWeb.str(b, "email").trim().toLowerCase(); String name = DdWeb.str(b, "orgName").trim();
        if (!p.signupCode.isEmpty() && !DdCrypto.safeEq(DdWeb.str(b, "code"), p.signupCode)) throw new DdException(403, "가입 코드가 올바르지 않습니다.", "code");
        if (!emailOk(email)) throw new DdException(400, "이메일 형식을 확인하세요.", "email");
        if (!pwOk(b.get("password"))) throw new DdException(400, "비밀번호는 10자 이상, 영문과 숫자를 함께 쓰세요.", "password");
        if (name.isEmpty() || name.length() > 30) throw new DdException(400, "기관명을 30자 이내로 입력하세요.", "name");
        JsonNode t = b.get("type"); String type = t != null && t.isTextual() ? t.asText() : "";
        if (!TYPES.contains(type)) throw new DdException(400, "기관 유형을 고르세요.", "type");
        String pw = DdCrypto.hashPw(b.get("password").asText()); String tid = DdCrypto.newTid();
        String uid;
        try {
            uid = tx.plain(() -> {
                if (mapper.countEmail(email) > 0) throw new DdException(409, "이미 가입된 이메일입니다. 로그인하세요.", "exists");
                mapper.insertTenant(tid, name, type);
                return mapper.insertUser(tid, email, pw, "owner");
            });
        } catch (DuplicateKeyException e) { throw new DdException(409, "이미 가입된 이메일입니다. 로그인하세요.", "exists"); }
        tx.audit(tid, email, "tenant.create", "{\"type\":\"" + type + "\"}");
        newSession(res, uid, tid);
        Map<String, Object> u = new LinkedHashMap<>(); u.put("email", email); u.put("role", "owner");
        Map<String, Object> tn = new LinkedHashMap<>(); tn.put("tid", tid); tn.put("name", name); tn.put("type", type); tn.put("mode", "saas");
        Map<String, Object> out = new LinkedHashMap<>(); out.put("user", u); out.put("tenant", tn);
        return out;
    }

    @Override public Map<String, Object> login(JsonNode b, HttpServletRequest req, HttpServletResponse res) {
        String email = DdWeb.str(b, "email").trim().toLowerCase();
        rl.limit("li:" + web.ip(req), 30, 600_000); rl.limit("le:" + email, 8, 600_000);
        Map<String, Object> u = mapper.selectUserByEmail(email);
        boolean ok = DdCrypto.checkPw(DdWeb.str(b, "password"), u != null ? (String) u.get("pw") : DdCrypto.DUMMY);
        if (u == null || !ok) {
            if (u != null) {
                String masked = web.ip(req).replaceAll("\\d+$", "x");
                try { tx.audit((String) u.get("tenant_id"), email, "login.fail", DdWeb.JSON.createObjectNode().put("ip", masked).toString()); } catch (Exception ignore) {}
            }
            throw new DdException(401, "이메일 또는 비밀번호가 올바르지 않습니다.", "login");
        }
        String uid = (String) u.get("id"), tid = (String) u.get("tenant_id");
        mapper.updateLastLogin(uid); mapper.deleteExpiredSessions(uid);
        newSession(res, uid, tid);
        tx.audit(tid, email, "login", null);
        return meOut(mapper.selectMe(uid, email));
    }

    @Override public Map<String, Object> logout(HttpServletRequest req, HttpServletResponse res) {
        String t = web.sidToken(req); if (t != null) mapper.deleteSession(DdCrypto.sha(t));
        web.clearSid(res); return Map.of("ok", true);
    }

    @Override public Map<String, Object> auth(HttpServletRequest req) {
        String t = web.sidToken(req); if (t == null || t.isEmpty() || t.length() > 100) return null;
        Map<String, Object> a = mapper.selectAuth(DdCrypto.sha(t), Math.max(0, p.idleH - 1), DdWeb.SESSION_DAYS);
        if (a != null && Boolean.TRUE.equals(a.get("slide"))) mapper.slideSession((String) a.get("sid"), DdWeb.SESSION_DAYS, p.idleH);
        return a;
    }
    @Override public Map<String, Object> need(HttpServletRequest req) {
        Map<String, Object> a = auth(req); if (a == null) throw new DdException(401, "로그인이 필요합니다.", "auth"); return a;
    }
    @Override public Map<String, Object> meOut(Map<String, Object> a) {
        Map<String, Object> u = new LinkedHashMap<>(); u.put("email", a.get("email")); u.put("role", a.get("role"));
        Map<String, Object> t = new LinkedHashMap<>(); t.put("tid", a.get("tid")); t.put("name", a.get("name")); t.put("type", a.get("type")); t.put("mode", a.get("mode"));
        Map<String, Object> o = new LinkedHashMap<>(); o.put("user", u); o.put("tenant", t); return o;
    }
}
