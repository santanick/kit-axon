package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Node 서버(JavaScript)와 같은 값 규칙 — 기관 상태 문서(JSON)를 다루는 코드가 Node와 같은 결과를 내도록 한다.
 * Java null = JS undefined(속성 없음), NullNode = JS null.
 *  - 참/거짓(truthy) · String() · Number()(단항 +) · === · Object.entries 순서(정수 키 먼저) · JSON.stringify(들여쓰기 포함) · 숫자 → 문자열
 *  - 정규식 \s(유니코드 공백) · trim · slice(음수 위치)
 */
public final class Js {
    private Js() {}
    public static final JsonNodeFactory F = JsonNodeFactory.instance;
    /** JS 정규식 \s 와 같은 문자 집합(문자 클래스 안에 넣어 쓴다) */
    public static final String WS = "\\t\\n\\x0B\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff";
    /** JS \s */
    public static final String S_ = "[" + WS + "]";
    private static final Pattern NUM_DEC = Pattern.compile("[+-]?(?:\\d+\\.?\\d*(?:[eE][+-]?\\d+)?|\\.\\d+(?:[eE][+-]?\\d+)?)");
    private static final Pattern INDEX_KEY = Pattern.compile("0|[1-9]\\d{0,9}");

    /* ── 값 판정 ── */
    public static boolean undef(JsonNode v) { return v == null || v.isMissingNode(); }
    public static boolean nullish(JsonNode v) { return v == null || v.isMissingNode() || v.isNull(); }
    public static boolean truthy(JsonNode v) {
        if (nullish(v)) return false;
        if (v.isBoolean()) return v.booleanValue();
        if (v.isNumber()) { double d = v.doubleValue(); return d != 0 && !Double.isNaN(d); }
        if (v.isTextual()) return !v.textValue().isEmpty();
        return true;
    }
    public static boolean isObj(JsonNode v) { return v != null && (v.isObject() || v.isArray()); } // typeof === 'object' && !null
    /** a || b || … (JS 단축 평가: 처음 참인 값, 없으면 마지막 값) */
    public static JsonNode or(JsonNode... vs) { for (int i = 0; i < vs.length - 1; i++) if (truthy(vs[i])) return vs[i]; return vs[vs.length - 1]; }
    /** a ?? b */
    public static JsonNode coalesce(JsonNode a, JsonNode b) { return nullish(a) ? b : a; }

    /** 속성 접근 o[k] — 객체 · 배열(번호) · 문자열(번호 · length) */
    public static JsonNode get(JsonNode o, String k) {
        if (o == null) return null;
        if (o.isObject()) return o.get(k);
        if (o.isArray()) {
            if ("length".equals(k)) return F.numberNode(o.size());
            if (INDEX_KEY.matcher(k).matches()) { long i = Long.parseLong(k); return i < o.size() ? o.get((int) i) : null; }
            return null;
        }
        if (o.isTextual()) {
            String s = o.textValue();
            if ("length".equals(k)) return F.numberNode(s.length());
            if (INDEX_KEY.matcher(k).matches()) { long i = Long.parseLong(k); return i < s.length() ? TextNode.valueOf(String.valueOf(s.charAt((int) i))) : null; }
        }
        return null;
    }
    public static JsonNode get(JsonNode o, String... path) { JsonNode v = o; for (String k : path) { if (nullish(v)) return null; v = get(v, k); } return v; }
    /** 속성 키(ToPropertyKey) */
    public static String key(JsonNode v) { return str(v); }

    /* ── 변환 ── */
    /** JS String(v) — undefined → "undefined", null → "null" */
    public static String str(JsonNode v) {
        if (undef(v)) return "undefined";
        if (v.isNull()) return "null";
        if (v.isTextual()) return v.textValue();
        if (v.isBoolean()) return v.booleanValue() ? "true" : "false";
        if (v.isNumber()) return numStr(v.doubleValue(), v);
        if (v.isArray()) { StringBuilder b = new StringBuilder(); for (int i = 0; i < v.size(); i++) { if (i > 0) b.append(','); JsonNode e = v.get(i); if (!nullish(e)) b.append(str(e)); } return b.toString(); }
        return "[object Object]";
    }
    /** String(v == null ? '' : v) */
    public static String S(JsonNode v) { return nullish(v) ? "" : str(v); }
    /** String(v || '') */
    public static String sOr(JsonNode v) { return truthy(v) ? str(v) : ""; }
    /** 배열 join 요소 규칙(null · undefined → 빈 문자열) */
    public static String joinEl(JsonNode v) { return nullish(v) ? "" : str(v); }
    public static String join(List<JsonNode> a, String sep) { StringBuilder b = new StringBuilder(); for (int i = 0; i < a.size(); i++) { if (i > 0) b.append(sep); b.append(joinEl(a.get(i))); } return b.toString(); }

