package egovframework.didisam.media.service.impl;

import egovframework.didisam.cmm.DdException;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 홈페이지 이미지 형식 판정 · 메타데이터 제거 · SVG 정화 — Node service/server/media.js prepare()와 같은 규칙 · 같은 결과 바이트(→ 같은 id).
 * PNG: eXIf · tEXt · zTXt · iTXt · tIME 청크 제거 / JPEG: APP1 · APP3~13 · APP15 · COM 제거 / WEBP: EXIF · XMP 청크 제거 + VP8X 비트 · RIFF 크기 보정
 * SVG: DOCTYPE · ENTITY 거부, script · foreignObject 등 제거, on* · 외부 참조 · 위험 CSS 제거
 */
public final class DdMedia {
    private DdMedia() { }
    public static final int MAX = 2 * 1024 * 1024;
    public static final Pattern ID_RE = Pattern.compile("^(tn_[a-z0-9]{8,16})\\.([a-f0-9]{40})$");
    public static final String CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";

    public static final class Out { public String mime; public byte[] buf; public Integer w, h; public String hash; }
    static final class Img { byte[] buf; Integer w, h; Img(byte[] b, Integer w, Integer h) { buf = b; this.w = w; this.h = h; } }

    static DdException bad() { return new DdException(400, "이미지 파일이 손상되었거나 읽을 수 없습니다.", "media_bad"); }
    static DdException bad(String msg, String code) { return new DdException(400, msg, code); }
    public static DdException tooLarge() { return new DdException(413, "이미지는 2MB 이하만 올릴 수 있습니다.", "too_large"); }

    static int u8(byte[] b, int p) { return b[p] & 0xff; }
    static long u32be(byte[] b, int p) { return ((long) u8(b, p) << 24) | (u8(b, p + 1) << 16) | (u8(b, p + 2) << 8) | u8(b, p + 3); }
    static int u16be(byte[] b, int p) { return (u8(b, p) << 8) | u8(b, p + 1); }
    static long u32le(byte[] b, int p) { return ((long) u8(b, p + 3) << 24) | (u8(b, p + 2) << 16) | (u8(b, p + 1) << 8) | u8(b, p); }
    static int u24le(byte[] b, int p) { return (u8(b, p + 2) << 16) | (u8(b, p + 1) << 8) | u8(b, p); }
    static int u16le(byte[] b, int p) { return (u8(b, p + 1) << 8) | u8(b, p); }
    static String latin(byte[] b, int s, int e) { return new String(b, s, e - s, StandardCharsets.ISO_8859_1); }

