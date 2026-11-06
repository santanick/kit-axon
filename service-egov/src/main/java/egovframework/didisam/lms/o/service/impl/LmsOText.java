package egovframework.didisam.lms.o.service.impl;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.Js;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.Inflater;

/**
 * 묶음 O 결정적 텍스트 처리 — Node mod-o.js와 같은 결과(토큰 · 해시 임베딩 · 난이도 분류 · 파일 추출 · 청크 · 영상 구간 · JSON 추출).
 * 문자열 길이 · 자르기는 모두 UTF-16 단위(JS와 같음).
 */
public final class LmsOText {
    private LmsOText() { }
    public static final int DIM = 256, CHUNK = 700;
    static final Pattern WORD_SPLIT = Pattern.compile("[^\\p{L}\\p{N}]+");
    static final Pattern HANGUL = Pattern.compile("[가-힣]");
    static final Pattern JOSA = Pattern.compile("(으로|에서|에게|까지|부터|는|은|이|가|을|를|의|도|과|와|에|로)$");
    static final List<String> CUES = List.of("증명", "분석", "평가", "비교", "설계", "추론", "적용", "prove", "analy", "evaluat", "design", "compare", "derive");
    static final String SW = "[" + Js.WS + "]";
    private static final int DS = Pattern.DOTALL, CI = Pattern.CASE_INSENSITIVE;

    /** JS split(re) 결과에서 빈 문자열 빼고 */
    static List<String> splitNe(String s, Pattern re) { List<String> o = new ArrayList<>(); for (String w : re.split(s, -1)) if (!w.isEmpty()) o.add(w); return o; }
    static String lower(String s) { return s.toLowerCase(Locale.ROOT); }

    public static List<String> tokens(String s) {
        List<String> out = new ArrayList<>();
        for (String w : splitNe(lower(s == null ? "" : s), WORD_SPLIT)) {
            if (HANGUL.matcher(w).find()) { if (w.length() == 1) out.add(w); else for (int i = 0; i < w.length() - 1; i++) out.add(w.substring(i, i + 2)); }
            else if (w.length() >= 2) out.add(w);
        }
        return out;
    }
    static int fnv(String s) { int h = 0x811c9dc5; for (int i = 0; i < s.length(); i++) h = (h ^ s.charAt(i)) * 16777619; return (int) (Integer.toUnsignedLong(h) % DIM); }
    /** 임베딩 플러그인 지점(로컬 해시 BoW 정수 빈도) */
    public static int[] embedCounts(String s) { int[] c = new int[DIM]; for (String t : tokens(s)) c[fnv(t)]++; return c; }
    public static String pgArr(int[] c) { StringBuilder b = new StringBuilder("{"); for (int i = 0; i < c.length; i++) { if (i > 0) b.append(','); b.append(c[i]); } return b.append('}').toString(); }
    static ArrayNode jsonArr(int[] c) { ArrayNode a = Js.F.arrayNode(); for (int x : c) a.add(x); return a; }

    static final Pattern SENT = Pattern.compile("[.!?。？！\\n]+"), DIGITS = Pattern.compile("\\d+");
    public static ObjectNode classify(String t) {
        List<String> sents = new ArrayList<>(); for (String x : SENT.split(t, -1)) { String y = Js.trim(x); if (!y.isEmpty()) sents.add(y); }
        List<String> words = splitNe(t, WORD_SPLIT);
        int chars = 0; for (String x : sents) chars += x.length();
        int avg = sents.isEmpty() ? 0 : chars / sents.size();
        int lw = 0; for (String w : words) if (w.length() >= 7) lw++;
        int longPct = words.isEmpty() ? 0 : lw * 100 / words.size();
        int nums = 0; Matcher m = DIGITS.matcher(t); while (m.find()) nums++;
        String low = lower(t); int cues = 0; for (String c : CUES) if (low.contains(c)) cues++;
        int score = Math.min(100, avg * 6 / 5 + longPct + Math.min(20, nums * 2) + Math.min(30, cues * 15));
        ObjectNode o = Js.F.objectNode(); o.put("level", score < 40 ? "easy" : score < 70 ? "medium" : "hard"); o.put("score", score);
        ObjectNode f = o.putObject("features"); f.put("avg_len", avg); f.put("long_pct", longPct); f.put("nums", nums); f.put("cues", cues);
        return o;
    }
    public static String keyword(String w0) { Matcher m = JOSA.matcher(w0); if (m.find() && w0.length() - m.group().length() >= 2) return w0.substring(0, w0.length() - m.group().length()); return w0; }

