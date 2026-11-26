package egovframework.didisam.group.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.market.service.impl.MkDb;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.dao.DuplicateKeyException;
import static egovframework.didisam.cmm.Js.*;
import static egovframework.didisam.group.service.impl.GroupServiceImpl.*;

/** /api/group/* 경로 표 — Node service/server/group/routes.js와 같은 순서 · 권한 · 응답(spec.md 1-3 ~ 1-5). */
final class GrpRoutes {
    private GrpRoutes() { }
    static final String LSEL = "select l.*, l.child_tid child_name, null::text child_type from grp_link l";

    static void limit(GroupServiceImpl S, String key, int max, long ms) throws Exception { try { S.rl.limit(key, max, ms); } catch (DdException e) { throw S.E("grp_limit"); } }
    /** 소속 기관 이름 · 유형을 붙인다(tenants는 로그인 계정 범위로 따로 읽음 — didisam_group에는 기관 표 권한이 없다) */
    static void names(GroupServiceImpl S, List<ObjectNode> rows, String col) throws Exception {
        for (ObjectNode r : rows) { ObjectNode t0 = S.tenantOf(s(r, col)); r.put("child_name", t0 == null ? "" : S(g(t0, "name"))); r.put("child_type", t0 == null ? "" : S(g(t0, "type"))); }
    }
    static ObjectNode shareFlags(JsonNode in, String kind) {
        ObjectNode o = O().put("kpi", true).put("revenue", !"region".equals(kind) && B(in, "revenue")).put("ai", B(in, "ai")).put("learnerAgg", "univ".equals(kind) && B(in, "learnerAgg"));
        JsonNode ld = get(in, "learnerDetail"); ObjectNode d = o.putObject("learnerDetail"); ArrayNode f = d.putArray("fields");
        List<String> allow = "univ".equals(kind) ? List.of("studentNo", "dept", "courses") : "region".equals(kind) ? List.of("courses") : List.of();
        boolean on = B(ld, "on") || (ld != null && ld.isBoolean() && ld.asBoolean()); for (JsonNode x : arr(get(ld, "fields"))) if (allow.contains(x.asText()) && !contains(f, x.asText())) f.add(x.asText());
        d.put("on", on && !allow.isEmpty() && !"region".equals(kind)); return o;
    }
    static ObjectNode askFlags(JsonNode in, String kind) { ObjectNode s = shareFlags(in, kind); s.remove("kpi"); return s; }
    static boolean contains(ArrayNode a, String v) { for (JsonNode x : a) if (v.equals(x.asText())) return true; return false; }
    static ObjectNode gOf(GroupServiceImpl S, String gid) { return S.db.q1("select * from grp_group where id = $1", gid); }
    static ObjectNode shareOut(JsonNode r, List<ObjectNode> tg) {
        ObjectNode o = O(); o.set("sid", g(r, "id")); o.set("dir", g(r, "dir")); o.set("kind", g(r, "kind")); o.set("title", g(r, "title")); o.set("ver", g(r, "ver")); o.put("required", B(r, "required")); o.set("status", g(r, "status")); o.set("note", g(r, "note")); o.set("fromTid", g(r, "from_tid"));
        if (tg != null) { long ad = 0, de = 0, pe = 0, od = 0; for (ObjectNode t0 : tg) { String st = s(t0, "status"); if ("adopted".equals(st)) { ad++; if (n(t0, "ver") < n(r, "ver")) od++; } else if ("declined".equals(st)) de++; else if ("offered".equals(st)) pe++; }
            o.putObject("targets").put("total", tg.size()).put("adopted", ad).put("declined", de).put("pending", pe).put("outdated", od); }
        o.set("updatedAt", g(r, "updated_at")); return o;
    }
    static String mask(String email) { if (email == null) return ""; int i = email.indexOf('@'); String u = i < 0 ? email : email.substring(0, i); return (u.length() <= 2 ? u : u.substring(0, 2)) + "***@…"; }
    static List<String> tids(JsonNode v) { List<String> o = new ArrayList<>(); for (JsonNode x : arr(v)) { String t0 = str(x, 40); if (!t0.isEmpty() && !o.contains(t0)) o.add(t0); } return o; }

    /** 원본 읽기(상위 · 소속 기관 자기 범위) → 학습자 데이터를 뺀 사본. 마켓 상품이면 409 grp_license */
    static ObjectNode snapOf(GroupServiceImpl S, String tid, String kind, JsonNode src) throws Exception {
        String key = "course".equals(kind) ? "courseId" : "page".equals(kind) ? "pageId" : "noticeId"; String id = str(get(src, key), 60); if (id.isEmpty()) throw S.E("grp_source");
        JsonNode doc = S.ttx.inTenant(tid, () -> { Map<String, Object> r = S.mapper.selectDoc(tid); return r == null || r.get("doc") == null ? O() : parse(String.valueOf(r.get("doc"))); });
        String coll = "course".equals(kind) ? "classes" : "page".equals(kind) ? "pages" : "notices"; JsonNode it = null;
        for (JsonNode x : arr(get(doc, coll))) if (id.equals(S(get(x, "id")))) it = x; if (it == null) throw S.E("grp_source");
        if (truthy(get(it, "mk")) || "market".equals(S(get(it, "src"))) || truthy(get(it, "mkProduct"))) throw S.E("grp_license");
        for (JsonNode c : arr(get(it, "curriculum"))) if (truthy(get(c, "mk")) || truthy(get(c, "mkProduct"))) throw S.E("grp_license");
        ObjectNode o = O();
        if ("course".equals(kind)) { for (String k : new String[]{ "name", "kind", "sub", "desc", "goal", "goalHtml", "curriculum", "criteria", "cert", "hours", "thumb", "level", "weekPlan", "weekly" }) if (!undef(get(it, k))) o.set(k, get(it, k)); }
        else { for (Map.Entry<String, JsonNode> e : entries(it)) if (!List.of("id", "reads", "comments", "views", "by", "author", "learners", "subs").contains(e.getKey())) o.set(e.getKey(), e.getValue()); }
        if (o.toString().getBytes(StandardCharsets.UTF_8).length > 2 * 1024 * 1024) throw S.E("grp_size");
        return o;
    }
    static String titleOf(JsonNode snap) { String t0 = S(get(snap, "name")); if (t0.isEmpty()) t0 = S(get(snap, "title")); return cut(t0, 80); }
    /** 소속 기관 문서에 사본을 넣거나(채택) 바꾼다(새 버전) — 소속 기관 자기 범위 */
    static String putLocal(GroupServiceImpl S, String child, String kind, JsonNode snap, String sid, long ver, String localId) throws Exception {
        return S.ttx.inTenant(child, () -> { Map<String, Object> r = S.mapper.selectDoc(child); ObjectNode doc = r == null || r.get("doc") == null ? O() : (ObjectNode) parse(String.valueOf(r.get("doc")));
            String coll = "course".equals(kind) ? "classes" : "page".equals(kind) ? "pages" : "notices"; ArrayNode L = doc.get(coll) != null && doc.get(coll).isArray() ? (ArrayNode) doc.get(coll) : doc.putArray(coll);
            String id = localId;
            if (id == null) { id = ("course".equals(kind) ? "c" : kind.substring(0, 1)) + rid("g").substring(1, 11); ObjectNode it = ((ObjectNode) snap).deepCopy(); it.put("id", id);
                if ("course".equals(kind)) { it.put("status", "준비중").put("open", "비공개"); it.putArray("learners"); it.putObject("prog"); it.putObject("enr"); it.putArray("notices"); it.put("teacher", ""); it.put("group", ""); }
                it.putObject("grp").put("sid", sid).put("ver", ver); L.insert(0, it); }
            else { boolean hit = false; for (JsonNode x : L) if (id.equals(S(get(x, "id"))) && x.isObject()) { hit = true; ObjectNode it = (ObjectNode) x; for (Map.Entry<String, JsonNode> e : entries(snap)) it.set(e.getKey(), e.getValue()); it.putObject("grp").put("sid", sid).put("ver", ver); }
                if (!hit) { ObjectNode it = ((ObjectNode) snap).deepCopy(); it.put("id", id); if ("course".equals(kind)) { it.put("status", "준비중").put("open", "비공개"); it.putArray("learners"); it.putObject("prog"); } it.putObject("grp").put("sid", sid).put("ver", ver); L.insert(0, it); } }
            S.mapper.updateDoc(child, doc.toString()); return id; });
    }
    /** 필수 배포 회수(hide) — 소속 기관 문서에서 숨김 표시(학습자 화면) */
    static void hideLocal(GroupServiceImpl S, String child, String kind, String localId) throws Exception {
        if (localId == null) return;
        S.ttx.inTenant(child, () -> { Map<String, Object> r = S.mapper.selectDoc(child); if (r == null || r.get("doc") == null) return null; ObjectNode doc = (ObjectNode) parse(String.valueOf(r.get("doc")));
            String coll = "course".equals(kind) ? "classes" : "page".equals(kind) ? "pages" : "notices";
            for (JsonNode x : arr(get(doc, coll))) if (localId.equals(S(get(x, "id"))) && x.isObject()) { ((ObjectNode) x).put("open", "비공개"); ((ObjectNode) x).put("grpRecalled", true); }
            S.mapper.updateDoc(child, doc.toString()); return null; });
    }

