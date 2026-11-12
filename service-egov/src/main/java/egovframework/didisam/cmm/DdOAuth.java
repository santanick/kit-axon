package egovframework.didisam.cmm;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * v32.4 운영자 소셜 로그인 제공자 설정 — Node oauth.js oauthConfig()와 같은 환경변수 · 주소.
 * OAUTH_GOOGLE_ID · OAUTH_GOOGLE_SECRET · OAUTH_KAKAO_ID · OAUTH_KAKAO_SECRET · PUBLIC_URL,
 * 시험용 OAUTH_MOCK_URL(NODE_ENV=production이면 무시).
 */
@Component
public class DdOAuth {
    public record Prov(String name, String auth, String token, String me, String scope, String id, String secret) { }
    private final Map<String, Prov> provs = new LinkedHashMap<>();
    public final String publicUrl;

    public DdOAuth(@Value("${OAUTH_GOOGLE_ID:}") String gid, @Value("${OAUTH_GOOGLE_SECRET:}") String gsec,
                   @Value("${OAUTH_KAKAO_ID:}") String kid, @Value("${OAUTH_KAKAO_SECRET:}") String ksec,
                   @Value("${OAUTH_MOCK_URL:}") String mock, @Value("${PUBLIC_URL:}") String pub, @Value("${NODE_ENV:}") String env) {
        String m = "production".equals(env) ? "" : mock.trim().replaceAll("/+$", "");
        this.publicUrl = pub.trim().replaceAll("/+$", "");
        add("google", gid, gsec, m, "https://accounts.google.com/o/oauth2/v2/auth", "https://oauth2.googleapis.com/token", "https://openidconnect.googleapis.com/v1/userinfo", "openid email");
        add("kakao", kid, ksec, m, "https://kauth.kakao.com/oauth/authorize", "https://kauth.kakao.com/oauth/token", "https://kapi.kakao.com/v2/user/me", "account_email");
    }
    private void add(String n, String id, String sec, String mock, String a, String t, String me, String scope) {
        if (id.trim().isEmpty()) return;
        if (!mock.isEmpty()) { a = mock + "/" + n + "/auth"; t = mock + "/" + n + "/token"; me = mock + "/" + n + "/me"; }
        provs.put(n, new Prov(n, a, t, me, scope, id.trim(), sec.trim()));
    }
    public Prov get(String n) { return provs.get(n); }
    public List<String> names() { return new ArrayList<>(provs.keySet()); }
}
