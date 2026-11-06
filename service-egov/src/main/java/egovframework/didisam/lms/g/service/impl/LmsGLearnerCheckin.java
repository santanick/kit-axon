package egovframework.didisam.lms.g.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdWeb;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Function;
import org.springframework.stereotype.Component;

/**
 * 묶음 P 앱 출석(학습자 PWA) → 묶음 G 출석 체크인을 그대로 실행한다(Node mod-p.js attCheckin과 같음).
 * 출석 규칙 · 인증번호 · QR의 원본은 G. 학습자 포털 세션의 학번을 member_no로 넣고 G의 SPEC · 매퍼 문장(checkin) · 오류 · 감사 · 제한을 그대로 쓴다.
 * (묶음 P 담당이 추가한 파일 — G의 패키지 내부 SPEC을 읽기 위해 같은 패키지에 둔다. G 원본 파일은 고치지 않았다.)
 */
@Component
public class LmsGLearnerCheckin {
    private final LmsEngine engine; private final Map<String, Function<Map<String, Object>, String>> stmts = new HashMap<>();
    private final JsonNode route;
    public LmsGLearnerCheckin(LmsEngine engine, LmsGMapper m) {
        this.engine = engine; stmts.put("checkin", p -> LmsGServiceImpl.first(m.checkin(p)));
        this.route = LmsGServiceImpl.ROUTES.get("POST /api/lms/g/checkin");
    }
    private JsonNode one(Map<String, Object> who, JsonNode x, String sid, HttpServletRequest req) throws Exception {
        ObjectNode b = DdWeb.JSON.createObjectNode();
        b.set("session_id", x.get("session_id")); b.put("member_no", sid);
        JsonNode mth = x.get("method"); boolean hasQr = x.hasNonNull("qr") && !(x.get("qr").isTextual() && x.get("qr").asText().isEmpty());
        if (mth != null && !mth.isNull() && !(mth.isTextual() && mth.asText().isEmpty())) b.set("method", mth); else b.put("method", hasQr ? "qr" : "code");
        if (x.has("code")) b.set("code", x.get("code")); if (x.has("qr")) b.set("qr", x.get("qr"));
        JsonNode ta = x.hasNonNull("offline_at") && !(x.get("offline_at").isTextual() && x.get("offline_at").asText().isEmpty()) ? x.get("offline_at") : x.get("taken_at");
        if (ta != null) b.set("taken_at", ta);
        return engine.run(LmsGServiceImpl.SPEC, route, who, req, b.toString().getBytes(StandardCharsets.UTF_8), stmts);
    }
    public JsonNode run(Map<String, Object> learner, HttpServletRequest req, byte[] body) throws Exception {
        String sid = String.valueOf(learner.get("sid"));
        Map<String, Object> who = new HashMap<>(); who.put("tid", learner.get("tid")); who.put("uid", "learner:" + sid); who.put("email", "learner:" + sid); who.put("role", "learner");
        JsonNode b = DdWeb.readBody(body, 64 * 1024);
        if (!b.isObject()) throw new DdException(400, "형식이 올바르지 않습니다.", "bad_json");
        if (!b.has("items") || !b.get("items").isArray()) return one(who, b, sid, req);
        if (b.get("items").size() > 50) throw new DdException(400, "오프라인 출석은 한 번에 50건까지 보냅니다.", "bad_input");
        ArrayNode items = DdWeb.JSON.createArrayNode();
        for (JsonNode x : b.get("items")) {
            ObjectNode o = DdWeb.JSON.createObjectNode();
            if (x == null || !x.isObject()) { o.putNull("session_id"); o.put("ok", false); o.put("error", "bad_input"); items.add(o); continue; }
            try { JsonNode r = one(who, x, sid, req); o.set("session_id", r.get("session_id")); o.put("ok", true); o.set("status", r.get("status")); }
            catch (DdException e) { JsonNode s = x.get("session_id"); if (s == null) o.putNull("session_id"); else o.set("session_id", s); o.put("ok", false); o.put("error", e.getCode()); o.put("message", e.getMessage()); }
            items.add(o);
        }
        ObjectNode out = DdWeb.JSON.createObjectNode(); out.put("ok", true); out.set("items", items); return out;
    }
}
