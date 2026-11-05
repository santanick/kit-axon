package egovframework.didisam.bench.service.impl;

import java.io.*;
import java.net.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.net.ssl.*;
import egovframework.didisam.cmm.Js;

/**
 * 홈페이지 벤치마크 읽기 — Node bench.js와 같은 규칙(운영자 세션 전용).
 *  - https만 · 443 포트만 · 계정 정보가 든 주소 금지 · 내부/사설/루프백/링크로컬/멀티캐스트 IP 금지(SSRF)
 *  - DNS로 확인한 IP에 고정 연결(재바인딩 방지) — 인증서 · SNI는 원래 호스트 이름으로 검증
 *  - 리다이렉트 3번까지(매번 다시 검사) · 전체 10초 · 본문 2MB까지만 읽음 · HTML만
 *  - 스크립트 · 스타일 · 주석을 지우고 제목 · 설명 · 소제목 · 메뉴 · 섹션 글(앞부분) · 색만 돌려준다
 * 주소 해석은 WHATWG URL(Node new URL) 규칙 중 이 기능에 필요한 부분을 따른다(특수 스킴 슬래시 처리 · IPv4 숫자 표기 · IDN · 기본 포트 · 점 세그먼트).
 */
public final class DdBench {
    /** WHATWG Encoding(TextDecoder) 별칭 중 Java 이름이 다른 것 */
    static final Map<String, String> LABELS = Map.of("euc-kr", "x-windows-949", "ks_c_5601-1987", "x-windows-949", "korean", "x-windows-949", "iso-8859-1", "windows-1252", "latin1", "windows-1252", "ascii", "windows-1252", "us-ascii", "windows-1252", "x-sjis", "windows-31j", "shift_jis", "windows-31j", "gb2312", "GBK");
    public static final int MAX = 2 * 1024 * 1024; public static final int TIMEOUT = 10000; public static final int HOPS = 3;

    /** 업무 오류(상태 · 코드 · 메시지 키 구분, 인자) */
    public static final class Bad extends Exception {
        public final int status; public final String code; public final String variant; public final String arg;
        Bad(int status, String code, String variant) { this(status, code, variant, null); }
        Bad(int status, String code, String variant, String arg) { super(code); this.status = status; this.code = code; this.variant = variant; this.arg = arg; }
        public String key() { return "dd." + status + "." + code + (variant == null ? "" : "." + variant); }
    }

    /* ── IP 판정 ── */
    static boolean v4Private(int[] p) {
        int a = p[0], b = p[1], c = p[2];
        return a == 0 || a == 10 || a == 127 || (a == 100 && b >= 64 && b <= 127) || (a == 169 && b == 254) || (a == 172 && b >= 16 && b <= 31)
            || (a == 192 && b == 0 && (c == 0 || c == 2)) || (a == 192 && b == 168) || (a == 198 && (b == 18 || b == 19)) || (a == 198 && b == 51 && c == 100)
            || (a == 203 && b == 0 && c == 113) || a >= 224;
    }
    /** 16바이트(IPv6) 또는 4바이트(IPv4) 주소가 내부 주소인지(Node isPrivate와 같거나 더 엄격: ::a.b.c.d 호환 주소도 IPv4로 본다) */
    public static boolean isPrivate(byte[] ip) {
        if (ip == null) return true;
        if (ip.length == 4) return v4Private(new int[]{ ip[0] & 255, ip[1] & 255, ip[2] & 255, ip[3] & 255 });
        if (ip.length != 16) return true;
        int[] w = new int[8]; for (int i = 0; i < 8; i++) w[i] = ((ip[2 * i] & 255) << 8) | (ip[2 * i + 1] & 255);
        boolean z5 = w[0] == 0 && w[1] == 0 && w[2] == 0 && w[3] == 0 && w[4] == 0;
        if (z5 && w[5] == 0 && w[6] == 0 && (w[7] == 0 || w[7] == 1)) return true;           // :: · ::1
        int[] v4 = { ip[12] & 255, ip[13] & 255, ip[14] & 255, ip[15] & 255 };
        if (z5 && w[5] == 0xffff) return v4Private(v4);                                    // ::ffff:a.b.c.d
        if (z5 && w[5] == 0) return v4Private(v4);                                         // ::a.b.c.d(호환 · 폐기 형식)
        if (w[0] == 0x64 && w[1] == 0xff9b) return true;                                   // 64:ff9b::/96 NAT64
        if ((w[0] & 0xfe00) == 0xfc00) return true;                                        // fc00::/7
        if ((w[0] & 0xffc0) == 0xfe80) return true;                                        // fe80::/10
        if ((w[0] & 0xff00) == 0xff00) return true;                                        // ff00::/8
        if (w[0] == 0x2001 && w[1] == 0x0db8) return true;                                 // 2001:db8::/32 문서용
        if (w[0] == 0x2002) return true;                                                   // 6to4
        return false;
    }

