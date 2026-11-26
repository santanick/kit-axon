package egovframework.didisam.group.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.market.service.impl.MkDb;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import static egovframework.didisam.cmm.Js.*;
import static egovframework.didisam.group.service.impl.GroupServiceImpl.*;

/** /api/group/* 경로 표 — Node service/server/group/routes.js와 같은 순서 · 권한 · 응답 · 감사 동작(spec 1-3 ~ 1-5, 계약 contract.json). */
final class GrpRoutes {
    private GrpRoutes() { }
    static JsonNode body(byte[] raw) { return DdWeb.readBody(raw, 320 * 1024); }
    static String qp(HttpServletRequest q, String k) { return q.getParameter(k); }
    static boolean has(HttpServletRequest q, String k) { String v = q.getParameter(k); return v != null && !v.isEmpty(); }
    static long daysBetween(String f, String t) { return LocalDate.parse(t).toEpochDay() - LocalDate.parse(f).toEpochDay() + 1; }
    static String[] range(GroupServiceImpl S, String from0, String to0, int minDays) {
        String to = to0 == null || to0.isEmpty() ? today() : to0; String from = from0 == null || from0.isEmpty() ? (to.length() >= 8 ? to.substring(0, 8) : to) + "01" : from0;
        if (!DAY_RE.matcher(from).matches() || !DAY_RE.matcher(to).matches() || from.compareTo(to) > 0 || daysBetween(from, to) > 366) throw S.E("grp_range");
        if (minDays > 0 && daysBetween(from, to) < minDays) throw S.E("grp_range", map("minDays", minDays), "통합 학습자 집계는 최소 " + minDays + "일 기간으로 조회합니다.");
        return new String[]{ from, to };
    }
    static String[] range(GroupServiceImpl S, HttpServletRequest q, int minDays) { return range(S, qp(q, "from"), qp(q, "to"), minDays); }
    static String reason(GroupServiceImpl S, JsonNode b) { String r = trim(str(get(b, "reason"), 201)); if (r.length() < 5 || r.length() > 200) throw S.E("grp_reason"); return r; }
    static ObjectNode pageOf(HttpServletRequest q, List<? extends JsonNode> items) {
        double pg = Math.floor(num(qp(q, "page") == null ? "" : qp(q, "page"))), sz = Math.floor(num(qp(q, "size") == null ? "" : qp(q, "size")));
        int page = (int) Math.max(1, Double.isNaN(pg) || pg == 0 ? 1 : pg); int size = (int) Math.min(100, Math.max(1, Double.isNaN(sz) || sz == 0 ? 20 : sz));
        ArrayNode a = F.arrayNode(); int from = (int) Math.min(items.size(), Math.max(0, (long) (page - 1) * size)), to = (int) Math.min(items.size(), Math.max(0, (long) page * size)); for (int i = from; i < to; i++) a.add(items.get(i));
        ObjectNode o = O(); o.set("items", a); return o.put("page", page).put("total", items.size());
    }
    static JsonNode nn(String v) { return v == null ? F.nullNode() : t(v); }

    // ── 출력 ──
    static ObjectNode groupOut(JsonNode g0) {
        ObjectNode o = O(); o.set("gid", g(g0, "id")); o.set("kind", g(g0, "kind")); o.set("name", g(g0, "name")); o.set("pilot", g(g0, "pilot")); o.set("detail", g(g0, "detail")); o.set("status", g(g0, "status"));
        o.set("targets", truthy(g(g0, "targets")) ? g(g0, "targets") : O()); o.putObject("terms").put("agreeVer", AGREE_VER); return o;
    }
    static JsonNode shareOf(JsonNode s0) {
        if (!truthy(s0)) return F.nullNode(); ObjectNode o = O().put("kpi", true).put("revenue", B(s0, "revenue")).put("ai", B(s0, "ai")).put("learnerAgg", B(s0, "learnerAgg"));
        JsonNode ld = get(s0, "learnerDetail"); ObjectNode d = o.putObject("learnerDetail").put("on", truthy(ld) && B(ld, "on")); JsonNode f = truthy(ld) ? get(ld, "fields") : null; d.set("fields", truthy(f) ? f : F.arrayNode());
        o.set("agreeVer", truthy(get(s0, "agreeVer")) ? get(s0, "agreeVer") : F.nullNode()); o.set("at", truthy(get(s0, "at")) ? get(s0, "at") : F.nullNode()); o.set("by", truthy(get(s0, "by")) ? get(s0, "by") : F.nullNode()); return o;
    }
    static ObjectNode linkOut(JsonNode l, JsonNode nm) {
        ObjectNode o = O(); o.set("linkId", g(l, "id")); o.set("childTid", g(l, "child_tid")); o.put("childName", nm != null ? S(g(nm, "name")) : ""); o.put("childType", nm != null ? S(g(nm, "type")) : "");
        o.set("label", g(l, "label")); o.set("unit", g(l, "unit")); o.set("status", g(l, "status")); o.set("share", shareOf(g(l, "share"))); o.set("invitedAt", g(l, "invited_at")); o.set("acceptedAt", g(l, "accepted_at")); o.set("endedAt", g(l, "ended_at")); return o;
    }
    static ObjectNode counts(MkDb db, String gid) { ObjectNode o = O().put("active", 0).put("invited", 0); for (ObjectNode r : db.q("select status, count(*)::int n from grp_link where group_id = $1 and status in ('active','invited') group by status", gid)) o.set(s(r, "status"), g(r, "n")); return o; }
    static List<ObjectNode> activeLinks(MkDb db, String gid) { return db.q("select * from grp_link where group_id = $1 and status = 'active' order by accepted_at, id", gid); }
    static List<String> tidsOf(List<ObjectNode> L) { List<String> o = new ArrayList<>(); for (ObjectNode l : L) o.add(s(l, "child_tid")); return o; }

    /** 공유 범위 검사(유형별 허용 항목) — Node shareIn */
    static ObjectNode shareIn(GroupServiceImpl S, String kind, JsonNode x0, boolean strict) {
        JsonNode x = truthy(x0) ? x0 : O(); JsonNode det = truthy(get(x, "learnerDetail")) ? get(x, "learnerDetail") : O(); List<String> allow = DETAIL.getOrDefault(kind, List.of());
        LinkedHashSet<String> fs = new LinkedHashSet<>(); JsonNode fa = get(det, "fields"); if (fa != null && fa.isArray()) for (JsonNode f : fa) fs.add(egovframework.didisam.cmm.Js.str(f));
        for (String f : fs) if (!allow.contains(f)) throw S.E("grp_field"); if (B(det, "on") && allow.isEmpty()) throw S.E("grp_field");
        if (B(x, "revenue") && "region".equals(kind)) throw S.E("grp_field");
        if (B(x, "learnerAgg") && "franchise".equals(kind)) throw S.E("grp_field");
        if (strict && get(x, "kpi") != null && get(x, "kpi").isBoolean() && !get(x, "kpi").asBoolean()) throw S.E("grp_terms");
        ObjectNode o = O().put("kpi", true).put("revenue", B(x, "revenue")).put("ai", B(x, "ai")).put("learnerAgg", B(x, "learnerAgg"));
        ObjectNode d = o.putObject("learnerDetail").put("on", B(det, "on") && !fs.isEmpty()); ArrayNode df = d.putArray("fields"); if (B(det, "on")) fs.forEach(df::add); return o;
    }
    static List<String> trueKeys(ObjectNode sh) { List<String> l = new ArrayList<>(); sh.fieldNames().forEachRemaining(k -> { if (sh.get(k).isBoolean() && sh.get(k).asBoolean()) l.add(k); }); return l; }

    /** 연결이 끝나면 필수 배포 콘텐츠 회수(판정 ②) — Node endLink */
    static int endLink(GroupServiceImpl S, JsonNode link) throws Exception {
        List<ObjectNode> T0 = S.santa(() -> S.db.q("update grp_share_tgt t set status = 'recalled', at = now() from grp_share s where s.id = t.share_id and s.group_id = $1 and t.child_tid = $2 and s.required and t.status in ('offered','adopted') returning t.local_id, s.kind", s(link, "group_id"), s(link, "child_tid")));
        List<String> ids = new ArrayList<>(); for (ObjectNode x : T0) if (truthy(g(x, "local_id"))) ids.add(s(x, "local_id"));
        if (!ids.isEmpty()) try { S.docEdit(s(link, "child_tid"), d -> { hideLocal(d, ids); return null; }); } catch (Exception e) { /* Node catch */ }
        return T0.size();
    }
    /** QA49-3 #4: 회수(숨김) — 편집본 표시 + 학습자 사이트 게시본(lsite.pub)에서 바로 뺀다(Node hideLocal과 같음) */
    static void hideLocal(ObjectNode d, List<String> ids) {
        java.util.Set<String> nt = new java.util.HashSet<>(), ct = new java.util.HashSet<>();
        for (String k : new String[]{ "classes", "notices" }) for (JsonNode x : arr(get(d, k))) if (x != null && x.isObject() && ids.contains(key(get(x, "id")))) { ((ObjectNode) x).put("grpRecalled", true).put("hidden", true);
            if (truthy(get(x, "curriculum")) || truthy(get(x, "learners"))) ct.add(S(get(x, "name"))); if (!truthy(get(x, "curriculum"))) nt.add(S(get(x, "title")) + "|" + S(get(x, "at"))); }
        for (JsonNode P : new JsonNode[]{ get(get(d, "lsite"), "pages"), get(get(d, "grpPending"), "pages") }) for (JsonNode x : arr(P)) if (x != null && x.isObject() && ids.contains(key(get(x, "id")))) ((ObjectNode) x).put("grpRecalled", true).put("hidden", true).put("on", false);
        JsonNode pub = get(get(d, "lsite"), "pub"); if (pub == null || !pub.isObject()) return; ObjectNode pb = (ObjectNode) pub;
        for (String k : new String[]{ "pages", "classes" }) if (pb.get(k) instanceof ArrayNode) { ArrayNode out = F.arrayNode(); for (JsonNode x : pb.get(k)) if (!(x != null && x.isObject() && ids.contains(key(get(x, "id"))))) out.add(x); pb.set(k, out); }
        if (pb.get("notices") instanceof ArrayNode) { ArrayNode out = F.arrayNode(); for (JsonNode x : pb.get("notices")) { boolean drop = x != null && x.isObject() && (nt.contains(S(get(x, "title")) + "|" + S(get(x, "at"))) || (truthy(get(x, "cls")) && ct.contains(S(get(x, "cls"))))); if (!drop) out.add(x); } pb.set("notices", out); }
    }

