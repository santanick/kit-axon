package egovframework.didisam.cpl.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.cmm.DdProps;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.cpl.service.CplService;
import jakarta.servlet.http.HttpServletRequest;
import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** Node compliance.js 이식. 본인확인 제공사는 계약 · 규격 확정 뒤 연결한다(미연동이면 501 provider_missing). */
@Service("cplService")
public class CplServiceImpl extends EgovAbstractServiceImpl implements CplService {
    private static final Pattern KEY_RE = Pattern.compile("[\\w-]{1,60}");
    private final CplMapper mapper; private final TenantTx tx; private final DdWeb web; private final DdRateLimiter rl; private final DdProps p;
    private final Map<String, Object[]> pending = new ConcurrentHashMap<>(); private final SecureRandom rnd = new SecureRandom();
    public CplServiceImpl(CplMapper mapper, TenantTx tx, DdWeb web, DdRateLimiter rl, DdProps p) { this.mapper = mapper; this.tx = tx; this.web = web; this.rl = rl; this.p = p; }

    private JsonNode policy(String tid) { Map<String, Object> r = mapper.selectPolicy(tid); return r == null || r.get("p") == null ? null : parse((String) r.get("p")); }
    private static boolean on(JsonNode P) { return truthy(P) && truthy(get(P, "on")); }
    private static long dayMax(JsonNode P) { if (!on(P)) return 0; double h = num(get(P, "dayMax")); return h > 0 ? (long) (Math.min(24, h) * 3600) : 0; }
    private static String ua(HttpServletRequest req) { String u = req.getHeader("user-agent"); return u == null ? null : u.length() > 160 ? u.substring(0, 160) : u; }

    @Override public void afterLogin(HttpServletRequest req, String tid, String sid, String keepHash) throws Exception {
        JsonNode P = tx.inTenant(tid, () -> { JsonNode x = policy(tid); if (on(x)) mapper.insertLog(tid, sid, "login", null, null, 0, web.ip(req), ua(req), null, null); return x; });
        if (on(P) && truthy(get(P, "single"))) mapper.deleteOtherSessions(tid, sid, keepHash);
    }

