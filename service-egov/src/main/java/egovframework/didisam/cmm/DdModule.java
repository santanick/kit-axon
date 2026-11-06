package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;
import java.util.regex.Pattern;

/** v31 환급 에디션 모듈 분리 — Node service/server/modules.js와 같은 규칙 */
public final class DdModule {
    private DdModule() { }
    public static final Map<String, String> PAGE = Map.of("learner", "learner.html", "tutor", "tutor.html", "admin", "index.html");
    static final Set<String> TUTOR_API = Set.of("GET /api/health", "GET /api/config", "POST /api/login", "POST /api/logout", "POST /api/password", "GET /api/me", "GET /api/state", "PUT /api/state", "POST /api/ai/messages", "GET /api/ai/usage", "GET /api/learners/progress", "GET /api/cpl/summary", "GET /api/cpl/exams", "GET /api/cpl/logs");
    static final Set<String> VIEW_KEEP = Set.of("org", "classes", "members", "admins", "me", "nav", "settings", "site", "lsite", "guides", "bld", "rubrics", "tuts", "weeks");
    static final List<String> SCRUB = List.of("settings", "site", "lsite");
    /** 화면이 읽는 구조만 남기고 값은 지운다 */
    static JsonNode shape(JsonNode v) {
        if (v.isArray()) return DdWeb.JSON.createArrayNode(); if (!v.isObject()) return v;
        ObjectNode o = DdWeb.JSON.createObjectNode(); v.fields().forEachRemaining(e -> { JsonNode x = e.getValue(); if (x.isArray()) o.set(e.getKey(), DdWeb.JSON.createArrayNode()); else if (x.isObject()) o.set(e.getKey(), DdWeb.JSON.createObjectNode()); else o.putNull(e.getKey()); }); return o;
    }
    static final Pattern SECRET = Pattern.compile("(key|secret|token|password|credential)", Pattern.CASE_INSENSITIVE);
    static final List<String> CLASS_LOCK = List.of("id", "learners", "name", "status", "price", "kind", "legal", "start", "end", "teacher", "hrd");
    static final Pattern V4 = Pattern.compile("^(?:::ffff:)?(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$", Pattern.CASE_INSENSITIVE);

    public static boolean apiAllowed(String mod, String method, String path) {
        if (mod.isEmpty()) return true;
        boolean pub = DdApiFilter.PUB.matcher(path).matches();
        if ("learner".equals(mod)) return ("GET".equals(method) && ("/api/health".equals(path) || "/api/config".equals(path))) || pub;
        if ("tutor".equals(mod)) return TUTOR_API.contains(method + " " + path);
        return !pub;
    }
    public static boolean mcpAllowed(String mod) { return mod.isEmpty() || "admin".equals(mod); }
    public static boolean roleAllowed(String mod, Object role) {
        if ("tutor".equals(mod)) return "teacher".equals(role);
        if ("admin".equals(mod)) return !"teacher".equals(role);
        return !"learner".equals(mod);
    }
    public static boolean staticAllowed(String mod, String pathname) {
        if (mod.isEmpty()) return true;
        String p = pathname.toLowerCase(Locale.ROOT); if (p.startsWith("/deploy/") || p.startsWith("/native/")) return false;
        if (p.endsWith("/") || p.endsWith(".html") || p.endsWith(".do")) return "/".equals(p) || p.equals("/" + PAGE.get(mod));
        return true;
    }
    static Long v4(String s) {
        var m = V4.matcher(s.trim()); if (!m.find()) return null; long v = 0;
        for (int i = 1; i <= 4; i++) { int o = Integer.parseInt(m.group(i)); if (o > 255) return null; v = v * 256 + o; }
        return v;
    }
    public static List<String> parseIps(String v) { List<String> L = new ArrayList<>(); for (String s : v.split(",")) if (!s.trim().isEmpty()) L.add(s.trim()); return L; }
    public static boolean ipAllowed(List<String> list, String ip) {
        if (list.isEmpty()) return true; Long v = v4(ip);
        for (String rule : list) {
            int i = rule.indexOf('/');
            if (i < 0) { Long n = v4(rule); if (v != null && n != null ? n.equals(v) : rule.equalsIgnoreCase(ip.trim())) return true; continue; }
            Long n = v4(rule.substring(0, i)); int bits; try { bits = Integer.parseInt(rule.substring(i + 1)); } catch (NumberFormatException e) { continue; }
            if (v == null || n == null || bits < 0 || bits > 32) continue; if (bits == 0) return true;
            long mask = (0xFFFFFFFFL << (32 - bits)) & 0xFFFFFFFFL; if ((v & mask) == (n & mask)) return true;
        }
        return false;
    }

