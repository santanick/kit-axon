package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** v31.1 기관 문서의 개인정보 항목 암호화 — Node service/server/statecrypt.js와 같은 형식 */
@Service("ddStateCrypto")
public class DdStateCrypto extends EgovAbstractServiceImpl {
    static final String PFX = "enc1:";
    static final Map<String, List<String>> SET = Map.of("members", List.of("name", "nick", "email", "phone"), "parents", List.of("name", "phone"), "codes", List.of("code"), "admins", List.of("name", "email"), "consults", List.of("title", "summary", "text", "note", "memo", "transcript"), "msgs", List.of("to", "title", "body"));
    private final DdPiiCrypto c;
    public DdStateCrypto(DdPiiCrypto c) { this.c = c; }

    static String idOf(String kind, JsonNode x) { JsonNode v = x.get("codes".equals(kind) ? "sid" : "id"); return v == null || v.isNull() ? "" : v.asText(); }
    static String aad(String tid, String kind, JsonNode x, String f) { return tid + "|state|" + kind + "|" + idOf(kind, x) + "|" + f; }
    private String dec(String s, String aad) throws Exception { if (!c.ready()) throw processException("dd.503.state_key"); try { return c.dec(s.substring(PFX.length()), aad); } catch (IllegalStateException e) { throw processException("dd.503.state_key"); } }
    public JsonNode seal(JsonNode doc, String tid) {
        if (!c.ready() || doc == null || !doc.isObject()) return doc; ObjectNode out = ((ObjectNode) doc).deepCopy();
        for (String kind : SET.keySet()) { JsonNode arr = out.get(kind); if (arr == null || !arr.isArray()) continue;
            for (JsonNode n : (ArrayNode) arr) { if (!n.isObject()) continue; ObjectNode x = (ObjectNode) n;
                for (String f : SET.get(kind)) { JsonNode v = x.get(f); if (v != null && v.isTextual() && !v.asText().isEmpty()) x.put(f, PFX + c.enc(v.asText(), aad(tid, kind, x, f))); }
                if ("members".equals(kind)) { JsonNode e = x.get("extra"); if (e != null && (e.isObject() || e.isArray()) && !e.isEmpty()) x.put("extra", PFX + c.enc(e.toString(), aad(tid, kind, x, "extra"))); }
            } }
        return out;
    }
    public JsonNode open(JsonNode doc, String tid) throws Exception {
        if (doc == null || !doc.isObject()) return doc; ObjectNode out = ((ObjectNode) doc).deepCopy();
        for (String kind : SET.keySet()) { JsonNode arr = out.get(kind); if (arr == null || !arr.isArray()) continue;
            for (JsonNode n : (ArrayNode) arr) { if (!n.isObject()) continue; ObjectNode x = (ObjectNode) n;
                for (String f : SET.get(kind)) { JsonNode v = x.get(f); if (v != null && v.isTextual() && v.asText().startsWith(PFX)) x.put(f, dec(v.asText(), aad(tid, kind, x, f))); }
                if ("members".equals(kind)) { JsonNode e = x.get("extra"); if (e != null && e.isTextual() && e.asText().startsWith(PFX)) x.set("extra", DdWeb.JSON.readTree(dec(e.asText(), aad(tid, kind, x, "extra")))); }
            } }
        return out;
    }
    public JsonNode memberName(JsonNode m, String tid) throws Exception { JsonNode v = m.get("name"); if (v != null && v.isTextual() && v.asText().startsWith(PFX)) return DdWeb.JSON.getNodeFactory().textNode(dec(v.asText(), aad(tid, "members", m, "name"))); return v; }
}
