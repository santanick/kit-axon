package egovframework.didisam.sec.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdAiPrice;
import egovframework.didisam.cmm.DdCrypto;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.sec.service.SecService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** Node security.js 이식 — 권한(owner + 산타) · 서버 승인 기록(재인증 · 1회용 링크 15분 · Critical/High 2인) · 긴급 차단 3종(dry-run 기본 · 하루 3회 · 기능 끄기 TTL 4시간 · 사람만 해제 · LLM 미개입) · ingest(GUARD_TOKEN) · 감사 해시 체인 */
@Service("secService")
public class SecServiceImpl implements SecService {
    static final List<String> SEV = List.of("critical", "high", "medium", "low"), PRI = List.of("P0", "P1", "P2", "P3"), FST = List.of("open", "triage", "fixing", "fixed", "accepted", "false_positive"),
        DONE = List.of("fixed", "accepted", "false_positive"), ACTIONS = List.of("key_disable", "feature_off", "egress_block"), VERDICT = List.of("pending", "affected", "partial", "none", "control"), KINDS = List.of("finding", "threat", "scan", "pr", "card");
    static final int KILL_DAY_MAX = 3, FEATURE_TTL_MAX = 240, LINK_MIN = 15;
    static final Pattern TID_RE = Pattern.compile("^tn_[a-z0-9]{8,16}$"), ID_RE = Pattern.compile("^[\\w.:-]{1,80}$"), RULE_RE = Pattern.compile("^[\\w.-]{1,60}$"), CARD_RE = Pattern.compile("^CARD-\\d{4,}$"),
        BEARER = Pattern.compile("^Bearer\\s+(\\S{1,200})$", Pattern.CASE_INSENSITIVE), CTL = Pattern.compile("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]"), FORBID = Pattern.compile("(^|/)\\.github/workflows/|(^|/)CODEOWNERS$", Pattern.CASE_INSENSITIVE);
    static final String GENESIS = "0".repeat(64);
    /* 사고 대응(F8) — Node security.js INC_TYPES · PHASES · DEC_KINDS · incidentDraft와 같은 값 · 같은 문구 */
    static final List<String> INC_TYPES = List.of("key_leak", "cross_tenant", "pii_leak", "llmjacking", "other"), PHASES = List.of("detect", "contain", "report", "notify", "recover", "prevent"), DEC_KINDS = List.of("report", "notify", "public", "shutdown"),
        DRAFT_ITEMS = List.of("유출 항목", "유출 시점", "유출 경위", "피해 최소화 방법", "대응 조치", "피해 구제 절차", "연락처");
    static final int NOTIFY_H = 72;
    static final Map<String, String> PHASE_KO = Map.of("detect", "탐지", "contain", "격리", "report", "신고", "notify", "통지", "recover", "복구", "prevent", "재발 방지"),
        TYPE_KO = Map.of("key_leak", "키 · 비밀값 유출", "cross_tenant", "기관 간 데이터 노출", "pii_leak", "개인정보 유출", "llmjacking", "AI 키 무단 사용(LLMjacking)", "other", "기타 보안 사고"),
        KILL_INC = Map.of("key_disable", "key_leak", "feature_off", "llmjacking", "egress_block", "other"), KILL_KO = Map.of("key_disable", "키 비활성", "feature_off", "기관 기능 끄기", "egress_block", "외부 전송 차단");
    static final Pattern SC_MAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+"), SC_NUM = Pattern.compile("\\d{2,6}[- ]?\\d{3,7}[- ]?\\d{4}"), SC_KEY = Pattern.compile("(sk-|ghp_|AKIA|AIza)[\\w-]{8,}|[A-Za-z0-9_-]{32,}");
    /** 초안에는 개인정보 · 비밀값을 넣지 않는다(Node scrub과 같은 식) */
    static String scrub(String v) { String x = v == null ? "" : v; x = SC_MAIL.matcher(x).replaceAll("[가림]"); x = SC_NUM.matcher(x).replaceAll("[가림]"); return SC_KEY.matcher(x).replaceAll("[가림]"); }
    /** 개인정보 보호법 제34조 통지 항목 — 신고 · 정보주체 통지 초안(Node incidentDraft와 같은 문구) */
    static Map<String, Object> incidentDraft(String type, JsonNode sc, List<String> phases, String createdKst, String dueKst) {
        String tk = TYPE_KO.getOrDefault(type, TYPE_KO.get("other"));
        String data = trim(scrub(sc != null && sc.isObject() && !nullish(sc.get("data")) ? str(sc.get("data")) : "")); if (data.isEmpty()) data = "[확인 중 — 유출 항목을 기입합니다]";
        String period = trim(scrub(sc != null && sc.isObject() && !nullish(sc.get("period")) ? str(sc.get("period")) : "")); if (period.isEmpty()) period = "[확인 중]";
        int n = sc != null && sc.isObject() && sc.get("tenants") != null && sc.get("tenants").isArray() ? sc.get("tenants").size() : 0;
        List<String> done = new ArrayList<>(); for (String p : PHASES) if (phases.contains(p)) done.add(PHASE_KO.get(p));
        String acts = (done.isEmpty() ? "탐지 단계를 진행하고 있습니다." : String.join(" · ", done) + " 단계를 진행했습니다.") + " 원인을 차단하고 재발 방지 조치를 이어 가고 있습니다.";
        String minimize = "디디쌤 비밀번호를 변경해 주시고, 출처가 불분명한 문자 · 메일 · 링크와 본인을 사칭한 연락에 주의해 주십시오.";
        String relief = "피해가 발생했거나 의심되면 아래 연락처로 알려 주십시오. 확인 후 안내해 드립니다. 개인정보침해 신고센터(국번 없이 118)와 개인정보 분쟁조정위원회(1833-6972)에서도 상담 · 신청하실 수 있습니다.";
        String contact = "산타(주) 개인정보 보호 담당 · [대표 연락처 기입]";
        String notify = String.join("\n", "[정보주체 통지문(초안)] " + tk + " 안내", "",
            "산타(주)는 디디쌤 서비스에서 발생한 보안 사고로 이용자님의 개인정보가 유출되었을 가능성을 확인하여 「개인정보 보호법」 제34조에 따라 다음과 같이 알려 드립니다.", "",
            "1. 유출된 개인정보 항목: " + data, "2. 유출된 시점과 그 경위: " + period + " · " + tk + "(사고 인지 " + createdKst + " KST)", "3. 피해를 최소화하기 위하여 이용자님이 할 수 있는 방법: " + minimize,
            "4. 산타(주)의 대응 조치: " + acts, "5. 피해 구제 절차: " + relief, "6. 담당 부서 및 연락처: " + contact, "",
            "※ 이 문서는 초안입니다. 대표님 · 부대표 검토 후 발송합니다.");
        String report = String.join("\n", "[개인정보 유출 등 신고서(초안)] 개인정보보호위원회 · 한국인터넷진흥원 제출용", "",
            "- 신고 기한: " + dueKst + " KST(사고 인지 후 " + NOTIFY_H + "시간)", "- 사고 유형: " + tk, "- 유출 항목: " + data, "- 유출 시점: " + period, "- 유출 경위: " + tk + " · 사고 인지 " + createdKst + " KST",
            "- 영향 범위: 기관 " + n + "곳 · 정보주체 수 [확인 중]", "- 피해 최소화 방법: " + minimize, "- 대응 조치: " + acts, "- 피해 구제 절차: " + relief, "- 담당 부서 · 연락처: " + contact, "",
            "※ 이 문서는 초안입니다. 대표님 · 부대표 검토 후 제출합니다.");
        return M("notify", notify, "report", report, "items", DRAFT_ITEMS);
    }
    static final String M_KEY = "보안 점검으로 이 기관의 AI · 외부 연결 키 사용이 일시 중단되었습니다. 운영자에게 문의해 주십시오.", M_EGRESS = "보안 점검으로 이 기관의 외부 전송이 일시 차단되었습니다. 운영자에게 문의해 주십시오.", M_FEATURE = "보안 점검으로 이 기관의 AI 사용 한도가 일시 축소되었습니다. 잠시 후 다시 시도해 주십시오.";
    static final Map<String, List<String>> CTRL = Map.of(
        "injection", List.of("입력 · 출력 가드(aiguard) 규칙 추가", "도구 호출 허용 목록 점검", "회귀 프롬프트 추가"),
        "rce", List.of("영향 패키지 버전 고정 · 갱신", "실행 권한 최소화", "런타임 탐지 규칙 확인"),
        "xss", List.of("출력 이스케이프 점검", "CSP 위반 보고 확인", "회귀 UI 시험 추가"),
        "auth", List.of("세션 · 권한 검사 경로 점검", "RLS 정책 확인", "교차 테넌트 시험 추가"),
        "default", List.of("영향 판정 재확인", "패치 · 완화 적용", "회귀 시험 추가"));

