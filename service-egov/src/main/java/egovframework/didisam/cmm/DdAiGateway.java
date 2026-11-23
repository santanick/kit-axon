package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.time.Instant;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * v46 Ver2 AI 게이트웨이(정책 판정부) — Node service/server/aigw.js와 같은 규칙.
 * ① 기관 정책 doc.aipol(on일 때만 판정, off면 기존 요청 · 응답 그대로) ② 항목 레벨(L0 차단 · L1~L3 지시문)
 * ③ 힌트 사다리 단계 검증(lp.hint[cls/item]) ④ 기능별 한도 키. 외부 호출 · 가드는 기존 DdAiClient · DdAiGuard를 그대로 쓴다.
 * 판정 함수는 순수 함수(상태 없음) — 오류는 메시지 키(dd.상태.코드)로 돌려주고 호출부가 processException으로 던진다.
 */
public final class DdAiGateway {
    private DdAiGateway() { }
    static final JsonNodeFactory F = JsonNodeFactory.instance;
    public static final Set<String> LV = Set.of("L0", "L1", "L2", "L3");
    public static final Pattern IKEY = Pattern.compile("[\\w.-]{1,60}/[\\w.-]{1,60}");
    public static final String E_LEVEL = "dd.403.ai_level_off", E_HINT = "dd.409.hint_locked", E_QUOTA = "dd.429.ai_feature_quota";
    public static final String[] STEP_NAME = { "", "개념 질문", "방향 힌트", "부분 예시", "반례", "풀이" };

    static boolean isTrue(JsonNode v) { return v != null && v.isBoolean() && v.booleanValue(); }
    static String s(JsonNode v) { return v != null && v.isTextual() ? v.asText() : ""; }

    /** 기관 정책이 켜져 있는가(aipol.on === true). 기존 기관은 upgradeState에서 {on:false} */
    public static boolean on(JsonNode pol) { return pol != null && pol.isObject() && isTrue(pol.get("on")); }

    /** 항목 종류: exam · quiz → 'exam', 그 밖 → 'assign' (어드민 a2Exam과 같음) */
    public static String kindOf(JsonNode it) { String t = it == null ? "" : s(it.get("type")); return "exam".equals(t) || "quiz".equals(t) ? "exam" : "assign"; }

    /** doc.classes에서 'cls/item' 항목 찾기(없으면 null) */
    public static JsonNode findItem(JsonNode classes, String key) {
        if (key == null || !IKEY.matcher(key).matches() || classes == null || !classes.isArray()) return null;
        int i = key.indexOf('/'); String c = key.substring(0, i), it = key.substring(i + 1);
        for (JsonNode k : classes) {
            if (k == null || !c.equals(s(k.get("id")))) continue;
            JsonNode items = k.get("items"); if (items == null || !items.isArray()) return null;
            for (JsonNode x : items) if (x != null && it.equals(s(x.get("id")))) return x;
            return null;
        }
        return null;
    }

    /** 항목 레벨: item.ai.lvl → aipol.preset[종류] → aipol.lvl → 'L1' (클라이언트 값은 믿지 않는다) */
    public static String levelOf(JsonNode pol, JsonNode item) {
        JsonNode ai = item == null ? null : item.get("ai");
        String l = ai != null && ai.isObject() ? s(ai.get("lvl")) : ""; if (LV.contains(l)) return l;
        JsonNode pre = pol == null ? null : pol.get("preset");
        if (item != null && pre != null && pre.isObject()) { l = s(pre.get(kindOf(item))); if (LV.contains(l)) return l; }
        l = pol == null ? "" : s(pol.get("lvl")); return LV.contains(l) ? l : "L1";
    }
    public static boolean solOf(JsonNode item) { JsonNode ai = item == null ? null : item.get("ai"); return ai != null && isTrue(ai.get("sol")); }

    /** 레벨 판정: L0이면 차단 키, 아니면 null */
    public static String gate(String lvl) { return "L0".equals(lvl) ? E_LEVEL : null; }

