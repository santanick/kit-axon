package egovframework.didisam.lms.v.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * v32 미디어 작업기 — Node lms/media/worker.js와 같은 순서 · 같은 ffmpeg 인자 · 같은 SQL 함수(lms_v_w_*).
 * 대기열(lms_media_q)에서 for update skip locked로 하나씩 집으므로 두 서버가 같은 DB를 봐도 겹치지 않는다.
 * 환경: MEDIA_WORKER=0이면 끈다 · FFMPEG · FFPROBE · MEDIA_TMP · MEDIA_STT_CMD(&lt;명령&gt; &lt;음성&gt; &lt;언어&gt; → WebVTT) · MEDIA_STT_ENGINE
 */
@Component
public class LmsVWorker {
    private static final Logger log = LoggerFactory.getLogger(LmsVWorker.class);
    static final Pattern OUT_US = Pattern.compile("out_time_us=(\\d+)");
    private final LmsVMapper m; private final TenantTx tx; private final LmsVStore store;
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private final String wid = "java-" + ProcessHandle.current().pid();
    public LmsVWorker(LmsVMapper m, TenantTx tx, LmsVStore store) { this.m = m; this.tx = tx; this.store = store; }

    static String env(String k, String d) { String v = System.getenv(k); return v == null || v.isEmpty() ? d : v; }
    static boolean on() { return !"0".equals(System.getenv("MEDIA_WORKER")); }
    static final String W = "{\"kind\":\"worker\",\"engine\":\"ffmpeg\"}";
    JsonNode call(String tid, String fn, ObjectNode a) throws Exception {
        final String s = a.toString();
        String out = tx.inTenant(tid, () -> m.call(fn, W, s));
        return out == null ? null : DdWeb.JSON.readTree(out);
    }
    ObjectNode o() { return DdWeb.JSON.createObjectNode(); }
    void progress(String tid, String job, int p, String step) { try { ObjectNode a = o(); a.put("job_id", job); a.put("progress", p); a.put("step", step); call(tid, "lms_v_w_progress", a); } catch (Exception ignore) { } }

    /** 변환 계획(Node plan과 같음): 원본 높이를 넘지 않게 360 · 720 */
    static int even(double n) { return Math.max(2, (int) Math.floor(n / 2) * 2); }
    static List<int[]> plan(int h) {
        int a = Math.min(360, even(h > 0 ? h : 360)), b = Math.min(720, even(h > 0 ? h : 720));
        List<int[]> L = new ArrayList<>(); L.add(new int[] { a, 800 }); if (b > a) L.add(new int[] { b, b >= 720 ? 2500 : 1400 }); return L;
    }
    static String num(double d) { return d == Math.rint(d) && Math.abs(d) < 1e15 ? String.valueOf((long) d) : String.valueOf(d); }

    /** 프로세스 실행: 표준출력 줄마다 onLine, 실패하면 stderr 끝 두 줄을 담은 예외 */
    String run(List<String> cmd, long timeoutMs, java.util.function.Consumer<String> onLine) throws Exception {
        File err = File.createTempFile("ddm", ".err");
        try {
            Process pr = new ProcessBuilder(cmd).redirectError(err).start(); StringBuilder sb = new StringBuilder();
            Thread rd = new Thread(() -> { try (BufferedReader r = new BufferedReader(new InputStreamReader(pr.getInputStream(), StandardCharsets.UTF_8))) { String l; while ((l = r.readLine()) != null) { if (sb.length() < 8_000_000) sb.append(l).append('\n'); if (onLine != null) onLine.accept(l); } } catch (Exception ignore) { } });
            rd.start();
            if (!pr.waitFor(timeoutMs, TimeUnit.MILLISECONDS)) { pr.destroyForcibly(); throw new IllegalStateException(new File(cmd.get(0)).getName() + " 시간 초과"); }
            rd.join(5000);
            if (pr.exitValue() != 0) {
                String[] ls = Files.readString(err.toPath(), StandardCharsets.UTF_8).split("\n"); StringBuilder t = new StringBuilder();
                for (int i = Math.max(0, ls.length - 2); i < ls.length; i++) if (!ls[i].isBlank()) t.append(t.length() > 0 ? " " : "").append(ls[i]);
                String msg = t.toString(); throw new IllegalStateException(new File(cmd.get(0)).getName() + " 종료 코드 " + pr.exitValue() + ": " + (msg.length() > 300 ? msg.substring(0, 300) : msg));
            }
            return sb.toString();
        } finally { err.delete(); }
    }

