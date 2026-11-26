package egovframework.didisam.auth.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.cmm.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** 보안 4차 #1 관리자 추가 인증 — Node service/server/mfa.js와 같은 규칙 · 같은 응답 · 같은 오류 코드.
 *  이메일 인증번호 6자리(CSPRNG · 10분 · 5회 · 1회용 · 해시 저장) 기본, 본인 선택 인증 앱(TOTP RFC 6238 · SHA1 · 30초 · ±1창 · 재사용 방지).
 *  기관 정책 org.sec.mfa('email' | 'totp'). MFA_OFF=1은 시험 · 데모 전용. MFA_DEV=1이고 메일 미설정이면 devCode. */
@Component
public class LoginMfa extends EgovAbstractServiceImpl {
    static final String B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; static final SecureRandom RND = new SecureRandom();
    private final MfaMapper m; private final TenantTx tx; private final DdProps p; private final DdWeb web; private final DdMail mail; private final DdRateLimiter rl;
    public final boolean off; final boolean dev; final byte[] key;
    public LoginMfa(MfaMapper m, TenantTx tx, DdProps p, DdWeb web, DdMail mail, DdRateLimiter rl, @Value("${MFA_OFF:}") String off, @Value("${MFA_DEV:}") String dev, @Value("${PII_KEY:}") String piiKey) throws Exception {
        this.m = m; this.tx = tx; this.p = p; this.web = web; this.mail = mail; this.rl = rl; this.off = "1".equals(off.trim()); this.dev = "1".equals(dev.trim());
        this.key = MessageDigest.getInstance("SHA-256").digest(("dd-totp|" + (!piiKey.isEmpty() ? piiKey : p.pepper)).getBytes(StandardCharsets.UTF_8));
        if (this.off) org.slf4j.LoggerFactory.getLogger(LoginMfa.class).warn("MFA_OFF=1: 운영자 2단계 인증을 건너뜁니다(시험 · 데모 전용).");
    }
    String ck() { return p.secure ? "__Host-dd_mfa" : "dd_mfa"; }

