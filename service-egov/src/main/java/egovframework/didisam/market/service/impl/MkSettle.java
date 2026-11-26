package egovframework.didisam.market.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import static egovframework.didisam.cmm.Js.*;

/** 마켓 월 소진 정산 · 분기 지급 마감(2인 확인) · 지급 지시 파일 — Node service/server/market/settle.js와 같은 SQL · 응답.
 *  돈은 움직이지 않는다: 지급은 「지급 지시 파일」(CSV)까지. */
final class MkSettle {
    static final int MASK = 5;
    private final MarketServiceImpl S; private final MkDb db;
    private final Map<String, String> nameCache = new ConcurrentHashMap<>();
    MkSettle(MarketServiceImpl s, MkDb db) { this.S = s; this.db = db; }

    String nameOf(String tid) { return nameCache.computeIfAbsent(tid, k -> { try { String n = S.orgOf(k).path("name").asText(""); if (nameCache.size() > 2000) nameCache.clear(); return n; } catch (Exception e) { return ""; } }); }
    ArrayNode rateRows(String cpTid) {
        ArrayNode a = F.arrayNode(); for (ObjectNode r : db.q("select rate_kind, cp_bp, to_char(effective_from, 'YYYY-MM-DD') ef from mk_cp_rate where cp_tid = $1 order by effective_from, id", cpTid)) {
            ObjectNode o = a.addObject(); o.set("effectiveFrom", r.get("ef")); o.set("cpBp", r.get("cp_bp")); o.set("rateKind", r.get("rate_kind")); }
        return a;
    }
    static Object[] rateOn(ArrayNode rows, String day) { long bp = DdMarketCalc.rateAt(rows, day); String k = DdMarketCalc.rateKindOf(bp); return new Object[]{ bp, k == null ? "standard" : k }; }

    List<ObjectNode> monthRows(String ym) {
        return db.q("select u.cp_tid cp, p.owner_kind ok, u.buyer_tid buyer, u.product_id product, p.title,\n"
            + "        sum(u.credits)::int used, coalesce(sum(r.cr), 0)::int restored, count(*) filter (where not u.restored)::int n\n"
            + "      from mk_credit_use u join mk_product p on p.id = u.product_id\n"
            + "      left join lateral (select -credits cr from mk_credit_use x where x.kind = 'restore' and x.restore_of = u.id) r on true\n"
            + "      where u.kind = 'use' and to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') = $1\n"
            + "      group by u.cp_tid, p.owner_kind, u.buyer_tid, u.product_id, p.title order by u.cp_tid, u.buyer_tid, u.product_id", ym);
    }
    static long L(JsonNode v) { return v == null || v.isNull() ? 0 : v.asLong(); }

    static ObjectNode stmtOut(JsonNode s) {
        ObjectNode o = F.objectNode(); String[] kv = { "id", "id", "cpTid", "cp_tid", "ym", "ym", "quarter", "quarter", "used", "used", "restored", "restored", "net", "net", "cpBp", "cp_bp", "rateKind", "rate_kind", "cpAmount", "cp_amount", "adj", "adj", "total", "total",
            "promoFee", "promo_fee", "promoCarryIn", "promo_carry_in", "promoCarryOut", "promo_carry_out", "pay", "pay", "status", "status", "lines", "lines", "closeId", "close_id" };
        for (int i = 0; i < kv.length; i += 2) { JsonNode v = s.get(kv[i + 1]); if (v != null) o.set(kv[i], v); } return o;
    }

