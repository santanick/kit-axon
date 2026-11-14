package egovframework.didisam.ledger.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdPiiCrypto;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdStateCrypto;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.fac.service.impl.FacErr;
import egovframework.didisam.ledger.service.LedgerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** v41 통합 수납 원장(09 개발 규격) — Node service/server/ledger(index · mod-admin · mod-pub · import · share · sweep)와 같은 /api · 오류 코드 · 응답 JSON.
 *  계산은 DdLedgerCalc(= didisam/ledgercalc.js) 하나. 금액은 언제나 서버가 청구 잔액으로 다시 계산하고, 토스 승인 · 취소는 서버가 확정한다.
 *  시설(v40) 결제 · 환불의 원장 이중 기록은 DB 트리거(led_fac_pay · led_fac_refund)라 Java 쪽 코드가 따로 없다. */
@Service("ledgerService")
public class LedgerServiceImpl extends EgovAbstractServiceImpl implements LedgerService {
    static final Pattern DAY = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$"), YM = Pattern.compile("^\\d{4}-\\d{2}$"), LC = Pattern.compile("^lc_[a-z0-9]{12}$"), LU = Pattern.compile("^lu_[a-z0-9]{4,24}$");
    static final List<String> ITEM = List.of("tuition", "book", "facility", "pass", "rental", "program", "event", "etc"), DESK = List.of("desk_card", "cash", "transfer", "voucher");
    static final String AZ = "abcdefghijklmnopqrstuvwxyz0123456789", PFX = "enc1:";
    private static final SecureRandom RND = new SecureRandom();
    @org.springframework.beans.factory.annotation.Autowired @org.springframework.context.annotation.Lazy private egovframework.didisam.mileage.service.MileService mile; /* v42 환불 훅 */
    private final LedgerMapper m; private final TenantTx tx; private final DdRateLimiter rl; private final DdStateCrypto crypt; private final DdPiiCrypto pii; private final AuthService auth; private final DdWeb web;
    private final String tossKey, tossUrl, tossClient; private final long sweepMs; private final Map<String, Long> swept = new ConcurrentHashMap<>();
    private final HttpClient http = HttpClient.newBuilder().proxy(HttpClient.Builder.NO_PROXY).connectTimeout(Duration.ofSeconds(10)).build();

    public LedgerServiceImpl(LedgerMapper m, TenantTx tx, DdRateLimiter rl, DdStateCrypto crypt, DdPiiCrypto pii, AuthService auth, DdWeb web,
                             @Value("${TOSS_SECRET_KEY:}") String tossKey, @Value("${TOSS_URL:https://api.tosspayments.com}") String tossUrl, @Value("${TOSS_CLIENT_KEY:}") String tossClient,
                             @Value("${LEDGER_SWEEP_MS:60000}") String sweepMs) {
        this.m = m; this.tx = tx; this.rl = rl; this.crypt = crypt; this.pii = pii; this.auth = auth; this.web = web;
        this.tossKey = tossKey == null ? "" : tossKey.trim(); this.tossUrl = (tossUrl == null || tossUrl.isEmpty() ? "https://api.tosspayments.com" : tossUrl).replaceAll("/+$", ""); this.tossClient = tossClient == null ? "" : tossClient;
        double s = num(sweepMs == null ? "" : sweepMs); this.sweepMs = Double.isNaN(s) ? 60000 : (long) Math.max(0, s);
    }

