package egovframework.didisam.market.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.TenantTx;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.stereotype.Component;
import static egovframework.didisam.cmm.Js.*;

/** 마켓 교차 표(mk_*) 질의 — Node market 모듈과 같은 SQL 문장을 그대로 쓴다($n 자리표시).
 *  마켓 표는 기관 역할(didisam_tenant) 권한이 없는 교차 표라 로그인 계정 트랜잭션(TenantTx.plain)에서만 부른다(Node tx(c => …)와 같음).
 *  값 전달은 node-postgres와 같게: 문자열 · 숫자 · 참거짓은 형식 미지정(text) 값, 배열은 '{…}' 배열 표기, 객체 · JsonNode는 JSON 문자열.
 *  결과 변환도 node-postgres 기본과 같게: timestamptz → ISO(ms, Z), int8 · numeric → 문자열, json · jsonb → 값, 배열 → 배열. */
@Component
public class MkDb {
    private final DataSource ds; private final TenantTx tx;
    public MkDb(DataSource ds, TenantTx tx) { this.ds = ds; this.tx = tx; }
    static final Pattern PH = Pattern.compile("\\$(\\d+)");
    static final java.time.format.DateTimeFormatter ISO = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(java.time.ZoneOffset.UTC);

    /** Node tx(fn): 한 트랜잭션(begin · commit · rollback) */
    public <T> T tx(TenantTx.Work<T> fn) throws Exception { return tx.plain(fn); }

    /** node-postgres prepareValue */
    static String lit(Object v) {
        if (v instanceof JsonNode) { JsonNode j = (JsonNode) v; if (j.isNull() || j.isMissingNode()) return null; if (j.isTextual()) return j.textValue(); if (j.isNumber()) return numStr(j.doubleValue()); if (j.isBoolean()) return j.booleanValue() ? "true" : "false";
            if (j.isArray()) { List<Object> l = new ArrayList<>(); j.forEach(l::add); return arrLit(l); } return j.toString(); }
        if (v instanceof Collection) return arrLit((Collection<?>) v);
        if (v instanceof Object[]) return arrLit(java.util.Arrays.asList((Object[]) v));
        if (v instanceof Boolean) return (Boolean) v ? "true" : "false";
        if (v instanceof Double || v instanceof Float) return numStr(((Number) v).doubleValue());
        if (v instanceof java.util.Map) return egovframework.didisam.cmm.DdWeb.JSON.valueToTree(v).toString();
        return String.valueOf(v);
    }
    static String arrLit(Collection<?> l) {
        StringBuilder b = new StringBuilder("{"); boolean first = true;
        for (Object x : l) { if (!first) b.append(','); first = false; String s = x == null ? null : lit(x);
            if (s == null || (x instanceof JsonNode && ((JsonNode) x).isNull())) b.append("NULL"); else if (x instanceof Collection || (x instanceof JsonNode && ((JsonNode) x).isArray())) b.append(s); else b.append('"').append(s.replace("\\", "\\\\").replace("\"", "\\\"")).append('"'); }
        return b.append('}').toString();
    }

    public List<ObjectNode> q(String sql, Object... a) {
        Matcher mt = PH.matcher(sql); StringBuilder sb = new StringBuilder(); List<String> args = new ArrayList<>();
        while (mt.find()) { mt.appendReplacement(sb, "?"); args.add(lit(a[Integer.parseInt(mt.group(1)) - 1])); } mt.appendTail(sb);
        java.sql.Connection c = DataSourceUtils.getConnection(ds);
        try (java.sql.PreparedStatement ps = c.prepareStatement(sb.toString())) {
            for (int i = 0; i < args.size(); i++) { if (args.get(i) == null) ps.setNull(i + 1, java.sql.Types.NULL); else ps.setObject(i + 1, args.get(i), java.sql.Types.OTHER); }
            List<ObjectNode> L = new ArrayList<>(); if (!ps.execute()) return L;
            try (java.sql.ResultSet rs = ps.getResultSet()) { java.sql.ResultSetMetaData md = rs.getMetaData();
                while (rs.next()) { ObjectNode o = F.objectNode(); for (int i = 1; i <= md.getColumnCount(); i++) o.set(md.getColumnLabel(i), val(rs.getObject(i))); L.add(o); } }
            return L;
        } catch (java.sql.SQLException e) {
            if ("23505".equals(e.getSQLState())) throw new org.springframework.dao.DuplicateKeyException(e.getMessage(), e);
            throw new org.springframework.jdbc.UncategorizedSQLException("market", sb.toString(), e);
        } finally { DataSourceUtils.releaseConnection(c, ds); }
    }
    public ObjectNode q1(String sql, Object... a) { List<ObjectNode> L = q(sql, a); return L.isEmpty() ? null : L.get(0); }
    public int x(String sql, Object... a) {
        Matcher mt = PH.matcher(sql); StringBuilder sb = new StringBuilder(); List<String> args = new ArrayList<>();
        while (mt.find()) { mt.appendReplacement(sb, "?"); args.add(lit(a[Integer.parseInt(mt.group(1)) - 1])); } mt.appendTail(sb);
        java.sql.Connection c = DataSourceUtils.getConnection(ds);
        try (java.sql.PreparedStatement ps = c.prepareStatement(sb.toString())) {
            for (int i = 0; i < args.size(); i++) { if (args.get(i) == null) ps.setNull(i + 1, java.sql.Types.NULL); else ps.setObject(i + 1, args.get(i), java.sql.Types.OTHER); }
            ps.execute(); return Math.max(0, ps.getUpdateCount());
        } catch (java.sql.SQLException e) {
            if ("23505".equals(e.getSQLState())) throw new org.springframework.dao.DuplicateKeyException(e.getMessage(), e);
            throw new org.springframework.jdbc.UncategorizedSQLException("market", sb.toString(), e);
        } finally { DataSourceUtils.releaseConnection(c, ds); }
    }

    static JsonNode val(Object v) {
        if (v == null) return F.nullNode();
        if (v instanceof java.sql.Timestamp) return t(ISO.format(((java.sql.Timestamp) v).toInstant()));
        if (v instanceof java.time.OffsetDateTime) return t(ISO.format(((java.time.OffsetDateTime) v).toInstant()));
        if (v instanceof java.sql.Date) return t(ISO.format(((java.sql.Date) v).toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant()));
        if (v instanceof Long || v instanceof BigDecimal) return t(v.toString());
        if (v instanceof Integer || v instanceof Short) return F.numberNode(((Number) v).intValue());
        if (v instanceof Double || v instanceof Float) return numNode(((Number) v).doubleValue());
        if (v instanceof Boolean) return F.booleanNode((Boolean) v);
        if (v instanceof org.postgresql.util.PGobject) { org.postgresql.util.PGobject o = (org.postgresql.util.PGobject) v; String s = o.getValue(); if (s == null) return F.nullNode(); return "json".equals(o.getType()) || "jsonb".equals(o.getType()) ? parse(s) : t(s); }
        if (v instanceof java.sql.Array) { try { Object[] a = (Object[]) ((java.sql.Array) v).getArray(); ArrayNode o = F.arrayNode(); for (Object x : a) o.add(val(x)); return o; } catch (Exception e) { return F.nullNode(); } }
        return t(String.valueOf(v));
    }
}
