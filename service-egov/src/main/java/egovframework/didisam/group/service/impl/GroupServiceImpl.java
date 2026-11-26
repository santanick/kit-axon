package egovframework.didisam.group.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.ai.service.AiService;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.group.service.GroupService;
import egovframework.didisam.market.service.impl.MkDb;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** 디디쌤 통합 센터 — Node service/server/group(index · routes · kpi · snap · share)와 같은 /api/group/* · 오류 코드 · 응답 JSON(기획서 spec.md 1 · 2절).
 *  상위 기관 경로는 DB 역할 didisam_group(기관 표 권한 없음, RLS FORCE)으로만 내려간다: app.tenant(로그인 기관 또는 집계 중인 소속 기관) · app.grp · app.santa.
 *  집계는 소속 기관 자기 범위(inTenant)에서 숫자만 계산해 grp_kpi_day에 「결과만」 쓴다(한 트랜잭션에서 두 기관을 다루지 않음).
 *  시범 플래그: grp_group.pilot(산타 관리자가 켬). 꺼진 상위 기관 경로는 403 grp_off. */
@Service("groupService")
public class GroupServiceImpl extends EgovAbstractServiceImpl implements GroupService {
    static final Pattern DAY_RE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$"), GID_RE = Pattern.compile("^gp_[a-z0-9]{12}$"), CODE_RE = Pattern.compile("^GRP-[A-Z0-9]{4}-[A-Z0-9]{4}$");
    static final String AZ = "abcdefghijklmnopqrstuvwxyz0123456789", CZ = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; static final SecureRandom RND = new SecureRandom();
    static final List<String> KINDS = List.of("franchise", "univ", "region");
    static final Map<String, List<String>> UNITS = Map.of("franchise", List.of("branch", "direct"), "univ", List.of("unit", "lifelong", "lms_main", "grad"), "region", List.of("lifelong", "citizen", "school", "center"));
    static final Map<String, String[]> TERMS = Map.of("franchise", new String[]{ "본사", "가맹점", "가맹점 통합 관리" }, "univ", new String[]{ "대학 본부", "사업단 · 센터", "대학 통합 관리" }, "region", new String[]{ "지자체 · 교육청", "소속 기관 · 학교", "지역 통합 관리" });
    static final List<String> ROLES = List.of("grp_admin", "grp_viewer", "grp_content", "grp_learner");
    static final Map<String, List<String>> PERMS = Map.of("grp_admin", List.of("view", "export", "invite", "content", "policy", "staff", "audit"), "grp_viewer", List.of("view", "export"),
        "grp_content", List.of("view", "content"), "grp_learner", List.of("view", "learner"));
    static final List<String> POLICY_KEYS = List.of("brand", "terms", "notice", "footer", "menu", "ai");
    /** KPI 코드(2-4) — 사람 수 KPI는 1~4이면 「5명 미만」 */
    static final List<String> KPI_ALL = List.of("lrn", "new", "act", "enr", "cmp", "cmpRateBp", "progBp", "crs", "aiCalls", "aiTok", "rev");
    static final List<String> PEOPLE = List.of("lrn", "new", "act", "enr", "cmp");
    static final String AGREE_VER = "grp-share-v1", UNDER5 = "5명 미만";
    static final Map<String, String> MSG = new LinkedHashMap<>();
    static {
        String[] m = {
            "grp_off", "통합 센터 시범 기관이 아닙니다. 산타에 시범 운영을 요청하십시오.",
            "grp_role", "이 작업을 할 통합 센터 역할이 없습니다. 통합 관리자에게 역할을 요청하십시오.",
            "grp_owner", "기관 묶음 연결 · 공유 범위는 정운영자만 바꿀 수 있습니다.",
            "grp_kind", "묶음 유형은 프랜차이즈 본사 · 대학 본부 · 지자체 · 교육청 중에서 고르십시오.",
            "grp_exists", "이 기관은 이미 다른 기관 묶음의 상위 기관입니다.",
            "grp_child", "이 기관은 이미 다른 기관 묶음에 소속되어 있습니다. 먼저 연결을 해제해야 합니다.",
            "grp_self", "자기 기관은 소속 기관으로 초대할 수 없습니다.",
            "grp_unit", "이 묶음 유형에서 쓸 수 없는 소속 구분입니다.",
            "grp_invite_code", "초대 코드가 맞지 않습니다. 상위 기관에 코드를 다시 확인하십시오.",
            "grp_invite_expired", "초대 기한(14일)이 지났습니다. 상위 기관에 새 초대를 요청하십시오.",
            "grp_terms", "공유 범위 안내를 확인하고 동의해야 연결할 수 있습니다.",
            "grp_state", "지금 상태에서는 할 수 없는 작업입니다. 화면을 새로 고친 뒤 다시 시도하십시오.",
            "grp_staff_tenant", "우리 기관 운영자 계정에만 통합 센터 역할을 줄 수 있습니다.",
            "grp_last_admin", "통합 관리자가 한 명 이상 있어야 합니다.",
            "grp_range", "기간은 최대 1년(366일)까지 조회할 수 있습니다.",
            "grp_rule", "경고 기준 값이 올바르지 않습니다.",
            "grp_consent", "소속 기관이 동의한 공유 범위 밖의 정보입니다.",
            "grp_mfa", "학습자 개별 열람 전에 2단계 인증을 다시 해 주십시오.",
            "grp_purpose", "열람 목적을 10자 이상 적어 주십시오(감사 기록에 남습니다).",
            "grp_limit", "요청이 너무 많습니다. 잠시 후 다시 시도하십시오.",
            "grp_license", "콘텐츠 마켓에서 들여온 콘텐츠는 다른 기관에 다시 공유할 수 없습니다(이용 권한 범위 밖).",
            "grp_source", "공유할 원본을 찾을 수 없습니다.",
            "grp_size", "공유 사본이 너무 큽니다(2MB 초과). 영상은 파일 대신 링크로 넣으십시오.",
            "grp_ver", "그 사이 다른 사람이 수정했습니다. 최신 내용을 불러온 뒤 다시 저장하십시오.",
            "grp_required", "필수 배포 콘텐츠는 거절할 수 없습니다.",
            "grp_locked", "상위 기관이 잠근 공통 설정이라 바꿀 수 없습니다.",
            "grp_policy_key", "지원하지 않는 공통 설정 항목입니다.",
            "idem", "멱등 키(idem)가 필요합니다." };
        for (int i = 0; i < m.length; i += 2) MSG.put(m[i], m[i + 1]);
    }
    static final Map<String, Integer> STATUS = new LinkedHashMap<>();
    static {
        Object[] s = { "grp_off", 403, "grp_role", 403, "grp_owner", 403, "grp_kind", 400, "grp_exists", 409, "grp_child", 409, "grp_self", 400, "grp_unit", 400, "grp_invite_code", 404, "grp_invite_expired", 410,
            "grp_terms", 400, "grp_state", 409, "grp_staff_tenant", 400, "grp_last_admin", 409, "grp_range", 400, "grp_rule", 400, "grp_consent", 403, "grp_mfa", 403, "grp_purpose", 400, "grp_limit", 429,
            "grp_license", 409, "grp_source", 404, "grp_size", 413, "grp_ver", 409, "grp_required", 409, "grp_locked", 409, "grp_policy_key", 400, "idem", 400 };
        for (int i = 0; i < s.length; i += 2) STATUS.put((String) s[i], (Integer) s[i + 1]);
    }

