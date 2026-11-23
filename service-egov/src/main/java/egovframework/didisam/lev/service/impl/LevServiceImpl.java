package egovframework.didisam.lev.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.lev.service.LevService;
import egovframework.didisam.state.service.StateService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/**
 * v46 학습 이벤트 표준 · 가명 저장 — Node service/server/lev.js와 같은 규칙 · 같은 오류 코드.
 * 표 learning_event(Node db.js 마이그레이션 소유): 식별자는 학번 또는 간편가입 가명 learner_id(sid)만, 학습자 자유 글 금지(val은 숫자 · 참거짓 · 짧은 코드만).
 * 신뢰: A = 서버 판정(튜터 · 힌트), C = 학습자 보고(클라이언트 묶음 · lp 차이분).
 */
@Service("levService")
public class LevServiceImpl extends EgovAbstractServiceImpl implements LevService {
    static final JsonNodeFactory F = JsonNodeFactory.instance;
    public static final List<String> VERBS = List.of("attempt", "hint", "submit", "revise", "reflect", "mastery", "ai.ask", "vision", "goal");
    public static final Set<String> LV = Set.of("", "L0", "L1", "L2", "L3"), KEYS = Set.of("verb", "obj", "lvl", "val", "at"), FREE = Set.of("text", "t", "q", "body");
    public static final int MAX_BATCH = 50;
    static final Pattern OBJ = Pattern.compile("[\\w-]{1,60}(/[\\w-]{1,60})?"), VKEY = Pattern.compile("[a-zA-Z]\\w{0,15}"), CODE = Pattern.compile("[\\w.:-]{1,24}"), CLS = Pattern.compile("[\\w-]{1,60}");
    private final LevMapper mapper; private final TenantTx tx; private final DdRateLimiter rl; private final StateService state;
    public LevServiceImpl(LevMapper mapper, TenantTx tx, DdRateLimiter rl, StateService state) { this.mapper = mapper; this.tx = tx; this.rl = rl; this.state = state; }

    /** 검증 오류(400, 코드는 Node LevErr.code와 같음) */
    static DdException err(String code, String msg) { return new DdException(400, msg, code); }

    /** val 검증: 키 8개 이하, 값은 유한수(소수 3자리) · 참거짓 · 24자 이하 코드. 글처럼 보이면 lev_free_text */
    public static ObjectNode cleanVal(JsonNode v) {
        ObjectNode o = F.objectNode(); if (v == null || v.isNull()) return o;
        if (!v.isObject()) throw err("lev_val", "val은 객체여야 합니다.");
        if (v.size() > 8) throw err("lev_val", "val 항목이 너무 많습니다.");
        for (var it = v.fields(); it.hasNext(); ) {
            var e = it.next(); JsonNode x = e.getValue();
            if (!VKEY.matcher(e.getKey()).matches()) throw err("lev_val", "val 키 형식이 올바르지 않습니다.");
            if (x.isNumber()) { double d = x.asDouble(); if (!Double.isFinite(d)) throw err("lev_val", "val 숫자가 올바르지 않습니다."); double r = Math.floor(d * 1000 + 0.5) / 1000; if (r == Math.rint(r) && Math.abs(r) < 1e15) o.put(e.getKey(), (long) r); else o.put(e.getKey(), r); }
            else if (x.isBoolean()) o.set(e.getKey(), x);
            else if (x.isTextual()) { if (!CODE.matcher(x.asText()).matches()) throw err("lev_free_text", "이벤트에는 학습자 글을 넣을 수 없습니다(길이 · 종류만)."); o.set(e.getKey(), x); }
            else throw err("lev_val", "val 값 형식이 올바르지 않습니다.");
        }
        return o;
    }
    /** 이벤트 1건 검증 — 허용 키(verb · obj · lvl · val · at) 밖이면 거부 */
    public static ObjectNode cleanEvent(JsonNode e) {
        if (e == null || !e.isObject()) throw err("lev_form", "이벤트 형식이 올바르지 않습니다.");
        for (var it = e.fieldNames(); it.hasNext(); ) { String k = it.next(); if (!KEYS.contains(k)) throw err(FREE.contains(k) ? "lev_free_text" : "lev_form", "허용하지 않는 필드(" + (k.length() > 20 ? k.substring(0, 20) : k) + ")입니다."); }
        JsonNode vb = e.get("verb"); if (vb == null || !vb.isTextual() || !VERBS.contains(vb.asText())) throw err("lev_verb", "verb가 올바르지 않습니다.");
        String obj = js(e.get("obj")); if (!obj.isEmpty() && !OBJ.matcher(obj).matches()) throw err("lev_obj", "obj 형식이 올바르지 않습니다.");
        String lvl = js(e.get("lvl")); if (!LV.contains(lvl)) throw err("lev_lvl", "lvl이 올바르지 않습니다.");
        String at = null; JsonNode an = e.get("at");
        if (an != null && !an.isNull()) { Instant t; try { t = an.isNumber() ? Instant.ofEpochMilli(an.asLong()) : Instant.parse(an.asText()); } catch (Exception x) { t = null; }
            long now = System.currentTimeMillis(); if (t == null || t.toEpochMilli() > now + 300_000L || t.toEpochMilli() < now - 30L * 86_400_000L) throw err("lev_at", "at이 올바르지 않습니다.");
            at = t.toString(); }
        ObjectNode o = F.objectNode(); o.put("verb", vb.asText()); o.put("obj", obj); o.put("lvl", lvl); o.set("val", cleanVal(e.get("val"))); if (at != null) o.put("at", at); return o;
    }
    static String js(JsonNode v) { return v == null || v.isNull() ? "" : v.isTextual() ? v.asText() : v.toString(); }
    /** 학습자 묶음: 최대 50건, 하나라도 틀리면 전체 거부 */
    public static List<ObjectNode> cleanBatch(JsonNode b) {
        JsonNode list = b != null && b.isArray() ? b : b != null && b.isObject() && b.get("ev") != null && b.get("ev").isArray() ? b.get("ev") : null;
        if (list == null || list.isEmpty()) throw err("lev_form", "보낼 이벤트가 없습니다.");
        if (list.size() > MAX_BATCH) throw err("lev_batch", "한 번에 " + MAX_BATCH + "건까지 보낼 수 있습니다.");
        List<ObjectNode> out = new ArrayList<>(); for (JsonNode e : list) out.add(cleanEvent(e)); return out;
    }

