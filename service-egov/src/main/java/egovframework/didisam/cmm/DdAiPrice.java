package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDate;
import java.util.*;

/**
 * v47 AI 사용량 요금표 — Node service/server/aiprice.js와 같은 값 · 같은 규칙.
 * 100만 토큰당 2만 원 고정(부가세 별도), 충전은 10만 원 단위 · 많이 살수록 할인(최대 30%), 충전량은 충전일부터 365일(이월).
 * 기관 설정 doc.plan(산타 관리자만) · doc.aiplan = { monthTokens(산타), overage(정운영자) } — aiplan이 없으면(기존 기관) 월 한도 없음(동작 불변).
 */
public final class DdAiPrice {
    private DdAiPrice() { }
    public static final long PRICE_PER_M = 20000;
    public static final double VAT = 0.1;
    public static final long STEP = 100000, MIN_WON = 100000, MAX_WON = 100000000;
    /** 할인 구간(공급가 이상 → %) — aiprice.js DISCOUNTS와 같은 값 */
    public static final long[][] DISCOUNTS = { { 100000, 0 }, { 500000, 5 }, { 1000000, 10 }, { 3000000, 15 }, { 5000000, 20 }, { 10000000, 25 }, { 20000000, 30 } };
    /** 월 기본 포함량(대표님 2026-11-25) — 유료 250만 토큰(5만 원 상당), 체험 100만 토큰. aiprice.js와 같은 값 */
    public static final long PAID_MONTH_TOKENS = 2500000;
    public static final long TRIAL_TOKENS = 1000000;
    public static final long MONTH_MAX = 10000000000L;
    public static final int CREDIT_DAYS = 365;
    public static final List<String> CONTRACTS = List.of("sub", "multi", "build");
    public static final String MSG_LEARNER = "이번 달 AI 사용량을 다 썼어요. 선생님께 질문을 넘겨 주세요";
    public static final String MSG_STAFF = "이번 달 AI 사용량(포함량 + 추가 충전량)을 모두 썼습니다. 설정 → AI 사용량에서 추가 충전하십시오.";
    public static final String MSG_TRIAL_LEARNER = "무료 체험 기간이 끝나 지금은 AI를 쓸 수 없어요. 선생님께 질문을 넘겨 주세요";
    public static final String MSG_TRIAL_STAFF = "무료 체험 기간(14일)이 끝나 AI 월 포함량이 0입니다. 설정 → AI 사용량에서 추가 충전하거나 유료 요금제로 전환하십시오.";

    static long jsRound(double d) { return (long) Math.floor(d + 0.5); }
    public static long discountOf(long won) { long d = 0; for (long[] x : DISCOUNTS) if (won >= x[0]) d = x[1]; return d; }
    /** 충전 견적(Node quote) — 잘못된 금액이면 null */
    public static Map<String, Object> quote(JsonNode wonN) {
        double w = wonN == null ? Double.NaN : DdAiGateway.jsNum(wonN);
        if (!(Double.isFinite(w) && w == Math.rint(w))) return null; long won = (long) w;
        if (won % STEP != 0 || won < MIN_WON || won > MAX_WON) return null;
        long d = discountOf(won), vat = jsRound(won * VAT);
        Map<String, Object> m = new LinkedHashMap<>(); m.put("won", won); m.put("supply", won); m.put("vat", vat); m.put("total", won + vat); m.put("discount", d);
        m.put("unit", PRICE_PER_M * (100 - d) / 100); m.put("base", won * 1000000 / PRICE_PER_M); m.put("tokens", won * 5000 / (100 - d)); return m;
    }
    public static Map<String, Object> priceInfo() {
        Map<String, Object> m = new LinkedHashMap<>(); m.put("perM", PRICE_PER_M); m.put("perMVat", jsRound(PRICE_PER_M * (1 + VAT))); m.put("step", STEP); m.put("min", MIN_WON); m.put("max", MAX_WON);
        List<List<Long>> ds = new ArrayList<>(); for (long[] x : DISCOUNTS) ds.add(List.of(x[0], x[1])); m.put("discounts", ds); m.put("paidMonthTokens", PAID_MONTH_TOKENS); m.put("trialTokens", TRIAL_TOKENS); return m;
    }
    public static String packId(long won) { return "w" + (won / STEP); }