    // ── 공통 ───────────────────────────────────────────────
    static DdException E(int st, String code, String msg) { return new DdException(st, msg, code); }
    static DdException E(int st, String code, String msg, Map<String, Object> extra) { return new FacErr(st, code, msg, extra); }
    static Map<String, Object> map(Object... kv) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]); return o; }
    static String rid(String p) { byte[] b = new byte[12]; RND.nextBytes(b); StringBuilder s = new StringBuilder(p); for (byte x : b) s.append(AZ.charAt((x & 0xff) % 36)); return s.toString(); }
    static String b64(int n) { byte[] b = new byte[n]; RND.nextBytes(b); return Base64.getUrlEncoder().withoutPadding().encodeToString(b); }
    static String sha(String s) { try { byte[] h = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)); StringBuilder o = new StringBuilder(); for (byte x : h) o.append(String.format("%02x", x)); return o.toString(); } catch (Exception e) { throw new IllegalStateException(e); } }
    /** Node str(v, n) = String(v ?? '').slice(0, n) */
    static String str(JsonNode v, int n) { return cut(nullish(v) ? "" : Js_str(v), n); }
    static String Js_str(JsonNode v) { return egovframework.didisam.cmm.Js.str(v); }
    static String str(String v, int n) { return cut(v == null ? "" : v, n); }
    /** Node int(v) = Math.round(+v), 유한수가 아니면 NaN */
    static double I(JsonNode v) { double n = round(num(v)); return Double.isFinite(n) ? n : Double.NaN; }
    static double I(String v) { double n = round(v == null ? Double.NaN : num(v)); return Double.isFinite(n) ? n : Double.NaN; }
    static boolean isInt(double d) { return !Double.isNaN(d) && d == Math.rint(d); }
    static long L(Object o) { return o instanceof Number ? ((Number) o).longValue() : 0; }
    static String s(Object o) { return o == null ? null : String.valueOf(o); }
    static boolean B(Object o) { return Boolean.TRUE.equals(o); }
    static String today() { return kstToday(); }
    static final java.time.format.DateTimeFormatter ISO = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);
    static String iso(Instant t) { return ISO.format(t); }
    static String qp(HttpServletRequest q, String k) { String v = q.getParameter(k); return v == null ? "" : v; }
    static List<String> ids(JsonNode v, int max) { if (v == null || !v.isArray()) return new ArrayList<>(); Set<String> o = new LinkedHashSet<>(); for (JsonNode x : v) { String s = str(x, 40); if (LC.matcher(s).matches()) o.add(s); } List<String> l = new ArrayList<>(o); return l.size() > max ? new ArrayList<>(l.subList(0, max)) : l; }
    static List<String> idsJson(Object json) { List<String> l = new ArrayList<>(); if (json == null) return l; for (JsonNode x : arr(parse(String.valueOf(json)))) l.add(x.asText()); return l; }
    static String json(Object o) { return DdWeb.JSON.valueToTree(o).toString(); }
    void audit(String tid, String who, String act, Object detail) { tx.audit(tid, who, act, json(detail)); }

    // ── 기관 플래그 · 단위 · 토스 키 ─────────────────────────
    void needOn(String tid) { Map<String, Object> r = m.selectOn(tid); if (r == null) throw E(404, "tenant", "없는 기관입니다."); if (!"true".equals(r.get("v"))) throw E(403, "ledger_off", "매출 · 수납 기능을 켜지 않은 기관입니다."); }
    <T> T T(String tid, TenantTx.Work<T> fn) throws Exception { return tx.inTenant(tid, () -> { needOn(tid); return fn.run(); }); }
    List<Map<String, Object>> unitsOf(String tid) { m.ensureRoot(tid); return m.selectUnits(tid); }
    static ArrayNode unitCalc(List<Map<String, Object>> U) { ArrayNode a = F.arrayNode(); for (Map<String, Object> u : U) { ObjectNode x = a.addObject(); x.put("id", s(u.get("id"))); x.put("parent", s(u.get("parent_id"))); x.put("shareRateBp", L(u.get("share_rate_bp"))); } return a; }
    Map<String, Object> unitOf(String tid, JsonNode id) { String k = str(truthy(id) ? id : t("lu_root"), 30); Map<String, Object> u = m.selectUnit(tid, k); if (u == null || !B(u.get("active"))) throw E(404, "unit", "없는 단위입니다."); return u; }
    String seal(String tid, String id, String v) { if (!pii.ready()) throw E(503, "state_key", "암호화 키(PII_KEY)가 없어 비밀키를 저장할 수 없습니다."); return PFX + pii.enc(v, tid + "|ledger|unit|" + id + "|toss_secret"); }
    String open(String tid, String id, String sv) { if (sv == null || sv.isEmpty() || !pii.ready()) return ""; try { return pii.dec(sv.substring(PFX.length()), tid + "|ledger|unit|" + id + "|toss_secret"); } catch (Exception e) { return ""; } }

    /** 토스 승인 · 취소(Node fac/pay.js createPay와 같은 요청) */
    final class Pay {
        final String key, clientKey;
        Pay(String key, String clientKey) { this.key = key == null ? "" : key.trim(); this.clientKey = clientKey; }
        boolean online() { return !key.isEmpty(); }
        JsonNode post(String path, ObjectNode body, String idem) {
            try { HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(tossUrl + path)).timeout(Duration.ofSeconds(15))
                    .header("authorization", "Basic " + Base64.getEncoder().encodeToString((key + ":").getBytes(StandardCharsets.UTF_8))).header("content-type", "application/json");
                if (idem != null) b.header("idempotency-key", idem);
                HttpResponse<String> r = http.send(b.POST(HttpRequest.BodyPublishers.ofString(body.toString())).build(), HttpResponse.BodyHandlers.ofString());
                JsonNode j; try { j = DdWeb.JSON.readTree(r.body()); } catch (Exception e) { j = null; } if (j == null || !j.isObject()) j = F.objectNode();
                return F.objectNode().put("ok", r.statusCode() >= 200 && r.statusCode() < 300).set("j", j);
            } catch (java.net.http.HttpTimeoutException e) { return F.objectNode().put("ok", false).set("j", F.objectNode().put("code", "TIMEOUT")); }
            catch (Exception e) { return F.objectNode().put("ok", false).set("j", F.objectNode().put("code", "NETWORK")); }
        }
        /** {ok, amount} | {ok:false, code} */
        Object[] confirm(String paymentKey, String orderId, long amount) {
            if (!online()) return new Object[]{ false, 0L, null }; JsonNode r = post("/v1/payments/confirm", F.objectNode().put("paymentKey", paymentKey).put("orderId", orderId).put("amount", amount), "cf-" + orderId);
            if (!r.get("ok").asBoolean()) return new Object[]{ false, 0L, null }; double t = round(num(get(r.get("j"), "totalAmount"))); JsonNode u = get(r.get("j"), "receipt", "url");
            return new Object[]{ true, Double.isFinite(t) ? (long) t : 0L, u != null && u.isTextual() ? cut(u.asText(), 500) : null };
        }
        /** 취소 키 또는 null(실패) */
        String cancel(String paymentKey, String reason, Long amount, String idem) {
            if (!online()) return null; ObjectNode b = F.objectNode().put("cancelReason", cut(reason == null || reason.isEmpty() ? "고객 요청" : reason, 200)); if (amount != null) b.put("cancelAmount", amount);
            JsonNode r = post("/v1/payments/" + URLEncoder.encode(paymentKey == null ? "" : paymentKey, StandardCharsets.UTF_8).replace("+", "%20") + "/cancel", b, idem); if (!r.get("ok").asBoolean()) return null;
            JsonNode cs = get(r.get("j"), "cancels"); JsonNode c = cs != null && cs.isArray() && cs.size() > 0 ? cs.get(cs.size() - 1) : null; return c != null && truthy(get(c, "transactionKey")) ? Js_str(get(c, "transactionKey")) : "ok";
        }
    }
    /** 키 선택: 청구 단위 → 상위 → 기관 기본(TOSS_SECRET_KEY) */
    Pay payFor(String tid, String unitId) {
        Map<String, Map<String, Object>> by = new LinkedHashMap<>(); for (Map<String, Object> u : unitsOf(tid)) by.put(s(u.get("id")), u);
        Map<String, Object> u = by.containsKey(unitId) ? by.get(unitId) : by.get("lu_root"); Set<String> seen = new HashSet<>();
        while (u != null && seen.add(s(u.get("id")))) {
            if (u.get("toss_secret_enc") != null) { String k = open(tid, s(u.get("id")), s(u.get("toss_secret_enc"))); if (!k.isEmpty()) return new Pay(k, u.get("toss_client_key") != null ? s(u.get("toss_client_key")) : tossClient); }
            u = u.get("parent_id") != null ? by.get(s(u.get("parent_id"))) : null;
        }
        return new Pay(tossKey, tossClient);
    }

    // ── 청구 잔액 · 수납 기록 ───────────────────────────────
    static final class Lines { List<Map<String, Object>> charges = new ArrayList<>(); ObjectNode bal; Map<String, Map<String, Object>> by = new LinkedHashMap<>(); Map<String, JsonNode> line = new LinkedHashMap<>(); }
    Lines linesOf(String tid, List<String> ids, List<String> bills, String sid) {
        Lines L = new Lines();
        List<String> base = ids != null ? (ids.isEmpty() ? List.of() : m.selectBillsByIds(tid, ids)) : bills != null ? bills : m.selectBillsBySid(tid, sid);
        if (base.isEmpty()) { L.bal = DdLedgerCalc.balance(F.arrayNode(), F.arrayNode()); return L; }
        L.charges = m.selectChargesOfBills(tid, base); ArrayNode ch = F.arrayNode(), al = F.arrayNode(); List<String> cids = new ArrayList<>();
        for (Map<String, Object> x : L.charges) { ObjectNode c = ch.addObject(); c.put("id", s(x.get("id"))); c.put("bill", s(x.get("bill_id"))); c.put("amount", L(x.get("amount"))); c.put("due", s(x.get("due"))); c.put("at", s(x.get("at_s"))); c.put("status", s(x.get("status"))); cids.add(s(x.get("id"))); L.by.put(s(x.get("id")), x); }
        for (Map<String, Object> a : m.selectAllocSums(tid, cids)) al.addObject().put("charge", s(a.get("charge_id"))).put("amount", L(a.get("amount")));
        L.bal = DdLedgerCalc.balance(ch, al); for (JsonNode l : L.bal.get("lines")) L.line.put(l.get("id").asText(), l); return L;
    }
    void refreshStatus(String tid, List<String> bills) {
        if (bills.isEmpty()) return; Lines L = linesOf(tid, null, bills, null);
        for (JsonNode l : L.bal.get("lines")) { Map<String, Object> x = L.by.get(l.get("id").asText()); if (x != null && !l.get("status").asText().equals(x.get("status"))) m.updateChargeStatus(l.get("status").asText(), tid, l.get("id").asText()); }
    }
    static final class Rec { String id, unit, sid, method, channel, paidAt, approvalNo, cardIssuer, terminalId, by, diffReason, idem, paymentKey, orderId, linkHash; long amount; Integer installment; boolean share; List<String> chargeIds = new ArrayList<>(); }
    /** 수납 기록 + 배분(오래된 청구부터). chargeIds · sid가 없으면 배분 없는 수납 → {row, allocs} */
    Object[] record(String tid, Rec r) {
        ArrayNode allocs = F.arrayNode(); List<String> bills = new ArrayList<>(); boolean byIds = !r.chargeIds.isEmpty();
        if (byIds || (r.sid != null && !r.sid.isEmpty())) {
            Lines L = byIds ? linesOf(tid, r.chargeIds, null, null) : linesOf(tid, null, null, r.sid);
            if (byIds) { long n = L.charges.stream().filter(x -> r.chargeIds.contains(s(x.get("id")))).count(); if (n != new HashSet<>(r.chargeIds).size()) throw E(404, "charge", "없는 청구입니다.");
                if (r.sid != null && !r.sid.isEmpty() && L.charges.stream().anyMatch(x -> r.chargeIds.contains(s(x.get("id"))) && !r.sid.equals(x.get("sid")))) throw E(400, "charge", "다른 학습자의 청구입니다."); }
            ArrayNode open = F.arrayNode();
            for (JsonNode l : L.bal.get("lines")) { String id = l.get("id").asText(); if (byIds && !r.chargeIds.contains(id)) continue; ObjectNode o = ((ObjectNode) l).deepCopy(); Map<String, Object> x = L.by.get(id); o.put("due", x == null ? null : s(x.get("due"))); o.put("at", x == null ? null : s(x.get("at_s"))); open.add(o); }
            ObjectNode A = DdLedgerCalc.allocate(r.amount, open); long rest = A.get("rest").asLong(); if (rest > 0) throw E(400, "over_balance", "청구 잔액보다 큰 금액입니다.", map("balance", r.amount - rest));
            allocs = (ArrayNode) A.get("allocs"); Set<String> bs = new LinkedHashSet<>(); for (JsonNode a : allocs) bs.add(s(L.by.get(a.get("charge").asText()).get("bill_id"))); bills.addAll(bs);
            if ((r.sid == null || r.sid.isEmpty()) && allocs.size() > 0) r.sid = s(L.by.get(allocs.get(0).get("charge").asText()).get("sid"));
        }
        String id = r.id != null ? r.id : rid("lp_");
        m.insertReceipt(tid, id, r.unit, r.sid == null || r.sid.isEmpty() ? null : r.sid, r.method, r.channel, r.amount, r.paidAt != null ? r.paidAt : iso(Instant.now()), "paid", r.paymentKey, r.orderId, r.approvalNo, r.cardIssuer, r.installment, r.terminalId, r.share, r.by, r.diffReason, r.idem,
            r.chargeIds.isEmpty() ? null : String.join(",", r.chargeIds), r.linkHash);
        for (JsonNode a : allocs) m.insertAlloc(tid, id, a.get("charge").asText(), a.get("amount").asLong());
        refreshStatus(tid, bills); return new Object[]{ m.selectReceipt(tid, id), allocs };
    }
    /** 온라인 승인 후 ready 수납 → paid + 배분(승인 사이 다른 경로로 납부됐으면 남는 금액은 over_paid 표시) */
    void settle(String tid, Map<String, Object> rc, String paymentKey, String receiptUrl) {
        List<String> cids = idsJson(rc.get("charge_ids_json")); Lines L = linesOf(tid, cids, null, null); ArrayNode open = F.arrayNode();
        for (JsonNode l : L.bal.get("lines")) { String id = l.get("id").asText(); if (!cids.contains(id)) continue; ObjectNode o = ((ObjectNode) l).deepCopy(); o.put("due", s(L.by.get(id).get("due"))); o.put("at", s(L.by.get(id).get("at_s"))); open.add(o); }
        ObjectNode A = DdLedgerCalc.allocate(L(rc.get("amount")), open);
        m.settleReceipt(paymentKey, A.get("rest").asLong() > 0 ? "over_paid" : null, receiptUrl, tid, s(rc.get("id")));
        Set<String> bs = new LinkedHashSet<>(); for (JsonNode a : A.get("allocs")) { m.insertAlloc(tid, s(rc.get("id")), a.get("charge").asText(), a.get("amount").asLong()); bs.add(s(L.by.get(a.get("charge").asText()).get("bill_id"))); }
        refreshStatus(tid, new ArrayList<>(bs));
    }

    /** 집계 재료: 범위 안 청구(잔액 포함) · 수납 · 환불 → calc 행 */
    ArrayNode rowsOf(String tid, String from, String to) {
        List<Map<String, Object>> ch = m.selectRowCharges(tid, from, to); Map<String, Long> B = new LinkedHashMap<>();
        if (!ch.isEmpty()) { Set<String> bills = new LinkedHashSet<>(); for (Map<String, Object> x : ch) bills.add(s(x.get("bill_id"))); for (JsonNode l : linesOf(tid, null, new ArrayList<>(bills), null).bal.get("lines")) B.put(l.get("id").asText(), l.get("balance").asLong()); }
        ArrayNode out = F.arrayNode();
        for (Map<String, Object> x : ch) { ObjectNode o = out.addObject(); o.put("kind", "charge"); o.put("id", s(x.get("id"))); o.put("unit", s(x.get("unit_id"))); o.put("day", s(x.get("d"))); o.put("amount", L(x.get("amount"))); o.put("itemType", s(x.get("item_type"))); o.put("balance", B.getOrDefault(s(x.get("id")), 0L)); o.put("status", s(x.get("status"))); }
        for (Map<String, Object> x : m.selectRowReceipts(tid, from, to)) { ObjectNode o = out.addObject(); o.put("kind", "receipt"); o.put("id", s(x.get("id"))); o.put("unit", s(x.get("unit_id"))); o.put("day", s(x.get("d"))); o.put("amount", L(x.get("amount"))); o.put("method", s(x.get("method"))); o.put("status", s(x.get("status"))); o.put("shareEligible", B(x.get("share_eligible"))); }
        for (Map<String, Object> x : m.selectRowRefunds(tid, from, to)) { ObjectNode o = out.addObject(); o.put("kind", "refund"); o.put("id", s(x.get("id"))); o.put("unit", s(x.get("unit_id"))); o.put("day", s(x.get("d"))); o.put("amount", L(x.get("amount"))); o.put("status", s(x.get("status"))); o.put("receipt", s(x.get("receipt_id"))); o.put("shareEligible", B(x.get("share_eligible"))); }
        return out;
    }
    static String[] range(HttpServletRequest q) {
        String t = today(), f = qp(q, "from"), e = qp(q, "to"); String from = DAY.matcher(f).matches() ? f : t.substring(0, 8) + "01", to = DAY.matcher(e).matches() ? e : t;
        if (from.compareTo(to) > 0) throw E(400, "range", "기간을 확인해 주십시오."); return new String[]{ from, to };
    }
    /** 결제창 이탈 ready → 30분 뒤 failed(요청 때 기관당 LEDGER_SWEEP_MS에 한 번 + 1시간 tick) */
    void sweepNow(String tid) {
        long now = System.currentTimeMillis(); Long t = swept.get(tid); if (sweepMs > 0 && t != null && now - t < sweepMs) return; swept.put(tid, now); if (swept.size() > 5000) swept.clear(); sweep(tid);
    }
    int sweep(String tid) { List<String> r = m.sweepReady(tid); if (!r.isEmpty()) audit(tid, "system", "ledger.sweep", map("failed", r)); return r.size(); }
    @Scheduled(fixedDelay = 3600000, initialDelayString = "${dd.ledger.tickMs:600000}")
    public void tick() {
        List<String> ts; try { ts = tx.plain(m::selectTenantIds); } catch (Exception e) { return; }
        for (String tid : ts) try { tx.inTenant(tid, () -> sweep(tid)); } catch (Exception ignore) { /* 한 기관 실패가 나머지를 막지 않는다 */ }
    }

    // ── 출력 모양(Node rcOut · rfOut · unitOut · closeOut) ─────
    static Map<String, Object> rcOut(Map<String, Object> r) { return map("id", r.get("id"), "unit", r.get("unit_id"), "sid", r.get("sid"), "method", r.get("method"), "channel", r.get("channel"), "amount", r.get("amount"), "status", r.get("status"), "paidAt", r.get("paid_at"),
        "approvalNo", r.get("approval_no"), "cardIssuer", r.get("card_issuer"), "installment", r.get("installment"), "shareEligible", r.get("share_eligible"), "diffReason", r.get("diff_reason"), "corrects", r.get("corrects"), "legacyRef", r.get("legacy_ref")); }
    static Map<String, Object> rfOut(Map<String, Object> r) { return map("id", r.get("id"), "receipt", r.get("receipt_id"), "amount", r.get("amount"), "auto", r.get("auto_amount"), "ruleType", r.get("rule_type"), "editReason", r.get("edit_reason"), "status", r.get("status"),
        "tossCancelOk", r.get("toss_cancel_ok"), "at", r.get("at"), "doneAt", r.get("done_at")); }
    static Map<String, Object> unitOut(Map<String, Object> u) { return map("id", u.get("id"), "parentId", u.get("parent_id"), "kind", u.get("kind"), "name", u.get("name"), "tossMid", u.get("toss_mid"), "tossClientKey", u.get("toss_client_key"), "hasKey", u.get("toss_secret_enc") != null,
        "shareRateBp", u.get("share_rate_bp"), "active", u.get("active"), "sort", u.get("sort")); }
    static Map<String, Object> closeOut(Map<String, Object> r) { return map("id", r.get("id"), "unit", r.get("unit_id"), "day", r.get("day"), "cashSystem", r.get("cash_system"), "cashCounted", r.get("cash_counted"), "cardSystem", r.get("card_system"), "cardCounted", r.get("card_counted"),
        "diffReason", r.get("diff_reason"), "closedBy", r.get("closed_by"), "closedAt", r.get("closed_at")); }
    static List<Map<String, Object>> tree(List<Map<String, Object>> U) {
        Map<String, Map<String, Object>> by = new LinkedHashMap<>(); for (Map<String, Object> u : U) { Map<String, Object> x = unitOut(u); x.put("children", new ArrayList<>()); by.put(s(u.get("id")), x); }
        List<Map<String, Object>> roots = new ArrayList<>();
        for (Map<String, Object> u : by.values()) { Object pid = u.get("parentId"); Map<String, Object> p = pid != null && !"".equals(pid) ? by.get(s(pid)) : null; if (p != null) { @SuppressWarnings("unchecked") List<Object> c = (List<Object>) p.get("children"); c.add(u); } else roots.add(u); }
        return roots;
    }
    Map<String, Object> billOut(String tid, String bill) {
        Lines L = linesOf(tid, null, List.of(bill), null); List<Map<String, Object>> cs = new ArrayList<>(L.charges);
        cs.sort((x, y) -> { Object a = x.get("idem_key") != null ? x.get("idem_key") : x.get("at_s"), b = y.get("idem_key") != null ? y.get("idem_key") : y.get("at_s"); return String.valueOf(a).compareTo(String.valueOf(b)); });
        List<Map<String, Object>> lines = new ArrayList<>(); long total = 0, bal = 0;
        for (Map<String, Object> x : cs) { JsonNode l = L.line.get(s(x.get("id"))); long due = l == null ? 0 : l.get("due").asLong(), b = l == null ? 0 : l.get("balance").asLong(); total += due; bal += b;
            lines.add(map("id", x.get("id"), "itemType", x.get("item_type"), "title", x.get("title"), "amount", x.get("amount"), "due", due, "balance", b, "status", l != null ? l.get("status").asText() : x.get("status"))); }
        Map<String, Object> c0 = L.charges.isEmpty() ? null : L.charges.get(0);
        return map("id", bill, "sid", c0 == null ? null : c0.get("sid"), "unit", c0 == null ? null : c0.get("unit_id"), "lines", lines, "total", total, "balance", bal);
    }

    // ── 운영자 /api/ledger/* ───────────────────────────────
    @Override public Object admin(HttpServletRequest req, HttpServletResponse res, String op, String id, byte[] body) throws Exception {
        if (id != null && !Pattern.matches("^(lp|lr)_[a-z0-9]{12}$", id)) throw E(404, "not_found", "없는 주소입니다.");
        switch (op) {
            case "GET units": { Map<String, Object> a = auth.need(req); String tid = tid(a); return T(tid, () -> { List<Map<String, Object>> U = unitsOf(tid); List<Map<String, Object>> flat = new ArrayList<>(); for (Map<String, Object> u : U) flat.add(unitOut(u)); return map("ok", true, "units", tree(U), "flat", flat); }); }
            case "POST units": return unitSave(auth.needOwner(req), DdWeb.readBody(body, 4096));
            case "GET summary": { Map<String, Object> a = auth.need(req); String tid = tid(a); String[] R = range(req);
                return T(tid, () -> { ArrayNode UC = unitCalc(unitsOf(tid)); ArrayNode rows = rowsOf(tid, R[0], R[1]); String unit = qp(req, "unit").isEmpty() ? null : qp(req, "unit");
                    ObjectNode opt = F.objectNode().put("from", R[0]).put("to", R[1]).put("unit", unit).put("rollup", "1".equals(req.getParameter("rollup"))); opt.set("units", UC);
                    ObjectNode o = F.objectNode().put("ok", true).put("from", R[0]).put("to", R[1]).put("unit", unit); o.setAll(DdLedgerCalc.summary(rows, opt)); return o; }); }
            case "GET entries": { Map<String, Object> a = auth.need(req); double pg = I(req.getParameter("page")); int page = (int) Math.max(1, Double.isNaN(pg) || pg == 0 ? 1 : pg); List<Map<String, Object>> all = entries(tid(a), req);
                int from = Math.min(all.size(), Math.max(0, (page - 1) * 50)), to = Math.min(all.size(), page * 50); return map("ok", true, "total", all.size(), "page", page, "entries", from >= to ? List.of() : all.subList(from, to)); }
            case "POST charges": return charge(auth.needStaff(req), DdWeb.readBody(body, 16 * 1024));
            case "POST charges/generate": return generate(auth.needStaff(req), DdWeb.readBody(body, 2048));
            case "POST receipts": return receipt(auth.needStaff(req), DdWeb.readBody(body, 4096));
            case "POST receipts/correct": if (!id.startsWith("lp_")) throw E(404, "not_found", "없는 주소입니다."); return correct(auth.needStaff(req), id, DdWeb.readBody(body, 1024));
            case "POST refunds": return refundCreate(auth.needStaff(req), DdWeb.readBody(body, 4096));
            case "GET refunds": { Map<String, Object> a = auth.need(req); String tid = tid(a); String st = cut(req.getParameter("status") == null || req.getParameter("status").isEmpty() ? "pending" : req.getParameter("status"), 12);
                return T(tid, () -> { List<Map<String, Object>> out = new ArrayList<>(); for (Map<String, Object> r : m.selectRefunds(tid, st)) { Map<String, Object> o = rfOut(r); o.put("paid", r.get("paid")); o.put("method", r.get("method")); o.put("channel", r.get("channel")); o.put("sid", r.get("sid")); o.put("calc", parse(s(r.get("calc_json")))); out.add(o); } return map("ok", true, "refunds", out); }); }
            case "POST refunds/confirm": if (!id.startsWith("lr_")) throw E(404, "not_found", "없는 주소입니다."); return refundConfirm(auth.needStaff(req), id, DdWeb.readBody(body, 1024));
            case "POST links": return link(auth.needStaff(req), DdWeb.readBody(body, 4096));
            case "GET close": { Map<String, Object> a = auth.need(req); String tid = tid(a); String d = qp(req, "day"); String day = DAY.matcher(d).matches() ? d : today(); String unit = !qp(req, "unitId").isEmpty() ? qp(req, "unitId") : !qp(req, "unit").isEmpty() ? qp(req, "unit") : "lu_root";
                return T(tid, () -> { Map<String, Object> o = map("ok", true, "day", day, "unit", unit); o.putAll(sys(tid, unit, day)); Map<String, Object> c = m.selectClose(tid, unit, day); o.put("close", c == null ? null : closeOut(c)); return o; }); }
            case "POST close": return close(auth.needStaff(req), DdWeb.readBody(body, 2048));
            case "GET today": return today(auth.need(req));
            case "GET export": return export(auth.need(req), req, res);
            case "POST devices": return device(auth.needOwner(req), DdWeb.readBody(body, 1024));
            case "GET devices": { Map<String, Object> a = auth.needStaff(req); String tid = tid(a); return T(tid, () -> map("ok", true, "devices", m.selectDevices(tid))); }
            case "POST device-push": return devicePush(req, body);
            case "GET share": return share(auth.need(req), req);
            case "POST import": return importRun(auth.needStaff(req), DdWeb.readBody(body, 2 * 1024 * 1024));
            default: throw E(404, "not_found", "없는 주소입니다.");
        }
    }
    static String tid(Map<String, Object> a) { return (String) a.get("tid"); }
    static String email(Map<String, Object> a) { return (String) a.get("email"); }

    Object unitSave(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a);
        return T(tid, () -> { m.ensureRoot(tid); String id = truthy(get(b, "id")) ? str(get(b, "id"), 30) : rid("lu_"); if (!LU.matcher(id).matches()) throw E(400, "id", "단위 번호를 확인해 주십시오.");
            Map<String, Object> cur = m.selectUnit(tid, id);
            String kind = !nullish(get(b, "kind")) ? str(get(b, "kind"), 10) : cur != null ? s(cur.get("kind")) : "branch"; if (!List.of("hq", "branch", "dept", "facility").contains(kind)) throw E(400, "kind", "단위 종류를 확인해 주십시오.");
            String name = trim(!nullish(get(b, "name")) ? str(get(b, "name"), 60) : cur != null ? s(cur.get("name")) : ""); if (name.isEmpty()) throw E(400, "name", "이름을 입력해 주십시오.");
            String parent = "lu_root".equals(id) ? null : b.has("parentId") ? (truthy(b.get("parentId")) ? str(b.get("parentId"), 30) : "lu_root") : cur != null ? s(cur.get("parent_id")) : "lu_root";
            if (parent != null) { Map<String, Map<String, Object>> by = new LinkedHashMap<>(); for (Map<String, Object> u : unitsOf(tid)) by.put(s(u.get("id")), u); if (!by.containsKey(parent)) throw E(404, "unit", "상위 단위가 없습니다.");
                int n = 0; for (String p = parent; p != null; p = by.containsKey(p) ? s(by.get(p).get("parent_id")) : null, n++) if (p.equals(id) || n > 50) throw E(400, "cycle", "상위 단위를 확인해 주십시오."); }
            double bp = !nullish(get(b, "shareRateBp")) ? I(get(b, "shareRateBp")) : cur != null ? L(cur.get("share_rate_bp")) : 40; if (!isInt(bp) || bp < 0 || bp > 10000) throw E(400, "share", "쉐어율을 확인해 주십시오.");
            JsonNode ts = get(b, "tossSecret"); String sec = ts != null && (ts.isNull() || "".equals(ts.asText(null)) && ts.isTextual()) ? null : !nullish(ts) ? seal(tid, id, trim(str(ts, 200))) : cur != null ? s(cur.get("toss_secret_enc")) : null;
            String mid = b.has("tossMid") ? emptyNull(str(b.get("tossMid"), 60)) : cur != null ? s(cur.get("toss_mid")) : null; String ck = b.has("tossClientKey") ? emptyNull(str(b.get("tossClientKey"), 200)) : cur != null ? s(cur.get("toss_client_key")) : null;
            boolean act = !nullish(get(b, "active")) ? truthy(get(b, "active")) : cur == null || B(cur.get("active")); double so = !nullish(get(b, "sort")) ? I(get(b, "sort")) : cur != null ? L(cur.get("sort")) : 0; int sort = Double.isNaN(so) ? 0 : (int) so;
            m.upsertUnit(tid, id, parent, kind, name, mid, ck, sec, (int) bp, act, sort);
            audit(tid, email(a), "ledger.unit", map("unit", id, "name", name, "keyChanged", b.has("tossSecret"))); return map("ok", true, "unit", unitOut(m.selectUnit(tid, id))); });
    }
    static String emptyNull(String v) { return v == null || v.isEmpty() ? null : v; }

    Object charge(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a); String sid = trim(str(get(b, "sid"), 40)); if (sid.isEmpty()) throw E(400, "sid", "학습자를 골라 주십시오.");
        List<JsonNode> items = arr(get(b, "items")); if (items.size() > 50) items = items.subList(0, 50); if (items.isEmpty()) throw E(400, "items", "청구 항목을 입력해 주십시오.");
        List<Object[]> Ls = new ArrayList<>(); for (JsonNode x : items) { JsonNode it = truthy(x) ? get(x, "itemType") : null; Ls.add(new Object[]{ it != null && it.isTextual() && ITEM.contains(it.asText()) ? it.asText() : "etc", trim(str(truthy(x) ? get(x, "title") : null, 100)), I(truthy(x) ? get(x, "amount") : null) }); }
        for (Object[] x : Ls) if (((String) x[1]).isEmpty() || !isInt((Double) x[2]) || (Double) x[2] == 0) throw E(400, "items", "항목 이름과 금액을 확인해 주십시오.");
        double sum = 0; boolean pos = false; for (Object[] x : Ls) { sum += (Double) x[2]; if ((Double) x[2] > 0) pos = true; } if (sum <= 0 || !pos) throw E(400, "amount", "청구 합계는 0원보다 커야 합니다.");
        String ym0 = S(get(b, "periodYm")), due0 = S(get(b, "dueDate")); String ym = YM.matcher(ym0).find() ? ym0 : null, due = DAY.matcher(due0).find() ? due0 : null; String idem = truthy(get(b, "idem")) ? str(get(b, "idem"), 80) : null;
        double total = sum;
        return T(tid, () -> { Map<String, Object> u = unitOf(tid, get(b, "unitId"));
            if (idem != null) { String ex = m.selectBillByIdem(tid, idem + "#0"); if (ex != null) return map("ok", true, "again", true, "bill", billOut(tid, ex)); }
            String bill = rid("lb_"); int i = 0;
            for (Object[] x : Ls) m.insertCharge(tid, rid("lc_"), bill, s(u.get("id")), sid, (String) x[0], (String) x[1], ((Double) x[2]).longValue(), ym, due, truthy(get(b, "srcType")) ? str(get(b, "srcType"), 20) : null, truthy(get(b, "srcId")) ? str(get(b, "srcId"), 40) : null, idem != null ? idem + "#" + i++ : null);
            audit(tid, email(a), "ledger.charge", map("bill", bill, "unit", u.get("id"), "lines", Ls.size(), "total", (long) total)); return map("ok", true, "bill", billOut(tid, bill)); });
    }

    Object generate(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a); String ym0 = S(get(b, "periodYm")); String ym = YM.matcher(ym0).find() ? ym0 : null; if (ym == null) throw E(400, "period", "청구 월을 확인해 주십시오.");
        boolean dry = !(get(b, "dryRun") != null && get(b, "dryRun").isBoolean() && !get(b, "dryRun").booleanValue()); String due0 = S(get(b, "dueDate")); String due = DAY.matcher(due0).find() ? due0 : ym + "-10";
        return T(tid, () -> { Map<String, Object> u = unitOf(tid, get(b, "unitId"));
            List<Map<String, Object>> src = new ArrayList<>();
            for (Map<String, Object> x : m.selectGenSrc(tid)) { String cls = str(s(x.get("cls")), 40); String nm = str(x.get("name") == null || "".equals(x.get("name")) ? "수강료" : s(x.get("name")), 80); double amt = I((x.get("price") == null ? "" : s(x.get("price"))).replaceAll("[^\\d.-]", "")); String sid = str(s(x.get("sid")), 40);
                if (!cls.isEmpty() && isInt(amt) && amt > 0) src.add(map("cls", cls, "name", nm, "amount", (long) amt, "sid", sid)); }
            Set<String> have = new HashSet<>(m.selectGenHave(tid, ym)); List<Map<String, Object>> todo = new ArrayList<>(); for (Map<String, Object> x : src) if (!have.contains(x.get("cls") + "|" + x.get("sid"))) todo.add(x);
            long total = 0; for (Map<String, Object> x : todo) total += L(x.get("amount")); List<Map<String, Object>> items = new ArrayList<>(); for (Map<String, Object> x : todo.subList(0, Math.min(200, todo.size()))) items.add(map("sid", x.get("sid"), "cls", x.get("cls"), "title", x.get("name"), "amount", x.get("amount")));
            Map<String, Object> out = map("ok", true, "dryRun", dry, "periodYm", ym, "count", todo.size(), "skipped", src.size() - todo.size(), "total", total, "items", items);
            if (dry) return out; int made = 0;
            for (Map<String, Object> x : todo) made += m.insertGenCharge(tid, rid("lc_"), rid("lb_"), s(u.get("id")), s(x.get("sid")), x.get("name") + " " + ym, L(x.get("amount")), ym, due, s(x.get("cls")));
            audit(tid, email(a), "ledger.generate", map("periodYm", ym, "made", made, "total", total)); out.put("made", made); return out; });
    }

    /** JS Date.parse 대략(ISO 날짜 · 시각) — 실패하면 null */
    static Instant parseTime(String v) {
        if (v == null || v.isEmpty()) return null;
        try { return OffsetDateTime.parse(v).toInstant(); } catch (Exception e) { /* 다음 */ }
        try { return Instant.parse(v); } catch (Exception e) { /* 다음 */ }
        try { return java.time.LocalDateTime.parse(v).atZone(java.time.ZoneId.systemDefault()).toInstant(); } catch (Exception e) { /* 다음 */ }
        try { return LocalDate.parse(v).atStartOfDay(ZoneOffset.UTC).toInstant(); } catch (Exception e) { return null; }
    }
    Object receipt(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a); rl.limit("lrc:" + tid, 600, 600_000L);
        String method = str(get(b, "method"), 20); if (!DESK.contains(method)) throw E(400, "method", "현장 수납 수단을 확인해 주십시오."); double amount = I(get(b, "amount")); if (!isInt(amount) || amount <= 0) throw E(400, "amount", "금액을 확인해 주십시오.");
        if ("desk_card".equals(method) && trim(str(get(b, "approvalNo"), 30)).isEmpty()) throw E(400, "approval", "카드 승인번호를 입력해 주십시오."); String idem = truthy(get(b, "idem")) ? str(get(b, "idem"), 80) : null;
        Instant pt = truthy(get(b, "paidAt")) ? parseTime(S(get(b, "paidAt"))) : null; if (pt == null) pt = Instant.now(); if (pt.toEpochMilli() > System.currentTimeMillis() + 600_000L) throw E(400, "paid_at", "수납 시각을 확인해 주십시오."); Instant paidAt = pt;
        return T(tid, () -> { if (idem != null) { Map<String, Object> ex = m.selectReceiptByIdem(tid, idem); if (ex != null) return map("ok", true, "again", true, "receipt", rcOut(ex)); }
            Map<String, Object> u = unitOf(tid, get(b, "unitId")); Rec r = new Rec(); r.unit = s(u.get("id")); r.sid = truthy(get(b, "sid")) ? str(get(b, "sid"), 40) : null; r.chargeIds = ids(get(b, "chargeIds"), 100); r.method = method; r.channel = "desk"; r.amount = (long) amount; r.paidAt = iso(paidAt);
            r.approvalNo = emptyNull(trim(str(get(b, "approvalNo"), 30))); r.cardIssuer = emptyNull(str(get(b, "cardIssuer"), 30)); double ins = I(get(b, "installment")); r.installment = Double.isNaN(ins) || ins == 0 ? null : (int) ins; r.terminalId = emptyNull(str(get(b, "terminalId"), 30));
            r.share = false; r.by = email(a); r.diffReason = emptyNull(str(get(b, "diffReason"), 200)); r.idem = idem;
            Object[] x = record(tid, r); @SuppressWarnings("unchecked") Map<String, Object> row = (Map<String, Object>) x[0];
            audit(tid, email(a), "ledger.receipt", map("receipt", row.get("id"), "amount", (long) amount, "method", method)); return map("ok", true, "receipt", rcOut(row), "allocs", x[1]); });
    }

    /** 정정: 반대 기록(삭제 금지). 토스 결제는 환불로 */
    Object correct(Map<String, Object> a, String id, JsonNode b) throws Exception {
        String tid = tid(a); String reason = trim(str(get(b, "reason"), 200)); if (reason.isEmpty()) throw E(400, "reason", "정정 사유를 입력해 주십시오.");
        return T(tid, () -> { m.lockReceipt(tid, id); Map<String, Object> o = m.selectReceipt(tid, id); if (o == null || !"paid".equals(o.get("status")) || L(o.get("amount")) <= 0 || o.get("corrects") != null) throw E(404, "receipt", "정정할 수납이 없습니다.");
            if ("toss".equals(o.get("channel"))) throw E(409, "use_refund", "온라인 결제는 환불로 처리해 주십시오."); if (o.get("legacy_ref") != null) throw E(409, "legacy", "시설 예약 결제는 시설 화면에서 처리해 주십시오.");
            if (m.countLiveRefunds(tid, id) > 0) throw E(409, "refunded", "환불 기록이 있는 수납입니다.");
            String nid = rid("lp_"); try { m.insertCorrection(nid, email(a), reason, truthy(get(b, "idem")) ? str(get(b, "idem"), 80) : null, tid, id); } catch (DuplicateKeyException e) { throw E(409, "corrected", "이미 정정한 수납입니다."); }
            List<Map<String, Object>> al = m.selectAllocsOfReceipt(tid, id); List<String> cids = new ArrayList<>(); for (Map<String, Object> x : al) { m.insertAlloc(tid, nid, s(x.get("charge_id")), -L(x.get("amount"))); cids.add(s(x.get("charge_id"))); }
            if (!al.isEmpty()) refreshStatus(tid, m.selectBillsOfCharges(tid, cids));
            audit(tid, email(a), "ledger.correct", map("receipt", id, "correction", nid, "reason", reason)); return map("ok", true, "receipt", rcOut(m.selectReceipt(tid, nid))); });
    }

    Object refundCreate(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a); String rcId = str(get(b, "receiptId"), 40); String rule = str(truthy(get(b, "ruleType")) ? get(b, "ruleType") : t("manual"), 20); String reason = trim(str(get(b, "reason"), 200)); String idem = truthy(get(b, "idem")) ? str(get(b, "idem"), 80) : null;
        return T(tid, () -> {
            if (idem != null) { Map<String, Object> ex = m.selectRefundByIdem(tid, idem); if (ex != null) return map("ok", true, "again", true, "refund", rfOut(ex)); }
            m.lockReceipt(tid, rcId); Map<String, Object> R = m.selectReceipt(tid, rcId); if (R == null || !"paid".equals(R.get("status")) || L(R.get("amount")) <= 0) throw E(404, "receipt", "환불할 수납이 없습니다.");
            if (R.get("corrects") != null || m.countCorrections(tid, rcId) > 0) throw E(409, "corrected", "정정된 수납입니다.");
            if (m.countPendingRefund(tid, rcId) > 0) throw E(409, "pending", "확정하지 않은 환불이 있습니다.");
            long done = m.sumDoneRefund(tid, rcId), paid = L(R.get("amount"));
            ObjectNode in = F.objectNode().put("rule", rule).put("paid", paid).put("refunded", done); for (String k : List.of("used", "total", "months", "month", "auto")) if (b.has(k)) in.set(k, b.get(k));
            ObjectNode r = DdLedgerCalc.refund(in); long auto = r.get("auto").asLong();
            double amt = nullish(get(b, "amount")) ? auto : I(get(b, "amount")); if (!isInt(amt) || amt <= 0) throw E(400, "amount", "환불 금액을 확인해 주십시오.");
            if (amt > paid - done) throw E(400, "over_refund", "환불 합계가 수납 금액을 넘습니다.", map("max", paid - done));
            if ((long) amt != auto && reason.isEmpty()) throw E(400, "reason", "계산 금액과 다르면 사유를 입력해 주십시오.", map("auto", auto));
            String nid = rid("lr_"); ObjectNode calc = F.objectNode(); calc.set("lines", r.get("lines")); calc.set("lawCheck", r.get("lawCheck"));
            m.insertRefund(tid, nid, rcId, (long) amt, rule, calc.toString(), auto, (long) amt != auto ? reason : null, reason.isEmpty() ? null : reason, email(a), idem);
            audit(tid, email(a), "ledger.refund", map("refund", nid, "receipt", rcId, "amount", (long) amt, "auto", auto, "rule", rule));
            Map<String, Object> o = rfOut(m.selectRefund(tid, nid)); o.put("lines", r.get("lines")); o.put("lawCheck", r.get("lawCheck").asBoolean()); return map("ok", true, "refund", o); });
    }

    Object refundConfirm(Map<String, Object> a, String id, JsonNode b) throws Exception {
        String tid = tid(a);
        Object[] X = T(tid, () -> { m.lockRefund(tid, id); Map<String, Object> f = m.selectRefund(tid, id); if (f == null) throw E(404, "refund", "없는 환불입니다.");
            if (!"pending".equals(f.get("status"))) throw E(409, "state", "이미 처리한 환불입니다.");
            Map<String, Object> R = m.selectReceipt(tid, s(f.get("receipt_id"))); long done = m.sumDoneRefund(tid, s(R.get("id")));
            double amt = nullish(get(b, "amount")) ? L(f.get("amount")) : I(get(b, "amount")); String why = trim(str(get(b, "editReason"), 200)); if (why.isEmpty()) why = f.get("edit_reason") == null ? "" : s(f.get("edit_reason"));
            if (!isInt(amt) || amt <= 0) throw E(400, "amount", "환불 금액을 확인해 주십시오."); if (amt > L(R.get("amount")) - done) throw E(400, "over_refund", "환불 합계가 수납 금액을 넘습니다.", map("max", L(R.get("amount")) - done));
            if ((long) amt != L(f.get("auto_amount")) && why.isEmpty()) throw E(400, "reason", "계산 금액과 다르면 사유를 입력해 주십시오.", map("auto", f.get("auto_amount")));
            Pay P = "toss".equals(R.get("channel")) && R.get("toss_payment_key") != null ? payFor(tid, s(R.get("unit_id"))) : null; return new Object[]{ f, R, (long) amt, why, P }; });
        @SuppressWarnings("unchecked") Map<String, Object> f = (Map<String, Object>) X[0], R = (Map<String, Object>) X[1]; long amt = (Long) X[2]; String why = (String) X[3]; Pay P = (Pay) X[4];
        String key = null;
        if (P != null) { key = P.cancel(s(R.get("toss_payment_key")), f.get("reason") != null && !"".equals(f.get("reason")) ? s(f.get("reason")) : "환불", amt, "lr-" + f.get("id") + "-" + amt);
            if (key == null) { tx.inTenant(tid, () -> { audit(tid, email(a), "ledger.refund.pg_fail", map("refund", f.get("id"))); return null; }); throw E(502, "pg", "토스 취소에 실패했습니다. 환불은 대기 상태로 남겨 두었습니다."); } }
        String k = key;
        return T(tid, () -> { int n = m.doneRefund(amt, amt != L(f.get("auto_amount")) ? why : null, P != null ? Boolean.TRUE : null, k, email(a), tid, s(f.get("id"))); if (n == 0) throw E(409, "state", "이미 처리한 환불입니다.");
            /* v42 차감 사용 P 비율 복원 · 전액 환불이면 과정 적립 취소(같은 트랜잭션, Node ctx.mileage.onRefund) */
            long ra = L(R.get("amount")); JsonNode mil = mile != null ? mile.onRefund(tid, s(R.get("id")), ra > 0 ? (double) amt / ra : 0) : null;
            boolean mx = mil != null && (truthy(get(mil, "restored")) || truthy(get(mil, "cancelled")));
            Map<String, Object> ad = map("refund", f.get("id"), "amount", amt, "toss", P != null); if (mx) ad.put("mileage", mil); audit(tid, email(a), "ledger.refund.confirm", ad);
            Map<String, Object> o = map("ok", true, "refund", rfOut(m.selectRefund(tid, s(f.get("id"))))); if (mx) o.put("mileage", map("restored", get(mil, "restored"), "cancelled", get(mil, "cancelled"))); return o; });
    }

    Object link(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a); List<String> cids = ids(get(b, "chargeIds"), 100); String sid = trim(str(get(b, "sid"), 40)); if (cids.isEmpty() || sid.isEmpty()) throw E(400, "charge", "청구와 학습자를 골라 주십시오.");
        double t0 = I(get(b, "ttlHours")); int ttl = (int) Math.min(24 * 30, Math.max(1, Double.isNaN(t0) || t0 == 0 ? 72 : t0));
        return T(tid, () -> { Lines L = linesOf(tid, cids, null, null); List<Map<String, Object>> mine = new ArrayList<>(); for (Map<String, Object> x : L.charges) if (cids.contains(s(x.get("id")))) mine.add(x);
            if (mine.size() != cids.size() || mine.stream().anyMatch(x -> !sid.equals(x.get("sid")))) throw E(404, "charge", "없는 청구입니다.");
            boolean any = false; for (String c : cids) { JsonNode l = L.line.get(c); if (l != null && l.get("balance").asLong() > 0) any = true; } if (!any) throw E(409, "paid", "잔액이 없는 청구입니다.");
            String tok = b64(24); m.insertLink(tid, sha(tok), String.join(",", cids), sid, ttl, email(a)); String exp = m.selectLinkExpiry(tid, sha(tok));
            audit(tid, email(a), "ledger.link", map("charges", cids, "ttlHours", ttl)); return map("ok", true, "url", "/learner.html?t=" + URLEncoder.encode(tid, StandardCharsets.UTF_8) + "&bill=" + tok, "token", tok, "expiresAt", exp); });
    }

    Map<String, Object> sys(String tid, String unit, String day) { Map<String, Object> r = m.selectSysPaid(tid, unit, day), f = m.selectSysRefund(tid, unit, day); return map("cashSystem", L(r.get("cash")) - L(f.get("cash")), "cardSystem", L(r.get("card")) - L(f.get("card"))); }
    Object close(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a); String d0 = S(get(b, "day")); String day = DAY.matcher(d0).find() ? d0 : today(); double cc = I(get(b, "cashCounted")), kc = I(get(b, "cardCounted"));
        if (!isInt(cc) || !isInt(kc) || cc < 0 || kc < 0) throw E(400, "counted", "실제 금액을 입력해 주십시오.");
        return T(tid, () -> { Map<String, Object> u = unitOf(tid, get(b, "unitId")); String unit = s(u.get("id")); Map<String, Object> sy = sys(tid, unit, day); long cs = L(sy.get("cashSystem")), ks = L(sy.get("cardSystem")); String why = trim(str(get(b, "diffReason"), 200));
            if ((cs != (long) cc || ks != (long) kc) && why.isEmpty()) throw E(400, "reason", "시스템 금액과 다르면 차이 사유를 입력해 주십시오.", map("cashSystem", cs, "cardSystem", ks));
            String id = rid("lk_"); try { m.insertClose(tid, id, unit, day, cs, (long) cc, ks, (long) kc, why.isEmpty() ? null : why, email(a)); } catch (DuplicateKeyException e) { throw E(409, "closed", "이미 마감한 날입니다."); }
            m.closeReceipts(id, tid, unit, day); audit(tid, email(a), "ledger.close", map("unit", unit, "day", day, "cashDiff", (long) cc - cs, "cardDiff", (long) kc - ks)); return map("ok", true, "close", closeOut(m.selectClose(tid, unit, day))); });
    }

    /** 미납 단계: 기한 지난 일수 */
    static String stageOf(String due, String today) { if (due == null || due.isEmpty()) return "nodue"; long d = LocalDate.parse(today).toEpochDay() - LocalDate.parse(due).toEpochDay(); return d < -3 ? "later" : d <= 0 ? "soon" : d <= 7 ? "d1" : d <= 30 ? "d8" : "d31"; }
    Object today(Map<String, Object> a) throws Exception {
        String tid = tid(a);
        return T(tid, () -> { String td = today(); List<String> bills = m.selectOpenBills(tid); Lines L = bills.isEmpty() ? null : linesOf(tid, null, bills, null);
            List<String> K = List.of("soon", "d1", "d8", "d31", "nodue", "later"); Map<String, Object> people = new LinkedHashMap<>(), amounts = new LinkedHashMap<>(); Map<String, Set<String>> who = new LinkedHashMap<>(); for (String k : K) { amounts.put(k, 0L); }
            if (L != null) for (JsonNode l : L.bal.get("lines")) { long bal = l.get("balance").asLong(); if (bal <= 0) continue; Map<String, Object> x = L.by.get(l.get("id").asText()); String st = stageOf(s(x.get("due")), td); amounts.put(st, (Long) amounts.get(st) + bal); who.computeIfAbsent(st, k -> new HashSet<>()).add(s(x.get("sid"))); }
            for (String k : K) people.put(k, who.containsKey(k) ? who.get(k).size() : 0);
            Map<String, Object> pr = m.selectPendingRefunds(tid);
            return map("ok", true, "today", td, "unpaid", map("people", people, "amount", amounts), "unmatched", m.countUnmatched(tid), "refundsPending", pr.get("n"), "refundsPendingAmount", pr.get("amt"), "unclosed", m.selectUnclosed(tid), "overPaid", m.countOverPaid(tid)); });
    }

    List<Map<String, Object>> entries(String tid, HttpServletRequest q) throws Exception {
        String[] R = range(q); String type = qp(q, "type"), st = qp(q, "status"), qq = trim(cut(qp(q, "q"), 40)), unit = qp(q, "unit").isEmpty() ? null : qp(q, "unit");
        return T(tid, () -> { ArrayNode UC = unitCalc(unitsOf(tid)); Set<String> scope = unit != null ? DdLedgerCalc.unitScope(unit, UC, "1".equals(q.getParameter("rollup"))) : null;
            List<Map<String, Object>> ch = m.selectEntryCharges(tid, R[0], R[1]);
            if (!ch.isEmpty()) { Set<String> bills = new LinkedHashSet<>(); for (Map<String, Object> x : ch) bills.add(s(x.get("bill"))); Lines Lb = linesOf(tid, null, new ArrayList<>(bills), null); /* 잔액 = 줄의 낼 금액(할인 반영) − 배분액 */
                for (Map<String, Object> x : ch) { JsonNode l = Lb.line.get(s(x.get("id"))); x.put("balance", l == null ? 0L : l.get("balance").asLong()); } }
            List<Map<String, Object>> all = new ArrayList<>(); all.addAll(ch); all.addAll(m.selectEntryReceipts(tid, R[0], R[1])); all.addAll(m.selectEntryRefunds(tid, R[0], R[1]));
            all.removeIf(x -> !((scope == null || scope.contains(s(x.get("unit")))) && (type.isEmpty() || type.equals(x.get("type"))) && (st.isEmpty() || st.equals(x.get("status")))
                && (qq.isEmpty() || (x.get("sid") == null ? "" : s(x.get("sid"))).contains(qq) || (x.get("title") == null ? "" : s(x.get("title"))).contains(qq) || qq.equals(x.get("id")))));
            all.sort((x, y) -> { int c = s(y.get("at")).compareTo(s(x.get("at"))); return c != 0 ? c : s(y.get("id")).compareTo(s(x.get("id"))); });
            return all; });
    }
    static final Pattern CSV_Q = Pattern.compile("[\",\\n\\r]"), CSV_F = Pattern.compile("^[=+\\-@]"), INTS = Pattern.compile("^-?\\d+$");
    static String esc(Object v) { String s = v == null ? "" : String.valueOf(v); boolean f = CSV_F.matcher(s).find(); return CSV_Q.matcher(s).find() || f ? "\"" + (f && !INTS.matcher(s).matches() ? "'" : "") + s.replace("\"", "\"\"") + "\"" : s; }
    Object export(Map<String, Object> a, HttpServletRequest q, HttpServletResponse res) throws Exception {
        String[] R = range(q); List<Map<String, Object>> E0 = entries(tid(a), q);
        List<String> H = List.of("type", "id", "at", "unit", "sid", "itemType", "title", "method", "channel", "amount", "status", "approvalNo", "receipt", "ruleType", "diffReason");
        StringBuilder sb = new StringBuilder("﻿").append(String.join(",", H)); for (Map<String, Object> e : E0) { sb.append("\r\n"); List<String> c = new ArrayList<>(); for (String h : H) c.add(esc(e.get(h))); sb.append(String.join(",", c)); } sb.append("\r\n");
        byte[] out = sb.toString().getBytes(StandardCharsets.UTF_8);
        res.setStatus(200); res.setHeader("content-type", "text/csv; charset=utf-8"); res.setHeader("content-disposition", "attachment; filename=\"ledger-" + R[0] + "-" + R[1] + ".csv\""); res.setHeader("cache-control", "no-store"); res.setHeader("x-content-type-options", "nosniff");
        res.setContentLength(out.length); res.getOutputStream().write(out); res.flushBuffer(); return null;
    }

    Object device(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a); JsonNode md = get(b, "mode"); String mode = md != null && md.isTextual() && List.of("mock", "ksnet", "nice").contains(md.asText()) ? md.asText() : "mock"; String label0 = trim(str(get(b, "label"), 40)); String label = label0.isEmpty() ? "데스크 단말" : label0;
        return T(tid, () -> { Map<String, Object> u = unitOf(tid, get(b, "unitId")); String id = rid("ld_"); String key = tid + "." + b64(24);
            m.insertDevice(tid, id, s(u.get("id")), label, sha(key), mode); audit(tid, email(a), "ledger.device", map("device", id, "unit", u.get("id"), "mode", mode));
            return map("ok", true, "device", map("id", id, "unit", u.get("id"), "label", label, "mode", mode), "agentKey", key); });
    }
    static final Pattern AGENT = Pattern.compile("^[A-Za-z0-9_-]{3,40}\\.[A-Za-z0-9_-]{20,80}$");
    /** Lv2 에이전트: 로그인 없이 X-Agent-Key(= <tid>.<비밀>)로만. 단말 승인 결과 → desk_card 수납 확정 */
    Object devicePush(HttpServletRequest req, byte[] body) throws Exception {
        String k = req.getHeader("x-agent-key") == null ? "" : req.getHeader("x-agent-key"); String tid = k.split("\\.", -1)[0]; if (!AGENT.matcher(k).matches()) throw E(401, "agent", "단말 키가 없습니다.");
        rl.limit("ldp:" + tid, 600, 600_000L); JsonNode b = DdWeb.readBody(body, 4096); double amount = I(get(b, "amount")); if (!isInt(amount) || amount <= 0) throw E(400, "amount", "금액을 확인해 주십시오.");
        String appr = trim(str(get(b, "approvalNo"), 30)); if (appr.isEmpty()) throw E(400, "approval", "승인번호가 없습니다.");
        return tx.inTenant(tid, () -> { Map<String, Object> d = m.selectDeviceByKey(tid, sha(k)); if (d == null) throw E(401, "agent", "등록되지 않은 단말입니다."); needOn(tid);
            m.touchDevice(tid, s(d.get("id"))); String idem = "dev:" + d.get("id") + ":" + str(truthy(get(b, "idem")) ? get(b, "idem") : t(appr), 60);
            Map<String, Object> ex = m.selectReceiptByIdem(tid, idem); if (ex != null) return map("ok", true, "again", true, "receipt", rcOut(ex));
            Rec r = new Rec(); r.unit = s(d.get("unit_id")); r.sid = truthy(get(b, "sid")) ? str(get(b, "sid"), 40) : null; r.chargeIds = ids(get(b, "chargeIds"), 100); r.method = "desk_card"; r.channel = "desk"; r.amount = (long) amount; r.paidAt = iso(Instant.now()); r.approvalNo = appr;
            r.cardIssuer = emptyNull(str(get(b, "cardIssuer"), 30)); double ins = I(get(b, "installment")); r.installment = Double.isNaN(ins) || ins == 0 ? null : (int) ins; r.terminalId = emptyNull(str(get(b, "terminalId"), 30)); r.share = false; r.by = "device:" + d.get("id"); r.idem = idem;
            @SuppressWarnings("unchecked") Map<String, Object> row = (Map<String, Object>) record(tid, r)[0];
            audit(tid, "device:" + d.get("id"), "ledger.device.push", map("receipt", row.get("id"), "amount", (long) amount, "mode", d.get("mode"))); return map("ok", true, "receipt", rcOut(row)); });
    }

    /** PG 쉐어 리포트: 단위별 쉐어 대상 · 쉐어율 · 예상, 토스 정산을 가져온 달은 실제와 차이 */
    Object share(Map<String, Object> a, HttpServletRequest q) throws Exception {
        String tid = tid(a); String y = qp(q, "ym"); String ym = YM.matcher(y).find() ? y : today().substring(0, 7); YearMonth Y = YearMonth.parse(ym.substring(0, 7)); String from = ym + "-01", to = Y.atEndOfMonth().toString();
        return T(tid, () -> { List<Map<String, Object>> U = unitsOf(tid); ArrayNode UC = unitCalc(U); String unit = qp(q, "unit").isEmpty() ? null : qp(q, "unit"); Set<String> scope = unit != null ? DdLedgerCalc.unitScope(unit, UC, true) : null;
            ArrayNode rows = F.arrayNode(); for (JsonNode r : rowsOf(tid, from, to)) if (scope == null || scope.contains(r.get("unit").asText())) rows.add(r);
            ObjectNode sh = DdLedgerCalc.share(rows, UC); Map<String, String> name = new LinkedHashMap<>(); for (Map<String, Object> u : U) name.put(s(u.get("id")), s(u.get("name")));
            List<Map<String, Object>> us = new ArrayList<>(); for (JsonNode x : sh.get("units")) { Map<String, Object> o = DdWeb.JSON.convertValue(x, LinkedHashMap.class); o.put("name", name.getOrDefault(x.get("unit").asText(), x.get("unit").asText())); us.add(o); }
            List<String> imp = m.selectSettleMeta(tid, ym); Long actual = null;
            if (!imp.isEmpty() && unit == null) { double sum = 0; for (String j : imp) { double v = num(get(parse(j), "shareActual")); sum += Double.isNaN(v) ? 0 : v; } actual = (long) sum; }
            return map("ok", true, "ym", ym, "unit", unit, "units", us, "eligible", sh.get("eligible").asLong(), "estimate", sh.get("estimate").asLong(), "actual", actual, "diff", actual == null ? null : actual - sh.get("estimate").asLong()); });
    }

    // ── 가져오기 · 자동 대사 ─────────────────────────────────
    static final Map<String, Pattern> COL = Map.of("day", Pattern.compile("^(day|date|입금일|입금일자|거래일|거래일자|승인일|승인일자|정산일|일자|결제일)$", Pattern.CASE_INSENSITIVE),
        "amount", Pattern.compile("^(amount|금액|입금액|승인금액|결제금액|거래금액)$", Pattern.CASE_INSENSITIVE), "share", Pattern.compile("^(share|쉐어|파트너쉐어|파트너수수료)$", Pattern.CASE_INSENSITIVE),
        "vbank", Pattern.compile("^(ref|sid|학번|수험번호|납부자번호)$", Pattern.CASE_INSENSITIVE), "van", Pattern.compile("^(ref|approval|approvalno|승인번호)$", Pattern.CASE_INSENSITIVE), "toss_settle", Pattern.compile("^(ref|orderid|주문번호)$", Pattern.CASE_INSENSITIVE));
    static final Pattern DAYOF = Pattern.compile("^(\\d{4})[-./]?(\\d{2})[-./]?(\\d{2})");
    static String dayOf(String s0) { java.util.regex.Matcher x = DAYOF.matcher(trim(s0 == null ? "" : s0)); return x.find() ? x.group(1) + "-" + x.group(2) + "-" + x.group(3) : ""; }
    static double amt(String s0) { double n = round(num((s0 == null ? "" : s0).replaceAll("[,\\s원]", ""))); return Double.isFinite(n) ? n : Double.NaN; }
    static String cell(List<String> x, int i) { return i >= 0 && i < x.size() ? x.get(i) : ""; }
    Object importRun(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = tid(a); String kind = S(get(b, "kind")); if (!List.of("vbank", "van", "toss_settle").contains(kind)) throw E(400, "kind", "가져올 파일 종류를 확인해 주십시오.");
        List<List<String>> R0 = DdLedgerCalc.csvRows(S(get(b, "csv"))); if (R0.size() < 2) throw E(400, "csv", "가져올 내용이 없습니다."); if (R0.size() > 20001) throw E(413, "too_large", "한 번에 2만 줄까지 가져올 수 있습니다.");
        List<String> H = new ArrayList<>(); for (String h : R0.get(0)) H.add(trim(h).replaceAll("[" + WS + "]", ""));
        java.util.function.Function<String, Integer> ix = k -> { for (int i = 0; i < H.size(); i++) if (COL.get(k).matcher(H.get(i)).matches()) return i; return -1; };
        int d = ix.apply("day"), am = ix.apply("amount"), rf = ix.apply(kind), sh = ix.apply("share");
        if (am < 0 || rf < 0) throw E(400, "columns", "금액 · 번호 열을 찾지 못했습니다. 첫 줄 열 이름을 확인해 주십시오.", map("need", List.of("amount", "vbank".equals(kind) ? "학번" : "van".equals(kind) ? "승인번호" : "주문번호")));
        List<Object[]> rows = new ArrayList<>(); for (List<String> x : R0.subList(1, R0.size())) rows.add(new Object[]{ d >= 0 ? dayOf(cell(x, d)) : "", amt(cell(x, am)), trim(str(cell(x, rf), 60)), sh >= 0 ? (Object) amt(cell(x, sh)) : null });
        String fileName = emptyNull(str(get(b, "fileName"), 120));
        return T(tid, () -> {
            List<ObjectNode> cands = new ArrayList<>(); Long tol = null; int already = 0; List<String> made = new ArrayList<>(); Map<String, List<String>> gIds = new LinkedHashMap<>(); Map<String, String> gUnit = new LinkedHashMap<>();
            if ("vbank".equals(kind)) {
                List<String> bills = m.selectOpenBills(tid); Lines L = bills.isEmpty() ? null : linesOf(tid, null, bills, null); Map<String, ObjectNode> G = new LinkedHashMap<>();
                if (L != null) for (JsonNode l : L.bal.get("lines")) { if (l.get("balance").asLong() <= 0) continue; Map<String, Object> x = L.by.get(l.get("id").asText()); String bill = l.get("bill").asText();
                    ObjectNode g = G.get(bill); if (g == null) { g = F.objectNode().put("id", bill).put("day", x.get("due") == null ? "" : s(x.get("due"))).put("amount", 0L); g.putArray("keys").add(s(x.get("sid"))); G.put(bill, g); gUnit.put(bill, s(x.get("unit_id"))); gIds.put(bill, new ArrayList<>()); }
                    g.put("amount", g.get("amount").asLong() + l.get("balance").asLong()); gIds.get(bill).add(l.get("id").asText()); }
                cands.addAll(G.values());
            } else if ("van".equals(kind)) { tol = 1L; for (Map<String, Object> r : m.selectVanCands(tid)) { ObjectNode c = F.objectNode().put("id", s(r.get("id"))).put("day", s(r.get("day"))).put("amount", L(r.get("amount"))); c.putArray("keys").add(s(r.get("approval_no"))); cands.add(c); } }
            else { tol = 3L; for (Map<String, Object> r : m.selectTossCands(tid)) { ObjectNode c = F.objectNode().put("id", s(r.get("id"))).put("day", s(r.get("day"))).put("amount", L(r.get("amount"))); ArrayNode k = c.putArray("keys"); if (r.get("toss_order_id") != null && !"".equals(r.get("toss_order_id"))) k.add(s(r.get("toss_order_id"))); if (r.get("toss_payment_key") != null && !"".equals(r.get("toss_payment_key"))) k.add(s(r.get("toss_payment_key"))); cands.add(c); } }
            java.util.function.Function<Object[], String> idemOf = r -> "imp:vbank:" + r[2] + ":" + r[0] + ":" + numStr((Double) r[1]);
            List<Integer> keep = new ArrayList<>();
            if ("vbank".equals(kind)) { List<String> keys = new ArrayList<>(); for (Object[] r : rows) keys.add(idemOf.apply(r)); Set<String> have = new HashSet<>(keys.isEmpty() ? List.of() : m.selectIdemHave(tid, keys));
                for (int i = 0; i < rows.size(); i++) if (have.contains(idemOf.apply(rows.get(i)))) already++; else keep.add(i); }
            else for (int i = 0; i < rows.size(); i++) keep.add(i);
            ArrayNode in = F.arrayNode(); for (int i : keep) { Object[] r = rows.get(i); ObjectNode o = in.addObject(); o.put("day", (String) r[0]); o.set("amount", numNode((Double) r[1])); o.put("ref", (String) r[2]); }
            ObjectNode opt = F.objectNode(); if (tol != null) opt.put("dayTol", tol); else opt.putNull("dayTol");
            ObjectNode M = DdLedgerCalc.match(in, arrNode(cands), opt); Map<String, ObjectNode> byId = new LinkedHashMap<>(); for (ObjectNode c : cands) byId.put(c.get("id").asText(), c);
            if ("vbank".equals(kind)) for (JsonNode x : M.get("matched")) { Object[] r = rows.get(keep.get(x.get("row").asInt())); ObjectNode g = byId.get(x.get("id").asText()); String bill = g.get("id").asText();
                Rec rc = new Rec(); rc.unit = gUnit.get(bill); rc.sid = g.get("keys").get(0).asText(); rc.chargeIds = gIds.get(bill); rc.method = "vbank_ext"; rc.channel = "import"; rc.amount = ((Double) r[1]).longValue();
                rc.paidAt = !((String) r[0]).isEmpty() ? r[0] + "T12:00:00+09:00" : iso(Instant.now()); rc.share = false; rc.by = email(a); rc.idem = idemOf.apply(r);
                @SuppressWarnings("unchecked") Map<String, Object> row = (Map<String, Object>) record(tid, rc)[0]; made.add(s(row.get("id"))); }
            List<Map<String, Object>> unmatched = new ArrayList<>(); for (JsonNode u : M.get("unmatched")) { int i = keep.get(u.get("row").asInt()); Object[] r = rows.get(i); double av = (Double) r[1];
                unmatched.add(map("row", i + 2, "reason", u.get("reason").asText(), "day", r[0], "amount", Double.isNaN(av) ? null : (Object) (long) av, "ref", r[2])); }
            Map<String, Object> meta = new LinkedHashMap<>();
            if ("toss_settle".equals(kind)) { double sa = 0; String ym = ""; boolean hs = false; for (Object[] r : rows) { if (r[3] != null) { hs = true; double v = (Double) r[3]; if (Double.isFinite(v)) sa += v; } } for (Object[] r : rows) if (!((String) r[0]).isEmpty()) { ym = ((String) r[0]).substring(0, 7); break; }
                meta.put("shareActual", (long) sa); meta.put("ym", ym); meta.put("hasShare", hs); }
            String id = rid("li_"); int matched = M.get("matched").size();
            m.insertImport(tid, id, kind, fileName, rows.size(), matched, json(unmatched), json(meta), email(a));
            audit(tid, email(a), "ledger.import", map("import", id, "kind", kind, "rows", rows.size(), "matched", matched, "receipts", made.size()));
            return map("ok", true, "import", map("id", id, "kind", kind, "rows", rows.size(), "matched", matched, "already", already, "receipts", made, "unmatched", unmatched, "meta", meta)); });
    }

    // ── 학습자 · 보호자 · 링크 /api/pub/{tid}/ledger-* ────────
    @Override public Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception {
        switch (key) {
            case "GET ledger-my": { String sid = who(lauth); return T(tid, () -> { sweepNow(tid); Lines L = linesOf(tid, null, null, sid);
                List<Map<String, Object>> cs = new ArrayList<>(); for (Map<String, Object> x : L.charges) if (sid.equals(x.get("sid")) && !"void".equals(x.get("status"))) cs.add(x);
                cs.sort((x, y) -> s(y.get("created_at")).compareTo(s(x.get("created_at")))); List<Map<String, Object>> charges = new ArrayList<>(); long bal = 0;
                for (Map<String, Object> x : cs) { Map<String, Object> o = chOut(x, L.line.get(s(x.get("id")))); bal += L(o.get("balance")); charges.add(o); }
                return map("ok", true, "charges", charges, "receipts", myReceipts(tid, sid), "refunds", m.selectMyRefunds(tid, sid), "balance", bal, "payOnline", online(tid, charges)); }); }
            case "POST ledger-order": { String sid = who(lauth); rl.limit("lo:" + tid + ":" + sid, 30, 600_000L); JsonNode b = DdWeb.readBody(body, 4096);
                return T(tid, () -> { sweepNow(tid); return order(tid, sid, ids(get(b, "chargeIds"), 50), get(b, "amount"), null); }); }
            case "POST ledger-confirm": { String sid = who(lauth); rl.limit("lc:" + tid + ":" + sid, 30, 600_000L); return confirm(tid, sid, DdWeb.readBody(body, 2048), null); }
            case "GET ledger-bill": { rl.limit("lbill:" + web.ip(req), 60, 600_000L); String t = req.getParameter("t");
                return T(tid, () -> { Map<String, Object> Lk = link(tid, t); List<String> cids = idsJson(Lk.get("charge_ids_json")); Lines X = linesOf(tid, cids, null, null);
                    List<Map<String, Object>> items = new ArrayList<>(); long total = 0; for (Map<String, Object> x : X.charges) if (cids.contains(s(x.get("id")))) { Map<String, Object> o = chOut(x, X.line.get(s(x.get("id")))); total += L(o.get("balance")); items.add(o); }
                    Pay P = payFor(tid, items.isEmpty() ? "lu_root" : s(items.get(0).get("unit"))); String org = m.selectOrgName(tid);
                    return map("ok", true, "bill", map("who", initial(tid, s(Lk.get("sid"))) + " 학습자님", "org", org == null ? "" : org, "items", items, "total", total, "expiresAt", Lk.get("expires_at"), "payOnline", P.online())); }); }
            case "POST ledger-bill-order": { rl.limit("lbo:" + web.ip(req), 30, 600_000L); JsonNode b = DdWeb.readBody(body, 2048);
                return T(tid, () -> { sweepNow(tid); Map<String, Object> Lk = link(tid, S(get(b, "t"))); return order(tid, s(Lk.get("sid")), idsJson(Lk.get("charge_ids_json")), get(b, "amount"), s(Lk.get("token_hash"))); }); }
            case "POST ledger-bill-confirm": { rl.limit("lbc:" + web.ip(req), 30, 600_000L); JsonNode b = DdWeb.readBody(body, 2048);
                Map<String, Object> Lk = T(tid, () -> { Map<String, Object> x = m.selectLink(tid, sha(str(get(b, "t"), 100))); if (x == null) throw E(404, "link", "청구서를 찾지 못했어요."); return x; });
                return confirm(tid, s(Lk.get("sid")), b, s(Lk.get("token_hash"))); }
            default: throw E(404, "not_found", "없는 주소입니다.");
        }
    }
    /** 잔액 있는 청구의 단위들 + 루트 중 하나라도 토스 키가 있으면 온라인 결제 가능(최대 20단위) */
    boolean online(String tid, List<Map<String, Object>> charges) {
        Set<String> us = new LinkedHashSet<>(); for (Map<String, Object> x : charges) if (L(x.get("balance")) > 0) us.add(s(x.get("unit"))); List<String> l = new ArrayList<>(us); l.add("lu_root");
        for (String u : l.subList(0, Math.min(20, l.size()))) if (payFor(tid, u).online()) return true; return false;
    }
    List<Map<String, Object>> myReceipts(String tid, String sid) { List<Map<String, Object>> l = m.selectMyReceipts(tid, sid); for (Map<String, Object> x : l) x.put("chargeIds", idsJson(x.get("chargeIds"))); return l; }
    static String who(LAuth lauth) throws Exception { Map<String, Object> s = lauth.get(); if (s == null) throw E(401, "auth", "로그인이 필요해요."); return (String) s.get("sid"); }
    static Map<String, Object> chOut(Map<String, Object> x, JsonNode l) { return map("id", x.get("id"), "bill", x.get("bill_id"), "unit", x.get("unit_id"), "itemType", x.get("item_type"), "title", x.get("title"), "amount", x.get("amount"), "periodYm", x.get("period_ym"), "dueDate", x.get("due"),
        "status", l != null ? l.get("status").asText() : x.get("status"), "due", l != null ? (Object) l.get("due").asLong() : x.get("amount"), "paid", l != null ? l.get("paid").asLong() : 0L, "balance", l != null ? l.get("balance").asLong() : 0L); }

    /** 주문 만들기(학습자 · 링크 공통): 청구 잔액 합 = 결제 금액 */
    Map<String, Object> order(String tid, String sid, List<String> cids, JsonNode want, String linkHash) {
        if (cids.isEmpty()) throw E(400, "charge", "결제할 청구서를 골라 주세요.");
        Lines L = linesOf(tid, cids, null, null); List<Map<String, Object>> mine = new ArrayList<>(); for (Map<String, Object> x : L.charges) if (cids.contains(s(x.get("id")))) mine.add(x);
        if (mine.size() != cids.size() || mine.stream().anyMatch(x -> !sid.equals(x.get("sid")))) throw E(404, "charge", "청구서를 찾지 못했어요.");
        long amount = 0; for (String c : cids) { JsonNode l = L.line.get(c); if (l != null) amount += l.get("balance").asLong(); }
        if (amount <= 0) throw E(409, "paid", "이미 결제가 끝난 청구서예요.");
        if (!nullish(want)) { double w = round(num(want)); if (Double.isNaN(w) || w != amount) throw E(400, "amount_mismatch", "결제 금액이 청구 금액과 달라요. 다시 확인해 주세요."); }
        String unit = s(mine.get(0).get("unit_id")); Pay P = payFor(tid, unit); if (!P.online()) return map("ok", true, "payOnline", false, "amount", amount);
        String id = rid("lp_"), orderId = rid("lo_"); String name = mine.get(0).get("title") + (mine.size() > 1 ? " 외 " + (mine.size() - 1) + "건" : "");
        m.insertReceipt(tid, id, unit, sid, "online_card", "toss", amount, null, "ready", null, orderId, null, null, null, null, true, null, null, null, String.join(",", cids), linkHash);
        audit(tid, linkHash != null ? "link" : "learner:" + sid, "ledger.order", map("receipt", id, "orderId", orderId, "amount", amount));
        return map("ok", true, "payOnline", true, "orderId", orderId, "amount", amount, "orderName", cut(name, 100), "clientKey", P.clientKey);
    }
    static final Pattern LO = Pattern.compile("^lo_[a-z0-9]{12}$");
    /** 토스 승인: 조회 · 검증(트랜잭션) → 승인 호출 → 기록(트랜잭션) */
    Object confirm(String tid, String sid, JsonNode b, String linkHash) throws Exception {
        String orderId = str(get(b, "orderId"), 40), paymentKey = str(get(b, "paymentKey"), 200); if (!LO.matcher(orderId).matches() || paymentKey.isEmpty()) throw E(400, "pay", "결제 정보를 확인해 주세요.");
        Object[] X = T(tid, () -> { Map<String, Object> rc = m.selectReceiptByOrder(tid, orderId);
            if (rc == null || !sid.equals(rc.get("sid")) || (linkHash != null && !linkHash.equals(rc.get("link_hash")))) throw E(404, "order", "결제 요청을 찾지 못했어요.");
            if ("paid".equals(rc.get("status"))) return new Object[]{ rc, null, true }; if (!"ready".equals(rc.get("status"))) throw E(409, "expired", "결제 시간이 지났어요. 다시 결제해 주세요.");
            double a = round(num(get(b, "amount"))); if (Double.isNaN(a) || a != L(rc.get("amount"))) throw E(400, "amount_mismatch", "결제 금액이 청구 금액과 달라요.");
            return new Object[]{ rc, payFor(tid, s(rc.get("unit_id"))), false }; });
        @SuppressWarnings("unchecked") Map<String, Object> rc = (Map<String, Object>) X[0];
        if (B(X[2])) return out(rc);
        Pay P = (Pay) X[1]; long amt = L(rc.get("amount")); Object[] r = P.confirm(paymentKey, orderId, amt); String rcId = s(rc.get("id"));
        if (!B(r[0])) { tx.inTenant(tid, () -> m.failReceipt(tid, rcId, true)); throw E(502, "pg", "결제 승인에 실패했어요. 잠시 후 다시 시도해 주세요."); }
        if ((Long) r[1] != amt) { P.cancel(paymentKey, "금액 불일치", null, "mm-" + orderId); tx.inTenant(tid, () -> m.failReceipt(tid, rcId, false)); throw E(400, "amount_mismatch", "결제 금액이 달라 승인을 취소했어요."); }
        return T(tid, () -> { m.lockReceipt(tid, rcId); Map<String, Object> cur = m.selectReceipt(tid, rcId); if ("paid".equals(cur.get("status"))) return out(cur);
            settle(tid, cur, paymentKey, r[2] != null && ((String) r[2]).startsWith("https://") ? (String) r[2] : null); if (linkHash != null) m.useLink(tid, linkHash);
            audit(tid, linkHash != null ? "link" : "learner:" + sid, "ledger.pay", map("receipt", rcId, "amount", amt)); return out(cur); });
    }
    static Map<String, Object> out(Map<String, Object> rc) { return map("ok", true, "status", "paid", "receipt", map("id", rc.get("id"), "amount", rc.get("amount"))); }
    static final Pattern TOK = Pattern.compile("^[A-Za-z0-9_-]{20,100}$");
    /** 링크 토큰 → 청구서(만료 410 expired · 사용 409 used · 없음 404 link) */
    Map<String, Object> link(String tid, String t) {
        String tok = str(t, 100); if (!TOK.matcher(tok).matches()) throw E(404, "link", "청구서를 찾지 못했어요.");
        Map<String, Object> L = m.selectLink(tid, sha(tok)); if (L == null) throw E(404, "link", "청구서를 찾지 못했어요.");
        if (B(L.get("used"))) throw E(409, "used", "이미 결제한 청구서예요."); if (B(L.get("expired"))) throw E(410, "expired", "청구서 링크 기간이 지났어요. 기관에 다시 요청해 주세요."); return L;
    }
    /** 이름 대신 마스킹 이니셜(첫 글자 + ○) */
    String initial(String tid, String sid) {
        try { String mj = m.selectMember(tid, sid); if (mj == null) return "○○"; JsonNode n = crypt.memberName(parse(mj), tid); String nm = nullish(n) ? "" : egovframework.didisam.cmm.Js.str(n);
            return nm.isEmpty() ? "○○" : new String(Character.toChars(nm.codePointAt(0))) + "○"; } catch (Exception e) { return "○○"; }
    }
}
