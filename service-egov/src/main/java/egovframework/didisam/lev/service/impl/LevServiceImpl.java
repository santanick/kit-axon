package egovframework.didisam.lev.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * v46 학습 이벤트 표준 · 가명 저장 — Node lev.js와 같은 규칙.
 * 표 learning_event: 식별자는 학번 또는 간편가입 가명 learner_id(sid)만, 학습자 자유 글 금지(val은 숫자 · 참거짓 · 짧은 코드만).
 */
@Service("levService")
public class LevServiceImpl extends EgovAbstractServiceImpl implements LevService {
    private static final Logger log = LoggerFactory.getLogger(LevServiceImpl.class);
    static final JsonNodeFactory F = JsonNodeFactory.instance;
    public static final Set<String> VERBS = Set.of("attempt", "hint", "submit", "revise", "reflect", "mastery", "ai.ask", "vision", "goal");
    public static final Set<String> LVLS = Set.of("L0", "L1", "L2", "L3");
    public static final int MAX_BATCH = 50;
    static final Pattern OBJ = Pattern.compile("[\\w.-]{1,60}(/[\\w.-]{1,60})?"), VKEY = Pattern.compile("[A-Za-z][A-Za-z0-9]{0,15}"), CODE = Pattern.compile("[\\w.-]{0,24}"),
        SIDP = Pattern.compile("[A-Za-z0-9_-]{4,40}");
    private final LevMapper mapper; private final TenantTx tx; private final DdRateLimiter rl; private final StateService state;
    public LevServiceImpl(LevMapper mapper, TenantTx tx, DdRateLimiter rl, StateService state) { this.mapper = mapper; this.tx = tx; this.rl = rl; this.state = state; }

    /** val 정리: 객체 · 키 8개 · 값은 유한 숫자 · 참거짓 · 짧은 코드(24자, 공백 없음)만 — 글이 오면 null(거부) */
    public static ObjectNode cleanVal(JsonNode v) {
        ObjectNode o = F.objectNode(); if (v == null || v.isNull()) return o; if (!v.isObject() || v.size() > 8) return null;
        for (var it = v.fields(); it.hasNext(); ) {
            var e = it.next(); JsonNode x = e.getValue(); if (!VKEY.matcher(e.getKey()).matches()) return null;
            if (x.isNumber() && Double.isFinite(x.asDouble())) o.set(e.getKey(), x);
            else if (x.isBoolean()) o.set(e.getKey(), x);
            else if (x.isTextual() && CODE.matcher(x.asText()).matches()) o.set(e.getKey(), x);
            else return null;
        }
        return o;
    }
    /** 한 건 검증 — 오류 코드(lev_bad · lev_text) 또는 null */
    public static String check(JsonNode e) {
        if (e == null || !e.isObject()) return "lev_bad";
        if (!VERBS.contains(e.path("verb").asText(""))) return "lev_bad";
        if (!OBJ.matcher(e.path("obj").asText("")).matches()) return "lev_bad";
        String l = e.path("lvl").asText(""); if (!l.isEmpty() && !LVLS.contains(l)) return "lev_bad";
        for (String k : List.of("t", "text", "q", "a", "body", "msg", "note")) if (e.has(k)) return "lev_text";
        if (cleanVal(e.get("val")) == null) return "lev_text";
        return null;
    }
    static String atOf(JsonNode v) {
        String s = v != null && v.isTextual() ? v.asText() : ""; if (s.isEmpty() || s.length() > 30) return null;
        try { Instant t = Instant.parse(s); Instant now = Instant.now(); return t.isAfter(now.plusSeconds(300)) || t.isBefore(now.minusSeconds(30L * 86400)) ? null : t.toString(); } catch (Exception x) { return null; }
    }

    @Override public Map<String, Object> ingest(String tid, String sid, byte[] body) throws Exception {
        JsonNode b = DdWeb.readBody(body, 64 * 1024);
        try { rl.limit("lev2:" + tid + ":" + sid, 60, 600_000L); } catch (Exception x) { throw processException("dd.429.rate"); }
        JsonNode ev = b == null ? null : b.isArray() ? b : b.get("ev");
        if (ev == null || !ev.isArray() || ev.isEmpty()) throw processException("dd.400.lev_bad");
        if (ev.size() > MAX_BATCH) throw processException("dd.400.lev_many");
        for (JsonNode e : ev) { String c = check(e); if (c != null) throw processException("dd.400." + c); }
        tx.inTenant(tid, () -> { for (JsonNode e : ev) { String l = e.path("lvl").asText("");
            mapper.insertEv(tid, sid, e.get("verb").asText(), e.get("obj").asText(), l.isEmpty() ? null : l, cleanVal(e.get("val")).toString(), "client", "C", atOf(e.get("at"))); } return null; });
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("n", ev.size()); return o;
    }

    @Override public void server(String tid, String sid, String verb, String obj, String lvl, JsonNode val) {
        if (sid == null || !VERBS.contains(verb) || obj == null || !OBJ.matcher(obj).matches()) return;
        ObjectNode v = cleanVal(val); if (v == null) v = F.objectNode(); final String vs = v.toString();
        try { tx.inTenant(tid, () -> mapper.insertEv(tid, sid, verb, obj, LVLS.contains(lvl) ? lvl : null, vs, "server", "A", null)); }
        catch (Exception e) { log.warn("lev server event skipped: {}", e.toString()); }
    }

    static String qp(HttpServletRequest q, String k) { String v = q.getParameter(k); return v == null ? "" : v.strip(); }
    @Override public Map<String, Object> list(Map<String, Object> a, HttpServletRequest q) throws Exception {
        String tid = (String) a.get("tid");
        String cls = qp(q, "cls"), sid = qp(q, "sid"), verb = qp(q, "verb"), after = qp(q, "after");
        if (!cls.isEmpty() && !Pattern.matches("[\\w.-]{1,60}", cls)) throw processException("dd.400.lev_bad");
        if (!sid.isEmpty() && !SIDP.matcher(sid).matches()) throw processException("dd.400.lev_bad");
        if (!verb.isEmpty() && !VERBS.contains(verb)) throw processException("dd.400.lev_bad");
        if (!after.isEmpty()) { try { after = Instant.parse(after).toString(); } catch (Exception x) { throw processException("dd.400.lev_bad"); } }
        final String fc = cls.isEmpty() ? null : cls, fs = sid.isEmpty() ? null : sid, fv = verb.isEmpty() ? null : verb, fa = after.isEmpty() ? null : after;
        Set<String> sids = null, clsS = null;
        if ("teacher".equals(a.get("role"))) { var s = state.scope(a); sids = s.sids; clsS = s.classes; if (fc != null && !clsS.contains(fc)) throw processException("dd.403.scope"); }
        List<Map<String, Object>> rows = tx.inTenant(tid, () -> mapper.list(tid, fc, fc == null ? null : fc.replace("_", "\\_") + "/%", fs, fv, fa));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            if (sids != null) { String o = String.valueOf(r.get("obj")); int i = o.indexOf('/'); if (!sids.contains(String.valueOf(r.get("sid"))) && !(i > 0 && clsS.contains(o.substring(0, i)))) continue; }
            Map<String, Object> m = new LinkedHashMap<>(r); m.put("id", ((Number) r.get("id")).longValue()); m.put("val", DdWeb.JSON.readTree((String) r.get("val"))); out.add(m);
        }
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ev", out); return o;
    }
}