    /**
     * 힌트 단계 검증. hint = 요청 {step, attempt, self}, cur = lp.hint[key] {step, tries, selfExp}.
     * L1: 한 단계씩만(cur+1까지), 새 단계는 새 「내 시도」(attempt)가 있어야 함. L2 · L3: 잠금 완화(건너뛰기 · 시도 없이 가능).
     * 5단계(풀이)는 레벨과 무관하게 item.ai.sol + 자기 설명(self 또는 저장된 selfExp) 후만. 같은 단계 · 낮은 단계 다시 보기는 허용.
     */
    public static String hintCheck(String lvl, boolean sol, JsonNode cur, JsonNode hint) {
        JsonNode st = hint == null ? null : hint.get("step");
        if (st == null || !st.canConvertToInt() || !st.isIntegralNumber()) return E_HINT;
        int step = st.asInt(), c = curStep(cur);
        if (step < 1 || step > 5) return E_HINT;
        if (step == 5 && !(sol && (s(hint.get("self")).strip().length() > 0 || (cur != null && isTrue(cur.get("selfExp")))))) return E_HINT;
        if (step <= c) return null;
        if ("L1".equals(lvl)) {
            if (step > c + 1) return E_HINT;
            if (s(hint.get("attempt")).strip().isEmpty()) return E_HINT;
        }
        return null;
    }
    public static int curStep(JsonNode cur) { JsonNode v = cur == null ? null : cur.get("step"); return v != null && v.isIntegralNumber() ? Math.max(0, Math.min(5, v.asInt())) : 0; }

    /** 통과한 힌트 요청을 lp.hint[key]에 반영(글은 저장하지 않고 길이만) — 서버만 올린다 */
    public static ObjectNode hintNext(JsonNode cur, JsonNode hint) {
        ObjectNode o = F.objectNode(); int step = hint.get("step").asInt(), c = curStep(cur);
        o.put("step", Math.max(c, step));
        ArrayNode tr = o.putArray("tries"); JsonNode old = cur == null ? null : cur.get("tries");
        if (old != null && old.isArray()) { int from = Math.max(0, old.size() - 19); for (int i = from; i < old.size(); i++) tr.add(old.get(i)); }
        int len = s(hint.get("attempt")).strip().length();
        if (len > 0) { ObjectNode t = tr.addObject(); t.put("n", step); t.put("len", Math.min(len, 600)); t.put("at", Instant.now().toString()); }
        o.put("selfExp", (cur != null && isTrue(cur.get("selfExp"))) || s(hint.get("self")).strip().length() > 0);
        return o;
    }

    /** lp.hint 정리(cleanLP) — {key: {step 0~5, tries[{n,len,at}] 20개, selfExp}}, 키 200개 */
    public static ObjectNode cleanHint(JsonNode h) {
        if (h == null || !h.isObject()) return null;
        ObjectNode o = F.objectNode(); int n = 0;
        for (var it = h.fields(); it.hasNext() && n < 200; ) {
            var e = it.next(); if (!IKEY.matcher(e.getKey()).matches() || e.getValue() == null || !e.getValue().isObject()) continue;
            JsonNode v = e.getValue(); ObjectNode y = o.putObject(e.getKey()); n++;
            y.put("step", curStep(v)); ArrayNode tr = y.putArray("tries"); JsonNode t = v.get("tries");
            if (t != null && t.isArray()) { int from = Math.max(0, t.size() - 20); for (int i = from; i < t.size(); i++) { JsonNode x = t.get(i); if (x == null || !x.isObject()) continue;
                ObjectNode z = tr.addObject(); z.put("n", Math.max(0, Math.min(5, x.path("n").asInt(0)))); z.put("len", Math.max(0, Math.min(600, x.path("len").asInt(0)))); String at = s(x.get("at")); z.put("at", at.length() > 30 ? at.substring(0, 30) : at); } }
            y.put("selfExp", isTrue(v.get("selfExp")));
        }
        return o;
    }

