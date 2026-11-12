package egovframework.didisam.lms.live.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdAiGuard;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.Js;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.cmm.TenantTxMapper;
import egovframework.didisam.lms.h.service.impl.LmsEfhGateway;
import egovframework.didisam.lms.live.service.LmsLiveService;
import egovframework.didisam.lms.o.service.impl.LmsOLlmBridge;
import egovframework.didisam.lms.o.service.impl.LmsOText;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.postgresql.util.PSQLException;
import org.springframework.stereotype.Service;

/** x2 실시간 수업 · 실시간 자막 — 업무 규칙은 SQL 함수(sql/a2_live.sql)가 갖고, 여기서는 권한 · 본문 한도 · 기관 범위 트랜잭션 · 감사만 한다(Node mod-live.js와 같은 표).
 *  예외: cap-view(로그인 없는 학생 자막 화면) · cap-translate · cap-summary(묶음 O LLM 경로, 안 되면 SQL 규칙 번역 · 요약). */
@Service("lmsLiveService")
public class LmsLiveServiceImpl extends EgovAbstractServiceImpl implements LmsLiveService {
    static final Map<String, LmsEfhGateway.Route> R = new LinkedHashMap<>();
    static {
        R.put("GET setting", new LmsEfhGateway.Route("lms_live_setting", "staff", 65536));
        R.put("POST setting", new LmsEfhGateway.Route("lms_live_setting_save", "staff", 8192));
        R.put("GET rooms", new LmsEfhGateway.Route("lms_live_rooms", "staff", 65536));
        R.put("POST room", new LmsEfhGateway.Route("lms_live_room_save", "staff", 8192));
        R.put("GET room", new LmsEfhGateway.Route("lms_live_room", "staff", 65536));
        R.put("POST room-state", new LmsEfhGateway.Route("lms_live_room_state", "staff", 4096));
        R.put("GET attendance", new LmsEfhGateway.Route("lms_live_attendance", "staff", 65536));
        R.put("GET summary", new LmsEfhGateway.Route("lms_live_summary", "staff", 65536));
        R.put("POST join", new LmsEfhGateway.Route("lms_live_join", "any", 4096));
        R.put("POST leave", new LmsEfhGateway.Route("lms_live_leave", "any", 4096));
        R.put("POST signal", new LmsEfhGateway.Route("lms_live_signal", "any", 40000));
        R.put("POST poll", new LmsEfhGateway.Route("lms_live_poll", "any", 4096));
        R.put("POST event", new LmsEfhGateway.Route("lms_live_event", "any", 8192));
        R.put("GET my", new LmsEfhGateway.Route("lms_live_my", "learner", 65536));
        R.put("POST rec-start", new LmsEfhGateway.Route("lms_live_rec_start", "staff", 4096));
        R.put("POST rec-part", new LmsEfhGateway.Route("lms_live_rec_part", "staff", 3145728));
        R.put("POST rec-finish", new LmsEfhGateway.Route("lms_live_rec_finish", "staff", 4096));
        R.put("POST rec-delete", new LmsEfhGateway.Route("lms_live_rec_delete", "staff", 4096));
        R.put("GET recs", new LmsEfhGateway.Route("lms_live_recs", "staff", 65536));
        R.put("GET rec", new LmsEfhGateway.Route("lms_live_rec_get", "any", 65536));
        R.put("GET rec-views", new LmsEfhGateway.Route("lms_live_rec_views", "staff", 65536));
        R.put("GET cap-setting", new LmsEfhGateway.Route("lms_live_cap_setting", "staff", 65536));
        R.put("POST cap-setting", new LmsEfhGateway.Route("lms_live_cap_setting_save", "staff", 4096));
        R.put("GET cap-rooms", new LmsEfhGateway.Route("lms_live_cap_rooms", "staff", 65536));
        R.put("POST cap-room", new LmsEfhGateway.Route("lms_live_cap_room", "staff", 4096));
        R.put("POST cap-seg", new LmsEfhGateway.Route("lms_live_cap_seg", "staff", 8192));
        R.put("GET cap-lines", new LmsEfhGateway.Route("lms_live_cap_lines", "staff", 65536));
        R.put("POST cap-edit", new LmsEfhGateway.Route("lms_live_cap_edit", "staff", 16384));
        R.put("POST cap-finish", new LmsEfhGateway.Route("lms_live_cap_finish", "staff", 4096));
        R.put("GET cap-transcript", new LmsEfhGateway.Route("lms_live_cap_get", "any", 65536));
        R.put("POST cap-script", new LmsEfhGateway.Route("lms_live_cap_script", "staff", 524288));
        R.put("GET cap-stats", new LmsEfhGateway.Route("lms_live_cap_stats", "staff", 65536));
        R.put("POST cap-audio", new LmsEfhGateway.Route("lms_live_cap_audio", "staff", 8192));
        R.put("GET cap-audio", new LmsEfhGateway.Route("lms_live_cap_audio_list", "staff", 65536));
    }
    static final Map<String, String> LN = new LinkedHashMap<>();
    static { String[] k = {"ko", "en", "ja", "zh", "vi", "uz", "mn", "ru", "es", "fr", "de", "id"}; String[] v = {"한국어", "영어", "일본어", "중국어", "베트남어", "우즈베크어", "몽골어", "러시아어", "스페인어", "프랑스어", "독일어", "인도네시아어"}; for (int i = 0; i < k.length; i++) LN.put(k[i], v[i]); }
    static final Pattern CODE = Pattern.compile("^(tn_[a-z0-9]{8,16})\\.([a-z0-9]{10})$");
    static final Pattern DD = Pattern.compile("^dd:(\\d{3}):([a-z_]+)$");
    static final JsonNodeFactory F = JsonNodeFactory.instance;

