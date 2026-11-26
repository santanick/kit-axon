package egovframework.didisam.market.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import static egovframework.didisam.cmm.Js.*;

/** 디디쌤 콘텐츠 마켓 v1.1 계산 — didisam/marketcalc.js(서비스 기획서 v1.1 10장 + dev-addendum 1장)를 그대로 옮긴 것.
 *  기준값 tests/market-vectors.json을 test/MarketVectors.java로 깊은 비교한다(Node · 브라우저와 같은 out).
 *  원 · 크레딧 정수, 나눗셈 내림, 과정 크레딧 환산만 올림, 비율 bp 정수. 날짜는 'YYYY-MM-DD'(KST 달력 날짜). */
public final class DdMarketCalc {
    private DdMarketCalc() { }

    public static final long WON = 1000, CP_BP = 6500, SANTA_BP = 3500, BONUS_MAX_BP = 700, GUARD_BP = 3000, BUNDLE_BP = 700;
    public static final long[][] BONUS_STEPS = { { 30000000, 300 }, { 50000000, 700 } };
    public static final long RESTORE_HOURS = 168, RESTORE_PROG_LT = 10, SINGLE_CP_BP = 7000;
    public static final long[] ALERT_BP = { 2000, 1000 };
    /* 마진 개선 1차(dev-addendum) */
    public static final Map<String, Long> RATE = new LinkedHashMap<>();
    public static final Map<String, long[]> SLOT = new LinkedHashMap<>(); /* {cap, fee, launchDays(0=없음)} */
    public static final Map<String, String> SLOT_LABEL = new LinkedHashMap<>();
    public static final long ORIG_CAP_BP = 3000, PROMO_MAX_MONTHS = 3;
    public static final List<Long> RATE_BPS = List.of(6500L, 6000L, 5500L, 5000L);
    static {
        RATE.put("standard", 6500L); RATE.put("exclusive", 6000L); RATE.put("agency", 5500L); RATE.put("overseas", 5000L);
        SLOT.put("home_top", new long[]{ 3, 500000, 0 }); SLOT.put("shelf_top", new long[]{ 3, 300000, 0 }); SLOT.put("new_launch", new long[]{ 10, 200000, 90 });
        SLOT_LABEL.put("home_top", "마켓 홈 추천"); SLOT_LABEL.put("shelf_top", "학습자 진열대 첫 줄"); SLOT_LABEL.put("new_launch", "신규 출시");
    }

    // ── 기본 연산(JS와 같은 규칙) ─────────────────────────
    /** int(v) = Math.trunc(+v), 유한수가 아니면 0 */
    public static long I(JsonNode v) { double n = num(v); return Double.isFinite(n) ? (long) n : 0; }
    public static long I(double n) { return Double.isFinite(n) ? (long) n : 0; }
    static long fdiv(long a, long b) { return Math.floorDiv(a, b); }
    static long cdiv(long a, long b) { return -Math.floorDiv(-a, b); }
    static ObjectNode o() { return F.objectNode(); }

    /* 1) 과정 크레딧 = ⌈정가 ÷ 1,000⌉ */
    public static long credits(long price) { return Math.max(0, cdiv(price, WON)); }

    /* 2) 보너스율 */
    public static long bonusBp(long amount, boolean bundle) { long b = bundle ? BUNDLE_BP : 0; for (long[] s : BONUS_STEPS) if (amount >= s[0]) b = Math.max(b, s[1]); return Math.min(BONUS_MAX_BP, b); }
    /** bp == null이면 규칙대로 */
    public static ObjectNode wallet(long amount, boolean bundle, Long bp) {
        long base = Math.max(0, fdiv(amount, WON)); long want = bp == null ? bonusBp(amount, bundle) : bp; long use = Math.max(0, Math.min(BONUS_MAX_BP, want)); long bonus = fdiv(base * use, 10000);
        ObjectNode r = o().put("base", base).put("bonus", bonus).put("bonusBp", use).put("total", base + bonus); if (want > BONUS_MAX_BP) r.put("bonusOver", true); return r;
    }

