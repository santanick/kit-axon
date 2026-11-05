package egovframework.didisam.cmm;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 개인정보 볼트 암호(Node pii.js와 바이트 단위로 같다 — 한쪽에서 쓴 행을 다른 쪽이 읽는다).
 *  - 키: env PII_KEY(32바이트, hex 64자 또는 base64) → HKDF-SHA256(salt 없음)으로 암호화 키(didisam-pii-enc-v1) · 색인 키(didisam-pii-bidx-v1) 분리
 *  - 값: AES-256-GCM, 형식 v1.{iv}.{tag}.{암호문}(base64url), AAD = "{tid}|{learner_id}|{항목}"
 *  - 조회: HMAC-SHA256 블라인드 인덱스(base64url)
 * 키 값은 로그 · 응답에 남기지 않는다.
 */
@Component
public class DdPiiCrypto {
    private final byte[] enc, idx;
    public DdPiiCrypto(@Value("${PII_KEY:}") String raw0) {
        byte[] k = keyBytes(raw0);
        if (k == null) { enc = null; idx = null; }
        else { enc = hkdf(k, "didisam-pii-enc-v1"); idx = hkdf(k, "didisam-pii-bidx-v1"); }
    }
    public boolean ready() { return enc != null; }

    /** Node piiKeys(): hex 64자 → hex, 아니면 base64(Node Buffer.from(…, 'base64')처럼 관대하게) */
    static byte[] keyBytes(String raw0) {
        String raw = Js.trim(raw0 == null ? "" : raw0); if (raw.isEmpty()) return null;
        byte[] k = raw.matches("(?i)[0-9a-f]{64}") ? HexFormat.of().parseHex(raw) : lenientB64(raw);
        return k.length == 32 ? k : null;
    }
    static byte[] lenientB64(String s) {
        ByteArrayOutputStream o = new ByteArrayOutputStream(); int acc = 0, bits = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i); int v;
            if (c >= 'A' && c <= 'Z') v = c - 'A'; else if (c >= 'a' && c <= 'z') v = c - 'a' + 26; else if (c >= '0' && c <= '9') v = c - '0' + 52;
            else if (c == '+' || c == '-') v = 62; else if (c == '/' || c == '_') v = 63; else if (c == '=') break; else continue;
            acc = (acc << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; o.write((acc >> bits) & 0xff); }
        }
        return o.toByteArray();
    }
    static byte[] hkdf(byte[] ikm, String info) {
        byte[] prk = hmac(new byte[32], ikm); // salt 없음 = HashLen 길이 0바이트(RFC 5869)
        byte[] in = (info + "\u0001").getBytes(StandardCharsets.UTF_8);
        return hmac(prk, in);
    }
    static byte[] hmac(byte[] key, byte[] msg) {
        try { Mac m = Mac.getInstance("HmacSHA256"); m.init(new SecretKeySpec(key, "HmacSHA256")); return m.doFinal(msg); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    private static final Base64.Encoder U = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder UD = Base64.getUrlDecoder();

    /** 블라인드 인덱스: HMAC(idx, "{tid}|{kind}|{trim · 소문자}") */
    public String bidx(String tid, String kind, String v) {
        return U.encodeToString(hmac(idx, (tid + "|" + kind + "|" + Js.trim(v).toLowerCase(Locale.ROOT)).getBytes(StandardCharsets.UTF_8)));
    }
    public String codeHash(String tid, String b, String code) { return U.encodeToString(hmac(idx, ("otp|" + tid + "|" + b + "|" + code).getBytes(StandardCharsets.UTF_8))); }
    public static String aad(String tid, String lid, String f) { return tid + "|" + lid + "|" + f; }

    public String enc(String v, String aad) {
        if (v == null || v.isEmpty()) return null;
        try {
            byte[] iv = new byte[12]; DdCrypto.RND.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(enc, "AES"), new GCMParameterSpec(128, iv));
            c.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
            byte[] out = c.doFinal(v.getBytes(StandardCharsets.UTF_8)); int n = out.length - 16;
            byte[] ct = java.util.Arrays.copyOfRange(out, 0, n), tag = java.util.Arrays.copyOfRange(out, n, out.length);
            return "v1." + U.encodeToString(iv) + "." + U.encodeToString(tag) + "." + U.encodeToString(ct);
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
    public String dec(String s, String aad) {
        if (s == null || s.isEmpty()) return "";
        String[] p = s.split("\\.", -1); if (!"v1".equals(p[0]) || p.length < 4) return "";
        try {
            byte[] iv = UD.decode(p[1]), tag = UD.decode(p[2]), ct = UD.decode(p[3]);
            byte[] in = new byte[ct.length + tag.length]; System.arraycopy(ct, 0, in, 0, ct.length); System.arraycopy(tag, 0, in, ct.length, tag.length);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(enc, "AES"), new GCMParameterSpec(128, iv));
            c.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
            return new String(c.doFinal(in), StandardCharsets.UTF_8);
        } catch (Exception e) { throw new IllegalStateException("pii decrypt failed"); }
    }
    public static String sha256Hex(String s) { return DdCrypto.sha(s); }
    public static boolean eqConst(String a, String b) { return a.length() == b.length() && MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8)); }
}