    /** POST /api/market/settle/month { ym } */
    ObjectNode month(String ym, String by) throws Exception {
        String cur = MarketServiceImpl.kstDay().substring(0, 7); if (ym == null || !MarketServiceImpl.YM_RE.matcher(ym).matches() || ym.compareTo(cur) > 0) throw S.E(400, "ym", "정산 월을 확인하십시오(이번 달까지).");
        List<ObjectNode> rows = db.tx(() -> monthRows(ym));
        Map<String, String> names = new LinkedHashMap<>(); for (ObjectNode r : rows) names.computeIfAbsent(r.get("buyer").asText(), this::nameOf);
        return db.tx(() -> {
            TreeMap<String, Object[]> cps = new TreeMap<>(); long[] orig = new long[3];
            for (ObjectNode r : rows) {
                long used = L(r.get("used")), rest = L(r.get("restored"));
                if ("santa".equals(r.path("ok").asText())) { orig[0] += used; orig[1] += rest; orig[2] += used - rest; continue; }
                Object[] x = cps.computeIfAbsent(r.get("cp").asText(), k -> new Object[]{ new long[2], F.arrayNode() }); ((long[]) x[0])[0] += used; ((long[]) x[0])[1] += rest;
                String bn = names.get(r.get("buyer").asText()); ObjectNode ln = ((ArrayNode) x[1]).addObject().put("buyer", bn == null || bn.isEmpty() ? "기관" : bn); ln.set("product", r.get("product")); ln.set("title", r.get("title"));
                long n = L(r.get("n")); if (n < MASK) ln.put("enrollments", MASK + "명 미만"); else ln.put("enrollments", n); ln.put("net", used - rest);
            }
            ArrayNode out = F.arrayNode();
            for (Map.Entry<String, Object[]> e : cps.entrySet()) {
                String cp = e.getKey(); long[] u = (long[]) e.getValue()[0]; ArrayNode lines = (ArrayNode) e.getValue()[1];
                Object[] rt = rateOn(rateRows(cp), ym + "-01"); long net = u[0] - u[1]; long cpBp = (Long) rt[0]; ObjectNode Ln = DdMarketCalc.settleLine(net, cpBp); long lcp = Ln.path("cp").asLong();
                ObjectNode ex = db.q1("select * from mk_stmt where cp_tid = $1 and ym = $2 for update", cp, ym);
                if (ex != null && !"draft".equals(ex.path("status").asText())) { out.add(stmtOut(ex)); continue; }
                Object[] v = { cp, ym, MarketServiceImpl.quarterOf(ym), u[0], u[1], net, cpBp, lcp, lcp, lines.toString(), rt[1] };
                ObjectNode row = ex != null ? db.q1("update mk_stmt set used = $4, restored = $5, net = $6, cp_bp = $7, cp_amount = $8, total = $9 + adj, lines = $10, rate_kind = $11, at = now() where cp_tid = $1 and ym = $2 and quarter = $3 returning *", v)
                    : db.q1("insert into mk_stmt (id, cp_tid, ym, quarter, used, restored, net, cp_bp, cp_amount, total, lines, rate_kind) values ($12,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *", cp, ym, MarketServiceImpl.quarterOf(ym), u[0], u[1], net, cpBp, lcp, lcp, lines.toString(), rt[1], MarketServiceImpl.rid("ms_"));
                out.add(stmtOut(row));
            }
            db.x("update mk_credit_use set settle_ym = $1 where kind = 'use' and settle_ym is null and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') = $1", ym);
            ArrayNode mixIn = F.arrayNode(); for (JsonNode s : out) mixIn.addObject().put("source", s.path("cpBp").asLong() == 6500 ? "credit_cp" : "credit_cp_rate").put("credits", s.path("net").asLong()).put("cpBp", s.path("cpBp").asLong());
            mixIn.addObject().put("source", "credit_orig").put("credits", orig[2]).put("cpBp", 0);
            ObjectNode mix = DdMarketCalc.santaMix(mixIn);
            ObjectNode r = F.objectNode().put("ok", true).put("ym", ym).put("partial", ym.equals(cur)); r.set("stmts", out);
            r.putObject("orig").put("used", orig[0]).put("restored", orig[1]).put("net", orig[2]).put("santa", orig[2] * DdMarketCalc.WON);
            ObjectNode T = r.putObject("totals"); T.put("net", mix.get("gross").asLong() / DdMarketCalc.WON).set("gross", mix.get("gross")); T.set("cp", mix.get("cp")); T.set("santa", mix.get("santa")); T.set("santaBp", mix.get("santaBp")); T.set("bySource", mix.get("bySource"));
            r.put("by", by); return r;
        });
    }