    /* 3) 예상 수강 */
    static long cpp10(JsonNode v) { double n = round((nullish(v) && !undef(v) ? 0 : undef(v) ? 1.5 : num(v)) * 10); return n > 0 ? (long) n : 15; }
    public static ObjectNode estimate(long totalCredits, long avgCredits, JsonNode coursesPerPerson) {
        long t = Math.max(0, totalCredits), avg = Math.max(1, avgCredits), k = cpp10(nullish(coursesPerPerson) ? F.numberNode(1.5) : coursesPerPerson);
        long e = fdiv(t, avg); return o().put("total", t).put("enrollments", e).put("people", fdiv(e * 10, k));
    }

    /* 4) 마진 가드(전량 소진 가정) */
    public static ObjectNode guard(long a, long bp) {
        long base = fdiv(a, WON); long cr = base + fdiv(base * bp, 10000); long cpMax = fdiv(cr * WON * CP_BP, 10000); long santaBp = a > 0 ? fdiv((a - cpMax) * 10000, a) : 0;
        return o().put("credits", cr).put("cpMax", cpMax).put("santaBp", santaBp).put("ok", a > 0 && santaBp >= GUARD_BP && bp <= BONUS_MAX_BP);
    }
    public static ObjectNode partial(long amount, long totalCredits, long pct) { long used = fdiv(totalCredits * pct, 100); long cp = fdiv(used * WON * CP_BP, 10000); return o().put("used", used).put("cp", cp).put("santa", amount - cp); }
    /** 예산형 계산기(POST /credit/plan) — o: {budget, people, coursesPerPerson, avgCredits, bundle, bonusBp} */
    public static ObjectNode plan(JsonNode in) {
        JsonNode cppN = get(in, "coursesPerPerson"); JsonNode cpp = nullish(cppN) ? F.numberNode(1.5) : cppN;
        long avg = Math.max(1, I(truthy(get(in, "avgCredits")) ? get(in, "avgCredits") : F.numberNode(45)));
        long budget = I(get(in, "budget"));
        if (!(budget > 0) && I(get(in, "people")) > 0) budget = cdiv(I(get(in, "people")) * cpp10(cpp) * avg, 10) * WON;
        JsonNode bpN = get(in, "bonusBp"); ObjectNode w = wallet(budget, truthy(get(in, "bundle")), nullish(bpN) ? null : I(bpN));
        ObjectNode g = guard(budget, w.get("bonusBp").asLong()); ObjectNode e = estimate(w.get("total").asLong(), avg, cpp);
        boolean over = w.has("bonusOver");
        ObjectNode r = o().put("budget", budget).put("credits", w.get("base").asLong()).put("bonusBp", w.get("bonusBp").asLong()).put("bonusCredits", w.get("bonus").asLong()).put("total", w.get("total").asLong())
            .put("avgCredits", avg).put("enrollments", e.get("enrollments").asLong()).put("people", e.get("people").asLong()).put("santaBp", g.get("santaBp").asLong()).put("cpMax", g.get("cpMax").asLong()).put("ok", g.get("ok").asBoolean() && !over);
        if (over) r.put("bonusOver", true); return r;
    }

    /* 5) CP 수량 할인 */
    public static long discCredits(long price, long offBp) { return cdiv(fdiv(price * (10000 - offBp), 10000), WON); }
    public static long useCredits(long price, long nth, JsonNode volRules) {
        JsonNode best = null; for (JsonNode r : arr(volRules)) if (isObj(r) && I(get(r, "fromN")) > 0 && nth >= I(get(r, "fromN")) && (best == null || I(get(r, "fromN")) > I(get(best, "fromN")))) best = r;
        return best != null ? discCredits(price, I(get(best, "offBp"))) : credits(price);
    }
    public static ObjectNode deductMany(long price, long n, Long fromN, Long offBp) {
        long full = credits(price), disc = discCredits(price, offBp == null ? 1000 : offBp), f = fromN == null ? 500 : fromN, k = Math.min(n, f - 1);
        return o().put("total", k * full + Math.max(0, n - k) * disc).put("full", full).put("disc", disc);
    }

    /* 6) 복원 */
    public static boolean restorable(double hours, double progPct) { return hours <= RESTORE_HOURS && progPct < RESTORE_PROG_LT; }
    public static double hoursBetween(String fromIso, String toIso) { return (Instant.parse(toIso).toEpochMilli() - Instant.parse(fromIso).toEpochMilli()) / 3600e3; }

