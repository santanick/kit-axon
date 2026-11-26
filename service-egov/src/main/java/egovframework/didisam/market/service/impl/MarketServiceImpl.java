package egovframework.didisam.market.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.ai.service.AiService;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.market.service.MarketService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** 디디쌤 콘텐츠 마켓 v1.1 — Node service/server/market(index · routes · settle · sweep)과 같은 /api/market/* · /api/pub/{tid}/mk-* · 오류 코드 · 응답 JSON.
 *  계산은 DdMarketCalc(= didisam/marketcalc.js) 하나, 금액 · 크레딧은 언제나 서버가 다시 계산한다. 마켓 교차 표는 MkDb(Node와 같은 SQL 문장).
 *  시범 플래그: mk_party.pilot(산타 관리자가 켬). 돈은 움직이지 않는다(계약 활성 = 세금계산서 발행 대기, CP 지급 = 지급 지시 파일). */
@Service("marketService")
public class MarketServiceImpl extends EgovAbstractServiceImpl implements MarketService {
    static final Pattern DAY_RE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$"), YM_RE = Pattern.compile("^\\d{4}-\\d{2}$"), Q_RE = Pattern.compile("^\\d{4}-Q[1-4]$"),
        COL_RE = Pattern.compile("^mc_[a-z0-9]{3,24}$"), PID_RE = Pattern.compile("^mp_[a-z0-9]{12}$");
    static final List<String> LIC = List.of("stream", "lms_export", "adapt");
    static final String AZ = "abcdefghijklmnopqrstuvwxyz0123456789"; static final SecureRandom RND = new SecureRandom();
    static final Map<String, String> MSG = new LinkedHashMap<>();
    static {
        String[] m = {
            "mk_off", "콘텐츠 마켓 시범 기관이 아닙니다. 산타에 시범 운영을 요청하십시오.",
            "mk_plan", "디디쌤 유료 구독 기관만 구매 · 판매할 수 있습니다.",
            "mk_margin", "보너스를 포함한 산타 몫이 30% 미만이라 계약 · 견적을 만들 수 없습니다. 아래 대안 중 하나를 고르십시오.",
            "mk_single_margin", "이 조합은 산타 몫이 30% 미만이라 견적을 만들 수 없습니다. 예산을 올리거나, 인원 · 과정을 줄이거나, CP에 승인 요청을 보내십시오.",
            "mk_bonus_max", "보너스 크레딧은 구매 크레딧의 7%까지만 줄 수 있습니다.",
            "mk_floor", "최저가가 정가보다 높습니다. 최저가를 정가 이하로 입력하십시오.",
            "mk_price_step", "정가는 분기에 한 번, 30% 이내로만 올릴 수 있습니다.",
            "mk_check", "사전 검수를 통과하지 못한 항목이 있습니다. 표시된 항목을 고친 뒤 다시 제출하십시오.",
            "mk_quote_state", "이 견적은 만료되었거나 CP 승인을 기다리고 있습니다.",
            "mk_restore_window", "복원은 차감 후 7일 이내, 진도 10% 미만일 때만 할 수 있습니다. 그 밖의 경우 [이의 신청]으로 산타에 요청하십시오.",
            "mk_close_same_user", "마감 실행자와 다른 산타 운영자가 확정해야 합니다.",
            "mk_cp", "CP로 등록된 기관만 쓸 수 있습니다. 산타에 CP 등록을 요청하십시오.",
            "mk_cap", "이번 달 사용할 수 있는 크레딧을 모두 썼어요. 다음 달 1일에 다시 열려요.",
            "mk_balance", "지금은 이 과정을 시작할 수 없어요. 담당 선생님께 알려 드렸어요.",
            "mk_pre", "이 과정은 담당 선생님 승인 후 시작할 수 있어요.",
            "mk_scope", "우리 학교 패스에 포함되지 않은 과정이에요.",
            "mk_learner_off", "지금은 콘텐츠 마켓을 이용할 수 없어요.",
            "mk_terms", "크레딧 이용 조건에 동의해야 구매를 확정할 수 있습니다.",
            "mk_credit_scope", "크레딧은 산타가 공급하는 콘텐츠에만 쓸 수 있습니다.",
            /* dev-addendum 3장 */
            "mk_cp_rate", "CP 요율은 표준 65% · 독점 60% · 영업 대행 55% · 해외 IP 50% 중에서만 고를 수 있고, CP 서면 동의 번호가 필요합니다.",
            "mk_promo_target", "크레딧에 참여하고 심사를 통과한 CP 상품만 추천 슬롯을 신청할 수 있습니다(산타 오리지널 · 신규 출시 90일이 지난 상품의 「신규 출시」 슬롯 제외).",
            "mk_promo_full", "선택한 달의 추천 슬롯이 모두 찼습니다. 다른 달이나 다른 슬롯을 고르십시오.",
            "mk_promo_months", "한 번에 최대 3개월(신규 출시는 1개월)까지, 다음 달부터 신청할 수 있습니다.",
            "mk_promo_state", "이미 처리된 신청이라 취소할 수 없습니다.",
            "mk_orig_cap", "이 컬렉션의 산타 오리지널 비중이 30%를 넘게 됩니다. 다른 컬렉션을 고르십시오." };
        for (int i = 0; i < m.length; i += 2) MSG.put(m[i], m[i + 1]);
    }

    private final MkDb db; private final MarketMapper mapper; private final TenantTx ttx; private final AuthService auth; private final AiService ai; private final DdRateLimiter rl; private final String pepper;
    final MkSettle settle;
    public MarketServiceImpl(MkDb db, MarketMapper mapper, TenantTx ttx, AuthService auth, AiService ai, DdRateLimiter rl,
                             @Value("${MK_SALT:}") String salt, @Value("${SESSION_PEPPER:}") String sp, @Value("${PII_KEY:}") String pk) {
        this.db = db; this.mapper = mapper; this.ttx = ttx; this.auth = auth; this.ai = ai; this.rl = rl;
        this.pepper = salt != null && !salt.isEmpty() ? salt : sp != null && !sp.isEmpty() ? sp : pk != null && !pk.isEmpty() ? pk : "mk-dev";
        this.settle = new MkSettle(this, db);
        MkRoutes.register(this);
    }
    /** 시범 플래그를 기관 문서 org.mk.pilot에도 기록(Node inTenant update와 같은 문장) */
    boolean pilotDoc(String tid, boolean on) throws Exception { return ttx.inTenant(tid, () -> mapper.updatePilot(tid, on) > 0); }

