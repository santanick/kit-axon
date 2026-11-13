import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.sql.*;
import java.time.Instant;
import java.util.*;

/** v42 마일리지 기준값 — tests/mileage-vectors.json을 Java JDBC 경로로 SQL 함수(mil_*, Node와 공용)에 돌려 expect와 대조한다(tests/mileage-run.js runSql과 같은 절차).
 *  MileMapper.xml과 같은 형 변환(?::timestamptz · ?::jsonb · ?::numeric)을 쓴다. 끝에 MV-28(지갑 캐시 = 원장 합계)도 확인한다.
 *  실행: (빌드 후) cd service-egov && java -cp "target/classes:target/didisam-egov/WEB-INF/lib/*" test/MileVectors.java ../tests/mileage-vectors.json jdbc:postgresql://127.0.0.1:5544/m42j didisam */
public class MileVectors {
    static final ObjectMapper M = new ObjectMapper(); static int ok = 0; static final List<String> bad = new ArrayList<>(); static Connection C;
    static final java.util.regex.Pattern TS = java.util.regex.Pattern.compile("^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d.*");

    static void match(JsonNode exp, JsonNode act, String p) {
        if (exp == null || exp.isNull() || exp.isValueNode()) {
            if (exp != null && exp.isTextual() && TS.matcher(exp.asText()).matches() && act != null && act.isTextual() && TS.matcher(act.asText()).matches()) {
                if (!Instant.parse(iso(exp.asText())).equals(Instant.parse(iso(act.asText())))) bad.add(p + ": " + exp + " ≠ " + act); return; }
            JsonNode a = act == null ? M.nullNode() : act;
            boolean eq = exp.isNumber() && a.isNumber() ? exp.decimalValue().compareTo(a.decimalValue()) == 0 : exp.equals(a);
            if (!eq) bad.add(p + ": " + exp + " ≠ " + act); return; }
        if (exp.isArray()) { if (act == null || !act.isArray() || act.size() != exp.size()) { bad.add(p + ": " + exp + " ≠ " + act); return; } for (int i = 0; i < exp.size(); i++) match(exp.get(i), act.get(i), p + "[" + i + "]"); return; }
        if (act == null || !act.isObject()) { bad.add(p + ": 없음(" + act + ")"); return; }
        exp.fieldNames().forEachRemaining(k -> match(exp.get(k), act.get(k), p + "." + k));
    }
    /** Postgres timestamptz 텍스트(2026-11-02T01:00:00+00:00 등)도 Instant로 */
    static String iso(String s) { String t = s.replace(' ', 'T'); if (t.matches(".*[+-]\\d\\d$")) t += ":00"; return java.time.OffsetDateTime.parse(t).toInstant().toString(); }

    static String J(JsonNode x) { return x == null || x.isNull() || x.isMissingNode() ? null : x.toString(); }
    static ObjectNode merge(ObjectNode base, JsonNode over) { ObjectNode o = base.deepCopy(); if (over != null && over.isObject()) over.fields().forEachRemaining(e -> o.set(e.getKey(), e.getValue())); return o; }
    static ObjectNode ruleDef(JsonNode r) { return merge((ObjectNode) M.createObjectNode().put("ver", 1).put("once", "per_src").put("trustMin", "C").put("approval", "auto").put("nature", "achievement").put("active", true).<ObjectNode>set("cond", M.createObjectNode()).set("caps", M.createObjectNode()), r); }
    static ObjectNode rewDef(JsonNode r) { ObjectNode d = M.createObjectNode(); d.set("cost", M.createObjectNode().put("wonPerP", 1)); d.put("minUse", 0); d.set("maxUse", M.createObjectNode()); d.put("step", 1).put("threshold", 0); d.set("perSid", M.createObjectNode()); d.put("approval", "manual").put("cash", true); d.set("audience", M.createObjectNode()); d.set("link", M.createObjectNode()); d.put("active", true); return merge(d, r); }