    private final SecMapper mapper; private final TenantTx tx; private final DdRateLimiter rl; private final DdWeb web; private final AuthService auth;
    @Value("${SANTA_ADMIN_EMAILS:nick@didisam.com}") private String santaEnv = "nick@didisam.com";
    @Value("${GUARD_TOKEN:}") private String guardTok = "";
    @Value("${SECURITY_KILL_LIVE:}") private String killLive = "";
    @Value("${SECURITY_FEATURE_MIN:0}") private String featureMinS = "0";
    @Value("${SECURITY_DRY_SINCE:}") private String drySince = "";
    /** 첫 2주 dry-run 남은 날(Node dday) */
    Integer dday() { if (drySince == null || !drySince.matches("^\\d{4}-\\d{2}-\\d{2}$")) return null; long m = OffsetDateTime.parse(drySince + "T00:00:00+09:00").toInstant().toEpochMilli(); return (int) Math.max(0, 14 - Math.floorDiv(System.currentTimeMillis() - m, 86400000L)); }
    private final Map<String, Object[]> cache = new ConcurrentHashMap<>();
    public SecServiceImpl(SecMapper mapper, TenantTx tx, DdRateLimiter rl, DdWeb web, @Lazy AuthService auth) { this.mapper = mapper; this.tx = tx; this.rl = rl; this.web = web; this.auth = auth; }

