package egovframework.didisam.mcp.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.*;
import egovframework.didisam.mcp.service.McpService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/**
 * MCP 서버(외부 AI 연결) + 기관 API 키 — Node mcp.js와 같은 규격.
 *  · 연결: POST /mcp (MCP Streamable HTTP, JSON 응답) · 인증: Authorization: Bearer dds_… (기관별 키, 서버는 HMAC 지문만 저장)
 *  · 범위: 키가 속한 기관 데이터만(inTenant + RLS). 학습자는 번호 · 소속만 내보낸다
 *  · 쓰기 도구는 기관 상태를 갱신(rev + 1)하고 같은 트랜잭션에서 감사 기록을 남긴다. room.egress.mcp === false면 거부
 */
@Service("mcpService")
public class McpServiceImpl extends EgovAbstractServiceImpl implements McpService {
    static final List<String> PROTO = List.of("2025-06-18", "2025-03-26", "2024-11-05");
    static final Pattern KEY_RE = Pattern.compile("dds_[A-Za-z0-9_-]{40}");
    static final Pattern BEARER = Pattern.compile("^Bearer[" + Js.WS + "]+([^" + Js.WS + "]+)\\z", Pattern.CASE_INSENSITIVE);
    static final String VERSION = "16.0";

    @Resource(name = "propertiesService") private EgovPropertyService props;
    @Resource(name = "messageSource") private MessageSource ms;
    private final DdStateCrypto crypt;
    private final McpMapper mapper; private final TenantTx tx; private final TenantTxMapper txm; private final DdProps p; private final DdRateLimiter rl;
    private final List<ObjectNode> tools = new ArrayList<>();
    public McpServiceImpl(McpMapper mapper, TenantTx tx, TenantTxMapper txm, DdProps p, DdRateLimiter rl, DdStateCrypto crypt) throws Exception {
        this.crypt = crypt; this.mapper = mapper; this.tx = tx; this.txm = txm; this.p = p; this.rl = rl;
        try (InputStream in = getClass().getResourceAsStream("/egovframework/mcp/tools.json")) { for (JsonNode t : DdWeb.JSON.readTree(in)) tools.add((ObjectNode) t); }
    }
    private String msg(String k, Object... a) { return ms.getMessage(k, a.length == 0 ? null : a, k, Locale.ROOT); }
    private String fp(String key) { return DdCrypto.hmacHex("mcp|" + p.pepper, key); }

    /* ── 키 관리(스튜디오 세션 · 정운영자) ── */
    @Override public Map<String, Object> listKeys(Map<String, Object> a) {
        return new LinkedHashMap<>(Map.of("keys", mapper.selectKeys((String) a.get("tid"))));
    }
    @Override public Map<String, Object> createKey(Map<String, Object> a, byte[] body) throws Exception {
        if (!"owner".equals(a.get("role"))) throw processException("dd.403.role.keycreate");
        JsonNode b = DdWeb.readBody(body, props.getInt("body.keyMax"));
        String name = cut(trim(sOr(b.get("name"))), 40); String scope = strictEq(b.get("scope"), "write") ? "write" : "read";
        if (name.isEmpty()) throw processException("dd.400.name.key");
        String tid = (String) a.get("tid"); int max = props.getInt("mcp.maxKeys");
        if (mapper.countActiveKeys(tid) >= max) throw processException("dd.400.max", new String[]{ String.valueOf(max) });
        byte[] r = new byte[30]; DdCrypto.RND.nextBytes(r); String key = "dds_" + Base64.getUrlEncoder().withoutPadding().encodeToString(r);
        byte[] r2 = new byte[6]; DdCrypto.RND.nextBytes(r2); String id = "k_" + HexFormat.of().formatHex(r2);
        mapper.insertKey(id, tid, name, key.substring(0, 12), fp(key), scope, (String) a.get("email"));
        ObjectNode d = F.objectNode(); d.put("id", id); d.put("name", name); d.put("scope", scope);
        tx.audit(tid, (String) a.get("email"), "apikey.create", stringify(d));
        Map<String, Object> o = new LinkedHashMap<>(); o.put("id", id); o.put("name", name); o.put("scope", scope); o.put("prefix", key.substring(0, 12)); o.put("key", key);
        return o;
    }
    @Override public Map<String, Object> revokeKey(Map<String, Object> a, byte[] body) throws Exception {
        if (!"owner".equals(a.get("role"))) throw processException("dd.403.role.keyrevoke");
        JsonNode b = DdWeb.readBody(body, props.getInt("body.keyRevokeMax")); String id = sOr(b.get("id"));
        String tid = (String) a.get("tid");
        if (mapper.revokeKey(tid, id) == 0) throw processException("dd.404.key");
        ObjectNode d = F.objectNode(); d.put("id", id);
        tx.audit(tid, (String) a.get("email"), "apikey.revoke", stringify(d));
        return new LinkedHashMap<>(Map.of("ok", true));
    }

