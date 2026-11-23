package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;

/**
 * v47 AI 사용량 요금표 — Node service/server/aiprice.js와 같은 값 · 같은 규칙.
 * 추가 토큰 가격 = 원가 단가 × 2.5, 부가세 별도(결제 금액 = 공급가 + 부가세 10%).
 * 기관 설정 doc.aiplan = { monthTokens, overage: 'block'|'pack' } — 없으면(기존 기관) 월 한도 없음(동작 불변).
 */
public final class DdAiPrice {
    private DdAiPrice() { }
    /** 확인 필요: 100만 토큰당 원가(원, 입력 · 출력 혼합 평균) — 자리값. 실제 모델 단가 · 환율 확정 후 바꿉니다(aiprice.js와 함께). */
    public static final long COST_KRW_PER_M = 7500;
    public static final double MARKUP = 2.5, VAT = 0.1;
    /** 확인 필요: 구독료에 포함되는 기본 월 토큰(자리값) */
    public static final long MONTH_DEFAULT = 2000000;
    public static final List<Long> TIERS = List.of(1000000L, 2000000L, 5000000L, 10000000L, 20000000L, 50000000L);
    public record Pack(String id, long tokens, String name) { }
    public static final List<Pack> PACKS = List.of(new Pack("p1m", 1000000, "100만 토큰"), new Pack("p5m", 5000000, "500만 토큰"), new Pack("p20m", 20000000, "2,000만 토큰"));
    public static final String MSG_LEARNER = "이번 달 AI 사용량을 다 썼어요. 선생님께 질문을 넘겨 주세요";
    public static final String MSG_STAFF = "이번 달 AI 사용량(포함량 + 추가 충전량)을 모두 썼습니다. 설정 → AI 사용량에서 추가 충전하십시오.";

    static long jsRound(double d) { return (long) Math.floor(d + 0.5); }
    /** {공급가, 부가세, 합계} — 공급가는 100원 단위 반올림 */
    public static long[] price(long tokens) { long supply = jsRound(tokens / 1e6 * COST_KRW_PER_M * MARKUP / 100) * 100; long vat = jsRound(supply * VAT); return new long[]{ supply, vat, supply + vat }; }
    public static Map<String, Object> packMap(Pack p) { long[] pr = price(p.tokens()); Map<String, Object> m = new LinkedHashMap<>(); m.put("id", p.id()); m.put("tokens", p.tokens()); m.put("name", p.name()); m.put("supply", pr[0]); m.put("vat", pr[1]); m.put("total", pr[2]); return m; }
    public static List<Map<String, Object>> packs() { List<Map<String, Object>> o = new ArrayList<>(); for (Pack p : PACKS) o.add(packMap(p)); return o; }
    public static Pack packOf(JsonNode id) { if (id == null || !id.isTextual()) return null; for (Pack p : PACKS) if (p.id().equals(id.asText())) return p; return null; }

    /** 기관 설정 정규화(on은 aiplan이 있고 monthTokens가 양수일 때만) */
    public static Map<String, Object> planOf(JsonNode raw) {
        JsonNode p = raw != null && raw.isObject() ? raw : null; double mt = p == null ? Double.NaN : DdAiGateway.jsNum(p.get("monthTokens"));
        if (p != null && p.get("monthTokens") == null) mt = Double.NaN;
        boolean on = p != null && Double.isFinite(mt) && mt > 0;
        Map<String, Object> m = new LinkedHashMap<>(); m.put("on", on); m.put("monthTokens", on && TIERS.contains(jsRound(mt)) ? jsRound(mt) : MONTH_DEFAULT);
        m.put("overage", p != null && "block".equals(DdAiGateway.s(p.get("overage"))) ? "block" : "pack"); return m;
    }
    /** 비교용 열쇠(jsonb는 키 순서를 바꾸므로 값만 비교) */
    public static String planKey(JsonNode raw) {
        if (raw == null || !raw.isObject()) return ""; double mt = raw.get("monthTokens") == null ? 0 : DdAiGateway.jsNum(raw.get("monthTokens")); String ov = DdAiGateway.s(raw.get("overage"));
        return (Double.isFinite(mt) ? jsRound(mt) : 0) + "|" + ("block".equals(ov) || "pack".equals(ov) ? ov : "");
    }
    public static boolean validPlan(JsonNode raw) {
        if (raw == null || raw.isNull() || raw.isMissingNode()) return true; if (!raw.isObject()) return false;
        JsonNode mt = raw.get("monthTokens"), ov = raw.get("overage");
        if (mt != null && !mt.isNull()) { double d = DdAiGateway.jsNum(mt); if (!(Double.isFinite(d) && d == Math.rint(d) && TIERS.contains((long) d))) return false; }
        return ov == null || ov.isNull() || (ov.isTextual() && ("block".equals(ov.asText()) || "pack".equals(ov.asText())));
    }
    /** 이달 상태(80% 주의 · 100% 초과, 포함량을 넘으면 충전량에서 빠짐) */
    public static Map<String, Object> stateOf(Map<String, Object> plan, String month, long used, long credit) {
        long included = ((Number) plan.get("monthTokens")).longValue(); long limit = included + credit;
        long pct = limit > 0 ? (long) Math.floor(used * 100.0 / limit) : 0; long creditLeft = Math.max(0, Math.min(credit, limit - Math.max(used, included)));
        Map<String, Object> m = new LinkedHashMap<>(); m.put("month", month); m.put("used", used); m.put("included", included); m.put("credit", credit); m.put("creditLeft", creditLeft);
        m.put("remaining", Math.max(0, limit - used)); m.put("pct", pct); m.put("state", !Boolean.TRUE.equals(plan.get("on")) ? "off" : pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok"); return m;
    }
    public static String monthOf(String today) { return today.substring(0, 7); }
    /** 차단(429 ai_month_quota): 포함량 + 이달 충전량을 다 썼을 때 */
    public static void guard(Map<String, Object> plan, long used, long credit, boolean learner) {
        if (!Boolean.TRUE.equals(plan.get("on"))) return; long lim = ((Number) plan.get("monthTokens")).longValue() + credit;
        if (used >= lim) throw new DdException(429, learner ? MSG_LEARNER : MSG_STAFF, "ai_month_quota");
    }
}
