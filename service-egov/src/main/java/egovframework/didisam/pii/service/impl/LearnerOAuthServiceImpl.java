package egovframework.didisam.pii.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.*;
import egovframework.didisam.pii.service.PiiService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

/**
 * QA7 학습자 소셜 가입 · 로그인(구글 · 카카오 · 네이버) — Node loauth.js와 같은 경로 · state · 쿠키 · 결과 해시.
 *  - 시작: GET /api/pub/{tid}/loauth/{p}/start?m=join|login(&app=1) → 제공자 동의 화면(기관 tid를 서명한 state)
 *  - 콜백: GET /api/pub/loauth/{p}/callback → 코드 교환 → 회원 번호(sub)만(이름 · 이메일 · 사진 · 전화번호 요청 없음, 구글 scope=openid)
 *  - 결과: /learner.html?t=..&oa=ok | join-{p} | pending | rejected | err-{code}
 *  - 키: LEARNER_OAUTH_{P}_ID · _SECRET, 없으면 운영자 키 OAUTH_{P}_*; 네이버는 secret 필수, 키 없는 제공자는 ready에서 빠진다
 *  - 외부 호출: 고정 주소(시험은 OAUTH_MOCK_URL, NODE_ENV=production이면 무시) · 리다이렉트 따르지 않음(HttpClient 기본 NEVER, 운영자 OAuthServiceImpl과 같은 SSRF 가드)
 */
