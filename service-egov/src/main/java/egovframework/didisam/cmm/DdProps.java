package egovframework.didisam.cmm;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Node 서버와 같은 환경변수 이름을 그대로 쓴다(운영 설정 공유) */
@Component
public class DdProps {
    public final boolean secure; public final int hops; public final int idleH; public final String cookieName;
    public final String signupCode; public final boolean allowSignup; public final String pepper; public final int aiDaily; public final boolean ai;
    public DdProps(@Value("${COOKIE_SECURE:1}") String cs, @Value("${TRUST_PROXY_HOPS:1}") int hops, @Value("${SESSION_IDLE_H:12}") int idle,
                   @Value("${SIGNUP_CODE:}") String code, @Value("${SIGNUP:on}") String signup, @Value("${SESSION_PEPPER:}") String pepper,
                   @Value("${AI_DAILY_CALLS:400}") int aiDaily, @Value("${ANTHROPIC_API_KEY:}") String aiKey, @Value("${NODE_ENV:}") String env) {
        this.secure = !"0".equals(cs);
        this.hops = Math.max(0, Math.min(5, hops));
        this.idleH = Math.max(1, Math.min(24 * 14, idle));
        this.cookieName = secure ? "__Host-dd_sid" : "dd_sid";
        this.signupCode = code.trim(); this.allowSignup = !"off".equals(signup);
        this.pepper = !pepper.isEmpty() ? pepper : !code.isEmpty() ? code : "didisam-learner";
        this.aiDaily = aiDaily; this.ai = aiKey.startsWith("sk-ant-");
        if ("production".equals(env)) {
            if (pepper.trim().length() < 32) throw new IllegalStateException("운영 필수 비밀값이 없거나 짧습니다(32자 이상): SESSION_PEPPER");
            if (!secure) throw new IllegalStateException("운영에서는 COOKIE_SECURE=0을 쓸 수 없습니다.");
        }
    }
}