    /* ── 키 인증 ── */
    private Map<String, Object> keyAuth(HttpServletRequest req) {
        String h = String.valueOf(req.getHeader("authorization") == null ? "" : req.getHeader("authorization"));
        Matcher m = BEARER.matcher(h); String key = m.find() ? m.group(1) : "";
        if (!KEY_RE.matcher(key).matches()) return null;
        Map<String, Object> r = mapper.selectKeyAuth(fp(key)); if (r == null) return null;
        try { mapper.touchKey((String) r.get("id")); } catch (Exception ignore) { }
        return r;
    }

    static ObjectNode rpcErr(JsonNode id, int code, String message) {
        ObjectNode o = F.objectNode(); o.put("jsonrpc", "2.0"); o.set("id", nullish(id) ? F.nullNode() : id);
        ObjectNode e = o.putObject("error"); e.put("code", code); e.put("message", message); return o;
    }
    static Out out(int st, Object body) { return new Out(st, Map.of(), body); }

    @Override public Out handle(HttpServletRequest req, byte[] body) throws Exception {
        String method = req.getMethod();
        if ("GET".equals(method) || "DELETE".equals(method)) {
            Map<String, Object> e = new LinkedHashMap<>(); e.put("error", "method"); e.put("message", msg("mcp.method"));
            return new Out(405, Map.of("allow", "POST"), e);
        }
        if (!"POST".equals(method)) return out(405, "method");
        Map<String, Object> a = keyAuth(req);
        if (a == null) return new Out(401, Map.of("www-authenticate", "Bearer realm=\"didisam\""), rpcErr(null, -32001, msg("mcp.unauth")));
        rl.limit("mcp:" + a.get("id"), props.getInt("rate.mcp.max"), props.getLong("rate.mcp.winMs"));
        JsonNode msgN;
        try { msgN = DdWeb.readBody(body, props.getInt("body.mcpMax")); } catch (DdException e) { return out(400, rpcErr(null, -32700, msg("mcp.parse"))); }
        if (msgN.isArray()) return out(400, rpcErr(null, -32600, msg("mcp.batch")));
        if (!truthy(msgN) || !strictEq(get(msgN, "jsonrpc"), "2.0") || get(msgN, "method") == null || !get(msgN, "method").isTextual())
            return out(400, rpcErr(truthy(msgN) ? get(msgN, "id") : null, -32600, msg("mcp.invalid")));
        JsonNode id = msgN.get("id"); JsonNode pp = or(msgN.get("params"), F.objectNode());
        if (nullish(id)) return out(202, null); // 알림(notifications/*)
        String m = msgN.get("method").textValue();
        if ("initialize".equals(m)) {
            ObjectNode r = F.objectNode();
            JsonNode pv = get(pp, "protocolVersion");
            r.put("protocolVersion", pv != null && pv.isTextual() && PROTO.contains(pv.textValue()) ? pv.textValue() : PROTO.get(0));
            r.putObject("capabilities").putObject("tools").put("listChanged", false);
            ObjectNode si = r.putObject("serverInfo"); si.put("name", "didisam-studio"); si.put("title", "디디쌤 스튜디오"); si.put("version", VERSION);
            r.put("instructions", msg("mcp.instructions", a.get("org"), a.get("type"), msg("write".equals(a.get("scope")) ? "mcp.scope.write" : "mcp.scope.read")));
            return ok(id, r);
        }
        if ("ping".equals(m)) return ok(id, F.objectNode());
        boolean w = "write".equals(a.get("scope"));
        if ("tools/list".equals(m)) {
            ArrayNode L = F.arrayNode();
            for (ObjectNode t : tools) {
                boolean ro = "read".equals(t.get("scope").textValue()); if (!w && !ro) continue;
                ObjectNode o = L.addObject(); o.put("name", t.get("name").textValue());
                o.put("description", t.get("description").textValue() + (ro ? "" : " (쓰기 권한 키 필요)"));
                o.set("inputSchema", t.get("inputSchema")); o.putObject("annotations").put("readOnlyHint", ro);
            }
            ObjectNode r = F.objectNode(); r.set("tools", L); return ok(id, r);
        }
        if (!"tools/call".equals(m)) return out(200, rpcErr(id, -32601, msg("mcp.nomethod", m)));
        JsonNode nameN = get(pp, "name"); ObjectNode T = null;
        for (ObjectNode t : tools) if (strictEq(nameN, t.get("name").textValue())) T = t;
        JsonNode args = get(pp, "arguments"); JsonNode x = args != null && (args.isObject() || args.isArray()) ? args : F.objectNode();
        if (T == null) return out(200, rpcErr(id, -32602, msg("mcp.notool", S(nameN))));
        boolean writeTool = "write".equals(T.get("scope").textValue());
        if (writeTool && !w) return fail(id, msg("mcp.readonly"));
        String tname = T.get("name").textValue(); String tid = (String) a.get("tid");
        try {
            JsonNode res = tx.inTenant(tid, () -> {
                Map<String, Object> r = writeTool ? mapper.selectDocForUpdate(tid) : mapper.selectDoc(tid);
                if (r == null) throw new McpErr(msg("mcp.nostate"));
                JsonNode doc = crypt.open(parse((String) r.get("doc")), tid);
                JsonNode room = or(truthy(get(doc, "org")) ? get(doc, "org", "room") : get(doc, "org"), F.objectNode());
                JsonNode eg = get(room, "egress");
                if (truthy(eg) && get(eg, "mcp") != null && get(eg, "mcp").isBoolean() && !get(eg, "mcp").booleanValue()) throw new McpErr(msg("mcp.egress"));
                if (!writeTool) return run(tname, doc, a, x);
                JsonNode res2 = write(tname, (ObjectNode) doc, a, x); String s = stringify(crypt.seal(doc, tid));
                mapper.updateDoc(tid, s, s.length());
                ObjectNode det = F.objectNode(); det.put("key", (String) a.get("id"));
                List<Map.Entry<String, JsonNode>> es = new ArrayList<>(); for (var e : entries(x)) es.add(Map.entry(e.getKey(), t(cut(S(e.getValue()), 80))));
                det.set("args", fromEntries(es));
                txm.insertAudit(tid, "mcp:" + a.get("name"), "mcp." + tname, stringify(det));
                return res2;
            });
            ObjectNode r = F.objectNode(); ArrayNode c = r.putArray("content"); ObjectNode c0 = c.addObject(); c0.put("type", "text"); c0.put("text", stringify(res, 1));
            r.set("structuredContent", res); r.put("isError", false); return ok(id, r);
        } catch (McpErr e) { return fail(id, e.getMessage()); }
        catch (Exception e) {
            String mm = e instanceof org.egovframe.rte.fdl.cmmn.exception.EgovBizException || e instanceof DdException ? e.getMessage() : e.getMessage() == null || e.getMessage().isEmpty() ? msg("mcp.fail") : e.getMessage();
            return fail(id, cut(mm, 300));
        }
    }
    private Out ok(JsonNode id, JsonNode result) { ObjectNode o = F.objectNode(); o.put("jsonrpc", "2.0"); o.set("id", id); o.set("result", result); return out(200, o); }
    private Out fail(JsonNode id, String m) {
        ObjectNode r = F.objectNode(); ObjectNode c = r.putArray("content").addObject(); c.put("type", "text"); c.put("text", m); r.put("isError", true); return ok(id, r);
    }
    static final class McpErr extends Exception { McpErr(String m) { super(m); } }

