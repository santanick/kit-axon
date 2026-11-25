package egovframework.didisam.bench.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.didisam.cmm.DdException;
import java.net.InetAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** qa7 d5 · YouTube 제목 서버 프록시(GET /api/oembed?url=) — Node service/server/oembed.js와 같은 판정 · 같은 오류 코드 · 같은 응답
 *  youtube.com · www/m.youtube.com · youtu.be만 · 영상 id(11자) → www.youtube.com/oembed 고정 요청 · DdBench SSRF 가드(사설 IP 차단 · IP 고정 연결)
 *  응답 title · thumbnail_url만 · 10분 캐시(최대 500) · 시험 모드 OEMBED_MOCK=1(운영 NODE_ENV=production 무시) */
public final class DdOembed {
    static final Set<String> HOSTS = Set.of("youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be");
    static final long TTL = 10 * 60_000L; static final int CAP = 500, MAX = 64 * 1024, TIMEOUT = 5000;
    static final Pattern ID = Pattern.compile("^[\\w-]{11}$"), SUB = Pattern.compile("^/(?:shorts|embed|live|v)/([^/]+)"), THUMB = Pattern.compile("^https://i\\d?\\.ytimg\\.com/[\\w./-]{1,200}$");
    static final ObjectMapper OM = new ObjectMapper();
    private final boolean mock;
    private final Map<String, Object[]> cache = new LinkedHashMap<>(16, 0.75f, false);
    public DdOembed(boolean prod) { this.mock = "1".equals(System.getenv("OEMBED_MOCK")) && !prod; }

    static DdException bad(int st, String code, String msg) { return new DdException(st, msg, code); }
    public static String idOf(String raw) {
        raw = raw == null ? "" : raw.trim();
        if (raw.isEmpty() || raw.length() > 500) throw bad(400, "bad_url", "YouTube 영상 주소를 넣어 주십시오.");
        URI u; try { u = new URI(raw); } catch (Exception e) { throw bad(400, "bad_url", "YouTube 영상 주소를 넣어 주십시오."); }
        String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase(Locale.ROOT);
        int port = u.getPort();
        if ((!"https".equals(sc) && !"http".equals(sc)) || u.getRawUserInfo() != null || (port != -1 && port != 443 && port != 80)) throw bad(400, "bad_url", "YouTube 영상 주소를 넣어 주십시오.");
        String h = u.getHost() == null ? "" : u.getHost().toLowerCase(Locale.ROOT);
        if (!HOSTS.contains(h)) throw bad(400, "not_youtube", "YouTube(youtube.com · youtu.be) 주소만 제목을 읽을 수 있습니다.");
        String path = u.getRawPath() == null ? "" : u.getRawPath(), id = "";
        if ("youtu.be".equals(h)) { String[] p = path.split("/", -1); id = p.length > 1 ? p[1] : ""; }
        else if ("/watch".equals(path)) { String q = u.getRawQuery() == null ? "" : u.getRawQuery();
            for (String kv : q.split("&")) { int i = kv.indexOf('='); String k = i < 0 ? kv : kv.substring(0, i); if ("v".equals(k)) { id = i < 0 ? "" : java.net.URLDecoder.decode(kv.substring(i + 1), StandardCharsets.UTF_8); break; } } }
        else { Matcher m = SUB.matcher(path); id = m.find() ? m.group(1) : ""; }
        if (!ID.matcher(id).matches()) throw bad(400, "bad_url", "YouTube 영상 주소에서 영상 번호를 찾지 못했습니다.");
        return id;
    }
    Map<String, Object> fetchOne(String id) throws Exception {
        Map<String, Object> out = new LinkedHashMap<>();
        if (mock) { out.put("title", "시험 영상 " + id); out.put("thumbnail_url", "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"); return out; }
        long deadline = System.currentTimeMillis() + TIMEOUT;
        DdBench.Url u = DdBench.checkUrl("https://www.youtube.com/oembed?format=json&url=" + URLEncoder.encode("https://www.youtube.com/watch?v=" + id, StandardCharsets.UTF_8));
        InetAddress addr = DdBench.resolveSafe(u);
        DdBench.Resp r;
        try { r = DdBench.get(u, addr, deadline); } catch (Exception e) { throw bad(502, "fetch", "YouTube에 연결하지 못했습니다. 제목을 직접 입력해 주십시오."); }
        try {
            if (r.status() != 200) throw bad(404, "not_found", "영상 정보를 찾지 못했습니다(비공개 · 삭제된 영상일 수 있습니다). 제목을 직접 입력해 주십시오.");
            JsonNode j;
            try { j = OM.readTree(new String(DdBench.readCapped(r.body(), MAX, r.sock(), deadline).buf(), StandardCharsets.UTF_8)); } catch (Exception e) { throw bad(502, "fetch", "영상 정보를 읽지 못했습니다. 제목을 직접 입력해 주십시오."); }
            String t = j != null && j.hasNonNull("title") ? j.get("title").asText("") : "";
            t = t.replaceAll("\\s+", " ").trim(); if (t.codePointCount(0, t.length()) > 200) t = t.substring(0, t.offsetByCodePoints(0, 200));
            String th = j != null && j.get("thumbnail_url") != null && j.get("thumbnail_url").isTextual() ? j.get("thumbnail_url").textValue() : "";
            out.put("title", t); out.put("thumbnail_url", THUMB.matcher(th).matches() ? th : ""); return out;
        } finally { try { r.sock().close(); } catch (Exception ignore) { } }
    }
    public Map<String, Object> lookup(String raw) throws Exception {
        String id = idOf(raw);
        synchronized (cache) { Object[] hit = cache.get(id); if (hit != null && System.currentTimeMillis() - (Long) hit[1] < TTL) return new LinkedHashMap<>(castMap(hit[0])); }
        Map<String, Object> v;
        try { v = fetchOne(id); } catch (DdException e) { throw e; } catch (DdBench.Bad e) { throw bad(e.status, e.code, "YouTube에 연결하지 못했습니다. 제목을 직접 입력해 주십시오."); } catch (Exception e) { throw bad(502, "fetch", "YouTube에 연결하지 못했습니다. 제목을 직접 입력해 주십시오."); }
        synchronized (cache) { cache.remove(id); cache.put(id, new Object[]{ v, System.currentTimeMillis() }); while (cache.size() > CAP) cache.remove(cache.keySet().iterator().next()); }
        return new LinkedHashMap<>(v);
    }
    @SuppressWarnings("unchecked") static Map<String, Object> castMap(Object o) { return (Map<String, Object>) o; }
}
