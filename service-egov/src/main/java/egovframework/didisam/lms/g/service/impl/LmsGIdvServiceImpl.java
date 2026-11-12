package egovframework.didisam.lms.g.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.lms.g.service.LmsGIdvService;
import egovframework.didisam.lms.h.service.impl.LmsEfhGateway;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/**
 * x3 · SFR-016 본인 확인 — Node service/server/lms/mod-g_idv.js와 같은 순서 · 같은 오류.
 *  상태(확인 요청 · 표 · 서명 횟수 · TOTP 계산)는 SQL 함수(sql/a3_integrity.sql lms_g_*)가 갖고,
 *  여기서는 WebAuthn clientDataJSON(종류 · origin) · authenticatorData(rpIdHash · UP · UV · 자격 ID) · 공개키 형식 · 서명을 검사한다.
 *  생체 정보는 기기 밖으로 나오지 않으며 서버는 공개키(SPKI DER)만 저장한다.
 */
@Service("lmsGIdvService")
public class LmsGIdvServiceImpl extends EgovAbstractServiceImpl implements LmsGIdvService {
    static final Map<String, LmsEfhGateway.Route> R = new LinkedHashMap<>();
    static {
        R.put("GET /api/lms/g/idv", new LmsEfhGateway.Route("lms_g_idv", "learner", 65536));
        R.put("POST /api/lms/g/wa-options", new LmsEfhGateway.Route("lms_g_wa_options", "learner", 4096));
        R.put("POST /api/lms/g/wa-register", new LmsEfhGateway.Route("lms_g_wa_reg_save", "learner", 16384));
        R.put("POST /api/lms/g/wa-verify", new LmsEfhGateway.Route("lms_g_wa_done", "learner", 16384));
        R.put("POST /api/lms/g/wa-delete", new LmsEfhGateway.Route("lms_g_wa_delete", "learner", 4096));
        R.put("POST /api/lms/g/totp-new", new LmsEfhGateway.Route("lms_g_totp_new", "learner", 4096));
        R.put("POST /api/lms/g/totp-verify", new LmsEfhGateway.Route("lms_g_totp_verify", "learner", 4096));
        R.put("POST /api/lms/g/email-code", new LmsEfhGateway.Route("lms_g_email_code", "learner", 4096));
        R.put("POST /api/lms/g/email-verify", new LmsEfhGateway.Route("lms_g_email_verify", "learner", 4096));
        R.put("GET /api/lms/g/idv-rule", new LmsEfhGateway.Route("lms_g_idv_rule", "staff", 65536));
        R.put("POST /api/lms/g/idv-rule", new LmsEfhGateway.Route("lms_g_idv_rule_save", "staff", 4096));
        R.put("GET /api/lms/g/idv-report", new LmsEfhGateway.Route("lms_g_idv_report", "staff", 65536));
        R.put("POST /api/lms/g/idv-mail-pull", new LmsEfhGateway.Route("lms_g_mail_pull", "staff", 4096));
    }
    static final LmsEfhGateway.Route GET_KEY = new LmsEfhGateway.Route("lms_g_wa_get", "learner", 16384);
    static final Map<String, Object[]> WERR = Map.of(
        "wa_bad", new Object[]{400, "패스키 응답 형식이 올바르지 않습니다."}, "wa_type", new Object[]{400, "패스키 응답 종류가 맞지 않습니다."},
        "wa_origin", new Object[]{400, "이 사이트에서 만든 패스키 응답이 아닙니다."}, "wa_rp", new Object[]{400, "이 사이트용 패스키가 아닙니다."},
        "wa_up", new Object[]{400, "기기에서 사용자 확인이 되지 않았습니다."}, "wa_uv", new Object[]{400, "기기 잠금(지문 · 얼굴 · PIN) 확인이 필요합니다."},
        "wa_key", new Object[]{400, "공개키를 읽을 수 없거나 서명 방식과 맞지 않습니다."}, "wa_sig", new Object[]{403, "패스키 서명이 맞지 않습니다. 본인 기기에서 다시 시도하세요."});
    static final Pattern B64U = Pattern.compile("^[A-Za-z0-9_-]+={0,2}$");
    static final Pattern CRED = Pattern.compile("^[A-Za-z0-9_-]{16,1400}$");
    static final BigInteger P256_N = new BigInteger("FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551", 16);

    private final LmsEfhGateway gw; private final LmsGIdvMapper mapper;
    public LmsGIdvServiceImpl(LmsEfhGateway gw, LmsGIdvMapper mapper) { this.gw = gw; this.mapper = mapper; }