    List<String> ffArgs(String src, Path out, List<int[]> R, boolean hasAudio, Double ts, Double te) {
        List<String> a = new ArrayList<>(List.of(env("FFMPEG", "ffmpeg"), "-hide_banner", "-y", "-nostdin"));
        if (ts != null) { a.add("-ss"); a.add(num(ts)); }
        a.add("-i"); a.add(src);
        if (te != null) { a.add("-t"); a.add(num(Math.max(0.5, te - (ts == null ? 0 : ts)))); }
        StringBuilder f = new StringBuilder();
        if (R.size() > 1) { f.append("[0:v]split=").append(R.size()); for (int i = 0; i < R.size(); i++) f.append("[s").append(i).append(']'); f.append(';'); } else f.append("[0:v]null[s0];");
        for (int i = 0; i < R.size(); i++) { if (i > 0) f.append(';'); f.append("[s").append(i).append("]scale=-2:").append(R.get(i)[0]).append("[v").append(i).append(']'); }
        a.add("-filter_complex"); a.add(f.toString());
        for (int i = 0; i < R.size(); i++) { a.add("-map"); a.add("[v" + i + "]"); if (hasAudio) { a.add("-map"); a.add("0:a:0"); } }
        a.addAll(List.of("-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-pix_fmt", "yuv420p", "-g", "48", "-keyint_min", "48", "-sc_threshold", "0"));
        for (int i = 0; i < R.size(); i++) { int k = R.get(i)[1]; a.addAll(List.of("-b:v:" + i, k + "k", "-maxrate:v:" + i, Math.round(k * 1.07) + "k", "-bufsize:v:" + i, Math.round(k * 1.5) + "k")); }
        if (hasAudio) a.addAll(List.of("-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "48000"));
        StringBuilder vm = new StringBuilder();
        for (int i = 0; i < R.size(); i++) { if (i > 0) vm.append(' '); vm.append(hasAudio ? "v:" + i + ",a:" + i : "v:" + i).append(",name:").append(R.get(i)[0]).append('p'); }
        a.addAll(List.of("-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
            "-hls_segment_filename", out.resolve("%v").resolve("seg_%03d.ts").toString(), "-master_pl_name", "master.m3u8", "-var_stream_map", vm.toString(),
            "-progress", "pipe:1", "-stats_period", "2", out.resolve("%v").resolve("index.m3u8").toString()));
        return a;
    }

    JsonNode transcode(String tid, JsonNode J, Path tmp) throws Exception {
        String mid = J.path("media_id").asText(), job = J.path("job_id").asText(); int chunks = J.path("chunks").asInt();
        Path src = tmp.resolve("src");
        try (OutputStream os = Files.newOutputStream(src)) {
            for (int i = 0; i < chunks; i++) { final String pth = "src/" + String.format("%06d", i); byte[] b = tx.inTenant(tid, () -> m.data(mid, pth)); if (b == null) throw new IllegalStateException("원본 조각이 없습니다: " + i); os.write(b); }
        }
        progress(tid, job, 2, "원본 분석");
        JsonNode pr = DdWeb.JSON.readTree(run(List.of(env("FFPROBE", "ffprobe"), "-v", "error", "-print_format", "json", "-show_streams", "-show_format", src.toString()), 120_000, null));
        JsonNode vs = null; boolean hasAudio = false;
        for (JsonNode s : pr.path("streams")) { if (vs == null && "video".equals(s.path("codec_type").asText())) vs = s; if ("audio".equals(s.path("codec_type").asText())) hasAudio = true; }
        if (vs == null) throw new IllegalStateException("영상 트랙이 없습니다(동영상 파일인지 확인하세요).");
        double dur = pr.path("format").path("duration").asDouble(0); if (dur == 0) dur = vs.path("duration").asDouble(0);
        Double ts = J.path("trim_start").isNumber() ? Math.min(J.path("trim_start").asDouble(), Math.max(0, dur - 0.5)) : null;
        Double te = J.path("trim_end").isNumber() && (dur == 0 || J.path("trim_end").asDouble() < dur) ? J.path("trim_end").asDouble() : null;
        List<int[]> R = plan(vs.path("height").asInt(0)); Path out = tmp.resolve("out");
        for (int[] r : R) Files.createDirectories(out.resolve(r[0] + "p"));
        final double total = Math.max(1, (te != null ? te : dur) - (ts == null ? 0 : ts)); final long[] last = { 0 };
        StringBuilder nm = new StringBuilder(); for (int[] r : R) nm.append(nm.length() > 0 ? " · " : "").append(r[0]).append('p');
        progress(tid, job, 5, "HLS 변환(" + nm + ")");
        run(ffArgs(src.toString(), out, R, hasAudio, ts, te), 4 * 3600_000L, l -> { Matcher mm = OUT_US.matcher(l); if (mm.find() && System.currentTimeMillis() - last[0] > 2000) { last[0] = System.currentTimeMillis(); int p = (int) Math.min(90, 5 + Math.round(85 * (Long.parseLong(mm.group(1)) / 1e6) / total)); progress(tid, job, p, "HLS 변환"); } });
        try { run(List.of(env("FFMPEG", "ffmpeg"), "-hide_banner", "-y", "-nostdin", "-ss", num(Math.min(1, total / 2) + (ts == null ? 0 : ts)), "-i", src.toString(), "-frames:v", "1", "-vf", "scale=-2:360", out.resolve("poster.jpg").toString()), 120_000, null); } catch (Exception ignore) { }
        if (hasAudio) {
            Files.createDirectories(out.resolve("stt")); List<String> c = new ArrayList<>(List.of(env("FFMPEG", "ffmpeg"), "-hide_banner", "-y", "-nostdin"));
            if (ts != null) { c.add("-ss"); c.add(num(ts)); } c.add("-i"); c.add(src.toString()); if (te != null) { c.add("-t"); c.add(num(total)); }
            c.addAll(List.of("-vn", "-ac", "1", "-ar", "16000", "-c:a", "aac", "-b:a", "48k", out.resolve("stt").resolve("audio.m4a").toString()));
            run(c, 4 * 3600_000L, null);
        }
        progress(tid, job, 92, "저장소에 올리는 중");
        List<String> files = new ArrayList<>();
        try (Stream<Path> s = Files.walk(out)) { s.filter(Files::isRegularFile).forEach(f -> files.add(out.relativize(f).toString().replace(File.separatorChar, '/'))); }
        files.sort(Comparator.naturalOrder());
        String used = "db";
        for (int i = 0; i < files.size(); i += 20) {
            final List<String> part = files.subList(i, Math.min(files.size(), i + 20));
            String k = tx.inTenant(tid, () -> { String u = null; for (String p : part) { String ext = p.substring(p.lastIndexOf('.'));
                String mime = switch (ext) { case ".m3u8" -> "application/vnd.apple.mpegurl"; case ".ts" -> "video/mp2t"; case ".jpg" -> "image/jpeg"; case ".m4a" -> "audio/mp4"; default -> "application/octet-stream"; };
                String r = store.put(tid, mid, p, Files.readAllBytes(out.resolve(p)), mime, ".m3u8".equals(ext) || ".jpg".equals(ext)); if (".ts".equals(ext)) u = r; } return u; });
            if (k != null) used = k;
        }
        int ph = R.get(R.size() - 1)[0]; double vw = vs.path("width").asDouble(0), vh = vs.path("height").asDouble(0);
        ObjectNode a = o(); a.put("job_id", job); a.put("duration_sec", Math.round(total * 1000) / 1000.0);
        if (vw > 0 && vh > 0) a.put("width", even(vw * ph / vh)); else a.putNull("width");
        a.put("height", ph); a.put("has_audio", hasAudio); a.put("storage", used);
        ArrayNode rn = a.putArray("renditions"); for (int[] r : R) { ObjectNode x = rn.addObject(); x.put("name", r[0] + "p"); x.put("height", r[0]); x.put("kbps", r[1]); }
        return call(tid, "lms_v_w_transcoded", a);
    }

    JsonNode stt(String tid, JsonNode J, Path tmp) throws Exception {
        String cmd = env("MEDIA_STT_CMD", "").trim(); String lang = J.path("lang").asText("ko"); String mid = J.path("media_id").asText(), job = J.path("job_id").asText();
        boolean audio = J.path("has_audio").asBoolean(false);
        ObjectNode a = o(); a.put("job_id", job);
        if (cmd.isEmpty() || !audio) { a.put("engine", audio ? "demo" : "none"); a.put("vtt", ""); return call(tid, "lms_v_w_stt", a); }
        progress(tid, job, 10, "음성 인식");
        String st = tx.inTenant(tid, () -> m.selectStore(mid, "stt/audio.m4a"));
        if (st == null) { a.put("engine", "none"); a.put("vtt", ""); return call(tid, "lms_v_w_stt", a); }
        Path f = tmp.resolve("audio.m4a"); byte[] b = tx.inTenant(tid, () -> store.get(tid, mid, "stt/audio.m4a", st)); Files.write(f, b);
        String vtt = run(List.of(cmd, f.toString(), lang), 3 * 3600_000L, null);
        String eng = env("MEDIA_STT_ENGINE", new File(cmd).getName()); a.put("engine", eng.length() > 40 ? eng.substring(0, 40) : eng); a.put("vtt", vtt);
        return call(tid, "lms_v_w_stt", a);
    }

    boolean one() throws Exception {
        Map<String, Object> q = tx.plain(() -> m.claim(wid)); if (q == null) return false;
        String tid = (String) q.get("tenant_id"), jid = String.valueOf(q.get("job_id"));
        ObjectNode a = o(); a.put("job_id", jid); JsonNode J;
        try { J = call(tid, "lms_v_w_job", a); } catch (Exception e) { log.error("media job {}", e.getMessage()); J = null; }
        if (J == null || J.isNull()) { tx.plain(() -> m.deleteQ(jid)); return true; }
        Path tmp = Files.createTempDirectory(Path.of(env("MEDIA_TMP", System.getProperty("java.io.tmpdir"))), "ddmedia-");
        try { if ("transcode".equals(J.path("kind").asText())) transcode(tid, J, tmp); else stt(tid, J, tmp); }
        catch (Exception e) { log.warn("media job fail {} {}", J.path("kind").asText(), e.getMessage()); ObjectNode f = o(); f.put("job_id", jid); String msg = String.valueOf(e.getMessage()); f.put("error", msg.length() > 400 ? msg.substring(0, 400) : msg); try { call(tid, "lms_v_w_fail", f); } catch (Exception ignore) { } }
        finally { try (Stream<Path> s = Files.walk(tmp)) { s.sorted(Comparator.reverseOrder()).forEach(x -> x.toFile().delete()); } catch (Exception ignore) { } }
        return true;
    }

    /** x2 실시간 수업 음성(lms_live_cap_audio, hook lmsVodSubtitleJob): 30초마다 기관별로 하나씩 — Node live()와 같다 */
    private long lastLive = 0;
    void live() throws Exception {
        if (System.currentTimeMillis() - lastLive < 30000) return; lastLive = System.currentTimeMillis();
        for (String t : tx.plain(m::univTenants)) {
            JsonNode J; try { J = call(t, "lms_v_w_live_claim", o()); } catch (Exception e) { J = null; }
            if (J == null || J.isNull()) continue;
            String jid = J.path("job_id").asText(); Path tmp = Files.createTempDirectory(Path.of(env("MEDIA_TMP", System.getProperty("java.io.tmpdir"))), "ddlive-");
            try {
                Path f = tmp.resolve("audio");
                try (OutputStream os = Files.newOutputStream(f)) { for (JsonNode id : J.path("file_ids")) { final String fid = id.asText(); Map<String, Object> r = tx.inTenant(t, () -> m.selectFile(fid)); if (r == null || r.get("data") == null) throw new IllegalStateException("음성 조각이 없습니다"); os.write((byte[]) r.get("data")); } }
                double dur = 30; try { dur = DdWeb.JSON.readTree(run(List.of(env("FFPROBE", "ffprobe"), "-v", "error", "-print_format", "json", "-show_format", f.toString()), 60_000, null)).path("format").path("duration").asDouble(30); } catch (Exception ignore) { }
                String cmd = env("MEDIA_STT_CMD", "").trim(); ObjectNode a = o(); a.put("job_id", jid);
                if (cmd.isEmpty()) { a.put("engine", "demo"); a.put("duration_sec", dur); }
                else { String eng = env("MEDIA_STT_ENGINE", new File(cmd).getName()); a.put("engine", eng.length() > 40 ? eng.substring(0, 40) : eng); a.put("vtt", run(List.of(cmd, f.toString(), J.path("lang").asText("ko")), 3 * 3600_000L, null)); }
                call(t, "lms_v_w_live_done", a);
            } catch (Exception e) { ObjectNode a = o(); a.put("job_id", jid); a.put("error", String.valueOf(e.getMessage())); try { call(t, "lms_v_w_live_done", a); } catch (Exception ignore) { } }
            finally { try (Stream<Path> s = Files.walk(tmp)) { s.sorted(Comparator.reverseOrder()).forEach(x -> x.toFile().delete()); } catch (Exception ignore) { } }
        }
    }

    @Scheduled(fixedDelayString = "${MEDIA_POLL_MS:3000}", initialDelay = 2000)
    public void tick() {
        if (!on() || !busy.compareAndSet(false, true)) return;
        try { for (int i = 0; i < 4 && one(); i++) { } live(); }
        catch (Exception e) { if (!String.valueOf(e.getMessage()).contains("does not exist")) log.warn("media worker {}", e.getMessage()); }
        finally { busy.set(false); }
    }
    /** 마침 · 자막 요청 직후 대기열을 바로 깨운다 */
    public void kick() { if (on()) new Thread(this::tick, "media-kick").start(); }

    @Scheduled(fixedDelay = 3600_000L, initialDelay = 60_000L)
    public void purge() {
        if (!on()) return;
        try {
            for (String t : tx.plain(m::univTenants)) {
                try { JsonNode r = call(t, "lms_v_w_purge", o()); for (JsonNode x : r.path("purged")) if (!"db".equals(x.path("storage").asText())) store.drop(t, x.path("media_id").asText()); } catch (Exception ignore) { }
            }
        } catch (Exception e) { log.warn("media purge {}", e.getMessage()); }
    }
}
