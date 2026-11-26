package egovframework.didisam.group.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.ai.service.AiService;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.group.service.GroupService;
import egovframework.didisam.market.service.impl.MkDb;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** 디디쌤 통합 센터 — Node service/server/group(index · routes · kpi · snap · share)와 같은 /api/group/* · 오류 코드 · 응답 JSON(기획서 spec.md 1 · 2절).
 *  상위 기관 경로는 DB 역할 didisam_group(기관 표 권한 없음, RLS FORCE)으로만 내려간다: app.tenant(로그인 기관 또는 집계 중인 소속 기관) · app.grp · app.santa.
 *  집계는 소속 기관 자기 범위(inTenant)에서 숫자만 계산해 grp_kpi_day에 「결과만」 쓴다(한 트랜잭션에서 두 기관을 다루지 않음).
 *  시범 플래그: grp_group.pilot(산타 관리자가 켬). 꺼진 상위 기관 경로는 403 grp_off. */
@Service("groupService")
public class GroupServiceImpl extends EgovAbstractServiceImpl implements GroupService {
    static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger("grp");
    static final Pattern DAY_RE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$"), TID_RE = Pattern.compile("^tn_[a-z0-9]{8,16}$");
    static final String AZ = "abcdefghijklmnopqrstuvwxyz0123456789"; static final SecureRandom RND = new SecureRandom();
    /* ── 계약 service/server/group/contract.json(version grp-api-1) 사본 — 계약이 바뀌면 같이 고친다(test/contract-group.sh가 대조) ── */
    static final String AGREE_VER = "grp-share-v1";
    static final Map<String, List<String>> KINDS = Map.of("franchise", List.of("branch", "direct"), "univ", List.of("unit", "lifelong", "lms_main", "grad"), "region", List.of("lifelong", "citizen", "school", "center"));
    static final Map<String, List<String>> DETAIL = Map.of("franchise", List.of(), "univ", List.of("studentNo", "dept", "courses"), "region", List.of());
    static final Map<String, List<String>> PERMS = Map.of("grp_admin", List.of("view", "export", "invite", "content", "policy", "staff", "audit"), "grp_viewer", List.of("view", "export"), "grp_content", List.of("view", "content"), "grp_learner", List.of("view", "learner"));
    static final List<String> POLICY_KEYS = List.of("brand", "terms", "notice", "footer", "menu", "ai");
    static final Map<String, String> MSG = new LinkedHashMap<>(); static final Map<String, Integer> STATUS = new LinkedHashMap<>();
    static {
        Object[] m = {
            "grp_off", new Object[]{ 403, "통합 센터 시범 기관이 아닙니다. 산타에 시범 운영을 요청하십시오." },
            "grp_role", new Object[]{ 403, "이 작업을 할 통합 센터 역할이 없습니다. 통합 관리자에게 역할을 요청하십시오." },
            "grp_owner", new Object[]{ 403, "기관 묶음 연결 · 공유 범위는 정운영자만 바꿀 수 있습니다." },
            "grp_kind", new Object[]{ 400, "묶음 유형은 프랜차이즈 본사 · 대학 본부 · 지자체 · 교육청 중에서 고르십시오." },
            "grp_exists", new Object[]{ 409, "이 기관은 이미 다른 기관 묶음의 상위 기관입니다." },
            "grp_child", new Object[]{ 409, "이 기관은 이미 이 기관 묶음에 초대되었거나 소속되어 있습니다." },
            "grp_self", new Object[]{ 400, "자기 기관은 소속 기관으로 초대할 수 없습니다." },
            "grp_unit", new Object[]{ 400, "이 묶음 유형에서 쓸 수 없는 소속 구분입니다." },
            "grp_invite_code", new Object[]{ 404, "초대 코드가 맞지 않습니다. 상위 기관에 코드를 다시 확인하십시오." },
            "grp_invite_expired", new Object[]{ 410, "초대 기한(14일)이 지났습니다. 상위 기관에 새 초대를 요청하십시오." },
            "grp_terms", new Object[]{ 400, "공유 범위 안내를 확인하고 동의해야 연결할 수 있습니다." },
            "grp_state", new Object[]{ 409, "지금 상태에서는 할 수 없는 작업입니다. 화면을 새로 고친 뒤 다시 시도하십시오." },
            "grp_staff_tenant", new Object[]{ 400, "우리 기관 운영자 계정에만 통합 센터 역할을 줄 수 있습니다." },
            "grp_last_admin", new Object[]{ 409, "통합 관리자가 한 명 이상 있어야 합니다." },
            "grp_range", new Object[]{ 400, "기간은 최대 1년(366일)까지 조회할 수 있습니다." },
            "grp_rule", new Object[]{ 400, "경고 기준 값이 올바르지 않습니다." },
            "grp_consent", new Object[]{ 403, "소속 기관이 동의한 공유 범위 밖의 정보입니다." },
            "grp_mfa", new Object[]{ 403, "학습자 개별 열람 전에 2단계 인증을 다시 해 주십시오." },
            "grp_purpose", new Object[]{ 400, "열람 목적을 10자 이상 적어 주십시오(감사 기록에 남습니다)." },
            "grp_limit", new Object[]{ 429, "요청이 너무 많습니다. 잠시 후 다시 시도하십시오." },
            "grp_license", new Object[]{ 409, "콘텐츠 마켓에서 들여온 콘텐츠는 다른 기관에 다시 공유할 수 없습니다(이용 권한 범위 밖)." },
            "grp_source", new Object[]{ 404, "공유할 원본을 찾을 수 없습니다." },
            "grp_size", new Object[]{ 413, "공유 사본이 너무 큽니다(2MB 초과). 영상은 파일 대신 링크로 넣으십시오." },
            "grp_ver", new Object[]{ 409, "그 사이 다른 사람이 수정했습니다. 최신 내용을 불러온 뒤 다시 저장하십시오." },
            "grp_required", new Object[]{ 409, "필수 배포 콘텐츠는 거절할 수 없습니다." },
            "grp_locked", new Object[]{ 409, "상위 기관이 잠근 공통 설정이라 바꿀 수 없습니다." },
            "grp_policy_key", new Object[]{ 400, "지원하지 않는 공통 설정 항목입니다." },
            "grp_detail_off", new Object[]{ 403, "학습자 개별 열람은 아직 열리지 않았습니다(시범 · 법무 확인 후 산타가 켭니다)." },
            "grp_link_pick", new Object[]{ 400, "연결된 기관 묶음이 여러 개입니다. 어느 묶음인지 고르십시오(linkId)." },
            "grp_field", new Object[]{ 400, "이 묶음 유형에서 공유할 수 없는 항목입니다." },
            "idem", new Object[]{ 400, "멱등 키(idem)가 필요합니다." },
            "grp_reason", new Object[]{ 400, "사유를 5자 이상 200자 이하로 적어 주십시오." } };
        for (int i = 0; i < m.length; i += 2) { Object[] v = (Object[]) m[i + 1]; STATUS.put((String) m[i], (Integer) v[0]); MSG.put((String) m[i], (String) v[1]); }
    }

