package egovframework.didisam.fac.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdStateCrypto;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.fac.service.FacService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** v40 시설 · 장비 예약(02 명세 5절) — Node service/server/fac(mod-pub · mod-admin)와 같은 규격.
 *  설정(시설 · 요금 · 규칙 · 상품)은 게시본 doc.lsite.pub.fac(없으면 doc.fac)이 원본, 예약 · 이용권 · 입장 · 대여 · 결제 · 환불은 fac_* 표.
 *  금액은 항상 서버가 DdFac.quote로 다시 계산하고, 동시 예약 중복의 최종 방어선은 DB 유일 제약(fac_slot · fac_checkin · fac_rental)이다. */
@Service("facService")
public class FacServiceImpl extends EgovAbstractServiceImpl implements FacService {
    static final Pattern DAY = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$"), ID = Pattern.compile("^[\\w-]{1,80}$");
    static final List<String> AUD = List.of("student", "staff", "public");
    private final FacMapper m; private final TenantTx tx; private final DdRateLimiter rl; private final DdStateCrypto crypt; private final AuthService auth; private final DdWeb web;
    private final DdFacQr qr; private final String toss;
    private final Map<String, Long> swept = new ConcurrentHashMap<>(); private static final SecureRandom RND = new SecureRandom();
    private final HttpClient http = HttpClient.newBuilder().proxy(HttpClient.Builder.NO_PROXY).connectTimeout(java.time.Duration.ofSeconds(10)).build();

    public FacServiceImpl(FacMapper m, TenantTx tx, DdRateLimiter rl, DdStateCrypto crypt, AuthService auth, DdWeb web,
                          @Value("${FAC_QR_KEY:}") String qrKey, @Value("${PII_KEY:}") String piiKey, @Value("${TOSS_SECRET_KEY:}") String toss) {
        this.m = m; this.tx = tx; this.rl = rl; this.crypt = crypt; this.auth = auth; this.web = web; this.qr = new DdFacQr(qrKey, piiKey); this.toss = toss == null ? "" : toss.trim();
    }