    // ── 콘텐츠 사본(spec 5-3) ──
    static final List<String> DROP = List.of("learners", "prog", "grades", "scores", "subs", "submissions", "board", "posts", "consults", "pays", "coupons", "teachers", "teacher", "owner", "att", "attendance", "crmDay", "k12Exams", "makeups", "done", "waits", "apply", "applicants", "reviews", "qna", "logs");
    static boolean isMk(JsonNode x) { return x != null && x.isObject() && (truthy(get(x, "mk")) || truthy(get(x, "mkProduct")) || truthy(get(x, "market")) || truthy(get(x, "mkId")) || "market".equals(S(get(x, "src")))); }
    static final class Src { String id, title; ObjectNode snap; }
    static final List<String> PER = List.of("enr", "attT", "conn", "ask", "drop", "memo", "certs");
    static void scrubIds(JsonNode o, java.util.Set<String> ids, int depth) {
        if (o == null || depth > 6) return;
        if (o.isArray()) { for (JsonNode v : o) scrubIds(v, ids, depth + 1); return; }
        if (!o.isObject()) return; ObjectNode ob = (ObjectNode) o; if (depth == 0) for (String k : PER) ob.remove(k);
        List<String> keys = new ArrayList<>(); ob.fieldNames().forEachRemaining(keys::add);
        for (String k : keys) { JsonNode v = ob.get(k); boolean hit = false;
            if (v.isObject()) { java.util.Iterator<String> it = v.fieldNames(); while (it.hasNext()) if (ids.contains(it.next())) { hit = true; break; } }
            else if (v.isArray()) for (JsonNode e : v) if (e.isTextual() && ids.contains(e.textValue())) { hit = true; break; }
            if (hit) { ob.remove(k); continue; } scrubIds(v, ids, depth + 1); }
    }
    static Src sourceOf(GroupServiceImpl S, JsonNode doc, String kind, JsonNode src) {
        JsonNode s0 = truthy(src) ? src : O(); JsonNode idn = or(get(s0, "courseId"), get(s0, "pageId"), get(s0, "noticeId"), t("")); String id = egovframework.didisam.cmm.Js.str(idn); if (id.isEmpty()) throw S.E("grp_source");
        JsonNode list = "course".equals(kind) ? get(doc, "classes") : "page".equals(kind) ? get(get(get(doc, "lsite"), "pub"), "pages") : get(doc, "notices");
        JsonNode x = null; for (JsonNode y : arr(list)) if (truthy(y) && id.equals(key(get(y, "id")))) { x = y; break; } if (x == null) throw S.E("grp_source");
        boolean mk = isMk(x); if (!mk && get(x, "items") != null && get(x, "items").isArray()) for (JsonNode i : get(x, "items")) if (isMk(i)) mk = true; if (mk) throw S.E("grp_license");
        ObjectNode snap = ((ObjectNode) x).deepCopy(); for (String k : DROP) snap.remove(k); snap.remove("grpFrom"); snap.remove("grpRecalled");
        /* QA49-3 #3: 학습자 ID를 키로 쓰는 값(enr · attT · conn · ask · drop 등)은 목록에 없어도 지운다(Node routes.js scrubIds와 같음) */
        java.util.Set<String> ids = new java.util.HashSet<>(); for (JsonNode m : arr(get(doc, "members"))) if (truthy(m) && truthy(get(m, "id"))) ids.add(key(get(m, "id")));
        for (JsonNode c : arr(get(doc, "classes"))) { if (!truthy(c)) continue; for (JsonNode l : arr(get(c, "learners"))) if (truthy(l)) ids.add(key(l)); JsonNode pg = get(c, "prog"); if (pg != null && pg.isObject()) pg.fieldNames().forEachRemaining(ids::add); }
        scrubIds(snap, ids, 0);
        if (snap.get("items") != null && snap.get("items").isArray()) { ArrayNode it = F.arrayNode(); for (JsonNode i : snap.get("items")) { ObjectNode o = i.isObject() ? ((ObjectNode) i).deepCopy() : O(); for (String k : new String[]{ "subs", "submissions", "answers", "scores", "file", "blob" }) o.remove(k); it.add(o); } snap.set("items", it); }
        if (snap.toString().getBytes(StandardCharsets.UTF_8).length > 2097152) throw S.E("grp_size");
        Src r = new Src(); r.id = id; r.snap = snap; JsonNode tt = or(get(x, "name"), get(x, "title"), t("제목 없음")); r.title = str(tt, 80); return r;
    }
    static ObjectNode shareOut(JsonNode s0, ObjectNode t0) {
        ObjectNode o = O(); o.set("sid", g(s0, "id")); o.set("dir", g(s0, "dir")); o.set("kind", g(s0, "kind")); o.set("title", g(s0, "title")); o.set("ver", g(s0, "ver")); o.set("required", g(s0, "required")); o.set("status", g(s0, "status")); o.set("fromTid", g(s0, "from_tid"));
        o.put("note", truthy(g(s0, "note")) ? s(s0, "note") : ""); o.set("targetsSpec", g(s0, "targets")); if (t0 != null) o.set("targets", t0); return o;
    }
    static boolean wants(JsonNode targets, String tid) { if (targets != null && targets.isArray()) for (JsonNode x : targets) if (tid.equals(x.asText())) return true; return false; }
    static boolean all(JsonNode targets) { return targets != null && targets.isTextual() && "all".equals(targets.textValue()); }
    static ObjectNode tgtStats(MkDb db, JsonNode s0, List<String> live) {
        List<ObjectNode> rows = db.q("select child_tid, status, ver from grp_share_tgt where share_id = $1", s(s0, "id")); List<String> want = new ArrayList<>(); for (String t0 : live) if (all(g(s0, "targets")) || wants(g(s0, "targets"), t0)) want.add(t0);
        LinkedHashSet<String> set = new LinkedHashSet<>(want); for (ObjectNode r : rows) set.add(s(r, "child_tid"));
        ObjectNode st = O().put("total", set.size()).put("adopted", 0).put("declined", 0).put("pending", 0).put("outdated", 0).put("recalled", 0);
        for (String t0 : set) { ObjectNode r = null; for (ObjectNode x : rows) if (t0.equals(s(x, "child_tid"))) { r = x; break; }
            if (r == null || "offered".equals(s(r, "status"))) st.put("pending", st.get("pending").asLong() + 1); else st.put(s(r, "status"), (st.has(s(r, "status")) ? st.get(s(r, "status")).asLong() : 0) + 1);
            if (r != null && "adopted".equals(s(r, "status")) && n(r, "ver") < n(s0, "ver")) st.put("outdated", st.get("outdated").asLong() + 1); }
        return st;
    }
    static ArrayNode docItem(ObjectNode d, String kind) {
        if ("course".equals(kind)) { if (!(d.get("classes") instanceof ArrayNode)) d.putArray("classes"); return (ArrayNode) d.get("classes"); }
        if ("notice".equals(kind)) { if (!(d.get("notices") instanceof ArrayNode)) d.putArray("notices"); return (ArrayNode) d.get("notices"); }
        /* QA49-3 #5: 페이지는 편집본(lsite.pages, 꺼짐) — 없으면 grpPending.pages(Node docItem과 같음) */
        if (!truthy(d.get("lsite")) || !d.get("lsite").isObject()) d.putObject("lsite"); ObjectNode ls = (ObjectNode) d.get("lsite"); if (ls.get("pages") instanceof ArrayNode) return (ArrayNode) ls.get("pages");
        if (!truthy(d.get("grpPending")) || !d.get("grpPending").isObject()) d.putObject("grpPending"); ObjectNode gp = (ObjectNode) d.get("grpPending");
        if (!(gp.get("pages") instanceof ArrayNode)) gp.putArray("pages"); return (ArrayNode) gp.get("pages");
    }

    // ── 대시보드(1-7) ──
    static final Map<String, List<String>> DEF_KPI = Map.of("franchise", List.of("lrn", "act", "cmpRateBp", "rev", "aiCalls", "new"), "univ", List.of("lrn", "cmpRateBp", "progBp", "aiCalls", "crs", "act"), "region", List.of("lrn", "crs", "cmpRateBp", "new", "aiCalls", "act"));
    static List<ObjectNode> rowsOf(List<ObjectNode> rows, String child) { List<ObjectNode> o = new ArrayList<>(); for (ObjectNode r : rows) if (child.equals(s(r, "child_tid"))) o.add(r); return o; }
    static ObjectNode dash(GroupServiceImpl S, JsonNode g0, HttpServletRequest q) throws Exception {
        String[] rg = range(S, q, 0); String from = rg[0], to = rg[1]; String u = qp(q, "unit"); String unit = List.of("day", "week", "month").contains(u == null ? "" : u) ? u : "week"; String tid = has(q, "tid") ? qp(q, "tid") : null;
        List<String> kpis; if (has(q, "kpi")) { kpis = new ArrayList<>(); for (String k : qp(q, "kpi").split(",", -1)) if (GrpKpi.KPIS.contains(k)) kpis.add(k); } else kpis = DEF_KPI.get(s(g0, "kind"));
        String gid = s(g0, "id"); MkDb db = S.db;
        Object[] T0 = S.T(() -> new Object[]{ activeLinks(db, gid), db.q("select child_tid, to_char(day, 'YYYY-MM-DD') \"day\", v, at from grp_kpi_day where group_id = $1 and day between $2::date and $3::date", gid, from, to), db.q("select * from grp_rule where group_id = $1 order by n", gid) });
        @SuppressWarnings("unchecked") List<ObjectNode> links = (List<ObjectNode>) T0[0], rows = (List<ObjectNode>) T0[1], rules = (List<ObjectNode>) T0[2];
        List<ObjectNode> L = new ArrayList<>(); for (ObjectNode l : links) if (tid == null || tid.equals(s(l, "child_tid"))) L.add(l);
        String yest = GrpKpi.addDays(today(), -1); ArrayNode stale = F.arrayNode(); String asOf = null; List<ObjectNode> children = new ArrayList<>(); List<Object[]> tl = new ArrayList<>();
        for (ObjectNode l : L) { List<ObjectNode> R = rowsOf(rows, s(l, "child_tid")); for (ObjectNode r : R) if (asOf == null || Instant.parse(s(r, "at")).isAfter(Instant.parse(asOf))) asOf = s(r, "at");
            ObjectNode raw = GrpKpi.combine(R); if (raw == null) raw = O(); GrpKpi.Masked m = GrpKpi.mask(raw, g(l, "share"));
            String last = ""; for (ObjectNode r : R) if (s(r, "day").compareTo(last) > 0) last = s(r, "day"); if (last.isEmpty() || last.compareTo(yest) < 0) stale.addObject().put("tid", s(l, "child_tid")).set("lastDay", last.isEmpty() ? F.nullNode() : t(last));
            ObjectNode c = O(); c.set("tid", g(l, "child_tid")); c.set("label", g(l, "label")); c.set("unit", g(l, "unit")); c.set("v", m.v); ArrayNode ma = c.putArray("masked"); m.masked.forEach(ma::add); ArrayNode na = c.putArray("noConsent"); m.noConsent.forEach(na::add); c.putObject("rank"); c.set("flags", GrpKpi.flags(m.v, rules));
            children.add(c); tl.add(new Object[]{ raw, m.noConsent }); }
        GrpKpi.ranks(children, kpis);
        ObjectNode o = O(); o.putObject("range").put("from", from).put("to", to).put("unit", unit); o.set("asOf", nn(asOf)); ArrayNode ka = o.putArray("kpis"); kpis.forEach(ka::add);
        o.set("total", tid != null ? F.nullNode() : GrpKpi.total(tl)); ArrayNode ca = o.putArray("children"); children.forEach(ca::add);
        TreeSet<String> Bk = new TreeSet<>(); for (ObjectNode r : rows) Bk.add(GrpKpi.bucket(s(r, "day"), unit)); ArrayNode se = o.putArray("series");
        for (String b : Bk) { List<Object[]> part = new ArrayList<>(); for (ObjectNode l : L) { List<ObjectNode> R = new ArrayList<>(); for (ObjectNode r : rowsOf(rows, s(l, "child_tid"))) if (GrpKpi.bucket(s(r, "day"), unit).equals(b)) R.add(r);
                ObjectNode raw = GrpKpi.combine(R); if (raw == null) raw = O(); part.add(new Object[]{ raw, GrpKpi.mask(raw, g(l, "share")).noConsent }); }
            ObjectNode tt = GrpKpi.total(part); ObjectNode e = se.addObject().put("at", b); e.set("lrn", tt.get("lrn")); e.set("act", tt.get("act")); }
        o.set("stale", stale); return o;
    }
    static ArrayNode rulesOut(MkDb db, String gid) { ArrayNode a = F.arrayNode(); db.q("select n, kpi, op, value::float8 value, period, label from grp_rule where group_id = $1 order by n", gid).forEach(a::add); return a; }
    static String csvCell(JsonNode v) { String s0 = nullish(v) ? "—" : egovframework.didisam.cmm.Js.str(v); return s0.matches("(?s).*[\",\n].*") || s0.matches("(?s)^[=+\\-@].*") ? "\"" + s0.replaceFirst("^([=+\\-@])", "'$1").replace("\"", "\"\"") + "\"" : s0; }
    static String csvCell(String v) { return csvCell(v == null ? F.nullNode() : t(v)); }
    /** 소속 기관 연결 고르기(복수 소속 — 판정 ①) */
    static ObjectNode pick(GroupServiceImpl S, Map<String, Object> a, String linkId) {
        List<ObjectNode> L = S.db.q("select * from grp_link where child_tid = $1 and status = 'active' order by accepted_at", tid(a));
        if (linkId != null && !linkId.isEmpty()) { for (ObjectNode l : L) if (linkId.equals(s(l, "id"))) return l; throw S.E("grp_state"); }
        if (L.size() == 1) return L.get(0); if (L.isEmpty()) throw S.E("grp_state"); throw S.E("grp_link_pick");
    }
    static String linkIdOf(JsonNode b) { JsonNode v = get(b, "linkId"); return truthy(v) ? egovframework.didisam.cmm.Js.str(v) : null; }
    static String msk(String e) { String x = e == null ? "" : e; int i = x.indexOf('@'); String u = i < 0 ? x : x.substring(0, i), d = i < 0 ? "" : x.substring(i + 1); int j = d.indexOf('@'); if (j >= 0) d = d.substring(0, j); return (u.length() > 2 ? u.substring(0, 2) : u) + "***@" + d; }
    static List<String> strArr(JsonNode v) { List<String> o = new ArrayList<>(); for (JsonNode x : arr(v)) o.add(egovframework.didisam.cmm.Js.str(x)); return o; }
    static JsonNode targetsOf(JsonNode bt, List<String> live) { if (all(bt) || bt == null || !bt.isArray()) return t("all"); ArrayNode a = F.arrayNode(); for (String t0 : strArr(bt)) if (live.contains(t0)) a.add(t0); return a; }

