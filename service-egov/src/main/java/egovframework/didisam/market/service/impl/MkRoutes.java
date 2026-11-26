package egovframework.didisam.market.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdWeb;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import static egovframework.didisam.cmm.Js.*;
import static egovframework.didisam.market.service.impl.MarketServiceImpl.*;

/** /api/market/* 경로 표 — Node service/server/market/routes.js의 R(고정 경로) · P(매개변수 경로)와 같은 순서 · 권한 · 응답. */
final class MkRoutes {
    private MkRoutes() { }
    static JsonNode body(byte[] raw) { return DdWeb.readBody(raw, 32 * 1024); }

    static void register(MarketServiceImpl S) {
        MkDb db = S.db();
        /* ── 8-1 카탈로그 ── */
        S.r("GET /api/market/home", (req, res, raw, p) -> { Map<String, Object> a = S.need(req); boolean staff = staff(a);
            return S.T(() -> { S.needPilot(tid(a)); String day = today(); List<ObjectNode> C = S.collections(day, null); List<JsonNode> rows = new ArrayList<>(); for (ObjectNode r : S.listed(day)) if ("credit".equals(modeOf(r, day))) rows.add(r);
                ObjectNode k = S.liveContract(tid(a), day); ObjectNode my = null;
                if (k != null && staff) { MarketServiceImpl.WS W = S.walletState(k); my = O().put("contractId", s(k, "id")).put("balance", W.balance).put("total", W.total); my.set("validTo", g(k, "e")); my.set("carryTo", g(k, "ce")); my.put("alert", W.alert); }
                List<String> ads = S.adsOf("home_top", tid(a));
                ArrayNode rec = withAds(rows, ads, r -> { ObjectNode o = O().put("productId", s(r, "id")); o.set("title", g(r, "title")); o.set("cp", santaOwn(r) ? t("산타 오리지널") : g(r, "cp_name")); o.set("hours", hours(r)); if (staff) o.set("credits", g(r, "credits")); o.put("optin", "credit"); if (santaOwn(r)) o.put("orig", true); return o; });
                ArrayNode cols = F.arrayNode(); for (ObjectNode x : C) { ObjectNode y = x.deepCopy(); y.remove("rows"); cols.add(y); }
                ArrayNode rec12 = F.arrayNode(); for (int i = 0; i < Math.min(12, rec.size()); i++) rec12.add(rec.get(i));
                ObjectNode o = O(); o.set("collections", cols); o.set("recommended", rec12); if (my != null) o.set("myCredit", my); o.set("eligible", S.eligible(tid(a))); o.put("pilot", true); o.put("ads", S.adsOn(tid(a))); return o; }); });
        /* 광고(추천 진열) 노출 선택 — 구매 기관 정운영자만, 감사 기록 market.ads(Node와 같음) */
        S.r("PUT /api/market/settings", (req, res, raw, p) -> { Map<String, Object> a = S.needOwner(req); JsonNode b = body(raw); JsonNode v = get(b, "ads"); if (v == null || !v.isBoolean()) throw S.E(400, "ads", "광고 노출 여부(ads)를 true · false로 보내십시오.");
            S.T(() -> { S.needPilot(tid(a)); return null; }); final boolean on = v.asBoolean();
            db.txAs("", true, () -> db.x("update mk_party set ads = $2, ads_by = $3, ads_at = now() where tid = $1", tid(a), on, email(a)));
            S.log(tid(a), email(a), "market.ads", map("ads", on)); return O().put("ok", true).put("ads", on); });
        S.r("GET /api/market/products", (req, res, raw, p) -> { Map<String, Object> a = S.need(req); boolean staff = staff(a);
            return S.T(() -> { S.needPilot(tid(a)); String day = today(); List<ObjectNode> rows = S.listed(day);
                String col = qp(req, "collection"); if (col != null && !col.isEmpty()) { Set<String> ids = new HashSet<>(); for (ObjectNode r : db.q("select product_id from mk_collection_item where collection_id = $1", str(col, 30))) ids.add(s(r, "product_id")); rows.removeIf(r -> !ids.contains(s(r, "id"))); }
                String tq = trim(str(qp(req, "q"), 60)).toLowerCase(java.util.Locale.ROOT); if (!tq.isEmpty()) rows.removeIf(r -> !s(r, "title").toLowerCase(java.util.Locale.ROOT).contains(tq));
                for (String k : new String[]{ "sector", "kind", "level" }) { String v = qp(req, k); if (v != null && !v.isEmpty()) rows.removeIf(r -> !v.equals(s(r, k))); }
                String oi = qp(req, "optin"); if (oi != null && !oi.isEmpty()) rows.removeIf(r -> !("credit".equals(modeOf(r, day)) ? "credit" : "single").equals(oi));
                String lic = qp(req, "lic"); if (lic != null && !lic.isEmpty()) rows.removeIf(r -> { for (JsonNode x : arr(g(r, "lic_allowed"))) if (lic.equals(x.asText())) return false; return true; });
                if ("1".equals(qp(req, "orig"))) rows.removeIf(r -> !santaOwn(r));
                double mn = I(qp(req, "minCredits")), mx = I(qp(req, "maxCredits")); if (mn > 0) rows.removeIf(r -> !(n(r, "credits") >= mn && !g(r, "credits").isNull())); if (mx > 0) rows.removeIf(r -> !(num(g(r, "credits")) <= mx));
                if ("credits".equals(qp(req, "sort"))) rows.sort((x, y) -> Long.compare(n(x, "credits"), n(y, "credits")));
                List<ObjectNode> out = new ArrayList<>(); for (ObjectNode r : rows) out.add(prodOut(r, day, staff)); return pageOf(req, out); }); });
        S.r("GET /api/market/credit/rules", (req, res, raw, p) -> { S.need(req); ObjectNode r = DdMarketCalc.rules();
            ObjectNode o = O(); o.set("won", r.get("won")); o.set("cpBp", r.get("cpBp")); o.set("bonus", r.get("bonus")); o.set("validMonths", r.get("validMonths")); o.set("carryMonths", r.get("carryMonths")); o.set("restore", r.get("restore")); o.set("guardBp", r.get("guardBp")); o.set("slots", slotsJson()); return o; });
        /* ── 8-2 구매 기관 ── */
        S.r("POST /api/market/credit/plan", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); JsonNode b = body(raw);
            return S.T(() -> { S.needPilot(tid(a)); List<String> cols = arrOf(get(b, "collections"), 20, COL_RE); long avg = S.avgOf(cols);
                ObjectNode in = O(); for (String k : new String[]{ "budget", "people", "bonusBp", "coursesPerPerson" }) if (!undef(get(b, k))) in.set(k, get(b, k)); in.put("bundle", truthy(get(b, "bundle"))).put("avgCredits", avg);
                ObjectNode P = DdMarketCalc.plan(in); boolean ok = P.get("ok").asBoolean(); boolean over = P.has("bonusOver");
                ArrayNode alt = F.arrayNode(); if (!ok) alt.addObject().put("bonusBp", DdMarketCalc.BONUS_MAX_BP);
                ArrayNode notes = F.arrayNode().add("예상 인원은 선택 컬렉션 평균 과정 크레딧 기준 추정입니다."); if (over) notes.add(MSG.get("mk_bonus_max"));
                ObjectNode o = P.deepCopy(); o.remove("ok"); o.remove("bonusOver"); o.remove("santaBp"); o.remove("cpMax"); o.put("ok", ok); o.set("alternatives", alt); o.set("notes", notes); if (S.isSanta(a)) { o.set("santaBp", P.get("santaBp")); o.set("cpMax", P.get("cpMax")); } return o; }); });
        S.r("POST /api/market/quotes", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); JsonNode b = body(raw); S.needPaid(tid(a));
            return S.T(() -> { S.needPilot(tid(a)); return S.idem(tid(a), "quotes", get(b, "idem"), () -> { ObjectNode q = "single".equals(S0(get(b, "kind"))) ? S.singleQuote(tid(a), b, email(a)) : S.creditQuote(tid(a), b, email(a), false); ObjectNode o = O().put("ok", true); o.set("quote", quoteOut(q, S.isSanta(a))); return o; }); }); });
        S.r("GET /api/market/quotes", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); return S.T(() -> { S.needPilot(tid(a)); List<ObjectNode> L = new ArrayList<>(); for (ObjectNode q : db.q("select * from mk_quote where buyer_tid = $1 order by at desc", tid(a))) L.add(quoteOut(q, false)); return pageOf(req, L); }); });
        final String TERMS_VER = "mk-pass-v2"; /* 이용권 이용 조건 판(화면 MK_TERMS.ver · Node routes.js와 같음, r3) */
        final List<String> BUYER_MODES = List.of("general", "public_license", "public_postpaid");
        S.r("POST /api/market/contracts", (req, res, raw, p) -> { Map<String, Object> a = S.needOwner(req); JsonNode b = body(raw); S.needPaid(tid(a));
            return S.T(() -> { S.needPilot(tid(a)); return S.idem(tid(a), "contracts", get(b, "idem"), () -> {
                if (!TERMS_VER.equals(S(get(b, "terms"))) || get(b, "lapseAck") == null || !get(b, "lapseAck").isBoolean() || !get(b, "lapseAck").asBoolean()) throw S.E(422, "mk_terms"); /* r3 C2 이용 조건 + 소멸 조항 별도 동의(policy v1.3 제19조) */
                ObjectNode qt = db.q1("select * from mk_quote where id = $1 and buyer_tid = $2 for update", str(get(b, "quoteId"), 20), tid(a)); if (qt == null) throw S.E(404, "quote", "없는 견적입니다.");
                if (!List.of("ready", "sent").contains(s(qt, "status")) || kstDay(g(qt, "valid_to")).compareTo(today()) < 0) throw S.E(409, "mk_quote_state");
                String bk0 = BUYER_MODES.contains(S(get(b, "buyerMode"))) ? S(get(b, "buyerMode")) : "general";
                String st0 = get(b, "start") != null && get(b, "start").isTextual() ? get(b, "start").asText() : ""; String start = DAY_RE.matcher(st0).matches() ? st0 : today(); ObjectNode x = DdMarketCalc.expiry(start); JsonNode inp = truthy(g(qt, "input")) ? g(qt, "input") : O();
                JsonNode cols = truthy(get(inp, "collections")) ? get(inp, "collections") : F.arrayNode(); String renew = null;
                if (truthy(get(inp, "topupOf"))) { ObjectNode o = db.q1("select * from mk_contract where id = $1 and buyer_tid = $2", get(inp, "topupOf"), tid(a)); if (o == null) throw S.E(404, "contract", "없는 계약입니다."); renew = s(o, "id"); cols = g(o, "collections"); if (!s(o, "buyer_mode").isEmpty()) bk0 = s(o, "buyer_mode"); }
                final String bk = bk0; ObjectNode terms = O().put("ver", TERMS_VER).put("at", isoNow()).put("by", email(a)).put("lapseAck", true).put("carryBp", DdMarketCalc.CARRY_BP).put("penaltyBp", DdMarketCalc.PENALTY_BP);
                ObjectNode k; try { k = db.q1("insert into mk_contract (id, buyer_tid, quote_id, kind, collections, start, \"end\", carry_end, supply_total, bonus_bp, bundle_platform, renew_of, by_email, terms, buyer_mode, tax) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16::jsonb) returning *, to_char(start, 'YYYY-MM-DD') s, to_char(\"end\", 'YYYY-MM-DD') e, to_char(carry_end, 'YYYY-MM-DD') ce",
                    rid("mk_"), tid(a), s(qt, "id"), "single".equals(s(qt, "kind")) ? "single" : "credit", cols, start, x.get("validTo").asText(), x.get("carryTo").asText(), g(qt, "supply_total"), g(qt, "bonus_bp"), truthy(get(inp, "bundle")), renew, email(a), terms.toString(), bk, DdMarketCalc.taxOf(n(qt, "supply_total"), n(qt, "bonus_credits"), today()).toString()); } /* C4 발행 대기: 작성일 = 구매 확정일 · 공급가액 = 보너스 제외 */ /* r3: 자동 이월 없음(carry_end = end) */
                catch (DuplicateKeyException e) { throw S.E(409, "mk_quote_state"); }
                db.x("update mk_quote set status = 'accepted' where id = $1", s(qt, "id"));
                if (get(b, "controls") != null && get(b, "controls").isObject() && renew == null) S.putControl(s(k, "id"), get(b, "controls"), email(a));
                S.log(tid(a), email(a), "market.contract", map("contract", s(k, "id"), "quote", s(qt, "id"), "supply", g(qt, "supply_total"))); S.log(tid(a), email(a), "market.terms", map("contract", s(k, "id"), "ver", TERMS_VER, "lapseAck", true, "buyerMode", bk)); ObjectNode o = O().put("ok", true); o.set("contract", kOut(k)); return o; }); }); });
        /* ── 8-3 CP ── */
        S.r("GET /api/market/cp/products", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { String day = today(); ArrayNode it = F.arrayNode();
            for (ObjectNode r : db.q(PROD_SQL + " where p.owner_tid = $2 order by p.created_at", day, tid(a))) { ObjectNode o = prodOut(r, day, true); o.set("listPrice", g(r, "list_price")); o.set("floorPrice", g(r, "floor_price")); o.set("minUntil", g(r, "mu")); it.add(o); }
            ObjectNode o = O(); o.set("items", it); return o; }); });
        S.r("POST /api/market/cp/products", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "cp-products", get(b, "idem"), () -> { String title = trim(str(get(b, "title"), 120)); if (title.isEmpty()) throw S.E(400, "title", "상품 이름을 입력하십시오.");
                String kind = get(b, "kind") != null && List.of("course", "item", "path", "book").contains(S0(get(b, "kind"))) ? get(b, "kind").asText() : "course"; String la0 = get(b, "launchedAt") != null && get(b, "launchedAt").isTextual() ? get(b, "launchedAt").asText() : ""; String launched = DAY_RE.matcher(la0).matches() ? la0 : today();
                String sec = str(get(b, "sector"), 40), lev = str(get(b, "level"), 20); double hx = round(num(get(b, "hours")) * 10);
                ObjectNode r = db.q1("insert into mk_product (id, owner_tid, owner_kind, kind, title, sector, level, hours_x10, launched_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, status", rid("mp_"), tid(a), "cp", kind, title, sec.isEmpty() ? null : sec, lev.isEmpty() ? null : lev, Math.max(0, Double.isFinite(hx) ? (long) hx : 0), launched);
                ObjectNode o = O().put("ok", true); o.set("product", cp(r, "id", "id", "status", "status")); return o; })); });
        S.r("GET /api/market/cp/optin", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { String day = today(); ArrayNode it = F.arrayNode();
            for (ObjectNode r : db.q(PROD_SQL + " where p.owner_tid = $2", day, tid(a))) { ObjectNode o = O(); o.set("product", g(r, "id")); o.set("title", g(r, "title")); o.put("mode", modeOf(r, day)); o.set("creditFrom", g(r, "cf")); o.set("minUntil", g(r, "mu")); o.put("activeContracts", S.activeOf(s(r, "id")).size()); it.add(o); }
            ObjectNode o = O(); o.set("items", it); return o; }); });
        S.r("GET /api/market/cp/statements", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); String ymq = str(qp(req, "ym"), 7);
            return S.T(() -> { ArrayNode it = F.arrayNode(); for (ObjectNode s0 : ymq.isEmpty() ? db.q("select * from mk_stmt where cp_tid = $1 order by ym desc", tid(a)) : db.q("select * from mk_stmt where cp_tid = $1 and ym = $2 order by ym desc", tid(a), ymq)) it.add(MkSettle.stmtOut(s0)); ObjectNode o = O(); o.set("items", it); return o; }); });
        S.r("GET /api/market/cp/rate", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> S.rateInfo(tid(a))); });
        S.r("GET /api/market/cp/promo-slots", (req, res, raw, p) -> { S.needCp(req); String q0 = str(qp(req, "ym"), 7); String m = !q0.isEmpty() ? q0 : DdMarketCalc.addMonths(today(), 1).substring(0, 7);
            return S.T(() -> { Map<String, Long> n0 = new LinkedHashMap<>(); for (ObjectNode r : db.q("select slot, count(*)::int n from mk_promo where ym = $1 and status = 'ok' group by slot", m)) n0.put(s(r, "slot"), n(r, "n"));
                ObjectNode o = O().put("ym", m); ArrayNode sl = o.putArray("slots"); for (Map.Entry<String, long[]> e : DdMarketCalc.SLOT.entrySet()) sl.addObject().put("slot", e.getKey()).put("label", DdMarketCalc.SLOT_LABEL.get(e.getKey())).put("fee", e.getValue()[1]).put("cap", e.getValue()[0]).put("left", Math.max(0, e.getValue()[0] - n0.getOrDefault(e.getKey(), 0L))); return o; }); });
        S.r("POST /api/market/cp/promos", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); if (!owner(a)) throw S.E(403, "role", "정운영자만 신청할 수 있습니다."); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "cp-promos", get(b, "idem"), () -> { String day = today(); ObjectNode r = S.prod(str(get(b, "productId"), 20), day); if (r == null || !s(r, "owner_tid").equals(tid(a))) throw S.E(404, "product", "없는 상품입니다.");
                List<String> months = new ArrayList<>(); ArrayNode mj = F.arrayNode(); if (get(b, "months") != null && get(b, "months").isArray()) for (JsonNode x : get(b, "months")) { months.add(str(x, 7)); mj.add(str(x, 7)); } String slot = str(get(b, "slot"), 12);
                long full = 0; if (!months.isEmpty()) for (ObjectNode x : db.q("select ym, count(*)::int n from mk_promo where slot = $1 and ym = any($2) and status = 'ok' group by ym", slot, months)) full = Math.max(full, n(x, "n"));
                long launchDays = truthy(g(r, "la")) ? Math.floorDiv(java.time.temporal.ChronoUnit.DAYS.between(MarketServiceImpl.day(s(r, "la")), MarketServiceImpl.day(day)), 1) : 0;
                ObjectNode op = O().put("approvedInMonth", full).put("optin", modeOf(r, day)).put("reviewed", "listed".equals(s(r, "status"))).put("orig", santaOwn(r)).put("launchDays", launchDays).put("thisYm", day.substring(0, 7));
                ObjectNode P = DdMarketCalc.promoCheck(slot, mj, op); if (P.has("error")) { String er = P.get("error").asText(); throw S.E("mk_promo_full".equals(er) ? 409 : 422, er); }
                ArrayNode items = F.arrayNode(); for (String m : months) { ObjectNode x; try { x = db.q1("insert into mk_promo (id, cp_tid, product_id, slot, ym, fee) values ($1,$2,$3,$4,$5,$6) returning *", rid("mpr_"), tid(a), s(r, "id"), slot, m, DdMarketCalc.SLOT.get(slot)[1]); }
                    catch (DuplicateKeyException e) { throw S.E(409, "mk_promo_full", "같은 상품 · 슬롯 · 달의 신청이 이미 있습니다."); } items.add(S.promoOut(x)); }
                ObjectNode o = O().put("ok", true); o.set("items", items); o.set("fee", P.get("fee")); return o; })); });
        S.r("GET /api/market/cp/promos", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { ArrayNode it = F.arrayNode(); for (ObjectNode x : db.q("select * from mk_promo where cp_tid = $1 order by ym desc, at desc", tid(a))) it.add(S.promoOut(x)); ObjectNode o = O().put("adOrgs", S.adOrgs()); o.set("items", it); return o; }); });
        /* ── 8-4 산타 운영 ── */
        S.r("GET /api/market/ops/reviews", (req, res, raw, p) -> { S.needSanta(req); String st0 = str(qp(req, "status"), 12); String st = st0.isEmpty() ? "in_review" : st0;
            return S.T(() -> { ArrayNode it = F.arrayNode(); for (ObjectNode r : db.q(PROD_SQL + " where p.status = $2 order by p.created_at", today(), st)) { ObjectNode o = prodOut(r, today(), true); o.set("ownerTid", g(r, "owner_tid")); o.set("listPrice", g(r, "list_price")); o.set("memo", g(r, "review_memo")); it.add(o); } ObjectNode o = O(); o.set("items", it); return o; }); });
        S.r("POST /api/market/ops/credit-quotes", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); String buyer = str(get(b, "buyerTid"), 20);
            if (!S.tenantExists(buyer)) throw S.E(404, "tenant", "없는 기관입니다."); return S.T(() -> {
                return S.idem(tid(a), "ops-credit-quotes", get(b, "idem"), () -> { ObjectNode o = O().put("ok", true); o.set("quote", quoteOut(S.creditQuote(buyer, b, email(a), true), true)); return o; }); }); });
        S.r("GET /api/market/ops/contracts", (req, res, raw, p) -> { S.needSanta(req); String st = str(qp(req, "status"), 12);
            return S.T(() -> { List<ObjectNode> K = st.isEmpty() ? db.q(KSEL + " order by at desc limit 500") : db.q(KSEL + " where status = $1 order by at desc limit 500", st); ArrayNode it = F.arrayNode(); long sup = 0, used0 = 0, bal = 0;
                for (ObjectNode k : K) { MarketServiceImpl.WS W = S.walletState(k); long used = n(db.q1("select coalesce(sum(credits), 0)::int n from mk_credit_use where contract_id = $1", s(k, "id")), "n");
                    ObjectNode o = O(); o.set("contract", kOut(k)); o.put("buyer", S.orgOf(s(k, "buyer_tid")).get("name").asText()); o.set("supply", g(k, "supply_total")); o.set("bonusBp", g(k, "bonus_bp")); o.put("used", used).put("balance", W.balance).put("santaBp", "credit".equals(s(k, "kind")) ? DdMarketCalc.guard(n(k, "supply_total"), n(k, "bonus_bp")).get("santaBp").asLong() : 3000); it.add(o);
                    sup += n(k, "supply_total"); used0 += used; bal += W.balance; }
                ObjectNode o = O(); o.set("items", it); o.putObject("totals").put("supply", sup).put("used", used0).put("balance", bal); return o; }); });
        S.r("GET /api/market/ops/disputes", (req, res, raw, p) -> { S.needSanta(req); return S.T(() -> { ObjectNode o = O(); ArrayNode it = o.putArray("items"); for (ObjectNode d : db.q("select * from mk_dispute order by (status = 'open') desc, at desc limit 200")) it.add(d); return o; }); });
        S.r("POST /api/market/settle/month", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); return S.settle().month(str(get(b, "ym"), 7), email(a)); });
        S.r("POST /api/market/settle/close", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); return S.settle().close(str(get(b, "quarter"), 7), email(a)); });
        S.r("GET /api/market/ops/export", (req, res, raw, p) -> { S.needSanta(req); String csv = S.settle().exportCsv(str(qp(req, "close"), 20));
            res.setStatus(200); res.setHeader("content-type", "text/csv; charset=utf-8"); res.setHeader("content-disposition", "attachment; filename=\"market-payout.csv\""); res.setHeader("cache-control", "no-store"); res.setHeader("x-content-type-options", "nosniff");
            res.getOutputStream().write(csv.getBytes(StandardCharsets.UTF_8)); res.flushBuffer(); return null; });
        S.r("GET /api/market/ops/cp-rates", (req, res, raw, p) -> { S.needSanta(req); return S.T(() -> { ObjectNode o = O(); ArrayNode it = o.putArray("items");
            for (ObjectNode x : db.q("select tid, cp_name from mk_party where kind = 'cp' order by tid")) { ObjectNode y = O(); y.set("cpTid", g(x, "tid")); y.set("cpName", g(x, "cp_name")); y.setAll(S.rateInfo(s(x, "tid"))); it.add(y); } return o; }); });
        S.r("POST /api/market/ops/originals", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "ops-originals", get(b, "idem"), () -> { String title = trim(str(get(b, "title"), 120)); double lp = I(get(b, "listPrice")), hx = I(get(b, "hoursX10"));
                List<String> fail = new ArrayList<>(); if (title.isEmpty()) fail.add("title"); if (!(lp > 0)) fail.add("listPrice"); if (!(hx > 0)) fail.add("hours"); if (!fail.isEmpty()) throw S.E(422, "mk_check", null, map("failed", fail));
                List<String> cols = arrOf(get(b, "collections"), 10, COL_RE);
                for (String cid : cols) { ObjectNode n0 = db.q1("select count(*)::int col, count(*) filter (where p.owner_kind = 'santa')::int orig from mk_collection_item i join mk_product p on p.id = i.product_id where i.collection_id = $1", cid);
                    ObjectNode ck = db.q1("select kind from mk_collection where id = $1", cid); if (ck == null) throw S.E(404, "collection", "없는 컬렉션입니다.");
                    if (!"original".equals(s(ck, "kind")) && !DdMarketCalc.origCapOk(n(n0, "col"), n(n0, "orig"))) throw S.E(409, "mk_orig_cap", null, map("collection", cid)); }
                String day = today(); String id = rid("mp_"); String ref = str(get(b, "clibRef"), 80); long L = (long) lp;
                db.x("insert into mk_product (id, owner_tid, owner_kind, kind, title, hours_x10, status, launched_at, src_kind, clib_ref) values ($1,$2,'santa','course',$3,$4,'listed',$5,$6,$7)", id, tid(a), title, (long) hx, day, "ai".equals(S0(get(b, "srcKind"))) ? "ai" : "self", ref.isEmpty() ? null : ref);
                db.x("insert into mk_price (product_id, list_price, credits, effective_from, by_email) values ($1,$2,$3,$4,$5)", id, L, DdMarketCalc.credits(L), day, email(a));
                db.x("insert into mk_optin (product_id, mode, credit_from, by_email) values ($1,'credit',$2,$3)", id, day, email(a));
                for (String cid : cols) db.x("insert into mk_collection_item (collection_id, product_id) values ($1,$2) on conflict do nothing", cid, id);
                ObjectNode o = O().put("ok", true); o.putObject("product").put("id", id).put("title", title).put("ownerKind", "santa").put("status", "listed").put("optin", "credit").putNull("minUntil"); o.putObject("price").put("listPrice", L).put("credits", DdMarketCalc.credits(L)); return o; })); });
        S.r("GET /api/market/ops/originals", (req, res, raw, p) -> { S.needSanta(req); return S.T(() -> { String day = today(); ObjectNode o = O(); ArrayNode it = o.putArray("items");
            for (ObjectNode r : db.q(PROD_SQL + " where p.owner_kind = 'santa' order by p.created_at", day)) { ObjectNode y = O(); y.set("product", prodOut(r, day, true)); y.set("credits", g(r, "credits"));
                y.set("used30d", g(db.q1("select coalesce(sum(credits), 0)::int n from mk_credit_use where product_id = $1 and at > now() - interval '30 days'", s(r, "id")), "n"));
                ArrayNode cs = y.putArray("collections"); for (ObjectNode x : db.q("select collection_id from mk_collection_item where product_id = $1", s(r, "id"))) cs.add(g(x, "collection_id")); it.add(y); }
            return o; }); });
        S.r("GET /api/market/ops/promos", (req, res, raw, p) -> { S.needSanta(req); String st = str(qp(req, "status"), 10);
            return S.T(() -> { ObjectNode o = O().put("adOrgs", S.adOrgs()); ArrayNode it = o.putArray("items"); for (ObjectNode x : st.isEmpty() ? db.q("select * from mk_promo order by ym, at") : db.q("select * from mk_promo where status = $1 order by ym, at", st)) it.add(S.promoOut(x)); return o; }); });
        S.r("GET /api/market/ops/revenue", (req, res, raw, p) -> { S.needSanta(req); return S.T(() -> S.revenue(req).put("adOrgs", S.adOrgs())); });
        S.r("POST /api/market/ops/collections", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw);
            return S.T(() -> { String id = str(get(b, "id"), 30); if (!COL_RE.matcher(id).matches()) throw S.E(400, "id", "컬렉션 번호(mc_…)를 확인하십시오."); String title = trim(str(get(b, "title"), 80)); if (title.isEmpty()) throw S.E(400, "title", "이름을 입력하십시오.");
                String kind = List.of("basic", "industry", "campus", "original").contains(S0(get(b, "kind"))) ? get(b, "kind").asText() : "basic"; String sec = str(get(b, "sector"), 40), cov = str(get(b, "cover"), 200); double so = I(get(b, "sort"));
                db.x("insert into mk_collection (id, kind, title, sector, cover, sort) values ($1,$2,$3,$4,$5,$6) on conflict (id) do update set kind = $2, title = $3, sector = $4, cover = $5, sort = $6, active = true", id, kind, title, sec.isEmpty() ? null : sec, cov.isEmpty() ? null : cov, Double.isNaN(so) ? 0 : (long) so);
                String day = today(); List<String> want = arrOf(get(b, "items"), 500, PID_RE); List<String> ok = new ArrayList<>(), skipped = new ArrayList<>();
                for (String pid : want) { ObjectNode r = S.prod(pid, day); (r != null && "listed".equals(s(r, "status")) && "credit".equals(modeOf(r, day)) ? ok : skipped).add(pid); }
                List<String> orig = new ArrayList<>(); for (String pid : ok) { ObjectNode r = S.prod(pid, day); if (santaOwn(r)) orig.add(pid); }
                if (!"original".equals(kind) && !orig.isEmpty() && !DdMarketCalc.origCapOk(ok.size() - 1, orig.size() - 1)) throw S.E(409, "mk_orig_cap");
                db.x("delete from mk_collection_item where collection_id = $1", id); int i = 0; for (String pid : ok) db.x("insert into mk_collection_item (collection_id, product_id, sort) values ($1,$2,$3)", id, pid, i++);
                ObjectNode o = O().put("ok", true); o.putObject("collection").put("id", id).put("kind", kind).put("title", title).put("count", ok.size()); o.set("skipped", an(skipped)); return o; }); });

        S.r("GET /api/market/ops/orgs", (req, res, raw, p) -> { S.needSanta(req); String tq = trim(str(qp(req, "q"), 60)); String kd = str(qp(req, "kind"), 10); boolean pil = "1".equals(qp(req, "pilot"));
            /* tenants는 마켓 역할 밖, mk_party는 산타 범위(RLS FORCE) — 두 번 읽어 합친다(Node d31581a와 같음) */
            List<ObjectNode> T0 = db.raw(() -> db.q("select t.id, t.name, t.type, t.created_at from tenants t where ($1 = '' or t.name ilike '%' || $1 || '%' or t.id = $1) order by t.created_at desc limit 2000", tq));
            Map<String, ObjectNode> PA = new LinkedHashMap<>(); for (ObjectNode x : S.T(() -> db.q("select tid, kind, pilot, cp_name, pilot_by, pilot_at from mk_party"))) PA.put(s(x, "tid"), x);
            List<ObjectNode> rows = new ArrayList<>(); for (ObjectNode t0 : T0) { ObjectNode pa = PA.get(s(t0, "id")); String kind = pa == null ? "buyer" : s(pa, "kind"); boolean pv = pa != null && B(pa, "pilot");
                if (pil && !pv) continue; if (!kd.isEmpty() && !kd.equals(kind)) continue; ObjectNode r = t0.deepCopy(); r.put("kind", kind).put("pilot", pv); r.set("cp_name", g(pa, "cp_name")); r.set("pilot_by", g(pa, "pilot_by")); r.set("pilot_at", g(pa, "pilot_at")); r.put("_p", pv ? 0 : 1); rows.add(r); }
            rows.sort((x, y) -> Long.compare(n(x, "_p"), n(y, "_p"))); if (rows.size() > 500) rows = rows.subList(0, 500); List<ObjectNode> L = new ArrayList<>();
            for (ObjectNode r : rows) { ObjectNode o = cp(r, "tid", "id", "name", "name", "type", "type", "kind", "kind", "cpName", "cp_name"); ObjectNode mk = o.putObject("mk"); mk.set("pilot", g(r, "pilot")); mk.set("by", g(r, "pilot_by")); mk.set("at", g(r, "pilot_at")); L.add(o); }
            return pageOf(req, L); });
        S.r("GET /api/market/settle/closes", (req, res, raw, p) -> { S.needSanta(req); return S.T(() -> { ObjectNode o = O(); ArrayNode it = o.putArray("items"); for (ObjectNode z : db.q("select * from mk_close order by quarter desc, at desc limit 40")) it.add(MkSettle.closeOut(z)); return o; }); });
        S.r("GET /api/market/ops/quotes", (req, res, raw, p) -> { S.needSanta(req); String st = str(qp(req, "status"), 10);
            return S.T(() -> { List<ObjectNode> L = new ArrayList<>(); for (ObjectNode x : st.isEmpty() ? db.q("select * from mk_quote order by at desc limit 1000") : db.q("select * from mk_quote where status = $1 order by at desc limit 1000", st)) L.add(quoteOut(x, true)); return pageOf(req, L); }); });
        S.r("POST /api/market/ops/quotes/auto", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); String buyer = str(get(b, "buyerTid"), 20);
            if (!S.tenantExists(buyer)) throw S.E(404, "tenant", "없는 기관입니다."); return S.T(() -> {
                return S.idem(tid(a), "ops-quotes-auto", get(b, "idem"), () -> { ObjectNode x = S.singleQuote(buyer, b, email(a)); ObjectNode o = O().put("ok", true); o.set("quote", quoteOut(x, true)); o.put("auto", "ready".equals(s(x, "status"))); return o; }); }); });
        S.r("GET /api/market/cp/requests", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { Set<String> own = new HashSet<>(); for (ObjectNode r : db.q("select id from mk_product where owner_tid = $1", tid(a))) own.add(s(r, "id"));
            ObjectNode o = O(); ArrayNode it = o.putArray("items");
            for (ObjectNode x : db.q("select * from mk_quote where kind = 'single' and status = 'cp_wait' order by at")) { List<JsonNode> L = new ArrayList<>(); for (JsonNode l : arr(get(g(x, "input"), "lines"))) if (own.contains(s(l, "productId"))) L.add(l); if (L.isEmpty()) continue;
                ObjectNode y = it.addObject(); y.set("id", g(x, "id")); y.set("price", g(x, "supply_total")); ArrayNode ln = y.putArray("lines"); long fs = 0; for (JsonNode l : L) { ObjectNode z = ln.addObject(); z.set("productId", get(l, "productId")); z.set("people", get(l, "people")); z.set("lic", get(l, "lic")); z.set("floor", get(l, "floor")); fs += truthy(get(l, "floor")) ? get(l, "floor").asLong() : 0; }
                y.set("cand", g(g(x, "est"), "cand")); y.put("floorSum", fs); y.put("decided", truthy(get(get(g(x, "input"), "cpOk"), tid(a)))); y.set("validTo", g(x, "valid_to")); }
            return o; }); });
        S.r("POST /api/market/cp/catalog/import", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); JsonNode b = DdWeb.readBody(raw, 512 * 1024);
            return S.T(() -> S.idem(tid(a), "cp-import", get(b, "idem"), () -> { List<JsonNode> rows = arr(get(b, "rows")); if (rows.size() > 500) rows = rows.subList(0, 500); ArrayNode created = F.arrayNode(), failed = F.arrayNode(); String day = today();
                for (int i = 0; i < rows.size(); i++) { JsonNode r = truthy(rows.get(i)) ? rows.get(i) : O(); String title = trim(str(get(r, "title"), 120)); double lp = I(get(r, "listPrice")); double hx0 = round(num(get(r, "hours")) * 10); long hx = Double.isFinite(hx0) ? (long) hx0 : 0;
                    ArrayNode bad = F.arrayNode(); if (title.isEmpty()) bad.add("title"); if (!(hx > 0)) bad.add("hours"); if (!nullish(get(r, "listPrice")) && !(lp > 0)) bad.add("listPrice"); if (bad.size() > 0) { failed.addObject().put("row", i + 1).set("failed", bad); continue; }
                    String id = rid("mp_"); String la = get(r, "launchedAt") != null && get(r, "launchedAt").isTextual() && DAY_RE.matcher(get(r, "launchedAt").asText()).matches() ? get(r, "launchedAt").asText() : day; String sec = str(get(r, "sector"), 40), lev = str(get(r, "level"), 20);
                    db.x("insert into mk_product (id, owner_tid, owner_kind, kind, title, sector, level, hours_x10, launched_at) values ($1,$2,'cp',$3,$4,$5,$6,$7,$8)", id, tid(a), List.of("course", "item", "path", "book").contains(S0(get(r, "kind"))) ? S0(get(r, "kind")) : "course", title, sec.isEmpty() ? null : sec, lev.isEmpty() ? null : lev, hx, la);
                    if (lp > 0) db.x("insert into mk_price (product_id, list_price, credits, effective_from, by_email) values ($1,$2,$3,$4,$5)", id, (long) lp, DdMarketCalc.credits((long) lp), day, email(a));
                    created.add(id); }
                String jobId = rid("mj_"); ObjectNode out = O().put("ok", true).put("jobId", jobId).put("status", "done").put("created", created.size()); out.set("ids", created); out.set("failed", failed);
                db.x("insert into mk_idem (tid, route, key, resp) values ($1,$2,$3,$4)", tid(a), "cp-import-job", jobId, out); return out; })); });
        /* ── 매개변수 경로 ── */
        S.p("GET", "^/api/market/cp/catalog/import/(mj_[a-z0-9]{12})$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { ObjectNode x = db.q1("select resp from mk_idem where tid = $1 and route = 'cp-import-job' and key = $2", tid(a), p[0]); if (x == null) throw S.E(404, "job", "없는 작업입니다."); return x.get("resp"); }); });
        S.p("POST", "^/api/market/cp/requests/(mq_[a-z0-9]{12})/decide$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); JsonNode b = body(raw); String id = p[0]; return S.T(() -> {
            ObjectNode x = db.q1("select * from mk_quote where id = $1 and kind = 'single' and status = 'cp_wait' for update", id); if (x == null) throw S.E(409, "mk_quote_state");
            Set<String> own = new HashSet<>(); for (ObjectNode r : db.q("select id from mk_product where owner_tid = $1", tid(a))) own.add(s(r, "id")); boolean mine = false; List<String> pids = new ArrayList<>(); for (JsonNode l : arr(get(g(x, "input"), "lines"))) { pids.add(s(l, "productId")); if (own.contains(s(l, "productId"))) mine = true; }
            if (!mine) throw S.E(404, "quote", "없는 요청입니다.");
            ObjectNode ok = get(g(x, "input"), "cpOk") != null && get(g(x, "input"), "cpOk").isObject() ? ((ObjectNode) get(g(x, "input"), "cpOk")).deepCopy() : O(); ok.put(tid(a), truthy(get(b, "ok")));
            boolean all = true; for (ObjectNode r : db.q("select distinct owner_tid from mk_product where id = any($1)", pids)) if (!truthy(ok.get(s(r, "owner_tid")))) all = false;
            String status = !truthy(get(b, "ok")) ? "cancelled" : all ? "ready" : "cp_wait"; ObjectNode inp = ((ObjectNode) g(x, "input")).deepCopy(); inp.set("cpOk", ok);
            ObjectNode y = db.q1("update mk_quote set input = $2, status = $3 where id = $1 returning *", id, inp.toString(), status); S.log(s(x, "buyer_tid"), email(a), "market.cp_request", map("quote", id, "ok", truthy(get(b, "ok"))));
            ObjectNode o = O().put("ok", true); ObjectNode rq = o.putObject("request").put("id", id); rq.set("status", g(y, "status")); rq.put("decided", truthy(get(b, "ok"))); return o; }); });
        S.p("POST", "^/api/market/ops/quotes/(mq_[a-z0-9]{12})/send$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); return S.T(() -> { ObjectNode x = db.q1("update mk_quote set status = 'sent' where id = $1 and status = 'ready' returning *", p[0]); if (x == null) throw S.E(409, "mk_quote_state");
            S.log(s(x, "buyer_tid"), email(a), "market.quote.send", map("quote", p[0])); ObjectNode o = O().put("ok", true); o.set("quote", quoteOut(x, true)); return o; }); });
        S.p("POST", "^/api/market/ops/quotes/(mq_[a-z0-9]{12})/adjust$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); String id = p[0]; return S.T(() -> S.idem(tid(a), "ops-adjust:" + id, get(b, "idem"), () -> {
            ObjectNode x = db.q1("select * from mk_quote where id = $1 and status in ('ready','sent','cp_wait') for update", id); if (x == null) throw S.E(409, "mk_quote_state"); ObjectNode y;
            if ("single".equals(s(x, "kind"))) { ObjectNode in = O(); in.set("price", !nullish(get(b, "price")) ? get(b, "price") : g(x, "supply_total")); in.set("lines", truthy(get(b, "lines")) ? get(b, "lines") : get(g(x, "input"), "lines")); y = S.singleQuote(s(x, "buyer_tid"), in, email(a)); }
            else { ObjectNode in = O(); ObjectNode inp = g(x, "input").isObject() ? ((ObjectNode) g(x, "input")).deepCopy() : O(); if (!nullish(get(b, "budget"))) inp.set("budget", get(b, "budget")); in.set("input", inp); in.set("bonusBp", !nullish(get(b, "bonusBp")) ? get(b, "bonusBp") : g(x, "bonus_bp")); y = S.creditQuote(s(x, "buyer_tid"), in, email(a), true); }
            db.x("update mk_quote set status = 'cancelled' where id = $1", id); ObjectNode o = O().put("ok", true); o.set("quote", quoteOut(y, true)); o.put("replaced", id); return o; })); });
        S.p("GET", "^/api/market/cp/statements/(ms_[a-z0-9]{12})/pdf$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); ObjectNode s00 = S.T(() -> db.q1("select * from mk_stmt where id = $1 and cp_tid = $2", p[0], tid(a))); if (s00 == null) throw S.E(404, "stmt", "없는 정산서입니다.");
            ObjectNode s1 = MkSettle.stmtOut(s00); StringBuilder rows = new StringBuilder(); for (JsonNode l : arr(s1.get("lines"))) rows.append("<tr><td>").append(h(get(l, "buyer"))).append("</td><td>").append(h(get(l, "title"))).append("</td><td>").append(h(get(l, "enrollments"))).append("</td><td class=\"n\">").append(won(get(l, "net"))).append("</td></tr>");
            String html = "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><title>월 소진 정산서 " + h(s1.get("ym")) + "</title><style>body{font-family:sans-serif;margin:32px;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px 8px;text-align:left}td.n{text-align:right}@media print{button{display:none}}</style></head><body>\n"
                + "<h1>디디쌤 콘텐츠 패스 월 소진 정산서</h1><p>정산 월 " + h(s1.get("ym")) + " · 분기 " + h(s1.get("quarter")) + " · 상태 " + h(s1.get("status")) + " · 적용 요율 " + h(s1.get("rateKind")) + " " + numStr(s1.get("cpBp").asDouble() / 100) + "%</p>\n"
                + "<table><tr><th>차감</th><th>복원</th><th>순소진(크레딧)</th><th>CP 몫(원)</th><th>조정</th><th>합계</th></tr><tr><td class=\"n\">" + won(s1.get("used")) + "</td><td class=\"n\">" + won(s1.get("restored")) + "</td><td class=\"n\">" + won(s1.get("net")) + "</td><td class=\"n\">" + won(s1.get("cpAmount")) + "</td><td class=\"n\">" + won(s1.get("adj")) + "</td><td class=\"n\">" + won(s1.get("total")) + "</td></tr></table>\n"
                + "<h2>기관별 집계(가명 · 5명 미만 가림)</h2><table><tr><th>기관</th><th>과정</th><th>수강</th><th>순소진</th></tr>" + rows + "</table>\n"
                + "<p>부가세 별도. 지급은 분기 마감 확정 후 지급 지시로 처리됩니다.</p><button onclick=\"print()\">인쇄 · PDF 저장</button></body></html>";
            res.setStatus(200); res.setHeader("content-type", "text/html; charset=utf-8"); res.setHeader("cache-control", "no-store"); res.setHeader("x-content-type-options", "nosniff"); res.setHeader("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'");
            res.getOutputStream().write(html.getBytes(StandardCharsets.UTF_8)); res.flushBuffer(); return null; });
        S.p("GET", "^/api/market/products/(mp_[a-z0-9]{12})$", (req, res, raw, p) -> { Map<String, Object> a = S.need(req); boolean staff = staff(a); String id = p[0];
            return S.T(() -> { S.needPilot(tid(a)); String day = today(); ObjectNode r = S.prod(id, day); if (r == null || (!"listed".equals(s(r, "status")) && !s(r, "owner_tid").equals(tid(a)) && !S.isSanta(a))) throw S.E(404, "product", "없는 상품입니다.");
                List<ObjectNode> H = S.priceRows(id); ObjectNode nxt = null; for (ObjectNode h : H) if (s(h, "ef").compareTo(day) > 0) nxt = h;
                ArrayNode cols = F.arrayNode(); for (ObjectNode c : db.q("select c.id, c.title from mk_collection_item i join mk_collection c on c.id = i.collection_id where i.product_id = $1", id)) cols.add(c);
                ObjectNode o = O(); o.set("product", prodOut(r, day, staff)); o.set("ver", g(r, "cur_ver"));
                if (staff && truthy(g(r, "list_price"))) { ObjectNode pr = o.putObject("price"); pr.set("listPrice", g(r, "list_price")); pr.set("credits", g(r, "credits")); pr.set("volRules", g(r, "vol_rules")); pr.set("lic", g(r, "lic_allowed")); pr.set("licAdd", g(r, "lic_add_bp")); if (nxt != null) { ObjectNode np = pr.putObject("nextPrice"); np.set("credits", g(nxt, "credits")); np.set("effectiveFrom", g(nxt, "ef")); } }
                ObjectNode oi = o.putObject("optin").put("mode", modeOf(r, day)); oi.set("creditFrom", g(r, "cf")); if ("single_until".equals(s(r, "mode"))) oi.put("singleUntil", optinFromOf(r));
                o.set("collections", cols); o.put("seller", santaOwn(r) ? "산타 오리지널" : truthy(g(r, "cp_name")) ? s(r, "cp_name") : ""); return o; }); });
        S.p("GET", "^/api/market/collections/(mc_[a-z0-9]{3,24})$", (req, res, raw, p) -> { Map<String, Object> a = S.need(req); return S.T(() -> { S.needPilot(tid(a)); List<ObjectNode> C = S.collections(today(), List.of(p[0])); if (C.isEmpty()) throw S.E(404, "collection", "없는 컬렉션입니다."); ObjectNode x = C.get(0);
            ObjectNode o = O(); o.set("collection", cp(x, "id", "id", "kind", "kind", "title", "title", "sector", "sector")); ArrayNode it = o.putArray("items"); for (JsonNode r : x.get("rows")) it.add(prodOut(r, today(), staff(a))); o.set("avgCredits", x.get("avgCredits")); o.set("count", x.get("count")); return o; }); });
        S.p("GET", "^/api/market/quotes/(mq_[a-z0-9]{12})$", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); return S.T(() -> { ObjectNode q = db.q1("select * from mk_quote where id = $1", p[0]); if (q == null || (!s(q, "buyer_tid").equals(tid(a)) && !S.isSanta(a))) throw S.E(404, "quote", "없는 견적입니다."); ObjectNode o = O(); o.set("quote", quoteOut(q, S.isSanta(a))); return o; }); });
        S.p("GET", "^/api/market/contracts/(mk_[a-z0-9]{12})$", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], false); MarketServiceImpl.WS W = S.walletState(k);
            ArrayNode byCp = F.arrayNode(); for (ObjectNode r : db.q("select p.owner_kind ok, coalesce(pa.cp_name, '') cp, sum(u.credits)::int credits from mk_credit_use u join mk_product p on p.id = u.product_id left join mk_party pa on pa.tid = u.cp_tid where u.contract_id = $1 group by 1, 2 order by 3 desc", s(k, "id"))) { ObjectNode y = byCp.addObject(); y.set("cp", "santa".equals(s(r, "ok")) ? t("산타 오리지널") : g(r, "cp")); y.set("credits", g(r, "credits")); }
            ArrayNode byGroup = F.arrayNode(); for (ObjectNode r : db.q("select coalesce(grp, '') g, sum(credits)::int credits, count(distinct sid_hash)::int n from mk_credit_use where contract_id = $1 group by 1 order by 2 desc", s(k, "id"))) { ObjectNode y = byGroup.addObject(); y.set("group", orNull(g(r, "g"))); y.set("credits", g(r, "credits")); if (n(r, "n") < 5) y.put("learners", "5명 미만"); else y.set("learners", g(r, "n")); }
            long month = n(db.q1("select coalesce(sum(credits), 0)::int n from mk_credit_use where contract_id = $1 and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') = $2", s(k, "id"), ym()), "n");
            long pre = n(db.q1("select count(*)::int n from mk_preapproval where contract_id = $1 and status = 'asked'", s(k, "id")), "n"); long rem = 0; for (ObjectNode l : W.lots) rem += n(l, "remain");
            ObjectNode o = O(); o.set("contract", kOut(k)); o.set("wallet", W.wallet); o.put("balance", W.balance).put("total", W.total); o.set("control", ctlOut(W.ctl));
            ObjectNode u = o.putObject("used").put("month", month).put("total", W.total - rem); u.putArray("byCollection"); u.set("byGroup", byGroup); u.set("byCp", byCp);
            ArrayNode al = o.putArray("alerts"); if (!W.alert.isEmpty()) al.add(W.alert); o.putObject("pending").put("pre", pre).put("restore", 0); return o; }); });
        S.p("GET", "^/api/market/contracts/(mk_[a-z0-9]{12})/uses$", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], false); String now = isoNow(); String pr = qp(req, "product");
            List<ObjectNode> rows = pr != null && !pr.isEmpty() ? db.q("select u.*, p.title from mk_credit_use u join mk_product p on p.id = u.product_id where u.contract_id = $1 and u.product_id = $2 order by u.at desc", s(k, "id"), str(pr, 20)) : db.q("select u.*, p.title from mk_credit_use u join mk_product p on p.id = u.product_id where u.contract_id = $1 order by u.at desc", s(k, "id"));
            List<ObjectNode> L = new ArrayList<>(); for (ObjectNode u : rows) L.add(useOut(u, now)); return pageOf(req, L); }); });
        S.p("PUT", "^/api/market/contracts/(mk_[a-z0-9]{12})/controls$", (req, res, raw, p) -> { Map<String, Object> a = S.needOwner(req); JsonNode b = body(raw); return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], false); if (!s(k, "buyer_tid").equals(tid(a))) throw S.E(404, "contract", "없는 계약입니다.");
            ObjectNode t0 = S.putControl(s(k, "id"), b, email(a)); S.log(tid(a), email(a), "market.control", map("contract", s(k, "id"))); ObjectNode o = O().put("ok", true); o.set("control", ctlOut(t0)); return o; }); });
        S.p("GET", "^/api/market/contracts/(mk_[a-z0-9]{12})/preapprovals$", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], false); ObjectNode o = O(); ArrayNode it = o.putArray("items");
            for (ObjectNode x : db.q("select a.*, p.title from mk_preapproval a join mk_product p on p.id = a.product_id where a.contract_id = $1 order by a.at desc", s(k, "id"))) { ObjectNode y = it.addObject(); y.set("id", g(x, "id")); y.set("product", g(x, "product_id")); y.set("title", g(x, "title")); y.putObject("learner").put("key", s(x, "sid_hash").substring(0, 10)); y.set("status", g(x, "status")); y.set("at", g(x, "at")); }
            return o; }); });
        S.p("POST", "^/api/market/contracts/(mk_[a-z0-9]{12})/preapprovals/(ma_[a-z0-9]{12})/decide$", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); JsonNode b = body(raw); return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], false); String memo = str(get(b, "memo"), 200);
            ObjectNode x = db.q1("update mk_preapproval set status = $3, memo = $4, decided_by = $5, decided_at = now() where id = $1 and contract_id = $2 and status = 'asked' returning *", p[1], s(k, "id"), truthy(get(b, "ok")) ? "ok" : "no", memo.isEmpty() ? null : memo, email(a));
            if (x == null) throw S.E(409, "mk_pre_state", "이미 처리한 승인 요청입니다."); ObjectNode o = O().put("ok", true); o.set("preapproval", cp(x, "id", "id", "status", "status")); return o; }); });
        S.p("POST", "^/api/market/contracts/(mk_[a-z0-9]{12})/restore$", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); JsonNode b = body(raw);
            return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], true); if (!s(k, "buyer_tid").equals(tid(a))) throw S.E(404, "contract", "없는 계약입니다."); return S.idem(tid(a), "restore", get(b, "idem"), () -> {
                ObjectNode u = db.q1("select * from mk_credit_use where id = $1 and contract_id = $2 and kind = 'use' for update", str(get(b, "useId"), 20), s(k, "id")); if (u == null) throw S.E(404, "use", "없는 차감 기록입니다.");
                if (B(u, "restored")) throw S.E(409, "mk_restore_state", "이미 복원한 차감입니다.");
                double pg0 = I(get(b, "progPct")); long prog = Math.max(0, Math.min(100, Double.isNaN(pg0) ? 0 : (long) pg0)); double h = DdMarketCalc.hoursBetween(s(u, "at"), isoNow());
                if (!DdMarketCalc.restorable(h, prog)) throw S.E(409, "mk_restore_window");
                ObjectNode r = S.doRestore(k, u, email(a), get(b, "reason"), prog); MarketServiceImpl.WS W = S.walletState(k); S.log(tid(a), email(a), "market.restore", map("contract", s(k, "id"), "use", s(u, "id"), "credits", g(u, "credits")));
                ObjectNode o = O().put("ok", true); ObjectNode us = o.putObject("use"); us.set("id", g(r, "id")); us.put("kind", "restore"); us.set("credits", g(r, "credits")); us.put("restoreOf", s(u, "id")); o.set("wallet", W.wallet); o.put("balance", W.balance); return o; }); }); });
        S.p("POST", "^/api/market/contracts/(mk_[a-z0-9]{12})/dispute$", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); JsonNode b = body(raw); return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], false); if (!s(k, "buyer_tid").equals(tid(a))) throw S.E(404, "contract", "없는 계약입니다.");
            ObjectNode u = db.q1("select id from mk_credit_use where id = $1 and contract_id = $2 and kind = 'use' and not restored", str(get(b, "useId"), 20), s(k, "id")); if (u == null) throw S.E(404, "use", "없는 차감 기록입니다.");
            ObjectNode d = db.q1("insert into mk_dispute (id, kind, ref, from_tid, body) values ($1,'restore',$2,$3,$4) returning *", rid("md_"), s(u, "id"), tid(a), str(get(b, "reason"), 500)); ObjectNode o = O().put("ok", true); o.set("dispute", d); return o; }); });
        /* 구매 기관 이의 신청(정운영자만, RLS로 자기 계약만): kind restore(useId 필수) · contract */
        S.p("POST", "^/api/market/contracts/(mk_[a-z0-9]{12})/disputes$", (req, res, raw, p) -> { Map<String, Object> a = S.needOwner(req); JsonNode b = body(raw); return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], false); if (!s(k, "buyer_tid").equals(tid(a))) throw S.E(404, "contract", "없는 계약입니다.");
            String kind = "contract".equals(S0(get(b, "kind"))) ? "contract" : "restore"; String reason = trim(str(get(b, "reason"), 500)); if (reason.isEmpty()) throw S.E(400, "reason", "이의 사유를 입력하십시오.");
            return S.idem(tid(a), "disputes:" + p[0], get(b, "idem"), () -> { String ref = s(k, "id");
                if ("restore".equals(kind)) { ObjectNode u = db.q1("select id from mk_credit_use where id = $1 and contract_id = $2 and kind = 'use' and not restored", str(get(b, "useId"), 20), s(k, "id")); if (u == null) throw S.E(404, "use", "없는 차감 기록입니다."); ref = s(u, "id");
                    if (db.q1("select 1 from mk_dispute where ref = $1 and status = 'open'", ref) != null) throw S.E(409, "mk_dispute_open", "이미 처리 중인 이의 신청이 있습니다."); }
                ObjectNode d = db.q1("insert into mk_dispute (id, kind, ref, from_tid, body) values ($1,$2,$3,$4,$5) returning *", rid("md_"), kind, ref, tid(a), reason);
                S.log(tid(a), email(a), "market.dispute", map("contract", s(k, "id"), "kind", kind, "ref", ref)); ObjectNode o = O().put("ok", true); ObjectNode dd = o.putObject("dispute"); dd.set("id", g(d, "id")); dd.put("kind", kind).put("ref", ref); dd.set("status", g(d, "status")); dd.set("at", g(d, "at")); return o; }); }); });
        S.p("GET", "^/api/market/contracts/(mk_[a-z0-9]{12})/disputes$", (req, res, raw, p) -> { Map<String, Object> a = S.needStaff(req); return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], false); List<String> uses = new ArrayList<>(); for (ObjectNode r : db.q("select id from mk_credit_use where contract_id = $1", s(k, "id"))) uses.add(s(r, "id"));
            ObjectNode o = O(); ArrayNode it = o.putArray("items"); for (ObjectNode d : db.q("select id, kind, ref, status, memo, at, decided_at from mk_dispute where from_tid = $1 and (ref = $2 or ref = any($3)) order by at desc", s(k, "buyer_tid"), s(k, "id"), uses)) it.add(d); return o; }); });
        S.p("POST", "^/api/market/contracts/(mk_[a-z0-9]{12})/topup$", (req, res, raw, p) -> { Map<String, Object> a = S.needOwner(req); JsonNode b = body(raw); S.needPaid(tid(a));
            return S.T(() -> { S.needPilot(tid(a)); ObjectNode k = S.contractOf(a, p[0], false); if (!s(k, "buyer_tid").equals(tid(a)) || !List.of("active", "carry").contains(s(k, "status"))) throw S.E(409, "mk_contract_state", "이용 중인 계약만 추가 구매할 수 있습니다.");
                return S.idem(tid(a), "topup", get(b, "idem"), () -> { ObjectNode in = O(); ObjectNode inp = in.putObject("input"); inp.set("budget", undef(get(b, "amount")) ? F.missingNode() : get(b, "amount")); if (undef(get(b, "amount"))) inp.remove("budget"); inp.set("collections", g(k, "collections")); inp.put("topupOf", s(k, "id"));
                    ObjectNode o = O().put("ok", true); o.set("quote", quoteOut(S.creditQuote(tid(a), in, email(a), false), false)); return o; }); }); });
        S.p("POST", "^/api/market/contracts/(mk_[a-z0-9]{12})/refund$", (req, res, raw, p) -> { JsonNode b = body(raw); final boolean santaCause = "santa".equals(S(get(b, "cause"))); Map<String, Object> a = santaCause ? S.needSanta(req) : S.needOwner(req); /* 산타 귀책은 산타 운영자만 */
            return S.T(() -> { ObjectNode k = S.contractOf(a, p[0], true); if (!santaCause && !s(k, "buyer_tid").equals(tid(a))) throw S.E(404, "contract", "없는 계약입니다."); return S.idem(tid(a), "refund", get(b, "idem"), () -> {
                if (!List.of("active", "carry").contains(s(k, "status")) || (truthy(g(k, "refund")) && "confirmed".equals(S(get(g(k, "refund"), "status"))))) throw S.E(409, "mk_refund_state", "이용 중인 계약만 해지 · 환불을 요청할 수 있습니다."); /* QA5(v49) */
                List<ObjectNode> all = S.lotsOf(s(k, "id")); long used = n(db.q1("select coalesce(sum(credits), 0)::int n from mk_credit_use where contract_id = $1 and kind = 'use' and not restored", s(k, "id")), "n");
                ArrayNode L = F.arrayNode(); for (ObjectNode l : all) L.addObject().put("lot", s(l, "lot")).put("credits", n(l, "credits")).put("remain", n(l, "remain")).put("validTo", s(l, "vt"));
                String cause = santaCause ? "santa" : "buyer"; JsonNode T0 = truthy(g(k, "terms")) ? g(k, "terms") : O();
                ObjectNode op = O().put("start", s(k, "s")).put("usedTotal", used).put("cause", cause).put("buyerMode", s(k, "buyer_mode")); if (!nullish(get(T0, "penaltyBp"))) op.set("penaltyBp", get(T0, "penaltyBp"));
                ObjectNode R = DdMarketCalc.refundOf(L, today(), op);
                ObjectNode refund = O().put("rule", "mk-refund-v2").put("mode", R.get("mode").asText()).put("cause", cause).put("paidUnused", R.get("paidUnused").asLong()).put("bonusUsed", R.get("bonusUsed").asLong()).put("penalty", R.get("penalty").asLong()).put("amount", R.get("amount").asLong());
                refund.put("reason", str(get(b, "reason"), 300)).put("status", "requested").put("at", isoNow());
                JsonNode TX0 = g(k, "tax"); JsonNode fix = truthy(TX0) && refund.get("amount").asLong() > 0 ? DdMarketCalc.taxFixOf(TX0, refund.get("amount").asLong() + refund.get("penalty").asLong(), today()) /* policy v1.3 제46조의2 제3항: 환불 대상 전액(위약금 포함) 감액 */ : F.nullNode();
                if (!fix.isNull()) { refund.set("taxFix", fix); ObjectNode T1 = ((ObjectNode) TX0).deepCopy(); ArrayNode fx = F.arrayNode(); for (JsonNode x : arr(get(TX0, "fixes"))) if (!"wait".equals(S(get(x, "status")))) fx.add(x); fx.add(fix); T1.set("fixes", fx);
                    db.x("update mk_contract set refund = $2, tax = $3::jsonb where id = $1", s(k, "id"), refund.toString(), T1.toString()); }
                else db.x("update mk_contract set refund = $2 where id = $1", s(k, "id"), refund.toString()); S.log(s(k, "buyer_tid"), email(a), "market.refund", map("contract", s(k, "id"), "amount", refund.get("amount").asLong(), "cause", cause));
                ObjectNode o = O().put("ok", true); o.set("refund", refund); o.put("status", "requested"); return o; }); }); });
        /* QA5(v49) 해지 · 환불 확정(산타 운영) — Node routes.js refund/confirm과 같음(policy v1.3 제40조 제5항 · 제46조의2 제3항) */
        S.p("POST", "^/api/market/contracts/(mk_[a-z0-9]{12})/refund/confirm$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "refund-confirm:" + p[0], get(b, "idem"), () -> { ObjectNode k = S.contractOf(a, p[0], true); JsonNode RQ = truthy(g(k, "refund")) ? g(k, "refund") : O();
                if (!"requested".equals(S(get(RQ, "status")))) throw S.E(409, "mk_refund_state", "해지 · 환불 요청이 없거나 이미 처리한 계약입니다.");
                List<ObjectNode> all = S.lotsOf(s(k, "id")); long used = n(db.q1("select coalesce(sum(credits), 0)::int n from mk_credit_use where contract_id = $1 and kind = 'use' and not restored", s(k, "id")), "n"); String day = today();
                ArrayNode L = F.arrayNode(); for (ObjectNode l : all) L.addObject().put("lot", s(l, "lot")).put("credits", n(l, "credits")).put("remain", n(l, "remain")).put("validTo", s(l, "vt"));
                JsonNode T0 = truthy(g(k, "terms")) ? g(k, "terms") : O(); ObjectNode op = O().put("start", s(k, "s")).put("usedTotal", used).put("cause", "santa".equals(S(get(RQ, "cause"))) ? "santa" : "buyer").put("buyerMode", s(k, "buyer_mode")); if (!nullish(get(T0, "penaltyBp"))) op.set("penaltyBp", get(T0, "penaltyBp"));
                ObjectNode R = DdMarketCalc.refundOf(L, day, op); long amount = R.get("amount").asLong(), penalty = R.get("penalty").asLong(); long rem = amount > 0 ? amount + penalty : 0;
                JsonNode TX0 = g(k, "tax"); JsonNode fix = truthy(TX0) && rem > 0 ? DdMarketCalc.taxFixOf(TX0, rem, day) : F.nullNode(); if (!fix.isNull()) rem += fix.get("supply").asLong();
                ArrayNode tops = F.arrayNode(); for (ObjectNode tp : db.q("select * from mk_contract where renew_of = $1 and status = 'merged' order by at", s(k, "id"))) { if (rem <= 0) break; /* 추가 구매분 세금계산서는 원 계약 다음에 감액 */
                    JsonNode t0 = truthy(g(tp, "tax")) ? g(tp, "tax") : DdMarketCalc.taxOf(n(tp, "supply_total"), 0, MarketServiceImpl.kstDay(g(tp, "at"))); JsonNode f = DdMarketCalc.taxFixOf(t0, rem, day); if (f.isNull()) continue; rem += f.get("supply").asLong();
                    ObjectNode tf = O().put("contract", s(tp, "id")); tf.setAll((ObjectNode) f); tops.add(tf); ObjectNode T1 = ((ObjectNode) t0).deepCopy(); ArrayNode fx = F.arrayNode(); for (JsonNode x : arr(get(t0, "fixes"))) if (!"wait".equals(S(get(x, "status")))) fx.add(x); fx.add(f); T1.set("fixes", fx);
                    db.x("update mk_contract set tax = $2::jsonb where id = $1", s(tp, "id"), T1.toString()); }
                ObjectNode refund = ((ObjectNode) RQ).deepCopy(); refund.put("mode", R.get("mode").asText()).put("paidUnused", R.get("paidUnused").asLong()).put("bonusUsed", R.get("bonusUsed").asLong()).put("penalty", penalty).put("amount", amount)
                    .put("status", "confirmed").put("confirmedAt", isoNow()).put("confirmedBy", email(a)).put("memo", str(get(b, "memo"), 300)); refund.remove("taxFix"); if (!fix.isNull()) refund.set("taxFix", fix); if (tops.size() > 0) refund.set("taxFixTopups", tops);
                db.x("update mk_credit_wallet set remain = 0 where contract_id = $1", s(k, "id"));
                if (truthy(TX0)) { ObjectNode T1 = ((ObjectNode) TX0).deepCopy(); ArrayNode fx = F.arrayNode(); for (JsonNode x : arr(get(TX0, "fixes"))) if (!"wait".equals(S(get(x, "status")))) fx.add(x); if (!fix.isNull()) fx.add(fix); T1.set("fixes", fx);
                    db.x("update mk_contract set status = 'cancelled', refund = $2::jsonb, tax = $3::jsonb where id = $1", s(k, "id"), refund.toString(), T1.toString()); }
                else db.x("update mk_contract set status = 'cancelled', refund = $2::jsonb where id = $1", s(k, "id"), refund.toString());
                db.x("insert into mk_entry (kind, contract_id, party_tid, credits, amount, ref) values ('credit_refund', $1, $2, $3, $4, $5)", s(k, "id"), s(k, "buyer_tid"), R.get("paidUnused").asLong(), -amount, day);
                S.log(s(k, "buyer_tid"), email(a), "market.refund_confirm", map("contract", s(k, "id"), "amount", amount, "penalty", penalty, "mode", R.get("mode").asText()));
                ObjectNode o = O().put("ok", true); o.set("refund", refund); o.put("status", "cancelled"); return o; })); });
        S.p("POST", "^/api/market/contracts/(mk_[a-z0-9]{12})/activate$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "activate:" + p[0], get(b, "idem"), () -> { ObjectNode k = S.contractOf(a, p[0], true); ObjectNode out = S.activate(k, b); S.log(s(k, "buyer_tid"), email(a), "market.activate", map("contract", p[0])); ObjectNode o = O().put("ok", true); o.setAll(out); return o; })); });
        /* CP 상품 */
        S.p("POST", "^/api/market/cp/products/(mp_[a-z0-9]{12})/submit$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { ObjectNode r = S.prod(p[0], "9999-12-31"); if (r == null || !s(r, "owner_tid").equals(tid(a))) throw S.E(404, "product", "없는 상품입니다.");
            if (!List.of("draft", "needs_fix").contains(s(r, "status"))) throw S.E(409, "mk_review_state", "이미 제출한 상품입니다.");
            List<String> failed = new ArrayList<>(); if (!truthy(g(r, "title"))) failed.add("title"); if (!(num(g(r, "hours_x10")) > 0)) failed.add("hours"); if (!truthy(g(r, "list_price"))) failed.add("price"); if (!failed.isEmpty()) throw S.E(422, "mk_check", null, map("failed", failed));
            db.x("update mk_product set status = 'in_review' where id = $1", p[0]); ObjectNode o = O().put("ok", true); o.putObject("product").put("id", p[0]).put("status", "in_review"); return o; }); });
        S.p("PUT", "^/api/market/cp/products/(mp_[a-z0-9]{12})/price$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); JsonNode b = body(raw); String id = p[0]; return S.T(() -> {
            ObjectNode r = db.q1("select * from mk_product where id = $1 for update", id); if (r == null || !s(r, "owner_tid").equals(tid(a))) throw S.E(404, "product", "없는 상품입니다.");
            double lp = I(get(b, "listPrice")); if (!(lp > 0 && lp <= 100000000)) throw S.E(400, "price", "정가를 확인하십시오.");
            Double fl = nullish(get(b, "floorPrice")) || (get(b, "floorPrice").isTextual() && get(b, "floorPrice").textValue().isEmpty()) ? null : I(get(b, "floorPrice")); if (fl != null && (!(fl >= 0) || fl > lp)) throw S.E(422, "mk_floor");
            ArrayNode vol = F.arrayNode(); boolean bad = false; int vi = 0; for (JsonNode v : arr(get(b, "volRules"))) { if (vi++ >= 5) break; double f = I(get(v, "fromN")), o0 = I(get(v, "offBp")); ObjectNode x = vol.addObject(); x.set("fromN", numNode(f)); x.set("offBp", numNode(o0)); if (!(f >= 2) || !(o0 > 0 && o0 <= 5000)) bad = true; }
            if (bad) throw S.E(400, "vol", "수량 할인은 2번째 수강 이상 · 50% 이내로 입력하십시오.");
            List<String> lic = new ArrayList<>(); lic.add("stream"); if (get(b, "lic") != null && get(b, "lic").isArray()) { for (JsonNode x : get(b, "lic")) if (x.isTextual() && LIC.contains(x.asText()) && !lic.contains(x.asText())) lic.add(x.asText()); }
            ObjectNode add = O(); for (String kk : new String[]{ "lms_export", "adapt" }) if (!nullish(get(get(b, "licAdd"), kk))) { double d = I(get(get(b, "licAdd"), kk)); add.put(kk, (long) Math.max(0, Math.min(10000, Double.isNaN(d) ? 0 : d))); }
            List<ObjectNode> H = S.priceRows(id); String day = today(); ObjectNode cur = priceNow(H, day);
            String eff = cur != null ? DdMarketCalc.effectiveFrom(day) : day; long L = (long) lp;
            if (cur != null && L > n(cur, "list_price")) { int ups = 0; for (int i = 1; i < H.size(); i++) { ObjectNode h = H.get(i); if (s(h, "ef").compareTo(day) <= 0 && n(h, "list_price") > n(H.get(i - 1), "list_price") && qtr(kstDay(g(h, "requested_at"))).equals(qtr(day))) ups++; }
                if (L * 10 > n(cur, "list_price") * 13 || ups > 0) throw S.E(422, "mk_price_step"); }
            db.x("delete from mk_price where product_id = $1 and effective_from > $2::date", id, day);
            Object b2c = nullish(get(b, "b2cPriceVat")) ? null : (Object) (Double.isNaN(I(get(b, "b2cPriceVat"))) || I(get(b, "b2cPriceVat")) == 0 ? null : (long) I(get(b, "b2cPriceVat")));
            ObjectNode row = db.q1("insert into mk_price (product_id, list_price, credits, vol_rules, floor_price, lic_allowed, lic_add_bp, b2c_price_vat, effective_from, by_email) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *, to_char(effective_from, 'YYYY-MM-DD') ef",
                id, L, DdMarketCalc.credits(L), vol.toString(), fl == null ? null : (Object) fl.longValue(), lic, add.toString(), b2c, eff, email(a));
            ObjectNode o = O().put("ok", true); o.set("price", po(row)); o.set("current", po(cur != null ? cur : row)); return o; }); });
        S.p("GET", "^/api/market/cp/products/(mp_[a-z0-9]{12})/price-history$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { ObjectNode r = db.q1("select owner_tid from mk_product where id = $1", p[0]); if (r == null || !s(r, "owner_tid").equals(tid(a))) throw S.E(404, "product", "없는 상품입니다.");
            ObjectNode o = O(); ArrayNode it = o.putArray("items"); for (ObjectNode h : S.priceRows(p[0])) it.add(cp(h, "effectiveFrom", "ef", "listPrice", "list_price", "credits", "credits", "volRules", "vol_rules")); return o; }); });
        S.p("PUT", "^/api/market/cp/products/(mp_[a-z0-9]{12})/optin$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); if (!owner(a)) throw S.E(403, "role", "정운영자만 바꿀 수 있습니다."); JsonNode b = body(raw); String id = p[0];
            return S.T(() -> S.idem(tid(a), "optin:" + id, get(b, "idem"), () -> { String day = today(); ObjectNode r = S.prod(id, day); if (r == null || !s(r, "owner_tid").equals(tid(a))) throw S.E(404, "product", "없는 상품입니다.");
                String mode = List.of("credit", "single", "single_until").contains(S0(get(b, "mode"))) && get(b, "mode").isTextual() ? get(b, "mode").asText() : null; if (mode == null) throw S.E(400, "mode", "참여 방식을 고르십시오.");
                double sm = I(get(b, "singleMonths")); Long months = "single_until".equals(mode) ? Math.max(1, Math.min(24, Double.isNaN(sm) ? 0 : (long) sm)) : null; if ("single_until".equals(mode) && !(sm > 0)) throw S.E(400, "months", "개별 전용 개월 수를 입력하십시오.");
                String cur = modeOf(r, day); List<ObjectNode> act = S.activeOf(id); String mu = s(r, "mu");
                if ("single".equals(mode) && "credit".equals(cur) && mu != null && !mu.isEmpty() && day.compareTo(mu) < 0 && !truthy(get(b, "confirm"))) throw S.E(409, "mk_optin_min", "최소 참여 기간(" + mu + "까지) 안의 철회입니다. 새 기관에는 바로 보이지 않고, 이미 이용 중인 " + act.size() + "곳은 계약 기간 끝까지 계속 이용합니다.", map("minUntil", mu, "activeContracts", act.size()));
                String from = "credit".equals(mode) ? ("credit".equals(cur) && truthy(g(r, "cf")) ? s(r, "cf") : day) : "single_until".equals(mode) ? DdMarketCalc.eligibleFrom(truthy(g(r, "la")) ? s(r, "la") : day, months) : null;
                boolean wd = "single".equals(mode) && "credit".equals(cur);
                ObjectNode row = db.q1("insert into mk_optin (product_id, mode, single_months, credit_from, min_until, withdrawn_at, by_email) values ($1,$2,$3,$4,$5," + (wd ? "now()" : "$6") + ",$7) returning *, to_char(credit_from, 'YYYY-MM-DD') cf, to_char(min_until, 'YYYY-MM-DD') mu",
                    id, mode, months, from, from != null ? DdMarketCalc.optinMinEnd(from) : null, null, email(a));
                if (wd) S.log(tid(a), email(a), "market.optin.withdraw", map("product", id, "activeContracts", act.size()));
                ObjectNode o = O().put("ok", true); ObjectNode oi = o.putObject("optin"); oi.set("mode", g(row, "mode")); oi.set("creditFrom", g(row, "cf")); oi.set("singleMonths", g(row, "single_months")); o.set("minUntil", g(row, "mu"));
                ObjectNode im = o.putObject("impact").put("activeContracts", act.size()); ArrayNode ku = im.putArray("keepUntil"); for (ObjectNode x : act) ku.add(g(x, "ce")); return o; })); });
        S.p("GET", "^/api/market/cp/statements/(ms_[a-z0-9]{12})$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { ObjectNode s0 = db.q1("select * from mk_stmt where id = $1 and cp_tid = $2", p[0], tid(a)); if (s0 == null) throw S.E(404, "stmt", "없는 정산서입니다."); ObjectNode o = O(); o.set("stmt", MkSettle.stmtOut(s0)); return o; }); });
        S.p("POST", "^/api/market/cp/statements/(ms_[a-z0-9]{12})/dispute$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); JsonNode b = body(raw); return S.T(() -> {
            ObjectNode s0 = db.q1("update mk_stmt set status = 'disputed' where id = $1 and cp_tid = $2 and status = 'draft' returning *", p[0], tid(a)); if (s0 == null) throw S.E(409, "mk_stmt_state", "초안 정산서만 이의 신청할 수 있습니다.");
            db.x("insert into mk_dispute (id, kind, ref, from_tid, body) values ($1,'stmt',$2,$3,$4)", rid("md_"), p[0], tid(a), str(get(b, "reason"), 500)); ObjectNode o = O().put("ok", true); o.set("stmt", MkSettle.stmtOut(s0)); return o; }); });
        S.p("DELETE", "^/api/market/cp/promos/(mpr_[a-z0-9]{12})$", (req, res, raw, p) -> { Map<String, Object> a = S.needCp(req); return S.T(() -> { ObjectNode x0 = db.q1("select * from mk_promo where id = $1 and cp_tid = $2 for update", p[0], tid(a)); if (x0 == null) throw S.E(404, "promo", "없는 신청입니다.");
            if (!"asked".equals(s(x0, "status"))) throw S.E(409, "mk_promo_state"); ObjectNode x = db.q1("update mk_promo set status = 'cancelled' where id = $1 returning *", p[0]); ObjectNode o = O().put("ok", true); o.set("promo", S.promoOut(x)); return o; }); });
        /* 산타 운영 */
        S.p("POST", "^/api/market/ops/reviews/(mp_[a-z0-9]{12})/decide$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); String rs = List.of("listed", "needs_fix", "rejected", "suspended").contains(S0(get(b, "result"))) && get(b, "result").isTextual() ? get(b, "result").asText() : null; if (rs == null) throw S.E(400, "result", "심사 결과를 고르십시오.");
            return S.T(() -> { String memo = str(get(b, "memo"), 300); ObjectNode r = db.q1("update mk_product set status = $2, review_memo = $3 where id = $1 and status in ('in_review','submitted','listed','reported') returning id, status, owner_tid", p[0], rs, memo.isEmpty() ? null : memo); if (r == null) throw S.E(409, "mk_review_state", "심사할 수 없는 상태입니다.");
                S.log(s(r, "owner_tid"), email(a), "market.review", map("product", p[0], "result", rs)); ObjectNode o = O().put("ok", true); o.set("product", cp(r, "id", "id", "status", "status")); return o; }); });
        S.p("PUT", "^/api/market/ops/orgs/(tn_[a-z0-9]{8,16})/pilot$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); boolean on = get(b, "on") != null && get(b, "on").isBoolean() && get(b, "on").booleanValue(); String tid = p[0];
            if (!S.tenantExists(tid)) throw S.E(404, "tenant", "없는 기관입니다.");
            S.T(() -> db.x("insert into mk_party (tid, pilot, pilot_by, pilot_at) values ($1,$2,$3,now()) on conflict (tid) do update set pilot = $2, pilot_by = $3, pilot_at = now()", tid, on, email(a)));
            boolean doc = S.pilotDoc(tid, on); S.log(tid, email(a), "market.pilot", map("on", on)); return O().put("ok", true).put("tid", tid).put("pilot", on).put("doc", doc); });
        S.p("PUT", "^/api/market/ops/parties/(tn_[a-z0-9]{8,16})$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); String kind = List.of("buyer", "seller", "cp", "santa").contains(S0(get(b, "kind"))) && get(b, "kind").isTextual() ? get(b, "kind").asText() : "buyer"; String tid = p[0];
            if (!S.tenantExists(tid)) throw S.E(404, "tenant", "없는 기관입니다."); String cn = str(get(b, "cpName"), 60); boolean act = !(get(b, "active") != null && get(b, "active").isBoolean() && !get(b, "active").booleanValue());
            ObjectNode r = S.T(() -> db.q1("insert into mk_party (tid, kind, cp_name, active) values ($1,$2,$3,$4) on conflict (tid) do update set kind = $2, cp_name = coalesce($3, mk_party.cp_name), active = $4 returning tid, kind, cp_name, active, pilot", tid, kind, cn.isEmpty() ? null : cn, act));
            S.log(tid, email(a), "market.party", map("kind", kind)); ObjectNode o = O().put("ok", true); o.set("party", cp(r, "tid", "tid", "kind", "kind", "cpName", "cp_name", "active", "active", "pilot", "pilot")); return o; });
        S.p("PUT", "^/api/market/ops/cp-rates/(tn_[a-z0-9]{8,16})$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); String tid = p[0];
            Long bp0 = truthy(get(b, "rateKind")) ? DdMarketCalc.RATE.get(egovframework.didisam.cmm.Js.str(get(b, "rateKind"))) : (Double.isNaN(I(get(b, "cpBp"))) ? null : (long) I(get(b, "cpBp")));
            if (bp0 == null || DdMarketCalc.rateCheck(bp0, nullish(get(b, "agreeRef")) ? null : egovframework.didisam.cmm.Js.str(get(b, "agreeRef"))) != null) throw S.E(422, "mk_cp_rate"); long bp = bp0;
            return S.T(() -> { ObjectNode pa = S.party(tid); if (!isCp(pa)) throw S.E(404, "mk_cp"); return S.idem(tid(a), "cp-rate:" + tid, get(b, "idem"), () -> { String eff = DdMarketCalc.nextMonth1(today());
                db.x("delete from mk_cp_rate where cp_tid = $1 and effective_from > $2::date", tid, today()); String memo = str(get(b, "memo"), 300);
                ObjectNode r = db.q1("insert into mk_cp_rate (cp_tid, rate_kind, cp_bp, effective_from, agree_ref, memo, by_email) values ($1,$2,$3,$4,$5,$6,$7) returning *, to_char(effective_from, 'YYYY-MM-DD') ef", tid, DdMarketCalc.rateKindOf(bp), bp, eff, trim(str(get(b, "agreeRef"), 80)), memo.isEmpty() ? null : memo, email(a));
                S.log(tid, email(a), "market.cp_rate", map("cpBp", bp, "effectiveFrom", eff)); ObjectNode o = O().put("ok", true); o.set("rate", cp(r, "rateKind", "rate_kind", "cpBp", "cp_bp", "effectiveFrom", "ef")); return o; }); }); });
        S.p("POST", "^/api/market/ops/promos/(mpr_[a-z0-9]{12})/decide$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); return S.T(() -> { ObjectNode x0 = db.q1("select * from mk_promo where id = $1 for update", p[0]); if (x0 == null) throw S.E(404, "promo", "없는 신청입니다.");
            if (!"asked".equals(s(x0, "status"))) throw S.E(409, "mk_promo_state");
            if (truthy(get(b, "ok"))) { db.q("select pg_advisory_xact_lock(hashtext($1))", "mk_promo:" + s(x0, "ym") + ":" + s(x0, "slot")); long cnt = n(db.q1("select count(*)::int n from mk_promo where ym = $1 and slot = $2 and status = 'ok'", s(x0, "ym"), s(x0, "slot")), "n"); if (cnt >= DdMarketCalc.SLOT.get(s(x0, "slot"))[0]) throw S.E(409, "mk_promo_full"); }
            String memo = str(get(b, "memo"), 200); ObjectNode x = db.q1("update mk_promo set status = $2, memo = $3, decided_by = $4 where id = $1 returning *", p[0], truthy(get(b, "ok")) ? "ok" : "no", memo.isEmpty() ? null : memo, email(a)); ObjectNode o = O().put("ok", true); o.set("promo", S.promoOut(x)); return o; }); });
        S.p("POST", "^/api/market/ops/disputes/(md_[a-z0-9]{12})/decide$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); return S.T(() -> { ObjectNode d = db.q1("select * from mk_dispute where id = $1 and status = 'open' for update", p[0]); if (d == null) throw S.E(409, "mk_dispute_state", "이미 처리한 이의 신청입니다.");
            if (truthy(get(b, "accept")) && "restore".equals(s(d, "kind"))) { ObjectNode u = db.q1("select * from mk_credit_use where id = $1 and kind = 'use' and not restored for update", s(d, "ref")); if (u != null) { ObjectNode k = S.contractOf(a, s(u, "contract_id"), true); S.doRestore(k, u, email(a), t("분쟁 승인: " + str(get(b, "memo"), 150)), null); } }
            if ("stmt".equals(s(d, "kind"))) db.x("update mk_stmt set status = 'draft' where id = $1 and status = 'disputed'", s(d, "ref"));
            String memo = str(get(b, "memo"), 300); ObjectNode x = db.q1("update mk_dispute set status = $2, memo = $3, decided_by = $4, decided_at = now() where id = $1 returning *", p[0], truthy(get(b, "accept")) ? "accepted" : "rejected", memo.isEmpty() ? null : memo, email(a)); ObjectNode o = O().put("ok", true); o.set("dispute", x); return o; }); });
        S.p("POST", "^/api/market/settle/close/(mz_[a-z0-9]{12})/confirm$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); return S.settle().confirm(p[0], email(a)); });
    }
    static String h(JsonNode v) { String x = nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v); return x.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;"); }
    static String won(JsonNode v) { double d = nullish(v) ? 0 : num(v); if (Double.isNaN(d)) d = 0; return String.format(java.util.Locale.ROOT, "%,d", (long) d); }
    static String S0(JsonNode v) { return v != null && v.isTextual() ? v.textValue() : ""; }
    static String qtr(String d) { return d.substring(0, 4) + "-" + (Integer.parseInt(d.substring(5, 7)) - 1) / 3; }
    static JsonNode po(JsonNode x) { return x == null ? F.nullNode() : cp(x, "effectiveFrom", "ef", "listPrice", "list_price", "credits", "credits", "volRules", "vol_rules", "floorPrice", "floor_price", "lic", "lic_allowed", "licAdd", "lic_add_bp"); }
}