    @Override public int insert(String tid, String sid, List<ObjectNode> ev, String src, String trust) throws Exception {
        int n = 0;
        for (ObjectNode e0 : ev) { ObjectNode e = cleanEvent(e0); JsonNode at = e.get("at");
            mapper.insertEv(tid, String.valueOf(sid), e.get("verb").asText(), e.get("obj").asText(), e.get("lvl").asText(), e.get("val").toString(), src, trust, at == null ? null : at.asText()); n++; }
        return n;
    }

    @Override public Map<String, Object> ingest(String tid, String sid, byte[] body) throws Exception {
        JsonNode b = DdWeb.readBody(body, 64 * 1024);
        rl.limit("levb:" + tid + ":" + sid, 120, 600_000L);
        List<ObjectNode> ev = cleanBatch(b);
        int n = tx.inTenant(tid, () -> insert(tid, sid, ev, "client", "C"));
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("n", n); return o;
    }

    /** lp 차이분 → 이벤트(Node diffLp): 새로 완료된 항목 submit(+점수), 비전 작성 · 수정 vision, 목표 달성 goal */
    public static List<ObjectNode> diffLp(JsonNode prev, JsonNode next) {
        JsonNode P = prev != null && prev.isObject() ? prev : F.objectNode(), N = next != null && next.isObject() ? next : F.objectNode(); List<ObjectNode> out = new ArrayList<>();
        JsonNode nc = N.get("cls");
        if (nc != null && nc.isObject()) for (var ce = nc.fields(); ce.hasNext(); ) {
            var c = ce.next(); JsonNode pc = P.path("cls").path(c.getKey()).path("items"); JsonNode items = c.getValue() == null ? null : c.getValue().get("items");
            if (items == null || !items.isObject()) continue;
            for (var ie = items.fields(); ie.hasNext(); ) {
                var i = ie.next(); JsonNode x = i.getValue(); String key = c.getKey() + "/" + i.getKey();
                if (!truthy(x) || !truthy(x.get("done")) || truthy(pc.path(i.getKey()).get("done")) || !OBJ.matcher(key).matches()) continue;
                ObjectNode e = F.objectNode(); e.put("verb", "submit"); e.put("obj", key); ObjectNode val = e.putObject("val"); val.put("done", true);
                JsonNode sc = x.get("score"); double d = jsNum(sc);
                if (sc != null && !sc.isNull() && !(sc.isTextual() && sc.asText().isEmpty()) && Double.isFinite(d)) { double r = Math.floor(d * 10 + 0.5) / 10; if (r == Math.rint(r)) val.put("score", (long) r); else val.put("score", r); }
                out.add(e);
            }
        }
        JsonNode V = N.get("vision"), PV = P.get("vision");
        if (V != null && V.isObject() && truthy(V.get("at")) && (PV == null || PV.isNull() || !Objects.equals(js(PV.get("at")), js(V.get("at"))))) {
            ObjectNode e = F.objectNode(); e.put("verb", "vision"); e.put("obj", ""); ObjectNode val = e.putObject("val");
            val.put("goals", V.get("goals") != null && V.get("goals").isArray() ? Math.min(9, V.get("goals").size()) : 0); val.put("edit", PV != null && !PV.isNull()); out.add(e);
        }
        Set<String> pg = new HashSet<>(); JsonNode pgs = PV == null ? null : PV.get("goals");
        if (pgs != null && pgs.isArray()) { int i = 0; for (JsonNode g : pgs) { if (truthy(g)) { if (truthy(g.get("done"))) pg.add(truthy(g.get("id")) ? js(g.get("id")) : String.valueOf(i)); i++; } } }
        JsonNode gs = V == null ? null : V.get("goals");
        if (gs != null && gs.isArray()) for (int i = 0; i < gs.size(); i++) { JsonNode g = gs.get(i); String id = truthy(g) && truthy(g.get("id")) ? js(g.get("id")) : String.valueOf(i);
            if (truthy(g) && truthy(g.get("done")) && !pg.contains(id)) { ObjectNode e = F.objectNode(); e.put("verb", "goal"); e.put("obj", CLS.matcher(id).matches() ? id : ""); e.putObject("val").put("n", i + 1); out.add(e); } }
        return out.size() > 100 ? out.subList(0, 100) : out;
    }
    static boolean truthy(JsonNode v) { return v != null && !v.isNull() && !(v.isBoolean() && !v.asBoolean()) && !(v.isNumber() && (v.asDouble() == 0 || Double.isNaN(v.asDouble()))) && !(v.isTextual() && v.asText().isEmpty()); }
    static double jsNum(JsonNode v) { if (v == null || v.isNull()) return 0; if (v.isNumber()) return v.asDouble(); if (v.isBoolean()) return v.asBoolean() ? 1 : 0; if (v.isTextual()) { String t = v.asText().strip(); if (t.isEmpty()) return 0; try { return Double.parseDouble(t); } catch (NumberFormatException e) { return Double.NaN; } } return Double.NaN; }