    static DdException err(int st, String code, String msg) { return new DdException(st, msg, code); }
    boolean live() { return "1".equals(killLive); }
    long featureMin() { double d = num(featureMinS); return Double.isNaN(d) ? 0 : Math.max(0, Math.round(d)); }
    static String kday() { return kstToday(); }
    static String sha(String s) { return DdCrypto.sha(s); }
    /** Node chainHash: sha256(prev|ts|actor|action|target|detail) */
    public static String chainHash(String prev, String ts, String actor, String action, String target, String detail) { return sha(String.join("|", prev, ts, actor, action, target, detail)); }
    static String maskIp(String ip0) { String s = String.valueOf(ip0 == null ? "" : ip0).replaceFirst("^::ffff:", ""); if (s.matches("^\\d+\\.\\d+\\.\\d+\\.\\d+$")) return s.replaceFirst("\\.\\d+$", ".x"); if (s.contains(":")) { String[] p = s.split(":", -1); return String.join(":", Arrays.copyOfRange(p, 0, Math.min(3, p.length))) + ":x"; } return ""; }
    /** Node str(v, n): String(v ?? '') · 제어 문자 제거 · n자 */
    static String s(JsonNode v, int n) { String x = nullish(v) ? "" : str(v); return cut(CTL.matcher(x).replaceAll(""), n); }
    static double numOr(JsonNode v, double d) { if (nullish(v) || (v.isTextual() && v.textValue().isEmpty())) return d; double x = num(v); return Double.isNaN(x) || Double.isInfinite(x) ? d : x; }
    static ArrayNode arrS(JsonNode v, int n, int m) { ArrayNode a = F.arrayNode(); if (v == null || !v.isArray()) return a; for (int i = 0; i < Math.min(n, v.size()); i++) { String x = s(v.get(i), m); if (!x.isEmpty()) a.add(x); } return a; }
    static String isoOr(JsonNode v) { if (!truthy(v)) return null; String t = str(v); try { return OffsetDateTime.parse(t).toInstant().toString(); } catch (Exception e) { try { return Instant.parse(t).toString(); } catch (Exception e2) { return null; } } }
    static JsonNode J(String t) { return t == null ? F.nullNode() : parse(t); }
    static List<JsonNode> JL(List<String> l) { List<JsonNode> o = new ArrayList<>(); for (String t : l) o.add(parse(t)); return o; }
    static Map<String, Object> M(Object... kv) { Map<String, Object> m = new LinkedHashMap<>(); for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]); return m; }
    static int needOf(String sev) { return "critical".equals(sev) || "high".equals(sev) ? 2 : 1; }

    /* ── 권한 ── */
    Map<String, Object> owner(HttpServletRequest req) throws Exception {
        Map<String, Object> a = auth.need(req);
        if (!"owner".equals(a.get("role"))) throw err(403, "role", "정운영자만 볼 수 있습니다.");
        if (!DdAiPrice.santaSet(santaEnv).contains(String.valueOf(a.get("email")).toLowerCase(Locale.ROOT))) throw err(403, "santa", "산타 보안 담당(정운영자)만 쓸 수 있습니다.");
        rl.limit("sec:" + a.get("email"), 240, 60000L); return a;
    }
    /** 가디언 토큰: Authorization: Bearer 또는 x-guard-token(Node bearer와 같음) */
    static String bearer(HttpServletRequest req) { String h = req.getHeader("authorization"); if (h != null) { Matcher m = BEARER.matcher(h); if (m.find()) return m.group(1); } String g = req.getHeader("x-guard-token"); return g == null ? "" : cut(trim(g), 200); }
    Map<String, Object> guard(HttpServletRequest req) throws Exception {
        String g = guardTok == null ? "" : guardTok.trim();
        if (g.length() < 32) throw err(403, "guard_off", "가디언 서비스 토큰이 설정되지 않았습니다.");
        String t = bearer(req);
        if (t.isEmpty() || !MessageDigest.isEqual(MessageDigest.getInstance("SHA-256").digest(t.getBytes(StandardCharsets.UTF_8)), MessageDigest.getInstance("SHA-256").digest(g.getBytes(StandardCharsets.UTF_8)))) throw err(403, "guard", "가디언 서비스 토큰이 올바르지 않습니다.");
        rl.limit("sec:guard", 600, 60000L); return M("email", "agent:guardian", "agent", true);
    }
    Map<String, Object> ownerOrGuard(HttpServletRequest req) throws Exception { return bearer(req).isEmpty() ? owner(req) : guard(req); }
    void reauth(Map<String, Object> a, JsonNode pw) throws Exception {
        rl.limit("secre:" + a.get("uid"), 5, 600000L);
        String stored = mapper.selectPw((String) a.get("uid")); String p = nullish(pw) ? "" : str(pw);
        if (stored == null || p.isEmpty() || !DdCrypto.checkPw(p, stored)) throw err(401, "reauth", "재인증에 실패했습니다. 비밀번호를 확인해 주십시오.");
    }

    /* ── 감사 해시 체인(같은 트랜잭션 안에서 호출) ── */
    @Override public void signal(String action, String target, JsonNode detail) {
        try { tx.plain(() -> { audit("agent:guardian", "signal." + action, target, detail, null); return null; }); } catch (Exception e) { org.slf4j.LoggerFactory.getLogger(SecServiceImpl.class).error("sec signal {} {}", action, e.getMessage()); }
    }
    void audit(String actor, String action, String target, JsonNode detail, HttpServletRequest req) {
        mapper.lock(820821L);
        String prev = mapper.lastHash(); if (prev == null) prev = GENESIS;
        String ts = isoNow(); String d = detail == null ? "" : stringify(detail); String kind = actor.startsWith("agent:") ? "agent" : "user"; String tg = target == null ? "" : target;
        mapper.insertAudit(ts, actor, kind, action, tg, d, req == null ? "" : maskIp(web.ip(req)), prev, chainHash(prev, ts, actor, action, tg, d));
    }
    static ObjectNode O(Object... kv) { ObjectNode o = F.objectNode(); for (int i = 0; i < kv.length; i += 2) { Object v = kv[i + 1]; String k = (String) kv[i];
        if (v == null) o.putNull(k); else if (v instanceof Integer x) o.put(k, x); else if (v instanceof Long x) o.put(k, x); else if (v instanceof Boolean x) o.put(k, x); else if (v instanceof JsonNode x) o.set(k, x); else o.put(k, String.valueOf(v)); } return o; }
    Map<String, Object> verifyChain() {
        String prev = GENESIS; List<Map<String, Object>> rows = mapper.chainRows();
        for (Map<String, Object> r : rows) { String ts = (String) r.get("ts"); if (!prev.equals(r.get("prev_hash")) || !chainHash(prev, ts, (String) r.get("actor"), (String) r.get("action"), (String) r.get("target"), (String) r.get("detail")).equals(r.get("hash"))) return M("ok", false, "n", rows.size(), "brokenAt", ((Number) r.get("id")).intValue()); prev = (String) r.get("hash"); }
        return M("ok", true, "n", rows.size(), "brokenAt", null);
    }

    /* ── 긴급 차단 상태 ── */
    @Override public int tick() throws Exception {
        List<Map<String, Object>> rows = tx.plain(() -> { List<Map<String, Object>> r = mapper.expireKills(); for (Map<String, Object> x : r) audit("agent:ttl", "kill.expire", (String) x.get("id"), O("action", x.get("action"), "tenant", x.get("tenant_id")), null); return r; });
        if (!rows.isEmpty()) cache.clear(); return rows.size();
    }
    @Override public Kill gate(String tid) {
        Object[] hit = cache.get(tid); if (hit != null && (long) hit[0] > System.currentTimeMillis() - 5000) return (Kill) hit[1];
        Set<String> s = new HashSet<>(mapper.liveActions(tid)); Kill k = new Kill(s.contains("key_disable"), s.contains("feature_off"), s.contains("egress_block"));
        cache.put(tid, new Object[]{ System.currentTimeMillis(), k }); return k;
    }
    @Override public void preAi(Kill k) { if (k.key()) throw err(403, "sec_key_off", M_KEY); if (k.egress()) throw err(403, "sec_egress", M_EGRESS); }
    @Override public void postAi(Kill k, long calls) { if (k.feature() && calls > featureMin()) throw err(429, "sec_feature_off", M_FEATURE); }
    @Override public boolean keyBlocked(String tid) { Kill k = gate(tid); return k.key() || k.egress(); }
    @Override public boolean egressBlocked(String tid) { return gate(tid).egress(); }

    /* ── 라우트 ── */
    static final Pattern P_FIND = Pattern.compile("^/api/security/findings/([\\w.:-]{1,80})$"), P_CARDT = Pattern.compile("^/api/security/threats/([\\w.:-]{1,80})/card$"), P_APPR = Pattern.compile("^/api/security/prs/([\\w.:-]{1,80})/approve$"), P_REJ = Pattern.compile("^/api/security/prs/([\\w.:-]{1,80})/reject$"),
        P_CARD = Pattern.compile("^/api/security/cards/(CARD-\\d{4,})$"), P_REL = Pattern.compile("^/api/security/kill/(ks_[0-9a-f]{16})/release$"),
        P_ISTEP = Pattern.compile("^/api/security/incidents/(inc_[0-9a-f]{16})/step$"), P_IDEC = Pattern.compile("^/api/security/incidents/(inc_[0-9a-f]{16})/decision$"), P_IDRAFT = Pattern.compile("^/api/security/incidents/(inc_[0-9a-f]{16})/draft$");
    @Override public Object route(String m, String p, HttpServletRequest req, byte[] body) throws Exception {
        switch (m + " " + p) {
            case "GET /api/security/summary": return summary(req);
            case "GET /api/security/findings": return findings(req);
            case "GET /api/security/threats": owner(req); return M("rows", JL(mapper.threats(200)));
            case "GET /api/security/prs": owner(req); return M("rows", JL(mapper.prList(false)));
            case "GET /api/security/cards": owner(req); return M("rows", JL(mapper.cardList()));
            case "GET /api/security/kill": return killList(req);
            case "POST /api/security/kill": return kill(req, body);
            case "POST /api/security/ingest": return ingest(req, body);
            case "POST /api/security/approve-link": return approveLink(req, body);
            case "GET /api/security/incidents": owner(req); return M("rows", JL(mapper.incidentList()), "notifyHours", NOTIFY_H, "phases", PHASES, "types", INC_TYPES, "decisionKinds", DEC_KINDS);
            case "POST /api/security/incidents": return incCreateApi(req, body);
            case "GET /api/security/audit": { owner(req); Map<String, Object> o = verifyChain(); o.put("rows", JL(mapper.auditRows())); return o; }
            default: break;
        }
        Matcher x;
        if ("PATCH".equals(m) && (x = P_FIND.matcher(p)).matches()) return patchFinding(req, body, x.group(1));
        if ("POST".equals(m) && (x = P_CARDT.matcher(p)).matches()) return threatCard(req, x.group(1));
        if ("POST".equals(m) && (x = P_APPR.matcher(p)).matches()) return approve(req, body, x.group(1));
        if ("POST".equals(m) && (x = P_REJ.matcher(p)).matches()) return reject(req, body, x.group(1));
        if ("GET".equals(m) && (x = P_CARD.matcher(p)).matches()) { owner(req); String c = mapper.cardJson(x.group(1)); if (c == null) throw err(404, "not_found", "대책 카드를 찾지 못했습니다."); return M("card", parse(c)); }
        if ("POST".equals(m) && (x = P_REL.matcher(p)).matches()) return release(req, body, x.group(1));
        if ("POST".equals(m) && (x = P_ISTEP.matcher(p)).matches()) return incStep(req, body, x.group(1));
        if ("POST".equals(m) && (x = P_IDEC.matcher(p)).matches()) return incDecision(req, body, x.group(1));
        if ("GET".equals(m) && (x = P_IDRAFT.matcher(p)).matches()) return incDraft(req, x.group(1));
        throw err(404, "not_found", "없는 주소입니다.");
    }

    Object summary(HttpServletRequest req) throws Exception {
        owner(req); tick();
        Map<String, Object> pp = M("P0", 0, "P1", 0, "P2", 0, "P3", 0); for (Map<String, Object> r : mapper.openByPriority()) pp.put((String) r.get("priority"), ((Number) r.get("n")).intValue());
        int score = Math.max(0, 100 - ((int) pp.get("P0") * 25 + (int) pp.get("P1") * 10 + (int) pp.get("P2") * 3 + (int) pp.get("P3")));
        List<Object> todo = new ArrayList<>();
        for (JsonNode pr : head(JL(mapper.prList(true)), 5)) todo.add(M("kind", "pr", "id", pr.get("id"), "title", pr.get("title"), "severity", pr.get("severity"), "need", pr.get("need"), "have", pr.get("have")));
        todo.addAll(JL(mapper.todoFindings()));
        Map<String, Object> X = mapper.summaryExtra(); int slaOver = ((Number) X.get("sla_over")).intValue();
        String state = (int) pp.get("P0") > 0 ? "crit" : (int) pp.get("P1") > 0 || slaOver > 0 ? "warn" : "ok";
        return M("score", score, "state", state, "p", pp, "high", ((Number) X.get("high")).intValue(), "slaOver", slaOver, "prPending", ((Number) X.get("pr_pending")).intValue(), "last", X.get("last"), "delta", null, "mttd", mapper.mttd(), "mttr", mapper.mttr(), "todo", head(todo, 8), "threats", JL(mapper.threats(3)), "killMode", live() ? "live" : "dry", "killActive", mapper.killActiveLive());
    }
    Object findings(HttpServletRequest req) throws Exception {
        owner(req); String st = req.getParameter("status"), sv = req.getParameter("sev"); st = st == null ? "" : st; sv = sv == null ? "" : sv;
        if (!st.isEmpty() && !FST.contains(st)) throw err(400, "status", "상태 값이 올바르지 않습니다."); if (!sv.isEmpty() && !SEV.contains(sv)) throw err(400, "sev", "심각도 값이 올바르지 않습니다.");
        return M("rows", JL(mapper.findings(st, sv)));
    }
    Object patchFinding(HttpServletRequest req, byte[] body, String id) throws Exception {
        Map<String, Object> a = owner(req); JsonNode b = DdWeb.readBody(body, 8192); String status = s(get(b, "status"), 40), note = s(get(b, "note"), 500);
        if (!FST.contains(status)) throw err(400, "status", "상태 값이 올바르지 않습니다.");
        return tx.plain(() -> {
            String cur = mapper.findingStatusForUpdate(id); if (cur == null) throw err(404, "not_found", "취약점을 찾지 못했습니다.");
            mapper.updateFinding(id, status, note); audit((String) a.get("email"), "finding.status", id, O("from", cur, "to", status), req);
            return M("ok", true, "finding", parse(mapper.findingJson(id)));
        });
    }
    Object threatCard(HttpServletRequest req, String id) throws Exception {
        Map<String, Object> a = owner(req); String email = (String) a.get("email");
        return tx.plain(() -> {
            Map<String, Object> t = mapper.threatRow(id); if (t == null) throw err(404, "not_found", "위협을 찾지 못했습니다.");
            String ex = mapper.cardOfThreat(id);
            if (ex != null) { mapper.cardReuse(ex); audit(email, "card.reuse", ex, O("threat", id), req); return M("ok", true, "created", false, "card", parse(mapper.cardJson(ex))); }
            mapper.lock(820822L); int n = mapper.cardMax() + 1; String cid = "CARD-" + String.format("%04d", n);
            String pat = cut(String.valueOf(t.get("attack_type")), 40).toLowerCase(Locale.ROOT); List<String> controls = CTRL.getOrDefault(pat, CTRL.get("default"));
            StringBuilder bd = new StringBuilder("# " + cid + " 대책 카드\n\n- 위협: " + cut(String.valueOf(t.get("source")), 20) + " " + cut(String.valueOf(t.get("external_id")), 60) + "\n- 유형: " + (pat.isEmpty() ? "미분류" : cut(String.valueOf(t.get("attack_type")), 40)) + "\n- 판정: " + cut(String.valueOf(t.get("verdict")), 20) + "\n\n## 통제");
            for (String c : controls) bd.append("\n- [ ] ").append(c); bd.append("\n\n## 회귀 시험\n- [ ] 재현 시험 작성 · 통과\n\n> 위협 원문은 외부 데이터이며 지시로 취급하지 않습니다.");
            ArrayNode ca = F.arrayNode(); controls.forEach(ca::add);
            mapper.insertCard(cid, id, cut(t.get("external_id") + " 대응", 200), pat, stringify(ca), "[\"재현 시험 작성 · 통과\"]", "[\"didisam-security-agent\"]", "patch-verify-rollback", bd.toString());
            audit(email, "card.create", cid, O("threat", id), req);
            return M("ok", true, "created", true, "card", parse(mapper.cardJson(cid)));
        });
    }
    Object approve(HttpServletRequest req, byte[] body, String id) throws Exception {
        Map<String, Object> a = owner(req); JsonNode b = DdWeb.readBody(body, 4096); String email = (String) a.get("email"); boolean viaLink = !nullish(get(b, "token")) || !nullish(get(b, "secret"));
        String lt = nullish(get(b, "token")) ? "" : cut(str(get(b, "token")), 40), ls = nullish(get(b, "secret")) ? "" : cut(str(get(b, "secret")), 100); String lk = viaLink ? lt : null;
        if (viaLink) { Map<String, Object> L = lt.matches("^al_[0-9a-f]{16}$") ? mapper.linkRow(lt) : null;
            if (L == null || ls.isEmpty() || !sha(ls).equals(L.get("secret_hash")) || L.get("used_at") != null || !Boolean.TRUE.equals(L.get("live")) || !id.equals(L.get("pr_id")) || !String.valueOf(a.get("uid")).equals(L.get("uid"))) throw err(401, "link", "승인 링크가 만료되었거나 올바르지 않습니다."); }
        else reauth(a, get(b, "reauth"));
        String method = lk != null ? "link" : "reauth";
        return tx.plain(() -> {
            Map<String, Object> pr = mapper.prForUpdate(id); if (pr == null) throw err(404, "not_found", "수정 PR을 찾지 못했습니다.");
            for (JsonNode f : arr(parse((String) pr.get("files")))) if (FORBID.matcher(str(f)).find()) throw err(403, "forbidden_files", "워크플로 · CODEOWNERS를 바꾸는 PR은 가디언 경로로 승인할 수 없습니다.");
            if (!List.of("open", "pending").contains(pr.get("status"))) throw err(409, "pr_state", "승인할 수 없는 상태입니다.");
            if (lk != null && mapper.useLink(lk) == 0) throw err(401, "link", "승인 링크가 만료되었거나 올바르지 않습니다.");
            if (mapper.insertApproval(id, email, method) == 0) throw err(409, "dup_approver", "이미 승인했습니다. 다른 승인자가 필요합니다.");
            int have = mapper.approvalCount(id), need = needOf((String) pr.get("severity")); String status = have >= need ? "approved" : "pending";
            mapper.setPrStatus(id, status); audit(email, "pr.approve", id, O("method", method, "have", have, "need", need, "status", status), req);
            return M("ok", true, "status", status, "need", need, "have", have, "approvers", mapper.approvers(id));
        });
    }
    Object reject(HttpServletRequest req, byte[] body, String id) throws Exception {
        Map<String, Object> a = owner(req); JsonNode b = DdWeb.readBody(body, 4096); String reason = trim(s(get(b, "reason"), 200));
        if (reason.isEmpty()) throw err(400, "reason", "반려 사유를 입력해 주십시오.");
        return tx.plain(() -> {
            Map<String, Object> pr = mapper.prForUpdate(id); if (pr == null) throw err(404, "not_found", "수정 PR을 찾지 못했습니다.");
            if (!List.of("open", "pending").contains(pr.get("status"))) throw err(409, "pr_state", "반려할 수 없는 상태입니다.");
            mapper.rejectPr(id, reason); audit((String) a.get("email"), "pr.reject", id, O("from", pr.get("status")), req);
            return M("ok", true, "status", "rejected");
        });
    }
    Object approveLink(HttpServletRequest req, byte[] body) throws Exception {
        Map<String, Object> a = owner(req); JsonNode b = DdWeb.readBody(body, 4096); JsonNode pv = truthy(get(b, "pr")) ? get(b, "pr") : get(b, "prId"); String prId = truthy(pv) ? str(pv) : "";
        if (!ID_RE.matcher(prId).matches()) throw err(400, "pr", "PR id가 올바르지 않습니다."); reauth(a, get(b, "reauth"));
        if (mapper.prExists(prId) == null) throw err(404, "not_found", "수정 PR을 찾지 못했습니다.");
        byte[] r = new byte[32], t8 = new byte[8]; DdCrypto.RND.nextBytes(r); DdCrypto.RND.nextBytes(t8); String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(r); String token = "al_" + HexFormat.of().formatHex(t8);
        String exp = tx.plain(() -> { mapper.insertLink(token, sha(secret), prId, (String) a.get("uid"), (String) a.get("email"), LINK_MIN); audit((String) a.get("email"), "link.issue", prId, O("token", token, "min", LINK_MIN), req); return mapper.linkExpires(token); });
        return M("ok", true, "token", token, "secret", secret, "exp", exp, "expiresAt", exp, "minutes", LINK_MIN, "url", "/#sec-approve:" + prId + ":" + token + ":" + secret);
    }
    Object killList(HttpServletRequest req) throws Exception {
        owner(req); tick();
        return M("mode", live() ? "live" : "dry", "dday", dday(), "ttlMin", FEATURE_TTL_MAX, "cap", M("used", mapper.killCountDay(kday()), "max", KILL_DAY_MAX), "kinds", ACTIONS, "active", JL(mapper.killActive()), "log", JL(mapper.killList()));
    }
    Object kill(HttpServletRequest req, byte[] body) throws Exception {
        Map<String, Object> a = ownerOrGuard(req); JsonNode b = DdWeb.readBody(body, 8192); boolean agent = Boolean.TRUE.equals(a.get("agent")); String actor = (String) a.get("email");
        String action = s(get(b, "action"), 40), tenant = s(get(b, "tenant"), 40), reason = trim(s(get(b, "reason"), 200)), ruleId = s(get(b, "ruleId"), 60);
        if (!ACTIONS.contains(action)) throw err(400, "action", "차단 종류가 올바르지 않습니다(key_disable · feature_off · egress_block).");
        if (!TID_RE.matcher(tenant).matches()) throw err(400, "tenant", "기관 id가 올바르지 않습니다.");
        if (reason.isEmpty()) throw err(400, "reason", "차단 사유를 입력해 주십시오.");
        if (!ruleId.isEmpty() && !RULE_RE.matcher(ruleId).matches()) throw err(400, "rule", "규칙 id가 올바르지 않습니다.");
        ArrayNode sig = F.arrayNode(); { Set<String> seen = new LinkedHashSet<>(); for (JsonNode x : arrS(get(b, "signals"), 10, 60)) seen.add(x.asText()); seen.forEach(sig::add); }
        if ("egress_block".equals(action) && sig.size() < 2) throw err(400, "signals", "egress 차단은 서로 다른 신호 2개 이상이 필요합니다.");
        Integer ttl = null; if ("feature_off".equals(action)) { double t = Math.round(numOr(get(b, "ttlMin"), FEATURE_TTL_MAX)); if (!(t >= 1)) t = 1; ttl = (int) Math.min(FEATURE_TTL_MAX, t); }
        if (mapper.tenantExists(tenant) == null) throw err(404, "not_found", "기관을 찾지 못했습니다.");
        String[] incInc = { null };
        String mode = live() ? "live" : "dry"; byte[] rb = new byte[8]; DdCrypto.RND.nextBytes(rb); String id = "ks_" + HexFormat.of().formatHex(rb); Integer ttlF = ttl;
        String row = tx.plain(() -> {
            mapper.lock(820823L);
            if (mapper.killCountDay(kday()) >= KILL_DAY_MAX) throw err(429, "kill_cap", "긴급 차단은 하루 " + KILL_DAY_MAX + "회까지입니다. 대표님 판단이 필요합니다.");
            if ("live".equals(mode) && mapper.killDup(tenant, action) != null) throw err(409, "kill_dup", "같은 차단이 이미 걸려 있습니다.");
            mapper.insertKill(id, action, tenant, mode, agent ? "rule" : "manual", ruleId, reason, stringify(sig), actor, ttlF, kday());
            audit(actor, "kill." + mode, id, O("action", action, "tenant", tenant, "ttlMin", ttlF, "ruleId", ruleId), req);
            /* F8: 긴급 차단 발동 = 사고 대응 시작(탐지 → 격리) */
            ArrayNode tl = F.arrayNode(); tl.add(step("detect", reason, actor)); tl.add(step("contain", "live".equals(mode) ? "긴급 차단 적용" : "긴급 차단 dry-run 기록(실제 적용 없음)", actor));
            ArrayNode tn = F.arrayNode(); tn.add(tenant);
            incInc[0] = incCreate(KILL_INC.get(action), "긴급 차단 발동: " + KILL_KO.get(action), "high", O("tenants", tn, "data", "", "period", ""), tl, id, actor, req);
            return mapper.killJson(id);
        });
        cache.remove(tenant);
        try { tx.audit(tenant, actor, "security.kill", stringify(O("action", action, "mode", mode))); } catch (Exception ignore) { }
        return M("ok", true, "dryRun", "dry".equals(mode), "kill", parse(row), "incident", incInc[0]);
    }
    Object release(HttpServletRequest req, byte[] body, String id) throws Exception {
        if (!bearer(req).isEmpty()) throw err(403, "human_only", "긴급 차단 해제는 사람만 할 수 있습니다.");
        Map<String, Object> a = owner(req); JsonNode b = DdWeb.readBody(body, 4096); String note = s(get(b, "note"), 200); String email = (String) a.get("email");
        Object[] out = tx.plain(() -> {
            Map<String, Object> k = mapper.killForUpdate(id); if (k == null) throw err(404, "not_found", "차단 기록을 찾지 못했습니다.");
            if (k.get("released_at") != null) throw err(409, "released", "이미 해제되었습니다.");
            mapper.releaseKill(id, email, note); audit(email, "kill.release", id, O("action", k.get("action"), "tenant", k.get("tenant_id")), req);
            return new Object[]{ k.get("tenant_id"), mapper.killJson(id) };
        });
        cache.remove((String) out[0]); return M("ok", true, "kill", parse((String) out[1]));
    }
    /* ── 사고 대응(F8) — 단계 기록은 사람 · 가디언, 결정은 사람만 ── */
    static ObjectNode step(String phase, String note, String by) { return O("phase", phase, "note", cut(CTL.matcher(note == null ? "" : note).replaceAll(""), 500), "by", by, "at", isoNow()); }
    String incCreate(String type, String title, String sev, ObjectNode scope, ArrayNode timeline, String killId, String by, HttpServletRequest req) {
        byte[] rb = new byte[8]; DdCrypto.RND.nextBytes(rb); String id = "inc_" + HexFormat.of().formatHex(rb); String phase = timeline.get(timeline.size() - 1).get("phase").asText();
        mapper.insertIncident(id, type, title, sev, stringify(scope), phase, stringify(timeline), NOTIFY_H, killId, by);
        audit(by, "incident.create", id, O("type", type, "severity", sev, "kill", killId == null ? "" : killId), req); return id;
    }
    Object incCreateApi(HttpServletRequest req, byte[] body) throws Exception {
        Map<String, Object> a = ownerOrGuard(req); JsonNode b = DdWeb.readBody(body, 8192); String email = (String) a.get("email");
        String type = nullish(get(b, "type")) ? "" : str(get(b, "type")), title = trim(s(get(b, "title"), 200));
        if (!INC_TYPES.contains(type)) throw err(400, "type", "사고 유형이 올바르지 않습니다(key_leak · cross_tenant · pii_leak · llmjacking · other).");
        if (title.isEmpty()) throw err(400, "title", "사고 제목을 입력해 주십시오.");
        JsonNode sv0 = get(b, "severity"); String sev = nullish(sv0) || (sv0.isTextual() && sv0.textValue().isEmpty()) ? "high" : str(sv0); if (!SEV.contains(sev)) throw err(400, "sev", "심각도 값이 올바르지 않습니다.");
        JsonNode sc = get(b, "scope"); if (sc == null || !sc.isObject()) sc = F.objectNode();
        Set<String> ts = new LinkedHashSet<>(); for (JsonNode t : arrS(get(sc, "tenants"), 50, 40)) if (TID_RE.matcher(t.asText()).matches()) ts.add(t.asText());
        ArrayNode tn = F.arrayNode(); ts.forEach(tn::add); ObjectNode scope = O("tenants", tn, "data", s(get(sc, "data"), 300), "period", s(get(sc, "period"), 100));
        String note = s(get(b, "note"), 500); ArrayNode tl = F.arrayNode(); tl.add(step("detect", note.isEmpty() ? "사고 등록" : note, email));
        String id = tx.plain(() -> incCreate(type, title, sev, scope, tl, null, email, req));
        return M("ok", true, "incident", parse(mapper.incidentJson(id)));
    }
    Object incStep(HttpServletRequest req, byte[] body, String id) throws Exception {
        Map<String, Object> a = ownerOrGuard(req); JsonNode b = DdWeb.readBody(body, 8192); String email = (String) a.get("email"); String phase = nullish(get(b, "phase")) ? "" : str(get(b, "phase"));
        if (!PHASES.contains(phase)) throw err(400, "phase", "단계 값이 올바르지 않습니다(detect · contain · report · notify · recover · prevent).");
        ArrayNode e = F.arrayNode(); e.add(step(phase, s(get(b, "note"), 500), email));
        return tx.plain(() -> {
            if (mapper.incidentStep(id, stringify(e), phase) == 0) throw err(404, "not_found", "사고 기록을 찾지 못했습니다.");
            audit(email, "incident.step", id, O("phase", phase), req); return M("ok", true, "incident", parse(mapper.incidentJson(id)));
        });
    }
    Object incDecision(HttpServletRequest req, byte[] body, String id) throws Exception {
        if (!bearer(req).isEmpty()) throw err(403, "human_only", "신고 · 통지 · 공개 · 중단 결정은 사람만 할 수 있습니다.");
        Map<String, Object> a = owner(req); JsonNode b = DdWeb.readBody(body, 8192); String email = (String) a.get("email"); String kind = nullish(get(b, "kind")) ? "" : str(get(b, "kind"));
        if (!DEC_KINDS.contains(kind)) throw err(400, "kind", "결정 종류가 올바르지 않습니다(report · notify · public · shutdown).");
        JsonNode dv = get(b, "decided"); if (dv == null || !dv.isBoolean()) throw err(400, "decided", "결정 값(decided)은 true 또는 false여야 합니다.");
        boolean decided = dv.booleanValue(); ArrayNode e = F.arrayNode(); e.add(O("kind", kind, "decided", decided, "note", s(get(b, "note"), 500), "by", email, "at", isoNow()));
        return tx.plain(() -> {
            if (mapper.incidentDecision(id, stringify(e)) == 0) throw err(404, "not_found", "사고 기록을 찾지 못했습니다.");
            audit(email, "incident.decision", id, O("kind", kind, "decided", decided), req); return M("ok", true, "incident", parse(mapper.incidentJson(id)));
        });
    }
    Object incDraft(HttpServletRequest req, String id) throws Exception {
        owner(req); Map<String, Object> r = mapper.incidentDraftRow(id); if (r == null) throw err(404, "not_found", "사고 기록을 찾지 못했습니다.");
        List<String> ph = new ArrayList<>(); for (JsonNode x : arr(parse((String) r.get("timeline")))) if (x != null && x.isObject() && x.get("phase") != null) ph.add(x.get("phase").asText());
        Map<String, Object> D = incidentDraft((String) r.get("type"), parse((String) r.get("scope")), ph, (String) r.get("c"), r.get("d") == null ? "" : (String) r.get("d"));
        Map<String, Object> o = M("ok", true, "id", id); o.putAll(D); o.put("law", "개인정보 보호법 제34조"); return o;
    }
    Object ingest(HttpServletRequest req, byte[] body) throws Exception {
        Map<String, Object> g = guard(req); JsonNode b = DdWeb.readBody(body, 512 * 1024); String kind = nullish(get(b, "kind")) ? "" : str(get(b, "kind")); JsonNode its = get(b, "items");
        if (its == null || !its.isArray() || its.size() > 200) throw err(400, "items", "items는 200건 이하 배열이어야 합니다.");
        List<JsonNode> items = new ArrayList<>(); its.forEach(x -> { if (x != null && x.isObject()) items.add(x); });
        if (!KINDS.contains(kind)) throw err(400, "kind", "kind가 올바르지 않습니다(finding · threat · scan · pr · card).");
        int[] cu = { 0, 0 };
        tx.plain(() -> {
            for (JsonNode x : items) {
                Boolean ins = null;
                if ("finding".equals(kind)) { String key = s(get(x, "key"), 200); if (key.isEmpty()) continue; String sv = s(get(x, "severity"), 20), pr = s(get(x, "priority"), 4);
                    JsonNode ev = get(x, "evidence"); String evs = ev != null && ev.isObject() && stringify(ev).length() <= 8000 ? stringify(ev) : "{}"; String thr = nullish(get(x, "threatId")) ? "" : str(get(x, "threatId"));
                    String org = s(get(x, "origin"), 20), sc = s(get(x, "tenantScope"), 60);
                    ins = mapper.upFinding("F-" + sha(key).substring(0, 12), key, org.isEmpty() ? "scan" : org, s(get(x, "title"), 300), SEV.contains(sv) && strictEq(get(x, "severity"), sv) ? sv : "medium", PRI.contains(pr) && strictEq(get(x, "priority"), pr) ? pr : "P3",
                        Math.max(0, Math.min(100, numOr(get(x, "score"), 0))), sc.isEmpty() ? "all" : sc, s(get(x, "owner"), 60), isoOr(get(x, "slaDueAt")), ID_RE.matcher(thr).matches() ? thr : null, evs);
                } else if ("threat".equals(kind)) { String src = s(get(x, "source"), 20), ext = s(get(x, "externalId"), 80); if (src.isEmpty() || ext.isEmpty()) continue;
                    String url = nullish(get(x, "url")) ? "" : str(get(x, "url")); String vd = nullish(get(x, "verdict")) ? "" : str(get(x, "verdict"));
                    ins = mapper.upThreat("T-" + sha(src + "|" + ext).substring(0, 12), src, ext, s(get(x, "title"), 300), nullish(get(x, "cvss")) ? null : Math.max(0, Math.min(10, numOr(get(x, "cvss"), 0))), nullish(get(x, "epss")) ? null : Math.max(0, Math.min(1, numOr(get(x, "epss"), 0))),
                        get(x, "kev") != null && get(x, "kev").isBoolean() && get(x, "kev").booleanValue(), stringify(arrS(get(x, "affected"), 50, 200)), s(get(x, "attackType"), 40), url.startsWith("https://") ? s(get(x, "url"), 500) : "", isoOr(get(x, "publishedAt")), VERDICT.contains(vd) ? vd : "pending", s(get(x, "hash"), 128), s(get(x, "summary"), 2000));
                } else if ("scan".equals(kind)) { String ty = s(get(x, "type"), 20);
                    mapper.insScan(ty.isEmpty() ? "dep" : ty, s(get(x, "target"), 200), s(get(x, "tool"), 60), s(get(x, "toolVersionSha"), 80), (int) Math.max(0, Math.round(numOr(get(x, "findingsCount"), 0))), s(get(x, "rawRef"), 300)); ins = true;
                } else if ("pr".equals(kind)) { String id = s(get(x, "id"), 80); if (!ID_RE.matcher(id).matches()) continue; String sv = s(get(x, "severity"), 20); String url = nullish(get(x, "url")) ? "" : str(get(x, "url"));
                    ins = mapper.upPr(id, nullish(get(x, "number")) ? null : (int) Math.round(numOr(get(x, "number"), 0)), s(get(x, "title"), 300), stringify(arrS(get(x, "findingIds"), 50, 80)), SEV.contains(sv) && strictEq(get(x, "severity"), sv) ? sv : "medium", s(get(x, "changeType"), 40),
                        stringify(arrS(get(x, "files"), 100, 300)), s(get(x, "verifyResult"), 200), s(get(x, "risk"), 200), s(get(x, "rollbackRef"), 200), url.startsWith("https://") ? s(get(x, "url"), 500) : "");
                } else { String id = s(get(x, "id"), 20); if (!CARD_RE.matcher(id).matches()) continue; String thr = nullish(get(x, "threatId")) ? "" : str(get(x, "threatId"));
                    ins = mapper.upCard(id, ID_RE.matcher(thr).matches() ? thr : null, s(get(x, "title"), 300), s(get(x, "threatPattern"), 40), stringify(arrS(get(x, "controls"), 30, 200)), stringify(arrS(get(x, "regressionTests"), 30, 200)), stringify(arrS(get(x, "skillRefs"), 10, 80)), s(get(x, "playbook"), 80), s(get(x, "body"), 32000));
                }
                if (ins != null) { if (ins) cu[0]++; else cu[1]++; }
            }
            audit((String) g.get("email"), "ingest." + kind, "", O("n", items.size(), "created", cu[0], "updated", cu[1]), req); return null;
        });
        return M("ok", true, "kind", kind, "n", items.size(), "created", cu[0], "updated", cu[1]);
    }
}
