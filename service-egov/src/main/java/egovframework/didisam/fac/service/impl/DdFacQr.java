package egovframework.didisam.fac.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdWeb;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** v40 QR 체크인 토큰(02 명세 5-5) — Node service/server/fac/qr.js와 같은 형식이어야 서로 발급한 토큰을 검증한다.
 *  token = "v1." + b64url(payload JSON) + "." + b64url(HMAC-SHA256(기관 키, "v1." + b64url(payload JSON)))   (b64url은 패딩 없음)
 *  payload = {t: tid, b|p|r: 예약 · 이용권 · 대여 id, f: facId, d: 'YYYY-MM-DD', nbf, exp(epoch 초), jti: 12바이트 base64url}. 키오스크는 "k1." 접두 {t, f, k:1, exp}
 *  기관 키 = HMAC-SHA256(주 키, tid)
 *  주 키 = env FAC_QR_KEY — 없으면 hex(HMAC-SHA256(PII_KEY, "didisam-fac-qr")). 둘 다 없으면 QR 꺼짐. */
public final class DdFacQr {
    private final byte[] master;
    private static final SecureRandom RND = new SecureRandom();
    private static final Base64.Encoder E = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder D = Base64.getUrlDecoder();

    public DdFacQr(String facQrKey, String piiKey) { this.master = masterKey(facQrKey, piiKey); }
    public boolean on() { return master != null; }

    /** Node qr.js와 같음: FAC_QR_KEY 문자열 그대로, 없으면 hex(HMAC-SHA256(PII_KEY 문자열, "didisam-fac-qr")) 문자열 — 둘 다 UTF-8 바이트로 키가 된다 */
    static byte[] masterKey(String fk, String pk) {
        if (fk != null && !fk.trim().isEmpty()) return fk.trim().getBytes(StandardCharsets.UTF_8);
        String raw = pk == null ? "" : pk.trim(); if (raw.isEmpty()) return null;
        StringBuilder h = new StringBuilder(); for (byte x : hmac(raw.getBytes(StandardCharsets.UTF_8), "didisam-fac-qr".getBytes(StandardCharsets.UTF_8))) h.append(String.format("%02x", x));
        return h.toString().getBytes(StandardCharsets.UTF_8);
    }
    static byte[] hex(String s) { byte[] b = new byte[s.length() / 2]; for (int i = 0; i < b.length; i++) b[i] = (byte) Integer.parseInt(s.substring(i * 2, i * 2 + 2), 16); return b; }
    static byte[] hmac(byte[] key, byte[] msg) { try { Mac m = Mac.getInstance("HmacSHA256"); m.init(new SecretKeySpec(key, "HmacSHA256")); return m.doFinal(msg); } catch (Exception e) { throw new IllegalStateException(e); } }
    byte[] tenantKey(String tid) { return hmac(master, tid.getBytes(StandardCharsets.UTF_8)); }

    String sign(String tid, String pfx, ObjectNode p) { String body = pfx + "." + E.encodeToString(p.toString().getBytes(StandardCharsets.UTF_8)); return body + "." + E.encodeToString(hmac(tenantKey(tid), body.getBytes(StandardCharsets.UTF_8))); }
    /** 입장 토큰 v1 — kind: b(예약) | p(이용권) | r(대여), nbf · exp는 epoch 초 */
    public String issue(String tid, String kind, String id, String fac, String day, long nbf, long exp) {
        ObjectNode p = DdWeb.JSON.createObjectNode(); p.put("t", tid); p.put(kind, id); p.put("f", fac); p.put("d", day); p.put("nbf", nbf); p.put("exp", exp);
        byte[] j = new byte[12]; RND.nextBytes(j); p.put("jti", E.encodeToString(j)); return sign(tid, "v1", p);
    }
    /** 키오스크 토큰 k1 — {t, f, k:1, exp} */
    public String kiosk(String tid, String fac, long exp) { ObjectNode p = DdWeb.JSON.createObjectNode(); p.put("t", tid); p.put("f", fac); p.put("k", 1); p.put("exp", exp); return sign(tid, "k1", p); }
    /** 서명 · 기관 확인만(만료 판단은 호출 쪽). 실패면 null */
    public JsonNode verify(String tid, String token) { return open(tid, token, "v1"); }
    public JsonNode openKiosk(String tid, String token) { JsonNode p = open(tid, token, "k1"); return p != null && p.path("k").asInt() == 1 && p.path("exp").asLong() > System.currentTimeMillis() / 1000 ? p : null; }
    JsonNode open(String tid, String token, String pfx) {
        if (master == null || token == null) return null;
        String[] a = token.trim().split("\\."); if (a.length != 3 || !pfx.equals(a[0]) || !a[1].matches("[A-Za-z0-9_-]{10,800}") || !a[2].matches("[A-Za-z0-9_-]{43}")) return null;
        try {
            byte[] want = hmac(tenantKey(tid), (a[0] + "." + a[1]).getBytes(StandardCharsets.UTF_8));
            if (!MessageDigest.isEqual(want, D.decode(a[2]))) return null;
            JsonNode p = DdWeb.JSON.readTree(new String(D.decode(a[1]), StandardCharsets.UTF_8));
            return p != null && p.isObject() && tid.equals(p.path("t").asText()) ? p : null;
        } catch (Exception e) { return null; }
    }
}
