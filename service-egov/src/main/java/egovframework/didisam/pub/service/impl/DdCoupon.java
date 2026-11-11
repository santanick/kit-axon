package egovframework.didisam.pub.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

/** v38 A-17 쿠폰 · 할인 코드 계산 — Node service/server/coupon.js · 학습자 화면 didisam/coupon.js와 같은 규칙.
 *  코드는 대문자 · 공백 제거(20자), 정률은 10원 단위 내림, 정액은 결제 금액까지만. 사용 횟수는 그 코드가 담긴 pay 이벤트 수. */
public final class DdCoupon {
    private DdCoupon() { }
    public static String norm(String s) { String x = s == null ? "" : s.toUpperCase().replaceAll("\\s+", ""); return x.length() > 20 ? x.substring(0, 20) : x; }
    public static String kstDay() { return LocalDate.now(ZoneId.of("Asia/Seoul")).toString(); }
    private static String txt(JsonNode o, String k) { JsonNode v = o == null ? null : o.get(k); return v == null || v.isNull() ? "" : v.asText(""); }
    private static double num(JsonNode o, String k) { JsonNode v = o == null ? null : o.get(k); if (v == null || v.isNull()) return 0; if (v.isNumber()) return v.asDouble(); try { return Double.parseDouble(v.asText("0")); } catch (NumberFormatException e) { return 0; } }
    private static boolean on(JsonNode o, String k) { JsonNode v = o == null ? null : o.get(k); return v != null && (v.isBoolean() ? v.asBoolean() : v.isTextual() ? !v.asText().isEmpty() : v.isNumber() && v.asDouble() != 0); }
    private static long jsRound(double v) { return (long) Math.floor(v + 0.5); }
    /** 게시본 강좌의 판매가(할인 · 얼리버드) — lshop.js priceOf와 같다 */
    public static long priceOf(JsonNode x, String day) {
        if (x == null) return 0; double p = num(x, "price"); JsonNode d = x.get("discount");
        if (d != null && on(d, "on") && (txt(d, "until").isEmpty() || day.compareTo(txt(d, "until")) <= 0)) p -= "amount".equals(txt(d, "type")) ? num(d, "v") : jsRound(p * num(d, "v") / 100);
        JsonNode r = x.get("recruit"); JsonNode e = r == null ? null : r.get("early");
        if (e != null && on(e, "on") && (txt(e, "until").isEmpty() || day.compareTo(txt(e, "until")) <= 0)) p -= jsRound(p * num(e, "rate") / 100);
        return Math.max(0, jsRound(p));
    }
    private static Map<String, Object> no(String msg) { Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", false); o.put("msg", msg); return o; }
    public static Map<String, Object> calc(JsonNode list, String code, String cls, long price, long used, String day) {
        String k = norm(code); if (k.isEmpty()) return no("쿠폰 코드를 입력해 주세요.");
        JsonNode c = null; if (list != null && list.isArray()) for (JsonNode x : list) { if (x != null && x.isObject() && norm(txt(x, "code")).equals(k) && !(x.has("on") && x.get("on").isBoolean() && !x.get("on").asBoolean())) { c = x; break; } }
        if (c == null) return no("없는 쿠폰 코드예요. 코드를 다시 확인해 주세요.");
        String from = txt(c, "from"), until = txt(c, "until");
        if (!from.isEmpty() && day.compareTo(from) < 0) return no(from + "부터 쓸 수 있는 쿠폰이에요.");
        if (!until.isEmpty() && day.compareTo(until) > 0) return no("사용 기한이 지난 쿠폰이에요.");
        JsonNode cl = c.get("cls"); if (cl != null && cl.isArray() && cl.size() > 0) { boolean hit = false; for (JsonNode y : cl) if (cls.equals(y.asText())) hit = true; if (!hit) return no("이 강좌에는 쓸 수 없는 쿠폰이에요."); }
        double max = num(c, "max"); if (max > 0 && used >= max) return no("사용 횟수가 모두 끝난 쿠폰이에요.");
        long p = Math.max(0, price); if (p == 0) return no("결제 금액이 없는 강좌에는 쓸 수 없어요.");
        double v = Math.max(0, num(c, "v")); boolean amt = "amount".equals(txt(c, "type"));
        long off = amt ? Math.min(p, jsRound(v)) : Math.min(p, (long) Math.floor(p * Math.min(100, v) / 100 / 10) * 10);
        if (off == 0) return no("할인 금액이 0원인 쿠폰이에요.");
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("code", k); o.put("off", off); o.put("final", p - off);
        o.put("label", amt ? String.format("%,d원 할인", off) : (Math.min(100, v) == Math.floor(Math.min(100, v)) ? String.valueOf((long) Math.min(100, v)) : String.valueOf(Math.min(100, v))) + "% 할인"); return o;
    }
}