    /* ── 데이터 도우미(학습자 개인정보 제외) — Node mcp.js와 같은 JS 규칙 ── */
    static JsonNode orAnd(JsonNode o, String... ks) { // o && (o[k1] || o[k2] || …)
        if (!truthy(o)) return o;
        JsonNode[] vs = new JsonNode[ks.length]; for (int i = 0; i < ks.length; i++) vs[i] = get(o, ks[i]); return or(vs);
    }
    static String sidOf(JsonNode m) { return S(or(get(m, "sid"), orAnd(get(m, "extra"), "학번", "사번"), get(m, "id"))); }
    static String groupOf(JsonNode doc, JsonNode m) {
        JsonNode g = null; for (JsonNode x : arr(get(doc, "groups"))) if (strictEq(get(x, "id"), get(m, "group"))) { g = x; break; }
        return S(or(get(g == null ? F.objectNode() : g, "name"), orAnd(get(m, "extra"), "학과", "부서", "소속"), t("")));
    }
    static double thr(JsonNode c) { JsonNode cr = get(c, "criteria"); return num(truthy(cr) ? or(get(cr, "threshold"), F.numberNode(80)) : F.numberNode(80)); }
    static long avg(List<Double> a) { if (a.isEmpty()) return 0; double s = 0; for (double v : a) s += v; return (long) round(s / a.size()); }
    static JsonNode prog(JsonNode c, JsonNode id) { JsonNode pr = get(c, "prog"); JsonNode v = truthy(pr) ? get(pr, key(id)) : null; return truthy(v) ? v : F.objectNode(); }
    static double pval(JsonNode c, JsonNode id) { double v = num(get(prog(c, id), "p")); return Double.isNaN(v) || v == 0 ? 0 : v; }

