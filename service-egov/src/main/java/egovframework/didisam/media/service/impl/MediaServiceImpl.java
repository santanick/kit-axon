package egovframework.didisam.media.service.impl;

import egovframework.didisam.cmm.*;
import egovframework.didisam.media.service.MediaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.*;
import java.util.regex.Matcher;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** 홈페이지 이미지 저장 — Node media.js createMedia와 같은 순서 · 같은 응답 · 같은 감사 기록 */
@Service("mediaService")
public class MediaServiceImpl extends EgovAbstractServiceImpl implements MediaService {
    private final MediaMapper mapper; private final TenantTx tx; private final TenantTxMapper txm; private final DdRateLimiter rl; private final DdWeb web;
    private final long quota; private final int maxFiles;
    public MediaServiceImpl(MediaMapper mapper, TenantTx tx, TenantTxMapper txm, DdRateLimiter rl, DdWeb web,
                            @Value("${MEDIA_TENANT_MB:100}") String mb, @Value("${MEDIA_MAX_FILES:2000}") String files) {
        this.mapper = mapper; this.tx = tx; this.txm = txm; this.rl = rl; this.web = web;
        this.quota = (long) Math.max(1, num(mb, 100)) * 1024 * 1024; this.maxFiles = (int) Math.max(1, num(files, 2000));
    }
    static double num(String v, double d) { double x = v == null || v.isEmpty() ? d : Js.num(v); return Double.isNaN(x) || x == 0 ? d : x; }

    static Map<String, Object> out(String tid, String id, Object mime, Object bytes, Object w, Object h) {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("id", tid + "." + id); o.put("url", "/api/media/" + tid + "." + id); o.put("mime", mime);
        o.put("bytes", ((Number) bytes).longValue()); o.put("w", w == null ? null : ((Number) w).longValue()); o.put("h", h == null ? null : ((Number) h).longValue());
        return o;
    }
    static String detail(Map<String, Object> m) { try { return DdWeb.JSON.writeValueAsString(m); } catch (Exception e) { return null; } }

    @Override public Map<String, Object> upload(Map<String, Object> a, byte[] raw, String name0) throws Exception {
        String tid = (String) a.get("tid");
        DdMedia.Out m = DdMedia.prepare(raw); String name = DdMedia.cleanName(name0);
        return tx.inTenant(tid, () -> {
            Map<String, Object> cur = mapper.selectMeta(tid, m.hash);
            if (cur != null) { Map<String, Object> o = out(tid, m.hash, cur.get("mime"), cur.get("bytes"), cur.get("w"), cur.get("h")); o.put("dup", true); return o; }
            Map<String, Object> u = mapper.selectUsage(tid);
            if (((Number) u.get("used")).longValue() + m.buf.length > quota) throw new DdException(413, "기관 이미지 저장 한도(" + Math.round(quota / 1048576.0) + "MB)를 넘었습니다. 쓰지 않는 이미지를 지워 주세요.", "media_quota");
            if (((Number) u.get("n")).intValue() >= maxFiles) throw new DdException(413, "기관 이미지는 " + maxFiles + "개까지 저장할 수 있습니다. 쓰지 않는 이미지를 지워 주세요.", "media_quota");
            mapper.insertMedia(tid, m.hash, m.mime, m.buf.length, m.w, m.h, name, m.buf, (String) a.get("email"));
            Map<String, Object> d = new LinkedHashMap<>(); d.put("id", m.hash); d.put("mime", m.mime); d.put("bytes", m.buf.length);
            txm.insertAudit(tid, (String) a.get("email"), "media.upload", detail(d));
            Map<String, Object> o = out(tid, m.hash, m.mime, m.buf.length, m.w, m.h); o.put("dup", false); return o;
        });
    }
    @Override public Map<String, Object> list(Map<String, Object> a, String limit) throws Exception {
        String tid = (String) a.get("tid");
        double q = limit == null ? Double.NaN : Js.num(limit); if (Double.isNaN(q) || q == 0) q = 50;
        int n = (int) Math.max(1, Math.min(200, Math.floor(q)));
        return tx.inTenant(tid, () -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (Map<String, Object> r : mapper.selectList(tid, n)) { Map<String, Object> o = out(tid, (String) r.get("id"), r.get("mime"), r.get("bytes"), r.get("w"), r.get("h")); o.put("name", r.get("name")); o.put("at", r.get("at")); rows.add(o); }
            Map<String, Object> u = mapper.selectUsage(tid);
            Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", rows); o.put("used", ((Number) u.get("used")).longValue()); o.put("max", quota); o.put("n", ((Number) u.get("n")).intValue()); return o;
        });
    }
    @Override public void get(String id, HttpServletRequest req, HttpServletResponse res) throws Exception {
        Matcher m = DdMedia.ID_RE.matcher(id); if (!m.matches()) throw new DdException(404, "없는 이미지입니다.", "media_missing");
        rl.limit("mg:" + web.ip(req), 3000, 60000);
        String tid = m.group(1), h = m.group(2), etag = "\"" + h + "\"";
        Map<String, Object> r = tx.inTenant(tid, () -> mapper.selectData(tid, h));
        if (r == null) throw new DdException(404, "없는 이미지입니다.", "media_missing");
        res.setHeader("cache-control", "public, max-age=31536000, immutable"); res.setHeader("etag", etag);
        res.setHeader("cross-origin-resource-policy", "cross-origin"); res.setHeader("content-security-policy", DdMedia.CSP);
        if (etag.equals(req.getHeader("if-none-match"))) { res.setStatus(304); return; }
        byte[] data = (byte[]) r.get("data");
        res.setStatus(200); res.setContentType((String) r.get("mime")); res.setContentLength(data.length);
        res.getOutputStream().write(data);
    }
    @Override public Map<String, Object> delete(Map<String, Object> a, String id) throws Exception {
        String tid = (String) a.get("tid"); Matcher m = DdMedia.ID_RE.matcher(id);
        if (!m.matches() || !m.group(1).equals(tid)) throw new DdException(404, "없는 이미지입니다.", "media_missing");
        String h = m.group(2);
        return tx.inTenant(tid, () -> {
            if (mapper.deleteMedia(tid, h) == 0) throw new DdException(404, "없는 이미지입니다.", "media_missing");
            Map<String, Object> d = new LinkedHashMap<>(); d.put("id", h); txm.insertAudit(tid, (String) a.get("email"), "media.delete", detail(d));
            return new LinkedHashMap<>(Map.of("ok", true));
        });
    }
}