    /** 분기 계산(실행 · 확정 공용) — {st, checks, totals} */
    Object[] quarterCalc(String quarter) {
        List<String> M = MarketServiceImpl.monthsOf(quarter);
        List<ObjectNode> st = db.q("select * from mk_stmt where ym = any($1) order by cp_tid, ym", M);
        Map<String, Long> P = new LinkedHashMap<>(); for (ObjectNode p : db.q("select cp_tid, sum(fee)::int fee from mk_promo where ym = any($1) and status = 'ok' group by cp_tid", M)) P.put(p.get("cp_tid").asText(), L(p.get("fee")));
        ObjectNode prev = db.q1("select totals from mk_close where status = 'confirmed' and quarter < $1 order by quarter desc limit 1", quarter);
        Map<String, Long> carry = new LinkedHashMap<>(); if (prev != null) for (JsonNode x : arr(get(prev.get("totals"), "cps"))) carry.put(x.path("cp").asText(), x.path("carryOut").asLong(0));
        TreeMap<String, Object[]> by = new TreeMap<>();
        for (ObjectNode s : st) { Object[] x = by.computeIfAbsent(s.get("cp_tid").asText(), k -> new Object[]{ new long[2], new ArrayList<String>() }); ((long[]) x[0])[0] += L(s.get("net")); ((long[]) x[0])[1] += L(s.get("total")); @SuppressWarnings("unchecked") List<String> ms = (List<String>) x[1]; ms.add(s.get("ym").asText()); }
        LinkedHashSet<String> extra = new LinkedHashSet<>(P.keySet()); extra.addAll(carry.keySet());
        for (String cp : extra) if (!by.containsKey(cp) && (P.getOrDefault(cp, 0L) + carry.getOrDefault(cp, 0L)) > 0) by.put(cp, new Object[]{ new long[2], new ArrayList<String>() });
        ArrayNode cps = F.arrayNode(); long promoFee = 0, pay = 0;
        for (Map.Entry<String, Object[]> e : by.entrySet()) { String cp = e.getKey(); long[] x = (long[]) e.getValue()[0]; long fee = P.getOrDefault(cp, 0L), cin = carry.getOrDefault(cp, 0L); ObjectNode d = DdMarketCalc.promoDeduct(x[1], fee, cin);
            ObjectNode c = cps.addObject().put("cp", cp).put("name", nameOf(cp)).put("net", x[0]).put("cpAmount", x[1]).put("promoFee", fee).put("carryIn", cin); c.set("deduct", d.get("deduct")); c.set("pay", d.get("pay")); c.set("carryOut", d.get("carryOut"));
            ArrayNode ms = c.putArray("months"); @SuppressWarnings("unchecked") List<String> ml = (List<String>) e.getValue()[1]; ml.forEach(ms::add); promoFee += d.get("deduct").asLong(); pay += d.get("pay").asLong(); }
        ObjectNode orig = db.q1("select coalesce(sum(u.credits) filter (where u.kind = 'use'), 0)::int used, coalesce(-sum(u.credits) filter (where u.kind = 'restore'), 0)::int restored\n"
            + "      from mk_credit_use u join mk_product p on p.id = u.product_id where p.owner_kind = 'santa' and (u.kind = 'use' and to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') = any($1)\n"
            + "        or u.kind = 'restore' and u.restore_of in (select id from mk_credit_use where kind = 'use' and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') = any($1)))", M);
        long net = 0, cp = 0, used = 0, rest = 0; int disp = 0, closed = 0; for (ObjectNode s : st) { net += L(s.get("net")); cp += L(s.get("total")); used += L(s.get("used")); rest += L(s.get("restored")); if ("disputed".equals(s.path("status").asText())) disp++; if (!s.path("close_id").isNull() && truthy(s.get("close_id"))) closed++; }
        long origNet = L(orig.get("used")) - L(orig.get("restored"));
        ArrayNode checks = F.arrayNode(); checks.addObject().put("k", "disputed").put("ok", disp == 0).put("n", disp); checks.addObject().put("k", "closed").put("ok", closed == 0).put("n", closed);
        ObjectNode T = F.objectNode().put("quarter", quarter).put("used", used).put("restored", rest).put("net", net).put("cp", cp).put("santa", net * DdMarketCalc.WON - cp).put("orig", origNet).put("santaOrig", origNet * DdMarketCalc.WON).put("promoFee", promoFee).put("pay", pay); T.set("cps", cps);
        return new Object[]{ st, checks, T };
    }
    static ObjectNode closeOut(JsonNode z) {
        ObjectNode o = F.objectNode(); String[] kv = { "id", "id", "quarter", "quarter", "runBy", "run_by", "confirmBy", "confirm_by", "checks", "checks", "totals", "totals", "status", "status", "at", "at", "confirmedAt", "confirmed_at" };
        for (int i = 0; i < kv.length; i += 2) o.set(kv[i], z.has(kv[i + 1]) ? z.get(kv[i + 1]) : F.nullNode()); return o;
    }

