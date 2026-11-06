package egovframework.didisam.lms.p.service.impl;

import egovframework.didisam.lms.p.service.LmsCryptoAdapter;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** 검증필 ARIA 모듈 연결 전 임시 어댑터: AES-256-GCM(PII_KEY) — Node aria.js interim과 같은 형식 */
@Component
public class InterimAesGcmAdapter implements LmsCryptoAdapter {
    private final byte[] key; private static final SecureRandom RND = new SecureRandom();
    public InterimAesGcmAdapter(@Value("${PII_KEY:}") String hex) { this.key = hex != null && hex.matches("(?i)^[0-9a-f]{64}$") ? HexFormat.of().parseHex(hex) : null; }
    @Override public String id() { return "interim-aes-gcm"; }
    @Override public String alg() { return "AES-256-GCM"; }
    @Override public boolean certified() { return false; }
    @Override public String target() { return "ARIA-256-GCM(KCMVP 검증필 모듈)"; }
    @Override public boolean ready() { return key != null; }
    @Override public String encrypt(String plain, String aad) throws Exception {
        if (key == null) throw new IllegalStateException("키 없음");
        byte[] iv = new byte[12]; RND.nextBytes(iv);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv)); c.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        byte[] o = c.doFinal(plain.getBytes(StandardCharsets.UTF_8)); // 본문 + tag(16)
        ByteBuffer b = ByteBuffer.allocate(12 + o.length); b.put(iv); b.put(o, o.length - 16, 16); b.put(o, 0, o.length - 16);
        return "v1:" + Base64.getUrlEncoder().withoutPadding().encodeToString(b.array());
    }
    @Override public String decrypt(String ct, String aad) throws Exception {
        if (key == null) throw new IllegalStateException("키 없음");
        byte[] raw = Base64.getUrlDecoder().decode(ct.substring(3));
        byte[] body = new byte[raw.length - 12]; System.arraycopy(raw, 28, body, 0, raw.length - 28); System.arraycopy(raw, 12, body, raw.length - 28, 16);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, raw, 0, 12)); c.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        return new String(c.doFinal(body), StandardCharsets.UTF_8);
    }
}