    /** JS Number(v) / 단항 + */
    public static double num(JsonNode v) {
        if (undef(v)) return Double.NaN;
        if (v.isNull()) return 0;
        if (v.isBoolean()) return v.booleanValue() ? 1 : 0;
        if (v.isNumber()) return v.doubleValue();
        if (v.isTextual()) return num(v.textValue());
        if (v.isArray()) return num(str(v));
        return Double.NaN;
    }
    public static double num(String s0) {
        String s = trim(s0);
        if (s.isEmpty()) return 0;
        switch (s) { case "Infinity": case "+Infinity": return Double.POSITIVE_INFINITY; case "-Infinity": return Double.NEGATIVE_INFINITY; default: }
        if (s.length() > 2 && s.charAt(0) == '0') {
            char c = s.charAt(1); int radix = c == 'x' || c == 'X' ? 16 : c == 'o' || c == 'O' ? 8 : c == 'b' || c == 'B' ? 2 : 0;
            if (radix > 0) { try { return new BigInteger(s.substring(2), radix).doubleValue(); } catch (NumberFormatException e) { return Double.NaN; } }
        }
        if (!NUM_DEC.matcher(s).matches()) return Double.NaN;
        try { return Double.parseDouble(s); } catch (NumberFormatException e) { return Double.NaN; }
    }
    /** Number.prototype.toString() */
    public static String numStr(double d) { return numStr(d, null); }
    private static String numStr(double d, JsonNode src) {
        if (Double.isNaN(d)) return "NaN";
        if (Double.isInfinite(d)) return d > 0 ? "Infinity" : "-Infinity";
        if (d == 0) return "0";
        if (src != null && src.isIntegralNumber() && !src.isBigInteger()) { long l = src.longValue(); if (Math.abs(l) < 1e21 && (double) l == d && Math.abs(l) <= (1L << 53)) return Long.toString(l); }
        BigDecimal bd = new BigDecimal(Double.toString(Math.abs(d))).stripTrailingZeros();
        String digits = bd.unscaledValue().toString(); int k = digits.length(); int n = k - bd.scale();
        String sign = d < 0 ? "-" : "";
        if (k <= n && n <= 21) return sign + digits + "0".repeat(n - k);
        if (0 < n && n <= 21) return sign + digits.substring(0, n) + "." + digits.substring(n);
        if (-6 < n && n <= 0) return sign + "0." + "0".repeat(-n) + digits;
        int e = n - 1; String es = (e >= 0 ? "+" : "-") + Math.abs(e);
        return sign + (k == 1 ? digits : digits.charAt(0) + "." + digits.substring(1)) + "e" + es;
    }
    /** 계산된 숫자를 JSON 값으로(NaN · Infinity → null, 정수면 정수 표기) */
    public static JsonNode numNode(double d) {
        if (Double.isNaN(d) || Double.isInfinite(d)) return F.nullNode();
        if (d == Math.rint(d) && Math.abs(d) <= 9007199254740992d) return F.numberNode((long) d);
        return F.numberNode(d);
    }
    /** Math.round (JS: 0.5는 +무한 쪽) */
    public static double round(double d) { if (Double.isNaN(d) || Double.isInfinite(d)) return d; return Math.floor(d + 0.5); }