    /* ── 주소 해석(WHATWG URL 중 필요한 부분) ── */
    public static final class Url {
        public String scheme, host, port = "", path = "/", query = "", fragment = "", user = "", pass = "";
        public byte[] ip; // 호스트가 IP 표기면 그 값
        public boolean ipv6;
        public String hostname() { return ipv6 ? "[" + host + "]" : host; }
        public String href() { return scheme + "://" + hostname() + (port.isEmpty() ? "" : ":" + port) + path + query + fragment; }
    }
    static final Set<String> SPECIAL = Set.of("http", "https", "ws", "wss", "ftp", "file");
    static final Map<String, String> DEF_PORT = Map.of("http", "80", "https", "443", "ws", "80", "wss", "443", "ftp", "21");
    static final Pattern SCHEME = Pattern.compile("^([A-Za-z][A-Za-z0-9+.-]*):");

    static String stripCtl(String s) {
        int a = 0, b = s.length(); while (a < b && s.charAt(a) <= 0x20) a++; while (b > a && s.charAt(b - 1) <= 0x20) b--;
        return s.substring(a, b).replaceAll("[\\t\\n\\r]", "");
    }
    /** new URL(raw) — 실패하면 null. 특수 스킴이 아니면 scheme만 채운다 */
    public static Url parse(String raw, Url base) {
        String s = stripCtl(raw);
        Matcher m = SCHEME.matcher(s); Url u = new Url();
        if (m.find()) {
            String sc = m.group(1).toLowerCase(Locale.ROOT);
            String rest = s.substring(m.end());
            if (!SPECIAL.contains(sc)) { u.scheme = sc; u.host = null; return u; }
            if ("file".equals(sc)) { u.scheme = sc; u.host = ""; return u; }
            if (base != null && sc.equals(base.scheme) && !(rest.startsWith("/") || rest.startsWith("\\"))) return relative(rest, base); // https:foo (같은 스킴 상대)
            u.scheme = sc;
            int i = 0; while (i < rest.length() && (rest.charAt(i) == '/' || rest.charAt(i) == '\\')) i++;
            return authority(rest.substring(i), u);
        }
        if (base == null) return null;
        return relative(s, base);
    }
    static Url relative(String s, Url base) {
        Url u = new Url(); u.scheme = base.scheme;
        if (s.startsWith("//") || s.startsWith("\\\\") || s.startsWith("/\\") || s.startsWith("\\/")) { int i = 0; while (i < s.length() && (s.charAt(i) == '/' || s.charAt(i) == '\\')) i++; return authority(s.substring(i), u); }
        u.host = base.host; u.ip = base.ip; u.ipv6 = base.ipv6; u.port = base.port; u.user = base.user; u.pass = base.pass;
        if (s.isEmpty()) { u.path = base.path; u.query = base.query; return u; }
        if (s.startsWith("#")) { u.path = base.path; u.query = base.query; u.fragment = frag(s); return u; }
        if (s.startsWith("?")) { u.path = base.path; tail(s, u); return u; }
        String pathPart = s; int q = firstOf(s, "?#"); if (q >= 0) pathPart = s.substring(0, q);
        String merged;
        if (pathPart.startsWith("/") || pathPart.startsWith("\\")) merged = pathPart;
        else { String bp = base.path; int k = bp.lastIndexOf('/'); merged = (k >= 0 ? bp.substring(0, k + 1) : "/") + pathPart; }
        u.path = normPath(merged); if (q >= 0) tail(s.substring(q), u);
        return u;
    }
    static int firstOf(String s, String chars) { for (int i = 0; i < s.length(); i++) if (chars.indexOf(s.charAt(i)) >= 0) return i; return -1; }
    static void tail(String s, Url u) { // s는 ? 또는 # 로 시작
        int h = s.indexOf('#');
        if (s.startsWith("?")) { String q = h >= 0 ? s.substring(0, h) : s; u.query = q.length() > 1 ? "?" + enc(q.substring(1), QUERY_SET) : ""; if (h >= 0) u.fragment = frag(s.substring(h)); }
        else u.fragment = frag(s);
    }
    static String frag(String s) { return s.length() > 1 ? "#" + enc(s.substring(1), FRAG_SET) : ""; }
    static Url authority(String s, Url u) {
        int end = firstOf(s, "/\\?#"); String auth = end >= 0 ? s.substring(0, end) : s; String rest = end >= 0 ? s.substring(end) : "";
        int at = auth.lastIndexOf('@');
        if (at >= 0) { String ui = auth.substring(0, at); auth = auth.substring(at + 1); int c = ui.indexOf(':'); u.user = c >= 0 ? ui.substring(0, c) : ui; u.pass = c >= 0 ? ui.substring(c + 1) : ""; if (auth.isEmpty()) return null; }
        String h, port = "";
        if (auth.startsWith("[")) { int rb = auth.indexOf(']'); if (rb < 0) return null; h = auth.substring(0, rb + 1); String r = auth.substring(rb + 1); if (!r.isEmpty()) { if (!r.startsWith(":")) return null; port = r.substring(1); } }
        else { int c = auth.indexOf(':'); h = c >= 0 ? auth.substring(0, c) : auth; port = c >= 0 ? auth.substring(c + 1) : ""; }
        if (!port.isEmpty()) { if (!port.matches("[0-9]+")) return null; String pn = port.replaceFirst("^0+(?=.)", ""); if (pn.length() > 5 || Integer.parseInt(pn) > 65535) return null; port = pn.equals(DEF_PORT.get(u.scheme)) ? "" : pn; }
        u.port = port;
        if (!host(h, u)) return null;
        int q = firstOf(rest, "?#"); String p = q >= 0 ? rest.substring(0, q) : rest;
        u.path = normPath(p.isEmpty() ? "/" : p); if (q >= 0) tail(rest.substring(q), u);
        return u;
    }
    static final String FORBIDDEN_HOST = "\u0000\t\n\r #/:<>?@[\\]^|%";
    static boolean host(String h, Url u) {
        if (h.isEmpty()) return false;
        if (h.startsWith("[")) { if (!h.endsWith("]")) return false; byte[] b = v6(h.substring(1, h.length() - 1)); if (b == null) return false; u.ip = b; u.ipv6 = true; u.host = v6str(b); return true; }
        String d;
        try { d = URLDecoder.decode(h.replace("+", "%2B"), StandardCharsets.UTF_8); } catch (Exception e) { return false; }
        String ascii;
        if (d.chars().allMatch(c -> c < 0x80)) ascii = d.toLowerCase(Locale.ROOT);
        else { try { ascii = IDN.toASCII(d, IDN.ALLOW_UNASSIGNED).toLowerCase(Locale.ROOT); } catch (Exception e) { return false; } }
        if (ascii.isEmpty()) return false;
        for (int i = 0; i < ascii.length(); i++) { char c = ascii.charAt(i); if (c <= 0x1f || c == 0x7f || FORBIDDEN_HOST.indexOf(c) >= 0) return false; }
        String[] parts = ascii.split("\\.", -1); String last = parts[parts.length - 1]; if (last.isEmpty() && parts.length > 1) last = parts[parts.length - 2];
        if (last.matches("[0-9]+") || last.matches("0[xX][0-9a-fA-F]*")) { byte[] b = v4(ascii); if (b == null) return false; u.ip = b; u.host = (b[0] & 255) + "." + (b[1] & 255) + "." + (b[2] & 255) + "." + (b[3] & 255); return true; }
        u.host = ascii; return true;
    }
    /** WHATWG IPv4 해석(10진 · 0x16진 · 0 8진, 1~4부분) */
    static byte[] v4(String s) {
        List<String> parts = new ArrayList<>(Arrays.asList(s.split("\\.", -1)));
        if (parts.get(parts.size() - 1).isEmpty() && parts.size() > 1) parts.remove(parts.size() - 1);
        if (parts.size() > 4) return null;
        long[] n = new long[parts.size()];
        for (int i = 0; i < parts.size(); i++) {
            String p = parts.get(i); if (p.isEmpty()) return null; int radix = 10;
            if (p.length() >= 2 && (p.startsWith("0x") || p.startsWith("0X"))) { p = p.substring(2); radix = 16; } else if (p.length() >= 2 && p.startsWith("0")) { p = p.substring(1); radix = 8; }
            if (p.isEmpty()) { n[i] = 0; continue; }
            try { java.math.BigInteger v = new java.math.BigInteger(p, radix); if (v.bitLength() > 40) return null; n[i] = v.longValue(); } catch (NumberFormatException e) { return null; }
        }
        for (int i = 0; i < n.length - 1; i++) if (n[i] > 255) return null;
        if (n[n.length - 1] >= Math.pow(256, 5 - n.length)) return null;
        long ip = n[n.length - 1]; for (int i = 0; i < n.length - 1; i++) ip += n[i] << (8 * (3 - i));
        return new byte[]{ (byte) (ip >> 24), (byte) (ip >> 16), (byte) (ip >> 8), (byte) ip };
    }
    static byte[] v6(String s) {
        if (s.isEmpty() || !s.matches("[0-9A-Fa-f:.]+")) return null;
        try { InetAddress a = InetAddress.getByName("[" + s + "]"); byte[] b = a.getAddress(); if (b.length == 4) { byte[] x = new byte[16]; x[10] = (byte) 0xff; x[11] = (byte) 0xff; System.arraycopy(b, 0, x, 12, 4); return x; } return b; }
        catch (Exception e) { return null; }
    }
    /** WHATWG IPv6 직렬화(가장 긴 0 구간 압축, 소문자 16진, 점 표기 없음) */
    static String v6str(byte[] b) {
        int[] w = new int[8]; for (int i = 0; i < 8; i++) w[i] = ((b[2 * i] & 255) << 8) | (b[2 * i + 1] & 255);
        int bs = -1, bl = 1; for (int i = 0; i < 8; ) { if (w[i] != 0) { i++; continue; } int j = i; while (j < 8 && w[j] == 0) j++; if (j - i > bl) { bs = i; bl = j - i; } i = j; }
        StringBuilder o = new StringBuilder();
        for (int i = 0; i < 8; i++) { if (i == bs) { o.append(i == 0 ? "::" : ":"); i += bl - 1; continue; } o.append(Integer.toHexString(w[i])); if (i < 7) o.append(':'); }
        return o.toString();
    }
    static final String PATH_SET = " \"#<>?`{}", QUERY_SET = " \"#<>'", FRAG_SET = " \"<>`";
    static String enc(String s, String set) {
        StringBuilder o = new StringBuilder();
        for (byte x : s.getBytes(StandardCharsets.UTF_8)) { int c = x & 255; if (c <= 0x1f || c >= 0x7f || set.indexOf(c) >= 0) o.append('%').append(String.format("%02X", c)); else o.append((char) c); }
        return o.toString();
    }
    static String normPath(String p) {
        String[] segs = p.replace('\\', '/').split("/", -1); Deque<String> out = new ArrayDeque<>();
        for (int i = 1; i < segs.length; i++) {
            String sg = segs[i]; String low = sg.toLowerCase(Locale.ROOT); boolean last = i == segs.length - 1;
            if (low.equals("..") || low.equals(".%2e") || low.equals("%2e.") || low.equals("%2e%2e")) { if (!out.isEmpty()) out.removeLast(); if (last) out.add(""); }
            else if (low.equals(".") || low.equals("%2e")) { if (last) out.add(""); }
            else out.add(enc(sg, PATH_SET));
        }
        return "/" + String.join("/", out);
    }

