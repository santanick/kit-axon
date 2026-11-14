package egovframework.didisam.mileage.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import static egovframework.didisam.cmm.Js.*;

/** v42 화면 · 서버 공용 순수 값(didisam/milecalc.js의 DEFAULT_POLICY · RECOMMEND · warnings · TPL · templateKey · template · kst와 같은 결과).
 *  적립 · 사용 규칙 자체는 SQL 함수(mil_*)가 유일한 구현이고, 모의 계산(simulate)도 MileServiceImpl이 같은 SQL 함수를 임시 기관에서 돌려 만든다. */
public final class DdMileCalc {
    private DdMileCalc() { }
    static JsonNode J(String s) { return parse(s); }
    public static final JsonNode DEFAULT_POLICY = J("{\"on\":false,\"ver\":0,\"unitName\":\"P\",\"expiry\":{\"mode\":\"months\",\"months\":12},\"notice\":{\"monthsBefore\":6,\"daysBefore\":[30,3]},\"budget\":{},\"dailyCapTotal\":null,"
        + "\"streak\":{\"minMin\":10,\"freezePerWeek\":1,\"milestones\":[7,30,100]},\"cashLock\":{\"needTrust\":\"B\",\"achievementOnly\":true},\"sunset\":null,\"penalty\":{\"on\":false},\"grantCfg\":{\"approveOver\":1000},\"scope\":{\"mode\":\"unit\",\"hqPool\":false}}");
    public static final JsonNode RECOMMEND = J("{\"billPct\":30,\"expiryMonths\":12,\"dailyCapTotal\":500,\"noticeMonthsBefore\":6}");
    /** KST 날짜(YYYY-MM-DD) */
    public static String kst(Instant t) { return t.plusSeconds(9 * 3600).atOffset(ZoneOffset.UTC).toLocalDate().toString(); }
    public static String kst(String iso) { return kst(Instant.parse(iso)); }

    static ObjectNode w(String code, String msg) { return F.objectNode().put("code", code).put("msg", msg); }
    static boolean has(JsonNode o, String k) { return o != null && o.isObject() && o.has(k) && !o.get(k).isNull(); }
    /** 권장값 이탈 경고(D2 — 거절하지 않고 이유 한 줄) */
    public static ArrayNode warnings(JsonNode pol, List<JsonNode> rewards) {
        ArrayNode o = F.arrayNode(); JsonNode p = pol == null || pol.isNull() ? F.objectNode() : pol;
        JsonNode e = get(p, "expiry"); if (truthy(e) && strictEq(get(e, "mode"), "months") && num(get(e, "months")) < 6) o.add(w("expiry_short", "유효기간이 6개월보다 짧으면 학습자 불만이 생길 수 있습니다."));
        if (!nullish(get(p, "dailyCapTotal")) && num(get(p, "dailyCapTotal")) > 1000) o.add(w("day_cap_high", "1인 하루 총 상한이 권장값(500P)의 2배를 넘습니다."));
        JsonNode n = get(p, "notice"); if (truthy(n) && num(get(n, "monthsBefore")) == 0 && arr(get(n, "daysBefore")).isEmpty()) o.add(w("notice_off", "소멸 고지를 모두 끄면 분쟁이 생길 수 있습니다."));
        JsonNode b = get(p, "budget"); if (!truthy(b) || (nullish(get(b, "monthP")) && nullish(get(b, "termP")))) o.add(w("no_budget", "예산을 입력하지 않으면 과지급을 미리 막을 수 없습니다."));
        for (JsonNode r : rewards) { if (!strictEq(get(r, "kind"), "tuition")) continue; JsonNode mx = get(r, "maxUse");
            if (truthy(mx) && num(get(mx, "billPct")) > 30) o.add(w("bill_pct", "청구서의 30%를 넘는 차감은 매출 변동이 커질 수 있습니다(디디쌤 권장값 30%).").put("reward", S(get(r, "id"))));
            if (!truthy(mx) || nullish(get(mx, "billPct"))) o.add(w("bill_pct_unset", "차감 상한을 정하지 않으면 권장값 30%를 적용합니다.").put("reward", S(get(r, "id")))); }
        /* Node 순서: code, reward, msg — 키 순서는 응답 비교에 쓰지 않는다 */
        return o;
    }