    static String qp(HttpServletRequest q, String k) { String v = q.getParameter(k); return v == null ? "" : v; }
    /** 조회(GET /api/lev): cls(과정 id) · sid · verb · after(id), id 순 최대 500건. 교수자는 담당 반 · 학생만 — {rows, next} */
    @Override public Map<String, Object> list(Map<String, Object> a, HttpServletRequest q) throws Exception {
        String tid = (String) a.get("tid");
        String cls = qp(q, "cls"), sid = qp(q, "sid"), verb = qp(q, "verb"); double ad = jsNum(F.textNode(qp(q, "after"))); long after = Double.isNaN(ad) ? 0 : Math.max(0, (long) Math.floor(ad + 0.5));
        if (!cls.isEmpty() && !CLS.matcher(cls).matches()) throw err("lev_obj", "cls 형식이 올바르지 않습니다.");
        if (!verb.isEmpty() && !VERBS.contains(verb)) throw err("lev_verb", "verb가 올바르지 않습니다.");
        var sc = "teacher".equals(a.get("role")) ? state.scope(a) : null;
        final String fc = cls.isEmpty() ? null : cls + "/%", fs = sid.isEmpty() ? null : sid, fv = verb.isEmpty() ? null : verb; final long fa = after;
        List<Map<String, Object>> rows = tx.inTenant(tid, () -> mapper.list(tid, fc, fs, fv, fa));
        List<Map<String, Object>> out = new ArrayList<>(); long last = 0;
        for (Map<String, Object> r : rows) {
            String o = String.valueOf(r.get("obj")); long id = ((Number) r.get("id")).longValue();
            if (sc != null && !(sc.sids.contains(String.valueOf(r.get("sid"))) && (!o.contains("/") || sc.classes.contains(o.split("/")[0])))) continue;
            last = id; Map<String, Object> m = new LinkedHashMap<>(); m.put("id", id); m.put("sid", r.get("sid")); m.put("verb", r.get("verb")); m.put("obj", o); m.put("lvl", r.get("lvl"));
            m.put("val", DdWeb.JSON.readTree((String) r.get("val"))); m.put("src", r.get("src")); m.put("trust", r.get("trust")); m.put("at", r.get("at")); out.add(m);
        }
        Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", out); o.put("next", out.isEmpty() ? after : last); return o;
    }
}
