package egovframework.didisam.group.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.HashSet;
import java.util.Set;
import static egovframework.didisam.cmm.Js.*;

/** 하루 집계(2-4절) — Node group/kpi.js와 같은 정의, 순수 함수. 소속 기관 문서(tenant_state.doc) → 숫자만.
 *  v = { lrn, new, act, enr, cmp, end, progSum, progN, crs } — 사람 수 그대로(가림은 응답 직전 서버가 한다). */
final class GrpKpi {
    private GrpKpi() { }
    static String d10(JsonNode v) { String s = nullish(v) ? "" : str(v); return s.length() >= 10 ? s.substring(0, 10) : s; }
    static double pct(JsonNode p) { if (p == null || p.isNull()) return 0; JsonNode x = p.isObject() ? p.get("p") : p; double d = num(x == null ? F.nullNode() : x); return Double.isFinite(d) ? Math.max(0, Math.min(100, d)) : 0; }
    static boolean gone(JsonNode m) { String st = S(get(m, "status")); return "탈퇴".equals(st) || "withdrawn".equals(st) || truthy(get(m, "deleted")) || truthy(get(m, "left")); }
    static boolean done(JsonNode c, JsonNode p) {
        if (p == null || !p.isObject()) return false; if (truthy(get(p, "done")) || truthy(get(p, "cert")) || truthy(get(p, "certAt")) || truthy(get(p, "doneAt"))) return true;
        double th = num(get(get(c, "criteria"), "threshold")); if (!Double.isFinite(th) || th <= 0) th = 80; return pct(p) >= 100 || ("auto".equals(S(get(c, "cert"))) && pct(p) >= th && false);
    }
    static String doneAt(JsonNode p) { if (p == null || !p.isObject()) return ""; for (String k : new String[]{ "doneAt", "certAt", "done" }) { String d = d10(get(p, k)); if (d.matches("\\d{4}-\\d{2}-\\d{2}")) return d; } return ""; }
    static ObjectNode fromDoc(JsonNode doc, String day) {
        long lrn = 0, nw = 0, act = 0, enr = 0, cmp = 0, end = 0, progSum = 0, progN = 0, crs = 0; Set<String> alive = new HashSet<>(), active = new HashSet<>();
        for (JsonNode m : arr(get(doc, "members"))) { if (gone(m)) continue; String j = d10(get(m, "joined")); if (!j.isEmpty() && j.compareTo(day) > 0) continue; lrn++; alive.add(S(get(m, "id")));
            if (day.equals(j)) nw++; if (day.equals(d10(get(m, "last")))) active.add(S(get(m, "id"))); }
        for (JsonNode c : arr(get(doc, "classes"))) {
            String st = S(get(c, "status")), cs = d10(get(c, "start")), ce = d10(get(c, "end"));
            boolean open = !"준비중".equals(st) && !"폐강".equals(st) && (cs.isEmpty() || cs.compareTo(day) <= 0) && (ce.isEmpty() || ce.compareTo(day) >= 0); if (open) crs++;
            JsonNode P = get(c, "prog"), EN = get(c, "enr");
            for (JsonNode l : arr(get(c, "learners"))) { String id = S(l); if (!alive.contains(id)) continue; JsonNode p = get(P, id), e = get(EN, id);
                String at = d10(get(e, "at")); if (day.equals(at)) enr++;
                if (done(c, p)) { String da = doneAt(p); if (day.equals(da)) cmp++; }
                if (day.equals(ce)) { end++; if (done(c, p)) { /* 종료일 기준 수료(이미 셌으면 cmp 유지) */ } }
                else if (open && !done(c, p)) { progSum += Math.round(pct(p) * 100); progN++; }
                if (p != null && p.isObject() && day.equals(d10(get(p, "subAt")))) active.add(id);
            }
        }
        act = active.size();
        ObjectNode v = F.objectNode(); v.put("lrn", lrn).put("new", nw).put("act", act).put("enr", enr).put("cmp", cmp).put("end", end).put("progSum", progSum).put("progN", progN).put("crs", crs); return v;
    }
}