    static DdException bad(String c) { Object[] e = WERR.get(c); return new DdException((Integer) e[0], (String) e[1], c); }
    private JsonNode run(LmsEfhGateway.Route r, HttpServletRequest req, byte[] body) throws Exception { return gw.run(r, req, body, (fn, ctx, a) -> mapper.call(fn, ctx, a)); }
    static String host(HttpServletRequest req) { String h = req.getHeader("host"); return h == null ? "" : h.trim().toLowerCase(Locale.ROOT); }
    static String rpId(HttpServletRequest req) { String e = System.getenv("WEBAUTHN_RP_ID"); return e != null && !e.isEmpty() ? e : host(req).replaceFirst(":\\d+$", ""); }
    static List<String> origins(HttpServletRequest req) {
        String e = System.getenv("WEBAUTHN_ORIGINS");
        if (e != null && !e.isEmpty()) { List<String> L = new ArrayList<>(); for (String s : e.split(",")) { s = s.trim(); if (!s.isEmpty()) L.add(s); } return L; }
        String xp = req.getHeader("x-forwarded-proto"); String p = xp == null ? "" : xp.split(",", -1)[0].trim();
        if (p.isEmpty()) p = req.isSecure() ? "https" : "http";
        return List.of(p + "://" + host(req));
    }
    static byte[] b64u(JsonNode v, int max) {
        if (v == null || !v.isTextual()) throw bad("wa_bad");
        String s = v.asText(); if (s.isEmpty() || s.length() > max || !B64U.matcher(s).matches()) throw bad("wa_bad");
        s = s.replace("=", ""); if (s.length() % 4 == 1) throw bad("wa_bad");
        try { return Base64.getUrlDecoder().decode(s); } catch (IllegalArgumentException x) { throw bad("wa_bad"); }
    }
    static String enc(byte[] b) { return Base64.getUrlEncoder().withoutPadding().encodeToString(b); }
    static byte[] sha256(byte[] b) throws Exception { return MessageDigest.getInstance("SHA-256").digest(b); }
    record Cd(byte[] raw, String challenge) {}
    static Cd clientData(HttpServletRequest req, JsonNode v, String type) {
        byte[] raw = b64u(v, 4096); JsonNode j;
        try { j = DdWeb.JSON.readTree(new String(raw, StandardCharsets.UTF_8)); } catch (Exception e) { throw bad("wa_bad"); }
        if (j == null || !j.isObject() || !j.path("challenge").isTextual()) throw bad("wa_bad");
        if (!j.path("type").isTextual() || !type.equals(j.get("type").asText())) throw bad("wa_type");
        if (!j.path("origin").isTextual() || !origins(req).contains(j.get("origin").asText())) throw bad("wa_origin");
        return new Cd(raw, j.get("challenge").asText());
    }
    record Ad(byte[] b, long count, String cred) {}
    static Ad authData(HttpServletRequest req, JsonNode v, boolean needCred) throws Exception {
        byte[] b = b64u(v, 4096); if (b.length < 37) throw bad("wa_bad");
        if (!Arrays.equals(Arrays.copyOfRange(b, 0, 32), sha256(rpId(req).getBytes(StandardCharsets.UTF_8)))) throw bad("wa_rp");
        int fl = b[32] & 0xff; if ((fl & 1) == 0) throw bad("wa_up"); if ((fl & 4) == 0) throw bad("wa_uv");
        long cnt = ByteBuffer.wrap(b, 33, 4).getInt() & 0xffffffffL; String cred = null;
        if (needCred) {
            if ((fl & 0x40) == 0 || b.length < 55) throw bad("wa_bad");
            int L = ((b[53] & 0xff) << 8) | (b[54] & 0xff); if (L < 1 || L > 1023 || b.length < 55 + L) throw bad("wa_bad");
            cred = enc(Arrays.copyOfRange(b, 55, 55 + L));
        }
        return new Ad(b, cnt, cred);
    }
    static PublicKey pubKey(byte[] spki, int alg) {
        try {
            X509EncodedKeySpec ks = new X509EncodedKeySpec(spki);
            if (alg == -7) { PublicKey k = KeyFactory.getInstance("EC").generatePublic(ks); if (((ECPublicKey) k).getParams().getOrder().equals(P256_N)) return k; }
            else if (alg == -257) { PublicKey k = KeyFactory.getInstance("RSA").generatePublic(ks); if (((RSAPublicKey) k).getModulus().bitLength() >= 2048) return k; }
            else if (alg == -8) return KeyFactory.getInstance("Ed25519").generatePublic(ks);
        } catch (Exception e) { /* 아래 */ }
        throw bad("wa_key");
    }
    static int algOf(JsonNode v) {
        Integer n = null;
        if (v != null && v.isNumber() && v.canConvertToInt() && v.asDouble() == Math.rint(v.asDouble())) n = (int) v.asDouble();
        else if (v != null && v.isTextual()) { try { int x = Integer.parseInt(v.asText()); if (Integer.toString(x).equals(v.asText())) n = x; } catch (NumberFormatException e) { n = null; } }
        if (n == null || !(n == -7 || n == -257 || n == -8)) throw bad("wa_key");
        return n;
    }
    static ObjectNode body(byte[] body, int max) {
        JsonNode b = DdWeb.readBody(body, max);
        if (b == null || !b.isObject()) throw new DdException(400, "입력값이 올바르지 않습니다.", "bad_input");
        return (ObjectNode) b;
    }
    static byte[] bytes(ObjectNode o) { return o.toString().getBytes(StandardCharsets.UTF_8); }