    private final LmsEfhGateway gw; private final LmsLiveMapper mapper; private final AuthService auth; private final TenantTx tx; private final TenantTxMapper txm; private final DdWeb web; private final DdRateLimiter rl; private final LmsOLlmBridge llm;
    public LmsLiveServiceImpl(LmsEfhGateway gw, LmsLiveMapper mapper, AuthService auth, TenantTx tx, TenantTxMapper txm, DdWeb web, DdRateLimiter rl, LmsOLlmBridge llm) {
        this.gw = gw; this.mapper = mapper; this.auth = auth; this.tx = tx; this.txm = txm; this.web = web; this.rl = rl; this.llm = llm;
    }

    @Override public JsonNode call(String key, HttpServletRequest req, byte[] body) throws Exception {
        switch (key) {
            case "GET cap-view": return capView(req);
            case "POST cap-translate": return capTranslate(req, body);
            case "POST cap-summary": return capSummary(req, body);
            default: return gw.run(R.get(key), req, body, (fn, ctx, a) -> mapper.call(fn, ctx, a));
        }
    }

    /* SQL 업무 오류 → DdException(게이트웨이와 같은 규칙) */
    static RuntimeException map(RuntimeException e) {
        for (Throwable x = e; x != null; x = x.getCause()) {
            if (x instanceof PSQLException pe && pe.getServerErrorMessage() != null) {
                String d = pe.getServerErrorMessage().getDetail(); Matcher m = d == null ? null : DD.matcher(d);
                if (m != null && m.matches()) return new DdException(Integer.parseInt(m.group(1)), pe.getServerErrorMessage().getMessage(), m.group(2));
                break;
            }
        }
        return e;
    }
    JsonNode fn(String name, ObjectNode cx, JsonNode a) throws Exception {
        String out; try { out = mapper.call(name, cx.toString(), a.toString()); } catch (RuntimeException e) { throw map(e); }
        return DdWeb.JSON.readTree(out);
    }
    /** 운영자 · 교수자 세션으로 SQL 함수 한 번(감사 _audit 처리 포함) */
    JsonNode staffCall(Map<String, Object> a, ObjectNode cx, String name, JsonNode args) throws Exception {
        String tid = (String) a.get("tid"); String by = (String) a.get("email");
        return tx.inTenant(tid, () -> {
            JsonNode n = fn(name, cx, args);
            if (n != null && n.isObject() && n.has("_audit")) { JsonNode au = ((ObjectNode) n).remove("_audit"); txm.insertAudit(tid, by, au.path("a").asText(), au.get("d") == null || au.get("d").isNull() ? null : au.get("d").toString()); }
            return n;
        });
    }
    ObjectNode staffCtx(Map<String, Object> a, HttpServletRequest req) {
        ObjectNode c = F.objectNode(); c.put("kind", "staff"); c.put("uid", String.valueOf(a.get("uid"))); c.put("email", (String) a.get("email")); c.put("role", (String) a.get("role")); c.put("ip", web.ip(req)); return c;
    }
    static boolean truthy(JsonNode v) { return v != null && !v.isNull() && !(v.isBoolean() && !v.booleanValue()) && !(v.isTextual() && v.textValue().isEmpty()) && !(v.isNumber() && v.doubleValue() == 0); }

