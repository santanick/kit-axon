package egovframework.didisam.conn.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.bench.service.impl.DdBench;
import egovframework.didisam.cmm.DdAiGuard;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdStateCrypto;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.market.service.impl.MkDb;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.InetAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** MS Teams 연동 /api/conn/teams/* — Node service/server/teams/index.js와 같은 경로 · 응답 · 오류 코드(teams.md 1절).
 *  시연 모드(MS_CLIENT_ID 없음): 외부 호출 없이 같은 모양의 결과. 워크플로 주소는 SSRF 검사 뒤 AES-256-GCM(enc1:v1, AAD = tid|conn|teams|kind|id)으로만 보관.
 *  Java 1차 범위: 상태 · 설정 · 시연 연결 · 채널(워크플로 웹훅 실발송 포함) · 회의(시연) · 출석 제안 · 반영 · 해제.
 *  Entra 관리자 동의 · 회의 계정 위임 · Graph 회의 · SSO(live) 리다이렉트는 키가 있으면 Node 서버를 쓴다(Java는 err-unset · 503 teams_unset — 최종 보고의 남은 항목). */
@Service("teamsService")
public class TeamsServiceImpl extends EgovAbstractServiceImpl {
    static final Map<String, Object[]> MSG = new LinkedHashMap<>();
    static {
        Object[] m = { "teams_unset", 503, "Microsoft 앱 키가 서버에 설정되지 않아 시연 모드로 동작합니다.", "teams_role", 403, "Teams 연결은 정운영자 · 관리자만 바꿀 수 있습니다.",
            "teams_consent", 409, "먼저 조직 관리자 동의(조직 연결)를 완료하세요.", "teams_state", 400, "연결 요청이 만료되었습니다. 다시 시도하세요.", "teams_denied", 400, "Microsoft 동의 화면에서 허용하지 않았습니다.",
            "teams_tenant_taken", 409, "이 Microsoft 조직은 다른 기관에 이미 연결되어 있습니다.", "teams_tenant_mismatch", 403, "기관에 연결된 Microsoft 조직의 계정이 아닙니다.",
            "teams_account", 409, "회의 계정 연결이 없거나 만료되었습니다. 다시 연결하세요.", "teams_scope", 403, "허용된 권한이 부족합니다. 관리자 동의를 다시 받으세요.",
            "teams_webhook_url", 400, "Teams 워크플로 주소 형식이 아닙니다.", "teams_webhook_fail", 502, "채널로 보내지 못했습니다. 워크플로가 켜져 있는지 확인하세요.",
            "teams_limit", 409, "알림 채널은 기관당 10곳까지 등록할 수 있습니다.", "teams_time", 400, "수업 시간을 확인하세요(종료가 시작보다 늦고 24시간 이내).",
            "teams_report_none", 404, "출석 보고서가 아직 없습니다. 회의 종료 후 잠시 뒤 다시 시도하세요.", "teams_rate", 429, "Microsoft 요청 한도에 걸렸습니다. 잠시 뒤 다시 시도하세요.",
            "teams_provider", 502, "Microsoft 서버 응답에 문제가 있습니다.", "teams_phase2", 501, "다음 단계에서 제공합니다.", "teams_bad_event", 400, "보낼 수 없는 알림 종류입니다.",
            "teams_input", 400, "입력값을 확인하세요.", "teams_none", 404, "없는 Teams 항목입니다.", "teams_item", 409, "반의 라이브 항목에 연결된 회의가 아닙니다." };
        for (int i = 0; i < m.length; i += 3) MSG.put((String) m[i], new Object[]{ m[i + 1], m[i + 2] });
    }
    static final List<String> EVENTS = List.of("notice", "due", "approval", "report", "signup", "pay");
    static final Map<String, String> EV_KO = Map.of("notice", "공지", "due", "마감 임박", "approval", "승인 요청", "report", "주간 리포트", "signup", "가입", "pay", "결제", "test", "연결 시험");
    static final List<String> ATT = List.of("출석", "지각", "결석"), SSO_TYPES = List.of("univ", "corp", "public");
    static final Pattern[] DEF_HOSTS = { Pattern.compile("\\.logic\\.azure\\.com$", Pattern.CASE_INSENSITIVE), Pattern.compile("\\.environment\\.api\\.powerplatform\\.com$", Pattern.CASE_INSENSITIVE), Pattern.compile("\\.api\\.powerplatform\\.com$", Pattern.CASE_INSENSITIVE) };
    static final Pattern[] OLD_HOOK = { Pattern.compile("(^|\\.)webhook\\.office\\.com$", Pattern.CASE_INSENSITIVE), Pattern.compile("^outlook\\.office\\.com$", Pattern.CASE_INSENSITIVE), Pattern.compile("^outlook\\.office365\\.com$", Pattern.CASE_INSENSITIVE) };
    static final String AZ = "abcdefghijklmnopqrstuvwxyz0123456789"; static final SecureRandom RND = new SecureRandom();
    static String rid(String p) { byte[] b = new byte[10]; RND.nextBytes(b); StringBuilder s = new StringBuilder(p); for (byte x : b) s.append(AZ.charAt((x & 0xff) % 36)); return s.toString(); }
    static String str(JsonNode v, int n) { return cut(nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v), n); }
    static String kst(Instant t) { return t == null ? "" : t.plusSeconds(9 * 3600).atOffset(ZoneOffset.UTC).toLocalDateTime().withSecond(0).withNano(0).toString().replace('T', ' ').substring(0, 16); }
    static String kst(String iso) { if (iso == null || iso.isEmpty()) return ""; try { return kst(Instant.parse(iso)); } catch (Exception e) { return ""; } }
    static String maskUrl(URI u) { String h = u.getHost() == null ? "" : u.getHost(); String s = u.toString(); return u.getScheme() + "://" + (h.length() > 8 ? h.substring(0, 8) : h) + "…••••" + (s.length() >= 3 ? s.substring(s.length() - 3) : s); }
    static String maskTid(String t) { return t == null || t.isEmpty() ? "" : (t.length() > 4 ? t.substring(0, 4) : t) + "…••••" + (t.length() >= 3 ? t.substring(t.length() - 3) : t); }
    static ObjectNode O() { return F.objectNode(); }
    static JsonNode g(JsonNode r, String k) { JsonNode v = r == null ? null : r.get(k); return v == null ? F.nullNode() : v; }
    static String s(JsonNode r, String k) { JsonNode v = g(r, k); return v.isNull() ? null : v.asText(); }

    final MkDb db; final TenantTx ttx; final AuthService auth; final DdRateLimiter rl; final DdStateCrypto crypt; final boolean live, testHook; final List<String> extraHosts; final byte[] KEY; final long gap;
    public TeamsServiceImpl(MkDb db, TenantTx ttx, AuthService auth, DdRateLimiter rl, DdStateCrypto crypt, @Value("${MS_CLIENT_ID:}") String msId, @Value("${NODE_ENV:}") String nodeEnv,
                            @Value("${TEAMS_WEBHOOK_HOSTS:}") String hosts, @Value("${TEAMS_WEBHOOK_TEST:}") String th, @Value("${TEAMS_GAP_MS:1000}") String gapMs,
                            @Value("${PII_KEY:}") String piiKey, @Value("${SESSION_PEPPER:}") String pepper) {
        this.db = db; this.ttx = ttx; this.auth = auth; this.rl = rl; this.crypt = crypt; this.live = msId != null && !msId.trim().isEmpty();
        this.testHook = !"production".equals(nodeEnv) && "1".equals(th); this.extraHosts = new ArrayList<>(); for (String x : (hosts == null ? "" : hosts).split(",")) if (!x.trim().isEmpty()) extraHosts.add(x.trim().toLowerCase(java.util.Locale.ROOT));
        long gp; try { gp = Math.max(0, Long.parseLong(gapMs.trim())); } catch (Exception e) { gp = 1000; } this.gap = gp;
        byte[] k = null; String raw = piiKey == null ? "" : piiKey.trim();
        if (!raw.isEmpty()) { try { k = raw.matches("(?i)^[0-9a-f]{64}$") ? hexBytes(raw) : Base64.getDecoder().decode(raw); } catch (Exception e) { k = null; } if (k != null && k.length != 32) k = null; }
        this.KEY = k != null ? hkdf(hkdf(k, "didisam-pii-enc-v1"), "didisam-conn-teams-v1") : hkdf((pepper == null ? "" : pepper).getBytes(StandardCharsets.UTF_8), "didisam-conn-teams-dev");
    }
    static byte[] hexBytes(String h) { byte[] o = new byte[h.length() / 2]; for (int i = 0; i < o.length; i++) o[i] = (byte) Integer.parseInt(h.substring(2 * i, 2 * i + 2), 16); return o; }
    /** Node crypto.hkdfSync('sha256', ikm, salt = 빈 값, info, 32) */
    static byte[] hkdf(byte[] ikm, String info) {
        try { Mac m = Mac.getInstance("HmacSHA256"); m.init(new SecretKeySpec(new byte[32], "HmacSHA256")); byte[] prk = m.doFinal(ikm);
            m.init(new SecretKeySpec(prk, "HmacSHA256")); m.update(info.getBytes(StandardCharsets.UTF_8)); m.update((byte) 1); byte[] t = m.doFinal(); byte[] o = new byte[32]; System.arraycopy(t, 0, o, 0, 32); return o; }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    static String aad(String tid, String kind, String id) { return tid + "|conn|teams|" + kind + "|" + id; }
    String enc(String v, String a) { try { byte[] iv = new byte[12]; RND.nextBytes(iv); Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(KEY, "AES"), new GCMParameterSpec(128, iv)); c.updateAAD(a.getBytes(StandardCharsets.UTF_8));
        byte[] out = c.doFinal(v.getBytes(StandardCharsets.UTF_8)); byte[] ct = java.util.Arrays.copyOf(out, out.length - 16), tag = java.util.Arrays.copyOfRange(out, out.length - 16, out.length); Base64.Encoder B = Base64.getUrlEncoder().withoutPadding();
        return "enc1:v1." + B.encodeToString(iv) + "." + B.encodeToString(tag) + "." + B.encodeToString(ct); } catch (Exception e) { throw new IllegalStateException(e); } }
    String dec(String s0, String a) { try { String[] p = s0.substring(5).split("\\.", -1); Base64.Decoder D = Base64.getUrlDecoder(); byte[] iv = D.decode(p[1]), tag = D.decode(p[2]), ct = D.decode(p[3]); byte[] in = new byte[ct.length + tag.length]; System.arraycopy(ct, 0, in, 0, ct.length); System.arraycopy(tag, 0, in, ct.length, tag.length);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(KEY, "AES"), new GCMParameterSpec(128, iv)); c.updateAAD(a.getBytes(StandardCharsets.UTF_8)); return new String(c.doFinal(in), StandardCharsets.UTF_8); } catch (Exception e) { throw new IllegalStateException(e); } }

    DdException E(String code) { return E(code, null); }
    DdException E(String code, Map<String, Object> extra) { Object[] v = MSG.getOrDefault(code, new Object[]{ 400, "요청을 처리할 수 없습니다." }); DdException e = new DdException((Integer) v[0], (String) v[1], code); if (extra != null) e.extra(extra); return e; }
    static boolean isAdmin(Map<String, Object> a) { return "owner".equals(a.get("role")) || "sub".equals(a.get("role")); }
    Map<String, Object> needAny(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); rl.limit("teams:" + a.get("tid"), 120, 60000L); return a; }
    Map<String, Object> needAdmin(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); if (!isAdmin(a)) throw E("teams_role"); rl.limit("teams:" + a.get("tid"), 120, 60000L); return a; }
    Map<String, Object> needOwner(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); if (!"owner".equals(a.get("role"))) throw E("teams_role"); rl.limit("teams:" + a.get("tid"), 120, 60000L); return a; }
    static String tid(Map<String, Object> a) { return (String) a.get("tid"); }
    static String email(Map<String, Object> a) { return (String) a.get("email"); }
    <T> T T(String tid, TenantTx.Work<T> fn) throws Exception { return ttx.inTenant(tid, fn); }
    void audit(String tid, String actor, String action, Object detail) { try { ttx.audit(tid, actor, action, DdWeb.JSON.valueToTree(detail).toString()); } catch (Exception e) { /* 본 처리는 유지 */ } }
    static Map<String, Object> map(Object... kv) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]); return o; }

    // ── 상태 ──
    final Map<String, List<ObjectNode>> runs = new ConcurrentHashMap<>();
    void addRun(String tid, ObjectNode r) { List<ObjectNode> L = new ArrayList<>(runs.getOrDefault(tid, List.of())); ObjectNode x = O().put("at", kst(Instant.now())); x.setAll(r); L.add(0, x); runs.put(tid, new ArrayList<>(L.subList(0, Math.min(10, L.size())))); }
    Object[] load(String tid) { ObjectNode org = db.q1("select ms_tid, domain, consent_at, consent_by, sso from conn_ms_org where tenant_id = $1", tid); ObjectNode cf = db.q1("select cfg, demo from conn_teams_cfg where tenant_id = $1", tid); if (cf == null) { cf = O(); cf.set("cfg", O()); cf.put("demo", false); }
        return new Object[]{ org, cf, db.q("select id, kind, owner_user, label, mask, meta, expires_at, created_at from conn_secret where tenant_id = $1 order by created_at", tid) }; }
    String typeOf(Map<String, Object> a) throws Exception { Object t = a.get("type"); if (t instanceof String && !((String) t).isEmpty()) return (String) t; ObjectNode r = ttx.plain(() -> db.q1("select type from tenants where id = $1", tid(a))); return r == null ? "" : s(r, "type"); }
    @SuppressWarnings("unchecked")
    ObjectNode view(String tid, String type, Object[] L) {
        ObjectNode org = (ObjectNode) L[0], cf = (ObjectNode) L[1]; List<ObjectNode> sec = (List<ObjectNode>) L[2]; JsonNode c0 = truthy(g(cf, "cfg")) ? g(cf, "cfg") : O(); JsonNode feat = truthy(get(c0, "features")) ? get(c0, "features") : O();
        ArrayNode channels = F.arrayNode(), accounts = F.arrayNode(); boolean anyErr = false, anyOk = false, reauth = false;
        for (ObjectNode x : sec) { JsonNode me = g(x, "meta");
            if ("teams_webhook".equals(s(x, "kind"))) { ObjectNode c = channels.addObject(); c.set("id", g(x, "id")); c.set("name", g(x, "label")); c.put("kind", truthy(get(me, "demo")) ? "demo" : "workflow"); c.set("mask", g(x, "mask")); c.set("events", truthy(get(me, "events")) ? get(me, "events") : F.arrayNode()); c.put("lastOk", S(get(me, "lastOk"))); c.put("err", S(get(me, "err")));
                if (truthy(get(me, "err"))) anyErr = true; if (truthy(get(me, "lastOk"))) anyOk = true; }
            else if ("teams_refresh".equals(s(x, "kind"))) { ObjectNode c = accounts.addObject(); c.set("id", g(x, "id")); c.put("upn", S(get(me, "upn"))); c.set("role", g(x, "label")); c.set("scopes", truthy(get(me, "scopes")) ? get(me, "scopes") : F.arrayNode()); boolean ra = "reauth".equals(S(get(me, "exp"))); c.put("exp", ra ? "reauth" : "ok"); c.put("mine", false); c.set("owner", g(x, "owner_user")); if (ra) reauth = true; } }
        boolean demo = truthy(g(cf, "demo")), demoOrg = org == null && demo;
        String st = anyErr || reauth ? "점검 필요" : (org != null || demo || anyOk) ? "연결됨" : channels.size() > 0 ? "진행 중" : "미연결";
        ObjectNode sso = O(); if (org != null) { JsonNode so = g(org, "sso"); sso.put("operator", truthy(get(so, "operator"))).put("learner", truthy(get(so, "learner"))); sso.putArray("tids").add(maskTid(s(org, "ms_tid"))); } else { sso.put("operator", false).put("learner", false); sso.putArray("tids"); }
        List<String> nt = new ArrayList<>(); if (channels.size() > 0) nt.add("알림 채널 " + channels.size() + "곳"); if (accounts.size() > 0) nt.add("회의 계정 " + accounts.size() + "명"); if (sso.get("operator").asBoolean() || sso.get("learner").asBoolean()) nt.add("SSO 사용");
        ObjectNode o = O().put("mode", live ? "live" : "demo").put("st", st).put("note", String.join(" · ", nt)).put("demo", demo);
        if (org != null) { ObjectNode x = o.putObject("org"); x.put("msTid", maskTid(s(org, "ms_tid"))).put("domain", S(g(org, "domain"))).put("consentAt", kst(s(org, "consent_at"))); x.set("consentBy", g(org, "consent_by")); }
        else if (demoOrg) o.putObject("org").put("msTid", "").put("domain", "demo.onmicrosoft.com").put("consentAt", "").put("consentBy", "").put("demo", true); else o.putNull("org");
        o.putObject("features").put("notify", !(get(feat, "notify") != null && get(feat, "notify").isBoolean() && !get(feat, "notify").asBoolean())).put("meeting", !(get(feat, "meeting") != null && get(feat, "meeting").isBoolean() && !get(feat, "meeting").asBoolean()))
            .put("sso", sso.get("operator").asBoolean() || sso.get("learner").asBoolean()).put("learner", truthy(get(feat, "learner")));
        JsonNode md = truthy(get(c0, "meetingDefaults")) ? get(c0, "meetingDefaults") : O(); double am = num(get(md, "attMin") == null ? F.missingNode() : get(md, "attMin"));
        ObjectNode mo = o.putObject("meetingDefaults").put("lobby", "everyone".equals(S(get(md, "lobby"))) ? "everyone" : "organization").put("recordAuto", false); if (Double.isFinite(am) && get(md, "attMin") != null) mo.set("attMin", numNode(am)); else mo.put("attMin", 10);
        o.set("channels", channels); o.set("accounts", accounts); o.set("sso", sso); o.put("ssoTypeOk", SSO_TYPES.contains(type));
        ArrayNode sa = o.putArray("scopesAvail"); if (live) { sa.add("notify"); sa.add("meeting"); sa.add("sso"); } else sa.add("notify");
        ArrayNode ra = o.putArray("runs"); runs.getOrDefault(tid, List.of()).forEach(ra::add); return o;
    }
    ObjectNode status(Map<String, Object> a) throws Exception {
        ObjectNode v = view(tid(a), typeOf(a), T(tid(a), () -> load(tid(a))));
        ArrayNode acc = F.arrayNode(); for (JsonNode x : v.get("accounts")) { ObjectNode y = ((ObjectNode) x).deepCopy(); String ow = s(y, "owner"); y.remove("owner"); y.put("mine", ow != null && ow.equals(a.get("uid"))); acc.add(y); } v.set("accounts", acc); return v;
    }

    // ── 채널 발송 ──
    static ObjectNode card(String event, JsonNode p) {
        String t0 = str(get(p, "title"), 120); if (t0.isEmpty()) t0 = cut(EV_KO.getOrDefault(event, "알림"), 120); String title = DdAiGuard.redact(t0).text(); String text = DdAiGuard.redact(str(get(p, "text"), 1200)).text();
        ArrayNode body = F.arrayNode(); body.addObject().put("type", "TextBlock").put("text", "디디쌤 · " + EV_KO.getOrDefault(event, "알림")).put("size", "Small").put("isSubtle", true); body.addObject().put("type", "TextBlock").put("text", title).put("weight", "Bolder").put("size", "Medium").put("wrap", true);
        if (!text.isEmpty()) body.addObject().put("type", "TextBlock").put("text", text).put("wrap", true);
        ArrayNode actions = F.arrayNode(); if (S(get(p, "link")).startsWith("https://")) actions.addObject().put("type", "Action.OpenUrl").put("title", "디디쌤에서 보기").put("url", str(get(p, "link"), 500));
        ObjectNode o = O().put("type", "message"); ObjectNode at = o.putArray("attachments").addObject().put("contentType", "application/vnd.microsoft.card.adaptive"); at.putNull("contentUrl");
        ObjectNode ct = at.putObject("content").put("$schema", "http://adaptivecards.io/schemas/adaptive-card.json").put("type", "AdaptiveCard").put("version", "1.4"); ct.set("body", body); ct.set("actions", actions); return o;
    }
    /** 워크플로 주소 검사(SSRF) — Node checkHook와 같음 */
    URI checkHook(String raw) {
        String s0 = raw == null ? "" : raw.trim(); if (s0.isEmpty() || s0.length() > 2048) return null; URI u; try { u = new URI(s0); if (u.getHost() == null) return null; } catch (Exception e) { return null; }
        if (u.getRawUserInfo() != null) return null; String h = u.getHost().toLowerCase(java.util.Locale.ROOT).replaceAll("^\\[|\\]$", "");
        for (Pattern r : OLD_HOOK) if (r.matcher(h).find()) return null; String path = u.getRawPath() == null ? "" : u.getRawPath();
        if (!Pattern.compile("/workflows/|/powerautomate/automations/", Pattern.CASE_INSENSITIVE).matcher(path).find()) return null;
        if (testHook && ("127.0.0.1".equals(h) || "localhost".equals(h)) && "http".equals(u.getScheme())) return u;
        boolean hostOk = false; for (Pattern r : DEF_HOSTS) if (r.matcher(h).find()) hostOk = true; for (String x : extraHosts) if (h.equals(x) || h.endsWith("." + x)) hostOk = true;
        if (!"https".equals(u.getScheme()) || (u.getPort() != -1 && u.getPort() != 443) || !hostOk || h.matches("^[0-9.]+$") || h.contains(":")) return null;
        try { InetAddress[] A = InetAddress.getAllByName(h); if (A.length == 0) return null; for (InetAddress x : A) if (DdBench.isPrivate(x.getAddress())) return null; } catch (Exception e) { return null; }
        return u;
    }
    static final java.net.http.HttpClient HC = java.net.http.HttpClient.newBuilder().followRedirects(java.net.http.HttpClient.Redirect.NEVER).connectTimeout(java.time.Duration.ofSeconds(10)).build();
    Object[] post(String url, JsonNode body) {
        for (int i = 0; ; i++) { java.net.http.HttpResponse<Void> r;
            try { r = HC.send(java.net.http.HttpRequest.newBuilder(URI.create(url)).timeout(java.time.Duration.ofSeconds(10)).header("content-type", "application/json").POST(java.net.http.HttpRequest.BodyPublishers.ofString(body.toString())).build(), java.net.http.HttpResponse.BodyHandlers.discarding()); }
            catch (Exception e) { return new Object[]{ false, "net" }; }
            if (r.statusCode() == 429 && i < 3) { long ra = r.headers().firstValueAsLong("retry-after").orElse(0); try { Thread.sleep(Math.min(5000, ra > 0 ? ra * 1000 : Math.max(50, gap) * (1L << i))); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } continue; }
            return r.statusCode() >= 200 && r.statusCode() < 300 ? new Object[]{ true, null } : new Object[]{ false, r.statusCode() }; }
    }
    /** 한 채널 발송 — [ok, detail, demo] */
    Object[] deliver(String tid, JsonNode ch, String event, JsonNode payload) throws Exception {
        ObjectNode body = card(event, payload);
        if (truthy(get(g(ch, "meta"), "demo"))) { addRun(tid, O().put("ch", s(ch, "label")).put("event", event).put("title", body.at("/attachments/0/content/body/1/text").asText()).put("demo", true)); return new Object[]{ true, null, true }; }
        Object[] r = post(dec(s(ch, "enc"), aad(tid, "teams_webhook", s(ch, "id"))), body); boolean ok = (Boolean) r[0];
        T(tid, () -> { ObjectNode m = db.q1("select meta from conn_secret where tenant_id = $1 and id = $2 for update", tid, s(ch, "id")); if (m == null) return null; ObjectNode meta = g(m, "meta").isObject() ? (ObjectNode) g(m, "meta") : O();
            if (ok) { meta.put("lastOk", kst(Instant.now())).put("fails", 0).put("err", ""); } else { meta.put("fails", (long) Math.max(0, num(g(meta, "fails")) >= 0 && Double.isFinite(num(g(meta, "fails"))) ? num(g(meta, "fails")) : 0) + 1); if (meta.get("fails").asLong() >= 3 && !truthy(meta.get("err"))) { meta.put("err", "발송 실패(" + r[1] + ")"); audit(tid, "system", "teams.channel.err", map("id", s(ch, "id"), "detail", String.valueOf(r[1]))); } }
            db.x("update conn_secret set meta = $3 where tenant_id = $1 and id = $2", tid, s(ch, "id"), meta); return null; });
        ObjectNode run = O().put("ch", s(ch, "label")).put("event", event).put("ok", ok); if (!ok) run.put("detail", String.valueOf(r[1])); addRun(tid, run); return new Object[]{ ok, r[1], false };
    }
    final Map<String, java.util.concurrent.ExecutorService> queues = new ConcurrentHashMap<>();
    void enqueue(String tid, JsonNode ch, String event, JsonNode payload) {
        queues.computeIfAbsent(s(ch, "id"), k -> java.util.concurrent.Executors.newSingleThreadExecutor(r0 -> { Thread t0 = new Thread(r0, "teams-" + k); t0.setDaemon(true); return t0; }))
            .submit(() -> { try { deliver(tid, ch, event, payload); } catch (Exception e) { /* Node log.error */ } finally { try { Thread.sleep(gap); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } } });
    }
    /** 내부 발송 — Slack 알림과 같은 이벤트 지점에서 부른다. 반환: 대기열에 넣은 채널 수 */
    public int notify(String tid, String event, JsonNode payload) throws Exception {
        if (!EVENTS.contains(event)) throw E("teams_bad_event");
        Object[] L0 = T(tid, () -> load(tid)); JsonNode feat = get(g((JsonNode) L0[1], "cfg"), "features"); if (feat != null && get(feat, "notify") != null && get(feat, "notify").isBoolean() && !get(feat, "notify").asBoolean()) return 0;
        List<ObjectNode> L = T(tid, () -> db.q("select id, label, meta, enc from conn_secret where tenant_id = $1 and kind = 'teams_webhook'", tid)); int n = 0;
        for (ObjectNode ch : L) { boolean has = false; for (JsonNode e : arr(get(g(ch, "meta"), "events"))) if (event.equals(e.asText())) has = true; if (has) { enqueue(tid, ch, event, payload); n++; } } return n;
    }

    // ── 기관 문서 ──
    interface Edit { JsonNode run(ObjectNode doc); }
    JsonNode docEdit(String tid, Edit fn) throws Exception {
        ObjectNode r = db.q1("select doc from tenant_state where tenant_id = $1 for update", tid); if (r == null) return null; JsonNode d0 = crypt.open(g(r, "doc"), tid); ObjectNode doc = d0 != null && d0.isObject() ? (ObjectNode) d0 : O();
        JsonNode out = fn.run(doc); if (out == null) return null; String s0 = crypt.seal(doc, tid).toString(); db.x("update tenant_state set doc = $2::jsonb, rev = rev + 1, bytes = $3, updated_at = now() where tenant_id = $1", tid, s0, s0.length()); return out;
    }
    static ObjectNode[] itemOf(JsonNode doc, String cid, String iid) {
        JsonNode cl = null; for (JsonNode x : arr(get(doc, "classes"))) if (truthy(x) && cid.equals(S(get(x, "id")))) { cl = x; break; } if (cl == null) return null;
        JsonNode it = null; for (JsonNode x : arr(get(cl, "curriculum"))) if (truthy(x) && iid.equals(S(get(x, "id")))) { it = x; break; } return it == null || !it.isObject() || !cl.isObject() ? null : new ObjectNode[]{ (ObjectNode) cl, (ObjectNode) it };
    }

    // ── JSON 경로 ──
    static JsonNode body(byte[] raw, int max) { return DdWeb.readBody(raw, max); }
    Object addChannel(HttpServletRequest req, HttpServletResponse res, byte[] raw) throws Exception {
        Map<String, Object> a = needAdmin(req); JsonNode b = body(raw, 8192); String t0 = tid(a);
        String name = trim(str(get(b, "name"), 60)); if (name.isEmpty() || name.length() > 40) throw E("teams_input", map("field", "name"));
        List<String> events = new ArrayList<>(); if (get(b, "events") != null && get(b, "events").isArray()) { for (JsonNode x : get(b, "events")) events.add(egovframework.didisam.cmm.Js.str(x)); } else events.add("notice"); for (String x : events) if (!EVENTS.contains(x)) throw E("teams_bad_event");
        long n = T(t0, () -> db.q1("select count(*)::int n from conn_secret where tenant_id = $1 and kind = 'teams_webhook'", t0)).get("n").asLong(); if (n >= 10) throw E("teams_limit");
        String id = rid("ch_"), mask, secret; boolean demo = false;
        if (truthy(get(b, "url"))) { URI u = checkHook(egovframework.didisam.cmm.Js.str(get(b, "url"))); if (u == null) throw E("teams_webhook_url");
            Object[] r = post(u.toString(), card("test", O().put("title", "디디쌤 알림 채널이 연결되었습니다").put("text", "「" + name + "」 채널로 공지 · 마감 · 승인 요청 알림을 보냅니다."))); if (!(Boolean) r[0]) throw E("teams_webhook_fail", map("detail", r[1]));
            mask = maskUrl(u); secret = u.toString(); }
        else { if (live && !truthy(get(b, "demo"))) throw E("teams_webhook_url"); mask = "시연 채널"; secret = "demo"; demo = true; }
        ObjectNode meta = O(); ArrayNode ev = meta.putArray("events"); events.forEach(ev::add); meta.put("lastOk", demo ? "" : kst(Instant.now())).put("err", "").put("fails", 0); if (demo) meta.put("demo", true);
        final boolean dm = demo; final String mk = mask, sc = secret;
        T(t0, () -> db.x("insert into conn_secret (id, tenant_id, kind, label, mask, meta, enc) values ($1, $2, $3, $4, $5, $6, $7)", id, t0, "teams_webhook", name, mk, meta, enc(sc, aad(t0, "teams_webhook", id)))); audit(t0, email(a), "teams.channel.add", map("id", id, "demo", dm));
        if (demo) addRun(t0, O().put("ch", name).put("event", "test").put("demo", true).put("title", "시연 채널 등록"));
        res.setStatus(201); ObjectNode o = O().put("id", id).put("name", name).put("mask", mask); o.set("events", ev); o.set("lastOk", meta.get("lastOk")); o.put("kind", demo ? "demo" : "workflow"); return o;
    }
    Object patchChannel(HttpServletRequest req, byte[] raw, String id) throws Exception {
        Map<String, Object> a = needAdmin(req); JsonNode b = body(raw, 4096); String t0 = tid(a);
        return T(t0, () -> { ObjectNode r = db.q1("select label, meta from conn_secret where tenant_id = $1 and id = $2 and kind = 'teams_webhook' for update", t0, id); if (r == null) throw E("teams_none");
            String label = s(r, "label"); ObjectNode meta = g(r, "meta").isObject() ? (ObjectNode) g(r, "meta") : O();
            if (!undef(get(b, "name"))) { String n0 = trim(str(get(b, "name"), 60)); if (n0.isEmpty() || n0.length() > 40) throw E("teams_input", map("field", "name")); label = n0; }
            if (!undef(get(b, "events"))) { JsonNode ev = get(b, "events"); if (!ev.isArray()) throw E("teams_bad_event"); LinkedHashSet<String> L = new LinkedHashSet<>(); for (JsonNode x : ev) { if (!x.isTextual() || !EVENTS.contains(x.textValue())) throw E("teams_bad_event"); L.add(x.textValue()); } ArrayNode e2 = F.arrayNode(); L.forEach(e2::add); meta.set("events", e2); }
            db.x("update conn_secret set label = $3, meta = $4 where tenant_id = $1 and id = $2", t0, id, label, meta); audit(t0, email(a), "teams.channel.edit", map("id", id));
            ObjectNode o = O().put("ok", true).put("id", id).put("name", label); o.set("events", g(meta, "events")); return o; });
    }
    Object delChannel(HttpServletRequest req, String id) throws Exception { Map<String, Object> a = needAdmin(req); String t0 = tid(a);
        return T(t0, () -> { int n = db.x("delete from conn_secret where tenant_id = $1 and id = $2 and kind = 'teams_webhook'", t0, id); if (n == 0) throw E("teams_none"); audit(t0, email(a), "teams.channel.del", map("id", id)); return O().put("ok", true); }); }
    Object testChannel(HttpServletRequest req, byte[] raw) throws Exception {
        Map<String, Object> a = needAdmin(req); JsonNode b = body(raw, 2048); String t0 = tid(a);
        ObjectNode ch = T(t0, () -> db.q1("select id, label, meta, enc from conn_secret where tenant_id = $1 and id = $2 and kind = 'teams_webhook'", t0, str(get(b, "channelId"), 40))); if (ch == null) throw E("teams_none");
        Object[] r = deliver(t0, ch, "test", O().put("title", "디디쌤 연결 시험").put("text", "이 카드가 보이면 Teams 채널 알림이 정상입니다.")); if (!(Boolean) r[0]) throw E("teams_webhook_fail", map("detail", r[1]));
        boolean dm = (Boolean) r[2]; ObjectNode o = O().put("ok", true).put("at", kst(Instant.now())).put("note", dm ? "시연 채널이라 실제로 보내지 않고 최근 실행에 기록했습니다." : "시험 카드를 보냈습니다 — 채널에서 확인하세요"); if (dm) o.put("demo", true); return o;
    }
    Object putSettings(HttpServletRequest req, byte[] raw) throws Exception {
        Map<String, Object> a = needAdmin(req); JsonNode b = body(raw, 8192); String t0 = tid(a);
        T(t0, () -> { ObjectNode r = db.q1("select cfg from conn_teams_cfg where tenant_id = $1 for update", t0); ObjectNode cur = r != null && g(r, "cfg").isObject() ? (ObjectNode) g(r, "cfg") : O();
            JsonNode bf = get(b, "features"); if (truthy(bf) && bf.isObject()) { ObjectNode f = truthy(cur.get("features")) && cur.get("features").isObject() ? ((ObjectNode) cur.get("features")).deepCopy() : O(); for (String k : new String[]{ "notify", "meeting", "learner" }) if (get(bf, k) != null && get(bf, k).isBoolean()) f.set(k, get(bf, k)); cur.set("features", f); }
            JsonNode m = get(b, "meetingDefaults"); if (truthy(m) && m.isObject()) { double att = Math.round(num(get(m, "attMin") == null ? F.missingNode() : get(m, "attMin")));
                if (!undef(get(m, "attMin")) && !(att >= 0 && att <= 600)) throw E("teams_input", map("field", "attMin"));
                ObjectNode md = O().put("lobby", "everyone".equals(S(get(m, "lobby"))) ? "everyone" : "organization").put("recordAuto", false);
                if (undef(get(m, "attMin"))) { JsonNode pv = get(cur.get("meetingDefaults"), "attMin"); md.set("attMin", nullish(pv) ? F.numberNode(10) : pv); } else md.set("attMin", numNode(att)); cur.set("meetingDefaults", md); }
            JsonNode ev = get(b, "events"); if (truthy(ev) && ev.isObject()) { int k = 0; for (Map.Entry<String, JsonNode> e : entries(ev)) { if (k++ >= 10) break; JsonNode L = e.getValue();
                if (!L.isArray()) throw E("teams_bad_event"); LinkedHashSet<String> S0 = new LinkedHashSet<>(); for (JsonNode x : L) { if (!x.isTextual() || !EVENTS.contains(x.textValue())) throw E("teams_bad_event"); S0.add(x.textValue()); } ArrayNode a2 = F.arrayNode(); S0.forEach(a2::add);
                int n = db.x("update conn_secret set meta = jsonb_set(meta, '{events}', $3::jsonb) where tenant_id = $1 and id = $2 and kind = 'teams_webhook'", t0, e.getKey(), a2.toString()); if (n == 0) throw E("teams_none"); } }
            db.x("insert into conn_teams_cfg (tenant_id, cfg) values ($1, $2) on conflict (tenant_id) do update set cfg = excluded.cfg, updated_at = now()", t0, cur); return null; });
        List<String> ks = new ArrayList<>(); b.fieldNames().forEachRemaining(ks::add); audit(t0, email(a), "teams.settings", map("keys", ks.subList(0, Math.min(5, ks.size())))); return status(a);
    }
    Object putDemo(HttpServletRequest req, byte[] raw) throws Exception {
        Map<String, Object> a = needAdmin(req); JsonNode b = body(raw, 1024); boolean on = !(get(b, "on") != null && get(b, "on").isBoolean() && !get(b, "on").asBoolean()); String t0 = tid(a);
        T(t0, () -> db.x("insert into conn_teams_cfg (tenant_id, demo) values ($1, $2) on conflict (tenant_id) do update set demo = excluded.demo, updated_at = now()", t0, on)); audit(t0, email(a), on ? "teams.connect" : "teams.disconnect", map("demo", true)); return status(a);
    }
    Object disconnect(HttpServletRequest req) throws Exception {
        Map<String, Object> a = needOwner(req); String t0 = tid(a);
        ObjectNode out = T(t0, () -> { List<ObjectNode> L = db.q("delete from conn_secret where tenant_id = $1 returning id, kind", t0); db.x("delete from conn_ms_org where tenant_id = $1", t0); db.x("delete from conn_teams_cfg where tenant_id = $1", t0);
            long ch = L.stream().filter(x -> "teams_webhook".equals(s(x, "kind"))).count(), ac = L.stream().filter(x -> "teams_refresh".equals(s(x, "kind"))).count();
            ObjectNode o = O().put("ok", true); o.putObject("removed").put("channels", ch).put("accounts", ac); o.put("note", "Microsoft 쪽 앱 동의 철회는 Entra 관리 센터 › 엔터프라이즈 애플리케이션에서 디디쌤 앱을 삭제하십시오."); return o; });
        audit(t0, email(a), "teams.disconnect", map("channels", out.at("/removed/channels").asLong(), "accounts", out.at("/removed/accounts").asLong())); runs.remove(t0); return out;
    }
    Object delAccount(HttpServletRequest req, String id) throws Exception { Map<String, Object> a = needAny(req); String t0 = tid(a);
        return T(t0, () -> { ObjectNode r = db.q1("select owner_user::text owner_user from conn_secret where tenant_id = $1 and id = $2 and kind = 'teams_refresh'", t0, id); if (r == null) throw E("teams_none");
            if (!String.valueOf(a.get("uid")).equals(s(r, "owner_user")) && !"owner".equals(a.get("role"))) throw E("teams_role"); db.x("delete from conn_secret where tenant_id = $1 and id = $2", t0, id); audit(t0, email(a), "teams.account.unlink", map("id", id)); return O().put("ok", true); }); }
    Object putSso(HttpServletRequest req, byte[] raw) throws Exception {
        Map<String, Object> a = needOwner(req); JsonNode b = body(raw, 1024); if (!live) throw E("teams_unset"); String t0 = tid(a); String ty = typeOf(a);
        T(t0, () -> { ObjectNode o = db.q1("select sso from conn_ms_org where tenant_id = $1 for update", t0); if (o == null) throw E("teams_consent"); JsonNode so = g(o, "sso");
            ObjectNode sso = O().put("operator", get(b, "operator") != null && get(b, "operator").isBoolean() ? get(b, "operator").asBoolean() : truthy(get(so, "operator"))).put("learner", get(b, "learner") != null && get(b, "learner").isBoolean() ? get(b, "learner").asBoolean() && SSO_TYPES.contains(ty) : truthy(get(so, "learner")));
            db.x("update conn_ms_org set sso = $2 where tenant_id = $1", t0, sso); return null; }); audit(t0, email(a), "teams.sso", map()); return status(a);
    }
    static Instant parseT(JsonNode v) { String s0 = nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v); if (!s0.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}.*")) return null;
        try { return OffsetDateTime.parse(s0).toInstant(); } catch (Exception e) { /* 다음 */ } try { return Instant.parse(s0); } catch (Exception e) { /* 다음 */ } try { return LocalDateTime.parse(s0).atZone(ZoneId.systemDefault()).toInstant(); } catch (Exception e) { return null; } }
    static String iso(Instant t) { return java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC).format(t); }
    Object createMeeting(HttpServletRequest req, HttpServletResponse res, byte[] raw) throws Exception {
        Map<String, Object> a = needAny(req); JsonNode b = body(raw, 8192); String t0 = tid(a);
        String subject = trim(str(get(b, "subject"), 200)); if (subject.isEmpty() || subject.length() > 120) throw E("teams_input", map("field", "subject"));
        Instant s0 = parseT(get(b, "start")), e0 = parseT(get(b, "end")); if (s0 == null || e0 == null || !e0.isAfter(s0) || e0.toEpochMilli() - s0.toEpochMilli() > 24 * 3600e3) throw E("teams_time");
        String classId = str(get(b, "classId"), 60), itemId = str(get(b, "itemId"), 60);
        if (live) throw E("teams_unset"); /* Java 1차: Graph 회의 만들기는 Node 서버(키 설정 시) — 남은 항목 */
        String id = rid("tm_"), joinUrl = "/learner.html#live-demo";
        boolean linked = T(t0, () -> { db.x("insert into conn_teams_meeting (id, tenant_id, class_id, item_id, account_id, ms_id, join_url, subject, start_at, end_at, demo, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10::timestamptz,$11,$12)", id, t0, classId, itemId, "", "", joinUrl, subject, iso(s0), iso(e0), true, email(a));
            JsonNode ok = !classId.isEmpty() && !itemId.isEmpty() && !(get(b, "docLink") != null && get(b, "docLink").isBoolean() && !get(b, "docLink").asBoolean()) ? docEdit(t0, doc -> { ObjectNode[] x = itemOf(doc, classId, itemId); if (x == null) return null; x[1].put("url", joinUrl); x[1].putObject("teams").put("mid", id).put("joinUrl", joinUrl).put("accountId", "").put("demo", true); return F.booleanNode(true); }) : null;
            return ok != null; });
        audit(t0, email(a), "teams.meeting.create", map("id", id, "demo", true, "cls", classId, "item", itemId));
        res.setStatus(201); return O().put("id", id).put("joinUrl", joinUrl).put("start", iso(s0)).put("end", iso(e0)).put("mode", "demo").put("linked", linked);
    }
    ObjectNode meetingOf(String t0, String id) throws Exception { ObjectNode m = T(t0, () -> db.q1("select * from conn_teams_meeting where tenant_id = $1 and id = $2", t0, id)); if (m == null) throw E("teams_none"); return m; }
    void liveMeeting(ObjectNode m) { if (!truthy(g(m, "demo"))) throw E("teams_unset"); }
    Object patchMeeting(HttpServletRequest req, byte[] raw, String id) throws Exception {
        Map<String, Object> a = needAny(req); JsonNode b = body(raw, 4096); String t0 = tid(a); ObjectNode m = meetingOf(t0, id);
        String subject = !undef(get(b, "subject")) ? trim(str(get(b, "subject"), 200)) : s(m, "subject"); if (subject.isEmpty() || subject.length() > 120) throw E("teams_input", map("field", "subject"));
        Instant s0 = !undef(get(b, "start")) ? parseT(get(b, "start")) : Instant.parse(s(m, "start_at")), e0 = !undef(get(b, "end")) ? parseT(get(b, "end")) : Instant.parse(s(m, "end_at"));
        if (s0 == null || e0 == null || !e0.isAfter(s0) || e0.toEpochMilli() - s0.toEpochMilli() > 24 * 3600e3) throw E("teams_time"); liveMeeting(m);
        T(t0, () -> db.x("update conn_teams_meeting set subject = $3, start_at = $4::timestamptz, end_at = $5::timestamptz where tenant_id = $1 and id = $2", t0, id, subject, iso(s0), iso(e0))); audit(t0, email(a), "teams.meeting.edit", map("id", id));
        return O().put("ok", true).put("id", id).put("start", iso(s0)).put("end", iso(e0));
    }
    Object delMeeting(HttpServletRequest req, String id) throws Exception {
        Map<String, Object> a = needAny(req); String t0 = tid(a); ObjectNode m = meetingOf(t0, id); liveMeeting(m);
        T(t0, () -> { db.x("delete from conn_teams_meeting where tenant_id = $1 and id = $2", t0, id);
            if (truthy(g(m, "class_id")) && truthy(g(m, "item_id")) && !"0".equals(req.getParameter("doc"))) docEdit(t0, doc -> { ObjectNode[] x = itemOf(doc, s(m, "class_id"), s(m, "item_id")); if (x == null) return null; if (s(m, "join_url").equals(S(x[1].get("url")))) x[1].put("url", ""); x[1].remove("teams"); return F.booleanNode(true); });
            return null; }); audit(t0, email(a), "teams.meeting.delete", map("id", id)); return O().put("ok", true);
    }
    static byte[] sha(String s0) { try { return MessageDigest.getInstance("SHA-256").digest(s0.getBytes(StandardCharsets.UTF_8)); } catch (Exception e) { throw new IllegalStateException(e); } }
    static double hash01(String s0) { byte[] h = sha(s0); long v = ((h[0] & 0xffL) << 24) | ((h[1] & 0xffL) << 16) | ((h[2] & 0xffL) << 8) | (h[3] & 0xffL); return v / 4294967296.0; }
    static String label(String tid, String mid) { byte[] h = sha(tid + "|" + mid); return "L-" + String.format("%02x%02x", h[0], h[1]); }
    static String hm(long ms) { return Instant.ofEpochMilli(ms).plusSeconds(9 * 3600).atOffset(ZoneOffset.UTC).toLocalTime().toString().substring(0, 5); }
    Object syncAttendance(HttpServletRequest req, String id) throws Exception {
        Map<String, Object> a = needAny(req); String t0 = tid(a); ObjectNode m = meetingOf(t0, id);
        JsonNode doc = T(t0, () -> { ObjectNode r = db.q1("select doc from tenant_state where tenant_id = $1", t0); return r == null ? O() : crypt.open(g(r, "doc"), t0); });
        ObjectNode[] x = truthy(g(m, "class_id")) && truthy(g(m, "item_id")) ? itemOf(doc, s(m, "class_id"), s(m, "item_id")) : null;
        Object[] L0 = T(t0, () -> load(t0)); JsonNode ia = x == null ? null : x[1].get("attMin");
        double attMin; if (ia != null && !ia.isNull() && !(ia.isTextual() && ia.textValue().isEmpty()) && Double.isFinite(num(ia))) attMin = num(ia); else { JsonNode d0 = get(get(g((JsonNode) L0[1], "cfg"), "meetingDefaults"), "attMin"); attMin = nullish(d0) ? 10 : num(d0); }
        long start = Instant.parse(s(m, "start_at")).toEpochMilli(); liveMeeting(m);
        List<JsonNode> L = x != null ? arr(x[0].get("learners")) : new ArrayList<>(); if (L.size() > 300) L = L.subList(0, 300); double dur = (Instant.parse(s(m, "end_at")).toEpochMilli() - start) / 1000.0; ArrayNode matched = F.arrayNode();
        for (JsonNode mn : L) { String mid = key(mn); double h = hash01(s(m, "id") + mid); long sec = Math.round(dur * (h < 0.12 ? 0.05 : 0.6 + h * 0.4)); long first = start + Math.round((h < 0.25 ? h * 60 : h * 4) * 60e3);
            String sug = sec < attMin * 60 ? "결석" : first > start + 10 * 60e3 ? "지각" : "출석"; matched.addObject().put("lid", mid).put("label", label(t0, mid)).put("suggest", sug).put("minutes", Math.round(sec / 60.0)).put("firstJoin", hm(first)); }
        ObjectNode o = O().put("reportId", "demo-" + s(m, "id")).put("meetingStart", iso(Instant.parse(s(m, "start_at")))).put("meetingEnd", iso(Instant.parse(s(m, "end_at")))); o.set("matched", matched); o.put("unmatched", 0).put("mode", "demo").put("note", "시연 데이터"); return o;
    }
    Object applyAttendance(HttpServletRequest req, byte[] raw, String id) throws Exception {
        Map<String, Object> a = needAny(req); JsonNode b = body(raw, 65536); String t0 = tid(a); ObjectNode m = meetingOf(t0, id);
        if (!truthy(g(m, "class_id")) || !truthy(g(m, "item_id"))) throw E("teams_item");
        List<JsonNode> rows = get(b, "rows") != null && get(b, "rows").isArray() ? arr(get(b, "rows")) : new ArrayList<>(); if (rows.size() > 1000) rows = rows.subList(0, 1000);
        for (JsonNode r : rows) if (!truthy(r) || get(r, "value") == null || !ATT.contains(S(get(r, "value"))) || !get(r, "value").isTextual() || get(r, "lid") == null || !get(r, "lid").isTextual()) throw E("teams_input", map("field", "rows"));
        final List<JsonNode> R0 = rows; String mi = s(m, "item_id");
        JsonNode k = T(t0, () -> docEdit(t0, doc -> { ObjectNode[] x = itemOf(doc, s(m, "class_id"), mi); if (x == null) return null; List<String> L = new ArrayList<>(); for (JsonNode y : arr(x[0].get("learners"))) L.add(key(y));
            if (!truthy(x[0].get("att")) || !x[0].get("att").isObject()) x[0].putObject("att"); ObjectNode att = (ObjectNode) x[0].get("att"); if (!truthy(att.get(mi)) || !att.get(mi).isObject()) att.putObject(mi); ObjectNode A = (ObjectNode) att.get(mi);
            long n = 0; for (JsonNode r : R0) if (L.contains(get(r, "lid").textValue())) { A.set(get(r, "lid").textValue(), get(r, "value")); n++; } return F.numberNode(n); }));
        if (k == null) throw E("teams_item"); audit(t0, email(a), "teams.att.apply", map("id", id, "n", k.asLong(), "demo", truthy(g(m, "demo"))));
        ObjectNode o = O().put("ok", true).put("applied", k.asLong()); if (truthy(g(m, "demo"))) o.put("note", "시연 데이터"); return o;
    }
    Object listMeetings(HttpServletRequest req) throws Exception {
        Map<String, Object> a = needAny(req); String t0 = tid(a); List<ObjectNode> L = T(t0, () -> db.q("select id, class_id, item_id, account_id, join_url, subject, start_at, end_at, demo from conn_teams_meeting where tenant_id = $1 order by start_at desc limit 100", t0));
        ArrayNode ms = F.arrayNode(); for (ObjectNode m : L) { ObjectNode o = ms.addObject(); o.set("id", g(m, "id")); o.set("classId", g(m, "class_id")); o.set("itemId", g(m, "item_id")); o.set("accountId", g(m, "account_id")); o.set("joinUrl", g(m, "join_url")); o.set("subject", g(m, "subject")); o.set("start", g(m, "start_at")); o.set("end", g(m, "end_at")); o.put("mode", truthy(g(m, "demo")) ? "demo" : "live"); }
        return O().set("meetings", ms);
    }
    Object notifyRoute(HttpServletRequest req, byte[] raw) throws Exception {
        Map<String, Object> a = needAny(req); JsonNode b = body(raw, 8192); String event = S(get(b, "event")); if (!EVENTS.contains(event)) throw E("teams_bad_event");
        ObjectNode p = O(); p.set("title", get(b, "title") == null ? F.nullNode() : get(b, "title")); p.set("text", get(b, "text") == null ? F.nullNode() : get(b, "text")); p.set("link", get(b, "link") == null ? F.nullNode() : get(b, "link"));
        int q = notify(tid(a), event, p); if (q > 0) audit(tid(a), email(a), "teams.notify", map("event", event, "n", q)); return O().put("ok", true).put("queued", q);
    }

    // ── 리다이렉트(조직 연결 · 회의 계정 · SSO) — Java 1차는 키 없음(err-unset)만, 키가 있으면 Node 서버 경로 사용 ──
    static void redirect(HttpServletResponse res, String loc) { res.setStatus(302); res.setHeader("location", loc); res.setHeader("cache-control", "no-store"); res.setHeader("referrer-policy", "no-referrer"); }
    static final Pattern TID_RE = Pattern.compile("^tn_[a-z0-9]{8,16}$");
    public void redirectRoute(String path, HttpServletRequest req, HttpServletResponse res) throws Exception {
        if (path.startsWith("/api/conn/teams/")) { Map<String, Object> a = null; try { a = auth.need(req); } catch (Exception e) { a = null; }
            if (path.endsWith("/consent/start")) { if (a == null) { redirect(res, "/#conn=teams:err-auth"); return; } if (!"owner".equals(a.get("role"))) { redirect(res, "/#conn=teams:err-role"); return; } }
            else if (path.endsWith("/account/start") && a == null) { redirect(res, "/#conn=teams:err-auth"); return; }
            redirect(res, "/#conn=teams:" + (path.endsWith("/start") ? "err-unset" : "err-state")); return; }
        if (path.startsWith("/api/oauth/microsoft/")) { redirect(res, "/#oauth=" + (path.endsWith("/start") ? "err:unset" : "err:state")); return; }
        Matcher m = Pattern.compile("^/api/pub/([^/]+)/loauth/microsoft/start$").matcher(path);
        if (m.matches()) { String t0 = m.group(1); if (!TID_RE.matcher(t0).matches()) throw new DdException(404, "없는 기관입니다.", "tenant"); redirect(res, "/learner.html?t=" + java.net.URLEncoder.encode(t0, StandardCharsets.UTF_8) + "&oa=err-unset#login"); return; }
        redirect(res, "/learner.html?oa=err-state#login");
    }
    public Object opLinkStart(HttpServletRequest req) throws Exception { auth.need(req); throw E("teams_unset"); }

    // ── 경로 표 ──
    static final Pattern P_CH = Pattern.compile("^/api/conn/teams/channels/(ch_[a-z0-9]{10})$"), P_AC = Pattern.compile("^/api/conn/teams/account/(ac_[a-z0-9]{10})$"), P_MT = Pattern.compile("^/api/conn/teams/meetings/(tm_[a-z0-9]{10})(/attendance/(sync|apply))?$");
    public Object route(HttpServletRequest req, HttpServletResponse res, byte[] raw) throws Exception {
        String p = req.getRequestURI(), m = req.getMethod(), k = m + " " + p;
        switch (k) {
            case "GET /api/conn/teams": return status(needAny(req));
            case "DELETE /api/conn/teams": return disconnect(req);
            case "PUT /api/conn/teams/settings": return putSettings(req, raw);
            case "PUT /api/conn/teams/demo": return putDemo(req, raw);
            case "POST /api/conn/teams/channels": return addChannel(req, res, raw);
            case "POST /api/conn/teams/test": return testChannel(req, raw);
            case "POST /api/conn/teams/notify": return notifyRoute(req, raw);
            case "PUT /api/conn/teams/sso": return putSso(req, raw);
            case "PUT /api/conn/teams/learner": needAdmin(req); throw E("teams_phase2");
            case "GET /api/conn/teams/meetings": return listMeetings(req);
            case "POST /api/conn/teams/meetings": return createMeeting(req, res, raw);
            default: break;
        }
        Matcher x = P_CH.matcher(p); if (x.matches()) { if ("PATCH".equals(m)) return patchChannel(req, raw, x.group(1)); if ("DELETE".equals(m)) return delChannel(req, x.group(1)); }
        x = P_AC.matcher(p); if (x.matches() && "DELETE".equals(m)) return delAccount(req, x.group(1));
        x = P_MT.matcher(p); if (x.matches()) { if (x.group(2) == null) { if ("PATCH".equals(m)) return patchMeeting(req, raw, x.group(1)); if ("DELETE".equals(m)) return delMeeting(req, x.group(1)); }
            else if ("POST".equals(m)) return "sync".equals(x.group(3)) ? syncAttendance(req, x.group(1)) : applyAttendance(req, raw, x.group(1)); }
        throw new DdException(404, "없는 주소입니다.", "not_found");
    }
}
