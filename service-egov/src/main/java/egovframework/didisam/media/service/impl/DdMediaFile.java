package egovframework.didisam.media.service.impl;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * v35 강의 파일(/api/media/f) 형식 판정 — Node service/server/mediafile.js와 같은 규칙.
 * 확장자로 종류를 고르고 시그니처(앞부분) · ZIP 끝 목록(뒷부분)으로 확인한다. 매크로(vbaProject.bin)가 든 Office 문서는 받지 않는다.
 */
public final class DdMediaFile {
    private DdMediaFile() { }
    public static final long MB = 1024L * 1024L;
    /** 확장자 → { mime, 종류 } */
    public static final Map<String, String[]> TYPES = Map.of(
        "pdf", new String[]{"application/pdf", "doc"},
        "pptx", new String[]{"application/vnd.openxmlformats-officedocument.presentationml.presentation", "doc"},
        "docx", new String[]{"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "doc"},
        "hwp", new String[]{"application/x-hwp", "doc"},
        "hwpx", new String[]{"application/hwp+zip", "doc"},
        "mp4", new String[]{"video/mp4", "video"},
        "webm", new String[]{"video/webm", "video"},
        "mp3", new String[]{"audio/mpeg", "audio"},
        "m4a", new String[]{"audio/mp4", "audio"});
    public static final Map<String, String> KIND_KO = Map.of("doc", "문서", "video", "영상", "audio", "음성");
    public static final String LIST = "PDF · PPTX · DOCX · HWP · HWPX 문서, MP4 · WEBM 영상, MP3 · M4A 음성";
    public static final Pattern FILE_PATH = Pattern.compile("^/api/media/f/([^/]+)\\z");
    public static final Pattern DONE_PATH = Pattern.compile("^/api/media/f/([^/]+)/done\\z");
    public static final String FILE_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";
    public static final String PDF_CSP = "frame-ancestors 'self'";
    static final Set<String> INLINE = Set.of("pdf", "mp4", "webm", "mp3", "m4a");
    static final Map<String, String> ZIP_NEED = Map.of("pptx", "ppt/presentation.xml", "docx", "word/document.xml", "hwpx", "Contents/");
    public static final int TAIL = (int) MB;

    public static final class Ft { public final String ext, mime, type; Ft(String e, String m, String t) { ext = e; mime = m; type = t; } }
    static final Pattern EXT = Pattern.compile("\\.([A-Za-z0-9]{2,5})$");
    /** 파일 이름 → 종류(모르면 null) */
    public static Ft fileType(String name) {
        Matcher m = EXT.matcher(DdMedia.jsTrim(name == null ? "" : name)); if (!m.find()) return null;
        String ext = m.group(1).toLowerCase(java.util.Locale.ROOT); String[] t = TYPES.get(ext); return t == null ? null : new Ft(ext, t[0], t[1]);
    }
    static final Pattern BAD_CH = Pattern.compile("[\\u0000-\\u001f\\u007f<>\"'&\\\\/:*?|]");
    static final Pattern SPACES = Pattern.compile("[ \\u00a0\\u3000]+");
    /** Node cleanFileName과 같음: 위험 문자 제거 · 공백 정리 · 80자(확장자 유지) */
    public static String cleanFileName(String name, String ext) {
        String s = DdMedia.jsTrim(SPACES.matcher(BAD_CH.matcher(name == null ? "" : name).replaceAll("")).replaceAll(" "));
        String base = DdMedia.jsTrim(EXT.matcher(s).replaceFirst("")); if (base.isEmpty()) base = "파일";
        int max = 80 - ext.length() - 1; if (base.length() > max) base = base.substring(0, max);
        return base + "." + ext;
    }
    static String lat(byte[] b, int s, int e) { e = Math.min(e, b.length); return s >= e ? "" : new String(b, s, e - s, StandardCharsets.ISO_8859_1); }
    static boolean isZip(byte[] b) { return b.length >= 4 && b[0] == 0x50 && b[1] == 0x4b && b[2] == 0x03 && b[3] == 0x04; }
    static boolean isFtyp(byte[] b) { return b.length >= 12 && "ftyp".equals(lat(b, 4, 8)); }
    /** 앞부분(첫 조각) 시그니처 */
    public static boolean headOk(String ext, byte[] b) {
        switch (ext) {
            case "pdf": return lat(b, 0, 1024).contains("%PDF-");
            case "pptx": case "docx": return isZip(b);
            case "hwpx": return isZip(b) && "mimetype".equals(lat(b, 30, 38)) && lat(b, 0, 200).contains("application/hwp+zip");
            case "hwp": return b.length >= 8 && DdMedia.u32be(b, 0) == 0xd0cf11e0L && DdMedia.u32be(b, 4) == 0xa1b11ae1L;
            case "mp4": case "m4a": return isFtyp(b) && !"qt  ".equals(lat(b, 8, 12));
            case "webm": return b.length >= 4 && DdMedia.u32be(b, 0) == 0x1a45dfa3L && lat(b, 0, 64).contains("webm");
            case "mp3": return "ID3".equals(lat(b, 0, 3)) || (b.length >= 2 && (b[0] & 0xff) == 0xff && (b[1] & 0xe0) == 0xe0);
            default: return false;
        }
    }
    static final Pattern VBA = Pattern.compile("vbaProject\\.bin", Pattern.CASE_INSENSITIVE);
    /** 뒷부분(마지막 1MB) — 문제 없으면 null, 있으면 { 문구, 코드 } */
    public static String[] tailErr(String ext, byte[] t) {
        String need = ZIP_NEED.get(ext); if (need == null) return null;
        String s = new String(t, StandardCharsets.ISO_8859_1); int eocd = s.lastIndexOf("PK\u0005\u0006");
        if (eocd < 0) return new String[]{"파일이 손상되었거나 끝까지 올라가지 않았습니다.", "media_bad"};
        String cd = s.substring(0, eocd);
        if (VBA.matcher(cd).find()) return new String[]{"매크로가 들어 있는 문서는 올릴 수 없습니다. 매크로 없이 다시 저장해 주세요.", "media_macro"};
        if (!cd.contains(need)) return new String[]{ext.toUpperCase(java.util.Locale.ROOT) + " 문서가 아닙니다. 파일 형식을 확인해 주세요.", "media_type"};
        return null;
    }
    /** JS encodeURIComponent */
    static String encodeURIComponent(String s) {
        StringBuilder o = new StringBuilder();
        for (byte x : s.getBytes(StandardCharsets.UTF_8)) {
            int c = x & 0xff;
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || "-_.!~*'()".indexOf(c) >= 0) o.append((char) c);
            else o.append('%').append(String.format("%02X", c));
        }
        return o.toString();
    }
    public static String disposition(String name, String ext, boolean dl) {
        String kind = dl || !INLINE.contains(ext) ? "attachment" : "inline";
        String ascii = name.replaceAll("[^\\x20-\\x7e]", "_").replaceAll("[%;\\\\]", "_");
        return kind + "; filename=\"" + ascii + "\"; filename*=UTF-8''" + encodeURIComponent(name);
    }
    static final Pattern RANGE = Pattern.compile("^bytes=(\\d*)-(\\d*)$");
    /** Range → {start, end} | null(전체) | {-1, -1}(416). Node parseRange와 같음 */
    public static long[] parseRange(String h, long size) {
        if (h == null || h.isEmpty()) return null;
        Matcher m = RANGE.matcher(DdMedia.jsTrim(h)); if (!m.matches()) return h.contains(",") ? null : new long[]{-1, -1};
        long a, b;
        try {
            if (m.group(1).isEmpty()) { if (m.group(2).isEmpty()) return new long[]{-1, -1}; long n = Long.parseLong(m.group(2)); if (n == 0) return new long[]{-1, -1}; a = Math.max(0, size - n); b = size - 1; }
            else { a = Long.parseLong(m.group(1)); b = m.group(2).isEmpty() ? size - 1 : Math.min(Long.parseLong(m.group(2)), size - 1); }
        } catch (NumberFormatException e) { return new long[]{-1, -1}; }
        if (a < 0 || a >= size || b < a) return new long[]{-1, -1};
        return new long[]{a, b};
    }
    public static String mbText(long b) { return b >= 1024 * MB ? fmt(Math.round(b / (double) (1024 * MB) * 10) / 10.0) + "GB" : Math.round(b / (double) MB) + "MB"; }
    static String fmt(double v) { return v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v); }
}