    public static final class Scope { public final Set<String> classes = new HashSet<>(), ids = new HashSet<>(), sids = new HashSet<>(); }
    static String txt(JsonNode n, String k) { JsonNode v = n == null ? null : n.get(k); return v == null || v.isNull() ? "" : v.asText(); }
    static boolean sameMail(JsonNode x, String email) { return x != null && x.isObject() && txt(x, "email").equalsIgnoreCase(email); }
    public static Scope scope(JsonNode doc, String email) {
        Scope s = new Scope(); if (doc == null) return s;
        JsonNode admins = doc.get("admins");
        if (admins != null && admins.isArray()) for (JsonNode a : admins) if (sameMail(a, email)) { JsonNode c = a.get("classes"); if (c != null && c.isArray()) for (JsonNode x : c) s.classes.add(x.asText()); break; }
        JsonNode cl = doc.get("classes");
        if (cl != null && cl.isArray()) for (JsonNode c : cl) if (c != null && s.classes.contains(txt(c, "id")) && c.get("learners") != null && c.get("learners").isArray()) for (JsonNode x : c.get("learners")) s.ids.add(x.asText());
        JsonNode mem = doc.get("members");
        if (mem != null && mem.isArray()) for (JsonNode m : mem) if (m != null && s.ids.contains(txt(m, "id")) && !txt(m, "sid").isEmpty()) s.sids.add(txt(m, "sid"));
        return s;
    }
    static JsonNode scrub(JsonNode v) {
        if (v == null) return DdWeb.JSON.createObjectNode();
        if (v.isArray()) { ArrayNode a = DdWeb.JSON.createArrayNode(); for (JsonNode x : v) a.add(scrub(x)); return a; }
        if (!v.isObject()) return v;
        ObjectNode o = DdWeb.JSON.createObjectNode(); v.fields().forEachRemaining(e -> { if (!SECRET.matcher(e.getKey()).find()) o.set(e.getKey(), scrub(e.getValue())); }); return o;
    }
    public static JsonNode teacherView(JsonNode doc, String email) {
        if (doc == null || !doc.isObject()) return doc; Scope sc = scope(doc, email); ObjectNode out = DdWeb.JSON.createObjectNode();
        doc.fields().forEachRemaining(e -> { JsonNode v = e.getValue(); out.set(e.getKey(), VIEW_KEEP.contains(e.getKey()) ? v : shape(v)); });
        out.set("classes", filter(doc.get("classes"), x -> sc.classes.contains(txt(x, "id"))));
        out.set("members", filter(doc.get("members"), x -> sc.ids.contains(txt(x, "id"))));
        out.set("admins", filter(doc.get("admins"), x -> sameMail(x, email)));
        for (String k : SCRUB) if (doc.get(k) != null && !doc.get(k).isNull()) out.set(k, scrub(doc.get(k))); return out;
    }
    static ArrayNode filter(JsonNode arr, java.util.function.Predicate<JsonNode> f) { ArrayNode a = DdWeb.JSON.createArrayNode(); if (arr != null && arr.isArray()) for (JsonNode x : arr) if (x != null && x.isObject() && f.test(x)) a.add(x); return a; }
    public static ObjectNode teacherMerge(JsonNode cur, JsonNode inc, String email) {
        Scope sc = scope(cur, email); Map<String, JsonNode> byId = new HashMap<>(); JsonNode ic = inc == null ? null : inc.get("classes");
        if (ic != null && ic.isArray()) for (JsonNode c : ic) if (c != null && c.isObject() && !txt(c, "id").isEmpty()) byId.put(txt(c, "id"), c);
        ObjectNode out = ((ObjectNode) cur).deepCopy(); ArrayNode list = DdWeb.JSON.createArrayNode(); JsonNode cl = cur.get("classes");
        if (cl != null && cl.isArray()) for (JsonNode c : cl) {
            JsonNode n = c != null && c.isObject() && sc.classes.contains(txt(c, "id")) ? byId.get(txt(c, "id")) : null;
            if (n == null) { list.add(c); continue; }
            ObjectNode m = ((ObjectNode) n).deepCopy(); for (String k : CLASS_LOCK) { if (c.has(k)) m.set(k, c.get(k)); else m.remove(k); } list.add(m);
        }
        if (cl != null) out.set("classes", list); return out;
    }
}