    ObjectNode close(String quarter, String by) throws Exception {
        if (quarter == null || !MarketServiceImpl.Q_RE.matcher(quarter).matches()) throw S.E(400, "quarter", "분기를 YYYY-Q1 형식으로 입력하십시오.");
        return db.tx(() -> {
            ObjectNode ex = db.q1("select * from mk_close where quarter = $1 and status <> 'cancelled' for update", quarter);
            if (ex != null && "confirmed".equals(ex.path("status").asText())) throw S.E(409, "mk_close_done", "이미 확정한 분기입니다.");
            Object[] Q = quarterCalc(quarter);
            ObjectNode row = ex != null ? db.q1("update mk_close set run_by = $2, checks = $3, totals = $4, at = now() where id = $1 returning *", ex.get("id").asText(), by, Q[1].toString(), Q[2].toString())
                : db.q1("insert into mk_close (id, quarter, run_by, checks, totals) values ($1,$2,$3,$4,$5) returning *", MarketServiceImpl.rid("mz_"), quarter, by, Q[1].toString(), Q[2].toString());
            ObjectNode r = F.objectNode().put("ok", true); r.set("close", closeOut(row)); r.set("checks", (JsonNode) Q[1]); r.set("totals", (JsonNode) Q[2]); return r;
        });
    }
    ObjectNode confirm(String id, String by) throws Exception {
        return db.tx(() -> {
            ObjectNode z = db.q1("select * from mk_close where id = $1 for update", id); if (z == null) throw S.E(404, "close", "없는 마감입니다.");
            if (!"run".equals(z.path("status").asText())) throw S.E(409, "mk_close_done", "이미 확정한 분기입니다.");
            if (by.equals(z.path("run_by").asText())) throw S.E(409, "mk_close_same_user", null);
            Object[] Q = quarterCalc(z.get("quarter").asText()); ArrayNode checks = (ArrayNode) Q[1];
            for (JsonNode c : checks) if (!c.get("ok").asBoolean()) throw S.E(409, "mk_close_check", "이의 신청 중이거나 이미 마감된 정산서가 있어 확정할 수 없습니다.", MarketServiceImpl.map("checks", checks));
            List<String> M = MarketServiceImpl.monthsOf(z.get("quarter").asText()); ObjectNode T = (ObjectNode) Q[2]; @SuppressWarnings("unchecked") List<ObjectNode> st = (List<ObjectNode>) Q[0];
            for (JsonNode x : T.get("cps")) {
                String cp = x.get("cp").asText();
                db.x("update mk_stmt set status = 'final', close_id = $3, pay = null where cp_tid = $1 and ym = any($2)", cp, M, id);
                ObjectNode last = null; for (ObjectNode s : st) if (cp.equals(s.get("cp_tid").asText())) last = s;
                if (last != null) db.x("update mk_stmt set promo_fee = $2, promo_carry_in = $3, promo_carry_out = $4, pay = $5 where id = $1", last.get("id").asText(), x.get("promoFee"), x.get("carryIn"), x.get("carryOut"), x.get("pay"));
                if (x.get("cpAmount").asLong() != 0) db.x("insert into mk_entry (kind, party_tid, amount, credits, ref) values ('cp_use', $1, $2, $3, $4)", cp, -x.get("cpAmount").asLong(), x.get("net"), id);
                if (x.get("deduct").asLong() != 0) db.x("insert into mk_entry (kind, party_tid, amount, ref) values ('promo_fee', $1, $2, $3)", cp, x.get("deduct"), id);
                if (x.get("carryOut").asLong() != 0) db.x("insert into mk_entry (kind, party_tid, amount, ref) values ('promo_carry', $1, 0, $2)", cp, id + ":" + x.get("carryOut").asLong());
                db.x("insert into mk_entry (kind, party_tid, amount, ref) values ('payout', $1, $2, $3)", cp, -x.get("pay").asLong(), id);
            }
            db.x("update mk_promo set status = 'done', close_id = $2 where ym = any($1) and status = 'ok'", M, id);
            if (T.get("santa").asLong() != 0) db.x("insert into mk_entry (kind, amount, credits, ref) values ('santa_use', $1, $2, $3)", T.get("santa"), T.get("net"), id);
            if (T.get("santaOrig").asLong() != 0) db.x("insert into mk_entry (kind, amount, credits, ref) values ('santa_orig', $1, $2, $3)", T.get("santaOrig"), T.get("orig"), id);
            ObjectNode row = db.q1("update mk_close set status = 'confirmed', confirm_by = $2, confirmed_at = now(), totals = $3, checks = $4 where id = $1 returning *", id, by, T.toString(), checks.toString());
            ObjectNode r = F.objectNode().put("ok", true); r.set("close", closeOut(row)); r.set("totals", T); return r;
        });
    }
    static String esc(JsonNode v) { String s = v == null || v.isNull() ? "" : v.isTextual() ? v.textValue() : v.toString(); return s.matches("(?s).*[\",\n].*") ? "\"" + s.replace("\"", "\"\"") + "\"" : s; }
    static String esc(String s) { return esc(t(s)); }
    String exportCsv(String id) throws Exception {
        ObjectNode z = db.tx(() -> db.q1("select * from mk_close where id = $1", id)); if (z == null) throw S.E(404, "close", "없는 마감입니다.");
        if (!"confirmed".equals(z.path("status").asText())) throw S.E(409, "mk_close_open", "확정한 분기만 지급 지시 파일을 받을 수 있습니다.");
        Map<String, Boolean> acct = new LinkedHashMap<>(); for (ObjectNode r : db.tx(() -> db.q("select tid, payout_bank_enc is not null b from mk_party"))) acct.put(r.get("tid").asText(), r.get("b").asBoolean());
        StringBuilder b = new StringBuilder("﻿"); b.append(String.join(",", "분기", "CP 기관", "CP 이름", "순소진 크레딧", "CP 몫(원)", "프로모션 공제(원)", "다음 분기 이월 공제(원)", "지급 지시액(원)", "계좌 등록", "상태")).append("\r\n");
        for (JsonNode x : arr(get(z.get("totals"), "cps"))) { String cp = x.path("cp").asText();
            b.append(String.join(",", esc(z.get("quarter")), esc(x.get("cp")), esc(x.get("name")), esc(x.get("net")), esc(x.get("cpAmount")), esc(x.get("deduct")), esc(x.get("carryOut")), esc(x.get("pay")), esc(Boolean.TRUE.equals(acct.get(cp)) ? "등록됨" : "미등록"), esc("지급 지시(송금 전)"))).append("\r\n"); }
        return b.toString();
    }
}
