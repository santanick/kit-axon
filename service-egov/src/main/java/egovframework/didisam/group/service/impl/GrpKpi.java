package egovframework.didisam.group.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import static egovframework.didisam.cmm.Js.*;

/** 통합 센터 KPI(spec 2-4 · 1-7 · 5-2) — Node service/server/group/kpi.js와 같은 순수 함수.
 *  하루 행 v(가리기 전 원래 수): 상태 값 lrn · act(최근 28일) · enr · cmp · cmpEnd · cmpBase · progSum · progN · crs, 흐름 값 new · aiCalls · aiTok · rev.
 *  기간 값 = 상태 값은 마지막 날 행, 흐름 값은 기간 합. */
final class GrpKpi {
    private GrpKpi() { }
    static final List<String> KPIS = List.of("lrn", "new", "act", "enr", "cmp", "cmpRateBp", "progBp", "crs", "aiCalls", "aiTok", "rev");
    static final List<String> PEOPLE = List.of("lrn", "new", "act", "enr", "cmp");
    static final List<String> STATE = List.of("lrn", "act", "enr", "cmp", "cmpEnd", "cmpBase", "progSum", "progN", "crs");
    static final List<String> FLOW = List.of("new", "aiCalls", "aiTok", "rev");
    static final Map<String, String> CONSENT = Map.of("aiCalls", "ai", "aiTok", "ai", "rev", "revenue");
    static final String UNDER5 = "5명 미만";
    static String day(JsonNode v) { String s = nullish(v) ? "" : str(v); return s.length() > 10 ? s.substring(0, 10) : s; }
    static String addDays(String d, long n) { return LocalDate.parse(d).plusDays(n).toString(); }
    /** JS +x || 0 */
    static double nz(JsonNode v) { double d = num(v == null ? F.nullNode() : v); return Double.isFinite(d) ? d : 0; }
    static double pv(JsonNode p) { return Math.max(0, Math.min(100, nz(get(p, "p")))); }
    static boolean done(JsonNode c, JsonNode p, String id) { return truthy(get(p, "done")) || pv(p) >= 100 || truthy(get(get(c, "done"), id)); }