    final MkDb db; final TenantTx ttx; final AuthService auth; final AiService ai; final DdRateLimiter rl; final GroupMapper mapper; final DdWeb web;
    public GroupServiceImpl(MkDb db, TenantTx ttx, AuthService auth, AiService ai, DdRateLimiter rl, GroupMapper mapper, DdWeb web) {
        this.db = db; this.ttx = ttx; this.auth = auth; this.ai = ai; this.rl = rl; this.mapper = mapper; this.web = web;
        GrpRoutes.register(this);
    }

    // ── 공통 ───────────────────────────────────────────────
    /** Node E(code, extra, message): 상태는 계약 errors 표(없으면 400) */
    DdException E(String code) { return E(code, null, null); }
    DdException E(String code, Map<String, Object> extra) { return E(code, extra, null); }
    DdException E(String code, Map<String, Object> extra, String msg) { DdException e = new DdException(STATUS.getOrDefault(code, 400), msg != null ? msg : MSG.getOrDefault(code, "요청을 처리할 수 없습니다."), code); if (extra != null) e.extra(extra); return e; }
    static DdException H(int st, String msg, String code) { return new DdException(st, msg, code); }
    static Map<String, Object> map(Object... kv) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]); return o; }
    static String rid(String p) { byte[] b = new byte[12]; RND.nextBytes(b); StringBuilder s = new StringBuilder(p); for (byte x : b) s.append(AZ.charAt((x & 0xff) % 36)); return s.toString(); }
    static String hex(byte[] h) { StringBuilder o = new StringBuilder(); for (byte x : h) o.append(String.format("%02x", x)); return o.toString(); }
    static String sha(String s) { try { return hex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))); } catch (Exception e) { throw new IllegalStateException(e); } }
    /** gkey = HMAC-SHA256(묶음 솔트, 학번 숫자만) 앞 32자 */
    static String gkey(String salt, String no) { try { javax.crypto.Mac m = javax.crypto.Mac.getInstance("HmacSHA256"); m.init(new javax.crypto.spec.SecretKeySpec(salt.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return hex(m.doFinal(no.replaceAll("\\D", "").getBytes(StandardCharsets.UTF_8))).substring(0, 32); } catch (Exception e) { throw new IllegalStateException(e); } }
    /** str(v, n) = String(v ?? '').slice(0, n) */
    static String str(JsonNode v, int n) { return cut(nullish(v) ? "" : egovframework.didisam.cmm.Js.str(v), n); }
    static String str(String v, int n) { return cut(v == null ? "" : v, n); }
    static JsonNode g(JsonNode r, String k) { JsonNode v = r == null ? null : r.get(k); return v == null ? F.nullNode() : v; }
    static String s(JsonNode r, String k) { JsonNode v = g(r, k); return v.isNull() ? null : v.asText(); }
    static long n(JsonNode r, String k) { JsonNode v = g(r, k); return v.isNull() ? 0 : v.asLong(); }
    static boolean B(JsonNode r, String k) { return truthy(g(r, k)); }
    static ObjectNode O() { return F.objectNode(); }
    static String tid(Map<String, Object> a) { return (String) a.get("tid"); }
    static String email(Map<String, Object> a) { return (String) a.get("email"); }
    static String uid(Map<String, Object> a) { return (String) a.get("uid"); }
    static String today() { return kstToday(); }
    static String kstDay() { return kstToday(); }

    /** 요청 범위 { tid, gid, santa } — 권한 함수가 채우고 T()가 RLS 세션 변수로 넘긴다(Node AsyncLocalStorage als와 같음) */
    static final ThreadLocal<String[]> SCOPE = new ThreadLocal<>();
    static void scopeSet(String tid, String gid, boolean santa) { SCOPE.set(new String[]{ tid == null ? "" : tid, gid == null ? "" : gid, santa ? "1" : "0" }); }
    /** Node tx(fn): SET LOCAL ROLE didisam_group(RLS FORCE) + app.tenant · app.grp · app.santa. 범위가 비면 아무 행도 보이지 않는다 */
    <T> T T(TenantTx.Work<T> fn) throws Exception { String[] s = SCOPE.get(); return txIn(s == null ? "" : s[0], s == null ? "" : s[1], s != null && "1".equals(s[2]), fn); }
    /** Node txIn(scope, fn) */
    <T> T txIn(String tid, String gid, boolean santa, TenantTx.Work<T> fn) throws Exception {
        return ttx.plain(() -> { db.x("set local role didisam_group"); db.q("select set_config('app.tenant', $1, true), set_config('app.grp', $2, true), set_config('app.santa', $3, true)", tid == null ? "" : tid, gid == null ? "" : gid, santa ? "1" : "0"); return fn.run(); });
    }
    <T> T santa(TenantTx.Work<T> fn) throws Exception { return txIn("", "", true, fn); }
    /** 멱등(grp_idem): 같은 (기관, 경로, idem)이면 첫 응답 + again */
    ObjectNode idem(String tid, String route, JsonNode key, TenantTx.Work<ObjectNode> fn) throws Exception {
        if (key == null || !key.isTextual() || key.textValue().isEmpty()) throw E("idem");
        String k = str(key, 80); ObjectNode ex = db.q1("select resp from grp_idem where tid = $1 and route = $2 and key = $3", tid, route, k);
        if (ex != null) { ObjectNode r = ((ObjectNode) ex.get("resp")).deepCopy(); r.put("again", true); return r; }
        ObjectNode out = fn.run(); db.x("insert into grp_idem (tid, route, key, resp) values ($1,$2,$3,$4)", tid, route, k, out); return out;
    }
    /** 감사(grp_audit, 해시 체인은 DB 트리거) — Node gaudit과 같은 열 */
    static final class Au { String gid, actor, actorTid, action, childTid, target, purpose, ip; List<String> fields; boolean ok = true; }
    static Au au(String gid, Map<String, Object> a, String action) { Au x = new Au(); x.gid = gid; x.actor = email(a); x.actorTid = tid(a); x.action = action; return x; }
    void gaudit(Au r) {
        String tg = str(r.target, 120), pp = str(r.purpose, 200);
        db.x("insert into grp_audit (group_id, actor, actor_tid, action, child_tid, target, purpose, fields, ok, ip_hash) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
            r.gid, r.actor, r.actorTid, r.action, r.childTid == null || r.childTid.isEmpty() ? null : r.childTid, tg.isEmpty() ? null : tg, pp.isEmpty() ? null : pp, r.fields, r.ok, r.ip == null || r.ip.isEmpty() ? null : sha("grp|" + r.ip).substring(0, 16));
    }
    /** 기관 감사(audit_log) — 소속 기관에도 남긴다(실패해도 본 처리는 유지) */
    void tlog(String tid, String actor, String action, Object detail) { try { ttx.audit(tid, actor, action, DdWeb.JSON.valueToTree(detail).toString()); } catch (Exception e) { /* 본 처리는 유지 */ } }
    /** 기관 문서 읽기 · 고치기(자기 범위) */
    ObjectNode docOf(String tid) throws Exception { return ttx.inTenant(tid, () -> { Map<String, Object> r = mapper.selectDoc(tid); JsonNode d = r == null || r.get("doc") == null ? null : parse(String.valueOf(r.get("doc"))); return d != null && d.isObject() ? (ObjectNode) d : O(); }); }
    interface Edit<T> { T run(ObjectNode doc) throws Exception; }
    <T> T docEdit(String tid, Edit<T> fn) throws Exception {
        return ttx.inTenant(tid, () -> { Map<String, Object> r = mapper.selectDocLock(tid); if (r == null) return null; JsonNode d = r.get("doc") == null ? null : parse(String.valueOf(r.get("doc"))); ObjectNode doc = d != null && d.isObject() ? (ObjectNode) d : O();
            T out = fn.run(doc); String t0 = doc.toString(); mapper.updateDoc(tid, t0, t0.getBytes(StandardCharsets.UTF_8).length); return out; });
    }
    ObjectNode tenantName(String tid) throws Exception { ObjectNode r = ttx.plain(() -> db.q1("select name, type from tenants where id = $1", tid)); return r != null ? r : O().put("name", "").put("type", ""); }
    Map<String, ObjectNode> names(List<String> tids) throws Exception {
        LinkedHashSet<String> L = new LinkedHashSet<>(); for (String t0 : tids) if (t0 != null && !t0.isEmpty()) L.add(t0); Map<String, ObjectNode> m = new LinkedHashMap<>(); if (L.isEmpty()) return m;
        for (ObjectNode r : ttx.plain(() -> db.q("select id, name, type from tenants where id = any($1)", new ArrayList<>(L)))) m.put(s(r, "id"), r); return m;
    }
    String ip(HttpServletRequest req) { try { return web.ip(req); } catch (Exception e) { return ""; } }

    // ── 권한 ───────────────────────────────────────────────
    boolean isSanta(Map<String, Object> a) { return a != null && ai.isSanta(a); }
    void lim(String key, int max, long win) throws Exception { try { rl.limit(key, max, win); } catch (DdException e) { if (e.getStatus() == 429) throw E("grp_limit"); throw e; } catch (org.egovframe.rte.fdl.cmmn.exception.EgovBizException e) { if (String.valueOf(e.getMessageKey()).contains("429")) throw E("grp_limit"); throw e; } }
    Map<String, Object> need(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); scopeSet(tid(a), "", false); return a; }
    List<String> rolesOf(Map<String, Object> a, JsonNode g0) throws Exception {
        List<String> rs = new ArrayList<>(); for (ObjectNode r : T(() -> db.q("select role from grp_staff where group_id = $1 and user_id = $2", s(g0, "id"), uid(a)))) rs.add(s(r, "role"));
        if ("owner".equals(a.get("role")) && !rs.contains("grp_admin")) rs.add(0, "grp_admin"); return rs;
    }
    static List<String> permsOf(List<String> rs) { LinkedHashSet<String> P = new LinkedHashSet<>(); for (String r : rs) P.addAll(PERMS.getOrDefault(r, List.of())); List<String> o = new ArrayList<>(); for (String p : P) if (!"learner".equals(p) || rs.contains("grp_learner")) o.add(p); return o; }
    /** 상위 기관 판정 결과 */
    static final class G { Map<String, Object> a; ObjectNode g; List<String> roles, perms; String gid() { return s(g, "id"); } }
    G needGrp(HttpServletRequest req, String perm) throws Exception {
        Map<String, Object> a = need(req); ObjectNode g0 = T(() -> db.q1("select * from grp_group where owner_tid = $1", tid(a)));
        if (g0 == null || !B(g0, "pilot") || !"active".equals(s(g0, "status"))) throw E("grp_off"); scopeSet(tid(a), s(g0, "id"), false);
        G x = new G(); x.a = a; x.g = g0; x.roles = rolesOf(a, g0); x.perms = permsOf(x.roles); if (perm != null && !x.perms.contains(perm)) throw E("grp_role"); return x;
    }
    Map<String, Object> needChild(HttpServletRequest req) throws Exception { Map<String, Object> a = need(req); if ("teacher".equals(a.get("role"))) throw H(403, "교강사 권한으로 사용할 수 없습니다.", "teacher"); return a; }
    Map<String, Object> needChildOwner(HttpServletRequest req) throws Exception { Map<String, Object> a = needChild(req); if (!"owner".equals(a.get("role"))) throw E("grp_owner"); return a; }
    Map<String, Object> needSanta(HttpServletRequest req) throws Exception { Map<String, Object> a = auth.need(req); if (!isSanta(a)) throw H(403, "산타 관리자만 쓸 수 있습니다.", "santa"); scopeSet(tid(a), "", true); return a; }
    /** 재인증 = 현재 운영자 세션이 10분 안에 만들어짐(로그인 · 2단계 인증 직후) — contract.json decisions.fresh */
    void needFresh(Map<String, Object> a) throws Exception {
        String sid = (String) a.get("sid"); Integer ok = sid == null ? null : ttx.plain(() -> mapper.selectFresh(sid));
        if (ok == null || ok != 1) throw E("grp_mfa", map("mfa", "required"));
    }

    // ── 집계(snap.js) ──────────────────────────────────────
    /** ① 소속 기관 범위 계산(숫자만) — Node snap.measure. [v, lx(null 가능)] */
    Object[] measure(String child, String day, JsonNode share, boolean wantLx) throws Exception {
        ObjectNode doc = docOf(child); ObjectNode v = GrpKpi.fromDoc(doc, day);
        if (B(share, "ai")) { Map<String, Object> r = null; try { r = ttx.inTenant(child, () -> mapper.selectAiDay(child, day)); } catch (Exception e) { r = null; }
            v.put("aiCalls", r == null ? 0 : ((Number) r.get("calls")).longValue()); v.put("aiTok", r == null ? 0 : ((Number) r.get("tok")).longValue()); }
        if (B(share, "revenue")) { Long r = null; try { r = ttx.inTenant(child, () -> mapper.selectRevDay(child, day)); } catch (Exception e) { LOG.warn("grp.rev {} {}", child, e.getMessage()); r = null; } v.put("rev", r == null ? 0 : r); }
        return new Object[]{ v, wantLx ? GrpKpi.lxRows(doc) : null };
    }
    /** ② 소속 기관 범위로 집계 표에 쓰기(RLS: child_tid = app.tenant · active 연결) — Node snap.store */
    @SuppressWarnings("unchecked")
    boolean store(JsonNode link, String salt, String day, Object[] m) throws Exception {
        String gid = s(link, "group_id"), ch = s(link, "child_tid");
        return txIn(ch, gid, false, () -> {
            db.x("insert into grp_kpi_day (group_id, child_tid, day, v) values ($1,$2,$3,$4) on conflict (group_id, child_tid, day) do update set v = excluded.v, at = now()", gid, ch, day, m[0]);
            List<ObjectNode> rows = db.q("select to_char(day, 'YYYY-MM-DD') \"day\", v from grp_kpi_day where group_id = $1 and child_tid = $2 and to_char(day, 'YYYY-MM') = $3", gid, ch, day.substring(0, 7));
            ObjectNode cm = GrpKpi.combine(rows);
            db.x("insert into grp_kpi_month (group_id, child_tid, ym, v) values ($1,$2,$3,$4) on conflict (group_id, child_tid, ym) do update set v = excluded.v, at = now()", gid, ch, day.substring(0, 7), cm == null ? F.nullNode() : cm);
            db.x("delete from grp_lx where group_id = $1 and child_tid = $2", gid, ch);
            List<ObjectNode> lx = (List<ObjectNode>) m[1];
            if (lx != null && !lx.isEmpty()) { String ym = day.substring(0, 7); Map<String, Object[]> by = new LinkedHashMap<>();
                for (ObjectNode x : lx) { String no = s(x, "no"); if (no == null || no.isEmpty()) continue; String gk = gkey(salt, no); Object[] o = by.computeIfAbsent(gk, k -> new Object[]{ k, g(x, "dept"), 0L, 0L }); o[2] = (Long) o[2] + n(x, "enr"); o[3] = (Long) o[3] + n(x, "cmp"); }
                List<Object[]> L = new ArrayList<>(by.values());
                for (int i = 0; i < L.size(); i += 500) { ArrayNode part = F.arrayNode(); for (Object[] o : L.subList(i, Math.min(L.size(), i + 500))) { ArrayNode e = part.addArray(); e.add((String) o[0]); JsonNode dp = (JsonNode) o[1]; e.add(truthy(dp) ? dp.asText() : ""); e.add((Long) o[2]); e.add((Long) o[3]); }
                    db.x("insert into grp_lx (group_id, gkey, child_tid, dept, enr, cmp, last_ym) select $1, x->>0, $2, nullif(x->>1, ''), (x->>2)::int, (x->>3)::int, $3 from jsonb_array_elements($4::jsonb) x", gid, ch, ym, part.toString()); } }
            return true; });
    }
    /** 한 연결 집계 — Node snap.one */
    boolean snapOne(JsonNode link, String day) throws Exception {
        ObjectNode gr = santa(() -> db.q1("select kind, salt from grp_group where id = $1", s(link, "group_id"))); if (gr == null) return false;
        JsonNode share = truthy(g(link, "share")) ? g(link, "share") : O(); Object[] m = measure(s(link, "child_tid"), day, share, "univ".equals(s(gr, "kind")) && B(share, "learnerAgg"));
        return store(link, s(gr, "salt"), day, m);
    }
    /** 묶음 전체(지금 새로 고침 · 다시 만들기) — Node snap.group */
    int snapGroup(String gid, List<String> days) throws Exception {
        List<ObjectNode> links = santa(() -> db.q("select * from grp_link where group_id = $1 and status = 'active'", gid)); int n = 0;
        for (ObjectNode l : links) for (String d : days) { try { if (snapOne(l, d)) n++; } catch (Exception e) { /* 한 기관 실패는 건너뜀(Node log.warn) */ } } return n;
    }
    volatile String lastDay = "";
    /** 시간 tick — Node snap.tick: 초대 만료 · 끝난 연결 집계 365일 뒤 삭제 · 멱등 7일, 하루 1회 전날 · 오늘 집계 */
    @org.springframework.scheduling.annotation.Scheduled(fixedDelayString = "${dd.group.tickMs:3600000}", initialDelayString = "${dd.group.tickMs:600000}")
    public void tick() { try { sweep(); } catch (Exception ignore) { /* 표가 없거나(마이그레이션 전) 일시 오류 — 다음 회차에 다시 */ } }
    public int sweep() throws Exception {
        santa(() -> { db.x("update grp_link set status = 'expired', ended_at = now() where status = 'invited' and expires_at < now()");
            for (String t0 : new String[]{ "grp_kpi_day", "grp_kpi_month", "grp_lx" }) db.x("delete from " + t0 + " x where not exists (select 1 from grp_link l where l.group_id = x.group_id and l.child_tid = x.child_tid and (l.status = 'active' or l.ended_at > now() - interval '365 days'))");
            try { db.x("delete from grp_idem where at < now() - interval '7 days'"); } catch (Exception e) { /* Node catch */ } return null; });
        String t0 = kstDay(); if (t0.equals(lastDay)) return 0; lastDay = t0; String yest = GrpKpi.addDays(t0, -1);
        List<ObjectNode> gids = santa(() -> db.q("select id from grp_group where pilot and status = 'active'")); int n = 0;
        for (ObjectNode r : gids) n += snapGroup(s(r, "id"), List.of(yest, t0)); return n;
    }

    // ── 라우트 표 ───────────────────────────────────────────
    @FunctionalInterface interface H { Object go(HttpServletRequest req, HttpServletResponse res, byte[] raw, String[] p) throws Exception; }
    final Map<String, H> R = new LinkedHashMap<>(); final List<Object[]> P = new ArrayList<>();
    void r(String key, H h) { R.put(key, h); }
    void p(String m, String re, H h) { P.add(new Object[]{ m, Pattern.compile(re), h }); }
    @Override public Object route(HttpServletRequest req, HttpServletResponse res, byte[] body) throws Exception {
        String path = req.getRequestURI(), m = req.getMethod(); H h = R.get(m + " " + path); String[] grp = new String[0];
        if (h == null) for (Object[] x : P) { if (!m.equals(x[0])) continue; Matcher mt = ((Pattern) x[1]).matcher(path); if (mt.matches()) { h = (H) x[2]; grp = new String[mt.groupCount()]; for (int i = 0; i < grp.length; i++) grp[i] = mt.group(i + 1); break; } }
        if (h == null) throw H(404, "없는 주소입니다.", "not_found");
        scopeSet("", "", false); try { return h.go(req, res, body, grp); } finally { SCOPE.remove(); }
    }
}