    static void register(GroupServiceImpl S) {
        MkDb db = S.db;
        /* ── 산타 관리자(1-3) ── */
        S.r("GET /api/group/admin/groups", (req, res, raw, p) -> { S.needSanta(req); String qs = str(qp(req, "q"), 40);
            List<Object[]> G0 = S.T(() -> { List<Object[]> out = new ArrayList<>(); for (ObjectNode g0 : db.q("select * from grp_group order by created_at, id")) out.add(new Object[]{ g0, counts(db, s(g0, "id")) }); return out; });
            List<String> ow = new ArrayList<>(); for (Object[] x : G0) ow.add(s((JsonNode) x[0], "owner_tid")); Map<String, ObjectNode> N = S.names(ow); List<ObjectNode> items = new ArrayList<>();
            for (Object[] x : G0) { JsonNode g0 = (JsonNode) x[0]; ObjectNode nm = N.get(s(g0, "owner_tid")); String on = nm == null ? "" : S(g(nm, "name"));
                ObjectNode o = O(); o.set("gid", g(g0, "id")); o.set("ownerTid", g(g0, "owner_tid")); o.put("ownerName", on); o.set("kind", g(g0, "kind")); o.set("name", g(g0, "name")); o.set("pilot", g(g0, "pilot")); o.set("detail", g(g0, "detail")); o.set("status", g(g0, "status")); o.set("links", (JsonNode) x[1]);
                if (qs.isEmpty() || S(g(g0, "name")).contains(qs) || on.contains(qs)) items.add(o); }
            return pageOf(req, items); });
        S.r("POST /api/group/admin/groups", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw);
            String kind = S(get(b, "kind")); if (!KINDS.containsKey(kind)) throw S.E("grp_kind"); String name = trim(str(get(b, "name"), 41)); if (name.isEmpty() || name.length() > 40) throw H(400, "묶음 이름은 1~40자로 적어 주십시오.", "grp_name");
            String owner = S(get(b, "ownerTid")); if (!TID_RE.matcher(owner).matches() || S.ttx.plain(() -> db.q1("select 1 from tenants where id = $1", owner)) == null) throw H(404, "없는 기관입니다.", "not_found");
            return S.T(() -> S.idem(tid(a), "admin-groups", get(b, "idem"), () -> {
                if (db.q1("select 1 from grp_group where owner_tid = $1", owner) != null) throw S.E("grp_exists");
                byte[] sb = new byte[32]; RND.nextBytes(sb); JsonNode pv = get(b, "pilot"); boolean pilot = !(pv != null && pv.isBoolean() && !pv.asBoolean());
                ObjectNode g0 = db.q1("insert into grp_group (id, owner_tid, kind, name, pilot, salt, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning *", rid("gp_"), owner, kind, name, pilot, hex(sb), email(a));
                S.gaudit(au(s(g0, "id"), a, "grp.admin.create")); ObjectNode nm = S.tenantName(s(g0, "owner_tid"));
                ObjectNode gr = groupOut(g0); gr.set("ownerTid", g(g0, "owner_tid")); gr.put("ownerName", S(g(nm, "name"))); gr.putObject("links").put("active", 0).put("invited", 0); ObjectNode o = O(); o.set("group", gr); return o; })); });
        S.p("PATCH", "^/api/group/admin/groups/(gp_[a-z0-9]{12})$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); String gid = p[0];
            return S.T(() -> S.idem(tid(a), "admin-patch:" + gid, get(b, "idem"), () -> { ObjectNode g0 = db.q1("select * from grp_group where id = $1 for update", gid); if (g0 == null) throw H(404, "없는 기관 묶음입니다.", "not_found");
                JsonNode st = get(b, "status"); if (!nullish(st) && !(st.isTextual() && List.of("active", "closed").contains(st.textValue()))) throw S.E("grp_state");
                JsonNode pl = get(b, "pilot"), dt = get(b, "detail"), nm = get(b, "name");
                ObjectNode x = db.q1("update grp_group set pilot = coalesce($2::boolean, pilot), detail = coalesce($3::boolean, detail), status = coalesce($4, status), name = coalesce($5, name) where id = $1 returning *", gid,
                    pl != null && pl.isBoolean() ? pl.asBoolean() : null, dt != null && dt.isBoolean() ? dt.asBoolean() : null, truthy(st) ? S(st) : null, truthy(nm) ? trim(str(nm, 40)) : null);
                ObjectNode tg = O(); if (!undef(pl)) tg.set("pilot", pl); if (!undef(dt)) tg.set("detail", dt); if (!undef(st)) tg.set("status", st);
                Au r = au(gid, a, "grp.admin.patch"); r.target = tg.toString(); S.gaudit(r);
                ObjectNode gr = groupOut(x); gr.set("ownerTid", g(x, "owner_tid")); gr.set("links", counts(db, gid)); ObjectNode o = O(); o.set("group", gr); return o; })); });
        S.r("POST /api/group/admin/rebuild", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw); String[] rg = range(S, S(get(b, "from")), S(get(b, "to")), 0);
            if (daysBetween(rg[0], rg[1]) > 92) throw S.E("grp_range", null, "집계 다시 만들기는 최대 92일까지 합니다."); String gid = S(get(b, "gid"));
            return S.T(() -> S.idem(tid(a), "rebuild:" + gid, get(b, "idem"), () -> { if (db.q1("select 1 from grp_group where id = $1", gid) == null) throw H(404, "없는 기관 묶음입니다.", "not_found");
                List<String> days = new ArrayList<>(); for (String d = rg[0]; d.compareTo(rg[1]) <= 0; d = GrpKpi.addDays(d, 1)) days.add(d); return O().put("queued", S.snapGroup(gid, days)); })); });

        /* ── 상위 기관(1-4) ── */
        S.r("GET /api/group/me", (req, res, raw, p) -> { Map<String, Object> a = S.need(req); ObjectNode g0 = S.T(() -> db.q1("select * from grp_group where owner_tid = $1", tid(a))); if (g0 == null) return O().putNull("group");
            scopeSet(tid(a), s(g0, "id"), false); List<String> roles = B(g0, "pilot") && "active".equals(s(g0, "status")) ? S.rolesOf(a, g0) : new ArrayList<>(); ObjectNode cn = S.T(() -> counts(db, s(g0, "id")));
            ObjectNode o = O(); o.set("group", groupOut(g0)); ObjectNode me = o.putObject("me"); if (roles.isEmpty()) me.putNull("role"); else me.put("role", roles.get(0)); ArrayNode ra = me.putArray("roles"); roles.forEach(ra::add); ArrayNode pa = me.putArray("perms"); permsOf(roles).forEach(pa::add); o.set("counts", cn); return o; });
        S.r("PATCH /api/group/me", (req, res, raw, p) -> { G x = S.needGrp(req, "staff"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "me", get(b, "idem"), () -> { JsonNode bt = get(b, "targets"); ObjectNode t0 = null;
                if (truthy(bt) && bt.isObject()) { t0 = O(); for (String k : new String[]{ "cmpRateBp", "actRateBp", "progBp" }) { JsonNode v = get(bt, k); if (v != null && v.isNumber() && v.asDouble() == Math.rint(v.asDouble()) && v.asDouble() >= 0 && v.asDouble() <= 10000) t0.set(k, v); } }
                JsonNode nm = get(b, "name"); ObjectNode g1 = db.q1("update grp_group set name = coalesce($2, name), targets = coalesce($3::jsonb, targets) where id = $1 returning *", x.gid(), truthy(nm) ? trim(str(nm, 40)) : null, t0 == null ? null : t0.toString());
                S.gaudit(au(x.gid(), x.a, "grp.me")); ObjectNode o = O(); o.set("group", groupOut(g1)); return o; })); });
        S.r("POST /api/group/refresh", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "refresh", get(b, "idem"), () -> { S.lim("grp-refresh:" + x.gid(), 1, 600000L); int n0 = S.snapGroup(x.gid(), List.of(today())); return O().put("ok", true).put("n", n0); })); });
        S.r("GET /api/group/staff", (req, res, raw, p) -> { G x = S.needGrp(req, "staff");
            List<ObjectNode> rows = S.T(() -> db.q("select user_id::text user_id, role, to_char(at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') at from grp_staff where group_id = $1", x.gid()));
            List<ObjectNode> U = S.ttx.plain(() -> db.q("select id::text id, email, role from users where tenant_id = $1 order by email", tid(x.a))); ArrayNode items = F.arrayNode();
            for (ObjectNode u : U) { boolean ow = "owner".equals(s(u, "role")); if (ow) { ObjectNode i = items.addObject(); i.set("email", g(u, "email")); i.put("role", "grp_admin").put("auto", true).putNull("at"); }
                for (ObjectNode r : rows) if (s(u, "id").equals(s(r, "user_id")) && !(ow && "grp_admin".equals(s(r, "role")))) { ObjectNode i = items.addObject(); i.set("email", g(u, "email")); i.set("role", g(r, "role")); i.set("at", g(r, "at")); } }
            ArrayNode us = F.arrayNode(); for (ObjectNode u : U) { ObjectNode i = us.addObject(); i.set("email", g(u, "email")); i.set("tenantRole", g(u, "role")); }
            ObjectNode o = O(); o.set("items", items); o.set("users", us); return o; });
        S.r("PUT /api/group/staff", (req, res, raw, p) -> { G x = S.needGrp(req, "staff"); JsonNode b = body(raw); String em = trim(nullish(get(b, "email")) ? "" : egovframework.didisam.cmm.Js.str(get(b, "email"))).toLowerCase(java.util.Locale.ROOT);
            boolean hasRoles = !undef(get(b, "roles")); JsonNode rv = get(b, "role"); boolean roleNull = rv != null && rv.isNull();
            List<String> roles; if (hasRoles) { if (!get(b, "roles").isArray()) throw H(400, "통합 센터 역할이 올바르지 않습니다.", "grp_staff_role"); roles = new ArrayList<>(); for (JsonNode r : get(b, "roles")) { if (!r.isTextual() || !PERMS.containsKey(r.textValue())) throw H(400, "통합 센터 역할이 올바르지 않습니다.", "grp_staff_role"); roles.add(r.textValue()); } }
            else if (roleNull) roles = new ArrayList<>(); else { if (rv == null || !rv.isTextual() || !PERMS.containsKey(rv.textValue())) throw H(400, "통합 센터 역할이 올바르지 않습니다.", "grp_staff_role"); roles = new ArrayList<>(List.of(rv.textValue())); }
            ObjectNode u = S.ttx.plain(() -> db.q1("select id::text id, role from users where tenant_id = $1 and lower(email) = $2", tid(x.a), em)); if (u == null) throw S.E("grp_staff_tenant");
            final List<String> R0 = roles;
            return S.T(() -> S.idem(tid(x.a), "staff:" + em, get(b, "idem"), () -> {
                if ("owner".equals(s(u, "role")) && !R0.contains("grp_admin") && hasRoles) throw S.E("grp_last_admin");
                if ("owner".equals(s(u, "role")) && roleNull) throw S.E("grp_last_admin");
                if (hasRoles || roleNull) db.x("delete from grp_staff where group_id = $1 and user_id = $2", x.gid(), s(u, "id"));
                for (String r : R0) db.x("insert into grp_staff (group_id, user_id, role, by) values ($1,$2,$3,$4) on conflict do nothing", x.gid(), s(u, "id"), r, email(x.a));
                long left = n(db.q1("select count(*)::int n from grp_staff where group_id = $1 and role = 'grp_admin'", x.gid()), "n") + n(S.ttx.plain(() -> db.q1("select count(*)::int n from users where tenant_id = $1 and role = 'owner'", tid(x.a))), "n"); if (left == 0) throw S.E("grp_last_admin");
                Au r = au(x.gid(), x.a, "grp.staff"); r.target = em; r.fields = R0; S.gaudit(r);
                ArrayNode rs = F.arrayNode(); for (ObjectNode z : db.q("select role from grp_staff where group_id = $1 and user_id = $2 order by role", x.gid(), s(u, "id"))) rs.add(s(z, "role"));
                ObjectNode o = O(); ObjectNode it = o.putArray("items").addObject().put("email", em); it.set("roles", rs); return o; })); });
        S.r("GET /api/group/links", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); Map<String, List<String>> SM = Map.of("active", List.of("active"), "invited", List.of("invited"), "ended", List.of("declined", "expired", "left", "removed"));
            List<String> ST = SM.getOrDefault(qp(req, "status") == null ? "" : qp(req, "status"), List.of("active", "invited", "declined", "expired", "left", "removed"));
            Object[] T0 = S.T(() -> { Map<String, String> last = new LinkedHashMap<>(); for (ObjectNode r : db.q("select child_tid, to_char(max(day), 'YYYY-MM-DD') d from grp_kpi_day where group_id = $1 group by child_tid", x.gid())) last.put(s(r, "child_tid"), s(r, "d"));
                return new Object[]{ db.q("select * from grp_link where group_id = $1 and status = any($2) order by invited_at desc, id", x.gid(), ST), last }; });
            @SuppressWarnings("unchecked") List<ObjectNode> L = (List<ObjectNode>) T0[0]; @SuppressWarnings("unchecked") Map<String, String> last = (Map<String, String>) T0[1];
            Map<String, ObjectNode> N = S.names(tidsOf(L)); String qs = str(qp(req, "q"), 40); ArrayNode items = F.arrayNode();
            for (ObjectNode l : L) { ObjectNode o = linkOut(l, N.get(s(l, "child_tid"))); o.set("lastDay", "active".equals(s(l, "status")) ? nn(last.get(s(l, "child_tid"))) : F.nullNode()); o.set("expiresAt", "invited".equals(s(l, "status")) ? g(l, "expires_at") : F.nullNode());
                if (qs.isEmpty() || S(o.get("label")).contains(qs) || S(o.get("childName")).contains(qs)) items.add(o); }
            return O().set("items", items); });
        S.r("POST /api/group/invites", (req, res, raw, p) -> { G x = S.needGrp(req, "invite"); JsonNode b = body(raw);
            String label = trim(str(get(b, "label"), 41)); if (label.isEmpty() || label.length() > 40) throw H(400, "소속 기관 이름은 1~40자로 적어 주십시오.", "grp_label"); String kind = s(x.g, "kind");
            if (get(b, "unit") == null || !get(b, "unit").isTextual() || !KINDS.getOrDefault(kind, List.of()).contains(get(b, "unit").textValue())) throw S.E("grp_unit");
            ObjectNode ask = shareIn(S, kind, truthy(get(b, "ask")) ? get(b, "ask") : O(), false); JsonNode tn = get(get(b, "to"), "tid"); String to = truthy(get(b, "to")) && truthy(tn) ? egovframework.didisam.cmm.Js.str(tn) : null;
            if (tid(x.a).equals(to)) throw S.E("grp_self"); if (to != null && !TID_RE.matcher(to).matches()) throw H(404, "없는 기관입니다.", "not_found");
            return S.T(() -> S.idem(tid(x.a), "invites", get(b, "idem"), () -> { S.lim("grp-invite:" + x.gid(), 30, 3600000L);
                if (to != null && S.ttx.plain(() -> db.q1("select 1 from tenants where id = $1", to)) == null) throw H(404, "없는 기관입니다.", "not_found");
                if (to != null && db.q1("select 1 from grp_link where group_id = $1 and child_tid = $2 and status in ('invited','active')", x.gid(), to) != null) throw S.E("grp_child");
                String AB = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; StringBuilder cd = new StringBuilder("GRP-"); byte[] r4 = new byte[8]; RND.nextBytes(r4); for (int i = 0; i < 8; i++) { if (i == 4) cd.append('-'); cd.append(AB.charAt((r4[i] & 0xff) % AB.length())); } String code = cd.toString();
                ObjectNode l = db.q1("insert into grp_link (id, group_id, owner_tid, child_tid, label, unit, status, code_hash, invite_to, expires_at, ask, invited_by) values ($1,$2,$3,$4,$5,$6,'invited',$7,$4,now() + interval '14 days',$8,$9) returning *",
                    rid("gl_"), x.gid(), tid(x.a), to, label, get(b, "unit").textValue(), sha("grp|" + code), ask, email(x.a));
                Au r = au(x.gid(), x.a, "grp.invite"); r.childTid = to; r.target = s(l, "id"); S.gaudit(r); ObjectNode o = O(); o.set("linkId", g(l, "id")); o.put("code", code); o.set("expiresAt", g(l, "expires_at")); return o; })); });
        S.p("DELETE", "^/api/group/invites/(gl_[a-z0-9]{12})$", (req, res, raw, p) -> { G x = S.needGrp(req, "invite"); JsonNode b = body(raw); String id = p[0];
            return S.T(() -> S.idem(tid(x.a), "invite-del:" + id, get(b, "idem"), () -> { ObjectNode y = db.q1("update grp_link set status = 'expired', ended_by = $3, ended_at = now(), end_reason = 'cancel' where id = $1 and group_id = $2 and status = 'invited' returning id", id, x.gid(), email(x.a)); if (y == null) throw S.E("grp_state");
                Au r = au(x.gid(), x.a, "grp.invite.cancel"); r.target = id; S.gaudit(r); return O().put("ok", true); })); });
        S.p("POST", "^/api/group/links/(gl_[a-z0-9]{12})/remove$", (req, res, raw, p) -> { G x = S.needGrp(req, "invite"); JsonNode b = body(raw); String why = reason(S, b); String id = p[0]; Object[] end = { null };
            ObjectNode out = S.T(() -> S.idem(tid(x.a), "remove:" + id, get(b, "idem"), () -> { ObjectNode y = db.q1("update grp_link set status = 'removed', ended_by = $3, ended_at = now(), end_reason = $4 where id = $1 and group_id = $2 and status = 'active' returning *", id, x.gid(), email(x.a), why); if (y == null) throw S.E("grp_state");
                Au r = au(x.gid(), x.a, "grp.remove"); r.childTid = s(y, "child_tid"); r.purpose = why; S.gaudit(r); Map<String, ObjectNode> N = S.names(List.of(s(y, "child_tid"))); end[0] = y; ObjectNode o = O(); o.set("link", linkOut(y, N.get(s(y, "child_tid")))); return o; }));
            if (end[0] != null && !B(out, "again")) { endLink(S, (JsonNode) end[0]); S.tlog(s((JsonNode) end[0], "child_tid"), email(x.a), "grp.removed", map("group", x.gid(), "reason", why)); } return out; });
        S.r("GET /api/group/dash", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); S.lim("grp-dash:" + email(x.a), 60, 60000L); ObjectNode out = dash(S, x.g, req);
            S.T(() -> { Au r = au(x.gid(), x.a, "grp.dash"); r.childTid = has(req, "tid") ? qp(req, "tid") : null; r.target = S(get(get(out, "range"), "from")) + "~" + S(get(get(out, "range"), "to")); r.ip = S.ip(req); S.gaudit(r); return null; }); return out; });
        S.r("GET /api/group/dash/export", (req, res, raw, p) -> { G x = S.needGrp(req, "export"); S.lim("grp-dash:" + email(x.a), 60, 60000L); ObjectNode d = dash(S, x.g, req);
            String at = Instant.now().plusSeconds(9 * 3600).atOffset(ZoneOffset.UTC).toLocalDateTime().toString().replace('T', ' '); at = at.length() >= 16 ? at.substring(0, 16) : at;
            String fr = S(get(get(d, "range"), "from")), tt = S(get(get(d, "range"), "to")); List<String> keys = strArr(d.get("kpis"));
            List<String> lines = new ArrayList<>(); lines.add("# 가명 집계 · 5명 미만 가림 · 내려받은 사람 " + email(x.a) + " · " + at + " KST · 기간 " + fr + "~" + tt);
            List<String> hd = new ArrayList<>(List.of("소속 기관", "구분")); hd.addAll(keys); List<String> hc = new ArrayList<>(); for (String h : hd) hc.add(csvCell(h)); lines.add(String.join(",", hc));
            for (JsonNode c : d.get("children")) { List<String> cl = new ArrayList<>(); cl.add(csvCell(get(c, "label"))); cl.add(csvCell(get(c, "unit"))); List<String> nc = strArr(get(c, "noConsent")); for (String k : keys) cl.add(nc.contains(k) ? csvCell("비공개") : csvCell(get(get(c, "v"), k))); lines.add(String.join(",", cl)); }
            if (truthy(d.get("total"))) { List<String> cl = new ArrayList<>(List.of(csvCell("합계"), csvCell(""))); for (String k : keys) cl.add(csvCell(get(d.get("total"), k))); lines.add(String.join(",", cl)); }
            S.T(() -> { Au r = au(x.gid(), x.a, "grp.export"); r.target = fr + "~" + tt; r.ip = S.ip(req); S.gaudit(r); return null; });
            res.setStatus(200); res.setHeader("content-type", "text/csv; charset=utf-8"); res.setHeader("content-disposition", "attachment; filename=\"group-" + fr + "-" + tt + ".csv\""); res.setHeader("cache-control", "no-store"); res.setHeader("x-content-type-options", "nosniff");
            res.getOutputStream().write(("﻿" + String.join("\r\n", lines) + "\r\n").getBytes(StandardCharsets.UTF_8)); res.getOutputStream().flush(); return null; });
        S.r("GET /api/group/rules", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); return O().set("rules", S.T(() -> rulesOut(db, x.gid()))); });
        S.r("PUT /api/group/rules", (req, res, raw, p) -> { G x = S.needGrp(req, "staff"); JsonNode b = body(raw); JsonNode L = get(b, "rules");
            boolean bad = L == null || !L.isArray() || L.size() > 20; if (!bad) for (JsonNode r : L) { JsonNode v = get(r, "value");
                if (!truthy(r) || !GrpKpi.KPIS.contains(S(get(r, "kpi"))) || !List.of("lt", "gt").contains(S(get(r, "op"))) || v == null || v.isNull() || (v.isTextual() && v.textValue().isEmpty()) || !Double.isFinite(num(v)) || !List.of("week", "month").contains(S(get(r, "period"))) || trim(str(get(r, "label"), 40)).isEmpty()) bad = true; }
            if (bad) throw S.E("grp_rule");
            return S.T(() -> S.idem(tid(x.a), "rules", get(b, "idem"), () -> { db.x("delete from grp_rule where group_id = $1", x.gid()); int k = 0;
                for (JsonNode r : L) db.x("insert into grp_rule (group_id, n, kpi, op, value, period, label) values ($1,$2,$3,$4,$5,$6,$7)", x.gid(), ++k, S(get(r, "kpi")), S(get(r, "op")), num(get(r, "value")), S(get(r, "period")), trim(str(get(r, "label"), 40)));
                Au r = au(x.gid(), x.a, "grp.rules"); r.target = String.valueOf(L.size()); S.gaudit(r); return O().set("rules", rulesOut(db, x.gid())); })); });
        S.r("GET /api/group/learners/summary", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); String[] rg = range(S, req, 28); if ("franchise".equals(s(x.g, "kind"))) throw S.E("grp_consent");
            Object[] T0 = S.T(() -> new Object[]{ activeLinks(db, x.gid()), db.q("select gkey, child_tid, dept from grp_lx where group_id = $1", x.gid()) });
            @SuppressWarnings("unchecked") List<ObjectNode> links = (List<ObjectNode>) T0[0], lx = (List<ObjectNode>) T0[1];
            List<ObjectNode> agreed = new ArrayList<>(); for (ObjectNode l : links) if (truthy(g(l, "share")) && B(g(l, "share"), "learnerAgg")) agreed.add(l);
            S.T(() -> { Au r = au(x.gid(), x.a, "grp.learners"); r.target = rg[0] + "~" + rg[1]; r.ok = !agreed.isEmpty(); r.ip = S.ip(req); S.gaudit(r); return null; });
            if (agreed.isEmpty()) throw S.E("grp_consent");
            Set<String> ok = new LinkedHashSet<>(tidsOf(agreed)); List<ObjectNode> X = new ArrayList<>(); for (ObjectNode r : lx) if (ok.contains(s(r, "child_tid"))) X.add(r);
            ObjectNode o = O(); o.putObject("range").put("from", rg[0]).put("to", rg[1]);
            if ("region".equals(s(x.g, "kind"))) { o.put("basis", "unifiedId").putNull("unified"); o.putNull("multi"); ArrayNode bc = o.putArray("byChild");
                /* QA49-3 #7: 기관별 학습자 수 = 기간 마지막 하루 집계 lrn(Node와 같음) */
                List<ObjectNode> kd = S.T(() -> db.q("select distinct on (child_tid) child_tid, v from grp_kpi_day where group_id = $1 and day between $2::date and $3::date order by child_tid, day desc", x.gid(), rg[0], rg[1]));
                Map<String, Long> lv = new LinkedHashMap<>(); for (ObjectNode r : kd) lv.put(s(r, "child_tid"), (long) GrpKpi.nz(get(g(r, "v"), "lrn")));
                for (ObjectNode l : agreed) { long c = lv.getOrDefault(s(l, "child_tid"), 0L); ObjectNode e = bc.addObject(); e.set("tid", g(l, "child_tid")); e.set("label", g(l, "label")); e.set("lrn", M(c)); e.putNull("shared"); }
                o.putArray("byDept"); o.putArray("flows"); o.putObject("consent").put("agreed", agreed.size()).put("total", links.size()); return o; }
            Map<String, LinkedHashSet<String>> by = new LinkedHashMap<>(); for (ObjectNode r : X) by.computeIfAbsent(s(r, "gkey"), k -> new LinkedHashSet<>()).add(s(r, "child_tid"));
            long m1 = 0, m2 = 0, m3 = 0; for (Set<String> st : by.values()) { if (st.size() >= 3) m3++; else if (st.size() == 2) m2++; else m1++; }
            ArrayNode bc = F.arrayNode(); for (ObjectNode l : agreed) { long c = 0, sh = 0; for (ObjectNode r : X) if (s(l, "child_tid").equals(s(r, "child_tid"))) { c++; if (by.get(s(r, "gkey")).size() > 1) sh++; } ObjectNode e = bc.addObject(); e.set("tid", g(l, "child_tid")); e.set("label", g(l, "label")); e.set("lrn", M(c)); e.set("shared", M(sh)); }
            Map<String, String> gd = new LinkedHashMap<>(); for (ObjectNode r : X) if (truthy(g(r, "dept")) && !gd.containsKey(s(r, "gkey"))) gd.put(s(r, "gkey"), s(r, "dept")); Map<String, Long> dept = new LinkedHashMap<>(); for (String d0 : gd.values()) dept.merge(d0, 1L, Long::sum);
            Map<String, String> lab = new LinkedHashMap<>(); for (ObjectNode l : agreed) lab.put(s(l, "child_tid"), s(l, "label")); Map<String, Long> fl = new LinkedHashMap<>();
            for (Set<String> st : by.values()) { List<String> A = new ArrayList<>(st); java.util.Collections.sort(A); for (int i = 0; i < A.size(); i++) for (int j = i + 1; j < A.size(); j++) fl.merge(A.get(i) + "|" + A.get(j), 1L, Long::sum); }
            List<ObjectNode> fr = new ArrayList<>(); for (Map.Entry<String, Long> e : fl.entrySet()) { String[] k = e.getKey().split("\\|", 2); ObjectNode f = O(); f.set("from", nn(lab.get(k[0]))); f.set("to", nn(lab.get(k[1]))); f.put("n", e.getValue()); fr.add(f); }
            List<ObjectNode> dr = new ArrayList<>(); for (Map.Entry<String, Long> e : dept.entrySet()) dr.add(O().put("dept", e.getKey()).put("lrn", e.getValue())); dr.sort((a1, b1) -> Long.compare(b1.get("lrn").asLong(), a1.get("lrn").asLong()));
            o.put("basis", "studentNo"); o.set("unified", M(by.size())); ObjectNode mu = o.putObject("multi"); mu.set("1", M(m1)); mu.set("2", M(m2)); mu.set("3+", M(m3)); o.set("byChild", bc);
            o.set("byDept", GrpKpi.fold(dr, "dept", "lrn", "(5명 미만 학과 묶음)")); o.set("flows", GrpKpi.fold(fr, "from", "n", "(5명 미만 묶음)")); o.putObject("consent").put("agreed", agreed.size()).put("total", links.size()); return o; });
        S.r("POST /api/group/learners/lookup", (req, res, raw, p) -> { G x = S.needGrp(req, null); JsonNode b = body(raw);
            Fail fail = (code, extra) -> { try { S.T(() -> { Au r = au(x.gid(), x.a, "grp.learner.lookup"); r.ok = false; r.target = code; r.ip = S.ip(req); S.gaudit(r); return null; }); } catch (Exception e) { /* Node catch */ } return S.E(code, extra); };
            if (!B(x.g, "detail")) throw fail.go("grp_detail_off", null); if (!x.perms.contains("learner")) throw fail.go("grp_role", null);
            try { S.needFresh(x.a); } catch (egovframework.didisam.cmm.DdException e) { throw fail.go("grp_mfa", map("mfa", "required")); }
            String purpose = trim(str(get(b, "purpose"), 201)); if (purpose.length() < 10 || purpose.length() > 200) throw fail.go("grp_purpose", null);
            JsonNode kv = get(get(b, "key"), "studentNo"); String no = (truthy(get(b, "key")) && truthy(kv) ? egovframework.didisam.cmm.Js.str(kv) : "").replaceAll("\\D", ""); if (no.isEmpty() || no.length() > 20) throw H(400, "학번을 입력해 주십시오.", "grp_key");
            S.lim("grp-lookup:" + email(x.a), 30, 3600000L); S.lim("grp-lookup-day:" + x.gid(), 200, 86400000L);
            return S.T(() -> S.idem(tid(x.a), "lookup", get(b, "idem"), () -> {
                List<ObjectNode> links = activeLinks(db, x.gid()); List<ObjectNode> ok = new ArrayList<>(); for (ObjectNode l : links) { JsonNode sh = g(l, "share"); if (truthy(sh) && truthy(get(sh, "learnerDetail")) && B(get(sh, "learnerDetail"), "on")) ok.add(l); }
                if (ok.isEmpty()) throw fail.go("grp_consent", null);
                String gk = gkey(s(x.g, "salt"), no).substring(0, 10); Au r0 = au(x.gid(), x.a, "grp.learner.lookup"); r0.target = gk; r0.purpose = purpose; r0.ip = S.ip(req); S.gaudit(r0);
                ArrayNode items = F.arrayNode();
                for (ObjectNode l : ok) { List<String> Fd = strArr(get(get(g(l, "share"), "learnerDetail"), "fields")); ObjectNode d = S.docOf(s(l, "child_tid")); JsonNode m = null;
                    for (JsonNode y : arr(get(d, "members"))) if (truthy(y) && !truthy(get(y, "withdrawn")) && S(get(y, "sid")).replaceAll("\\D", "").equals(no)) { m = y; break; } if (m == null) continue;
                    JsonNode codes = O(); for (JsonNode y : arr(get(d, "codes"))) if (truthy(y) && strictEq(get(y, "sid"), get(m, "sid"))) { codes = y; break; }
                    ObjectNode fields = O(); if (Fd.contains("studentNo")) fields.put("studentNo", egovframework.didisam.cmm.Js.str(get(m, "sid"))); if (Fd.contains("dept")) fields.put("dept", str(or(get(m, "dept"), get(codes, "dept"), t("")), 40));
                    if (Fd.contains("courses")) { ArrayNode cs = fields.putArray("courses"); String mid = key(get(m, "id"));
                        for (JsonNode c0 : arr(get(d, "classes"))) { if (!truthy(c0)) continue; boolean in = false; for (JsonNode li : arr(get(c0, "learners"))) if (strictEq(li, get(m, "id")) || mid.equals(key(li))) in = true; if (!in) continue;
                            JsonNode pp = get(get(c0, "prog"), mid); JsonNode pr = truthy(pp) ? pp : O(); double pv = Math.max(0, Math.min(100, GrpKpi.nz(get(pr, "p"))));
                            String st0 = S(get(c0, "start")); ObjectNode co = cs.addObject(); co.put("title", str(get(c0, "name"), 80)); co.put("term", str(truthy(get(c0, "term")) ? get(c0, "term") : t(st0.length() > 7 ? st0.substring(0, 7) : st0), 20)); co.put("progressBp", Math.round(pv * 100)); co.put("done", truthy(get(pr, "done")) || pv >= 100); } }
                    ObjectNode it = items.addObject(); it.set("childTid", g(l, "child_tid")); it.set("label", g(l, "label")); it.set("fields", fields);
                    Au r = au(x.gid(), x.a, "grp.learner.view"); r.childTid = s(l, "child_tid"); r.target = gk; r.purpose = purpose; r.fields = Fd; r.ip = S.ip(req); S.gaudit(r);
                    S.tlog(s(l, "child_tid"), email(x.a), "grp.learner.view", map("group", x.gid(), "purpose", purpose, "fields", Fd, "key", gk)); }
                ObjectNode o = O(); o.set("items", items); o.put("hidden", links.size() - ok.size()); return o; })); });
        S.r("GET /api/group/shares", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); String dir = List.of("down", "up").contains(qp(req, "dir") == null ? "" : qp(req, "dir")) ? qp(req, "dir") : "down";
            return S.T(() -> { List<String> live = tidsOf(activeLinks(db, x.gid())); String sel = "select id, group_id, dir, from_tid, kind, title, ver, required, targets, status, note from grp_share where group_id = $1 and dir = $2";
                List<ObjectNode> L = has(req, "status") ? db.q(sel + " and status = $3 order by updated_at desc", x.gid(), dir, qp(req, "status")) : db.q(sel + " order by updated_at desc", x.gid(), dir);
                ArrayNode items = F.arrayNode(); for (ObjectNode s0 : L) items.add(shareOut(s0, tgtStats(db, s0, live))); return O().set("items", items); }); });
        S.r("POST /api/group/shares", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = body(raw); String kind = S(get(b, "kind")); if (!List.of("course", "page", "notice").contains(kind) || !get(b, "kind").isTextual()) throw S.E("grp_source");
            Src src = sourceOf(S, S.docOf(tid(x.a)), kind, get(b, "source"));
            return S.T(() -> S.idem(tid(x.a), "shares", get(b, "idem"), () -> { List<String> live = tidsOf(activeLinks(db, x.gid())); JsonNode targets = targetsOf(get(b, "targets"), live);
                String title = trim(str(get(b, "title"), 80)); String note = str(get(b, "note"), 300);
                ObjectNode lic = O().put("origin", "own").put("mk", false); lic.putObject("src").put("kind", kind).put("id", src.id);
                ObjectNode s0 = db.q1("insert into grp_share (id, group_id, dir, from_tid, kind, title, snap, lic, required, targets, status, note, by) values ($1,$2,'down',$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11) returning *",
                    rid("gs_"), x.gid(), tid(x.a), kind, title.isEmpty() ? src.title : title, src.snap, lic, truthy(get(b, "required")), targets.toString(), note.isEmpty() ? null : note, email(x.a));
                db.x("insert into grp_share_ver (share_id, group_id, ver, snap, note) values ($1,$2,1,$3,$4)", s(s0, "id"), x.gid(), g(s0, "snap"), g(s0, "note"));
                Au r = au(x.gid(), x.a, "grp.share.create"); r.target = s(s0, "id"); S.gaudit(r); ObjectNode o = O(); o.set("share", shareOut(s0, tgtStats(db, s0, live))); return o; })); });
        S.p("POST", "^/api/group/shares/(gs_[a-z0-9]{12})/(publish|version|recall)$", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = body(raw); String sid = p[0], act = p[1];
            String why = "recall".equals(act) ? reason(S, b) : null; String mode = "notify".equals(S(get(b, "mode"))) ? "notify" : "hide";
            Src fresh = null; if ("version".equals(act)) { ObjectNode s0 = S.T(() -> db.q1("select kind, lic from grp_share where id = $1 and group_id = $2 and dir = $3", sid, x.gid(), "down")); if (s0 == null || !truthy(g(s0, "lic")) || !truthy(get(g(s0, "lic"), "src"))) throw S.E("grp_state");
                fresh = sourceOf(S, S.docOf(tid(x.a)), s(s0, "kind"), O().set("courseId", get(get(g(s0, "lic"), "src"), "id"))); }
            final Src fr = fresh; List<ObjectNode> hide = new ArrayList<>();
            ObjectNode out = S.T(() -> S.idem(tid(x.a), act + ":" + sid, get(b, "idem"), () -> { ObjectNode s0 = db.q1("select * from grp_share where id = $1 and group_id = $2 and dir = 'down' for update", sid, x.gid()); if (s0 == null) throw S.E("grp_state");
                List<String> live = tidsOf(activeLinks(db, x.gid())); ObjectNode y; List<ObjectNode> hd = new ArrayList<>(); String note = str(get(b, "note"), 300);
                if ("publish".equals(act)) { if (!"draft".equals(s(s0, "status"))) throw S.E("grp_state"); y = db.q1("update grp_share set status = 'published', updated_at = now() where id = $1 returning *", sid);
                    for (String t0 : live) if (all(g(s0, "targets")) || wants(g(s0, "targets"), t0)) db.x("insert into grp_share_tgt (share_id, group_id, child_tid, status) values ($1,$2,$3,'offered') on conflict do nothing", sid, x.gid(), t0); }
                else if ("version".equals(act)) { if (!List.of("draft", "published").contains(s(s0, "status"))) throw S.E("grp_ver");
                    y = db.q1("update grp_share set ver = ver + 1, snap = $2, note = coalesce($3, note), updated_at = now() where id = $1 returning *", sid, fr.snap, note.isEmpty() ? null : note);
                    db.x("insert into grp_share_ver (share_id, group_id, ver, snap, note) values ($1,$2,$3,$4,$5)", sid, x.gid(), g(y, "ver"), g(y, "snap"), note.isEmpty() ? null : note); db.x("delete from grp_share_ver where share_id = $1 and ver <= $2", sid, n(y, "ver") - 10); }
                else { if (!"published".equals(s(s0, "status"))) throw S.E("grp_state"); y = db.q1("update grp_share set status = 'recalled', note = $2, updated_at = now() where id = $1 returning *", sid, why);
                    for (ObjectNode r : db.q("update grp_share_tgt set status = 'recalled', at = now() where share_id = $1 and status in ('offered','adopted') returning child_tid, local_id", sid)) if (truthy(g(r, "local_id"))) hd.add(r); }
                Au r = au(x.gid(), x.a, "grp.share." + act); r.target = sid; r.purpose = why; S.gaudit(r); if ("hide".equals(mode) && B(y, "required")) hide.addAll(hd);
                ObjectNode o = O(); o.set("share", shareOut(y, tgtStats(db, y, live))); return o; }));
            for (ObjectNode h : hide) try { S.docEdit(s(h, "child_tid"), d -> { hideLocal(d, List.of(s(h, "local_id"))); return null; }); } catch (Exception e) { /* Node catch */ }
            return out; });
        S.p("GET", "^/api/group/shares/(gs_[a-z0-9]{12})/targets$", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); String sid = p[0];
            return S.T(() -> { ObjectNode s0 = db.q1("select * from grp_share where id = $1 and group_id = $2", sid, x.gid()); if (s0 == null) throw S.E("grp_state"); List<ObjectNode> links = activeLinks(db, x.gid()); List<ObjectNode> rows = db.q("select * from grp_share_tgt where share_id = $1", sid);
                LinkedHashSet<String> set = new LinkedHashSet<>(); if (!"draft".equals(s(s0, "status"))) for (ObjectNode l : links) if (all(g(s0, "targets")) || wants(g(s0, "targets"), s(l, "child_tid"))) set.add(s(l, "child_tid")); for (ObjectNode r : rows) set.add(s(r, "child_tid"));
                Map<String, String> lab = new LinkedHashMap<>(); for (ObjectNode l : links) lab.put(s(l, "child_tid"), s(l, "label")); ArrayNode items = F.arrayNode();
                for (String t0 : set) { ObjectNode r = null; for (ObjectNode y : rows) if (t0.equals(s(y, "child_tid"))) { r = y; break; } String lb = lab.get(t0); ObjectNode o = items.addObject().put("childTid", t0).put("label", lb == null ? "" : lb);
                    o.put("status", r != null ? s(r, "status") : "offered"); o.set("ver", r != null ? g(r, "ver") : F.nullNode()); o.set("adoptedAt", r != null && "adopted".equals(s(r, "status")) ? g(r, "at") : F.nullNode()); o.put("outdated", r != null && "adopted".equals(s(r, "status")) && n(r, "ver") < n(s0, "ver")); }
                return O().set("items", items); }); });
        S.p("POST", "^/api/group/requests/(gs_[a-z0-9]{12})/(approve|reject)$", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = body(raw); String sid = p[0], act = p[1];
            return S.T(() -> S.idem(tid(x.a), "req-" + act + ":" + sid, get(b, "idem"), () -> { ObjectNode s0 = db.q1("select * from grp_share where id = $1 and group_id = $2 and dir = 'up' for update", sid, x.gid()); if (s0 == null || !"requested".equals(s(s0, "status"))) throw S.E("grp_state");
                List<String> live = tidsOf(activeLinks(db, x.gid()));
                if ("reject".equals(act)) { String rs = str(get(b, "reason"), 200); ObjectNode y = db.q1("update grp_share set status = 'rejected', note = $2, updated_at = now() where id = $1 returning *", sid, rs.isEmpty() ? null : rs);
                    Au r = au(x.gid(), x.a, "grp.request.reject"); r.childTid = s(s0, "from_tid"); r.target = sid; S.gaudit(r); ObjectNode o = O(); o.set("share", shareOut(y, null)); return o; }
                if (truthy(g(s0, "lic")) && B(g(s0, "lic"), "mk")) throw S.E("grp_license"); ObjectNode y = db.q1("update grp_share set status = 'approved', updated_at = now() where id = $1 returning *", sid); ObjectNode re = null;
                if (truthy(get(b, "redistribute"))) { JsonNode targets = targetsOf(get(b, "targets"), live);
                    re = db.q1("insert into grp_share (id, group_id, dir, from_tid, kind, title, snap, lic, required, targets, status, note, by) values ($1,$2,'down',$3,$4,$5,$6,$7,$8,$9,'published',$10,$11) returning *", rid("gs_"), x.gid(), tid(x.a), s(s0, "kind"), s(s0, "title"), g(s0, "snap"),
                        O().put("origin", "group").put("mk", false).put("from", s(s0, "from_tid")).put("req", sid), truthy(get(b, "required")), targets.toString(), g(s0, "note"), email(x.a));
                    db.x("insert into grp_share_ver (share_id, group_id, ver, snap) values ($1,$2,1,$3)", s(re, "id"), x.gid(), g(re, "snap"));
                    for (String t0 : all(targets) ? live : strArr(targets)) db.x("insert into grp_share_tgt (share_id, group_id, child_tid, status) values ($1,$2,$3,'offered') on conflict do nothing", s(re, "id"), x.gid(), t0); }
                Au r = au(x.gid(), x.a, "grp.request.approve"); r.childTid = s(s0, "from_tid"); r.target = sid; S.gaudit(r); ObjectNode o = O(); o.set("share", shareOut(y, null)); if (re != null) o.set("redistributed", shareOut(re, tgtStats(db, re, live))); return o; })); });
        S.r("GET /api/group/policies", (req, res, raw, p) -> { G x = S.needGrp(req, "view");
            return S.T(() -> { int nl = activeLinks(db, x.gid()).size(); List<ObjectNode> L = db.q("select * from grp_policy where group_id = $1 order by key", x.gid());
                List<ObjectNode> A = db.q("select a.* from grp_policy_apply a where a.group_id = $1 and exists (select 1 from grp_link l where l.group_id = a.group_id and l.child_tid = a.child_tid and l.status = 'active')", x.gid()); ArrayNode items = F.arrayNode();
                for (ObjectNode p0 : L) { long ap = 0, ov = 0; for (ObjectNode y : A) if (s(p0, "key").equals(s(y, "key"))) { if ("applied".equals(s(y, "state")) && n(y, "ver") == n(p0, "ver")) ap++; if ("overridden".equals(s(y, "state"))) ov++; }
                    ObjectNode o = items.addObject(); o.set("key", g(p0, "key")); o.set("ver", g(p0, "ver")); o.set("lock", g(p0, "lock")); o.set("value", g(p0, "value")); o.putObject("applied").put("total", nl).put("applied", ap).put("overridden", ov).put("pending", Math.max(0, nl - ap - ov)); }
                return O().set("items", items); }); });
        S.p("PUT", "^/api/group/policies/([a-z]{2,8})$", (req, res, raw, p) -> { G x = S.needGrp(req, "policy"); String key = p[0]; if (!POLICY_KEYS.contains(key)) throw S.E("grp_policy_key"); JsonNode b = body(raw);
            JsonNode v = get(b, "value"); JsonNode lk = get(b, "lock"); if (lk == null || !lk.isTextual() || !List.of("locked", "default").contains(lk.textValue()) || !truthy(v) || !isObj(v)) throw H(400, "공통 설정 값 · 잠금 여부를 확인해 주십시오.", "grp_policy_value");
            if (v.toString().getBytes(StandardCharsets.UTF_8).length > 262144) throw S.E("grp_size");
            return S.T(() -> S.idem(tid(x.a), "policy:" + key, get(b, "idem"), () -> { ObjectNode cur = db.q1("select ver from grp_policy where group_id = $1 and key = $2 for update", x.gid(), key); JsonNode bv = get(b, "baseVer");
                long base = bv != null && bv.isNumber() && bv.asDouble() == Math.rint(bv.asDouble()) ? bv.asLong() : -1; long cv = cur == null ? 0 : n(cur, "ver"); if (cv != base) throw S.E("grp_ver", map("ver", cv));
                ObjectNode p0 = db.q1("insert into grp_policy (group_id, key, ver, lock, value, by) values ($1,$2,1,$3,$4,$5) on conflict (group_id, key) do update set ver = grp_policy.ver + 1, lock = excluded.lock, value = excluded.value, by = excluded.by, at = now() returning *", x.gid(), key, lk.textValue(), v.toString(), email(x.a));
                Au r = au(x.gid(), x.a, "grp.policy"); r.target = key + "@" + n(p0, "ver"); S.gaudit(r); ObjectNode o = O(); ObjectNode po = o.putObject("policy").put("key", key); po.set("ver", g(p0, "ver")); po.set("lock", g(p0, "lock")); po.set("value", g(p0, "value")); return o; })); });
        S.p("POST", "^/api/group/policies/([a-z]{2,8})/apply$", (req, res, raw, p) -> { G x = S.needGrp(req, "policy"); String key = p[0]; if (!POLICY_KEYS.contains(key)) throw S.E("grp_policy_key"); JsonNode b = body(raw);
            List<String> todo = new ArrayList<>(); ObjectNode[] pv = { null };
            ObjectNode out = S.T(() -> S.idem(tid(x.a), "apply:" + key, get(b, "idem"), () -> { ObjectNode p0 = db.q1("select * from grp_policy where group_id = $1 and key = $2", x.gid(), key); if (p0 == null) throw S.E("grp_state");
                List<ObjectNode> links = activeLinks(db, x.gid()); JsonNode bt = get(b, "targets"); List<ObjectNode> want = new ArrayList<>(); for (ObjectNode l : links) if (all(bt) || bt == null || !bt.isArray() || strArr(bt).contains(s(l, "child_tid"))) want.add(l); ArrayNode skipped = F.arrayNode();
                for (ObjectNode l : want) { ObjectNode ap = db.q1("select state from grp_policy_apply where group_id = $1 and child_tid = $2 and key = $3", x.gid(), s(l, "child_tid"), key);
                    if (ap != null && "overridden".equals(s(ap, "state")) && "default".equals(s(p0, "lock"))) { skipped.addObject().put("childTid", s(l, "child_tid")).put("reason", "overridden"); continue; }
                    db.x("insert into grp_policy_apply (group_id, child_tid, key, ver, state) values ($1,$2,$3,$4,'applied') on conflict (group_id, child_tid, key) do update set ver = excluded.ver, state = 'applied', at = now()", x.gid(), s(l, "child_tid"), key, g(p0, "ver")); todo.add(s(l, "child_tid")); }
                Au r = au(x.gid(), x.a, "grp.policy.apply"); r.target = key + "@" + n(p0, "ver"); r.fields = new ArrayList<>(todo); S.gaudit(r); pv[0] = O(); pv[0].set("ver", g(p0, "ver")); pv[0].set("lock", g(p0, "lock")); pv[0].set("value", g(p0, "value"));
                ObjectNode o = O().put("applied", todo.size()); o.set("skipped", skipped); return o; }));
            if (!B(out, "again")) for (String t0 : todo) try { S.docEdit(t0, d -> { putPolicy(d, x.gid(), key, pv[0].deepCopy().put("from", "group")); return null; }); } catch (Exception e) { /* Node catch */ }
            return out; });
        S.r("GET /api/group/audit", (req, res, raw, p) -> { G x = S.needGrp(req, "audit"); String f = qp(req, "from"), t0 = qp(req, "to");
            List<String> W = new ArrayList<>(List.of("group_id = $1")); List<Object> A = new ArrayList<>(List.of(x.gid()));
            if (f != null && DAY_RE.matcher(f).matches()) { A.add(f); W.add("(at at time zone 'Asia/Seoul')::date >= $" + A.size() + "::date"); } if (t0 != null && DAY_RE.matcher(t0).matches()) { A.add(t0); W.add("(at at time zone 'Asia/Seoul')::date <= $" + A.size() + "::date"); }
            for (String[] kc : new String[][]{ { "action", "action" }, { "actor", "actor" }, { "childTid", "child_tid" } }) if (has(req, kc[0])) { A.add(str(qp(req, kc[0]), 80)); W.add(kc[1] + " = $" + A.size()); }
            List<ObjectNode> L = S.T(() -> db.q("select at, actor, action, child_tid, target, purpose, ok from grp_audit where " + String.join(" and ", W) + " order by id desc limit 2000", A.toArray())); List<ObjectNode> items = new ArrayList<>();
            for (ObjectNode r : L) { ObjectNode o = O(); o.set("at", g(r, "at")); o.set("actor", g(r, "actor")); o.set("action", g(r, "action")); o.set("childTid", g(r, "child_tid")); o.put("target", truthy(g(r, "target")) ? s(r, "target") : ""); o.put("purpose", truthy(g(r, "purpose")) ? s(r, "purpose") : ""); o.set("ok", g(r, "ok")); items.add(o); }
            return pageOf(req, items); });

        /* ── 소속 기관(1-5) ── */
        S.r("GET /api/group/my", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req);
            Object[] T0 = S.T(() -> { List<ObjectNode> L = db.q("select * from grp_link where child_tid = $1 and status in ('invited','active') order by invited_at", tid(a)); List<String> gids = new ArrayList<>(); for (ObjectNode l : L) gids.add(s(l, "group_id")); return new Object[]{ L, db.q("select id, kind, name, owner_tid from grp_group where id = any($1)", gids) }; });
            @SuppressWarnings("unchecked") List<ObjectNode> L = (List<ObjectNode>) T0[0], G0 = (List<ObjectNode>) T0[1]; List<String> ow = new ArrayList<>(); for (ObjectNode g0 : G0) ow.add(s(g0, "owner_tid")); Map<String, ObjectNode> N = S.names(ow);
            java.util.function.Function<String, ObjectNode> gi = id -> { ObjectNode g0 = null; for (ObjectNode y : G0) if (id.equals(s(y, "id"))) g0 = y; ObjectNode o = O(); if (g0 == null) { o.putNull("gid"); o.put("name", "").put("kind", "").put("ownerName", ""); return o; }
                o.set("gid", g(g0, "id")); o.put("name", S(g(g0, "name"))); o.put("kind", S(g(g0, "kind"))); ObjectNode nm = N.get(s(g0, "owner_tid")); o.put("ownerName", nm == null ? "" : S(g(nm, "name"))); return o; };
            ArrayNode links = F.arrayNode(), inv = F.arrayNode(); Instant now = Instant.now();
            for (ObjectNode l : L) if ("active".equals(s(l, "status"))) { ObjectNode o = links.addObject(); o.set("linkId", g(l, "id")); o.set("status", g(l, "status")); o.set("group", gi.apply(s(l, "group_id"))); o.set("label", g(l, "label")); o.set("unit", g(l, "unit")); o.set("share", shareOf(g(l, "share"))); o.set("acceptedAt", g(l, "accepted_at")); }
            for (ObjectNode l : L) if ("invited".equals(s(l, "status")) && s(l, "expires_at") != null && Instant.parse(s(l, "expires_at")).isAfter(now)) { ObjectNode o = inv.addObject(); o.set("linkId", g(l, "id")); o.set("group", gi.apply(s(l, "group_id"))); o.set("label", g(l, "label")); o.set("unit", g(l, "unit")); o.set("ask", g(l, "ask")); o.set("expiresAt", g(l, "expires_at")); }
            ObjectNode o = O(); o.set("link", links.size() > 0 ? links.get(0) : F.nullNode()); o.set("links", links); o.set("invites", inv); return o; });
        S.r("POST /api/group/my/accept", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); JsonNode b = body(raw);
            if (get(b, "agreeVer") == null || !get(b, "agreeVer").isTextual() || !AGREE_VER.equals(get(b, "agreeVer").textValue())) throw S.E("grp_terms"); if (!truthy(get(b, "share")) || !isObj(get(b, "share"))) throw S.E("grp_terms");
            ObjectNode[] done = { null };
            ObjectNode out = S.T(() -> S.idem(tid(a), "accept", get(b, "idem"), () -> { ObjectNode l;
                if (truthy(get(b, "code"))) { String h = sha("grp|" + trim(egovframework.didisam.cmm.Js.str(get(b, "code"))).toUpperCase(java.util.Locale.ROOT)); ObjectNode x = S.santa(() -> db.q1("select * from grp_link where code_hash = $1", h));
                    if (x == null || (truthy(g(x, "child_tid")) && !tid(a).equals(s(x, "child_tid")))) throw S.E("grp_invite_code"); if (tid(a).equals(s(x, "owner_tid"))) throw S.E("grp_self");
                    if ("expired".equals(s(x, "status")) || ("invited".equals(s(x, "status")) && Instant.parse(s(x, "expires_at")).isBefore(Instant.now()))) throw S.E("grp_invite_expired"); if (!"invited".equals(s(x, "status"))) throw S.E("grp_state");
                    if (!truthy(g(x, "child_tid"))) { if (S.santa(() -> db.q1("select 1 from grp_link where group_id = $1 and child_tid = $2 and status in ('invited','active')", s(x, "group_id"), tid(a))) != null) throw S.E("grp_child");
                        S.santa(() -> db.x("update grp_link set child_tid = $2 where id = $1 and child_tid is null and status = 'invited'", s(x, "id"), tid(a))); }
                    l = db.q1("select * from grp_link where id = $1 for update", s(x, "id")); }
                else { l = db.q1("select * from grp_link where id = $1 and child_tid = $2 for update", S(get(b, "linkId")), tid(a)); if (l == null) throw S.E("grp_invite_code"); if ("invited".equals(s(l, "status")) && Instant.parse(s(l, "expires_at")).isBefore(Instant.now())) throw S.E("grp_invite_expired"); }
                if (l == null || !"invited".equals(s(l, "status"))) throw S.E(l != null && "active".equals(s(l, "status")) ? "grp_child" : "grp_state");
                ObjectNode g0 = db.q1("select kind from grp_group where id = $1", s(l, "group_id")); ObjectNode share = shareIn(S, s(g0, "kind"), get(b, "share"), true); share.put("agreeVer", AGREE_VER).put("at", isoNow()).put("by", email(a));
                ObjectNode x = db.q1("update grp_link set status = 'active', share = $2, agree_ver = $3, accepted_by = $4, accepted_at = now(), code_hash = null where id = $1 returning *", s(l, "id"), share, AGREE_VER, email(a));
                Au r = au(s(l, "group_id"), a, "grp.accept"); r.childTid = tid(a); r.target = s(l, "id"); r.fields = trueKeys(share); S.gaudit(r); done[0] = x;
                ObjectNode o = O(); ObjectNode lk = o.putObject("link"); lk.set("linkId", g(x, "id")); lk.set("status", g(x, "status")); lk.set("label", g(x, "label")); lk.set("unit", g(x, "unit")); lk.set("share", shareOf(g(x, "share"))); lk.set("acceptedAt", g(x, "accepted_at")); return o; }));
            if (done[0] != null && !B(out, "again")) { S.tlog(tid(a), email(a), "grp.accept", map("group", s(done[0], "group_id"), "share", g(done[0], "share"))); try { S.snapOne(done[0], today()); } catch (Exception e) { /* Node catch */ } } return out; });
        S.r("POST /api/group/my/decline", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "decline", get(b, "idem"), () -> { ObjectNode x = db.q1("update grp_link set status = 'declined', ended_by = $3, ended_at = now() where id = $1 and child_tid = $2 and status = 'invited' returning *", S(get(b, "linkId")), tid(a), email(a)); if (x == null) throw S.E("grp_state");
                Au r = au(s(x, "group_id"), a, "grp.decline"); r.childTid = tid(a); r.target = s(x, "id"); S.gaudit(r); return O().put("ok", true); })); });
        S.r("PUT /api/group/my/share", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); JsonNode b = body(raw); if (get(b, "agreeVer") == null || !get(b, "agreeVer").isTextual() || !AGREE_VER.equals(get(b, "agreeVer").textValue())) throw S.E("grp_terms");
            return S.T(() -> S.idem(tid(a), "share", get(b, "idem"), () -> { ObjectNode l = pick(S, a, linkIdOf(b)); ObjectNode g0 = db.q1("select kind from grp_group where id = $1", s(l, "group_id"));
                ObjectNode share = shareIn(S, s(g0, "kind"), get(b, "share"), true); share.put("agreeVer", AGREE_VER).put("at", isoNow()).put("by", email(a));
                ObjectNode x = db.q1("update grp_link set share = $2, agree_ver = $3 where id = $1 returning *", s(l, "id"), share, AGREE_VER);
                Au r = au(s(l, "group_id"), a, "grp.share.scope"); r.childTid = tid(a); r.fields = trueKeys(share); S.gaudit(r); S.tlog(tid(a), email(a), "grp.share", map("group", s(l, "group_id"), "share", share));
                ObjectNode o = O(); ObjectNode lk = o.putObject("link"); lk.set("linkId", g(x, "id")); lk.set("status", g(x, "status")); lk.set("share", shareOf(g(x, "share"))); return o; })); });
        S.r("POST /api/group/my/leave", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); JsonNode b = body(raw); String why = reason(S, b); ObjectNode[] end = { null };
            ObjectNode out = S.T(() -> S.idem(tid(a), "leave", get(b, "idem"), () -> { ObjectNode l = pick(S, a, linkIdOf(b));
                long req0 = n(db.q1("select count(*)::int n from grp_share_tgt t join grp_share s on s.id = t.share_id where t.child_tid = $1 and s.group_id = $2 and s.required and t.status = 'adopted'", tid(a), s(l, "group_id")), "n");
                ObjectNode x = db.q1("update grp_link set status = 'left', ended_by = $2, ended_at = now(), end_reason = $3 where id = $1 returning *", s(l, "id"), email(a), why);
                Au r = au(s(l, "group_id"), a, "grp.leave"); r.childTid = tid(a); r.purpose = why; S.gaudit(r); end[0] = x;
                ObjectNode o = O(); ObjectNode lk = o.putObject("link"); lk.set("linkId", g(x, "id")); lk.set("status", g(x, "status")); lk.set("endedAt", g(x, "ended_at"));
                if (req0 != 0) o.putObject("warn").put("code", "grp_required").put("required", req0).put("message", "필수 배포 콘텐츠 " + req0 + "건은 학습자 화면에서 숨김 처리됩니다(우리 기관이 만든 사본 · 수정본은 남습니다)."); return o; }));
            if (end[0] != null && !B(out, "again")) { endLink(S, end[0]); S.tlog(tid(a), email(a), "grp.leave", map("group", s(end[0], "group_id"), "reason", why)); } return out; });
        S.r("GET /api/group/my/inbox", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req);
            return S.T(() -> { List<ObjectNode> L = db.q("select s.id, s.group_id, s.kind, s.title, s.ver, s.required, s.status sst, s.note, t.status tst, t.ver tver from grp_share s left join grp_share_tgt t on t.share_id = s.id and t.child_tid = $1 where s.dir = 'down' and s.status in ('published','recalled') order by s.updated_at desc", tid(a));
                LinkedHashSet<String> gs = new LinkedHashSet<>(); for (ObjectNode r : L) gs.add(s(r, "group_id")); Map<String, String> G0 = new LinkedHashMap<>(); for (ObjectNode y : db.q("select id, name from grp_group where id = any($1)", new ArrayList<>(gs))) G0.put(s(y, "id"), s(y, "name"));
                ArrayNode items = F.arrayNode(); String st = qp(req, "status");
                for (ObjectNode r : L) { String status = "recalled".equals(s(r, "sst")) ? "recalled" : truthy(g(r, "tst")) ? s(r, "tst") : "offered"; if (st != null && !st.isEmpty() && !st.equals(status)) continue;
                    String gn = G0.get(s(r, "group_id")); ObjectNode o = items.addObject(); o.set("sid", g(r, "id")); o.set("gid", g(r, "group_id")); o.put("groupName", gn == null ? "" : gn); o.set("kind", g(r, "kind")); o.set("title", g(r, "title")); o.set("ver", g(r, "ver")); o.set("required", g(r, "required"));
                    o.put("status", status); o.set("myVer", truthy(g(r, "tver")) ? g(r, "tver") : F.nullNode()); o.put("note", truthy(g(r, "note")) ? s(r, "note") : ""); o.put("outdated", "adopted".equals(s(r, "tst")) && n(r, "tver") < n(r, "ver")); }
                return O().set("items", items); }); });
        S.p("POST", "^/api/group/my/inbox/(gs_[a-z0-9]{12})/(adopt|update|decline)$", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req); JsonNode b = body(raw); String sid = p[0], act = p[1]; ObjectNode[] sx = { null };
            ObjectNode out = S.T(() -> S.idem(tid(a), act + ":" + sid, get(b, "idem"), () -> { ObjectNode s0 = db.q1("select * from grp_share where id = $1 and dir = 'down'", sid); if (s0 == null || !"published".equals(s(s0, "status"))) throw S.E("grp_state");
                ObjectNode t0 = db.q1("select * from grp_share_tgt where share_id = $1 and child_tid = $2 for update", sid, tid(a));
                if ("decline".equals(act)) { if (B(s0, "required")) throw S.E("grp_required"); if (t0 != null && "adopted".equals(s(t0, "status"))) throw S.E("grp_state");
                    db.x("insert into grp_share_tgt (share_id, group_id, child_tid, status) values ($1,$2,$3,'declined') on conflict (share_id, child_tid) do update set status = 'declined', at = now()", sid, s(s0, "group_id"), tid(a));
                    Au r = au(s(s0, "group_id"), a, "grp.inbox.decline"); r.childTid = tid(a); r.target = sid; r.purpose = str(get(b, "reason"), 200); S.gaudit(r); return O().put("ok", true); }
                if ("adopt".equals(act) && t0 != null && "adopted".equals(s(t0, "status"))) { ObjectNode o = O(); o.set("localId", g(t0, "local_id")); o.set("ver", g(t0, "ver")); return o; }
                if ("update".equals(act) && (t0 == null || !"adopted".equals(s(t0, "status")))) throw S.E("grp_state"); if ("update".equals(act) && n(t0, "ver") >= n(s0, "ver")) throw S.E("grp_ver");
                String localId = t0 != null && truthy(g(t0, "local_id")) ? s(t0, "local_id") : "g" + s(s0, "kind").charAt(0) + "_" + sid.substring(3);
                db.x("insert into grp_share_tgt (share_id, group_id, child_tid, status, ver, local_id) values ($1,$2,$3,'adopted',$4,$5) on conflict (share_id, child_tid) do update set status = 'adopted', ver = excluded.ver, local_id = excluded.local_id, at = now()", sid, s(s0, "group_id"), tid(a), g(s0, "ver"), localId);
                Au r = au(s(s0, "group_id"), a, "grp.inbox." + act); r.childTid = tid(a); r.target = sid + "@" + n(s0, "ver"); S.gaudit(r); sx[0] = s0;
                ObjectNode o = O().put("localId", localId); o.set("ver", g(s0, "ver")); return o; }));
            if (sx[0] != null && !B(out, "again")) { ObjectNode s0 = sx[0]; String kind = s(s0, "kind"), localId = s(out, "localId");
                S.docEdit(tid(a), d -> { ArrayNode L = docItem(d, kind); int i = -1; for (int k = 0; k < L.size(); k++) if (truthy(L.get(k)) && localId.equals(key(get(L.get(k), "id")))) { i = k; break; }
                    JsonNode keep = i >= 0 ? L.get(i) : null; ObjectNode item = g(s0, "snap").isObject() ? ((ObjectNode) g(s0, "snap")).deepCopy() : O(); item.put("id", localId); ObjectNode gf = item.putObject("grpFrom"); gf.set("gid", g(s0, "group_id")); gf.put("sid", sid); gf.set("ver", g(s0, "ver"));
                    if ("course".equals(kind)) { item.set("learners", keep != null && truthy(get(keep, "learners")) ? get(keep, "learners") : F.arrayNode()); item.set("prog", keep != null && truthy(get(keep, "prog")) ? get(keep, "prog") : O()); if (keep == null) item.put("status", "준비중"); else if (undef(get(keep, "status"))) item.remove("status"); else item.set("status", get(keep, "status")); }
                    else if ("page".equals(kind)) { item.put("on", false).put("draft", true); ArrayNode secs = F.arrayNode(); for (JsonNode x : arr(get(item, "sections"))) { ObjectNode o = x != null && x.isObject() ? ((ObjectNode) x).deepCopy() : O(); o.put("on", true); secs.add(o); } item.set("sections", secs);
                        if (keep != null && truthy(get(keep, "on"))) item.put("on", true).put("draft", false); }
                    else if (keep == null) item.put("draft", true); else { if (undef(get(keep, "draft"))) item.remove("draft"); else item.set("draft", get(keep, "draft")); }
                    if (i >= 0) L.set(i, item); else L.add(item); return null; }); }
            return out; });
        S.r("POST /api/group/my/up", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req); JsonNode b = body(raw); String kind = S(get(b, "kind")); if (!List.of("course", "page", "notice").contains(kind) || !get(b, "kind").isTextual()) throw S.E("grp_source");
            Src src = sourceOf(S, S.docOf(tid(a)), kind, get(b, "source"));
            return S.T(() -> S.idem(tid(a), "up", get(b, "idem"), () -> { ObjectNode l = pick(S, a, linkIdOf(b)); String title = trim(str(get(b, "title"), 80)), note = str(get(b, "note"), 300);
                ObjectNode lic = O().put("origin", "child").put("mk", false); lic.putObject("src").put("kind", kind).put("id", src.id);
                ObjectNode s0 = db.q1("insert into grp_share (id, group_id, dir, from_tid, kind, title, snap, lic, targets, status, note, by) values ($1,$2,'up',$3,$4,$5,$6,$7,'[]','requested',$8,$9) returning *", rid("gs_"), s(l, "group_id"), tid(a), kind, title.isEmpty() ? src.title : title, src.snap, lic, note.isEmpty() ? null : note, email(a));
                db.x("insert into grp_share_ver (share_id, group_id, ver, snap) values ($1,$2,1,$3)", s(s0, "id"), s(l, "group_id"), g(s0, "snap"));
                Au r = au(s(l, "group_id"), a, "grp.up"); r.childTid = tid(a); r.target = s(s0, "id"); S.gaudit(r); ObjectNode o = O(); o.set("share", shareOut(s0, null)); return o; })); });
        S.r("GET /api/group/my/policies", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req);
            Object[] T0 = S.T(() -> { ObjectNode l = pick(S, a, qp(req, "linkId")); return new Object[]{ l, db.q("select * from grp_policy where group_id = $1 order by key", s(l, "group_id")), db.q("select * from grp_policy_apply where group_id = $1 and child_tid = $2", s(l, "group_id"), tid(a)) }; });
            ObjectNode l = (ObjectNode) T0[0]; @SuppressWarnings("unchecked") List<ObjectNode> L = (List<ObjectNode>) T0[1], A = (List<ObjectNode>) T0[2];
            ObjectNode d = S.docOf(tid(a)); JsonNode mine = get(get(d, "grpPolicy"), s(l, "group_id")); ArrayNode items = F.arrayNode();
            for (ObjectNode p0 : L) { ObjectNode ap = null; for (ObjectNode y : A) if (s(p0, "key").equals(s(y, "key"))) { ap = y; break; } String st = ap == null ? "pending" : "applied".equals(s(ap, "state")) && n(ap, "ver") < n(p0, "ver") ? "pending" : s(ap, "state");
                ObjectNode o = items.addObject(); o.set("key", g(p0, "key")); o.set("ver", g(p0, "ver")); o.set("lock", g(p0, "lock")); o.set("value", g(p0, "value")); ObjectNode mo = o.putObject("mine").put("state", st); JsonNode mk = get(mine, s(p0, "key")); if ("overridden".equals(st) && truthy(mk) && !undef(get(mk, "value"))) mo.set("value", get(mk, "value")); }
            ObjectNode o = O(); o.set("linkId", g(l, "id")); o.set("items", items); return o; });
        S.p("POST", "^/api/group/my/policies/([a-z]{2,8})$", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); String key = p[0]; if (!POLICY_KEYS.contains(key)) throw S.E("grp_policy_key"); JsonNode b = body(raw); String act = S(get(b, "action")); if (!List.of("apply", "override", "reset").contains(act)) throw S.E("grp_state");
            Object[] w = { null, null };
            ObjectNode out = S.T(() -> S.idem(tid(a), "mypolicy:" + key, get(b, "idem"), () -> { ObjectNode l = pick(S, a, linkIdOf(b)); ObjectNode p0 = db.q1("select * from grp_policy where group_id = $1 and key = $2", s(l, "group_id"), key); if (p0 == null) throw S.E("grp_state");
                JsonNode v = get(b, "value"); if ("override".equals(act) && "locked".equals(s(p0, "lock"))) throw S.E("grp_locked");
                if ("override".equals(act) && (!truthy(v) || !isObj(v) || v.toString().getBytes(StandardCharsets.UTF_8).length > 262144)) throw H(400, "덮어쓸 값을 확인해 주십시오.", "grp_policy_value");
                String state = "override".equals(act) ? "overridden" : "applied";
                db.x("insert into grp_policy_apply (group_id, child_tid, key, ver, state) values ($1,$2,$3,$4,$5) on conflict (group_id, child_tid, key) do update set ver = excluded.ver, state = excluded.state, at = now()", s(l, "group_id"), tid(a), key, g(p0, "ver"), state);
                Au r = au(s(l, "group_id"), a, "grp.mypolicy." + act); r.childTid = tid(a); r.target = key + "@" + n(p0, "ver"); S.gaudit(r);
                ObjectNode wv = O(); wv.set("ver", g(p0, "ver")); wv.set("lock", g(p0, "lock")); if ("overridden".equals(state)) { wv.set("value", v); wv.put("own", true); } else { wv.set("value", g(p0, "value")); wv.put("from", "group"); } w[0] = s(l, "group_id"); w[1] = wv;
                ObjectNode o = O(); ObjectNode it = o.putObject("item").put("key", key); it.set("ver", g(p0, "ver")); it.set("lock", g(p0, "lock")); it.putObject("mine").put("state", state); return o; }));
            if (w[0] != null && !B(out, "again")) S.docEdit(tid(a), d -> { putPolicy(d, (String) w[0], key, (ObjectNode) w[1]); return null; }); return out; });
        S.r("GET /api/group/my/audit", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); String f = qp(req, "from"), t0 = qp(req, "to"); String ff = f != null && DAY_RE.matcher(f).matches() ? f : "2000-01-01", tt = t0 != null && DAY_RE.matcher(t0).matches() ? t0 : "2999-12-31";
            List<ObjectNode> L = S.T(() -> db.q("select at, actor, action, purpose, fields, group_id from grp_audit where child_tid = $1 and actor_tid <> $1 and ok and (at at time zone 'Asia/Seoul')::date between $2::date and $3::date order by id desc limit 1000", tid(a), ff, tt));
            ArrayNode items = F.arrayNode(); for (ObjectNode r : L) { ObjectNode o = items.addObject(); o.set("at", g(r, "at")); o.put("actorMask", msk(s(r, "actor"))); o.set("role", "grp.learner.view".equals(s(r, "action")) ? t("grp_learner") : F.nullNode()); o.set("action", g(r, "action")); o.put("purpose", truthy(g(r, "purpose")) ? s(r, "purpose") : ""); o.set("fields", truthy(g(r, "fields")) ? g(r, "fields") : F.arrayNode()); o.set("gid", g(r, "group_id")); }
            return O().set("items", items); });
    }
    @FunctionalInterface interface Fail { egovframework.didisam.cmm.DdException go(String code, Map<String, Object> extra); }
    static JsonNode M(long n) { return n >= 1 && n <= 4 ? t(GrpKpi.UNDER5) : F.numberNode(n); }
    /** d.grpPolicy[gid][key] = v (Node: { ...(d.grpPolicy[gid] || {}), [key]: v }) */
    static void putPolicy(ObjectNode d, String gid, String key, ObjectNode v) {
        if (!truthy(d.get("grpPolicy")) || !d.get("grpPolicy").isObject()) d.putObject("grpPolicy"); ObjectNode gp = (ObjectNode) d.get("grpPolicy");
        ObjectNode cur = truthy(gp.get(gid)) && gp.get(gid).isObject() ? (ObjectNode) gp.get(gid) : O(); ObjectNode nx = cur.deepCopy(); nx.set(key, v); gp.set(gid, nx);
    }
}