    /* ── 주소 검사(checkUrl) ── */
    public static Url checkUrl(String raw) throws Bad {
        Url u = parse(raw == null ? "" : Js.trim(raw), null);
        if (u == null) throw new Bad(400, "bad_url", "format");
        if (!"https".equals(u.scheme)) throw new Bad(400, "https_only", null);
        if (!u.user.isEmpty() || !u.pass.isEmpty()) throw new Bad(400, "bad_url", "cred");
        if (!u.port.isEmpty() && !"443".equals(u.port)) throw new Bad(400, "bad_port", null);
        if (String.valueOf(raw).length() > 500) throw new Bad(400, "bad_url", "long");
        String h = u.host.toLowerCase(Locale.ROOT);
        if (h.isEmpty() || h.equals("localhost") || h.matches("(?s).*\\.(localhost|local|internal|lan|home|corp)") || (u.ip == null && !h.contains("."))) throw new Bad(400, "private", null);
        if (u.ip != null && isPrivate(u.ip)) throw new Bad(400, "private", null);
        return u;
    }
    /** DNS 확인 → 모든 주소가 공인 IP여야 하고, 첫 주소에 고정 연결 */
    public static InetAddress resolveSafe(Url u) throws Bad {
        InetAddress[] L;
        if (u.ip != null) { try { L = new InetAddress[]{ InetAddress.getByAddress(u.ip) }; } catch (Exception e) { throw new Bad(400, "dns", null); } }
        else { try { L = InetAddress.getAllByName(u.host); } catch (Exception e) { throw new Bad(400, "dns", null); } }
        if (L == null || L.length == 0) throw new Bad(400, "dns", null);
        for (InetAddress a : L) if (isPrivate(a.getAddress())) throw new Bad(400, "private", null);
        return L[0];
    }

