package egovframework.didisam.pub.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import static egovframework.didisam.cmm.Js.*;

/**
 * v38 C#17 학습자 게시판 글 · 댓글 즉시 게시 — Node service/server/commlive.js와 같은 규칙.
 *  - 받을 때(accept): 게시본 comm의 게시판 권한(쓰기 · 공개 범위 · 승인 필요 · 댓글 끔)으로 확인하고 정화한 게시 모양(_cm)을 만든다. 대기면 null
 *  - 돌려줄 때(merge): 운영자 화면이 아직 반영하지 않은(id > doc.lpxSeq) 이벤트의 _cm만 id로 합친다. tenant_state.doc · rev는 그대로
 */
final class PubCommLive {
    private PubCommLive() {}
    static final Pattern ID_RE = Pattern.compile("[\\w-]{4,40}"), TAG = Pattern.compile("<[^>]*>?"), CTRL = Pattern.compile("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]");

    /** comm2.js cmH · lcomm.js lcH와 같은 FNV-1a 32비트(UTF-16 단위), 36진수 */
    static String h(String s) { int x = (int) 2166136261L; for (int i = 0; i < s.length(); i++) { x ^= s.charAt(i); x *= 16777619; } return Long.toString(x & 0xffffffffL, 36); }
    static String clean(JsonNode v, int n) { String s = nullish(v) ? "" : str(v); return cut(trim(CTRL.matcher(TAG.matcher(s).replaceAll("")).replaceAll("")), n); }
    static String nick(JsonNode m, String orgType) { if (m == null || !m.isObject()) return "회원"; String nk = sOr(m.get("nick")); if (!nk.isEmpty()) return cut(nk, 20);
        String nm = sOr(m.get("name")); if ("univ".equals(orgType) || nm.isEmpty()) return "학습자"; return nm.substring(0, 1) + "○○"; }
    private static List<JsonNode> a(JsonNode v) { return arr(v); }
    private static boolean has(JsonNode arr, String s) { for (JsonNode x : a(arr)) if (x.isTextual() && x.textValue().equals(s)) return true; return false; }
    private static boolean idIs(JsonNode x, String id) { return x != null && x.isObject() && strictEq(x.get("id"), id); }
    static boolean seeOK(JsonNode b, String au, JsonNode comm) { JsonNode p = b.get("perm"); String t = p == null ? "" : sOr(p.get("type"));
        if (t.isEmpty() || "all".equals(t)) return true;
        if ("cls".equals(t)) { JsonNode enr = comm.get("enr"); for (JsonNode id : a(p.get("cls"))) if (id.isTextual() && enr != null && enr.isObject() && has(enr.get(id.textValue()), au)) return true; return false; }
        return has(p.get("who"), au); }
    static JsonNode findC(JsonNode L, String id) { for (JsonNode r : a(L)) { if (idIs(r, id)) return r; JsonNode x = findC(r == null ? null : r.get("replies"), id); if (x != null) return x; } return null; }
    private static String kst() { return Instant.now().plusSeconds(9 * 3600).toString(); }

