package egovframework.didisam.fac.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdWeb;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** v40 시설 · 장비 예약 계산 — Node service/server/fac/calc.js를 그대로 옮겼다(화면 didisam/fac-core.js와 같은 규칙).
 *  기준값 tests/fac-vectors.json을 service-egov/test/FacVectors.java로 대조한다. 금액은 원 정수, 할인 · 수수료 · 환불은 10원 미만 내림. 시각은 epoch ms, 날짜는 KST. */
public final class DdFac {
    private DdFac() { }
    public static final ZoneOffset KST = ZoneOffset.ofHours(9);
    public static final List<String> AUDS = List.of("student", "staff", "public");
    static final Pattern DAY_RE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$"), HM = Pattern.compile("^(\\d{1,2}):(\\d{2})$");

    static ObjectNode obj() { return DdWeb.JSON.createObjectNode(); }
    static boolean nul(JsonNode v) { return v == null || v.isNull() || v.isMissingNode(); }
    static String txt(JsonNode o, String k) { JsonNode v = o == null ? null : o.get(k); return nul(v) ? "" : v.asText(""); }
    /** JS +x (숫자 아님 → NaN, null/"" → 0) */
    static double plus(JsonNode v) { if (v == null || v.isMissingNode()) return Double.NaN; if (v.isNull()) return 0; if (v.isNumber()) return v.asDouble(); if (v.isBoolean()) return v.asBoolean() ? 1 : 0; String s = v.asText().trim(); if (s.isEmpty()) return 0; try { return Double.parseDouble(s); } catch (NumberFormatException e) { return Double.NaN; } }
    static double plusOr(JsonNode v, double d) { double x = plus(v); return Double.isNaN(x) || x == 0 ? d : x; } /* +x || d */
    static long jsRound(double v) { return (long) Math.floor(v + 0.5); }
    public static long floor10(double n) { return (long) (Math.floor(Math.max(0, n) / 10) * 10); }
    public static long ms(String iso) { return OffsetDateTime.parse(iso).toInstant().toEpochMilli(); }
    public static String kstDay(long t) { return Instant.ofEpochMilli(t).atOffset(KST).toLocalDate().toString(); }
    public static int kstMin(long t) { OffsetDateTime d = Instant.ofEpochMilli(t).atOffset(KST); return d.getHour() * 60 + d.getMinute(); }
    public static long dayMs(String day) { return LocalDate.parse(day).atStartOfDay().toInstant(KST).toEpochMilli(); }
    public static String addDays(String day, long n) { return LocalDate.parse(day).plusDays(n).toString(); }
    public static long diffDays(String a, String b) { return ChronoUnit.DAYS.between(LocalDate.parse(a), LocalDate.parse(b)); }
    static int dow(String day) { return LocalDate.parse(day).getDayOfWeek().getValue() % 7; }
    public static String hm(int m) { return String.format("%02d:%02d", m / 60, m % 60); }
    static Integer toMin(JsonNode v) { if (nul(v)) return null; Matcher m = HM.matcher(v.asText()); return m.matches() ? Integer.parseInt(m.group(1)) * 60 + Integer.parseInt(m.group(2)) : null; }
    public static String isoKst(long t) { return Instant.ofEpochMilli(t).atOffset(KST).toLocalDateTime().truncatedTo(ChronoUnit.MINUTES).toString().substring(0, 16) + "+09:00"; }
    static String won(long n) { return String.format(Locale.KOREA, "%,d원", n); }

