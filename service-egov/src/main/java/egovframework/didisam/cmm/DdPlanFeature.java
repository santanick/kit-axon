package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * v47 요금제 기능 묶음 — 서버 판정(Node service/server/planfeat.js와 같은 규칙). 화면 표 원천: didisam/plan.js PLAN_TABLE.
 * 기관 문서 doc.plan = { code, tier, contract, aiMonthTokens, since }. plan 없는 기관 · 정책(aipol) 꺼진 기관은 판정하지 않는다.
 * 요금제 밖 AI 레벨(Standard L2 이상 · Pro L3) · 기능(grade · vision = Pro부터)은 dd.403.plan_feature.
 */
public final class DdPlanFeature {
    private DdPlanFeature() { }
    public static final List<String> TIERS = List.of("standard", "pro", "enterprise");
    public static final Map<String, String> NAME = Map.of("standard", "Standard", "pro", "Pro", "enterprise", "Enterprise");
    public static final Map<String, String> CODE_TIER = Map.ofEntries(
        Map.entry("E1", "standard"), Map.entry("A1", "standard"), Map.entry("U0", "standard"), Map.entry("G1", "standard"),
        Map.entry("E2", "pro"), Map.entry("A2", "pro"), Map.entry("U1", "pro"), Map.entry("U2", "pro"), Map.entry("G2", "pro"),
        Map.entry("E3", "enterprise"), Map.entry("E4", "enterprise"), Map.entry("A3", "enterprise"), Map.entry("A4", "enterprise"),
        Map.entry("U3", "enterprise"), Map.entry("U4", "enterprise"), Map.entry("G3", "enterprise"), Map.entry("G4", "enterprise"), Map.entry("TRIAL", "pro"));
    public static final Map<String, String> MAX_LV = Map.of("standard", "L1", "pro", "L2", "enterprise", "L3");
    public static final Map<String, String> FEAT_MIN = Map.of("grade", "pro", "vision", "pro");
    public static final int TRIAL_DAYS = 14;
    public static final String E_PLAN = "dd.403.plan_feature", E_PLAN_LEARNER = "dd.403.plan_feature.tutor";
    static final List<String> LV = List.of("L0", "L1", "L2", "L3");
    static final Pattern YMD = Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})");

    static String s(JsonNode v) { return v != null && v.isTextual() ? v.asText() : ""; }
    static LocalDate day(String s) { Matcher m = YMD.matcher(s == null ? "" : s); if (!m.find()) return null; try { return LocalDate.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3))); } catch (Exception e) { return null; } }
    static int rank(String t) { return Math.max(0, TIERS.indexOf(t)); }

    /** 단계(standard|pro|enterprise). plan 없으면 null */
    public static String tierOf(JsonNode plan, String today) {
        if (plan == null || !plan.isObject()) return null;
        String code = s(plan.get("code")).toUpperCase(); String t = s(plan.get("tier")).toLowerCase();
        if ("TRIAL".equals(code)) { LocalDate sd = day(s(plan.get("since"))), td = day(today);
            long left = sd != null && td != null ? TRIAL_DAYS - ChronoUnit.DAYS.between(sd, td) : TRIAL_DAYS; return left > 0 ? "pro" : "standard"; }
        return TIERS.contains(t) ? t : CODE_TIER.getOrDefault(code, "enterprise");
    }
    /** 통과면 null, 막히면 필요한 단계 이름(Pro · Enterprise) */
    public static String check(JsonNode plan, boolean polOn, String lvl, String feature, String today) {
        if (!polOn) return null; String tier = tierOf(plan, today); if (tier == null) return null;
        if (lvl != null && LV.contains(lvl) && LV.indexOf(lvl) > LV.indexOf(MAX_LV.get(tier))) {
            for (String x : TIERS) if (LV.indexOf(MAX_LV.get(x)) >= LV.indexOf(lvl)) return NAME.get(x); }
        String f = feature == null ? null : FEAT_MIN.get(feature); if (f != null && rank(tier) < rank(f)) return NAME.get(f);
        return null;
    }
}
