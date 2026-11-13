package egovframework.didisam.ledger.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import static egovframework.didisam.cmm.Js.*;

/** v41 통합 수납 원장 계산 — didisam/ledgercalc.js(09 규격 4절)를 그대로 옮긴 것. 기준값 tests/ledger-vectors.json으로 Node · 브라우저와 같은 결과를 확인한다.
 *  금액은 원 단위 정수. 환불 비율 계산은 10원 미만 내림, PG 쉐어는 원 단위 내림. 정렬(오래된 순): due(없으면 '9999-12-31') → at → id. */
public final class DdLedgerCalc {
    private DdLedgerCalc() { }

    /** JS int(v) = Math.round(+v), NaN이면 0 */
    public static long I(JsonNode v) { double n = round(num(v)); return Double.isNaN(n) || Double.isInfinite(n) ? 0 : (long) n; }
    public static long floor10(double n) { return (long) (Math.floor(Math.max(0, n) / 10) * 10); }
    static String sOr(JsonNode v, String d) { return truthy(v) ? str(v) : d; }
    /** String(v) — undefined는 "undefined" */
    static String S0(JsonNode v) { return undef(v) ? "undefined" : str(v); }
    public static final Comparator<JsonNode> ORD = (a, b) -> {
        int c = sOr(get(a, "due"), "9999-12-31").compareTo(sOr(get(b, "due"), "9999-12-31")); if (c != 0) return Integer.signum(c);
        c = sOr(get(a, "at"), "").compareTo(sOr(get(b, "at"), "")); if (c != 0) return Integer.signum(c);
        return Integer.signum(S0(get(a, "id")).compareTo(S0(get(b, "id"))));
    };
    static boolean isVoid(JsonNode c) { return strictEq(get(c, "status"), "void"); }
    static List<JsonNode> live(JsonNode charges) { List<JsonNode> l = new ArrayList<>(); for (JsonNode c : arr(charges)) if (truthy(c) && !isVoid(c)) l.add(c); return l; }

    /** 줄별 실제 낼 금액: 같은 bill의 할인(음수 합)을 양수 줄에 정렬 순서대로 먼저 깎는다. void 줄은 빠진다 */
    public static Map<String, Long> dueOf(JsonNode charges) {
        Map<String, Long> out = new LinkedHashMap<>(); Map<String, List<JsonNode>> bills = new LinkedHashMap<>();
        for (JsonNode c : live(charges)) bills.computeIfAbsent(truthy(get(c, "bill")) ? str(get(c, "bill")) : S0(get(c, "id")), k -> new ArrayList<>()).add(c);
        for (List<JsonNode> L0 : bills.values()) {
            List<JsonNode> L = new ArrayList<>(L0); L.sort(ORD); long disc = 0; for (JsonNode c : L) if (I(get(c, "amount")) < 0) disc += I(get(c, "amount")); disc = -disc;
            for (JsonNode c : L) { long a = I(get(c, "amount")); if (a <= 0) { out.put(S0(get(c, "id")), 0L); continue; } long d = Math.min(a, disc); disc -= d; out.put(S0(get(c, "id")), a - d); }
        }
        return out;
    }

    /** balance(charges, allocs) → {lines:[{id,bill,due,paid,balance,status}], total, paid, balance} */
    public static ObjectNode balance(JsonNode charges, JsonNode allocs) {
        Map<String, Long> D = dueOf(charges), P = new LinkedHashMap<>();
        for (JsonNode a : arr(allocs)) if (truthy(a) && !nullish(get(a, "charge"))) P.merge(str(get(a, "charge")), I(get(a, "amount")), Long::sum);
        List<JsonNode> lv = live(charges); lv.sort(ORD);
        List<ObjectNode> lines = new ArrayList<>();
        for (JsonNode c : lv) { String id = S0(get(c, "id")); long due = D.getOrDefault(id, 0L), paid = Math.max(0, P.getOrDefault(id, 0L)), bal = Math.max(0, due - paid);
            ObjectNode l = F.objectNode(); l.set("id", get(c, "id") == null ? F.nullNode() : get(c, "id")); l.set("bill", truthy(get(c, "bill")) ? get(c, "bill") : get(c, "id"));
            l.put("due", due); l.put("paid", paid); l.put("balance", bal); l.put("status", bal == 0 ? "paid" : paid > 0 ? "partial" : "open"); lines.add(l); }
        Map<String, long[]> byBill = new LinkedHashMap<>();
        for (ObjectNode l : lines) if (l.get("due").asLong() > 0) { long[] b = byBill.computeIfAbsent(str(l.get("bill")), k -> new long[3]); b[0] += l.get("due").asLong(); b[1] += l.get("balance").asLong(); b[2] += l.get("paid").asLong(); }
        for (ObjectNode l : lines) if (l.get("due").asLong() == 0) { long[] b = byBill.get(str(l.get("bill"))); l.put("status", b == null || b[1] == 0 ? "paid" : b[2] > 0 ? "partial" : "open"); }
        long total = 0, paid = 0; for (ObjectNode l : lines) { total += l.get("due").asLong(); paid += Math.min(l.get("paid").asLong(), l.get("due").asLong()); }
        ObjectNode o = F.objectNode(); o.set("lines", arrNode(lines)); o.put("total", total); o.put("paid", paid); o.put("balance", total - paid); return o;
    }