    /* ── 전송: 확인한 IP로 고정 연결(인증서는 원래 호스트 이름으로 검증) ── */
    record Resp(int status, Map<String, String> headers, InputStream body, Socket sock) {}
    static Resp get(Url u, InetAddress addr, long deadline) throws IOException {
        int left = (int) Math.max(1, deadline - System.currentTimeMillis());
        Socket raw = new Socket(Proxy.NO_PROXY); raw.connect(new InetSocketAddress(addr, 443), left); raw.setSoTimeout(left);
        SSLSocket s = (SSLSocket) ((SSLSocketFactory) SSLSocketFactory.getDefault()).createSocket(raw, u.ipv6 ? u.host : u.host, 443, true);
        SSLParameters sp = s.getSSLParameters(); sp.setEndpointIdentificationAlgorithm("HTTPS");
        if (u.ip == null) sp.setServerNames(List.of(new SNIHostName(u.host)));
        s.setSSLParameters(sp); s.startHandshake();
        OutputStream os = s.getOutputStream();
        String req = "GET " + u.path + u.query + " HTTP/1.1\r\nHost: " + u.hostname() + "\r\nuser-agent: DidisamBenchmark/1.0 (+homepage structure reference)\r\naccept: text/html,application/xhtml+xml;q=0.9\r\naccept-language: ko,en;q=0.7\r\nConnection: close\r\n\r\n";
        os.write(req.getBytes(StandardCharsets.ISO_8859_1)); os.flush();
        InputStream in = new BufferedInputStream(s.getInputStream());
        String status = line(in); if (status == null) throw new IOException("no status");
        String[] sp1 = status.split(" ", 3); if (sp1.length < 2) throw new IOException("bad status");
        int code = Integer.parseInt(sp1[1]);
        Map<String, String> H = new LinkedHashMap<>();
        for (String l; (l = line(in)) != null && !l.isEmpty(); ) { int c = l.indexOf(':'); if (c <= 0) continue; String k = l.substring(0, c).trim().toLowerCase(Locale.ROOT), v = l.substring(c + 1).trim(); H.merge(k, v, (a, b) -> k.equals("location") || k.equals("content-type") || k.equals("content-length") ? a : a + ", " + b); }
        InputStream body = in;
        if (H.getOrDefault("transfer-encoding", "").toLowerCase(Locale.ROOT).contains("chunked")) body = new Chunked(in);
        else if (H.containsKey("content-length")) { try { body = new Limited(in, Long.parseLong(H.get("content-length"))); } catch (NumberFormatException ignore) { } }
        return new Resp(code, H, body, s);
    }
    static String line(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream(); int c;
        while ((c = in.read()) >= 0) { if (c == '\n') break; if (b.size() > 65536) throw new IOException("header too long"); b.write(c); }
        if (c < 0 && b.size() == 0) return null;
        String s = b.toString(StandardCharsets.ISO_8859_1); return s.endsWith("\r") ? s.substring(0, s.length() - 1) : s;
    }
    static final class Limited extends FilterInputStream {
        long left; Limited(InputStream in, long n) { super(in); left = n; }
        @Override public int read() throws IOException { if (left <= 0) return -1; int c = super.read(); if (c >= 0) left--; return c; }
        @Override public int read(byte[] b, int o, int n) throws IOException { if (left <= 0) return -1; int r = super.read(b, o, (int) Math.min(n, left)); if (r > 0) left -= r; return r; }
    }
    static final class Chunked extends InputStream {
        final InputStream in; long left = 0; boolean done = false;
        Chunked(InputStream in) { this.in = in; }
        private boolean next() throws IOException {
            if (done) return false;
            if (left == 0) { String l = line(in); if (l != null && l.isEmpty()) l = line(in); if (l == null) { done = true; return false; }
                int sc = l.indexOf(';'); String hx = (sc >= 0 ? l.substring(0, sc) : l).trim(); left = hx.isEmpty() ? 0 : Long.parseLong(hx, 16);
                if (left == 0) { done = true; return false; } }
            return true;
        }
        @Override public int read() throws IOException { if (!next()) return -1; int c = in.read(); if (c < 0) { done = true; return -1; } left--; return c; }
        @Override public int read(byte[] b, int o, int n) throws IOException { if (!next()) return -1; int r = in.read(b, o, (int) Math.min(n, left)); if (r < 0) { done = true; return -1; } left -= r; return r; }
    }
    record Got(byte[] buf, boolean cut) {}
    static Got readCapped(InputStream in, int max, Socket sock, long deadline) throws IOException {
        ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[16384]; int n = 0;
        for (int r; ; ) {
            long left = deadline - System.currentTimeMillis(); if (left <= 0) throw new SocketTimeoutException("deadline");
            sock.setSoTimeout((int) left); r = in.read(b); if (r <= 0) break; if (n + r > max) { o.write(b, 0, max - n); n = max; break; } o.write(b, 0, r); n += r; }
        return new Got(o.toByteArray(), n >= max);
    }

