package egovframework.didisam.lms.v.service.impl;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/**
 * v32 미디어 저장소 어댑터 — Node lms/media/store.js와 같은 규칙.
 * MEDIA_STORE = db(기본, lms_media_obj.data) | disk(MEDIA_DIR, 기본 /var/tmp/didisam-media) | gcs(운영 연결 지점: Java 에디션은 GCS 라이브러리를 넣지 않았으므로 오류로 알린다)
 * 키: &lt;기관&gt;/&lt;영상&gt;/&lt;경로&gt;. 재생목록 · 표지는 항상 db. 호출은 기관 범위 트랜잭션(TenantTx.inTenant) 안에서 한다.
 */
@Component
public class LmsVStore {
    static final Pattern PART = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    static final Pattern PATH = Pattern.compile("^[A-Za-z0-9_./-]{1,120}$");
    private final LmsVMapper m;
    public LmsVStore(LmsVMapper m) { this.m = m; }

    public static String kind() { String k = System.getenv("MEDIA_STORE"); return "disk".equals(k) || "gcs".equals(k) ? k : "db"; }
    static Path dir() { String d = System.getenv("MEDIA_DIR"); return Path.of(d == null || d.isEmpty() ? "/var/tmp/didisam-media" : d).toAbsolutePath(); }
    static Path file(String tid, String mid, String p) {
        if (!PART.matcher(tid).matches() || !PART.matcher(mid).matches() || !PATH.matcher(p).matches() || p.contains("..")) throw new IllegalArgumentException("bad key");
        return dir().resolve(tid).resolve(mid).resolve(p);
    }
    public String put(String tid, String mid, String p, byte[] buf, String mime, boolean forceDb) throws Exception {
        String k = forceDb ? "db" : kind();
        if ("disk".equals(k)) { Path f = file(tid, mid, p); Files.createDirectories(f.getParent()); Files.write(f, buf); }
        else if ("gcs".equals(k)) throw new IllegalStateException("MEDIA_STORE=gcs는 Node 운영 이미지에서 지원합니다(Java 에디션: db · disk).");
        m.putObj(mid, p, mime, buf.length, k, "db".equals(k) ? buf : null);
        return k;
    }
    public byte[] get(String tid, String mid, String p, String store) throws Exception {
        if ("disk".equals(store)) return Files.readAllBytes(file(tid, mid, p));
        if ("gcs".equals(store)) throw new IllegalStateException("gcs 저장소 객체는 Java 에디션에서 읽을 수 없습니다.");
        byte[] b = m.data(mid, p); return b == null ? new byte[0] : b;
    }
    public void drop(String tid, String mid) {
        if (!"disk".equals(kind()) || !PART.matcher(tid).matches() || !PART.matcher(mid).matches()) return;
        Path d = dir().resolve(tid).resolve(mid); if (!Files.exists(d)) return;
        try (Stream<Path> s = Files.walk(d)) { s.sorted(Comparator.reverseOrder()).forEach(x -> { try { Files.deleteIfExists(x); } catch (Exception ignore) { } }); } catch (Exception ignore) { }
    }
}