    final MkDb db; final TenantTx ttx; final AuthService auth; final AiService ai; final DdRateLimiter rl; final GroupMapper mapper; final String pepper;
    public GroupServiceImpl(MkDb db, TenantTx ttx, AuthService auth, AiService ai, DdRateLimiter rl, GroupMapper mapper,
                            @Value("${SESSION_PEPPER:}") String sp, @Value("${PII_KEY:}") String pk) {
        this.db = db; this.ttx = ttx; this.auth = auth; this.ai = ai; this.rl = rl; this.mapper = mapper;
        this.pepper = sp != null && !sp.isEmpty() ? sp : pk != null && !pk.isEmpty() ? pk : "grp-dev";
        GrpRoutes.register(this);
    }

    // ── 공통 ───────────────────────────────────────────────
    DdException E(String code) { return E(STATUS.getOrDefault(code, 400), code, null); }
    DdException E(int st, String code, String msg) { return new DdException(st, msg != null ? msg : MSG.getOrDefault(code, "요청을 처리할 수 없습니다."), code); }
    DdException E(String code, Map<String, Object> extra) { return E(code).extra(extra); }
    static Map<String, Object> map(Object... kv) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]); return o; }
    static String rid(String p) { byte[] b = new byte[12]; RND.nextBytes(b); StringBuilder s = new StringBuilder(p); for (byte x : b) s.append(AZ.charAt((x & 0xff) % 36)); return s.toString(); }
    static String code() { StringBuilder s = new StringBuilder("GRP-"); for (int i = 0; i < 8; i++) { if (i == 4) s.append('-'); s.append(CZ.charAt(RND.nextInt(CZ.length()))); } return s.toString(); }
    static String sha(String s) { try { byte[] h = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)); StringBuilder o = new StringBuilder(); for (byte x : h) o.append(String.format("%02x", x)); return o.toString(); } catch (Exception e) { throw new IllegalStateException(e); } }
    static String hmac(String key, String s) { try { javax.crypto.Mac m = javax.crypto.Mac.getInstance("HmacSHA256"); m.init(new javax.crypto.spec.SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] h = m.doFinal(s.getBytes(StandardCharsets.UTF_8)); StringBuilder o = new StringBuilder(); for (byte x : h) o.append(String.format("%02x", x)); return o.toString(); } catch (Exception e) { throw new IllegalStateException(e); } }
    static String str(JsonNode v, int n) { return cut(nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v), n); }
    static String str(String v, int n) { return cut(v == null ? "" : v, n); }
    static JsonNode g(JsonNode r, String k) { JsonNode v = r == null ? null : r.get(k); return v == null ? F.nullNode() : v; }
    static String s(JsonNode r, String k) { JsonNode v = g(r, k); return v.isNull() ? null : v.asText(); }
    static long n(JsonNode r, String k) { JsonNode v = g(r, k); return v.isNull() ? 0 : v.asLong(); }
    static boolean B(JsonNode r, String k) { return truthy(g(r, k)); }
    static ObjectNode O() { return F.objectNode(); }
    static String tid(Map<String, Object> a) { return (String) a.get("tid"); }
    static String email(Map<String, Object> a) { return (String) a.get("email"); }
    static String uid(Map<String, Object> a) { return (String) a.get("uid"); }
    static String today() { return kstToday(); }
    static String qp(HttpServletRequest q, String k) { return q.getParameter(k); }
    static JsonNode body(byte[] raw) { return DdWeb.readBody(raw, 64 * 1024); }
    static JsonNode bigBody(byte[] raw) { return DdWeb.readBody(raw, 512 * 1024); }
    static String kstIso(String iso) { if (iso == null) return null; try { return Instant.parse(iso).plusSeconds(9 * 3600).atOffset(ZoneOffset.UTC).toLocalDateTime().withNano(0).toString() + "+09:00"; } catch (Exception e) { return iso; } }
    /** str 길이 검사(앞뒤 공백 제거 후) — 범위 밖이면 null */
    static String len(JsonNode v, int min, int max) { String x = trim(nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v)); return x.length() < min || x.length() > max ? null : x; }

    /** 요청 범위 { tid, gid, santa } — 권한 함수가 채우고 tx()가 RLS 세션 변수로 넘긴다(Node AsyncLocalStorage와 같음) */
    static final ThreadLocal<String[]> SCOPE = new ThreadLocal<>();
    static void scopeSet(String tid, String gid, boolean santa) { SCOPE.set(new String[]{ tid == null ? "" : tid, gid == null ? "" : gid, santa ? "1" : "0" }); }
    /** 통합 센터 트랜잭션: SET LOCAL ROLE didisam_group(RLS FORCE) + app.tenant · app.grp · app.santa. 범위가 비면 아무 행도 보이지 않는다 */
    <T> T T(TenantTx.Work<T> fn) throws Exception { String[] s = SCOPE.get(); return txAs(s == null ? "" : s[0], s == null ? "" : s[1], s != null && "1".equals(s[2]), fn); }
    <T> T txAs(String tid, String gid, boolean santa, TenantTx.Work<T> fn) throws Exception {
        return ttx.plain(() -> { db.x("set local role didisam_group"); db.q("select set_config('app.tenant', $1, true), set_config('app.grp', $2, true), set_config('app.santa', $3, true)", tid == null ? "" : tid, gid == null ? "" : gid, santa ? "1" : "0"); return fn.run(); });
    }
    /** 기관 감사 기록(소속 기관 audit_log) — 실패해도 본 처리는 유지 */
    void log(String tid, String actor, String action, Object detail) { try { ttx.audit(tid, actor, action, DdWeb.JSON.valueToTree(detail).toString()); } catch (Exception e) { /* 본 처리는 유지 */ } }
    /** 통합 센터 감사(grp_audit, 해시 체인) — 현재 트랜잭션 안에서 */
    void gaudit(String gid, Map<String, Object> a, String action, String childTid, String target, String purpose, List<String> fields, boolean ok, HttpServletRequest req) {
        ObjectNode last = db.q1("select hash from grp_audit where group_id = $1 order by id desc limit 1", gid); String prev = last == null ? "" : s(last, "hash"); String at = isoNow();
        String actor = a == null ? "system" : email(a), atid = a == null ? null : tid(a); String ip = req == null ? null : sha(pepper + "|ip|" + req.getRemoteAddr()).substring(0, 16);
        String h = sha(String.join("|", prev, at, actor, action, childTid == null ? "" : childTid, target == null ? "" : target, purpose == null ? "" : purpose, ok ? "1" : "0"));
        db.x("insert into grp_audit (group_id, at, actor, actor_tid, action, child_tid, target, purpose, fields, ok, ip_hash, prev_hash, hash) values ($1,$2::timestamptz,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
            gid, at, actor, atid, action, childTid, target, purpose, fields == null ? new ArrayList<String>() : fields, ok, ip, prev.isEmpty() ? null : prev, h);
    }
    /** 멱등: 같은 (기관, 경로, idem)이면 첫 응답에 again:true */
    ObjectNode idem(String tid, String route, JsonNode key, TenantTx.Work<ObjectNode> fn) throws Exception {
        if (!truthy(key)) throw E("idem"); String k = str(key, 80); if (k.isEmpty()) throw E("idem");
        ObjectNode ex = db.q1("select resp from grp_idem where tid = $1 and route = $2 and key = $3", tid, route, k);
        if (ex != null) { ObjectNode r = ((ObjectNode) ex.get("resp")).deepCopy(); r.put("again", true); return r; }
        ObjectNode out = fn.run(); db.x("insert into grp_idem (tid, route, key, resp) values ($1,$2,$3,$4)", tid, route, k, out); return out;
    }
    static void needIdem(JsonNode b) { /* 쓰기 경로는 본문 idem(1~80자) 필수 — 검사는 idem()에서 */ }

    // ── 권한 ───────────────────────────────────────────────
    boolean isSanta(Map<String, Object> a) { return a != null && ai.isSanta(a); }
    Map<String, Object> need(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); scopeSet(tid(a), "", false); return a; }
    Map<String, Object> needSanta(HttpServletRequest req) throws Exception { Map<String, Object> a = need(req); if (!isSanta(a)) throw E(403, "santa", "산타 관리자만 쓸 수 있습니다."); rl.limit("grp-santa:" + email(a), 240, 60000L); scopeSet(tid(a), "", true); return a; }
    /** 소속 기관 정운영자 · 부운영자(교수자 제외) */
    Map<String, Object> needChild(HttpServletRequest req) throws Exception { Map<String, Object> a = need(req); if ("teacher".equals(a.get("role"))) throw E(403, "teacher", "교수자 계정은 쓸 수 없습니다."); return a; }
    Map<String, Object> needChildOwner(HttpServletRequest req) throws Exception { Map<String, Object> a = need(req); if (!"owner".equals(a.get("role"))) throw E("grp_owner"); return a; }
    /** 상위 기관 판정 결과 */
    static final class G { Map<String, Object> a; ObjectNode group; String gid, role; List<String> perms = new ArrayList<>(); }
    /** 로그인 기관이 상위 기관인 묶음 + 계정의 통합 센터 역할(정운영자 = grp_admin 자동) */
    G grpOf(Map<String, Object> a) throws Exception {
        G x = new G(); x.a = a;
        return T(() -> { ObjectNode gr = db.q1("select * from grp_group where owner_tid = $1", tid(a)); x.group = gr; if (gr == null) return x; x.gid = s(gr, "id");
            LinkedHashSet<String> P = new LinkedHashSet<>(); String role = null;
            if ("owner".equals(a.get("role"))) { role = "grp_admin"; P.addAll(PERMS.get("grp_admin")); }
            ObjectNode st = uid(a) == null ? null : db.q1("select role from grp_staff where group_id = $1 and user_id = $2::uuid", x.gid, uid(a));
            if (st != null) { if (role == null) role = s(st, "role"); P.addAll(PERMS.getOrDefault(s(st, "role"), List.of())); }
            if ("teacher".equals(a.get("role")) && st == null) { role = null; P.clear(); }
            x.role = role; x.perms = new ArrayList<>(P); scopeSet(tid(a), x.gid, false); return x; });
    }
    G needGrp(HttpServletRequest req, String perm) throws Exception {
        Map<String, Object> a = need(req); G x = grpOf(a);
        if (x.group == null || !B(x.group, "pilot") || !"active".equals(s(x.group, "status"))) throw E("grp_off");
        if (perm != null && !x.perms.contains(perm)) throw E("grp_role"); return x;
    }
    /** 최근 10분 안에 2단계 인증 통과(mfa 티켓 소비 기록) — MFA_OFF(시험 · 시연)면 통과 */
    @Value("${MFA_OFF:0}") String mfaOff;
    void needFresh(Map<String, Object> a) throws Exception {
        if ("1".equals(mfaOff)) return;
        Boolean ok = ttx.plain(() -> mapper.selectMfaFresh(uid(a)) != null);
        if (!Boolean.TRUE.equals(ok)) throw E("grp_mfa", map("mfa", "required"));
    }

    // ── 응답 모양 ───────────────────────────────────────────
    static ObjectNode termsOf(String kind) { String[] t = TERMS.getOrDefault(kind, TERMS.get("franchise")); return O().put("owner", t[0]).put("child", t[1]).put("space", t[2]); }
    static ObjectNode groupOut(JsonNode r) {
        ObjectNode o = O(); o.set("gid", g(r, "id")); o.set("kind", g(r, "kind")); o.set("name", g(r, "name")); o.put("pilot", B(r, "pilot")); o.set("status", g(r, "status"));
        o.set("terms", termsOf(s(r, "kind"))); o.set("targets", truthy(g(r, "targets")) ? g(r, "targets") : O()); return o;
    }
    static ObjectNode linkOut(JsonNode r) {
        ObjectNode o = O(); o.set("linkId", g(r, "id")); o.set("childTid", g(r, "child_tid")); o.set("childName", g(r, "child_name")); o.set("childType", g(r, "child_type")); o.set("label", g(r, "label")); o.set("unit", g(r, "unit"));
        o.set("status", g(r, "status")); o.set("share", g(r, "share")); o.set("invitedAt", g(r, "invited_at")); o.set("acceptedAt", g(r, "accepted_at")); o.set("endedAt", g(r, "ended_at")); return o;
    }
    static ObjectNode pageOf(HttpServletRequest q, List<? extends JsonNode> items) {
        double pg = num(qp(q, "page") == null ? "" : qp(q, "page")), sz = num(qp(q, "size") == null ? "" : qp(q, "size")); int page = (int) Math.max(1, Double.isNaN(pg) || pg < 1 ? 1 : Math.round(pg)); int size = (int) Math.min(100, Math.max(1, Double.isNaN(sz) || sz < 1 ? 20 : Math.round(sz)));
        ArrayNode a = F.arrayNode(); int from = (int) Math.min(items.size(), (long) (page - 1) * size), to = (int) Math.min(items.size(), (long) page * size); for (int i = from; i < to; i++) a.add(items.get(i));
        ObjectNode o = O(); o.set("items", a); return o.put("page", page).put("total", items.size());
    }
    /** 기관 이름 · 유형(tenants, 로그인 계정 범위) */
    ObjectNode tenantOf(String tid) throws Exception { return ttx.plain(() -> db.q1("select id, name, type from tenants where id = $1", tid)); }

    // ── 기간 ───────────────────────────────────────────────
    static final class Range { String from, to, unit; }
    Range range(HttpServletRequest q, int minDays) {
        String to = qp(q, "to"), from = qp(q, "from"); String t0 = today();
        if (to == null || !DAY_RE.matcher(to).matches()) to = LocalDate.parse(t0).minusDays(1).toString();
        if (from == null || !DAY_RE.matcher(from).matches()) from = LocalDate.parse(to).withDayOfMonth(1).toString();
        LocalDate f, t; try { f = LocalDate.parse(from); t = LocalDate.parse(to); } catch (Exception e) { throw E("grp_range"); }
        long days = t.toEpochDay() - f.toEpochDay() + 1; if (days < 1 || days > 366) throw E("grp_range");
        if (minDays > 0 && days < minDays) throw E(400, "grp_range", "학습자 집계는 최소 28일 이상의 기간으로 조회할 수 있습니다.");
        Range r = new Range(); r.from = from; r.to = to; String u = qp(q, "unit"); r.unit = "day".equals(u) || "week".equals(u) || "month".equals(u) ? u : "week"; return r;
    }

    // ── 가림(G-4) ──────────────────────────────────────────
    static JsonNode people(long v) { return v >= 1 && v <= 4 ? t(UNDER5) : F.numberNode(v); }
    /** 집계 원값 합(m) → 응답 값 + 가림 키. raw: lrn · new · act · enr · cmp · end · progSum · progN · crs · aiCalls · aiTok · rev */
    static ObjectNode vOut(Map<String, Long> m, List<String> kpis, List<String> noConsent, ArrayNode masked) {
        ObjectNode v = O();
        for (String k : kpis) {
            if (noConsent.contains(k)) { v.putNull(k); continue; }
            if (PEOPLE.contains(k)) { long x = m.getOrDefault(k, 0L); v.set(k, people(x)); if (x >= 1 && x <= 4) masked.add(k); }
            else if ("cmpRateBp".equals(k)) { long d = m.getOrDefault("end", 0L); if (d < 5) { v.putNull(k); if (d > 0) masked.add(k); } else v.put(k, Math.floorDiv(m.getOrDefault("cmp", 0L) * 10000, d)); }
            else if ("progBp".equals(k)) { long d = m.getOrDefault("progN", 0L); if (d < 5) { v.putNull(k); if (d > 0) masked.add(k); } else v.put(k, Math.floorDiv(m.getOrDefault("progSum", 0L), d)); }
            else v.put(k, m.getOrDefault(k, 0L));
        }
        return v;
    }
    /** 동의 키(share) → 비공개 KPI */
    static List<String> noConsentOf(JsonNode share, String kind, List<String> kpis) {
        List<String> o = new ArrayList<>();
        for (String k : kpis) { if (("aiCalls".equals(k) || "aiTok".equals(k)) && !B(share, "ai")) o.add(k); if ("rev".equals(k) && (!B(share, "revenue") || "region".equals(kind))) o.add(k); }
        return o;
    }
    static List<String> defaultKpis(String kind) { return "region".equals(kind) ? List.of("lrn", "act", "enr", "cmp", "cmpRateBp", "progBp", "aiCalls") : List.of("lrn", "act", "enr", "cmp", "cmpRateBp", "progBp", "aiCalls", "rev"); }
    static List<String> kpisOf(HttpServletRequest q, String kind) {
        String k = qp(q, "kpi"); if (k == null || k.isEmpty()) return defaultKpis(kind); List<String> o = new ArrayList<>();
        for (String x : k.split(",")) if (KPI_ALL.contains(x.trim()) && !o.contains(x.trim()) && !("rev".equals(x.trim()) && "region".equals(kind))) o.add(x.trim()); return o.isEmpty() ? defaultKpis(kind) : o;
    }
    /** 하루 집계 행들(한 소속 기관, 기간) → 기간 값: 스냅숏 KPI(lrn · crs · progSum/progN)는 마지막 날, act는 기간 최대, 나머지는 합 */
    static Map<String, Long> fold(List<JsonNode> days) {
        Map<String, Long> m = new LinkedHashMap<>(); String last = null; JsonNode lv = null;
        for (JsonNode r : days) { JsonNode v = g(r, "v"); String d = s(r, "d");
            for (String k : new String[]{ "new", "enr", "cmp", "end", "aiCalls", "aiTok", "rev" }) m.merge(k, (long) num(g(v, k).isNull() ? t("0") : g(v, k)), Long::sum);
            m.merge("act", (long) num(g(v, "act").isNull() ? t("0") : g(v, "act")), Math::max);
            if (last == null || d.compareTo(last) >= 0) { last = d; lv = v; } }
        if (lv != null) for (String k : new String[]{ "lrn", "crs", "progSum", "progN" }) m.put(k, (long) num(g(lv, k).isNull() ? t("0") : g(lv, k)));
        return m;
    }
    static String bucket(String day, String unit) {
        if ("day".equals(unit)) return day; if ("month".equals(unit)) return day.substring(0, 7);
        LocalDate d = LocalDate.parse(day); int w = d.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR), y = d.get(java.time.temporal.IsoFields.WEEK_BASED_YEAR); return y + "-W" + String.format("%02d", w);
    }

    // ── 집계 만들기(snap) ──────────────────────────────────
    /** 소속 기관 자기 범위(inTenant)에서 하루 집계 숫자만 계산(Node kpi.js와 같은 정의, 2-4절). 학습자 · 이름은 밖으로 나가지 않는다 */
    ObjectNode kpiOf(String child, String day, JsonNode share) throws Exception {
        return ttx.inTenant(child, () -> {
            java.util.Map<String, Object> r = mapper.selectDoc(child); JsonNode doc = r == null || r.get("doc") == null ? O() : parse(String.valueOf(r.get("doc")));
            ObjectNode v = GrpKpi.fromDoc(doc, day);
            if (B(share, "ai")) { Map<String, Object> u = mapper.selectAiDay(child, day); v.put("aiCalls", u == null || u.get("calls") == null ? 0 : ((Number) u.get("calls")).longValue()); v.put("aiTok", u == null || u.get("tok") == null ? 0 : ((Number) u.get("tok")).longValue()); }
            if (B(share, "revenue")) { Long rv = null; try { rv = mapper.selectRevDay(child, day); } catch (Exception e) { rv = null; } v.put("rev", rv == null ? 0 : rv); }
            return v; });
    }
    /** 한 연결의 하루 집계를 소속 기관 범위(app.tenant = 소속 기관)로 grp_kpi_day에 쓴다 */
    int snapOne(String gid, String child, String day, JsonNode share) throws Exception {
        ObjectNode v = kpiOf(child, day, share);
        return txAs(child, gid, false, () -> db.x("insert into grp_kpi_day (group_id, child_tid, day, v, src) values ($1,$2,$3::date,$4,'j1') on conflict (group_id, child_tid, day) do update set v = excluded.v, src = excluded.src, at = now()", gid, child, day, v));
    }
    /** 활성 연결 전체(산타 범위) — 하루 분 집계 */
    int snapDay(String day, String onlyGid) throws Exception {
        List<ObjectNode> L = txAs("", "", true, () -> db.q("select l.group_id, l.child_tid, l.share from grp_link l join grp_group g on g.id = l.group_id where l.status = 'active' and g.status = 'active' and ($1::text is null or l.group_id = $1) order by l.group_id, l.child_tid", onlyGid));
        int n = 0; for (ObjectNode l : L) { try { n += snapOne(s(l, "group_id"), s(l, "child_tid"), day, g(l, "share")); } catch (Exception e) { /* 한 기관 실패는 건너뜀 */ } } return n;
    }
    /** 매일 03:00(KST) 전날 분 · 초대 만료 · 해제 30일 지난 집계 삭제 · 멱등 7일 — Node group tick과 같은 순서 */
    volatile String lastSnap = "";
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 600000, initialDelayString = "${dd.group.tickMs:600000}")
    public void tick() { try { sweep(false); } catch (Exception ignore) { /* 표가 없거나(마이그레이션 전) 일시 오류 — 다음 회차에 다시 */ } }
    public int sweep(boolean force) throws Exception {
        int n = txAs("", "", true, () -> {
            int k = db.x("update grp_link set status = 'expired' where id in (select id from grp_link where status = 'invited' and expires_at < now() limit 200)");
            k += db.x("delete from grp_kpi_day where (group_id, child_tid) in (select group_id, child_tid from grp_link where status in ('left','removed') and ended_at < now() - interval '30 days') and not exists (select 1 from grp_link a where a.group_id = grp_kpi_day.group_id and a.child_tid = grp_kpi_day.child_tid and a.status = 'active')");
            k += db.x("delete from grp_idem where at < now() - interval '7 days'"); return k; });
        Instant now = Instant.now().plusSeconds(9 * 3600); String day = now.atOffset(ZoneOffset.UTC).toLocalDate().minusDays(1).toString();
        if (force || (now.atOffset(ZoneOffset.UTC).getHour() >= 3 && !day.equals(lastSnap))) { lastSnap = day; n += snapDay(day, null); }
        return n;
    }

    // ── 라우트 표 ───────────────────────────────────────────
    @FunctionalInterface interface H { Object go(HttpServletRequest req, HttpServletResponse res, byte[] raw, String[] p) throws Exception; }
    final Map<String, H> R = new LinkedHashMap<>(); final List<Object[]> P = new ArrayList<>();
    void r(String key, H h) { R.put(key, h); }
    void p(String m, String re, H h) { P.add(new Object[]{ m, Pattern.compile(re), h }); }
    @Override public Object route(HttpServletRequest req, HttpServletResponse res, byte[] body) throws Exception {
        String path = req.getRequestURI(), m = req.getMethod(); H h = R.get(m + " " + path); String[] grp = new String[0];
        if (h == null) for (Object[] x : P) { if (!m.equals(x[0])) continue; Matcher mt = ((Pattern) x[1]).matcher(path); if (mt.matches()) { h = (H) x[2]; grp = new String[mt.groupCount()]; for (int i = 0; i < grp.length; i++) grp[i] = mt.group(i + 1); break; } }
        if (h == null) throw E(404, "not_found", "없는 주소입니다.");
        scopeSet("", "", false); try { return h.go(req, res, body, grp); } finally { SCOPE.remove(); }
    }
}