    /* ── HTML 구조 추출(Node extract와 같은 정규식 · 같은 순서) ── */
    static final int CI = Pattern.CASE_INSENSITIVE;
    static final String S = Js.S_;
    static final String WB = "(?![A-Za-z0-9_])"; // 단어 문자 뒤의 \b
    static final Pattern ENT = Pattern.compile("&(#x?[0-9a-f]+|[a-z]+);", CI);
    static final Map<String, String> ENTS = Map.of("amp", "&", "lt", "<", "gt", ">", "quot", "\"", "apos", "'", "nbsp", " ", "middot", "·", "constructor", "function Object() { [native code] }");
    static String dec(String s) {
        Matcher m = ENT.matcher(s == null ? "" : s); StringBuilder b = new StringBuilder();
        while (m.find()) {
            String e = m.group(1), r;
            if (e.charAt(0) == '#') {
                boolean hx = e.length() > 1 && (e.charAt(1) == 'x' || e.charAt(1) == 'X'); String d = hx ? e.substring(2) : e.substring(1);
                Matcher dm = Pattern.compile(hx ? "^[0-9a-fA-F]+" : "^[0-9]+").matcher(d); long n = -1;
                if (dm.find()) { String ds = dm.group().replaceFirst("^0+(?=.)", ""); n = ds.length() > 8 ? Long.MAX_VALUE : Long.parseLong(ds, hx ? 16 : 10); }
                r = n > 0 && n < 0x110000 ? new String(Character.toChars((int) n)) : "";
            } else { String v = ENTS.get(e.toLowerCase(Locale.ROOT)); r = v != null ? v : m.group(); }
            m.appendReplacement(b, Matcher.quoteReplacement(r));
        }
        m.appendTail(b); return b.toString();
    }
    static final Pattern TAG = Pattern.compile("<[^>]*>"), WSP = Pattern.compile(S + "+");
    static String txt(String h) { return Js.trim(WSP.matcher(dec(TAG.matcher(h == null ? "" : h).replaceAll(" "))).replaceAll(" ")); }
    static String g1(Pattern p, String s) { Matcher m = p.matcher(s); return m.find() ? m.group(1) : null; }
    static int count(Pattern p, String s) { Matcher m = p.matcher(s); int n = 0; while (m.find()) n++; return n; }

