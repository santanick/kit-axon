package egovframework.didisam.lms.p.service.impl;

import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdCrypto;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import egovframework.didisam.lms.p.service.LmsCryptoAdapter;
import egovframework.didisam.lms.p.service.LmsPService;
import jakarta.servlet.http.HttpServletRequest;
import java.security.SecureRandom;
import java.util.Base64;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

/** 묶음 P — 공통 · 비기능(Node mod-p.js와 같은 앱 계층 보강: 관리자 비밀번호 확인 · 토큰, 암호화 어댑터 점검, KOCW 기관명, 학습자 앱 세션) */
@Service("lmsPService")
public class LmsPServiceImpl extends EgovAbstractServiceImpl implements LmsPService {
    private static final SecureRandom RND = new SecureRandom();
    private final LmsPMapper mapper; private final LmsDispatch d; private final TenantTx tx; private final DdRateLimiter rl; private final LmsCryptoAdapter aria;
    public LmsPServiceImpl(LmsPMapper mapper, LmsDispatch d, TenantTx tx, DdRateLimiter rl, LmsCryptoAdapter aria) { this.mapper = mapper; this.d = d; this.tx = tx; this.rl = rl; this.aria = aria; }

    static String adminTok(HttpServletRequest req) { String t = req.getHeader("x-lms-admin"); return t != null && t.matches("^[A-Za-z0-9_-]{20,100}$") ? DdCrypto.sha(t) : ""; }
    ObjectNode describe() {
        boolean st; try { st = aria.ready() && "20261234|자체 점검".equals(aria.decrypt(aria.encrypt("20261234|자체 점검", "lms"), "lms")); } catch (Exception e) { st = false; }
        ObjectNode o = DdWeb.JSON.createObjectNode(); o.put("id", aria.id()); o.put("alg", aria.alg()); o.put("certified", aria.certified()); o.put("target", aria.target()); o.put("ready", aria.ready()); o.put("selftest", st); return o;
    }

    @Override public ResponseEntity<String> run(String op, String method, byte[] body, HttpServletRequest req) throws Exception {
        LmsDispatch.Pre pre = null; int max = LmsDispatch.BODY_MAX; String[] tok = { null };
        switch (op) {
            case "draft.save" -> max = 512 * 1024;
            case "perf.save" -> max = 256 * 1024;
            case "mig.import" -> max = 4 * 1024 * 1024;
            case "kocw" -> pre = (q, a, me) -> q.put("org_name", String.valueOf(a.get("name") == null ? "" : a.get("name")));
            case "admin.status", "admin.logout" -> pre = (q, a, me) -> q.put("token_hash", adminTok(req));
            case "crypto.status" -> pre = (q, a, me) -> q.set("adapter", describe());
            case "admin.login" -> pre = (q, a, me) -> {
                rl.limit("lmsadm:" + a.get("uid"), 20, 60000);
                String uid = String.valueOf(a.get("uid"));
                String pw = tx.plain(() -> mapper.selectPw(uid));
                String given = q.has("password") && q.get("password").isTextual() ? q.get("password").asText() : null;
                boolean ok; try { ok = pw != null && given != null && given.length() <= 200 && DdCrypto.checkPw(given, pw); } catch (Exception e) { ok = false; } q.put("pw_ok", ok); q.remove("password");
                byte[] b = new byte[32]; RND.nextBytes(b); tok[0] = Base64.getUrlEncoder().withoutPadding().encodeToString(b); q.put("token_hash", DdCrypto.sha(tok[0]));
            };
            default -> { }
        }
        String out = d.run(mapper::call, op, method, body, req, pre, max, "att.checkin".equals(op));
        if ("kocw".equals(op)) return ResponseEntity.ok().header("content-type", "application/xml; charset=utf-8").header("content-disposition", "attachment; filename=\"kocw-metadata.xml\"")
            .body(DdWeb.JSON.readTree(out).get("xml").asText());
        if ("admin.login".equals(op)) { ObjectNode o = (ObjectNode) DdWeb.JSON.readTree(out); o.put("token", tok[0]); out = o.toString(); }
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(out);
    }
}