    // ── 공통 ───────────────────────────────────────────────
    static DdException err(int st, String code, String msg) { return new DdException(st, msg, code); }
    static Map<String, Object> fail(HttpServletResponse res, int st, String code, String msg, Map<String, Object> extra) {
        res.setStatus(st); Map<String, Object> o = new LinkedHashMap<>(); o.put("error", code); o.put("message", msg); if (extra != null) o.putAll(extra); return o;
    }
    static Map<String, Object> map(Object... kv) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]); return o; }
    static String rid(String p) { byte[] b = new byte[6]; RND.nextBytes(b); StringBuilder s = new StringBuilder(p); for (byte x : b) s.append(String.format("%02x", x)); return s.toString(); }
    static String idemId(String p, String tid, String sid, String idem) {
        if (idem == null || idem.isEmpty()) return rid(p);
        try { byte[] h = MessageDigest.getInstance("SHA-256").digest((tid + "|" + sid + "|" + idem).getBytes(StandardCharsets.UTF_8)); StringBuilder s = new StringBuilder(p); for (int i = 0; i < 6; i++) s.append(String.format("%02x", h[i])); return s.toString(); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    static String today() { return kstToday(); }
    static String tail(Object sid) { String s = String.valueOf(sid); return s.length() <= 4 ? s : s.substring(s.length() - 4); }
    static long lng(Object o) { return o instanceof Number ? ((Number) o).longValue() : 0; }
    static int intOf(JsonNode o, String k, int d) { double v = num(get(o, k)); return Double.isNaN(v) ? d : (int) Math.floor(v); }
    static String iso(Instant t) { return t.atOffset(DdFac.KST).toLocalDateTime().truncatedTo(ChronoUnit.MINUTES) + "+09:00"; }

    /** 기관 문서 → {doc, fac} */
    static final class Cfg { JsonNode doc, fac; }
    Cfg cfg(String tid) throws Exception {
        String d = m.selectDoc(tid); if (d == null) throw err(404, "tenant", "없는 기관입니다.");
        Cfg c = new Cfg(); c.doc = crypt.open(parse(d), tid); JsonNode f = get(c.doc, "lsite", "pub", "fac"); c.fac = isObj(f) ? f : get(c.doc, "fac"); return c;
    }
    static JsonNode facOf(Cfg c, String id) { if (c.fac == null || (c.fac.has("on") && !truthy(c.fac.get("on")))) return null; for (JsonNode f : arr(get(c.fac, "facilities"))) if (id.equals(S(get(f, "id")))) return f; return null; }
    static JsonNode needFac(Cfg c, String id) { JsonNode f = facOf(c, id); if (f == null) throw err(404, "fac", "없는 시설입니다."); return f; }
    static JsonNode products(Cfg c) { return get(c.fac, "products"); }
    static JsonNode rules(JsonNode f) { return get(f, "rules"); }
    static List<String> resIds(JsonNode f) { List<String> l = new ArrayList<>(); for (JsonNode r : arr(get(f, "resources"))) if (!(r.has("on") && !truthy(r.get("on")))) l.add(S(get(r, "id"))); if (l.isEmpty()) l.add("r1"); return l; }
    static String resName(JsonNode f, String id) { for (JsonNode r : arr(get(f, "resources"))) if (id.equals(S(get(r, "id")))) return S(get(r, "name")); return id; }
    static int perSlot(JsonNode f) { return Math.max(1, intOf(get(f, "capacity"), "perSlot", 1)); }
    static int slotMin(JsonNode f) { return Math.max(5, intOf(f, "slotMin", 60)); }
    static int nSlots(JsonNode f, String day) { int[] h = DdFac.hoursOn(f, LocalDate.parse(day)); return Math.max(0, (h[1] - h[0]) / slotMin(f)); }
    static String hmOf(JsonNode f, String day, int slot) { return DdFac.hm(DdFac.hoursOn(f, LocalDate.parse(day))[0] + slot * slotMin(f)); }
    boolean tossOn() { return !toss.isEmpty(); }
    static boolean inRoster(Cfg c, String sid) { for (JsonNode x : arr(get(c.fac, "roster"))) if (sid.equals(x.isObject() ? S(get(x, "sid")) : x.asText())) return true; return false; }
    static String day(JsonNode b, String k) { String d = S(get(b, k)); if (!DAY.matcher(d).matches()) throw err(400, "date", "날짜 형식이 올바르지 않습니다."); try { LocalDate.parse(d); } catch (Exception e) { throw err(400, "date", "날짜 형식이 올바르지 않습니다."); } return d; }
    static String idOf(JsonNode b, String k) { String v = S(get(b, k)); if (!ID.matcher(v).matches()) throw err(400, k, "요청 값이 올바르지 않습니다."); return v; }
    static Map<String, Object> bkOut(Map<String, Object> b) { return map("id", b.get("id"), "status", b.get("status"), "amount", b.get("amount"), "payStatus", b.get("payStatus"), "holdUntil", b.get("holdUntil")); }

    // ── 학습자 /api/pub/{tid}/fac-* ─────────────────────────
    @Override public Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception {
        switch (key) {
            case "GET fac-list": rl.limit("facv:" + web.ip(req), 120, 600_000L); return tx.inTenant(tid, () -> list(cfg(tid)));
            case "GET fac-avail": rl.limit("facv:" + web.ip(req), 120, 600_000L); return avail(res, tid, req.getParameter("fac"), req.getParameter("day"));
            default:
        }
        if (!List.of("POST fac-quote", "POST fac-book", "POST fac-pay", "GET fac-my", "POST fac-cancel", "POST fac-qr", "POST fac-rent", "POST fac-buy").contains(key)) throw err(404, "not_found", "없는 주소입니다.");
        Map<String, Object> s = lauth.get(); if (s == null) throw processException("dd.401.auth");
        String sid = (String) s.get("sid");
        if ("GET fac-my".equals(key)) return my(tid, sid, "past".equals(req.getParameter("scope")));
        JsonNode b = DdWeb.readBody(body, 16 * 1024);
        rl.limit("facb:" + tid + ":" + sid, 30, 600_000L);
        switch (key) {
            case "POST fac-quote": return quote(tid, sid, b);
            case "POST fac-book": return book(res, tid, sid, b, null);
            case "POST fac-pay": return pay(res, tid, sid, b);
            case "POST fac-cancel": return cancelMine(tid, sid, b);
            case "POST fac-qr": return qrIssue(tid, sid, b);
            case "POST fac-rent": return rent(res, tid, sid, b);
            default: return buy(res, tid, sid, b);
        }
    }

    Map<String, Object> list(Cfg c) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (c.fac != null && !(c.fac.has("on") && !truthy(c.fac.get("on")))) for (JsonNode f : arr(get(c.fac, "facilities"))) {
            Map<String, Object> o = new LinkedHashMap<>();
            for (String k : List.of("id", "name", "kind", "place", "photo", "note", "link", "hours", "closed", "slotMin", "minSlots", "maxSlots", "capacity", "audience", "pay", "approval", "verify", "open", "windows", "prices", "refund", "extra", "resources")) if (f.has(k)) o.put(k, f.get(k));
            JsonNode r = rules(f); if (r != null) { Map<String, Object> pr = new LinkedHashMap<>(); for (String k : List.of("dupSame", "noShowMin", "oneEntryPerDay", "transferable", "maxActive")) if (r.has(k)) pr.put(k, r.get(k)); o.put("rules", pr); }
            List<JsonNode> ps = new ArrayList<>(); for (JsonNode p : arr(products(c))) if (S(get(f, "id")).equals(S(get(p, "fac")))) ps.add(p); o.put("products", ps);
            out.add(o);
        }
        return map("facilities", out);
    }

    Object avail(HttpServletResponse res, String tid, String fid, String d) throws Exception {
        if (d == null || !DAY.matcher(d).matches()) throw err(400, "date", "날짜 형식이 올바르지 않습니다.");
        Cfg c = tx.inTenant(tid, () -> cfg(tid)); JsonNode f = needFac(c, fid == null ? "" : fid); sweep(tid, c, fid, d);
        Map<String, Object> op = DdFac.isOpen(f, d, Instant.now());
        if ("not_open".equals(op.get("reason"))) return fail(res, 409, "not_open", "아직 예약이 열리지 않았어요.", op.containsKey("opensAt") ? map("opensAt", op.get("opensAt")) : null);
        if ("closed".equals(op.get("reason"))) return map("day", d, "open", false, "slots", List.of(), "note", closedNote(f, d));
        List<String> rs = resIds(f); int per = perSlot(f), n = nSlots(f, d);
        Map<String, Integer> taken = new LinkedHashMap<>();
        tx.inTenant(tid, () -> { for (Map<String, Object> r : m.selectTaken(tid, fid, d)) taken.put(r.get("res") + "|" + r.get("slot"), ((Number) r.get("n")).intValue()); return null; });
        Instant now = Instant.now(); List<Map<String, Object>> slots = new ArrayList<>(); int sm = slotMin(f), open0 = DdFac.hoursOn(f, LocalDate.parse(d))[0];
        for (int s = 0; s < n; s++) {
            List<String> free = new ArrayList<>(); int left = 0;
            for (String r : rs) { int x = Math.max(0, per - taken.getOrDefault(r + "|" + s, 0)); if (x > 0) free.add(r); left += x; }
            slots.add(map("slot", s, "from", DdFac.hm(open0 + s * sm), "to", DdFac.hm(open0 + (s + 1) * sm), "free", free, "left", left, "closed", false, "past", DdFac.slotStart(f, d, s).isBefore(now)));
        }
        return map("day", d, "open", !"past".equals(op.get("reason")), "resources", rs, "slots", slots, "note", "");
    }
    static String closedNote(JsonNode f, String d) { for (JsonNode c : arr(get(f, "closed"))) if (d.compareTo(S(get(c, "from"))) >= 0 && d.compareTo(S(get(c, "to")).isEmpty() ? S(get(c, "from")) : S(get(c, "to"))) <= 0) return S(get(c, "reason")).isEmpty() ? "휴관일이에요." : S(get(c, "reason")); return "운영하지 않는 날이에요."; }

    Map<String, Object> quoteOf(Cfg c, JsonNode f, String aud, String day, int slot, int slots, String productId) {
        try { return DdFac.quote(f, products(c), aud, day, slot, slots, productId); }
        catch (DdFac.CalcError e) { throw err("aud".equals(e.code) ? 403 : "fac".equals(e.code) ? 404 : 400, e.code, e.getMessage()); }
    }
    boolean needVerify(Cfg c, JsonNode f, String aud, String sid) {
        String v = S(get(f, "verify")); if ("sso".equals(v) && !"public".equals(aud)) throw err(403, "verify", "학교 계정 확인이 아직 준비되지 않았어요. 운영자에게 문의해 주세요.");
        return "sid".equals(v) && !"public".equals(aud) && !inRoster(c, sid);
    }
    Object quote(String tid, String sid, JsonNode b) throws Exception {
        Cfg c = tx.inTenant(tid, () -> cfg(tid)); JsonNode f = needFac(c, S(get(b, "fac"))); String aud = S(get(b, "aud"));
        Map<String, Object> q = quoteOf(c, f, aud, S(get(b, "day")), intOf(b, "slot", -1), intOf(b, "slots", 1), S(get(b, "productId")));
        Map<String, Object> o = map("list", q.get("list"), "off", q.get("off"), "final", q.get("final"), "deposit", q.get("deposit"), "lines", q.get("lines"));
        String pay = S(get(f, "pay")); o.put("pay", "online".equals(pay) && !tossOn() ? "onsite" : pay); o.put("needVerify", needVerify(c, f, aud, sid)); o.put("approval", truthy(get(f, "approval"))); return o;
    }

    /** 결제 방식 · 상태 결정 → {status, payStatus, payMode, next, holdMin} */
    Object[] payPlan(JsonNode f, JsonNode b, long amount, boolean approval) {
        String pay = S(get(f, "pay")), want = S(get(b, "payMode"));
        String mode = amount == 0 ? "free" : "onsite".equals(want) && "online".equals(pay) ? "onsite" : pay.isEmpty() ? "onsite" : pay;
        if ("free".equals(mode) && amount > 0) mode = "onsite";
        if (approval || "after-approve".equals(mode)) return new Object[]{ "requested", "none", "after-approve".equals(mode) ? "online" : mode, "wait", 0 };
        if (amount == 0) return new Object[]{ "confirmed", "none", "free", "done", 0 };
        if ("online".equals(mode) && !tossOn() && !"online".equals(want)) mode = "onsite";
        if ("online".equals(mode)) { if (!tossOn()) throw err(409, "onsite_only", "온라인 결제가 아직 준비되지 않았어요. 현장 결제로 신청해 주세요."); return new Object[]{ "confirmed", "pending", "online", "pay", 10 }; }
        return new Object[]{ "confirmed", "pending", "onsite", "done", 0 };
    }

    static final class Taken extends RuntimeException { Taken() { super(null, null, false, false); } }

    /** 시간 예약(학습자 fac-book · 운영자 대신 예약 공용). admin이 null이 아니면 운영자 대신 예약 */
    Object book(HttpServletResponse res, String tid, String sid, JsonNode b, Map<String, Object> admin) throws Exception {
        Cfg c = tx.inTenant(tid, () -> cfg(tid)); String fid = S(get(b, "fac")); JsonNode f = needFac(c, fid);
        if (!"time".equals(S(get(f, "kind"))) && !S(get(f, "kind")).isEmpty()) throw err(400, "kind", "시간 예약 시설이 아닙니다.");
        String d = day(b, "day"); int slot = intOf(b, "slot", -1), slots = intOf(b, "slots", 1); String aud = S(get(b, "aud")); if (!AUD.contains(aud)) throw err(400, "aud", "신청자 구분을 골라 주세요.");
        Map<String, Object> op = DdFac.isOpen(f, d, Instant.now());
        if ("past".equals(op.get("reason"))) throw err(400, "date", "지난 날짜는 예약할 수 없어요.");
        if ("closed".equals(op.get("reason"))) throw err(409, "closed", "휴관일이라 예약할 수 없어요.");
        if ("not_open".equals(op.get("reason")) && admin == null) return fail(res, 409, "not_open", "아직 예약이 열리지 않았어요.", op.containsKey("opensAt") ? map("opensAt", op.get("opensAt")) : null);
        if (slot < 0 || slots < 1 || slot + slots > nSlots(f, d)) throw err(400, "slot", "운영 시간 안의 시간 칸을 골라 주세요.");
        if (admin == null && DdFac.slotStart(f, d, slot).isBefore(Instant.now())) throw err(400, "date", "이미 지난 시간이에요.");
        JsonNode R = rules(f); String passId = S(get(b, "passId"));
        sweep(tid, c, fid, d);
        if (admin == null) {
            int lim = intOf(R, "noShowLimit", 3), banDays = intOf(R, "noShowBanDays", 30);
            List<String> ns = tx.inTenant(tid, () -> m.selectNoShowDays(tid, sid));
            Map<String, Object> bn = DdFac.ban(ns, lim, banDays, today()); if (Boolean.TRUE.equals(bn.get("banned"))) throw err(403, "suspended", "노쇼가 반복되어 " + bn.get("until") + "까지 예약할 수 없어요.");
            int maxA = intOf(R, "maxActive", 0); if (maxA > 0 && tx.inTenant(tid, () -> m.countActive(tid, sid)) >= maxA) throw err(409, "max_active", "동시에 잡을 수 있는 예약 수를 넘었어요.");
        }
        long amount; Map<String, Object> q = null;
        if (!passId.isEmpty()) {
            Map<String, Object> p = tx.inTenant(tid, () -> m.selectPass(tid, passId));
            if (p == null || !sid.equals(p.get("sid")) || !"active".equals(p.get("status")) || !fid.equals(p.get("facId")) || d.compareTo((String) p.get("startsOn")) < 0 || d.compareTo((String) p.get("endsOn")) > 0) throw err(400, "pass", "쓸 수 있는 이용권이 아니에요.");
            amount = 0;
        } else { q = quoteOf(c, f, aud, d, slot, slots, null); amount = lng(q.get("final")); }
        final long amt0 = amount; final Long list0 = q == null ? null : lng(q.get("list"));
        JsonNode ca = get(b, "amount"); if (admin == null && !nullish(ca) && Math.floor(num(ca) + 0.5) != amount) throw err(400, "amount", "결제 금액이 서버 계산과 다릅니다. 다시 확인해 주세요.");
        boolean nv = admin == null && needVerify(c, f, aud, sid);
        Object[] plan = admin != null ? new Object[]{ amount == 0 ? "confirmed" : "confirmed", amount == 0 ? "none" : "pending", amount == 0 ? "free" : "onsite", "done", 0 } : payPlan(f, b, amount, truthy(get(f, "approval")) || nv);
        String extra = extraOf(f, b, d); String memberNo = S(get(b, "memberNo")).isEmpty() ? null : cut(S(get(b, "memberNo")), 40);
        String bk = idemId("bk_", tid, sid, S(get(b, "idem")).length() > 100 ? "" : S(get(b, "idem")));
        String excl = truthy(get(R, "dupSame")) || R == null || !R.has("dupSame") ? (S(get(R, "exclGroup")).isEmpty() ? fid : S(get(R, "exclGroup"))) : null;
        List<String> cands = new ArrayList<>(); String wantRes = S(get(b, "res"));
        if (!wantRes.isEmpty()) { if (!resIds(f).contains(wantRes)) throw err(400, "res", "없는 자원입니다."); cands.add(wantRes); } else cands.addAll(resIds(f));
        int per = perSlot(f); String order = "online".equals(plan[2]) && "pending".equals(plan[1]) && "pay".equals(plan[3]) ? "fo_" + bk.substring(3) + "_" + rid("").substring(0, 6) : null;
        Map<String, Object> out;
        try {
            out = tx.inTenant(tid, () -> {
                m.lock(tid + "|" + fid + "|" + d);
                Map<String, Object> ex = m.selectBooking(tid, bk); if (ex != null) return ex;
                String got = null;
                for (String r : cands) {
                    boolean ok = true;
                    for (int s = slot; s < slot + slots && ok; s++) { boolean seated = false; for (int seat = 1; seat <= per && !seated; seat++) seated = m.insertSlot(tid, fid, r, d, s, seat, bk, sid, excl) == 1; ok = seated; }
                    if (ok) { got = r; break; } m.deleteSlots(tid, bk);
                }
                if (got == null) throw new Taken();
                if (!passId.isEmpty() && m.usePass(tid, passId) == 0) throw err(409, "pass", "이용권 남은 횟수가 없어요.");
                m.insertBooking(tid, bk, fid, got, sid, aud, memberNo, d, slot, slots, DdFac.slotStart(f, d, slot).toEpochMilli(), DdFac.slotStart(f, d, slot + slots).toEpochMilli(), R != null && R.has("noShowMin") ? Integer.valueOf(intOf(R, "noShowMin", 15)) : null, admin == null ? null : (String) admin.get("email"), (String) plan[0], (String) plan[2], amt0, (String) plan[1], passId.isEmpty() ? null : passId, admin == null ? null : cut(S(get(b, "note")), 200), extra, (Integer) plan[4]);
                if (order != null) m.insertPayment(tid, rid("fp_"), bk, null, null, "toss", amt0, list0, order, null, null, null, "ready");
                if (admin != null) tx.audit(tid, (String) admin.get("email"), "fac.book", DdWeb.JSON.createObjectNode().put("id", bk).put("fac", fid).put("day", d).toString());
                return m.selectBooking(tid, bk);
            });
        } catch (Taken t) {
            List<String> alt = new ArrayList<>(); if (!wantRes.isEmpty()) { Map<String, Integer> tk = new LinkedHashMap<>(); tx.inTenant(tid, () -> { for (Map<String, Object> r : m.selectTaken(tid, fid, d)) tk.put(r.get("res") + "|" + r.get("slot"), ((Number) r.get("n")).intValue()); return null; });
                for (String r : resIds(f)) { if (r.equals(wantRes)) continue; boolean ok = true; for (int s = slot; s < slot + slots; s++) if (tk.getOrDefault(r + "|" + s, 0) >= per) ok = false; if (ok) alt.add(r); } }
            return fail(res, 409, "taken", "이미 예약된 시간이에요. 다른 시간이나 자원을 골라 주세요.", map("alt", alt));
        } catch (DuplicateKeyException e) { throw err(409, "dup_same", "같은 시간에 이미 다른 예약이 있어요."); }
        Map<String, Object> o = map("ok", true, "booking", bkOut(out), "next", "online".equals(out.get("payMode")) && "pending".equals(out.get("payStatus")) && out.get("holdUntil") != null ? "pay" : "requested".equals(out.get("status")) ? "wait" : "done");
        if ("pay".equals(o.get("next"))) { Map<String, Object> p = tx.inTenant(tid, () -> m.selectPaymentFor(tid, bk)); if (p != null) o.put("orderId", p.get("orderId")); }
        return o;
    }
    /** 선택 수집(차량번호 등): 목적 · 보관 기간이 있는 칸만, 동의가 있을 때만, purge_at과 함께 */
    static String extraOf(JsonNode f, JsonNode b, String d) {
        JsonNode ex = get(b, "extra"); if (!isObj(ex) || !truthy(get(b, "consent", "extra"))) return null;
        var o = DdWeb.JSON.createObjectNode(); int keep = 0;
        for (JsonNode x : arr(get(f, "extra"))) { String k = S(get(x, "key")); if (k.isEmpty() || S(get(x, "purpose")).isEmpty() || !ex.has(k)) continue; o.put(k, cut(S(ex.get(k)), 40)); keep = Math.max(keep, intOf(x, "keepDays", 30)); }
        if (o.size() == 0) return null; o.put("purge_at", LocalDate.parse(d).plusDays(keep).toString()); return o.toString();
    }

    Object my(String tid, String sid, boolean past) throws Exception {
        return tx.inTenant(tid, () -> { Cfg c = cfg(tid); List<Map<String, Object>> bs = new ArrayList<>();
            for (Map<String, Object> b : m.selectMine(tid, sid, past)) bs.add(decorate(c, b, false));
            List<Map<String, Object>> ps = new ArrayList<>(); for (Map<String, Object> p : m.selectMyPasses(tid, sid)) { JsonNode pr = DdFac.product(products(c), (String) p.get("productId")); p.put("name", pr == null ? p.get("productId") : S(get(pr, "name"))); ps.add(p); }
            return map("bookings", bs, "passes", ps, "rentals", m.selectMyRentals(tid, sid)); });
    }
    static Map<String, Object> decorate(Cfg c, Map<String, Object> b, boolean mask) {
        JsonNode f = facOf(c, (String) b.get("facId")); Map<String, Object> o = new LinkedHashMap<>(b);
        if (f != null) { o.put("facName", S(get(f, "name"))); o.put("resName", resName(f, (String) b.get("resId"))); int s = ((Number) b.get("slot")).intValue(), n = ((Number) b.get("slots")).intValue(); o.put("from", hmOf(f, (String) b.get("day"), s)); o.put("to", hmOf(f, (String) b.get("day"), s + n)); }
        if (mask) { o.put("sidTail", tail(b.get("sid"))); o.remove("sid"); }
        return o;
    }

    /** 취소 공통: 칸 해제 · 이용권 되돌림 · 환불 자동 계산 */
    Map<String, Object> cancelCore(String tid, Cfg c, Map<String, Object> bk, String reason, String actor) throws Exception {
        String id = (String) bk.get("id"); JsonNode f = facOf(c, (String) bk.get("facId")); long paid = "paid".equals(bk.get("payStatus")) ? lng(bk.get("amount")) : 0;
        Map<String, Object> rf = paid > 0 && f != null ? refundCalc(f, bk, paid) : map("auto", 0L, "lines", List.of("결제한 금액이 없어 환불할 금액이 없습니다."));
        tx.inTenant(tid, () -> { m.updateBooking(tid, id, "cancelled", null, cut(reason, 200), -1); m.deleteSlots(tid, id); if (bk.get("passId") != null) m.unusePass(tid, (String) bk.get("passId"));
            tx.audit(tid, actor, "fac.cancel", DdWeb.JSON.createObjectNode().put("id", id).put("auto", lng(rf.get("auto"))).toString()); return null; });
        return rf;
    }
    static Map<String, Object> refundCalc(JsonNode f, Map<String, Object> bk, long paid) {
        var in = DdWeb.JSON.createObjectNode(); JsonNode rule = get(f, "refund"); in.set("rule", isObj(rule) ? rule : DdWeb.JSON.createObjectNode().put("type", "time"));
        in.put("paid", paid); in.put("startAt", DdFac.slotStart(f, (String) bk.get("day"), ((Number) bk.get("slot")).intValue()).atOffset(DdFac.KST).toString()); in.put("now", Instant.now().atOffset(DdFac.KST).toString());
        return facRefund(in);
    }
    Object cancelMine(String tid, String sid, JsonNode b) throws Exception {
        String id = idOf(b, "booking"); Cfg c = tx.inTenant(tid, () -> cfg(tid));
        Map<String, Object> bk = tx.inTenant(tid, () -> m.selectBooking(tid, id)); if (bk == null || !sid.equals(bk.get("sid"))) throw err(404, "booking", "예약을 찾지 못했어요.");
        JsonNode f = facOf(c, (String) bk.get("facId"));
        if (!List.of("requested", "approved", "confirmed").contains(bk.get("status")) || (f != null && DdFac.slotStart(f, (String) bk.get("day"), ((Number) bk.get("slot")).intValue()).isBefore(Instant.now()))) throw err(409, "not_cancelable", "지금은 취소할 수 없는 예약이에요.");
        Map<String, Object> rf = cancelCore(tid, c, bk, S(get(b, "reason")), "learner:" + tail(sid));
        return map("ok", true, "refund", rf, "status", "cancelled");
    }

    Object qrIssue(String tid, String sid, JsonNode b) throws Exception {
        if (!qr.on()) throw err(503, "qr_key", "입장 QR이 아직 준비되지 않았어요. 운영자에게 문의해 주세요.");
        Cfg c = tx.inTenant(tid, () -> cfg(tid)); String td = today(); Instant now = Instant.now();
        String kind, id, fac, d = td; long exp;
        if (!S(get(b, "booking")).isEmpty()) {
            id = idOf(b, "booking"); Map<String, Object> bk = tx.inTenant(tid, () -> m.selectBooking(tid, id)); if (bk == null || !sid.equals(bk.get("sid"))) throw err(404, "booking", "예약을 찾지 못했어요.");
            if (!td.equals(bk.get("day"))) throw err(409, "not_today", "입장 QR은 이용 당일에 열려요.");
            if (!"confirmed".equals(bk.get("status")) || bk.get("holdUntil") != null) throw err(409, "not_ready", "승인 · 결제가 끝나면 입장 QR이 열려요.");
            JsonNode f = needFac(c, (String) bk.get("facId")); kind = "b"; fac = (String) bk.get("facId");
            exp = DdFac.slotStart(f, td, ((Number) bk.get("slot")).intValue() + ((Number) bk.get("slots")).intValue()).plusSeconds(15 * 60).getEpochSecond();
        } else if (!S(get(b, "passId")).isEmpty()) {
            id = idOf(b, "passId"); Map<String, Object> p = tx.inTenant(tid, () -> m.selectPass(tid, id)); if (p == null || !sid.equals(p.get("sid"))) throw err(404, "pass", "이용권을 찾지 못했어요.");
            if (!"active".equals(p.get("status"))) throw err(409, "not_ready", "쓸 수 있는 이용권이 아니에요.");
            if (td.compareTo((String) p.get("startsOn")) < 0 || td.compareTo((String) p.get("endsOn")) > 0) throw err(409, "not_today", "이용 기간이 아니에요.");
            kind = "p"; fac = (String) p.get("facId"); exp = LocalDate.parse(td).plusDays(1).atStartOfDay().toInstant(DdFac.KST).getEpochSecond() - 1;
        } else {
            id = idOf(b, "rental"); Map<String, Object> r = tx.inTenant(tid, () -> m.selectRental(tid, id)); if (r == null || !sid.equals(r.get("sid"))) throw err(404, "rental", "대여 신청을 찾지 못했어요.");
            if (!List.of("approved", "lent", "overdue").contains(r.get("status"))) throw err(409, "not_ready", "승인되면 QR이 열려요.");
            kind = "r"; fac = (String) r.get("facId"); exp = LocalDate.parse(td).plusDays(1).atStartOfDay().toInstant(DdFac.KST).getEpochSecond() - 1;
        }
        if (exp <= now.getEpochSecond()) throw err(409, "not_today", "이용 시간이 지났어요.");
        return map("token", qr.issue(tid, kind, id, fac, d, now.getEpochSecond(), exp), "exp", iso(Instant.ofEpochSecond(exp)), "day", d);
    }

    Object rent(HttpServletResponse res, String tid, String sid, JsonNode b) throws Exception {
        Cfg c = tx.inTenant(tid, () -> cfg(tid)); String fid = S(get(b, "fac")); JsonNode f = needFac(c, fid); String pid = S(get(b, "productId")), aud = S(get(b, "aud"));
        JsonNode p = DdFac.product(products(c), pid); if (p == null || !"rent".equals(S(get(p, "type")))) throw err(400, "product", "대여 상품을 골라 주세요.");
        Map<String, Object> q = quoteOf(c, f, aud, today(), 0, 1, pid); long amount = lng(q.get("final")), deposit = lng(q.get("deposit")); boolean nv = needVerify(c, f, aud, sid);
        int days = Math.max(1, Math.min(intOf(p, "days", 1), intOf(b, "days", intOf(p, "days", 1))));
        Object[] plan = payPlan(f, b, amount + deposit, truthy(get(f, "approval")) || nv);
        String status = "requested".equals(plan[0]) ? "requested" : "approved", id = idemId("rt_", tid, sid, S(get(b, "idem")));
        String td = today(), due = LocalDate.parse(td).plusDays(days).toString(); String wantRes = S(get(b, "res"));
        try {
            Map<String, Object> r = tx.inTenant(tid, () -> {
                m.lock(tid + "|rent|" + fid); Map<String, Object> ex = m.selectRental(tid, id); if (ex != null) return ex;
                List<String> busy = m.selectRentedRes(tid, fid); String got = null;
                for (String x : resIds(f)) if ((wantRes.isEmpty() || wantRes.equals(x)) && !busy.contains(x)) { got = x; break; }
                if (got == null) throw new Taken();
                m.insertRental(tid, id, sid, aud, "free".equals(plan[2]) ? "free" : (String) plan[2], amount + deposit > 0 ? "pending" : "none", fid, got, pid, td, due, deposit, deposit > 0 ? "held" : null, amount, status);
                return m.selectRental(tid, id);
            });
            return map("ok", true, "rental", map("id", r.get("id"), "status", r.get("status"), "dueDay", r.get("dueDay"), "deposit", r.get("deposit"), "amount", r.get("amount")), "next", "requested".equals(r.get("status")) ? "wait" : "online".equals(plan[2]) ? "pay" : "done");
        } catch (Taken t) { return fail(res, 409, "taken", "지금 빌릴 수 있는 물품이 없어요.", map("alt", List.of())); }
        catch (DuplicateKeyException e) { return fail(res, 409, "taken", "지금 빌릴 수 있는 물품이 없어요.", map("alt", List.of())); }
    }

    Object buy(HttpServletResponse res, String tid, String sid, JsonNode b) throws Exception {
        Cfg c = tx.inTenant(tid, () -> cfg(tid)); String pid = S(get(b, "productId")), aud = S(get(b, "aud"));
        JsonNode p = DdFac.product(products(c), pid); if (p == null || !S(get(p, "type")).startsWith("pass-")) throw err(400, "product", "이용권 상품을 골라 주세요.");
        JsonNode f = needFac(c, S(get(p, "fac"))); Map<String, Object> q = quoteOf(c, f, aud, today(), 0, 1, pid); long amount = lng(q.get("final"));
        Object[] plan = payPlan(f, b, amount, false);
        String type = S(get(p, "type")), kind = "pass-count".equals(type) ? "count" : "pass-course".equals(type) ? "course" : "period", td = today();
        long total = "count".equals(kind) ? intOf(p, "count", 1) : intOf(p, "count", intOf(p, "days", 30));
        int days = "count".equals(kind) ? intOf(p, "expireDays", 365) : intOf(p, "days", 30);
        String id = idemId("ps_", tid, sid, S(get(b, "idem"))), status = amount == 0 ? "active" : "pending"; String order = "online".equals(plan[2]) ? "fo_" + id.substring(3) + "_" + rid("").substring(0, 6) : null;
        Map<String, Object> ps = tx.inTenant(tid, () -> { Map<String, Object> ex = m.selectPass(tid, id); if (ex != null) return ex;
            m.insertPass(tid, id, sid, aud, amount, pid, S(get(p, "fac")), kind, total, td, LocalDate.parse(td).plusDays(days - 1).toString(), status, S(get(p, "cls")).isEmpty() ? null : S(get(p, "cls")));
            if (order != null) m.insertPayment(tid, rid("fp_"), null, id, null, "toss", amount, lng(q.get("list")), order, null, null, null, "ready");
            return m.selectPass(tid, id); });
        Map<String, Object> o = map("ok", true, "pass", map("id", ps.get("id"), "status", ps.get("status"), "amount", amount, "endsOn", ps.get("endsOn")), "next", amount == 0 ? "done" : "online".equals(plan[2]) ? "pay" : "onsite");
        if (order != null) o.put("orderId", order); return o;
    }

    /** 토스 승인(결정 1: 비밀키는 env TOSS_SECRET_KEY, 없으면 409 pg_off) */
    Object pay(HttpServletResponse res, String tid, String sid, JsonNode b) throws Exception {
        if (!tossOn()) throw err(409, "onsite_only", "온라인 결제가 아직 준비되지 않았어요. 현장 결제로 신청해 주세요.");
        String orderId = idOf(b, "orderId"), key = cut(S(get(b, "paymentKey")), 200); double amt = num(get(b, "amount"));
        Map<String, Object> p = tx.inTenant(tid, () -> m.selectPayment(tid, orderId)); if (p == null) throw err(404, "payment", "결제 정보를 찾지 못했어요.");
        String bkId = (String) p.get("bookingId"), psId = (String) p.get("passId");
        Map<String, Object> bk = bkId == null ? null : tx.inTenant(tid, () -> m.selectBooking(tid, bkId)); Map<String, Object> ps = psId == null ? null : tx.inTenant(tid, () -> m.selectPass(tid, psId));
        if ((bk != null && !sid.equals(bk.get("sid"))) || (ps != null && !sid.equals(ps.get("sid")))) throw err(404, "payment", "결제 정보를 찾지 못했어요.");
        if ("paid".equals(p.get("status"))) return map("ok", true, "status", "confirmed");
        if (bk != null && !"confirmed".equals(bk.get("status"))) throw err(409, "hold_expired", "결제 대기 시간이 지나 예약이 풀렸어요. 다시 예약해 주세요.");
        long want = lng(p.get("amount")); if (Double.isNaN(amt) || (long) Math.floor(amt + 0.5) != want) throw err(400, "amount_mismatch", "결제 금액이 예약 금액과 다릅니다.");
        HttpResponse<String> r;
        try { r = http.send(HttpRequest.newBuilder(URI.create("https://api.tosspayments.com/v1/payments/confirm")).timeout(java.time.Duration.ofSeconds(20))
                .header("authorization", "Basic " + Base64.getEncoder().encodeToString((toss + ":").getBytes(StandardCharsets.UTF_8))).header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(DdWeb.JSON.createObjectNode().put("paymentKey", key).put("orderId", orderId).put("amount", want).toString())).build(), HttpResponse.BodyHandlers.ofString()); }
        catch (Exception e) { throw err(502, "pg", "결제사 연결에 실패했어요. 잠시 후 다시 시도해 주세요."); }
        JsonNode j = parse(r.body()); if (r.statusCode() >= 300 || num(get(j, "totalAmount")) != want) throw err(r.statusCode() >= 300 ? 502 : 400, r.statusCode() >= 300 ? "pg" : "amount_mismatch", "결제 승인에 실패했어요.");
        tx.inTenant(tid, () -> { m.updatePayment(tid, (String) p.get("id"), "paid", key);
            if (bk != null) m.updateBooking(tid, bkId, "confirmed", "paid", null, -1); if (ps != null) m.updatePass(tid, psId, "active", (String) p.get("id")); return null; });
        return map("ok", true, "status", "confirmed");
    }

    // ── 정리(노쇼 · 보류 만료) — 크론 없이 요청 때 + 1시간 tick(02 명세 5-6) ─────────
    void sweep(String tid, Cfg c, String fid, String d) {
        String k = tid + "|" + fid + "|" + d; long now = System.currentTimeMillis(); Long last = swept.get(k); if (last != null && now - last < 60_000) return; swept.put(k, now);
        if (swept.size() > 5000) swept.entrySet().removeIf(e -> now - e.getValue() > 60_000);
        JsonNode f = facOf(c, fid); if (f == null) return; int nsMin = intOf(rules(f), "noShowMin", 15);
        try {
            tx.inTenant(tid, () -> { Instant t = Instant.now();
                for (Map<String, Object> b : m.selectSweep(tid, fid, d)) {
                    String id = (String) b.get("id");
                    if (Boolean.TRUE.equals(b.get("holdOver")) && "pending".equals(b.get("payStatus")) && "online".equals(b.get("payMode"))) { m.updateBooking(tid, id, "expired", null, "결제 대기 시간 만료", -1); m.deleteSlots(tid, id); }
                    else if (nsMin > 0 && "confirmed".equals(b.get("status")) && b.get("holdUntil") == null && DdFac.noShow(DdFac.slotStart(f, d, ((Number) b.get("slot")).intValue()), t, nsMin, Boolean.TRUE.equals(b.get("checkedIn")))) {
                        m.updateBooking(tid, id, "no_show", null, "미입장 자동 취소", -1); m.deleteSlots(tid, id); if (b.get("passId") != null) m.unusePass(tid, (String) b.get("passId"));
                        tx.audit(tid, "system", "fac.noshow", DdWeb.JSON.createObjectNode().put("id", id).toString());
                    }
                }
                return null; });
        } catch (Exception e) { swept.remove(k); }
    }
    @Scheduled(fixedDelay = 3600000, initialDelayString = "${dd.fac.tickMs:600000}")
    public void tick() {
        List<String> ts; try { ts = tx.plain(m::selectTenantIds); } catch (Exception e) { return; }
        for (String tid : ts) try {
            List<Map<String, Object>> days = tx.inTenant(tid, () -> { m.markOverdue(tid); return m.selectSweepDays(tid); });
            if (days.isEmpty()) continue; Cfg c = tx.inTenant(tid, () -> cfg(tid)); for (Map<String, Object> x : days) sweep(tid, c, (String) x.get("fac"), (String) x.get("day"));
        } catch (Exception ignore) { }
    }

    // ── 운영자 /api/fac/* ─────────────────────────────────
    static final List<String> TEACHER_OK = List.of("GET overview", "GET bookings", "POST checkin", "POST rentals/return");
    @Override public Object admin(HttpServletRequest req, HttpServletResponse res, String op, String id, byte[] body) throws Exception {
        JsonNode b = req.getMethod().equals("GET") ? null : DdWeb.readBody(body, 64 * 1024);
        if ("POST checkin".equals(op) && b != null && !S(get(b, "kiosk")).isEmpty() && req.getHeader("cookie") == null) return kioskCheckin(req, b);
        Map<String, Object> a = auth.need(req); String tid = (String) a.get("tid"), role = (String) a.get("role"), email = (String) a.get("email");
        boolean teacher = "teacher".equals(role); if (teacher && !TEACHER_OK.contains(op)) throw processException("dd.403.teacher");
        if (id != null && !ID.matcher(id).matches()) throw err(404, "not_found", "없는 주소입니다.");
        Cfg c = tx.inTenant(tid, () -> cfg(tid)); List<String> mine = teacher ? teacherFacs(c, email) : null;
        switch (op) {
            case "GET overview": {
                for (JsonNode f : arr(get(c.fac, "facilities"))) sweep(tid, c, S(get(f, "id")), today());
                Map<String, Object> o = tx.inTenant(tid, () -> { Map<String, Object> x = m.selectOverview(tid); x.put("today", map("bookings", x.remove("todayBookings"), "checkins", m.countCheckins(tid))); return x; });
                return o;
            }
            case "GET bookings": {
                String from = qp(req, "from"), to = qp(req, "to"), fac = qp(req, "fac"); if (fac != null && from != null && from.equals(to)) sweep(tid, c, fac, from);
                List<Map<String, Object>> rows = tx.inTenant(tid, () -> m.selectBookings(tid, dayOrNull(from), dayOrNull(to), fac, qp(req, "status"), qp(req, "q"), mine));
                List<Map<String, Object>> out = new ArrayList<>(); for (Map<String, Object> r : rows) { Map<String, Object> x = decorate(c, r, true); x.keySet().retainAll(List.of("id", "facId", "facName", "resId", "resName", "day", "slot", "slots", "from", "to", "status", "aud", "sidTail", "amount", "payStatus", "payMode", "checkedIn", "holdUntil")); out.add(x); }
                return map("bookings", out);
            }
            case "GET bookings/id": {
                Map<String, Object> bk = tx.inTenant(tid, () -> m.selectBooking(tid, id)); if (bk == null) throw err(404, "booking", "예약을 찾지 못했습니다.");
                Map<String, Object> o = decorate(c, bk, false); o.put("payment", tx.inTenant(tid, () -> m.selectPaymentFor(tid, id))); return o;
            }
            case "POST bookings": {
                String sid = !S(get(b, "sid")).isEmpty() ? cut(S(get(b, "sid")), 60) : "walkin:" + cut(S(get(b, "walkin")).isEmpty() ? "현장" : S(get(b, "walkin")), 40);
                return book(res, tid, sid, b, a);
            }
            case "POST bookings/approve": {
                Map<String, Object> bk = needBk(tid, id); if (!"requested".equals(bk.get("status"))) throw err(409, "state", "승인 대기 상태가 아닙니다.");
                long amt = lng(bk.get("amount")); String pm = (String) bk.get("payMode");
                String st = "confirmed"; boolean hold = amt > 0 && "online".equals(pm) && tossOn(); String ps = amt == 0 ? "none" : "pending";
                String order = hold ? "fo_" + id.substring(3) + "_" + rid("").substring(0, 6) : null;
                tx.inTenant(tid, () -> { m.updateBooking(tid, id, st, ps, null, hold ? 1440 : 0); if (order != null) m.insertPayment(tid, rid("fp_"), id, null, null, "toss", amt, null, order, null, null, null, "ready");
                    tx.audit(tid, email, "fac.approve", DdWeb.JSON.createObjectNode().put("id", id).toString()); return null; });
                Map<String, Object> o = map("status", st); if (order != null) o.put("orderId", order); return o;
            }
            case "POST bookings/reject": {
                Map<String, Object> bk = needBk(tid, id); if (!"requested".equals(bk.get("status"))) throw err(409, "state", "승인 대기 상태가 아닙니다.");
                String reason = cut(S(get(b, "reason")), 200); if (reason.isEmpty()) throw err(400, "reason", "반려 사유를 입력해 주십시오.");
                tx.inTenant(tid, () -> { m.updateBooking(tid, id, "rejected", null, reason, -1); m.deleteSlots(tid, id); if (bk.get("passId") != null) m.unusePass(tid, (String) bk.get("passId"));
                    tx.audit(tid, email, "fac.reject", DdWeb.JSON.createObjectNode().put("id", id).toString()); return null; });
                return map("status", "rejected");
            }
            case "POST bookings/cancel": {
                Map<String, Object> bk = needBk(tid, id); if (!List.of("requested", "approved", "confirmed").contains(bk.get("status"))) throw err(409, "not_cancelable", "취소할 수 있는 상태가 아닙니다.");
                return map("refund", cancelCore(tid, c, bk, S(get(b, "reason")), email), "status", "cancelled");
            }
            case "POST closures": return closures(tid, c, b, email);
            case "POST checkin": return checkin(tid, c, b, teacher ? email : email, "front", mine);
            case "POST kiosk/start": {
                String fac = S(get(b, "fac")); needFac(c, fac); String pin = S(get(c.fac, "settings", "kioskPin")); if (pin.isEmpty()) throw err(409, "no_pin", "설정에서 키오스크 PIN을 먼저 정해 주십시오."); if ( !MessageDigest.isEqual(pin.getBytes(StandardCharsets.UTF_8), S(get(b, "pin")).getBytes(StandardCharsets.UTF_8))) throw err(403, "pin", "키오스크 PIN이 맞지 않습니다.");
                if (!qr.on()) throw err(503, "qr_key", "입장 QR 키가 설정되지 않았습니다.");
                long exp = Instant.now().getEpochSecond() + 12 * 3600;
                tx.audit(tid, email, "fac.kiosk", DdWeb.JSON.createObjectNode().put("fac", fac).toString());
                return map("kioskToken", qr.kiosk(tid, fac, exp), "exp", iso(Instant.ofEpochSecond(exp)));
            }
            case "POST payments": return payments(tid, c, b, email);
            case "GET refunds": { String st = qp(req, "status"); return map("refunds", tx.inTenant(tid, () -> m.selectRefunds(tid, st))); }
            case "POST refunds": return refunds(tid, c, b, email);
            case "POST rentals/lend": {
                Map<String, Object> r = needRt(tid, id); if (!"approved".equals(r.get("status"))) throw err(409, "state", "승인된 대여만 내줄 수 있습니다.");
                tx.inTenant(tid, () -> { m.updateRental(tid, id, "lent", null, null, cut(S(get(b, "condition")), 300)); tx.audit(tid, email, "fac.lend", DdWeb.JSON.createObjectNode().put("id", id).toString()); return null; });
                return map("status", "lent", "dueDay", r.get("dueDay"));
            }
            case "POST rentals/return": {
                Map<String, Object> r = needRt(tid, id); if (!List.of("lent", "overdue").contains(r.get("status"))) throw err(409, "state", "대여 중인 물품이 아닙니다.");
                if (mine != null && !mine.contains(r.get("facId"))) throw processException("dd.403.teacher");
                JsonNode p = DdFac.product(products(c), String.valueOf(r.get("productId")));
                long lateDays = Math.max(0, ChronoUnit.DAYS.between(LocalDate.parse((String) r.get("dueDay")), LocalDate.parse(today()))), dep = lng(r.get("deposit"));
                long late = DdFac.lateFee((String) r.get("dueDay"), today(), num(get(p, "lateFeePerDay")), dep > 0 ? (double) dep : null)[1];
                var in = DdWeb.JSON.createObjectNode(); in.set("rule", DdWeb.JSON.createObjectNode().put("type", "rent")); in.put("deposit", dep); in.put("lateFee", late); in.put("deductions", Math.max(0, (long) num(get(b, "deductions"))));
                long back = lng(facRefund(in).get("auto"));
                tx.inTenant(tid, () -> { m.updateRental(tid, id, "returned", late, dep == 0 ? null : back > 0 ? "returned" : "forfeited", cut(S(get(b, "condition")), 300)); tx.audit(tid, email, "fac.return", DdWeb.JSON.createObjectNode().put("id", id).put("lateFee", late).toString()); return null; });
                return map("status", "returned", "lateDays", lateDays, "lateFee", late, "depositReturn", back);
            }
            case "POST passes": {
                String sid = cut(S(get(b, "sid")), 60), pid = S(get(b, "productId")); if (sid.isEmpty()) throw err(400, "sid", "학번(이용자)을 입력해 주십시오.");
                JsonNode p = DdFac.product(products(c), pid); if (p == null || !S(get(p, "type")).startsWith("pass-")) throw err(400, "product", "이용권 상품을 골라 주십시오.");
                String kind = "pass-count".equals(S(get(p, "type"))) ? "count" : "pass-course".equals(S(get(p, "type"))) ? "course" : "period", pidN = rid("ps_"), td = today();
                long total = "count".equals(kind) ? intOf(p, "count", 1) : intOf(p, "count", intOf(p, "days", 30)); int days = "count".equals(kind) ? intOf(p, "expireDays", 365) : intOf(p, "days", 30);
                tx.inTenant(tid, () -> { m.insertPass(tid, pidN, sid, S(get(b, "aud")).isEmpty() ? "public" : S(get(b, "aud")), 0L, pid, S(get(p, "fac")), kind, total, td, LocalDate.parse(td).plusDays(days - 1).toString(), "active", S(get(p, "cls")).isEmpty() ? null : S(get(p, "cls")));
                    tx.audit(tid, email, "fac.pass.grant", DdWeb.JSON.createObjectNode().put("id", pidN).put("product", pid).toString()); return null; });
                return map("ok", true, "pass", tx.inTenant(tid, () -> m.selectPass(tid, pidN)));
            }
            case "POST passes/adjust": {
                int delta = intOf(b, "delta", 0); String reason = cut(S(get(b, "reason")), 200); if (delta == 0 || reason.isEmpty()) throw err(400, "reason", "조정 횟수와 사유를 입력해 주십시오.");
                if (tx.inTenant(tid, () -> m.adjustPass(tid, id, delta)) == 0) throw err(404, "pass", "이용권을 찾지 못했습니다.");
                tx.audit(tid, email, "fac.pass.adjust", DdWeb.JSON.createObjectNode().put("id", id).put("delta", delta).put("reason", reason).toString());
                return map("ok", true, "pass", tx.inTenant(tid, () -> m.selectPass(tid, id)));
            }
            case "GET noshow": {
                List<Map<String, Object>> out = new ArrayList<>(); for (Map<String, Object> r : tx.inTenant(tid, () -> m.selectBookings(tid, dayOrNull(qp(req, "from")), dayOrNull(qp(req, "to")), qp(req, "fac"), "no_show", null, null))) out.add(decorate(c, r, true));
                return map("bookings", out);
            }
            case "POST noshow/restore": {
                Map<String, Object> bk = needBk(tid, id); if (!"no_show".equals(bk.get("status"))) throw err(409, "state", "노쇼 처리된 예약이 아닙니다.");
                JsonNode f = needFac(c, (String) bk.get("facId")); int per = perSlot(f), s0 = ((Number) bk.get("slot")).intValue(), n = ((Number) bk.get("slots")).intValue();
                String excl = S(get(rules(f), "exclGroup")).isEmpty() ? (String) bk.get("facId") : S(get(rules(f), "exclGroup"));
                try { tx.inTenant(tid, () -> { m.lock(tid + "|" + bk.get("facId") + "|" + bk.get("day"));
                        for (int s = s0; s < s0 + n; s++) { boolean ok = false; for (int seat = 1; seat <= per && !ok; seat++) ok = m.insertSlot(tid, (String) bk.get("facId"), (String) bk.get("resId"), (String) bk.get("day"), s, seat, id, (String) bk.get("sid"), excl) == 1; if (!ok) throw new Taken(); }
                        m.updateBooking(tid, id, "confirmed", null, null, 0); tx.audit(tid, email, "fac.noshow.restore", DdWeb.JSON.createObjectNode().put("id", id).toString()); return null; }); }
                catch (Taken | DuplicateKeyException e) { return fail(res, 409, "taken", "그 시간이 이미 다른 예약으로 찼습니다.", map("alt", List.of())); }
                return map("ok", true, "status", "confirmed");
            }
            case "GET stats": {
                String from = dayOr(qp(req, "from"), LocalDate.parse(today()).withDayOfMonth(1).toString()), to = dayOr(qp(req, "to"), today());
                List<Map<String, Object>> rows = tx.inTenant(tid, () -> m.selectStats(tid, from, to)); long all = 0, ns = 0;
                for (Map<String, Object> r : rows) { all += lng(r.get("bookings")); ns += lng(r.get("noShow")); JsonNode f = facOf(c, (String) r.get("fac")); r.put("facName", f == null ? r.get("fac") : S(get(f, "name"))); }
                Map<String, Object> o = map("from", from, "to", to, "group", "fac", "rows", rows, "noShowRate", all == 0 ? 0 : Math.round(ns * 1000.0 / all) / 10.0);
                if ("owner".equals(role)) o.put("revenue", tx.inTenant(tid, () -> m.selectRevenue(tid, from, to))); return o;
            }
            case "GET export": {
                if (!"owner".equals(role)) throw processException("dd.403.role");
                String from = dayOr(qp(req, "from"), LocalDate.parse(today()).withDayOfMonth(1).toString()), to = dayOr(qp(req, "to"), today());
                StringBuilder sb = new StringBuilder("﻿예약번호,시설,자원,날짜,시작,종료,구분,학번끝,상태,금액,결제\n");
                for (Map<String, Object> r : tx.inTenant(tid, () -> m.selectBookings(tid, from, to, null, null, null, null))) { Map<String, Object> x = decorate(c, r, true);
                    sb.append(String.join(",", List.of(csv(x.get("id")), csv(x.get("facName")), csv(x.get("resName")), csv(x.get("day")), csv(x.get("from")), csv(x.get("to")), csv(x.get("aud")), csv(x.get("sidTail")), csv(x.get("status")), csv(x.get("amount")), csv(x.get("payStatus"))))).append('\n'); }
                tx.audit(tid, email, "fac.export", DdWeb.JSON.createObjectNode().put("from", from).put("to", to).toString());
                res.setContentType("text/csv; charset=utf-8"); res.setHeader("content-disposition", "attachment; filename=\"fac-" + from + "_" + to + ".csv\""); res.getOutputStream().write(sb.toString().getBytes(StandardCharsets.UTF_8)); return null;
            }
            default: throw err(404, "not_found", "없는 주소입니다.");
        }
    }
    @SuppressWarnings("unchecked") static Map<String, Object> facRefund(JsonNode in) { return DdWeb.JSON.convertValue(DdFac.refund(in), LinkedHashMap.class); }
    static String csv(Object v) { String s = v == null ? "" : String.valueOf(v); if (s.matches("^[=+\\-@].*")) s = "'" + s; return s.contains(",") || s.contains("\"") || s.contains("\n") ? "\"" + s.replace("\"", "\"\"") + "\"" : s; }
    static String qp(HttpServletRequest req, String k) { String v = req.getParameter(k); return v == null || v.isEmpty() ? null : cut(v, 80); }
    static String dayOrNull(String v) { return v != null && DAY.matcher(v).matches() ? v : null; }
    static String dayOr(String v, String d) { return v != null && DAY.matcher(v).matches() ? v : d; }
    Map<String, Object> needBk(String tid, String id) throws Exception { Map<String, Object> bk = tx.inTenant(tid, () -> m.selectBooking(tid, id)); if (bk == null) throw err(404, "booking", "예약을 찾지 못했습니다."); return bk; }
    Map<String, Object> needRt(String tid, String id) throws Exception { Map<String, Object> r = tx.inTenant(tid, () -> m.selectRental(tid, id)); if (r == null) throw err(404, "rental", "대여 건을 찾지 못했습니다."); return r; }
    static List<String> teacherFacs(Cfg c, String email) {
        List<String> l = new ArrayList<>(); for (JsonNode a : arr(get(c.doc, "admins"))) if (email != null && email.equalsIgnoreCase(S(get(a, "email")))) { for (JsonNode x : arr(get(a, "fac"))) l.add(x.asText()); break; }
        if (l.isEmpty()) l.add("\u0000"); return l;
    }

    Object closures(String tid, Cfg c, JsonNode b, String email) throws Exception {
        String fid = S(get(b, "fac")); needFac(c, fid); String from = day(b, "from"), to = S(get(b, "to")).isEmpty() ? from : day(b, "to"); if (to.compareTo(from) < 0) throw err(400, "date", "기간이 올바르지 않습니다.");
        List<Map<String, Object>> aff = tx.inTenant(tid, () -> m.selectAffected(tid, fid, from, to)); int cancelled = 0, refunds = 0;
        if (truthy(get(b, "cancelBookings"))) for (Map<String, Object> bk : aff) { cancelCore(tid, c, bk, cut(S(get(b, "reason")).isEmpty() ? "휴관" : "휴관: " + S(get(b, "reason")), 200), email); cancelled++; if ("paid".equals(bk.get("payStatus"))) refunds++; }
        int ext = 0; if ("extend".equals(S(get(b, "pass")))) { int days = (int) ChronoUnit.DAYS.between(LocalDate.parse(from), LocalDate.parse(to)) + 1; ext = tx.inTenant(tid, () -> m.extendPasses(tid, fid, from, to, days)); }
        tx.audit(tid, email, "fac.closure", DdWeb.JSON.createObjectNode().put("fac", fid).put("from", from).put("to", to).put("cancelled", cancelled).toString());
        return map("affected", aff.size(), "cancelled", cancelled, "refundsPending", refunds, "passesExtended", ext);
    }

    Object kioskCheckin(HttpServletRequest req, JsonNode b) throws Exception {
        String kt = S(get(b, "kiosk")); String[] a = kt.split("\\."); String tid;
        try { tid = DdWeb.JSON.readTree(Base64.getUrlDecoder().decode(a[1])).path("t").asText(); } catch (Exception e) { throw err(403, "kiosk", "키오스크 인증이 올바르지 않습니다."); }
        rl.limit("fack:" + web.ip(req), 120, 60_000L);
        JsonNode k = qr.openKiosk(tid, kt); if (k == null) throw err(403, "kiosk", "키오스크 인증이 끝났습니다. 운영자가 다시 시작해 주십시오.");
        Cfg c = tx.inTenant(tid, () -> cfg(tid)); String fac = k.path("f").asText();
        if (S(get(b, "token")).isEmpty()) throw err(400, "token", "QR을 스캔해 주세요.");
        var nb = DdWeb.JSON.createObjectNode(); nb.put("token", S(get(b, "token"))); if (!fac.isEmpty()) nb.put("fac", fac);
        return checkin(tid, c, nb, "kiosk", "kiosk", null);
    }
    /** 체크인: QR 토큰 | 예약 번호 | 학번 끝 4자리(+날짜) */
    Object checkin(String tid, Cfg c, JsonNode b, String by, String via0, List<String> mine) throws Exception {
        String token = S(get(b, "token")), wantFac = S(get(b, "fac")), td = today(); Instant now = Instant.now(); String via = via0, jti = null, bkId = null, psId = null, rtId = null;
        if (!token.isEmpty()) {
            JsonNode p = qr.verify(tid, token); if (p == null) throw err(403, "qr", "확인할 수 없는 QR입니다.");
            if (p.path("exp").asLong() < now.getEpochSecond()) throw err(410, "expired", "유효 시간이 지난 QR입니다. 새로 열어 주세요.");
            if (!wantFac.isEmpty() && !wantFac.equals(p.path("f").asText())) throw err(409, "wrong_fac", "다른 시설의 QR입니다.");
            jti = p.path("jti").asText(); bkId = p.has("b") ? p.get("b").asText() : null; psId = p.has("p") ? p.get("p").asText() : null; rtId = p.has("r") ? p.get("r").asText() : null; if ("front".equals(via)) via = "qr";
        } else if (!S(get(b, "booking")).isEmpty()) bkId = idOf(b, "booking");
        else if (!S(get(b, "sidTail")).isEmpty()) {
            String t4 = S(get(b, "sidTail")), d = S(get(b, "day")).isEmpty() ? td : day(b, "day");
            List<Map<String, Object>> rows = tx.inTenant(tid, () -> m.selectBookings(tid, d, d, wantFac.isEmpty() ? null : wantFac, "confirmed", t4, mine));
            if (rows.isEmpty()) throw err(404, "booking", "오늘 해당하는 예약이 없습니다.");
            if (rows.size() > 1) return map("ok", false, "choose", rows.stream().map(r -> decorate(c, r, true)).toList());
            bkId = (String) rows.get(0).get("id");
        } else throw err(400, "token", "QR 또는 예약 번호를 입력해 주십시오.");
        String fJti = jti, fVia = via;
        try {
            if (bkId != null) {
                String id = bkId; Map<String, Object> bk = needBk(tid, id); JsonNode f = needFac(c, (String) bk.get("facId"));
                if (mine != null && !mine.contains(bk.get("facId"))) throw processException("dd.403.teacher");
                if (!wantFac.isEmpty() && !wantFac.equals(bk.get("facId"))) throw err(409, "wrong_fac", "다른 시설의 예약입니다.");
                if ("checked_in".equals(bk.get("status")) || "done".equals(bk.get("status"))) throw err(409, "used", "이미 입장 처리된 예약입니다.");
                if (!"confirmed".equals(bk.get("status")) || !td.equals(bk.get("day"))) throw err(409, "not_ready", "오늘 입장할 수 있는 예약이 아닙니다.");
                int s0 = ((Number) bk.get("slot")).intValue(), n = ((Number) bk.get("slots")).intValue();
                if (now.isBefore(DdFac.slotStart(f, td, s0).minusSeconds(30 * 60))) throw err(409, "early", "입장은 시작 30분 전부터 가능합니다.");
                if (now.isAfter(DdFac.slotStart(f, td, s0 + n).plusSeconds(15 * 60))) throw err(409, "late", "이용 시간이 지났습니다.");
                tx.inTenant(tid, () -> { m.insertCheckin(tid, id, null, null, (String) bk.get("sid"), (String) bk.get("facId"), td, fVia, by, fJti); m.updateBooking(tid, id, "checked_in", null, null, 0); return null; });
                return map("ok", true, "who", map("sidTail", tail(bk.get("sid")), "aud", bk.get("aud")), "booking", map("id", id, "facName", S(get(f, "name")), "resName", resName(f, (String) bk.get("resId")), "from", hmOf(f, td, s0), "to", hmOf(f, td, s0 + n)), "product", null, "left", null);
            }
            if (psId != null) {
                String id = psId; Map<String, Object> p = tx.inTenant(tid, () -> m.selectPass(tid, id)); if (p == null) throw err(404, "pass", "이용권을 찾지 못했습니다.");
                if (mine != null && !mine.contains(p.get("facId"))) throw processException("dd.403.teacher");
                if (!"active".equals(p.get("status")) || td.compareTo((String) p.get("startsOn")) < 0 || td.compareTo((String) p.get("endsOn")) > 0) throw err(409, "not_ready", "쓸 수 있는 이용권이 아닙니다.");
                Map<String, Object> after = tx.inTenant(tid, () -> { if (m.usePass(tid, id) == 0) throw err(409, "no_left", "남은 횟수가 없습니다."); m.insertCheckin(tid, null, id, null, (String) p.get("sid"), (String) p.get("facId"), td, fVia, by, fJti); return m.selectPass(tid, id); });
                JsonNode pr = DdFac.product(products(c), (String) p.get("productId"));
                return map("ok", true, "who", map("sidTail", tail(p.get("sid")), "aud", null), "product", pr == null ? p.get("productId") : S(get(pr, "name")), "left", "count".equals(p.get("kind")) ? lng(after.get("total")) - lng(after.get("used")) : null, "endsOn", p.get("endsOn"));
            }
            String id = rtId; Map<String, Object> r = needRt(tid, id); if (!"approved".equals(r.get("status"))) throw err(409, "used", "이미 처리된 대여입니다.");
            tx.inTenant(tid, () -> { m.insertCheckin(tid, null, null, id, (String) r.get("sid"), (String) r.get("facId"), td, fVia, by, fJti); m.updateRental(tid, id, "lent", null, null, null); return null; });
            return map("ok", true, "who", map("sidTail", tail(r.get("sid")), "aud", null), "rental", map("id", id, "status", "lent", "dueDay", r.get("dueDay")), "product", null, "left", null);
        } catch (DuplicateKeyException e) {
            String msg = String.valueOf(e.getMessage()); if (msg.contains("fac_ck_pass_day")) throw err(409, "once_per_day", "오늘 이미 입장했습니다(1일 1회).");
            throw err(409, "used", "이미 사용된 QR입니다.");
        }
    }

    /** 서버 기준 결제 금액 */
    long serverAmount(String tid, Cfg c, String kind, String ref) throws Exception {
        if ("booking".equals(kind)) return lng(needBk(tid, ref).get("amount"));
        if ("rental".equals(kind)) { Map<String, Object> r = needRt(tid, ref); return lng(r.get("amount")) + lng(r.get("deposit")); }
        Map<String, Object> p = tx.inTenant(tid, () -> m.selectPass(tid, ref)); if (p == null) throw err(404, "pass", "이용권을 찾지 못했습니다.");
        Map<String, Object> pp = tx.inTenant(tid, () -> m.selectPaymentFor(tid, ref)); if (pp != null) return lng(pp.get("amount"));
        JsonNode pr = DdFac.product(products(c), (String) p.get("productId")); if (pr == null) return 0;
        long best = Long.MAX_VALUE; for (String a : AUD) try { best = Math.min(best, lng(DdFac.quote(needFac(c, (String) p.get("facId")), products(c), a, today(), 0, 1, (String) p.get("productId")).get("final"))); } catch (Exception ignore) { }
        return best == Long.MAX_VALUE ? 0 : best;
    }
    Object payments(String tid, Cfg c, JsonNode b, String email) throws Exception {
        String kind = !S(get(b, "booking")).isEmpty() ? "booking" : !S(get(b, "pass")).isEmpty() ? "pass" : !S(get(b, "rental")).isEmpty() ? "rental" : null; if (kind == null) throw err(400, "target", "결제 대상을 골라 주십시오.");
        String ref = idOf(b, kind), method = S(get(b, "method")); if (!List.of("card_onsite", "cash", "bank").contains(method)) throw err(400, "method", "결제 수단을 골라 주십시오.");
        long server = serverAmount(tid, c, kind, ref); double a = num(get(b, "amount")); long amt = Double.isNaN(a) ? server : (long) Math.floor(a + 0.5);
        if (amt != server && S(get(b, "diffReason")).isEmpty()) throw err(400, "amount", "가격표 금액(" + String.format("%,d", server) + "원)과 다릅니다. 차이 사유를 입력해 주십시오.");
        String pid = rid("fp_");
        tx.inTenant(tid, () -> { m.insertPayment(tid, pid, "booking".equals(kind) ? ref : null, "pass".equals(kind) ? ref : null, "rental".equals(kind) ? ref : null, method, amt, server, null, cut(S(get(b, "receiptNo")), 60), email,
                cut((S(get(b, "note")) + (S(get(b, "diffReason")).isEmpty() ? "" : " / 차이 사유: " + S(get(b, "diffReason")))).trim(), 300), "paid");
            if ("booking".equals(kind)) { Map<String, Object> bk = m.selectBooking(tid, ref); m.updateBooking(tid, ref, (String) bk.get("status"), "paid", null, -1); }
            if ("pass".equals(kind)) m.updatePass(tid, ref, "active", pid);
            tx.audit(tid, email, "fac.pay.onsite", DdWeb.JSON.createObjectNode().put("id", pid).put(kind, ref).put("amount", amt).toString()); return null; });
        return map("ok", true, "payment", map("id", pid, "amount", amt, "listAmount", server, "method", method));
    }
    Object refunds(String tid, Cfg c, JsonNode b, String email) throws Exception {
        String pid = idOf(b, "payment"); Map<String, Object> p = tx.inTenant(tid, () -> m.selectPayment(tid, pid)); if (p == null || !"paid".equals(p.get("status"))) throw err(404, "payment", "환불할 결제를 찾지 못했습니다.");
        long paid = lng(p.get("amount")); Map<String, Object> calc; String target, rule;
        if (p.get("bookingId") != null) { Map<String, Object> bk = needBk(tid, (String) p.get("bookingId")); JsonNode f = needFac(c, (String) bk.get("facId")); calc = refundCalc(f, bk, paid); target = "booking:" + bk.get("id"); rule = S(get(f, "refund", "type")).isEmpty() ? "time" : S(get(f, "refund", "type")); }
        else if (p.get("passId") != null) {
            Map<String, Object> ps = tx.inTenant(tid, () -> m.selectPass(tid, (String) p.get("passId"))); JsonNode pr = DdFac.product(products(c), (String) ps.get("productId")); JsonNode rr = get(pr, "refund");
            var in = DdWeb.JSON.createObjectNode(); rule = "count".equals(ps.get("kind")) ? "pass-count" : "pass-period"; var r2 = isObj(rr) ? ((com.fasterxml.jackson.databind.node.ObjectNode) rr.deepCopy()) : DdWeb.JSON.createObjectNode(); r2.put("type", rule); in.set("rule", r2);
            JsonNode up = get(rr, "unitPrice"); double unit = up != null && up.isNumber() ? up.asDouble() : num(get(up, S(get(b, "aud")).isEmpty() ? "public" : S(get(b, "aud"))));
            in.put("paid", paid); r2.put("unitPrice", Double.isNaN(unit) ? 0 : unit); in.put("used", lng(ps.get("used"))); calc = facRefund(in); target = "pass:" + ps.get("id");
        } else {
            Map<String, Object> r = needRt(tid, (String) p.get("rentalId")); var in = DdWeb.JSON.createObjectNode(); in.set("rule", DdWeb.JSON.createObjectNode().put("type", "rent"));
            in.put("deposit", lng(r.get("deposit"))); in.put("lateFee", lng(r.get("lateFee"))); in.put("deductions", Math.max(0, (long) num(get(b, "deductions")))); calc = facRefund(in); target = "rental:" + r.get("id"); rule = "rent";
        }
        long auto = Math.min(paid, lng(calc.get("auto"))); double a = num(get(b, "amount")); long amt = Double.isNaN(a) ? auto : (long) Math.floor(a + 0.5); String reason = cut(S(get(b, "editReason")), 300);
        if (amt < 0 || amt > paid) throw err(400, "amount", "환불 금액은 0원 이상 결제 금액 이하입니다.");
        if (amt != auto && reason.isEmpty()) throw err(400, "reason", "자동 계산 금액(" + String.format("%,d", auto) + "원)과 다릅니다. 수정 사유를 입력해 주십시오.");
        if ("toss".equals(p.get("method")) && amt > 0) { if (!tossOn()) throw err(409, "pg_off", "토스 결제 키가 없어 온라인 환불을 할 수 없습니다."); tossCancel((String) p.get("tossKey"), amt, reason.isEmpty() ? "시설 예약 환불" : reason); }
        String rid = rid("fr_"), tgt = target, rl0 = rule; var cj = DdWeb.JSON.valueToTree(calc).toString();
        tx.inTenant(tid, () -> { m.insertRefund(tid, rid, pid, tgt, rl0, cj, auto, amt, amt == auto ? null : reason, email, null, "done"); if (amt == paid) m.updatePayment(tid, pid, "cancelled", null);
            if (p.get("bookingId") != null) { Map<String, Object> bk = m.selectBooking(tid, (String) p.get("bookingId")); m.updateBooking(tid, (String) bk.get("id"), (String) bk.get("status"), amt == paid ? "refunded" : "partial", null, 0); }
            if (p.get("passId") != null) m.updatePass(tid, (String) p.get("passId"), "refunded", null);
            tx.audit(tid, email, "fac.refund", DdWeb.JSON.createObjectNode().put("id", rid).put("payment", pid).put("auto", auto).put("amount", amt).toString()); return null; });
        return map("ok", true, "refund", map("id", rid, "auto", auto, "amount", amt, "calc", calc));
    }
    void tossCancel(String key, long amt, String reason) {
        try { HttpResponse<String> r = http.send(HttpRequest.newBuilder(URI.create("https://api.tosspayments.com/v1/payments/" + java.net.URLEncoder.encode(key == null ? "" : key, StandardCharsets.UTF_8) + "/cancel")).timeout(java.time.Duration.ofSeconds(20))
                .header("authorization", "Basic " + Base64.getEncoder().encodeToString((toss + ":").getBytes(StandardCharsets.UTF_8))).header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(DdWeb.JSON.createObjectNode().put("cancelReason", reason).put("cancelAmount", amt).toString())).build(), HttpResponse.BodyHandlers.ofString());
            if (r.statusCode() >= 300) throw err(502, "pg", "결제사 환불 요청이 실패했습니다."); }
        catch (DdException e) { throw e; } catch (Exception e) { throw err(502, "pg", "결제사 연결에 실패했습니다."); }
    }
}