    interface Work<T> { T run() throws Exception; }
    /** 기관 범위 트랜잭션(TenantTx.inTenant와 같음) */
    static <T> T inTenant(String tid, Work<T> w) throws Exception {
        C.setAutoCommit(false);
        try { try (Statement s = C.createStatement()) { s.execute("set local role didisam_tenant"); } try (PreparedStatement p = C.prepareStatement("select set_config('app.tenant', ?, true)")) { p.setString(1, tid); p.execute(); }
            T r = w.run(); C.commit(); return r; } catch (Exception e) { C.rollback(); throw e; } finally { C.setAutoCommit(true); }
    }
    static void exec(String sql, Object... a) throws SQLException { try (PreparedStatement p = C.prepareStatement(sql)) { bind(p, a); p.execute(); } }
    static void bind(PreparedStatement p, Object... a) throws SQLException { for (int i = 0; i < a.length; i++) { Object x = a[i]; if (x instanceof JsonNode) x = ((JsonNode) x).isNull() ? null : ((JsonNode) x).isTextual() ? ((JsonNode) x).asText() : ((JsonNode) x).toString(); p.setObject(i + 1, x); } }
    static JsonNode one(String sql, Object... a) throws Exception { try (PreparedStatement p = C.prepareStatement(sql)) { bind(p, a); try (ResultSet r = p.executeQuery()) { r.next(); String s = r.getString(1); return s == null ? M.nullNode() : M.readTree(s); } } }
    static List<Map<String, Object>> rows(String sql, Object... a) throws Exception { List<Map<String, Object>> L = new ArrayList<>(); try (PreparedStatement p = C.prepareStatement(sql)) { bind(p, a); try (ResultSet r = p.executeQuery()) { ResultSetMetaData md = r.getMetaData(); while (r.next()) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 1; i <= md.getColumnCount(); i++) o.put(md.getColumnLabel(i), r.getObject(i)); L.add(o); } } } return L; }
    static String s(JsonNode n) { return n == null || n.isNull() || n.isMissingNode() ? null : n.asText(); }
    static Object num(JsonNode n) { return n == null || n.isNull() || n.isMissingNode() ? null : n.isIntegralNumber() ? (Object) n.asLong() : (Object) n.decimalValue(); }
    static void insRule(String tid, JsonNode r0) throws Exception { JsonNode r = ruleDef(r0);
        exec("insert into mil_rule (tenant_id, id, ver, trigger, nature, cond, score, caps, once, group_key, trust_min, approval, approve_over, expiry, starts_on, ends_on, active) values (?,?,?,?,?,?::jsonb,?::jsonb,?::jsonb,?,?,?,?,?,?::jsonb,?::date,?::date,?)",
            tid, s(r.get("id")), r.get("ver").asInt(), s(r.get("trigger")), s(r.get("nature")), J(r.get("cond")), J(r.get("score")), J(r.get("caps")), s(r.get("once")), s(r.get("groupKey")), s(r.get("trustMin")), s(r.get("approval")), num(r.get("approveOver")), J(r.get("expiry")), s(r.get("startsOn")), s(r.get("endsOn")), r.get("active").asBoolean()); }
    static final Map<String, String> POLCOL = Map.of("isOn", "is_on", "expiry", "expiry", "notice", "notice", "budget", "budget", "dailyCapTotal", "daily_cap_total", "streak", "streak", "cashLock", "cash_lock", "sunset", "sunset", "penalty", "penalty", "grantCfg", "grant_cfg");
    static final Set<String> POLJSON = Set.of("expiry", "notice", "budget", "streak", "cashLock", "sunset", "penalty", "grantCfg");

    static String setup(JsonNode base, JsonNode v) throws Exception {
        JsonNode g = v.path("given"); ObjectNode pol = merge((ObjectNode) base.get("policy"), g.get("policy"));
        byte[] b = new byte[5]; new SecureRandom().nextBytes(b); StringBuilder h = new StringBuilder(); for (byte x : b) h.append(String.format("%02x", x)); String tid = "tn_" + h;
        exec("insert into tenants (id, name, type) values (?, ?, ?)", tid, "mv " + v.get("id").asText(), "academy");
        inTenant(tid, () -> {
            exec("insert into mil_policy (tenant_id, is_on, expiry, notice, budget, daily_cap_total, streak, cash_lock, sunset, penalty, grant_cfg) values (?,?,coalesce(?::jsonb,'{\"mode\":\"months\",\"months\":12}'),coalesce(?::jsonb,'{\"monthsBefore\":6,\"daysBefore\":[30,3]}'),coalesce(?::jsonb,'{}'),?,coalesce(?::jsonb,'{}'),coalesce(?::jsonb,'{\"needTrust\":\"B\",\"achievementOnly\":true}'),?::jsonb,coalesce(?::jsonb,'{\"on\":false}'),coalesce(?::jsonb,'{\"approveOver\":1000}'))",
                tid, pol.path("isOn").asBoolean(false), J(pol.get("expiry")), J(pol.get("notice")), J(pol.get("budget")), num(pol.get("dailyCapTotal")), J(pol.get("streak")), J(pol.get("cashLock")), J(pol.get("sunset")), J(pol.get("penalty")), J(pol.get("grantCfg")));
            for (JsonNode r : g.path("rules")) insRule(tid, r);
            for (JsonNode x : g.path("groups")) exec("insert into mil_group (tenant_id, key, caps) values (?,?,?::jsonb)", tid, s(x.get("key")), x.has("caps") ? x.get("caps").toString() : "{}");
            for (JsonNode r0 : g.path("rewards")) { JsonNode r = rewDef(r0);
                exec("insert into mil_reward (tenant_id, id, kind, title, cost, min_use, max_use, step, threshold, stock, per_sid, approval, cash, audience, active, link) values (?,?,?,?,?::jsonb,?,?::jsonb,?,?,?,?::jsonb,?,?,?::jsonb,?,?::jsonb)",
                    tid, s(r.get("id")), s(r.get("kind")), s(r.get("title")), J(r.get("cost")), num(r.get("minUse")), J(r.get("maxUse")), num(r.get("step")), num(r.get("threshold")), num(r.get("stock")), J(r.get("perSid")), s(r.get("approval")), r.get("cash").asBoolean(), J(r.get("audience")), r.get("active").asBoolean(), J(r.get("link"))); }
            Iterator<Map.Entry<String, JsonNode>> f = g.path("funded").fields(); while (f.hasNext()) { var e = f.next(); exec("insert into mil_funded (tenant_id, cls_id, funded) values (?,?,?)", tid, e.getKey(), e.getValue().asBoolean()); }
            for (JsonNode x : g.path("charges")) exec("insert into led_charge (tenant_id, id, bill_id, unit_id, sid, item_type, title, amount, src_type, src_id, status) values (?,?,?,?,?,'tuition','수강료',?,?,?,?)",
                tid, s(x.get("id")), s(x.get("bill")), x.has("unit") ? s(x.get("unit")) : "lu_root", x.has("sid") ? s(x.get("sid")) : "s1", num(x.get("amount")), s(x.get("srcType")), s(x.get("srcId")), x.has("status") ? s(x.get("status")) : "open");
            for (JsonNode a : g.path("allocs")) exec("insert into led_alloc (tenant_id, receipt_id, charge_id, amount) values (?,?,?,?)", tid, s(a.get("receipt")), s(a.get("charge")), num(a.get("amount")));
            return null; });
        return tid;
    }
    static String idOf(JsonNode r) { if (r == null || !r.isObject()) return null; if (r.hasNonNull("entryId")) return r.get("entryId").asText(); if (r.hasNonNull("id")) return r.get("id").asText(); JsonNode e = r.path("entries"); return e.isArray() && e.size() > 0 && e.get(0).hasNonNull("id") ? e.get(0).get("id").asText() : null; }
    static ArrayNode kinds(List<Map<String, Object>> L) { List<String> k = new ArrayList<>(); for (Map<String, Object> x : L) k.add(x.get("kind") + ":" + x.get("points")); Collections.sort(k); ArrayNode a = M.createArrayNode(); k.forEach(a::add); return a; }

    static void run(JsonNode base, JsonNode v) throws Exception {
        String id = v.get("id").asText(); String tid = setup(base, v); Map<String, String> refs = new HashMap<>(); int before = bad.size(); int i = 0;
        for (JsonNode st : v.path("steps")) { ObjectNode a = M.createObjectNode(); st.path("args").fields().forEachRemaining(e -> { JsonNode x = e.getValue(); a.set(e.getKey(), x.isTextual() && x.asText().startsWith("$") ? (refs.get(x.asText().substring(1)) == null ? M.nullNode() : M.getNodeFactory().textNode(refs.get(x.asText().substring(1)))) : x); });
            String sid = a.has("sid") ? a.get("sid").asText() : "s1"; String op = st.get("op").asText();
            JsonNode r = inTenant(tid, () -> { switch (op) {
                case "emit": return one("select mil_emit(?,?,?,?,?,?::numeric,?,?::timestamptz,?,?)::text", tid, sid, s(a.get("trigger")), s(a.get("srcType")), s(a.get("srcId")), num(a.get("value")), a.has("trust") ? s(a.get("trust")) : "B", s(a.get("at")), s(a.get("cls")), a.has("unit") ? s(a.get("unit")) : "lu_root");
                case "post": return one("select mil_post(?,?,?::timestamptz)::text", tid, s(a.get("entry")), s(a.get("at")));
                case "cancel": return one("select mil_cancel(?,?,?,'staff',?::timestamptz)::text", tid, s(a.get("entry")), s(a.get("reason")), s(a.get("at")));
                case "expire": return M.createObjectNode().set("n", one("select mil_expire(?,?::timestamptz)::text", tid, s(a.get("at"))));
                case "grant": return one("select mil_grant(?,?,?,?,?,?,?,?,?,?::timestamptz,?)::text", tid, s(a.get("staff")), a.path("owner").asBoolean(false), a.path("self").asBoolean(false), sid, a.has("unit") ? s(a.get("unit")) : "lu_root", num(a.get("points")) == null ? null : ((Number) num(a.get("points"))).intValue(), s(a.get("reason")), s(a.get("idem")), s(a.get("at")), a.path("penalty").asBoolean(false));
                case "redeem": return one("select mil_redeem_req(?,?,?,?,?,?::timestamptz)::text", tid, sid, s(a.get("reward")), num(a.get("points")) == null ? null : ((Number) num(a.get("points"))).intValue(), s(a.get("idem")), s(a.get("at")));
                case "decide": return one("select mil_redeem_decide(?,?,?,'staff',?,?::timestamptz)::text", tid, s(a.get("id")), s(a.get("decision")), s(a.get("reason")), s(a.get("at")));
                case "reclaim": return one("select mil_redeem_reclaim(?,?,?,'staff',?::timestamptz)::text", tid, s(a.get("id")), s(a.get("reason")), s(a.get("at")));
                case "addLine": return one("select mil_add_line(?,?,?,?::timestamptz)::text", tid, s(a.get("bill")), s(a.get("redeem")), s(a.get("at")));
                case "alloc": exec("insert into led_alloc (tenant_id, receipt_id, charge_id, amount) values (?,?,?,?)", tid, s(a.get("receipt")), s(a.get("charge")), num(a.get("amount"))); return M.createObjectNode().put("ok", true);
                case "refund": return one("select mil_on_refund(?,?,?::numeric,?::timestamptz)::text", tid, s(a.get("receipt")), num(a.get("ratio")), s(a.get("at")));
                case "notices": { ArrayNode k = M.createArrayNode(), p = M.createArrayNode(); for (Map<String, Object> x : rows("select kind, points from mil_notice_due(?,?::timestamptz) order by kind", tid, s(a.get("at")))) { k.add(String.valueOf(x.get("kind"))); p.add(M.valueToTree(x.get("points"))); } ObjectNode o = M.createObjectNode(); o.set("kinds", k); o.set("points", p); return o; }
                case "streak": return M.createObjectNode().set("n", one("select mil_streak_calc(?,?,?::date,coalesce((select (streak->>'freezePerWeek')::int from mil_policy where tenant_id = ?), 1))::text", tid, sid, s(a.get("day")), tid));
                case "rule": insRule(tid, a); return M.createObjectNode().put("ok", true);
                case "policy": { Iterator<Map.Entry<String, JsonNode>> it = a.fields(); while (it.hasNext()) { var e = it.next(); String col = POLCOL.get(e.getKey()); if (col == null) throw new IllegalStateException("policy " + e.getKey());
                    exec("update mil_policy set " + col + " = ?" + (POLJSON.contains(e.getKey()) ? "::jsonb" : "") + " where tenant_id = ?", POLJSON.contains(e.getKey()) ? J(e.getValue()) : e.getValue().isBoolean() ? (Object) e.getValue().asBoolean() : num(e.getValue()), tid); } return M.createObjectNode().put("ok", true); }
                case "billSum": { Map<String, Object> x = rows("select coalesce(sum(amount),0)::int sum, count(*)::int lines from led_charge where tenant_id = ? and bill_id = ? and status <> 'void'", tid, s(a.get("bill"))).get(0); return M.valueToTree(x); }
                default: throw new IllegalStateException("op " + op); } });
            if (st.has("as")) refs.put(st.get("as").asText(), idOf(r));
            if (st.has("expect")) match(st.get("expect"), r, id + "#" + i + " " + op + " [java]");
            i++;
        }
        JsonNode T = v.path("then");
        inTenant(tid, () -> {
            for (Map<String, Object> x : rows("select w.sid, w.scope_unit, w.balance, coalesce((select sum(points) from mil_entry e where e.tenant_id = w.tenant_id and e.sid = w.sid and e.scope_unit = w.scope_unit and e.status = 'posted'), 0)::int s from mil_wallet w where w.tenant_id = ?", tid))
                if (((Number) x.get("balance")).intValue() != ((Number) x.get("s")).intValue()) bad.add(id + " MV-28 지갑 캐시 ≠ 원장 합계 " + x);
            Iterator<Map.Entry<String, JsonNode>> w = T.path("wallets").fields(); while (w.hasNext()) { var e = w.next(); String[] k = e.getKey().split("\\|"); match(e.getValue(), one("select mil_sync(?,?,?,'2026-11-30T00:00:00Z')::text", tid, k[0], k[1]), id + " wallet " + e.getKey() + " [java]"); }
            Iterator<Map.Entry<String, JsonNode>> ks = T.path("kinds").fields(); while (ks.hasNext()) { var e = ks.next(); List<String> want = new ArrayList<>(); e.getValue().forEach(x -> want.add(x.asText())); Collections.sort(want);
                match(M.valueToTree(want), kinds(rows("select kind, points from mil_entry where tenant_id = ? and sid = ? and status <> 'void'", tid, e.getKey())), id + " kinds " + e.getKey() + " [java]"); }
            return null; });
        if (bad.size() == before) ok++;
    }

    public static void main(String[] a) throws Exception {
        JsonNode V = M.readTree(Files.readString(Path.of(a.length > 0 ? a[0] : "../tests/mileage-vectors.json")));
        C = DriverManager.getConnection(a.length > 1 ? a[1] : "jdbc:postgresql://127.0.0.1:5544/m42j", a.length > 2 ? a[2] : "didisam", a.length > 3 ? a[3] : "");
        int n = 0; for (JsonNode v : V.get("vectors")) { n++; try { run(V.get("base"), v); } catch (Exception e) { bad.add(v.get("id").asText() + " 예외 " + e.getMessage()); } }
        bad.forEach(x -> System.out.println("✗ " + x));
        System.out.println("mileage 기준값(Java JDBC · SQL 함수): 벡터 " + n + " · 통과 " + ok + " · 어긋남 " + bad.size()); if (!bad.isEmpty()) System.exit(1);
    }
}
