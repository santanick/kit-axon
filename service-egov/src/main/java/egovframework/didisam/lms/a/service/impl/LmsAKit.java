package egovframework.didisam.lms.a.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.Js;
import java.util.*;

/**
 * 묶음 A 순수 계산(Node mod-a.js와 같은 알고리즘 · 같은 바이트):
 *  CSV 파서(RFC 4180 · 따옴표 · CRLF · BOM, eval 없음) · 항목 해시(정렬 JSON + FNV-1a 32, UTF-16 단위) · 분반 동기화 · 합반 활동 이전.
 */
public final class LmsAKit {
    private LmsAKit() { }

    /* ── CSV ── */
    public static List<List<String>> parseCsv(String text) {
        String s = text == null ? "" : text; if (!s.isEmpty() && s.charAt(0) == 0xfeff) s = s.substring(1);
        List<List<String>> recs = new ArrayList<>(); List<String> rec = new ArrayList<>(); StringBuilder f = new StringBuilder(); boolean q = false; int i = 0; int n = s.length();
        while (i < n) {
            char ch = s.charAt(i);
            if (q) { if (ch == '"') { if (i + 1 < n && s.charAt(i + 1) == '"') { f.append('"'); i += 2; continue; } q = false; i++; continue; } f.append(ch); i++; continue; }
            if (ch == '"' && f.length() == 0) { q = true; i++; continue; }
            if (ch == ',') { rec.add(f.toString()); f.setLength(0); i++; continue; }
            if (ch == '\r' || ch == '\n') { rec.add(f.toString()); recs.add(rec); rec = new ArrayList<>(); f.setLength(0); i += ch == '\r' && i + 1 < n && s.charAt(i + 1) == '\n' ? 2 : 1; continue; }
            f.append(ch); i++;
        }
        if (f.length() > 0 || !rec.isEmpty()) { rec.add(f.toString()); recs.add(rec); }
        List<List<String>> out = new ArrayList<>();
        for (List<String> r : recs) {
            List<String> t = new ArrayList<>(); boolean any = false;
            for (String x : r) { String y = Js.cut(Js.trim(x), 200); if (!y.isEmpty()) any = true; t.add(y); }
            if (any) out.add(t);
        }
        return out;
    }