    /** allocate(receiptAmount, openCharges) → {allocs:[{charge, amount}], rest} — rest > 0 이면 잔액 초과 */
    public static ObjectNode allocate(long receiptAmount, JsonNode openCharges) {
        long left = receiptAmount; ArrayNode allocs = F.arrayNode(); List<JsonNode> L = new ArrayList<>();
        for (JsonNode x : arr(openCharges)) if (truthy(x) && I(get(x, "balance")) > 0) L.add(x); L.sort(ORD);
        for (JsonNode c : L) { if (left <= 0) break; long a = Math.min(left, I(get(c, "balance"))); ObjectNode z = allocs.addObject(); z.set("charge", get(c, "id")); z.put("amount", a); left -= a; }
        ObjectNode o = F.objectNode(); o.set("allocs", allocs); o.put("rest", left); return o;
    }

    /** 단위 트리: 자신 + 하위 전부(rollup) */
    public static Set<String> unitScope(String unit, JsonNode units, boolean rollup) {
        if (unit == null || unit.isEmpty()) return null; Set<String> set = new HashSet<>(); set.add(unit); if (!rollup) return set;
        boolean grew = true; while (grew) { grew = false; for (JsonNode u : arr(units)) if (truthy(u) && truthy(get(u, "parent")) && set.contains(str(get(u, "parent"))) && !set.contains(S0(get(u, "id")))) { set.add(S0(get(u, "id"))); grew = true; } }
        return set;
    }

    static boolean kind(JsonNode r, String k) { return strictEq(get(r, "kind"), k); }
    static boolean st(JsonNode r, String s) { return strictEq(get(r, "status"), s); }
    static String unitOf(JsonNode r) { return S0(get(r, "unit")); }
    static void add(ObjectNode m, String k, long v) { m.put(k, (m.has(k) ? m.get(k).asLong() : 0) + v); }