    /* ① 학생 자막 화면(로그인 없음) */
    JsonNode capView(HttpServletRequest req) throws Exception {
        ObjectNode q = F.objectNode();
        for (Map.Entry<String, String[]> e : req.getParameterMap().entrySet()) { String[] v = e.getValue(); q.put(e.getKey(), v.length == 0 ? "" : v[v.length - 1]); }
        String code = q.path("code").asText(""); Matcher m = CODE.matcher(code);
        if (!m.matches()) throw new DdException(400, "자막 코드가 올바르지 않습니다.", "code");
        rl.limit("lvcap:" + code, 900, 60000L);
        ObjectNode cx = F.objectNode(); cx.put("kind", "public");
        return tx.inTenant(m.group(1), () -> fn("lms_live_cap_view", cx, q));
    }

    /* ② 번역 */
    JsonNode capTranslate(HttpServletRequest req, byte[] body) throws Exception {
        Map<String, Object> a = auth.need(req); ObjectNode cx = staffCtx(a, req); JsonNode b = DdWeb.readBody(body, 8192);
        ObjectNode args = F.objectNode(); args.set("room_id", b.get("room_id") == null ? F.nullNode() : b.get("room_id"));
        if (b.get("seqs") != null && b.get("seqs").isArray()) { ArrayNode s = F.arrayNode(); for (int i = 0; i < Math.min(20, b.get("seqs").size()); i++) s.add(b.get("seqs").get(i)); args.set("seqs", s); }
        if (b.get("room_id") == null) args.remove("room_id");
        JsonNode P = staffCall(a, cx, "lms_live_cap_pending", args);
        if (P.get("lines").size() == 0) { ObjectNode o = F.objectNode(); o.put("saved", 0); o.putNull("engine"); o.putArray("lines"); return o; }
        rl.limit("lvtr:" + a.get("uid"), 120, 60000L);
        String aiErr = null; ArrayNode items = F.arrayNode(); boolean rule = b.get("engine") != null && b.get("engine").isTextual() && "rule".equals(b.get("engine").textValue());
        String src = P.path("room").path("src_lang").asText();
        if (!rule) {
            for (JsonNode lt : P.get("targets")) {
                String lang = lt.asText(); List<JsonNode> need = new ArrayList<>();
                for (JsonNode l : P.get("lines")) for (JsonNode x : l.get("need")) if (x.asText().equals(lang)) { need.add(l); break; }
                if (need.isEmpty()) continue;
                try {
                    ArrayNode arr = F.arrayNode(); for (JsonNode l : need) arr.add(l.get("text").asText());
                    LmsOLlmBridge.Out r = llm.call(a, "translate", "[출력:translate] <document>의 JSON 문자열 배열은 수업 중 실시간 자막 문장(" + LN.getOrDefault(src, src) + ")입니다. 각 문장을 " + LN.getOrDefault(lang, lang) + "로 번역해 같은 개수 · 같은 순서의 JSON {\"paras\":[\"...\"]}만 출력합니다. 학술 용어는 정확히, 숫자 · 기호는 그대로 둡니다.\n" + DdAiGuard.guardRule("document"), DdAiGuard.fence("document", DdWeb.JSON.writeValueAsString(arr)), 0.1, 4000);
                    JsonNode o = LmsOText.jsonOut(r.text()); JsonNode dst = o != null && o.isObject() ? o.get("paras") : null;
                    boolean okd = dst != null && dst.isArray() && dst.size() == need.size(); if (okd) for (JsonNode x : dst) if (!x.isTextual()) okd = false;
                    if (!okd) { if (aiErr == null) aiErr = "ai_parse"; continue; }
                    for (int i = 0; i < need.size(); i++) { String t = dst.get(i).textValue(); ObjectNode it = items.addObject(); it.set("seq", need.get(i).get("seq")); it.put("lang", lang); it.put("text", t.length() > 1000 ? t.substring(0, 1000) : t); }
                } catch (DdException e) { aiErr = e.getCode() == null ? "ai_error" : e.getCode(); break; }
                catch (Exception e) { aiErr = "ai_error"; break; }
            }
        } else aiErr = "rule_requested";
        ObjectNode r = null;
        if (items.size() > 0) { ObjectNode sa = F.objectNode(); sa.set("room_id", b.get("room_id")); sa.set("items", items); sa.put("engine", "ai"); r = (ObjectNode) staffCall(a, cx, "lms_live_cap_tr_save", sa); }
        if (aiErr != null) {
            ObjectNode sa = F.objectNode(); sa.set("room_id", b.get("room_id")); sa.put("rule", true); ArrayNode seqs = sa.putArray("seqs"); for (JsonNode l : P.get("lines")) seqs.add(l.get("seq"));
            JsonNode r2 = staffCall(a, cx, "lms_live_cap_tr_save", sa);
            ObjectNode m = F.objectNode(); m.put("saved", (r == null ? 0 : r.get("saved").asInt()) + r2.get("saved").asInt()); m.put("engine", items.size() > 0 ? "mixed" : "rule"); m.set("lines", r2.get("lines")); r = m;
        }
        ObjectNode out = F.objectNode(); if (r != null) out.setAll(r);
        if (aiErr == null) out.putNull("ai_error"); else out.put("ai_error", aiErr);
        if (aiErr == null) out.putNull("note"); else out.put("note", "자동 번역(AI)을 쓸 수 없어 규칙 번역(강의 용어 사전)으로 채웠습니다. 「수정」에서 고칠 수 있습니다.");
        return out;
    }

