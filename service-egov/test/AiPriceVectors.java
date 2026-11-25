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
    /* 체험 종료(Node aiusage47.test.js와 같은 값): since 11-01 → 11-14까지 체험, 11-15부터 포함량 0 · on · trialEnded */
    { ObjectMapper om = new ObjectMapper(); var ap = om.readTree("{\"monthTokens\":1000000,\"overage\":\"pack\"}"); var tr = om.readTree("{\"code\":\"TRIAL\",\"since\":\"2026-11-01\"}");
      var in = DdAiPrice.planOf(ap, tr, "2026-11-14"); ok(Boolean.TRUE.equals(in.get("on")) && in.get("monthTokens").equals(1000000L) && !in.containsKey("trialEnded"), "체험 중 " + in);
      var end = DdAiPrice.planOf(ap, tr, "2026-11-15"); ok(Boolean.TRUE.equals(end.get("on")) && end.get("monthTokens").equals(0L) && Boolean.TRUE.equals(end.get("trialEnded")), "체험 종료 " + end);
      ok(Boolean.TRUE.equals(DdAiPrice.planOf(null, tr, "2026-12-01").get("trialEnded")), "체험 종료 aiplan 없음");
      ok(DdAiPrice.planOf(ap, om.readTree("{\"code\":\"E1\",\"since\":\"2026-01-01\"}"), "2026-11-15").get("monthTokens").equals(1000000L), "유료 불변");
      ok(Boolean.FALSE.equals(DdAiPrice.planOf(null, om.readTree("{\"code\":\"E1\",\"aiMonthTokens\":0}"), "2026-11-15").get("on")), "Enterprise 0 한도 없음");
      ok(Boolean.FALSE.equals(DdAiPrice.planOf(null, null, "2026-11-15").get("on")), "기존 기관 불변"); ok(!DdAiPrice.trialEnded(om.readTree("{\"code\":\"TRIAL\",\"since\":\"x\"}"), "2026-11-15"), "since 오류");
      try { DdAiPrice.guard(end, 0, 500, true); } catch (Exception e) { ok(false, "충전 있으면 허용 " + e); }
      try { DdAiPrice.guard(end, 500, 500, true); ok(false, "충전 소진 차단"); } catch (egovframework.didisam.cmm.DdException e) { ok(e.getMessage().equals(DdAiPrice.MSG_TRIAL_LEARNER) && "trial_ended".equals(e.getCode()), "trial 문구 " + e.getMessage()); }
      try { DdAiPrice.guard(in, 1000000, 0, false); ok(false, "체험 중 한도"); } catch (egovframework.didisam.cmm.DdException e) { ok(e.getMessage().equals(DdAiPrice.MSG_STAFF) && "ai_month_quota".equals(e.getCode()), "quota 문구"); }
      /* 체험 중 since부터 누적(Node와 같은 값): since 11-25 → 12-02, 11월 60만 + 12월 60만 = 120만 → 20만은 충전에서, 11-20(체험 전)은 제외 */
      ok("2026-11-01".equals(in.get("trialSince")) && !end.containsKey("trialSince") && !DdAiPrice.planOf(ap, tr, "2026-10-31").containsKey("trialSince") && !DdAiPrice.planOf(null, tr, "2026-11-05").containsKey("trialSince"), "trialSince " + in);
      var td = DdAiPrice.planOf(ap, om.readTree("{\"code\":\"TRIAL\",\"since\":\"2026-11-25\"}"), "2026-12-02"); ok("2026-11-25".equals(td.get("trialSince")) && "2026-11-25".equals(DdAiPrice.usedFrom(td, "2026-12-02")), "달 넘김 since " + td);
      ok("2026-12-01".equals(DdAiPrice.usedFrom(end, "2026-12-02")), "usedFrom 월");
      var sm = DdAiPrice.sim(List.of(cr("c1", 5000000, "2026-11-25")), List.of(u("2026-11-20", 900000), u("2026-11-28", 600000), u("2026-12-02", 600000)), 1000000, "2026-12-02", "2026-11-25");
      ok(sm.thisMonth() == 200000 && sm.left() == 4800000, "달 넘김 누적 " + sm.thisMonth() + " " + sm.left());
      ok(DdAiPrice.sim(List.of(cr("c1", 5000000, "2026-11-25")), List.of(u("2026-11-20", 900000), u("2026-11-28", 600000), u("2026-12-02", 600000)), 1000000, "2026-12-02").thisMonth() == 0, "월 집계 대조");
      try { DdAiPrice.guard(td, 1200000, 0, false); ok(false, "체험 120만 차단"); } catch (egovframework.didisam.cmm.DdException e) { ok("ai_month_quota".equals(e.getCode()), "체험 누적 quota"); }
      try { DdAiPrice.guard(td, 1200000, sm.credit(), false); } catch (Exception e) { ok(false, "충전 있으면 허용 " + e); }
      /* 충전 거절(409)은 유료 + 차단만 */
      var apb = om.readTree("{\"monthTokens\":1000000,\"overage\":\"block\"}");
      ok(!DdAiPrice.topupBlocked(DdAiPrice.planOf(apb, tr, "2026-11-15")) && DdAiPrice.topupBlocked(DdAiPrice.planOf(apb, om.readTree("{\"code\":\"E1\",\"since\":\"2026-11-01\"}"), "2026-11-15")) && DdAiPrice.topupBlocked(DdAiPrice.planOf(apb, tr, "2026-11-10")) && !DdAiPrice.topupBlocked(DdAiPrice.planOf(ap, tr, "2026-11-15")), "topupBlocked"); }
    System.out.println(bad == 0 ? "AiPriceVectors PASS" : "AiPriceVectors FAIL " + bad); System.exit(bad == 0 ? 0 : 1);
  }
}