    @Override public JsonNode call(String key, HttpServletRequest req, byte[] raw) throws Exception {
        LmsEfhGateway.Route r = R.get(key);
        if (r == null) throw new DdException(404, "없는 주소입니다.", "not_found");
        if (key.startsWith("GET ")) return run(r, req, null);
        ObjectNode a = body(raw, r.max());
        switch (key) {
            case "POST /api/lms/g/wa-options": {
                JsonNode o = run(r, req, bytes(a));
                ObjectNode out = o.deepCopy(); out.put("rp_id", rpId(req)); return out;
            }
            case "POST /api/lms/g/wa-register": {
                Cd cd = clientData(req, a.get("client_data_json"), "webauthn.create"); Ad ad = authData(req, a.get("authenticator_data"), true);
                JsonNode ci = a.get("cred_id"); if (ci != null && !ci.isNull() && (!ci.isTextual() || !ci.asText().equals(ad.cred()))) throw bad("wa_bad");
                int alg = algOf(a.get("alg")); byte[] pk = b64u(a.get("public_key"), 2000); pubKey(pk, alg);
                ObjectNode n = DdWeb.JSON.createObjectNode();
                n.set("ch_id", a.get("ch_id")); n.put("challenge", cd.challenge()); n.put("cred_id", ad.cred()); n.put("public_key", enc(pk)); n.put("alg", alg);
                n.put("sign_count", ad.count()); n.put("uv", true); n.set("label", a.get("label"));
                return run(r, req, bytes(n));
            }
            case "POST /api/lms/g/wa-verify": {
                Cd cd = clientData(req, a.get("client_data_json"), "webauthn.get"); Ad ad = authData(req, a.get("authenticator_data"), false); byte[] sig = b64u(a.get("signature"), 1024);
                JsonNode ci = a.get("cred_id"); if (ci == null || !ci.isTextual() || !CRED.matcher(ci.asText()).matches()) throw bad("wa_bad");
                ObjectNode g = DdWeb.JSON.createObjectNode(); g.set("ch_id", a.get("ch_id")); g.put("challenge", cd.challenge()); g.put("cred_id", ci.asText());
                JsonNode k = run(GET_KEY, req, bytes(g));
                int alg = k.path("alg").asInt(); PublicKey pk = pubKey(Base64.getUrlDecoder().decode(k.path("public_key").asText()), alg);
                byte[] cdh = sha256(cd.raw()); byte[] data = new byte[ad.b().length + cdh.length];
                System.arraycopy(ad.b(), 0, data, 0, ad.b().length); System.arraycopy(cdh, 0, data, ad.b().length, cdh.length);
                boolean ok;
                try { Signature s = Signature.getInstance(alg == -7 ? "SHA256withECDSA" : alg == -257 ? "SHA256withRSA" : "Ed25519"); s.initVerify(pk); s.update(data); ok = s.verify(sig); }
                catch (Exception e) { ok = false; }
                if (!ok) throw bad("wa_sig");
                ObjectNode d = DdWeb.JSON.createObjectNode(); d.set("ch_id", a.get("ch_id")); d.put("cred_id", ci.asText()); d.put("sign_count", ad.count()); d.put("uv", true);
                return run(r, req, bytes(d));
            }
            default: return run(r, req, bytes(a));
        }
    }
}
