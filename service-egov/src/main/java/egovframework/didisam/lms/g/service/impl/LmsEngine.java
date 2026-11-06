package egovframework.didisam.lms.g.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import egovframework.didisam.cmm.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.concurrent.Callable;
import java.util.function.Function;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import org.egovframe.rte.fdl.cmmn.exception.EgovBizException;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import static egovframework.didisam.cmm.Js.*;

/**
 * v30 학사 LMS 묶음 G · I · J 공용 경로 실행기 — Node service/server/lms/mod-g.js engine()과 같은 순서 · 같은 규칙:
 *   ① 로그인(need) ② 권한(staff = owner · sub) ③ 입력(GET 쿼리 · 본문 JSON) 검증 ④ 횟수 제한 ⑤ 기관 범위 트랜잭션에서 SQL 문 차례 실행
 *   ⑥ SQL이 {"err": 코드}를 내면 오류 표로 바꾸고 롤백 ⑦ 감사 기록. 응답 JSON은 SQL이 만든 것을 그대로 돌려준다.
 * 경로 선언(SPEC)과 SQL은 Node 파일에서 생성한다(각 묶음 LmsXServiceImpl · lms_x.xml).
 */
@Component
public class LmsEngine {
    static final Pattern UUID_RE = Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    static final Pattern MNO = Pattern.compile("^[A-Za-z0-9_-]{4,20}$");
    static final Pattern TS = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d{1,3})?)?(Z|[+-]\\d{2}:\\d{2})$");
    static final Pattern INT = Pattern.compile("^-?\\d{1,9}$");
    static final Pattern NUM = Pattern.compile("^-?\\d{1,9}(\\.\\d{1,9})?$");

    private final TenantTx tx; private final DdWeb web; private final DdRateLimiter rl; private final LmsAuthMapper auth;
    public LmsEngine(TenantTx tx, DdWeb web, DdRateLimiter rl, LmsAuthMapper auth) { this.tx = tx; this.web = web; this.rl = rl; this.auth = auth; }

    /** 학습자 포털 세션(dd_lsid → learner_sessions) — Node engine learner()와 같음 */
    Map<String, Object> learner(HttpServletRequest req) throws Exception {
        String t = web.lsidToken(req); if (t == null || t.length() > 100) return null;
        byte[] h = MessageDigest.getInstance("SHA-256").digest(t.getBytes(StandardCharsets.UTF_8));
        StringBuilder b = new StringBuilder(); for (byte x : h) b.append(String.format("%02x", x));
        String id = b.toString();
        return tx.plain(() -> auth.learnerSession(id));
    }

    /** 선언 JSON {err: {코드: [상태, 문구]}, routes: [{m, p, roles, max, params: [[이름, 형식, 필수, a, b, 기본]], stmts, audit, limit}]} → 경로 표 */
    public static Map<String, JsonNode> routes(JsonNode spec) {
        Map<String, JsonNode> m = new HashMap<>();
        for (JsonNode r : spec.get("routes")) m.put(r.get("m").asText() + " " + r.get("p").asText(), r);
        return m;
    }

    static DdException bad(JsonNode err, String code, String extra) {
        JsonNode e = err.get(code);
        int st = e == null ? 400 : e.get(0).asInt(); String msg = e == null ? "요청을 처리할 수 없습니다." : e.get(1).asText();
        return new DdException(st, msg + (extra != null ? " (" + extra + ")" : ""), code);
    }
    static boolean missing(JsonNode v) { return v == null || v.isMissingNode() || v.isNull() || (v.isTextual() && v.textValue().isEmpty()); }

    /** 입력 하나 — Node param()과 같은 규칙. 값은 모두 문자열(SQL 안에서 cast) */
    static String param(JsonNode err, JsonNode src, JsonNode d) {
        String name = d.get(0).asText(), type = d.get(1).asText(); boolean req = d.size() > 2 && truthy(d.get(2));
        JsonNode A = d.size() > 3 ? d.get(3) : null, B = d.size() > 4 ? d.get(4) : null, DEF = d.size() > 5 ? d.get(5) : null;
        JsonNode v = src.get(name);
        String def = DEF == null || DEF.isNull() ? null : str(DEF);
        if (missing(v)) { if (req) throw bad(err, "required", name); return def; }
        switch (type) {
            case "uuid": if (!v.isTextual() || !UUID_RE.matcher(v.textValue()).matches()) throw bad(err, "bad_input", name); return v.textValue().toLowerCase(Locale.ROOT);
            case "mno": if (!v.isTextual() || !MNO.matcher(v.textValue()).matches()) throw bad(err, "bad_input", name); return v.textValue();
            case "text": {
                if (!v.isTextual()) throw bad(err, "bad_input", name);
                String s = trim(v.textValue());
                if (s.isEmpty()) { if (req) throw bad(err, "required", name); return def; }
                if (s.length() > A.asDouble()) throw bad(err, "bad_input", name); return s;
            }
            case "enum": { if (!v.isTextual()) throw bad(err, "bad_input", name); for (JsonNode x : A) if (x.asText().equals(v.textValue())) return v.textValue(); throw bad(err, "bad_input", name); }
            case "ts": if (!v.isTextual() || !TS.matcher(v.textValue()).matches()) throw bad(err, "bad_input", name); return v.textValue();
            case "int": case "num": {
                String s; boolean isNum = v.isNumber();
                if (isNum) { double dd = v.doubleValue(); if (Double.isNaN(dd) || Double.isInfinite(dd)) throw bad(err, "bad_input", name); s = str(v); }
                else if (v.isTextual()) s = trim(v.textValue()); else throw bad(err, "bad_input", name);
                if (!("int".equals(type) ? INT : NUM).matcher(s).matches() && !(isNum && "num".equals(type))) throw bad(err, "bad_input", name);
                double n = Js.num(s);
                if ("int".equals(type) && (Double.isNaN(n) || n != Math.rint(n))) throw bad(err, "bad_input", name);
                if (Double.isNaN(n) || n < A.asDouble() || n > B.asDouble()) throw bad(err, "bad_input", name);
                return "int".equals(type) ? numStr(n) : s;
            }
            case "bool": {
                if ((v.isBoolean() && v.booleanValue()) || (v.isTextual() && ("true".equals(v.textValue()) || "1".equals(v.textValue())))) return "true";
                if ((v.isBoolean() && !v.booleanValue()) || (v.isTextual() && ("false".equals(v.textValue()) || "0".equals(v.textValue())))) return "false";
                throw bad(err, "bad_input", name);
            }
            case "json": { if (!v.isObject() && !v.isArray()) throw bad(err, "bad_input", name); String s = stringify(v); if (s.length() > A.asDouble()) throw bad(err, "bad_input", name); return s; }
            default: throw bad(err, "bad_input", name);
        }
    }

    public JsonNode run(JsonNode spec, JsonNode r, Callable<Map<String, Object>> need, HttpServletRequest req, byte[] body, Map<String, Function<Map<String, Object>, String>> stmts) throws Exception {
        JsonNode err = spec.get("err");
        /* who: 'any' = 운영자 세션 또는 학습자 포털 세션. 학습자면 학번(member_no)은 본인 것으로 고정 · 보고서는 학생 화면 */
        Map<String, Object> a; String me = null;
        try { a = need.call(); }
        catch (EgovBizException e) {
            if (!"any".equals(r.path("who").asText()) || !"dd.401.auth".equals(e.getMessageKey())) throw e;
            Map<String, Object> s = learner(req); if (s == null) throw e;
            me = String.valueOf(s.get("sid")); a = new HashMap<>(); a.put("tid", s.get("tenant_id")); a.put("uid", "learner:" + me); a.put("email", "learner:" + me); a.put("role", "learner");
        }
        if ("staff".equals(r.path("roles").asText()) && !List.of("owner", "sub").contains(String.valueOf(a.get("role")))) throw bad(err, "role", null);
        boolean isQ = "GET".equals(r.get("m").asText());
        JsonNode src;
        if (isQ) { ObjectNode q = F.objectNode(); req.getParameterMap().forEach((k, vs) -> { if (vs.length > 0) q.set(k, TextNode.valueOf(vs[vs.length - 1])); }); src = q; }
        else { src = DdWeb.readBody(body, r.has("max") ? r.get("max").asInt() : 16384); if (!src.isObject()) throw bad(err, "bad_input", "body"); }
        if (me != null) {
            boolean hasM = false, hasV = false; for (JsonNode d : arr(r.get("params"))) { hasM |= "member_no".equals(d.get(0).asText()); hasV |= "view".equals(d.get(0).asText()); }
            if (hasM) ((ObjectNode) src).put("member_no", me); if (hasV) ((ObjectNode) src).put("view", "student");
        }
        Map<String, Object> P = new HashMap<>();
        P.put("_actor", a.get("email")); P.put("_role", a.get("role")); P.put("_me", me);
        P.put("_ip", web.ip(req).replaceFirst("^::ffff:", ""));
        String ua = req.getHeader("user-agent"); ua = cut(ua == null ? "" : ua, 200); P.put("_ua", ua.isEmpty() ? null : ua);
        List<JsonNode> params = arr(r.get("params"));
        for (JsonNode d : params) P.put(d.get(0).asText(), param(err, src, d));
        JsonNode lim = r.get("limit");
        if (lim != null && lim.isArray()) rl.limit(lim.get(0).asText() + ":" + a.get("uid"), lim.get(1).asInt(), lim.get(2).asLong());
        String tid = (String) a.get("tid");
        JsonNode out = tx.inTenant(tid, () -> {
            JsonNode o = null;
            for (JsonNode st : r.get("stmts")) {
                Function<Map<String, Object>, String> fn = stmts.get(st.asText());
                if (fn == null) throw new IllegalStateException("SQL 없음: " + st.asText());
                String raw = fn.apply(P);
                o = raw == null ? null : parse(raw);
                if (o != null && o.isObject() && truthy(o.get("err"))) throw bad(err, str(o.get("err")), null);
                if (o != null && o.isObject()) { JsonNode oo = o; oo.fieldNames().forEachRemaining(k -> { JsonNode v = oo.get(k); if (v.isTextual() && !P.containsKey("$" + k)) P.put("$" + k, v.textValue()); }); }
            }
            return o;
        });
        if (r.hasNonNull("audit")) {
            ObjectNode det = F.objectNode();
            for (JsonNode d : params) { String t = d.get(1).asText(); if (t.equals("uuid") || t.equals("mno") || t.equals("enum")) { Object v = P.get(d.get(0).asText()); if (v == null) det.putNull(d.get(0).asText()); else det.put(d.get(0).asText(), (String) v); } }
            tx.audit(tid, (String) a.get("email"), r.get("audit").asText(), stringify(det));
        }
        return out;
    }
}
