import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdPiiCrypto;
import egovframework.didisam.lms.p.service.impl.InterimAesGcmAdapter;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** v47.5 GCM 태그 128비트 고정 — Node↔Java 교차 복호화 대조(service/test/gcm.test.js가 띄운다).
 *  입력 JSON {key, items:[{kind(pii · aria · mfa), aad, ct}]} → 출력 JSON {results:[{ok, got}], made:[{kind, aad, ct, plain}]}
 *  pii 형식(v1.iv.tag.ct)은 DdPiiCrypto — DdStateCrypto · 원장 · AI 게이트웨이가 같은 함수를 쓴다. mfa는 LoginMfa와 같은 JCE 호출(패키지 전용이라 같은 식으로 재현).
 *  실행: (빌드 후) cd service-egov && java -cp "target/classes:target/didisam-egov/WEB-INF/lib/*" test/GcmVectors.java in.json */
public class GcmVectors {
    static final ObjectMapper M = new ObjectMapper();
    static byte[] mfaKey(String pii) throws Exception { return MessageDigest.getInstance("SHA-256").digest(("dd-totp|" + pii).getBytes(StandardCharsets.UTF_8)); }
    static String mfaEnc(byte[] key, String s) throws Exception { byte[] iv = new byte[12]; new SecureRandom().nextBytes(iv); Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv)); byte[] ct = c.doFinal(s.getBytes(StandardCharsets.UTF_8)); return "v1:" + Base64.getUrlEncoder().withoutPadding().encodeToString(ByteBuffer.allocate(12 + ct.length).put(iv).put(ct).array()); }
    static String mfaDec(byte[] key, String s) throws Exception { byte[] b = Base64.getUrlDecoder().decode(s.substring(3)); if (b.length < 28) throw new IllegalStateException("gcm_tag"); Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, b, 0, 12)); return new String(c.doFinal(b, 12, b.length - 12), StandardCharsets.UTF_8); }
    public static void main(String[] a) throws Exception {
        JsonNode in = M.readTree(Files.readString(Path.of(a[0])));
        String key = in.get("key").asText();
        DdPiiCrypto pii = new DdPiiCrypto(key); InterimAesGcmAdapter aria = new InterimAesGcmAdapter(key); byte[] mk = mfaKey(key);
        ObjectNode out = M.createObjectNode(); ArrayNode res = out.putArray("results"), made = out.putArray("made");
        for (JsonNode it : in.get("items")) {
            String kind = it.get("kind").asText(), aad = it.path("aad").asText(""), ct = it.get("ct").asText();
            ObjectNode r = res.addObject();
            try {
                String got = switch (kind) { case "pii" -> pii.dec(ct, aad); case "aria" -> aria.decrypt(ct, aad); default -> mfaDec(mk, ct); };
                r.put("ok", true); r.put("got", got);
            } catch (Exception e) { r.put("ok", false); }
        }
        String plain = "자바 암호문 · Java-made 01012345678";
        made.addObject().put("kind", "pii").put("aad", "t1|L1|email").put("ct", pii.enc(plain, "t1|L1|email")).put("plain", plain);
        made.addObject().put("kind", "aria").put("aad", "t1|att").put("ct", aria.encrypt(plain, "t1|att")).put("plain", plain);
        made.addObject().put("kind", "mfa").put("aad", "").put("ct", mfaEnc(mk, plain)).put("plain", plain);
        System.out.println(M.writeValueAsString(out));
    }
}
