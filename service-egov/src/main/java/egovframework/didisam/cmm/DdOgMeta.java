package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.didisam.pub.service.impl.PubMapper;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * v37 L2 링크 공유 미리보기(og 메타) — Node service/server/ogmeta.js와 같은 결과 바이트.
 * learner.html을 내보낼 때 게시본(lsite.pub.hp)의 제목 · 설명 · 공유 이미지를 HTML 머리에 넣는다(미리보기 크롤러는 스크립트를 실행하지 않음).
 *  - 게시본이 없거나 기관 번호가 없으면 원본 그대로 · 이미지는 https 주소만 · 검색 노출을 켠 사이트만 robots를 index,follow로
 */
@Component
public class DdOgMeta {
    public static final Pattern TID_RE = Pattern.compile("tn_[a-z0-9]{8,16}");
    static final Pattern CTRL = Pattern.compile("[\\u0000-\\u001f\\u007f\\u2028\\u2029]+");
    /** JS 정규식 \s와 같은 문자 집합 */
    static final Pattern WS = Pattern.compile("[\\t\\n\\u000b\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]+");
    static final Pattern IMG_RE = Pattern.compile("https://[^\\s\"'<>\\\\]{4,990}");
    static final Pattern TITLE = Pattern.compile("<title>[^<]*</title>");
    static final ObjectMapper JSON = new ObjectMapper();

    private final PubMapper mapper; private final TenantTx tx;
    public DdOgMeta(PubMapper mapper, TenantTx tx) { this.mapper = mapper; this.tx = tx; }

    public record Fields(String name, String title, String desc, String img, boolean index) { }

    static String one(String v, int n) {
        String s = WS.matcher(CTRL.matcher(v == null ? "" : v).replaceAll(" ")).replaceAll(" ");
        if (s.startsWith(" ")) s = s.substring(1); if (s.endsWith(" ")) s = s.substring(0, s.length() - 1);
        return s.length() > n ? s.substring(0, n) : s;
    }
    static String attr(String s) { return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;"); }
    static String txt(JsonNode n) { return n == null || n.isNull() || n.isMissingNode() ? "" : n.isTextual() ? n.textValue() : n.isValueNode() ? n.asText() : ""; }

    /** 게시본 값 뽑기(Node ogFields: 제목 = seo.title || 사이트 이름) */
    public static Fields fields(JsonNode seo, String hpName, JsonNode org) {
        String n0 = hpName != null && !hpName.isEmpty() ? hpName : org != null && org.isObject() ? txt(org.get("name")) : "";
        String name = one(n0, 80); String title = one(seo != null && seo.isObject() ? txt(seo.get("title")) : "", 120); if (title.isEmpty()) title = name; if (title.isEmpty()) return null;
        JsonNode im = seo != null && seo.isObject() ? seo.get("img") : null; String img = im != null && im.isTextual() && IMG_RE.matcher(im.textValue()).matches() ? im.textValue() : "";
        JsonNode ix = seo != null && seo.isObject() ? seo.get("index") : null; boolean index = !(ix != null && ix.isBoolean() && !ix.booleanValue());
        return new Fields(name, title, one(seo != null && seo.isObject() ? txt(seo.get("desc")) : "", 300), img, index);
    }

    public static String inject(String html, Fields f) {
        if (f == null || html == null || html.indexOf("</head>") < 0) return html;
        String[][] T = { { "property", "og:type", "website" }, { "property", "og:site_name", f.name() }, { "property", "og:title", f.title() }, { "property", "og:description", f.desc() }, { "property", "og:image", f.img() },
            { "name", "twitter:card", f.img().isEmpty() ? "summary" : "summary_large_image" }, { "name", "twitter:title", f.title() }, { "name", "twitter:description", f.desc() }, { "name", "description", f.desc() } };
        List<String> L = new ArrayList<>(); for (String[] x : T) if (!x[2].isEmpty()) L.add("<meta " + x[0] + "=\"" + x[1] + "\" content=\"" + attr(x[2]) + "\">");
        Matcher m = TITLE.matcher(html); String h = m.find() ? html.substring(0, m.start()) + "<title>" + attr(f.title()) + "</title>" + html.substring(m.end()) : html;
        if (f.index()) { String a = "<meta name=\"robots\" content=\"noindex,nofollow\">"; int i = h.indexOf(a); if (i >= 0) h = h.substring(0, i) + "<meta name=\"robots\" content=\"index,follow\">" + h.substring(i + a.length()); }
        int i = h.indexOf("</head>"); return h.substring(0, i) + "<!-- og: 게시본 -->\n" + String.join("\n", L) + "\n" + h.substring(i);
    }

    /** ?t=<기관> 또는 학습자 모듈 기본 기관 */
    public static String tidOf(String t, String fallback) { String v = t != null && TID_RE.matcher(t).matches() ? t : fallback == null ? "" : fallback; return TID_RE.matcher(v).matches() ? v : ""; }

    /** learner.html 바이트에 게시본 og를 넣는다(실패하면 원본) */
    public byte[] page(byte[] file, String tid) {
        if (tid.isEmpty()) return file;
        try {
            Map<String, Object> r = tx.inTenant(tid, () -> mapper.selectOg(tid));
            if (r == null || (r.get("seo") == null && r.get("name") == null && r.get("org") == null)) return file;
            JsonNode seo = r.get("seo") == null ? null : JSON.readTree((String) r.get("seo")); JsonNode org = r.get("org") == null ? null : JSON.readTree((String) r.get("org"));
            Fields f = fields(seo, (String) r.get("name"), org); if (f == null) return file;
            return inject(new String(file, StandardCharsets.UTF_8), f).getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) { return file; }
    }
}
