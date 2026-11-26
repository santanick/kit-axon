import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.didisam.market.service.impl.DdMarketCalc;
import java.nio.file.Files;
import java.nio.file.Path;

/** 콘텐츠 마켓 v1.1 계산 기준값 — tests/market-vectors.json(Node · 브라우저 marketcalc.js와 같은 out)을 Java DdMarketCalc로 깊은 비교한다.
 *  호출 규칙은 tests/market-vectors-run.js와 같다(DdMarketCalc.run). cases 외의 배열 묶음(예: margin)도 같은 형식이면 모두 실행한다.
 *  실행: (빌드 후) cd service-egov && java -cp "target/classes:target/didisam-egov/WEB-INF/lib/*" test/MarketVectors.java ../tests/market-vectors.json */
public class MarketVectors {
    static int ok = 0, bad = 0; static final ObjectMapper M = new ObjectMapper();
    public static void main(String[] a) throws Exception {
        JsonNode V = M.readTree(Files.readString(Path.of(a.length > 0 ? a[0] : "../tests/market-vectors.json")));
        var it = V.fields();
        while (it.hasNext()) { var e = it.next(); if (!e.getValue().isArray()) continue;
            for (JsonNode c : e.getValue()) { if (!c.has("fn") || !c.has("out")) continue; String name = e.getKey() + " " + c.path("name").asText();
                JsonNode got; try { got = "margin".equals(e.getKey()) ? DdMarketCalc.runMargin(c.get("fn").asText(), c.get("in")) : DdMarketCalc.run(c.get("fn").asText(), c.get("in")); } catch (Exception x) { bad++; System.out.println("오류 " + name + " " + x); continue; }
                if (M.readTree(String.valueOf(got)).equals(M.readTree(c.get("out").toString()))) ok++; else { bad++; System.out.println("실패 " + name + "\n  결과 " + got + "\n  기대 " + c.get("out")); } } }
        System.out.println("market 기준값: 통과 " + ok + " · 실패 " + bad); if (bad > 0 || ok == 0) System.exit(1);
    }
}