    /** summary(rows, {from,to,unit,rollup,units}) — 대시보드 · 리포트의 모든 숫자 */
    public static ObjectNode summary(JsonNode rows, JsonNode opt) {
        String from = sOr(get(opt, "from"), null), to = sOr(get(opt, "to"), null); Set<String> U = unitScope(sOr(get(opt, "unit"), null), get(opt, "units"), truthy(get(opt, "rollup")));
        List<JsonNode> R = new ArrayList<>();
        for (JsonNode r : arr(rows)) { if (!truthy(r)) continue; String d = S0(get(r, "day")); if ((from == null || d.compareTo(from) >= 0) && (to == null || d.compareTo(to) <= 0) && (U == null || U.contains(unitOf(r)))) R.add(r); }
        long paid = 0, refund = 0, charged = 0, unpaid = 0; ObjectNode byMethod = F.objectNode(), byItem = F.objectNode(), byUnit = F.objectNode(); TreeMap<String, long[]> dm = new TreeMap<>();
        for (JsonNode r : R) if (kind(r, "receipt") && st(r, "paid")) { long a = I(get(r, "amount")); paid += a; add(byMethod, sOr(get(r, "method"), "etc"), a); }
        for (JsonNode r : R) if (kind(r, "charge") && !st(r, "void")) { long a = I(get(r, "amount")); charged += a; unpaid += Math.max(0, I(get(r, "balance"))); add(byItem, sOr(get(r, "itemType"), "etc"), a); }
        for (JsonNode r : R) if (kind(r, "receipt") && st(r, "paid")) add(byUnit, unitOf(r), I(get(r, "amount")));
        for (JsonNode r : R) if (kind(r, "refund") && st(r, "done")) { long a = I(get(r, "amount")); refund += a; add(byUnit, unitOf(r), -a); }
        for (JsonNode r : R) if (kind(r, "receipt") && st(r, "paid")) { long[] x = dm.computeIfAbsent(S0(get(r, "day")), k -> new long[3]); long a = I(get(r, "amount")); x[0] += a; x[2] += a; }
        for (JsonNode r : R) if (kind(r, "refund") && st(r, "done")) { long[] x = dm.computeIfAbsent(S0(get(r, "day")), k -> new long[3]); long a = I(get(r, "amount")); x[1] += a; x[2] -= a; }
        TreeMap<String, long[]> ud = new TreeMap<>(); /* 단위별 상세 [charged, paid, refund, net, unpaid] (unitId 문자열 순) */
        for (JsonNode r : R) if (kind(r, "charge") && !st(r, "void")) { long[] x = ud.computeIfAbsent(unitOf(r), k -> new long[5]); x[0] += I(get(r, "amount")); x[4] += Math.max(0, I(get(r, "balance"))); }
        for (JsonNode r : R) if (kind(r, "receipt") && st(r, "paid")) { long[] x = ud.computeIfAbsent(unitOf(r), k -> new long[5]); long a = I(get(r, "amount")); x[1] += a; x[3] += a; }
        for (JsonNode r : R) if (kind(r, "refund") && st(r, "done")) { long[] x = ud.computeIfAbsent(unitOf(r), k -> new long[5]); long a = I(get(r, "amount")); x[2] += a; x[3] -= a; }
        ArrayNode byUnitDetail = F.arrayNode(); for (Map.Entry<String, long[]> e : ud.entrySet()) { long[] x = e.getValue(); ObjectNode d = byUnitDetail.addObject(); d.put("unitId", e.getKey()); d.put("charged", x[0]); d.put("paid", x[1]); d.put("refund", x[2]); d.put("net", x[3]); d.put("unpaid", x[4]);
            d.set("collectRate", numNode(x[0] > 0 ? Math.floor((double) (x[0] - x[4]) * 1000 / x[0]) / 10 : 0)); }
        ArrayNode daily = F.arrayNode(); for (Map.Entry<String, long[]> e : dm.entrySet()) { ObjectNode d = daily.addObject(); d.put("day", e.getKey()); d.put("paid", e.getValue()[0]); d.put("refund", e.getValue()[1]); d.put("net", e.getValue()[2]); }
        double rate = charged > 0 ? Math.floor((double) (charged - unpaid) * 1000 / charged) / 10 : 0;
        ObjectNode sh = share(arrNode(R), get(opt, "units"));
        ObjectNode o = F.objectNode(); o.put("net", paid - refund); o.put("paid", paid); o.put("refund", refund); o.put("charged", charged); o.put("unpaid", unpaid); o.set("collectRate", numNode(rate));
        o.set("byMethod", byMethod); o.set("byItem", byItem); o.set("byUnit", byUnit); o.set("byUnitDetail", byUnitDetail); o.set("daily", daily);
        ObjectNode s = o.putObject("share"); s.set("eligible", sh.get("eligible")); s.set("estimate", sh.get("estimate")); return o;
    }