    /** live = 아직 반영 안 된 _cm 목록 */
    static ObjectNode accept(JsonNode comm, String tid, String sid, JsonNode m, String orgType, List<JsonNode> live, String type, JsonNode d) {
        if (comm == null || !comm.isObject() || d == null || !d.isObject()) return null;
        String ct = sOr(comm.get("tid")); String au = h((ct.isEmpty() ? tid : ct) + ":" + sid); String nk = nick(m, orgType); String now = kst();
        String min = now.substring(0, 16).replace('T', ' ');
        List<JsonNode> boards = a(comm.get("boards")), posts = a(comm.get("posts"));
        if ("post-new".equals(type)) {
            String id = sOr(d.get("id")); if (!ID_RE.matcher(id).matches()) return null;
            for (JsonNode p : posts) if (idIs(p, id)) return null; for (JsonNode x : live) if (idIs(x.get("p"), id)) return null;
            JsonNode b = null; JsonNode db = d.get("board"); for (JsonNode x : boards) if (x != null && x.isObject() && db != null && db.isTextual() && strictEq(x.get("id"), db.textValue())) { b = x; break; }
            if (b == null || strictEq(b.get("write"), "admin") || truthy(b.get("appr")) || strictEq(b.get("id"), "수강후기") || !seeOK(b, au, comm)) return null;
            if (truthy(d.get("tonly")) || truthy(d.get("priv"))) return null;
            String body = clean(d.get("body"), 4000); String title = clean(d.get("title"), 120); if (title.isEmpty()) title = cut(body, 30); if (body.isEmpty() && title.isEmpty()) return null;
            JsonNode dc = d.get("cls"); JsonNode cfg = comm.get("cfg"); String cls = dc != null && dc.isTextual() && cfg != null && cfg.isObject() && own(cfg, dc.textValue()) ? dc.textValue() : "";
            ObjectNode p = F.objectNode(); p.put("id", id); p.set("board", b.get("id")); p.put("kind", strictEq(d.get("kind"), "질문") ? "질문" : "이야기"); p.put("nick", nk); p.put("au", au); p.put("admin", false); p.put("pin", false);
            p.put("title", title); p.put("body", body); p.put("lock", false); p.put("tonly", false); p.put("priv", false); p.put("cls", cls); p.put("item", clean(d.get("item"), 40)); p.set("files", F.arrayNode());
            p.put("likes", 0); p.set("likedBy", F.arrayNode()); p.set("cmts", F.arrayNode()); p.put("ncmt", 0); p.put("at", now.substring(0, 10)); p.put("ua", min); p.put("views", 0); p.put("live", 1);
            ObjectNode o = F.objectNode(); o.set("p", p); return o;
        }
        if ("post-cmt".equals(type)) {
            String id = sOr(d.get("id")); if (!ID_RE.matcher(id).matches()) return null;
            String pid = sOr(d.get("post")); JsonNode p = null; for (JsonNode x : posts) if (idIs(x, pid)) { p = x; break; }
            if (p == null) for (JsonNode x : live) if (idIs(x.get("p"), pid)) { p = x.get("p"); break; }
            if (p == null || truthy(p.get("lock"))) return null;
            JsonNode b = null; for (JsonNode x : boards) if (x != null && x.isObject() && p.get("board") != null && p.get("board").isTextual() && strictEq(x.get("id"), p.get("board").textValue())) { b = x; break; }
            if (b == null || (b.get("cmt") != null && b.get("cmt").isBoolean() && !b.get("cmt").booleanValue()) || truthy(b.get("appr")) || (!seeOK(b, au, comm) && !strictEq(p.get("au"), au))) return null;
            if (findC(p.get("cmts"), id) != null) return null; for (JsonNode x : live) if (idIs(x.get("c"), id)) return null;
            String body = clean(d.get("body"), 2000); if (body.isEmpty()) return null;
            String par = sOr(d.get("parent")); if (!ID_RE.matcher(par).matches()) par = "";
            ObjectNode c = F.objectNode(); c.put("id", id); c.put("nick", nk); c.put("au", au); c.put("admin", false); c.put("body", body); c.put("at", min); c.set("replies", F.arrayNode()); c.put("live", 1);
            ObjectNode o = F.objectNode(); o.put("post", pid); o.put("parent", par); o.set("c", c); return o;
        }
        return null;
    }

    /** 게시본(pub)에 반영 안 된 글 · 댓글을 합친 사본을 돌려준다 */
    static JsonNode merge(JsonNode pub, List<JsonNode> list) {
        if (pub == null || !pub.isObject() || list == null || list.isEmpty() || !isObj(pub.get("comm"))) return pub;
        ObjectNode out = ((ObjectNode) pub).deepCopy(); ObjectNode comm = (ObjectNode) out.get("comm");
        ArrayNode posts = F.arrayNode(); for (JsonNode p : a(comm.get("posts"))) posts.add(p);
        for (JsonNode x : list) { if (x == null || !x.isObject()) continue;
            JsonNode np = x.get("p"); String npid = np == null ? "" : sOr(np.get("id"));
            if (!npid.isEmpty()) { boolean dup = false; for (JsonNode p : posts) if (idIs(p, npid)) { dup = true; break; } if (!dup) { ObjectNode q = ((ObjectNode) np).deepCopy(); q.set("cmts", F.arrayNode()); posts.insert(0, q); } continue; }
            JsonNode c = x.get("c"); String post = sOr(x.get("post")); if (c == null || !c.isObject() || post.isEmpty()) continue;
            ObjectNode p = null; for (JsonNode y : posts) if (idIs(y, post)) { p = (ObjectNode) y; break; }
            if (p == null || truthy(p.get("lock")) || findC(p.get("cmts"), sOr(c.get("id"))) != null) continue;
            if (!(p.get("cmts") instanceof ArrayNode)) p.set("cmts", F.arrayNode());
            String par = sOr(x.get("parent")); JsonNode pr = par.isEmpty() ? null : findC(p.get("cmts"), par);
            if (pr instanceof ObjectNode) { ArrayNode R = pr.get("replies") instanceof ArrayNode ? (ArrayNode) pr.get("replies") : F.arrayNode(); R.add(c.deepCopy()); ((ObjectNode) pr).set("replies", R); }
            else { ((ArrayNode) p.get("cmts")).add(c.deepCopy()); double n = nullish(p.get("ncmt")) ? 0 : num(p.get("ncmt")); p.put("ncmt", (long) ((Double.isNaN(n) ? 0 : n) + 1)); }
        }
        comm.set("posts", posts); return out;
    }
}
