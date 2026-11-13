import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.didisam.ledger.service.impl.DdLedgerCalc;
import java.nio.file.Files;
import java.nio.file.Path;

/** v41 계산 기준값 — tests/ledger-vectors.json(Node · 브라우저 ledgercalc.js와 같은 out)을 Java DdLedgerCalc로 깊은 비교한다.
 *  실행: (빌드 후) cd service-egov && java -cp "target/classes:target/didisam-egov/WEB-INF/lib/*" test/LedgerVectors.java ../tests/ledger-vectors.json */
public class LedgerVectors {
    static int ok = 0, bad = 0; static final ObjectMapper M = new ObjectMapper();
    static void eq(String name, JsonNode got, JsonNode want) throws Exception { if (M.readTree(got.toString()).equals(M.readTree(want.toString()))) ok++; else { bad++; System.out.println("실패 " + name + "\n  결과 " + got + "\n  기대 " + want); } }
    public static void main(String[] a) throws Exception {
        JsonNode V = M.readTree(Files.readString(Path.of(a.length > 0 ? a[0] : "../tests/ledger-vectors.json")));
        for (JsonNode v : V.get("balance")) eq("balance " + v.path("name").asText(), DdLedgerCalc.balance(v.get("in").get("charges"), v.get("in").get("allocs")), v.get("out"));
        for (JsonNode v : V.get("allocate")) eq("allocate " + v.path("name").asText(), DdLedgerCalc.allocate(DdLedgerCalc.I(v.get("in").get("amount")), v.get("in").get("open")), v.get("out"));
        for (JsonNode v : V.get("summary")) eq("summary " + v.path("name").asText(), DdLedgerCalc.summary(v.get("in").get("rows"), v.get("in").get("opt")), v.get("out"));
        for (JsonNode v : V.get("share")) eq("share " + v.path("name").asText(), DdLedgerCalc.share(v.get("in").get("rows"), v.get("in").get("units")), v.get("out"));
        for (JsonNode v : V.get("refund")) eq("refund " + v.path("name").asText(), DdLedgerCalc.refund(v.get("in")), v.get("out"));
        for (JsonNode v : V.get("match")) eq("match " + v.path("name").asText(), DdLedgerCalc.match(v.get("in").get("rows"), v.get("in").get("cands"), v.get("in").get("opt")), v.get("out"));
        System.out.println("ledger 기준값: 통과 " + ok + " · 실패 " + bad); if (bad > 0) System.exit(1);
    }
}