    /** a === b (JSON 값끼리) */
    public static boolean strictEq(JsonNode a, JsonNode b) {
        if (undef(a) || undef(b)) return undef(a) && undef(b);
        if (a.isNull() || b.isNull()) return a.isNull() && b.isNull();
        if (a.isNumber() && b.isNumber()) return a.doubleValue() == b.doubleValue();
        if (a.isTextual() && b.isTextual()) return a.textValue().equals(b.textValue());
        if (a.isBoolean() && b.isBoolean()) return a.booleanValue() == b.booleanValue();
        return a == b;
    }
    public static boolean strictEq(JsonNode a, String s) { return a != null && a.isTextual() && a.textValue().equals(s); }
    /** Array.prototype.includes (SameValueZero) */
    public static boolean includes(JsonNode arr, JsonNode v) {
        if (arr == null || !arr.isArray()) return false;
        for (JsonNode e : arr) { if (e.isNumber() && v != null && v.isNumber() && Double.isNaN(e.doubleValue()) && Double.isNaN(v.doubleValue())) return true; if (strictEq(e, v)) return true; }
        return false;
    }
    public static List<JsonNode> arr(JsonNode v) { List<JsonNode> l = new ArrayList<>(); if (v != null && v.isArray()) v.forEach(l::add); return l; }
    /** (v || []) 를 배열로 — 배열이 아니면 빈 목록 */
    public static List<JsonNode> arrOr(JsonNode v) { return arr(v); }

    /* ── Object.entries / fromEntries (JS 속성 순서: 정수 키 오름차순 → 나머지 삽입 순서) ── */
    public static List<Map.Entry<String, JsonNode>> entries(JsonNode o) {
        List<Map.Entry<String, JsonNode>> out = new ArrayList<>();
        if (o == null) return out;
        if (o.isArray()) { for (int i = 0; i < o.size(); i++) out.add(Map.entry(String.valueOf(i), o.get(i))); return out; }
        if (o.isTextual()) { String s = o.textValue(); for (int i = 0; i < s.length(); i++) out.add(Map.entry(String.valueOf(i), TextNode.valueOf(String.valueOf(s.charAt(i))))); return out; }
        if (!o.isObject()) return out;
        List<Map.Entry<String, JsonNode>> idx = new ArrayList<>(), rest = new ArrayList<>();
        o.fields().forEachRemaining(e -> (isIndex(e.getKey()) ? idx : rest).add(new AbstractMap.SimpleImmutableEntry<>(e.getKey(), e.getValue())));
        idx.sort(Comparator.comparingLong(e -> Long.parseLong(e.getKey())));
        out.addAll(idx); out.addAll(rest); return out;
    }
    public static List<String> keys(JsonNode o) { List<String> l = new ArrayList<>(); for (var e : entries(o)) l.add(e.getKey()); return l; }
    public static List<JsonNode> values(JsonNode o) { List<JsonNode> l = new ArrayList<>(); for (var e : entries(o)) l.add(e.getValue()); return l; }
    public static boolean isIndex(String k) { if (!INDEX_KEY.matcher(k).matches()) return false; return Long.parseLong(k) < 4294967295L; }
    /** Object.fromEntries — 같은 키는 처음 위치에 마지막 값, 정수 키는 앞으로 */
    public static ObjectNode fromEntries(List<Map.Entry<String, JsonNode>> es) {
        LinkedHashMap<String, JsonNode> m = new LinkedHashMap<>(); for (var e : es) m.put(e.getKey(), e.getValue());
        ObjectNode o = F.objectNode();
        m.entrySet().stream().filter(e -> isIndex(e.getKey())).sorted(Comparator.comparingLong(e -> Long.parseLong(e.getKey()))).forEach(e -> o.set(e.getKey(), e.getValue()));
        m.forEach((k, v) -> { if (!isIndex(k)) o.set(k, v); });
        return o;
    }
    /** own(o, k): o && typeof o === 'object' && hasOwnProperty(o, k) */
    public static boolean own(JsonNode o, String k) {
        if (o == null) return false;
        if (o.isObject()) return o.has(k);
        if (o.isArray()) return "length".equals(k) || (isIndex(k) && Long.parseLong(k) < o.size());
        return false;
    }