    /** 기관 문서 → 그날 하루 행(상태 값 + 신규) */
    static ObjectNode fromDoc(JsonNode doc, String d) {
        List<JsonNode> C = arr(get(doc, "classes")); List<JsonNode> M = new ArrayList<>(); for (JsonNode m : arr(get(doc, "members"))) if (truthy(m) && !truthy(get(m, "withdrawn"))) M.add(m);
        String since = addDays(d, -27); Set<String> L = new LinkedHashSet<>(); for (JsonNode m : M) L.add(key(get(m, "id"))); long enr = 0, cmp = 0, cmpEnd = 0, cmpBase = 0, progN = 0; double progSum = 0; Set<String> act = new LinkedHashSet<>();
        for (JsonNode c : C) { if (c == null || !c.isObject()) continue; List<JsonNode> ids = arr(get(c, "learners"));
            boolean ended = (truthy(get(c, "end")) && day(get(c, "end")).compareTo(d) < 0) || S(get(c, "status")).matches(".*(종료|마감).*");
            for (JsonNode idn : ids) { String id = key(idn); L.add(id); enr++; JsonNode p0 = get(get(c, "prog"), id); JsonNode p = truthy(p0) ? p0 : F.objectNode(); double pv = pv(p); boolean dn = done(c, p, id);
                if (dn) cmp++; if (ended) { cmpBase++; if (dn) cmpEnd++; } else if (!dn) { progSum += pv; progN++; }
                if (truthy(get(p, "at")) && day(get(p, "at")).compareTo(since) >= 0 && day(get(p, "at")).compareTo(d) <= 0) act.add(id); } }
        for (JsonNode m : M) if (truthy(get(m, "last")) && day(get(m, "last")).compareTo(since) >= 0 && day(get(m, "last")).compareTo(d) <= 0) act.add(key(get(m, "id")));
        long nw = 0; for (JsonNode m : M) if (day(truthy(get(m, "joined")) ? get(m, "joined") : get(m, "at")).equals(d)) nw++;
        ObjectNode v = F.objectNode(); v.put("lrn", L.size()).put("act", act.size()).put("enr", enr).put("cmp", cmp).put("cmpEnd", cmpEnd).put("cmpBase", cmpBase); v.set("progSum", numNode(progSum)); v.put("progN", progN).put("crs", C.size()).put("new", nw); return v;
    }
    /** 대학 학번 묶음 — 학번 숫자 · 학과 · 수강 · 이수 수만: [{no, dept, enr, cmp}] */
    static List<ObjectNode> lxRows(JsonNode doc) {
        List<JsonNode> C = arr(get(doc, "classes")); Map<String, JsonNode> codes = new HashMap<>(); for (JsonNode x : arr(get(doc, "codes"))) codes.put(key(get(x, "sid")), get(x, "dept"));
        List<ObjectNode> out = new ArrayList<>();
        for (JsonNode m : arr(get(doc, "members"))) { if (!truthy(m) || truthy(get(m, "withdrawn")) || !truthy(get(m, "sid")) || !str(get(m, "sid")).matches("(?s).*\\d.*")) continue; long enr = 0, cmp = 0; String id = key(get(m, "id"));
            for (JsonNode c : C) { if (!truthy(c)) continue; boolean in = false; for (JsonNode x : arr(get(c, "learners"))) if (strictEq(x, get(m, "id")) || (x.isTextual() && x.textValue().equals(id))) in = true; if (!in) continue;
                enr++; JsonNode p0 = get(get(c, "prog"), id); JsonNode p = truthy(p0) ? p0 : F.objectNode(); if (truthy(get(p, "done")) || num(get(p, "p")) >= 100) cmp++; }
            String dept = S(get(m, "dept")); if (dept.isEmpty()) { JsonNode cd = codes.get(key(get(m, "sid"))); dept = nullish(cd) ? "" : str(cd); }
            ObjectNode o = F.objectNode().put("no", str(get(m, "sid")).replaceAll("\\D", "")); if (cut(dept, 40).isEmpty()) o.putNull("dept"); else o.put("dept", cut(dept, 40)); o.put("enr", enr).put("cmp", cmp); out.add(o); }
        return out;
    }
    /** 여러 하루 행({day, v}) → 기간 값(원래 수). 행이 없으면 null */
    static ObjectNode combine(List<? extends JsonNode> rows) {
        List<JsonNode> R = new ArrayList<>(rows); if (R.isEmpty()) return null; R.sort((a, b) -> S(get(a, "day")).compareTo(S(get(b, "day")))); JsonNode last = get(R.get(R.size() - 1), "v"); if (!truthy(last)) last = F.objectNode();
        ObjectNode out = F.objectNode();
        for (String k : STATE) if (own(last, k)) out.set(k, numNode(nz(get(last, k))));
        for (String k : FLOW) { boolean any = false; double s = 0; for (JsonNode r : R) { JsonNode v = get(r, "v"); if (truthy(v) && own(v, k)) any = true; s += nz(get(v, k)); } if (any) out.set(k, numNode(s)); }
        return out;
    }
    static long rate(double n, double d) { return d > 0 ? Math.round(n / d * 10000) : 0; }
    static final class Masked { ObjectNode v = F.objectNode(); List<String> masked = new ArrayList<>(), noConsent = new ArrayList<>(); }
    /** 원래 수 → 응답 값(가림 · 동의) */
    static Masked mask(JsonNode raw, JsonNode share) {
        Masked o = new Masked(); JsonNode S = share == null ? F.objectNode() : share; JsonNode R = raw == null || raw.isNull() ? F.objectNode() : raw;
        for (String k : KPIS) { String ck = CONSENT.get(k); if (ck != null && !truthy(get(S, ck))) { o.v.putNull(k); o.noConsent.add(k); } }
        for (String k : PEOPLE) { double n = nz(get(R, k)); if (n >= 1 && n <= 4) { o.v.put(k, UNDER5); o.masked.add(k); } else o.v.set(k, numNode(n)); }
        boolean ended = nz(get(R, "cmpBase")) > 0; double base = ended ? num(get(R, "cmpBase")) : nz(get(R, "enr"));
        /* 역산 방지(QA49-3 #1): 분자(수료 수)가 1~4명이어도 비율을 가린다(Node kpi.js와 같음) */
        double numr = ended ? nz(get(R, "cmpEnd")) : nz(get(R, "cmp"));
        if ((base >= 1 && base <= 4) || (numr >= 1 && numr <= 4)) { o.v.putNull("cmpRateBp"); o.masked.add("cmpRateBp"); } else o.v.put("cmpRateBp", rate(numr, base));
        double pn = nz(get(R, "progN")); if (pn >= 1 && pn <= 4) { o.v.putNull("progBp"); o.masked.add("progBp"); } else o.v.put("progBp", pn != 0 ? Math.round(nz(get(R, "progSum")) / pn * 100) : 0);
        o.v.set("crs", numNode(nz(get(R, "crs"))));
        for (String k : new String[]{ "aiCalls", "aiTok", "rev" }) if (!o.noConsent.contains(k)) { JsonNode x = get(R, k); if (nullish(x)) o.v.putNull(k); else o.v.set(k, numNode(nz(x))); }
        /* JS 객체 키 순서: noConsent 키가 먼저 생긴다 — 응답 순서는 KPIS 순서로 다시 맞춘다 */
        ObjectNode ord = F.objectNode(); for (String k : order(o.v)) ord.set(k, o.v.get(k)); o.v = ord; return o;
    }
    /** JS 삽입 순서 재현: noConsent 키(aiCalls · aiTok · rev 중) → PEOPLE → cmpRateBp · progBp · crs → 나머지 */
    static List<String> order(ObjectNode v) { List<String> l = new ArrayList<>(); v.fieldNames().forEachRemaining(l::add); return l; }
    /** list: [{raw, noConsent[]}] → 합계(동의한 원래 수만 더한 뒤 다시 가림, 비동의 키는 null) */
    static ObjectNode total(List<Object[]> list) {
        ObjectNode sum = F.objectNode(); Set<String> nc = new LinkedHashSet<>();
        for (Object[] x : list) { JsonNode raw = (JsonNode) x[0]; if (raw != null && !raw.isNull()) { List<String> ks = new ArrayList<>(STATE); ks.addAll(FLOW); for (String k : ks) if (!nullish(get(raw, k))) sum.set(k, numNode(nz(get(sum, k)) + nz(get(raw, k)))); }
            @SuppressWarnings("unchecked") List<String> n = (List<String>) x[1]; nc.addAll(n); }
        ObjectNode m = mask(sum, F.objectNode().put("ai", true).put("revenue", true)).v; for (String k : nc) m.putNull(k);
        /* 차이 공격 방지(QA49-3 #2): 가린 기관이 한 곳뿐이거나 가린 값의 합이 5명 미만이면 그 키 합계 null(Node kpi.js total과 같음) */
        ObjectNode all = F.objectNode().put("ai", true).put("revenue", true); List<List<String>> each = new ArrayList<>(); for (Object[] x : list) each.add(mask((JsonNode) x[0], all).masked);
        List<String> ks = new ArrayList<>(PEOPLE); ks.add("cmpRateBp"); ks.add("progBp");
        for (String k : ks) { int cnt = 0; double s = 0; for (int i = 0; i < list.size(); i++) if (each.get(i).contains(k)) { cnt++; JsonNode raw = (JsonNode) list.get(i)[0]; s += raw == null ? 0 : nz(get(raw, k)); }
            if (cnt == 0) continue; if (cnt == 1 || (PEOPLE.contains(k) && s < 5)) m.putNull(k); }
        if (m.get("cmp").isNull() || m.get("enr").isNull()) m.putNull("cmpRateBp");
        return m;
    }
    /** 순위(큰 값이 1등, 가림 · null 제외). children: [{v, rank}] */
    static void ranks(List<ObjectNode> children, List<String> kpis) {
        for (String k : kpis) { List<ObjectNode> L = new ArrayList<>(); for (ObjectNode c : children) if (c.get("v").get(k) != null && c.get("v").get(k).isNumber()) L.add(c);
            L.sort((a, b) -> Double.compare(b.get("v").get(k).asDouble(), a.get("v").get(k).asDouble())); for (int i = 0; i < L.size(); i++) ((ObjectNode) L.get(i).get("rank")).put(k, i + 1); }
    }
    /** 경고 기준: 숫자 값만 비교. 비율 키(Bp)는 value를 %로 받는다 */
    static ArrayNode flags(JsonNode v, List<? extends JsonNode> rules) {
        ArrayNode out = F.arrayNode();
        for (JsonNode r : rules) { JsonNode x = get(v, S(get(r, "kpi"))); if (x == null || !x.isNumber()) continue; double lim = S(get(r, "kpi")).endsWith("Bp") ? num(get(r, "value")) * 100 : num(get(r, "value"));
            if ("lt".equals(S(get(r, "op"))) ? x.asDouble() < lim : x.asDouble() > lim) { ObjectNode f = out.addObject(); f.set("rule", get(r, "n")); f.set("kpi", get(r, "kpi")); f.set("label", get(r, "label")); } }
        return out;
    }
    /** 기간 버킷(day · week(ISO) · month) */
    static String bucket(String d, String unit) {
        if ("month".equals(unit)) return d.substring(0, 7); if (!"week".equals(unit)) return d;
        LocalDate t = LocalDate.parse(d); return t.get(java.time.temporal.IsoFields.WEEK_BASED_YEAR) + "-W" + String.format("%02d", t.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR));
    }
    /** 작은 칸 묶기: 5명 미만 칸은 한 줄로 */
    static ArrayNode fold(List<ObjectNode> rows, String key, String n, String label) {
        ArrayNode big = F.arrayNode(); long small = 0; for (ObjectNode r : rows) { double v = nz(r.get(n)); if (v >= 5) big.add(r); else if (v > 0) small += (long) v; }
        if (small != 0) { ObjectNode o = big.addObject().put(key, label); if (small >= 5) o.put(n, small); else o.put(n, UNDER5); } return big;
    }
    static LinkedHashMap<String, JsonNode> none() { return new LinkedHashMap<>(); }
}