    static boolean okTokens(JsonNode v) { if (v == null || v.isNull()) return false; double d = DdAiGateway.jsNum(v); return Double.isFinite(d) && d == Math.rint(d) && d > 0 && d <= MONTH_MAX; }
    /** 기관 설정 정규화(on은 aiplan이 있고 monthTokens가 양의 정수일 때만) */
    public static Map<String, Object> planOf(JsonNode raw) { return planOf(raw, null, null); }
    /** 체험 종료(Node trialEnded와 같음): plan.code TRIAL이고 since + 14일이 지나면(15일째부터) 월 포함량 0 · on=true → 충전분만 사용 */
    public static final int TRIAL_DAYS = 14;
    public static boolean trialEnded(JsonNode contract, String today) {
        if (contract == null || !contract.isObject() || !"TRIAL".equals(DdAiGateway.s(contract.get("code")))) return false;
        String since = DdAiGateway.s(contract.get("since")); if (today == null || !since.matches("\\d{4}-\\d{2}-\\d{2}") || !today.matches("\\d{4}-\\d{2}-\\d{2}")) return false;
        try { return today.compareTo(addDays(since, TRIAL_DAYS)) >= 0; } catch (RuntimeException e) { return false; }
    }
    public static Map<String, Object> planOf(JsonNode raw, JsonNode contract, String today) {
        JsonNode p = raw != null && raw.isObject() ? raw : null; boolean on = p != null && okTokens(p.get("monthTokens"));
        String ov = p != null && "block".equals(DdAiGateway.s(p.get("overage"))) ? "block" : "pack"; Map<String, Object> m = new LinkedHashMap<>();
        if (trialEnded(contract, today)) { m.put("on", true); m.put("monthTokens", 0L); m.put("overage", ov); m.put("trialEnded", true); return m; }
        m.put("on", on); m.put("monthTokens", on ? (long) DdAiGateway.jsNum(p.get("monthTokens")) : TRIAL_TOKENS);
        m.put("overage", ov); return m;
    }
    public static String ovKey(JsonNode raw) { if (raw == null || !raw.isObject()) return ""; String ov = DdAiGateway.s(raw.get("overage")); return "block".equals(ov) || "pack".equals(ov) ? ov : ""; }
    public static boolean validPlan(JsonNode raw) {
        if (raw == null || raw.isNull() || raw.isMissingNode()) return true; if (!raw.isObject()) return false;
        JsonNode mt = raw.get("monthTokens"), ov = raw.get("overage");
        if (mt != null && !mt.isNull() && !okTokens(mt)) return false;
        return ov == null || ov.isNull() || (ov.isTextual() && ("block".equals(ov.asText()) || "pack".equals(ov.asText())));
    }
    /** PUT /api/state: 포함량 · 요금제는 저장값이 원천(Node keepPlan과 같음). doc을 고친다 */
    public static void keepPlan(ObjectNode doc, JsonNode curAiplan, JsonNode curPlan, String today) {
        JsonNode na = doc.get("aiplan"); String ov = na != null && na.isObject() && na.hasNonNull("overage") && !DdAiGateway.s(na.get("overage")).isEmpty() ? ("block".equals(DdAiGateway.s(na.get("overage"))) ? "block" : "pack") : null;
        JsonNode sp = curAiplan != null && curAiplan.isObject() && okTokens(curAiplan.get("monthTokens")) ? curAiplan : null;
        doc.remove("aiplan"); doc.remove("plan"); boolean trial = false;
        if (sp != null) { ObjectNode o = doc.putObject("aiplan"); o.put("monthTokens", (long) DdAiGateway.jsNum(sp.get("monthTokens"))); o.put("overage", ov != null ? ov : "block".equals(DdAiGateway.s(sp.get("overage"))) ? "block" : "pack"); }
        else if (na != null && na.isObject() && na.get("monthTokens") != null && DdAiGateway.jsNum(na.get("monthTokens")) == TRIAL_TOKENS) { ObjectNode o = doc.putObject("aiplan"); o.put("monthTokens", TRIAL_TOKENS); o.put("overage", ov != null ? ov : "pack"); trial = true; }
        if (curPlan != null && curPlan.isObject()) doc.set("plan", curPlan);
        else if (trial) { ObjectNode o = doc.putObject("plan"); o.put("code", "TRIAL"); o.put("tier", "pro"); o.put("contract", "sub"); o.put("aiMonthTokens", TRIAL_TOKENS); o.put("since", today); }
    }
    /** 산타 관리자 입력 → plan(ObjectNode). 잘못되면 400 */
    public static ObjectNode santaInput(JsonNode b, String today) {
        String code = DdAiGateway.s(b == null ? null : b.get("code")).trim().toUpperCase(Locale.ROOT);
        if (!code.matches("TRIAL|[A-Z][0-9]")) throw new DdException(400, "요금제 코드는 TRIAL 또는 영문 대문자 1자 + 숫자 1자(E1 · U0 · G4 등)입니다.", "plan_code");
        JsonNode rawT = b == null ? null : b.get("aiMonthTokens"); boolean empty = rawT == null || rawT.isNull() || (rawT.isTextual() && rawT.asText().isEmpty()); /* 비우면 기본 포함량 */
        double t = empty ? (code.equals("TRIAL") ? TRIAL_TOKENS : PAID_MONTH_TOKENS) : DdAiGateway.jsNum(rawT);
        if (!(Double.isFinite(t) && t == Math.rint(t) && t >= 0 && t <= MONTH_MAX)) throw new DdException(400, "월 포함 토큰은 0 이상 정수(최대 100억)입니다. 0이면 한도 없음입니다.", "plan_tokens");
        String contract = DdAiGateway.s(b.get("contract")); if (!CONTRACTS.contains(contract)) contract = "sub";
        String since = DdAiGateway.s(b.get("since")); if (!since.matches("\\d{4}-\\d{2}-\\d{2}")) since = today;
        String tier = DdAiGateway.s(b.get("tier")).trim(); if (tier.length() > 30) tier = tier.substring(0, 30);
        ObjectNode o = DdWeb.JSON.createObjectNode(); o.put("code", code); o.put("tier", tier); o.put("contract", contract); o.put("aiMonthTokens", (long) t); o.put("since", since); return o;
    }
    public static String santaMemo(JsonNode b) { String m = DdAiGateway.s(b == null ? null : b.get("memo")).trim(); return m.length() > 500 ? m.substring(0, 500) : m; }
    public static Set<String> santaSet(String env) { Set<String> s = new LinkedHashSet<>(); for (String x : String.valueOf(env == null ? "" : env).split(",")) { String y = x.trim().toLowerCase(Locale.ROOT); if (!y.isEmpty()) s.add(y); } return s; }