    /** 그날 운영 시간 [열림분, 닫힘분] 또는 null(휴무) */
    public static int[] hoursOf(JsonNode fac, String day) {
        if (day == null || !DAY_RE.matcher(day).matches()) return null;
        JsonNode H = fac == null ? null : fac.get("hours"); if (H == null || !H.isObject()) H = obj();
        JsonNode h = H.has(String.valueOf(dow(day))) ? H.get(String.valueOf(dow(day))) : H.get("all");
        if (h == null || !h.isArray() || h.size() < 2) return null; Integer a = toMin(h.get(0)), b = toMin(h.get(1));
        return a == null || b == null || b <= a ? null : new int[]{ a, b };
    }
    public static int slotMinOf(JsonNode fac) { double v = plusOr(fac == null ? null : fac.get("slotMin"), 60); return (int) Math.max(5, Math.min(240, v)); }
    /** 그날 칸 목록 [{slot, from, to}] */
    public static List<ObjectNode> slotsOf(JsonNode fac, String day) {
        List<ObjectNode> out = new ArrayList<>(); int[] h = hoursOf(fac, day); if (h == null) return out; int s = slotMinOf(fac);
        for (int i = 0, m = h[0]; m + s <= h[1]; i++, m += s) { ObjectNode o = obj(); o.put("slot", i); o.put("from", hm(m)); o.put("to", hm(m + s)); out.add(o); }
        return out;
    }
    /** 칸의 시작 · 종료 시각(epoch ms) 또는 null */
    public static long[] slotTime(JsonNode fac, String day, int startSlot, int slots) {
        int[] h = hoursOf(fac, day); if (h == null) return null; int s = slotMinOf(fac); long a = dayMs(day) + (h[0] + (long) startSlot * s) * 60_000L; return new long[]{ a, a + (long) slots * s * 60_000L };
    }
    /** 휴관 판정 → null(열림) 또는 사유 */
    public static String closedOn(JsonNode fac, String day) {
        if (hoursOf(fac, day) == null) return "운영하지 않는 날이에요.";
        JsonNode C = fac.get("closed");
        if (C != null && C.isArray()) for (JsonNode c : C) {
            if (nul(c) || !DAY_RE.matcher(txt(c, "from")).matches()) continue; String from = txt(c, "from"), to = DAY_RE.matcher(txt(c, "to")).matches() ? txt(c, "to") : from;
            boolean hit = "weekly".equals(txt(c, "repeat")) ? day.compareTo(from) >= 0 && dow(day) == dow(from) && (txt(c, "until").isEmpty() || day.compareTo(txt(c, "until")) <= 0) : day.compareTo(from) >= 0 && day.compareTo(to) <= 0;
            if (hit) return txt(c, "reason").isEmpty() ? "휴관일이에요." : txt(c, "reason");
        }
        return null;
    }
    /** 오픈 판정 → {ok:true, lastDay?} | {ok:false, code: date|past|window|not_open|closed, opensAt?, reason?} */
    public static ObjectNode openState(JsonNode fac, String day, long now) {
        ObjectNode o = obj();
        if (day == null || !DAY_RE.matcher(day).matches()) return o.put("ok", false).put("code", "date");
        String today = kstDay(now); if (day.compareTo(today) < 0) return o.put("ok", false).put("code", "past");
        List<JsonNode> W = new ArrayList<>(); JsonNode ws = fac.get("windows");
        if (ws != null && ws.isArray()) for (JsonNode w : ws) if (!nul(w) && DAY_RE.matcher(txt(w, "from")).matches() && DAY_RE.matcher(txt(w, "to")).matches()) W.add(w);
        if (!W.isEmpty() && W.stream().noneMatch(w -> today.compareTo(txt(w, "from")) >= 0 && today.compareTo(txt(w, "to")) <= 0)) {
            o.put("ok", false).put("code", "window"); W.stream().filter(w -> txt(w, "from").compareTo(today) > 0).map(w -> txt(w, "from")).sorted().findFirst().ifPresent(f -> o.put("opensAt", f + "T00:00+09:00")); return o;
        }
        JsonNode op = fac.get("open"); String lastDay = null; JsonNode da = op == null ? null : op.get("daysAhead");
        if (!nul(da) && plus(da) >= 0) {
            Integer at0 = toMin(op.get("at")); int at = at0 == null ? 0 : at0; long n = (long) Math.floor(plus(da)); lastDay = addDays(today, kstMin(now) >= at ? n : n - 1);
            if (day.compareTo(lastDay) > 0) return o.put("ok", false).put("code", "not_open").put("opensAt", addDays(day, -n) + "T" + hm(at) + "+09:00");
        }
        String c = closedOn(fac, day); if (c != null) return o.put("ok", false).put("code", "closed").put("reason", c);
        o.put("ok", true); if (lastDay != null) o.put("lastDay", lastDay); return o;
    }
    public static boolean needVerifyOf(JsonNode fac, String aud) { String v = txt(fac, "verify"); return fac != null && !v.isEmpty() && !"none".equals(v) && ("student".equals(aud) || "staff".equals(aud)); }

