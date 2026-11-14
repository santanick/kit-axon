package egovframework.didisam.mileage.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdPiiCrypto;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.fac.service.impl.FacErr;
import egovframework.didisam.mileage.service.MileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** v42 학습 마일리지(04-data-api) — Node service/server/mileage(index · mod-admin · mod-pub · sweep)와 같은 /api · 오류 코드 · 응답 JSON.
 *  업무 규칙은 SQL 함수 mil_*(Node 마이그레이션 소유)에 있고, 여기서는 Node와 같은 SQL 문장으로 경로 · 권한 · 기관 플래그 · 속도 제한 · 감사만 한다.
 *  제품 고정(서버 강제): 국비 과정 금전성 차단(D1, DB 제약 + mil_cash_ok) · 운영자 본인 지급 금지 · 충전 · 환급 · 양도 · 기관 밖 사용 경로 없음. */
@Service("mileService")
public class MileServiceImpl extends EgovAbstractServiceImpl implements MileService {
    private final MileMapper m; private final TenantTx tx; private final DdRateLimiter rl; private final AuthService auth; private final DdPiiCrypto pii; private final String hqReviewed;
    public MileServiceImpl(MileMapper m, TenantTx tx, DdRateLimiter rl, AuthService auth, DdPiiCrypto pii, @Value("${MIL_HQ_POOL_REVIEWED:}") String hq) { this.m = m; this.tx = tx; this.rl = rl; this.auth = auth; this.pii = pii; this.hqReviewed = hq == null ? "" : hq; }

