package egovframework.didisam.mileage.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.auth.service.AuthService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.fac.service.impl.FacErr;
import egovframework.didisam.mileage.service.MileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/** v42 학습 마일리지(04-data-api) — Node service/server/mileage(index · mod-admin · mod-pub)와 같은 /api · 오류 코드 · 응답 JSON.
 *  업무 규칙은 SQL 함수 mil_*(Node 마이그레이션 소유)에 있고, 여기서는 경로 · 권한 · 기관 플래그 · 속도 제한 · 감사만 한다. */
@Service("mileService")
public class MileServiceImpl extends EgovAbstractServiceImpl implements MileService {
    private final MileMapper m; private final TenantTx tx; private final DdRateLimiter rl; private final AuthService auth; private final DdWeb web;
    public MileServiceImpl(MileMapper m, TenantTx tx, DdRateLimiter rl, AuthService auth, DdWeb web) { this.m = m; this.tx = tx; this.rl = rl; this.auth = auth; this.web = web; }

    /** 부를 수 있는 SQL 함수(이름은 매퍼에서 문자열 치환 — 이 목록 밖 이름은 거절) */
    static final Set<String> FN = Set.of();
    static DdException E(int st, String code, String msg) { return new DdException(st, msg, code); }
    static DdException E(int st, String code, String msg, Map<String, Object> extra) { return new FacErr(st, code, msg, extra); }
    static Map<String, Object> map(Object... kv) { Map<String, Object> o = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]); return o; }
    static String json(Object o) { return DdWeb.JSON.valueToTree(o).toString(); }
    static String tid(Map<String, Object> a) { return (String) a.get("tid"); }

    void needOn(String tid) { Map<String, Object> r = m.selectOn(tid); if (r == null) throw E(404, "tenant", "없는 기관입니다."); if (!"true".equals(r.get("v"))) throw E(403, "mile_off", "학습 마일리지를 켜지 않은 기관입니다."); }
    <T> T T(String tid, TenantTx.Work<T> fn) throws Exception { return tx.inTenant(tid, () -> { needOn(tid); return fn.run(); }); }

    /** SQL 오류 메시지 「mil:<code>:<status>:<message>」 → API 오류 */
    static final Pattern ERR = Pattern.compile("mil:([a-z_]+):(\\d{3}):([^\\n]*)");
    JsonNode call(String fn, String tid, Object args) {
        if (!FN.contains(fn)) throw new IllegalStateException("fn " + fn);
        try { return parse(m.call(fn, tid, args instanceof String ? (String) args : json(args))); }
        catch (org.springframework.dao.DataAccessException e) { Throwable c = e.getMostSpecificCause(); Matcher x = ERR.matcher(String.valueOf(c.getMessage())); if (x.find()) throw E(Integer.parseInt(x.group(2)), x.group(1), x.group(3).trim()); throw e; }
    }

    @Override public Object admin(HttpServletRequest req, HttpServletResponse res, String op, String id, byte[] body) throws Exception {
        throw E(404, "not_found", "없는 주소입니다.");
    }

    @Override public Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception {
        throw E(404, "not_found", "없는 주소입니다.");
    }
    static String who(LAuth lauth) throws Exception { Map<String, Object> s = lauth.get(); if (s == null) throw E(401, "auth", "로그인이 필요해요."); return (String) s.get("sid"); }
    static ObjectNode obj() { return F.objectNode(); }
}