    /* ── 해시 ── */
    public static String canon(JsonNode v) {
        if (v == null || v.isMissingNode()) return "null";
        if (v.isObject()) { List<String> ks = new ArrayList<>(); v.fieldNames().forEachRemaining(ks::add); Collections.sort(ks); StringBuilder b = new StringBuilder("{");
            for (int i = 0; i < ks.size(); i++) { if (i > 0) b.append(','); b.append(Js.stringify(Js.F.textNode(ks.get(i)))).append(':').append(canon(v.get(ks.get(i)))); } return b.append('}').toString(); }
        if (v.isArray()) { StringBuilder b = new StringBuilder("["); for (int i = 0; i < v.size(); i++) { if (i > 0) b.append(','); b.append(canon(v.get(i))); } return b.append(']').toString(); }
        return Js.stringify(v);
    }
    public static String fnv(String s) { int h = 0x811c9dc5; for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 16777619; } String x = Integer.toUnsignedString(h, 16); return "0".repeat(8 - x.length()) + x; }
    public static String itemHash(JsonNode it) { ObjectNode o = Js.F.objectNode(); it.fields().forEachRemaining(e -> { String k = e.getKey(); if (!k.equals("id") && !k.equals("syncSrc") && !k.equals("syncHash")) o.set(k, e.getValue()); }); return fnv(canon(o)); }

    static final Map<String, String> TYPEMAP = Map.ofEntries(Map.entry("chapter", "week"), Map.entry("offline", "week"), Map.entry("live", "week"), Map.entry("week", "week"), Map.entry("assign", "assignment"), Map.entry("assignment", "assignment"),
        Map.entry("discuss", "discussion"), Map.entry("discussion", "discussion"), Map.entry("board", "discussion"), Map.entry("survey", "discussion"), Map.entry("quiz", "exam"), Map.entry("exam", "exam"));
    static String objType(String list, JsonNode it) { if (list.equals("notices")) return "notice"; JsonNode t = it.get("type"); return t != null && t.isTextual() && TYPEMAP.containsKey(t.textValue()) ? TYPEMAP.get(t.textValue()) : "material"; }
    static boolean idOk(JsonNode it) { JsonNode id = it.get("id"); return it.isObject() && id != null && id.isTextual() && !id.textValue().isEmpty(); }
    static boolean srcIs(JsonNode x, String id) { JsonNode v = x.get("syncSrc"); return x.isObject() && v != null && v.isTextual() && v.textValue().equals(id); }
    static String txt(JsonNode o, String k) { JsonNode v = o.get(k); return v != null && v.isTextual() ? v.textValue() : null; }

    public record Dst(String dst, String no, ObjectNode cls) { }
    public record Log(String dst, String type, String oid, String action) { }
    public static final class SyncOut { public boolean changed; public final List<Log> log = new ArrayList<>(); public int copied, updated, deleted, excluded, unchanged; }

    /** 대표 분반 강의실(src)의 공지 · 커리큘럼 → 각 분반 강의실. hist: "dst|type|oid" → 마지막 action */
    public static SyncOut syncClasses(ObjectNode src, List<Dst> dsts, Map<String, String> hist) {
        SyncOut n = new SyncOut();
        for (Dst d : dsts) for (String list : List.of("notices", "curriculum")) {
            List<JsonNode> S0 = new ArrayList<>(); JsonNode sl = src.get(list); if (sl != null && sl.isArray()) sl.forEach(it -> { if (idOk(it)) S0.add(it); });
            JsonNode dl = d.cls().get(list); if (dl == null || !dl.isArray()) { dl = d.cls().putArray(list); }
            ArrayNode D = (ArrayNode) dl; Set<String> ids = new HashSet<>(); for (JsonNode it : S0) ids.add(it.get("id").textValue());
            for (JsonNode it : S0) {
                String oid = it.get("id").textValue(); String type = objType(list, it); String key = d.dst() + "|" + type + "|" + oid; String last = hist.getOrDefault(key, "");
                if (last.equals("excluded")) { n.excluded++; continue; }
                String h = itemHash(it); int i = -1; for (int j = 0; j < D.size(); j++) if (srcIs(D.get(j), oid)) { i = j; break; }
                if (i < 0) {
                    if (last.equals("copied") || last.equals("updated")) { n.excluded++; n.log.add(new Log(d.dst(), type, oid, "excluded")); hist.put(key, "excluded"); continue; }
                    ObjectNode cp = ((ObjectNode) it).deepCopy(); cp.put("id", oid + "-" + d.no()); cp.put("syncSrc", oid); cp.put("syncHash", h); D.add(cp);
                    n.copied++; n.changed = true; n.log.add(new Log(d.dst(), type, oid, "copied")); hist.put(key, "copied"); continue;
                }
                JsonNode x = D.get(i);
                if (!itemHash(x).equals(txt(x, "syncHash"))) { n.excluded++; n.log.add(new Log(d.dst(), type, oid, "excluded")); hist.put(key, "excluded"); continue; }
                if (h.equals(txt(x, "syncHash"))) { n.unchanged++; continue; }
                ObjectNode up = ((ObjectNode) it).deepCopy(); up.set("id", x.get("id")); up.put("syncSrc", oid); up.put("syncHash", h); D.set(i, up);
                n.updated++; n.changed = true; n.log.add(new Log(d.dst(), type, oid, "updated")); hist.put(key, "updated");
            }
            for (int i = D.size() - 1; i >= 0; i--) {
                JsonNode x = D.get(i); String ss = x.isObject() ? txt(x, "syncSrc") : null; if (ss == null || ids.contains(ss)) continue;
                if (!itemHash(x).equals(txt(x, "syncHash"))) continue;
                D.remove(i); n.deleted++; n.changed = true; String type = objType(list, x); n.log.add(new Log(d.dst(), type, ss, "deleted")); hist.put(d.dst() + "|" + type + "|" + ss, "deleted");
            }
        }
        return n;
    }

    /** 합반: 공유분반 강의실 활동(수강생 · 진도 · 과제 · 점수)을 대표분반 강의실로 */
    public static int mergeActivity(ObjectNode rep, List<ObjectNode> shared) {
        int moved = 0;
        if (rep.get("learners") == null || !rep.get("learners").isArray()) rep.putArray("learners");
        if (rep.get("prog") == null || !rep.get("prog").isObject()) rep.putObject("prog");
        ArrayNode RL = (ArrayNode) rep.get("learners"); ObjectNode RP = (ObjectNode) rep.get("prog");
        for (ObjectNode cs : shared) {
            for (JsonNode id : Js.arr(cs.get("learners"))) { boolean has = false; for (JsonNode y : RL) if (Js.strictEq(y, id)) { has = true; break; } if (!has) RL.add(id); }
            JsonNode cp = cs.get("prog");
            if (cp != null && cp.isObject()) for (String k : Js.keys(cp)) { if (!Js.own(RP, k)) { RP.set(k, cp.get(k)); moved++; } }
            cs.putArray("learners"); cs.putObject("prog"); cs.set("mergedInto", rep.get("id"));
        }
        return moved;
    }
}