    /* 기관 유형별 기본 템플릿 8종(03 5장) — milecalc.js TPL과 같은 값 */
    static final JsonNode TPL = J("{"
        + "\"k12\":{\"label\":\"학원(초중고)\",\"cap\":300,\"exp\":12,\"rules\":[[\"attend_day\",\"participation\",10,\"per_day\"],[\"lesson_done\",\"achievement\",20,\"per_src\",{\"day\":100}],[\"exam_score\",\"achievement\",{\"band\":[[80,50],[90,100]]}],[\"course_done\",\"achievement\",300]],\"rewards\":[[\"tuition\",\"학원비 차감\",{\"billPct\":30}],[\"goods\",\"학용품\"]]},"
        + "\"adult\":{\"label\":\"성인 학원\",\"cap\":500,\"exp\":12,\"rules\":[[\"attend_day\",\"participation\",10,\"per_day\"],[\"lesson_done\",\"achievement\",30,\"per_src\",{\"day\":150}],[\"exam_score\",\"achievement\",{\"band\":[[80,50],[90,100]]}],[\"course_done\",\"achievement\",500]],\"rewards\":[[\"coupon\",\"수강 할인 쿠폰\"],[\"tuition\",\"수강료 차감\",{\"billPct\":30}]]},"
        + "\"univ\":{\"label\":\"대학\",\"cap\":500,\"exp\":\"term_end\",\"rules\":[[\"noncredit_done\",\"achievement\",\"source\"],[\"evidence\",\"achievement\",30,\"per_src\",null,\"cert_lang\"],[\"survey_done\",\"participation\",5]],\"rewards\":[[\"badge\",\"역량 배지\"]]},"
        + "\"corp\":{\"label\":\"기업\",\"cap\":500,\"exp\":12,\"rules\":[[\"lesson_done\",\"achievement\",20,\"per_src\",{\"day\":100}],[\"course_done\",\"achievement\",300],[\"exam_score\",\"achievement\",{\"band\":[[80,50],[90,100]]}],[\"tube_goal\",\"participation\",10,\"per_day\"]],\"rewards\":[[\"shop\",\"리워드 숍\"],[\"badge\",\"학습 배지\"]]},"
        + "\"public\":{\"label\":\"공공\",\"cap\":300,\"exp\":12,\"rules\":[[\"lesson_done\",\"achievement\",10,\"per_src\",{\"day\":80}],[\"course_done\",\"achievement\",200]],\"rewards\":[[\"cert\",\"이수 인정서\"]]},"
        + "\"lifelong\":{\"label\":\"평생교육원\",\"cap\":300,\"exp\":12,\"rules\":[[\"attend_day\",\"participation\",10,\"per_day\"],[\"course_done\",\"achievement\",300],[\"review_ok\",\"achievement\",50]],\"rewards\":[[\"coupon\",\"다음 강좌 할인 쿠폰\"]]},"
        + "\"vocational\":{\"label\":\"직업훈련(국비)\",\"cap\":200,\"exp\":12,\"rules\":[[\"attend_day\",\"participation\",10,\"per_day\"],[\"lesson_done\",\"achievement\",10,\"per_src\",{\"day\":80}],[\"course_done\",\"achievement\",200]],\"rewards\":[[\"badge\",\"수료 배지\"]]},"
        + "\"franchise\":{\"label\":\"프랜차이즈(가맹점별)\",\"cap\":300,\"exp\":12,\"rules\":[[\"attend_day\",\"participation\",10,\"per_day\"],[\"lesson_done\",\"achievement\",20,\"per_src\",{\"day\":100}],[\"course_done\",\"achievement\",300]],\"rewards\":[[\"tuition\",\"학원비 차감\",{\"billPct\":30}]]}}");
    static final Map<String, String> TYPE_MAP = Map.ofEntries(Map.entry("academy", "k12"), Map.entry("hakwon", "k12"), Map.entry("k12", "k12"), Map.entry("adult", "adult"), Map.entry("univ", "univ"), Map.entry("college", "univ"),
        Map.entry("corp", "corp"), Map.entry("company", "corp"), Map.entry("enterprise", "corp"), Map.entry("public", "public"), Map.entry("gov", "public"), Map.entry("lifelong", "lifelong"),
        Map.entry("vocational", "vocational"), Map.entry("training", "vocational"), Map.entry("moel", "vocational"), Map.entry("franchise", "franchise"));
    /** ed가 템플릿 이름이면 그대로, 아니면 기관 유형으로 */
    public static String templateKey(JsonNode type, JsonNode ed) {
        if (truthy(ed) && TPL.has(str(ed)) && !List.of("__proto__").contains(str(ed))) return str(ed);
        String k = TYPE_MAP.get((nullish(type) ? "" : str(type)).toLowerCase(java.util.Locale.ROOT)); return k == null ? "adult" : k;
    }
    static final List<String> CASHK = List.of("tuition", "coupon", "shop", "scholar");
    public static ObjectNode template(JsonNode type, JsonNode ed, JsonNode budget) {
        String k = templateKey(type, ed); JsonNode T = TPL.get(k); boolean cash = truthy(budget) && (truthy(get(budget, "monthWon")) || truthy(get(budget, "termWon")));
        ArrayNode rules = F.arrayNode();
        for (JsonNode r : T.get("rules")) { String trig = r.get(0).asText(); JsonNode sc = r.get(2), once = r.get(3), caps = r.get(4), group = r.get(5);
            ObjectNode o = rules.addObject(); o.put("id", "mru_" + trig).put("ver", 1).put("trigger", trig).put("nature", r.get(1).asText()).put("label", "");
            o.put("once", truthy(once) ? once.asText() : (List.of("signup", "first_login").contains(trig) ? "ever" : "per_src")); o.set("caps", truthy(caps) ? caps.deepCopy() : F.objectNode());
            if (truthy(group)) o.put("groupKey", group.asText()); else o.putNull("groupKey");
            o.put("trustMin", "C").put("approval", "evidence".equals(trig) ? "evidence" : "auto");
            o.set("cond", "exam_score".equals(trig) ? F.objectNode().put("minScore", 80) : "attend_day".equals(trig) ? F.objectNode().put("minMin", 10) : F.objectNode());
            ObjectNode s = F.objectNode(); if (sc.isTextual() && "source".equals(sc.asText())) s.put("mode", "source"); else if (sc.isObject() && sc.has("band")) { s.put("mode", "band"); s.set("bands", sc.get("band").deepCopy()); } else { s.put("mode", "fixed"); s.set("v", sc.deepCopy()); }
            o.set("score", s); o.put("active", true); }
        ArrayNode rewards = F.arrayNode(); int i = 0;
        for (JsonNode r : T.get("rewards")) { String kind = r.get(0).asText(); int idx = i++; if (!cash && CASHK.contains(kind)) continue; boolean tc = "tuition".equals(kind) || "coupon".equals(kind);
            ObjectNode o = rewards.addObject(); o.put("id", "mrw_" + kind + idx).put("kind", kind).put("title", r.get(1).asText()); o.set("cost", F.objectNode().put("wonPerP", 1)); o.put("minUse", tc ? 1000 : 0);
            o.set("maxUse", r.size() > 2 && truthy(r.get(2)) ? r.get(2).deepCopy() : F.objectNode()); o.put("step", tc ? 100 : 1).put("threshold", 0); o.set("perSid", "tuition".equals(kind) ? F.objectNode().put("month", 1) : F.objectNode());
            o.put("approval", "manual").put("cash", List.of("tuition", "coupon", "shop", "goods", "scholar").contains(kind)); o.set("audience", F.objectNode()); o.set("link", F.objectNode()); o.put("active", true); }
        ObjectNode policy = DEFAULT_POLICY.deepCopy(); policy.put("template", k); policy.set("dailyCapTotal", T.get("cap").deepCopy());
        policy.set("expiry", T.get("exp").isTextual() ? F.objectNode().put("mode", "term_end") : F.objectNode().put("mode", "months").set("months", T.get("exp").deepCopy()));
        policy.set("budget", truthy(budget) && truthy(get(budget, "monthWon")) ? F.objectNode().set("monthP", numNode(Math.floor(num(get(budget, "monthWon"))))) : F.objectNode());
        policy.set("streak", DEFAULT_POLICY.get("streak").deepCopy());
        policy.set("scope", "franchise".equals(k) ? F.objectNode().put("mode", "unit").<ObjectNode>set("sameBizUnits", F.arrayNode()).put("hqPool", false) : DEFAULT_POLICY.get("scope").deepCopy());
        policy.set("league", F.objectNode().put("on", false).put("size", 10).put("reset", "week"));
        ObjectNode out = F.objectNode().put("template", k).put("label", T.get("label").asText()); out.set("policy", policy); out.set("rules", rules); out.set("rewards", rewards);
        out.set("warnings", warnings(policy, arr(rewards))); return out;
    }
}