    static String clip(JsonNode v, int n) { String x = s(v).replaceAll("[<>]", "").replaceAll("[\\u0000-\\u001f\\u007f]", " ").strip(); return x.length() > n ? x.substring(0, n) : x; }
    /** lp.vision 정리(cleanLP) — {card:{who,why,how}, goals:[{t,by}] 5개, at}. 글은 학습자 본인 lp에만(이벤트 표에는 넣지 않음) */
    public static ObjectNode cleanVision(JsonNode v) {
        if (v == null || !v.isObject()) return null;
        ObjectNode o = F.objectNode(); JsonNode c = v.get("card"); ObjectNode cd = o.putObject("card");
        for (String k : new String[]{ "who", "why", "how" }) cd.put(k, clip(c == null ? null : c.get(k), 200));
        ArrayNode g = o.putArray("goals"); JsonNode gs = v.get("goals");
        if (gs != null && gs.isArray()) for (JsonNode x : gs) { if (g.size() >= 5) break; if (x == null || !x.isObject()) continue; String t = clip(x.get("t"), 120); if (t.isEmpty()) continue; ObjectNode y = g.addObject(); y.put("t", t); y.put("by", clip(x.get("by"), 20)); }
        o.put("at", clip(v.get("at"), 30));
        return o;
    }

    /** 레벨 · 힌트 단계 지시문(정책 on일 때만 시스템 프롬프트에 덧붙임) */
    public static String levelRule(String lvl, int step) {
        String r = switch (lvl) {
            case "L2" -> "[AI 레벨 L2 파트너] 초안 피드백 · 예시 · 대안 비교까지 돕되, 제출할 최종 답안은 학습자가 직접 씁니다.";
            case "L3" -> "[AI 레벨 L3 에이전트] 과제 수행을 함께 진행할 수 있으나, 결과를 학습자가 검토 · 설명하도록 확인 질문을 덧붙입니다.";
            default -> "[AI 레벨 L1 코치] 답이나 완성된 풀이를 주지 않고, 질문과 힌트로만 학습자가 스스로 생각하도록 돕습니다.";
        };
        if (step >= 1 && step <= 5) r += "\n[힌트 " + step + "단계: " + STEP_NAME[step] + "] " + switch (step) {
            case 1 -> "핵심 개념을 떠올리게 하는 질문 1~2개만 합니다. 답 · 방법은 말하지 않습니다.";
            case 2 -> "어느 방향으로 접근할지만 한두 문장으로 알려 줍니다. 풀이 과정은 쓰지 않습니다.";
            case 3 -> "비슷한 문제의 일부 예시만 보여 줍니다. 이 과제의 답은 쓰지 않습니다.";
            case 4 -> "학습자 시도가 틀릴 수 있는 반례 · 경계 사례를 제시합니다. 정답은 쓰지 않습니다.";
            default -> "풀이를 보여 주되, 학습자가 쓴 자기 설명과 비교해 다른 점을 짚어 줍니다.";
        };
        return r;
    }

    /** 기능별 하루 한도(aipol.quota[feature], 1~10000) — 없으면 -1(기관 일일 한도만) */
    public static int featureQuota(JsonNode pol, String feature) {
        JsonNode q = pol == null ? null : pol.get("quota"); JsonNode v = q != null && q.isObject() ? q.get(feature) : null;
        return v != null && v.isNumber() && v.asDouble() >= 1 ? (int) Math.min(10000, v.asDouble()) : -1;
    }

    /** 공개 사이트 데이터용 정책 요약 — {on, lvl, retain, evalNotice}만 */
    public static ObjectNode pubPolicy(JsonNode pol) {
        if (!on(pol)) return null;
        ObjectNode o = F.objectNode(); o.put("on", true); String l = s(pol.get("lvl")); o.put("lvl", LV.contains(l) ? l : "L1");
        String r = s(pol.get("retain")); o.put("retain", Set.of("term", "year", "none").contains(r) ? r : "term");
        o.put("evalNotice", !(pol.get("evalNotice") != null && pol.get("evalNotice").isBoolean()) || pol.get("evalNotice").booleanValue());
        return o;
    }
}