    /** share(rows, units) — 단위별 (쉐어 대상 수납 paid − 환불 done) × bp ÷ 10000, 단위별 원 단위 내림 후 합산(기본 40bp) */
    public static ObjectNode share(JsonNode rows, JsonNode units) {
        Map<String, Long> rate = new LinkedHashMap<>(); for (JsonNode u : arr(units)) if (truthy(u) && !nullish(get(u, "id"))) rate.put(str(get(u, "id")), nullish(get(u, "shareRateBp")) ? 40L : I(get(u, "shareRateBp")));
        TreeMap<String, Long> el = new TreeMap<>();
        for (JsonNode r : arr(rows)) { if (!truthy(r) || !truthy(get(r, "shareEligible"))) continue;
            if (kind(r, "receipt") && st(r, "paid")) el.merge(unitOf(r), I(get(r, "amount")), Long::sum);
            if (kind(r, "refund") && st(r, "done")) el.merge(unitOf(r), -I(get(r, "amount")), Long::sum); }
        ArrayNode list = F.arrayNode(); long E = 0, S = 0;
        for (Map.Entry<String, Long> x : el.entrySet()) { long e = Math.max(0, x.getValue()); long bp = rate.getOrDefault(x.getKey(), 40L); long est = (long) Math.floor((double) e * bp / 10000);
            ObjectNode u = list.addObject(); u.put("unit", x.getKey()); u.put("eligible", e); u.put("rateBp", bp); u.put("estimate", est); E += e; S += est; }
        ObjectNode o = F.objectNode(); o.set("units", list); o.put("eligible", E); o.put("estimate", S); return o;
    }

    /** refund({rule, paid, used, total, months, month, refunded, auto}) — 02 §3-1 → {auto, lines:[{label, amount}], lawCheck} */
    public static ObjectNode refund(JsonNode a) {
        String rule = truthy(get(a, "rule")) ? str(get(a, "rule")) : "manual"; long paid = Math.max(0, I(get(a, "paid"))); long cap = Math.max(0, paid - Math.max(0, I(get(a, "refunded"))));
        double u0 = num(get(a, "used")), t0 = num(get(a, "total")); double used = Math.max(0, Double.isNaN(u0) || u0 == 0 ? 0 : u0), total = Math.max(0, Double.isNaN(t0) || t0 == 0 ? 0 : t0);
        ArrayNode lines = F.arrayNode(); long auto; boolean lawCheck = false;
        switch (rule) {
            case "hakwon_law": case "lifelong_law": {
                lawCheck = true; JsonNode mv = get(a, "months"); long months = Math.max(1, I(truthy(mv) ? mv : F.numberNode(1))); JsonNode mo = get(a, "month");
                long m = Math.max(0, Math.min(months, nullish(mo) ? 1 : I(mo)));
                if (m == 0 || (m == 1 && used <= 0)) { auto = paid; line(lines, "시작 전 전액", paid); }
                else { long per = (long) Math.floor((double) paid / months); long amt = m == months ? paid - per * (months - 1) : per; Object[] cur = month1(amt, used, total);
                    line(lines, m + "개월 차 " + cur[1], (Long) cur[0]); auto = (Long) cur[0]; long rest = months - m; if (rest > 0) { long r2 = per * rest; line(lines, "남은 " + rest + "개월 전액", r2); auto += r2; } }
                break; }
            case "org_fault": case "remote": case "session": {
                long r = total > 0 ? floor10(paid * Math.max(0, total - used) / total) : paid; auto = r; line(lines, "remote".equals(rule) ? "수강분 공제" : "session".equals(rule) ? "잔여 회차" : "기관 사유 잔여분", r); break; }
            case "full": auto = paid; line(lines, "전액", paid); break;
            case "none": auto = 0; line(lines, "환불 없음", 0); break;
            case "book": lawCheck = true; auto = used > 0 ? 0 : paid; line(lines, used > 0 ? "사용 · 다운로드 후 반환 없음" : "미사용 전액", auto); break;
            case "facility": auto = nullish(get(a, "auto")) ? paid : Math.max(0, I(get(a, "auto"))); line(lines, "시설 규정", auto); break;
            default: auto = paid; line(lines, "직원 확인", paid);
        }
        if (auto > cap) { line(lines, "이미 환불한 금액 차감", cap - auto); auto = cap; }
        ObjectNode o = F.objectNode(); o.put("auto", auto); o.set("lines", lines); o.put("lawCheck", lawCheck); return o;
    }
    static Object[] month1(long amt, double used, double total) {
        if (used <= 0) return new Object[]{ amt, "시작 전 전액" }; if (total == 0) return new Object[]{ 0L, "총 시간 미입력" };
        if (used * 3 < total) return new Object[]{ floor10((double) amt * 2 / 3), "1/3 경과 전 2/3" }; if (used * 2 < total) return new Object[]{ floor10((double) amt / 2), "1/2 경과 전 1/2" };
        return new Object[]{ 0L, "1/2 경과 후 반환 없음" };
    }
    static void line(ArrayNode l, String label, long amount) { ObjectNode x = l.addObject(); x.put("label", label); x.put("amount", amount); }