@Service("learnerOAuthService")
public class LearnerOAuthServiceImpl extends EgovAbstractServiceImpl {
    public record Prov(String name, String auth, String token, String me, String scope, String id, String secret, boolean reuse) { }
    static final Pattern TID_RE = Pattern.compile("tn_[a-z0-9]{8,16}");
    static final String[][] DEF = {
        { "google", "https://accounts.google.com/o/oauth2/v2/auth", "https://oauth2.googleapis.com/token", "https://openidconnect.googleapis.com/v1/userinfo", "openid" },
        { "kakao", "https://kauth.kakao.com/oauth/authorize", "https://kauth.kakao.com/oauth/token", "https://kapi.kakao.com/v2/user/me", "" },
        { "naver", "https://nid.naver.com/oauth2.0/authorize", "https://nid.naver.com/oauth2.0/token", "https://openapi.naver.com/v1/nid/me", "" } };
    private final Map<String, Prov> P = new LinkedHashMap<>(); private final String publicUrl;
    private final DdProps p; private final DdWeb web; private final DdRateLimiter rl; private final DdLTickets tk; private final PiiService pii;
    private final HttpClient http = HttpClient.newBuilder().proxy(HttpClient.Builder.NO_PROXY).version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(10)).build();

    public LearnerOAuthServiceImpl(Environment env, DdProps p, DdWeb web, DdRateLimiter rl, DdLTickets tk, PiiService pii) {
        this.p = p; this.web = web; this.rl = rl; this.tk = tk; this.pii = pii;
        String mock = "production".equals(env.getProperty("NODE_ENV", "")) ? "" : env.getProperty("OAUTH_MOCK_URL", "").trim().replaceAll("/+$", "");
        this.publicUrl = env.getProperty("PUBLIC_URL", "").trim().replaceAll("/+$", "");
        for (String[] d : DEF) {
            String U = d[0].toUpperCase(Locale.ROOT); String own = env.getProperty("LEARNER_OAUTH_" + U + "_ID", "").trim();
            String id = !own.isEmpty() ? own : env.getProperty("OAUTH_" + U + "_ID", "").trim(); if (id.isEmpty()) continue;
            String secret = env.getProperty(!own.isEmpty() ? "LEARNER_OAUTH_" + U + "_SECRET" : "OAUTH_" + U + "_SECRET", "").trim();
            if ("naver".equals(d[0]) && secret.isEmpty()) continue; /* 네이버는 client_secret 필수 */
            String a = d[1], t = d[2], m = d[3]; if (!mock.isEmpty()) { a = mock + "/" + d[0] + "/auth"; t = mock + "/" + d[0] + "/token"; m = mock + "/" + d[0] + "/me"; }
            P.put(d[0], new Prov(d[0], a, t, m, d[4], id, secret, own.isEmpty()));
        }
    }
    /** 키가 설정된 제공자(나머지는 화면에서 「준비 중」) */
    public List<String> ready() { return new ArrayList<>(P.keySet()); }

    /** 제공자 응답 → 회원 번호(sub)만(Node subOf) */
    static String subOf(String prov, JsonNode j) {
        if (j == null) return "";
        if ("google".equals(prov)) { JsonNode s = j.path("sub"); return s.isMissingNode() || s.isNull() ? "" : s.asText(""); }
        if ("naver".equals(prov)) { JsonNode r = j.path("response").path("id"); return "00".equals(j.path("resultcode").asText("")) && !r.isMissingNode() && !r.isNull() ? r.asText("") : ""; }
        JsonNode s = j.path("id"); return s.isMissingNode() || s.isNull() ? "" : s.asText("");
    }
    private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }
    private static String form(Map<String, String> m) { StringJoiner j = new StringJoiner("&"); m.forEach((k, v) -> j.add(enc(k) + "=" + enc(v))); return j.toString(); }
    private String cb(HttpServletRequest req, String prov) { String base = !publicUrl.isEmpty() ? publicUrl : (p.secure ? "https" : "http") + "://" + req.getHeader("host"); return base + "/api/pub/loauth/" + prov + "/callback"; }
    private void go(HttpServletResponse res, String tid, String hash, String extra, boolean app) {
        String frag = hash.startsWith("join-") ? "join" : ("pending".equals(hash) || "rejected".equals(hash)) ? "pending" : "ok".equals(hash) ? "home" : "login";
        if (extra != null) res.addHeader("set-cookie", extra);
        res.setStatus(302); res.setHeader("location", "/learner.html?" + (tid.isEmpty() ? "" : "t=" + enc(tid) + "&") + (app ? "app=1&" : "") + "oa=" + hash + "#" + frag);
        res.setHeader("cache-control", "no-store"); res.setHeader("referrer-policy", "no-referrer");
    }

    public void start(HttpServletRequest req, HttpServletResponse res, String tid, String prov) throws Exception {
        if (!TID_RE.matcher(tid).matches()) throw processException("dd.404.tenant");
        Prov c = P.get(prov); if (c == null) { go(res, tid, "err-unset", null, false); return; }
        rl.limit("loa:" + web.ip(req), 30, 600_000L);
        if (!pii.socialOn(tid, prov)) { go(res, tid, "err-provider_off", null, false); return; }
        byte[] nb = new byte[18]; DdCrypto.RND.nextBytes(nb); String n = Base64.getUrlEncoder().withoutPadding().encodeToString(nb);
        String m = "login".equals(req.getParameter("m")) ? "login" : "join";
        ObjectNode so = DdWeb.JSON.createObjectNode().put("t", tid).put("p", prov).put("n", n).put("m", m); if ("1".equals(req.getParameter("app"))) so.put("a", 1); so.put("x", System.currentTimeMillis() + 10 * 60_000L);
        String state = tk.seal("lstate", so);
        Map<String, String> q = new LinkedHashMap<>(); q.put("response_type", "code"); q.put("client_id", c.id()); q.put("redirect_uri", cb(req, prov)); q.put("state", state);
        if (!c.scope().isEmpty()) q.put("scope", c.scope()); if ("google".equals(prov)) q.put("prompt", "select_account");
        res.setHeader("set-cookie", tk.ck(tk.nn(), n, 600));
        res.setStatus(302); res.setHeader("location", c.auth() + "?" + form(q)); res.setHeader("cache-control", "no-store"); res.setHeader("referrer-policy", "no-referrer");
    }

    public void callback(HttpServletRequest req, HttpServletResponse res, String prov) throws Exception {
        String clear = tk.ck(tk.nn(), "", 0); String stateRaw = req.getParameter("state"); JsonNode st = tk.open("lstate", stateRaw);
        if (st == null || !prov.equals(st.path("p").asText()) || !TID_RE.matcher(st.path("t").asText("")).matches()) { go(res, "", "err-state", clear, false); return; }
        String tid = st.path("t").asText(); String n = DdLTickets.cookie(req, tk.nn()); boolean A = st.path("a").asInt(0) == 1 || st.path("a").asBoolean(false);
        if (n.isEmpty() || !n.equals(st.path("n").asText())) { go(res, tid, "err-state", clear, A); return; }
        Prov c = P.get(prov); if (c == null) { go(res, tid, "err-unset", clear, A); return; }
        rl.limit("loa:" + web.ip(req), 30, 600_000L);
        String code = req.getParameter("code") == null ? "" : req.getParameter("code");
        if ((req.getParameter("error") != null && !req.getParameter("error").isEmpty()) || code.isEmpty()) { go(res, tid, "err-denied", clear, A); return; }
        String sub;
        try {
            Map<String, String> f = new LinkedHashMap<>(); f.put("grant_type", "authorization_code"); f.put("client_id", c.id()); f.put("redirect_uri", cb(req, prov)); f.put("code", code);
            if (!c.secret().isEmpty()) f.put("client_secret", c.secret()); if ("naver".equals(prov)) f.put("state", stateRaw);
            HttpResponse<byte[]> tr = http.send(HttpRequest.newBuilder(URI.create(c.token())).timeout(Duration.ofSeconds(10)).header("content-type", "application/x-www-form-urlencoded;charset=utf-8").header("accept", "application/json").POST(HttpRequest.BodyPublishers.ofString(form(f))).build(), HttpResponse.BodyHandlers.ofByteArray());
            JsonNode tj; try { tj = DdWeb.JSON.readTree(tr.body()); } catch (Exception e) { tj = null; } String at = tj == null ? "" : tj.path("access_token").asText("");
            if (tr.statusCode() < 200 || tr.statusCode() >= 300 || at.isEmpty()) throw new IllegalStateException("token");
            HttpResponse<byte[]> mr = http.send(HttpRequest.newBuilder(URI.create(c.me())).timeout(Duration.ofSeconds(10)).header("authorization", "Bearer " + at).header("accept", "application/json").GET().build(), HttpResponse.BodyHandlers.ofByteArray());
            if (mr.statusCode() < 200 || mr.statusCode() >= 300) throw new IllegalStateException("me");
            sub = subOf(prov, DdWeb.JSON.readTree(mr.body()));
        } catch (Exception e) { go(res, tid, "err-provider", clear, A); return; }
        if (sub.isEmpty() || sub.length() > 200) { go(res, tid, "err-provider", clear, A); return; }
        String r;
        try { r = pii.oauthLogin(req, res, tid, prov, sub); }
        catch (DdException e) { go(res, tid, "err-" + cut(String.valueOf(e.getCode()).replaceAll("[^\\w]", ""), 30), clear, A); return; }
        catch (org.egovframe.rte.fdl.cmmn.exception.EgovBizException e) { String[] k = String.valueOf(e.getMessageKey()).split("\\."); go(res, tid, "err-" + (k.length >= 3 ? cut(k[2].replaceAll("[^\\w]", ""), 30) : "server"), clear, A); return; }
        catch (Exception e) { go(res, tid, "err-server", clear, A); return; }
        go(res, tid, "join".equals(r) ? "join-" + prov : r, clear, A);
    }
    private static String cut(String s, int n) { return s.length() <= n ? s : s.substring(0, n); }
}