    /** 견적 → {list, off, final, deposit, lines, needVerify, pay, approval} | {error} */
    public static ObjectNode quote(JsonNode fac, String aud, String day, double startSlot, double slots, JsonNode product) {
        ObjectNode o = obj(); if (fac == null) return o.put("error", "fac");
        JsonNode au = fac.get("audience"); boolean audOk = AUDS.contains(aud);
        if (audOk && au != null && au.isArray() && au.size() > 0) { audOk = false; for (JsonNode x : au) if (aud.equals(x.asText())) audOk = true; }
        if (!audOk) return o.put("error", "aud");
        String pay = txt(fac, "pay").isEmpty() ? "free" : txt(fac, "pay"); boolean approval = fac.has("approval") && truthy(fac.get("approval")), nv = needVerifyOf(fac, aud);
        ArrayNode lines = DdWeb.JSON.createArrayNode(); long list, fin, off, deposit = 0;
        if (product != null && !product.isNull()) {
            JsonNode P = product.path("prices").get(aud); long days = Math.max(0, jsRound(plusOr(product.get("days"), 0))); JsonNode U = product.path("unitPrice").get(aud);
            Long l = null; if (!nul(P) && !(P.isTextual() && P.asText().isEmpty())) l = Math.max(0, jsRound(plus(P))); else if (!nul(U)) l = Math.max(0, jsRound(days * plus(U)));
            if (l == null) return o.put("error", "price"); list = l;
            double rate = Math.max(0, Math.min(100, plusOr(product.get("discountRate"), 0)));
            fin = "free".equals(pay) ? 0 : rate != 0 ? floor10(list * (100 - rate) / 100) : list; off = "free".equals(pay) ? list : list - fin;
            deposit = "rent".equals(txt(product, "type")) ? Math.max(0, jsRound(plusOr(product.get("deposit"), 0))) : 0;
            lines.add(obj().put("label", txt(product, "name").isEmpty() ? "이용권" : txt(product, "name")).put("amount", list));
            if (off != 0) lines.add(obj().put("label", "free".equals(pay) ? "무료 이용" : "할인 " + num(rate) + "%").put("amount", -off));
            if (deposit != 0) lines.add(obj().put("label", "보증금(반납 시 돌려받아요)").put("amount", deposit));
        } else {
            long n = jsRound(Double.isNaN(slots) ? 0 : slots); double s0d = Math.floor(startSlot + 0.5); double mn = Math.max(1, plusOr(fac.get("minSlots"), 1)), mx = Math.max(mn, plusOr(fac.get("maxSlots"), 1));
            if (!(n >= mn && n <= mx)) return o.put("error", "slots");
            List<ObjectNode> S = slotsOf(fac, day); if (Double.isNaN(s0d) || s0d < 0 || s0d + n > S.size()) return o.put("error", "slot"); int s0 = (int) s0d;
            long unit = Math.max(0, jsRound(plusOr(fac.path("prices").path(aud).get("slot"), 0))); list = unit * n; fin = "free".equals(pay) ? 0 : list; off = list - fin;
            lines.add(obj().put("label", S.get(s0).get("from").asText() + "~" + S.get(s0 + (int) n - 1).get("to").asText() + " " + n + "칸 × " + won(unit)).put("amount", list));
            if (off != 0) lines.add(obj().put("label", "무료 이용").put("amount", -off));
        }
        o.put("list", list).put("off", off).put("final", fin).put("deposit", deposit); o.set("lines", lines); o.put("needVerify", nv).put("pay", pay).put("approval", approval); return o;
    }
    static boolean truthy(JsonNode v) { return !nul(v) && (v.isBoolean() ? v.asBoolean() : v.isNumber() ? v.asDouble() != 0 : !v.isTextual() || !v.asText().isEmpty()); }
    static String num(double d) { return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d); }

    /** 이용권 기간: 결제일 포함 days일, 유효한 같은 상품이 있으면 그 만료일 다음 날부터 → {kind, startsOn, endsOn, total} */
    public static ObjectNode passPeriod(JsonNode product, String today, String prevEnd) {
        String start = prevEnd != null && prevEnd.compareTo(today) >= 0 ? addDays(prevEnd, 1) : today; String t = txt(product, "type");
        String kind = "pass-count".equals(t) ? "count" : "pass-course".equals(t) ? "course" : "period";
        long days = Math.max(1, jsRound("count".equals(kind) ? plusOr(product.get("expireDays"), 365) : plusOr(product.get("days"), 30)));
        return obj().put("kind", kind).put("startsOn", start).put("endsOn", addDays(start, days - 1)).put("total", "count".equals(kind) ? Math.max(1, jsRound(plusOr(product.get("count"), 1))) : days);
    }

    /** 환불 → {auto, lines, rate?}. in: rule, paid, used, startAt, now, deposit, lateFee, deductions */
    public static ObjectNode refund(JsonNode in) {
        JsonNode R = in.get("rule"); if (R == null || !R.isObject()) R = obj(); long p = Math.max(0, jsRound(plusOr(in.get("paid"), 0))); ArrayNode lines = DdWeb.JSON.createArrayNode(); ObjectNode o = obj(); String type = txt(R, "type");
        if ("time".equals(type)) {
            double h = (tms(in.get("startAt")) - tms(in.get("now"))) / 3_600_000.0; JsonNode steps = R.get("steps");
            if (steps == null || !steps.isArray() || steps.size() == 0) steps = DdWeb.JSON.createArrayNode().add(obj().put("beforeH", 24).put("rate", 100)).add(obj().put("rate", 0));
            if (h <= 0) { lines.add(obj().put("label", "이용 시작 후에는 환불되지 않아요").put("amount", 0)); o.put("auto", 0).put("rate", 0); o.set("lines", lines); return o; }
            JsonNode st = null; for (JsonNode x : steps) if (!nul(x) && (nul(x.get("beforeH")) || h >= plus(x.get("beforeH")))) { st = x; break; }
            double rate = Math.max(0, Math.min(100, st == null ? 0 : plusOr(st.get("rate"), 0))); long auto = rate == 100 ? p : floor10(p * rate / 100);
            lines.add(obj().put("label", "결제액").put("amount", p));
            lines.add(obj().put("label", st == null || nul(st.get("beforeH")) ? "시작 전 그 밖의 구간: " + num(rate) + "% 환불" : "시작 " + st.get("beforeH").asText() + "시간 전까지: " + num(rate) + "% 환불").put("amount", auto - p));
            o.put("auto", auto); if (rate == Math.floor(rate)) o.put("rate", (long) rate); else o.put("rate", rate); o.set("lines", lines); return o;
        }
        if ("pass-period".equals(type) || "pass-count".equals(type)) {
            long n = Math.max(0, jsRound(plusOr(in.get("used"), 0))), unit = Math.max(0, jsRound(plusOr(R.get("unitPrice"), 0)));
            double feeRate = nul(R.get("feeRate")) ? 10 : plus(R.get("feeRate")); long fee = floor10(p * Math.max(0, feeRate) / 100);
            JsonNode tiers = R.get("tiers"); List<JsonNode> T = new ArrayList<>();
            if (tiers != null && tiers.isArray() && tiers.size() > 0) tiers.forEach(T::add);
            else if ("pass-period".equals(type)) for (int[] x : new int[][]{ { 0, 0 }, { 5, 5 }, { 10, 10 } }) T.add(obj().put("max", x[0]).put("deduct", x[1]));
            long deduct;
            if (!T.isEmpty()) {
                T.sort((a, b) -> Double.compare(plus(a.get("max")), plus(b.get("max")))); JsonNode t = null; for (JsonNode x : T) if (n <= plus(x.get("max"))) { t = x; break; }
                if (t == null) { lines.add(obj().put("label", "결제액").put("amount", p)); lines.add(obj().put("label", n + "회 이용: 환불 없음").put("amount", -p)); o.put("auto", 0); o.set("lines", lines); return o; }
                deduct = (long) plusOr(t.get("deduct"), 0);
            } else deduct = n;
            long auto = floor10(p - unit * deduct - fee);
            lines.add(obj().put("label", "결제액").put("amount", p)); if (deduct != 0) lines.add(obj().put("label", "이용 " + n + "회: 일일권 " + won(unit) + " × " + deduct + "회").put("amount", -unit * deduct));
            lines.add(obj().put("label", "수수료 " + num(feeRate) + "%").put("amount", -fee)); o.put("auto", auto); o.set("lines", lines); return o;
        }
        if ("rent".equals(type)) {
            long d = Math.max(0, jsRound(plusOr(in.get("deposit"), 0))), lf = Math.max(0, jsRound(plusOr(in.get("lateFee"), 0))), dd = Math.max(0, jsRound(plusOr(in.get("deductions"), 0)));
            lines.add(obj().put("label", "보증금").put("amount", d)); if (lf != 0) lines.add(obj().put("label", "연체료").put("amount", -lf)); if (dd != 0) lines.add(obj().put("label", "파손 · 분실 차감").put("amount", -dd));
            o.put("auto", Math.max(0, d - lf - dd)); o.set("lines", lines); return o;
        }
        lines.add(obj().put("label", "결제액(전액 환불)").put("amount", p)); o.put("auto", p); o.set("lines", lines); return o;
    }
    static long tms(JsonNode v) { return v != null && v.isNumber() ? v.asLong() : ms(v.asText()); }

    /** 연체료 = min(cap, 연체일 × 일 연체료) → [days, fee] */
    public static long[] lateFee(String dueDay, String returnDay, double perDay, Double cap) {
        long d = Math.max(0, diffDays(dueDay, returnDay)); long f = d * Math.max(0, jsRound(Double.isNaN(perDay) ? 0 : perDay));
        return new long[]{ d, cap != null && cap > 0 ? Math.min(cap.longValue(), f) : f };
    }
    /** 노쇼: 확정 예약이 시작 후 noShowMin분(기본 15, 0이면 끔) 안에 입장하지 않으면 */
    public static boolean isNoShow(String status, boolean checkedIn, long startAt, Double noShowMin, long now) {
        if (!"confirmed".equals(status) || checkedIn) return false; double m = noShowMin == null ? 15 : noShowMin; if (!(m > 0)) return false; return now >= startAt + m * 60_000;
    }
    /** 예약 정지(결정 3) → {suspended, until, count} */
    public static ObjectNode suspension(List<String> noShowDays, double strikes, double days, String today) {
        double k = Math.max(1, Double.isNaN(strikes) || strikes == 0 ? 3 : strikes), D = Math.max(1, Double.isNaN(days) || days == 0 ? 30 : days); int n = 0; String until = null;
        List<String> l = new ArrayList<>(); for (String x : noShowDays) if (x != null && DAY_RE.matcher(x).matches()) l.add(x); l.sort(null);
        for (String d : l) { if (until != null && d.compareTo(until) <= 0) continue; n++; if (n >= k) { until = addDays(d, (long) D - 1); n = 0; } }
        ObjectNode o = obj(); o.put("suspended", until != null && today.compareTo(until) <= 0); if (until == null) o.putNull("until"); else o.put("until", until); o.put("count", n); return o;
    }
    /** 동일인 중복: 같은 sid · 날 · 묶음에서 칸이 겹치면 true */
    public static boolean dupSame(JsonNode existing, JsonNode req) {
        double a0 = plus(req.get("startSlot")), a1 = a0 + plus(req.get("slots"));
        if (existing != null && existing.isArray()) for (JsonNode b : existing) if (!nul(b) && txt(b, "sid").equals(txt(req, "sid")) && txt(b, "day").equals(txt(req, "day")) && txt(b, "group").equals(txt(req, "group"))
                && plus(b.get("startSlot")) < a1 && a0 < plus(b.get("startSlot")) + plus(b.get("slots"))) return true;
        return false;
    }
    public static JsonNode product(JsonNode products, String id) {
        if (products != null && products.isArray()) for (JsonNode p : products) if (id.equals(txt(p, "id"))) return p;
        if (products != null && products.isObject()) for (JsonNode p : products) if (id.equals(txt(p, "id"))) return p;
        return null;
    }

    // ── FacServiceImpl용 얇은 연결(같은 계산을 다른 모양으로) ──
    public static final class CalcError extends RuntimeException { public final String code; public CalcError(String code, String msg) { super(msg); this.code = code; } }
    static final java.util.Map<String, String> MSG = java.util.Map.of("fac", "없는 시설입니다.", "aud", "이 시설을 이용할 수 없는 신청자 구분이에요.", "slots", "선택할 수 있는 시간 칸 수가 아니에요.", "slot", "운영 시간 안의 시간 칸을 골라 주세요.", "price", "이 구분의 요금이 정해지지 않았어요.");
    /** 견적(상품 id) — 오류는 CalcError */
    public static java.util.Map<String, Object> quote(JsonNode fac, JsonNode products, String aud, String day, int slot, int slots, String productId) {
        JsonNode p = null; if (productId != null && !productId.isEmpty()) { p = product(products, productId); if (p == null || (!txt(p, "fac").isEmpty() && !txt(p, "fac").equals(txt(fac, "id")))) throw new CalcError("product", "없는 이용권 · 대여 상품이에요."); }
        ObjectNode o = quote(fac, aud, day, slot, slots, p); if (o.has("error")) { String c = o.get("error").asText(); throw new CalcError(c, MSG.getOrDefault(c, "요청 값이 올바르지 않습니다.")); }
        return DdWeb.JSON.convertValue(o, java.util.LinkedHashMap.class);
    }
    /** 오픈 판정 → {ok} | {ok:false, reason: past|not_open|closed|date, opensAt?} (window는 not_open) */
    public static java.util.Map<String, Object> isOpen(JsonNode fac, String day, Instant now) {
        ObjectNode o = openState(fac, day, now.toEpochMilli()); java.util.Map<String, Object> r = new java.util.LinkedHashMap<>(); r.put("ok", o.get("ok").asBoolean());
        if (o.has("code")) r.put("reason", "window".equals(o.get("code").asText()) ? "not_open" : o.get("code").asText()); if (o.has("opensAt")) r.put("opensAt", o.get("opensAt").asText()); return r;
    }
    public static int[] hoursOn(JsonNode fac, LocalDate d) { int[] h = hoursOf(fac, d.toString()); return h == null ? new int[]{ 0, 0 } : h; }
    public static Instant slotStart(JsonNode fac, String day, int slot) { int[] h = hoursOn(fac, LocalDate.parse(day)); return Instant.ofEpochMilli(dayMs(day) + (h[0] + (long) slot * slotMinOf(fac)) * 60_000L); }
    public static java.util.Map<String, Object> ban(List<String> days, int strikes, int banDays, String today) { ObjectNode o = suspension(days, strikes, banDays, today); java.util.Map<String, Object> r = new java.util.LinkedHashMap<>(); r.put("banned", o.get("suspended").asBoolean()); r.put("until", o.get("until").isNull() ? null : o.get("until").asText()); return r; }
    public static boolean noShow(Instant start, Instant now, int min, boolean checkedIn) { return isNoShow("confirmed", checkedIn, start.toEpochMilli(), (double) min, now.toEpochMilli()); }
}