    ObjectNode courseOut(JsonNode doc, JsonNode c, boolean full) {
        List<JsonNode> ids = arr(get(c, "learners")); List<Double> P = new ArrayList<>(); for (JsonNode id : ids) P.add(pval(c, id));
        double th = thr(c);
        ObjectNode o = F.objectNode();
        JsonNode cid = get(c, "id"); if (!undef(cid)) o.set("id", cid);
        o.put("name", S(get(c, "name"))); o.put("status", S(get(c, "status"))); o.put("legal", truthy(get(c, "legal"))); o.put("kind", S(get(c, "kind")));
        o.put("start", S(get(c, "start"))); o.put("end", S(get(c, "end"))); o.put("teacher", S(get(c, "teacher")));
        o.put("learners", ids.size()); o.put("avg_progress", avg(P)); o.put("completed", P.stream().filter(v -> v >= th).count());
        o.put("pending_grading", ids.stream().filter(id -> strictEq(get(prog(c, id), "assign"), "submitted")).count());
        if (full) {
            o.set("criteria", or(get(c, "criteria"), F.objectNode()));
            ArrayNode cu = o.putArray("curriculum");
            for (JsonNode it : head(arr(get(c, "curriculum")), 200)) {
                ObjectNode i = cu.addObject(); JsonNode iid = get(it, "id"), ity = get(it, "type");
                if (!undef(iid)) i.set("id", iid); if (!undef(ity)) i.set("type", ity);
                i.put("title", S(get(it, "title"))); i.set("week", or(get(it, "week"), F.numberNode(0)));
                JsonNode qs = get(it, "qs"); if (qs != null && qs.isArray()) i.put("questions", qs.size());
            }
            ArrayNode no = o.putArray("notices");
            for (JsonNode n : head(arr(get(c, "notices")), 20)) { ObjectNode x = no.addObject(); x.put("title", S(get(n, "title"))); x.put("at", S(get(n, "at"))); }
        }
        return o;
    }