    /** match(importRows, cands, {dayTol}) — 파일 가져오기 자동 대사 → {matched:[{row, id}], unmatched:[{row, reason}]} */
    public static ObjectNode match(JsonNode importRows, JsonNode cands, JsonNode opt) {
        Long tol = nullish(get(opt, "dayTol")) ? null : I(get(opt, "dayTol")); Set<String> used = new HashSet<>(); ArrayNode matched = F.arrayNode(), unmatched = F.arrayNode();
        List<JsonNode> C = new ArrayList<>(); for (JsonNode c : arr(cands)) if (truthy(c)) C.add(c);
        C.sort((a, b) -> { int x = Integer.signum(sOr(get(a, "day"), "").compareTo(sOr(get(b, "day"), ""))); return x != 0 ? x : Integer.signum(S0(get(a, "id")).compareTo(S0(get(b, "id")))); });
        List<JsonNode> rows = arr(importRows);
        for (int i = 0; i < rows.size(); i++) { JsonNode r = rows.get(i);
            String ref = trim(truthy(r) && !nullish(get(r, "ref")) ? str(get(r, "ref")) : ""); long amt = I(truthy(r) ? get(r, "amount") : null);
            List<JsonNode> same = new ArrayList<>(); if (!ref.isEmpty()) for (JsonNode c : C) if (!used.contains(S0(get(c, "id")))) { boolean has = false; for (JsonNode k : arr(get(c, "keys"))) if (ref.equals(str(k))) { has = true; break; } if (has) same.add(c); }
            JsonNode hit = null; for (JsonNode c : same) if (I(get(c, "amount")) == amt && (tol == null || !truthy(get(r, "day")) || !truthy(get(c, "day")) || dayDiff(str(get(r, "day")), str(get(c, "day"))) <= tol)) { hit = c; break; }
            if (hit != null) { used.add(S0(get(hit, "id"))); ObjectNode m = matched.addObject(); m.put("row", i); m.set("id", get(hit, "id")); continue; }
            boolean amtSame = false; for (JsonNode c : same) if (I(get(c, "amount")) == amt) amtSame = true;
            ObjectNode u = unmatched.addObject(); u.put("row", i); u.put("reason", same.isEmpty() ? "none" : amtSame ? "day" : "amount");
        }
        ObjectNode o = F.objectNode(); o.set("matched", matched); o.set("unmatched", unmatched); return o;
    }
    /** |Date.parse(a) − Date.parse(b)| 일수 — 날짜가 아니면 NaN(비교 거짓) */
    static double dayDiff(String a, String b) { try { return Math.abs(LocalDate.parse(a).toEpochDay() - LocalDate.parse(b).toEpochDay()); } catch (Exception e) { return Double.NaN; } }

    /** CSV 나누기(따옴표 · 쉼표 · BOM) — 가져오기 공용 */
    public static List<List<String>> csvRows(String text) {
        List<List<String>> out = new ArrayList<>(); List<String> row = new ArrayList<>(); StringBuilder cell = new StringBuilder(); boolean q = false;
        String s = text == null ? "" : text.startsWith("﻿") ? text.substring(1) : text;
        for (int i = 0; i < s.length(); i++) { char ch = s.charAt(i);
            if (q) { if (ch == '"') { if (i + 1 < s.length() && s.charAt(i + 1) == '"') { cell.append('"'); i++; } else q = false; } else cell.append(ch); continue; }
            if (ch == '"') q = true; else if (ch == ',') { row.add(cell.toString()); cell.setLength(0); }
            else if (ch == '\n' || ch == '\r') { if (ch == '\r' && i + 1 < s.length() && s.charAt(i + 1) == '\n') i++; row.add(cell.toString()); cell.setLength(0); if (row.stream().anyMatch(x -> !x.isEmpty())) out.add(row); row = new ArrayList<>(); }
            else cell.append(ch); }
        row.add(cell.toString()); if (row.stream().anyMatch(x -> !x.isEmpty())) out.add(row); return out;
    }
}
