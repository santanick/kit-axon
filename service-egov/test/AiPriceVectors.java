/* v47 AI 요금 · 충전 이월 대조(Node service/test/aiusage47.test.js의 할인 경계값 · 10만 원 단위 · 만료 전날 · 당일 · 다음 날과 같은 값)
 *  실행: (빌드 후) cd service-egov && java -cp "target/classes:target/didisam-egov/WEB-INF/lib/*" test/AiPriceVectors.java */
import egovframework.didisam.cmm.DdAiPrice;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
public class AiPriceVectors {
  static int bad = 0; static void ok(boolean c, String m) { if (!c) { bad++; System.out.println("FAIL " + m); } }
  static Map<String, Object> cr(String id, long t, String day) { Map<String, Object> m = new HashMap<>(); m.put("id", id); m.put("tokens", t); m.put("pday", day); m.put("pack", "w1"); m.put("amount", 1L); return m; }
  static Map<String, Object> u(String day, long n) { return Map.of("day", day, "n", n); }
  public static void main(String[] a) throws Exception {
    ObjectMapper J = new ObjectMapper();
    long[][] cases = {{100000,0},{400000,0},{500000,5},{900000,5},{1000000,10},{2900000,10},{3000000,15},{4900000,15},{5000000,20},{9900000,20},{10000000,25},{19900000,25},{20000000,30},{100000000,30}};
    for (long[] c : cases) { Map<String, Object> q = DdAiPrice.quote(J.valueToTree(c[0])); ok(((Long) q.get("discount")) == c[1] && ((Long) q.get("tokens")) == c[0] * 5000 / (100 - c[1]), "quote " + c[0]); }
    for (Object b : new Object[]{0, 50000, 150000, 100001, 100000.5, -100000, 100100000, "abc"}) ok(DdAiPrice.quote(J.valueToTree(b)) == null, "bad " + b);
    ok(DdAiPrice.quote(J.valueToTree("300000")) != null, "str");
    ok(DdAiPrice.addDays("2027-03-01", 365).equals("2028-02-29"), "addDays");
    DdAiPrice.Sim r = DdAiPrice.sim(List.of(cr("a", 1000, "2026-01-10"), cr("b", 1000, "2026-02-05")), List.of(u("2026-01-05", 400), u("2026-01-20", 800), u("2026-02-10", 900)), 500, "2026-02-20");
    ok(r.thisMonth() == 400 && r.left() == 900 && r.credit() == 1300, "sim1 " + r);
    var K = List.of(cr("k", 1000, "2026-11-24"));
    ok(DdAiPrice.sim(K, List.of(), 0, "2027-11-23").left() == 1000, "전날"); ok(DdAiPrice.sim(K, List.of(), 0, "2027-11-24").left() == 1000, "당일"); ok(DdAiPrice.sim(K, List.of(), 0, "2027-11-25").left() == 0, "다음 날");
    ok(DdAiPrice.sim(K, List.of(u("2027-11-24", 300)), 0, "2027-11-24").left() == 700, "당일 차감"); ok(DdAiPrice.sim(K, List.of(u("2027-11-25", 300)), 0, "2027-11-25").credit() == 0, "다음 날 차감 없음");
    r = DdAiPrice.sim(List.of(cr("n", 100, "2027-11-01"), cr("o", 100, "2026-12-01")), List.of(u("2027-11-10", 150)), 0, "2027-11-10"); ok(r.live().get(0).get("left").equals(0L) && r.live().get(1).get("left").equals(50L), "fifo " + r.live());
    /* 월 기본 포함량(Node aiusage47.test.js와 같은 값): 유료 250만 · 체험 100만, 비우면 기본값, 0 유지 */
    ok(DdAiPrice.PAID_MONTH_TOKENS == 2500000 && DdAiPrice.TRIAL_TOKENS == 1000000, "기본 포함량"); ok(DdAiPrice.priceInfo().get("paidMonthTokens").equals(2500000L) && DdAiPrice.priceInfo().get("trialTokens").equals(1000000L), "priceInfo");
    { ObjectMapper om = new ObjectMapper();
      try { ok(DdAiPrice.santaInput(om.readTree("{\"code\":\"E2\"}"), "d").get("aiMonthTokens").asLong() == 2500000, "빈값 유료"); ok(DdAiPrice.santaInput(om.readTree("{\"code\":\"U0\",\"aiMonthTokens\":\"\"}"), "d").get("aiMonthTokens").asLong() == 2500000, "빈 문자열");
        ok(DdAiPrice.santaInput(om.readTree("{\"code\":\"TRIAL\",\"aiMonthTokens\":null}"), "d").get("aiMonthTokens").asLong() == 1000000, "빈값 체험"); ok(DdAiPrice.santaInput(om.readTree("{\"code\":\"E3\",\"aiMonthTokens\":0}"), "d").get("aiMonthTokens").asLong() == 0, "0 유지"); }
      catch (Exception e) { ok(false, "santaInput " + e); } }
    System.out.println(bad == 0 ? "AiPriceVectors PASS" : "AiPriceVectors FAIL " + bad); System.exit(bad == 0 ? 0 : 1);
  }
}