    public static Map<String, Object> extract(String html, String base) {
        final String h0 = html == null ? "" : html;
        java.util.function.Function<String, String> metaTag = name -> {
            Matcher m = Pattern.compile("<meta[^>]+(?:name|property)=[\"']" + Pattern.quote(name) + "[\"'][^>]*>", CI).matcher(h0); if (!m.find()) return "";
            String c = g1(Pattern.compile("content=[\"']([^\"']*)[\"']", CI), m.group()); return c != null ? Js.trim(dec(c)) : "";
        };
        String title = Js.cut(txt(g1(Pattern.compile("<title[^>]*>([\\s\\S]*?)</title>", CI), h0)), 120);
        String d1 = metaTag.apply("description"); String desc = Js.cut(!d1.isEmpty() ? d1 : metaTag.apply("og:description"), 300);
        String theme = metaTag.apply("theme-color");
        StringBuilder st = new StringBuilder(); List<String> sty = new ArrayList<>();
        Matcher ms = Pattern.compile("<style[^>]*>([\\s\\S]*?)</style>", CI).matcher(h0); while (ms.find()) sty.add(ms.group(1));
        st.append(String.join("\n", sty)); List<String> inl = new ArrayList<>();
        Matcher mi = Pattern.compile("style=[\"']([^\"']*)[\"']", CI).matcher(h0); while (mi.find()) inl.add(mi.group(1));
        st.append(String.join(";", inl)); String styles = st.toString();
        String h = Pattern.compile("<!--[\\s\\S]*?-->").matcher(h0).replaceAll(" ");
        h = Pattern.compile("<(script|style|noscript|template|svg|iframe|object|embed)" + WB + "[\\s\\S]*?</\\1" + S + "*>", CI).matcher(h).replaceAll(" ");
        h = Pattern.compile("<(script|style|link|meta|iframe|object|embed)" + WB + "[^>]*>", CI).matcher(h).replaceAll(" ");
        List<String> headings = new ArrayList<>();
        Matcher mh = Pattern.compile("<h([1-3])" + WB + "[^>]*>([\\s\\S]*?)</h\\1>", CI).matcher(h);
        while (mh.find()) { String t = Js.cut(txt(mh.group(2)), 120); if (!t.isEmpty()) headings.add(t); }
        headings = Js.head(headings, 40);
        List<String> navs = new ArrayList<>(); Matcher mn = Pattern.compile("<(nav|header)" + WB + "[^>]*>([\\s\\S]*?)</\\1>", CI).matcher(h); while (mn.find()) navs.add(mn.group(2));
        String navHtml = String.join(" ", navs); LinkedHashSet<String> navSet = new LinkedHashSet<>();
        Matcher ma = Pattern.compile("<a" + WB + "[^>]*>([\\s\\S]*?)</a>", CI).matcher(navHtml);
        while (ma.find()) { String t = Js.cut(txt(ma.group(1)), 30); if (!t.isEmpty() && t.length() <= 30) navSet.add(t); }
        List<String> nav = Js.head(new ArrayList<>(navSet), 40);
        String bm = g1(Pattern.compile("<body" + WB + "[^>]*>([\\s\\S]*)</body>", CI), h); String body = bm != null ? bm : h;
        List<String> parts = new ArrayList<>(); Matcher msec = Pattern.compile("<section" + WB + "[^>]*>([\\s\\S]*?)</section>", CI).matcher(body); while (msec.find()) parts.add(msec.group(1));
        if (parts.size() < 2) { String[] sp = Pattern.compile("<h[12]" + WB, CI).split(body, -1); parts = new ArrayList<>(); for (int i = 1; i < sp.length; i++) parts.add("<h2" + sp[i]); }
        Pattern HF = Pattern.compile("<h[1-4]" + WB + "[^>]*>([\\s\\S]*?)</h[1-4]>", CI), IMG = Pattern.compile("<img" + WB, CI);
        List<Map<String, Object>> sections = new ArrayList<>();
        for (String s : Js.head(parts, 20)) {
            Map<String, Object> o = new LinkedHashMap<>();
            String hd = Js.cut(txt(g1(HF, s)), 120);
            String tx = Js.cut(txt(HF.matcher(s).replaceFirst("")), 400);
            o.put("heading", hd); o.put("text", tx); o.put("kind", kind(s)); o.put("images", count(IMG, s));
            if (!hd.isEmpty() || !tx.isEmpty()) sections.add(o);
        }
        LinkedHashMap<String, Integer> cnt = new LinkedHashMap<>();
        Matcher mc = Pattern.compile("#([0-9a-f]{6}|[0-9a-f]{3})" + WB, CI).matcher(styles + " " + theme);
        while (mc.find()) { String c = mc.group(1).toLowerCase(Locale.ROOT); if (c.length() == 3) { StringBuilder x = new StringBuilder(); for (char ch : c.toCharArray()) x.append(ch).append(ch); c = x.toString(); } if (c.matches("fff{4}|0{6}|f{6}")) continue; cnt.merge(c, 1, Integer::sum); }
        List<Map.Entry<String, Integer>> ce = new ArrayList<>(); // JS 속성 순서(정수 키 먼저) → 안정 정렬(많은 순)
        cnt.entrySet().stream().filter(e -> Js.isIndex(e.getKey())).sorted(Comparator.comparingLong(e -> Long.parseLong(e.getKey()))).forEach(ce::add);
        cnt.entrySet().stream().filter(e -> !Js.isIndex(e.getKey())).forEach(ce::add);
        ce.sort((x, y) -> y.getValue() - x.getValue());
        List<String> colors = new ArrayList<>(); for (var e : Js.head(ce, 6)) colors.add("#" + e.getKey());
        if (!theme.isEmpty() && theme.matches("(?i)#[0-9a-f]{6}") && !colors.contains(theme.toLowerCase(Locale.ROOT))) colors.add(0, theme.toLowerCase(Locale.ROOT));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("url", base); out.put("title", title); out.put("desc", desc); out.put("headings", headings); out.put("nav", nav); out.put("sections", sections);
        out.put("colors", Js.head(colors, 6)); out.put("images", count(IMG, body));
        return out;
    }
    static String kind(String s) {
        if (Pattern.compile("<form" + WB + "|<input" + WB, CI).matcher(s).find()) return "form";
        Pattern IMG = Pattern.compile("<img" + WB, CI);
        if (IMG.matcher(s).find() && count(IMG, s) >= 3) return "gallery";
        if (Pattern.compile("<(ul|ol)" + WB, CI).matcher(s).find() && count(Pattern.compile("<li" + WB, CI), s) >= 3) return "list";
        if (Pattern.compile("\\d[\\d,.]*" + S + "*(%|명|개|건|년|\\+)").matcher(txt(s)).find()) return "stats";
        return "text";
    }