    /* ── 엔티티(한 번에) ── */
    static final Pattern ENT = Pattern.compile("&(lt|gt|quot|apos|amp|nbsp|#\\d{1,7}|#x[0-9a-fA-F]{1,6});");
    static String decodeEnt(String s) {
        Matcher m = ENT.matcher(s); StringBuilder b = new StringBuilder();
        while (m.find()) {
            String e = m.group(1), r;
            switch (e) { case "lt": r = "<"; break; case "gt": r = ">"; break; case "quot": r = "\""; break; case "apos": r = "'"; break; case "amp": r = "&"; break; case "nbsp": r = " "; break;
                default: { long n = e.charAt(1) == 'x' ? Long.parseLong(e.substring(2), 16) : Long.parseLong(e.substring(1)); r = n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? new String(Character.toChars((int) n)) : ""; } }
            m.appendReplacement(b, Matcher.quoteReplacement(r));
        }
        m.appendTail(b); return b.toString();
    }
    public record Para(String t, String x) { }
    static final Pattern MD_H = Pattern.compile("^(#{1,6})[ \\t]+(.*)$"), MD_LI = Pattern.compile("^[ \\t]*(?:[-*+]|\\d+\\.)[ \\t]+(.*)$"), MD_INL = Pattern.compile("\\*\\*|`");
    public static List<Para> linesToParas(String text, boolean md) {
        List<Para> out = new ArrayList<>(); List<String> buf = new ArrayList<>();
        Runnable flush = () -> { if (!buf.isEmpty()) { out.add(new Para("p", String.join(" ", buf))); buf.clear(); } };
        for (String line : text.split("\n", -1)) {
            if (md) {
                Matcher h = MD_H.matcher(line);
                if (h.find()) { flush.run(); String x = Js.trim(MD_INL.matcher(h.group(2)).replaceAll("")); if (!x.isEmpty()) out.add(new Para("h", x)); continue; }
                Matcher li = MD_LI.matcher(line);
                if (li.find()) { flush.run(); String x = Js.trim(MD_INL.matcher(li.group(1)).replaceAll("")); if (!x.isEmpty()) out.add(new Para("li", x)); continue; }
            }
            String x = Js.trim(md ? MD_INL.matcher(line).replaceAll("") : line);
            if (x.isEmpty()) flush.run(); else buf.add(x);
        }
        flush.run(); return out;
    }
    static String csvRow(String line) {
        List<String> cells = new ArrayList<>(); StringBuilder cur = new StringBuilder(); boolean q = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (q) { if (ch == '"') { if (i + 1 < line.length() && line.charAt(i + 1) == '"') { cur.append('"'); i++; } else q = false; } else cur.append(ch); }
            else if (ch == '"') q = true; else if (ch == ',') { cells.add(Js.trim(cur.toString())); cur.setLength(0); } else cur.append(ch);
        }
        cells.add(Js.trim(cur.toString())); cells.removeIf(String::isEmpty); return String.join(" | ", cells);
    }
    static final Pattern H_CMT = Pattern.compile("<!--.*?-->", DS), H_SCR = Pattern.compile("<(script|style)\\b[^>]*>.*?</\\1>", DS | CI),
        H_H = Pattern.compile("<h[1-6]\\b[^>]*>", CI), H_LI = Pattern.compile("<li\\b[^>]*>", CI),
        H_BLK = Pattern.compile("</?(p|div|br|tr|table|ul|ol|section|article|h[1-6]|li|header|footer|blockquote)\\b[^>]*>", CI), H_TAG = Pattern.compile("<[^>]+>"),
        H_WS = Pattern.compile("[ \\t\\u00a0]+"), H_MK = Pattern.compile("\\u0001[hl]");
    static List<Para> htmlParas(String s) {
        s = H_SCR.matcher(H_CMT.matcher(s).replaceAll("")).replaceAll("");
        s = H_LI.matcher(H_H.matcher(s).replaceAll("\n\u0001h ")).replaceAll("\n\u0001l ");
        s = H_TAG.matcher(H_BLK.matcher(s).replaceAll("\n")).replaceAll("");
        s = decodeEnt(s); List<Para> out = new ArrayList<>();
        for (String line : s.split("\n", -1)) {
            String x = Js.trim(H_WS.matcher(line).replaceAll(" ")); if (x.isEmpty()) continue;
            String t = "p"; if (x.startsWith("\u0001h")) { t = "h"; x = Js.trim(x.substring(2)); } else if (x.startsWith("\u0001l")) { t = "li"; x = Js.trim(x.substring(2)); }
            x = H_MK.matcher(x).replaceAll(""); if (!x.isEmpty()) out.add(new Para(t, x));
        }
        return out;
    }
    /* ── 최소 zip 읽기(Node unzip과 같은 규칙) ── */
    static final Pattern ZIP_NAME = Pattern.compile("^(word/document\\.xml|xl/sharedStrings\\.xml|xl/worksheets/sheet\\d+\\.xml)$");
    static Map<String, String> unzip(byte[] buf) throws Exception {
        ByteBuffer b = ByteBuffer.wrap(buf).order(ByteOrder.LITTLE_ENDIAN); int e = -1;
        for (int i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (b.getInt(i) == 0x06054b50) { e = i; break; }
        if (e < 0) throw new Exception("zip");
        int n = b.getShort(e + 10) & 0xffff; int p = b.getInt(e + 16); Map<String, String> files = new LinkedHashMap<>(); long total = 0;
        for (int k = 0; k < n; k++) {
            if (b.getInt(p) != 0x02014b50) throw new Exception("zip");
            int method = b.getShort(p + 10) & 0xffff, csize = b.getInt(p + 20), nl = b.getShort(p + 28) & 0xffff, el = b.getShort(p + 30) & 0xffff, cl = b.getShort(p + 32) & 0xffff, off = b.getInt(p + 42);
            String name = new String(buf, p + 46, nl, StandardCharsets.UTF_8); p += 46 + nl + el + cl;
            if (!ZIP_NAME.matcher(name).matches()) continue;
            int ds = off + 30 + (b.getShort(off + 26) & 0xffff) + (b.getShort(off + 28) & 0xffff);
            byte[] raw = Arrays.copyOfRange(buf, ds, Math.min(buf.length, ds + csize)); byte[] data;
            if (method == 0) data = raw;
            else if (method == 8) { Inflater inf = new Inflater(true); inf.setInput(raw); java.io.ByteArrayOutputStream o = new java.io.ByteArrayOutputStream(); byte[] t = new byte[65536];
                try { while (!inf.finished()) { int r = inf.inflate(t); if (r == 0 && (inf.needsInput() || inf.needsDictionary())) break; o.write(t, 0, r); if (o.size() > 30 * 1024 * 1024) throw new Exception("zip"); } } finally { inf.end(); } data = o.toByteArray(); }
            else throw new Exception("zip");
            total += data.length; if (total > 60L * 1024 * 1024) throw new Exception("zip");
            files.put(name, new String(data, StandardCharsets.UTF_8));
        }
        return files;
    }
    static String tTexts(String s, Pattern re) { StringBuilder b = new StringBuilder(); Matcher m = re.matcher(s); while (m.find()) b.append(m.group(1)); return b.toString(); }
    static final Pattern W_P = Pattern.compile("<w:p\\b[^>]*?(?:/>|>(.*?)</w:p>)", DS), W_ST = Pattern.compile("<w:pStyle w:val=\"([^\"]*)\""), W_HEAD = Pattern.compile("^(heading|title|제목)", CI),
        W_T = Pattern.compile("<w:t(?:" + SW + "[^>]*)?>([^<]*)</w:t>"), X_SI = Pattern.compile("<si>(.*?)</si>", DS), X_T = Pattern.compile("<t(?:" + SW + "[^>]*)?>([^<]*)</t>"),
        X_SHEET = Pattern.compile("^xl/worksheets/sheet(\\d+)\\.xml$"), X_ROW = Pattern.compile("<row\\b[^>]*>(.*?)</row>", DS), X_C = Pattern.compile("<c\\b([^>]*?)(?:/>|>(.*?)</c>)", DS),
        X_TA = Pattern.compile("\\bt=\"([^\"]*)\""), X_V = Pattern.compile("<v>([^<]*)</v>");
    static List<Para> docxParas(Map<String, String> files) throws Exception {
        String xml = files.get("word/document.xml"); if (xml == null) throw new Exception("docx"); List<Para> out = new ArrayList<>();
        Matcher m = W_P.matcher(xml);
        while (m.find()) {
            String inner = m.group(1) == null ? "" : m.group(1); Matcher st = W_ST.matcher(inner); boolean hs = st.find();
            String x = Js.trim(decodeEnt(tTexts(inner, W_T))); if (x.isEmpty()) continue;
            out.add(new Para(hs && W_HEAD.matcher(st.group(1)).find() ? "h" : inner.contains("<w:numPr>") ? "li" : "p", x));
        }
        return out;
    }
    /** JS parseInt(s, 10) — 숫자가 없으면 null */
    public static Integer jsInt(String s) {
        if (s == null) return null; String t = Js.trim(s); int i = 0; boolean neg = false;
        if (i < t.length() && (t.charAt(i) == '+' || t.charAt(i) == '-')) { neg = t.charAt(i) == '-'; i++; }
        int st = i; while (i < t.length() && t.charAt(i) >= '0' && t.charAt(i) <= '9') i++;
        if (i == st) return null; try { long v = Long.parseLong(t.substring(st, Math.min(i, st + 12))); return (int) Math.max(Integer.MIN_VALUE, Math.min(Integer.MAX_VALUE, neg ? -v : v)); } catch (Exception e) { return null; }
    }
    static List<Para> xlsxParas(Map<String, String> files) throws Exception {
        String ss = files.getOrDefault("xl/sharedStrings.xml", ""); List<String> shared = new ArrayList<>();
        Matcher sm = X_SI.matcher(ss); while (sm.find()) shared.add(decodeEnt(tTexts(sm.group(1), X_T)));
        List<Object[]> sheets = new ArrayList<>();
        for (String k : files.keySet()) { Matcher m = X_SHEET.matcher(k); if (m.find()) sheets.add(new Object[]{ Integer.parseInt(m.group(1)), k }); }
        sheets.sort(Comparator.comparingInt(o -> (Integer) o[0]));
        if (sheets.isEmpty()) throw new Exception("xlsx"); List<Para> out = new ArrayList<>();
        for (Object[] sh : sheets) {
            out.add(new Para("h", "시트 " + sh[0]));
            Matcher r = X_ROW.matcher(files.get((String) sh[1]));
            while (r.find()) {
                List<String> cells = new ArrayList<>(); Matcher c = X_C.matcher(r.group(1));
                while (c.find()) {
                    String at = c.group(1), body = c.group(2) == null ? "" : c.group(2); Matcher tm = X_TA.matcher(at); String t = tm.find() ? tm.group(1) : ""; Matcher vm = X_V.matcher(body); boolean hv = vm.find();
                    String v;
                    if (t.equals("s")) { Integer i = hv ? jsInt(vm.group(1)) : null; v = i == null || i < 0 || i >= shared.size() ? "" : shared.get(i); }
                    else if (t.equals("inlineStr")) v = decodeEnt(tTexts(body, X_T)); else v = hv ? decodeEnt(vm.group(1)) : "";
                    v = Js.trim(v); if (!v.isEmpty()) cells.add(v);
                }
                if (!cells.isEmpty()) out.add(new Para("row", String.join(" | ", cells)));
            }
        }
        return out;
    }
    public static List<Para> extract(String ext, byte[] buf) throws Exception {
        List<Para> paras;
        if (ext.equals("docx")) paras = docxParas(unzip(buf));
        else if (ext.equals("xlsx")) paras = xlsxParas(unzip(buf));
        else {
            String s = new String(buf, StandardCharsets.UTF_8); if (s.startsWith("\ufeff")) s = s.substring(1); s = s.replaceAll("\r\n?", "\n");
            if (ext.equals("csv")) { paras = new ArrayList<>(); for (String l : s.split("\n", -1)) { String x = csvRow(l); if (!x.isEmpty()) paras.add(new Para("row", x)); } }
            else if (ext.equals("html") || ext.equals("htm")) paras = htmlParas(s);
            else paras = linesToParas(s, ext.equals("md"));
        }
        List<Para> o = new ArrayList<>(); for (Para p : Js.head(paras, 3000)) o.add(new Para(p.t(), Js.cut(p.x(), 4000))); return o;
    }
    public static List<String> chunk(List<Para> paras) {
        List<String> out = new ArrayList<>(); String cur = "";
        for (Para p : paras) {
            String x = p.x();
            while (x.length() > CHUNK) { if (!cur.isEmpty()) { out.add(cur); cur = ""; } out.add(x.substring(0, CHUNK)); x = x.substring(CHUNK); }
            if (x.isEmpty()) continue;
            if (!cur.isEmpty() && cur.length() + 1 + x.length() > CHUNK) { out.add(cur); cur = x; } else cur = cur.isEmpty() ? x : cur + "\n" + x;
        }
        if (!cur.isEmpty()) out.add(cur); return out;
    }
    static final Pattern TS = Pattern.compile("(?:(\\d{1,2}):)?(\\d{1,2}):(\\d{2})");
    public static List<Para> segment(List<Para> paras, int a, int b) {
        int[] ts = new int[paras.size()]; boolean any = false;
        for (int i = 0; i < ts.length; i++) { Matcher m = TS.matcher(paras.get(i).x()); ts[i] = m.find() ? (m.group(1) != null ? Integer.parseInt(m.group(1)) : 0) * 3600 + Integer.parseInt(m.group(2)) * 60 + Integer.parseInt(m.group(3)) : -1; if (ts[i] >= 0) any = true; }
        if (!any) return paras; List<Para> o = new ArrayList<>(); for (int i = 0; i < ts.length; i++) if (ts[i] >= 0 && ts[i] >= a && ts[i] < b) o.add(paras.get(i)); return o;
    }
    public static JsonNode jsonOut(String t) {
        int i = t.indexOf('{'), k = t.lastIndexOf('}'); if (i < 0 || k < i) return null;
        try { JsonNode o = DdWeb.JSON.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(t.substring(i, k + 1)); return o != null && o.isObject() ? o : null; } catch (Exception e) { return null; }
    }
    public static ArrayNode parasJson(List<Para> ps) { ArrayNode a = Js.F.arrayNode(); for (Para p : ps) { ObjectNode o = a.addObject(); o.put("t", p.t()); o.put("x", p.x()); } return a; }
    public static List<Para> parasOf(JsonNode a) { List<Para> l = new ArrayList<>(); for (JsonNode p : Js.arr(a)) l.add(new Para(p.get("t").asText(), p.get("x").asText())); return l; }
}