    /* 7) 월 소진 정산 */
    public static long cpOf(long cr) { return fdiv(cr * WON * CP_BP, 10000); }
    public static ObjectNode settle(JsonNode rows) {
        TreeMap<String, long[]> by = new TreeMap<>();
        for (JsonNode r : arr(rows)) { if (!truthy(r)) continue; long[] x = by.computeIfAbsent(str(get(r, "cp")), k -> new long[2]); x[0] += I(get(r, "used")); x[1] += I(get(r, "restored")); }
        ArrayNode lines = F.arrayNode(); long net = 0, cp = 0;
        for (Map.Entry<String, long[]> e : by.entrySet()) { long n = e.getValue()[0] - e.getValue()[1]; long c = cpOf(n); net += n; cp += c; lines.addObject().put("cp", e.getKey()).put("used", e.getValue()[0]).put("restored", e.getValue()[1]).put("net", n).put("cpAmount", c); }
        ObjectNode r = o(); r.set("lines", lines); return r.put("net", net).put("gross", net * WON).put("cp", cp).put("santa", net * WON - cp);
    }
    public static long sum(JsonNode a) { long s = 0; for (JsonNode v : arr(a)) s += I(v); return s; }

    // ── 8) 날짜 ──────────────────────────────────────────
    static final Pattern PD = Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})");
    static int[] pd(String s) { Matcher m = PD.matcher(s == null ? "" : s); return m.find() ? new int[]{ Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)) } : null; }
    /** Date.UTC(y, m-1, d) — 넘치는 월 · 일은 다음으로 넘긴다 */
    static LocalDate U(int y, int m, int d) { return LocalDate.of(y, 1, 1).plusMonths(m - 1L).plusDays(d - 1L); }
    static int lastDay(int y, int m) { return U(y, m + 1, 0).getDayOfMonth(); }
    static String yearOn(int y, int m, int d) { return (m == 2 && d == 29 && lastDay(y, 2) < 29 ? U(y, 3, 1) : U(y, m, d)).toString(); }
    public static String addDays(String s, long n) { int[] p = pd(s); return p == null ? null : U(p[0], p[1], p[2]).plusDays(n).toString(); }
    public static ObjectNode expiry(String start) {
        int[] p = pd(start); if (p == null) return null; String v = yearOn(p[0] + 1, p[1], p[2]); int[] q = pd(v);
        return o().put("validTo", addDays(v, -1)).put("carryTo", addDays(v, -1)); /* r3 자동 이월 폐지 */
    }
    static int lotRank(String k) { return "bonus".equals(k) ? 1 : 0; }
    static String kindOf(JsonNode l) { return truthy(get(l, "kind")) ? str(get(l, "kind")) : truthy(get(l, "lot")) ? str(get(l, "lot")) : null; }
    static String expOf(JsonNode l) { JsonNode e = truthy(get(l, "exp")) ? get(l, "exp") : truthy(get(l, "carryTo")) ? get(l, "carryTo") : null; return e == null ? "" : str(e); }
    /** 사용 순서: carryTo 이른 로트 → 구매 → 보너스 → id(안정 정렬) */
    public static List<JsonNode> lotOrder(JsonNode lots) {
        List<JsonNode> l = new ArrayList<>(); for (JsonNode x : arr(lots)) if (truthy(x)) l.add(x);
        l.sort((a, b) -> { int c = expOf(a).compareTo(expOf(b)); if (c != 0) return c; c = lotRank(kindOf(a)) - lotRank(kindOf(b)); if (c != 0) return c; return S(get(a, "id")).compareTo(S(get(b, "id"))); });
        return l;
    }
    public static ObjectNode useLots(JsonNode lots, long n) {
        long left = n; ArrayNode out = F.arrayNode();
        for (JsonNode l : lotOrder(lots)) { long r = Math.max(0, I(get(l, "remain"))); long t = Math.min(r, Math.max(0, left)); left -= t; ObjectNode x = out.addObject(); JsonNode id = get(l, "id"); if (!undef(id)) x.set("id", id); String k = kindOf(l); if (k != null) x.put("kind", k); x.put("take", t).put("remain", r - t); }
        ObjectNode r = o(); r.set("lots", out); return r.put("short", Math.max(0, left));
    }

    /* 소멸 · 이월 · 해지 환불(policy v1.3, code-changes r3 C3) — marketcalc.js refundOf · carryOf와 같은 규칙 */
    public static final long PENALTY_BP = 1000, CARRY_BP = 2000, CARRY_MAX_BP = 5000, RENEW_GRACE_DAYS = 30, REFUND_FULL_DAYS = 14;
    static String toOf(JsonNode l) { for (String k : new String[]{ "validTo", "carryTo", "exp" }) if (truthy(get(l, k))) return str(get(l, k)); return ""; }
    public static ObjectNode refundOf(JsonNode lots, String day, JsonNode op) {
        String start = truthy(get(op, "start")) ? str(get(op, "start")) : null; long usedTotal = I(get(op, "usedTotal")); String mode0 = S(get(op, "buyerMode"));
        long pen = Math.min(PENALTY_BP, Math.max(0, undef(get(op, "penaltyBp")) || nullish(get(op, "penaltyBp")) ? PENALTY_BP : I(get(op, "penaltyBp"))));
        long bonusUsed = 0, paidAll = 0, paidUnused = 0; int live = 0;
        for (JsonNode l : arr(lots)) { if (!truthy(l)) continue; String k = kindOf(l); if (k == null) k = "paid"; long cr = I(get(l, "credits")), rm = I(get(l, "remain"));
            if ("bonus".equals(k)) { bonusUsed += Math.max(0, cr - rm); continue; } paidAll += cr; String to = toOf(l); if (to.isEmpty() || day.compareTo(to) <= 0) { live++; paidUnused += rm; } }
        if ("public_postpaid".equals(mode0)) return rf("none", paidUnused, bonusUsed, 0, 0);
        if (live == 0) return rf("none", 0, bonusUsed, 0, 0);
        if (start != null && usedTotal == 0 && day.compareTo(addDays(start, REFUND_FULL_DAYS - 1)) <= 0) return rf("full", paidAll, bonusUsed, 0, paidAll * WON);
        if ("santa".equals(S(get(op, "cause")))) return rf("santa_fault", paidUnused, bonusUsed, 0, paidUnused * WON);
        long base = Math.max(0, paidUnused - bonusUsed) * WON, amount = Math.floorDiv(base * (10000 - pen), 10000);
        return rf("public_license".equals(mode0) ? "contract" : "terminate", paidUnused, bonusUsed, base - amount, amount);
    }
    static ObjectNode rf(String mode, long pu, long bu, long pen, long amt) { return o().put("mode", mode).put("paidUnused", pu).put("bonusUsed", bu).put("penalty", pen).put("amount", amt); }
    public static ObjectNode carryOf(JsonNode prev, JsonNode renew, JsonNode op) {
        long bp = Math.min(CARRY_MAX_BP, Math.max(0, undef(get(op, "carryBp")) || nullish(get(op, "carryBp")) ? CARRY_BP : I(get(op, "carryBp")))); long unused = Math.max(0, I(get(prev, "paidUnused")));
        long limit = Math.floorDiv(Math.min(I(get(prev, "paidCredits")), I(get(renew, "paidCredits"))) * bp, 10000);
        if (!truthy(prev) || !truthy(renew) || !truthy(get(prev, "validTo")) || !truthy(get(renew, "signedAt")) || str(get(renew, "signedAt")).compareTo(addDays(str(get(prev, "validTo")), RENEW_GRACE_DAYS)) > 0)
            return o().put("ok", false).put("credits", 0).put("limit", limit).put("lapse", unused).put("reason", "late");
        long cr = Math.min(unused, limit); return o().put("ok", true).put("credits", cr).put("limit", limit).put("lapse", unused - cr).put("reason", "");
    }

    /* 9) 기관 통제 — cap · th는 비어 있으면 제한 없음 */
    static boolean blank(JsonNode v) { return nullish(v) || (v.isTextual() && v.textValue().isEmpty()) || I(v) <= 0; }
    public static boolean capOk(long usedMonth, long course, JsonNode cap) { return blank(cap) || usedMonth + course <= I(cap); }
    public static boolean needApproval(long course, JsonNode th) { return !blank(th) && course >= I(th); }
    public static String alertOf(long bal, long total, JsonNode bps) {
        List<Long> L = new ArrayList<>(); if (bps != null && bps.isArray() && bps.size() > 0) { for (JsonNode x : bps) L.add(I(x)); } else for (long x : ALERT_BP) L.add(x);
        L.removeIf(x -> x <= 0); L.sort(null); long b = bal * 10000;
        for (long x : L) if (b <= total * x) return "r" + numStr(x / 100.0); return "";
    }

    /* 10) 단가 · 요율 변경: 다음 달 1일 */
    public static String effectiveFrom(String asked) { int[] p = pd(asked); if (p == null) return null; return p[1] == 12 ? U(p[0] + 1, 1, 1).toString() : U(p[0], p[1] + 1, 1).toString(); }
    public static String nextMonth1(String d) { return effectiveFrom(d); }
    public static JsonNode priceAt(JsonNode history, String day) {
        JsonNode best = null; for (JsonNode h : arr(history)) if (truthy(h) && truthy(get(h, "effectiveFrom")) && str(get(h, "effectiveFrom")).compareTo(day) <= 0 && (best == null || str(get(h, "effectiveFrom")).compareTo(str(get(best, "effectiveFrom"))) >= 0)) best = h;
        return best;
    }

    /* 11) opt-in */
    public static String addMonths(String s, long n) { int[] p = pd(s); if (p == null) return null; long m = p[1] - 1 + n; int y = (int) (p[0] + Math.floorDiv(m, 12)), mm = (int) Math.floorMod(m, 12) + 1; return U(y, mm, Math.min(p[2], lastDay(y, mm))).toString(); }
    public static String eligibleFrom(String launch, long months) { return addMonths(launch, months); }
    public static String optinMinEnd(String from) { int[] p = pd(from); return p == null ? null : yearOn(p[0] + 1, p[1], p[2]); }
    /** o: {mode, singleMonths, launchedAt, creditFrom, withdrawnAt} */
    public static String optinMode(JsonNode o, String day) {
        if (!truthy(o) || truthy(get(o, "withdrawnAt"))) return "single";
        String mode = S(get(o, "mode"));
        if ("single_until".equals(mode)) { JsonNode la = truthy(get(o, "launchedAt")) ? get(o, "launchedAt") : get(o, "creditFrom"); String f = eligibleFrom(nullish(la) ? "" : str(la), I(get(o, "singleMonths"))); return f != null && day.compareTo(f) >= 0 ? "credit" : "single_until"; }
        return "credit".equals(mode) ? "credit" : "single";
    }

    /* 12) 개별 판매 전용 */
    public static long singleCand(long price) { return fdiv(price * SINGLE_CP_BP, 10000); }
    public static boolean singleAuto(long price, long floorSum) { return singleCand(price) >= floorSum; }
    public static long singleMin(long floorSum) { return cdiv(floorSum * 10000, SINGLE_CP_BP); }
    public static ObjectNode singleGuard(long p, long cpPay, long reward) { long s = p > 0 ? fdiv((p - cpPay - reward) * 10000, p) : 0; return o().put("santaBp", s).put("ok", p > 0 && s >= GUARD_BP); }

    /* 13) 유지 규칙 */
    static long pct(long v, long p) { return fdiv(v * p, 100); }
    public static ObjectNode broker(long a) { return o().put("market", pct(a, 30)).put("direct", pct(a, 15)).put("agency", pct(a, 35)); }
    public static ObjectNode b2c(long vat) { long sup = fdiv(vat * 10, 11); ObjectNode r = o().put("supply", sup); r.set("market", o().put("cp", pct(sup, 70)).put("santa", pct(sup, 30))); r.set("self", o().put("seller", pct(sup, 90)).put("santa", sup - pct(sup, 90))); return r; }
    public static ObjectNode path(long vat) { long sup = fdiv(vat * 10, 11); return o().put("supply", sup).put("cp", pct(sup, 60)).put("curator", pct(sup, 15)).put("santa", pct(sup, 25)); }

    // ── 마진 개선 1차 ────────────────────────────────────
    public static String rateKindOf(long bp) { for (Map.Entry<String, Long> e : RATE.entrySet()) if (e.getValue() == bp) return e.getKey(); return null; }
    /** null(통과) | "mk_cp_rate" */
    public static String rateCheck(long bp, String agreeRef) { return RATE_BPS.contains(bp) && agreeRef != null && !trim(agreeRef).isEmpty() ? null : "mk_cp_rate"; }
    public static long rateAt(JsonNode rows, String day) {
        JsonNode b = null; for (JsonNode r : arr(rows)) if (truthy(r) && S(get(r, "effectiveFrom")).compareTo(day) <= 0 && (b == null || S(get(r, "effectiveFrom")).compareTo(S(get(b, "effectiveFrom"))) >= 0)) b = r;
        return b != null ? I(get(b, "cpBp")) : CP_BP;
    }
    public static long cpBpOf(String ownerKind, Long cpBp) { return "santa".equals(ownerKind) ? 0 : cpBp == null ? CP_BP : cpBp; }
    /** {cp, santa} | {error} */
    public static ObjectNode settleLine(long net, long b) { if (b != 0 && !RATE_BPS.contains(b)) return o().put("error", "mk_cp_rate"); long cp = fdiv(net * b, 10); return o().put("cp", cp).put("santa", net * WON - cp); }
    public static long promoFee(String slot, long months) { long[] s = SLOT.get(slot); return s == null ? 0 : s[1] * months; }
    static final Pattern YM = Pattern.compile("^\\d{4}-\\d{2}$");
    /** o: {approvedInMonth, optin, reviewed, orig, launchDays, thisYm} → {fee} | {error} */
    public static ObjectNode promoCheck(String slot, JsonNode months, JsonNode op) {
        long[] S = SLOT.get(slot); List<String> M = new ArrayList<>(); boolean isArr = months != null && months.isArray(); if (isArr) for (JsonNode m : months) M.add(nullish(m) && !undef(m) ? "null" : str(m));
        String optin = truthy(get(op, "optin")) ? str(get(op, "optin")) : "credit"; JsonNode rv = get(op, "reviewed");
        if (S == null || truthy(get(op, "orig")) || !"credit".equals(optin) || (rv != null && rv.isBoolean() && !rv.booleanValue()) || ("new_launch".equals(slot) && I(get(op, "launchDays")) > S[2])) return o().put("error", "mk_promo_target");
        String thisYm = nullish(get(op, "thisYm")) ? "" : str(get(op, "thisYm"));
        if (M.isEmpty() || M.size() > ("new_launch".equals(slot) ? 1 : PROMO_MAX_MONTHS) || M.stream().anyMatch(m -> !YM.matcher(m).matches() || m.compareTo(thisYm) <= 0) || new LinkedHashSet<>(M).size() != M.size()) return o().put("error", "mk_promo_months");
        if (I(get(op, "approvedInMonth")) >= S[0]) return o().put("error", "mk_promo_full");
        return o().put("fee", S[1] * M.size());
    }
    public static ObjectNode promoDeduct(long total, long fee, long carryIn) { long f = fee + carryIn, d = Math.min(total, f); return o().put("deduct", d).put("pay", total - d).put("carryOut", f - d); }
    public static boolean origCapOk(long colCount, long origCount) { return (origCount + 1) * 10000 <= ORIG_CAP_BP * (colCount + 1); }
    public static long recognized(long credits, long amount, long totalCredits) { return totalCredits > 0 ? fdiv(2 * credits * amount + totalCredits, 2 * totalCredits) : 0; }
    /** lines [{source, credits, cpBp}] → {bySource[], gross, cp, santa, santaBp} */
    public static ObjectNode santaMix(JsonNode lines) {
        TreeMap<String, long[]> by = new TreeMap<>();
        for (JsonNode l : arr(lines)) { if (!truthy(l)) continue; String k = truthy(get(l, "source")) ? str(get(l, "source")) : "credit_cp";
            if (!nullish(get(l, "amount"))) { long gg = I(get(l, "amount")), cc = Math.min(gg, Math.max(0, I(get(l, "cp")))); long[] x = by.computeIfAbsent(k, z -> new long[4]); x[1] += gg; x[2] += cc; x[3] += gg - cc; continue; } /* 금액 줄 {source, amount, cp} */
            long c = I(get(l, "credits")); ObjectNode r = settleLine(c, nullish(get(l, "cpBp")) ? CP_BP : I(get(l, "cpBp"))); if (r.has("error")) continue;
            long[] x = by.computeIfAbsent(k, z -> new long[4]); x[0] += c; x[1] += c * WON; x[2] += r.get("cp").asLong(); x[3] += r.get("santa").asLong(); }
        ArrayNode L = F.arrayNode(); long gross = 0, cp = 0;
        for (Map.Entry<String, long[]> e : by.entrySet()) { long[] x = e.getValue(); gross += x[1]; cp += x[2]; L.addObject().put("source", e.getKey()).put("credits", x[0]).put("gross", x[1]).put("cp", x[2]).put("santa", x[3]).put("santaBp", x[1] > 0 ? fdiv(x[3] * 10000, x[1]) : 0); }
        ObjectNode r = o(); r.set("bySource", L); return r.put("gross", gross).put("cp", cp).put("santa", gross - cp).put("santaBp", gross > 0 ? fdiv((gross - cp) * 10000, gross) : 0);
    }

    /* 화면 공용 이름(marketcalc.js 별칭) */
    public static long alertLevel(long total, long bal, JsonNode bps) { if (!(total > 0)) return 0; String r = alertOf(bal, total, bps); return r.isEmpty() ? 0 : I(num(r.substring(1))); }
    public static boolean preNeeded(JsonNode preFrom, long course) { return needApproval(course, preFrom); }
    public static ObjectNode validity(String start) { return expiry(start); }
    /** GET /api/market/credit/rules 본문(rules()) */
    public static ObjectNode rules() {
        ObjectNode r = o().put("won", WON).put("cpBp", CP_BP).put("santaBp", SANTA_BP).put("guardBp", GUARD_BP); ObjectNode b = r.putObject("bonus"); ArrayNode st = b.putArray("steps");
        for (long[] s : BONUS_STEPS) st.addObject().put("from", s[0]).put("bp", s[1]); b.put("bundleBp", BUNDLE_BP).put("maxBp", BONUS_MAX_BP);
        r.put("validMonths", 12).put("carryMonths", 12); r.putObject("restore").put("hours", RESTORE_HOURS).put("progLtPct", RESTORE_PROG_LT); ArrayNode a = r.putArray("alertBp"); for (long x : ALERT_BP) a.add(x); return r;
    }

    static Long optL(JsonNode v) { return nullish(v) ? null : I(v); }
    static String S(JsonNode v) { return nullish(v) ? "" : str(v); }
    /** tests/market-vectors-run.js의 margin 묶음 호출 규칙(rateAt · recognized만 다르고 나머지는 run과 같음) */
    public static JsonNode runMargin(String fn, JsonNode i) {
        switch (fn) {
            case "rateAt": { ArrayNode rows = F.arrayNode(); rows.addObject().put("effectiveFrom", "0000-01-01").put("cpBp", 6500); String ef = nextMonth1(S(get(i, "asked"))); rows.addObject().put("effectiveFrom", ef).set("cpBp", get(i, "cpBp"));
                ObjectNode r = o().put("effectiveFrom", ef); ArrayNode cp = r.putArray("cp"); for (JsonNode d : arr(get(i, "days"))) cp.add(settleLine(I(get(i, "net")), rateAt(rows, str(d))).get("cp")); return r; }
            case "recognized": { long rec = recognized(I(get(i, "credits")), I(get(i, "amount")), I(get(i, "totalCredits"))); long s = rec - I(get(i, "cp")), t = rec - I(get(i, "cpStd"));
                return o().put("rec", rec).put("santa", s).put("santaBp", fdiv(s * 10000, rec)).put("santaStd", t).put("santaStdBp", fdiv(t * 10000, rec)); }
            default: return run(fn, i);
        }
    }
    /** tests/market-vectors-run.js와 같은 호출 규칙(fn · in 이름 그대로) */
    public static JsonNode run(String fn, JsonNode i) {
        switch (fn) {
            case "credits": return F.numberNode(credits(I(get(i, "price"))));
            case "wallet": { ObjectNode w = wallet(I(get(i, "amount")), truthy(get(i, "bundle")), optL(get(i, "bonusBp"))); w.remove("bonusOver"); return w; }
            case "estimate": return estimate(I(get(i, "totalCredits")), I(get(i, "avgCredits")), get(i, "coursesPerPerson"));
            case "guard": return guard(I(get(i, "amount")), I(get(i, "bonusBp")));
            case "partial": return partial(I(get(i, "amount")), I(get(i, "totalCredits")), I(get(i, "pct")));
            case "plan": return plan(i);
            case "deductMany": return deductMany(I(get(i, "price")), I(get(i, "n")), optL(get(i, "fromN")), optL(get(i, "offBp")));
            case "restorable": return F.booleanNode(restorable(num(get(i, "hours")), num(get(i, "progPct"))));
            case "settle": return settle(get(i, "rows"));
            case "cpOf": return F.numberNode(cpOf(I(get(i, "credits"))));
            case "sum": return F.numberNode(sum(get(i, "values")));
            case "expiry": return expiry(S(get(i, "start")));
            case "useLots": return useLots(get(i, "lots"), I(get(i, "n")));
            case "refundOf": return refundOf(get(i, "lots"), S(get(i, "day")), get(i, "o"));
            case "carryOf": return carryOf(get(i, "prev"), get(i, "renew"), get(i, "o"));
            case "capOk": { ArrayNode a = F.arrayNode(); for (JsonNode x : arr(get(i, "cases"))) a.add(capOk(I(x.get(0)), I(x.get(1)), x.get(2))); return a; }
            case "needApproval": { ArrayNode a = F.arrayNode(); for (JsonNode x : arr(get(i, "cases"))) a.add(needApproval(I(x.get(0)), x.get(1))); return a; }
            case "alertOf": { ArrayNode a = F.arrayNode(); for (JsonNode x : arr(get(i, "cases"))) a.add(alertOf(I(x.get(0)), I(x.get(1)), x.get(2))); return a; }
            case "priceAt": { ObjectNode r = o(); ArrayNode lp = r.putArray("listPrice"), cr = r.putArray("credits");
                for (JsonNode d : arr(get(i, "days"))) { JsonNode p = priceAt(get(i, "history"), str(d)); lp.add(get(p, "listPrice")); cr.add(credits(I(get(p, "listPrice")))); }
                return r.put("effectiveFrom", effectiveFrom(S(get(i, "asked")))); }
            case "eligibleFrom": return t(eligibleFrom(S(get(i, "launch")), I(get(i, "months"))));
            case "optinMinEnd": return t(optinMinEnd(S(get(i, "from"))));
            case "singleAuto": return F.booleanNode(singleAuto(I(get(i, "price")), I(get(i, "floorSum"))));
            case "singleMin": return F.numberNode(singleMin(I(get(i, "floorSum"))));
            case "broker": return broker(I(get(i, "amount")));
            case "b2c": return b2c(I(get(i, "vatPrice")));
            case "path": return path(I(get(i, "vatPrice")));
            /* 마진 개선 1차 */
            case "rateCheck": { String e = rateCheck(I(get(i, "cpBp")), nullish(get(i, "agreeRef")) ? null : str(get(i, "agreeRef"))); return e == null ? F.nullNode() : t(e); }
            case "rateAt": return F.numberNode(rateAt(get(i, "rows"), S(get(i, "day"))));
            case "settleLine": return settleLine(I(get(i, "net")), I(get(i, "cpBp")));
            case "promoFee": return F.numberNode(promoFee(S(get(i, "slot")), I(get(i, "months"))));
            case "promoCheck": return promoCheck(S(get(i, "slot")), get(i, "months"), get(i, "o"));
            case "promoDeduct": return promoDeduct(I(get(i, "total")), I(get(i, "fee")), I(get(i, "carryIn")));
            case "origCapOk": return F.booleanNode(origCapOk(I(get(i, "colCount")), I(get(i, "origCount"))));
            case "recognized": return F.numberNode(recognized(I(get(i, "credits")), I(get(i, "amount")), I(get(i, "totalCredits"))));
            case "santaMix": return santaMix(get(i, "lines"));
            /* ui 묶음(화면 공용 이름) */
            case "alertLevel": { ArrayNode a = F.arrayNode(); for (JsonNode x : arr(get(i, "cases"))) a.add(alertLevel(I(x.get(0)), I(x.get(1)), x.get(2))); return a; }
            case "preNeeded": { ArrayNode a = F.arrayNode(); for (JsonNode x : arr(get(i, "cases"))) a.add(preNeeded(x.get(0), I(x.get(1)))); return a; }
            case "validity": { ArrayNode a = F.arrayNode(); for (JsonNode x : arr(get(i, "starts"))) a.add(validity(str(x))); return a; }
            case "capOkUi": { ArrayNode a = F.arrayNode(); for (JsonNode x : arr(get(i, "cases"))) a.add(capOk(I(x.get(0)), I(x.get(1)), x.get(2))); return a; }
            case "nextMonth1": return t(nextMonth1(S(get(i, "day"))));
            default: throw new IllegalArgumentException("알 수 없는 fn: " + fn);
        }
    }
}
