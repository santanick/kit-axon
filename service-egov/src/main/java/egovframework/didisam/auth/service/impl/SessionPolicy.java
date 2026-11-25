package egovframework.didisam.auth.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * 가디언 4차(인증 크로스체크 #2 · #3 · #4) 운영자 세션 정책 — Node service/server/session.js와 같은 규칙 · 응답 · 오류 코드.
 * 유휴 SESSION_IDLE_MIN(기본 60, 기관 org.sec.idleMin 10~60) · 최대 SESSION_MAX_H(기본 12시간) · 세션 쿠키 · 동시 접속 알림(others) · 작업 모드(최대 240분) · org.sec.maxSessions.
 */
@Component
public class SessionPolicy {
    private final SessionMapper m; private final TenantTx tx; private final DdProps p; private final DdWeb web;
    private final Map<String, Object[]> cache = new ConcurrentHashMap<>();
    public SessionPolicy(SessionMapper m, TenantTx tx, DdProps p, DdWeb web) { this.m = m; this.tx = tx; this.p = p; this.web = web; }

    public record Sec(Integer idleMin, int maxSessions, String mfa) {}
    public Sec secOf(String tid) {
        Object[] c = cache.get(tid); if (c != null && (long) c[0] > System.currentTimeMillis() - 30_000L) return (Sec) c[1];
        JsonNode S = null; try { String raw = tx.inTenant(tid, () -> m.selectSec(tid)); if (raw != null) S = DdWeb.JSON.readTree(raw); } catch (Exception ignore) { }
        if (S == null || !S.isObject()) S = DdWeb.JSON.createObjectNode();
        JsonNode im = S.get("idleMin"), ms = S.get("maxSessions"), mf = S.get("mfa");
        Integer idle = im != null && im.isIntegralNumber() && im.asInt() >= 10 && im.asInt() <= 60 ? im.asInt() : null;
        int max = ms != null && ms.isIntegralNumber() && ms.asInt() >= 0 && ms.asInt() <= 10 ? ms.asInt() : 0;
        Sec v = new Sec(idle, max, mf != null && "totp".equals(mf.asText()) ? "totp" : "email");
        cache.put(tid, new Object[]{System.currentTimeMillis(), v}); return v;
    }
    public int idleOf(String tid) { Integer i = secOf(tid).idleMin(); return i != null ? i : p.idleMin; }

    /** 로그인 · 가입 · 소셜 로그인 직후. 같은 브라우저의 이전 세션은 지우고, 다른 활성 세션 수를 돌려준다 */
    public int create(HttpServletRequest req, HttpServletResponse res, String uid, String tid) throws Exception {
        String old = req == null ? null : web.sidToken(req); if (old != null && !old.isEmpty() && old.length() <= 100) m.deleteById(DdCrypto.sha(old));
        String token = DdCrypto.newToken(), id = DdCrypto.sha(token); Sec pol = secOf(tid); int idle = pol.idleMin() != null ? pol.idleMin() : p.idleMin;
        m.insert(id, uid, tid, Math.min(idle, p.maxH * 60), req == null ? "" : LoginDevices.agent(req.getHeader("user-agent")), req == null ? "" : LoginDevices.band(web.ip(req)));
        if (pol.maxSessions() > 0) {
            int n = m.evict(uid, pol.maxSessions());
            if (n > 0) { String em = Objects.toString(m.selectEmail(uid), ""); try { tx.audit(tid, em, "session.evict", Js.stringify(Js.F.objectNode().put("n", n).put("max", pol.maxSessions()))); } catch (Exception ignore) { } }
        }
        int others = m.countOthers(uid, id, p.maxH);
        web.setSid(res, token); return others;
    }
    /** peek=true: 남은 시간 조회(GET /api/session)는 연장하지 않는다 */
    public Map<String, Object> check(HttpServletRequest req, boolean peek) {
        String t = web.sidToken(req); if (t == null || t.isEmpty() || t.length() > 100) return null;
        Map<String, Object> a = m.selectAuth(DdCrypto.sha(t), p.maxH); if (a == null || peek) return a;
        int idle = idleOf((String) a.get("tid"));
        if (((Number) a.get("remain")).doubleValue() < idle * 30.0) m.slide((String) a.get("sid"), p.maxH, idle);
        return a;
    }
    public void touch(Map<String, Object> a) { m.slide((String) a.get("sid"), p.maxH, idleOf((String) a.get("tid"))); }
    public Map<String, Object> info(Map<String, Object> a) {
        Map<String, Object> r = m.selectInfo((String) a.get("sid"), p.maxH); if (r == null) throw new DdException(401, "로그인이 필요합니다.", "auth");
        Map<String, Object> o = new LinkedHashMap<>(); o.put("idleMin", idleOf((String) a.get("tid"))); o.put("remain", ((Number) r.get("remain")).intValue()); o.put("expiresAt", r.get("exp")); o.put("maxAt", r.get("maxat"));
        if (r.get("wu") != null) { Map<String, Object> w = new LinkedHashMap<>(); w.put("until", r.get("wu")); w.put("reason", Objects.toString(r.get("work_reason"), "")); o.put("work", w); } else o.put("work", null);
        return o;
    }
    public Map<String, Object> work(Map<String, Object> a, JsonNode b) throws Exception {
        JsonNode mn = b.get("minutes"); if (mn == null || !mn.isIntegralNumber() || mn.asInt() < 0 || mn.asInt() > 240) throw new DdException(400, "작업 모드 시간은 0~240분으로 입력하십시오.", "work_minutes");
        int min = mn.asInt(); JsonNode rn = b.get("reason"); String reason = rn == null || rn.isNull() ? "" : rn.isValueNode() ? rn.asText() : rn.toString(); reason = reason.trim(); if (reason.length() > 200) reason = reason.substring(0, 200);
        String tid = (String) a.get("tid"), email = (String) a.get("email");
        if (min == 0) { m.workEnd((String) a.get("sid")); touch(a); tx.audit(tid, email, "session.work_end", null); return info(a); }
        if (reason.length() < 2) throw new DdException(400, "작업 모드 사유를 입력하십시오.", "work_reason");
        m.workStart((String) a.get("sid"), p.maxH, min, reason); touch(a);
        tx.audit(tid, email, "session.work", Js.stringify(Js.F.objectNode().put("minutes", min).put("reason", reason)));
        return info(a);
    }
    public Map<String, Object> list(Map<String, Object> a) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map<String, Object> r : m.selectList((String) a.get("uid"), p.maxH)) {
            String id = (String) r.get("id"); Map<String, Object> o = new LinkedHashMap<>();
            o.put("id", id.substring(0, 12)); o.put("current", id.equals(a.get("sid"))); o.put("agent", r.get("agent")); o.put("band", r.get("band")); o.put("createdAt", r.get("c")); o.put("lastAt", r.get("l")); o.put("expiresAt", r.get("e")); rows.add(o);
        }
        return Map.of("rows", rows);
    }
    public Map<String, Object> logoutOthers(Map<String, Object> a) {
        int n = m.deleteOthers((String) a.get("uid"), (String) a.get("sid"));
        tx.audit((String) a.get("tid"), (String) a.get("email"), "session.logout_others", Js.stringify(Js.F.objectNode().put("n", n)));
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("n", n); return o;
    }
    public Map<String, Object> orgOut(String tid) {
        Sec s = secOf(tid); Map<String, Object> o = new LinkedHashMap<>();
        o.put("idleMin", s.idleMin()); o.put("maxSessions", s.maxSessions()); o.put("mfa", s.mfa()); o.put("idleDefault", p.idleMin); o.put("maxHours", p.maxH); return o;
    }
    public Map<String, Object> orgSet(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = (String) a.get("tid"); ObjectNode set = Js.F.objectNode();
        if (b.has("idleMin")) { JsonNode v = b.get("idleMin"); if (v.isNull()) set.putNull("idleMin"); else if (!v.isIntegralNumber() || v.asInt() < 10 || v.asInt() > 60) throw new DdException(400, "자동 로그아웃 시간은 10~60분으로 입력하십시오.", "idle_min"); else set.put("idleMin", v.asInt()); }
        if (b.has("maxSessions")) { JsonNode v = b.get("maxSessions"); if (!v.isIntegralNumber() || v.asInt() < 0 || v.asInt() > 10) throw new DdException(400, "동시 접속 수는 0(제한 없음)~10으로 입력하십시오.", "max_sessions"); set.put("maxSessions", v.asInt()); }
        if (b.has("mfa")) { JsonNode v = b.get("mfa"); if (!v.isTextual() || !List.of("email", "totp").contains(v.asText())) throw new DdException(400, "추가 인증 방식이 올바르지 않습니다.", "sec_mfa"); set.put("mfa", v.asText()); }
        Sec before = secOf(tid);
        int n = tx.inTenant(tid, () -> m.mergeSec(tid, Js.stringify(set)));
        if (n == 0) throw new DdException(409, "기관 설정을 먼저 저장하십시오.", "state_first");
        ObjectNode d = Js.F.objectNode(); ObjectNode bf = d.putObject("before"); if (before.idleMin() == null) bf.putNull("idleMin"); else bf.put("idleMin", before.idleMin()); bf.put("maxSessions", before.maxSessions()); bf.put("mfa", before.mfa()); d.set("set", set);
        tx.audit(tid, (String) a.get("email"), "org.sec", Js.stringify(d));
        cache.remove(tid); return orgOut(tid);
    }
}
