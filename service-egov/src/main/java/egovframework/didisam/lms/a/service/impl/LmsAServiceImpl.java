package egovframework.didisam.lms.a.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.*;
import egovframework.didisam.lms.a.service.LmsAService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/**
 * v30 묶음 A 학사 LMS(강좌 · 분반) — Node service/server/lms/mod-a.js와 같은 순서 · 같은 오류 코드/문구 · 같은 JSON.
 * 모든 lms_* 조회 · 쓰기는 TenantTx.inTenant(RLS). 운영자 계정(users) · 학습자 세션 · 기관 유형만 inTenant 밖에서 읽는다(Node pool.query와 같음).
 * 업무 오류: processException("dd.{상태}.{코드}") — 문구는 message-common.properties(# v30 묶음 A).
 */
@Service("lmsAService")
public class LmsAServiceImpl extends EgovAbstractServiceImpl implements LmsAService {
    static final Map<String, Integer> ST = new HashMap<>();
    static {
        for (String c : List.of("lms_edition", "lms_role", "lms_scope")) ST.put(c, 403);
        for (String c : List.of("term_id", "lms_name", "lms_date", "unit_code", "unit_kind", "course_code", "credits", "category", "section_no", "lms_mode", "capacity", "schedule", "class_id", "sec_status", "member_no", "person_kind", "person_status", "grade_year", "lms_stu",
            "staff_role", "staff_kind", "enr_kind", "req_kind", "import_kind", "csv", "csv_head", "lms_list", "merge", "unmerge", "sync_rep", "sync_class", "sync_none", "scope_units")) ST.put(c, 400);
        ST.put("csv_rows", 413);
        for (String c : List.of("term", "unit", "course", "section", "person", "staff", "enr", "req", "lms_user", "lms_state")) ST.put(c, 404);
        for (String c : List.of("section_dup", "in_use", "req_dup", "staff_dup", "person_dup", "merged")) ST.put(c, 409);
    }
    /* CSV 행 오류 문구(데이터) — Node R과 같은 문자열 */
    static final String R_MNO = "학번(사번) 형식이 올바르지 않습니다.", R_STU = "학생 학번은 숫자 6~10자리입니다.", R_KIND = "구분은 학생 · 교수 · 직원 · 외부 중 하나입니다.", R_STAT = "학적은 재학 · 휴학 · 졸업 · 제적 · 자퇴 · 퇴직 중 하나입니다.", R_YEAR = "학년은 1~6 사이 숫자입니다.",
        R_UNIT = "없는 학과 코드입니다.", R_SCOPE = "담당 범위 밖의 학과입니다.", R_DUPF = "파일 안에 같은 행이 이미 있습니다.", R_EXIST_P = "이미 등록된 학번입니다(건너뜀).", R_COURSE = "학수번호 형식이 올바르지 않습니다.", R_CNAME = "교과목명을 입력하세요(60자 이내).",
        R_SECNO = "분반 번호는 숫자 1~3자리입니다.", R_MODE = "수업 방식은 온라인 · 블렌디드 · 오프라인 · 하이플렉스 중 하나입니다.", R_CAP = "정원은 0~9999 사이 정수입니다.", R_CRED = "학점은 0~30 사이 숫자입니다.",
        R_CAT = "교과 구분은 전공 · 교양 · 일반선택 · 비교과 · 공개 · 학점교류 중 하나입니다.", R_EXIST_S = "이미 있는 분반입니다(건너뜀).", R_NOPERSON = "등록되지 않은 학번입니다.", R_NOSEC = "이 학기에 없는 교과목 · 분반입니다.", R_ENRKIND = "구분은 정규 · 청강 중 하나입니다.", R_EXIST_E = "이미 수강 중입니다(건너뜀).";
    static final Map<String, String> M_KIND = Map.of("학생", "student", "교수", "professor", "직원", "staff", "외부", "external", "student", "student", "professor", "professor", "staff", "staff", "external", "external");
    static final Map<String, String> M_STATUS = Map.ofEntries(Map.entry("재학", "active"), Map.entry("휴학", "leave"), Map.entry("졸업", "graduated"), Map.entry("제적", "expelled"), Map.entry("자퇴", "withdrawn"), Map.entry("퇴직", "retired"),
        Map.entry("active", "active"), Map.entry("leave", "leave"), Map.entry("graduated", "graduated"), Map.entry("expelled", "expelled"), Map.entry("withdrawn", "withdrawn"), Map.entry("retired", "retired"));
    static final Map<String, String> M_MODE = Map.of("온라인", "online", "블렌디드", "blended", "오프라인", "offline", "하이플렉스", "hyflex", "online", "online", "blended", "blended", "offline", "offline", "hyflex", "hyflex");
    static final Map<String, String> M_CAT = Map.ofEntries(Map.entry("전공", "major"), Map.entry("교양", "general"), Map.entry("일반선택", "elective"), Map.entry("비교과", "extracurricular"), Map.entry("공개", "open"), Map.entry("학점교류", "exchange"),
        Map.entry("major", "major"), Map.entry("general", "general"), Map.entry("elective", "elective"), Map.entry("extracurricular", "extracurricular"), Map.entry("open", "open"), Map.entry("exchange", "exchange"));
    static final Map<String, String> M_ENR = Map.of("정규", "regular", "청강", "audit", "regular", "regular", "audit", "audit");
    static final Pattern RE_TERM = Pattern.compile("\\d{4}-(1|2|S|W)"), RE_UNIT = Pattern.compile("[A-Za-z0-9_-]{2,20}"), RE_COURSE = Pattern.compile("[A-Za-z0-9-]{4,20}"), RE_SECNO = Pattern.compile("\\d{1,3}"),
        RE_MNO = Pattern.compile("[A-Za-z0-9]{4,20}"), RE_STU = Pattern.compile("\\d{6,10}"), RE_CLS = Pattern.compile("[A-Za-z0-9_-]{1,40}"), RE_UUID = Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"),
        RE_DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}"), RE_Q = Pattern.compile("[A-Za-z0-9]{0,20}"), RE_YEAR = Pattern.compile("[1-6]"), RE_CAP = Pattern.compile("\\d{1,4}"), RE_CRED = Pattern.compile("\\d{1,2}(\\.\\d)?");
    static final List<String> UNIT_KINDS = List.of("univ", "college", "dept", "major", "office"), STAFF_ROLES = List.of("professor", "co_professor", "ta", "grader", "staff"), SEC_STATUS = List.of("draft", "open", "closed", "archived"), DAYS = List.of("월", "화", "수", "목", "금", "토", "일");
    static final int MAX_ROWS = 5000;

    private final LmsAMapper m; private final TenantTx tx; private final TenantTxMapper txm; private final AuthService auth; private final DdRateLimiter rl;
    public LmsAServiceImpl(LmsAMapper m, TenantTx tx, TenantTxMapper txm, AuthService auth, DdRateLimiter rl) { this.m = m; this.tx = tx; this.txm = txm; this.auth = auth; this.rl = rl; }

    /* ── 도우미 ── */
    private Exception err(String code) { return processException("dd." + ST.get(code) + "." + code); }
    static String T(JsonNode b, String k) { return Js.trim(Js.sOr(Js.get(b, k))); }
    static String T(JsonNode v) { return Js.trim(Js.sOr(v)); }
    static boolean mt(Pattern p, String s) { return s != null && p.matcher(s).matches(); }
    static String secNo(String s) { return mt(RE_SECNO, s) ? (s.length() == 1 ? "0" + s : s) : null; }
    static boolean dateOk(String d) { if (!mt(RE_DATE, d)) return false; try { return LocalDate.parse(d).toString().equals(d); } catch (Exception e) { return false; } }
    static boolean nullOrEmpty(JsonNode v) { return Js.nullish(v) || (v.isTextual() && v.textValue().isEmpty()); }
    static boolean isTrue(JsonNode v) { return v != null && v.isBoolean() && v.booleanValue(); }
    static String S(Object o) { return o == null ? null : String.valueOf(o); }
    static ObjectNode ok() { ObjectNode o = Js.F.objectNode(); o.put("ok", true); return o; }
    void audit(X x, String action, ObjectNode d) { txm.insertAudit(x.tid, x.email, action, d == null ? null : d.toString()); }
    static ObjectNode det(Object... kv) { ObjectNode o = Js.F.objectNode(); for (int i = 0; i + 1 < kv.length; i += 2) { Object v = kv[i + 1]; if (v == null) o.putNull((String) kv[i]); else if (v instanceof Integer n) o.put((String) kv[i], n); else if (v instanceof JsonNode j) o.set((String) kv[i], j); else o.put((String) kv[i], String.valueOf(v)); } return o; }
    static List<String> csvList(Object s) { String t = s == null ? "" : String.valueOf(s); if (t.isEmpty()) return new ArrayList<>(); return new ArrayList<>(Arrays.asList(t.split(",", -1))); }

    /** 권한 맥락: 정운영자 · 부운영자(관리자, 부운영자는 단과대학 범위) · 교수(연결 사번의 담당 분반만) */
    static final class X { String tid, uid, email, role, mno; boolean admin; List<String> units; }
    X ctx(Map<String, Object> a) {
        X x = new X(); x.tid = (String) a.get("tid"); x.uid = (String) a.get("uid"); x.email = (String) a.get("email"); x.role = (String) a.get("role");
        Map<String, Object> link = m.selectLink(x.tid, x.uid);
        x.admin = "owner".equals(x.role) || "sub".equals(x.role);
        int n = link == null ? 0 : ((Number) link.get("n")).intValue();
        x.units = "sub".equals(x.role) && link != null && n > 0 ? csvList(link.get("units")) : null;
        x.mno = x.admin ? null : (link != null && link.get("member_no") != null && !String.valueOf(link.get("member_no")).isEmpty() ? String.valueOf(link.get("member_no")) : "");
        return x;
    }
    void adminOnly(X x) throws Exception { if (!x.admin) throw err("lms_role"); }
    void fullAdmin(X x) throws Exception { adminOnly(x); if (x.units != null) throw err("lms_scope"); }
    static boolean inUnits(X x, Object unit, Object parent) { return x.units == null || (unit != null && x.units.contains(String.valueOf(unit))) || (parent != null && x.units.contains(String.valueOf(parent))); }
    Map<String, Object> sectionOf(String id) throws Exception { if (!mt(RE_UUID, id)) throw err("section"); Map<String, Object> r = m.selectSection(id); if (r == null) throw err("section"); return r; }
    Map<String, Object> sectionOf(JsonNode b, String k) throws Exception { return sectionOf(T(b, k)); }
    void canSection(X x, Map<String, Object> s) throws Exception {
        if (x.admin) { if (!inUnits(x, s.get("unit_code"), s.get("parent_code"))) throw err("lms_scope"); return; }
        boolean r = x.mno != null && !x.mno.isEmpty() && m.selectCanStaff((String) s.get("section_id"), x.mno) > 0;
        if (!r) throw err("lms_role");
    }
    Map<String, Object> personOf(String mno) throws Exception { if (!mt(RE_MNO, mno)) throw err("member_no"); Map<String, Object> p = m.selectPerson(mno); if (p == null) throw err("person"); return p; }

    interface Work { Object run(X x) throws Exception; }
    Object run(HttpServletRequest req, Work w) throws Exception {
        Map<String, Object> a = auth.need(req); if (!"univ".equals(a.get("type"))) throw err("lms_edition");
        return tx.inTenant((String) a.get("tid"), () -> w.run(ctx(a)));
    }

    /* ── 개요 ── */
    @Override public Object overview(HttpServletRequest req) throws Exception {
        Map<String, Object> a = auth.need(req); if (!"univ".equals(a.get("type"))) throw err("lms_edition");
        Object[] r = tx.inTenant((String) a.get("tid"), () -> { X x = ctx(a); return new Object[] { x, m.selectOverview(x.mno, x.units == null ? null : String.join(",", x.units)), "owner".equals(x.role) ? m.selectLinks() : List.of() }; });
        X x = (X) r[0]; ObjectNode o = Js.F.objectNode(); ObjectNode me = o.putObject("me"); me.put("role", x.role); me.put("admin", x.admin);
        if (x.units == null) me.putNull("units"); else { ArrayNode u = me.putArray("units"); x.units.forEach(u::add); }
        if (x.mno == null) me.putNull("member_no"); else me.put("member_no", x.mno);
        o.setAll((ObjectNode) Js.parse((String) r[1]));
        ArrayNode sc = o.putArray("scopes"); @SuppressWarnings("unchecked") List<Map<String, Object>> L = (List<Map<String, Object>>) r[2];
        if (!L.isEmpty()) {
            List<String> ids = new ArrayList<>(); for (Map<String, Object> l : L) ids.add(String.valueOf(l.get("uid")));
            Map<String, Map<String, Object>> U = new HashMap<>(); for (Map<String, Object> u : m.selectUsersIn(x.tid, String.join(",", ids))) U.put(String.valueOf(u.get("id")), u);
            for (Map<String, Object> l : L) { Map<String, Object> u = U.get(String.valueOf(l.get("uid"))); if (u == null) continue; ObjectNode s = sc.addObject(); s.put("email", String.valueOf(u.get("email"))); s.put("role", String.valueOf(u.get("role")));
                ArrayNode us = s.putArray("units"); if (((Number) l.get("n")).intValue() > 0) csvList(l.get("units")).forEach(us::add); if (l.get("member_no") == null) s.putNull("member_no"); else s.put("member_no", String.valueOf(l.get("member_no"))); }
        }
        return o;
    }

    /* ── 학기 ── */
    @Override public Object term(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        fullAdmin(x); String id = T(b, "term_id"), name = T(b, "name"), s = T(b, "starts_on"), e = T(b, "ends_on");
        if (!mt(RE_TERM, id)) throw err("term_id"); if (name.isEmpty() || name.length() > 60) throw err("lms_name"); if (!dateOk(s) || !dateOk(e) || e.compareTo(s) < 0) throw err("lms_date");
        boolean op = isTrue(Js.get(b, "is_operating")); if (op) m.updateTermsOff(id);
        m.upsertTerm(x.tid, id, name, s, e, op); audit(x, "lms.term", det("term_id", id)); return ok(); }); }
    @Override public Object termDelete(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        fullAdmin(x); String id = T(b, "term_id"); if (!mt(RE_TERM, id)) throw err("term_id");
        if (m.existsTerm(id) == 0) throw err("term"); if (m.existsSectionInTerm(id) > 0) throw err("in_use");
        m.deleteTerm(id); audit(x, "lms.term.delete", det("term_id", id)); return ok(); }); }

    /* ── 조직 ── */
    @Override public Object unit(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        fullAdmin(x); String code = T(b, "unit_code"), name = T(b, "name"), kind = T(b, "kind"), par = T(b, "parent_code"); if (kind.isEmpty()) kind = "dept";
        if (!mt(RE_UNIT, code)) throw err("unit_code"); if (name.isEmpty() || name.length() > 60) throw err("lms_name"); if (!UNIT_KINDS.contains(kind)) throw err("unit_kind");
        if (!par.isEmpty()) { if (!mt(RE_UNIT, par) || par.equals(code)) throw err("unit_code"); if (m.selectUnit(par) == null) throw err("unit"); }
        m.upsertUnit(x.tid, code, name, kind, par.isEmpty() ? null : par); audit(x, "lms.unit", det("unit_code", code)); return ok(); }); }
    @Override public Object unitDelete(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        fullAdmin(x); String code = T(b, "unit_code"); if (!mt(RE_UNIT, code)) throw err("unit_code"); if (m.selectUnit(code) == null) throw err("unit");
        if (m.existsUnitRefs(code) > 0) throw err("in_use"); m.deleteUnit(code); audit(x, "lms.unit.delete", det("unit_code", code)); return ok(); }); }

    /* ── 교과목 ── */
    @Override public Object course(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        adminOnly(x); String code = T(b, "course_code"), name = T(b, "name"), unit = T(b, "unit_code"), cat = T(b, "category");
        if (!mt(RE_COURSE, code)) throw err("course_code"); if (name.isEmpty() || name.length() > 60) throw err("lms_name");
        JsonNode cv = Js.get(b, "credits"); Double cr = nullOrEmpty(cv) ? null : Js.num(cv);
        if (cr != null && !(Double.isFinite(cr) && cr >= 0 && cr <= 30)) throw err("credits");
        if (!cat.isEmpty() && !M_CAT.containsKey(cat)) throw err("category");
        Map<String, Object> u = null; if (!unit.isEmpty()) { if (!mt(RE_UNIT, unit)) throw err("unit_code"); u = m.selectUnit(unit); if (u == null) throw err("unit"); }
        if (!inUnits(x, u == null ? null : u.get("unit_code"), u == null ? null : u.get("parent_code"))) throw err("lms_scope");
        Map<String, Object> prev = m.selectCoursePrev(code); if (prev != null && !inUnits(x, prev.get("unit_code"), prev.get("parent_code"))) throw err("lms_scope");
        m.upsertCourse(x.tid, code, name, cr, unit.isEmpty() ? null : unit, cat.isEmpty() ? null : M_CAT.get(cat)); audit(x, "lms.course", det("course_code", code)); return ok(); }); }
    @Override public Object courseDelete(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        adminOnly(x); String code = T(b, "course_code"); if (!mt(RE_COURSE, code)) throw err("course_code");
        Map<String, Object> prev = m.selectCoursePrev(code); if (prev == null) throw err("course"); if (!inUnits(x, prev.get("unit_code"), prev.get("parent_code"))) throw err("lms_scope");
        if (m.existsSectionOfCourse(code) > 0) throw err("in_use"); m.deleteCourse(code); audit(x, "lms.course.delete", det("course_code", code)); return ok(); }); }

    /* ── 분반 ── */
    @Override public Object section(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        String id = T(b, "section_id"), title = T(b, "title"), mode = T(b, "mode"), status = T(b, "status"), cls = T(b, "class_id"); if (mode.isEmpty()) mode = "offline"; if (status.isEmpty()) status = "open";
        JsonNode cv = Js.get(b, "capacity"); Double capD = nullOrEmpty(cv) ? null : Js.num(cv);
        if (title.length() > 60) throw err("lms_name"); if (!M_MODE.containsKey(mode)) throw err("lms_mode");
        if (capD != null && !(Double.isFinite(capD) && capD == Math.rint(capD) && capD >= 0 && capD <= 9999)) throw err("capacity");
        if (!SEC_STATUS.contains(status)) throw err("sec_status"); if (!cls.isEmpty() && !mt(RE_CLS, cls)) throw err("class_id");
        Integer cap = capD == null ? null : capD.intValue();
        JsonNode sv = Js.get(b, "schedule"); boolean hasSch = !Js.nullish(sv); String sch = "[]";
        if (hasSch) {
            if (!sv.isArray() || sv.size() > 10) throw err("schedule");
            for (JsonNode s : sv) { JsonNode d = s.get("day"); if (!s.isObject() || d == null || !d.isTextual() || !DAYS.contains(d.textValue()) || Js.S(s.get("period")).length() > 10 || Js.S(s.get("room")).length() > 30) throw err("schedule"); }
            ArrayNode o = Js.F.arrayNode(); for (JsonNode s : sv) { ObjectNode e = o.addObject(); e.set("day", s.get("day")); e.put("period", T(s.get("period"))); e.put("room", T(s.get("room"))); } sch = o.toString();
        }
        if (!id.isEmpty()) {
            Map<String, Object> s = sectionOf(id); canSection(x, s);
            m.updateSection(title.isEmpty() ? (String) s.get("title") : title, M_MODE.get(mode), cap, hasSch, sch, cls.isEmpty() ? null : cls, status, (String) s.get("section_id"));
            audit(x, "lms.section.update", det("section_id", s.get("section_id"))); ObjectNode o = ok(); o.put("section_id", (String) s.get("section_id")); return o;
        }
        adminOnly(x); String term = T(b, "term_id"), code = T(b, "course_code"), no = secNo(T(b, "section_no"));
        if (!mt(RE_TERM, term)) throw err("term_id"); if (!mt(RE_COURSE, code)) throw err("course_code"); if (no == null) throw err("section_no");
        if (m.existsTerm(term) == 0) throw err("term");
        Map<String, Object> co = m.selectCoursePrev(code); if (co == null) throw err("course"); if (!inUnits(x, co.get("unit_code"), co.get("parent_code"))) throw err("lms_scope");
        if (m.existsSectionDup(term, code, no) > 0) throw err("section_dup");
        String sid = m.insertSection(x.tid, term, code, no, title.isEmpty() ? co.get("name") + " " + no + "분반" : title, M_MODE.get(mode), cap, sch, cls.isEmpty() ? null : cls, status);
        audit(x, "lms.section", det("section_id", sid)); ObjectNode o = ok(); o.put("section_id", sid); return o; }); }
    @Override public Object sectionDelete(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        adminOnly(x); Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s); String sid = (String) s.get("section_id");
        if (m.existsRepOf(sid) > 0) throw err("merged"); if (m.existsActiveEnr(sid) > 0) throw err("in_use");
        m.deleteEnrOfSection(sid); m.deleteSection(sid); audit(x, "lms.section.delete", det("section_id", sid)); return ok(); }); }

    /* ── 담당 ── */
    @Override public Object staff(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s); String role = T(b, "role"); if (!STAFF_ROLES.contains(role)) throw err("staff_role");
        Map<String, Object> p = personOf(T(b, "member_no")); if ((role.equals("professor") || role.equals("co_professor")) && !"professor".equals(p.get("kind"))) throw err("staff_kind");
        String sid = (String) s.get("section_id"), pid = (String) p.get("person_id");
        if (m.existsStaff(sid, pid, role) > 0) throw err("staff_dup"); m.insertStaff(x.tid, sid, pid, role, x.uid);
        audit(x, "lms.staff", det("section_id", sid, "member_no", p.get("member_no"), "role", role)); return ok(); }); }
    @Override public Object staffDelete(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s); String role = T(b, "role"); if (!STAFF_ROLES.contains(role)) throw err("staff_role");
        Map<String, Object> p = personOf(T(b, "member_no")); if (m.deleteStaff((String) s.get("section_id"), (String) p.get("person_id"), role) == 0) throw err("staff");
        audit(x, "lms.staff.delete", det("section_id", s.get("section_id"), "member_no", p.get("member_no"), "role", role)); return ok(); }); }

    /* ── 수강 ── */
    @Override public Object enrollments(String sectionId, String grading, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(sectionId == null ? "" : Js.trim(sectionId)); canSection(x, s);
        ObjectNode o = Js.F.objectNode(); o.put("section_id", (String) s.get("section_id")); o.set("rows", Js.parse(m.selectEnr((String) s.get("section_id"), "1".equals(grading)))); return o; }); }
    @Override public Object enroll(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s); String kind = T(b, "kind"); if (kind.isEmpty()) kind = "regular"; if (!kind.equals("regular") && !kind.equals("audit")) throw err("enr_kind");
        JsonNode mv = Js.get(b, "member_nos"); if (mv == null || !mv.isArray() || mv.size() == 0 || mv.size() > MAX_ROWS) throw err("lms_list");
        LinkedHashSet<String> LS = new LinkedHashSet<>(); for (JsonNode v : mv) { String t = T(v); if (!t.isEmpty()) LS.add(t); } if (LS.isEmpty()) throw err("lms_list");
        List<String> okL = new ArrayList<>(); for (String v : LS) if (mt(RE_MNO, v)) okL.add(v);
        String sid = (String) s.get("section_id");
        Map<String, String> P = new HashMap<>(); for (Map<String, Object> r : m.selectPersonsIn(String.join(",", okL))) P.put(String.valueOf(r.get("member_no")), String.valueOf(r.get("person_id")));
        Map<String, String> cur = new HashMap<>(); for (Map<String, Object> r : m.selectEnrStatus(sid)) cur.put(String.valueOf(r.get("person_id")), String.valueOf(r.get("status")));
        int added = 0, skipped = 0; ArrayNode errors = Js.F.arrayNode(); int en = 0;
        for (String mn : LS) {
            if (!mt(RE_MNO, mn)) { en++; if (errors.size() < 200) errors.addObject().put("member_no", mn).put("msg", R_MNO); continue; }
            String pid = P.get(mn); if (pid == null) { en++; if (errors.size() < 200) errors.addObject().put("member_no", mn).put("msg", R_NOPERSON); continue; }
            String st = cur.get(pid);
            if (st != null && !st.equals("dropped")) { skipped++; continue; }
            if ("dropped".equals(st)) m.updateEnrReactivate(kind, sid, pid); else m.insertEnr(x.tid, sid, pid, kind);
            cur.put(pid, "enrolled"); added++;
        }
        audit(x, "lms.enroll", det("section_id", sid, "added", added, "skipped", skipped, "errors", en));
        ObjectNode o = Js.F.objectNode(); o.put("added", added); o.put("skipped", skipped); o.set("errors", errors); return o; }); }
    @Override public Object enrollDrop(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s); Map<String, Object> p = personOf(T(b, "member_no"));
        if (m.updateDrop((String) s.get("section_id"), (String) p.get("person_id")) == 0) throw err("enr");
        audit(x, "lms.enroll.drop", det("section_id", s.get("section_id"), "member_no", p.get("member_no"))); return ok(); }); }

    /* ── 구성원 ── */
    @Override public Object persons(String q, String kind, HttpServletRequest req) throws Exception { return run(req, x -> {
        adminOnly(x); String qq = q == null ? "" : Js.trim(q); String kd = kind == null ? "" : Js.trim(kind);
        ObjectNode o = Js.F.objectNode(); o.set("rows", Js.parse(m.selectPersons(x.units == null ? null : String.join(",", x.units), mt(RE_Q, qq) ? qq : "", M_KIND.containsKey(kd) ? M_KIND.get(kd) : ""))); return o; }); }
    @Override public Object person(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        adminOnly(x); String mn = T(b, "member_no"), kind = T(b, "kind"), st = T(b, "status"), unit = T(b, "unit_code"); if (kind.isEmpty()) kind = "student"; if (st.isEmpty()) st = "active";
        JsonNode gv = Js.get(b, "grade_year"); Double gy = nullOrEmpty(gv) ? null : Js.num(gv);
        if (!mt(RE_MNO, mn)) throw err("member_no"); if (!M_KIND.containsKey(kind)) throw err("person_kind"); if (M_KIND.get(kind).equals("student") && !mt(RE_STU, mn)) throw err("lms_stu");
        if (!M_STATUS.containsKey(st)) throw err("person_status"); if (gy != null && !(Double.isFinite(gy) && gy == Math.rint(gy) && gy >= 1 && gy <= 6)) throw err("grade_year");
        Map<String, Object> u = null; if (!unit.isEmpty()) { if (!mt(RE_UNIT, unit)) throw err("unit_code"); u = m.selectUnit(unit); if (u == null) throw err("unit"); }
        if (!inUnits(x, u == null ? null : u.get("unit_code"), u == null ? null : u.get("parent_code"))) throw err("lms_scope");
        if (m.existsPerson(mn) > 0) throw err("person_dup");
        m.insertPerson(x.tid, mn, M_KIND.get(kind), unit.isEmpty() ? null : unit, M_STATUS.get(st), gy == null ? null : gy.intValue()); audit(x, "lms.person", det("member_no", mn)); return ok(); }); }

    /* ── 학사 CSV ── */
    static final class Row { int line; String st, msg; ObjectNode data; String sid, pid; }
    static ObjectNode dataObj(Object... kv) { ObjectNode o = Js.F.objectNode(); for (int i = 0; i + 1 < kv.length; i += 2) { String k = (String) kv[i]; Object v = kv[i + 1]; if (v == null) o.putNull(k); else if (v instanceof Integer n) o.put(k, n); else if (v instanceof Double d) o.set(k, Js.numNode(d)); else o.put(k, String.valueOf(v)); } return o; }
    List<Row> validate(X x, String kind, String term, List<List<String>> recs) throws Exception {
        List<String> head = recs.get(0); List<List<String>> rows = recs.subList(1, recs.size());
        List<String> need = kind.equals("person") ? List.of("학번") : kind.equals("section") ? List.of("학수번호", "교과목명", "분반") : List.of("학번", "학수번호", "분반");
        for (String n : need) if (!head.contains(n)) throw err("csv_head");
        if (rows.size() > MAX_ROWS) throw err("csv_rows");
        Map<String, String> units = new HashMap<>(); Set<String> unitSet = new HashSet<>(); for (Map<String, Object> r : m.selectUnitsAll()) { units.put(String.valueOf(r.get("unit_code")), S(r.get("parent_code"))); unitSet.add(String.valueOf(r.get("unit_code"))); }
        Set<String> seen = new HashSet<>(); List<Row> out = new ArrayList<>();
        java.util.function.BiFunction<List<String>, String, String> g = (r, n) -> { int i = head.indexOf(n); return i >= 0 && i < r.size() ? r.get(i) : ""; };
        if (kind.equals("person")) {
            Set<String> have = new HashSet<>(m.selectMemberNos());
            for (int i = 0; i < rows.size(); i++) { List<String> r = rows.get(i);
                String mn = g.apply(r, "학번"), dk = g.apply(r, "구분"), du = g.apply(r, "학과코드"), ds = g.apply(r, "학적"), dg = g.apply(r, "학년"); String msg = ""; String st = "error";
                String kd = dk.isEmpty() ? "student" : M_KIND.getOrDefault(dk, null); String ss = ds.isEmpty() ? "active" : M_STATUS.getOrDefault(ds, null); Integer gy = dg.isEmpty() ? null : mt(RE_YEAR, dg) ? Integer.valueOf(dg) : Integer.valueOf(-1);
                if (!mt(RE_MNO, mn)) msg = R_MNO; else if (kd == null) msg = R_KIND; else if (kd.equals("student") && !mt(RE_STU, mn)) msg = R_STU; else if (ss == null) msg = R_STAT; else if (gy != null && gy == -1) msg = R_YEAR;
                else if (!du.isEmpty() && !unitSet.contains(du)) msg = R_UNIT; else if (x.units != null && !(!du.isEmpty() && inUnits(x, du, units.get(du)))) msg = R_SCOPE;
                else if (seen.contains(mn)) msg = R_DUPF; else if (have.contains(mn)) { st = "skip"; msg = R_EXIST_P; } else st = "ok";
                if (!st.equals("error") || !msg.equals(R_MNO)) seen.add(mn);
                Row o = new Row(); o.line = i + 2; o.st = st; o.msg = msg; o.data = dataObj("member_no", mn, "kind", kd, "unit_code", du.isEmpty() ? null : du, "status", ss, "grade_year", gy != null && gy == -1 ? null : gy); out.add(o); }
            return out;
        }
        Map<String, Map<String, Object>> secs = new HashMap<>(); for (Map<String, Object> r : m.selectSecsTerm(term)) secs.put(r.get("course_code") + "|" + r.get("section_no"), r);
        if (kind.equals("section")) {
            Map<String, String> courses = new HashMap<>(); Set<String> courseSet = new HashSet<>(); for (Map<String, Object> r : m.selectCoursesAll()) { courses.put(String.valueOf(r.get("course_code")), S(r.get("unit_code"))); courseSet.add(String.valueOf(r.get("course_code"))); }
            for (int i = 0; i < rows.size(); i++) { List<String> r = rows.get(i);
                String cc = g.apply(r, "학수번호"), nm = g.apply(r, "교과목명"), dno = g.apply(r, "분반"), dcr = g.apply(r, "학점"), du = g.apply(r, "학과코드"), dm = g.apply(r, "수업방식"), dcap = g.apply(r, "정원"), dct = g.apply(r, "교과구분"); String msg = ""; String st = "error";
                String no = secNo(dno); String md = dm.isEmpty() ? "offline" : M_MODE.getOrDefault(dm, null); boolean ctBad = !dct.isEmpty() && !M_CAT.containsKey(dct); String ct = dct.isEmpty() || ctBad ? null : M_CAT.get(dct);
                boolean capBad = !dcap.isEmpty() && !mt(RE_CAP, dcap); Integer cap = dcap.isEmpty() || capBad ? null : Integer.valueOf(dcap);
                boolean crBad = !dcr.isEmpty() && !(mt(RE_CRED, dcr) && Double.parseDouble(dcr) <= 30); Double cr = dcr.isEmpty() || crBad ? null : Double.valueOf(dcr);
                String unit = !du.isEmpty() ? du : courseSet.contains(cc) ? courses.get(cc) : null;
                if (!mt(RE_COURSE, cc)) msg = R_COURSE; else if (nm.isEmpty() || nm.length() > 60) msg = R_CNAME; else if (no == null) msg = R_SECNO; else if (md == null) msg = R_MODE; else if (capBad) msg = R_CAP; else if (crBad) msg = R_CRED; else if (ctBad) msg = R_CAT;
                else if (!du.isEmpty() && !unitSet.contains(du)) msg = R_UNIT; else if (x.units != null && !(unit != null && inUnits(x, unit, units.get(unit)))) msg = R_SCOPE;
                else if (seen.contains(cc + "|" + no)) msg = R_DUPF; else if (secs.containsKey(cc + "|" + no)) { st = "skip"; msg = R_EXIST_S; } else st = "ok";
                if (no != null && mt(RE_COURSE, cc)) seen.add(cc + "|" + no);
                Row o = new Row(); o.line = i + 2; o.st = st; o.msg = msg; o.data = dataObj("course_code", cc, "name", nm, "section_no", no != null ? no : dno, "credits", cr, "unit_code", du.isEmpty() ? null : du, "mode", md, "capacity", cap, "category", ct); out.add(o); }
            return out;
        }
        Map<String, String> persons = new HashMap<>(); for (Map<String, Object> r : m.selectPersonsAll()) persons.put(String.valueOf(r.get("member_no")), String.valueOf(r.get("person_id")));
        Set<String> enr = new HashSet<>(m.selectEnrKeysTerm(term));
        for (int i = 0; i < rows.size(); i++) { List<String> r = rows.get(i);
            String mn = g.apply(r, "학번"), cc = g.apply(r, "학수번호"), dno = g.apply(r, "분반"), dk = g.apply(r, "구분"); String msg = ""; String st = "error";
            String no = secNo(dno); String kd = dk.isEmpty() ? "regular" : M_ENR.getOrDefault(dk, null); Map<String, Object> sec = no != null ? secs.get(cc + "|" + no) : null; String k = mn + "|" + cc + "|" + no;
            if (!mt(RE_MNO, mn)) msg = R_MNO; else if (kd == null) msg = R_ENRKIND; else if (seen.contains(k)) msg = R_DUPF; else if (!persons.containsKey(mn)) msg = R_NOPERSON; else if (sec == null) msg = R_NOSEC;
            else if (x.units != null && !inUnits(x, sec.get("unit_code"), units.get(S(sec.get("unit_code"))))) msg = R_SCOPE; else if (enr.contains(sec.get("section_id") + "|" + persons.get(mn))) { st = "skip"; msg = R_EXIST_E; } else st = "ok";
            if (mt(RE_MNO, mn)) seen.add(k);
            Row o = new Row(); o.line = i + 2; o.st = st; o.msg = msg; o.data = dataObj("member_no", mn, "course_code", cc, "section_no", no != null ? no : dno, "kind", kd); o.sid = sec == null ? null : S(sec.get("section_id")); o.pid = persons.get(mn); out.add(o); }
        return out;
    }
    @Override public Object importCsv(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        adminOnly(x); String kind = T(b, "kind"); if (!List.of("person", "section", "enrollment").contains(kind)) throw err("import_kind");
        rl.limit("lmsimp:" + x.tid, 60, 600000L);
        String term = null; if (!kind.equals("person")) { term = T(b, "term_id"); if (!mt(RE_TERM, term)) throw err("term_id"); if (m.existsTerm(term) == 0) throw err("term"); }
        JsonNode cv = Js.get(b, "csv"); if (cv == null || !cv.isTextual() || Js.trim(cv.textValue()).isEmpty()) throw err("csv");
        List<List<String>> recs = LmsAKit.parseCsv(cv.textValue()); if (recs.size() < 2) throw err("csv");
        List<Row> rows = validate(x, kind, term, recs);
        int okN = 0, skip = 0, errN = 0; for (Row r : rows) { if (r.st.equals("ok")) okN++; else if (r.st.equals("skip")) skip++; else errN++; }
        ArrayNode errors = Js.F.arrayNode(); for (Row r : rows) if (r.st.equals("error") && errors.size() < 500) errors.addObject().put("line", r.line).put("msg", r.msg);
        ObjectNode out = Js.F.objectNode(); out.put("kind", kind); if (term == null) out.putNull("term_id"); else out.put("term_id", term);
        out.put("total", rows.size()); out.put("ok", okN); out.put("skip", skip); out.put("error", errN);
        ArrayNode ra = out.putArray("rows"); for (int i = 0; i < rows.size() && i < 300; i++) { Row r = rows.get(i); ObjectNode o = ra.addObject(); o.put("line", r.line); o.put("st", r.st); o.put("msg", r.msg); o.set("data", r.data); }
        out.set("errors", errors);
        if (!isTrue(Js.get(b, "apply"))) return out;
        int ins = 0;
        for (Row r : rows) {
            if (!r.st.equals("ok")) continue; ObjectNode d = r.data;
            if (kind.equals("person")) m.insertPerson(x.tid, d.get("member_no").asText(), d.get("kind").asText(), d.get("unit_code").isNull() ? null : d.get("unit_code").asText(), d.get("status").asText(), d.get("grade_year").isNull() ? null : d.get("grade_year").asInt());
            else if (kind.equals("section")) {
                Double cr = d.get("credits").isNull() ? null : d.get("credits").asDouble(); String unit = d.get("unit_code").isNull() ? null : d.get("unit_code").asText(); String cat = d.get("category").isNull() ? null : d.get("category").asText();
                m.upsertCourseImp(x.tid, d.get("course_code").asText(), d.get("name").asText(), cr, unit, cat);
                m.insertSectionImp(x.tid, term, d.get("course_code").asText(), d.get("section_no").asText(), d.get("name").asText() + " " + d.get("section_no").asText() + "분반", d.get("mode").asText(), d.get("capacity").isNull() ? null : d.get("capacity").asInt());
            } else m.upsertEnrImp(x.tid, r.sid, r.pid, d.get("kind").asText());
            ins++;
        }
        ObjectNode counts = Js.F.objectNode(); counts.put("inserted", ins); counts.put("skipped", skip); counts.put("error", errN);
        int runId = m.insertRun(x.tid, term, kind, counts.toString(), errors.toString());
        audit(x, "lms.import", det("kind", kind, "term_id", term, "inserted", ins, "skipped", skip, "error", errN));
        out.put("applied", true); out.put("run_id", runId); out.set("counts", counts); return out; }); }

    /* ── 분반 동기화(SFR-018) ── */
    static ObjectNode findClass(JsonNode CL, Object id, JsonNode not) { if (id == null || CL == null || !CL.isArray()) return null; for (JsonNode k : CL) if (k.isObject() && k != not && Js.strictEq(k.get("id"), String.valueOf(id))) return (ObjectNode) k; return null; }
    @Override public Object sync(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s);
        if (s.get("rep_section_id") != null) throw err("sync_rep"); if (s.get("class_id") == null) throw err("sync_class");
        String sid = (String) s.get("section_id");
        List<Map<String, Object>> sib = m.selectSiblings((String) s.get("term_id"), (String) s.get("course_code"), sid); if (sib.isEmpty()) throw err("sync_none");
        Map<String, Object> st = m.selectDocForUpdate(x.tid); if (st == null) throw err("lms_state");
        JsonNode doc = Js.parse((String) st.get("doc")); JsonNode CL = doc.get("classes"); ObjectNode src = findClass(CL, s.get("class_id"), null); if (src == null) throw err("sync_class");
        List<LmsAKit.Dst> dsts = new ArrayList<>(); int noclass = 0;
        for (Map<String, Object> d : sib) { ObjectNode k = d.get("class_id") == null ? null : findClass(CL, d.get("class_id"), src); if (k != null) dsts.add(new LmsAKit.Dst(String.valueOf(d.get("section_id")), String.valueOf(d.get("section_no")), k)); else noclass++; }
        List<String> dl = new ArrayList<>(); for (LmsAKit.Dst d : dsts) dl.add(d.dst());
        Map<String, String> hist = new HashMap<>(); for (Map<String, Object> r : m.selectHist(dl.isEmpty() ? "00000000-0000-0000-0000-000000000000" : String.join(",", dl))) hist.put(r.get("d") + "|" + r.get("t") + "|" + r.get("o"), String.valueOf(r.get("a")));
        LmsAKit.SyncOut R0 = LmsAKit.syncClasses(src, dsts, hist);
        for (LmsAKit.Log l : R0.log) m.insertSync(x.tid, sid, l.dst(), l.type(), l.oid(), l.action(), x.uid);
        int rev = R0.changed ? docSave(x.tid, doc) : ((Number) st.get("rev")).intValue();
        audit(x, "lms.sync", det("section_id", sid, "copied", R0.copied, "updated", R0.updated, "deleted", R0.deleted, "excluded", R0.excluded, "unchanged", R0.unchanged));
        ObjectNode o = Js.F.objectNode(); o.put("sections", dsts.size()); o.put("noclass", noclass); o.put("copied", R0.copied); o.put("updated", R0.updated); o.put("deleted", R0.deleted); o.put("excluded", R0.excluded); o.put("unchanged", R0.unchanged); o.put("rev", rev); return o; }); }
    int docSave(String tid, JsonNode doc) { String s = Js.stringify(doc); return m.updateDoc(s, s.length(), tid); }
    @Override public Object syncHistory(String sectionId, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(sectionId == null ? "" : Js.trim(sectionId)); canSection(x, s);
        ObjectNode o = Js.F.objectNode(); o.set("rows", Js.parse(m.selectSyncHist((String) s.get("section_id")))); return o; }); }

    /* ── 합반(SFR-019 · 052) ── */
    @Override public Object merge(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> rep = sectionOf(b, "rep_section_id"); canSection(x, rep); if (rep.get("rep_section_id") != null) throw err("merge");
        JsonNode iv = Js.get(b, "section_ids"); if (iv == null || !iv.isArray() || iv.size() == 0 || iv.size() > 20) throw err("merge");
        LinkedHashSet<String> ids = new LinkedHashSet<>(); for (JsonNode v : iv) ids.add(T(v)); List<Map<String, Object>> L = new ArrayList<>();
        String repId = (String) rep.get("section_id");
        for (String id : ids) { Map<String, Object> s = sectionOf(id); canSection(x, s);
            if (s.get("section_id").equals(repId) || !s.get("term_id").equals(rep.get("term_id")) || s.get("rep_section_id") != null) throw err("merge");
            if (m.existsRepOf((String) s.get("section_id")) > 0) throw err("merge");
            L.add(s); }
        for (Map<String, Object> s : L) m.updateMerge(repId, (String) s.get("section_id"));
        int moved = 0; Integer rev = null; Map<String, Object> st = m.selectDocForUpdate(x.tid);
        if (st != null) { JsonNode doc = Js.parse((String) st.get("doc")); JsonNode CL = doc.get("classes"); ObjectNode cr = findClass(CL, rep.get("class_id"), null);
            List<ObjectNode> sh = new ArrayList<>(); if (cr != null) for (Map<String, Object> s : L) { ObjectNode k = findClass(CL, s.get("class_id"), cr); if (k != null) sh.add(k); }
            if (cr != null && !sh.isEmpty()) { moved = LmsAKit.mergeActivity(cr, sh); rev = docSave(x.tid, doc); } else rev = ((Number) st.get("rev")).intValue(); }
        audit(x, "lms.merge", det("rep_section_id", repId, "n", L.size(), "moved", moved));
        ObjectNode o = Js.F.objectNode(); o.put("merged", L.size()); o.put("moved", moved); if (rev == null) o.putNull("rev"); else o.put("rev", rev); return o; }); }
    @Override public Object unmerge(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s); if (s.get("rep_section_id") == null) throw err("unmerge");
        m.updateUnmerge((String) s.get("section_id")); audit(x, "lms.unmerge", det("section_id", s.get("section_id"))); return ok(); }); }

    /* ── 조교 · 청강 신청(SFR-025 · 051) ── */
    void requestAdd(String tid, String sid, String pid, String kind, String source) throws Exception {
        if (kind.equals("ta")) { if (m.existsTa(sid, pid) > 0) throw err("req_dup"); m.insertTaPending(tid, sid, pid, source.equals("manual") ? "manual" : "request"); return; }
        String e = m.selectEnrRow(sid, pid);
        if (e != null && !e.equals("dropped")) throw err("req_dup");
        if (e != null) m.updateEnrAuditPending(source, sid, pid); else m.insertEnrAuditPending(tid, sid, pid, source);
    }
    @Override public Object request(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s); String kind = T(b, "kind"); if (!kind.equals("ta") && !kind.equals("audit")) throw err("req_kind");
        Map<String, Object> p = personOf(T(b, "member_no")); requestAdd(x.tid, (String) s.get("section_id"), (String) p.get("person_id"), kind, "manual");
        audit(x, "lms.request", det("section_id", s.get("section_id"), "member_no", p.get("member_no"), "kind", kind)); return ok(); }); }
    @Override public Object requestDecide(JsonNode b, HttpServletRequest req) throws Exception { return run(req, x -> {
        Map<String, Object> s = sectionOf(b, "section_id"); canSection(x, s); String kind = T(b, "kind"); if (!kind.equals("ta") && !kind.equals("audit")) throw err("req_kind");
        Map<String, Object> p = personOf(T(b, "member_no")); boolean yes = isTrue(Js.get(b, "approve")); String sid = (String) s.get("section_id"), pid = (String) p.get("person_id");
        int r = kind.equals("ta") ? (yes ? m.approveTa(x.uid, sid, pid) : m.deleteTaPending(sid, pid)) : (yes ? m.approveAudit(sid, pid) : m.deleteAuditPending(sid, pid));
        if (r == 0) throw err("req");
        audit(x, "lms.request." + (yes ? "approve" : "reject"), det("section_id", sid, "member_no", p.get("member_no"), "kind", kind));
        ObjectNode o = ok(); o.put("status", yes ? "approved" : "rejected"); return o; }); }

    /* ── 단과대학 관리 범위 · 교수 계정 연결(정운영자) ── */
    @Override public Object scope(JsonNode b, HttpServletRequest req) throws Exception {
        Map<String, Object> a = auth.need(req); if (!"univ".equals(a.get("type"))) throw err("lms_edition"); String tid = (String) a.get("tid");
        X x0 = tx.inTenant(tid, () -> ctx(a)); if (!"owner".equals(x0.role)) throw err("lms_role");
        String email = T(b, "email").toLowerCase(Locale.ROOT); String uid = m.selectUserIdByEmail(email, tid); if (uid == null) throw err("lms_user");
        return tx.inTenant(tid, () -> { X x = ctx(a);
            JsonNode uv = Js.get(b, "units"); if (uv == null || !uv.isArray() || uv.size() > 20) throw err("scope_units");
            LinkedHashSet<String> us = new LinkedHashSet<>(); for (JsonNode v : uv) us.add(T(v)); for (String v : us) if (!mt(RE_UNIT, v)) throw err("scope_units");
            if (!us.isEmpty() && m.countUnitsIn(String.join(",", us)) != us.size()) throw err("scope_units");
            String mn = T(b, "member_no"); if (!mn.isEmpty() && !mt(RE_MNO, mn)) throw err("member_no");
            if (us.isEmpty() && mn.isEmpty()) m.deleteLink(uid); else m.upsertLink(tid, uid, String.join(",", us), mn.isEmpty() ? null : mn);
            ArrayNode ua = Js.F.arrayNode(); us.forEach(ua::add); audit(x, "lms.scope", det("email", email, "units", ua, "member_no", mn.isEmpty() ? null : mn)); return ok(); });
    }

    /* ── 학습자(내 분반) ── */
    @Override public Object my(byte[] body, boolean post, HttpServletRequest req) throws Exception {
        Map<String, String> ck = new HashMap<>(); String h = req.getHeader("cookie");
        if (h != null) for (String part : h.split(";")) { String t = part.trim(); if (t.isEmpty()) continue; String[] kv = t.split("=", -1); if (kv[0].isEmpty()) continue; String v = String.join("=", Arrays.copyOfRange(kv, 1, kv.length)); try { v = java.net.URLDecoder.decode(v.replace("+", "%2B"), java.nio.charset.StandardCharsets.UTF_8); } catch (Exception e) { } ck.put(kv[0], v); }
        String t = ck.containsKey("__Host-dd_lsid") && !ck.get("__Host-dd_lsid").isEmpty() ? ck.get("__Host-dd_lsid") : ck.get("dd_lsid");
        if (t == null || t.isEmpty() || t.length() > 100) throw processException("dd.401.auth");
        Map<String, Object> ls = m.selectLearnerSession(DdCrypto.sha(t)); if (ls == null) throw processException("dd.401.auth");
        String tid = String.valueOf(ls.get("tenant_id")), lsid = String.valueOf(ls.get("sid"));
        if (!"univ".equals(m.selectTenantType(tid))) throw err("lms_edition");
        JsonNode b = post ? DdWeb.readBody(body, 4096) : null;
        if (b != null) rl.limit("lpr:" + tid + ":" + lsid, 30, 600000L);
        return tx.inTenant(tid, () -> {
            Map<String, Object> p = m.selectPerson(lsid);
            if (p == null && mt(RE_UUID, lsid)) { String no = m.selectAccountStudentNo(lsid); if (no != null) p = m.selectPerson(no); }
            if (b == null) {
                ObjectNode o = Js.F.objectNode();
                if (p == null) { o.putNull("me"); o.putArray("sections"); o.putArray("requests"); o.putArray("open"); return o; }
                o.putObject("me").put("member_no", (String) p.get("member_no")); o.setAll((ObjectNode) Js.parse(m.selectPub((String) p.get("person_id")))); return o;
            }
            if (p == null) throw err("person");
            String act = T(b, "act"), kind = T(b, "kind"); if (!kind.equals("ta") && !kind.equals("audit")) throw err("req_kind");
            String sid = T(b, "section_id"); if (!mt(RE_UUID, sid)) throw err("section"); String pid = (String) p.get("person_id");
            if (act.equals("request")) {
                if (m.selectOpenSection(sid) == null) throw err("section");
                requestAdd(tid, sid, pid, kind, "request"); txm.insertAudit(tid, "learner:" + lsid, "lms.request.self", det("section_id", sid, "kind", kind).toString()); return okOnly();
            }
            if (!act.equals("cancel")) throw err("req_kind");
            int r = kind.equals("ta") ? m.deleteTaPending(sid, pid) : m.cancelAudit(sid, pid);
            if (r == 0) throw err("req");
            txm.insertAudit(tid, "learner:" + lsid, "lms.request.cancel", det("section_id", sid, "kind", kind).toString()); return okOnly();
        });
    }
    static ObjectNode okOnly() { return ok(); }
}