    // ── 오류(Node index.js STATUS · MSG) ─────────────────────
    static final Map<String, Integer> STATUS = Map.ofEntries(Map.entry("mile_off", 403), Map.entry("staff_cap", 403), Map.entry("self_grant", 403), Map.entry("penalty_off", 403), Map.entry("not_found", 404), Map.entry("bill", 404),
        Map.entry("need_sunset", 409), Map.entry("insufficient", 409), Map.entry("below_threshold", 409), Map.entry("negative_balance", 409), Map.entry("out_of_stock", 409), Map.entry("already", 409), Map.entry("limit", 409),
        Map.entry("state", 409), Map.entry("bill_paid", 409), Map.entry("sunset", 409), Map.entry("need_draft", 409), Map.entry("rate", 429));
    static final Map<String, String> MSG = Map.ofEntries(Map.entry("mile_off", "마일리지 제도를 켜지 않은 기관입니다."), Map.entry("funded_blocked", "국비 지원 과정에는 금전성 보상을 쓸 수 없습니다."),
        Map.entry("ack_required", "안내 내용을 읽고 사유를 입력해 주십시오."), Map.entry("bad_rule", "규칙 값을 확인해 주십시오."), Map.entry("hq_pool_locked", "본사 통합 마일리지는 법률 검토 완료 전까지 켤 수 없습니다."),
        Map.entry("over_tuition", "정가 줄이 등록 교습비를 넘습니다."), Map.entry("over_cap", "상한을 넘습니다."), Map.entry("need_sunset", "적립 이력이 있어 제도 종료 절차로 진행해야 합니다."),
        Map.entry("insufficient", "쓸 수 있는 마일리지가 부족해요."), Map.entry("below_threshold", "아직 기준 점수에 닿지 않았어요."), Map.entry("negative_balance", "마일리지가 음수인 동안에는 신청할 수 없어요."),
        Map.entry("out_of_stock", "재고가 없어요."), Map.entry("already", "이미 처리했습니다."), Map.entry("staff_cap", "이번 달 지급 한도를 넘습니다."), Map.entry("self_grant", "운영자 본인 계정에는 지급할 수 없습니다."),
        Map.entry("rate", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."), Map.entry("amount_mismatch", "계산 값이 서버 값과 다릅니다."), Map.entry("bad_points", "신청 포인트를 확인해 주세요."),
        Map.entry("reason", "사유를 입력해 주십시오."), Map.entry("points", "포인트를 확인해 주십시오."), Map.entry("penalty_off", "감점 기능을 켜지 않은 기관입니다."), Map.entry("state", "이미 처리했거나 처리할 수 없는 상태입니다."),
        Map.entry("bill_paid", "수납이 시작된 청구서에는 차감 줄을 붙일 수 없습니다."), Map.entry("bill", "청구서를 찾지 못했습니다."), Map.entry("kind", "이 보상에는 쓸 수 없습니다."), Map.entry("limit", "이번 달 신청 횟수를 넘었어요."),
        Map.entry("sunset", "제도가 종료되었습니다."), Map.entry("not_found", "찾지 못했습니다."), Map.entry("need_draft", "켜기 마법사를 먼저 완료해 주십시오."));
    static DdException E(String code) { return E(code, null, 0); }
    static DdException E(String code, Map<String, Object> extra, int status) { int st = status > 0 ? status : STATUS.getOrDefault(code, 400); String msg = MSG.getOrDefault(code, code);
        return extra == null || extra.isEmpty() ? new DdException(st, msg, code) : new FacErr(st, code, msg, extra); }
    static Map<String, Object> map(Object... kv) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]); return o; }
    /** SQL 함수 결과 {error, …}를 HTTP 오류로 */
    static JsonNode ok(JsonNode r) { if (r != null && r.isObject() && truthy(r.get("error"))) { Map<String, Object> x = new LinkedHashMap<>(); r.fields().forEachRemaining(e -> { if (!"error".equals(e.getKey())) x.put(e.getKey(), e.getValue()); }); throw E(r.get("error").asText(), x, 0); } return r; }

    // ── 값 도우미(Node str · int · sha · rid) ─────────────────
    static final String AZ = "abcdefghijklmnopqrstuvwxyz0123456789", CP = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; static final SecureRandom RND = new SecureRandom();
    static String rid(String p) { byte[] b = new byte[12]; RND.nextBytes(b); StringBuilder s = new StringBuilder(p); for (byte x : b) s.append(AZ.charAt((x & 0xff) % 36)); return s.toString(); }
    static String couponCode() { byte[] b = new byte[8]; RND.nextBytes(b); StringBuilder s = new StringBuilder(); for (byte x : b) s.append(CP.charAt((x & 0xff) % CP.length())); return s.toString(); }
    static String sha(String s) { try { byte[] h = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)); StringBuilder o = new StringBuilder(); for (byte x : h) o.append(String.format("%02x", x)); return o.toString(); } catch (Exception e) { throw new IllegalStateException(e); } }
    /** Node String(v ?? '').slice(0, n) */
    static String str(JsonNode v, int n) { return cut(nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v), n); }
    static String str(String v, int n) { return cut(v == null ? "" : v, n); }
    /** Node int(v) = Math.round(+v) — NaN이면 null 대신 Double.NaN(Node처럼 SQL에서 오류) */
    static Object I(JsonNode v) { double d = round(num(v)); if (!Double.isFinite(d)) return Double.NaN; return (int) d; }
    static double Id(JsonNode v) { double d = round(num(v)); return Double.isFinite(d) ? d : Double.NaN; }
    static boolean obj(JsonNode v) { return v != null && v.isObject(); }
    static String J(JsonNode v) { return nullish(v) ? null : v.toString(); }
    static String qp(HttpServletRequest q, String k) { return q.getParameter(k); }
    static final Pattern DAY = Pattern.compile("^\\d{4}-\\d\\d-\\d\\d$"), SID_OK = Pattern.compile("^[A-Za-z0-9_.@:-]{1,80}$");
    static boolean day(String s) { return s != null && DAY.matcher(s).matches(); }
    static final List<String> TRIG = List.of("signup", "first_login", "attend_day", "streak", "lesson_done", "course_done", "exam_score", "assign_submit", "survey_done", "noncredit_done", "review_ok", "referral_ok", "tube_goal", "evidence", "manual");
    static final List<String> PARTICIPATION = List.of("signup", "first_login", "attend_day", "tube_goal", "streak");
    static final List<String> FIXED = List.of("funded_cash", "no_topup", "no_cashout", "no_transfer", "no_outside", "tuition_cap", "ledger_immutable", "self_grant");
    static double dateMs(String s) { if (s == null || s.isEmpty()) return Double.NaN; try { return Instant.parse(s).toEpochMilli(); } catch (Exception e) { } try { return java.time.OffsetDateTime.parse(s).toInstant().toEpochMilli(); } catch (Exception e) { }
        try { return java.time.LocalDate.parse(s).atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli(); } catch (Exception e) { } try { return java.time.LocalDateTime.parse(s).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(); } catch (Exception e) { return Double.NaN; } }
    static String iso(double ms) { return ISO.format(Instant.ofEpochMilli((long) ms)); }

    // ── SQL(Node 문장 그대로, $n → #{p.pn}) ──────────────────
    static final Pattern PH = Pattern.compile("\\$(\\d+)");
    static final Map<String, String> SQLC = new java.util.concurrent.ConcurrentHashMap<>();
    static String my(String sql) { return SQLC.computeIfAbsent(sql, s -> PH.matcher(s).replaceAll("#{p.p$1}")); }
    static Map<String, Object> P(Object... a) { Map<String, Object> o = new HashMap<>(); for (int i = 0; i < a.length; i++) o.put("p" + (i + 1), a[i] instanceof JsonNode ? J((JsonNode) a[i]) : a[i]); return o; }
    List<ObjectNode> q(String sql, Object... a) { List<ObjectNode> L = new ArrayList<>(); for (Map<String, Object> r : m.rows(my(sql), P(a))) L.add(row(r)); return L; }
    ObjectNode q1(String sql, Object... a) { List<ObjectNode> L = q(sql, a); return L.isEmpty() ? null : L.get(0); }
    int x(String sql, Object... a) { return m.exec(my(sql), P(a)); }
    /** select …(…) r 의 r */
    JsonNode one(String sql, Object... a) { ObjectNode o = q1(sql, a); return o == null ? null : o.get("r"); }
    int n(String sql, Object... a) { JsonNode v = one(sql, a); return v == null || v.isNull() ? 0 : v.asInt(); }
    /** node-postgres 기본 변환과 같게: timestamptz → ISO(ms, Z), date → 서버 현지 자정 ISO, int8 · numeric → 문자열, json · jsonb → 값 */
    static JsonNode val(Object v) {
        if (v == null) return F.nullNode();
        if (v instanceof java.sql.Timestamp) return t(ISO.format(((java.sql.Timestamp) v).toInstant()));
        if (v instanceof java.time.OffsetDateTime) return t(ISO.format(((java.time.OffsetDateTime) v).toInstant()));
        if (v instanceof java.sql.Date) return t(ISO.format(((java.sql.Date) v).toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant()));
        if (v instanceof Long || v instanceof BigDecimal) return t(v.toString());
        if (v instanceof Integer || v instanceof Short) return F.numberNode(((Number) v).intValue());
        if (v instanceof Double || v instanceof Float) return numNode(((Number) v).doubleValue());
        if (v instanceof Boolean) return F.booleanNode((Boolean) v);
        if (v instanceof org.postgresql.util.PGobject) { org.postgresql.util.PGobject o = (org.postgresql.util.PGobject) v; String s = o.getValue(); if (s == null) return F.nullNode(); return "json".equals(o.getType()) || "jsonb".equals(o.getType()) ? parse(s) : t(s); }
        if (v instanceof java.sql.Array) { try { Object[] a = (Object[]) ((java.sql.Array) v).getArray(); ArrayNode o = F.arrayNode(); for (Object x : a) o.add(val(x)); return o; } catch (Exception e) { return F.nullNode(); } }
        return t(String.valueOf(v));
    }
    static ObjectNode row(Map<String, Object> r) { ObjectNode o = F.objectNode(); r.forEach((k, v) -> o.set(k, val(v))); return o; }
    static JsonNode g(JsonNode o, String k) { JsonNode v = o == null ? null : o.get(k); return v == null ? F.nullNode() : v; }

    // ── 행 → 응답(카멜, Node polOut · ruleOut · rwOut · enOut · rdOut) ──
    static ObjectNode cp(JsonNode r, String... kv) { ObjectNode o = F.objectNode(); for (int i = 0; i + 1 < kv.length; i += 2) o.set(kv[i], g(r, kv[i + 1])); return o; }
    static ObjectNode polOut(JsonNode p) { return cp(p, "on", "is_on", "ver", "ver", "unitName", "unit_name", "template", "template", "expiry", "expiry", "notice", "notice", "budget", "budget", "dailyCapTotal", "daily_cap_total", "league", "league", "streak", "streak", "scope", "scope",
        "tiers", "tiers", "tierWindow", "tier_window", "cashLock", "cash_lock", "sunset", "sunset", "rank", "rank", "penalty", "penalty", "grantCfg", "grant_cfg", "shop", "shop", "recommended", "recommended", "updatedBy", "updated_by", "updatedAt", "updated_at"); }
    static ObjectNode ruleOut(JsonNode r) { return cp(r, "id", "id", "ver", "ver", "trigger", "trigger", "nature", "nature", "label", "label", "cond", "cond", "score", "score", "caps", "caps", "once", "once", "groupKey", "group_key", "trustMin", "trust_min", "approval", "approval",
        "approveOver", "approve_over", "expiry", "expiry", "record", "record", "startsOn", "starts_on", "endsOn", "ends_on", "active", "active"); }
    static ObjectNode rwOut(JsonNode r) { return cp(r, "id", "id", "kind", "kind", "title", "title", "cost", "cost", "minUse", "min_use", "maxUse", "max_use", "step", "step", "threshold", "threshold", "stock", "stock", "perSid", "per_sid", "approval", "approval", "cash", "cash",
        "audience", "audience", "link", "link", "active", "active"); }
    static ObjectNode enOut(JsonNode e) { return cp(e, "id", "id", "sid", "sid", "unit", "scope_unit", "kind", "kind", "points", "points", "status", "status", "nature", "nature", "trust", "trust", "convertible", "convertible", "funded", "funded", "cls", "cls_id", "trigger", "trigger",
        "ruleId", "rule_id", "ruleVer", "rule_ver", "redeemId", "redeem_id", "refEntry", "ref_entry", "expiresAt", "expires_at", "reason", "reason", "byStaff", "by_staff", "at", "at", "postedAt", "posted_at"); }
    static ObjectNode rdOut(JsonNode d) { return cp(d, "id", "id", "sid", "sid", "unit", "scope_unit", "rewardId", "reward_id", "points", "points", "won", "won", "status", "status", "fulfil", "fulfil", "decidedBy", "decided_by", "decidedAt", "decided_at", "reason", "reason", "at", "at"); }
    static ArrayNode list(List<ObjectNode> L, java.util.function.Function<JsonNode, ObjectNode> f) { ArrayNode a = F.arrayNode(); for (ObjectNode x : L) a.add(f.apply(x)); return a; }

    // ── 기관 플래그 · 정책 ─────────────────────────────────
    ObjectNode docOf(String tid) { ObjectNode r = q1("select doc->'org' org, doc->'mileage' mil from tenant_state where tenant_id = $1", tid); return r == null ? F.objectNode() : r; }
    /** 모듈 플래그: 기관 문서 org.mileage_on === false 또는 mileage.on === false면 꺼짐(D2) */
    boolean modOn(String tid) { ObjectNode d = docOf(tid); JsonNode o = d.get("org"), mi = d.get("mil"); return !(truthy(o) && strictEq(get(o, "mileage_on"), F.booleanNode(false))) && !(truthy(mi) && strictEq(get(mi, "on"), F.booleanNode(false))); }
    void needMod(String tid) { if (!modOn(tid)) throw E("mile_off"); }
    ObjectNode pol(String tid) { return q1("select * from mil_policy where tenant_id = $1", tid); }
    ObjectNode ensurePol(String tid) { x("insert into mil_policy (tenant_id) values ($1) on conflict do nothing", tid); return pol(tid); }
    boolean policyOn(String tid) { ObjectNode p = pol(tid); return p != null && p.path("is_on").asBoolean(false); }
    <T> T T(Map<String, Object> a, TenantTx.Work<T> fn) throws Exception { String tid = tid(a); return tx.inTenant(tid, () -> { needMod(tid); return fn.run(); }); }
    static String tid(Map<String, Object> a) { return (String) a.get("tid"); }
    static String email(Map<String, Object> a) { return (String) a.get("email"); }
    void audit(String tid, String who, String act, Object detail) { tx.audit(tid, who, act, DdWeb.JSON.valueToTree(detail).toString()); }
    void log(String tid, String area, Object before, Object after, String reason, String by, Object ver) {
        x("insert into mil_policy_log (tenant_id, ver, area, before, after, reason, by_staff) values ($1,$2::int,$3,$4::jsonb,$5::jsonb,$6,$7)", tid, ver, area, js(before), js(after), reason == null || reason.isEmpty() ? null : reason, by); }
    static String js(Object o) { if (o == null) return null; JsonNode n = o instanceof JsonNode ? (JsonNode) o : DdWeb.JSON.valueToTree(o); return n.isNull() ? null : n.toString(); }
    List<ObjectNode> latestRules(String tid) { return q("select distinct on (id) * from mil_rule where tenant_id = $1 order by id, ver desc", tid); }
    List<JsonNode> rewardsOf(String tid) { List<JsonNode> L = new ArrayList<>(); for (ObjectNode r : q("select * from mil_reward where tenant_id = $1 order by at, id", tid)) L.add(rwOut(r)); return L; }

    // ── 정책 저장(Node savePolicy) ──────────────────────────
    static final String[][] PCOL = { {"unitName", "unit_name", "u"}, {"expiry", "expiry", "o"}, {"notice", "notice", "o"}, {"budget", "budget", "o"}, {"dailyCapTotal", "daily_cap_total", "n"}, {"league", "league", "o"}, {"streak", "streak", "o"},
        {"scope", "scope", "o"}, {"tiers", "tiers", "a"}, {"tierWindow", "tier_window", "w"}, {"cashLock", "cash_lock", "o"}, {"grantCfg", "grant_cfg", "o"}, {"shop", "shop", "o"} };
    ObjectNode[] savePolicy(Map<String, Object> a, JsonNode P, String reason) {
        String tid = tid(a); ObjectNode cur = ensurePol(tid); List<String> sets = new ArrayList<>(); List<Object> vals = new ArrayList<>(); vals.add(tid); ObjectNode before = F.objectNode(), after = F.objectNode();
        for (String[] c : PCOL) { if (!P.has(c[0])) continue; JsonNode v = P.get(c[0]); String cast = "";
            switch (c[2]) {
                case "u": { String s = str(v, 10); vals.add(s.isEmpty() ? "P" : s); break; }
                case "n": { if (v.isNull()) vals.add(null); else { double d = Id(v); vals.add(Double.isNaN(d) ? (Object) Double.NaN : (Object) (int) Math.max(0, d)); } cast = "::int"; break; }
                case "w": vals.add(List.of("m12", "term", "year").contains(v.isTextual() ? v.asText() : "") ? v.asText() : "m12"); break;
                case "a": if (!v.isArray()) throw E("bad_rule", map("field", c[0]), 400); vals.add(v.toString()); cast = "::jsonb"; break;
                default: if (!obj(v)) throw E("bad_rule", map("field", c[0]), 400); vals.add(v.toString()); cast = "::jsonb"; }
            sets.add(c[1] + " = $" + vals.size() + cast); before.set(c[0], g(cur, c[1])); after.set(c[0], v); }
        if (obj(P.get("scope")) && strictEq(get(P.get("scope"), "hqPool"), F.booleanNode(true)) && !"1".equals(hqReviewed)) throw E("hq_pool_locked");
        if (obj(P.get("shop")) && strictEq(get(P.get("shop"), "on"), F.booleanNode(true)) && !(truthy(cur.get("shop")) && truthy(get(cur.get("shop"), "on"))) && !(truthy(get(P.get("shop"), "ack")) && strictEq(get(P.get("shop"), "ack", "read"), F.booleanNode(true))))
            throw E("ack_required", map("notice", "G"), 400);
        if (sets.isEmpty()) return new ObjectNode[]{ cur, null };
        vals.add(email(a)); ObjectNode p = q1("update mil_policy set " + String.join(", ", sets) + ", ver = ver + 1, updated_by = $" + vals.size() + ", updated_at = now() where tenant_id = $1 returning *", vals.toArray());
        if (P.has("shop")) { ObjectNode sh = P.get("shop").isObject() ? ((ObjectNode) P.get("shop")).deepCopy() : F.objectNode();
            if (truthy(sh.get("ack"))) { ObjectNode ak = ((ObjectNode) sh.get("ack")).deepCopy(); ak.put("by", email(a)).put("at", isoNow()); sh.set("ack", ak); } else sh.remove("ack");
            log(tid, "reward", F.objectNode().set("shop", before.get("shop")), F.objectNode().set("shop", sh), reason, email(a), p.get("ver").asInt()); before.remove("shop"); after.remove("shop"); }
        if (after.size() > 0) log(tid, "policy", before, after, reason, email(a), p.get("ver").asInt());
        return new ObjectNode[]{ p, F.objectNode() };
    }
    /** 규칙 검증 · 정규화(Node cleanRule) */
    static ObjectNode cleanRule(JsonNode b) {
        String trigger = str(get(b, "trigger"), 20); if (!TRIG.contains(trigger) || "manual".equals(trigger)) throw E("bad_rule", map("field", "trigger"), 400);
        String nature = PARTICIPATION.contains(trigger) ? "participation" : (strictEq(get(b, "nature"), "participation") ? "participation" : "achievement");
        JsonNode score = obj(get(b, "score")) ? get(b, "score") : F.objectNode().put("mode", "fixed").put("v", 0); String mode = nullish(score.get("mode")) ? "" : egovframework.didisam.cmm.Js.str(score.get("mode"));
        if (!List.of("fixed", "band", "per_unit", "source").contains(mode)) throw E("bad_rule", map("field", "score"), 400);
        if ("band".equals(mode)) { JsonNode bs = score.get("bands"); boolean okb = bs != null && bs.isArray(); if (okb) for (JsonNode x : bs) { if (!x.isArray() || x.size() != 2) { okb = false; break; } for (JsonNode nn : x) if (!Double.isFinite(num(nn))) okb = false; } if (!okb) throw E("bad_rule", map("field", "bands"), 400); }
        if (("fixed".equals(mode) || "per_unit".equals(mode)) && !(Id(score.get("v")) > 0 && Id(score.get("v")) <= 1e6)) throw E("bad_rule", map("field", "score.v"), 400);
        JsonNode on = get(b, "once"); String once = on != null && on.isTextual() && List.of("none", "ever", "per_src", "per_day").contains(on.asText()) ? on.asText() : "per_src";
        String id = truthy(get(b, "id")) ? str(get(b, "id"), 34) : rid("mru_"); if (!id.matches("^mru_[a-z0-9_]{1,30}$")) throw E("bad_rule", map("field", "id"), 400);
        ObjectNode r = F.objectNode().put("id", id).put("trigger", trigger).put("nature", nature).put("label", str(get(b, "label"), 80)); r.set("cond", obj(get(b, "cond")) ? get(b, "cond") : F.objectNode()); r.set("score", score);
        r.set("caps", obj(get(b, "caps")) ? get(b, "caps") : F.objectNode()); r.put("once", once); if (truthy(get(b, "groupKey"))) r.put("groupKey", str(get(b, "groupKey"), 30)); else r.putNull("groupKey");
        JsonNode tm = get(b, "trustMin"), ap = get(b, "approval"); r.put("trustMin", tm != null && tm.isTextual() && List.of("A", "B", "C").contains(tm.asText()) ? tm.asText() : "C");
        r.put("approval", ap != null && ap.isTextual() && List.of("auto", "manual", "over", "evidence", "two_step").contains(ap.asText()) ? ap.asText() : "auto");
        if (nullish(get(b, "approveOver"))) r.putNull("approveOver"); else r.set("approveOver", numNode(Id(get(b, "approveOver"))));
        r.set("expiry", obj(get(b, "expiry")) ? get(b, "expiry") : F.nullNode()); r.set("record", obj(get(b, "record")) ? get(b, "record") : F.nullNode());
        String so = S(get(b, "startsOn")), eo = S(get(b, "endsOn")); if (day(so)) r.put("startsOn", so); else r.putNull("startsOn"); if (day(eo)) r.put("endsOn", eo); else r.putNull("endsOn");
        r.put("active", !strictEq(get(b, "active"), F.booleanNode(false))); return r;
    }
    static Object numOrNull(JsonNode v) { if (nullish(v)) return null; double d = num(v); return Double.isNaN(d) ? (Object) Double.NaN : (Object) (int) d; }
    ObjectNode insRule(Map<String, Object> a, JsonNode r) { String tid = tid(a); int ver = n("select coalesce(max(ver), 0)::int + 1 r from mil_rule where tenant_id = $1 and id = $2", tid, S(r.get("id")));
        if (truthy(r.get("groupKey"))) x("insert into mil_group (tenant_id, key, label, caps) values ($1,$2,$2,'{\"term\":100}') on conflict do nothing", tid, S(r.get("groupKey")));
        ObjectNode row = q1("insert into mil_rule (tenant_id, id, ver, trigger, nature, label, cond, score, caps, once, group_key, trust_min, approval, approve_over, expiry, record, starts_on, ends_on, active, created_by) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14::int,$15::jsonb,$16::jsonb,$17::date,$18::date,$19,$20) returning *",
            tid, S(r.get("id")), ver, S(r.get("trigger")), S(r.get("nature")), S(r.get("label")), r.get("cond"), r.get("score"), r.get("caps"), S(r.get("once")), nullish(r.get("groupKey")) ? null : S(r.get("groupKey")), S(r.get("trustMin")), S(r.get("approval")),
            numOrNull(r.get("approveOver")), r.get("expiry"), r.get("record"), nullish(r.get("startsOn")) ? null : S(r.get("startsOn")), nullish(r.get("endsOn")) ? null : S(r.get("endsOn")), r.get("active").asBoolean(), email(a));
        log(tid, "rule", null, ruleOut(row), null, email(a), null); return row; }
    void fundedBlock(String tid, JsonNode cls, boolean cash) { if (!cash || cls == null || !cls.isArray()) return; for (JsonNode c : cls) if (!one("select mil_cash_ok($1,$2) r", tid, str(c, 60)).asBoolean()) throw E("funded_blocked"); }
    static final List<String> KINDS = List.of("tuition", "coupon", "goods", "badge", "cert", "shop");
    ObjectNode saveReward(Map<String, Object> a, JsonNode b) { String tid = tid(a);
        String kind = str(get(b, "kind"), 10); if (!KINDS.contains(kind)) throw E("bad_rule", map("field", "kind"), 400); /* scholar 정산은 v42.2 */
        String title = trim(str(get(b, "title"), 60)); if (title.isEmpty()) throw E("bad_rule", map("field", "title"), 400);
        boolean cash = List.of("tuition", "coupon", "shop", "goods").contains(kind) || strictEq(get(b, "cash"), F.booleanNode(true));
        ObjectNode link = obj(get(b, "link")) ? ((ObjectNode) get(b, "link")).deepCopy() : F.objectNode();
        if (!nullish(link.get("priceWon"))) { double pw = Id(link.get("priceWon")); link.set("priceWon", numNode(pw)); if (!(pw >= 0)) throw E("bad_rule", map("field", "link.priceWon"), 400); }
        if (!nullish(link.get("unitId")) && !egovframework.didisam.cmm.Js.str(link.get("unitId")).matches("^lu_[a-z0-9]{1,24}$")) throw E("bad_rule", map("field", "link.unitId"), 400);
        JsonNode audience = obj(get(b, "audience")) ? get(b, "audience") : F.objectNode(); fundedBlock(tid, audience.get("cls"), cash);
        JsonNode cost = obj(get(b, "cost")) ? get(b, "cost") : F.objectNode().put("wonPerP", 1); if (!nullish(cost.get("wonPerP")) && !(num(cost.get("wonPerP")) >= 0 && num(cost.get("wonPerP")) <= 1000)) throw E("bad_rule", map("field", "cost.wonPerP"), 400);
        String id = truthy(get(b, "id")) ? str(get(b, "id"), 34) : rid("mrw_"); if (!id.matches("^mrw_[a-z0-9_]{1,30}$")) throw E("bad_rule", map("field", "id"), 400);
        ObjectNode before = q1("select * from mil_reward where tenant_id = $1 and id = $2", tid, id);
        double mu = Id(get(b, "minUse")), st = Id(get(b, "step")), th = Id(get(b, "threshold")); JsonNode ap = get(b, "approval");
        ObjectNode row = q1("insert into mil_reward (tenant_id, id, kind, title, cost, min_use, max_use, step, threshold, stock, per_sid, approval, cash, audience, active, link) values ($1,$2,$3,$4,$5::jsonb,$6::int,$7::jsonb,$8::int,$9::int,$10::int,$11::jsonb,$12,$13,$14::jsonb,$15,$16::jsonb)"
            + " on conflict (tenant_id, id) do update set kind = excluded.kind, title = excluded.title, cost = excluded.cost, min_use = excluded.min_use, max_use = excluded.max_use, step = excluded.step, threshold = excluded.threshold, stock = excluded.stock,"
            + " per_sid = excluded.per_sid, approval = excluded.approval, cash = excluded.cash, audience = excluded.audience, active = excluded.active, link = excluded.link returning *",
            tid, id, kind, title, cost, (int) Math.max(0, Double.isNaN(mu) || mu == 0 ? 0 : mu), obj(get(b, "maxUse")) ? get(b, "maxUse") : F.objectNode(), (int) Math.max(1, Double.isNaN(st) || st == 0 ? 1 : st), (int) Math.max(0, Double.isNaN(th) || th == 0 ? 0 : th),
            nullish(get(b, "stock")) ? null : (Object) (int) Math.max(0, Id(get(b, "stock"))), obj(get(b, "perSid")) ? get(b, "perSid") : F.objectNode(), ap != null && ap.isTextual() && List.of("auto", "manual", "two_step").contains(ap.asText()) ? ap.asText() : "manual",
            cash, audience, !strictEq(get(b, "active"), F.booleanNode(false)), link);
        log(tid, "reward", before == null ? null : rwOut(before), rwOut(row), null, email(a), null); return row; }

    /** 학원비 차감 후보 청구서(Node billFor) */
    ObjectNode billFor(String tid, String sid, String billId) {
        String id = billId; if (id == null) { ObjectNode r = q1("select ch.bill_id from led_charge ch where ch.tenant_id = $1 and ch.sid = $2 and ch.status <> 'void' and not exists (select 1 from led_alloc a join led_charge x on x.tenant_id = a.tenant_id and x.id = a.charge_id where a.tenant_id = $1 and x.bill_id = ch.bill_id)"
            + " and not exists (select 1 from led_charge m where m.tenant_id = $1 and m.bill_id = ch.bill_id and m.src_type = 'mileage' and m.status <> 'void') group by ch.bill_id order by max(ch.created_at) desc limit 1", tid, sid); id = r == null || r.get("bill_id").isNull() ? null : r.get("bill_id").asText(); }
        if (id == null || id.isEmpty()) return null; List<ObjectNode> lines = q("select id, title, amount, item_type, src_type, src_id, status from led_charge where tenant_id = $1 and bill_id = $2 order by created_at, id", tid, id);
        if (lines.isEmpty()) return null;
        int paid = n("select coalesce(sum(a.amount), 0)::int r from led_alloc a join led_charge x on x.tenant_id = a.tenant_id and x.id = a.charge_id where a.tenant_id = $1 and x.bill_id = $2", tid, id);
        boolean funded = false; long sum = 0; ArrayNode ls = F.arrayNode();
        for (ObjectNode l : lines) { String stt = S(l.get("src_type")); if (List.of("class", "cls").contains(stt) && !"void".equals(S(l.get("status"))) && !one("select mil_cash_ok($1,$2) r", tid, S(l.get("src_id"))).asBoolean()) funded = true;
            if (!"void".equals(S(l.get("status")))) sum += l.get("amount").asLong(); ls.add(cp(l, "id", "id", "title", "title", "amount", "amount", "itemType", "item_type", "srcType", "src_type", "status", "status")); }
        ObjectNode o = F.objectNode().put("id", id); o.set("lines", ls); o.put("paid", paid).put("funded", funded).put("sum", sum); return o;
    }
    static ArrayNode checksOf(JsonNode d, JsonNode rw, ObjectNode bill) { ArrayNode out = F.arrayNode();
        if (strictEq(rw.get("kind"), "tuition")) { JsonNode c = rw.get("cost"); double wpp = truthy(c) && !nullish(c.get("wonPerP")) ? num(c.get("wonPerP")) : 1; if (wpp == 0 || Double.isNaN(wpp)) wpp = 1;
            if (bill == null) out.addObject().put("code", "no_bill").put("block", false).put("text", "붙일 청구서가 없습니다. 승인하면 다음 청구서를 만들 때 차감합니다.").putNull("fixPoints");
            else { if (bill.get("funded").asBoolean()) out.addObject().put("code", "funded_blocked").put("block", true).put("text", "국비 지원 과정 청구서에는 차감할 수 없습니다.").putNull("fixPoints");
                if (bill.get("paid").asLong() > 0) out.addObject().put("code", "bill_paid").put("block", true).put("text", "수납이 시작된 청구서입니다. 다른 청구서를 고르십시오.").putNull("fixPoints");
                JsonNode mx = rw.get("max_use"); double pct = truthy(mx) && !nullish(mx.get("billPct")) ? num(mx.get("billPct")) : 30; long max = (long) Math.floor(bill.get("sum").asLong() * pct / 100);
                double step = truthy(rw.get("step")) ? rw.get("step").asDouble() : 1;
                if (d.get("won").asLong() > max) out.addObject().put("code", "over_cap").put("block", true).put("text", "청구서의 " + numStr(pct) + "%(" + String.format("%,d", max) + "원)를 넘습니다.").set("fixPoints", numNode(Math.floor(max / wpp / step) * step)); } }
        if (!nullish(rw.get("stock")) && rw.get("stock").asLong() <= 0) out.addObject().put("code", "out_of_stock").put("block", true).put("text", "재고가 없습니다.").putNull("fixPoints");
        return out; }
    JsonNode fulfil(Map<String, Object> a, String id, String billId) { String tid = tid(a);
        ObjectNode d = q1("select d.*, w.kind, w.link from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.id = $2", tid, id); String kind = S(d.get("kind"));
        if ("coupon".equals(kind)) for (int i = 0; i < 5; i++) { String code = couponCode(); if (!q("select 1 from mil_redeem where tenant_id = $1 and fulfil->>'couponCode' = $2", tid, code).isEmpty()) continue;
            return ok(one("select mil_redeem_fulfil($1,$2,$3::jsonb) r", tid, id, F.objectNode().put("couponCode", code).put("until", DdMileCalc.kst(Instant.now().plusMillis(90L * 864e5 > 0 ? 90L * 86400000L : 0))))); }
        if ("tuition".equals(kind)) { ObjectNode b = billFor(tid, S(d.get("sid")), billId); if (b == null) return F.objectNode().put("ok", true).put("status", "approved").put("note", "no_bill"); return ok(one("select mil_add_line($1,$2,$3) r", tid, b.get("id").asText(), id)); }
        if ("badge".equals(kind) || "cert".equals(kind)) { JsonNode ln = d.get("link"); ObjectNode f = F.objectNode().put("at", isoNow()); f.set("badgeId", truthy(ln) && !nullish(ln.get("badgeId")) ? ln.get("badgeId") : F.nullNode());
            return ok(one("select mil_redeem_fulfil($1,$2,$3::jsonb) r", tid, id, f)); }
        return F.objectNode().put("ok", true).put("status", "approved"); }
    JsonNode decideOne(Map<String, Object> a, String id, JsonNode b) throws Exception { return T(a, () -> { String tid = tid(a); String dec = S(get(b, "decision"));
        if (id.startsWith("me_")) { if ("approve".equals(dec)) return ok(one("select mil_post($1,$2) r", tid, id)); if (trim(str(get(b, "reason"), 200)).isEmpty()) throw E("reason");
            JsonNode r = ok(one("select mil_void($1,$2) r", tid, id)); audit(tid, email(a), "mileage.earn.reject", map("id", id, "reason", str(get(b, "reason"), 200))); return r; }
        if (id.startsWith("mpf_")) return proofDecide(a, id, b);
        if (!id.matches("^mrd_[a-z0-9]{12}$")) throw E("not_found");
        JsonNode r; String why = str(get(b, "reason"), 200);
        if ("adjust".equals(dec)) { ok(one("select mil_redeem_adjust($1,$2,$3::int,$4,$5) r", tid, id, I(get(b, "points")), email(a), why.isEmpty() ? null : why)); r = ok(one("select mil_redeem_decide($1,$2,'approve',$3,$4) r", tid, id, email(a), why.isEmpty() ? null : why)); }
        else if ("approve".equals(dec)) r = ok(one("select mil_redeem_decide($1,$2,'approve',$3,null) r", tid, id, email(a)));
        else if ("reject".equals(dec)) r = ok(one("select mil_redeem_decide($1,$2,'reject',$3,$4) r", tid, id, email(a), why));
        else throw E("bad_rule", map("field", "decision"), 400);
        if (strictEq(r.get("status"), "approved")) { ObjectNode o = ((ObjectNode) r).deepCopy(); o.setAll((ObjectNode) fulfil(a, id, truthy(get(b, "billId")) ? str(get(b, "billId"), 40) : null)); r = o; }
        audit(tid, email(a), "mileage.redeem." + dec, map("id", id, "points", r.get("points"), "status", r.get("status"))); return r; }); }
    JsonNode proofDecide(Map<String, Object> a, String id, JsonNode b) { String tid = tid(a);
        ObjectNode p = q1("select * from mil_proof where tenant_id = $1 and id = $2 for update", tid, id); if (p == null) throw E("not_found"); if (!strictEq(p.get("status"), "submitted")) throw E("state");
        if (!strictEq(get(b, "decision"), "approve")) { String why = trim(str(get(b, "reason"), 200)); if (why.isEmpty()) throw E("reason");
            x("update mil_proof set status = 'rejected', reason = $3, decided_by = $4, purge_at = now() + interval '30 days' where tenant_id = $1 and id = $2", tid, id, why, email(a)); return F.objectNode().put("ok", true).put("id", id).put("status", "rejected"); }
        JsonNode r = one("select mil_emit($1,$2,'evidence','pf',$3,$4::numeric,'B',coalesce($5::timestamptz, now()),$6,'lu_root') r", tid, S(p.get("sid")), id, nullish(get(b, "points")) ? null : I(get(b, "points")), null, nullish(p.get("item")) || S(p.get("item")).isEmpty() ? null : S(p.get("item")));
        JsonNode e0 = r.path("entries").path(0); int pts = e0.isMissingNode() || nullish(e0.get("points")) ? 0 : e0.get("points").asInt();
        x("update mil_proof set status = 'approved', points = $3, decided_by = $4, purge_at = now() + interval '90 days' where tenant_id = $1 and id = $2", tid, id, pts, email(a));
        ObjectNode o = F.objectNode().put("ok", true).put("id", id).put("status", "approved"); o.set("result", r); return o; }

    // ── 모의 계산: 같은 SQL 엔진을 임시 기관에서 돌리고 되돌린다(milecalc.js simulate와 같은 집계) ──
    static final class Rollback extends RuntimeException { final ObjectNode out; Rollback(ObjectNode o) { super(null, null, false, false); out = o; } }
    ObjectNode simulate(JsonNode policy, JsonNode rules, JsonNode rewards, List<ObjectNode> events) throws Exception {
        try { tx.plain(() -> { String st = "tn_sim" + rid("").substring(0, 8);
                x("insert into tenants (id, name, type) values ($1, 'sim', 'academy')", st); x("set local role didisam_tenant"); x("select set_config('app.tenant', $1, true)", st);
                JsonNode p = policy == null ? DdMileCalc.DEFAULT_POLICY : policy;
                x("insert into mil_policy (tenant_id, is_on, expiry, notice, budget, daily_cap_total, streak, cash_lock, sunset, penalty, grant_cfg) values ($1,true,coalesce($2::jsonb,'{\"mode\":\"months\",\"months\":12}'),coalesce($3::jsonb,'{\"monthsBefore\":6,\"daysBefore\":[30,3]}'),coalesce($4::jsonb,'{}'),$5::int,coalesce($6::jsonb,'{}'),coalesce($7::jsonb,'{\"needTrust\":\"B\",\"achievementOnly\":true}'),null,coalesce($8::jsonb,'{\"on\":false}'),coalesce($9::jsonb,'{\"approveOver\":1000}'))",
                    st, get(p, "expiry"), get(p, "notice"), get(p, "budget"), numOrNull(get(p, "dailyCapTotal")), get(p, "streak"), get(p, "cashLock"), get(p, "penalty"), get(p, "grantCfg"));
                Set<String> seen = new HashSet<>();
                for (JsonNode r : arr(rules)) { String id = S(get(r, "id")); if (id.isEmpty() || !seen.add(id)) continue; if (truthy(get(r, "groupKey"))) x("insert into mil_group (tenant_id, key, caps) values ($1,$2,'{}') on conflict do nothing", st, S(get(r, "groupKey")));
                    x("insert into mil_rule (tenant_id, id, ver, trigger, nature, cond, score, caps, once, group_key, trust_min, approval, approve_over, expiry, starts_on, ends_on, active) values ($1,$2,1,$3,$4,coalesce($5::jsonb,'{}'),coalesce($6::jsonb,'{}'),coalesce($7::jsonb,'{}'),coalesce($8,'per_src'),$9,coalesce($10,'C'),coalesce($11,'auto'),$12::int,$13::jsonb,$14::date,$15::date,$16)",
                        st, id, S(get(r, "trigger")), truthy(get(r, "nature")) ? S(get(r, "nature")) : "achievement", get(r, "cond"), get(r, "score"), get(r, "caps"), truthy(get(r, "once")) ? S(get(r, "once")) : null, truthy(get(r, "groupKey")) ? S(get(r, "groupKey")) : null,
                        truthy(get(r, "trustMin")) ? S(get(r, "trustMin")) : null, truthy(get(r, "approval")) ? S(get(r, "approval")) : null, numOrNull(get(r, "approveOver")), obj(get(r, "expiry")) ? get(r, "expiry") : null, day(S(get(r, "startsOn"))) ? S(get(r, "startsOn")) : null, day(S(get(r, "endsOn"))) ? S(get(r, "endsOn")) : null, !strictEq(get(r, "active"), F.booleanNode(false))); }
                List<ObjectNode> ev = new ArrayList<>(events); ev.sort(Comparator.comparingDouble(e -> dateMs(S(e.get("at")))));
                for (ObjectNode e : ev) one("select mil_emit($1,$2,$3,$4,$5,$6::numeric,$7,$8::timestamptz,$9,coalesce($10,'lu_root')) r", st, S(e.get("sid")), S(e.get("trigger")), S(e.get("srcType")), S(e.get("srcId")), nullish(e.get("value")) ? null : e.get("value").asText(), truthy(e.get("trust")) ? S(e.get("trust")) : "B", S(e.get("at")), nullish(e.get("cls")) ? null : S(e.get("cls")), nullish(e.get("unit")) ? null : S(e.get("unit")));
                List<ObjectNode> E2 = q("select sid, rule_id, points, convertible from mil_entry where tenant_id = $1 and kind = 'earn' order by at, id", st);
                Map<String, Long> by = new LinkedHashMap<>(), per = new LinkedHashMap<>(); long conv = 0;
                for (ObjectNode e : E2) { long pt = e.get("points").asLong(); by.merge(S(e.get("rule_id")).isEmpty() && e.get("rule_id").isNull() ? "undefined" : S(e.get("rule_id")), pt, Long::sum); per.merge(S(e.get("sid")), pt, Long::sum); if (e.get("convertible").asBoolean()) conv += pt; }
                List<Long> vals = new ArrayList<>(per.values()); Collections.sort(vals); long total = 0; for (long v : vals) total += v;
                JsonNode cash = null; for (JsonNode r : arr(rewards)) if (!strictEq(get(r, "cash"), F.booleanNode(false)) && truthy(get(r, "cost")) && !nullish(get(r, "cost", "wonPerP"))) { cash = r; break; }
                ObjectNode o = F.objectNode().put("totalP", total).put("convertibleP", conv); o.set("wonEstimate", numNode(cash != null ? Math.floor(conv * num(get(cash, "cost", "wonPerP"))) : 0));
                o.put("sids", vals.size()).set("perSidAvg", numNode(vals.isEmpty() ? 0 : round((double) total / vals.size()))); o.put("p90", vals.isEmpty() ? 0 : vals.get(Math.min(vals.size() - 1, (int) Math.floor(vals.size() * 0.9))));
                ObjectNode br = F.objectNode(); by.forEach(br::put); o.set("byRule", br); throw new Rollback(o); });
        } catch (Rollback r) { return r.out; }
        throw new IllegalStateException("simulate");
    }
    List<ObjectNode> eventsOf(String tid, int days) { List<ObjectNode> L = q("select sid, trigger, src_type \"srcType\", src_id \"srcId\", value, trust, cls_id cls, scope_unit unit, occurred_at at from mil_event where tenant_id = $1 and occurred_at > now() - make_interval(days => $2::int) order by occurred_at limit 20000", tid, days);
        for (ObjectNode e : L) { if (!e.get("value").isNull()) e.set("value", numNode(num(e.get("value")))); } return L; }
    ObjectNode walletOf(String tid, String sid) { List<ObjectNode> units = q("select scope_unit, streak from mil_wallet where tenant_id = $1 and sid = $2", tid, sid); ArrayNode ws = F.arrayNode();
        for (ObjectNode u : units) { ObjectNode w = F.objectNode().put("unit", S(u.get("scope_unit"))); w.setAll((ObjectNode) one("select mil_sync($1,$2,$3) r", tid, sid, S(u.get("scope_unit")))); w.set("streak", u.get("streak")); ws.add(w); }
        ObjectNode o = F.objectNode().put("ok", true).put("sid", sid); o.set("wallets", ws); o.set("timeline", list(q("select * from mil_entry where tenant_id = $1 and sid = $2 order by at desc, id desc limit 50", tid, sid), MileServiceImpl::enOut)); return o; }
    /** 본인 지급 금지: 직원 이메일과 같은 이메일로 가입한 학습자 sid(pii.identity 블라인드 인덱스) */
    Set<String> selfSids(String tid, String email) { if (!pii.ready() || email == null) return Set.of();
        try { String b = pii.bidx(tid, "email", email); return tx.plain(() -> { Set<String> s = new HashSet<>(); for (ObjectNode r : q("select learner_id::text id from pii.identity where tid = $1 and email_bidx = $2", tid, b)) s.add(S(r.get("id"))); return s; }); } catch (Exception e) { return Set.of(); } }
    static ObjectNode o(Object... kv) { return (ObjectNode) DdWeb.JSON.valueToTree(map(kv)); }

    // ── 운영자 /api/mileage/* ───────────────────────────────
    @Override public Object admin(HttpServletRequest req, HttpServletResponse res, String op, String id, byte[] body) throws Exception {
        switch (op) {
            case "GET config": { Map<String, Object> a = auth.need(req); return T(a, () -> { String tid = tid(a); ObjectNode p = pol(tid); List<JsonNode> rewards = rewardsOf(tid);
                JsonNode policy = p != null ? polOut(p) : ((ObjectNode) DdMileCalc.DEFAULT_POLICY.deepCopy()).put("on", false); ObjectNode d = docOf(tid); JsonNode org = d.get("org");
                ObjectNode out = F.objectNode().put("ok", true); out.set("policy", policy); out.set("rules", list(latestRules(tid), MileServiceImpl::ruleOut)); ArrayNode gs = F.arrayNode(); for (ObjectNode x : q("select key, label, caps from mil_group where tenant_id = $1", tid)) gs.add(cp(x, "key", "key", "label", "label", "caps", "caps")); out.set("groups", gs);
                out.set("rewards", arrNode(rewards)); out.set("template", p != null ? g(p, "template") : F.nullNode()); out.put("suggested", DdMileCalc.templateKey(truthy(org) ? get(org, "type") : null, truthy(org) ? get(org, "ed") : null));
                out.set("recommended", p != null && truthy(p.get("recommended")) ? p.get("recommended") : DdMileCalc.RECOMMEND); out.set("fixed", DdWeb.JSON.valueToTree(FIXED)); out.set("warnings", DdMileCalc.warnings(policy, rewards)); out.put("hqPoolReviewed", "1".equals(hqReviewed)); return out; }); }
            case "POST config": { Map<String, Object> a = auth.needOwner(req); JsonNode b = DdWeb.readBody(body, 32 * 1024); if (!obj(get(b, "policy"))) throw E("bad_rule", map("field", "policy"), 400);
                return T(a, () -> { ObjectNode p = savePolicy(a, get(b, "policy"), str(get(b, "reason"), 200))[0]; ObjectNode po = polOut(p); ObjectNode o = F.objectNode().put("ok", true); o.set("policy", po); o.set("warnings", DdMileCalc.warnings(po, rewardsOf(tid(a)))); return o; }); }
            case "POST onoff": { Map<String, Object> a = auth.needOwner(req); JsonNode b = DdWeb.readBody(body, 2048); return T(a, () -> { String tid = tid(a); ObjectNode p = ensurePol(tid); boolean on = strictEq(get(b, "on"), F.booleanNode(true));
                if (on) { if (!truthy(p.get("draft_hash"))) throw E("need_draft"); x("update mil_policy set is_on = true, updated_by = $2, updated_at = now() where tenant_id = $1", tid, email(a)); }
                else { if (!q("select 1 from mil_entry where tenant_id = $1 limit 1", tid).isEmpty()) throw E("need_sunset"); x("update mil_policy set is_on = false, updated_by = $2, updated_at = now() where tenant_id = $1", tid, email(a)); }
                log(tid, "onoff", o("on", p.get("is_on")), o("on", on), str(get(b, "reason"), 200), email(a), p.get("ver").asInt()); return o("ok", true, "on", on); }); }
            case "POST rank-penalty": { Map<String, Object> a = auth.needOwner(req); JsonNode b = DdWeb.readBody(body, 8192); JsonNode ack = truthy(get(b, "ack")) ? get(b, "ack") : F.objectNode();
                if (!strictEq(get(ack, "read"), F.booleanNode(true)) || trim(str(get(ack, "reason"), 200)).isEmpty()) throw E("ack_required");
                return T(a, () -> { String tid = tid(a); ObjectNode p = ensurePol(tid); ObjectNode stamp = F.objectNode().put("by", email(a)).put("at", isoNow()).put("reason", str(get(ack, "reason"), 200)).put("noticeVer", "R2-6-1"); List<String> sets = new ArrayList<>(); List<Object> vals = new ArrayList<>(); vals.add(tid);
                    JsonNode rk = get(b, "rank"), pe = get(b, "penalty");
                    if (obj(rk)) { String sc = S(rk.get("scope")), nm = S(rk.get("name")); ObjectNode v = F.objectNode().put("on", strictEq(rk.get("on"), F.booleanNode(true))).put("scope", List.of("near10", "group", "all").contains(sc) ? sc : "near10").put("name", List.of("nick", "initial", "real").contains(nm) ? nm : "nick"); v.set("ack", stamp); vals.add(v.toString()); sets.add("rank = $" + vals.size() + "::jsonb"); }
                    if (obj(pe)) { ObjectNode v = F.objectNode().put("on", strictEq(pe.get("on"), F.booleanNode(true))); ArrayNode rs = F.arrayNode(); for (JsonNode r : slice(arr(pe.get("reasons")), 0, 20)) rs.add(str(r, 40)); v.set("reasons", rs);
                        v.set("maxOnce", nullish(pe.get("maxOnce")) ? F.nullNode() : numNode(Id(pe.get("maxOnce")))); v.set("dayCap", nullish(pe.get("dayCap")) ? F.nullNode() : numNode(Id(pe.get("dayCap")))); v.set("ack", stamp); vals.add(v.toString()); sets.add("penalty = $" + vals.size() + "::jsonb"); }
                    if (sets.isEmpty()) throw E("bad_rule", map("field", "rank|penalty"), 400);
                    vals.add(email(a)); ObjectNode nn = q1("update mil_policy set " + String.join(", ", sets) + ", ver = ver + 1, updated_by = $" + vals.size() + ", updated_at = now() where tenant_id = $1 returning *", vals.toArray());
                    log(tid, "rank_penalty", o("rank", p.get("rank"), "penalty", p.get("penalty")), o("rank", nn.get("rank"), "penalty", nn.get("penalty")), stamp.get("reason").asText(), email(a), nn.get("ver").asInt());
                    return o("ok", true, "rank", nn.get("rank"), "penalty", nn.get("penalty"), "noticeVer", "R2-6-1"); }); }
            case "POST funded": { Map<String, Object> a = auth.needOwner(req); JsonNode b = DdWeb.readBody(body, 2048); String cls = str(get(b, "clsId"), 60); if (cls.isEmpty()) throw E("bad_rule", map("field", "clsId"), 400);
                return T(a, () -> { String tid = tid(a); ObjectNode before = q1("select * from mil_funded where tenant_id = $1 and cls_id = $2", tid, cls); boolean f = strictEq(get(b, "funded"), F.booleanNode(true)); String src = S(get(b, "source"));
                    x("insert into mil_funded (tenant_id, cls_id, funded, source, set_by) values ($1,$2,$3,$4,$5) on conflict (tenant_id, cls_id) do update set funded = excluded.funded, source = excluded.source, set_by = excluded.set_by, at = now()", tid, cls, f, List.of("naeil", "moel", "etc", "profile").contains(src) ? src : "etc", email(a));
                    log(tid, "funded", before != null ? o("clsId", cls, "funded", before.get("funded")) : null, o("clsId", cls, "funded", f), str(get(b, "reason"), 200), email(a), null); return o("ok", true, "clsId", cls, "funded", f); }); }
            case "POST rules": { Map<String, Object> a = auth.needStaff(req); JsonNode b = DdWeb.readBody(body, 16 * 1024); ObjectNode r = cleanRule(b);
                return T(a, () -> { ObjectNode row = insRule(a, r); ArrayNode w = F.arrayNode(); if (strictEq(row.get("nature"), "achievement") && strictEq(row.get("trust_min"), "C")) w.addObject().put("code", "trust_c").put("msg", "기기 보고(C) 사건 적립은 현금성 보상에 쓰이지 않습니다.");
                    ObjectNode o = F.objectNode().put("ok", true); o.set("rule", ruleOut(row)); o.set("warnings", w); return o; }); }
            case "POST draft": { Map<String, Object> a = auth.needStaff(req); JsonNode b = DdWeb.readBody(body, 4096);
                ObjectNode[] Z = T(a, () -> { String tid = tid(a); ObjectNode d = docOf(tid); JsonNode org = d.get("org");
                    ObjectNode t = DdMileCalc.template(truthy(org) ? get(org, "type") : null, truthy(get(b, "template")) ? get(b, "template") : (truthy(org) ? get(org, "ed") : null), obj(get(b, "budget")) ? get(b, "budget") : null);
                    ObjectNode draft = F.objectNode(); draft.set("policy", t.get("policy")); draft.set("rules", t.get("rules")); draft.set("rewards", t.get("rewards")); String h = sha(stringify(draft));
                    ensurePol(tid); x("update mil_policy set draft_hash = $2 where tenant_id = $1 and not is_on", tid, h); ObjectNode ev = F.objectNode(); ev.set("e", arrNode(eventsOf(tid, 30))); return new ObjectNode[]{ t, draft, F.objectNode().put("h", h), ev }; });
                ObjectNode t = Z[0]; List<ObjectNode> ev = new ArrayList<>(); for (JsonNode e : Z[3].get("e")) ev.add((ObjectNode) e);
                ObjectNode o = F.objectNode().put("ok", true).put("template", t.get("template").asText()).put("label", t.get("label").asText()); o.setAll(Z[1]); o.set("simulate", simulate(t.get("policy"), t.get("rules"), t.get("rewards"), ev)); o.set("warnings", t.get("warnings")); o.put("draftHash", Z[2].get("h").asText()); return o; }
            case "POST simulate": { Map<String, Object> a = auth.needStaff(req); JsonNode b = DdWeb.readBody(body, 64 * 1024); double dd = Id(get(b, "days")); int days = (int) Math.min(Math.max(Double.isNaN(dd) || dd == 0 ? 30 : dd, 1), 90);
                Object[] Z = T(a, () -> { String tid = tid(a); ObjectNode p = pol(tid); JsonNode po;
                    if (obj(get(b, "policy"))) po = get(b, "policy"); else if (p != null) { ObjectNode x0 = ((ObjectNode) DdMileCalc.DEFAULT_POLICY).deepCopy(); x0.set("expiry", p.get("expiry")); x0.set("dailyCapTotal", p.get("daily_cap_total")); x0.set("budget", p.get("budget")); x0.set("cashLock", p.get("cash_lock")); po = x0; } else po = DdMileCalc.DEFAULT_POLICY;
                    ArrayNode rules = F.arrayNode(); if (get(b, "rules") != null && get(b, "rules").isArray()) { for (JsonNode r : slice(arr(get(b, "rules")), 0, 50)) rules.add(cleanRule(r)); } else for (ObjectNode r : latestRules(tid)) rules.add(ruleOut(r));
                    JsonNode rw = get(b, "rewards") != null && get(b, "rewards").isArray() ? get(b, "rewards") : arrNode(rewardsOf(tid)); return new Object[]{ po, rules, rw, eventsOf(tid, days) }; });
                @SuppressWarnings("unchecked") List<ObjectNode> ev = (List<ObjectNode>) Z[3]; ObjectNode o = F.objectNode().put("ok", true).put("days", days); o.setAll(simulate((JsonNode) Z[0], (JsonNode) Z[1], (JsonNode) Z[2], ev)); return o; }
            case "POST enable": return enable(auth.needOwner(req), DdWeb.readBody(body, 64 * 1024));
            case "GET summary": return summary(auth.need(req), req);
            case "GET entries": { Map<String, Object> a = auth.need(req); double lm = Id(qp(req, "limit") == null ? null : t(qp(req, "limit"))); int lim = (int) Math.min(Math.max(Double.isNaN(lm) || lm == 0 ? 50 : lm, 1), 200);
                List<String> cond = new ArrayList<>(List.of("tenant_id = $1")); List<Object> v = new ArrayList<>(); v.add(tid(a));
                if (truthy(qp(req, "sid"))) { v.add(str(qp(req, "sid"), 80)); cond.add("sid = $" + v.size()); } if (truthy(qp(req, "kind"))) { v.add(str(qp(req, "kind"), 10)); cond.add("kind = $" + v.size()); }
                if (day(qp(req, "from"))) { v.add(qp(req, "from")); cond.add("mil_kst(at) >= $" + v.size() + "::date"); } if (day(qp(req, "to"))) { v.add(qp(req, "to")); cond.add("mil_kst(at) <= $" + v.size() + "::date"); }
                if (truthy(qp(req, "after"))) { String[] af = qp(req, "after").split("\\|", -1); if (!Double.isNaN(dateMs(af[0]))) { v.add(af[0]); v.add(str(af.length > 1 ? af[1] : "undefined", 20)); cond.add("(at, id) < ($" + (v.size() - 1) + "::timestamptz, $" + v.size() + ")"); } }
                return T(a, () -> { List<ObjectNode> rows = q("select * from mil_entry where " + String.join(" and ", cond) + " order by at desc, id desc limit " + (lim + 1), v.toArray()); boolean more = rows.size() > lim; List<ObjectNode> L = slice(rows, 0, lim);
                    ObjectNode o = F.objectNode().put("ok", true); o.set("entries", list(L, MileServiceImpl::enOut)); if (more) o.put("after", S(L.get(L.size() - 1).get("at")) + "|" + S(L.get(L.size() - 1).get("id"))); else o.putNull("after"); return o; }); }
            case "GET wallet": { Map<String, Object> a = auth.need(req); String sid = str(qp(req, "sid"), 80); if (sid.isEmpty()) throw E("not_found"); return T(a, () -> walletOf(tid(a), sid)); }
            case "POST events": return events(auth.needStaff(req), DdWeb.readBody(body, 128 * 1024));
            case "POST grant": return grant(auth.needStaff(req), DdWeb.readBody(body, 16 * 1024));
            case "POST cancel": { Map<String, Object> a = auth.needStaff(req); JsonNode b = DdWeb.readBody(body, 2048); return T(a, () -> { JsonNode r = ok(one("select mil_cancel($1,$2,$3,$4) r", tid(a), str(get(b, "entryId"), 20), str(get(b, "reason"), 200), email(a)));
                audit(tid(a), email(a), "mileage.cancel", map("entry", str(get(b, "entryId"), 20), "reason", str(get(b, "reason"), 200))); return r; }); }
            case "GET approvals": return approvals(auth.need(req), req);
            case "POST approvals/decide": { Map<String, Object> a = auth.needStaff(req); JsonNode b = DdWeb.readBody(body, 16 * 1024); LinkedHashSet<String> ids0 = new LinkedHashSet<>(); for (JsonNode x0 : arr(get(b, "ids"))) ids0.add(str(x0, 20)); List<String> ids = slice(new ArrayList<>(ids0), 0, 100);
                String dec = S(get(b, "decision")); if (ids.isEmpty() || !List.of("approve", "reject", "adjust").contains(dec)) throw E("bad_rule", map("field", "ids|decision"), 400); if ("adjust".equals(dec) && !(Id(get(b, "points")) > 0)) throw E("bad_points");
                ArrayNode out = F.arrayNode(); boolean all = true;
                for (String id0 : ids) { try { ObjectNode r = F.objectNode().put("id", id0); r.setAll((ObjectNode) decideOne(a, id0, b)); out.add(r); if (strictEq(r.get("ok"), F.booleanNode(false))) all = false; }
                    catch (DdException e) { ObjectNode r = F.objectNode().put("id", id0).put("ok", false).put("error", e.getCode()).put("message", e.getMessage()); if (e instanceof FacErr) ((FacErr) e).extra.forEach((k, v) -> r.set(k, DdWeb.JSON.valueToTree(v))); out.add(r); all = false; } }
                ObjectNode o = F.objectNode().put("ok", all); o.set("results", out); return o; }
            case "POST rewards": { Map<String, Object> a = auth.needStaff(req); JsonNode b = DdWeb.readBody(body, 16 * 1024);
                return T(a, () -> { ObjectNode row = saveReward(a, b); ObjectNode p = pol(tid(a)); ArrayNode w0 = DdMileCalc.warnings(p != null ? polOut(p) : F.objectNode(), List.of(rwOut(row))); ArrayNode w = F.arrayNode(); String k = S(row.get("kind"));
                    for (JsonNode x0 : w0) if (!strictEq(x0.get("code"), "no_budget") || List.of("tuition", "coupon", "shop").contains(k)) w.add(x0);
                    ObjectNode o = F.objectNode().put("ok", true); o.set("reward", rwOut(row)); o.set("warnings", w); return o; }); }
            case "GET redeems": { Map<String, Object> a = auth.need(req); List<Object> v = new ArrayList<>(); v.add(tid(a)); StringBuilder w = new StringBuilder();
                if (truthy(qp(req, "status"))) { v.add(str(qp(req, "status"), 12)); w.append(" and status = $").append(v.size()); } if (truthy(qp(req, "sid"))) { v.add(str(qp(req, "sid"), 80)); w.append(" and sid = $").append(v.size()); }
                return T(a, () -> { ObjectNode o = F.objectNode().put("ok", true); o.set("redeems", list(q("select * from mil_redeem where tenant_id = $1" + w + " order by at desc limit 300", v.toArray()), MileServiceImpl::rdOut)); return o; }); }
            case "POST redeems/cancel": return redeemCancel(auth.needStaff(req), DdWeb.readBody(body, 2048));
            case "POST redeems/handed": { Map<String, Object> a = auth.needStaff(req); JsonNode b = DdWeb.readBody(body, 1024); String rid0 = str(get(b, "id"), 20);
                return T(a, () -> { String tid = tid(a); ObjectNode d = q1("select d.status, w.kind from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.id = $2", tid, rid0); if (d == null) throw E("not_found");
                    if (!List.of("goods", "shop").contains(S(d.get("kind")))) throw E("kind"); JsonNode r = ok(one("select mil_redeem_fulfil($1,$2,$3::jsonb) r", tid, rid0, F.objectNode().put("handedAt", isoNow()).put("handedBy", email(a))));
                    audit(tid, email(a), "mileage.redeem.handed", map("id", rid0)); return r; }); }
            case "GET flags": { Map<String, Object> a = auth.need(req); return T(a, () -> { ArrayNode L = F.arrayNode(); for (ObjectNode f : q("select * from mil_flag where tenant_id = $1 order by (status = 'open') desc, at desc limit 300", tid(a))) L.add(cp(f, "id", "id", "sid", "sid", "kind", "kind", "evidence", "evidence", "status", "status", "resolvedBy", "resolved_by", "at", "at"));
                ObjectNode o = F.objectNode().put("ok", true); o.set("flags", L); return o; }); }
            case "POST flags/resolve": return flagResolve(auth.needStaff(req), DdWeb.readBody(body, 2048));
            case "GET proofs": { Map<String, Object> a = auth.need(req); return T(a, () -> { ArrayNode L = F.arrayNode(); for (ObjectNode p : q("select * from mil_proof where tenant_id = $1 order by at desc limit 300", tid(a)))
                    L.add(cp(p, "id", "id", "sid", "sid", "ruleId", "rule_id", "item", "item", "activityOn", "activity_on", "fileRef", "file_ref", "ai", "ai", "status", "status", "points", "points", "reason", "reason", "at", "at"));
                ObjectNode o = F.objectNode().put("ok", true); o.set("proofs", L); return o; }); }
            case "POST proofs/decide": { Map<String, Object> a = auth.needStaff(req); JsonNode b = DdWeb.readBody(body, 2048); return T(a, () -> proofDecide(a, str(get(b, "id"), 20), b)); }
            case "POST sunset": return sunset(auth.needOwner(req), DdWeb.readBody(body, 2048));
            case "POST import-q": { Map<String, Object> a = auth.needOwner(req); JsonNode b = DdWeb.readBody(body, 1024);
                return T(a, () -> { boolean dry = !strictEq(get(b, "dryRun"), F.booleanNode(false)); JsonNode r = ok(one("select mil_import_q($1,$2,$3) r", tid(a), dry, strictEq(get(b, "expiredMode"), "keep") ? "keep" : "expire")); if (!dry) audit(tid(a), email(a), "mileage.import_q", r); return r; }); }
            case "GET log": { Map<String, Object> a = auth.need(req); String area = qp(req, "area"); return T(a, () -> { ArrayNode L = F.arrayNode();
                for (ObjectNode r : q("select id, ver, area, before, after, reason, by_staff \"by\", at from mil_policy_log where tenant_id = $1 and ($2::text is null or area = $2) order by id desc limit 200", tid(a), area == null || area.isEmpty() ? null : area))
                    L.add(cp(r, "id", "id", "ver", "ver", "area", "area", "before", "before", "after", "after", "reason", "reason", "by", "by", "at", "at"));
                ObjectNode o = F.objectNode().put("ok", true); o.set("log", L); return o; }); }
            case "GET shop/payouts": { Map<String, Object> a = auth.needStaff(req); String ym = ymOf(qp(req, "ym")); return T(a, () -> payouts(tid(a), ym)); }
            case "POST shop/payouts/send": return payoutSend(auth.needOwner(req), DdWeb.readBody(body, 2048));
            default: throw E("not_found", null, 404);
        }
    }
    static String ymOf(String s) { return s != null && s.matches("^\\d{4}-\\d\\d$") ? s : kstToday().substring(0, 7); }

    Object enable(Map<String, Object> a, JsonNode b) throws Exception { String tid = tid(a); JsonNode d = truthy(get(b, "draft")) ? get(b, "draft") : F.objectNode();
        if (!truthy(get(b, "draft"))) return T(a, () -> { ObjectNode p = ensurePol(tid); if (!truthy(p.get("draft_hash")) || !S(p.get("draft_hash")).equals(str(get(b, "draftHash"), 64))) throw E("need_draft");
            x("update mil_policy set is_on = true, updated_by = $2, updated_at = now() where tenant_id = $1", tid, email(a)); log(tid, "onoff", o("on", p.get("is_on")), o("on", true, "draftHash", p.get("draft_hash")), "켜기 마법사", email(a), p.get("ver").asInt());
            audit(tid, email(a), "mileage.enable", map()); ObjectNode o = F.objectNode().put("ok", true).put("on", true); o.set("policy", polOut(pol(tid))); return o; });
        String h = S(get(b, "draftHash")); ObjectNode dd = F.objectNode(); dd.set("policy", get(d, "policy")); dd.set("rules", get(d, "rules")); dd.set("rewards", truthy(get(d, "rewards")) ? get(d, "rewards") : F.arrayNode());
        if (!obj(get(d, "policy")) || get(d, "rules") == null || !get(d, "rules").isArray() || !sha(stringify(dd)).equals(h) && !sha(stringify(d)).equals(h)) throw E("amount_mismatch", map("field", "draftHash"), 400);
        return T(a, () -> { ensurePol(tid); ObjectNode P = F.objectNode(); for (String[] c : PCOL) if (get(d, "policy").has(c[0]) && !"shop".equals(c[0])) P.set(c[0], get(d, "policy").get(c[0]));
            savePolicy(a, P, "켜기 마법사");
            for (JsonNode r : slice(arr(get(d, "rules")), 0, 50)) insRule(a, cleanRule(r));
            for (JsonNode r : slice(arr(get(d, "rewards")), 0, 30)) saveReward(a, r);
            String tpl = str(get(get(d, "policy"), "template"), 20);
            x("update mil_policy set is_on = true, draft_hash = $2, template = $3, recommended = $4::jsonb, updated_by = $5, updated_at = now() where tenant_id = $1", tid, h, tpl.isEmpty() ? null : tpl, d, email(a));
            log(tid, "onoff", o("on", false), o("on", true, "draftHash", h), "켜기 마법사", email(a), null); audit(tid, email(a), "mileage.enable", map("rules", get(d, "rules").size()));
            ObjectNode o = F.objectNode().put("ok", true).put("on", true); o.set("policy", polOut(pol(tid))); return o; }); }

    Object summary(Map<String, Object> a, HttpServletRequest req) throws Exception { String tdy = kstToday(); String from = day(qp(req, "from")) ? qp(req, "from") : tdy.substring(0, 8) + "01"; String to = day(qp(req, "to")) ? qp(req, "to") : tdy;
        return T(a, () -> { String tid = tid(a); Map<String, Long> by = new HashMap<>(); for (ObjectNode k : q("select kind, coalesce(sum(points), 0)::int p, count(*)::int n from mil_entry where tenant_id = $1 and status = 'posted' and mil_kst(at) between $2::date and $3::date group by kind", tid, from, to)) by.put(S(k.get("kind")), k.get("p").asLong());
            ObjectNode w = q1("select coalesce(sum(balance), 0)::int bal, coalesce(sum(convertible), 0)::int conv, count(*)::int n, count(*) filter (where balance > 0)::int act from mil_wallet where tenant_id = $1", tid);
            List<ObjectNode> byRule = q("select rule_id, trigger, sum(points)::int p, count(*)::int n from mil_entry where tenant_id = $1 and kind = 'earn' and status = 'posted' and mil_kst(at) between $2::date and $3::date group by rule_id, trigger order by p desc", tid, from, to);
            ObjectNode p = pol(tid); JsonNode mp = p != null && truthy(p.get("budget")) ? get(p.get("budget"), "monthP") : null;
            int used = n("select coalesce(sum(points), 0)::int r from mil_entry where tenant_id = $1 and kind = 'earn' and convertible and status <> 'void' and mil_kst(at) >= date_trunc('month', mil_kst(now()))::date", tid);
            ObjectNode o = F.objectNode().put("ok", true).put("from", from).put("to", to).put("earned", by.getOrDefault("earn", 0L)).put("used", -by.getOrDefault("use", 0L)).put("expired", -by.getOrDefault("expire", 0L)).put("cancelled", -by.getOrDefault("cancel", 0L))
                .put("restored", by.getOrDefault("restore", 0L)).put("adjusted", by.getOrDefault("adjust", 0L)).put("outstanding", w.get("bal").asLong()).put("outstandingConvertible", w.get("conv").asLong()).put("wonEstimate", w.get("conv").asLong()).put("wallets", w.get("n").asLong());
            long wn = w.get("n").asLong(); o.set("participation", numNode(wn > 0 ? round(w.get("act").asLong() * 100.0 / wn) : 0));
            ArrayNode br = F.arrayNode(); for (ObjectNode x0 : byRule) br.add(cp(x0, "ruleId", "rule_id", "trigger", "trigger", "points", "p", "n", "n")); o.set("byRule", br);
            if (truthy(mp)) { double mpv = num(mp); o.set("budget", F.objectNode().set("monthP", numNode(mpv))); ((ObjectNode) o.get("budget")).put("used", used).set("pct", numNode(round(used * 100.0 / mpv))); } else o.putNull("budget");
            o.set("pending", F.objectNode().put("earn", n("select count(*)::int r from mil_entry where tenant_id = $1 and status = 'pending'", tid)).put("redeem", n("select count(*)::int r from mil_redeem where tenant_id = $1 and status = 'requested'", tid)).put("proof", n("select count(*)::int r from mil_proof where tenant_id = $1 and status = 'submitted'", tid)));
            o.put("flags", n("select count(*)::int r from mil_flag where tenant_id = $1 and status = 'open'", tid)); return o; }); }

    Object events(Map<String, Object> a, JsonNode b) throws Exception { JsonNode L = get(b, "events"); if (L == null || !L.isArray() || L.size() == 0 || L.size() > 200) throw E("bad_rule", map("field", "events"), 400);
        return T(a, () -> { String tid = tid(a); ArrayNode out = F.arrayNode(); int done = 0;
            for (JsonNode x0 : L) { String trig = str(get(x0, "trigger"), 20); String sid = nullish(get(x0, "sid")) || !truthy(get(x0, "sid")) ? "" : egovframework.didisam.cmm.Js.str(get(x0, "sid"));
                if (!TRIG.contains(trig) || "manual".equals(trig) || !SID_OK.matcher(sid).matches() || !truthy(get(x0, "srcType")) || nullish(get(x0, "srcId"))) { out.addObject().put("status", "skipped").put("reason", "bad_event"); continue; }
                String at0 = truthy(get(x0, "at")) ? egovframework.didisam.cmm.Js.str(get(x0, "at")) : null; double atm = dateMs(at0); String at = at0 != null && !Double.isNaN(atm) && atm <= System.currentTimeMillis() ? iso(atm) : null;
                JsonNode r = one("select mil_emit($1,$2,$3,$4,$5,$6::numeric,'B',coalesce($7::timestamptz, now()),$8,coalesce($9,'lu_root')) r", tid, sid, trig, str(get(x0, "srcType"), 20), str(get(x0, "srcId"), 120), nullish(get(x0, "value")) ? null : numStr(num(get(x0, "value"))), at,
                    truthy(get(x0, "cls")) ? str(get(x0, "cls"), 60) : null, truthy(get(x0, "unit")) ? str(get(x0, "unit"), 30) : null);
                ObjectNode e = out.addObject(); e.set("status", r.get("status")); JsonNode en = r.path("entries"); e.set("entryId", en.isArray() && en.size() > 0 && !nullish(en.get(0).get("id")) ? en.get(0).get("id") : F.nullNode());
                long pts = 0; if (en.isArray()) for (JsonNode z : en) pts += z.path("points").asLong(); e.put("points", pts); e.set("reason", truthy(r.get("reason")) ? r.get("reason") : F.nullNode()); if (strictEq(r.get("status"), "done")) done++; }
            audit(tid, email(a), "mileage.events", map("n", L.size(), "done", done)); ObjectNode o = F.objectNode().put("ok", true); o.set("results", out); return o; }); }

    Object grant(Map<String, Object> a, JsonNode b) throws Exception { String tid = tid(a); LinkedHashSet<String> s0 = new LinkedHashSet<>();
        JsonNode sl = get(b, "sids"); List<JsonNode> src = sl != null && sl.isArray() ? arr(sl) : Collections.singletonList(get(b, "sid"));
        for (JsonNode x0 : src) { String s = nullish(x0) || !truthy(x0) && !(x0 != null && x0.isNumber()) ? "" : egovframework.didisam.cmm.Js.str(x0); if (SID_OK.matcher(s).matches()) s0.add(s); }
        List<String> sids = slice(new ArrayList<>(s0), 0, 200); String idem = str(get(b, "idem"), 60); if (sids.isEmpty() || idem.isEmpty()) throw E("bad_rule", map("field", "sids|idem"), 400); rl.limit("milg:" + tid + ":" + email(a), 30, 60_000L);
        Set<String> self = selfSids(tid, email(a)); String hit = null; for (String s : sids) if (self.contains(s)) { hit = s; break; }
        if (hit != null) { String h0 = hit; tx.inTenant(tid, () -> x("insert into mil_flag (tenant_id, id, sid, kind, evidence) values ($1,$2,$3,'self_grant',$4::jsonb)", tid, rid("mfl_"), h0, F.objectNode().put("staff", sha(email(a)).substring(0, 16)))); throw E("self_grant"); }
        boolean pen = strictEq(get(b, "penalty"), F.booleanNode(true));
        return T(a, () -> { ArrayNode out = F.arrayNode(); for (String sid : sids) { ObjectNode r = F.objectNode().put("sid", sid);
                r.setAll((ObjectNode) ok(one("select mil_grant($1,$2,$3,false,$4,$5,$6::int,$7,$8,now(),$9) r", tid, email(a), "owner".equals(a.get("role")), sid, truthy(get(b, "unit")) ? str(get(b, "unit"), 30) : "lu_root", I(get(b, "points")), str(get(b, "reason"), 200), idem + ":" + sid, pen))); out.add(r); }
            Object pts = I(get(b, "points")); audit(tid, email(a), pen ? "mileage.penalty" : "mileage.grant", map("n", sids.size(), "points", pts instanceof Double ? null : pts, "reason", str(get(b, "reason"), 200))); ObjectNode o = F.objectNode().put("ok", true); o.set("results", out); return o; }); }

    Object approvals(Map<String, Object> a, HttpServletRequest req) throws Exception { String type = truthy(qp(req, "type")) ? qp(req, "type") : "redeem";
        return T(a, () -> { String tid = tid(a);
            if ("earn".equals(type)) { List<ObjectNode> rows = q("select * from mil_entry where tenant_id = $1 and status = 'pending' order by at limit 200", tid); Set<String> fl = new HashSet<>(); for (ObjectNode f : q("select sid from mil_flag where tenant_id = $1 and status = 'open'", tid)) fl.add(S(f.get("sid")));
                ArrayNode items = F.arrayNode(); for (ObjectNode e : rows) { ObjectNode x0 = enOut(e); ArrayNode ck = F.arrayNode(); if (fl.contains(S(e.get("sid")))) ck.addObject().put("code", "flag_open").put("block", false).put("text", "부정 의심 기록이 열려 있는 학습자입니다.").putNull("fixPoints"); x0.set("checks", ck); items.add(x0); }
                ObjectNode o = F.objectNode().put("ok", true).put("type", type); o.set("items", items); return o; }
            if ("proof".equals(type)) { ArrayNode items = F.arrayNode(); for (ObjectNode p : q("select * from mil_proof where tenant_id = $1 and status = 'submitted' order by at limit 200", tid)) items.add(cp(p, "id", "id", "sid", "sid", "ruleId", "rule_id", "item", "item", "activityOn", "activity_on", "fileRef", "file_ref", "ai", "ai", "at", "at"));
                ObjectNode o = F.objectNode().put("ok", true).put("type", type); o.set("items", items); return o; }
            ArrayNode items = F.arrayNode();
            for (ObjectNode d : q("select d.*, row_to_json(w) rw from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.status = 'requested' order by d.at limit 200", tid)) { JsonNode rw = d.get("rw");
                ObjectNode bill = strictEq(rw.get("kind"), "tuition") ? billFor(tid, S(d.get("sid")), null) : null; ObjectNode x0 = rdOut(d); x0.set("reward", rwOut(rw));
                if (bill != null) { ObjectNode bo = bill.deepCopy(); bo.remove("sum"); x0.set("bill", bo); } else x0.putNull("bill"); x0.set("checks", checksOf(d, rw, bill)); items.add(x0); }
            ObjectNode o = F.objectNode().put("ok", true).put("type", "redeem"); o.set("items", items); return o; }); }

    Object redeemCancel(Map<String, Object> a, JsonNode b) throws Exception { String id = str(get(b, "id"), 20); String why = trim(str(get(b, "reason"), 200)); if (why.isEmpty()) throw E("reason");
        return T(a, () -> { String tid = tid(a); ObjectNode d = q1("select d.*, w.kind from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.id = $2 for update of d", tid, id); if (d == null) throw E("not_found");
            JsonNode r; JsonNode f = d.get("fulfil");
            if (strictEq(d.get("status"), "requested")) r = ok(one("select mil_redeem_decide($1,$2,'cancel',$3,$4) r", tid, id, email(a), why));
            else { if (truthy(f) && truthy(get(f, "chargeId"))) { if (!q("select 1 from led_alloc a join led_charge x on x.tenant_id = a.tenant_id and x.id = a.charge_id where a.tenant_id = $1 and x.bill_id = $2", tid, S(get(f, "billId"))).isEmpty()) throw E("bill_paid");
                    x("update led_charge set status = 'void' where tenant_id = $1 and id = $2 and src_type = 'mileage'", tid, S(get(f, "chargeId"))); }
                if (truthy(f) && truthy(get(f, "couponCode")) && n("select count(*)::int r from learner_events where tenant_id = $1 and type = 'pay' and upper(data->>'cpn') = $2", tid, S(get(f, "couponCode"))) > 0) throw E("state", map("used", true), 0);
                r = ok(one("select mil_redeem_reclaim($1,$2,$3,$4) r", tid, id, why, email(a))); }
            audit(tid, email(a), "mileage.redeem.cancel", map("id", id, "from", S(d.get("status")), "reason", why)); return r; }); }

    Object flagResolve(Map<String, Object> a, JsonNode b) throws Exception { String why = trim(str(get(b, "reason"), 200)); if (why.isEmpty()) throw E("reason"); String dec = S(get(b, "decision")); if (!List.of("clear", "confirm").contains(dec)) throw E("bad_rule", map("field", "decision"), 400);
        return T(a, () -> { String tid = tid(a); ObjectNode f = q1("select * from mil_flag where tenant_id = $1 and id = $2 and status = 'open' for update", tid, str(get(b, "id"), 20)); if (f == null) throw E("state");
            List<String> held = new ArrayList<>(); String arrLit = f.get("held_entries").isArray() ? toPgArray(f.get("held_entries")) : null;
            for (ObjectNode r : q("select id from mil_entry where tenant_id = $1 and sid = $2 and status = 'pending' and (event_id = ($3::jsonb->>'event')::bigint or id = any($4::text[]))", tid, S(f.get("sid")), f.get("evidence"), arrLit)) held.add(S(r.get("id")));
            for (String id : held) ok(one("select " + ("clear".equals(dec) ? "mil_post" : "mil_void") + "($1,$2) r", tid, id));
            String st = "clear".equals(dec) ? "cleared" : "confirmed"; x("update mil_flag set status = $3, resolved_by = $4, evidence = evidence || $5::jsonb where tenant_id = $1 and id = $2", tid, S(f.get("id")), st, email(a), F.objectNode().put("reason", why));
            audit(tid, email(a), "mileage.flag." + dec, map("id", S(f.get("id")), "entries", held.size(), "reason", why)); return o("ok", true, "id", S(f.get("id")), "status", st, "entries", held.size()); }); }
    static String toPgArray(JsonNode a) { StringBuilder s = new StringBuilder("{"); for (int i = 0; i < a.size(); i++) { if (i > 0) s.append(','); s.append('"').append(a.get(i).asText().replace("\\", "\\\\").replace("\"", "\\\"")).append('"'); } return s.append('}').toString(); }

    Object sunset(Map<String, Object> a, JsonNode b) throws Exception { String[] k = { "noticeAt", "stopEarnAt", "endAt" }; String[] v = new String[3];
        for (int i = 0; i < 3; i++) { JsonNode x0 = get(b, k[i]); double ms = truthy(x0) ? dateMs(egovframework.didisam.cmm.Js.str(x0)) : Double.NaN; v[i] = Double.isNaN(ms) ? null : iso(ms); }
        String md = S(get(b, "mode")); ObjectNode s = F.objectNode().put("noticeAt", v[0]).put("stopEarnAt", v[1]).put("endAt", v[2]).put("mode", List.of("expire", "convert", "migrate").contains(md) ? md : "expire");
        if (v[0] == null || v[1] == null || v[2] == null || !(v[0].compareTo(v[1]) <= 0 && v[1].compareTo(v[2]) <= 0)) throw E("bad_rule", map("field", "dates"), 400);
        ArrayNode warn = F.arrayNode(); if (dateMs(v[2]) - dateMs(v[0]) < 180 * 864e5) warn.addObject().put("code", "sunset_short").put("msg", "종료 예고 기간이 6개월보다 짧습니다(권장 6개월).");
        return T(a, () -> { String tid = tid(a); ObjectNode p = ensurePol(tid); x("update mil_policy set sunset = $2::jsonb, ver = ver + 1, updated_by = $3, updated_at = now() where tenant_id = $1", tid, s, email(a));
            log(tid, "sunset", p.get("sunset"), s, str(get(b, "reason"), 200), email(a), p.get("ver").asInt() + 1); ObjectNode o = F.objectNode().put("ok", true); o.set("sunset", s); o.set("warnings", warn); return o; }); }

    ObjectNode payouts(String tid, String ym) { ArrayNode rows = F.arrayNode();
        for (ObjectNode r : q("select d.id, d.sid, d.points, d.won, d.at, d.fulfil, w.title, w.link, coalesce(l.dept, '') dept from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id"
                + " left join learners l on l.tenant_id = d.tenant_id and l.sid = d.sid where d.tenant_id = $1 and w.kind = 'shop' and d.status in ('approved','fulfilled') and to_char(mil_kst(d.at), 'YYYY-MM') = $2 order by d.at", tid, ym)) {
            JsonNode ln = r.get("link"); ObjectNode o = cp(r, "id", "id", "sid", "sid", "dept", "dept", "item", "title"); o.put("qty", 1).put("at", DdMileCalc.kst(S(r.get("at")))); o.set("priceWon", truthy(ln) && !nullish(ln.get("priceWon")) ? ln.get("priceWon") : r.get("won")); rows.add(o); }
        ArrayNode sent = F.arrayNode(); for (ObjectNode r : q("select after, by_staff, at from mil_policy_log where tenant_id = $1 and area = 'reward' and after->>'payoutYm' = $2 order by id", tid, ym)) { JsonNode af = r.get("after");
            ObjectNode s = F.objectNode(); s.set("to", g(af, "to")); s.set("rows", g(af, "rows")); s.set("sent", g(af, "sent")); s.set("by", r.get("by_staff")); s.set("at", r.get("at")); sent.add(s); }
        ObjectNode o = F.objectNode().put("ok", true).put("ym", ym); o.set("rows", rows); o.set("sent", sent); return o; }
    Object payoutSend(Map<String, Object> a, JsonNode b) throws Exception { String ym = ymOf(nullish(get(b, "ym")) ? null : egovframework.didisam.cmm.Js.str(get(b, "ym"))); String to = trim(str(get(b, "to"), 120));
        if (!to.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw E("bad_rule", map("field", "to"), 400); rl.limit("milpay:" + tid(a), 5, 3_600_000L);
        ObjectNode P = T(a, () -> payouts(tid(a), ym)); StringBuilder csv = new StringBuilder("내부ID,소속,품목,수량,지급일,시가(원)");
        for (JsonNode r : P.get("rows")) { csv.append("\r\n"); String[] f = { "sid", "dept", "item", "qty", "at", "priceWon" }; for (int i = 0; i < f.length; i++) { if (i > 0) csv.append(','); JsonNode v = r.get(f[i]); csv.append('"').append((nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v)).replace("\"", "\"\"")).append('"'); } }
        boolean sent = false; /* Java 에디션은 메일 발송기(SMTP)가 없다 — Node도 메일 설정이 없으면 sent:false + csv를 돌려준다 */
        int nrows = P.get("rows").size(); T(a, () -> { log(tid(a), "reward", null, o("payoutYm", ym, "to", to.replaceAll("^(.).*(@.*)$", "$1***$2"), "rows", nrows, "sent", false), null, email(a), null); return null; });
        ObjectNode o = F.objectNode().put("ok", true).put("ym", ym).put("rows", nrows).put("sent", sent); o.put("csv", csv.toString()); return o; }

    // ── 학습자 /api/pub/{tid}/mile-* ────────────────────────
    static final Map<String, String> TRIG_KO = Map.ofEntries(Map.entry("signup", "가입"), Map.entry("first_login", "첫 로그인"), Map.entry("attend_day", "하루 학습"), Map.entry("streak", "연속 학습"), Map.entry("lesson_done", "차시 완료"), Map.entry("course_done", "과정 이수"),
        Map.entry("exam_score", "시험 통과"), Map.entry("assign_submit", "과제 제출"), Map.entry("survey_done", "설문 응답"), Map.entry("noncredit_done", "비교과 이수"), Map.entry("review_ok", "후기 작성"), Map.entry("referral_ok", "친구 추천"),
        Map.entry("tube_goal", "오늘 목표 달성"), Map.entry("evidence", "실적 증빙"), Map.entry("manual", "선생님 지급"), Map.entry("penalty", "감점"));
    static final Map<String, String> KIND_KO = Map.of("earn", "적립", "use", "사용", "hold", "사용 대기", "release", "대기 해제", "expire", "소멸", "cancel", "취소", "adjust", "조정", "restore", "복원", "penalty", "감점");
    <T> T P(String tid, TenantTx.Work<T> fn) throws Exception { return tx.inTenant(tid, () -> { if (!modOn(tid) || !policyOn(tid)) throw E("mile_off", null, 404); return fn.run(); }); }
    static String who(LAuth lauth) throws Exception { Map<String, Object> s = lauth.get(); if (s == null) throw E("auth", null, 401); return (String) s.get("sid"); }
    List<ObjectNode> wallet(String tid, String sid) { List<ObjectNode> units = q("select scope_unit, streak from mil_wallet where tenant_id = $1 and sid = $2 order by scope_unit", tid, sid); if (units.isEmpty()) { ObjectNode u = F.objectNode().put("scope_unit", "lu_root"); u.set("streak", F.objectNode()); units.add(u); }
        List<ObjectNode> out = new ArrayList<>(); for (ObjectNode u : units) { ObjectNode w = F.objectNode().put("unit", S(u.get("scope_unit"))); w.set("streak", u.get("streak")); w.setAll((ObjectNode) one("select mil_sync($1,$2,$3) r", tid, sid, S(u.get("scope_unit")))); out.add(w); } return out; }
    static JsonNode pts(JsonNode sc) { String md = S(get(sc, "mode")); if ("band".equals(md)) { double mx = Double.NEGATIVE_INFINITY; List<JsonNode> bs = arr(get(sc, "bands")); if (bs.isEmpty()) mx = 0; for (JsonNode b : bs) mx = Math.max(mx, num(b.get(1))); return numNode(mx); }
        if ("source".equals(md)) return F.nullNode(); double v = num(get(sc, "v")); return numNode(Double.isNaN(v) || v == 0 ? 0 : v); }

    @Override public Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception {
        switch (key) {
            case "GET mile-my": { String sid = who(lauth); return P(tid, () -> { ObjectNode p = pol(tid); List<ObjectNode> W = wallet(tid, sid); ObjectNode w = W.get(0);
                List<ObjectNode> rules = new ArrayList<>(); for (ObjectNode r : q("select distinct on (id) * from mil_rule where tenant_id = $1 order by id, ver desc", tid)) if (r.get("active").asBoolean() && !strictEq(r.get("trigger"), "penalty")) rules.add(r);
                List<ObjectNode> rewards = q("select * from mil_reward where tenant_id = $1 and active order by threshold, min_use", tid); long bal = w.get("balance").asLong(), conv = w.get("convertible").asLong();
                ObjectNode goal = null; long gneed = 0; for (ObjectNode r : rewards) { JsonNode c = r.get("cost"); long need = Math.max(Math.max(r.get("threshold").asLong(), r.get("min_use").asLong()), truthy(c) && truthy(c.get("fixedP")) ? (long) num(c.get("fixedP")) : 0);
                    if (need > (r.get("cash").asBoolean() ? conv : bal) && (goal == null || need < gneed)) { goal = r; gneed = need; } }
                List<ObjectNode> notices = q("select kind, ym, points, due_at, sent_at from mil_notice where tenant_id = $1 and sid = $2 and read_at is null order by sent_at desc limit 10", tid, sid);
                int funded = n("select coalesce(sum(points), 0)::int r from mil_entry where tenant_id = $1 and sid = $2 and funded and status = 'posted'", tid, sid);
                ObjectNode o = F.objectNode().put("ok", true).put("on", true); o.set("unitName", p.get("unit_name")); o.set("balance", w.get("balance")); o.set("pending", w.get("pending")); o.set("convertible", w.get("convertible")); o.put("fundedEarned", funded); o.putNull("tier");
                if (goal != null) { long have = goal.get("cash").asBoolean() ? conv : bal; o.set("nextGoal", F.objectNode().put("label", S(goal.get("title"))).put("need", gneed - have).set("pct", numNode(Math.floor(Math.max(0, have) * 100.0 / gneed)))); } else o.putNull("nextGoal");
                JsonNode sk = w.get("streak"); JsonNode ps = p.get("streak"); ObjectNode so = F.objectNode(); so.set("n", truthy(sk) && truthy(sk.get("n")) ? sk.get("n") : F.numberNode(0)); so.set("last", truthy(sk) && truthy(sk.get("last")) ? sk.get("last") : F.nullNode());
                so.set("freezePerWeek", truthy(ps) && truthy(ps.get("freezePerWeek")) ? ps.get("freezePerWeek") : F.numberNode(1)); o.set("streak", so); o.set("expiring", g(w, "nextExpire"));
                ArrayNode ways = F.arrayNode(); for (ObjectNode r : rules) { ObjectNode y = ways.addObject().put("trigger", S(r.get("trigger"))); String lb = S(r.get("label")); y.put("text", !lb.isEmpty() ? lb : TRIG_KO.getOrDefault(S(r.get("trigger")), S(r.get("trigger")))); y.set("points", pts(r.get("score"))); y.set("nature", r.get("nature")); } o.set("ways", ways);
                if (W.size() > 1) { ArrayNode ws = F.arrayNode(); for (ObjectNode x0 : W) ws.add(cp(x0, "unit", "unit", "balance", "balance", "convertible", "convertible")); o.set("wallets", ws); }
                o.set("sunset", truthy(p.get("sunset")) ? p.get("sunset") : F.nullNode());
                ArrayNode ns = F.arrayNode(); for (ObjectNode nn : notices) ns.add(cp(nn, "kind", "kind", "ym", "ym", "points", "points", "dueAt", "due_at", "at", "sent_at")); o.set("notices", ns); return o; }); }
            case "GET mile-list": { String sid = who(lauth); double lm = Id(req.getParameter("limit") == null ? null : t(req.getParameter("limit"))); int lim = (int) Math.min(Math.max(Double.isNaN(lm) || lm == 0 ? 30 : lm, 1), 100);
                return P(tid, () -> { List<Object> v = new ArrayList<>(List.of(tid, sid)); String w = ""; String[] af = (req.getParameter("after") == null ? "" : req.getParameter("after")).split("\\|", -1);
                    if (!af[0].isEmpty() && !Double.isNaN(dateMs(af[0]))) { v.add(af[0]); v.add(str(af.length > 1 ? af[1] : "undefined", 20)); w = " and (at, id) < ($3::timestamptz, $4)"; }
                    List<ObjectNode> rows = q("select * from mil_entry where tenant_id = $1 and sid = $2 and status <> 'void'" + w + " order by at desc, id desc limit " + (lim + 1), v.toArray()); boolean more = rows.size() > lim; List<ObjectNode> L = slice(rows, 0, lim);
                    Set<String> cancelled = new HashSet<>(); for (ObjectNode r : q("select ref_entry from mil_entry where tenant_id = $1 and sid = $2 and kind = 'cancel'", tid, sid)) cancelled.add(S(r.get("ref_entry")));
                    ArrayNode items = F.arrayNode(); for (ObjectNode e : L) { String d = DdMileCalc.kst(S(e.get("at"))), kind = S(e.get("kind")), rs = S(e.get("reason"));
                        ObjectNode y = items.addObject().put("id", S(e.get("id"))).put("ym", d.substring(0, 7)).put("day", d).put("kind", kind); if (KIND_KO.containsKey(kind)) y.put("kindText", KIND_KO.get(kind)); y.set("points", e.get("points")); y.set("status", e.get("status"));
                        String tx0 = !rs.isEmpty() ? rs : TRIG_KO.containsKey(S(e.get("trigger"))) ? TRIG_KO.get(S(e.get("trigger"))) : KIND_KO.get(kind); if (tx0 != null) y.put("text", tx0);
                        y.set("trigger", e.get("trigger")); y.set("funded", e.get("funded")); y.set("convertible", e.get("convertible")); y.set("expiresAt", e.get("expires_at")); y.put("cancelled", cancelled.contains(S(e.get("id")))); }
                    ObjectNode o = F.objectNode().put("ok", true); o.set("items", items); if (more) o.put("after", S(L.get(L.size() - 1).get("at")) + "|" + S(L.get(L.size() - 1).get("id"))); else o.putNull("after"); return o; }); }
            case "GET mile-rewards": { String sid = who(lauth); return P(tid, () -> { Map<String, ObjectNode> byU = new HashMap<>(); for (ObjectNode w : wallet(tid, sid)) byU.put(S(w.get("unit")), w); ArrayNode out = F.arrayNode();
                for (ObjectNode r : q("select * from mil_reward where tenant_id = $1 and active order by kind, threshold, id", tid)) { JsonNode ln = r.get("link"); String u = truthy(ln) && truthy(ln.get("unitId")) ? S(ln.get("unitId")) : "lu_root";
                    ObjectNode w = byU.get(u); long wb = w == null ? 0 : w.get("balance").asLong(), wc = w == null ? 0 : w.get("convertible").asLong(); boolean cash = r.get("cash").asBoolean(); long usable = Math.max(0, cash ? wc : wb);
                    long used = r.get("stock").isNull() ? 0 : n("select count(*)::int r from mil_redeem where tenant_id = $1 and reward_id = $2 and status in ('requested','approved','fulfilled')", tid, S(r.get("id")));
                    long th = r.get("threshold").asLong(), mu = r.get("min_use").asLong(); String lock = wb < 0 ? "negative_balance" : cash && wc < th ? "below_threshold" : !r.get("stock").isNull() && used >= r.get("stock").asLong() ? "out_of_stock" : usable < Math.max(mu, 1) ? "insufficient" : null;
                    ObjectNode y = cp(r, "id", "id", "kind", "kind", "title", "title", "cost", "cost", "minUse", "min_use", "maxUse", "max_use", "step", "step", "threshold", "threshold", "cash", "cash"); y.set("stockLeft", r.get("stock").isNull() ? F.nullNode() : F.numberNode(Math.max(0, r.get("stock").asLong() - used)));
                    y.put("usable", usable); if (lock == null) y.putNull("locked"); else y.put("locked", lock); y.set("priceWon", truthy(ln) && truthy(ln.get("priceWon")) ? ln.get("priceWon") : F.nullNode()); out.add(y); }
                ObjectNode o = F.objectNode().put("ok", true); o.set("rewards", out); return o; }); }
            case "POST mile-redeem": { String sid = who(lauth); JsonNode b = DdWeb.readBody(body, 1024); rl.limit("mrd:" + tid + ":" + sid, 10, 60_000L); rl.limit("mrdt:" + tid, 60, 60_000L);
                String idem = str(get(b, "idem"), 60); if (!idem.matches("^[A-Za-z0-9_-]{6,60}$")) throw E("bad_points");
                return P(tid, () -> { JsonNode r = ok(one("select mil_redeem_req($1,$2,$3,$4::int,$5) r", tid, sid, str(get(b, "rewardId"), 34), I(get(b, "points")), idem));
                    if (!nullish(get(b, "won")) && Id(get(b, "won")) != r.path("won").asDouble()) throw E("amount_mismatch", map("won", r.get("won")), 0);
                    audit(tid, "learner:" + sid, "mileage.redeem", map("id", r.get("id"), "points", r.get("points"), "status", r.get("status"))); return r; }); }
            case "POST mile-redeem-cancel": { String sid = who(lauth); JsonNode b = DdWeb.readBody(body, 512);
                return P(tid, () -> { String id = str(get(b, "id"), 20); ObjectNode d = q1("select sid, status from mil_redeem where tenant_id = $1 and id = $2", tid, id); if (d == null || !sid.equals(S(d.get("sid")))) throw E("not_found"); if (!strictEq(d.get("status"), "requested")) throw E("state");
                    return ok(one("select mil_redeem_decide($1,$2,'cancel',$3,'학습자 취소') r", tid, id, "learner:" + sid)); }); }
            case "POST mile-proof": { String sid = who(lauth); JsonNode b = DdWeb.readBody(body, 2048); rl.limit("mpf:" + tid + ":" + sid, 10, 3_600_000L);
                return P(tid, () -> { ObjectNode rule = q1("select id from mil_rule where tenant_id = $1 and id = $2 and trigger = 'evidence' and active", tid, str(get(b, "ruleId"), 34)); if (rule == null) throw E("not_found");
                    String id = rid("mpf_"); String ao = S(get(b, "activityOn")); String fr = str(get(b, "fileRef"), 200);
                    x("insert into mil_proof (tenant_id, id, sid, rule_id, item, activity_on, file_ref) values ($1,$2,$3,$4,$5,$6::date,$7)", tid, id, sid, S(rule.get("id")), str(get(b, "item"), 60), day(ao) ? ao : null, fr.isEmpty() ? null : fr);
                    return o("ok", true, "id", id, "status", "submitted"); }); }
            case "POST mile-notice-read": { String sid = who(lauth); return P(tid, () -> { x("update mil_notice set read_at = now() where tenant_id = $1 and sid = $2 and read_at is null", tid, sid); return o("ok", true); }); }
            default: throw E("not_found");
        }
    }

    // ── 수집 훅(Node index.js hook · emitDiff · personalCoupon) — 다른 서비스가 같은 트랜잭션 안에서 부른다 ──
    /** 제도가 켜진 기관만 mil_emit(세이브포인트: 실패해도 본 작업은 계속) */
    public JsonNode hook(String tid, String sid, String trigger, String srcType, String srcId, Object value, String trust, String cls, String at) {
        try { x("savepoint mil_hook");
            JsonNode r = one("select case when exists (select 1 from mil_policy where tenant_id = $1 and is_on) then mil_emit($1,$2,$3,$4,$5,$6::numeric,$7,coalesce($8::timestamptz, now()),$9,'lu_root') end r", tid, sid, trigger, srcType, srcId, value == null ? null : String.valueOf(value), trust == null ? "A" : trust, at, cls);
            x("release savepoint mil_hook"); return r;
        } catch (Exception e) { try { x("rollback to savepoint mil_hook"); } catch (Exception z) { /* 트랜잭션 밖 */ } logger.error("mileage hook " + trigger + " " + e.getMessage()); return null; }
    }
    /** PUT progress 차이분(신뢰 C): 새로 완료된 차시 · 튜브 오늘 목표 달성 · 학습한 날만 */
    static List<String[]> diffLp(JsonNode prev, JsonNode next) { List<String[]> out = new ArrayList<>(); JsonNode P = obj(prev) ? prev : F.objectNode(), N = obj(next) ? next : F.objectNode();
        for (Map.Entry<String, JsonNode> c : entries(get(N, "cls"))) { JsonNode items = truthy(c.getValue()) && truthy(get(c.getValue(), "items")) ? get(c.getValue(), "items") : F.objectNode(); JsonNode pc = get(P, "cls"); JsonNode pit = truthy(pc) && truthy(get(pc, c.getKey())) && truthy(get(get(pc, c.getKey()), "items")) ? get(get(pc, c.getKey()), "items") : F.objectNode();
            for (Map.Entry<String, JsonNode> it : entries(items)) if (truthy(it.getValue()) && truthy(get(it.getValue(), "done")) && !(truthy(get(pit, it.getKey())) && truthy(get(get(pit, it.getKey()), "done")))) out.add(new String[]{ "lesson_done", "item", c.getKey() + "/" + it.getKey(), null, c.getKey() }); }
        JsonNode nt = get(N, "tube"), pt = get(P, "tube"); JsonNode ts = truthy(nt) && truthy(get(nt, "sec")) ? get(nt, "sec") : F.objectNode(), ps = truthy(pt) && truthy(get(pt, "sec")) ? get(pt, "sec") : F.objectNode(); double goal = truthy(nt) && truthy(get(nt, "goal")) ? num(get(nt, "goal")) : 0;
        for (Map.Entry<String, JsonNode> e : entries(ts)) { if (!day(e.getKey())) continue; double sec = num(e.getValue()); double before = num(get(ps, e.getKey())); if (Double.isNaN(before)) before = 0;
            if (sec >= 60 && before < 60) out.add(new String[]{ "attend_day", "day", e.getKey(), numStr(Math.floor(sec / 60)), null });
            if (goal > 0 && sec >= goal * 60 && before < goal * 60) out.add(new String[]{ "tube_goal", "day", e.getKey(), numStr(Math.floor(sec / 60)), null }); }
        return out.size() > 50 ? out.subList(0, 50) : out; }
    public int emitDiff(String tid, String sid, JsonNode prev, JsonNode next) { if (!policyOn(tid)) return 0; int k = 0; for (String[] d : diffLp(prev, next)) { JsonNode r = hook(tid, sid, d[0], d[1], d[2], d[3], "C", d[4], null); if (r != null && strictEq(r.get("status"), "done")) k++; } return k; }
    /** 개인 쿠폰(1회용, 본인 sid만) — 기관 쿠폰에 없는 코드일 때 coupon 확인이 부른다. null = 해당 없음 */
    public ObjectNode personalCoupon(String tid, String sid, String code, String cls) {
        ObjectNode d = q1("select d.*, w.audience from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.fulfil->>'couponCode' = $2 and d.status = 'fulfilled'", tid, code);
        if (d == null || !S(d.get("sid")).equals(sid)) return null;
        if (cls != null && !cls.isEmpty() && !one("select mil_cash_ok($1,$2) r", tid, cls).asBoolean()) return F.objectNode().put("ok", false).put("msg", "국비 지원 과정에는 마일리지 쿠폰을 쓸 수 없어요.").put("code", "funded_blocked");
        if (n("select count(*)::int r from learner_events where tenant_id = $1 and type = 'pay' and upper(data->>'cpn') = $2", tid, code) > 0) return F.objectNode().put("ok", false).put("msg", "이미 사용한 쿠폰이에요.");
        JsonNode f = d.get("fulfil"); if (truthy(get(f, "until")) && kstToday().compareTo(S(get(f, "until"))) > 0) return F.objectNode().put("ok", false).put("msg", "사용 기한이 지난 쿠폰이에요.");
        long won = d.get("won").asLong(); return F.objectNode().put("ok", true).put("personal", true).put("off", won).put("label", "마일리지 쿠폰 " + String.format("%,d", won) + "원 할인"); }
    /** v41 원장 환불 확정 훅(같은 트랜잭션). ratio = 환불액 / 실납부액 */
    public JsonNode onRefund(String tid, String receiptId, double ratio) { if (pol(tid) == null) return null;
        return one("select mil_on_refund($1,$2,$3::numeric,now(),coalesce((select (grant_cfg->>'restoreRound')::int from mil_policy where tenant_id = $1), 10)) r", tid, receiptId, numStr(ratio)); }

    // ── 자동 정리(Node sweep.js, 1시간) ──────────────────────
    @Scheduled(fixedDelayString = "${MILEAGE_SWEEP_MS:3600000}", initialDelayString = "${MILEAGE_SWEEP_MS:3600000}")
    public void tick() { List<String> ids; try { ids = tx.plain(() -> { List<String> l = new ArrayList<>(); for (ObjectNode r : q("select id from tenants")) l.add(S(r.get("id"))); return l; }); } catch (Exception e) { return; }
        for (String tid : ids) { try { tx.inTenant(tid, () -> sweep(tid, null)); } catch (Exception e) { /* 다음 기관 계속 */ } } }
    public ObjectNode sweep(String tid, String at) {
        ObjectNode p = q1("select is_on from mil_policy where tenant_id = $1", tid); if (p == null) return F.objectNode().put("expired", 0).put("notices", 0).put("fixed", 0);
        String T = at != null ? at : isoNow(); int expired = n("select mil_expire($1,$2::timestamptz) r", tid, T); int notices = q("select sid, kind, ym, points from mil_notice_due($1,$2::timestamptz)", tid, T).size();
        List<ObjectNode> bad = new ArrayList<>(); for (ObjectNode r : q("select w.sid, w.scope_unit, w.balance, coalesce((select sum(points) from mil_entry e where e.tenant_id = w.tenant_id and e.sid = w.sid and e.scope_unit = w.scope_unit and e.status = 'posted'), 0)::int s from mil_wallet w where w.tenant_id = $1", tid)) if (r.get("balance").asLong() != r.get("s").asLong()) bad.add(r);
        for (ObjectNode r : bad) q("select mil_sync($1,$2,$3)", tid, S(r.get("sid")), S(r.get("scope_unit")));
        if (!bad.isEmpty()) { List<String> s = new ArrayList<>(); for (ObjectNode r : slice(bad, 0, 20)) s.add(S(r.get("sid"))); x("insert into audit_log (tenant_id, actor, action, detail) values ($1, 'system', 'mileage.wallet_mismatch', $2::jsonb)", tid, o("n", bad.size(), "sids", s)); }
        if (expired > 0 || notices > 0) x("insert into audit_log (tenant_id, actor, action, detail) values ($1, 'system', 'mileage.sweep', $2::jsonb)", tid, o("expired", expired, "notices", notices));
        return F.objectNode().put("expired", expired).put("notices", notices).put("fixed", bad.size()); }
}