    JsonNode run(String name, JsonNode doc, Map<String, Object> a, JsonNode x) throws McpErr {
        List<JsonNode> C = arr(get(doc, "classes"));
        switch (name) {
            case "get_overview": {
                List<Double> allP = new ArrayList<>(); for (JsonNode c : C) for (JsonNode id : arr(get(c, "learners"))) allP.add(pval(c, id));
                long pend = 0; for (JsonNode c : C) for (JsonNode id : arr(get(c, "learners"))) if (strictEq(get(prog(c, id), "assign"), "submitted")) pend++;
                Set<String> legal = new HashSet<>();
                for (JsonNode c : C) if (truthy(get(c, "legal"))) for (JsonNode id : arr(get(c, "learners"))) if (pval(c, id) < 100) legal.add((id == null ? "u" : id.getNodeType().name()) + ":" + (id == null ? "" : id.isNumber() ? numStr(id.doubleValue()) : str(id)));
                ObjectNode o = F.objectNode(); o.put("org", (String) a.get("org")); o.put("type", (String) a.get("type"));
                o.put("learners", arr(get(doc, "members")).size()); o.put("courses", C.size());
                o.put("running", C.stream().filter(c -> strictEq(get(c, "status"), "운영중")).count());
                o.put("avg_progress", avg(allP)); o.put("pending_grading", pend);
                o.put("open_questions", arr(get(doc, "tq")).stream().filter(q -> truthy(q) && !strictEq(get(q, "st"), "answered")).count());
                o.put("legal_incomplete", legal.size());
                return o;
            }
            case "list_courses": {
                JsonNode st = get(x, "status"); ArrayNode L = F.arrayNode();
                for (JsonNode c : head(C.stream().filter(c -> !truthy(st) || strictEq(get(c, "status"), st)).toList(), 200)) L.add(courseOut(doc, c, false));
                ObjectNode o = F.objectNode(); o.set("courses", L); return o;
            }
            case "get_course": {
                String cid = S(get(x, "course_id"));
                for (JsonNode c : C) if (strictEq(get(c, "id"), cid)) return courseOut(doc, c, true);
                throw new McpErr(msg("mcp.nocourse.id", cid));
            }
            case "list_learners": {
                List<JsonNode> out = new ArrayList<>(); JsonNode grp = get(x, "group");
                for (JsonNode m : arr(get(doc, "members"))) {
                    ObjectNode o = F.objectNode(); o.put("id", sidOf(m)); o.put("group", groupOf(doc, m)); o.put("grade", S(get(m, "grade"))); o.put("last_access", S(get(m, "last")));
                    if (!truthy(grp) || o.get("group").textValue().equals(S(grp))) out.add(o);
                }
                double lim = num(get(x, "limit")); if (Double.isNaN(lim) || lim == 0) lim = 100; lim = Math.min(500, lim);
                ObjectNode o = F.objectNode(); o.set("learners", arrNode(slice(out, 0, lim))); return o;
            }
            case "get_learner_progress": {
                String sid = S(get(x, "learner_id")); JsonNode m = null;
                for (JsonNode k : arr(get(doc, "members"))) if (sidOf(k).equals(sid) || strictEq(get(k, "id"), sid)) { m = k; break; }
                if (m == null) throw new McpErr(msg("mcp.nolearner"));
                ObjectNode o = F.objectNode(); o.put("id", sidOf(m)); o.put("group", groupOf(doc, m)); ArrayNode cs = o.putArray("courses");
                JsonNode mid = get(m, "id");
                for (JsonNode c : C) {
                    if (!includes(get(c, "learners"), mid)) continue;
                    JsonNode g = prog(c, mid); ObjectNode r = cs.addObject();
                    JsonNode cid = get(c, "id"); if (!undef(cid)) r.set("course_id", cid);
                    r.put("name", S(get(c, "name"))); r.set("progress", numNode(pval(c, mid))); r.set("exam", coalesce(get(g, "exam"), F.nullNode()));
                    r.put("assignment", S(or(get(g, "assign"), t("none")))); r.put("completed", pval(c, mid) >= thr(c));
                }
                return o;
            }
            case "list_questions": {
                JsonNode st = get(x, "status"); ArrayNode L = F.arrayNode();
                List<JsonNode> qs = new ArrayList<>();
                for (JsonNode q : arr(get(doc, "tq"))) {
                    if (!truthy(q)) continue;
                    boolean ans = strictEq(get(q, "st"), "answered");
                    if (strictEq(st, "all") || (strictEq(st, "answered") ? ans : !ans)) qs.add(q);
                }
                for (JsonNode q : head(qs, 100)) {
                    ObjectNode o = L.addObject(); o.put("id", S(get(q, "id"))); o.put("learner_id", S(get(q, "sid"))); o.put("course", S(get(q, "cls"))); o.put("question", S(get(q, "q")));
                    if (truthy(get(q, "a"))) o.put("answer", S(get(q, "a"))); else o.putNull("answer");
                    o.put("status", strictEq(get(q, "st"), "answered") ? "answered" : "open"); o.put("at", S(get(q, "at")));
                }
                ObjectNode o = F.objectNode(); o.set("questions", L); return o;
            }
            default: throw new McpErr(msg("mcp.fail"));
        }
    }