    static String b32(byte[] buf) { StringBuilder o = new StringBuilder(); int bits = 0, v = 0; for (byte x : buf) { v = ((v << 8) | (x & 255)) & 0xffff; bits += 8; while (bits >= 5) { o.append(B32.charAt((v >>> (bits - 5)) & 31)); bits -= 5; } } if (bits > 0) o.append(B32.charAt((v << (5 - bits)) & 31)); return o.toString(); }
    static byte[] unb32(String s) { String t = s == null ? "" : s.toUpperCase(Locale.ROOT).replaceAll("[\\s=]", ""); int bits = 0, v = 0; java.io.ByteArrayOutputStream o = new java.io.ByteArrayOutputStream(); for (char ch : t.toCharArray()) { int i = B32.indexOf(ch); if (i < 0) return null; v = ((v << 5) | i) & 0xffff; bits += 5; if (bits >= 8) { o.write((v >>> (bits - 8)) & 255); bits -= 8; } } return o.toByteArray(); }
    static String hotp(byte[] k, long ctr) throws Exception { Mac mac = Mac.getInstance("HmacSHA1"); mac.init(new SecretKeySpec(k, "HmacSHA1")); byte[] h = mac.doFinal(ByteBuffer.allocate(8).putLong(ctr).array()); int o = h[19] & 15; int n = (((h[o] & 127) << 24) | ((h[o + 1] & 255) << 16) | ((h[o + 2] & 255) << 8) | (h[o + 3] & 255)) % 1000000; return String.format("%06d", n); }
    static long totpCheck(byte[] k, String code, long last) throws Exception { long t = System.currentTimeMillis() / 30000L; for (long d : new long[]{-1, 0, 1}) { long s = t + d; if (s > last && hotp(k, s).equals(code)) return s; } return 0; }
    static boolean codeOk(String c) { return c != null && c.matches("^\\d{6}$"); }
    static String mask(String e) { String[] a = String.valueOf(e).split("@", 2); String l = a[0], d = a.length > 1 ? a[1] : ""; return (l.length() <= 2 ? l.charAt(0) + "*" : l.substring(0, 2) + "*".repeat(Math.min(6, l.length() - 2))) + "@" + d; }
    String enc(String s) throws Exception { byte[] iv = new byte[12]; RND.nextBytes(iv); Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv)); byte[] ct = c.doFinal(s.getBytes(StandardCharsets.UTF_8)); return "v1:" + Base64.getUrlEncoder().withoutPadding().encodeToString(ByteBuffer.allocate(12 + ct.length).put(iv).put(ct).array()); }
    String dec(String s) throws Exception { if (s == null || !s.startsWith("v1:")) return ""; byte[] b = Base64.getUrlDecoder().decode(s.substring(3)); if (b.length < 28) throw new IllegalStateException("gcm_tag"); Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, b, 0, 12)); return new String(c.doFinal(b, 12, b.length - 12), StandardCharsets.UTF_8); }
    static String codeHash(String id, String code) { return DdCrypto.sha("mfa|" + id + "|" + code); }
    void cookie(HttpServletResponse res, String tok, int sec) { res.addHeader("set-cookie", ck() + "=" + tok + "; Path=/api/login; HttpOnly; SameSite=Strict; Max-Age=" + sec + (p.secure ? "; Secure" : "")); }

    public String policy(String tid) { try { String v = tx.inTenant(tid, () -> m.selectPolicy(tid)); return "totp".equals(v) ? "totp" : "email"; } catch (Exception e) { return "email"; } }
    boolean has(Map<String, Object> t, String f) { return t != null && t.get(f) != null && !String.valueOf(t.get(f)).isEmpty(); }

    Map<String, Object> sendCode(String id, String email, String tid) throws Exception {
        String code = String.format("%06d", RND.nextInt(1000000));
        m.setCode(id, codeHash(id, code));
        if (mail.on) {
            String org = Objects.toString(m.selectTenantName(tid), "디디쌤"); if (org.length() > 40) org = org.substring(0, 40);
            try { mail.send(email, "[" + org + "] 디디쌤 스튜디오 로그인 인증번호", "디디쌤 스튜디오 로그인 인증번호는 " + code + " 입니다.\n\n- 10분 동안 한 번만 쓸 수 있습니다.\n- 본인이 로그인하지 않았다면 이 메일을 무시하고 비밀번호를 변경하십시오.\n- 인증번호는 누구에게도 알려 주지 마십시오(디디쌤은 인증번호를 묻지 않습니다)."); }
            catch (Exception e) { throw processException("dd.503.mfa_mail.send"); }
            return new LinkedHashMap<>();
        }
        if (dev) { Map<String, Object> o = new LinkedHashMap<>(); o.put("devCode", code); return o; }
        throw processException("dd.503.mfa_mail");
    }

    /** 비밀번호 · 소셜 확인 뒤: 세션 대신 티켓. via가 있으면(소셜) 쿠키로도 넘긴다 */
    public Map<String, Object> start(HttpServletResponse res, String uid, String tid, String email, String via) throws Exception {
        String pol = policy(tid); Map<String, Object> t = m.selectTotp(uid); boolean hasTotp = has(t, "secret"); String kind = hasTotp ? "totp" : "email";
        String tok = DdCrypto.newToken(); String id = DdCrypto.sha(tok);
        m.deleteOld(uid); m.insertTicket(id, uid, tid, kind, via == null ? "" : via);
        Map<String, Object> o = new LinkedHashMap<>(); o.put("mfa", kind); o.put("ticket", tok);
        if ("email".equals(kind)) { o.put("to", mask(email)); o.putAll(sendCode(id, email, tid)); }
        if (via != null && !via.isEmpty()) cookie(res, tok, 300);
        if ("totp".equals(pol) && !hasTotp) o.put("totpSetup", true);
        return o;
    }

    String ticketOf(HttpServletRequest req, JsonNode b) {
        String t = DdWeb.str(b, "ticket");
        if (t.isEmpty() && req.getCookies() != null) for (Cookie c : req.getCookies()) if (ck().equals(c.getName())) t = c.getValue();
        return t != null && t.matches("^[A-Za-z0-9_-]{43}$") ? t : "";
    }
    static String codeOf(JsonNode b) { JsonNode v = b == null ? null : b.get("code"); return v == null || v.isNull() ? "" : v.asText().replaceAll("\\s", ""); }

    /** POST /api/login/mfa — 맞으면 { uid, tid, email, kind, via, totpSetup } */
    public Map<String, Object> verify(JsonNode b, HttpServletRequest req, HttpServletResponse res) throws Exception {
        rl.limit("mfa:" + web.ip(req), 30, 600_000L);
        String tok = ticketOf(req, b); String code = codeOf(b);
        if (tok.isEmpty()) throw processException("dd.401.mfa_expired");
        String id = DdCrypto.sha(tok); Map<String, Object> r = m.selectTicket(id);
        if (r == null) throw processException("dd.401.mfa_expired");
        String uid = (String) r.get("user_id"), tid = (String) r.get("tenant_id"), kind = (String) r.get("kind"), email = (String) r.get("email");
        boolean ok = false; long st = 0;
        if (codeOk(code)) {
            if ("email".equals(kind)) ok = Boolean.TRUE.equals(r.get("live")) && has(r, "code_hash") && MessageDigest.isEqual(codeHash(id, code).getBytes(StandardCharsets.UTF_8), String.valueOf(r.get("code_hash")).getBytes(StandardCharsets.UTF_8));
            else { Map<String, Object> t = m.selectTotp(uid); byte[] k = has(t, "secret") ? unb32(dec((String) t.get("secret"))) : null; st = k != null ? totpCheck(k, code, ((Number) t.get("last_step")).longValue()) : 0; ok = st > 0; }
        }
        if (!ok) {
            Integer n = m.incTries(id); int tries = n == null ? 5 : n;
            try { tx.audit(tid, email, "mfa.fail", Js.F.objectNode().put("kind", kind).put("tries", tries).toString()); } catch (Exception ignore) {}
            if (tries >= 5) { m.deleteTicket(id); throw processException("dd.401.mfa_expired"); }
            throw processException("dd.401.mfa_code");
        }
        if (m.deleteTicket(id) == 0) throw processException("dd.401.mfa_expired");
        if (st > 0 && m.updateStep(uid, st) == 0) throw processException("dd.401.mfa_code");
        m.upsertFresh(uid); /* freshWithin 기준 시각 */
        if (!ticketOfCookie(req).isEmpty()) cookie(res, "", 0);
        Map<String, Object> o = new LinkedHashMap<>(); o.put("uid", uid); o.put("tid", tid); o.put("email", email); o.put("kind", kind); o.put("via", Objects.toString(r.get("via"), ""));
        o.put("totpSetup", "email".equals(kind) && "totp".equals(policy(tid))); return o;
    }
    String ticketOfCookie(HttpServletRequest req) { if (req.getCookies() != null) for (Cookie c : req.getCookies()) if (ck().equals(c.getName())) return c.getValue(); return ""; }

    public Map<String, Object> resend(JsonNode b, HttpServletRequest req) throws Exception {
        rl.limit("mfr:" + web.ip(req), 20, 600_000L);
        String tok = ticketOf(req, b); if (tok.isEmpty()) throw processException("dd.401.mfa_expired"); String id = DdCrypto.sha(tok);
        Map<String, Object> r = m.selectResend(id); if (r == null) throw processException("dd.401.mfa_expired");
        if (!"email".equals(r.get("kind"))) throw processException("dd.400.mfa_kind");
        if (Boolean.TRUE.equals(r.get("soon"))) throw processException("dd.429.mfa_wait");
        if (((Number) r.get("sends")).intValue() >= 4) throw processException("dd.429.mfa_resend");
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("to", mask((String) r.get("email"))); o.putAll(sendCode(id, (String) r.get("email"), (String) r.get("tenant_id"))); return o;
    }

    static final java.util.regex.Pattern UUID_RE = java.util.regex.Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    /** 최근 재인증 여부 — Node mfa.freshWithin(user, seconds)과 같은 동작.
     *  user: 사용자 id(uuid 문자열) 또는 "uid" · "id" 키가 있는 Map(인증 결과 그대로). seconds: 몇 초 안에 2단계를 통과했는지(양수).
     *  잘못된 user · seconds(0 이하)는 false. MFA_OFF=1(시험 · 데모 전용)은 2단계 자체가 없으므로 true. */
    public boolean freshWithin(Object user, long seconds) {
        Object v = user instanceof Map ? (((Map<?, ?>) user).get("uid") != null ? ((Map<?, ?>) user).get("uid") : ((Map<?, ?>) user).get("id")) : user;
        String uid = v == null ? "" : String.valueOf(v);
        if (!UUID_RE.matcher(uid).matches() || seconds <= 0) return false;
        if (off) return true;
        Integer n = m.selectFresh(uid, seconds); return n != null && n > 0;
    }

    void pwAgain(Map<String, Object> a, JsonNode b) throws Exception {
        String uid = (String) a.get("uid"); rl.limit("mfp:" + uid, 8, 600_000L); String pw = m.selectPw(uid);
        if (pw == null || !DdCrypto.checkPw(DdWeb.str(b, "password"), pw)) throw processException("dd.401.login.pw");
    }
    public Map<String, Object> get(Map<String, Object> a) throws Exception {
        Map<String, Object> t = m.selectTotp((String) a.get("uid")); Map<String, Object> o = new LinkedHashMap<>();
        o.put("method", has(t, "secret") ? "totp" : "email"); o.put("totp", has(t, "secret")); o.put("pending", has(t, "pend")); o.put("policy", policy((String) a.get("tid"))); o.put("off", off); return o;
    }
    public Map<String, Object> post(Map<String, Object> a, JsonNode b) throws Exception {
        String uid = (String) a.get("uid"), tid = (String) a.get("tid"), email = (String) a.get("email");
        if (b != null && b.has("code") && !b.get("code").isNull()) {
            rl.limit("mfc:" + uid, 10, 600_000L);
            Map<String, Object> t = m.selectTotp(uid); if (!has(t, "pend")) throw processException("dd.400.mfa_pending");
            String code = codeOf(b); long st = codeOk(code) ? totpCheck(unb32(dec((String) t.get("pend"))), code, 0) : 0;
            if (st == 0) throw processException("dd.400.mfa_code.app");
            m.activate(uid, st); tx.audit(tid, email, "mfa.totp.on", null);
            Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("method", "totp"); return o;
        }
        pwAgain(a, b);
        byte[] raw = new byte[20]; RND.nextBytes(raw); String secret = b32(raw);
        m.upsertPend(uid, enc(secret));
        Map<String, Object> o = new LinkedHashMap<>(); o.put("secret", secret);
        o.put("uri", "otpauth://totp/DIDISAM:" + java.net.URLEncoder.encode(email, StandardCharsets.UTF_8).replace("+", "%20") + "?secret=" + secret + "&issuer=DIDISAM&algorithm=SHA1&digits=6&period=30"); return o;
    }
    public Map<String, Object> delete(Map<String, Object> a, JsonNode b) throws Exception {
        pwAgain(a, b);
        if ("totp".equals(policy((String) a.get("tid")))) throw processException("dd.403.mfa_policy");
        String s = m.deleteTotp((String) a.get("uid"));
        if (s != null && !s.isEmpty()) tx.audit((String) a.get("tid"), (String) a.get("email"), "mfa.totp.off", null);
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("method", "email"); return o;
    }
}