    /* ── 문자열 ── */
    private static boolean jsWs(char c) {
        return c == '\t' || c == '\n' || c == 0x0B || c == '\f' || c == '\r' || c == ' ' || c == 0xa0 || c == 0x1680 || (c >= 0x2000 && c <= 0x200a) || c == 0x2028 || c == 0x2029 || c == 0x202f || c == 0x205f || c == 0x3000 || c == 0xfeff;
    }
    public static String trim(String s) { int a = 0, b = s.length(); while (a < b && jsWs(s.charAt(a))) a++; while (b > a && jsWs(s.charAt(b - 1))) b--; return s.substring(a, b); }
    /** s.slice(0, n) */
    public static String cut(String s, int n) { return s.length() <= n ? s : s.substring(0, n); }
    /** s.slice(a, b) — 음수는 끝에서 */
    public static String slice(String s, double a, double b) { int[] r = range(s.length(), a, b); return s.substring(r[0], Math.max(r[0], r[1])); }
    public static <T> List<T> slice(List<T> l, double a, double b) { int[] r = range(l.size(), a, b); return r[1] <= r[0] ? new ArrayList<>() : new ArrayList<>(l.subList(r[0], r[1])); }
    public static <T> List<T> head(List<T> l, int n) { return slice(l, 0, n); }
    private static int[] range(int len, double a, double b) { return new int[]{ rel(len, a), rel(len, b) }; }
    private static int rel(int len, double x) {
        if (Double.isNaN(x)) x = 0; x = x < 0 ? Math.ceil(x) : Math.floor(x);
        if (x < 0) return (int) Math.max(0, len + x);
        return (int) Math.min(len, x);
    }

    /* ── 시간 ── */
    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);
    /** new Date().toISOString() */
    public static String isoNow() { return ISO.format(Instant.now().truncatedTo(ChronoUnit.MILLIS)); }
    /** KST 날짜(YYYY-MM-DD) */
    public static String kstToday() { return Instant.now().plusSeconds(9 * 3600).atOffset(ZoneOffset.UTC).toLocalDate().toString(); }

    /* ── JSON.stringify(v, null, indent) 와 같은 바이트 ── */
    public static String stringify(JsonNode v) { return stringify(v, 0); }
    public static String stringify(JsonNode v, int indent) { StringBuilder b = new StringBuilder(); write(b, v, indent, ""); return b.toString(); }
    private static void write(StringBuilder b, JsonNode v, int ind, String cur) {
        if (nullish(v)) { b.append("null"); return; }
        if (v.isTextual()) { quote(b, v.textValue()); return; }
        if (v.isBoolean()) { b.append(v.booleanValue()); return; }
        if (v.isNumber()) { double d = v.doubleValue(); b.append(Double.isNaN(d) || Double.isInfinite(d) ? "null" : numStr(d, v)); return; }
        String nx = cur + " ".repeat(ind);
        if (v.isArray()) {
            if (v.isEmpty()) { b.append("[]"); return; }
            b.append('[');
            for (int i = 0; i < v.size(); i++) { if (i > 0) b.append(','); if (ind > 0) b.append('\n').append(nx); write(b, v.get(i), ind, nx); }
            if (ind > 0) b.append('\n').append(cur); b.append(']'); return;
        }
        List<Map.Entry<String, JsonNode>> es = new ArrayList<>(); for (var e : entries(v)) if (!undef(e.getValue())) es.add(e);
        if (es.isEmpty()) { b.append("{}"); return; }
        b.append('{'); boolean first = true;
        for (var e : es) { if (!first) b.append(','); first = false; if (ind > 0) b.append('\n').append(nx); quote(b, e.getKey()); b.append(ind > 0 ? ": " : ":"); write(b, e.getValue(), ind, nx); }
        if (ind > 0) b.append('\n').append(cur); b.append('}');
    }
    public static void quote(StringBuilder b, String s) {
        b.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': b.append("\\\""); break; case '\\': b.append("\\\\"); break;
                case '\b': b.append("\\b"); break; case '\f': b.append("\\f"); break; case '\n': b.append("\\n"); break; case '\r': b.append("\\r"); break; case '\t': b.append("\\t"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else if (Character.isHighSurrogate(c) && !(i + 1 < s.length() && Character.isLowSurrogate(s.charAt(i + 1)))) b.append(String.format("\\u%04x", (int) c));
                    else if (Character.isLowSurrogate(c) && !(i > 0 && Character.isHighSurrogate(s.charAt(i - 1)))) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        b.append('"');
    }
    public static JsonNode parse(String s) { try { return s == null ? null : DdWeb.JSON.readTree(s); } catch (Exception e) { throw new IllegalStateException(e); } }
    public static ArrayNode arrNode(Collection<? extends JsonNode> l) { ArrayNode a = F.arrayNode(); l.forEach(a::add); return a; }
    public static TextNode t(String s) { return TextNode.valueOf(s); }
}