    public static String addDays(String day, int n) { return LocalDate.parse(day).plusDays(n).toString(); }
    /** 충전 차감 계산 결과 — Node simCredits와 같은 규칙(포함량 먼저 · 만료일 빠른 것부터 · 만료일 당일까지 사용) */
    public record Sim(List<Map<String, Object>> live, long thisMonth, long left, long credit) { }
    /** credits 행: id · pack · tokens · amount · pday · at · expires, usage 행: day · n */
    public static Sim sim(List<Map<String, Object>> credits, List<Map<String, Object>> usage, long included, String today) {
        List<Map<String, Object>> L = new ArrayList<>();
        for (Map<String, Object> r : credits) { Map<String, Object> x = new LinkedHashMap<>(r); String day = String.valueOf(r.get("pday")); x.put("day", day); Object ex = r.get("expires"); x.put("expires", ex == null ? addDays(day, CREDIT_DAYS) : String.valueOf(ex)); x.put("left", ((Number) r.get("tokens")).longValue()); L.add(x); }
        L.sort(Comparator.comparing((Map<String, Object> x) -> (String) x.get("day")).thenComparing(x -> (String) x.get("expires")).thenComparing(x -> String.valueOf(x.get("id"))));
        String month = monthOf(today); Map<String, Long> cum = new HashMap<>(); long thisMonth = 0;
        List<Map<String, Object>> U = new ArrayList<>(usage); U.sort(Comparator.comparing(x -> String.valueOf(x.get("day"))));
        for (Map<String, Object> u : U) {
            String d = String.valueOf(u.get("day")); if (d.compareTo(today) > 0) continue; String m = d.substring(0, 7);
            long prev = cum.getOrDefault(m, 0L), cur = prev + (u.get("n") == null ? 0 : ((Number) u.get("n")).longValue()); cum.put(m, cur);
            long over = Math.max(0, cur - included) - Math.max(0, prev - included);
            for (Map<String, Object> c : L) { if (over <= 0) break; long left = (Long) c.get("left");
                if (left <= 0 || ((String) c.get("day")).compareTo(d) > 0 || ((String) c.get("expires")).compareTo(d) < 0) continue;
                long t = Math.min(left, over); c.put("left", left - t); over -= t; if (m.equals(month)) thisMonth += t; }
        }
        List<Map<String, Object>> live = new ArrayList<>(); long left = 0;
        for (Map<String, Object> c : L) if (((String) c.get("expires")).compareTo(today) >= 0 && ((String) c.get("day")).compareTo(today) <= 0) {
            Map<String, Object> o = new LinkedHashMap<>(); o.put("pack", c.get("pack")); o.put("tokens", ((Number) c.get("tokens")).longValue()); o.put("amount", c.get("amount") == null ? 0L : ((Number) c.get("amount")).longValue());
            o.put("at", c.get("at")); o.put("day", c.get("day")); o.put("expires", c.get("expires")); o.put("left", c.get("left")); live.add(o); left += (Long) c.get("left"); }
        return new Sim(live, thisMonth, left, thisMonth + left);
    }
    /** 이달 상태(80% 주의 · 100% 초과, 포함량을 넘으면 충전량에서 빠짐) */
    public static Map<String, Object> stateOf(Map<String, Object> plan, String month, long used, long credit) {
        long included = ((Number) plan.get("monthTokens")).longValue(); long limit = included + credit;
        long pct = limit > 0 ? (long) Math.floor(used * 100.0 / limit) : Boolean.TRUE.equals(plan.get("on")) ? 100 : 0; /* 한도 0(체험 종료 · 충전 없음)은 초과 */ long creditLeft = Math.max(0, Math.min(credit, limit - Math.max(used, included)));
        Map<String, Object> m = new LinkedHashMap<>(); m.put("month", month); m.put("used", used); m.put("included", included); m.put("credit", credit); m.put("creditLeft", creditLeft);
        m.put("remaining", Math.max(0, limit - used)); m.put("pct", pct); m.put("state", !Boolean.TRUE.equals(plan.get("on")) ? "off" : pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok"); return m;
    }
    public static String monthOf(String today) { return today.substring(0, 7); }
    /** 충전 행을 읽기 시작할 날(만료일이 1년 넘게 지난 충전은 읽지 않음) · 사용 기록을 읽기 시작할 날 */
    public static String creditFrom(String today) { return LocalDate.parse(today).minusDays(366).toString(); }
    public static String usageFrom(List<Map<String, Object>> credits, String today) { return credits.isEmpty() ? monthOf(today) + "-01" : String.valueOf(credits.get(0).get("pday")).substring(0, 7) + "-01"; }
    /** 차단(429 ai_month_quota): 포함량 + 쓸 수 있는 충전량을 다 썼을 때 */
    public static void guard(Map<String, Object> plan, long used, long credit, boolean learner) {
        if (!Boolean.TRUE.equals(plan.get("on"))) return; long lim = ((Number) plan.get("monthTokens")).longValue() + credit;
        if (used < lim) return; /* 체험 종료 → trial_ended(Node blockOf와 같음) */
        if (Boolean.TRUE.equals(plan.get("trialEnded"))) throw new DdException(429, learner ? MSG_TRIAL_LEARNER : MSG_TRIAL_STAFF, "trial_ended");
        throw new DdException(429, learner ? MSG_LEARNER : MSG_STAFF, "ai_month_quota");
    }
}