    /* ③ 요약 */
    JsonNode capSummary(HttpServletRequest req, byte[] body) throws Exception {
        Map<String, Object> a = auth.need(req); ObjectNode cx = staffCtx(a, req); JsonNode b = DdWeb.readBody(body, 4096);
        ObjectNode ga = F.objectNode(); if (b.get("room_id") != null) ga.set("room_id", b.get("room_id"));
        JsonNode T = staffCall(a, cx, "lms_live_cap_get", ga);
        JsonNode tn = T.get("transcript"); String text = tn == null || tn.isNull() ? "" : tn.asText(); if (text.length() > 30000) text = text.substring(0, 30000);
        if (Js.trim(text).isEmpty()) throw new DdException(422, "요약할 자막이 없습니다.", "empty");
        boolean rule = b.get("engine") != null && b.get("engine").isTextual() && "rule".equals(b.get("engine").textValue());
        String aiErr;
        if (!rule) {
            try {
                LmsOLlmBridge.Out r = llm.call(a, "summary", "[출력:summary] 대학 수업의 실시간 자막 대본을 학생이 복습하기 좋게 한국어로 요약합니다. 핵심 개념 3~7개를 글머리표(- )로 쓰고 마지막 줄에 한 줄 요약을 씁니다. 대본에 없는 내용은 덧붙이지 않습니다.\n" + DdAiGuard.guardRule("document"), DdAiGuard.fence("document", text), 0.2, 1500);
                if (r.text() != null && !Js.trim(r.text()).isEmpty()) {
                    String s = Js.trim(r.text()); if (s.length() > 20000) s = s.substring(0, 20000);
                    ObjectNode sa = F.objectNode(); sa.set("room_id", b.get("room_id")); sa.put("summary", s);
                    ObjectNode out = F.objectNode(); out.setAll((ObjectNode) staffCall(a, cx, "lms_live_cap_sum_save", sa)); out.set("ai", r.ai()); out.putNull("ai_error"); return out;
                }
                aiErr = "ai_empty";
            } catch (DdException e) { aiErr = e.getCode() == null ? "ai_error" : e.getCode(); }
            catch (Exception e) { aiErr = "ai_error"; }
        } else aiErr = "rule_requested";
        ObjectNode sa = F.objectNode(); sa.set("room_id", b.get("room_id")); sa.put("rule", true);
        ObjectNode out = F.objectNode(); out.setAll((ObjectNode) staffCall(a, cx, "lms_live_cap_sum_save", sa)); out.put("ai_error", aiErr); return out;
    }
}
