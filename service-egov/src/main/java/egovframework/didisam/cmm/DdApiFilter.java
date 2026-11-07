package egovframework.didisam.cmm;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 보안 헤더 · CSRF · 없는 주소 처리 — Node 서버 createServer 핸들러와 같은 순서:
 *   ① 등록되지 않은 /api 경로 → 404  ② GET이 아닌 요청 → x-didisam: 1 헤더 + 같은 출처(Origin host = Host)  ③ 처리
 */
@Component
@Order(1)
public class DdApiFilter extends OncePerRequestFilter {
    /** 등록된 /api 경로(Node app.js routes와 같음 — 1단계 + 2단계) */
    public static final Set<String> ROUTES = Set.of(
        "GET /api/health", "GET /api/config", "POST /api/signup", "POST /api/login", "POST /api/logout",
        "GET /api/me", "GET /api/state", "PUT /api/state",
        "GET /api/keys", "POST /api/keys", "POST /api/keys/revoke",
        "POST /api/ai/messages", "POST /api/site/benchmark", "GET /api/ai/usage",
        "GET /api/learners/progress", "GET /api/learners/accounts", "POST /api/learners/pii", "GET /api/learners/pii-log",
        "GET /api/audit", "POST /api/tenant/delete", "GET /api/cpl/summary", "GET /api/cpl/exams", "GET /api/cpl/logs", "GET /api/cpl/exam-copy", "GET /api/cpl/completion",
        "POST /api/password", "GET /api/staff", "POST /api/staff", "POST /api/staff/remove",
        /* v32.4 운영자 소셜 로그인 */
        "GET /api/oauth/google/start", "GET /api/oauth/google/callback", "GET /api/oauth/kakao/start", "GET /api/oauth/kakao/callback",
        "GET /api/oauth/pending", "POST /api/oauth/cancel", "POST /api/oauth/signup");
    /** v30 학사 LMS 묶음 경로(/api/lms/**) — 기동 때 DdLmsRoutes가 @RequestMapping에서 자동 수집한다(묶음별 등록 불필요) */
    public static final Set<String> LMS = ConcurrentHashMap.newKeySet();
    /** 학습자 포털: 메서드와 무관하게 경로가 맞으면 등록된 주소(Node pm 정규식과 같음) */
    public static final java.util.regex.Pattern PUB = java.util.regex.Pattern.compile("^/api/pub/([^/]+)/(site|login|me|progress|logout|tutor|otp|signup|guardian|pii|withdraw|verify|cpl|events|consent)\\z");
    static final Map<String, String> SEC = Map.of(
        "x-content-type-options", "nosniff",
        "referrer-policy", "strict-origin-when-cross-origin",
        "x-frame-options", "DENY",
        "permissions-policy", "camera=(self), geolocation=(self), microphone=(self), payment=(), usb=(), serial=(), bluetooth=(), hid=(), display-capture=(self), interest-cohort=()",
        "cross-origin-opener-policy", "same-origin",
        "cross-origin-resource-policy", "same-origin",
        "x-permitted-cross-domain-policies", "none",
        "origin-agent-cluster", "?1");
    static final String CSP = "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data: blob: https://i.ytimg.com; frame-src 'self' blob: https://accounts.google.com; media-src 'self' blob:; connect-src 'self' https://www.googleapis.com https://accounts.google.com; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'none'";
    static final String LCSP = "default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data: https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; media-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'self'";

    private final DdProps props; private final DdWeb web;
    public DdApiFilter(DdProps props, DdWeb web) { this.props = props; this.web = web; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        SEC.forEach(res::setHeader);
        if (props.secure) res.setHeader("strict-transport-security", "max-age=31536000; includeSubDomains");
        String path = req.getRequestURI(); String m = req.getMethod();
        if ("admin".equals(props.module) && !("GET".equals(m) && "/api/health".equals(path)) && !DdModule.ipAllowed(props.adminIps, web.ip(req))) { res.setHeader("cache-control", "no-store"); json(res, 403, "ip", "허용되지 않은 접속 위치입니다."); return; }
        if (path.startsWith("/api/")) {
            res.setHeader("cache-control", "no-store");
            if ((!ROUTES.contains(m + " " + path) && !LMS.contains(m + " " + path) && !PUB.matcher(path).matches()) || !DdModule.apiAllowed(props.module, m, path)) { json(res, 404, "not_found", "없는 주소입니다."); return; }
            if (!"GET".equals(m)) {
                if (!"1".equals(req.getHeader("x-didisam"))) { json(res, 403, "csrf", "허용되지 않은 요청입니다."); return; }
                String o = req.getHeader("origin");
                if (o != null && !o.isEmpty()) {
                    String oh; try { URI u = URI.create(o); oh = u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : ""); } catch (Exception e) { oh = "?"; }
                    if (!oh.equals(req.getHeader("host"))) { json(res, 403, "origin", "허용되지 않은 출처입니다."); return; }
                }
            }
        } else if ("/mcp".equals(path)) {
            res.setHeader("cache-control", "no-store"); if (!DdModule.mcpAllowed(props.module)) { json(res, 404, "not_found", "없는 주소입니다."); return; } // MCP: 메서드 · 키 검사는 McpController(Node mcp.handle과 같은 순서)
        } else {
            if (!"GET".equals(m) && !"HEAD".equals(m)) { res.setStatus(405); res.getWriter().write("method"); return; }
            if (!DdModule.staticAllowed(props.module, path)) { res.setHeader("cache-control", "no-store"); res.setStatus(404); res.setContentType("text/plain; charset=utf-8"); res.getOutputStream().write("not found".getBytes(StandardCharsets.UTF_8)); return; }
            if ("learner".equals(props.module) && "/".equals(path)) { res.setHeader("cache-control", "no-store"); res.setStatus(302); res.setHeader("location", "/learner.html" + (props.learnerTid.isEmpty() ? "" : "?t=" + java.net.URLEncoder.encode(props.learnerTid, StandardCharsets.UTF_8))); return; }
            boolean learner = path.endsWith("/learner.html");
            if (path.endsWith("/") || path.endsWith(".html") || path.endsWith(".do")) {
                res.setHeader("content-security-policy", learner ? LCSP : CSP);
                res.setHeader("cache-control", "no-cache");
                if (learner) res.setHeader("x-frame-options", "SAMEORIGIN");
            } else res.setHeader("cache-control", "public, max-age=300");
        }
        if (!props.module.isEmpty() && "/".equals(path)) { req.getRequestDispatcher("/" + DdModule.PAGE.get(props.module)).forward(req, res); return; }
        chain.doFilter(req, res);
    }
    static void json(HttpServletResponse res, int st, String code, String msg) throws IOException {
        res.setStatus(st); res.setContentType("application/json; charset=utf-8");
        res.getOutputStream().write(("{\"error\":\"" + code + "\",\"message\":\"" + msg + "\"}").getBytes(StandardCharsets.UTF_8));
    }
}
