package egovframework.didisam.lms.k.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * 묶음 공통 실행기(Node mod-k.js bind와 같은 순서): 권한 → 본문 검사 → 기관 트랜잭션(TenantTx) 안에서 DB 함수 호출 → 변경이면 감사 기록.
 * DB 함수가 낸 업무 오류(DD|상태|코드|문구)는 {error, message} 응답으로 바꾼다.
 */
@Component
public class LmsCall {
    /** 경로 표 한 줄: 메서드 · 이름 · op · 권한(o s t) · 변경 여부 */
    public record Route(String method, String name, String op, String roles, boolean write) { }
    public static Route r(String m, String n, String op, String roles) { return new Route(m, n, op, roles, false); }
    public static Route w(String m, String n, String op, String roles) { return new Route(m, n, op, roles, true); }
    private static final Map<Character, String> ROLE = Map.of('o', "owner", 's', "sub", 't', "teacher");
    private static final Pattern DD = Pattern.compile("^DD\\|(\\d{3})\\|([a-z_]+)\\|([\\s\\S]*)$");

    private final LmsCallMapper mapper; private final TenantTx tx;
    public LmsCall(LmsCallMapper mapper, TenantTx tx) { this.mapper = mapper; this.tx = tx; }

    public static Route find(List<Route> routes, String method, String name) {
        for (Route x : routes) if (x.method().equals(method) && x.name().equals(name)) return x;
        return null;
    }

    public JsonNode run(String pfx, Route rt, Map<String, Object> a, HttpServletRequest req, byte[] body) throws Exception {
        String role = String.valueOf(a.get("role"));
        boolean okRole = false; for (char c : rt.roles().toCharArray()) if (role.equals(ROLE.get(c))) okRole = true;
        if (!okRole) throw new DdException(403, "이 작업을 할 권한이 없습니다.", "role");
        JsonNode args;
        if ("GET".equals(rt.method())) {
            ObjectNode o = DdWeb.JSON.createObjectNode();
            String qs = req.getQueryString();
            if (qs != null) for (String kv : qs.split("&")) {
                if (kv.isEmpty()) continue; int i = kv.indexOf('=');
                String k = java.net.URLDecoder.decode(i < 0 ? kv : kv.substring(0, i), java.nio.charset.StandardCharsets.UTF_8);
                String v = i < 0 ? "" : java.net.URLDecoder.decode(kv.substring(i + 1), java.nio.charset.StandardCharsets.UTF_8);
                o.put(k, v);
            }
            args = o;
        } else {
            args = DdWeb.readBody(body, 2 * 1024 * 1024);
            if (!args.isObject()) throw new DdException(400, "형식이 올바르지 않습니다.", "bad_json");
        }
        ObjectNode actor = DdWeb.JSON.createObjectNode(); actor.put("role", role); actor.put("email", String.valueOf(a.get("email")));
        String tid = (String) a.get("tid"); String email = String.valueOf(a.get("email"));
        final JsonNode fargs = args;
        try {
            return tx.inTenant(tid, () -> {
                String s = mapper.call(pfx, rt.op(), actor.toString(), fargs.toString());
                JsonNode j = s == null ? DdWeb.JSON.nullNode() : DdWeb.JSON.readTree(s);
                if (rt.write()) {
                    JsonNode id = null; for (String k : new String[] { "survey_id", "program_id", "course_id", "id" }) if (id == null && j.hasNonNull(k)) id = j.get(k);
                    ObjectNode d = DdWeb.JSON.createObjectNode(); if (id == null) d.putNull("id"); else d.set("id", id);
                    mapper.insertAudit(tid, email, "lms." + pfx + "." + rt.op(), d.toString());
                }
                return j;
            });
        } catch (Exception e) {
            Throwable t = e;
            while (t != null) {
                String m = t instanceof org.postgresql.util.PSQLException p && p.getServerErrorMessage() != null ? p.getServerErrorMessage().getMessage() : null;
                if (m != null) { Matcher x = DD.matcher(m); if (x.matches()) throw new DdException(Integer.parseInt(x.group(1)), x.group(3), x.group(2)); }
                t = t.getCause();
            }
            throw e;
        }
    }
}