    static void register(GroupServiceImpl S) {
        MkDb db = S.db;
        /* ── 1-3 산타 관리자 ── */
        S.r("GET /api/group/admin/groups", (req, res, raw, p) -> { S.needSanta(req); String q0 = trim(str(qp(req, "q"), 40));
            List<ObjectNode> rows = S.T(() -> db.q("select g.*, (select count(*)::int from grp_link l where l.group_id = g.id and l.status = 'active') la, (select count(*)::int from grp_link l where l.group_id = g.id and l.status = 'invited') li from grp_group g order by g.created_at desc, g.id"));
            List<ObjectNode> out = new ArrayList<>();
            for (ObjectNode r : rows) { ObjectNode t0 = S.tenantOf(s(r, "owner_tid")); String on = t0 == null ? "" : S(g(t0, "name")); if (!q0.isEmpty() && !S(g(r, "name")).contains(q0) && !on.contains(q0)) continue;
                ObjectNode o = O(); o.set("gid", g(r, "id")); o.set("ownerTid", g(r, "owner_tid")); o.put("ownerName", on); o.set("kind", g(r, "kind")); o.set("name", g(r, "name")); o.put("pilot", B(r, "pilot")); o.set("status", g(r, "status"));
                o.putObject("links").put("active", n(r, "la")).put("invited", n(r, "li")); out.add(o); }
            return pageOf(req, out); });
        S.r("POST /api/group/admin/groups", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "admin.groups", get(b, "idem"), () -> {
                String kind = S(get(b, "kind")); if (!KINDS.contains(kind)) throw S.E("grp_kind"); String owner = str(get(b, "ownerTid"), 40); String name = len(get(b, "name"), 1, 40);
                if (name == null) throw S.E(400, "name", "묶음 이름은 1~40자로 입력하십시오.");
                if (owner.isEmpty() || S.tenantOf(owner) == null) throw S.E(404, "not_found", "없는 기관입니다.");
                if (db.q1("select 1 from grp_group where owner_tid = $1", owner) != null) throw S.E("grp_exists");
                if (db.q1("select 1 from grp_link where child_tid = $1 and status = 'active'", owner) != null) throw S.E("grp_child");
                byte[] salt = new byte[24]; RND.nextBytes(salt); StringBuilder sb = new StringBuilder(); for (byte x : salt) sb.append(String.format("%02x", x));
                boolean pilot = get(b, "pilot") == null || nullish(get(b, "pilot")) || truthy(get(b, "pilot"));
                ObjectNode r; try { r = db.q1("insert into grp_group (id, owner_tid, kind, name, pilot, status, salt, targets, created_by) values ($1,$2,$3,$4,$5,'active',$6,'{}'::jsonb,$7) returning *", rid("gp_"), owner, kind, name, pilot, sb.toString(), email(a)); }
                catch (DuplicateKeyException e) { throw S.E("grp_exists"); }
                S.gaudit(s(r, "id"), a, "group.create", null, owner, null, null, true, req);
                ObjectNode o = O(); o.set("group", groupOut(r)); return o; })); });
        S.p("PATCH", "^/api/group/admin/groups/(gp_[a-z0-9]{12})$", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "admin.groups.patch:" + p[0], get(b, "idem"), () -> { ObjectNode r = gOf(S, p[0]); if (r == null) throw S.E(404, "not_found", "없는 기관 묶음입니다.");
                String st = undef(get(b, "status")) ? s(r, "status") : S(get(b, "status")); if (!"active".equals(st) && !"closed".equals(st)) throw S.E("grp_state");
                boolean pilot = undef(get(b, "pilot")) ? B(r, "pilot") : truthy(get(b, "pilot")); String name = undef(get(b, "name")) ? s(r, "name") : len(get(b, "name"), 1, 40); if (name == null) throw S.E(400, "name", "묶음 이름은 1~40자로 입력하십시오.");
                ObjectNode u = db.q1("update grp_group set pilot = $2, status = $3, name = $4 where id = $1 returning *", p[0], pilot, st, name);
                S.gaudit(p[0], a, "group.patch", null, null, null, null, true, req); ObjectNode o = O(); o.set("group", groupOut(u)); return o; })); });
        S.r("POST /api/group/admin/rebuild", (req, res, raw, p) -> { Map<String, Object> a = S.needSanta(req); JsonNode b = body(raw);
            String gid = str(get(b, "gid"), 20), from = S(get(b, "from")), to = S(get(b, "to"));
            if (!DAY_RE.matcher(from).matches() || !DAY_RE.matcher(to).matches()) throw S.E("grp_range"); LocalDate f = LocalDate.parse(from), t0 = LocalDate.parse(to);
            long days = t0.toEpochDay() - f.toEpochDay() + 1; if (days < 1 || days > 92) throw S.E(400, "grp_range", "집계 다시 만들기는 최대 92일까지 할 수 있습니다.");
            ObjectNode done = S.T(() -> { if (!truthy(get(b, "idem"))) throw S.E("idem"); ObjectNode ex = db.q1("select resp from grp_idem where tid = $1 and route = $2 and key = $3", tid(a), "admin.rebuild", str(get(b, "idem"), 80)); if (ex != null) { ObjectNode r = ((ObjectNode) ex.get("resp")).deepCopy(); r.put("again", true); return r; }
                if (gOf(S, gid) == null) throw S.E(404, "not_found", "없는 기관 묶음입니다."); return null; });
            if (done != null) return done;
            int n = 0; for (LocalDate d = f; !d.isAfter(t0); d = d.plusDays(1)) n += S.snapDay(d.toString(), gid);
            final int nn = n; return S.T(() -> { ObjectNode o = O().put("queued", nn); db.x("insert into grp_idem (tid, route, key, resp) values ($1,$2,$3,$4) on conflict do nothing", tid(a), "admin.rebuild", str(get(b, "idem"), 80), o); S.gaudit(gid, a, "group.rebuild", null, from + "~" + to, null, null, true, req); return o; }); });

        /* ── 1-4 상위 기관(통합 센터) ── */
        S.r("GET /api/group/me", (req, res, raw, p) -> { Map<String, Object> a = S.need(req); G x = S.grpOf(a);
            ObjectNode o = O(); if (x.group == null) { o.putNull("group"); return o; }
            o.set("group", groupOut(x.group)); ObjectNode me = o.putObject("me"); if (x.role == null) me.putNull("role"); else me.put("role", x.role); ArrayNode pa = me.putArray("perms"); x.perms.forEach(pa::add);
            ObjectNode c = S.T(() -> db.q1("select count(*) filter (where status = 'active')::int a, count(*) filter (where status = 'invited')::int i from grp_link where group_id = $1", x.gid));
            o.putObject("counts").put("active", n(c, "a")).put("invited", n(c, "i")); return o; });
        S.r("PATCH /api/group/me", (req, res, raw, p) -> { G x = S.needGrp(req, "staff"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "me.patch", get(b, "idem"), () -> {
                String name = undef(get(b, "name")) ? s(x.group, "name") : len(get(b, "name"), 1, 40); if (name == null) throw S.E(400, "name", "묶음 이름은 1~40자로 입력하십시오.");
                ObjectNode tg = truthy(g(x.group, "targets")) ? ((ObjectNode) g(x.group, "targets")).deepCopy() : O();
                if (isObj(get(b, "targets"))) for (String k : new String[]{ "cmpRateBp", "actRateBp", "progBp" }) { JsonNode v = get(get(b, "targets"), k); if (undef(v)) continue; if (nullish(v)) { tg.remove(k); continue; } double d = num(v); if (!Double.isFinite(d) || d < 0 || d > 10000) throw S.E("grp_rule"); tg.put(k, Math.round(d)); }
                ObjectNode u = db.q1("update grp_group set name = $2, targets = $3 where id = $1 returning *", x.gid, name, tg);
                S.gaudit(x.gid, x.a, "group.patch", null, null, null, null, true, req); ObjectNode o = O(); o.set("group", groupOut(u)); return o; })); });
        S.r("GET /api/group/staff", (req, res, raw, p) -> { G x = S.needGrp(req, "staff"); return O().set("items", staffItems(S, x)); });
        S.r("PUT /api/group/staff", (req, res, raw, p) -> { G x = S.needGrp(req, "staff"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "staff.put", get(b, "idem"), () -> {
                String em = trim(str(get(b, "email"), 120)).toLowerCase(java.util.Locale.ROOT); JsonNode rv = get(b, "role"); String role = nullish(rv) ? null : S(rv); if (role != null && !ROLES.contains(role)) throw S.E(400, "role", "통합 센터 역할을 확인하십시오.");
                ObjectNode u = S.ttx.plain(() -> db.q1("select id::text id, role from users where lower(email) = $1 and tenant_id = $2", em, tid(x.a)));
                if (u == null) throw S.E("grp_staff_tenant");
                if (role == null) { ObjectNode cur = db.q1("select role from grp_staff where group_id = $1 and user_id = $2::uuid", x.gid, s(u, "id"));
                    long admins = n(db.q1("select count(*)::int n from grp_staff where group_id = $1 and role = 'grp_admin'", x.gid), "n") + n(S.ttx.plain(() -> db.q1("select count(*)::int n from users where tenant_id = $1 and role = 'owner'", tid(x.a))), "n");
                    if (cur != null && "grp_admin".equals(s(cur, "role")) && admins <= 1) throw S.E("grp_last_admin");
                    db.x("delete from grp_staff where group_id = $1 and user_id = $2::uuid", x.gid, s(u, "id")); }
                else db.x("insert into grp_staff (group_id, user_id, role, by, at) values ($1,$2::uuid,$3,$4,now()) on conflict (group_id, user_id) do update set role = $3, by = $4, at = now()", x.gid, s(u, "id"), role, email(x.a));
                S.gaudit(x.gid, x.a, "staff.set", null, mask(em) + ":" + (role == null ? "-" : role), null, null, true, req);
                ObjectNode o = O(); o.set("items", staffItems(S, x)); return o; })); });
        S.r("GET /api/group/links", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); String st = qp(req, "status"), q0 = trim(str(qp(req, "q"), 40));
            List<ObjectNode> rows = S.T(() -> db.q(LSEL + " where l.group_id = $1 order by l.invited_at desc, l.id", x.gid)); names(S, rows, "child_tid");
            ArrayNode a = F.arrayNode();
            for (ObjectNode r : rows) { String rs = s(r, "status"); String bucket = "active".equals(rs) ? "active" : "invited".equals(rs) ? "invited" : "ended";
                if (st != null && !st.isEmpty() && !st.equals(bucket)) continue; if (!q0.isEmpty() && !S(g(r, "label")).contains(q0) && !S(g(r, "child_name")).contains(q0)) continue;
                if ("invited".equals(rs)) { r.put("child_name", ""); r.put("child_type", ""); } /* 수락 전에는 대상 기관 정보를 보이지 않음 */
                a.add(linkOut(r)); }
            return O().set("items", a); });
        S.r("POST /api/group/invites", (req, res, raw, p) -> { G x = S.needGrp(req, "invite"); JsonNode b = body(raw); limit(S, "grp-inv:" + x.gid, 30, 3600000L);
            return S.T(() -> S.idem(tid(x.a), "invites", get(b, "idem"), () -> {
                String label = len(get(b, "label"), 1, 40); if (label == null) throw S.E(400, "label", "소속 기관 표시 이름은 1~40자로 입력하십시오.");
                String kind = s(x.group, "kind"), unit = S(get(b, "unit")); if (!UNITS.get(kind).contains(unit)) throw S.E("grp_unit");
                String to = str(get(get(b, "to"), "tid"), 40); if (!to.isEmpty()) { if (to.equals(tid(x.a))) throw S.E("grp_self"); if (S.tenantOf(to) == null) throw S.E(404, "not_found", "없는 기관입니다.");
                    if (db.q1("select 1 from grp_link where group_id = $1 and child_tid = $2 and status = 'active'", x.gid, to) != null) throw S.E("grp_child"); }
                String code = code(), id = rid("gl_");
                ObjectNode r = db.q1("insert into grp_link (id, group_id, child_tid, label, unit, status, code_hash, invite_to, expires_at, ask, share, invited_by, invited_at) values ($1,$2,null,$3,$4,'invited',$5,$6,now() + interval '14 days',$7,'{}'::jsonb,$8,now()) returning *",
                    id, x.gid, label, unit, sha(code), to.isEmpty() ? null : to, askFlags(get(b, "ask"), kind), email(x.a));
                S.gaudit(x.gid, x.a, "link.invite", to.isEmpty() ? null : to, id, null, null, true, req);
                ObjectNode o = O().put("linkId", id).put("code", code); o.set("expiresAt", g(r, "expires_at")); return o; })); });
        S.p("DELETE", "^/api/group/invites/(gl_[a-z0-9]{12})$", (req, res, raw, p) -> { G x = S.needGrp(req, "invite"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "invites.del:" + p[0], get(b, "idem"), () -> {
                int u = db.x("update grp_link set status = 'expired', ended_by = $3, ended_at = now(), end_reason = 'cancel' where id = $1 and group_id = $2 and status = 'invited'", p[0], x.gid, email(x.a)); if (u == 0) throw S.E("grp_state");
                S.gaudit(x.gid, x.a, "link.cancel", null, p[0], null, null, true, req); return O().put("ok", true); })); });
        S.p("POST", "^/api/group/links/(gl_[a-z0-9]{12})/remove$", (req, res, raw, p) -> { G x = S.needGrp(req, "invite"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "links.remove:" + p[0], get(b, "idem"), () -> { String reason = len(get(b, "reason"), 5, 200); if (reason == null) throw S.E(400, "reason", "해제 사유를 5~200자로 적어 주십시오.");
                ObjectNode r = db.q1("update grp_link set status = 'removed', ended_by = $3, ended_at = now(), end_reason = $4 where id = $1 and group_id = $2 and status = 'active' returning *", p[0], x.gid, email(x.a), reason); if (r == null) throw S.E("grp_state");
                recallRequired(S, x.gid, s(r, "child_tid"));
                S.gaudit(x.gid, x.a, "link.remove", s(r, "child_tid"), p[0], reason, null, true, req); List<ObjectNode> L = new ArrayList<>(List.of(r)); names(S, L, "child_tid"); ObjectNode o = O(); o.set("link", linkOut(L.get(0))); return o; })); });
        S.r("GET /api/group/dash", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); limit(S, "grp-dash:" + email(x.a), 60, 60000L); Range rg = S.range(req, 0);
            ObjectNode o = dash(S, x, req, rg); S.T(() -> { S.gaudit(x.gid, x.a, "dash.view", str(qp(req, "tid"), 40).isEmpty() ? null : str(qp(req, "tid"), 40), rg.from + "~" + rg.to, null, null, true, req); return null; }); return o; });
        S.r("GET /api/group/dash/export", (req, res, raw, p) -> { G x = S.needGrp(req, "export"); limit(S, "grp-dash:" + email(x.a), 60, 60000L); Range rg = S.range(req, 0);
            ObjectNode o = dash(S, x, req, rg); String fmt = "xlsx".equals(qp(req, "format")) ? "xlsx" : "csv";
            S.T(() -> { S.gaudit(x.gid, x.a, "dash.export", null, rg.from + "~" + rg.to + ":" + fmt, null, null, true, req); return null; });
            StringBuilder sb = new StringBuilder("﻿# 가명 집계 · 5명 미만 가림 · 내려받은 사람 " + mask(email(x.a)) + " · 일시 " + kstIso(isoNow()) + "\n");
            List<String> K = new ArrayList<>(); o.get("kpis").forEach(k -> K.add(k.asText())); sb.append("기관,소속 구분"); for (String k : K) sb.append(',').append(k); sb.append('\n');
            for (JsonNode c : o.get("children")) { sb.append(csv(S(get(c, "label")))).append(',').append(csv(S(get(c, "unit")))); for (String k : K) { JsonNode v = get(get(c, "v"), k); sb.append(',').append(nullish(v) ? "" : csv(S(v))); } sb.append('\n'); }
            res.setHeader("content-type", "text/csv; charset=utf-8"); res.setHeader("content-disposition", "attachment; filename=\"group-dash-" + rg.from + "_" + rg.to + ".csv\"");
            res.getOutputStream().write(sb.toString().getBytes(StandardCharsets.UTF_8)); return null; });
        S.r("GET /api/group/rules", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); return O().set("rules", rulesOf(S, x.gid)); });
        S.r("PUT /api/group/rules", (req, res, raw, p) -> { G x = S.needGrp(req, "staff"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "rules.put", get(b, "idem"), () -> { List<JsonNode> L = arr(get(b, "rules")); if (L.size() > 20 || !isObj(get(b, "rules"))) throw S.E("grp_rule");
                for (JsonNode r : L) { if (!KPI_ALL.contains(S(get(r, "kpi"))) || !List.of("lt", "gt").contains(S(get(r, "op"))) || !Double.isFinite(num(get(r, "value"))) || get(r, "value") == null || nullish(get(r, "value")) || !List.of("week", "month").contains(S(get(r, "period"))) || len(get(r, "label"), 1, 40) == null) throw S.E("grp_rule"); }
                db.x("delete from grp_rule where group_id = $1", x.gid); int i = 1;
                for (JsonNode r : L) db.x("insert into grp_rule (group_id, n, kpi, op, value, period, label) values ($1,$2,$3,$4,$5,$6,$7)", x.gid, i++, S(get(r, "kpi")), S(get(r, "op")), num(get(r, "value")), S(get(r, "period")), len(get(r, "label"), 1, 40));
                S.gaudit(x.gid, x.a, "rules.put", null, String.valueOf(L.size()), null, null, true, req); return O().set("rules", rulesOf(S, x.gid)); })); });
        S.r("GET /api/group/learners/summary", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); if ("grp_content".equals(x.role) && !x.perms.contains("export")) throw S.E("grp_role"); Range rg = S.range(req, 28);
            return S.T(() -> { ObjectNode o = learners(S, x, rg); S.gaudit(x.gid, x.a, "learners.summary", null, rg.from + "~" + rg.to, null, null, true, req); return o; }); });
        S.r("POST /api/group/learners/lookup", (req, res, raw, p) -> { G x = S.needGrp(req, "learner"); JsonNode b = body(raw); S.needFresh(x.a);
            String purpose = len(get(b, "purpose"), 10, 200); if (purpose == null) throw S.E("grp_purpose");
            limit(S, "grp-lx:" + email(x.a), 30, 3600000L); limit(S, "grp-lxd:" + x.gid, 200, 86400000L);
            String sno = str(get(get(b, "key"), "studentNo"), 40).replaceAll("[^0-9A-Za-z]", ""); if (sno.isEmpty()) throw S.E(400, "key", "학번을 입력하십시오.");
            return S.T(() -> S.idem(tid(x.a), "learners.lookup", get(b, "idem"), () -> lookup(S, x, sno, purpose, req))); });
        S.r("GET /api/group/shares", (req, res, raw, p) -> { G x = S.needGrp(req, "view"); String dir = "up".equals(qp(req, "dir")) ? "up" : "down"; String st = qp(req, "status");
            return S.T(() -> { ArrayNode a = F.arrayNode(); for (ObjectNode r : db.q("select * from grp_share where group_id = $1 and dir = $2 order by updated_at desc, id", x.gid, dir)) { if (st != null && !st.isEmpty() && !st.equals(s(r, "status"))) continue; a.add(shareOut(r, db.q("select * from grp_share_tgt where share_id = $1", s(r, "id")))); } return O().set("items", a); }); });
        S.r("POST /api/group/shares", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = bigBody(raw);
            String kind = S(get(b, "kind")); if (!List.of("course", "page", "notice").contains(kind)) throw S.E(400, "kind", "공유할 콘텐츠 종류를 고르십시오.");
            ObjectNode snap = snapOf(S, tid(x.a), kind, get(b, "source"));
            return S.T(() -> S.idem(tid(x.a), "shares", get(b, "idem"), () -> {
                String title = undef(get(b, "title")) || nullish(get(b, "title")) ? titleOf(snap) : len(get(b, "title"), 1, 80); if (title == null || title.isEmpty()) throw S.E(400, "title", "제목을 입력하십시오.");
                JsonNode tg = "all".equals(S(get(b, "targets"))) ? t("all") : tidArr(get(b, "targets"));
                ObjectNode r = db.q1("insert into grp_share (id, group_id, dir, from_tid, kind, title, ver, snap, lic, required, targets, status, note, by, at, updated_at) values ($1,$2,'down',$3,$4,$5,1,$6,$7,$8,$9,'draft',$10,$11,now(),now()) returning *",
                    rid("gs_"), x.gid, tid(x.a), kind, title, snap, O().put("origin", "own").put("mk", false).put("src", srcId(kind, get(b, "source"))), truthy(get(b, "required")), tg, str(get(b, "note"), 200), email(x.a));
                db.x("insert into grp_share_ver (share_id, ver, snap, note, at) values ($1,1,$2,$3,now())", s(r, "id"), snap, str(get(b, "note"), 200));
                S.gaudit(x.gid, x.a, "share.create", null, s(r, "id"), null, null, true, req); ObjectNode o = O(); o.set("share", shareOut(r, List.of())); return o; })); });
        S.p("POST", "^/api/group/shares/(gs_[a-z0-9]{12})/publish$", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "shares.publish:" + p[0], get(b, "idem"), () -> { ObjectNode r = db.q1("select * from grp_share where id = $1 and group_id = $2 and dir = 'down' for update", p[0], x.gid); if (r == null || !"draft".equals(s(r, "status"))) throw S.E("grp_state");
                offer(S, x.gid, r, g(r, "targets")); ObjectNode u = db.q1("update grp_share set status = 'published', updated_at = now() where id = $1 returning *", p[0]);
                S.gaudit(x.gid, x.a, "share.publish", null, p[0], null, null, true, req); ObjectNode o = O(); o.set("share", shareOut(u, db.q("select * from grp_share_tgt where share_id = $1", p[0]))); return o; })); });
        S.p("POST", "^/api/group/shares/(gs_[a-z0-9]{12})/version$", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = body(raw);
            ObjectNode r0 = S.T(() -> db.q1("select * from grp_share where id = $1 and group_id = $2 and dir = 'down'", p[0], x.gid)); if (r0 == null || "recalled".equals(s(r0, "status"))) throw S.E("grp_state");
            String sk = S(get(g(r0, "lic"), "src")); ObjectNode snap = sk.isEmpty() ? (ObjectNode) g(r0, "snap") : snapOf(S, tid(x.a), s(r0, "kind"), O().put("courseId", sk).put("pageId", sk).put("noticeId", sk));
            return S.T(() -> S.idem(tid(x.a), "shares.version:" + p[0], get(b, "idem"), () -> { ObjectNode r = db.q1("select * from grp_share where id = $1 for update", p[0]); if (n(r, "ver") != n(r0, "ver")) throw S.E("grp_ver");
                long v = n(r, "ver") + 1; String note = str(get(b, "note"), 200);
                ObjectNode u = db.q1("update grp_share set ver = $2, snap = $3, note = $4, updated_at = now() where id = $1 returning *", p[0], v, snap, note);
                db.x("insert into grp_share_ver (share_id, ver, snap, note, at) values ($1,$2,$3,$4,now())", p[0], v, snap, note);
                db.x("delete from grp_share_ver where share_id = $1 and ver <= $2", p[0], v - 10);
                S.gaudit(x.gid, x.a, "share.version", null, p[0] + ":" + v, null, null, true, req); ObjectNode o = O(); o.set("share", shareOut(u, db.q("select * from grp_share_tgt where share_id = $1", p[0]))); return o; })); });
        S.p("POST", "^/api/group/shares/(gs_[a-z0-9]{12})/recall$", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = body(raw);
            List<ObjectNode> hide = new ArrayList<>(); String[] kind = { null };
            ObjectNode out = S.T(() -> S.idem(tid(x.a), "shares.recall:" + p[0], get(b, "idem"), () -> { String reason = len(get(b, "reason"), 5, 200); if (reason == null) throw S.E(400, "reason", "회수 사유를 5~200자로 적어 주십시오.");
                String mode = "hide".equals(S(get(b, "mode"))) ? "hide" : "notify";
                ObjectNode r = db.q1("update grp_share set status = 'recalled', updated_at = now() where id = $1 and group_id = $2 and status = 'published' returning *", p[0], x.gid); if (r == null) throw S.E("grp_state");
                kind[0] = s(r, "kind"); if ("hide".equals(mode) && B(r, "required")) hide.addAll(db.q("select * from grp_share_tgt where share_id = $1 and status = 'adopted'", p[0]));
                db.x("update grp_share_tgt set status = 'recalled', at = now() where share_id = $1 and status = 'offered'", p[0]);
                S.gaudit(x.gid, x.a, "share.recall", null, p[0] + ":" + mode, reason, null, true, req); ObjectNode o = O(); o.set("share", shareOut(r, db.q("select * from grp_share_tgt where share_id = $1", p[0]))); return o; }));
            for (ObjectNode t0 : hide) hideLocal(S, s(t0, "child_tid"), kind[0], s(t0, "local_id")); return out; });
        S.p("GET", "^/api/group/shares/(gs_[a-z0-9]{12})/targets$", (req, res, raw, p) -> { G x = S.needGrp(req, "view");
            List<ObjectNode> L = S.T(() -> { if (db.q1("select 1 from grp_share where id = $1 and group_id = $2", p[0], x.gid) == null) throw S.E(404, "not_found", "없는 공유입니다."); return db.q("select t.*, l.label from grp_share_tgt t left join grp_link l on l.group_id = $2 and l.child_tid = t.child_tid and l.status = 'active' where t.share_id = $1 order by t.child_tid", p[0], x.gid); });
            ArrayNode a = F.arrayNode(); for (ObjectNode t0 : L) { ObjectNode o = a.addObject(); o.set("childTid", g(t0, "child_tid")); o.set("label", g(t0, "label")); o.set("status", g(t0, "status")); o.set("ver", g(t0, "ver")); o.set("adoptedAt", "adopted".equals(s(t0, "status")) ? g(t0, "at") : F.nullNode()); }
            return O().set("items", a); });
        S.p("POST", "^/api/group/requests/(gs_[a-z0-9]{12})/approve$", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "requests.approve:" + p[0], get(b, "idem"), () -> { ObjectNode r = db.q1("select * from grp_share where id = $1 and group_id = $2 and dir = 'up' for update", p[0], x.gid); if (r == null || !"requested".equals(s(r, "status"))) throw S.E("grp_state");
                if (B(g(r, "lic"), "mk")) throw S.E("grp_license");
                ObjectNode u = db.q1("update grp_share set status = 'approved', updated_at = now() where id = $1 returning *", p[0]);
                if (truthy(get(b, "redistribute"))) { JsonNode tg = undef(get(b, "targets")) || "all".equals(S(get(b, "targets"))) ? t("all") : tidArr(get(b, "targets"));
                    ObjectNode d = db.q1("insert into grp_share (id, group_id, dir, from_tid, kind, title, ver, snap, lic, required, targets, status, note, by, at, updated_at) values ($1,$2,'down',$3,$4,$5,1,$6,$7,$8,$9,'published',$10,$11,now(),now()) returning *",
                        rid("gs_"), x.gid, s(r, "from_tid"), s(r, "kind"), s(r, "title"), g(r, "snap"), O().put("origin", "group").put("mk", false).put("from", s(r, "id")), truthy(get(b, "required")), tg, s(r, "note"), email(x.a));
                    db.x("insert into grp_share_ver (share_id, ver, snap, note, at) values ($1,1,$2,$3,now())", s(d, "id"), g(r, "snap"), s(r, "note")); offer(S, x.gid, d, tg); }
                S.gaudit(x.gid, x.a, "request.approve", s(r, "from_tid"), p[0], null, null, true, req); ObjectNode o = O(); o.set("share", shareOut(u, null)); return o; })); });
        S.p("POST", "^/api/group/requests/(gs_[a-z0-9]{12})/reject$", (req, res, raw, p) -> { G x = S.needGrp(req, "content"); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(x.a), "requests.reject:" + p[0], get(b, "idem"), () -> {
                ObjectNode u = db.q1("update grp_share set status = 'rejected', note = coalesce(nullif($3, ''), note), updated_at = now() where id = $1 and group_id = $2 and dir = 'up' and status = 'requested' returning *", p[0], x.gid, str(get(b, "reason"), 200)); if (u == null) throw S.E("grp_state");
                S.gaudit(x.gid, x.a, "request.reject", s(u, "from_tid"), p[0], str(get(b, "reason"), 200), null, true, req); ObjectNode o = O(); o.set("share", shareOut(u, null)); return o; })); });
        S.r("GET /api/group/policies", (req, res, raw, p) -> { G x = S.needGrp(req, "view");
            return S.T(() -> { long tot = n(db.q1("select count(*)::int n from grp_link where group_id = $1 and status = 'active'", x.gid), "n"); ArrayNode a = F.arrayNode();
                for (ObjectNode r : db.q("select * from grp_policy where group_id = $1 order by key", x.gid)) { ObjectNode o = a.addObject(); o.set("key", g(r, "key")); o.set("ver", g(r, "ver")); o.set("lock", g(r, "lock")); o.set("value", g(r, "value"));
                    ObjectNode c = db.q1("select count(*) filter (where pa.state = 'applied' and pa.ver = $3)::int ap, count(*) filter (where pa.state = 'overridden')::int ov from grp_policy_apply pa join grp_link l on l.group_id = pa.group_id and l.child_tid = pa.child_tid and l.status = 'active' where pa.group_id = $1 and pa.key = $2", x.gid, s(r, "key"), n(r, "ver"));
                    o.putObject("applied").put("total", tot).put("applied", n(c, "ap")).put("overridden", n(c, "ov")).put("pending", Math.max(0, tot - n(c, "ap") - n(c, "ov"))); }
                return O().set("items", a); }); });
        S.p("PUT", "^/api/group/policies/([a-z]{2,10})$", (req, res, raw, p) -> { G x = S.needGrp(req, "policy"); if (!POLICY_KEYS.contains(p[0])) throw S.E("grp_policy_key"); JsonNode b = DdWeb.readBody(raw, 300 * 1024);
            return S.T(() -> S.idem(tid(x.a), "policies.put:" + p[0], get(b, "idem"), () -> { JsonNode v = get(b, "value"); if (undef(v)) throw S.E(400, "value", "설정 값(value)을 보내십시오.");
                if (v.toString().getBytes(StandardCharsets.UTF_8).length > 256 * 1024) throw S.E("grp_size"); String lock = "locked".equals(S(get(b, "lock"))) ? "locked" : "default";
                ObjectNode cur = db.q1("select * from grp_policy where group_id = $1 and key = $2 for update", x.gid, p[0]); long base = (long) num(nullish(get(b, "baseVer")) ? t("0") : get(b, "baseVer")); if (Double.isNaN(num(nullish(get(b, "baseVer")) ? t("0") : get(b, "baseVer")))) base = -1;
                if ((cur == null && base != 0) || (cur != null && n(cur, "ver") != base)) throw S.E("grp_ver");
                ObjectNode r = db.q1("insert into grp_policy (group_id, key, ver, lock, value, by, at) values ($1,$2,1,$3,$4,$5,now()) on conflict (group_id, key) do update set ver = grp_policy.ver + 1, lock = $3, value = $4, by = $5, at = now() returning *", x.gid, p[0], lock, v, email(x.a));
                S.gaudit(x.gid, x.a, "policy.put", null, p[0] + ":" + n(r, "ver"), null, null, true, req); ObjectNode o = O(); ObjectNode po = o.putObject("policy"); po.set("key", g(r, "key")); po.set("ver", g(r, "ver")); po.set("lock", g(r, "lock")); po.set("value", g(r, "value")); return o; })); });
        S.p("POST", "^/api/group/policies/([a-z]{2,10})/apply$", (req, res, raw, p) -> { G x = S.needGrp(req, "policy"); if (!POLICY_KEYS.contains(p[0])) throw S.E("grp_policy_key"); JsonNode b = body(raw);
            List<String[]> writes = new ArrayList<>();
            ObjectNode out = S.T(() -> S.idem(tid(x.a), "policies.apply:" + p[0], get(b, "idem"), () -> { ObjectNode pol = db.q1("select * from grp_policy where group_id = $1 and key = $2", x.gid, p[0]); if (pol == null) throw S.E("grp_state");
                List<String> want = "all".equals(S(get(b, "targets"))) || undef(get(b, "targets")) ? null : tids(get(b, "targets")); long ap = 0; ArrayNode sk = F.arrayNode();
                List<ObjectNode> links = db.q("select child_tid from grp_link where group_id = $1 and status = 'active' order by child_tid", x.gid); List<String> act = new ArrayList<>(); for (ObjectNode l : links) act.add(s(l, "child_tid"));
                if (want != null) for (String t0 : want) if (!act.contains(t0)) sk.addObject().put("childTid", t0).put("reason", "left");
                for (String c : act) { if (want != null && !want.contains(c)) continue; ObjectNode pa = db.q1("select state from grp_policy_apply where group_id = $1 and child_tid = $2 and key = $3", x.gid, c, p[0]);
                    if (pa != null && "overridden".equals(s(pa, "state")) && !"locked".equals(s(pol, "lock"))) { sk.addObject().put("childTid", c).put("reason", "overridden"); continue; }
                    db.x("insert into grp_policy_apply (group_id, child_tid, key, ver, state, at) values ($1,$2,$3,$4,'applied',now()) on conflict (group_id, child_tid, key) do update set ver = $4, state = 'applied', at = now()", x.gid, c, p[0], n(pol, "ver"));
                    writes.add(new String[]{ c, O().put("ver", n(pol, "ver")).put("lock", s(pol, "lock")).put("state", "applied").set("value", g(pol, "value")).toString() }); ap++; }
                S.gaudit(x.gid, x.a, "policy.apply", null, p[0] + ":" + n(pol, "ver"), null, null, true, req); ObjectNode o = O().put("applied", ap); o.set("skipped", sk); return o; }));
            for (String[] w : writes) S.ttx.inTenant(w[0], () -> S.mapper.updateDocPath(w[0], p[0], w[1])); return out; });
        S.r("GET /api/group/audit", (req, res, raw, p) -> { G x = S.needGrp(req, "audit"); String from = qp(req, "from"), to = qp(req, "to");
            List<ObjectNode> L = S.T(() -> db.q("select * from grp_audit where group_id = $1 and ($2::date is null or (at at time zone 'Asia/Seoul')::date >= $2::date) and ($3::date is null or (at at time zone 'Asia/Seoul')::date <= $3::date) and ($4::text is null or action = $4) and ($5::text is null or actor = $5) and ($6::text is null or child_tid = $6) order by id desc limit 5000",
                x.gid, from != null && DAY_RE.matcher(from).matches() ? from : null, to != null && DAY_RE.matcher(to).matches() ? to : null, emptyNull(qp(req, "action")), emptyNull(qp(req, "actor")), emptyNull(qp(req, "childTid"))));
            List<ObjectNode> out = new ArrayList<>(); for (ObjectNode r : L) { ObjectNode o = O(); o.set("at", g(r, "at")); o.set("actor", g(r, "actor")); o.set("action", g(r, "action")); o.set("childTid", g(r, "child_tid")); o.set("target", g(r, "target")); o.set("purpose", g(r, "purpose")); o.put("ok", B(r, "ok")); out.add(o); }
            return pageOf(req, out); });

        /* ── 1-5 소속 기관 ── */
        S.r("GET /api/group/my", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req);
            List<ObjectNode> L = S.T(() -> db.q("select l.*, g.name g_name, g.kind g_kind, g.owner_tid g_owner from grp_link l join grp_group g on g.id = l.group_id where (l.child_tid = $1 and l.status = 'active') or (l.invite_to = $1 and l.status = 'invited' and l.expires_at > now()) order by l.invited_at desc", tid(a)));
            ObjectNode o = O(); ArrayNode inv = F.arrayNode(); ObjectNode link = null;
            for (ObjectNode r : L) { ObjectNode t0 = S.tenantOf(s(r, "g_owner")); ObjectNode gr = O(); gr.set("name", g(r, "g_name")); gr.set("kind", g(r, "g_kind")); gr.put("ownerName", t0 == null ? "" : S(g(t0, "name")));
                if ("active".equals(s(r, "status"))) { link = O(); link.set("linkId", g(r, "id")); link.set("status", g(r, "status")); link.set("group", gr); link.set("label", g(r, "label")); link.set("unit", g(r, "unit")); link.set("share", g(r, "share")); link.set("acceptedAt", g(r, "accepted_at")); }
                else { ObjectNode i = inv.addObject(); i.set("linkId", g(r, "id")); i.set("group", gr); i.set("label", g(r, "label")); i.set("ask", g(r, "ask")); i.set("expiresAt", g(r, "expires_at")); } }
            if (link == null) o.putNull("link"); else o.set("link", link); o.set("invites", inv); return o; });
        S.r("POST /api/group/my/accept", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); JsonNode b = body(raw); limit(S, "grp-acc:" + tid(a), 20, 3600000L);
            return S.T(() -> S.idem(tid(a), "my.accept", get(b, "idem"), () -> {
                String code = trim(str(get(b, "code"), 20)).toUpperCase(java.util.Locale.ROOT), lid = str(get(b, "linkId"), 20); ObjectNode r;
                if (!code.isEmpty()) { r = db.q1("select l.*, g.kind g_kind, g.owner_tid g_owner from grp_link l join grp_group g on g.id = l.group_id where l.code_hash = $1 for update of l", sha(code));
                    if (r == null || (!"invited".equals(s(r, "status")) && !"expired".equals(s(r, "status")))) throw S.E("grp_invite_code"); }
                else { r = lid.isEmpty() ? null : db.q1("select l.*, g.kind g_kind, g.owner_tid g_owner from grp_link l join grp_group g on g.id = l.group_id where l.id = $1 and l.invite_to = $2 for update of l", lid, tid(a)); if (r == null) throw S.E("grp_invite_code"); if (!"invited".equals(s(r, "status")) && !"expired".equals(s(r, "status"))) throw S.E("grp_state"); }
                if (s(r, "invite_to") != null && !tid(a).equals(s(r, "invite_to"))) throw S.E("grp_invite_code");
                if ("expired".equals(s(r, "status")) || db.q1("select 1 from grp_link where id = $1 and expires_at < now()", s(r, "id")) != null) throw S.E("grp_invite_expired");
                if (tid(a).equals(s(r, "g_owner"))) throw S.E("grp_self");
                if (!AGREE_VER.equals(S(get(b, "agreeVer"))) || !isObj(get(b, "share"))) throw S.E("grp_terms");
                if (db.q1("select 1 from grp_link where child_tid = $1 and status = 'active' and group_id = $2", tid(a), s(r, "group_id")) != null) throw S.E("grp_child");
                ObjectNode sh = shareFlags(get(b, "share"), s(r, "g_kind")); sh.put("agreeVer", AGREE_VER).put("at", isoNow()).put("by", email(a));
                ObjectNode u; try { u = db.q1("update grp_link set child_tid = $2, status = 'active', share = $3, agree_ver = $4, accepted_by = $5, accepted_at = now() where id = $1 returning *", s(r, "id"), tid(a), sh, AGREE_VER, email(a)); }
                catch (DuplicateKeyException e) { throw S.E("grp_child"); }
                S.gaudit(s(r, "group_id"), a, "link.accept", tid(a), s(r, "id"), null, null, true, req);
                List<ObjectNode> L = new ArrayList<>(List.of(u)); names(S, L, "child_tid"); ObjectNode o = O(); o.set("link", linkOut(L.get(0))); return o; })); });
        S.r("POST /api/group/my/decline", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "my.decline", get(b, "idem"), () -> { ObjectNode u = db.q1("update grp_link set status = 'declined', ended_by = $3, ended_at = now() where id = $1 and invite_to = $2 and status = 'invited' returning *", str(get(b, "linkId"), 20), tid(a), email(a));
                if (u == null) throw S.E("grp_state"); S.gaudit(s(u, "group_id"), a, "link.decline", tid(a), s(u, "id"), null, null, true, req); return O().put("ok", true); })); });
        S.r("PUT /api/group/my/share", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "my.share", get(b, "idem"), () -> { ObjectNode r = db.q1("select l.*, g.kind g_kind from grp_link l join grp_group g on g.id = l.group_id where l.child_tid = $1 and l.status = 'active' for update of l", tid(a)); if (r == null) throw S.E("grp_state");
                if (!AGREE_VER.equals(S(get(b, "agreeVer"))) || !isObj(get(b, "share"))) throw S.E("grp_terms");
                ObjectNode sh = shareFlags(get(b, "share"), s(r, "g_kind")); sh.put("agreeVer", AGREE_VER).put("at", isoNow()).put("by", email(a));
                ObjectNode u = db.q1("update grp_link set share = $2, agree_ver = $3 where id = $1 returning *", s(r, "id"), sh, AGREE_VER);
                S.gaudit(s(r, "group_id"), a, "link.share", tid(a), s(r, "id"), null, null, true, req); List<ObjectNode> L = new ArrayList<>(List.of(u)); names(S, L, "child_tid"); ObjectNode o = O(); o.set("link", linkOut(L.get(0))); return o; })); });
        S.r("POST /api/group/my/leave", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "my.leave", get(b, "idem"), () -> { String reason = len(get(b, "reason"), 5, 200); if (reason == null) throw S.E(400, "reason", "해제 사유를 5~200자로 적어 주십시오.");
                ObjectNode u = db.q1("update grp_link set status = 'left', ended_by = $2, ended_at = now(), end_reason = $3 where child_tid = $1 and status = 'active' returning *", tid(a), email(a), reason); if (u == null) throw S.E("grp_state");
                long req0 = n(db.q1("select count(*)::int n from grp_share_tgt t join grp_share s on s.id = t.share_id where s.group_id = $1 and s.required and t.child_tid = $2 and t.status = 'adopted'", s(u, "group_id"), tid(a)), "n");
                recallRequired(S, s(u, "group_id"), tid(a));
                S.gaudit(s(u, "group_id"), a, "link.leave", tid(a), s(u, "id"), reason, null, true, req); List<ObjectNode> L = new ArrayList<>(List.of(u)); names(S, L, "child_tid"); ObjectNode o = O(); o.set("link", linkOut(L.get(0)));
                if (req0 > 0) o.putObject("warn").put("code", "grp_required").put("count", req0).put("message", "필수 배포 과정 " + req0 + "개는 해제와 함께 회수됩니다. 우리 기관이 직접 만든 사본 · 수정본은 남습니다."); return o; })); });
        S.r("GET /api/group/my/inbox", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req); String st = qp(req, "status");
            return S.T(() -> { ArrayNode out = F.arrayNode();
                for (ObjectNode r : db.q("select s.*, t.status t_status, t.ver t_ver from grp_share_tgt t join grp_share s on s.id = t.share_id join grp_link l on l.group_id = s.group_id and l.child_tid = t.child_tid and l.status = 'active' where t.child_tid = $1 and s.dir = 'down' order by s.updated_at desc", tid(a))) {
                    String ts = "recalled".equals(s(r, "status")) ? "recalled" : s(r, "t_status"); if (st != null && !st.isEmpty() && !st.equals(ts)) continue;
                    ObjectNode o = out.addObject(); o.set("sid", g(r, "id")); o.set("kind", g(r, "kind")); o.set("title", g(r, "title")); o.set("ver", g(r, "ver")); o.put("required", B(r, "required")); o.put("status", ts); o.set("myVer", g(r, "t_ver")); o.set("note", g(r, "note")); }
                return O().set("items", out); }); });
        S.p("POST", "^/api/group/my/inbox/(gs_[a-z0-9]{12})/adopt$", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req); JsonNode b = body(raw); return adopt(S, a, req, b, p[0], false); });
        S.p("POST", "^/api/group/my/inbox/(gs_[a-z0-9]{12})/update$", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req); JsonNode b = body(raw); return adopt(S, a, req, b, p[0], true); });
        S.p("POST", "^/api/group/my/inbox/(gs_[a-z0-9]{12})/decline$", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req); JsonNode b = body(raw);
            return S.T(() -> S.idem(tid(a), "my.inbox.decline:" + p[0], get(b, "idem"), () -> { ObjectNode r = tgtOf(S, tid(a), p[0]); if (r == null || !"offered".equals(s(r, "t_status")) || !"published".equals(s(r, "status"))) throw S.E("grp_state"); if (B(r, "required")) throw S.E("grp_required");
                db.x("update grp_share_tgt set status = 'declined', at = now() where share_id = $1 and child_tid = $2", p[0], tid(a)); S.gaudit(s(r, "group_id"), a, "share.decline", tid(a), p[0], str(get(b, "reason"), 200), null, true, req); return O().put("ok", true); })); });
        S.r("POST /api/group/my/up", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req); JsonNode b = bigBody(raw);
            String kind = S(get(b, "kind")); if (!List.of("course", "page", "notice").contains(kind)) throw S.E(400, "kind", "공유할 콘텐츠 종류를 고르십시오.");
            ObjectNode link = S.T(() -> db.q1("select * from grp_link where child_tid = $1 and status = 'active'", tid(a))); if (link == null) throw S.E("grp_state");
            ObjectNode snap = snapOf(S, tid(a), kind, get(b, "source"));
            return S.T(() -> S.idem(tid(a), "my.up", get(b, "idem"), () -> { String title = len(get(b, "title"), 1, 80); if (title == null) title = titleOf(snap); if (title.isEmpty()) throw S.E(400, "title", "제목을 입력하십시오.");
                ObjectNode r = db.q1("insert into grp_share (id, group_id, dir, from_tid, kind, title, ver, snap, lic, required, targets, status, note, by, at, updated_at) values ($1,$2,'up',$3,$4,$5,1,$6,$7,false,'[]'::jsonb,'requested',$8,$9,now(),now()) returning *",
                    rid("gs_"), s(link, "group_id"), tid(a), kind, title, snap, O().put("origin", "own").put("mk", false), str(get(b, "note"), 200), email(a));
                S.gaudit(s(link, "group_id"), a, "request.up", tid(a), s(r, "id"), null, null, true, req); ObjectNode o = O(); o.set("share", shareOut(r, null)); return o; })); });
        S.r("GET /api/group/my/policies", (req, res, raw, p) -> { Map<String, Object> a = S.needChild(req);
            return S.T(() -> { ArrayNode out = F.arrayNode(); ObjectNode link = db.q1("select group_id from grp_link where child_tid = $1 and status = 'active'", tid(a)); if (link == null) return O().set("items", out);
                for (ObjectNode r : db.q("select p.*, pa.state pa_state, pa.ver pa_ver from grp_policy p left join grp_policy_apply pa on pa.group_id = p.group_id and pa.key = p.key and pa.child_tid = $2 where p.group_id = $1 order by p.key", s(link, "group_id"), tid(a))) {
                    ObjectNode o = out.addObject(); o.set("key", g(r, "key")); o.set("ver", g(r, "ver")); o.set("lock", g(r, "lock")); o.set("value", g(r, "value"));
                    ObjectNode mine = o.putObject("mine").put("state", nullish(g(r, "pa_state")) ? "pending" : s(r, "pa_state")); if (!nullish(g(r, "pa_ver"))) mine.set("ver", g(r, "pa_ver")); }
                return O().set("items", out); }); });
        S.p("POST", "^/api/group/my/policies/([a-z]{2,10})$", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); if (!POLICY_KEYS.contains(p[0])) throw S.E("grp_policy_key"); JsonNode b = DdWeb.readBody(raw, 300 * 1024);
            String[] w = { null };
            ObjectNode out = S.T(() -> S.idem(tid(a), "my.policies:" + p[0], get(b, "idem"), () -> { String act = S(get(b, "action")); if (!List.of("apply", "override", "reset").contains(act)) throw S.E(400, "action", "action은 apply · override · reset 중 하나입니다.");
                ObjectNode link = db.q1("select group_id from grp_link where child_tid = $1 and status = 'active'", tid(a)); if (link == null) throw S.E("grp_state");
                ObjectNode pol = db.q1("select * from grp_policy where group_id = $1 and key = $2", s(link, "group_id"), p[0]); if (pol == null) throw S.E("grp_state");
                if ("override".equals(act) && "locked".equals(s(pol, "lock"))) throw S.E("grp_locked");
                String state = "override".equals(act) ? "overridden" : "applied"; JsonNode val = "override".equals(act) ? get(b, "value") : g(pol, "value"); if (val == null || undef(val)) throw S.E(400, "value", "설정 값(value)을 보내십시오.");
                db.x("insert into grp_policy_apply (group_id, child_tid, key, ver, state, at) values ($1,$2,$3,$4,$5,now()) on conflict (group_id, child_tid, key) do update set ver = $4, state = $5, at = now()", s(link, "group_id"), tid(a), p[0], n(pol, "ver"), state);
                w[0] = O().put("ver", n(pol, "ver")).put("lock", s(pol, "lock")).put("state", state).set("value", val).toString();
                S.gaudit(s(link, "group_id"), a, "policy." + act, tid(a), p[0], null, null, true, req);
                ObjectNode o = O(); ObjectNode it = o.putObject("item"); it.put("key", p[0]); it.set("ver", g(pol, "ver")); it.set("lock", g(pol, "lock")); ObjectNode mine = it.putObject("mine").put("state", state); if ("overridden".equals(state)) mine.set("value", val); return o; }));
            if (w[0] != null) S.ttx.inTenant(tid(a), () -> S.mapper.updateDocPath(tid(a), p[0], w[0])); return out; });
        S.r("GET /api/group/my/audit", (req, res, raw, p) -> { Map<String, Object> a = S.needChildOwner(req); String from = qp(req, "from"), to = qp(req, "to");
            List<ObjectNode> L = S.T(() -> db.q("select * from grp_audit where child_tid = $1 and actor_tid is distinct from $1 and ($2::date is null or (at at time zone 'Asia/Seoul')::date >= $2::date) and ($3::date is null or (at at time zone 'Asia/Seoul')::date <= $3::date) order by id desc limit 1000",
                tid(a), from != null && DAY_RE.matcher(from).matches() ? from : null, to != null && DAY_RE.matcher(to).matches() ? to : null));
            ArrayNode out = F.arrayNode(); for (ObjectNode r : L) { ObjectNode o = out.addObject(); o.set("at", g(r, "at")); o.put("actorMask", mask(s(r, "actor"))); o.putNull("role"); o.set("action", g(r, "action")); o.set("purpose", g(r, "purpose")); }
            return O().set("items", out); });
    }
    static ArrayNode tidArr(JsonNode v) { ArrayNode a = F.arrayNode(); for (String t0 : tids(v)) a.add(t0); return a; }
    static String srcId(String kind, JsonNode src) { return str(get(src, "course".equals(kind) ? "courseId" : "page".equals(kind) ? "pageId" : "noticeId"), 60); }
    static String emptyNull(String v) { return v == null || v.isEmpty() ? null : v; }
    static String csv(String v) { return v.contains(",") || v.contains("\"") || v.contains("\n") || v.matches("^[=+\\-@].*") ? "\"" + (v.matches("^[=+\\-@].*") ? "'" : "") + v.replace("\"", "\"\"") + "\"" : v; }
    static ArrayNode staffItems(GroupServiceImpl S, G x) throws Exception {
        List<ObjectNode> L = S.T(() -> S.db.q("select user_id::text uid, role, at from grp_staff where group_id = $1 order by at, user_id", x.gid)); ArrayNode a = F.arrayNode();
        for (ObjectNode r : L) { ObjectNode u = S.ttx.plain(() -> S.db.q1("select email from users where id = $1::uuid and tenant_id = $2", s(r, "uid"), tid(x.a))); if (u == null) continue; ObjectNode o = a.addObject(); o.set("email", g(u, "email")); o.set("role", g(r, "role")); o.set("at", g(r, "at")); }
        return a;
    }
    static ArrayNode rulesOf(GroupServiceImpl S, String gid) throws Exception {
        List<ObjectNode> L = S.T(() -> S.db.q("select n, kpi, op, value::float8 value, period, label from grp_rule where group_id = $1 order by n", gid)); ArrayNode a = F.arrayNode();
        for (ObjectNode r : L) { ObjectNode o = a.addObject(); o.set("n", g(r, "n")); o.set("kpi", g(r, "kpi")); o.set("op", g(r, "op")); o.set("value", g(r, "value")); o.set("period", g(r, "period")); o.set("label", g(r, "label")); } return a;
    }
    /** 배포 대상 소속 기관(활성 연결)에 「받은 콘텐츠」 행을 만든다 */
    static void offer(GroupServiceImpl S, String gid, JsonNode share, JsonNode targets) {
        List<ObjectNode> links = S.db.q("select child_tid from grp_link where group_id = $1 and status = 'active'", gid); List<String> want = "all".equals(S(targets)) ? null : tids(targets);
        for (ObjectNode l : links) { String c = s(l, "child_tid"); if (want != null && !want.contains(c)) continue;
            S.db.x("insert into grp_share_tgt (share_id, child_tid, status, ver, at) values ($1,$2,'offered',null,now()) on conflict (share_id, child_tid) do nothing", s(share, "id"), c); }
    }
    /** 해제 · 탈퇴 시 필수 배포 콘텐츠 회수(판정 ②) — 소속 기관이 만든 사본 · 수정본은 그대로 */
    static void recallRequired(GroupServiceImpl S, String gid, String child) { S.db.x("update grp_share_tgt set status = 'recalled', at = now() where child_tid = $2 and share_id in (select id from grp_share where group_id = $1 and required) and status in ('offered','adopted')", gid, child); }
    static ObjectNode tgtOf(GroupServiceImpl S, String child, String sid) {
        return S.db.q1("select s.*, t.status t_status, t.ver t_ver, t.local_id from grp_share_tgt t join grp_share s on s.id = t.share_id join grp_link l on l.group_id = s.group_id and l.child_tid = t.child_tid and l.status = 'active' where t.share_id = $1 and t.child_tid = $2", sid, child);
    }
    static Object adopt(GroupServiceImpl S, Map<String, Object> a, HttpServletRequest req, JsonNode b, String sid, boolean upd) throws Exception {
        String route = (upd ? "my.inbox.update:" : "my.inbox.adopt:") + sid;
        ObjectNode pre = S.T(() -> { if (!truthy(get(b, "idem"))) throw S.E("idem"); ObjectNode ex = S.db.q1("select resp from grp_idem where tid = $1 and route = $2 and key = $3", tid(a), route, str(get(b, "idem"), 80)); if (ex != null) { ObjectNode r = ((ObjectNode) ex.get("resp")).deepCopy(); r.put("again", true); return r; }
            ObjectNode r = tgtOf(S, tid(a), sid); if (r == null || !"published".equals(s(r, "status"))) throw S.E("grp_state");
            if (upd) { if (!"adopted".equals(s(r, "t_status"))) throw S.E("grp_state"); if (n(r, "t_ver") >= n(r, "ver")) throw S.E("grp_ver"); }
            else if (!"offered".equals(s(r, "t_status")) && !"declined".equals(s(r, "t_status"))) throw S.E("grp_state");
            return O().put("_go", true).set("r", r); });
        if (!pre.has("_go")) return pre; JsonNode r = pre.get("r");
        String local = putLocal(S, tid(a), s(r, "kind"), g(r, "snap"), sid, n(r, "ver"), upd ? s(r, "local_id") : null);
        return S.T(() -> { S.db.x("update grp_share_tgt set status = 'adopted', ver = $3, local_id = $4, at = now() where share_id = $1 and child_tid = $2", sid, tid(a), n(r, "ver"), local);
            ObjectNode o = O().put("localId", local); if (upd) o.put("ver", n(r, "ver"));
            S.db.x("insert into grp_idem (tid, route, key, resp) values ($1,$2,$3,$4) on conflict do nothing", tid(a), route, str(get(b, "idem"), 80), o);
            S.gaudit(s(r, "group_id"), a, upd ? "share.update" : "share.adopt", tid(a), sid, null, null, true, req); return o; });
    }

    /** 1-7 대시보드 */
    static ObjectNode dash(GroupServiceImpl S, G x, HttpServletRequest req, Range rg) throws Exception {
        String kind = s(x.group, "kind"); List<String> K = kpisOf(req, kind); String only = emptyNull(str(qp(req, "tid"), 40));
        List<ObjectNode> links = S.T(() -> S.db.q("select * from grp_link where group_id = $1 and status = 'active' order by label, id", x.gid));
        List<ObjectNode> rows = S.T(() -> S.db.q("select child_tid, to_char(day, 'YYYY-MM-DD') d, v, at from grp_kpi_day where group_id = $1 and day between $2::date and $3::date order by day", x.gid, rg.from, rg.to));
        List<ObjectNode> rules = S.T(() -> S.db.q("select n, kpi, op, value::float8 value, label from grp_rule where group_id = $1 order by n", x.gid));
        Map<String, List<JsonNode>> by = new LinkedHashMap<>(); String asOf = null; for (ObjectNode r : rows) { by.computeIfAbsent(s(r, "child_tid"), k -> new ArrayList<>()).add(r); if (asOf == null || s(r, "at").compareTo(asOf) > 0) asOf = s(r, "at"); }
        ObjectNode o = O(); o.putObject("range").put("from", rg.from).put("to", rg.to).put("unit", rg.unit); if (asOf == null) o.putNull("asOf"); else o.put("asOf", kstIso(asOf));
        ArrayNode ka = o.putArray("kpis"); K.forEach(ka::add);
        Map<String, Long> tot = new LinkedHashMap<>(); List<String> totNo = new ArrayList<>(); ArrayNode ch = F.arrayNode(); ArrayNode stale = F.arrayNode(); List<ObjectNode> outs = new ArrayList<>();
        String yday = LocalDate.parse(today()).minusDays(1).toString(); String lastWanted = rg.to.compareTo(yday) < 0 ? rg.to : yday;
        TreeMap<String, Map<String, Map<String, List<JsonNode>>>> ser = new TreeMap<>();
        for (ObjectNode l : links) { String c = s(l, "child_tid"); if (only != null && !only.equals(c)) continue;
            List<JsonNode> D = by.getOrDefault(c, List.of()); Map<String, Long> m = fold(D); List<String> nc = noConsentOf(g(l, "share"), kind, K);
            for (String k : nc) if (!totNo.contains(k)) totNo.add(k);
            for (Map.Entry<String, Long> e : m.entrySet()) tot.merge(e.getKey(), e.getValue(), "act".equals(e.getKey()) ? Long::sum : Long::sum);
            ArrayNode masked = F.arrayNode(); ObjectNode v = vOut(m, K, nc, masked);
            ObjectNode co = O(); co.set("tid", g(l, "child_tid")); co.set("label", g(l, "label")); co.set("unit", g(l, "unit")); co.set("v", v); co.set("masked", masked); ArrayNode na = co.putArray("noConsent"); nc.forEach(na::add); co.putObject("rank");
            ArrayNode fl = co.putArray("flags"); for (ObjectNode ru : rules) { JsonNode cv = get(v, s(ru, "kpi")); if (cv == null || !cv.isNumber()) continue; double val = num(g(ru, "value")), xv = cv.asDouble();
                if (("lt".equals(s(ru, "op")) && xv < val) || ("gt".equals(s(ru, "op")) && xv > val)) { ObjectNode f = fl.addObject(); f.set("rule", g(ru, "n")); f.set("kpi", g(ru, "kpi")); f.set("label", g(ru, "label")); } }
            String last = null; for (JsonNode r : D) if (last == null || s(r, "d").compareTo(last) > 0) last = s(r, "d"); if (last == null || last.compareTo(lastWanted) < 0) stale.addObject().put("tid", c).put("lastDay", last);
            for (JsonNode r : D) ser.computeIfAbsent(bucket(s(r, "d"), rg.unit), k -> new LinkedHashMap<>()).computeIfAbsent(c, k -> new LinkedHashMap<>()).computeIfAbsent("d", k -> new ArrayList<>()).add(r);
            outs.add(co); ch.add(co); }
        /* 순위: 수료율(가림 · 비동의 제외), 높은 순 */
        List<ObjectNode> rk = new ArrayList<>(); for (ObjectNode co : outs) if (get(get(co, "v"), "cmpRateBp") != null && get(get(co, "v"), "cmpRateBp").isNumber()) rk.add(co);
        rk.sort((a1, b1) -> Long.compare(get(get(b1, "v"), "cmpRateBp").asLong(), get(get(a1, "v"), "cmpRateBp").asLong())); for (int i = 0; i < rk.size(); i++) ((ObjectNode) rk.get(i).get("rank")).put("cmpRateBp", i + 1);
        if (only != null) o.putNull("total"); else { ArrayNode tm = F.arrayNode(); ObjectNode tv = vOut(tot, K, totNo, tm); o.set("total", tv); }
        o.set("children", ch);
        ArrayNode sa = o.putArray("series"); for (Map.Entry<String, Map<String, Map<String, List<JsonNode>>>> e : ser.entrySet()) { long lrn = 0, act = 0; for (Map<String, List<JsonNode>> cm : e.getValue().values()) { Map<String, Long> m = fold(cm.get("d")); lrn += m.getOrDefault("lrn", 0L); act += m.getOrDefault("act", 0L); }
            ObjectNode si = sa.addObject().put("at", e.getKey()); si.set("lrn", people(lrn)); si.set("act", people(act)); }
        o.set("stale", stale); return o;
    }

    /** 1-8 통합 학습자 집계(grp_lx 가명 행 → 집계만) */
    static ObjectNode learners(GroupServiceImpl S, G x, Range rg) throws Exception {
        String kind = s(x.group, "kind"); MkDb db = S.db;
        if ("franchise".equals(kind)) throw S.E("grp_consent");
        List<ObjectNode> links = db.q("select * from grp_link where group_id = $1 and status = 'active' order by label", x.gid); long agreed = 0; List<String> ok = new ArrayList<>(); Map<String, String> lab = new LinkedHashMap<>();
        for (ObjectNode l : links) { lab.put(s(l, "child_tid"), s(l, "label")); if (B(g(l, "share"), "learnerAgg")) { agreed++; ok.add(s(l, "child_tid")); } }
        if (agreed == 0) throw S.E("grp_consent");
        ObjectNode o = O(); o.putObject("range").put("from", rg.from).put("to", rg.to);
        if (!"univ".equals(kind)) { o.put("basis", "unifiedId"); o.putNull("unified"); o.putObject("multi"); }
        List<ObjectNode> rows = db.q("select gkey, child_tid, dept from grp_lx where group_id = $1 and child_tid = any($2) and (last_ym is null or last_ym >= $3)", x.gid, ok, rg.from.substring(0, 7));
        Map<String, List<String>> per = new LinkedHashMap<>(); Map<String, Long> byC = new LinkedHashMap<>(), byD = new LinkedHashMap<>();
        for (ObjectNode r : rows) { per.computeIfAbsent(s(r, "gkey"), k -> new ArrayList<>()).add(s(r, "child_tid")); byC.merge(s(r, "child_tid"), 1L, Long::sum); }
        Map<String, String> deptOf = new LinkedHashMap<>(); for (ObjectNode r : rows) if (!S(g(r, "dept")).isEmpty()) deptOf.putIfAbsent(s(r, "gkey"), s(r, "dept"));
        for (String d : deptOf.values()) byD.merge(d, 1L, Long::sum);
        if ("univ".equals(kind)) { o.put("basis", "studentNo"); o.set("unified", people(per.size())); long m1 = 0, m2 = 0, m3 = 0; for (List<String> l : per.values()) { if (l.size() == 1) m1++; else if (l.size() == 2) m2++; else m3++; }
            ObjectNode mu = o.putObject("multi"); mu.set("1", people(m1)); mu.set("2", people(m2)); mu.set("3+", people(m3)); }
        ArrayNode bc = o.putArray("byChild"); for (String c : ok) { long sh = 0; for (List<String> l : per.values()) if (l.size() > 1 && l.contains(c)) sh++; ObjectNode e = bc.addObject().put("tid", c).put("label", lab.get(c)); e.set("lrn", people(byC.getOrDefault(c, 0L))); e.set("shared", people(sh)); }
        ArrayNode bd = o.putArray("byDept"); long small = 0; for (Map.Entry<String, Long> e : byD.entrySet()) { if (e.getValue() < 5) small += e.getValue(); else bd.addObject().put("dept", e.getKey()).put("lrn", e.getValue()); } if (small > 0) bd.addObject().put("dept", "(5명 미만 학과 묶음)").set("lrn", people(small));
        Map<String, Long> fl = new LinkedHashMap<>(); for (List<String> l : per.values()) if (l.size() > 1) for (int i = 0; i + 1 < l.size(); i++) fl.merge(lab.get(l.get(i)) + "\u0000" + lab.get(l.get(i + 1)), 1L, Long::sum);
        ArrayNode fa = o.putArray("flows"); long fs = 0; for (Map.Entry<String, Long> e : fl.entrySet()) { if (e.getValue() < 5) { fs += e.getValue(); continue; } String[] k = e.getKey().split("\u0000"); fa.addObject().put("from", k[0]).put("to", k[1]).put("n", e.getValue()); }
        if (fs > 0) fa.addObject().put("from", "(5명 미만 묶음)").put("to", "(5명 미만 묶음)").set("n", people(fs));
        o.putObject("consent").put("agreed", agreed).put("total", links.size()); return o;
    }

    /** 학습자 개별 열람 — 상위 범위 감사 → 소속 기관마다 자기 범위에서 동의 필드만 → 그 기관 audit_log에도 기록 */
    static ObjectNode lookup(GroupServiceImpl S, G x, String sno, String purpose, HttpServletRequest req) throws Exception {
        String kind = s(x.group, "kind"); if (!"univ".equals(kind)) throw S.E("grp_consent");
        String gkey = hmac(s(x.group, "salt"), sno.replaceAll("[^0-9]", "").isEmpty() ? sno : sno.replaceAll("[^0-9]", "")).substring(0, 32);
        List<ObjectNode> links = S.db.q("select * from grp_link where group_id = $1 and status = 'active' order by label", x.gid); List<ObjectNode> ok = new ArrayList<>(); long hidden = 0;
        for (ObjectNode l : links) { JsonNode ld = get(g(l, "share"), "learnerDetail"); if (B(ld, "on")) ok.add(l); else hidden++; }
        if (ok.isEmpty()) { S.gaudit(x.gid, x.a, "learner.view", null, gkey.substring(0, 10), purpose, null, false, req); throw S.E("grp_consent"); }
        S.gaudit(x.gid, x.a, "learner.view", null, gkey.substring(0, 10), purpose, null, true, req);
        ArrayNode items = F.arrayNode();
        for (ObjectNode l : ok) { String c = s(l, "child_tid"); List<String> fields = new ArrayList<>(); for (JsonNode f : arr(get(get(g(l, "share"), "learnerDetail"), "fields"))) fields.add(f.asText());
            ObjectNode f = S.ttx.inTenant(c, () -> { Map<String, Object> r = S.mapper.selectDoc(c); JsonNode doc = r == null || r.get("doc") == null ? O() : parse(String.valueOf(r.get("doc")));
                for (JsonNode m : arr(get(doc, "members"))) { String sn = studentNo(m); if (sn.isEmpty() || !hmac(s(x.group, "salt"), sn).substring(0, 32).equals(gkey)) continue;
                    ObjectNode fo = O(); if (fields.contains("studentNo")) fo.put("studentNo", sn); if (fields.contains("dept")) fo.put("dept", deptOf(m));
                    if (fields.contains("courses")) { ArrayNode cs = fo.putArray("courses"); String id = S(get(m, "id")); for (JsonNode cl : arr(get(doc, "classes"))) { boolean in = false; for (JsonNode li : arr(get(cl, "learners"))) if (id.equals(S(li))) in = true; if (!in) continue;
                        JsonNode pr = get(get(cl, "prog"), id); cs.addObject().put("title", S(get(cl, "name"))).put("term", S(get(cl, "term")).isEmpty() ? GrpKpi.d10(get(cl, "start")).length() >= 7 ? GrpKpi.d10(get(cl, "start")).substring(0, 7) : "" : S(get(cl, "term"))).put("progressBp", Math.round(GrpKpi.pct(pr) * 100)).put("done", GrpKpi.done(cl, pr)); } }
                    return fo; }
                return null; });
            if (f == null) continue; S.log(c, email(x.a), "grp.learner.view", map("group", x.gid, "key", gkey.substring(0, 10), "purpose", purpose, "fields", fields));
            ObjectNode it = items.addObject().put("childTid", c).put("label", s(l, "label")); it.set("fields", f); }
        ObjectNode o = O(); o.set("items", items); o.put("hidden", hidden); return o;
    }
    static String studentNo(JsonNode m) { String v = S(get(get(m, "extra"), "학번")); if (v.isEmpty()) v = S(get(m, "studentNo")); if (v.isEmpty()) v = S(get(m, "sid")); return v.replaceAll("[^0-9]", ""); }
    static String deptOf(JsonNode m) { String v = S(get(get(m, "extra"), "학과")); if (v.isEmpty()) v = S(get(m, "dept")); return cut(v, 40); }
}
