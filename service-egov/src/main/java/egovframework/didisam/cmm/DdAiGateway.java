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
    public static final Pattern IKEY = Pattern.compile("[\\w-]{1,60}/[\\w-]{1,60}");
    public static final String E_LEVEL = "dd.403.ai_level_off", E_HINT = "dd.409.hint_locked", E_QUOTA = "dd.429.ai_feature_quota";
    public static final String[] STEP_NAME = { "", "개념 질문", "방향 힌트", "부분 예시", "반례", "풀이" };

    static boolean isTrue(JsonNode v) { return v != null && v.isBoolean() && v.booleanValue(); }
    static String s(JsonNode v) { return v != null && v.isTextual() ? v.asText() : ""; }
    /** JS +v (숫자 · 숫자 글자) — 아니면 NaN */
    static double jsNum(JsonNode v) { if (v == null || v.isNull()) return 0; if (v.isNumber()) return v.asDouble(); if (v.isBoolean()) return v.asBoolean() ? 1 : 0; if (v.isTextual()) { String t = v.asText().strip(); if (t.isEmpty()) return 0; try { return Double.parseDouble(t); } catch (NumberFormatException e) { return Double.NaN; } } return Double.NaN; }
    static long jsRound(double d) { return (long) Math.floor(d + 0.5); }
    public static final java.util.List<String> FEATURES = java.util.List.of("tutor", "studio", "grade", "vision", "lmsqa");
    public static final java.util.Map<String, Integer> RETAIN_DAYS = java.util.Map.of("term", 183, "year", 365);

    /** 기관 정책 정규화(Node polOf) — {on, lvl, preset{exam,assign}, retain, evalNotice, train, quota{feature:n}} */
    public static ObjectNode polOf(JsonNode raw) {
        JsonNode p = raw != null && raw.isObject() ? raw : F.objectNode(); JsonNode pre = p.get("preset"), q = p.get("quota");
        ObjectNode o = F.objectNode(); o.put("on", isTrue(p.get("on")));
        String l = s(p.get("lvl")); o.put("lvl", LV.contains(l) ? l : "L1");
        ObjectNode pr = o.putObject("preset"); for (String k : new String[]{ "exam", "assign" }) { String v = pre != null && pre.isObject() ? s(pre.get(k)) : ""; pr.put(k, LV.contains(v) ? v : ""); }
        String r = s(p.get("retain")); o.put("retain", Set.of("term", "year", "none").contains(r) ? r : "term");
        o.put("evalNotice", !(p.get("evalNotice") != null && p.get("evalNotice").isBoolean() && !p.get("evalNotice").booleanValue()));
        o.put("train", isTrue(p.get("train")));
        ObjectNode qo = o.putObject("quota");
        if (q != null && q.isObject() && !q.isArray()) for (String f : FEATURES) { double n = jsNum(q.get(f)); if (q.has(f) && !q.get(f).isNull() && Double.isFinite(n) && n > 0) qo.put(f, Math.min(100000, jsRound(n))); }
        return o;
    }
    /** 기관 정책이 켜져 있는가(aipol.on === true). 기존 기관은 upgradeState에서 {on:false} */
    public static boolean on(JsonNode pol) { return pol != null && pol.isObject() && isTrue(pol.get("on")); }

    /** 항목 종류: exam · test → 'exam', 그 밖 → 'assign' (Node kindOf) */
    public static String kindOf(JsonNode it) { String t = it == null || it.get("type") == null || it.get("type").isNull() ? "" : it.get("type").asText(""); return t.matches("exam|test") ? "exam" : "assign"; }

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

    /** 항목 레벨(정규화된 정책): item.ai.lvl → preset[종류] → lvl → 'L1'. 정책 off면 "" */
    public static String levelOf(JsonNode pol, JsonNode item) {
        if (!on(pol)) return "";
        JsonNode ai = item == null || !s(item.get("type")).matches("quiz|exam|test|assign") ? null : item.get("ai"); /* 영상 항목 ai(장면)는 레벨 아님 */
        String l = ai != null && ai.isObject() ? s(ai.get("lvl")) : ""; if (LV.contains(l)) return l;
        JsonNode pre = pol.get("preset"); l = pre == null ? "" : s(pre.get(kindOf(item))); if (LV.contains(l)) return l;
        l = s(pol.get("lvl")); return LV.contains(l) ? l : "L1";
    }
    public static boolean solOf(JsonNode item) { JsonNode ai = item == null ? null : item.get("ai"); return ai != null && isTrue(ai.get("sol")); }

    /** 힌트 판정 결과: err(키 · 문구) 또는 next(lp.hint[key]에 저장할 값) */
    public record Hint(String err, String msg, ObjectNode next, int len) { }
    /**
     * 힌트 사다리 검증(Node hintCheck와 같음). cur = lp.hint[key] {step, tries, selfExp}, h = 요청 {step, attempt, selfExp}
     * 1~5단계, 한 번에 한 단계씩(건너뛰기 409), L1은 2단계부터 새 단계마다 「내 시도」 2자 이상, 5단계는 item.ai.sol + 자기 설명(selfExp, 시도 10자 이상)
     */
    public static Hint hintCheck(String lvl, JsonNode item, JsonNode cur, JsonNode h, Instant now) {
        JsonNode c = cur != null && cur.isObject() ? cur : F.objectNode();
        double cs = jsNum(c.get("step")); int st = (int) Math.max(0, Math.min(5, Double.isNaN(cs) ? 0 : jsRound(cs)));
        double sd = jsNum(h == null ? null : h.get("step")); if (h != null && (h.get("step") == null || h.get("step").isNull())) sd = Double.NaN;
        long step = Double.isNaN(sd) ? -1 : jsRound(sd);
        if (!(step >= 1 && step <= 5)) return new Hint("dd.400.hint", "힌트 단계가 올바르지 않습니다.", null, 0);
        JsonNode av = h.get("attempt"); String att = av == null || av.isNull() || (av.isBoolean() && !av.asBoolean()) ? "" : av.isTextual() ? av.asText().strip() : av.toString().strip();
        int len = Math.min(600, att.length());
        boolean selfExp = isTrue(c.get("selfExp")) || (isTrue(h.get("selfExp")) && step == 5 && len >= 10);
        if (step > st + 1) return new Hint(E_HINT, STEP_NAME[st + 1] + " 단계부터 차례로 열 수 있습니다.", null, 0);
        if (step > st) {
            if (step >= 2 && "L1".equals(lvl) && len < 2) return new Hint(E_HINT, "다음 힌트를 열려면 먼저 「내 시도」를 적어 주세요.", null, 0);
            if (step == 5) { if (!solOf(item)) return new Hint(E_HINT, "이 과제는 선생님이 풀이 보기를 허용하지 않았습니다.", null, 0); if (!selfExp) return new Hint(E_HINT, "풀이를 보려면 먼저 내 풀이를 설명해 주세요(10자 이상).", null, 0); }
        }
        ObjectNode o = F.objectNode(); o.put("step", Math.max(st, (int) step)); ArrayNode tr = F.arrayNode();
        JsonNode old = c.get("tries");
        if (old != null && old.isArray()) for (JsonNode x : old) { if (x == null || !x.isObject()) continue; ObjectNode y = tr.addObject();
            double n = jsNum(x.get("n")), l = jsNum(x.get("len")); y.put("n", Double.isNaN(n) ? 0 : jsRound(n)); y.put("len", Double.isNaN(l) ? 0 : jsRound(l));
            String at = x.get("at") == null || x.get("at").isNull() ? "" : x.get("at").asText(""); y.put("at", at.length() > 30 ? at.substring(0, 30) : at); }
        if (len > 0) { ObjectNode t = tr.addObject(); t.put("n", step); t.put("len", len); t.put("at", now.truncatedTo(java.time.temporal.ChronoUnit.MILLIS).toString()); }
        ArrayNode last = o.putArray("tries"); for (int i = Math.max(0, tr.size() - 20); i < tr.size(); i++) last.add(tr.get(i));
        o.put("selfExp", selfExp);
        return new Hint(null, null, o, len);
    }

    static final Pattern GID = Pattern.compile("[\\w-]{1,24}"), GBY = Pattern.compile("\\d{4}-\\d{2}(-\\d{2})?");
    static String jsStr(JsonNode v) { return v == null || v.isNull() ? "" : v.isTextual() ? v.asText() : v.toString(); }
    static String cut(String x, int n) { return x.length() > n ? x.substring(0, n) : x; }
    /** lp.vision 정리(Node cleanVision) — card{who,why,how} 120자 · goals 3개[{id,t(60),by,done}] · at 30자 · skip. 글은 가림(redact) 후 */
    public static ObjectNode cleanVision(JsonNode v, java.util.function.UnaryOperator<String> redact) {
        if (v == null || !v.isObject()) return null;
        ObjectNode o = F.objectNode(); JsonNode c = v.get("card"); if (c == null || !c.isObject()) c = F.objectNode(); ObjectNode cd = o.putObject("card");
        for (String k : new String[]{ "who", "why", "how" }) cd.put(k, redact.apply(cut(jsStr(c.get(k)), 120)));
        ArrayNode g = o.putArray("goals"); JsonNode gs = v.get("goals"); int i = 0;
        if (gs != null && gs.isArray()) for (JsonNode x : gs) { if (x == null || !x.isObject()) continue; if (i >= 3) break; i++;
            ObjectNode y = g.addObject(); String id = jsStr(x.get("id")); y.put("id", GID.matcher(id).matches() ? id : "g" + i); y.put("t", redact.apply(cut(jsStr(x.get("t")), 60)));
            String by = jsStr(x.get("by")); y.put("by", GBY.matcher(by).matches() ? by : ""); y.put("done", isTrue(x.get("done"))); }
        o.put("at", cut(jsStr(v.get("at")), 30)); if (isTrue(v.get("skip"))) o.put("skip", true);
        return o;
    }

    static final String[] DIRECTIVE = { "",
        "[AI 레벨: 코치(L1)] 이 과제는 학습자가 스스로 풀어야 합니다. 답 · 완성 코드 · 완성 문장을 주지 말고 질문 · 개념 설명 · 방향 힌트로만 돕습니다.",
        "[AI 레벨: 파트너(L2)] 학습자와 함께 생각합니다. 예시 · 부분 초안 · 대안 비교는 줄 수 있지만 제출물 전체를 대신 만들지 않고, 학습자가 판단 근거를 직접 쓰게 합니다.",
        "[AI 레벨: 에이전트(L3)] 실무 과제입니다. 초안 작성 · 정리 · 검토를 맡을 수 있으며, 결과의 근거와 학습자가 확인할 점을 함께 적습니다." };
    static final String[] HINT_DIR = { "",
        "[힌트 1단계 · 개념 질문] 답이나 풀이 방향을 말하지 말고, 학습자가 필요한 개념을 떠올리게 하는 질문 1~2개만 합니다.",
        "[힌트 2단계 · 방향 힌트] 어디서부터 생각할지 방향만 한두 문장으로 알려 줍니다. 식 · 코드 · 답은 쓰지 않습니다.",
        "[힌트 3단계 · 부분 예시] 비슷한 다른 예의 일부만 보여 줍니다. 이 과제의 답을 그대로 쓰지 않습니다.",
        "[힌트 4단계 · 반례] 학습자의 시도가 틀릴 수 있는 반례 · 확인할 경우를 보여 주고 스스로 고치게 합니다.",
        "[힌트 5단계 · 풀이] 교수자가 풀이를 허용했고 학습자가 자기 설명을 적었습니다. 풀이 과정을 단계별로 설명하고, 학습자의 자기 설명과 다른 점을 짚습니다." };
    /** 시스템 지시문에 덧붙일 레벨 · 힌트 문장(Node directive) */
    public static String directive(String lvl, int step) {
        int li = "L1".equals(lvl) ? 1 : "L2".equals(lvl) ? 2 : "L3".equals(lvl) ? 3 : 0;
        String a = DIRECTIVE[li], b = step >= 1 && step <= 5 ? HINT_DIR[step] : "";
        return a.isEmpty() ? b : b.isEmpty() ? a : a + "\n" + b;
    }
    /** 기능 이름 정규화 */
    public static String feat(String f) { return FEATURES.contains(f) ? f : "studio"; }
    /** 정책 on · 기능 한도(없으면 0) */
    public static long cap(JsonNode pol, String f) { if (!on(pol)) return 0; JsonNode q = pol.get("quota"); return q != null && q.has(f) ? q.get(f).asLong() : 0; }

    /** 공개 사이트 데이터용 정책 요약 — on일 때만 {on, lvl, retain, evalNotice} */
    public static ObjectNode pubPolicy(JsonNode raw) {
        if (!on(raw)) return null; ObjectNode p = polOf(raw);
        ObjectNode o = F.objectNode(); o.put("on", true); o.set("lvl", p.get("lvl")); o.set("retain", p.get("retain")); o.set("evalNotice", p.get("evalNotice")); o.set("preset", p.get("preset")); return o;
    }
}
