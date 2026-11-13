import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.didisam.fac.service.impl.DdFac;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** v40 계산 기준값 단위 테스트 — tests/fac-vectors.json(Node service/test/fac40.test.js와 같은 방식)을 Java DdFac로 돌린다.
 *  실행: (빌드 후) cd service-egov && java -cp "target/classes:target/didisam-egov/WEB-INF/lib/*" test/FacVectors.java ../tests/fac-vectors.json */
public class FacVectors {
    static int ok = 0, bad = 0; static final ObjectMapper M = new ObjectMapper();
    static void eq(String name, Object got, Object want) { String g = M.valueToTree(got).toString(), w = M.valueToTree(want).toString(); if (g.equals(w)) ok++; else { bad++; System.out.println("실패 " + name + ": 결과 " + g + " / 기대 " + w); } }
    static Double dn(JsonNode v) { return v == null || v.isNull() || v.isMissingNode() ? null : v.asDouble(); }

    public static void main(String[] a) throws Exception {
        JsonNode V = M.readTree(Files.readString(Path.of(a.length > 0 ? a[0] : "../tests/fac-vectors.json")));
        java.util.function.Function<JsonNode, JsonNode> fac = x -> x.isTextual() ? V.get("facilities").get(x.asText()) : x, prod = x -> x == null || x.isNull() ? null : x.isTextual() ? V.get("products").get(x.asText()) : x;
        for (JsonNode v : V.get("quote")) { JsonNode in = v.get("in"); JsonNode o = DdFac.quote(fac.apply(in.get("fac")), in.path("aud").asText(), in.path("day").asText(null), in.has("startSlot") ? in.get("startSlot").asDouble() : Double.NaN, in.has("slots") ? in.get("slots").asDouble() : Double.NaN, prod.apply(in.get("product")));
            v.get("out").fieldNames().forEachRemaining(k -> eq("quote " + v.path("name").asText() + ": " + k, o.get(k), v.get("out").get(k))); }
        for (JsonNode v : V.get("slots")) { List<?> S = DdFac.slotsOf(fac.apply(v.get("in").get("fac")), v.get("in").get("day").asText()); eq(v.path("name").asText(), S.size(), v.get("out").get("count").asInt());
            if (v.get("out").has("first")) { eq(v.path("name").asText() + " first", S.get(0), v.get("out").get("first")); eq(v.path("name").asText() + " last", S.get(S.size() - 1), v.get("out").get("last")); } }
        for (JsonNode v : V.get("slotTime")) { JsonNode in = v.get("in"); long[] T = DdFac.slotTime(fac.apply(in.get("fac")), in.get("day").asText(), in.get("startSlot").asInt(), in.get("slots").asInt()); eq("slotTime start", T[0], DdFac.ms(v.get("out").get("startAt").asText())); eq("slotTime end", T[1], DdFac.ms(v.get("out").get("endAt").asText())); }
        for (JsonNode v : V.get("openState")) { JsonNode in = v.get("in"); JsonNode o = DdFac.openState(fac.apply(in.get("fac")), in.get("day").asText(), DdFac.ms(in.get("now").asText()));
            v.get("out").fieldNames().forEachRemaining(k -> eq("open " + v.path("name").asText() + ": " + k, o.get(k), v.get("out").get(k))); }
        for (JsonNode v : V.get("refund")) { com.fasterxml.jackson.databind.node.ObjectNode in = v.get("in").deepCopy(); if (in.get("rule").isTextual()) in.set("rule", V.get("facilities").get(in.get("rule").asText()).get("refund")); eq("refund " + v.path("name").asText(), DdFac.refund(in).get("auto"), v.get("out").get("auto")); }
        for (JsonNode v : V.get("lateFee")) { JsonNode in = v.get("in"); long[] r = DdFac.lateFee(in.get("dueDay").asText(), in.get("returnDay").asText(), in.path("perDay").asDouble(0), dn(in.get("cap"))); eq("lateFee " + in, M.createObjectNode().put("days", r[0]).put("fee", r[1]), v.get("out")); }
        for (JsonNode v : V.get("noShow")) { JsonNode in = v.get("in"); eq("noShow " + v.path("name").asText(), DdFac.isNoShow(in.path("status").asText(), in.path("checkedIn").asBoolean(), DdFac.ms(in.get("startAt").asText()), dn(in.get("noShowMin")), DdFac.ms(in.get("now").asText())), v.get("out").asBoolean()); }
        for (JsonNode v : V.get("suspension")) { JsonNode in = v.get("in"); List<String> d = new ArrayList<>(); in.get("noShowDays").forEach(x -> d.add(x.asText()));
            eq("suspension " + v.path("name").asText(), DdFac.suspension(d, in.path("strikes").asDouble(Double.NaN), in.path("days").asDouble(Double.NaN), in.get("today").asText()), v.get("out")); }
        for (JsonNode v : V.get("dupSame")) eq("dupSame " + v.get("in"), DdFac.dupSame(v.get("in").get("existing"), v.get("in").get("req")), v.get("out").asBoolean());
        System.out.println("Java DdFac 계산 기준값: 통과 " + ok + " · 실패 " + bad);
        System.exit(bad == 0 ? 0 : 1);
    }
}
