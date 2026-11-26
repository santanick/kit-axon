package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import static egovframework.didisam.cmm.Js.*;

/**
 * 체크리스트 09 · 11 (가디언 2-1 · 2-2) — Node service/server/aitools.js와 같은 표 · 같은 해시 · 같은 오류 코드.
 *  · AI SAM 도구 등급 0 읽기 · 1 내부 쓰기 · 2 외부 발송 · 3 고위험. 미등록 도구 400 tool_unregistered
 *  · 외부 출처 뒤 2등급 이상 · 3등급은 사람 확인 토큰(POST /api/ai/tool-confirm) 없이는 428 tool_confirm_required
 *  · MCP 허용목록(외부 MCP 403 mcp_not_allowed) · 우리 /mcp 도구 목록 해시 고정(다르면 503 + 기능 끄기 신호)
 */
public final class DdAiTools {
    private DdAiTools() { }
    public static final Map<String, Integer> TIER;
    static {
        Map<String, Integer> m = new LinkedHashMap<>();
        Object[] kv = { "get_overview", 0, "list_courses", 0, "list_learners_at_risk", 0, "list_open_questions", 0, "open_screen", 0, "download_report", 0, "start_guide", 0, "connect_guide", 0, "web_search", 0,
            "quote_content_pass", 0, "open_pass_builder", 0, /* 콘텐츠 마켓 견적(조회형 · 저장 안 함) · A3 화면 열기 — Node aitools.js와 같음 */
            "create_courses", 1, "add_learners", 1, "enroll_learners", 1, "update_course", 1, "build_homepage", 1, "edit_homepage", 1,
            "run_studio_command", 2, "studio_action", 2, "run_intent", 2, "run_screen_action", 2, "create_automation", 2 };
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], (Integer) kv[i + 1]);
        TIER = Collections.unmodifiableMap(m);
    }
    public static final List<String> EXT_TOOLS = List.of("list_open_questions");
    public static final List<String> EXT_BLOCKS = List.of("web_search_tool_result", "web_fetch_tool_result", "document", "search_result", "mcp_tool_result", "image");
    /** MCP 허용목록: id · 출처 · 버전 · scope · 외부 전송처 · url · 도구 목록 해시 */
    public static final String MCP_ID = "didisam-studio", MCP_VERSION = "16.0";
    public static final String MCP_TOOLS_HASH = "sha256:19d8d4935b4b93ccb69ac0f03e294a93a65261e3614eacca5141d95c84291ff4";
    public static boolean mcpAllowed(String url) { return false; } /* 외부 MCP 등록분 없음(우리 /mcp는 url 없이 내부 등록) */

    public static int tierOf(String n) { Integer t = n == null ? null : TIER.get(n); return t == null ? -1 : t; }
    static String toolName(JsonNode t) {
        JsonNode ty = get(t, "type"); String y = ty != null && ty.isTextual() ? ty.textValue() : "";
        if (!y.isEmpty() && !"custom".equals(y)) return y.matches("web_search_\\d{8}") ? "web_search" : "";
        JsonNode n = get(t, "name"); return n != null && n.isTextual() ? n.textValue() : "";
    }
    static List<JsonNode> blocks(JsonNode m) { List<JsonNode> l = new ArrayList<>(); JsonNode c = get(m, "content"); if (c != null && c.isArray()) for (JsonNode x : c) if (x != null && x.isObject()) l.add(x); return l; }
    static String s(JsonNode x, String k) { JsonNode v = get(x, k); return v != null && v.isTextual() ? v.textValue() : (v == null || v.isNull() ? "" : v.asText()); }
    public static boolean taintedBefore(List<JsonNode> M, int end) {
        Set<String> ext = new HashSet<>();
        for (int i = 0; i < Math.min(end, M.size()); i++) for (JsonNode x : blocks(M.get(i))) {
            String ty = s(x, "type");
            if (EXT_BLOCKS.contains(ty)) return true;
            if ("tool_use".equals(ty) && EXT_TOOLS.contains(s(x, "name"))) ext.add(s(x, "id"));
            if ("tool_result".equals(ty) && ext.contains(s(x, "tool_use_id"))) return true;
        }
        return false;
    }
    static boolean needsHuman(int tier, boolean tainted) { return tier >= 3 || (tier >= 2 && tainted); }
    public static String confirmToken(String secret, String tid, String uid, String id, String name) { return DdCrypto.hmacHex(String.valueOf(secret), "aitc|" + tid + "|" + uid + "|" + id + "|" + name).substring(0, 40); }
    static boolean safeEq(String a, String b) { return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8)); }

    /** 요청 점검 — 위반이면 [status, code, msg, detail(JSON 문자열)] */
    public static Object[] checkRequest(JsonNode b, String secret, String tid, String uid) {
        JsonNode ms = get(b, "mcp_servers");
        if (ms != null) { boolean ok = ms.isArray(); if (ok) for (JsonNode x : ms) if (!mcpAllowed(s(x, "url"))) ok = false; if (!ok) return new Object[]{ 403, "mcp_not_allowed", "허용목록에 없는 MCP 서버는 연결할 수 없습니다.", "{}" }; }
        List<JsonNode> tools = arr(get(b, "tools")); List<String> bad = new ArrayList<>();
        for (JsonNode t : tools) { if (t == null || !t.isObject()) continue; String y = s(t, "type");
            if ("mcp_toolset".equals(y)) return new Object[]{ 403, "mcp_not_allowed", "허용목록에 없는 MCP 서버는 연결할 수 없습니다.", "{}" };
            if ((y.isEmpty() || "custom".equals(y)) && tierOf(toolName(t)) < 0) bad.add(toolName(t)); }
        if (!bad.isEmpty()) {
            List<String> b5 = bad.subList(0, Math.min(5, bad.size())); String j = String.join(", ", b5); if (j.length() > 200) j = j.substring(0, 200);
            ArrayNode d = F.arrayNode(); for (String x : b5) d.add(x.length() > 60 ? x.substring(0, 60) : x); ObjectNode dd = F.objectNode(); dd.set("tools", d);
            return new Object[]{ 400, "tool_unregistered", "등급이 등록되지 않은 도구는 쓸 수 없습니다: " + j, dd.toString() };
        }
        List<JsonNode> M = arr(get(b, "messages")); JsonNode tc = get(b, "toolConfirm");
        for (int i = 0; i < M.size(); i++) {
            if (!strictEq(get(M.get(i), "role"), "assistant")) continue;
            List<JsonNode> uses = new ArrayList<>(); for (JsonNode x : blocks(M.get(i))) if ("tool_use".equals(s(x, "type"))) uses.add(x);
            if (uses.isEmpty()) continue;
            boolean tainted = taintedBefore(M, i); for (JsonNode x : blocks(M.get(i))) if (EXT_BLOCKS.contains(s(x, "type"))) tainted = true; List<JsonNode> res = new ArrayList<>(); if (i + 1 < M.size()) for (JsonNode x : blocks(M.get(i + 1))) if ("tool_result".equals(s(x, "type"))) res.add(x);
            for (JsonNode u : uses) {
                int tier = tierOf(s(u, "name")); int t2 = tier < 0 ? 3 : tier; if (!needsHuman(t2, tainted)) continue;
                JsonNode r = null; for (JsonNode x : res) if (s(x, "tool_use_id").equals(s(u, "id"))) { r = x; break; }
                if (r == null) continue; JsonNode ie = get(r, "is_error"); if (ie != null && ie.isBoolean() && ie.booleanValue()) continue;
                JsonNode tok = tc != null && tc.isObject() ? tc.get(s(u, "id")) : null;
                if (!(tok != null && tok.isTextual() && safeEq(tok.textValue(), confirmToken(secret, tid, uid, s(u, "id"), s(u, "name"))))) {
                    ObjectNode d = F.objectNode(); String id = s(u, "id"), nm = s(u, "name"); d.put("id", id.length() > 80 ? id.substring(0, 80) : id); d.put("name", nm.length() > 60 ? nm.substring(0, 60) : nm); d.put("tier", t2);
                    return new Object[]{ 428, "tool_confirm_required", "외부 출처를 읽은 뒤의 발송 · 고위험 작업은 운영자 확인 후에만 이어갈 수 있습니다.", d.toString() };
                }
            }
        }
        return null;
    }
    /** 응답 점검 — 사람 확인이 필요한 tool_use [{id,name,tier}] */
    public static ArrayNode checkResponse(JsonNode messages, JsonNode content) {
        List<JsonNode> M = arr(messages); List<JsonNode> C = arr(content);
        boolean tainted = taintedBefore(M, M.size()); for (JsonNode x : C) if (x != null && EXT_BLOCKS.contains(s(x, "type"))) tainted = true;
        ArrayNode out = F.arrayNode();
        for (JsonNode x : C) { if (x == null || !"tool_use".equals(s(x, "type"))) continue; int t = tierOf(s(x, "name")); if (t < 0) t = 3;
            if (needsHuman(t, tainted)) { ObjectNode o = out.addObject(); o.set("id", x.get("id")); o.set("name", x.get("name")); o.put("tier", t); } }
        return out;
    }

    /* ── 도구 목록 해시(Node canon과 같은 직렬화: 키 정렬 · JSON.stringify 문자열 규칙) ── */
    static void str(StringBuilder sb, String v) {
        sb.append('"');
        for (int i = 0; i < v.length(); i++) { char c = v.charAt(i);
            switch (c) { case '"': sb.append("\\\""); break; case '\\': sb.append("\\\\"); break; case '\b': sb.append("\\b"); break; case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break; case '\r': sb.append("\\r"); break; case '\t': sb.append("\\t"); break;
                default: if (c < 0x20) sb.append(String.format("\\u%04x", (int) c)); else sb.append(c); } }
        sb.append('"');
    }
    public static void canon(StringBuilder sb, JsonNode v) {
        if (v == null || v.isNull() || v.isMissingNode()) { sb.append("null"); return; }
        if (v.isArray()) { sb.append('['); int i = 0; for (JsonNode x : v) { if (i++ > 0) sb.append(','); canon(sb, x); } sb.append(']'); return; }
        if (v.isObject()) { List<String> ks = new ArrayList<>(); v.fieldNames().forEachRemaining(ks::add); Collections.sort(ks); sb.append('{'); int i = 0;
            for (String k : ks) { if (i++ > 0) sb.append(','); str(sb, k); sb.append(':'); canon(sb, v.get(k)); } sb.append('}'); return; }
        if (v.isTextual()) { str(sb, v.textValue()); return; }
        sb.append(v.toString());
    }
    public static String toolsHash(List<? extends JsonNode> tools) {
        List<ObjectNode> L = new ArrayList<>();
        for (JsonNode t : tools) { ObjectNode o = F.objectNode(); for (String k : List.of("name", "scope", "description", "inputSchema")) if (t.has(k)) o.set(k, t.get(k)); L.add(o); }
        L.sort(Comparator.comparing(o -> o.get("name").asText()));
        ArrayNode a = F.arrayNode(); L.forEach(a::add); StringBuilder sb = new StringBuilder(); canon(sb, a);
        try { return "sha256:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(sb.toString().getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
}
