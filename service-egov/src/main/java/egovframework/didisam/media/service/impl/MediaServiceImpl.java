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
    /* v35 강의 파일 한도(Node mediafile.js limits와 같음) */
    private final long fDoc, fVideo, fAudio, fQuota; private final int fFiles, fChunk;
    public MediaServiceImpl(MediaMapper mapper, TenantTx tx, TenantTxMapper txm, DdRateLimiter rl, DdWeb web,
                            @Value("${MEDIA_TENANT_MB:100}") String mb, @Value("${MEDIA_MAX_FILES:2000}") String files,
                            @Value("${MEDIA_DOC_MB:}") String docMb, @Value("${MEDIA_VIDEO_MB:}") String videoMb, @Value("${MEDIA_AUDIO_MB:}") String audioMb,
                            @Value("${MEDIA_FILE_TENANT_MB:}") String fileMb, @Value("${MEDIA_FILE_MAX_FILES:}") String fileN, @Value("${MEDIA_CHUNK_KB:}") String chunkKb) {
        this.mapper = mapper; this.tx = tx; this.txm = txm; this.rl = rl; this.web = web;
        this.quota = (long) Math.max(1, num(mb, 100)) * 1024 * 1024; this.maxFiles = (int) Math.max(1, num(files, 2000));
        long M = DdMediaFile.MB;
        fDoc = (long) Math.floor(pos(docMb, 100) * M); fVideo = (long) Math.floor(pos(videoMb, 1024) * M); fAudio = (long) Math.floor(pos(audioMb, 200) * M);
        fQuota = (long) Math.floor(pos(fileMb, 5120) * M); fFiles = (int) Math.floor(pos(fileN, 2000));
        fChunk = (int) Math.max(64 * 1024, Math.min(16 * M, Math.floor(pos(chunkKb, 8192) * 1024)));
    }
    /** Node limits의 n(): 양수가 아니면 기본값 */
    static double pos(String v, double d) { if (v == null || v.isEmpty()) return d; try { double x = Double.parseDouble(v.trim()); return Double.isFinite(x) && x > 0 ? x : d; } catch (NumberFormatException e) { return d; } }
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

    /* ── v35 강의 파일(/api/media/f) — Node mediafile.js createMediaFiles와 같은 순서 · 같은 응답 ── */
    @Override public int chunk() { return fChunk; }
    static DdException missingFile() { return new DdException(404, "없는 파일입니다.", "media_missing"); }
    static long lng(Object o) { return ((Number) o).longValue(); }
    static String own(Map<String, Object> a, String id) { Matcher m = DdMedia.ID_RE.matcher(id); if (!m.matches() || !m.group(1).equals(a.get("tid"))) throw missingFile(); return m.group(2); }
    static Map<String, Object> fout(String tid, String h, Map<String, Object> r) {
        Map<String, Object> o = new LinkedHashMap<>(); o.put("id", tid + "." + h); o.put("url", "/api/media/f/" + tid + "." + h); o.put("name", r.get("name"));
        o.put("mime", r.get("mime")); o.put("type", r.get("kind")); o.put("bytes", lng(r.get("bytes"))); return o;
    }
    static Map<String, Object> fail(Map<String, Object> r) { Object e = r == null ? null : r.get("$err"); if (e != null) { Object[] x = (Object[]) e; throw new DdException((Integer) x[0], (String) x[1], (String) x[2]); } return r; }
    static Map<String, Object> err(int st, String msg, String code) { Map<String, Object> o = new LinkedHashMap<>(); o.put("$err", new Object[]{st, msg, code}); return o; }
    long maxOf(String type) { return "video".equals(type) ? fVideo : "audio".equals(type) ? fAudio : fDoc; }
    byte[] readRange(String tid, String h, int ch, long start, long len) {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream(); long p = start, end = start + len;
        while (p < end) {
            int seq = (int) (p / ch); int off = (int) (p - (long) seq * ch); int n = (int) Math.min(end - p, ch - off);
            Map<String, Object> r = mapper.partSlice(tid, h, seq, off + 1, n);
            if (r == null) throw new DdException(500, "파일 조각이 없습니다.", "media_part");
            byte[] d = (byte[]) r.get("d"); out.write(d, 0, d.length); p += d.length; if (d.length == 0) break;
        }
        return out.toByteArray();
    }
    @Override public Map<String, Object> fileStart(Map<String, Object> a, byte[] body) throws Exception {
        String tid = (String) a.get("tid");
        rl.limit("mfs:" + tid, 300, 3600_000L); rl.limit("mfsu:" + a.get("uid"), 60, 60_000L);
        com.fasterxml.jackson.databind.JsonNode b = DdWeb.readBody(body, 4096);
        com.fasterxml.jackson.databind.JsonNode nn = b.get("name");
        String name0 = nn == null || nn.isNull() || nn.isMissingNode() ? "" : nn.isTextual() ? nn.asText() : nn.toString();
        DdMediaFile.Ft ft = DdMediaFile.fileType(name0); if (ft == null) throw new DdException(415, DdMediaFile.LIST + "만 올릴 수 있습니다.", "media_type");
        double sz = Js.num(b.get("size"));
        if (Double.isNaN(sz) || sz != Math.floor(sz) || sz < 1 || sz > 9007199254740991d) throw new DdException(400, "파일 크기가 올바르지 않습니다.", "media_bad");
        long size = (long) sz; long max = maxOf(ft.type);
        if (size > max) throw new DdException(413, DdMediaFile.KIND_KO.get(ft.type) + " 파일은 " + DdMediaFile.mbText(max) + " 이하만 올릴 수 있습니다.", "too_large");
        String name = DdMediaFile.cleanFileName(name0, ft.ext); int parts = (int) ((size + fChunk - 1) / fChunk);
        byte[] rnd = new byte[20]; new java.security.SecureRandom().nextBytes(rnd); String h = java.util.HexFormat.of().formatHex(rnd);
        return tx.inTenant(tid, () -> {
            mapper.fileDeleteStale(tid);
            Map<String, Object> u = mapper.fileUsage(tid);
            if (lng(u.get("used")) + size > fQuota) throw new DdException(413, "기관 강의 파일 저장 한도(" + DdMediaFile.mbText(fQuota) + ")를 넘었습니다. 쓰지 않는 파일을 지워 주세요.", "media_quota");
            if (((Number) u.get("n")).intValue() >= fFiles) throw new DdException(413, "기관 강의 파일은 " + fFiles + "개까지 저장할 수 있습니다. 쓰지 않는 파일을 지워 주세요.", "media_quota");
            mapper.fileInsert(tid, h, ft.mime, size, name, ft.type, parts, fChunk, (String) a.get("email"));
            Map<String, Object> o = new LinkedHashMap<>(); o.put("id", tid + "." + h); o.put("url", "/api/media/f/" + tid + "." + h); o.put("name", name); o.put("mime", ft.mime);
            o.put("type", ft.type); o.put("bytes", size); o.put("chunk", fChunk); o.put("parts", parts); return o;
        });
    }
    @Override public Map<String, Object> filePart(Map<String, Object> a, String id, String part, byte[] raw) throws Exception {
        String tid = (String) a.get("tid"); String h = own(a, id);
        rl.limit("mfp:" + a.get("uid"), 1200, 60_000L);
        double sq = part == null || part.isEmpty() ? Double.NaN : Js.num(part);
        return fail(tx.inTenant(tid, () -> {
            Map<String, Object> m = mapper.fileMeta(tid, h);
            if (m == null || !"up".equals(m.get("status"))) throw missingFile();
            int parts = ((Number) m.get("parts")).intValue(), ch = ((Number) m.get("chunk")).intValue(); long bytes = lng(m.get("bytes"));
            if (Double.isNaN(sq) || sq != Math.floor(sq) || sq < 0 || sq >= parts) throw new DdException(400, "조각 번호가 올바르지 않습니다.", "media_part");
            int seq = (int) sq; long want = seq < parts - 1 ? ch : bytes - (long) ch * (parts - 1);
            if (raw.length != want) throw new DdException(400, "조각 크기가 맞지 않습니다(" + raw.length + " ≠ " + want + ").", "media_part");
            if (seq == 0) { DdMediaFile.Ft ft = DdMediaFile.fileType((String) m.get("name")); if (!DdMediaFile.headOk(ft.ext, raw)) { mapper.fileDrop(tid, h); return err(415, "파일 내용이 " + ft.ext.toUpperCase(java.util.Locale.ROOT) + " 형식이 아닙니다. 확장자를 바꾼 파일은 올릴 수 없습니다.", "media_type"); } }
            mapper.partUpsert(tid, h, seq, raw);
            Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("part", seq); return o;
        }));
    }
    @Override public Map<String, Object> fileDone(Map<String, Object> a, String id) throws Exception {
        String tid = (String) a.get("tid"); String h = own(a, id);
        return fail(tx.inTenant(tid, () -> {
            Map<String, Object> m = mapper.fileMeta(tid, h);
            if (m == null) throw missingFile();
            if ("ok".equals(m.get("status"))) { Map<String, Object> o = fout(tid, h, m); o.put("dup", true); return o; }
            int parts = ((Number) m.get("parts")).intValue(), ch = ((Number) m.get("chunk")).intValue(); long bytes = lng(m.get("bytes"));
            Map<String, Object> g = mapper.partStat(tid, h);
            int gn = ((Number) g.get("n")).intValue();
            if (gn != parts || lng(g.get("b")) != bytes) throw new DdException(409, "아직 다 올라가지 않았습니다(" + gn + "/" + parts + ").", "media_incomplete");
            String ext = DdMediaFile.fileType((String) m.get("name")).ext;
            byte[] head = readRange(tid, h, ch, 0, Math.min(bytes, 4096));
            String[] bad = DdMediaFile.headOk(ext, head) ? null : new String[]{"파일 내용이 " + ext.toUpperCase(java.util.Locale.ROOT) + " 형식이 아닙니다.", "media_type"};
            if (bad == null) { long tl = Math.min(bytes, DdMediaFile.TAIL); bad = DdMediaFile.tailErr(ext, readRange(tid, h, ch, bytes - tl, tl)); }
            if (bad != null) { mapper.fileDrop(tid, h); return err("media_bad".equals(bad[1]) ? 400 : 415, bad[0], bad[1]); }
            mapper.fileOk(tid, h);
            Map<String, Object> d = new LinkedHashMap<>(); d.put("id", h); d.put("mime", m.get("mime")); d.put("bytes", bytes);
            txm.insertAudit(tid, (String) a.get("email"), "media.file", detail(d));
            Map<String, Object> o = fout(tid, h, m); o.put("dup", false); return o;
        }));
    }
    @Override public void fileGet(String id, HttpServletRequest req, HttpServletResponse res) throws Exception {
        Matcher mm = DdMedia.ID_RE.matcher(id); if (!mm.matches()) throw missingFile();
        rl.limit("mfg:" + web.ip(req), 3000, 60000);
        String tid = mm.group(1), h = mm.group(2), etag = "\"" + h + "\"";
        tx.inTenant(tid, () -> {
            Map<String, Object> r = mapper.fileMeta(tid, h);
            if (r == null || !"ok".equals(r.get("status"))) throw missingFile();
            String name = (String) r.get("name"); String ext = DdMediaFile.fileType(name).ext; long size = lng(r.get("bytes"));
            int ch = ((Number) r.get("chunk")).intValue(), parts = ((Number) r.get("parts")).intValue();
            res.setHeader("cache-control", "private, max-age=31536000, immutable"); res.setHeader("etag", etag); res.setHeader("accept-ranges", "bytes");
            res.setHeader("content-disposition", DdMediaFile.disposition(name, ext, "1".equals(req.getParameter("dl"))));
            res.setHeader("content-security-policy", "pdf".equals(ext) ? DdMediaFile.PDF_CSP : DdMediaFile.FILE_CSP);
            if ("pdf".equals(ext)) res.setHeader("x-frame-options", "SAMEORIGIN");
            long[] rg = DdMediaFile.parseRange(req.getHeader("range"), size);
            if (rg == null && etag.equals(req.getHeader("if-none-match"))) { res.setStatus(304); return null; }
            res.setHeader("content-type", (String) r.get("mime"));
            if (rg != null && rg[0] < 0) { res.setStatus(416); res.setHeader("content-range", "bytes */" + size); return null; }
            if (rg != null) {
                long s = rg[0]; long e = Math.min(rg[1], (s / ch + 1) * ch - 1);
                byte[] buf = readRange(tid, h, ch, s, e - s + 1);
                res.setStatus(206); res.setHeader("content-range", "bytes " + s + "-" + (s + buf.length - 1) + "/" + size); res.setContentLength(buf.length);
                res.getOutputStream().write(buf); return null;
            }
            res.setStatus(200); res.setContentLengthLong(size);
            try {
                java.io.OutputStream os = res.getOutputStream();
                for (int i = 0; i < parts; i++) { Map<String, Object> d = mapper.partData(tid, h, i); if (d == null) break; os.write((byte[]) d.get("data")); os.flush(); }
            } catch (java.io.IOException gone) { /* 받는 쪽이 끊음(탐색 · 닫기) */ }
            return null;
        });
    }
    @Override public Map<String, Object> fileDelete(Map<String, Object> a, String id) throws Exception {
        String tid = (String) a.get("tid"); String h = own(a, id);
        return tx.inTenant(tid, () -> {
            Map<String, Object> r = mapper.fileMeta(tid, h);
            if (r == null) throw missingFile();
            if ("teacher".equals(a.get("role")) && !String.valueOf(r.get("created_by")).equals(a.get("email"))) throw new DdException(403, "내가 올린 파일만 지울 수 있습니다.", "teacher");
            mapper.fileDrop(tid, h);
            Map<String, Object> d = new LinkedHashMap<>(); d.put("id", h); txm.insertAudit(tid, (String) a.get("email"), "media.delete", detail(d));
            return new LinkedHashMap<>(Map.of("ok", true));
        });
    }
    @Override public Map<String, Object> fileList(Map<String, Object> a, String limit) throws Exception {
        String tid = (String) a.get("tid");
        double q = limit == null ? Double.NaN : Js.num(limit); if (Double.isNaN(q) || q == 0) q = 50;
        int n = (int) Math.max(1, Math.min(200, Math.floor(q)));
        return tx.inTenant(tid, () -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (Map<String, Object> r : mapper.fileList(tid, n)) { Map<String, Object> o = fout(tid, (String) r.get("id"), r); o.put("at", r.get("at")); rows.add(o); }
            Map<String, Object> u = mapper.fileUsage(tid);
            Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", rows); o.put("used", lng(u.get("used"))); o.put("max", fQuota); o.put("n", ((Number) u.get("n")).intValue()); return o;
        });
    }
}
