package egovframework.didisam.media.web;

import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.media.service.MediaService;
import egovframework.didisam.media.service.impl.DdMedia;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** v34.5 홈페이지 이미지 /api/media — 업로드(본문 = 이미지 바이트) · 목록 · 공개 조회 · 삭제 */
@RestController
@RequestMapping("/api/media")
public class MediaController {
    private final AuthService authService; private final MediaService mediaService; private final DdRateLimiter rl;
    public MediaController(AuthService authService, MediaService mediaService, DdRateLimiter rl) { this.authService = authService; this.mediaService = mediaService; this.rl = rl; }

    @PostMapping("") public Map<String, Object> upload(@RequestParam(value = "name", required = false) String name, HttpServletRequest req) throws Exception {
        Map<String, Object> a = authService.needStaff(req);
        rl.limit("mup:" + a.get("tid"), 300, 3600_000L); rl.limit("mupu:" + a.get("uid"), 60, 60_000L);
        return mediaService.upload(a, readRaw(req), name);
    }
    @GetMapping("") public Map<String, Object> list(@RequestParam(value = "limit", required = false) String limit, @RequestParam(value = "kind", required = false) String kind, HttpServletRequest req) throws Exception {
        if ("file".equals(kind)) return mediaService.fileList(authService.need(req), limit); /* v35 강의 파일 */
        return mediaService.list(authService.needStaff(req), limit);
    }
    @GetMapping("/{id}") public void get(HttpServletRequest req, HttpServletResponse res) throws Exception { mediaService.get(idOf(req), req, res); }
    @DeleteMapping("/{id}") public Map<String, Object> delete(HttpServletRequest req) throws Exception { return mediaService.delete(authService.needStaff(req), idOf(req)); }

    /* ── v35 강의 파일(/api/media/f) — 운영자 · 교강사. Node mediafile.js와 같은 규격 ── */
    @PostMapping("/f") public Map<String, Object> fileStart(HttpServletRequest req) throws Exception {
        Map<String, Object> a = authService.need(req); return mediaService.fileStart(a, readMax(req, 4096));
    }
    @PutMapping("/f/{id}") public Map<String, Object> filePart(@RequestParam(value = "part", required = false) String part, HttpServletRequest req) throws Exception {
        Map<String, Object> a = authService.need(req); String id = idOf(req); return mediaService.filePart(a, id, part, readMax(req, mediaService.chunk() + 16));
    }
    @PostMapping("/f/{id}/done") public Map<String, Object> fileDone(HttpServletRequest req) throws Exception {
        Map<String, Object> a = authService.need(req); return mediaService.fileDone(a, seg(req, 2));
    }
    @GetMapping("/f/{id}") public void fileGet(HttpServletRequest req, HttpServletResponse res) throws Exception { mediaService.fileGet(idOf(req), req, res); }
    @DeleteMapping("/f/{id}") public Map<String, Object> fileDelete(HttpServletRequest req) throws Exception { return mediaService.fileDelete(authService.need(req), idOf(req)); }
    /** 뒤에서 k번째 경로 칸(디코딩) */
    static String seg(HttpServletRequest req, int k) { String[] p = req.getRequestURI().split("/", -1); return URLDecoder.decode(p[p.length - k].replace("+", "%2B"), StandardCharsets.UTF_8); }
    static byte[] readMax(HttpServletRequest req, long max) throws Exception {
        long cl = req.getContentLengthLong(); if (cl > max) throw new egovframework.didisam.cmm.DdException(413, "조각이 너무 큽니다.", "too_large");
        ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] buf = new byte[65536]; int n; long t = 0;
        try (InputStream in = req.getInputStream()) { while ((n = in.read(buf)) > 0) { t += n; if (t > max) throw new egovframework.didisam.cmm.DdException(413, "조각이 너무 큽니다.", "too_large"); out.write(buf, 0, n); } }
        return out.toByteArray();
    }

    /** 경로 마지막 칸을 그대로(디코딩만) — Spring 경로 변수의 점(.) 처리와 무관하게 Node와 같은 id */
    static String idOf(HttpServletRequest req) { String u = req.getRequestURI(); return URLDecoder.decode(u.substring(u.lastIndexOf('/') + 1).replace("+", "%2B"), StandardCharsets.UTF_8); }
    static byte[] readRaw(HttpServletRequest req) throws Exception {
        long cl = req.getContentLengthLong(); if (cl > DdMedia.MAX) throw DdMedia.tooLarge();
        ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] buf = new byte[65536]; int n; long t = 0;
        try (InputStream in = req.getInputStream()) { while ((n = in.read(buf)) > 0) { t += n; if (t > DdMedia.MAX) throw DdMedia.tooLarge(); out.write(buf, 0, n); } }
        return out.toByteArray();
    }
}