    @Override public Map<String, Object> route(HttpServletRequest req, byte[] body, String tid, String sid) throws Exception {
        JsonNode b = DdWeb.readBody(body, 128 * 1024); String kind = S(get(b, "kind"));
        if ("beat".equals(kind)) {
            rl.limit("cplb:" + tid + ":" + sid, 40, 60_000L);
            double d = Math.floor(num(get(b, "secs"))); if (!(d >= 1 && d <= 60)) throw processException("dd.400.secs");
            int secs = (int) d; String cls = S(get(b, "cls")), item = S(get(b, "item"));
            if (!KEY_RE.matcher(cls).matches() || !KEY_RE.matcher(item).matches()) throw processException("dd.400.item");
            return tx.inTenant(tid, () -> {
                JsonNode P = policy(tid); long max = dayMax(P), s = mapper.selectToday(tid, sid); boolean over = max > 0 && s >= max;
                int chMax = on(P) ? (int) Math.floor(num(get(P, "dayChasi"))) : 0; if (chMax > 0) { List<String> D = mapper.selectTodayItems(tid, sid); if (D.size() >= chMax && !D.contains(item)) { Map<String, Object> o0 = new LinkedHashMap<>(); o0.put("today", s); o0.put("max", max); o0.put("over", true); o0.put("chasi", true); return o0; } }
                if (on(P) && !over) { Double el = mapper.selectBeatElapsed(tid, sid); long room = el == null ? secs : (long) Math.ceil(el) + 5; long add = Math.min(secs, room); if (max > 0) add = Math.min(add, max - s); if (add > 0) { mapper.insertLog(tid, sid, "beat", cls, item, (int) add, web.ip(req), null, null, null); s += add; } }
                Map<String, Object> o = new LinkedHashMap<>(); o.put("today", s); o.put("max", max); o.put("over", max > 0 && s >= max); return o;
            });
        }
        if ("review-skip".equals(kind)) {
            rl.limit("cplv:" + tid + ":" + sid, 60, 600_000L); String ec = S(get(b, "evalCd")); String evalCd = List.of("00", "01", "02", "03", "04").contains(ec) ? ec : null; double cd = num(get(b, "chasi")); Integer chasi = cd >= 0 && cd < 1000 && cd == Math.rint(cd) && !S(get(b, "chasi")).isEmpty() ? (Integer) (int) cd : null; String vc = S(get(b, "cls")); String vcls = KEY_RE.matcher(vc).matches() ? vc : null;
            return tx.inTenant(tid, () -> { JsonNode P = policy(tid); JsonNode L = on(P) ? get(P, "reviewers") : null; boolean hit = false; if (L != null && L.isArray()) for (JsonNode x : L) if (sid.equals(x.asText())) hit = true; if (!hit) throw processException("dd.403.reviewer"); mapper.insertLog(tid, sid, "review", vcls, null, 0, web.ip(req), ua(req), evalCd, chasi); Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); return o; });
        }
        if ("verify-start".equals(kind) || "verify-confirm".equals(kind)) {
            String method = S(get(b, "method")); if (!List.of("phone", "motp").contains(method)) throw processException("dd.400.method");
            rl.limit("cplv:" + tid + ":" + sid, 10, 600_000L);
            if (!p.devIdv) throw processException("dd.501.provider_missing");
            String k = tid + "|" + sid + "|" + method; Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true);
            if ("verify-start".equals(kind)) { String code = String.valueOf(100000 + rnd.nextInt(900000)); pending.put(k, new Object[] { code, System.currentTimeMillis() + 300_000L }); o.put("ttl", 300); o.put("dev_code", code); return o; }
            Object[] x = pending.get(k); if (x == null || (long) x[1] < System.currentTimeMillis() || !x[0].equals(S(get(b, "code")))) throw processException("dd.400.code");
            pending.remove(k); String ec = S(get(b, "evalCd")); String evalCd = List.of("00", "01", "02", "03", "04").contains(ec) ? ec : null; double cd = num(get(b, "chasi")); Integer chasi = cd >= 0 && cd < 1000 && cd == Math.rint(cd) && !S(get(b, "chasi")).isEmpty() ? (Integer) (int) cd : null; String vc = S(get(b, "cls")); String vcls = KEY_RE.matcher(vc).matches() ? vc : null; tx.inTenant(tid, () -> { mapper.insertLog(tid, sid, "verify-" + method, vcls, null, 0, web.ip(req), ua(req), evalCd, chasi); return null; }); return o;
        }
        if ("attend".equals(kind)) {
            rl.limit("cpla:" + tid + ":" + sid, 10, 600_000L);
            String cls = S(get(b, "cls")), code = S(get(b, "code"));
            return tx.inTenant(tid, () -> { JsonNode P = policy(tid); JsonNode A = on(P) ? get(P, "attend") : null;
                if (!truthy(A) || !cls.equals(S(get(A, "cls"))) || !code.equals(S(get(A, "code"))) || !(num(get(A, "exp")) > System.currentTimeMillis())) throw processException("dd.400.attend");
                if (mapper.countAttendToday(tid, sid, cls) == 0) mapper.insertLog(tid, sid, "attend", cls, null, 0, web.ip(req), ua(req), null, null); Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); return o; });
        }
        if ("exam-start".equals(kind)) return examStart(tid, sid, S(get(b, "cls")), S(get(b, "item")));
        if ("exam-submit".equals(kind)) return examSubmit(tid, sid, S(get(b, "attempt")), get(b, "ans"));
        throw processException("dd.400.kind");
    }

    /* 서버 출제 · 채점(Node compliance.js와 같은 규칙) */
    private static Long parseT(String v, boolean end) { if (v == null || v.isEmpty()) return null; String s = v; if (s.matches("\\d{4}-\\d{2}-\\d{2}")) s += end ? "T23:59:59" : "T00:00:00"; if (!s.matches(".*(Z|[+-]\\d{2}:\\d{2})$")) s += "+09:00"; try { return java.time.OffsetDateTime.parse(s.length() == 22 || s.matches(".*T\\d{2}:\\d{2}(Z|[+-]\\d{2}:\\d{2})$") ? s.replaceFirst("(T\\d{2}:\\d{2})", "$1:00") : s).toInstant().toEpochMilli(); } catch (Exception e) { return null; } }
    private static String norm(String s) { return (s == null ? "" : s).toLowerCase(java.util.Locale.ROOT).replaceAll("\\s+", ""); }
    private static boolean right(JsonNode q, String v) { if (v == null || v.isEmpty()) return false; String t = S(get(q, "t")), a = S(get(q, "a")); if ("mc".equals(t)) return v.equals(a); if ("ox".equals(t)) return v.toUpperCase(java.util.Locale.ROOT).equals(a.toUpperCase(java.util.Locale.ROOT)); if ("essay".equals(t)) return !v.trim().isEmpty(); if (!norm(v).isEmpty() && norm(v).equals(norm(a))) return true; List<String> P = new java.util.ArrayList<>(); for (String x : a.split("[,/·]")) if (!norm(x).isEmpty()) P.add(norm(x)); return P.size() > 1 && P.stream().allMatch(x -> norm(v).contains(x)); }
    private Object[] examItem(String tid, String cls, String item) throws Exception { if (!KEY_RE.matcher(cls).matches() || !KEY_RE.matcher(item).matches()) throw processException("dd.400.exam_closed"); Map<String, Object> r = mapper.selectExamClass(tid, cls); if (r == null) throw processException("dd.400.exam_closed"); JsonNode P = r.get("p") == null ? null : parse((String) r.get("p")), c = parse((String) r.get("c")); if (!on(P)) throw processException("dd.400.exam_closed"); for (JsonNode it : arr(get(c, "curriculum"))) if (item.equals(S(get(it, "id")))) { if (!"exam".equals(S(get(it, "type"))) || arr(get(it, "qs")).isEmpty()) break; return new Object[] { it, P }; } throw processException("dd.400.exam_closed"); }
    private Long classEnd(String tid, String cls) { Map<String, Object> r = mapper.selectExamClass(tid, cls); return r == null ? null : parseT(S(get(parse((String) r.get("c")), "end")), true); }
    private static List<Map<String, Object>> qOut(JsonNode it, List<Integer> order) { List<JsonNode> Q = arr(get(it, "qs")); List<Map<String, Object>> o = new java.util.ArrayList<>(); for (int i : order) { JsonNode q = i < Q.size() ? Q.get(i) : null; Map<String, Object> m = new LinkedHashMap<>(); m.put("i", i); String t = S(get(q, "t")); m.put("t", t.isEmpty() ? "mc" : t); m.put("q", S(get(q, "q"))); JsonNode op = get(q, "opts"); m.put("opts", op != null && op.isArray() ? op : DdWeb.JSON.createArrayNode()); double pt = num(get(q, "pts")); m.put("pts", pt > 0 ? (Object) (pt == Math.rint(pt) ? (Object) (long) pt : (Object) pt) : (Object) 1); o.add(m); } return o; }
    private static List<Integer> ints(String j) { List<Integer> o = new java.util.ArrayList<>(); for (JsonNode x : arr(parse(j))) o.add(x.asInt()); return o; }
    private Map<String, Object> examStart(String tid, String sid, String cls, String item) throws Exception { rl.limit("cplx:" + tid + ":" + sid, 30, 600_000L);
        return tx.inTenant(tid, () -> { Object[] X = examItem(tid, cls, item); JsonNode it = (JsonNode) X[0], R = get(it, "rules"); long now = System.currentTimeMillis(); Map<String, Object> open = mapper.selectOpenExam(tid, sid, cls, item); Map<String, Object> o = new LinkedHashMap<>();
            if (open != null) { Number en = (Number) open.get("ends_ms"); if (en == null || en.longValue() + 60_000L > now) { o.put("attempt", open.get("id")); o.put("end", en == null ? 0L : en.longValue()); o.put("qs", qOut(it, ints((String) open.get("qorder")))); o.put("resumed", true); return o; } mapper.expireExam((String) open.get("id")); }
            Long f = parseT(S(get(R, "from")), false), to = parseT(S(get(R, "to")), true); if ((f != null && now < f) || (to != null && now > to)) throw processException("dd.400.exam_closed");
            List<Integer> T = mapper.selectExamScores(tid, sid, cls, item); JsonNode rt = get(R, "retry"); String mode = S(get(rt, "mode")); int best = T.stream().mapToInt(x -> x == null ? 0 : x).max().orElse(-1); JsonNode ps = get(R, "pass"); Double passV = truthy(get(ps, "on")) ? (Double) num(get(ps, "v")) : null; double v = num(get(rt, "v"));
            if (!truthy(rt) && !T.isEmpty()) { Long clsEnd = classEnd(tid, cls); double gp0 = num(get((JsonNode) X[1], "pass")); boolean failed = gp0 > 0 && best < gp0 && T.size() == 1; if (!(failed && clsEnd != null && now > clsEnd && now <= clsEnd + 7 * 86_400_000L)) throw processException("dd.400.exam_closed"); }
            if (truthy(rt)) { if ("none".equals(mode) && !T.isEmpty()) throw processException("dd.400.exam_closed"); if ("count".equals(mode) && (T.size() >= v || (passV != null && best >= 0 && best >= passV))) throw processException("dd.400.exam_closed"); if ("score".equals(mode) && best >= 0 && best >= v) throw processException("dd.400.exam_closed"); }
            int N = arr(get(it, "qs")).size(); List<Integer> idx = new java.util.ArrayList<>(); for (int i = 0; i < N; i++) idx.add(i); java.util.Collections.shuffle(idx, rnd); double cn = num(get(it, "cplN")); int n = cn > 0 ? (int) Math.min(cn, N) : N; List<Integer> order = new java.util.ArrayList<>(idx.subList(0, n));
            byte[] rb = new byte[12]; rnd.nextBytes(rb); String id = "ex" + java.util.HexFormat.of().formatHex(rb); double tm = num(get(it, "time")); Long ends = tm > 0 ? (Long) (now + (long) (tm * 60_000)) : null; mapper.insertExam(id, tid, sid, cls, item, order.toString(), ends);
            o.put("attempt", id); o.put("end", ends == null ? 0L : ends); o.put("qs", qOut(it, order)); o.put("resumed", false); return o; }); }
    private Map<String, Object> examSubmit(String tid, String sid, String attempt, JsonNode ans) throws Exception { rl.limit("cplx:" + tid + ":" + sid, 30, 600_000L);
        return tx.inTenant(tid, () -> { Map<String, Object> r = mapper.selectExamAttempt(attempt, tid, sid); if (r == null) throw processException("dd.400.exam_attempt"); Object[] X = examItem(tid, (String) r.get("cls"), (String) r.get("item")); JsonNode it = (JsonNode) X[0], P = (JsonNode) X[1], R = get(it, "rules"); Number en = (Number) r.get("ends_ms"); boolean late = en != null && System.currentTimeMillis() > en.longValue() + 60_000L; List<JsonNode> Q = arr(get(it, "qs")); double sc = 0, tot = 0; Map<String, Object> clean = new LinkedHashMap<>(); List<Map<String, Object>> res = new java.util.ArrayList<>(); boolean obj = ans != null && ans.isObject();
            for (int i : ints((String) r.get("qorder"))) { JsonNode q = i < Q.size() ? Q.get(i) : null; double pt = num(get(q, "pts")); double p = pt > 0 ? pt : 1; tot += p; JsonNode a = obj ? ans.get(String.valueOf(i)) : null; String v = late || a == null || a.isNull() ? "" : a.isTextual() ? a.textValue() : S(a); if (v.length() > 2000) v = v.substring(0, 2000); clean.put(String.valueOf(i), v); boolean ok = right(q, v); if (ok) sc += p; Map<String, Object> m = new LinkedHashMap<>(); m.put("i", i); m.put("ok", ok); res.add(m); }
            int score = (int) Math.round(sc / Math.max(1, tot) * 100); JsonNode ps = get(R, "pass"); double gp = num(get(P, "pass")); Boolean pass = truthy(get(ps, "on")) ? (Boolean) (score >= num(get(ps, "v"))) : gp > 0 ? (Boolean) (score >= gp) : null; mapper.submitExam((String) r.get("id"), DdWeb.JSON.writeValueAsString(clean), score, pass, late); String sh = S(get(R, "show"));
            Map<String, Object> o = new LinkedHashMap<>(); o.put("score", score); o.put("pass", pass); o.put("late", late); Long clsEnd = classEnd(tid, (String) r.get("cls")); boolean moel = S(get(P, "profile")).startsWith("moel-"); boolean hide = "never".equals(sh) || "end".equals(sh) || (moel && !(clsEnd != null && System.currentTimeMillis() > clsEnd + 7 * 86_400_000L)); o.put("res", hide ? List.of() : res); return o; }); }
    @Override public Map<String, Object> exams(Map<String, Object> a) throws Exception { String tid = (String) a.get("tid"); Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", tx.inTenant(tid, () -> mapper.selectExams(tid))); return o; }

    @Override public Map<String, Object> summary(Map<String, Object> a) throws Exception { String tid = (String) a.get("tid"); Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", tx.inTenant(tid, () -> mapper.selectSummary(tid))); return o; }
    @Override public Map<String, Object> logs(Map<String, Object> a, String sid, String limit) throws Exception {
        String tid = (String) a.get("tid"); double l = limit == null ? 0 : num(limit); int n = (int) Math.min(2000, Math.max(1, l > 0 ? l : 200)); String s = sid == null ? "" : sid;
        Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", tx.inTenant(tid, () -> mapper.selectLogs(tid, s, n))); return o;
    }
}