    /* ── 전체 흐름(benchmark) ── */
    public static Map<String, Object> benchmark(String raw) throws Bad {
        long deadline = System.currentTimeMillis() + TIMEOUT;
        Url u = checkUrl(raw);
        for (int hop = 0; hop <= HOPS; hop++) {
            InetAddress addr = resolveSafe(u);
            if (System.currentTimeMillis() >= deadline) throw new Bad(504, "timeout", null);
            Resp r;
            try { r = get(u, addr, deadline); }
            catch (Exception e) { throw System.currentTimeMillis() >= deadline || e instanceof SocketTimeoutException ? new Bad(504, "timeout", null) : new Bad(502, "fetch", "connect"); }
            try {
                String loc = r.headers().get("location");
                if (r.status() >= 300 && r.status() < 400 && loc != null && !loc.isEmpty()) {
                    if (hop == HOPS) throw new Bad(502, "redirects", null);
                    Url nx = parse(loc, u); if (nx == null) throw new Bad(502, "fetch", null); // Node: new URL(…) 실패 → 일반 오류 → 502
                    u = checkUrl(nx.host == null && !"https".equals(nx.scheme) ? nx.scheme + ":" : nx.href()); continue;
                }
                if (r.status() != 200) throw new Bad(502, "status", null, String.valueOf(r.status()));
                String ct = r.headers().getOrDefault("content-type", "");
                if (!ct.isEmpty() && !Pattern.compile("text/html|application/xhtml", CI).matcher(ct).find()) throw new Bad(415, "type", null);
                double len = Js.num(r.headers().getOrDefault("content-length", "")); if (Double.isNaN(len)) len = 0;
                if (len > MAX * 4.0) throw new Bad(413, "too_large", "page");
                Got got;
                try { got = readCapped(r.body(), MAX, r.sock(), deadline); }
                catch (Exception e) { throw System.currentTimeMillis() >= deadline || e instanceof SocketTimeoutException ? new Bad(504, "timeout", null) : new Bad(502, "fetch", "read"); }
                String cs = g1(Pattern.compile("charset=([\\w-]+)", CI), ct); if (cs == null) cs = "utf-8";
                String html;
                try { Charset C = Charset.forName(LABELS.getOrDefault(cs.toLowerCase(Locale.ROOT), cs)); html = new String(got.buf(), C); }
                catch (Exception e) { html = new String(got.buf(), StandardCharsets.UTF_8); }
                if (!html.isEmpty() && html.charAt(0) == '﻿') html = html.substring(1); // TextDecoder BOM 제거
                Map<String, Object> out = extract(html, u.href()); out.put("truncated", got.cut()); return out;
            } finally { try { r.sock().close(); } catch (IOException ignore) { } }
        }
        throw new Bad(502, "redirects", null);
    }
}