    /** Node TextDecoder('utf-8', {fatal: true}): 잘못된 바이트면 null, 맨 앞 BOM 하나는 지운다 */
    static String utf8(byte[] b) {
        try {
            String s = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(b)).toString();
            return s.startsWith("\uFEFF") ? s.substring(1) : s;
        } catch (CharacterCodingException e) { return null; }
    }

    static final Pattern SVG_HEAD = Pattern.compile("<svg[\\s>/]", Pattern.CASE_INSENSITIVE);
    public static String sniff(byte[] b) {
        int n = b.length;
        if (n >= 8 && u8(b, 0) == 0x89 && b[1] == 0x50 && b[2] == 0x4e && b[3] == 0x47 && b[4] == 0x0d && b[5] == 0x0a && b[6] == 0x1a && b[7] == 0x0a) return "image/png";
        if (n >= 3 && u8(b, 0) == 0xff && u8(b, 1) == 0xd8 && u8(b, 2) == 0xff) return "image/jpeg";
        if (n >= 16 && "RIFF".equals(latin(b, 0, 4)) && "WEBP".equals(latin(b, 8, 12))) return "image/webp";
        String t = utf8(b); if (t == null) return null;
        String s = t.startsWith("\uFEFF") ? t.substring(1) : t;
        if (!Pattern.compile("^\\s*<").matcher(s).find() || s.indexOf('\u0000') >= 0 || !SVG_HEAD.matcher(s.substring(0, Math.min(8192, s.length()))).find()) return null;
        return "image/svg+xml";
    }

    static final Set<String> PNG_DROP = Set.of("eXIf", "tEXt", "zTXt", "iTXt", "tIME");
    static Img cleanPng(byte[] b) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(); out.write(b, 0, 8);
        int p = 8; boolean first = true, end = false; long w = 0, h = 0;
        while ((long) p + 12 <= b.length) {
            long len = u32be(b, p); String type = latin(b, p + 4, p + 8); long e = p + 12 + len;
            if (len > b.length || e > b.length) throw bad();
            if (first) { if (!"IHDR".equals(type) || len < 8) throw bad(); w = u32be(b, p + 8); h = u32be(b, p + 12); first = false; }
            if (!PNG_DROP.contains(type)) out.write(b, p, (int) (e - p));
            p = (int) e; if ("IEND".equals(type)) { end = true; break; }
        }
        if (first || !end) throw bad();
        return new Img(out.toByteArray(), (int) w, (int) h);
    }

    static final Set<Integer> SOF = Set.of(0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf);
    static boolean jpegDrop(int m) { return m == 0xe1 || (m >= 0xe3 && m <= 0xef && m != 0xee) || m == 0xfe; }
    static Img cleanJpeg(byte[] b) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(); out.write(0xff); out.write(0xd8);
        int p = 2, w = 0, h = 0; boolean sos = false;
        while (p < b.length) {
            if (u8(b, p) != 0xff) throw bad();
            while (p < b.length && u8(b, p) == 0xff) p++;
            if (p >= b.length) throw bad();
            int m = u8(b, p); p++;
            if (m == 0xd9) { out.write(0xff); out.write(0xd9); break; }
            if (m == 0x01 || (m >= 0xd0 && m <= 0xd7)) { out.write(0xff); out.write(m); continue; }
            if (p + 2 > b.length) throw bad();
            int len = u16be(b, p); if (len < 2 || p + len > b.length) throw bad();
            if (SOF.contains(m)) { if (len < 7) throw bad(); h = u16be(b, p + 3); w = u16be(b, p + 5); }
            if (m == 0xda) { out.write(0xff); out.write(m); out.write(b, p, b.length - p); sos = true; break; }
            if (!jpegDrop(m)) { out.write(0xff); out.write(m); out.write(b, p, len); }
            p += len;
        }
        if (!sos || w == 0 || h == 0) throw bad();
        return new Img(out.toByteArray(), w, h);
    }

    static Img cleanWebp(byte[] b) {
        long size = u32le(b, 4); int total = (int) Math.min(b.length, size + 8); if (size < 4 || total < 20) throw bad();
        ByteArrayOutputStream body = new ByteArrayOutputStream(); int p = 12, w = 0, h = 0, xAt = -1, nChunks = 0;
        while (p + 8 <= total) {
            String cc = latin(b, p, p + 4); long len = u32le(b, p + 4); long e = p + 8 + len + (len & 1);
            if (p + 8 + len > total) throw bad();
            int ce = (int) Math.min(e, total); byte[] c = java.util.Arrays.copyOfRange(b, p, ce);
            if ("VP8X".equals(cc)) { if (len < 10) throw bad(); w = 1 + u24le(c, 12); h = 1 + u24le(c, 15); }
            else if ("VP8 ".equals(cc) && xAt < 0) { if (len < 10) throw bad(); w = u16le(c, 14) & 0x3fff; h = u16le(c, 16) & 0x3fff; }
            else if ("VP8L".equals(cc) && xAt < 0) { if (len < 5 || u8(c, 8) != 0x2f) throw bad(); long v = u32le(c, 9); w = (int) (v & 0x3fff) + 1; h = (int) ((v >>> 14) & 0x3fff) + 1; }
            if ("VP8X".equals(cc)) { xAt = body.size(); c[8] = (byte) (c[8] & ~0x0c); }
            if (!"EXIF".equals(cc) && !"XMP ".equals(cc)) { body.write(c, 0, c.length); nChunks++; }
            p = (int) e;
        }
        if (nChunks == 0 || w == 0 || h == 0) throw bad();
        byte[] bd = body.toByteArray(); ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes("RIFF".getBytes(StandardCharsets.ISO_8859_1)); long sz = bd.length + 4L;
        out.write((int) (sz & 0xff)); out.write((int) ((sz >> 8) & 0xff)); out.write((int) ((sz >> 16) & 0xff)); out.write((int) ((sz >> 24) & 0xff));
        out.writeBytes("WEBP".getBytes(StandardCharsets.ISO_8859_1)); out.writeBytes(bd);
        return new Img(out.toByteArray(), w, h);
    }

    /* ── SVG 정화: Node cleanSvg와 같은 순서 · 같은 정규식 ── */
    static final String SVG_DROP = "script|foreignObject|iframe|object|embed|audio|video|handler|listener|set|animate";
    static final int CI = Pattern.CASE_INSENSITIVE;
    static final Pattern RE_DECL = Pattern.compile("<!DOCTYPE|<!ENTITY", CI);
    static final Pattern RE_COMMENT = Pattern.compile("<!--[\\s\\S]*?-->");
    static final Pattern RE_CDATA = Pattern.compile("<!\\[CDATA\\[[\\s\\S]*?\\]\\]>");
    static final Pattern RE_PI = Pattern.compile("<\\?(?!xml\\s)[\\s\\S]*?\\?>");
    static final Pattern RE_PAIR = Pattern.compile("<(" + SVG_DROP + ")\\b[^>]*>[\\s\\S]*?</\\1\\s*>", CI);
    static final Pattern RE_LONE = Pattern.compile("</?(?:" + SVG_DROP + ")\\b[^>]*>", CI);
    static final Pattern RE_STYLE = Pattern.compile("<style\\b[^>]*>([\\s\\S]*?)</style\\s*>", CI);
    static final Pattern RE_TAG = Pattern.compile("<([A-Za-z][\\w:.-]*)((?:\\s+[^\\s=/>]+(?:\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s\"'>]+))?)*)\\s*(/?)>");
    static final Pattern RE_ATTR = Pattern.compile("\\s+([^\\s=/>]+)(?:\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s\"'>]+))?");
    static final Pattern CSS_BAD = Pattern.compile("(javascript:|expression\\s*\\(|@import|url\\s*\\(\\s*['\"]?\\s*(?!#))", CI);
    static final Pattern REF_OK = Pattern.compile("^(#[\\w.:-]*|data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\\s]*)$");
    static final Pattern JS_URL = Pattern.compile("(java|vb)script\\s*:", CI);
    static final Pattern FINAL_BAD = Pattern.compile("<\\s*script|javascript:|<[^>]*\\son[a-z]+\\s*=", CI);
    static final Pattern QUOTES = Pattern.compile("^[\"']|[\"']$");

    /** JS String.prototype.trim()과 같은 공백(ASCII + 유니코드 공백 · BOM) */
    static String jsTrim(String s) {
        int a = 0, e = s.length();
        while (a < e && jsSpace(s.charAt(a))) a++;
        while (e > a && jsSpace(s.charAt(e - 1))) e--;
        return s.substring(a, e);
    }
    static boolean jsSpace(char c) { return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == 0x0b || c == '\f' || c == 0xa0 || c == 0xfeff || c == 0x1680 || (c >= 0x2000 && c <= 0x200a) || c == 0x2028 || c == 0x2029 || c == 0x202f || c == 0x205f || c == 0x3000; }

    static Img cleanSvg(byte[] b) {
        String s = utf8(b); if (s == null) throw bad();
        if (s.startsWith("\uFEFF")) s = s.substring(1);
        if (RE_DECL.matcher(s).find()) throw bad("SVG에 DOCTYPE · ENTITY 선언은 쓸 수 없습니다.", "media_svg");
        s = RE_COMMENT.matcher(s).replaceAll(""); s = RE_CDATA.matcher(s).replaceAll(""); s = RE_PI.matcher(s).replaceAll("");
        for (int i = 0; i < 8; i++) { String n = RE_PAIR.matcher(s).replaceAll(""); if (n.equals(s)) break; s = n; }
        s = RE_LONE.matcher(s).replaceAll("");
        { Matcher m = RE_STYLE.matcher(s); StringBuilder sb = new StringBuilder(); while (m.find()) m.appendReplacement(sb, Matcher.quoteReplacement(CSS_BAD.matcher(m.group(1)).find() ? "" : m.group())); m.appendTail(sb); s = sb.toString(); }
        { Matcher m = RE_TAG.matcher(s); StringBuilder sb = new StringBuilder();
          while (m.find()) {
            String name = m.group(1), attrs = m.group(2) == null ? "" : m.group(2), slash = m.group(3);
            StringBuilder keep = new StringBuilder(); Matcher am = RE_ATTR.matcher(attrs);
            while (am.find()) {
                String a = am.group(), key = am.group(1).toLowerCase(java.util.Locale.ROOT), v = am.group(2);
                String val = v == null ? "" : QUOTES.matcher(v).replaceAll("");
                if (key.startsWith("on")) continue;
                if ("href".equals(key) || "xlink:href".equals(key) || "src".equals(key)) { if (!REF_OK.matcher(jsTrim(val)).find()) continue; }
                else if ("style".equals(key)) { if (CSS_BAD.matcher(val).find()) continue; }
                else if (JS_URL.matcher(val).find() || val.contains("&#")) continue;
                keep.append(a);
            }
            m.appendReplacement(sb, Matcher.quoteReplacement("<" + name + keep + (slash != null && !slash.isEmpty() ? " /" : "") + ">"));
          }
          m.appendTail(sb); s = sb.toString(); }
        s = jsTrim(s);
        if (!SVG_HEAD.matcher(s).find() || FINAL_BAD.matcher(s).find()) throw bad("SVG를 안전하게 정리하지 못했습니다.", "media_svg");
        return new Img(s.getBytes(StandardCharsets.UTF_8), null, null);
    }

    /** 바이트 → 형식 · 정리된 바이트 · 크기 · 내용 해시(sha256 앞 40자) */
    public static Out prepare(byte[] raw) throws Exception {
        if (raw == null || raw.length == 0) throw bad("이미지 파일을 보내 주세요.", "media_empty");
        if (raw.length > MAX) throw tooLarge();
        String mime = sniff(raw); if (mime == null) throw new DdException(415, "PNG · JPG · WEBP · SVG 이미지만 올릴 수 있습니다.", "media_type");
        Img o = "image/png".equals(mime) ? cleanPng(raw) : "image/jpeg".equals(mime) ? cleanJpeg(raw) : "image/webp".equals(mime) ? cleanWebp(raw) : cleanSvg(raw);
        Out r = new Out(); r.mime = mime; r.buf = o.buf; r.w = o.w; r.h = o.h;
        r.hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(o.buf)).substring(0, 40);
        return r;
    }
    /** Node cleanName: 제어 문자 · < > " ' & \ / 제거, 앞뒤 공백 제거, 80자 */
    public static String cleanName(String v) {
        String s = (v == null ? "" : v).replaceAll("[\\u0000-\\u001f<>\"'&\\\\/]", "");
        s = jsTrim(s); return s.length() > 80 ? s.substring(0, 80) : s;
    }
}