    static String hex4() { byte[] b = new byte[4]; DdCrypto.RND.nextBytes(b); return HexFormat.of().formatHex(b); }
    JsonNode write(String name, ObjectNode doc, Map<String, Object> a, JsonNode x) throws McpErr {
        String by = "AI 연결: " + a.get("name");
        switch (name) {
            case "answer_question": {
                JsonNode q = null; String qid = S(get(x, "question_id"));
                for (JsonNode k : arr(get(doc, "tq"))) if (truthy(k) && S(get(k, "id")).equals(qid)) { q = k; break; }
                if (q == null || !q.isObject()) throw new McpErr(msg("mcp.noquestion"));
                String ans = cut(trim(S(get(x, "answer"))), 2000); if (ans.isEmpty()) throw new McpErr(msg("mcp.noanswer"));
                ObjectNode qo = (ObjectNode) q; qo.put("a", ans); qo.put("st", "answered"); qo.put("aAt", isoNow().substring(0, 16).replace('T', ' ')); qo.put("by", by);
                ObjectNode o = F.objectNode(); o.put("ok", true); JsonNode id = q.get("id"); if (!undef(id)) o.set("question_id", id); return o;
            }
            case "post_notice": {
                ObjectNode n = F.objectNode(); n.put("id", "n" + hex4()); n.put("title", cut(trim(S(get(x, "title"))), 80)); n.put("body", cut(S(get(x, "body")), 2000));
                n.put("at", kstToday()); n.put("pin", false); n.put("by", by);
                if (n.get("title").textValue().isEmpty()) throw new McpErr(msg("mcp.notitle"));
                JsonNode cidN = get(x, "course_id");
                if (truthy(cidN)) {
                    String cid = S(cidN); JsonNode c = null;
                    for (JsonNode k : arr(get(doc, "classes"))) if (strictEq(get(k, "id"), cid)) { c = k; break; }
                    if (c == null || !c.isObject()) throw new McpErr(msg("mcp.nocourse"));
                    List<JsonNode> l = new ArrayList<>(); l.add(n); l.addAll(arr(get(c, "notices"))); ((ObjectNode) c).set("notices", arrNode(head(l, 50)));
                } else { List<JsonNode> l = new ArrayList<>(); l.add(n); l.addAll(arr(get(doc, "notices"))); doc.set("notices", arrNode(head(l, 100))); }
                ObjectNode o = F.objectNode(); o.put("ok", true); o.put("notice_id", n.get("id").textValue()); return o;
            }
            case "create_course_draft": {
                String nm = cut(trim(S(get(x, "name"))), 60); if (nm.isEmpty()) throw new McpErr(msg("mcp.noname"));
                String id = "c" + hex4(); JsonNode wk = get(x, "weeks"); List<String> W = new ArrayList<>();
                if (wk != null && wk.isArray()) for (JsonNode v : head(arr(wk), 30)) W.add(S(v));
                String today = kstToday();
                ObjectNode c = F.objectNode();
                c.put("id", id); c.put("name", nm); c.put("kind", "period"); c.put("sub", ""); c.put("legal", false); c.put("status", "준비중"); c.put("price", 0);
                c.put("open", "지정 회원"); c.put("start", today); c.put("end", today); c.put("teacher", ""); c.put("group", ""); c.putArray("learners"); c.putObject("prog");
                c.put("goal", cut(S(get(x, "goal")), 300));
                ArrayNode cu = c.putArray("curriculum");
                for (int i = 0; i < W.size(); i++) { ObjectNode it = cu.addObject(); it.put("id", "it" + hex4()); it.put("type", "chapter"); it.put("title", cut((i + 1) + "주차 " + W.get(i), 80)); it.put("week", i + 1); }
                ObjectNode cr = c.putObject("criteria"); cr.put("video", 60); cr.put("exam", 20); cr.put("assign", 20); cr.put("threshold", 80);
                c.put("cert", "auto"); c.put("skip", false); c.put("speed", true); c.put("early", false); c.put("community", "class"); c.put("hours", 0); c.putArray("notices"); c.put("by", by);
                List<JsonNode> l = new ArrayList<>(arr(get(doc, "classes"))); l.add(c); doc.set("classes", arrNode(l));
                ObjectNode o = F.objectNode(); o.put("ok", true); o.put("course_id", id); o.put("status", "준비중"); return o;
            }
            default: throw new McpErr(msg("mcp.fail"));
        }
    }
}
