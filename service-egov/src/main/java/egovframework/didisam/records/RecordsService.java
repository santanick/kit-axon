package egovframework.didisam.records;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdProps;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** 가디언 4차(d3) — 분기 접근권한 검토(#7) · 국외 운영자 로그인 차단(#15) · 보관 만료 파기(#10 · #11). Node service/server/records.js와 같은 규격 */
@Service
public class RecordsService {
    private static final Logger log = LoggerFactory.getLogger(RecordsService.class);
    static final Pattern CC = Pattern.compile("^[A-Z]{2}$");
    private final RecordsMapper m; private final TenantTx tx; private final DdProps p; private final String geoHdr;
    public RecordsService(RecordsMapper m, TenantTx tx, DdProps p, @Value("${GEO_COUNTRY_HEADER:}") String geo) { this.m = m; this.tx = tx; this.p = p; this.geoHdr = geo.trim().toLowerCase(Locale.ROOT); }

    public Map<String, Object> reviewGet(Map<String, Object> a) throws Exception {
        String tid = (String) a.get("tid"); List<Map<String, Object>> rows = new ArrayList<>();
        for (Map<String, Object> r : m.selectStaff(tid)) { Map<String, Object> o = new LinkedHashMap<>(); o.put("email", r.get("email")); o.put("role", r.get("role")); o.put("lastLogin", r.get("last_login")); rows.add(o); }
        Map<String, Object> lr = tx.inTenant(tid, () -> m.selectLastReview(tid));
        Map<String, Object> out = new LinkedHashMap<>(); out.put("rows", rows);
        if (lr == null) out.put("lastReview", null);
        else { Map<String, Object> x = new LinkedHashMap<>(); x.put("at", lr.get("at")); x.put("by", lr.get("actor")); x.put("note", lr.get("note") == null ? "" : lr.get("note")); out.put("lastReview", x); }
        out.put("due", lr == null || !Boolean.TRUE.equals(lr.get("fresh"))); return out;
    }
    public Map<String, Object> reviewPost(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = (String) a.get("tid"); JsonNode nv = b == null ? null : b.get("note");
        String note = nv == null || nv.isNull() ? "" : (nv.isTextual() ? nv.asText() : nv.toString()).trim();
        if (note.length() > 500) throw new DdException(400, "검토 메모는 500자까지 입력할 수 있습니다.", "note");
        int o = 0, s = 0, t = 0; for (Map<String, Object> r : m.selectStaff(tid)) { String role = String.valueOf(r.get("role")); if ("owner".equals(role)) o++; else if ("sub".equals(role)) s++; else t++; }
        var roles = DdWeb.JSON.createObjectNode().put("owner", o).put("sub", s).put("teacher", t);
        var d = DdWeb.JSON.createObjectNode().put("note", note).put("n", o + s + t); d.set("roles", roles);
        tx.audit(tid, (String) a.get("email"), "access.review", d.toString());
        return new LinkedHashMap<>(Map.of("ok", true));
    }
    boolean krOnly(String tid) { try { return "true".equals(tx.inTenant(tid, () -> m.selectKrOnly(tid))); } catch (Exception e) { return false; } }
    public Map<String, Object> geoGet(Map<String, Object> a) { return new LinkedHashMap<>(Map.of("krOnly", krOnly((String) a.get("tid")))); }
    public Map<String, Object> geoPost(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = (String) a.get("tid"); JsonNode v = b == null ? null : b.get("krOnly");
        if (v == null || !v.isBoolean()) throw new DdException(400, "설정 값이 올바르지 않습니다.", "krOnly");
        boolean on = v.asBoolean(); int n = tx.inTenant(tid, () -> m.updateKrOnly(tid, on));
        if (n == 0) throw new DdException(409, "기관 정보를 먼저 저장한 뒤 다시 시도하십시오.", "no_state");
        tx.audit(tid, (String) a.get("email"), "org.sec.geo", DdWeb.JSON.createObjectNode().put("krOnly", on).toString());
        Map<String, Object> out = new LinkedHashMap<>(); out.put("ok", true); out.put("krOnly", on); return out;
    }
    /** #15 로그인 성공 직후(세션 발급 전) 호출 — 국가를 알 수 없으면 막지 않는다(Node geoCheck와 같음) */
    public void geoCheck(HttpServletRequest req, String tid, String actor) {
        if (!krOnly(tid)) return;
        String cc = geoHdr.isEmpty() || p.hops == 0 ? "" : Objects.toString(req.getHeader(geoHdr), "").trim().toUpperCase(Locale.ROOT);
        if (!CC.matcher(cc).matches() || "KR".equals(cc)) return;
        try { tx.audit(tid, String.valueOf(actor), "login.geo_blocked", DdWeb.JSON.createObjectNode().put("country", cc).toString()); } catch (Exception e) { }
        throw new DdException(403, "이 기관은 국내에서만 운영자 로그인을 허용합니다.", "geo_blocked");
    }
    /** 보관 만료 파기(하루 1회) — 접속기록 · 감사기록 2년, 권한 관련 기록 3년(audit_archive) */
    @Scheduled(fixedDelay = 86400000L, initialDelayString = "${dd.records.initialMs:3600000}")
    public void purge() { try { String r = m.purge(); if (r != null && !"{}".equals(r)) log.info("records purge {}", r); } catch (Exception e) { log.warn("records purge failed: {}", e.getMessage()); } }
}
