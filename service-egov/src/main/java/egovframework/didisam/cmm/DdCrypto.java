package egovframework.didisam.cmm;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.bouncycastle.crypto.generators.SCrypt;

/** Node 서버(app.js)와 바이트 단위로 같은 해시 · 토큰 규칙. 같은 DB의 계정 · 세션을 서로 쓸 수 있어야 한다. */
public final class DdCrypto {
    private DdCrypto() {}
    public static final SecureRandom RND = new SecureRandom();
    private static final int N = 16384, R = 8, P = 1, KEYLEN = 64;
    /** 없는 계정도 같은 시간이 걸리게 하는 더미 해시 */
    public static final String DUMMY = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Base64.getEncoder().encodeToString(new byte[64]);

    public static String sha(String s) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    public static String hashPw(String pw) {
        byte[] salt = new byte[16]; RND.nextBytes(salt);
        byte[] k = SCrypt.generate(pw.getBytes(StandardCharsets.UTF_8), salt, N, R, P, KEYLEN);
        Base64.Encoder b = Base64.getEncoder();
        return "scrypt$" + b.encodeToString(salt) + "$" + b.encodeToString(k);
    }
    public static boolean checkPw(String pw, String stored) {
        String[] a = String.valueOf(stored == null ? "" : stored).split("\\$", -1);
        if (a.length < 3 || !"scrypt".equals(a[0]) || a[1].isEmpty() || a[2].isEmpty()) return false;
        byte[] k = SCrypt.generate(pw.getBytes(StandardCharsets.UTF_8), Base64.getDecoder().decode(a[1]), N, R, P, KEYLEN);
        byte[] h = Base64.getDecoder().decode(a[2]);
        return h.length == k.length && MessageDigest.isEqual(h, k);
    }
    public static boolean safeEq(String a, String b) {
        return MessageDigest.isEqual(sha(a).getBytes(StandardCharsets.UTF_8), sha(b).getBytes(StandardCharsets.UTF_8));
    }
    public static String newTid() {
        String a = "abcdefghijkmnpqrstuvwxyz23456789"; byte[] b = new byte[10]; RND.nextBytes(b);
        StringBuilder s = new StringBuilder("tn_"); for (int i = 0; i < 10; i++) s.append(a.charAt((b[i] & 0xff) % a.length()));
        return s.toString();
    }
    public static String newToken() { byte[] b = new byte[32]; RND.nextBytes(b); return Base64.getUrlEncoder().withoutPadding().encodeToString(b); }
    public static String hmacHex(String key, String msg) {
        try { Mac m = Mac.getInstance("HmacSHA256"); m.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
              return HexFormat.of().formatHex(m.doFinal(msg.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
}