    // ── 공통 ───────────────────────────────────────────────
    DdException E(int st, String code, String msg) { return new DdException(st, msg != null ? msg : MSG.getOrDefault(code, "요청을 처리할 수 없습니다."), code); }
    DdException E(int st, String code, String msg, Map<String, Object> extra) { return E(st, code, msg).extra(extra); }
    DdException E(int st, String code) { return E(st, code, null); }
    static Map<String, Object> map(Object... kv) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]); return o; }
    static String rid(String p) { byte[] b = new byte[12]; RND.nextBytes(b); StringBuilder s = new StringBuilder(p); for (byte x : b) s.append(AZ.charAt((x & 0xff) % 36)); return s.toString(); }
    /** str(v, n) = String(v ?? '').slice(0, n) */
    static String str(JsonNode v, int n) { return cut(nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v), n); }
    static String str(String v, int n) { return cut(v == null ? "" : v, n); }
    /** int(v) = Math.round(+v), 유한수가 아니면 NaN */
    static double I(JsonNode v) { double n = round(num(v)); return Double.isFinite(n) ? n : Double.NaN; }
    static double I(String v) { return v == null ? Double.NaN : I(t(v)); }
    static long Lz(double d) { return Double.isNaN(d) ? 0 : (long) d; }
    static String kstDay() { return kstToday(); }
    static String kstDay(JsonNode iso) { if (nullish(iso)) return kstDay(); try { return Instant.parse(iso.asText()).plusSeconds(9 * 3600).atOffset(ZoneOffset.UTC).toLocalDate().toString(); } catch (Exception e) { return kstDay(); } }
    static String quarterOf(String ym) { return ym.substring(0, 4) + "-Q" + ((Integer.parseInt(ym.substring(5, 7)) - 1) / 3 + 1); }
    static List<String> monthsOf(String q) { String y = q.substring(0, 4); int n = Integer.parseInt(q.substring(6)); List<String> l = new ArrayList<>(); for (int i = 1; i <= 3; i++) l.add(y + "-" + String.format("%02d", (n - 1) * 3 + i)); return l; }
    static JsonNode g(JsonNode r, String k) { JsonNode v = r == null ? null : r.get(k); return v == null ? F.nullNode() : v; }
    static String s(JsonNode r, String k) { JsonNode v = g(r, k); return v.isNull() ? null : v.asText(); }
    static long n(JsonNode r, String k) { JsonNode v = g(r, k); return v.isNull() ? 0 : v.asLong(); }
    static boolean B(JsonNode r, String k) { return truthy(g(r, k)); }
    static ObjectNode O() { return F.objectNode(); }
    static String tid(Map<String, Object> a) { return (String) a.get("tid"); }
    static String email(Map<String, Object> a) { return (String) a.get("email"); }
    boolean isSanta(Map<String, Object> a) { return a != null && ai.isSanta(a); }
    String sidHash(String tid, String sid) {
        try { javax.crypto.Mac m = javax.crypto.Mac.getInstance("HmacSHA256"); m.init(new javax.crypto.spec.SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] h = m.doFinal(("mk|" + tid + "|" + sid).getBytes(StandardCharsets.UTF_8)); StringBuilder o = new StringBuilder(); for (byte x : h) o.append(String.format("%02x", x)); return o.toString(); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    void log(String tid, String actor, String action, Object detail) { try { ttx.audit(tid, actor, action, DdWeb.JSON.valueToTree(detail).toString()); } catch (Exception e) { /* 본 처리는 유지 */ } }
    <T> T T(TenantTx.Work<T> fn) throws Exception { return db.tx(fn); }
    /** 멱등: 같은 (기관, 경로, idem)이면 첫 응답에 again:true */
    ObjectNode idem(String tid, String route, JsonNode key, TenantTx.Work<ObjectNode> fn) throws Exception {
        if (!truthy(key)) throw E(400, "idem", "멱등 키(idem)가 필요합니다.");
        String k = str(key, 80); ObjectNode ex = db.q1("select resp from mk_idem where tid = $1 and route = $2 and key = $3", tid, route, k);
        if (ex != null) { ObjectNode r = ((ObjectNode) ex.get("resp")).deepCopy(); r.put("again", true); return r; }
        ObjectNode out = fn.run(); db.x("insert into mk_idem (tid, route, key, resp) values ($1,$2,$3,$4)", tid, route, k, out); return out;
    }

    /** 기관 문서 값(plan · 이름 · 유형) — RLS 범위 안에서 읽는다 */
    ObjectNode orgOf(String tid) throws Exception {
        Map<String, Object> t0 = ttx.plain(() -> mapper.selectTenant(tid)); /* tenants는 기관 역할 밖(Node pool.query) */
        return ttx.inTenant(tid, () -> { Map<String, Object> r = mapper.selectOrgDoc(tid); Map<String, Object> t = t0 == null ? new HashMap<>() : t0;
            ObjectNode o = O(); o.set("plan", r == null || r.get("plan") == null ? F.nullNode() : parse((String) r.get("plan")));
            String nm = r != null && r.get("name") != null && !((String) r.get("name")).isEmpty() ? (String) r.get("name") : t.get("name") != null && !String.valueOf(t.get("name")).isEmpty() ? String.valueOf(t.get("name")) : "";
            String ty = r != null && r.get("type") != null && !((String) r.get("type")).isEmpty() ? (String) r.get("type") : t.get("type") != null && !String.valueOf(t.get("type")).isEmpty() ? String.valueOf(t.get("type")) : "";
            o.put("name", nm).put("type", ty); o.set("mk", r == null || r.get("mk") == null ? F.nullNode() : parse((String) r.get("mk"))); return o; });
    }
    ObjectNode party(String tid) { ObjectNode p = db.q1("select * from mk_party where tid = $1", tid); return p != null ? p : O().put("tid", tid).put("kind", "buyer").put("pilot", false).put("active", true); }
    static boolean paidPlan(JsonNode p) { return p != null && p.isObject() && truthy(get(p, "code")) && !"TRIAL".equals(egovframework.didisam.cmm.Js.str(get(p, "code")).toUpperCase(java.util.Locale.ROOT)); }
    ObjectNode eligible(String tid) throws Exception { return paidPlan(orgOf(tid).get("plan")) ? O().put("ok", true) : O().put("ok", false).put("reason", "mk_plan"); }
    ObjectNode needPilot(String tid) { ObjectNode p = party(tid); if (!B(p, "pilot")) throw E(403, "mk_off"); return p; }
    void needPaid(String tid) throws Exception { if (!eligible(tid).get("ok").asBoolean()) throw E(403, "mk_plan"); }
    static boolean isCp(JsonNode p) { return p != null && "cp".equals(s(p, "kind")) && B(p, "active"); }

    List<ObjectNode> priceRows(String pid) { return db.q("select *, to_char(effective_from, 'YYYY-MM-DD') ef from mk_price where product_id = $1 order by effective_from, id", pid); }
    static ObjectNode priceNow(List<ObjectNode> rows, String day) { ObjectNode best = null; for (ObjectNode r : rows) if (s(r, "ef").compareTo(day) <= 0 && (best == null || s(r, "ef").compareTo(s(best, "ef")) > 0 || (s(r, "ef").equals(s(best, "ef")) && n(r, "id") > n(best, "id")))) best = r; return best; }
    List<ObjectNode> lotsOf(String cid) { return db.q("select *, to_char(valid_to, 'YYYY-MM-DD') vt, to_char(carry_to, 'YYYY-MM-DD') ct from mk_credit_wallet where contract_id = $1 order by carry_to, (lot = 'bonus'), id", cid); }
    static ObjectNode lotOut(JsonNode l) { ObjectNode o = O(); o.set("id", g(l, "id")); o.set("lot", g(l, "lot")); o.set("credits", g(l, "credits")); o.set("remain", g(l, "remain")); o.set("validTo", g(l, "vt")); o.set("carryTo", g(l, "ct")); return o; }
    static List<ObjectNode> liveLots(List<ObjectNode> L, String day) { List<ObjectNode> o = new ArrayList<>(); for (ObjectNode l : L) if (s(l, "ct").compareTo(day) >= 0) o.add(l); return o; }
    static final String KSEL = "select *, to_char(start, 'YYYY-MM-DD') s, to_char(\"end\", 'YYYY-MM-DD') e, to_char(carry_end, 'YYYY-MM-DD') ce from mk_contract";
    ObjectNode liveContract(String tid, String day) { return db.q1(KSEL + " where buyer_tid = $1 and kind = 'credit' and status in ('active','carry') and carry_end >= $2::date and start <= $2::date order by start desc limit 1", tid, day); }

    // ── 권한 ───────────────────────────────────────────────
    /* 권한 함수가 요청 범위(기관 · 산타)를 정한다 → tx()의 RLS 세션 변수. 산타 범위는 needSanta 경로에서만 */
    Map<String, Object> need(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); MkDb.scopeSet(tid(a), false); return a; }
    Map<String, Object> needStaff(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.needStaff(req); MkDb.scopeSet(tid(a), false); return a; }
    Map<String, Object> needOwner(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.needOwner(req); MkDb.scopeSet(tid(a), false); return a; }
    Map<String, Object> needSanta(HttpServletRequest req) throws Exception { Map<String, Object> a = need(req); if (!isSanta(a)) throw E(403, "santa", "산타 관리자만 쓸 수 있습니다."); rl.limit("mk-santa:" + email(a), 240, 60000L); MkDb.scopeSet(tid(a), true); return a; }
    boolean tenantExists(String tid) throws Exception { return db.raw(() -> db.q1("select 1 from tenants where id = $1", tid)) != null; }
    Map<String, Object> needCp(HttpServletRequest req) throws Exception { Map<String, Object> a = needStaff(req); ObjectNode p = T(() -> party(tid(a))); if (!isCp(p)) throw E(403, "mk_cp"); return a; }
    static String today() { return kstDay(); }
    static String ym() { return today().substring(0, 7); }
    static String qp(HttpServletRequest q, String k) { return q.getParameter(k); }
    static ObjectNode pageOf(HttpServletRequest q, List<? extends JsonNode> items) {
        double pg = I(qp(q, "page")), sz = I(qp(q, "size")); int page = (int) Math.max(1, Double.isNaN(pg) || pg == 0 ? 1 : pg); int size = (int) Math.min(100, Math.max(1, Double.isNaN(sz) || sz == 0 ? 20 : sz));
        ArrayNode a = F.arrayNode(); int from = (int) Math.min(items.size(), Math.max(0, (long) (page - 1) * size)), to = (int) Math.min(items.size(), (long) page * size); for (int i = from; i < to; i++) a.add(items.get(i));
        ObjectNode o = O(); o.set("items", a); return o.put("page", page).put("total", items.size());
    }
    static List<String> arrOf(JsonNode v, int max, Pattern re) { if (v == null || !v.isArray()) return new ArrayList<>(); LinkedHashSet<String> o = new LinkedHashSet<>(); for (JsonNode x : v) { String s = str(x, 40); if (re == null || re.matcher(s).find()) o.add(s); } List<String> l = new ArrayList<>(o); return l.size() > max ? new ArrayList<>(l.subList(0, max)) : l; }
    static ArrayNode an(List<String> l) { ArrayNode a = F.arrayNode(); l.forEach(a::add); return a; }

    // ── 상품 읽기 ───────────────────────────────────────────
    static final String PROD_SQL = "select p.*, to_char(p.launched_at, 'YYYY-MM-DD') la, pa.cp_name, pr.id price_id, pr.list_price, pr.credits, pr.vol_rules, pr.lic_allowed, pr.lic_add_bp, pr.floor_price,\n"
        + "      o.mode, o.single_months, to_char(o.credit_from, 'YYYY-MM-DD') cf, to_char(o.min_until, 'YYYY-MM-DD') mu, o.withdrawn_at\n"
        + "    from mk_product p left join mk_party pa on pa.tid = p.owner_tid\n"
        + "    left join lateral (select * from mk_price where product_id = p.id and effective_from <= $1::date order by effective_from desc, id desc limit 1) pr on true\n"
        + "    left join lateral (select * from mk_optin where product_id = p.id order by id desc limit 1) o on true";
    static boolean santaOwn(JsonNode r) { return "santa".equals(s(r, "owner_kind")); }
    static JsonNode laOrCf(JsonNode r) { return truthy(g(r, "la")) ? g(r, "la") : g(r, "cf"); }
    static String modeOf(JsonNode r, String day) {
        if (santaOwn(r)) return "credit"; ObjectNode o = O(); o.set("mode", g(r, "mode")); o.set("singleMonths", g(r, "single_months")); o.set("launchedAt", laOrCf(r)); o.set("creditFrom", g(r, "cf")); o.set("withdrawnAt", g(r, "withdrawn_at"));
        return DdMarketCalc.optinMode(o, day);
    }
    static String optinFromOf(JsonNode r) { return "single_until".equals(s(r, "mode")) ? DdMarketCalc.eligibleFrom(nullish(laOrCf(r)) ? "" : laOrCf(r).asText(), Lz(I(g(r, "single_months")))) : null; }
    static JsonNode hours(JsonNode r) { return numNode(num(g(r, "hours_x10")) / 10); }
    static JsonNode orNull(JsonNode v) { return truthy(v) ? v : F.nullNode(); }
    static ObjectNode prodOut(JsonNode r, String day, boolean staff) {
        String m = modeOf(r, day); ObjectNode o = O(); o.set("id", g(r, "id")); o.set("title", g(r, "title")); o.set("kind", g(r, "kind")); o.put("cp", santaOwn(r) ? "산타 오리지널" : truthy(g(r, "cp_name")) ? s(r, "cp_name") : "");
        o.set("hours", hours(r)); o.set("sector", g(r, "sector")); o.set("level", g(r, "level")); if (staff) o.set("credits", orNull(g(r, "credits")));
        o.put("optin", m); if ("single_until".equals(m)) o.put("optinFrom", optinFromOf(r)); o.set("lic", truthy(g(r, "lic_allowed")) ? g(r, "lic_allowed") : F.arrayNode().add("stream"));
        if (santaOwn(r)) o.put("orig", true); o.set("status", g(r, "status")); return o;
    }
    List<ObjectNode> listed(String day) { return db.q(PROD_SQL + " where p.status = 'listed' order by p.created_at, p.id", day); }
    ObjectNode prod(String id, String day) { return db.q1(PROD_SQL + " where p.id = $2", day, id); }
    /** [{id, kind, title, sector, cover, count, avgCredits, rows[]}] */
    List<ObjectNode> collections(String day, List<String> only) {
        List<ObjectNode> cols = only != null ? db.q("select * from mk_collection where active and id = any($1) order by sort, id", only) : db.q("select * from mk_collection where active order by sort, id");
        List<ObjectNode> items = db.q("select collection_id, product_id from mk_collection_item order by sort, product_id"); Map<String, ObjectNode> P = new LinkedHashMap<>(); for (ObjectNode r : listed(day)) P.put(s(r, "id"), r);
        List<ObjectNode> out = new ArrayList<>();
        for (ObjectNode col : cols) { ArrayNode L = F.arrayNode(); long sum = 0;
            for (ObjectNode i : items) if (s(i, "collection_id").equals(s(col, "id"))) { ObjectNode r = P.get(s(i, "product_id")); if (r != null && "credit".equals(modeOf(r, day)) && truthy(g(r, "credits"))) { L.add(r); sum += n(r, "credits"); } }
            ObjectNode x = O(); x.set("id", g(col, "id")); x.set("kind", g(col, "kind")); x.set("title", g(col, "title")); x.set("sector", g(col, "sector")); x.set("cover", g(col, "cover")); x.put("count", L.size()).put("avgCredits", L.size() > 0 ? Math.floorDiv(sum, L.size()) : 0); x.set("rows", L); out.add(x); }
        return out;
    }
    List<String> adsOf(String slot) { List<String> l = new ArrayList<>(); for (ObjectNode r : db.q("select product_id from mk_promo where ym = $1 and slot = $2 and status = 'ok' order by at, id limit $3", ym(), slot, DdMarketCalc.SLOT.get(slot)[0])) l.add(s(r, "product_id")); return l; }
    interface Out { ObjectNode of(JsonNode r); }
    static ArrayNode withAds(Iterable<JsonNode> rows, List<String> adIds, Out out) {
        Map<String, JsonNode> by = new LinkedHashMap<>(); for (JsonNode r : rows) by.put(s(r, "id"), r); ArrayNode a = F.arrayNode();
        for (String id : adIds) { JsonNode r = by.get(id); if (r != null) a.add(out.of(r).put("ad", true)); } for (JsonNode r : rows) if (!adIds.contains(s(r, "id"))) a.add(out.of(r)); return a;
    }

    // ── 계약 · 지갑 ─────────────────────────────────────────
    ObjectNode contractOf(Map<String, Object> a, String id, boolean lock) { ObjectNode k = db.q1(KSEL + " where id = $1" + (lock ? " for update" : ""), str(id, 20)); if (k == null || (!s(k, "buyer_tid").equals(tid(a)) && !isSanta(a))) throw E(404, "contract", "없는 계약입니다."); return k; }
    ObjectNode contractOfTid(String tid, String id) { ObjectNode k = db.q1(KSEL + " where id = $1", str(id, 20)); if (k == null || !s(k, "buyer_tid").equals(tid)) throw E(404, "contract", "없는 계약입니다."); return k; }
    static ObjectNode cp(JsonNode r, String... kv) { ObjectNode o = O(); for (int i = 0; i + 1 < kv.length; i += 2) o.set(kv[i], g(r, kv[i + 1])); return o; }
    static ObjectNode kOut(JsonNode k) { return cp(k, "id", "id", "buyerTid", "buyer_tid", "quoteId", "quote_id", "kind", "kind", "collections", "collections", "start", "s", "end", "e", "carryEnd", "ce", "supplyTotal", "supply_total", "bonusBp", "bonus_bp", "bundlePlatform", "bundle_platform",
        "status", "status", "taxStatus", "tax_status", "taxInvNo", "tax_inv_no", "renewOf", "renew_of", "refund", "refund", "activatedAt", "activated_at", "buyerKind", "buyer_kind", "terms", "terms"); }
    static JsonNode ctlOut(JsonNode t) { return t == null ? F.nullNode() : cp(t, "monthCap", "month_cap", "allowCols", "allow_cols", "allowGroups", "allow_groups", "preFrom", "pre_from", "alertBp", "alert_bp", "alertTo", "alert_to"); }
    static final class WS { List<ObjectNode> lots; ArrayNode wallet; long total, balance; ObjectNode ctl; String alert; }
    WS walletState(JsonNode k) {
        WS w = new WS(); w.lots = lotsOf(s(k, "id")); w.wallet = F.arrayNode(); for (ObjectNode l : w.lots) { w.wallet.add(lotOut(l)); w.total += n(l, "credits"); } for (ObjectNode l : liveLots(w.lots, today())) w.balance += n(l, "remain");
        w.ctl = db.q1("select * from mk_control where contract_id = $1", s(k, "id")); w.alert = DdMarketCalc.alertOf(w.balance, w.total, w.ctl == null ? null : w.ctl.get("alert_bp")); return w;
    }
    long monthUsed(String cid, String sh) { return n(db.q1("select coalesce(sum(credits), 0)::int n from mk_credit_use where contract_id = $1 and sid_hash = $2 and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') = $3 and kind in ('use','restore')", cid, sh, ym()), "n"); }
    ObjectNode doRestore(JsonNode k, JsonNode u, String by, JsonNode reason, Object prog) {
        if (!db.q("select 1 from mk_credit_use where contract_id = $1 and product_id = $2 and sid_hash = $3 and kind = 'restore'", s(k, "id"), s(u, "product_id"), s(u, "sid_hash")).isEmpty()) throw E(409, "mk_restore_once", "같은 학습자 · 같은 과정의 복원은 계약 기간에 한 번만 할 수 있습니다. [이의 신청]으로 산타에 요청하십시오.");
        JsonNode lots = truthy(g(u, "lots")) ? g(u, "lots") : F.arrayNode();
        for (JsonNode l : arr(lots)) db.x("update mk_credit_wallet set remain = least(credits, remain + $2) where id = $1", g(l, "id"), Lz(I(g(l, "take"))));
        db.x("update mk_credit_use set restored = true where id = $1", s(u, "id"));
        String rs = str(reason, 200);
        ObjectNode r = db.q1("insert into mk_credit_use (id, contract_id, buyer_tid, kind, product_id, cp_tid, sid_hash, grp, credits, lots, restore_of, prog_pct_at_restore, reason) values ($1,$2,$3,'restore',$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *",
            rid("mu_"), s(k, "id"), s(k, "buyer_tid"), s(u, "product_id"), s(u, "cp_tid"), s(u, "sid_hash"), g(u, "grp"), -n(u, "credits"), lots.toString(), s(u, "id"), prog, rs.isEmpty() ? null : rs);
        db.x("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_restore', $1, $2, $3, $4)", s(k, "id"), s(k, "buyer_tid"), -n(u, "credits"), s(r, "id"));
        return r;
    }
    static ObjectNode useOut(JsonNode u, String now) {
        ObjectNode o = cp(u, "id", "id", "at", "at", "product", "product_id", "title", "title", "credits", "credits", "kind", "kind", "restored", "restored");
        ObjectNode ln = o.putObject("learner").put("key", s(u, "sid_hash").substring(0, 10)); ln.set("group", orNull(g(u, "grp")));
        o.put("restorable", "use".equals(s(u, "kind")) && !B(u, "restored") && DdMarketCalc.restorable(DdMarketCalc.hoursBetween(s(u, "at"), now), 0)); return o;
    }

    // ── 견적 ───────────────────────────────────────────────
    long avgOf(List<String> cols) { if (cols.isEmpty()) return 45; long sum = 0, c = 0; for (ObjectNode x : collections(today(), cols)) for (JsonNode r : x.get("rows")) { sum += n(r, "credits"); c++; } return c > 0 ? Math.floorDiv(sum, c) : 45; }
    ObjectNode creditQuote(String buyer, JsonNode b, String by, boolean santa) {
        JsonNode inp = isObj(get(b, "input")) && get(b, "input").isObject() ? get(b, "input") : b;
        double bud = I(!nullish(get(inp, "budget")) ? get(inp, "budget") : get(b, "amount")); double budget = Math.floor(bud / 1000) * 1000;
        if (!(budget >= 1000000)) throw E(400, "budget", "구매액은 100만 원 이상으로 입력하십시오.");
        long B = (long) budget; List<String> cols = arrOf(truthy(get(inp, "collections")) ? get(inp, "collections") : get(b, "collections"), 20, COL_RE); boolean bundle = truthy(get(inp, "bundle")) || truthy(get(b, "bundle"));
        Double want = nullish(get(b, "bonusBp")) ? null : I(get(b, "bonusBp")); if (want != null && !(want >= 0)) throw E(400, "bonus", "보너스율을 확인하십시오.");
        if (want != null && want > DdMarketCalc.BONUS_MAX_BP) throw E(422, "mk_bonus_max");
        long sched = DdMarketCalc.bonusBp(B, bundle); long bp = want == null ? sched : santa ? want.longValue() : Math.min(want.longValue(), sched);
        long avg = avgOf(cols); ObjectNode pin = O().put("budget", B).put("bundle", bundle).put("bonusBp", bp).put("avgCredits", avg); if (!undef(get(inp, "coursesPerPerson"))) pin.set("coursesPerPerson", get(inp, "coursesPerPerson"));
        ObjectNode P = DdMarketCalc.plan(pin);
        if (!P.get("ok").asBoolean()) { List<Object> alt = List.of(map("bonusBp", Math.min(sched, DdMarketCalc.BONUS_MAX_BP))); throw E(422, "mk_margin", null, map("alternatives", alt)); }
        ObjectNode input = O().put("budget", B); input.set("collections", an(cols)); input.set("coursesPerPerson", truthy(get(inp, "coursesPerPerson")) ? get(inp, "coursesPerPerson") : F.numberNode(1.5)); input.put("bundle", bundle);
        if (truthy(get(inp, "topupOf"))) input.put("topupOf", str(get(inp, "topupOf"), 20));
        ObjectNode est = O(); est.set("avgCredits", P.get("avgCredits")); est.set("enrollments", P.get("enrollments")); est.set("people", P.get("people")); est.set("total", P.get("total"));
        return db.q1("insert into mk_quote (id, buyer_tid, kind, input, credits, bonus_bp, bonus_credits, est, supply_total, cp_max, santa_bp, valid_to, by_email) values ($1,$2,'credit',$3,$4,$5,$6,$7,$8,$9,$10,$11::date + 30,$12) returning *",
            rid("mq_"), buyer, input, P.get("credits"), P.get("bonusBp"), P.get("bonusCredits"), est, B, P.get("cpMax"), P.get("santaBp"), today(), by);
    }
    ObjectNode singleQuote(String buyer, JsonNode b, String by) {
        double pr = I(!nullish(get(b, "price")) ? get(b, "price") : get(get(b, "input"), "price")); if (!(pr > 0)) throw E(400, "price", "견적가를 입력하십시오."); long price = (long) pr;
        List<JsonNode> lines = arr(get(b, "lines")); if (lines.size() > 50) lines = lines.subList(0, 50); if (lines.isEmpty()) throw E(400, "lines", "과정과 인원을 고르십시오.");
        long floor = 0; ArrayNode L = F.arrayNode();
        for (JsonNode l : lines) { ObjectNode r = prod(str(get(l, "productId"), 20), today()); if (r == null || !"listed".equals(s(r, "status")) || !truthy(g(r, "list_price"))) throw E(404, "product", "판매 중인 상품이 아닙니다.");
            double pp = I(get(l, "people")); long nn = Math.max(1, Double.isNaN(pp) || pp == 0 ? 1 : (long) pp); long fl = n(r, "floor_price") * nn; floor += fl;
            String lic = get(l, "lic") != null && get(l, "lic").isTextual() && LIC.contains(get(l, "lic").asText()) ? get(l, "lic").asText() : "stream"; L.addObject().put("productId", s(r, "id")).put("people", nn).put("lic", lic).put("floor", fl); }
        long cand = DdMarketCalc.singleCand(price); boolean au = DdMarketCalc.singleAuto(price, floor);
        ObjectNode inp = O().put("price", price); inp.set("lines", L);
        return db.q1("insert into mk_quote (id, buyer_tid, kind, input, supply_total, cp_max, santa_bp, status, est, valid_to, by_email) values ($1,$2,'single',$3,$4,$5,3000,$6,$7,$8::date + 30,$9) returning *",
            rid("mq_"), buyer, inp, price, cand, au ? "ready" : "cp_wait", O().put("floorSum", floor).put("cand", cand).put("minPrice", DdMarketCalc.singleMin(floor)), today(), by);
    }
    /** 구매 기관 응답에는 산타 몫 · CP 지급액(santaBp · cpMax · floor · cand)을 넣지 않는다 — 산타 운영(full)만 */
    static ObjectNode quoteOut(JsonNode q, boolean full) {
        ObjectNode est = g(q, "est").isObject() ? ((ObjectNode) g(q, "est")).deepCopy() : O(); ObjectNode input = g(q, "input").isObject() ? ((ObjectNode) g(q, "input")).deepCopy() : O();
        if (!full) { est.remove("floorSum"); est.remove("cand"); est.remove("minPrice"); if (input.get("lines") != null && input.get("lines").isArray()) { ArrayNode L = F.arrayNode(); for (JsonNode l : input.get("lines")) { ObjectNode x = l.isObject() ? ((ObjectNode) l).deepCopy() : O(); x.remove("floor"); L.add(x); } input.set("lines", L); } input.remove("cpOk"); }
        ObjectNode o = cp(q, "id", "id", "buyerTid", "buyer_tid", "kind", "kind"); o.set("input", input); o.set("credits", g(q, "credits")); o.set("bonusBp", g(q, "bonus_bp")); o.set("bonusCredits", g(q, "bonus_credits")); o.set("est", est); o.set("supplyTotal", g(q, "supply_total"));
        if (full) { o.set("cpMax", g(q, "cp_max")); o.set("santaBp", g(q, "santa_bp")); } o.set("status", g(q, "status")); o.set("validTo", g(q, "valid_to")); o.set("at", g(q, "at")); return o;
    }

    // ── 계약 활성(산타) ─────────────────────────────────────
    ObjectNode activate(ObjectNode k, JsonNode b) {
        if (!"pending_pay".equals(s(k, "status"))) throw E(409, "mk_contract_state", "결제 대기 계약만 활성화할 수 있습니다.");
        ObjectNode qt = db.q1("select * from mk_quote where id = $1", s(k, "quote_id")); String tax = trim(str(get(b, "taxInvNo"), 40)); String ts = tax.isEmpty() ? "waiting" : "issued"; String tn = tax.isEmpty() ? null : tax;
        String id = s(k, "id"), buyer = s(k, "buyer_tid");
        if ("single".equals(s(k, "kind"))) {
            db.q1("update mk_contract set status = 'active', activated_at = now(), tax_status = $2, tax_inv_no = $3 where id = $1", id, ts, tn);
            db.x("insert into mk_entry (kind, contract_id, party_tid, amount, ref) values ('single_sale', $1, $2, $3, $4)", id, buyer, g(k, "supply_total"), s(qt, "id"));
            ObjectNode o = O(); o.set("contract", kOut(contractOfTid(buyer, id))); o.set("wallet", F.arrayNode()); return o;
        }
        ObjectNode target = k;
        if (truthy(g(k, "renew_of"))) {
            target = db.q1(KSEL + " where id = $1 for update", s(k, "renew_of"));
            if (target == null || !List.of("active", "carry").contains(s(target, "status"))) throw E(409, "mk_contract_state", "원 계약이 이용 중이 아닙니다.");
            ObjectNode x = DdMarketCalc.expiry(today()); String vt = x.get("validTo").asText(), ct = x.get("carryTo").asText();
            db.x("insert into mk_credit_wallet (id, contract_id, lot, credits, remain, valid_to, carry_to, src_contract) values ($1,$2,'topup',$3,$3,$4,$5,$6)", rid("mw_"), s(target, "id"), g(qt, "credits"), vt, ct, id);
            if (truthy(g(qt, "bonus_credits"))) db.x("insert into mk_credit_wallet (id, contract_id, lot, credits, remain, valid_to, carry_to, src_contract) values ($1,$2,'bonus',$3,$3,$4,$5,$6)", rid("mw_"), s(target, "id"), g(qt, "bonus_credits"), vt, ct, id);
            if (ct.compareTo(s(target, "ce")) > 0) db.x("update mk_contract set carry_end = $2, status = 'active' where id = $1", s(target, "id"), ct);
            db.x("update mk_contract set status = 'merged', activated_at = now(), tax_status = $2, tax_inv_no = $3 where id = $1", id, ts, tn);
        } else {
            db.x("insert into mk_credit_wallet (id, contract_id, lot, credits, remain, valid_to, carry_to) values ($1,$2,'paid',$3,$3,$4,$5)", rid("mw_"), id, g(qt, "credits"), s(k, "e"), s(k, "ce"));
            if (truthy(g(qt, "bonus_credits"))) db.x("insert into mk_credit_wallet (id, contract_id, lot, credits, remain, valid_to, carry_to) values ($1,$2,'bonus',$3,$3,$4,$5)", rid("mw_"), id, g(qt, "bonus_credits"), s(k, "e"), s(k, "ce"));
            db.x("update mk_contract set status = 'active', activated_at = now(), tax_status = $2, tax_inv_no = $3 where id = $1", id, ts, tn);
        }
        db.x("insert into mk_entry (kind, contract_id, party_tid, amount, credits, ref) values ('credit_sale', $1, $2, $3, $4, $5)", s(target, "id"), buyer, g(k, "supply_total"), g(qt, "credits"), id);
        if (truthy(g(qt, "bonus_credits"))) db.x("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_bonus', $1, $2, $3, $4)", s(target, "id"), buyer, g(qt, "bonus_credits"), id);
        if (B(k, "bundle_platform")) db.x("insert into mk_entry (kind, contract_id, party_tid, ref) values ('platform_bundle', $1, $2, $3)", s(target, "id"), buyer, id);
        WS W = walletState(contractOfTid(buyer, s(target, "id")));
        ObjectNode o = O(); o.set("contract", kOut(contractOfTid(buyer, id))); o.put("target", s(target, "id")); o.set("wallet", W.wallet); o.put("balance", W.balance); return o;
    }

    // ── 학습자 시작(차감) ───────────────────────────────────
    static final class SX { String access; ObjectNode k, r, had, u; Long cr; SX(String a) { access = a; } }
    SX startOf(String tid, String sh, String pid, String mode) {
        String day = today(); ObjectNode k = liveContract(tid, day); ObjectNode r = prod(pid, day);
        if (r == null || !"listed".equals(s(r, "status")) || !truthy(g(r, "credits"))) return new SX("none");
        if ("seller".equals(s(r, "owner_kind"))) { SX z = new SX("scope"); z.r = r; return z; } /* C5 크레딧은 산타 공급 상품에만(기관 간 중개 상품 불가) */
        SX X = new SX("empty"); X.r = r; if (k == null) return X; X.k = k;
        ObjectNode ctl = db.q1("select * from mk_control where contract_id = $1", s(k, "id"));
        ObjectNode had = db.q1("select * from mk_credit_use where contract_id = $1 and product_id = $2 and sid_hash = $3 and kind = 'use' and not restored", s(k, "id"), pid, sh);
        if (had != null) { X.access = "started"; X.had = had; return X; }
        if (!"credit".equals(modeOf(r, day)) && db.q("select 1 from mk_credit_use where contract_id = $1 and product_id = $2 and kind = 'use' limit 1", s(k, "id"), pid).isEmpty()) { X.access = "buy"; return X; } /* 철회 보호 밖 개별 판매 전용은 「따로 구매」 */
        List<String> cols = new ArrayList<>(); for (ObjectNode x : db.q("select collection_id from mk_collection_item where product_id = $1", pid)) cols.add(s(x, "collection_id"));
        List<JsonNode> scope = new ArrayList<>(); if (g(k, "collections").size() > 0) scope.add(g(k, "collections")); if (ctl != null && g(ctl, "allow_cols").size() > 0) scope.add(g(ctl, "allow_cols"));
        for (JsonNode S0 : scope) { boolean any = false; for (String x : cols) for (JsonNode y : S0) if (y.asText().equals(x)) any = true; if (!any) { X.access = "out"; return X; } }
        ObjectNode P = priceNow(priceRows(pid), day); long nth = n(db.q1("select count(*)::int n from mk_credit_use where buyer_tid = $1 and product_id = $2 and kind = 'use' and not restored", tid, pid), "n") + 1;
        long cr = DdMarketCalc.useCredits(n(P, "list_price"), nth, g(P, "vol_rules")); X.cr = cr;
        if (DdMarketCalc.needApproval(cr, ctl == null ? null : ctl.get("pre_from"))) { ObjectNode pa = db.q1("select status from mk_preapproval where contract_id = $1 and product_id = $2 and sid_hash = $3 and status in ('asked','ok')", s(k, "id"), pid, sh);
            if (pa == null) { X.access = "pre"; return X; } if ("asked".equals(s(pa, "status"))) { X.access = "pre_asked"; return X; } }
        if (!DdMarketCalc.capOk(monthUsed(s(k, "id"), sh), cr, ctl == null ? null : ctl.get("month_cap"))) { X.access = "cap"; return X; }
        ArrayNode LL = F.arrayNode(); for (ObjectNode l : liveLots(lotsOf(s(k, "id")), day)) { ObjectNode o = LL.addObject(); o.set("id", g(l, "id")); o.set("kind", g(l, "lot")); o.set("exp", g(l, "ct")); o.set("remain", g(l, "remain")); }
        ObjectNode U = DdMarketCalc.useLots(LL, cr);
        if (U.get("short").asLong() > 0) { X.access = "balance"; return X; }
        if ("check".equals(mode)) { X.access = "credit"; return X; }
        ArrayNode took = F.arrayNode(); for (JsonNode l : U.get("lots")) if (l.get("take").asLong() != 0) { db.x("update mk_credit_wallet set remain = remain - $2 where id = $1 and remain >= $2", l.get("id"), l.get("take")); ObjectNode t0 = took.addObject(); t0.set("id", l.get("id")); t0.set("take", l.get("take")); }
        ObjectNode u = db.q1("insert into mk_credit_use (id, contract_id, buyer_tid, kind, product_id, cp_tid, sid_hash, credits, lots, price_id, vol_n) values ($1,$2,$3,'use',$4,$5,$6,$7,$8,$9,$10) returning *",
            rid("mu_"), s(k, "id"), tid, pid, s(r, "owner_tid"), sh, cr, took.toString(), g(P, "id"), nth);
        db.x("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_use', $1, $2, $3, $4)", s(k, "id"), tid, cr, s(u, "id"));
        X.access = "charged"; X.u = u; return X;
    }
    /** L3 항목 상태(해요체 라벨) */
    static final Map<String, String> ACCESS_LABEL = Map.of("started", "이어서 학습해요", "credit", "크레딧으로 바로 시작할 수 있어요", "pre", "담당 선생님 승인 후 시작할 수 있어요", "pre_asked", "승인을 요청했어요", "cap", "이번 달 사용할 수 있는 크레딧을 모두 썼어요",
        "empty", "지금은 시작할 수 없어요. 담당 선생님께 알려 주세요", "out", "우리 기관 패스에 포함되지 않은 과정이에요", "buy", "패스 밖 과정이라 따로 구매해야 해요", "none", "찾을 수 없는 과정이에요", "scope", "크레딧으로는 수강할 수 없는 과정이에요");
    static final Map<String, Object[]> ACCESS_ERR = Map.of("scope", new Object[]{ 409, "mk_credit_scope" }, "buy", new Object[]{ 403, "mk_scope" }, "cap", new Object[]{ 409, "mk_cap" }, "balance", new Object[]{ 409, "mk_balance" }, "pre", new Object[]{ 409, "mk_pre" }, "pre_asked", new Object[]{ 409, "mk_pre" },
        "out", new Object[]{ 403, "mk_scope" }, "empty", new Object[]{ 409, "mk_balance" }, "none", new Object[]{ 404, "product" });
    static ObjectNode itemOf(JsonNode r) { ObjectNode o = O(); o.set("id", g(r, "id")); o.set("title", g(r, "title")); o.set("hours", hours(r)); o.set("credits", g(r, "credits")); o.set("thumb", orNull(g(r, "thumb"))); if (santaOwn(r)) o.put("orig", true).put("badge", "orig"); return o; }

    @Override public Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception {
        MkDb.scopeReset(); try { return pub0(req, res, tid, key, body, lauth); } finally { MkDb.scopeClear(); }
    }
    Object pub0(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception {
        Map<String, Object> s0 = lauth.get(); if (!List.of("GET mk-shelf", "GET mk-list", "GET mk-item", "POST mk-start", "POST mk-pre").contains(key)) throw E(404, "not_found", "없는 주소입니다.");
        if (s0 == null) throw E(401, "auth", "로그인이 필요해요."); MkDb.scopeSet(tid, false); String sid = String.valueOf(s0.get("sid")); String sh = sidHash(tid, sid);
        switch (key) {
            case "GET mk-shelf": return T(() -> { if (!B(party(tid), "pilot")) { ObjectNode o = O().put("on", false); o.putArray("shelf"); return o; } String day = today(); ObjectNode k = liveContract(tid, day);
                if (k == null) { ObjectNode o = O().put("on", true); o.putArray("shelf"); o.putObject("me").put("allowed", false); return o; }
                ObjectNode ctl = db.q1("select * from mk_control where contract_id = $1", s(k, "id")); List<ObjectNode> C = collections(day, g(k, "collections").size() > 0 ? strs(g(k, "collections")) : null);
                if (ctl != null && g(ctl, "allow_cols").size() > 0) { List<String> al = strs(g(ctl, "allow_cols")); C.removeIf(x -> !al.contains(s(x, "id"))); }
                List<String> ads = adsOf("shelf_top"); ArrayNode shelf = F.arrayNode(); int i = 0;
                for (ObjectNode x : C) { ObjectNode sx = shelf.addObject(); sx.set("colId", x.get("id")); sx.set("title", x.get("title")); ArrayNode items; if (i++ == 0) items = withAds(x.get("rows"), ads, MarketServiceImpl::itemOf); else { items = F.arrayNode(); for (JsonNode r : x.get("rows")) items.add(itemOf(r)); } sx.set("items", items); }
                long used = monthUsed(s(k, "id"), sh); ObjectNode o = O().put("on", true); o.set("shelf", shelf); ObjectNode me = o.putObject("me").put("allowed", true); if (ctl != null && truthy(g(ctl, "month_cap"))) me.put("monthLeft", Math.max(0, n(ctl, "month_cap") - used)); return o; });
            case "GET mk-list": return T(() -> { if (!B(party(tid), "pilot")) { ObjectNode o = O().put("on", false); o.putArray("items"); return o; } String day = today(); ArrayNode a = F.arrayNode();
                for (ObjectNode r : listed(day)) if ("credit".equals(modeOf(r, day)) && truthy(g(r, "credits"))) { ObjectNode x = a.addObject(); x.set("id", g(r, "id")); x.set("title", g(r, "title")); x.set("hours", hours(r)); x.set("credits", g(r, "credits")); if (santaOwn(r)) x.put("orig", true); }
                ObjectNode o = O().put("on", true); o.set("items", a); return o; });
            case "GET mk-item": { String pid = str(qp(req, "id"), 20); if (!PID_RE.matcher(pid).matches()) throw E(404, "product", "과정을 찾지 못했어요.");
                return T(() -> { if (!B(party(tid), "pilot")) throw E(403, "mk_learner_off"); SX X = startOf(tid, sh, pid, "check"); if (X.r == null) throw E(404, "product", "과정을 찾지 못했어요.");
                    ObjectNode it = O(); it.set("id", g(X.r, "id")); it.set("title", g(X.r, "title")); it.set("hours", hours(X.r)); if (X.cr != null && X.cr != 0) it.put("credits", X.cr); else it.set("credits", g(X.r, "credits")); String acc = "balance".equals(X.access) ? "empty" : X.access; it.put("access", acc).put("accessLabel", ACCESS_LABEL.getOrDefault(acc, "")); if (santaOwn(X.r)) it.put("orig", true);
                    ObjectNode o = O(); o.set("item", it); return o; }); }
            case "POST mk-start": { rl.limit("mk-start:" + tid + ":" + sid, 30, 60000L); JsonNode b = DdWeb.readBody(body, 32 * 1024); String pid = str(get(b, "productId"), 20); if (!PID_RE.matcher(pid).matches()) throw E(404, "product", "과정을 찾지 못했어요.");
                SX X; try { X = T(() -> { if (!B(party(tid), "pilot")) throw E(403, "mk_learner_off"); ObjectNode k0 = liveContract(tid, today()); if (k0 != null) db.q("select id from mk_contract where id = $1 for update", s(k0, "id"));
                    SX x = startOf(tid, sh, pid, "start"); Object[] er = ACCESS_ERR.get(x.access); if (er != null) { DdException e = E((Integer) er[0], (String) er[1]); if ("pre_asked".equals(x.access)) e.extra(map("access", "pre_asked")); throw e; } return x; }); }
                catch (DuplicateKeyException e) { X = new SX("started"); }
                if ("charged".equals(X.access)) { log(tid, "learner", "market.use", map("product", pid, "credits", X.cr)); SX fx = X; T(() -> { WS W = walletState(fx.k); if (!W.alert.isEmpty()) log(tid, "system", "market.alert", map("contract", s(fx.k, "id"), "alert", W.alert, "balance", W.balance)); return null; }); }
                ObjectNode o = O().put("ok", true).put("courseRef", "#mk/" + pid).put("charged", "charged".equals(X.access)); if (X.cr != null && X.cr != 0 && "charged".equals(X.access)) o.put("credits", X.cr); return o; }
            case "POST mk-pre": { JsonNode b = DdWeb.readBody(body, 32 * 1024); String pid = str(get(b, "productId"), 20);
                return T(() -> { if (!B(party(tid), "pilot")) throw E(403, "mk_learner_off"); SX X = startOf(tid, sh, pid, "check"); if (!"pre".equals(X.access) && !"pre_asked".equals(X.access)) throw E(409, "mk_pre_none", "승인 없이 시작할 수 있는 과정이에요.");
                    ObjectNode ex = db.q1("select * from mk_preapproval where contract_id = $1 and product_id = $2 and sid_hash = $3 and status = 'asked'", s(X.k, "id"), pid, sh);
                    ObjectNode row = ex != null ? ex : db.q1("insert into mk_preapproval (id, contract_id, product_id, sid_hash) values ($1,$2,$3,$4) returning *", rid("ma_"), s(X.k, "id"), pid, sh);
                    ObjectNode o = O(); ObjectNode p = o.putObject("preapproval"); p.set("id", g(row, "id")); p.set("status", g(row, "status")); p.put("productId", pid); return o; }); }
            default: throw E(404, "not_found", "없는 주소입니다.");
        }
    }
    static List<String> strs(JsonNode a) { List<String> l = new ArrayList<>(); for (JsonNode x : arr(a)) l.add(x.asText()); return l; }

    // ── 운영자 · CP · 산타 라우트 ────────────────────────────
    @FunctionalInterface interface H { Object go(HttpServletRequest req, HttpServletResponse res, byte[] raw, String[] p) throws Exception; }
    final Map<String, H> R = new LinkedHashMap<>(); final List<Object[]> P = new ArrayList<>();
    void r(String key, H h) { R.put(key, h); }
    void p(String m, String re, H h) { P.add(new Object[]{ m, Pattern.compile(re), h }); }
    ObjectNode promoOut(JsonNode p) { return cp(p, "id", "id", "cpTid", "cp_tid", "productId", "product_id", "slot", "slot", "ym", "ym", "fee", "fee", "status", "status", "memo", "memo", "closeId", "close_id", "at", "at"); }
    ObjectNode rateInfo(String cpt) {
        List<ObjectNode> rows = db.q("select rate_kind, cp_bp, to_char(effective_from, 'YYYY-MM-DD') ef from mk_cp_rate where cp_tid = $1 order by effective_from, id", cpt); String day = today(); ObjectNode cur = null, nxt = null;
        for (ObjectNode r : rows) { if (s(r, "ef").compareTo(day) <= 0) cur = r; else nxt = r; }
        ObjectNode o = O(); if (cur != null) { ObjectNode c = o.putObject("current"); c.set("rateKind", g(cur, "rate_kind")); c.set("cpBp", g(cur, "cp_bp")); c.set("effectiveFrom", g(cur, "ef")); } else o.putObject("current").put("rateKind", "standard").put("cpBp", DdMarketCalc.CP_BP).putNull("effectiveFrom");
        if (nxt != null) { ObjectNode c = o.putObject("next"); c.set("rateKind", g(nxt, "rate_kind")); c.set("cpBp", g(nxt, "cp_bp")); c.set("effectiveFrom", g(nxt, "ef")); } return o;
    }
    List<ObjectNode> activeOf(String pid) throws Exception { return db.txAs("", true, () -> db.q("select distinct k.id, to_char(k.carry_end, 'YYYY-MM-DD') ce from mk_credit_use u join mk_contract k on k.id = u.contract_id where u.product_id = $1 and u.kind = 'use' and k.status in ('active','carry')", pid)); }
    static Object nz(JsonNode v) { if (nullish(v) || (v.isTextual() && v.textValue().isEmpty())) return null; double d = Math.max(0, I(v)); return Double.isNaN(d) || d == 0 ? null : (long) d; }
    ObjectNode putControl(String cid, JsonNode b, String by) {
        Object cap = nz(get(b, "monthCap")), pre = nz(get(b, "preFrom")); List<String> cols = nullish(get(b, "allowCols")) ? null : arrOf(get(b, "allowCols"), 50, COL_RE); List<String> grps = nullish(get(b, "allowGroups")) ? null : arrOf(get(b, "allowGroups"), 100, null);
        List<Long> al = new ArrayList<>(); if (get(b, "alertBp") != null && get(b, "alertBp").isArray()) { for (JsonNode x : get(b, "alertBp")) { double d = I(x); if (d > 0 && d < 10000 && al.size() < 4) al.add((long) d); } } else { al.add(2000L); al.add(1000L); }
        List<String> to = null; if (get(b, "alertTo") != null && get(b, "alertTo").isArray()) { to = new ArrayList<>(); for (JsonNode x : get(b, "alertTo")) if (to.size() < 10) to.add(str(x, 80)); }
        return db.q1("insert into mk_control (contract_id, month_cap, allow_cols, allow_groups, pre_from, alert_bp, alert_to, by_email) values ($1,$2,$3,$4,$5,$6,$7,$8)\n"
            + "      on conflict (contract_id) do update set month_cap = $2, allow_cols = $3, allow_groups = $4, pre_from = $5, alert_bp = $6, alert_to = $7, by_email = $8, at = now() returning *", cid, cap, cols, grps, pre, al, to, by);
    }
    ObjectNode revenue(HttpServletRequest q) {
        String to = qp(q, "to") != null && YM_RE.matcher(qp(q, "to")).matches() ? qp(q, "to") : ym(); String from = qp(q, "from") != null && YM_RE.matcher(qp(q, "from")).matches() ? qp(q, "from") : to.substring(0, 4) + "-01";
        List<ObjectNode> rows = db.q("select to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') m, u.cp_tid, p.owner_kind ok, sum(u.credits)::int cr from mk_credit_use u join mk_product p on p.id = u.product_id\n"
            + "      where u.kind in ('use','restore') and to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2 group by 1, 2, 3", from, to);
        Map<String, ArrayNode> rates = new HashMap<>(); ArrayNode lines = F.arrayNode(); java.util.TreeMap<String, ArrayNode> byM = new java.util.TreeMap<>(); Map<String, Object[]> byRate = new LinkedHashMap<>();
        for (ObjectNode r : rows) { boolean sa = "santa".equals(s(r, "ok")); long bp = 0;
            if (!sa) { ArrayNode rr = rates.computeIfAbsent(s(r, "cp_tid"), cpt -> { ArrayNode a = F.arrayNode(); for (ObjectNode x : db.q("select cp_bp, to_char(effective_from, 'YYYY-MM-DD') ef from mk_cp_rate where cp_tid = $1", cpt)) { ObjectNode o = a.addObject(); o.set("effectiveFrom", x.get("ef")); o.set("cpBp", x.get("cp_bp")); } return a; }); bp = DdMarketCalc.rateAt(rr, s(r, "m") + "-01"); }
            String src = sa ? "credit_orig" : "credit_cp"; long cr = n(r, "cr"); lines.addObject().put("source", src).put("credits", cr).put("cpBp", bp); byM.computeIfAbsent(s(r, "m"), z -> F.arrayNode()).addObject().put("source", src).put("credits", cr).put("cpBp", bp);
            if (!sa) { String k = DdMarketCalc.rateKindOf(bp); if (k == null) k = "standard"; Object[] x = byRate.computeIfAbsent(k, z -> new Object[]{ new LinkedHashSet<String>(), new long[2] }); @SuppressWarnings("unchecked") LinkedHashSet<String> cs = (LinkedHashSet<String>) x[0]; cs.add(s(r, "cp_tid")); ((long[]) x[1])[0] += cr; ((long[]) x[1])[1] += DdMarketCalc.settleLine(cr, bp).path("santa").asLong(); } }
        long fee = n(db.q1("select coalesce(sum(amount), 0)::int n from mk_entry where kind = 'promo_fee' and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2", from, to), "n");
        long single = n(db.q1("select coalesce(sum(amount), 0)::int n from mk_entry where kind = 'single_sale' and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2", from, to), "n");
        if (fee != 0) lines.addObject().put("source", "promo").put("amount", fee); if (single != 0) lines.addObject().put("source", "single").put("amount", single).put("cp", DdMarketCalc.singleCand(single));
        ObjectNode mix = DdMarketCalc.santaMix(lines); ArrayNode bySource = F.arrayNode(); for (JsonNode x : mix.get("bySource")) bySource.add(cp(x, "source", "source", "gross", "gross", "cp", "cp", "santa", "santa", "santaBp", "santaBp"));
        /* 인식 매출(소진 기준 · 보너스 반영): 계약별 순소진 × 계약 구매액(추가 구매 포함) ÷ 계약 총크레딧, 반올림 */
        long recognized = fee + single;
        for (ObjectNode r : db.q("select u.contract_id, sum(u.credits)::int cr, (select coalesce(sum(credits), 0)::int from mk_credit_wallet w where w.contract_id = u.contract_id) tot,\n"
            + "        (select coalesce(sum(supply_total), 0)::int from mk_contract x where (x.id = u.contract_id or x.renew_of = u.contract_id) and x.status in ('active','carry','ended','merged')) sup\n"
            + "      from mk_credit_use u where u.kind in ('use','restore') and to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2 group by u.contract_id", from, to)) recognized += DdMarketCalc.recognized(n(r, "cr"), n(r, "sup"), n(r, "tot"));
        ObjectNode minQ = db.q1("select min(santa_bp)::int n, count(*) filter (where santa_bp < 3000)::int below from mk_quote where kind = 'credit' and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') between $1 and $2", from, to);
        ObjectNode o = O().put("from", from).put("to", to); o.set("bySource", bySource); ArrayNode br = o.putArray("byRate");
        for (Map.Entry<String, Object[]> e : byRate.entrySet()) { long[] v = (long[]) e.getValue()[1]; br.addObject().put("rateKind", e.getKey()).put("cps", ((LinkedHashSet<?>) e.getValue()[0]).size()).put("credits", v[0]).put("santa", v[1]); }
        ArrayNode tr = o.putArray("trend"); for (Map.Entry<String, ArrayNode> e : byM.entrySet()) { ObjectNode z = DdMarketCalc.santaMix(e.getValue()); ObjectNode t0 = tr.addObject().put("ym", e.getKey()); t0.set("santa", z.get("santa")); t0.set("santaBp", z.get("santaBp")); }
        ObjectNode gd = o.putObject("guard"); gd.set("minQuoteBp", g(minQ, "n")); gd.set("below", g(minQ, "below"));
        long mcp = mix.get("cp").asLong(); ObjectNode T = o.putObject("totals"); T.set("gross", mix.get("gross")); T.set("cp", mix.get("cp")); T.set("santa", mix.get("santa")); T.set("santaBp", mix.get("santaBp"));
        T.put("recognized", recognized).put("santaRecognized", recognized - mcp).put("santaRecognizedBp", recognized > 0 ? Math.floorDiv((recognized - mcp) * 10000, recognized) : 0); return o;
    }
    static ObjectNode slotsJson() { ObjectNode o = O(); for (Map.Entry<String, long[]> e : DdMarketCalc.SLOT.entrySet()) { ObjectNode s = o.putObject(e.getKey()).put("cap", e.getValue()[0]).put("fee", e.getValue()[1]).put("label", DdMarketCalc.SLOT_LABEL.get(e.getKey())); if (e.getValue()[2] > 0) s.put("launchDays", e.getValue()[2]); } return o; }
    static boolean owner(Map<String, Object> a) { return "owner".equals(a.get("role")); }
    static boolean staff(Map<String, Object> a) { return !"teacher".equals(a.get("role")); }


    @Override public Object admin(HttpServletRequest req, HttpServletResponse res, byte[] body) throws Exception {
        String path = req.getRequestURI(), m = req.getMethod(); H h = R.get(m + " " + path); String[] grp = new String[0];
        if (h == null) for (Object[] x : P) { if (!m.equals(x[0])) continue; Matcher mt = ((Pattern) x[1]).matcher(path); if (mt.matches()) { h = (H) x[2]; grp = new String[mt.groupCount()]; for (int i = 0; i < grp.length; i++) grp[i] = mt.group(i + 1); break; } }
        if (h == null) throw E(404, "not_found", "없는 주소입니다.");
        MkDb.scopeReset(); try { return h.go(req, res, body, grp); } finally { MkDb.scopeClear(); } /* 본문은 각 경로가 권한 확인 뒤 읽는다(Node readBody 순서) */
    }

    /** 마켓 상태 전환(1시간) — Node market/sweep.js tick과 같은 문장 · 순서(산타 범위, 각 200건).
     *  유효 만료 → 이월(carry, credit_carry 장부) · 이월 만료 → ended(미사용분 자동 소멸 없음) · 견적 만료 · 사전 승인 요청 30일 만료. 월 집계 · 분기 마감은 산타 운영자가 실행(Node와 같음) */
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 3600000, initialDelayString = "${dd.market.tickMs:600000}")
    public void tick() { try { sweep(); } catch (Exception ignore) { /* 표가 없거나(마이그레이션 전) 일시 오류 — 다음 회차에 다시 */ } }
    public int sweep() throws Exception {
        return db.txAs("", true, () -> { String day = today(); int n = 0;
            List<ObjectNode> carry = db.q("update mk_contract set status = 'carry' where id in (select id from mk_contract where status = 'active' and kind = 'credit' and \"end\" < $1::date limit 200) returning id, buyer_tid", day);
            for (ObjectNode k : carry) { long r = n(db.q1("select coalesce(sum(remain), 0)::int n from mk_credit_wallet where contract_id = $1", s(k, "id")), "n");
                db.x("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_carry', $1, $2, $3, $4)", s(k, "id"), s(k, "buyer_tid"), r, day); }
            n += carry.size();
            n += db.x("update mk_contract set status = 'ended' where id in (select id from mk_contract where status in ('active','carry') and carry_end < $1::date limit 200)", day);
            n += db.x("update mk_quote set status = 'expired' where id in (select id from mk_quote where status in ('ready','sent','cp_wait') and valid_to < $1::date limit 200)", day);
            n += db.x("update mk_preapproval set status = 'expired' where id in (select id from mk_preapproval where status = 'asked' and at < now() - interval '30 days' limit 200)");
            return n; });
    }

    // 라우트 본문(MkRoutes)이 쓰는 접근자
    MkDb db() { return db; }
    AuthService auth() { return auth; }
    MkSettle settle() { return settle; }
    ObjectNode orgName(String tid) throws Exception { return orgOf(tid); }
    static LocalDate day(String s) { return LocalDate.parse(s); }
}
